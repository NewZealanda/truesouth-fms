// === MODULE: rezdy === v1.0 ===
// Rezdy bookings + pickup van management + aircraft day-schedule.
// Self-contained. Entry points: renderCalendar(), renderGround(), renderAdminOperations(),
// rezdyOpsBookings/Seatmap/Loadsheets(). All onclick handlers are window.*.
// State keys used on S: rezdyTab, rezdyDate, _rezdyBookings, _rezdyLoading,
//   _rezdyOpen (expanded booking rows, keyed by orderNumber),
//   _pickupVans, _pickupCollected, _pickupLoading, _schedBlocks, _schedLoading,
//   _schedEdit, _rezdyDragId.

// ── helpers ───────────────────────────────────────────────────────────────
// Local Y-M-D (NOT toISOString, which is UTC and lands a day off in NZ).
function _rzYmd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _rzToday(){return _rzYmd(new Date());}
// Initial Operations day on (re)load: the day picked earlier this session (survives a refresh
// on Bookings/Seatmap/Loadsheets) else today. Uses sessionStorage so a fresh visit starts on today.
function _rzInitDate(){var _sd=null;try{_sd=sessionStorage.getItem('ts_rezdy_date');}catch(e){}return (_sd&&/^\d{4}-\d{2}-\d{2}$/.test(_sd))?_sd:_rzToday();}
function _rzDowLabel(ds){
  if(!ds)return'';var d=new Date(ds+'T00:00:00');if(isNaN(d))return'';
  var t=new Date();t.setHours(0,0,0,0);var diff=Math.round((d-t)/86400000);
  if(diff===0)return'Today';if(diff===-1)return'Yesterday';if(diff===1)return'Tomorrow';
  return d.toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'short'}); // Monday 16 Jun
}
function _rzEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _rzAcCol(ac){return (typeof AC_COL!=='undefined'&&AC_COL[ac])||'#64748b';}
const _RZ_VANS=3, _RZ_VAN_SEATS=11;
// Fleet of pickup vehicles (name/seats/colour). Editable via the Pickups ⚙ menu, persisted
// in the pickup blob. Defaults to the 3 Hiace vans we run.
function _rzVehicles(){
  if(!Array.isArray(S._rzVehicles)||!S._rzVehicles.length){
    var cached=null;try{cached=(typeof lsGet==='function')?lsGet('ts_rz_vehicles'):null;}catch(e){}
    S._rzVehicles=(Array.isArray(cached)&&cached.length)?cached
      :[{name:'Van 1',seats:11,color:'#4a99d2'},{name:'Van 2',seats:11,color:'#48925f'},{name:'Van 3',seats:11,color:'#e3683e'}];
  }
  return S._rzVehicles;
}
function _rzVehSave(){
  try{if(typeof lsSet==='function')lsSet('ts_rz_vehicles',S._rzVehicles||[]);}catch(e){}
  if(typeof sbMergeSave==='function')sbMergeSave('rz_vehicles',S._rzVehicles||[],function(m){S._rzVehicles=m;try{lsSet&&lsSet('ts_rz_vehicles',m);}catch(e){}});
}
function _rzVehLoad(){
  try{fetch(SB+'/rest/v1/ts_settings?key=eq.rz_vehicles&select=value',{headers:SH}).then(function(r){return r.ok?r.json():[];}).then(function(rows){
    var v=rows&&rows[0]&&rows[0].value;if(typeof v==='string'){try{v=JSON.parse(v);}catch(e){v=null;}}
    if(Array.isArray(v)&&v.length){S._rzVehicles=v;try{lsSet('ts_rz_vehicles',v);}catch(e){}if(typeof _sbSetBase==='function')_sbSetBase('rz_vehicles',v);S._pickupVans=null;render();}
  }).catch(function(){});}catch(e){}
}
// ── Vehicle management panel (Pickups ⚙) ──
function _rzVehiclePanel(){
  var veh=_rzVehicles();var h='<div class="card" style="padding:12px 14px">'+
    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800;margin-bottom:8px">Vehicles</div>';
  veh.forEach(function(v,i){
    h+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border2)">'+
      '<input type="color" value="'+_rzEsc(v.color||'#64748b')+'" onchange="window.pickupVehSet('+i+',\'color\',this.value)" style="width:30px;height:30px;border:none;background:none;cursor:pointer;padding:0;flex-shrink:0">'+
      '<input type="text" value="'+_rzEsc(v.name||'')+'" onchange="window.pickupVehSet('+i+',\'name\',this.value)" placeholder="Name" style="flex:1 1 90px;min-width:0;font-size:13px;padding:6px 8px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:6px">'+
      '<label style="font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px">seats <input type="number" value="'+(v.seats||11)+'" min="1" onchange="window.pickupVehSet('+i+',\'seats\',this.value)" style="width:50px;font-size:13px;padding:6px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:6px;text-align:right"></label>'+
      (veh.length>1?'<button onclick="window.pickupVehRemove('+i+')" title="Remove vehicle" style="background:none;border:none;color:#ef444499;cursor:pointer;font-size:14px">🗑</button>':'')+
    '</div>';
  });
  h+='<button onclick="window.pickupVehAdd()" style="font-size:12px;font-weight:700;padding:6px 12px;border-radius:8px;border:1px dashed var(--border2);background:transparent;color:var(--text2);cursor:pointer">+ Add vehicle</button>';
  return h+'</div>';
}
window.pickupToggleVehicles=function(){S._pickupVehPanel=!S._pickupVehPanel;render();};
window.pickupVehSet=function(i,field,val){var veh=_rzVehicles();if(!veh[i])return;if(field==='seats')veh[i].seats=Math.max(1,parseInt(val)||11);else veh[i][field]=val;_rzVehSave();render();};
window.pickupVehAdd=function(){var veh=_rzVehicles();var pal=['#4a99d2','#48925f','#e3683e','#a855f7','#f59e0b','#ec4899','#14b8a6','#ef4444'];veh.push({name:'Van '+(veh.length+1),seats:11,color:pal[veh.length%pal.length]});S._pickupVans=null;_rzVehSave();render();};
window.pickupVehRemove=function(i){var veh=_rzVehicles();if(veh.length<=1)return;veh.splice(i,1);S._pickupVans=null;_rzVehSave();render();};
// ── Active vs spare (parked) vehicles — PER DEPARTURE ──
// Drivers, the active/parked van set, and acknowledgement are all tracked per (vehicle, departure)
// so the same van/driver can change between the 0800 and 1200 runs. Keys are "vi|dep".
//   S._pickupSpare:   {"vi|dep":1}    van parked (a spare) for THAT departure
//   S._pickupDrivers: {"vi|dep":name} who drives van vi for THAT departure
//   S._pickupAck:     {"vi|dep":{sig,ids,at,by}} driver's acknowledgement of THAT run
function _pkKey(vi,dep){return vi+'|'+(dep==null?'':dep);}
// Van indices BEYOND the owned fleet are manually-created "Taxi" vans (drag a pickup to the empty
// space to make one). They hold overflow, render amber, are driverless, and can be converted to a
// real vehicle by dropping a spare van/Subi onto them. Created only by the operator — never auto.
function _rzIsTaxiVan(vi){return vi>=_rzVehicles().length;}
function _rzVanParked(vi,dep){if(_rzIsTaxiVan(vi))return false;return !!(S._pickupSpare||{})[_pkKey(vi,dep)];}
function _rzActiveVanCount(dep){var n=_rzVehicles().length,c=0;for(var i=0;i<n;i++)if(!_rzVanParked(i,dep))c++;return c;}
function _rzVanDriver(vi,dep){var d=(S._pickupDrivers||{})[_pkKey(vi,dep)];d=(d==null?'':String(d)).trim();return d||null;}
window.pickupVehParkDragStart=function(vi,e){S._pickupVehDrag=vi;try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','veh:'+vi);}catch(_){}};
window.pickupActivateVehicle=function(vi,dep){S._pickupSpare=S._pickupSpare||{};delete S._pickupSpare[_pkKey(vi,dep)];if(window.pickupSave)window.pickupSave(true);render();};
// Park a vehicle. ALL vehicles may now be parked — the run's pickups then sit as a Taxi/awaiting list
// (handled by _rzEnsureVans) until a van/driver is added back. (Previously the last active van couldn't
// be parked.)
window.pickupParkVehicle=function(vi,dep){S._pickupSpare=S._pickupSpare||{};S._pickupSpare[_pkKey(vi,dep)]=1;if(window.pickupSave)window.pickupSave(true);render();};
window.pickupParkAll=function(dep){S._pickupSpare=S._pickupSpare||{};for(var vi=0;vi<_rzVehicles().length;vi++)S._pickupSpare[_pkKey(vi,dep)]=1;if(window.pickupSave)window.pickupSave(true);if(typeof toast==='function')toast('All vehicles parked — this run is now a list awaiting a van/driver.','info');render();};
window.pickupActivateAll=function(dep){S._pickupSpare=S._pickupSpare||{};for(var vi=0;vi<_rzVehicles().length;vi++)delete S._pickupSpare[_pkKey(vi,dep)];if(window.pickupSave)window.pickupSave(true);render();};
window.pickupDropActivateVehicle=function(e,dep){if(e&&e.preventDefault)e.preventDefault();var vi=S._pickupVehDrag;S._pickupVehDrag=null;if(vi==null||vi==='')return;window.pickupActivateVehicle(parseInt(vi,10),dep);};
function _rzVehSeats(vi){if(_rzIsTaxiVan(vi))return 11;var v=_rzVehicles()[vi];return (v&&v.seats)||11;}
function _rzVehColor(vi){if(_rzIsTaxiVan(vi))return '#f59e0b';var v=_rzVehicles()[vi];return (v&&v.color)||'#64748b';}
function _rzVehName(vi){if(_rzIsTaxiVan(vi)){var t=vi-_rzVehicles().length+1;return '🚕 Taxi'+(t>1?(' '+t):'');}var v=_rzVehicles()[vi];return (v&&v.name)||('Van '+(vi+1));}
// Create / convert manual Taxi overflow vans.
window.pickupDropNewTaxi=function(e,dep){
  if(e&&e.preventDefault)e.preventDefault();
  var id=S._rezdyDragId;try{if(!id&&e.dataTransfer)id=e.dataTransfer.getData('text/plain');}catch(_){}
  S._rezdyDragId=null;
  if(!id||String(id).indexOf('driver:')===0||String(id).indexOf('veh:')===0)return; // pickups only
  if(!Array.isArray(S._pickupVans))return;
  S._pickupVans=S._pickupVans.map(function(v){return v.filter(function(x){return x!==id;});}); // pull from any van
  S._pickupVans.push([id]);                                                                    // new Taxi van
  if(window.pickupSave)window.pickupSave(true);render();
};
// The single combined empty-space drop zone: a spare VEHICLE → activate it as a new run; a PASSENGER
// (pickup) → start a new taxi list (which you then drop a vehicle + driver onto).
window.pickupDropCombined=function(e,dep){
  if(e&&e.preventDefault)e.preventDefault();
  var veh=S._pickupVehDrag;
  if(veh==null||veh===''){try{var d=e.dataTransfer&&e.dataTransfer.getData('text/plain');if(d&&d.indexOf('veh:')===0)veh=parseInt(d.slice(4),10);}catch(_){}}
  if(veh!=null&&veh!==''){window.pickupActivateVehicle(parseInt(veh,10),dep);return;} // spare vehicle → add the run
  window.pickupDropNewTaxi(e,dep);                                                     // passenger → new taxi list
};
// A drop on a Taxi card: a spare VEHICLE → convert; a pickup → just add it (overload allowed).
window.pickupTaxiDrop=function(taxiVi,e,dep){
  if(e&&e.preventDefault)e.preventDefault();
  var veh=S._pickupVehDrag;
  if(veh==null||veh===''){try{var d=e.dataTransfer&&e.dataTransfer.getData('text/plain');if(d&&d.indexOf('veh:')===0)veh=parseInt(d.slice(4),10);}catch(_){}}
  if(veh!=null&&veh!==''){window.pickupConvertTaxi(taxiVi,parseInt(veh,10),dep);return;}
  window.pickupDropOnVan(taxiVi,e,dep);
};
// Drop a spare van/Subi onto a Taxi → move the taxi's pickups into that real vehicle, activate it
// for this departure, drop the now-empty taxi, and open its driver picker.
window.pickupConvertTaxi=function(taxiVi,vehVi,dep){
  S._pickupVehDrag=null;
  if(!Array.isArray(S._pickupVans)||!S._pickupVans[taxiVi]||_rzIsTaxiVan(vehVi))return;
  var ids=S._pickupVans[taxiVi].slice();
  S._pickupVans[vehVi]=(S._pickupVans[vehVi]||[]).concat(ids);
  S._pickupVans.splice(taxiVi,1);                     // taxiVi > vehVi, so vehVi's index is unaffected
  if(S._pickupSpare)delete S._pickupSpare[_pkKey(vehVi,dep)]; // un-park / activate it
  if(window.pickupSave)window.pickupSave(true);
  S._pickupVanDriverPick=_pkKey(vehVi,dep);            // "...and a driver" — open the driver picker
  if(typeof toast==='function')toast(_rzVehName(vehVi)+' now covers that run — pick a driver','ok');
  render();
};
// Departure label "0800" → minutes since midnight (for the "next departure" default).
function _rzDepMin(t){var m=/(\d{1,2}):?(\d{2})/.exec(String(t||''));return m?(+m[1])*60+(+m[2]):9999;}

// Departure/pickup time as a compact 24h string e.g. "0930" (from "...T09:30..." or "09:30:00").
function _rzDepTime(s){if(s==null||s==='')return '';s=String(s);var m=/[T ](\d{2}):(\d{2})/.exec(s)||/(\d{1,2}):(\d{2})/.exec(s);return m?String(m[1]).padStart(2,'0')+m[2]:_rzEsc(s);}
// Product display: abbreviate the long Milford "Fly Cruise Fly" product to FCF.
// Rezdy product name → short code (order matters: more specific first).
var _RZ_PROD_MAP=[
  [/one.?way/i,'FLB'],                         // Milford Sound One-Way Flight (flyback)
  [/coach.*cruise.*fly/i,'CCF'],               // Milford Coach Cruise Fly (flyback)
  [/coach.*cruise.*coach/i,'CCC'],             // Milford Sound Coach Cruise Coach
  [/fly.*cruise.*fly/i,'FCF'],                 // Milford Sound Fly Cruise Fly
  [/fly.*explore.*fly/i,'FEF'],
  [/expedition.*(cook|aoraki)|aoraki.*cook/i,'MCEXP'],
  [/glacier.*helihike.*franz|helihike.*franz/i,'FJHH'],
  [/glacier.*helihike.*tasman|helihike.*tasman/i,'THH'],
  [/franz.*helic.*glacier.*land/i,'FJGL'],
  [/franz.*scenic/i,'FJOH'],
  [/milford.*scenic/i,'MFOH'],
  [/(mount|mt).*cook.*helic.*glacier/i,'MCGL'],
  [/(mount|mt).*cook.*scenic/i,'MCOH'],
  [/aspiring/i,'ASP'],
  [/queenstown.*local.*scenic/i,'QNLS'],
  [/branches/i,'BRA'],
  [/heliski/i,'MCHS'],
  [/ski.*tasman/i,'STT'],
  [/^charter/i,'CHT']
];
function _rzProduct(p){var s=String(p||'');for(var i=0;i<_RZ_PROD_MAP.length;i++){if(_RZ_PROD_MAP[i][0].test(s))return _RZ_PROD_MAP[i][1];}return _rzEsc(s);}
// Flyback products ride the return leg, so they combine onto an aircraft's flight block.
function _rzIsFlyback(code){return code==='FLB'||code==='CCF';}
// ── Per-product flight config ─────────────────────────────────────────────────
// Single source of truth for the seatmap "SLA → MC" label + loadsheet auto-fill (destination,
// default fuel, flight burn). Fuel/burn are in DISPLAY units: airvan (ga8) = LITRES, caravan = LB.
// Omitted fuel/burn → fall back to the aircraft's standard (fuelKg / burnDef).
//   short = title destination · apt = loadsheet destination ICAO · av = airvan · cv = caravan.
var _RZ_PROD_CFG={
  // Mount Cook landing flights (QN → Mt Cook): more fuel for the longer leg.
  THH:  {short:'MC',apt:'NZMC',av:{fuel:210},cv:{fuel:1000}},
  MCEXP:{short:'MC',apt:'NZMC',av:{fuel:210},cv:{fuel:1000}},
  MCGL: {short:'MC',apt:'NZMC',av:{fuel:210},cv:{fuel:1000}},
  MCHS: {short:'MC',apt:'NZMC',av:{fuel:210},cv:{fuel:1000}},
  STT:  {short:'MC',apt:'NZMC',av:{fuel:210},cv:{fuel:1000}},
  // Mt Cook overhead scenic (QN → QN, no landing).  ⚠ airvan fuel assumed 210 L (unspecified).
  MCOH: {short:'MC',apt:'NZQN',scenic:true,av:{fuel:210,burn:150},cv:{fuel:1000,burn:600}},
  // Franz Josef landing flights (QN → Franz Josef).
  FJHH: {short:'FJ',apt:'NZFJ',av:{fuel:210},cv:{fuel:1000}},
  FJGL: {short:'FJ',apt:'NZFJ',av:{fuel:210},cv:{fuel:1000}},
  // Franz Josef overhead scenic (QN → QN, no landing).
  FJOH: {short:'FJ',apt:'NZQN',scenic:true,av:{fuel:210,burn:150},cv:{fuel:1000,burn:600}},
  // Milford fly/explore-cruise-fly (QN → Milford). Standard aircraft fuel/burn.
  FCF:  {short:'MF',apt:'NZMF'},
  FEF:  {short:'MF',apt:'NZMF'},
  // Milford overhead scenic (QN → QN, no landing).
  MFOH: {short:'MF',apt:'NZQN',scenic:true,av:{fuel:150,burn:70},cv:{fuel:800,burn:300}},
  // Branches Station — a real flight to a destination and back (not an overhead scenic). Standard
  // fuel; the pilot sets the burn-off. No ICAO for Branches, so the loadsheet dest stays Queenstown.
  BRA:  {short:'BRA',apt:'NZQN'},
  // Flyback / coach-cruise-fly return (Milford → QN). Reduced fuel applied via the Milford departure.
  FLB:  {short:'QN',apt:'NZQN'},
  CCF:  {short:'QN',apt:'NZQN'}
};
function _rzProdCfg(code){return _RZ_PROD_CFG[String(code||'').toUpperCase()]||null;}
// Destination {short, apt, scenic} for the seatmap label / loadsheet dest. null if unknown.
function _rzProductDest(code){var c=_rzProdCfg(code);return c?{short:c.short,apt:c.apt,scenic:!!c.scenic}:null;}
// Departure GROUPING code: same destination + time + aircraft = one flight, so bookings to the same
// place combine even if they're different products (e.g. THH + STT both to Mt Cook). Flybacks keep
// their own code (special return-leg handling). Falls back to the product code when unknown.
function _rzGroupDest(prod){if(_rzIsFlyback(prod))return prod;var c=_rzProdCfg(prod);return (c&&c.short)?c.short:prod;}
function _rzDepKey(ac,start,prod){return ac+'|'+start+'|'+_rzGroupDest(prod);}
// ── Maintenance status for scheduling ──────────────────────────────────────────
// Hours to the next check (nextCheck − current TTIS). Negative = into the allowed extension.
function _rzMaintRunHrs(ac){try{return (typeof maintToRun==='function')?maintToRun(ac):null;}catch(e){return null;}}
// Per-type figures: a standard return flight's hours, the extension limit, and a 0.5h reserve kept
// for the ferry to maintenance. Airvan: 1.2h return, −5.0 limit. Caravan/SDB: 1.1h return, −10.0.
var _RZ_MX_FLT={airvan:1.2,caravan:1.1};
function _rzMaintAirvan(ac){var sp=(typeof _acSpec==='function')?_acSpec(ac):null;return !!(sp&&sp.layout==='ga8');}
function _rzMaintFloor(ac){return _rzMaintAirvan(ac)?-4.5:-9.5;}   // extension limit + 0.5h ferry reserve
function _rzMaintFltHrs(ac){return _rzMaintAirvan(ac)?_RZ_MX_FLT.airvan:_RZ_MX_FLT.caravan;}
// 'block' = a standard return wouldn't leave the 0.5h ferry reserve (don't schedule); 'warn' = under
// 5h to the check (amber); else null. Flight-aware: airvan at −3.2 can still do a 1.2h Milford (→ −4.4,
// inside −4.5), but −3.4 can't.
function _rzMaintLevel(ac){
  var tr=_rzMaintRunHrs(ac);if(tr==null)return null;
  if(tr-_rzMaintFltHrs(ac)<_rzMaintFloor(ac))return 'block';
  if(tr<5)return 'warn';
  return null;
}
function _rzMaintTip(ac){var tr=_rzMaintRunHrs(ac);if(tr==null)return '';var lv=_rzMaintLevel(ac);if(!lv)return '';return (lv==='block'?'⚠ NO MORE FLIGHTS — ':'⚠ Maintenance due soon — ')+tr.toFixed(1)+'h to next check';}

// ── Editable standard fuels & burns (per destination) ────────────────────────
// The hardcoded _RZ_PROD_CFG above gives the built-in defaults. S._rzFuelOv holds the
// owner's per-destination overrides (Admin ▸ Settings ▸ Fuels), persisted to ts_settings
// (key 'rz_fuel_ov') so every device shares them. A destination is keyed by short+apt+scenic
// so a "landing" route and its "overhead scenic" sibling stay separate rows.
var _RZ_DEST_NAMES={MC:'Mount Cook',FJ:'Franz Josef',MF:'Milford',BRA:'Branches Station',QN:'Flyback / Queenstown'};
function _rzDestKey(short,apt,scenic){return String(short||'')+'|'+String(apt||'')+'|'+(scenic?'1':'0');}
// Distinct destination profiles derived from _RZ_PROD_CFG (one editable row each).
function _rzDestProfiles(){
  var seen={},out=[];
  Object.keys(_RZ_PROD_CFG).forEach(function(code){
    var c=_RZ_PROD_CFG[code];var key=_rzDestKey(c.short,c.apt,!!c.scenic);
    if(!seen[key]){seen[key]={key:key,short:c.short,apt:c.apt,scenic:!!c.scenic,codes:[],def:c};out.push(seen[key]);}
    seen[key].codes.push(code);
  });
  return out;
}
function _rzDestLabel(p){
  var nm=_RZ_DEST_NAMES[p.short]||p.short;
  if(p.short==='BRA'||p.short==='QN')return nm;
  return nm+(p.scenic?' — overhead scenic':' — landing');
}
// Effective {av,cv} fuel/burn for a product: owner override wins over the built-in default.
function _rzEffCfg(code){
  var c=_rzProdCfg(code)||{};
  var key=_rzDestKey(c.short,c.apt,!!c.scenic);
  var ov=(S._rzFuelOv||{})[key]||{};
  function merge(t){
    var b=c[t]||{},o=ov[t]||{};
    var f=(o.fuel!=null&&o.fuel!=='')?o.fuel:(b.fuel!=null?b.fuel:null);
    var br=(o.burn!=null&&o.burn!=='')?o.burn:(b.burn!=null?b.burn:null);
    return {fuel:f,burn:br};
  }
  return {short:c.short,apt:c.apt,scenic:!!c.scenic,av:merge('av'),cv:merge('cv')};
}
// Default loaded fuel (kg) for a product on an aircraft — override/product default else aircraft standard.
function _rzProdFuelKg(code,acId){var a=_acSpec(acId);if(!a)return null;var c=_rzEffCfg(code);var u=(a.layout==='ga8')?c.av:c.cv;if(u&&u.fuel!=null)return toKg(u.fuel,acId);return a.fuelKg;}
// Flight burn in DISPLAY units (L airvan / lb caravan) for a product — null = use aircraft burnDef.
function _rzProdBurnDisp(code,acId){var a=_acSpec(acId);if(!a)return null;var c=_rzEffCfg(code);var u=(a.layout==='ga8')?c.av:c.cv;if(u&&u.burn!=null)return u.burn;return null;}
function _rzFuelOvSave(){
  try{if(typeof lsSet==='function')lsSet('ts_rz_fuel_ov',S._rzFuelOv||{});}catch(e){}
  if(typeof sbMergeSave==='function')sbMergeSave('rz_fuel_ov',S._rzFuelOv||{},function(m){S._rzFuelOv=m;try{lsSet&&lsSet('ts_rz_fuel_ov',m);}catch(e){}}).then(function(r){if(r===null&&typeof toast==='function')toast('Fuel defaults did not save to the server — check connection.','warn');});
}
function _rzFuelOvLoad(){
  try{var cch=lsGet('ts_rz_fuel_ov');if(cch&&typeof cch==='object')S._rzFuelOv=cch;}catch(e){}
  try{fetch(SB+'/rest/v1/ts_settings?key=eq.rz_fuel_ov&select=value',{headers:SH}).then(function(r){return r.ok?r.json():[];}).then(function(rows){
    var v=rows&&rows[0]&&rows[0].value;if(typeof v==='string'){try{v=JSON.parse(v);}catch(e){v=null;}}
    if(v&&typeof v==='object'){S._rzFuelOv=v;try{lsSet('ts_rz_fuel_ov',v);}catch(e){}if(typeof _sbSetBase==='function')_sbSetBase('rz_fuel_ov',v);render();}
  }).catch(function(){});}catch(e){}
}
// Set/clear one override field. Empty value reverts that field to its built-in default.
window.rezdyFuelOvSet=function(key,type,field,val){
  S._rzFuelOv=S._rzFuelOv||{};
  var o=S._rzFuelOv[key]||(S._rzFuelOv[key]={});
  var t=o[type]||(o[type]={});
  var v=String(val==null?'':val).trim();
  if(v===''){delete t[field];}
  else{var n=parseFloat(v);if(isNaN(n)||n<0){if(typeof toast==='function')toast('Enter a number','warn');return;}t[field]=n;}
  if(o.av&&!Object.keys(o.av).length)delete o.av;
  if(o.cv&&!Object.keys(o.cv).length)delete o.cv;
  if(!Object.keys(o).length)delete S._rzFuelOv[key];
  _rzFuelOvSave();render();
};
window.rezdyFuelOvResetRow=function(key){if(S._rzFuelOv){delete S._rzFuelOv[key];_rzFuelOvSave();render();}};
// Admin ▸ Settings ▸ Fuels — editable table of standard fuels & burns per destination.
function renderAdminFuels(){
  if(!S._rzFuelOvLoaded){S._rzFuelOvLoaded=true;_rzFuelOvLoad();}
  var ov=S._rzFuelOv||{};
  var fcell=function(p,type,field,unit){
    var key=p.key,o=ov[key]||{},to=o[type]||{};
    var def=p.def&&p.def[type]?p.def[type][field]:null;
    var ph=(def!=null)?String(def):(field==='fuel'?'std':'pilot');
    var cur=(to[field]!=null)?to[field]:'';
    var edited=(to[field]!=null);
    return '<input type="number" min="0" step="any" value="'+cur+'" placeholder="'+ph+'" '+
      'onchange="window.rezdyFuelOvSet(\''+key+'\',\''+type+'\',\''+field+'\',this.value)" '+
      'style="width:64px;font-size:13px;padding:5px 6px;background:var(--card2);color:var(--text);border:1px solid '+(edited?'var(--acc)':'var(--border2)')+';border-radius:6px;text-align:right">';
  };
  var h='<div class="card"><div class="st" style="margin-bottom:6px">Standard Fuels &amp; Burns</div>'+
    '<div style="font-size:12px;color:var(--text3);margin-bottom:12px;line-height:1.5">Default <strong>loaded fuel</strong> and <strong>flight burn</strong> applied when a loadsheet is created from the seatmap, per destination and aircraft type. Airvan values are <strong>litres</strong>; Caravan values are <strong>pounds</strong>. Leave a box blank to use the built-in default (shown greyed) — blank fuel = aircraft standard tank, blank burn = pilot sets it. A manually typed fuel on a loadsheet always overrides these.</div>';
  h+='<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;min-width:560px;font-size:13px">';
  h+='<thead><tr style="text-align:left;color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:.05em">'+
    '<th style="padding:6px 8px">Destination</th>'+
    '<th style="padding:6px 8px;text-align:right" colspan="2">Airvan (L)</th>'+
    '<th style="padding:6px 8px;text-align:right" colspan="2">Caravan (lb)</th>'+
    '<th></th></tr>'+
    '<tr style="color:var(--text3);font-size:10px"><th></th>'+
    '<th style="padding:0 8px 6px;text-align:right">Fuel</th><th style="padding:0 8px 6px;text-align:right">Burn</th>'+
    '<th style="padding:0 8px 6px;text-align:right">Fuel</th><th style="padding:0 8px 6px;text-align:right">Burn</th><th></th></tr></thead><tbody>';
  _rzDestProfiles().forEach(function(p){
    var rowEdited=!!ov[p.key];
    h+='<tr style="border-top:1px solid var(--border2)">'+
      '<td style="padding:8px"><div style="font-weight:700;color:var(--text1)">'+_rzEsc(_rzDestLabel(p))+'</div>'+
        '<div style="font-size:10px;color:var(--text3)">'+_rzEsc(p.apt)+' · '+_rzEsc(p.codes.join(', '))+'</div></td>'+
      '<td style="padding:8px;text-align:right">'+fcell(p,'av','fuel')+'</td>'+
      '<td style="padding:8px;text-align:right">'+fcell(p,'av','burn')+'</td>'+
      '<td style="padding:8px;text-align:right">'+fcell(p,'cv','fuel')+'</td>'+
      '<td style="padding:8px;text-align:right">'+fcell(p,'cv','burn')+'</td>'+
      '<td style="padding:8px;text-align:center">'+(rowEdited?'<button title="Reset this row to defaults" onclick="window.rezdyFuelOvResetRow(\''+p.key+'\')" style="background:none;border:none;color:var(--acc);cursor:pointer;font-size:11px;text-decoration:underline">reset</button>':'')+'</td>'+
      '</tr>';
  });
  h+='</tbody></table></div>';
  h+='<div style="font-size:11px;color:var(--text3);margin-top:10px">Boxes with a coloured border are custom overrides. Changes save to the cloud and apply on every device.</div>';
  h+='</div>';
  return h;
}
// ─────────────────────────────────────────────────────────────────────────────
//  PICKUP LOCATIONS — editable master list (name · address · minutes-before-departure).
//  Seeded from the Rezdy pickup list; persisted to ts_settings 'rz_pickup_locs'
//  (localStorage cache 'ts_rz_pickup_locs') and shared/live-synced across devices.
//  Edited from Operations ▸ Pickups ▸ 📍 Locations. View-only for non-rezdy users.
// ─────────────────────────────────────────────────────────────────────────────
var _RZ_PICKUP_LOC_SEED=[{"name":"Self Drive: No pickup required","address":"True South Flights Hawthorne Drive, Frankton, Queenstown, New Zealand","min":30,"lat":"-45.0255413","lng":"168.7429546"},{"name":"Abba Court Motel = Creeksyde Bus Stop","address":"Queenstown Holiday Park Creeksyde Robins Road, Queenstown, New Zealand","min":50,"lat":"-45.0257711","lng":"168.6604495"},{"name":"Alpine Meadows Fernhill = Cameron Place Bus Stop","address":"Cameron Place, Fernhill, Queenstown, New Zealand","min":55,"lat":"-45.0374","lng":"168.6358695"},{"name":"Absoloot Hostel = The Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"Adventure Queenstown Hostel = Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"Alexis Motel & Apartments = Copthorne Bus Stop","address":"Copthorne Hotel & Apartments Queenstown Lakeview Frankton Road, Queenstown, New Zealand","min":45},{"name":"Alpine Lodge = Station Building","address":"The Station Building Duke Street, Queenstown, New Zealand","min":50,"lat":"-45.0308496","lng":"168.659764"},{"name":"Alpine Village = Battery Hill Bus Stop","address":"Battery Hill, Queenstown, New Zealand","min":45,"lat":"-45.021629","lng":"168.7027"},{"name":"Amity Apartments = Millennium Hotel Driveway","address":"Millenium, Queenstown, New Zealand","min":45},{"name":"Aspen Lodge = Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"Asure Queenstown Gateway Apartments = Frankton Bus Shelter","address":"Frankton Bus Interchange, Frankton, Queenstown, New Zealand","min":35},{"name":"Autoline Motel = Millennium Hotel Driveway","address":"Millennium Hotel Queenstown Frankton Road, Queenstown, New Zealand","min":45,"lat":"-45.0336074","lng":"168.6676191"},{"name":"Azur","address":"Azur Luxury Lodge MacKinnon Terrace, Sunshine Bay, Queenstown, New Zealand","min":60,"lat":"-45.0442482","lng":"168.6276678"},{"name":"Base Backpackers = The Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"Battery Hill Bus Stop","address":"Battery Hill, Queenstown, New Zealand","min":45,"lat":"-45.021629","lng":"168.7027"},{"name":"Bella Vista Queenstown = Creeksyde Bus Stop","address":"Queenstown Holiday Park & Motels Creeksyde Robins Road, Queenstown, New Zealand","min":50},{"name":"Black Sheep Backpackers = Millennium Hotel Driveway","address":"Millennium Hotel Queenstown Frankton Road, Queenstown, New Zealand","min":45,"lat":"-45.0336074","lng":"168.6676191"},{"name":"Blue Peaks = Holiday Inn Express & Suites","address":"Holiday Inn Express & Suites Queenstown, an IHG Hotel Stanley And Sydney Street, Queenstown, New Zealand","min":45},{"name":"Mantra The Point = Colonial Village/Pounamu Bus Stop","address":"Colonial Village Motel Frankton Road, Queenstown, New Zealand","min":45},{"name":"Browns Boutique Hotel = Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"Cable Lane Apartments at Five Mile = Crown Pub Car Park","address":"The Crown Pub and Beer Garden Murchison Road, Frankton, Queenstown, New Zealand","min":35,"lat":"-45.0141592","lng":"168.7435054"},{"name":"Caples Court = Holiday Inn Express & Suites","address":"Holiday Inn Express & Suites Queenstown, an IHG Hotel Sydney Street, Queenstown, New Zealand","min":45},{"name":"Central Private Hotel by Naumi Hotels = Holiday Inn Express & Suites","address":"Holiday Inn Express & Suites Queenstown, an IHG Hotel Sydney Street, Queenstown, New Zealand","min":45},{"name":"Central Queenstown = The Station Building Bus Stop","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"Colonial Village Motel","address":"Colonial Village Motel Frankton Road, Queenstown, New Zealand","min":45,"lat":"-45.0339854","lng":"168.6763353"},{"name":"Copthorne Hotel & Apartments Queenstown Lakeview","address":"Copthorne Hotel & Apartments Queenstown Lakeview Frankton Road, Queenstown, New Zealand","min":45},{"name":"Copthorne Hotel and Resort Queenstown Lakefront = Millennium Hotel Driveway","address":"Millennium Hotel Queenstown Frankton Road, Queenstown, New Zealand","min":45},{"name":"Coronet View Apartments = Creeksyde Bus Stop","address":"Queenstown Holiday Park & Motels Creeksyde Robins Road, Queenstown, New Zealand","min":50},{"name":"Creeksyde Holiday Park = Creeksyde Bus Stop","address":"Queenstown Holiday Park Creeksyde Robins Road, Queenstown, New Zealand","min":50,"lat":"-45.0257711","lng":"168.6604495"},{"name":"Cranbury Court & Apartments = Creeksyde Bus Stop","address":"Queenstown Holiday Park & Motels Creeksyde Robins Road, Queenstown, New Zealand","min":50},{"name":"Crowne Plaza Queenstown By IHG","address":"Crowne Plaza Queenstown, an IHG Hotel Beach Street, Queenstown, New Zealand","min":55,"lat":"-45.03307160000001","lng":"168.6571113"},{"name":"DoubleTree by Hilton Queenstown","address":"DoubleTree by Hilton Hotel Queenstown Peninsula Road, Kawarau Village, Kawarau Falls, New Zealand","min":35,"lat":"-45.0285524","lng":"168.7292757"},{"name":"Driftaway Queenstown","address":"Driftaway Queenstown Lake Avenue, Frankton, Queenstown, New Zealand","min":35,"lat":"-45.0171351","lng":"168.7261996"},{"name":"Esplanade Queenstown = QTHotel Bus Stop","address":"38-54 Lake Esplanade, Queenstown, New Zealand","min":50,"lat":"-45.0351521","lng":"168.652252"},{"name":"Earnslaw Lodge = Copthorne Bus Stop","address":"Copthorne Hotel & Apartments Queenstown Lakeview Frankton Road, Queenstown, New Zealand","min":45},{"name":"Eichardt's Private Hotel","address":"Eichardt's Private Hotel Marine Parade, Queenstown, New Zealand","min":50},{"name":"Fernhill Road/Cameron Place Bus Stop","address":"Cameron Place, Fernhill, Queenstown, New Zealand","min":55,"lat":"-45.0374","lng":"168.6358695"},{"name":"Flaming Kiwi Backpackers","address":"Queenstown Holiday Park & Motels Creeksyde Robins Road, Queenstown, New Zealand","min":50},{"name":"Four Seasons Motel = Holiday Inn Express & Suites","address":"Holiday Inn Express & Suites Queenstown, an IHG Hotel Sydney Street, Queenstown, New Zealand","min":45},{"name":"Frankton Bus Shelter","address":"Frankton Terminus, Frankton, Queenstown, New Zealand","min":35},{"name":"Garden Court Suites = Millennium Hotel Driveway","address":"Millennium Hotel Queenstown Frankton Road, Queenstown, New Zealand","min":45,"lat":"-45.0336074","lng":"168.6676191"},{"name":"Haka House Queenstown Lakefront = Bus Stop out front","address":"Haka House Queenstown Lakefront Lake Esplanade, Queenstown, New Zealand","min":55,"lat":"-45.0362872","lng":"168.6498472"},{"name":"Haka Lodge = The Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"Hallenstein Street Bus Stop (St Joseph's School)","address":"Hallenstein Street, Queenstown, New Zealand","min":45,"lat":"-45.029141","lng":"168.6639843"},{"name":"Hampshire Holiday Parks (Queenstown Lakeview) = Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"Heartland Hotel Queenstown","address":"Heartland Hotel Queenstown Stanley Street, Queenstown, New Zealand","min":45},{"name":"Hensman Road/The Rees Bus Stop","address":"Hensman Road, Queenstown, New Zealand","min":45,"lat":"-45.0302361","lng":"168.6818609"},{"name":"Hidden Lodge Queenstown = Williams Street Bus Stop","address":"Williams Street, Sunshine Bay, Queenstown, New Zealand","min":55,"lat":"-45.0439617","lng":"168.6248006"},{"name":"Highview Apartments","address":"Highview Queenstown Apartments Thompson Street, Queenstown, New Zealand","min":55,"lat":"-45.0357513","lng":"168.6484527"},{"name":"Hilton Queenstown Resort & Spa","address":"Hilton Queenstown Resort & Spa Peninsula Road, Kawarau Heights, Queenstown, New Zealand","min":35,"lat":"-45.02876819999999","lng":"168.7283052"},{"name":"Hippo Lodge = The Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"Holiday Inn Express & Suites Queenstown By IHG","address":"Holiday Inn Express & Suites Queenstown, an IHG Hotel Sydney Street, Queenstown, New Zealand","min":45},{"name":"Holiday Inn Queenstown Frankton Road by IHG","address":"Sherwood Manor and Gold Ridge Hotels, Queenstown, New Zealand","min":45},{"name":"Holiday Inn Queenstown Remarkables Park by IHG = Self-Walk","address":"True South Flights Hawthorne Drive, Frankton, Queenstown, New Zealand","min":30,"lat":"-45.0255413","lng":"168.7429546"},{"name":"Hulbert House Boutique Lodging = Hallenstein Street Bus Stop (St Joseph's School)","address":"Hallenstein Street, Queenstown, New Zealand","min":45,"lat":"-45.029141","lng":"168.6639843"},{"name":"Hurley's of Queenstown = Millennium Hotel Driveway","address":"Millenium, Queenstown, New Zealand","min":45},{"name":"Kamana Lakehouse","address":"Kamana Lakehouse Fernhill Road, Fernhill, Queenstown, New Zealand","min":55,"lat":"-45.0388183","lng":"168.6337507"},{"name":"Lakefront Apartments = QT Hotel","address":"38-54 Lake Esplanade, Queenstown, New Zealand","min":50},{"name":"Lakeside Motel = QT Hotel","address":"38-54 Lake Esplanade, Queenstown, New Zealand","min":50,"lat":"-45.0351521","lng":"168.652252"},{"name":"Larch Hill Bus Stop Frankton Road","address":"Larch Hill Place, Queenstown, New Zealand","min":45,"lat":"-45.0261208","lng":"168.6929879"},{"name":"Lomond Lodge = Station Building Bus Stop","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"La Quinta by Wyndham Remarkables Park Queenstown","address":"LQ Queenstown Hotel Mountain Ash Drive, Remarkables Park, Queenstown, New Zealand","min":30},{"name":"Lylo (Jucy Snooze) = The Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"Marina Apartments","address":"Marina Apartments (formerly know as Mantra Marina) Frankton Road, Frankton, Queenstown, New Zealand","min":45,"lat":"-45.0172391","lng":"168.7179343"},{"name":"Mercure Queenstown Resort","address":"Mercure Queenstown Resort, Private Bag 50071 Sainsbury Road, Fernhill, Queenstown, New Zealand","min":55,"lat":"-45.0390668","lng":"168.6384533"},{"name":"Melbourne Lodge = Hallenstein Street Bus Stop (St Joseph's School)","address":"Hallenstein Street, Queenstown, New Zealand","min":45,"lat":"-45.029141","lng":"168.6639843"},{"name":"Millennium Hotel Queenstown","address":"Millennium Hotel Queenstown Frankton Road, Queenstown, New Zealand","min":45,"lat":"-45.0336074","lng":"168.6676191"},{"name":"Mi-Pad = The Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50,"lat":"-45.0308657","lng":"168.6602147"},{"name":"Nomads Queenstown = The Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"Novotel Queenstown Lakeside","address":"Novotel Queenstown Lakeside Marine Parade, And, Queenstown, New Zealand","min":50},{"name":"Oaks Club Suits = Colonial Village/Pounamu Bus Stop","address":"Colonial Village Motel Frankton Road, Queenstown, New Zealand","min":45,"lat":"-45.0339854","lng":"168.6763353"},{"name":"Oaks Shores Resort = Hensman Road Bus Stop","address":"Hensman Road, Queenstown, New Zealand","min":45,"lat":"-45.0302361","lng":"168.6818609"},{"name":"Ora Retreat","address":"Williams Street, Sunshine Bay, Queenstown, New Zealand","min":55,"lat":"-45.0439617","lng":"168.6248006"},{"name":"Peppers Beacon Resort = QT Bus Stop","address":"38-54 Lake Esplanade, Queenstown, New Zealand","min":50,"lat":"-45.0352241","lng":"168.652131"},{"name":"Pinewood Lodge = Creeksyde Bus Stop","address":"Queenstown Holiday Park & Motels Creeksyde Robins Road, Queenstown, New Zealand","min":50},{"name":"Platinum Apartments = Heritage Hotel Bus Stop","address":"Heritage Resort, Queenstown, New Zealand","min":55,"lat":"-45.03787","lng":"168.643041"},{"name":"Queenstown Airport (ZQN)","address":"Queenstown Airport (ZQN) Sir Henry Wigley Drive, Frankton, Queenstown, New Zealand","min":35,"lat":"-45.0216659","lng":"168.7394076"},{"name":"Queenstown House Boutique Bed & Breakfast & Apartments","address":"Hallenstein Street, Queenstown, New Zealand","min":45,"lat":"-45.029141","lng":"168.6639843"},{"name":"QT Queenstown","address":"QT Queenstown Lake Esplanade, Queenstown, New Zealand","min":55,"lat":"-45.0351521","lng":"168.652252"},{"name":"Queenstown Motel Apartments = Millennium Hotel Driveway","address":"Millennium Hotel Queenstown Frankton Road, Queenstown, New Zealand","min":45,"lat":"-45.0336074","lng":"168.6676191"},{"name":"Queenstown Park Boutique Hotel","address":"Queenstown Park Boutique Hotel Robins Road, Queenstown, New Zealand","min":50,"lat":"-45.02799929999999","lng":"168.6599139"},{"name":"Quest Queenstown = Self-Walk","address":"True South Flights Hawthorne Drive, Frankton, Queenstown, New Zealand","min":30,"lat":"-45.0255413","lng":"168.7429546"},{"name":"Ramada Queenstown Central = Millennium Hotel Driveway","address":"Millennium Hotel Queenstown Frankton Road, Queenstown, New Zealand","min":45},{"name":"Ramada Remarkables Park = Self-Walk","address":"True South Flights Hawthorne Drive, Frankton, Queenstown, New Zealand","min":30},{"name":"Reavers Lodge = Creeksyde Bus Stop","address":"Queenstown Holiday Park Creeksyde Robins Road, Queenstown, New Zealand","min":50,"lat":"-45.0257711","lng":"168.6604495"},{"name":"Rendezvous Heritage Hotel Queenstown","address":"Heritage Resort, Queenstown, New Zealand","min":55},{"name":"Ridge Resort = Sherwood Bus Stop","address":"Sherwood Manor and Gold Ridge Hotels, Queenstown, New Zealand","min":45},{"name":"Roki Collection = Crowne Plaza Hotel Bus Stop","address":"Crowne Plaza Queenstown by IHG Beach Street, Queenstown, New Zealand","min":50,"lat":"-45.03307160000001","lng":"168.6571113"},{"name":"Sherwood Manor = Sherwood Bus Stop","address":"Sherwood Manor and Gold Ridge Hotels, Queenstown, New Zealand","min":45},{"name":"Sherwood Queenstown","address":"Sherwood Manor and Gold Ridge Hotels, Queenstown, New Zealand","min":45,"lat":"-45.023644","lng":"168.698189"},{"name":"Sofitel Queenstown Hotel and Spa","address":"Sofitel Queenstown Hotel and Spa Duke Street, Queenstown, New Zealand","min":50,"lat":"-45.0309489","lng":"168.6590705"},{"name":"Southern Laughter Backpackers = The Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"Spinnaker Bay = Colonial Village/Pounamu Bus Stop","address":"Colonial Village Motel Frankton Road, Queenstown, New Zealand","min":45,"lat":"-45.0339854","lng":"168.6763353"},{"name":"St James Apartments = The Station Building Bus Stop","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50,"lat":"-45.0308657","lng":"168.6602147"},{"name":"Hotel St Moritz Queenstown","address":"Hotel St Moritz Queenstown - MGallery Brunswick Street, Queenstown, New Zealand","min":55,"lat":"-45.0341811","lng":"168.6534114"},{"name":"Sudima Queenstown Five Mile","address":"Sudima Queenstown Five Mile 22 Grant Road, Frankton, Queenstown, New Zealand","min":35},{"name":"Swiss-Belsuites Pounamu Apartments = Colonial Village/Pounamu Bus Stop","address":"Colonial Village Motel Frankton Road, Queenstown, New Zealand","min":45,"lat":"-45.0339854","lng":"168.6763353"},{"name":"Tahuna Pod Hostel = The Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"The Carlin Boutique Hotel = Hallenstien Street Bus Stop (St Joseph's School)","address":"Hallenstein Street, Queenstown, New Zealand","min":45,"lat":"-45.029141","lng":"168.6639843"},{"name":"The Chalet Queenstown = The Millennium Hotel Driveway","address":"Millenium, Queenstown, New Zealand","min":45},{"name":"The Dairy = The Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"The Glebe = The Station Building","address":"Holiday Inn Express & Suites Queenstown by IHG Stanley And Sydney Street, Queenstown, New Zealand","min":50,"lat":"-45.033007","lng":"168.665904"},{"name":"The Lodges = Crowne Plaza Hotel Bus Stop","address":"Crowne Plaza Queenstown, an IHG Hotel Beach Street, Queenstown, Queenstown, New Zealand","min":50,"lat":"-45.03307160000001","lng":"168.6571113"},{"name":"The Lofts Apartments = The Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50,"lat":"-45.0308657","lng":"168.6602147"},{"name":"The Rees Hotel","address":"The Rees Hotel, Luxury Apartments & Lakeside Residences Frankton Road, Queenstown, New Zealand","min":45,"lat":"-45.0284182","lng":"168.6879425"},{"name":"The Waterfront = Crowne Plaza Bus Stop","address":"Crowne Plaza Queenstown Beach Street, Queenstown, New Zealand","min":55},{"name":"The Spire = Novotel","address":"Novotel Queenstown Lakeside Marine Parade, Queenstown, New Zealand","min":50},{"name":"The Whistler Queenstown = The Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50},{"name":"The Embassy B&B = Marina Bus Stop","address":"Marina Heights, Frankton, Queenstown, New Zealand","min":45},{"name":"Turner Heights = The Station Building","address":"The Station - Home of Adventure in Queenstown Shotover Street, Queenstown, New Zealand","min":50,"lat":"-45.0308657","lng":"168.6602147"},{"name":"Twin Peaks B&B = Battery Hill Bus Stop","address":"Battery Hill, Queenstown, New Zealand","min":45,"lat":"-45.021629","lng":"168.7027"},{"name":"Villa del Lago = Colonial Village/Pounamu Bus Stop","address":"Colonial Village Motel Frankton Road, Queenstown, New Zealand","min":45,"lat":"-45.0339854","lng":"168.6763353"},{"name":"Wyndham Garden Hotel = Self-Walk","address":"True South Flights Hawthorne Drive, Frankton, Queenstown, New Zealand","min":30,"lat":"-45.0255413","lng":"168.7429546"},{"name":"YHA Lakefront = YHA Bus Stop","address":"YHA Queenstown Lakefront Backpackers Lake Esplanade, Queenstown, New Zealand","min":55}];
function _rzPickupLocsLoad(){
  if(S._rzPickupLocsLoaded)return;S._rzPickupLocsLoaded=true;
  try{var cch=lsGet('ts_rz_pickup_locs');if(Array.isArray(cch))S._rzPickupLocs=cch;}catch(e){}
  try{fetch(SB+'/rest/v1/ts_settings?key=eq.rz_pickup_locs&select=value',{headers:SH}).then(function(r){return r.ok?r.json():[];}).then(function(rows){
    var v=rows&&rows[0]&&rows[0].value;if(typeof v==='string'){try{v=JSON.parse(v);}catch(e){v=null;}}
    if(Array.isArray(v)){S._rzPickupLocs=v;try{lsSet('ts_rz_pickup_locs',v);}catch(e){}if(typeof _sbSetBase==='function')_sbSetBase('rz_pickup_locs',v);render();}
    else if(!Array.isArray(S._rzPickupLocs)){
      // First run on this account: seed the cloud from the built-in list so every device shares it.
      S._rzPickupLocs=_RZ_PICKUP_LOC_SEED.map(function(o){return {name:o.name,address:o.address,min:o.min,lat:o.lat||'',lng:o.lng||''};});
      try{lsSet('ts_rz_pickup_locs',S._rzPickupLocs);}catch(e){}
      _rzPickupLocsSave(true);render();
    }
  }).catch(function(){});}catch(e){}
}
function _rzPickupLocsSave(silent){
  try{if(typeof lsSet==='function')lsSet('ts_rz_pickup_locs',S._rzPickupLocs||[]);}catch(e){}
  if(typeof sbMergeSave==='function')sbMergeSave('rz_pickup_locs',S._rzPickupLocs||[],function(m){S._rzPickupLocs=m;try{lsSet&&lsSet('ts_rz_pickup_locs',m);}catch(e){}}).then(function(r){if(r===null&&!silent&&typeof toast==='function')toast('Pickup locations did not save to the server — check connection.','warn');});
}
window.rezdyPickupLocSet=function(i,field,val){
  if(!Array.isArray(S._rzPickupLocs))return;var o=S._rzPickupLocs[i];if(!o)return;
  if(field==='min'){var v=String(val==null?'':val).trim();if(v===''){o.min='';}else{var n=parseInt(v,10);if(isNaN(n)||n<0){if(typeof toast==='function')toast('Enter minutes before departure (a whole number)','warn');return;}o.min=n;}}
  else{o[field]=String(val==null?'':val);}
  _rzPickupLocsSave(); // no re-render: the live input already holds the typed value
};
window.rezdyPickupLocAdd=function(){S._rzPickupLocs=Array.isArray(S._rzPickupLocs)?S._rzPickupLocs:[];S._rzPickupLocs.unshift({name:'',address:'',min:'',lat:'',lng:''});_rzPickupLocsSave();render();};
window.rezdyPickupLocDel=function(i){if(!Array.isArray(S._rzPickupLocs))return;var o=S._rzPickupLocs[i];if(o&&(o.name||o.address)&&!confirm('Delete pickup location "'+((o.name||o.address)||'')+'"?'))return;S._rzPickupLocs.splice(i,1);_rzPickupLocsSave();render();};
function _rzRenderPickupLocs(){
  _rzPickupLocsLoad();
  var locs=Array.isArray(S._rzPickupLocs)?S._rzPickupLocs:[];
  var can=(typeof hasRolePerm!=='function')||hasRolePerm('operations');
  var h='<div class="card">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px">'+
      '<div><div class="st" style="margin-bottom:0">Pickup Locations</div>'+
        '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+locs.length+' locations · master list, shared across devices</p></div>'+
      '<div style="display:flex;gap:6px;flex-shrink:0">'+
        (can?'<button class="btn btn-ghost" style="font-size:12px" onclick="window.rezdyPickupLocAdd()">＋ Add</button>':'')+
      '</div></div>'+
    '<div style="font-size:12px;color:var(--text3);margin-bottom:10px;line-height:1.5">Pickup point name, address, and how many <strong>minutes before departure</strong> the pickup runs. Changes save to the cloud and apply on every device.'+(can?'':' <em>(view only — you don\'t have edit permission)</em>')+'</div>'+
    '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;min-width:640px;font-size:13px">'+
    '<thead><tr style="text-align:left;color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:.05em">'+
      '<th style="padding:6px 8px">Name</th><th style="padding:6px 8px">Address</th>'+
      '<th style="padding:6px 8px;text-align:right">Mins prior</th><th></th></tr></thead><tbody>';
  if(!locs.length)h+='<tr><td colspan="4" style="padding:18px;text-align:center;color:var(--text3)">No locations yet'+(can?' — use ＋ Add.':'.')+'</td></tr>';
  var dis=can?'':' disabled';
  locs.forEach(function(o,i){
    h+='<tr style="border-top:1px solid var(--border2)">'+
      '<td style="padding:6px 8px"><input value="'+_rzEsc(o.name||'')+'"'+dis+' onchange="window.rezdyPickupLocSet('+i+',\'name\',this.value)" style="width:100%;min-width:160px;font-size:13px;padding:5px 6px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:6px"></td>'+
      '<td style="padding:6px 8px"><input value="'+_rzEsc(o.address||'')+'"'+dis+' onchange="window.rezdyPickupLocSet('+i+',\'address\',this.value)" style="width:100%;min-width:220px;font-size:13px;padding:5px 6px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:6px"></td>'+
      '<td style="padding:6px 8px;text-align:right"><input type="number" min="0" step="1" value="'+(o.min===''||o.min==null?'':o.min)+'"'+dis+' onchange="window.rezdyPickupLocSet('+i+',\'min\',this.value)" style="width:70px;font-size:13px;padding:5px 6px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:6px;text-align:right"></td>'+
      '<td style="padding:6px 8px;text-align:center">'+(can?'<button title="Delete this location" onclick="window.rezdyPickupLocDel('+i+')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px">✕</button>':'')+'</td>'+
      '</tr>';
  });
  h+='</tbody></table></div></div>';
  return h;
}
// FLB/CCF bookings are parked in the Rezdy slot for their OUTBOUND tour time only to hold seats
// — they're actually the RETURN leg. We pull them out of that departure into their own
// "Flybacks" group (a single 1530 return for now; summer's multiple flyback runs come later).
var RZ_FLYBACK_DEP='Flybacks';
function _rzBookingIsFlyback(b){return ((b&&b.items)||[]).some(function(it){return _rzIsFlyback(_rzProduct(it&&it.product));});}
// ── Drop-offs (Transport) ─────────────────────────────────────────────────────
// Every picked-up passenger also needs DROPPING OFF on the tour's return. We model the return as a
// separate "drop-off" departure derived from the pickup departure, prefixed with '↩' (e.g. the
// 0930 pickup run → the '↩0930' drop-off run). Flybacks (FLB/CCF) are return-only, so they're
// drop-offs too (their own 'Flybacks' departure). No fixed return times — the list is reorderable.
var RZ_DROP_PREFIX='↩';
var RZ_PK_COL='#4ade80';   // pickups → green
var RZ_DROP_COL='#f59e0b'; // drop-offs → amber
function _rzDropDep(dep){return RZ_DROP_PREFIX+String(dep||'');}
function _rzIsDropDep(dep){dep=String(dep||'');return dep.charAt(0)===RZ_DROP_PREFIX||dep===RZ_FLYBACK_DEP;}
function _rzDropDepBase(dep){dep=String(dep||'');return dep.charAt(0)===RZ_DROP_PREFIX?dep.slice(1):dep;}
// Small "what aircraft did they fly on" pill for a drop-off card.
function _rzAcPill(ac){if(!ac||ac==='__none__')return '';var c=(typeof _rzAcCol==='function')?_rzAcCol(ac):'#64748b';return '<span title="Flew on '+_rzEsc(ac)+'" style="display:inline-flex;align-items:center;font-size:10px;font-weight:800;color:#fff;background:'+c+';border-radius:10px;padding:1px 7px;white-space:nowrap">✈ '+_rzEsc(String(ac).replace('ZK-',''))+'</span>';}
// Chip/heading label for a Transport departure (pickup time, '<time> ⬇' drop-off, or 'Flybacks').
function _rzTransDepLabel(dep){if(dep===RZ_FLYBACK_DEP)return 'Flybacks';if(_rzIsDropDep(dep))return _rzDropDepBase(dep)+' ⬇';return String(dep||'');}
// Default ordering value: pickups first (by time), then drop-offs (by base time +1000m), flybacks last.
function _rzTransDepSort(dep){if(dep===RZ_FLYBACK_DEP)return 100000;if(_rzIsDropDep(dep))return 10000+_rzDepMin(_rzDropDepBase(dep));return _rzDepMin(dep);}
// Sort key for a departure: real "HHMM" → minutes; the Flyback group sits at its 1530 slot.
function _rzDepSortMin(dep){if(dep===RZ_FLYBACK_DEP)return 15*60+30;return _rzDepMin(dep);}
function _rzDepCmp(a,b){var d=_rzDepSortMin(a)-_rzDepSortMin(b);return d!==0?d:String(a).localeCompare(String(b));}
// "0930" → "09:30" for the schedule grid's HH:MM parser.
function _rzHHMMcolon(s){var m=/^(\d{2})(\d{2})$/.exec(String(s||''));return m?m[1]+':'+m[2]:String(s||'');}
// Flight block duration (minutes) by product: FCF = 4.5h; FJHH / MCEXP / THH = 5h; else 2h.
function _rzProductDuration(p){var s=String(p||'').toUpperCase();if(/BRA|BRANCH/.test(s))return 30;if(/FCF|MILFORD.*FLY.*CRUISE.*FLY/.test(s))return 270;if(/\b(MCEXP|THH|STT)\b|MOUNT.?COOK|MT.?COOK|TASMAN/.test(s))return 360;if(/\bFJHH\b/.test(s))return 300;return 120;}
// Like above but returns 0 when the text names no known product (so we don't clobber a manual end).
function _rzProductCodeDuration(t){var s=String(t||'').toUpperCase();if(/BRA|BRANCH/.test(s))return 30;if(/\bFCF\b/.test(s))return 270;if(/\b(FJHH|MCEXP|THH)\b/.test(s))return 300;return 0;}
// A booking's primary departure time (first item), e.g. "0930"; "—" if none.
function _rzBookingDep(b){if(_rzBookingIsFlyback(b))return RZ_FLYBACK_DEP;var it=((b&&b.items)||[])[0]||{};return _rzDepTime(it.startTimeLocal||'')||'—';}
// Display name for a departure heading/pill: a user rename override, else 'FLB' for the flyback
// group, else the raw dep label. The product suffix is only appended for un-renamed time departures.
function _rzDepDisplay(dep){var o=(S._rzDepNames||{})[dep];if(o)return o;return dep===RZ_FLYBACK_DEP?'FLB':dep;}
function _rzDepShowProduct(dep){return !((S._rzDepNames||{})[dep])&&dep!==RZ_FLYBACK_DEP;}
window.rezdyRenameDep=function(dep){
  if(!dep)return;var _def=(dep===RZ_FLYBACK_DEP?'FLB':dep);
  var v=prompt('Rename this departure heading (blank = reset to default):',(S._rzDepNames||{})[dep]||_def);
  if(v==null)return;v=String(v).trim();
  S._rzDepNames=S._rzDepNames||{};
  if(!v||v===_def)delete S._rzDepNames[dep];else S._rzDepNames[dep]=v;
  try{if(typeof lsSet==='function')lsSet('ts_rz_depnames',S._rzDepNames);}catch(e){}
  if(typeof sbMergeSave==='function')sbMergeSave('rz_depnames',S._rzDepNames||{},function(m){S._rzDepNames=m;try{lsSet&&lsSet('ts_rz_depnames',m);}catch(e){}});
  render();
};
// Aircraft assignment comes ONLY from the auto-allocator or a user override — never parsed from
// Rezdy comments/notes (removed v26.89, per operator request).
// Self-drive bookings shouldn't go in a van.
function _rzIsSelfDrive(loc){return /self.?drive|own (car|transport|vehicle)|no pickup|no transfer|drive (your|them)self/i.test(String(loc||''));}
// Manual "self-drive / no pickup needed" override (set on the booking when a customer drives
// themselves but didn't tell us in the booking). Unlike no-show, they STAY on the flight/seatmap.
function _rzManualSelfDrive(order){return !!((S._rzSelfDrive||{})[String(order||'')]);}
// Distinct pickup locations seen across the loaded bookings — the "standard list" for the edit dropdown.
function _rzAllLocations(){var set={};(S._rezdyBookings||[]).forEach(function(b){(b.items||[]).forEach(function(it){if(it.pickup)set[String(it.pickup)]=1;});});return Object.keys(set).sort();}

// Pull a normalized booking out of a cached row (rows store payload on .data).
function _rzRow(r){return (r&&r.data)?r.data:r||{};}
// Drop marketplace activity/supplier-side duplicate bookings (e.g. the heli-hike component).
// Real customer orders all carry a "TSF…" order number; the duplicate supplier components come
// through MARKETPLACE_PREF_RATE with an auto-generated, non-TSF reference (e.g. RAFLTY0). Real
// Viator/website flights are also MARKETPLACE_PREF_RATE but keep their TSF number, so we only
// hide marketplace bookings whose order number is NOT a TSF order.
// Supplier-side marketplace duplicate (e.g. the Tasman Glacier Heli Hike component): real customer
// orders always carry a "TSF…" number; the duplicate component has an auto-generated non-TSF
// reference. We check the RAW source code (sourceCode) since the display `source` now resolves to
// the agent name (Viator/BookMe/…). Older cached rows have no sourceCode yet, so for those the
// non-TSF order number alone is the reliable signature (synced rows only — manual bookings are
// merged separately and never reach here). Returns true = drop it.
function _rzIsSupplierDup(b){
  var on=String((b&&b.orderNumber)||'');
  if(!on||/^TSF/i.test(on))return false;
  var rawCode=String((b&&b.sourceCode)||'');
  return (!rawCode||/MARKETPLACE/i.test(rawCode));
}
// The date portion of an item's start time ("2026-06-24T11:00:00" → "2026-06-24"); '' if none.
function _rzItemDate(it){var m=/^(\d{4}-\d{2}-\d{2})/.exec(String((it&&it.startTimeLocal)||''));return m?m[1]:'';}
function _rzItemOnDate(it,date){var d=_rzItemDate(it);return !d||!date||d===date;}   // keep items with no date
// When `date` is given, keep only each booking's items for THAT day. A single order can hold items
// on several dates (e.g. two Branches flights on different days); a day's view must show only that
// day's items, not every item on the order.
function _rzMapBookings(rows,date){
  var list=(rows||[]).map(_rzRow).filter(Boolean).filter(function(b){return !_rzIsSupplierDup(b);});
  if(date)list=list.map(function(b){if(!Array.isArray(b.items))return b;var f=b.items.filter(function(it){return _rzItemOnDate(it,date);});if(f.length===b.items.length)return b;var nb=Object.assign({},b);nb.items=f;return nb;});  // shallow-copy when filtering so we never mutate a shared booking object
  return list;
}
// Manually-created (walk-in / phone) bookings live alongside the Rezdy-synced ones. They're
// persisted per-date in the pickup blob (manualBk) so a Rezdy sync never wipes them. This
// re-merges the current date's manual bookings into S._rezdyBookings after any (re)load.
function _rzApplyManualBk(){
  if(!Array.isArray(S._rezdyBookings))return;
  S._rezdyBookings=S._rezdyBookings.filter(function(b){return !b._manual;});
  (S._rzManualBk||[]).forEach(function(b){if(b&&(!b._tourDate||b._tourDate===S.rezdyDate))S._rezdyBookings.push(b);});
}

// Derive the flat pickup list from the currently-loaded bookings.
function _rzPickups(){
  const out=[];const ov=S._pickupLocOverride||{};const tov=S._pickupTimeOverride||{};
  (S._rezdyBookings||[]).forEach(function(b){
    if(_rzIsCancelled(b)||_rzIsNoShow(b.orderNumber||''))return; // don't collect cancelled or no-show customers
    const _ac=_rzBookingAc(b,String(b.orderNumber||'')); // the aircraft they're flying on (for the drop-off pill)
    (b.items||[]).forEach(function(it,ii){
      if(!it.pickup)return;
      // include the item index so two same-product/same-time items in one order don't collide
      const id=String(b.orderNumber||'')+'|'+(it.product||'')+'|'+(it.startTimeLocal||'')+'|'+ii;
      const loc=(ov[id]!=null&&ov[id]!=='')?ov[id]:(it.pickup||'');
      const pdep=_rzDepTime(it.startTimeLocal||'');
      const sd=_rzIsSelfDrive(loc)||_rzManualSelfDrive(b.orderNumber||'');
      const ptime=(tov[id]!=null&&tov[id]!=='')?tov[id]:_rzDepTime(it.pickupTime||'');
      const base={order:b.orderNumber||'',customer:b.customerName||'',pax:parseInt(it.quantity,10)||1,location:loc,phone:b.phone||'',ac:_ac,selfDrive:sd};
      // Flybacks (FLB/CCF) ride the RETURN leg — there's no morning pickup, they're a DROP-OFF only
      // (fly Milford→Queenstown, then drive pax to their accommodation) under the "Flybacks" run.
      if(_rzIsFlyback(_rzProduct(it.product))){
        out.push(Object.assign({},base,{id:id,depart:RZ_FLYBACK_DEP,pickupTime:ptime,dropoff:true}));
        return;
      }
      // Morning pickup …
      out.push(Object.assign({},base,{id:id,depart:pdep,pickupTime:ptime,dropoff:false}));
      // … and the matching RETURN drop-off (self-drive pax collect their own car, so skip them).
      // The drop-off resolves its OWN location/time overrides (keyed by the '|D' id) so editing a
      // drop-off's location/time on the board sticks instead of reverting to the pickup's.
      if(!sd){var did=id+'|D';var dloc=(ov[did]!=null&&ov[did]!=='')?ov[did]:loc;var dtime=(tov[did]!=null&&tov[did]!=='')?tov[did]:'';out.push(Object.assign({},base,{id:did,location:dloc,depart:_rzDropDep(pdep),pickupTime:dtime,dropoff:true}));}
    });
  });
  // Combine runs: re-label any merged departure to its base so the whole board treats them as one run.
  if(S._rzTransMerge&&Object.keys(S._rzTransMerge).length)out.forEach(function(p){p.depart=_rzTransBase(p.depart);});
  return out;
}

// ── Combine departure runs ──────────────────────────────────────────────────
// S._rzTransMerge maps a departure A → the departure B it's been combined into. _rzPickups re-labels
// A's pickups to B at the source, so the whole board (chips, filter, vehicles, drivers) treats them
// as one run. Drag one departure chip onto another to combine.
function _rzTransBase(dep){var m=S._rzTransMerge||{},seen={};while(m[dep]!=null&&!seen[dep]){seen[dep]=1;dep=m[dep];}return dep;}
window.pickupDepDragStart=function(dep,e){S._rzDepDrag=String(dep);try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','dep:'+dep);}catch(_){}};
window.pickupDepDrop=function(targetDep,e){if(e&&e.preventDefault)e.preventDefault();var src=S._rzDepDrag;S._rzDepDrag=null;if(src==null){try{var d=e.dataTransfer&&e.dataTransfer.getData('text/plain');if(d&&d.indexOf('dep:')===0)src=d.slice(4);}catch(_){}}if(src&&String(src)!==String(targetDep))window.pickupMergeDep(src,targetDep);};
window.pickupMergeDep=function(a,b){
  a=String(a);b=String(b);if(!a||!b||a===b)return;
  S._rzTransMerge=S._rzTransMerge||{};
  // refuse to create a cycle (if b already resolves back to a)
  var base=b,seen={};while(S._rzTransMerge[base]!=null&&!seen[base]){seen[base]=1;base=S._rzTransMerge[base];}
  if(base===a)return;
  S._rzTransMerge[a]=b;
  S._pickupDepFilter=_rzTransBase(b);
  if(window.pickupSave)window.pickupSave(true);
  if(typeof toast==='function')toast('Combined runs','ok');render();
};
window.pickupUnmergeBase=function(base){
  base=String(base);var m=S._rzTransMerge||{};
  var rm=Object.keys(m).filter(function(a){return _rzTransBase(a)===base&&a!==base;});
  rm.forEach(function(a){delete m[a];});
  if(window.pickupSave)window.pickupSave(true);
  if(typeof toast==='function')toast('Separated combined runs','ok');render();
};
// Pickup-time as minutes for sorting (format "HHMM" e.g. "0930"); blank sorts last.
function _rzPkTimeVal(p){if(!p||!p.pickupTime)return 99999;var m=/^(\d{2})(\d{2})$/.exec(String(p.pickupTime));return m?(+m[1])*60+(+m[2]):99999;}
// ── default van allocation ──────────────────────────────────────────────────
// Earliest pickup time first (so a driver works straight down the list), filling Van 1 to
// capacity then flowing into Van 2, then 3 — never overloading a van.
// Hilton sits the opposite direction, so its pickups always get their own vehicle.
function _rzIsHilton(loc){return /hilton/i.test(String(loc||''));}
// Append a pickup id to a Taxi list (overflow bucket, index ≥ fleet size, 11 seats per departure).
function _rzPushTaxi(vans,pickups,id,dep){
  var nOwned=_rzVehicles().length;
  var pax=function(x){var p=_rzPickupById(pickups,x);return p?(p.pax||0):0;};
  for(var tv=nOwned;tv<vans.length;tv++){
    var tload=0;(vans[tv]||[]).forEach(function(x){var p=_rzPickupById(pickups,x);if(p&&(p.depart||'—')===dep)tload+=pax(x);});
    if(tload+pax(id)<=11){vans[tv].push(id);return;}
  }
  vans.push([id]);
}
function _rzAutoVans(pickups){
  pickups=(pickups||[]).filter(function(p){return !p.selfDrive;}); // self-drive never goes in a van
  var N=_rzVehicles().length;
  const byTime=function(a,b){return _rzPkTimeVal(a)-_rzPkTimeVal(b);};
  const vans=[];for(let i=0;i<N;i++)vans.push([]);
  // Pickups run by DEPARTURE: a whole departure is collected together. The ACTIVE vehicle set is
  // PER DEPARTURE (a van parked for the 0800 run can still drive 1200). Hilton gets its own vehicle.
  const byDep={};pickups.forEach(function(p){(byDep[p.depart||'—']=byDep[p.depart||'—']||[]).push(p);});
  Object.keys(byDep).sort().forEach(function(dep){
    var act=[];for(let i=0;i<N;i++)if(!_rzVanParked(i,dep))act.push(i);
    const grp=byDep[dep];
    const hilton=grp.filter(function(p){return _rzIsHilton(p.location);}).sort(byTime);
    const others=grp.filter(function(p){return !_rzIsHilton(p.location);}).sort(byTime);
    if(!act.length){
      // No vehicle assigned to this run → it's a TAXI list (overflow buckets). Operator drops a van
      // onto it to convert, or Auto-assign activates vehicles.
      others.concat(hilton).forEach(function(p){_rzPushTaxi(vans,pickups,p.id,dep);});
      return;
    }
    const load=[];for(let i=0;i<N;i++)load.push(0);
    let ai=0; // pointer into this departure's active-vehicle list
    const place=function(p){
      var vi=act[ai];
      if(load[vi]>0 && load[vi]+p.pax>_rzVehSeats(vi) && ai<act.length-1){ai++;vi=act[ai];}
      // if the last active vehicle is full too, spill to a Taxi list rather than overload silently
      if(ai===act.length-1 && load[vi]>0 && load[vi]+p.pax>_rzVehSeats(vi)){_rzPushTaxi(vans,pickups,p.id,dep);return;}
      vans[vi].push(p.id);load[vi]+=p.pax;
    };
    others.forEach(place);
    if(hilton.length){ if(load[act[ai]]>0 && ai<act.length-1)ai++; hilton.forEach(place); }
  });
  return vans;
}
function _rzPickupById(pickups,id){return (pickups||[]).find(function(p){return p.id===id;});}
function _rzVanPax(vanIds,pickups){return vanIds.reduce(function(s,id){const p=_rzPickupById(pickups,id);return s+(p?p.pax:0);},0);}

// Build/refresh S._pickupVans for the current date's pickups, preserving any saved arrangement.
function _rzEnsureVans(){
  const pickups=_rzPickups();
  const ids=pickups.map(function(p){return p.id;});
  const depOf={};pickups.forEach(function(p){depOf[p.id]=(p.depart||'—');});
  let vans=S._pickupVans;
  const valid=Array.isArray(vans)&&vans.length>=_rzVehicles().length&&vans.every(Array.isArray); // ≥: extra buckets = manual Taxi vans
  // First ACTIVE (non-parked) van FOR A DEPARTURE — catches new/displaced pickups of that run.
  var _faCache={};
  function _firstActiveVan(dep){if(_faCache[dep]!=null)return _faCache[dep];var fa=-1,n=_rzVehicles().length;for(var i=0;i<n;i++){if(!_rzVanParked(i,dep)){fa=i;break;}}_faCache[dep]=fa;return fa;}
  if(!valid){
    // DEFAULT for a fresh day: PARK every vehicle for every departure — each run starts as a Taxi
    // list, and the operator adds vehicles as required (drag a van onto a list, or Auto-assign).
    var _deps0={};pickups.forEach(function(p){if(!p.selfDrive)_deps0[p.depart||'—']=1;});
    S._pickupSpare=S._pickupSpare||{};
    Object.keys(_deps0).forEach(function(dep){for(var vi=0;vi<_rzVehicles().length;vi++)S._pickupSpare[_pkKey(vi,dep)]=1;});
    S._pickupVans=_rzAutoVans(pickups);
  }else{
    // keep saved placement, drop stale + self-drive ids, append any new ids to their departure's first
    // active van — or to a Taxi list when that run has no vehicle assigned (all parked).
    const sd={};pickups.forEach(function(p){if(p.selfDrive)sd[p.id]=1;});
    const placed={};
    S._pickupVans=vans.map(function(v){return v.filter(function(id){if(placed[id]||sd[id]||ids.indexOf(id)<0)return false;placed[id]=1;return true;});});
    ids.forEach(function(id){if(!placed[id]&&!sd[id]){var dep=depOf[id]||'—';var fa=_firstActiveVan(dep);if(fa<0)_rzPushTaxi(S._pickupVans,pickups,id,dep);else S._pickupVans[fa].push(id);}});
  }
  // Move any pickup whose van is parked FOR ITS departure into that departure's first active van.
  S._pickupVans.forEach(function(vanIds,vi){
    var keep=[],move=[];
    vanIds.forEach(function(id){var dep=depOf[id];if(dep!=null&&_rzVanParked(vi,dep))move.push(id);else keep.push(id);});
    if(move.length){
      S._pickupVans[vi]=keep;
      move.forEach(function(id){var dep=depOf[id]||'—';var fa=_firstActiveVan(dep);if(fa>=0&&fa!==vi&&S._pickupVans[fa])S._pickupVans[fa].push(id);else if(fa<0)_rzPushTaxi(S._pickupVans,pickups,id,dep);else S._pickupVans[vi].push(id);});
    }
  });
  // Drop any empty TRAILING Taxi vans (a converted/emptied overflow van shouldn't linger).
  while(S._pickupVans.length>_rzVehicles().length&&!(S._pickupVans[S._pickupVans.length-1]||[]).length)S._pickupVans.pop();
  if(!S._pickupCollected||typeof S._pickupCollected!=='object')S._pickupCollected={};
  return pickups;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ENTRY
// ─────────────────────────────────────────────────────────────────────────────
// Ensure the Rezdy day is set and quietly kept in lock-step with Rezdy (used by the Rezdy
// section AND by the Operations Bookings/Seatmap/Loadsheets tabs which render the same views).
function _rzEnsureDay(){if(!S.rezdyDate)S.rezdyDate=_rzInitDate();if(typeof setTimeout==='function')setTimeout(function(){if(typeof _rzBgSync==='function')_rzBgSync();},0);}
// Shared date-picker row (prev / next / today / refresh). `sub` hides Refresh on the loadsheets view.
function _rzDateRow(sub){
  if(!S.rezdyDate)S.rezdyDate=_rzInitDate();
  var _isToday=S.rezdyDate===_rzToday();
  var noRefresh=(sub==='loadsheets'||sub==='rloadsheets');
  // Sticky so the day arrows stay on screen while scrolling; the date label is a FIXED width and
  // centred so ◁ / ▷ never shift between clicks — you can tap the same spot to keep paging days.
  return '<div class="card" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;position:sticky;top:0;z-index:50;box-shadow:0 3px 10px rgba(0,0,0,.18)">'+
    '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">'+ // ◁ / date / ▷ stay together as a fixed-width unit
    '<button class="btn btn-ghost" style="font-size:15px;padding:5px 11px;line-height:1;flex-shrink:0" title="Previous day" onclick="window.rezdyShiftDate(-1)">◁</button>'+
    '<div style="position:relative;display:inline-block;width:172px;flex-shrink:0">'+
      '<span style="display:block;text-align:center;font-size:14px;font-weight:700;color:var(--text1);padding:7px 8px;border-radius:8px;background:var(--card2);border:1px solid var(--border2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📅 '+_rzDowLabel(S.rezdyDate)+'</span>'+
      '<input type="date" value="'+_rzEsc(S.rezdyDate)+'" onchange="window.rezdySetDate(this.value)" onclick="try{this.showPicker&&this.showPicker()}catch(e){}" style="position:absolute;inset:0;opacity:0;width:100%;height:100%;border:none;cursor:pointer">'+
    '</div>'+
    '<button class="btn btn-ghost" style="font-size:15px;padding:5px 11px;line-height:1" title="Next day" onclick="window.rezdyShiftDate(1)">▷</button>'+
    '</div>'+
    '<button class="btn btn-ghost" style="font-size:12px;padding:6px 12px'+(_isToday?';opacity:.45':'')+'" title="Jump to today" onclick="window.rezdySetDate(\''+_rzToday()+'\')">Today</button>'+
    (noRefresh?'':'<button class="btn btn-ghost" style="font-size:12px;margin-left:auto'+(S._rzSyncing?';opacity:.6':'')+'" onclick="window.rezdyRefresh()">'+(S._rzSyncing?'⟳ Syncing…':'⟳ Refresh from Rezdy')+'</button>')+
    '</div>';
}
function _rzModals(){return (S._rzCheckinDraft?_rzCheckinModal():'')+(S._rzNewBkDraft?_rzNewBookingModal():'')+(S._rzCloseLs?_rzCloseLsModal():'');}
// Operations-hosted views — Bookings / Seatmap / Loadsheets now live under Operations. These are
// rendered by renderOperations; they share the Rezdy date row + modals.
window.rezdyOpsBookings=function(){_rzEnsureDay();return _rzDateRow('bookings')+_rzRenderBookings()+_rzModals();};
window.rezdyOpsSeatmap=function(){_rzEnsureDay();return _rzDateRow('rseatmap')+_rzRenderManifest()+_rzModals();};
window.rezdyOpsLoadsheets=function(){_rzEnsureDay();return _rzDateRow('rloadsheets')+_rzRenderLoadsheets()+_rzModals();};
// The Rezdy section now hosts only Calendar / Pickups / My Pickups (Bookings/Seatmap/Loadsheets
// moved to Operations).
// CALENDAR — its own tier-1 section (was Rezdy ▸ Calendar). Gated on the 'calendar' permission.
function renderCalendar(){
  if(typeof hasRolePerm==='function'&&!hasRolePerm('calendar'))return '<div class="page"><div class="card" style="text-align:center;padding:40px">Not available.</div></div>';
  _rzEnsureDay();
  if(S._rzPrevSub!=='schedule'){S._schedBlocks=null;S._rezdyBookings=null;}
  S._rzPrevSub='schedule';S.rezdyTab='schedule'; // keep rezdyTab so schedule load/reload code still fires
  var _cv=(S._calView==='moves'||S._calView==='pilots')?S._calView:'schedule';
  var _toggle='<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">'+
    '<button class="sub-tab '+(_cv==='schedule'?'on':'')+'" onclick="S._calView=\'schedule\';render()">📅 Bookings</button>'+
    '<button class="sub-tab '+(_cv==='moves'?'on':'')+'" onclick="S._calView=\'moves\';render()">✈ Aircraft movements</button>'+
    '<button class="sub-tab '+(_cv==='pilots'?'on':'')+'" onclick="S._calView=\'pilots\';render()">🧑‍✈️ Pilot movements</button>'+
  '</div>';
  var _body=(_cv==='moves')?_rzRenderMovements():(_cv==='pilots')?_rzRenderPilotMovements():_rzRenderSchedule();
  return _rzDateRow('schedule')+_toggle+_body+_rzModals();
}
// GROUND — tier-1 Ground section body (Transport / My Pickups). The Transport/My Pickups/Vehicle
// Prestart selector is the tier-2 bar (renderGroundSubTabs); this just renders the chosen pickup view.
function renderGround(){
  if(typeof hasRolePerm==='function'&&!(hasRolePerm('ground')||(S.user&&S.user.superAdmin)))return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div>';
  _rzEnsureDay();
  var gt=(S._groundSecTab==='mypickups')?'mypickups':'pickups';
  S._rzPrevSub=gt;
  var body=(gt==='mypickups')?_rzRenderMyPickups():_rzRenderPickups();
  return _rzDateRow(gt)+body+_rzModals();
}
// SETTINGS ▸ OPERATIONS — tier-3 operations settings (Pickup Locations for now; more to come).
function renderAdminOperations(){
  var tabs=[{id:'pickuplocs',lbl:'📍 Pickup Locations'},{id:'vehicles',lbl:'🚐 Vehicles'},{id:'aerodromes',lbl:'🛬 Aerodromes'},{id:'fuels',lbl:'⛽ Fuels'},{id:'flightduty',lbl:'🕓 Flight & Duty'},{id:'scheduling',lbl:'💲 Scheduling'}];
  var ids=tabs.map(function(t){return t.id;});
  var sub=(ids.indexOf(S._opsSettingsTab)>=0)?S._opsSettingsTab:'pickuplocs';S._opsSettingsTab=sub;
  var bar='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'+
    tabs.map(function(t){return '<button class="sub-tab '+(sub===t.id?'on':'')+'" onclick="S._opsSettingsTab=\''+t.id+'\';render()">'+t.lbl+'</button>';}).join('')+'</div>';
  var body;
  if(sub==='vehicles')body='<div class="card" style="margin-bottom:0"><div class="st">Vehicles (pickup vans)</div><p style="font-size:12px;color:var(--text3);margin:-4px 0 12px">Name, colour and seat count for each pickup vehicle. These are the vans you allocate pickups to on Operations ▸ Ground ▸ Pickups.</p></div>'+((typeof _rzVehiclePanel==='function')?_rzVehiclePanel():'');
  else if(sub==='aerodromes')body=(typeof renderAerodromes==='function')?renderAerodromes():'';
  else if(sub==='fuels')body=(typeof renderAdminFuels==='function')?renderAdminFuels():'';
  else if(sub==='flightduty')body=(typeof renderFDLimits==='function')?renderFDLimits():'';
  else if(sub==='scheduling')body=(typeof renderSchedulingSettings==='function')?renderSchedulingSettings():'';
  else body=_rzRenderPickupLocs();
  return bar+body;
}

// ─────────────────────────────────────────────────────────────────────────────
//  (1) BOOKINGS
// ─────────────────────────────────────────────────────────────────────────────
// Booking group colour (all pax in one booking share group = order number).
// Group colours. A passenger group's colour is its POSITION among the distinct groups in the SAME
// aircraft/loadsheet, spread by the golden angle (137.5°) so neighbouring groups are always vividly
// different — operators kept confusing same/similar-coloured groups sharing one cabin. `groups` = the
// ordered distinct group list for that context (consecutive indices ⇒ maximally separated hues).
// Without a list we fall back to a per-session registry so two different groups still never collide.
function _grpHslHex(h,s,l){
  h=((h%360)+360)%360;
  var c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(((h/60)%2)-1)),m=l-c/2,r=0,g=0,b=0;
  if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}
  function _h2(v){return ('0'+Math.round((v+m)*255).toString(16)).slice(-2);}
  return '#'+_h2(r)+_h2(g)+_h2(b);
}
// Curated, contrast-ordered palette: the first colours an aircraft uses are maximally different from
// each other (blue→orange→green→magenta→purple→teal→gold→red…). Beyond it, golden-angle hues fill in.
var _GRP_PAL=['#2563eb','#ea580c','#16a34a','#c026d3','#65a30d','#db2777','#0891b2','#7c3aed','#ca8a04','#dc2626','#b45309','#0d9488'];
function _rzGroupColorIdx(i){i=i||0;return (i<_GRP_PAL.length)?_GRP_PAL[i]:_grpHslHex(210+i*137.508,0.62,0.52);}
function _rzGroupColor(s,groups){
  s=String(s||'');if(!s)return '#64748b';
  if(groups&&groups.length){var gi=groups.indexOf(s);if(gi>=0)return _rzGroupColorIdx(gi);}
  S._grpColReg=S._grpColReg||{};
  if(S._grpColReg[s]==null){S._grpColReg[s]=(S._grpColN||0);S._grpColN=(S._grpColN||0)+1;}
  return _rzGroupColorIdx(S._grpColReg[s]);
}
// Ordered distinct group list for a loadsheet form (seated + unallocated + current dispatch pax) so the
// seat grid, pax cards and unallocated pool all colour the same group identically and distinctly.
function _rzFormGrpList(f){
  var o=[];function add(g){g=String(g||'').trim();if(g&&o.indexOf(g)<0)o.push(g);}
  if(f&&f.paxGroups)Object.keys(f.paxGroups).forEach(function(k){add(f.paxGroups[k]);});
  try{(typeof _uaPool==='function'?_uaPool():[]).forEach(function(p){add(p&&p.group);});}catch(e){}
  try{(((typeof curDisp==='function'?curDisp():null)||{}).pax||[]).forEach(function(p){add(p&&p.group);});}catch(e){}
  o.sort();return o;
}
function _rzPaxMeta(order){S._rezdyPaxMeta=S._rezdyPaxMeta||{};order=String(order);return S._rezdyPaxMeta[order]||(S._rezdyPaxMeta[order]={});}
function _rzSavePaxMeta(){if(window.pickupSave)window.pickupSave(true);}
// True if this booking has any manual child/infant overrides away from the Rezdy standard.
function _rzHasPaxOverrides(order){var m=(S._rezdyPaxMeta||{})[String(order)];if(!m)return false;return (m.types&&Object.keys(m.types).length>0)||(m.infantOf&&Object.keys(m.infantOf).length>0);}
// Revert ONE booking's passengers to the Rezdy standard (clears manual child/infant edits).
window.rezdyResetPax=function(order){order=String(order);if(S._rezdyPaxMeta)delete S._rezdyPaxMeta[order];_rzSavePaxMeta();render();};
// Internal per-booking note (operator only) — typed on the bookings page, shown collapsed + expanded.
// Saved on blur (no re-render → caret isn't disrupted while typing). Persists via the pickup blob.
window.rezdyBookingNote=function(order,val){
  order=String(order);S._rzBkNote=S._rzBkNote||{};
  val=String(val==null?'':val).replace(/\s+$/,'');
  if(val)S._rzBkNote[order]=val; else delete S._rzBkNote[order];
  if(window.pickupSave)window.pickupSave(true);
};
// Full reset of ONE booking to its original Rezdy information: clears check-in (names + all
// captured weights), the checked-in flag, child/infant tags, the manual aircraft override and
// the weather flag — so the booking shows exactly as it was pulled from Rezdy.
window.rezdyResetBooking=function(order){
  order=String(order);
  if(!confirm('Reset this booking to its original Rezdy information?\n\nThis clears the check-in, all entered/declared weights, child/infant tags and the aircraft for this booking only.'))return;
  if(S._rezdyPaxMeta)delete S._rezdyPaxMeta[order];
  if(S._rzCheckin)delete S._rzCheckin[order];
  if(S._rzBookingCheckedIn)delete S._rzBookingCheckedIn[order];
  if(S._rzBookingAc)delete S._rzBookingAc[order];
  if(S._rzBookingWx)delete S._rzBookingWx[order];
  if(S._rzSchedAttach)delete S._rzSchedAttach[order];
  // Prune this booking's pickup-location overrides (keyed order|product|time|ii) so they don't
  // linger and re-attach a stale location if the booking re-appears.
  if(S._pickupLocOverride)Object.keys(S._pickupLocOverride).forEach(function(k){if(k.indexOf(order+'|')===0)delete S._pickupLocOverride[k];});
  if(window.pickupSave)window.pickupSave(true);
  if(typeof toast==='function')toast('Reset to Rezdy ✓','ok');
  render();
};
// ── Manual (walk-in / phone) booking ──
window.rezdyNewBookingOpen=function(){S._rzNewBkDraft={name:'',phone:'',time:'',product:'FCF',a:1,c:0,i:0,ac:''};render();};
window.rezdyNewBkField=function(field,val){var d=S._rzNewBkDraft;if(d)d[field]=val;}; // no render (keep focus)
window.rezdyNewBkCount=function(field,delta){var d=S._rzNewBkDraft;if(!d)return;d[field]=Math.max(0,(parseInt(d[field],10)||0)+delta);render();};
window.rezdyNewBookingCancel=function(){S._rzNewBkDraft=null;render();};
window.rezdyNewBookingSave=function(){
  var d=S._rzNewBkDraft;if(!d)return;
  var name=String(d.name||'').trim();
  if(!name){if(typeof toast==='function')toast('Enter a customer name','warn');return;}
  var tm=String(d.time||'').replace(/[^0-9]/g,'');if(tm.length===3)tm='0'+tm;
  if(!/^\d{4}$/.test(tm)||parseInt(tm.slice(0,2),10)>23||parseInt(tm.slice(2),10)>59){if(typeof toast==='function')toast('Enter a valid departure time (e.g. 1200)','warn');return;}
  var hhmm=tm.slice(0,2)+':'+tm.slice(2);
  var a=parseInt(d.a,10)||0,c=parseInt(d.c,10)||0,i=parseInt(d.i,10)||0;
  if(a+c+i<1){if(typeof toast==='function')toast('Add at least one passenger','warn');return;}
  var prod=String(d.product||'').trim()||'CHT';
  var order='M-'+Date.now().toString(36).toUpperCase().slice(-6);
  var quantities=[];if(a)quantities.push({label:'Adult',value:a});if(c)quantities.push({label:'Child',value:c});if(i)quantities.push({label:'Infant',value:i});
  var participants=[];for(var k=0;k<a+c;k++)participants.push({name:'',weight:'',age:''}); // infants are lap pax, captured at check-in
  var booking={id:order,orderNumber:order,status:'CONFIRMED',customerName:name,phone:String(d.phone||'').trim(),email:'',comments:'',fields:{},source:'Manual',
    totalPax:a+c+i,totalAmount:0,totalPaid:0,balanceDue:0,currency:'NZD',
    items:[{product:prod,startTimeLocal:S.rezdyDate+'T'+hhmm+':00',quantity:a+c+i,quantities:quantities,pickup:'',pickupTime:'',extras:[],participants:participants}],
    _manual:true,_tourDate:S.rezdyDate};
  S._rzManualBk=S._rzManualBk||[];S._rzManualBk.push(booking);
  S._rezdyBookings=S._rezdyBookings||[];S._rezdyBookings.push(booking);
  if(d.ac){S._rzBookingAc=S._rzBookingAc||{};S._rzBookingAc[order]=d.ac;}
  S._bkDepFilter=_rzBookingDep(booking);S._bkSearch='';S._rzNewBkDraft=null;
  if(window.pickupSave)window.pickupSave(true);
  if(typeof toast==='function')toast('Booking added','ok');render();
};
// Delete a manual booking (only manual ones can be deleted).
window.rezdyDeleteManualBooking=function(order){
  order=String(order);
  if(!confirm('Delete this manual booking?'))return;
  S._rzManualBk=(S._rzManualBk||[]).filter(function(b){return String(b.orderNumber||'')!==order;});
  S._rezdyBookings=(S._rezdyBookings||[]).filter(function(b){return String(b.orderNumber||'')!==order;});
  ['_rzCheckin','_rzBookingCheckedIn','_rzBookingAc','_rzBookingWx','_rezdyPaxMeta','_rzSchedAttach','_rzBkNote'].forEach(function(k){if(S[k])delete S[k][order];});
  if(window.pickupSave)window.pickupSave(true);
  if(typeof toast==='function')toast('Booking deleted','info');render();
};
function _rzNewBookingModal(){
  var d=S._rzNewBkDraft;if(!d)return '';
  var fleet=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(id){return S.aircraft&&S.aircraft[id];});
  var prods=['FCF','FLB','CCF','MFOH','MCOH','FJOH','QNLS','BRA','CHT'];
  if(prods.indexOf(d.product)<0&&d.product)prods.unshift(d.product);
  var stp=function(field,lbl){return '<div style="flex:1 1 90px;background:var(--card2);border:1px solid var(--border2);border-radius:9px;padding:7px 8px;text-align:center">'+
    '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--text3);font-weight:800;margin-bottom:4px">'+lbl+'</div>'+
    '<div style="display:flex;align-items:center;justify-content:center;gap:8px">'+
      '<button onclick="window.rezdyNewBkCount(\''+field+'\',-1)" style="width:26px;height:26px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text2);font-size:16px;font-weight:800;cursor:pointer">−</button>'+
      '<span style="font-size:17px;font-weight:800;color:var(--text1);min-width:18px">'+(parseInt(d[field],10)||0)+'</span>'+
      '<button onclick="window.rezdyNewBkCount(\''+field+'\',1)" style="width:26px;height:26px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text2);font-size:16px;font-weight:800;cursor:pointer">+</button>'+
    '</div></div>';};
  var fst='font-size:16px;padding:9px 10px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:8px;width:100%;outline:none';
  var h='<div onclick="window.rezdyNewBookingCancel()" class="rzci-overlay">'+
    '<div onclick="event.stopPropagation()" class="rzci-dialog">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px"><div class="st" style="margin-bottom:0">New booking</div><button onclick="window.rezdyNewBookingCancel()" style="background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer">✕</button></div>'+
    '<p style="font-size:12px;color:var(--text3);margin:0 0 12px">A manual walk-in / phone booking for '+_rzEsc(_rzDowLabel(S.rezdyDate))+'. It sits alongside the Rezdy bookings and won’t be wiped by a sync.</p>'+
    '<label style="font-size:11px;color:var(--text3);font-weight:700">CUSTOMER NAME</label>'+
    '<input type="text" value="'+_rzEsc(d.name||'')+'" oninput="window.rezdyNewBkField(\'name\',this.value)" placeholder="Full name" style="'+fst+';margin:2px 0 10px">'+
    '<div style="display:flex;gap:8px;margin-bottom:10px">'+
      '<div style="flex:1"><label style="font-size:11px;color:var(--text3);font-weight:700">DEPARTURE</label><input type="text" inputmode="numeric" value="'+_rzEsc(d.time||'')+'" oninput="window.rezdyNewBkField(\'time\',this.value)" placeholder="e.g. 1200" style="'+fst+';margin-top:2px"></div>'+
      '<div style="flex:1"><label style="font-size:11px;color:var(--text3);font-weight:700">PRODUCT</label><select onchange="window.rezdyNewBkField(\'product\',this.value);render()" style="'+fst+';margin-top:2px">'+prods.map(function(p){return '<option value="'+_rzEsc(p)+'"'+(d.product===p?' selected':'')+'>'+_rzEsc(p)+'</option>';}).join('')+'</select></div>'+
    '</div>'+
    '<label style="font-size:11px;color:var(--text3);font-weight:700">PASSENGERS</label>'+
    '<div style="display:flex;gap:8px;margin:4px 0 10px">'+stp('a','Adults')+stp('c','Children')+stp('i','Infants')+'</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:14px">'+
      '<div style="flex:1"><label style="font-size:11px;color:var(--text3);font-weight:700">PHONE (optional)</label><input type="tel" value="'+_rzEsc(d.phone||'')+'" oninput="window.rezdyNewBkField(\'phone\',this.value)" placeholder="Phone" style="'+fst+';margin-top:2px"></div>'+
      '<div style="flex:1"><label style="font-size:11px;color:var(--text3);font-weight:700">AIRCRAFT (optional)</label><select onchange="window.rezdyNewBkField(\'ac\',this.value)" style="'+fst+';margin-top:2px"><option value="">— none —</option>'+fleet.map(function(id){return '<option value="'+id+'"'+(d.ac===id?' selected':'')+'>'+id.replace('ZK-','')+'</option>';}).join('')+'</select></div>'+
    '</div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end">'+
      '<button class="btn btn-ghost" style="font-size:13px" onclick="window.rezdyNewBookingCancel()">Cancel</button>'+
      '<button class="btn btn-primary" style="font-size:13px;padding:8px 16px" onclick="window.rezdyNewBookingSave()">✓ Add booking</button>'+
    '</div></div></div>';
  return h;
}
// The aircraft assigned to a booking: a manual pill override, else whatever the comments note.
// The '__none__' sentinel means explicitly unallocated (overrides any comment).
function _rzBookingAc(b,order){order=String(order);var ov=(S._rzBookingAc||{})[order];if(ov==='__none__')return null;if(ov)return ov;var auto=(typeof _schedAutoAcFor==='function')?_schedAutoAcFor(order):null;return auto||null;}
// True when a booking's aircraft is coming from cost-aware auto-allocation (no manual override).
function _rzBookingAcIsAuto(b,order){order=String(order);if((S._rzBookingAc||{})[order])return false;return !!((typeof _schedAutoAcFor==='function')&&_schedAutoAcFor(order));}
// Aircraft selector pills for one booking. Comments supply the default; a pill overrides it; the
// "None" pill explicitly unallocates (turns the aircraft off).
function _rzBookingAcPills(b,order){
  var fleet=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(id){return S.aircraft&&S.aircraft[id];});
  var manual=(S._rzBookingAc||{})[String(order)];
  var cur=(manual==='__none__')?null:_rzBookingAc(b,order);
  var isAuto=_rzBookingAcIsAuto(b,order);
  var oE=_rzEsc(String(order)).replace(/'/g,"\\'");
  var pills='';
  fleet.forEach(function(id){
    var on=cur===id;var col=_rzAcCol(id);
    pills+='<button onclick="window.rezdyBookingSetAc(\''+oE+'\',\''+id.replace(/'/g,"\\'")+'\')" class="pill" style="cursor:pointer;opacity:'+(on?'1':'.38')+';border:1.5px solid '+(on?col:'var(--border2)')+';background:'+(on?col:'transparent')+';color:'+(on?'#fff':col)+';font-weight:800;font-size:11px;padding:3px 10px;border-radius:14px">'+id.replace('ZK-','')+'</button>';
  });
  // Explicit "None" / unallocated pill.
  var noneOn=(manual==='__none__');
  pills+='<button onclick="window.rezdyBookingSetAc(\''+oE+'\',\'__none__\')" class="pill" title="Unallocated — no aircraft" style="cursor:pointer;opacity:'+(noneOn?'1':'.38')+';border:1.5px solid '+(noneOn?'#94a3b8':'var(--border2)')+';background:'+(noneOn?'#475569':'transparent')+';color:'+(noneOn?'#fff':'var(--text3)')+';font-weight:800;font-size:11px;padding:3px 10px;border-radius:14px">None</button>';
  var _autoAc=(typeof _schedAutoAcFor==='function')?_schedAutoAcFor(order):null;
  var _chg=(manual&&manual!=='__none__'&&_autoAc&&manual!==_autoAc);
  var note=noneOn?'<span style="font-size:10px;color:var(--text3);margin-left:2px">unallocated</span>':(cur?'<span title="'+(_chg?('Auto-allocation chose '+_rzEsc(_autoAc.replace('ZK-',''))):'')+'" style="font-size:10px;color:'+(_chg?'#f59e0b':(isAuto?'#22c55e':'var(--text3)'))+';margin-left:2px">'+(_chg?'✏ user change from auto':(manual?'set':(isAuto?'⚙ auto-allocated':'from comments')))+'</span>':'');
  return '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:7px 10px">'+
    '<span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800;margin-right:2px">Aircraft</span>'+pills+note+'</div>';
}
// Collapsed-card aircraft summary — just the selected aircraft (or "None"); the full pill selector
// only appears once the booking dropdown is expanded.
function _rzBookingAcBadge(b,order){
  var manual=(S._rzBookingAc||{})[String(order)];
  if(manual==='__none__')return '<div style="padding:4px 10px;display:flex;align-items:center;gap:5px"><span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800">Aircraft</span><span class="pill" style="background:#475569;color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:14px">None</span></div>';
  var cur=_rzBookingAc(b,order);
  if(!cur)return '';
  var col=_rzAcCol(cur);
  var auto=_rzBookingAcIsAuto(b,order);
  var _autoAc=(typeof _schedAutoAcFor==='function')?_schedAutoAcFor(order):null;
  var _chg=(manual&&manual!=='__none__'&&_autoAc&&manual!==_autoAc);
  var mark=_chg?'<span title="User change from auto allocation — auto chose '+_rzEsc(_autoAc.replace("ZK-",""))+'" style="font-size:10px;font-weight:800;color:#f59e0b">✏ changed</span>':(auto?'<span title="Auto-allocated (cost-aware). Tap a pill in the dropdown to override." style="font-size:10px;font-weight:800;color:#22c55e">⚙ auto</span>':'');
  return '<div style="padding:4px 10px;display:flex;align-items:center;gap:5px"><span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800">Aircraft</span><span class="pill" style="background:'+col+';color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:14px">'+_rzEsc(cur.replace('ZK-',''))+'</span>'+mark+'</div>';
}
window.rezdyBookingSetAc=function(order,ac){
  order=String(order);S._rzBookingAc=S._rzBookingAc||{};
  if(S._rzBookingAc[order]===ac)delete S._rzBookingAc[order]; // tap the selected pill to revert to comments
  else S._rzBookingAc[order]=ac;
  if(window.pickupSave)window.pickupSave(true);render();
};
window.rezdyBookingToggleWx=function(order){order=String(order);S._rzBookingWx=S._rzBookingWx||{};if(S._rzBookingWx[order])delete S._rzBookingWx[order];else S._rzBookingWx[order]=true;if(window.pickupSave)window.pickupSave(true);render();};
window.rezdyBookingToggleCheckedIn=function(order){order=String(order);S._rzBookingCheckedIn=S._rzBookingCheckedIn||{};if(S._rzBookingCheckedIn[order])delete S._rzBookingCheckedIn[order];else S._rzBookingCheckedIn[order]=true;if(window.pickupSave)window.pickupSave(true);render();};
// Click the "Checked in" pill: opens the check-in popup. If already checked in it opens in EDIT
// mode (captured names/weights pre-filled) so passengers can be amended; the modal has an
// Un-check button to revert. If not checked in, it's a fresh capture.
window.rezdyCheckinClick=function(order){order=String(order);window.rezdyCheckinOpen(order);};
window.rezdyCheckinUncheck=function(){
  var d=S._rzCheckinDraft;if(!d)return;var o=d.order;
  if(!confirm('Un-check this booking? It returns to not-checked-in. Captured names/weights are kept so you can re-check in later.'))return;
  S._rzCheckinDraft=null;
  if(S._rzBookingCheckedIn)delete S._rzBookingCheckedIn[o];
  if(window.pickupSave)window.pickupSave(true);
  if(typeof toast==='function')toast('Un-checked','info');render();
};
window.rezdyCheckinOpen=function(order){
  order=String(order);
  var b=(S._rezdyBookings||[]).find(function(x){return String(x.orderNumber||'')===order;});
  if(!b){if(typeof toast==='function')toast('Booking not found','warn');return;}
  var existing=_rzCheckinPax(order),rows;
  if(existing){rows=existing.map(function(r){return {name:r.name||'',actual:r.actual!=null?String(r.actual):'',type:r.type||'adult',attach:(r.attach!=null?r.attach:null),declared:(r.declared!=null?r.declared:null)};});}
  else{
    var parts=[];(b.items||[]).forEach(function(it){(it.participants||[]).forEach(function(p){parts.push(p);});});
    var m=(S._rezdyPaxMeta||{})[order]||{};var types=m.types||{};var infantOf=m.infantOf||{};
    var bd=_rzBreakdown(b)||_rzEffBreakdown(b)||{a:0,c:0,i:0};
    var total=Math.max((bd.a||0)+(bd.c||0)+(bd.i||0),parts.length,1);
    rows=[];
    for(var i=0;i<total;i++){var p=parts[i];var t=p?((infantOf[i]!=null)?'infant':(types[i]||_rzAgeType(p))):'adult';rows.push({name:p&&p.name?String(p.name).trim():'',actual:'',type:(t==='infant'?'infant':t==='child'?'child':'adult'),attach:(infantOf[i]!=null&&infantOf[i]<total?infantOf[i]:null),declared:(p?_rzDeclared(p.weight):null)});}
  }
  // Every infant needs a host (default to the first non-infant passenger).
  var firstNon=null;for(var k=0;k<rows.length;k++){if(rows[k].type!=='infant'){firstNon=k;break;}}
  rows.forEach(function(r){if(r.type==='infant'&&(r.attach==null||!rows[r.attach]||rows[r.attach].type==='infant'))r.attach=firstNon;});
  S._rzCheckinDraft={order:order,rows:rows,plate:((S._rzPlates||{})[order]||{}).plate||''};render();
};
// Undo stack for the check-in form — snapshots the passenger ROWS before each structural edit (type
// toggle / add / remove / infant host) so an accidental change can be reverted. Capped; plate is left
// alone (independent). Name/weight typing isn't snapshotted (just re-type it).
function _rzCiSnap(){var d=S._rzCheckinDraft;if(!d)return;d._hist=d._hist||[];d._hist.push(JSON.stringify(d.rows));if(d._hist.length>40)d._hist.shift();}
window.rezdyCheckinUndo=function(){var d=S._rzCheckinDraft;if(!d||!d._hist||!d._hist.length)return;try{d.rows=JSON.parse(d._hist.pop());}catch(e){}render();};
window.rezdyCheckinField=function(i,field,val){var d=S._rzCheckinDraft;if(!d||!d.rows[i])return;d.rows[i][field]=val;}; // no render (keep input focus)
window.rezdyCheckinAttach=function(i,val){var d=S._rzCheckinDraft;if(!d||!d.rows[i])return;_rzCiSnap();d.rows[i].attach=(val===''?null:parseInt(val,10));render();};
window.rezdyCheckinType=function(i){
  var d=S._rzCheckinDraft;if(!d||!d.rows[i])return;_rzCiSnap();
  var cur=d.rows[i].type;d.rows[i].type=(cur==='adult')?'child':(cur==='child')?'infant':'adult';
  if(d.rows[i].type==='infant'){var fn=null;for(var k=0;k<d.rows.length;k++){if(k!==i&&d.rows[k].type!=='infant'){fn=k;break;}}d.rows[i].attach=fn;}
  else d.rows[i].attach=null;
  render();
};
window.rezdyCheckinAddRow=function(){var d=S._rzCheckinDraft;if(!d)return;_rzCiSnap();d.rows.push({name:'',actual:'',type:'adult',attach:null});render();};
window.rezdyCheckinRemoveRow=function(i){var d=S._rzCheckinDraft;if(!d||d.rows.length<=1)return;_rzCiSnap();d.rows.splice(i,1);render();};
window.rezdyCheckinCancel=function(){S._rzCheckinDraft=null;render();};
window.rezdyCheckinSave=function(){
  var d=S._rzCheckinDraft;if(!d)return;
  var ca=0,cc=0,ci=0;
  for(var i=0;i<d.rows.length;i++){var r=d.rows[i];
    if(!r.name||!String(r.name).trim()){if(typeof toast==='function')toast('Enter a name for passenger '+(i+1),'warn');return;}
    if(r.type==='infant'){ci++;if(r.attach==null){if(typeof toast==='function')toast('Choose who '+(String(r.name).trim()||'the infant')+' sits with','warn');return;}}
    else{if(r.type==='child')cc++;else ca++;} // actual weight optional — blank falls back to the declared weight
  }
  // Warn if the entered A/C/i don't match the booking's breakdown.
  var b=(S._rezdyBookings||[]).find(function(x){return String(x.orderNumber||'')===d.order;});
  var bd=(b&&(_rzBreakdown(b)||_rzEffBreakdown(b)))||null;
  if(bd&&(bd.a!==ca||bd.c!==cc||bd.i!==ci)){
    if(!confirm('Heads up — you entered '+ca+'A '+cc+'C '+ci+'i, but the booking shows '+bd.a+'A '+bd.c+'C '+bd.i+'i.\n\nCheck in anyway?'))return;
  }
  // Outstanding-balance warning — flag a TO PAY booking before it's checked in.
  var _bal=b?parseFloat(b.balanceDue):0;
  if(isFinite(_bal)&&_bal>0){
    if(!confirm('⚠ This booking has an OUTSTANDING BALANCE of '+_rzMoney(_bal,b.currency)+'.\n\nCollect payment before checking them in. Check in anyway?'))return;
  }
  S._rzCheckin=S._rzCheckin||{};
  S._rzCheckin[d.order]={pax:d.rows.map(function(r){
    var o={name:String(r.name).trim(),type:r.type==='child'?'child':r.type==='infant'?'infant':'adult'};
    if(r.type==='infant'){o.attach=(r.attach!=null?r.attach:null);}
    else{var a=parseFloat(r.actual);if(!isNaN(a)&&a>0)o.actual=a; else if(r.declared!=null)o.declared=r.declared;} // no actual → keep declared
    return o;
  })};
  S._rzBookingCheckedIn=S._rzBookingCheckedIn||{};S._rzBookingCheckedIn[d.order]=true;
  // Self-drive numberplate(s): keep the existing "entered" tick if they're just editing the plate.
  S._rzPlates=S._rzPlates||{};var _pl=String(d.plate||'').trim();
  if(_pl){var _ex=S._rzPlates[d.order];S._rzPlates[d.order]={plate:_pl,done:!!(_ex&&_ex.done)};}
  else if(S._rzPlates[d.order])delete S._rzPlates[d.order];
  S._rzCheckinDraft=null;
  if(window.pickupSave)window.pickupSave(true);
  if(typeof toast==='function')toast('Checked in ✓','ok');render();
};
// The check-in modal (rendered when a draft is open).
// Rezdy "extras" on a booking that are lunches/meals (so check-in + the booking row can flag them).
function _rzBookingLunches(b){
  var out=[];
  ((b&&b.items)||[]).forEach(function(it){((it&&it.extras)||[]).forEach(function(e){
    if(e&&e.name&&/lunch|meal|picnic|hamper|food/i.test(String(e.name)))out.push(e);
  });});
  return out;
}
function _rzBookingHasLunch(b){return _rzBookingLunches(b).length>0;}
// Self-drive numberplate(s) captured at check-in (we hand-enter these into a separate system later).
// Stored per order as {plate, done}; persisted in the pickup blob (field 'plates').
function _rzPlate(order){return (S._rzPlates||{})[String(order||'')]||null;}
window.rezdyCheckinPlate=function(val){var d=S._rzCheckinDraft;if(d)d.plate=String(val||'').toUpperCase();}; // uppercase numberplates; no render — keep input focus
window.rezdyPlateToggleDone=function(order){order=String(order||'');S._rzPlates=S._rzPlates||{};var p=S._rzPlates[order];if(!p||!p.plate)return;p.done=!p.done;if(window.pickupSave)window.pickupSave(true);render();};
// Edit the numberplate directly from the booking dropdown (keeps the "entered" tick if just editing).
window.rezdyPlateSet=function(order,val){order=String(order||'');val=String(val||'').trim().toUpperCase();S._rzPlates=S._rzPlates||{};if(val){var ex=S._rzPlates[order];S._rzPlates[order]={plate:val,done:!!(ex&&ex.done)};}else delete S._rzPlates[order];if(window.pickupSave)window.pickupSave(true);render();};
function _rzCheckinModal(){
  var d=S._rzCheckinDraft;if(!d)return '';
  var b=(S._rezdyBookings||[]).find(function(x){return String(x.orderNumber||'')===d.order;});
  var cust=b?(b.customerName||d.order):d.order;
  var already=!!((S._rzBookingCheckedIn||{})[d.order]);
  var canUndo=!!(d._hist&&d._hist.length);
  // Fixed-size box so the check-in looks the SAME regardless of lunches / plate / pax count — uses the
  // desktop real estate; the passenger list scrolls inside for big groups. Still an overlaid modal.
  var _dlg='background:var(--card);border:1px solid var(--border2);border-radius:16px;box-shadow:0 16px 50px rgba(0,0,0,.5);width:560px;max-width:calc(100vw - 24px);height:min(740px,calc(100dvh - 64px));display:flex;flex-direction:column;overflow:hidden';
  var h='<div onclick="window.rezdyCheckinCancel()" class="rzci-overlay" style="align-items:center">'+
    '<div onclick="event.stopPropagation()" style="'+_dlg+'">'+
    '<div style="flex-shrink:0;padding:16px 18px 12px;border-bottom:1px solid var(--border2)">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div class="st" style="margin-bottom:0">'+(already?'Edit check-in':'Check in')+' — '+_rzEsc(cust)+'</div><button onclick="window.rezdyCheckinCancel()" style="background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer">✕</button></div>'+
      '<p style="font-size:12px;color:var(--text3);margin:8px 0 0">Enter every passenger’s name. <b>Actual weight</b> is optional — blank falls back to the declared weight (red “(d)”). The toggle cycles <b>A</b>→<b>C</b>→<b>i</b>; an infant is a lap pax.</p>'+
    '</div>'+
    '<div style="flex:1 1 auto;overflow:auto;padding:14px 18px">';
  var _ciBal=b?parseFloat(b.balanceDue):0;
  if(isFinite(_ciBal)&&_ciBal>0){
    h+='<div style="display:flex;align-items:center;gap:8px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.5);border-radius:9px;padding:9px 12px;margin:0 0 12px"><span style="font-size:16px">💲</span><span style="font-size:12px;font-weight:700;color:#f87171">Outstanding balance of '+_rzEsc(_rzMoney(_ciBal,b.currency))+' — collect payment before checking in.</span></div>';
  }
  // Lunch / meal extras — flagged prominently (this is where we hand out the lunch cards). Show
  // each type with its ×qty (Rezdy stores the extra count on e.qty, same as the booking detail).
  var _ciLun=_rzBookingLunches(b);
  if(_ciLun.length){
    h+='<div style="background:rgba(245,158,11,.15);border:1px solid #f59e0b;border-radius:9px;padding:11px 13px;margin:0 0 12px">'+
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px"><span style="font-size:22px">🍱</span><div style="font-size:13.5px;font-weight:800;color:#fbbf24">Lunch ordered</div></div>'+
      '<div style="display:flex;flex-direction:column;gap:5px">'+_ciLun.map(function(e){var q=parseInt(e.qty,10)||1;return '<div style="display:flex;align-items:center;gap:9px;font-size:13px;font-weight:700;color:#fde68a"><span style="display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:24px;background:#f59e0b;color:#3a2c06;font-weight:900;border-radius:6px;font-size:13px">×'+q+'</span>'+_rzEsc(e.name)+'</div>';}).join('')+'</div>'+
    '</div>';
  }
  // Self-drive numberplate(s) — recorded here, hand-entered into the separate system later.
  var _ciSelf=(typeof _rzManualSelfDrive==='function'&&_rzManualSelfDrive(d.order))||(!!b&&(b.items||[]).some(function(it){return it.pickup&&typeof _rzIsSelfDrive==='function'&&_rzIsSelfDrive(it.pickup);}));
  h+='<div style="background:'+(_ciSelf?'rgba(59,130,246,.12)':'var(--card2)')+';border:1px solid '+(_ciSelf?'#3b82f6':'var(--border2)')+';border-radius:9px;padding:11px 13px;margin:0 0 12px">'+
    '<div style="font-size:12.5px;font-weight:800;color:'+(_ciSelf?'#60a5fa':'var(--text2)')+';margin-bottom:6px">🚗 Self-drive numberplate(s)'+(_ciSelf?' — self-drive booking':'')+'</div>'+
    '<input type="text" value="'+_rzEsc(d.plate||'')+'" oninput="window.rezdyCheckinPlate(this.value)" placeholder="e.g. ABC123 — comma-separate if more than one" style="width:100%;box-sizing:border-box;font-size:16px;padding:9px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:7px;letter-spacing:.04em;text-transform:uppercase">'+
    '<div style="font-size:11px;color:var(--text3);margin-top:5px">A <b>P</b> shows on the booking; tick it off in the booking dropdown once it’s in the separate system.</div>'+
  '</div>';
  d.rows.forEach(function(r,i){
    var isInf=r.type==='infant';
    var tl=r.type==='child'?'C':isInf?'i':'A';
    var tc=r.type==='child'?'#fb923c':isInf?'#ec4899':'var(--text3)';
    var tbg=r.type==='child'?'rgba(251,146,60,.18)':isInf?'rgba(236,72,153,.18)':'transparent';
    h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">'+
      '<span style="font-size:11px;color:var(--text3);width:16px;flex-shrink:0">'+(i+1)+'</span>'+
      '<input type="text" value="'+_rzEsc(r.name||'')+'" oninput="window.rezdyCheckinField('+i+',\'name\',this.value)" placeholder="Full name" style="flex:1 1 110px;min-width:0;font-size:16px;padding:8px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:7px">'+
      (isInf?'<span style="width:62px;flex-shrink:0;font-size:11px;color:var(--text3);text-align:center">lap</span>':'<input type="number" inputmode="decimal" value="'+_rzEsc(r.actual||'')+'" oninput="window.rezdyCheckinField('+i+',\'actual\',this.value)" placeholder="kg" style="width:62px;flex-shrink:0;font-size:16px;padding:8px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:7px;text-align:right">')+
      '<button onclick="window.rezdyCheckinType('+i+')" title="Adult / Child / Infant" style="flex-shrink:0;width:30px;font-size:12px;font-weight:800;padding:8px 0;border-radius:7px;border:1px solid '+(r.type==='adult'?'var(--border2)':tc)+';background:'+tbg+';color:'+tc+';cursor:pointer">'+tl+'</button>'+
      (d.rows.length>1?'<button onclick="window.rezdyCheckinRemoveRow('+i+')" title="Remove" style="flex-shrink:0;background:none;border:none;color:#ef444488;font-size:14px;cursor:pointer">✕</button>':'')+
      (isInf?'<div style="flex-basis:100%;display:flex;align-items:center;gap:6px;padding:0 0 0 22px"><span style="font-size:11px;color:#ec4899;font-weight:700">sits with</span><select onchange="window.rezdyCheckinAttach('+i+',this.value)" style="flex:1;font-size:14px;padding:6px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:6px"><option value="">— choose —</option>'+d.rows.map(function(rr,j){if(j===i||rr.type==='infant')return '';return '<option value="'+j+'"'+(String(r.attach)===String(j)?' selected':'')+'>'+_rzEsc(rr.name||('Passenger '+(j+1)))+'</option>';}).join('')+'</select></div>':'')+
    '</div>';
  });
  h+='<button onclick="window.rezdyCheckinAddRow()" style="font-size:12px;font-weight:700;padding:5px 12px;border-radius:8px;border:1px dashed var(--border2);background:transparent;color:var(--text2);cursor:pointer;margin-bottom:14px">+ Add passenger</button>';
  h+='</div>'+   // end scrolling body
    '<div style="flex-shrink:0;padding:12px 18px;border-top:1px solid var(--border2);display:flex;gap:8px;align-items:center">'+
      '<div style="margin-right:auto;display:flex;gap:8px">'+
        (canUndo?'<button class="btn btn-ghost" style="font-size:13px" onclick="window.rezdyCheckinUndo()">↩ Undo</button>':'')+
        (already?'<button class="btn btn-ghost" style="font-size:13px;color:#f87171;border-color:rgba(239,68,68,.4)" onclick="window.rezdyCheckinUncheck()">⊘ Un-check</button>':'')+
      '</div>'+
      '<button class="btn btn-ghost" style="font-size:13px" onclick="window.rezdyCheckinCancel()">Cancel</button>'+
      '<button class="btn btn-primary" style="font-size:13px;padding:8px 16px" onclick="window.rezdyCheckinSave()">✓ '+(already?'Save changes':'Confirm check-in')+'</button>'+
    '</div></div></div>';
  return h;
}
// Authoritative A/C/i counts from Rezdy's price-option quantities (Adult / Child / Infant …).
function _rzBreakdown(b){var a=0,c=0,i=0,has=false;((b&&b.items)||[]).forEach(function(it){((it&&it.quantities)||[]).forEach(function(q){has=true;var l=String((q&&q.label)||'').toLowerCase();var v=parseInt(q&&q.value,10)||0;if(/infant/.test(l))i+=v;else if(/child/.test(l))c+=v;else a+=v;});});return has?{a:a,c:c,i:i}:null;}
// Per-participant type from Rezdy's captured age field (when present).
function _rzAgeType(p){var a=String((p&&p.age)||'').toLowerCase();if(/infant/.test(a))return 'infant';if(/child/.test(a))return 'child';var n=parseInt(a,10);if(!isNaN(n)){if(n<=2)return 'infant';if(n<13)return 'child';}return 'adult';}
// Effective A/C/i for a booking: Rezdy's counts by default, but once the operator has manually
// tagged children/infants in the bookings tab, switch to the per-participant tally so the
// calendar block and bubble strip both reflect those edits.
function _rzEffBreakdown(b){
  var order=String((b&&b.orderNumber)||'');
  var m=(S._rezdyPaxMeta||{})[order]||{};
  var hasManual=(m.types&&Object.keys(m.types).length)||(m.infantOf&&Object.keys(m.infantOf).length);
  var parts=[];((b&&b.items)||[]).forEach(function(it){((it&&it.participants)||[]).forEach(function(p){parts.push(p);});});
  if(hasManual&&parts.length){
    var a=0,c=0,i=0,infantOf=m.infantOf||{},types=m.types||{};
    parts.forEach(function(p,idx){if(infantOf[idx]!=null){i++;}else{var t=types[idx]||_rzAgeType(p);if(t==='child')c++;else if(t==='infant')i++;else a++;}});
    return {a:a,c:c,i:i};
  }
  // Charter (CHT): the price quantity is the charter UNIT (1), not the head-count — so count the named
  // participants instead, otherwise the title/breakdown shows "1A" for a multi-pax charter.
  var isCharter=((b&&b.items)||[]).some(function(it){return (typeof _rzProduct==='function')&&_rzProduct(it.product)==='CHT';});
  if(isCharter&&parts.length){var ca=0,cc=0,ci=0;parts.forEach(function(p){var t=_rzAgeType(p);if(t==='child')cc++;else if(t==='infant')ci++;else ca++;});return {a:ca,c:cc,i:ci};}
  var rb=_rzBreakdown(b);if(rb)return rb;
  var a2=0,c2=0,i2=0;parts.forEach(function(p){var t=_rzAgeType(p);if(t==='child')c2++;else if(t==='infant')i2++;else a2++;});
  return {a:a2,c:c2,i:i2};
}
function _rzBdText(bd){return bd.a+'A'+(bd.c?' · '+bd.c+'C':'')+(bd.i?' · '+bd.i+'i':'');}
function _rzBdCompact(bd){return bd.a+'A'+(bd.c?bd.c+'C':'')+(bd.i?bd.i+'i':'');} // 10A2C1i
// Aggregate folded-flyback bookings into one " + NA CODE" string per product code (so 3×1A FLB
// shows as "+ 3A FLB", not three separate "+ 1A FLB"). Returns '' when nothing is folded in.
function _rzFbSummary(fbArr){
  var byCode={};
  (fbArr||[]).forEach(function(bk){
    var code=_rzProduct((bk.it&&bk.it.product)||'')||'FLB';
    var e=_rzEffBreakdown(bk.b);var g=byCode[code]||(byCode[code]={a:0,c:0,i:0});
    g.a+=e.a;g.c+=e.c;g.i+=e.i;
  });
  return Object.keys(byCode).map(function(code){return ' + '+_rzBdCompact(byCode[code])+' '+code;}).join('');
}
// Pilots available to fly — the single source of truth is the AIRCRAFT APPROVAL pills in each
// crew profile, so this reads from S.crew (every aircraft-approved crew member), NOT just login
// accounts. Each carries a `rostered` flag (rostered-on for the day) so the UI can sort/dim the
// off-duty ones; everyone approved still appears so they can be assigned. Shared by seatmap + calendar.
function _rzAvailablePilots(dsOverride){
  // The roster is normally loaded by the Roster page. When the seatmap/pickups pilot list is the
  // first thing seen (e.g. after a refresh landing on Operations), lazy-load it the same way so
  // pilots aren't all shown "off" against an empty roster.
  if(!S._rosterLoaded&&typeof window.loadRosterFromCloud==='function'){
    S._rosterLoaded=true;
    try{var _loc=lsGet('ts_roster');if(_loc&&typeof _loc==='object')S.roster=_loc;}catch(e){}
    window.loadRosterFromCloud(); // async; re-renders when the cloud copy arrives
  }
  var ds=dsOverride||S.rezdyDate,roster=S.roster||{},off={rdo:1,off:1,leave:1,ul:1,sick:1,training:1};
  var out=[],seen={};
  (S.crew||[]).forEach(function(cr){
    if(!cr||!(cr.endorse||[]).some(function(e){return String(e).indexOf('ZK-')===0;}))return; // aircraft-approved only
    var u=(S.users||[]).find(function(x){return x&&(x.name===cr.n||x.linkedCrew===cr.n);});
    if(u&&u.inactive)return;
    var code=cr.code?String(cr.code).toUpperCase():((u&&typeof _rCode==='function')?_rCode(u):(cr.n||'').replace(/[^A-Za-z]/g,'').slice(0,2).toUpperCase());
    if(!code||seen[code])return;seen[code]=1;
    var st=(u&&typeof _rGetStatus==='function')?_rGetStatus(u,ds,roster):((roster[ds]&&roster[ds][code])||'');
    out.push({code:code,name:(cr.n||code).trim(),rostered:(!!st&&!off[st])});
  });
  return out.sort(function(a,b){if(a.rostered!==b.rostered)return a.rostered?-1:1;return String(a.name).localeCompare(String(b.name));});
}
// ALL staff with a code — for picking meeting attendees. Sourced from S.users (the SAME list the
// roster shows) so everyone with an account appears, not only crew with aircraft endorsements.
// `isPilot` = a pilot role or crew endorsements, so the meeting copies into that pilot's movements.
function _rzAllStaff(dsOverride){
  var ds=dsOverride||S.rezdyDate,roster=S.roster||{},off={rdo:1,off:1,leave:1,ul:1,sick:1,training:1};
  if(!S._rosterLoaded&&typeof window.loadRosterFromCloud==='function'){S._rosterLoaded=true;try{var _loc=lsGet('ts_roster');if(_loc&&typeof _loc==='object')S.roster=_loc;}catch(e){}window.loadRosterFromCloud();}
  var out=[],seen={};
  (S.users||[]).filter(function(u){return u&&u.id&&u.name&&!u.inactive;}).forEach(function(u){
    var code=(typeof _rCode==='function')?_rCode(u):(u.name||'').split(/\s+/).map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2);
    if(!code||seen[code])return;seen[code]=1;
    var st=(typeof _rGetStatus==='function')?_rGetStatus(u,ds,roster):((roster[ds]&&roster[ds][code])||'');
    var isPilot=!!(u.role==='pilot'||(typeof _picEligible==='function'&&_picEligible(u)));
    out.push({code:code,name:(u.name||code).trim(),rostered:(!!st&&!off[st]),isPilot:isPilot});
  });
  return out.sort(function(a,b){if(a.isPilot!==b.isPilot)return a.isPilot?-1:1;return String(a.name).localeCompare(String(b.name));});
}
window.rezdySchedPilotDragStart=function(code,e){S._schedPilotDrag=code;try{e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('text/plain','pilot:'+code);}catch(_){}};
// A pilot's aircraft endorsements (type ratings) from their crew profile.
function _rzPilotEndorse(code){
  var u=(S.users||[]).find(function(x){return ((typeof _rCode==='function')?_rCode(x):'')===code;});
  if(!u)return [];
  var cr=(S.crew||[]).find(function(c){return c.n===u.name||c.n===u.linkedCrew;});
  return cr?(cr.endorse||[]):[];
}
// Resolve a pilot by 2-letter code → {name, weight, endorse[], picAuth}. Resolves from ALL
// users (not just the available list) so an assigned PIC's weight still feeds the W&B.
function _rzPilotByCode(code){
  var u=(S.users||[]).find(function(x){return ((typeof _rCode==='function')?_rCode(x):'')===code;});
  if(u){
    var cr=(S.crew||[]).find(function(c){return c.n===u.name||c.n===u.linkedCrew;});
    var auth=!!(cr&&cr.endorse&&cr.endorse.length); // PIC authority = aircraft approvals
    return {code:code,name:(u.name||'').trim(),weight:(cr&&cr.w)||u.weight||0,endorse:(cr&&cr.endorse)||[],picAuth:auth};
  }
  // No login account — fall back to the crew member whose code matches (crew can fly without a login).
  var cr2=(S.crew||[]).find(function(c){return String(c.code||'').toUpperCase()===String(code).toUpperCase();});
  if(cr2)return {code:code,name:(cr2.n||'').trim(),weight:cr2.w||0,endorse:cr2.endorse||[],picAuth:!!(cr2.endorse&&cr2.endorse.length)};
  return null;
}
// Pilots who can be PIC of a SPECIFIC aircraft — single source of truth = the AIRCRAFT APPROVAL
// pills in the crew profile (cr.endorse). Returns {code,name,weight,rostered}, rostered-on first.
function _rzPilotsForAc(acId){
  var rost={};_rzAvailablePilots().forEach(function(p){rost[p.code]=!!p.rostered;});
  var out=[],seen={};
  (S.crew||[]).forEach(function(cr){
    if(!cr||!(cr.endorse||[]).some(function(e){return e===acId;}))return; // must hold THIS aircraft's pill
    var u=(S.users||[]).find(function(x){return x&&!x.inactive&&(x.name===cr.n||x.linkedCrew===cr.n);});
    var code=cr.code?String(cr.code).toUpperCase():((typeof _rCode==='function'&&u)?_rCode(u):(cr.n||'').replace(/[^A-Za-z]/g,'').slice(0,2).toUpperCase());
    if(!code||seen[code])return;seen[code]=1;
    out.push({code:code,name:cr.n||code,weight:cr.w||(u&&u.weight)||0,rostered:!!rost[code]});
  });
  return out.sort(function(a,b){if(a.rostered!==b.rostered)return a.rostered?-1:1;return String(a.name).localeCompare(String(b.name));});
}
// All seat rows for an aircraft (incl. the PIC seat 0), grouped by arm, front-to-back.
function _rzAcRows(acId){
  var a=(typeof _acSpec==='function'?_acSpec(acId):S.aircraft[acId]);if(!a||!a.seats)return [];
  var removed=a.removedSeats||[];
  var idxs=a.seats.map(function(_,i){return i;}).filter(function(i){return removed.indexOf(i)<0;});
  var byArm={};idxs.forEach(function(i){if(!a.seats[i])return;var k=a.seats[i].arm.toFixed(4);(byArm[k]=byArm[k]||[]).push(i);});
  return Object.keys(byArm).sort(function(x,y){return parseFloat(x)-parseFloat(y);}).map(function(k){return byArm[k].slice().sort(function(x,y){return x-y;});});
}
// Find the booking order numbers that make up a booking-block key (aircraft|start|product).
function _rzOrdersForBlockKey(key){
  var out=[];
  (S._rezdyBookings||[]).forEach(function(b){
    if(_rzIsCancelled(b))return;
    var ac=_rzBookingAc(b,String(b.orderNumber||''))||'__unalloc__';
    ((b.items)||[]).forEach(function(it){var t=_rzDepTime(it.startTimeLocal||'');if(!t)return;var start=_rzHHMMcolon(t);var prod=_rzProduct(it.product);if(_rzDepKey(ac,start,prod)===key)out.push(String(b.orderNumber||''));});
  });
  return out;
}
// ── Editable flyback (FLB/CCF) return time ──────────────────────────────────────
// A flyback's seats are parked in its OUTBOUND (held) Rezdy slot; what we actually need is the time
// they FLY BACK. That defaults to 15:30, but the operator can override it per flyback group in the
// calendar. Keyed by product + held outbound time (aircraft-independent so it survives a reassign);
// the pickup blob is already per-date, so this map is per-date too.
// 15-minute <option> list spanning [from..to], guaranteeing the current value is present + selected.
function _rzTimeOpts(sel,from,to){
  var fm=_rzMinsFromHHMM(from);if(fm==null)fm=720;var tm=_rzMinsFromHHMM(to);if(tm==null)tm=1185;
  var sm=_rzMinsFromHHMM(sel);var set={},list=[];
  for(var m=fm;m<=tm;m+=15){list.push(m);set[m]=1;}
  if(sm!=null&&!set[sm]){list.push(sm);list.sort(function(a,b){return a-b;});}
  return list.map(function(m){var hh=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');return '<option value="'+hh+'"'+(m===sm?' selected':'')+'>'+hh+'</option>';}).join('');
}
function _rzFbTimeKey(prod,held){return String(prod||'')+'|'+String(held||'');}
// Default fly-back RETURN time per HELD outbound slot (the seats are held there to block that
// departure; the plane actually flies back later). Operator can drag/override per slot.
var _RZ_FB_DEFAULTS={'10:30':'14:00','12:00':'15:30','13:00':'16:15'};   // legacy per-slot (fallback only)
// Season by date — same rule as the ETD options: Oct–Apr = summer, May–Sep = winter.
function _rzSeason(date){var d=date?new Date(String(date)+'T00:00:00'):new Date();var m=d.getMonth()+1;return (m>=10||m<=4)?'summer':'winter';}
var _RZ_FB_SUMMER_EARLY_BEFORE=720;   // held slot before this (12:00) → the early 13:45 run, else 16:15. Adjust if the cruise→slot cutoff differs.
// Standard fly-back RETURN time. WINTER: one 15:15 run. SUMMER: an early 13:45 run (morning cruises)
// and a late 16:15 run (midday+), chosen by the booking's held/cruise slot. Operator can still override
// any flyback's time via the calendar dropdown.
function _rzFbDefaultTime(held){
  var season=_rzSeason(S&&S.rezdyDate);
  if(season==='winter')return '15:15';
  var hm=(typeof _rzMinsFromHHMM==='function')?_rzMinsFromHHMM(held):null;
  if(hm!=null)return (hm<_RZ_FB_SUMMER_EARLY_BEFORE)?'13:45':'16:15';
  return _RZ_FB_DEFAULTS[String(held||'')]||'16:15';
}
function _rzFbHasDefault(held){return true;}   // every flyback now has a season default time
function _rzFbTime(prod,held){var v=(S._rzFlybackTime||{})[_rzFbTimeKey(prod,held)];return (v&&/^\d{1,2}:\d{2}$/.test(v))?v:_rzFbDefaultTime(held);}
window.rezdySetFlybackTime=function(prod,held,val){
  S._rzFlybackTime=S._rzFlybackTime||{};var k=_rzFbTimeKey(prod,held);
  val=String(val||'').trim();
  // Store ANY valid time (including 15:30) as an explicit override so it's always honoured. Only an
  // empty value (the "reset to 15:30" link) clears it back to the default.
  if(/^\d{1,2}:\d{2}$/.test(val))S._rzFlybackTime[k]=val; else delete S._rzFlybackTime[k];
  if(window.pickupSave)window.pickupSave(true);if(typeof _rzSchedBroadcast==='function')_rzSchedBroadcast();render();
};
// Optional fly-back END time (block duration) — set by dragging the block's bottom edge. Cleared when
// empty; default end is start+40 (the return leg). Keyed per held slot like the start time.
window.rezdySetFlybackEnd=function(prod,held,val){
  S._rzFlybackEnd=S._rzFlybackEnd||{};var k=_rzFbTimeKey(prod,held);
  val=String(val||'').trim();
  if(/^\d{1,2}:\d{2}$/.test(val))S._rzFlybackEnd[k]=val; else delete S._rzFlybackEnd[k];
  if(window.pickupSave)window.pickupSave(true);if(typeof _rzSchedBroadcast==='function')_rzSchedBroadcast();render();
};
// ── Weather calls ───────────────────────────────────────────────────────────────
// Every flight is weather-dependent and needs a pilot's weather call ~1h before departure (an 0800
// flight is called by 0700 latest). Any pilot can record a call per departure. Stored per-date in the
// pickup blob (S._rzWxCalls, keyed by departure time "HH:MM"). Status: 'on' (green) / 'cancelled' (red,
// + reason + next-best-day) / 'final' (yellow, final call made in the office). All carry a comment.
var _WX_REASONS=['Cloud','Rain','Wind','Snow','Visibility'];
function _wxLeadMin(){return 60;}                       // call due this many minutes before departure
function _wxNotifyBeforeDeadlineMin(){return 15;}       // remind the PIC this long before the deadline
function _wxCall(depKey){return (S._rzWxCalls||{})[String(depKey)]||null;}
function _wxStatusColor(st){return st==='on'?'#22c55e':st==='cancelled'?'#ef4444':st==='final'?'#f59e0b':'#94a3b8';}
function _wxStatusLabel(st){return st==='on'?'Called ON':st==='cancelled'?'Cancelled':st==='final'?'Final call (office)':'No call yet';}
// The day's weather-call subjects: unique departure TIMES among today's real (aircraft) flights, with
// their aircraft + PIC(s). Flybacks ride their outbound's call; manual/maintenance blocks are excluded.
function _wxDepartures(date){
  var flights=(typeof _schedDayFlights==='function')?(_schedDayFlights(date)||[]):[];
  var man=S._schedPilots||{},auto=S._schedAutoPilots||{},byTime={};
  flights.forEach(function(f){
    var parts=String(f.key||'').split('|');if(parts.length<3)return;          // skip manual blocks (key=id)
    if(!((S.aircraft||{})[parts[0]]))return;                                  // real aircraft only
    var prod=parts[2]||'';if((typeof _rzIsFlyback==='function')&&_rzIsFlyback(prod))return;
    var t=(typeof _rzMinToHHMM==='function')?_rzMinToHHMM(f.depMin):'';if(!t)return;
    var g=byTime[t]||(byTime[t]={time:t,depMin:f.depMin,acs:[],pics:[],prod:prod});
    if(g.acs.indexOf(parts[0])<0)g.acs.push(parts[0]);
    var pic=man[f.key]||auto[f.key];if(pic&&g.pics.indexOf(pic)<0)g.pics.push(pic);
  });
  return Object.keys(byTime).map(function(t){return byTime[t];}).sort(function(a,b){return a.depMin-b.depMin;});
}
// Next-best-day chips for a cancelled call: Tomorrow + the following few days (weekday labels).
function _wxNextDays(date){
  var base=date?new Date(String(date)+'T00:00:00'):new Date();var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];var out=[];
  // base is LOCAL midnight; toISOString().slice(0,10) would emit the day BEFORE in NZ (UTC+12/+13),
  // so the chip's val (the next-day reschedule date) was a day early. Use the local-date helper. (v27.48)
  for(var i=1;i<=5;i++){var d=new Date(base);d.setDate(d.getDate()+i);out.push({val:(typeof _rIso==='function')?_rIso(d):d.toISOString().slice(0,10),label:i===1?'Tomorrow':days[d.getDay()]});}
  return out;
}
function _wxCallReasons(c){return (c&&c.reasons&&c.reasons.length)?c.reasons:((c&&c.reason)?[c.reason]:[]);}   // back-compat with the old single-reason field
window.wxOpenDep=function(dep){if(S._wxOpen===dep){S._wxOpen=null;}else{S._wxOpen=dep;var c=_wxCall(dep)||{};S._wxDraft={dep:dep,reasons:_wxCallReasons(c).slice(),nextDay:c.nextDay||'',comment:c.comment||''};}render();};
window.wxToggleReason=function(r){S._wxDraft=S._wxDraft||{};var a=S._wxDraft.reasons||(S._wxDraft.reasons=[]);var i=a.indexOf(r);if(i>=0)a.splice(i,1);else a.push(r);render();};   // multi-select, toggleable
window.wxDraftSet=function(field,val){S._wxDraft=S._wxDraft||{};S._wxDraft[field]=val;if(field!=='comment')render();};   // comment via oninput → no render (keep focus)
window.wxSubmit=function(status){
  var d=S._wxDraft||{};var dep=d.dep;if(!dep)return;var reasons=(d.reasons||[]).slice();
  if((status==='cancelled'||status==='final')&&!reasons.length){if(typeof toast==='function')toast('Pick at least one reason (cloud/rain/wind/snow/visibility) first.','warn');return;}
  S._rzWxCalls=S._rzWxCalls||{};
  S._rzWxCalls[String(dep)]={status:status,reasons:(status==='on'?[]:reasons),nextDay:(status==='cancelled'?(d.nextDay||''):''),comment:d.comment||'',by:(S.user&&(S.user.name||S.user.email))||'',at:new Date().toISOString()};
  S._wxOpen=null;S._wxDraft=null;
  if(window.pickupSave)window.pickupSave(true);if(typeof _rzPickupBroadcast==='function')_rzPickupBroadcast();
  if(typeof auditLog==='function')auditLog('weather_call',{dep:dep,status:status,reasons:reasons.join(',')});
  if(typeof toast==='function')toast('Weather call recorded: '+_wxStatusLabel(status),status==='cancelled'?'warn':'ok');
  render();
};
window.wxClear=function(dep){if(S._rzWxCalls)delete S._rzWxCalls[String(dep)];S._wxOpen=null;if(window.pickupSave)window.pickupSave(true);if(typeof _rzPickupBroadcast==='function')_rzPickupBroadcast();if(typeof auditLog==='function')auditLog('weather_call_clear',{dep:dep});render();};
// Reminder check: 15 min before the deadline (deadline = depart − 1h), if no call yet, notify each PIC
// of that departure ONCE. The "_notified" flag rides in the synced blob so other devices don't re-send.
function _wxCheckReminders(){
  try{
    if(!S.user)return;var today=(typeof _todayLocal==='function')?_todayLocal():new Date().toISOString().slice(0,10);
    if(S.rezdyDate!==today)return;                       // only the live day
    var now=new Date();var nowMin=now.getHours()*60+now.getMinutes();
    var deps=_wxDepartures(today);var changed=false;
    deps.forEach(function(dep){
      var call=_wxCall(dep.time);if(call&&call.status)return;             // already called
      var deadline=dep.depMin-_wxLeadMin();var windowStart=deadline-_wxNotifyBeforeDeadlineMin();
      if(nowMin<windowStart||nowMin>deadline)return;                     // not in the 15-min reminder window
      if(!(dep.pics||[]).length)return;                                  // no PIC allocated yet → don't burn the reminder flag
      S._rzWxCalls=S._rzWxCalls||{};var rec=S._rzWxCalls[dep.time]||{};
      if(rec._notified)return;                                          // already reminded (synced flag)
      rec._notified=true;S._rzWxCalls[dep.time]=rec;changed=true;
      // notify each PIC of this departure
      var msg='A weather call is required for your '+dep.time+' '+(dep.prod||'flight')+' departing '+_rzWxAmPm(dep.time)+'.';
      (dep.pics||[]).forEach(function(code){
        var u=_rzWxUserForPilot(code);if(!u||!u.id)return;
        try{sbU('ts_notifications',[{user_id:u.id,type:'weather_call',message:msg,read:false,created_at:new Date().toISOString()}]);}catch(e){}
      });
    });
    if(changed&&window.pickupSave){window.pickupSave(true);if(typeof _rzPickupBroadcast==='function')_rzPickupBroadcast();}
  }catch(e){}
}
function _rzWxAmPm(t){var m=/^(\d{1,2}):(\d{2})$/.exec(String(t||''));if(!m)return t;var h=+m[1],mm=m[2];var ap=h<12?'am':'pm';var h12=((h%12)||12);return h12+(mm==='00'?'':':'+mm)+ap;}
// Resolve a pilot code (e.g. 'TP') to a user record (for notifications) via the crew → user link.
function _rzWxUserForPilot(code){
  if(!code)return null;code=String(code).trim();
  var crew=(S.crew||[]).find(function(c){return (c.code||'').toUpperCase()===code.toUpperCase();});
  var nm=(crew&&crew.n)||'';
  var ln=function(s){return String(s||'').trim().toLowerCase();};
  return (S.users||[]).find(function(u){return (u.linkedCrew&&crew&&ln(u.linkedCrew)===ln(crew.n))||(nm&&u.name===nm)||(u.name||'').toUpperCase()===code.toUpperCase();})||null;
}
try{setInterval(function(){try{_wxCheckReminders();}catch(e){}},60000);}catch(_e){}
function _wxDayLabel(iso,baseDate){var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];try{var d=new Date(iso+'T00:00:00');var b=baseDate?new Date(baseDate+'T00:00:00'):new Date();var diff=Math.round((d-b)/86400000);if(diff===1)return 'Tomorrow';return days[d.getDay()]+' '+d.getDate();}catch(e){return iso;}}
function _rzRenderWeatherCalls(){
  var date=S.rezdyDate;
  // Make sure this day's data is loaded (bookings drive the departures; schedule adds manual blocks).
  if(S._rezdyBookings==null&&!S._rezdyLoading&&window.rezdyLoadBookings)window.rezdyLoadBookings();
  if(!S._schedBlocks&&window.rezdyLoadSchedule)window.rezdyLoadSchedule();
  var loading=(S._rezdyLoading||S._rezdyBookings==null);
  var _today=(typeof _rzToday==='function')?_rzToday():date;
  // Lightweight, NON-sticky date nav (the operations date row's sticky header + Rezdy-refresh button
  // glitched here). Just ◁ / date / ▷ / Today — each shift loads the new day's data.
  var nav='<div class="card" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
    '<button class="btn btn-ghost" style="font-size:15px;padding:5px 11px;line-height:1" title="Previous day" onclick="window.rezdyShiftDate(-1)">◁</button>'+
    '<span style="flex:1;text-align:center;font-size:14px;font-weight:700;color:var(--text1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📅 '+_rzEsc(_rzDowLabel(date))+'</span>'+
    '<button class="btn btn-ghost" style="font-size:15px;padding:5px 11px;line-height:1" title="Next day" onclick="window.rezdyShiftDate(1)">▷</button>'+
    '<button class="btn btn-ghost" style="font-size:12px;padding:6px 12px'+(date===_today?';opacity:.45':'')+'" title="Jump to today" onclick="window.rezdySetDate(\''+_today+'\')">Today</button>'+
  '</div>';
  var deps=loading?[]:_wxDepartures(date);
  var h=nav+'<div class="card"><div class="st" style="margin-bottom:8px">Weather calls</div>';
  if(loading){h+='<div style="padding:24px;text-align:center;color:var(--text3);font-size:13px">Loading…</div></div>';return h;}
  if(!deps.length){h+='<div style="padding:24px;text-align:center;color:var(--text3);font-size:13px">No departures scheduled for this day.</div></div>';return h;}
  var nd=_wxNextDays(date);var draft=S._wxDraft||{};
  deps.forEach(function(dep){
    var call=_wxCall(dep.time);var st=call&&call.status;var col=_wxStatusColor(st);
    var acPills=dep.acs.map(function(a){var c=(typeof _rzAcCol==='function')?_rzAcCol(a):'#888';return '<span style="display:inline-block;border:1.5px solid '+c+';color:'+c+';border-radius:8px;padding:0 7px;font-weight:800;font-size:11px;white-space:nowrap">'+_rzEsc(String(a).replace('ZK-',''))+'</span>';}).join(' ');
    var picStr=dep.pics.length?dep.pics.join(', '):'';
    var _rs=_wxCallReasons(call);
    var open=S._wxOpen===dep.time;
    h+='<div style="border:1px solid '+(st?col:'var(--border2)')+';border-left:4px solid '+col+';border-radius:10px;margin:8px 0;overflow:hidden">'+
      '<div onclick="window.wxOpenDep(\''+dep.time+'\')" style="display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer">'+
        '<div style="font-weight:800;font-size:15px;color:var(--text1);min-width:54px">'+_rzEsc(dep.time)+'</div>'+
        '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:var(--text2);display:flex;align-items:center;gap:5px;flex-wrap:wrap"><span>'+_rzEsc(dep.prod||'FCF')+'</span>'+acPills+(picStr?'<span style="color:var(--text3);font-weight:600">'+_rzEsc(picStr)+'</span>':'')+'</div>'+
          (call?'<div style="font-size:11px;color:var(--text3)">'+_rzEsc(_wxStatusLabel(st))+(_rs.length?' — '+_rzEsc(_rs.join(', ')):'')+(call.nextDay?' · next: '+_rzEsc(_wxDayLabel(call.nextDay,date)):'')+(call.by?' · by '+_rzEsc(call.by):'')+(call.comment?' · “'+_rzEsc(call.comment)+'”':'')+'</div>':'')+
        '</div>'+
        '<span style="flex-shrink:0;padding:3px 10px;border-radius:14px;background:'+col+'22;border:1px solid '+col+';color:'+col+';font-size:11px;font-weight:800">'+(st==='on'?'✓ ON':st==='cancelled'?'✕ CXLD':st==='final'?'⚠ FINAL':'— set')+'</span>'+
      '</div>';
    if(open){
      h+='<div style="padding:0 13px 13px;border-top:1px solid var(--border2)">'+
        '<div style="font-size:11px;color:var(--text3);margin:10px 0 6px">Reason (for cancelled / final — tap any that apply):</div>'+
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">'+_WX_REASONS.map(function(r){var on=(draft.reasons||[]).indexOf(r)>=0;return '<button onclick="window.wxToggleReason(\''+r+'\')" style="padding:5px 11px;border-radius:14px;border:1px solid '+(on?'#ef4444':'var(--border2)')+';background:'+(on?'rgba(239,68,68,.15)':'transparent')+';color:'+(on?'#f87171':'var(--text2)')+';font-size:12px;font-weight:700;cursor:pointer">'+(on?'✓ ':'')+r+'</button>';}).join('')+'</div>'+
        '<div style="font-size:11px;color:var(--text3);margin:0 0 6px">Next best day (if cancelled):</div>'+
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">'+nd.map(function(d){var on=draft.nextDay===d.val;return '<button onclick="window.wxDraftSet(\'nextDay\',\''+d.val+'\')" style="padding:5px 11px;border-radius:14px;border:1px solid '+(on?'var(--accent)':'var(--border2)')+';background:'+(on?'rgba(124,58,237,.12)':'transparent')+';color:var(--text2);font-size:12px;font-weight:700;cursor:pointer">'+d.label+'</button>';}).join('')+'</div>'+
        '<textarea oninput="window.wxDraftSet(\'comment\',this.value)" placeholder="Comment (optional)" style="width:100%;box-sizing:border-box;min-height:54px;font-size:14px;padding:9px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:8px;margin-bottom:10px">'+_rzEsc(draft.comment||'')+'</textarea>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
          '<button onclick="window.wxSubmit(\'on\')" style="flex:1;min-width:110px;padding:10px;border-radius:9px;border:none;background:#22c55e;color:#fff;font-size:13px;font-weight:800;cursor:pointer">✓ Called ON</button>'+
          '<button onclick="window.wxSubmit(\'cancelled\')" style="flex:1;min-width:110px;padding:10px;border-radius:9px;border:none;background:#ef4444;color:#fff;font-size:13px;font-weight:800;cursor:pointer">✕ Cancelled</button>'+
          '<button onclick="window.wxSubmit(\'final\')" style="flex:1;min-width:110px;padding:10px;border-radius:9px;border:none;background:#f59e0b;color:#3a2c06;font-size:13px;font-weight:800;cursor:pointer">⚠ Final (office)</button>'+
        '</div>'+
        (call?'<button onclick="window.wxClear(\''+dep.time+'\')" style="margin-top:8px;background:none;border:none;color:var(--text3);font-size:11px;text-decoration:underline;cursor:pointer">clear this call</button>':'')+
      '</div>';
    }
    h+='</div>';
  });
  h+='</div>';
  return h;
}
window._rzRenderWeatherCalls=_rzRenderWeatherCalls;
// Reset the day to the pure optimiser: clear every USER-forced aircraft + pilot/co-pilot pick and
// flyback combine for the current date, so the calendar shows the auto-allocation only. Times,
// check-ins, pickups, weather calls are left untouched. Undoable.
window.rezdyResetDayAuto=function(){
  var lbl=(typeof _rzDowLabel==='function')?_rzDowLabel(S.rezdyDate):S.rezdyDate;
  if(!confirm('Reset '+lbl+' to the optimiser?\n\nThis clears every aircraft and pilot you’ve set by hand for this day and shows the auto-allocation. Times, check-ins, pickups and weather calls are not touched. (Undoable.)'))return;
  if(typeof _rzSchedPushUndo==='function')_rzSchedPushUndo();
  S._rzBookingAc={};S._schedPilots={};S._schedCoPilots={};S._rzSchedAttach={};
  if(window.pickupSave)window.pickupSave(true);
  if(typeof _rzSchedBroadcast==='function')_rzSchedBroadcast();
  if(typeof _rzPickupBroadcast==='function')_rzPickupBroadcast();
  if(typeof auditLog==='function')auditLog('sched_reset_auto',{date:S.rezdyDate});
  if(typeof toast==='function')toast('Reset to the optimiser — showing the auto allocation','ok');
  render();
};
// Reassign every booking in a calendar block to an aircraft — exactly like the user picking the
// aircraft pill on each booking (sets S._rzBookingAc, which overrides the comments). Returns count.
function _rzReassignBlockToAc(src,ac){
  var orders=_rzOrdersForBlockKey(src);if(!orders.length)return 0;
  var setTo=(ac==='__unalloc__')?'__none__':ac;
  S._rzBookingAc=S._rzBookingAc||{};S._rzSchedAttach=S._rzSchedAttach||{};
  orders.forEach(function(o){S._rzBookingAc[o]=setTo;if(S._rzSchedAttach[o])delete S._rzSchedAttach[o];}); // moving a block breaks any flyback combine
  return orders.length;
}
function _rzReassignToast(n,ac){if(typeof toast==='function')toast(n+' booking'+(n===1?'':'s')+' → '+(ac==='__unalloc__'?'Unallocated':String(ac).replace('ZK-',''))+' ✓','ok');}
// Click-to-change a single booking's aircraft from the calendar block detail (the calendar is the
// source of truth — this user override persists in S._rzBookingAc and flows to the seatmap/loadsheet
// via _rzBookingAc → acHint). Toggling the picker open/closed is per-order.
window.rezdySchedAcPickToggle=function(order){order=String(order);S._rzAcPickFor=(S._rzAcPickFor===order)?null:order;render();};
window.rezdySchedSetBookingAc=function(order,ac){
  order=String(order);if(!order)return;
  if(typeof _rzSchedPushUndo==='function')_rzSchedPushUndo();
  S._rzBookingAc=S._rzBookingAc||{};
  S._rzBookingAc[order]=(ac==='__unalloc__'||ac==='__none__')?'__none__':ac;
  if(S._rzSchedAttach&&S._rzSchedAttach[order])delete S._rzSchedAttach[order]; // a manual move breaks a flyback combine
  S._rzAcPickFor=null;
  if(window.pickupSave)window.pickupSave(true);if(typeof _rzSchedBroadcast==='function')_rzSchedBroadcast();render();
  if(typeof toast==='function')toast('Booking → '+(ac==='__unalloc__'||ac==='__none__'?'Unallocated':String(ac).replace('ZK-',''))+' ✓','ok');
};
// Drop a dragged block anywhere in an aircraft COLUMN → move its whole booking set to that aircraft.
// Drop a dragged booking block in a column: sets its TIME from the drop height (snapped to 15 min) and,
// if dropped in a different aircraft column, reassigns it. A flyback's time updates its fly-back time;
// any other departure gets a display time-shift (Rezdy can't actually move a tour, so this is local).
// While dragging a block over a column, draw a dashed-red guideline at the 15-min-snapped target time
// so you can see exactly where it will land. Pure DOM (no re-render) so it's smooth.
function _rzDragSnapMins(e){
  var ct=e&&e.currentTarget;if(!ct||!ct.getBoundingClientRect)return null;
  var rect=ct.getBoundingClientRect();var y=(e.clientY||0)-rect.top-(S._rzSchedBlockGrabDy||0);  // block TOP, not cursor
  var mins=_RZ_SCH_START*60+y/_RZ_PX_PER_MIN;mins=Math.round(mins/15)*15;          // lock to 15-minute steps
  return Math.max(_RZ_SCH_START*60,Math.min(_RZ_SCH_END*60,mins));
}
window.rezdySchedDragOverCol=function(e){
  if(e&&e.preventDefault)e.preventDefault();
  if(!S._rzSchedBlockDrag)return;                                                  // only for block drags, not pilots
  var mins=_rzDragSnapMins(e);if(mins==null)return;
  var ln=document.getElementById('rzDragLine');if(!ln)return;
  ln.style.top=((mins-_RZ_SCH_START*60)*_RZ_PX_PER_MIN)+'px';ln.style.display='block';
  var t=document.getElementById('rzDragLineT');if(t)t.textContent=String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
};
window.rezdySchedDragEnd=function(){var ln=document.getElementById('rzDragLine');if(ln)ln.style.display='none';};
window.rezdySchedDropBlockToAc=function(ac,e){
  if(e&&e.preventDefault)e.preventDefault();
  var _dl=document.getElementById('rzDragLine');if(_dl)_dl.style.display='none';
  var src=S._rzSchedBlockDrag;S._rzSchedBlockDrag=null;
  if(!src||!ac)return;
  // Drop Y → the same 15-minute-snapped time the guideline showed (block top, grab-offset aware).
  var newTime=null;var _sm=_rzDragSnapMins(e);
  if(_sm!=null){_sm=Math.min((_RZ_SCH_END*60)-15,_sm);newTime=String(Math.floor(_sm/60)).padStart(2,'0')+':'+String(_sm%60).padStart(2,'0');}
  // Edge resize — set just the departure (top) or return (bottom) time of a booking block.
  if(String(src).indexOf('EDGE|')===0){var ep=String(src).split('|');window.rezdySchedSetEdge(ep[2]||'',ep[3]||'',ep[1]||'top',newTime);return;}
  // Manual block (maintenance ferry / training / etc.) — change its time and/or aircraft.
  if(String(src).indexOf('BLK|')===0){window.rezdySchedMoveBlock(String(src).slice(4),newTime,ac);return;}
  var parts=String(src).split('|');var srcAc=parts[0]||null;var srcStart=parts[1]||'';var srcProd=parts[2]||'';
  var changed=false;
  if(newTime){
    if(_rzIsFlyback(srcProd)){
      S._rzFlybackTime=S._rzFlybackTime||{};S._rzFlybackTime[_rzFbTimeKey(srcProd,srcStart)]=newTime;changed=true;  // store any time, incl 15:30
    } else if(srcProd){
      S._rzDepTimeOv=S._rzDepTimeOv||{};var dk=srcProd+'|'+srcStart;
      if(newTime!==srcStart)S._rzDepTimeOv[dk]=newTime;else delete S._rzDepTimeOv[dk];changed=true;
    }
  }
  if(srcAc&&srcAc!==ac){_rzSchedPushUndo();var n=_rzReassignBlockToAc(src,ac);if(n){changed=true;_rzReassignToast(n,ac);}}
  if(changed){if(window.pickupSave)window.pickupSave(true);if(typeof _rzSchedBroadcast==='function')_rzSchedBroadcast();render();}
};
// Move/retime a manual schedule block (maintenance ferry, training, hire…) by dragging it. Updates
// its start (keeping its duration) and, if dropped in another aircraft column, its aircraft; persists
// to ts_schedule like the block editor does.
window.rezdySchedMoveBlock=async function(id,newStart,newAc){
  var b=(S._schedBlocks||[]).find(function(x){return String(x.id)===String(id);});if(!b)return;
  var changed=false;
  if(newStart){var sm=_rzMinsFromHHMM(b.start),em=_rzMinsFromHHMM(b.end);var dur=(sm!=null&&em!=null&&em>sm)?(em-sm):30;var nm=_rzMinsFromHHMM(newStart);if(nm!=null&&newStart!==b.start){b.start=newStart;var ne=nm+dur;b.end=String(Math.floor(ne/60)).padStart(2,'0')+':'+String(ne%60).padStart(2,'0');changed=true;}}
  if(newAc&&newAc!==b.aircraft&&((S&&S.aircraft)||{})[newAc]){b.aircraft=newAc;if(typeof _rzAcCol==='function')b.color=_rzAcCol(newAc);changed=true;}
  if(!changed)return;
  render();   // optimistic — reflect immediately
  try{var payload={id:b.id,block_date:S.rezdyDate,data:{aircraft:b.aircraft,label:b.label||'',start:b.start,end:b.end,color:b.color||((typeof _rzAcCol==='function')?_rzAcCol(b.aircraft):''),notes:b.notes||'',ftype:b.ftype||'Maintenance'}};
    if(typeof sbU==='function')await sbU('ts_schedule',[payload]);}catch(e){}
  if(typeof _rzSchedBroadcast==='function')_rzSchedBroadcast();
};
// ── Pointer-based block move / resize (smooth; replaces the glitchy native HTML5 drag) ─────────────
// Grab the TOP 12px → set departure; BOTTOM 12px → set return; middle → move the block (and reassign
// aircraft if dropped in another column). A flyback just moves (sets its fly-back time). A tap (no
// drag) opens the flight. Works with mouse and touch.
function _rzColAcAt(x,y){try{var els=document.elementsFromPoint(x,y);for(var i=0;i<els.length;i++){var a=els[i].getAttribute&&els[i].getAttribute('data-ac');if(a)return a;}}catch(_){}return null;}
function _rzBlockKeyAt(x,y,exclude){try{var els=document.elementsFromPoint(x,y);for(var i=0;i<els.length;i++){var k=els[i].getAttribute&&els[i].getAttribute('data-bkkey');if(k&&k!==exclude)return k;}}catch(_){}return null;}
window.rzCalDown=function(e,key){
  if(e.button!=null&&e.button!==0)return;
  var meta=(S._rzBlockMeta||{})[key];if(!meta||meta.startMin==null||meta.endMin==null)return; // unparseable time → don't start a drag
  var blk=e.currentTarget,col=blk.parentNode;
  var rect=blk.getBoundingClientRect(),crect=col.getBoundingClientRect();
  var offY=e.clientY-rect.top;
  var zone=meta.canResize?(offY<12?'top':(offY>rect.height-12?'bot':'move')):'move';
  var grabMin=_RZ_SCH_START*60+(e.clientY-crect.top)/_RZ_PX_PER_MIN;
  S._rzDragState={meta:meta,zone:zone,gridTop:crect.top,sx:e.clientX,sy:e.clientY,grabOff:grabMin-meta.startMin,blk:blk,moved:false,_val:null};
  try{blk.setPointerCapture(e.pointerId);}catch(_){}
  document.addEventListener('pointermove',_rzCalMove,true);
  document.addEventListener('pointerup',_rzCalUp,true);
  document.addEventListener('pointercancel',_rzCalUp,true);
  if(e.preventDefault)e.preventDefault();if(e.stopPropagation)e.stopPropagation();
};
function _rzCalMove(e){
  var st=S._rzDragState;if(!st)return;
  if(!st.moved&&Math.abs(e.clientY-st.sy)<4&&Math.abs(e.clientX-st.sx)<4)return;
  st.moved=true;
  var pm=_RZ_PX_PER_MIN,startM=st.meta.startMin,endM=st.meta.endMin,nt,nh,gm;
  var snap=Math.round((_RZ_SCH_START*60+(e.clientY-st.gridTop)/pm)/15)*15;
  if(st.zone==='top'){var ns=Math.max(_RZ_SCH_START*60,Math.min(snap,endM-15));nt=(ns-_RZ_SCH_START*60)*pm;nh=(endM-ns)*pm;st._val=ns;gm=ns;}
  else if(st.zone==='bot'){var ne=Math.min(_RZ_SCH_END*60,Math.max(snap,startM+15));nt=(startM-_RZ_SCH_START*60)*pm;nh=(ne-startM)*pm;st._val=ne;gm=ne;}
  else{var dur=endM-startM;var nsm=Math.max(_RZ_SCH_START*60,Math.min(_RZ_SCH_END*60-dur,Math.round((snap-st.grabOff)/15)*15));nt=(nsm-_RZ_SCH_START*60)*pm;nh=dur*pm;st._val=nsm;gm=nsm;}
  st.blk.style.top=nt+'px';st.blk.style.height=Math.max(8,nh)+'px';st.blk.style.opacity='.85';st.blk.style.zIndex='80';
  // On a MOVE, follow the cursor horizontally too so you can see which aircraft column it'll land in
  // (resize stays vertical). Also highlight the column under the cursor.
  if(st.zone==='move'){st.blk.style.transform='translateX('+(e.clientX-st.sx)+'px)';st.blk.style.pointerEvents='none';
    var hovAc=_rzColAcAt(e.clientX,e.clientY);
    if(hovAc!==st._hovAc){_rzClearColHi();st._hovAc=hovAc;
      if(hovAc){try{var els=document.elementsFromPoint(e.clientX,e.clientY);for(var i=0;i<els.length;i++){if(els[i].getAttribute&&els[i].getAttribute('data-ac')===hovAc){els[i].style.boxShadow='inset 0 0 0 2px var(--acc,#60a5fa)';S._rzHiCol=els[i];break;}}}catch(_){}}
    }
  }
  var ln=document.getElementById('rzDragLine');if(ln){ln.style.top=((gm-_RZ_SCH_START*60)*pm)+'px';ln.style.display='block';var tt=document.getElementById('rzDragLineT');if(tt)tt.textContent=_rzMinToHHMM(gm);}
}
function _rzClearColHi(){if(S._rzHiCol){try{S._rzHiCol.style.boxShadow='';}catch(_){}S._rzHiCol=null;}}
function _rzCalUp(e){
  var st=S._rzDragState;S._rzDragState=null;
  document.removeEventListener('pointermove',_rzCalMove,true);
  document.removeEventListener('pointerup',_rzCalUp,true);
  document.removeEventListener('pointercancel',_rzCalUp,true);
  _rzClearColHi();
  var ln=document.getElementById('rzDragLine');if(ln)ln.style.display='none';
  if(!st)return;var m=st.meta;
  if(!st.moved){if(m.isManual)window.schedEditBlock(m.id);else window.rezdySchedShowGroup(m.order);return;} // tap = open
  var v=st._val;if(v==null){render();return;}var hhmm=_rzMinToHHMM(v);
  if(m.isManual){var _mac=_rzColAcAt(e.clientX,e.clientY)||m.ac;window.rezdySchedMoveBlock(m.id,hhmm,_mac);render();return;} // render() guarantees the live preview styles are cleared even on a no-op move
  if(m.isFb){
    // Resize: drag the TOP edge to set the return (fly-back) time, the BOTTOM edge to set the end.
    if(st.zone==='top'){window.rezdySetFlybackTime(m.prod,m.origStart,hhmm);return;}
    if(st.zone==='bot'){window.rezdySetFlybackEnd(m.prod,m.origStart,hhmm);return;}
    // Move: dropped onto another flight? → fold this flyback into it (combine), like the old drag did.
    var tgt=_rzBlockKeyAt(e.clientX,e.clientY,m.key);var tgtAc=tgt?String(tgt).split('|')[0]:null;
    if(tgt&&tgtAc&&tgtAc!=='__unalloc__'&&!_rzIsFlyback(String(tgt).split('|')[2]||'')&&typeof _rzOrdersForBlockKey==='function'){
      var ords=_rzOrdersForBlockKey(m.key);S._rzSchedAttach=S._rzSchedAttach||{};S._rzBookingAc=S._rzBookingAc||{};
      if(typeof _rzSchedPushUndo==='function')_rzSchedPushUndo();
      ords.forEach(function(o){S._rzSchedAttach[o]=tgt;S._rzBookingAc[o]=tgtAc;});
      if(window.pickupSave)window.pickupSave(true);if(typeof _rzSchedBroadcast==='function')_rzSchedBroadcast();render();return;
    }
    // Dropped on an aircraft COLUMN → assign the flyback to that aircraft (its own block), plus set its
    // fly-back time from the drop height. Keyed by the HELD slot (m.origStart) so it round-trips. If a
    // custom end was set, shift it with the move so the duration is preserved.
    var fcol=_rzColAcAt(e.clientX,e.clientY);if(fcol==='__unalloc__')fcol='__none__';if(fcol==='__misc__')fcol=null;
    var _fCur=(m.ac==='__unalloc__')?'__none__':m.ac;
    if(fcol&&fcol!==m.ac&&fcol!==_fCur&&typeof _rzReassignBlockToAc==='function'){if(typeof _rzSchedPushUndo==='function')_rzSchedPushUndo();_rzReassignBlockToAc(m.key,fcol);}
    var _fk=_rzFbTimeKey(m.prod,m.origStart);
    S._rzFlybackTime=S._rzFlybackTime||{};
    if(S._rzFlybackEnd&&S._rzFlybackEnd[_fk]!=null){var _fdur=m.endMin-m.startMin;S._rzFlybackEnd[_fk]=_rzMinToHHMM(_rzMinsFromHHMM(hhmm)+_fdur);}
    S._rzFlybackTime[_fk]=hhmm;
    if(window.pickupSave)window.pickupSave(true);if(typeof _rzSchedBroadcast==='function')_rzSchedBroadcast();render();return;
  }
  if(st.zone==='top'){window.rezdySchedSetEdge(m.prod,m.origStart,'top',hhmm);return;}
  if(st.zone==='bot'){window.rezdySchedSetEdge(m.prod,m.origStart,'bot',hhmm);return;}
  // Move the whole booking block: shift departure (return follows), reassign aircraft if dropped elsewhere.
  var kk=m.prod+'|'+m.origStart;
  S._rzDepTimeOv=S._rzDepTimeOv||{};
  if(hhmm!==m.origStart){           // only record an override if it actually moved (avoids a spurious "moved" banner)
    S._rzDepTimeOv[kk]=hhmm;
    if(S._rzDepEndOv&&S._rzDepEndOv[kk]!=null){var d=m.endMin-m.startMin;S._rzDepEndOv[kk]=_rzMinToHHMM(_rzMinsFromHHMM(hhmm)+d);}
  } else { delete S._rzDepTimeOv[kk]; }
  var col2=_rzColAcAt(e.clientX,e.clientY);
  if(col2==='__unalloc__')col2='__none__';if(col2==='__misc__')col2=null;
  var _curAc=(m.ac==='__unalloc__')?'__none__':m.ac;
  if(col2&&col2!==m.ac&&col2!==_curAc&&typeof _rzReassignBlockToAc==='function'){if(typeof _rzSchedPushUndo==='function')_rzSchedPushUndo();_rzReassignBlockToAc(m.key,col2);}
  if(window.pickupSave)window.pickupSave(true);if(typeof _rzSchedBroadcast==='function')_rzSchedBroadcast();render();
}
// Set just the departure (top) or return (bottom) time of a booking block (called by the pointer drag).
window.rezdySchedSetEdge=function(prod,origStart,edge,val){
  var k=String(prod||'')+'|'+String(origStart||'');
  if(edge==='top'){S._rzDepTimeOv=S._rzDepTimeOv||{};if(val)S._rzDepTimeOv[k]=val;else delete S._rzDepTimeOv[k];}
  else{S._rzDepEndOv=S._rzDepEndOv||{};if(val)S._rzDepEndOv[k]=val;else delete S._rzDepEndOv[k];}
  if(window.pickupSave)window.pickupSave(true);if(typeof _rzSchedBroadcast==='function')_rzSchedBroadcast();render();
};
// Clear a departure's manual time-shift (back to the Rezdy tour time).
window.rezdyClearDepTime=function(prod,start){var k=String(prod||'')+'|'+String(start||'');if(S._rzDepTimeOv)delete S._rzDepTimeOv[k];if(S._rzDepEndOv)delete S._rzDepEndOv[k];if(window.pickupSave)window.pickupSave(true);if(typeof _rzSchedBroadcast==='function')_rzSchedBroadcast();render();};
window.rezdySchedDropPilot=function(key,e){
  if(e&&e.preventDefault)e.preventDefault();if(e&&e.stopPropagation)e.stopPropagation();
  var _dl0=document.getElementById('rzDragLine');if(_dl0)_dl0.style.display='none';
  // A block dragged onto another block: a flyback/CCF folds INTO that flight (combine, as before);
  // any other block just moves its bookings to that block's aircraft.
  if(S._rzSchedBlockDrag){
    var src=S._rzSchedBlockDrag;S._rzSchedBlockDrag=null;
    if(src===key)return;
    var tgtAc=String(key).indexOf('|')>=0?String(key).split('|')[0]:null;
    var srcProd=String(src).indexOf('|')>=0?(String(src).split('|')[2]||''):'';
    if(_rzIsFlyback(srcProd)&&tgtAc&&tgtAc!=='__unalloc__'){
      var orders=_rzOrdersForBlockKey(src);
      _rzSchedPushUndo();
      S._rzSchedAttach=S._rzSchedAttach||{};
      orders.forEach(function(o){S._rzSchedAttach[o]=key;S._rzBookingAc=S._rzBookingAc||{};S._rzBookingAc[o]=tgtAc;});
      if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();return;
    }
    if(tgtAc){_rzSchedPushUndo();var nn=_rzReassignBlockToAc(src,tgtAc);if(nn){if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();_rzReassignToast(nn,tgtAc);}}
    return;
  }
  var code=S._schedPilotDrag;S._schedPilotDrag=null;if(!code||!key)return;
  // Only a type-rated pilot may be put on a given aircraft.
  var ac=null;
  if(String(key).indexOf('|')>=0)ac=String(key).split('|')[0];
  else{var blk=(S._schedBlocks||[]).find(function(b){return String(b.id)===String(key);});ac=blk&&blk.aircraft;}
  if(ac&&ac!=='__unalloc__'){
    if(typeof _pilotRatedForAc==='function'&&!_pilotRatedForAc(code,ac)){if(typeof toast==='function')toast(code+' is not type-rated on '+String(ac).replace('ZK-','')+'.','warn');return;}
  }
  S._schedPilots=S._schedPilots||{};S._schedPilots[String(key)]=code;
  if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();
};
window.rezdySchedClearPilot=function(key){if(S._schedPilots)delete S._schedPilots[String(key)];if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();};
// Click-to-set pilot (alternative to drag-and-drop). Clicking the already-assigned pilot clears it.
window.rezdySchedSetPilot=function(key,code){
  key=String(key);if(!key||!code)return;
  var ac=null;
  if(key.indexOf('|')>=0)ac=key.split('|')[0];
  else{var blk=(S._schedBlocks||[]).find(function(b){return String(b.id)===key;});ac=blk&&blk.aircraft;}
  if(ac&&ac!=='__unalloc__'){if(typeof _pilotRatedForAc==='function'&&!_pilotRatedForAc(code,ac)){if(typeof toast==='function')toast(code+' is not type-rated on '+String(ac).replace('ZK-','')+'.','warn');return;}}
  S._schedPilots=S._schedPilots||{};
  if(S._schedPilots[key]===code)delete S._schedPilots[key];else S._schedPilots[key]=code;  // toggle off if re-tapped
  if(S._schedCoPilots&&S._schedCoPilots[key]===code)delete S._schedCoPilots[key]; // can't be PIC + co at once
  if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();
};
// CO-PILOT on a flight block (a SECOND crew member — distinct from the PIC). Drag / "Set pilot"
// SWAPS the PIC; this ADDS a co-pilot via the block's click-to-set picker. Co-pilot need NOT be
// type-rated on the aircraft (only the PIC must be). Re-tapping the same code clears it. Flows
// through to the seatmap (seat 1), loadsheet (form.coPilot) and Pilot movements.
window.rezdySchedClearCoPilot=function(key){if(S._schedCoPilots)delete S._schedCoPilots[String(key)];if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();};
window.rezdySchedSetCoPilot=function(key,code){
  key=String(key);if(!key||!code)return;
  var pic=(S._schedPilots||{})[key]||(S._schedAutoPilots||{})[key];
  if(pic===code){if(typeof toast==='function')toast(code+' is the PIC on this flight — pick a different co-pilot.','warn');return;}
  S._schedCoPilots=S._schedCoPilots||{};
  if(S._schedCoPilots[key]===code)delete S._schedCoPilots[key];else S._schedCoPilots[key]=code;  // toggle off if re-tapped
  if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();
};
// Detach a flyback booking from a flight (revert the combine).
window.rezdySchedDetach=function(order){order=String(order);_rzSchedPushUndo();if(S._rzSchedAttach)delete S._rzSchedAttach[order];if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();};

// ── Calendar combine: UNDO + RESET TO REZDY ────────────────────────────────────
// Snapshot the aircraft-override + flyback-attach maps before any combine/move so it can be undone.
function _rzSchedPushUndo(){
  S._rzSchedUndo=S._rzSchedUndo||[];
  try{S._rzSchedUndo.push({ac:JSON.parse(JSON.stringify(S._rzBookingAc||{})),at:JSON.parse(JSON.stringify(S._rzSchedAttach||{}))});}catch(_){}
  if(S._rzSchedUndo.length>40)S._rzSchedUndo.shift();
}
window.rezdySchedUndo=function(){
  if(!(S._rzSchedUndo&&S._rzSchedUndo.length)){if(typeof toast==='function')toast('Nothing to undo','warn');return;}
  var s=S._rzSchedUndo.pop();
  S._rzBookingAc=s.ac||{};S._rzSchedAttach=s.at||{};
  if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();
  if(typeof toast==='function')toast('Undone ✓','ok');
};
// Reset every booking on THIS day back to Rezdy/comments (clears manual combines + aircraft moves).
window.rezdySchedResetRezdy=function(){
  if(typeof confirm==='function'&&!confirm('Reset all aircraft allocations for this day back to Rezdy (from booking comments)? This clears every manual combine and move on the day.'))return;
  _rzSchedPushUndo();
  var orders=(S._rezdyBookings||[]).map(function(b){return String(b.orderNumber||'');});
  orders.forEach(function(o){if(S._rzBookingAc)delete S._rzBookingAc[o];if(S._rzSchedAttach)delete S._rzSchedAttach[o];});
  if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();
  if(typeof toast==='function')toast('Reset to Rezdy ✓','ok');
};
// Passenger "bubbles" for a booking — loadsheet style: white card, group-colour left border,
// C (child) / i (infant) corner badges, TO PAY banner. opts.drag enables in-booking dragging:
// drop one bubble on another to make it that passenger's lap infant; tap toggles child.
// Declared weight = Rezdy raw + 4kg (legal allowance). null if no raw weight.
function _rzDeclared(raw){var n=parseFloat(String(raw==null?'':raw).replace(/\s*kg$/i,''));return isNaN(n)?null:n+4;}
function _rzCheckinPax(order){var c=(S._rzCheckin||{})[String(order)];return (c&&Array.isArray(c.pax))?c.pax:null;}
// Canonical seated-passenger rows for a booking. Once checked in, the captured check-in data
// (full names + ACTUAL weights) is authoritative; before, it's the Rezdy participants with
// DECLARED weights (raw + 4kg).
function _rzPaxRows(b){
  var order=String(b.orderNumber||'');
  var ci=_rzCheckinPax(order);
  if((S._rzBookingCheckedIn||{})[order]&&ci){
    // Infants captured at check-in are lap pax attached to another row (ci[].attach).
    var byI={};ci.forEach(function(r,i){if(r.type==='infant'&&r.attach!=null){(byI[r.attach]=byI[r.attach]||[]).push(r.name||'');}});
    return ci.filter(function(r){return r.type!=='infant';}).map(function(r,i){
      var a=parseFloat(r.actual);var origIdx=ci.indexOf(r);
      var infN=(byI[origIdx]&&byI[origIdx][0])?String(byI[origIdx][0]).split(/\s+/)[0]:null;
      return {idx:'c'+origIdx,name:r.name||'',declared:(r.declared!=null?r.declared:null),actual:isNaN(a)?null:a,type:r.type==='child'?'child':'adult',infName:infN};
    });
  }
  var parts=[];(b.items||[]).forEach(function(it){(it.participants||[]).forEach(function(p){parts.push(p);});});
  var m=(S._rezdyPaxMeta||{})[order]||{};var infantOf=m.infantOf||{};var types=m.types||{};
  var rows=[];
  parts.forEach(function(p,idx){
    if(infantOf[idx]!=null)return; // legacy-folded infant — shown on its host
    var t=types[idx]||_rzAgeType(p);
    var declared=(t==='infant')?null:_rzDeclared(p&&p.weight);
    var infName=null;
    Object.keys(infantOf).forEach(function(ii){if(String(infantOf[ii])===String(idx)){var ip=parts[ii];if(ip&&ip.name)infName=String(ip.name).trim().split(/\s+/)[0];}});
    rows.push({idx:idx,name:(p&&p.name)?String(p.name).trim():'',declared:declared,actual:null,type:t==='infant'?'infant':t==='child'?'child':'adult',infName:infName});
  });
  return rows;
}
function _rzPaxBubbles(b,opts){
  opts=opts||{};
  var order=String(b.orderNumber||'');
  var bal=parseFloat(b.balanceDue);var owing=isFinite(bal)&&bal>0;
  var gcol=_rzGroupColor(order);
  var checkedIn=!!((S._rzBookingCheckedIn||{})[order])&&!!_rzCheckinPax(order);
  var rows=_rzPaxRows(b);
  if(!rows.length)return '';
  var bubs='';
  rows.forEach(function(r){
    var nm=r.name?_rzEsc(String(r.name).split(/\s+/)[0]):'?';
    var isInf=r.type==='infant';
    var hasA=r.actual!=null;var hasD=r.declared!=null;
    var declRed=checkedIn&&!hasA&&hasD; // checked in but no actual weight captured → declared, shown red
    var wTxt=isInf?'lap':(hasA?(r.actual+'kg'):(hasD?(r.declared+'kg (d)'):'TBC'));
    var wCol=isInf?'#9d1768':(hasA?'#15803d':(declRed?'#dc2626':(hasD?'#1e293b':'#b45309'))); // pink lap / green actual / RED declared (checked-in, no actual) / black declared / amber TBC
    var wTitle=isInf?'Infant — lap':(hasA?'Actual weight':(hasD?(declRed?'No actual weight — using DECLARED (incl +4kg)':'Declared weight (incl +4kg)'):'Weight not declared'));
    var isChild=r.type==='child';var infName=r.infName;
    bubs+='<div class="pax-bubble" title="'+_rzEsc((r.name||'')+(infName?' (+ infant '+infName+')':''))+'" style="position:relative;overflow:hidden;background:rgba(255,255,255,.93);border-radius:8px;'+(owing?'border:2px solid #ef4444':'border-left:4px solid '+gcol)+';min-width:60px;flex-shrink:0;'+(isInf?'opacity:.85;':'')+'">'+
      (owing?'<div style="background:#ef4444;color:#fff;font-size:8px;font-weight:900;letter-spacing:.04em;text-align:center;line-height:1.7">$ TO PAY</div>':'')+
      (isChild?'<div style="position:absolute;bottom:3px;right:3px;font-size:8px;font-weight:900;background:rgba(251,146,60,.5);color:#c2500a;border-radius:3px;padding:0 3px;line-height:1.4;border:1px solid rgba(0,0,0,.4)">C</div>':'')+
      (isInf?'<div title="Infant" style="position:absolute;bottom:3px;left:3px;font-size:8px;font-weight:900;background:rgba(236,72,153,.5);color:#9d1768;border-radius:3px;padding:0 3px;line-height:1.4;border:1px solid rgba(0,0,0,.4)">i</div>':'')+
      (infName?'<div title="Infant: '+_rzEsc(infName)+'" style="position:absolute;bottom:3px;'+(isChild?'left:3px':'right:3px')+';font-size:8px;font-weight:900;background:rgba(236,72,153,.5);color:#9d1768;border-radius:3px;padding:0 3px;line-height:1.4;border:1px solid rgba(0,0,0,.4)">i</div>':'')+
      '<div style="padding:'+(owing?'2px 7px 4px':'4px 7px')+'">'+
        '<div style="font-size:11px;font-weight:700;color:#1e293b;white-space:nowrap;max-width:96px;overflow:hidden;text-overflow:ellipsis">'+nm+'</div>'+
        '<div title="'+wTitle+'" style="font-size:10px;font-weight:700;color:'+wCol+'">'+wTxt+'</div>'+
      '</div></div>';
  });
  if(!bubs)return '';
  var bd='<span style="font-size:12px;font-weight:800;color:var(--text1);align-self:center">'+_rzBdText(_rzEffBreakdown(b))+'</span>';
  return '<div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px 10px;align-items:stretch">'+
    '<span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800;align-self:center;margin-right:2px">Pax</span>'+bd+bubs+'</div>';
}
window.rezdyPaxDragStart=function(order,idx,e){S._rezdyPaxDrag={order:String(order),idx:idx};try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','pax');}catch(_){}};
window.rezdyPaxDropInfant=function(order,hostIdx,e){
  if(e&&e.preventDefault)e.preventDefault();if(e&&e.stopPropagation)e.stopPropagation();
  var d=S._rezdyPaxDrag;S._rezdyPaxDrag=null;
  if(!d||String(d.order)!==String(order)||d.idx===hostIdx)return; // same booking only, not onto itself
  var m=_rzPaxMeta(order);m.infantOf=m.infantOf||{};
  if(m.infantOf[hostIdx]!=null)return; // host is itself an infant — ignore
  m.infantOf[d.idx]=hostIdx;if(m.types)delete m.types[d.idx];
  _rzSavePaxMeta();render();
};
window.rezdyPaxToggleChild=function(order,idx){
  // Cycle the manual override: auto (Rezdy) → child → adult → auto.
  var m=_rzPaxMeta(order);m.types=m.types||{};var cur=m.types[idx];
  if(!cur)m.types[idx]='child';else if(cur==='child')m.types[idx]='adult';else delete m.types[idx];
  _rzSavePaxMeta();render();
};
window.rezdyPaxRemoveInfant=function(order,infIdx){var m=_rzPaxMeta(order);if(m.infantOf)delete m.infantOf[infIdx];_rzSavePaxMeta();render();};
// Preset a passenger's type from the booking's detail dropdown: cycle Adult → Child → Infant.
window.rezdyPaxCycleType=function(order,idx,cur){
  var m=_rzPaxMeta(order);m.types=m.types||{};m.infantOf=m.infantOf||{};
  cur=cur||'adult';
  var next=(cur==='adult')?'child':(cur==='child')?'infant':'adult';
  if(m.infantOf[idx]!=null)delete m.infantOf[idx]; // move from legacy fold to type-based
  if(next==='adult')delete m.types[idx];else m.types[idx]=next;
  _rzSavePaxMeta();render();
};
// Toggle a CHECKED-IN passenger between adult and child (infants are set at check-in via the
// lap-attach flow, so they're left alone here). Keeps the bubble + expanded list in sync.
window.rezdyCheckinCycleType=function(order,n){
  var c=(S._rzCheckin||{})[String(order)];n=parseInt(n,10);
  if(!c||!Array.isArray(c.pax)||!c.pax[n])return;
  if(c.pax[n].type==='infant')return;
  c.pax[n].type=(c.pax[n].type==='child')?'adult':'child';
  if(window.pickupSave)window.pickupSave(true);
  render();
};
// A small pill toggle (Wx / Checked-in) for a booking card.
function _rzCheckBtn(label,on,onclick,title){
  return '<button onclick="'+onclick+'" title="'+_rzEsc(title)+'" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:4px 9px;border-radius:14px;cursor:pointer;white-space:nowrap;border:1.5px solid '+(on?'#22c55e':'var(--border2)')+';background:'+(on?'rgba(34,197,94,.15)':'transparent')+';color:'+(on?'#4ade80':'var(--text3)')+'">'+(on?'✓':'○')+' '+_rzEsc(label)+'</button>';
}
// Cancellation: a booking is cancelled if Rezdy says so OR we've locally cancelled it (with a reason).
function _rzIsCancelled(b){if(!b)return false;return /cancel/i.test(b.status||'')||!!((S._rzBookingCancel||{})[String(b.orderNumber||'')]);}
function _rzCancelInfo(b){return (S._rzBookingCancel||{})[String((b&&b.orderNumber)||'')]||null;}
function _rzIsNoShow(order){return !!((S._rzNoShow||{})[String(order||'')]);}
// Locally cancel a booking (does NOT cancel it in Rezdy) — moves it to the Cancelled list with a reason.
window.rezdyBookingCancel=function(order){
  order=String(order);
  var reason=(typeof prompt==='function')?prompt('Cancel booking #'+order+'\nReason (recorded against the booking):',''):'';
  if(reason==null)return;
  S._rzBookingCancel=S._rzBookingCancel||{};
  S._rzBookingCancel[order]={reason:String(reason||'').trim(),by:(S.user&&S.user.name)||'',at:new Date().toISOString()};
  if(S._rzNoShow)delete S._rzNoShow[order];                 // cancelled supersedes no-show
  if(window.pickupSave)window.pickupSave(true);
  if(typeof toast==='function')toast('Booking #'+order+' cancelled','ok');
  render();
};
window.rezdyBookingUncancel=function(order){
  order=String(order);if(!((S._rzBookingCancel||{})[order]))return;
  if(typeof confirm==='function'&&!confirm('Restore booking #'+order+' to the active list?'))return;
  delete S._rzBookingCancel[order];if(window.pickupSave)window.pickupSave(true);render();
};
// Mark / unmark a no-show: stays on the booking list but shown RED and excluded from the seatmap push.
window.rezdyBookingNoShow=function(order){
  order=String(order);S._rzNoShow=S._rzNoShow||{};
  var on=!S._rzNoShow[order];
  if(on){S._rzNoShow[order]=true;if(S._rzSelfDrive)delete S._rzSelfDrive[order];}else delete S._rzNoShow[order]; // no-show & self-drive are mutually exclusive
  if(window.pickupSave)window.pickupSave(true);
  if(on)_rzNotifyNoShow(order);   // tell the desk
  render();
};
// Mark / unmark "self-drive / no pickup needed" — drops them from the van runs but keeps them ON the
// flight (seatmap). The right tool for a customer who drives themselves (vs no-show = not flying).
window.rezdyBookingSelfDrive=function(order){
  order=String(order);S._rzSelfDrive=S._rzSelfDrive||{};
  if(S._rzSelfDrive[order])delete S._rzSelfDrive[order];else{S._rzSelfDrive[order]=true;if(S._rzNoShow)delete S._rzNoShow[order];} // self-drive supersedes no-show
  if(window.pickupSave)window.pickupSave(true);render();
};
// Driver-facing: mark a no-show from the My Pickups run (confirm, set, notify the desk).
window.pickupMarkNoShow=function(order){
  order=String(order);
  if(typeof confirm==='function'&&!confirm('Mark this customer as a NO-SHOW?\nThey’ll be removed from your run and the desk will be notified.'))return;
  S._rzNoShow=S._rzNoShow||{};
  if(!S._rzNoShow[order]){S._rzNoShow[order]=true;if(S._rzSelfDrive)delete S._rzSelfDrive[order];if(window.pickupSave)window.pickupSave(true);_rzNotifyNoShow(order);if(typeof toast==='function')toast('Marked no-show — desk notified','ok');}
  render();
};
// Notify desk / operations staff when a booking is marked no-show.
function _rzNotifyNoShow(order){
  try{
    if(typeof sbU!=='function')return;
    var b=(S._rezdyBookings||[]).find(function(x){return String(x.orderNumber||'')===String(order);});
    var who=(b&&(b.customerName||order))||order;
    var deskRoles=['desk','cx_manager','admin','superadmin'];
    var recips=(S.users||[]).filter(function(u){return u&&!u.inactive&&deskRoles.indexOf(u.role)>=0;});
    if(!recips.length)return;
    var by=(S.user&&S.user.name)||'';
    var msg='⚠ No-show: '+who+' (#'+order+')'+(typeof _rzDowLabel==='function'?' · '+_rzDowLabel(S.rezdyDate):'')+(by?' — marked by '+by:'');
    var notifs=recips.map(function(u){return {user_id:u.id,type:'noshow',message:msg,reference_id:String(order),read:false,created_at:new Date().toISOString()};});
    sbU('ts_notifications',notifs).then(function(){if(typeof window.loadNotifications==='function')window.loadNotifications();}).catch(function(){});
  }catch(e){}
}
// One booking rendered as its own card (passenger manifest view).
function _rzBookingCard(b){
  var ono=b.orderNumber||'';
  var oE=_rzEsc(ono).replace(/'/g,"\\'");
  var localCancel=_rzCancelInfo(b);
  var cancelled=_rzIsCancelled(b);
  var noShow=_rzIsNoShow(ono);
  var selfDrive=_rzManualSelfDrive(ono);
  var open=!!(S._rezdyOpen||{})[ono];
  var bal=parseFloat(b.balanceDue);var owing=isFinite(bal)&&bal>0;
  var bd=_rzEffBreakdown(b);
  var prod=_rzProduct((((b.items||[])[0]||{}).product)||'');
  var stCol=cancelled?'#ef4444':(/confirm/i.test(b.status||'')?'#86efac':'var(--text2)');
  var wx=!!(S._rzBookingWx||{})[ono],ci=!!(S._rzBookingCheckedIn||{})[ono];
  var h='<div class="card" style="padding:12px 14px;margin-bottom:12px'+(cancelled?';opacity:.6':(noShow?';border:1px solid #ef4444;background:rgba(239,68,68,.10)':(ci?';border:1px solid #15803d;background:rgba(34,197,94,.08)':'')))+'">';
  // header
  h+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap">';
  h+='<div style="min-width:0;flex:1 1 200px">'+
       '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'+
         '<span onclick="window.rezdyToggleRow(\''+oE+'\')" style="cursor:pointer;color:var(--text2);display:inline-block;transition:transform .12s;'+(open?'transform:rotate(90deg)':'')+'">▸</span>'+
         '<span style="font-size:15px;font-weight:800;color:var(--text1)">'+_rzEsc(b.customerName||ono)+'</span>'+
         (_rzBookingHasLunch(b)?'<span title="Lunch / meal ordered" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;background:#f59e0b;color:#3a2c06;font-weight:900;font-size:11px;border-radius:4px;flex-shrink:0;line-height:1">L</span>':'')+
         (function(){var _pl=_rzPlate(ono);if(!_pl||!_pl.plate)return '';var _pt='Numberplate '+_pl.plate+(_pl.done?' (entered into system)':' (enter into the separate system)');return '<span title="'+_rzEsc(_pt)+'" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;background:'+(_pl.done?'#22c55e':'#3b82f6')+';color:#fff;font-weight:900;font-size:11px;border-radius:4px;flex-shrink:0;line-height:1">P</span>';})()+
         '<span style="font-size:11px;color:var(--text3)">#'+_rzEsc(ono)+'</span>'+
       '</div>'+
       '<div style="font-size:11px;color:var(--text3);margin-top:3px">'+_rzBdCompact(bd)+(prod?' '+_rzEsc(prod):'')+'</div>'+
     '</div>';
  h+='<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end">';
  if(!cancelled){
    h+=_rzCheckBtn('Wx',wx,'window.rezdyBookingToggleWx(\''+oE+'\')','Weather check called by passenger');
    h+=_rzCheckBtn('Checked in',ci,'window.rezdyCheckinClick(\''+oE+'\')','Check in: enter names + actual weights');
    // No-show toggle (red when on) — shows red + excluded from the seatmap push.
    h+='<button onclick="window.rezdyBookingNoShow(\''+oE+'\')" title="No-show — shows red, excluded from pickups AND the seatmap push, and notifies the desk" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:4px 9px;border-radius:14px;cursor:pointer;white-space:nowrap;border:1.5px solid '+(noShow?'#ef4444':'var(--border2)')+';background:'+(noShow?'rgba(239,68,68,.15)':'transparent')+';color:'+(noShow?'#f87171':'var(--text3)')+'">'+(noShow?'✕':'○')+' No-show</button>';
  }
  if(localCancel){
    h+='<span style="font-size:11px;font-weight:800;color:#ef4444">✕ CANCELLED</span>'+
       '<button onclick="window.rezdyBookingUncancel(\''+oE+'\')" title="Restore to the active list" style="font-size:11px;font-weight:700;padding:4px 9px;border-radius:14px;cursor:pointer;border:1.5px solid var(--border2);background:transparent;color:var(--text3)">Restore</button>';
  } else {
    h+='<span style="font-size:11px;font-weight:700;color:'+stCol+'">'+_rzEsc(b.status)+'</span>';
  }
  h+=owing?'<span class="pill pill-warn" style="font-size:10px">⚠ '+_rzEsc(_rzMoney(bal,b.currency))+'</span>':'<span style="font-size:11px;color:#4ade80;font-weight:700">Paid</span>';
  h+='</div></div>';
  if(localCancel)h+='<div style="font-size:11px;color:#f87171;margin-top:4px">Cancelled'+(localCancel.by?' by '+_rzEsc(localCancel.by):'')+(localCancel.reason?' — '+_rzEsc(localCancel.reason):'')+'</div>';
  if(noShow&&!cancelled)h+='<div style="font-size:11px;color:#f87171;font-weight:700;margin-top:4px">NO-SHOW — excluded from the seatmap push</div>';
  // Aircraft — collapsed shows only the selected one; the full pill selector moves into the dropdown.
  if(!cancelled&&!open)h+=_rzBookingAcBadge(b,ono);
  // Internal note (office only) — always visible (collapsed + expanded), right-aligned under the
  // buttons. Saved on blur.
  if(!cancelled){
    var _bkNote=_rzEsc((S._rzBkNote||{})[ono]||'');
    h+='<div style="display:flex;justify-content:flex-end;margin-top:6px"><textarea onblur="window.rezdyBookingNote(\''+oE+'\',this.value)" placeholder="📝 Internal note…" rows="1" '+
      'style="width:240px;max-width:100%;box-sizing:border-box;resize:vertical;min-height:24px;font-family:inherit;font-size:11px;line-height:1.4;padding:4px 8px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text1)">'+_bkNote+'</textarea></div>';
  }
  // Passenger bubbles + aircraft selector live inside the expanded detail (dropdown).
  if(open)h+='<div style="border-top:1px solid var(--border);margin-top:8px;padding-top:10px">'+(!cancelled?_rzBookingAcPills(b,ono):'')+_rzBookingDetail(b)+
    (!cancelled?'<div style="margin-top:10px;text-align:right"><button onclick="window.rezdyBookingCancel(\''+oE+'\')" title="Cancel this booking (records a reason; does not cancel it in Rezdy)" style="font-size:12px;font-weight:700;padding:6px 14px;border-radius:9px;cursor:pointer;border:1.5px solid rgba(239,68,68,.4);background:transparent;color:#ef4444">✕ Cancel booking</button></div>':'')+
  '</div>';
  h+='</div>';
  return h;
}
// Does a booking match a free-text query (by customer name, any passenger name, or order #)?
function _rzBkMatch(b,q){
  if(!q)return true;q=String(q).toLowerCase();
  if(String(b.orderNumber||'').toLowerCase().indexOf(q)>=0)return true;
  if(String(b.customerName||'').toLowerCase().indexOf(q)>=0)return true;
  var hit=false;(b.items||[]).forEach(function(it){(it.participants||[]).forEach(function(p){if(p&&p.name&&String(p.name).toLowerCase().indexOf(q)>=0)hit=true;});});
  return hit;
}
// Live search — re-render and keep focus/caret in the search box so results update as you type.
window.rezdyBkSearch=function(v){S._bkSearch=v;render();var el=document.getElementById('rzBkSearch');if(el){el.focus();var L=el.value.length;try{el.setSelectionRange(L,L);}catch(_){}}};
window.rezdyBkSearchClear=function(){S._bkSearch='';render();var el=document.getElementById('rzBkSearch');if(el)el.focus();};
// Re-focus the search box (used after an async re-render so typing isn't interrupted).
function _rzRefocusSearch(){var el=document.getElementById('rzBkSearch');if(el&&S._bkSearch){el.focus();var L=el.value.length;try{el.setSelectionRange(L,L);}catch(_){}}}
// Load EVERY cached booking (all tour dates) so search can span any day, not just the one in
// view. Cached ~2 min; each booking keeps its tour_date on b._tourDate so results can show the
// date and jump straight to it.
window.rezdyLoadAllBookings=async function(){
  if(S._rzAllBkLoading)return;
  S._rzAllBkLoading=true;safeRender();
  try{
    var rows=await sbF('ts_rezdy_bookings','','tour_date'); // all dates, no tour_date filter
    var out=(rows||[]).map(function(r){var b=(r&&r.data)?r.data:null;if(b)b._tourDate=r.tour_date;return b;}).filter(Boolean).filter(function(b){return !_rzIsSupplierDup(b);});
    S._rzAllBk=out;S._rzAllBkAt=Date.now();
  }catch(e){S._rzAllBk=S._rzAllBk||[];}
  S._rzAllBkLoading=false;render();_rzRefocusSearch();
};
// A compact, clickable search-result row (works across days). Tapping jumps to that booking's
// date and opens it.
function _rzBkSearchRow(b){
  var order=String(b.orderNumber||'');var oE=_rzEsc(order).replace(/'/g,"\\'");
  var date=String(b._tourDate||S.rezdyDate);var dE=_rzEsc(date).replace(/'/g,"\\'");
  var dep=_rzBookingDep(b);var depE=_rzEsc(dep).replace(/'/g,"\\'");
  var prod=_rzProduct((((b.items||[])[0])||{}).product||'');
  var bd=_rzBdText(_rzEffBreakdown(b));
  var ci=(date===S.rezdyDate&&(S._rzBookingCheckedIn||{})[order])?'<span style="color:#22c55e;font-weight:800;font-size:10px;margin-left:6px">✓ checked in</span>':'';
  var cancelled=_rzIsCancelled(b);
  return '<div onclick="window.rezdyBkOpenResult(\''+dE+'\',\''+oE+'\',\''+depE+'\')" class="card" style="cursor:pointer;padding:10px 12px;margin-bottom:8px'+(cancelled?';opacity:.55':'')+'">'+
    '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">'+
      '<span style="font-size:14px;font-weight:800;color:var(--text1)">'+_rzEsc(b.customerName||order)+(cancelled?' <span style="font-size:10px;color:#ef4444;font-weight:800">✕ cancelled</span>':'')+'</span>'+
      '<span style="font-size:11px;color:var(--text3);font-weight:700;white-space:nowrap">#'+_rzEsc(order)+'</span>'+
    '</div>'+
    '<div style="font-size:11px;color:var(--text3);margin-top:3px">📅 '+_rzEsc(_rzDowLabel(date))+' · 🛫 '+_rzEsc(dep)+(prod?' · '+_rzEsc(prod):'')+' · '+bd+ci+'</div>'+
  '</div>';
}
// Jump from a search result to its booking: load that day if needed and open the card.
window.rezdyBkOpenResult=function(date,order,dep){
  order=String(order);S._bkSearch='';
  if(date&&date!==S.rezdyDate){window.rezdySetDate(date);} // clears date caches + async-loads
  S._rezdyOpen=S._rezdyOpen||{};S._rezdyOpen[order]=true;
  if(dep)S._bkDepFilter=dep;
  render();
};
