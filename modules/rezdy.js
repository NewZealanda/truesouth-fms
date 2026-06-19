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
// "0930" → "09:30" for the schedule grid's HH:MM parser.
function _rzHHMMcolon(s){var m=/^(\d{2})(\d{2})$/.exec(String(s||''));return m?m[1]+':'+m[2]:String(s||'');}
// Flight block duration (minutes) by product: FCF = 4.5h; FJHH / MCEXP / THH = 5h; else 2h.
function _rzProductDuration(p){var s=String(p||'').toUpperCase();if(/FCF|MILFORD.*FLY.*CRUISE.*FLY/.test(s))return 270;if(/\b(FJHH|MCEXP|THH)\b/.test(s))return 300;return 120;}
// Like above but returns 0 when the text names no known product (so we don't clobber a manual end).
function _rzProductCodeDuration(t){var s=String(t||'').toUpperCase();if(/\bFCF\b/.test(s))return 270;if(/\b(FJHH|MCEXP|THH)\b/.test(s))return 300;return 0;}
// A booking's primary departure time (first item), e.g. "0930"; "—" if none.
function _rzBookingDep(b){var it=((b&&b.items)||[])[0]||{};return _rzDepTime(it.startTimeLocal||'')||'—';}
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
  const byTime=function(a,b){return _rzPkTimeVal(a)-_rzPkTimeVal(b);};
  const vans=[];for(let i=0;i<N;i++)vans.push([]);
  // Pickups run by DEPARTURE: a whole departure is collected together (Van 1→2→3 by capacity),
  // then the next departure reuses the same vans. Hilton always gets its own vehicle. Earliest first.
  const byDep={};pickups.forEach(function(p){(byDep[p.depart||'~']=byDep[p.depart||'~']||[]).push(p);});
  Object.keys(byDep).sort().forEach(function(dep){
    const grp=byDep[dep];
    const hilton=grp.filter(function(p){return _rzIsHilton(p.location);}).sort(byTime);
    const others=grp.filter(function(p){return !_rzIsHilton(p.location);}).sort(byTime);
    const load=[];for(let i=0;i<N;i++)load.push(0);
    let vi=0;
    const place=function(p){
      if(load[vi]>0 && load[vi]+p.pax>_rzVehSeats(vi) && vi<N-1)vi++;
      vans[vi].push(p.id);load[vi]+=p.pax;
    };
    others.forEach(place);
    // Hilton starts a fresh vehicle within this departure (opposite direction).
    if(hilton.length){ if(load[vi]>0 && vi<N-1)vi++; hilton.forEach(place); }
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
    ids.forEach(function(id){if(!placed[id]&&!sd[id])S._pickupVans[0].push(id);});
  }
  if(!S._pickupCollected||typeof S._pickupCollected!=='object')S._pickupCollected={};
  return pickups;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ENTRY
// ─────────────────────────────────────────────────────────────────────────────
function renderRezdy(){
  // Gated on the 'rezdy' permission (superadmin only by default; the menu item is also gated).
  if(typeof hasRolePerm==='function'&&!hasRolePerm('rezdy'))return '<div class="page"><div class="card" style="text-align:center;padding:40px">Not available.</div></div>';
  if(!S.rezdyDate)S.rezdyDate=_rzToday();
  const sub=S.rezdyTab||'bookings';
  // Keep the viewed day in lock-step with Rezdy. Throttled + off the render stack so it
  // never blocks or loops; the cache shows instantly and the view updates when Rezdy returns.
  if(typeof setTimeout==='function')setTimeout(function(){if(typeof _rzBgSync==='function')_rzBgSync();},0);
  // Opening the Calendar reloads it (so it reflects the latest synced bookings). No auto-poll.
  if(sub==='schedule'&&S._rzPrevSub!=='schedule'){S._schedBlocks=null;S._rezdyBookings=null;}
  S._rzPrevSub=sub;
  const tabBar='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'+
    [{id:'bookings',lbl:'Bookings'},{id:'manifest',lbl:'Manifest'},{id:'loadsheets',lbl:'Loadsheets'},{id:'schedule',lbl:'Calendar'},{id:'pickups',lbl:'Pickups'},{id:'mypickups',lbl:'My Pickups'}].map(function(t){
      return '<button class="sub-tab '+(sub===t.id?'on':'')+'" onclick="S.rezdyTab=\''+t.id+'\';render()">'+t.lbl+'</button>';
    }).join('')+'</div>';

  // shared date picker row — prev / next / today date-cycle controls on every tab
  const _isToday=S.rezdyDate===_rzToday();
  const dateRow='<div class="card" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
    '<button class="btn btn-ghost" style="font-size:15px;padding:5px 11px;line-height:1" title="Previous day" onclick="window.rezdyShiftDate(-1)">◁</button>'+
    '<div style="position:relative;display:inline-block">'+
      '<span style="display:inline-block;font-size:14px;font-weight:700;color:var(--text1);padding:7px 12px;border-radius:8px;background:var(--card2);border:1px solid var(--border2);white-space:nowrap">📅 '+_rzDowLabel(S.rezdyDate)+'</span>'+
      '<input type="date" value="'+_rzEsc(S.rezdyDate)+'" onchange="window.rezdySetDate(this.value)" onclick="try{this.showPicker&&this.showPicker()}catch(e){}" style="position:absolute;inset:0;opacity:0;width:100%;height:100%;border:none;cursor:pointer">'+
    '</div>'+
    '<button class="btn btn-ghost" style="font-size:15px;padding:5px 11px;line-height:1" title="Next day" onclick="window.rezdyShiftDate(1)">▷</button>'+
    '<button class="btn btn-ghost" style="font-size:12px;padding:6px 12px'+(_isToday?';opacity:.45':'')+'" title="Jump to today" onclick="window.rezdySetDate(\''+_rzToday()+'\')">Today</button>'+
    (sub==='loadsheets'?'':'<button class="btn btn-ghost" style="font-size:12px;margin-left:auto'+(S._rzSyncing?';opacity:.6':'')+'" onclick="window.rezdyRefresh()">'+(S._rzSyncing?'⟳ Syncing…':'⟳ Refresh from Rezdy')+'</button>')+
    '</div>';

  var _modal=S._rzCheckinDraft?_rzCheckinModal():'';
  if(sub==='pickups')return tabBar+dateRow+_rzRenderPickups()+_modal;
  if(sub==='mypickups')return tabBar+dateRow+_rzRenderMyPickups()+_modal;
  if(sub==='manifest')return tabBar+dateRow+_rzRenderManifest()+_modal;
  if(sub==='loadsheets')return tabBar+dateRow+_rzRenderLoadsheets()+_modal;
  if(sub==='schedule')return tabBar+dateRow+_rzRenderSchedule()+_modal;
  return tabBar+dateRow+_rzRenderBookings()+_modal;
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
// The aircraft assigned to a booking: a manual pill override, else whatever the comments note.
function _rzBookingAc(b,order){return (S._rzBookingAc||{})[String(order)]||_rzAircraftFromComments(b);}
// Aircraft selector pills for one booking. Comments supply the default; a pill overrides it.
function _rzBookingAcPills(b,order){
  var fleet=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(id){return S.aircraft&&S.aircraft[id];});
  var manual=(S._rzBookingAc||{})[String(order)];
  var cur=manual||_rzAircraftFromComments(b);
  var oE=_rzEsc(String(order)).replace(/'/g,"\\'");
  var pills='';
  fleet.forEach(function(id){
    var on=cur===id;var col=_rzAcCol(id);
    pills+='<button onclick="window.rezdyBookingSetAc(\''+oE+'\',\''+id.replace(/'/g,"\\'")+'\')" class="pill" style="cursor:pointer;opacity:'+(on?'1':'.38')+';border:1.5px solid '+(on?col:'var(--border2)')+';background:'+(on?col:'transparent')+';color:'+(on?'#fff':col)+';font-weight:800;font-size:11px;padding:3px 10px;border-radius:14px">'+id.replace('ZK-','')+'</button>';
  });
  var note=cur?'<span style="font-size:10px;color:var(--text3);margin-left:2px">'+(manual?'set':'from comments')+'</span>':'';
  return '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:7px 10px">'+
    '<span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800;margin-right:2px">Aircraft</span>'+pills+note+'</div>';
}
window.rezdyBookingSetAc=function(order,ac){
  order=String(order);S._rzBookingAc=S._rzBookingAc||{};
  if(S._rzBookingAc[order]===ac)delete S._rzBookingAc[order]; // tap the selected pill to revert to comments
  else S._rzBookingAc[order]=ac;
  if(window.pickupSave)window.pickupSave(true);render();
};
window.rezdyBookingToggleWx=function(order){order=String(order);S._rzBookingWx=S._rzBookingWx||{};if(S._rzBookingWx[order])delete S._rzBookingWx[order];else S._rzBookingWx[order]=true;if(window.pickupSave)window.pickupSave(true);render();};
window.rezdyBookingToggleCheckedIn=function(order){order=String(order);S._rzBookingCheckedIn=S._rzBookingCheckedIn||{};if(S._rzBookingCheckedIn[order])delete S._rzBookingCheckedIn[order];else S._rzBookingCheckedIn[order]=true;if(window.pickupSave)window.pickupSave(true);render();};
// Click the "Checked in" pill: not checked in → open the check-in popup (capture names + actual
// weights); already checked in → un-check.
window.rezdyCheckinClick=function(order){order=String(order);if((S._rzBookingCheckedIn||{})[order])window.rezdyBookingToggleCheckedIn(order);else window.rezdyCheckinOpen(order);};
window.rezdyCheckinOpen=function(order){
  order=String(order);
  var b=(S._rezdyBookings||[]).find(function(x){return String(x.orderNumber||'')===order;});
  if(!b){if(typeof toast==='function')toast('Booking not found','warn');return;}
  var existing=_rzCheckinPax(order),rows;
  if(existing){rows=existing.map(function(r){return {name:r.name||'',actual:r.actual!=null?String(r.actual):'',type:r.type||'adult'};});}
  else{
    var pr=_rzPaxRows(b);var bd=_rzEffBreakdown(b);var seatCount=Math.max((bd.a||0)+(bd.c||0),pr.length,1);
    rows=[];for(var i=0;i<seatCount;i++){var r=pr[i]||{};rows.push({name:r.name||'',actual:'',type:r.type||'adult'});}
  }
  S._rzCheckinDraft={order:order,rows:rows};render();
};
window.rezdyCheckinField=function(i,field,val){var d=S._rzCheckinDraft;if(!d||!d.rows[i])return;d.rows[i][field]=val;}; // no render (keep input focus)
window.rezdyCheckinType=function(i){var d=S._rzCheckinDraft;if(!d||!d.rows[i])return;d.rows[i].type=(d.rows[i].type==='child')?'adult':'child';render();};
window.rezdyCheckinAddRow=function(){var d=S._rzCheckinDraft;if(!d)return;d.rows.push({name:'',actual:'',type:'adult'});render();};
window.rezdyCheckinRemoveRow=function(i){var d=S._rzCheckinDraft;if(!d||d.rows.length<=1)return;d.rows.splice(i,1);render();};
window.rezdyCheckinCancel=function(){S._rzCheckinDraft=null;render();};
window.rezdyCheckinSave=function(){
  var d=S._rzCheckinDraft;if(!d)return;
  for(var i=0;i<d.rows.length;i++){var r=d.rows[i];
    if(!r.name||!String(r.name).trim()){if(typeof toast==='function')toast('Enter a name for passenger '+(i+1),'warn');return;}
    var a=parseFloat(r.actual);if(isNaN(a)||a<=0){if(typeof toast==='function')toast('Enter an actual weight for '+(String(r.name).trim()||('passenger '+(i+1))),'warn');return;}
  }
  S._rzCheckin=S._rzCheckin||{};
  S._rzCheckin[d.order]={pax:d.rows.map(function(r){return {name:String(r.name).trim(),actual:parseFloat(r.actual),type:r.type==='child'?'child':'adult'};})};
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
  var h='<div onclick="window.rezdyCheckinCancel()" style="position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px">'+
    '<div onclick="event.stopPropagation()" style="background:var(--card);border:1px solid var(--border2);border-radius:16px;padding:18px;max-width:480px;width:100%;box-shadow:0 16px 50px rgba(0,0,0,.5)">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px"><div class="st" style="margin-bottom:0">Check in — '+_rzEsc(cust)+'</div><button onclick="window.rezdyCheckinCancel()" style="background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer">✕</button></div>'+
    '<p style="font-size:12px;color:var(--text3);margin:0 0 12px">Enter every passenger’s name and <b>actual weight</b>. All fields required (A/C toggles adult/child).</p>';
  d.rows.forEach(function(r,i){
    h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">'+
      '<span style="font-size:11px;color:var(--text3);width:16px;flex-shrink:0">'+(i+1)+'</span>'+
      '<input type="text" value="'+_rzEsc(r.name||'')+'" oninput="window.rezdyCheckinField('+i+',\'name\',this.value)" placeholder="Full name" style="flex:1 1 110px;min-width:0;font-size:16px;padding:8px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:7px">'+
      '<input type="number" inputmode="decimal" value="'+_rzEsc(r.actual||'')+'" oninput="window.rezdyCheckinField('+i+',\'actual\',this.value)" placeholder="kg" style="width:62px;flex-shrink:0;font-size:16px;padding:8px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:7px;text-align:right">'+
      '<button onclick="window.rezdyCheckinType('+i+')" title="Adult / Child" style="flex-shrink:0;width:30px;font-size:12px;font-weight:800;padding:8px 0;border-radius:7px;border:1px solid '+(r.type==='child'?'#fb923c':'var(--border2)')+';background:'+(r.type==='child'?'rgba(251,146,60,.18)':'transparent')+';color:'+(r.type==='child'?'#fb923c':'var(--text3)')+';cursor:pointer">'+(r.type==='child'?'C':'A')+'</button>'+
      (d.rows.length>1?'<button onclick="window.rezdyCheckinRemoveRow('+i+')" title="Remove" style="flex-shrink:0;background:none;border:none;color:#ef444488;font-size:14px;cursor:pointer">✕</button>':'')+
    '</div>';
  });
  h+='<button onclick="window.rezdyCheckinAddRow()" style="font-size:12px;font-weight:700;padding:5px 12px;border-radius:8px;border:1px dashed var(--border2);background:transparent;color:var(--text2);cursor:pointer;margin-bottom:14px">+ Add passenger</button>';
  h+='<div style="display:flex;gap:8px;justify-content:flex-end">'+
    '<button class="btn btn-ghost" style="font-size:13px" onclick="window.rezdyCheckinCancel()">Cancel</button>'+
    '<button class="btn btn-primary" style="font-size:13px;padding:8px 16px" onclick="window.rezdyCheckinSave()">✓ Confirm check-in</button>'+
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
// Pilots rostered on for the day (available to fly) with their 2-letter crew code.
// Pilots available to fly on the selected date: ROSTERED ON (a duty, not off/leave/blank),
// and either a pilot or an admin/superadmin (who also fly). Shared by manifest + calendar.
function _rzAvailablePilots(){
  var ds=S.rezdyDate,roster=S.roster||{},off={rdo:1,off:1,leave:1,ul:1,sick:1,training:1};
  return (S.users||[]).filter(function(u){
    if(!u||u.inactive)return false;
    var canFly=u.role==='pilot'||u.isPilot||u.role==='admin'||u.role==='superadmin';
    if(!canFly)return false;
    var st=(typeof _rGetStatus==='function')?_rGetStatus(u,ds,roster):((roster[ds]||{})[u.id]||'');
    return !!st&&!off[st];   // must be rostered ON for the day
  }).map(function(u){return {code:(typeof _rCode==='function')?_rCode(u):(u.name||'').slice(0,2).toUpperCase(),name:(u.name||'').trim()};});
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
  if(!u)return null;
  var cr=(S.crew||[]).find(function(c){return c.n===u.name||c.n===u.linkedCrew;});
  // "PIC eligible" (the isPilot profile flag) IS the authority to act as PIC.
  var auth=!!u.isPilot||u.role==='pilot';
  return {code:code,name:(u.name||'').trim(),weight:(cr&&cr.w)||u.weight||0,endorse:(cr&&cr.endorse)||[],picAuth:auth};
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
    return ci.map(function(r,i){var a=parseFloat(r.actual);return {idx:'c'+i,name:r.name||'',declared:null,actual:isNaN(a)?null:a,type:r.type==='child'?'child':'adult',infName:r.infName||null};});
  }
  var parts=[];(b.items||[]).forEach(function(it){(it.participants||[]).forEach(function(p){parts.push(p);});});
  var m=(S._rezdyPaxMeta||{})[order]||{};var infantOf=m.infantOf||{};var types=m.types||{};
  var rows=[];
  parts.forEach(function(p,idx){
    if(infantOf[idx]!=null)return;
    var declared=_rzDeclared(p&&p.weight);
    var t=types[idx]||_rzAgeType(p);
    var infName=null;Object.keys(infantOf).forEach(function(ii){if(String(infantOf[ii])===String(idx)){var ip=parts[ii];if(ip&&ip.name)infName=String(ip.name).trim().split(/\s+/)[0];}});
    rows.push({idx:idx,name:(p&&p.name)?String(p.name).trim():'',declared:declared,actual:null,type:t==='child'?'child':'adult',infName:infName});
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
    var hasA=r.actual!=null;
    var wTxt=hasA?(r.actual+'kg'):(r.declared!=null?(r.declared+'kg'):'TBC');
    var wCol=hasA?'#15803d':(r.declared!=null?'#1e293b':'#b45309'); // green actual / black declared / amber TBC
    var wTitle=hasA?'Actual weight':(r.declared!=null?'Declared weight (incl +4kg)':'Weight not declared');
    var isChild=r.type==='child';var infName=r.infName;
    var interactive=opts.drag&&!checkedIn&&typeof r.idx==='number';
    var dd=interactive?(' draggable="true" ondragstart="window.rezdyPaxDragStart(\''+order.replace(/'/g,"\\'")+'\','+r.idx+',event)" ondragover="event.preventDefault()" ondrop="window.rezdyPaxDropInfant(\''+order.replace(/'/g,"\\'")+'\','+r.idx+',event)" onclick="window.rezdyPaxToggleChild(\''+order.replace(/'/g,"\\'")+'\','+r.idx+')"'):'';
    bubs+='<div title="'+_rzEsc((r.name||'')+(infName?' (+ infant '+infName+')':''))+'"'+dd+' style="position:relative;overflow:hidden;background:rgba(255,255,255,.93);border-radius:8px;'+(owing?'border:2px solid #ef4444':'border-left:4px solid '+gcol)+';min-width:60px;flex-shrink:0;'+(interactive?'cursor:grab;':'')+'">'+
      (owing?'<div style="background:#ef4444;color:#fff;font-size:8px;font-weight:900;letter-spacing:.04em;text-align:center;line-height:1.7">$ TO PAY</div>':'')+
      (isChild?'<div style="position:absolute;bottom:3px;left:3px;font-size:8px;font-weight:900;background:rgba(251,146,60,.5);color:#c2500a;border-radius:3px;padding:0 3px;line-height:1.4;border:1px solid rgba(0,0,0,.4)">C</div>':'')+
      (infName?'<div title="Infant: '+_rzEsc(infName)+'" style="position:absolute;bottom:3px;right:3px;font-size:8px;font-weight:900;background:rgba(236,72,153,.5);color:#9d1768;border-radius:3px;padding:0 3px;line-height:1.4;border:1px solid rgba(0,0,0,.4)">i</div>':'')+
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
  // aircraft pills
  if(!cancelled)h+=_rzBookingAcPills(b,ono);
  // pax bubbles + reset
  var _bub=_rzPaxBubbles(b,{drag:true});
  if(_bub){
    var _rst=_rzHasPaxOverrides(ono)?'<button onclick="window.rezdyResetPax(\''+oE+'\')" title="Reset this booking to the Rezdy standard" style="flex-shrink:0;align-self:center;margin-left:auto;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--text3);background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;padding:3px 9px;cursor:pointer;white-space:nowrap">↺ Reset</button>':'';
    h+='<div style="display:flex;align-items:stretch;border-top:1px dashed var(--border2);margin-top:6px">'+_bub+_rst+'</div>';
  }
  if(open)h+='<div style="border-top:1px solid var(--border);margin-top:8px;padding-top:10px">'+_rzBookingDetail(b)+'</div>';
  h+='</div>';
  return h;
}
function _rzRenderBookings(){
  if(!S._rezdyBookings){if(!S._rezdyLoading)window.rezdyLoadBookings();return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading bookings…</div>';}
  if(!S._rezdyOpen||typeof S._rezdyOpen!=='object')S._rezdyOpen={};
  const allRows=(S._rezdyBookings||[]).slice();
  const active=allRows.filter(function(b){return !/cancel/i.test(b.status||'');});
  const cancelledRows=allRows.filter(function(b){return /cancel/i.test(b.status||'');});
  const deps=[];active.forEach(function(b){var d=_rzBookingDep(b);if(deps.indexOf(d)<0)deps.push(d);});
  deps.sort();
  const depFilter=(S._bkDepFilter&&deps.indexOf(S._bkDepFilter)>=0)?S._bkDepFilter:null;
  // Departure filter tabs
  let depTabs='<div class="card" style="padding:8px 10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">';
  depTabs+='<button onclick="S._bkDepFilter=null;render()" class="sub-tab '+(!depFilter?'on':'')+'" style="font-size:12px;padding:5px 12px">All</button>';
  deps.forEach(function(d){var cnt=active.filter(function(b){return _rzBookingDep(b)===d;}).length;depTabs+='<button onclick="S._bkDepFilter=\''+_rzEsc(d).replace(/'/g,"\\'")+'\';render()" class="sub-tab '+(depFilter===d?'on':'')+'" style="font-size:12px;padding:5px 12px">🛫 '+_rzEsc(d)+' <span style="opacity:.6">('+cnt+')</span></button>';});
  depTabs+='</div>';
  const hdr='<div class="card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'+
    '<div><div class="st" style="margin-bottom:0">Rezdy Bookings</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+(allRows.length?active.length+' active'+(cancelledRows.length?' · '+cancelledRows.length+' cancelled':'')+' for '+_rzDowLabel(S.rezdyDate):'No cached bookings')+'</p></div>'+
    '</div>'+depTabs;
  if(!allRows.length){
    return hdr+'<div class="card" style="text-align:center;padding:36px;color:var(--text3);font-size:13px">No bookings cached for this date.<br>Tap <b>Refresh from Rezdy</b> to pull the latest.</div>';
  }
  let body='';
  var shownDeps=depFilter?[depFilter]:deps;
  shownDeps.forEach(function(dep){
    var grp=active.filter(function(b){return _rzBookingDep(b)===dep;}).sort(function(a,b){var ca=(S._rzBookingCheckedIn||{})[String(a.orderNumber||'')]?1:0,cb=(S._rzBookingCheckedIn||{})[String(b.orderNumber||'')]?1:0;return ca-cb;}); // checked-in to the bottom
    if(!grp.length)return;
    var gbd={a:0,c:0,i:0};grp.forEach(function(x){var e=_rzEffBreakdown(x);gbd.a+=e.a;gbd.c+=e.c;gbd.i+=e.i;});
    var prod=_rzProduct((((grp[0]||{}).items||[])[0]||{}).product||'');
    body+='<div style="margin:16px 0 8px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span style="font-size:15px;font-weight:800;color:var(--text1)">🛫 '+_rzEsc(dep)+'</span><span style="font-size:11px;color:var(--text3);font-weight:600">'+grp.length+' booking'+(grp.length===1?'':'s')+' · '+_rzBdText(gbd)+(prod?' · '+_rzEsc(prod):'')+'</span></div>';
    grp.forEach(function(b){body+=_rzBookingCard(b);});
  });
  if(!depFilter&&cancelledRows.length){
    var cOpen=!!S._bkShowCancelled;
    body+='<div class="card" style="padding:0;margin-top:16px;overflow:hidden">'+
      '<div onclick="S._bkShowCancelled=!S._bkShowCancelled;render()" style="cursor:pointer;padding:11px 14px;display:flex;align-items:center;gap:8px;color:var(--text2)">'+
        '<span style="display:inline-block;transition:transform .12s;'+(cOpen?'transform:rotate(90deg)':'')+'">▸</span>'+
        '<span style="font-size:13px;font-weight:700">✕ Cancelled ('+cancelledRows.length+')</span></div>';
    if(cOpen){body+='<div style="padding:4px 10px 8px">';cancelledRows.forEach(function(b){body+=_rzBookingCard(b);});body+='</div>';}
    body+='</div>';
  }
  return hdr+body;
}

// Format a currency amount (e.g. 123.5 + 'NZD' → "$123.50").
function _rzMoney(n,cur){
  const v=parseFloat(n);if(!isFinite(v))return '';
  const sym=(cur==='USD'||cur==='AUD'||cur==='NZD'||cur==='CAD'||!cur)?'$':_rzEsc(cur)+' ';
  return sym+v.toFixed(2);
}

// Build the expanded detail panel for one booking (passengers, extras, requests, balance).
function _rzBookingDetail(b){
  const sec='font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800;margin-bottom:4px';
  // Passengers — flatten participants across items.
  const parts=[];
  (b.items||[]).forEach(function(it){(it.participants||[]).forEach(function(p){parts.push(p);});});
  let paxH='<div style="margin-bottom:10px"><div style="'+sec+'">Passengers ('+parts.length+')</div>';
  if(!parts.length){
    paxH+='<div style="font-size:12px;color:var(--text3)">—</div>';
  }else{
    paxH+='<div style="display:flex;flex-direction:column;gap:3px">';
    parts.forEach(function(p){
      const nm=(p&&p.name)?_rzEsc(p.name):'—';
      const wRaw=(p&&p.weight!=null&&p.weight!=='')?p.weight:null;
      const w=(wRaw==null)?'':(/^tbc$/i.test(String(wRaw))?'TBC':_rzEsc(String(wRaw)));
      paxH+='<div style="font-size:12.5px;color:var(--text);display:flex;justify-content:space-between;gap:10px;max-width:340px">'+
        '<span>'+nm+'</span><span style="color:'+(/^tbc$/i.test(String(wRaw||''))?'#f59e0b':'var(--text2)')+';font-weight:700">'+w+'</span></div>';
    });
    paxH+='</div>';
  }
  paxH+='</div>';
  // Extras / lunches — flatten across items.
  const extras=[];
  (b.items||[]).forEach(function(it){(it.extras||[]).forEach(function(e){if(e&&e.name)extras.push(e);});});
  let exH='';
  if(extras.length){
    exH='<div style="margin-bottom:10px"><div style="'+sec+'">Extras / Lunches</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
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
    reqH='<div style="margin-bottom:10px"><div style="'+sec+'">Special Requests</div><div style="display:flex;flex-direction:column;gap:4px">';
    reqs.forEach(function(r){
      reqH+='<div style="font-size:12px;color:var(--text)"><b style="color:var(--text2)">'+_rzEsc(r.label)+':</b> '+_rzEsc(r.value)+'</div>';
    });
    reqH+='</div></div>';
  }
  // Contact (email hidden from the table — shown here on expand).
  let contactH='';
  if(b.email||b.phone){
    contactH='<div style="margin-bottom:10px"><div style="'+sec+'">Contact</div>';
    if(b.phone)contactH+='<div style="font-size:12.5px"><a href="tel:'+_rzEsc(b.phone)+'" style="color:var(--acc);text-decoration:none">📞 '+_rzEsc(b.phone)+'</a></div>';
    if(b.email)contactH+='<div style="font-size:12.5px;word-break:break-all"><a href="mailto:'+_rzEsc(b.email)+'" style="color:var(--acc);text-decoration:none">✉ '+_rzEsc(b.email)+'</a></div>';
    contactH+='</div>';
  }
  // Balance.
  const bal=parseFloat(b.balanceDue);
  const owing=isFinite(bal)&&bal>0;
  let balH='<div><div style="'+sec+'">Balance</div>';
  balH+='<div style="font-size:14px;font-weight:800;color:'+(owing?'#f59e0b':'#4ade80')+'">'+(owing?'⚠ '+_rzEsc(_rzMoney(bal,b.currency))+' owing':'Paid in full')+'</div>';
  balH+='<div style="font-size:11px;color:var(--text3);margin-top:2px">Total '+_rzEsc(_rzMoney(b.totalAmount,b.currency)||'—')+' · Paid '+_rzEsc(_rzMoney(b.totalPaid,b.currency)||'—')+'</div>';
  balH+='</div>';
  // Source / marketplace (kept out of the collapsed card to reduce clutter).
  var srcH=b.source?('<div style="margin-bottom:10px"><div style="'+sec+'">Source</div><div style="font-size:12px;color:var(--text2)">'+_rzEsc(b.source)+'</div></div>'):'';
  return '<div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start">'+
    '<div style="flex:1 1 300px;min-width:240px">'+paxH+exH+'</div>'+
    '<div style="flex:1 1 260px;min-width:220px">'+contactH+reqH+srcH+balH+'</div>'+
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
  S._rezdyBookings=null;S._rezdyOpen={};S._pickupVans=null;S._pickupCollected=null;S._schedBlocks=null;S._schedGroupKey=null;S._schedEdit=null;S._rzManLoaded=false;S._rzManPax=null;
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
  S._rezdyBookings=(rows||[]).map(_rzRow).filter(Boolean);
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
        S._rezdyBookings=(rows||[]).map(_rzRow).filter(Boolean);
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
    // Capacity is per departure run (each ≤11), so size the warning by the busiest departure.
    var _byDepLoad={};vanIds.forEach(function(id){var pp=_rzPickupById(pickups,id);if(pp)_byDepLoad[pp.depart||'~']=(_byDepLoad[pp.depart||'~']||0)+pp.pax;});
    var _maxDep=0;Object.keys(_byDepLoad).forEach(function(k){if(_byDepLoad[k]>_maxDep)_maxDep=_byDepLoad[k];});
    const seats=_rzVehSeats(vi);
    const pax=depFilter?(_byDepLoad[depFilter]||0):_rzVanPax(vanIds,pickups);
    const over=depFilter?(pax>seats):(_maxDep>seats);
    const col=_rzVehColor(vi);
    vansH+='<div ondragover="event.preventDefault();this.style.outline=\'2px solid '+col+'\'" ondragleave="this.style.outline=\'\'" ondrop="window.pickupDropOnVan('+vi+',event);this.style.outline=\'\'" '+
      'style="flex:1 1 260px;min-width:240px;background:var(--card);border:1px solid var(--border);border-top:3px solid '+col+';border-radius:10px;padding:12px">';
    vansH+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'+
      '<div style="font-weight:800;font-size:14px;color:'+col+'">'+_rzEsc(_rzVehName(vi))+'</div>'+
      '<span style="font-size:12px;font-weight:700;color:'+(over?'#ef4444':'var(--text2)')+'">'+pax+' / '+seats+' pax'+(over?' ⚠':'')+'</span></div>';
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
    S._rezdyPaxMeta=(row.paxMeta&&typeof row.paxMeta==='object')?row.paxMeta:{};
    S._schedPilots=(row.schedPilots&&typeof row.schedPilots==='object')?row.schedPilots:{};
    S._rzBookingAc=(row.bookingAc&&typeof row.bookingAc==='object')?row.bookingAc:{};
    S._rzBookingWx=(row.bookingWx&&typeof row.bookingWx==='object')?row.bookingWx:{};
    S._rzBookingCheckedIn=(row.bookingCheckedIn&&typeof row.bookingCheckedIn==='object')?row.bookingCheckedIn:{};
    S._rzSchedAttach=(row.schedAttach&&typeof row.schedAttach==='object')?row.schedAttach:{};
    S._rzCheckin=(row.checkin&&typeof row.checkin==='object')?row.checkin:{};
  }else{
    S._pickupVans=null;S._pickupCollected={};S._pickupLocOverride={};S._pickupDrivers=[];S._pickupExtraDrivers=[];S._rezdyPaxMeta={};S._schedPilots={};S._rzBookingAc={};S._rzBookingWx={};S._rzBookingCheckedIn={};S._rzSchedAttach={};S._rzCheckin={};
  }
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
    data:{vans:S._pickupVans||[],collected:S._pickupCollected||{},locOverride:S._pickupLocOverride||{},drivers:S._pickupDrivers||[],extraDrivers:S._pickupExtraDrivers||[],paxMeta:S._rezdyPaxMeta||{},schedPilots:S._schedPilots||{},bookingAc:S._rzBookingAc||{},bookingWx:S._rzBookingWx||{},bookingCheckedIn:S._rzBookingCheckedIn||{},schedAttach:S._rzSchedAttach||{},checkin:S._rzCheckin||{}}
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
    var depPax=grp.reduce(function(s,p){return s+(p.pax||0);},0);
    h+='<div class="card" style="border-top:4px solid '+col+';padding:14px;margin-bottom:14px">';
    h+='<div style="font-weight:800;font-size:18px;color:'+col+'">'+_rzEsc(_rzVehName(v.vi))+'</div>';
    h+='<div style="font-size:12px;color:var(--text3);margin-bottom:10px">'+grp.length+' stop'+(grp.length===1?'':'s')+' · '+depPax+' pax</div>';
    grp.forEach(function(p){
      var collected=!!(S._pickupCollected||{})[p.id];
      h+='<div style="background:var(--card2);border:1px solid var(--border2);border-left:4px solid '+col+';border-radius:10px;padding:13px;margin-bottom:10px;'+(collected?'opacity:.55':'')+'">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px">'+
          '<div style="font-weight:800;font-size:16px;color:var(--text1);'+(collected?'text-decoration:line-through':'')+'">'+_rzEsc(p.customer||p.order)+'</div>'+
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
  var tbc=!p.weight;var w=tbc?'TBC':_rzEsc(String(p.weight))+'kg';
  var isChild=p.type==='child';
  var infant=allPax.find(function(x){return x.infantOf===p.id;});
  var infName=p.infantName||(infant?String(infant.name||'').split(/\s+/)[0]:null);
  var idEsc=_rzEsc(p.id).replace(/'/g,"\\'");
  var infRemove=infant?(' onclick="event.stopPropagation();window.rezdyManRemoveInfant(\''+_rzEsc(infant.id).replace(/'/g,"\\'")+'\')" title="Infant: '+_rzEsc(infName||'')+' (tap to remove)" style="cursor:pointer;'):' title="Infant'+(infName?': '+_rzEsc(infName):'')+'" style="';
  return '<div draggable="true" ondragstart="window.rezdyManDragStart(\''+idEsc+'\',event)" ondragover="event.preventDefault()" ondrop="window.rezdyManDropInfant(\''+idEsc+'\',event)" onclick="window.rezdyManToggleChild(\''+idEsc+'\')" title="'+_rzEsc(p.name||'')+(infName?' (+ infant '+_rzEsc(infName)+')':'')+'" style="position:relative;overflow:hidden;background:rgba(255,255,255,.93);border-radius:8px;'+(p.paymentReq?'border:2px solid #ef4444':'border-left:4px solid '+gcol)+';min-width:62px;flex-shrink:0;cursor:grab">'+
    (p.paymentReq?'<div style="background:#ef4444;color:#fff;font-size:8px;font-weight:900;text-align:center;line-height:1.7">$ TO PAY</div>':'')+
    (isChild?'<div style="position:absolute;bottom:3px;left:3px;font-size:8px;font-weight:900;background:rgba(251,146,60,.5);color:#c2500a;border-radius:3px;padding:0 3px;line-height:1.4;border:1px solid rgba(0,0,0,.4)">C</div>':'')+
    (infName?'<div'+infRemove+'position:absolute;bottom:3px;right:3px;font-size:8px;font-weight:900;background:rgba(236,72,153,.5);color:#9d1768;border-radius:3px;padding:0 3px;line-height:1.4;border:1px solid rgba(0,0,0,.4)">i</div>':'')+
    '<div style="padding:'+(p.paymentReq?'2px 7px 4px':'4px 7px')+'">'+
      '<div style="font-size:11px;font-weight:700;color:#1e293b;white-space:nowrap;max-width:96px;overflow:hidden;text-overflow:ellipsis">'+nm+'</div>'+
      '<div onclick="event.stopPropagation();window.rezdyManEditWeight(\''+idEsc+'\')" title="Tap to enter / edit actual weight" style="font-size:10px;font-weight:700;color:'+(tbc?'#b45309':'#15803d')+';cursor:pointer">'+w+'</div>'+
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
    '<div><div class="st" style="margin-bottom:0">Manifest</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+_rzDowLabel(S.rezdyDate)+' · '+pax.length+' pax · '+pool.length+' unallocated'+(selDep&&selDep!=='—'?' @ '+_rzEsc(selDep):'')+'</p></div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
      '<button class="btn btn-ghost" style="font-size:12px" onclick="window.rezdyManPull()">⤓ Pull from bookings</button>'+
      '<button class="btn btn-ghost" style="font-size:12px" onclick="window.rezdyManAdd()">+ Add passenger</button>'+
      (pool.length?'<button class="btn btn-primary" style="font-size:12px;padding:7px 12px" onclick="window.rezdyManAllocate()">✈ Allocate to aircraft</button>':'')+
      (pax.length?'<button class="btn btn-ghost" style="font-size:12px;color:#ef4444;border-color:rgba(239,68,68,.4)" onclick="window.rezdyManClear()">🗑 Clear</button>':'')+
    '</div></div>';
  // Departure tabs (e.g. "0800 FCF") — one departure at a time.
  if(deps.length>1||(deps.length===1&&deps[0]!=='—')){
    h+='<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px;-webkit-overflow-scrolling:touch;scrollbar-width:none">';
    deps.forEach(function(d){var cnt=pax.filter(function(p){return !p.infantOf&&_rzPaxDep(p)===d;}).length;h+='<button onclick="S._rzManDepFilter=\''+_rzEsc(d).replace(/'/g,"\\'")+'\';render()" class="sub-tab '+(selDep===d?'on':'')+'" style="white-space:nowrap;flex-shrink:0">🛫 '+_rzManDepLabel(d)+' <span style="opacity:.6">('+cnt+')</span></button>';});
    h+='</div>';
  }
  h+='<div class="card" ondragover="event.preventDefault();this.style.outline=\'2px solid var(--acc)\'" ondragleave="this.style.outline=\'\'" ondrop="this.style.outline=\'\';window.rezdyManDrop(\'__pool__\',event)" style="padding:10px 12px">'+
    '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:8px">Unallocated ('+pool.length+')</div>';
  if(!pool.length)h+='<div style="font-size:12px;color:var(--text3);min-height:46px">All allocated. Pull from bookings or add a passenger.</div>';
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
  var _mPilots=_rzAvailablePilots().filter(function(p){return !_assignedPic[p.code];});
  if(_mPilots.length){
    h+='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px">'+
      '<span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800;margin-right:2px">Pilots</span>';
    _mPilots.forEach(function(p){h+='<div draggable="true" ondragstart="window.rezdySchedPilotDragStart(\''+_rzEsc(p.code).replace(/'/g,"\\'")+'\',event)" title="'+_rzEsc(p.name)+' — drag onto an aircraft to set PIC" style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:16px;background:rgba(96,165,250,.14);border:1px solid rgba(96,165,250,.5);cursor:grab;font-size:12px;font-weight:800;color:#60a5fa">✈ '+_rzEsc(p.code)+'</div>';});
    h+='</div>';
  }
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:12px;align-items:start">';
  fleet.forEach(function(id){
    var col=(typeof AC_COL!=='undefined'&&AC_COL[id])||'#64748b';
    var a=S.aircraft[id];
    var list=pax.filter(function(p){return p.ac===id&&!p.infantOf&&_rzPaxDep(p)===selDep;});
    var nA=0,nC=0,nI=0;list.forEach(function(p){if(p.type==='child')nC++;else nA++;if(p.infantName)nI++;});
    nI+=pax.filter(function(p){return p.ac===id&&p.infantOf&&_rzPaxDep(p)===selDep;}).length; // manually-folded lap infants
    var picCode=(S._rzManPic||{})[id]||'';
    var unit=(a&&a.layout==='ga8')?'L':'lbs';
    var std=a?Math.round(fromKg(a.fuelKg,id)):0;
    var fuelVal=(S._rzManFuel&&S._rzManFuel[id]!=null&&S._rzManFuel[id]!=='')?S._rzManFuel[id]:std;
    var idE=id.replace(/'/g,"\\'");
    h+='<div ondragover="event.preventDefault();this.style.outline=\'2px solid '+col+'\'" ondragleave="this.style.outline=\'\'" ondrop="this.style.outline=\'\';window.rezdyManDrop(\''+id+'\',event)" style="flex:1 1 240px;min-width:230px;background:var(--card);border:1px solid var(--border);border-top:3px solid '+col+';border-radius:10px;padding:12px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:8px"><div style="font-weight:800;font-size:14px;color:'+col+'">'+id.replace('ZK-','')+'</div>'+
        '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;font-weight:700;color:var(--text2)">'+(nA+'A'+(nC?nC+'C':'')+(nI?nI+'i':''))+'</span>'+
        '<button onclick="window.rezdyManDeleteAc(\''+idE+'\')" title="Remove this aircraft (returns its pax to the pool)" style="background:none;border:none;color:#ef444488;cursor:pointer;font-size:13px;padding:0 2px">🗑</button></div></div>';
    // PIC slot (drop a pilot here)
    h+='<div ondragover="event.preventDefault();event.stopPropagation();this.style.outline=\'2px solid #60a5fa\'" ondragleave="this.style.outline=\'\'" ondrop="event.stopPropagation();this.style.outline=\'\';window.rezdyManDropPilot(\''+idE+'\',event)" style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:5px 8px;border-radius:7px;border:1px dashed '+(picCode?'#60a5fa':'var(--border2)')+';background:'+(picCode?'rgba(96,165,250,.1)':'transparent')+'">'+
      '<span style="font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:800">PIC</span>'+
      (picCode?'<span style="font-size:12px;font-weight:800;color:#60a5fa">✈ '+_rzEsc(picCode)+'</span><button onclick="window.rezdyManClearPic(\''+idE+'\')" title="Clear PIC" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;margin-left:auto;padding:0 2px">✕</button>':'<span style="font-size:11px;color:var(--text3)">drag a pilot here</span>')+
    '</div>';
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
      // Only show pax that didn't fit a seat (overflow) — the seat plan is the single bubble set.
      var _sm=_rzManSeatsFor(selDep,id);var _seated={};Object.keys(_sm).forEach(function(k){_seated[_sm[k]]=1;});
      var _over=list.filter(function(p){return !_seated[p.id];});
      if(_over.length){h+='<div style="font-size:10px;color:#f59e0b;font-weight:800;margin:2px 0 4px">Unseated ('+_over.length+') — drag to a seat:</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">';_over.forEach(function(p){h+=_rzManBubble(p,pax);});h+='</div>';}
    }
    h+='<button class="btn btn-primary" style="width:100%;padding:8px;font-size:12px;'+(list.length?'':'opacity:.5')+'" onclick="window.rezdyManCreateLoadsheet(\''+idE+'\',\''+_rzEsc(selDep).replace(/'/g,"\\'")+'\')">📋 Create loadsheet</button>';
    h+='</div>';
  });
  h+='</div>';
  // Re-add a removed aircraft
  var hiddenAvail=fleetAll.filter(function(id){return hidden.indexOf(id)>=0;});
  if(hiddenAvail.length){
    h+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px">'+
      '<span style="font-size:11px;color:var(--text3);font-weight:700">Add aircraft:</span>';
    hiddenAvail.forEach(function(id){var col=_rzAcCol(id);h+='<button onclick="window.rezdyManAddAc(\''+id.replace(/'/g,"\\'")+'\')" style="font-size:12px;font-weight:700;padding:4px 11px;border-radius:16px;border:1px solid '+col+';background:transparent;color:'+col+';cursor:pointer">+ '+id.replace('ZK-','')+'</button>';});
    h+='</div>';
  }
  return h;
}
function _rzManSave(){
  if(typeof sbU==='function')sbU('ts_settings',[{key:'rz_manifest_'+S.rezdyDate,value:JSON.stringify({pax:S._rzManPax||[],pic:S._rzManPic||{},fuel:S._rzManFuel||{},hidden:S._rzManHidden||[],seats:S._rzManSeats||{}})}]).catch(function(){});
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
      S._rzManFuel=(v.fuel&&typeof v.fuel==='object')?v.fuel:{};
      S._rzManHidden=Array.isArray(v.hidden)?v.hidden:[];
      S._rzManSeats=(v.seats&&typeof v.seats==='object')?v.seats:{};
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
      S._rzManFuel=(v&&v.fuel&&typeof v.fuel==='object')?v.fuel:{};
      S._rzManHidden=(v&&Array.isArray(v.hidden))?v.hidden:[];
      S._rzManSeats=(v&&v.seats&&typeof v.seats==='object')?v.seats:{};
    }
    else{S._rzManPax=[];S._rzManPic={};S._rzManFuel={};S._rzManHidden=[];S._rzManSeats={};}
  }catch(e){S._rzManPax=S._rzManPax||[];S._rzManPic=S._rzManPic||{};S._rzManFuel=S._rzManFuel||{};S._rzManHidden=S._rzManHidden||[];S._rzManSeats=S._rzManSeats||{};}
  S._rzManLoaded=true;render();
};
window.rezdyManPull=function(){
  if(!S._rezdyBookings){if(window.rezdyLoadBookings)window.rezdyLoadBookings();toast('Loading bookings — tap Pull again in a moment.','info');return;}
  var existing={};(S._rzManPax||[]).forEach(function(p){existing[p.id]=p;});
  var out=[],skipped=0;
  (S._rezdyBookings||[]).forEach(function(b){
    if(/cancel/i.test(b.status||''))return;
    var order=String(b.orderNumber||'');
    // Only CHECKED-IN passengers appear in the manifest (with captured names + ACTUAL weights).
    var ci=_rzCheckinPax(order);
    if(!(S._rzBookingCheckedIn||{})[order]||!ci){skipped++;return;}
    var bal=parseFloat(b.balanceDue);var owing=isFinite(bal)&&bal>0;
    var acHint=_rzBookingAc(b,order);
    ci.forEach(function(r,i){
      var id=order+'|c'+i;var ex=existing[id];
      out.push({id:id,name:r.name||'',weight:(r.actual!=null?String(r.actual):''),type:r.type==='child'?'child':'adult',infantName:null,group:order,paymentReq:owing,ac:ex?ex.ac:null,acHint:acHint,infantOf:ex?ex.infantOf:undefined});
    });
  });
  (S._rzManPax||[]).forEach(function(p){if(String(p.id).indexOf('m_')===0)out.push(p);}); // keep manually-added
  S._rzManPax=out;_rzManSave();
  toast(out.length+' checked-in pax loaded'+(skipped?' · '+skipped+' booking'+(skipped===1?'':'s')+' not checked in':''),skipped?'warn':'ok');
  render();
};
window.rezdyManAdd=function(){
  var nm=prompt('Passenger name:');if(nm==null)return;
  var wt=prompt('Weight (kg) — leave blank for TBC:')||'';
  S._rzManPax=S._rzManPax||[];
  S._rzManPax.push({id:'m_'+Date.now()+'_'+Math.floor(Math.random()*1e4),name:String(nm).trim(),weight:String(wt).replace(/[^0-9.]/g,''),type:'adult',infantName:null,group:'manual',paymentReq:false,ac:null});
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
    var paxSeats=(typeof paxSeatIdxs==='function')?paxSeatIdxs(dest):[];var freeIdx=null;
    for(var i=0;i<paxSeats.length;i++){if(!sm[paxSeats[i]]){freeIdx=paxSeats[i];break;}}
    if(freeIdx!=null){sm[freeIdx]=p.id;S._rzManSeats[key]=sm;}
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
window.rezdyManEditWeight=function(id){var p=(S._rzManPax||[]).find(function(x){return x.id===id;});if(!p)return;var v=prompt('Actual weight (kg) for '+(p.name||'passenger')+':',p.weight||'');if(v==null)return;p.weight=String(v).replace(/[^0-9.]/g,'');var dep=_rzPaxDep(p);if(p.ac&&typeof window.rezdyManReseat==='function')window.rezdyManReseat(dep,p.ac);_rzManSave();render();};

// ── Manifest: departure scoping, seat allocation (W&B solver), per-aircraft W&B ──
function _rzManDepInfo(order){
  var b=(S._rezdyBookings||[]).find(function(x){return String(x.orderNumber||'')===String(order);});
  if(!b)return null;
  return {dep:_rzBookingDep(b),prod:_rzProduct((((b.items||[])[0]||{}).product)||'')};
}
function _rzPaxDep(p){if(!p)return '—';var i=_rzManDepInfo(p.group);return (i&&i.dep)||'—';}
// Distinct departures present in the manifest, sorted.
function _rzManDeps(){
  var set={};(S._rzManPax||[]).forEach(function(p){if(!p.infantOf)set[_rzPaxDep(p)]=1;});
  return Object.keys(set).sort();
}
function _rzManDepLabel(dep){
  // "0800 FCF" — find the product flown at this departure.
  var prod='';(S._rzManPax||[]).some(function(p){if(_rzPaxDep(p)===dep){var i=_rzManDepInfo(p.group);if(i&&i.prod){prod=i.prod;return true;}}return false;});
  return _rzEsc(dep)+(prod?' '+_rzEsc(prod):'');
}
function _rzSeatKey(dep,acId){return String(dep||'—')+'|'+acId;}
function _rzManSeatsFor(dep,acId){S._rzManSeats=S._rzManSeats||{};return S._rzManSeats[_rzSeatKey(dep,acId)]||{};}
// Build a loadsheet form for one departure's aircraft so we can run the shared W&B engine.
function _rzManAcForm(dep,acId){
  var a=S.aircraft[acId];if(!a)return null;
  var form=bF_ac(acId);form.date=S.rezdyDate||form.date;
  var picCode=(S._rzManPic||{})[acId];
  if(picCode){var pil=_rzPilotByCode(picCode);if(pil&&pil.name){form.pic=pil.name;form.names[0]=pil.name;if(pil.weight)form.seats[0]=String(pil.weight);}}
  var fuelDisp=(S._rzManFuel&&S._rzManFuel[acId]!=null&&S._rzManFuel[acId]!=='')?S._rzManFuel[acId]:fromKg(a.fuelKg,acId);
  form.fuel=String(toKg(fuelDisp,acId));
  var seats=_rzManSeatsFor(dep,acId);
  Object.keys(seats).forEach(function(idx){var p=(S._rzManPax||[]).find(function(x){return x.id===seats[idx];});if(!p)return;form.names[idx]=p.name||'';form.seats[idx]=(p.weight!=null&&p.weight!=='')?String(p.weight):'';if(p.type==='child')form.paxType[idx]='C';});
  return form;
}
function _rzManAcWB(dep,acId){try{var f=_rzManAcForm(dep,acId);return f?calcFormWB(f):null;}catch(e){return null;}}
// Re-seat one departure's aircraft using the shared seat-assignment engine (groups together,
// front-to-back). Returns the seat map.
window.rezdyManReseat=function(dep,acId){
  var list=(S._rzManPax||[]).filter(function(p){return p.ac===acId&&!p.infantOf&&_rzPaxDep(p)===dep;});
  var paxList=list.map(function(p){return {id:p.id,weight:parseFloat(p.weight)||0,bag:0,group:p.group||''};});
  var sm={};try{sm=assignSeats(acId,paxList)||{};}catch(e){sm={};}
  S._rzManSeats=S._rzManSeats||{};S._rzManSeats[_rzSeatKey(dep,acId)]=sm;
  return sm;
};
function _rzManCap(id){var a=S.aircraft[id];return (a&&a.seats)?paxSeatIdxs(id).length:0;}
// Allocate this departure's unallocated passengers to aircraft (booking-noted aircraft first,
// else first with capacity), then seat each aircraft via the W&B engine.
window.rezdyManAllocate=function(){
  var dep=S._rzManDepFilter;if(!dep){var ds=_rzManDeps();dep=ds[0];}
  var unalloc=(S._rzManPax||[]).filter(function(p){return !p.ac&&!p.infantOf&&_rzPaxDep(p)===dep;});
  if(!unalloc.length){if(typeof toast==='function')toast('Nothing to allocate for '+dep+'.','info');return;}
  var fleet=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(id){return S.aircraft&&S.aircraft[id]&&(S._rzManHidden||[]).indexOf(id)<0;});
  function load(id){return (S._rzManPax||[]).filter(function(p){return p.ac===id&&!p.infantOf&&_rzPaxDep(p)===dep;}).length;}
  unalloc.forEach(function(p){
    var hint=(p.acHint&&fleet.indexOf(p.acHint)>=0)?p.acHint:null;
    var target=(hint&&load(hint)<_rzManCap(hint))?hint:null;
    if(!target){for(var i=0;i<fleet.length;i++){if(load(fleet[i])<_rzManCap(fleet[i])){target=fleet[i];break;}}}
    if(target){p.ac=target;(S._rzManPax||[]).forEach(function(x){if(x.infantOf===p.id)x.ac=target;});}
  });
  fleet.forEach(function(id){window.rezdyManReseat(dep,id);});
  _rzManSave();render();
  if(typeof toast==='function')toast('Allocated '+unalloc.length+' to aircraft','ok');
};
// Drag a passenger bubble onto a specific seat. PIC seat (0) is locked. If the target seat is
// taken by someone in the SAME aircraft, the two swap; otherwise place and clear the old seat.
window.rezdyManDropSeat=function(dep,acId,idx,e){
  if(e&&e.preventDefault)e.preventDefault();if(e&&e.stopPropagation)e.stopPropagation();
  if(parseInt(idx)===0)return; // PIC seat is fixed
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
  var rows;try{rows=_rzAcRows(acId);}catch(e){rows=[];}
  if(!rows.length)return '';
  var seats=_rzManSeatsFor(dep,acId);
  var byId={};(S._rzManPax||[]).forEach(function(p){byId[p.id]=p;});
  var picCode=(S._rzManPic||{})[acId]||'';var pic=picCode?_rzPilotByCode(picCode):null;
  var depE=_rzEsc(dep).replace(/'/g,"\\'"),acE=acId.replace(/'/g,"\\'");
  var SW=82,SH=42;
  var h='<div style="display:flex;flex-direction:column;gap:5px;align-items:center;margin:8px 0 8px">';
  rows.forEach(function(r){
    h+='<div style="display:flex;gap:5px;justify-content:center">';
    r.forEach(function(idx){
      if(idx===0){ // PIC seat — locked, can't be moved
        h+='<div title="PIC'+(pic?' '+_rzEsc(pic.name):'')+'" style="width:'+SW+'px;height:'+SH+'px;border-radius:7px;border:1.5px solid #60a5fa;background:rgba(96,165,250,.12);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden">'+
          (pic?'<div style="font-size:9px;font-weight:800;color:#60a5fa;white-space:nowrap">✈ '+_rzEsc(pic.code)+' · PIC</div><div style="font-size:9px;font-weight:700;color:#60a5fa">'+(pic.weight?pic.weight+'kg':'set wt')+'</div>':'<div style="font-size:9px;color:#60a5fa;font-weight:700">PIC</div>')+
        '</div>';
        return;
      }
      var pid=seats[idx];var p=pid?byId[pid]:null;
      if(p){
        var gcol=_rzGroupColor(p.group||'');
        var nm=_rzEsc(String(p.name||'').split(/\s+/)[0]);
        var tbc=!p.weight;var wTxt=tbc?'TBC':_rzEsc(String(p.weight))+'kg';
        var isChild=p.type==='child';var inf=(S._rzManPax||[]).find(function(x){return x.infantOf===p.id;});var infN=p.infantName||(inf?String(inf.name||'').split(/\s+/)[0]:null);
        var idEsc=_rzEsc(p.id).replace(/'/g,"\\'");
        h+='<div draggable="true" ondragstart="window.rezdyManDragStart(\''+idEsc+'\',event)" ondragover="event.preventDefault()" ondrop="window.rezdyManDropSeat(\''+depE+'\',\''+acE+'\','+idx+',event)" title="'+_rzEsc(p.name||'')+'" style="position:relative;width:'+SW+'px;height:'+SH+'px;border-radius:7px;border:1.5px solid '+(p.paymentReq?'#ef4444':gcol)+';border-left:4px solid '+gcol+';background:rgba(255,255,255,.93);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;cursor:grab">'+
          (isChild?'<div style="position:absolute;bottom:2px;left:2px;font-size:7px;font-weight:900;background:rgba(251,146,60,.5);color:#c2500a;border-radius:2px;padding:0 2px">C</div>':'')+
          (infN?'<div title="Infant: '+_rzEsc(infN)+'" style="position:absolute;bottom:2px;right:2px;font-size:7px;font-weight:900;background:rgba(236,72,153,.5);color:#9d1768;border-radius:2px;padding:0 2px">i</div>':'')+
          '<div onclick="event.stopPropagation();window.rezdyManRemove(\''+idEsc+'\')" title="Remove" style="position:absolute;top:-1px;right:1px;font-size:9px;color:#94a3b8;cursor:pointer;padding:0 1px">✕</div>'+
          '<div style="font-size:9.5px;font-weight:700;color:#1e293b;white-space:nowrap;max-width:'+(SW-10)+'px;overflow:hidden;text-overflow:ellipsis">'+nm+'</div>'+
          '<div onclick="event.stopPropagation();window.rezdyManEditWeight(\''+idEsc+'\')" title="Tap to edit actual weight" style="font-size:8.5px;font-weight:700;color:'+(tbc?'#b45309':'#15803d')+';cursor:pointer">'+wTxt+'</div>'+
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
  var okT=wb.towOk,okC=wb.cogOk,ok=okT&&okC;
  var c=ok?'#4ade80':'#ef4444';
  return '<div style="font-size:10px;font-weight:700;color:'+c+';margin-bottom:6px;display:flex;gap:8px;flex-wrap:wrap">'+
    '<span>TOW '+Math.round(wb.tow)+'kg'+(okT?'':' ⚠')+'</span>'+
    '<span>CG '+(wb.towCog!=null?wb.towCog.toFixed(3):'—')+(okC?'':' ⚠')+'</span>'+
    '<span style="color:'+c+'">'+(ok?'✓ in envelope':'⚠ check W&B')+'</span></div>';
}

// ── Manifest PIC / fuel / aircraft controls ──
window.rezdyManDropPilot=function(acId,e){
  if(e&&e.preventDefault)e.preventDefault();if(e&&e.stopPropagation)e.stopPropagation();
  var code=S._schedPilotDrag;S._schedPilotDrag=null;if(!code||!acId)return;
  var pil=_rzPilotByCode(code);
  // Must hold Authority to act as PIC (profile flag) AND be type-rated (passed out) on this aircraft.
  if(pil&&!pil.picAuth){if(typeof toast==='function')toast(code+' is not PIC-eligible (enable it in their profile).','warn');return;}
  var en=(pil&&pil.endorse)||_rzPilotEndorse(code);
  if(en&&en.length&&en.indexOf(acId)<0){if(typeof toast==='function')toast(code+' is not passed out (type-rated) on '+String(acId).replace('ZK-','')+'.','warn');return;}
  S._rzManPic=S._rzManPic||{};S._rzManPic[acId]=code;_rzManSave();render();
};
window.rezdyManClearPic=function(acId){if(S._rzManPic)delete S._rzManPic[acId];_rzManSave();render();};
window.rezdyManFuel=function(acId,v){S._rzManFuel=S._rzManFuel||{};var n=String(v).replace(/[^0-9.]/g,'');if(n==='')delete S._rzManFuel[acId];else S._rzManFuel[acId]=n;_rzManSave();};
window.rezdyManDeleteAc=function(acId){
  (S._rzManPax||[]).forEach(function(p){if(p.ac===acId){p.ac=null;}}); // pax back to the pool
  if(S._rzManPic)delete S._rzManPic[acId];
  S._rzManHidden=S._rzManHidden||[];if(S._rzManHidden.indexOf(acId)<0)S._rzManHidden.push(acId);
  _rzManSave();render();
};
window.rezdyManAddAc=function(acId){if(!acId)return;S._rzManHidden=(S._rzManHidden||[]).filter(function(x){return x!==acId;});_rzManSave();render();};
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
  // PIC (manifest stores the 2-letter code → resolve to the crew name the loadsheet expects)
  var picCode=(S._rzManPic||{})[phys];
  if(picCode){
    var pil=_rzPilotByCode(picCode);
    if(pil&&pil.name){form.pic=pil.name;form.names[0]=pil.name;if(pil.weight)form.seats[0]=String(pil.weight);}
  }
  // Fuel: manifest display value (else standard) → kg
  var fuelDisp=(S._rzManFuel&&S._rzManFuel[phys]!=null&&S._rzManFuel[phys]!=='')?S._rzManFuel[phys]:fromKg(a.fuelKg,phys);
  form.fuel=String(toKg(fuelDisp,phys));
  // Seat the passengers at their manifest seat positions (run/refresh the seat plan first).
  var sm=_rzManSeatsFor(dep,phys);if(!sm||!Object.keys(sm).length)sm=(typeof window.rezdyManReseat==='function')?window.rezdyManReseat(dep,phys):{};
  var seatOf={};Object.keys(sm).forEach(function(idx){seatOf[sm[idx]]=parseInt(idx);});
  var cap=(a.seats?a.seats.length:0)-1,nextFree=1,overflow=0;
  var byId={};(S._rzManPax||[]).forEach(function(x){byId[x.id]=x;});
  list.forEach(function(p){
    var idx=seatOf[p.id];
    if(idx==null){while(nextFree<=cap&&(form.names[nextFree]||seatOf['__'+nextFree]))nextFree++;idx=nextFree;}
    if(idx>cap){overflow++;return;}
    form.names[idx]=p.name||'';
    form.seats[idx]=(p.weight!=null&&p.weight!=='')?String(p.weight):'';
    form.bags[idx]='';
    if(p.group)form.paxGroups[idx]=p.group;
    if(p.type==='child')form.paxType[idx]='C';
    if(p.paymentReq)form.paxPaymentReq[idx]=true;
    var inf=(S._rzManPax||[]).find(function(x){return x.infantOf===p.id;});
    var infNm=p.infantName||(inf?inf.name:null);
    if(infNm)form.infantNames[idx]=infNm;
  });
  if(overflow&&typeof toast==='function')toast(overflow+' pax over seat capacity — adjust on the loadsheet','warn');
  // Open as a new loadsheet tab + persist to the shared list (mirrors duplicateSaved).
  var newId='ls_rz_'+phys.replace('ZK-','')+'_'+Date.now();
  var savedAt=new Date().toISOString();
  form.status='unsigned';
  S.saved=S.saved||[];S.saved.push({id:newId,form:form,status:'unsigned',savedAt:savedAt});
  var acCode=phys.replace('ZK-','');
  S.lsForms=S.lsForms||{};S.lsForms[acCode]=form;S.lsAc=acCode;S.form=form;S.editId=newId;S.formDirty=false;
  S.lsTabs=S.lsTabs||[];S.lsTabs.push({id:newId,acId:phys,form:form,status:'unsigned',savedAt:savedAt,isNew:true});
  S.activeTabId=newId;S.section='operations';S.tab='loadsheet';
  if(typeof sbU==='function')sbU('ts_loadsheets',[{id:newId,form:form,saved_at:savedAt,status:'unsigned'}]).catch(function(){});
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
  S.activeTabId=newId;S.section='operations';S.tab='loadsheet';
  if(typeof sbU==='function')sbU('ts_loadsheets',[{id:newId,form:form,saved_at:savedAt,status:'unsigned'}]).catch(function(){});
  try{window.scrollTo(0,0);}catch(_){}render();
  if(typeof toast==='function')toast('Blank loadsheet started for '+acCode,'ok');
};
// ── Rezdy Loadsheets sub-tab — per-aircraft launcher that reuses the real loadsheet engine ──
function _rzRenderLoadsheets(){
  if(!S._rzManLoaded){if(window.rezdyLoadManifest)window.rezdyLoadManifest();return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading…</div>';}
  var pax=S._rzManPax||[];
  var fleet=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(id){return S.aircraft&&S.aircraft[id];});
  pax.forEach(function(p){if(p.ac&&fleet.indexOf(p.ac)<0)fleet.push(p.ac);});
  var withPax=fleet.filter(function(id){return pax.some(function(p){return p.ac===id&&!p.infantOf;});});
  var h='<div class="card"><div class="st" style="margin-bottom:4px">Loadsheets</div>'+
    '<p style="font-size:12px;color:var(--text3);margin:0 0 8px">'+_rzDowLabel(S.rezdyDate)+' · build from the manifest, or start a fresh blank loadsheet for any aircraft. Both open in the loadsheet editor and appear in Saved.</p>'+
    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span style="font-size:11px;color:var(--text3);font-weight:700">New blank:</span>';
  fleet.forEach(function(id){var c=_rzAcCol(id);h+='<button onclick="window.rezdyNewBlankLoadsheet(\''+id.replace(/'/g,"\\'")+'\')" style="font-size:12px;font-weight:700;padding:4px 11px;border-radius:16px;border:1px solid '+c+';background:transparent;color:'+c+';cursor:pointer">+ '+id.replace('ZK-','')+'</button>';});
  h+='</div></div>';
  if(!withPax.length){
    h+='<div class="card" style="text-align:center;padding:24px;color:var(--text3)">No aircraft have passengers allocated yet — allocate in the <b>Manifest</b> tab, or start a blank loadsheet above.</div>';
    return h;
  }
  h+='<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start">';
  withPax.forEach(function(id){
    var col=_rzAcCol(id);var a=S.aircraft[id];
    var list=pax.filter(function(p){return p.ac===id&&!p.infantOf;});
    var nA=0,nC=0,nI=0;list.forEach(function(p){if(p.type==='child')nC++;else nA++;if(p.infantName)nI++;});
    nI+=pax.filter(function(p){return p.ac===id&&p.infantOf;}).length;
    var picCode=(S._rzManPic||{})[id]||'';
    var unit=(a&&a.layout==='ga8')?'L':'lbs';
    var std=a?Math.round(fromKg(a.fuelKg,id)):0;
    var fuelVal=(S._rzManFuel&&S._rzManFuel[id]!=null&&S._rzManFuel[id]!=='')?S._rzManFuel[id]:std;
    var existing=(S.saved||[]).filter(function(s){return s.id&&String(s.id).indexOf('ls_rz_'+id.replace('ZK-',''))===0&&s.form&&s.form.date===S.rezdyDate;});
    var idE=id.replace(/'/g,"\\'");
    h+='<div style="flex:1 1 240px;min-width:230px;background:var(--card);border:1px solid var(--border);border-top:3px solid '+col+';border-radius:10px;padding:12px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><div style="font-weight:800;font-size:15px;color:'+col+'">'+id.replace('ZK-','')+'</div><span style="font-size:11px;font-weight:700;color:var(--text2)">'+(nA+'A'+(nC?nC+'C':'')+(nI?nI+'i':''))+'</span></div>'+
      '<div style="font-size:12px;color:var(--text2);margin-bottom:8px">PIC '+(picCode?'<b style="color:#60a5fa">'+_rzEsc(picCode)+'</b>':'<span style="color:var(--text3)">—</span>')+' · Fuel '+_rzEsc(String(fuelVal))+' '+unit+(fuelVal!=std?' <span style="color:var(--text3)">(std '+std+')</span>':'')+'</div>'+
      '<button class="btn btn-primary" style="width:100%;padding:8px;font-size:12px" onclick="window.rezdyManCreateLoadsheet(\''+idE+'\')">📋 Create loadsheet</button>';
    if(existing.length){
      h+='<div style="margin-top:8px;border-top:1px solid var(--border2);padding-top:6px">';
      existing.forEach(function(s){var signed=s.status==='complete'||s.status==='signed'||(s.form&&s.form.sig);h+='<button class="btn btn-ghost" style="width:100%;font-size:11px;margin-top:4px;text-align:left" onclick="window.viewSaved(\''+String(s.id).replace(/'/g,"\\'")+'\')">'+(signed?'✓ ':'○ ')+'Open loadsheet</button>';});
      h+='</div>';
    }
    h+='</div>';
  });
  h+='</div>';
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
  if(!_pilots.length){pilotsBar+='<div style="font-size:12px;color:var(--text3)">No pilots rostered on for this day.</div>';}
  else{
    pilotsBar+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
    _pilots.forEach(function(p){pilotsBar+='<div draggable="true" ondragstart="window.rezdySchedPilotDragStart(\''+_rzEsc(p.code).replace(/'/g,"\\'")+'\',event)" title="'+_rzEsc(p.name)+' — drag onto a flight block" style="display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:16px;background:rgba(96,165,250,.14);border:1px solid rgba(96,165,250,.5);cursor:grab;font-size:12px;font-weight:800;color:#60a5fa">✈ '+_rzEsc(p.code)+'</div>';});
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
    S._rezdyBookings=(brows||[]).map(_rzRow).filter(Boolean);
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
