// === MODULE: platform === v1.0 ===
// ─────────────────────────────────────────────────────────────────────────────
// Bespoke booking platform — Phase 0: NATIVE bookings store (coexists with Rezdy).
//
// Bookings created in-house (direct web / agent / walk-in / phone) live in the
// Supabase table `ts_native_bookings`, in the SAME canonical shape as
// `ts_rezdy_bookings.data`. So the whole app (calendar, seatmap, loadsheet,
// transport, check-in) reads them through the existing _rzMapBookings/_rzRow path
// with ZERO rendering changes. rezdyLoadBookings() merges these on top of the
// Rezdy-synced rows (native wins on an order-number clash).
//
// Everything here fails soft: if `ts_native_bookings` doesn't exist yet, the
// loaders return empty and the existing Rezdy flow is completely unaffected.
// Apply native_bookings.sql in Supabase to switch it on. See PLATFORM_ROADMAP.md.
// ─────────────────────────────────────────────────────────────────────────────

// Load native bookings for a date → mapped to the canonical booking shape (tagged _native).
// Empty on ANY error (table missing / offline) so it can never break the Rezdy load path.
window.platformLoadBookings=async function(date){
  date=date||S.rezdyDate;
  try{
    var rows=await sbF('ts_native_bookings','&tour_date=eq.'+encodeURIComponent(date),'updated_at');
    if(!rows||!rows.length)return [];
    var list=(typeof _rzMapBookings==='function')?_rzMapBookings(rows,date):rows.map(function(r){return (r&&r.data)?r.data:r;});
    (list||[]).forEach(function(b){if(b&&b._native===undefined)b._native=true;});   // tag so the UI can badge / route natives
    return list||[];
  }catch(e){return [];}
};

// Merge native bookings on top of a Rezdy-derived list. Dedup by order number; native wins.
window._rzMergeNativeBookings=function(rezdyList,nativeList){
  if(!nativeList||!nativeList.length)return rezdyList||[];
  var byId={};
  (rezdyList||[]).forEach(function(x){byId[String((x&&(x.orderNumber||x.id))||'')]=x;});
  (nativeList||[]).forEach(function(x){byId[String((x&&(x.orderNumber||x.id))||'')]=x;});   // native overrides
  return Object.keys(byId).map(function(k){return byId[k];});
};

// Persist a native booking (canonical shape) — one row per (order, tour date).
window.platformSaveBooking=async function(booking){
  if(!booking)return null;
  var order=String(booking.orderNumber||booking.id||'');
  var td=String(booking._tourDate||booking.tourDate||S.rezdyDate||'');
  if(!order||!td)return null;
  booking.orderNumber=order;booking._tourDate=td;booking._native=true;
  var row={id:order+'__'+td,order_number:order,tour_date:td,source:booking.source||'native',status:booking.status||'CONFIRMED',data:booking,created_by:(S.user&&S.user.id)||null,updated_at:new Date().toISOString()};
  try{return await sbU('ts_native_bookings',[row]);}catch(e){return null;}
};

// Remove a native booking (by order + tour date).
window.platformDeleteBooking=async function(order,td){
  order=String(order||'');td=String(td||S.rezdyDate||'');
  if(!order||!td)return false;
  try{return await sbDel('ts_native_bookings',order+'__'+td);}catch(e){return false;}
};

// A fresh in-house order number — clearly non-Rezdy ("TS-…"), unique. Phase 1 moves numbering
// server-side (a real sequence); the timestamp base keeps it collision-free until then.
window.platformNewOrderNo=function(){return 'TS-'+Date.now().toString(36).toUpperCase().slice(-7);};
