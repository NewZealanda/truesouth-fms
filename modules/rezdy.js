// === MODULE: rezdy === v1.0 ===
// Rezdy bookings + pickup van management + aircraft day-schedule.
// Self-contained. Entry point: renderRezdy(). All onclick handlers are window.*.
// State keys used on S: rezdyTab, rezdyDate, _rezdyBookings, _rezdyLoading,
//   _rezdyOpen (expanded booking rows, keyed by orderNumber),
//   _pickupVans, _pickupCollected, _pickupLoading, _schedBlocks, _schedLoading,
//   _schedEdit, _rezdyDragId.

// ── helpers ───────────────────────────────────────────────────────────────
// Local Y-M-D (NOT toISOString, which is UTC and lands a day off in NZ).
function _rzYmd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _rzToday(){return _rzYmd(new Date());}
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
  if(typeof sbU==='function')sbU('ts_settings',[{key:'rz_vehicles',value:JSON.stringify(S._rzVehicles||[])}]).catch(function(){});
}
function _rzVehLoad(){
  try{fetch(SB+'/rest/v1/ts_settings?key=eq.rz_vehicles&select=value',{headers:SH}).then(function(r){return r.ok?r.json():[];}).then(function(rows){
    var v=rows&&rows[0]&&rows[0].value;if(typeof v==='string'){try{v=JSON.parse(v);}catch(e){v=null;}}
    if(Array.isArray(v)&&v.length){S._rzVehicles=v;try{lsSet('ts_rz_vehicles',v);}catch(e){}S._pickupVans=null;render();}
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
// ── Active vs spare (parked) vehicles ──
// A parked vehicle is a spare resource: it isn't a van on the board and takes no pickups until
// it's dragged back in. Keyed by vehicle index in S._pickupSpare.
function _rzVanParked(vi){return !!(S._pickupSpare||{})[vi];}
function _rzActiveVanCount(){var n=_rzVehicles().length,sp=S._pickupSpare||{},c=0;for(var i=0;i<n;i++)if(!sp[i])c++;return c;}
window.pickupVehParkDragStart=function(vi,e){S._pickupVehDrag=vi;try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','veh:'+vi);}catch(_){}};
window.pickupActivateVehicle=function(vi){S._pickupSpare=S._pickupSpare||{};delete S._pickupSpare[vi];if(window.pickupSave)window.pickupSave(true);render();};
window.pickupParkVehicle=function(vi){if(_rzActiveVanCount()<=1){if(typeof toast==='function')toast('Keep at least one active vehicle.','warn');return;}S._pickupSpare=S._pickupSpare||{};S._pickupSpare[vi]=1;if(window.pickupSave)window.pickupSave(true);render();};
window.pickupDropActivateVehicle=function(e){if(e&&e.preventDefault)e.preventDefault();var vi=S._pickupVehDrag;S._pickupVehDrag=null;if(vi==null||vi==='')return;window.pickupActivateVehicle(parseInt(vi,10));};
function _rzVehSeats(vi){var v=_rzVehicles()[vi];return (v&&v.seats)||11;}
function _rzVehColor(vi){var v=_rzVehicles()[vi];return (v&&v.color)||'#64748b';}
function _rzVehName(vi){var v=_rzVehicles()[vi];return (v&&v.name)||('Van '+(vi+1));}
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
// Default loaded fuel (kg) for a product on an aircraft — product override else aircraft standard.
function _rzProdFuelKg(code,acId){var a=_acSpec(acId);if(!a)return null;var c=_rzProdCfg(code);if(c){var u=(a.layout==='ga8')?c.av:c.cv;if(u&&u.fuel!=null)return toKg(u.fuel,acId);}return a.fuelKg;}
// Flight burn in DISPLAY units (L airvan / lb caravan) for a product — null = use aircraft burnDef.
function _rzProdBurnDisp(code,acId){var a=_acSpec(acId);if(!a)return null;var c=_rzProdCfg(code);if(c){var u=(a.layout==='ga8')?c.av:c.cv;if(u&&u.burn!=null)return u.burn;}return null;}
// FLB/CCF bookings are parked in the Rezdy slot for their OUTBOUND tour time only to hold seats
// — they're actually the RETURN leg. We pull them out of that departure into their own
// "Flybacks" group (a single 1530 return for now; summer's multiple flyback runs come later).
var RZ_FLYBACK_DEP='Flybacks';
function _rzBookingIsFlyback(b){return ((b&&b.items)||[]).some(function(it){return _rzIsFlyback(_rzProduct(it&&it.product));});}
// Sort key for a departure: real "HHMM" → minutes; the Flyback group sits at its 1530 slot.
function _rzDepSortMin(dep){if(dep===RZ_FLYBACK_DEP)return 15*60+30;return _rzDepMin(dep);}
function _rzDepCmp(a,b){var d=_rzDepSortMin(a)-_rzDepSortMin(b);return d!==0?d:String(a).localeCompare(String(b));}
// "0930" → "09:30" for the schedule grid's HH:MM parser.
function _rzHHMMcolon(s){var m=/^(\d{2})(\d{2})$/.exec(String(s||''));return m?m[1]+':'+m[2]:String(s||'');}
// Flight block duration (minutes) by product: FCF = 4.5h; FJHH / MCEXP / THH = 5h; else 2h.
function _rzProductDuration(p){var s=String(p||'').toUpperCase();if(/FCF|MILFORD.*FLY.*CRUISE.*FLY/.test(s))return 270;if(/\b(FJHH|MCEXP|THH)\b/.test(s))return 300;return 120;}
// Like above but returns 0 when the text names no known product (so we don't clobber a manual end).
function _rzProductCodeDuration(t){var s=String(t||'').toUpperCase();if(/\bFCF\b/.test(s))return 270;if(/\b(FJHH|MCEXP|THH)\b/.test(s))return 300;return 0;}
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
  if(typeof sbU==='function')sbU('ts_settings',[{key:'rz_depnames',value:JSON.stringify(S._rzDepNames)}]).catch(function(){});
  render();
};
// Which fleet aircraft a booking is allocated to — read from the comments / custom fields
// (the operator writes e.g. "SLA" or "ZK-SLB" in Rezdy the day before). Returns an ac id or null.
function _rzAircraftFromComments(b){
  var hay=' '+String((b&&b.comments)||'');
  var f=(b&&b.fields)||{};Object.keys(f).forEach(function(k){hay+=' '+String(f[k]||'');});
  ((b&&b.items)||[]).forEach(function(it){hay+=' '+String((it&&it.comments)||'')+' '+String((it&&it.notes)||'');});
  hay=hay.toUpperCase();
  var ids=Object.keys((typeof S!=='undefined'&&S.aircraft)||{});
  if(!ids.length)ids=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'];
  for(var i=0;i<ids.length;i++){
    var code=ids[i].replace(/^ZK-?/i,'');
    if(new RegExp('(^|[^A-Z0-9])(ZK-?)?'+code+'($|[^A-Z0-9])').test(hay))return ids[i];
  }
  return null;
}
// Self-drive bookings shouldn't go in a van.
function _rzIsSelfDrive(loc){return /self.?drive|own (car|transport|vehicle)|no pickup|no transfer|drive (your|them)self/i.test(String(loc||''));}
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
function _rzMapBookings(rows){
  return (rows||[]).map(_rzRow).filter(Boolean).filter(function(b){return !_rzIsSupplierDup(b);});
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
  const out=[];const ov=S._pickupLocOverride||{};
  (S._rezdyBookings||[]).forEach(function(b){
    (b.items||[]).forEach(function(it,ii){
      if(!it.pickup)return;
      // include the item index so two same-product/same-time items in one order don't collide
      const id=String(b.orderNumber||'')+'|'+(it.product||'')+'|'+(it.startTimeLocal||'')+'|'+ii;
      const loc=(ov[id]!=null&&ov[id]!=='')?ov[id]:(it.pickup||'');
      out.push({
        id:id,
        order:b.orderNumber||'',
        customer:b.customerName||'',
        pax:parseInt(it.quantity,10)||1,
        location:loc,
        phone:b.phone||'',
        depart:_rzDepTime(it.startTimeLocal||''),
        pickupTime:_rzDepTime(it.pickupTime||''),
        selfDrive:_rzIsSelfDrive(loc)
      });
    });
  });
  return out;
}

// Pickup-time as minutes for sorting (format "HHMM" e.g. "0930"); blank sorts last.
function _rzPkTimeVal(p){if(!p||!p.pickupTime)return 99999;var m=/^(\d{2})(\d{2})$/.exec(String(p.pickupTime));return m?(+m[1])*60+(+m[2]):99999;}
// ── default van allocation ──────────────────────────────────────────────────
// Earliest pickup time first (so a driver works straight down the list), filling Van 1 to
// capacity then flowing into Van 2, then 3 — never overloading a van.
// Hilton sits the opposite direction, so its pickups always get their own vehicle.
function _rzIsHilton(loc){return /hilton/i.test(String(loc||''));}
function _rzAutoVans(pickups){
  pickups=(pickups||[]).filter(function(p){return !p.selfDrive;}); // self-drive never goes in a van
  var N=_rzVehicles().length;
  // Only ACTIVE (non-parked) vehicles take pickups; parked vehicles stay as spare resources.
  var spare=S._pickupSpare||{};var act=[];for(let i=0;i<N;i++)if(!spare[i])act.push(i);
  if(!act.length)act=[0];
  const byTime=function(a,b){return _rzPkTimeVal(a)-_rzPkTimeVal(b);};
  const vans=[];for(let i=0;i<N;i++)vans.push([]);
  // Pickups run by DEPARTURE: a whole departure is collected together (active vans by capacity),
  // then the next departure reuses the same vans. Hilton always gets its own vehicle. Earliest first.
  const byDep={};pickups.forEach(function(p){(byDep[p.depart||'~']=byDep[p.depart||'~']||[]).push(p);});
  Object.keys(byDep).sort().forEach(function(dep){
    const grp=byDep[dep];
    const hilton=grp.filter(function(p){return _rzIsHilton(p.location);}).sort(byTime);
    const others=grp.filter(function(p){return !_rzIsHilton(p.location);}).sort(byTime);
    const load=[];for(let i=0;i<N;i++)load.push(0);
    let ai=0; // pointer into the active-vehicle list
    const place=function(p){
      var vi=act[ai];
      if(load[vi]>0 && load[vi]+p.pax>_rzVehSeats(vi) && ai<act.length-1){ai++;vi=act[ai];}
      vans[vi].push(p.id);load[vi]+=p.pax;
    };
    others.forEach(place);
    // Hilton starts a fresh vehicle within this departure (opposite direction).
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
  let vans=S._pickupVans;
  const valid=Array.isArray(vans)&&vans.length===_rzVehicles().length&&vans.every(Array.isArray);
  if(!valid){
    S._pickupVans=_rzAutoVans(pickups);
  }else{
    // keep saved placement, drop stale + self-drive ids, append any new ids to van 1
    const sd={};pickups.forEach(function(p){if(p.selfDrive)sd[p.id]=1;});
    const placed={};
    S._pickupVans=vans.map(function(v){return v.filter(function(id){if(placed[id]||sd[id]||ids.indexOf(id)<0)return false;placed[id]=1;return true;});});
    // First active (non-parked) vehicle catches new + displaced pickups.
    var spare0=S._pickupSpare||{};var firstAct=0;for(var _fa=0;_fa<S._pickupVans.length;_fa++){if(!spare0[_fa]){firstAct=_fa;break;}}
    ids.forEach(function(id){if(!placed[id]&&!sd[id])S._pickupVans[firstAct].push(id);});
  }
  // Move any pickups parked in a spare vehicle into the first active vehicle.
  var spare=S._pickupSpare||{};var firstActive=-1;
  for(var _vi=0;_vi<S._pickupVans.length;_vi++){if(!spare[_vi]){firstActive=_vi;break;}}
  if(firstActive>=0){for(var _vj=0;_vj<S._pickupVans.length;_vj++){if(spare[_vj]&&S._pickupVans[_vj]&&S._pickupVans[_vj].length){S._pickupVans[firstActive]=S._pickupVans[firstActive].concat(S._pickupVans[_vj]);S._pickupVans[_vj]=[];}}}
  if(!S._pickupCollected||typeof S._pickupCollected!=='object')S._pickupCollected={};
  return pickups;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ENTRY
// ─────────────────────────────────────────────────────────────────────────────
// Ensure the Rezdy day is set and quietly kept in lock-step with Rezdy (used by the Rezdy
// section AND by the Operations Bookings/Seatmap/Loadsheets tabs which render the same views).
function _rzEnsureDay(){if(!S.rezdyDate)S.rezdyDate=_rzToday();if(typeof setTimeout==='function')setTimeout(function(){if(typeof _rzBgSync==='function')_rzBgSync();},0);}
// Shared date-picker row (prev / next / today / refresh). `sub` hides Refresh on the loadsheets view.
function _rzDateRow(sub){
  if(!S.rezdyDate)S.rezdyDate=_rzToday();
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
function renderRezdy(){
  if(typeof hasRolePerm==='function'&&!hasRolePerm('rezdy'))return '<div class="page"><div class="card" style="text-align:center;padding:40px">Not available.</div></div>';
  _rzEnsureDay();
  var rzTabs=['schedule','pickups','mypickups'];
  var sub=(rzTabs.indexOf(S.rezdyTab)>=0)?S.rezdyTab:'schedule';S.rezdyTab=sub;
  if(sub==='schedule'&&S._rzPrevSub!=='schedule'){S._schedBlocks=null;S._rezdyBookings=null;}
  S._rzPrevSub=sub;
  const tabBar='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'+
    [{id:'schedule',lbl:'Calendar'},{id:'pickups',lbl:'Pickups'},{id:'mypickups',lbl:'My Pickups'}].map(function(t){
      return '<button class="sub-tab '+(sub===t.id?'on':'')+'" onclick="S.rezdyTab=\''+t.id+'\';render()">'+t.lbl+'</button>';
    }).join('')+'</div>';
  const dateRow=_rzDateRow(sub);
  var _modal=_rzModals();
  if(sub==='pickups')return tabBar+dateRow+_rzRenderPickups()+_modal;
  if(sub==='mypickups')return tabBar+dateRow+_rzRenderMyPickups()+_modal;
  return tabBar+dateRow+_rzRenderSchedule()+_modal;
}

// ─────────────────────────────────────────────────────────────────────────────
//  (1) BOOKINGS
// ─────────────────────────────────────────────────────────────────────────────
// Booking group colour (all pax in one booking share group = order number).
function _rzGroupColor(s){s=String(s||'');var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))&0xffffff;var pal=['#3b82f6','#ec4899','#10b981','#f59e0b','#8b5cf6','#f97316','#06b6d4','#84cc16','#ef4444','#6366f1'];return pal[Math.abs(h)%pal.length];}
function _rzPaxMeta(order){S._rezdyPaxMeta=S._rezdyPaxMeta||{};order=String(order);return S._rezdyPaxMeta[order]||(S._rezdyPaxMeta[order]={});}
function _rzSavePaxMeta(){if(window.pickupSave)window.pickupSave(true);}
// True if this booking has any manual child/infant overrides away from the Rezdy standard.
function _rzHasPaxOverrides(order){var m=(S._rezdyPaxMeta||{})[String(order)];if(!m)return false;return (m.types&&Object.keys(m.types).length>0)||(m.infantOf&&Object.keys(m.infantOf).length>0);}
// Revert ONE booking's passengers to the Rezdy standard (clears manual child/infant edits).
window.rezdyResetPax=function(order){order=String(order);if(S._rezdyPaxMeta)delete S._rezdyPaxMeta[order];_rzSavePaxMeta();render();};
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
  ['_rzCheckin','_rzBookingCheckedIn','_rzBookingAc','_rzBookingWx','_rezdyPaxMeta','_rzSchedAttach'].forEach(function(k){if(S[k])delete S[k][order];});
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
function _rzBookingAc(b,order){var ov=(S._rzBookingAc||{})[String(order)];if(ov==='__none__')return null;return ov||_rzAircraftFromComments(b);}
// Aircraft selector pills for one booking. Comments supply the default; a pill overrides it; the
// "None" pill explicitly unallocates (turns the aircraft off).
function _rzBookingAcPills(b,order){
  var fleet=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(id){return S.aircraft&&S.aircraft[id];});
  var manual=(S._rzBookingAc||{})[String(order)];
  var cur=(manual==='__none__')?null:(manual||_rzAircraftFromComments(b));
  var oE=_rzEsc(String(order)).replace(/'/g,"\\'");
  var pills='';
  fleet.forEach(function(id){
    var on=cur===id;var col=_rzAcCol(id);
    pills+='<button onclick="window.rezdyBookingSetAc(\''+oE+'\',\''+id.replace(/'/g,"\\'")+'\')" class="pill" style="cursor:pointer;opacity:'+(on?'1':'.38')+';border:1.5px solid '+(on?col:'var(--border2)')+';background:'+(on?col:'transparent')+';color:'+(on?'#fff':col)+';font-weight:800;font-size:11px;padding:3px 10px;border-radius:14px">'+id.replace('ZK-','')+'</button>';
  });
  // Explicit "None" / unallocated pill.
  var noneOn=(manual==='__none__');
  pills+='<button onclick="window.rezdyBookingSetAc(\''+oE+'\',\'__none__\')" class="pill" title="Unallocated — no aircraft" style="cursor:pointer;opacity:'+(noneOn?'1':'.38')+';border:1.5px solid '+(noneOn?'#94a3b8':'var(--border2)')+';background:'+(noneOn?'#475569':'transparent')+';color:'+(noneOn?'#fff':'var(--text3)')+';font-weight:800;font-size:11px;padding:3px 10px;border-radius:14px">None</button>';
  var note=noneOn?'<span style="font-size:10px;color:var(--text3);margin-left:2px">unallocated</span>':(cur?'<span style="font-size:10px;color:var(--text3);margin-left:2px">'+(manual?'set':'from comments')+'</span>':'');
  return '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:7px 10px">'+
    '<span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800;margin-right:2px">Aircraft</span>'+pills+note+'</div>';
}
// Collapsed-card aircraft summary — just the selected aircraft (or "None"); the full pill selector
// only appears once the booking dropdown is expanded.
function _rzBookingAcBadge(b,order){
  var manual=(S._rzBookingAc||{})[String(order)];
  if(manual==='__none__')return '<div style="padding:4px 10px;display:flex;align-items:center;gap:5px"><span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800">Aircraft</span><span class="pill" style="background:#475569;color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:14px">None</span></div>';
  var cur=manual||_rzAircraftFromComments(b);
  if(!cur)return '';
  var col=_rzAcCol(cur);
  return '<div style="padding:4px 10px;display:flex;align-items:center;gap:5px"><span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800">Aircraft</span><span class="pill" style="background:'+col+';color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:14px">'+_rzEsc(cur.replace('ZK-',''))+'</span></div>';
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
  S._rzCheckinDraft={order:order,rows:rows};render();
};
window.rezdyCheckinField=function(i,field,val){var d=S._rzCheckinDraft;if(!d||!d.rows[i])return;d.rows[i][field]=val;}; // no render (keep input focus)
window.rezdyCheckinAttach=function(i,val){var d=S._rzCheckinDraft;if(!d||!d.rows[i])return;d.rows[i].attach=(val===''?null:parseInt(val,10));};
window.rezdyCheckinType=function(i){
  var d=S._rzCheckinDraft;if(!d||!d.rows[i])return;
  var cur=d.rows[i].type;d.rows[i].type=(cur==='adult')?'child':(cur==='child')?'infant':'adult';
  if(d.rows[i].type==='infant'){var fn=null;for(var k=0;k<d.rows.length;k++){if(k!==i&&d.rows[k].type!=='infant'){fn=k;break;}}d.rows[i].attach=fn;}
  else d.rows[i].attach=null;
  render();
};
window.rezdyCheckinAddRow=function(){var d=S._rzCheckinDraft;if(!d)return;d.rows.push({name:'',actual:'',type:'adult',attach:null});render();};
window.rezdyCheckinRemoveRow=function(i){var d=S._rzCheckinDraft;if(!d||d.rows.length<=1)return;d.rows.splice(i,1);render();};
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
  S._rzCheckinDraft=null;
  if(window.pickupSave)window.pickupSave(true);
  if(typeof toast==='function')toast('Checked in ✓','ok');render();
};
// The check-in modal (rendered when a draft is open).
function _rzCheckinModal(){
  var d=S._rzCheckinDraft;if(!d)return '';
  var b=(S._rezdyBookings||[]).find(function(x){return String(x.orderNumber||'')===d.order;});
  var cust=b?(b.customerName||d.order):d.order;
  var already=!!((S._rzBookingCheckedIn||{})[d.order]);
  var h='<div onclick="window.rezdyCheckinCancel()" class="rzci-overlay">'+
    '<div onclick="event.stopPropagation()" class="rzci-dialog">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px"><div class="st" style="margin-bottom:0">'+(already?'Edit check-in':'Check in')+' — '+_rzEsc(cust)+'</div><button onclick="window.rezdyCheckinCancel()" style="background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer">✕</button></div>'+
    '<p style="font-size:12px;color:var(--text3);margin:0 0 12px">Enter every passenger’s name. <b>Actual weight</b> is optional — leave it blank to fall back to the declared weight (shown red with a “(d)”). The toggle cycles <b>A</b>dult → <b>C</b>hild → <b>i</b>nfant; an infant is a lap pax and you pick who they sit with.</p>';
  var _ciBal=b?parseFloat(b.balanceDue):0;
  if(isFinite(_ciBal)&&_ciBal>0){
    h+='<div style="display:flex;align-items:center;gap:8px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.5);border-radius:9px;padding:9px 12px;margin:0 0 12px"><span style="font-size:16px">💲</span><span style="font-size:12px;font-weight:700;color:#f87171">Outstanding balance of '+_rzEsc(_rzMoney(_ciBal,b.currency))+' — collect payment before checking in.</span></div>';
  }
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
  h+='<div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">'+
    (already?'<button class="btn btn-ghost" style="font-size:13px;color:#f87171;border-color:rgba(239,68,68,.4);margin-right:auto" onclick="window.rezdyCheckinUncheck()">⊘ Un-check</button>':'')+
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
  var rb=_rzBreakdown(b);if(rb)return rb;
  var a2=0,c2=0,i2=0;parts.forEach(function(p){var t=_rzAgeType(p);if(t==='child')c2++;else if(t==='infant')i2++;else a2++;});
  return {a:a2,c:c2,i:i2};
}
function _rzBdText(bd){return bd.a+'A'+(bd.c?' · '+bd.c+'C':'')+(bd.i?' · '+bd.i+'i':'');}
function _rzBdCompact(bd){return bd.a+'A'+(bd.c?bd.c+'C':'')+(bd.i?bd.i+'i':'');} // 10A2C1i
// Pilots available to fly — the single source of truth is the AIRCRAFT APPROVAL pills in each
// crew profile, so this reads from S.crew (every aircraft-approved crew member), NOT just login
// accounts. Each carries a `rostered` flag (rostered-on for the day) so the UI can sort/dim the
// off-duty ones; everyone approved still appears so they can be assigned. Shared by seatmap + calendar.
function _rzAvailablePilots(){
  var ds=S.rezdyDate,roster=S.roster||{},off={rdo:1,off:1,leave:1,ul:1,sick:1,training:1};
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
    if(/cancel/i.test(b.status||''))return;
    var ac=_rzBookingAc(b,String(b.orderNumber||''))||'__unalloc__';
    ((b.items)||[]).forEach(function(it){var t=_rzDepTime(it.startTimeLocal||'');if(!t)return;var start=_rzHHMMcolon(t);var prod=_rzProduct(it.product);if(ac+'|'+start+'|'+prod===key)out.push(String(b.orderNumber||''));});
  });
  return out;
}
window.rezdySchedBlockDragStart=function(key,e){S._rzSchedBlockDrag=key;try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','block');}catch(_){}};
window.rezdySchedDropPilot=function(key,e){
  if(e&&e.preventDefault)e.preventDefault();if(e&&e.stopPropagation)e.stopPropagation();
  // A block (e.g. unallocated FLB/CCF) dragged onto a flight → combine into that flight.
  if(S._rzSchedBlockDrag){
    var src=S._rzSchedBlockDrag;S._rzSchedBlockDrag=null;
    if(src===key)return;
    var tgtAc=String(key).indexOf('|')>=0?String(key).split('|')[0]:null;
    var orders=_rzOrdersForBlockKey(src);
    S._rzSchedAttach=S._rzSchedAttach||{};
    orders.forEach(function(o){S._rzSchedAttach[o]=key;if(tgtAc&&tgtAc!=='__unalloc__'){S._rzBookingAc=S._rzBookingAc||{};S._rzBookingAc[o]=tgtAc;}});
    if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();return;
  }
  var code=S._schedPilotDrag;S._schedPilotDrag=null;if(!code||!key)return;
  // Only a type-rated pilot may be put on a given aircraft.
  var ac=null;
  if(String(key).indexOf('|')>=0)ac=String(key).split('|')[0];
  else{var blk=(S._schedBlocks||[]).find(function(b){return String(b.id)===String(key);});ac=blk&&blk.aircraft;}
  if(ac&&ac!=='__unalloc__'){
    var en=_rzPilotEndorse(code);
    if(en&&en.length&&en.indexOf(ac)<0){if(typeof toast==='function')toast(code+' is not type-rated on '+String(ac).replace('ZK-','')+'.','warn');return;}
  }
  S._schedPilots=S._schedPilots||{};S._schedPilots[String(key)]=code;
  if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();
};
window.rezdySchedClearPilot=function(key){if(S._schedPilots)delete S._schedPilots[String(key)];if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();};
// Detach a flyback booking from a flight (revert the combine).
window.rezdySchedDetach=function(order){order=String(order);if(S._rzSchedAttach)delete S._rzSchedAttach[order];if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();render();};
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
    bubs+='<div title="'+_rzEsc((r.name||'')+(infName?' (+ infant '+infName+')':''))+'" style="position:relative;overflow:hidden;background:rgba(255,255,255,.93);border-radius:8px;'+(owing?'border:2px solid #ef4444':'border-left:4px solid '+gcol)+';min-width:60px;flex-shrink:0;'+(isInf?'opacity:.85;':'')+'">'+
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
// One booking rendered as its own card (passenger manifest view).
function _rzBookingCard(b){
  var ono=b.orderNumber||'';
  var oE=_rzEsc(ono).replace(/'/g,"\\'");
  var cancelled=/cancel/i.test(b.status||'');
  var open=!!(S._rezdyOpen||{})[ono];
  var bal=parseFloat(b.balanceDue);var owing=isFinite(bal)&&bal>0;
  var bd=_rzEffBreakdown(b);
  var prod=_rzProduct((((b.items||[])[0]||{}).product)||'');
  var stCol=cancelled?'#ef4444':(/confirm/i.test(b.status||'')?'#86efac':'var(--text2)');
  var wx=!!(S._rzBookingWx||{})[ono],ci=!!(S._rzBookingCheckedIn||{})[ono];
  var h='<div class="card" style="padding:12px 14px;margin-bottom:12px'+(cancelled?';opacity:.6':(ci?';border:1px solid #15803d;background:rgba(34,197,94,.08)':''))+'">';
  // header
  h+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap">';
  h+='<div style="min-width:0;flex:1 1 200px">'+
       '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'+
         '<span onclick="window.rezdyToggleRow(\''+oE+'\')" style="cursor:pointer;color:var(--text2);display:inline-block;transition:transform .12s;'+(open?'transform:rotate(90deg)':'')+'">▸</span>'+
         '<span style="font-size:15px;font-weight:800;color:var(--text1)">'+_rzEsc(b.customerName||ono)+'</span>'+
         '<span style="font-size:11px;color:var(--text3)">#'+_rzEsc(ono)+'</span>'+
       '</div>'+
       '<div style="font-size:11px;color:var(--text3);margin-top:3px">'+_rzBdCompact(bd)+(prod?' '+_rzEsc(prod):'')+'</div>'+
     '</div>';
  h+='<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end">';
  if(!cancelled){
    h+=_rzCheckBtn('Wx',wx,'window.rezdyBookingToggleWx(\''+oE+'\')','Weather check called by passenger');
    h+=_rzCheckBtn('Checked in',ci,'window.rezdyCheckinClick(\''+oE+'\')','Check in: enter names + actual weights');
  }
  h+='<span style="font-size:11px;font-weight:700;color:'+stCol+'">'+_rzEsc(b.status)+'</span>';
  h+=owing?'<span class="pill pill-warn" style="font-size:10px">⚠ '+_rzEsc(_rzMoney(bal,b.currency))+'</span>':'<span style="font-size:11px;color:#4ade80;font-weight:700">Paid</span>';
  h+='</div></div>';
  // Aircraft — collapsed shows only the selected one; the full pill selector moves into the dropdown.
  if(!cancelled&&!open)h+=_rzBookingAcBadge(b,ono);
  // Passenger bubbles + aircraft selector live inside the expanded detail (dropdown).
  if(open)h+='<div style="border-top:1px solid var(--border);margin-top:8px;padding-top:10px">'+(!cancelled?_rzBookingAcPills(b,ono):'')+_rzBookingDetail(b)+'</div>';
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
  var cancelled=/cancel/i.test(b.status||'');
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
function _rzRenderBookings(){
  if(!S._rezdyBookings){if(!S._rezdyLoading)window.rezdyLoadBookings();return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading bookings…</div>';}
  if(!S._rezdyOpen||typeof S._rezdyOpen!=='object')S._rezdyOpen={};
  const allRows=(S._rezdyBookings||[]).slice();
  const active=allRows.filter(function(b){return !/cancel/i.test(b.status||'');});
  const cancelledRows=allRows.filter(function(b){return /cancel/i.test(b.status||'');});
  const deps=[];active.forEach(function(b){var d=_rzBookingDep(b);if(deps.indexOf(d)<0)deps.push(d);});
  deps.sort(_rzDepCmp);
  const q=String(S._bkSearch||'').trim();
  const searching=q.length>0;
  // Dedicated "Cancelled" view (a pseudo-departure) showing the whole day's cancelled bookings.
  const _showCancelled=!searching&&S._bkDepFilter==='__cancelled__'&&cancelledRows.length>0;
  // One departure at a time — default to the first departure when none is chosen. (No "All".)
  const depFilter=(searching||_showCancelled)?null:((S._bkDepFilter&&deps.indexOf(S._bkDepFilter)>=0)?S._bkDepFilter:(deps[0]||null));
  if(depFilter)S._bkDepFilter=depFilter; // persist the resolved departure so Push knows which one
  // Checked-in count for the SELECTED departure (push is departure-scoped).
  var _ciCount=active.filter(function(b){return _rzBookingDep(b)===depFilter&&(S._rzBookingCheckedIn||{})[String(b.orderNumber||'')];}).length;
  const hdr='<div class="card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'+
    '<div><div class="st" style="margin-bottom:0">Rezdy Bookings</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+(allRows.length?active.length+' active'+(cancelledRows.length?' · '+cancelledRows.length+' cancelled':'')+' for '+_rzDowLabel(S.rezdyDate):'No cached bookings')+'</p></div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
      '<button class="btn btn-ghost" style="font-size:12px" onclick="window.rezdyNewBookingOpen()">+ New booking</button>'+
      '<button class="btn btn-primary" style="font-size:12px;padding:7px 12px'+(_ciCount?'':';opacity:.55')+'" title="Send this departure’s checked-in passengers to the Seatmap" onclick="window.rezdyPushToManifest()">⤒ Push to seatmap'+(_ciCount?' ('+_ciCount+')':'')+'</button>'+
    '</div>'+
    '</div>';
  // Live search box (name / part-name / TSF booking reference).
  const searchH='<div class="card" style="padding:8px 10px;display:flex;align-items:center;gap:8px">'+
    '<span style="font-size:15px;color:var(--text3);flex-shrink:0">🔍</span>'+
    '<input id="rzBkSearch" type="search" autocomplete="off" value="'+_rzEsc(S._bkSearch||'')+'" oninput="window.rezdyBkSearch(this.value)" placeholder="Search name or booking ref (e.g. Smith or TSF1234)…" style="flex:1;min-width:0;font-size:16px;padding:9px 10px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:8px;outline:none">'+
    (searching?'<button onclick="window.rezdyBkSearchClear()" title="Clear search" style="flex-shrink:0;background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer;padding:0 4px">✕</button>':'')+
    '</div>';
  // Prominent departure selector — big pills, one selected at a time, horizontally scrollable.
  let depSel='';
  if(deps.length){
    depSel='<div class="card" style="padding:10px 12px'+(searching?';opacity:.5':'')+'">'+
      '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);font-weight:800;margin-bottom:8px">Departure'+(searching?' — paused while searching':'')+'</div>'+
      '<div style="display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:2px">';
    deps.forEach(function(d){
      var depB=active.filter(function(b){return _rzBookingDep(b)===d;});
      var cnt=depB.length;
      var prod='';depB.some(function(b){var c=_rzProduct((((b.items||[])[0]||{}).product)||'');if(c){prod=c;return true;}return false;});
      var on=!searching&&depFilter===d;
      depSel+='<button onclick="S._bkSearch=\'\';S._bkDepFilter=\''+_rzEsc(d).replace(/'/g,"\\'")+'\';render()" style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:74px;padding:9px 16px;border-radius:12px;cursor:pointer;border:2px solid '+(on?'var(--accent)':'var(--border2)')+';background:'+(on?'var(--accent)':'transparent')+';color:'+(on?'#fff':'var(--text2)')+';font-weight:800">'+
        '<span style="font-size:16px;letter-spacing:.02em;line-height:1.1;white-space:nowrap">'+_rzEsc(_rzDepDisplay(d))+((_rzDepShowProduct(d)&&prod)?' '+_rzEsc(prod):'')+'</span>'+
        '<span style="font-size:10px;font-weight:700;opacity:'+(on?'.9':'.6')+'">'+cnt+' bkg'+(cnt===1?'':'s')+'</span>'+
      '</button>';
    });
    // "Cancelled" pseudo-departure — view the whole day's cancelled bookings in one place.
    if(cancelledRows.length){
      var conC=_showCancelled;
      depSel+='<button onclick="S._bkSearch=\'\';S._bkDepFilter=\'__cancelled__\';render()" style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:74px;padding:9px 16px;border-radius:12px;cursor:pointer;border:2px solid '+(conC?'#ef4444':'var(--border2)')+';background:'+(conC?'#ef4444':'transparent')+';color:'+(conC?'#fff':'var(--err-text)')+';font-weight:800">'+
        '<span style="font-size:16px;letter-spacing:.02em;line-height:1.1;white-space:nowrap">✕ Cancelled</span>'+
        '<span style="font-size:10px;font-weight:700;opacity:'+(conC?'.9':'.7')+'">'+cancelledRows.length+'</span>'+
      '</button>';
    }
    depSel+='</div></div>';
  }
  const top=hdr+searchH+depSel;
  if(!allRows.length){
    return top+'<div class="card" style="text-align:center;padding:36px;color:var(--text3);font-size:13px">No bookings cached for this date.<br>Tap <b>Refresh from Rezdy</b> to pull the latest.</div>';
  }
  let body='';
  if(searching){
    // Search spans EVERY cached day (not just the one in view). Load the all-days corpus if we
    // don't have a fresh copy; until it arrives, search today's already-loaded set.
    var haveAll=!!(S._rzAllBk&&S._rzAllBk.length);
    if((!haveAll||(Date.now()-(S._rzAllBkAt||0)>120000))&&!S._rzAllBkLoading)window.rezdyLoadAllBookings();
    var corpus=haveAll?S._rzAllBk:allRows;
    var matches=corpus.filter(function(b){return _rzBkMatch(b,q);})
      .sort(function(a,b){var da=String(a._tourDate||S.rezdyDate),db=String(b._tourDate||S.rezdyDate);if(da!==db)return db.localeCompare(da);return _rzDepCmp(_rzBookingDep(a),_rzBookingDep(b));});
    var note=S._rzAllBkLoading?' · searching all days…':(haveAll?' · all days':' · this day');
    body+='<div style="margin:16px 0 8px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span style="font-size:15px;font-weight:800;color:var(--text1)">🔍 '+matches.length+' result'+(matches.length===1?'':'s')+'</span><span style="font-size:11px;color:var(--text3);font-weight:600">for “'+_rzEsc(q)+'”'+note+'</span></div>';
    if(!matches.length)body+='<div class="card" style="text-align:center;padding:30px;color:var(--text3);font-size:13px">'+(S._rzAllBkLoading?'Searching all days…':'No bookings match “'+_rzEsc(q)+'”.')+'</div>';
    else matches.forEach(function(b){body+=_rzBkSearchRow(b);});
    return top+body;
  }
  // Whole-day Cancelled view.
  if(_showCancelled){
    var cg=cancelledRows.slice().sort(function(a,b){return _rzDepCmp(_rzBookingDep(a),_rzBookingDep(b));});
    body+='<div style="margin:16px 0 8px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span style="font-size:15px;font-weight:800;color:var(--err-text)">✕ Cancelled</span><span style="font-size:11px;color:var(--text3);font-weight:600">'+cg.length+' booking'+(cg.length===1?'':'s')+' · '+_rzDowLabel(S.rezdyDate)+'</span></div>';
    cg.forEach(function(b){body+=_rzBookingCard(b);});
    return top+body;
  }
  // Single departure view.
  if(depFilter){
    var _bkSort=S._bkSort||'';
    var grp=active.filter(function(b){return _rzBookingDep(b)===depFilter;});
    grp.sort(function(a,b){
      if(_bkSort==='az')return String(a.customerName||'').localeCompare(String(b.customerName||''),undefined,{sensitivity:'base'});
      if(_bkSort==='booked')return (parseInt(String(a.orderNumber||'').replace(/\D/g,''),10)||0)-(parseInt(String(b.orderNumber||'').replace(/\D/g,''),10)||0);
      var ca=(S._rzBookingCheckedIn||{})[String(a.orderNumber||'')]?1:0,cb=(S._rzBookingCheckedIn||{})[String(b.orderNumber||'')]?1:0;return ca-cb; // default: checked-in to the bottom
    });
    var gbd={a:0,c:0,i:0};grp.forEach(function(x){var e=_rzEffBreakdown(x);gbd.a+=e.a;gbd.c+=e.c;gbd.i+=e.i;});
    var prod=_rzProduct((((grp[0]||{}).items||[])[0]||{}).product||'');
    body+='<div style="margin:16px 0 8px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span style="font-size:15px;font-weight:800;color:var(--text1)">🛫 <span onclick="window.rezdyRenameDep(\''+_rzEsc(depFilter).replace(/\'/g,"\\'")+'\')" title="Click to rename this heading" style="cursor:pointer;border-bottom:1px dashed var(--border2)">'+_rzEsc(_rzDepDisplay(depFilter))+'</span>'+((_rzDepShowProduct(depFilter)&&prod)?' '+_rzEsc(prod):'')+'</span><span style="font-size:11px;color:var(--text3);font-weight:600">'+grp.length+' booking'+(grp.length===1?'':'s')+' · '+_rzBdText(gbd)+'</span></div>';
    // Sort control: Default (checked-in last) · A–Z by name · Booked (booking order).
    body+='<div style="display:flex;gap:6px;align-items:center;margin:0 0 10px;flex-wrap:wrap"><span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800;margin-right:2px">Sort</span>'+
      [['','Default'],['az','A–Z'],['booked','Booked']].map(function(o){var act=_bkSort===o[0];return '<button onclick="S._bkSort=\''+o[0]+'\';render()" style="font-size:11px;font-weight:700;padding:4px 11px;border-radius:14px;cursor:pointer;border:1px solid '+(act?'var(--accent)':'var(--border2)')+';background:'+(act?'var(--accent)':'transparent')+';color:'+(act?'#fff':'var(--text2)')+'">'+o[1]+'</button>';}).join('')+'</div>';
    grp.forEach(function(b){body+=_rzBookingCard(b);});
    // Cancelled bookings for THIS departure (collapsed).
    var depCancelled=cancelledRows.filter(function(b){return _rzBookingDep(b)===depFilter;});
    if(depCancelled.length){
      var cOpen=!!S._bkShowCancelled;
      body+='<div class="card" style="padding:0;margin-top:16px;overflow:hidden">'+
        '<div onclick="S._bkShowCancelled=!S._bkShowCancelled;render()" style="cursor:pointer;padding:11px 14px;display:flex;align-items:center;gap:8px;color:var(--text2)">'+
          '<span style="display:inline-block;transition:transform .12s;'+(cOpen?'transform:rotate(90deg)':'')+'">▸</span>'+
          '<span style="font-size:13px;font-weight:700">✕ Cancelled ('+depCancelled.length+')</span></div>';
      if(cOpen){body+='<div style="padding:4px 10px 8px">';depCancelled.forEach(function(b){body+=_rzBookingCard(b);});body+='</div>';}
      body+='</div>';
    }
  }
  return top+body;
}

// Format a currency amount (e.g. 123.5 + 'NZD' → "$123.50").
function _rzMoney(n,cur){
  const v=parseFloat(n);if(!isFinite(v))return '';
  const sym=(cur==='USD'||cur==='AUD'||cur==='NZD'||cur==='CAD'||!cur)?'$':_rzEsc(cur)+' ';
  return sym+v.toFixed(2);
}

// Friendly booking-source label (Viator / GYG / Direct …) from the raw source/agent string.
function _rzSourceLabel(b){
  var s=String((b&&b.source)||'').trim();
  if(!s)return 'Direct';
  if(/get\s*your\s*guide|\bgyg\b/i.test(s))return 'GYG';
  if(/viator/i.test(s))return 'Viator';
  if(/expedia/i.test(s))return 'Expedia';
  if(/klook/i.test(s))return 'Klook';
  if(/book\s*me/i.test(s))return 'BookMe';
  if(/manual/i.test(s))return 'Manual';
  if(/marketplace_pref_rate/i.test(s))return 'Marketplace';
  if(/website|^rezdy$|direct/i.test(s))return 'Direct';
  return s; // already a readable agent/company name
}
// Build the expanded detail panel for one booking (passengers, extras, requests, balance).
function _rzBookingDetail(b){
  const sec='font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);font-weight:800;margin-bottom:5px';
  const _pan='background:var(--card2);border:1px solid var(--border);border-radius:9px;padding:9px 11px'; // each section sits in its own subtle panel for readability
  var _bdOrder=String(b.orderNumber||'');var _bdOE=_rzEsc(_bdOrder).replace(/'/g,"\\'");
  // Passenger bubbles (moved here from the collapsed card) + a per-booking "Reset to Rezdy".
  var bubsH='';var _bub=_rzPaxBubbles(b);
  var _rst=(b._manual
    ?'<button onclick="window.rezdyDeleteManualBooking(\''+_bdOE+'\')" title="Delete this manual booking" style="flex-shrink:0;align-self:center;margin-left:auto;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#f87171;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.4);border-radius:6px;padding:3px 9px;cursor:pointer;white-space:nowrap">🗑 Delete booking</button>'
    :'<button onclick="window.rezdyResetBooking(\''+_bdOE+'\')" title="Reset this booking to its original Rezdy info — clears check-in, weights, child/infant tags and aircraft" style="flex-shrink:0;align-self:center;margin-left:auto;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--text3);background:var(--card2);border:1px solid var(--border2);border-radius:6px;padding:3px 9px;cursor:pointer;white-space:nowrap">↺ Reset to Rezdy</button>');
  bubsH='<div style="display:flex;align-items:stretch;margin-bottom:12px">'+(_bub||'<span style="flex:1"></span>')+_rst+'</div>';
  // Passengers — use the SAME canonical rows as the bubble strip so child/infant tags, names and
  // weights stay in sync (after check-in these come from the captured check-in data, so a child
  // tagged on the bubble shows here too).
  var _dOrder=String(b.orderNumber||'');
  var oDE=_rzEsc(_dOrder).replace(/'/g,"\\'");
  var _pr=_rzPaxRows(b);
  let paxH='<div style="'+_pan+'"><div style="'+sec+'">Passengers ('+_pr.length+') <span style="font-weight:400;text-transform:none;letter-spacing:0">— tap A/C/i to preset</span></div>';
  if(!_pr.length){
    paxH+='<div style="font-size:12px;color:var(--text3)">—</div>';
  }else{
    paxH+='<div style="display:flex;flex-direction:column;gap:4px">';
    _pr.forEach(function(r){
      var t=r.type;
      var tl=t==='child'?'C':t==='infant'?'i':'A';
      var tc=t==='child'?'#fb923c':t==='infant'?'#ec4899':'var(--text3)';
      var tbg=t==='child'?'rgba(251,146,60,.18)':t==='infant'?'rgba(236,72,153,.18)':'transparent';
      var nm=r.name?_rzEsc(r.name):'—';
      var wTxt=(t==='infant')?'lap':(r.actual!=null?(r.actual+'kg'):(r.declared!=null?(r.declared+'kg (d)'):'TBC'));
      var wCol=(r.actual!=null||r.declared!=null)?'var(--text2)':'#f59e0b';
      // Toggle targets the right store: pre-check-in → pax meta; checked-in rows ('c<n>') → check-in data.
      var _isCi=(typeof r.idx!=='number');
      var onc=_isCi
        ?'window.rezdyCheckinCycleType(\''+oDE+'\','+String(r.idx).slice(1)+')'
        :'window.rezdyPaxCycleType(\''+oDE+'\','+r.idx+',\''+t+'\')';
      paxH+='<div style="font-size:12.5px;color:var(--text);display:flex;align-items:center;gap:8px;max-width:360px">'+
        '<button onclick="'+onc+'" title="Adult / Child'+(_isCi?'':' / Infant')+'" style="flex-shrink:0;width:24px;font-size:11px;font-weight:800;padding:3px 0;border-radius:6px;border:1px solid '+(t==='adult'?'var(--border2)':tc)+';background:'+tbg+';color:'+tc+';cursor:pointer">'+tl+'</button>'+
        '<span style="flex:1">'+nm+(r.infName?' <span style="color:#ec4899;font-weight:700">+ '+_rzEsc(r.infName)+' 👶</span>':'')+'</span>'+
        '<span style="color:'+wCol+';font-weight:700">'+wTxt+'</span></div>';
    });
    paxH+='</div>';
  }
  paxH+='</div>';
  // Extras / lunches — flatten across items.
  const extras=[];
  (b.items||[]).forEach(function(it){(it.extras||[]).forEach(function(e){if(e&&e.name)extras.push(e);});});
  let exH='';
  if(extras.length){
    exH='<div style="'+_pan+'"><div style="'+sec+'">Extras / Lunches</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
    extras.forEach(function(e){
      exH+='<span style="padding:3px 9px;border-radius:12px;background:var(--card);border:1px solid var(--border2);font-size:11px;color:var(--text2)">'+_rzEsc(e.name)+' × '+(parseInt(e.qty,10)||1)+'</span>';
    });
    exH+='</div></div>';
  }
  // Special requests — matching booking fields + comments.
  const reqs=[];
  const f=b.fields||{};
  Object.keys(f).forEach(function(k){
    if(/barcode/i.test(k))return;
    const val=f[k];
    if(val==null||String(val).trim()==='')return;
    if(/special|request|dietary|note|requirement/i.test(k))reqs.push({label:k,value:String(val)});
  });
  if(b.comments&&String(b.comments).trim()!=='')reqs.push({label:'Comments',value:String(b.comments)});
  let reqH='';
  if(reqs.length){
    reqH='<div style="'+_pan+'"><div style="'+sec+'">Special Requests</div><div style="display:flex;flex-direction:column;gap:4px">';
    reqs.forEach(function(r){
      reqH+='<div style="font-size:12px;color:var(--text)"><b style="color:var(--text2)">'+_rzEsc(r.label)+':</b> '+_rzEsc(r.value)+'</div>';
    });
    reqH+='</div></div>';
  }
  // Contact (email hidden from the table — shown here on expand).
  let contactH='';
  if(b.email||b.phone){
    contactH='<div style="'+_pan+'"><div style="'+sec+'">Contact</div>';
    if(b.phone)contactH+='<div style="font-size:12.5px"><a href="tel:'+_rzEsc(b.phone)+'" style="color:var(--acc);text-decoration:none">📞 '+_rzEsc(b.phone)+'</a></div>';
    if(b.email)contactH+='<div style="font-size:12.5px;word-break:break-all"><a href="mailto:'+_rzEsc(b.email)+'" style="color:var(--acc);text-decoration:none">✉ '+_rzEsc(b.email)+'</a></div>';
    contactH+='</div>';
  }
  // Pickup location(s) — editable; options are the day's known pickup locations (shared with the
  // Pickups tab). Lets the desk set/change a booking's pickup straight from here.
  let pkH='';
  var _pkRows=[];
  (b.items||[]).forEach(function(it,ii){
    if(!it.pickup)return; // only items that are part of a van run carry a pickup
    var pid=String(b.orderNumber||'')+'|'+(it.product||'')+'|'+(it.startTimeLocal||'')+'|'+ii;
    var ov2=(S._pickupLocOverride||{});
    var cur=(ov2[pid]!=null&&ov2[pid]!=='')?ov2[pid]:(it.pickup||'');
    var pt=_rzDepTime(it.pickupTime||''); // pickup time (HHMM) shown alongside the location
    _pkRows.push('<div style="display:flex;align-items:center;gap:6px">'+(pt?'<span style="font-size:11px;font-weight:800;color:var(--text2);white-space:nowrap;flex-shrink:0">🕑 '+_rzEsc(pt)+'</span>':'')+_rzLocSelect(pid,cur)+'</div>');
  });
  if(_pkRows.length){
    pkH='<div style="'+_pan+'"><div style="'+sec+'">Pickup'+(_pkRows.length>1?'s':'')+'</div><div style="display:flex;flex-direction:column;gap:4px">'+_pkRows.join('')+'</div></div>';
  }
  // Balance.
  const bal=parseFloat(b.balanceDue);
  const owing=isFinite(bal)&&bal>0;
  let balH='<div style="'+_pan+'"><div style="'+sec+'">Balance</div>';
  balH+='<div style="font-size:14px;font-weight:800;color:'+(owing?'#f59e0b':'#4ade80')+'">'+(owing?'⚠ '+_rzEsc(_rzMoney(bal,b.currency))+' owing':'Paid in full')+'</div>';
  balH+='<div style="font-size:11px;color:var(--text3);margin-top:2px">Total '+_rzEsc(_rzMoney(b.totalAmount,b.currency)||'—')+' · Paid '+_rzEsc(_rzMoney(b.totalPaid,b.currency)||'—')+'</div>';
  balH+='</div>';
  // Booking source / marketplace — always shown (e.g. Viator, GYG, Direct).
  var srcH='<div style="'+_pan+'"><div style="'+sec+'">Source</div><span class="pill" style="background:var(--card);border:1px solid var(--border2);color:var(--text2);font-size:11px;font-weight:800;padding:3px 9px;border-radius:12px">'+_rzEsc(_rzSourceLabel(b))+'</span></div>';
  return bubsH+'<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start">'+
    '<div style="flex:1 1 300px;min-width:240px;display:flex;flex-direction:column;gap:8px">'+paxH+exH+'</div>'+
    '<div style="flex:1 1 240px;min-width:220px;display:flex;flex-direction:column;gap:8px">'+pkH+contactH+reqH+balH+srcH+'</div>'+
    '</div>';
}

// Toggle the expanded detail panel for a booking row.
window.rezdyToggleRow=function(orderNumber){
  if(!S._rezdyOpen||typeof S._rezdyOpen!=='object')S._rezdyOpen={};
  S._rezdyOpen[orderNumber]=!S._rezdyOpen[orderNumber];
  render();
};

window.rezdyShiftDate=function(delta){
  var d=new Date((S.rezdyDate||_rzToday())+'T00:00:00');
  if(isNaN(d))d=new Date();
  d.setDate(d.getDate()+(delta||0));
  window.rezdySetDate(_rzYmd(d));
};
window.rezdySetDate=function(v){
  S.rezdyDate=v||_rzToday();
  // clear date-scoped caches so each tab reloads for the new date
  S._rezdyBookings=null;S._rezdyOpen={};S._pickupVans=null;S._pickupCollected=null;S._schedBlocks=null;S._schedGroupKey=null;S._schedEdit=null;S._rzManLoaded=false;S._rzManPax=null;S._rzLsTabsLoaded=false;S._rzLsTabs=null;
  // clear seatmap view-state that's scoped to a specific day (stale labels would mis-target Allocate/Create)
  S._rzManDepFilter=null;S._rzManShow=null;S._rzCombA=null;S._rzCombB=null;S._rzManCombineOpen=false;S._rzManCardOpen=null;S._rzManCoPic=null;
  // clear the booking-state maps that live in the pickup blob so the new day doesn't briefly render
  // the PREVIOUS day's check-in / aircraft / pickup / pax-meta state before the async blob loads
  // (editing in that window would persist a mixed blob). rezdyLoadPickups repopulates them.
  S._rzBookingCheckedIn={};S._rzBookingAc={};S._rzBookingWx={};S._pickupLocOverride={};S._rezdyPaxMeta={};S._rzCheckin={};S._rzSchedAttach={};S._rzManDepMerge={};
  render();
  // auto-load cached rows for whichever tab is active
  if(S.rezdyTab==='schedule')window.rezdyLoadSchedule();
  else window.rezdyLoadBookings();
};

// Load cached bookings for the current date, then quietly refresh from Rezdy in the
// background (stale-while-revalidate) so the day always matches Rezdy without a blocking wait.
window.rezdyLoadBookings=async function(opts){
  opts=opts||{};
  S._rezdyLoading=true;safeRender();
  const rows=await sbF('ts_rezdy_bookings','&tour_date=eq.'+encodeURIComponent(S.rezdyDate));
  S._rezdyBookings=_rzMapBookings(rows);_rzApplyManualBk();
  S._pickupVans=null; // re-derive van layout from fresh bookings
  S._rezdyLoading=false;
  render();
  // pull saved pickup arrangement for this date (overrides auto layout if present)
  window.rezdyLoadPickups();
  if(opts.noSync!==true)_rzBgSync();
};

// Background sync: keep the viewed date in lock-step with Rezdy. Throttled per-date so
// flipping tabs/dates doesn't hammer the API; runs off the render stack (no re-entrancy).
function _rzBgSync(force){
  var date=S.rezdyDate;if(!date)return;
  if(typeof navigator!=='undefined'&&navigator.onLine===false)return;
  S._rzSyncedAt=S._rzSyncedAt||{};
  if(!force&&(Date.now()-(S._rzSyncedAt[date]||0)<45000))return; // throttle ~45s/date
  if(S._rzBgSyncing===date)return;                               // already in flight
  S._rzBgSyncing=date;S._rzSyncedAt[date]=Date.now();
  S._rzSyncing=true;safeRender();
  callFn('rezdy-sync',{date:date}).then(function(res){
    S._rzBgSyncing=null;S._rzSyncing=false;
    if(date!==S.rezdyDate){safeRender();return;}                 // user moved on
    if(res&&res.ok){
      sbF('ts_rezdy_bookings','&tour_date=eq.'+encodeURIComponent(date)).then(function(rows){
        if(date!==S.rezdyDate)return;
        S._rezdyBookings=_rzMapBookings(rows);_rzApplyManualBk();
        S._pickupVans=null;S._schedBlocks=null;render(); // re-derive vans + calendar blocks
      });
    } else {safeRender();}
  }).catch(function(){S._rzBgSyncing=null;S._rzSyncing=false;safeRender();});
}
window._rzBgSync=_rzBgSync;

// Manual force-refresh (the ⟳ button): sync now, show a confirmation toast.
window.rezdyRefresh=async function(){
  S._rezdyLoading=true;safeRender();
  S._rzSyncedAt=S._rzSyncedAt||{};S._rzSyncedAt[S.rezdyDate]=Date.now();
  const res=await callFn('rezdy-sync',{date:S.rezdyDate});
  if(!res||!res.ok){
    S._rezdyLoading=false;
    toast('Rezdy sync failed'+(res&&res.status?(' ('+res.status+')'):''),'err');
    render();
    return;
  }
  const n=(res.data&&(res.data.count!=null?res.data.count:(Array.isArray(res.data.bookings)?res.data.bookings.length:null)));
  toast('Synced '+(n!=null?n:'')+' booking'+(n===1?'':'s')+' from Rezdy','ok');
  await window.rezdyLoadBookings({noSync:true});
};

// ─────────────────────────────────────────────────────────────────────────────
//  (2) PICKUPS — van allocation
// ─────────────────────────────────────────────────────────────────────────────
function _rzRenderPickups(){
  if(!S._rzVehLoaded){S._rzVehLoaded=true;_rzVehLoad();}
  if(S._pickupLoading)return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading pickups…</div>';
  if(!S._rezdyBookings)return '<div class="card" style="text-align:center;padding:30px;color:var(--text3);font-size:13px">No bookings loaded.<br><button class="btn btn-ghost" style="margin-top:12px;font-size:12px" onclick="window.rezdyLoadBookings()">Load bookings for '+_rzEsc(S.rezdyDate)+'</button></div>';

  const pickups=_rzEnsureVans();
  if(!pickups.length)return '<div class="card" style="text-align:center;padding:36px;color:var(--text3);font-size:13px">No pickups for this date.</div>';

  const selfDrive=pickups.filter(function(p){return p.selfDrive;});
  const vanPickups=pickups.filter(function(p){return !p.selfDrive;});

  // Drivers for the day: ground staff rostered on (default) + anyone added via "＋" + anyone
  // currently assigned. Drag a bubble onto a van; "＋" reveals all rostered crew, by role.
  if(!S._rosterLoaded&&window.loadRosterFromCloud){S._rosterLoaded=true;window.loadRosterFromCloud();}
  const _avail=_rzAvailableDrivers();
  const _extra=(S._pickupExtraDrivers||[]);
  const assigned=(S._pickupDrivers||[]).filter(Boolean);
  let depFilter=S._pickupDepFilter||null;
  const displayDrivers=[];[].concat(_avail,_extra,assigned).forEach(function(n){if(n&&displayDrivers.indexOf(n)<0)displayDrivers.push(n);});
  let driversBar='<div class="card" style="padding:10px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:700;margin-bottom:8px">Drivers <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text3)">(drag onto a van)</span></div>';
  driversBar+='<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">';
  displayDrivers.forEach(function(nm){
    var isAsg=assigned.indexOf(nm)>=0;var isExtra=_extra.indexOf(nm)>=0&&_avail.indexOf(nm)<0;
    driversBar+='<div draggable="true" ondragstart="window.pickupDriverDragStart(\''+_rzEsc(nm).replace(/'/g,"\\'")+'\',event)" title="Drag onto a van to assign" style="display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:16px;background:'+(isAsg?'rgba(74,222,128,.12)':'rgba(124,58,237,.12)')+';border:1px solid '+(isAsg?'rgba(74,222,128,.5)':'rgba(124,58,237,.45)')+';cursor:grab;font-size:12px;font-weight:700;color:'+(isAsg?'#4ade80':'#c4b5fd')+'">'+(isAsg?'✓ ':'👤 ')+_rzEsc(nm)+(isExtra&&!isAsg?'<span onclick="event.stopPropagation();window.pickupRemoveExtraDriver(\''+_rzEsc(nm).replace(/'/g,"\\'")+'\')" style="cursor:pointer;opacity:.55;margin-left:2px" title="Remove">✕</span>':'')+'</div>';
  });
  driversBar+='<button onclick="window.pickupToggleDriverPicker()" title="Add another driver" style="width:30px;height:30px;border-radius:16px;border:1px dashed var(--border2);background:'+(S._pickupDriverPickerOpen?'rgba(124,58,237,.15)':'transparent')+';color:var(--text2);font-size:18px;cursor:pointer;line-height:1;display:inline-flex;align-items:center;justify-content:center">'+(S._pickupDriverPickerOpen?'×':'+')+'</button>';
  driversBar+='</div>';
  if(!displayDrivers.length)driversBar+='<div style="font-size:12px;color:var(--text3);margin-top:6px">No ground staff rostered on — use ＋ to add anyone, or a van with no driver goes by taxi.</div>';
  if(S._pickupDriverPickerOpen){
    var _groups=_rzRosteredByRole();var _anyPick=false;
    driversBar+='<div style="margin-top:10px;border-top:1px solid var(--border2);padding-top:10px">';
    driversBar+='<div style="font-size:11px;color:var(--text3);margin-bottom:6px">Rostered on '+_rzDowLabel(S.rezdyDate)+' — tap to add as a driver</div>';
    _groups.forEach(function(g){
      var picks=g.members.filter(function(n){return displayDrivers.indexOf(n)<0;});
      if(!picks.length)return;_anyPick=true;
      driversBar+='<div style="margin-bottom:8px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700;margin-bottom:4px">'+_rzEsc(g.label)+'</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
      picks.forEach(function(nm){
        driversBar+='<button onclick="window.pickupAddDriver(\''+_rzEsc(nm).replace(/'/g,"\\'")+'\')" style="padding:6px 11px;border-radius:16px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:12px;font-weight:600;cursor:pointer">＋ '+_rzEsc(nm)+'</button>';
      });
      driversBar+='</div></div>';
    });
    if(!_anyPick)driversBar+='<div style="font-size:12px;color:var(--text3)">Everyone rostered on is already listed.</div>';
    driversBar+='</div>';
  }
  // Spare vehicles — parked resources sitting next to the drivers. Drag (or tap) one to add it
  // to the run; an active van can be parked back here from its card.
  var _spareV=[];_rzVehicles().forEach(function(v,vi){if(_rzVanParked(vi))_spareV.push({v:v,vi:vi});});
  driversBar+='<div style="margin-top:10px;border-top:1px solid var(--border2);padding-top:8px">'+
    '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:700;margin-bottom:6px">Spare vehicles <span style="font-weight:400;text-transform:none;letter-spacing:0">(drag below / tap to add)</span></div>'+
    '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">';
  if(!_spareV.length){driversBar+='<span style="font-size:12px;color:var(--text3)">None — all vehicles are in use.</span>';}
  else _spareV.forEach(function(o){var col=o.v.color||'#64748b';
    driversBar+='<div draggable="true" ondragstart="window.pickupVehParkDragStart('+o.vi+',event)" onclick="window.pickupActivateVehicle('+o.vi+')" title="Tap or drag onto the run to add" style="display:flex;align-items:center;gap:6px;padding:6px 11px;border-radius:14px;border:1px dashed '+col+';background:'+col+'18;color:'+col+';cursor:grab;font-size:12px;font-weight:800">🚐 '+_rzEsc(o.v.name||('Van '+(o.vi+1)))+' <span style="opacity:.7;font-weight:600">'+(o.v.seats||11)+'p</span></div>';
  });
  driversBar+='<button onclick="window.pickupVehAdd()" title="Create a new vehicle" style="padding:5px 10px;border-radius:14px;border:1px dashed var(--border2);background:transparent;color:var(--text3);font-size:12px;font-weight:700;cursor:pointer">+ New</button>';
  driversBar+='</div></div>';
  driversBar+='</div>';

  // group van pickups by departure time for the summary
  const byTime={};
  vanPickups.forEach(function(p){(byTime[p.depart||'—']=byTime[p.depart||'—']||[]).push(p);});
  const times=Object.keys(byTime).sort();
  // One departure at a time. Default to the NEXT departure due today (e.g. at 11am show 1200),
  // else the first departure. The user can switch with the time chips.
  if((!depFilter||times.indexOf(depFilter)<0)&&times.length){
    if(S.rezdyDate===_rzToday()){
      var _now=new Date(),_nm=_now.getHours()*60+_now.getMinutes();depFilter=null;
      for(var _ti=0;_ti<times.length;_ti++){if(_rzDepMin(times[_ti])>=_nm){depFilter=times[_ti];break;}}
      if(!depFilter)depFilter=times[times.length-1];
    } else depFilter=times[0];
  }

  const hdr='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:0">Pickup Vans</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+vanPickups.length+' pickups · '+vanPickups.reduce(function(s,p){return s+p.pax;},0)+' pax · '+_rzVehicles().length+' vehicles'+(selfDrive.length?' · '+selfDrive.length+' self-drive':'')+'</p></div>'+
    '<div style="display:flex;gap:6px;flex-shrink:0">'+
      '<button class="btn btn-ghost" style="font-size:12px" onclick="window.pickupToggleVehicles()" title="Manage vehicles">⚙ Vehicles</button>'+
      '<button class="btn btn-ghost" style="font-size:12px" onclick="window.pickupAutoAllocate()">↺ Auto-allocate</button>'+
      '<button class="btn btn-ghost" style="font-size:12px;border-color:rgba(74,222,128,.5);color:#4ade80" onclick="window.pickupSave()">💾 Save</button>'+
    '</div></div>'+(S._pickupVehPanel?_rzVehiclePanel():'');

  // departure-time selector — click a time to focus the board on that departure's run.
  let timeBar='<div class="card" style="padding:10px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:700;margin-bottom:6px">Departure</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
  times.forEach(function(t){
    const grp=byTime[t];const pax=grp.reduce(function(s,p){return s+p.pax;},0);
    const on=depFilter===t;
    timeBar+='<button onclick="window.pickupSetDepFilter(\''+_rzEsc(t).replace(/'/g,"\\'")+'\')" style="padding:4px 10px;border-radius:12px;background:'+(on?'rgba(124,58,237,.25)':'var(--card2)')+';border:1px solid '+(on?'#7c3aed':'var(--border2)')+';font-size:11px;color:'+(on?'#c4b5fd':'var(--text2)')+';cursor:pointer;font-weight:'+(on?'700':'400')+'"><b>'+_rzEsc(t)+'</b> · '+grp.length+' pk / '+pax+' pax</button>';
  });
  timeBar+='</div></div>';

  // van cards/columns (stack vertically on narrow screens via flex-wrap + min-width)
  let vansH='<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start">';
  S._pickupVans.forEach(function(vanIds,vi){
    if(_rzVanParked(vi))return; // parked vehicles are spares, shown by the drivers, not on the board
    // Capacity is per departure run (each ≤11), so size the warning by the busiest departure.
    var _byDepLoad={};vanIds.forEach(function(id){var pp=_rzPickupById(pickups,id);if(pp)_byDepLoad[pp.depart||'~']=(_byDepLoad[pp.depart||'~']||0)+pp.pax;});
    var _maxDep=0;Object.keys(_byDepLoad).forEach(function(k){if(_byDepLoad[k]>_maxDep)_maxDep=_byDepLoad[k];});
    const seats=_rzVehSeats(vi);
    const pax=depFilter?(_byDepLoad[depFilter]||0):_rzVanPax(vanIds,pickups);
    const over=depFilter?(pax>seats):(_maxDep>seats);
    const col=_rzVehColor(vi);
    vansH+='<div ondragover="event.preventDefault();this.style.outline=\'2px solid '+col+'\'" ondragleave="this.style.outline=\'\'" ondrop="window.pickupDropOnVan('+vi+',event);this.style.outline=\'\'" '+
      'style="flex:1 1 260px;min-width:240px;background:var(--card);border:1px solid var(--border);border-top:3px solid '+col+';border-radius:10px;padding:12px">';
    vansH+='<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:8px">'+
      '<div style="font-weight:800;font-size:14px;color:'+col+'">'+_rzEsc(_rzVehName(vi))+'</div>'+
      '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;font-weight:700;color:'+(over?'#ef4444':'var(--text2)')+'">'+pax+' / '+seats+' pax'+(over?' ⚠':'')+'</span>'+
      '<button onclick="window.pickupParkVehicle('+vi+')" title="Park this vehicle (move to spares)" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0 2px">🅿</button></div></div>';
    // Driver / taxi slot — drop a driver bubble anywhere on the van to assign; no driver = taxi.
    var drv=(S._pickupDrivers||[])[vi]||null;
    vansH+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;padding:5px 9px;border-radius:8px;border:1px dashed '+(drv?col+'99':(vanIds.length?'#f59e0b88':'var(--border2)'))+';background:'+(drv?col+'14':(vanIds.length?'rgba(245,158,11,.08)':'transparent'))+'">'+
      (drv
        ?'<span style="font-size:12px;font-weight:700;color:'+col+'">👤 '+_rzEsc(drv)+'</span><button onclick="window.pickupClearDriver('+vi+')" style="margin-left:auto;background:none;border:none;color:var(--text3);font-size:13px;cursor:pointer;line-height:1" title="Clear driver">✕</button>'
        :(vanIds.length
          ?'<span style="font-size:12px;font-weight:700;color:#f59e0b">🚕 Taxi — drop a driver to assign</span>'
          :'<span style="font-size:11px;color:var(--text3)">Drop a driver here</span>'))+
      '</div>';
    var _vlist=vanIds.slice().sort(function(a,b){return _rzPkTimeVal(_rzPickupById(pickups,a))-_rzPkTimeVal(_rzPickupById(pickups,b));}).filter(function(id){if(!depFilter)return true;var pp=_rzPickupById(pickups,id);return pp&&pp.depart===depFilter;});
    if(!vanIds.length){
      vansH+='<div style="text-align:center;padding:16px;color:var(--text3);font-size:12px;border:1px dashed var(--border2);border-radius:8px">Drop pickups here</div>';
    }else if(!_vlist.length){
      vansH+='<div style="text-align:center;padding:14px;color:var(--text3);font-size:12px">No pickups at '+_rzEsc(depFilter)+'</div>';
    }else{
      _vlist.forEach(function(id){
        const p=_rzPickupById(pickups,id);if(!p)return;
        const collected=!!S._pickupCollected[id];
        vansH+='<div draggable="true" ondragstart="window.pickupDragStart(\''+_rzEsc(id).replace(/'/g,"\\'")+'\',event)" '+
          'style="background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:10px;margin-bottom:8px;cursor:grab;'+(collected?'opacity:.55':'')+'">'+
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">'+
            '<div style="font-weight:700;font-size:13px;color:var(--text);'+(collected?'text-decoration:line-through':'')+'">'+_rzEsc(p.customer||p.order)+'</div>'+
            '<span style="flex-shrink:0;font-size:11px;font-weight:700;color:'+col+'">'+p.pax+' pax</span>'+
          '</div>'+
          '<div style="display:flex;align-items:center;gap:5px;margin-top:4px"><span style="font-size:12px">📍</span>'+_rzLocSelect(p.id,p.location)+'</div>'+
          (p.pickupTime?'<div style="font-size:11px;color:var(--text2);margin-top:3px;font-weight:700">🕑 Pickup '+_rzEsc(p.pickupTime)+'</div>':'')+
          (p.depart?'<div style="font-size:11px;color:var(--text3);margin-top:2px">🛫 Dep '+_rzEsc(p.depart)+'</div>':'')+
          (p.phone?'<div style="font-size:12px;margin-top:4px"><a href="tel:'+_rzEsc(p.phone)+'" style="color:'+col+';text-decoration:none">📞 '+_rzEsc(p.phone)+'</a></div>':'')+
          '<button onclick="window.pickupToggleCollected(\''+_rzEsc(id).replace(/'/g,"\\'")+'\')" '+
            'style="margin-top:8px;width:100%;padding:9px;border-radius:7px;border:1px solid '+(collected?'#166534':'var(--border2)')+';background:'+(collected?'var(--ok-bg)':'transparent')+';color:'+(collected?'var(--ok-text)':'var(--text2)')+';font-size:13px;font-weight:700;cursor:pointer">'+
            (collected?'✓ Collected':'Mark collected')+'</button>'+
          '</div>';
      });
    }
    vansH+='</div>';
  });
  // Drop zone to add a spare vehicle to the run.
  if(_rzVehicles().some(function(v,vi){return _rzVanParked(vi);})){
    vansH+='<div ondragover="event.preventDefault();this.style.borderColor=\'var(--acc)\';this.style.color=\'var(--text2)\'" ondragleave="this.style.borderColor=\'var(--border2)\';this.style.color=\'var(--text3)\'" ondrop="this.style.borderColor=\'var(--border2)\';this.style.color=\'var(--text3)\';window.pickupDropActivateVehicle(event)" style="flex:1 1 200px;min-width:180px;align-self:stretch;min-height:90px;display:flex;align-items:center;justify-content:center;text-align:center;border:2px dashed var(--border2);border-radius:10px;color:var(--text3);font-size:12px;font-weight:700;padding:12px">🚐 Drop a spare vehicle here to add it</div>';
  }
  vansH+='</div>';

  // Self-drive: listed to the side (only the selected departure).
  let sdH='';
  var sdShown=selfDrive.filter(function(p){return !depFilter||(p.depart||'—')===depFilter;});
  if(sdShown.length){
    sdH='<div class="card" style="border-left:3px solid #a78bfa"><div style="font-weight:800;font-size:13px;color:#a78bfa;margin-bottom:8px">Self-drive ('+sdShown.length+')</div>'+
      '<div style="display:flex;flex-direction:column;gap:6px">';
    sdShown.forEach(function(p){
      sdH+='<div style="background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:9px 11px">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'+
          '<div><span style="font-weight:700;font-size:13px;color:var(--text)">'+_rzEsc(p.customer||p.order)+'</span>'+
            (p.depart?'<span style="font-size:11px;color:var(--text3);margin-left:8px">🛫 Dep '+_rzEsc(p.depart)+'</span>':'')+'</div>'+
          '<span style="font-size:11px;font-weight:700;color:#a78bfa">'+p.pax+' pax</span>'+
        '</div>'+
        '<div style="display:flex;align-items:center;gap:5px;margin-top:6px"><span style="font-size:12px">📍</span>'+_rzLocSelect(p.id,p.location)+'</div>'+
      '</div>';
    });
    sdH+='</div></div>';
  }
  return hdr+driversBar+timeBar+vansH+sdH;
}

// Editable pickup-location dropdown for a pickup card (options = distinct locations seen).
// Includes a "Self-drive" choice so a pickup can be switched to self-drive and back — people
// ring up and change their minds both ways.
function _rzLocSelect(id,current){
  var isSD=_rzIsSelfDrive(current);
  var locs=_rzAllLocations().filter(function(l){return !_rzIsSelfDrive(l);});
  if(current&&!isSD&&locs.indexOf(current)<0)locs.unshift(current);
  var opts='<option value="__selfdrive__"'+(isSD?' selected':'')+'>🚗 Self-drive</option>'+
    locs.map(function(l){return '<option value="'+_rzEsc(l)+'"'+(l===current?' selected':'')+'>'+_rzEsc(l)+'</option>';}).join('');
  return '<select onclick="event.stopPropagation()" onchange="window.pickupSetLocation(\''+_rzEsc(id).replace(/'/g,"\\'")+'\',this.value)" '+
    'style="flex:1;min-width:0;font-size:12px;padding:3px 4px;background:var(--card);color:var(--text2);border:1px solid var(--border2);border-radius:6px;cursor:pointer">'+opts+'</select>';
}

// Override a pickup's location (persists with the pickup list). "__selfdrive__" flips it to
// self-drive (out of the vans); picking a real location flips it back into a van.
window.pickupSetLocation=function(id,val){
  S._pickupLocOverride=S._pickupLocOverride||{};
  S._pickupLocOverride[id]=(val==='__selfdrive__')?'Self-drive':val;
  // Reconcile van placement in-place (handles a pickup becoming / no longer being
  // self-drive) WITHOUT nulling S._pickupVans — nulling then saving wiped the operator's
  // hand-tuned van arrangement to an empty array before the rebuild ran.
  _rzEnsureVans();
  window.pickupSave(true);
  render();
};

window.rezdyLoadPickups=async function(){
  S._pickupLoading=true;safeRender();
  const rows=await sbF('ts_pickup_lists','&list_date=eq.'+encodeURIComponent(S.rezdyDate));
  const row=(rows&&rows.length)?_rzRow(rows[0]):null;
  if(row&&Array.isArray(row.vans)){
    S._pickupVans=row.vans;
    S._pickupCollected=(row.collected&&typeof row.collected==='object')?row.collected:{};
    S._pickupLocOverride=(row.locOverride&&typeof row.locOverride==='object')?row.locOverride:{};
    S._pickupDrivers=Array.isArray(row.drivers)?row.drivers:[];
    S._pickupExtraDrivers=Array.isArray(row.extraDrivers)?row.extraDrivers:[];
    S._pickupSpare=(row.spare&&typeof row.spare==='object')?row.spare:{};
    S._pickupOrder=(row.order&&typeof row.order==='object')?row.order:{};
    S._rzManualBk=Array.isArray(row.manualBk)?row.manualBk:[];
    S._rezdyPaxMeta=(row.paxMeta&&typeof row.paxMeta==='object')?row.paxMeta:{};
    S._schedPilots=(row.schedPilots&&typeof row.schedPilots==='object')?row.schedPilots:{};
    S._rzBookingAc=(row.bookingAc&&typeof row.bookingAc==='object')?row.bookingAc:{};
    S._rzBookingWx=(row.bookingWx&&typeof row.bookingWx==='object')?row.bookingWx:{};
    S._rzBookingCheckedIn=(row.bookingCheckedIn&&typeof row.bookingCheckedIn==='object')?row.bookingCheckedIn:{};
    S._rzSchedAttach=(row.schedAttach&&typeof row.schedAttach==='object')?row.schedAttach:{};
    S._rzCheckin=(row.checkin&&typeof row.checkin==='object')?row.checkin:{};
  }else{
    S._pickupVans=null;S._pickupCollected={};S._pickupLocOverride={};S._pickupDrivers=[];S._pickupExtraDrivers=[];S._pickupSpare={};S._pickupOrder={};S._rzManualBk=[];S._rezdyPaxMeta={};S._schedPilots={};S._rzBookingAc={};S._rzBookingWx={};S._rzBookingCheckedIn={};S._rzSchedAttach={};S._rzCheckin={};
  }
  _rzApplyManualBk(); // merge this date's manual bookings into the loaded list
  S._pickupLoading=false;
  render();
};

window.pickupAutoAllocate=function(){
  S._pickupVans=_rzAutoVans(_rzPickups());
  toast('Vans auto-allocated','ok');
  render();
};

window.pickupToggleCollected=function(id){
  if(!S._pickupCollected)S._pickupCollected={};
  S._pickupCollected[id]=!S._pickupCollected[id];
  window.pickupSave(true);
  render();
};

window.pickupDragStart=function(id,e){
  S._rezdyDragId=id;
  try{e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move';}catch(_){}
};
window.pickupDropOnVan=function(vi,e){
  if(e&&e.preventDefault)e.preventDefault();
  // A driver bubble dropped on a van assigns that driver to it.
  if(S._rezdyDragDriver){
    S._pickupDrivers=S._pickupDrivers||[];S._pickupDrivers[vi]=S._rezdyDragDriver;S._rezdyDragDriver=null;
    window.pickupSave(true);render();return;
  }
  let id=S._rezdyDragId;
  try{if(!id&&e.dataTransfer)id=e.dataTransfer.getData('text/plain');}catch(_){}
  if(!id||id.indexOf('driver:')===0||!Array.isArray(S._pickupVans))return;
  // remove from any van, append to target
  S._pickupVans=S._pickupVans.map(function(v){return v.filter(function(x){return x!==id;});});
  if(!S._pickupVans[vi])S._pickupVans[vi]=[];
  S._pickupVans[vi].push(id);
  S._rezdyDragId=null;
  window.pickupSave(true);
  render();
};

// silent=true skips the toast (used by auto-saves on toggle/drag)
window.pickupSave=async function(silent){
  const payload={
    id:'pl_'+S.rezdyDate,
    list_date:S.rezdyDate,
    data:{vans:S._pickupVans||[],collected:S._pickupCollected||{},locOverride:S._pickupLocOverride||{},drivers:S._pickupDrivers||[],extraDrivers:S._pickupExtraDrivers||[],spare:S._pickupSpare||{},order:S._pickupOrder||{},manualBk:S._rzManualBk||[],paxMeta:S._rezdyPaxMeta||{},schedPilots:S._schedPilots||{},bookingAc:S._rzBookingAc||{},bookingWx:S._rzBookingWx||{},bookingCheckedIn:S._rzBookingCheckedIn||{},schedAttach:S._rzSchedAttach||{},checkin:S._rzCheckin||{}}
  };
  const r=await sbU('ts_pickup_lists',[payload]);
  if(!silent)toast(r?'Pickup list saved ✓':'Save failed',r?'ok':'err');
};
// Ground staff rostered on (not off/leave) for the current date — i.e. available to drive.
function _rzAvailableDrivers(){
  var ds=S.rezdyDate;var roster=S.roster||{};var off={rdo:1,off:1,leave:1,ul:1,sick:1};
  return (S.users||[]).filter(function(u){
    if(!u||u.inactive||u.role!=='ground_staff')return false;
    var st=(typeof _rGetStatus==='function')?_rGetStatus(u,ds,roster):((roster[ds]||{})[u.id]||'');
    return !off[st];
  }).map(function(u){return (u.name||'').trim();}).filter(Boolean);
}
window.pickupDriverDragStart=function(name,e){S._rezdyDragDriver=name;try{e.dataTransfer.setData('text/plain','driver:'+name);e.dataTransfer.effectAllowed='copy';}catch(_){}};
window.pickupClearDriver=function(vi){if(S._pickupDrivers)S._pickupDrivers[vi]=null;window.pickupSave(true);render();};
window.pickupSetDepFilter=function(t){S._pickupDepFilter=(S._pickupDepFilter===t)?null:t;render();};
// Everyone rostered ON for the day, grouped by role — for the "+" driver picker (anyone can drive).
function _rzRosteredByRole(){
  var ds=S.rezdyDate,roster=S.roster||{},off={rdo:1,off:1,leave:1,ul:1,sick:1};
  var ROLES=[['ground_staff','Ground'],['desk','Desk'],['pilot','Pilot'],['cx_manager','CX Manager'],['accounts','Accounts'],['marketing','Marketing'],['admin','Admin'],['maint','Maintenance'],['superadmin','Superadmin']];
  var out=[];
  ROLES.forEach(function(r){
    var members=(S.users||[]).filter(function(u){
      if(!u||u.inactive||u.role!==r[0])return false;
      var st=(typeof _rGetStatus==='function')?_rGetStatus(u,ds,roster):((roster[ds]||{})[u.id]||'');
      return !off[st];
    }).map(function(u){return (u.name||'').trim();}).filter(Boolean);
    if(members.length)out.push({label:r[1],members:members});
  });
  return out;
}
window.pickupToggleDriverPicker=function(){S._pickupDriverPickerOpen=!S._pickupDriverPickerOpen;render();};
window.pickupAddDriver=function(name){if(!name)return;S._pickupExtraDrivers=S._pickupExtraDrivers||[];if(S._pickupExtraDrivers.indexOf(name)<0)S._pickupExtraDrivers.push(name);S._pickupDriverPickerOpen=false;window.pickupSave(true);render();};
window.pickupRemoveExtraDriver=function(name){S._pickupExtraDrivers=(S._pickupExtraDrivers||[]).filter(function(n){return n!==name;});window.pickupSave(true);render();};

// ─────────────────────────────────────────────────────────────────────────────
//  (2b) MY PICKUPS — mobile-first run sheet for the signed-in driver
// ─────────────────────────────────────────────────────────────────────────────
// Apply a driver's manual stop order (per van + departure) over the default time sort.
function _rzApplyMyOrder(grp,vi,dep){
  var key=vi+'|'+dep;var ord=(S._pickupOrder||{})[key];
  if(!ord||!ord.length)return grp;
  var byId={};grp.forEach(function(p){byId[p.id]=p;});
  var out=[];ord.forEach(function(id){if(byId[id]){out.push(byId[id]);delete byId[id];}});
  grp.forEach(function(p){if(byId[p.id])out.push(p);}); // any new stops keep their time order at the end
  return out;
}
window.myPkDragStart=function(id,e){S._myPkDrag=id;try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);}catch(_){}};
window.myPkDrop=function(vi,dep,targetId,e){
  if(e&&e.preventDefault)e.preventDefault();if(e&&e.stopPropagation)e.stopPropagation();
  var id=S._myPkDrag;S._myPkDrag=null;try{if(!id&&e.dataTransfer)id=e.dataTransfer.getData('text/plain');}catch(_){}
  if(!id||id===targetId)return;
  var pickups=_rzPickups();
  var grp=((S._pickupVans||[])[vi]||[]).map(function(pid){return _rzPickupById(pickups,pid);}).filter(function(p){return p&&(p.depart||'—')===dep;}).sort(function(a,b){return _rzPkTimeVal(a)-_rzPkTimeVal(b);});
  grp=_rzApplyMyOrder(grp,vi,dep);
  var ids=grp.map(function(p){return p.id;});
  var from=ids.indexOf(id);if(from<0)return;ids.splice(from,1);
  var to=ids.indexOf(targetId);if(to<0)to=ids.length;ids.splice(to,0,id);
  S._pickupOrder=S._pickupOrder||{};S._pickupOrder[vi+'|'+dep]=ids;
  if(window.pickupSave)window.pickupSave(true);render();
};
function _rzRenderMyPickups(){
  if(S._pickupLoading)return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading…</div>';
  if(!S._rezdyBookings){
    if(!S._rezdyLoading)window.rezdyLoadBookings();
    return '<div class="card" style="text-align:center;padding:30px;color:var(--text3);font-size:13px">Loading pickups…</div>';
  }
  _rzEnsureVans();
  var pickups=_rzPickups();
  var me=((S.user&&S.user.name)||'').trim();
  if(!me)return '<div class="card" style="text-align:center;padding:30px;color:var(--text3)">Sign in to see your pickups.</div>';
  var myVans=[];
  (S._pickupVans||[]).forEach(function(vanIds,vi){ if(((S._pickupDrivers||[])[vi]||'').trim()===me) myVans.push({vi:vi,ids:vanIds}); });
  if(!myVans.length){
    return '<div style="max-width:560px;margin:0 auto"><div class="card" style="text-align:center;padding:40px 20px;color:var(--text3)"><div style="font-size:30px;margin-bottom:8px">🚐</div><div style="font-size:15px;font-weight:700;color:var(--text2);margin-bottom:4px">No pickups assigned to you</div><div style="font-size:13px">You\'re not on a van for '+_rzDowLabel(S.rezdyDate)+'. Use the arrows above to check another day.</div></div></div>';
  }
  // Departures across all of my vans — show ONE at a time via a selector (bookings-style).
  var allStops=[];
  myVans.forEach(function(v){v.ids.forEach(function(id){var p=_rzPickupById(pickups,id);if(p)allStops.push({vi:v.vi,p:p});});});
  var deps=[];allStops.forEach(function(s){var d=s.p.depart||'—';if(deps.indexOf(d)<0)deps.push(d);});
  deps.sort();
  var selDep=(S._myPkDep&&deps.indexOf(S._myPkDep)>=0)?S._myPkDep:(deps[0]||null);
  var tabs='';
  if(deps.length){
    tabs='<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px;-webkit-overflow-scrolling:touch;scrollbar-width:none">';
    deps.forEach(function(d){
      var cnt=allStops.filter(function(s){return (s.p.depart||'—')===d;}).reduce(function(a,s){return a+(s.p.pax||0);},0);
      tabs+='<button onclick="S._myPkDep=\''+_rzEsc(d).replace(/'/g,"\\'")+'\';render()" class="sub-tab '+(selDep===d?'on':'')+'" style="white-space:nowrap;flex-shrink:0">🛫 '+_rzEsc(d)+' <span style="opacity:.6">('+cnt+')</span></button>';
    });
    tabs+='</div>';
  }
  var h=tabs;
  myVans.forEach(function(v){
    var col=_rzVehColor(v.vi);
    var grp=v.ids.map(function(id){return _rzPickupById(pickups,id);})
                 .filter(function(p){return p&&(p.depart||'—')===selDep;})
                 .sort(function(a,b){return _rzPkTimeVal(a)-_rzPkTimeVal(b);});
    if(!grp.length)return; // this van has nothing for the selected departure
    grp=_rzApplyMyOrder(grp,v.vi,selDep); // honour the driver's manual reorder
    var _viD=v.vi,_depD=_rzEsc(selDep).replace(/'/g,"\\'");
    var depPax=grp.reduce(function(s,p){return s+(p.pax||0);},0);
    h+='<div class="card" style="border-top:4px solid '+col+';padding:14px;margin-bottom:14px">';
    h+='<div style="font-weight:800;font-size:18px;color:'+col+'">'+_rzEsc(_rzVehName(v.vi))+'</div>';
    h+='<div style="font-size:12px;color:var(--text3);margin-bottom:10px">'+grp.length+' stop'+(grp.length===1?'':'s')+' · '+depPax+' pax</div>';
    grp.forEach(function(p){
      var collected=!!(S._pickupCollected||{})[p.id];
      var _idD=_rzEsc(p.id).replace(/'/g,"\\'");
      h+='<div draggable="true" ondragstart="window.myPkDragStart(\''+_idD+'\',event)" ondragover="event.preventDefault()" ondrop="window.myPkDrop('+_viD+',\''+_depD+'\',\''+_idD+'\',event)" style="background:var(--card2);border:1px solid var(--border2);border-left:4px solid '+col+';border-radius:10px;padding:13px;margin-bottom:10px;cursor:grab;'+(collected?'opacity:.55':'')+'">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px">'+
          '<div style="font-weight:800;font-size:16px;color:var(--text1);'+(collected?'text-decoration:line-through':'')+'"><span style="color:var(--text3);font-weight:600;margin-right:6px;cursor:grab" title="Drag to reorder">≡</span>'+_rzEsc(p.customer||p.order)+'</div>'+
          '<span style="flex-shrink:0;font-size:13px;font-weight:800;color:'+col+'">'+p.pax+' pax</span>'+
        '</div>'+
        (p.pickupTime?'<div style="font-size:15px;font-weight:700;color:var(--text1);margin-bottom:3px">🕑 Pickup '+_rzEsc(p.pickupTime)+'</div>':'')+
        '<div style="font-size:14px;color:var(--text2);margin-bottom:'+(p.phone?'8px':'10px')+'">📍 '+_rzEsc(p.location||'—')+'</div>'+
        (p.phone?'<div style="margin-bottom:10px"><a href="tel:'+_rzEsc(p.phone)+'" style="font-size:15px;font-weight:700;color:'+col+';text-decoration:none">📞 '+_rzEsc(p.phone)+'</a></div>':'')+
        '<button onclick="window.pickupToggleCollected(\''+_rzEsc(p.id).replace(/'/g,"\\'")+'\')" style="width:100%;padding:14px;border-radius:9px;border:1px solid '+(collected?'#166534':'var(--border2)')+';background:'+(collected?'var(--ok-bg)':'transparent')+';color:'+(collected?'var(--ok-text)':'var(--text2)')+';font-size:15px;font-weight:800;cursor:pointer">'+(collected?'✓ Collected':'Mark collected')+'</button>'+
      '</div>';
    });
    h+='</div>';
  });
  return '<div style="max-width:560px;margin:0 auto">'+h+'</div>';
}

// ─────────────────────────────────────────────────────────────────────────────
//  (2c) MANIFEST — unallocated pool + drag passengers onto aircraft
// ─────────────────────────────────────────────────────────────────────────────
// Interactive manifest bubble — tap to toggle child, drag onto another bubble (same booking
// group) to fold it in as a lap infant, drag onto an aircraft card to allocate. Mirrors the
// bookings/loadsheet bubble behaviour.
function _rzManBubble(p,allPax){
  allPax=allPax||S._rzManPax||[];
  var gcol=_rzGroupColor(p.group||'');
  var nm=p.name?_rzEsc(String(p.name).split(/\s+/)[0]):'?';
  var tbc=!p.weight;var decld=!tbc&&!!p.declaredWeight;
  var w=tbc?'TBC':(_rzEsc(String(p.weight))+'kg'+(decld?' (d)':''));
  var wCol=tbc?'#b45309':(decld?'#dc2626':'#15803d');
  var isChild=p.type==='child';
  var infant=allPax.find(function(x){return x.infantOf===p.id;});
  var infName=p.infantName||(infant?String(infant.name||'').split(/\s+/)[0]:null);
  var idEsc=_rzEsc(p.id).replace(/'/g,"\\'");
  var infRemove=infant?(' onclick="event.stopPropagation();window.rezdyManRemoveInfant(\''+_rzEsc(infant.id).replace(/'/g,"\\'")+'\')" title="Infant: '+_rzEsc(infName||'')+' (tap to remove)" style="cursor:pointer;'):' title="Infant'+(infName?': '+_rzEsc(infName):'')+'" style="';
  return '<div draggable="true" ondragstart="window.rezdyManDragStart(\''+idEsc+'\',event)" ondragover="event.preventDefault()" ondrop="window.rezdyManDropInfant(\''+idEsc+'\',event)" onclick="window.rezdyManToggleChild(\''+idEsc+'\')" title="'+_rzEsc(p.name||'')+(infName?' (+ infant '+_rzEsc(infName)+')':'')+'" style="position:relative;overflow:hidden;background:rgba(255,255,255,.93);border-radius:8px;'+(p.paymentReq?'border:2px solid #ef4444':'border-left:4px solid '+gcol)+';min-width:62px;flex-shrink:0;cursor:grab">'+
    (p.paymentReq?'<div style="background:#ef4444;color:#fff;font-size:8px;font-weight:900;text-align:center;line-height:1.7">$ TO PAY</div>':'')+
    (isChild?'<div title="Child" style="position:absolute;bottom:3px;right:3px;font-size:10px;font-weight:900;background:#f97316;color:#fff;border-radius:3px;padding:0 4px;line-height:1.5;box-shadow:0 1px 2px rgba(0,0,0,.3)">C</div>':'')+
    (infName?'<div'+infRemove+'position:absolute;bottom:3px;'+(isChild?'left:3px':'right:3px')+';font-size:10px;font-weight:900;background:#ec4899;color:#fff;border-radius:3px;padding:0 4px;line-height:1.5;box-shadow:0 1px 2px rgba(0,0,0,.3)">i</div>':'')+
    '<div style="padding:'+(p.paymentReq?'2px 7px 4px':'4px 7px')+'">'+
      '<div style="font-size:11px;font-weight:700;color:#1e293b;white-space:nowrap;max-width:96px;overflow:hidden;text-overflow:ellipsis">'+nm+'</div>'+
      '<div onclick="event.stopPropagation();window.rezdyManEditWeight(\''+idEsc+'\')" title="'+(decld?'Declared weight — tap to enter actual':'Tap to enter / edit actual weight')+'" style="font-size:10px;font-weight:700;color:'+wCol+';cursor:pointer">'+w+'</div>'+
    '</div>'+
    '<div onclick="event.stopPropagation();window.rezdyManRemove(\''+idEsc+'\')" title="Remove from manifest" style="position:absolute;top:0;right:1px;font-size:10px;color:#94a3b8;cursor:pointer;padding:0 2px">✕</div>'+
  '</div>';
}
function _rzRenderManifest(){
  if(!S._rzManLoaded){if(window.rezdyLoadManifest)window.rezdyLoadManifest();return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading manifest…</div>';}
  var pax=S._rzManPax||[];
  var deps=_rzManDeps();
  var selDep=(S._rzManDepFilter&&deps.indexOf(S._rzManDepFilter)>=0)?S._rzManDepFilter:(deps[0]||'—');
  var pool=pax.filter(function(p){return !p.ac&&!p.infantOf&&_rzPaxDep(p)===selDep;});
  var hidden=S._rzManHidden||[];
  var fleetAll=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(id){return S.aircraft&&S.aircraft[id];});
  pax.forEach(function(p){if(p.ac&&fleetAll.indexOf(p.ac)<0)fleetAll.push(p.ac);});
  var fleet=fleetAll.filter(function(id){return hidden.indexOf(id)<0;});
  var h='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:0">Seatmap</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+_rzDowLabel(S.rezdyDate)+' · '+pax.length+' pax · '+pool.length+' unallocated'+(selDep&&selDep!=='—'?' @ '+_rzEsc(selDep):'')+'</p></div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
      '<button class="btn btn-ghost" style="font-size:12px" onclick="window.rezdyManAdd()">+ Add passenger</button>'+
      (_rzManBaseDeps().length>1?'<button class="btn btn-ghost" style="font-size:12px'+(S._rzManCombineOpen?';border-color:var(--accent);color:var(--accent)':'')+'" onclick="window.rezdyManCombineToggle()">🔗 Combine departures</button>':'')+
      (pool.length?'<button class="btn btn-primary" style="font-size:12px;padding:7px 12px" onclick="window.rezdyManAllocate()">✈ Allocate to aircraft</button>':'')+
      (pax.length?'<button class="btn btn-ghost" style="font-size:12px;color:#ef4444;border-color:rgba(239,68,68,.4)" onclick="window.rezdyManClear()">🗑 Clear</button>':'')+
    '</div></div>';
  // Combine-departures panel.
  if(S._rzManCombineOpen){
    var _bd=_rzManBaseDeps();
    var _curMerge=S._rzManDepMerge||{};
    var _curLabels={};_bd.forEach(function(base){var l=_curMerge[base]||base;_curLabels[l]=1;});
    var _labels=Object.keys(_curLabels).sort(_rzDepCmp);
    var _optsA='<option value="">— departure A —</option>'+_labels.map(function(l){return '<option value="'+_rzEsc(l).replace(/"/g,'&quot;')+'"'+(S._rzCombA===l?' selected':'')+'>'+_rzEsc(l)+'</option>';}).join('');
    var _optsB='<option value="">— departure B —</option>'+_labels.map(function(l){return '<option value="'+_rzEsc(l).replace(/"/g,'&quot;')+'"'+(S._rzCombB===l?' selected':'')+'>'+_rzEsc(l)+'</option>';}).join('');
    var _combined=_labels.filter(function(l){return l.indexOf('+')>=0;});
    h+='<div class="card" style="padding:12px 14px">'+
      '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800;margin-bottom:8px">Combine two departures</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
        '<select onchange="window.rezdyManCombineSet(\'A\',this.value)" style="font-size:13px;font-weight:700;padding:7px 9px;background:var(--card2);color:var(--text1);border:1px solid var(--border2);border-radius:8px">'+_optsA+'</select>'+
        '<span style="font-size:14px;color:var(--text3);font-weight:800">+</span>'+
        '<select onchange="window.rezdyManCombineSet(\'B\',this.value)" style="font-size:13px;font-weight:700;padding:7px 9px;background:var(--card2);color:var(--text1);border:1px solid var(--border2);border-radius:8px">'+_optsB+'</select>'+
        '<button class="btn btn-primary" style="font-size:12px;padding:7px 14px" onclick="window.rezdyManCombineDeps(S._rzCombA,S._rzCombB)">🔗 Combine</button>'+
      '</div>'+
      (_combined.length?'<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:11px;color:var(--text3);font-weight:700">Combined:</span>'+_combined.map(function(l){var lE=_rzEsc(l).replace(/'/g,"\\'");return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;padding:3px 9px;border-radius:14px;background:rgba(123,158,198,.18);border:1px solid var(--border2);color:var(--text2)">'+_rzEsc(l)+'<button onclick="window.rezdyManSplitDep(\''+lE+'\')" title="Split back apart" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:0;line-height:1">✕</button></span>';}).join('')+'</div>':'')+
    '</div>';
  }
  // Departure tabs (e.g. "0800 FCF") — one departure at a time.
  if(deps.length>1||(deps.length===1&&deps[0]!=='—')){
    h+='<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px;-webkit-overflow-scrolling:touch;scrollbar-width:none;align-items:center">';
    deps.forEach(function(d){var cnt=pax.filter(function(p){return !p.infantOf&&_rzPaxDep(p)===d;}).length;h+='<button onclick="S._rzManDepFilter=\''+_rzEsc(d).replace(/'/g,"\\'")+'\';render()" class="sub-tab '+(selDep===d?'on':'')+'" style="white-space:nowrap;flex-shrink:0">🛫 '+_rzManDepLabel(d)+' <span style="opacity:.6">('+cnt+')</span></button>';});
    // Un-merge the selected departure if it's a combined group.
    if(selDep&&String(selDep).indexOf('+')>=0){h+='<button onclick="window.rezdyManSplitDep(\''+_rzEsc(selDep).replace(/'/g,"\\'")+'\')" title="Split this combined departure back apart" style="flex-shrink:0;white-space:nowrap;font-size:11px;font-weight:800;padding:5px 11px;border-radius:14px;border:1px solid var(--border2);background:transparent;color:var(--text2);cursor:pointer">⤬ Unmerge</button>';}
    h+='</div>';
  }
  h+='<div class="card" ondragover="event.preventDefault();this.style.outline=\'2px solid var(--acc)\'" ondragleave="this.style.outline=\'\'" ondrop="this.style.outline=\'\';window.rezdyManDrop(\'__pool__\',event)" style="padding:10px 12px">'+
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--text3)">Unallocated ('+pool.length+')</span>'+
    (pool.length?'<button onclick="window.rezdyManAllocate()" title="Auto-allocate these passengers to aircraft" style="margin-left:auto;font-size:11px;font-weight:800;padding:5px 12px;border-radius:14px;border:1px solid var(--accent);background:var(--accent);color:#fff;cursor:pointer">✈ Reallocate</button>':'')+
    '</div>';
  if(!pool.length)h+='<div style="font-size:12px;color:var(--text3);min-height:46px">All allocated. Push checked-in bookings from the Bookings tab, or add a passenger.</div>';
  else{
    // Group the pool by the aircraft noted on the booking, then by booking group.
    var byAc={};pool.forEach(function(p){var k=p.acHint||'__none__';(byAc[k]=byAc[k]||[]).push(p);});
    var acKeys=Object.keys(byAc).sort(function(a,b){if(a==='__none__')return 1;if(b==='__none__')return -1;return a<b?-1:1;});
    acKeys.forEach(function(ak){
      var none=ak==='__none__';
      var acCol=none?'#64748b':_rzAcCol(ak);
      var acLbl=none?'No aircraft noted':ak.replace('ZK-','');
      var sub=byAc[ak];var subPax=sub.length;
      h+='<div style="margin-bottom:10px">'+
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px"><span style="width:9px;height:9px;border-radius:50%;background:'+acCol+';flex-shrink:0"></span>'+
        '<span style="font-size:12px;font-weight:800;color:'+acCol+'">'+_rzEsc(acLbl)+'</span>'+
        '<span style="font-size:10px;color:var(--text3);font-weight:600">'+subPax+' pax</span></div>';
      // further split by booking group
      var byGrp={};sub.forEach(function(p){var g=p.group||'?';(byGrp[g]=byGrp[g]||[]).push(p);});
      Object.keys(byGrp).forEach(function(gk){
        var gcol=_rzGroupColor(gk);
        h+='<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start;padding:4px 0 4px 8px;border-left:2px solid '+gcol+';margin:3px 0 3px 2px">';
        byGrp[gk].forEach(function(p){h+=_rzManBubble(p,pax);});
        h+='</div>';
      });
      h+='</div>';
    });
  }
  h+='</div>';
  if(!fleet.length&&!fleetAll.length)return h+'<div class="card" style="text-align:center;padding:30px;color:var(--text3)">No aircraft configured.</div>';
  // Available pilots for the day — drag onto an aircraft's PIC slot (type-rating checked).
  // Pilots already assigned as a PIC drop out of the bar until cleared off the aircraft.
  var _assignedPic={};Object.keys(S._rzManPic||{}).forEach(function(ac){if((S._rzManPic||{})[ac])_assignedPic[S._rzManPic[ac]]=1;});
  Object.keys(S._rzManCoPic||{}).forEach(function(ac){if((S._rzManCoPic||{})[ac])_assignedPic[S._rzManCoPic[ac]]=1;}); // co-pilots also drop out of the bar
  var _mPilots=_rzAvailablePilots().filter(function(p){return !_assignedPic[p.code];});
  if(_mPilots.length){
    h+='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px">'+
      '<span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800;margin-right:2px">Pilots</span>';
    _mPilots.forEach(function(p){var off=!p.rostered;h+='<div draggable="true" ondragstart="window.rezdySchedPilotDragStart(\''+_rzEsc(p.code).replace(/'/g,"\\'")+'\',event)" title="'+_rzEsc(p.name)+(off?' (not rostered on today)':'')+' — drag onto an aircraft to set PIC" style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:16px;background:rgba(96,165,250,'+(off?'.06':'.14')+');border:1px solid rgba(96,165,250,'+(off?'.28':'.5')+');cursor:grab;font-size:12px;font-weight:800;color:#60a5fa;opacity:'+(off?'.55':'1')+'">✈ '+_rzEsc(p.code)+(off?' <span style="font-size:8px;opacity:.8;font-weight:700">off</span>':'')+'</div>';});
    h+='</div>';
  }
  // Aircraft with pax allocated THIS departure come first (flying); idle aircraft sort last.
  var _depLoad={};fleet.forEach(function(id){_depLoad[id]=pax.filter(function(p){return p.ac===id&&!p.infantOf&&_rzPaxDep(p)===selDep;}).length;});
  fleet=fleet.slice().sort(function(a,b){return (_depLoad[b]>0?1:0)-(_depLoad[a]>0?1:0);}); // stable: flying first
  // "3 boxes that grow": show the flying aircraft + spare empty drop-boxes (min 3 total; one more
  // empty appears each time the visible empties fill up). Aircraft beyond that stay available in
  // the "Add aircraft" row.
  var _flyingIds=fleet.filter(function(id){return _depLoad[id]>0;});
  var _emptyIds=fleet.filter(function(id){return _depLoad[id]===0;});
  var _forced=(S._rzManShow||[]).filter(function(id){return _emptyIds.indexOf(id)>=0;});
  var _forcedSet={};_forced.forEach(function(id){_forcedSet[id]=1;});
  var _needSpares=Math.max(0,Math.max(3,_flyingIds.length+1)-_flyingIds.length-_forced.length);
  var _visEmpty=_forced.concat(_emptyIds.filter(function(id){return !_forcedSet[id];}).slice(0,_needSpares));
  var _spareOpen={};_visEmpty.forEach(function(id){_spareOpen[id]=1;});
  var _hiddenByGrow=fleet.filter(function(id){return _flyingIds.indexOf(id)<0&&_visEmpty.indexOf(id)<0;}); // capped-out (not removed)
  fleet=_flyingIds.concat(_visEmpty);
  h+='<div class="rzman-fleet">';
  fleet.forEach(function(id){
    var col=(typeof AC_COL!=='undefined'&&AC_COL[id])||'#64748b';
    var a=S.aircraft[id];
    var list=pax.filter(function(p){return p.ac===id&&!p.infantOf&&_rzPaxDep(p)===selDep;});
    var nA=0,nC=0,nI=0;list.forEach(function(p){if(p.type==='child')nC++;else nA++;if(p.infantName)nI++;});
    nI+=pax.filter(function(p){return p.ac===id&&p.infantOf&&_rzPaxDep(p)===selDep;}).length; // manually-folded lap infants
    var picCode=(S._rzManPic||{})[id]||'';
    var unit=(a&&a.layout==='ga8')?'L':'lbs';
    var std=a?Math.round(fromKg(_rzManDefFuelKg(selDep,id),id)):0;
    var fuelVal=(S._rzManFuel&&S._rzManFuel[id]!=null&&S._rzManFuel[id]!=='')?S._rzManFuel[id]:std;
    var idE=id.replace(/'/g,"\\'");
    // Collapsible: open by default only when this aircraft has pax this departure; a manual
    // toggle (keyed by departure+aircraft) overrides the auto state.
    var _ckey=selDep+'|'+id;var _ov=(S._rzManCardOpen||{})[_ckey];
    var open=(_ov!=null)?_ov:(list.length>0||!!_spareOpen[id]); // spare drop-boxes open by default
    h+='<div class="rzman-card" ondragover="event.preventDefault();this.style.outline=\'2px solid '+col+'\'" ondragleave="this.style.outline=\'\'" ondrop="this.style.outline=\'\';window.rezdyManDrop(\''+id+'\',event)" style="background:var(--card);border:1px solid var(--border);border-top:3px solid '+col+';border-radius:10px;padding:12px'+(open?'':';opacity:.92')+'">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px'+(open?';margin-bottom:8px':'')+'">'+
        '<div onclick="window.rezdyManToggleCard(\''+idE+'\')" style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:0">'+
          '<span style="display:inline-block;transition:transform .12s;color:var(--text3);font-size:11px;'+(open?'transform:rotate(90deg)':'')+'">▸</span>'+
          '<span style="font-weight:800;font-size:14px;color:'+col+'">'+id.replace('ZK-','')+(function(){
            var _ds=_rzManAcDestShorts(selDep,id);
            if(_ds.length>1)return '<span style="color:var(--text3);font-weight:800"> → </span><span title="Passengers on this aircraft have DIFFERENT destinations ('+_rzEsc(_ds.join(', '))+'). Split them onto separate flights, or set fuel/destination manually." style="font-size:9px;font-weight:900;color:#fff;background:#ef4444;border-radius:4px;padding:1px 5px;margin-left:4px;vertical-align:middle">⚠ MIXED '+_rzEsc(_ds.join('+'))+'</span>';
            var _d=_rzManAcDest(selDep,id);return _d?'<span style="color:var(--text3);font-weight:800"> → </span><span style="color:var(--text2);font-weight:800">'+_d.short+'</span>'+(_d.scenic?'<span title="Scenic — returns to Queenstown" style="font-size:9px;font-weight:800;color:#22c55e;background:rgba(34,197,94,.14);border-radius:4px;padding:0 4px;margin-left:4px;vertical-align:middle">↺ SCENIC</span>':''):'';
          })()+'</span>'+
          (list.length?'':'<span style="font-size:10px;color:var(--text3);font-weight:600">idle</span>')+
        '</div>'+
        '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;font-weight:700;color:var(--text2)">'+(nA+'A'+(nC?nC+'C':'')+(nI?nI+'i':''))+'</span>'+
        '<button onclick="window.rezdyManDeleteAc(\''+idE+'\')" title="Remove this aircraft (returns its pax to the pool)" style="background:none;border:none;color:#ef444488;cursor:pointer;font-size:13px;padding:0 2px">🗑</button></div></div>';
    if(open){
    // PIC slot (drop a pilot here)
    h+='<div ondragover="event.preventDefault();event.stopPropagation();this.style.outline=\'2px solid #60a5fa\'" ondragleave="this.style.outline=\'\'" ondrop="event.stopPropagation();this.style.outline=\'\';window.rezdyManDropPilot(\''+idE+'\',event)" style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:5px 8px;border-radius:7px;border:1px dashed '+(picCode?'#60a5fa':'var(--border2)')+';background:'+(picCode?'rgba(96,165,250,.1)':'transparent')+'">'+
      '<span style="font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:800">PIC</span>'+
      (picCode
        ?'<span style="font-size:12px;font-weight:800;color:#60a5fa">✈ '+_rzEsc(picCode)+'</span><button onclick="window.rezdyManClearPic(\''+idE+'\')" title="Clear PIC" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;margin-left:auto;padding:0 2px">✕</button>'
        :(function(){var _pp=_rzPilotsForAc(id);return _pp.length
            ?'<select onclick="event.stopPropagation()" onchange="window.rezdyManSetPic(\''+idE+'\',this.value)" style="margin-left:auto;max-width:140px;font-size:12px;font-weight:700;padding:3px 5px;background:var(--card2);color:var(--text1);border:1px solid var(--border2);border-radius:6px;cursor:pointer"><option value="">drag or pick…</option>'+_pp.map(function(p){return '<option value="'+_rzEsc(p.code)+'">'+_rzEsc(p.code)+' · '+_rzEsc(String(p.name).split(/\s+/)[0])+(p.rostered?'':' (off)')+'</option>';}).join('')+'</select>'
            :'<span style="font-size:11px;color:var(--text3);margin-left:auto">No '+id.replace('ZK-','')+'-rated pilot</span>';})())+
    '</div>';
    // Co-pilot slot (only once a PIC is set) — drag a 2nd pilot here or pick one. Seat 1, pax back.
    if(picCode){
      var _coCode=(S._rzManCoPic||{})[id]||'';
      var _coPilots=_coCode?[]:_rzAvailablePilots().filter(function(p){return p.code!==picCode;});
      var _coOpen=!_coCode&&_coPilots.length&&!!((S._rzCoPick||{})[id]); // picker only after a click
      var _coClickable=!_coCode&&_coPilots.length&&!_coOpen;
      var _coInner;
      if(_coCode){
        _coInner='<span style="font-size:12px;font-weight:800;color:#818cf8">✈ '+_rzEsc(_coCode)+'</span><button onclick="event.stopPropagation();window.rezdyManClearCoPic(\''+idE+'\')" title="Clear co-pilot" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;margin-left:auto;padding:0 2px">✕</button>';
      } else if(!_coPilots.length){
        _coInner='<span style="font-size:11px;color:var(--text3);margin-left:auto">optional</span>';
      } else if(_coOpen){
        _coInner='<select onclick="event.stopPropagation()" onchange="window.rezdyManSetCoPic(\''+idE+'\',this.value)" style="margin-left:auto;max-width:140px;font-size:12px;font-weight:700;padding:3px 5px;background:var(--card2);color:var(--text1);border:1px solid var(--border2);border-radius:6px;cursor:pointer"><option value="">pick…</option>'+_coPilots.map(function(p){return '<option value="'+_rzEsc(p.code)+'">'+_rzEsc(p.code)+' · '+_rzEsc(String(p.name).split(/\s+/)[0])+(p.rostered?'':' (off)')+'</option>';}).join('')+'</select>';
      } else {
        _coInner='<span style="margin-left:auto;font-size:11px;font-weight:700;color:var(--text3)">drag to set</span>';
      }
      h+='<div '+(_coClickable?'onclick="window.rezdyManCoPickOpen(\''+idE+'\')" ':'')+'ondragover="event.preventDefault();event.stopPropagation();this.style.outline=\'2px solid #818cf8\'" ondragleave="this.style.outline=\'\'" ondrop="event.stopPropagation();this.style.outline=\'\';window.rezdyManDropPilot(\''+idE+'\',event)" style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:5px 8px;border-radius:7px;border:1px dashed '+(_coCode?'#818cf8':'var(--border2)')+';background:'+(_coCode?'rgba(129,140,248,.1)':'transparent')+';cursor:'+(_coClickable?'pointer':'default')+'">'+
        '<span style="font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:800">CO-PILOT</span>'+
        _coInner+
      '</div>';
    }
    // Fuel
    h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">'+
      '<span style="font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:800">Fuel</span>'+
      '<input type="number" inputmode="decimal" value="'+_rzEsc(String(fuelVal))+'" onchange="window.rezdyManFuel(\''+idE+'\',this.value)" style="width:70px;background:var(--card2);border:1px solid var(--border2);border-radius:6px;color:var(--text1);font-size:12px;font-weight:700;text-align:right;padding:4px 6px;outline:none">'+
      '<span style="font-size:11px;color:var(--text3)">'+unit+'</span>'+
      '<span style="font-size:10px;color:var(--text3);margin-left:auto" title="Standard fuel">std '+std+'</span>'+
    '</div>';
    if(!list.length)h+='<div style="text-align:center;padding:14px;color:var(--text3);font-size:12px;border:1px dashed var(--border2);border-radius:8px;margin-bottom:8px">Drop passengers here</div>';
    else{
      h+=_rzManWBReadout(selDep,id);
      h+=_rzManSeatGrid(selDep,id,col);
      h+=_rzManCargoZones(selDep,id);
      // No per-aircraft "unseated" area: anyone who doesn't fit a seat is bumped back to the shared
      // unallocated pool (see rezdyManReseat / rezdyManDrop), so the pool is the single overflow area.
    }
    h+='<button class="btn btn-primary" style="width:100%;padding:8px;font-size:12px;'+(list.length?'':'opacity:.5')+'" onclick="window.rezdyManCreateLoadsheet(\''+idE+'\',\''+_rzEsc(selDep).replace(/'/g,"\\'")+'\')">📋 Create loadsheet</button>';
    } // /open
    h+='</div>';
  });
  h+='</div>';
  // Add aircraft — removed aircraft (re-add) + any capped-out by the grow limit (reveal as a box).
  var hiddenAvail=fleetAll.filter(function(id){return hidden.indexOf(id)>=0;});
  if(hiddenAvail.length||_hiddenByGrow.length){
    h+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px">'+
      '<span style="font-size:11px;color:var(--text3);font-weight:700">Add aircraft:</span>';
    _hiddenByGrow.forEach(function(id){var col=_rzAcCol(id);h+='<button onclick="window.rezdyManShowAc(\''+id.replace(/'/g,"\\'")+'\')" style="font-size:12px;font-weight:700;padding:4px 11px;border-radius:16px;border:1px solid '+col+';background:transparent;color:'+col+';cursor:pointer">+ '+id.replace('ZK-','')+'</button>';});
    hiddenAvail.forEach(function(id){var col=_rzAcCol(id);h+='<button onclick="window.rezdyManAddAc(\''+id.replace(/'/g,"\\'")+'\')" style="font-size:12px;font-weight:700;padding:4px 11px;border-radius:16px;border:1px solid '+col+';background:transparent;color:'+col+';cursor:pointer">+ '+id.replace('ZK-','')+'</button>';});
    h+='</div>';
  }
  return h;
}
function _rzManSave(){
  if(typeof sbU==='function')sbU('ts_settings',[{key:'rz_manifest_'+S.rezdyDate,value:JSON.stringify({pax:S._rzManPax||[],pic:S._rzManPic||{},coPic:S._rzManCoPic||{},fuel:S._rzManFuel||{},hidden:S._rzManHidden||[],seats:S._rzManSeats||{},cargo:S._rzManCargo||{},depMerge:S._rzManDepMerge||{}})}]).catch(function(){});
  _rzManBroadcast();
}
// Live editing: tell other devices the manifest for this date changed so they reload it.
function _rzManBroadcast(){
  try{
    if(typeof _rtWs==='undefined'||!_rtWs||_rtWs.readyState!==1)return;
    if(typeof _rtRef!=='undefined')_rtRef++;
    _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'rz_manifest_update',payload:{date:S.rezdyDate,sessionId:(typeof _sessionId!=='undefined'?_sessionId:'')}},ref:String(typeof _rtRef!=='undefined'?_rtRef:1)}));
  }catch(e){}
}
// Reload the manifest for the current date from the cloud (used by the live-update receiver).
window.rezdyReloadManifestLive=function(){
  if(!S.rezdyDate)return;
  try{fetch(SB+'/rest/v1/ts_settings?key=eq.'+encodeURIComponent('rz_manifest_'+S.rezdyDate)+'&select=value',{headers:SH}).then(function(r){return r.ok?r.json():[];}).then(function(rows){
    var v=rows&&rows[0]&&rows[0].value;if(typeof v==='string'){try{v=JSON.parse(v);}catch(e){v=null;}}
    if(v){
      S._rzManPax=Array.isArray(v.pax)?v.pax:[];
      S._rzManPic=(v.pic&&typeof v.pic==='object')?v.pic:{};
      S._rzManCoPic=(v.coPic&&typeof v.coPic==='object')?v.coPic:{};// live-sync co-pilots
      S._rzManFuel=(v.fuel&&typeof v.fuel==='object')?v.fuel:{};
      S._rzManHidden=Array.isArray(v.hidden)?v.hidden:[];
      S._rzManSeats=(v.seats&&typeof v.seats==='object')?v.seats:{};
      S._rzManCargo=(v.cargo&&typeof v.cargo==='object')?v.cargo:{};
      S._rzManDepMerge=(v.depMerge&&typeof v.depMerge==='object')?v.depMerge:{};
      if(typeof safeRender==='function')safeRender();
    }
  }).catch(function(){});}catch(e){}
};
window.rezdyLoadManifest=async function(){
  try{
    var r=await fetch(SB+'/rest/v1/ts_settings?key=eq.'+encodeURIComponent('rz_manifest_'+S.rezdyDate)+'&select=value',{headers:SH});
    if(r.ok){var rows=await r.json();var v=rows&&rows[0]&&rows[0].value;if(typeof v==='string'){try{v=JSON.parse(v);}catch(e){v=null;}}
      S._rzManPax=(v&&Array.isArray(v.pax))?v.pax:[];
      S._rzManPic=(v&&v.pic&&typeof v.pic==='object')?v.pic:{};
      S._rzManCoPic=(v&&v.coPic&&typeof v.coPic==='object')?v.coPic:{};
      S._rzManFuel=(v&&v.fuel&&typeof v.fuel==='object')?v.fuel:{};
      S._rzManHidden=(v&&Array.isArray(v.hidden))?v.hidden:[];
      S._rzManSeats=(v&&v.seats&&typeof v.seats==='object')?v.seats:{};
      S._rzManCargo=(v&&v.cargo&&typeof v.cargo==='object')?v.cargo:{};
      S._rzManDepMerge=(v&&v.depMerge&&typeof v.depMerge==='object')?v.depMerge:{};
    }
    else{S._rzManPax=[];S._rzManPic={};S._rzManCoPic={};S._rzManFuel={};S._rzManHidden=[];S._rzManSeats={};S._rzManCargo={};S._rzManDepMerge={};}
  }catch(e){S._rzManPax=S._rzManPax||[];S._rzManPic=S._rzManPic||{};S._rzManFuel=S._rzManFuel||{};S._rzManHidden=S._rzManHidden||[];S._rzManSeats=S._rzManSeats||{};S._rzManCargo=S._rzManCargo||{};S._rzManDepMerge=S._rzManDepMerge||{};}
  S._rzManLoaded=true;render();
};
// The currently-selected Bookings departure (resolved the same way as _rzRenderBookings).
function _rzCurBookingsDep(){
  var deps=[];(S._rezdyBookings||[]).forEach(function(b){if(/cancel/i.test(b.status||''))return;var d=_rzBookingDep(b);if(deps.indexOf(d)<0)deps.push(d);});
  deps.sort(_rzDepCmp);
  return (S._bkDepFilter&&deps.indexOf(S._bkDepFilter)>=0)?S._bkDepFilter:(deps[0]||null);
}
// Push the SELECTED departure's checked-in bookings into the Seatmap (from the Bookings tab).
// Departure-scoped — other departures already in the Seatmap are left untouched, and there's no
// nag about bookings on other runs that aren't checked in.
window.rezdyPushToManifest=async function(){
  if(!S._rezdyBookings){if(window.rezdyLoadBookings)window.rezdyLoadBookings();if(typeof toast==='function')toast('Loading bookings — tap Push again in a moment.','info');return;}
  if(!S._rzManLoaded&&window.rezdyLoadManifest){try{await window.rezdyLoadManifest();}catch(_){}}
  var dep=_rzCurBookingsDep();
  if(!dep){if(typeof toast==='function')toast('No departure selected to push.','info');return;} // never full-wipe the seatmap
  window.rezdyManPull(dep);
  S._rzManDepFilter=dep; // focus the seatmap on the pushed departure
};
// Pull checked-in pax into the Seatmap. With a departure scope, ONLY that departure's pax are
// (re)built; pax from other departures and manually-added pax are preserved.
window.rezdyManPull=function(depScope){
  if(!S._rezdyBookings){if(window.rezdyLoadBookings)window.rezdyLoadBookings();toast('Loading bookings — tap Push again in a moment.','info');return;}
  var existing={};(S._rzManPax||[]).forEach(function(p){existing[p.id]=p;});
  var fresh=[];
  (S._rezdyBookings||[]).forEach(function(b){
    if(/cancel/i.test(b.status||''))return;
    if(depScope&&_rzBookingDep(b)!==depScope)return; // only the pushed departure
    var order=String(b.orderNumber||'');
    // Only CHECKED-IN passengers appear in the seatmap (with captured names + weights).
    var ci=_rzCheckinPax(order);
    if(!(S._rzBookingCheckedIn||{})[order]||!ci)return;
    var bal=parseFloat(b.balanceDue);var owing=isFinite(bal)&&bal>0;
    var acHint=_rzBookingAc(b,order);
    ci.forEach(function(r,i){
      var id=order+'|c'+i;var ex=existing[id];var isInf=r.type==='infant';
      // Weight = actual if captured, else the declared weight (Rezdy +4kg) flagged as declared.
      // declared is ALSO kept on every pax so an aircraft can switch to all-declared mode.
      var hasA=!isInf&&r.actual!=null;var useDecl=!isInf&&!hasA&&r.declared!=null;
      var wv=isInf?'':(hasA?String(r.actual):(useDecl?String(r.declared):''));
      fresh.push({id:id,name:r.name||'',weight:wv,declared:(r.declared!=null?r.declared:null),declaredWeight:useDecl,type:isInf?'adult':(r.type==='child'?'child':'adult'),infantName:null,group:order,paymentReq:owing,ac:ex?ex.ac:null,acHint:acHint,infantOf:isInf?(r.attach!=null?order+'|c'+r.attach:undefined):(ex?ex.infantOf:undefined)});
    });
  });
  // Lap infants follow their host's aircraft (they aren't seated).
  fresh.forEach(function(p){if(p.infantOf){var host=fresh.find(function(x){return x.id===p.infantOf;});if(host)p.ac=host.ac;}});
  // Preserve manual pax + (when scoped) every other departure's pax; replace only this departure.
  var freshIds={};fresh.forEach(function(p){freshIds[p.id]=1;});
  var keep=(S._rzManPax||[]).filter(function(p){
    if(freshIds[p.id])return false;                       // refreshed below
    if(String(p.id).indexOf('m_')===0)return true;        // manually-added pax stay
    // depScope is time-only (the bookings push); a seatmap pax dep is TIME·DEST. Compare on the
    // time so re-pushing a departure cleanly refreshes ALL its pax (every destination at that time).
    if(depScope)return String(_rzPaxDep(p)).split('·')[0]!==String(depScope).split('·')[0];
    return false;                                         // full refresh when unscoped
  });
  S._rzManPax=keep.concat(fresh);_rzManSave();
  toast(fresh.length+' checked-in pax pushed to seatmap'+(depScope&&depScope!=='—'?' · '+depScope:''),'ok');
  render();
};
// ── Combine departures ── merge two (or more) departures into one seatmap group so they share
// aircraft/seat allocation. Stored as a base-dep → combined-label map in S._rzManDepMerge.
window.rezdyManCombineToggle=function(){S._rzManCombineOpen=!S._rzManCombineOpen;if(S._rzManCombineOpen){S._rzCombA=S._rzCombA||'';S._rzCombB=S._rzCombB||'';}render();};
window.rezdyManCombineSet=function(which,val){S['_rzComb'+which]=val;render();};
window.rezdyManCombineDeps=function(a,b){
  if(!a||!b||a===b){if(typeof toast==='function')toast('Pick two different departures to combine.','warn');return;}
  var merge=S._rzManDepMerge||{};
  // Every natural dep whose CURRENT (possibly already-combined) label is a or b joins the group.
  var members=_rzManBaseDeps().filter(function(base){var lbl=merge[base]||base;return lbl===a||lbl===b||base===a||base===b;});
  if(members.length<2){if(typeof toast==='function')toast('Nothing to combine.','warn');return;}
  // Heads-up if the departures go to DIFFERENT destinations (fuel + dest follow only one of them).
  var _ds={};members.forEach(function(base){var s=String(base).split('·')[1];if(s)_ds[s]=1;});
  if(Object.keys(_ds).length>1&&!confirm('These departures go to different destinations ('+Object.keys(_ds).join(', ')+').\n\nCombining puts passengers with different destinations on the same aircraft — the fuel default and destination label will follow only one of them, and you’ll see a ⚠ MIXED warning. Combine anyway?'))return;
  var label=members.slice().sort(_rzDepCmp).join('+'); // e.g. "0800+1200" (earliest first)
  S._rzManDepMerge=S._rzManDepMerge||{};
  members.forEach(function(base){S._rzManDepMerge[base]=label;});
  _rzManReseatDep(label); // re-seat the now-combined pax under the new departure key
  S._rzManDepFilter=label;S._rzManCombineOpen=false;S._rzCombA='';S._rzCombB='';
  _rzManSave();render();
  if(typeof toast==='function')toast('Combined into '+label,'ok');
};
// Split a combined group back into its individual departures.
window.rezdyManSplitDep=function(label){
  var merge=S._rzManDepMerge||{};
  var bases=Object.keys(merge).filter(function(base){return merge[base]===label;});
  bases.forEach(function(base){delete merge[base];});
  S._rzManDepMerge=merge;if(S._rzManDepFilter===label)S._rzManDepFilter=null;
  bases.forEach(function(base){_rzManReseatDep(base);}); // re-seat each departure on its own again
  _rzManSave();render();
};
// Re-seat every aircraft that carries pax for a given (possibly combined) departure.
function _rzManReseatDep(dep){
  var acs={};(S._rzManPax||[]).forEach(function(p){if(p.ac&&!p.infantOf&&_rzPaxDep(p)===dep)acs[p.ac]=1;});
  Object.keys(acs).forEach(function(ac){if(typeof window.rezdyManReseat==='function')window.rezdyManReseat(dep,ac);});
}
// Collapse / expand an aircraft card on the seatmap (per departure + aircraft).
window.rezdyManToggleCard=function(id){
  var dep=_rzManSelDep();var key=dep+'|'+id;
  var has=(S._rzManPax||[]).filter(function(p){return p.ac===id&&!p.infantOf&&_rzPaxDep(p)===dep;}).length>0;
  S._rzManCardOpen=S._rzManCardOpen||{};
  var cur=S._rzManCardOpen[key];var eff=(cur!=null)?cur:has;
  S._rzManCardOpen[key]=!eff;render();
};
window.rezdyManAdd=function(){
  var nm=prompt('Passenger name:');if(nm==null)return;
  var wt=prompt('Weight (kg) — leave blank for TBC:')||'';
  S._rzManPax=S._rzManPax||[];
  var dep=_rzManSelDep(); // drop into the departure currently in view (not a new '—' departure)
  S._rzManPax.push({id:'m_'+Date.now()+'_'+Math.floor(Math.random()*1e4),name:String(nm).trim(),weight:String(wt).replace(/[^0-9.]/g,''),type:'adult',infantName:null,group:'manual',_dep:(dep&&dep!=='—')?dep:null,paymentReq:false,ac:null});
  _rzManSave();render();
};
window.rezdyManDragStart=function(id,e){S._rzManDrag=id;try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);}catch(_){}};
window.rezdyManDrop=function(ac,e){
  if(e&&e.preventDefault)e.preventDefault();
  var id=S._rzManDrag;S._rzManDrag=null;
  try{if(!id&&e.dataTransfer)id=e.dataTransfer.getData('text/plain');}catch(_){}
  if(!id)return;
  var p=(S._rzManPax||[]).find(function(x){return x.id===id;});if(!p)return;
  if(p.infantOf)return; // a lap infant moves with its host, not on its own
  var dest=(ac==='__pool__')?null:ac;
  var prevAc=p.ac,dep=_rzPaxDep(p);
  S._rzManSeats=S._rzManSeats||{};
  // Clear the dragged pax (and its infants don't seat) from its old seat.
  if(prevAc){var ok=_rzSeatKey(dep,prevAc);var osm=S._rzManSeats[ok]||{};Object.keys(osm).forEach(function(k){if(osm[k]===p.id)delete osm[k];});S._rzManSeats[ok]=osm;}
  p.ac=dest;
  (S._rzManPax||[]).forEach(function(x){if(x.infantOf===p.id)x.ac=dest;}); // infants follow the host
  // Place into the first FREE pax seat (preserves everyone else's manual seating).
  if(dest){
    var key=_rzSeatKey(dep,dest);var sm=S._rzManSeats[key]||{};
    var _coSeat=((S._rzManCoPic||{})[dest])?1:-1; // seat 1 is the co-pilot's, never a pax
    var paxSeats=(typeof paxSeatIdxs==='function')?paxSeatIdxs(dest,_coSeat===1):[];var freeIdx=null;
    for(var i=0;i<paxSeats.length;i++){if(!sm[paxSeats[i]]){freeIdx=paxSeats[i];break;}}
    if(freeIdx!=null){sm[freeIdx]=p.id;S._rzManSeats[key]=sm;}
    else{ // cabin full — leave them in the shared unallocated pool rather than an unseated overflow
      p.ac=null;(S._rzManPax||[]).forEach(function(x){if(x.infantOf===p.id)x.ac=null;});
      if(typeof toast==='function')toast(String(dest).replace('ZK-','')+' is full — '+(p.name||'passenger')+' stays in the pool.','warn');
    }
  }
  _rzManSave();render();
};
// Tap a bubble to cycle adult → child → adult.
window.rezdyManToggleChild=function(id){
  var p=(S._rzManPax||[]).find(function(x){return x.id===id;});if(!p||p.infantOf)return;
  p.type=(p.type==='child')?'adult':'child';_rzManSave();render();
};
// Drop one bubble onto another in the SAME booking group to fold it in as a lap infant.
window.rezdyManDropInfant=function(hostId,e){
  if(e&&e.preventDefault)e.preventDefault();if(e&&e.stopPropagation)e.stopPropagation();
  var id=S._rzManDrag;S._rzManDrag=null;
  try{if(!id&&e.dataTransfer)id=e.dataTransfer.getData('text/plain');}catch(_){}
  if(!id||id===hostId)return;
  var pax=S._rzManPax||[];
  var inf=pax.find(function(x){return x.id===id;});var host=pax.find(function(x){return x.id===hostId;});
  if(!inf||!host||host.infantOf)return;
  if((inf.group||'')!==(host.group||''))return; // same booking only
  if(pax.some(function(x){return x.infantOf===inf.id;}))return; // can't fold a host that has its own infant
  inf.infantOf=host.id;inf.type='infant';inf.ac=host.ac;_rzManSave();render();
};
window.rezdyManRemoveInfant=function(infId){
  var inf=(S._rzManPax||[]).find(function(x){return x.id===infId;});if(!inf)return;
  delete inf.infantOf;inf.type='adult';_rzManSave();render();
};
window.rezdyManRemove=function(id){
  // Removing a host also unfolds its infants back into the pool.
  (S._rzManPax||[]).forEach(function(x){if(x.infantOf===id){delete x.infantOf;x.type='adult';}});
  S._rzManPax=(S._rzManPax||[]).filter(function(x){return x.id!==id;});_rzManSave();render();
};
window.rezdyManClear=function(){if(!confirm('Clear the whole manifest for this day?'))return;S._rzManPax=[];S._rzManSeats={};_rzManSave();render();};
// Enter / edit a passenger's ACTUAL weight directly in the manifest.
window.rezdyManEditWeight=function(id){var p=(S._rzManPax||[]).find(function(x){return x.id===id;});if(!p)return;var v=prompt('Actual weight (kg) for '+(p.name||'passenger')+':',p.weight||'');if(v==null)return;p.weight=String(v).replace(/[^0-9.]/g,'');if(p.weight)p.declaredWeight=false;var dep=_rzPaxDep(p);if(p.ac&&typeof window.rezdyManReseat==='function')window.rezdyManReseat(dep,p.ac);_rzManSave();render();};

// ── Manifest: departure scoping, seat allocation (W&B solver), per-aircraft W&B ──
function _rzManDepInfo(order){
  var b=(S._rezdyBookings||[]).find(function(x){return String(x.orderNumber||'')===String(order);});
  if(!b)return null;
  return {dep:_rzBookingDep(b),prod:_rzProduct((((b.items||[])[0]||{}).product)||'')};
}
// Natural (un-combined) departure for a manifest pax. The departure identity is TIME + DESTINATION,
// so products at the same time to the SAME place (e.g. FEF + FCF → Milford) are one flight, while
// same-time products to DIFFERENT places (e.g. Milford vs Mt Cook) are separate flights. Products
// with no known destination (and the Flybacks group) key on the time/label alone.
function _rzBaseDep(p){
  if(!p)return '—';
  if(p._dep)return p._dep; // manual pax carry their explicit departure key
  var i=_rzManDepInfo(p.group);
  if(!i)return '—';
  var dep=i.dep||'—';
  if(dep===RZ_FLYBACK_DEP||dep==='—')return dep;
  var d=_rzProductDest(i.prod);
  return d?(dep+'·'+d.short):dep; // "0800·MF"
}
// Effective departure — applies any manual "combine departures" remap (S._rzManDepMerge).
function _rzPaxDep(p){var base=_rzBaseDep(p);var m=S._rzManDepMerge||{};return m[base]||base;}
// The distinct NATURAL departures present (before combining) — for the combine picker.
function _rzManBaseDeps(){var set={};(S._rzManPax||[]).forEach(function(p){if(!p.infantOf)set[_rzBaseDep(p)]=1;});return Object.keys(set).sort(_rzDepCmp);}
// The departure currently focused on the seatmap (defaults to the first one present).
function _rzManSelDep(){
  var deps=_rzManDeps();var f=S._rzManDepFilter;
  if(f&&deps.indexOf(f)>=0)return f;
  // A bookings push focuses by TIME only ("0800"); match it to the first time+dest departure.
  if(f){var t=String(f).split('·')[0];var hit=deps.find(function(d){return d.split('·')[0]===t;});if(hit)return hit;}
  return deps[0]||'—';
}
// Distinct departures present in the manifest, sorted.
function _rzManDeps(){
  var set={};(S._rzManPax||[]).forEach(function(p){if(!p.infantOf)set[_rzPaxDep(p)]=1;});
  return Object.keys(set).sort(_rzDepCmp);
}
function _rzManDepLabel(dep){
  // "0800 FCF" — show the time(s) (strip the ·DEST grouping suffix) + the product flown.
  var disp=String(dep||'').split('+').map(function(s){return s.split('·')[0];}).join('+');
  var prod='';(S._rzManPax||[]).some(function(p){if(_rzPaxDep(p)===dep){var i=_rzManDepInfo(p.group);if(i&&i.prod){prod=i.prod;return true;}}return false;});
  return _rzEsc(disp)+(prod?' '+_rzEsc(prod):'');
}
// The product flown by one aircraft's pax on a departure (from the seated pax' booking groups).
function _rzManAcProd(dep,acId){
  var prod='';
  (S._rzManPax||[]).some(function(p){if(p.ac===acId&&!p.infantOf&&_rzPaxDep(p)===dep){var i=_rzManDepInfo(p.group);if(i&&i.prod){prod=i.prod;return true;}}return false;});
  return prod;
}
// Destination for one aircraft's pax on a departure (for the "SLA → MC" seatmap label / loadsheet
// dest). Derives the product from the seated pax; a Flybacks departure always returns to Queenstown.
function _rzManAcDest(dep,acId){
  var d=_rzProductDest(_rzManAcProd(dep,acId));
  if(!d&&dep===RZ_FLYBACK_DEP)d={short:'QN',apt:'NZQN'};
  return d;
}
// Distinct destination shorts among an aircraft's seated pax on a departure. >1 ⇒ a combined
// departure that mixes destinations onto one aircraft (fuel/dest then follow only one of them).
function _rzManAcDestShorts(dep,acId){
  var set={};
  (S._rzManPax||[]).forEach(function(p){
    if(p.ac!==acId||p.infantOf||_rzPaxDep(p)!==dep)return;
    var i=_rzManDepInfo(p.group);var d=i?_rzProductDest(i.prod):null;
    if(d&&d.short)set[d.short]=1;
  });
  return Object.keys(set);
}
// Default LOADED fuel (kg) for an aircraft on a departure. Each seated pax implies a fuel demand
// for their leg (flyback return = reduced Milford load; otherwise the product default / aircraft
// standard); we take the MAX so a combined/mixed-destination aircraft is fuelled for its most
// demanding leg (the ⚠ MIXED warning still flags the mix). Used for the seatmap fuel readout, the
// W&B preview and the created loadsheet so they all agree.
function _rzManDefFuelKg(dep,acId){
  var max=null;
  (S._rzManPax||[]).forEach(function(p){
    if(p.ac!==acId||p.infantOf||_rzPaxDep(p)!==dep)return;
    var i=_rzManDepInfo(p.group);var prod=i?i.prod:'';
    var f=(prod==='FLB'||prod==='CCF')?_milfordFuelKg(acId):_rzProdFuelKg(prod,acId);
    if(f!=null&&(max==null||f>max))max=f;
  });
  if(max!=null)return max;
  // No identifiable pax (e.g. all manual) → fall back to the dep-based default.
  var _fb=(dep===RZ_FLYBACK_DEP)||(String(dep||'').split('+').indexOf(RZ_FLYBACK_DEP)>=0);
  if(_fb){var m=_milfordFuelKg(acId);if(m!=null)return m;}
  return _rzProdFuelKg(_rzManAcProd(dep,acId),acId);
}
function _rzSeatKey(dep,acId){return String(dep||'—')+'|'+acId;}
function _rzManSeatsFor(dep,acId){S._rzManSeats=S._rzManSeats||{};return S._rzManSeats[_rzSeatKey(dep,acId)]||{};}
// An aircraft must use ONE weight basis for all pax (except the PIC): all ACTUAL, or all DECLARED.
// If any seated/allocated pax on this aircraft lacks an actual weight, the whole aircraft falls
// back to declared weights. Returns true = declared mode.
function _rzManDeclMode(dep,acId){
  var list=(S._rzManPax||[]).filter(function(p){return p.ac===acId&&!p.infantOf&&_rzPaxDep(p)===dep;});
  if(!list.length)return false;
  return list.some(function(p){return !!p.declaredWeight;});
}
// The weight to use for a pax given the aircraft's mode (declared overrides actual when in
// declared mode and a declared value exists).
function _rzPaxWeight(p,declMode){return (declMode&&p&&p.declared!=null)?p.declared:(p?p.weight:'');}
// Build a loadsheet form for one departure's aircraft so we can run the shared W&B engine.
function _rzManAcForm(dep,acId){
  var a=S.aircraft[acId];if(!a)return null;
  var form=bF_ac(acId);form.date=S.rezdyDate||form.date;
  var picCode=(S._rzManPic||{})[acId];
  if(picCode){var pil=_rzPilotByCode(picCode);if(pil&&pil.name){form.pic=pil.name;form.names[0]=pil.name;if(pil.weight)form.seats[0]=String(pil.weight);}}
  // Co-pilot occupies seat 1 as crew (counted as crew weight by calcFormWB).
  var coCode=(S._rzManCoPic||{})[acId];
  if(coCode){var copil=_rzPilotByCode(coCode);if(copil&&copil.name){form.coPilot=copil.name;form.names[1]=copil.name;if(copil.weight)form.seats[1]=String(copil.weight);}}
  // Fuel + burn default to the PRODUCT config (so the W&B preview matches the loadsheet that gets
  // created); a manual seatmap fuel override still wins for fuel.
  var fuelDisp=(S._rzManFuel&&S._rzManFuel[acId]!=null&&S._rzManFuel[acId]!=='')?S._rzManFuel[acId]:fromKg(_rzManDefFuelKg(dep,acId),acId);
  form.fuel=String(toKg(fuelDisp,acId));
  var _pbd=_rzProdBurnDisp(_rzManAcProd(dep,acId),acId);if(_pbd!=null)form.burnOff=String(_pbd);
  var seats=_rzManSeatsFor(dep,acId);
  var declMode=_rzManDeclMode(dep,acId);
  Object.keys(seats).forEach(function(idx){if(coCode&&String(idx)==='1')return;var p=(S._rzManPax||[]).find(function(x){return x.id===seats[idx];});if(!p)return;form.names[idx]=p.name||'';var wv=_rzPaxWeight(p,declMode);form.seats[idx]=(wv!=null&&wv!=='')?String(wv):'';if(p.type==='child')form.paxType[idx]='C';});
  var cargo=_rzManCargoFor(dep,acId);form.cargo=form.cargo||{};Object.keys(cargo).forEach(function(zi){form.cargo[zi]=String(cargo[zi]);});
  return form;
}
function _rzManAcWB(dep,acId){try{var f=_rzManAcForm(dep,acId);return f?calcFormWB(f):null;}catch(e){return null;}}
// Re-seat one departure's aircraft using the shared seat-assignment engine (groups together,
// front-to-back). Returns the seat map.
window.rezdyManReseat=function(dep,acId){
  var list=(S._rzManPax||[]).filter(function(p){return p.ac===acId&&!p.infantOf&&_rzPaxDep(p)===dep;});
  var _declMode=(typeof _rzManDeclMode==='function')?_rzManDeclMode(dep,acId):false;
  // Use the EFFECTIVE weight (actual if captured, else declared) so the heavy-front solver can
  // balance CoG even before actual weights are entered.
  var paxList=list.map(function(p){
    var w=parseFloat((typeof _rzPaxWeight==='function')?_rzPaxWeight(p,_declMode):p.weight);
    if(isNaN(w)){var d=parseFloat(p.declared);w=isNaN(d)?0:d;}
    return {id:p.id,weight:w,bag:0,group:p.group||''};
  });
  var _coPic=!!(S._rzManCoPic||{})[acId];
  // Heavier passengers/groups go FORWARD to keep the centre of gravity in balance (groups still sit
  // together). Falls back to the order-preserving seater only if heavy-front throws.
  var sm={};try{sm=assignSeatsHeavyFront(acId,paxList,{coSeat1:_coPic})||{};}catch(e){try{sm=assignSeats(acId,paxList,{coSeat1:_coPic})||{};}catch(e2){sm={};}}
  if(_coPic)_rzReserveCoSeat(sm,acId); // safety: ensure seat 1 stays clear for the co-pilot
  // Any passenger who couldn't get a seat (cabin full — e.g. a co-pilot just took seat 1) is
  // bumped back to the UNALLOCATED pool rather than left allocated-but-seatless (which carries no
  // W&B contribution and confuses the count). Clearing .ac returns them to the pool.
  var _seated={};Object.keys(sm).forEach(function(k){_seated[sm[k]]=1;});
  var _bumped=0;
  list.forEach(function(p){if(!_seated[p.id]){p.ac=null;_bumped++;(S._rzManPax||[]).forEach(function(x){if(x.infantOf===p.id)x.ac=null;});}});
  if(_bumped&&typeof toast==='function')toast(_bumped+' passenger'+(_bumped>1?'s':'')+' bumped to the pool (cabin full).','warn');
  S._rzManSeats=S._rzManSeats||{};S._rzManSeats[_rzSeatKey(dep,acId)]=sm;
  return sm;
};
// When a co-pilot occupies seat 1, move any passenger the solver put there to the next free
// passenger seat (pushing pax back); if the cabin is full they fall to the overflow list.
function _rzReserveCoSeat(sm,acId){
  if(!sm||sm[1]==null)return;
  var a=S.aircraft[acId];if(!a||!a.seats)return;var removed=a.removedSeats||[];
  var occ={};Object.keys(sm).forEach(function(k){occ[k]=1;});
  var free=null;for(var i=2;i<a.seats.length;i++){if(removed.indexOf(i)>=0)continue;if(!occ[i]){free=i;break;}}
  var pid=sm[1];delete sm[1];if(free!=null)sm[free]=pid; // else pid becomes unseated overflow
}
function _rzManCap(id){var a=S.aircraft[id];return (a&&a.seats)?paxSeatIdxs(id,!!(S._rzManCoPic||{})[id]).length:0;}
// Allocate this departure's unallocated passengers to aircraft using the same rules as the main
// seatmap allocator: a booking-noted aircraft (acHint) acts like a pin; the rest keep their
// booking group together, heaviest first, and flow to the aircraft with the most spare capacity
// (load-balanced across the fleet). Each aircraft is then seated by the shared W&B engine.
window.rezdyManAllocate=function(){
  var dep=_rzManSelDep();if(!dep||dep==='—'){var ds=_rzManDeps();dep=ds[0];}
  var pax=S._rzManPax||[];
  var unalloc=pax.filter(function(p){return !p.ac&&!p.infantOf&&_rzPaxDep(p)===dep;});
  if(!unalloc.length){if(typeof toast==='function')toast('Nothing to allocate for '+dep+'.','info');return;}
  var fleet=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(id){return S.aircraft&&S.aircraft[id]&&(S._rzManHidden||[]).indexOf(id)<0;});
  // _rzManCap already excludes the co-pilot's seat 1 when one is assigned, so don't over-allocate.
  var cap={},load={};fleet.forEach(function(id){cap[id]=_rzManCap(id);load[id]=pax.filter(function(p){return p.ac===id&&!p.infantOf&&_rzPaxDep(p)===dep;}).length;});
  function free(id){return cap[id]-load[id];}
  function place(p,id){p.ac=id;load[id]++;pax.forEach(function(x){if(x.infantOf===p.id)x.ac=id;});} // lap infants follow the host
  // 1) Honour the booking-noted aircraft when it still has room (a pin).
  var unpinned=[];
  unalloc.forEach(function(p){var hint=(p.acHint&&fleet.indexOf(p.acHint)>=0)?p.acHint:null;if(hint&&free(hint)>0)place(p,hint);else unpinned.push(p);});
  // 2) Keep groups together, heaviest first.
  unpinned.sort(function(a,b){if((a.group||'')!==(b.group||''))return String(a.group||'').localeCompare(String(b.group||''));return (parseFloat(b.weight||0))-(parseFloat(a.weight||0));});
  // 3) Each flows to the aircraft with the MOST spare capacity.
  unpinned.forEach(function(p){var best=fleet.filter(function(id){return free(id)>0;}).sort(function(a,b){return free(b)-free(a);})[0];if(best)place(p,best);else if(typeof toast==='function')toast('No seat left for '+(p.name||'a passenger')+' — add an aircraft.','warn');});
  // 4) Seat each aircraft (groups together, heavy-front for CoG).
  fleet.forEach(function(id){window.rezdyManReseat(dep,id);});
  _rzManSave();render();
  if(typeof toast==='function')toast('Allocated '+unalloc.length+' to aircraft','ok');
};
// Drag a passenger bubble onto a specific seat. PIC seat (0) is locked. If the target seat is
// taken by someone in the SAME aircraft, the two swap; otherwise place and clear the old seat.
window.rezdyManDropSeat=function(dep,acId,idx,e){
  if(e&&e.preventDefault)e.preventDefault();if(e&&e.stopPropagation)e.stopPropagation();
  if(parseInt(idx)===0)return; // PIC seat is fixed
  if(parseInt(idx)===1&&(S._rzManCoPic||{})[acId])return; // seat 1 reserved for the co-pilot
  var id=S._rzManDrag;S._rzManDrag=null;try{if(!id&&e.dataTransfer)id=e.dataTransfer.getData('text/plain');}catch(_){}
  if(!id)return;
  var p=(S._rzManPax||[]).find(function(x){return x.id===id;});if(!p||p.infantOf)return;
  var prevAc=p.ac,pdep=_rzPaxDep(p);
  S._rzManSeats=S._rzManSeats||{};
  // Remove from old seat (possibly a different aircraft).
  var oldKey=prevAc?_rzSeatKey(pdep,prevAc):null,oldIdx=null;
  if(oldKey){var osm=S._rzManSeats[oldKey]||{};Object.keys(osm).forEach(function(k){if(osm[k]===id)oldIdx=k;});}
  p.ac=acId;(S._rzManPax||[]).forEach(function(x){if(x.infantOf===p.id)x.ac=acId;});
  var key=_rzSeatKey(dep,acId);var sm=S._rzManSeats[key]||{};
  var occupant=sm[idx];
  if(occupant&&occupant!==id){
    // swap: move the occupant to the dragged pax's old seat if it was in this same aircraft
    if(oldKey===key&&oldIdx!=null){sm[oldIdx]=occupant;}
    // else the occupant becomes unseated (overflow) — kept on the aircraft
  } else if(oldKey===key&&oldIdx!=null){delete sm[oldIdx];}
  if(oldKey&&oldKey!==key&&oldIdx!=null){var osm2=S._rzManSeats[oldKey]||{};delete osm2[oldIdx];S._rzManSeats[oldKey]=osm2;}
  sm[idx]=id;S._rzManSeats[key]=sm;
  _rzManSave();render();
};
// Compact seat-plan grid for one departure's aircraft (front-to-back rows).
// The single seat-plan = the allocated passengers in their seats. PIC locked top-left (seat 0),
// front pax top-right, then rows of 2. Pax bubbles keep their group colour + green actual weight.
function _rzManSeatGrid(dep,acId,col){
  var a=S.aircraft[acId];if(!a||!a.seats)return '';
  // Use the authoritative cabin layout (rows of cells + spacers) so the seat plan matches the
  // real seatmap exactly (e.g. C208 seats 10/11 and 12/13 sit side-by-side).
  var rows=(typeof acLayout==='function')?acLayout(acId):[];
  if(!rows.length)return '';
  var seats=_rzManSeatsFor(dep,acId);
  var declMode=_rzManDeclMode(dep,acId);
  var byId={};(S._rzManPax||[]).forEach(function(p){byId[p.id]=p;});
  var picCode=(S._rzManPic||{})[acId]||'';var pic=picCode?_rzPilotByCode(picCode):null;
  var coCode=(S._rzManCoPic||{})[acId]||'';var co=coCode?_rzPilotByCode(coCode):null;
  var depE=_rzEsc(dep).replace(/'/g,"\\'"),acE=acId.replace(/'/g,"\\'");
  var SW=82,SH=42;
  var h='<div style="display:flex;flex-direction:column;gap:5px;align-items:center;margin:8px 0 8px">';
  rows.forEach(function(r){
    if(r==='spacer'){h+='<div style="height:7px"></div>';return;}
    h+='<div style="display:flex;gap:5px;justify-content:center">';
    r.forEach(function(cell){
      var idx=cell.i;
      if(idx===0){ // PIC seat — drop a pilot here to set/replace the PIC (pax can't sit here)
        h+='<div ondragover="event.preventDefault();event.stopPropagation();this.style.outline=\'2px solid #60a5fa\'" ondragleave="this.style.outline=\'\'" ondrop="event.stopPropagation();this.style.outline=\'\';window.rezdyManDropPicSeat(\''+acE+'\',event)" title="PIC'+(pic?' '+_rzEsc(pic.name):'')+' — drop a pilot here to set" style="width:'+SW+'px;height:'+SH+'px;border-radius:7px;border:1.5px solid #60a5fa;background:rgba(96,165,250,.12);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden">'+
          '<div style="font-size:9px;font-weight:800;color:#60a5fa">PIC</div>'+(pic&&pic.weight?'<div style="font-size:9px;font-weight:700;color:#60a5fa">'+pic.weight+'kg</div>':'')+
        '</div>';
        return;
      }
      if(idx===1&&coCode){ // co-pilot seat — crew, passengers pushed back
        h+='<div title="Co-pilot'+(co?' '+_rzEsc(co.name):'')+'" style="position:relative;width:'+SW+'px;height:'+SH+'px;border-radius:7px;border:1.5px solid #818cf8;background:rgba(129,140,248,.14);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden">'+
          '<div onclick="window.rezdyManClearCoPic(\''+acE+'\')" title="Clear co-pilot" style="position:absolute;top:-1px;right:1px;font-size:9px;color:#818cf8;cursor:pointer;padding:0 1px">✕</div>'+
          '<div style="font-size:9px;font-weight:800;color:#818cf8;white-space:nowrap">✈ '+_rzEsc(coCode)+' · CP</div>'+
          '<div style="font-size:9px;font-weight:700;color:#818cf8">'+((co&&co.weight)?co.weight+'kg':'set wt')+'</div>'+
        '</div>';
        return;
      }
      var pid=seats[idx];var p=pid?byId[pid]:null;
      if(p){
        var gcol=_rzGroupColor(p.group||'');
        var nm=_rzEsc(String(p.name||'').split(/\s+/)[0]);
        var wv=_rzPaxWeight(p,declMode);
        var tbc=(wv==null||wv==='');var decld=!tbc&&declMode;
        var wTxt=tbc?'TBC':(_rzEsc(String(wv))+'kg'+(decld?' (d)':''));
        var wCol=tbc?'#b45309':(decld?'#dc2626':'#15803d');
        var isChild=p.type==='child';var inf=(S._rzManPax||[]).find(function(x){return x.infantOf===p.id;});var infN=p.infantName||(inf?String(inf.name||'').split(/\s+/)[0]:null);
        var idEsc=_rzEsc(p.id).replace(/'/g,"\\'");
        h+='<div draggable="true" ondragstart="window.rezdyManDragStart(\''+idEsc+'\',event)" ondragover="event.preventDefault()" ondrop="window.rezdyManDropSeat(\''+depE+'\',\''+acE+'\','+idx+',event)" title="'+_rzEsc(p.name||'')+'" style="position:relative;width:'+SW+'px;height:'+SH+'px;border-radius:7px;border:1.5px solid '+(p.paymentReq?'#ef4444':gcol)+';border-left:4px solid '+gcol+';background:rgba(255,255,255,.93);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;cursor:grab">'+
          (isChild?'<div title="Child" style="position:absolute;bottom:2px;right:2px;font-size:10px;font-weight:900;background:#f97316;color:#fff;border-radius:3px;padding:0 4px;line-height:1.4;box-shadow:0 1px 2px rgba(0,0,0,.3)">C</div>':'')+
          (infN?'<div title="Infant: '+_rzEsc(infN)+'" style="position:absolute;bottom:2px;'+(isChild?'left:2px':'right:2px')+';font-size:10px;font-weight:900;background:#ec4899;color:#fff;border-radius:3px;padding:0 4px;line-height:1.4;box-shadow:0 1px 2px rgba(0,0,0,.3)">i</div>':'')+
          '<div onclick="event.stopPropagation();window.rezdyManRemove(\''+idEsc+'\')" title="Remove" style="position:absolute;top:-1px;right:1px;font-size:9px;color:#94a3b8;cursor:pointer;padding:0 1px">✕</div>'+
          '<div style="font-size:9.5px;font-weight:700;color:#1e293b;white-space:nowrap;max-width:'+(SW-10)+'px;overflow:hidden;text-overflow:ellipsis">'+nm+'</div>'+
          '<div onclick="event.stopPropagation();window.rezdyManEditWeight(\''+idEsc+'\')" title="'+(decld?'Declared weight — tap to enter actual':'Tap to edit actual weight')+'" style="font-size:8.5px;font-weight:700;color:'+wCol+';cursor:pointer">'+wTxt+'</div>'+
        '</div>';
      } else {
        h+='<div ondragover="event.preventDefault()" ondrop="window.rezdyManDropSeat(\''+depE+'\',\''+acE+'\','+idx+',event)" title="Empty seat '+idx+'" style="width:'+SW+'px;height:'+SH+'px;border-radius:7px;border:1.5px dashed var(--border2);display:flex;align-items:center;justify-content:center"><div style="font-size:10px;color:var(--text3)">'+idx+'</div></div>';
      }
    });
    h+='</div>';
  });
  h+='</div>';
  return h;
}
// W&B readout chip for a departure's aircraft.
function _rzManWBReadout(dep,acId){
  var wb=_rzManAcWB(dep,acId);if(!wb)return '';
  var red='#ef4444',ok='var(--ok-text)'; // green when within limits, red when out
  return '<div style="font-size:10px;font-weight:700;margin-bottom:6px;display:flex;gap:10px;flex-wrap:wrap">'+
    '<span style="color:'+(wb.towOk?ok:red)+'">TOW '+Math.round(wb.tow)+'kg'+(wb.towOk?'':' ⚠')+'</span>'+
    '<span style="color:'+(wb.lwOk?ok:red)+'">LDW '+Math.round(wb.lw)+'kg'+(wb.lwOk?'':' ⚠')+'</span>'+
    '<span style="color:'+(wb.cogOk?ok:red)+'">CG '+(wb.towCog!=null?wb.towCog.toFixed(3):'—')+(wb.cogOk?'':' ⚠')+'</span>'+
  '</div>';
}
// Editable cargo zones for a departure's aircraft (fed into the W&B + loadsheet).
function _rzManCargoFor(dep,acId){S._rzManCargo=S._rzManCargo||{};return S._rzManCargo[_rzSeatKey(dep,acId)]||{};}
function _rzManCargoZones(dep,acId){
  var a=S.aircraft[acId];if(!a||!a.cargo||!a.cargo.length)return '';
  var cargo=_rzManCargoFor(dep,acId);
  var depE=_rzEsc(dep).replace(/'/g,"\\'"),acE=acId.replace(/'/g,"\\'");
  var h='<div style="margin:2px 0 8px"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:800;margin-bottom:4px">Cargo</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
  a.cargo.forEach(function(zn,zi){
    var w=(cargo[zi]!=null?cargo[zi]:'');var wn=parseFloat(w)||0;var over=!!(zn.maxKg&&wn>zn.maxKg);
    h+='<div style="flex:1 1 88px;min-width:80px;background:var(--card2);border:1px solid '+(over?'#ef4444':'var(--border2)')+';border-radius:7px;padding:5px 7px">'+
      '<div title="'+_rzEsc(zn.lbl||('Zone '+(zi+1)))+'" style="font-size:9px;font-weight:700;color:'+(over?'#ef4444':'var(--text3)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_rzEsc(zn.lbl||('Zone '+(zi+1)))+(zn.maxKg?' ·'+zn.maxKg:'')+(over?' ⚠':'')+'</div>'+
      '<div style="display:flex;align-items:baseline;gap:3px"><input type="number" inputmode="decimal" value="'+_rzEsc(String(w))+'" placeholder="0" onchange="window.rezdyManCargo(\''+depE+'\',\''+acE+'\','+zi+',this.value)" style="width:50px;font-size:14px;font-weight:700;background:transparent;border:none;color:'+(over?'#ef4444':'var(--text)')+';padding:0;outline:none"><span style="font-size:10px;color:var(--text3)">kg</span></div>'+
    '</div>';
  });
  return h+'</div></div>';
}
window.rezdyManCargo=function(dep,acId,zi,v){
  S._rzManCargo=S._rzManCargo||{};var key=_rzSeatKey(dep,acId);var c=S._rzManCargo[key]||{};
  var n=String(v).replace(/[^0-9.]/g,'');if(n==='')delete c[zi];else c[zi]=n;
  S._rzManCargo[key]=c;_rzManSave();
};

// ── Manifest PIC / fuel / aircraft controls ──
window.rezdyManDropPilot=function(acId,e){
  if(e&&e.preventDefault)e.preventDefault();if(e&&e.stopPropagation)e.stopPropagation();
  var code=S._schedPilotDrag;S._schedPilotDrag=null;if(!code||!acId)return;
  var pil=_rzPilotByCode(code);
  var curPic=(S._rzManPic||{})[acId];
  // A SECOND pilot dropped on an aircraft that already has a PIC becomes the CO-PILOT (seat 1,
  // pushing the passengers back). The first pilot is the PIC.
  if(curPic&&curPic!==code){
    if(((S._rzManCoPic||{})[acId])===code)return; // already the co-pilot
    // Co-pilot need NOT be rated on this aircraft type (only the PIC must be) — allow any pilot.
    S._rzManCoPic=S._rzManCoPic||{};S._rzManCoPic[acId]=code;
    _rzManReseatDepForAc(acId); // re-seat so seat 1 is freed for the co-pilot
    _rzManSave();render();
    if(typeof toast==='function')toast(code+' set as co-pilot','ok');
    return;
  }
  // First pilot → PIC. Must be PIC-eligible AND approved on this aircraft (the profile pills).
  if(pil&&!pil.picAuth){if(typeof toast==='function')toast(code+' is not PIC-eligible (no aircraft approvals in their profile).','warn');return;}
  var en=(pil&&pil.endorse)||_rzPilotEndorse(code);
  if(en&&en.length&&en.indexOf(acId)<0){if(typeof toast==='function')toast(code+' is not passed out (type-rated) on '+String(acId).replace('ZK-','')+'.','warn');return;}
  S._rzManPic=S._rzManPic||{};S._rzManPic[acId]=code;_rzManSave();render();
};
// Drop a pilot directly onto the PIC seat (seat 0) to set/replace the PIC. Validates the type
// rating via rezdyManSetPic (the same check the PIC dropdown uses).
window.rezdyManDropPicSeat=function(acId,e){
  if(e&&e.preventDefault)e.preventDefault();if(e&&e.stopPropagation)e.stopPropagation();
  var code=S._schedPilotDrag;S._schedPilotDrag=null;
  if(!code){try{var dt=e&&e.dataTransfer&&e.dataTransfer.getData('text/plain');if(dt&&dt.indexOf('pilot:')===0)code=dt.slice(6);}catch(_){}}
  if(!code||!acId)return;
  if(((S._rzManCoPic||{})[acId])===code){if(typeof toast==='function')toast('That pilot is the co-pilot — clear them first.','warn');return;}
  window.rezdyManSetPic(acId,code);
};
// Reveal the co-pilot picker dropdown for one aircraft (it's hidden behind a "drag to set" prompt
// until the area is clicked).
window.rezdyManCoPickOpen=function(acId){S._rzCoPick=S._rzCoPick||{};S._rzCoPick[acId]=true;render();};
window.rezdyManSetCoPic=function(acId,code){
  if(S._rzCoPick)delete S._rzCoPick[acId]; // collapse the picker back to the prompt
  if(!code){window.rezdyManClearCoPic(acId);return;}
  if((S._rzManPic||{})[acId]===code){if(typeof toast==='function')toast('That pilot is already the PIC.','warn');return;}
  S._rzManCoPic=S._rzManCoPic||{};S._rzManCoPic[acId]=code;_rzManReseatDepForAc(acId);_rzManSave();render();
};
window.rezdyManClearCoPic=function(acId){if(S._rzManCoPic)delete S._rzManCoPic[acId];if(S._rzCoPick)delete S._rzCoPick[acId];_rzManReseatDepForAc(acId);_rzManSave();render();};
// Re-seat the aircraft for whatever departure(s) its pax belong to (used when crew seating changes).
function _rzManReseatDepForAc(acId){
  var deps={};(S._rzManPax||[]).forEach(function(p){if(p.ac===acId&&!p.infantOf)deps[_rzPaxDep(p)]=1;});
  Object.keys(deps).forEach(function(dep){if(typeof window.rezdyManReseat==='function')window.rezdyManReseat(dep,acId);});
}
// Pick a PIC from the dropdown — only pilots holding this aircraft's approval pill are listed,
// so the aircraft pills remain the single source of truth.
window.rezdyManSetPic=function(acId,code){
  if(!code){window.rezdyManClearPic(acId);return;}
  var en=_rzPilotEndorse(code);
  if(en&&en.length&&en.indexOf(acId)<0){if(typeof toast==='function')toast(code+' is not approved on '+String(acId).replace('ZK-','')+'.','warn');return;}
  S._rzManPic=S._rzManPic||{};S._rzManPic[acId]=code;_rzManSave();render();
};
window.rezdyManClearPic=function(acId){if(S._rzManPic)delete S._rzManPic[acId];_rzManSave();render();};
window.rezdyManFuel=function(acId,v){S._rzManFuel=S._rzManFuel||{};var n=String(v).replace(/[^0-9.]/g,'');if(n==='')delete S._rzManFuel[acId];else S._rzManFuel[acId]=n;_rzManSave();};
window.rezdyManDeleteAc=function(acId){
  (S._rzManPax||[]).forEach(function(p){if(p.ac===acId){p.ac=null;}}); // pax back to the pool
  if(S._rzManPic)delete S._rzManPic[acId];
  if(S._rzManCoPic)delete S._rzManCoPic[acId];
  S._rzManHidden=S._rzManHidden||[];if(S._rzManHidden.indexOf(acId)<0)S._rzManHidden.push(acId);
  _rzManSave();render();
};
window.rezdyManAddAc=function(acId){if(!acId)return;S._rzManHidden=(S._rzManHidden||[]).filter(function(x){return x!==acId;});_rzManSave();render();};
// Reveal an aircraft that the "3 boxes that grow" limit had hidden (a manual drop-box).
window.rezdyManShowAc=function(acId){if(!acId)return;S._rzManShow=S._rzManShow||[];if(S._rzManShow.indexOf(acId)<0)S._rzManShow.push(acId);render();};
// Build a real loadsheet for this aircraft from the manifest allocation, reusing the
// existing W&B engine, and open it (saved into the shared ts_loadsheets / Saved list).
window.rezdyManCreateLoadsheet=function(acId,dep){
  var phys=acId;var a=S.aircraft[phys];
  if(!a){if(typeof toast==='function')toast('Aircraft not configured.','warn');return;}
  if(!dep){var ds=_rzManDeps();dep=(S._rzManDepFilter&&ds.indexOf(S._rzManDepFilter)>=0)?S._rzManDepFilter:(ds[0]||'—');}
  var list=(S._rzManPax||[]).filter(function(p){return p.ac===phys&&!p.infantOf&&_rzPaxDep(p)===dep;});
  if(!list.length){if(typeof toast==='function')toast('No passengers allocated to '+phys.replace('ZK-','')+' at '+dep+'.','warn');return;}
  var form=bF_ac(phys);
  form.date=S.rezdyDate||form.date;
  // Carry the departure time through to the loadsheet ETD ("1200" → "12:00"; the Flyback group
  // uses its 1530 return time; a combined "0800+1200" uses the earliest leg).
  var _firstLeg=String(dep||'').split('+')[0].split('·')[0]; // strip the ·DEST grouping suffix
  var _etd=(_firstLeg===RZ_FLYBACK_DEP)?'15:30':_rzHHMMcolon(_firstLeg);
  if(_etd&&/^\d{1,2}:\d{2}$/.test(_etd)){form.etd=_etd;form.etdCustom=true;}
  // Flybacks fly the RETURN leg Milford → Queenstown with reduced fuel.
  var _isFb=(dep===RZ_FLYBACK_DEP)||(String(dep||'').split('+').indexOf(RZ_FLYBACK_DEP)>=0);
  if(_isFb){form.dep='NZMF';form.dest='NZQN';}
  else{
    // Auto-pick the destination from the product flown (THH/MCEXP/MCGL → Mt Cook, FCF → Milford),
    // departing Queenstown. Saves the user setting it by hand.
    var _acDest=_rzManAcDest(dep,phys);
    if(_acDest){form.dep='NZQN';form.dest=_acDest.apt;}
  }
  // PIC (manifest stores the 2-letter code → resolve to the crew name the loadsheet expects)
  var picCode=(S._rzManPic||{})[phys];
  if(picCode){
    var pil=_rzPilotByCode(picCode);
    if(pil&&pil.name){form.pic=pil.name;form.names[0]=pil.name;if(pil.weight)form.seats[0]=String(pil.weight);}
  }
  // Co-pilot → seat 1 (crew); passengers fill from seat 2.
  var coCode=(S._rzManCoPic||{})[phys];var _hasCo=false;
  if(coCode){var copil=_rzPilotByCode(coCode);if(copil&&copil.name){form.coPilot=copil.name;form.names[1]=copil.name;if(copil.weight)form.seats[1]=String(copil.weight);_hasCo=true;}}
  // Fuel + burn: a manual seatmap fuel override wins; otherwise the PRODUCT default — flyback
  // (dep Milford) = reduced load, else the per-product fuel/burn (else aircraft standard).
  var _prodCode=_rzManAcProd(dep,phys);
  form.product=_prodCode; // remember the product so route edits keep the product fuel default
  if(S._rzManFuel&&S._rzManFuel[phys]!=null&&S._rzManFuel[phys]!==''){
    form.fuel=String(toKg(S._rzManFuel[phys],phys));form._fuelUserSet=true; // a hand-set seatmap fuel carries over as a manual override
  }else{
    var _df=_rzManDefFuelKg(dep,phys);form.fuel=String(_df!=null?_df:a.fuelKg); // same default as the seatmap preview (fuel-to-max for mixed)
  }
  var _pbd2=_rzProdBurnDisp(_prodCode,phys);if(_pbd2!=null)form.burnOff=String(_pbd2);
  // Seat the passengers at their manifest seat positions (run/refresh the seat plan first).
  var sm=_rzManSeatsFor(dep,phys);if(!sm||!Object.keys(sm).length)sm=(typeof window.rezdyManReseat==='function')?window.rezdyManReseat(dep,phys):{};
  var seatOf={};Object.keys(sm).forEach(function(idx){seatOf[sm[idx]]=parseInt(idx);});
  var cap=(a.seats?a.seats.length:0)-1,nextFree=(_hasCo?2:1),overflow=0;
  var declMode=_rzManDeclMode(dep,phys); // all-actual or all-declared for this aircraft
  var byId={};(S._rzManPax||[]).forEach(function(x){byId[x.id]=x;});
  list.forEach(function(p){
    var idx=seatOf[p.id];
    if(_hasCo&&idx===1)idx=null; // seat 1 is the co-pilot's
    if(idx==null){while(nextFree<=cap&&(form.names[nextFree]||seatOf['__'+nextFree]))nextFree++;idx=nextFree;}
    if(idx>cap){overflow++;return;}
    form.names[idx]=p.name||'';
    var _wv=_rzPaxWeight(p,declMode);
    form.seats[idx]=(_wv!=null&&_wv!=='')?String(_wv):'';
    form.bags[idx]='';
    if(p.group)form.paxGroups[idx]=p.group;
    if(p.type==='child')form.paxType[idx]='C';
    if(p.paymentReq)form.paxPaymentReq[idx]=true;
    var inf=(S._rzManPax||[]).find(function(x){return x.infantOf===p.id;});
    var infNm=p.infantName||(inf?inf.name:null);
    if(infNm)form.infantNames[idx]=infNm;
  });
  if(overflow&&typeof toast==='function')toast(overflow+' pax over seat capacity — adjust on the loadsheet','warn');
  var mcargo=_rzManCargoFor(dep,phys);form.cargo=form.cargo||{};Object.keys(mcargo).forEach(function(zi){form.cargo[zi]=String(mcargo[zi]);});
  // Open as a new loadsheet tab + persist to the shared list (mirrors duplicateSaved).
  var newId='ls_rz_'+phys.replace('ZK-','')+'_'+Date.now();
  var savedAt=new Date().toISOString();
  form.status='unsigned';
  S.saved=S.saved||[];S.saved.push({id:newId,form:form,status:'unsigned',savedAt:savedAt});
  var acCode=phys.replace('ZK-','');
  S.lsForms=S.lsForms||{};S.lsForms[acCode]=form;S.lsAc=acCode;S.form=form;S.editId=newId;S.formDirty=false;
  S.lsTabs=S.lsTabs||[];S.lsTabs.push({id:newId,acId:phys,form:form,status:'unsigned',savedAt:savedAt,isNew:true});
  // Open INLINE in Operations ▸ Loadsheets (shared strip + editor; no legacy loadsheet route).
  S.activeTabId=newId;S.section='operations';S.tab='rloadsheets';S._rzLsActiveId=newId;
  if(typeof sbU==='function')sbU('ts_loadsheets',[{id:newId,form:form,saved_at:savedAt,status:'unsigned'}]).catch(function(){});
  _rzLsTabAdd(newId,phys,_rzLsTabLabel(phys,form)); // share this open tab with everyone on the date
  try{window.scrollTo(0,0);}catch(_){}
  render();
  if(typeof toast==='function')toast('Loadsheet created for '+acCode+' — review & sign','ok');
};
// Start a fresh BLANK loadsheet for any aircraft (no manifest data) — opens in the editor.
window.rezdyNewBlankLoadsheet=function(acId){
  if(!S.aircraft||!S.aircraft[acId]){if(typeof toast==='function')toast('Aircraft not configured.','warn');return;}
  var form=bF_ac(acId);form.date=S.rezdyDate||form.date;form.status='unsigned';
  var newId='ls_rz_blank_'+acId.replace('ZK-','')+'_'+Date.now();var savedAt=new Date().toISOString();
  S.saved=S.saved||[];S.saved.push({id:newId,form:form,status:'unsigned',savedAt:savedAt});
  var acCode=acId.replace('ZK-','');
  S.lsForms=S.lsForms||{};S.lsForms[acCode]=form;S.lsAc=acCode;S.form=form;S.editId=newId;S.formDirty=false;
  S.lsTabs=S.lsTabs||[];S.lsTabs.push({id:newId,acId:acId,form:form,status:'unsigned',savedAt:savedAt,isNew:true});
  // Open INLINE in Operations ▸ Loadsheets (shared strip + editor; no legacy loadsheet route).
  S.activeTabId=newId;S.section='operations';S.tab='rloadsheets';S._rzLsActiveId=newId;
  if(typeof sbU==='function')sbU('ts_loadsheets',[{id:newId,form:form,saved_at:savedAt,status:'unsigned'}]).catch(function(){});
  _rzLsTabAdd(newId,acId,_rzLsTabLabel(acId,form)); // share this open tab with everyone on the date
  try{window.scrollTo(0,0);}catch(_){}render();
  if(typeof toast==='function')toast('Blank loadsheet started for '+acCode,'ok');
};
// ── Shared "open loadsheet tabs" registry (per date) ──
// All users viewing the same date see the same list of open loadsheet tabs. Stored in
// ts_settings under rz_lstabs_<date>; changes broadcast live (rz_lstabs_update). Whether a tab
// was created from the seatmap, started blank, or opened from Saved, it lands in this list.
function _rzLsTabsKey(){return 'rz_lstabs_'+S.rezdyDate;}
window.rezdyLoadLsTabs=function(){
  S._rzLsTabsLoaded=true;
  try{fetch(SB+'/rest/v1/ts_settings?key=eq.'+encodeURIComponent(_rzLsTabsKey())+'&select=value',{headers:SH}).then(function(r){return r.ok?r.json():[];}).then(function(rows){
    var v=rows&&rows[0]&&rows[0].value;if(typeof v==='string'){try{v=JSON.parse(v);}catch(e){v=null;}}
    S._rzLsTabs=Array.isArray(v)?v:[];if(typeof safeRender==='function')safeRender();
  }).catch(function(){S._rzLsTabs=S._rzLsTabs||[];});}catch(e){S._rzLsTabs=S._rzLsTabs||[];}
};
function _rzLsTabsBroadcast(){
  try{if(typeof _rtWs==='undefined'||!_rtWs||_rtWs.readyState!==1)return;if(typeof _rtRef!=='undefined')_rtRef++;
    _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'rz_lstabs_update',payload:{date:S.rezdyDate,sessionId:(typeof _sessionId!=='undefined'?_sessionId:'')}},ref:String(typeof _rtRef!=='undefined'?_rtRef:1)}));
  }catch(e){}
}
function _rzLsTabsSave(){
  if(typeof sbU==='function')sbU('ts_settings',[{key:_rzLsTabsKey(),value:JSON.stringify(S._rzLsTabs||[])}]).catch(function(){});
  _rzLsTabsBroadcast();
}
window.rezdyReloadLsTabsLive=function(){if(S.rezdyDate)window.rezdyLoadLsTabs();};
function _rzLsTabAdd(id,ac,label){
  S._rzLsTabs=S._rzLsTabs||[];
  if(S._rzLsTabs.some(function(t){return t.id===id;}))return;
  S._rzLsTabs.push({id:id,ac:ac||'',label:label||'',by:(S.user&&S.user.name)||'',at:new Date().toISOString()});
  _rzLsTabsSave();
}
// The actual close — drops the open tab everywhere (the saved loadsheet stays unless deleted).
window.rezdyCloseLsTab=function(id){
  S._rzCloseLs=null;
  S._rzLsTabs=(S._rzLsTabs||[]).filter(function(t){return t.id!==id;});
  S.lsTabs=(S.lsTabs||[]).filter(function(t){return t.id!==id;}); // drop the editor tab too
  if(S._rzLsActiveId===id){S._rzLsActiveId=null;S.activeTabId=null;S.editId=null;S.form=null;} // closing the open one returns to the list
  _rzLsTabsSave();render();
};
// Closing a loadsheet opens a choice: Save & close, Close (keep as saved), or Delete (to Bin).
window.rezdyLsClosePrompt=function(id){S._rzCloseLs=id;render();};
window.rezdyLsCloseCancel=function(){S._rzCloseLs=null;render();};
window.rezdyLsCloseSave=function(id){
  var s=(S.saved||[]).find(function(x){return x.id===id;});
  if(S._rzLsActiveId===id&&S.form&&s){s.form=S.form;s.savedAt=new Date().toISOString();} // capture live edits
  if(s){
    if(typeof lsSet==='function')lsSet('ts_loadsheets_cache',S.saved);
    if(typeof sbU==='function')sbU('ts_loadsheets',[{id:s.id,form:s.form,saved_at:s.savedAt||new Date().toISOString(),status:s.status||'unsigned'}]).catch(function(){});
  }
  if(typeof toast==='function')toast('Loadsheet saved','ok');
  window.rezdyCloseLsTab(id);
};
window.rezdyLsCloseDelete=function(id){
  var s=(S.saved||[]).find(function(x){return x.id===id;});
  if(s){ // soft-delete to the Bin (recoverable), matching the app's delete model
    s.form=s.form||{};s.form._prevStatus=s.status;s.status='deleted';
    if(typeof lsSet==='function')lsSet('ts_loadsheets_cache',S.saved);
    if(typeof sbU==='function')sbU('ts_loadsheets',[{id:s.id,form:s.form,saved_at:s.savedAt,status:'deleted'}]).catch(function(){});
  }
  if(typeof toast==='function')toast('Loadsheet moved to Bin','warn');
  window.rezdyCloseLsTab(id);
};
function _rzCloseLsModal(){
  var id=S._rzCloseLs;var s=(S.saved||[]).find(function(x){return x.id===id;});
  var ac=s&&s.form&&s.form.ac?s.form.ac.replace('ZK-',''):'';var idE=_rzEsc(id);
  return '<div onclick="window.rezdyLsCloseCancel()" style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:18px">'+
    '<div onclick="event.stopPropagation()" style="background:var(--card);border:1px solid var(--border);border-radius:14px;max-width:380px;width:100%;padding:18px 18px 14px;box-shadow:0 20px 60px rgba(0,0,0,.5)">'+
      '<div style="font-size:15px;font-weight:800;color:var(--text);margin-bottom:4px">Close loadsheet'+(ac?' · '+_rzEsc(ac):'')+'?</div>'+
      '<div style="font-size:12px;color:var(--text3);margin-bottom:14px">Save your changes, just close the tab (it stays in Saved), or delete the loadsheet.</div>'+
      '<div style="display:flex;flex-direction:column;gap:8px">'+
        '<button onclick="window.rezdyLsCloseSave(\''+idE+'\')" style="padding:11px;border-radius:9px;border:none;background:var(--accent);color:#fff;font-size:13px;font-weight:800;cursor:pointer">💾 Save &amp; close</button>'+
        '<button onclick="window.rezdyCloseLsTab(\''+idE+'\')" style="padding:11px;border-radius:9px;border:1px solid var(--border2);background:var(--card2);color:var(--text);font-size:13px;font-weight:700;cursor:pointer">Close (keep saved)</button>'+
        '<button onclick="if(confirm(\'Delete this loadsheet? It moves to the Bin and can be restored.\'))window.rezdyLsCloseDelete(\''+idE+'\')" style="padding:11px;border-radius:9px;border:1px solid var(--err-border);background:transparent;color:var(--err-text);font-size:13px;font-weight:700;cursor:pointer">🗑 Delete loadsheet</button>'+
        '<button onclick="window.rezdyLsCloseCancel()" style="padding:9px;border-radius:9px;border:none;background:transparent;color:var(--text3);font-size:12px;font-weight:700;cursor:pointer">Cancel</button>'+
      '</div>'+
    '</div></div>';
}
// Point S.form/S.lsTabs at a loadsheet id WITHOUT touching S.tab (so we stay on the Operations
// Loadsheets tab, not the legacy loadsheet route). The decoupled post-render hook still wires the
// signature pad because S._rzLsActiveId is set.
function _rzActivateLs(id){
  var existing=(S.lsTabs||[]).find(function(t){return t.id===id;});
  if(!existing){
    var s=(S.saved||[]).find(function(x){return x.id===id;});
    if(s){var f=(typeof dc==='function')?dc(s.form):JSON.parse(JSON.stringify(s.form));if(!f.cargo)f.cargo={};S.lsTabs=S.lsTabs||[];S.lsTabs.push({id:s.id,acId:f.ac||'ZK-SLA',form:f,status:s.status||'unsigned',savedAt:s.savedAt,isNew:false});existing=S.lsTabs[S.lsTabs.length-1];}
  }
  if(existing){S.activeTabId=id;S.form=existing.form;S.lsAc=(existing.acId||'').replace('ZK-','');S.editId=id;S._newLsTab=false;}
}
// Open a loadsheet by id into the inline editor (Operations ▸ Loadsheets), fetching it from the
// cloud first if this device hasn't cached it yet (e.g. another user created it).
window.rezdyOpenLsTab=function(id){
  S._rzLsActiveId=id;S.section='operations';S.tab='rloadsheets';
  var s=(S.saved||[]).find(function(x){return x.id===id;});
  if(s){_rzLsTabAdd(id,(s.form&&s.form.ac)||'',_rzLsTabLabel((s.form&&s.form.ac)||'',s.form));_rzActivateLs(id);render();return;}
  try{fetch(SB+'/rest/v1/ts_loadsheets?id=eq.'+encodeURIComponent(id)+'&select=*',{headers:SH}).then(function(r){return r.ok?r.json():[];}).then(function(rows){
    var row=rows&&rows[0];
    if(row&&row.form){S.saved=S.saved||[];S.saved.push({id:row.id,form:row.form,status:row.status||'unsigned',savedAt:row.saved_at});_rzLsTabAdd(id,row.form.ac||'',_rzLsTabLabel(row.form.ac||'',row.form));_rzActivateLs(id);render();}
    else if(typeof toast==='function')toast('Loadsheet not found','warn');
  }).catch(function(){if(typeof toast==='function')toast('Could not open loadsheet','err');});}catch(e){}
};
// Build a friendly label for a loadsheet tab.
function _rzLsTabLabel(ac,form){var et=(form&&form.etd)?(' · '+_rzEsc(form.etd)):'';return String(ac||'').replace('ZK-','')+et;}
// ── Rezdy Loadsheets sub-tab — ONE shared per-date tab strip; the editor renders inline below ──
// No second tab bar, no jump to the legacy Operations editor. The list of open tabs is shared
// across everyone on the date; which tab you have open is your own.
function _rzRenderLoadsheets(){
  if(!S._rzManLoaded){if(window.rezdyLoadManifest)window.rezdyLoadManifest();return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading…</div>';}
  if(!S._rzLsTabsLoaded&&window.rezdyLoadLsTabs)window.rezdyLoadLsTabs(); // shared open-tabs registry
  var fleet=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(id){return S.aircraft&&S.aircraft[id];});
  var tabs=(S._rzLsTabs||[]).slice().sort(function(a,b){return String(a.label||'').localeCompare(String(b.label||''));});
  var activeId=S._rzLsActiveId;
  var activeOpen=!!(activeId&&S.form&&S.activeTabId===activeId&&(S.lsTabs||[]).some(function(t){return t.id===activeId;}));
  // ── Shared tab strip (chips) — always on top ──
  var h='<div class="card" style="padding:9px 11px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px">'+
      '<div style="font-size:13px;font-weight:800;color:var(--text1)">Loadsheets · '+_rzEsc(_rzDowLabel(S.rezdyDate))+'</div>'+
      '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap"><span style="font-size:10px;color:var(--text3);font-weight:700">+ blank:</span>'+
        fleet.map(function(id){var c=_rzAcCol(id);return '<button onclick="window.rezdyNewBlankLoadsheet(\''+id.replace(/'/g,"\\'")+'\')" style="font-size:11px;font-weight:800;padding:3px 9px;border-radius:13px;border:1px solid '+c+';background:transparent;color:'+c+';cursor:pointer">'+id.replace('ZK-','')+'</button>';}).join('')+
      '</div>'+
    '</div>'+
    '<div style="display:flex;gap:6px;overflow-x:auto;align-items:center;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:2px">'+
      '<button onclick="S._rzLsActiveId=null;render()" class="sub-tab '+(!activeId?'on':'')+'" style="white-space:nowrap;flex-shrink:0">📋 List ('+tabs.length+')</button>';
  tabs.forEach(function(t){
    var s=(S.saved||[]).find(function(x){return x.id===t.id;});
    var signed=s&&(s.status==='complete'||s.status==='signed'||(s.form&&s.form.sig));
    var ac=(s&&s.form&&s.form.ac)||t.ac||'';var col=_rzAcCol(ac);var etd=(s&&s.form&&s.form.etd)||'';
    var on=activeId===t.id;var idE=String(t.id).replace(/'/g,"\\'");
    h+='<div style="display:inline-flex;align-items:stretch;border-radius:13px;overflow:hidden;border:1.5px solid '+(on?col:col+'55')+';flex-shrink:0">'+
      '<button onclick="window.rezdyOpenLsTab(\''+idE+'\')" style="padding:4px 10px;font-size:11px;font-weight:800;background:'+(on?col+'55':col+'18')+';border:none;cursor:pointer;color:'+(on?'#fff':col)+';white-space:nowrap">'+(signed?'✅ ':'')+_rzEsc(String(ac).replace('ZK-',''))+(etd?' '+_rzEsc(etd):'')+'</button>'+
      '<button onclick="window.rezdyLsClosePrompt(\''+idE+'\')" title="Close…" style="padding:4px 7px;font-size:12px;line-height:1;background:'+(on?col+'33':col+'0f')+';border:none;border-left:1px solid '+(on?col:col+'44')+';cursor:pointer;color:'+(on?'#fff':col+'cc')+'">✕</button>'+
    '</div>';
  });
  h+='</div></div>';
  // ── Active loadsheet → render the real editor inline ──
  if(activeOpen){
    var _ed='';try{_ed=renderLoadsheet();}catch(e){_ed='<div class="card" style="color:var(--err-text)">Loadsheet error: '+_rzEsc(e.message)+'</div>';}
    return h+'<div id="flash-loadsheet">'+_ed+'</div>';
  }
  // ── List mode (no active tab) ──
  if(!tabs.length){
    h+='<div class="card" style="text-align:center;padding:22px;color:var(--text3);font-size:13px">No open loadsheets for this day yet.<br>Create one from the <b>Seatmap</b>, start a blank above, or open a saved one below.</div>';
  }else{
    h+='<div class="card"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800;margin-bottom:8px">Open tabs ('+tabs.length+')</div>';
    tabs.forEach(function(t){
      var s=(S.saved||[]).find(function(x){return x.id===t.id;});
      var signed=s&&(s.status==='complete'||s.status==='signed'||(s.form&&s.form.sig));
      var ac=(s&&s.form&&s.form.ac)||t.ac||'';var col=_rzAcCol(ac);var etd=(s&&s.form&&s.form.etd)||'';var idE=String(t.id).replace(/'/g,"\\'");
      h+='<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid var(--border2);border-left:4px solid '+col+';border-radius:9px;margin-bottom:7px">'+
        '<span style="font-size:14px">'+(signed?'✅':'📋')+'</span>'+
        '<div style="flex:1;min-width:0;cursor:pointer" onclick="window.rezdyOpenLsTab(\''+idE+'\')">'+
          '<div style="font-size:14px;font-weight:800;color:'+col+'">'+_rzEsc(String(ac).replace('ZK-',''))+(etd?' <span style="font-size:11px;color:var(--text3);font-weight:600">· ETD '+_rzEsc(etd)+'</span>':'')+'</div>'+
          '<div style="font-size:10px;color:var(--text3)">'+(signed?'Signed':'Unsigned')+(t.by?' · started by '+_rzEsc(String(t.by).split(/\s+/)[0]):'')+'</div>'+
        '</div>'+
        '<button class="btn btn-ghost" style="font-size:11px;padding:5px 10px" onclick="window.rezdyOpenLsTab(\''+idE+'\')">Open</button>'+
        '<button onclick="window.rezdyLsClosePrompt(\''+idE+'\')" title="Close…" style="background:none;border:none;color:var(--text3);font-size:14px;cursor:pointer;padding:0 2px">✕</button>'+
      '</div>';
    });
    h+='</div>';
  }
  // Saved loadsheets for this date that aren't currently open.
  var openIds={};(S._rzLsTabs||[]).forEach(function(t){openIds[t.id]=1;});
  var savedToday=(S.saved||[]).filter(function(s){return s.form&&s.form.date===S.rezdyDate&&s.status!=='deleted'&&!openIds[s.id];});
  if(savedToday.length){
    h+='<div class="card"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800;margin-bottom:8px">Saved this day — tap to open into the shared tabs</div>';
    savedToday.forEach(function(s){
      var signed=s.status==='complete'||s.status==='signed'||(s.form&&s.form.sig);
      var ac=(s.form&&s.form.ac)||'';var col=_rzAcCol(ac);var etd=(s.form&&s.form.etd)||'';var idE=String(s.id).replace(/'/g,"\\'");
      h+='<button class="btn btn-ghost" style="width:100%;text-align:left;font-size:12px;margin-bottom:5px;border-left:3px solid '+col+'" onclick="window.rezdyOpenLsTab(\''+idE+'\')">'+(signed?'✅ ':'○ ')+_rzEsc(String(ac).replace('ZK-',''))+(etd?' · ETD '+_rzEsc(etd):'')+'</button>';
    });
    h+='</div>';
  }
  return h;
}

// ─────────────────────────────────────────────────────────────────────────────
//  (3) SCHEDULE — Google-Calendar-like day view
// ─────────────────────────────────────────────────────────────────────────────
// Column-per-aircraft day grid. 06:00–18:00 in 15-minute rows.
const _RZ_SCH_START=6, _RZ_SCH_END=18;
const _RZ_SLOT_MIN=15;                 // minutes per grid row
const _RZ_PX_PER_SLOT=15;              // height of one 15-min row
const _RZ_PX_PER_MIN=_RZ_PX_PER_SLOT/_RZ_SLOT_MIN;
const _RZ_AXIS_W=50;                   // left time-axis width
const _RZ_COL_W=150;                   // each aircraft column width
function _rzMinsFromHHMM(s){const m=/^(\d{1,2}):(\d{2})$/.exec(s||'');if(!m)return null;return (+m[1])*60+(+m[2]);}
function _rzSchTop(start){const mins=_rzMinsFromHHMM(start);if(mins==null)return 0;return Math.max(0,(mins-_RZ_SCH_START*60)*_RZ_PX_PER_MIN);}
function _rzSchHeight(start,end){const a=_rzMinsFromHHMM(start),b=_rzMinsFromHHMM(end);if(a==null||b==null||b<=a)return _RZ_PX_PER_SLOT*2;return (b-a)*_RZ_PX_PER_MIN;}

function _rzRenderSchedule(){
  if(S._schedLoading)return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading schedule…</div>';
  if(!S._schedBlocks){
    if(!S._schedLoading&&window.rezdyLoadSchedule)window.rezdyLoadSchedule();
    return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading calendar…</div>';
  }
  const blocks=S._schedBlocks||[];
  // Booking-derived blocks: all bookings sharing an aircraft / departure / product are STACKED
  // into ONE block (e.g. "SLB · 13A · FCF"). Click it to see the bookings + passengers inside.
  const bkGroups={};
  (S._rezdyBookings||[]).forEach(function(b){
    if(/cancel/i.test(b.status||''))return;
    var ac=_rzBookingAc(b,String(b.orderNumber||''))||'__unalloc__';
    var bal=parseFloat(b.balanceDue);var owing=isFinite(bal)&&bal>0;
    ((b.items)||[]).forEach(function(it){
      var t=_rzDepTime(it.startTimeLocal||'');if(!t)return;
      var start=_rzHHMMcolon(t);if(_rzMinsFromHHMM(start)==null)return;
      var prod=_rzProduct(it.product);
      var key=ac+'|'+start+'|'+prod;
      var g=bkGroups[key]||(bkGroups[key]={aircraft:ac,start:start,product:prod,pax:0,bookings:[],owing:false,key:key,_fromBooking:true,_fb:[]});
      g.pax+=parseInt(it.quantity,10)||0;g.bookings.push({b:b,it:it});if(owing)g.owing=true;
    });
  });
  // Fold attached flyback/CCF bookings (dragged onto a flight) into their target block.
  var _attach=S._rzSchedAttach||{};
  Object.keys(bkGroups).forEach(function(k){var g=bkGroups[k];
    for(var i=g.bookings.length-1;i>=0;i--){
      var bk=g.bookings[i];var ord=String(bk.b.orderNumber||'');var tgt=_attach[ord];
      if(tgt&&tgt!==k&&bkGroups[tgt]){bkGroups[tgt]._fb.push(bk);g.bookings.splice(i,1);g.pax-=parseInt(bk.it.quantity,10)||0;if(bk.b._owing){}}
    }
  });
  Object.keys(bkGroups).forEach(function(k){if(!bkGroups[k].bookings.length)delete bkGroups[k];});
  const bkBlocks=Object.keys(bkGroups).map(function(k){
    var g=bkGroups[k];var sm=_rzMinsFromHHMM(g.start)||0;var em=sm+_rzProductDuration(g.product);
    g.end=String(Math.floor(em/60)).padStart(2,'0')+':'+String(em%60).padStart(2,'0');
    var acLbl=g.aircraft==='__unalloc__'?'?':g.aircraft.replace(/^ZK-?/,'');
    var gbd={a:0,c:0,i:0};g.bookings.forEach(function(bk){var e=_rzEffBreakdown(bk.b);gbd.a+=e.a;gbd.c+=e.c;gbd.i+=e.i;});
    var pilot=(S._schedPilots||{})[g.key]||null;
    g.bd=gbd;g.pilot=pilot;
    var fbStr='';(g._fb||[]).forEach(function(bk){var e=_rzEffBreakdown(bk.b);var code=_rzProduct((bk.it&&bk.it.product)||'');fbStr+=' + '+_rzBdCompact(e)+' '+code;});
    g.label=(pilot?pilot+'/':'')+acLbl+' '+_rzBdCompact(gbd)+' '+g.product+fbStr;g.order=g.key;g._owing=g.owing;
    return g;
  });
  const _totBk=bkBlocks.reduce(function(s,g){return s+g.bookings.length;},0);
  const hdr='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:0">Calendar</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+_rzDowLabel(S.rezdyDate)+' · '+_totBk+' booking'+(_totBk===1?'':'s')+(blocks.length?' · '+blocks.length+' manual block'+(blocks.length===1?'':'s'):'')+'</p></div>'+
    '<button class="btn btn-ghost" style="font-size:12px" onclick="window.schedNewBlock()">+ Add block</button></div>';
  // Click-through detail for a stacked block: every booking in the group + a link back to it.
  let detailH='';
  if(S._schedGroupKey){
    var _grp=bkBlocks.find(function(x){return x.key===S._schedGroupKey;});
    if(_grp){
      var _gac=_grp.aircraft==='__unalloc__'?null:_grp.aircraft;
      var _gcol=_gac?_rzAcCol(_gac):'#94a3b8';
      detailH='<div class="card" style="border-left:4px solid '+_gcol+'">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px">'+
          '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">'+
            '<span class="pill" style="background:'+_gcol+'22;border:1px solid '+_gcol+';color:'+_gcol+';font-size:12px;font-weight:800;padding:2px 10px;border-radius:12px">'+_rzEsc(_gac||'Unallocated')+'</span>'+
            '<span style="font-size:14px;font-weight:800;color:var(--text1)">🛫 '+_rzEsc(_grp.start)+' · '+_grp.pax+'A · '+_rzEsc(_grp.product)+'</span>'+
            (_grp.pilot?'<span class="pill" style="background:rgba(96,165,250,.15);border:1px solid rgba(96,165,250,.5);color:#60a5fa;font-size:11px;font-weight:800;padding:2px 8px;border-radius:12px">✈ '+_rzEsc(_grp.pilot)+' <span onclick="event.stopPropagation();window.rezdySchedClearPilot(\''+_rzEsc(_grp.key).replace(/'/g,"\\'")+'\')" title="Remove pilot" style="cursor:pointer;opacity:.7;margin-left:2px">✕</span></span>':'')+
          '</div>'+
          '<button class="btn btn-ghost" style="font-size:12px" onclick="S._schedGroupKey=null;render()">✕ Close</button></div>';
      _grp.bookings.forEach(function(bk){
        var b=bk.b;var bal=parseFloat(b.balanceDue);var owing=isFinite(bal)&&bal>0;
        detailH+='<div style="border-top:1px solid var(--border2);padding-top:8px;margin-top:8px">'+
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
            '<div style="font-weight:700;font-size:13px;color:var(--text1)">'+_rzEsc(b.customerName||b.orderNumber)+(owing?' <span style="color:#ef4444;font-weight:800">$ TO PAY</span>':'')+'</div>'+
            '<button class="btn btn-ghost" style="font-size:11px;padding:3px 9px" onclick="window.rezdyGotoBooking(\''+_rzEsc(String(b.orderNumber||'')).replace(/'/g,"\\'")+'\')">View booking →</button>'+
          '</div>'+
          _rzPaxBubbles(b,{drag:true})+
        '</div>';
      });
      detailH+='</div>';
    }
  }

  // inline add/edit form
  let formH='';
  if(S._schedEdit){
    const ed=S._schedEdit;
    const acIds=Object.keys((typeof S!=='undefined'&&S.aircraft)||{});
    formH='<div class="card"><div class="st">'+(ed.id?'Edit block':'New block')+'</div><div class="g2" style="margin-bottom:10px">'+
      '<div><label>Aircraft</label><select class="fi" onchange="window.schedEditField(\'aircraft\',this.value)">'+
        '<option value="">— select —</option>'+
        acIds.map(function(a){return '<option value="'+_rzEsc(a)+'"'+(ed.aircraft===a?' selected':'')+'>'+_rzEsc(a)+'</option>';}).join('')+
      '</select></div>'+
      '<div><label>Label</label><input class="fi" type="text" value="'+_rzEsc(ed.label)+'" onblur="window.schedEditField(\'label\',this.value)" placeholder="e.g. Milford scenic"></div>'+
    '</div><div class="g3" style="margin-bottom:10px">'+
      '<div><label>Start (HH:MM)</label><input class="fi" type="time" value="'+_rzEsc(ed.start)+'" onchange="window.schedEditField(\'start\',this.value)"></div>'+
      '<div><label>End (HH:MM)</label><input class="fi" type="time" value="'+_rzEsc(ed.end)+'" onchange="window.schedEditField(\'end\',this.value)"></div>'+
      '<div><label>Colour</label><input class="fi" type="color" value="'+_rzEsc(ed.color||_rzAcCol(ed.aircraft))+'" onchange="window.schedEditField(\'color\',this.value)" style="height:38px;padding:3px"></div>'+
    '</div>'+
    '<div style="margin-bottom:10px"><label>Notes</label><input class="fi" type="text" value="'+_rzEsc(ed.notes)+'" onblur="window.schedEditField(\'notes\',this.value)"></div>'+
    '<div style="display:flex;gap:8px">'+
      '<button class="btn btn-ghost" style="font-size:12px;border-color:rgba(74,222,128,.5);color:#4ade80" onclick="window.schedSaveBlock()">💾 Save</button>'+
      (ed.id?'<button class="btn btn-ghost" style="font-size:12px;color:#ef4444;border-color:rgba(239,68,68,.4)" onclick="window.schedDeleteBlock()">🗑 Delete</button>':'')+
      '<button class="btn btn-ghost" style="font-size:12px" onclick="S._schedEdit=null;render()">Cancel</button>'+
    '</div></div>';
  }

  // Columns: one per aircraft. Include any aircraft that has a block but isn't in S.aircraft.
  let acIds=Object.keys((S&&S.aircraft)||{});
  blocks.forEach(function(b){if(b.aircraft&&acIds.indexOf(b.aircraft)<0)acIds.push(b.aircraft);});
  bkBlocks.forEach(function(b){if(b.aircraft&&b.aircraft!=='__unalloc__'&&acIds.indexOf(b.aircraft)<0)acIds.push(b.aircraft);});
  if(bkBlocks.some(function(b){return b.aircraft==='__unalloc__';}))acIds.push('__unalloc__');
  if(!acIds.length){
    return hdr+formH+'<div class="card" style="text-align:center;padding:36px;color:var(--text3);font-size:13px">No aircraft configured.</div>';
  }

  const slots=((_RZ_SCH_END-_RZ_SCH_START)*60)/_RZ_SLOT_MIN; // 48
  const gridH=slots*_RZ_PX_PER_SLOT;

  // left time axis (rows + labels every 30 min, lighter ticks for the in-between 15s)
  let axis='<div style="position:relative;width:'+_RZ_AXIS_W+'px;flex-shrink:0;height:'+gridH+'px;border-right:1px solid var(--border)">';
  for(let i=0;i<=slots;i++){
    const top=i*_RZ_PX_PER_SLOT;
    const mins=_RZ_SCH_START*60+i*_RZ_SLOT_MIN;
    const onHour=(mins%60===0);
    const onHalf=(mins%30===0);
    axis+='<div style="position:absolute;top:'+top+'px;left:0;right:0;height:1px;background:'+(onHour?'var(--border)':'var(--border2)')+';opacity:'+(onHour?1:.5)+'"></div>';
    if(onHalf&&i<slots){
      const hh=String(Math.floor(mins/60)).padStart(2,'0'),mm=String(mins%60).padStart(2,'0');
      axis+='<div style="position:absolute;top:'+(top-1)+'px;left:0;right:6px;text-align:right;font-size:'+(onHour?'11':'10')+'px;color:var(--text'+(onHour?'3':'3')+');font-weight:'+(onHour?'700':'400')+';opacity:'+(onHour?1:.7)+'">'+hh+':'+mm+'</div>';
    }
  }
  axis+='</div>';

  // one column per aircraft
  let colsH='';
  acIds.forEach(function(ac){
    const acCol=_rzAcCol(ac);
    // background row lines
    let rows='';
    for(let i=0;i<=slots;i++){
      const top=i*_RZ_PX_PER_SLOT;
      const mins=_RZ_SCH_START*60+i*_RZ_SLOT_MIN;
      const onHour=(mins%60===0);
      rows+='<div style="position:absolute;top:'+top+'px;left:0;right:0;height:1px;background:'+(onHour?'var(--border)':'var(--border2)')+';opacity:'+(onHour?.8:.35)+'"></div>';
    }
    // Booking blocks (from Rezdy) + manual blocks for this aircraft, cascaded when overlapping.
    let blocksH='';
    const _acBlocks=blocks.filter(function(b){return b.aircraft===ac;}).concat(bkBlocks.filter(function(b){return b.aircraft===ac;}));
    const _bkey=function(b){return String(b.id||b.order||'');};
    _acBlocks.forEach(function(b){
      const s=_rzMinsFromHHMM(b.start)||0,e=_rzMinsFromHHMM(b.end)||(s+30);
      const ov=_acBlocks.filter(function(o){const os=_rzMinsFromHHMM(o.start)||0,oe=_rzMinsFromHHMM(o.end)||(os+30);return s<oe&&os<e;});
      b._cols=Math.max(1,ov.length);
      b._idx=ov.filter(function(o){const os=_rzMinsFromHHMM(o.start)||0;return os<s||(os===s&&_bkey(o)<_bkey(b));}).length;
    });
    _acBlocks.forEach(function(b){
      const isBk=!!b._fromBooking;
      const col=b.color||(ac==='__unalloc__'?'#94a3b8':acCol);
      const top=_rzSchTop(b.start);const ht=Math.max(_RZ_PX_PER_SLOT,_rzSchHeight(b.start,b.end));
      const compact=ht<30;
      // Overlapping blocks cascade with a slight horizontal offset (not split) so each stays
      // wide/readable and the ones beneath still peek out on the left; click brings one forward.
      const n=Math.max(1,b._cols||1),idx=b._idx||0,OFF=15;
      const sel=isBk&&String(S._schedGroupKey||'')===String(b.order);
      const _pos='left:'+(2+idx*OFF)+'px;width:calc(100% - '+((n-1)*OFF+4)+'px);z-index:'+(sel?50:idx+1)+';'+(n>1?'box-shadow:-3px 1px 7px rgba(0,0,0,.3);':'');
      const _click=isBk?('window.rezdySchedShowGroup(\''+_rzEsc(b.order).replace(/'/g,"\\'")+'\')'):('window.schedEditBlock(\''+_rzEsc(b.id).replace(/'/g,"\\'")+'\')');
      const _dropKey=(isBk?b.order:b.id);
      // Unallocated booking blocks can be dragged onto a flight to combine (flyback/CCF).
      const _drag=(isBk&&ac==='__unalloc__')?(' draggable="true" ondragstart="window.rezdySchedBlockDragStart(\''+_rzEsc(String(b.order)).replace(/'/g,"\\'")+'\',event)"'):'';
      blocksH+='<div'+_drag+' onclick="'+_click+'" ondragover="event.preventDefault()" ondrop="window.rezdySchedDropPilot(\''+_rzEsc(String(_dropKey)).replace(/'/g,"\\'")+'\',event)" '+
        'style="position:absolute;'+_pos+'top:'+top+'px;height:'+ht+'px;background:'+col+(isBk?'22':'26')+';border:1px '+(isBk?'dashed':'solid')+' '+col+';border-left:3px solid '+col+';border-radius:6px;padding:'+(compact?'1px 5px':'3px 6px')+';cursor:pointer;overflow:hidden;box-sizing:border-box;line-height:1.25'+(sel?';outline:2px solid '+col+';outline-offset:1px':'')+'">'+
        '<div style="font-weight:700;font-size:11px;color:'+col+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(isBk&&b._owing?'<span style="color:#ef4444;font-weight:900">$ </span>':'')+(isBk?'📋 ':'')+_rzEsc(b.label||b.aircraft)+'</div>'+
        (compact?'':'<div style="font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_rzEsc(b.start)+(isBk?'':'–'+_rzEsc(b.end))+(b.notes?(' · '+_rzEsc(b.notes)):'')+'</div>')+
        '</div>';
    });
    colsH+='<div style="width:'+_RZ_COL_W+'px;flex-shrink:0;border-right:1px solid var(--border)">'+
      '<div style="position:relative;height:'+gridH+'px">'+rows+blocksH+'</div></div>';
  });

  // sticky aircraft-id header row, aligned with columns
  let headH='<div style="display:flex;position:sticky;top:0;z-index:2;background:var(--card)">'+
    '<div style="width:'+_RZ_AXIS_W+'px;flex-shrink:0;border-right:1px solid var(--border);border-bottom:1px solid var(--border)"></div>';
  acIds.forEach(function(ac){
    const acCol=ac==='__unalloc__'?'#94a3b8':_rzAcCol(ac);
    const lbl=ac==='__unalloc__'?'Unallocated':ac;
    headH+='<div style="width:'+_RZ_COL_W+'px;flex-shrink:0;border-right:1px solid var(--border);border-bottom:2px solid '+acCol+';padding:6px 8px;text-align:center;font-weight:800;font-size:12px;color:'+acCol+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_rzEsc(lbl)+'</div>';
  });
  headH+='</div>';

  // Red "now" line — slides down the grid as the day passes (today only).
  var nowLine='';
  if(S.rezdyDate===_rzToday()){
    var _n=new Date();var _nm=_n.getHours()*60+_n.getMinutes();
    if(_nm>=_RZ_SCH_START*60&&_nm<=_RZ_SCH_END*60){
      var _ny=(_nm-_RZ_SCH_START*60)*_RZ_PX_PER_MIN;
      nowLine='<div style="position:absolute;left:0;right:0;top:'+_ny+'px;height:2px;background:#ef4444;z-index:60;pointer-events:none"><div style="position:absolute;left:2px;top:-4px;width:8px;height:8px;border-radius:50%;background:#ef4444"></div><div style="position:absolute;right:4px;top:-9px;font-size:9px;font-weight:800;color:#ef4444">'+String(_n.getHours()).padStart(2,'0')+':'+String(_n.getMinutes()).padStart(2,'0')+'</div></div>';
    }
    if(!S._rzNowTimer)S._rzNowTimer=setInterval(function(){if(S.rezdyTab==='schedule'&&typeof safeRender==='function')safeRender();},60000);
  }
  const grid='<div class="card" style="padding:0;overflow-x:auto"><div style="display:inline-block;min-width:100%">'+
    headH+
    '<div style="display:flex;position:relative">'+axis+colsH+nowLine+'</div>'+
    '</div></div>';
  // Available pilots — drag a code bubble onto a flight block to allocate.
  var _pilots=_rzAvailablePilots();
  var pilotsBar='<div class="card" style="padding:10px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:700;margin-bottom:8px">Pilots <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text3)">(drag onto a flight)</span></div>';
  if(!_pilots.length){pilotsBar+='<div style="font-size:12px;color:var(--text3)">No aircraft-approved pilots found.</div>';}
  else{
    pilotsBar+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
    _pilots.forEach(function(p){var off=!p.rostered;pilotsBar+='<div draggable="true" ondragstart="window.rezdySchedPilotDragStart(\''+_rzEsc(p.code).replace(/'/g,"\\'")+'\',event)" title="'+_rzEsc(p.name)+(off?' (not rostered on today)':'')+' — drag onto a flight block" style="display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:16px;background:rgba(96,165,250,'+(off?'.06':'.14')+');border:1px solid rgba(96,165,250,'+(off?'.28':'.5')+');cursor:grab;font-size:12px;font-weight:800;color:#60a5fa;opacity:'+(off?'.55':'1')+'">✈ '+_rzEsc(p.code)+(off?' <span style="font-size:8px;opacity:.8;font-weight:700">off</span>':'')+'</div>';});
    pilotsBar+='</div>';
  }
  pilotsBar+='</div>';
  return hdr+pilotsBar+detailH+formH+grid;
}
// Open a booking's passenger detail straight from its calendar block.
window.rezdySchedShowGroup=function(key){S._schedGroupKey=key;S._schedEdit=null;render();};
// Jump from a calendar block's passenger detail straight to that booking in the Bookings tab.
window.rezdyGotoBooking=function(order){S.rezdyTab='bookings';S._rezdyOpen=S._rezdyOpen||{};if(order)S._rezdyOpen[order]=true;S._schedGroupKey=null;render();};

window.rezdyLoadSchedule=async function(){
  S._schedLoading=true;safeRender();
  const rows=await sbF('ts_schedule','&block_date=eq.'+encodeURIComponent(S.rezdyDate));
  S._schedBlocks=(rows||[]).map(function(r){const d=_rzRow(r);d.id=r.id||d.id;return d;}).filter(function(b){return b&&b.start;});
  S._schedLoading=false;
  // The Calendar shows booking-derived blocks too, so make sure the day's bookings are loaded.
  if(!S._rezdyBookings){
    const brows=await sbF('ts_rezdy_bookings','&tour_date=eq.'+encodeURIComponent(S.rezdyDate));
    S._rezdyBookings=_rzMapBookings(brows);_rzApplyManualBk();
  }
  // Pull the saved pickup-list row (pilots / pax meta live there) so pilot allocation persists.
  if(window.rezdyLoadPickups)window.rezdyLoadPickups();
  render();
};

// Live calendar: tell other devices the schedule for this date changed.
function _rzSchedBroadcast(){
  try{
    if(typeof _rtWs==='undefined'||!_rtWs||_rtWs.readyState!==1)return;
    if(typeof _rtRef!=='undefined')_rtRef++;
    _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'rz_sched_update',payload:{date:S.rezdyDate,sessionId:(typeof _sessionId!=='undefined'?_sessionId:'')}},ref:String(typeof _rtRef!=='undefined'?_rtRef:1)}));
  }catch(e){}
}
window.rezdyReloadScheduleLive=function(){if(S.rezdyDate&&window.rezdyLoadSchedule)window.rezdyLoadSchedule();};
window.schedNewBlock=function(){
  const acIds=Object.keys((S&&S.aircraft)||{});
  const ac=acIds[0]||'';
  S._schedEdit={id:null,aircraft:ac,label:'',start:'09:00',end:'10:00',color:_rzAcCol(ac),notes:''};
  render();
};
window.schedEditBlock=function(id){
  const b=(S._schedBlocks||[]).find(function(x){return x.id===id;});
  if(!b)return;
  S._schedEdit={id:b.id,aircraft:b.aircraft||'',label:b.label||'',start:b.start||'09:00',end:b.end||'10:00',color:b.color||_rzAcCol(b.aircraft),notes:b.notes||''};
  render();
};
window.schedEditField=function(field,val){
  if(!S._schedEdit)return;
  S._schedEdit[field]=val;
  if(field==='aircraft')S._schedEdit.color=_rzAcCol(val); // recolor to match aircraft
  // Label names a known product (FCF 4.5h; FJHH/MCEXP/THH 5h) → auto-set end from start.
  if((field==='label'||field==='start')&&S._schedEdit.start){
    var dur=_rzProductCodeDuration(S._schedEdit.label);
    if(dur){var sm=_rzMinsFromHHMM(S._schedEdit.start);if(sm!=null){var em=sm+dur;S._schedEdit.end=String(Math.floor(em/60)).padStart(2,'0')+':'+String(em%60).padStart(2,'0');}}
  }
  if(field==='aircraft'||field==='color'||field==='label'||field==='start')render();
};
window.schedSaveBlock=async function(){
  const ed=S._schedEdit;if(!ed)return;
  if(!ed.aircraft){toast('Pick an aircraft','err');return;}
  if(!ed.start||!ed.end){toast('Start and end required','err');return;}
  if(ed.end<=ed.start){toast('End time must be after the start time','err');return;}
  const id=ed.id||('sch_'+Date.now()+'_'+Math.floor(Math.random()*1e5));
  const payload={id:id,block_date:S.rezdyDate,data:{aircraft:ed.aircraft,label:ed.label||'',start:ed.start,end:ed.end,color:ed.color||_rzAcCol(ed.aircraft),notes:ed.notes||''}};
  const r=await sbU('ts_schedule',[payload]);
  if(!r){toast('Save failed','err');return;}
  S._schedEdit=null;
  toast('Block saved ✓','ok');
  await window.rezdyLoadSchedule();
  _rzSchedBroadcast();
};
window.schedDeleteBlock=async function(){
  const ed=S._schedEdit;if(!ed||!ed.id)return;
  if(!confirm('Delete this schedule block?'))return;
  const ok=await sbDel('ts_schedule',ed.id);
  S._schedEdit=null;
  if(ok){toast('Block deleted','ok');await window.rezdyLoadSchedule();_rzSchedBroadcast();}
  else{toast('Delete failed','err');render();}
};
