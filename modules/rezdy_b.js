// === MODULE: rezdy_b === v26.24 ===
function _rzRenderBookings(){
  if(!S._rezdyBookings){if(!S._rezdyLoading)window.rezdyLoadBookings();return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading bookings…</div>';}
  if(typeof window.avEnsureDay==='function')window.avEnsureDay(S.rezdyDate);   // live Rezdy seats for the day's departures
  if(!S._rezdyOpen||typeof S._rezdyOpen!=='object')S._rezdyOpen={};
  const allRows=(S._rezdyBookings||[]).slice();
  const active=allRows.filter(function(b){return !_rzIsCancelled(b);});
  const cancelledRows=allRows.filter(function(b){return _rzIsCancelled(b);});
  const deps=[];active.forEach(function(b){var d=_rzBookingDep(b);if(deps.indexOf(d)<0)deps.push(d);});
  deps.sort(_rzDepCmp);
  // Surface EVERY scheduled FCF (Milford Fly-Cruise-Fly) departure as a chip — even slots with no bookings yet.
  if(typeof _avDepsForProduct==='function'){_avDepsForProduct(S.rezdyDate,'Milford Sound Fly Cruise Fly').forEach(function(t){if(deps.indexOf(t)<0)deps.push(t);});deps.sort(_rzDepCmp);}
  const q=String(S._bkSearch||'').trim();
  const searching=q.length>0;
  // Dedicated "Cancelled" view (a pseudo-departure) showing the whole day's cancelled bookings.
  // Auto-shown on days that have ONLY cancelled bookings (no active departures) so they're still visible.
  const _showCancelled=!searching&&cancelledRows.length>0&&(S._bkDepFilter==='__cancelled__'||deps.length===0);
  // One departure at a time — default to the first departure when none is chosen. (No "All".)
  const depFilter=(searching||_showCancelled)?null:((S._bkDepFilter&&deps.indexOf(S._bkDepFilter)>=0)?S._bkDepFilter:(_rzDefaultDep(deps)||null));
  if(depFilter)S._bkDepFilter=depFilter; // persist the resolved departure so Push knows which one
  // Checked-in count for the SELECTED departure (push is departure-scoped).
  var _ciCount=active.filter(function(b){return _rzBookingDep(b)===depFilter&&(S._rzBookingCheckedIn||{})[String(b.orderNumber||'')];}).length;
  // Whole-day passenger breakdown across the ACTIVE bookings. Seats sold excludes infants
  // (lap pax — they travel free and don't take a seat).
  var _dayA=0,_dayC=0,_dayI=0;active.forEach(function(b){var _x=_rzEffBreakdown(b);_dayA+=_x.a;_dayC+=_x.c;_dayI+=_x.i;});
  var _seatsSold=_dayA+_dayC;
  var _dayBd=(allRows.length&&active.length)?'<div style="font-size:12px;margin:5px 0 0;display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
      '<span style="font-weight:800;color:var(--text2);letter-spacing:.02em">'+_dayA+'A'+(_dayC?' · '+_dayC+'C':'')+(_dayI?' · '+_dayI+'i':'')+'</span>'+
      '<span style="padding:2px 9px;border-radius:20px;background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.32);color:#4ade80;font-weight:800;font-size:11px;white-space:nowrap">'+_seatsSold+' seat'+(_seatsSold===1?'':'s')+' sold</span>'+
      (_dayI?'<span style="font-size:10px;color:var(--text3)">'+_dayI+' infant'+(_dayI===1?'':'s')+' travel free</span>':'')+
    '</div>':'';
  const hdr='<div class="card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'+
    '<div><div class="st" style="margin-bottom:0">Rezdy Bookings</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+(allRows.length?active.length+' active'+(cancelledRows.length?' · '+cancelledRows.length+' cancelled':'')+' for '+_rzDowLabel(S.rezdyDate):'No cached bookings')+'</p>'+_dayBd+'</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
      '<button class="btn btn-ghost" style="font-size:12px" onclick="window.rezdyNewBookingOpen()">+ New booking</button>'+
      (allRows.length?'<button class="btn btn-ghost" style="font-size:12px" title="Print the day’s bookings" onclick="window.rezdyBookingsPrint()">🖨 Print</button>':'')+
      '<button class="btn btn-ghost" style="font-size:12px;padding:7px 12px" title="Preview the seatmap with declared weights — includes passengers not yet checked in" onclick="window.rezdyPreviewToManifest()">👁 Preview</button>'+
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
  // Rendered when there are active departures OR cancelled bookings (so the Cancelled pill always shows).
  let depSel='';
  if(deps.length||cancelledRows.length){
    depSel='<div class="card" style="padding:10px 12px'+(searching?';opacity:.5':'')+'">'+
      '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);font-weight:800;margin-bottom:8px">'+(deps.length?'Departure':'Cancelled bookings')+(searching?' — paused while searching':'')+'</div>'+
      '<div style="display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:2px">';
    // Available fleet pax seats today = sum of seat capacity for aircraft that CAN fly (not off/maint on
    // the resources board). Seats-remaining per departure = this minus the seated pax.
    var _fleetSeats=0;try{['ZK-SLA','ZK-SLB','ZK-SDB','ZK-SLD','ZK-SLQ'].forEach(function(ac){if(!(S.aircraft||{})[ac])return;if(typeof _schedAcCanFly==='function'&&!_schedAcCanFly(ac))return;_fleetSeats+=(typeof _schedTail==='function'?((typeof _schedNum==='function'&&_schedNum(_schedTail(ac).cap))||(typeof _schedDefaultCap==='function'?_schedDefaultCap(ac):0)):0);});}catch(e){}
    // Flybacks are HELD in an outbound slot (e.g. 1200) and ride the returning aircraft, so they consume
    // seats from THAT slot's pool. Build per-slot regular pax + per-slot flyback pax; remaining for a slot
    // = fleet - (its regular pax + flybacks held in it). The FLB chip mirrors the tightest held slot, so a
    // 1200 with 1 pax + a flyback of 2 both read (fleet-3). 0930 has no flyback held in it → unaffected.
    var _depPaxBySlot={},_fbBySlot={};
    try{active.forEach(function(b){
      var e=(typeof _rzEffBreakdown==='function')?_rzEffBreakdown(b):null;var pax=e?((e.a||0)+(e.c||0)):0;
      if(typeof _rzBookingIsFlyback==='function'&&_rzBookingIsFlyback(b)){
        var fbIt=(b.items||[]).find(function(it){return _rzIsFlyback(_rzProduct(it&&it.product));})||{};
        var slot=_rzDepTime(fbIt.startTimeLocal||'');
        _fbBySlot[slot]=(_fbBySlot[slot]||0)+pax;
      }else{var dd=_rzBookingDep(b);_depPaxBySlot[dd]=(_depPaxBySlot[dd]||0)+pax;}
    });}catch(e){}
    deps.forEach(function(d){
      var depB=active.filter(function(b){return _rzBookingDep(b)===d;});
      var cnt=depB.length;
      var _rem;
      if(d===RZ_FLYBACK_DEP){
        _rem=_fleetSeats;
        Object.keys(_fbBySlot).forEach(function(slot){var committed=(_depPaxBySlot[slot]||0)+_fbBySlot[slot];var r=_fleetSeats-committed;if(r<_rem)_rem=r;});
      }else{
        _rem=_fleetSeats-(_depPaxBySlot[d]||0)-(_fbBySlot[d]||0);
      }
      var prod=(typeof _rzDepProdLabel==='function')?_rzDepProdLabel(depB):'';   // split departure (e.g. THH + MCGL) → destination group "MC"
      if(!prod&&typeof _avProdShortForDep==='function')prod=_avProdShortForDep(S.rezdyDate,d);   // no-booking slot → label from availability
      var on=!searching&&depFilter===d;
      depSel+='<button onclick="S._bkSearch=\'\';S._bkDepFilter=\''+_rzEsc(d).replace(/'/g,"\\'")+'\';render()" style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:74px;padding:9px 16px;border-radius:12px;cursor:pointer;border:2px solid '+(on?'var(--accent)':'var(--border2)')+';background:'+(on?'var(--accent)':'transparent')+';color:'+(on?'#fff':'var(--text2)')+';font-weight:800">'+
        '<span style="font-size:16px;letter-spacing:.02em;line-height:1.1;white-space:nowrap">'+_rzEsc(_rzDepDisplay(d))+((_rzDepShowProduct(d)&&prod)?' '+_rzEsc(prod):'')+'</span>'+
        '<span style="font-size:10px;font-weight:700;opacity:'+(on?'.9':'.6')+'">'+cnt+' bkg'+(cnt===1?'':'s')+'</span>'+
        (function(){var _rz=(typeof _avSeatsForDep==='function')?_avSeatsForDep(S.rezdyDate,d):null;if(_rz==null)return '';return '<span title="Live seats remaining on Rezdy" style="font-size:9px;font-weight:800;color:'+(on?'#fff':(_rz<=0?'#ef4444':_rz<=2?'#f59e0b':'#22c55e'))+';opacity:'+(on?'.95':'1')+'">'+_rz+' seat'+(_rz===1?'':'s')+' left</span>';})()+
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
      if(_bkSort==='ac'){
        var aa=_rzBookingAc(a,a.orderNumber)||'',bb=_rzBookingAc(b,b.orderNumber)||'';     // allocated aircraft
        if(aa!==bb){if(!aa)return 1;if(!bb)return -1;return acDisp(aa).localeCompare(acDisp(bb));} // unallocated last
        return String(a.customerName||'').localeCompare(String(b.customerName||''),undefined,{sensitivity:'base'}); // then by name within an aircraft
      }
      var ca=(S._rzBookingCheckedIn||{})[String(a.orderNumber||'')]?1:0,cb=(S._rzBookingCheckedIn||{})[String(b.orderNumber||'')]?1:0;return ca-cb; // default: checked-in to the bottom
    });
    var gbd={a:0,c:0,i:0};grp.forEach(function(x){var e=_rzEffBreakdown(x);gbd.a+=e.a;gbd.c+=e.c;gbd.i+=e.i;});
    var prod=(typeof _rzDepProdLabel==='function')?_rzDepProdLabel(grp):_rzProduct((((grp[0]||{}).items||[])[0]||{}).product||'');   // split departure → destination group (e.g. "MC")
    body+='<div style="margin:16px 0 8px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span style="font-size:15px;font-weight:800;color:var(--text1)">🛫 <span onclick="window.rezdyRenameDep(\''+_rzEsc(depFilter).replace(/\'/g,"\\'")+'\')" title="Click to rename this heading" style="cursor:pointer;border-bottom:1px dashed var(--border2)">'+_rzEsc(_rzDepDisplay(depFilter))+'</span>'+((_rzDepShowProduct(depFilter)&&prod)?' '+_rzEsc(prod):'')+'</span><span style="font-size:11px;color:var(--text3);font-weight:600">'+grp.length+' booking'+(grp.length===1?'':'s')+' · '+_rzBdText(gbd)+'</span></div>';
    // Sort control: Default (checked-in last) · A–Z by name · Booked (booking order).
    body+='<div style="display:flex;gap:6px;align-items:center;margin:0 0 10px;flex-wrap:wrap"><span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:800;margin-right:2px">Sort</span>'+
      [['','Default','Default order — checked-in passengers shown last'],['az','A–Z','By customer name, A → Z'],['booked','Booked','Booking order: first booked (oldest order) first → most recently booked last'],['ac','Aircraft','Group by allocated aircraft (unallocated last)']].map(function(o){var act=_bkSort===o[0];return '<button title="'+_rzEsc(o[2])+'" onclick="S._bkSort=\''+o[0]+'\';render()" style="font-size:11px;font-weight:700;padding:4px 11px;border-radius:14px;cursor:pointer;border:1px solid '+(act?'var(--accent)':'var(--border2)')+';background:'+(act?'var(--accent)':'transparent')+';color:'+(act?'#fff':'var(--text2)')+'">'+o[1]+'</button>';}).join('')+'</div>';
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
  var _rst=((b._manual||b._native)
    ?'<button onclick="window.rezdyDeleteManualBooking(\''+_bdOE+'\')" title="Delete this in-house booking" style="flex-shrink:0;align-self:center;margin-left:auto;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#f87171;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.4);border-radius:6px;padding:3px 9px;cursor:pointer;white-space:nowrap">🗑 Delete booking</button>'
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
    contactH+=(typeof _rzPrefContactPicker==='function')?_rzPrefContactPicker(String(b.orderNumber||'')):'';
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
    var _tov2=(S._pickupTimeOverride||{});
    var pt=(_tov2[pid]!=null&&_tov2[pid]!=='')?_tov2[pid]:_rzDepTime(it.pickupTime||''); // pickup time (HHMM) — location-driven override wins
    _pkRows.push('<div style="display:flex;align-items:center;gap:6px">'+(pt?'<span style="font-size:11px;font-weight:800;color:var(--text2);white-space:nowrap;flex-shrink:0">🕑 '+_rzEsc(pt)+'</span>':'')+_rzLocSelect(pid,cur)+'</div>');
  });
  if(_pkRows.length){
    pkH='<div style="'+_pan+'"><div style="'+sec+'">Pickup'+(_pkRows.length>1?'s':'')+'</div><div style="display:flex;flex-direction:column;gap:4px">'+_pkRows.join('')+'</div></div>';
  }
  // Balance.
  const bal=parseFloat(b.balanceDue);
  const owing=isFinite(bal)&&bal>0;
  let balH,srcH;
  if(b._manual||b._native){
    // In-house (app-created) bookings: balance + source are editable (no Rezdy record behind them).
    balH='<div style="'+_pan+'"><div style="'+sec+'">Balance owing</div>'+
      '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:14px;font-weight:800;color:var(--text3)">$</span>'+
      '<input type="number" inputmode="decimal" min="0" step="0.01" value="'+_rzEsc(isFinite(bal)?String(bal):'')+'" onchange="window.rezdyManualSetBalance(\''+_bdOE+'\',this.value)" placeholder="0.00" style="flex:1;min-width:0;font-size:15px;font-weight:700;padding:8px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:7px"></div>'+
      '<div style="font-size:11px;color:var(--text3);margin-top:4px">0 = paid in full.</div></div>';
    srcH='<div style="'+_pan+'"><div style="'+sec+'">Source</div>'+
      '<input type="text" value="'+_rzEsc(b.source==='Manual'?'':(b.source||''))+'" onchange="window.rezdyManualSetSource(\''+_bdOE+'\',this.value)" placeholder="e.g. Direct, Phone, or an agent name" style="width:100%;box-sizing:border-box;font-size:15px;padding:8px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:7px"></div>';
  } else {
    balH='<div style="'+_pan+'"><div style="'+sec+'">Balance</div>';
    balH+='<div style="font-size:14px;font-weight:800;color:'+(owing?'#f59e0b':'#4ade80')+'">'+(owing?'⚠ '+_rzEsc(_rzMoney(bal,b.currency))+' owing':'Paid in full')+'</div>';
    balH+='<div style="font-size:11px;color:var(--text3);margin-top:2px">Total '+_rzEsc(_rzMoney(b.totalAmount,b.currency)||'—')+' · Paid '+_rzEsc(_rzMoney(b.totalPaid,b.currency)||'—')+'</div>';
    balH+='</div>';
    // Booking source / marketplace — always shown (e.g. Viator, GYG, Direct).
    srcH='<div style="'+_pan+'"><div style="'+sec+'">Source</div><span class="pill" style="background:var(--card);border:1px solid var(--border2);color:var(--text2);font-size:11px;font-weight:800;padding:3px 9px;border-radius:12px">'+_rzEsc(_rzSourceLabel(b))+'</span></div>';
  }
  // Self-drive numberplate(s) captured at check-in + a "done" tick once entered into the external system.
  var _plObj=(typeof _rzPlate==='function')?_rzPlate(_bdOrder):null;
  var _plVal=(_plObj&&_plObj.plate)||'';
  var _plDone=!!(_plObj&&_plObj.done);
  var _plSelf=(typeof _rzManualSelfDrive==='function'&&_rzManualSelfDrive(_bdOrder))||((b.items||[]).some(function(it){return it.pickup&&typeof _rzIsSelfDrive==='function'&&_rzIsSelfDrive(it.pickup);}));
  var plH='';
  if(_plVal||_plSelf){
    plH='<div style="'+_pan+((_plVal&&!_plDone)?';border-color:#3b82f6':'')+'"><div style="'+sec+'">🚗 Self-drive numberplate'+(_plSelf&&!_plVal?' — self-drive':'')+'</div>'+
      '<input type="text" value="'+_rzEsc(_plVal)+'" onchange="window.rezdyPlateSet(\''+_bdOE+'\',this.value)" placeholder="e.g. ABC123 — comma-separate if more than one" style="width:100%;box-sizing:border-box;font-size:15px;font-weight:700;letter-spacing:.05em;padding:8px;background:var(--card2);color:var(--text);border:1px solid var(--border2);border-radius:7px;text-transform:uppercase">'+
      (_plVal?'<label style="display:inline-flex;align-items:center;gap:7px;margin-top:8px;cursor:pointer;font-size:12px;font-weight:700;color:'+(_plDone?'#4ade80':'#60a5fa')+'"><input type="checkbox" '+(_plDone?'checked':'')+' onchange="window.rezdyPlateToggleDone(\''+_bdOE+'\')" style="width:16px;height:16px;cursor:pointer">'+(_plDone?'Entered into system ✓':'Mark entered into system')+'</label>':'')+
    '</div>';
  }
  return bubsH+'<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start">'+
    '<div style="flex:1 1 300px;min-width:240px;display:flex;flex-direction:column;gap:8px">'+paxH+exH+'</div>'+
    '<div style="flex:1 1 240px;min-width:220px;display:flex;flex-direction:column;gap:8px">'+plH+pkH+contactH+reqH+balH+srcH+'</div>'+
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
  try{sessionStorage.setItem('ts_rezdy_date',S.rezdyDate);}catch(e){} // survive a refresh on Bookings/Seatmap/Loadsheets
  // clear date-scoped caches so each tab reloads for the new date
  S._rezdyBookings=null;S._rezdyOpen={};S._pickupVans=null;S._pickupCollected=null;S._schedBlocks=null;S._schedGroupKey=null;S._schedEdit=null;S._rzManLoaded=false;S._rzManPax=null;S._rzLsTabsLoaded=false;S._rzLsTabs=null;S._rzSchedUndo=null; // undo is per-day — start fresh on a date change
  S._pickupLoading=true; // show the Transport board's spinner (NOT a transient auto layout) until rezdyLoadPickups restores the saved arrangement — otherwise the auto layout flashes and looks like the allocation "reverted"
  // clear seatmap view-state that's scoped to a specific day (stale labels would mis-target Allocate/Create)
  S._rzManDepFilter=null;S._rzManShow=null;S._rzCombA=null;S._rzCombB=null;S._rzManCombineOpen=false;S._rzManCardOpen=null;S._rzManOpenDeps=null;S._rzManCoPic=null;
  // reset the calendar→seatmap PIC auto-fill tracking + the pickup-blob sync flag for the new day
  S._rzManPicSeed={};S._rzManPicAuto={};S._rzManCoSeed={};S._rzManCoAuto={};S._rzManPickupSynced=false;
  // clear the booking-state maps that live in the pickup blob so the new day doesn't briefly render
  // the PREVIOUS day's check-in / aircraft / pickup / pax-meta state before the async blob loads
  // (editing in that window would persist a mixed blob). rezdyLoadPickups repopulates them.
  S._rzBookingCheckedIn={};S._rzBookingAc={};S._rzBookingWx={};S._rzPrefContact={};S._pickupLocOverride={};S._rezdyPaxMeta={};S._rzCheckin={};S._rzSchedAttach={};S._rzManDepMerge={};S._schedPilots={};S._schedCoPilots={};S._rzBookingCancel={};S._rzNoShow={};S._rzSelfDrive={};S._rzBkNote={};S._rzFlybackTime={};S._rzFlybackEnd={};S._rzDepTimeOv={};S._rzDepEndOv={};S._rzPlates={};S._rzTransMerge={};S._rzWxCalls={};S._rzBkCalled={};S._rzTravelWith={};S._rzBlockNote={};S._rzCharterDest={};S._rzBkAcPickOpen={};
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
  var _mapped=_rzMapBookings(rows,S.rezdyDate);
  // Coexistence: merge NATIVE (in-house) bookings from ts_native_bookings on top of the Rezdy rows.
  // Fails soft — if the table/module isn't present this is a no-op and behaviour is unchanged.
  try{if(typeof platformLoadBookings==='function'){var _nat=await platformLoadBookings(S.rezdyDate);if(_nat&&_nat.length&&typeof _rzMergeNativeBookings==='function')_mapped=_rzMergeNativeBookings(_mapped,_nat);}}catch(e){}
  S._rezdyBookings=_mapped;_rzApplyManualBk();
  // Do NOT null S._pickupVans here — that discarded the SAVED manual van layout and forced a full
  // auto-allocate on every bookings load (day change / "Refresh from Rezdy"), which is why allocated
  // pickups "reverted to their original state". _rzEnsureVans reconciles the saved layout against the
  // refreshed bookings (drops cancelled ids, appends new ones), and rezdyLoadPickups restores the blob.
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
        var _mapped=_rzMapBookings(rows,S.rezdyDate);
        // Merge native (in-house) bookings too, or a background sync would drop them from the list.
        Promise.resolve((typeof platformLoadBookings==='function')?platformLoadBookings(S.rezdyDate):[]).then(function(_nat){
          if(date!==S.rezdyDate)return;
          if(_nat&&_nat.length&&typeof _rzMergeNativeBookings==='function')_mapped=_rzMergeNativeBookings(_mapped,_nat);
          S._rezdyBookings=_mapped;_rzApplyManualBk();
          // Do NOT null S._pickupVans here — that discarded the SAVED van layout (manual placement)
          // and forced a full auto-allocate on every background sync. _rzEnsureVans reconciles it.
          // safeRender (not render) so an open New Booking / Check-in modal isn't torn down mid-entry.
          S._schedBlocks=null;safeRender(); // calendar blocks re-derive; pickup van layout is preserved
        });
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
  const wc=res.data&&res.data.windowCount;
  toast('Synced '+(n!=null?n:'')+' booking'+(n===1?'':'s')+' from Rezdy'+(wc!=null?' ('+wc+' in window)':''),'ok');
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
  const assigned=Object.values(S._pickupDrivers||{}).filter(Boolean);
  let depFilter=S._pickupDepFilter||null;
  const displayDrivers=[];[].concat(_avail,_extra,assigned).forEach(function(n){if(n&&displayDrivers.indexOf(n)<0)displayDrivers.push(n);});
  // Resolve the SELECTED departure up-front — drivers, the active/parked van set and ack are all
  // PER DEPARTURE now, so the spare bin and driver slots need to know which run we're looking at.
  const byTime={};vanPickups.forEach(function(p){(byTime[p.depart||'—']=byTime[p.depart||'—']||[]).push(p);});
  // Default order = pickups (by time) → drop-offs → flybacks; then apply the operator's manual order.
  const times=Object.keys(byTime).sort(function(a,b){return _rzTransDepSort(a)-_rzTransDepSort(b);});
  (function(){var ord=S._rzDepOrder||[];if(ord.length)times.sort(function(a,b){var ia=ord.indexOf(a),ib=ord.indexOf(b);if(ia<0&&ib<0)return _rzTransDepSort(a)-_rzTransDepSort(b);if(ia<0)return 1;if(ib<0)return -1;return ia-ib;});})();
  if((!depFilter||times.indexOf(depFilter)<0)&&times.length){depFilter=_rzDefaultDep(times);}   // first of day, +15-min grace on today
  const _depJs=_rzEsc(depFilter||'').replace(/'/g,"\\'");
  let driversBar='<div class="card" style="padding:10px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:700;margin-bottom:8px">Drivers <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text3)">(tap a driver, then pick a van)</span></div>';
  driversBar+='<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">';
  displayDrivers.forEach(function(nm){
    var isAsg=assigned.indexOf(nm)>=0;var isExtra=_extra.indexOf(nm)>=0; // manually added / called in — show the ✕ even while assigned to a van (removing clears the van too)
    var _nmJs=_rzEsc(nm).replace(/'/g,"\\'");var _picking=(S._pickupDriverAssign===nm);
    driversBar+='<div draggable="true" ondragstart="window.pickupDriverDragStart(\''+_nmJs+'\',event)" onclick="window.pickupDriverPickVan(\''+_nmJs+'\')" title="Tap to assign to a van (or drag)" style="display:flex;align-items:center;gap:5px;padding:8px 12px;min-height:38px;border-radius:16px;background:'+(_picking?'rgba(96,165,250,.22)':(isAsg?'rgba(74,222,128,.12)':'rgba(124,58,237,.12)'))+';border:1px solid '+(_picking?'var(--acc)':(isAsg?'rgba(74,222,128,.5)':'rgba(124,58,237,.45)'))+';cursor:pointer;font-size:13px;font-weight:700;color:'+(isAsg?'#4ade80':'#c4b5fd')+'">'+(isAsg?'✓ ':'👤 ')+_rzEsc(nm)+((isExtra||isAsg)?'<span onclick="event.stopPropagation();window.pickupRemoveExtraDriver(\''+_nmJs+'\')" style="cursor:pointer;opacity:.55;margin-left:2px;padding:2px 4px" title="Remove driver — clears them off every van they\'re on (and un-calls-in if they were called in)">✕</span>':'')+'</div>';
  });
  driversBar+='<button onclick="window.pickupToggleDriverPicker()" title="Add another driver" style="width:30px;height:30px;border-radius:16px;border:1px dashed var(--border2);background:'+(S._pickupDriverPickerOpen?'rgba(124,58,237,.15)':'transparent')+';color:var(--text2);font-size:18px;cursor:pointer;line-height:1;display:inline-flex;align-items:center;justify-content:center">'+(S._pickupDriverPickerOpen?'×':'+')+'</button>';
  driversBar+='</div>';
  // Tap-to-assign (iPhone-friendly, no drag): tapping a driver chip sets S._pickupDriverAssign; show the
  // active vans for THIS departure as big buttons — tap one to assign that driver to it.
  if(S._pickupDriverAssign&&displayDrivers.indexOf(S._pickupDriverAssign)>=0){
    var _an=S._pickupDriverAssign,_anJs=_rzEsc(_an).replace(/'/g,"\\'");
    driversBar+='<div style="margin-top:8px;border:1px solid var(--acc);border-radius:8px;padding:9px;background:var(--card2)">'+
      '<div style="font-size:11.5px;color:var(--text2);font-weight:700;margin-bottom:7px">Assign 👤 '+_rzEsc(_an)+' to which van? <span style="color:var(--text3);font-weight:600">· '+_rzEsc(_rzDepDisplay(depFilter))+'</span></div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:7px">';
    var _anyVan=false;
    (S._pickupVans||[]).forEach(function(vv,vj){if(_rzVanParked(vj,depFilter)||_rzIsTaxiVan(vj))return;_anyVan=true;var vc=_rzVehColor(vj);
      driversBar+='<button onclick="window.pickupSetVanDriver('+vj+',\''+_depJs+'\',\''+_anJs+'\')" style="padding:10px 14px;min-height:44px;border-radius:12px;border:2px solid '+vc+';background:'+vc+'18;color:'+vc+';font-size:13px;font-weight:800;cursor:pointer">🚐 '+_rzEsc(_rzVehName(vj))+'</button>';});
    if(!_anyVan)driversBar+='<span style="font-size:12px;color:var(--text3)">No active van for this run — activate a spare vehicle below first.</span>';
    driversBar+='<button onclick="window.pickupDriverPickVan(\''+_anJs+'\')" style="padding:10px 14px;min-height:44px;border-radius:12px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-size:13px;font-weight:700;cursor:pointer">Cancel</button>';
    driversBar+='</div></div>';
  }
  if(!displayDrivers.length)driversBar+='<div style="font-size:12px;color:var(--text3);margin-top:6px">No ground staff rostered on — use ＋ to add anyone, or a van with no driver goes by taxi.</div>';
  if(S._pickupDriverPickerOpen){
    var _dg=_rzDriverGroups();
    var _onPick=_dg.onDuty.filter(function(n){return displayDrivers.indexOf(n)<0;});
    var _offPick=_dg.dayOff.filter(function(n){return displayDrivers.indexOf(n)<0;});
    driversBar+='<div style="margin-top:10px;border-top:1px solid var(--border2);padding-top:10px">';
    driversBar+='<div style="font-size:11px;color:var(--text3);margin-bottom:6px">Tap to add as a driver — '+_rzDowLabel(S.rezdyDate)+'</div>';
    if(_onPick.length){
      driversBar+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">';
      _onPick.forEach(function(nm){driversBar+='<button onclick="window.pickupAddDriver(\''+_rzEsc(nm).replace(/'/g,"\\'")+'\')" style="padding:8px 12px;border-radius:16px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;min-height:38px">＋ '+_rzEsc(nm)+'</button>';});
      driversBar+='</div>';
    }
    if(_offPick.length){
      driversBar+='<div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:800;margin:4px 0 4px">Day off (tap to call in)</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
      _offPick.forEach(function(nm){driversBar+='<button onclick="window.pickupAddDriver(\''+_rzEsc(nm).replace(/'/g,"\\'")+'\')" title="On a day off — tap to call them in" style="padding:8px 12px;border-radius:16px;border:1px dashed var(--border2);background:transparent;color:var(--text3);opacity:.75;font-size:12px;font-weight:700;cursor:pointer;min-height:38px">😴 '+_rzEsc(nm)+'</button>';});
      driversBar+='</div>';
    }
    if(!_onPick.length&&!_offPick.length)driversBar+='<div style="font-size:12px;color:var(--text3)">Everyone available is already listed.</div>';
    driversBar+='</div>';
  }
  // Spare vehicles — parked resources sitting next to the drivers. Drag (or tap) one to add it
  // to the run; an active van can be parked back here from its card.
  var _spareV=[];_rzVehicles().forEach(function(v,vi){if(_rzVanParked(vi,depFilter))_spareV.push({v:v,vi:vi});});
  driversBar+='<div style="margin-top:10px;border-top:1px solid var(--border2);padding-top:8px">'+
    '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:700;margin-bottom:6px">Spare vehicles'+(depFilter?' · '+_rzEsc(_rzDepDisplay(depFilter)):'')+' <span style="font-weight:400;text-transform:none;letter-spacing:0">(drag below / tap to add)</span></div>'+
    '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">';
  if(!_spareV.length){driversBar+='<span style="font-size:12px;color:var(--text3)">None — all vehicles are in use.</span>';}
  else _spareV.forEach(function(o){var col=o.v.color||'#64748b';
    driversBar+='<div draggable="true" ondragstart="window.pickupVehParkDragStart('+o.vi+',event)" onclick="window.pickupActivateVehicle('+o.vi+',\''+_depJs+'\')" title="Parked for this departure — tap or drag onto the run to use" style="display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:14px;border:2px solid '+col+';background:var(--card2);color:var(--text);cursor:grab;font-size:13px;font-weight:800;box-shadow:inset 0 0 0 1px var(--border2)"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;background:#0057B8;color:#fff;font-weight:900;font-size:15px;border-radius:5px;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,.35)">P</span>'+_rzEsc(o.v.name||('Van '+(o.vi+1)))+' <span style="opacity:.6;font-weight:600;color:var(--text2)">'+(o.v.seats||11)+'p</span></div>';
  });
  driversBar+='<button onclick="window.pickupVehAdd()" title="Create a new vehicle" style="padding:5px 10px;border-radius:14px;border:1px dashed var(--border2);background:transparent;color:var(--text3);font-size:12px;font-weight:700;cursor:pointer">+ New</button>';
  // Park / activate every vehicle for this departure at once (parking all leaves the run as an awaiting list).
  if(_rzActiveVanCount(depFilter)>0)driversBar+='<button onclick="window.pickupParkAll(\''+_depJs+'\')" title="Park every vehicle for this departure — the run becomes a list awaiting a van/driver" style="padding:5px 10px;border-radius:14px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-size:12px;font-weight:700;cursor:pointer">⊘ Park all</button>';
  if(_spareV.length)driversBar+='<button onclick="window.pickupActivateAll(\''+_depJs+'\')" title="Put every vehicle for this departure back in use" style="padding:5px 10px;border-radius:14px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-size:12px;font-weight:700;cursor:pointer">▶ Activate all</button>';
  driversBar+='</div></div>';
  driversBar+='</div>';

  var _nPk=vanPickups.filter(function(p){return !p.dropoff;}).length;
  var _nDrop=vanPickups.filter(function(p){return p.dropoff;}).length;
  const hdr='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:0">Transport Summary</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0"><span style="color:'+RZ_PK_COL+';font-weight:700">'+_nPk+' pickups</span> · <span style="color:'+RZ_DROP_COL+';font-weight:700">'+_nDrop+' drop-offs</span> · '+_rzVehicles().length+' vehicles'+(selfDrive.length?' · '+selfDrive.length+' self-drive/walk':'')+'</p></div>'+
    '<div style="display:flex;gap:6px;flex-shrink:0">'+
      '<button class="btn btn-ghost" style="font-size:12px'+(S._rzTransByAc?';border-color:rgba(96,165,250,.6);color:#60a5fa':'')+'" onclick="window.rzTransToggleByAc()" title="Group each van\'s stops by the aircraft flown">'+(S._rzTransByAc?'✈ By aircraft ✓':'✈ By aircraft')+'</button>'+
    '</div></div>';

  // departure-time selector — click a time to focus the board on that departure's run.
  // Every change (move, reorder, driver, park) auto-saves immediately — no Save button needed.
  let timeBar='<div class="card" style="padding:10px"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:700">Departure</div>'+
    '<div style="display:flex;gap:6px;flex-shrink:0">'+
      '<button class="btn btn-ghost" style="font-size:12px;padding:5px 12px;font-weight:700;border-color:rgba(124,58,237,.5);color:#c4b5fd" onclick="window.pickupAutoAssign()" title="Activate vehicles + assign drivers automatically; overflow stays a taxi list">⚡ Auto-assign</button>'+
    '</div></div><div style="display:flex;flex-wrap:wrap;gap:6px">';
  var _ordJs=encodeURIComponent(JSON.stringify(times.slice()));
  times.forEach(function(t,ti){
    const grp=byTime[t];const pax=grp.reduce(function(s,p){return s+p.pax;},0);
    const on=depFilter===t;
    const _drop=_rzIsDropDep(t);
    const _lbl=_rzTransDepLabel(t);const _unit=_drop?'drop':'pk';
    const _accent=_drop?RZ_DROP_COL:RZ_PK_COL; // pickups vs drop-offs colour-coded
    const _tEsc=_rzEsc(t).replace(/'/g,"\\'");
    var _mergedIn=Object.keys(S._rzTransMerge||{}).filter(function(a){return _rzTransBase(a)===t&&a!==t;});
    timeBar+='<div draggable="true" ondragstart="window.pickupDepDragStart(\''+_tEsc+'\',event)" ondragover="event.preventDefault();this.style.outline=\'2px solid '+_accent+'\';this.style.outlineOffset=\'1px\'" ondragleave="this.style.outline=\'\'" ondrop="this.style.outline=\'\';window.pickupDepDrop(\''+_tEsc+'\',event)" title="Drag onto another run to combine them" style="display:inline-flex;align-items:center;border-radius:12px;background:'+(on?_accent+'33':'var(--card2)')+';border:1px solid '+(on?_accent:'var(--border2)')+';overflow:hidden;cursor:grab">'+
      '<button onclick="window.rzTransMoveDep(\''+_tEsc+'\',-1,\''+_ordJs+'\')" title="Move earlier in the list" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:5px 5px 5px 7px"'+(ti===0?' disabled':'')+'>◀</button>'+
      '<button onclick="window.pickupSetDepFilter(\''+_tEsc+'\')" title="'+(_drop?'Return drop-off run':'Pickup run')+'" style="background:none;border:none;border-left:3px solid '+_accent+';padding:4px 8px;font-size:11px;color:'+(on?'var(--text1)':'var(--text2)')+';cursor:pointer;font-weight:'+(on?'700':'400')+'"><b>'+_rzEsc(_lbl)+'</b>'+(_mergedIn.length?' <span style="font-size:9px;color:'+_accent+'" title="Combined with '+_rzEsc(_mergedIn.map(_rzTransDepLabel).join(", "))+'">+'+_mergedIn.length+'</span>':'')+' · '+grp.length+' '+_unit+' / '+pax+' pax</button>'+
      (_mergedIn.length?'<button onclick="window.pickupUnmergeBase(\''+_tEsc+'\')" title="Separate the combined runs" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:5px 4px">⊗</button>':'')+
      '<button onclick="window.rzTransMoveDep(\''+_tEsc+'\',1,\''+_ordJs+'\')" title="Move later in the list" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:5px 7px 5px 5px"'+(ti===times.length-1?' disabled':'')+'>▶</button>'+
    '</div>';
  });
  timeBar+='</div></div>';

  // van cards/columns (stack vertically on narrow screens via flex-wrap + min-width)
  let vansH='<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start">';
  S._pickupVans.forEach(function(vanIds,vi){
    if(_rzVanParked(vi,depFilter))return; // parked for THIS departure → shown in the spare bin, not on the board
    // Capacity is per departure run (each ≤11), so size the warning by the busiest departure.
    var _byDepLoad={};vanIds.forEach(function(id){var pp=_rzPickupById(pickups,id);if(pp)_byDepLoad[pp.depart||'—']=(_byDepLoad[pp.depart||'—']||0)+pp.pax;});
    var _maxDep=0;Object.keys(_byDepLoad).forEach(function(k){if(_byDepLoad[k]>_maxDep)_maxDep=_byDepLoad[k];});
    const seats=_rzVehSeats(vi);
    const pax=depFilter?(_byDepLoad[depFilter]||0):_rzVanPax(vanIds,pickups);
    const over=depFilter?(pax>seats):(_maxDep>seats);
    const col=_rzVehColor(vi);
    var _isTaxi=_rzIsTaxiVan(vi);
    if(_isTaxi&&!pax)return; // a manual Taxi van with nothing for this view → hide it
    vansH+='<div ondragover="event.preventDefault();this.style.outline=\'2px solid '+(over?'#ef4444':col)+'\'" ondragleave="this.style.outline=\'\'" ondrop="window.'+(_isTaxi?'pickupTaxiDrop':'pickupDropOnVan')+'('+vi+',event,\''+_depJs+'\');this.style.outline=\'\'" '+
      'style="flex:1 1 260px;min-width:240px;background:'+(over?'rgba(239,68,68,.09)':'var(--card)')+';border:'+(over?'2px solid #ef4444':'1px solid var(--border)')+';border-top:'+(over?'5px':'3px')+' solid '+(over?'#ef4444':col)+';border-radius:10px;padding:12px;box-shadow:'+(over?'0 0 0 1px rgba(239,68,68,.3)':'none')+'">';
    vansH+='<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:8px">'+
      '<div style="font-weight:800;font-size:14px;color:'+(over?'#ef4444':col)+'">'+_rzEsc(_rzVehName(vi))+'</div>'+
      '<div style="display:flex;align-items:center;gap:8px">'+
        (over?'<span style="font-size:11px;font-weight:900;color:#fff;background:#ef4444;padding:3px 9px;border-radius:13px;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap">⚠ Overloaded '+pax+'/'+seats+'</span>'
             :'<span style="font-size:12px;font-weight:700;color:var(--text2)">'+pax+' / '+seats+' pax</span>')+
        (_isTaxi?'<span style="font-size:10px;font-weight:800;color:#f59e0b;white-space:nowrap">drop a van/Subi here ↧</span>':'<button onclick="window.pickupParkVehicle('+vi+',\''+_depJs+'\')" title="Park this vehicle for this departure (move it to spares)" style="background:none;border:1px solid var(--border2);border-radius:6px;color:var(--text3);cursor:pointer;font-size:10px;font-weight:700;padding:3px 8px">Park</button>')+
      '</div></div>';
    // Driver / taxi slot — PER DEPARTURE. Tap to assign; drop a driver bubble; no driver = taxi.
    var drv=_rzVanDriver(vi,depFilter);
    var _dpOpen=(S._pickupVanDriverPick===_pkKey(vi,depFilter));
    vansH+='<div style="margin-bottom:10px">'+
      '<div onclick="window.pickupVanDriverPickOpen('+vi+',\''+_depJs+'\')" title="Tap to assign / change the driver for this departure" style="display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:8px;cursor:pointer;min-height:40px;border:1px dashed '+(drv?col+'99':(vanIds.length?'#f59e0b88':'var(--border2)'))+';background:'+(drv?col+'14':(vanIds.length?'rgba(245,158,11,.08)':'transparent'))+'">'+
      (drv
        ?'<span style="font-size:12px;font-weight:700;color:'+col+'">👤 '+_rzEsc(drv)+'</span>'+
          (function(){var a=_rzVanAck(vi,depFilter);if(_rzVanAcked(vi,depFilter)){var t='';try{t=new Date(a.at).toLocaleTimeString('en-NZ',{hour:'2-digit',minute:'2-digit'});}catch(e){}return '<span title="Driver acknowledged this run" style="font-size:10px;font-weight:800;color:#22c55e;background:rgba(34,197,94,.14);padding:2px 7px;border-radius:10px;margin-left:6px;white-space:nowrap">✓ acked'+(t?' '+t:'')+'</span>';}return '<span title="The run changed since the driver last acknowledged" style="font-size:10px;font-weight:800;color:#f59e0b;background:rgba(245,158,11,.14);padding:2px 7px;border-radius:10px;margin-left:6px;white-space:nowrap">⚠ awaiting ack</span>';})()
        :(vanIds.length
          ?'<span style="font-size:12px;font-weight:700;color:#f59e0b">🚕 Tap to assign a driver</span>'
          :'<span style="font-size:11px;color:var(--text3)">Tap to assign a driver</span>'))+
      '<span style="margin-left:auto;color:var(--text3);font-size:12px;flex-shrink:0">'+(_dpOpen?'▴':'▾')+'</span>'+
      '</div>'+
      (_dpOpen?'<div style="position:relative;z-index:30;margin-top:4px;border:1px solid var(--acc);border-radius:8px;background:var(--card);max-height:280px;overflow-y:auto;box-shadow:0 10px 28px rgba(0,0,0,.45)">'+_rzDriverPickRows('window.pickupSetVanDriver('+vi+',\''+_depJs+'\',%N%)')+'</div>':'')+
      '</div>';
    // Honour the manual run order (same S._pickupOrder the driver uses) so reordering here sticks.
    var _grp0=vanIds.map(function(id){return _rzPickupById(pickups,id);}).filter(function(p){return p&&(!depFilter||p.depart===depFilter);}).sort(function(a,b){return _rzPkTimeVal(a)-_rzPkTimeVal(b);});
    if(depFilter)_grp0=_rzApplyMyOrder(_grp0,vi,depFilter);
    if(S._rzTransByAc)_grp0=_grp0.slice().sort(function(a,b){return String(a.ac||'~~').localeCompare(String(b.ac||'~~'));}); // group by aircraft when the toggle is on
    var _vlist=_grp0.map(function(p){return p.id;});
    var _lastAc=null;
    if(!vanIds.length){
      vansH+='<div style="text-align:center;padding:16px;color:var(--text3);font-size:12px;border:1px dashed var(--border2);border-radius:8px">Drop pickups here</div>';
    }else if(!_vlist.length){
      vansH+='<div style="text-align:center;padding:14px;color:var(--text3);font-size:12px">Nothing on the '+_rzEsc(_rzTransDepLabel(depFilter))+' run</div>';
    }else{
      _vlist.forEach(function(id){
        const p=_rzPickupById(pickups,id);if(!p)return;
        const collected=!!S._pickupCollected[id];
        const _pc=p.dropoff?RZ_DROP_COL:RZ_PK_COL;
        if(S._rzTransByAc){var _ac=p.ac||'__none__';if(_ac!==_lastAc){_lastAc=_ac;vansH+='<div style="margin:6px 0 4px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);display:flex;align-items:center;gap:6px">'+(_rzAcPill(p.ac)||'<span style="color:var(--text3)">Unallocated</span>')+'</div>';}}
        vansH+='<div draggable="true" ondragstart="window.pickupDragStart(\''+_rzEsc(id).replace(/'/g,"\\'")+'\',event)" ondragover="event.preventDefault();event.stopPropagation();this.style.boxShadow=\'0 -3px 0 '+col+' inset\'" ondragleave="this.style.boxShadow=\'\'" ondrop="this.style.boxShadow=\'\';window.pickupReorderDrop('+vi+',\''+_depJs+'\',\''+_rzEsc(id).replace(/'/g,"\\'")+'\',event)" '+
          'style="background:var(--card2);border:1px solid var(--border2);border-left:3px solid '+_pc+';border-radius:8px;padding:10px;margin-bottom:8px;cursor:grab;'+(collected?'opacity:.55':'')+'">'+
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">'+
            '<div style="font-weight:700;font-size:13px;color:var(--text);min-width:0;'+(collected?'text-decoration:line-through':'')+'"><span style="color:var(--text3);font-weight:700;margin-right:6px;cursor:grab;font-size:17px;vertical-align:middle" title="Drag to reorder">≡</span>'+_rzEsc(p.customer||p.order)+(p.dropoff&&p.ac?' '+_rzAcPill(p.ac):'')+'</div>'+
            '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">'+
              '<span style="font-size:11px;font-weight:700;color:'+col+'">'+p.pax+' pax</span>'+
              (depFilter?'<div style="display:flex;flex-direction:column;gap:2px">'+
                '<button onclick="event.stopPropagation();window.myPkMove('+vi+',\''+_depJs+'\',\''+_rzEsc(id).replace(/'/g,"\\'")+'\',-1)" title="Move up" style="width:38px;height:26px;border-radius:6px;border:1px solid var(--border2);background:var(--card);color:var(--text2);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">▲</button>'+
                '<button onclick="event.stopPropagation();window.myPkMove('+vi+',\''+_depJs+'\',\''+_rzEsc(id).replace(/'/g,"\\'")+'\',1)" title="Move down" style="width:38px;height:26px;border-radius:6px;border:1px solid var(--border2);background:var(--card);color:var(--text2);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">▼</button>'+
              '</div>':'')+
            '</div>'+
          '</div>'+
          '<div style="display:flex;align-items:center;gap:5px;margin-top:4px"><span style="font-size:12px">'+(p.dropoff?'📦':'📍')+'</span>'+_rzLocSelect(p.id,p.location)+'</div>'+
          (p.pickupTime?'<div style="font-size:11px;color:var(--text2);margin-top:3px;font-weight:700">🕑 '+(p.dropoff?'Drop-off':'Pickup')+' '+_rzEsc(p.pickupTime)+'</div>':'')+
          (p.dropoff?'<div style="font-size:11px;color:#f59e0b;margin-top:2px;font-weight:700">🛬 Flyback drop-off</div>':(p.depart?'<div style="font-size:11px;color:var(--text3);margin-top:2px">🛫 Dep '+_rzEsc(p.depart)+'</div>':''))+
          (p.phone?'<div style="font-size:12px;margin-top:4px"><a href="tel:'+_rzEsc(p.phone)+'" style="color:'+col+';text-decoration:none">📞 '+_rzEsc(p.phone)+'</a></div>':'')+
          '<button onclick="window.pickupToggleCollected(\''+_rzEsc(id).replace(/'/g,"\\'")+'\')" '+
            'style="margin-top:8px;width:100%;padding:9px;border-radius:7px;border:1px solid '+(collected?'#166534':'var(--border2)')+';background:'+(collected?'var(--ok-bg)':'transparent')+';color:'+(collected?'var(--ok-text)':'var(--text2)')+';font-size:13px;font-weight:700;cursor:pointer">'+
            (collected?(p.dropoff?'✓ Dropped off':'✓ Collected'):(p.dropoff?'Mark dropped off':'Mark collected'))+'</button>'+
          (function(){ // tap-to-move (iPhone: drag pickup→van doesn\'t work)
            var idE=_rzEsc(id).replace(/'/g,"\\'");var open=(S._pickupMovePick===id);
            var btn='<button onclick="event.stopPropagation();window.pickupMovePickOpen(\''+idE+'\')" style="margin-top:6px;width:100%;padding:8px;border-radius:7px;border:1px dashed var(--border2);background:transparent;color:var(--text3);font-size:12px;font-weight:700;cursor:pointer">⇄ Move to another van '+(open?'▴':'▾')+'</button>';
            if(!open)return btn;
            var rows='';(S._pickupVans||[]).forEach(function(vv,vj){if(vj===vi||_rzVanParked(vj,depFilter))return;rows+='<div onclick="window.pickupMoveToVan(\''+idE+'\','+vj+')" style="padding:9px 10px;cursor:pointer;font-size:12.5px;font-weight:700;border-bottom:1px solid var(--border2);min-height:40px;display:flex;align-items:center;gap:7px;color:'+_rzVehColor(vj)+'">🚐 '+_rzEsc(_rzVehName(vj))+'</div>';});
            if(!rows)rows='<div style="padding:10px;font-size:12px;color:var(--text3)">No other active van — activate a spare first.</div>';
            return btn+'<div style="margin-top:4px;border:1px solid var(--acc);border-radius:8px;background:var(--card);overflow:hidden">'+rows+'</div>';
          })()+
          '</div>';
      });
    }
    vansH+='</div>';
  });
  // One combined drop zone: drop a spare VEHICLE here to add a run, or a PASSENGER to start a new
  // taxi list (then drop a vehicle + driver onto it).
  vansH+='<div ondragover="event.preventDefault();this.style.borderColor=\'var(--acc)\';this.style.color=\'var(--text2)\'" ondragleave="this.style.borderColor=\'var(--border2)\';this.style.color=\'var(--text3)\'" ondrop="this.style.borderColor=\'var(--border2)\';this.style.color=\'var(--text3)\';window.pickupDropCombined(event,\''+_depJs+'\')" style="flex:1 1 200px;min-width:180px;align-self:stretch;min-height:90px;display:flex;flex-direction:column;gap:3px;align-items:center;justify-content:center;text-align:center;border:2px dashed var(--border2);border-radius:10px;color:var(--text3);font-size:12px;font-weight:700;padding:12px"><span style="font-size:20px">➕</span>Drop a <b>vehicle</b> to add a run<br>or a <b>passenger</b> for a new taxi list</div>';
  vansH+='</div>';

  // Self-drive: listed to the side (only the selected departure).
  let sdH='';
  var sdShown=selfDrive.filter(function(p){return !depFilter||(p.depart||'—')===depFilter;});
  if(sdShown.length){
    sdH='<div class="card" style="border-left:3px solid #a78bfa"><div style="font-weight:800;font-size:13px;color:#a78bfa;margin-bottom:8px">Self-drive / walk ('+sdShown.length+')</div>'+
      '<div style="display:flex;flex-direction:column;gap:6px">';
    sdShown.forEach(function(p){
      sdH+='<div style="background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:9px 11px">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'+
          '<div><span style="font-weight:700;font-size:13px;color:var(--text)">'+_rzEsc(p.customer||p.order)+'</span>'+(p.selfWalk?'<span title="Self-walk — makes their own way on foot, no numberplate" style="font-size:10px;font-weight:800;color:#34d399;background:rgba(52,211,153,.15);border:1px solid rgba(52,211,153,.5);padding:1px 6px;border-radius:9px;margin-left:6px;white-space:nowrap">🚶 walk</span>':'')+
            (p.depart?'<span style="font-size:11px;color:var(--text3);margin-left:8px">🛫 Dep '+_rzEsc(p.depart)+'</span>':'')+'</div>'+
          '<span style="font-size:11px;font-weight:700;color:#a78bfa">'+p.pax+' pax</span>'+
        '</div>'+
        '<div style="display:flex;align-items:center;gap:5px;margin-top:6px"><span style="font-size:12px">📍</span>'+_rzLocSelect(p.id,p.location)+'</div>'+
      '</div>';
    });
    sdH+='</div></div>';
  }
  // Needs attention — pickups not yet in any van (new since the transport was set up). Drag onto a van
  // or tap to assign. (Before any driver is set, new pickups still auto-place, so this stays empty.)
  var _inVan={};(S._pickupVans||[]).forEach(function(v){(v||[]).forEach(function(id){_inVan[id]=1;});});
  var needsP=vanPickups.filter(function(p){return !_inVan[p.id]&&(!depFilter||(p.depart||'—')===depFilter);});
  var needsH='';
  if(needsP.length){
    needsH='<div class="card" style="border-left:3px solid #f59e0b"><div style="font-weight:800;font-size:13px;color:#f59e0b;margin-bottom:2px">⚠ Needs attention ('+needsP.length+')</div>'+
      '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">New pickup'+(needsP.length>1?'s':'')+' not yet assigned — drag onto a van, or tap “Assign to a van”.</div>'+
      '<div style="display:flex;flex-direction:column;gap:6px">';
    needsP.forEach(function(p){var idE=_rzEsc(p.id).replace(/'/g,"\\'");
      needsH+='<div draggable="true" ondragstart="window.pickupDragStart(\''+idE+'\',event)" style="background:var(--card2);border:1px solid rgba(245,158,11,.45);border-radius:8px;padding:9px 11px;cursor:grab">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'+
          '<div><span style="font-weight:700;font-size:13px;color:var(--text)">'+_rzEsc(p.customer||p.order)+'</span>'+(p.depart?'<span style="font-size:11px;color:var(--text3);margin-left:8px">🛫 '+_rzEsc(p.depart)+'</span>':'')+'</div>'+
          '<span style="font-size:11px;font-weight:700;color:#f59e0b">'+p.pax+' pax</span>'+
        '</div>'+
        '<div style="display:flex;align-items:center;gap:5px;margin-top:6px"><span style="font-size:12px">'+(p.dropoff?'📦':'📍')+'</span>'+_rzLocSelect(p.id,p.location)+'</div>'+
        '<button onclick="window.pickupMovePickOpen(\''+idE+'\')" style="margin-top:6px;width:100%;padding:7px;border-radius:7px;border:1px dashed var(--border2);background:transparent;color:var(--text3);font-size:12px;font-weight:700;cursor:pointer">⇄ Assign to a van</button>'+
        (S._pickupMovePick===p.id?(function(){var rows='';(S._pickupVans||[]).forEach(function(vv,vj){if(_rzVanParked(vj,depFilter))return;rows+='<div onclick="window.pickupMoveToVan(\''+idE+'\','+vj+')" style="padding:9px 10px;cursor:pointer;font-size:12.5px;font-weight:700;border-bottom:1px solid var(--border2);min-height:40px;display:flex;align-items:center;gap:7px;color:'+_rzVehColor(vj)+'">🚐 '+_rzEsc(_rzVehName(vj))+'</div>';});return rows?'<div style="margin-top:4px;border:1px solid var(--border2);border-radius:8px;overflow:hidden">'+rows+'</div>':'<div style="margin-top:4px;font-size:11px;color:var(--text3)">No active van — activate one from Spare vehicles first.</div>';})():'')+
      '</div>';
    });
    needsH+='</div></div>';
  }
  return hdr+driversBar+timeBar+needsH+vansH+sdH;
}

// Editable pickup-location dropdown for a pickup card (options = distinct locations seen).
// Includes a "Self-drive" choice so a pickup can be switched to self-drive and back — people
// ring up and change their minds both ways.
// Location options for the picker = the 114-row master list (rz_pickup_locs) names, plus any
// locations already on today's bookings that aren't in the master list, de-duped + sorted.
function _rzLocOptions(){
  if(typeof _rzPickupLocsLoad==='function')_rzPickupLocsLoad(); // lazy-load the master list on any tab
  var names=[],seen={};
  (S._rzPickupLocs||[]).forEach(function(o){var n=((o&&o.name)||'').trim();if(n&&!seen[n.toLowerCase()]){seen[n.toLowerCase()]=1;names.push(n);}});
  _rzAllLocations().forEach(function(n){n=String(n||'').trim();if(n&&!_rzIsSelfDrive(n)&&!seen[n.toLowerCase()]){seen[n.toLowerCase()]=1;names.push(n);}});
  names.sort(function(a,b){return a.toLowerCase().localeCompare(b.toLowerCase());});
  return names;
}
// Minutes-before-departure for a location name (from the master list); null if unknown.
function _rzLocMin(name){
  name=String(name||'').trim().toLowerCase();if(!name)return null;
  var hit=(S._rzPickupLocs||[]).find(function(o){return ((o&&o.name)||'').trim().toLowerCase()===name;});
  if(!hit||hit.min===''||hit.min==null)return null;var n=parseInt(hit.min,10);return isNaN(n)?null:n;
}
// Subtract N minutes from an "HHMM" string → "HHMM" (clamped at 0000). '' if invalid.
function _rzSubMins(hhmm,mins){var m=/^(\d{2})(\d{2})$/.exec(String(hhmm||''));if(!m)return '';var t=(+m[1])*60+(+m[2])-(parseInt(mins,10)||0);if(t<0)t=0;return String(Math.floor(t/60)).padStart(2,'0')+String(t%60).padStart(2,'0');}

// Live-searchable location picker. Closed = a field showing the current location; open = a search
// box + filtered list (filtered in-DOM by rzLocFilter, NO full re-render so typing stays smooth).
// Only one picker is open at a time (S._rzLocPickerOpen = pickup id).
function _rzLocSelect(id,current){
  var isSD=_rzIsSelfDrive(current);
  var idE=_rzEsc(id).replace(/'/g,"\\'");
  if(S._rzLocPickerOpen!==id){
    var label=isSD?'🚗 Self-drive':(current?current:'— set location —');
    return '<button type="button" onclick="event.stopPropagation();window.rzLocOpen(\''+idE+'\')" title="Change pickup location" style="flex:1;min-width:0;text-align:left;font-size:12px;padding:5px 8px;background:var(--card);color:var(--text2);border:1px solid var(--border2);border-radius:6px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📍 '+_rzEsc(label)+' <span style="opacity:.45">▾</span></button>';
  }
  var opts=_rzLocOptions();
  var rows='<div class="rzlocopt" data-s="self drive selfdrive own car no pickup" onclick="window.rzLocPick(\''+idE+'\',\'__selfdrive__\')" style="padding:8px 10px;cursor:pointer;font-size:12.5px;border-bottom:1px solid var(--border2)">🚗 Self-drive</div>';
  opts.forEach(function(n){
    var mn=_rzLocMin(n);
    rows+='<div class="rzlocopt" data-s="'+_rzEsc(n.toLowerCase())+'" data-name="'+_rzEsc(n)+'" onclick="window.rzLocPick(\''+idE+'\',this.getAttribute(\'data-name\'))" style="padding:8px 10px;cursor:pointer;font-size:12.5px;border-bottom:1px solid var(--border2);display:flex;justify-content:space-between;gap:8px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_rzEsc(n)+'</span>'+(mn!=null?'<span style="opacity:.55;flex-shrink:0">'+mn+'m</span>':'')+'</div>';
  });
  return '<div style="position:relative;flex:1;min-width:0">'+
    '<div style="position:fixed;inset:0;z-index:60" onclick="window.rzLocClose()"></div>'+
    '<div style="position:relative;z-index:61;border:1px solid var(--acc);border-radius:8px;background:var(--card);box-shadow:0 10px 28px rgba(0,0,0,.4)">'+
      '<input id="rzLocSearchBox" type="text" placeholder="Search '+opts.length+' locations…" oninput="window.rzLocFilter()" onclick="event.stopPropagation()" autocomplete="off" style="width:100%;box-sizing:border-box;font-size:16px;padding:9px 11px;background:var(--card2);color:var(--text);border:none;border-bottom:1px solid var(--border2);border-radius:8px 8px 0 0;outline:none">'+
      '<div id="rzLocList" style="max-height:260px;overflow-y:auto">'+rows+'</div>'+
    '</div></div>';
}
window.rzLocOpen=function(id){S._rzLocPickerOpen=id;if(typeof _rzPickupLocsLoad==='function')_rzPickupLocsLoad();render();setTimeout(function(){var el=document.getElementById('rzLocSearchBox');if(el){try{el.focus();}catch(e){}}},40);};
window.rzLocClose=function(){S._rzLocPickerOpen=null;render();};
window.rzLocFilter=function(){
  var el=document.getElementById('rzLocSearchBox');if(!el)return;
  var q=String(el.value||'').trim().toLowerCase();
  var list=document.querySelectorAll('#rzLocList .rzlocopt');
  for(var i=0;i<list.length;i++){var s=list[i].getAttribute('data-s')||'';list[i].style.display=(!q||s.indexOf(q)>=0)?'':'none';}
};
window.rzLocPick=function(id,val){S._rzLocPickerOpen=null;window.pickupSetLocation(id,val);};

// Override a pickup's location (persists with the pickup list). "__selfdrive__" flips it to
// self-drive (out of the vans); picking a real location flips it back into a van AND auto-sets the
// pickup time from that location's minutes-before-departure (from the master list).
window.pickupSetLocation=function(id,val){
  S._pickupLocOverride=S._pickupLocOverride||{};
  var loc=(val==='__selfdrive__')?'Self-drive':val;
  S._pickupLocOverride[id]=loc;
  // Auto-set the pickup TIME = (departure/session time) − (location's minutes-before-departure).
  S._pickupTimeOverride=S._pickupTimeOverride||{};
  var mn=(val==='__selfdrive__')?null:_rzLocMin(loc);
  if(mn!=null){
    var depHHMM=_rzDepTime((String(id).split('|')[2])||''); // 3rd id segment = it.startTimeLocal
    var t=_rzSubMins(depHHMM,mn);
    if(t)S._pickupTimeOverride[id]=t;
  } // unknown min → leave the existing pickup time untouched
  // Reconcile van placement in-place (handles a pickup becoming / no longer being self-drive)
  // WITHOUT nulling S._pickupVans — nulling then saving wiped the operator's hand-tuned arrangement.
  _rzEnsureVans();
  window.pickupSave(true);
  render();
};

// ── Pickup blob: shared field list + state<->blob mapping + 3-way merge save ──
// The whole pickup list for a date is ONE JSON blob in ts_pickup_lists, edited by several devices
// at once (desk + driver iPads). A naive whole-blob save was last-write-wins, so a stale session
// could silently overwrite another's van arrangement / check-ins — the "pickups revert" bug.
// We now 3-way merge: on save, re-pull the latest cloud blob and only write the fields THIS device
// actually changed since it loaded (its baseline); every other field keeps the cloud's current
// value. So Device A's van reorder and Device B's check-in both survive.
var _PK_FIELDS=['vans','collected','locOverride','timeOverride','drivers','extraDrivers','spare','order','depOrder','manualBk','paxMeta','schedPilots','schedCoPilots','bookingAc','bookingWx','bookingCheckedIn','schedAttach','checkin','ack','bookingCancel','noShow','selfDriveOv','bkNote','flybackTime','flybackEnd','depTimeOv','depEndOv','plates','transMerge','wxCalls','bkCalled','travelWith','blockNote','charterDest','prefContact'];
function _pkBlobFromState(){
  return {vans:S._pickupVans||[],collected:S._pickupCollected||{},locOverride:S._pickupLocOverride||{},timeOverride:S._pickupTimeOverride||{},drivers:S._pickupDrivers||{},extraDrivers:S._pickupExtraDrivers||[],spare:S._pickupSpare||{},order:S._pickupOrder||{},depOrder:S._rzDepOrder||[],manualBk:S._rzManualBk||[],paxMeta:S._rezdyPaxMeta||{},schedPilots:S._schedPilots||{},schedCoPilots:S._schedCoPilots||{},bookingAc:S._rzBookingAc||{},bookingWx:S._rzBookingWx||{},bookingCheckedIn:S._rzBookingCheckedIn||{},schedAttach:S._rzSchedAttach||{},checkin:S._rzCheckin||{},ack:S._pickupAck||{},bookingCancel:S._rzBookingCancel||{},noShow:S._rzNoShow||{},selfDriveOv:S._rzSelfDrive||{},bkNote:S._rzBkNote||{},flybackTime:S._rzFlybackTime||{},flybackEnd:S._rzFlybackEnd||{},depTimeOv:S._rzDepTimeOv||{},depEndOv:S._rzDepEndOv||{},plates:S._rzPlates||{},transMerge:S._rzTransMerge||{},wxCalls:S._rzWxCalls||{},bkCalled:S._rzBkCalled||{},travelWith:S._rzTravelWith||{},blockNote:S._rzBlockNote||{},charterDest:S._rzCharterDest||{},prefContact:S._rzPrefContact||{}};
}
function _pkApplyBlob(d){
  if(!d||typeof d!=='object')return;
  if(Array.isArray(d.vans))S._pickupVans=d.vans; else if(d.vans===null)S._pickupVans=null;
  S._pickupCollected=(d.collected&&typeof d.collected==='object')?d.collected:{};
  S._pickupLocOverride=(d.locOverride&&typeof d.locOverride==='object')?d.locOverride:{};
  S._pickupTimeOverride=(d.timeOverride&&typeof d.timeOverride==='object')?d.timeOverride:{};
  // drivers are now an object keyed "vi|dep" (per departure). Old array form → start fresh ({}).
  S._pickupDrivers=(d.drivers&&typeof d.drivers==='object'&&!Array.isArray(d.drivers))?d.drivers:{};
  S._pickupExtraDrivers=Array.isArray(d.extraDrivers)?d.extraDrivers:[];
  S._pickupSpare=(d.spare&&typeof d.spare==='object')?d.spare:{};
  S._pickupOrder=(d.order&&typeof d.order==='object')?d.order:{};
  S._rzManualBk=Array.isArray(d.manualBk)?d.manualBk:[];
  S._rezdyPaxMeta=(d.paxMeta&&typeof d.paxMeta==='object')?d.paxMeta:{};
  S._schedPilots=(d.schedPilots&&typeof d.schedPilots==='object')?d.schedPilots:{};
  S._schedCoPilots=(d.schedCoPilots&&typeof d.schedCoPilots==='object')?d.schedCoPilots:{};
  S._rzBookingAc=(d.bookingAc&&typeof d.bookingAc==='object')?d.bookingAc:{};
  S._rzBookingWx=(d.bookingWx&&typeof d.bookingWx==='object')?d.bookingWx:{};
  S._rzPrefContact=(d.prefContact&&typeof d.prefContact==='object')?d.prefContact:{};
  S._rzBookingCheckedIn=(d.bookingCheckedIn&&typeof d.bookingCheckedIn==='object')?d.bookingCheckedIn:{};
  S._rzSchedAttach=(d.schedAttach&&typeof d.schedAttach==='object')?d.schedAttach:{};
  S._rzCheckin=(d.checkin&&typeof d.checkin==='object')?d.checkin:{};
  S._pickupAck=(d.ack&&typeof d.ack==='object')?d.ack:{};
  S._rzBookingCancel=(d.bookingCancel&&typeof d.bookingCancel==='object')?d.bookingCancel:{};
  S._rzNoShow=(d.noShow&&typeof d.noShow==='object')?d.noShow:{};
  S._rzSelfDrive=(d.selfDriveOv&&typeof d.selfDriveOv==='object')?d.selfDriveOv:{};
  S._rzBkNote=(d.bkNote&&typeof d.bkNote==='object')?d.bkNote:{};
  S._rzFlybackTime=(d.flybackTime&&typeof d.flybackTime==='object')?d.flybackTime:{};
  S._rzFlybackEnd=(d.flybackEnd&&typeof d.flybackEnd==='object')?d.flybackEnd:{};
  S._rzDepTimeOv=(d.depTimeOv&&typeof d.depTimeOv==='object')?d.depTimeOv:{};
  S._rzDepEndOv=(d.depEndOv&&typeof d.depEndOv==='object')?d.depEndOv:{};
  S._rzDepOrder=Array.isArray(d.depOrder)?d.depOrder:[];
  S._rzPlates=(d.plates&&typeof d.plates==='object')?d.plates:{};
  S._rzTransMerge=(d.transMerge&&typeof d.transMerge==='object')?d.transMerge:{};
  S._rzWxCalls=(d.wxCalls&&typeof d.wxCalls==='object')?d.wxCalls:{};
  S._rzBkCalled=(d.bkCalled&&typeof d.bkCalled==='object')?d.bkCalled:{};
  S._rzTravelWith=(d.travelWith&&typeof d.travelWith==='object')?d.travelWith:{};
  S._rzBlockNote=(d.blockNote&&typeof d.blockNote==='object')?d.blockNote:{};
  S._rzCharterDest=(d.charterDest&&typeof d.charterDest==='object')?d.charterDest:{};
}
function _pkSnapshot(d){try{return JSON.parse(JSON.stringify(d));}catch(e){return null;}}
function _pkEq(a,b){try{return JSON.stringify(a===undefined?null:a)===JSON.stringify(b===undefined?null:b);}catch(e){return false;}}
function _pkSetBaseline(){S._pickupBaseline=_pkSnapshot(_pkBlobFromState());} // remember the as-loaded blob

// ── Driver pickup-list acknowledgement ─────────────────────────────────────────
// A van's "list signature" = its pickups' membership + location + pickup time (NOT order, so a
// driver reordering their own run doesn't ask them to re-acknowledge). When dispatch adds/removes/
// relocates a pickup the sig changes; if it differs from what the driver last acknowledged, they
// get a banner + the changes highlighted, and dispatch sees "awaiting ack".
// All departures that have any pickup loaded.
function _rzAllDeps(){var o={};(_rzPickups()||[]).forEach(function(p){if(p.depart)o[p.depart]=1;});return Object.keys(o);}
// Default departure to OPEN: the first of the day, but on TODAY skip any departure whose time is more
// than 15 min past (0800 stays default until 0815, then 0930 until 0945, …). deps = ordered labels.
function _rzDefaultDep(deps){
  deps=(deps||[]).filter(function(d){return d!=null&&d!=='';});if(!deps.length)return null;
  if(typeof _rzToday==='function'&&S.rezdyDate!==_rzToday())return deps[0];
  var now=new Date(),nm=now.getHours()*60+now.getMinutes();
  for(var i=0;i<deps.length;i++){var dm=(typeof _rzDepMin==='function')?_rzDepMin(deps[i]):null;if(dm==null||dm+15>=nm)return deps[i];}
  return deps[deps.length-1];
}
// A van's pickup ids FOR ONE departure (the unit a driver acknowledges).
function _rzVanDepIds(vi,dep){var pickups=_rzPickups();return ((S._pickupVans||[])[vi]||[]).filter(function(id){var p=_rzPickupById(pickups,id);return p&&(p.depart||'—')===dep;});}
function _rzVanSig(vi,dep){
  var pickups=_rzPickups();
  var parts=_rzVanDepIds(vi,dep).map(function(id){var p=_rzPickupById(pickups,id);return id+'@'+((p&&p.location)||'')+'@'+((p&&p.pickupTime)||'');}).sort();
  return parts.join('|');
}
function _rzVanAck(vi,dep){var a=(S._pickupAck||{})[_pkKey(vi,dep)];return (a&&typeof a==='object')?a:null;}
function _rzVanAcked(vi,dep){var a=_rzVanAck(vi,dep);return !!(a&&a.sig===_rzVanSig(vi,dep));}
// ids currently on this (van,dep) run but NOT in the last-acknowledged set = newly added.
function _rzVanAddedIds(vi,dep){var a=_rzVanAck(vi,dep);if(!a||!Array.isArray(a.ids))return {};var was={};a.ids.forEach(function(id){was[id]=1;});var out={};_rzVanDepIds(vi,dep).forEach(function(id){if(!was[id])out[id]=1;});return out;}
// acknowledged ids no longer on this run = removed since last ack (for a "removed" note).
function _rzVanRemovedIds(vi,dep){var a=_rzVanAck(vi,dep);if(!a||!Array.isArray(a.ids))return [];var now={};_rzVanDepIds(vi,dep).forEach(function(id){now[id]=1;});return a.ids.filter(function(id){return !now[id];});}
// Record the driver's acknowledgement of one (van,departure) run (+ broadcast so dispatch sees it).
window.pickupAckRun=function(vi,dep){
  vi=parseInt(vi,10);if(isNaN(vi))return;
  S._pickupAck=S._pickupAck||{};
  S._pickupAck[_pkKey(vi,dep)]={sig:_rzVanSig(vi,dep),ids:_rzVanDepIds(vi,dep),at:new Date().toISOString(),by:((S.user&&S.user.name)||'').trim()};
  if(window.pickupSave)window.pickupSave(true);
  if(typeof toast==='function')toast('Pickup list acknowledged ✓','ok');
  render();
};
// Acknowledge EVERY (van,departure) run the signed-in driver is on (the My-Pickups banner button).
window.pickupAckRunAll=function(){
  var me=((S.user&&S.user.name)||'').trim();if(!me)return;
  S._pickupAck=S._pickupAck||{};
  var deps=_rzAllDeps();
  (S._pickupVans||[]).forEach(function(ids,vi){
    deps.forEach(function(dep){
      if(_rzVanDriver(vi,dep)===me){
        S._pickupAck[_pkKey(vi,dep)]={sig:_rzVanSig(vi,dep),ids:_rzVanDepIds(vi,dep),at:new Date().toISOString(),by:me};
      }
    });
  });
  S._myPkNotifiedSig=''; // we've acked → reset the notify guard for the next change
  if(window.pickupSave)window.pickupSave(true);
  if(typeof toast==='function')toast('Pickup list acknowledged ✓','ok');
  render();
};
// Keep the Pickups / My-Pickups pages LIVE even if a realtime broadcast was missed (mobile
// networks drop them): re-pull the day's pickup blob every 15s while viewing them. Guarded against
// clobbering a local edit (focused input / within 7s of a local save) inside rezdyReloadPickupLive.
setInterval(function(){
  try{
    if(typeof S==='undefined'||!S.user||document.visibilityState!=='visible')return;
    // Weather calls ride in the same pickup blob, so the Weather page needs the same fallback re-pull
    // (otherwise a missed websocket broadcast leaves another device's tick/status stale).
    if((S.section==='ground'||S.section==='weather')&&typeof window.rezdyReloadPickupLive==='function')window.rezdyReloadPickupLive();
  }catch(e){}
},15000);
// ── Unacknowledged-pickup chime (mobile) ───────────────────────────────────────
// Repeating chime while the signed-in driver has an unacknowledged run, until they acknowledge.
// Web Audio needs a user gesture first (autoplay policy), so we (re)arm the audio context on any
// tap/click; until then it stays silent.
var _rzAudioCtx=null;
function _rzEnsureAudio(){try{if(!_rzAudioCtx&&(window.AudioContext||window.webkitAudioContext))_rzAudioCtx=new (window.AudioContext||window.webkitAudioContext)();if(_rzAudioCtx&&_rzAudioCtx.state==='suspended')_rzAudioCtx.resume();}catch(e){}}
try{['click','touchend'].forEach(function(ev){window.addEventListener(ev,_rzEnsureAudio,{passive:true});});}catch(e){}
function _rzChimeBeep(){
  if(typeof _soundMuted==='function'&&_soundMuted())return; // user muted all sound
  if(!_rzAudioCtx||_rzAudioCtx.state!=='running')return;
  try{
    var t=_rzAudioCtx.currentTime;
    // Louder, four-note attention chime (square+sine layered for presence), played twice ~0.9s apart.
    [0,0.9].forEach(function(rep){
      [880,1175,880,1175].forEach(function(freq,i){
        var s=t+rep+i*0.16;
        ['square','sine'].forEach(function(wav){
          var o=_rzAudioCtx.createOscillator(),g=_rzAudioCtx.createGain();
          o.type=wav;o.frequency.value=freq;o.connect(g);g.connect(_rzAudioCtx.destination);
          var peak=wav==='square'?0.35:0.6; // combined ≈0.95 — much louder than before
          g.gain.setValueAtTime(0.0001,s);g.gain.exponentialRampToValueAtTime(peak,s+0.02);g.gain.exponentialRampToValueAtTime(0.0001,s+0.32);
          o.start(s);o.stop(s+0.34);
        });
      });
    });
    if(navigator.vibrate)try{navigator.vibrate([180,90,180,90,180]);}catch(e){}
  }catch(e){}
}
// A single, more prominent chime when a NEW notification arrives — a 3-note rising triangle tone,
// louder than the (two-note sine) pickup-ack chime so it stands out. Shares the same audio context.
// Selectable notification chimes (User Preferences). Each = a list of note freqs played in sequence.
var _RZ_CHIMES={
  classic:{name:'Classic',notes:[659.25,880,1318.5],type:'triangle',gap:0.14,d:0.45,peak:0.55},
  ping:   {name:'Ping',   notes:[1318.5],           type:'sine',    gap:0.0, d:0.5, peak:0.5},
  bell:   {name:'Bell',   notes:[987.77,1318.5],    type:'sine',    gap:0.18,d:0.7, peak:0.5},
  marimba:{name:'Marimba',notes:[523.25,659.25,783.99],type:'triangle',gap:0.12,d:0.3,peak:0.5},
  alert:  {name:'Alert',  notes:[880,1175,880,1175],type:'square',  gap:0.16,d:0.3,peak:0.4},
  ascend: {name:'Ascend', notes:[523.25,659.25,783.99,1046.5],type:'sine',gap:0.11,d:0.35,peak:0.5}
};
function _rzChimeList(){return Object.keys(_RZ_CHIMES).map(function(id){return {id:id,name:_RZ_CHIMES[id].name};});}
function _rzPlayChime(id){
  try{_rzEnsureAudio();}catch(e){}
  if(!_rzAudioCtx||_rzAudioCtx.state!=='running')return;
  var c=_RZ_CHIMES[id]||_RZ_CHIMES.classic,t=_rzAudioCtx.currentTime;
  try{c.notes.forEach(function(f,i){var s=t+i*c.gap;var o=_rzAudioCtx.createOscillator(),g=_rzAudioCtx.createGain();
    o.type=c.type;o.frequency.value=f;o.connect(g);g.connect(_rzAudioCtx.destination);
    g.gain.setValueAtTime(0.0001,s);g.gain.exponentialRampToValueAtTime(c.peak,s+0.02);g.gain.exponentialRampToValueAtTime(0.0001,s+c.d);
    o.start(s);o.stop(s+c.d+0.02);});}catch(e){}
}
// Preview: play the chime on demand (button gesture resumes audio) — ignores the notif-sound toggle so
// the operator can hear each option, but still honours the master mute.
window.previewChime=function(id){if(typeof _soundMuted==='function'&&_soundMuted()){if(typeof toast==='function')toast('Unmute all sound first to preview','info');return;}_rzPlayChime(id);};
function _notifChime(){
  if(typeof _soundMuted==='function'&&_soundMuted())return;                 // master mute
  if(typeof _notifSoundOn==='function'&&!_notifSoundOn())return;            // notification-sound toggle off
  _rzPlayChime((typeof _chimeGet==='function')?_chimeGet():'classic');
}
function _rzDriverHasUnacked(){
  var me=((S.user&&S.user.name)||'').trim();if(!me)return false;
  var has=false,deps=_rzAllDeps();
  (S._pickupVans||[]).forEach(function(ids,vi){deps.forEach(function(dep){if(_rzVanDriver(vi,dep)===me&&!_rzVanAcked(vi,dep))has=true;});});
  return has;
}
setInterval(function(){
  try{
    if(typeof S==='undefined'||!S.user||!S.mobileView||document.visibilityState!=='visible')return;
    if(typeof _rzDriverHasUnacked==='function'&&_rzDriverHasUnacked())_rzChimeBeep();
  }catch(e){}
},4000);

window.rezdyLoadPickups=async function(){
  S._pickupLoading=true;safeRender();
  const rows=await sbF('ts_pickup_lists','&list_date=eq.'+encodeURIComponent(S.rezdyDate));
  const row=(rows&&rows.length)?_rzRow(rows[0]):null;
  if(row&&Array.isArray(row.vans)){ _pkApplyBlob(row); }
  else{ _pkApplyBlob({vans:null}); } // no saved row → empty state (vans null → auto-allocate)
  _pkSetBaseline(); // baseline = what we loaded, so a later save only writes fields WE changed
  _rzApplyManualBk(); // merge this date's manual bookings into the loaded list
  S._pickupLoading=false;
  render();
};

window.pickupAutoAllocate=function(){
  S._pickupVans=_rzAutoVans(_rzPickups());
  if(window.pickupSave)window.pickupSave(true); // PERSIST — otherwise a live re-pull reverts it
  toast('Vans auto-allocated','ok');
  render();
};
// Auto-assign: activate vehicles to cover every run, park the ones left empty, distribute pickups,
// and assign available drivers. Anything that doesn't fit a vehicle stays a Taxi list.
window.pickupAutoAssign=function(){
  var pickups=_rzPickups();
  var depOf={};pickups.forEach(function(p){depOf[p.id]=(p.depart||'—');});
  var deps={};pickups.forEach(function(p){if(!p.selfDrive)deps[p.depart||'—']=1;});
  var nOwned=_rzVehicles().length;
  S._pickupSpare={};                                  // un-park everything so the allocator can use all vehicles
  S._pickupVans=_rzAutoVans(pickups);                 // smart distribution across all vehicles (overflow → taxi)
  // Re-park any vehicle that ended up empty for a given departure (so it shows as spare, not an empty card).
  S._pickupSpare={};
  Object.keys(deps).forEach(function(dep){
    for(var vi=0;vi<nOwned;vi++){
      var has=(S._pickupVans[vi]||[]).some(function(id){return depOf[id]===dep;});
      if(!has)S._pickupSpare[_pkKey(vi,dep)]=1;
    }
  });
  _rzAutoAssignDrivers(pickups,depOf,deps);
  if(window.pickupSave)window.pickupSave(true);
  toast('Auto-assigned vehicles + drivers','ok');
  render();
};
// Round-robin the day's available drivers onto each departure's ACTIVE vehicles (taxis stay driverless).
function _rzAutoAssignDrivers(pickups,depOf,deps){
  var avail=(typeof _rzAvailableDrivers==='function')?_rzAvailableDrivers().slice():[];
  if(!avail.length)return;
  var nOwned=_rzVehicles().length;
  S._pickupDrivers=S._pickupDrivers||{};
  Object.keys(deps).forEach(function(dep){
    var pool=avail.slice();
    for(var vi=0;vi<nOwned;vi++){
      if(_rzVanParked(vi,dep))continue;
      var has=(S._pickupVans[vi]||[]).some(function(id){return depOf[id]===dep;});
      if(!has)continue;
      if(!_rzVanDriver(vi,dep)&&pool.length)S._pickupDrivers[_pkKey(vi,dep)]=pool.shift();
    }
  });
}

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
window.pickupDropOnVan=function(vi,e,dep){
  if(e&&e.preventDefault)e.preventDefault();
  // A driver bubble dropped on a van assigns that driver to it FOR THIS DEPARTURE.
  if(S._rezdyDragDriver){
    var _dn=S._rezdyDragDriver;S._rezdyDragDriver=null;
    window.pickupSetVanDriver(vi,dep,_dn); // resets that run's ack + notifies the new driver, then saves
    return;
  }
  let id=S._rezdyDragId;
  try{if(!id&&e.dataTransfer)id=e.dataTransfer.getData('text/plain');}catch(_){}
  if(!id||id.indexOf('driver:')===0||id.indexOf('veh:')===0||!Array.isArray(S._pickupVans))return; // ignore driver/vehicle drags
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
  var local=_pkBlobFromState();
  var merged=local, didMerge=false;
  // 3-way merge against the LATEST cloud blob so a concurrent/stale device can't overwrite fields
  // we didn't touch. Only the fields THIS device changed since it loaded (vs S._pickupBaseline) are
  // written from local; everything else keeps the cloud's current value.
  try{
    var rows=await sbF('ts_pickup_lists','&list_date=eq.'+encodeURIComponent(S.rezdyDate));
    var cloud=(rows&&rows.length)?_rzRow(rows[0]):null;
    var base=S._pickupBaseline;
    if(cloud&&base){
      merged={};
      _PK_FIELDS.forEach(function(f){
        var changedLocally=!_pkEq(local[f],base[f]);
        merged[f]= changedLocally ? local[f] : (cloud[f]!==undefined ? cloud[f] : local[f]);
      });
      didMerge=true;
    } else if(cloud){
      // No local baseline yet (this device's pickup blob hadn't finished loading — e.g. a booking was
      // added moments after the day loaded). Do NOT clobber the saved arrangement: merge non-destructively
      // — union manualBk by id, union object maps (drivers / vans-spare / aircraft etc., local key wins),
      // and keep cloud for any array still empty locally. This is the fix for "adding a booking wiped my
      // saved pickup/dropoff allocations".
      merged={};
      _PK_FIELDS.forEach(function(f){var lv=local[f],cv=cloud[f];
        if(f==='manualBk'){var by={};(Array.isArray(cv)?cv:[]).forEach(function(x){by[String((x&&(x.orderNumber||x.id))||'')]=x;});(Array.isArray(lv)?lv:[]).forEach(function(x){by[String((x&&(x.orderNumber||x.id))||'')]=x;});merged[f]=Object.keys(by).map(function(k){return by[k];});}
        else if(lv&&typeof lv==='object'&&!Array.isArray(lv)){merged[f]=Object.assign({},(cv&&typeof cv==='object'&&!Array.isArray(cv))?cv:{},lv);}
        else{var empty=(lv==null)||(Array.isArray(lv)&&!lv.length);merged[f]=(empty&&cv!==undefined)?cv:lv;}
      });
      didMerge=true;
    }
  }catch(e){ merged=local; } // offline / fetch failed → write local (same as before)
  var r=await sbU('ts_pickup_lists',[{id:'pl_'+S.rezdyDate,list_date:S.rezdyDate,data:merged}]);
  if(r){
    if(didMerge)_pkApplyBlob(merged); // reflect any merged-in remote changes (e.g. another iPad's check-ins)
    S._pickupBaseline=_pkSnapshot(merged); // new baseline = exactly what we just wrote
    S._pickupSavedTs=Date.now();           // recent-save guard for the live-reload receiver
    if(typeof _rzPickupBroadcast==='function')_rzPickupBroadcast(); // tell other devices to re-pull
    if(didMerge&&typeof safeRender==='function')safeRender();
    if(!silent&&typeof toast==='function')toast('Pickup list saved ✓','ok');
  }else{
    // A silently-failed save is exactly the "my pickups reverted" bug — surface it ALWAYS, even on
    // the high-frequency auto-saves, so a permission/connection failure can't lose work quietly.
    if(typeof toast==='function')toast('Pickup changes did NOT save — check your connection/permission','err');
  }
};
// A2: live-sync receiver — another device saved the pickup list (check-ins / allocations /
// drivers) for the date we're viewing. Re-pull the blob WITHOUT the loading flash. Date-guarded
// by the broadcast receiver in shared.js. Mirrors rezdyLoadPickups but never shows the spinner.
window.rezdyReloadPickupLive=function(){
  if(!S.rezdyDate)return;
  // Don't overwrite local pickup state while the user is mid-edit (typing a weight, a dropdown
  // open, dragging) — that would discard their in-flight change. Reconciles on the next blur-time
  // broadcast / tab revisit. Mirrors the loadsheet ls_update guard.
  var _ae=document.activeElement;if(_ae&&/^(INPUT|SELECT|TEXTAREA)$/.test(_ae.tagName||''))return;
  // Don't let a stale broadcast / socket-reconnect backfill revert a change the user JUST made
  // locally (reorder, check-in, van move). Their save is the freshest; apply remote updates after
  // a short grace window. (The deeper multi-device whole-blob merge is the proper long-term fix.)
  if(S._pickupSavedTs&&(Date.now()-S._pickupSavedTs)<7000)return;
  try{sbF('ts_pickup_lists','&list_date=eq.'+encodeURIComponent(S.rezdyDate)).then(function(rows){
    var row=(rows&&rows.length)?_rzRow(rows[0]):null;
    if(row&&Array.isArray(row.vans)){
      _pkApplyBlob(row);
      _pkSetBaseline(); // the cloud is now our baseline — local matches it until the user edits again
      if(typeof _rzApplyManualBk==='function')_rzApplyManualBk();
      if(typeof safeRender==='function')safeRender();
    }
  }).catch(function(){});}catch(e){}
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
window.pickupClearDriver=function(vi,dep){var k=_pkKey(vi,dep);var _prevDrv=(S._pickupDrivers&&S._pickupDrivers[k]||'').trim();if(S._pickupDrivers)delete S._pickupDrivers[k];if(S._pickupAck&&S._pickupAck[k]!=null)delete S._pickupAck[k];if(_prevDrv)_rzDriverCalledInSync(_prevDrv);window.pickupSave(true);render();};
// ── Tap-based controls (iOS Safari has no HTML5 touch drag-and-drop) ──
// Combined driver list = rostered ground staff + anyone added via "＋" + anyone already assigned.
function _rzAllDriverNames(){
  var out=[];[].concat(_rzAvailableDrivers(),(S._pickupExtraDrivers||[]),Object.values(S._pickupDrivers||{}).filter(Boolean)).forEach(function(n){n=(n||'').trim();if(n&&out.indexOf(n)<0)out.push(n);});
  return out;
}
// Tap-to-assign a driver to a van for a departure (drag-driver-onto-van doesn't work on iPhone).
// The open-picker state is keyed by "vi|dep".
window.pickupVanDriverPickOpen=function(vi,dep){var k=_pkKey(vi,dep);S._pickupVanDriverPick=(S._pickupVanDriverPick===k)?null:k;S._pickupMovePick=null;render();};
// Notify the newly-assigned driver of a specific departure run (persistent ts_notifications row →
// bell + OS pop-up via the notification poll, even off the pickups page). Skips notifying yourself.
function _rzNotifyDriverAssigned(vi,dep,name){
  name=(name||'').trim();if(!name)return;
  if(name===((S.user&&S.user.name)||'').trim())return;
  var u=(S.users||[]).find(function(x){return x&&(x.name||'').trim()===name;});
  if(!u||!u.id)return;
  var msg='🚐 You\'re driving '+_rzVehName(vi)+' on the '+_rzEsc(_rzDepDisplay(dep))+' run for '+_rzDowLabel(S.rezdyDate)+' — open My Pickups to review & acknowledge.';
  try{if(typeof sbU==='function')sbU('ts_notifications',[{user_id:u.id,type:'pickup_assigned',message:msg,read:false,created_at:new Date().toISOString()}]).catch(function(){});}catch(e){}
}
// Keep the roster in step with who's driving: a person is "called in" iff they're a van's driver or
// in the spare pool today. Adds a 'called_in' roster day when first driving on a day off, and reverts
// it once they're no longer driving anything. Marketing is skipped inside _rosterCallIn.
function _rzDriverCalledInSync(name){
  name=(name||'').trim();if(!name||typeof window._rosterCallIn!=='function')return;
  var on=false,drv=S._pickupDrivers||{};
  Object.keys(drv).forEach(function(kk){if((drv[kk]||'').trim()===name)on=true;});
  if((S._pickupExtraDrivers||[]).indexOf(name)>=0)on=true;
  window._rosterCallIn(name,on,S.rezdyDate);
}
window.pickupSetVanDriver=function(vi,dep,name){
  S._pickupDrivers=S._pickupDrivers||{};
  var k=_pkKey(vi,dep);
  var prev=(S._pickupDrivers[k]||'').trim();
  var next=(name||'').trim()||null;
  if(next)S._pickupDrivers[k]=next; else delete S._pickupDrivers[k];
  if((prev||'')!==(next||'')){ // driver changed for this departure → reset this run's ack; notify
    if(S._pickupAck&&S._pickupAck[k]!=null)delete S._pickupAck[k];
    if(next)_rzNotifyDriverAssigned(vi,dep,next);
    if(next)_rzDriverCalledInSync(next);            // newly driving → call them in (roster)
    if(prev&&prev!==next)_rzDriverCalledInSync(prev); // freed up → revert if no longer driving anything
  }
  S._pickupVanDriverPick=null;S._pickupDriverAssign=null;
  if(window.pickupSave)window.pickupSave(true);render();
};
// Tap a driver chip → choose which van to assign them to (iPhone-friendly alternative to dragging).
window.pickupDriverPickVan=function(name){name=(name||'').trim();S._pickupDriverAssign=(S._pickupDriverAssign===name?null:name);if(typeof render==='function')render();};
// Tap-to-move a pickup to another van (the drag-pickup-onto-van path doesn't work on iPhone).
window.pickupMovePickOpen=function(id){S._pickupMovePick=(S._pickupMovePick===id)?null:id;S._pickupVanDriverPick=null;render();};
window.pickupMoveToVan=function(id,vi){
  if(!Array.isArray(S._pickupVans))return;
  S._pickupVans=S._pickupVans.map(function(v){return v.filter(function(x){return x!==id;});});
  if(!S._pickupVans[vi])S._pickupVans[vi]=[];
  S._pickupVans[vi].push(id);
  S._pickupMovePick=null;
  if(window.pickupSave)window.pickupSave(true);render();
};
// Tap-to-reorder a stop within the driver's My-Pickups run (up/down, touch-friendly).
window.myPkMove=function(vi,dep,id,dir){
  var pickups=_rzPickups();
  var grp=((S._pickupVans||[])[vi]||[]).map(function(pid){return _rzPickupById(pickups,pid);}).filter(function(p){return p&&(p.depart||'—')===dep;}).sort(function(a,b){return _rzPkTimeVal(a)-_rzPkTimeVal(b);});
  grp=_rzApplyMyOrder(grp,vi,dep);
  var ids=grp.map(function(p){return p.id;});
  var from=ids.indexOf(id);if(from<0)return;
  var to=from+(dir<0?-1:1);if(to<0||to>=ids.length)return;
  ids.splice(from,1);ids.splice(to,0,id);
  S._pickupOrder=S._pickupOrder||{};S._pickupOrder[vi+'|'+dep]=ids;
  if(window.pickupSave)window.pickupSave(true);render();
};
// Drag a pickup card onto ANOTHER pickup card to reorder the run (transport board). Same-van = reorder;
// from another van = move it in AND position it before the drop target. (Drop on the van background still
// moves-to-van via pickupDropOnVan.)
window.pickupReorderDrop=function(vi,dep,targetId,e){
  if(e&&e.preventDefault)e.preventDefault();if(e&&e.stopPropagation)e.stopPropagation();
  var id=S._rezdyDragId;S._rezdyDragId=null;
  if(!id||id===targetId)return;
  var pickups=_rzPickups();
  var grp=((S._pickupVans||[])[vi]||[]).map(function(pid){return _rzPickupById(pickups,pid);}).filter(function(p){return p&&(p.depart||'—')===dep;}).sort(function(a,b){return _rzPkTimeVal(a)-_rzPkTimeVal(b);});
  grp=_rzApplyMyOrder(grp,vi,dep);
  var ids=grp.map(function(p){return p.id;});
  var from=ids.indexOf(id);
  if(from<0){   // came from another van → pull it out of every van, add to this one
    S._pickupVans=(S._pickupVans||[]).map(function(v){return v.filter(function(x){return x!==id;});});
    if(!S._pickupVans[vi])S._pickupVans[vi]=[];S._pickupVans[vi].push(id);
    ids.push(id);from=ids.length-1;
  }
  ids.splice(from,1);var tgt=ids.indexOf(targetId);if(tgt<0)tgt=ids.length;ids.splice(tgt,0,id);
  S._pickupOrder=S._pickupOrder||{};S._pickupOrder[vi+'|'+dep]=ids;
  if(window.pickupSave)window.pickupSave(true);render();
};
window.pickupSetDepFilter=function(t){S._pickupDepFilter=(S._pickupDepFilter===t)?null:t;render();};
// Reorder the Transport departure chips as the operator sees fit (persisted). `order` is the array
// of dep keys in current display order; we splice the chosen one left/right and save.
window.rzTransMoveDep=function(dep,dir,order){
  try{order=JSON.parse(decodeURIComponent(order));}catch(e){order=[];}
  if(!Array.isArray(order))return;
  var i=order.indexOf(dep);if(i<0)return;var j=i+(dir<0?-1:1);if(j<0||j>=order.length)return;
  var tmp=order[i];order[i]=order[j];order[j]=tmp;
  S._rzDepOrder=order;
  if(window.pickupSave)window.pickupSave(true);render();
};
// Toggle the "split by aircraft" visualisation on the Transport board.
window.rzTransToggleByAc=function(){S._rzTransByAc=!S._rzTransByAc;render();};
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
// Driver picker list, split into ON-DUTY (can drive now) and DAY OFF (greyed — call them in if
// needed). Maintenance + accounts are excluded entirely; marketing always sits in the Day-off list.
function _rzDriverGroups(){
  var ds=S.rezdyDate,roster=S.roster||{},off={rdo:1,off:1,leave:1,ul:1,sick:1};
  var DRIVE_ROLES={ground_staff:1,desk:1,pilot:1,cx_manager:1,admin:1,superadmin:1};
  var onDuty=[],dayOff=[];
  (S.users||[]).forEach(function(u){
    if(!u||u.inactive)return;var nm=(u.name||'').trim();if(!nm)return;
    if(u.role==='marketing'){if(dayOff.indexOf(nm)<0)dayOff.push(nm);return;} // marketing → day-off only
    if(!DRIVE_ROLES[u.role])return; // maintenance / accounts excluded
    var st=(typeof _rGetStatus==='function')?_rGetStatus(u,ds,roster):((roster[ds]||{})[u.id]||'');
    if(off[st]){if(dayOff.indexOf(nm)<0)dayOff.push(nm);}else{if(onDuty.indexOf(nm)<0)onDuty.push(nm);}
  });
  onDuty.sort();dayOff.sort();
  return {onDuty:onDuty,dayOff:dayOff};
}
// Driver-picker dropdown rows (shared by the per-van tap picker), with a Clear + greyed Day-off list.
function _rzDriverPickRows(onPickJs){
  var g=_rzDriverGroups();
  var rowS='padding:9px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border2);display:flex;align-items:center;gap:8px;min-height:40px';
  var h='<div onclick="'+onPickJs.replace('%N%',"''")+'" style="'+rowS+';color:#f59e0b;font-weight:700">🚕 No driver (taxi)</div>';
  g.onDuty.forEach(function(n){h+='<div onclick="'+onPickJs.replace('%N%',"'"+_rzEsc(n).replace(/'/g,"\\'")+"'")+'" style="'+rowS+';color:var(--text);font-weight:700">👤 '+_rzEsc(n)+'</div>';});
  if(g.dayOff.length){
    h+='<div style="padding:6px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:800;background:var(--card)">Day off</div>';
    g.dayOff.forEach(function(n){h+='<div onclick="'+onPickJs.replace('%N%',"'"+_rzEsc(n).replace(/'/g,"\\'")+"'")+'" title="On a day off — tap to call them in" style="'+rowS+';color:var(--text3);opacity:.7">😴 '+_rzEsc(n)+'</div>';});
  }
  return h;
}
window.pickupAddDriver=function(name){if(!name)return;S._pickupExtraDrivers=S._pickupExtraDrivers||[];if(S._pickupExtraDrivers.indexOf(name)<0)S._pickupExtraDrivers.push(name);S._pickupDriverPickerOpen=false;_rzDriverCalledInSync(name);window.pickupSave(true);render();};
window.pickupRemoveExtraDriver=function(name){
  name=(name||'').trim();if(!name)return;
  // If they're currently driving any van(s), clear those assignments (and their acks) too — so a
  // called-in driver can be removed in one tap without first hunting down which van they're on.
  var keys=[];Object.keys(S._pickupDrivers||{}).forEach(function(k){if(String(S._pickupDrivers[k]||'').trim()===name)keys.push(k);});
  if(keys.length&&typeof confirm==='function'&&!confirm(name+' is assigned to '+keys.length+' van'+(keys.length===1?'':'s')+'. Remove them and clear those van assignment'+(keys.length===1?'':'s')+'?'))return;
  keys.forEach(function(k){delete S._pickupDrivers[k];if(S._pickupAck&&S._pickupAck[k]!=null)delete S._pickupAck[k];});
  S._pickupExtraDrivers=(S._pickupExtraDrivers||[]).filter(function(n){return n!==name;});
  _rzDriverCalledInSync(name);   // reverts their 'called_in' roster day once they're no longer driving anything
  window.pickupSave(true);render();
};

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
  // My runs = (van, departure) where I'm the assigned driver for that departure (drivers are
  // per-departure now, so I might drive van 1 at 0800 and van 2 at 1200).
  var _deps0=_rzAllDeps();
  var myRuns=[];
  (S._pickupVans||[]).forEach(function(vanIds,vi){ _deps0.forEach(function(dep){ if(_rzVanDriver(vi,dep)===me) myRuns.push({vi:vi,dep:dep}); }); });
  if(!myRuns.length){
    return '<div style="max-width:560px;margin:0 auto"><div class="card" style="text-align:center;padding:40px 20px;color:var(--text3)"><div style="font-size:30px;margin-bottom:8px">🚐</div><div style="font-size:15px;font-weight:700;color:var(--text2);margin-bottom:4px">No pickups assigned to you</div><div style="font-size:13px">You\'re not driving a van for '+_rzDowLabel(S.rezdyDate)+'. Use the arrows above to check another day.</div></div></div>';
  }
  // ── Acknowledgement: has dispatch changed any of MY runs since I last acknowledged? (per run) ──
  var _unacked=myRuns.filter(function(r){return !_rzVanAcked(r.vi,r.dep);});
  var _addedSet={},_removedCount=0,_hadPriorAck=false;
  _unacked.forEach(function(r){var ad=_rzVanAddedIds(r.vi,r.dep);Object.keys(ad).forEach(function(id){_addedSet[id]=1;});_removedCount+=_rzVanRemovedIds(r.vi,r.dep).length;if(_rzVanAck(r.vi,r.dep))_hadPriorAck=true;});
  var _ackSig=_unacked.map(function(r){return r.vi+'|'+r.dep+':'+_rzVanSig(r.vi,r.dep);}).join('||');
  if(S._myPkNotifiedSig===undefined){S._myPkNotifiedSig=_ackSig;}
  else if(_ackSig!==S._myPkNotifiedSig){S._myPkNotifiedSig=_ackSig;if(_ackSig&&typeof _osNotify==='function')_osNotify({message:'Your pickup run changed — review & acknowledge',id:'mypk-'+Date.now()});}
  var ackBanner='';
  if(_unacked.length){
    var _addedN=Object.keys(_addedSet).length;
    var _msg=_hadPriorAck
      ? ('A pickup '+((_addedN&&_removedCount)?'was added & removed':(_addedN?'was added':(_removedCount?'was removed':'changed')))+' on your run'+((_addedN||_removedCount)?(' — '+(_addedN?_addedN+' new':'')+((_addedN&&_removedCount)?', ':'')+(_removedCount?_removedCount+' removed':'')):'')+'.')
      : 'Please review and acknowledge your pickup run.';
    ackBanner='<div style="position:sticky;top:0;z-index:40;background:linear-gradient(135deg,#7c2d12,#92400e);border:1px solid #f59e0b;border-radius:10px;padding:12px 14px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;box-shadow:0 6px 18px rgba(0,0,0,.35)">'+
      '<div style="font-size:13.5px;font-weight:700;color:#fde68a;flex:1;min-width:160px">⚠ '+_msg+(_addedN?' New stops are highlighted in green below.':'')+'</div>'+
      '<button onclick="window.pickupAckRunAll()" style="flex-shrink:0;padding:10px 18px;border-radius:8px;border:none;background:#22c55e;color:#06281a;font-size:13px;font-weight:800;cursor:pointer">OK, got it ✓</button>'+
    '</div>';
  }
  // Departure tabs across my runs.
  var myDeps=[];myRuns.forEach(function(r){if(myDeps.indexOf(r.dep)<0)myDeps.push(r.dep);});myDeps.sort(function(a,b){return _rzTransDepSort(a)-_rzTransDepSort(b);});
  var selDep=(S._myPkDep&&myDeps.indexOf(S._myPkDep)>=0)?S._myPkDep:(myDeps[0]||null);
  var tabs='';
  if(myDeps.length){
    tabs='<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px;-webkit-overflow-scrolling:touch;scrollbar-width:none">';
    myDeps.forEach(function(d){
      var cnt=0;myRuns.filter(function(r){return r.dep===d;}).forEach(function(r){_rzVanDepIds(r.vi,d).forEach(function(id){var p=_rzPickupById(pickups,id);if(p)cnt+=(p.pax||0);});});
      var _dropTab=_rzIsDropDep(d);
      tabs+='<button onclick="S._myPkDep=\''+_rzEsc(d).replace(/'/g,"\\'")+'\';render()" class="sub-tab '+(selDep===d?'on':'')+'" style="white-space:nowrap;flex-shrink:0">'+(_dropTab?'🛬 '+_rzEsc(_rzTransDepLabel(d)):'🛫 '+_rzEsc(_rzDepDisplay(d)))+' <span style="opacity:.6">('+cnt+')</span></button>';
    });
    tabs+='</div>';
  }
  var h=ackBanner+tabs;
  myRuns.filter(function(r){return r.dep===selDep;}).forEach(function(r){
    var vi=r.vi,col=_rzVehColor(vi);
    var grp=_rzVanDepIds(vi,selDep).map(function(id){return _rzPickupById(pickups,id);}).filter(Boolean).sort(function(a,b){return _rzPkTimeVal(a)-_rzPkTimeVal(b);});
    if(!grp.length)return;
    grp=_rzApplyMyOrder(grp,vi,selDep); // honour the driver's manual reorder
    var _viD=vi,_depD=_rzEsc(selDep).replace(/'/g,"\\'");
    var depPax=grp.reduce(function(s,p){return s+(p.pax||0);},0);
    h+='<div class="card" style="border-top:4px solid '+col+';padding:14px;margin-bottom:14px">';
    h+='<div style="font-weight:800;font-size:18px;color:'+col+'">'+_rzEsc(_rzVehName(vi))+'</div>';
    h+='<div style="font-size:12px;color:var(--text3);margin-bottom:10px">'+grp.length+' stop'+(grp.length===1?'':'s')+' · '+depPax+' pax</div>';
    grp.forEach(function(p){
      var collected=!!(S._pickupCollected||{})[p.id];
      var _idD=_rzEsc(p.id).replace(/'/g,"\\'");
      var _isNew=!!_addedSet[p.id]; // added by dispatch since this driver last acknowledged
      h+='<div draggable="true" ondragstart="window.myPkDragStart(\''+_idD+'\',event)" ondragover="event.preventDefault()" ondrop="window.myPkDrop('+_viD+',\''+_depD+'\',\''+_idD+'\',event)" style="background:'+(_isNew?'rgba(34,197,94,.10)':'var(--card2)')+';border:'+(_isNew?'2px solid #22c55e':'1px solid var(--border2)')+';border-left:4px solid '+(_isNew?'#22c55e':col)+';border-radius:10px;padding:13px;margin-bottom:10px;cursor:grab;'+(collected?'opacity:.55':'')+'">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px">'+
          '<div style="font-weight:800;font-size:16px;color:var(--text1);min-width:0;'+(collected?'text-decoration:line-through':'')+'"><span style="color:var(--text3);font-weight:700;margin-right:8px;cursor:grab;font-size:20px;vertical-align:middle" title="Drag to reorder">≡</span>'+_rzEsc(p.customer||p.order)+(p.dropoff&&p.ac?' '+_rzAcPill(p.ac):'')+(_isNew?' <span style="font-size:10px;font-weight:900;color:#06281a;background:#22c55e;padding:1px 6px;border-radius:10px;vertical-align:middle">NEW</span>':'')+'</div>'+
          '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">'+
            '<span style="font-size:13px;font-weight:800;color:'+col+'">'+p.pax+' pax</span>'+
            '<div style="display:flex;flex-direction:column;gap:3px">'+
              '<button onclick="event.stopPropagation();window.myPkMove('+_viD+',\''+_depD+'\',\''+_idD+'\',-1)" title="Move up" style="width:42px;height:30px;border-radius:7px;border:1px solid var(--border2);background:var(--card);color:var(--text2);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">▲</button>'+
              '<button onclick="event.stopPropagation();window.myPkMove('+_viD+',\''+_depD+'\',\''+_idD+'\',1)" title="Move down" style="width:42px;height:30px;border-radius:7px;border:1px solid var(--border2);background:var(--card);color:var(--text2);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">▼</button>'+
            '</div>'+
          '</div>'+
        '</div>'+
        (p.pickupTime?'<div style="font-size:15px;font-weight:700;color:var(--text1);margin-bottom:3px">🕑 '+(p.dropoff?'Drop-off':'Pickup')+' '+_rzEsc(p.pickupTime)+'</div>':'')+
        (p.dropoff?'<div style="font-size:11px;font-weight:800;color:'+RZ_DROP_COL+';margin-bottom:3px">🛬 '+(p.depart===RZ_FLYBACK_DEP?'FLYBACK ':'')+'DROP-OFF</div>':'')+
        '<div style="font-size:14px;color:var(--text2);margin-bottom:'+(p.phone?'8px':'10px')+'">'+(p.dropoff?'📦':'📍')+' '+_rzEsc(p.location||'—')+'</div>'+
        (p.phone?'<div style="margin-bottom:10px"><a href="tel:'+_rzEsc(p.phone)+'" style="font-size:15px;font-weight:700;color:'+col+';text-decoration:none">📞 '+_rzEsc(p.phone)+'</a></div>':'')+
        '<button onclick="window.pickupToggleCollected(\''+_rzEsc(p.id).replace(/'/g,"\\'")+'\')" style="width:100%;padding:14px;border-radius:9px;border:1px solid '+(collected?'#166534':'var(--border2)')+';background:'+(collected?'var(--ok-bg)':'transparent')+';color:'+(collected?'var(--ok-text)':'var(--text2)')+';font-size:15px;font-weight:800;cursor:pointer">'+(collected?(p.dropoff?'✓ Dropped off':'✓ Collected'):(p.dropoff?'Mark dropped off':'Mark collected'))+'</button>'+
        (!p.dropoff?'<button onclick="window.pickupMarkNoShow(\''+_rzEsc(String(p.order)).replace(/\'/g,"\\'")+'\')" style="width:100%;margin-top:8px;padding:11px;border-radius:9px;border:1px solid rgba(239,68,68,.5);background:transparent;color:#ef4444;font-size:13px;font-weight:800;cursor:pointer">⚠ No-show</button>':'')+
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
  return '<div class="pax-bubble" draggable="true" ondragstart="window.rezdyManDragStart(\''+idEsc+'\',event)" ondragover="event.preventDefault()" ondrop="window.rezdyManDropInfant(\''+idEsc+'\',event)" onclick="window.rezdyManToggleChild(\''+idEsc+'\')" title="'+_rzEsc(p.name||'')+(infName?' (+ infant '+_rzEsc(infName)+')':'')+'" style="position:relative;overflow:hidden;background:rgba(255,255,255,.93);border-radius:8px;'+(p.paymentReq?'border:2px solid #ef4444':'border-left:4px solid '+gcol)+';min-width:62px;flex-shrink:0;cursor:grab">'+
    (p.paymentReq?'<div style="background:#ef4444;color:#fff;font-size:8px;font-weight:900;text-align:center;line-height:1.7">$ TO PAY</div>':'')+
    (isChild?'<div title="Child" style="position:absolute;bottom:3px;right:3px;font-size:10px;font-weight:900;background:#f97316;color:#fff;border-radius:3px;padding:0 4px;line-height:1.5;box-shadow:0 1px 2px rgba(0,0,0,.3)">C</div>':'')+
    (infName?'<div'+infRemove+'position:absolute;bottom:3px;'+(isChild?'left:3px':'right:3px')+';font-size:10px;font-weight:900;background:#ec4899;color:#fff;border-radius:3px;padding:0 4px;line-height:1.5;box-shadow:0 1px 2px rgba(0,0,0,.3)">i</div>':'')+
    '<div style="padding:'+(p.paymentReq?'2px 7px 4px':'4px 7px')+'">'+
      '<div style="font-size:11px;font-weight:700;color:#1e293b;white-space:nowrap;max-width:96px;overflow:hidden;text-overflow:ellipsis">'+nm+'</div>'+
      '<div onclick="event.stopPropagation();window.rezdyManEditWeight(\''+idEsc+'\')" title="'+(decld?'Declared weight — tap to enter actual':'Tap to enter / edit actual weight')+'" style="font-size:10px;font-weight:700;color:'+wCol+';cursor:pointer">'+w+'</div>'+
    '</div>'+
    '<div onclick="event.stopPropagation();window.rezdyManRemove(\''+idEsc+'\')" title="'+(p.ac?'Send to the unallocated pool':'Remove from manifest')+'" style="position:absolute;top:0;right:1px;font-size:10px;color:#94a3b8;cursor:pointer;padding:0 2px">✕</div>'+
  '</div>';
}
// The pilot allocated on the CALENDAR for this aircraft at this departure's time — used to
// auto-fill the seatmap PIC. Booking-derived blocks key on "ac|HH:MM|product"; manual schedule
// blocks key on the block id (matched by aircraft + start time). null if none allocated.
function _rzSchedPilotFor(acId,dep){
  if(!acId||acId==='__unalloc__')return null;
  var sp=S._schedPilots||{};
  var t=String(dep||'').split('·')[0].split('+')[0]; // first-leg time token, e.g. "0930"
  var tc=_rzHHMMcolon(t);                              // "09:30" to match the calendar group key
  var prefix=acId+'|'+tc+'|',found=null,conf=S._schedPilotConflict||{};   // skip a clashing (double-booked) pin
  Object.keys(sp).forEach(function(k){if(!found&&k.indexOf(prefix)===0&&sp[k]&&!conf[k])found=sp[k];});
  if(!found)(S._schedBlocks||[]).forEach(function(b){if(!found&&b&&b.aircraft===acId&&String(b.start)===tc&&sp[String(b.id)]&&!conf[String(b.id)])found=sp[String(b.id)];});
  if(!found&&typeof _schedAutoPilotFor==='function')found=_schedAutoPilotFor(acId,tc);   // auto allocation fallback (by ac + time)
  return found;
}
// Co-pilot for an aircraft+departure (set from the calendar). Mirrors _rzSchedPilotFor but reads
// S._schedCoPilots — and has NO auto fallback (co-pilots are never auto-allocated, only user-set).
function _rzSchedCoPilotFor(acId,dep){
  if(!acId||acId==='__unalloc__')return null;
  var sp=S._schedCoPilots||{};
  var t=String(dep||'').split('·')[0].split('+')[0];
  var tc=_rzHHMMcolon(t);
  var prefix=acId+'|'+tc+'|',found=null;
  Object.keys(sp).forEach(function(k){if(!found&&k.indexOf(prefix)===0&&sp[k])found=sp[k];});
  if(!found)(S._schedBlocks||[]).forEach(function(b){if(!found&&b&&b.aircraft===acId&&String(b.start)===tc&&sp[String(b.id)])found=sp[String(b.id)];});
  return found;
}
function _rzRenderManifest(){
  if(!S._rzManLoaded){if(window.rezdyLoadManifest)window.rezdyLoadManifest();return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading manifest…</div>';}
  // The calendar's pilot allocations live in the pickup blob — load it once so the seatmap can
  // auto-fill PIC from the calendar even if the Calendar/Pickups tab hasn't been opened.
  if(!S._rzManPickupSynced){S._rzManPickupSynced=true;if(window.rezdyLoadPickups)window.rezdyLoadPickups();}
  var pax=S._rzManPax||[];
  var deps=_rzManDeps();
  var _openDeps=_rzManOpenDepsList(deps);                 // departures with an OPEN seatmap tab
  var _closedDeps=deps.filter(function(d){return _openDeps.indexOf(d)<0;}); // closed (reopen chips)
  var selDep=(S._rzManDepFilter&&_openDeps.indexOf(S._rzManDepFilter)>=0)?S._rzManDepFilter:(_rzDefaultDep(_openDeps)||'—');
  var pool=pax.filter(function(p){return !p.ac&&!p.infantOf&&_rzPaxDep(p)===selDep;});
  var hidden=S._rzManHidden||[];
  var fleetAll=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(id){return S.aircraft&&S.aircraft[id];});
  pax.forEach(function(p){if(p.ac&&fleetAll.indexOf(p.ac)<0)fleetAll.push(p.ac);});
  var fleet=fleetAll.filter(function(id){return hidden.indexOf(id)<0;});
  var h='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:0">Seatmap</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+_rzDowLabel(S.rezdyDate)+' · '+pax.length+' pax · '+pool.length+' unallocated'+(selDep&&selDep!=='—'?' @ '+_rzEsc(selDep):'')+'</p></div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
      '<button class="btn btn-ghost" style="font-size:12px'+((S._rzManUndo&&S._rzManUndo.length)?'':';opacity:.4')+'" '+((S._rzManUndo&&S._rzManUndo.length)?'':'disabled ')+'onclick="window.rezdyManUndo()" title="Undo the last seating change (up to 10)">↶ Undo</button>'+
      '<button class="btn btn-ghost" style="font-size:12px" onclick="window.rezdyManAdd()">+ Add passenger</button>'+
      (_rzManBaseDeps().length>1?'<button class="btn btn-ghost" style="font-size:12px'+(S._rzManCombineOpen?';border-color:var(--accent);color:var(--accent)':'')+'" onclick="window.rezdyManCombineToggle()">🔗 Combine departures</button>':'')+
      (pool.length?'<button class="btn btn-primary" style="font-size:12px;padding:7px 12px" onclick="window.rezdyManAllocate()">✈ Allocate to aircraft</button>':'')+
      (pax.some(function(p){return p.ac;})?'<button class="btn btn-ghost" style="font-size:12px;color:#f59e0b;border-color:rgba(245,158,11,.4)" onclick="window.rezdyManUnallocateAll()" title="Send everyone back to the unallocated pool">↺ Unallocate all</button>':'')+
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
  // Per-departure seatmap tabs (like loadsheet tabs): each pushed departure has its OWN tab, with a ✕
  // to close it when done. Drag one tab onto another to COMBINE them. Departures that still have pax but
  // were closed show as faint ＋ "reopen" chips.
  if(deps.length){
    h+='<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px;-webkit-overflow-scrolling:touch;scrollbar-width:none;align-items:center">';
    _openDeps.forEach(function(d){
      var cnt=pax.filter(function(p){return !p.infantOf&&_rzPaxDep(p)===d;}).length;
      var dE=_rzEsc(d).replace(/'/g,"\\'");var _isComb=String(d).indexOf('+')>=0;
      h+='<span draggable="true" ondragstart="window.rezdyManDepDragStart(\''+dE+'\',event)" ondragover="event.preventDefault()" ondrop="window.rezdyManDepDrop(\''+dE+'\',event)" title="Drag onto another departure to combine" class="sub-tab '+(selDep===d?'on':'')+'" style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;cursor:grab">'+
        '<span onclick="S._rzManDepFilter=\''+dE+'\';render()" style="cursor:pointer">🛫 '+_rzManDepLabel(d)+' <span style="opacity:.6">('+cnt+')</span></span>'+
        (_isComb?'<span onclick="event.stopPropagation();window.rezdyManSplitDep(\''+dE+'\')" title="Split this combined departure back apart" style="cursor:pointer;opacity:.7;font-weight:800">⤬</span>':'')+
        '<span onclick="event.stopPropagation();window.rezdyManCloseDep(\''+dE+'\')" title="Close this departure’s seatmap" style="cursor:pointer;opacity:.55;font-weight:800;margin-left:1px">✕</span>'+
      '</span>';
    });
    _closedDeps.forEach(function(d){
      var cnt=pax.filter(function(p){return !p.infantOf&&_rzPaxDep(p)===d;}).length;
      var dE=_rzEsc(d).replace(/'/g,"\\'");
      h+='<button onclick="window.rezdyManReopenDep(\''+dE+'\')" title="Reopen this departure’s seatmap" class="sub-tab" style="white-space:nowrap;flex-shrink:0;opacity:.5;border-style:dashed">＋ '+_rzManDepLabel(d)+' <span style="opacity:.6">('+cnt+')</span></button>';
    });
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
    // Auto-fill PIC from the calendar's pilot for this aircraft+departure. One-time per
    // (departure, aircraft); only fills when empty or when the value is still our own auto-fill,
    // so a manual change/clear always wins (the user can override by drag / select / clear ✕).
    (function(){
      S._rzManPicSeed=S._rzManPicSeed||{};S._rzManPicAuto=S._rzManPicAuto||{};
      var _sk=selDep+'|'+id;if(S._rzManPicSeed[_sk])return;S._rzManPicSeed[_sk]=1;
      var _sp=_rzSchedPilotFor(id,selDep);if(!_sp)return;
      var _cur=(S._rzManPic||{})[id];
      if((!_cur||_cur===S._rzManPicAuto[id])&&_cur!==_sp){S._rzManPic=S._rzManPic||{};S._rzManPic[id]=_sp;S._rzManPicAuto[id]=_sp;}
    })();
    // Same one-time auto-fill for the CO-PILOT from the calendar (seat 1). Manual change/clear wins.
    (function(){
      S._rzManCoSeed=S._rzManCoSeed||{};S._rzManCoAuto=S._rzManCoAuto||{};
      var _sk=selDep+'|'+id;if(S._rzManCoSeed[_sk])return;S._rzManCoSeed[_sk]=1;
      var _sc=(typeof _rzSchedCoPilotFor==='function')?_rzSchedCoPilotFor(id,selDep):null;if(!_sc)return;
      var _cur=(S._rzManCoPic||{})[id];
      if((!_cur||_cur===S._rzManCoAuto[id])&&_cur!==_sc){S._rzManCoPic=S._rzManCoPic||{};S._rzManCoPic[id]=_sc;S._rzManCoAuto[id]=_sc;if(typeof _rzManReseatDepForAc==='function')_rzManReseatDepForAc(id);}
    })();
    var picCode=(S._rzManPic||{})[id]||'';
    var unit=(a&&a.layout==='ga8')?'L':'lbs';
    var std=a?Math.round(fromKg(_rzManDefFuelKg(selDep,id),id)):0;
    var fuelVal=(S._rzManFuel&&S._rzManFuel[id]!=null&&S._rzManFuel[id]!=='')?S._rzManFuel[id]:std;
    var idE=id.replace(/'/g,"\\'");
    // Collapsible. CLOSED by default — aircraft only open when you push/allocate to them (or click the
    // header). A manual toggle (keyed by departure+aircraft) overrides. Allocation sets the open flag.
    var _ckey=selDep+'|'+id;var _ov=(S._rzManCardOpen||{})[_ckey];
    var open=(_ov!=null)?_ov:false;
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
        (list.length?'<button onclick="event.stopPropagation();window.rezdyManTidySeats(\''+idE+'\')" title="Re-seat keeping booking groups together (best CoG within limits)" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0 2px">⇄</button>':'')+
        '<button onclick="window.rezdyManDeleteAc(\''+idE+'\')" title="Remove this aircraft (returns its pax to the pool)" style="background:none;border:none;color:#ef444488;cursor:pointer;font-size:13px;padding:0 2px">🗑</button></div></div>';
    if(open){
    // PIC slot (drop a pilot here)
    h+='<div ondragover="event.preventDefault();event.stopPropagation();this.style.outline=\'2px solid #60a5fa\'" ondragleave="this.style.outline=\'\'" ondrop="event.stopPropagation();this.style.outline=\'\';window.rezdyManDropPicSeat(\''+idE+'\',event)" style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:5px 8px;border-radius:7px;border:1px dashed '+(picCode?'#60a5fa':'var(--border2)')+';background:'+(picCode?'rgba(96,165,250,.1)':'transparent')+'">'+
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
// Snapshot/restore the full manifest state — for the seatmap undo stack (10 deep).
function _rzManSnapshot(){try{return JSON.parse(JSON.stringify({pax:S._rzManPax||[],pic:S._rzManPic||{},coPic:S._rzManCoPic||{},fuel:S._rzManFuel||{},hidden:S._rzManHidden||[],seats:S._rzManSeats||{},cargo:S._rzManCargo||{},depMerge:S._rzManDepMerge||{}}));}catch(e){return null;}}
function _rzManApplySnap(s){if(!s)return;S._rzManPax=s.pax||[];S._rzManPic=s.pic||{};S._rzManCoPic=s.coPic||{};S._rzManFuel=s.fuel||{};S._rzManHidden=s.hidden||[];S._rzManSeats=s.seats||{};S._rzManCargo=s.cargo||{};S._rzManDepMerge=s.depMerge||{};}
function _rzManSetUndoBase(){S._rzManLast=_rzManSnapshot();} // call after load / realtime apply (not undoable)
function _rzManSave(noUndo){
  // Record the prior state for undo (cap 10), unless this save IS an undo/restore.
  if(!noUndo&&S._rzManLast){S._rzManUndo=S._rzManUndo||[];S._rzManUndo.push(S._rzManLast);if(S._rzManUndo.length>10)S._rzManUndo.shift();}
  S._rzManLast=_rzManSnapshot();
  var ds=S.rezdyDate;
  var payload={pax:S._rzManPax||[],pic:S._rzManPic||{},coPic:S._rzManCoPic||{},fuel:S._rzManFuel||{},hidden:S._rzManHidden||[],seats:S._rzManSeats||{},cargo:S._rzManCargo||{},depMerge:S._rzManDepMerge||{}};
  if(typeof sbMergeSave==='function')sbMergeSave('rz_manifest_'+ds,payload,function(m){
    if(S.rezdyDate!==ds)return; // date changed mid-save — don't write the old day onto the new one
    S._rzManPax=m.pax||[];S._rzManPic=m.pic||{};S._rzManCoPic=m.coPic||{};S._rzManFuel=m.fuel||{};S._rzManHidden=m.hidden||[];S._rzManSeats=m.seats||{};S._rzManCargo=m.cargo||{};S._rzManDepMerge=m.depMerge||{};
    S._rzManLast=_rzManSnapshot(); // keep the undo baseline in step with the merged result
  });
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
// A2: broadcast that this date's pickup list (check-ins / van allocation / drivers) changed, so
// other devices re-pull it. Mirrors _rzManBroadcast; echo-guarded by sessionId + date on receipt.
function _rzPickupBroadcast(){
  try{
    if(typeof _rtWs==='undefined'||!_rtWs||_rtWs.readyState!==1)return;
    if(typeof _rtRef!=='undefined')_rtRef++;
    _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'pickup_update',payload:{date:S.rezdyDate,sessionId:(typeof _sessionId!=='undefined'?_sessionId:'')}},ref:String(typeof _rtRef!=='undefined'?_rtRef:1)}));
  }catch(e){}
}
// Reload the manifest for the current date from the cloud (used by the live-update receiver).
window.rezdyReloadManifestLive=function(){
  if(!S.rezdyDate)return;
  // Don't clobber an in-progress seatmap/manifest edit (focused weight/PIC/fuel input, open select).
  // Reconciles on the next blur-time broadcast / tab revisit. Mirrors the loadsheet ls_update guard.
  var _ae=document.activeElement;if(_ae&&/^(INPUT|SELECT|TEXTAREA)$/.test(_ae.tagName||''))return;
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
      if(typeof _sbSetBase==='function')_sbSetBase('rz_manifest_'+S.rezdyDate,{pax:S._rzManPax,pic:S._rzManPic,coPic:S._rzManCoPic,fuel:S._rzManFuel,hidden:S._rzManHidden,seats:S._rzManSeats,cargo:S._rzManCargo,depMerge:S._rzManDepMerge});
      if(typeof _rzManSetUndoBase==='function')_rzManSetUndoBase(); // keep undo baseline in step with a remote update
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
    // Capture the as-loaded baseline so the first save merges (doesn't clobber a concurrent edit).
    if(typeof _sbSetBase==='function')_sbSetBase('rz_manifest_'+S.rezdyDate,{pax:S._rzManPax,pic:S._rzManPic,coPic:S._rzManCoPic,fuel:S._rzManFuel,hidden:S._rzManHidden,seats:S._rzManSeats,cargo:S._rzManCargo,depMerge:S._rzManDepMerge});
    _rzManLoadOpenDeps(); // restore this device's open/closed departure tabs for the day
    if(typeof _rzManSetUndoBase==='function'){_rzManSetUndoBase();S._rzManUndo=[];} // fresh undo history for the day
  }catch(e){S._rzManPax=S._rzManPax||[];S._rzManPic=S._rzManPic||{};S._rzManFuel=S._rzManFuel||{};S._rzManHidden=S._rzManHidden||[];S._rzManSeats=S._rzManSeats||{};S._rzManCargo=S._rzManCargo||{};S._rzManDepMerge=S._rzManDepMerge||{};}
  S._rzManLoaded=true;render();
};
// The currently-selected Bookings departure (resolved the same way as _rzRenderBookings).
function _rzCurBookingsDep(){
  var deps=[];(S._rezdyBookings||[]).forEach(function(b){if(_rzIsCancelled(b))return;var d=_rzBookingDep(b);if(deps.indexOf(d)<0)deps.push(d);});
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
  window.rezdyManPull(dep); // opens the pushed departure's seatmap tab + focuses it
};
// Preview the seatmap with DECLARED weights — includes passengers not yet checked in. Jumps to the
// Seatmap so the layout + weight & balance can be eyeballed before check-in.
window.rezdyPreviewToManifest=async function(){
  if(!S._rezdyBookings){if(window.rezdyLoadBookings)window.rezdyLoadBookings();if(typeof toast==='function')toast('Loading bookings — tap Preview again in a moment.','info');return;}
  if(!S._rzManLoaded&&window.rezdyLoadManifest){try{await window.rezdyLoadManifest();}catch(_){}}
  var dep=_rzCurBookingsDep();
  if(!dep){if(typeof toast==='function')toast('No departure selected to preview.','info');return;}
  window.rezdyManPull(dep,true);
  // FRESH allocation for the previewed departure(s): clear any prior (possibly stale) aircraft/seat
  // assignment for these pax, then run the allocator so Preview always shows the current best layout
  // (groups together + within W&B) rather than a leftover seating. Seatmap deps are TIME·DEST, the
  // bookings dep is TIME — match on the time part.
  var _t=String(dep).split('·')[0];
  var smDeps=((typeof _rzManDeps==='function')?_rzManDeps():[]).filter(function(d){return String(d).split('·')[0]===_t;});
  if(smDeps.length){
    (S._rzManPax||[]).forEach(function(p){if(!p.infantOf&&smDeps.indexOf(_rzPaxDep(p))>=0)p.ac=null;});
    S._rzManSeats=S._rzManSeats||{};Object.keys(S._rzManSeats).forEach(function(k){if(smDeps.some(function(sd){return k.indexOf(sd)>=0;}))delete S._rzManSeats[k];});
    smDeps.forEach(function(sd){S._rzManDepFilter=sd;if(typeof window.rezdyManAllocate==='function')window.rezdyManAllocate();});
    S._rzManDepFilter=smDeps[0];
  } else {S._rzManDepFilter=dep;}
  if(typeof window.switchOpsTab==='function')window.switchOpsTab('rseatmap');
};
// Default passenger rows from a booking's Rezdy participants at DECLARED weights (used for the
// seatmap PREVIEW before anyone is checked in). Mirrors the fresh-capture rows in rezdyCheckinOpen.
function _rzDeclaredRows(b,order){
  var parts=[];(b.items||[]).forEach(function(it){(it.participants||[]).forEach(function(p){parts.push(p);});});
  var m=(S._rezdyPaxMeta||{})[order]||{};var types=m.types||{};var infantOf=m.infantOf||{};
  var bd=_rzBreakdown(b)||_rzEffBreakdown(b)||{a:0,c:0,i:0};
  var total=Math.max((bd.a||0)+(bd.c||0)+(bd.i||0),parts.length,1);
  var _def=(typeof _rzDefaultTypes==='function')?_rzDefaultTypes(b):{};
  var rows=[];
  for(var i=0;i<total;i++){var p=parts[i];var t=p?((infantOf[i]!=null)?'infant':(types[i]||_def[i]||_rzAgeType(p))):'adult';
    rows.push({name:p&&p.name?String(p.name).trim():'',type:(t==='infant'?'infant':t==='child'?'child':'adult'),attach:(infantOf[i]!=null&&infantOf[i]<total?infantOf[i]:null),declared:(p?_rzDeclared(p.weight):null),actual:null});}
  var firstNon=null;for(var k=0;k<rows.length;k++){if(rows[k].type!=='infant'){firstNon=k;break;}}
  rows.forEach(function(r){if(r.type==='infant'&&(r.attach==null||!rows[r.attach]||rows[r.attach].type==='infant'))r.attach=firstNon;});
  return rows;
}
// Pull pax into the Seatmap. With a departure scope, ONLY that departure's pax are (re)built; pax from
// other departures and manually-added pax are preserved. `preview` ALSO includes bookings that aren't
// checked in yet, using their declared weights (Rezdy +4kg) — a planning view before check-in.
window.rezdyManPull=function(depScope,preview){
  if(!S._rezdyBookings){if(window.rezdyLoadBookings)window.rezdyLoadBookings();toast('Loading bookings — tap Push again in a moment.','info');return;}
  var existing={};(S._rzManPax||[]).forEach(function(p){existing[p.id]=p;});
  var fresh=[];var notCheckedIn=0;
  var _splitMap=(typeof _rzComputeAutoSplits==='function')?_rzComputeAutoSplits(S.rezdyDate):{};   // oversized bookings that ride multiple tails
  (S._rezdyBookings||[]).forEach(function(b){
    if(_rzIsCancelled(b))return;
    if(depScope&&_rzBookingDep(b)!==depScope)return; // only the pushed departure
    var order=String(b.orderNumber||'');
    if(_rzIsNoShow(order))return; // no-shows are explicitly excluded from the seatmap push
    var ci=_rzCheckinPax(order);
    var isCheckedIn=!!((S._rzBookingCheckedIn||{})[order])&&!!ci;
    if(!isCheckedIn&&!preview)return;                     // normal push: checked-in only
    var rows=ci||_rzDeclaredRows(b,order);                // preview: captured rows if any, else declared from the booking
    if(!rows||!rows.length)return;
    if(!isCheckedIn)notCheckedIn++;
    var bal=parseFloat(b.balanceDue);var owing=isFinite(bal)&&bal>0;
    var acHint=_rzBookingAc(b,order);
    // Split booking: hand each seat-consuming pax the aircraft its portion is assigned to, in row order,
    // so "Allocate" (which groups the pool by acHint) seats them across the split tails. Infants (lap)
    // follow their host below.
    var _spl=_splitMap[order];var _rowAc=null;
    if(_spl&&_spl.length>1){
      _rowAc={};var _q=_spl.map(function(p){return {ac:p.ac,seats:(p.a||0)+(p.c||0)};});var _qi=0;
      rows.forEach(function(r,i){if(r.type==='infant')return;while(_qi<_q.length&&_q[_qi].seats<=0)_qi++;if(_qi<_q.length){_rowAc[i]=_q[_qi].ac;_q[_qi].seats--;}});
    }
    rows.forEach(function(r,i){
      var id=order+'|c'+i;var ex=existing[id];var isInf=r.type==='infant';
      var _ah=(_rowAc&&_rowAc[i]!=null)?_rowAc[i]:((_rowAc&&isInf&&r.attach!=null&&_rowAc[r.attach]!=null)?_rowAc[r.attach]:acHint);   // lap infant rides its host's tail
      // Weight = actual if captured, else the declared weight (Rezdy +4kg) flagged as declared.
      var hasA=!isInf&&r.actual!=null;var useDecl=!isInf&&!hasA&&r.declared!=null;
      var wv=isInf?'':(hasA?String(r.actual):(useDecl?String(r.declared):''));
      fresh.push({id:id,name:r.name||'',weight:wv,declared:(r.declared!=null?r.declared:null),declaredWeight:useDecl,type:isInf?'adult':(r.type==='child'?'child':'adult'),infantName:null,group:((typeof _rzTwGroup==='function')?_rzTwGroup(order):order),paymentReq:owing,ac:ex?ex.ac:null,acHint:_ah,infantOf:isInf?(r.attach!=null?order+'|c'+r.attach:undefined):(ex?ex.infantOf:undefined),_preview:!isCheckedIn});
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
  S._rzManPax=keep.concat(fresh);
  // Each pushed departure opens its own seatmap tab + focus the first one.
  var _pushedDeps={};fresh.forEach(function(p){if(!p.infantOf)_pushedDeps[_rzPaxDep(p)]=1;});
  var _pdk=Object.keys(_pushedDeps).sort(_rzDepCmp);
  _pdk.forEach(function(d){_rzManOpenDep(d);});if(_pdk.length)_rzManSaveOpenDeps();
  if(_pdk.length)S._rzManDepFilter=_pdk[0];
  _rzManSave();
  if(preview)toast('Preview: '+fresh.length+' pax at declared weights'+(notCheckedIn?' ('+notCheckedIn+' booking'+(notCheckedIn===1?'':'s')+' not checked in)':'')+(depScope&&depScope!=='—'?' · '+depScope:''),'ok');
  else toast(fresh.length+' checked-in pax pushed to seatmap'+(depScope&&depScope!=='—'?' · '+depScope:''),'ok');
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
  _rzManOpenDep(label);_rzManSaveOpenDeps(); // the combined departure stays open
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
  bases.forEach(function(base){_rzManReseatDep(base);_rzManOpenDep(base);}); // re-seat + reopen each on its own
  _rzManSaveOpenDeps();_rzManSave();render();
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
    if(freeIdx!=null){sm[freeIdx]=p.id;S._rzManSeats[key]=sm;_rzManOpenCard(dep,dest);} // open the card we just dropped into
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
  var p=(S._rzManPax||[]).find(function(x){return x.id===id;});if(!p)return;
  if(p.ac){
    // SEATED → send back to the unallocated pool (clear the seat + aircraft) so it can be re-seated.
    var dep=_rzPaxDep(p);var ok=_rzSeatKey(dep,p.ac);S._rzManSeats=S._rzManSeats||{};var osm=S._rzManSeats[ok]||{};
    Object.keys(osm).forEach(function(k){if(osm[k]===p.id)delete osm[k];});S._rzManSeats[ok]=osm;
    p.ac=null;(S._rzManPax||[]).forEach(function(x){if(x.infantOf===p.id)x.ac=null;});
  } else {
    // Already in the pool → remove from the manifest (its infants unfold back to the pool).
    (S._rzManPax||[]).forEach(function(x){if(x.infantOf===id){delete x.infantOf;x.type='adult';}});
    S._rzManPax=(S._rzManPax||[]).filter(function(x){return x.id!==id;});
  }
  _rzManSave();render();
};
// Undo the last seatmap change (up to 10 steps).
window.rezdyManUndo=function(){
  if(!(S._rzManUndo&&S._rzManUndo.length)){if(typeof toast==='function')toast('Nothing to undo','warn');return;}
  _rzManApplySnap(S._rzManUndo.pop());
  _rzManSetUndoBase();      // the restored state itself isn't an undoable step
  _rzManSave(true);         // persist without pushing a new undo entry
  if(typeof toast==='function')toast('Undone','ok');
  render();
};
// Reset the seating: send everyone back to the unallocated pool (clears all seat + aircraft
// allocations for the day). Keeps the passengers and their details; undoable.
window.rezdyManUnallocateAll=function(){
  if(typeof confirm==='function'&&!confirm('Send all passengers back to the unallocated pool for this day? (You can Undo.)'))return;
  (S._rzManPax||[]).forEach(function(p){p.ac=null;});
  S._rzManSeats={};
  _rzManSave();render();
};
window.rezdyManClear=function(){if(!confirm('Clear the whole manifest for this day?'))return;S._rzManPax=[];S._rzManSeats={};S._rzManPic={};S._rzManCoPic={};S._rzManFuel={};S._rzManCargo={};S._rzManHidden=[];S._rzManDepMerge={};_rzManSave();render();};
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
  var deps=_rzManDeps();var open=_rzManOpenDepsList(deps);var f=S._rzManDepFilter;
  if(f&&open.indexOf(f)>=0)return f;
  // A bookings push focuses by TIME only ("0800"); match it to the first OPEN time+dest departure.
  if(f){var t=String(f).split('·')[0];var hit=open.find(function(d){return d.split('·')[0]===t;});if(hit)return hit;}
  return open[0]||'—';
}
// Distinct departures present in the manifest, sorted.
function _rzManDeps(){
  var set={};(S._rzManPax||[]).forEach(function(p){if(!p.infantOf)set[_rzPaxDep(p)]=1;});
  return Object.keys(set).sort(_rzDepCmp);
}
// ── Per-departure seatmaps (like loadsheet tabs) ──────────────────────────────
// Each departure/flight time has its OWN seatmap that opens when you push to it, and can be CLOSED
// when you're done. S._rzManOpenDeps: null = every departure open (default); an array = only those
// keys are open (everything else is a closed "reopen" chip). Closing one removes it; reopening adds it.
function _rzManDepClosed(d){return Array.isArray(S._rzManOpenDeps)&&S._rzManOpenDeps.indexOf(d)<0;}
function _rzManOpenDepsList(deps){deps=deps||_rzManDeps();return Array.isArray(S._rzManOpenDeps)?deps.filter(function(d){return S._rzManOpenDeps.indexOf(d)>=0;}):deps.slice();}
function _rzManOpenDep(d){if(!d)return;if(Array.isArray(S._rzManOpenDeps)){if(S._rzManOpenDeps.indexOf(d)<0)S._rzManOpenDeps.push(d);}} // null = already all-open
function _rzManCloseDepInternal(d){if(!Array.isArray(S._rzManOpenDeps))S._rzManOpenDeps=_rzManDeps().slice();S._rzManOpenDeps=S._rzManOpenDeps.filter(function(x){return x!==d;});}
function _rzManOpenCard(dep,id){if(!dep||!id)return;S._rzManCardOpen=S._rzManCardOpen||{};S._rzManCardOpen[dep+'|'+id]=true;}
window.rezdyManCloseDep=function(d){_rzManCloseDepInternal(d);if(S._rzManDepFilter===d)S._rzManDepFilter=null;_rzManSaveOpenDeps();render();};
window.rezdyManReopenDep=function(d){_rzManOpenDep(d);S._rzManDepFilter=d;_rzManSaveOpenDeps();render();};
// The open-departure set is a per-device, per-day view preference (persisted in localStorage so a
// refresh keeps your open tabs, but NOT shared across devices via the manifest blob).
function _rzManSaveOpenDeps(){try{var k='ts_rzman_open_'+S.rezdyDate;if(Array.isArray(S._rzManOpenDeps))localStorage.setItem(k,JSON.stringify(S._rzManOpenDeps));else localStorage.removeItem(k);}catch(e){}}
function _rzManLoadOpenDeps(){try{var v=localStorage.getItem('ts_rzman_open_'+S.rezdyDate);S._rzManOpenDeps=v?JSON.parse(v):null;}catch(e){S._rzManOpenDeps=null;}}
window.rezdyManDepDragStart=function(d,e){S._rzManDepDrag=d;try{if(e&&e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',d);}}catch(_){}};
window.rezdyManDepDrop=function(target,e){if(e&&e.preventDefault)e.preventDefault();var src=S._rzManDepDrag;S._rzManDepDrag=null;if(!src||src===target)return;if(typeof window.rezdyManCombineDeps==='function')window.rezdyManCombineDeps(src,target);};
