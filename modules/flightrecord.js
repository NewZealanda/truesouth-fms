// ─────────────────────────────────────────────────────────────────────────────
//  DAILY FLIGHT RECORD  (v24.86)
//  A big, tap-once flight log built for iPad in the cockpit. Off-blocks → on-blocks,
//  airframe hours (TTIS) confirm, product/route/POB. Auto-detects the flight you're about to
//  do from the calendar (by current time), with a today's-flights picker and a manual tab.
//  v1 = record only (persists to ts_flight_records). It will later feed Flight & Duty and update
//  the aircraft hours in Maintenance. Gated by the `flightrecord` permission (superadmin in dev).
//  NOTE: persistence needs the ts_flight_records table — see flight_record.sql.
// ─────────────────────────────────────────────────────────────────────────────

var FR_PRODUCTS_DEFAULT=['FCF','THH','FJHH','MF FCF','MCHS','STT','Ferry','Maintenance','Training','Private Hire'];
var FR_LOCS_DEFAULT=['QN','MF','MC','FJ','WF'];

function _frToday(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _frNowHM(){var d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function _frMins(t){var m=/(\d{1,2}):(\d{2})/.exec(String(t||''));return m?(+m[1])*60+(+m[2]):null;}
function _frProducts(){var o=S._frSettings&&Array.isArray(S._frSettings.products)?S._frSettings.products:null;return (o&&o.length)?o:FR_PRODUCTS_DEFAULT;}
function _frAdj(){var a=S._frSettings&&S._frSettings.adj!=null?(+S._frSettings.adj):1;return isNaN(a)?1:Math.max(0,a);} // taxi adjustment, in tenths (default 0.1)
function _frAcShort(ac){return String(ac||'').replace(/^ZK-?/,'');}
function _frAcList(){return Object.keys((S&&S.aircraft)||{});}
function _frAcHours(ac){try{return (typeof maintGetLatest==='function')?maintGetLatest(ac):null;}catch(e){return null;}}
function _frEsc(s){if(typeof _rzEscSafe==='function')return _rzEscSafe(s);if(typeof esc==='function')return esc(s);return String(s==null?'':s);}

// ── data ──
function _frRows(uid){var out=[];var d=S._frData||{};Object.keys(d).forEach(function(k){var r=d[k];if(r&&r.user_id===uid)out.push(r);});out.sort(function(a,b){return (a.at||'')<(b.at||'')?-1:1;});return out;}
// The flight in progress for this pilot today: off-blocks set, not yet finalised (done!==true).
function _frOpenFlight(uid){var rows=_frRows(uid);for(var i=rows.length-1;i>=0;i--){var r=rows[i];if(r.fr_date===_frToday()&&r.off&&!r.done)return r;}return null;}

window.loadFlightRecords=async function(){
  try{var c=lsGet&&lsGet('ts_flight_records_cache');if(c&&typeof c==='object')S._frData=c;}catch(e){}
  // settings (adjustment + products)
  try{if(typeof SB!=='undefined')fetch(SB+'/rest/v1/ts_settings?key=eq.fr_settings&select=value',{headers:SH}).then(function(r){return r.ok?r.json():[];}).then(function(s){try{if(s&&s[0]&&s[0].value)S._frSettings=JSON.parse(s[0].value);}catch(e){}if(typeof safeRender==='function')safeRender();}).catch(function(){});}catch(e){}
  if(typeof sbF!=='function'){if(typeof render==='function')render();return;}
  try{
    var mgr=(typeof hasRolePerm==='function'&&hasRolePerm('flightrecord_manage'))||(S.user&&S.user.superAdmin);
    var scope=mgr?'':'&user_id=eq.'+encodeURIComponent((S.user&&S.user.id)||'');
    var rows=await sbF('ts_flight_records',scope,'updated_at');
    if(Array.isArray(rows)){var d={};rows.forEach(function(r){d[r.id]={id:r.id,user_id:r.user_id,fr_date:r.fr_date,aircraft:r.aircraft||'',product:r.product||'',from:r.route_from||'',to:r.route_to||'',pob:r.pob||0,off:r.off_blocks||'',on:r.on_blocks||'',startHours:r.start_hours,endHours:r.end_hours,flightTime:r.flight_time,landings:r.landings||1,manual:!!r.manual,note:r.note||'',done:!!(r.on_blocks&&r.end_hours!=null),at:r.updated_at||'',by:r.updated_by||''};});S._frData=d;try{lsSet&&lsSet('ts_flight_records_cache',d);}catch(e){}}
  }catch(e){}
  if(typeof safeRender==='function')safeRender();
};
function _frSave(rec){
  S._frData=S._frData||{};S._frData[rec.id]=rec;
  try{lsSet&&lsSet('ts_flight_records_cache',S._frData);}catch(e){}
  if(typeof sbU==='function')sbU('ts_flight_records',[{id:rec.id,user_id:rec.user_id,fr_date:rec.fr_date,aircraft:rec.aircraft||null,product:rec.product||null,route_from:rec.from||null,route_to:rec.to||null,pob:+rec.pob||0,off_blocks:rec.off||null,on_blocks:rec.on||null,start_hours:rec.startHours!=null?+rec.startHours:null,end_hours:rec.endHours!=null?+rec.endHours:null,flight_time:rec.flightTime!=null?+rec.flightTime:null,landings:+rec.landings||1,manual:!!rec.manual,note:rec.note||null,updated_at:new Date().toISOString(),updated_by:(S.user&&S.user.name)||''}]).catch(function(){});
}
function _frSaveSettings(){if(typeof sbU==='function')sbU('ts_settings',[{key:'fr_settings',value:JSON.stringify(S._frSettings||{})}]).catch(function(){});}

// ── auto-detect the pilot's flights today from the calendar ──
function _frPilotCode(u){var cr=(typeof _crewForUser==='function')?_crewForUser(u):null;return (cr&&cr.code)||'';}
function _frProdDest(prod){
  try{if(typeof _rzEffCfg==='function'){var c=_rzEffCfg(prod);if(c&&c.short)return c.short;}}catch(e){}
  return '';
}
function _frDayFlights(uid){
  var u=(S.users||[]).find(function(x){return x.id===uid;});if(!u)return [];
  var code=_frPilotCode(u);var bk=S._rezdyBookings||[];if(!bk.length)return [];
  var groups={};
  bk.forEach(function(b){
    if(/cancel/i.test(b.status||''))return;
    var ac=(typeof _rzBookingAc==='function')?_rzBookingAc(b,String(b.orderNumber||'')):null;if(!ac||ac==='__none__')return;
    ((b.items)||[]).forEach(function(it){
      var t=(typeof _rzDepTime==='function')?_rzDepTime(it.startTimeLocal||''):'';if(!t)return;
      var start=(typeof _rzHHMMcolon==='function')?_rzHHMMcolon(t):t;var prod=(typeof _rzProduct==='function')?_rzProduct(it.product):String(it.product||'');
      var key=ac+'|'+start+'|'+prod;var g=groups[key]||(groups[key]={ac:ac,start:start,prod:prod,pob:0});
      var e=(typeof _rzEffBreakdown==='function')?_rzEffBreakdown(b):{a:0,c:0,i:0};g.pob+=(e.a+e.c+e.i);
    });
  });
  var out=[];
  Object.keys(groups).forEach(function(k){var g=groups[k];
    var pilot=(typeof _rzSchedPilotFor==='function')?_rzSchedPilotFor(g.ac,g.start):null;
    if(code&&pilot&&String(pilot)===String(code)){
      out.push({ac:g.ac,start:g.start,prod:g.prod,pob:g.pob+1,from:'QN',to:_frProdDest(g.prod)||''}); // +1 PIC
    }
  });
  out.sort(function(a,b){return a.start<b.start?-1:1;});
  return out;
}
function _frAutoPick(flights){
  if(!flights.length)return null;
  var now=_frMins(_frNowHM());
  var best=null,bestScore=1e9;
  flights.forEach(function(f){var fm=_frMins(f.start);if(fm==null)return;var score=(fm>=now-90)?(fm-now+1e6*(fm<now?0:0)):(1e7+(now-fm));var s=Math.abs(fm-now)+((fm<now-15)?1000:0);if(s<bestScore){bestScore=s;best=f;}});
  return best||flights[0];
}

// ── handlers ──
function _frNewId(){return 'fr_'+Date.now()+'_'+Math.floor(Math.random()*1e4);}
window.frTab=function(t){S._frTab=t;render();};
window.frUseFlight=function(ac,prod,from,to,pob,manual){
  var hrs=_frAcHours(ac);
  S._frDraft={ac:ac||'',product:prod||'',from:from||'',to:to||'',pob:(pob!=null?+pob:1),startHours:(hrs!=null?hrs:''),manual:!!manual};
  render();
};
window.frDraftSet=function(field,value){S._frDraft=S._frDraft||{};S._frDraft[field]=(field==='pob'||field==='startHours')?value:value;render();};
window.frDraftPob=function(delta){S._frDraft=S._frDraft||{};var v=(+S._frDraft.pob||0)+delta;if(v<0)v=0;S._frDraft.pob=v;render();};
window.frDraftHours=function(delta){S._frDraft=S._frDraft||{};var v=(parseFloat(S._frDraft.startHours)||0)+delta;v=Math.round(v*10)/10;if(v<0)v=0;S._frDraft.startHours=v;render();};
window.frOffBlocks=function(){
  var d=S._frDraft||{};
  if(!d.ac){if(typeof toast==='function')toast('Pick an aircraft first.','warn');return;}
  if(d.startHours===''||d.startHours==null){if(typeof toast==='function')toast('Confirm the aircraft hours first.','warn');return;}
  var rec={id:_frNewId(),user_id:(S.user&&S.user.id)||'',fr_date:_frToday(),aircraft:d.ac,product:d.product||'',from:d.from||'',to:d.to||'',pob:+d.pob||0,off:_frNowHM(),on:'',startHours:Math.round((+d.startHours)*10)/10,endHours:null,flightTime:null,landings:1,manual:!!d.manual,note:'',done:false,at:new Date().toISOString()};
  _frSave(rec);S._frDraft=null;if(typeof toast==='function')toast('Off blocks '+rec.off+' ✓','ok');render();
};
window.frOnBlocks=function(id){
  var r=(S._frData||{})[id];if(!r)return;
  r.on=_frNowHM();
  // prefill end TTIS = start + block tenths − taxi adjustment (0.1 per flight default)
  var blk=_frMins(r.on)-_frMins(r.off);if(blk<0)blk+=1440;
  var tenths=Math.max(0,Math.round(blk/6)-_frAdj());
  r.flightTime=Math.round(tenths)*0.1;r.flightTime=Math.round(r.flightTime*10)/10;
  r.endHours=Math.round(((+r.startHours||0)+r.flightTime)*10)/10;
  _frSave(r);if(typeof toast==='function')toast('On blocks '+r.on+' ✓','ok');render();
};
window.frSetEndHours=function(id,val){var r=(S._frData||{})[id];if(!r)return;r.endHours=(val===''?null:Math.round((+val)*10)/10);if(r.endHours!=null)r.flightTime=Math.round((r.endHours-(+r.startHours||0))*10)/10;_frSave(r);if(typeof safeRender==='function')safeRender();};
window.frAdjEndHours=function(id,delta){var r=(S._frData||{})[id];if(!r)return;var v=(parseFloat(r.endHours)||(+r.startHours||0))+delta;v=Math.round(v*10)/10;if(v<(+r.startHours||0))v=(+r.startHours||0);r.endHours=v;r.flightTime=Math.round((v-(+r.startHours||0))*10)/10;_frSave(r);render();};
window.frFinish=function(id){var r=(S._frData||{})[id];if(!r)return;if(r.endHours==null){if(typeof toast==='function')toast('Confirm the TTIS hours first.','warn');return;}r.done=true;_frSave(r);if(typeof toast==='function')toast('Flight recorded ✓','ok');render();};
window.frCancelFlight=function(id){if(typeof confirm==='function'&&!confirm('Discard this flight record?'))return;var r=(S._frData||{})[id];if(r){delete S._frData[id];try{lsSet&&lsSet('ts_flight_records_cache',S._frData);}catch(e){}if(typeof sbU!=='undefined'&&typeof SB!=='undefined')fetch(SB+'/rest/v1/ts_flight_records?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:SH}).catch(function(){});}render();};
window.frSetAdj=function(val){S._frSettings=S._frSettings||{};S._frSettings.adj=(val===''?1:Math.max(0,Math.round(+val)));_frSaveSettings();if(typeof safeRender==='function')safeRender();};
window.frToggleSettings=function(){S._frSettingsOpen=!S._frSettingsOpen;render();};

// ── RENDER ──────────────────────────────────────────────────────────────────────
var _FR_BTN='display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:64px;border-radius:14px;border:2px solid var(--border2);background:var(--card);color:var(--text1);font-size:16px;font-weight:700;cursor:pointer;padding:10px;text-align:center;line-height:1.2';
function _frBigBtn(label,on,onclick,sub){return '<button onclick="'+onclick+'" style="'+_FR_BTN+(on?';border-color:#7c3aed;background:rgba(124,58,237,.14);color:#a78bfa':'')+'">'+label+(sub?'<span style="font-size:11px;font-weight:600;color:var(--text3)">'+sub+'</span>':'')+'</button>';}

function renderFlightRecord(){
  if(!S._frLoaded){S._frLoaded=true;if(window.loadFlightRecords)window.loadFlightRecords();}
  if(!(typeof hasRolePerm==='function'&&hasRolePerm('flightrecord'))&&!(S.user&&S.user.superAdmin))
    return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div>';
  var uid=(S.user&&S.user.id)||'';
  var open=_frOpenFlight(uid);
  var h='';
  if(open){ h=open.on?_frRenderConfirm(open):_frRenderLand(open); }
  else { h=_frRenderStart(uid); }
  // settings (taxi adjustment) — collapsible
  h+='<div class="card"><div onclick="window.frToggleSettings()" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-weight:700;font-size:13px"><span>⚙ Settings</span><span style="font-size:11px;color:var(--text3)">'+(S._frSettingsOpen?'▲ Hide':'▼ Show')+'</span></div>';
  if(S._frSettingsOpen){
    h+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px">'+
      '<label style="font-size:12px;color:var(--text2)">Taxi adjustment — subtract this many <b>tenths</b> (0.1h) per flight</label>'+
      '<input type="number" min="0" step="1" value="'+_frAdj()+'" onchange="window.frSetAdj(this.value)" style="width:70px;font-size:14px;padding:6px;border:1px solid var(--border2);border-radius:7px;background:var(--card);color:var(--text);text-align:center">'+
      '<span style="font-size:11px;color:var(--text3)">currently −'+(_frAdj()/10).toFixed(1)+'h/flight</span>'+
    '</div>';
  }
  h+='</div>';
  // recent records today
  var recs=_frRows(uid).filter(function(r){return r.fr_date===_frToday()&&r.done;});
  if(recs.length){
    h+='<div class="card" style="padding:0;overflow-x:auto"><div class="st" style="padding:14px 14px 6px">Today’s recorded flights</div><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:560px"><thead><tr style="background:var(--card2)">'+['AC','Product','Route','POB','Off','On','Flt h','TTIS'].map(function(t,i){return '<th style="text-align:'+(i<3?'left':'right')+';padding:6px 8px;font-size:9px;color:var(--text3);font-weight:700">'+t+'</th>';}).join('')+'</tr></thead><tbody>';
    recs.forEach(function(r){h+='<tr style="border-top:1px solid var(--border2)"><td style="padding:5px 8px;font-weight:700">'+_frEsc(_frAcShort(r.aircraft))+'</td><td style="padding:5px 8px">'+_frEsc(r.product||'')+'</td><td style="padding:5px 8px;color:var(--text2)">'+_frEsc((r.from||'')+(r.to?'→'+r.to:''))+'</td><td style="padding:5px 8px;text-align:right">'+(r.pob||'')+'</td><td style="padding:5px 8px;text-align:right">'+_frEsc(r.off||'')+'</td><td style="padding:5px 8px;text-align:right">'+_frEsc(r.on||'')+'</td><td style="padding:5px 8px;text-align:right;font-weight:700">'+(r.flightTime!=null?r.flightTime.toFixed(1):'')+'</td><td style="padding:5px 8px;text-align:right;color:var(--text2)">'+(r.endHours!=null?(+r.endHours).toFixed(1):'')+'</td></tr>';});
    h+='</tbody></table></div>';
  }
  return h;
}

function _frRenderStart(uid){
  var flights=_frDayFlights(uid);
  var tab=S._frTab||(flights.length?'auto':'manual');
  if(tab==='auto'&&!flights.length)tab='manual';
  // No draft yet on the auto tab → preload it from the auto-picked flight so OFF BLOCKS is one tap.
  if(!S._frDraft&&tab==='auto'&&flights.length){var f=_frAutoPick(flights);if(f)S._frDraft={ac:f.ac,product:f.prod,from:f.from,to:f.to,pob:f.pob,startHours:(_frAcHours(f.ac)!=null?_frAcHours(f.ac):''),manual:false};}
  var d=S._frDraft||{};
  var h='<div class="card"><div class="st">Start a flight <span style="font-weight:400;font-size:11px;color:var(--text3)">— '+_frEsc(new Date().toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'short'}))+'</span></div>';
  var tabs=[{id:'auto',lbl:'This flight'},{id:'today',lbl:'Today’s flights'},{id:'manual',lbl:'Manual'}];
  h+=(typeof _tier2==='function')?_tier2(tabs.map(function(t){return {lbl:t.lbl,on:tab===t.id,onclick:"window.frTab('"+t.id+"')"};})):'';
  if(tab==='today'){
    if(!flights.length){h+='<div style="color:var(--text3);font-size:13px;padding:10px 2px">No allocated flights found for you today. Use Manual, or open Calendar to load the day.</div>';}
    flights.forEach(function(f){
      h+='<button onclick="window.frUseFlight(\''+f.ac+'\',\''+_frEsc(f.prod)+'\',\''+_frEsc(f.from)+'\',\''+_frEsc(f.to)+'\','+f.pob+',false);window.frTab(\'auto\')" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px;border-radius:12px;border:2px solid var(--border2);background:var(--card);color:var(--text1);cursor:pointer;margin-bottom:8px;text-align:left">'+
        '<span style="font-size:18px;font-weight:800;min-width:54px">'+_frEsc(f.start)+'</span>'+
        '<span style="font-size:17px;font-weight:800;color:#7c3aed">'+_frEsc(_frAcShort(f.ac))+'</span>'+
        '<span style="font-size:15px;font-weight:700">'+_frEsc((f.from||'')+(f.to?'→'+f.to:''))+'</span>'+
        '<span style="font-size:13px;color:var(--text2)">'+_frEsc(f.prod)+' · '+f.pob+' POB</span>'+
        '<span style="margin-left:auto;font-size:20px;color:var(--text3)">▸</span>'+
      '</button>';
    });
    h+='</div>';return h;
  }
  // auto + manual share the same big confirm form (manual = blank/editable)
  var manual=(tab==='manual');
  if(tab==='auto'&&flights.length){
    var picked=_frAutoPick(flights);
    h+='<div style="font-size:12px;color:var(--text3);margin:2px 0 10px">Auto-picked your '+_frEsc(picked?picked.start:'')+' flight. Wrong? Use <b>Today’s flights</b> or <b>Manual</b>.</div>';
  }
  h+=_frRenderDraftForm(d,manual);
  h+='</div>';
  return h;
}

function _frRenderDraftForm(d,manual){
  d=d||{};
  var h='';
  // Aircraft (big tap grid)
  h+='<div style="font-size:11px;color:var(--text3);font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:6px 0 6px">Aircraft</div>';
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(86px,1fr));gap:8px;margin-bottom:14px">';
  _frAcList().forEach(function(ac){h+=_frBigBtn(_frAcShort(ac),d.ac===ac,"window.frUseFlight('"+ac+"','"+_frEsc(d.product||'')+"','"+_frEsc(d.from||'')+"','"+_frEsc(d.to||'')+"',"+(+d.pob||1)+","+(manual?'true':'false')+")",_frAcHours(ac)!=null?(+_frAcHours(ac)).toFixed(1)+'h':'');});
  h+='</div>';
  // Product
  h+='<div style="font-size:11px;color:var(--text3);font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:6px 0 6px">Flight type</div>';
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-bottom:14px">';
  _frProducts().forEach(function(pr){h+=_frBigBtn(_frEsc(pr),d.product===pr,"window.frDraftSet('product','"+_frEsc(pr)+"')");});
  h+='</div>';
  // Route (from → to) quick picks
  var locs=FR_LOCS_DEFAULT;
  h+='<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px">';
  ['from','to'].forEach(function(side){
    h+='<div style="flex:1 1 200px"><div style="font-size:11px;color:var(--text3);font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px">'+(side==='from'?'From':'To')+'</div><div style="display:flex;gap:6px;flex-wrap:wrap">';
    locs.forEach(function(l){h+='<button onclick="window.frDraftSet(\''+side+'\',\''+l+'\')" style="min-height:48px;min-width:56px;border-radius:11px;border:2px solid var(--border2);background:var(--card);color:var(--text1);font-size:15px;font-weight:800;cursor:pointer'+(d[side]===l?';border-color:#7c3aed;background:rgba(124,58,237,.14);color:#a78bfa':'')+'">'+l+'</button>';});
    h+='</div></div>';
  });
  h+='</div>';
  // POB stepper
  h+='<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px">'+
    '<div style="font-size:11px;color:var(--text3);font-weight:700;letter-spacing:.04em;text-transform:uppercase">POB <span style="text-transform:none;color:var(--text3)">(incl. PIC)</span></div>'+
    '<div style="display:flex;align-items:center;gap:10px">'+
      '<button onclick="window.frDraftPob(-1)" style="width:54px;height:54px;border-radius:12px;border:2px solid var(--border2);background:var(--card2);color:var(--text1);font-size:26px;font-weight:800;cursor:pointer">–</button>'+
      '<span style="font-size:30px;font-weight:800;min-width:44px;text-align:center">'+(+d.pob||0)+'</span>'+
      '<button onclick="window.frDraftPob(1)" style="width:54px;height:54px;border-radius:12px;border:2px solid var(--border2);background:var(--card2);color:var(--text1);font-size:26px;font-weight:800;cursor:pointer">+</button>'+
    '</div></div>';
  // Confirm aircraft hours
  h+='<div style="border-top:1px solid var(--border2);padding-top:14px;margin-top:4px">'+
    '<div style="font-size:14px;font-weight:800;margin-bottom:8px">Confirm aircraft hours are</div>'+
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
      '<button onclick="window.frDraftHours(-0.1)" style="width:54px;height:54px;border-radius:12px;border:2px solid var(--border2);background:var(--card2);color:var(--text1);font-size:24px;font-weight:800;cursor:pointer">–</button>'+
      '<input type="number" step="0.1" value="'+(d.startHours!==''&&d.startHours!=null?d.startHours:'')+'" onchange="window.frDraftSet(\'startHours\',this.value)" style="width:150px;height:58px;font-size:28px;font-weight:800;text-align:center;border:2px solid var(--border2);border-radius:12px;background:var(--card);color:var(--text)">'+
      '<button onclick="window.frDraftHours(0.1)" style="width:54px;height:54px;border-radius:12px;border:2px solid var(--border2);background:var(--card2);color:var(--text1);font-size:24px;font-weight:800;cursor:pointer">+</button>'+
    '</div></div>';
  // OFF BLOCKS — the one big action
  h+='<button onclick="window.frOffBlocks()" style="width:100%;margin-top:18px;min-height:74px;border-radius:16px;border:none;background:#16a34a;color:#fff;font-size:22px;font-weight:800;cursor:pointer;letter-spacing:.02em">🛫 OFF BLOCKS · '+_frNowHM()+'</button>';
  h+='<div style="font-size:11px;color:var(--text3);text-align:center;margin-top:6px">Records the time now. GPS location will come with the app.</div>';
  return h;
}

function _frRenderLand(r){
  var h='<div class="card" style="border-left:4px solid #16a34a">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:6px"><div style="font-size:20px;font-weight:800">In flight — '+_frEsc(_frAcShort(r.aircraft))+'</div><button onclick="window.frCancelFlight(\''+r.id+'\')" style="background:none;border:none;color:#ef4444;font-size:12px;cursor:pointer">Discard</button></div>';
  h+='<div style="font-size:15px;color:var(--text2);margin-bottom:14px">'+_frEsc((r.from||'')+(r.to?' → '+r.to:''))+' · '+_frEsc(r.product||'')+' · '+(r.pob||0)+' POB · Off blocks <b style="color:var(--text1)">'+_frEsc(r.off)+'</b> · TTIS at off '+(+r.startHours||0).toFixed(1)+'</div>';
  h+='<button onclick="window.frOnBlocks(\''+r.id+'\')" style="width:100%;min-height:80px;border-radius:16px;border:none;background:#dc2626;color:#fff;font-size:23px;font-weight:800;cursor:pointer;letter-spacing:.02em">🛬 ON BLOCKS / SHUTDOWN · '+_frNowHM()+'</button>';
  h+='</div>';
  return h;
}

function _frRenderConfirm(r){
  var h='<div class="card" style="border-left:4px solid #f59e0b">';
  h+='<div style="font-size:20px;font-weight:800;margin-bottom:4px">Confirm TTIS — '+_frEsc(_frAcShort(r.aircraft))+'</div>';
  h+='<div style="font-size:14px;color:var(--text2);margin-bottom:14px">Off '+_frEsc(r.off)+' → On '+_frEsc(r.on)+' · block '+_frEsc(_frBlockStr(r))+' · taxi −'+(_frAdj()/10).toFixed(1)+'h · <b style="color:var(--text1)">flight '+(r.flightTime!=null?r.flightTime.toFixed(1):'0.0')+'h</b></div>';
  h+='<div style="font-size:14px;font-weight:800;margin-bottom:8px">Confirm TTIS is</div>';
  h+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
    '<button onclick="window.frAdjEndHours(\''+r.id+'\',-0.1)" style="width:54px;height:58px;border-radius:12px;border:2px solid var(--border2);background:var(--card2);color:var(--text1);font-size:24px;font-weight:800;cursor:pointer">–</button>'+
    '<input type="number" step="0.1" value="'+(r.endHours!=null?(+r.endHours).toFixed(1):'')+'" onchange="window.frSetEndHours(\''+r.id+'\',this.value)" style="width:170px;height:64px;font-size:32px;font-weight:800;text-align:center;border:2px solid var(--border2);border-radius:12px;background:var(--card);color:var(--text)">'+
    '<button onclick="window.frAdjEndHours(\''+r.id+'\',0.1)" style="width:54px;height:58px;border-radius:12px;border:2px solid var(--border2);background:var(--card2);color:var(--text1);font-size:24px;font-weight:800;cursor:pointer">+</button>'+
  '</div>';
  h+='<div style="font-size:11px;color:var(--text3);margin-top:6px">Pre-filled: start '+(+r.startHours||0).toFixed(1)+' + '+(r.flightTime!=null?r.flightTime.toFixed(1):'0.0')+'h flight.</div>';
  h+='<button onclick="window.frFinish(\''+r.id+'\')" style="width:100%;margin-top:16px;min-height:74px;border-radius:16px;border:none;background:#16a34a;color:#fff;font-size:22px;font-weight:800;cursor:pointer">✓ SAVE FLIGHT</button>';
  h+='</div>';
  return h;
}
function _frBlockStr(r){var blk=_frMins(r.on)-_frMins(r.off);if(blk<0)blk+=1440;return Math.floor(blk/60)+'h '+(blk%60)+'m';}
