// === MODULE: monitoring === v1.0 ===
// Flight following / Monitoring. Shows the live status of every fleet aircraft — on the ground at a
// location, or airborne on a leg with POB and an ETA (via AMS, or a manual time). Driven by the flight
// card: OFF BLOCKS marks the aircraft airborne (and notifies rostered desk staff); ON BLOCKS lands it
// (on the ground at the destination, ETA cancelled). State lives in ts_flight_following (one row per
// aircraft) so it never touches the flight-record schema.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
function _ffEsc(s){return (typeof esc==='function')?esc(s):String(s==null?'':s);}
function _ffAcShort(ac){return String(ac||'').replace('ZK-','');}
function _ffApt(code){if(!code)return '';try{return (typeof APTS!=='undefined'&&APTS[code])?code:code;}catch(e){return code;}}
function _ffFleet(){var a=S.aircraft||{};var ks=Object.keys(a);if(ks.length)return ks;return ['ZK-SLA','ZK-SLB','ZK-SDB','ZK-SLD','ZK-SLQ'];}
function _ffCol(ac){try{return (typeof AC_COL!=='undefined'&&AC_COL[ac])||'#2563eb';}catch(e){return '#2563eb';}}

// ── Data (per-aircraft current status) ──────────────────────────────────────────────
window.loadFlightFollowing=async function(){
  try{var c=lsGet&&lsGet('ts_flight_following_cache');if(c&&typeof c==='object')S._ffData=c;}catch(e){}
  if(typeof sbF!=='function')return;
  var rows=await sbF('ts_flight_following','','updated_at');
  if(rows){var d={};rows.forEach(function(r){d[r.id]=r;});S._ffData=d;try{lsSet&&lsSet('ts_flight_following_cache',d);}catch(e){}if(typeof safeRender==='function')safeRender();}
};
function _ffSet(ac,patch){
  S._ffData=S._ffData||{};var cur=S._ffData[ac]||{id:ac,aircraft:ac};
  var row=Object.assign({},cur,patch,{id:ac,aircraft:ac,updated_at:new Date().toISOString()});
  S._ffData[ac]=row;try{lsSet&&lsSet('ts_flight_following_cache',S._ffData);}catch(e){}
  if(typeof sbU==='function')sbU('ts_flight_following',[row]).catch(function(){});
  return row;
}
// Called from the flight card on OFF BLOCKS (rec = the new flight record).
window._ffOffBlocks=function(rec,etaType,etaTime){
  if(!rec||!rec.aircraft)return;
  _ffSet(rec.aircraft,{status:'air',flight_id:rec.id,frm:rec.from||'QN',to:rec.to||'',pob:+rec.pob||0,off_time:rec.off||'',eta_type:(etaType||'ams'),eta_time:etaTime||'',location:''});
  _ffNotifyDesk('🛫 '+_ffAcShort(rec.aircraft)+' OFF BLOCKS '+(rec.from||'QN')+'→'+(rec.to||'?')+' · POB '+(+rec.pob||0)+(etaType==='other'&&etaTime?(' · ETA '+etaTime):' · ETA via AMS'));
};
// Called from the flight card on ON BLOCKS (lands → on the ground at the destination, ETA cancelled).
window._ffOnBlocks=function(rec){
  if(!rec||!rec.aircraft)return;
  _ffSet(rec.aircraft,{status:'ground',flight_id:'',frm:'',to:'',pob:0,off_time:'',eta_type:'',eta_time:'',location:(rec.to||'QN')});
};
function _ffNotifyDesk(msg){
  try{
    if(typeof sbU!=='function')return;var ds=(typeof _todayLocal==='function')?_todayLocal():new Date().toISOString().slice(0,10);
    var roster=S.roster||{},off={rdo:1,off:1,leave:1,ul:1,sick:1,'':1};
    var ids=(S.users||[]).filter(function(u){if(!u||u.inactive)return false;if(u.role!=='desk'&&u.role!=='cx_manager')return false;var st=(typeof _rGetStatus==='function')?_rGetStatus(u,ds,roster):'';return !off[st];}).map(function(u){return String(u.id);});
    if(!ids.length)return;
    sbU('ts_notifications',ids.map(function(uid){return {user_id:uid,type:'monitoring',message:msg,read:false,created_at:new Date().toISOString()};})).catch(function(){});
  }catch(e){}
};
// Manual override on the monitoring page (e.g. set an aircraft on the ground somewhere).
window.ffSetGround=function(ac){var loc=prompt('On the ground at (e.g. Queenstown, Wanaka, Milford):','Queenstown');if(loc==null)return;_ffSet(ac,{status:'ground',location:loc||'Queenstown',flight_id:'',to:'',pob:0,eta_type:'',eta_time:''});render();};

function _ffLocName(code){if(!code)return '';var m={QN:'Queenstown',ZQN:'Queenstown',NZQN:'Queenstown',WF:'Wanaka',NZWF:'Wanaka',MF:'Milford',NZMF:'Milford',MC:'Mt Cook',FJ:'Franz Josef',WK:'Wakatipu'};var c=String(code).toUpperCase();return m[c]||code;}
// Status is derived from TODAY's flight records (date-aware + realtime-synced → never stuck on old data);
// the ts_flight_following row only supplies the ETA overlay for the in-progress flight, and a manual
// ground location fallback when there are no flight records for the aircraft today.
// Build a Date from a flight record's fr_date (YYYY-MM-DD) + on-blocks time (HH:MM).
function _ffRecOnDate(r){
  if(!r||!r.on||!r.fr_date)return null;
  var mins=(typeof _frMins==='function')?_frMins(r.on):null;if(mins==null)return null;
  var p=String(r.fr_date).split('-');if(p.length!==3)return null;
  var d=new Date(+p[0],(+p[1])-1,+p[2],0,0,0,0);d.setMinutes(mins);return isNaN(d.getTime())?null:d;
}
// Latest shutdown (on-blocks) across ALL of an aircraft's records — for the "X ago / yesterday" label.
function _ffLastShutdown(ac){
  var best=null;
  try{Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];if(!r||r.aircraft!==ac)return;var at=_ffRecOnDate(r);if(at&&(!best||at>best.at))best={at:at,to:r.to};});}catch(e){}
  return best;
}
// "Shutdown 17 minutes ago at 13:53" → "1 hour 3 mins ago" (<5h) → "5 hours ago" (same day) → "yesterday at 13:53".
function _ffShutdownLabel(at){
  if(!at)return '';
  var now=new Date();
  var hm=('0'+at.getHours()).slice(-2)+':'+('0'+at.getMinutes()).slice(-2);
  var d0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var d1=new Date(at.getFullYear(),at.getMonth(),at.getDate());
  var dayDiff=Math.round((d0-d1)/86400000);
  if(dayDiff===1)return 'Shut down yesterday at '+hm;
  if(dayDiff>=2){var mons=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return 'Shut down '+at.getDate()+' '+mons[at.getMonth()]+' at '+hm;}
  if(dayDiff<0)return 'Shut down at '+hm;
  var mins=Math.max(0,Math.floor((now-at)/60000));
  if(mins<60)return 'Shutdown '+mins+' minute'+(mins===1?'':'s')+' ago at '+hm;
  var h=Math.floor(mins/60),m=mins%60;
  if(mins<300)return 'Shutdown '+h+' hour'+(h===1?'':'s')+' '+m+' min'+(m===1?'':'s')+' ago at '+hm;
  return 'Shutdown '+Math.round(mins/60)+' hours ago at '+hm;
}
function _ffStatusOf(ac){
  var ff=(S._ffData||{})[ac]||null;
  var today=(typeof _frToday==='function')?_frToday():'';
  var lastOn=null;
  try{
    var recs=[];Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];if(r&&r.aircraft===ac&&r.fr_date===today)recs.push(r);});
    recs.sort(function(a,b){return ((typeof _frMins==='function'?_frMins(a.off):0)||0)-((typeof _frMins==='function'?_frMins(b.off):0)||0);});
    var inprog=null;
    recs.forEach(function(r){if(r.off&&!r.on)inprog=r;if(r.on)lastOn=r;});
    if(inprog){
      var et=(ff&&ff.flight_id===inprog.id&&ff.eta_type)?ff.eta_type:'ams';
      var etm=(ff&&ff.flight_id===inprog.id)?(ff.eta_time||''):'';
      return {status:'air',frm:inprog.from||'QN',to:inprog.to||'?',pob:+inprog.pob||0,off_time:inprog.off,eta_type:et,eta_time:etm};
    }
  }catch(e){}
  // On the ground — shutdown time = the most recent on-blocks across all days (today, yesterday, …).
  var shut=_ffLastShutdown(ac);
  var loc;
  if(lastOn)loc=_ffLocName(lastOn.to)||'Queenstown';
  else if(ff&&ff.status==='ground'&&ff.location)loc=ff.location;
  else if(shut)loc=_ffLocName(shut.to)||'Queenstown';
  else loc='Queenstown';
  return {status:'ground',location:loc,shutdownAt:(shut?shut.at:null)};
}

// Re-pull the following table periodically while the board is open (flight records already realtime-sync;
// this catches the ETA/manual-location overlay which doesn't).
function _ffStartPoll(){
  if(S._ffPoll)return;
  S._ffPoll=setInterval(function(){try{if(S.section!=='monitoring')return;if(typeof document!=='undefined'&&document.visibilityState!=='visible')return;if(window.loadFlightFollowing)window.loadFlightFollowing();}catch(e){}},30000);
}
// ── Live seat availability (Rezdy) ─────────────────────────────────────────────
function _avEsc(s){return (typeof esc==='function')?esc(s):String(s==null?'':s);}
function _avMonthStr(){return S._avMonth||(new Date()).toISOString().slice(0,7);}   // 'YYYY-MM'
function _avMonthRange(ym){var y=+ym.slice(0,4),m=+ym.slice(5,7);var last=new Date(y,m,0).getDate();return {from:ym+'-01',to:ym+'-'+String(last).padStart(2,'0')};}
window.avShiftMonth=function(delta){var ym=_avMonthStr();var d=new Date(+ym.slice(0,4),+ym.slice(5,7)-1+delta,1);S._avMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');S._avData=null;window.loadAvailability();};
window.loadAvailability=async function(){
  var ym=_avMonthStr();var r=_avMonthRange(ym);
  S._avLoading=true;if(typeof render==='function')render();
  try{
    var res=(typeof callFn==='function')?await callFn('rezdy-sync',{availability:{from:r.from,to:r.to}}):null;
    var body=(res&&res.data)||{};   // callFn wraps the response as {ok,status,data} — the sessions/debug live in .data
    S._avData=(res&&res.ok)?{ym:ym,sessions:body.sessions||[],debug:body.debug,at:Date.now()}:{ym:ym,error:(body.error||body.hint||('HTTP '+((res&&res.status)||'?')))||'failed',sessions:[]};
  }catch(e){S._avData={ym:ym,error:String((e&&e.message)||e),sessions:[]};}
  S._avLoading=false;if(typeof render==='function')render();
};
function _avShortProd(name){if(typeof _rzProduct==='function'){var c=_rzProduct(name);if(c&&String(c).length<=6)return c;}return String(name||'').slice(0,14);}
// ── Live seats on the Bookings departures ──────────────────────────────────────
// Linked products share ONE aircraft's seat pool at a departure slot (selling on any of them reduces the
// slot), so the seats remaining = the MIN across the linked products' Rezdy availability for that time.
var _AV_LINKS={
  '0800':['Expedition Aoraki/Mt. Cook','Glacier Helihike Tasman Glacier','Mount Cook Heliski','Mt Cook Helicopter Glacier Landing','Ski the Tasman Glacier'],
  '0930':['Milford Sound Fly Cruise Fly','Milford Sound One-Way Flight'],
  '1200':['Milford Sound Fly Cruise Fly','Milford Sound One-Way Flight']
};
// Per-day availability cache for the bookings view (separate from the month view). Refetches every ~3 min.
window.avEnsureDay=function(date){
  if(!date||typeof callFn!=='function')return;
  S._avDayData=S._avDayData||{};
  var d=S._avDayData[date];
  if(d&&d.at&&(Date.now()-d.at<180000))return;
  if(S._avDayFetching===date)return;S._avDayFetching=date;
  (async function(){
    try{var res=await callFn('rezdy-sync',{availability:{from:date,to:date}});var body=(res&&res.data)||{};if(res&&res.ok)S._avDayData[date]={sessions:body.sessions||[],at:Date.now()};}catch(e){}
    S._avDayFetching=null;if(typeof safeRender==='function')safeRender();
  })();
};
// Live Rezdy seats remaining for a departure (HHMM) on a date — MIN across the slot's linked products.
function _avSeatsForDep(date,dep){
  var day=S._avDayData&&S._avDayData[date];if(!day||!day.sessions)return null;
  dep=String(dep||'');var hhmm=(dep.length===4)?(dep.slice(0,2)+':'+dep.slice(2)):dep;
  var links=_AV_LINKS[dep]||null;var linkSet=links?links.map(function(n){return n.trim().toLowerCase();}):null;
  var seats=[];
  (day.sessions||[]).forEach(function(s){
    if(String(s.startTimeLocal||'').slice(0,10)!==date)return;
    if(String(s.startTimeLocal||'').slice(11,16)!==hhmm)return;
    if(+s.seats>=900)return;                                   // skip Charter / unlimited
    var nm=String(s.productName||'').trim().toLowerCase();
    if(/coach/.test(nm))return;                                // ignore CCF / coach products
    if(linkSet){if(linkSet.indexOf(nm)<0)return;}
    if(s.seatsAvailable!=null)seats.push(+s.seatsAvailable);
  });
  return seats.length?Math.min.apply(null,seats):null;
}
function renderAvailabilityView(){
  var ym=_avMonthStr();
  if((!S._avData||S._avData.ym!==ym)&&!S._avLoading){S._avLoading=true;setTimeout(window.loadAvailability,0);}
  var d=(S._avData&&S._avData.ym===ym)?S._avData:null;
  var mLabel;try{mLabel=new Date(ym+'-01T00:00:00').toLocaleDateString('en-NZ',{month:'long',year:'numeric'});}catch(e){mLabel=ym;}
  var h='<div class="card"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">'+
    '<button onclick="window.avShiftMonth(-1)" class="btn btn-ghost" style="padding:6px 12px">◁</button>'+
    '<div style="font-weight:800;font-size:15px;min-width:150px;text-align:center">'+_avEsc(mLabel)+'</div>'+
    '<button onclick="window.avShiftMonth(1)" class="btn btn-ghost" style="padding:6px 12px">▷</button>'+
    '<button onclick="window.loadAvailability()" class="btn btn-ghost" style="margin-left:auto;padding:6px 12px;font-size:12px">'+(S._avLoading?'⟳ Loading…':'⟳ Refresh')+'</button></div>'+
    '<p style="font-size:12px;color:var(--text3);margin:0 0 12px">Live seats remaining per departure, pulled from Rezdy.</p>';
  if(S._avLoading&&!d)return h+'<p style="color:var(--text3)">Loading availability…</p></div>';
  if(!d)return h+'</div>';
  if(d.error)return h+'<p style="color:#dc2626;font-size:13px;line-height:1.5">Couldn’t load availability (<code>'+_avEsc(d.error)+'</code>). The <b>rezdy-sync</b> edge function needs redeploying with the new availability endpoint.</p></div>';
  var sess=d.sessions||[];
  if(!sess.length){var _dbg=d.debug?('<div style="font-size:11px;color:var(--text3);margin-top:6px">Diagnostics (share with support):</div><pre style="font-size:11px;white-space:pre-wrap;color:var(--text2);background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:8px;margin-top:4px;overflow:auto;max-height:320px">'+_avEsc(JSON.stringify(d.debug,null,1))+'</pre>'):'';return h+'<p style="color:var(--text3)">No departures found for '+_avEsc(mLabel)+'.</p>'+_dbg+'</div>';}
  var byDay={};
  sess.forEach(function(s){var dt=String(s.startTimeLocal||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(dt))return;if(dt.slice(0,7)!==ym)return;if(+s.seats>=900)return;/* skip Charter / unlimited on-request products */var tm=String(s.startTimeLocal||'').replace('T',' ').slice(11,16);if(tm==='00:00')return;(byDay[dt]=byDay[dt]||[]).push({t:tm,name:s.productName,seats:(s.seatsAvailable==null?null:+s.seatsAvailable)});});
  var days=Object.keys(byDay).sort();
  days.forEach(function(dt){
    var list=byDay[dt].sort(function(a,b){return a.t<b.t?-1:a.t>b.t?1:0;});
    var tot=list.reduce(function(x,s){return x+(s.seats>0?s.seats:0);},0);
    var dlab;try{dlab=new Date(dt+'T00:00:00').toLocaleDateString('en-NZ',{weekday:'short',day:'numeric',month:'short'});}catch(e){dlab=dt;}
    h+='<div style="border-top:1px solid var(--border2);padding:9px 0"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px"><b style="font-size:13px">'+_avEsc(dlab)+'</b><span style="font-size:11px;color:var(--text3)">'+tot+' seats · '+list.length+' departure'+(list.length===1?'':'s')+'</span></div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:5px">'+list.map(function(s){var n=s.seats;var col=n==null?'var(--text3)':n<=0?'#dc2626':n<=2?'#b45309':'#16a34a';var bg=n==null?'var(--card2)':n<=0?'rgba(239,68,68,.12)':n<=2?'rgba(217,119,6,.12)':'rgba(34,197,94,.12)';return '<span title="'+_avEsc(s.name)+'" style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:14px;background:'+bg+';font-size:11.5px;color:'+col+';font-weight:700"><b>'+_avEsc(s.t||'—')+'</b> '+_avEsc(_avShortProd(s.name))+' · '+(n==null?'?':n)+'</span>';}).join('')+'</div></div>';
  });
  return h+'</div>';
}
function renderMonitoring(){
  var _mTab=(S._monTab==='avail')?'avail':'fleet';
  var _mBar='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'+
    '<button class="sub-tab '+(_mTab==='fleet'?'on':'')+'" onclick="S._monTab=\'fleet\';render()">🛩 Fleet status</button>'+
    '<button class="sub-tab '+(_mTab==='avail'?'on':'')+'" onclick="S._monTab=\'avail\';render()">💺 Seat availability</button></div>';
  if(_mTab==='avail')return _mBar+renderAvailabilityView();
  if(!S._ffLoaded){S._ffLoaded=true;if(window.loadFlightFollowing)window.loadFlightFollowing();}
  if(!S._frLoaded&&window.loadFlightRecords){S._frLoaded=true;window.loadFlightRecords();}   // so status derives from today's records (live)
  _ffStartPoll();
  var fleet=_ffFleet();
  var h='<div class="card"><div class="st">Aircraft monitoring</div><p style="font-size:12px;color:var(--text3);margin:2px 0 14px">Live fleet status — set from the flight card (Off Blocks / On Blocks). Airborne aircraft show POB and ETA.</p>';
  fleet.forEach(function(ac){
    var s=_ffStatusOf(ac);var air=s.status==='air';var col=_ffCol(ac);
    var line2;
    if(air){
      var eta=(s.eta_type==='other'&&s.eta_time)?('ETA '+_ffEsc(s.eta_time)):'ETA via AMS';
      line2='<span style="color:#2563eb;font-weight:700">✈ '+_ffEsc((s.frm||'QN'))+' → '+_ffEsc(s.to||'?')+'</span> · POB '+_ffEsc(+s.pob||0)+' · '+eta+(s.off_time?(' · off '+_ffEsc(s.off_time)):'');
    } else {
      line2='<span style="color:#16a34a;font-weight:700">● On ground</span> · '+_ffEsc(s.location||'Queenstown');
      var _sd=_ffShutdownLabel(s.shutdownAt);
      if(_sd)line2+=' · <span style="color:var(--text3)">'+_ffEsc(_sd)+'</span>';
    }
    h+='<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--border2)">'+
      '<span style="width:14px;height:14px;border-radius:50%;background:'+col+';flex-shrink:0"></span>'+
      '<div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:800;color:var(--text)">'+_ffEsc(_ffAcShort(ac))+'</div>'+
        '<div style="font-size:13px;color:var(--text2);margin-top:2px">'+line2+'</div></div>'+
      (air?'<span style="flex-shrink:0;padding:4px 11px;border-radius:20px;background:rgba(37,99,235,.14);color:#2563eb;font-size:11px;font-weight:800">AIRBORNE</span>'
          :'<button onclick="window.ffSetGround(\''+ac+'\')" style="flex-shrink:0;font-size:11px;color:var(--text3);background:none;border:1px solid var(--border2);border-radius:8px;padding:5px 10px;cursor:pointer">Set location</button>')+
    '</div>';
  });
  h+='</div>';
  return _mBar+h;
}
