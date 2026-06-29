// === MODULE: admin_b === v26.24 ===
window.switchLsTab=function(id){
  var tab=S.lsTabs.find(function(t){return t.id===id;});
  if(!tab)return;
  S.activeTabId=id;S.form=tab.form;S.lsAc=tab.acId.replace('ZK-','');S.editId=id;
  S._newLsTab=false;S.tab='loadsheet';render();
};
window.closeLsTab=function(id){
  var idx=S.lsTabs.findIndex(function(t){return t.id===id;});
  if(idx===-1)return;
  var tab=S.lsTabs[idx];
  var acCode=tab.acId?tab.acId.replace('ZK-',''):id;
  var _isSigned=!!(tab.form&&tab.form.sig);
  // Build custom dialog
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
  var box=document.createElement('div');
  box.style.cssText='background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:22px;max-width:360px;width:100%';
  var title=acCode+' loadsheet';
  if(tab.isNew){
    box.innerHTML='<div style="font-size:16px;font-weight:700;margin-bottom:8px">Close '+title+'?</div>'
      +'<div style="font-size:13px;color:var(--text3);margin-bottom:18px">This is a new loadsheet. Keep it in Saved for later, or delete it now.</div>'
      +'<div style="display:flex;gap:8px;margin-bottom:8px">'
      +'<button id="_lsCloseKeep" style="flex:1;padding:11px;background:var(--acc);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Keep</button>'
      +'<button id="_lsCloseDelete" style="flex:1;padding:11px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Delete</button>'
      +'</div>'
      +'<button id="_lsCloseCancel" style="width:100%;padding:10px;background:var(--card2);color:var(--text2);border:1px solid var(--border2);border-radius:8px;font-size:13px;cursor:pointer">Cancel</button>';
  } else {
    box.innerHTML='<div style="font-size:16px;font-weight:700;margin-bottom:8px">Close '+title+'?</div>'
      +'<div style="font-size:13px;color:var(--text3);margin-bottom:18px">Save your changes to the folder, or close without saving.</div>'
      +'<div style="display:flex;gap:8px;margin-bottom:8px">'
      +'<button id="_lsCloseKeep" style="flex:1;padding:11px;background:var(--acc);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">'+(_isSigned?'&#x1f4be; Save &amp; Submit':'Save &amp; Close')+'</button>'
      +'<button id="_lsCloseDelete" style="flex:1;padding:11px;background:transparent;color:#f59e0b;border:1.5px solid #f59e0b;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Discard Changes</button>'
      +'</div>'
      +'<button id="_lsClosePermDel" style="width:100%;margin-bottom:6px;padding:10px;background:transparent;color:#ef4444;border:1.5px solid #ef4444;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">🗑 Delete Loadsheet</button>'
      +'<button id="_lsCloseCancel" style="width:100%;padding:10px;background:var(--card2);color:var(--text2);border:1px solid var(--border2);border-radius:8px;font-size:13px;cursor:pointer">Cancel</button>';
  }
  ov.appendChild(box);
  document.body.appendChild(ov);
  function _doClose(action){
    ov.remove();
    _execCloseLsTab(id,idx,tab,action);
  }
  document.getElementById('_lsCloseKeep').onclick=function(){_doClose('keep');};
  document.getElementById('_lsCloseDelete').onclick=function(){_doClose(tab.isNew?'delete':'revert');};
  document.getElementById('_lsCloseCancel').onclick=function(){ov.remove();};
  var _permDelBtn=document.getElementById('_lsClosePermDel');
  if(_permDelBtn)_permDelBtn.onclick=function(){
    if(confirm('Permanently delete this loadsheet? This cannot be undone.'))_doClose('delete');
  };
};
function _execCloseLsTab(id,idx,tab,action){
  if(action==='delete'){
    sbDel('ts_loadsheets',id).catch(function(){});
    S.saved=S.saved.filter(function(s){return s.id!==id;});
    lsSet('ts_loadsheets_cache',S.saved);
    S._lsFormUndo=null;
    if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_deleted',payload:{id:id,sessionId:_sessionId}},ref:String(_rtRef)}));}
  } else if(action==='revert'){
    // Discard: just close, DB unchanged (holds the original)
    S._lsFormUndo=null;
  } else if(action==='keep'){
    // Save & Close / Save & Submit
    const _sf=tab.form||S.form;
    if(_sf&&_sf.sig){
      // Signed — run handleSubmit flow then bail (it closes the tab itself)
      S.activeTabId=id;S.form=_sf;S.lsAc=(_sf.ac||'').replace('ZK-','');S.editId=id;
      window.handleSubmit();return;
    }
    if(_sf)saveLsToDb(id,_sf).catch(function(){});
  }
  // Broadcast close
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_tab_close',payload:{id:id}},ref:String(_rtRef)}));}
  var _closedAcCode=tab.acId?tab.acId.replace('ZK-',''):null;
  if(S.activeTabId===id){
    if(S.lsTabs.length>1){var next=S.lsTabs[idx>0?idx-1:1];S.activeTabId=next.id;S.form=next.form;S.lsAc=next.acId.replace('ZK-','');S.editId=next.id;}
    else{S.activeTabId=null;S.editId=null;S._newLsTab=false;S._rzLsActiveId=null;S.tab='rloadsheets';S.form=bF();}
  }
  S.lsTabs.splice(idx,1);
  // Clear stale form cache for this aircraft if no other tabs remain for it
  if(_closedAcCode&&!S.lsTabs.find(function(t){return t.acId&&t.acId.replace('ZK-','')===_closedAcCode;})){
    S.lsForms[_closedAcCode]=bF_ac('ZK-'+_closedAcCode);
  }
  window.saveWorkspace&&window.saveWorkspace();render();
}
// (window.newLsTab removed in v23.76 — legacy loadsheet route retired.)
window.toggleLsManage=function(){S._lsManageMode=!S._lsManageMode;S._lsTabSel={};render();};
window.toggleLsTabSel=function(id){S._lsTabSel[id]=!S._lsTabSel[id];render();};
window.deleteSelectedLsTabs=function(){
  var ids=Object.keys(S._lsTabSel).filter(function(id){return S._lsTabSel[id];});
  if(!ids.length)return;
  ids.forEach(function(id){
    sbDel('ts_loadsheets',id).catch(function(){});
    S.saved=S.saved.filter(function(s){return s.id!==id;});
    if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_tab_close',payload:{id:id}},ref:String(_rtRef)}));}
  });
  lsSet('ts_loadsheets_cache',S.saved);
  S.lsTabs=S.lsTabs.filter(function(t){return!S._lsTabSel[t.id];});
  if(S.activeTabId&&S._lsTabSel[S.activeTabId]){S.activeTabId=null;S.editId=null;S._rzLsActiveId=null;S.tab='rloadsheets';}
  S._lsManageMode=false;S._lsTabSel={};window.saveWorkspace&&window.saveWorkspace();render();
};
window.createLsTab=function(acId){S._newLsTab=false;generateLoadsheet(acId);};
window.pushLsToSeatmap=function(){
  const f=S.form;if(!f||!f.ac)return;
  const ws=seatmapWS();
  if(_wsHasContent(ws)){
    _seatmapChoicePrompt({
      title:'Seatmap already has passengers',
      body:'Add this loadsheet to the seatmap as another aircraft, or replace everything first?',
      mergeLabel:'Merge — add this loadsheet',
      onMerge:function(){_doPushLs(f,false,true);},
      onReplace:function(){_doPushLs(f,true,false);}
    });
    return;
  }
  _doPushLs(f,false,false);
};
// Push a loadsheet form into the seatmap workspace, replicating its exact seating.
// duplicate=true → add as a NEW aircraft instance (keeps existing seatmap intact).
function _doPushLs(f,replace,duplicate){
  let ws=seatmapWS();
  if(replace){S.smWS=bD();ws=S.smWS;}
  ws.acSetup=ws.acSetup||[];ws.seatMap=ws.seatMap||{};ws.pax=ws.pax||[];
  const phys=f.ac;
  let smKey;
  if(duplicate){
    const existing=ws.acSetup.filter(function(x){return _ac(x._seatmapKey||x.acId)===phys;});
    if(existing.length){
      if(existing.length===1&&!existing[0]._displaySuffix){existing[0]._seatmapKey=existing[0]._seatmapKey||existing[0].acId;existing[0]._displaySuffix='(1)';}
      smKey=phys+'_'+(existing.length+1);
    } else smKey=phys;
  } else {
    const ex=ws.acSetup.find(function(x){return _ac(x._seatmapKey||x.acId)===phys;});
    smKey=ex?(ex._seatmapKey||ex.acId):phys;
  }
  const src='LS '+phys.replace('ZK-','');
  let acs=ws.acSetup.find(function(x){return (x._seatmapKey||x.acId)===smKey;});
  if(!acs){acs={acId:phys,_seatmapKey:smKey,pic:f.pic||'',coPilot:f.coPilot||'',fuelInput:(f.fuel?fromKg(parseFloat(f.fuel)||0,phys):null),_srcManifest:src};if(smKey!==phys)acs._displaySuffix='('+smKey.split('_').pop()+')';ws.acSetup.push(acs);}
  else{acs.pic=f.pic||acs.pic;acs.coPilot=f.coPilot||acs.coPilot;acs._srcManifest=src;}
  if(replace||!ws.dep){ws.dep=f.dep;ws.dest=f.dest;ws.date=f.date;ws.etd=f.etd;ws.etdCustom=f.etdCustom||false;}
  // Replicate the loadsheet's seat positions exactly into this instance
  const sm={};
  Object.keys(f.names||{}).forEach(function(idx){
    const i=parseInt(idx);
    if(i===0)return;                 // PIC seat
    if(i===1&&f.coPilot)return;      // co-pilot seat
    const nm=(f.names[i]||'').trim();if(!nm)return;
    const pid='p_'+Date.now()+'_'+Math.floor(Math.random()*1e6);
    ws.pax.push({id:pid,name:nm,weight:parseFloat((f.seats||{})[i]||0)||0,bag:parseFloat((f.bags||{})[i]||0)||0,group:(f.paxGroups||{})[i]||'',type:((f.paxType||{})[i]==='C'?'child':'adult'),paymentReq:!!((f.paxPaymentReq||{})[i]),infantName:(f.infantNames||{})[i]||null,pinAc:phys,_smPin:smKey,_src:src,_ts:Date.now()});
    sm[i]=pid;
  });
  ws.seatMap[smKey]=sm;
  S.tab='seatmap';S.selectedPax=null;window.scrollTo(0,0);
  _seatmapSyncPool();
  S.solverAutoApply=true;runSolver();saveSeatmapWS();render();
  toast('✅ Loadsheet pushed to seatmap','ok');
}
window.pushAllLsToSeatmap=function(){
  const tabs=S.lsTabs||[];
  if(!tabs.length){toast('No open loadsheets to push.','warn');return;}
  const _D=curDisp();
  _D.pax=_D.pax||[];
  _D.seatMap=_D.seatMap||{};
  _D.acSetup=_D.acSetup||[];
  // Build name→id map from existing pax
  const nameMap={};
  _D.pax.forEach(function(p){if(p.name)nameMap[p.name.trim().toLowerCase()]=p.id;});
  // Group tabs by physical aircraft
  const acGroups={};
  tabs.forEach(function(tab){
    const ac=(tab.form?.ac)||tab.acId;if(!ac)return;
    if(!acGroups[ac])acGroups[ac]=[];
    acGroups[ac].push(tab);
  });
  // Merge each loadsheet into dispatch
  Object.keys(acGroups).forEach(function(phyId){
    const group=acGroups[phyId];
    group.forEach(function(tab,i){
      const f=tab.form;if(!f)return;
      const multi=group.length>1;
      const smKey=multi?(phyId+'_'+(i+1)):phyId;
      const suffix=multi?'('+(i+1)+')':null;
      // Add to acSetup if not present; always update PIC/coPilot from loadsheet
      var _pacs=_D.acSetup.find(function(s){return(s._seatmapKey||s.acId)===smKey;});
      if(!_pacs){
        var _ephys=_D.acSetup.find(function(s){return s.acId===phyId;});
        _pacs=Object.assign({},_ephys||{acId:phyId},{acId:phyId,_seatmapKey:smKey,_displaySuffix:suffix});
        // PIC/coPilot not carried from loadsheet — manifest owns those
        _D.acSetup.push(_pacs);
      }
      // Full replace — clear existing seats so removed pax don't persist
      const sm={};
      Object.keys(f.names||{}).forEach(function(idx){
        if(parseInt(idx)===0)return; // Skip PIC
        const nm=(f.names[idx]||'').trim();if(!nm)return;
        const key=nm.toLowerCase();
        let pid=nameMap[key];
        if(!pid){
          pid='_ls_'+key.replace(/[^a-z0-9]/g,'_');
          if(!_D.pax.find(function(p){return p.id===pid;})){
            _D.pax.push({id:pid,name:nm,
              weight:parseFloat((f.seats||{})[idx]||0)||0,
              bag:parseFloat((f.bags||{})[idx]||0)||0,
              type:((f.paxType||{})[idx]==='C'?'child':'adult'),
              group:(f.paxGroups||{})[idx]||'',
              infantName:(f.infantNames||{})[idx]||null,
              paymentReq:!!((f.paxPaymentReq||{})[idx]),
              _pushedFrom:phyId});
          }
          nameMap[key]=pid;
        }
        sm[parseInt(idx)]=pid;
        // Keep the seated pax record in sync with the loadsheet so group / infant / child /
        // TO-PAY all survive (e.g. when the aircraft is later removed and pax fall to the pool).
        var _dp=_D.pax.find(function(px){return px.id===pid;});
        if(_dp){
          _dp.group=(f.paxGroups||{})[idx]||'';
          _dp.infantName=(f.infantNames||{})[idx]||null;
          _dp.paymentReq=!!((f.paxPaymentReq||{})[idx]);
          _dp.type=((f.paxType||{})[idx]==='C'?'child':'adult');
        }
      });
      _D.seatMap[smKey]=sm;
    });
  });
  runSolver();
  saveSeatmapWS();render();
  toast('✅ All loadsheets pushed to seatmap','ok');
};
window.pullFromSeatmap=function(){
  const d=S.dispatch;
  // Sync pax pinAc from seatmap seat assignments
  Object.entries(d.seatMap||{}).forEach(function(e){
    const acId=e[0];const sm=e[1];
    Object.values(sm||{}).forEach(function(paxId){
      const p=(d.pax||[]).find(function(x){return x.id===paxId;});
      if(p){p.pinAc=acId;p._ts=Date.now();}
    });
  });
  // Update PICs in acSetup from open loadsheets
  (d.acSetup||[]).forEach(function(s){
    const tab=(S.lsTabs||[]).find(function(t){return t.acId===s.acId&&t.form&&t.form.pic;});
    if(tab&&tab.form.pic)s.pic=tab.form.pic;
    if(tab&&tab.form.coPilot)s.coPilot=tab.form.coPilot;
  });
  autoSaveDispatch();render();
  toast('✅ Pulled from seatmap','ok');
};
window.clearSeatmap=function(){
  // Unseat everyone in the workspace (they fall back to the pool). Manifests untouched.
  const _D=curDisp();
  _D.seatMap={};_D.origAcMap={};
  S.selectedPax=null;
  _seatmapSyncPool();
  S.solverAutoApply=true;runSolver();saveSeatmapWS();render();
  toast('Seats cleared — passengers moved to the pool','ok');
};
window.resetSeatmap=function(){
  // Empty the entire seatmap workspace (seats, pool, aircraft, passengers).
  // Manifests are NOT affected — re-push from any manifest afterwards.
  if(!confirm('Clear the whole seatmap (seats, pool and aircraft)?\n\nYour manifests are not affected — you can push them again afterwards.'))return;
  S.smWS=bD();
  S.selectedPax=null;S._unassignedUndo=null;S.solverRes={};
  saveSeatmapWS();
  S.tab='manifest';window.scrollTo(0,0);render();
  toast('Seatmap cleared. Push a manifest when ready.','ok');
};
window.removeAcFromSeatmap=function(smKey){
  // Remove this aircraft from the seatmap WORKSPACE entirely — its card disappears.
  // Its seated passengers fall back to the pool. The manifest is never touched.
  const _D=curDisp();
  if(_D.seatMap)delete _D.seatMap[smKey];
  if(Array.isArray(_D.acSetup))_D.acSetup=_D.acSetup.filter(function(s){return (s._seatmapKey||s.acId)!==smKey;});
  S.selectedPax=null;
  _seatmapSyncPool();
  S.solverAutoApply=true;runSolver();saveSeatmapWS();render();
  toast('Aircraft removed from seatmap (passengers moved to the pool)','ok');
};
window.createBlankLsTab=function(acId){
  const a=S.aircraft[acId];if(!a)return;
  const d=S.dispatch;
  const setup=d.acSetup.find(function(s){return s.acId===acId;});
  const form=bF();
  form.ac=acId;
  form.dep=d.dep;form.dest=d.dest;form.date=d.date;form.etd=d.etd;form.etdCustom=d.etdCustom||false;
  const _lsAcCode=acId.replace('ZK-','');
  const _newTabId='ls_'+_lsAcCode+'_'+Date.now();
  S.lsForms[_lsAcCode]=form;S.lsAc=_lsAcCode;S.form=form;S.editId=_newTabId;S.formDirty=false;
  var _savedAt=new Date().toISOString();
  S.lsTabs.push({id:_newTabId,acId:acId,form:form,status:'draft',savedAt:_savedAt,isNew:true});
  S.activeTabId=_newTabId;S._newLsTab=false;S.tab='loadsheet';
  var _formSnap2=dc(form);
  sbU('ts_loadsheets',[{id:_newTabId,form:_formSnap2,saved_at:_savedAt,status:'draft'}]).catch(function(){});
  S.saved=S.saved||[];S.saved.unshift({id:_newTabId,form:_formSnap2,status:'draft',savedAt:_savedAt});lsSet('ts_loadsheets_cache',S.saved);
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_tab_open',payload:{id:_newTabId,acId:acId,form:_formSnap2,savedAt:_savedAt,status:'draft',isNew:true,by:(S.user&&S.user.name)||''}},ref:String(_rtRef)}));}
  window.saveWorkspace&&window.saveWorkspace();
  render();
};
window.changeLsAircraft=function(targetAcFull){
  var tab=S.lsTabs.find(function(t){return t.id===S.activeTabId;});
  if(tab)tab.acId=targetAcFull;
  S.lsAc=targetAcFull.replace('ZK-','');
  window.lsAc(targetAcFull);
  if(tab)tab.form=S.form;
  autoSaveLS();
};
window.editSaved=function(id){
  // Open in the current Operations ▸ Loadsheets editor (the legacy 'loadsheet' route is retired).
  if(typeof window.rezdyOpenLsTab==='function'){window.rezdyOpenLsTab(id);window.saveWorkspace&&window.saveWorkspace();return;}
  var existing=S.lsTabs.find(function(t){return t.id===id;});
  if(existing){window.switchLsTab(id);return;}
  var s=S.saved.find(function(x){return x.id===id;});
  if(!s)return;
  _openLsTabSilent(s);
  window.switchLsTab(s.id);window.saveWorkspace&&window.saveWorkspace();
};
// Add a saved loadsheet as an open tab WITHOUT switching/rendering (for bulk open).
function _openLsTabSilent(s){
  if(!s||!s.form)return;
  if(S.lsTabs.find(function(t){return t.id===s.id;}))return;
  var acFull=s.form.ac?s.form.ac:'ZK-SLA';
  var f=dc(s.form);if(!f.cargo)f.cargo={};
  var ac=S.aircraft[f.ac];if(ac&&ac.layout==='ga8'&&(!f.burnOff||parseFloat(f.burnOff)<30))f.burnOff='35';
  S.lsTabs.push({id:s.id,acId:acFull,form:f,status:s.status||'unsigned',savedAt:s.savedAt,originalForm:dc(s.form)});
}
// Add a saved manifest as an open tab WITHOUT switching view/rendering (for bulk open).
function _openManifestTabSilent(m){
  if(!m)return;
  if(!S._manifestDispatches)S._manifestDispatches={};
  if(!S.manifestTabs)S.manifestTabs=[];
  var ex=S.manifestTabs.find(function(t){return t.savedId===m.id;});
  if(ex){S.activeManifestTabId=ex.id;S.dispatch=JSON.parse(JSON.stringify((S._manifestDispatches||{})[ex.id]||bD()));S._loadedManifestId=m.id;return;}
  var now=Date.now();
  var data=Object.assign({},bD(),m.data||{},{seatMap:{},step:1});
  (data.pax||[]).forEach(function(p){p._ts=now;});
  (data.acSetup||[]).forEach(function(s){s._ts=now;});
  data._updateTs=now;data._loadedAt=now;
  if(S.activeManifestTabId)S._manifestDispatches[S.activeManifestTabId]=JSON.parse(JSON.stringify(S.dispatch));
  var newId='mt_'+now+'_'+Math.floor(Math.random()*1e4);
  S._manifestDispatches[newId]=JSON.parse(JSON.stringify(data));
  S.manifestTabs.push({id:newId,savedId:m.id});
  S.activeManifestTabId=newId;
  S.dispatch=JSON.parse(JSON.stringify(data));
  S._loadedManifestId=m.id;
}
// Open every selected saved item at once — each into its own tab.
window.openSelectedSaved=function(){
  var ids=Object.keys(S.savedSel||{});
  if(!ids.length){toast('Select items to open first.','warn');return;}
  var nLs=0,nMf=0,lastLs=null;
  ids.forEach(function(id){
    var s=(S.saved||[]).find(function(x){return x.id===id;});
    if(s){_openLsTabSilent(s);nLs++;lastLs=s.id;return;}
    var m=(S.manifests||[]).find(function(x){return x.id===id;});
    if(m){_openManifestTabSilent(m);nMf++;}
  });
  S.savedSel={};
  S.section='operations';S._newLsTab=false;
  // Navigate to whichever type we opened (prefer manifests if that's what was selected)
  if(nMf&&!nLs){
    S.tab='manifest';
  } else if(nLs){
    var t=S.lsTabs.find(function(x){return x.id===lastLs;});
    if(t){S.activeTabId=t.id;S.form=t.form;S.lsAc=(t.acId||'').replace('ZK-','');S.editId=t.id;}
    S.tab='loadsheet';
  }
  window.saveWorkspace&&window.saveWorkspace();
  window.scrollTo(0,0);render();
  toast('Opened '+(nLs+nMf)+' item'+((nLs+nMf)!==1?'s':''),'ok');
};
window.delSaved=async function(id){if(!confirm('Move this loadsheet to Bin?'))return;var s=S.saved.find(function(x){return x.id===id;});if(!s)return;s.form._prevStatus=s.status;s.status='deleted';if(window._lsStickyMark)window._lsStickyMark(id,'deleted',true);lsSet('ts_loadsheets_cache',S.saved);render();auditLog('loadsheet_bin',{id:s.id,ac:(s.form&&s.form.ac)||'',date:(s.form&&s.form.date)||''});await sbU('ts_loadsheets',[_lsWritePayload(s.id,s.form,s.savedAt,'deleted',!!s.driveUploaded)]);};
window.restoreFromBin=async function(id){
  var s=S.saved.find(function(x){return x.id===id;});
  if(s){var ps=s.form._prevStatus||'unsigned';delete s.form._prevStatus;s.status=ps;if(window._lsStickyMark)window._lsStickyMark(id,'deleted',false);lsSet('ts_loadsheets_cache',S.saved);render();await sbU('ts_loadsheets',[_lsWritePayload(s.id,s.form,s.savedAt,s.status,!!s.driveUploaded)]);return;}
  var m=S.manifests.find(function(x){return x.id===id;});
  if(m){if(m.data)delete m.data._deleted;m._deleted=false;lsSet('ts_manifests_cache',S.manifests);render();await sbU('ts_manifests',[{id:m.id,name:m.name,data:m.data,saved_at:m.savedAt}]);}
};
window.permDeleteFromBin=async function(id){if(!confirm('Permanently delete? This cannot be undone.'))return;auditLog('record_delete_permanent',{id:id});if(window._lsStickyMark){window._lsStickyMark(id,'deleted',false);window._lsStickyMark(id,'uploaded',false);}S.saved=S.saved.filter(function(s){return s.id!==id;});S.manifests=S.manifests.filter(function(m){return m.id!==id;});lsSet('ts_loadsheets_cache',S.saved);lsSet('ts_manifests_cache',S.manifests);render();await sbDel('ts_loadsheets',id).catch(function(){});await sbDel('ts_manifests',id).catch(function(){});};
window.emptyBin=async function(){var bLs=S.saved.filter(function(s){return s.status==='deleted';});var bMs=S.manifests.filter(function(m){return m._deleted;});if(!bLs.length&&!bMs.length){toast('Bin is already empty','info');return;}if(!confirm('Permanently delete all '+(bLs.length+bMs.length)+' item(s)? This cannot be undone.'))return;auditLog('bin_empty',{loadsheets:bLs.length,manifests:bMs.length});if(window._lsStickyMark)bLs.forEach(function(x){window._lsStickyMark(x.id,'deleted',false);window._lsStickyMark(x.id,'uploaded',false);});S.saved=S.saved.filter(function(s){return s.status!=='deleted';});S.manifests=S.manifests.filter(function(m){return!m._deleted;});lsSet('ts_loadsheets_cache',S.saved);lsSet('ts_manifests_cache',S.manifests);render();for(var i=0;i<bLs.length;i++)await sbDel('ts_loadsheets',bLs[i].id).catch(function(){});for(var j=0;j<bMs.length;j++)await sbDel('ts_manifests',bMs[j].id).catch(function(){});};
window.restoreLsOriginal=function(){
  if(!confirm('Restore to the version loaded from saved? Any unsaved edits will be lost.'))return;
  var tab=S.lsTabs.find(function(t){return t.id===S.activeTabId;});
  if(!tab||!tab.originalForm)return;
  tab.form=dc(tab.originalForm);
  S.form=tab.form;
  delete tab.originalForm;
  clearTimeout(_autoSaveLSTimer);
  autoSaveLS(); // push the restored version to DB
  render();
};
window.dismissLsRestore=function(){
  var tab=S.lsTabs.find(function(t){return t.id===S.activeTabId;});
  if(tab)delete tab.originalForm;
  render();
};

// ── Charter ──
// -- Pad (Scratchpad) management --
var _padDebounce=null;
window.newPad=function(){
  var id='pad_'+Date.now();
  var nextN=(S.pads.length+S.padTabs.filter(function(t){return!S.pads.find(function(p){return p.id===t.id;});}).length)+1;
  var title='Scratch '+nextN;
  var pad={id:id,title:title,content:'',drawing:[],savedAt:new Date().toISOString(),_mode:'text',_dirty:false};
  S.padTabs.push(pad);S.activePadId=id;
  S.tab='scratchpad';S.activeTabId=null;S._newLsTab=false;
  render();
  sbU('ts_scratchpads',[{id:id,title:title,content:'',drawing:[],saved_at:new Date().toISOString()}]).then(function(){
    if(!S.pads.find(function(p){return p.id===id;}))S.pads.push({id:id,title:title,content:'',drawing:[]});
    if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'pad_new',payload:{id:id,title:title}},ref:String(_rtRef)}));}
  }).catch(function(){});
};
window.openPad=function(id){
  var ex=S.padTabs.find(function(t){return t.id===id;});
  if(ex){S.activePadId=id;render();return;}
  var ps=S.pads.find(function(p){return p.id===id;});
  if(!ps)return;
  S.padTabs.push(Object.assign({},ps,{_mode:'text',_dirty:false}));
  S.activePadId=id;S.tab='scratchpad';S.activeTabId=null;render();
};
window.switchPad=function(id){S.activePadId=id;render();};
window.closePad=function(id){
  S.padTabs=S.padTabs.filter(function(t){return t.id!==id;});
  if(S.activePadId===id){S.activePadId=S.padTabs.length?S.padTabs[S.padTabs.length-1].id:null;}
  render();
};
window.savePad=async function(){
  var act=S.padTabs.find(function(t){return t.id===S.activePadId;});
  if(!act||!S.user)return;
  try{
    await sbU('ts_scratchpads',[{id:act.id,title:act.title||'Untitled',content:act.content||'',drawing:act.drawing||[],saved_at:new Date().toISOString()}]);
    act._dirty=false;
    var ex=S.pads.findIndex(function(p){return p.id===act.id;});
    if(ex>=0)S.pads[ex]=Object.assign({},S.pads[ex],{title:act.title,content:act.content,drawing:act.drawing});
    else S.pads.push({id:act.id,title:act.title||'Untitled',content:act.content||'',drawing:act.drawing||[]});
    toast('Saved','ok');render();
  }catch(e){toast('Save failed','warn');}
};
window.clearPad=function(){
  var act=S.padTabs.find(function(t){return t.id===S.activePadId;});if(!act)return;
  act.content='';act.drawing=[];act._dirty=true;
  var cv=document.getElementById('pad-canvas');
  if(cv){var ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);}
  render();
};
window.deletePad=async function(id){
  if(!confirm('Delete this scratchpad?'))return;
  try{await sbDel('ts_scratchpads',id);}catch(e){}
  S.pads=S.pads.filter(function(p){return p.id!==id;});
  S.padTabs=S.padTabs.filter(function(t){return t.id!==id;});
  if(S.activePadId===id){S.activePadId=S.padTabs.length?S.padTabs[S.padTabs.length-1].id:null;}
  render();
};
window.updatePadTitle=function(v){
  var act=S.padTabs.find(function(t){return t.id===S.activePadId;});if(!act)return;
  act.title=v;act._dirty=true;
  window._broadcastPadUpdate&&window._broadcastPadUpdate(act);
  window._padAutoSave&&window._padAutoSave(act);
};
window.padUpdateContent=function(v){
  var act=S.padTabs.find(function(t){return t.id===S.activePadId;});if(!act)return;
  act.content=v;act._dirty=true;
  clearTimeout(_padDebounce);
  _padDebounce=setTimeout(function(){window._broadcastPadUpdate&&window._broadcastPadUpdate(act);window._padAutoSave&&window._padAutoSave(act);},600);
};
window._padAutoSave=function(act){
  if(!act||!S.user)return;
  clearTimeout(act._saveTimer);
  act._saveTimer=setTimeout(async function(){
    try{
      await sbU('ts_scratchpads',[{id:act.id,title:act.title||'Untitled',content:act.content||'',drawing:act.drawing||[],saved_at:new Date().toISOString()}]);
      act._dirty=false;
      var ex=S.pads.findIndex(function(p){return p.id===act.id;});
      if(ex>=0)S.pads[ex]=Object.assign({},S.pads[ex],{title:act.title,content:act.content,drawing:act.drawing});
      else S.pads.push({id:act.id,title:act.title||'Untitled',content:act.content||'',drawing:act.drawing||[]});
      safeRender();
    }catch(e){}
  },1500);
};
window._broadcastPadUpdate=function(act){
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'pad_update',payload:{id:act.id,title:act.title,content:act.content}},ref:String(_rtRef)}));}
};
window._broadcastPadStroke=function(id,stroke){
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'pad_stroke',payload:{id:id,stroke:stroke}},ref:String(_rtRef)}));}
};
window.addLeg=()=>{
  const legs=S.charter.legs;
  const prev=legs.length>0?legs[legs.length-1]:{};
  legs.push({from:prev.to||'NZQN',to:'NZQN',acId:prev.acId||'',pax:prev.pax||1,waitHrs:0,note:''});
  render();
};
window.removeLeg=i=>{S.charter.legs.splice(i,1);render();};
window.setLeg=function(i,k,v){
  S.charter.legs[i][k]=v;
  if(k==='acId') S.charter.legs.forEach(function(leg){leg.acId=v;});
  render();
};

// ── Debounced search ──
let _searchTimer=null;
window.debounceSearch=v=>{clearTimeout(_searchTimer);_searchTimer=setTimeout(()=>{S.savedSearch=v;render();// Re-focus the input and restore cursor
const el=document.getElementById('savedSearchInput');if(el){const pos=el.value.length;el.focus();try{el.setSelectionRange(pos,pos);}catch{}}},300);};


// ── ETD season-based options ──
function etdOptions(dateStr){
  const d=new Date(dateStr||Date.now());const m=d.getMonth()+1;
  return (m>=10||m<=4)?['08:00','10:30','13:00','14:30','15:30']:['08:00','09:30','12:00','15:30'];
}
function etdSelect(val,dateStr,dispatchKey){
  var opts=etdOptions(dateStr);
  var stateObj=dispatchKey==='dispatch'?S.dispatch:(dispatchKey==='form'?S.form:null);
  var isCustom=!!(stateObj&&stateObj.etdCustom)||(!!val&&opts.indexOf(val)<0);
  var h='<div style="display:flex;flex-wrap:wrap;gap:5px">';
  opts.forEach(function(t){
    var sel=val===t&&!isCustom;
    h+='<button onclick="event.stopPropagation();window.handleEtdSel(\''+t+'\',\''+dispatchKey+'\')" style="padding:4px 10px;border-radius:20px;border:1.5px solid '+(sel?'var(--acc)':'var(--border2)')+';background:'+(sel?'rgba(124,58,237,.18)':'transparent')+';color:'+(sel?'var(--acc)':'var(--text2)')+';font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;box-shadow:'+(sel?'0 0 0 2px rgba(124,58,237,.18)':'none')+'">'+t+'</button>';
  });
  var otherSel=isCustom;
  h+='<button onclick="event.stopPropagation();window.handleEtdSel(\'other\',\''+dispatchKey+'\')" style="padding:4px 10px;border-radius:20px;border:1.5px solid '+(otherSel?'var(--acc)':'var(--border2)')+';background:'+(otherSel?'rgba(124,58,237,.18)':'transparent')+';color:'+(otherSel?'var(--acc)':'var(--text2)')+';font-size:12px;font-weight:700;cursor:pointer;box-shadow:'+(otherSel?'0 0 0 2px rgba(124,58,237,.18)':'none')+'">Other</button>';
  h+='</div>';
  if(isCustom){
    h+='<input type="text" class="fi" id="etd_custom_'+dispatchKey+'" placeholder="e.g. 15:30" style="margin-top:6px;font-size:13px;font-weight:600" value="'+(val&&opts.indexOf(val)<0?val:'')+'" oninput="window.handleEtdCustom(this,\''+dispatchKey+'\')">';
  }
  return h;
}
window.handleEtdSel=function(v,key){
  const obj=key==='dispatch'?S.dispatch:(key==='form'?S.form:null);
  if(v==='other'){
    if(obj){obj.etdCustom=true;obj.etd='';}
  } else {
    // A 1530 departure that isn't already Milford → offer to set it up as a flyback (return leg).
    if(key==='form'&&v==='15:30'&&obj&&typeof _isMilford==='function'&&!_isMilford(obj.dep)){
      if(confirm('Flybacks? Selecting yes will prefill fuel and departure points.')){
        obj.dep='NZMF';obj.dest='NZQN';S._lsOther_dep=false;S._lsOther_dest=false;
        if(obj.ac){var _mf=_milfordFuelKg(obj.ac);if(_mf!=null)obj.fuel=String(_mf);}
      }
    }
    if(obj){obj.etd=v;obj.etdCustom=false;}
  }
  if(key==='dispatch'){autoSaveDispatch();render();}
  else if(key==='form'){autoSaveLS();safeRender();}
};
window.handleEtdCustom=function(inp,key){
  const obj=key==='dispatch'?S.dispatch:(key==='form'?S.form:null);
  if(obj){obj.etd=inp.value;if(key==='dispatch')autoSaveDispatch();if(key==='form')autoSaveLS();}
};

// ── Route Map (Leaflet) ──
var _maps={};
var _mapTimers={};
function renderRouteMap(elId,legs){
  // Debounce: rapid re-renders (from RT broadcasts) cancel and restart the timer
  // so the map only initialises once rendering has settled.
  if(_mapTimers[elId])clearTimeout(_mapTimers[elId]);
  _mapTimers[elId]=setTimeout(function(){
    delete _mapTimers[elId];
    var el=document.getElementById(elId);if(!el)return;
    if(_maps[elId]){try{_maps[elId].remove();}catch(e){}delete _maps[elId];}
    var points=[];
    legs.forEach(function(l){
      var A=APT_COORDS[l.from],B=APT_COORDS[l.to];
      if(A&&!points.find(function(p){return p[0]===A.lat&&p[1]===A.lng;}))points.push([A.lat,A.lng,l.from]);
      if(B&&!points.find(function(p){return p[0]===B.lat&&p[1]===B.lng;}))points.push([B.lat,B.lng,l.to]);
    });
    if(points.length<2)return;
    if(typeof L==='undefined')return;
    var map=L.map(elId,{zoomControl:true,attributionControl:false});
    _maps[elId]=map;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:18}).addTo(map);
    legs.forEach(function(l){
      var A=APT_COORDS[l.from],B=APT_COORDS[l.to];
      if(A&&B)L.polyline([[A.lat,A.lng],[B.lat,B.lng]],{color:'#7B9EC6',weight:2.5,dashArray:'6 4',opacity:.85}).addTo(map);
    });
    var icon=L.divIcon({className:'',html:'<div style="width:10px;height:10px;border-radius:50%;background:#7B9EC6;border:2px solid #fff;margin:-5px 0 0 -5px"></div>',iconSize:[0,0]});
    points.forEach(function(pt){
      L.marker([pt[0],pt[1]],{icon:icon}).bindTooltip((APTS[pt[2]]||pt[2])+' ('+pt[2]+')',{permanent:false,direction:'top'}).addTo(map);
    });
    map.fitBounds(L.latLngBounds(points.map(function(p){return[p[0],p[1]];})),{padding:[30,30]});
  },600);
}

// ── Google Drive PDF Upload ──
window.uploadToDrive=async function(sheet,preToken){
  if(!S.gdriveClientId){alert('No Google OAuth Client ID set in Admin.');return;}
  S.driveStatus='uploading';render();
  // Use pre-fetched token or request a new one
  var token=preToken||null;
  if(!token){
    try{
      token=await new Promise(function(resolve,reject){
        function init(){
          google.accounts.oauth2.initTokenClient({
            client_id:S.gdriveClientId,
            scope:'https://www.googleapis.com/auth/drive',
            callback:function(r){if(r.error)reject(new Error(r.error));else resolve(r.access_token);}
          }).requestAccessToken();
        }
        if(window.google&&window.google.accounts&&window.google.accounts.oauth2){init();}
        else{var s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=init;s.onerror=function(e){reject(new Error('Failed to load Google sign-in library'));};document.head.appendChild(s);}
      });
    }catch(e){S.driveStatus='error:'+e.message;render();alert('Google sign-in failed: '+e.message);return;}
  }

  // Build the loadsheet HTML content
  var htmlContent=generatePrintHTML(sheet);

  // Resolve folder path: LOADSHEETS / YEAR / MONTH
  var date=new Date(sheet.savedAt);
  var year=String(date.getFullYear());
  var month=String(date.getMonth()+1).padStart(2,'0')+'-'+date.toLocaleString('en-NZ',{month:'long'});
  var explicitId=(S.gdriveFolderId||'').trim();
  var rootId=explicitId||await ensureDriveFolder(S.gdriveFolder||'Loadsheets','root',token);
  var yearId=await ensureDriveFolder(year,rootId,token);
  var monthId=await ensureDriveFolder(month,yearId,token);
  console.log('Uploading to folder IDs — root:',rootId,'year:',yearId,'month:',monthId);

  // Build filename
  var f=sheet.form;
  var fname='Loadsheet_'+(f.ac||'AC')+'_'+(f.dep||'')+'-'+(f.dest||'')+'_'+(f.date||'').replace(/-/g,'')+'_'+((f.pic||'PIC').split(' ').slice(-1)[0])+'.html';

  // Upload using multipart — build raw body to avoid FormData encoding issues
  var boundary='-------loadsheet_boundary_'+Date.now();
  var meta=JSON.stringify({name:fname,parents:[monthId]});
  // Encode HTML as UTF-8 bytes via TextEncoder to avoid corruption
  var encoder=new TextEncoder();
  var htmlBytes=encoder.encode(htmlContent);
  var CRLF='\r\n';
  var metaPart='--'+boundary+CRLF+'Content-Type: application/json; charset=UTF-8'+CRLF+CRLF+meta+CRLF+'--'+boundary+CRLF+'Content-Type: text/html; charset=UTF-8'+CRLF+CRLF;
  var endPart=CRLF+'--'+boundary+'--';
  var metaBytes=encoder.encode(metaPart);
  var endBytes=encoder.encode(endPart);
  // Combine into one Uint8Array
  var body=new Uint8Array(metaBytes.length+htmlBytes.length+endBytes.length);
  body.set(metaBytes,0);body.set(htmlBytes,metaBytes.length);body.set(endBytes,metaBytes.length+htmlBytes.length);

  var r=await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true',
    {method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'multipart/related; boundary='+boundary},body:body}
  );
  var respText=await r.text();
  console.log('Drive response:',r.status,respText.slice(0,200));
  if(r.ok){
    var result=JSON.parse(respText);
    var fileLink='https://drive.google.com/file/d/'+result.id+'/view';
    var folderLink='https://drive.google.com/drive/folders/'+monthId;
    S.driveStatus='ok:'+fname;S.driveLastLink=fileLink;S.driveLastFile=fname;S.driveLastFolder=folderLink;
    if(typeof toast==='function')toast('Saved to Drive: '+fname,'ok');
    // Mark as uploaded in Supabase. Set the local flag first, then a FULL-ROW upsert via sbU so the
    // archive flag rides the offline write-queue (retried until it lands) — a fire-and-forget PATCH
    // could lose the race with a page refresh and bounce the sheet back to Signed.
    if(sheet&&sheet.id){
      if(window._lsStickyMark)window._lsStickyMark(sheet.id,'uploaded',true);
      auditLog('loadsheet_upload',{id:sheet.id,file:fname});
      var _sh=S.saved.find(function(s){return s.id===sheet.id;});
      if(_sh){_sh.driveUploaded=true;_sh.uploadedBy=(S.user&&S.user.name)||'';_sh.uploadedAt=new Date().toISOString();lsSet('ts_loadsheets_cache',S.saved);}
      var _ar=_sh||sheet;
      await sbU('ts_loadsheets',[_lsWritePayload(sheet.id,_ar.form,_ar.savedAt||new Date().toISOString(),_ar.status||'complete',true)]);
    }
    render();
    // No popup - status banner handles it
  }else{
    S.driveStatus='error:'+r.status;if(typeof toast==='function')toast('Drive upload failed ('+r.status+'): '+respText.slice(0,120),'err');render();
    // No popup - status banner shows error
  }
};
window.ensureDriveFolder=async function(name,parentId,token){
  var parent=(parentId&&parentId!=='null'&&parentId!=='')?parentId:'root';
  // supportsAllDrives=true allows access to shared drives
  var q="mimeType='application/vnd.google-apps.folder' and name='"+name+"' and '"+parent+"' in parents and trashed=false";
  var res=await fetch('https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true',{headers:{Authorization:'Bearer '+token}});
  var data=await res.json();
  if(data.files&&data.files.length){
    console.log('Found folder "'+name+'" id:',data.files[0].id);
    return data.files[0].id;
  }
  // Create it inside the parent
  var body={name:name,mimeType:'application/vnd.google-apps.folder',parents:[parent]};
  var cr=await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
  var fj=await cr.json();
  console.log('Created folder "'+name+'" id:',fj.id,'in parent:',parent);
  return fj.id;
};
function generatePrintHTML(sheet){
  var f=sheet.form;
  var a=S.aircraft[f.ac]||{seats:[],cargo:[],doc:'',type:'',burnDef:'',burnDefUnit:'kg',gndBurn:0,fuelArm:0,ew:0,em:0,cogMin:0,cogMax:0,mtow:0,mlw:0};
  var r=calcFormWB(f);
  var acCol=AC_COL[f.ac]||'#1e6b8c';
  function hexRgba(h,op){var x=parseInt(h.slice(1),16);return 'rgba('+((x>>16)&255)+','+((x>>8)&255)+','+(x&255)+','+op+')';}
  var acFaint=hexRgba(acCol,0.09);
  var acLight=hexRgba(acCol,0.18);

  var towOk=r&&r.towOk,lwOk=r&&r.lwOk,cogOk=r&&r.cogOk;
  var allOk=towOk&&lwOk&&cogOk;
  var statusBg=allOk?'#f0fdf4':'#fef2f2';
  var statusBorder=allOk?'#16a34a':'#dc2626';
  var statusColor=allOk?'#15803d':'#b91c1c';
  var status=allOk?'✓  ALL LIMITS WITHIN RANGE':'⚠  ONE OR MORE LIMITS EXCEEDED';

  // Fuel calcs
  var fuelKgV=parseFloat(f.fuel)||0;
  var burnKgV=r?r.burnKg:0;
  var _gndBurnV=r?r.gndBurn:(parseFloat(f.gndBurn!=null?f.gndBurn:a.gndBurn)||0);
  var remKg=fuelKgV-_gndBurnV-burnKgV;
  var fuelU=fuelUnit(f.ac);
  var fuelDisplay=f.ac?fromKg(fuelKgV,f.ac).toFixed(1):fuelKgV;
  var remDisplay=f.ac?fromKg(Math.max(0,remKg),f.ac).toFixed(1):Math.max(0,remKg).toFixed(1);

  // Shared inline styles
  var TD='border:1px solid #e2e8f0;padding:5px 8px;font-family:Arial,sans-serif;font-size:11px;vertical-align:top;';
  var TH='border:1px solid '+acCol+';padding:5px 8px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.05em;text-align:left;background:'+acCol+';color:#fff;';
  var THSPAN='border:1px solid '+acCol+';padding:5px 8px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:.05em;text-align:left;background:'+acCol+';color:#fff;';

  function thRow(label,span){return '<tr><th colspan="'+(span||2)+'" style="'+THSPAN+'">'+label.toUpperCase()+'</th></tr>';}

  // Seat rows
  var seatRows='';
  a.seats.forEach(function(s,i){
    var n=(f.names&&f.names[i])||'';
    var w=(f.seats&&f.seats[i])||'';
    var b=(f.bags&&f.bags[i])||'';
    if(n||parseFloat(w)){
      var m=((parseFloat(w)||0)+(parseFloat(b)||0))*s.arm;
      var _inf=(f.infantNames&&f.infantNames[i])||'';
      var _dispN=esc(n)+(_inf?' + '+esc(_inf):'');
      var isPIC=(i===0);
      var rowBg=isPIC?acFaint:'transparent';
      seatRows+='<tr style="background:'+rowBg+'">'
        +'<td style="'+TD+'font-weight:'+(isPIC?'700':'400')+';color:'+(isPIC?acCol:'#1a1a1a')+'">'+s.lbl+'</td>'
        +'<td style="'+TD+'">'+_dispN+'</td>'
        +'<td style="'+TD+'text-align:right">'+( w||'—')+'</td>'
        +'<td style="'+TD+'text-align:right">'+(b||'—')+'</td>'
        +'<td style="'+TD+'text-align:right">'+m.toFixed(0)+'</td>'
        +'</tr>';
    }
  });

  // W&B rows
  var wbRows='';
  if(r){
    var items=[
      ['Empty Weight',a.ew,false],['Crew',r.crewW,false],['Passengers',r.paxW,false],
      ['Cargo / Baggage',r.cargoW,false],['Zero Fuel Weight',r.zfw,true],
      ['+ Fuel',r.fuelW,false],['Ramp Weight',r.rampW,true],
      ['− Ground Burn',r.gndBurn,false],['Takeoff Weight',r.tow,true],
      ['− Flight Burn',r.burnKg,false],['Landing Weight',r.lw,true]
    ];
    items.forEach(function(it){
      var isTotal=it[2];
      var bg=isTotal?acFaint:'transparent';
      var fw=isTotal?'700':'400';
      var bl=isTotal?'border-left:3px solid '+acCol+';':'';
      wbRows+='<tr style="background:'+bg+'">'
        +'<td style="'+TD+bl+'font-weight:'+fw+'">'+it[0]+'</td>'
        +'<td style="'+TD+'text-align:right;font-weight:'+fw+'">'+it[1].toFixed(1)+' kg</td>'
        +'</tr>';
    });
  }

  // Cargo rows
  var cargoRows='';
  if(a.cargo&&a.cargo.length){
    a.cargo.forEach(function(zn,i){
      var w=(f.cargo&&f.cargo[i])||'';
      var m=((parseFloat(w)||0)*zn.arm).toFixed(0);
      if(w)cargoRows+='<tr><td style="'+TD+'">'+zn.lbl+'</td><td style="'+TD+'text-align:right">'+w+' kg</td><td style="'+TD+'text-align:right">'+m+'</td></tr>';
    });
  }

  // Limit boxes
  function limitBox(lbl,val,unit,ok,maxVal){
    var bc=ok?'#16a34a':'#dc2626';var vc=ok?'#15803d':'#b91c1c';
    return '<td style="border:2px solid '+bc+';border-radius:6px;padding:10px;text-align:center;width:33%;font-family:Arial,sans-serif">'
      +'<div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">'+lbl+'</div>'
      +'<div style="font-size:20px;font-weight:800;color:'+vc+'">'+val+'</div>'
      +'<div style="font-size:9px;color:#888;margin-top:2px">'+unit+'</div>'
      +'</td>';
  }

  // CoG envelope graph — reuse the on-screen SVG, but swap the CSS variables (which don't exist in the
  // standalone print/Drive-upload document) for concrete print colours.
  var cogEnvHTML='';
  if(r&&typeof _wbEnvelopeSVG==='function'){
    var _env=_wbEnvelopeSVG(f.ac,r);
    if(_env){
      _env=_env.replace(/var\(--border2\)/g,'#cbd5e1').replace(/var\(--text3\)/g,'#555').replace(/var\(--text2\)/g,'#333').replace(/var\(--card\)/g,'#ffffff');
      cogEnvHTML='<div style="margin-bottom:14px;font-family:Arial,sans-serif;page-break-inside:avoid">'
        +'<div style="'+THSPAN+'">CENTRE OF GRAVITY ENVELOPE</div>'
        +'<div style="border:1px solid #e2e8f0;border-top:none;padding:12px 10px">'+_env+'</div>'
        +'</div>';
    }
  }

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+esc((f.ac||'')+' Loadsheet')+'</title></head><body style="font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;margin:0;padding:20px;background:#fff">'

    // Header
    +'<div style="border-left:5px solid '+acCol+';padding:6px 14px;margin-bottom:14px">'
    +'<h1 style="margin:0;font-size:17px;font-weight:800;color:#111;font-family:Arial,sans-serif">TRUE SOUTH FLIGHTS — LOADSHEET</h1>'
    +'<div style="font-size:10px;color:#666;margin-top:3px;font-family:Arial,sans-serif">'+a.doc+' &nbsp;|&nbsp; Generated '+new Date().toLocaleString('en-NZ')+'</div>'
    +'</div>'

    // Status
    +'<div style="padding:10px 14px;border:2px solid '+statusBorder+';border-radius:6px;background:'+statusBg+';color:'+statusColor+';font-weight:800;font-size:13px;margin-bottom:14px;font-family:Arial,sans-serif;letter-spacing:.03em">'+status+'</div>'

    // Limit boxes
    +(r?'<table style="width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:14px"><tr>'
      +limitBox('Takeoff Weight',r.tow.toFixed(1)+' kg','max '+a.mtow+' kg',towOk)
      +limitBox('Landing Weight',r.lw.toFixed(1)+' kg','max '+a.mlw+' kg',lwOk)
      +limitBox('Centre of Gravity',r.towCog.toFixed(2)+'"',a.cogMin+'–'+a.cogMax+'"',cogOk)
      +'</tr></table>':'')

    // Two-col: Flight Details + W&B
    +'<table style="width:100%;border-collapse:collapse;margin-bottom:14px"><tr style="vertical-align:top">'
    +'<td style="width:50%;padding-right:8px;border:none">'
    +'<table style="width:100%;border-collapse:collapse">'
    +thRow('Flight Details',2)
    +'<tr><td style="'+TD+'color:#666;width:40%">Aircraft</td><td style="'+TD+'"><strong style="color:'+acCol+'">'+f.ac.replace('ZK-','')+' </strong>— '+a.type+'</td></tr>'
    +'<tr><td style="'+TD+'color:#666">PIC</td><td style="'+TD+'">'+esc(f.pic)+'</td></tr>'
    +'<tr><td style="'+TD+'color:#666">Co-Pilot</td><td style="'+TD+'">'+esc(f.coPilot||'—')+'</td></tr>'
    +(f.coPilot?'<tr><td colspan="2" style="'+TD+'font-size:10px;color:#888;font-style:italic">A staff member in the co-pilot seat does not automatically qualify as acting crew.</td></tr>':'')
    +'<tr><td style="'+TD+'color:#666">Date</td><td style="'+TD+'">'+f.date+'</td></tr>'
    +'<tr><td style="'+TD+'color:#666">ETD</td><td style="'+TD+'">'+(f.etd||'—')+'</td></tr>'
    +'<tr><td style="'+TD+'color:#666">From</td><td style="'+TD+'">'+(APTS[f.dep]||f.dep)+' ('+f.dep+')</td></tr>'
    +'<tr><td style="'+TD+'color:#666">To</td><td style="'+TD+'">'+(APTS[f.dest]||f.dest)+' ('+f.dest+')</td></tr>'
    +'</table></td>'
    +'<td style="width:50%;padding-left:8px;border:none">'
    +'<table style="width:100%;border-collapse:collapse">'
    +thRow('Weight & Balance',2)
    +wbRows
    +'</table></td></tr></table>'

    // CoG envelope graph
    +cogEnvHTML

    // Occupants
    +'<table style="width:100%;border-collapse:collapse;margin-bottom:14px">'
    +thRow('Occupants',5)
    +'<tr>'
    +'<th style="'+TH+'">Seat</th><th style="'+TH+'">Passenger</th>'
    +'<th style="'+TH+'text-align:right">Weight (kg)</th>'
    +'<th style="'+TH+'text-align:right">Bag (kg)</th>'
    +'<th style="'+TH+'text-align:right">Moment</th>'
    +'</tr>'
    +seatRows
    +'</table>'

    // Cargo
    +(cargoRows?'<table style="width:100%;border-collapse:collapse;margin-bottom:14px">'+thRow('Cargo',3)
      +'<tr><th style="'+TH+'">Zone</th><th style="'+TH+'text-align:right">Weight (kg)</th><th style="'+TH+'text-align:right">Moment</th></tr>'
      +cargoRows+'</table>':'')

    // Fuel
    +'<table style="width:100%;border-collapse:collapse;margin-bottom:14px">'
    +thRow('Fuel',2)
    +'<tr><td style="'+TD+'color:#666">Fuel at departure</td><td style="'+TD+'text-align:right">'+fuelKgV.toFixed(1)+' kg ('+fuelDisplay+' '+fuelU+')</td></tr>'
    +'<tr><td style="'+TD+'color:#666">Ground burn</td><td style="'+TD+'text-align:right">'+_gndBurnV+' kg</td></tr>'
    +'<tr><td style="'+TD+'color:#666">Flight burn</td><td style="'+TD+'text-align:right">'+(f.burnOff||a.burnDef)+' '+(a.burnDefUnit||'kg')+'</td></tr>'
    +'<tr style="background:'+acFaint+'"><td style="'+TD+'border-left:3px solid '+acCol+';font-weight:700">Fuel at destination</td><td style="'+TD+'text-align:right;font-weight:700">'+remDisplay+' '+fuelU+'</td></tr>'
    +'</table>'

    // Certification
    +'<table style="width:100%;border-collapse:collapse;margin-bottom:8px">'
    +thRow('PIC Certification',2)
    +'<tr><td colspan="2" style="'+TD+'font-style:italic;color:#444">I hereby certify that the particulars recorded on the above load sheet are correct'+(a.type&&a.type.includes('208')?' and Part 125 security measures have been followed':'')+'.</td></tr>'
    +(f.sig?'<tr><td style="'+TD+'color:#666;width:30%">Signature</td><td style="'+TD+'"><img src="'+f.sig+'" style="max-height:55px;border:1px solid #ccc;border-radius:3px;display:block;margin:4px 0"></td></tr>':'<tr><td style="'+TD+'color:#666">Signature</td><td style="'+TD+'padding:22px 8px">___________________________</td></tr>')
    +'<tr><td style="'+TD+'color:#666">Name</td><td style="'+TD+'">'+esc(f.pic)+'</td></tr>'
    +'<tr><td style="'+TD+'color:#666">Date</td><td style="'+TD+'">'+f.date+'</td></tr>'
    +'</table>'
    +'</body></html>';
}

function setupSig(){
  const c=document.getElementById('sigCanvas');if(!c||!S.form)return;
  if(S.form.sig){const img=new Image();img.onload=()=>c.getContext('2d').drawImage(img,0,0,c.width,c.height);img.src=S.form.sig;}
  let drawing=false;
  const pos=e=>{const r=c.getBoundingClientRect(),s=e.touches?e.touches[0]:e,sx=c.width/r.width,sy=c.height/r.height;return{x:(s.clientX-r.left)*sx,y:(s.clientY-r.top)*sy};};
  c.onmousedown=c.ontouchstart=e=>{e.preventDefault();drawing=true;const p=pos(e);c.getContext('2d').beginPath();c.getContext('2d').moveTo(p.x,p.y);};
  c.onmousemove=c.ontouchmove=e=>{if(!drawing)return;e.preventDefault();const ctx=c.getContext('2d'),p=pos(e);ctx.lineWidth=2.5;ctx.lineCap='round';ctx.strokeStyle='#1e293b';ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y);};
  c.onmouseup=c.onmouseleave=c.ontouchend=()=>{if(drawing){drawing=false;var _had=!!S.form.sig;S.form.sig=c.toDataURL();
    // First stroke → re-render so "Save Draft" swaps to "Submit" immediately (the drawn strokes are
    // preserved via S.form.sig and redrawn by setupSig). Later strokes don't re-render (no flicker).
    if(!_had)render();}};
}

// ── Admin handlers ──
window.toggleEndorse=function(type,checked){
  S.admin.crewDraftEndorse=S.admin.crewDraftEndorse||[];
  if(checked&&!S.admin.crewDraftEndorse.includes(type)) S.admin.crewDraftEndorse.push(type);
  else if(!checked) S.admin.crewDraftEndorse=S.admin.crewDraftEndorse.filter(e=>e!==type);
};
window.openPersonModal=async function(crewId,userId){
  crewId=(crewId&&crewId!=='null')?crewId:null;
  userId=(userId&&userId!=='null')?userId:null;
  // Fetch fresh data from Supabase before populating modal
  await reloadTable('ts_crew');
  await reloadTable('ts_users');
  const cr=crewId?S.crew.find(function(x){return x.id===crewId;}):null;
  const u=userId?S.users.find(function(x){return x.id===userId;}):null;
  S.admin.personModal={
    crewId:crewId||null,
    userId:userId||null,
    tab:'profile',
    draft:{
      n:cr?cr.n:(u?u.name:''),
      code:cr?cr.code||'':'',
      w:cr?(cr.w||u?.weight||''):(u?u.weight||'':''),
      dlNum:cr?cr.dlNum||'':'',
      caaNum:cr?cr.caaNum||'':'',
      medExpiry:cr?cr.medExpiry||'':'',
      ocaDue:cr?cr.ocaDue||'':'',
      firstAid:cr?cr.firstAid||'':'',
      avsecExpiry:cr?cr.avsecExpiry||'':'',
      dob:cr?cr.dob||'':'',
      typeRatings:cr?JSON.parse(JSON.stringify(cr.typeRatings||[])):[],
      endorse:cr?JSON.parse(JSON.stringify(cr.endorse||[])):[],
      photo:cr?cr.photo||'':'',
      email:u?u.email||'':'',
      role:u?u.role||'desk':'desk',
      isPilot:u?!!u.isPilot:false,
      inactive:u?!!u.inactive:false,
      password:'',
    }
  };
  S.admin.err='';
  render();
};

window.personPhotoUpload=function(input){
  const file=input.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=function(e){
    const img=new Image();
    img.onload=function(){
      const canvas=document.createElement('canvas');
      const MAX=200;
      let w=img.width,h=img.height;
      if(w>h){if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}}else{if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}}
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      S.admin.personModal.draft.photo=canvas.toDataURL('image/jpeg',0.75);
      render();
    };
    img.src=e.target.result;
  };
  r.readAsDataURL(file);
};

window.savePerson=async function(){
  const m=S.admin.personModal;if(!m)return;
  const d=m.draft;
  const name=(d.n||'').trim();
  // Managing user accounts/roles requires admin_users (admin/superadmin always have it);
  // self-profile edits remain allowed below via userId===S.user.id.
  const isAdmin=S.user?.role==='admin'||S.user?.role==='superadmin'||S.user?.superAdmin||(typeof hasRolePerm==='function'&&hasRolePerm('admin_users'));
  // Validate
  if(!name&&!d.email){S.admin.err='Name is required.';render();return;}
  const finalName=name||(d.email?d.email.split('@')[0]:'');
  // Check duplicate email
  if(d.email){
    const dupUser=S.users.find(function(x){return x.email.toLowerCase()===d.email.toLowerCase()&&x.id!==m.userId;});
    if(dupUser){S.admin.err='That email is already used by another account.';render();return;}
  }
  // Crew code must be unique (case-insensitive). It keys the roster grid and leave-day
  // counts, so two crew sharing a code would cross-contaminate each other's roster/payroll.
  if((d.code||'').trim()){
    const _code=String(d.code).trim().toUpperCase();
    const _dupCode=(S.crew||[]).find(function(cr){return cr.id!==m.crewId&&String(cr.code||'').trim().toUpperCase()===_code;});
    if(_dupCode){S.admin.err='Crew code "'+_code+'" is already used by '+(_dupCode.n||'another crew member')+'. Codes must be unique.';render();return;}
  }
  // Creating a NEW login account? Validate the password BEFORE writing the crew record,
  // so a missing/mismatched password can't leave a half-saved person behind.
  if(!m.userId&&d.email&&isAdmin){
    const _confEl=document.getElementById('pm_confpw');
    if(!d.password){S.admin.err='Password is required for a new login account.';render();return;}
    if(_confEl&&_confEl.value&&_confEl.value!==d.password){S.admin.err='Passwords do not match.';render();return;}
  }

  // ── Save crew record ──
  // Crew weight/endorsements drive W&B and PIC eligibility — only admins, admin_crew, or the
  // person editing their OWN profile may write the crew record (server RLS also gates ts_crew).
  const _canEditCrew=isAdmin||(typeof hasRolePerm==='function'&&hasRolePerm('admin_crew'))||(m.userId&&m.userId===S.user?.id);
  let crewId=m.crewId;
  if(_canEditCrew&&(crewId||finalName)){
    crewId=crewId||('c_'+Date.now());
    const crewRec={id:crewId,n:finalName,w:parseFloat(d.w)||0,endorse:d.endorse||[],
      code:d.code||'',dlNum:d.dlNum||'',caaNum:d.caaNum||'',
      medExpiry:d.medExpiry||'',ocaDue:d.ocaDue||'',firstAid:d.firstAid||'',
      avsecExpiry:d.avsecExpiry||'',photo:d.photo||''};
    const existIdx=S.crew.findIndex(function(cr){return cr.id===crewId;});
    if(existIdx>=0) S.crew[existIdx]=crewRec;else S.crew.push(crewRec);
    lsSet('ts_crew_cache',S.crew);
    if(d.photo) lsSet('ts_crew_photo_'+crewId,d.photo);
    {
      const fullR=await sbU('ts_crew',[{id:crewId,name:finalName,weight:parseFloat(d.w)||null,
        endorsements:JSON.stringify(d.endorse||[]),code:d.code||'',dl_num:d.dlNum||'',
        caa_license:d.caaNum||'',medical_expiry:d.medExpiry||null,oca_due:d.ocaDue||null,
        first_aid:d.firstAid||null,avsec_expiry:d.avsecExpiry||null,
        dob:d.dob||null,type_ratings:JSON.stringify(d.typeRatings||[]),photo:d.photo||''}]);
      if(!fullR){
        // Full upsert failed (likely missing columns) — retry with minimal safe payload
        const minR=await sbU('ts_crew',[{id:crewId,name:finalName,weight:parseFloat(d.w)||null,
          endorsements:JSON.stringify(d.endorse||[]),code:d.code||'',dl_num:d.dlNum||'',
          caa_license:d.caaNum||'',medical_expiry:d.medExpiry||null,oca_due:d.ocaDue||null}]);
        if(!minR) toast('Warning: profile may not have saved to server — check connection','warn');
      }
    }
  }

  // ── Save user record (only if email present OR already has userId) ──
  let userId=m.userId;
  if(userId||(d.email&&(isAdmin||userId===S.user?.id))){
    if(d.email){
      userId=userId||('u_'+Date.now());
      const existing=S.users.find(function(x){return x.id===userId;});
      const userRec=existing
        ?{...existing,name:finalName,email:d.email,role:isAdmin?(d.role||existing.role):existing.role,isPilot:isAdmin?!!d.isPilot:existing?.isPilot||false,inactive:isAdmin?!!d.inactive:existing?.inactive||false,linkedCrew:finalName,weight:parseFloat(d.w)||existing?.weight||0}
        :{id:userId,name:finalName,email:d.email,role:d.role||'desk',isPilot:!!d.isPilot,inactive:!!d.inactive,linkedCrew:finalName,passwordHash:'',weight:parseFloat(d.w)||0};
      if(d.password) userRec.passwordHash=await hashPw(d.password);
      else if(!existing&&!d.password){toast('Password required for new login account','warn');return;}
      const confPwEl=document.getElementById('pm_confpw');
      if(!existing&&confPwEl&&confPwEl.value&&confPwEl.value!==d.password){S.admin.err='Passwords do not match.';render();return;}
      if(userId===S.user?.id){S.user={...S.user,...userRec};sessionStorage.setItem('ts_user',JSON.stringify(S.user));}
      const uIdx=S.users.findIndex(function(x){return x.id===userId;});
      if(uIdx>=0) S.users[uIdx]=userRec;else S.users.push(userRec);
      lsSet('ts_users_cache',S.users);
      // Two-tier upsert: full payload first, minimal fallback if columns missing.
      // sbUserWrite drops an empty hash under Phase A, so editing a user without a new
      // password never wipes their existing one.
      const fullUR=await sbUserWrite([{id:userRec.id,name:userRec.name,email:userRec.email,role:userRec.role,
        linked_crew:userRec.linkedCrew,password_hash:userRec.passwordHash,weight:userRec.weight||0,is_pilot:!!userRec.isPilot,inactive:!!userRec.inactive}]);
      if(!fullUR){
        const minUR=await sbUserWrite([{id:userRec.id,name:userRec.name,email:userRec.email,
          role:userRec.role,linked_crew:userRec.linkedCrew,password_hash:userRec.passwordHash}]);
        if(!minUR) toast('Warning: account may not have saved to server — check connection','warn');
      }
      auditLog('user_save',{name:userRec.name,email:userRec.email,role:userRec.role,inactive:!!userRec.inactive});
    }
  }

  S.admin.personModal=null;S.admin.err='';S.admin.pwMsg=null;
  toast(finalName+' saved','ok');
  // Reload crew + users from Supabase to confirm save and refresh all viewers
  Promise.all([reloadTable('ts_crew'),reloadTable('ts_users')]).then(function(){render();});
  // Broadcast crew update to all connected devices
  if(_rtWs&&_rtWs.readyState===1){
    _rtRef++;
    _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',
      payload:{type:'broadcast',event:'crew_update',payload:{updatedBy:S.user?.id}},
      ref:String(_rtRef)}));
  }
  render();
};

window.deletePerson=async function(crewId,userId){
  if(!confirm('Delete this person? This cannot be undone.'))return;
  var _fail=false;
  if(crewId){S.crew=S.crew.filter(function(cr){return cr.id!==crewId;});lsSet('ts_crew_cache',S.crew);if(!(await sbDel('ts_crew',crewId)))_fail=true;}
  if(userId){S.users=S.users.filter(function(u){return u.id!==userId;});lsSet('ts_users_cache',S.users);if(!(await sbDel('ts_users',userId)))_fail=true;}
  S.admin.personModal=null;S.admin.err='';
  if(_fail)toast('Delete may not have saved to the server — it could reappear on reload. Check connection.','warn');
  render();
};


window.saveAircraftDraft=async()=>{
  const d=S.admin.acDraft;if(!d)return;
  if(!d.ew||!d.mtow||!d.mlw){S.admin.acErr='Empty weight, MTOW and max landing required.';render();return;}
  if(d.cogMin>=d.cogMax){S.admin.acErr='C of G min must be less than max.';render();return;}
  S.aircraft[S.admin.acSel]=dc(d);S.admin.acDraft=null;S.admin.acSaved=true;lsSet('ts_aircraft_cache',S.aircraft);render();
  // W&B setup feeds loadsheet weight & balance — never report "synced" on a failed write.
  const _acR=await sbU('ts_aircraft',[{id:d.id,data:d}]);
  if(_acR===null){S.admin.acSaved=false;toast('Aircraft setup did NOT save to server — check connection and retry','error');render();}
};
window.saveCharterRates=async()=>{
  if(typeof hasRolePerm==='function'&&!hasRolePerm('charter')){toast('Not authorised to edit charter rates.','warn');return;}
  lsSet('ts_charter_rates_cache',S.charterRates);
  lsSet('ts_charter_wait_rate',S.charterWaitRate);
  const rows=Object.entries(S.charterRates).map(([acId,rates])=>({id:acId,acId,rates}));
  const _crR=await sbU('ts_charter_rates',rows);
  if(_crR===null){toast('Charter rates did NOT save to server — check connection and retry','error');return;}
  // Also persist wait rate to Supabase so all devices stay in sync
  await sbU('ts_settings',[{key:'charter_wait_rate',value:String(S.charterWaitRate||150)}]);
};

// ── Pilot weight update ──
window.updateMyWeight=async w=>{
  const wn=parseFloat(w);if(!wn||wn<30||wn>250){alert('Enter a valid weight.');return;}
  const linked=S.user?.linkedCrew;if(!linked){toast('No crew record linked to your account.','err');return;}
  const c=S.crew.find(x=>x.n===linked);if(!c){toast('Crew record not found.','err');return;}
  c.w=wn;render();
  await sbU('ts_crew',[{id:c.id,name:c.n,weight:wn}]);
  toast('Weight updated.','ok');
};

// ── Runtime modules (need S) ──
window.forceUploadAll=async function(){
  if(!S.gdriveClientId){toast('Google Drive Client ID not set — check Admin > Google Drive.','err');return;}
  const pending=S.saved.filter(function(s){return s.status==='complete';});
  if(!pending.length){toast('No signed loadsheets to upload.','info');return;}
  S.uploadProgress='Authorising Drive…';render();
  // Get OAuth token ONCE and reuse for all uploads
  var sharedToken;
  try{
    sharedToken=await new Promise(function(resolve,reject){
      function init(){
        google.accounts.oauth2.initTokenClient({
          client_id:S.gdriveClientId,
          scope:'https://www.googleapis.com/auth/drive',
          callback:function(r){if(r.error)reject(new Error(r.error));else resolve(r.access_token);}
        }).requestAccessToken();
      }
      if(window.google&&window.google.accounts&&window.google.accounts.oauth2){init();}
      else{var s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=init;s.onerror=function(e){reject(new Error('Failed to load Google sign-in library'));};document.head.appendChild(s);}
    });
  }catch(e){S.uploadProgress=null;toast('Google sign-in failed: '+e.message,'err');render();return;}
  S.uploadProgress='Uploading '+pending.length+' loadsheet(s)…';render();
  var ok=0,fail=0;
  for(var _i=0;_i<pending.length;_i++){
    var _sheet=pending[_i];
    try{
      await uploadToDrive(_sheet,sharedToken);
      ok++;
      S.uploadProgress='Uploaded '+ok+'/'+pending.length+'…';render();
    }catch(_e){fail++;console.error('Upload failed:',_sheet.id,_e);}
  }
  lsSet('ts_loadsheets_cache',S.saved);
  S.driveLastUpload=new Date().toLocaleString('en-NZ');lsSet('ts_drive_last_upload',S.driveLastUpload);
  S.uploadProgress=null;
  toast('Drive upload: '+ok+' uploaded'+(fail?' ('+fail+' failed)':''),'ok');render();
};
// (Removed v26.43) The 11:59 PM daily auto-upload sweep + the Settings "Force Upload Now" button.
// Loadsheets still upload on sign / via their own cloud icon; work orders via the WO ☁ Drive button.

// ── MAINTENANCE MODULE ──
// Seed data from spreadsheet import
const MAINT_SEED={"hist":[{"date":"2025-06-10","ZK-SLB":11901.0,"ZK-SLD":7975.7,"ZK-SLQ":7141.3},{"date":"2025-06-12","ZK-SLA":3365.0,"ZK-SLD":7976.9,"ZK-SDB":18312.1},{"date":"2025-06-13","ZK-SLD":7979.3},{"date":"2025-06-14","ZK-SLD":7980.5,"ZK-SLQ":7143.4,"ZK-SDB":18313.3},{"date":"2025-06-15","ZK-SLA":3366.1},{"date":"2025-06-17","ZK-SLA":3368.0,"ZK-SLD":7981.9,"ZK-SLQ":7149.2,"ZK-SDB":18315.5},{"date":"2025-06-18","ZK-SLA":3371.1,"ZK-SLQ":7151.0,"ZK-SDB":18316.5},{"date":"2025-06-21","ZK-SLA":3374.4,"ZK-SLQ":7155.7,"ZK-SDB":18317.6},{"date":"2025-06-23","ZK-SLA":3377.0,"ZK-SLQ":7158.7,"ZK-SDB":18320.6},{"date":"2025-06-24","ZK-SDB":18321.5},{"date":"2025-06-26","ZK-SLD":7982.2},{"date":"2025-06-27","ZK-SLB":11902.2,"ZK-SLD":7984.6,"ZK-SLQ":7160.0},{"date":"2025-06-29","ZK-SLB":11905.0,"ZK-SLD":7985.8,"ZK-SLQ":7162.4,"ZK-SDB":18323.0},{"date":"2025-06-30","ZK-SLA":3380.9,"ZK-SLB":11906.0,"ZK-SLD":7987.1,"ZK-SLQ":7164.3,"ZK-SDB":18324.0},{"date":"2025-07-01","ZK-SLA":3382.0,"ZK-SLB":11907.0,"ZK-SLQ":7167.0,"ZK-SDB":18325.2},{"date":"2025-07-02","ZK-SLA":3382.9,"ZK-SLB":11908.0,"ZK-SLD":7988.3,"ZK-SLQ":7169.0,"ZK-SDB":18326.3},{"date":"2025-07-04","ZK-SLA":3383.9,"ZK-SLB":11909.0,"ZK-SLD":7991.8,"ZK-SLQ":7172.6,"ZK-SDB":18327.4},{"date":"2025-07-05","ZK-SLA":3384.9,"ZK-SLB":11910.9,"ZK-SLD":7993.5,"ZK-SLQ":7174.9},{"date":"2025-07-06","ZK-SLD":7994.6},{"date":"2025-07-07","ZK-SLA":3386.9,"ZK-SLB":1191.3,"ZK-SLD":7996.2,"ZK-SDB":18329.4},{"date":"2025-07-08","ZK-SLA":3389.7,"ZK-SLB":11911.3,"ZK-SLD":7999.4,"ZK-SLQ":7175.9,"ZK-SDB":18330.4},{"date":"2025-07-10","ZK-SLD":8001.3},{"date":"2025-07-11","ZK-SLA":3390.8,"ZK-SLB":11913.8,"ZK-SLD":8002.5},{"date":"2025-07-14","ZK-SLA":3394.2,"ZK-SLB":11916.4,"ZK-SLD":8003.8},{"date":"2025-07-15","ZK-SLD":8005.7},{"date":"2025-07-16","ZK-SLA":3396.2,"ZK-SLB":11919.3,"ZK-SLD":8009.0,"ZK-SDB":18333.2},{"date":"2025-07-17","ZK-SLA":3398.1,"ZK-SLB":11921.3,"ZK-SLD":8010.7,"ZK-SDB":18334.3},{"date":"2025-07-18","ZK-SLD":8014.5},{"date":"2025-07-19","ZK-SLA":3399.3,"ZK-SLB":11923.2,"ZK-SLD":8015.6,"ZK-SDB":18336.5},{"date":"2025-07-20","ZK-SLA":3400.3,"ZK-SLB":11924.5,"ZK-SLD":8018.6,"ZK-SDB":18337.5},{"date":"2025-07-21","ZK-SLA":3401.3,"ZK-SLB":11925.6,"ZK-SLD":8020.4,"ZK-SDB":18338.4},{"date":"2025-07-22","ZK-SLA":3403.2,"ZK-SLB":11926.5,"ZK-SLD":8022.2},{"date":"2025-07-23","ZK-SLA":3404.2,"ZK-SLB":11928.6},{"date":"2025-07-24","ZK-SLA":3405.3,"ZK-SLB":11932.1,"ZK-SLD":8025.6,"ZK-SLQ":7177.2},{"date":"2025-07-25","ZK-SLA":3406.3,"ZK-SLB":11933.2,"ZK-SLD":8027.0,"ZK-SLQ":7178.6},{"date":"2025-07-27","ZK-SLA":3407.3,"ZK-SLD":8029.6,"ZK-SLQ":7180.1},{"date":"2025-07-28","ZK-SLA":3408.3,"ZK-SLB":11934.4,"ZK-SLD":8030.3,"ZK-SLQ":7180.4},{"date":"2025-07-29","ZK-SLB":11935.5},{"date":"2025-07-30","ZK-SLA":3410.3,"ZK-SLB":11936.5,"ZK-SLD":8032.4,"ZK-SDB":18339.3},{"date":"2025-07-31","ZK-SLA":3411.3,"ZK-SLB":11938.3,"ZK-SLD":8034.9,"ZK-SLQ":7180.7},{"date":"2025-08-01","ZK-SLA":3412.4,"ZK-SLB":11940.2,"ZK-SLD":8037.1,"ZK-SDB":18340.2},{"date":"2025-08-02","ZK-SLA":3413.6,"ZK-SLB":11941.4,"ZK-SLD":8038.2,"ZK-SLQ":7183.1,"ZK-SDB":18341.6},{"date":"2025-08-03","ZK-SLB":11944.5,"ZK-SLD":8040.7,"ZK-SLQ":7185.2,"ZK-SDB":18342.6},{"date":"2025-08-04","ZK-SLA":3416.5,"ZK-SLB":11946.4,"ZK-SDB":18343.7},{"date":"2025-08-05","ZK-SLA":3417.5,"ZK-SLB":11947.5,"ZK-SLD":8043.4,"ZK-SLQ":7186.4,"ZK-SDB":18344.7},{"date":"2025-08-06","ZK-SLD":8045.7},{"date":"2025-08-08","ZK-SLA":3419.0,"ZK-SLD":8048.0,"ZK-SLQ":7188.0},{"date":"2025-08-09","ZK-SLA":3420.2,"ZK-SLB":11950.0,"ZK-SLQ":7189.4},{"date":"2025-08-10","ZK-SLB":11952.0,"ZK-SLD":8050.2,"ZK-SLQ":7190.6},{"date":"2025-08-11","ZK-SLA":3423.4,"ZK-SDB":18345.9},{"date":"2025-08-12","ZK-SLA":3425.7,"ZK-SLD":8054.8,"ZK-SLQ":7195.4,"ZK-SDB":18346.9},{"date":"2025-08-13","ZK-SLA":3428.4,"ZK-SLB":11953.2,"ZK-SLD":8056.7,"ZK-SLQ":7196.7,"ZK-SDB":18347.9},{"date":"2025-08-14","ZK-SLB":11953.9,"ZK-SLD":8059.1},{"date":"2025-08-15","ZK-SLA":3430.1,"ZK-SLQ":7201.1},{"date":"2025-08-16","ZK-SLD":8060.8},{"date":"2025-08-17","ZK-SLD":8062.5},{"date":"2025-08-19","ZK-SLQ":7201.9},{"date":"2025-08-20","ZK-SLA":3433.0,"ZK-SLB":11956.7,"ZK-SLD":8064.7,"ZK-SLQ":7204.0},{"date":"2025-08-21","ZK-SLA":3435.7,"ZK-SLB":11959.6,"ZK-SLD":8067.1,"ZK-SLQ":7205.4},{"date":"2025-08-22","ZK-SLA":3438.4,"ZK-SLD":8070.1,"ZK-SLQ":7207.3},{"date":"2025-08-23","ZK-SLA":3440.4,"ZK-SLD":8072.4,"ZK-SLQ":7209.5},{"date":"2025-08-24","ZK-SLA":3443.2,"ZK-SLD":8073.7,"ZK-SLQ":7211.0},{"date":"2025-08-25","ZK-SLA":3444.3,"ZK-SLD":8075.8,"ZK-SLQ":7213.3},{"date":"2025-08-26","ZK-SLA":3446.2,"ZK-SLB":11961.7,"ZK-SLD":8077.1,"ZK-SLQ":7214.5},{"date":"2025-08-31","ZK-SLA":3447.2,"ZK-SLB":11962.6,"ZK-SLQ":7214.9,"ZK-SDB":18348.9},{"date":"2025-09-02","ZK-SLA":3448.4,"ZK-SLB":11963.8,"ZK-SLQ":7216.3,"ZK-SDB":18350.0},{"date":"2025-09-03","ZK-SLA":3449.5,"ZK-SLB":11964.8,"ZK-SLQ":7218.9,"ZK-SDB":18351.1},{"date":"2025-09-06","ZK-SLA":3450.6,"ZK-SLB":11966.0,"ZK-SLQ":7220.1,"ZK-SDB":18352.2},{"date":"2025-09-07","ZK-SLA":3451.9,"ZK-SLB":11967.1,"ZK-SLQ":7222.1},{"date":"2025-09-08","ZK-SLA":3454.8,"ZK-SLB":11970.0,"ZK-SLQ":7225.4,"ZK-SDB":18354.0},{"date":"2025-09-11","ZK-SLA":3456.8,"ZK-SLQ":7227.1,"ZK-SDB":8355.2},{"date":"2025-09-12","ZK-SLA":3458.7,"ZK-SLQ":7227.4},{"date":"2025-09-13","ZK-SLQ":7228.1},{"date":"2025-09-14","ZK-SLA":3460.0,"ZK-SLB":11973.6,"ZK-SLQ":7229.4,"ZK-SDB":18356.3},{"date":"2025-09-17","ZK-SLQ":7231.1},{"date":"2025-09-18","ZK-SLB":11974.3},{"date":"2025-09-19","ZK-SLA":3465.0,"ZK-SLB":11978.0,"ZK-SLQ":7235.6,"ZK-SDB":18359.1},{"date":"2025-09-23","ZK-SLA":3467.7,"ZK-SLB":11980.8,"ZK-SLQ":7236.6,"ZK-SDB":18361.9},{"date":"2025-09-24","ZK-SLA":3469.5,"ZK-SLD":8077.9,"ZK-SLQ":7236.9},{"date":"2025-09-25","ZK-SLA":3470.6,"ZK-SLD":8079.3,"ZK-SDB":18362.9},{"date":"2025-09-26","ZK-SLB":11982.9},{"date":"2025-09-29","ZK-SLA":3470.8,"ZK-SLD":8080.8},{"date":"2025-09-30","ZK-SLB":11983.4},{"date":"2025-10-01","ZK-SLB":11987.4,"ZK-SLD":8085.7,"ZK-SLQ":7239.5,"ZK-SDB":18367.0},{"date":"2025-10-02","ZK-SLB":11988.5,"ZK-SLD":8087.0},{"date":"2025-10-03","ZK-SLA":3473.1,"ZK-SLB":11992.3,"ZK-SLD":8090.2,"ZK-SLQ":7243.8,"ZK-SDB":18369.5},{"date":"2025-10-04","ZK-SLQ":7245.9},{"date":"2025-10-06","ZK-SLB":11994.4,"ZK-SLD":8092.7,"ZK-SDB":18372.3},{"date":"2025-10-10","ZK-SLA":3475.3,"ZK-SLB":11995.5,"ZK-SLD":8095.2,"ZK-SLQ":7247.6},{"date":"2025-10-14","ZK-SLA":3479.3,"ZK-SLB":11999.4,"ZK-SLD":8100.0,"ZK-SLQ":7250.4},{"date":"2025-10-28","ZK-SLB":12002.5,"ZK-SLD":8103.7,"ZK-SLQ":7252.7},{"date":"2025-10-29","ZK-SLA":3486.1,"ZK-SLB":12006.7,"ZK-SLD":8107.7,"ZK-SLQ":7254.9},{"date":"2025-11-01","ZK-SLD":8116.5},{"date":"2025-11-02","ZK-SLA":3494.3,"ZK-SLD":8118.1},{"date":"2025-11-03","ZK-SLA":3496.5,"ZK-SLB":12016.7,"ZK-SLQ":7262.0},{"date":"2025-11-04","ZK-SLB":12017.5},{"date":"2025-11-05","ZK-SLB":12021.1,"ZK-SLD":8126.9},{"date":"2025-11-07","ZK-SLA":3504.4,"ZK-SLB":12025.1,"ZK-SLD":8133.0,"ZK-SLQ":7267.4},{"date":"2025-11-09","ZK-SLA":3509.3,"ZK-SLQ":7272.9},{"date":"2025-11-11","ZK-SLA":3513.2,"ZK-SLB":12029.5,"ZK-SLD":8137.8,"ZK-SLQ":7275.8},{"date":"2025-11-12","ZK-SLB":12032.3,"ZK-SLD":8140.3,"ZK-SLQ":7276.1},{"date":"2025-11-13","ZK-SLA":3519.2,"ZK-SLB":12036.1,"ZK-SLD":8143.1},{"date":"2025-11-14","ZK-SLD":8143.6},{"date":"2025-11-15","ZK-SLA":3520.6,"ZK-SLB":12039.4,"ZK-SLD":8145.2,"ZK-SLQ":7277.7},{"date":"2025-11-16","ZK-SLA":3524.4,"ZK-SLB":12043.9,"ZK-SLD":8148.0,"ZK-SLQ":7280.0},{"date":"2025-11-19","ZK-SLA":3528.7,"ZK-SLB":12047.8,"ZK-SLD":8150.9,"ZK-SLQ":7282.8},{"date":"2025-11-20","ZK-SLA":3532.4,"ZK-SLB":12051.2,"ZK-SLD":8155.0,"ZK-SLQ":7284.7},{"date":"2025-11-22","ZK-SLA":3536.6,"ZK-SLB":12055.3,"ZK-SLD":8157.1,"ZK-SLQ":7287.1},{"date":"2025-11-23","ZK-SLA":3540.7,"ZK-SLB":12056.6,"ZK-SLD":8159.5,"ZK-SLQ":7292.2},{"date":"2025-11-24","ZK-SLA":3543.5,"ZK-SLD":8164.4},{"date":"2025-11-25","ZK-SLA":3547.9,"ZK-SLD":8170.0,"ZK-SLQ":7302.0},{"date":"2025-11-26","ZK-SLD":8170.6},{"date":"2025-11-28","ZK-SLA":3551.4,"ZK-SLD":8175.0,"ZK-SLQ":7303.1},{"date":"2025-12-02","ZK-SLA":3555.2,"ZK-SLD":8180.0,"ZK-SLQ":7307.7},{"date":"2025-12-03","ZK-SLA":3556.3,"ZK-SLD":8181.2,"ZK-SLQ":7309.9},{"date":"2025-12-04","ZK-SLA":3559.7,"ZK-SLQ":7312.3},{"date":"2025-12-06","ZK-SLQ":7317.6},{"date":"2025-12-08","ZK-SLA":3568.2,"ZK-SLB":12056.9,"ZK-SLD":8181.5,"ZK-SLQ":7320.4},{"date":"2025-12-09","ZK-SLA":3572.2,"ZK-SLQ":7324.2},{"date":"2025-12-10","ZK-SLB":12063.9,"ZK-SLD":8181.8,"ZK-SLQ":7326.4},{"date":"2025-12-11","ZK-SLB":12065.0,"ZK-SLD":8185.3,"ZK-SLQ":7328.9},{"date":"2025-12-12","ZK-SLB":12066.1,"ZK-SLD":8188.2,"ZK-SLQ":7331.7},{"date":"2025-12-13","ZK-SLA":3576.6,"ZK-SLB":12067.2,"ZK-SLD":8190.5,"ZK-SLQ":7332.9},{"date":"2025-12-14","ZK-SLA":3577.9,"ZK-SLD":8194.1,"ZK-SLQ":7335.9},{"date":"2025-12-16","ZK-SLB":12068.7},{"date":"2025-12-17","ZK-SLA":3581.9,"ZK-SLD":8199.0},{"date":"2025-12-18","ZK-SLA":3584.7,"ZK-SLB":12069.0,"ZK-SLD":8203.8,"ZK-SLQ":7343.9},{"date":"2025-12-20","ZK-SLB":12073.3,"ZK-SLD":8206.8,"ZK-SLQ":7347.0},{"date":"2025-12-21","ZK-SLA":3593.0,"ZK-SLB":12077.1,"ZK-SLD":8211.9,"ZK-SLQ":7351.6},{"date":"2025-12-22","ZK-SLA":3594.2,"ZK-SLB":12078.2,"ZK-SLD":8214.1,"ZK-SLQ":7352.8},{"date":"2025-12-23","ZK-SLA":3597.0,"ZK-SLB":12081.0,"ZK-SLD":8218.5,"ZK-SLQ":7355.5},{"date":"2025-12-27","ZK-SLA":3601.1,"ZK-SLB":12085.3,"ZK-SLD":8222.8,"ZK-SLQ":7360.4},{"date":"2025-12-28","ZK-SLA":3604.9,"ZK-SLB":12089.0,"ZK-SLD":8225.7,"ZK-SLQ":7365.9},{"date":"2025-12-29","ZK-SLA":3608.8,"ZK-SLB":12092.2,"ZK-SLD":8230.3,"ZK-SLQ":7370.4},{"date":"2025-12-30","ZK-SLA":3615.1},{"date":"2025-12-31","ZK-SLA":3619.7,"ZK-SLB":12095.6,"ZK-SLD":8235.8,"ZK-SLQ":7373.0},{"date":"2026-01-01","ZK-SLB":12099.4,"ZK-SLD":8240.3},{"date":"2026-01-02","ZK-SLA":3625.5,"ZK-SLD":8241.9},{"date":"2026-01-03","ZK-SLB":12103.3,"ZK-SLD":8246.9,"ZK-SLQ":7375.7},{"date":"2026-01-04","ZK-SLB":12104.3,"ZK-SLD":8249.5,"ZK-SLQ":7377.1},{"date":"2026-01-05","ZK-SLB":12107.1,"ZK-SLD":8254.2,"ZK-SLQ":7378.1},{"date":"2026-01-06","ZK-SLA":3643.2,"ZK-SLD":8257.7},{"date":"2026-01-07","ZK-SLB":12109.9,"ZK-SLD":8259.5,"ZK-SLQ":7381.5},{"date":"2026-01-08","ZK-SLA":3645.0},{"date":"2026-01-09","ZK-SLA":3649.4,"ZK-SLB":12114.2,"ZK-SLD":8263.6,"ZK-SLQ":7386.7},{"date":"2026-01-12","ZK-SLA":3654.1,"ZK-SLB":12118.9,"ZK-SLD":8269.1,"ZK-SLQ":7389.7},{"date":"2026-01-13","ZK-SLD":8272.6,"ZK-SLQ":7391.3},{"date":"2026-01-14","ZK-SLA":3657.8,"ZK-SLB":12123.8,"ZK-SLD":8276.0,"ZK-SLQ":7395.4},{"date":"2026-01-15","ZK-SLA":3661.6,"ZK-SLB":12127.7,"ZK-SLD":8277.3,"ZK-SLQ":7396.8},{"date":"2026-01-16","ZK-SLA":3663.6,"ZK-SLB":12129.6,"ZK-SLD":8278.7,"ZK-SLQ":7400.4},{"date":"2026-01-17","ZK-SLA":3664.6,"ZK-SLB":12131.6,"ZK-SLD":8280.0,"ZK-SLQ":7403.9},{"date":"2026-01-18","ZK-SLA":3666.5,"ZK-SLB":12135.4,"ZK-SLD":8281.2,"ZK-SLQ":7406.2},{"date":"2026-01-19","ZK-SLA":3670.0,"ZK-SLB":12139.4,"ZK-SLQ":7410.5},{"date":"2026-01-20","ZK-SLB":12143.3,"ZK-SLQ":7413.2},{"date":"2026-01-21","ZK-SLA":3674.5,"ZK-SLB":12146.5,"ZK-SLQ":7414.3},{"date":"2026-01-22","ZK-SLB":12149.6,"ZK-SLD":8285.1,"ZK-SLQ":7417.5},{"date":"2026-01-23","ZK-SLB":12151.0,"ZK-SLQ":7419.0},{"date":"2026-01-24","ZK-SLB":12152.2,"ZK-SLD":8289.9,"ZK-SLQ":7423.2},{"date":"2026-01-25","ZK-SLB":12153.3},{"date":"2026-01-26","ZK-SLB":12157.1},{"date":"2026-01-27","ZK-SLD":8302.6,"ZK-SLQ":7429.2},{"date":"2026-01-28","ZK-SLB":12165.6,"ZK-SLQ":7430.7},{"date":"2026-01-29","ZK-SLB":12166.0,"ZK-SLD":8309.7},{"date":"2026-01-30","ZK-SLA":3682.7,"ZK-SLB":12170.5,"ZK-SLD":8314.6,"ZK-SLQ":7433.0},{"date":"2026-01-31","ZK-SLA":3684.9,"ZK-SLB":12173.8,"ZK-SLD":8317.3,"ZK-SLQ":7435.1},{"date":"2026-02-01","ZK-SLQ":7436.8},{"date":"2026-02-02","ZK-SLD":8321.7},{"date":"2026-02-03","ZK-SLA":3685.5},{"date":"2026-02-04","ZK-SLA":3690.2,"ZK-SLB":12181.6,"ZK-SLD":8326.2,"ZK-SLQ":7440.2},{"date":"2026-02-05","ZK-SLA":3694.3,"ZK-SLB":12187.1,"ZK-SLD":8329.7,"ZK-SLQ":7443.3},{"date":"2026-02-06","ZK-SLB":12190.2,"ZK-SLD":8331.4,"ZK-SLQ":7447.5},{"date":"2026-02-07","ZK-SLD":8331.8},{"date":"2026-02-08","ZK-SLA":3701.9,"ZK-SLB":12195.3,"ZK-SLD":8336.6,"ZK-SLQ":7452.2},{"date":"2026-02-09","ZK-SLA":3708.2,"ZK-SLB":12200.7,"ZK-SLD":8341.6,"ZK-SLQ":7454.6,"ZK-SDB":18701.9},{"date":"2026-02-10","ZK-SDB":18706.8},{"date":"2026-02-11","ZK-SLB":12203.5,"ZK-SLD":8345.0,"ZK-SLQ":7457.0,"ZK-SDB":18707.7},{"date":"2026-02-12","ZK-SLA":3715.1,"ZK-SLB":12207.5,"ZK-SLD":8347.8,"ZK-SLQ":7461.9,"ZK-SDB":18709.9},{"date":"2026-02-13","ZK-SLA":3716.1,"ZK-SLB":12208.4,"ZK-SLD":8349.1,"ZK-SLQ":7464.4,"ZK-SDB":18710.8},{"date":"2026-02-14","ZK-SLB":12209.9},{"date":"2026-02-15","ZK-SLA":3719.8,"ZK-SLB":12213.5,"ZK-SLD":8351.4,"ZK-SLQ":7469.3,"ZK-SDB":18714.5},{"date":"2026-02-16","ZK-SLA":3722.0,"ZK-SLB":12216.7,"ZK-SLD":8353.8,"ZK-SDB":18715.3},{"date":"2026-02-17","ZK-SLB":12221.1,"ZK-SLD":8356.2,"ZK-SLQ":7472.0,"ZK-SDB":18718.1},{"date":"2026-02-18","ZK-SLA":3730.0,"ZK-SLD":8359.8,"ZK-SLQ":7472.4,"ZK-SDB":18722.3},{"date":"2026-02-19","ZK-SLA":3731.1,"ZK-SLB":12226.4},{"date":"2026-02-20","ZK-SLQ":7472.8},{"date":"2026-02-21","ZK-SLA":3732.2,"ZK-SLD":8363.1,"ZK-SLQ":7474.0},{"date":"2026-02-22","ZK-SLA":3736.7,"ZK-SLB":12235.3,"ZK-SLD":8368.9,"ZK-SLQ":7478.8,"ZK-SDB":18726.4},{"date":"2026-02-23","ZK-SLA":3739.8,"ZK-SLB":12238.3,"ZK-SLD":8372.6,"ZK-SLQ":7481.1,"ZK-SDB":18729.5},{"date":"2026-02-24","ZK-SLA":3743.7,"ZK-SLB":12242.4,"ZK-SLD":8377.2,"ZK-SLQ":7486.3,"ZK-SDB":18733.2},{"date":"2026-02-25","ZK-SLA":3747.9,"ZK-SLB":12246.4,"ZK-SLD":8381.8,"ZK-SLQ":7489.6,"ZK-SDB":18735.3},{"date":"2026-02-27","ZK-SLA":3751.9,"ZK-SLB":12250.5,"ZK-SLD":8382.1,"ZK-SLQ":7493.1,"ZK-SDB":18738.2},{"date":"2026-02-28","ZK-SLA":3755.8,"ZK-SLB":12254.5,"ZK-SLQ":7496.6,"ZK-SDB":18740.0},{"date":"2026-03-01","ZK-SLA":3758.3,"ZK-SLB":12259.1,"ZK-SLD":8382.1},{"date":"2026-03-02","ZK-SLA":3760.5,"ZK-SLB":12259.4,"ZK-SLQ":7504.7,"ZK-SDB":18741.2},{"date":"2026-03-03","ZK-SLA":3765.1,"ZK-SLQ":7509.0,"ZK-SDB":18744.9},{"date":"2026-03-04","ZK-SLA":3769.1,"ZK-SLQ":7513.5,"ZK-SDB":18749.0},{"date":"2026-03-05","ZK-SLA":3770.6,"ZK-SLQ":7516.5,"ZK-SDB":18753.6},{"date":"2026-03-09","ZK-SLB":12262.0,"ZK-SLQ":7519.4,"ZK-SDB":18755.8},{"date":"2026-03-10","ZK-SLB":12266.5,"ZK-SLQ":7523.7,"ZK-SDB":18760.3},{"date":"2026-03-11","ZK-SLA":3770.8,"ZK-SLQ":7525.2},{"date":"2026-03-12","ZK-SLB":12268.9,"ZK-SLQ":7525.5},{"date":"2026-03-13","ZK-SLA":3772.0,"ZK-SLB":12270.0,"ZK-SDB":18761.4},{"date":"2026-03-14","ZK-SLA":3773.1,"ZK-SLB":12271.9,"ZK-SDB":18762.4},{"date":"2026-03-15","ZK-SLA":3775.0},{"date":"2026-03-16","ZK-SLQ":7525.9},{"date":"2026-03-17","ZK-SLA":3777.1,"ZK-SLB":12274.6,"ZK-SLQ":7528.1},{"date":"2026-03-18","ZK-SLA":3780.8,"ZK-SLB":12278.3,"ZK-SLQ":7531.6,"ZK-SDB":18764.3},{"date":"2026-03-19","ZK-SLA":3784.5,"ZK-SLB":12281.8,"ZK-SLQ":7533.7,"ZK-SDB":18767.7},{"date":"2026-03-20","ZK-SLA":3788.2,"ZK-SLB":12285.6,"ZK-SLD":8383.7,"ZK-SLQ":7534.8,"ZK-SDB":18769.5},{"date":"2026-03-21","ZK-SLA":3791.6,"ZK-SLB":12289.0,"ZK-SLD":8385.6},{"date":"2026-03-22","ZK-SLA":3793.5,"ZK-SLB":12291.7,"ZK-SDB":18770.5},{"date":"2026-03-23","ZK-SLA":3798.4,"ZK-SLB":12295.8,"ZK-SLQ":7539.2,"ZK-SDB":18774.5},{"date":"2026-03-24","ZK-SLA":3802.0,"ZK-SLB":12300.2,"ZK-SLQ":7541.4,"ZK-SDB":18775.5},{"date":"2026-03-25","ZK-SLA":3805.6,"ZK-SLB":12303.6,"ZK-SLD":8389.9,"ZK-SLQ":7544.1,"ZK-SDB":18777.2},{"date":"2026-03-26","ZK-SLA":3807.4,"ZK-SLA_landings":8,"ZK-SLA_starts":8,"ZK-SLA_landTot":5292,"ZK-SLA_startTot":5173,"ZK-SLB":12259.4,"ZK-SLB_landings":8,"ZK-SLB_starts":8,"ZK-SLB_landTot":22010,"ZK-SLB_startTot":21956,"ZK-SLD":8391.7,"ZK-SLQ":7545.2},{"date":"2026-03-30","ZK-SLA":3808.4,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5294,"ZK-SLA_startTot":5181,"ZK-SLB":12305.7,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22012,"ZK-SLB_startTot":21958,"ZK-SDB":18779.1,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":2,"ZK-SDB_startTot":2,"ZK-SLD":8393.2},{"date":"2026-03-31","ZK-SLA":3812.3,"ZK-SLA_landings":8,"ZK-SLA_starts":8,"ZK-SLA_landTot":5302,"ZK-SLA_startTot":5183,"ZK-SLB":12309.3,"ZK-SLB_landings":8,"ZK-SLB_starts":8,"ZK-SLB_landTot":22020,"ZK-SLB_startTot":21966,"ZK-SDB":18782.7,"ZK-SDB_landings":8,"ZK-SDB_starts":8,"ZK-SDB_landTot":10,"ZK-SDB_startTot":10,"ZK-SLD":8397.1},{"date":"2026-04-01","ZK-SLA":3815.8,"ZK-SLA_landings":8,"ZK-SLA_starts":8,"ZK-SLA_landTot":5310,"ZK-SLA_startTot":5191,"ZK-SLB":12312.0,"ZK-SLB_landings":6,"ZK-SLB_starts":6,"ZK-SLB_landTot":22026,"ZK-SLB_startTot":21972,"ZK-SDB":18784.5,"ZK-SDB_landings":4,"ZK-SDB_starts":4,"ZK-SDB_landTot":14,"ZK-SDB_startTot":14,"ZK-SLD":8400.8},{"date":"2026-04-02","ZK-SLA":3818.6,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5316,"ZK-SLA_startTot":5199,"ZK-SLB":12313.8,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22030,"ZK-SLB_startTot":21976,"ZK-SDB":18786.3,"ZK-SDB_landings":4,"ZK-SDB_starts":4,"ZK-SDB_landTot":18,"ZK-SDB_startTot":18,"ZK-SLD":8404.7,"ZK-SLQ":7558.2},{"date":"2026-04-05","ZK-SLA":3821.5,"ZK-SLA_landings":4,"ZK-SLA_starts":4,"ZK-SLA_landTot":5320,"ZK-SLA_startTot":5205,"ZK-SLB_landTot":22030,"ZK-SLB_startTot":21976,"ZK-SDB_landTot":18,"ZK-SDB_startTot":18,"ZK-SLQ":7560.0},{"date":"2026-04-06","ZK-SLA":3824.4,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5326,"ZK-SLA_startTot":5209,"ZK-SLB":12316.5,"ZK-SLB_landings":6,"ZK-SLB_starts":6,"ZK-SLB_landTot":22036,"ZK-SLB_startTot":21982,"ZK-SDB":18789.0,"ZK-SDB_landings":6,"ZK-SDB_starts":7,"ZK-SDB_landTot":24,"ZK-SDB_startTot":25,"ZK-SLD":8406.4,"ZK-SLQ":7563.3},{"date":"2026-04-07","ZK-SLA_landTot":5326,"ZK-SLA_startTot":5215,"ZK-SLB_landTot":22036,"ZK-SLB_startTot":21982,"ZK-SDB_landTot":24,"ZK-SDB_startTot":25,"ZK-SLD":8407.2},{"date":"2026-04-08","ZK-SLA_landTot":5326,"ZK-SLA_startTot":5215,"ZK-SLB":12317.2,"ZK-SLB_landings":3,"ZK-SLB_starts":3,"ZK-SLB_landTot":22039,"ZK-SLB_startTot":21985,"ZK-SDB_landTot":24,"ZK-SDB_startTot":25},{"date":"2026-04-10","ZK-SLA":3827.9,"ZK-SLA_landings":7,"ZK-SLA_starts":7,"ZK-SLA_landTot":5333,"ZK-SLA_startTot":5215,"ZK-SLB":12320.7,"ZK-SLB_landings":7,"ZK-SLB_starts":7,"ZK-SLB_landTot":22046,"ZK-SLB_startTot":21992,"ZK-SDB":18791.7,"ZK-SDB_landings":6,"ZK-SDB_starts":6,"ZK-SDB_landTot":30,"ZK-SDB_startTot":31,"ZK-SLD":8412.1,"ZK-SLQ":7567.1},{"date":"2026-04-11","ZK-SLA":3832.0,"ZK-SLA_landings":8,"ZK-SLA_starts":8,"ZK-SLA_landTot":5341,"ZK-SLA_startTot":5222,"ZK-SLB":12324.9,"ZK-SLB_landings":8,"ZK-SLB_starts":8,"ZK-SLB_landTot":22054,"ZK-SLB_startTot":22000,"ZK-SDB":18793.8,"ZK-SDB_landings":4,"ZK-SDB_starts":5,"ZK-SDB_landTot":34,"ZK-SDB_startTot":36,"ZK-SLD":8416.0,"ZK-SLQ":7570.3},{"date":"2026-04-15","ZK-SLA":3833.0,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5342,"ZK-SLA_startTot":5230,"ZK-SLB":12325.8,"ZK-SLB_landings":1,"ZK-SLB_starts":1,"ZK-SLB_landTot":22055,"ZK-SLB_startTot":22001,"ZK-SDB_landTot":34,"ZK-SDB_startTot":36},{"date":"2026-04-19","ZK-SLA":3834.3,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5344,"ZK-SLA_startTot":5231,"ZK-SLB":12326.8,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22057,"ZK-SLB_startTot":22003,"ZK-SDB":18794.9,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":36,"ZK-SDB_startTot":38,"ZK-SLD":8417.3,"ZK-SLQ":7571.7},{"date":"2026-04-20","ZK-SLA":3835.3,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5345,"ZK-SLA_startTot":5233,"ZK-SLB_landTot":22057,"ZK-SLB_startTot":22003,"ZK-SDB_landTot":36,"ZK-SDB_startTot":38,"ZK-SLD":8418.5,"ZK-SLQ":7572.3},{"date":"2026-04-21","ZK-SLA":3836.4,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5346,"ZK-SLA_startTot":5234,"ZK-SLB":12327.9,"ZK-SLB_landings":1,"ZK-SLB_starts":1,"ZK-SLB_landTot":22058,"ZK-SLB_startTot":22004,"ZK-SDB_landTot":36,"ZK-SDB_startTot":38},{"date":"2026-04-22","ZK-SLA":3840.0,"ZK-SLA_landings":8,"ZK-SLA_starts":8,"ZK-SLA_landTot":5354,"ZK-SLA_startTot":5235,"ZK-SLB":12330.7,"ZK-SLB_landings":6,"ZK-SLB_starts":6,"ZK-SLB_landTot":22064,"ZK-SLB_startTot":22010,"ZK-SDB":18796.8,"ZK-SDB_landings":4,"ZK-SDB_starts":4,"ZK-SDB_landTot":40,"ZK-SDB_startTot":42,"ZK-SLD":8420.9},{"date":"2026-04-23","ZK-SLA":3840.9,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5356,"ZK-SLA_startTot":5243,"ZK-SLB":12332.5,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22068,"ZK-SLB_startTot":22014,"ZK-SDB_landTot":40,"ZK-SDB_startTot":42,"ZK-SLD":8424.2,"ZK-SLQ":7573.7},{"date":"2026-04-24","ZK-SLA":3843.7,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5362,"ZK-SLA_startTot":5245,"ZK-SLB":12334.2,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22072,"ZK-SLB_startTot":22018,"ZK-SDB":18797.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":42,"ZK-SDB_startTot":44,"ZK-SLQ":7577.0},{"date":"2026-04-25","ZK-SLA":3846.6,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5368,"ZK-SLA_startTot":5251,"ZK-SLB":12336.2,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22076,"ZK-SLB_startTot":22022,"ZK-SDB_landTot":42,"ZK-SDB_startTot":44,"ZK-SLD":8427.9,"ZK-SLQ":7580.1},{"date":"2026-04-27","ZK-SLA":3847.5,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5370,"ZK-SLA_startTot":5257,"ZK-SLB":12337.1,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22078,"ZK-SLB_startTot":22024,"ZK-SDB":18798.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":44,"ZK-SDB_startTot":46,"ZK-SLD":8431.0,"ZK-SLQ":7582.4},{"date":"2026-04-28","ZK-SLA_landTot":5370,"ZK-SLA_startTot":5259,"ZK-SLB_landTot":22078,"ZK-SLB_startTot":22024,"ZK-SDB_landTot":44,"ZK-SDB_startTot":46,"ZK-SLD":8431.6,"ZK-SLQ":7583.0},{"date":"2026-04-30","ZK-SLA":3850.3,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5376,"ZK-SLA_startTot":5259,"ZK-SLB":12339.7,"ZK-SLB_landings":6,"ZK-SLB_starts":6,"ZK-SLB_landTot":22084,"ZK-SLB_startTot":22030,"ZK-SDB":18800.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":46,"ZK-SDB_startTot":48,"ZK-SLD":3435.0,"ZK-SLQ":7585.9},{"date":"2026-05-01","ZK-SLA":3852.1,"ZK-SLA_landings":4,"ZK-SLA_starts":4,"ZK-SLA_landTot":5380,"ZK-SLA_startTot":5265,"ZK-SLB":12342.0,"ZK-SLB_landings":8,"ZK-SLB_starts":3,"ZK-SLB_landTot":22092,"ZK-SLB_startTot":22033,"ZK-SDB_landTot":46,"ZK-SDB_startTot":48,"ZK-SLD":8436.2,"ZK-SLQ":7587.1},{"date":"2026-05-02","ZK-SLA":3854.0,"ZK-SLA_landings":4,"ZK-SLA_starts":4,"ZK-SLA_landTot":5384,"ZK-SLA_startTot":5269,"ZK-SLB":12343.0,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22094,"ZK-SLB_startTot":22035,"ZK-SDB":18801.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":48,"ZK-SDB_startTot":50,"ZK-SLQ":7588.1},{"date":"2026-05-03","ZK-SLA":3855.1,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5386,"ZK-SLA_startTot":5273,"ZK-SLB":12343.9,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22096,"ZK-SLB_startTot":22037,"ZK-SDB_landTot":48,"ZK-SDB_startTot":50,"ZK-SLD":8438.4,"ZK-SLQ":7590.3},{"date":"2026-05-04","ZK-SLA":3855.9,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5388,"ZK-SLA_startTot":5275,"ZK-SLB":12345.2,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22098,"ZK-SLB_startTot":22039,"ZK-SDB":18802.6,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":50,"ZK-SDB_startTot":52,"ZK-SLD":8441.6,"ZK-SLQ":7592.9},{"date":"2026-05-05","ZK-SLA":3858.1,"ZK-SLA_landings":4,"ZK-SLA_starts":4,"ZK-SLA_landTot":5392,"ZK-SLA_startTot":5277,"ZK-SLB":12346.2,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22100,"ZK-SLB_startTot":22041,"ZK-SDB":18803.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":52,"ZK-SDB_startTot":54,"ZK-SLQ":7596.1},{"date":"2026-05-06","ZK-SLA_landTot":5392,"ZK-SLA_startTot":5281,"ZK-SLB_landTot":22100,"ZK-SLB_startTot":22041,"ZK-SDB":18803.9,"ZK-SDB_landings":1,"ZK-SDB_starts":1,"ZK-SDB_landTot":53,"ZK-SDB_startTot":55},{"date":"2026-05-07","ZK-SLA_landTot":5392,"ZK-SLA_startTot":5281,"ZK-SLB_landTot":22100,"ZK-SLB_startTot":22041,"ZK-SDB":18804.2,"ZK-SDB_landings":1,"ZK-SDB_starts":1,"ZK-SDB_landTot":54,"ZK-SDB_startTot":56},{"date":"2026-05-08","ZK-SLA":3859.1,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5393,"ZK-SLA_startTot":5281,"ZK-SLB_landTot":22100,"ZK-SLB_startTot":22041,"ZK-SDB_landTot":54,"ZK-SDB_startTot":56,"ZK-SLQ":7597.5},{"date":"2026-05-09","ZK-SLA":3860.2,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5394,"ZK-SLA_startTot":5282,"ZK-SLB":12347.2,"ZK-SLB_landings":1,"ZK-SLB_starts":1,"ZK-SLB_landTot":22101,"ZK-SLB_startTot":22042,"ZK-SDB_landTot":54,"ZK-SDB_startTot":56,"ZK-SLQ":7598.9},{"date":"2026-05-10","ZK-SLA_landTot":5394,"ZK-SLA_startTot":5283,"ZK-SLB_landTot":22101,"ZK-SLB_startTot":22042,"ZK-SDB_landTot":54,"ZK-SDB_startTot":56,"ZK-SLQ":7599.9},{"date":"2026-05-11","ZK-SLA":3862.9,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5400,"ZK-SLA_startTot":5283,"ZK-SLB":12349.1,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22105,"ZK-SLB_startTot":22046,"ZK-SDB":18805.2,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58,"ZK-SLD":8443.6,"ZK-SLQ":7602.1},{"date":"2026-05-12","ZK-SLA":3864.1,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5402,"ZK-SLA_startTot":5289,"ZK-SLB":12351.2,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22109,"ZK-SLB_startTot":22050,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58,"ZK-SLQ":7605.3},{"date":"2026-05-13","ZK-SLA":3865.1,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5404,"ZK-SLA_startTot":5291,"ZK-SLB":12352.4,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22111,"ZK-SLB_startTot":22052,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58},{"date":"2026-05-14","ZK-SLA":3866.0,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5406,"ZK-SLA_startTot":5293,"ZK-SLB":12353.4,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22113,"ZK-SLB_startTot":22054,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58,"ZK-SLD":8444.0,"ZK-SLQ":7607.4},{"date":"2026-05-15","ZK-SLA":3866.9,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5408,"ZK-SLA_startTot":5295,"ZK-SLB":12354.3,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22115,"ZK-SLB_startTot":22056,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58,"ZK-SLQ":7610.2},{"date":"2026-05-16","ZK-SLA":3867.9,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5410,"ZK-SLA_startTot":5297,"ZK-SLB":12355.4,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22117,"ZK-SLB_startTot":22058,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58,"ZK-SLQ":7611.4},{"date":"2026-05-17","ZK-SLA":3869.8,"ZK-SLA_landings":3,"ZK-SLA_starts":3,"ZK-SLA_landTot":5413,"ZK-SLA_startTot":5299,"ZK-SLB_landTot":22117,"ZK-SLB_startTot":22058,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58,"ZK-SLQ":7612.4},{"date":"2026-05-18","ZK-SLA":3870.8,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5415,"ZK-SLA_startTot":5302,"ZK-SLB":12356.3,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22119,"ZK-SLB_startTot":22060,"ZK-SDB":18807.0,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":58,"ZK-SDB_startTot":60},{"date":"2026-05-19","ZK-SLA":3871.0,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5416,"ZK-SLA_startTot":5304,"ZK-SLB":12357.3,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22121,"ZK-SLB_startTot":22062,"ZK-SDB_landTot":58,"ZK-SDB_startTot":60,"ZK-SLD":8445.0,"ZK-SLQ":7613.6},{"date":"2026-05-20","ZK-SLA_landTot":5416,"ZK-SLA_startTot":5305,"ZK-SLB_landTot":22121,"ZK-SLB_startTot":22062,"ZK-SDB_landTot":58,"ZK-SDB_startTot":60,"ZK-SLD":8447.0,"ZK-SLQ":7615.7},{"date":"2026-05-21","ZK-SLA_landTot":5416,"ZK-SLA_startTot":5305,"ZK-SLB":12358.4,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22123,"ZK-SLB_startTot":22064,"ZK-SDB_landTot":58,"ZK-SDB_startTot":60,"ZK-SLQ":7616.8},{"date":"2026-05-22","ZK-SLA_landTot":5416,"ZK-SLA_startTot":5305,"ZK-SLB":12359.4,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22125,"ZK-SLB_startTot":22066,"ZK-SDB":18808.0,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":60,"ZK-SDB_startTot":62,"ZK-SLD":8448.2,"ZK-SLQ":7618.0},{"date":"2026-05-23","ZK-SLA_landTot":5416,"ZK-SLA_startTot":5305,"ZK-SLB":12361.4,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22129,"ZK-SLB_startTot":22070,"ZK-SDB":18809.0,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":62,"ZK-SDB_startTot":64,"ZK-SLQ":7620.1},{"date":"2026-05-24","ZK-SLA_landTot":5416,"ZK-SLA_startTot":5305,"ZK-SLB":12362.2,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22131,"ZK-SLB_startTot":22072,"ZK-SDB":18809.9,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":64,"ZK-SDB_startTot":66,"ZK-SLD":8449.4,"ZK-SLQ":7621.3},{"date":"2026-05-27","ZK-SLA_landTot":5416,"ZK-SLA_startTot":5305,"ZK-SLB":12363.2,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22133,"ZK-SLB_startTot":22074,"ZK-SDB":18810.9,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":66,"ZK-SDB_startTot":68,"ZK-SLQ":7623.5},{"date":"2026-05-28","ZK-SLA":3872.2,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5418,"ZK-SLA_startTot":5305,"ZK-SLB":12364.2,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22135,"ZK-SLB_startTot":22076,"ZK-SDB":18811.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":68,"ZK-SDB_startTot":70,"ZK-SLD":8451.6},{"date":"2026-05-29","ZK-SLA":3873.1,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5420,"ZK-SLA_startTot":5307,"ZK-SLB":12365.1,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22137,"ZK-SLB_startTot":22078,"ZK-SDB_landTot":68,"ZK-SDB_startTot":70,"ZK-SLD":8452.7},{"date":"2026-05-30","ZK-SLA_landTot":5420,"ZK-SLA_startTot":5309,"ZK-SLB_landTot":22137,"ZK-SLB_startTot":22078,"ZK-SDB_landTot":68,"ZK-SDB_startTot":70,"ZK-SLD":8454.0,"ZK-SLQ":7624.9},{"date":"2026-06-02","ZK-SLA":3875.4,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5421,"ZK-SLA_startTot":5309,"ZK-SLB_landTot":22137,"ZK-SLB_startTot":22078,"ZK-SDB_landTot":68,"ZK-SDB_startTot":70,"ZK-SLQ":7625.1},{"date":"2026-06-03","ZK-SLA":3878.3,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5427,"ZK-SLA_startTot":5310,"ZK-SLB":12368.0,"ZK-SLB_landings":6,"ZK-SLB_starts":6,"ZK-SLB_landTot":22143,"ZK-SLB_startTot":22084,"ZK-SDB":18813.7,"ZK-SDB_landings":4,"ZK-SDB_starts":4,"ZK-SDB_landTot":72,"ZK-SDB_startTot":74,"ZK-SLD":8455.9,"ZK-SLQ":7628.6},{"date":"2026-06-06","ZK-SLA":3879.3,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5429,"ZK-SLA_startTot":5316,"ZK-SLB":12369.1,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22145,"ZK-SLB_startTot":22086,"ZK-SDB":18814.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":74,"ZK-SDB_startTot":76,"ZK-SLD":8457.2},{"date":"2026-06-07","ZK-SLA_landTot":5429,"ZK-SLA_startTot":5318,"ZK-SLB_landTot":22145,"ZK-SLB_startTot":22086,"ZK-SDB_landTot":74,"ZK-SDB_startTot":76,"ZK-SLD":8459.2},{"date":"2026-06-09","ZK-SLA_landTot":5429,"ZK-SLA_startTot":5318,"ZK-SLB":12370.1,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22147,"ZK-SLB_startTot":22088,"ZK-SDB_landTot":74,"ZK-SDB_startTot":76,"ZK-SLD":8460.5,"ZK-SLQ":7627.8},{"date":"2026-06-10","ZK-SLA":3880.2,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5431,"ZK-SLA_startTot":5318,"ZK-SLB":12371.0,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22149,"ZK-SLB_startTot":22090,"ZK-SDB_landTot":74,"ZK-SDB_startTot":76,"ZK-SLD":8462.7},{"date":"2026-06-11","ZK-SLA_landTot":5431,"ZK-SLA_startTot":5320,"ZK-SLB":12372.3,"ZK-SLB_landings":1,"ZK-SLB_starts":1,"ZK-SLB_landTot":22150,"ZK-SLB_startTot":22091,"ZK-SDB_landTot":74,"ZK-SDB_startTot":76,"ZK-SLD":8464.5}],"oil":[{"date":"2026-01-04","ZK-SLD":1.0,"ZK-SLQ":2.0},{"date":"2026-01-05","ZK-SLD":1.0},{"date":"2026-01-06","ZK-SLD":2.0},{"date":"2026-01-08","ZK-SLD":1.0},{"date":"2026-01-10","ZK-SLD":1.0},{"date":"2026-01-12","ZK-SLD":1.0},{"date":"2026-01-14","ZK-SLA":1.0},{"date":"2026-01-16","ZK-SLD":1.0,"ZK-SLQ":1.0},{"date":"2026-01-21","ZK-SLB":1.0,"ZK-SLQ":1.0},{"date":"2026-01-23","ZK-SLQ":1.0},{"date":"2026-01-26","ZK-SLQ":1.0},{"date":"2026-01-27","ZK-SLQ":1.0},{"date":"2026-01-30","ZK-SLD":2.0},{"date":"2026-01-31","ZK-SLD":2.0},{"date":"2026-02-04","ZK-SLA":1.0,"ZK-SLB":1.0},{"date":"2026-02-07","ZK-SLQ":1.0},{"date":"2026-02-11","ZK-SLD":1.0,"ZK-SLQ":1.0},{"date":"2026-02-15","ZK-SLQ":1.0},{"date":"2026-02-16","ZK-SLA":1.0},{"date":"2026-02-17","ZK-SLD":1.0},{"date":"2026-02-18","ZK-SLD":1.0},{"date":"2026-02-21","ZK-SLB":1.0},{"date":"2026-02-22","ZK-SLD":1.0,"ZK-SLQ":1.0},{"date":"2026-02-24","ZK-SLD":1.0},{"date":"2026-02-25","ZK-SLD":1.0},{"date":"2026-02-27","ZK-SLQ":1.0},{"date":"2026-03-04","ZK-SLQ":2.0},{"date":"2026-03-13","ZK-SLB":1.0},{"date":"2026-03-25","ZK-SLA":1.0},{"date":"2026-03-30","ZK-SLB":1.0},{"date":"2026-04-01","ZK-SLQ":1.0},{"date":"2026-04-06","ZK-SDB":1.0},{"date":"2026-04-10","ZK-SLA":1.0,"ZK-SLQ":1.0},{"date":"2026-04-11","ZK-SLQ":1.0},{"date":"2026-04-15","ZK-SLQ":1.0},{"date":"2026-05-03","ZK-SLQ":1.0},{"date":"2026-05-04","ZK-SLQ":1.0},{"date":"2026-05-06","ZK-SLQ":1.0},{"date":"2026-05-11","ZK-SLQ":1.0},{"date":"2026-05-16","ZK-SLQ":2.0},{"date":"2026-05-20","ZK-SLQ":2.0},{"date":"2026-05-28","ZK-SLA":1.0,"ZK-SLB":1.0},{"date":"2026-05-30","ZK-SLQ":1.0}],"nextCheck":{"ZK-SLA":3970,"ZK-SLB":12450.4,"ZK-SLD":8477.1,"ZK-SLQ":7672.4,"ZK-SDB":18878.8},"checkType":{"ZK-SLA":"100 Hour","ZK-SLB":"200 Hour","ZK-SLD":"100 Hour","ZK-SLQ":"100 Hour","ZK-SDB":"100 Hour"},"engineLastOH":{"ZK-SLA":0,"ZK-SLB":11850.4,"ZK-SLD":8382.1,"ZK-SLQ":5464.5},"engineToRun":{"ZK-SLA":4120.7,"ZK-SLB":3080.3,"ZK-SLD":2121.6,"ZK-SLQ":35.9},"propLastOH":{"ZK-SLA":1780.6,"ZK-SLB":11895.5,"ZK-SLD":8382.1,"ZK-SLQ":5432.9},"propToRun":{"ZK-SLA":1901.3,"ZK-SLB":3525.4,"ZK-SLD":2321.6,"ZK-SLQ":204.3}};
const MAINT_SEED_VERSION=5;

// ── Maintenance merge-before-write ─────────────────────────────────────────────
// The whole maintenance record lives in one ts_settings blob shared by every editor. Writing the
// blob wholesale is last-writer-wins: a stale device (or a backgrounded mobile tab that missed a
// realtime update) could overwrite another person's comp-wash / ADAS tick or log row. Instead we
// diff what THIS device changed (S._maintBase → live S.maintenance) and re-apply ONLY that onto the
// freshest server copy. _maintBase = last-known server state (set on load / realtime / save).
function _mClone(x){try{return JSON.parse(JSON.stringify(x||{}));}catch(e){return {};}}
function _mArr(x){return Array.isArray(x)?x.slice():(x?[x]:[]);}
function _mByDate(a){var o={};(Array.isArray(a)?a:[]).forEach(function(e){if(e&&e.date!=null)o[e.date]=_mClone(e);});return o;}
function _mShape(m){m=m||{};['nextCheck','checkType','engineLastOH','engineToRun','propLastOH','propToRun','bookings','compwash','adas'].forEach(function(k){if(!m[k]||typeof m[k]!=='object'||Array.isArray(m[k]))m[k]={};});['hist','oil','priority'].forEach(function(k){if(!Array.isArray(m[k]))m[k]=[];});return m;}
function _maintMerge(base,oldL,newL){
  base=_mShape(_mClone(base));oldL=_mShape(_mClone(oldL||{}));newL=_mShape(_mClone(newL||{}));
  // aircraft-keyed scalar maps — apply only the keys this device changed (add/edit/remove)
  ['nextCheck','checkType','engineLastOH','engineToRun','propLastOH','propToRun'].forEach(function(f){
    var o=oldL[f]||{},n=newL[f]||{},keys={};
    Object.keys(o).forEach(function(k){keys[k]=1;});Object.keys(n).forEach(function(k){keys[k]=1;});
    Object.keys(keys).forEach(function(k){if(JSON.stringify(n[k])!==JSON.stringify(o[k])){if(k in n)base[f][k]=n[k];else delete base[f][k];}});
  });
  // comp-wash / ADAS — per-aircraft date SETS: apply this device's added & removed dates onto base
  ['compwash','adas'].forEach(function(f){
    var o=oldL[f]||{},n=newL[f]||{},acs={};
    Object.keys(o).forEach(function(a){acs[a]=1;});Object.keys(n).forEach(function(a){acs[a]=1;});
    Object.keys(acs).forEach(function(a){
      var oa=_mArr(o[a]),na=_mArr(n[a]);
      var added=na.filter(function(d){return oa.indexOf(d)<0;}),removed=oa.filter(function(d){return na.indexOf(d)<0;});
      if(!added.length&&!removed.length)return;
      var b=_mArr(base[f][a]);
      removed.forEach(function(d){var i=b.indexOf(d);if(i>=0)b.splice(i,1);});
      added.forEach(function(d){if(b.indexOf(d)<0)b.push(d);});
      base[f][a]=b;
    });
  });
  // log / oil rows — key by date; field-level merge so two devices editing different dates (or
  // different aircraft on the same date) both survive; a row deleted by this device is removed.
  ['hist','oil'].forEach(function(f){
    var oByD=_mByDate(oldL[f]),nByD=_mByDate(newL[f]),bByD=_mByDate(base[f]);
    var dates={};Object.keys(oByD).forEach(function(d){dates[d]=1;});Object.keys(nByD).forEach(function(d){dates[d]=1;});
    Object.keys(dates).forEach(function(d){
      var o=oByD[d],n=nByD[d];
      if(n&&!o){bByD[d]=Object.assign(bByD[d]||{date:d},n);return;}
      if(o&&!n){delete bByD[d];return;}
      var be=bByD[d]||{date:d},fields={};
      Object.keys(o).forEach(function(k){fields[k]=1;});Object.keys(n).forEach(function(k){fields[k]=1;});
      Object.keys(fields).forEach(function(k){if(k==='date')return;if(JSON.stringify(n[k])!==JSON.stringify(o[k])){if(k in n)be[k]=n[k];else delete be[k];}});
      bByD[d]=be;
    });
    base[f]=Object.keys(bByD).map(function(d){return bByD[d];}).sort(function(a,b){return String(a.date).localeCompare(String(b.date));});
  });
  // bookings (per-aircraft list) + priority — take this device's version only if it changed them
  (function(){var o=oldL.bookings||{},n=newL.bookings||{},acs={};
    Object.keys(o).forEach(function(a){acs[a]=1;});Object.keys(n).forEach(function(a){acs[a]=1;});
    Object.keys(acs).forEach(function(a){if(JSON.stringify(n[a])!==JSON.stringify(o[a])){if(a in n)base.bookings[a]=n[a];else delete base.bookings[a];}});
  })();
  if(JSON.stringify(newL.priority)!==JSON.stringify(oldL.priority))base.priority=_mClone(newL.priority);
  return base;
}
function _maintSetBase(m){try{S._maintBase=JSON.stringify(m||S.maintenance||{});}catch(e){S._maintBase=null;}}
let _maintSaving=false,_maintResave=false,_maintRetryTimer=null;
function saveMaintenance(){lsSet('ts_maintenance',S.maintenance);_maintMergeSave();}
async function _maintMergeSave(){
  if(_maintSaving){_maintResave=true;return;}   // coalesce rapid saves; one re-run picks up the rest
  _maintSaving=true;
  try{
    var oldBase=S._maintBase?JSON.parse(S._maintBase):null;
    var fresh=null;try{fresh=await loadMaintenanceFromCloud();}catch(e){}
    // CRITICAL: only write if we could read the current server copy. If the GET failed (or the row is
    // unexpectedly empty), writing our local state would CLOBBER the real server data with a possibly
    // thin/partial copy (this is how history got wiped). Abort and retry on the next save instead.
    if(!(fresh&&fresh.hist&&fresh.hist.length)){
      if(typeof toast==='function')toast('Maintenance not saved — could not read the latest from the server. Will retry.','warn');
      _maintSaving=false;_maintResave=false;
      if(!_maintRetryTimer)_maintRetryTimer=setTimeout(function(){_maintRetryTimer=null;_maintMergeSave();},2000); // single retry timer; base NOT advanced so the edit is preserved
      return;
    }
    var merged=_maintMerge(fresh,oldBase||S.maintenance,S.maintenance);
    S.maintenance=merged;lsSet('ts_maintenance',merged);
    var r=await sbU('ts_settings',[{key:'maintenance',value:JSON.stringify(merged)}]);
    // Only advance the base AFTER the write is confirmed — otherwise a failed save leaves the base
    // ahead of the server and the edit is never re-pushed (silent loss).
    if(r===null){toast('Maintenance save failed — not saved to server. Check connection and retry.','error');}
    else{_maintSetBase(merged);}
    if(typeof safeRender==='function')safeRender();
  }catch(e){console.error('[maintenance save]',e);}
  finally{_maintSaving=false;if(_maintResave){_maintResave=false;_maintMergeSave();}}
}
async function loadMaintenanceFromCloud(){
  try{
    // _sbFetch refreshes the JWT on a 401 — a raw fetch would null out near token expiry and make
    // _maintMergeSave abort+retry forever without ever refreshing.
    const r=await (typeof _sbFetch==='function'?_sbFetch:fetch)(SB+'/rest/v1/ts_settings?key=eq.maintenance&select=value',{headers:SH});
    if(!r.ok)return null;
    const rows=await r.json();
    if(!rows||!rows.length)return null;
    const val=typeof rows[0].value==='string'?JSON.parse(rows[0].value):rows[0].value;
    return val&&val.hist?val:null;
  }catch{return null;}
}
// Robust maintenance loader — used on tab open AND lazily on first render (covers a refresh that
// lands straight on Maintenance). Shows local instantly, pulls cloud, NEVER loses cloud data if the
// merge throws, and always clears the loading spinner.
window.ensureMaintenance=function(force){
  if(S._maintLoaded&&!force)return Promise.resolve();
  S._maintLoaded=true;
  if(!S.maintenance||!S.maintenance.hist){
    var _mLocal=lsGet('ts_maintenance');
    S.maintenance=(_mLocal&&_mLocal.hist)?Object.assign({},_mLocal,{_loading:false}):{hist:[],oil:[],nextCheck:{},checkType:{},engineLastOH:{},engineToRun:{},propLastOH:{},propToRun:{},bookings:{},priority:[],compwash:{},adas:{},_loading:false};
  } else { S.maintenance._loading=false; }
  _maintSetBase(S.maintenance);
  return loadMaintenanceFromCloud().then(function(cloud){
    if(cloud&&cloud.hist){
      try{var ob=S._maintBase?JSON.parse(S._maintBase):S.maintenance;S.maintenance=_maintMerge(cloud,ob,S.maintenance||cloud);}
      catch(e){S.maintenance=cloud;}            // failsafe: never lose the cloud copy
      S.maintenance._loading=false;lsSet('ts_maintenance',S.maintenance);_maintSetBase(cloud);
    } else if(S.maintenance){S.maintenance._loading=false;}
    render();
  }).catch(function(){if(S.maintenance)S.maintenance._loading=false;render();});
};
function initMaintenance(){
  // Fetch handled by setTab on every tab click; just ensure state exists
  if(!S.maintenance){
    S.maintenance={hist:[],oil:[],nextCheck:{},checkType:{},engineLastOH:{},engineToRun:{},propLastOH:{},propToRun:{},bookings:{},priority:[],compwash:{},adas:{},_loading:true};
    if(!S._maintBase)_maintSetBase(S.maintenance);
  }
}

function maintGetLatest(acId){
  const hist=S.maintenance?.hist||[];
  for(let i=hist.length-1;i>=0;i--){if(hist[i][acId]!=null)return hist[i][acId];}
  return null;
}

function maintToRun(acId){
  const latest=maintGetLatest(acId);
  const nc=S.maintenance?.nextCheck?.[acId];
  if(latest==null||nc==null)return null;
  return Math.round((nc-latest)*10)/10;
}

function fmtMaintDate(d){
  if(!d) return '—';
  const dt=new Date(d+'T00:00:00');
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day=String(dt.getDate()).padStart(2,'0');
  const mon=months[dt.getMonth()];
  const yr=String(dt.getFullYear()).slice(2);
  return day+'-'+mon+'-'+yr;
}

window.retryMaintenance=function(){setTab('maintenance');};

function generateHalfSheetContent(sheet){
  var f=sheet.form;
  var a=S.aircraft[f.ac]||{seats:[],cargo:[],doc:'',type:'',burnDef:'',burnDefUnit:'kg',gndBurn:0,fuelArm:0,ew:0,em:0,cogMin:0,cogMax:0,mtow:0,mlw:0};
  var r=calcFormWB(f);
  var acCol=AC_COL[f.ac]||'#1e6b8c';
  function hexRgba(h,op){var x=parseInt(h.slice(1),16);return 'rgba('+((x>>16)&255)+','+((x>>8)&255)+','+(x&255)+','+op+')';}
  var acFaint=hexRgba(acCol,0.08);
  var allOk=r&&r.towOk&&r.lwOk&&r.cogOk;
  var statusBg=allOk?'#f0fdf4':'#fef2f2';
  var statusBorder=allOk?'#16a34a':'#dc2626';
  var statusColor=allOk?'#15803d':'#b91c1c';
  var fuelKgV=parseFloat(f.fuel)||0;
  var burnKgV=r?r.burnKg:0;
  var _gndBurnV=r?r.gndBurn:(parseFloat(f.gndBurn!=null?f.gndBurn:(a.gndBurn||0))||0);
  var remKg=fuelKgV-_gndBurnV-burnKgV;
  var fuelU=fuelUnit(f.ac);
  var fuelDisplay=f.ac?fromKg(fuelKgV,f.ac).toFixed(1):fuelKgV;
  var remDisplay=f.ac?fromKg(Math.max(0,remKg),f.ac).toFixed(1):Math.max(0,remKg).toFixed(1);
  var TD='border:1px solid #e2e8f0;padding:3px 6px;font-family:Arial,sans-serif;font-size:9px;vertical-align:top;';
  var TH='border:1px solid '+acCol+';padding:3px 6px;font-family:Arial,sans-serif;font-size:8px;font-weight:700;text-align:left;background:'+acCol+';color:#fff;';
  // Seat rows
  var seatRows='';
  a.seats.forEach(function(s,i){
    var n=(f.names&&f.names[i])||'';var w=(f.seats&&f.seats[i])||'';var b=(f.bags&&f.bags[i])||'';
    if(n||parseFloat(w)){
      var inf=(f.infantNames&&f.infantNames[i])||'';
      var pt=(f.paxType&&f.paxType[i])||'A';
      seatRows+='<tr style="background:'+(i===0?acFaint:'transparent')+'">'
        +'<td style="'+TD+'font-weight:'+(i===0?'700':'400')+';color:'+(i===0?acCol:'#111')+'">'+s.lbl+'</td>'
        +'<td style="'+TD+'">'+esc(n)+(inf?' + '+esc(inf):'')+(i>0&&n?' <span style="font-size:8px;color:'+(pt==='C'?'#ea580c':'#16a34a')+';margin-left:3px">'+(pt==='C'?'C':'A')+'</span>':'')+'</td>'
        +'<td style="'+TD+'text-align:right">'+(w||'—')+'</td>'
        +'<td style="'+TD+'text-align:right">'+(b||'—')+'</td>'
        +'</tr>';
    }
  });
  var cargoRows='';
  if(a.cargo&&a.cargo.length){a.cargo.forEach(function(zn,i){var w=(f.cargo&&f.cargo[i])||'';if(w)cargoRows+='<tr><td style="'+TD+'">'+zn.lbl+'</td><td style="'+TD+'text-align:right">'+w+' kg</td></tr>';});}
  return '<div style="font-family:Arial,sans-serif;font-size:9px;color:#111;height:100%;display:flex;flex-direction:column;gap:5px">'
    // Header strip
    +'<div style="display:flex;align-items:center;gap:10px;border-left:4px solid '+acCol+';padding:4px 8px">'
    +'<div><div style="font-size:12px;font-weight:800;color:'+acCol+'">'+f.ac.replace('ZK-','')+' <span style="color:#444;font-weight:400;font-size:10px">'+a.type+'</span></div>'
    +'<div style="font-size:8px;color:#666">TRUE SOUTH FLIGHTS — LOADSHEET</div></div>'
    +'<div style="flex:1"></div>'
    +'<div style="text-align:right;font-size:9px"><div><b>'+(APTS[f.dep]||f.dep||'—')+'</b> → <b>'+(APTS[f.dest]||f.dest||'—')+'</b></div>'
    +'<div style="color:#666">'+f.date+' &nbsp; ETD '+(f.etd||'—')+'</div></div></div>'
    // Status
    +'<div style="padding:4px 8px;border:1.5px solid '+statusBorder+';border-radius:4px;background:'+statusBg+';color:'+statusColor+';font-weight:800;font-size:9px">'+(allOk?'✓  ALL LIMITS WITHIN RANGE':'⚠  ONE OR MORE LIMITS EXCEEDED')+'</div>'
    // Two-col: flight info + W&B
    +'<div style="display:flex;gap:8px">'
    +'<table style="flex:1;border-collapse:collapse;font-size:9px"><tr><th colspan="2" style="'+TH+'">FLIGHT</th></tr>'
    +'<tr><td style="'+TD+'color:#666">PIC</td><td style="'+TD+'font-weight:700">'+esc(f.pic)+'</td></tr>'
    +(f.coPilot?'<tr><td style="'+TD+'color:#666">Co-Pilot</td><td style="'+TD+'">'+esc(f.coPilot)+'</td></tr>':'')
    +(r?'<tr><td style="'+TD+'color:#666">TOW</td><td style="'+TD+'font-weight:700;color:'+(r.towOk?'#15803d':'#b91c1c')+'">'+r.tow.toFixed(1)+' / '+a.mtow+' kg</td></tr>':'')
    +(r?'<tr><td style="'+TD+'color:#666">Land Wt</td><td style="'+TD+'font-weight:700;color:'+(r.lwOk?'#15803d':'#b91c1c')+'">'+r.lw.toFixed(1)+' / '+a.mlw+' kg</td></tr>':'')
    +(r?'<tr><td style="'+TD+'color:#666">C of G</td><td style="'+TD+'font-weight:700;color:'+(r.cogOk?'#15803d':'#b91c1c')+'">'+r.towCog.toFixed(2)+'" ('+a.cogMin+'–'+a.cogMax+'")</td></tr>':'')
    +'</table>'
    +'<table style="flex:1;border-collapse:collapse;font-size:9px"><tr><th colspan="2" style="'+TH+'">FUEL</th></tr>'
    +'<tr><td style="'+TD+'color:#666">Loaded</td><td style="'+TD+'">'+fuelKgV.toFixed(1)+' kg ('+fuelDisplay+' '+fuelU+')</td></tr>'
    +'<tr><td style="'+TD+'color:#666">Gnd burn</td><td style="'+TD+'">'+_gndBurnV+' kg</td></tr>'
    +'<tr><td style="'+TD+'color:#666">Flt burn</td><td style="'+TD+'">'+(f.burnOff||a.burnDef)+' '+(a.burnDefUnit||'kg')+'</td></tr>'
    +'<tr style="background:'+acFaint+'"><td style="'+TD+'border-left:2px solid '+acCol+';font-weight:700">@ Dest</td><td style="'+TD+'font-weight:700">'+remDisplay+' '+fuelU+'</td></tr>'
    +'</table></div>'
    // Occupants
    +'<table style="width:100%;border-collapse:collapse;font-size:9px"><tr><th colspan="4" style="'+TH+'">OCCUPANTS</th></tr>'
    +'<tr><th style="'+TH+'">Seat</th><th style="'+TH+'">Name</th><th style="'+TH+'text-align:right">Wt kg</th><th style="'+TH+'text-align:right">Bag kg</th></tr>'
    +seatRows
    +(cargoRows?'<tr><th colspan="2" style="'+TH+'">CARGO</th><th colspan="2" style="'+TH+'"></th></tr>'+cargoRows:'')
    +'</table>'
    // Signature
    +'<div style="margin-top:auto">'
    +'<table style="width:100%;border-collapse:collapse;font-size:9px"><tr><th colspan="2" style="'+TH+'">PIC CERTIFICATION</th></tr>'
    +'<tr><td colspan="2" style="'+TD+'font-style:italic;color:#555;font-size:8px">I hereby certify the particulars above are correct'+(a.type&&a.type.includes('208')?' and Part 125 security measures followed':'')+'.</td></tr>'
    +(f.sig?'<tr><td style="'+TD+'color:#666;width:25%">Signature</td><td style="'+TD+'"><img src="'+f.sig+'" style="max-height:36px;display:block"></td></tr>'
           :'<tr><td style="'+TD+'color:#666">Signature</td><td style="'+TD+'padding:16px 6px">_____________________________</td></tr>')
    +'<tr><td style="'+TD+'color:#666">Name / Date</td><td style="'+TD+'">'+esc(f.pic)+' &nbsp; '+f.date+'</td></tr>'
    +'</table></div>'
    +'</div>';
}
function _openPrintWindow(sheets){
  var contents=sheets.map(generateHalfSheetContent);
  var pairs=[];
  for(var i=0;i<contents.length;i+=2){
    pairs.push('<div class="pp">'
      +'<div class="lsh">'+contents[i]+'</div>'
      +(contents[i+1]?'<div class="lsh brd">'+contents[i+1]+'</div>':'<div class="lsh"></div>')
      +'</div>');
  }
  var _acs=[];sheets.forEach(function(s){var a=s&&s.form&&s.form.ac;if(a&&_acs.indexOf(a)<0)_acs.push(a);});
  var _ptitle=(_acs.length===1)?(_acs[0]+' Loadsheet'):(sheets.length>1?'Loadsheets':'Loadsheet');
  var w=window.open('','_blank','width=900,height=750');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+esc(_ptitle)+'</title>'
    +'<style>'
    +'*{box-sizing:border-box;margin:0;padding:0}'
    +'body{background:#fff;font-family:Arial,sans-serif}'
    +'@page{size:A4 portrait;margin:6mm}'
    +'.pp{display:flex;flex-direction:column;height:277mm;page-break-after:always}'
    +'.pp:last-child{page-break-after:auto}'
    +'.lsh{flex:1;overflow:hidden;padding:5mm}'
    +'.lsh.brd{border-top:1px dashed #bbb}'
    +'@media print{body{padding:0}}'
    +'</style>'
    +'</head><body>'+pairs.join('')
    +'<script>window.onload=function(){window.print();}<\/script>'
    +'</body></html>');
  w.document.close();try{w.document.title=_ptitle;}catch(e){}
}
window.printSingleSheet=function(id){
  var sheet=S.saved.find(function(s){return s.id===id;});
  if(!sheet)return;
  _openPrintWindow([sheet]);
};
window.printMultiSheet=function(ids){
  var sheets=ids.map(function(id){return S.saved.find(function(s){return s.id===id;});}).filter(Boolean);
  if(!sheets.length)return;
  _openPrintWindow(sheets);
};
window.uploadSingleSheet=async function(id){
  const sheet=S.saved.find(function(s){return s.id===id;});
  if(!sheet){return;}
  if(!S.gdriveEnabled||!S.gdriveClientId){toast('Google Drive not configured — check Admin > Google Drive.','warn');return;}
  toast('Uploading to Drive…','info');
  try{
    await uploadToDrive(sheet,null);
    toast('Uploaded to Drive ✓','ok');render();
  }catch(e){
    toast('Upload failed: '+(e&&e.message||e),'err');
  }
};

window.editMaintCell=function(cell,date,ac){
  initMaintenance();
  const subTab=S.maintLogSubTab||'hours';
  var e=S.maintenance.hist.find(function(x){return x.date===date;});
  var oilE=(S.maintenance.oil||[]).find(function(x){return x.date===date;});

  if(subTab==='hours'){
    const cur=e?e[ac]:'';
    const val=prompt('TTIS for '+ac+' on '+fmtMaintDate(date)+':', cur||'');
    if(val===null) return;
    const v=parseFloat(val);
    if(!e){e={date};S.maintenance.hist.push(e);S.maintenance.hist.sort(function(a,b){return a.date.localeCompare(b.date);});}
    if(v&&v>0) e[ac]=v; else delete e[ac];
  } else if(subTab==='starts'){
    const cur=e?e[ac+'_starts']||'':'';
    const val=prompt('Starts for '+ac+' on '+fmtMaintDate(date)+':', cur);
    if(val===null) return;
    const v=parseInt(val);
    if(!e){e={date};S.maintenance.hist.push(e);S.maintenance.hist.sort(function(a,b){return a.date.localeCompare(b.date);});}
    if(v>0) e[ac+'_starts']=v; else delete e[ac+'_starts'];
  } else if(subTab==='landings'){
    const cur=e?e[ac+'_landings']||'':'';
    const val=prompt('Landings for '+ac+' on '+fmtMaintDate(date)+':', cur);
    if(val===null) return;
    const v=parseInt(val);
    if(!e){e={date};S.maintenance.hist.push(e);S.maintenance.hist.sort(function(a,b){return a.date.localeCompare(b.date);});}
    if(v>0) e[ac+'_landings']=v; else delete e[ac+'_landings'];
  } else if(subTab==='oil'){
    const cur=oilE?oilE[ac]||'':'';
    const val=prompt('Oil added (qts) for '+ac+' on '+fmtMaintDate(date)+':', cur);
    if(val===null) return;
    const v=parseFloat(val);
    if(!oilE){oilE={date};S.maintenance.oil=S.maintenance.oil||[];S.maintenance.oil.push(oilE);S.maintenance.oil.sort(function(a,b){return a.date.localeCompare(b.date);});}
    if(v>0) oilE[ac]=v; else delete oilE[ac];
  }

  saveMaintenance();auditLog('maint_edit',{ac,date,field:subTab});render();
};

window.calcHoursUsed=function(){
  const ttis=parseFloat(document.getElementById('ml_hours')?.value);
  const ac=S.maintEntryAc||'ZK-SLD';
  const prev=maintGetLatest(ac);
  const el=document.getElementById('ml_used');
  if(!el) return;
  if(ttis&&ttis>0&&prev&&prev>0){
    const used=Math.round((ttis-prev)*10)/10;
    el.value=used>0?used:'';
    el.style.color=used>0?'var(--text)':'#ef4444';
  } else {
    el.value='';
  }
};
window.calcTTIS=function(){
  const used=parseFloat(document.getElementById('ml_used')?.value);
  const ac=S.maintEntryAc||'ZK-SLD';
  const prev=maintGetLatest(ac);
  const el=document.getElementById('ml_hours');
  if(!el) return;
  if(used&&used>0&&prev&&prev>0){
    const ttis=Math.round((prev+used)*10)/10;
    el.value=ttis;
  } else {
    el.value='';
  }
};

/* acDisp() moved to shared.js (single canonical definition) */

// --- Role Permissions Table ---
let _permSaveTimer=null;
window.toggleRolePerm=function(role,perm,val){
  var _permOk=(S.user&&(S.user.superAdmin||S.user.role==='superadmin'))||(typeof hasRolePerm==='function'&&hasRolePerm('admin_users'));
  if(!_permOk){toast('Not authorised to change permissions.','warn');return;}
  if(!S.rolePerms)S.rolePerms={};
  if(!S.rolePerms[role])S.rolePerms[role]=Object.assign({},(DEFAULT_ROLE_PERMS[role])||{});
  if(perm==='roster_leave'){S.rolePerms[role]['roster']=val;S.rolePerms[role]['leave']=val;}
  else{S.rolePerms[role][perm]=val;}
  // Mark as locally edited so a realtime ts_settings reload won't clobber it, and persist immediately (debounced).
  S._permsEditTs=Date.now();
  lsSet('ts_role_perms',S.rolePerms);
  clearTimeout(_permSaveTimer);
  _permSaveTimer=setTimeout(function(){window.saveRolePerms(true);},700);
  render();
};

window.saveRolePerms=async function(silent){
  S._permsEditTs=Date.now();
  const res=await sbU('ts_settings',[{key:'role_perms',value:JSON.stringify(S.rolePerms||{})}]);
  if(res===null){if(!silent)toast('Save failed — check connection and try again','error');return;}
  lsSet('ts_role_perms',S.rolePerms);
  S._permsEditTs=Date.now();
  auditLog('role_perms_save','Saved role permissions');
  if(!silent)toast('Permissions saved','success');
};

function renderAdminPerms(){
  S._permsPageTs=Date.now();   // mark the grid as actively on screen (blocks reload clobber)
  // Permissions grouped by area so the (wide) grid is easy to scan and find things in.
  var PERM_GROUPS=[
    {cat:'Operations', col:'#2563eb', perms:[
      {k:'operations',    lbl:'Ops',        tip:'Combined operational access: Bookings, Seatmap, Loadsheets, Charter, Calendar, Ground/Transport, Resources board & Weather calls'},
      {k:'sign_loadsheet',lbl:'Sign',       tip:'Sign off on loadsheets as PIC'}
    ]},
    {cat:'Maintenance', col:'#a78bfa', perms:[
      {k:'maintenance',   lbl:'Maint',      tip:'Access to the maintenance section'},
      {k:'maint_bookings',lbl:'Bookings',   tip:'Manage maintenance bookings'}
    ]},
    {cat:'Roster & Leave', col:'#f59e0b', perms:[
      {k:'roster_leave',  lbl:'Roster & Leave', tip:'View the roster and submit/view own leave requests'},
      {k:'roster_edit',   lbl:'Roster Edit',    tip:'Edit the roster and build patterns (otherwise view-only)'},
      {k:'leave_approve', lbl:'Approvals',      tip:'Approve or decline leave requests from staff'},
      {k:'reports_to',    lbl:'Reports to',     tip:'Access the Reports-to org chart (set who reports to whom) under Roster'},
      {k:'pay_week',      lbl:'Pay Week',       tip:'See the pay-week (Thu–Wed) roster view'}
    ]},
    {cat:'Pilot', col:'#22c55e', perms:[
      {k:'pilotbag',      lbl:'Pilot Bag',   tip:'Access the Pilot Bag section (Flight Record, Logbooks, Flight & Duty)'},
      {k:'flightduty',    lbl:'F&D',         tip:'Access Flight & Duty — own record + team summary'},
      {k:'flightduty_manage',lbl:'F&D Mgr',  tip:'See & certify all pilots\' Flight & Duty records (Chief Pilot)'},
      {k:'flightrecord',  lbl:'Flt Record',  tip:'Access the Flight Record (log flights, aircraft records)'},
      {k:'flightrecord_manage',lbl:'Flt Rec Mgr',tip:'Flight Record statistics + view/manage all pilots\' logbooks'},
      {k:'data_recording',lbl:'Data Rec',  tip:'Access the Data Recording section — aircraft records, statistics & the full records table'}
    ]},
    {cat:'Admin & System', col:'#ef4444', perms:[
      {k:'settings',      lbl:'Settings',    tip:'Access the Settings section (sub-pages still gated individually)'},
      {k:'ops_notices_manage',lbl:'Ops Notices',tip:'Create & issue Operations Notices and see read receipts (everyone can read notices applicable to them)'},
      {k:'admin_crew',    lbl:'Crew',        tip:'View and edit crew profiles and endorsements'},
      {k:'businessplan',  lbl:'Biz Plan',    tip:'View the confidential TSF Business Plan'}
    ]},
    {cat:'Coming soon', col:'#64748b', perms:[
      {k:'sms',           lbl:'SMS',         tip:'Safety Management System (placeholder — coming soon)'},
      {k:'vehicle_prestart',lbl:'Vehicle Prestart',tip:'Daily vehicle prestart checks (placeholder — coming soon)'},
      {k:'training_mod',  lbl:'Training',    tip:'Training records module (placeholder — coming soon)'}
    ]}
  ];
  // Flatten with group metadata (first-in-group → separator + group colour).
  var PERM_COLS=[];
  PERM_GROUPS.forEach(function(g){g.perms.forEach(function(p,i){PERM_COLS.push(Object.assign({_first:i===0,_col:g.col},p));});});
  var ROLE_ROWS=[
    {k:'admin',lbl:'Admin'},{k:'cx_manager',lbl:'CX Mgr'},{k:'pilot',lbl:'Pilot'},{k:'desk',lbl:'Desk'},
    {k:'maint',lbl:'Maint'},{k:'ground_staff',lbl:'Ground'},{k:'accounts',lbl:'Accounts'},{k:'marketing',lbl:'Marketing'}
  ];
  var rp=S.rolePerms||{};
  var _sepFor=function(col){return col._first?('border-left:3px solid '+col._col+'66;'):'';};
  var h='<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
    +'<div class="st" style="margin-bottom:0">Role Permissions</div>'
    +'<button onclick="window.saveRolePerms()" style="padding:7px 14px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">Save</button>'
    +'</div>'
    +'<div style="overflow-x:auto">'
    +'<table style="border-collapse:collapse;min-width:100%;font-size:12px">'
    +'<thead>';
  // Group header row (category labels spanning their columns).
  h+='<tr><th style="padding:0 8px"></th>';
  PERM_GROUPS.forEach(function(g){
    h+='<th colspan="'+g.perms.length+'" style="padding:4px 4px 5px;text-align:center;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:'+g.col+';border-left:3px solid '+g.col+'66;border-bottom:2px solid '+g.col+'33;white-space:nowrap">'+g.cat+'</th>';
  });
  h+='</tr>';
  // Column header row.
  h+='<tr><th style="text-align:left;padding:6px 8px;color:var(--text3);font-weight:600;white-space:nowrap">Role</th>';
  PERM_COLS.forEach(function(col){
    h+='<th title="'+col.tip+'" style="padding:6px 4px;color:var(--text3);font-weight:600;text-align:center;white-space:nowrap;cursor:help;'+_sepFor(col)+'">'+col.lbl+'</th>';
  });
  h+='</tr></thead><tbody>';
  ROLE_ROWS.forEach(function(row,ri){
    var base=DEFAULT_ROLE_PERMS[row.k]||{};
    var over=rp[row.k]||{};
    var bg=ri%2===0?'background:var(--card2)':'';
    h+='<tr style="'+bg+'"><td style="padding:7px 8px;font-weight:600;white-space:nowrap;color:var(--text1)">'+row.lbl+'</td>';
    PERM_COLS.forEach(function(col){
      var eff;
      if(col.k==='roster_leave'){
        var r1=over['roster']!==undefined?over['roster']:base['roster']||false;
        var r2=over['leave']!==undefined?over['leave']:base['leave']||false;
        eff=r1||r2;
      } else if(col.k==='settings'||col.k==='pilotbag'){
        // Unlocked by default for every role — show ticked unless explicitly turned off.
        eff=over[col.k]!==undefined?over[col.k]:(base[col.k]!==undefined?base[col.k]:true);
      } else {
        eff=over[col.k]!==undefined?over[col.k]:base[col.k]||false;
      }
      h+='<td style="text-align:center;padding:4px;'+_sepFor(col)+'">'
        +'<input type="checkbox" '+(eff?'checked':'')+' '
        +"onchange=\"window.toggleRolePerm('"+row.k+"','"+col.k+"',this.checked)\" "
        +'style="width:16px;height:16px;cursor:pointer;accent-color:var(--accent)">'
        +'</td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  // Column guide grouped by category.
  h+='<div style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px">';
  PERM_GROUPS.forEach(function(g){
    h+='<div style="background:var(--card2);border:1px solid var(--border);border-left:3px solid '+g.col+';border-radius:8px;padding:10px 12px">'
      +'<div style="font-size:11px;font-weight:800;color:'+g.col+';text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">'+g.cat+'</div>';
    g.perms.forEach(function(col){
      h+='<div style="font-size:11px;color:var(--text2);margin-bottom:3px"><span style="font-weight:700;color:var(--text1)">'+col.lbl+'</span> — '+col.tip+'</div>';
    });
    h+='</div>';
  });
  h+='</div>'
    +'<p style="font-size:11px;color:var(--text3);margin-top:12px">Superadmin always has full access. Hover a column header for its description. Changes apply after Save.</p>'
    +'</div>';
  return h;
}
// --- Audit Log ---
function renderAdminAudit(){
  var log=(S.auditLog||[]).slice().sort(function(a,b){return b.time>a.time?1:-1;});
  if(!log.length){
    return'<div class="card"><div class="st">Audit Log</div><p style="color:var(--text3)">No audit entries yet.</p></div>';
  }
  function fmtTime(t){
    if(!t)return'';
    var d=new Date(t);
    var now=new Date();
    var diff=now-d;
    if(diff<60000)return'just now';
    if(diff<3600000)return Math.floor(diff/60000)+'m ago';
    if(diff<86400000)return Math.floor(diff/3600000)+'h ago';
    return d.toLocaleDateString('en-NZ',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('en-NZ',{hour:'2-digit',minute:'2-digit'});
  }
  function fmtFull(t){if(!t)return'';var d=new Date(t);return d.toLocaleString('en-NZ',{weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  // Turn raw action+detail into a plain-English summary.
  function _auditAction(a){
    var M={session_restore:'Signed in',login:'Signed in',logout:'Signed out',login_fail:'Failed sign-in',
      role_perms_save:'Updated permissions',admin_kick:'Signed a user out',
      ls_save:'Saved loadsheet',ls_sign:'Signed loadsheet',manifest_save:'Saved manifest',
      crew_save:'Updated crew profile',user_save:'Updated user account',aircraft_save:'Updated aircraft data',
      leave_submit:'Submitted leave',leave_submitted:'Submitted leave',leave_approve:'Approved leave',leave_approved:'Approved leave',leave_decline:'Declined leave',leave_declined:'Declined leave'};
    return M[a]||(a?a.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}):'Activity');
  }
  function _auditDetail(e){
    var raw=e.detail,obj=null;
    if(raw&&typeof raw==='object')obj=raw;
    else if(typeof raw==='string'){var t=raw.trim();if(t.charAt(0)==='{'||t.charAt(0)==='['){try{obj=JSON.parse(t);}catch(_){obj=null;}}}
    if(!obj)return (typeof raw==='string'&&raw.charAt(0)!=='{')?raw:'';
    var bits=[];
    if(obj.via==='remember_me')bits.push('remembered device');
    else if(obj.via==='session')bits.push('saved session');
    if(obj.targetName||obj.target)bits.push('user: '+(obj.targetName||obj.target));
    if(obj.name&&!obj.via)bits.push(obj.name);
    if(obj.ac)bits.push(obj.ac);
    if(obj.type)bits.push(obj.type);
    return bits.join(' · ');
  }
  // Collapse runs of the same person doing the same action close together into one row
  // (e.g. a burst of manifest autosaves) so the log is readable. Newest-first ordering
  // means consecutive duplicates sit next to each other; we keep the most-recent time and
  // tally a ×N count. The underlying audit rows are untouched — this only thins the view.
  var GROUP_MS=10*60000; // 10 minutes
  var grouped=[];
  log.forEach(function(e){
    var prev=grouped[grouped.length-1];
    if(prev&&(prev.name||prev.user||'')===(e.name||e.user||'')&&prev.action===e.action
       &&Math.abs(new Date(prev.time)-new Date(e.time))<GROUP_MS){
      prev._count=(prev._count||1)+1;
    } else {
      grouped.push(Object.assign({},e,{_count:1}));
    }
  });
  var _show=S._auditShow||200;
  var rows=grouped.slice(0,_show).map(function(e){
    var rawDet=typeof e.detail==='object'?JSON.stringify(e.detail):String(e.detail||'');
    var det=_auditDetail(e);
    var cnt=e._count>1?' <span style="font-size:10px;font-weight:700;color:var(--acc);background:rgba(99,102,241,.12);border-radius:10px;padding:0 6px">×'+e._count+'</span>':'';
    return'<tr style="border-bottom:1px solid var(--border)">'
      +'<td title="'+esc(fmtFull(e.time))+'" style="padding:7px 8px;font-size:11px;color:var(--text3);white-space:nowrap;cursor:help">'+fmtTime(e.time)+'</td>'
      +'<td style="padding:7px 8px;font-size:12px;font-weight:600;white-space:nowrap">'+esc(e.name||e.user||'')+'</td>'
      +'<td style="padding:7px 8px;font-size:11px;color:var(--text3)">'+esc(e.role||'')+'</td>'
      +'<td style="padding:7px 8px;font-size:12px">'+esc(_auditAction(e.action))+cnt+'</td>'
      +'<td title="'+esc(rawDet)+'" style="padding:7px 8px;font-size:11px;color:var(--text3);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(det)+'</td>'
      +'</tr>';
  }).join('');
  return'<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
    +'<div class="st" style="margin-bottom:0">Audit Log</div>'
    +'<span style="font-size:11px;color:var(--text3)">Showing '+Math.min(grouped.length,_show)+' of '+grouped.length+(S._auditNoMore?'':'+')+' entries</span>'
    +'</div>'
    +'<div style="overflow-x:auto">'
    +'<table style="border-collapse:collapse;width:100%;font-size:12px">'
    +'<thead><tr>'
    +'<th style="padding:6px 8px;text-align:left;color:var(--text3);font-weight:600;white-space:nowrap">When</th>'
    +'<th style="padding:6px 8px;text-align:left;color:var(--text3);font-weight:600">Name</th>'
    +'<th style="padding:6px 8px;text-align:left;color:var(--text3);font-weight:600">Role</th>'
    +'<th style="padding:6px 8px;text-align:left;color:var(--text3);font-weight:600">Action</th>'
    +'<th style="padding:6px 8px;text-align:left;color:var(--text3);font-weight:600">Detail</th>'
    +'</tr></thead>'
    +'<tbody>'+rows+'</tbody>'
    +'</table></div>'
    +((grouped.length>_show||!S._auditNoMore)
        ?'<div style="text-align:center;margin-top:12px"><button class="btn btn-ghost" style="font-size:12px" onclick="window.auditShowMore()">Show more ↓</button></div>'
        :'')
    +'</div>';
}
window.auditShowMore=function(){
  S._auditShow=(S._auditShow||200)+200;
  var log=S.auditLog||[];
  // Pull older entries from the server if more may exist, using the explicit paging cursor
  // (robust even once the in-memory log is capped).
  if(!S._auditNoMore&&typeof _loadAuditLog==='function'){
    var cur=S._auditCursor||(log.length?log[log.length-1].time:null);
    if(cur)_loadAuditLog({before:cur,more:true});
  }
  render();
};
