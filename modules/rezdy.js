// === MODULE: rezdy === v1.0 ===
// Rezdy bookings + pickup van management + aircraft day-schedule.
// Self-contained. Entry point: renderRezdy(). All onclick handlers are window.*.
// State keys used on S: rezdyTab, rezdyDate, _rezdyBookings, _rezdyLoading,
//   _rezdyOpen (expanded booking rows, keyed by orderNumber),
//   _pickupVans, _pickupCollected, _pickupLoading, _schedBlocks, _schedLoading,
//   _schedEdit, _rezdyDragId.

// ── helpers ───────────────────────────────────────────────────────────────
function _rzToday(){return new Date().toISOString().slice(0,10);}
function _rzEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _rzAcCol(ac){return (typeof AC_COL!=='undefined'&&AC_COL[ac])||'#64748b';}
const _RZ_VANS=3, _RZ_VAN_SEATS=11;

// Departure/pickup time as a compact 24h string e.g. "0930" (from "...T09:30..." or "09:30:00").
function _rzDepTime(s){if(s==null||s==='')return '';s=String(s);var m=/[T ](\d{2}):(\d{2})/.exec(s)||/(\d{1,2}):(\d{2})/.exec(s);return m?String(m[1]).padStart(2,'0')+m[2]:_rzEsc(s);}
// Product display: abbreviate the long Milford "Fly Cruise Fly" product to FCF.
function _rzProduct(p){var s=String(p||'');return /milford.*fly.*cruise.*fly/i.test(s)?'FCF':_rzEsc(s);}
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

// ── default van allocation ──────────────────────────────────────────────────
// Order = list order (treated as furthest-first). Fill van 1 to capacity, then 2,
// then 3, keeping same-location pickups adjacent so a van does one stop per group.
function _rzAutoVans(pickups){
  pickups=(pickups||[]).filter(function(p){return !p.selfDrive;}); // self-drive never goes in a van
  // group consecutive-by-location: sort so identical locations cluster, stable.
  const byLoc={};
  pickups.forEach(function(p){(byLoc[p.location]=byLoc[p.location]||[]).push(p);});
  // preserve first-seen location order
  const seen=[],groups=[];
  pickups.forEach(function(p){if(seen.indexOf(p.location)<0){seen.push(p.location);groups.push(byLoc[p.location]);}});
  const vans=[];for(let i=0;i<_RZ_VANS;i++)vans.push([]);
  let vi=0;
  groups.forEach(function(g){
    const gPax=g.reduce(function(s,p){return s+p.pax;},0);
    const cur=vans[vi].reduce(function(s,id){const p=_rzPickupById(pickups,id);return s+(p?p.pax:0);},0);
    // move to next van if this group would overflow and we have vans left
    if(cur>0 && cur+gPax>_RZ_VAN_SEATS && vi<_RZ_VANS-1)vi++;
    g.forEach(function(p){vans[vi].push(p.id);});
    // if the current van is now full, advance
    const after=vans[vi].reduce(function(s,id){const p=_rzPickupById(pickups,id);return s+(p?p.pax:0);},0);
    if(after>=_RZ_VAN_SEATS && vi<_RZ_VANS-1)vi++;
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
  const valid=Array.isArray(vans)&&vans.length===_RZ_VANS&&vans.every(Array.isArray);
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
  const tabBar='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'+
    [{id:'bookings',lbl:'Bookings'},{id:'pickups',lbl:'Pickups'},{id:'schedule',lbl:'Schedule'}].map(function(t){
      return '<button class="sub-tab '+(sub===t.id?'on':'')+'" onclick="S.rezdyTab=\''+t.id+'\';render()">'+t.lbl+'</button>';
    }).join('')+'</div>';

  // shared date picker row
  const dateRow='<div class="card" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
    '<div style="font-weight:700;font-size:13px;color:var(--text2)">Date</div>'+
    '<input class="fi" type="date" style="max-width:180px" value="'+_rzEsc(S.rezdyDate)+'" onchange="window.rezdySetDate(this.value)">'+
    (sub==='bookings'?'<button class="btn btn-ghost" style="font-size:12px" onclick="window.rezdyRefresh()">⟳ Refresh from Rezdy</button>':'')+
    '</div>';

  if(sub==='pickups')return tabBar+dateRow+_rzRenderPickups();
  if(sub==='schedule')return tabBar+dateRow+_rzRenderSchedule();
  return tabBar+dateRow+_rzRenderBookings();
}

// ─────────────────────────────────────────────────────────────────────────────
//  (1) BOOKINGS
// ─────────────────────────────────────────────────────────────────────────────
function _rzRenderBookings(){
  if(S._rezdyLoading)return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading bookings…</div>';
  // Cancelled bookings sink to the bottom (least relevant); otherwise keep order.
  const rows=(S._rezdyBookings||[]).slice().sort(function(a,b){
    return (/cancel/i.test(a.status||'')?1:0)-(/cancel/i.test(b.status||'')?1:0);
  });
  const hdr='<div class="card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'+
    '<div><div class="st" style="margin-bottom:0">Rezdy Bookings</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+(rows.length?rows.length+' booking'+(rows.length===1?'':'s')+' for '+_rzEsc(S.rezdyDate):'No cached bookings')+'</p></div>'+
    '</div>';
  if(!rows.length){
    return hdr+'<div class="card" style="text-align:center;padding:36px;color:var(--text3);font-size:13px">No bookings cached for this date.<br>Tap <b>Refresh from Rezdy</b> to pull the latest.</div>';
  }
  if(!S._rezdyOpen||typeof S._rezdyOpen!=='object')S._rezdyOpen={};
  // Build one table; each booking can have multiple items → one row per item.
  // The Order cell carries a chevron toggle; an expanded full-width detail row
  // follows each booking when S._rezdyOpen[orderNumber] is set.
  const NCOL=11; // total columns (chevron+order, customer, pax, product, departs, pickup, phone, email, status, balance, comments)
  let body='';
  rows.forEach(function(b){
    const items=(b.items&&b.items.length)?b.items:[{}];
    const span=items.length;
    const stCol=/cancel/i.test(b.status||'')?'#ef4444':(/confirm/i.test(b.status||'')?'#86efac':'var(--text2)');
    const ono=b.orderNumber||'';
    const open=!!S._rezdyOpen[ono];
    const bal=parseFloat(b.balanceDue);
    const owing=isFinite(bal)&&bal>0;
    const chip=owing?'<span style="display:inline-block;margin-top:3px;padding:2px 7px;border-radius:10px;background:rgba(245,158,11,.18);border:1px solid rgba(245,158,11,.5);color:#f59e0b;font-size:10px;font-weight:800;white-space:nowrap">⚠ '+_rzEsc(_rzMoney(bal,b.currency))+'</span>':'';
    items.forEach(function(it,ii){
      body+='<tr style="border-top:1px solid var(--border)">';
      if(ii===0){
        body+='<td style="padding:8px 6px;font-weight:700;vertical-align:top;white-space:nowrap" rowspan="'+span+'">'+
          '<span onclick="window.rezdyToggleRow(\''+_rzEsc(ono).replace(/'/g,"\\'")+'\')" style="cursor:pointer;color:var(--text2);margin-right:5px;display:inline-block;transition:transform .12s;'+(open?'transform:rotate(90deg)':'')+'">▸</span>'+_rzEsc(ono)+'</td>';
        body+='<td style="padding:8px 6px;vertical-align:top" rowspan="'+span+'">'+_rzEsc(b.customerName)+(b.source?'<div style="font-size:10px;color:var(--text3)">'+_rzEsc(b.source)+'</div>':'')+'</td>';
      }
      body+='<td style="padding:8px 6px;text-align:center">'+(parseInt(it.quantity,10)||'')+'</td>';
      body+='<td style="padding:8px 6px">'+_rzProduct(it.product)+'</td>';
      body+='<td style="padding:8px 6px;white-space:nowrap;font-weight:700">'+_rzEsc(_rzDepTime(it.startTimeLocal))+'</td>';
      body+='<td style="padding:8px 6px">'+_rzEsc(it.pickup)+'</td>';
      if(ii===0){
        body+='<td style="padding:8px 6px;white-space:nowrap;vertical-align:top" rowspan="'+span+'">'+_rzEsc(b.phone)+'</td>';
        body+='<td style="padding:8px 6px;vertical-align:top;word-break:break-all" rowspan="'+span+'">'+_rzEsc(b.email)+'</td>';
        body+='<td style="padding:8px 6px;vertical-align:top;font-weight:700;color:'+stCol+'" rowspan="'+span+'">'+_rzEsc(b.status)+(chip?'<br>'+chip:'')+'</td>';
        body+='<td style="padding:8px 6px;vertical-align:top;white-space:nowrap;font-weight:700;color:'+(owing?'#f59e0b':'#4ade80')+'" rowspan="'+span+'">'+(owing?_rzEsc(_rzMoney(bal,b.currency)):'Paid')+'</td>';
        body+='<td style="padding:8px 6px;vertical-align:top;font-size:11px;color:var(--text3);max-width:200px" rowspan="'+span+'">'+_rzEsc(b.comments)+'</td>';
      }
      body+='</tr>';
    });
    if(open){
      body+='<tr><td colspan="'+NCOL+'" style="padding:0;border-top:1px solid var(--border)"><div style="background:var(--card2);padding:12px 14px">'+_rzBookingDetail(b)+'</div></td></tr>';
    }
  });
  const th='font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);text-align:left;padding:6px 6px;font-weight:700';
  const table='<div class="card" style="overflow-x:auto;padding:10px"><table style="width:100%;border-collapse:collapse;font-size:12.5px;color:var(--text)">'+
    '<thead><tr>'+
      '<th style="'+th+'">Order</th><th style="'+th+'">Customer</th><th style="'+th+';text-align:center">Pax</th>'+
      '<th style="'+th+'">Product</th><th style="'+th+'">Departs</th><th style="'+th+'">Pickup</th>'+
      '<th style="'+th+'">Phone</th><th style="'+th+'">Email</th><th style="'+th+'">Status</th><th style="'+th+'">Balance</th><th style="'+th+'">Comments</th>'+
    '</tr></thead><tbody>'+body+'</tbody></table></div>';
  return hdr+table;
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
  // Balance.
  const bal=parseFloat(b.balanceDue);
  const owing=isFinite(bal)&&bal>0;
  let balH='<div><div style="'+sec+'">Balance</div>';
  balH+='<div style="font-size:14px;font-weight:800;color:'+(owing?'#f59e0b':'#4ade80')+'">'+(owing?'⚠ '+_rzEsc(_rzMoney(bal,b.currency))+' owing':'Paid in full')+'</div>';
  balH+='<div style="font-size:11px;color:var(--text3);margin-top:2px">Total '+_rzEsc(_rzMoney(b.totalAmount,b.currency)||'—')+' · Paid '+_rzEsc(_rzMoney(b.totalPaid,b.currency)||'—')+'</div>';
  balH+='</div>';
  return '<div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start">'+
    '<div style="flex:1 1 300px;min-width:240px">'+paxH+exH+'</div>'+
    '<div style="flex:1 1 260px;min-width:220px">'+reqH+balH+'</div>'+
    '</div>';
}

// Toggle the expanded detail panel for a booking row.
window.rezdyToggleRow=function(orderNumber){
  if(!S._rezdyOpen||typeof S._rezdyOpen!=='object')S._rezdyOpen={};
  S._rezdyOpen[orderNumber]=!S._rezdyOpen[orderNumber];
  render();
};

window.rezdySetDate=function(v){
  S.rezdyDate=v||_rzToday();
  // clear date-scoped caches so each tab reloads for the new date
  S._rezdyBookings=null;S._rezdyOpen={};S._pickupVans=null;S._pickupCollected=null;S._schedBlocks=null;
  render();
  // auto-load cached rows for whichever tab is active
  if(S.rezdyTab==='schedule')window.rezdyLoadSchedule();
  else window.rezdyLoadBookings();
};

// Load cached bookings for the current date (no Rezdy call).
window.rezdyLoadBookings=async function(){
  S._rezdyLoading=true;safeRender();
  const rows=await sbF('ts_rezdy_bookings','&tour_date=eq.'+encodeURIComponent(S.rezdyDate));
  S._rezdyBookings=(rows||[]).map(_rzRow).filter(Boolean);
  S._pickupVans=null; // re-derive van layout from fresh bookings
  S._rezdyLoading=false;
  render();
  // pull saved pickup arrangement for this date (overrides auto layout if present)
  window.rezdyLoadPickups();
};

// Pull from Rezdy via Edge Function, then reload the cache.
window.rezdyRefresh=async function(){
  S._rezdyLoading=true;safeRender();
  const res=await callFn('rezdy-sync',{date:S.rezdyDate});
  if(!res||!res.ok){
    S._rezdyLoading=false;
    toast('Rezdy sync failed'+(res&&res.status?(' ('+res.status+')'):''),'err');
    render();
    return;
  }
  const n=(res.data&&(res.data.count!=null?res.data.count:(Array.isArray(res.data.bookings)?res.data.bookings.length:null)));
  toast('Synced '+(n!=null?n:'')+' booking'+(n===1?'':'s')+' from Rezdy','ok');
  await window.rezdyLoadBookings();
};

// ─────────────────────────────────────────────────────────────────────────────
//  (2) PICKUPS — van allocation
// ─────────────────────────────────────────────────────────────────────────────
function _rzRenderPickups(){
  if(S._pickupLoading)return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Loading pickups…</div>';
  if(!S._rezdyBookings)return '<div class="card" style="text-align:center;padding:30px;color:var(--text3);font-size:13px">No bookings loaded.<br><button class="btn btn-ghost" style="margin-top:12px;font-size:12px" onclick="window.rezdyLoadBookings()">Load bookings for '+_rzEsc(S.rezdyDate)+'</button></div>';

  const pickups=_rzEnsureVans();
  if(!pickups.length)return '<div class="card" style="text-align:center;padding:36px;color:var(--text3);font-size:13px">No pickups for this date.</div>';

  const selfDrive=pickups.filter(function(p){return p.selfDrive;});
  const vanPickups=pickups.filter(function(p){return !p.selfDrive;});

  // group van pickups by departure time for the summary
  const byTime={};
  vanPickups.forEach(function(p){(byTime[p.depart||'—']=byTime[p.depart||'—']||[]).push(p);});
  const times=Object.keys(byTime).sort();

  const hdr='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:0">Pickup Vans</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+vanPickups.length+' pickups · '+vanPickups.reduce(function(s,p){return s+p.pax;},0)+' pax · 3 × Hiace (11 seats)'+(selfDrive.length?' · '+selfDrive.length+' self-drive':'')+'</p></div>'+
    '<div style="display:flex;gap:6px;flex-shrink:0">'+
      '<button class="btn btn-ghost" style="font-size:12px" onclick="window.pickupAutoAllocate()">↺ Auto-allocate</button>'+
      '<button class="btn btn-ghost" style="font-size:12px;border-color:rgba(74,222,128,.5);color:#4ade80" onclick="window.pickupSave()">💾 Save</button>'+
    '</div></div>';

  // departure-time summary
  let timeBar='<div class="card" style="padding:10px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);font-weight:700;margin-bottom:6px">By Departure</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
  times.forEach(function(t){
    const grp=byTime[t];const pax=grp.reduce(function(s,p){return s+p.pax;},0);
    timeBar+='<span style="padding:3px 9px;border-radius:12px;background:var(--card2);border:1px solid var(--border2);font-size:11px;color:var(--text2)"><b>'+_rzEsc(t)+'</b> · '+grp.length+' pk / '+pax+' pax</span>';
  });
  timeBar+='</div></div>';

  // van cards/columns (stack vertically on narrow screens via flex-wrap + min-width)
  let vansH='<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start">';
  S._pickupVans.forEach(function(vanIds,vi){
    const pax=_rzVanPax(vanIds,pickups);
    const over=pax>_RZ_VAN_SEATS;
    const col=['#4a99d2','#48925f','#e3683e'][vi]||'#64748b';
    vansH+='<div ondragover="event.preventDefault();this.style.outline=\'2px solid '+col+'\'" ondragleave="this.style.outline=\'\'" ondrop="window.pickupDropOnVan('+vi+',event);this.style.outline=\'\'" '+
      'style="flex:1 1 260px;min-width:240px;background:var(--card);border:1px solid var(--border);border-top:3px solid '+col+';border-radius:10px;padding:12px">';
    vansH+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+
      '<div style="font-weight:800;font-size:14px;color:'+col+'">Van '+(vi+1)+'</div>'+
      '<span style="font-size:12px;font-weight:700;color:'+(over?'#ef4444':'var(--text2)')+'">'+pax+' / '+_RZ_VAN_SEATS+' pax'+(over?' ⚠':'')+'</span></div>';
    if(!vanIds.length){
      vansH+='<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px;border:1px dashed var(--border2);border-radius:8px">Drop pickups here</div>';
    }else{
      vanIds.forEach(function(id){
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

  // Self-drive: listed to the side, never put in a van.
  let sdH='';
  if(selfDrive.length){
    sdH='<div class="card" style="border-left:3px solid #a78bfa"><div style="font-weight:800;font-size:13px;color:#a78bfa;margin-bottom:8px">Self-drive — no van ('+selfDrive.length+')</div>'+
      '<div style="display:flex;flex-direction:column;gap:6px">';
    selfDrive.forEach(function(p){
      sdH+='<div style="background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:9px 11px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'+
        '<div><span style="font-weight:700;font-size:13px;color:var(--text)">'+_rzEsc(p.customer||p.order)+'</span>'+
          (p.depart?'<span style="font-size:11px;color:var(--text3);margin-left:8px">🛫 Dep '+_rzEsc(p.depart)+'</span>':'')+'</div>'+
        '<span style="font-size:11px;font-weight:700;color:#a78bfa">'+p.pax+' pax</span>'+
      '</div>';
    });
    sdH+='</div></div>';
  }
  return hdr+timeBar+vansH+sdH;
}

// Editable pickup-location dropdown for a pickup card (options = distinct locations seen).
function _rzLocSelect(id,current){
  var locs=_rzAllLocations();
  if(current&&locs.indexOf(current)<0)locs.unshift(current);
  var opts=locs.map(function(l){return '<option value="'+_rzEsc(l)+'"'+(l===current?' selected':'')+'>'+_rzEsc(l)+'</option>';}).join('');
  return '<select onclick="event.stopPropagation()" onchange="window.pickupSetLocation(\''+_rzEsc(id).replace(/'/g,"\\'")+'\',this.value)" '+
    'style="flex:1;min-width:0;font-size:12px;padding:3px 4px;background:var(--card);color:var(--text2);border:1px solid var(--border2);border-radius:6px;cursor:pointer">'+opts+'</select>';
}

// Override a pickup's location (persists with the pickup list).
window.pickupSetLocation=function(id,val){
  S._pickupLocOverride=S._pickupLocOverride||{};
  S._pickupLocOverride[id]=val;
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
  }else{
    S._pickupVans=null;S._pickupCollected={};S._pickupLocOverride={};
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
  let id=S._rezdyDragId;
  try{if(!id&&e.dataTransfer)id=e.dataTransfer.getData('text/plain');}catch(_){}
  if(!id||!Array.isArray(S._pickupVans))return;
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
    data:{vans:S._pickupVans||[],collected:S._pickupCollected||{},locOverride:S._pickupLocOverride||{}}
  };
  const r=await sbU('ts_pickup_lists',[payload]);
  if(!silent)toast(r?'Pickup list saved ✓':'Save failed',r?'ok':'err');
};

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
    return '<div class="card" style="text-align:center;padding:30px;color:var(--text3);font-size:13px">No schedule loaded.<br><button class="btn btn-ghost" style="margin-top:12px;font-size:12px" onclick="window.rezdyLoadSchedule()">Load schedule for '+_rzEsc(S.rezdyDate)+'</button></div>';
  }
  const blocks=S._schedBlocks||[];
  const hdr='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:0">Aircraft Schedule</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+_rzEsc(S.rezdyDate)+' · '+blocks.length+' block'+(blocks.length===1?'':'s')+'</p></div>'+
    '<button class="btn btn-ghost" style="font-size:12px" onclick="window.schedNewBlock()">+ Add block</button></div>';

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
    // blocks for this aircraft
    let blocksH='';
    blocks.filter(function(b){return b.aircraft===ac;}).forEach(function(b){
      const col=b.color||acCol;
      const top=_rzSchTop(b.start);const ht=Math.max(_RZ_PX_PER_SLOT,_rzSchHeight(b.start,b.end));
      const compact=ht<30;
      blocksH+='<div onclick="window.schedEditBlock(\''+_rzEsc(b.id).replace(/'/g,"\\'")+'\')" '+
        'style="position:absolute;left:3px;right:3px;top:'+top+'px;height:'+ht+'px;background:'+col+'26;border:1px solid '+col+';border-left:3px solid '+col+';border-radius:6px;padding:'+(compact?'1px 5px':'3px 6px')+';cursor:pointer;overflow:hidden;box-sizing:border-box;line-height:1.25">'+
        '<div style="font-weight:700;font-size:11px;color:'+col+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_rzEsc(b.label||b.aircraft)+'</div>'+
        (compact?'':'<div style="font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_rzEsc(b.start)+'–'+_rzEsc(b.end)+(b.notes?(' · '+_rzEsc(b.notes)):'')+'</div>')+
        '</div>';
    });
    colsH+='<div style="width:'+_RZ_COL_W+'px;flex-shrink:0;border-right:1px solid var(--border)">'+
      '<div style="position:relative;height:'+gridH+'px">'+rows+blocksH+'</div></div>';
  });

  // sticky aircraft-id header row, aligned with columns
  let headH='<div style="display:flex;position:sticky;top:0;z-index:2;background:var(--card)">'+
    '<div style="width:'+_RZ_AXIS_W+'px;flex-shrink:0;border-right:1px solid var(--border);border-bottom:1px solid var(--border)"></div>';
  acIds.forEach(function(ac){
    const acCol=_rzAcCol(ac);
    headH+='<div style="width:'+_RZ_COL_W+'px;flex-shrink:0;border-right:1px solid var(--border);border-bottom:2px solid '+acCol+';padding:6px 8px;text-align:center;font-weight:800;font-size:12px;color:'+acCol+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_rzEsc(ac)+'</div>';
  });
  headH+='</div>';

  const grid='<div class="card" style="padding:0;overflow-x:auto"><div style="display:inline-block;min-width:100%">'+
    headH+
    '<div style="display:flex">'+axis+colsH+'</div>'+
    '</div></div>';
  return hdr+formH+grid;
}

window.rezdyLoadSchedule=async function(){
  S._schedLoading=true;safeRender();
  const rows=await sbF('ts_schedule','&block_date=eq.'+encodeURIComponent(S.rezdyDate));
  S._schedBlocks=(rows||[]).map(function(r){const d=_rzRow(r);d.id=r.id||d.id;return d;}).filter(function(b){return b&&b.start;});
  S._schedLoading=false;
  render();
};

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
  if(field==='aircraft'||field==='color')render();
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
};
window.schedDeleteBlock=async function(){
  const ed=S._schedEdit;if(!ed||!ed.id)return;
  if(!confirm('Delete this schedule block?'))return;
  const ok=await sbDel('ts_schedule',ed.id);
  S._schedEdit=null;
  if(ok){toast('Block deleted','ok');await window.rezdyLoadSchedule();}
  else{toast('Delete failed','err');render();}
};
