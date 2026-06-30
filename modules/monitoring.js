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
function renderMonitoring(){
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
  return h;
}
