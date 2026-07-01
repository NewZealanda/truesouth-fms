// === MODULE: availability === v1.0 ===
// ─────────────────────────────────────────────────────────────────────────────
// Availability engine — Phase 0.5 of the bespoke booking platform.
//
// ONE source of truth for "how many seats can I actually sell on this departure
// right now?", consolidating what used to be scattered across the bookings chips
// and the Rezdy availability table:
//   fleet capacity (flyable aircraft seats)
//     − committed pax already booked at that departure (Rezdy + native bookings)
//     capped by Rezdy's reported availability (during coexistence, so we never
//        oversell a channel Rezdy controls)
//     − active seat HOLDS (soft-locks for in-progress checkouts, Phase 1+)
//   = sellable.
//
// The direct-booking checkout (Phase 1) and the agent portal (Phase 2) both call
// availForDep()/availDay() and availHold()/availReleaseHold(). Everything fails soft.
// ─────────────────────────────────────────────────────────────────────────────

var _AV_FLEET=['ZK-SLA','ZK-SLB','ZK-SDB','ZK-SLD','ZK-SLQ'];

// Pure core — kept separate so it's unit-testable without app state.
// sellable = max(0, min(fleetRemaining, rezdyReported?) − held).
function _availCompute(fleetSeats,committed,rezdyReported,held){
  var fleetRemaining=Math.max(0,(fleetSeats||0)-(committed||0));
  var capBase=(rezdyReported!=null)?Math.min(fleetRemaining,rezdyReported):fleetRemaining;
  var sellable=Math.max(0,capBase-(held||0));
  return {fleetRemaining:fleetRemaining,capBase:capBase,sellable:sellable};
}

// Total flyable fleet seats for a date (a+c capacity; PIC seat already excluded by the cap helper).
// Matches the bookings-chip fleet calc so the engine and the chips agree.
function _availFleetSeats(date){
  var n=0;
  _AV_FLEET.forEach(function(ac){
    if(!((S.aircraft||{})[ac]))return;
    if(typeof _schedAcCanFly==='function'&&!_schedAcCanFly(ac))return;
    var cap=null;
    if(typeof _schedTail==='function'){var t=_schedTail(ac);cap=(typeof _schedNum==='function')?_schedNum(t&&t.cap):(t&&t.cap);}
    if(cap==null&&typeof _schedDefaultCap==='function')cap=_schedDefaultCap(ac);
    n+=(+cap||0);
  });
  return n;
}

// Committed pax (adults+children; infants are lap) per departure slot for the loaded bookings.
// Flybacks are counted in the OUTBOUND slot they're held in (mirrors the bookings-chip logic).
function _availCommittedBySlot(){
  var bySlot={};
  (S._rezdyBookings||[]).forEach(function(b){
    if(typeof _rzIsCancelled==='function'&&_rzIsCancelled(b))return;
    if(typeof _rzIsNoShow==='function'&&_rzIsNoShow(String((b&&b.orderNumber)||'')))return;
    var e=(typeof _rzEffBreakdown==='function')?_rzEffBreakdown(b):{a:0,c:0};
    var pax=(e.a||0)+(e.c||0);if(!pax)return;
    var slot;
    if(typeof _rzBookingIsFlyback==='function'&&_rzBookingIsFlyback(b)){
      var fbIt=((b.items||[]).find(function(it){return _rzIsFlyback(_rzProduct(it&&it.product));}))||{};
      slot=(typeof _rzDepTime==='function')?_rzDepTime(fbIt.startTimeLocal||''):'';
    } else {
      slot=(typeof _rzBookingDep==='function')?_rzBookingDep(b):'';
    }
    if(slot)bySlot[slot]=(bySlot[slot]||0)+pax;
  });
  return bySlot;
}

// ── Seat holds (soft-locks) ─────────────────────────────────────────────────
// S._availHolds = [{id,tour_date,dep,dest,seats,expires_at,by}]. Loaded per date.
window.availLoadHolds=async function(date){
  date=date||S.rezdyDate;
  try{
    var rows=await sbF('ts_session_holds','&tour_date=eq.'+encodeURIComponent(date),'created_at');
    S._availHolds=(rows||[]).map(function(r){return {id:r.id,tour_date:r.tour_date,dep:String(r.dep||''),dest:r.dest||'',seats:+r.seats||0,expires_at:r.expires_at,by:r.created_by};});
  }catch(e){S._availHolds=S._availHolds||[];}
  return S._availHolds;
};
// Active (unexpired) held seats for a departure.
function _availHeldSeats(date,dep){
  var now=Date.now(),s=0;
  (S._availHolds||[]).forEach(function(h){
    if(h.tour_date!==date||h.dep!==String(dep))return;
    if(new Date(h.expires_at).getTime()<=now)return;   // expired → ignored
    s+=(+h.seats||0);
  });
  return s;
}
// Place a hold: N seats on (date, dep) for `minutes` (default 15). Returns the row (or null).
window.availHold=async function(date,dep,seats,minutes,dest){
  date=date||S.rezdyDate;dep=String(dep||'');seats=Math.max(1,parseInt(seats,10)||1);
  var mins=Math.max(1,parseInt(minutes,10)||15);
  var id=date+'|'+dep+'|'+Date.now().toString(36).slice(-6);
  var row={id:id,tour_date:date,dep:dep,dest:dest||'',seats:seats,expires_at:new Date(Date.now()+mins*60000).toISOString(),created_by:(S.user&&S.user.id)||null};
  S._availHolds=S._availHolds||[];S._availHolds.push({id:id,tour_date:date,dep:dep,dest:dest||'',seats:seats,expires_at:row.expires_at,by:row.created_by});
  try{await sbU('ts_session_holds',[row]);}catch(e){}
  if(typeof safeRender==='function')safeRender();
  return row;
};
// Release a hold by id (e.g. checkout completed → convert to booking, or abandoned).
window.availReleaseHold=async function(id){
  id=String(id||'');if(!id)return false;
  S._availHolds=(S._availHolds||[]).filter(function(h){return h.id!==id;});
  try{await sbDel('ts_session_holds',id);}catch(e){}
  if(typeof safeRender==='function')safeRender();
  return true;
};

// ── Public engine API ───────────────────────────────────────────────────────
// Sellable seats + the full breakdown for one departure (HHMM) on a date.
window.availForDep=function(date,dep){
  date=date||S.rezdyDate;dep=String(dep||'');
  var fleetSeats=_availFleetSeats(date);
  var committed=(_availCommittedBySlot()[dep])||0;
  var rezdyReported=(typeof _avSeatsForDep==='function')?_avSeatsForDep(date,dep):null;
  var held=_availHeldSeats(date,dep);
  var c=_availCompute(fleetSeats,committed,rezdyReported,held);
  return {dep:dep,fleetSeats:fleetSeats,committed:committed,fleetRemaining:c.fleetRemaining,rezdyReported:rezdyReported,held:held,sellable:c.sellable};
};
// Every departure with bookings today → its availability breakdown, sorted by time.
window.availDay=function(date){
  date=date||S.rezdyDate;
  var slots={};Object.keys(_availCommittedBySlot()).forEach(function(k){slots[k]=1;});
  // Include any Rezdy-scheduled departures too (even with no bookings yet).
  if(typeof _avDepsForProduct==='function'){['Milford Sound Fly Cruise Fly'].forEach(function(pn){(_avDepsForProduct(date,pn)||[]).forEach(function(hhmm){slots[hhmm]=1;});});}
  return Object.keys(slots).filter(function(d){return d&&d!=='—'&&/^\d{3,4}$/.test(d);}).sort().map(function(d){return window.availForDep(date,d);});
};

// ── Read-only diagnostic panel (Bookings page) ──────────────────────────────
// Shows the engine's numbers per departure so the desk can see/verify sellable seats.
window.renderAvailEnginePanel=function(date){
  date=date||S.rezdyDate;
  var rows=window.availDay(date);
  if(!rows.length)return '<div style="font-size:12px;color:var(--text3)">No departures to price yet for this day.</div>';
  var cell=function(v,strong,col){return '<td style="padding:5px 9px;text-align:right;font-variant-numeric:tabular-nums;'+(strong?'font-weight:800;':'')+(col?'color:'+col+';':'')+'">'+v+'</td>';};
  var head=['Departure','Fleet','Booked','Rezdy cap','Held','Sellable'];
  var h='<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;font-size:12px">'+
    '<thead><tr style="color:var(--text3);text-align:right">'+head.map(function(x,i){return '<th style="padding:5px 9px;font-weight:700;'+(i===0?'text-align:left':'')+'">'+x+'</th>';}).join('')+'</tr></thead><tbody>';
  rows.forEach(function(r){
    var col=r.sellable<=0?'#ef4444':(r.sellable<=2?'#f59e0b':'#22c55e');
    h+='<tr style="border-top:1px solid var(--border2)">'+
      '<td style="padding:5px 9px;font-weight:700;color:var(--text1)">'+_rzEsc((typeof _rzDepDisplay==='function'?_rzDepDisplay(r.dep):r.dep))+'</td>'+
      cell(r.fleetSeats)+cell(r.committed)+cell(r.rezdyReported==null?'—':r.rezdyReported)+cell(r.held||0)+cell(r.sellable,true,col)+
    '</tr>';
  });
  h+='</tbody></table></div>'+
    '<div style="font-size:10.5px;color:var(--text3);margin-top:6px">Sellable = flyable fleet seats − booked, capped by Rezdy’s live number, minus any active holds. This is the engine the direct-booking &amp; agent flows will read.</div>';
  return h;
};
