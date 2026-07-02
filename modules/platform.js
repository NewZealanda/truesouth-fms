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

// Live-refresh native bookings into the loaded list (realtime tick / reconnect). Re-pulls the current
// date's native bookings and re-merges over the existing Rezdy + manual rows — WITHOUT hitting Rezdy —
// so a create/edit/delete on another device shows up. safeRender defers if a modal/input is active.
window.platformReloadBookingsLive=async function(){
  if(!Array.isArray(S._rezdyBookings))return;   // bookings not loaded yet — nothing to merge into
  try{
    var nat=await platformLoadBookings(S.rezdyDate);
    var base=(S._rezdyBookings||[]).filter(function(b){return !(b&&b._native);});   // keep Rezdy + manual rows
    S._rezdyBookings=(typeof _rzMergeNativeBookings==='function')?_rzMergeNativeBookings(base,nat):base.concat(nat||[]);
    if(typeof _rzApplyManualBk==='function')_rzApplyManualBk();   // keep manual bookings merged (idempotent)
    S._schedBlocks=null;                                          // calendar blocks re-derive
    if(typeof safeRender==='function')safeRender();
  }catch(e){}
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CATALOG — Phase 1 foundations. `ts_products` gives products, prices and
// standard departure times a durable, editable home (Settings ▸ Operations ▸
// Products). The public booking page (book.html) reads ACTIVE rows with the anon
// key; the operational fuel/burn config stays in _RZ_PROD_CFG + the Fuels table.
// Everything fails soft until products.sql is applied.
// ─────────────────────────────────────────────────────────────────────────────

// Load the catalog → S._products (flat DB rows). Cache-first for fast paint.
window.platformLoadProducts=async function(force){
  if(S._productsLoading)return S._products||[];
  if(!force&&Array.isArray(S._products)&&S._productsLoaded)return S._products;
  if(!Array.isArray(S._products)){try{var cch=lsGet('ts_products_cache');if(Array.isArray(cch))S._products=cch;}catch(e){}}
  S._productsLoading=true;
  try{
    var rows=await sbF('ts_products','','updated_at');
    if(Array.isArray(rows)){S._products=rows;S._productsLoaded=true;try{lsSet('ts_products_cache',rows);}catch(e){}}
  }catch(e){}
  S._productsLoading=false;
  return S._products||[];
};
// Catalog sorted for display (sort asc, then code).
window.platformProducts=function(){
  return (S._products||[]).slice().sort(function(a,b){return ((+a.sort||100)-(+b.sort||100))||String(a.id).localeCompare(String(b.id));});
};
window.platformProduct=function(code){code=String(code||'').toUpperCase();return (S._products||[]).find(function(p){return String(p.id).toUpperCase()===code;})||null;};
// SEASONAL price resolution: the price for a product on a given FLIGHT date.
// If next_from is set and the tour date is on/after it, the next-season price
// set applies (null price in the active set = POA). ISO string compare is safe.
window.platformPriceFor=function(p,date){
  if(!p)return {adult:null,child:null,infant:0,next:false};
  var nx=!!(p.next_from&&date&&String(date)>=String(p.next_from).slice(0,10));
  return nx?{adult:p.next_price_adult,child:p.next_price_child,infant:(p.next_price_infant!=null?p.next_price_infant:0),next:true}
           :{adult:p.price_adult,child:p.price_child,infant:(p.price_infant!=null?p.price_infant:0),next:false};
};
// Upsert one product row (id = product code).
window.platformSaveProduct=async function(p){
  if(!p||!p.id)return null;
  p.updated_by=(S.user&&S.user.id)||null;p.updated_at=new Date().toISOString();
  try{lsSet('ts_products_cache',S._products||[]);}catch(e){}
  try{return await sbU('ts_products',[p]);}catch(e){return null;}
};
window.platformDeleteProduct=async function(code){
  code=String(code||'');if(!code)return false;
  S._products=(S._products||[]).filter(function(p){return String(p.id)!==code;});
  try{lsSet('ts_products_cache',S._products);}catch(e){}
  try{return await sbDel('ts_products',code);}catch(e){return false;}
};
// One-time seed from the app's built-in product list (names + dest/scenic/flyback +
// durations). Prices start empty and active=false — the operator prices + publishes.
window.platformSeedProducts=async function(){
  var names=(typeof _RZ_PROD_NAME!=='undefined')?_RZ_PROD_NAME:{};
  var rows=[],i=0;
  Object.keys(names).forEach(function(code){
    var cfg=(typeof _rzProdCfg==='function')?(_rzProdCfg(code)||{}):{};
    var dur=(typeof _rzProductCodeDuration==='function')?(_rzProductCodeDuration(code)||null):null;
    rows.push({id:code,name:names[code],dest_short:cfg.short||'',apt:cfg.apt||'',scenic:!!cfg.scenic,
      flyback:(typeof _rzIsFlyback==='function')?_rzIsFlyback(code):false,active:false,sort:(++i)*10,
      duration_min:dur,price_adult:null,price_child:null,price_infant:0,times:[],description:'',
      updated_by:(S.user&&S.user.id)||null,updated_at:new Date().toISOString()});
  });
  if(!rows.length)return false;
  var r=null;try{r=await sbU('ts_products',rows);}catch(e){}
  if(r){S._products=rows;S._productsLoaded=true;try{lsSet('ts_products_cache',rows);}catch(e){}}
  return !!r;
};
// Realtime: another device edited the catalog → re-pull (called from the shared realtime handler).
window.platformReloadProductsLive=function(){
  if(!S._productsLoaded)return;
  platformLoadProducts(true).then(function(){if(typeof safeRender==='function')safeRender();});
};

// ── Settings ▸ Operations ▸ Products editor ─────────────────────────────────
var _PROD_FIELDS={name:'s',dest_short:'s',price_adult:'n',price_child:'n',price_infant:'n',duration_min:'i',sort:'i',description:'s',next_from:'d',next_price_adult:'n',next_price_child:'n',next_price_infant:'n'};
window.platformProdSet=function(code,field,val){
  var p=platformProduct(code);if(!p||!(field in _PROD_FIELDS))return;
  var t=_PROD_FIELDS[field];
  if(t==='n'){var n=parseFloat(val);p[field]=isFinite(n)?n:null;}
  else if(t==='i'){var k=parseInt(val,10);p[field]=isFinite(k)?k:null;}
  else if(t==='d'){var ds=String(val||'').slice(0,10);p[field]=/^\d{4}-\d{2}-\d{2}$/.test(ds)?ds:null;}
  else p[field]=String(val||'');
  platformSaveProduct(p);
};
window.platformProdActive=function(code,on){var p=platformProduct(code);if(!p)return;p.active=!!on;platformSaveProduct(p);render();};
// Times: comma-separated "08:00, 09:30" → normalised ["08:00","09:30"].
window.platformProdTimes=function(code,val){
  var p=platformProduct(code);if(!p)return;
  p.times=String(val||'').split(',').map(function(s){
    var m=/^\s*(\d{1,2})[:.]?(\d{2})\s*$/.exec(s);if(!m)return null;
    var hh=parseInt(m[1],10),mm=parseInt(m[2],10);
    if(hh>23||mm>59)return null;
    return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
  }).filter(Boolean);
  platformSaveProduct(p);render();
};
window.platformProdDraft=function(field,val){S._prodDraft=S._prodDraft||{};S._prodDraft[field]=val;};
window.platformProdAdd=function(){
  var d=S._prodDraft||{};
  var code=String(d.code||'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'');
  var name=String(d.name||'').trim();
  if(!code||!name){if(typeof toast==='function')toast('Enter a code and a name','warn');return;}
  if(platformProduct(code)){if(typeof toast==='function')toast('Product '+code+' already exists','warn');return;}
  var p={id:code,name:name,dest_short:'',apt:'',scenic:false,flyback:false,active:false,sort:((S._products||[]).length+1)*10,
    duration_min:null,price_adult:null,price_child:null,price_infant:0,times:[],description:''};
  S._products=(S._products||[]).concat([p]);S._prodDraft=null;
  platformSaveProduct(p);render();
};
window.platformProdDel=function(code){
  if(!confirm('Delete product '+code+'? (Bookings already made are unaffected.)'))return;
  platformDeleteProduct(code);render();
};
window.platformProdSeed=function(){platformSeedProducts().then(function(ok){if(typeof toast==='function')toast(ok?'Catalog seeded ✓':'Seed failed — is products.sql applied?',ok?'ok':'warn');render();});};

function renderAdminProducts(){
  if(!S._productsLoaded&&!S._productsLoading){platformLoadProducts().then(function(){render();});}
  var esc=(typeof _rzEsc==='function')?_rzEsc:function(s){return String(s==null?'':s);};
  var list=platformProducts();
  var ist='padding:6px 8px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text);font-size:12px';
  var h='<div class="card"><div class="st" style="margin-bottom:6px">Products &amp; Pricing</div>'+
    '<p style="font-size:12px;color:var(--text3);margin:-2px 0 12px;line-height:1.5">The commercial catalog behind the booking platform: customer-facing name, per-passenger prices (NZD incl. GST), standard departure times and public visibility. '+
    '<b>Public ✓</b> = offered on the direct booking page. <b>Next-season prices</b> apply automatically to flights on/after the From date (both here and on the public page). Fuel/burn stays in the ⛽ Fuels tab. Requires <code>products.sql</code> applied in Supabase.</p>';
  if(!list.length){
    h+='<div style="text-align:center;padding:18px 8px;color:var(--text3);font-size:13px">No products yet.'+
      '<div style="margin-top:12px"><button class="btn" onclick="window.platformProdSeed()">Seed from built-in product list</button></div></div>';
  } else {
    h+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:1280px">'+
      '<tr style="color:var(--text3);text-align:left"><th style="padding:4px 6px">Code</th><th style="padding:4px 6px">Name</th><th style="padding:4px 6px">Dest</th>'+
      '<th style="padding:4px 6px">Adult $</th><th style="padding:4px 6px">Child $</th><th style="padding:4px 6px">Infant $</th>'+
      '<th style="padding:4px 6px;border-left:1px solid var(--border2)">From</th><th style="padding:4px 6px">Next A$</th><th style="padding:4px 6px">Next C$</th><th style="padding:4px 6px;border-right:1px solid var(--border2)">Next I$</th>'+
      '<th style="padding:4px 6px">Times (comma-sep)</th><th style="padding:4px 6px">Min</th><th style="padding:4px 6px">Sort</th><th style="padding:4px 6px">Public</th><th></th></tr>';
    list.forEach(function(p){
      var code=esc(p.id),cj=String(p.id).replace(/[^A-Z0-9_-]/gi,'');
      h+='<tr style="border-top:1px solid var(--border2)">'+
        '<td style="padding:4px 6px;font-weight:800">'+code+(p.flyback?' <span style="font-size:10px;color:var(--text3)">FLB</span>':'')+(p.scenic?' <span style="font-size:10px;color:var(--text3)">scenic</span>':'')+'</td>'+
        '<td style="padding:4px 6px"><input id="pr_'+cj+'_name" type="text" value="'+esc(p.name||'')+'" onchange="window.platformProdSet(\''+cj+'\',\'name\',this.value)" style="'+ist+';width:210px"></td>'+
        '<td style="padding:4px 6px;color:var(--text2)">'+esc(p.dest_short||'')+'</td>'+
        '<td style="padding:4px 6px"><input id="pr_'+cj+'_pa" type="number" min="0" step="1" value="'+(p.price_adult!=null?esc(p.price_adult):'')+'" placeholder="POA" onchange="window.platformProdSet(\''+cj+'\',\'price_adult\',this.value)" style="'+ist+';width:70px"></td>'+
        '<td style="padding:4px 6px"><input id="pr_'+cj+'_pc" type="number" min="0" step="1" value="'+(p.price_child!=null?esc(p.price_child):'')+'" placeholder="POA" onchange="window.platformProdSet(\''+cj+'\',\'price_child\',this.value)" style="'+ist+';width:70px"></td>'+
        '<td style="padding:4px 6px"><input id="pr_'+cj+'_pi" type="number" min="0" step="1" value="'+(p.price_infant!=null?esc(p.price_infant):'')+'" onchange="window.platformProdSet(\''+cj+'\',\'price_infant\',this.value)" style="'+ist+';width:60px"></td>'+
        '<td style="padding:4px 6px;border-left:1px solid var(--border2)"><input id="pr_'+cj+'_nf" type="date" value="'+esc(p.next_from?String(p.next_from).slice(0,10):'')+'" onchange="window.platformProdSet(\''+cj+'\',\'next_from\',this.value)" style="'+ist+';width:128px"></td>'+
        '<td style="padding:4px 6px"><input id="pr_'+cj+'_na" type="number" min="0" step="1" value="'+(p.next_price_adult!=null?esc(p.next_price_adult):'')+'" placeholder="POA" onchange="window.platformProdSet(\''+cj+'\',\'next_price_adult\',this.value)" style="'+ist+';width:70px"></td>'+
        '<td style="padding:4px 6px"><input id="pr_'+cj+'_nc" type="number" min="0" step="1" value="'+(p.next_price_child!=null?esc(p.next_price_child):'')+'" placeholder="POA" onchange="window.platformProdSet(\''+cj+'\',\'next_price_child\',this.value)" style="'+ist+';width:70px"></td>'+
        '<td style="padding:4px 6px;border-right:1px solid var(--border2)"><input id="pr_'+cj+'_ni" type="number" min="0" step="1" value="'+(p.next_price_infant!=null?esc(p.next_price_infant):'')+'" onchange="window.platformProdSet(\''+cj+'\',\'next_price_infant\',this.value)" style="'+ist+';width:60px"></td>'+
        '<td style="padding:4px 6px"><input id="pr_'+cj+'_tm" type="text" value="'+esc((p.times||[]).join(', '))+'" placeholder="08:00, 09:30" onchange="window.platformProdTimes(\''+cj+'\',this.value)" style="'+ist+';width:150px"></td>'+
        '<td style="padding:4px 6px"><input id="pr_'+cj+'_dm" type="number" min="0" step="5" value="'+(p.duration_min!=null?esc(p.duration_min):'')+'" onchange="window.platformProdSet(\''+cj+'\',\'duration_min\',this.value)" style="'+ist+';width:56px"></td>'+
        '<td style="padding:4px 6px"><input id="pr_'+cj+'_so" type="number" step="10" value="'+(p.sort!=null?esc(p.sort):'')+'" onchange="window.platformProdSet(\''+cj+'\',\'sort\',this.value)" style="'+ist+';width:56px"></td>'+
        '<td style="padding:4px 6px;text-align:center"><input type="checkbox" '+(p.active?'checked':'')+' onchange="window.platformProdActive(\''+cj+'\',this.checked)"></td>'+
        '<td style="padding:4px 6px"><button onclick="window.platformProdDel(\''+cj+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px" title="Delete">✕</button></td></tr>';
      h+='<tr><td></td><td colspan="14" style="padding:0 6px 6px"><input id="pr_'+cj+'_ds" type="text" value="'+esc(p.description||'')+'" placeholder="Short public description (optional)" onchange="window.platformProdSet(\''+cj+'\',\'description\',this.value)" style="'+ist+';width:100%;font-size:11px;color:var(--text2)"></td></tr>';
    });
    h+='</table></div>';
  }
  var d=S._prodDraft||{};
  h+='<div style="display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap">'+
    '<input id="pr_new_code" type="text" value="'+esc(d.code||'')+'" oninput="window.platformProdDraft(\'code\',this.value)" placeholder="CODE" style="'+ist+';width:90px;text-transform:uppercase">'+
    '<input id="pr_new_name" type="text" value="'+esc(d.name||'')+'" oninput="window.platformProdDraft(\'name\',this.value)" placeholder="Product name" style="'+ist+';width:230px">'+
    '<button class="btn btn-ghost" style="font-size:12px" onclick="window.platformProdAdd()">＋ Add product</button></div>';
  h+='</div>';
  return h;
}
