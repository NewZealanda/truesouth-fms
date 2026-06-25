// === MODULE: rezdy_c === v26.24 ===
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
// ── Printable bookings run-sheet (the whole day, grouped by departure) ─────────
function _rzBkPrintRow(b){
  var e=_rzEffBreakdown(b);
  var px=((e.a?e.a+'A':'')+(e.c?' '+e.c+'C':'')+(e.i?' '+e.i+'i':'')).trim()||'—';
  var prod=_rzProduct((((b.items||[])[0]||{}).product)||'');
  var pk='';(b.items||[]).some(function(it,ii){if(!it.pickup)return false;var id=String(b.orderNumber||'')+'|'+(it.product||'')+'|'+(it.startTimeLocal||'')+'|'+ii;var ov=(S._pickupLocOverride||{});var loc=(ov[id]!=null&&ov[id]!=='')?ov[id]:it.pickup;var pt=_rzDepTime(it.pickupTime||'');pk=(pt?pt+' · ':'')+loc;return true;});
  var bal=parseFloat(b.balanceDue);var owing=isFinite(bal)&&bal>0;
  var ac=_rzBookingAc(b,String(b.orderNumber||''));
  var acCell=ac?('<span style="display:inline-block;border:1.5px solid '+_rzAcCol(ac)+';color:'+_rzAcCol(ac)+';border-radius:10px;padding:1px 7px;font-weight:bold;font-size:10px;white-space:nowrap">'+_rzEsc(String(ac).replace('ZK-',''))+'</span>'):'—';
  return '<tr><td>'+_rzEsc(b.customerName||'')+(b.phone?'<div class="ph">'+_rzEsc(b.phone)+'</div>':'')+'</td>'
    +'<td>'+_rzEsc(b.orderNumber||'')+'</td>'
    +'<td class="c">'+_rzEsc(px)+'</td>'
    +'<td>'+_rzEsc(prod||'')+'</td>'
    +'<td class="c">'+acCell+'</td>'
    +'<td>'+_rzEsc(pk||'—')+'</td>'
    +'<td class="r">'+(owing?_rzEsc(_rzMoney(bal,b.currency))+' owing':'Paid')+'</td></tr>';
}
window.rezdyBookingsPrint=function(){
  var allRows=(S._rezdyBookings||[]).slice();
  var active=allRows.filter(function(b){return !_rzIsCancelled(b);});
  var cancelled=allRows.filter(function(b){return _rzIsCancelled(b);});
  if(!allRows.length){if(typeof toast==='function')toast('No bookings to print for this day.','warn');return;}
  var byDep={};active.forEach(function(b){var d=_rzBookingDep(b);(byDep[d]=byDep[d]||[]).push(b);});
  var deps=Object.keys(byDep).sort(_rzDepCmp);
  var section=function(d,grp){
    var gbd={a:0,c:0,i:0};grp.forEach(function(x){var e=_rzEffBreakdown(x);gbd.a+=e.a;gbd.c+=e.c;gbd.i+=e.i;});
    var prod='';grp.some(function(b){var c=_rzProduct((((b.items||[])[0]||{}).product)||'');if(c){prod=c;return true;}return false;});
    var rows=grp.slice().sort(function(a,b){return String(a.customerName||'').localeCompare(String(b.customerName||''));});
    return '<div class="dep"><div class="dh">'+_rzEsc(_rzDepDisplay(d))+(prod?' '+_rzEsc(prod):'')
      +' <span class="dc">'+rows.length+' bkg · '+gbd.a+'A'+(gbd.c?' '+gbd.c+'C':'')+(gbd.i?' '+gbd.i+'i':'')+'</span></div>'
      +'<table class="bk"><thead><tr><th>Customer</th><th>Order</th><th class="c">Pax</th><th>Product</th><th class="c">Aircraft</th><th>Pickup</th><th class="r">Balance</th></tr></thead><tbody>'
      +rows.map(_rzBkPrintRow).join('')+'</tbody></table></div>';
  };
  var bodyH=deps.map(function(d){return section(d,byDep[d]);}).join('');
  if(cancelled.length){
    var crows=cancelled.slice().sort(function(a,b){return _rzDepCmp(_rzBookingDep(a),_rzBookingDep(b));});
    bodyH+='<div class="dep"><div class="dh" style="color:#b91c1c;border-color:#b91c1c">✕ Cancelled <span class="dc">'+cancelled.length+'</span></div>'
      +'<table class="bk"><thead><tr><th>Customer</th><th>Order</th><th class="c">Pax</th><th>Product</th><th>Departure</th></tr></thead><tbody>'
      +crows.map(function(b){var e=_rzEffBreakdown(b);var px=((e.a?e.a+'A':'')+(e.c?' '+e.c+'C':'')+(e.i?' '+e.i+'i':'')).trim()||'—';return '<tr><td>'+_rzEsc(b.customerName||'')+'</td><td>'+_rzEsc(b.orderNumber||'')+'</td><td class="c">'+_rzEsc(px)+'</td><td>'+_rzEsc(_rzProduct((((b.items||[])[0]||{}).product)||''))+'</td><td>'+_rzEsc(_rzDepDisplay(_rzBookingDep(b)))+'</td></tr>';}).join('')
      +'</tbody></table></div>';
  }
  var w=window.open('','_blank','width=920,height=760');
  if(!w){if(typeof toast==='function')toast('Allow pop-ups to print the bookings.','warn');return;}
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bookings — '+_rzEsc(_rzDowLabel(S.rezdyDate))+'</title><style>'
    +'*{box-sizing:border-box;margin:0;padding:0}'
    +'body{background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;padding:9mm}'
    +'@page{size:A4 portrait;margin:9mm}'
    +'h1{font-size:19px}.sub{font-size:12px;color:#555;margin:2px 0 12px}'
    +'.dep{margin-bottom:14px;page-break-inside:avoid}'
    +'.dh{font-size:15px;font-weight:800;border-bottom:2px solid #222;padding-bottom:3px;margin-bottom:5px}'
    +'.dc{font-size:11px;font-weight:600;color:#666}'
    +'table.bk{width:100%;border-collapse:collapse}'
    +'.bk th,.bk td{border:1px solid #aaa;padding:4px 7px;font-size:12.5px;text-align:left;vertical-align:top}'
    +'.bk th{background:#eee;font-size:10px;text-transform:uppercase;letter-spacing:.03em}'
    +'.bk .c{text-align:center}.bk .r{text-align:right}'
    +'.ph{font-size:10px;color:#777}'
    +'</style></head><body>'
    +'<h1>Bookings — '+_rzEsc(_rzDowLabel(S.rezdyDate))+'</h1>'
    +'<div class="sub">'+active.length+' active'+(cancelled.length?' · '+cancelled.length+' cancelled':'')+'</div>'
    +bodyH
    +'<script>window.onload=function(){window.print();}<\/script>'
    +'</body></html>');
  w.document.close();
};
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
function _rzManAcForm(dep,acId,smOverride){
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
  var seats=smOverride||_rzManSeatsFor(dep,acId);
  var declMode=_rzManDeclMode(dep,acId);
  Object.keys(seats).forEach(function(idx){if(coCode&&String(idx)==='1')return;var p=(S._rzManPax||[]).find(function(x){return x.id===seats[idx];});if(!p)return;form.names[idx]=p.name||'';var wv=_rzPaxWeight(p,declMode);form.seats[idx]=(wv!=null&&wv!=='')?String(wv):'';if(p.type==='child')form.paxType[idx]='C';});
  var cargo=_rzManCargoFor(dep,acId);form.cargo=form.cargo||{};Object.keys(cargo).forEach(function(zi){form.cargo[zi]=String(cargo[zi]);});
  return form;
}
function _rzManAcWB(dep,acId){try{var f=_rzManAcForm(dep,acId);return f?calcFormWB(f):null;}catch(e){return null;}}
// Would a CANDIDATE seat map (idx → pax id) keep this aircraft within W&B limits? Builds the same
// form the loadsheet would, but seats from the candidate plan rather than the committed one.
function _rzCandWBOk(dep,acId,sm){try{if(!sm||!Object.keys(sm).length)return false;var f=_rzManAcForm(dep,acId,sm);if(!f)return false;var r=calcFormWB(f);return !!(r&&r.towOk&&r.lwOk&&r.cogOk);}catch(e){return false;}}
// Re-seat one departure's aircraft using the shared seat-assignment engine (groups together,
// front-to-back). Returns the seat map.
// Rules-based seatmap seater (Andrew's rules). Returns idx→paxId. Used as the FIRST candidate in
// rezdyManReseat and only accepted when it seats EVERYONE and stays within W&B (else the proven
// assignSeats / heavy-front engines take over). Rules:
//  • keep booking groups together (across the aisle = a pair row, or the next row if >2);
//  • centre of gravity as far forward as we can (heaviest groups + members toward the front);
//  • the front single seat (seat 1, when it's a pax seat) gets a SOLO or one member of an ODD group,
//    with the rest of that group in the consecutive seats;
//  • infant-carrying groups seated toward the BACK, host in the rearmost seat of the group.
function _rzSmartSeat(acId,paxList,opts){
  var a=S.aircraft[acId];if(!a||!a.seats||!paxList||!paxList.length)return{};
  var coPilot=(opts&&opts.coSeat1!=null)?opts.coSeat1:seat1IsCoPilot(acId);
  var rows=rowPairsForAc(acId,coPilot);if(!rows.length)return{};   // front→back, each [idx] or [idx,idx]
  var arm=function(i){return (a.seats[i]&&a.seats[i].arm)||0;};
  var wOf=function(p){var w=parseFloat(p&&p.weight);return isNaN(w)?0:w;};
  var gMap={};
  paxList.forEach(function(p){var key=(p.group&&String(p.group).trim())||('solo:'+p.id);(gMap[key]||(gMap[key]={pax:[]})).pax.push(p);});
  var groups=Object.keys(gMap).map(function(k){var g=gMap[k];g.w=g.pax.reduce(function(s,p){return s+wOf(p);},0);g.size=g.pax.length;g.inf=g.pax.some(function(p){return p.infant;});return g;});
  // Front single seat (seat 1 used as a pax seat) = a 1-seat row at the very front.
  var frontSingle=(rows[0]&&rows[0].length===1&&!coPilot)?rows[0][0]:null;
  // Flat list of the PAIR-row seats, front→back (these tile two-per-row).
  var P=[];(frontSingle!=null?rows.slice(1):rows).forEach(function(r){r.forEach(function(s){P.push(s);});});
  var result={};
  // Seat one group across its seats: heaviest member most-forward, infant host rearmost.
  function assignGroup(g,seats){
    var byArm=seats.slice().sort(function(x,y){return arm(x)-arm(y);});               // front→back
    var nonInf=g.pax.filter(function(p){return !p.infant;}).sort(function(x,y){return wOf(y)-wOf(x);});
    var mem=nonInf.concat(g.pax.filter(function(p){return p.infant;}));               // infant host last → rear
    byArm.forEach(function(s,i){if(mem[i])result[s]=mem[i].id;});
  }
  // Classify (non-infant by parity; infants always handled last → back).
  var solos=groups.filter(function(g){return g.size===1&&!g.inf;}).sort(function(x,y){return y.w-x.w;});
  var evens=groups.filter(function(g){return g.size>=2&&g.size%2===0&&!g.inf;}).sort(function(x,y){return y.w-x.w;});
  var odds =groups.filter(function(g){return g.size>=3&&g.size%2===1&&!g.inf;}).sort(function(x,y){return y.w-x.w;});
  var infs =groups.filter(function(g){return g.inf;}).sort(function(x,y){return y.w-x.w;});

  // Build the seat sequence + group fill order so that:
  //  • a SOLO takes the front single seat (or, failing a solo, one member of an odd group anchors it);
  //  • EVEN groups tile WHOLE pair-rows (sit side-by-side across the aisle) — so they lead the pair seats;
  //  • ODD groups + extra solos fill the remaining pair seats contiguously (their odd seat shares a row
  //    with the next group — a clean group boundary);
  //  • INFANT groups come LAST → the rear rows, host in the rearmost seat.
  var seq, frontFill;
  if(frontSingle!=null&&!solos.length&&odds.length){
    // No solo to take the front single → let an odd group anchor it; odds lead so they stay contiguous.
    seq=[frontSingle].concat(P);
    frontFill=odds.concat(evens).concat(solos);
  }else{
    if(frontSingle!=null&&solos.length){result[frontSingle]=solos.shift().pax[0].id;} // heaviest solo → front single
    seq=P.slice();                                                                     // front single (if any) handled / left empty
    frontFill=evens.concat(odds).concat(solos);                                        // evens first → pair-aligned
  }
  // Reserve the REAR seats for infant groups (so the host genuinely sits in the back row), and fill the
  // non-infant groups from the front into what's left.
  var infTotal=infs.reduce(function(s,g){return s+g.size;},0);
  var frontLimit=Math.max(0,seq.length-infTotal);
  var lo=0;
  frontFill.forEach(function(g){var seats=[];for(var k=0;k<g.size&&lo<frontLimit;k++)seats.push(seq[lo++]);if(seats.length)assignGroup(g,seats);});
  var bi=frontLimit;
  infs.forEach(function(g){var seats=[];for(var k=0;k<g.size&&bi<seq.length;k++)seats.push(seq[bi++]);if(seats.length)assignGroup(g,seats);});
  // Anyone still unseated (front fillers overran the reserved tail) → drop into any remaining seat.
  var taken={};Object.keys(result).forEach(function(s){taken[result[s]]=1;});
  var freeSeats=seq.filter(function(s){return result[s]==null;});if(frontSingle!=null&&result[frontSingle]==null)freeSeats.unshift(frontSingle);
  var fi=0;groups.forEach(function(g){g.pax.forEach(function(p){if(!taken[p.id]&&fi<freeSeats.length){result[freeSeats[fi++]]=p.id;taken[p.id]=1;}});});
  return result;
}
window.rezdyManReseat=function(dep,acId){
  var list=(S._rzManPax||[]).filter(function(p){return p.ac===acId&&!p.infantOf&&_rzPaxDep(p)===dep;});
  var _declMode=(typeof _rzManDeclMode==='function')?_rzManDeclMode(dep,acId):false;
  // Use the EFFECTIVE weight (actual if captured, else declared) so the heavy-front solver can
  // balance CoG even before actual weights are entered.
  var _allPax=S._rzManPax||[];
  var paxList=list.map(function(p){
    var w=parseFloat((typeof _rzPaxWeight==='function')?_rzPaxWeight(p,_declMode):p.weight);
    if(isNaN(w)){var d=parseFloat(p.declared);w=isNaN(d)?0:d;}
    var hasInf=!!(p.infantName)||_allPax.some(function(x){return x.infantOf===p.id;}); // host of a lap infant
    return {id:p.id,weight:w,bag:0,group:p.group||'',infant:hasInf};
  });
  var _coPic=!!(S._rzManCoPic||{})[acId];
  // Prefer keeping booking groups in CONSECUTIVE rows (the groups-first seater), but only when that
  // arrangement still keeps weight & balance within limits. Otherwise fall back to the heavy-front
  // seater (heaviest forward) which optimises CoG even if it splits a group.
  var sm={};
  try{
    var smS=(typeof _rzSmartSeat==='function')?(_rzSmartSeat(acId,paxList,{coSeat1:_coPic})||{}):{};  // Andrew's rules
    if(Object.keys(smS).length===paxList.length&&_rzCandWBOk(dep,acId,smS)){sm=smS;}                   // accept only if it seats EVERYONE within W&B
    else{
      var smG=assignSeats(acId,paxList,{coSeat1:_coPic})||{};            // groups-first → consecutive rows
      if(Object.keys(smG).length&&_rzCandWBOk(dep,acId,smG)){sm=smG;}
      else{var smH=assignSeatsHeavyFront(acId,paxList,{coSeat1:_coPic})||{};sm=Object.keys(smH).length?smH:smG;}
    }
  }catch(e){try{sm=assignSeatsHeavyFront(acId,paxList,{coSeat1:_coPic})||{};}catch(e2){sm={};}}
  if(_coPic)_rzReserveCoSeat(sm,acId); // safety: ensure seat 1 stays clear for the co-pilot
  // Lap-infant rule on the seatmap: keep an infant host out of the front seat (the groups-first
  // seater doesn't guard internally; heavy-front already does).
  try{sm=_seatMapInfantGuard(sm,acId,paxList,_coPic)||sm;}catch(e){}
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
  // Distinct groups ON THIS AIRCRAFT (seated + overflow), so each gets a clearly-different colour.
  var _seatGrps=[];(S._rzManPax||[]).forEach(function(pp){if(pp&&pp.ac===acId&&!pp.infantOf&&_rzPaxDep(pp)===dep&&pp.group){var gg=String(pp.group);if(_seatGrps.indexOf(gg)<0)_seatGrps.push(gg);}});_seatGrps.sort();
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
        var gcol=_rzGroupColor(p.group||'',_seatGrps);
        var nm=_rzEsc(String(p.name||'').split(/\s+/)[0]);
        var wv=_rzPaxWeight(p,declMode);
        var tbc=(wv==null||wv==='');var decld=!tbc&&declMode;
        var wTxt=tbc?'TBC':(_rzEsc(String(wv))+'kg'+(decld?' (d)':''));
        var wCol=tbc?'#b45309':(decld?'#dc2626':'#15803d');
        var isChild=p.type==='child';var inf=(S._rzManPax||[]).find(function(x){return x.infantOf===p.id;});var infN=p.infantName||(inf?String(inf.name||'').split(/\s+/)[0]:null);
        var idEsc=_rzEsc(p.id).replace(/'/g,"\\'");
        h+='<div class="pax-bubble" draggable="true" ondragstart="window.rezdyManDragStart(\''+idEsc+'\',event)" ondragover="event.preventDefault()" ondrop="window.rezdyManDropSeat(\''+depE+'\',\''+acE+'\','+idx+',event)" title="'+_rzEsc(p.name||'')+'" style="position:relative;width:'+SW+'px;height:'+SH+'px;border-radius:7px;border:1.5px solid '+(p.paymentReq?'#ef4444':gcol)+';border-left:4px solid '+gcol+';background:rgba(255,255,255,.93);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;cursor:grab">'+
          (isChild?'<div title="Child" style="position:absolute;bottom:2px;right:2px;font-size:10px;font-weight:900;background:#f97316;color:#fff;border-radius:3px;padding:0 4px;line-height:1.4;box-shadow:0 1px 2px rgba(0,0,0,.3)">C</div>':'')+
          (infN?'<div title="Infant: '+_rzEsc(infN)+'" style="position:absolute;bottom:2px;'+(isChild?'left:2px':'right:2px')+';font-size:10px;font-weight:900;background:#ec4899;color:#fff;border-radius:3px;padding:0 4px;line-height:1.4;box-shadow:0 1px 2px rgba(0,0,0,.3)">i</div>':'')+
          '<div onclick="event.stopPropagation();window.rezdyManRemove(\''+idEsc+'\')" title="Send to the unallocated pool" style="position:absolute;top:-1px;right:1px;font-size:9px;color:#94a3b8;cursor:pointer;padding:0 1px">✕</div>'+
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
  S._rzManCargo[key]=c;_rzManSave();if(typeof safeRender==='function')safeRender();
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
window.rezdyManFuel=function(acId,v){S._rzManFuel=S._rzManFuel||{};var n=String(v).replace(/[^0-9.]/g,'');if(n==='')delete S._rzManFuel[acId];else S._rzManFuel[acId]=n;_rzManSave();if(typeof safeRender==='function')safeRender();};
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
  // Set the value only — let etdSelect() decide preset-chip vs custom box. Forcing etdCustom
  // here made standard times (that match a preset) render in an EMPTY custom box.
  if(_etd&&/^\d{1,2}:\d{2}$/.test(_etd))form.etd=_etd;
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
  // Real occupancy set so the fallback seat-advance can't drop a pax onto a seat another pax
  // already owns (R-A). Reserve the co-pilot seat + every EXPLICIT manifest seat up front, then
  // mark seats used as they're filled. (The old guard tested seatOf['__'+n], a key that never
  // existed, so only form.names[n] was checked and a later seat-owner could be overwritten.)
  var used={};if(_hasCo)used[1]=1;
  list.forEach(function(p){var si=seatOf[p.id];if(si!=null&&!(_hasCo&&si===1)&&si>=1&&si<=cap)used[si]=1;});
  list.forEach(function(p){
    var idx=seatOf[p.id];
    if(_hasCo&&idx===1)idx=null; // seat 1 is the co-pilot's
    if(idx==null){while(nextFree<=cap&&(used[nextFree]||form.names[nextFree]))nextFree++;idx=nextFree;}
    if(idx>cap){overflow++;return;}
    used[idx]=1; // claim it so no later fallback pax reuses this seat
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
  // Lap-infant rule: never in the front seat; prefer the last row when W&B still checks out.
  try{if(typeof _lsInfantFrontGuard==='function')_lsInfantFrontGuard(form,phys,_hasCo);}catch(e){}
  try{if(typeof _lsInfantRearPref==='function')_lsInfantRearPref(form,phys,_hasCo);}catch(e){}
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
    if(window._lsStickyMark)window._lsStickyMark(s.id,'deleted',true);
    if(typeof lsSet==='function')lsSet('ts_loadsheets_cache',S.saved);
    if(typeof auditLog==='function')auditLog('loadsheet_bin',{id:s.id,ac:(s.form&&s.form.ac)||''});
    if(typeof sbU==='function')sbU('ts_loadsheets',[{id:s.id,form:s.form,saved_at:s.savedAt,status:'deleted',drive_uploaded:!!s.driveUploaded}]).catch(function(){});
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
let _RZ_SCH_START=6, _RZ_SCH_END=18; // visible-hour window; recomputed per render to fit the day's blocks
const _RZ_SLOT_MIN=15;                 // minutes per grid row
const _RZ_PX_PER_SLOT=15;              // height of one 15-min row
const _RZ_PX_PER_MIN=_RZ_PX_PER_SLOT/_RZ_SLOT_MIN;
const _RZ_AXIS_W=50;                   // left time-axis width
const _RZ_COL_W=150;                   // each aircraft column width
function _rzMinsFromHHMM(s){const m=/^(\d{1,2}):(\d{2})$/.exec(s||'');if(!m)return null;return (+m[1])*60+(+m[2]);}
// Per-minute "now" line update — repositions the existing element directly (no re-render → no
// flash). Does nothing if the calendar isn't on screen or the day isn't today.
function _rzTickNowLine(){
  if(S.rezdyDate!==_rzToday()){if(S._rzNowTimer){clearInterval(S._rzNowTimer);S._rzNowTimer=null;}return;}
  var el=document.getElementById('rzNowLine');if(!el){if(S._rzNowTimer){clearInterval(S._rzNowTimer);S._rzNowTimer=null;}return;} // left the calendar → stop the timer
  var n=new Date(),nm=n.getHours()*60+n.getMinutes();
  if(nm<_RZ_SCH_START*60||nm>_RZ_SCH_END*60){el.style.display='none';return;}
  el.style.display='block';
  el.style.top=((nm-_RZ_SCH_START*60)*_RZ_PX_PER_MIN)+'px';
  var t=document.getElementById('rzNowTime');
  if(t)t.textContent=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
}
function _rzSchTop(start){const mins=_rzMinsFromHHMM(start);if(mins==null)return 0;return Math.max(0,(mins-_RZ_SCH_START*60)*_RZ_PX_PER_MIN);}
function _rzSchHeight(start,end){const a=_rzMinsFromHHMM(start),b=_rzMinsFromHHMM(end);if(a==null||b==null||b<=a)return _RZ_PX_PER_SLOT*2;return (b-a)*_RZ_PX_PER_MIN;}

// The day's FLIGHTS for pilot allocation — booking departures AND manual schedule blocks (maintenance
// ferries, training, hire) on a real aircraft. Each is {key, ac, depMin, endMin} honouring flyback
// time + the operator's top/bottom edge overrides. ONE source used by both the calendar render and
// _schedEnsureAuto (so the calendar and the seatmap PIC agree). Only meaningful for the current date.
function _schedDayFlights(date){
  var flights=[];if(date!==S.rezdyDate)return flights;
  var bks=S._rezdyBookings||[],attach=S._rzSchedAttach||{},groups={};
  bks.forEach(function(b){
    if((typeof _rzIsCancelled==='function')&&_rzIsCancelled(b))return;
    var ord=String(b.orderNumber||'');if((typeof _rzIsNoShow==='function')&&_rzIsNoShow(ord))return;
    var ac=(typeof _rzBookingAc==='function')?_rzBookingAc(b,ord):null;
    if(!ac||ac==='__none__'||ac==='__unalloc__'||!((S&&S.aircraft)||{})[ac])return;
    ((b.items)||[]).forEach(function(it){
      var t=(typeof _rzDepTime==='function')?_rzDepTime(it.startTimeLocal||''):'';if(!t)return;
      var start=(typeof _rzHHMMcolon==='function')?_rzHHMMcolon(t):t;if(_rzMinsFromHHMM(start)==null)return;
      var prod=(typeof _rzProduct==='function')?_rzProduct(it.product):'';
      if(_rzIsFlyback(prod)&&attach[ord])return;   // folded into a flight → not its own pilot flight
      var key=_rzDepKey(ac,start,prod);if(!groups[key])groups[key]={ac:ac,start:start,prod:prod,key:key};
    });
  });
  Object.keys(groups).forEach(function(k){var g=groups[k],_pr=g.prod,_orig=g.start,_isFb=_rzIsFlyback(_pr),dm,end;
    if(_isFb){var eff=(typeof _rzFbTime==='function')?_rzFbTime(_pr,_orig):_orig;dm=_rzMinsFromHHMM(eff);if(dm==null)dm=_rzMinsFromHHMM(_orig)||0;end=dm+60;}
    else{var sov=(S._rzDepTimeOv||{})[_pr+'|'+_orig],eov=(S._rzDepEndOv||{})[_pr+'|'+_orig];
      dm=(sov!=null)?_rzMinsFromHHMM(sov):_rzMinsFromHHMM(_orig);if(dm==null)dm=_rzMinsFromHHMM(_orig)||0;
      var du=(typeof _rzProductDuration==='function')?_rzProductDuration(_pr):270;
      end=(eov!=null)?_rzMinsFromHHMM(eov):(dm+(du||270));if(end==null)end=dm+(du||270);}
    flights.push({key:g.key,ac:g.ac,depMin:dm,endMin:end});
  });
  (S._schedBlocks||[]).forEach(function(b){   // manual blocks (maintenance ferries etc.) on a real aircraft
    if(!b||!b.aircraft||b.aircraft==='__unalloc__'||b.aircraft==='__misc__'||!((S&&S.aircraft)||{})[b.aircraft])return;
    var dm=_rzMinsFromHHMM(b.start),end=_rzMinsFromHHMM(b.end);if(dm==null)return;if(end==null||end<=dm)end=dm+60;
    // Maintenance ferry to/from Wanaka ties up the pilot for the QN↔WF drive (1.5h): flying TO Wanaka
    // (QN-WF) they then drive back, so block the pilot for 1.5h AFTER; flying back (WF-QN) they must
    // drive over first, so block the pilot for 1.5h BEFORE the ferry departs.
    var _lp=String(b.label||'').toUpperCase().split(/[-–\/]/).map(function(s){return s.trim();});
    if(_lp[1]==='WF')end+=RZ_MAINT_DRIVE_MIN;                 // QN→WF: 1.5h drive home after
    else if(_lp[0]==='WF')dm=Math.max(0,dm-RZ_MAINT_DRIVE_MIN); // WF→QN: 1.5h drive to Wanaka before
    flights.push({key:b.id,ac:b.aircraft,depMin:dm,endMin:end});
  });
  return flights;
}
var RZ_MAINT_DRIVE_MIN=90;   // QN↔Wanaka drive buffer around a maintenance ferry (pilot cooldown/warmup)

function _rzRenderSchedule(){
  if(S._schedLoading)return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading schedule…</div>';
  if(!S._schedBlocks){
    if(!S._schedLoading&&window.rezdyLoadSchedule)window.rezdyLoadSchedule();
    return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading calendar…</div>';
  }
  const blocks=S._schedBlocks||[];
  S._rzBlockMeta={};   // per-render map: drag key → block info, used by the pointer move/resize handlers
  // Booking-derived blocks: all bookings sharing an aircraft / departure / product are STACKED
  // into ONE block (e.g. "SLB · 13A · FCF"). Click it to see the bookings + passengers inside.
  const bkGroups={};
  (S._rezdyBookings||[]).forEach(function(b){
    if(_rzIsCancelled(b))return;
    var ac=_rzBookingAc(b,String(b.orderNumber||''))||'__unalloc__';
    var bal=parseFloat(b.balanceDue);var owing=isFinite(bal)&&bal>0;
    ((b.items)||[]).forEach(function(it){
      var t=_rzDepTime(it.startTimeLocal||'');if(!t)return;
      var start=_rzHHMMcolon(t);if(_rzMinsFromHHMM(start)==null)return;
      var prod=_rzProduct(it.product);
      var key=_rzDepKey(ac,start,prod);   // group by destination so same place+time+aircraft = one flight
      var g=bkGroups[key]||(bkGroups[key]={aircraft:ac,start:start,product:prod,gcode:_rzGroupDest(prod),products:{},pax:0,bookings:[],owing:false,key:key,_fromBooking:true,_fb:[]});
      g.products[prod]=true;
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
  // Time-aware auto-pilots over the day's flights (bookings + manual/maintenance blocks), shared with
  // _schedEnsureAuto via _schedDayFlights so the calendar and the seatmap PIC always agree.
  if(typeof _schedEnabled==='function'&&_schedEnabled()&&typeof _schedComputeBlockPilots==='function'){
    try{S._schedAutoPilots=_schedComputeBlockPilots(_schedDayFlights(S.rezdyDate));S._schedAutoPilotsDate=S.rezdyDate;}catch(_e){}
  }
  const bkBlocks=Object.keys(bkGroups).map(function(k){
    var g=bkGroups[k];var sm=_rzMinsFromHHMM(g.start)||0;
    var _prods=Object.keys(g.products||{});if(!_prods.length)_prods=[g.product];
    var _dur=Math.max.apply(null,_prods.map(function(p){return _rzProductDuration(p);})); // longest wins for a combined flight
    g.disp=(_prods.length===1)?g.product:(g.gcode||g.product);                            // single product shows its code; mixed shows the destination
    var em=sm+_dur;
    g.end=String(Math.floor(em/60)).padStart(2,'0')+':'+String(em%60).padStart(2,'0');
    // FLB/CCF seats are parked in the OUTBOUND (e.g. 1200) Rezdy slot to hold them, but the flight
    // actually flies BACK later — default 15:30, or whatever the operator set in the calendar. Render
    // a 1-hour block at that time. (g.start here is still the held outbound time → use it as the key.)
    if(_rzIsFlyback(g.product)){
      var _fbHeld=g.start;var _fbOv=(S._rzFlybackTime||{})[_rzFbTimeKey(g.product,_fbHeld)];
      if(_fbOv||sm===720){
        var _ft=_rzFbTime(g.product,_fbHeld);var _fm=_rzMinsFromHHMM(_ft);if(_fm==null)_fm=930;
        // The aircraft only flies the RETURN leg (Milford→QN), ~40 min. Show the block as the LAST 40
        // minutes of the flyback hour: a 15:30 flyback renders 15:50–16:30 (end held, start = end−40).
        // _fbTime keeps the real fly-back time for the dropdown/logic so the block move doesn't change it.
        g._fbHeld=_fbHeld;g._fbTime=_ft;var _fe=_fm+60;
        g.start=_rzMinToHHMM(_fe-40);
        g.end=String(Math.floor(_fe/60)).padStart(2,'0')+':'+String(_fe%60).padStart(2,'0');
      }
    } else {
      // Any other departure: independent TOP (departure) and BOTTOM (return) overrides set by dragging
      // the block's edges. Top alone moves the block (keeps duration); bottom alone re-times the return.
      var _os2=g.start;                                  // raw grouping start = the override key
      var _smRaw=_rzMinsFromHHMM(_os2);
      var _durM=(_rzMinsFromHHMM(g.end)-_smRaw);if(!(_durM>0))_durM=270;
      var _sov=(S._rzDepTimeOv||{})[g.product+'|'+_os2];
      var _eov=(S._rzDepEndOv||{})[g.product+'|'+_os2];
      var _startM=(_sov!=null)?_rzMinsFromHHMM(_sov):_smRaw;if(_startM==null)_startM=_smRaw;
      var _endM=(_eov!=null)?_rzMinsFromHHMM(_eov):(_startM+_durM);if(_endM==null)_endM=_startM+_durM;
      if(_endM<=_startM)_endM=_startM+15;
      if(_sov!=null||_eov!=null)g._timeMoved=true;
      g._origStart=_os2;g.start=_rzMinToHHMM(_startM);g.end=_rzMinToHHMM(_endM);
    }
    var acLbl=g.aircraft==='__unalloc__'?'?':g.aircraft.replace(/^ZK-?/,'');
    var gbd={a:0,c:0,i:0};g.bookings.forEach(function(bk){var e=_rzEffBreakdown(bk.b);gbd.a+=e.a;gbd.c+=e.c;gbd.i+=e.i;});
    // Overbooked flag: seated pax (adults+children; infants are lap) beyond the aircraft's seat count.
    var _sp=(g.aircraft!=='__unalloc__'&&g.aircraft!=='__misc__'&&typeof _acSpec==='function')?_acSpec(g.aircraft):null;
    g.cap=_sp?((_sp.seats||[]).length-1-(((_sp.removedSeats)||[]).length)):null;   // seats minus PIC + removed
    g.over=(g.cap!=null)&&((gbd.a+gbd.c)>g.cap);
    var _manP=(S._schedPilots||{})[g.key]||null;
    var _autoP=((S._schedAutoPilots||{})[g.key])||((typeof _schedAutoPilotFor==='function')?_schedAutoPilotFor(g.aircraft,g.start):null);
    var pilot=_manP||_autoP||null;
    g.bd=gbd;g.pilot=pilot;g.pilotAuto=(!_manP&&!!_autoP);g.pilotChanged=(!!_manP&&!!_autoP&&_manP!==_autoP);g.pilotAutoWas=_autoP;
    // Aircraft forced: a booking in this group whose aircraft was manually set to something other than
    // what the cost-aware auto-allocation would choose.
    g.acForced=false;g.acAutoWas=null;
    g.bookings.forEach(function(bk){var ord=String(bk.b.orderNumber||'');var man=(S._rzBookingAc||{})[ord];if(man&&man!=='__none__'){var au=(typeof _schedAutoAcFor==='function')?_schedAutoAcFor(ord):null;if(au&&man!==au){g.acForced=true;g.acAutoWas=au;}}});
    var fbStr=_rzFbSummary(g._fb);   // aggregated, e.g. " + 3A FLB"
    g.label=(pilot?pilot+'/':'')+acLbl+' '+_rzBdCompact(gbd)+' '+(g.disp||g.product)+fbStr;g.order=g.key;g._owing=g.owing;
    return g;
  });
  const _totBk=bkBlocks.reduce(function(s,g){return s+g.bookings.length;},0);
  // Whole-day passenger breakdown for the overview (same format as the Bookings header). Seats
  // sold excludes infants (lap pax — they travel free).
  var _cA=0,_cC=0,_cI=0;(S._rezdyBookings||[]).forEach(function(b){if(_rzIsCancelled(b))return;var _e=_rzEffBreakdown(b);_cA+=_e.a;_cC+=_e.c;_cI+=_e.i;});
  var _cSeats=_cA+_cC;
  var _calBd=(_cA+_cC+_cI>0)?'<div style="font-size:12px;margin:5px 0 0;display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
      '<span style="font-weight:800;color:var(--text2);letter-spacing:.02em">'+_cA+'A'+(_cC?' · '+_cC+'C':'')+(_cI?' · '+_cI+'i':'')+'</span>'+
      '<span style="padding:2px 9px;border-radius:20px;background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.32);color:#4ade80;font-weight:800;font-size:11px;white-space:nowrap">'+_cSeats+' seat'+(_cSeats===1?'':'s')+' sold</span>'+
      (_cI?'<span style="font-size:10px;color:var(--text3)">'+_cI+' infant'+(_cI===1?'':'s')+' travel free</span>':'')+
    '</div>':'';
  const hdr='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:0">Calendar</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+_rzDowLabel(S.rezdyDate)+' · '+_totBk+' booking'+(_totBk===1?'':'s')+(blocks.length?' · '+blocks.length+' manual block'+(blocks.length===1?'':'s'):'')+'</p>'+_calBd+'</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start">'+
      '<button class="btn btn-ghost" style="font-size:12px'+((S._rzSchedUndo&&S._rzSchedUndo.length)?'':';opacity:.4')+'" '+((S._rzSchedUndo&&S._rzSchedUndo.length)?'':'disabled ')+'onclick="window.rezdySchedUndo()" title="Undo the last combine / move">↶ Undo</button>'+
      '<button class="btn btn-ghost" style="font-size:12px;color:#f59e0b;border-color:rgba(245,158,11,.4)" onclick="window.rezdySchedResetRezdy()" title="Clear manual combines/moves and revert to Rezdy">⟲ Reset to Rezdy</button>'+
      '<button class="btn btn-ghost" style="font-size:12px" onclick="window.schedNewBlock()">+ Add block</button>'+
    '</div></div>';
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
            '<span style="font-size:14px;font-weight:800;color:var(--text1)">🛫 '+_rzEsc(_grp.start)+' · '+_rzEsc(_rzBdCompact(_grp.bd||{a:_grp.pax,c:0,i:0}))+' '+_rzEsc(_grp.disp||_grp.product)+'<span style="color:#f59e0b">'+_rzEsc(_rzFbSummary(_grp._fb))+'</span></span>'+
            (_grp.pilot?'<span class="pill" title="'+(_grp.pilotChanged?('User change from auto allocation — auto chose '+_rzEsc(_grp.pilotAutoWas)):(_grp.pilotAuto?'Auto-allocated pilot':''))+'" style="background:rgba(96,165,250,.15);border:1px solid '+(_grp.pilotChanged?'#f59e0b':'rgba(96,165,250,.5)')+';color:'+(_grp.pilotChanged?'#f59e0b':'#60a5fa')+';font-size:11px;font-weight:800;padding:2px 8px;border-radius:12px">✈ '+_rzEsc(_grp.pilot)+(_grp.pilotChanged?' ✏':(_grp.pilotAuto?' ⚙':''))+' <span onclick="event.stopPropagation();window.rezdySchedClearPilot(\''+_rzEsc(_grp.key).replace(/'/g,"\\'")+'\')" title="Remove pilot" style="cursor:pointer;opacity:.7;margin-left:2px">✕</span></span>':'')+
          '</div>'+
          '<button class="btn btn-ghost" style="font-size:12px" onclick="S._schedGroupKey=null;render()">✕ Close</button></div>';
      // Flyback (FLB/CCF): the seats are held in an outbound slot — let the operator set the actual
      // fly-back time here (defaults to 15:30). A 15-minute dropdown (no free-typed clock — that lost
      // focus on every keystroke).
      if(_rzIsFlyback(_grp.product)){
        var _fbHeldK=_grp._fbHeld||_grp.start;
        var _fbHasOv=!!((S._rzFlybackTime||{})[_rzFbTimeKey(_grp.product,_fbHeldK)]);
        detailH+='<div style="display:flex;align-items:center;gap:8px;margin:0 0 8px;flex-wrap:wrap">'+
          '<span style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700">🛬 Flyback time</span>'+
          '<select onchange="window.rezdySetFlybackTime(\''+_rzEsc(_grp.product)+'\',\''+_rzEsc(_fbHeldK)+'\',this.value)" style="padding:7px 10px;border-radius:8px;border:1px solid rgba(245,158,11,.5);background:var(--card);color:var(--text1);font-size:15px;font-weight:800">'+_rzTimeOpts((_grp._fbTime||_grp.start),'12:00','19:45')+'</select>'+
          '<span style="font-size:11px;color:var(--text3)">when they actually fly back (seats held in the '+_rzEsc(_fbHeldK)+' slot)</span>'+
          (_fbHasOv?'<button onclick="window.rezdySetFlybackTime(\''+_rzEsc(_grp.product)+'\',\''+_rzEsc(_fbHeldK)+'\',\'\')" style="background:none;border:none;color:#60a5fa;font-size:11px;cursor:pointer;text-decoration:underline">reset to 15:30</button>':'')+
        '</div>';
      } else if(_grp._timeMoved||_grp._origStart){
        // A non-flyback departure whose time was nudged on the calendar — show + allow reset.
        detailH+='<div style="display:flex;align-items:center;gap:8px;margin:0 0 8px;flex-wrap:wrap">'+
          '<span style="font-size:11px;color:var(--text3)">🕑 Moved to <b style="color:var(--text1)">'+_rzEsc(_grp.start)+'</b> (Rezdy time '+_rzEsc(_grp._origStart||'')+')</span>'+
          '<button onclick="window.rezdyClearDepTime(\''+_rzEsc(_grp.product)+'\',\''+_rzEsc(_grp._origStart||'')+'\')" style="background:none;border:none;color:#60a5fa;font-size:11px;cursor:pointer;text-decoration:underline">reset to Rezdy time</button>'+
        '</div>';
      }
      // Click-to-set pilot picker — tap a pilot to assign (tap again to clear). Only type-rated
      // pilots for this aircraft are shown.
      var _gkey=String(_grp.key).replace(/'/g,"\\'");
      var _gpick=_rzAvailablePilots().filter(function(p){if(!_gac)return true;return (typeof _pilotRatedForAc==='function')?_pilotRatedForAc(p.code,_gac):true;});
      detailH+='<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:2px 0 8px">'+
        '<span style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700;margin-right:2px">Set pilot</span>';
      if(!_gpick.length){detailH+='<span style="font-size:11px;color:var(--text3)">No type-rated pilots available</span>';}
      _gpick.forEach(function(p){var on=_grp.pilot===p.code;var off=!p.rostered;
        detailH+='<button onclick="event.stopPropagation();window.rezdySchedSetPilot(\''+_gkey+'\',\''+_rzEsc(p.code).replace(/'/g,"\\'")+'\')" title="'+_rzEsc(p.name)+(off?' (not rostered on today)':'')+'" style="display:inline-flex;align-items:center;gap:4px;padding:5px 11px;border-radius:16px;border:'+(on?'2px solid #60a5fa':'1px solid rgba(96,165,250,'+(off?'.28':'.5')+')')+';background:rgba(96,165,250,'+(on?'.22':(off?'.05':'.1'))+');color:#60a5fa;font-size:12px;font-weight:800;cursor:pointer;opacity:'+(off?'.6':'1')+'">'+(on?'✓ ':'✈ ')+_rzEsc(p.code)+(off?' <span style="font-size:8px;font-weight:700">off</span>':'')+'</button>';});
      detailH+='</div>';
      // Full product title(s) at the top — the real Rezdy product name, not just the short code.
      var _allBk=_grp.bookings.concat(_grp._fb||[]);
      var _titles=[];_allBk.forEach(function(bk){var t=String((bk.it&&bk.it.product)||'').trim();if(t&&_titles.indexOf(t)<0)_titles.push(t);});
      if(_titles.length)detailH+='<div style="font-size:12px;color:var(--text2);font-weight:600;margin:-2px 0 2px;line-height:1.45">'+_titles.map(function(t){return '<div>'+_rzEsc(t)+'</div>';}).join('')+'</div>';
      // Each booking (including folded flybacks) shows pax + product code, e.g. "2A FCF" / "2A FLB".
      _allBk.forEach(function(bk){
        var b=bk.b;var ord=String(b.orderNumber||'');var bal=parseFloat(b.balanceDue);var owing=isFinite(bal)&&bal>0;
        var _e=_rzEffBreakdown(b);var _code=_rzProduct((bk.it&&bk.it.product)||'');var _isFb=_rzIsFlyback(_code);
        var _bc=_isFb?'#f59e0b':'#60a5fa';
        detailH+='<div style="border-top:1px solid var(--border2);padding-top:8px;margin-top:8px">'+
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
            '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">'+
              '<span style="font-weight:700;font-size:13px;color:var(--text1)">'+_rzEsc(b.customerName||ord)+'</span>'+
              '<span style="font-size:11px;font-weight:800;padding:1px 8px;border-radius:10px;background:'+_bc+'22;border:1px solid '+_bc+'66;color:'+_bc+'">'+_rzBdCompact(_e)+' '+_rzEsc(_code)+'</span>'+
              (owing?'<span style="color:#ef4444;font-weight:800;font-size:11px">$ TO PAY</span>':'')+
            '</div>'+
            '<div style="display:flex;gap:6px;flex-shrink:0">'+
              (_isFb?'<button class="btn btn-ghost" style="font-size:11px;padding:3px 9px;color:#f59e0b;border-color:rgba(245,158,11,.4)" onclick="window.rezdySchedDetach(\''+_rzEsc(ord).replace(/'/g,"\\'")+'\')" title="Un-combine this flyback">↩ Detach</button>':'')+
              '<button class="btn btn-ghost" style="font-size:11px;padding:3px 9px" onclick="window.rezdyGotoBooking(\''+_rzEsc(ord).replace(/'/g,"\\'")+'\')">View booking →</button>'+
            '</div>'+
          '</div>'+
          _rzPaxBubbles(b,{drag:true})+
        '</div>';
      });
      detailH+='</div>';
    }
  }

  // inline add/edit form
  var formH=_rzSchedEditForm();

  // Columns: one per aircraft. Include any aircraft that has a block but isn't in S.aircraft.
  let acIds=Object.keys((S&&S.aircraft)||{});
  blocks.forEach(function(b){if(b.aircraft&&b.aircraft!=='__misc__'&&b.aircraft!=='__pilot__'&&acIds.indexOf(b.aircraft)<0)acIds.push(b.aircraft);});
  bkBlocks.forEach(function(b){if(b.aircraft&&b.aircraft!=='__unalloc__'&&b.aircraft!=='__misc__'&&acIds.indexOf(b.aircraft)<0)acIds.push(b.aircraft);});
  if(bkBlocks.some(function(b){return b.aircraft==='__unalloc__';}))acIds.push('__unalloc__');
  acIds.push('__misc__');   // far-right free-form column for meetings / notes (e.g. "DF AA JY Meeting")
  if(acIds.length===1){     // only the misc column → nothing scheduled
    return hdr+formH+'<div class="card" style="text-align:center;padding:36px;color:var(--text3);font-size:13px">No aircraft configured.</div>';
  }

  // Fit the visible window to the day's flights: 1 hour before the earliest block to 1 hour after
  // the latest, on whole hours (clamped 0–24, min 3h span). No blocks → default daytime window.
  (function(){
    var _mins=[],_maxs=[];
    blocks.concat(bkBlocks).forEach(function(b){var s=_rzMinsFromHHMM(b.start),e=_rzMinsFromHHMM(b.end);if(s!=null){_mins.push(s);_maxs.push(e!=null?e:s+30);}});
    if(_mins.length){
      var _lo=Math.min.apply(null,_mins),_hi=Math.max.apply(null,_maxs);
      _RZ_SCH_START=Math.max(0,Math.floor(_lo/60)-1);
      _RZ_SCH_END=Math.min(24,Math.ceil(_hi/60)+1);
      if(_RZ_SCH_END-_RZ_SCH_START<3)_RZ_SCH_END=Math.min(24,_RZ_SCH_START+3);
    } else {_RZ_SCH_START=6;_RZ_SCH_END=18;}
  })();
  const slots=((_RZ_SCH_END-_RZ_SCH_START)*60)/_RZ_SLOT_MIN;
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

  // one column per aircraft (uniform width). Overlapping blocks cascade right and get a little
  // narrower (click one to bring it forward / see the full title).
  var OFF=15;
  let colsH='';
  acIds.forEach(function(ac){
    const acCol=(ac==='__misc__')?'#94a3b8':_rzAcCol(ac);
    var _mlvl=(ac==='__unalloc__'||ac==='__misc__')?null:_rzMaintLevel(ac);
    var _mcol=(_mlvl==='block')?'#ef4444':'#f59e0b';var _mtip=_mlvl?_rzMaintTip(ac):'';
    // background row lines
    let rows='';
    for(let i=0;i<=slots;i++){
      const top=i*_RZ_PX_PER_SLOT;
      const mins=_RZ_SCH_START*60+i*_RZ_SLOT_MIN;
      const onHour=(mins%60===0);
      rows+='<div style="position:absolute;top:'+top+'px;left:0;right:0;height:1px;pointer-events:none;background:'+(onHour?'var(--border)':'var(--border2)')+';opacity:'+(onHour?.8:.35)+'"></div>';
    }
    // Booking blocks (from Rezdy) + manual blocks for this aircraft, cascaded when overlapping.
    let blocksH='';
    // Scheduled maintenance: if a maintenance booking covers the viewed date, lay a full-day "AT
    // MAINTENANCE" backdrop in this aircraft's column so it reads as unavailable (behind any flights).
    if(ac!=='__unalloc__'&&ac!=='__misc__'){
      var _mbk=(function(){var bks=((S.maintenance&&S.maintenance.bookings)||{})[ac]||[];for(var _i=0;_i<bks.length;_i++){var _b=bks[_i];if(_b&&_b.date&&S.rezdyDate>=_b.date&&S.rezdyDate<=(_b.end||_b.date))return _b;}return null;})();
      if(_mbk){var _mn=(_mbk.notes||'').trim();
        // Span ONLY between the maintenance ferries: from the QN→WF (out) ferry to the WF→QN (back)
        // ferry. The ferry blocks are date-specific, so on the go day only "out" is present (block runs
        // out→end of grid), on the return day only "back" (start→back), middle days = full day.
        var _outF=blocks.filter(function(x){return x.aircraft===ac&&(/_out$/.test(String(x.id||''))||x.label==='QN-WF');})[0];
        var _backF=blocks.filter(function(x){return x.aircraft===ac&&(/_back$/.test(String(x.id||''))||x.label==='WF-QN');})[0];
        var _mTop=_outF?_rzSchTop(_outF.end||_outF.start):0;
        var _mBot=_backF?_rzSchTop(_backF.start):gridH;
        var _mHt=Math.max(_RZ_PX_PER_SLOT,_mBot-_mTop);
        blocksH+='<div title="At maintenance'+(_mn?(' — '+_rzEsc(_mn)):'')+'" style="position:absolute;left:2px;right:2px;top:'+_mTop+'px;height:'+_mHt+'px;background:repeating-linear-gradient(45deg,rgba(239,68,68,.09),rgba(239,68,68,.09) 9px,rgba(239,68,68,.16) 9px,rgba(239,68,68,.16) 18px);border:1px solid rgba(239,68,68,.45);border-radius:6px;z-index:0;display:flex;align-items:center;justify-content:center;pointer-events:none">'+
          '<div style="transform:rotate(-90deg);white-space:nowrap;font-weight:800;font-size:12px;color:#ef4444;letter-spacing:.06em;text-shadow:0 1px 2px var(--card)">🔧 AT MAINTENANCE'+(_mn?(' · '+_rzEsc(_mn)):'')+'</div></div>';
      }
    }
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
      const n=Math.max(1,b._cols||1),idx=b._idx||0;
      const sel=isBk&&String(S._schedGroupKey||'')===String(b.order);
      const _pos='left:'+(2+idx*OFF)+'px;width:calc(100% - '+((n-1)*OFF+4)+'px);z-index:'+(sel?50:idx+1)+';'+(n>1?'box-shadow:-3px 1px 7px rgba(0,0,0,.3);':'');
      const _click=isBk?('window.rezdySchedShowGroup(\''+_rzEsc(b.order).replace(/'/g,"\\'")+'\')'):('window.schedEditBlock(\''+_rzEsc(b.id).replace(/'/g,"\\'")+'\')');
      const _dropKey=(isBk?b.order:b.id);
      // Any booking block can be dragged to another aircraft column (reassigns its bookings) or
      // onto a flight to combine a flyback/CCF.
      const _dragKey=isBk?String(b.order):('BLK|'+String(b.id));
      var _canResize=isBk&&!_rzIsFlyback(b.product)&&!!b._origStart;
      // Register this block for the pointer move/resize handlers.
      S._rzBlockMeta[_dragKey]={prod:b.product,origStart:b._origStart||b.start,ac:b.aircraft,isFb:isBk&&_rzIsFlyback(b.product),isManual:!isBk,id:b.id,order:b.order,key:_dragKey,startMin:_rzMinsFromHHMM(b.start),endMin:_rzMinsFromHHMM(b.end),canResize:_canResize};
      var _pdown=' onpointerdown="window.rzCalDown(event,\''+_rzEsc(_dragKey).replace(/'/g,"\\'")+'\')"';
      // User-forced overrides differing from the optimiser → a small hoverable ✋ on the block.
      var _fc=[];
      if(b.pilotChanged)_fc.push('Pilot forced by user'+(b.pilotAutoWas?' — optimal '+String(b.pilotAutoWas):''));
      if(b.acForced)_fc.push('Aircraft forced by user'+(b.acAutoWas?' — optimal '+String(b.acAutoWas).replace('ZK-',''):''));
      var _forcedIcon=_fc.length?'<span title="'+_rzEsc(_fc.join(' · '))+'" style="pointer-events:auto;cursor:help;font-size:10px;margin-right:3px;color:#f59e0b" onpointerdown="event.stopPropagation()">✋</span>':'';
      blocksH+='<div'+_pdown+(isBk?' data-bkkey="'+_rzEsc(String(b.order))+'"':'')+(_mlvl?' title="'+_rzEsc(_mtip)+'"':' title="Drag to move · drag the top/bottom edge to set departure/return · tap to open"')+' ondragover="event.preventDefault()" ondrop="window.rezdySchedDropPilot(\''+_rzEsc(String(_dropKey)).replace(/'/g,"\\'")+'\',event)" '+
        'style="position:absolute;'+_pos+'top:'+top+'px;height:'+ht+'px;background:'+col+(isBk?'22':'26')+';border:1px '+(isBk?'dashed':'solid')+' '+col+';border-left:3px solid '+(_mlvl?_mcol:col)+';border-radius:6px;padding:'+(compact?'1px 5px':'3px 6px')+';cursor:grab;overflow:hidden;box-sizing:border-box;line-height:1.25;touch-action:none;user-select:none'+(sel?';outline:2px solid '+col+';outline-offset:1px':'')+'">'+
        (_canResize?'<div style="position:absolute;top:0;left:0;right:0;height:3px;background:'+col+'66;border-radius:6px 6px 0 0;cursor:ns-resize"></div><div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:'+col+'66;border-radius:0 0 6px 6px;cursor:ns-resize"></div>':'')+
        '<div style="font-weight:700;font-size:11px;color:'+col+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none">'+_forcedIcon+(_mlvl?'<span style="color:'+_mcol+'">⚠ </span>':'')+(isBk&&b.over?'<span style="color:#ef4444;font-weight:900">⛔ OVER </span>':'')+(isBk?'📋 ':'')+_rzEsc(isBk?(b.label||b.aircraft):_rzManBlockTitle(b))+'</div>'+
        (compact?'':'<div style="font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none">'+_rzEsc(b.start)+(' – '+_rzEsc(b.end))+(b.notes?(' · '+_rzEsc(b.notes)):'')+'</div>')+
        '</div>';
    });
    var _acJs=_rzEsc(String(ac)).replace(/'/g,"\\'");
    colsH+='<div style="width:'+_RZ_COL_W+'px;flex-shrink:0;border-right:1px solid var(--border)">'+
      '<div data-ac="'+_acJs+'" onclick="window.rezdySchedColClick(\''+_acJs+'\',event)" ondragover="window.rezdySchedDragOverCol(event)" ondrop="window.rezdySchedDropBlockToAc(\''+_acJs+'\',event)" style="position:relative;height:'+gridH+'px;cursor:copy">'+rows+blocksH+'</div></div>';
  });

  // sticky aircraft-id header row, aligned with columns
  let headH='<div style="display:flex;position:sticky;top:0;z-index:2;background:var(--card)">'+
    '<div style="width:'+_RZ_AXIS_W+'px;flex-shrink:0;border-right:1px solid var(--border);border-bottom:1px solid var(--border)"></div>';
  acIds.forEach(function(ac){
    const acCol=(ac==='__unalloc__'||ac==='__misc__')?'#94a3b8':_rzAcCol(ac);
    var _hml=(ac==='__unalloc__'||ac==='__misc__')?null:_rzMaintLevel(ac);
    const lbl=_rzEsc(ac==='__unalloc__'?'Unallocated':(ac==='__misc__'?'Misc  ＋':ac))+(_hml?(' <span style="color:'+(_hml==='block'?'#ef4444':'#f59e0b')+'">⚠</span>'):'');
    var _mc=(ac==='__misc__')?' onclick="window.schedNewMisc()" title="Add a meeting / note" style="cursor:pointer;':((_hml)?' title="'+_rzEsc(_rzMaintTip(ac))+'" style="':' style="');
    headH+='<div'+_mc+'width:'+_RZ_COL_W+'px;flex-shrink:0;border-right:1px solid var(--border);border-bottom:2px solid '+acCol+';padding:6px 8px;text-align:center;font-weight:800;font-size:12px;color:'+acCol+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+lbl+'</div>';
  });
  headH+='</div>';

  // Red "now" line — slides down the grid as the day passes (today only). The element is always
  // present for today (hidden outside schedule hours) so the per-minute tick can reposition it
  // in place via _rzTickNowLine — NO full re-render, which is what made the calendar flash.
  var nowLine='';
  if(S.rezdyDate===_rzToday()){
    var _n=new Date();var _nm=_n.getHours()*60+_n.getMinutes();
    var _inR=(_nm>=_RZ_SCH_START*60&&_nm<=_RZ_SCH_END*60);
    var _ny=(_nm-_RZ_SCH_START*60)*_RZ_PX_PER_MIN;
    nowLine='<div id="rzNowLine" style="position:absolute;left:0;right:0;top:'+_ny+'px;height:2px;background:#ef4444;z-index:60;pointer-events:none;display:'+(_inR?'block':'none')+'"><div style="position:absolute;left:2px;top:-4px;width:8px;height:8px;border-radius:50%;background:#ef4444"></div><div id="rzNowTime" style="position:absolute;right:4px;top:-9px;font-size:9px;font-weight:800;color:#ef4444">'+String(_n.getHours()).padStart(2,'0')+':'+String(_n.getMinutes()).padStart(2,'0')+'</div></div>';
    if(!S._rzNowTimer)S._rzNowTimer=setInterval(_rzTickNowLine,60000);
  }
  const grid='<div class="card" style="padding:0;overflow-x:auto"><div style="display:inline-block;min-width:100%">'+
    headH+
    '<div style="display:flex;position:relative">'+axis+colsH+nowLine+
      '<div id="rzDragLine" style="position:absolute;left:'+_RZ_AXIS_W+'px;right:0;top:0;border-top:2px dashed #ef4444;z-index:70;pointer-events:none;display:none"><div id="rzDragLineT" style="position:absolute;left:4px;top:-9px;font-size:10px;font-weight:800;color:#ef4444;background:var(--card);padding:0 5px;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div></div>'+
    '</div>'+
    '</div></div>';
  // Available pilots — drag a code bubble onto a flight block to allocate.
  var _pilots=_rzAvailablePilots();
  var pilotsBar='<div class="card" style="padding:10px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:700;margin-bottom:8px">Pilots <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text3)">(drag onto a flight, or tap a flight and pick a pilot)</span></div>';
  if(!_pilots.length){pilotsBar+='<div style="font-size:12px;color:var(--text3)">No aircraft-approved pilots found.</div>';}
  else{
    pilotsBar+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
    _pilots.forEach(function(p){var off=!p.rostered;pilotsBar+='<div draggable="true" ondragstart="window.rezdySchedPilotDragStart(\''+_rzEsc(p.code).replace(/'/g,"\\'")+'\',event)" title="'+_rzEsc(p.name)+(off?' (not rostered on today)':'')+' — drag onto a flight block" style="display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:16px;background:rgba(96,165,250,'+(off?'.06':'.14')+');border:1px solid rgba(96,165,250,'+(off?'.28':'.5')+');cursor:grab;font-size:12px;font-weight:800;color:#60a5fa;opacity:'+(off?'.55':'1')+'">✈ '+_rzEsc(p.code)+(off?' <span style="font-size:8px;opacity:.8;font-weight:700">off</span>':'')+'</div>';});
    pilotsBar+='</div>';
  }
  pilotsBar+='</div>';
  return hdr+pilotsBar+detailH+formH+grid;
}

// ─────────────────────────────────────────────────────────────────────────────
//  AIRCRAFT MOVEMENTS  — a second calendar view that tracks the aircraft LEGS only
//  (no booking/passenger detail). Each scenic LANDING block becomes an outbound
//  (QN→dest) at the block start + a return (dest→QN) landing at the block end.
//  Overhead scenics are a single QN→QN leg. A standalone flyback (FLB/CCF) is a
//  return-only dest→QN leg, which forces a "fetch" ferry QN→dest if the aircraft
//  isn't already in Milford. A per-aircraft position walk inserts an empty FERRY
//  whenever an aircraft isn't where its next leg departs. Leg flying times:
//  MF 40 min · MC 60 min · FJ 70 min (else 40).
// ─────────────────────────────────────────────────────────────────────────────
function _rzLegMins(from,to){
  var f=String(from||'').toUpperCase(),t=String(to||'').toUpperCase();
  var away=(f==='QN')?t:f;                       // the non-Queenstown end drives the duration
  var m={MF:40,MC:60,FJ:70,BRA:15};
  return m[away]||40;
}
function _rzMinToHHMM(min){min=((Math.round(min)%1440)+1440)%1440;return String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0');}
// Friendly "QN → MF" route label.
function _rzLegRoute(from,to){return (String(from||'?'))+' → '+(String(to||'?'));}

function _rzAcMovements(){
  var bk=S._rezdyBookings||[];
  // Group bookings exactly like the schedule: aircraft | start | product.
  var groups={};
  bk.forEach(function(b){
    if((typeof _rzIsCancelled==='function')&&_rzIsCancelled(b))return;
    var ac=_rzBookingAc(b,String(b.orderNumber||''));if(!ac||ac==='__none__')return;
    ((b.items)||[]).forEach(function(it){
      var t=_rzDepTime(it.startTimeLocal||'');if(!t)return;
      var start=_rzHHMMcolon(t);if(_rzMinsFromHHMM(start)==null)return;
      var prod=_rzProduct(it.product);
      var key=_rzDepKey(ac,start,prod);   // same destination+time+aircraft = one flight
      var g=groups[key]||(groups[key]={ac:ac,start:start,prod:prod,pax:0,order:String(b.orderNumber||''),key:key});
      g.pax+=parseInt(it.quantity,10)||0;
    });
  });
  // Fold attached flybacks (dragged onto a flight) into their target block's pax — no separate leg.
  var _attach=S._rzSchedAttach||{};
  Object.keys(groups).forEach(function(k){var g=groups[k];var tgt=_attach[g.order];
    if(tgt&&tgt!==k&&groups[tgt]&&_rzIsFlyback(g.prod)){groups[tgt].pax+=g.pax;delete groups[k];}
  });
  // Build per-aircraft leg lists (departures only; ferries + times computed in the walk below).
  var byAc={};function ensure(ac){return byAc[ac]||(byAc[ac]=[]);}
  Object.keys(groups).forEach(function(k){var g=groups[k];
    var cfg=(typeof _rzEffCfg==='function')?_rzEffCfg(g.prod):null;
    var dest=(cfg&&cfg.short)||'MF';var scenic=!!(cfg&&cfg.scenic);
    var sm=_rzMinsFromHHMM(g.start);if(sm==null)return;
    if(_rzIsFlyback(g.prod)){
      var fdest=(dest==='QN')?'MF':dest;                 // flyback comes back FROM Milford
      // The flyback flies back at its REAL fly-back time (15:30 default, or the operator's override) —
      // NOT its held booking slot. Using the held slot (e.g. an early-morning park slot) made it sort
      // before the morning flights and shove them into the afternoon.
      var ft=(typeof _rzFbTime==='function')?_rzMinsFromHHMM(_rzFbTime(g.prod,g.start)):((sm===720)?_rzMinsFromHHMM('15:30'):sm);
      if(ft==null)ft=(sm===720)?_rzMinsFromHHMM('15:30'):sm;
      ensure(g.ac).push({ac:g.ac,t:ft,from:fdest,to:'QN',pob:g.pax,kind:'flyback',prod:g.prod});
      return;
    }
    if(scenic||dest==='QN'){                              // overhead scenic — out and back to QN
      var dur0=_rzProductDuration(g.prod)||120;
      ensure(g.ac).push({ac:g.ac,t:sm,from:'QN',to:'QN',pob:g.pax,kind:'scenic',prod:g.prod,dur:dur0});
      return;
    }
    var dur=_rzLegMins('QN',dest);
    // Honour the operator's edge-drag overrides: TOP (departure) and BOTTOM (return) of the block.
    var _sov=(S._rzDepTimeOv||{})[g.prod+'|'+g.start];var _eov=(S._rzDepEndOv||{})[g.prod+'|'+g.start];
    var startM=(_sov!=null)?_rzMinsFromHHMM(_sov):sm;if(startM==null)startM=sm;
    var block=(_eov!=null)?(_rzMinsFromHHMM(_eov)-startM):Math.max(_rzProductDuration(g.prod)||270,2*dur);
    if(!(block>=2*dur))block=2*dur; // keep the return from overlapping the outbound
    // Outbound sits at the TOP (one leg-length down); return sits at the BOTTOM (one leg-length up).
    ensure(g.ac).push({ac:g.ac,t:startM,from:'QN',to:dest,pob:g.pax,kind:'outbound',prod:g.prod});
    ensure(g.ac).push({ac:g.ac,t:startM+block-dur,from:dest,to:'QN',pob:g.pax,kind:'return',prod:g.prod});
  });
  // Position walk per aircraft → insert ferries, stamp start/end/dur. `avail` is the minute the
  // aircraft is next free, so a ferry/leg can never start before the previous leg ends — multiple
  // end-of-day returns/flybacks then queue back-to-back instead of stacking at the same time.
  var out=[];
  Object.keys(byAc).forEach(function(ac){
    var legs=byAc[ac];legs.sort(function(a,b){return a.t-b.t;});
    var pos='QN',avail=-1e9;                              // every aircraft starts the day at base
    legs.forEach(function(lg){
      if(lg.kind==='scenic'){                             // QN→QN, position unchanged
        lg.dur=lg.dur||(_rzProductDuration(lg.prod)||120);
        var ss=Math.max(lg.t,avail);lg.start=_rzMinToHHMM(ss);lg.end=_rzMinToHHMM(ss+lg.dur);avail=ss+lg.dur;out.push(lg);return;
      }
      var isRet=(lg.kind==='return'||lg.kind==='flyback');
      if(pos!==lg.from){                                  // not where this leg departs → ferry empty
        var fdur=_rzLegMins(pos,lg.from);
        var fetch=(pos==='QN'&&isRet);                    // end-of-day reposition to collect a return
        var ldur=_rzLegMins(lg.from,lg.to);
        var fstart=fetch?Math.max(_rzMinsFromHHMM('14:30'),avail):Math.max(lg.t-fdur-10,avail);
        var fend=fstart+fdur;
        out.push({ac:ac,t:fstart,start:_rzMinToHHMM(fstart),end:_rzMinToHHMM(fend),from:pos,to:lg.from,kind:'ferry',pob:0,prod:'Ferry',
          hint:fetch?'reposition empty to collect the return':'reposition empty for the next load'});
        pos=lg.from;avail=fend;
        lg.t=fetch?Math.max(_rzMinsFromHHMM('15:40')-ldur,fend):Math.max(lg.t,fend); // home ~15:40 if fetched
      }
      var d=_rzLegMins(lg.from,lg.to);var st=Math.max(lg.t,avail);
      lg.dur=d;lg.start=_rzMinToHHMM(st);lg.end=_rzMinToHHMM(st+d);avail=st+d;out.push(lg);pos=lg.to;
    });
  });
  // Manual schedule blocks (maintenance / training / ferry / private hire) — show their leg too.
  (S._schedBlocks||[]).forEach(function(b){
    if(!b.aircraft||b.aircraft==='__pilot__'||b.aircraft==='__misc__')return;var sm=_rzMinsFromHHMM(b.start);if(sm==null)return;
    var parts=String(b.label||'').split(/[-–/]/).map(function(s){return s.trim();}).filter(Boolean);
    out.push({ac:b.aircraft,t:sm,start:b.start,end:b.end||_rzMinToHHMM(sm+40),from:parts[0]||'',to:parts[1]||'',kind:'manual',pob:0,prod:b.ftype||'Block',label:b.label});
  });
  return out;
}

function _rzRenderMovements(){
  if(S._schedLoading)return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading…</div>';
  if(!S._schedBlocks){
    if(!S._schedLoading&&window.rezdyLoadSchedule)window.rezdyLoadSchedule();
    return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading movements…</div>';
  }
  var legs=_rzAcMovements();
  // Columns: every configured aircraft (+ any that only appear in a leg). No "unallocated".
  var acIds=Object.keys((S&&S.aircraft)||{});
  legs.forEach(function(l){if(l.ac&&acIds.indexOf(l.ac)<0)acIds.push(l.ac);});

  var nFerry=legs.filter(function(l){return l.kind==='ferry';}).length;
  var hdr='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:0">Aircraft movements</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+_rzDowLabel(S.rezdyDate)+' · legs only (no booking detail) · '+legs.length+' leg'+(legs.length===1?'':'s')+(nFerry?' · '+nFerry+' ferry':'')+'</p></div>'+
    '<div style="font-size:11px;color:var(--text3);display:flex;gap:12px;flex-wrap:wrap;align-items:center">'+
      '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:14px;height:10px;border-radius:2px;background:#60a5fa33;border:1px solid #60a5fa;display:inline-block"></span>Passenger leg</span>'+
      '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:14px;height:10px;border-radius:2px;background:#f59e0b33;border:1px solid #f59e0b;display:inline-block"></span>Flyback</span>'+
      '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:14px;height:10px;border-radius:2px;background:#94a3b822;border:1px dashed #94a3b8;display:inline-block"></span>Ferry (empty)</span>'+
    '</div></div>';

  if(!acIds.length)return hdr+'<div class="card" style="text-align:center;padding:36px;color:var(--text3);font-size:13px">No aircraft configured.</div>';
  if(!legs.length)return hdr+'<div class="card" style="text-align:center;padding:36px;color:var(--text3);font-size:13px">No flights on '+_rzEsc(_rzDowLabel(S.rezdyDate))+'.</div>';

  // Fit the visible window to the day's legs (1h padding either side, min 3h, whole hours).
  (function(){
    var _mins=[],_maxs=[];
    legs.forEach(function(l){var s=_rzMinsFromHHMM(l.start),e=_rzMinsFromHHMM(l.end);if(s!=null){_mins.push(s);_maxs.push(e!=null?e:s+40);}});
    if(_mins.length){
      var _lo=Math.min.apply(null,_mins),_hi=Math.max.apply(null,_maxs);
      _RZ_SCH_START=Math.max(0,Math.floor(_lo/60)-1);_RZ_SCH_END=Math.min(24,Math.ceil(_hi/60)+1);
      if(_RZ_SCH_END-_RZ_SCH_START<3)_RZ_SCH_END=Math.min(24,_RZ_SCH_START+3);
    } else {_RZ_SCH_START=6;_RZ_SCH_END=18;}
  })();
  var slots=((_RZ_SCH_END-_RZ_SCH_START)*60)/_RZ_SLOT_MIN;
  var gridH=slots*_RZ_PX_PER_SLOT;

  // left time axis
  var axis='<div style="position:relative;width:'+_RZ_AXIS_W+'px;flex-shrink:0;height:'+gridH+'px;border-right:1px solid var(--border)">';
  for(var i=0;i<=slots;i++){
    var top=i*_RZ_PX_PER_SLOT;var mins=_RZ_SCH_START*60+i*_RZ_SLOT_MIN;var onHour=(mins%60===0),onHalf=(mins%30===0);
    axis+='<div style="position:absolute;top:'+top+'px;left:0;right:0;height:1px;background:'+(onHour?'var(--border)':'var(--border2)')+';opacity:'+(onHour?1:.5)+'"></div>';
    if(onHalf&&i<slots){var hh=String(Math.floor(mins/60)).padStart(2,'0'),mm=String(mins%60).padStart(2,'0');
      axis+='<div style="position:absolute;top:'+(top-1)+'px;left:0;right:6px;text-align:right;font-size:'+(onHour?'11':'10')+'px;color:var(--text3);font-weight:'+(onHour?'700':'400')+';opacity:'+(onHour?1:.7)+'">'+hh+':'+mm+'</div>';}
  }
  axis+='</div>';

  // one column per aircraft
  var colsH='';
  acIds.forEach(function(ac){
    var acCol=_rzAcCol(ac);
    var rows='';
    for(var i2=0;i2<=slots;i2++){var top2=i2*_RZ_PX_PER_SLOT;var m2=_RZ_SCH_START*60+i2*_RZ_SLOT_MIN;var oh=(m2%60===0);
      rows+='<div style="position:absolute;top:'+top2+'px;left:0;right:0;height:1px;background:'+(oh?'var(--border)':'var(--border2)')+';opacity:'+(oh?.8:.35)+'"></div>';}
    var acLegs=legs.filter(function(l){return l.ac===ac;});
    // cascade overlaps so stacked legs stay readable
    acLegs.forEach(function(l){
      var s=_rzMinsFromHHMM(l.start)||0,e=_rzMinsFromHHMM(l.end)||(s+40);
      var ov=acLegs.filter(function(o){var os=_rzMinsFromHHMM(o.start)||0,oe=_rzMinsFromHHMM(o.end)||(os+40);return s<oe&&os<e;});
      l._cols=Math.max(1,ov.length);
      l._idx=ov.filter(function(o){var os=_rzMinsFromHHMM(o.start)||0;return os<s||(os===s&&String(o.kind+o.to)<String(l.kind+l.to));}).length;
    });
    var blocksH='';
    acLegs.sort(function(a,b){return (_rzMinsFromHHMM(a.start)||0)-(_rzMinsFromHHMM(b.start)||0);});
    acLegs.forEach(function(l){
      var top3=_rzSchTop(l.start);var ht=Math.max(_RZ_PX_PER_SLOT,_rzSchHeight(l.start,l.end));var compact=ht<26;
      var n=Math.max(1,l._cols||1),idx=l._idx||0,OFF=14;
      var ferry=(l.kind==='ferry');var fb=(l.kind==='flyback');var man=(l.kind==='manual');
      var col=ferry?'#94a3b8':(fb?'#f59e0b':(man?(acCol):acCol));
      var bg=col+(ferry?'1c':'2a');var bord='1px '+(ferry?'dashed':'solid')+' '+col;
      var ico=ferry?'⤳':(fb?'🛬':(l.kind==='outbound'?'🛫':(l.kind==='return'?'🛬':(man?'🔧':'✈'))));
      var pos='left:'+(2+idx*OFF)+'px;width:calc(100% - '+((n-1)*OFF+4)+'px);z-index:'+(idx+1)+';'+(n>1?'box-shadow:-3px 1px 7px rgba(0,0,0,.25);':'');
      var sub=l.start+'–'+l.end+(l.pob?(' · '+l.pob+'p'):(ferry?' · empty':''));
      blocksH+='<div title="'+_rzEsc((man?(l.label||l.prod):_rzLegRoute(l.from,l.to))+'  '+l.start+'–'+l.end+(l.hint?('  ('+l.hint+')'):''))+'" '+
        'style="position:absolute;'+pos+'top:'+top3+'px;height:'+ht+'px;background:'+bg+';border:'+bord+';border-left:3px solid '+col+';border-radius:6px;padding:'+(compact?'1px 5px':'3px 6px')+';overflow:hidden;box-sizing:border-box;line-height:1.25">'+
        '<div style="font-weight:800;font-size:11px;color:'+col+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+ico+' '+_rzEsc(man?(l.label||l.prod):_rzLegRoute(l.from,l.to))+'</div>'+
        (compact?'':'<div style="font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_rzEsc(sub)+'</div>')+
      '</div>';
    });
    colsH+='<div style="width:'+_RZ_COL_W+'px;flex-shrink:0;border-right:1px solid var(--border)">'+
      '<div style="position:relative;height:'+gridH+'px">'+rows+blocksH+'</div></div>';
  });

  // sticky aircraft-id header row
  var headH='<div style="display:flex;position:sticky;top:0;z-index:2;background:var(--card)">'+
    '<div style="width:'+_RZ_AXIS_W+'px;flex-shrink:0;border-right:1px solid var(--border);border-bottom:1px solid var(--border)"></div>';
  acIds.forEach(function(ac){var acCol=_rzAcCol(ac);
    headH+='<div style="width:'+_RZ_COL_W+'px;flex-shrink:0;border-right:1px solid var(--border);border-bottom:2px solid '+acCol+';padding:6px 8px;text-align:center;font-weight:800;font-size:12px;color:'+acCol+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_rzEsc(ac)+'</div>';});
  headH+='</div>';

  var nowLine='';
  if(S.rezdyDate===_rzToday()){
    var _n=new Date();var _nm=_n.getHours()*60+_n.getMinutes();var _inR=(_nm>=_RZ_SCH_START*60&&_nm<=_RZ_SCH_END*60);
    var _ny=(_nm-_RZ_SCH_START*60)*_RZ_PX_PER_MIN;
    nowLine='<div id="rzNowLine" style="position:absolute;left:0;right:0;top:'+_ny+'px;height:2px;background:#ef4444;z-index:60;pointer-events:none;display:'+(_inR?'block':'none')+'"><div style="position:absolute;left:2px;top:-4px;width:8px;height:8px;border-radius:50%;background:#ef4444"></div><div id="rzNowTime" style="position:absolute;right:4px;top:-9px;font-size:9px;font-weight:800;color:#ef4444">'+String(_n.getHours()).padStart(2,'0')+':'+String(_n.getMinutes()).padStart(2,'0')+'</div></div>';
    if(!S._rzNowTimer)S._rzNowTimer=setInterval(_rzTickNowLine,60000);
  }
  var grid='<div class="card" style="padding:0;overflow-x:auto"><div style="display:inline-block;min-width:100%">'+headH+
    '<div style="display:flex;position:relative">'+axis+colsH+nowLine+'</div></div></div>';
  return hdr+grid;
}
// Open a booking's passenger detail straight from its calendar block.
// Shared block-edit form (used by the Bookings calendar AND the Pilot-movements view). A pilot MEETING
// uses aircraft '__pilot__' and stores its owner pilot on the block (data.pilot).
function _rzSchedEditForm(){
  if(!S._schedEdit)return '';
  var ed=S._schedEdit,isMeeting=(ed.aircraft==='__pilot__'),isMisc=(ed.aircraft==='__misc__');
  var acIds=Object.keys((S&&S.aircraft)||{});
  var h='<div class="card"><div class="st">'+(ed.id?'Edit ':'New ')+(isMeeting?'meeting / note':'block')+'</div><div class="g2" style="margin-bottom:10px">'+
    '<div><label>'+(isMeeting?'Type':'Aircraft')+'</label><select class="fi" onchange="window.schedEditField(\'aircraft\',this.value)">'+
      '<option value="">— select —</option>'+
      acIds.map(function(a){return '<option value="'+_rzEsc(a)+'"'+(ed.aircraft===a?' selected':'')+'>'+_rzEsc(a)+'</option>';}).join('')+
      '<option value="__pilot__"'+(ed.aircraft==='__pilot__'?' selected':'')+'>Pilot meeting / note</option>'+
      '<option value="__misc__"'+(ed.aircraft==='__misc__'?' selected':'')+'>Misc / notes</option>'+
    '</select></div>'+
    '<div><label>Label</label><input class="fi" type="text" value="'+_rzEsc(ed.label)+'" onblur="window.schedEditField(\'label\',this.value)" placeholder="'+(isMeeting?'e.g. Sim / Meeting':'e.g. QN-WF')+'"></div>'+
  '</div><div class="g3" style="margin-bottom:10px">'+
    '<div><label>Start</label><input class="fi" type="time" value="'+_rzEsc(ed.start)+'" onchange="window.schedEditField(\'start\',this.value)"></div>'+
    '<div><label>End</label><input class="fi" type="time" value="'+_rzEsc(ed.end)+'" onchange="window.schedEditField(\'end\',this.value)"></div>'+
    '<div><label>Colour</label><input class="fi" type="color" value="'+_rzEsc(ed.color||(isMeeting?'#a78bfa':_rzAcCol(ed.aircraft)))+'" onchange="window.schedEditField(\'color\',this.value)" style="height:38px;padding:3px"></div>'+
  '</div>'+
  (isMeeting?'':'<div style="margin-bottom:10px"><label>Flight type</label><select class="fi" onchange="window.schedEditField(\'ftype\',this.value)">'+
    ['Maintenance','Training','Ferry','Private Hire','Other'].map(function(t){return '<option value="'+t+'"'+((ed.ftype||'Maintenance')===t?' selected':'')+'>'+t+'</option>';}).join('')+
  '</select></div>')+
  '<div style="margin-bottom:10px"><label>Notes</label><input class="fi" type="text" value="'+_rzEsc(ed.notes)+'" onblur="window.schedEditField(\'notes\',this.value)"></div>';
  if(isMisc){
    // Meeting attendees — pick any staff. Those who are pilots (✈) also get the meeting copied into
    // their Pilot-movements lane (and are reserved by the allocator). The block reads "JY DF AA <label>".
    var att=ed.attendees||[];var staff=_rzAllStaff();
    h+='<div style="margin-bottom:10px"><label>Staff attending</label><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">';
    if(!staff.length)h+='<span style="font-size:11px;color:var(--text3)">No staff found</span>';
    staff.forEach(function(p){var on=att.indexOf(p.code)>=0,off=!p.rostered,pc=p.isPilot?'#60a5fa':'#94a3b8';
      h+='<button onclick="window.schedToggleAttendee(\''+_rzEsc(p.code).replace(/'/g,"\\'")+'\')" title="'+_rzEsc(p.name)+(p.isPilot?' · pilot':'')+(off?' (not rostered today)':'')+'" style="display:inline-flex;align-items:center;gap:4px;padding:5px 11px;border-radius:16px;border:'+(on?'2px solid '+pc:'1px solid '+pc+(off?'47':'80'))+';background:'+pc+(on?'33':(off?'0d':'1a'))+';color:'+pc+';font-size:12px;font-weight:800;cursor:pointer;opacity:'+(off?'.6':'1')+'">'+(on?'✓ ':'')+_rzEsc(p.code)+(p.isPilot?' ✈':'')+'</button>';});
    h+='</div><div style="font-size:11px;color:var(--text3);margin-top:5px">✈ pilots also appear in Pilot movements.</div></div>';
  } else {
  var sel=isMeeting?(ed.pilot||''):(ed.id?((S._schedPilots||{})[ed.id]||''):(ed.pilot||''));
  var pp=_rzAvailablePilots().filter(function(p){if(!ed.aircraft||ed.aircraft==='__unalloc__'||ed.aircraft==='__misc__'||ed.aircraft==='__pilot__')return true;var en=_rzPilotEndorse(p.code);return !(en&&en.length)||en.indexOf(ed.aircraft)>=0;});
  var setFn=isMeeting?'schedSetMeetingPilot':'schedSetBlockPilot';
  h+='<div style="margin-bottom:10px"><label>Pilot</label><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">';
  if(!pp.length)h+='<span style="font-size:11px;color:var(--text3)">No pilots available</span>';
  pp.forEach(function(p){var on=sel===p.code,off=!p.rostered;h+='<button onclick="window.'+setFn+'(\''+_rzEsc(p.code).replace(/'/g,"\\'")+'\')" title="'+_rzEsc(p.name)+(off?' (not rostered today)':'')+'" style="display:inline-flex;align-items:center;gap:4px;padding:5px 11px;border-radius:16px;border:'+(on?'2px solid #60a5fa':'1px solid rgba(96,165,250,'+(off?'.28':'.5')+')')+';background:rgba(96,165,250,'+(on?'.22':(off?'.05':'.1'))+');color:#60a5fa;font-size:12px;font-weight:800;cursor:pointer;opacity:'+(off?'.6':'1')+'">'+(on?'✓ ':'✈ ')+_rzEsc(p.code)+(off?' off':'')+'</button>';});
  h+='</div></div>';
  }
  h+='<div style="display:flex;gap:8px">'+
    '<button class="btn btn-ghost" style="font-size:12px;border-color:rgba(74,222,128,.5);color:#4ade80" onclick="window.schedSaveBlock()">💾 Save</button>'+
    (ed.id?'<button class="btn btn-ghost" style="font-size:12px;color:#ef4444;border-color:rgba(239,68,68,.4)" onclick="window.schedDeleteBlock()">🗑 Delete</button>':'')+
    '<button class="btn btn-ghost" style="font-size:12px" onclick="S._schedEdit=null;render()">Cancel</button>'+
  '</div></div>';
  return h;
}
window.schedSetMeetingPilot=function(code){if(S._schedEdit){S._schedEdit.pilot=(S._schedEdit.pilot===code?'':code);render();}};
window.schedToggleAttendee=function(code){var ed=S._schedEdit;if(!ed||!code)return;ed.attendees=ed.attendees||[];var i=ed.attendees.indexOf(code);if(i>=0)ed.attendees.splice(i,1);else ed.attendees.push(code);render();};
window.schedNewPilotBlock=function(code){S._schedEdit={id:null,aircraft:'__pilot__',pilot:code||'',label:'Meeting',start:'09:00',end:'10:00',color:'#a78bfa',notes:'',ftype:'Meeting'};render();};
// Build each pilot's day: their allocated flights (rotation span) + maintenance-ferry drives + meetings.
function _rzPilotMovements(){
  var auto=S._schedAutoPilots||{},man=S._schedPilots||{};
  var flights=(typeof _schedDayFlights==='function')?_schedDayFlights(S.rezdyDate):[];
  var fBy={};flights.forEach(function(f){fBy[f.key]=f;});
  var blocksById={};(S._schedBlocks||[]).forEach(function(b){if(b&&b.id)blocksById[b.id]=b;});
  var byPilot={};function ensure(p){return byPilot[p]||(byPilot[p]=[]);}
  Object.keys(fBy).forEach(function(k){
    var pilot=man[k]||auto[k];if(!pilot)return;var f=fBy[k];var mb=blocksById[k];
    var _pForced=(!!man[k]&&!!auto[k]&&man[k]!==auto[k]),_pAutoWas=auto[k];   // manually forced off the optimiser's pick
    if(mb){
      var lbl=(mb.aircraft&&mb.aircraft!=='__misc__'&&mb.aircraft!=='__pilot__'?String(mb.aircraft).replace(/^ZK-?/,'')+' ':'')+(mb.label||mb.ftype||'Block');
      ensure(pilot).push({start:mb.start,end:mb.end,label:lbl,kind:'manual',ico:'🔧',ac:mb.aircraft});
      var lp=String(mb.label||'').toUpperCase().split(/[-–\/]/).map(function(s){return s.trim();});
      var sm=_rzMinsFromHHMM(mb.start),em=_rzMinsFromHHMM(mb.end);
      if(lp[1]==='WF'&&em!=null)ensure(pilot).push({start:mb.end,end:_rzMinToHHMM(em+RZ_MAINT_DRIVE_MIN),label:'Drive WF→QN',kind:'drive',ico:'🚗'});
      else if(lp[0]==='WF'&&sm!=null)ensure(pilot).push({start:_rzMinToHHMM(Math.max(0,sm-RZ_MAINT_DRIVE_MIN)),end:mb.start,label:'Drive QN→WF',kind:'drive',ico:'🚗'});
    } else {
      var parts=String(k).split('|'),ac=parts[0],prod=parts[2]||'';
      var dest=(typeof _rzGroupDest==='function')?_rzGroupDest(prod):'';
      ensure(pilot).push({start:_rzMinToHHMM(f.depMin),end:_rzMinToHHMM(f.endMin),label:(ac&&ac!=='__unalloc__'?String(ac).replace(/^ZK-?/,''):'?')+(dest?' '+dest:''),kind:'flight',ico:'✈',ac:ac,forced:_pForced,autoWas:_pAutoWas});
    }
  });
  // Pilot meetings (__pilot__ single-pilot) + multi-attendee meetings (misc): copy into each PILOT
  // attendee's lane so their day shows it (and the allocator reserves them).
  var _pilotSet={};(_rzAllStaff()||[]).forEach(function(p){if(p.isPilot)_pilotSet[p.code]=1;});
  (S._schedBlocks||[]).forEach(function(b){
    if(!b)return;
    if(b.pilot)ensure(b.pilot).push({start:b.start,end:b.end,label:b.label||b.ftype||'Meeting',kind:'meeting',ico:'📅',id:b.id});
    if(b.attendees&&b.attendees.length){var ttl=b.label||'Meeting';b.attendees.forEach(function(code){if(code&&code!==b.pilot&&_pilotSet[code])ensure(code).push({start:b.start,end:b.end,label:ttl,kind:'meeting',ico:'📅',id:b.id});});}
  });
  return byPilot;
}
function _rzRenderPilotMovements(){
  if(S._schedLoading)return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading…</div>';
  if(!S._schedBlocks){if(window.rezdyLoadSchedule)window.rezdyLoadSchedule();return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading pilot movements…</div>';}
  var byPilot=_rzPilotMovements();var avail=_rzAvailablePilots()||[];
  var codes=[],seen={},nameOf={},offOf={};
  avail.forEach(function(p){if(!seen[p.code]){seen[p.code]=1;codes.push(p.code);}nameOf[p.code]=p.name;offOf[p.code]=!p.rostered;});
  Object.keys(byPilot).forEach(function(c){if(!seen[c]){seen[c]=1;codes.push(c);offOf[c]=true;}});
  var all=[];codes.forEach(function(c){(byPilot[c]||[]).forEach(function(m){all.push(m);});});
  var hdr='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:0">Pilot movements</div><p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+_rzDowLabel(S.rezdyDate)+' · what each pilot is doing · tap a pilot column ＋ to add a meeting</p></div>'+
    '<div style="font-size:11px;color:var(--text3);display:flex;gap:12px;flex-wrap:wrap">'+
      '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:14px;height:10px;border-radius:2px;background:linear-gradient(90deg,#ef4444,#22c55e,#60a5fa);border:1px solid var(--border)"></span>Flight (aircraft colour)</span>'+
      '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:14px;height:10px;border-radius:2px;background:#f59e0b33;border:1px dashed #f59e0b"></span>Drive</span>'+
      '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:14px;height:10px;border-radius:2px;background:#a78bfa33;border:1px solid #a78bfa"></span>Meeting</span>'+
    '</div></div>';
  if(!codes.length)return hdr+'<div class="card" style="text-align:center;padding:36px;color:var(--text3);font-size:13px">No pilots rostered on '+_rzEsc(_rzDowLabel(S.rezdyDate))+'.</div>';
  (function(){var mins=[],maxs=[];all.forEach(function(m){var s=_rzMinsFromHHMM(m.start),e=_rzMinsFromHHMM(m.end);if(s!=null){mins.push(s);maxs.push(e!=null?e:s+30);}});
    if(mins.length){var lo=Math.min.apply(null,mins),hi=Math.max.apply(null,maxs);_RZ_SCH_START=Math.max(0,Math.floor(lo/60)-1);_RZ_SCH_END=Math.min(24,Math.ceil(hi/60)+1);if(_RZ_SCH_END-_RZ_SCH_START<3)_RZ_SCH_END=Math.min(24,_RZ_SCH_START+3);}else{_RZ_SCH_START=6;_RZ_SCH_END=18;}})();
  var slots=((_RZ_SCH_END-_RZ_SCH_START)*60)/_RZ_SLOT_MIN,gridH=slots*_RZ_PX_PER_SLOT;
  var axis='<div style="position:relative;width:'+_RZ_AXIS_W+'px;flex-shrink:0;height:'+gridH+'px;border-right:1px solid var(--border)">';
  for(var i=0;i<=slots;i++){var top=i*_RZ_PX_PER_SLOT,mins=_RZ_SCH_START*60+i*_RZ_SLOT_MIN,onHour=(mins%60===0),onHalf=(mins%30===0);
    axis+='<div style="position:absolute;top:'+top+'px;left:0;right:0;height:1px;background:'+(onHour?'var(--border)':'var(--border2)')+';opacity:'+(onHour?1:.5)+'"></div>';
    if(onHalf&&i<slots){var hh=String(Math.floor(mins/60)).padStart(2,'0'),mm=String(mins%60).padStart(2,'0');axis+='<div style="position:absolute;top:'+(top-1)+'px;left:0;right:6px;text-align:right;font-size:'+(onHour?'11':'10')+'px;color:var(--text3);font-weight:'+(onHour?'700':'400')+'">'+hh+':'+mm+'</div>';}}
  axis+='</div>';
  var colsH='';
  codes.forEach(function(code){
    var rows='';for(var i2=0;i2<=slots;i2++){var t2=i2*_RZ_PX_PER_SLOT,m2=_RZ_SCH_START*60+i2*_RZ_SLOT_MIN,oh=(m2%60===0);rows+='<div style="position:absolute;top:'+t2+'px;left:0;right:0;height:1px;pointer-events:none;background:'+(oh?'var(--border)':'var(--border2)')+';opacity:'+(oh?.8:.35)+'"></div>';}
    var items=(byPilot[code]||[]).slice().sort(function(a,b){return (_rzMinsFromHHMM(a.start)||0)-(_rzMinsFromHHMM(b.start)||0);});
    items.forEach(function(m){var s=_rzMinsFromHHMM(m.start)||0,e=_rzMinsFromHHMM(m.end)||(s+30);var ov=items.filter(function(o){var os=_rzMinsFromHHMM(o.start)||0,oe=_rzMinsFromHHMM(o.end)||(os+30);return s<oe&&os<e;});m._cols=Math.max(1,ov.length);m._idx=ov.filter(function(o){var os=_rzMinsFromHHMM(o.start)||0;return os<s;}).length;});
    var blocksH='';
    items.forEach(function(m){
      var top=_rzSchTop(m.start),ht=Math.max(_RZ_PX_PER_SLOT,_rzSchHeight(m.start,m.end)),compact=ht<26;
      // Flight + manual blocks take their AIRCRAFT's colour (so a pilot's day reads as the fleet does);
      // drives stay amber and meetings purple (no single aircraft).
      var _acCol=(m.ac&&m.ac!=='__unalloc__'&&m.ac!=='__misc__'&&m.ac!=='__pilot__')?_rzAcCol(m.ac):null;
      var col=(m.kind==='drive')?'#f59e0b':(m.kind==='meeting')?'#a78bfa':(_acCol||((m.kind==='manual')?'#94a3b8':'#60a5fa'));
      var n=Math.max(1,m._cols||1),idx=m._idx||0,OFF=12;
      var posS='left:'+(2+idx*OFF)+'px;width:calc(100% - '+((n-1)*OFF+4)+'px);z-index:'+(idx+1)+';';
      var clk=(m.kind==='meeting'&&m.id)?('onclick="window.schedEditBlock(\''+_rzEsc(String(m.id)).replace(/'/g,"\\'")+'\')" '):'';
      var _fIcon=m.forced?'<span title="'+_rzEsc('Pilot forced by user'+(m.autoWas?' — optimal '+String(m.autoWas):''))+'" style="cursor:help;color:#f59e0b">✋</span> ':'';
      blocksH+='<div '+clk+'style="position:absolute;'+posS+'top:'+top+'px;height:'+ht+'px;background:'+col+'22;border:1px '+(m.kind==='drive'?'dashed':'solid')+' '+col+';border-left:3px solid '+col+';border-radius:6px;padding:'+(compact?'1px 5px':'2px 6px')+';overflow:hidden;box-sizing:border-box;line-height:1.2'+(clk?';cursor:pointer':'')+'">'+
        '<div style="font-weight:800;font-size:11px;color:'+col+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_fIcon+(m.ico||'')+' '+_rzEsc(m.label)+'</div>'+
        (compact?'':'<div style="font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_rzEsc(m.start+'–'+m.end)+'</div>')+
      '</div>';
    });
    colsH+='<div style="width:'+_RZ_COL_W+'px;flex-shrink:0;border-right:1px solid var(--border)"><div onclick="window.rezdyPilotColClick(\''+_rzEsc(String(code)).replace(/'/g,"\\'")+'\',event)" style="position:relative;height:'+gridH+'px;cursor:copy">'+rows+blocksH+'</div></div>';
  });
  var headH='<div style="display:flex;position:sticky;top:0;z-index:2;background:var(--card)"><div style="width:'+_RZ_AXIS_W+'px;flex-shrink:0;border-right:1px solid var(--border);border-bottom:1px solid var(--border)"></div>';
  codes.forEach(function(code){headH+='<div style="width:'+_RZ_COL_W+'px;flex-shrink:0;border-right:1px solid var(--border);border-bottom:2px solid #60a5fa;padding:4px 6px;text-align:center">'+
    '<div style="font-weight:800;font-size:12px;color:#60a5fa;opacity:'+(offOf[code]?'.55':'1')+'">'+_rzEsc(code)+(offOf[code]?' <span style="font-size:8px">off</span>':'')+'</div>'+
    '<button onclick="window.schedNewPilotBlock(\''+_rzEsc(String(code)).replace(/'/g,"\\'")+'\')" title="Add a meeting / note for '+_rzEsc(code)+'" style="margin-top:2px;font-size:10px;border:1px dashed var(--border2);background:transparent;color:var(--text3);border-radius:6px;padding:1px 7px;cursor:pointer">＋</button></div>';});
  headH+='</div>';
  var nowLine='';
  if(S.rezdyDate===_rzToday()){var _n=new Date(),_nm=_n.getHours()*60+_n.getMinutes(),_inR=(_nm>=_RZ_SCH_START*60&&_nm<=_RZ_SCH_END*60),_ny=(_nm-_RZ_SCH_START*60)*_RZ_PX_PER_MIN;
    nowLine='<div id="rzNowLine" style="position:absolute;left:0;right:0;top:'+_ny+'px;height:2px;background:#ef4444;z-index:60;pointer-events:none;display:'+(_inR?'block':'none')+'"></div>';if(!S._rzNowTimer)S._rzNowTimer=setInterval(_rzTickNowLine,60000);}
  var formH=_rzSchedEditForm();
  var grid='<div class="card" style="padding:0;overflow-x:auto"><div style="display:inline-block;min-width:100%">'+headH+'<div style="display:flex;position:relative">'+axis+colsH+nowLine+'</div></div></div>';
  return hdr+formH+grid;
}
window.rezdySchedShowGroup=function(key){S._schedGroupKey=key;S._schedEdit=null;render();};
// Jump from a calendar block's passenger detail straight to that booking in the Bookings tab.
// The Bookings page lives in the Operations section (S.section/S.tab), NOT as a rezdy sub-tab —
// setting S.rezdyTab did nothing, so the button appeared dead. Switch sections and open the card.
window.rezdyGotoBooking=function(order){
  order=String(order||'');
  S._rezdyOpen=S._rezdyOpen||{};if(order)S._rezdyOpen[order]=true;
  S._schedGroupKey=null;
  // Select the booking's departure (or the cancelled view) so its card is actually on screen.
  var _b=(S._rezdyBookings||[]).find(function(x){return String(x.orderNumber||'')===order;});
  if(_b)S._bkDepFilter=_rzIsCancelled(_b)?'__cancelled__':_rzBookingDep(_b);
  if(typeof window.switchOpsTab==='function')window.switchOpsTab('bookings');
  else{S.section='operations';S.tab='bookings';render();}
};

window.rezdyLoadSchedule=async function(){
  S._schedLoading=true;safeRender();
  const rows=await sbF('ts_schedule','&block_date=eq.'+encodeURIComponent(S.rezdyDate));
  S._schedBlocks=(rows||[]).map(function(r){const d=_rzRow(r);d.id=r.id||d.id;return d;}).filter(function(b){return b&&b.start;});
  S._schedLoading=false;
  // The Calendar shows booking-derived blocks too, so make sure the day's bookings are loaded.
  if(!S._rezdyBookings){
    const brows=await sbF('ts_rezdy_bookings','&tour_date=eq.'+encodeURIComponent(S.rezdyDate));
    S._rezdyBookings=_rzMapBookings(brows,S.rezdyDate);_rzApplyManualBk();
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
// Manual block display title: "AA/SLA QN-WF" — pilot + aircraft are DERIVED (from the picker and the
// aircraft selector); the operator only types the label (e.g. "QN-WF").
// Misc/meeting label: attendee codes + title, e.g. "JY DF AA Meeting".
function _rzMiscLabel(b){
  var codes=((b&&b.attendees)||[]).join(' ');
  var lbl=(b&&b.label)||'';
  return ((codes?codes+' ':'')+lbl).trim()||(b&&b.notes)||'Meeting';
}
function _rzManBlockTitle(b){
  if(b&&b.aircraft==='__misc__')return _rzMiscLabel(b);
  var pilot=(S._schedPilots||{})[b.id]||(S._schedAutoPilots||{})[b.id]||'';   // manual pick, else the auto-allocated pilot
  var ac=(b.aircraft&&b.aircraft!=='__unalloc__'&&b.aircraft!=='__misc__')?String(b.aircraft).replace(/^ZK-?/,''):'';
  var pre=(pilot?pilot+'/':'')+ac;
  var lbl=b.label||'';
  return ((pre?pre:'')+(pre&&lbl?' ':'')+lbl)||(b.aircraft||'');
}
window.schedNewBlock=function(){
  const acIds=Object.keys((S&&S.aircraft)||{});
  const ac=acIds[0]||'';
  S._schedEdit={id:null,aircraft:ac,label:'',start:'09:00',end:'10:00',color:_rzAcCol(ac),notes:'',ftype:'Maintenance'};
  render();
};
// The clicked time on a calendar/pilot column → snapped 15-min start (1h default block).
function _rzSchedClickTimes(e){
  var rect=e.currentTarget.getBoundingClientRect();
  var min=_RZ_SCH_START*60+(e.clientY-rect.top)/_RZ_PX_PER_MIN;
  min=Math.max(_RZ_SCH_START*60,Math.min(_RZ_SCH_END*60-15,Math.round(min/15)*15));
  return {start:_rzMinToHHMM(min),end:_rzMinToHHMM(Math.min(_RZ_SCH_END*60,min+60))};
}
// Click empty space in an aircraft column (Bookings calendar) → open the add-block form for that
// aircraft at the clicked time. Clicks on a block/overlay are ignored (target !== the column bg).
window.rezdySchedColClick=function(ac,e){
  if(!e||e.target!==e.currentTarget)return;
  var t=_rzSchedClickTimes(e);
  if(ac==='__misc__'){S._schedEdit={id:null,aircraft:'__misc__',label:'Meeting',attendees:[],start:t.start,end:t.end,color:'#94a3b8',notes:'',ftype:'Other'};S._schedGroupKey=null;render();return;}
  S._schedEdit={id:null,aircraft:ac,label:'',start:t.start,end:t.end,color:_rzAcCol(ac),notes:'',ftype:'Maintenance'};
  S._schedGroupKey=null;render();
};
// Click empty space in a pilot column (Pilot movements) → open the add-meeting form for that pilot.
window.rezdyPilotColClick=function(code,e){
  if(!e||e.target!==e.currentTarget)return;
  var t=_rzSchedClickTimes(e);
  S._schedEdit={id:null,aircraft:'__pilot__',pilot:code||'',label:'Meeting',start:t.start,end:t.end,color:'#a78bfa',notes:'',ftype:'Meeting'};
  S._schedGroupKey=null;render();
};
// New entry in the far-right Misc column (meetings / notes), e.g. "DF AA JY Meeting".
window.schedNewMisc=function(){
  S._schedEdit={id:null,aircraft:'__misc__',label:'Meeting',attendees:[],start:'11:00',end:'13:00',color:'#94a3b8',notes:'',ftype:'Other'};
  render();
};
window.schedEditBlock=function(id){
  const b=(S._schedBlocks||[]).find(function(x){return x.id===id;});
  if(!b)return;
  S._schedEdit={id:b.id,aircraft:b.aircraft||'',pilot:b.pilot||'',attendees:(b.attendees||[]).slice(),label:b.label||'',start:b.start||'09:00',end:b.end||'10:00',color:b.color||_rzAcCol(b.aircraft),notes:b.notes||'',ftype:b.ftype||'Maintenance'};
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
// Assign a pilot to the block being edited. Existing block → set immediately; new (unsaved) block →
// hold on the draft and apply on Save. Tapping the selected pilot again clears it.
window.schedSetBlockPilot=function(code){
  var ed=S._schedEdit;if(!ed||!code)return;
  if(ed.id){window.rezdySchedSetPilot(ed.id,code);return;}  // sets S._schedPilots[id] + saves + render
  if(ed.aircraft&&ed.aircraft!=='__unalloc__'){if(typeof _pilotRatedForAc==='function'&&!_pilotRatedForAc(code,ed.aircraft)){if(typeof toast==='function')toast(code+' is not type-rated on '+String(ed.aircraft).replace('ZK-','')+'.','warn');return;}}
  ed.pilot=(ed.pilot===code?'':code);render();
};
window.schedSaveBlock=async function(){
  const ed=S._schedEdit;if(!ed)return;
  if(!ed.aircraft){toast('Pick an aircraft','err');return;}
  if(!ed.start||!ed.end){toast('Start and end required','err');return;}
  if(ed.end<=ed.start){toast('End time must be after the start time','err');return;}
  const id=ed.id||('sch_'+Date.now()+'_'+Math.floor(Math.random()*1e5));
  const payload={id:id,block_date:S.rezdyDate,data:{aircraft:ed.aircraft,pilot:(ed.aircraft==='__pilot__'?(ed.pilot||''):''),attendees:(ed.attendees||[]),label:ed.label||'',start:ed.start,end:ed.end,color:ed.color||_rzAcCol(ed.aircraft),notes:ed.notes||'',ftype:ed.ftype||'Maintenance'}};
  const r=await sbU('ts_schedule',[payload]);
  if(!r){toast('Save failed','err');return;}
  if(ed.pilot){S._schedPilots=S._schedPilots||{};S._schedPilots[id]=ed.pilot;if(window.pickupSave)window.pickupSave(true);_rzSchedBroadcast();}  // apply the draft pilot to the new block
  S._schedEdit=null;
  toast('Block saved ✓','ok');
  await window.rezdyLoadSchedule();
  _rzSchedBroadcast();
};
window.schedDeleteBlock=async function(){
  const ed=S._schedEdit;if(!ed||!ed.id)return;
  if(!confirm('Delete this schedule block?'))return;
  const ok=await sbDel('ts_schedule',ed.id);
  if(ok&&S._schedPilots&&S._schedPilots[ed.id]){delete S._schedPilots[ed.id];if(window.pickupSave)window.pickupSave(true);} // don't orphan the block's pilot in the pickup blob
  S._schedEdit=null;
  if(ok){toast('Block deleted','ok');await window.rezdyLoadSchedule();_rzSchedBroadcast();}
  else{toast('Delete failed','err');render();}
};
