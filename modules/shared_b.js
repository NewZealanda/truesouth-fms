// === MODULE: shared_b === v26.24 ===
async function loadAll(){
  try{
    // ── Launch all independent table reads in parallel (was a sequential waterfall) ──
    const [_pCrew,_pAircraft,_pRates,_pLoadsheets,_pManifests,_pUsers,_pPads]=await Promise.all([
      sbF('ts_crew'),
      sbF('ts_aircraft'),
      sbF('ts_charter_rates'),
      sbF('ts_loadsheets',Q_LOADSHEETS()),
      sbF('ts_manifests',Q_MANIFESTS()),
      sbF(USERS_TBL()),
      sbF('ts_scratchpads','','saved_at')
    ]);
    // ── Crew — Supabase is source of truth; localStorage is fast-load cache + offline fallback ──
    let crew=_pCrew;
    if(crew&&crew.length){
      S.crew=crew.map(c=>({id:c.id,n:c.name,w:c.weight||0,
        endorse:(function(){try{return c.endorsements?JSON.parse(c.endorsements):[];}catch(e){return [];}})(),
        code:c.code||'',dlNum:c.dl_num||'',caaNum:c.caa_license||'',
        medExpiry:c.medical_expiry||'',ocaDue:c.oca_due||'',
        firstAid:c.first_aid||'',avsecExpiry:c.avsec_expiry||'',
        dob:c.dob||'',typeRatings:(function(){try{return c.type_ratings?JSON.parse(c.type_ratings):[];}catch(e){return [];}})(),
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
      S.charterRates=Object.fromEntries(cr.map(r=>[r.acId,(r.rates&&parseFloat(r.rates.perHour)>0)?r.rates:dc(CHARTER_RATES_DEF[r.acId]||{perHour:0,minHours:1})]));
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
      if(_cq.ok){const _cqd=await _cq.json();if(_cqd[0]&&_cqd[0].value){const _cqv=JSON.parse(_cqd[0].value);lsSet('ts_charter_quotes_cache',_cqv);_sbSetBase('charter_quotes',_cqv);}}
    }catch(e){}
    // Load the featured/pinned aerodrome list (source of truth for the dropdown "Featured" group)
    try{
      const _af=await fetch(SB+'/rest/v1/ts_settings?key=eq.aero_featured&select=value',{headers:SH});
      if(_af.ok){const _afd=await _af.json();if(_afd[0]&&_afd[0].value){var _fl=JSON.parse(_afd[0].value);if(Array.isArray(_fl)){S._aeroFeatured=_fl;lsSet('featured_aerodromes',_fl);}}}
    }catch(e){}

    // ── Loadsheets ──
    const ls=_pLoadsheets;
    if(ls){
      // Forward-only Bin + Archive: a sheet the user just moved to the Bin (status 'deleted') or uploaded
      // (driveUploaded) must NOT bounce back to Active/Signed on a refresh if the DB write is still lagging
      // or a reload read stale data. We OR the locally-known state (from cache) over the DB value. Restore-
      // from-bin updates the cache to a non-deleted status, so it's never stuck deleted. uploadedBy/At are
      // local-only (not in DB) so carry them too.
      var _luCache=lsGet('ts_loadsheets_cache')||[];var _luPrev={};_luCache.forEach(function(s){if(s&&s.id)_luPrev[s.id]=s;});
      S.saved=ls.map(function(r){var _p=_luPrev[r.id]||{};return _lsApplySticky({id:r.id,savedAt:r.saved_at,form:r.form,status:(_p.status==='deleted'?'deleted':(r.status||'complete')),driveUploaded:!!r.drive_uploaded||!!_p.driveUploaded,uploadedBy:_p.uploadedBy||'',uploadedAt:_p.uploadedAt||''});});
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
        await sbUserWrite([{id:admin.id,name:admin.name,email:admin.email,role:admin.role,linked_crew:admin.linkedCrew,password_hash:admin.passwordHash}]);
      }
    }
    if(_initPads&&_initPads.length){S.pads=_initPads.map(function(r){return{id:r.id,title:r.title||'Untitled',content:r.content||'',drawing:r.drawing||[],savedAt:r.saved_at};});}

    // Custom departure-heading names (Bookings) — seed from cache for instant first paint.
    try{var _dnC=lsGet('ts_rz_depnames');if(_dnC&&typeof _dnC==='object')S._rzDepNames=_dnC;}catch(e){}
    // ── Role Permissions ──
    try{
      const _rpCached=lsGet('ts_role_perms');
      if(_rpCached) S.rolePerms=_rpCached;
      // Don't clobber an in-progress permissions edit. A reconnect (e.g. switching
      // devices/backgrounding) can re-run loadAll mid-edit; without this guard the DB
      // re-fetch overwrites S.rolePerms before the debounced save fires, silently
      // dropping the toggle the user just made.
      if(!_editingPerms()&&Date.now()-(S._permsEditTs||0)>5000){
        const _rpRow=await fetch(`${SB}/rest/v1/ts_settings?key=eq.role_perms&select=value`,{headers:SH});
        if(_rpRow.ok){const _rpData=await _rpRow.json();if(_rpData[0]?.value){S.rolePerms=JSON.parse(_rpData[0].value);lsSet('ts_role_perms',S.rolePerms);}}
      }
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
  if(AUTH_PHASE_C){
    // Restore the Supabase session from its refresh token, then rebuild the user from claims.
    let _sess=null;try{_sess=JSON.parse(localStorage.getItem('ts_sb_session')||'null');}catch(e){}
    if(_sess&&_sess.refresh_token){
      _applySession(_sess);
      S._authRestoring=true;S._introStart=Date.now(); // first render shows the intro, not a login flash
      // Safety net: if the refresh hangs (no network), fall back to the login form rather than
      // spinning forever.
      setTimeout(function(){if(S._authRestoring&&!S.user){S._authRestoring=false;render();}},8000);
      (async function(){
        const ok=await _sbRefresh();
        if(ok&&_sbSession&&_sbSession.access_token){
          S.user=_userFromClaims(_jwtClaims(_sbSession.access_token));
          auditLog('session_restore',{via:'supabase',user:S.user.email});
          await _reloadCoreTables();
          _loadAuditLog(); // S.user now set → load the audit history on refresh too
          // Keep the intro on screen for its full one-time play before revealing the app (Skip cuts it).
          S._authRestoring=false;S._appLoading=true;initRealtime();render();setTimeout(function(){restoreWorkspace();},400);
          var _introRem=Math.max(300,INTRO_MS-(Date.now()-(S._introStart||Date.now())));
          setTimeout(function(){S._appLoading=false;render();},_introRem);
        } else { S._authRestoring=false;_applySession(null);try{localStorage.removeItem('ts_sb_session');}catch(e){} render(); }
      })();
    }
  } else {
    const savedUser=sessionStorage.getItem('ts_user');
    if(savedUser)try{S.user=JSON.parse(savedUser);}catch{}
    if(S.user){auditLog('session_restore',{via:'session',user:S.user.email});setTimeout(function(){initRealtime();},300);}
    // Restore remembered session if no session in sessionStorage
    if(!S.user){const rem=localStorage.getItem('ts_remembered_user');if(rem)try{const ru=JSON.parse(rem);const live=S.users.find(x=>x.id===ru.id&&(AUTH_PHASE_A||x.passwordHash===ru.passwordHash));if(live){S.user=live;if(live.email==='andrew@truesouthflights.co.nz'||live.email==='adamsonandrew1@gmail.com'||live.role==='superadmin')live.superAdmin=true;sessionStorage.setItem('ts_user',JSON.stringify(live));['ts_maintenance','ts_loadsheets_cache','ts_drive_uploaded_ids','ts_drive_last_upload'].forEach(function(k){localStorage.removeItem(k);});auditLog('session_restore',{via:'remember_me',user:live.email});setTimeout(initRealtime,0);}}catch(e){}}
  }
  // Load audit log from localStorage first (instant)
  S.auditLog=lsGet('ts_audit_log')||[];
  render();
  if(S.user)setTimeout(function(){restoreWorkspace();},400);
  // Then fetch latest 50 from Supabase in background. On an AUTH_PHASE_C refresh S.user is set
  // asynchronously, so this is ALSO called from inside the restore IIFE once the user exists.
  _loadAuditLog();
}
// Superadmin audit-log fetch (uses the user JWT via SH so RLS allows the read). Pulls the latest 200
// by default; opts.before=<ISO time> pages further back (for the "Show more" button).
function _loadAuditLog(opts){
  if(!(S.user&&S.user.superAdmin))return;
  opts=opts||{};
  var lim=opts.limit||200;
  (async()=>{try{
    var url=SB+'/rest/v1/ts_audit_log?order=created_at.desc&limit='+lim+(opts.before?('&created_at=lt.'+encodeURIComponent(opts.before)):'');
    const r=await _sbFetch(url,{headers:SH});
    if(!r.ok) return;
    const rows=await r.json();
    S._auditNoMore=(rows.length<lim); // a short page = we've reached the end (hides "Show more")
    // Track the oldest row fetched as an explicit paging cursor (rows are desc → last is oldest), so
    // "Show more" keeps advancing even once the in-memory log is capped at 5000.
    if(rows.length){var _oldest=rows[rows.length-1].created_at;if(!S._auditCursor||String(_oldest)<String(S._auditCursor))S._auditCursor=_oldest;}
    const mapped=rows.map(x=>({time:x.created_at,user:x.user_email,name:x.user_name||x.user_email,role:x.role,action:x.action,detail:x.detail,device:x.device}));
    const existing=new Set((S.auditLog||[]).map(e=>e.time+e.user+e.action));
    const fresh=mapped.filter(e=>!existing.has(e.time+e.user+e.action));
    if(fresh.length){
      S.auditLog=[...(S.auditLog||[]),...fresh].sort(function(a,b){return String(b.time).localeCompare(String(a.time));}).slice(0,5000);
      lsSet('ts_audit_log',S.auditLog);
      render();
    } else if(opts.more){ render(); }
  }catch(e){console.warn('Audit fetch failed:',e);}})();
}

// ── Supabase Realtime ──
let _rtWs=null,_rtRef=0,_rtHb=null,_rtRecon=null,_rtPending=new Set(),_rtFlush=null,_rtConnectedOnce=false;
const _sessionId='sess_'+((typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():(Date.now()+'_'+Math.random().toString(36).slice(2,9)));

function initRealtime(){
  if(_rtWs){try{_rtWs.onclose=null;_rtWs.close();}catch{}  _rtWs=null;}
  clearInterval(_rtHb);clearTimeout(_rtRecon);
  // Under Phase A, ts_users SELECT is revoked so it can't be subscribed — drop it.
  const tables=['ts_crew','ts_aircraft','ts_users','ts_loadsheets','ts_manifests','ts_charter_rates','ts_settings','ts_maintenance','ts_flight_records','ts_flightduty','ts_fd_certs','ts_maint_forms'].filter(function(t){return !(_hashFree()&&t==='ts_users');});
  try{
    _rtWs=new WebSocket('wss://wgycephyuwwfogggcbye.supabase.co/realtime/v1/websocket?apikey='+SK+'&vsn=1.0.0');
    var _rtThisWs=_rtWs;   // guard: a reconnect/refresh may replace _rtWs before this socket opens
    _rtWs.onopen=function(){
      if(_rtThisWs!==_rtWs){try{_rtThisWs.close();}catch(e){}return;}  // stale socket — don't start a duplicate heartbeat
      _rtRef++;
      _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'phx_join',
        payload:{config:{broadcast:{self:false},postgres_changes:tables.map(function(t){return{event:'*',schema:'public',table:t};})},access_token:((AUTH_PHASE_C&&_sbSession&&_sbSession.access_token)||SK)},
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
            S.rtStatus='live';if(S._presSection)broadcastPresence(S._presSection);
            if(typeof _syncFlush==='function')_syncFlush();   // back online → push any offline-captured writes

            // Reconnect backfill: postgres_changes that fired while the socket was down are
            // gone, so on a RE-open (not the first connect) pull the collaborative tables once.
            if(_rtConnectedOnce){try{
              // ts_settings now also refreshes roster/roster_colors/rz_pickup_locs/fuels/perms.
              Promise.all([reloadTable('ts_manifests'),reloadTable('ts_loadsheets'),reloadTable('ts_settings'),reloadTable('ts_scratchpads')]).then(function(){safeRender();}).catch(function(){});
              // A4: the Rezdy manifest, pickups, shared loadsheet tabs and calendar ride on
              // broadcasts (not postgres_changes), so a dropped socket leaves them stale — re-pull
              // the current date's state explicitly on reconnect.
              if(S.rezdyDate){
                if(typeof window.rezdyReloadManifestLive==='function')window.rezdyReloadManifestLive();
                if(typeof window.rezdyReloadPickupLive==='function')window.rezdyReloadPickupLive();
                if(typeof window.rezdyReloadLsTabsLive==='function')window.rezdyReloadLsTabsLive();
                if(S.section==='calendar'&&typeof window.rezdyReloadScheduleLive==='function')window.rezdyReloadScheduleLive();
              }
            }catch(e){}}
            _rtConnectedOnce=true;
            safeRender();
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
          var _lssp=msg.payload.payload;
          if(!_lssp||_lssp.sessionId!==_sessionId){ // skip our own echo (avoids a self-refetch that can overwrite a locally-open form)
            if(S.tab==='saved'){reloadTable('ts_loadsheets');reloadTable('ts_scratchpads').then(function(){safeRender();});}
            else{reloadTable('ts_loadsheets');}
          }
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
              S.activeTabId=null;S.editId=null;S.section='operations';S.tab='rseatmap';
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
              S.activeTabId=null;S.editId=null;S.section='operations';S.tab='rseatmap';
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
            if(_cupl.quotes){lsSet('ts_charter_quotes_cache',_cupl.quotes);if(typeof _sbSetBase==='function')_sbSetBase('charter_quotes',_cupl.quotes);}
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
            // Don't clobber the LIVE form out from under a user mid-edit (focused input on
            // the active loadsheet) — that loses their in-flight keystrokes. Background tab
            // copies still update, so it reconciles when they next blur/leave/reopen.
            var _lsAE=document.activeElement;
            var _lsEditing=!!(_lsAE&&/^(INPUT|SELECT|TEXTAREA)$/.test(_lsAE.tagName||'')&&(S.tab==='loadsheet'||S.tab==='rloadsheets'||(S.tab||'').indexOf('ls_')===0));
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
                if(S.activeTabId===_lsTF.id&&!_lsEditing){
                  S.form=_lsp.form;
                  if(_lsp.form.ac)S.lsAc=_lsp.form.ac.replace('ZK-','');
                }
              } else if(_lsp.acCode&&S.lsAc===_lsp.acCode&&S.activeTabId&&!_lsEditing){
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
              var _prevAuto=S.solverAutoApply;try{S.solverAutoApply=false;runSolver();}catch(e){}S.solverAutoApply=_prevAuto;
              if(_saet==='INPUT'||_saet==='SELECT'||_saet==='TEXTAREA')safeRender();else render();
            }
          }
        }
        // Live Rezdy manifest: another device edited the manifest for a date we're viewing.
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='rz_manifest_update'){
          var _rmp=msg.payload.payload;
          if(_rmp&&_rmp.sessionId!==_sessionId&&_rmp.date===S.rezdyDate&&typeof window.rezdyReloadManifestLive==='function'){
            window.rezdyReloadManifestLive();
          }
        }
        // Live Rezdy calendar: another device changed the schedule for a date we're viewing.
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='rz_sched_update'){
          var _rsp=msg.payload.payload;
          if(_rsp&&_rsp.sessionId!==_sessionId&&_rsp.date===S.rezdyDate&&S.section==='calendar'&&typeof window.rezdyReloadScheduleLive==='function'){
            window.rezdyReloadScheduleLive();
          }
        }
        // Live shared loadsheet-tabs list: another device opened/created/closed a loadsheet tab.
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='rz_lstabs_update'){
          var _ltp=msg.payload.payload;
          if(_ltp&&_ltp.sessionId!==_sessionId&&_ltp.date===S.rezdyDate&&typeof window.rezdyReloadLsTabsLive==='function'){
            window.rezdyReloadLsTabsLive();
          }
        }
        // A2: live pickups/check-ins — another device saved the pickup list for the date we're on.
        if(msg.event==='broadcast'&&msg.payload&&msg.payload.event==='pickup_update'){
          var _pkp=msg.payload.payload;
          if(_pkp&&_pkp.sessionId!==_sessionId&&_pkp.date===S.rezdyDate&&typeof window.rezdyReloadPickupLive==='function'){
            window.rezdyReloadPickupLive();
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
      // Forward-only Bin + Archive (else a realtime reload/reconnect that reads stale data bounces a
      // just-binned sheet back to Active, or an archived one back to Signed): keep the locally-known
      // 'deleted' status and driveUploaded over the DB value. We consult BOTH the persistent cache and
      // in-memory S.saved (in-memory wins) so an earlier reload that reset S.saved can't lose the flag.
      var _prevLs={};(lsGet('ts_loadsheets_cache')||[]).forEach(function(s){if(s&&s.id)_prevLs[s.id]=s;});(S.saved||[]).forEach(function(s){if(s&&s.id)_prevLs[s.id]=s;});
      var _fresh=ls.map(function(r){var _p=_prevLs[r.id]||{};return _lsApplySticky({id:r.id,savedAt:r.saved_at,form:r.form,status:(_p.status==='deleted'?'deleted':(r.status||'complete')),driveUploaded:!!r.drive_uploaded||!!_p.driveUploaded,uploadedBy:_p.uploadedBy||'',uploadedAt:_p.uploadedAt||''});});
      // Preserve any currently-open loadsheet tabs whose saved row falls outside the
      // fetch window, so a realtime refresh can't drop a tab the user still has open.
      var _freshIds={};_fresh.forEach(function(s){_freshIds[s.id]=1;});
      var _keepIds={};(S.lsTabs||[]).forEach(function(t){if(t.id)_keepIds[t.id]=1;});if(S.activeTabId)_keepIds[S.activeTabId]=1;
      (S.saved||[]).forEach(function(s){if(_keepIds[s.id]&&!_freshIds[s.id])_fresh.push(s);});
      S.saved=_fresh;
      lsSet('ts_loadsheets_cache',S.saved);
      return true;
    }
  } else if(table==='ts_flight_records'){
    // Live-sync flight records across devices (only if this user has the module open).
    if(S._frLoaded&&typeof window.loadFlightRecords==='function'){window.loadFlightRecords();}
    return false;   // the loader re-pulls + safeRenders on its own
  } else if(table==='ts_flightduty'||table==='ts_fd_certs'){
    if(S._fdLoaded&&typeof window.loadFlightDuty==='function'){window.loadFlightDuty();}
    return false;
  } else if(table==='ts_maint_forms'){
    // Live-sync maintenance forms across devices — but skip while THIS device is editing a form (its
    // local copy is authoritative; its own debounced save pushes to the DB), so an echo can't clobber.
    if(S._mfLoaded&&S._mfView!=='editor'&&typeof window.loadMaintForms==='function'){window.loadMaintForms();}
    return false;
  } else if(table==='ts_scratchpads'){
    const ps=await sbF('ts_scratchpads','','saved_at');
    if(ps){S.pads=ps.map(function(r){return{id:r.id,title:r.title||'Untitled',content:r.content||'',drawing:r.drawing||[],savedAt:r.saved_at};});return true;}
  } else if(table==='ts_manifests'){
    const ms=await sbF('ts_manifests',Q_MANIFESTS());
    if(ms){
      const live=ms.find(function(r){return r.id==='live_draft';});
      var _ownEcho=false;
      if(live&&live.data){
        if(live.data._updatedBy===S.user?.id){_ownEcho=true;}
        else{mergeDispatch(live.data);}
      }
      // ls_live_* rows are never written (loadsheet live-edit rides on the ls_update
      // broadcast); filter any stale ones out defensively rather than reading them.
      S.manifests=ms.filter(function(r){return r.id!=='live_draft'&&!r.id.startsWith('ls_live_');}).map(function(r){return{id:r.id,name:r.name,savedAt:r.saved_at,data:r.data,_deleted:!!(r.data&&r.data._deleted)};});
      lsSet('ts_manifests_cache',S.manifests);return !_ownEcho;
    }
  } else if(table==='ts_crew'){
    const crew=await sbF('ts_crew');
    if(crew&&crew.length){
      S.crew=crew.map(function(c){return{id:c.id,n:c.name,w:c.weight||0,
        endorse:(function(){try{return c.endorsements?JSON.parse(c.endorsements):[];}catch(e){return [];}})(),
        code:c.code||'',dlNum:c.dl_num||'',caaNum:c.caa_license||'',
        medExpiry:c.medical_expiry||'',ocaDue:c.oca_due||'',
        firstAid:c.first_aid||'',avsecExpiry:c.avsec_expiry||'',
        dob:c.dob||'',typeRatings:(function(){try{return c.type_ratings?JSON.parse(c.type_ratings):[];}catch(e){return [];}})(),
        photo:lsGet('ts_crew_photo_'+c.id)||''};});
      lsSet('ts_crew_cache',S.crew);return true;
    }
  } else if(table==='ts_aircraft'){
    const acR=await sbF('ts_aircraft');
    if(acR&&acR.length){S.aircraft={};acR.forEach(function(r){S.aircraft[r.id]=r.data||r;});lsSet('ts_aircraft_cache',S.aircraft);return true;}
  } else if(table==='ts_users'){
    const us=await sbF(USERS_TBL());
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
    if(cr&&cr.length){S.charterRates=Object.fromEntries(cr.map(function(r){return[r.acId,(r.rates&&parseFloat(r.rates.perHour)>0)?r.rates:dc(CHARTER_RATES_DEF[r.acId]||{perHour:0,minHours:1})];}));lsSet('ts_charter_rates_cache',S.charterRates);return true;}
  } else if(table==='ts_settings'){
    try{
      const r=await fetch(SB+'/rest/v1/ts_settings?key=in.(role_perms,charter_wait_rate,maintenance,aero_featured,rz_depnames,rz_fuel_ov,rz_pickup_locs,rz_vehicles,roster,roster_colors,business_plan,fr_settings,fd_limits,aircraft_obs,charter_quotes,scheduling)&select=key,value',{headers:SH});
      if(r.ok){
        const rows=await r.json();let changed=false;
        rows.forEach(function(row){
          if(row.key==='role_perms'&&row.value&&!_editingPerms()&&Date.now()-(S._permsEditTs||0)>5000){S.rolePerms=JSON.parse(row.value);lsSet('ts_role_perms',S.rolePerms);changed=true;}
          if(row.key==='rz_depnames'&&row.value){try{var _dn=JSON.parse(row.value);if(_dn&&typeof _dn==='object'){S._rzDepNames=_dn;lsSet('ts_rz_depnames',_dn);_sbSetBase('rz_depnames',_dn);changed=true;}}catch(e){}}
          if(row.key==='rz_fuel_ov'&&row.value){try{var _fo=JSON.parse(row.value);if(_fo&&typeof _fo==='object'){S._rzFuelOv=_fo;lsSet('ts_rz_fuel_ov',_fo);_sbSetBase('rz_fuel_ov',_fo);changed=true;}}catch(e){}}
          if(row.key==='rz_pickup_locs'&&row.value&&!(S.section==='settings'&&((S.admin||{}).section)==='operations')){try{var _pl=JSON.parse(row.value);if(Array.isArray(_pl)){S._rzPickupLocs=_pl;S._rzPickupLocsLoaded=true;lsSet('ts_rz_pickup_locs',_pl);_sbSetBase('rz_pickup_locs',_pl);changed=true;}}catch(e){}}
          if(row.key==='rz_vehicles'&&row.value){try{var _rv=JSON.parse(row.value);if(Array.isArray(_rv)){S._rzVehicles=_rv;lsSet('ts_rz_vehicles',_rv);_sbSetBase('rz_vehicles',_rv);changed=true;}}catch(e){}}
          // A3: live roster — propagate another device's roster save. SKIPPED while this device has
          // an unsaved draft so we never clobber in-progress edits (it reconciles on their save).
          if(row.key==='roster'&&row.value&&!(typeof _rosterUnsaved==='function'&&_rosterUnsaved())){try{var _ro=JSON.parse(row.value);if(_ro&&typeof _ro==='object'){S.roster=_ro;lsSet('ts_roster',_ro);changed=true;}}catch(e){}}
          if(row.key==='roster_colors'&&row.value&&!S._rosterColorEdit){try{var _rc=JSON.parse(row.value);if(_rc&&typeof _rc==='object'){S.rosterColors=_rc;changed=true;}}catch(e){}}
          if(row.key==='charter_wait_rate'&&row.value){S.charterWaitRate=parseFloat(row.value)||150;lsSet('ts_charter_wait_rate',S.charterWaitRate);changed=true;}
          if(row.key==='aero_featured'&&row.value){try{var fl=JSON.parse(row.value);if(Array.isArray(fl)){S._aeroFeatured=fl;lsSet('featured_aerodromes',fl);changed=true;}}catch(e){}}
          if(row.key==='maintenance'&&row.value&&!(typeof _maintSaving!=='undefined'&&_maintSaving)){
            // Skip applying while a local save is in flight — otherwise it races the save's
            // read-modify-write across its await and can drop an edit.
            try{const m=JSON.parse(row.value);if(m&&m.hist){
              // Only MERGE when this device has unsaved edits to preserve (S._maintBase set). With no
              // base, take the cloud copy directly — merging an empty default looked like "deleted
              // everything" and wiped the data (showed blank for users with no local cache).
              if(S._maintBase&&typeof _maintMerge==='function'){
                S.maintenance=_maintMerge(m,JSON.parse(S._maintBase),S.maintenance||m);
              } else { S.maintenance=m; }
              if(typeof _maintSetBase==='function')_maintSetBase(m);else S._maintBase=JSON.stringify(m);
              lsSet('ts_maintenance',S.maintenance);changed=true;
            }}catch(e){}
          }
          if(row.key==='business_plan'&&row.value&&!(typeof _bizSaving!=='undefined'&&_bizSaving)){
            // Live business plan — merge another device's save (keeping this device's unsaved edits).
            try{var bp=JSON.parse(row.value);if(bp&&typeof bp==='object'){
              S._bizPlan=(S._bizBase&&typeof _bizMerge==='function')?_bizMerge(bp,JSON.parse(S._bizBase),S._bizPlan||bp):bp;
              if(typeof _bizSetBase==='function')_bizSetBase(bp);else S._bizBase=JSON.stringify(bp);
              S._bizPaxMerged=false;lsSet('ts_business_plan',S._bizPlan);changed=true;
            }}catch(e){}
          }
          if(row.key==='fr_settings'&&row.value){try{var _frs=JSON.parse(row.value);if(_frs&&typeof _frs==='object'){S._frSettings=_frs;_sbSetBase('fr_settings',_frs);changed=true;}}catch(e){}}
          if(row.key==='fd_limits'&&row.value){try{var _fdl=JSON.parse(row.value);if(_fdl&&typeof _fdl==='object'){S._fdLimits=_fdl;_sbSetBase('fd_limits',_fdl);changed=true;}}catch(e){}}
          if(row.key==='aircraft_obs'&&row.value){try{var _ao=JSON.parse(row.value);if(_ao&&typeof _ao==='object'){S.maintObs=_ao;lsSet('ts_aircraft_obs',_ao);_sbSetBase('aircraft_obs',_ao);changed=true;}}catch(e){}}
          if(row.key==='charter_quotes'&&row.value){try{var _cq=JSON.parse(row.value);if(Array.isArray(_cq)){lsSet('ts_charter_quotes_cache',_cq);_sbSetBase('charter_quotes',_cq);changed=true;}}catch(e){}}
          if(row.key==='scheduling'&&row.value&&!(S._schedSaving&&Date.now()-S._schedSaving<4000)){try{var _sc=JSON.parse(row.value);if(_sc&&typeof _sc==='object'){S._schedCfg=_sc;_sbSetBase('scheduling',_sc);lsSet('ts_scheduling',_sc);changed=true;}}catch(e){}}
        });
        return changed;
      }
    }catch(e){}
  }
  return false;
}

// ── Presence broadcasting ──
let _presInterval=null;
// Raw presence send — broadcasts the given section WITHOUT changing the locally-tracked
// section (so the idle guard can send a "clear" while remembering where the user really is).
function _sendPres(section){
  if(!_rtWs||_rtWs.readyState!==1||!S.user)return;
  _rtRef++;
  _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',
    payload:{type:'broadcast',event:'pres',payload:{
      userId:S.user.id,name:S.user.name||S.user.email,code:(function(){var mc=(S.user.linkedCrew||'').trim().toLowerCase();var cr=(S.crew||[]).find(function(c){return(c.n||'').trim().toLowerCase()===mc;});return cr&&cr.code?cr.code:'';})(),
      section:section,color:presColor(S.user.id),ts:Date.now()
    }},ref:String(_rtRef)}));
}
function broadcastPresence(section){
  S._presSection=section;
  S._presIdle=false;S._lastActivity=Date.now();
  _sendPres(section);
}
// Presence idle guard: a tab left open all day shouldn't keep someone in "Also viewing".
// After PRES_IDLE_MS with no interaction we stop refreshing presence (and send one clear),
// so they drop off everyone's bar within the 22s TTL. Any interaction resumes it instantly.
var PRES_IDLE_MS=120000; // 2 minutes
function _presTick(){
  if(!S.user)return;
  if(Date.now()-(S._lastActivity||0)<PRES_IDLE_MS){S._presIdle=false;broadcastPresence(S._presSection);}
  else if(!S._presIdle){S._presIdle=true;_sendPres(null);}   // gone quiet → clear our presence
}
(function _presActivityInit(){
  if(typeof window==='undefined'||window.__presActivityBound)return;
  window.__presActivityBound=true;S._lastActivity=Date.now();
  ['mousemove','mousedown','keydown','touchstart','wheel','scroll'].forEach(function(ev){
    window.addEventListener(ev,function(){
      S._lastActivity=Date.now();
      if(S._presIdle&&S.user&&S._presSection){S._presIdle=false;broadcastPresence(S._presSection);}
    },{passive:true,capture:true});
  });
})();
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
    if(fi<fields.length-1){nextRow=rowIdx;nextField=fields[fi+1];}
    else{nextRow=rowIdx+1;nextField=fields[0];}
  }else{
    if(fi>0){nextRow=rowIdx;nextField=fields[fi-1];}
    else if(rowIdx>0){nextRow=rowIdx-1;nextField=fields[fields.length-1];}
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
  _presInterval=setInterval(_presTick,9000);
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
  // Never resurrect a binned sheet: if it's been moved to the Bin, a stray Save-&-Close, autosave or
  // realtime echo must not write it back as 'unsigned'/'complete' (that's the "binned sheets reappear
  // in Active on refresh" bug).
  var _ex=(S.saved||[]).find(function(s){return s.id===id;});
  if(_ex&&_ex.status==='deleted')return;
  const status=form.status||'unsigned';
  // Preserve the Drive-archive flag so an archived loadsheet isn't reverted to "Signed" on a re-save.
  const _du=!!((S.saved||[]).find(function(s){return s.id===id;})||{}).driveUploaded;
  await sbU('ts_loadsheets',[{id:id,form:form,saved_at:new Date().toISOString(),status:status,drive_uploaded:_du}]);
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
    // Clear our presence on everyone else's bar, but KEEP S._presSection so the resume
    // branch below (and on a quick tab-switch back) can re-announce us. Using broadcastPresence(null)
    // here would null S._presSection and leave the resume as dead code.
    if(S._presSection)_sendPres(null);
    clearInterval(_presInterval);
  } else {
    var awayMs=_hiddenAt?Date.now()-_hiddenAt:0;
    var _rUnsaved=(typeof _rosterUnsaved==='function')&&_rosterUnsaved();
    // Reconnect realtime if the socket dropped while backgrounded, and resume presence.
    if(S.user&&(!_rtWs||_rtWs.readyState!==1)){try{initRealtime();}catch(e){}}
    if(S._presSection){clearInterval(_presInterval);broadcastPresence(S._presSection);_presInterval=setInterval(_presTick,9000);}
    // Came back after a longer absence: refresh the data IN PLACE instead of a full
    // page reload. The old location.reload() flashed the login screen and visibly
    // refreshed the page on return; reloading the core tables keeps the app mounted.
    // Skipped while a roster draft is unsaved so we don't clobber it.
    if(S.user&&awayMs>60000&&!_rUnsaved&&typeof _reloadCoreTables==='function'){
      try{_reloadCoreTables().then(function(){safeRender();});}catch(e){}
    }
  }
});
window.addEventListener('beforeunload',function(e){if(S._presSection)broadcastPresence(null);if(typeof _rosterUnsaved==='function'&&_rosterUnsaved()){e.preventDefault();e.returnValue='';return '';}});
window.addEventListener('pagehide',function(){if(S._presSection)broadcastPresence(null);});
// iOS/Safari restores frozen pages from the back/forward cache — reconnect realtime and
// refresh data in place rather than a full reload (which flashed the login screen).
window.addEventListener('pageshow',function(e){
  if(e.persisted&&S.user){
    if(!_rtWs||_rtWs.readyState!==1){try{initRealtime();}catch(e){}}
    if(typeof _reloadCoreTables==='function'){try{_reloadCoreTables().then(function(){safeRender();});}catch(e){}}
  }
});

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
    safeRender();return;
  }

  // Merge pax by id — higher _ts wins
  const paxMap={};
  (local.pax||[]).forEach(function(p){paxMap[p.id]=p;});
  (remote.pax||[]).forEach(function(p){
    if(!paxMap[p.id]||(p._ts||0)>(paxMap[p.id]._ts||0)){paxMap[p.id]=p;}
  });
  // Remove pax deleted by the other user (absent from remote, remote more recent overall).
  // Guard against deleting a pax the remote simply HASN'T SEEN YET: a passenger added
  // locally in the last 15s is protected, so a stale broadcast from another device that
  // predates our just-added pax can't wipe it. Our autosave pushes within ~1-2s, so a
  // genuine deletion of an older pax still propagates normally.
  if((remote._updateTs||0)>(local._updateTs||0)){
    const remIds=new Set((remote.pax||[]).map(function(p){return p.id;}));
    const _now=Date.now();
    Object.keys(paxMap).forEach(function(id){
      const _pts=paxMap[id]._ts||0;
      if(!remIds.has(id)&&_pts<(remote._updateTs||0)&&(_now-_pts)>15000){delete paxMap[id];}
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
  if(AUTH_PHASE_C){
    // Supabase Auth owns reset now — send its recovery email.
    try{await fetch(SB+'/auth/v1/recover',{method:'POST',headers:{'Content-Type':'application/json','apikey':SK},body:JSON.stringify({email:email})});}catch(e){}
    const el=document.getElementById('login-err');
    if(el){el.style.display='block';el.style.color='#4ade80';el.textContent='If that email exists, a reset link is on its way.';}
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
  // Save token to Supabase (sbUserWrite drops the empty hash under Phase A so it isn't wiped).
  try{
    await sbUserWrite([{id:u.id,name:u.name,email:u.email,role:u.role,
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
  if(AUTH_PHASE_A){
    // Token is hidden from the client now — verify + set server-side.
    const em=S.resetEmail||(document.getElementById('li_e')?.value||'').trim();
    const res=await callFn('confirm-reset',{email:em,code:code,newPassword:newPw});
    if(!res.ok){showResetErr(res.data&&res.data.error==='invalid_code'?'Invalid or expired code. Request a new one.':'Could not reset password. Try again.');return;}
    auditLog('password_reset','Password reset (server) for '+(em||'user'));
  } else {
    const u=S.users.find(x=>x.resetToken===code&&x.resetExpires&&Date.now()<x.resetExpires);
    if(!u){showResetErr('Invalid or expired code. Request a new one.');return;}
    u.passwordHash=await hashPw(newPw);delete u.resetToken;delete u.resetExpires;
    lsSet('ts_users_cache',S.users);
    try{
      await sbUserWrite([{id:u.id,name:u.name,email:u.email,role:u.role,
        linked_crew:u.linkedCrew||'',password_hash:u.passwordHash,
        reset_token:null,reset_expires:null}]);
    }catch(e){}
    auditLog('password_reset','Password reset for '+u.email);
  }
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
  let u=null;
  if(AUTH_PHASE_C){
    // Real Supabase Auth: sign in (migrating the legacy password on first login), then
    // build the user from the JWT claims.
    const r=await _sbSignIn(email,pass);
    if(r&&r.ok){
      _applySession(r.session);
      u=_userFromClaims(r.claims||{});
      const _ix=S.users.findIndex(x=>x.id===u.id);if(_ix>=0)S.users[_ix]=Object.assign({},S.users[_ix],u);else if(u.id)S.users.push(u);
    } else if(r&&r.offline){
      showErr('Login service unavailable. Check your connection and try again.');return;
    }
  } else if(AUTH_PHASE_A){
    // Server-side verification — hashes never reach the browser.
    const res=await callFn('verify-login',{email,password:pass});
    if(res.ok&&res.data&&res.data.user){
      const vu=res.data.user;
      u={id:vu.id,name:vu.name,email:vu.email,role:vu.role,linkedCrew:vu.linked_crew||'',passwordHash:'',
         weight:parseFloat(vu.weight)||0,isPilot:vu.is_pilot||vu.role==='pilot'||false,inactive:vu.inactive||false};
      // Keep S.users in sync with the verified record.
      const _ix=S.users.findIndex(x=>x.id===u.id);if(_ix>=0)S.users[_ix]=Object.assign({},S.users[_ix],u);else S.users.push(u);
    } else if(res.status===0){
      showErr('Login service unavailable. Check your connection and try again.');return;
    }
  } else {
    // find user by email first, then verify password async
    const uByEmail=S.users.find(x=>x.email.toLowerCase()===email.toLowerCase());
    const pwOk=uByEmail?await verifyPw(pass,uByEmail.passwordHash):false;
    u=pwOk?uByEmail:null;
    // auto-upgrade legacy btoa hash to SHA-256
    if(u&&u.passwordHash===btoa(pass)){u.passwordHash=await hashPw(pass);lsSet('ts_users_cache',S.users);try{await sbUserWrite([{id:u.id,password_hash:u.passwordHash}]);}catch(e){}}
  }
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
  S.tab=u.role==='maint'?'maintenance':'manifest';S._appLoading=true;S._introStart=Date.now();render();initRealtime();setTimeout(function(){restoreWorkspace();},600);setTimeout(function(){S._appLoading=false;render();},INTRO_MS);
  // Phase C: the boot fetch ran as anon (RLS hid protected tables) — reload them now the JWT is set.
  if(AUTH_PHASE_C){_reloadCoreTables().then(function(){safeRender();});}
  // Fetch latest audit log from Supabase after login (shared helper; uses the user JWT via SH)
  _loadAuditLog();
}

window.tryLogin=async function(){
  if(S._loggingIn)return;                 // guard against double-submit
  S._loggingIn=true;
  var _b=document.querySelector('#login-form button[type=submit]');
  if(_b){_b.disabled=true;_b.textContent='Signing in…';_b.style.opacity='.7';}
  try{await _doLogin();}
  finally{S._loggingIn=false;if(_b&&document.body.contains(_b)){_b.disabled=false;_b.innerHTML='✈ Sign In';_b.style.opacity='1';}}
};
window.updateLoginSuffix=function(){
  var e=document.getElementById('li_e'),s=document.getElementById('li_e_sfx');if(!e)return;
  var hasAt=e.value.indexOf('@')>=0;
  if(s)s.style.display=hasAt?'none':'';
  // If they've typed a full email, let the field fill the row; otherwise size it to the typed text so
  // the @truesouthflights.co.nz suffix sits right after the username and stays aligned on the same line.
  if(hasAt){e.style.flex='1';e.style.width='100%';return;}
  var m=document.getElementById('li_e_meas');
  if(!m){m=document.createElement('span');m.id='li_e_meas';m.style.cssText='position:absolute;left:-9999px;top:0;white-space:pre;visibility:hidden;pointer-events:none';document.body.appendChild(m);}
  var cs=getComputedStyle(e);m.style.fontSize=cs.fontSize;m.style.fontFamily=cs.fontFamily;m.style.fontWeight=cs.fontWeight;m.style.letterSpacing=cs.letterSpacing;
  m.textContent=e.value||e.placeholder||'yourname';
  var pad=16;                                  // left padding(14) + ~2 so the suffix nearly touches the text
  var avail=(e.parentElement?e.parentElement.clientWidth:320)-(s?s.offsetWidth:200)-6;
  e.style.flex='0 0 auto';e.style.width=Math.max(60,Math.min(m.offsetWidth+pad,avail))+'px';
};
function logout(){
  if(AUTH_PHASE_C){
    try{if(_sbSession&&_sbSession.access_token)fetch(SB+'/auth/v1/logout',{method:'POST',headers:{'apikey':SK,'Authorization':'Bearer '+_sbSession.access_token}}).catch(function(){});}catch(e){}
    try{localStorage.removeItem('ts_sb_session');}catch(e){}
    clearTimeout(_sbRefreshTimer);_applySession(null);  // restores the anon key on SH
  }
  S.user=null;sessionStorage.removeItem('ts_user');localStorage.removeItem('ts_remembered_user');S._notifications=[];S.__notifStr='';S._notifOpen=false;broadcastPresence(null);if(_rtWs){try{_rtWs.onclose=null;_rtWs.close();}catch{}  _rtWs=null;}S.rtStatus='offline';S.rtPresence={};S._presSection=null;clearInterval(_presInterval);render();}

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
    if(_r.ok){
      var _rows=await _r.json();
      if(_rows.length&&_rows[0].value)_applyWorkspace(JSON.parse(_rows[0].value));
    }
  }catch(e){}
  // Always return to the last-viewed page on boot/login, even with no shared workspace.
  try{_restoreLastView();safeRender();}catch(e){}
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
  if(_render)safeRender();
}
// Return to the same page (section / tab / open loadsheet or manifest) after a reload,
// as long as that item is still open.
function _restoreLastView(){
  // Read the saved view BEFORE we enable saving again — boot renders were gated so this
  // value is still the user's real last page. From here on, renders may save the view.
  var _savedView=null;try{_savedView=JSON.parse(localStorage.getItem('ts_lastview')||'null');}catch(e){}
  S._viewRestored=true;
  try{
    var v=_savedView;
    if(!v||!v.section)return;
    if(v.section==='operations'){
      S.section='operations';
      if(v.activeTabId&&(S.lsTabs||[]).find(function(t){return t.id===v.activeTabId;})){
        var t=S.lsTabs.find(function(x){return x.id===v.activeTabId;});
        // Restore into the unified Operations ▸ Loadsheets inline editor (not the legacy route).
        S.activeTabId=t.id;S.form=t.form;S.lsAc=(t.acId||'').replace('ZK-','');S.editId=t.id;S.tab='rloadsheets';S._rzLsActiveId=t.id;S._newLsTab=false;
        return;
      }
      S.tab=v.tab||'bookings';
      if(v.groundTab)S._groundTab=v.groundTab; // restore Ground ▸ Pickups/My Pickups sub-tab
      // Legacy tab ids retired → map to the new Operations flow.
      if(S.tab==='manifest'||S.tab==='loadsheet')S.tab='bookings';else if(S.tab==='seatmap')S.tab='rseatmap';
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
      if(v.pilotBagTab)S._pilotBagTab=v.pilotBagTab; // restore Pilot Bag ▸ Flight Record/Logbooks/Flight & Duty
    }
  }catch(e){}
}

window.addEventListener('pagehide',function(){saveWorkspace();});

// Hidden shortcut: tap 4× in quick succession (each tap ≤500ms after the last) on CLEAR SPACE —
// not on a button/link/field/control — → jump straight to the Flight Record. A pilot convenience
// for logging on the apron without digging through the menu. Only fires for users who can see it.
(function(){
  if(typeof document==='undefined')return;
  var _lastTap=0,_tapCount=0;
  var _interactive='a,button,input,select,textarea,label,canvas,[onclick],[role="button"],[contenteditable],[draggable="true"]';
  document.addEventListener('pointerdown',function(e){
    // Ignore taps that land on (or inside) an interactive control — only blank space counts.
    if(e&&e.target&&e.target.closest&&e.target.closest(_interactive))return;
    var now=Date.now();
    _tapCount=(now-_lastTap<=500)?(_tapCount+1):1;
    _lastTap=now;
    if(_tapCount>=4){
      _tapCount=0;
      try{
        if(!S||!S.user)return;
        var sa=!!(S.user&&S.user.superAdmin);
        if(!sa&&!(typeof hasRolePerm==='function'&&hasRolePerm('flightrecord')))return;
        if(typeof window.setPilotBagTab==='function')window.setPilotBagTab('flightrecord');
      }catch(e){}
    }
  },true);
})();

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
