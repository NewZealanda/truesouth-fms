// ─────────────────────────────────────────────────────────────────────────────
//  DAILY FLIGHT RECORD  (v24.86)
//  A big, tap-once flight log built for iPad in the cockpit. Off-blocks → on-blocks,
//  airframe hours (TTIS) confirm, product/route/POB. Auto-detects the flight you're about to
//  do from the calendar (by current time), with a today's-flights picker and a manual tab.
//  v1 = record only (persists to ts_flight_records). It will later feed Flight & Duty and update
//  the aircraft hours in Maintenance. Gated by the `flightrecord` permission (superadmin in dev).
//  NOTE: persistence needs the ts_flight_records table — see flight_record.sql.
// ─────────────────────────────────────────────────────────────────────────────

var FR_PRODUCTS_DEFAULT=['FCF','MFOH','THH','FJHH','MCHS','STT','Ferry','Maintenance','Training','Private Hire'];
var FR_LOCS_DEFAULT=['QN','MF','MC','FJ','WF'];

function _frToday(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _frNowHM(){var d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function _frMins(t){var m=/(\d{1,2}):(\d{2})/.exec(String(t||''));return m?(+m[1])*60+(+m[2]):null;}
function _frProducts(){var o=S._frSettings&&Array.isArray(S._frSettings.products)?S._frSettings.products:null;return (o&&o.length)?o:FR_PRODUCTS_DEFAULT;}
function _frAdj(){var a=S._frSettings&&S._frSettings.adj!=null?(+S._frSettings.adj):1;return isNaN(a)?1:Math.max(0,a);} // taxi adjustment, in tenths (default 0.1)
function _frAcShort(ac){return String(ac||'').replace(/^ZK-?/,'');}
function _frAcList(){return Object.keys((S&&S.aircraft)||{});}
function _frAcType(ac){var sp=(typeof _acSpec==='function')?_acSpec(ac):((S.aircraft||{})[ac]);return (sp&&sp.layout==='ga8')?'GA8':'C208B';}
// Resolve a short location code (as used in a block label, e.g. "QN", "WF", "MF") to its full place
// name. The codes are the ICAO without the NZ prefix — QN→NZQN→Queenstown, WF→NZWF→Wanaka.
function _frPlaceName(code){
  code=String(code||'').trim().toUpperCase();if(!code)return '';
  var icao=code.length>=4?code:('NZ'+code);
  var list=(typeof NZ_AERODROMES!=='undefined')?NZ_AERODROMES:[];
  var a=list.find(function(x){return x.icao===icao;});
  if(!a){try{var cust=(typeof _getCustomAerodromes==='function')?_getCustomAerodromes():[];a=(cust||[]).find(function(x){return x.icao===icao;});}catch(e){}}
  return a?a.name:'';
}
function _frRouteName(from,to){var f=_frPlaceName(from),t=_frPlaceName(to);if(!f&&!t)return '';return (f||from||'')+(t?' → '+t:'');}
// An aerodrome's short designator: the ICAO minus the NZ prefix (NZWN→WN); keep the full id for
// non-standard / non-ICAO aerodromes.
function _frAeroCode(icao){icao=String(icao||'').trim().toUpperCase();return /^NZ..$/.test(icao)?icao.slice(2):icao;}
// Coerce a typed time into HH:MM — "2334"→"23:34", "934"→"09:34". Leaves anything already valid /
// too short alone.
function _frFmtTime(v){v=String(v==null?'':v).trim();if(/^\d{1,2}:\d{2}$/.test(v))return v;var d=v.replace(/\D/g,'');if(d.length===4)return d.slice(0,2)+':'+d.slice(2);if(d.length===3)return '0'+d.slice(0,1)+':'+d.slice(1);return v;}
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
  try{if(typeof SB!=='undefined')fetch(SB+'/rest/v1/ts_settings?key=eq.fr_settings&select=value',{headers:SH}).then(function(r){return r.ok?r.json():[];}).then(function(s){try{if(s&&s[0]&&s[0].value){S._frSettings=JSON.parse(s[0].value);if(typeof _sbSetBase==='function')_sbSetBase('fr_settings',S._frSettings);}}catch(e){}if(typeof safeRender==='function')safeRender();}).catch(function(){});}catch(e){}
  if(typeof sbF!=='function'){if(typeof render==='function')render();return;}
  try{
    // Pull ALL records (not just this pilot) so the per-aircraft Today's Record shows every PIC's
    // flights — the last PIC reviews the whole day before uploading.
    var rows=await sbF('ts_flight_records','','updated_at');
    if(Array.isArray(rows)){var d={};rows.forEach(function(r){d[r.id]={id:r.id,user_id:r.user_id,fr_date:r.fr_date,aircraft:r.aircraft||'',type:r.actype||'',product:r.product||'',from:r.route_from||'',to:r.route_to||'',pob:r.pob||0,off:r.off_blocks||'',on:r.on_blocks||'',startHours:r.start_hours,endHours:r.end_hours,flightTime:r.flight_time,tacho:r.tacho,landings:r.landings||1,starts:r.starts!=null?r.starts:1,picName:r.pic_name||'',copilot:r.copilot||'',details:r.details||'',manual:!!r.manual,note:r.note||'',done:!!r.done,submitted:!!r.submitted,submittedBy:r.submitted_by||'',at:r.updated_at||'',by:r.updated_by||''};});S._frData=d;try{lsSet&&lsSet('ts_flight_records_cache',d);}catch(e){}}
  }catch(e){}
  if(typeof safeRender==='function')safeRender();
};
function _frSave(rec){
  S._frData=S._frData||{};S._frData[rec.id]=rec;
  try{lsSet&&lsSet('ts_flight_records_cache',S._frData);}catch(e){}
  if(typeof sbU==='function')sbU('ts_flight_records',[{id:rec.id,user_id:rec.user_id,fr_date:rec.fr_date,aircraft:rec.aircraft||null,actype:rec.type||null,product:rec.product||null,route_from:rec.from||null,route_to:rec.to||null,pob:+rec.pob||0,off_blocks:rec.off||null,on_blocks:rec.on||null,start_hours:rec.startHours!=null?+rec.startHours:null,end_hours:rec.endHours!=null?+rec.endHours:null,flight_time:rec.flightTime!=null?+rec.flightTime:null,tacho:rec.tacho!=null?+rec.tacho:null,landings:+rec.landings||1,starts:+rec.starts||1,pic_name:rec.picName||null,copilot:rec.copilot||null,details:rec.details||null,manual:!!rec.manual,note:rec.note||null,done:!!rec.done,submitted:!!rec.submitted,submitted_by:rec.submittedBy||null,updated_at:new Date().toISOString(),updated_by:(S.user&&S.user.name)||''}]).catch(function(){});
}
function _frSaveSettings(){if(typeof sbMergeSave==='function')sbMergeSave('fr_settings',S._frSettings||{},function(m){S._frSettings=m;});}

// ── auto-detect the pilot's flights today from the calendar ──
function _frPilotCode(u){var cr=(typeof _crewForUser==='function')?_crewForUser(u):null;return (cr&&cr.code)||'';}
function _frProdDest(prod){
  try{if(typeof _rzEffCfg==='function'){var c=_rzEffCfg(prod);if(c&&c.short)return c.short;}}catch(e){}
  return '';
}
function _frDayFlights(uid){
  var u=(S.users||[]).find(function(x){return x.id===uid;});if(!u)return [];
  // Only auto-detect when the calendar is on TODAY — otherwise S._rezdyBookings/_schedBlocks are for a
  // different day and would surface the wrong flights (manual-block branch already guards this).
  if(S.rezdyDate&&S.rezdyDate!==_frToday())return [];
  var code=_frPilotCode(u);var bk=S._rezdyBookings||[];
  var groups={};
  bk.forEach(function(b){
    if((typeof _rzIsCancelled==='function')?_rzIsCancelled(b):/cancel/i.test(b.status||''))return;
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
  // Manual schedule blocks (maintenance / training / ferry / private hire) the operator created on the
  // calendar and assigned to THIS pilot — show them as flights too (label "QN-WF" → from QN, to WF).
  if(S.rezdyDate===_frToday()){
    (S._schedBlocks||[]).forEach(function(b){
      var pc=(S._schedPilots||{})[b.id];if(!pc||!code||String(pc)!==String(code))return;
      var lbl=String(b.label||'').trim();
      var parts=lbl.split(/[-–/]/).map(function(s){return s.trim();}).filter(Boolean);
      out.push({ac:b.aircraft,start:b.start,prod:b.ftype||'Maintenance',from:parts[0]||'QN',to:parts[1]||'',pob:1,manualBlock:true,hint:lbl});
    });
  }
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
  var prev=S._frDraft||{};
  // Keep an already-entered start TTIS when re-selecting the SAME aircraft; only pull the
  // maintenance latest when the aircraft actually changes (different airframe).
  var hrs=(prev.ac===ac&&prev.startHours!=null&&prev.startHours!=='')?prev.startHours:_frAcHours(ac);
  S._frDraft={ac:ac||'',product:prod||'',from:from||'',to:to||'',pob:(pob!=null?+pob:1),startHours:(hrs!=null?hrs:''),manual:!!manual};
  render();
};
window.frDraftSet=function(field,value){S._frDraft=S._frDraft||{};S._frDraft[field]=(field==='pob')?Math.max(0,Math.round(+value)||0):value;render();};
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
window.frFinish=function(id){var r=(S._frData||{})[id];if(!r)return;if(r.endHours==null){if(typeof toast==='function')toast('Confirm the TTIS hours first.','warn');return;}r.done=true;_frSave(r);if(typeof toast==='function')toast('Flight saved to Today’s Record ✓','ok');S._frPage='record';S._frRecDate=null;render();};
// ── editing a recorded flight (via Today's flights) ──
window.frEdit=function(id){S._frEditId=id;S._frDelConfirm=null;render();};
window.frEditCancel=function(){S._frEditId=null;S._frDelConfirm=null;render();};
window.frEditField=function(id,field,val){var r=(S._frData||{})[id];if(!r)return;
  if(field==='pob'||field==='landings'||field==='starts')r[field]=Math.max(0,Math.round(+val)||0);
  else if(field==='startHours'||field==='endHours')r[field]=(val===''?null:Math.round((+val)*10)/10);
  else if(field==='off'||field==='on')r[field]=_frFmtTime(val);   // "2334" → "23:34"
  else r[field]=val;
  if(r.off&&r.on){var blk=_frMins(r.on)-_frMins(r.off);if(blk<0)blk+=1440;r.flightTime=Math.round(Math.round(blk/6)*0.1*10)/10;} // block time
  if(r.endHours!=null&&r.startHours!=null)r.tacho=Math.round((r.endHours-(+r.startHours||0))*10)/10; // TTIS used
  _frSave(r);if(typeof safeRender==='function')safeRender();};
window.frEditDone=function(id){S._frEditId=null;_frSave((S._frData||{})[id]);if(typeof toast==='function')toast('Updated ✓ (aircraft hours not auto-recalculated)','ok');render();};
window.frEditDelete=function(id){S._frDelConfirm=id;render();};            // show the in-app confirm screen
window.frEditDeleteCancel=function(){S._frDelConfirm=null;render();};
window.frEditDeleteConfirm=function(id){var r=(S._frData||{})[id];if(!r){S._frDelConfirm=null;render();return;}
  delete S._frData[id];try{lsSet&&lsSet('ts_flight_records_cache',S._frData);}catch(e){}
  if(typeof sbDel==='function')sbDel('ts_flight_records',id);else if(typeof SB!=='undefined')fetch(SB+'/rest/v1/ts_flight_records?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:SH}).catch(function(){});
  S._frDelConfirm=null;S._frEditId=null;if(typeof toast==='function')toast('Flight deleted','ok');render();};
window.frCancelFlight=function(id){if(typeof confirm==='function'&&!confirm('Discard this flight record?'))return;var r=(S._frData||{})[id];if(r){delete S._frData[id];try{lsSet&&lsSet('ts_flight_records_cache',S._frData);}catch(e){}if(typeof sbDel==='function')sbDel('ts_flight_records',id);else if(typeof SB!=='undefined')fetch(SB+'/rest/v1/ts_flight_records?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:SH}).catch(function(){});}render();};
window.frSetAdj=function(val){S._frSettings=S._frSettings||{};S._frSettings.adj=(val===''?1:Math.max(0,Math.round(+val)));_frSaveSettings();if(typeof safeRender==='function')safeRender();};
window.frToggleSettings=function(){S._frSettingsOpen=!S._frSettingsOpen;render();};

// ── RENDER ──────────────────────────────────────────────────────────────────────
var _FR_BTN='display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:64px;border-radius:14px;border:2px solid var(--border2);background:var(--card);color:var(--text1);font-size:16px;font-weight:700;cursor:pointer;padding:10px;text-align:center;line-height:1.2';
function _frBigBtn(label,on,onclick,sub,col){
  var extra='';
  if(col){extra=on?';border-color:'+col+';background:'+col+'22;color:'+col:';border-color:'+col+'66;color:'+col;}
  else if(on){extra=';border-color:#7c3aed;background:rgba(124,58,237,.14);color:#a78bfa';}
  return '<button onclick="'+onclick+'" style="'+_FR_BTN+extra+'">'+label+(sub?'<span style="font-size:11px;font-weight:600;color:var(--text3)">'+sub+'</span>':'')+'</button>';
}
function _frAcCol(ac){return (typeof AC_COL!=='undefined'&&AC_COL[ac])||'#64748b';}

function renderFlightRecord(){
  if(!S._frLoaded){S._frLoaded=true;if(window.loadFlightRecords)window.loadFlightRecords();}
  if(!S._maintLoaded&&typeof window.ensureMaintenance==='function')window.ensureMaintenance(); // so TTIS start prefills from the latest airswitch
  // Ensure TODAY's calendar data is loaded so allocated scenic flights + manual blocks appear even
  // if the pilot hasn't opened the Calendar. Runs once per session; only when viewing today's date.
  if(!S._frSchedEnsured&&S.rezdyDate===_frToday()){
    S._frSchedEnsured=true;
    if(S._schedBlocks==null&&typeof window.rezdyLoadSchedule==='function')window.rezdyLoadSchedule();
    if(S._rezdyBookings==null&&typeof window.rezdyLoadBookings==='function')window.rezdyLoadBookings();
    if((S._schedPilots==null||!Object.keys(S._schedPilots||{}).length)&&typeof window.rezdyLoadPickups==='function')window.rezdyLoadPickups();
  }
  if(!(typeof hasRolePerm==='function'&&hasRolePerm('flightrecord'))&&!(S.user&&S.user.superAdmin))
    return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div>';
  var uid=(S.user&&S.user.id)||'';
  var open=_frOpenFlight(uid);
  var page=S._frPage||'log';
  var _tabs=[{lbl:'Log a flight',on:page==='log',onclick:"S._frPage='log';render()"},{lbl:'Aircraft records',on:page==='record',onclick:"S._frPage='record';render()"}];
  if(_frStatsAllowed())_tabs.push({lbl:'Statistics',on:page==='stats',onclick:"S._frPage='stats';render()"});
  var h=(typeof _tier2==='function')?_tier2(_tabs):'';
  if(page==='stats'&&_frStatsAllowed()){ h+=_frRenderStats(); return h; }
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
  h+=_frLocOverlay();   // searchable "Other" From/To picker (when open)
  h+=_frTypeOverlay();  // "Other" flight-type popup (when open)
  return h;
}
// ── Aircraft Records — per aircraft, browsable by date; reviewed & uploaded to Maintenance ──
function _frShiftRecDate(delta){var d=new Date((S._frRecDate||_frToday())+'T00:00:00');d.setDate(d.getDate()+delta);S._frRecDate=_frIsoLocal(d);render();}
window._frShiftRecDate=_frShiftRecDate;
function _frIsoLocal(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _frRenderTodayRecord(uid){
  var date=S._frRecDate||_frToday();
  var isToday=date===_frToday();
  var dlbl=new Date(date+'T00:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  // date navigator
  var nav='<div class="card" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
    '<button onclick="window._frShiftRecDate(-1)" style="width:42px;height:42px;border-radius:10px;border:1px solid var(--border2);background:var(--card2);color:var(--text1);font-size:18px;font-weight:800;cursor:pointer">‹</button>'+
    '<input type="date" value="'+date+'" onchange="S._frRecDate=this.value;render()" style="height:42px;font-size:14px;padding:0 10px;border:1px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text)">'+
    '<button onclick="window._frShiftRecDate(1)" style="width:42px;height:42px;border-radius:10px;border:1px solid var(--border2);background:var(--card2);color:var(--text1);font-size:18px;font-weight:800;cursor:pointer">›</button>'+
    (isToday?'':'<button onclick="S._frRecDate=null;render()" style="height:42px;padding:0 14px;border-radius:10px;border:1px solid var(--border2);background:var(--card2);color:var(--text1);font-size:13px;font-weight:700;cursor:pointer">Today</button>')+
    '<div style="font-weight:800;font-size:15px;margin-left:4px">'+_frEsc(dlbl)+(isToday?' <span style="font-size:11px;color:#16a34a;font-weight:700">• today</span>':'')+'</div>'+
  '</div>';
  // Real recorded flights only (a pure manual logbook row with no times/TTIS shouldn't inflate Maintenance).
  var recsAll=[];Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];if(r&&r.fr_date===date&&r.done&&(r.endHours!=null||r.off))recsAll.push(r);});
  // Aircraft selector — split the day's records by aircraft (persists as you page through dates).
  var acsOnDay=[];recsAll.forEach(function(r){if(acsOnDay.indexOf(r.aircraft)<0)acsOnDay.push(r.aircraft);});acsOnDay.sort();
  var selAc=S._frRecAc||'';if(selAc&&acsOnDay.indexOf(selAc)<0&&acsOnDay.length===0){/* keep filter even if no flights that day */}
  var chip=function(lbl,on,onclick,col){var c=col||'#7c3aed';return '<button onclick="'+onclick+'" style="padding:7px 13px;border-radius:9px;border:2px solid '+(on?c:(col?c+'66':'var(--border2)'))+';background:'+(on?(col?c+'22':'rgba(124,58,237,.14)'):'transparent')+';color:'+(on?(col?c:'#a78bfa'):(col||'var(--text2)'))+';font-size:13px;font-weight:800;cursor:pointer">'+lbl+'</button>';};
  var sel='<div class="card" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-right:2px">Aircraft</span>'+
    chip('All',selAc==='',"S._frRecAc=null;render()")+
    _frAcList().map(function(ac){return chip(_frAcShort(ac),selAc===ac,"S._frRecAc='"+_frJs(ac)+"';render()",_frAcCol(ac));}).join('')+
  '</div>';
  var recs=selAc?recsAll.filter(function(r){return r.aircraft===selAc;}):recsAll;
  var h=nav+sel;
  if(S._frEditId&&(S._frData||{})[S._frEditId]&&S._frData[S._frEditId].fr_date===date){h+=_frRenderEdit(S._frData[S._frEditId]);}
  if(selAc&&!recs.length)return h+'<div class="card" style="color:var(--text3);padding:24px;font-size:13px">No '+_frEsc(_frAcShort(selAc))+' flights recorded for this day.</div>';
  return h+_frTodayBody(recs,date);
}
function _frTodayBody(recs,today){
  if(!recs.length)return '<div class="card" style="color:var(--text3);padding:24px;font-size:13px">No flights recorded for this day.</div>';
  var byAc={};recs.forEach(function(r){(byAc[r.aircraft]=byAc[r.aircraft]||[]).push(r);});
  var pname=function(id){var u=(S.users||[]).find(function(x){return x.id===id;});return u?(u.name||'?'):'?';};
  var h='';
  Object.keys(byAc).sort().forEach(function(ac){
    var list=byAc[ac].slice().sort(function(a,b){return _frMins(a.off)-_frMins(b.off);});
    var isC208=_frAcType(ac)==='C208B';
    var totLdg=0,totSt=0,totFlt=0,totTacho=0,maxEnd=null;
    list.forEach(function(r){totLdg+=(+r.landings||0);totSt+=(+r.starts||0);totFlt+=(+r.flightTime||0);totTacho+=(+r.tacho||0);if(r.endHours!=null&&(maxEnd==null||+r.endHours>maxEnd))maxEnd=+r.endHours;});
    var submitted=list.every(function(r){return r.submitted;});
    var subBy=(list.find(function(r){return r.submitted&&r.submittedBy;})||{}).submittedBy;
    h+='<div class="card" style="padding:0;overflow-x:auto;border-left:4px solid '+(submitted?'#16a34a':'#f59e0b')+'">';
    h+='<div style="padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><span style="font-size:17px;font-weight:800;color:'+_frAcCol(ac)+'">'+_frEsc(_frAcShort(ac))+'</span> <span style="font-size:12px;color:var(--text3)">'+_frEsc(_frAcType(ac))+'</span></div>'+
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
    else{h+='<button onclick="window.frSubmitAircraft(\''+ac+'\')" style="width:100%;min-height:62px;border-radius:14px;border:none;background:#16a34a;color:#fff;font-size:18px;font-weight:800;cursor:pointer">✓ Information correct — submit '+_frEsc(_frAcShort(ac))+'</button><div style="font-size:11px;color:var(--text3);text-align:center;margin-top:6px">Writes the day’s TTIS, landings'+(isC208?' &amp; starts':'')+' to Maintenance, and each pilot’s flight time + landings to Flight &amp; Duty. Tap a row to fix anything first.</div>';}
    h+='</div></div>';
  });
  return h;
}
// ── Statistics (admin / F&D-manager) ─────────────────────────────────────────────
function _frStatsAllowed(){return !!((S.user&&S.user.superAdmin)||(typeof hasRolePerm==='function'&&(hasRolePerm('admin_users')||hasRolePerm('flightrecord_manage'))));}
window.frStatSearch=function(v){S._frStatQ=v;}; // no render (DOM filter keeps focus)
window.frStatFilter=function(q){q=String(q||'').toLowerCase();var els=document.querySelectorAll('.frStatRow');for(var i=0;i<els.length;i++){els[i].style.display=(els[i].getAttribute('data-s')||'').indexOf(q)>=0?'':'none';}};
window.frStatPilot=function(uid){S._frStatUid=(S._frStatUid===uid?null:uid);render();};
function _frRenderStats(){
  if(!_frStatsAllowed())return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div>';
  if(!S._frLoaded){S._frLoaded=true;if(window.loadFlightRecords)window.loadFlightRecords();}
  var recs=[];Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];if(r&&r.done&&(r.endHours!=null||r.off))recs.push(r);});
  var pn=function(uid){var u=(S.users||[]).find(function(x){return x.id===uid;});return u?(u.name||uid):uid;};
  // aggregate per pilot (+ per-destination)
  var byP={};
  recs.forEach(function(r){var a=byP[r.user_id]||(byP[r.user_id]={n:0,ft:0,tacho:0,lc:0,lg:0,first:r.fr_date,last:r.fr_date,dest:{}});
    a.n++;a.ft+=(+r.flightTime||0);a.tacho+=(+r.tacho||0);
    if(_frAcType(r.aircraft)==='GA8')a.lg+=(+r.landings||0);else a.lc+=(+r.landings||0);
    if(String(r.fr_date)<String(a.first))a.first=r.fr_date;if(String(r.fr_date)>String(a.last))a.last=r.fr_date;
    var key=(r.from||'?')+'→'+(r.to||'?');var d=a.dest[key]||(a.dest[key]={n:0,ft:0,tacho:0});d.n++;d.ft+=(+r.flightTime||0);d.tacho+=(+r.tacho||0);
  });
  var pilots=Object.keys(byP).map(function(uid){return {uid:uid,nm:pn(uid),a:byP[uid]};}).sort(function(x,y){return x.nm.localeCompare(y.nm);});
  var r1=function(v){return (Math.round(v*10)/10).toFixed(1);};
  var h='<div class="card"><div class="st">Flight statistics <span style="font-weight:400;font-size:11px;color:var(--text3)">— all recorded flights</span></div>';
  if(!recs.length){h+='<div style="color:var(--text3);font-size:13px;padding:8px 2px">No recorded flights yet.</div></div>';return h;}
  h+='<input id="frStatSearch" oninput="window.frStatFilter(this.value)" placeholder="Search pilot…" value="'+_frEsc(S._frStatQ||'')+'" style="width:100%;box-sizing:border-box;height:42px;font-size:15px;padding:0 12px;margin-top:8px;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text)"></div>';
  // Per-pilot summary
  h+='<div class="card" style="padding:0;overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:640px"><thead><tr style="background:var(--card2)">'+
    ['Pilot','Flights','Flight h','Avg/flt','Tacho h (airswitch)','C208B ldg','GA8 ldg'].map(function(t,i){return '<th style="text-align:'+(i?'center':'left')+';padding:7px 8px;font-size:9px;color:var(--text3);font-weight:700;white-space:nowrap">'+t+'</th>';}).join('')+'</tr></thead><tbody>';
  pilots.forEach(function(p){var a=p.a;var sel=S._frStatUid===p.uid;
    h+='<tr class="frStatRow" data-s="'+_frEsc(p.nm.toLowerCase())+'" onclick="window.frStatPilot(\''+_frJs(p.uid)+'\')" style="border-top:1px solid var(--border2);cursor:pointer'+(sel?';background:rgba(124,58,237,.08)':'')+'">'+
      '<td style="padding:6px 8px;font-weight:700">'+(sel?'▾ ':'▸ ')+_frEsc(p.nm)+'</td>'+
      '<td style="padding:6px 8px;text-align:center">'+a.n+'</td>'+
      '<td style="padding:6px 8px;text-align:center;font-weight:700">'+r1(a.ft)+'</td>'+
      '<td style="padding:6px 8px;text-align:center">'+r1(a.ft/a.n)+'</td>'+
      '<td style="padding:6px 8px;text-align:center;color:var(--text2)">'+r1(a.tacho)+'</td>'+
      '<td style="padding:6px 8px;text-align:center">'+a.lc+'</td>'+
      '<td style="padding:6px 8px;text-align:center">'+a.lg+'</td>'+
    '</tr>';
  });
  h+='</tbody></table></div>';
  // Per-destination detail for the selected pilot
  if(S._frStatUid&&byP[S._frStatUid]){
    var a=byP[S._frStatUid];
    var dests=Object.keys(a.dest).map(function(k){return {k:k,d:a.dest[k]};}).sort(function(x,y){return y.d.n-x.d.n;});
    h+='<div class="card" style="padding:0;overflow-x:auto"><div class="st" style="padding:14px 14px 6px">'+_frEsc(pn(S._frStatUid))+' — by route <span style="font-weight:400;font-size:11px;color:var(--text3)">'+a.n+' flights · '+r1(a.ft)+'h total · '+_frEsc(a.first)+' → '+_frEsc(a.last)+'</span></div>'+
      '<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:560px"><thead><tr style="background:var(--card2)">'+
      ['Route','Flights','Total h','Avg flight time','Avg tacho'].map(function(t,i){return '<th style="text-align:'+(i?'center':'left')+';padding:7px 8px;font-size:9px;color:var(--text3);font-weight:700;white-space:nowrap">'+t+'</th>';}).join('')+'</tr></thead><tbody>';
    dests.forEach(function(e){var d=e.d;var parts=e.k.split('→');var rl=_frRouteName(parts[0],parts[1]);
      h+='<tr style="border-top:1px solid var(--border2)">'+
        '<td style="padding:6px 8px;font-weight:700">'+_frEsc(e.k)+(rl?'<span style="display:block;font-size:10px;font-weight:500;color:var(--text3)">'+_frEsc(rl)+'</span>':'')+'</td>'+
        '<td style="padding:6px 8px;text-align:center">'+d.n+'</td>'+
        '<td style="padding:6px 8px;text-align:center">'+r1(d.ft)+'</td>'+
        '<td style="padding:6px 8px;text-align:center;font-weight:700">'+r1(d.ft/d.n)+'</td>'+
        '<td style="padding:6px 8px;text-align:center;color:var(--text2)">'+r1(d.tacho/d.n)+'</td>'+
      '</tr>';
    });
    h+='</tbody></table><div style="font-size:11px;color:var(--text3);padding:8px 12px">Tacho = airswitch (engine) time. Tap the pilot again to collapse.</div></div>';
  } else {
    h+='<div style="font-size:11px;color:var(--text3);padding:2px 4px">Tap a pilot to see their average flight times by route.</div>';
  }
  return h;
}
// Upload one aircraft's day to the maintenance log, then mark its flights submitted.
window.frSubmitAircraft=function(ac){
  var today=S._frRecDate||_frToday();
  var list=[];Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];if(r&&r.fr_date===today&&r.done&&r.aircraft===ac&&(r.endHours!=null||r.off))list.push(r);});
  if(!list.length)return;
  if(typeof confirm==='function'&&!confirm('Confirm '+_frAcShort(ac)+'’s '+list.length+' flight'+(list.length===1?'':'s')+' are correct and upload to the maintenance log?'))return;
  var totLdg=0,totSt=0,maxEnd=null;list.forEach(function(r){totLdg+=(+r.landings||0);totSt+=(+r.starts||0);if(r.endHours!=null&&(maxEnd==null||+r.endHours>maxEnd))maxEnd=+r.endHours;});
  if(typeof window.ensureMaintenance!=='function'||typeof saveMaintenance!=='function'){if(typeof toast==='function')toast('Maintenance not available.','warn');return;}
  // Force a fresh maintenance load so we write onto the FULL log (never a thin/empty default) — and
  // bail if the load didn't bring real data, so we can't push onto an empty blob.
  Promise.resolve(window.ensureMaintenance(true)).then(function(){
    if(!(S.maintenance&&Array.isArray(S.maintenance.hist)&&S.maintenance.hist.length)){if(typeof toast==='function')toast('Couldn’t load the maintenance log — not uploaded. Open Maintenance once, then retry.','warn');return;}
    try{
      var e=S.maintenance.hist.find(function(x){return x.date===today;});
      if(!e){e={date:today};S.maintenance.hist.push(e);S.maintenance.hist.sort(function(a,b){return String(a.date).localeCompare(String(b.date));});}
      if(maxEnd!=null)e[ac]=Math.round(maxEnd*10)/10;     // end-of-day TTIS
      e[ac+'_landings']=totLdg;                            // total landings for the day
      e[ac+'_starts']=totSt;                               // total starts for the day
      saveMaintenance();
    }catch(err){console.error('[fr submit]',err);}
    var who=(S.user&&S.user.name)||'';
    list.forEach(function(r){r.submitted=true;r.submittedBy=who;_frSave(r);});
    // Also push each pilot's flight time + landings (by type) to Flight & Duty for the day.
    var uids={};list.forEach(function(r){if(r.user_id)uids[r.user_id]=1;});
    _frPushToFD(today,Object.keys(uids)).then(function(){
      if(typeof toast==='function')toast(_frAcShort(ac)+' → Maintenance ✓ · Flight & Duty updated','ok');
      render();
    });
  });
};
// Push flight time + landings (split by aircraft type) to each pilot's Flight & Duty row for the day.
// Recomputed from ALL that pilot's flight cards that day (set, not add) so it's idempotent and stays
// correct no matter how many aircraft they flew or how often this runs. Duty start/end the pilot
// entered are preserved (fdSaveRow merges). Loads F&D first so an existing row isn't wiped.
function _frPushToFD(date,uids){
  if(typeof window.fdSaveRow!=='function'||!uids||!uids.length)return Promise.resolve();
  // fdSaveRow does a full-row UPSERT, so we must hold each pilot's existing row before writing or we'd
  // null their duty times. loadFlightDuty (called below) now loads ALL pilots' rows, so the merge is
  // safe for everyone on the aircraft — push them all (so a co-pilot's F&D isn't silently dropped).
  var targets=uids.slice();
  if(!targets.length)return Promise.resolve();
  var doPush=function(){
    targets.forEach(function(uid){
      var ft=0,lc=0,lg=0;
      Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];
        if(!r||r.fr_date!==date||r.user_id!==uid||!r.done)return;
        if(!(r.endHours!=null||r.off))return;                 // real flights only
        ft+=(+r.flightTime||0);
        if(_frAcType(r.aircraft)==='GA8')lg+=(+r.landings||0); else lc+=(+r.landings||0);
      });
      window.fdSaveRow(uid,date,{ft:Math.round(ft*10)/10,lc:lc,lg:lg});
    });
  };
  // Always re-load F&D first so we hold each target's latest row (duty times survive the merge,
  // and we don't race a row another device just created).
  if(typeof window.loadFlightDuty==='function')return Promise.resolve(window.loadFlightDuty()).then(doPush);
  doPush();return Promise.resolve();
}
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
  if(S._frDelConfirm===r.id){
    // in-app confirm screen for delete
    h+='<div style="margin-top:14px;padding:16px;border-radius:14px;border:2px solid #ef4444;background:rgba(239,68,68,.08)">'+
      '<div style="font-size:15px;font-weight:800;color:#ef4444;margin-bottom:4px">Delete this flight?</div>'+
      '<div style="font-size:13px;color:var(--text2);margin-bottom:14px">'+_frEsc(_frAcShort(r.aircraft))+(r.product?' · '+_frEsc(r.product):'')+(r.off?' · off '+_frEsc(r.off):'')+(r.flightTime!=null?' · '+r.flightTime.toFixed(1)+'h':'')+'. This cannot be undone.</div>'+
      '<div style="display:flex;gap:8px">'+
        '<button onclick="window.frEditDeleteCancel()" style="flex:1;min-height:52px;border-radius:12px;border:2px solid var(--border2);background:var(--card);color:var(--text1);font-size:16px;font-weight:700;cursor:pointer">Cancel</button>'+
        '<button onclick="window.frEditDeleteConfirm(\''+r.id+'\')" style="flex:1;min-height:52px;border-radius:12px;border:none;background:#ef4444;color:#fff;font-size:16px;font-weight:800;cursor:pointer">🗑 Yes, delete</button>'+
      '</div></div>';
  } else {
    h+='<div style="display:flex;gap:8px;margin-top:14px"><button onclick="window.frEditDone(\''+r.id+'\')" style="flex:1;min-height:56px;border-radius:14px;border:none;background:#16a34a;color:#fff;font-size:18px;font-weight:800;cursor:pointer">✓ Save changes</button>'+
      '<button onclick="window.frEditDelete(\''+r.id+'\')" style="padding:0 18px;min-height:56px;border-radius:14px;border:1px solid #ef444455;background:rgba(239,68,68,.08);color:#ef4444;font-size:14px;font-weight:700;cursor:pointer">🗑 Delete flight</button></div>';
    h+='<div style="font-size:11px;color:var(--text3);margin-top:6px">'+(r.submitted?'This day was already uploaded — changing or deleting it here will not re-write Maintenance; adjust there if needed.':'Changes here flow through when you upload the aircraft to Maintenance.')+'</div>';
  }
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
        '<span style="font-size:17px;font-weight:800;color:'+(fy?'#f59e0b':_frAcCol(f.ac))+'">'+_frEsc(_frAcShort(f.ac))+'</span>'+
        '<span style="font-size:15px;font-weight:700">'+_frEsc((f.from||'')+(f.to?'→'+f.to:''))+(_frRouteName(f.from,f.to)?'<span style="display:block;font-size:10px;font-weight:600;color:var(--text3)">'+_frEsc(_frRouteName(f.from,f.to))+'</span>':'')+'</span>'+
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
  _frAcList().forEach(function(ac){h+=_frBigBtn(_frAcShort(ac),d.ac===ac,"window.frUseFlight('"+_frJs(ac)+"','"+_frJs(d.product||'')+"','"+_frJs(d.from||'')+"','"+_frJs(d.to||'')+"',"+(+d.pob||1)+","+(manual?'true':'false')+")",_frAcHours(ac)!=null?(+_frAcHours(ac)).toFixed(1)+'h':'',_frAcCol(ac));});
  h+='</div>';
  // Product
  h+='<div style="font-size:11px;color:var(--text3);font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:6px 0 6px">Flight type</div>';
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-bottom:14px">';
  var _prods=_frProducts();
  _prods.forEach(function(pr){h+=_frBigBtn(_frEsc(pr),d.product===pr,"window.frDraftSet('product','"+_frJs(pr)+"')");});
  var _customType=d.product&&_prods.indexOf(d.product)<0;   // a typed-in type that isn't a preset
  h+=_frBigBtn(_customType?_frEsc(d.product):'Other…',_customType,"window.frTypePickOpen()");
  h+='</div>';
  // Route (from → to) quick picks
  var locs=FR_LOCS_DEFAULT;
  h+='<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px">';
  ['from','to'].forEach(function(side){
    h+='<div style="flex:1 1 200px"><div style="font-size:11px;color:var(--text3);font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px">'+(side==='from'?'From':'To')+'</div><div style="display:flex;gap:6px;flex-wrap:wrap">';
    locs.forEach(function(l){h+='<button onclick="window.frDraftSet(\''+side+'\',\''+l+'\')" style="min-height:48px;min-width:56px;border-radius:11px;border:2px solid var(--border2);background:var(--card);color:var(--text1);font-size:15px;font-weight:800;cursor:pointer'+(d[side]===l?';border-color:#7c3aed;background:rgba(124,58,237,.14);color:#a78bfa':'')+'">'+l+'</button>';});
    var _other=d[side]&&locs.indexOf(d[side])<0; // a destination not in the quick-picks is selected
    h+='<button onclick="window.frLocPickOpen(\''+side+'\')" title="Search all aerodromes" style="min-height:48px;min-width:64px;border-radius:11px;border:2px solid '+(_other?'#7c3aed':'var(--border2)')+';background:'+(_other?'rgba(124,58,237,.14)':'var(--card)')+';color:'+(_other?'#a78bfa':'var(--text2)')+';font-size:'+(_other?'15px;font-weight:800':'13px;font-weight:700')+';cursor:pointer">'+(_other?_frEsc(d[side]):'Other…')+'</button>';
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
// ── Searchable aerodrome picker for "Other" From/To ──
function _frLocOverlay(){
  if(!S._frLocPick)return '';
  var side=S._frLocPick.side;
  var list=(typeof NZ_AERODROMES!=='undefined')?NZ_AERODROMES.slice():[];
  try{var cust=(typeof _getCustomAerodromes==='function')?_getCustomAerodromes():[];if(Array.isArray(cust))list=list.concat(cust);}catch(e){}
  list.sort(function(a,b){return String(a.name||'').localeCompare(String(b.name||''));});
  var items=list.map(function(a){var code=_frAeroCode(a.icao||'');var s=_frEsc(((a.name||'')+' '+(a.icao||'')+' '+code).toLowerCase());
    return '<button class="frLocItem" data-s="'+s+'" onclick="window.frLocPick(\''+_frJs(code)+'\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;border-bottom:1px solid var(--border2);background:var(--card);color:var(--text1);font-size:14px;cursor:pointer"><b style="color:#7c3aed;min-width:34px;display:inline-block">'+_frEsc(code)+'</b> '+_frEsc(a.name||'')+' <span style="color:var(--text3);font-size:11px">('+_frEsc(a.icao||'')+')</span></button>';
  }).join('');
  return '<div onclick="if(event.target===this)window.frLocPickClose()" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px">'+
    '<div style="background:var(--card);border-radius:14px;max-width:460px;width:100%;max-height:84vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.45)">'+
      '<div style="padding:14px 14px 10px;border-bottom:1px solid var(--border2);flex-shrink:0">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-size:15px;font-weight:800">Choose '+(side==='from'?'departure':'destination')+'</div><button onclick="window.frLocPickClose()" style="background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer">✕</button></div>'+
        '<input id="frLocSearch" autofocus oninput="window.frLocFilter(this.value)" onkeydown="if(event.key===\'Enter\')window.frLocUseTyped(this.value)" placeholder="Type a 2-letter code or airport name…" style="width:100%;box-sizing:border-box;height:46px;font-size:16px;padding:0 12px;border:2px solid var(--border2);border-radius:10px;background:var(--card2);color:var(--text)">'+
        '<div style="font-size:11px;color:var(--text3);margin-top:6px">Type a designator (e.g. WN) and press Enter, or pick from the list.</div>'+
      '</div>'+
      '<div id="frLocList" style="overflow-y:auto">'+items+'</div>'+
    '</div></div>';
}
window.frLocPickOpen=function(side){S._frLocPick={side:side};render();setTimeout(function(){var el=document.getElementById('frLocSearch');if(el)el.focus();},60);};
window.frLocPickClose=function(){S._frLocPick=null;render();};
window.frLocFilter=function(q){q=String(q||'').toLowerCase();var els=document.querySelectorAll('.frLocItem');for(var i=0;i<els.length;i++){els[i].style.display=(els[i].getAttribute('data-s')||'').indexOf(q)>=0?'':'none';}};
window.frLocPick=function(code){var side=S._frLocPick&&S._frLocPick.side;S._frLocPick=null;if(side&&code)window.frDraftSet(side,code);else render();};
window.frLocUseTyped=function(v){v=String(v||'').trim().toUpperCase();var side=S._frLocPick&&S._frLocPick.side;if(!side){return;}S._frLocPick=null;if(v)window.frDraftSet(side,v);else render();};
// ── "Other" flight type — popup to type a custom type ──
function _frTypeOverlay(){
  if(!S._frTypePick)return '';
  var cur=(S._frDraft&&S._frDraft.product)||'';
  if(_frProducts().indexOf(cur)>=0)cur=''; // don't prefill a preset
  return '<div onclick="if(event.target===this)window.frTypePickClose()" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:12vh 16px">'+
    '<div style="background:var(--card);border-radius:14px;max-width:420px;width:100%;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.45)">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-size:15px;font-weight:800">Other flight type</div><button onclick="window.frTypePickClose()" style="background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer">✕</button></div>'+
      '<input id="frTypeInput" autofocus value="'+_frEsc(cur)+'" onkeydown="if(event.key===\'Enter\')window.frTypeUse(this.value)" placeholder="e.g. Survey, Charter, Test…" style="width:100%;box-sizing:border-box;height:48px;font-size:16px;font-weight:700;padding:0 12px;border:2px solid var(--border2);border-radius:10px;background:var(--card2);color:var(--text)">'+
      '<button onclick="window.frTypeUse(document.getElementById(\'frTypeInput\').value)" style="width:100%;margin-top:12px;min-height:52px;border-radius:12px;border:none;background:#16a34a;color:#fff;font-size:16px;font-weight:800;cursor:pointer">✓ Use this type</button>'+
    '</div></div>';
}
window.frTypePickOpen=function(){S._frTypePick=true;render();setTimeout(function(){var el=document.getElementById('frTypeInput');if(el){el.focus();try{el.select();}catch(e){}}},60);};
window.frTypePickClose=function(){S._frTypePick=false;render();};
window.frTypeUse=function(v){v=String(v||'').trim();S._frTypePick=false;if(v)window.frDraftSet('product',v);else render();};

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

// ── LOGBOOKS ─────────────────────────────────────────────────────────────────────
// Each pilot's personal logbook, auto-built from their flight records. Solid table; tap a
// row to expand and adjust. Columns: Month · Day · Type · Registration · PIC · Co-Pilot · Details · Flight time.
function _frUserName(id){var u=(S.users||[]).find(function(x){return x.id===id;});return u?(u.name||''):'';}
function _frPicName(r){return r.picName||_frUserName(r.user_id)||'';}
function _frDetails(r){return r.details||((r.from||'')+(r.to?'-'+r.to:''))||(r.product||'');}
function renderLogbook(){
  if(!S._frLoaded){S._frLoaded=true;if(window.loadFlightRecords)window.loadFlightRecords();}
  if(!S.user)return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Sign in to view your logbook.</div>';
  var mgr=(typeof hasRolePerm==='function'&&hasRolePerm('flightrecord_manage'))||(S.user&&S.user.superAdmin);
  var viewUid=(mgr&&S._lbUid)||(S.user&&S.user.id)||'';
  var h='';
  // pilot selector for managers
  if(mgr){
    var pilots={};Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];if(r)pilots[r.user_id]=1;});pilots[S.user.id]=1;
    h+='<div class="card" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:12px;color:var(--text3);font-weight:700">Logbook for</span>';
    Object.keys(pilots).forEach(function(uid){var nm=_frUserName(uid)||'?';var on=uid===viewUid;h+='<button onclick="S._lbUid=\''+_frJs(uid)+'\';S._lbEditId=null;render()" style="padding:6px 12px;border-radius:8px;border:2px solid '+(on?'#7c3aed':'var(--border2)')+';background:'+(on?'rgba(124,58,237,.14)':'transparent')+';color:'+(on?'#a78bfa':'var(--text2)')+';font-size:12px;font-weight:700;cursor:pointer">'+_frEsc(nm.split(' ')[0]||nm)+'</button>';});
    h+='</div>';
  }
  // gather this pilot's logged flights
  var rows=[];Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];if(r&&r.user_id===viewUid&&(r.done||r.manual))rows.push(r);});
  rows.sort(function(a,b){return a.fr_date===b.fr_date?(_frMins(b.off)-_frMins(a.off)):String(b.fr_date).localeCompare(String(a.fr_date));});
  var total=rows.reduce(function(s,r){return s+(+r.flightTime||0);},0);
  var ttC=rows.filter(function(r){return _frAcType(r.aircraft)==='C208B';}).reduce(function(s,r){return s+(+r.flightTime||0);},0);
  var ttG=rows.filter(function(r){return _frAcType(r.aircraft)==='GA8';}).reduce(function(s,r){return s+(+r.flightTime||0);},0);
  var _vn=_frUserName(viewUid);var _title=_vn?(_frEsc(_vn)+(/[sS]$/.test(_vn)?'’':'’s')+' logbook'):'My logbook';
  h+='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><div><div style="font-size:17px;font-weight:800">'+_title+'</div>'+
    '<div style="font-size:12px;color:var(--text3);margin-top:2px">'+rows.length+' flights · total '+total.toFixed(1)+'h <span style="color:var(--text2)">(C208B '+ttC.toFixed(1)+'h · GA8 '+ttG.toFixed(1)+'h)</span></div></div>'+
    '<button onclick="window.frLbAdd()" style="padding:9px 16px;border-radius:10px;border:1px dashed var(--border2);background:transparent;color:var(--text2);font-size:13px;font-weight:700;cursor:pointer">+ Add entry</button></div></div>';
  if(S._lbEditId&&(S._frData||{})[S._lbEditId]&&S._frData[S._lbEditId].user_id===viewUid)h+=_lbRenderEdit(S._frData[S._lbEditId]);
  if(!rows.length){h+='<div class="card" style="color:var(--text3);padding:24px;font-size:13px">No flights logged yet. They appear here automatically when you record a flight, or add one manually.</div>';return h;}
  h+='<div class="card" style="padding:0;overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:720px"><thead><tr style="background:var(--card2)">'+
    ['Month','Day','Type','Reg','PIC','Co-Pilot','Details','Flt h'].map(function(t,i){return '<th style="text-align:'+(i>=7?'right':'left')+';padding:8px;font-size:9px;color:var(--text3);font-weight:700;white-space:nowrap">'+t+'</th>';}).join('')+'</tr></thead><tbody>';
  var lastMonth='';
  rows.forEach(function(r){
    var dt=new Date(r.fr_date+'T00:00:00');
    var mon=dt.toLocaleDateString('en-NZ',{month:'short',year:'2-digit'});
    var day=dt.getDate();
    var col=_frAcCol(r.aircraft);
    var newMonth=mon!==lastMonth;lastMonth=mon;
    h+='<tr onclick="window.frLbEdit(\''+r.id+'\')" style="border-top:1px solid var(--border2);cursor:pointer'+(S._lbEditId===r.id?';background:rgba(124,58,237,.06)':'')+'">'+
      '<td style="padding:6px 8px;font-weight:700;color:'+(newMonth?'var(--text1)':'var(--text3)')+'">'+(newMonth?_frEsc(mon):'')+'</td>'+
      '<td style="padding:6px 8px;text-align:center;font-weight:700">'+day+'</td>'+
      '<td style="padding:6px 8px;color:var(--text2)">'+_frEsc(_frAcType(r.aircraft))+'</td>'+
      '<td style="padding:6px 8px;font-weight:800;color:'+col+'">'+_frEsc(_frAcShort(r.aircraft))+'</td>'+
      '<td style="padding:6px 8px">'+_frEsc(_frPicName(r))+'</td>'+
      '<td style="padding:6px 8px;color:var(--text2)">'+_frEsc(r.copilot||'')+'</td>'+
      '<td style="padding:6px 8px;color:var(--text2)">'+_frEsc(_frDetails(r))+'</td>'+
      '<td style="padding:6px 8px;text-align:right;font-weight:800">'+(r.flightTime!=null?(+r.flightTime).toFixed(1):'—')+'</td>'+
    '</tr>';
  });
  h+='<tr style="border-top:2px solid var(--border2);background:var(--card2)"><td colspan="7" style="padding:8px;text-align:right;font-weight:700;color:var(--text2)">Total</td><td style="padding:8px;text-align:right;font-weight:800">'+total.toFixed(1)+'h</td></tr>';
  h+='</tbody></table></div>';
  h+='<div style="font-size:11px;color:var(--text3);padding:2px 4px 10px">Tap any row to adjust it.</div>';
  return h;
}
function _lbRenderEdit(r){
  var h='<div class="card" style="border-left:4px solid '+_frAcCol(r.aircraft)+'">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-size:16px;font-weight:800">Logbook entry</div><button onclick="window.frLbEditCancel()" style="background:none;border:none;color:var(--text3);font-size:13px;cursor:pointer">✕ Close</button></div>';
  // registration buttons (aircraft colours)
  h+='<div style="font-size:10px;color:var(--text3);font-weight:700;margin-bottom:4px">REGISTRATION</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">';
  _frAcList().forEach(function(ac){var c=_frAcCol(ac);var on=r.aircraft===ac;h+='<button onclick="window.frLbField(\''+r.id+'\',\'aircraft\',\''+_frJs(ac)+'\')" style="padding:7px 12px;border-radius:9px;border:2px solid '+(on?c:c+'66')+';background:'+(on?c+'22':'transparent')+';color:'+c+';font-size:13px;font-weight:800;cursor:pointer">'+_frEsc(_frAcShort(ac))+'</button>';});
  h+='</div>';
  function fld(lbl,field,val,type,w){return '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">'+lbl+'</label><input type="'+(type||'text')+'"'+(type==='number'?' step="0.1"':'')+' value="'+_frEsc(val==null?'':val)+'" onchange="window.frLbField(\''+r.id+'\',\''+field+'\',this.value)" style="width:'+(w||130)+'px;height:46px;font-size:15px;font-weight:700;text-align:center;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text)"></div>';}
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">'+
    fld('Date','fr_date',r.fr_date,'date',160)+
    fld('PIC','picName',_frPicName(r),'text',150)+
    fld('Co-Pilot','copilot',r.copilot,'text',150)+
    fld('Flight time (h)','flightTime',r.flightTime,'number',120)+
  '</div>';
  h+='<div style="margin-top:10px"><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Details of flight (e.g. QN-MF-QN x4)</label><input type="text" value="'+_frEsc(_frDetails(r))+'" onchange="window.frLbField(\''+r.id+'\',\'details\',this.value)" style="width:100%;box-sizing:border-box;height:46px;font-size:15px;font-weight:700;padding:0 12px;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text)"></div>';
  h+='<div style="display:flex;gap:8px;margin-top:14px"><button onclick="window.frLbEditCancel()" style="flex:1;min-height:52px;border-radius:14px;border:none;background:#16a34a;color:#fff;font-size:17px;font-weight:800;cursor:pointer">✓ Done</button>';
  if(r.manual)h+='<button onclick="window.frLbDelete(\''+r.id+'\')" style="padding:0 18px;min-height:52px;border-radius:14px;border:1px solid #ef444455;background:transparent;color:#ef4444;font-size:14px;font-weight:700;cursor:pointer">Delete</button>';
  h+='</div><div style="font-size:11px;color:var(--text3);margin-top:6px">Type is set from the registration. Editing flight time here does not change the maintenance TTIS.</div>';
  h+='</div>';
  return h;
}
window.frLbEdit=function(id){S._lbEditId=(S._lbEditId===id?null:id);render();};
window.frLbEditCancel=function(){S._lbEditId=null;render();};
window.frLbField=function(id,field,val){var r=(S._frData||{})[id];if(!r)return;
  if(field==='fr_date'){if(!val)return;r.fr_date=val;}
  else if(field==='flightTime')r.flightTime=(val===''?null:Math.round((+val)*10)/10);
  else if(field==='aircraft'){r.aircraft=val;r.type=_frAcType(val);}
  else r[field]=val; // fr_date, picName, copilot, details
  _frSave(r);if(typeof safeRender==='function')safeRender();};
window.frLbAdd=function(){var uid=((typeof hasRolePerm==='function'&&hasRolePerm('flightrecord_manage')||(S.user&&S.user.superAdmin))&&S._lbUid)||(S.user&&S.user.id)||'';var ac=_frAcList()[0]||'';var rec={id:_frNewId(),user_id:uid,fr_date:_frToday(),aircraft:ac,type:_frAcType(ac),product:'',from:'',to:'',pob:1,off:'',on:'',startHours:null,endHours:null,flightTime:null,tacho:null,landings:1,starts:1,picName:'',copilot:'',details:'',manual:true,note:'',done:true,submitted:false,at:new Date().toISOString()};_frSave(rec);S._lbEditId=rec.id;render();};
window.frLbDelete=function(id){var r=(S._frData||{})[id];if(!r||!r.manual)return;if(typeof confirm==='function'&&!confirm('Delete this manual logbook entry?'))return;delete S._frData[id];try{lsSet&&lsSet('ts_flight_records_cache',S._frData);}catch(e){}if(typeof sbDel==='function')sbDel('ts_flight_records',id);else if(typeof SB!=='undefined')fetch(SB+'/rest/v1/ts_flight_records?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:SH}).catch(function(){});S._lbEditId=null;render();};
