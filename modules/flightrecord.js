// ─────────────────────────────────────────────────────────────────────────────
//  DAILY FLIGHT RECORD  (v24.86)
//  A big, tap-once flight log built for iPad in the cockpit. Off-blocks → on-blocks,
//  airframe hours (TTIS) confirm, product/route/POB. Auto-detects the flight you're about to
//  do from the calendar (by current time), with a today's-flights picker and a manual tab.
//  v1 = record only (persists to ts_flight_records). It will later feed Flight & Duty and update
//  the aircraft hours in Maintenance. Gated by the `flightrecord` permission (superadmin in dev).
//  NOTE: persistence needs the ts_flight_records table — see flight_record.sql.
// ─────────────────────────────────────────────────────────────────────────────

var FR_PRODUCTS_DEFAULT=['FCF','FLB','MFOH','THH','FJHH','MCHS','STT','CHT','Ferry','Maintenance','Training','Private Hire'];
var FR_LOCS_DEFAULT=['QN','MF','MC','FJ','WF'];

function _frToday(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _frNowHM(){var d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function _frMins(t){var m=/(\d{1,2}):(\d{2})/.exec(String(t||''));return m?(+m[1])*60+(+m[2]):null;}
function _frProducts(){var o=S._frSettings&&Array.isArray(S._frSettings.products)?S._frSettings.products:null;var list=((o&&o.length)?o:FR_PRODUCTS_DEFAULT).slice();if(list.indexOf('FLB')<0)list.splice(Math.min(1,list.length),0,'FLB');if(list.indexOf('CHT')<0){var fi=list.indexOf('Ferry');if(fi>=0)list.splice(fi,0,'CHT');else list.push('CHT');}return list;}
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
// Start TTIS for the NEXT flight card on an aircraft = the latest SHUTDOWN (endHours) already recorded
// for that aircraft on the date, so successive flights through the day chain on from each other (the
// maintenance number is only updated at end of day). Falls back to the maintenance latest (airswitch)
// for the day's FIRST flight, when no flight has shut down yet.
function _frNextStartHours(ac,date){
  if(!ac)return _frAcHours(ac);
  date=date||_frToday();
  // Look at the most recent airswitch reading available from ANY source — in-memory state AND the local
  // cache (which holds offline-written records a cloud reload might not have yet) — and chain from the
  // last SHUTDOWN (or an open flight's start if nothing has shut down). Never regress below the
  // maintenance/airswitch latest, so a device that briefly went offline can't reset the next start low.
  var lastEnd=null,lastStart=null;
  function scan(store){if(!store)return;Object.keys(store).forEach(function(id){var r=store[id];if(!r||r.aircraft!==ac||r.fr_date!==date)return;
    if(r.endHours!=null&&r.endHours!==''){var e=+r.endHours;if(isFinite(e)&&(lastEnd==null||e>lastEnd))lastEnd=e;}
    if(r.startHours!=null&&r.startHours!==''){var s=+r.startHours;if(isFinite(s)&&(lastStart==null||s>lastStart))lastStart=s;}
  });}
  scan(S._frData);
  try{if(typeof lsGet==='function'){var c=lsGet('ts_flight_records_cache');if(c&&typeof c==='object'&&c!==S._frData)scan(c);}}catch(e){}
  var base=(lastEnd!=null)?lastEnd:lastStart;
  var m=_frAcHours(ac);
  if(base==null)return m;
  return (m!=null&&isFinite(+m)&&+m>base)?+m:base;
}
// Co-pilot set on the CALENDAR for this aircraft today (the first of its departures that has one), so a
// flight card / logbook row auto-records the second crew. Returns the pilot CODE (e.g. "MS") or ''.
function _frCoPilotForAc(ac){
  if(!ac||typeof _rzSchedCoPilotFor!=='function')return '';
  try{
    var flights=(typeof _schedDayFlights==='function')?(_schedDayFlights(S.rezdyDate)||[]):[];
    for(var i=0;i<flights.length;i++){if(flights[i].ac===ac){var hhmm=(typeof _rzMinToHHMM==='function')?_rzMinToHHMM(flights[i].depMin):'';var co=_rzSchedCoPilotFor(ac,hhmm);if(co)return co;}}
  }catch(e){}
  return '';
}
// Resolve a pilot code to a display name (falls back to the code).
function _frPilotName(code){if(!code)return '';try{if(typeof _rzPilotByCode==='function'){var p=_rzPilotByCode(code);if(p&&p.name)return p.name;}}catch(e){}return String(code);}
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
  if(typeof _sbFetch!=='function'){if(typeof render==='function')render();return;}
  try{
    // Pull ALL records (not just this pilot) so the per-aircraft Today's Record shows every PIC's
    // flights. MUST paginate: PostgREST caps a plain select at 1000 rows, and with the legacy import
    // there are 15k+ records — without paging, whole months/pilots silently vanish (the "gap" bug).
    var rows=[],_pg=0,_PAGE=1000;
    while(_pg<60){
      var _rr=await _sbFetch(SB+'/rest/v1/ts_flight_records?select=*&order=updated_at.desc&limit='+_PAGE+'&offset='+(_pg*_PAGE),{headers:{...SH}});
      if(!_rr.ok){if(_pg===0)rows=null;break;}
      var _arr=await _rr.json();
      if(!Array.isArray(_arr)){if(_pg===0)rows=null;break;}
      rows=rows.concat(_arr);
      if(_arr.length<_PAGE)break;
      _pg++;
    }
    if(Array.isArray(rows)){var d={};rows.forEach(function(r){d[r.id]={id:r.id,user_id:r.user_id,fr_date:r.fr_date,aircraft:r.aircraft||'',type:r.actype||'',product:r.product||'',from:r.route_from||'',to:r.route_to||'',pob:r.pob||0,off:r.off_blocks||'',on:r.on_blocks||'',startHours:r.start_hours,endHours:r.end_hours,flightTime:r.flight_time,tacho:r.tacho,landings:r.landings||1,starts:r.starts!=null?r.starts:1,picName:r.pic_name||'',copilot:r.copilot||'',details:r.details||'',manual:!!r.manual,note:r.note||'',done:!!r.done,submitted:!!r.submitted,submittedBy:r.submitted_by||'',at:r.updated_at||'',by:r.updated_by||''};});
      // MERGE, don't clobber: keep any LOCAL record the cloud is missing or that's newer than the cloud
      // copy (e.g. a shutdown written OFFLINE and not yet synced). Replacing outright dropped that record,
      // which reset the next flight's start TTIS to the maintenance number — the airswitch bug. (v27.66)
      var _local=S._frData||{},_merged=d;
      Object.keys(_local).forEach(function(id){var lr=_local[id],cr=d[id];if(!lr)return;if(!cr){_merged[id]=lr;}else if((lr.at||'')>(cr.at||'')){_merged[id]=lr;}});
      S._frData=_merged;try{lsSet&&lsSet('ts_flight_records_cache',_merged);}catch(e){}}
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
  // Build the day's PASSENGER legs per departure: an OUTBOUND (QN→dest) at the start and a RETURN
  // (dest→QN, same product) at the end of the block. Then walk them in time order tracking each
  // aircraft's position, inserting an empty FERRY whenever the aircraft isn't already at the next
  // leg's departure point. This reproduces the operator's calendar model exactly: a single
  // go-and-come-back needs no ferry; overlapping / disconnected loads get a reposition leg (e.g.
  // MF→QN to start the next load, or QN→MF to fetch the afternoon return). Pilot edits as needed.
  var legs=[];
  ins.forEach(function(f){
    var durMin=(typeof _rzProductDuration==='function')?_rzProductDuration(f.prod):0;durMin=durMin||90;
    var ot=_frMins(f.start);
    legs.push({ac:f.ac,t:ot,start:f.start,prod:f.prod,pob:f.pob,from:'QN',to:(f.to||'MF')});                                  // outbound
    legs.push({ac:f.ac,t:ot+durMin,start:_frHHMM(ot+durMin),prod:f.prod,pob:f.pob,from:(f.to||'MF'),to:'QN',ret:true,hint:'return'}); // return
  });
  legs.sort(function(a,b){return a.t-b.t;});
  var out=[];var posByAc={};
  legs.forEach(function(lg){
    var pos=posByAc[lg.ac]||'QN';                      // each aircraft starts the day at base (QN)
    if(pos!==lg.from){                                  // not where the next leg departs → reposition empty
      // The end-of-day "fetch" pattern (sitting at base, but the next leg is a RETURN out of MF) has
      // typical times: ferry out ~14:30, return home ~15:40. Other repositions: ~50 min before the leg.
      var fetch=(pos==='QN'&&lg.ret);
      out.push({ac:lg.ac,start:fetch?'14:30':_frHHMM(Math.max(0,lg.t-50)),prod:'Ferry',pob:1,from:pos,to:lg.from,ferry:true,
        hint:fetch?'reposition empty to collect the return':'reposition empty for '+lg.start+' '+lg.prod});
      if(fetch)lg=Object.assign({},lg,{start:'15:40'});   // typical afternoon return-home time
    }
    out.push(lg);
    posByAc[lg.ac]=lg.to;
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
  // Keep an already-entered start TTIS when re-selecting the SAME aircraft; otherwise chain from the
  // aircraft's last shutdown today (so flight 2+ start where flight 1 finished), falling back to the
  // maintenance latest for the day's first flight.
  var hrs=(prev.ac===ac&&prev.startHours!=null&&prev.startHours!=='')?prev.startHours:_frNextStartHours(ac);
  // Co-pilot auto-fills from the calendar (kept if the same aircraft is re-selected so an edit survives).
  var co=(prev.ac===ac&&prev.copilot!=null)?prev.copilot:_frCoPilotForAc(ac);
  var nt=(prev.ac===ac&&prev.note!=null)?prev.note:'';
  S._frDraft={ac:ac||'',product:prod||'',from:from||'',to:to||'',pob:(pob!=null?+pob:1),startHours:(hrs!=null?hrs:''),copilot:co||'',note:nt||'',manual:!!manual};
  render();
};
window.frDraftSet=function(field,value){S._frDraft=S._frDraft||{};S._frDraft[field]=(field==='pob')?Math.max(0,Math.round(+value)||0):value;render();};
window.frDraftPob=function(delta){S._frDraft=S._frDraft||{};var v=(+S._frDraft.pob||0)+delta;if(v<0)v=0;S._frDraft.pob=v;render();};
window.frDraftHours=function(delta){S._frDraft=S._frDraft||{};var v=(parseFloat(S._frDraft.startHours)||0)+delta;v=Math.round(v*10)/10;if(v<0)v=0;S._frDraft.startHours=v;render();};
window.frOffBlocks=function(){
  var d=S._frDraft||{};
  if(!d.ac){if(typeof toast==='function')toast('Pick an aircraft first.','warn');return;}
  if(d.startHours===''||d.startHours==null){if(typeof toast==='function')toast('Confirm the aircraft hours first.','warn');return;}
  var rec={id:_frNewId(),user_id:(S.user&&S.user.id)||'',fr_date:_frToday(),aircraft:d.ac,type:_frAcType(d.ac),product:d.product||'',from:d.from||'',to:d.to||'',pob:+d.pob||0,off:_frNowHM(),on:'',startHours:Math.round((+d.startHours)*10)/10,endHours:null,flightTime:null,tacho:null,landings:1,starts:1,copilot:d.copilot||'',manual:!!d.manual,note:d.note||'',done:false,submitted:false,at:new Date().toISOString()};
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
  else if(field==='startHours'||field==='endHours'||field==='flightTime')r[field]=(val===''?null:Math.round((+val)*10)/10);
  else if(field==='off'||field==='on')r[field]=_frFmtTime(val);   // "2334" → "23:34"
  else if(field==='aircraft'){r.aircraft=val;r.type=_frAcType(val);if((S._frPage||'log')==='record'&&val)S._frRecAc=val;}   // manual flights can pick the airframe (keeps type + view in sync)
  else if(field==='fr_date'){r.fr_date=val;if((S._frPage||'log')==='record'&&val)S._frRecDate=val;}                       // keep the records view on this flight's date
  else r[field]=val;   // from / to / product / note / user_id (PIC)
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
// Manually add a completed flight (a pilot forgot to log it, or it was flown on paper). Creates a
// done record for the date/aircraft currently in view, default PIC = you, and opens it for editing —
// set the PIC, date, times, TTIS, landings etc., then Save. It still uploads to Maintenance / Flight
// & Duty when the aircraft is submitted, like any other flight.
window.frAddManual=function(){
  var date=S._frRecDate||_frToday();
  var ac=S._frRecAc||_frAcList()[0]||'';
  var hrs=_frNextStartHours(ac,date);
  var rec={id:_frNewId(),user_id:(S.user&&S.user.id)||'',fr_date:date,aircraft:ac,type:_frAcType(ac),product:'',from:'QN',to:'',pob:1,off:'',on:'',startHours:(hrs!=null?hrs:''),endHours:null,flightTime:null,tacho:null,landings:1,starts:1,copilot:_frCoPilotForAc(ac)||'',manual:true,note:'',done:true,submitted:false,at:new Date().toISOString()};
  _frSave(rec);S._frEditId=rec.id;S._frDelConfirm=null;S._frPage='record';
  if(typeof toast==='function')toast('New manual flight — fill in PIC, times & TTIS, then Save','ok');
  render();
};

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
  var _canBrowse=(S.user&&S.user.superAdmin)||(typeof hasRolePerm==='function'&&hasRolePerm('flightrecord_manage'));
  if(_canBrowse)_tabs.push({lbl:'Records',on:page==='browse',onclick:"S._frPage='browse';render()"});
  var h=(typeof _tier2==='function')?_tier2(_tabs):'';
  if(page==='browse'&&_canBrowse){ h+=_frRenderBrowse(); return h; }
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
  var addBtn='<div style="margin-bottom:10px"><button onclick="window.frAddManual()" style="width:100%;min-height:48px;border-radius:12px;border:2px dashed rgba(124,58,237,.5);background:rgba(124,58,237,.06);color:#a78bfa;font-size:15px;font-weight:800;cursor:pointer">＋ Add a flight</button>'+
    '<div style="font-size:11px;color:var(--text3);text-align:center;margin-top:4px">Set the PIC, date, times &amp; TTIS, then Save. It only updates Maintenance &amp; Flight &amp; Duty when you submit the aircraft.</div></div>';
  var h=nav+sel+addBtn;
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
    var cols=['PIC','Co-pilot','Type','Route','POB','Off','On','Flt h','Tacho','TTIS st','TTIS end','Ldg'].concat(isC208?['Starts']:[]).concat(['Notes']);
    h+='<table style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:'+(isC208?880:820)+'px"><thead><tr style="background:var(--card2)">'+cols.map(function(t,i){return '<th style="text-align:'+(i<4?'left':'center')+';padding:6px 7px;font-size:9px;color:var(--text3);font-weight:700;white-space:nowrap">'+t+'</th>';}).join('')+'</tr></thead><tbody>';
    list.forEach(function(r){
      h+='<tr onclick="window.frEdit(\''+r.id+'\')" style="border-top:1px solid var(--border2);cursor:pointer">'+
        '<td style="padding:5px 7px;font-weight:700">'+_frEsc(pname(r.user_id))+'</td>'+
        '<td style="padding:5px 7px;color:var(--text2)">'+_frEsc(r.copilot?_frPilotName(r.copilot):'')+'</td>'+
        '<td style="padding:5px 7px;color:var(--text2)">'+_frEsc(r.product||'')+(r.product==='Ferry'?'':'')+'</td>'+
        '<td style="padding:5px 7px;color:var(--text2)">'+_frEsc((r.from||'')+(r.to?'→'+r.to:''))+'</td>'+
        '<td style="padding:5px 7px;text-align:center;font-weight:700">'+(r.pob!=null&&r.pob!==''?r.pob:'')+'</td>'+
        '<td style="padding:5px 7px;text-align:center">'+_frEsc(r.off||'')+'</td>'+
        '<td style="padding:5px 7px;text-align:center">'+_frEsc(r.on||'')+'</td>'+
        '<td style="padding:5px 7px;text-align:center;font-weight:700">'+(r.flightTime!=null?r.flightTime.toFixed(1):'')+'</td>'+
        '<td style="padding:5px 7px;text-align:center">'+(r.tacho!=null?r.tacho.toFixed(1):'')+'</td>'+
        '<td style="padding:5px 7px;text-align:center;color:var(--text2)">'+(r.startHours!=null?(+r.startHours).toFixed(1):'')+'</td>'+
        '<td style="padding:5px 7px;text-align:center;font-weight:700;color:#f59e0b">'+(r.endHours!=null?(+r.endHours).toFixed(1):'')+'</td>'+
        '<td style="padding:5px 7px;text-align:center">'+(r.landings||'')+'</td>'+
        (isC208?'<td style="padding:5px 7px;text-align:center">'+(r.starts||'')+'</td>':'')+
        '<td style="padding:5px 7px;color:var(--text2);min-width:150px;max-width:280px;white-space:normal;word-break:break-word;line-height:1.35">'+_frEsc(r.note||'')+'</td>'+
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
// ── Records browser / editor (flightrecord_manage) — searchable, inline-editable master list ──────
var _FRB_PAGE=200;
function _frbFiltered(){
  var q=(S._frbQ||'').trim().toLowerCase();
  var fp=S._frbPilot||'',fa=S._frbAc||'',ft=S._frbType||'',from=S._frbFrom||'',to=S._frbTo||'';
  var out=[];
  Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];if(!r)return;
    if(fp&&String(r.user_id)!==fp)return;
    if(fa&&String(r.aircraft||'')!==fa)return;
    if(ft&&String(r.product||'')!==ft)return;
    if(from&&String(r.fr_date||'')<from)return;
    if(to&&String(r.fr_date||'')>to)return;
    if(q){var hay=(_frPicName(r)+' '+(r.aircraft||'')+' '+(r.product||'')+' '+_frRoute(r)+' '+(r.from||'')+' '+(r.to||'')+' '+(r.note||'')+' '+(r.details||'')).toLowerCase();if(hay.indexOf(q)<0)return;}
    out.push(r);});
  out.sort(function(a,b){return a.fr_date===b.fr_date?(_frMins(b.off)-_frMins(a.off)):String(b.fr_date).localeCompare(String(a.fr_date));});
  return out;
}
window.frbSet=function(f,v){S['_frb'+f]=v;S._frbLimit=null;if(typeof render==='function')render();};
window.frbReset=function(){S._frbQ='';S._frbPilot='';S._frbAc='';S._frbType='';S._frbFrom='';S._frbTo='';S._frbLimit=null;render();};
window.frbMore=function(){S._frbLimit=(S._frbLimit||_FRB_PAGE)+_FRB_PAGE;render();};
window.frbBreak=function(v){S._frbBreak=v;render();};
function _frbChip(on){return 'padding:5px 11px;border-radius:8px;border:1px solid '+(on?'var(--accent)':'var(--border2)')+';background:'+(on?'var(--accent)':'transparent')+';color:'+(on?'#fff':'var(--text2)')+';font-size:11px;font-weight:800;cursor:pointer';}
var _FRB_IN='font-size:12px;padding:4px 5px;border:1px solid var(--border2);border-radius:5px;background:var(--card2);color:var(--text);text-align:center';
function _frbInput(id,field,val,type,w){return '<input type="'+(type||'text')+'"'+(type==='number'?' step="0.1"':'')+' value="'+_frEsc(val==null?'':val)+'" onchange="window.frEditField(\''+id+'\',\''+field+'\',this.value)" style="'+_FRB_IN+';width:'+(w||60)+'px">';}
function _frbSelectCell(id,field,cur,opts){return '<select onchange="window.frEditField(\''+id+'\',\''+field+'\',this.value)" style="'+_FRB_IN+'">'+opts.map(function(o){return '<option value="'+_frEsc(o)+'"'+(String(cur||'')===String(o)?' selected':'')+'>'+_frEsc(String(o).replace('ZK-',''))+'</option>';}).join('')+'</select>';}
function _frRenderBrowse(){
  if(!S._frLoaded){S._frLoaded=true;if(window.loadFlightRecords)window.loadFlightRecords();}
  var esc=_frEsc;
  var all=_frbFiltered();
  var pids={},acs={},types={};
  Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];if(!r)return;if(r.user_id)pids[r.user_id]=1;if(r.aircraft)acs[r.aircraft]=1;if(r.product)types[r.product]=1;});
  var pilotOpts=Object.keys(pids).map(function(id){return {id:id,nm:_frPilotLabel(id)};}).sort(function(a,b){return a.nm.localeCompare(b.nm);});
  var acOpts=Object.keys(acs).sort();
  var typeOpts=_frUniq(_frProducts().concat(Object.keys(types))).sort();
  var fsel=function(field,cur,opts,blank){return '<select onchange="window.frbSet(\''+field+'\',this.value)" style="'+_FRB_IN+';text-align:left;min-height:36px"><option value="">'+esc(blank)+'</option>'+opts.map(function(o){var v=(o&&o.id!=null)?o.id:o;var l=(o&&o.nm!=null)?o.nm:String(o).replace('ZK-','');return '<option value="'+esc(v)+'"'+(String(cur)===String(v)?' selected':'')+'>'+esc(l)+'</option>';}).join('')+'</select>';};
  var n=all.length,tot=0,tc=0,tg=0,ldg=0;
  all.forEach(function(r){var ftm=+r.flightTime||0;tot+=ftm;ldg+=(+r.landings||0);var ty=_frAcType(r.aircraft);if(ty==='C208B')tc+=ftm;else if(ty==='GA8')tg+=ftm;});
  var h='<div class="card">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div class="st" style="margin:0">Records — browse &amp; edit</div>'+
      '<button onclick="window.frbReset()" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border2);background:transparent;color:var(--text2);font-size:12px;font-weight:700;cursor:pointer">↺ Clear filters</button></div>'+
    '<div style="font-size:11px;color:var(--text3);margin:4px 0 10px">Edit any cell to correct the database — each change saves immediately (aircraft TTIS totals are not auto-recalculated).</div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
      '<input id="frbSearch" type="search" value="'+esc(S._frbQ||'')+'" onchange="window.frbSet(\'Q\',this.value)" placeholder="Search name / route / notes / aircraft…" style="flex:1;min-width:200px;font-size:16px;padding:8px 10px;border:1px solid var(--border2);border-radius:8px;background:var(--card2);color:var(--text)">'+
      fsel('Pilot',S._frbPilot||'',pilotOpts,'All pilots')+
      fsel('Ac',S._frbAc||'',acOpts,'All aircraft')+
      fsel('Type',S._frbType||'',typeOpts,'All types')+
      '<label style="font-size:10px;color:var(--text3);display:flex;flex-direction:column">From<input type="date" value="'+esc(S._frbFrom||'')+'" onchange="window.frbSet(\'From\',this.value)" style="'+_FRB_IN+'"></label>'+
      '<label style="font-size:10px;color:var(--text3);display:flex;flex-direction:column">To<input type="date" value="'+esc(S._frbTo||'')+'" onchange="window.frbSet(\'To\',this.value)" style="'+_FRB_IN+'"></label>'+
    '</div></div>';
  // stats panel
  h+='<div class="card"><div style="display:flex;gap:20px;flex-wrap:wrap;align-items:baseline">'+
     '<div><div style="font-size:22px;font-weight:800">'+n+'</div><div style="font-size:10px;color:var(--text3)">flights (filtered)</div></div>'+
     '<div><div style="font-size:22px;font-weight:800">'+tot.toFixed(1)+'h</div><div style="font-size:10px;color:var(--text3)">total flight time</div></div>'+
     '<div><div style="font-size:15px;font-weight:700;color:var(--text2)">C208B '+tc.toFixed(1)+'h · GA8 '+tg.toFixed(1)+'h</div><div style="font-size:10px;color:var(--text3)">by type</div></div>'+
     '<div><div style="font-size:15px;font-weight:700;color:var(--text2)">'+ldg+'</div><div style="font-size:10px;color:var(--text3)">landings</div></div></div>';
  var brk=S._frbBreak||'pilot';var bmap={};
  all.forEach(function(r){var key=brk==='aircraft'?(_frAcShort(r.aircraft)||'—'):_frPilotLabel(r.user_id);var e=bmap[key]||(bmap[key]={n:0,h:0});e.n++;e.h+=(+r.flightTime||0);});
  var brows=Object.keys(bmap).map(function(k){return {k:k,n:bmap[k].n,h:bmap[k].h};}).sort(function(a,b){return b.h-a.h;});
  h+='<div style="margin-top:10px;display:flex;gap:6px;align-items:center"><span style="font-size:11px;color:var(--text3);margin-right:2px">Breakdown:</span>'+
     '<button onclick="window.frbBreak(\'pilot\')" style="'+_frbChip(brk==='pilot')+'">By pilot</button>'+
     '<button onclick="window.frbBreak(\'aircraft\')" style="'+_frbChip(brk==='aircraft')+'">By aircraft</button></div>'+
     '<div style="overflow-x:auto;margin-top:6px"><table style="border-collapse:collapse;font-size:12px"><tbody>'+
     brows.slice(0,40).map(function(e){return '<tr><td style="padding:3px 16px 3px 0;font-weight:700">'+esc(e.k)+'</td><td style="padding:3px 16px 3px 0;text-align:right;color:var(--text3)">'+e.n+' flt</td><td style="padding:3px 0;text-align:right;font-weight:800">'+e.h.toFixed(1)+'h</td></tr>';}).join('')+
     '</tbody></table></div></div>';
  // editable table (capped)
  var lim=S._frbLimit||_FRB_PAGE;var shown=all.slice(0,lim);
  var th=function(t){return '<th style="text-align:left;padding:6px 7px;font-size:9px;color:var(--text3);font-weight:700;white-space:nowrap;background:var(--card2)">'+t+'</th>';};
  h+='<div class="card" style="padding:0;overflow-x:auto">'+
     '<div style="padding:8px 12px;font-size:11px;color:var(--text3)">Showing '+shown.length+' of '+n+' flights'+(shown.length<n?' — narrow the filters or load more':'')+'</div>'+
     '<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:1000px"><thead><tr>'+
       ['Date','PIC','Aircraft','Type','From','To','POB','Off','On','Flt h','Ldg','Notes',''].map(th).join('')+'</tr></thead><tbody>';
  shown.forEach(function(r){
    h+='<tr style="border-top:1px solid var(--border2)">'+
      '<td style="padding:3px 6px">'+_frbInput(r.id,'fr_date',r.fr_date,'date',128)+'</td>'+
      '<td style="padding:3px 6px">'+_frbInput(r.id,'picName',_frPicName(r),'text',110)+'</td>'+
      '<td style="padding:3px 6px">'+_frbSelectCell(r.id,'aircraft',r.aircraft,_frUniq(_frAcList().concat(r.aircraft?[r.aircraft]:[])))+'</td>'+
      '<td style="padding:3px 6px">'+_frbSelectCell(r.id,'product',r.product,_frUniq(_frProducts().concat(r.product?[r.product]:[])))+'</td>'+
      '<td style="padding:3px 6px">'+_frbInput(r.id,'from',r.from,'text',48)+'</td>'+
      '<td style="padding:3px 6px">'+_frbInput(r.id,'to',r.to,'text',48)+'</td>'+
      '<td style="padding:3px 6px">'+_frbInput(r.id,'pob',r.pob,'number',46)+'</td>'+
      '<td style="padding:3px 6px">'+_frbInput(r.id,'off',r.off,'text',54)+'</td>'+
      '<td style="padding:3px 6px">'+_frbInput(r.id,'on',r.on,'text',54)+'</td>'+
      '<td style="padding:3px 6px">'+_frbInput(r.id,'flightTime',r.flightTime,'number',54)+'</td>'+
      '<td style="padding:3px 6px">'+_frbInput(r.id,'landings',r.landings,'number',44)+'</td>'+
      '<td style="padding:3px 6px">'+_frbInput(r.id,'note',r.note,'text',170)+'</td>'+
      '<td style="padding:3px 6px"><button onclick="window.frCancelFlight(\''+r.id+'\')" title="Delete this record" style="background:none;border:none;color:#ef4444;font-size:14px;cursor:pointer;padding:4px 6px">🗑</button></td>'+
    '</tr>';
  });
  h+='</tbody></table>';
  if(shown.length<n)h+='<div style="padding:10px;text-align:center"><button onclick="window.frbMore()" style="padding:9px 18px;border-radius:9px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:13px;font-weight:700;cursor:pointer">Show '+Math.min(_FRB_PAGE,n-shown.length)+' more</button></div>';
  h+='</div>';
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
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-size:16px;font-weight:800">'+(r.manual?'Add / edit flight':'Edit flight')+' — '+_frEsc(_frAcShort(r.aircraft))+'</div><button onclick="window.frEditCancel()" style="background:none;border:none;color:var(--text3);font-size:13px;cursor:pointer">✕ Close</button></div>';
  if(r.manual){
    var _us=(S.users||[]).slice().sort(function(a,b){return String(a.name||'').localeCompare(String(b.name||''));});
    if(!_us.length&&r.user_id)_us=[{id:r.user_id,name:((S.user&&S.user.id===r.user_id&&S.user.name)||r.user_id)}];
    h+='<div style="background:rgba(124,58,237,.06);border:1px solid rgba(124,58,237,.25);border-radius:10px;padding:10px;margin-bottom:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">'+
      '<div style="font-size:11px;color:#a78bfa;font-weight:800;width:100%;margin-bottom:-2px">✍ MANUAL FLIGHT — who flew it, the date & aircraft</div>'+
      '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">PIC (pilot)</label><select onchange="window.frEditField(\''+r.id+'\',\'user_id\',this.value)" style="height:46px;font-size:15px;font-weight:700;padding:0 8px;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text);min-width:150px">'+
        _us.map(function(u){return '<option value="'+_frJs(u.id)+'"'+(r.user_id===u.id?' selected':'')+'>'+_frEsc(u.name||u.id)+'</option>';}).join('')+'</select></div>'+
      '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Date</label><input type="date" value="'+_frEsc(r.fr_date||'')+'" onchange="window.frEditField(\''+r.id+'\',\'fr_date\',this.value)" style="height:46px;font-size:15px;font-weight:700;padding:0 8px;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text)"></div>'+
      '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Aircraft</label><select onchange="window.frEditField(\''+r.id+'\',\'aircraft\',this.value)" style="height:46px;font-size:15px;font-weight:700;padding:0 8px;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text)">'+
        _frAcList().map(function(a){return '<option value="'+_frJs(a)+'"'+(r.aircraft===a?' selected':'')+'>'+_frEsc(_frAcShort(a))+'</option>';}).join('')+'</select></div>'+
    '</div>';
  }
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
  h+='<div style="margin-top:10px;display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap"><div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Co-pilot</label><input type="text" value="'+_frEsc(r.copilot||'')+'" placeholder="—" onchange="window.frEditField(\''+r.id+'\',\'copilot\',this.value)" style="width:130px;height:46px;font-size:16px;font-weight:700;text-align:center;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text)"></div>'+(r.copilot?'<span style="font-size:12px;color:var(--text3);padding-bottom:14px">'+_frEsc(_frPilotName(r.copilot))+'</span>':'')+'</div>';
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
  if(!S._frDraft&&tab==='auto'&&flights.length){var f=_frAutoPick(flights);if(f){var _ns=_frNextStartHours(f.ac);S._frDraft={ac:f.ac,product:f.prod,from:f.from,to:f.to,pob:f.pob,startHours:(_ns!=null?_ns:''),manual:false};}}
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
  _frAcList().forEach(function(ac){var _ns=_frNextStartHours(ac);h+=_frBigBtn(_frAcShort(ac),d.ac===ac,"window.frUseFlight('"+_frJs(ac)+"','"+_frJs(d.product||'')+"','"+_frJs(d.from||'')+"','"+_frJs(d.to||'')+"',"+(+d.pob||1)+","+(manual?'true':'false')+")",_ns!=null?(+_ns).toFixed(1)+'h':'',_frAcCol(ac));});
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
  // Co-pilot — auto-filled from the calendar's co-pilot for this aircraft; editable.
  h+='<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px">'+
    '<div style="font-size:11px;color:var(--text3);font-weight:700;letter-spacing:.04em;text-transform:uppercase">Co-pilot <span style="text-transform:none">(from calendar)</span></div>'+
    '<input type="text" value="'+_frEsc(d.copilot||'')+'" placeholder="—" onchange="window.frDraftSet(\'copilot\',this.value)" style="width:130px;height:46px;font-size:16px;font-weight:700;text-align:center;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text)">'+
    (d.copilot?'<span style="font-size:12px;color:var(--text3)">'+_frEsc(_frPilotName(d.copilot))+'</span>':'')+
  '</div>';
  // Confirm aircraft hours
  h+='<div style="border-top:1px solid var(--border2);padding-top:14px;margin-top:4px">'+
    '<div style="font-size:14px;font-weight:800;margin-bottom:8px">Confirm aircraft hours are</div>'+
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
      '<button onclick="window.frDraftHours(-0.1)" style="width:54px;height:54px;border-radius:12px;border:2px solid var(--border2);background:var(--card2);color:var(--text1);font-size:24px;font-weight:800;cursor:pointer">–</button>'+
      '<input type="number" step="0.1" value="'+(d.startHours!==''&&d.startHours!=null?d.startHours:'')+'" onchange="window.frDraftSet(\'startHours\',this.value)" style="width:150px;height:58px;font-size:28px;font-weight:800;text-align:center;border:2px solid var(--border2);border-radius:12px;background:var(--card);color:var(--text)">'+
      '<button onclick="window.frDraftHours(0.1)" style="width:54px;height:54px;border-radius:12px;border:2px solid var(--border2);background:var(--card2);color:var(--text1);font-size:24px;font-weight:800;cursor:pointer">+</button>'+
    '</div></div>';
  // Notes — captured on the card and carried straight into the logbook row.
  h+='<div style="margin-top:14px"><div style="font-size:11px;color:var(--text3);font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px">Notes</div>'+
    '<textarea rows="2" placeholder="Anything to record for this flight…" onchange="window.frDraftSet(\'note\',this.value)" style="width:100%;box-sizing:border-box;font-size:15px;padding:10px;border:2px solid var(--border2);border-radius:11px;background:var(--card);color:var(--text);resize:vertical">'+_frEsc(d.note||'')+'</textarea></div>';
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
// Display label for a logbook owner: a real account name if the id resolves, else the pic_name carried
// on their flight records (imported / placeholder pilots), else the raw id.
function _frPilotLabel(uid){var n=_frUserName(uid);if(n)return n;var pn='';Object.keys(S._frData||{}).some(function(k){var r=S._frData[k];if(r&&r.user_id===uid&&r.picName){pn=r.picName;return true;}return false;});return pn||String(uid||'?');}
// True when this logbook owner is NOT a real app account (a placeholder / imported pilot) — admins can
// rename these to attach a proper name to the whole logbook.
function _frIsPlaceholderPilot(uid){return !!uid&&!_frUserName(uid);}
window.frLbRenamePilot=function(uid){
  if(!uid||typeof prompt!=='function')return;
  var ids=[];Object.keys(S._frData||{}).forEach(function(k){if((S._frData[k]||{}).user_id===uid)ids.push(k);});
  var cur=_frPilotLabel(uid);
  var nm=prompt('Name for this logbook — applies to all '+ids.length+' flight'+(ids.length===1?'':'s')+':',cur);
  if(nm==null)return;nm=String(nm).trim();if(!nm)return;
  ids.forEach(function(k){S._frData[k].picName=nm;});
  try{lsSet&&lsSet('ts_flight_records_cache',S._frData);}catch(e){}
  try{if(typeof _sbFetch==='function')_sbFetch(SB+'/rest/v1/ts_flight_records?user_id=eq.'+encodeURIComponent(uid),{method:'PATCH',headers:{...SH,'Prefer':'return=minimal'},body:JSON.stringify({pic_name:nm})}).then(function(r){if(typeof toast==='function')toast(r&&r.ok?('Renamed to '+nm+' ('+ids.length+' flights)'):'Saved locally — server update failed',r&&r.ok?'ok':'warn');});}catch(e){}
  render();
};
function _frUniq(a){var o=[],s={};(a||[]).forEach(function(x){if(x!=null&&x!==''&&!s[x]){s[x]=1;o.push(x);}});return o;}
window.frLbDayToggle=function(d){S._lbDayOpen=S._lbDayOpen||{};if(S._lbDayOpen[d])delete S._lbDayOpen[d];else S._lbDayOpen[d]=true;render();};
function _frPicName(r){return r.picName||_frUserName(r.user_id)||'';}
function _frDetails(r){return r.details||((r.from||'')+(r.to?'-'+r.to:''))||(r.product||'');}
// Route token for the logbook: prefer a Dep-Dest from the from/to fields (so a Ferry shows "QN-WF",
// not the word "Ferry"), unless details already encodes a full multi-hop route (e.g. imported "QN-MF-QN").
function _frRoute(r){
  var d=String((r&&r.details)||'').trim();
  if(/^[A-Za-z]{2,4}(?:-[A-Za-z]{2,4}){2,}$/.test(d))return d.toUpperCase();   // already a return/multi-hop
  var f=String((r&&r.from)||'').trim().toUpperCase(),t=String((r&&r.to)||'').trim().toUpperCase();
  if(f&&t)return f+'-'+t;                       // Dep-Dest (ferries included)
  if(d&&/-/.test(d))return d.toUpperCase();
  if(d)return d;
  return String((r&&r.product)||'—');
}
function _frIsOneWay(t){return /^[A-Za-z]{2,4}-[A-Za-z]{2,4}$/.test(t);}
function renderLogbook(){
  if(!S._frLoaded){S._frLoaded=true;if(window.loadFlightRecords)window.loadFlightRecords();}
  if(!S.user)return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Sign in to view your logbook.</div>';
  // Only admin / superadmin can browse every pilot's logbook; everyone else sees only their own.
  var mgr=!!(S.user&&(S.user.role==='admin'||S.user.role==='superadmin'||S.user.superAdmin));
  var viewUid=(mgr&&S._lbUid)||(S.user&&S.user.id)||'';
  var h='';
  // pilot selector for managers
  if(mgr){
    var pilots={};Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];if(r)pilots[r.user_id]=1;});pilots[S.user.id]=1;
    h+='<div class="card" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:12px;color:var(--text3);font-weight:700">Logbook for</span>';
    Object.keys(pilots).forEach(function(uid){var nm=_frPilotLabel(uid);var on=uid===viewUid;h+='<button onclick="S._lbUid=\''+_frJs(uid)+'\';S._lbEditId=null;render()" style="padding:6px 12px;border-radius:8px;border:2px solid '+(on?'#7c3aed':'var(--border2)')+';background:'+(on?'rgba(124,58,237,.14)':'transparent')+';color:'+(on?'#a78bfa':'var(--text2)')+';font-size:12px;font-weight:700;cursor:pointer">'+_frEsc(nm.split(' ')[0]||nm)+'</button>';});
    h+='</div>';
  }
  // gather this pilot's logged flights
  var rows=[];Object.keys(S._frData||{}).forEach(function(k){var r=S._frData[k];if(r&&r.user_id===viewUid&&(r.done||r.manual))rows.push(r);});
  rows.sort(function(a,b){return a.fr_date===b.fr_date?(_frMins(b.off)-_frMins(a.off)):String(b.fr_date).localeCompare(String(a.fr_date));});
  var total=rows.reduce(function(s,r){return s+(+r.flightTime||0);},0);
  var ttC=rows.filter(function(r){return _frAcType(r.aircraft)==='C208B';}).reduce(function(s,r){return s+(+r.flightTime||0);},0);
  var ttG=rows.filter(function(r){return _frAcType(r.aircraft)==='GA8';}).reduce(function(s,r){return s+(+r.flightTime||0);},0);
  var _vn=_frPilotLabel(viewUid);var _title=_vn&&_vn!==viewUid?(_frEsc(_vn)+(/[sS]$/.test(_vn)?'’':'’s')+' logbook'):'My logbook';
  // Admin viewing a placeholder/imported pilot (no real account) → offer to name the whole logbook.
  var _canRename=mgr&&_frIsPlaceholderPilot(viewUid);
  h+='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><div><div style="font-size:17px;font-weight:800">'+_title+'</div>'+
    '<div style="font-size:12px;color:var(--text3);margin-top:2px">'+rows.length+' flights · total '+total.toFixed(1)+'h <span style="color:var(--text2)">(C208B '+ttC.toFixed(1)+'h · GA8 '+ttG.toFixed(1)+'h)</span></div></div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
    (_canRename?'<button onclick="window.frLbRenamePilot(\''+_frJs(viewUid)+'\')" title="Give this imported/placeholder logbook a name (applies to all its flights)" style="padding:9px 16px;border-radius:10px;border:1px solid rgba(124,58,237,.5);background:rgba(124,58,237,.1);color:#a78bfa;font-size:13px;font-weight:700;cursor:pointer">✎ Name this logbook</button>':'')+
    '<button onclick="window.frLbAdd()" style="padding:9px 16px;border-radius:10px;border:1px dashed var(--border2);background:transparent;color:var(--text2);font-size:13px;font-weight:700;cursor:pointer">+ Add entry</button></div></div></div>';
  if(S._lbEditId&&(S._frData||{})[S._lbEditId]&&S._frData[S._lbEditId].user_id===viewUid)h+=_lbRenderEdit(S._frData[S._lbEditId]);
  if(!rows.length){h+='<div class="card" style="color:var(--text3);padding:24px;font-size:13px">No flights logged yet. They appear here automatically when you record a flight, or add one manually.</div>';return h;}
  // Group flights by DAY: one summary row per day (total flight time + a route summary that collapses
  // repeats, e.g. "QN-MF-QN ×2 · QN-FJ-QN"); tap the day to expand the individual legs (each tappable to
  // adjust). S._lbDayOpen tracks which days are expanded.
  S._lbDayOpen=S._lbDayOpen||{};
  var byDay={};rows.forEach(function(r){(byDay[r.fr_date]=byDay[r.fr_date]||[]).push(r);});
  var days=Object.keys(byDay).sort(function(a,b){return String(b).localeCompare(String(a));});
  h+='<div class="card" style="padding:0;overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:640px"><thead><tr style="background:var(--card2)">'+
    ['Month','Day','Type','Reg','PIC','Routes flown','Flt h'].map(function(t,i){return '<th style="text-align:'+(i>=6?'right':'left')+';padding:8px;font-size:9px;color:var(--text3);font-weight:700;white-space:nowrap">'+t+'</th>';}).join('')+'</tr></thead><tbody>';
  var lastMonth='';
  days.forEach(function(d){
    var legs=byDay[d].slice().sort(function(a,b){return _frMins(a.off)-_frMins(b.off);});
    var dt=new Date(d+'T00:00:00');
    var mon=dt.toLocaleDateString('en-NZ',{month:'short',year:'2-digit'});var day=dt.getDate();
    var newMonth=mon!==lastMonth;lastMonth=mon;
    var dayTot=legs.reduce(function(s,r){return s+(+r.flightTime||0);},0);
    var open=!!S._lbDayOpen[d];
    // route summary — Dep-Dest per leg (ferries → "QN-WF"); pair a one-way A-B with a later B-A into a
    // return "A-B-A"; then collapse identical routes into "route ×N", in first-seen order.
    var _toks=legs.map(_frRoute);
    var _remain={};_toks.forEach(function(t){_remain[t]=(_remain[t]||0)+1;});
    var _finals=[];
    _toks.forEach(function(t){
      if(_remain[t]<=0)return;                       // already consumed (as a return partner)
      if(_frIsOneWay(t)){var p=t.split('-'),rev=p[1]+'-'+p[0];
        if(rev!==t&&(_remain[rev]||0)>0){_remain[t]--;_remain[rev]--;_finals.push(p[0]+'-'+p[1]+'-'+p[0]);return;}}
      _remain[t]--;_finals.push(t);
    });
    var seen={},order=[];_finals.forEach(function(rt){if(order.indexOf(rt)<0)order.push(rt);seen[rt]=(seen[rt]||0)+1;});
    var summary=order.map(function(rt){return _frEsc(rt)+(seen[rt]>1?' ×'+seen[rt]:'');}).join(' · ');
    var regs=_frUniq(legs.map(function(r){return _frAcShort(r.aircraft);})).join(', ');
    var types=_frUniq(legs.map(function(r){return _frAcType(r.aircraft);})).filter(Boolean).join('/');
    var pics=_frUniq(legs.map(function(r){return _frPicName(r);})).filter(Boolean).join(', ');
    var col=_frAcCol(legs[0].aircraft);
    h+='<tr onclick="window.frLbDayToggle(\''+_frJs(d)+'\')" style="border-top:1px solid var(--border2);cursor:pointer"'+(open?' data-on="1"':'')+'>'+
      '<td style="padding:7px 8px;font-weight:700;color:'+(newMonth?'var(--text1)':'var(--text3)')+'">'+(newMonth?_frEsc(mon):'')+'</td>'+
      '<td style="padding:7px 8px;text-align:center;font-weight:700">'+day+'</td>'+
      '<td style="padding:7px 8px;color:var(--text2)">'+_frEsc(types)+'</td>'+
      '<td style="padding:7px 8px;font-weight:800;color:'+col+'">'+_frEsc(regs)+'</td>'+
      '<td style="padding:7px 8px">'+_frEsc(pics)+'</td>'+
      '<td style="padding:7px 8px;color:var(--text2)">'+(legs.length>1?'<span style="color:var(--text3)">'+(open?'▾':'▸')+'</span> ':'')+summary+(legs.length>1?' <span style="font-size:10px;color:var(--text3)">('+legs.length+' flights)</span>':'')+'</td>'+
      '<td style="padding:7px 8px;text-align:right;font-weight:800">'+dayTot.toFixed(1)+'</td>'+
    '</tr>';
    if(open){
      legs.forEach(function(r){
        h+='<tr onclick="window.frLbEdit(\''+r.id+'\')" style="cursor:pointer;background:rgba(124,58,237,.05)'+(S._lbEditId===r.id?';outline:1px solid rgba(124,58,237,.4)':'')+'">'+
          '<td></td><td></td>'+
          '<td style="padding:4px 8px;font-size:11px;color:var(--text3)">'+_frEsc((r.off||'')+(r.on?'–'+r.on:''))+'</td>'+
          '<td style="padding:4px 8px;font-size:11px;font-weight:700;color:'+_frAcCol(r.aircraft)+'">'+_frEsc(_frAcShort(r.aircraft))+'</td>'+
          '<td style="padding:4px 8px;font-size:11px;color:var(--text2)">'+_frEsc(r.copilot?('+ '+r.copilot):'')+'</td>'+
          '<td style="padding:4px 8px;font-size:11px;color:var(--text2)">'+_frEsc(_frRoute(r))+(r.note?' <span style="color:var(--text3)">— '+_frEsc(r.note)+'</span>':'')+'</td>'+
          '<td style="padding:4px 8px;text-align:right;font-size:11px;font-weight:700">'+(r.flightTime!=null?(+r.flightTime).toFixed(1):'—')+'</td>'+
        '</tr>';
      });
    }
  });
  h+='<tr style="border-top:2px solid var(--border2);background:var(--card2)"><td colspan="6" style="padding:8px;text-align:right;font-weight:700;color:var(--text2)">Total</td><td style="padding:8px;text-align:right;font-weight:800">'+total.toFixed(1)+'h</td></tr>';
  h+='</tbody></table></div>';
  h+='<div style="font-size:11px;color:var(--text3);padding:2px 4px 10px">Tap a day with multiple flights to see each leg; tap a leg to adjust it.</div>';
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
  h+='<div style="margin-top:10px"><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Notes (from the flight card)</label><textarea onchange="window.frLbField(\''+r.id+'\',\'note\',this.value)" rows="2" style="width:100%;box-sizing:border-box;font-size:14px;padding:10px;border:2px solid var(--border2);border-radius:10px;background:var(--card);color:var(--text);resize:vertical">'+_frEsc(r.note||'')+'</textarea></div>';
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
window.frLbAdd=function(){var uid=((typeof hasRolePerm==='function'&&hasRolePerm('flightrecord_manage')||(S.user&&S.user.superAdmin))&&S._lbUid)||(S.user&&S.user.id)||'';var ac=_frAcList()[0]||'';var rec={id:_frNewId(),user_id:uid,fr_date:_frToday(),aircraft:ac,type:_frAcType(ac),product:'',from:'',to:'',pob:1,off:'',on:'',startHours:null,endHours:null,flightTime:null,tacho:null,landings:1,starts:1,picName:'',copilot:_frCoPilotForAc(ac)||'',details:'',manual:true,note:'',done:true,submitted:false,at:new Date().toISOString()};_frSave(rec);S._lbEditId=rec.id;render();};
window.frLbDelete=function(id){var r=(S._frData||{})[id];if(!r||!r.manual)return;if(typeof confirm==='function'&&!confirm('Delete this manual logbook entry?'))return;delete S._frData[id];try{lsSet&&lsSet('ts_flight_records_cache',S._frData);}catch(e){}if(typeof sbDel==='function')sbDel('ts_flight_records',id);else if(typeof SB!=='undefined')fetch(SB+'/rest/v1/ts_flight_records?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:SH}).catch(function(){});S._lbEditId=null;render();};
