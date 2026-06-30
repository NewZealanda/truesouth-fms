// === MODULE: shared === v21.74 ===

// ═══════════════════════════════════════════════════════
//  TRUE SOUTH FLIGHTS — DIGITAL LOADSHEET v19
//  Full-featured: Auth, Manifest, Loadsheet, Charter, Admin
// ═══════════════════════════════════════════════════════

const LOGO='data:image/png;base64,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8TGa5zQajXa7fe/evb29PZTifE6e5/P5fDabTadTtFlGhkTyP1gESP4HjXdc1710LowmNij78X0f3xZD3ndsZ4aTVpjm4wPHcTDo45Vms4nd6Waz+V3+xq+QpmmxZzVKfZIkQUmS7ElEUcSkP31fDADV1ev1kJpHTc7Dhw9/+umnL94EUJyoymlhfEoy4AgAV+fcP336dHp6OhqNsLGJSPCDDjShYZxUheL4lWEYhmF4nuc4Dp4WDTi/+99+Nd/3UWSFXg74wWLcD8MQ97qkaVqW1txULgwAlTYYDBzHQYp8b2/vz3/+c7vdvoW/dzQanZ6efvjwYTaboX99HMe3UNGI4whI0BcPYWGvApeuFO9c/NE+fvyIcT8MQywCimcvyn6TJW0/BoCqGw6HOJrb7Xbv3buHgnTTNJEHx+z+is3ba8I0drlcJkmCY7c4f4u8xy+//PId3sm19Xo9qVCyLAupIeSFcOUWFgfYIUBSS8524TvIJsHaboFUha617kEHf2zq4oRdnufY1MW6B4U9ckI7iiIO/XQLGABIefPmDQ5Mged5ruvato10ULGiEb9e/zvneY7jYygbDYIA+73oM4p0/7cX/Hydo6OjYmE+IDuEEiY5VoZggKpNXKKJvWXlQgCQqlDppYEsGYIfMl04XCZpfRw2lk6o2A/Yht7UVAWsAiIlCAKMaFEUYTMW2XCsA1DPIwd6UTNzxVZBmqa+72Mgk3S2DHZxHE+n03gFhaQb8fTp01evXmHklT5Ii8VCPpaDWtg8kOogrAlw4vdiAMAqoXhUGAFAmk7LiI/XpcOEfAEL/OnWcAVA/wfnp2SbtFg8gxpQvIJhUZYFxc4HGNow05dshkxspQ2RvL4989xer1f/IznNgG4WCHhrZ33lFXwTyf8Ub2CWM8NyvkzacecrOGvGcZ9uHwMArXv16hWS4MiHyLhfHPoxSuKKWkVR0DsIfSulkY6QxmoY+0pRy3h4eChhQKqbhJx6U1aRQFmN+zL3V1YdlqRhNX77HXuLEn0jBgC63KtXr5D+Rk0nAoAM/ThFVfx6mcwisyFJDzTSSZLkDpxg6vV6yh/XAUphG0A2AORo9HK5vIVbZYi+GgMAfVa/30fRJLoly+iPIU9GQGU12BXTGtI+EzGAc16iLcQAQFfp9XrYBV1rba9cCABKIeWdpqlsCXDoJ9paDAB0A8iBoMBRWV1+gk9JZSRHfCIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIqKK+F+u7o88/Eti/gAAAABJRU5ErkJggg==';
(function(){
  // Create icon with dark background for PWA/homescreen
  function makeIconDataURL(srcUrl,cb){
    var SIZE=512;
    var PAD=50; // padding around logo
    var canvas=document.createElement('canvas');
    canvas.width=SIZE;canvas.height=SIZE;
    var ctx=canvas.getContext('2d');
    // Black background
    ctx.fillStyle='#000000';
    ctx.fillRect(0,0,SIZE,SIZE);
    var img=new Image();
    img.onload=function(){
      // Scale logo to fit inside padded area, maintain aspect ratio
      var maxW=SIZE-PAD*2,maxH=SIZE-PAD*2;
      var scale=Math.min(maxW/img.width,maxH/img.height);
      var w=img.width*scale,h=img.height*scale;
      var x=(SIZE-w)/2,y=(SIZE-h)/2;
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(img,x,y,w,h);
      cb(canvas.toDataURL('image/png'));
    };
    img.onerror=function(){cb(srcUrl);};
    img.src=srcUrl;
  }
  // Favicon (can use raw logo)
  var l=document.createElement('link');l.rel='icon';l.type='image/png';l.href=LOGO;document.head.appendChild(l);
  // Apple touch icon + manifest icon — use canvas version with background
  makeIconDataURL(LOGO,function(iconUrl){
    var a=document.createElement('link');a.rel='apple-touch-icon';a.href=iconUrl;document.head.appendChild(a);
    // Web app manifest
    var mf={name:'True South FMS',short_name:'TS FMS',start_url:'/',display:'standalone',
      background_color:'#1a2236',theme_color:'#1a2236',
      icons:[{src:iconUrl,sizes:'192x192',type:'image/png'},{src:iconUrl,sizes:'512x512',type:'image/png'}]};
    var blob=new Blob([JSON.stringify(mf)],{type:'application/manifest+json'});
    var ml=document.createElement('link');ml.rel='manifest';ml.href=URL.createObjectURL(blob);document.head.appendChild(ml);
  });
})();

// ── Supabase ──
const SB='https://wgycephyuwwfogggcbye.supabase.co';
const SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneWNlcGh5dXd3Zm9nZ2djYnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NjEzNzAsImV4cCI6MjA5NjQzNzM3MH0.6ac1fI7NxOJla_cI6P2bMwBXr3qkBTaHoyipcG9r95Q';
const SH={'Content-Type':'application/json','apikey':SK,'Authorization':'Bearer '+SK,'Prefer':'return=representation'};
// HTML-escape a dynamic string before placing it in innerHTML (prevents stored XSS via
// user/other-device free-text such as charter notes, roster notes, names).
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// Throttled "your session expired" warning (only when the refresh token is also gone).
let _sbExpWarnTs=0;
function _sbWarnExpired(){
  // The access token (and its refresh token) are dead: REST writes will 401 even though the
  // realtime websocket — opened earlier with the old JWT — can still show a green "Live" dot.
  // Flag it so the top status indicator stops contradicting the "session expired" message.
  S._sessionExpired=true;
  if(typeof safeRender==='function')safeRender();
  var now=Date.now();
  if(now-_sbExpWarnTs<60000)return;
  _sbExpWarnTs=now;
  if(typeof toast==='function')toast('Your session has expired — please sign out and sign back in to keep saving changes.','warn');
}
// Wrap a REST call so an expired JWT is transparently refreshed and retried once.
// Background tabs throttle setTimeout, so the scheduled ~1-min-before-expiry refresh
// can fire late; without this, the first write after waking fails 401 (PGRST303).
async function _sbFetch(url, opts){
  opts=opts||{};
  let r=await fetch(url, opts);
  if(r.status===401 && typeof AUTH_PHASE_C!=='undefined' && AUTH_PHASE_C && _sbSession && typeof _sbRefresh==='function'){
    const refreshed=await _sbRefresh();
    if(refreshed){
      const h=Object.assign({}, opts.headers||{});
      h['Authorization']=SH['Authorization'];   // fresh token set by _applySession
      r=await fetch(url, Object.assign({}, opts, {headers:h}));
      // A just-refreshed token means any writes queued while the session was stale (e.g. a pilot's
      // signed loadsheet that 401'd) can now replay. Fire-and-forget so we don't block this request.
      try{if(typeof _syncFlush==='function')setTimeout(function(){_syncFlush();},0);}catch(e){}
    } else {
      _sbWarnExpired();   // refresh token itself is gone — tell the user (throttled)
    }
  }
  return r;
}
// Upload a File/Blob to Supabase Storage (bucket "ts-uploads"), returning its public URL — or null on
// failure (caller falls back to an inline data-URI). Random unguessable path per file. Carries the user
// JWT via _sbFetch so Storage RLS (authenticated insert) is satisfied.
window._tsUploadFile=async function(file,prefix,name){
  try{
    if(typeof fetch!=='function'||!file)return null;
    name=name||file.name||'file';
    var ext=(String(name).split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'').toLowerCase()||'bin';
    var path=(prefix||'misc')+'/'+Date.now()+'_'+Math.random().toString(36).slice(2,9)+'.'+ext;
    var r=await _sbFetch(SB+'/storage/v1/object/ts-uploads/'+path,{method:'POST',headers:{'apikey':SK,'Authorization':SH['Authorization'],'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},body:file});
    if(!r||!r.ok)return null;
    return SB+'/storage/v1/object/public/ts-uploads/'+path;
  }catch(e){return null;}
};
const sbF=async(t,q='',order='created_at')=>{try{const r=await _sbFetch(`${SB}/rest/v1/${t}?select=*${q}&order=${order}.desc`,{headers:{...SH}});if(!r.ok){console.error('[sbF]',t,'status:',r.status,await r.text());return null;}return r.json();}catch(e){console.error('[sbF]',t,'exception:',e);return null;}};
// Intro animation: the mountains-draw + plane-takeoff plays once (3.5s) on boot before the app is
// revealed, unless the Skip button is pressed. INTRO_MS = how long the intro is held.
const INTRO_MS=3500;
// ── Fetch window: only load recent rows from large tables (tunable) ──
const FETCH_DAYS=90;
const _fetchSince=()=>new Date(Date.now()-FETCH_DAYS*864e5).toISOString().slice(0,10);
// Loadsheets: last FETCH_DAYS only. Manifests: same, but ALWAYS include the
// live_draft row and any ls_live_* realtime-collaboration rows regardless of age.
const Q_LOADSHEETS=()=>`&created_at=gte.${_fetchSince()}`;
const Q_MANIFESTS=()=>`&or=(created_at.gte.${_fetchSince()},id.eq.live_draft)`;
// ── Seatmap workspace ─────────────────────────────────────────────────────
// The seatmap is a SEPARATE working area from the manifests. Manifests are the
// permanent data-entry lists (S.dispatch / per-tab); the seatmap workspace
// (S.smWS) is what you push manifests INTO. Clearing the seatmap never touches
// a manifest. curDisp() returns the workspace while the seatmap/loadsheet tabs
// are active, and the active manifest everywhere else — so the W&B engine and
// seat handlers automatically operate on the right object per tab.
function _onSeatCtx(){var t=S.tab||'';return t==='seatmap'||t==='loadsheet'||t.indexOf('ls_')===0;}
function curDisp(){
  if(_onSeatCtx()){
    if(!S.smWS||typeof S.smWS!=='object'){
      var _sv=null;try{_sv=lsGet('ts_smws');}catch(e){}
      S.smWS=(_sv&&typeof _sv==='object'&&_sv.acSetup)?_sv:bD();
    }
    return S.smWS;
  }
  return S.dispatch;
}
function seatmapWS(){if(!S.smWS||typeof S.smWS!=='object'){var _sv=null;try{_sv=lsGet('ts_smws');}catch(e){}S.smWS=(_sv&&typeof _sv==='object'&&_sv.acSetup)?_sv:bD();}return S.smWS;}
var _smBcTimer=null;
// Broadcast the seatmap workspace so seat/pool moves sync live across devices.
function broadcastSeatmap(){
  if(!_rtWs||_rtWs.readyState!==1||!S.user)return;
  clearTimeout(_smBcTimer);
  _smBcTimer=setTimeout(function(){
    if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'sm_update',payload:{ws:S.smWS,sessionId:_sessionId}},ref:String(_rtRef)}));}
  },500);
}
function saveSeatmapWS(){try{lsSet('ts_smws',S.smWS||bD());}catch(e){}broadcastSeatmap();}
window.saveSeatmapWS=saveSeatmapWS;
// Shared unallocated pool — single source for the seatmap AND every loadsheet tab.
// It lives on whichever dispatch is current (workspace on the seatmap/loadsheet tabs).
function _uaPool(){var d=curDisp();if(!d)return[];if(!Array.isArray(d._unallocated))d._unallocated=[];return d._unallocated;}
// Loadsheet undo snapshots BOTH the form (seats) and the shared pool, so undo restores both.
function _lsUndoPush(){if(!S._lsFormUndoStack)S._lsFormUndoStack=[];S._lsFormUndoStack.push({form:dc(S.form),pool:JSON.parse(JSON.stringify(_uaPool()))});if(S._lsFormUndoStack.length>20)S._lsFormUndoStack.shift();S._lsFormUndo=null;}
// Keep the seatmap's unassigned list and the shared loadsheet pool in lock-step.
// The pool is the single source; entries carry the passenger id so the seatmap can seat them.
function _seatmapSyncPool(){
  var d=curDisp(); if(!d)return;
  if(!Array.isArray(d.pax))d.pax=[];
  var pool=_uaPool();
  var seated={}; Object.keys(d.seatMap||{}).forEach(function(ac){Object.keys(d.seatMap[ac]||{}).forEach(function(i){var pid=d.seatMap[ac][i];if(pid)seated[pid]=1;});});
  // 1. Promote any loadsheet-origin pool entries (no id) into d.pax so the seatmap can seat them.
  pool.forEach(function(e){
    if(!e.id){
      var np={id:'p_'+Date.now()+'_'+Math.floor(Math.random()*1e5),name:e.name||'',weight:e.weight||0,bag:e.bag||0,group:e.group||'',pinAc:null,infant:false,infantName:e.infant||null,type:e.type||'adult',paymentReq:!!e.paymentReq,_ts:Date.now()};
      d.pax.push(np); e.id=np.id;
    }
  });
  // 2. Drop pool entries that are now seated in the seatmap.
  for(var i=pool.length-1;i>=0;i--){if(pool[i].id&&seated[pool[i].id])pool.splice(i,1);}
  // 3. Add any unseated, non-infant passengers that aren't already in the pool (by id or name+weight).
  // De-dupe by id; only fall back to name+weight for entries that have NO id,
  // so two genuinely different passengers sharing a name and weight both appear.
  var inPool={},poolKey={}; pool.forEach(function(e){if(e.id)inPool[e.id]=1;else poolKey[(e.name||'')+'|'+(e.weight||'')]=1;});
  (d.pax||[]).forEach(function(p){
    if(p.infant||seated[p.id]||inPool[p.id])return;
    if(!p.id&&poolKey[(p.name||'')+'|'+(p.weight||'')])return;
    pool.push({id:p.id,name:p.name,weight:p.weight,bag:p.bag||0,group:p.group||'',infant:p.infantName||null,type:p.type||'adult',paymentReq:!!p.paymentReq});
  });
}
const sbU=async(t,d)=>{try{const r=await _sbFetch(`${SB}/rest/v1/${t}`,{method:'POST',headers:{...SH,'Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify(d)});if(!r.ok){const err=await r.text();console.error('[sbU]',t,'status:',r.status,err);try{window._lastSbErr={table:t,status:r.status,online:(typeof navigator!=='undefined'?navigator.onLine:true),sessionDead:!!(S&&S._sessionExpired),body:String(err).slice(0,160),ts:Date.now()};}catch(_e){}if(r.status>=500||r.status===0||r.status===401||r.status===403)_syncEnqueue(t,d);return null;}_syncPurge(t,d);return r.json();}catch(e){console.error('[sbU]',t,'exception:',e);try{window._lastSbErr={table:t,status:0,online:(typeof navigator!=='undefined'?navigator.onLine:true),sessionDead:!!(S&&S._sessionExpired),body:String((e&&e.message)||e).slice(0,160),ts:Date.now()};}catch(_e){}_syncEnqueue(t,d);return null;}};
// Turn the last sbU failure into a specific, actionable loadsheet message (offline vs session vs server).
function _lsUploadFailMsg(){var e=(typeof window!=='undefined'&&window._lastSbErr)||{};
  var body=e.body?(' — server said: '+e.body):'';
  if(e.online===false)return '📶 No internet — the loadsheet is SIGNED and saved on this device. It uploads automatically when you reconnect.';
  if(e.sessionDead||e.status===401)return '🔒 Your sign-in has ended. Open the menu ▸ sign out, then sign back in — the signed loadsheet uploads automatically once you do.';
  if(e.status===403)return '⛔ Server rejected the upload (HTTP 403 / permissions). Saved on this device — please screenshot this for Andrew.'+body;
  if(e.status)return '⚠ Upload rejected (HTTP '+e.status+'). Saved on this device. Please SCREENSHOT this for Andrew'+body;
  return '⚠ Signed on this device but not yet uploaded. It will upload automatically once you reconnect.';}
try{window._lsUploadFailMsg=_lsUploadFailMsg;}catch(_e){}
// ── Offline write queue ───────────────────────────────────────────────────────
// A device in the field (e.g. a pilot mid-flight) may capture flight records or loadsheet edits with
// no reception. Those writes already persist to localStorage immediately; here we ALSO queue the
// FAILED cloud upsert and replay it automatically when the device is back online (the `online` event,
// a realtime reconnect, or a delayed boot attempt). Scoped to field-captured tables and keyed by row
// id, so a replay is just an idempotent re-upsert; only the latest write per row is kept.
var _SYNC_TABLES={ts_loadsheets:1,ts_flight_records:1};
function _syncQGet(){try{var q=lsGet&&lsGet('ts_sync_queue');return Array.isArray(q)?q:[];}catch(e){return [];}}
function _syncQSet(q){try{lsSet&&lsSet('ts_sync_queue',q);}catch(e){}try{S._syncPending=(q&&q.length)||0;}catch(e){}}
// A newer (successful) write supersedes any older queued one for the same row — so a stale queued
// payload can never replay over a fresh bin/archive/edit when the queue later flushes.
function _syncPurge(table,rows){
  if(!_SYNC_TABLES[table]||!Array.isArray(rows)||!rows.length)return;
  var q=_syncQGet();if(!q.length)return;
  var ids={};rows.forEach(function(r){if(r&&r.id!=null)ids[r.id]=1;});
  var n=q.filter(function(e){return !(e.table===table&&e.row&&ids[e.row.id]);});
  if(n.length!==q.length)_syncQSet(n);
}
function _syncEnqueue(table,rows){
  if(!_SYNC_TABLES[table]||!Array.isArray(rows)||!rows.length)return;
  var q=_syncQGet();
  rows.forEach(function(row){if(!row||row.id==null)return;q=q.filter(function(e){return !(e.table===table&&e.row&&e.row.id===row.id);});q.push({table:table,row:row,at:Date.now()});});
  _syncQSet(q);
  try{if(typeof navigator!=='undefined'&&navigator.onLine===false&&typeof toast==='function')toast('Saved on this device — will sync when back online','info');}catch(e){}
}
var _syncFlushing=false;
async function _syncFlush(){
  if(_syncFlushing)return;
  if(typeof navigator!=='undefined'&&navigator.onLine===false)return;
  var q=_syncQGet();if(!q.length)return;
  _syncFlushing=true;var done=0,remaining=[];
  try{
    for(var i=0;i<q.length;i++){var e=q[i],ok=false,_row=e.row;
      // Replay the CURRENT local truth, not the stale captured payload — so a queued 'unsigned' save
      // can never resurrect a sheet that's since been binned (status reconciled from live S.saved).
      if(e.table==='ts_loadsheets'&&_row&&_row.id!=null){var _lv=(S.saved||[]).find(function(s){return s.id===_row.id;});if(_lv)_row=Object.assign({},_row,{status:_lv.status||_row.status,form:Object.assign({},_row.form||{},{_driveUploaded:!!_lv.driveUploaded})});if(_row&&'drive_uploaded' in _row)delete _row.drive_uploaded;}
      try{var r=await _sbFetch(SB+'/rest/v1/'+e.table,{method:'POST',headers:{...SH,'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify([_row])});ok=!!(r&&r.ok);}catch(_e){ok=false;}
      if(ok)done++;else remaining.push(e);
    }
  }finally{
    _syncQSet(remaining);_syncFlushing=false;
    if(done&&typeof toast==='function')toast('Synced '+done+' offline change'+(done===1?'':'s')+' ✓','ok');
    if(typeof safeRender==='function')safeRender();
  }
}
if(typeof window!=='undefined'){
  window._syncFlush=_syncFlush;
  if(!window._syncHooked){window._syncHooked=true;
    try{window.addEventListener('online',function(){_syncFlush();});}catch(e){}
    setTimeout(function(){try{_syncFlush();}catch(e){}},5000);   // boot attempt (covers an already-online start)
    // Periodic retry: a queued signed loadsheet (401'd on an idle phone) uploads as soon as the session
    // recovers, without needing a foreground/online event. _syncFlush no-ops when the queue is empty.
    setInterval(function(){try{if(_syncQGet().length)_syncFlush();}catch(e){}},45000);
  }
}
const sbDel=async(t,id)=>{try{const r=await _sbFetch(`${SB}/rest/v1/${t}?id=eq.${id}`,{method:'DELETE',headers:{...SH}});return r.ok;}catch{return false;}};
// ── Loadsheet "sticky" state ──────────────────────────────────────────────────
// A tiny, independent source of truth for two forward-only facts the user just set: a sheet is in the
// Bin ('deleted'), or has been uploaded to Drive ('uploaded'). It lives under its OWN localStorage key
// that ONLY bin/restore/upload touch — so unlike the loadsheets cache (rewritten on every reload) it
// can't be clobbered by a stale realtime reload, an autosave, or the offline queue. Applied over every
// load so a binned/archived sheet never bounces back to Active/Signed on a refresh.
function _lsStickyGet(){try{var v=lsGet('ts_ls_sticky');return (v&&typeof v==='object')?v:{};}catch(e){return {};}}
function _lsStickySet(m){try{lsSet('ts_ls_sticky',m);}catch(e){}}
function _lsStickyMark(id,field,on){if(!id)return;var m=_lsStickyGet();m[id]=m[id]||{};if(on)m[id][field]=1;else delete m[id][field];if(!Object.keys(m[id]).length)delete m[id];_lsStickySet(m);}
window._lsStickyMark=_lsStickyMark;
// Apply the sticky facts onto a freshly-loaded saved-sheet object (mutates + returns it).
function _lsApplySticky(s){if(!s||!s.id)return s;var st=(_lsStickyGet())[s.id];if(!st)return s;if(st.deleted)s.status='deleted';if(st.uploaded)s.driveUploaded=true;return s;}
window._lsApplySticky=_lsApplySticky;
// The live ts_loadsheets table has NO drive_uploaded column — sending it as a top-level field 400s the
// WHOLE write (PostgREST PGRST204), which silently broke every signed sign-off. Carry the Drive-upload
// flag INSIDE the form jsonb (a real, synced column) instead, so it survives refresh + cross-device and
// signing can never fail on a missing column. Reads derive driveUploaded from form._driveUploaded.
function _lsWritePayload(id,form,savedAt,status,du){
  var fm=(form&&typeof form==='object')?Object.assign({},form):{};
  if(du!=null)fm._driveUploaded=!!du;
  return {id:id,form:fm,saved_at:savedAt,status:status};
}
window._lsWritePayload=_lsWritePayload;

// ── Phase A auth cutover (DEFAULT OFF) ──────────────────────────────────────
// Flip ON only AFTER (1) deploying the verify-login / set-password / confirm-reset
// Edge Functions and (2) running auth_migration_phase0A.sql. Test on the flag with a
// break-glass admin before going live — see SUPABASE_AUTH_MIGRATION_PLAN.md.
// With the flag OFF every helper below behaves exactly as it did before.
let AUTH_PHASE_A=true;
// Read users from the hash-free view when locked down, the base table otherwise.
const USERS_TBL=()=>(AUTH_PHASE_A||AUTH_PHASE_C)?'ts_users_public':'ts_users';
// Write user rows. Under Phase A, ts_users SELECT is revoked so we use return=minimal
// (no SELECT-back) and never push an EMPTY password hash — reads no longer include the
// hash, so echoing '' back would wipe a real password.
async function sbUserWrite(rows){
  const hf=(typeof _hashFree==='function')&&_hashFree();
  const list=(rows||[]).map(function(r){
    var c=Object.assign({},r);
    // Under Phase A/C the legacy password_hash isn't the source of truth (Supabase
    // Auth is); never wipe it with an empty value.
    if(hf&&(c.password_hash===''||c.password_hash==null))delete c.password_hash;
    return c;
  });
  // Phase A/C revoke SELECT on ts_users (to hide password hashes). PostgREST upsert
  // (Prefer: resolution=merge-duplicates -> ON CONFLICT DO UPDATE) requires table-level
  // SELECT, so it fails with 42501. Instead: INSERT new rows; on a 409 duplicate-id,
  // fall back to PATCH (UPDATE by id). Both need only INSERT/UPDATE + SELECT(id).
  try{
    for(const row of list){
      const r=await _sbFetch(`${SB}/rest/v1/ts_users`,{method:'POST',headers:{...SH,'Prefer':'return=minimal'},body:JSON.stringify(row)});
      if(r.ok)continue;                       // inserted a new row
      if(r.status===409){                     // existing id -> update it
        if(!row.id){console.error('[sbUserWrite] 409 with no id');return null;}
        const patch=Object.assign({},row);delete patch.id;   // never PATCH the PK
        const pr=await _sbFetch(`${SB}/rest/v1/ts_users?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',headers:{...SH,'Prefer':'return=minimal'},body:JSON.stringify(patch)});
        if(pr.ok)continue;
        console.error('[sbUserWrite PATCH]',pr.status,await pr.text());return null;
      }
      console.error('[sbUserWrite INSERT]',r.status,await r.text());return null;
    }
    return list;   // truthy = success (callers only check truthiness)
  }catch(e){console.error('[sbUserWrite]',e);return null;}
}
// Call a Supabase Edge Function. Returns {ok, status, data}.
async function callFn(name,payload){
  try{
    const r=await fetch(SB+'/functions/v1/'+name,{method:'POST',headers:{'Content-Type':'application/json','apikey':SK,'Authorization':'Bearer '+SK},body:JSON.stringify(payload||{})});
    const j=await r.json().catch(function(){return{};});
    return {ok:r.ok&&j&&j.ok!==false,status:r.status,data:j};
  }catch(e){return {ok:false,status:0,data:{error:'network'}};}
}

// ── Phase C auth (DEFAULT OFF): real per-user Supabase Auth (JWT) ────────────
// Build/test behind this flag per MIGRATION_RUNBOOK step 12. When ON, login uses
// Supabase Auth (GoTrue) directly, every REST/realtime call carries the user's JWT,
// and RLS enforces access server-side. Phase C implies the Phase A hash-free posture.
// With the flag OFF, every helper below is inert.
let AUTH_PHASE_C=true;
let _sbSession=null;          // {access_token, refresh_token, expires_at(ms)}
let _sbRefreshTimer=null;
// True when user reads must avoid the hashed base table (either cutover).
function _hashFree(){return AUTH_PHASE_A||AUTH_PHASE_C;}
// Decode a JWT payload (base64url) to read custom claims (app_id, user_role, email).
function _jwtClaims(tok){try{var p=(tok||'').split('.')[1];if(!p)return {};p=p.replace(/-/g,'+').replace(/_/g,'/');while(p.length%4)p+='=';var bin=atob(p),bytes=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return JSON.parse(new TextDecoder('utf-8').decode(bytes));}catch(e){return {};}}
// Put the user's access token on REST calls (or restore the anon key when signed out).
function _applySession(sess){
  _sbSession=sess||null;
  SH['Authorization']='Bearer '+((sess&&sess.access_token)||SK);
  if(sess&&sess.access_token)S._sessionExpired=false;   // fresh token — clear the expiry flag
  _scheduleRefresh();
}
function _scheduleRefresh(){
  clearTimeout(_sbRefreshTimer);
  if(!AUTH_PHASE_C||!_sbSession||!_sbSession.expires_at)return;
  var ms=_sbSession.expires_at-Date.now()-60000; // refresh ~1 min before expiry
  _sbRefreshTimer=setTimeout(function(){_sbRefresh();},Math.max(5000,ms));
}
// SINGLE-FLIGHT the refresh. Supabase rotates the refresh token on every use, so if several REST
// calls 401 at once (the pickup/notification polls + a save near token-expiry) and each starts its
// own refresh, the first wins and rotates the token — the others then POST a now-stale refresh
// token, get a 4xx, and falsely warn "session expired" even though the session is fine. Sharing one
// in-flight refresh promise fixes the spurious "sign out / sign back in" toast.
let _sbRefreshing=null;
function _sbRefresh(){
  if(_sbRefreshing)return _sbRefreshing; // a refresh is already in flight — reuse it
  _sbRefreshing=(async function(){
    if(!_sbSession||!_sbSession.refresh_token)return false;
    // POST a refresh token; resolves to the new session JSON, or null on a 4xx (token rejected).
    async function _try(rt){
      try{
        var r=await fetch(SB+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'Content-Type':'application/json','apikey':SK},body:JSON.stringify({refresh_token:rt})});
        if(!r.ok)return null;
        return await r.json();
      }catch(e){return undefined;}   // undefined = network error (vs null = rejected); don't treat as dead
    }
    try{
      var j=await _try(_sbSession.refresh_token);
      // Supabase ROTATES the refresh token on every use. The home-screen app and a Safari/Chrome tab on
      // the same origin SHARE localStorage, so another open instance may have just refreshed and rotated
      // the token — leaving the one in OUR memory stale (a 4xx, j===null). Before declaring the session
      // dead, re-read the freshest stored token and retry once with it. This recovers the multi-instance
      // collision that made a signed loadsheet 401 into the queue on a phone with the app open twice.
      if(j===null){
        var stored=null;try{stored=JSON.parse(localStorage.getItem('ts_sb_session')||'null');}catch(e){}
        if(stored&&stored.refresh_token&&stored.refresh_token!==_sbSession.refresh_token){j=await _try(stored.refresh_token);}
      }
      if(!j||!j.access_token)return false;
      var sess={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Date.now()+(j.expires_in||3600)*1000};
      try{localStorage.setItem('ts_sb_session',JSON.stringify(sess));}catch(e){}
      _applySession(sess);
      if(_rtWs)initRealtime();   // re-join realtime with the fresh token
      return true;
    }catch(e){return false;}
  })();
  _sbRefreshing.then(function(){_sbRefreshing=null;},function(){_sbRefreshing=null;}); // clear once settled
  return _sbRefreshing;
}
// Sign in via Supabase Auth; on first post-migration login, fall back to migrate-login once.
async function _sbSignIn(email,password){
  async function _tok(){
    var r=await fetch(SB+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json','apikey':SK},body:JSON.stringify({email:email,password:password})});
    return {ok:r.ok,status:r.status,data:await r.json().catch(function(){return{};})};
  }
  var res=await _tok();
  if(!res.ok){
    if(res.status===0)return {ok:false,offline:true};
    var mig=await callFn('migrate-login',{email:email,password:password});
    if(!mig.ok)return {ok:false};
    res=await _tok();
    if(!res.ok)return {ok:false};
  }
  var j=res.data;
  var sess={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Date.now()+(j.expires_in||3600)*1000};
  try{localStorage.setItem('ts_sb_session',JSON.stringify(sess));}catch(e){}
  return {ok:true,session:sess,claims:_jwtClaims(j.access_token)};
}
// ── Biometric unlock (Face ID / Touch ID) via WebAuthn platform passkey ───────────────────────────
// A LOCAL presence gate: enrolling creates a platform passkey bound to this site + device (stored in
// the secure enclave; the credential id is kept in localStorage). Verifying triggers Face ID/Touch ID
// and, on success, proves the device owner is present — used to unlock the app (a remembered session)
// and the confidential Business Plan tab. The password ALWAYS remains as a fallback. Opt-in per device.
function _bioAvail(){return !!(window.PublicKeyCredential&&navigator.credentials&&navigator.credentials.create&&navigator.credentials.get);}
function _bioStore(){try{return JSON.parse(localStorage.getItem('ts_bio')||'{}')||{};}catch(e){return {};}}
function _bioSetStore(o){try{localStorage.setItem('ts_bio',JSON.stringify(o||{}));}catch(e){}}
function _bioEnrolledFor(uid){var s=_bioStore();return !!(uid&&s[uid]&&s[uid].id);}
function _bioAnyEnrolled(){var s=_bioStore();return Object.keys(s).some(function(k){return s[k]&&s[k].id;});}
function _b64uFromBuf(buf){var b=new Uint8Array(buf),s='';for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function _bufFromB64u(str){str=String(str||'').replace(/-/g,'+').replace(/_/g,'/');while(str.length%4)str+='=';var bin=atob(str),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer;}
function _bioChallenge(){var u=new Uint8Array(32);try{(window.crypto||{}).getRandomValues&&window.crypto.getRandomValues(u);}catch(e){}return u;}
async function _bioEnroll(user){
  if(!_bioAvail()||!user||!user.id)return {ok:false,err:'unsupported'};
  try{
    var cred=await navigator.credentials.create({publicKey:{
      challenge:_bioChallenge(),rp:{name:'TrueSouth FMS'},
      user:{id:new TextEncoder().encode(String(user.id)),name:String(user.email||user.id),displayName:String(user.name||user.email||'')},
      pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
      authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},
      timeout:60000,attestation:'none'
    }});
    if(!cred||!cred.rawId)return {ok:false,err:'cancelled'};
    var s=_bioStore();s[user.id]={id:_b64uFromBuf(cred.rawId),name:user.name||user.email||'',at:Date.now()};_bioSetStore(s);
    return {ok:true};
  }catch(e){return {ok:false,err:(e&&e.name)||'error'};}
}
async function _bioVerify(uid){
  if(!_bioAvail())return false;
  try{
    var s=_bioStore();var allow=[];
    if(uid&&s[uid]&&s[uid].id)allow=[{type:'public-key',id:_bufFromB64u(s[uid].id)}];
    else Object.keys(s).forEach(function(k){if(s[k]&&s[k].id)allow.push({type:'public-key',id:_bufFromB64u(s[k].id)});});
    var a=await navigator.credentials.get({publicKey:{challenge:_bioChallenge(),allowCredentials:allow.length?allow:undefined,userVerification:'required',timeout:60000}});
    return !!a;
  }catch(e){return false;}
}
function _bioRemove(uid){var s=_bioStore();if(uid)delete s[uid];else s={};_bioSetStore(s);}
// Build an S.user object from JWT claims + the public user record.
function _userFromClaims(claims){
  var appId=claims.app_id,role=claims.user_role||'desk';
  var rec=(S.users||[]).find(function(x){return x.id===appId;})||{};
  var u={id:appId,name:rec.name||claims.email||'',email:rec.email||claims.email||'',role:role,linkedCrew:rec.linkedCrew||'',passwordHash:'',weight:rec.weight||0,isPilot:rec.isPilot||role==='pilot'||false,inactive:rec.inactive||false};
  if(u.email==='andrew@truesouthflights.co.nz'||u.email==='adamsonandrew1@gmail.com'||role==='superadmin')u.superAdmin=true;
  return u;
}
// Under Phase C the boot fetch runs as anon (RLS hides protected tables), so reload the
// core tables once a JWT is in place after login/restore.
async function _reloadCoreTables(){
  try{await Promise.all(['ts_crew','ts_aircraft','ts_charter_rates','ts_loadsheets','ts_manifests','ts_scratchpads','ts_settings'].map(function(t){return reloadTable(t);}));}catch(e){}
}
const sbPatch=async(t,id,data)=>{try{const r=await _sbFetch(`${SB}/rest/v1/${t}?id=eq.${id}`,{method:'PATCH',headers:{...SH,'Prefer':'return=minimal'},body:JSON.stringify(data)});return r.ok;}catch{return false;}};

// ── Shared ts_settings merge-before-write (generalises the maintenance/roster/business_plan fix) ──
// A 3-way deep merge: cloud=latest server, base=what THIS device last saw, local=this device's value.
// Keeps other devices' changes to anything this device didn't touch; applies this device's
// adds/edits/removes. Arrays of {id}/{key} merge by id; other arrays replace only if changed.
function _sbMerge3(cloud, base, local){
  var isObj=function(v){return v&&typeof v==='object'&&!Array.isArray(v);};
  if(Array.isArray(local)&&Array.isArray(cloud)){
    var idOf=function(x){return x&&typeof x==='object'?(x.id!=null?String(x.id):(x.key!=null?String(x.key):null)):null;};
    var all=local.concat(cloud);
    var ided=all.length>0&&all.every(function(x){return idOf(x)!=null;});
    if(!ided){return JSON.stringify(local)!==JSON.stringify(base)?local:cloud;}
    var ba=Array.isArray(base)?base:[];
    var mapC={},mapB={},mapL={};cloud.forEach(function(x){mapC[idOf(x)]=x;});ba.forEach(function(x){mapB[idOf(x)]=x;});local.forEach(function(x){mapL[idOf(x)]=x;});
    var ids=[],seen={};
    local.forEach(function(x){var i=idOf(x);if(!seen[i]){seen[i]=1;ids.push(i);}});
    cloud.forEach(function(x){var i=idOf(x);if(!seen[i]){seen[i]=1;ids.push(i);}});
    ba.forEach(function(x){var i=idOf(x);if(!seen[i]){seen[i]=1;ids.push(i);}});
    var out=[];
    ids.forEach(function(id){var l=mapL[id],b=mapB[id],c=mapC[id];var changed=JSON.stringify(l)!==JSON.stringify(b);
      if(changed){if(l!==undefined)out.push((isObj(l)&&isObj(c))?_sbMerge3(c,b,l):l);}
      else{if(c!==undefined)out.push(c);}});
    return out;
  }
  if(isObj(local)&&isObj(cloud)){
    var res={},keys={};[cloud,base||{},local].forEach(function(o){if(o&&typeof o==='object')Object.keys(o).forEach(function(k){keys[k]=1;});});
    Object.keys(keys).forEach(function(k){var l=local[k],b=base?base[k]:undefined,c=cloud[k];var changed=JSON.stringify(l)!==JSON.stringify(b);
      if(changed){if(l===undefined){/* locally deleted */}else if((isObj(l)&&isObj(c))||(Array.isArray(l)&&Array.isArray(c)))res[k]=_sbMerge3(c,b,l);else res[k]=l;}
      else{if(c!==undefined)res[k]=c;}});
    return res;
  }
  return (JSON.stringify(local)!==JSON.stringify(base))?local:cloud;
}
var _sbBase={},_sbSaving={},_sbRetry={};
function _sbSetBase(key,val){try{_sbBase[key]=JSON.parse(JSON.stringify(val));}catch(e){_sbBase[key]=val;}}
// Merge-save a ts_settings blob: re-GET cloud, merge this device's changes onto it, write. ABORTS
// (and retries) if the cloud read fails, so a partial local copy can never clobber the server.
// applyFn(merged) lets the caller adopt the merged result (so other devices' changes show locally).
async function sbMergeSave(key, localVal, applyFn){
  if(_sbSaving[key]){_sbSaving[key].again={v:localVal,fn:applyFn};return;}
  _sbSaving[key]={};
  try{
    var ok=false,present=false,fresh=null;
    // Use _sbFetch (refreshes the JWT on a 401) — a raw fetch would 401-loop near token expiry.
    try{var r=await _sbFetch(SB+'/rest/v1/ts_settings?key=eq.'+encodeURIComponent(key)+'&select=value',{headers:SH});
      if(r.ok){ok=true;var rows=await r.json();if(rows&&rows.length){present=true;fresh=typeof rows[0].value==='string'?JSON.parse(rows[0].value):rows[0].value;}}}catch(e){}
    if(!ok){
      // Couldn't read the server copy — don't risk clobbering it. Retry the LATEST queued value.
      var againF=(_sbSaving[key]&&_sbSaving[key].again)||{v:localVal,fn:applyFn};
      _sbSaving[key]=null;clearTimeout(_sbRetry[key]);_sbRetry[key]=setTimeout(function(){sbMergeSave(key,againF.v,againF.fn);},2500);
      return null;
    }
    var base=(key in _sbBase)?_sbBase[key]:(present?fresh:localVal);
    var merged=present?_sbMerge3(fresh,base,localVal):localVal;
    var res=await sbU('ts_settings',[{key:key,value:JSON.stringify(merged)}]);
    if(res!==null){_sbSetBase(key,merged);if(typeof applyFn==='function')try{applyFn(merged);}catch(e){}}
    return res;
  }catch(e){console.error('[sbMergeSave]',key,e);return null;}
  finally{var again=_sbSaving[key]&&_sbSaving[key].again;_sbSaving[key]=null;if(again)sbMergeSave(key,again.v,again.fn);}
}


// ── Constants ──
const AVGAS=0.72,LB=0.453592,JETA=0.8;
const DEFAULT_ROLE_PERMS={
  superadmin:  {operations:true,weather_call:true,resources:true, calendar:true,charter:true, ground:true, maintenance:true, roster:true, roster_edit:true, leave:true, leave_approve:true, admin_crew:true,admin_users:true, scratchpad:true, audit:true, maint_bookings:true, sign_loadsheet:true, rezdy:true,  pay_week:true, flightduty:true, flightduty_manage:true, businessplan:true, flightrecord:true, flightrecord_manage:true, data_recording:true, reports_to:true},
  admin:       {operations:true,weather_call:true,resources:true, calendar:true,charter:true, ground:true, maintenance:true, roster:true, roster_edit:true, leave:true, leave_approve:true, admin_crew:true,admin_users:true, scratchpad:true, audit:false,maint_bookings:true, sign_loadsheet:true, rezdy:false, pay_week:true, flightduty:true, flightduty_manage:true, businessplan:true, flightrecord:true, flightrecord_manage:true, data_recording:true, reports_to:true},
  cx_manager:  {operations:true,weather_call:true,resources:true, calendar:true,charter:false,ground:true, maintenance:false,roster:true, roster_edit:true, leave:true, leave_approve:true, admin_crew:true,admin_users:false,scratchpad:false,audit:false,maint_bookings:false,sign_loadsheet:false,rezdy:false, pay_week:false, flightduty:true, flightduty_manage:false, data_recording:true, reports_to:true},
  pilot:       {operations:true,weather_call:true,resources:true, calendar:true,charter:false,ground:true, maintenance:true, roster:true, roster_edit:false,leave:true, leave_approve:false,admin_crew:true,admin_users:false,scratchpad:true, audit:false,maint_bookings:false,sign_loadsheet:true, rezdy:false, pay_week:false, flightduty:true, flightduty_manage:false},
  desk:        {operations:true,weather_call:true,resources:true, calendar:true,charter:true, ground:true, maintenance:true, roster:true, roster_edit:false,leave:true, leave_approve:false,admin_crew:true,admin_users:false,scratchpad:true, audit:false,maint_bookings:false,sign_loadsheet:false,rezdy:false, pay_week:false, flightduty:true, flightduty_manage:false},
  maint:       {operations:false,calendar:false,charter:false,maintenance:true, roster:false,roster_edit:false,leave:true, leave_approve:false,admin_crew:true,admin_users:false,scratchpad:false,audit:false,maint_bookings:true, sign_loadsheet:false,rezdy:false, pay_week:false},
  maintenance: {operations:false,calendar:false,charter:false,maintenance:true, roster:false,roster_edit:false,leave:true, leave_approve:false,admin_crew:true,admin_users:false,scratchpad:false,audit:false,maint_bookings:true, sign_loadsheet:false,rezdy:false, pay_week:false},
  ground_staff:{operations:true, calendar:true, charter:false,ground:true, maintenance:false,roster:false,roster_edit:false,leave:true, leave_approve:false,admin_crew:true,admin_users:false,scratchpad:false,audit:false,maint_bookings:false,sign_loadsheet:false,rezdy:false, pay_week:false},
  accounts: {operations:false,calendar:false,charter:false,maintenance:false,roster:true, roster_edit:false,leave:true, leave_approve:false,admin_crew:false,admin_users:false,scratchpad:false,audit:false,maint_bookings:false,sign_loadsheet:false,rezdy:false, pay_week:true},
  marketing: {operations:false,calendar:false,charter:false,maintenance:false,roster:false,roster_edit:false,leave:true, leave_approve:false,admin_crew:false,admin_users:false,scratchpad:false,audit:false,maint_bookings:false,sign_loadsheet:false,rezdy:false, pay_week:false}
};
function hasRolePerm(perm){
  const r=S.user?.role||'desk';const _sa=!!(S.user&&(r==='superadmin'||S.user.superAdmin));
  // Hardcoded (no longer per-role configurable): user/role/password management = admins; audit = superadmin.
  if(perm==='admin_users')return r==='admin'||_sa;
  if(perm==='audit')return _sa;
  // Settings + Pilot Bag access: unlocked to everyone by default; turn OFF per-role in the grid to lock.
  if(perm==='settings')return (S.rolePerms&&S.rolePerms[r]&&S.rolePerms[r].settings!==undefined)?!!S.rolePerms[r].settings:true;
  if(perm==='pilotbag')return (S.rolePerms&&S.rolePerms[r]&&S.rolePerms[r].pilotbag!==undefined)?!!S.rolePerms[r].pilotbag:true;
  // Vehicle prestart: defaults to whoever has Operations (i.e. the people who drive the vans); grid can override.
  if(perm==='vehicle_prestart'){var _vpo=S.rolePerms&&S.rolePerms[r]&&S.rolePerms[r].vehicle_prestart;if(_vpo!==undefined)return !!_vpo;return _sa||hasRolePerm('operations');}
  // Operations Notices: everyone can view notices applicable to them (default on); managing/issuing is admins+CX.
  if(perm==='ops_notices')return (S.rolePerms&&S.rolePerms[r]&&S.rolePerms[r].ops_notices!==undefined)?!!S.rolePerms[r].ops_notices:true;
  if(perm==='ops_notices_manage'){var _onm=S.rolePerms&&S.rolePerms[r]&&S.rolePerms[r].ops_notices_manage;if(_onm!==undefined)return !!_onm;return r==='admin'||r==='cx_manager'||_sa;}
  // Visitor sign-in: reception tool — visible to all staff by default; edit/delete history = admins+CX.
  if(perm==='visitors')return (S.rolePerms&&S.rolePerms[r]&&S.rolePerms[r].visitors!==undefined)?!!S.rolePerms[r].visitors:true;
  if(perm==='visitors_manage'){var _vm=S.rolePerms&&S.rolePerms[r]&&S.rolePerms[r].visitors_manage;if(_vm!==undefined)return !!_vm;return r==='admin'||r==='cx_manager'||_sa;}
  // Flight following / Monitoring: status board for all staff by default.
  if(perm==='monitoring')return (S.rolePerms&&S.rolePerms[r]&&S.rolePerms[r].monitoring!==undefined)?!!S.rolePerms[r].monitoring:true;
  // Combined OPERATIONS permission: calendar, ground, resources, weather (and charter) all follow Operations.
  if(perm==='charter'||perm==='calendar'||perm==='ground'||perm==='resources'||perm==='weather_call')perm='operations';
  const rp=S.rolePerms?.[r];return rp&&rp[perm]!==undefined?rp[perm]:(DEFAULT_ROLE_PERMS[r]||{})[perm]||false;}
// Flight / PIC eligibility is derived from a crew member's AIRCRAFT APPROVALS (endorsements)
// in their profile — there is no separate "PIC eligible" flag. Anyone approved on at least
// one aircraft can fly / act as PIC. Resolves the user's crew record by name/linkedCrew.
function _crewForUser(u){if(!u)return null;return (S.crew||[]).find(function(c){return c.n===u.name||c.n===u.linkedCrew;})||null;}
function _picEligible(u){var cr=_crewForUser(u);return !!(cr&&cr.endorse&&cr.endorse.length);}
window._picEligible=_picEligible;window._crewForUser=_crewForUser;
// ── Light / dark theme ── persisted in localStorage, applied to <html data-theme>. Dark is the
// default (no attribute); light is opt-in. An early inline script in head.html applies the saved
// choice before first paint to avoid a flash.
function _themeIsLight(){try{return document.documentElement.getAttribute('data-theme')==='light';}catch(e){return false;}}
window._themeIsLight=_themeIsLight;
window.toggleTheme=function(){
  try{
    if(_themeIsLight()){document.documentElement.removeAttribute('data-theme');localStorage.setItem('ts_theme','dark');}
    else{document.documentElement.setAttribute('data-theme','light');localStorage.setItem('ts_theme','light');}
  }catch(e){}
  if(typeof render==='function')render();
};
// ── Mute all sound ── persisted in localStorage 'ts_muted'. When on, every in-app chime/beep and
// vibration is suppressed (see _rzChimeBeep / _notifChime). Off by default.
function _soundMuted(){try{return localStorage.getItem('ts_muted')==='1';}catch(e){return false;}}
window._soundMuted=_soundMuted;
window.toggleMute=function(){
  try{localStorage.setItem('ts_muted',_soundMuted()?'0':'1');}catch(e){}
  if(typeof toast==='function')toast(_soundMuted()?'All sound muted 🔇':'Sound on 🔔',_soundMuted()?'info':'ok');
  if(typeof render==='function')render();
};
// ── Per-device sound preferences (User Preferences page) ──
// Which chime to play (id into _RZ_CHIMES, see rezdy_b.js); default 'classic'. And whether NEW
// notifications play a sound at all (separate from the master mute). Both per-device in localStorage.
function _chimeGet(){try{return localStorage.getItem('ts_chime')||'classic';}catch(e){return 'classic';}}
function _chimeSet(id){try{localStorage.setItem('ts_chime',String(id||'classic'));}catch(e){}}
function _notifSoundOn(){try{return localStorage.getItem('ts_notif_sound')!=='0';}catch(e){return true;}}   // default ON
window._chimeGet=_chimeGet;window._chimeSet=_chimeSet;window._notifSoundOn=_notifSoundOn;
window.setChime=function(id){_chimeSet(id);if(typeof window.previewChime==='function')window.previewChime(id);if(typeof toast==='function')toast('Notification chime set','ok');if(typeof render==='function')render();};
window.toggleNotifSound=function(){try{localStorage.setItem('ts_notif_sound',_notifSoundOn()?'0':'1');}catch(e){}if(typeof toast==='function')toast(_notifSoundOn()?'Notification sounds on 🔔':'Notification sounds off 🔕',_notifSoundOn()?'ok':'info');if(typeof render==='function')render();};
// True while the Admin > Permissions grid is actively on screen (renderAdminPerms bumps
// S._permsPageTs on every render). While editing, background reloads must NOT overwrite
// S.rolePerms or they wipe unsaved ticks (the 5s edit-timer alone is not enough — a
// reconnect or another device's write can fire a reload long after the last tick).
function _editingPerms(){return Date.now()-(S._permsPageTs||0)<12000;}

const GRP_COLOURS=['#3b82f6','#ec4899','#10b981','#f59e0b','#8b5cf6','#f97316','#06b6d4','#84cc16','#ef4444','#6366f1'];
// Airport map: ICAO → full name
var APTS={};var APT_COORDS={};var APS=[];
// Default featured aerodromes — used only until the user-managed list (Aerodromes
// settings → ⭐) loads. The settings list is the source of truth; see _featuredApts().
var _APT_PINNED=["NZQN","NZMF","NZMC","NZFJ"];
// The live featured list, in display order. Source of truth = ts_settings 'aero_featured'
// (shared across devices), mirrored to localStorage 'featured_aerodromes' for instant boot.
// Falls back to _APT_PINNED only when nothing has been saved yet.
function _featuredApts(){
  if(Array.isArray(S._aeroFeatured))return S._aeroFeatured;
  try{var v=lsGet("featured_aerodromes");
    if(Array.isArray(v)){S._aeroFeatured=v;return v;}
    if(typeof v==="string"&&v){var p=JSON.parse(v);if(Array.isArray(p)){S._aeroFeatured=p;return p;}}
  }catch(e){}
  return _APT_PINNED.slice();
}
// Persist the featured list locally + to the cloud (ts_settings) so every device shares it.
function _saveFeaturedApts(list){
  S._aeroFeatured=list.slice();
  try{lsSet("featured_aerodromes",S._aeroFeatured);}catch(e){}
  if(typeof sbU==="function"){
    try{sbU("ts_settings",[{key:"aero_featured",value:JSON.stringify(S._aeroFeatured)}]).then(function(r){if(r===null&&typeof toast==='function')toast('Featured aerodromes did not save to the server — check connection.','warn');});}catch(e){}
  }
}
function _getAllApts(){
  var base=typeof NZ_AERODROMES!=="undefined"?NZ_AERODROMES:[];
  var custom=[];
  try{var _ca=lsGet("custom_aerodromes");if(Array.isArray(_ca))custom=_ca;else if(typeof _ca==="string"&&_ca)custom=JSON.parse(_ca);}catch(e){}
  var map={};
  base.forEach(function(a){map[a.icao]=a;});
  custom.forEach(function(a){map[a.icao]=a;});
  return Object.values(map);
}
function _rebuildAptData(){
  var all=_getAllApts();
  APTS={};APT_COORDS={};
  all.forEach(function(a){APTS[a.icao]=a.name;APT_COORDS[a.icao]={lat:a.lat,lng:a.lon};});
  APS=Object.keys(APTS);
}
// Is this dep/dest value one of the known aerodromes? (Blank counts as known — no "Other" box.)
function _isKnownApt(v){if(!v)return true;if(!APS||!APS.length)_rebuildAptData();return APS.indexOf(v)>=0;}
// Departure/Destination select handler that supports a free-text "Other" location.
window.setRouteField=function(field,val){
  if(!S.dispatch)return;
  if(val==='__other__'){S['_rtOther_'+field]=true;if(_isKnownApt(S.dispatch[field]))S.dispatch[field]='';}
  else{S['_rtOther_'+field]=false;S.dispatch[field]=val;}
  autoSaveDispatch();safeRender();
};
// Same as setRouteField but for the LOADSHEET form (S.form), so dep/dest "Other" works there too.
window.setLsRouteField=function(field,val){
  if(!S.form)return;
  if(val==='__other__'){S['_lsOther_'+field]=true;if(_isKnownApt(S.form[field]))S.form[field]='';}
  else{S['_lsOther_'+field]=false;S.form[field]=val;}
  // Departure-driven fuel default: a Milford departure uses the reduced Milford fuel; changing
  // the departure back to anywhere else (e.g. Queenstown) restores the aircraft's standard fuel.
  var _fuelChanged=false;
  // Recompute the DEFAULT fuel when the route changes — UNLESS the pilot has manually typed a fuel
  // value, which always wins. (Milford = reduced, known product keeps its default, else the route.)
  if((field==='dep'||field==='dest')&&S.form.ac&&!S.form._fuelUserSet){
    var _rf=_lsDefaultFuelKg(S.form);
    if(_rf!=null){S.form.fuel=String(_rf);_fuelChanged=true;}
  }
  S.formDirty=true;if(typeof autoSaveLS==='function')autoSaveLS();
  // Route changes are discrete (no in-flight typing to clobber). When the fuel default just
  // changed, render immediately so the Fuel box updates on the FIRST click, not after several.
  if(_fuelChanged)render();else safeRender();
};
function aptOpts(sel, isOther){
  _rebuildAptData();
  var all=_getAllApts();
  var pinIcaos=_featuredApts();
  var pinned=pinIcaos.map(function(ic){return all.find(function(a){return a.icao===ic;});}).filter(Boolean);
  var rest=all.filter(function(a){return pinIcaos.indexOf(a.icao)<0;});
  var south=rest.filter(function(a){return a.lat<=-41.35;}).sort(function(a,b){return a.name<b.name?-1:a.name>b.name?1:0;});
  var north=rest.filter(function(a){return a.lat>-41.35;}).sort(function(a,b){return a.name<b.name?-1:a.name>b.name?1:0;});
  function opt(a){var lbl=(a.icao==='NZQN'?'\uD83C\uDFE0 ':'')+a.name+' ('+a.icao+')';return '<option value="'+a.icao+'"'+(sel===a.icao?' selected':'')+'>'+lbl+'</option>';}
  // "Other\u2026" (free-text) at the top of Featured \u2014 only for callers that handle it (manifest /
  // loadsheet pass the isOther flag). Callers that don't (e.g. charter legs) omit the arg.
  var otherOpt=(isOther!==undefined)?'<option value="__other__"'+(isOther?' selected':'')+'>\u270F\uFE0F Other\u2026</option>':'';
  return '<optgroup label="* Featured">'+otherOpt+pinned.map(opt).join('')+'</optgroup>'
    +'<optgroup label="South Island">'+south.map(opt).join('')+'</optgroup>'
    +'<optgroup label="North Island">'+north.map(opt).join('')+'</optgroup>';
}
const APP_VER='v28.76';
const AC_COL={
  "ZK-SLA":"#a75aba","ZK-SLB":"#7c7c7c","ZK-SLD":"#48925f","ZK-SLQ":"#4a99d2","ZK-SDB":"#e3683e"
};
const CREW_DEF=[{id:'c1',name:"P. Daniell",weight:104},{id:'c2',name:"A. Adamson",weight:110},{id:'c3',name:"T. Patel",weight:89},{id:'c4',name:"J. Yang",weight:73},{id:'c5',name:"L. McLean",weight:70},{id:'c6',name:"L. Hancock",weight:96},{id:'c7',name:"D. Ogden",weight:85},{id:'c9',name:"J. Cooper",weight:89},{id:'c10',name:"M. Stott",weight:62},{id:'c11',name:"L. Vincent",weight:68}];
const AC_DEF={
  "ZK-SLD":{id:"ZK-SLD",name:"ZK-SLD",type:"GA-8 Airvan",ew:1059.91,ea:52.46,em:55603.546,mtow:1905,mlw:1860,mrw:1906,cogMin:42,cogMax:64,cogEnv:[{w:1000,fwd:48,aft:64},{w:1089,fwd:48,aft:64},{w:1905,fwd:57,aft:64}],fuelKg:108,fuelArm:67.5,gndBurn:1,burnDef:35,burnDefUnit:'l',seats:[{lbl:"PIC",arm:38,crew:true},{lbl:"Seat 1",arm:38},{lbl:"Seat 2",arm:69.8},{lbl:"Seat 3",arm:69.8},{lbl:"Seat 4",arm:99.3},{lbl:"Seat 5",arm:99.3},{lbl:"Seat 6",arm:127.8},{lbl:"Seat 7",arm:127.8}],cargo:[{lbl:"Baggage Shelf",arm:148.3,maxKg:9}],doc:"FMSSLDRev.#110626",layout:"ga8",fuelOver:20},
  "ZK-SLQ":{id:"ZK-SLQ",name:"ZK-SLQ",type:"GA-8 Airvan",ew:1064.9,ea:53.15,em:56599.77,mtow:1905,mlw:1860,mrw:1906,cogMin:42,cogMax:64,cogEnv:[{w:1000,fwd:48,aft:64},{w:1089,fwd:48,aft:64},{w:1905,fwd:57,aft:64}],fuelKg:108,fuelArm:67.5,gndBurn:1,burnDef:35,burnDefUnit:'l',seats:[{lbl:"PIC",arm:38,crew:true},{lbl:"Seat 1",arm:38},{lbl:"Seat 2",arm:69.8},{lbl:"Seat 3",arm:69.8},{lbl:"Seat 4",arm:99.3},{lbl:"Seat 5",arm:99.3},{lbl:"Seat 6",arm:127.8},{lbl:"Seat 7",arm:127.8}],cargo:[{lbl:"Baggage Shelf",arm:148.3,maxKg:9}],doc:"FMSSLQRev.#110626",layout:"ga8",fuelOver:20},
  "ZK-SLA":{id:"ZK-SLA",name:"ZK-SLA",type:"C-208B Grand Caravan",ew:2384.58,ea:192.24,em:458411.659,mtow:3968,mlw:3856,mrw:3969,cogMin:182.57,cogMax:204.4,cogEnv:[{w:2200,fwd:179.60,aft:204.35},{w:2495,fwd:179.60,aft:204.35},{w:3629,fwd:193.37,aft:204.35},{w:3969,fwd:199.15,aft:204.35}],fuelKg:363,fuelArm:201.98,gndBurn:11.34,burnDef:187,burnDefUnit:'lbs',seats:[{lbl:"PIC",arm:133.5,crew:true},{lbl:"Seat 1",arm:133.5},{lbl:"Seat 2",arm:173.5},{lbl:"Seat 3",arm:173.5},{lbl:"Seat 4",arm:203.36},{lbl:"Seat 5",arm:203.36},{lbl:"Seat 6",arm:234.35},{lbl:"Seat 7",arm:234.35},{lbl:"Seat 8",arm:264.35},{lbl:"Seat 9",arm:264.35},{lbl:"Seat 10",arm:294.15},{lbl:"Seat 11",arm:294.15},{lbl:"Seat 12",arm:343},{lbl:"Seat 13",arm:343}],cargo:[{lbl:"Pod Zone 1",arm:132.4},{lbl:"Pod Zone 2",arm:182.1},{lbl:"Pod Zone 3",arm:233.4},{lbl:"Pod Zone 4",arm:287.6}],doc:"FMSSLARev.#110626",layout:"c208",fuelOver:50},
  "ZK-SDB":{id:"ZK-SDB",name:"ZK-SDB",type:"C-208B Grand Caravan",ew:2460.17,ea:192.958,em:474709.483,mtow:4110,mlw:4082,mrw:4111,cogMin:183.49,cogMax:204.4,fuelKg:363,fuelArm:203.1,gndBurn:11.34,burnDef:187,burnDefUnit:'lbs',seats:[{lbl:"PIC",arm:135.5,crew:true},{lbl:"Seat 1",arm:135.5},{lbl:"Seat 2",arm:176.9},{lbl:"Seat 3",arm:176.9},{lbl:"Seat 4",arm:211.9},{lbl:"Seat 5",arm:211.9},{lbl:"Seat 6",arm:246.9},{lbl:"Seat 7",arm:246.9},{lbl:"Seat 8",arm:281.9},{lbl:"Seat 9",arm:281.9},{lbl:"Seat 10",arm:344},{lbl:"Seat 11",arm:344}],cargo:[{lbl:"Pod Zone 1",arm:132.4},{lbl:"Pod Zone 2",arm:182.1},{lbl:"Pod Zone 3",arm:233.4},{lbl:"Pod Zone 4",arm:287.6}],doc:"FMSSDBRev.#110626B",layout:"c208",fuelOver:50},
  "ZK-SLB":{id:"ZK-SLB",name:"ZK-SLB",type:"C-208B Grand Caravan",ew:2340.91,ea:190.01,em:444796.309,mtow:3968,mlw:3856,mrw:3969,cogMin:181.71,cogMax:204.4,cogEnv:[{w:2200,fwd:179.60,aft:204.35},{w:2495,fwd:179.60,aft:204.35},{w:3629,fwd:193.37,aft:204.35},{w:3969,fwd:199.15,aft:204.35}],fuelKg:363,fuelArm:201.98,gndBurn:11.34,burnDef:187,burnDefUnit:'lbs',seats:[{lbl:"PIC",arm:133.5,crew:true},{lbl:"Seat 1",arm:133.5},{lbl:"Seat 2",arm:173.5},{lbl:"Seat 3",arm:173.5},{lbl:"Seat 4",arm:203.36},{lbl:"Seat 5",arm:203.36},{lbl:"Seat 6",arm:234.35},{lbl:"Seat 7",arm:234.35},{lbl:"Seat 8",arm:264.35},{lbl:"Seat 9",arm:264.35},{lbl:"Seat 10",arm:294.15},{lbl:"Seat 11",arm:294.15},{lbl:"Seat 12",arm:343},{lbl:"Seat 13",arm:343}],removedSeats:[12,13],cargo:[{lbl:"Pod Zone 1",arm:132.4},{lbl:"Pod Zone 2",arm:182.1},{lbl:"Pod Zone 3",arm:233.4},{lbl:"Pod Zone 4",arm:287.6}],doc:"FMSSLBRev.#110626",layout:"c208",fuelOver:50}
};
const CHARTER_RATES_DEF={
  "ZK-SLD":{perHour:2500,minHours:1,currency:'NZD'},
  "ZK-SLQ":{perHour:2500,minHours:1,currency:'NZD'},
  "ZK-SLA":{perHour:4500,minHours:1,currency:'NZD'},
  "ZK-SDB":{perHour:5000,minHours:1,currency:'NZD'},
  "ZK-SLB":{perHour:4500,minHours:1,currency:'NZD'},
};
// Resolve the effective charter rate for an aircraft. Prefers the configured rate, but
// falls back to the built-in default whenever the stored rate is missing or has no positive
// $/hr — so the calculator never silently zeroes out leg costs when rates fail to load
// (e.g. an empty cloud read landing on a stale cache that has perHour:0).
function charterRate(acId){
  if(!acId)return null;
  var r=(S.charterRates||{})[acId];
  if(r&&parseFloat(r.perHour)>0)return r;
  var def=CHARTER_RATES_DEF[acId];
  // No usable configured rate: use the built-in default if we have one, else null so the
  // leg is simply omitted from pricing rather than billed at $0 (avoids a misleading total).
  return def?dc(def):null;
}
function distNm(a,b){if(!Object.keys(APT_COORDS).length)_rebuildAptData();const A=APT_COORDS[a],B=APT_COORDS[b];if(!A||!B)return 0;const R=3440,dLat=(B.lat-A.lat)*Math.PI/180,dLng=(B.lng-A.lng)*Math.PI/180,s=Math.sin(dLat/2)**2+Math.cos(A.lat*Math.PI/180)*Math.cos(B.lat*Math.PI/180)*Math.sin(dLng/2)**2;return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));}


// ── Utility ──
const dc=x=>JSON.parse(JSON.stringify(x));
const ap=k=>APS.map(x=>`<option value="${x}"${S[k]===x||''?' selected':''}>${x}</option>`).join('');
function paxById(id){var d=curDisp();return(d&&d.pax||[]).find(p=>p.id===id);}
function groupColor(g,paxList){const gs=[...new Set((paxList||(curDisp()||{}).pax||[]).map(p=>p.group).filter(Boolean))];const i=gs.indexOf(g);return i>=0?GRP_COLOURS[i%GRP_COLOURS.length]:'#64748b';}
// Seatmap instances: a seatMap key (smKey) may be a physical aircraft id ("ZK-SLA")
// or a duplicate-instance key ("ZK-SLA_2"). _ac() resolves any key to its physical
// aircraft id so spec/layout lookups (S.aircraft[...]) always work.
function _ac(key){if(!key)return key;if(S.aircraft[key])return key;var s=((curDisp()||{}).acSetup||[]).find(function(x){return (x._seatmapKey||x.acId)===key;});if(s&&S.aircraft[s.acId])return s.acId;return String(key).replace(/_\d+$/,'');}
// Canonical aircraft-display helper (single definition — was previously duplicated in admin.js + maintenance.js).
function acDisp(id){return(id||"").replace("ZK-","");}
function _acSpec(acId){return S.aircraft[acId]||S.aircraft[_ac(acId)];}
function fuelUnit(acId){return _acSpec(acId)?.layout==='ga8'?'L':'lbs';}
function toKg(v,acId){const n=parseFloat(v)||0;const a=_acSpec(acId);if(!a)return n;return a.layout==='ga8'?n*AVGAS:n*LB;}
function fromKg(kg,acId){return _acSpec(acId)?.layout==='ga8'?kg/AVGAS:kg/LB;}
function fuelKgForSetup(acId){const a=_acSpec(acId);if(!a)return 0;const s=(curDisp().acSetup||[]).find(x=>(x._seatmapKey||x.acId)===acId||x.acId===acId);const raw=s?.fuelInput!=null?s.fuelInput:fromKg(a.fuelKg,acId);return toKg(raw,acId);}
// ── Milford Sound departure fuel default ── a Milford departure (the flyback return leg) carries
// less fuel: 115 L for an airvan (GA8) / 613 lb for a caravan (C208). Returns kg.
function _isMilford(code){return code==='NZMF'||/milford/i.test(String(code||''));}
function _milfordFuelKg(acId){const a=_acSpec(acId);if(!a)return null;return a.layout==='ga8'?toKg(115,acId):toKg(613,acId);}
// Route-based default fuel (kg). Departing Milford (the flyback) carries the reduced load; a Mount
// Cook (NZMC) or Franz Josef (NZFJ) destination needs more (210 L airvan / 1000 lb caravan);
// everything else uses the aircraft's standard fuel.
function _lsRouteFuelKg(acId,dep,dest){
  const a=_acSpec(acId);if(!a)return null;
  if(_isMilford(dep))return a.layout==='ga8'?toKg(115,acId):toKg(613,acId);
  const d=String(dest||'').toUpperCase();
  if(d==='NZMC'||d==='NZFJ'||/mount.*cook|pukaki|franz/i.test(d))return a.layout==='ga8'?toKg(210,acId):toKg(1000,acId);
  return a.fuelKg;
}
window._lsRouteFuelKg=_lsRouteFuelKg;
// The DEFAULT fuel (kg) for a loadsheet form: Milford departure → reduced; a known product →
// its product default; else the route default. (Used unless the pilot has manually set fuel.)
function _lsDefaultFuelKg(form){
  if(!form||!form.ac)return null;
  if(_isMilford(form.dep))return _milfordFuelKg(form.ac);
  if(form.product&&typeof _rzProdFuelKg==='function'){var pf=_rzProdFuelKg(form.product,form.ac);if(pf!=null)return pf;}
  return _lsRouteFuelKg(form.ac,form.dep,form.dest);
}
window._lsDefaultFuelKg=_lsDefaultFuelKg;
// VFR final reserve = 30 min at the cruise burn rate the loadsheet uses (58 L/hr airvan, 136.1 kg/hr
// caravan). Returned in kg so it compares directly against fuel-remaining-at-destination.
function _finalReserveKg(acId){const a=_acSpec(acId);if(!a)return 0;return a.layout==='ga8'?toKg(29,acId):68.05;}
window._isMilford=_isMilford;window._milfordFuelKg=_milfordFuelKg;window._finalReserveKg=_finalReserveKg;
function burnToKg(v,acId){const a=_acSpec(acId);if(!a)return parseFloat(v)||0;const val=parseFloat(v)||0;if(a.burnDefUnit==='lbs') return val*LB;if(a.layout==='ga8'||a.burnDefUnit==='l'||a.burnDefUnit==='litres') return val*AVGAS;if(a.burnDefUnit==='kg') return val;return val*LB;}
function seat1IsCoPilot(acId){return !!((curDisp().acSetup||[]).find(s=>(s._seatmapKey||s.acId)===acId||s.acId===acId)?.coPilot);}
// coSeat1 (optional) forces seat 1 to be reserved for a co-pilot regardless of the legacy dispatch
// (used by the Rezdy seatmap, whose co-pilot lives in S._rzManCoPic, not curDisp().acSetup).
function paxSeatIdxs(acId,coSeat1){const a=_acSpec(acId);if(!a||!a.seats)return[];const removed=a.removedSeats||[];const co=(coSeat1==null)?seat1IsCoPilot(acId):coSeat1;return a.seats.map((_,i)=>i).filter(i=>i!==0&&!(i===1&&co)&&!removed.includes(i));}

// Row pairs = seats at same arm (same physical row)
function rowPairsForAc(acId,coSeat1){
  const a=_acSpec(acId);if(!a||!a.seats)return[];
  const idxs=paxSeatIdxs(acId,coSeat1);
  const byArm={};
  idxs.forEach(i=>{if(!a.seats[i])return;const k=a.seats[i].arm.toFixed(4);if(!byArm[k])byArm[k]=[];byArm[k].push(i);});
  return Object.entries(byArm).sort((a,b)=>parseFloat(a[0])-parseFloat(b[0])).map(([,v])=>[...v].sort((a,b)=>a-b));
}

// ── Lap-infant seating rule ──────────────────────────────────────────────────
// A lap infant (and the adult holding it) must NOT occupy the front passenger seat
// (seat 1 — beside the pilot). Auto-seating prefers the LAST ROW for an infant host
// when weight & balance still checks out.
function _lsFrontSeatIdx(){return 1;}                       // front pax seat (beside the pilot)
function _lsInfantFrontBlocked(form,toIdx,hasInfant){return parseInt(toIdx,10)===_lsFrontSeatIdx()&&!!hasInfant;}
// Rearmost passenger seats (last physical row).
function _lastRowSeats(acId,coSeat1){var rows=rowPairsForAc(acId,coSeat1);return rows.length?rows[rows.length-1].slice():[];}
// Swap EVERY per-seat field between two seats (names/weights/bags/groups/infants/type/pay) so a
// passenger never leaves part of itself behind (the recurring "move-bug" class).
function _lsSwapSeats(form,i,j){['names','seats','bags','paxGroups','infantNames','paxType','paxPaymentReq'].forEach(function(m){var o=form[m];if(!o)return;var hi=Object.prototype.hasOwnProperty.call(o,i),hj=Object.prototype.hasOwnProperty.call(o,j),a=hi?o[i]:undefined,b=hj?o[j]:undefined;if(hj)o[i]=b;else delete o[i];if(hi)o[j]=a;else delete o[j];});}
// W&B within all limits for a form?
function _lsWBOk(form){var r=calcFormWB(form);return !!(r&&r.towOk&&r.lwOk&&r.cogOk);}
// HARD: vacate the front seat if a lap-infant host landed there. Prefer a rear, W&B-OK target; if
// none keeps W&B, still move it (the front-seat bar is mandatory) to the rearmost free seat.
function _lsInfantFrontGuard(form,acId,coSeat1){
  var front=_lsFrontSeatIdx();if(coSeat1)return;            // seat 1 is the co-pilot — no pax there
  if(!form||!form.infantNames||!form.infantNames[front])return;
  var a=_acSpec(acId);if(!a||!a.seats)return;var removed=a.removedSeats||[];
  var cands=[];for(var s=2;s<a.seats.length;s++){if(removed.indexOf(s)>=0)continue;cands.push(s);}
  cands.sort(function(x,y){return (a.seats[y].arm||0)-(a.seats[x].arm||0);});  // rear first
  var k,j;
  for(k=0;k<cands.length;k++){j=cands[k];if(form.infantNames[j])continue;_lsSwapSeats(form,front,j);if(_lsWBOk(form))return;_lsSwapSeats(form,front,j);}
  for(k=0;k<cands.length;k++){j=cands[k];if(form.infantNames[j])continue;_lsSwapSeats(form,front,j);return;}  // mandatory move (W&B may need a manual fix)
}
// SOFT: move each lap-infant host to the last row when W&B still checks out.
function _lsInfantRearPref(form,acId,coSeat1){
  var a=_acSpec(acId);if(!a||!a.seats||!form||!form.infantNames)return;
  var lastRow=_lastRowSeats(acId,coSeat1);if(!lastRow.length)return;
  var inLast={};lastRow.forEach(function(s){inLast[s]=1;});
  var hosts=Object.keys(form.infantNames).filter(function(i){return form.infantNames[i]!=null&&form.infantNames[i]!=='';}).map(function(i){return parseInt(i,10);});
  hosts.forEach(function(i){
    if(inLast[i])return;
    for(var k=0;k<lastRow.length;k++){var j=lastRow[k];if(j===i||j===0)continue;if(coSeat1&&j===1)continue;if(form.infantNames[j])continue;
      _lsSwapSeats(form,i,j);if(_lsWBOk(form))return;_lsSwapSeats(form,i,j);}
  });
}
window._lsInfantFrontBlocked=_lsInfantFrontBlocked;window._lsInfantFrontGuard=_lsInfantFrontGuard;window._lsInfantRearPref=_lsInfantRearPref;
// Keep a lap-infant host out of the front passenger seat on a raw seat map (idx → pax id). Used
// for engines that don't guard internally (assignSeats). paxList entries carry an `infant` flag.
function _seatMapInfantGuard(sm,acId,paxList,coSeat1){
  var a=_acSpec(acId);if(!a||!a.seats||!sm)return sm;
  var idxs=paxSeatIdxs(acId,coSeat1);if(!idxs.length)return sm;
  var seatsByArm=idxs.slice().sort(function(x,y){return ((a.seats[x]&&a.seats[x].arm)||999)-((a.seats[y]&&a.seats[y].arm)||999);});
  var front=seatsByArm[0];
  var hasSeat1=(coSeat1!=null)?!coSeat1:!seat1IsCoPilot(acId);
  if(!hasSeat1)return sm;                                     // co-pilot occupies the front seat — no pax there
  var isInf=function(id){var p=(paxList||[]).find(function(x){return x.id===id;});return !!(p&&p.infant);};
  if(sm[front]!=null&&isInf(sm[front])){
    var others=Object.keys(sm).map(Number).filter(function(s){return s!==front&&!isInf(sm[s]);});
    others.sort(function(x,y){return ((a.seats[y]&&a.seats[y].arm)||0)-((a.seats[x]&&a.seats[x].arm)||0);});
    if(others.length){var j=others[0],t=sm[front];sm[front]=sm[j];sm[j]=t;}
    else{var empt=seatsByArm.filter(function(s){return s!==front&&sm[s]==null;});empt.sort(function(x,y){return ((a.seats[y]&&a.seats[y].arm)||0)-((a.seats[x]&&a.seats[x].arm)||0);});if(empt.length){sm[empt[0]]=sm[front];delete sm[front];}}
  }
  return sm;
}
window._seatMapInfantGuard=_seatMapInfantGuard;

// CoG status → pill class (shared by the loadsheet W&B readout). Relocated from the retired
// legacy manifest module so loadsheet.js keeps a live home for it.
function cogPillClass(cog, cogMin, cogMax){
  if(!cog||!cogMax) return 'pill-blue';   // unknown CoG (no data / misconfigured aircraft) — neutral, not a reassuring green
  if(cog>cogMax||cog<cogMin) return 'pill-red';
  const range=cogMax-cogMin;
  const warnDist=range<100?1.0:1.4; // 1" airvan, 1.4" caravan
  const warnMin=cogMin+warnDist; const warnMax=cogMax-warnDist;
  const orangeDist=warnDist*0.5;
  const orangeMax=cogMax-orangeDist; const orangeMin=cogMin+orangeDist;
  if(cog>=orangeMax||cog<=orangeMin) return 'pill-orange';
  if(cog>=warnMax||cog<=warnMin) return 'pill-warn';
  return 'pill-green';
}

// ── W&B Calculations ──
function calcAcWB(acId,paxList,fuelKgOverride){
  const a=_acSpec(acId);if(!a)return null;
  const _D=curDisp();
  const setup=(_D.acSetup||[]).find(s=>(s._seatmapKey||s.acId)===acId||s.acId===acId);
  const picW=setup?S.crew.find(c=>c.n===setup.pic)?.w||0:0;
  let wt=a.ew+picW,mom=a.em+picW*a.seats[0].arm;
  if(seat1IsCoPilot(acId)){const cp=S.crew.find(c=>c.n===setup.coPilot);if(cp){wt+=cp.w;mom+=cp.w*a.seats[1].arm;}}
  // Use seat assignment from seatMap for proper arm calc
  const sm=(_D.seatMap||{})[acId]||{};
  paxSeatIdxs(acId).forEach(i=>{const p=sm[i]?paxById(sm[i]):null;if(p){const w=parseFloat(p.weight||0)+parseFloat(p.bag||0);wt+=w;mom+=w*a.seats[i].arm;}});
  const fW=fuelKgOverride!=null?fuelKgOverride:fuelKgForSetup(acId);
  wt+=fW;mom+=fW*a.fuelArm;const _gndBurn=parseFloat(a.gndBurn)||0;wt-=_gndBurn;mom-=_gndBurn*a.fuelArm;
  const tow=wt,cog=wt?mom/wt:0,burnKg=burnToKg(a.burnDef,acId);
  wt-=burnKg;mom-=burnKg*a.fuelArm;
  return{tow,cog,lw:wt,lwCog:wt?mom/wt:0,
    towOk:tow<=a.mtow,lwOk:wt<=a.mlw,cogOk:cog>=a.cogMin&&cog<=a.cogMax,
    towOver:Math.max(0,tow-a.mtow),lwOver:Math.max(0,wt-a.mlw),
    mtow:a.mtow,mlw:a.mlw,cogMin:a.cogMin,cogMax:a.cogMax};
}

function calcFormWB(form){
  const a=S.aircraft[form.ac];if(!a)return null;
  if(!a.seats||!a.seats.length||!a.seats[0]||!a.cargo)return null; // partial/corrupt aircraft record → no W&B (don't crash)
  const cW=parseFloat(form.seats[0]||0);
  // Co-pilot (seat 1) weight counts as crew when a co-pilot is assigned
  const cpW=form.coPilot?(parseFloat(form.seats[1]||0))+(parseFloat(form.bags[1]||0)):0;
  let wt=a.ew+cW,mom=a.em+cW*a.seats[0].arm,pW=0;
  for(let i=1;i<a.seats.length;i++){const w=(parseFloat(form.seats[i]||0))+(parseFloat(form.bags[i]||0));if(i===1&&form.coPilot){/* crew */}else{pW+=w;}wt+=w;mom+=w*a.seats[i].arm;}
  let cg=0;for(let i=0;i<a.cargo.length;i++){const w=parseFloat((form.cargo&&form.cargo[i])||0);cg+=w;wt+=w;mom+=w*a.cargo[i].arm;}
  const zfw=wt,fW=parseFloat(form.fuel||a.fuelKg);wt+=fW;mom+=fW*a.fuelArm;const rW=wt;
  // Honour the editable per-loadsheet ground-burn override (falls back to the aircraft spec default).
  const gndBurn=parseFloat(form.gndBurn!=null?form.gndBurn:a.gndBurn)||0;
  wt-=gndBurn;mom-=gndBurn*a.fuelArm;
  const tow=wt,towCog=wt?mom/wt:0;
  const burnKg=form.burnOff?burnToKg(parseFloat(form.burnOff)||0,form.ac):burnToKg(a.burnDef,form.ac);
  wt-=burnKg;mom-=burnKg*a.fuelArm;
  // Fuel remaining at destination must stay at/above the 30-min final reserve.
  const fuelRemKg=fW-gndBurn-burnKg;const finalReserveKg=_finalReserveKg(form.ac);const reserveOk=fuelRemKg>=finalReserveKg;
  // CoG gate uses the flight-manual ENVELOPE when one exists for the aircraft (the forward limit moves
  // aft with weight) — effective fwd/aft limits at the TAKEOFF weight; falls back to the rectangular
  // cogMin/cogMax for aircraft with no envelope entered yet. cogMin/cogMax in the result are these
  // effective limits, so every readout (pill, badge, "forward of limit" warning) follows automatically.
  var _env=(typeof _wbEnvAt==='function')?_wbEnvAt(a,tow):null;
  var _cogMin=_env?_env.fwd:a.cogMin,_cogMax=_env?_env.aft:a.cogMax;
  var _lwe=(typeof _wbEnvAt==='function')?_wbEnvAt(a,wt):null;   // landing-weight limits (advisory landing check)
  var _lwCog=wt?mom/wt:0;
  var _cogOk=towCog>=_cogMin&&towCog<=_cogMax&&(!_lwe||(_lwCog>=_lwe.fwd&&_lwCog<=_lwe.aft));
  return{crewW:cW+cpW,paxW:pW,cargoW:cg,zfw,fuelW:fW,rampW:rW,gndBurn,tow,towCog,burnKg,lw:wt,lwCog:_lwCog,
    fuelRemKg,finalReserveKg,reserveOk,envelope:!!_env,
    towOk:tow<=a.mtow,lwOk:wt<=a.mlw,cogOk:_cogOk,
    mtow:a.mtow,mlw:a.mlw,cogMin:_cogMin,cogMax:_cogMax};
}

// ── CoG envelope (flight-manual polygon) ──────────────────────────────────────────────────────────
// a.cogEnv = [{w,fwd,aft}, …] (weight kg, forward & aft CoG limit in inches at that weight) — the
// loaded envelope read straight off the flight manual. When present it's drawn as the true polygon AND
// (since v27.76) drives the SIGNING GATE: calcFormWB.cogOk uses the effective fwd/aft limits at the
// takeoff weight (plus an advisory landing-weight check). Aircraft with no envelope entered fall back to
// the rectangular cogMin/cogMax + MTOW/MLW.
function _wbEnvRows(a){var e=a&&a.cogEnv;
  // Cloud-stored aircraft saved before envelopes existed won't carry cogEnv — fall back to the baked-in
  // flight-manual default for that tail (only when none is set at all; an explicit empty array is honoured).
  if(e==null&&a&&a.id&&typeof AC_DEF!=='undefined'&&AC_DEF[a.id])e=AC_DEF[a.id].cogEnv;
  if(!Array.isArray(e))return null;var r=e.filter(function(p){return p&&isFinite(+p.w)&&isFinite(+p.fwd)&&isFinite(+p.aft);}).map(function(p){return {w:+p.w,fwd:+p.fwd,aft:+p.aft};}).sort(function(x,y){return x.w-y.w;});return r.length>=2?r:null;}
function _wbEnvAt(a,weight){var rows=_wbEnvRows(a);if(!rows)return null;weight=+weight;
  if(weight<=rows[0].w)return {fwd:rows[0].fwd,aft:rows[0].aft};
  if(weight>=rows[rows.length-1].w)return {fwd:rows[rows.length-1].fwd,aft:rows[rows.length-1].aft};
  for(var i=1;i<rows.length;i++){if(weight<=rows[i].w){var p0=rows[i-1],p1=rows[i],t=(weight-p0.w)/((p1.w-p0.w)||1);return {fwd:p0.fwd+(p1.fwd-p0.fwd)*t,aft:p0.aft+(p1.aft-p0.aft)*t};}}
  return null;}
function _wbInEnv(a,cog,weight){var e=_wbEnvAt(a,weight);if(!e)return null;return cog>=e.fwd-1e-6&&cog<=e.aft+1e-6;}
// Build the loadsheet's CoG envelope graph (SVG) — envelope polygon (or the rectangular limit box if no
// flight-manual envelope is entered yet) with the Takeoff (●) and Landing (○) points plotted on it.
function _wbEnvelopeSVG(acId,r){
  var a=S.aircraft[acId];if(!a||!r||r.towCog==null)return '';
  var rows=_wbEnvRows(a);
  var xs=[],ys=[];
  if(rows){rows.forEach(function(p){xs.push(p.fwd,p.aft);ys.push(p.w);});}
  else{xs.push(a.cogMin,a.cogMax);ys.push(a.ew||0,a.mtow);}
  xs.push(r.towCog,r.lwCog);ys.push(r.tow,r.lw,a.mtow,a.mlw,a.ew||0);
  var xmin=Math.min.apply(null,xs),xmax=Math.max.apply(null,xs),ymin=Math.min.apply(null,ys),ymax=Math.max.apply(null,ys);
  var xpad=((xmax-xmin)*0.12)||1,ypad=((ymax-ymin)*0.08)||50;xmin-=xpad;xmax+=xpad;ymin-=ypad;ymax+=ypad;
  var W=340,H=250,padL=46,padR=10,padT=12,padB=28;
  function X(c){return padL+(c-xmin)/((xmax-xmin)||1)*(W-padL-padR);}
  function Y(w){return padT+(ymax-w)/((ymax-ymin)||1)*(H-padT-padB);}
  var poly;
  if(rows){var pts=[];rows.forEach(function(p){pts.push([X(p.fwd),Y(p.w)]);});for(var i=rows.length-1;i>=0;i--)pts.push([X(rows[i].aft),Y(rows[i].w)]);poly=pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');}
  else{poly=[[X(a.cogMin),Y(a.ew||ymin)],[X(a.cogMin),Y(a.mtow)],[X(a.cogMax),Y(a.mtow)],[X(a.cogMax),Y(a.ew||ymin)]].map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');}
  var towIn=rows?_wbInEnv(a,r.towCog,r.tow):(r.towCog>=a.cogMin&&r.towCog<=a.cogMax&&r.tow<=a.mtow);
  var lwIn=rows?_wbInEnv(a,r.lwCog,r.lw):(r.lwCog>=a.cogMin&&r.lwCog<=a.cogMax&&r.lw<=a.mlw);
  var s='<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="max-width:360px;display:block">';
  s+='<rect x="'+padL+'" y="'+padT+'" width="'+(W-padL-padR)+'" height="'+(H-padT-padB)+'" fill="none" stroke="var(--border2)" stroke-width="1"/>';
  s+='<polygon points="'+poly+'" fill="rgba(34,197,94,.13)" stroke="'+(rows?'#22c55e':'#94a3b8')+'" stroke-width="1.5"'+(rows?'':' stroke-dasharray="4 3"')+'/>';
  [['MTOW',a.mtow,'#ef4444'],['MLW',a.mlw,'#f59e0b']].forEach(function(L){var y=Y(L[1]);if(y>padT&&y<H-padB){s+='<line x1="'+padL+'" y1="'+y.toFixed(1)+'" x2="'+(W-padR)+'" y2="'+y.toFixed(1)+'" stroke="'+L[2]+'" stroke-width="1" stroke-dasharray="3 3"/><text x="'+(W-padR-2)+'" y="'+(y-2).toFixed(1)+'" text-anchor="end" font-size="8" fill="'+L[2]+'">'+L[0]+'</text>';}});
  s+='<line x1="'+X(r.towCog).toFixed(1)+'" y1="'+Y(r.tow).toFixed(1)+'" x2="'+X(r.lwCog).toFixed(1)+'" y2="'+Y(r.lw).toFixed(1)+'" stroke="var(--text3)" stroke-width="1" stroke-dasharray="2 2"/>';
  s+='<circle cx="'+X(r.lwCog).toFixed(1)+'" cy="'+Y(r.lw).toFixed(1)+'" r="4" fill="var(--card)" stroke="'+(lwIn?'#22c55e':'#ef4444')+'" stroke-width="2"/>';
  s+='<circle cx="'+X(r.towCog).toFixed(1)+'" cy="'+Y(r.tow).toFixed(1)+'" r="5" fill="'+(towIn?'#22c55e':'#ef4444')+'"/>';
  s+='<text x="'+((padL+W-padR)/2).toFixed(0)+'" y="'+(H-5)+'" text-anchor="middle" font-size="9" fill="var(--text3)">CoG (in)</text>';
  s+='<text x="11" y="'+((padT+H-padB)/2).toFixed(0)+'" text-anchor="middle" font-size="9" fill="var(--text3)" transform="rotate(-90 11 '+((padT+H-padB)/2).toFixed(0)+')">Weight (kg)</text>';
  s+='<text x="'+padL+'" y="'+(H-padB+11)+'" text-anchor="middle" font-size="8" fill="var(--text3)">'+xmin.toFixed(0)+'″</text>';
  s+='<text x="'+(W-padR)+'" y="'+(H-padB+11)+'" text-anchor="end" font-size="8" fill="var(--text3)">'+xmax.toFixed(0)+'″</text>';
  s+='</svg>';
  s+='<div style="font-size:11px;color:var(--text3);margin-top:4px;line-height:1.6">'+
     '<span style="color:'+(towIn?'#22c55e':'#ef4444')+';font-weight:700">● Takeoff</span> '+r.tow.toFixed(0)+'kg @ '+r.towCog.toFixed(2)+'″'+(towIn?'':' <b>OUTSIDE</b>')+' &nbsp; '+
     '<span style="color:'+(lwIn?'#22c55e':'#ef4444')+';font-weight:700">○ Landing</span> '+r.lw.toFixed(0)+'kg @ '+r.lwCog.toFixed(2)+'″'+(lwIn?'':' <b>OUTSIDE</b>')+
     (rows?'':'<div style="color:#f59e0b;margin-top:3px">⚠ Rectangular limit box shown — add the flight-manual envelope points for '+_rzEscSafe2(a.type||acId)+' in Admin ▸ Aircraft to draw the true envelope.</div>')+
     '</div>';
  return s;
}
function _rzEscSafe2(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
// Score a candidate assignment (lower=better)
function scoreAssign(acId,paxList){
  const a=S.aircraft[acId];if(!a)return 1e9;
  const setup=(curDisp().acSetup||[]).find(s=>(s._seatmapKey||s.acId)===acId||s.acId===acId);
  const picW=setup?S.crew.find(c=>c.n===setup.pic)?.w||0:0;
  const cpW=seat1IsCoPilot(acId)?(anyCrewList().find(c=>c.n===setup?.coPilot)?.w||0):0;
  const fW=fuelKgForSetup(acId);
  const sm=assignSeats(acId,paxList);
  let wt=a.ew+picW+cpW,mom=a.em+picW*a.seats[0].arm;
  if(seat1IsCoPilot(acId))mom+=cpW*a.seats[1].arm;
  Object.entries(sm).forEach(([idx,pid])=>{const p=(curDisp().pax||[]).find(x=>x.id===pid)||paxList.find(x=>x.id===pid);if(!p)return;const w=parseFloat(p.weight||0)+parseFloat(p.bag||0);wt+=w;mom+=w*a.seats[parseInt(idx)].arm;});
  wt+=fW;mom+=fW*a.fuelArm;wt-=a.gndBurn;mom-=a.gndBurn*a.fuelArm;
  const tow=wt,cog=wt?mom/wt:0,wtOver=Math.max(0,tow-a.mtow);
  const cogMid=(a.cogMin+a.cogMax)/2,cogDev=Math.abs(cog-cogMid);
  const cogOver=cog<a.cogMin?a.cogMin-cog:cog>a.cogMax?cog-a.cogMax:0;
  return wtOver*1000+cogOver*500+cogDev;
}

// ── Seat Assignment Engine ──
// Rules: groups fill consecutive rows; heaviest groups front; solos to seat 1 if free; 
// co-pilot seat used for odd-group overflow if no co-pilot assigned
function assignSeats(acId,paxList,opts){
  const a=S.aircraft[acId];if(!a||!paxList.length)return{};
  const coPilot=(opts&&opts.coSeat1!=null)?opts.coSeat1:seat1IsCoPilot(acId); // reserve seat 1 for a co-pilot
  const rows=rowPairsForAc(acId,coPilot); // [[idx,idx],...]  front-to-back
  if(!rows.length)return{};

  const result={};
  const rowFree=rows.map(r=>[...r]); // mutable free slots per row

  // Build groups - preserve order pax were entered (don't sort by weight here; optimizer handles that)
  const gMap={};
  paxList.forEach(p=>{const g=p.group?.trim()||'\x00solo\x00'+p.id;if(!gMap[g])gMap[g]={pax:[],isSolo:!p.group?.trim()};gMap[g].pax.push(p);});
  // Put multi-person groups first (so they get priority for consecutive rows), solos last
  const groups=[...Object.values(gMap).filter(g=>!g.isSolo&&g.pax.length>1),
                 ...Object.values(gMap).filter(g=>g.isSolo||g.pax.length===1)];

  // Helper: remove slot from rowFree
  function removeSlot(slot){for(const rf of rowFree){const i=rf.indexOf(slot);if(i>=0){rf.splice(i,1);return;}}}

  // Place a group into consecutive rows from front
  function placeGroup(members){
    // Keep members in their original order
    const sorted=[...members];
    let rem=[...sorted];

    // Try to pack the group into consecutive rows without gaps
    for(let startRow=0;startRow<rowFree.length&&rem.length>0;startRow++){
      // Collect consecutive free slots starting at startRow
      const slots=[];
      let prevRowIdx=startRow-1;
      for(let r=startRow;r<rowFree.length&&slots.length<rem.length;r++){
        if(r>startRow&&r!==prevRowIdx+1)break; // non-consecutive
        rowFree[r].forEach(s=>slots.push({r,s}));
        prevRowIdx=r;
      }
      if(slots.length>=rem.length){
        // Check continuity: all rows used must be consecutive row indices
        const usedRows=[...new Set(slots.slice(0,rem.length).map(x=>x.r))];
        const consecutive=usedRows.every((r,i)=>i===0||r===usedRows[i-1]+1);
        if(consecutive){
          slots.slice(0,rem.length).forEach(({r,s},i)=>{result[s]=rem[i].id;rowFree[r].splice(rowFree[r].indexOf(s),1);});
          return true;
        }
      }
    }
    // Fallback: fill any free slots
    const allFree=rowFree.flat();
    rem.forEach((p,i)=>{if(i<allFree.length){result[allFree[i]]=p.id;removeSlot(allFree[i]);}});
    return false;
  }

  // Multi-person groups first
  groups.filter(g=>!g.isSolo&&g.pax.length>1).forEach(g=>placeGroup(g.pax));

  // Singles: prefer seat index 1 (co-pilot slot) if free and no co-pilot
  const solos=groups.filter(g=>g.isSolo||g.pax.length===1);
  if(!seat1IsCoPilot(acId)){
    const seat1Row=rowFree.find(r=>r.includes(1));
    solos.forEach(g=>{
      const p=g.pax[0];
      if(seat1Row&&seat1Row.includes(1)&&!result[1]){result[1]=p.id;removeSlot(1);}
      else{const allFree=rowFree.flat();if(allFree.length>0){result[allFree[0]]=p.id;removeSlot(allFree[0]);}}
    });
  } else {
    solos.forEach(g=>{placeGroup(g.pax);});
  }

  return result;
}



// Feasibility-first scoring using least-squares CoG optimisation.
// Key: check if ANY valid seating exists before scoring, and return
// score=1e9 immediately if the group assignment is mathematically infeasible.
function calcAcScore(acId, paxList, fuelKgOv){
  const a=S.aircraft[acId]; if(!a||!paxList.length) return {score:1e9,tow:0,cog:0,towOk:false,cogOk:false,towOver:0};
  const setup=S.dispatch.acSetup.find(s=>s.acId===acId);
  const picW=setup?S.crew.find(c=>c.n===setup.pic)?.w||0:0;
  const cpW=seat1IsCoPilot(acId)?(anyCrewList().find(c=>c.n===setup?.coPilot)?.w||0):0;
  const fW=fuelKgOv!=null?fuelKgOv:fuelKgForSetup(acId);
  const hasCoPilot=seat1IsCoPilot(acId);
  const cogTarget=(a.cogMin+a.cogMax)/2;

  // Seat arms for pax seats (index 0 = seat 1, index 1 = seat 2, etc)
  const paxSeats=paxSeatIdxs(acId); // e.g. [1,2,3,4,5,6,7] for airvan without copilot
  const seatArms=paxSeats.map(i=>a.seats[i].arm);

  // Base weight and moment (aircraft + crew + fuel, no pax)
  const baseWt=a.ew+picW+cpW+fW-a.gndBurn;
  let baseMom=a.em+picW*a.seats[0].arm+fW*a.fuelArm-a.gndBurn*a.fuelArm;
  if(hasCoPilot) baseMom+=cpW*a.seats[1].arm;

  // Quick TOW check
  const totalPaxW=paxList.reduce((s,p)=>s+parseFloat(p.weight||0)+parseFloat(p.bag||0),0);
  const tow=baseWt+totalPaxW;
  const towOver=Math.max(0,tow-a.mtow);
  if(towOver>(a.fuelOver||50)+100) return{score:1e9+towOver*1000,tow,cog:cogTarget,towOk:false,cogOk:false,towOver};

  // ── Feasibility check: can ANY seating achieve legal CoG? ──
  // Uses group-aware best-case: respects that paired groups go in row pairs (arm > seat1 arm)
  {
    const sortedArms=[...paxSeats].map(i=>a.seats[i].arm).sort((a,b)=>a-b);
    const sortedW=[...paxList].map(p=>parseFloat(p.weight||0)+parseFloat(p.bag||0)).sort((a,b)=>b-a);
    
    // Best case ignoring groups (absolute minimum achievable CoG)
    let bestMom=baseMom; const bestWt=baseWt+totalPaxW;
    sortedW.forEach((w,i)=>{if(i<sortedArms.length)bestMom+=w*sortedArms[i];});
    const absMinCog=bestMom/bestWt;
    
    // If even the absolute best (ignoring groups) is over the limit → truly infeasible
    if(absMinCog>a.cogMax){
      return{score:1e7+(absMinCog-a.cogMax)*10000,tow,cog:absMinCog,towOk:tow<=a.mtow+(a.fuelOver||50),cogOk:false,towOver,
        infeasible:false}; // allow as fallback
    }
    
    // Group-aware best case: build groups, estimate CoG with groups in consecutive rows
    // Heaviest group fills first row pair, next group fills next row pair, etc.
    // This gives a realistic best-case CoG estimate
    const gMapF={};
    paxList.forEach(p=>{const g=p.group?.trim()||''+p.id;if(!gMapF[g])gMapF[g]=[];
      gMapF[g].push(parseFloat(p.weight||0)+parseFloat(p.bag||0));});
    const groupWeights=Object.values(gMapF).map(ws=>({ws,total:ws.reduce((s,w)=>s+w,0)}))
      .sort((a,b)=>b.total-a.total);
    
    const hasSeat1=!hasCoPilot&&paxSeats.includes(1);
    const pairArms=sortedArms.filter((_,i)=>hasSeat1?i>0:true); // arms excluding seat1
    
    // Seat1 gets heaviest available solo or lightest odd-group member
    let s1w=0;
    if(hasSeat1){
      // Find best seat1 candidate
      for(const g of groupWeights){
        if(g.ws.length%2!==0){s1w=Math.min(...g.ws);break;}
      }
      if(!s1w) s1w=groupWeights.find(g=>g.ws.length===1)?.ws[0]||0;
    }
    
    // Place remaining groups in pair rows (heaviest first = best for aft CoG)
    let estMom=baseMom+(s1w>0?s1w*a.seats[1].arm:0);
    let pairIdx=0;
    for(const g of groupWeights){
      const members=s1w>0&&g.ws.length%2!==0?g.ws.filter(w=>w!==s1w||g.ws.indexOf(w)>0):[...g.ws];
      if(!members.length)continue;
      const sortedM=[...members].sort((a,b)=>b-a);
      sortedM.forEach(w=>{
        if(pairIdx<pairArms.length)estMom+=w*pairArms[pairIdx++];
      });
    }
    const estCog=estMom/bestWt;
    
    // If group-aware estimate is over CoG limit → infeasible, penalise heavily
    if(estCog>a.cogMax){
      return{score:1e9+(estCog-a.cogMax)*10000,tow,cog:estCog,
        towOk:tow<=a.mtow+(a.fuelOver||50),cogOk:false,towOver};
    }
  }

  // ── Least-squares scoring: try 3 arrangements, return minimum squared deviation ──
  const rows=rowPairsForAc(acId);
  const pairRows=rows.map(r=>r.filter(si=>si!==1)).filter(r=>r.length>0);
  const seat1Avail=!hasCoPilot&&rows.some(r=>r.includes(1));

  // Build groups
  const gMap={};
  paxList.forEach(p=>{
    const g=p.group?.trim()||''+p.id;
    if(!gMap[g]) gMap[g]={pax:[],solo:!p.group?.trim()};
    gMap[g].pax.push(p);
  });
  const allG=Object.values(gMap);
  const multiG=allG.filter(g=>!g.solo&&g.pax.length>1).sort((a,b)=>
    b.pax.reduce((s,p)=>s+parseFloat(p.weight||0)+parseFloat(p.bag||0),0)-
    a.pax.reduce((s,p)=>s+parseFloat(p.weight||0)+parseFloat(p.bag||0),0));
  const soloG=allG.filter(g=>g.solo||g.pax.length===1).sort((a,b)=>
    (parseFloat(b.pax[0].weight||0)+parseFloat(b.pax[0].bag||0))-
    (parseFloat(a.pax[0].weight||0)+parseFloat(a.pax[0].bag||0)));

  function cogFromArrangement(s1w, groupOrder){
    let mom=baseMom, wt=baseWt+totalPaxW;
    if(s1w>0) mom+=s1w*a.seats[1].arm;
    let ri=0;
    for(const g of groupOrder){
      const ms=[...g.pax].filter(p=>{
        const w=parseFloat(p.weight||0)+parseFloat(p.bag||0);
        return !(s1w>0 && w===s1w && g.pax.length===1); // skip if this is the seat1 pax
      }).sort((a,b)=>(parseFloat(b.weight||0)+parseFloat(b.bag||0))-(parseFloat(a.weight||0)+parseFloat(a.bag||0)));
      for(let i=0;i<ms.length;i++){
        const slotRi=Math.floor(i/2)+ri;
        const slotSide=i%2;
        if(slotRi<pairRows.length){
          const si=pairRows[slotRi][slotSide]||pairRows[slotRi][0];
          mom+=( parseFloat(ms[i].weight||0)+parseFloat(ms[i].bag||0))*a.seats[si].arm;
        }
      }
      ri+=Math.ceil(ms.length/2);
    }
    return mom/wt;
  }

  // Determine best seat-1 candidate
  let s1w=0;
  if(seat1Avail){
    // Prefer lightest member of heaviest odd group, else heaviest solo
    for(const g of multiG){
      if(g.pax.length%2!==0){
        const sorted=[...g.pax].sort((a,b)=>(parseFloat(a.weight||0)+parseFloat(a.bag||0))-(parseFloat(b.weight||0)+parseFloat(b.bag||0)));
        s1w=parseFloat(sorted[0].weight||0)+parseFloat(sorted[0].bag||0);
        break;
      }
    }
    if(!s1w&&soloG.length) s1w=parseFloat(soloG[0].pax[0].weight||0)+parseFloat(soloG[0].pax[0].bag||0);
  }

  // Try heaviest groups front and reversed
  const cog1=cogFromArrangement(s1w,[...multiG,...soloG]);
  const cog2=cogFromArrangement(s1w,[...multiG,...soloG].reverse());
  
  let bestDev=1e9, bestCog=null;
  [cog1,cog2].forEach(c=>{
    if(!c||isNaN(c)) return;
    const violation=c<a.cogMin?(a.cogMin-c)**2*100000:c>a.cogMax?(c-a.cogMax)**2*100000:0;
    const dev=(c-cogTarget)**2+violation;
    if(dev<bestDev){bestDev=dev;bestCog=c;}
  });

  if(bestCog===null) bestCog=cogTarget;
  return{tow,cog:bestCog,towOk:tow<=a.mtow+(a.fuelOver||50),
    cogOk:bestCog>=a.cogMin&&bestCog<=a.cogMax,towOver,score:bestDev+towOver*500};
}


// ── Auto-Allocate Engine ──
// Uses branch-and-bound to assign groups to aircraft (never splits groups)
// then heaviest-front seat assignment within each aircraft

function acPayloadBudget(acId){
  // Max pax+bag weight that can legally go on this aircraft
  const a=S.aircraft[acId]; if(!a) return 0;
  const setup=S.dispatch.acSetup.find(s=>s.acId===acId);
  const picW=S.crew.find(c=>c.n===setup?.pic)?.w||90;
  const cpW=seat1IsCoPilot(acId)?(anyCrewList().find(c=>c.n===setup?.coPilot)?.w||0):0;
  const fW=fuelKgForSetup(acId);
  return a.mtow - a.ew - picW - cpW - fW + a.gndBurn;
}

// ── Manifest → Seatmap push ────────────────────────────────────────────────
// Manifests are the permanent entry lists; the seatmap workspace (S.smWS) is a
// separate working area you push manifests INTO. Pushing copies the manifest's
// passengers + aircraft into the workspace (never the other way around), so the
// manifest is untouched and you can re-push from any manifest at any time.
function _wsHasContent(ws){
  if(!ws)return false;
  if((ws.pax||[]).length)return true;
  if((ws._unallocated||[]).length)return true;
  return Object.keys(ws.seatMap||{}).some(function(k){return Object.keys(ws.seatMap[k]||{}).length;});
}
// Copy a manifest into the seatmap workspace. Returns the "batch" of seat keys and
// pax ids that were just added, so a merge can seat them into their own instances.
// duplicate=true (merge of a seated push): each pushed aircraft becomes a NEW
// instance (e.g. a 2nd "ZK-SLA"), and its pax are pinned (_smPin) to it so the
// existing aircraft's seating is never disturbed.
function _copyManifestIntoWS(m,ws,replace,duplicate){
  ws.acSetup=ws.acSetup||[];ws.pax=ws.pax||[];ws.seatMap=ws.seatMap||{};ws.origAcMap=ws.origAcMap||{};ws.cargo=ws.cargo||{};
  if(replace||!_wsHasContent(ws)){ws.dep=m.dep;ws.dest=m.dest;ws.date=m.date;ws.etd=m.etd;ws.etdCustom=m.etdCustom||false;ws.name=m.name||'';}
  if(m.cargo)Object.keys(m.cargo).forEach(function(k){ws.cargo[k]=JSON.parse(JSON.stringify(m.cargo[k]));});
  var src=(m.name||'').trim()||('Manifest'+(m.date?' '+m.date:''));
  var acKeyMap={};   // manifest physical acId -> assigned smKey in workspace
  var batchKeys=[];
  (m.acSetup||[]).forEach(function(s){
    var ns=JSON.parse(JSON.stringify(s));ns._srcManifest=src;
    if(duplicate){
      var existing=ws.acSetup.filter(function(x){return _ac(x._seatmapKey||x.acId)===s.acId;});
      if(existing.length){
        // Tag the existing first instance too, so both read e.g. "(1)" and "(2)"
        if(existing.length===1&&!existing[0]._displaySuffix){existing[0]._seatmapKey=existing[0]._seatmapKey||existing[0].acId;existing[0]._displaySuffix='(1)';}
        var n=existing.length+1;
        ns._seatmapKey=s.acId+'_'+n;ns._displaySuffix='('+n+')';
      } else {
        ns._seatmapKey=s.acId;
      }
      ws.acSetup.push(ns);acKeyMap[s.acId]=ns._seatmapKey;batchKeys.push(ns._seatmapKey);
    } else {
      var ex=ws.acSetup.find(function(x){return (x._seatmapKey||x.acId)===s.acId||x.acId===s.acId;});
      if(ex){var _k=ex._seatmapKey,_sfx=ex._displaySuffix;Object.assign(ex,ns);if(_k)ex._seatmapKey=_k;if(_sfx)ex._displaySuffix=_sfx;acKeyMap[s.acId]=_k||ex.acId;}
      else{ws.acSetup.push(ns);acKeyMap[s.acId]=ns._seatmapKey||s.acId;batchKeys.push(ns._seatmapKey||s.acId);}
    }
  });
  var ids={};ws.pax.forEach(function(p){ids[p.id]=1;});
  var batchPax=[];
  (m.pax||[]).filter(function(p){return !p.infant;}).forEach(function(p){
    var np=JSON.parse(JSON.stringify(p));
    if(ids[np.id])np.id='p_'+Date.now()+'_'+Math.floor(Math.random()*1e5);
    ids[np.id]=1;np._ts=Date.now();np._src=src;
    if(duplicate&&np.pinAc&&acKeyMap[np.pinAc])np._smPin=acKeyMap[np.pinAc];
    ws.pax.push(np);batchPax.push(np.id);
  });
  return {keys:batchKeys,paxIds:batchPax};
}
// Seat unseated workspace passengers (heavy-front, groups together).
// Instance-aware: acs are seat keys (smKey). Optional restrictKeys/restrictPax limit
// the pass to a single push's new instances + pax (used by merge).
function _seatWorkspaceUnseated(restrictKeys,restrictPax){
  const d=seatmapWS();
  let acs=(d.acSetup||[]).map(s=>s._seatmapKey||s.acId).filter(k=>_acSpec(k));
  if(restrictKeys&&restrictKeys.length)acs=acs.filter(k=>restrictKeys.indexOf(k)>=0);
  if(!acs.length)return;
  d.seatMap=d.seatMap||{};d.origAcMap=d.origAcMap||{};
  const alreadySeated=new Set(Object.values(d.seatMap).flatMap(sm=>Object.values(sm||{})));
  let unseated=d.pax.filter(p=>!p.infant&&!alreadySeated.has(p.id));
  if(restrictPax)unseated=unseated.filter(p=>restrictPax.has(p.id));
  const acPax={};acs.forEach(k=>{acPax[k]=[];});
  const caps={};acs.forEach(k=>{const occ=Object.keys(d.seatMap[k]||{}).length;caps[k]=Math.max(0,paxSeatIdxs(k).length-occ);});
  const unpinned=[];
  unseated.forEach(p=>{
    let target=null;
    if(p._smPin&&acs.indexOf(p._smPin)>=0){target=p._smPin;}
    else if(p.pinAc){
      const cands=acs.filter(k=>_ac(k)===p.pinAc).sort((a,b)=>(caps[b]-acPax[b].length)-(caps[a]-acPax[a].length));
      if(cands.length&&acPax[cands[0]].length<caps[cands[0]])target=cands[0];
    }
    if(target)acPax[target].push(p);else unpinned.push(p);
  });
  unpinned.sort((a,b)=>{
    if((a.group||'')!==(b.group||'')) return (a.group||'').localeCompare(b.group||'');
    return (parseFloat(b.weight||0)+parseFloat(b.bag||0))-(parseFloat(a.weight||0)+parseFloat(a.bag||0));
  });
  unpinned.forEach(p=>{
    const best=acs.filter(k=>acPax[k].length<caps[k])
      .sort((a,b)=>(caps[b]-acPax[b].length)-(caps[a]-acPax[a].length))[0];
    if(best)acPax[best].push(p);
  });
  acs.forEach(k=>{
    const existing=d.seatMap[k]||{};
    const toSeat=acPax[k]||[];
    if(!toSeat.length){d.seatMap[k]=existing;return;}
    const newAssignment=assignSeatsHeavyFront(k,toSeat);
    Object.entries(newAssignment).forEach(([idx,pid])=>{const i=parseInt(idx);if(!existing[i])existing[i]=pid;});
    d.seatMap[k]=existing;
  });
}
function _pushManifest(mode){
  const m=S.dispatch; // active manifest (this runs from the Manifest tab)
  const mpax=(m&&m.pax||[]).filter(p=>!p.infant);
  if(!mpax.length){toast('Add passengers to the manifest first.','warn');return;}
  if(mode==='seat'){
    const okAcs=(m.acSetup||[]).filter(s=>S.aircraft[s.acId]&&s.pic);
    if(!okAcs.length){toast('Select an aircraft with a PIC to auto-allocate — or use Send to Pool.','warn');return;}
  }
  const ws=seatmapWS();
  if(_wsHasContent(ws)){
    // Seatmap already has people — let the user choose Merge / Replace / Cancel.
    _seatmapChoicePrompt({onMerge:function(){_doPush(mode,false);},onReplace:function(){_doPush(mode,true);}});
    return;
  }
  _doPush(mode,true);
}
// Generic 3-way seatmap push prompt (Merge adds, Replace clears first, Cancel aborts).
// Used by both manifest→seatmap and loadsheet→seatmap pushes.
function _seatmapChoicePrompt(opts){
  opts=opts||{};
  var ex=document.getElementById('push-prompt-ov');if(ex)ex.remove();
  S._smChoice={merge:opts.onMerge,replace:opts.onReplace};
  var ov=document.createElement('div');
  ov.id='push-prompt-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML='<div style="background:var(--card);border:1px solid var(--border2);border-radius:16px;padding:22px;max-width:380px;width:100%;box-shadow:0 12px 44px rgba(0,0,0,.55)">'
    +'<div style="font-size:16px;font-weight:700;color:var(--text1);margin-bottom:8px">'+(opts.title||'Seatmap already has passengers')+'</div>'
    +'<div style="font-size:13px;color:var(--text3);margin-bottom:18px;line-height:1.5">'+(opts.body||'Add to what is already on the seatmap, or replace everything first? Your manifests and loadsheets are not affected.')+'</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px">'
    +'<button onclick="window._smChoose(\'merge\')" style="padding:11px;border-radius:10px;border:1.5px solid rgba(99,179,237,.6);background:rgba(99,179,237,.12);color:#63b3ed;font-size:14px;font-weight:700;cursor:pointer">➕ '+(opts.mergeLabel||'Merge — add to seatmap')+'</button>'
    +'<button onclick="window._smChoose(\'replace\')" style="padding:11px;border-radius:10px;border:1.5px solid rgba(239,68,68,.5);background:rgba(239,68,68,.12);color:#ef4444;font-size:14px;font-weight:700;cursor:pointer">🗑 '+(opts.replaceLabel||'Replace — clear, then push')+'</button>'
    +'<button onclick="window._smChoose(\'cancel\')" style="padding:11px;border-radius:10px;border:1px solid var(--border2);background:transparent;color:var(--text2);font-size:14px;font-weight:600;cursor:pointer">Cancel</button>'
    +'</div></div>';
  ov.addEventListener('click',function(e){if(e.target===ov)window._smChoose('cancel');});
  document.body.appendChild(ov);
}
window._seatmapChoicePrompt=_seatmapChoicePrompt;
window._smChoose=function(choice){
  var ov=document.getElementById('push-prompt-ov');if(ov)ov.remove();
  var h=S._smChoice||{};S._smChoice=null;
  if(choice==='merge'&&h.merge)h.merge();
  else if(choice==='replace'&&h.replace)h.replace();
};
function _doPush(mode,replace){
  const m=S.dispatch; // active manifest
  const mpax=(m&&m.pax||[]).filter(p=>!p.infant);
  let ws=seatmapWS();
  if(replace){S.smWS=bD();ws=S.smWS;}
  const duplicate=!replace&&mode==='seat'; // merge of a seated push → duplicate aircraft
  const batch=_copyManifestIntoWS(m,ws,replace,duplicate);
  // Enter the seatmap (workspace) context
  S.tab='seatmap';S.lockedAcs=[];S.mobileAcIdx=0;S.selectedPax=null;
  S.viewAcs=(ws.acSetup||[]).map(s=>s._seatmapKey||s.acId);window.scrollTo(0,0);
  if(mode==='seat'){
    if(duplicate)_seatWorkspaceUnseated(batch.keys,new Set(batch.paxIds));
    else _seatWorkspaceUnseated();
  }
  _seatmapSyncPool();
  S.solverAutoApply=true;runSolver();
  const issues=[];
  (ws.acSetup||[]).map(s=>s._seatmapKey||s.acId).filter(k=>_acSpec(k)).forEach(k=>{
    const r=S.solverRes[k];if(!r)return;
    const lbl=_ac(k);
    if(r.towOver>0)issues.push(lbl+' overweight by '+r.towOver.toFixed(0)+'kg');
    if(!r.cogOk)issues.push(lbl+' CoG out of limits ('+(r.cog!=null?r.cog.toFixed(1):'?')+'")');
  });
  if(mode==='pool')toast('Sent '+mpax.length+' pax to the seatmap pool.','ok');
  else if(issues.length)toast('⚠ W&B issues: '+issues.join(' · '),'warn');
  else toast('Seats allocated. Check W&B above.','ok');
  saveSeatmapWS();render();
}
function autoAllocate(){_pushManifest('seat');}
function sendManifestToPool(){_pushManifest('pool');}
window.autoAllocate=autoAllocate;window.sendManifestToPool=sendManifestToPool;

// ── Seat assignment within one aircraft ──
// Tries to keep groups in consecutive rows.
// If CoG exceeds hard limit after grouped placement, splits the minimum
// number of passengers (one person to seat 1) to bring CoG within limits.
// CoG calculator for a seat assignment map
function cogForMap(acId, seatMap, paxListRef){
  const ac=S.aircraft[acId]; if(!ac) return 0;
  let totalW=0, totalMom=0;
  Object.entries(seatMap).forEach(([si,pid])=>{
    const p=paxListRef.find(x=>x.id===pid);
    if(!p) return;
    const w=parseFloat(p.weight||0)+parseFloat(p.bag||0);
    const arm=ac.seats[parseInt(si)]?.arm||0;
    totalW+=w; totalMom+=w*arm;
  });
  return totalW>0?totalMom/totalW:0;
}

function assignSeatsHeavyFront(acId, paxList, opts){
  // Rules (in priority order):
  // 1. MTOW: heaviest pax forward keeps TOW manageable & CoG fwd
  // 2. Groups together side-by-side in pair rows
  //    - If odd group size: heaviest member of group goes to Seat 1 if available
  // 3. CoG within limits (heaviest forward is the primary mechanism)

  const a=_acSpec(acId);
  if(!a||!paxList.length) return{};
  const _co=(opts&&opts.coSeat1!=null)?opts.coSeat1:undefined; // explicit co-pilot flag (Rezdy seatmap)

  const paxIdxs=paxSeatIdxs(acId,_co);
  if(!paxIdxs.length) return{};

  // Seat layout: sorted front-to-back by arm
  const seatsByArm=[...paxIdxs].sort((x,y)=>(a.seats[x]?.arm||999)-(a.seats[y]?.arm||999));
  const seat1Idx=seatsByArm[0]; // frontmost pax seat
  const hasSeat1=(_co!=null)?!_co:!seat1IsCoPilot(acId);

  // All pax heaviest first
  const byWeight=[...paxList].sort((a,b)=>
    (parseFloat(b.weight||0)+parseFloat(b.bag||0))-
    (parseFloat(a.weight||0)+parseFloat(a.bag||0)));

  // Build groups (group name → pax list, heaviest first within group)
  const grpMap={};
  paxList.forEach(p=>{
    const g=p.group?.trim()||('_solo_'+p.id);
    if(!grpMap[g]) grpMap[g]=[];
    grpMap[g].push(p);
  });
  // Sort each group heaviest first
  Object.values(grpMap).forEach(arr=>arr.sort((a,b)=>
    (parseFloat(b.weight||0)+parseFloat(b.bag||0))-
    (parseFloat(a.weight||0)+parseFloat(a.bag||0))));

  // Split groups into: even (fits in pair rows neatly) vs odd (has a leftover member)
  const evenGroups=[], oddGroups=[], seatOneQueue=[];
  Object.entries(grpMap).forEach(([g,members])=>{
    if(members.length===1){
      seatOneQueue.push(members[0]); // solo → goes in seat1 or leftover slots
    } else if(members.length%2===0){
      evenGroups.push(members);
    } else {
      // Odd group: heaviest member goes to seat1, rest get priority front pair row
      seatOneQueue.push(members[0]); // heaviest → seat1
      if(members.length>1){
        // Mark as priority so they fill the FIRST pair row (behind seat1 member)
        members.slice(1)._priority=true;
        evenGroups.unshift(members.slice(1)); // front of queue → first pair row
      }
    }
  });

  // Sort even groups heaviest-pair-first (sum of group weights); a group carrying a lap infant
  // sinks to the BACK of the queue so it fills the rearmost rows (infants prefer the last row).
  evenGroups.sort((a,b)=>{
    const ai=a.some(p=>p.infant)?1:0,bi=b.some(p=>p.infant)?1:0;if(ai!==bi)return ai-bi;
    return b.reduce((s,p)=>s+parseFloat(p.weight||0)+parseFloat(p.bag||0),0)-
           a.reduce((s,p)=>s+parseFloat(p.weight||0)+parseFloat(p.bag||0),0);});

  // Sort seat1Queue heaviest first (heaviest odd-member or solo gets seat1); infant hosts go last
  // so they never win the front seat and tend to land in rear rows.
  seatOneQueue.sort((a,b)=>{
    const ai=a.infant?1:0,bi=b.infant?1:0;if(ai!==bi)return ai-bi;
    return (parseFloat(b.weight||0)+parseFloat(b.bag||0))-(parseFloat(a.weight||0)+parseFloat(a.bag||0));});

  // Get pair rows (exclude seat1 slot)
  const rows=rowPairsForAc(acId,_co); // [[1],[2,3],[4,5]...]
  const pairRows=rows.filter(r=>r.length===2); // only the 2-seat rows
  const seat1Row=rows.find(r=>r.length===1); // the single seat1 slot

  const result={};
  const placed=new Set();

  // ── Phase 1: Fill pair rows with even groups (heaviest groups first = front rows) ──
  let pairRowIdx=0;
  for(const grp of evenGroups){
    // Place group in consecutive pair rows
    for(let i=0;i<grp.length;i+=2){
      if(pairRowIdx>=pairRows.length) break;
      const row=pairRows[pairRowIdx++];
      const [heavy,light]=[grp[i],grp[i+1]];
      result[row[0]]=heavy.id; placed.add(heavy.id);
      if(light){result[row[1]]=light.id; placed.add(light.id);}
    }
  }

  // ── Phase 2: Place seat1 queue ──
  // Best candidate for seat1: heaviest of seatOneQueue
  if(hasSeat1&&seat1Row&&seatOneQueue.length>0){
    const s1i=seatOneQueue.findIndex(p=>!p.infant); // never seat a lap-infant host in the front seat
    if(s1i>=0){const s1pax=seatOneQueue.splice(s1i,1)[0];result[seat1Row[0]]=s1pax.id;placed.add(s1pax.id);}
  }

  // ── Phase 3: Fill remaining pair rows with leftover seatOneQueue pax ──
  // Pair them up and fill rows heaviest first
  while(seatOneQueue.length>0&&pairRowIdx<pairRows.length){
    const row=pairRows[pairRowIdx++];
    const p1=seatOneQueue.shift();
    result[row[0]]=p1.id; placed.add(p1.id);
    if(seatOneQueue.length>0&&row[1]!=null){
      const p2=seatOneQueue.shift();
      result[row[1]]=p2.id; placed.add(p2.id);
    }
  }

  // ── Phase 4: Place any still-unplaced pax in remaining empty seats ──
  const unplaced=byWeight.filter(p=>!placed.has(p.id));
  const emptySeats=seatsByArm.filter(si=>result[si]==null);
  unplaced.forEach((p,i)=>{ if(i<emptySeats.length){ result[emptySeats[i]]=p.id; }});

  // ── Final guard: keep a lap-infant host out of the front passenger seat ──
  // (only relevant when seat 1 actually holds a passenger, i.e. no co-pilot).
  if(hasSeat1&&result[seat1Idx]!=null){
    const _isInf=id=>{const p=paxList.find(x=>x.id===id);return !!(p&&p.infant);};
    if(_isInf(result[seat1Idx])){
      const others=Object.keys(result).map(Number).filter(s=>s!==seat1Idx&&!_isInf(result[s]));
      others.sort((x,y)=>(a.seats[y]?.arm||0)-(a.seats[x]?.arm||0)); // rearmost non-infant first
      if(others.length){const j=others[0],t=result[seat1Idx];result[seat1Idx]=result[j];result[j]=t;}
      else{const empt=seatsByArm.filter(s=>s!==seat1Idx&&result[s]==null);empt.sort((x,y)=>(a.seats[y]?.arm||0)-(a.seats[x]?.arm||0));if(empt.length){result[empt[0]]=result[seat1Idx];delete result[seat1Idx];}}
    }
  }

  return result;
}


// ── Solver (post-allocation check) ──
function runSolver(){
  const res={};
  const _D=curDisp();
  (_D.acSetup||[]).map(s=>s._seatmapKey||s.acId).filter(k=>_acSpec(k)).forEach(acId=>{
    // acId here is the seatmap key (smKey) — may be a duplicate instance like "ZK-SLA_2".
    const a=_acSpec(acId); if(!a){res[acId]={err:true};return;}
    const cog=calcAcWB(acId,[]); if(!cog){res[acId]={err:true};return;}
    let r={...cog}; const over=a.fuelOver||50;

    // TOW suggestion
    if(!cog.towOk&&cog.towOver<=over){
      r.suggestKg=cog.towOver;
      r.suggestUnit=fuelUnit(acId)==='L'?(cog.towOver/AVGAS).toFixed(1)+' L':(cog.towOver/LB).toFixed(1)+' lbs';
    }
    if(cog.towOver>over) r.towFatal=true;
    if(cog.lwOver>over) r.lwFatal=true;

    // CoG fix suggestion: if CoG is aft of limit, try moving heaviest non-seat-1 pax to seat 1
    if(!cog.cogOk && cog.cog > a.cogMax && !seat1IsCoPilot(acId)){
      const sm=(_D.seatMap||{})[acId]||{};
      const seat1Free=!sm[1];
      // Find heaviest pax not already in seat 1, not in seat 1's row pair
      // Moving them forward (to seat 1) will shift CoG forward
      let bestSwap=null, bestCog=cog.cog;
      const paxIdxs=paxSeatIdxs(acId).filter(i=>i!==1);
      paxIdxs.forEach(i=>{
        const pid=sm[i]; if(!pid) return;
        const p=(_D.pax||[]).find(x=>x.id===pid); if(!p) return;
        // Simulate: move this pax to seat 1, move seat-1 pax (if any) to this seat
        const newSm={...sm};
        const prev1=sm[1];
        newSm[1]=pid;
        if(prev1) newSm[i]=prev1; else delete newSm[i];
        // Recalc CoG with this swap
        const setup=(_D.acSetup||[]).find(s=>(s._seatmapKey||s.acId)===acId);
        const picW=setup?S.crew.find(c=>c.n===setup.pic)?.w||0:0;
        let wt=a.ew+picW, mom=a.em+picW*a.seats[0].arm;
        const fW=fuelKgForSetup(acId);
        paxSeatIdxs(acId).forEach(si=>{
          const opid=newSm[si]; if(!opid) return;
          const op=(_D.pax||[]).find(x=>x.id===opid); if(!op) return;
          const w=parseFloat(op.weight||0)+parseFloat(op.bag||0);
          wt+=w; mom+=w*(a.seats[si]?.arm??0);
        });
        wt+=fW; mom+=fW*a.fuelArm; wt-=a.gndBurn; mom-=a.gndBurn*a.fuelArm;
        const newCog=mom/wt;
        if(newCog<bestCog){
          bestCog=newCog;
          const pname=p.name||('Seat '+i);
          const prev1name=prev1?(_D.pax||[]).find(x=>x.id===prev1)?.name||'Seat 1 pax':null;
          bestSwap={fromIdx:i,toIdx:1,pname,prev1name,newCog,
            fixes:newCog>=a.cogMin&&newCog<=a.cogMax};
        }
      });
      if(bestSwap){
        r.cogSwapSuggestion=bestSwap;
        // Auto-apply if it fixes the problem (not when called from manual drag/drop)
        if(bestSwap.fixes&&S.solverAutoApply!==false){
          const sm2=(_D.seatMap||{})[acId]||{};
          const prev1=sm2[1];
          sm2[1]=sm2[bestSwap.fromIdx];
          if(prev1) sm2[bestSwap.fromIdx]=prev1; else delete sm2[bestSwap.fromIdx];
          _D.seatMap[acId]=sm2;
          // Recalc after swap
          const cog2=calcAcWB(acId,[]);
          if(cog2) r={...cog2,autoFixed:true,
            autoFixMsg:'Auto-fixed CoG: moved '+bestSwap.pname+' to Seat 1'+(bestSwap.prev1name?' (swapped with '+bestSwap.prev1name+')':'')};
        }
      }
    }

    // Forward CoG fix: if CoG too far forward (rare but possible)
    if(!cog.cogOk && cog.cog < a.cogMin){
      r.cogFwdWarning=true;
    }

    res[acId]=r;
  });
  S.solverRes=res;
}


// ── State ──
// LOCAL calendar date (YYYY-MM-DD). Using toISOString() here gave the UTC day, which in NZ
// (UTC+12/13) is "tomorrow" late evening — defaulting new manifests/loadsheets to the wrong day.
function _todayLocal(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
function bD(){return{dep:'NZQN',dest:'NZMF',date:_todayLocal(),etd:'',etdCustom:false,name:'',acSetup:[],pax:[],seatMap:{},origAcMap:{},cargo:{},step:1};}
function bF(){return{ac:'',pic:'',coPilot:'',date:_todayLocal(),etd:'',etdCustom:false,dep:'NZQN',dest:'NZMF',seats:{},bags:{},names:{},infantNames:{},cargo:{},gndBurn:null,fuel:'',burnOff:'',paxType:{},paxGroups:{},paxPaymentReq:{},sig:null};}
function bF_ac(acId){var f=bF();f.ac=acId;return f;}

// Touch/coarse-pointer device (phone / iPad) vs desktop. Drives the DEFAULT lock state for the
// roster + resource calendar — locked on touch (easy to nudge by accident), free on desktop (deliberate mouse).
function _isTouchDevice(){
  try{
    if(typeof window!=='undefined'&&window.matchMedia){
      if(window.matchMedia('(pointer: coarse)').matches)return true;
      if(window.matchMedia('(pointer: fine)').matches)return false;
    }
    return (typeof window!=='undefined'&&'ontouchstart' in window)||((typeof navigator!=='undefined'&&navigator.maxTouchPoints)||0)>0;
  }catch(e){return false;}
}

let S={
  // Auth
  user:null,users:[],loginEmail:'',loginPw:'',loginErr:null,toasts:[],
  // Data
  crew:[],aircraft:{},charterRates:{},saved:[],manifests:[],
  syncStatus:'connecting',rtStatus:'offline',rtPresence:{},_presSection:null,
  // Audit
  auditLog:[],
  // Maintenance
  maintenance:{},maintBookings:{},roster:null,rosterWeek:null,rosterTab:'view',rosterFilter:'all',rosterLocked:_isTouchDevice(),rosterBuild:null,_rosterLoaded:false,_rosterSaved:false,_rosterLeave:null,_rosterLeaveWeek:null,_rosterColorsLoaded:false,_rosterColorEdit:false,rosterColors:null,_appLoading:false,_leave:null,_notifications:null,_notifOpen:false,uploadProgress:null,driveLastUpload:lsGet('ts_drive_last_upload')||null,wideMode:lsGet('ts_wide_mode')!==false,
  // Drive
  driveQueue:[],
  // Manifest / Dispatch
  dispatch:bD(),manifestTabs:[],activeManifestTabId:null,_manifestDispatches:{},viewAc:null,viewAc2:null,selectedPax:null,solverRes:{},
  // Loadsheet form
  form:bF(),editId:null,lsForms:{},lsAc:'SLA',
  lsTabs:[],activeTabId:null,_newLsTab:false,_lsManageMode:false,_lsTabSel:{},_lsFormUndo:null,_lsFormUndoStack:[],
  pads:[],padTabs:[],activePadId:null,_padMode:'text',_padDrawColor:'#ffffff',_padDrawWidth:3,_padEraser:false,
  _aeroSearch:'',_aeroSel:null,
  // UI state
  tab:'bookings',section:'operations',_drawerOpen:false,
  savedSearch:'',savedSort:'newest',savedTab:'loadsheets',savedSel:{},
  // Charter
  charter:{legs:[{from:'NZQN',to:'NZMF',acId:'',pax:1,note:''}],showQuote:false},
  // Admin
  rolePerms:{},admin:{section:'people',crewEditId:null,crewDraftN:'',crewDraftW:'',newN:'',newW:'',err:'',acSel:'ZK-SLD',acDraft:null,acErr:'',acSaved:false,userEditId:null,userDraft:{},newUser:{name:'',email:'',password:'',role:'desk',linkedCrew:''}},
  // Login form
  loginForm:{email:'',password:'',err:''},
  showReset:false,resetMsg:null,resetEmail:'',resetStep:0/* 0=login 1=email-sent 2=enter-code */,showAccount:false,changePwMsg:null,
  lockedAcs:[],formDirty:false,mobileAcIdx:0,sigMode:'draw',sigTypedName:'',maintTab:'overview',maintSearch:{},editAcId:null,auditFilter:'',auditFilterUser:'',auditPage:0,
  gdriveEnabled:false,gdriveClientId:'',gdriveFolder:'Loadsheets',gdriveFolderId:'',driveStatus:'',driveLastLink:'',driveLastFile:'',driveLastFolder:'',
};

// ── Load from Supabase ──
// ── localStorage helpers for cross-device persistence ──
function lsGet(key){try{const v=localStorage.getItem(key);return v?JSON.parse(v):null;}catch{return null;}}
function lsSet(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch{}}

