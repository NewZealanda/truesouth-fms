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
const sbF=async(t,q='',order='created_at')=>{try{const r=await fetch(`${SB}/rest/v1/${t}?select=*${q}&order=${order}.desc`,{headers:SH});if(!r.ok){console.error('[sbF]',t,'status:',r.status,await r.text());return null;}return r.json();}catch(e){console.error('[sbF]',t,'exception:',e);return null;}};
// ── Fetch window: only load recent rows from large tables (tunable) ──
const FETCH_DAYS=90;
const _fetchSince=()=>new Date(Date.now()-FETCH_DAYS*864e5).toISOString().slice(0,10);
// Loadsheets: last FETCH_DAYS only. Manifests: same, but ALWAYS include the
// live_draft row and any ls_live_* realtime-collaboration rows regardless of age.
const Q_LOADSHEETS=()=>`&created_at=gte.${_fetchSince()}`;
const Q_MANIFESTS=()=>`&or=(created_at.gte.${_fetchSince()},id.eq.live_draft,id.like.ls_live_*)`;
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
  var inPool={},poolKey={}; pool.forEach(function(e){if(e.id)inPool[e.id]=1;poolKey[(e.name||'')+'|'+(e.weight||'')]=1;});
  (d.pax||[]).forEach(function(p){
    if(p.infant||seated[p.id]||inPool[p.id])return;
    if(poolKey[(p.name||'')+'|'+(p.weight||'')])return;
    pool.push({id:p.id,name:p.name,weight:p.weight,bag:p.bag||0,group:p.group||'',infant:p.infantName||null,type:p.type||'adult',paymentReq:!!p.paymentReq});
  });
}
const sbU=async(t,d)=>{try{const r=await fetch(`${SB}/rest/v1/${t}`,{method:'POST',headers:{...SH,'Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify(d)});if(!r.ok){const err=await r.text();console.error('[sbU]',t,'status:',r.status,err);return null;}return r.json();}catch(e){console.error('[sbU]',t,'exception:',e);return null;}};
const sbDel=async(t,id)=>{try{const r=await fetch(`${SB}/rest/v1/${t}?id=eq.${id}`,{method:'DELETE',headers:SH});return r.ok;}catch{return false;}};
const sbPatch=async(t,id,data)=>{try{const r=await fetch(`${SB}/rest/v1/${t}?id=eq.${id}`,{method:'PATCH',headers:{...SH,'Prefer':'return=minimal'},body:JSON.stringify(data)});return r.ok;}catch{return false;}};


// ── Constants ──
const AVGAS=0.72,LB=0.453592,JETA=0.8;
const DEFAULT_ROLE_PERMS={
  superadmin:  {operations:true, charter:true, maintenance:true, roster:true, roster_edit:true, leave:true, leave_approve:true, admin_crew:true,admin_users:true, scratchpad:true, audit:true, maint_bookings:true, sign_loadsheet:true},
  admin:       {operations:true, charter:true, maintenance:true, roster:true, roster_edit:true, leave:true, leave_approve:true, admin_crew:true,admin_users:true, scratchpad:true, audit:false,maint_bookings:true, sign_loadsheet:true},
  cx_manager:  {operations:true, charter:false,maintenance:false,roster:true, roster_edit:true, leave:true, leave_approve:true, admin_crew:true,admin_users:false,scratchpad:false,audit:false,maint_bookings:false,sign_loadsheet:false},
  pilot:       {operations:true, charter:false,maintenance:true, roster:true, roster_edit:false,leave:true, leave_approve:false,admin_crew:true,admin_users:false,scratchpad:true, audit:false,maint_bookings:false,sign_loadsheet:true},
  desk:        {operations:true, charter:true, maintenance:true, roster:true, roster_edit:false,leave:true, leave_approve:false,admin_crew:true,admin_users:false,scratchpad:true, audit:false,maint_bookings:false,sign_loadsheet:false},
  maint:       {operations:false,charter:false,maintenance:true, roster:false,roster_edit:false,leave:true, leave_approve:false,admin_crew:true,admin_users:false,scratchpad:false,audit:false,maint_bookings:true, sign_loadsheet:false},
  maintenance: {operations:false,charter:false,maintenance:true, roster:false,roster_edit:false,leave:true, leave_approve:false,admin_crew:true,admin_users:false,scratchpad:false,audit:false,maint_bookings:true, sign_loadsheet:false},
  ground_staff:{operations:false,charter:false,maintenance:false,roster:false,roster_edit:false,leave:true, leave_approve:false,admin_crew:true,admin_users:false,scratchpad:false,audit:false},
  accounts: {operations:false,charter:false,maintenance:false,roster:true, roster_edit:false,leave:true, leave_approve:false,admin_crew:false,admin_users:false,scratchpad:false,audit:false},
  marketing: {operations:false,charter:false,maintenance:false,roster:false,roster_edit:false,leave:true, leave_approve:false,admin_crew:false,admin_users:false,scratchpad:false,audit:false}
};
function hasRolePerm(perm){const r=S.user?.role||'desk';const rp=S.rolePerms?.[r];return rp&&rp[perm]!==undefined?rp[perm]:(DEFAULT_ROLE_PERMS[r]||{})[perm]||false;}

const GRP_COLOURS=['#3b82f6','#ec4899','#10b981','#f59e0b','#8b5cf6','#f97316','#06b6d4','#84cc16','#ef4444','#6366f1'];
// Airport map: ICAO → full name
var APTS={};var APT_COORDS={};var APS=[];
var _APT_PINNED=["NZQN","NZMF","NZMC","NZFJ"];
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
function aptOpts(sel){
  _rebuildAptData();
  var all=_getAllApts();
  var pinned=_APT_PINNED.map(function(ic){return all.find(function(a){return a.icao===ic;});}).filter(Boolean);
  var rest=all.filter(function(a){return _APT_PINNED.indexOf(a.icao)<0;});
  var south=rest.filter(function(a){return a.lat<=-41.35;}).sort(function(a,b){return a.name<b.name?-1:a.name>b.name?1:0;});
  var north=rest.filter(function(a){return a.lat>-41.35;}).sort(function(a,b){return a.name<b.name?-1:a.name>b.name?1:0;});
  function opt(a){var lbl=(a.icao==='NZQN'?'\uD83C\uDFE0 ':'')+a.name+' ('+a.icao+')';return '<option value="'+a.icao+'"'+(sel===a.icao?' selected':'')+'>'+lbl+'</option>';}
  return '<optgroup label="* Featured">'+pinned.map(opt).join('')+'</optgroup>'
    +'<optgroup label="South Island">'+south.map(opt).join('')+'</optgroup>'
    +'<optgroup label="North Island">'+north.map(opt).join('')+'</optgroup>';
}
const APP_VER='v22.84';
const AC_COL={
  "ZK-SLA":"#a75aba","ZK-SLB":"#7c7c7c","ZK-SLD":"#48925f","ZK-SLQ":"#4a99d2","ZK-SDB":"#e3683e"
};
const CREW_DEF=[{id:'c1',name:"P. Daniell",weight:104},{id:'c2',name:"A. Adamson",weight:110},{id:'c3',name:"T. Patel",weight:89},{id:'c4',name:"J. Yang",weight:73},{id:'c5',name:"L. McLean",weight:70},{id:'c6',name:"L. Hancock",weight:96},{id:'c7',name:"D. Ogden",weight:85},{id:'c9',name:"J. Cooper",weight:89},{id:'c10',name:"M. Stott",weight:62},{id:'c11',name:"L. Vincent",weight:68}];
const AC_DEF={
  "ZK-SLD":{id:"ZK-SLD",name:"ZK-SLD",type:"GA-8 Airvan",ew:1059.91,ea:52.46,em:55603.546,mtow:1905,mlw:1859,mrw:1906,cogMin:42,cogMax:64,fuelKg:108,fuelArm:67.5,gndBurn:1,burnDef:35,burnDefUnit:'l',seats:[{lbl:"PIC",arm:38,crew:true},{lbl:"Seat 1",arm:38},{lbl:"Seat 2",arm:69.8},{lbl:"Seat 3",arm:69.8},{lbl:"Seat 4",arm:99.3},{lbl:"Seat 5",arm:99.3},{lbl:"Seat 6",arm:127.8},{lbl:"Seat 7",arm:127.8}],cargo:[{lbl:"Baggage Shelf",arm:148.3,maxKg:9}],doc:"FMSSLDRev.#110626",layout:"ga8",fuelOver:20},
  "ZK-SLQ":{id:"ZK-SLQ",name:"ZK-SLQ",type:"GA-8 Airvan",ew:1064.9,ea:53.15,em:56599.77,mtow:1905,mlw:1859,mrw:1906,cogMin:42,cogMax:64,fuelKg:108,fuelArm:67.5,gndBurn:1,burnDef:35,burnDefUnit:'l',seats:[{lbl:"PIC",arm:38,crew:true},{lbl:"Seat 1",arm:38},{lbl:"Seat 2",arm:69.8},{lbl:"Seat 3",arm:69.8},{lbl:"Seat 4",arm:99.3},{lbl:"Seat 5",arm:99.3},{lbl:"Seat 6",arm:127.8},{lbl:"Seat 7",arm:127.8}],cargo:[{lbl:"Baggage Shelf",arm:148.3,maxKg:9}],doc:"FMSSLQRev.#110626",layout:"ga8",fuelOver:20},
  "ZK-SLA":{id:"ZK-SLA",name:"ZK-SLA",type:"C-208B Grand Caravan",ew:2384.58,ea:192.24,em:458411.659,mtow:3968,mlw:3856,mrw:3969,cogMin:182.57,cogMax:204.4,fuelKg:363,fuelArm:201.98,gndBurn:11.34,burnDef:187,burnDefUnit:'lbs',seats:[{lbl:"PIC",arm:133.5,crew:true},{lbl:"Seat 1",arm:133.5},{lbl:"Seat 2",arm:173.5},{lbl:"Seat 3",arm:173.5},{lbl:"Seat 4",arm:203.36},{lbl:"Seat 5",arm:203.36},{lbl:"Seat 6",arm:234.35},{lbl:"Seat 7",arm:234.35},{lbl:"Seat 8",arm:264.35},{lbl:"Seat 9",arm:264.35},{lbl:"Seat 10",arm:294.15},{lbl:"Seat 11",arm:294.15},{lbl:"Seat 12",arm:343},{lbl:"Seat 13",arm:343}],cargo:[{lbl:"Pod Zone 1",arm:132.4},{lbl:"Pod Zone 2",arm:182.1},{lbl:"Pod Zone 3",arm:233.4},{lbl:"Pod Zone 4",arm:287.6}],doc:"FMSSLARev.#110626",layout:"c208",fuelOver:50},
  "ZK-SDB":{id:"ZK-SDB",name:"ZK-SDB",type:"C-208B Grand Caravan",ew:2460.17,ea:192.958,em:474709.483,mtow:4110,mlw:4082,mrw:4111,cogMin:183.49,cogMax:204.4,fuelKg:363,fuelArm:203.1,gndBurn:11.34,burnDef:187,burnDefUnit:'lbs',seats:[{lbl:"PIC",arm:135.5,crew:true},{lbl:"Seat 1",arm:135.5},{lbl:"Seat 2",arm:176.9},{lbl:"Seat 3",arm:176.9},{lbl:"Seat 4",arm:211.9},{lbl:"Seat 5",arm:211.9},{lbl:"Seat 6",arm:246.9},{lbl:"Seat 7",arm:246.9},{lbl:"Seat 8",arm:281.9},{lbl:"Seat 9",arm:281.9},{lbl:"Seat 10",arm:344},{lbl:"Seat 11",arm:344}],cargo:[{lbl:"Pod Zone 1",arm:132.4},{lbl:"Pod Zone 2",arm:182.1},{lbl:"Pod Zone 3",arm:233.4},{lbl:"Pod Zone 4",arm:287.6}],doc:"FMSSDBRev.#110626B",layout:"c208",fuelOver:50},
  "ZK-SLB":{id:"ZK-SLB",name:"ZK-SLB",type:"C-208B Grand Caravan",ew:2340.91,ea:190.01,em:444796.309,mtow:3968,mlw:3856,mrw:3969,cogMin:181.71,cogMax:204.4,fuelKg:363,fuelArm:201.98,gndBurn:11.34,burnDef:187,burnDefUnit:'lbs',seats:[{lbl:"PIC",arm:133.5,crew:true},{lbl:"Seat 1",arm:133.5},{lbl:"Seat 2",arm:173.5},{lbl:"Seat 3",arm:173.5},{lbl:"Seat 4",arm:203.36},{lbl:"Seat 5",arm:203.36},{lbl:"Seat 6",arm:234.35},{lbl:"Seat 7",arm:234.35},{lbl:"Seat 8",arm:264.35},{lbl:"Seat 9",arm:264.35},{lbl:"Seat 10",arm:294.15},{lbl:"Seat 11",arm:294.15},{lbl:"Seat 12",arm:343},{lbl:"Seat 13",arm:343}],removedSeats:[12,13],cargo:[{lbl:"Pod Zone 1",arm:132.4},{lbl:"Pod Zone 2",arm:182.1},{lbl:"Pod Zone 3",arm:233.4},{lbl:"Pod Zone 4",arm:287.6}],doc:"FMSSLBRev.#110626",layout:"c208",fuelOver:50}
};
const CHARTER_RATES_DEF={
  "ZK-SLD":{perHour:2500,minHours:1,currency:'NZD'},
  "ZK-SLQ":{perHour:2500,minHours:1,currency:'NZD'},
  "ZK-SLA":{perHour:4500,minHours:1,currency:'NZD'},
  "ZK-SDB":{perHour:5000,minHours:1,currency:'NZD'},
  "ZK-SLB":{perHour:4500,minHours:1,currency:'NZD'},
};
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
function _acSpec(acId){return S.aircraft[acId]||S.aircraft[_ac(acId)];}
function fuelUnit(acId){return _acSpec(acId)?.layout==='ga8'?'L':'lbs';}
function toKg(v,acId){const n=parseFloat(v)||0;const a=_acSpec(acId);if(!a)return n;return a.layout==='ga8'?n*AVGAS:n*LB;}
function fromKg(kg,acId){return _acSpec(acId)?.layout==='ga8'?kg/AVGAS:kg/LB;}
function fuelKgForSetup(acId){const a=_acSpec(acId);if(!a)return 0;const s=(curDisp().acSetup||[]).find(x=>(x._seatmapKey||x.acId)===acId||x.acId===acId);const raw=s?.fuelInput!=null?s.fuelInput:fromKg(a.fuelKg,acId);return toKg(raw,acId);}
function burnToKg(v,acId){const a=_acSpec(acId);if(!a)return parseFloat(v)||0;const val=parseFloat(v)||0;if(a.burnDefUnit==='lbs') return val*LB;if(a.layout==='ga8'||a.burnDefUnit==='l'||a.burnDefUnit==='litres') return val*AVGAS;if(a.burnDefUnit==='kg') return val;return val*LB;}
function seat1IsCoPilot(acId){return !!((curDisp().acSetup||[]).find(s=>(s._seatmapKey||s.acId)===acId||s.acId===acId)?.coPilot);}
function paxSeatIdxs(acId){const a=_acSpec(acId);if(!a||!a.seats)return[];const removed=a.removedSeats||[];return a.seats.map((_,i)=>i).filter(i=>i!==0&&!(i===1&&seat1IsCoPilot(acId))&&!removed.includes(i));}

// Row pairs = seats at same arm (same physical row)
function rowPairsForAc(acId){
  const a=_acSpec(acId);if(!a||!a.seats)return[];
  const idxs=paxSeatIdxs(acId);
  const byArm={};
  idxs.forEach(i=>{if(!a.seats[i])return;const k=a.seats[i].arm.toFixed(4);if(!byArm[k])byArm[k]=[];byArm[k].push(i);});
  return Object.entries(byArm).sort((a,b)=>parseFloat(a[0])-parseFloat(b[0])).map(([,v])=>[...v].sort((a,b)=>a-b));
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
  const cW=parseFloat(form.seats[0]||0);
  // Co-pilot (seat 1) weight counts as crew when a co-pilot is assigned
  const cpW=form.coPilot?(parseFloat(form.seats[1]||0))+(parseFloat(form.bags[1]||0)):0;
  let wt=a.ew+cW,mom=a.em+cW*a.seats[0].arm,pW=0;
  for(let i=1;i<a.seats.length;i++){const w=(parseFloat(form.seats[i]||0))+(parseFloat(form.bags[i]||0));if(i===1&&form.coPilot){/* crew */}else{pW+=w;}wt+=w;mom+=w*a.seats[i].arm;}
  let cg=0;for(let i=0;i<a.cargo.length;i++){const w=parseFloat((form.cargo&&form.cargo[i])||0);cg+=w;wt+=w;mom+=w*a.cargo[i].arm;}
  const zfw=wt,fW=parseFloat(form.fuel||a.fuelKg);wt+=fW;mom+=fW*a.fuelArm;const rW=wt;
  wt-=a.gndBurn;mom-=a.gndBurn*a.fuelArm;
  const tow=wt,towCog=wt?mom/wt:0;
  const burnKg=form.burnOff?burnToKg(parseFloat(form.burnOff)||0,form.ac):burnToKg(a.burnDef,form.ac);
  wt-=burnKg;mom-=burnKg*a.fuelArm;
  return{crewW:cW+cpW,paxW:pW,cargoW:cg,zfw,fuelW:fW,rampW:rW,gndBurn:a.gndBurn,tow,towCog,burnKg,lw:wt,lwCog:mom/wt,
    towOk:tow<=a.mtow,lwOk:wt<=a.mlw,cogOk:towCog>=a.cogMin&&towCog<=a.cogMax,
    mtow:a.mtow,mlw:a.mlw,cogMin:a.cogMin,cogMax:a.cogMax};
}

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
  const tow=wt,cog=mom/wt,wtOver=Math.max(0,tow-a.mtow);
  const cogMid=(a.cogMin+a.cogMax)/2,cogDev=Math.abs(cog-cogMid);
  const cogOver=cog<a.cogMin?a.cogMin-cog:cog>a.cogMax?cog-a.cogMax:0;
  return wtOver*1000+cogOver*500+cogDev;
}

// ── Seat Assignment Engine ──
// Rules: groups fill consecutive rows; heaviest groups front; solos to seat 1 if free; 
// co-pilot seat used for odd-group overflow if no co-pilot assigned
function assignSeats(acId,paxList){
  const a=S.aircraft[acId];if(!a||!paxList.length)return{};
  const rows=rowPairsForAc(acId); // [[idx,idx],...]  front-to-back
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

function assignSeatsHeavyFront(acId, paxList){
  // Rules (in priority order):
  // 1. MTOW: heaviest pax forward keeps TOW manageable & CoG fwd
  // 2. Groups together side-by-side in pair rows
  //    - If odd group size: heaviest member of group goes to Seat 1 if available
  // 3. CoG within limits (heaviest forward is the primary mechanism)

  const a=_acSpec(acId);
  if(!a||!paxList.length) return{};

  const paxIdxs=paxSeatIdxs(acId);
  if(!paxIdxs.length) return{};

  // Seat layout: sorted front-to-back by arm
  const seatsByArm=[...paxIdxs].sort((x,y)=>(a.seats[x]?.arm||999)-(a.seats[y]?.arm||999));
  const seat1Idx=seatsByArm[0]; // frontmost pax seat
  const hasSeat1=!seat1IsCoPilot(acId);

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

  // Sort even groups heaviest-pair-first (sum of group weights)
  evenGroups.sort((a,b)=>
    b.reduce((s,p)=>s+parseFloat(p.weight||0)+parseFloat(p.bag||0),0)-
    a.reduce((s,p)=>s+parseFloat(p.weight||0)+parseFloat(p.bag||0),0));

  // Sort seat1Queue heaviest first (heaviest odd-member or solo gets seat1)
  seatOneQueue.sort((a,b)=>
    (parseFloat(b.weight||0)+parseFloat(b.bag||0))-
    (parseFloat(a.weight||0)+parseFloat(a.bag||0)));

  // Get pair rows (exclude seat1 slot)
  const rows=rowPairsForAc(acId); // [[1],[2,3],[4,5]...]
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
    const s1pax=seatOneQueue.shift(); // heaviest
    result[seat1Row[0]]=s1pax.id; placed.add(s1pax.id);
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
        const setup=(_D.acSetup||[]).find(s=>s.acId===acId);
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
function bD(){return{dep:'NZQN',dest:'NZMF',date:new Date().toISOString().slice(0,10),etd:'',etdCustom:false,name:'',acSetup:[],pax:[],seatMap:{},origAcMap:{},cargo:{},step:1};}
function bF(){return{ac:'',pic:'',coPilot:'',date:new Date().toISOString().slice(0,10),etd:'',etdCustom:false,dep:'NZQN',dest:'NZMF',seats:{},bags:{},names:{},infantNames:{},cargo:{},gndBurn:null,fuel:'',burnOff:'',paxType:{},paxGroups:{},sig:null};}
function bF_ac(acId){var f=bF();f.ac=acId;return f;}

let S={
  // Auth
  user:null,users:[],loginEmail:'',loginPw:'',loginErr:null,toasts:[],
  // Data
  crew:[],aircraft:{},charterRates:{},saved:[],manifests:[],
  syncStatus:'connecting',rtStatus:'offline',rtPresence:{},_presSection:null,
  // Audit
  auditLog:[],
  // Maintenance
  maintenance:{},maintBookings:{},roster:null,rosterWeek:null,rosterTab:'view',rosterFilter:'all',rosterLocked:true,rosterBuild:null,_rosterLoaded:false,_rosterSaved:false,_rosterLeave:null,_rosterLeaveWeek:null,_rosterColorsLoaded:false,_rosterColorEdit:false,rosterColors:null,_appLoading:false,_leave:null,_notifications:null,_notifOpen:false,uploadProgress:null,driveLastUpload:lsGet('ts_drive_last_upload')||null,wideMode:lsGet('ts_wide_mode')!==false,
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
  tab:'manifest',section:'operations',_drawerOpen:false,
  savedSearch:'',savedSort:'newest',savedTab:'loadsheets',savedSel:{},
  // Charter
  charter:{legs:[{from:'NZQN',to:'NZMF',acId:'',pax:1,note:''}],showQuote:false},
  // Admin
  rolePerms:{},admin:{section:'people',crewEditId:null,crewDraftN:'',crewDraftW:'',newN:'',newW:'',err:'',acSel:'ZK-SLD',acDraft:null,acErr:'',acSaved:false,userEditId:null,userDraft:{},newUser:{name:'',email:'',password:'',role:'desk',linkedCrew:''}},
  // Login form
  loginForm:{email:'',password:'',err:''},
  showReset:false,resetMsg:null,resetEmail:'',resetStep:0,showAccount:false,changePwMsg:null, // 0=login 1=email-sent 2=enter-codeappMsg:null,lockedAcs:[],formDirty:false,mobileAcIdx:0,sigMode:'draw',sigTypedName:'',maintTab:'overview',maintSearch:{},editAcId:null,auditFilter:'',auditFilterUser:'',auditPage:0,
  gdriveEnabled:false,gdriveClientId:'',gdriveFolder:'Loadsheets',gdriveFolderId:'',driveStatus:'',driveLastLink:'',driveLastFile:'',driveLastFolder:'',
};

// ── Load from Supabase ──
// ── localStorage helpers for cross-device persistence ──
function lsGet(key){try{const v=localStorage.getItem(key);return v?JSON.parse(v):null;}catch{return null;}}
function lsSet(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch{}}

async function loadAll(){
  try{
    // ── Launch all independent table reads in parallel (was a sequential waterfall) ──
    const [_pCrew,_pAircraft,_pRates,_pLoadsheets,_pManifests,_pUsers,_pPads]=await Promise.all([
      sbF('ts_crew'),
      sbF('ts_aircraft'),
      sbF('ts_charter_rates'),
      sbF('ts_loadsheets',Q_LOADSHEETS()),
      sbF('ts_manifests',Q_MANIFESTS()),
      sbF('ts_users'),
      sbF('ts_scratchpads','','saved_at')
    ]);
    // ── Crew — Supabase is source of truth; localStorage is fast-load cache + offline fallback ──
    let crew=_pCrew;
    if(crew&&crew.length){
      S.crew=crew.map(c=>({id:c.id,n:c.name,w:c.weight||0,
        endorse:c.endorsements?JSON.parse(c.endorsements):([]),
        code:c.code||'',dlNum:c.dl_num||'',caaNum:c.caa_license||'',
        medExpiry:c.medical_expiry||'',ocaDue:c.oca_due||'',
        firstAid:c.first_aid||'',avsecExpiry:c.avsec_expiry||'',
        photo:lsGet('ts_crew_photo_'+c.id)||''}));
      lsSet('ts_crew_cache',S.crew);
    } else {
      // Supabase unavailable — fall back to localStorage cache
      const _crewCache=lsGet('ts_crew_cache');
      if(_crewCache&&_crewCache.length){
        S.crew=_crewCache.map(c=>({...c,photo:lsGet('ts_crew_photo_'+(c.id||c.n))||c.photo||''}));
      } else {
        // First run — seed from defaults
        S.crew=CREW_DEF.map(c=>({id:c.id,n:c.name,w:c.weight}));
        await sbU('ts_crew',CREW_DEF);
        lsSet('ts_crew_cache',S.crew);
      }
    }

    // ── Aircraft ──
    let acR=_pAircraft;
    if(acR&&acR.length){
      S.aircraft={};acR.forEach(r=>{S.aircraft[r.id]=r.data||r;});
      // Migration: re-sync any aircraft whose seat count doesn't match AC_DEF
      const acMigrate=[];
      Object.keys(AC_DEF).forEach(function(id){
        const def=AC_DEF[id];const loaded=S.aircraft[id];
        if(loaded&&def&&(loaded.seats||[]).length!==(def.seats||[]).length){
          S.aircraft[id]=dc(def);acMigrate.push({id:id,data:dc(def)});
        }
      });
      if(acMigrate.length)await sbU('ts_aircraft',acMigrate);
      lsSet('ts_aircraft_cache',S.aircraft);
    } else {
      const cached=lsGet('ts_aircraft_cache');
      if(cached&&Object.keys(cached).length){S.aircraft=cached;}
      else{
        S.aircraft=dc(AC_DEF);
        await sbU('ts_aircraft',Object.values(AC_DEF).map(a=>({id:a.id,data:a})));
        lsSet('ts_aircraft_cache',S.aircraft);
      }
    }

    // ── Charter rates ──
    let cr=_pRates;
    if(cr&&cr.length){
      S.charterRates=Object.fromEntries(cr.map(r=>[r.acId,r.rates||dc(CHARTER_RATES_DEF[r.acId]||{perHour:0,minHours:1})]));
      lsSet('ts_charter_rates_cache',S.charterRates);
    } else {
      const cached=lsGet('ts_charter_rates_cache');
      S.charterRates=cached||dc(CHARTER_RATES_DEF);
    }
    // Load charter wait rate from Supabase (falls back to localStorage)
    try{
      const _wr=await fetch(SB+'/rest/v1/ts_settings?key=eq.charter_wait_rate&select=value',{headers:SH});
      if(_wr.ok){const _wd=await _wr.json();if(_wd[0]&&_wd[0].value){S.charterWaitRate=parseFloat(_wd[0].value)||150;lsSet('ts_charter_wait_rate',S.charterWaitRate);}
      else{S.charterWaitRate=lsGet('ts_charter_wait_rate')||150;}}
      else{S.charterWaitRate=lsGet('ts_charter_wait_rate')||150;}
    }catch(e){S.charterWaitRate=lsGet('ts_charter_wait_rate')||150;}
    // Load saved charter quotes
    try{
      const _cq=await fetch(SB+'/rest/v1/ts_settings?key=eq.charter_quotes&select=value',{headers:SH});
      if(_cq.ok){const _cqd=await _cq.json();if(_cqd[0]&&_cqd[0].value){lsSet('ts_charter_quotes_cache',JSON.parse(_cqd[0].value));}}
    }catch(e){}

    // ── Loadsheets ──
    const ls=_pLoadsheets;
    if(ls){
      S.saved=ls.map(r=>({id:r.id,savedAt:r.saved_at,form:r.form,status:r.status||'complete',driveUploaded:!!r.drive_uploaded}));
      lsSet('ts_loadsheets_cache',S.saved);
    } else {
      const cached=lsGet('ts_loadsheets_cache');
      if(cached)S.saved=cached;
    }

    // ── Manifests ──
    const ms=_pManifests;
    if(ms){
      S.manifests=ms.filter(r=>r.id!=='live_draft').map(r=>({id:r.id,name:r.name,savedAt:r.saved_at,data:r.data,_deleted:!!(r.data&&r.data._deleted)}));
      lsSet('ts_manifests_cache',S.manifests);
      const liveDraft=ms.find(r=>r.id==='live_draft');
      if(liveDraft&&liveDraft.data&&typeof liveDraft.data==='object'){
        S.dispatch={...bD(),...liveDraft.data,seatMap:{},step:1};
      }
    } else {
      const cached=lsGet('ts_manifests_cache');
      if(cached)S.manifests=cached;
    }

    // Init per-aircraft loadsheet forms
    ['SLA','SLB','SLD','SLQ','SDB'].forEach(function(ac){
      if(!S.lsForms[ac]) S.lsForms[ac]=bF_ac('ZK-'+ac);
    });
    S.form=S.lsForms[S.lsAc||'SLA'];

    // ── Users ──
    const us=_pUsers;
    const _initPads=_pPads;
    if(us&&us.length){
      S.users=us.map(r=>({id:r.id,name:r.name,email:r.email,role:r.role,linkedCrew:r.linked_crew||'',passwordHash:r.password_hash||'',weight:parseFloat(r.weight)||0,superAdmin:r.super_admin||r.role==='superadmin'||r.email==='andrew@truesouthflights.co.nz'||r.email==='adamsonandrew1@gmail.com'||false,isPilot:r.is_pilot||r.role==='pilot'||false,inactive:r.inactive||false}));
      lsSet('ts_users_cache',S.users);window.loadNotifications&&window.loadNotifications();
    } else {
      const cached=lsGet('ts_users_cache');
      if(cached&&cached.length){S.users=cached;}
      else{
        // Seed default admin
        const admin={id:'u_admin',name:'Andrew Adamson',email:'andrew@truesouthflights.co.nz',role:'admin',linkedCrew:'A. Adamson',passwordHash:btoa('admin123')};
        S.users=[admin];
        lsSet('ts_users_cache',S.users);
        await sbU('ts_users',[{id:admin.id,name:admin.name,email:admin.email,role:admin.role,linked_crew:admin.linkedCrew,password_hash:admin.passwordHash}]);
      }
    }
    if(_initPads&&_initPads.length){S.pads=_initPads.map(function(r){return{id:r.id,title:r.title||'Untitled',content:r.content||'',drawing:r.drawing||[],savedAt:r.saved_at};});}

    // ── Role Permissions ──
    try{
      const _rpCached=lsGet('ts_role_perms');
      if(_rpCached) S.rolePerms=_rpCached;
      const _rpRow=await fetch(`${SB}/rest/v1/ts_settings?key=eq.role_perms&select=value`,{headers:SH});
      if(_rpRow.ok){const _rpData=await _rpRow.json();if(_rpData[0]?.value){S.rolePerms=JSON.parse(_rpData[0].value);lsSet('ts_role_perms',S.rolePerms);}}
    }catch(e){}

    S.syncStatus='ok';
  }catch(e){
    console.error('loadAll error:',e);
    S.syncStatus='error';
    // Full localStorage fallback on error
    S.crew=lsGet('ts_crew_cache')||CREW_DEF.map(c=>({id:c.id,n:c.name,w:c.weight}));
    const _cachedAc=lsGet('ts_aircraft_cache');
    if(_cachedAc){
      // Merge cached data with AC_DEF to ensure seats arrays are present
      S.aircraft={};
      Object.keys(AC_DEF).forEach(function(id){
        S.aircraft[id]=Object.assign({},AC_DEF[id],_cachedAc[id]||{});
        // Always use AC_DEF seats (not cached, as arrays don't serialize cleanly)
        S.aircraft[id].seats=AC_DEF[id].seats;
        S.aircraft[id].cargo=AC_DEF[id].cargo;
      });
    } else {
      S.aircraft=dc(AC_DEF);
    }
    S.charterRates=lsGet('ts_charter_rates_cache')||dc(CHARTER_RATES_DEF);
    S.saved=lsGet('ts_loadsheets_cache')||[];
    S.manifests=lsGet('ts_manifests_cache')||[];
    const cachedUsers=lsGet('ts_users_cache');
    if(cachedUsers&&cachedUsers.length){
      S.users=cachedUsers;
    } else {
      // Seed default admin if no cache (first visit, offline)
      const admin={id:'u_admin',name:'Andrew Adamson',email:'andrew@truesouthflights.co.nz',
        role:'admin',linkedCrew:'A. Adamson',passwordHash:btoa('admin123'),superAdmin:true};
      S.users=[admin];
      lsSet('ts_users_cache',S.users);
    }
  }

  // Ensure at least one user exists (defensive)
  if(!S.users||!S.users.length){
    const admin={id:'u_admin',name:'Andrew Adamson',email:'andrew@truesouthflights.co.nz',
      role:'admin',linkedCrew:'A. Adamson',passwordHash:btoa('admin123'),superAdmin:true};
    S.users=[admin];
    lsSet('ts_users_cache',S.users);
  }
  S.gdriveEnabled=lsGet('gdrive_enabled')||false;
  S.gdriveClientId=lsGet('gdrive_client_id')||'';
  S.gdriveFolder=lsGet('gdrive_folder')||'Loadsheets';
  S.gdriveFolderId=lsGet('gdrive_folder_id')||'';
  // Restore session
  const savedUser=sessionStorage.getItem('ts_user');
  if(savedUser)try{S.user=JSON.parse(savedUser);}catch{}
  if(S.user){auditLog('session_restore',{via:'session',user:S.user.email});setTimeout(function(){initRealtime();},300);}
  // Restore remembered session if no session in sessionStorage
  if(!S.user){const rem=localStorage.getItem('ts_remembered_user');if(rem)try{const ru=JSON.parse(rem);const live=S.users.find(x=>x.id===ru.id&&x.passwordHash===ru.passwordHash);if(live){S.user=live;if(live.email==='andrew@truesouthflights.co.nz'||live.email==='adamsonandrew1@gmail.com'||live.role==='superadmin')live.superAdmin=true;sessionStorage.setItem('ts_user',JSON.stringify(live));['ts_maintenance','ts_loadsheets_cache','ts_drive_uploaded_ids','ts_drive_last_upload'].forEach(function(k){localStorage.removeItem(k);});auditLog('session_restore',{via:'remember_me',user:live.email});setTimeout(initRealtime,0);}}catch(e){}}
  // Load audit log from localStorage first (instant)
  S.auditLog=lsGet('ts_audit_log')||[];
  render();
  if(S.user)setTimeout(function(){restoreWorkspace();},400);
  // Then fetch latest 50 from Supabase in background (works on fresh login AND refresh)
  if(S.user?.superAdmin){
    (async()=>{try{
      const r=await fetch(SB+'/rest/v1/ts_audit_log?order=created_at.desc&limit=50',{
        headers:{'apikey':SK,'Authorization':'Bearer '+SK}
      });
      if(!r.ok) return;
      const rows=await r.json();
      const mapped=rows.map(x=>({
        time:x.created_at,user:x.user_email,name:x.user_name||x.user_email,
        role:x.role,action:x.action,detail:x.detail,device:x.device
      }));
      const existing=new Set((S.auditLog||[]).map(e=>e.time+e.user+e.action));
      const fresh=mapped.filter(e=>!existing.has(e.time+e.user+e.action));
      if(fresh.length){
        S.auditLog=[...mapped,...(S.auditLog||[]).filter(e=>!existing.has(e.time+e.user+e.action))];
        S.auditLog=S.auditLog.slice(0,1000);
        lsSet('ts_audit_log',S.auditLog);
        render(); // re-render to show fresh data
      }
    }catch(e){console.warn('Audit fetch failed:',e);}})();
  }
}

// ── Supabase Realtime ──
let _rtWs=null,_rtRef=0,_rtHb=null,_rtRecon=null,_rtPending=new Set(),_rtFlush=null;
const _sessionId='sess_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);

function initRealtime(){
  if(_rtWs){try{_rtWs.onclose=null;_rtWs.close();}catch{}  _rtWs=null;}
  clearInterval(_rtHb);clearTimeout(_rtRecon);
  const tables=['ts_crew','ts_aircraft','ts_users','ts_loadsheets','ts_manifests','ts_charter_rates','ts_settings','ts_maintenance'];
  try{
    _rtWs=new WebSocket('wss://wgycephyuwwfogggcbye.supabase.co/realtime/v1/websocket?apikey='+SK+'&vsn=1.0.0');
    _rtWs.onopen=function(){
      _rtRef++;
      _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'phx_join',
        payload:{config:{broadcast:{self:false},postgres_changes:tables.map(function(t){return{event:'*',schema:'public',table:t};})},access_token:SK},
        ref:String(_rtRef)}));
      _rtHb=setInterval(function(){
        if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'phoenix',event:'heartbeat',payload:{},ref:String(_rtRef)}));}
      },29000);
      S.rtStatus='connecting';safeRender();
    };
    _rtWs.onmessage=function(e){
      try{
        const msg=JSON.parse(e.data);
        if(msg.event==='postgres_changes'){
          const tbl=msg.payload&&msg.payload.data&&msg.payload.data.table;
          if(tbl){_rtPending.add(tbl);clearTimeout(_rtFlush);_rtFlush=setTimeout(flushRtUpdates,500);}
        }
        if(msg.event==='phx_reply'&&msg.topic==='realtime:ts-fms'){
          if(msg.payload&&msg.payload.status==='ok'){
            S.rtStatus='live';if(S._presSection)broadcastPresence(S._presSection);safeRender();
          } else if(msg.payload&&msg.payload.status==='error'){
            S.rtStatus='offline';safeRender();
          }
        }
        if(msg.event==='phx_reply'&&msg.topic==='realtime:ts-fms'){
          if(msg.payload&&msg.payload.status==='ok'){
            S.rtStatus='live';if(S._presSection)broadcastPresence(S._presSection);safeRender();
          } else if(msg.payload&&msg.payload.status==='error'){
            S.rtStatus='offline';safeRender();
          }
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='dispatch'){
          const dp=msg.payload.payload;
          if(dp&&(S.tab==='manifest'||S.tab==='seatmap')){mergeDispatch(dp);S._pendingFlash=(S._pendingFlash||[]).concat(['flash-manifest','flash-seatmap']);}
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='pres'){
          const p=msg.payload.payload;
          if(p&&p.userId&&p.userId!==S.user?.id){
            S.rtPresence=S.rtPresence||{};
            if(p.section){S.rtPresence[p.userId]={name:p.name,section:p.section,color:p.color,ts:p.ts};}
            else{delete S.rtPresence[p.userId];}
            const now=Date.now();
            Object.keys(S.rtPresence).forEach(function(k){if(now-(S.rtPresence[k].ts||0)>22000)delete S.rtPresence[k];});
            updatePresBar(S._presSection||'manifest');
          }
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='admin_kick'){
          const _kp=msg.payload.payload;
          if(_kp&&_kp.userId&&S.user&&_kp.userId===S.user.id){logout();alert('You have been logged out by an administrator.');}
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='crew_update'){
          if(msg.payload.payload&&msg.payload.payload.updatedBy!==S.user?.id){
            Promise.all([reloadTable('ts_crew'),reloadTable('ts_users')]).then(function(){S._pendingFlash=(S._pendingFlash||[]).concat(['flash-admin']);safeRender();});
          }
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='ls_saved'){
          if(S.tab==='saved'){reloadTable('ts_loadsheets');reloadTable('ts_scratchpads').then(function(){safeRender();});}
          else{reloadTable('ts_loadsheets');}
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='ls_tab_open'){
          const _tp=msg.payload.payload;
          if(_tp&&_tp.id&&!S.lsTabs.find(function(t){return t.id===_tp.id;})){
            var _tpStatus=_tp.status||'unsigned';
            S.lsTabs.push({id:_tp.id,acId:_tp.acId,form:_tp.form,status:_tpStatus,savedAt:_tp.savedAt,isNew:_tp.isNew||false});
            if(_tpStatus==='draft'&&!(S.saved||[]).find(function(x){return x.id===_tp.id;})){
              S.saved=S.saved||[];S.saved.unshift({id:_tp.id,form:_tp.form,status:'draft',savedAt:_tp.savedAt});
              lsSet('ts_loadsheets_cache',S.saved);
            }
            if(_tp.by&&S.user&&_tp.by!==S.user.name)toast((_tp.by||'Someone')+' opened '+((_tp.acId||'').replace('ZK-',''))+' loadsheet','info');
            safeRender();
          }
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='ls_tab_close'){
          var _closeId=msg.payload.payload&&msg.payload.payload.id;
          if(_closeId){
            var _clTab=(S.lsTabs||[]).find(function(t){return t.id===_closeId;});
            var _clAcCode=_clTab&&_clTab.acId?_clTab.acId.replace('ZK-',''):null;
            S.lsTabs=(S.lsTabs||[]).filter(function(t){return t.id!==_closeId;});
            if(S.activeTabId===_closeId){
              S.activeTabId=null;S.editId=null;S.section='operations';S.tab='manifest';
              S.form=bF();
              if(_clAcCode)S.lsForms[_clAcCode]=bF_ac('ZK-'+_clAcCode);
            } else if(_clAcCode&&!((S.lsTabs||[]).find(function(t){return t.acId&&t.acId.replace('ZK-','')===_clAcCode;}))){
              S.lsForms[_clAcCode]=bF_ac('ZK-'+_clAcCode);
            }
            safeRender();
          }
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='manifest_tabs'){
          var _mtpl=msg.payload.payload;
          if(_mtpl&&_mtpl.sessionId!==_sessionId){
            S._manifestDispatches=S._manifestDispatches||{};
            Object.entries(_mtpl.dispatches||{}).forEach(function(e){
              if(e[0]!==_mtpl.activeTabId)S._manifestDispatches[e[0]]=e[1];
            });
            S.manifestTabs=_mtpl.tabs||[];
            if(_mtpl.activeTabId!==S.activeManifestTabId){
              if(S.activeManifestTabId)S._manifestDispatches[S.activeManifestTabId]=JSON.parse(JSON.stringify(S.dispatch));
              S.activeManifestTabId=_mtpl.activeTabId;
              var _incomingDisp=(_mtpl.dispatches||{})[_mtpl.activeTabId];
              if(_incomingDisp)mergeDispatch(_incomingDisp);
            } else if(!_mtpl.activeTabId){
              S.activeManifestTabId=null;
            }
            var _openIds=new Set((_mtpl.tabs||[]).map(function(t){return t.id;}));
            Object.keys(S._manifestDispatches||{}).forEach(function(id){
              if(!_openIds.has(id))delete S._manifestDispatches[id];
            });
            if(S.tab==='manifest'||S.tab==='seatmap')safeRender();
          }
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='workspace_update'){
          var _wupl=msg.payload.payload;
          if(_wupl&&_wupl.sessionId!==_sessionId&&_wupl.state){_applyWorkspace(_wupl.state);}
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='ls_signed'){
          var _sipl=msg.payload.payload;
          if(_sipl&&_sipl.sessionId!==_sessionId){
            if(_sipl.by&&S.user&&_sipl.by!==S.user.name)toast((_sipl.by||'Someone')+' created '+(_sipl.acCode||'')+' loadsheet','ok');
            reloadTable('ts_loadsheets').then(function(){
              // Update open tab form so signature shows live
              if(_sipl.id){
                var _sf=(S.saved||[]).find(function(s){return s.id===_sipl.id;});
                if(_sf){var _st=(S.lsTabs||[]).find(function(t){return t.id===_sipl.id;});if(_st){_st.form=_sf.form;if(S.activeTabId===_sipl.id){S.form=_sf.form;}}}
              }
              safeRender();
            });
          }
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='ls_deleted'){
          var _dlpl=msg.payload.payload;
          if(_dlpl&&_dlpl.id&&_dlpl.sessionId!==_sessionId){
            var _delTab=(S.lsTabs||[]).find(function(t){return t.id===_dlpl.id;});
            var _delAcCode=_delTab&&_delTab.acId?_delTab.acId.replace('ZK-',''):null;
            S.saved=(S.saved||[]).filter(function(s){return s.id!==_dlpl.id;});
            lsSet('ts_loadsheets_cache',S.saved);
            S.lsTabs=(S.lsTabs||[]).filter(function(t){return t.id!==_dlpl.id;});
            if(S.activeTabId===_dlpl.id){
              S.activeTabId=null;S.editId=null;S.section='operations';S.tab='manifest';
              S.form=bF();
              if(_delAcCode)S.lsForms[_delAcCode]=bF_ac('ZK-'+_delAcCode);
            } else if(_delAcCode&&!((S.lsTabs||[]).find(function(t){return t.acId&&t.acId.replace('ZK-','')===_delAcCode;}))){
              S.lsForms[_delAcCode]=bF_ac('ZK-'+_delAcCode);
            }
            safeRender();
          }
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='charter_update'){
          var _cupl=msg.payload.payload;
          if(_cupl&&_cupl.sessionId!==_sessionId){
            if(_cupl.quotes)lsSet('ts_charter_quotes_cache',_cupl.quotes);
            if(_cupl.by&&S.user&&_cupl.by!==S.user.name)toast((_cupl.by||'Someone')+' updated charter quotes','info');
            if(S.tab==='charter')safeRender();
          }
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='pad_update'){
          var _pupl=msg.payload.payload;
          if(_pupl&&_pupl.id){
            var _pt=S.padTabs.find(function(t){return t.id===_pupl.id;});
            if(_pt&&!_pt._dirty){_pt.content=_pupl.content!=null?_pupl.content:_pt.content;_pt.title=_pupl.title||_pt.title;safeRender();}
            var _ps=S.pads.find(function(p){return p.id===_pupl.id;});
            if(_ps){_ps.content=_pupl.content!=null?_pupl.content:_ps.content;_ps.title=_pupl.title||_ps.title;}
          }
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='pad_new'){
          var _pnpl=msg.payload.payload;
          if(_pnpl&&_pnpl.id&&!S.pads.find(function(p){return p.id===_pnpl.id;})){
            reloadTable('ts_scratchpads').then(function(){safeRender();});
          }
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='pad_stroke'){
          var _pspl=msg.payload.payload;
          if(_pspl&&_pspl.id){
            var _pt2=S.padTabs.find(function(t){return t.id===_pspl.id;});
            if(_pt2&&_pspl.stroke){
              if(!_pt2.drawing)_pt2.drawing=[];
              _pt2.drawing.push(_pspl.stroke);
              if(S.activePadId===_pspl.id){
                var _cv=document.getElementById('pad-canvas');
                if(_cv){var _ctx=_cv.getContext('2d');var _sk=_pspl.stroke;if(_sk.points&&_sk.points.length>0){_ctx.lineCap='round';_ctx.lineJoin='round';_ctx.strokeStyle=_sk.color||'#ffffff';_ctx.lineWidth=_sk.width||3;_ctx.globalCompositeOperation=_sk.eraser?'destination-out':'source-over';_ctx.beginPath();_ctx.moveTo(_sk.points[0].x,_sk.points[0].y);_sk.points.forEach(function(pt){_ctx.lineTo(pt.x,pt.y);});_ctx.stroke();_ctx.globalCompositeOperation='source-over';}}
              }
            }
          }
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='ls_update'){
          const _lsp=msg.payload.payload;
          if(_lsp&&_lsp.sessionId!==_sessionId){
            // Find tab by ID (most reliable for aircraft changes) then fall back to acCode
            var _lsTF=null;
            if(_lsp.tabId)_lsTF=(S.lsTabs||[]).find(function(t){return t.id===_lsp.tabId;});
            if(!_lsTF&&_lsp.acCode)_lsTF=(S.lsTabs||[]).find(function(t){return t.acId&&t.acId.replace('ZK-','')===_lsp.acCode;});
            if(_lsp.form){
              // Flash detection on active form
              if(S.lsAc===_lsp.acCode&&S.form&&_lsp.form){
                S._lsFlash=S._lsFlash||{};var _fNow=Date.now();var _of=S.form;var _nf=_lsp.form;
                if(String(_of.fuel||'')!==String(_nf.fuel||'')||String(_of.burnOff||'')!==String(_nf.burnOff||''))S._lsFlash.fuel=_fNow;
                if(String(_of.dep||'')!==String(_nf.dep||'')||String(_of.dest||'')!==String(_nf.dest||'')||String(_of.pic||'')!==String(_nf.pic||'')||String(_of.coPilot||'')!==String(_nf.coPilot||''))S._lsFlash.route=_fNow;
                var _oN=_of.names||{},_nN=_nf.names||{};
                if(Object.keys(Object.assign({},_oN,_nN)).some(function(k){return String(_oN[k]||'')!==String(_nN[k]||'');}))S._lsFlash.seats=_fNow;
              }
              if(_lsp.acCode)S.lsForms[_lsp.acCode]=_lsp.form;
              if(_lsTF){
                _lsTF.form=_lsp.form;
                // Update acId on tab if aircraft changed on other device
                if(_lsp.form.ac&&_lsTF.acId!==_lsp.form.ac)_lsTF.acId=_lsp.form.ac;
                if(S.activeTabId===_lsTF.id){
                  S.form=_lsp.form;
                  if(_lsp.form.ac)S.lsAc=_lsp.form.ac.replace('ZK-','');
                }
              } else if(_lsp.acCode&&S.lsAc===_lsp.acCode&&S.activeTabId){
                S.form=_lsp.form;
              }
            }
            // Sync UI mode state from sender
            if(_lsp.meta){
              if(_lsp.meta._showUnalloc!=null)S._showUnalloc=!!_lsp.meta._showUnalloc;
              if(_lsp.meta._lsSeatMode)S._lsSeatMode=_lsp.meta._lsSeatMode;
            }
            if(S.tab==='saved')reloadTable('ts_loadsheets').then(function(){safeRender();});
            else{
              // If we're viewing this loadsheet and not actively typing, refresh it now.
              var _ae=document.activeElement,_aet=_ae&&_ae.tagName;
              if(_aet==='INPUT'||_aet==='SELECT'||_aet==='TEXTAREA')safeRender();else render();
            }
          }
        }
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='sm_update'){
          var _smp=msg.payload.payload;
          if(_smp&&_smp.sessionId!==_sessionId&&_smp.ws){
            S.smWS=_smp.ws;
            try{lsSet('ts_smws',S.smWS);}catch(e){}
            if(S.tab==='seatmap'){
              var _sae=document.activeElement,_saet=_sae&&_sae.tagName;
              try{S.solverAutoApply=false;runSolver();S.solverAutoApply=true;}catch(e){}
              if(_saet==='INPUT'||_saet==='SELECT'||_saet==='TEXTAREA')safeRender();else render();
            }
          }
        }
      }catch(err){}
    };
    _rtWs.onclose=function(){
      clearInterval(_rtHb);
      if(S.rtStatus!=='offline'){S.rtStatus='offline';safeRender();}
      if(S.user)_rtRecon=setTimeout(initRealtime,8000);
    };
    _rtWs.onerror=function(){try{_rtWs.close();}catch{}};
  }catch(e){console.warn('Realtime init error:',e);}
}

async function flushRtUpdates(){
  const tables=[..._rtPending];_rtPending.clear();
  let changed=false;
  for(const t of tables){const ok=await reloadTable(t);if(ok)changed=true;}
  if(changed){
    var _fIds=[];
    if(tables.some(function(t){return t==='ts_charter_rates';}))_fIds.push('flash-charter');
    if(tables.some(function(t){return t==='ts_maintenance';}))_fIds.push('flash-maintenance');
    if(tables.some(function(t){return t==='ts_aircraft';}))_fIds.push('flash-maintenance','flash-charter');
    if(tables.some(function(t){return t==='ts_crew'||t==='ts_users';}))_fIds.push('flash-admin');
    if(_fIds.length)S._pendingFlash=(S._pendingFlash||[]).concat(_fIds);
    safeRender();
  }
}

async function reloadTable(table){
  if(table==='ts_loadsheets'){
    const ls=await sbF('ts_loadsheets',Q_LOADSHEETS());
    if(ls){
      S.saved=ls.map(function(r){return{id:r.id,savedAt:r.saved_at,form:r.form,status:r.status||'complete'};});
      lsSet('ts_loadsheets_cache',S.saved);
      return true;
    }
  } else if(table==='ts_scratchpads'){
    const ps=await sbF('ts_scratchpads','','saved_at');
    if(ps){S.pads=ps.map(function(r){return{id:r.id,title:r.title||'Untitled',content:r.content||'',drawing:r.drawing||[],savedAt:r.saved_at};});return true;}
  } else if(table==='ts_manifests'){
    const ms=await sbF('ts_manifests',Q_MANIFESTS());
    if(ms){
      const live=ms.find(function(r){return r.id==='live_draft';});
      var _lsForeignChange=false;
      ms.forEach(function(r){
        if(r.id.startsWith('ls_live_')&&r.data){
          const _ac=r.id.slice(8);
          if(Date.now()-_ownLSSaveTs<3500){return;} // suppress own postgres echo
          S.lsForms[_ac]=r.data;
          if(S.lsAc===_ac)S.form=r.data;
          _lsForeignChange=true;
        }
      });
      var _ownEcho=false;
      if(live&&live.data){
        if(live.data._updatedBy===S.user?.id){_ownEcho=true;}
        else{mergeDispatch(live.data);}
      }
      S.manifests=ms.filter(function(r){return r.id!=='live_draft'&&!r.id.startsWith('ls_live_');}).map(function(r){return{id:r.id,name:r.name,savedAt:r.saved_at,data:r.data,_deleted:!!(r.data&&r.data._deleted)};});
      lsSet('ts_manifests_cache',S.manifests);return !_ownEcho||_lsForeignChange;
    }
  } else if(table==='ts_crew'){
    const crew=await sbF('ts_crew');
    if(crew&&crew.length){
      S.crew=crew.map(function(c){return{id:c.id,n:c.name,w:c.weight||0,
        endorse:c.endorsements?JSON.parse(c.endorsements):[],
        code:c.code||'',dlNum:c.dl_num||'',caaNum:c.caa_license||'',
        medExpiry:c.medical_expiry||'',ocaDue:c.oca_due||'',
        firstAid:c.first_aid||'',avsecExpiry:c.avsec_expiry||'',
        photo:lsGet('ts_crew_photo_'+c.id)||''};});
      lsSet('ts_crew_cache',S.crew);return true;
    }
  } else if(table==='ts_aircraft'){
    const acR=await sbF('ts_aircraft');
    if(acR&&acR.length){S.aircraft={};acR.forEach(function(r){S.aircraft[r.id]=r.data||r;});lsSet('ts_aircraft_cache',S.aircraft);return true;}
  } else if(table==='ts_users'){
    const us=await sbF('ts_users');
    if(us&&us.length){
      S.users=us.map(function(r){return{id:r.id,name:r.name,email:r.email,role:r.role,linkedCrew:r.linked_crew||'',
        passwordHash:r.password_hash||'',weight:parseFloat(r.weight)||0,
        superAdmin:r.super_admin||r.role==='superadmin'||r.email==='andrew@truesouthflights.co.nz'||r.email==='adamsonandrew1@gmail.com'||false,
        isPilot:r.is_pilot||r.role==='pilot'||false,inactive:r.inactive||false};});
      lsSet('ts_users_cache',S.users);
      if(S.user){const fresh=S.users.find(function(u){return u.id===S.user.id;});if(fresh){S.user=Object.assign({},fresh);sessionStorage.setItem('ts_user',JSON.stringify(S.user));}}
      return true;
    }
  } else if(table==='ts_charter_rates'){
    const cr=await sbF('ts_charter_rates');
    if(cr&&cr.length){S.charterRates=Object.fromEntries(cr.map(function(r){return[r.acId,r.rates||dc(CHARTER_RATES_DEF[r.acId]||{perHour:0,minHours:1})];}));lsSet('ts_charter_rates_cache',S.charterRates);return true;}
  } else if(table==='ts_settings'){
    try{
      const r=await fetch(SB+'/rest/v1/ts_settings?key=in.(role_perms,charter_wait_rate,maintenance)&select=key,value',{headers:SH});
      if(r.ok){
        const rows=await r.json();let changed=false;
        rows.forEach(function(row){
          if(row.key==='role_perms'&&row.value&&Date.now()-(S._permsEditTs||0)>5000){S.rolePerms=JSON.parse(row.value);lsSet('ts_role_perms',S.rolePerms);changed=true;}
          if(row.key==='charter_wait_rate'&&row.value){S.charterWaitRate=parseFloat(row.value)||150;lsSet('ts_charter_wait_rate',S.charterWaitRate);changed=true;}
          if(row.key==='maintenance'&&row.value){
            try{const m=JSON.parse(row.value);if(m&&m.hist){S.maintenance=m;lsSet('ts_maintenance',m);changed=true;}}catch(e){}
          }
        });
        return changed;
      }
    }catch(e){}
  }
  return false;
}

// ── Presence broadcasting ──
let _presInterval=null;
function broadcastPresence(section){
  S._presSection=section;
  if(!_rtWs||_rtWs.readyState!==1||!S.user)return;
  _rtRef++;
  _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',
    payload:{type:'broadcast',event:'pres',payload:{
      userId:S.user.id,name:S.user.name||S.user.email,code:(function(){var mc=(S.user.linkedCrew||'').trim().toLowerCase();var cr=(S.crew||[]).find(function(c){return(c.n||'').trim().toLowerCase()===mc;});return cr&&cr.code?cr.code:'';})(),
      section:section,color:presColor(S.user.id),ts:Date.now()
    }},ref:String(_rtRef)}));
}
function broadcastDispatch(){
  if(!_rtWs||_rtWs.readyState!==1||!S.user)return;
  _rtRef++;
  _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',
    payload:{type:'broadcast',event:'dispatch',payload:S.dispatch},
    ref:String(_rtRef)}));
}
function broadcastManifestTabs(){
  if(!_rtWs||_rtWs.readyState!==1||!S.user)return;
  _rtRef++;
  var allDisps={};
  (S.manifestTabs||[]).forEach(function(t){
    allDisps[t.id]=t.id===S.activeManifestTabId?S.dispatch:((S._manifestDispatches||{})[t.id]||{});
  });
  _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',
    payload:{type:'broadcast',event:'manifest_tabs',payload:{
      tabs:S.manifestTabs||[],
      activeTabId:S.activeManifestTabId,
      dispatches:allDisps,
      updatedBy:S.user.id,
      sessionId:_sessionId
    }},
    ref:String(_rtRef)}));
}
function broadcastCharter(){
  if(!_rtWs||_rtWs.readyState!==1||!S.user)return;
  const _cq=lsGet('ts_charter_quotes_cache')||[];
  _rtRef++;
  _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',
    payload:{type:'broadcast',event:'charter_update',payload:{quotes:_cq,by:(S.user&&S.user.name)||'',sessionId:_sessionId}},
    ref:String(_rtRef)}));
}
// ── Manifest pax tab-key navigation ──
// _ffRow/_ffField: force-focus globals. Tab handler sets these then calls render().
// render() uses them to focus the right element after rebuilding the DOM.
// We never call next.focus() directly — doing so inside keydown triggers blur→render()
// synchronously, which destroys the element we just focused (browser then steals focus back).
let _ffRow=null,_ffField=null;
document.addEventListener('keydown',function(e){
  if(e.key!=='Tab')return;
  if(!document.querySelector('[data-field="name"]'))return;
  const el=e.target;
  const pf=el.dataset&&el.dataset.field;
  const pr=el.dataset&&el.dataset.row;
  if(!pf||pr===undefined||pr===null)return;
  e.preventDefault();
  const rowIdx=parseInt(pr);
  const fields=['name','group'];
  const fi=fields.indexOf(pf);
  if(fi<0)return;
  let nextRow,nextField;
  if(!e.shiftKey){
    if(fi<3){nextRow=rowIdx;nextField=fields[fi+1];}
    else{nextRow=rowIdx+1;nextField='name';}
  }else{
    if(fi>0){nextRow=rowIdx;nextField=fields[fi-1];}
    else if(rowIdx>0){nextRow=rowIdx-1;nextField='bag';}
    else return;
  }
  // Save current field value before render destroys it
  if(el.value!==undefined){
    const curField=pf,curI=parseInt(pr);
    if(S.dispatch.pax[curI]!==undefined)S.dispatch.pax[curI][curField]=el.value;
  }
  _ffRow=String(nextRow);_ffField=nextField;
  render();
  // If next row doesn't exist yet (Tab past last pax), create it
  if(!document.querySelector('[data-row="'+nextRow+'"][data-field="name"]')&&!e.shiftKey){
    addPax();
    setTimeout(function(){_ffRow=String(nextRow);_ffField='name';render();},30);
  }
});
window.adminKickUser=function(userId){
  if(!_rtWs||_rtWs.readyState!==1){alert('Not connected to realtime.');return;}
  var _kp=S.rtPresence&&S.rtPresence[userId];
  var _kName=(_kp&&_kp.name)||userId;
  _rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'admin_kick',payload:{userId:userId,by:(S.user&&S.user.name)||''}},ref:String(_rtRef)}));
  auditLog('admin_kick',{target:_kName,targetId:userId,by:(S.user&&S.user.name)||''});
  // Also clear locally
  delete S.rtPresence[userId];updatePresBar(S._presSection||'manifest');
};
function startPresenceBroadcast(section){
  if(S._presSection===section)return;
  clearInterval(_presInterval);
  broadcastPresence(section);
  _presInterval=setInterval(function(){if(S.user)broadcastPresence(S._presSection);},9000);
}

// ── Collaborative manifest ──
let _autoSaveTimer=null;
let _autoNamedSaveTimer=null;
function autoSaveDispatch(){
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer=setTimeout(async function(){
    if(!S.user)return;
    S.dispatch._updateTs=Date.now();
    S.dispatch._updatedBy=S.user.id;
    await sbU('ts_manifests',[{id:'live_draft',name:'__live__',
      saved_at:new Date().toISOString(),data:S.dispatch}]);
    broadcastDispatch();
  },800);
  clearTimeout(_autoNamedSaveTimer);
  _autoNamedSaveTimer=setTimeout(function(){autoNamedSave();},180000);
}

// -- Loadsheet live sync --
let _autoSaveLSTimer=null;
let _ownLSSaveTs=0;
function autoSaveLS(){
  const _id=S.editId;
  const _acCode=S.lsAc;
  if(!S.user||!_id)return;
  const _formSnap=dc(S.form);
  clearTimeout(_autoSaveLSTimer);
  _autoSaveLSTimer=setTimeout(function(){
    const form=_formSnap;
    const tab=S.lsTabs.find(function(t){return t.id===_id;});
    if(!tab)return;
    tab.form=form;
    broadcastLS(_acCode,form,_id);
  },900);
}
async function saveLsToDb(id,form){
  if(!S.user||!id||!form)return;
  const status=form.status||'unsigned';
  await sbU('ts_loadsheets',[{id:id,form:form,saved_at:new Date().toISOString(),status:status}]);
  S.saved=(S.saved||[]).map(function(s){return s.id===id?Object.assign({},s,{form:form,savedAt:new Date().toISOString(),status:status}):s;});
  lsSet('ts_loadsheets_cache',S.saved);
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_saved',payload:{id:id,by:(S.user&&S.user.name)||'',sessionId:_sessionId}},ref:String(_rtRef)}));}
}
function _cleanPresence(){
  if(!S.rtPresence)return;
  const now=Date.now();
  let changed=false;
  Object.keys(S.rtPresence).forEach(function(k){if(now-(S.rtPresence[k].ts||0)>22000){delete S.rtPresence[k];changed=true;}});
  if(changed)safeRender();
}
setInterval(_cleanPresence,5000);
var _hiddenAt=0;
document.addEventListener('visibilitychange',function(){
  if(document.hidden){
    _hiddenAt=Date.now();
    if(S._presSection)broadcastPresence(null);
    clearInterval(_presInterval);
  } else {
    var awayMs=_hiddenAt?Date.now()-_hiddenAt:0;
    // Came back after being away a while (phone backgrounded etc.) — the realtime
    // socket has usually dropped, so the open loadsheets/manifests can be stale.
    // Do a full refresh to pull the latest data + workspace. (No-cache headers make
    // this cheap, and loadAll + restoreWorkspace rebuild the correct open tabs.)
    var _rUnsaved=(typeof _rosterUnsaved==='function')&&_rosterUnsaved();
    if(S.user&&awayMs>60000&&!_rUnsaved){location.reload();return;}
    // Brief switch — just reconnect realtime if it dropped, and resume presence.
    if(S.user&&(!_rtWs||_rtWs.readyState!==1)){try{initRealtime();}catch(e){}}
    if(S._presSection){broadcastPresence(S._presSection);_presInterval=setInterval(function(){if(S.user)broadcastPresence(S._presSection);},9000);}
  }
});
window.addEventListener('beforeunload',function(e){if(S._presSection)broadcastPresence(null);if(typeof _rosterUnsaved==='function'&&_rosterUnsaved()){e.preventDefault();e.returnValue='';return '';}});
window.addEventListener('pagehide',function(){if(S._presSection)broadcastPresence(null);});
// iOS/Safari restores frozen pages from the back/forward cache — force a fresh load.
window.addEventListener('pageshow',function(e){if(e.persisted&&S.user)location.reload();});

function broadcastLS(acCode,form,tabId){
  if(!_rtWs||_rtWs.readyState!==1||!S.user)return;
  _rtRef++;
  _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',
    payload:{type:'broadcast',event:'ls_update',payload:{acCode:acCode,form:form,tabId:tabId||null,meta:{_showUnalloc:S._showUnalloc||false,_lsSeatMode:S._lsSeatMode||'edit'},updatedBy:S.user.id,sessionId:_sessionId}},
    ref:String(_rtRef)}));
}
async function autoNamedSave(){
  const d=S.dispatch;
  if(!S.user||!d||(!d.pax||d.pax.length===0)&&!d.dep&&!d.dest)return;
  const name=d.name||(d.date?'Auto-save '+d.date:'Auto-save '+new Date().toLocaleDateString('en-NZ'));
  const id='mn_'+Date.now();
  const data={dep:d.dep,dest:d.dest,date:d.date,etd:d.etd,acSetup:d.acSetup,pax:d.pax,name};
  S.manifests=S.manifests.filter(function(m){return m.name!==name;});
  S.manifests.unshift({id,name,savedAt:new Date().toISOString(),data});
  lsSet('ts_manifests_cache',S.manifests);
  await sbU('ts_manifests',[{id,name,saved_at:new Date().toISOString(),data}]);
}

function mergeDispatch(remote){
  if(!remote||typeof remote!=='object')return;
  if(remote._updatedBy===S.user?.id)return; // ignore our own echo
  const local=S.dispatch;
  if(remote._loadedAt&&(!local._loadedAt||remote._loadedAt>local._loadedAt)){
    S.dispatch={...remote,seatMap:{},step:local.step||1};
    S.solverRes={};
    const who=(S.users||[]).find(function(u){return u.id===remote._updatedBy;});
    const whoName=who?(who.name||who.email).split(' ')[0]:'Someone';
    toast(whoName+' loaded manifest: '+(remote.name||'untitled'),'info');
    safeRender();return;
  }

  // Merge pax by id — higher _ts wins
  const paxMap={};
  (local.pax||[]).forEach(function(p){paxMap[p.id]=p;});
  (remote.pax||[]).forEach(function(p){
    if(!paxMap[p.id]||(p._ts||0)>(paxMap[p.id]._ts||0)){paxMap[p.id]=p;}
  });
  // Remove pax deleted by the other user (not in remote, and remote is more recent overall)
  if((remote._updateTs||0)>(local._updateTs||0)){
    const remIds=new Set((remote.pax||[]).map(function(p){return p.id;}));
    Object.keys(paxMap).forEach(function(id){
      if(!remIds.has(id)&&(paxMap[id]._ts||0)<(remote._updateTs||0)){delete paxMap[id];}
    });
  }
  S.dispatch.pax=Object.values(paxMap);

  // Merge acSetup by acId — higher _ts wins
  const acMap={};
  (local.acSetup||[]).forEach(function(s){acMap[s.acId]=s;});
  (remote.acSetup||[]).forEach(function(s){
    if(!acMap[s.acId]||(s._ts||0)>(acMap[s.acId]._ts||0)){acMap[s.acId]=s;}
  });
  S.dispatch.acSetup=Object.values(acMap);

  // Top-level flight fields + seatMap: take from remote if it's more recent
  if((remote._updateTs||0)>(local._updateTs||0)){
    ['dep','dest','date','etd','etdCustom','name','seatMap','origAcMap'].forEach(function(k){
      if(remote[k]!==undefined)S.dispatch[k]=remote[k];
    });
    S.dispatch._updateTs=remote._updateTs;
  }

  const who=(S.users||[]).find(function(u){return u.id===remote._updatedBy;});
  const whoName=who?(who.name||who.email).split(' ')[0]:'Someone';
  toast(whoName+' updated the manifest','info');
  safeRender();
}

// ── Simple auth (hashed with btoa for demo — production would use Supabase Auth) ──
// SHA-256 password hashing via Web Crypto (much stronger than btoa)
async function hashPw(pw){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
// Verify a password against a stored hash (supports legacy btoa hashes for migration)
async function verifyPw(plain,stored){
  if(!plain||!stored)return false;
  // Legacy btoa hash
  if(stored===btoa(plain))return true;
  // SHA-256
  return stored===await hashPw(plain);
}
window.handleForgot=async function(){
  S.loginErr=null;
  const raw=(document.getElementById('li_e')?.value||'').trim();
  const email=raw.includes('@')?raw:(raw?raw+'@truesouthflights.co.nz':'');
  if(!email){
    const el=document.getElementById('login-err');
    if(el){el.style.display='block';el.textContent='Enter your email address first.';}
    return;
  }
  const u=S.users.find(x=>x.email.toLowerCase()===email.toLowerCase());
  if(!u){
    const el=document.getElementById('login-err');
    if(el){el.style.display='block';el.textContent='No account found for that email.';}
    return;
  }
  // Generate a 6-digit token, expires in 30 mins
  const token=String(Math.floor(100000+Math.random()*900000));
  const expires=Date.now()+30*60*1000;
  u.resetToken=token;u.resetExpires=expires;
  lsSet('ts_users_cache',S.users);
  // Save token to Supabase
  try{
    await sbU('ts_users',[{id:u.id,name:u.name,email:u.email,role:u.role,
      linked_crew:u.linkedCrew||'',password_hash:u.passwordHash,
      reset_token:token,reset_expires:expires}]);
  }catch(e){console.warn('Token save failed:',e);}
  // Call Supabase Edge Function to send email
  try{
    const _r=await fetch('https://wgycephyuwwfogggcbye.supabase.co/functions/v1/send-reset-email',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+SK},
      body:JSON.stringify({email:u.email,name:u.name,token,appName:'True South FMS'})
    });
    if(!_r.ok) throw new Error('Email service error: '+_r.status);
    S.resetStep=1;S.resetEmail=email;
    render();
  }catch(e){
    S.loginErr='Could not send reset email. Please contact your administrator.';
    render();
  }
};

window.handleReset=async function(){
  const code=(document.getElementById('li_reset_code')?.value||'').trim();
  const newPw=(document.getElementById('li_reset_pw')?.value||'').trim();
  const conf=(document.getElementById('li_reset_conf')?.value||'').trim();
  const errEl=document.getElementById('reset-err');
  function showResetErr(msg){if(errEl){errEl.style.display='block';errEl.textContent=msg;}else S.loginErr=msg;}
  if(!code){showResetErr('Enter the 6-digit code from your email.');return;}
  if(!newPw||newPw.length<6){showResetErr('Password must be at least 6 characters.');return;}
  if(newPw!==conf){showResetErr('Passwords do not match.');return;}
  const u=S.users.find(x=>x.resetToken===code&&x.resetExpires&&Date.now()<x.resetExpires);
  if(!u){showResetErr('Invalid or expired code. Request a new one.');return;}
  u.passwordHash=await hashPw(newPw);delete u.resetToken;delete u.resetExpires;
  lsSet('ts_users_cache',S.users);
  try{
    await sbU('ts_users',[{id:u.id,name:u.name,email:u.email,role:u.role,
      linked_crew:u.linkedCrew||'',password_hash:u.passwordHash,
      reset_token:null,reset_expires:null}]);
  }catch(e){}
  auditLog('password_reset','Password reset for '+u.email);
  S.resetStep=0;S.resetCode=null;S.resetEmail='';
  // Show success and pre-fill email
  S.loginErr=null;
  const errEl2=document.getElementById('login-err');
  if(errEl2){errEl2.style.display='none';}
  toast('Password updated successfully. Please sign in.','ok');
  render();
};

async function _doLogin(emailArg,passArg){
  const _raw=(emailArg||document.getElementById('li_e')?.value||'').trim();
  const email=_raw.includes('@')?_raw:(_raw+'@truesouthflights.co.nz');
  const pass=passArg||document.getElementById('li_p')?.value||'';
  function showErr(msg){
    S.loginErr=msg;
    const el=document.getElementById('login-err');
    if(el){el.style.display='block';el.textContent=msg;}
    else render();
  }
  if(!email||!pass){showErr('Please enter your email and password.');return;}
  // find user by email first, then verify password async
  const uByEmail=S.users.find(x=>x.email.toLowerCase()===email.toLowerCase());
  const pwOk=uByEmail?await verifyPw(pass,uByEmail.passwordHash):false;
  const u=pwOk?uByEmail:null;
  // auto-upgrade legacy btoa hash to SHA-256
  if(u&&u.passwordHash===btoa(pass)){u.passwordHash=await hashPw(pass);lsSet('ts_users_cache',S.users);try{await sbU('ts_users',[{id:u.id,password_hash:u.passwordHash}]);}catch(e){}}
  if(!u){
    showErr('Invalid email or password. Check your details and try again.');
    // Audit failed attempt
    auditLoginFail(email,'Invalid credentials');
    return;
  }
  S.user=u;S.loginErr=null;
  if(u.email==='andrew@truesouthflights.co.nz'||u.email==='adamsonandrew1@gmail.com'||u.role==='superadmin') u.superAdmin=true;
  sessionStorage.setItem('ts_user',JSON.stringify(u));
  const remMe=document.getElementById('li_rem');
  if(remMe&&remMe.checked){try{localStorage.setItem('ts_remembered_user',JSON.stringify(u));}catch(e){}}
  // Full audit log
  auditLog('login','Login successful');
  // Clear stale business-data cache so all devices always load fresh from Supabase
  ['ts_maintenance','ts_loadsheets_cache','ts_drive_uploaded_ids','ts_drive_last_upload'].forEach(function(k){localStorage.removeItem(k);});
  // Update auth header to use user's session token if available (fixes RLS for writes)
  if(u.sessionToken) SH['Authorization']='Bearer '+u.sessionToken;
  S.tab=u.role==='maint'?'maintenance':'manifest';S._appLoading=true;render();initRealtime();setTimeout(function(){restoreWorkspace();},600);setTimeout(function(){S._appLoading=false;render();},1400);
  // Fetch latest audit log from Supabase after login
  if(u.superAdmin){
    (async()=>{try{
      const r=await fetch(SB+'/rest/v1/ts_audit_log?order=created_at.desc&limit=50',{
        headers:{'apikey':SK,'Authorization':'Bearer '+SK}
      });
      if(!r.ok) return;
      const rows=await r.json();
      const mapped=rows.map(x=>({time:x.created_at,user:x.user_email,name:x.user_name||x.user_email,role:x.role,action:x.action,detail:x.detail,device:x.device}));
      S.auditLog=[...mapped,...(S.auditLog||[])].filter((e,i,a)=>a.findIndex(x=>x.time+x.user+x.action===e.time+e.user+e.action)===i).slice(0,1000);
      lsSet('ts_audit_log',S.auditLog);
    }catch(e){}})();
  }
}

window.tryLogin=function(){_doLogin();};
window.updateLoginSuffix=function(){var s=document.getElementById('li_e_sfx');var e=document.getElementById('li_e');if(s&&e)s.style.display=e.value.includes('@')?'none':'';};
function logout(){S.user=null;sessionStorage.removeItem('ts_user');localStorage.removeItem('ts_remembered_user');broadcastPresence(null);if(_rtWs){try{_rtWs.onclose=null;_rtWs.close();}catch{}  _rtWs=null;}S.rtStatus='offline';S.rtPresence={};S._presSection=null;clearInterval(_presInterval);render();}

// ── Shared Workspace Persistence ──
async function saveWorkspace(){
  if(!S.user)return;
  var _wsIds=(S.lsTabs||[]).map(function(t){return t.id;});
  var _wsMTabs=(S.manifestTabs||[]).map(function(t){return{id:t.id,savedId:t.savedId||null};});
  var _wsState={openLsIds:_wsIds,openManifestTabs:_wsMTabs};
  await sbU('ts_settings',[{key:'workspace_shared',value:JSON.stringify(_wsState)}]).catch(function(){});
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'workspace_update',payload:{state:_wsState,sessionId:_sessionId}},ref:String(_rtRef)}));}
}
window.saveWorkspace=saveWorkspace;

async function restoreWorkspace(){
  if(!S.user)return;
  try{
    var _r=await fetch(SB+'/rest/v1/ts_settings?key=eq.workspace_shared&select=value&limit=1',{headers:{'apikey':SK,...SH}});
    if(!_r.ok)return;
    var _rows=await _r.json();
    if(!_rows.length||!_rows[0].value)return;
    _applyWorkspace(JSON.parse(_rows[0].value));
  }catch(e){}
}

function _applyWorkspace(ws){
  if(!ws)return;
  var _render=false;
  // ── Loadsheet tabs ──
  S.lsTabs=S.lsTabs||[];
  (ws.openLsIds||[]).forEach(function(_wid){
    if(S.lsTabs.find(function(t){return t.id===_wid;}))return;
    var _ws2=(S.saved||[]).find(function(x){return x.id===_wid&&x.status!=='deleted';});
    if(_ws2){
      var _wac=(_ws2.form&&_ws2.form.ac)||'ZK-SLA';
      var _wform=dc(_ws2.form);if(!_wform.cargo)_wform.cargo={};
      var _isNew=_ws2.status==='draft';
      S.lsTabs.push({id:_ws2.id,acId:_wac,form:_wform,status:'unsigned',savedAt:_ws2.savedAt,isNew:_isNew,originalForm:_isNew?null:dc(_ws2.form)});
      _render=true;
    }
  });
  if(_render&&!S.activeTabId&&S.lsTabs.length){
    var _wt=S.lsTabs[0];
    S.activeTabId=_wt.id;S.form=_wt.form;S.lsAc=(_wt.acId||'').replace('ZK-','');S.editId=_wt.id;
    S.tab='loadsheet';S._newLsTab=false;
  }
  // ── Manifest tabs ──
  if(!S.manifestTabs)S.manifestTabs=[];
  if(!S._manifestDispatches)S._manifestDispatches={};
  (ws.openManifestTabs||[]).forEach(function(_wmt){
    if(S.manifestTabs.find(function(t){return t.id===_wmt.id;}))return;
    if(_wmt.savedId){
      // Restore a saved manifest into a new tab
      var _wm=(S.manifests||[]).find(function(m){return m.id===_wmt.savedId;});
      if(_wm){
        var _wmData=Object.assign({},bD(),_wm.data||{},{step:1});
        S.manifestTabs.push({id:_wmt.id,savedId:_wmt.savedId});
        S._manifestDispatches[_wmt.id]=JSON.parse(JSON.stringify(_wmData));
        if(!S.activeManifestTabId){S.activeManifestTabId=_wmt.id;S.dispatch=JSON.parse(JSON.stringify(_wmData));S._loadedManifestId=_wmt.savedId;}
        _render=true;
      }
    } else {
      // Blank manifest tab
      S.manifestTabs.push({id:_wmt.id,savedId:null});
      S._manifestDispatches[_wmt.id]=JSON.parse(JSON.stringify(bD()));
      if(!S.activeManifestTabId){S.activeManifestTabId=_wmt.id;S.dispatch=bD();}
      _render=true;
    }
  });
  _restoreLastView();
  if(_render)safeRender();
}
// Return to the same page (section / tab / open loadsheet or manifest) after a reload,
// as long as that item is still open.
function _restoreLastView(){
  try{
    var v=JSON.parse(localStorage.getItem('ts_lastview')||'null');
    if(!v||!v.section)return;
    if(v.section==='operations'){
      S.section='operations';
      if(v.activeTabId&&(S.lsTabs||[]).find(function(t){return t.id===v.activeTabId;})){
        var t=S.lsTabs.find(function(x){return x.id===v.activeTabId;});
        S.activeTabId=t.id;S.form=t.form;S.lsAc=(t.acId||'').replace('ZK-','');S.editId=t.id;S.tab='loadsheet';S._newLsTab=false;
        return;
      }
      S.tab=v.tab||'manifest';
      if(v.savedTab)S.savedTab=v.savedTab;
      if((v.tab==='manifest'||v.tab==='seatmap')&&v.activeManifestTabId&&S._manifestDispatches&&S._manifestDispatches[v.activeManifestTabId]&&(S.manifestTabs||[]).find(function(t){return t.id===v.activeManifestTabId;})){
        if(S.activeManifestTabId&&S._manifestDispatches[S.activeManifestTabId])S._manifestDispatches[S.activeManifestTabId]=JSON.parse(JSON.stringify(S.dispatch));
        S.activeManifestTabId=v.activeManifestTabId;
        S.dispatch=JSON.parse(JSON.stringify(S._manifestDispatches[v.activeManifestTabId]));
      }
    } else {
      // Non-operations sections (roster, leave, settings, maintenance, charter…)
      S.section=v.section;
      if(v.tab)S.tab=v.tab;
      if(v.savedTab)S.savedTab=v.savedTab;
    }
  }catch(e){}
}

window.addEventListener('pagehide',function(){saveWorkspace();});

// ── Pilot list: S.crew + any pilot/admin users without a linked crew record ──
function pilotCrewList(){
  // Return all crew who hold at least one aircraft approval (ZK-xxx).
  const list=[];
  S.crew.forEach(function(cr){
    const endorse=cr.endorse||[];
    if(!endorse.some(function(e){return e.startsWith('ZK-');})) return;
    const crn=(cr.n||'').trim().toLowerCase();
    const lu=(S.users||[]).find(function(u){
      const lc=(u.linkedCrew||'').trim().toLowerCase();
      const un=(u.name||u.email||'').trim().toLowerCase();
      return (lc&&lc===crn)||(un===crn);
    });
    const w=cr.w||(lu&&lu.weight?lu.weight:0);
    list.push(Object.assign({},cr,{w:w}));
  });
  return list;
}
function anyCrewList(){
  var list=[];
  S.crew.forEach(function(cr){
    var crn=(cr.n||'').trim().toLowerCase();
    var lu=(S.users||[]).find(function(u){
      var lc=(u.linkedCrew||'').trim().toLowerCase();
      var un=(u.name||u.email||'').trim().toLowerCase();
      return (lc&&lc===crn)||(un===crn);
    });
    var w=cr.w||(lu&&lu.weight?lu.weight:0);
    list.push(Object.assign({},cr,{w:w}));
  });
  return list;
}

// ── Presence ──
const PRES_COLORS=['#f87171','#fb923c','#fbbf24','#34d399','#22d3ee','#60a5fa','#a78bfa','#f472b6'];
function presColor(id){let h=0;for(let i=0;i<(id||'').length;i++)h=(h*31+id.charCodeAt(i))&0xfffffff;return PRES_COLORS[h%PRES_COLORS.length];}
window._presKick=function(uid){var p=S.rtPresence&&S.rtPresence[uid];if(p&&confirm('Force logout '+(p.name||uid)+'?'))window.adminKickUser(uid);};
function presBarInner(section){
  if(!S.user)return'';
  const now=Date.now();
  const isAdmin=S.user&&(S.user.role==='superadmin'||S.user.role==='admin');
  const others=Object.entries(S.rtPresence||{}).filter(function(e){return e[1].section===section&&now-e[1].ts<22000;});
  if(!others.length)return'';
  return'<div style="display:flex;align-items:center;gap:6px;padding:4px 0 10px;flex-wrap:wrap">'
    +'<span style="font-size:11px;color:var(--text3);font-weight:600">Also viewing:</span>'
    +others.map(function(e){
      var uid=e[0];var p=e[1];
      const init=p.code||(p.name||'?').trim().split(' ').map(function(w){return w[0];}).slice(0,2).join('').toUpperCase();
      return'<div title="'+p.name+'" style="display:flex;align-items:center;gap:2px">'
        +'<div style="width:22px;height:22px;border-radius:50%;background:'+p.color+';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;flex-shrink:0">'+init+'</div>'
        +(isAdmin?'<button onclick="window._presKick(\''+uid+'\')" style="background:none;border:none;color:var(--text3);font-size:13px;line-height:1;cursor:pointer;padding:0;opacity:.5;flex-shrink:0" title="Force logout '+p.name+'">×</button>':'')
        +'</div>';
    }).join('<span style="color:var(--border2);font-size:10px;padding:0 2px">·</span>')
    +'</div>';
}
function presBarH(section){
  return'<div id="pres-bar-'+section+'">'+presBarInner(section)+'</div>';
}
function updatePresBar(section){
  var el=document.getElementById('pres-bar-'+section);
  if(el)el.innerHTML=presBarInner(section);
}

// ── Layouts ──
const GA8_LAYOUT=[[{i:0,lbl:'PIC'},{i:1,lbl:'1'}],[{i:2,lbl:'2'},{i:3,lbl:'3'}],[{i:4,lbl:'4'},{i:5,lbl:'5'}],'spacer',[{i:6,lbl:'6'},{i:7,lbl:'7'}]];
const C208_LAYOUT=[[{i:0,lbl:'PIC'},{i:1,lbl:'1'}],[{i:2,lbl:'2'},{i:3,lbl:'3'}],[{i:4,lbl:'4'},{i:5,lbl:'5'}],[{i:6,lbl:'6'},{i:7,lbl:'7'}],[{i:8,lbl:'8'},{i:9,lbl:'9'}],[{i:10,lbl:'10'},{i:11,lbl:'11'}],'spacer',[{i:12,lbl:'12'},{i:13,lbl:'13'}]];
function acLayout(acId){const _a=_acSpec(acId);if(_a?.layout==='ga8')return GA8_LAYOUT;if(!_a)return C208_LAYOUT;const _mx=_a.seats.length;return C208_LAYOUT.map(r=>r==='spacer'?r:r.filter(c=>c.i<_mx)).filter(r=>r==='spacer'||r.length>0);}


// ═══════════════════════ RENDER FUNCTIONS ═══════════════════════

// ── iOS Add to Home Screen banner ──
