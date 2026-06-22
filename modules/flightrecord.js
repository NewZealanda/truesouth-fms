// ─────────────────────────────────────────────────────────────────────────────
//  DAILY FLIGHT RECORD  (v24.86)
//  A big, tap-once flight log built for iPad in the cockpit. Off-blocks → on-blocks,
//  airframe hours (TTIS) confirm, product/route/POB. Auto-detects the flight you're about to
//  do from the calendar (by current time), with a today's-flights picker and a manual tab.
//  v1 = record only (persists to ts_flight_records). It will later feed Flight & Duty and update
//  the aircraft hours in Maintenance. Gated by the `flightrecord` permission (superadmin in dev).
//  NOTE: persistence needs the ts_flight_records table — see flight_record.sql.
// ─────────────────────────────────────────────────────────────────────────────

var FR_PRODUCTS_DEFAULT=['FCF','THH','FJHH','MCHS','STT','Ferry','Maintenance','Training','Private Hire'];
var FR_LOCS_DEFAULT=['QN','MF','MC','FJ','WF'];

function _frToday(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _frNowHM(){var d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function _frMins(t){var m=/(\d{1,2}):(\d{2})/.exec(String(t||''));return m?(+m[1])*60+(+m[2]):null;}
function _frProducts(){var o=S._frSettings&&Array.isArray(S._frSettings.products)?S._frSettings.products:null;return (o&&o.length)?o:FR_PRODUCTS_DEFAULT;}
function _frAdj(){var a=S._frSettings&&S._frSettings.adj!=null?(+S._frSettings.adj):1;return isNaN(a)?1:Math.max(0,a);} // taxi adjustment, in tenths (default 0.1)
function _frAcShort(ac){return String(ac||'').replace(/^ZK-?/,'');}
function _frAcList(){return Object.keys((S&&S.aircraft)||{});}
function _frAcType(ac){var sp=(typeof _acSpec==='function')?_acSpec(ac):((S.aircraft||{})[ac]);return (sp&&sp.layout==='ga8')?'GA8':'C208B';}
function _frAcHours(ac){try{return (typeof maintGetLatest==='function')?maintGetLatest(ac):null;}catch(e){return null;}}
function _frEsc(s){if(typeof _rzEscSafe==='function')return _rzEscSafe(s);if(typeof esc==='function')return esc(s);return String(s==null?'':s);}
// Escape a value to sit safely inside a single-quoted JS string literal within a double-quoted onclick attribute.
function _frJs(s){return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');}

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
    // Pull ALL records (not just this pilot) so the per-aircraft Today's Record shows every PIC's
    // flights — the last PIC reviews the whole day before uploading.
    var rows=await sbF('ts_flight_records','','updated_at');
    if(Array.isArray(rows)){var d={};rows.forEach(function(r){d[r.id]={id:r.id,user_id:r.user_id,fr_date:r.fr_date,aircraft:r.aircraft||'',type:r.actype||'',product:r.product||'',from:r.route_from||'',to:r.route_to||'',pob:r.pob||0,off:r.off_blocks||'',on:r.on_blocks||'',startHours:r.start_hours,endHours:r.end_hours,flightTime:r.flight_time,tacho:r.tacho,landings:r.landings||1,starts:r.starts!=null?r.starts:1,manual:!!r.manual,note:r.note||'',done:!!r.done,submitted:!!r.submitted,submittedBy:r.submitted_by||'',at:r.updated_at||'',by:r.updated_by||''};});S._frData=d;try{lsSet&&lsSet('ts_flight_records_cache',d);}catch(e){}}
  }catch(e){}
  if(typeof safeRender==='function')safeRender();
};
function _frSave(rec){
  S._frData=S._frData||{};S._frData[rec.id]=rec;
  try{lsSet&&lsSet('ts_flight_records_cache',S._frData);}catch(e){}
  if(typeof sbU==='function')sbU('ts_flight_records',[{id:rec.id,user_id:rec.user_id,fr_date:rec.fr_date,aircraft:rec.aircraft||null,actype:rec.type||null,product:rec.product||null,route_from:rec.from||null,route_to:rec.to||null,pob:+rec.pob||0,off_blocks:rec.off||null,on_blocks:rec.on||null,start_hours:rec.startHours!=null?+rec.startHours:null,end_hours:rec.endHours!=null?+rec.endHours:null,flight_time:rec.flightTime!=null?+rec.flightTime:null,tacho:rec.tacho!=null?+rec.tacho:null,landings:+rec.landings||1,starts:+rec.starts||1,manual:!!rec.manual,note:rec.note||null,done:!!rec.done,submitted:!!rec.submitted,submitted_by:rec.submittedBy||null,updated_at:new Date().toISOString(),updated_by:(S.user&&S.user.name)||''}]).catch(function(){});
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
      g.pob+=(parseInt(it.quantity,10)||0); // per-item pax (avoids double-counting multi-item bookings)
    });
  });
  // The FCF/scenic departures allocated to THIS pilot, in time order.
  var ins=[];
  Object.keys(groups).forEach(function(k){var g=groups[k];
    var pilot=(typeof _rzSchedPilotFor==='function')?_rzSchedPilotFor(g.ac,g.start):null;
    if(code&&pilot&&String(pilot)===String(code))ins.push({ac:g.ac,start:g.start,prod:g.prod,pob:g.pob+1,from:'QN',to:_frProdDest(g.prod)||'MF'}); // +1 PIC
  });
  ins.sort(function(a,b){return _frMins(a.start)-_frMins(b.start);});
  // Build the leg list: each scenic departure = an INBOUND leg, plus a FERRY return leg (empty,
  // no loadsheet) back to QN. If a new departure begins before this leg's block ends, the return
  // is a reposition ferry to pick up the next load. The pilot picks/edits the leg they're flying.
  var out=[];
  ins.forEach(function(f,i){
    out.push(f);
    var durMin=(typeof _rzProductDuration==='function')?_rzProductDuration(f.prod):0;
    var retMin=_frMins(f.start)+(durMin||90);
    var next=ins[i+1];
    out.push({ac:f.ac,start:_frHHMM(retMin),prod:'Ferry',pob:1,from:(f.to||'MF'),to:'QN',ferry:true,
      hint:(next&&_frMins(next.start)<retMin)?'reposition for next load':'empty return'});
  });
  out.sort(function(a,b){return _frMins(a.start)-_frMins(b.start);});
  return out;
}
function _frHHMM(min){min=((Math.round(min)%1440)+1440)%1440;return String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0');}
function _frAutoPick(flights){
  if(!flights.length)return null;
  var now=_frMins(_frNowHM());
  var best=null,bestScore=1e9;
  // Nearest departure to now; a flight that left >35 min ago is heavily deprioritised (weather delays
  // mean a slightly-late departure is still "this flight", but one well in the past isn't).
  flights.forEach(function(f){var fm=_frMins(f.start);if(fm==null)return;var s=Math.abs(fm-now)+((fm<now-35)?10000:0);if(s<bestScore){bestScore=s;best=f;}});
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
  var rec={id:_frNewId(),user_id:(S.user&&S.user.id)||'',fr_date:_frToday(),aircraft:d.ac,type:_frAcType(d.ac),product:d.product||'',from:d.from||'',to:d.to||'',pob:+d.pob||0,off:_frNowHM(),on:'',startHours:Math.round((+d.startHours)*10)/10,endHours:null,flightTime:null,tacho:null,landings:1,starts:1,manual:!!d.manual,note:'',done:false,submitted:false,at:new Date().toISOString()};
  _frSave(rec);S._frDraft=null;if(typeof toast==='function')toast('Off blocks '+rec.off+' ✓','ok');render();
};
window.frOnBlocks=function(id){
  var r=(S._frData||{})[id];if(!r)return;
  r.on=_frNowHM();
  // Flight time = OFF→ON block time (the legal figure). Tacho = block − taxi adjustment, and that's
  // what drives the airframe hours (TTIS). End TTIS = start + tacho.
  var blk=_frMins(r.on)-_frMins(r.off);if(blk<0)blk+=1440;
  var blockTenths=Math.round(blk/6);
  r.flightTime=Math.round(blockTenths*0.1*10)/10;
  r.tacho=Math.round(Math.max(0,blockTenths-_frAdj())*0.1*10)/10;
  r.endHours=Math.round(((+r.startHours||0)+r.tacho)*10)/10;
  _frSave(r);if(typeof toast==='function')toast('On blocks '+r.on+' ✓','ok');render();
};
window.frSetEndHours=function(id,val){var r=(S._frData||{})[id];if(!r)return;if(val===''){r.endHours=null;}else{var v=Math.round((+val)*10)/10;if(v<(+r.startHours||0))v=(+r.startHours||0);r.endHours=v;r.tacho=Math.round((v-(+r.startHours||0))*10)/10;}_frSave(r);if(typeof safeRender==='function')safeRender();};
window.frAdjEndHours=function(id,delta){var r=(S._frData||{})[id];if(!r)return;var v=(parseFloat(r.endHours)||(+r.startHours||0))+delta;v=Math.round(v*10)/10;if(v<(+r.startHours||0))v=(+r.startHours||0);r.endHours=v;r.tacho=Math.round((v-(+r.startHours||0))*10)/10;_frSave(r);render();};
// Finalise the flight into Today's Record. It is NOT pushed to Maintenance yet — that happens once,
// at end of day, when the last PIC reviews the per-aircraft record and uploads.
window.frFinish=function(id){var r=(S._frData||{})[id];if(!r)return;if(r.endHours==null){if(typeof toast==='function')toast('Confirm the TTIS hours first.','warn');return;}r.done=true;_frSave(r);if(typeof toast==='function')toast('Flight saved to Today’s Record ✓','ok');S._frPage='record';render();};
// ── editing a recorded flight (via Today's flights) ──
window.frEdit=function(id){S._frEditId=id;render();};
window.frEditCancel=function(){S._frEditId=null;render();};
window.frEditField=function(id,field,val){var r=(S._frData||{})[id];if(!r)return;
  if(field==='pob'||field==='landings'||field==='starts')r[field]=Math.max(0,Math.round(+val)||0);
  else if(field==='startHours'||field==='endHours')r[field]=(val===''?null:Math.round((+val)*10)/10);
  else r[field]=val;
  if(r.off&&r.on){var blk=_frMins(r.on)-_frMins(r.off);if(blk<0)blk+=1440;r.flightTime=Math.round(Math.round(blk/6)*0.1*10)/10;} // block time
  if(r.endHours!=null&&r.startHours!=null)r.tacho=Math.round((r.endHours-(+r.startHours||0))*10)/10; // TTIS used
  _frSave(r);if(typeof safeRender==='function')safeRender();};
window.frEditDone=function(id){S._frEditId=null;_frSave((S._frData||{})[id]);if(typeof toast==='function')toast('Updated ✓ (aircraft hours not auto-recalculated)','ok');render();};
window.frCancelFlight=function(id){if(typeof confirm==='function'&&!confirm('Discard this flight record?'))return;var r=(S._frData||{})[id];if(r){delete S._frData[id];try{lsSet&&lsSet('ts_flight_records_cache',S._frData);}catch(e){}if(typeof sbU!=='undefined'&&typeof SB!=='undefined')fetch(SB+'/rest/v1/ts_flight_records?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:SH}).catch(function(){});}render();};
window.frSetAdj=function(val){S._frSettings=S._frSettings||{};S._frSettings.adj=(val===''?1:Math.max(0,Math.round(+val)));_frSaveSettings();if(typeof safeRender==='function')safeRender();};
window.frToggleSettings=function(){S._frSettingsOpen=!S._frSettingsOpen;render();};

// ── RENDER ──────────────────────────────────────────────────────────────────────
var _FR_BTN='display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:64px;border-radius:14px;border:2px solid var(--border2);background:var(--card);color:var(--text1);font-size:16px;font-weight:700;cursor:pointer;padding:10px;text-align:center;line-height:1.2';
function _frBigBtn(label,on,onclick,sub){return '<button onclick="'+onclick+'" style="'+_FR_BTN+(on?';border-color:#7c3aed;background:rgba(124,58,237,.14);color:#a78bfa':'')+'">'+label+(sub?'<span style="font-size:11px;font-weight:600;color:var(--text3)">'+sub+'</span>':'')+'</button>';}

function renderFlightRecord(){
  if(!S._frLoaded){S._frLoaded=true;if(window.loadFlightRecords)window.loadFlightRecords();}
  if(!S._maintLoaded&&typeof window.ensureMaintenance==='function')window.ensureMaintenance(); // so TTIS start prefills from the latest airswitch
  if(!(typeof hasRolePerm==='function'&&hasRolePerm('flightrecord'))&&!(S.user&&S.user.superAdmin))
    return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div>';
  var uid=(S.user&&S.user.id)||'';
  var open=_frOpenFlight(uid);
  var page=S._frPage||'log';
  var h=(typeof _tier2==='function')?_tier2([{lbl:'Log a flight',on:page==='log',onclick:"S._frPage='log';render()"},{lbl:'Today’s record',on:page==='record',onclick:"S._frPage='record';render()"}]):'';
  if(page==='record'){ h+=_frRenderTodayRecord(uid); return h; }
  if(open){ h+=open.on?_frRenderConfirm(open):_frRenderLand(open); }
  else { h+=_frRenderStart(uid); }
  // settings (taxi adjustment) — collapsible
  h+='<div class="card"><div onclick="window.frToggleSettings()" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-weight:700;font-size:13px"><span>⚙ Settings</span><span style="font-size:11px;color:var(--text3)">'+(S._frSettingsOpen?'▲ Hide':'▼ Show')+'</span></div>';
  if(S._frSettingsOpen){
    h+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px">'+
      '<label style="font-size:12px;color:var(--text2)">Taxi adjustment — tacho is block time minus this many <b>tenths</b> (0.1h) per flight</label>'+
      '<input type="number" min="0" step="1" value="'+_frAdj()+'" onchange="window.frSetAdj(this.value)" style="width:70px;font-size:14px;padding:6px;border:1px solid var(--border2);border-radius:7px;background:var(--card);color:var(--text);text-align:center">'+
      '<span style="font-size:11px;color:var(--text3)">tacho = flight time −'+(_frAdj()/10).toFixed(1)+'h</span>'+
    '</div>';
  }
  h+='</div>';
  return h;
}
// ── Today's Record — per aircraft, reviewed & uploaded to Maintenance by the last PIC ──
function _frRenderTodayRecord(uid){
  var today=_frToday();
  var recs=[];Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];if(r&&r.fr_date===today&&r.done)recs.push(r);});
  if(S._frEditId&&(S._frData||{})[S._frEditId]&&S._frData[S._frEditId].fr_date===today){return _frRenderEdit(S._frData[S._frEditId])+_frTodayBody(recs,today);}
  return _frTodayBody(recs,today);
}
function _frTodayBody(recs,today){
  if(!recs.length)return '<div class="card" style="color:var(--text3);padding:24px;font-size:13px">No flights recorded yet today. Log one on the <b>Log a flight</b> tab.</div>';
  var byAc={};recs.forEach(function(r){(byAc[r.aircraft]=byAc[r.aircraft]||[]).push(r);});
  var pname=function(id){var u=(S.users||[]).find(function(x){return x.id===id;});return u?(u.name||'').split(' ')[0]:'?';};
  var dlbl=new Date(today+'T00:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var h='<div class="card"><div class="st">Today’s record <span style="font-weight:400;font-size:11px;color:var(--text3)">— '+_frEsc(dlbl)+' · verify &amp; upload to Maintenance</span></div></div>';
  Object.keys(byAc).sort().forEach(function(ac){
    var list=byAc[ac].slice().sort(function(a,b){return _frMins(a.off)-_frMins(b.off);});
    var isC208=_frAcType(ac)==='C208B';
    var totLdg=0,totSt=0,totFlt=0,totTacho=0,maxEnd=null;
    list.forEach(function(r){totLdg+=(+r.landings||0);totSt+=(+r.starts||0);totFlt+=(+r.flightTime||0);totTacho+=(+r.tacho||0);if(r.endHours!=null&&(maxEnd==null||+r.endHours>maxEnd))maxEnd=+r.endHours;});
    var submitted=list.every(function(r){return r.submitted;});
    var subBy=(list.find(function(r){return r.submitted&&r.submittedBy;})||{}).submittedBy;
    h+='<div class="card" style="padding:0;overflow-x:auto;border-left:4px solid '+(submitted?'#16a34a':'#f59e0b')+'">';
    h+='<div style="padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><span style="font-size:17px;font-weight:800">'+_frEsc(_frAcShort(ac))+'</span> <span style="font-size:12px;color:var(--text3)">'+_frEsc(_frAcType(ac))+'</span></div>'+
      '<div style="font-size:12px;color:var(--text2)">'+list.length+' flight'+(list.length===1?'':'s')+' · flight '+totFlt.toFixed(1)+'h · tacho '+totTacho.toFixed(1)+'h · '+totLdg+' ldg'+(isC208?' · '+totSt+' starts':'')+' · TTIS → '+(maxEnd!=null?maxEnd.toFixed(1):'—')+'</div></div>';
    var cols=['PIC','Type','Route','Off','On','Flt h','Tacho','TTIS st','TTIS end','Ldg'].concat(isC208?['Starts']:[]).concat(['Notes']);
    h+='<table style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:'+(isC208?760:700)+'px"><thead><tr style="background:var(--card2)">'+cols.map(function(t,i){return '<th style="text-align:'+(i<3?'left':'center')+';padding:6px 7px;font-size:9px;color:var(--text3);font-weight:700;white-space:nowrap">'+t+'</th>';}).join('')+'</tr></thead><tbody>';
    list.forEach(function(r){
      h+='<tr onclick="window.frEdit(\''+r.id+'\')" style="border-top:1px solid var(--border2);cursor:pointer">'+
        '<td style="padding:5px 7px;font-weight:700">'+_frEsc(pname(r.user_id))+'</td>'+
        '<td style="padding:5px 7px;color:var(--text2)">'+_frEsc(r.product||'')+(r.product==='Ferry'?'':'')+'</td>'+
        '<td style="padding:5px 7px;color:var(--text2)">'+_frEsc((r.from||'')+(r.to?'→'+r.to:''))+'</td>'+
        '<td style="padding:5px 7px;text-align:center">'+_frEsc(r.off||'')+'</td>'+
        '<td style="padding:5px 7px;text-align:center">'+_frEsc(r.on||'')+'</td>'+
        '<td style="padding:5px 7px;text-align:center;font-weight:700">'+(r.flightTime!=null?r.flightTime.toFixed(1):'')+'</td>'+
        '<td style="padding:5px 7px;text-align:center">'+(r.tacho!=null?r.tacho.toFixed(1):'')+'</td>'+
        '<td style="padding:5px 7px;text-align:center;color:var(--text2)">'+(r.startHours!=null?(+r.startHours).toFixed(1):'')+'</td>'+
        '<td style="padding:5px 7px;text-align:center;font-weight:700;color:#f59e0b">'+(r.endHours!=null?(+r.endHours).toFixed(1):'')+'</td>'+
        '<td style="padding:5px 7px;text-align:center">'+(r.landings||'')+'</td>'+
        (isC208?'<td style="padding:5px 7px;text-align:center">'+(r.starts||'')+'</td>':'')+
        '<td style="padding:5px 7px;color:var(--text3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_frEsc(r.note||'')+'</td>'+
        '</tr>';
    });
    h+='</tbody></table>';
    h+='<div style="padding:12px 14px">';
    if(submitted){h+='<div style="font-size:13px;color:#16a34a;font-weight:700">✓ Uploaded to Maintenance'+(subBy?' by '+_frEsc(subBy):'')+'</div>';}
    else{h+='<button onclick="window.frSubmitAircraft(\''+ac+'\')" style="width:100%;min-height:62px;border-radius:14px;border:none;background:#16a34a;color:#fff;font-size:18px;font-weight:800;cursor:pointer">✓ Information correct — upload '+_frEsc(_frAcShort(ac))+' to Maintenance</button><div style="font-size:11px;color:var(--text3);text-align:center;margin-top:6px">Writes the day’s TTIS, landings'+(isC208?' &amp; starts':'')+' to the maintenance log. Tap a row to fix anything first.</div>';}
    h+='</div></div>';
  });
  return h;
}
// Upload one aircraft's day to the maintenance log, then mark its flights submitted.
window.frSubmitAircraft=function(ac){
  var today=_frToday();
  var list=[];Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];if(r&&r.fr_date===today&&r.done&&r.aircraft===ac)list.push(r);});
  if(!list.length)return;
  if(typeof confirm==='function'&&!confirm('Confirm '+_frAcShort(ac)+'’s '+list.length+' flight'+(list.length===1?'':'s')+' are correct and upload to the maintenance log?'))return;
  var totLdg=0,totSt=0,maxEnd=null;list.forEach(function(r){totLdg+=(+r.landings||0);totSt+=(+r.starts||0);if(r.endHours!=null&&(maxEnd==null||+r.endHours>maxEnd))maxEnd=+r.endHours;});
  if(typeof window.ensureMaintenance!=='function'||typeof saveMaintenance!=='function'){if(typeof toast==='function')toast('Maintenance not available.','warn');return;}
  Promise.resolve(window.ensureMaintenance()).then(function(){
    try{
      if(!S.maintenance||typeof S.maintenance!=='object')S.maintenance={hist:[],oil:[],nextCheck:{},checkType:{},engineLastOH:{},engineToRun:{},propLastOH:{},propToRun:{},bookings:{},priority:[],compwash:{},adas:{}};
      if(!Array.isArray(S.maintenance.hist))S.maintenance.hist=[];
      var e=S.maintenance.hist.find(function(x){return x.date===today;});
      if(!e){e={date:today};S.maintenance.hist.push(e);S.maintenance.hist.sort(function(a,b){return String(a.date).localeCompare(String(b.date));});}
      if(maxEnd!=null)e[ac]=Math.round(maxEnd*10)/10;     // end-of-day TTIS
      e[ac+'_landings']=totLdg;                            // total landings for the day
      e[ac+'_starts']=totSt;                               // total starts for the day
      saveMaintenance();
    }catch(err){console.error('[fr submit]',err);}
    var who=(S.user&&S.user.name)||'';
    list.forEach(function(r){r.submitted=true;r.submittedBy=who;_frSave(r);});
    if(typeof toast==='function')toast(_frAcShort(ac)+' uploaded to Maintenance ✓','ok');
    render();
  });
};
function _frRenderEdit(r){
  var h='<div class="card" style="border-left:4px solid #60a5fa">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-size:16px;font-weight:800">Edit flight — '+_frEsc(_frAcShort(r.aircraft))+'</div><button onclick="window.frEditCancel()" style="background:none;border:none;color:var(--text3);font-size:13px;cursor:pointer">✕ Close</button></div>';
  h+='<div style="font-size:11px;color:var(--text3);font-weight:700;margin:4px 0 6px">FLIGHT TYPE</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">';
  _frProducts().forEach(function(pr){h+='<button onclick="window.frEditField(\''+r.id+'\',\'product\',\''+_frJs(pr)+'\')" style="padding:8px 12px;border-radius:9px;border:2px solid var(--border2);background:var(--card);color:var(--text1);font-size:13px;font-weight:700;cursor:pointer'+(r.product===pr?';border-color:#7c3aed;background:rgba(124,58,237,.14);color:#a78bfa':'')+'">'+_frEsc(pr)+'</button>';});
  h+='</div>';
  function fld(lbl,field,val,type){return '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">'+lbl+'</label><input type="'+(type||'text')+'"'+(type==='number'?' step="0.1"':'')+' value="'+_frEsc(val==null?'':val)+'" onchange="window.frEditField(\''+r.id+'\',\''+field+'\',this.value)" style="width:96px;height:46px;font-size:16px;font-weight:700;text-align:center;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text)"></div>';}
  var c208=_frAcType(r.aircraft)==='C208B';
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap">'+
    fld('From','from',r.from)+fld('To','to',r.to)+fld('POB','pob',r.pob,'number')+fld('Landings','landings',r.landings,'number')+
    (c208?fld('Starts','starts',r.starts,'number'):'')+
    fld('Off (HH:MM)','off',r.off)+fld('On (HH:MM)','on',r.on)+fld('Start TTIS','startHours',r.startHours,'number')+fld('End TTIS','endHours',r.endHours,'number')+
    '</div>';
  h+='<div style="font-size:11px;color:var(--text3);margin-top:8px">Flight time (off→on block) <b style="color:var(--text1)">'+(r.flightTime!=null?r.flightTime.toFixed(1):'—')+'h</b> · tacho (TTIS used) <b style="color:var(--text1)">'+(r.tacho!=null?r.tacho.toFixed(1):'—')+'h</b> · type '+_frEsc(_frAcType(r.aircraft))+'</div>';
  h+='<div style="margin-top:10px"><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Notes</label><textarea onchange="window.frEditField(\''+r.id+'\',\'note\',this.value)" rows="2" style="width:100%;box-sizing:border-box;font-size:14px;padding:10px;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text);resize:vertical">'+_frEsc(r.note||'')+'</textarea></div>';
  h+='<button onclick="window.frEditDone(\''+r.id+'\')" style="width:100%;margin-top:14px;min-height:56px;border-radius:14px;border:none;background:#16a34a;color:#fff;font-size:18px;font-weight:800;cursor:pointer">✓ Save changes</button>';
  h+='<div style="font-size:11px;color:var(--text3);margin-top:6px">'+(r.submitted?'This day was already uploaded — changing it here will not re-write Maintenance; adjust there if needed.':'Changes here flow through when you upload the aircraft to Maintenance.')+'</div>';
  h+='</div>';
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
      var fy=!!f.ferry;
      h+='<button onclick="window.frUseFlight(\''+_frJs(f.ac)+'\',\''+_frJs(f.prod)+'\',\''+_frJs(f.from)+'\',\''+_frJs(f.to)+'\','+f.pob+',false);window.frTab(\'auto\')" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px;border-radius:12px;border:2px solid '+(fy?'rgba(245,158,11,.5)':'var(--border2)')+';background:'+(fy?'rgba(245,158,11,.08)':'var(--card)')+';color:var(--text1);cursor:pointer;margin-bottom:8px;text-align:left">'+
        '<span style="font-size:18px;font-weight:800;min-width:54px">'+_frEsc(f.start)+'</span>'+
        '<span style="font-size:17px;font-weight:800;color:'+(fy?'#f59e0b':'#7c3aed')+'">'+_frEsc(_frAcShort(f.ac))+'</span>'+
        '<span style="font-size:15px;font-weight:700">'+_frEsc((f.from||'')+(f.to?'→'+f.to:''))+'</span>'+
        '<span style="font-size:13px;color:var(--text2)">'+_frEsc(f.prod)+' · '+f.pob+' POB'+(fy?' · <span style="color:#f59e0b;font-weight:700">FERRY'+(f.hint?' ('+_frEsc(f.hint)+')':'')+'</span>':'')+'</span>'+
        '<span style="margin-left:auto;font-size:20px;color:var(--text3)">▸</span>'+
      '</button>';
    });
    h+='<div style="font-size:11px;color:var(--text3);padding:4px 2px">Ferry legs (amber) are empty repositioning flights — no loadsheet.</div>';
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
  _frAcList().forEach(function(ac){h+=_frBigBtn(_frAcShort(ac),d.ac===ac,"window.frUseFlight('"+_frJs(ac)+"','"+_frJs(d.product||'')+"','"+_frJs(d.from||'')+"','"+_frJs(d.to||'')+"',"+(+d.pob||1)+","+(manual?'true':'false')+")",_frAcHours(ac)!=null?(+_frAcHours(ac)).toFixed(1)+'h':'');});
  h+='</div>';
  // Product
  h+='<div style="font-size:11px;color:var(--text3);font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:6px 0 6px">Flight type</div>';
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-bottom:14px">';
  _frProducts().forEach(function(pr){h+=_frBigBtn(_frEsc(pr),d.product===pr,"window.frDraftSet('product','"+_frJs(pr)+"')");});
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
  h+='<div style="font-size:14px;color:var(--text2);margin-bottom:14px">Off '+_frEsc(r.off)+' → On '+_frEsc(r.on)+' · block '+_frEsc(_frBlockStr(r))+' · <b style="color:var(--text1)">flight '+(r.flightTime!=null?r.flightTime.toFixed(1):'0.0')+'h</b> · tacho '+(r.tacho!=null?r.tacho.toFixed(1):'0.0')+'h <span style="color:var(--text3)">(block −'+(_frAdj()/10).toFixed(1)+'h taxi)</span></div>';
  h+='<div style="font-size:14px;font-weight:800;margin-bottom:8px">Confirm TTIS end is</div>';
  h+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
    '<button onclick="window.frAdjEndHours(\''+r.id+'\',-0.1)" style="width:54px;height:58px;border-radius:12px;border:2px solid var(--border2);background:var(--card2);color:var(--text1);font-size:24px;font-weight:800;cursor:pointer">–</button>'+
    '<input type="number" step="0.1" value="'+(r.endHours!=null?(+r.endHours).toFixed(1):'')+'" onchange="window.frSetEndHours(\''+r.id+'\',this.value)" style="width:170px;height:64px;font-size:32px;font-weight:800;text-align:center;border:2px solid var(--border2);border-radius:12px;background:var(--card);color:var(--text)">'+
    '<button onclick="window.frAdjEndHours(\''+r.id+'\',0.1)" style="width:54px;height:58px;border-radius:12px;border:2px solid var(--border2);background:var(--card2);color:var(--text1);font-size:24px;font-weight:800;cursor:pointer">+</button>'+
  '</div>';
  h+='<div style="font-size:11px;color:var(--text3);margin-top:6px">Pre-filled: start '+(+r.startHours||0).toFixed(1)+' + tacho '+(r.tacho!=null?r.tacho.toFixed(1):'0.0')+'h.</div>';
  // landings / starts / notes
  var c208=_frAcType(r.aircraft)==='C208B';
  h+='<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px">'+
    '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Landings</label><input type="number" min="0" value="'+(r.landings!=null?r.landings:1)+'" onchange="window.frEditField(\''+r.id+'\',\'landings\',this.value)" style="width:84px;height:46px;font-size:16px;font-weight:700;text-align:center;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text)"></div>'+
    (c208?'<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Starts</label><input type="number" min="0" value="'+(r.starts!=null?r.starts:1)+'" onchange="window.frEditField(\''+r.id+'\',\'starts\',this.value)" style="width:84px;height:46px;font-size:16px;font-weight:700;text-align:center;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text)"></div>':'')+
  '</div>';
  h+='<div style="margin-top:12px"><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Notes (optional)</label><textarea onchange="window.frEditField(\''+r.id+'\',\'note\',this.value)" rows="2" placeholder="Anything worth recording for this flight…" style="width:100%;box-sizing:border-box;font-size:14px;padding:10px;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text);resize:vertical">'+_frEsc(r.note||'')+'</textarea></div>';
  h+='<button onclick="window.frFinish(\''+r.id+'\')" style="width:100%;margin-top:16px;min-height:74px;border-radius:16px;border:none;background:#16a34a;color:#fff;font-size:22px;font-weight:800;cursor:pointer">✓ SAVE TO TODAY’S RECORD</button>';
  h+='</div>';
  return h;
}
function _frBlockStr(r){var blk=_frMins(r.on)-_frMins(r.off);if(blk<0)blk+=1440;return Math.floor(blk/60)+'h '+(blk%60)+'m';}
