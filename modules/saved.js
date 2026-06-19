// === MODULE: saved === v1.0 ===
function _lsRelTime(iso){
  if(!iso) return '';
  var d=new Date(iso),now=new Date();
  var h=d.getHours(),mn=d.getMinutes();
  var hm=(h<10?'0':'')+h+':'+(mn<10?'0':'')+mn;
  var todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var dStart=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  var dayDiff=Math.round((todayStart-dStart)/86400000);
  if(dayDiff===0) return 'Today '+hm;
  if(dayDiff===1) return 'Yesterday '+hm;
  if(dayDiff<=6) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]+' '+hm;
  var dd=d.getDate(),mm=d.getMonth()+1,yy=String(d.getFullYear()).slice(-2);
  return (dd<10?'0':'')+dd+'-'+(mm<10?'0':'')+mm+'-'+yy;
}
function _fmtFlightDate(iso){
  if(!iso)return '?';
  var d=new Date(iso+'T00:00:00');
  var today=new Date();today.setHours(0,0,0,0);
  var dd=new Date(iso+'T00:00:00');dd.setHours(0,0,0,0);
  var diff=Math.round((today-dd)/86400000);
  var mons=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if(diff===0)return 'Today';
  if(diff===1)return 'Yesterday';
  if(diff>1&&diff<=6)return days[d.getDay()]+' '+d.getDate()+' '+mons[d.getMonth()];
  if(diff===-1)return 'Tomorrow';
  if(diff>=-6&&diff<0)return days[d.getDay()]+' '+d.getDate()+' '+mons[d.getMonth()];
  return d.getDate()+' '+mons[d.getMonth()]+' '+d.getFullYear();
}
function renderSaved(){
  const tab=S.savedTab||'active';
  const search=(S.savedSearch||'').toLowerCase();
  const sort=S.savedSort||'newest';

  // Counts
  const binLs=S.saved.filter(s=>s.status==='deleted');
  const binMs=S.manifests.filter(m=>m._deleted);
  const binCount=binLs.length+binMs.length;
  const activeManifests=S.manifests.filter(m=>!m._deleted);
  const activeItems=S.saved.filter(s=>s.status==='unsigned');
  const signedItems=S.saved.filter(s=>s.status==='complete'&&!s.driveUploaded);
  const archiveItems=S.saved.filter(s=>s.status==='complete'&&s.driveUploaded);

  const _selCount=Object.keys(S.savedSel).length;
  const _selSignedCount=Object.keys(S.savedSel).filter(id=>{const s=S.saved.find(x=>x.id===id);return s&&s.status==='complete';}).length;
  const _bulkBar=_selCount>0&&tab!=='bin'?`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1e1a00;border:1px solid #ca8a04;border-radius:8px;margin-bottom:10px">
    <span style="font-size:13px;font-weight:600;color:#fde68a;flex:1">${_selCount} item(s) selected</span>
    <button onclick="window.openSelectedSaved()" style="padding:5px 12px;border-radius:6px;border:none;background:#7c3aed;color:#fff;font-size:12px;font-weight:700;cursor:pointer">📂 Open (${_selCount})</button>
    <button onclick="window.clearSavedSel()" style="padding:5px 12px;border-radius:6px;border:1px solid #ca8a04;background:transparent;color:#fde68a;font-size:12px;cursor:pointer">Clear</button>
    <button onclick="window.printMultiSheet(Object.keys(S.savedSel))" style="padding:5px 12px;border-radius:6px;border:none;background:#374151;color:#fff;font-size:16px;font-weight:700;cursor:pointer" title="Print selected">&#x1F5A8;</button>
    ${_selSignedCount>0?`<button onclick="window.bulkUploadSaved()" style="padding:5px 14px;border-radius:6px;border:none;background:#1a73e8;color:#fff;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;box-shadow:0 1px 4px rgba(26,115,232,.4)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>Upload to Drive (${_selSignedCount})</button>`:''}
    <button onclick="window.bulkDeleteSaved()" style="padding:5px 12px;border-radius:6px;border:none;background:#ef4444;color:#fff;font-size:12px;font-weight:700;cursor:pointer">🗑 Move to Bin (${_selCount})</button>
  </div>`:'';
  const tabBar=`<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
    <button class="sub-tab ${tab==='active'?'on':''}" onclick="S.savedTab='active';render()">Active (${activeItems.length})</button>
    <button class="sub-tab ${tab==='signed'?'on':''}" onclick="S.savedTab='signed';render()">Signed (${signedItems.length})</button>
    <button class="sub-tab ${tab==='archive'?'on':''}" onclick="S.savedTab='archive';render()">Archive (${archiveItems.length})</button>
    <button class="sub-tab ${tab==='manifests'?'on':''}" onclick="S.savedTab='manifests';render()">Manifests (${activeManifests.length})</button>
    <button class="sub-tab ${tab==='bin'?'on':''}" onclick="S.savedTab='bin';render()">🗑️ Bin${binCount>0?' ('+binCount+')':''}</button>
  </div>`;

  // ── Bin tab ──
  if(tab==='bin'){
    const _bf=S.binFilter||'all';
    return tabBar+`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <button class="sub-tab ${_bf==='all'?'on':''}" style="font-size:11px;padding:4px 10px" onclick="S.binFilter='all';render()">All (${binCount})</button>
        <button class="sub-tab ${_bf==='ls'?'on':''}" style="font-size:11px;padding:4px 10px" onclick="S.binFilter='ls';render()">Loadsheets (${binLs.length})</button>
        <button class="sub-tab ${_bf==='ms'?'on':''}" style="font-size:11px;padding:4px 10px" onclick="S.binFilter='ms';render()">Manifests (${binMs.length})</button>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        ${activeManifests.length?`<button class="btn btn-red" style="font-size:12px" onclick="window.clearAllManifests()">&#x1f5d1; Clear All Manifests (${activeManifests.length})</button>`:''}
        ${binCount>0?`<button class="btn btn-red" style="font-size:12px" onclick="window.emptyBin()">🗑️ Empty Bin</button>`:''}
      </div>
    </div>`+
    (!binCount
      ?`<div class="card" style="text-align:center;padding:40px;color:var(--text3)">🗑️ Bin is empty</div>`
      :((_bf!=='ms'?binLs.map(s=>{
          const col=AC_COL[s.form.ac]||'#64748b';
          const _savedStr=s.savedAt?_lsRelTime(s.savedAt):'';
          return`<div style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;border:1px solid var(--border);margin-bottom:8px;background:var(--card);border-left:3px solid #ef444488;opacity:.85">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
                <span style="padding:2px 8px;border-radius:20px;background:${col}22;border:1px solid ${col}55;color:${col};font-weight:700;font-size:12px">${(s.form.ac||'?').replace('ZK-','')}</span>
                <span class="pill pill-blue">${(s.form.dep||'?').replace(/^NZ/,'')} → ${(s.form.dest||'?').replace(/^NZ/,'')}</span>
                ${s.form.pic?`<span style="padding:2px 7px;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.35);border-radius:4px;font-size:10px;font-weight:700;color:#c4b5fd">✈ ${s.form.pic}</span>`:''}
                <span class="pill pill-warn" style="font-size:10px">Loadsheet</span>
              </div>
              <div style="font-size:11px;color:var(--text3)">${_savedStr?'Saved '+_savedStr:''}</div>
            </div>
            <div style="display:flex;gap:5px;flex-shrink:0">
              <button class="btn btn-ghost" style="font-size:12px;padding:6px 10px" onclick="window.restoreFromBin('${s.id}')">↩ Restore</button>
              <button class="btn btn-red" style="font-size:12px;padding:6px 10px" onclick="window.permDeleteFromBin('${s.id}')">🗑 Delete</button>
            </div></div>`;
        }).join(''):'')+
        (_bf!=='ls'?binMs.map(m=>{
          const _savedStr=m.savedAt?_lsRelTime(m.savedAt):'';
          return`<div style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;border:1px solid var(--border);margin-bottom:8px;background:var(--card);border-left:3px solid #ef444488;opacity:.85">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="font-weight:600;font-size:14px">${m.name||'Unnamed'}</span>
                <span class="pill pill-warn" style="font-size:10px">Manifest</span>
              </div>
              <div style="font-size:11px;color:var(--text3)">${_savedStr?_savedStr+' · ':''} ${m.data?.pax?.length||0} pax</div>
            </div>
            <div style="display:flex;gap:5px;flex-shrink:0">
              <button class="btn btn-ghost" style="font-size:12px;padding:6px 10px" onclick="window.restoreFromBin('${m.id}')">↩ Restore</button>
              <button class="btn btn-red" style="font-size:12px;padding:6px 10px" onclick="window.permDeleteFromBin('${m.id}')">🗑 Delete</button>
            </div></div>`;
        }).join(''):'')));
  }

  // ── Shared card renderer ──
  function _lsCard(s,opts){
    opts=opts||{};
    var col=AC_COL[s.form.ac]||'#64748b';
    var isCpCrew=!!s.form.coPilot;
    var _names=s.form.names||{},_infants=s.form.infantNames||{},_types=s.form.paxType||{};
    var _paxA=0,_paxC=0,_paxI=0;
    Object.keys(_names).forEach(function(k){var ki=parseInt(k);if(ki<1)return;if(ki===1&&isCpCrew)return;var nm=(_names[k]||'').trim();if(!nm)return;if(_infants[ki])return;var t=_types[ki]||'A';if(t==='C')_paxC++;else _paxA++;});
    Object.keys(_infants).forEach(function(k){var ki=parseInt(k);if(_infants[ki]&&(_names[ki]||'').trim())_paxI++;});
    var paxCnt=_paxA+_paxC+_paxI;
    var paxSummary=(_paxA?_paxA+'A ':'')+(_paxC?_paxC+'C ':'')+(_paxI?_paxI+'i':'');
    if(!paxSummary)paxSummary=paxCnt?paxCnt+' PAX':'0 PAX';else paxSummary=paxSummary.trim();
    var savedStr=s.savedAt?_lsRelTime(s.savedAt):'';
    var isSigned=s.status==='complete';
    var r=calcFormWB(s.form);
    var ok=r&&r.towOk&&r.lwOk&&r.cogOk;
    var sel=!!S.savedSel[s.id];
    var sid=s.id;
    var _canUpload=(S.gdriveEnabled||S.gdriveClientId)&&opts.showUploadBtn;
    var rhsBadge=opts.showNotUploaded&&!s.driveUploaded
      ?(_canUpload
        ?'<span onclick="event.stopPropagation();window.uploadSingleSheet(\''+sid+'\')" title="Upload to Drive" style="padding:2px 7px;background:rgba(100,116,139,.1);border:1px solid var(--border2);border-radius:4px;font-size:12px;color:var(--text3);cursor:pointer;user-select:none">☁</span>'
        :'<span style="padding:2px 7px;background:rgba(100,116,139,.1);border:1px solid var(--border2);border-radius:4px;font-size:12px;color:var(--text3)">☁</span>')
      :opts.showUploaded&&s.driveUploaded
      ?'<span style="padding:2px 7px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);border-radius:4px;font-size:10px;color:#4ade80">☁ Drive ✓</span>'
      :'';
    var limitWarn=isSigned&&!ok?'<span class="pill pill-warn" style="font-size:10px">⚠ check limits</span>':'';
    function _whoAt(nm,isoTs){
      if(!nm&&!isoTs)return '';
      var ini=nm?(nm.trim().split(/\s+/).map(function(w){return w[0]||''}).join('').toUpperCase()):'?';
      if(!isoTs)return ini;
      var d=new Date(isoTs);var now=new Date();
      var sameDay=d.toDateString()===now.toDateString();
      var yest=new Date(now);yest.setDate(yest.getDate()-1);
      var wasYest=d.toDateString()===yest.toDateString();
      var hm=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
      var when=sameDay?'today at '+hm:wasYest?'yesterday at '+hm:d.getDate()+' '+'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[d.getMonth()]+' at '+hm;
      return ini+' '+when;
    }
    var _savedBy=s.form.savedBy||(s.form.createdBy||'');
    var savedStr2=_whoAt(_savedBy,s.savedAt);
    var signedStr=isSigned?_whoAt(s.form.sigBy||_savedBy,s.form.sigTs||s.savedAt):'';
    var uploadStr=s.driveUploaded?_whoAt(s.uploadedBy||'',s.uploadedAt||''):'';
    var uploadBtn='';
    var actionBtns=isSigned
      ?`<button class="btn btn-ghost" style="font-size:12px;padding:6px 10px" onclick="window.viewSaved('${sid}')">View</button><button class="btn" style="font-size:12px;padding:6px 10px;background:#854d0e;color:#fde68a;border:none;border-radius:6px;cursor:pointer" onclick="window.reopenSaved('${sid}')">&#x21BA; Reopen</button>`
      :`<button class="btn btn-sky" style="font-size:12px;padding:6px 10px" onclick="editSaved('${sid}')">Edit</button>`;
    return `<div style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;border:1px solid ${sel?'#3b82f6':'var(--border)'};margin-bottom:8px;background:${sel?'rgba(59,130,246,.08)':'var(--card)'};border-left:3px solid ${col}">
      <input type="checkbox" ${sel?'checked':''} onchange="window.toggleSavedSel('${sid}')" style="width:16px;height:16px;accent-color:#3b82f6;flex-shrink:0;cursor:pointer">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
          <span style="padding:2px 10px;border-radius:20px;background:${col}22;border:1px solid ${col}55;color:${col};font-weight:700;font-size:12px;white-space:nowrap">${(s.form.ac||'?').replace('ZK-','')}</span>
          <span class="pill pill-blue">${(s.form.dep||'?').replace(/^NZ/,'')} → ${(s.form.dest||'?').replace(/^NZ/,'')}</span>
          ${s.form.pic?`<span style="padding:2px 7px;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.35);border-radius:4px;font-size:10px;font-weight:700;color:#c4b5fd">✈ ${s.form.pic}</span>`:''}
          ${limitWarn}
        </div>
        <div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap">
          <span style="padding:2px 7px;background:rgba(100,116,139,.12);border:1px solid rgba(100,116,139,.22);border-radius:4px;font-size:10px;font-weight:700;color:var(--text3)">${_fmtFlightDate(s.form.date)}</span>
          ${s.form.etd?`<span style="padding:2px 7px;background:rgba(59,130,246,.13);border:1px solid rgba(59,130,246,.28);border-radius:4px;font-size:10px;font-weight:700;color:#93c5fd">ETD ${s.form.etd}</span>`:''}
          <span style="padding:2px 7px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);border-radius:4px;font-size:10px;font-weight:700;color:#4ade80">${paxSummary}</span>
        </div>

      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end">
          ${savedStr2?`<span style="padding:1px 6px;background:rgba(100,116,139,.1);border:1px solid rgba(100,116,139,.18);border-radius:4px;font-size:10px;color:var(--text3)">Saved ${savedStr2}</span>`:''}
          ${signedStr?`<span style="padding:1px 6px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);border-radius:4px;font-size:10px;color:#4ade80">Signed ${signedStr}</span>`:''}
          ${uploadStr?`<span style="padding:1px 6px;background:rgba(26,115,232,.1);border:1px solid rgba(26,115,232,.25);border-radius:4px;font-size:10px;color:#93c5fd">☁ Uploaded ${uploadStr}</span>`:(rhsBadge||'')}
        </div>
        <div style="display:flex;gap:5px;align-items:center">
          ${actionBtns}${uploadBtn}
          <button class="btn" title="Print" style="font-size:16px;line-height:1;padding:5px 9px;background:var(--card2);color:var(--text2);border:1px solid var(--border2);border-radius:6px;cursor:pointer" onclick="window.printSingleSheet('${sid}')">&#x1F5A8;</button>
          <button class="btn" title="Duplicate" style="font-size:12px;padding:5px 9px;background:var(--card2);color:var(--text2);border:1px solid var(--border2);border-radius:6px;cursor:pointer" onclick="window.duplicateSaved('${sid}')">&#x2398; Dup</button>
          <button class="btn btn-red" style="font-size:16px;line-height:1;padding:5px 8px" onclick="delSaved('${sid}')" title="Delete">&#x1F5D1;</button>
        </div>
      </div>
    </div>`;
  }
  window._lsShowCreator=function(id){
    var s=(S.saved||[]).find(function(x){return x.id===id;});
    if(!s||!s.form)return;
    var f=s.form;
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
    var box=document.createElement('div');
    box.style.cssText='background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:22px;max-width:340px;width:100%';
    var cAt=f.createdAt?new Date(f.createdAt).toLocaleString('en-NZ',{dateStyle:'medium',timeStyle:'short'}):'';
    var sAt=s.savedAt?new Date(s.savedAt).toLocaleString('en-NZ',{dateStyle:'medium',timeStyle:'short'}):'';
    box.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
      +'<div style="font-size:16px;font-weight:700">Loadsheet History</div>'
      +'<button id="_lcClose" style="background:none;border:none;color:var(--text3);font-size:22px;cursor:pointer;padding:0 4px;line-height:1">&times;</button>'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;gap:10px">'
      +(f.createdBy?'<div style="padding:10px 14px;background:var(--card2);border-radius:8px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:3px">Created by</div><div style="font-size:14px;font-weight:700;color:var(--text1)">'+f.createdBy+'</div>'+(cAt?'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+cAt+'</div>':'')+'</div>':'')
      +(sAt?'<div style="padding:10px 14px;background:var(--card2);border-radius:8px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:3px">Last saved</div><div style="font-size:13px;font-weight:600;color:var(--text1)">'+sAt+'</div></div>':'')
      +'<div style="padding:10px 14px;background:rgba(100,116,139,.08);border-radius:8px;border:1px dashed var(--border2)"><div style="font-size:11px;color:var(--text3);text-align:center">Full edit history coming soon</div></div>'
      +'</div>';
    ov.appendChild(box);
    document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
    document.getElementById('_lcClose').onclick=function(){ov.remove();};
  };

  // ── Active tab (unsigned) ──
  if(tab==='active'){
    var _aSelCnt=Object.keys(S.savedSel).filter(function(id){return activeItems.find(function(s){return s.id===id;});}).length;
    var _aBulk=_aSelCnt>0?`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1e1a00;border:1px solid #ca8a04;border-radius:8px;margin-bottom:10px">
      <span style="font-size:13px;font-weight:600;color:#fde68a;flex:1">${_aSelCnt} selected</span>
      <button onclick="window.openSelectedSaved()" style="padding:5px 12px;border-radius:6px;border:none;background:#7c3aed;color:#fff;font-size:12px;font-weight:700;cursor:pointer">📂 Open (${_aSelCnt})</button>
      <button onclick="window.clearSavedSel()" style="padding:5px 12px;border-radius:6px;border:1px solid #ca8a04;background:transparent;color:#fde68a;font-size:12px;cursor:pointer">Clear</button>
      <button onclick="window.bulkDeleteSaved()" style="padding:5px 12px;border-radius:6px;border:none;background:#ef4444;color:#fff;font-size:12px;font-weight:700;cursor:pointer">🗑 Move to Bin (${_aSelCnt})</button>
    </div>`:'';
    return tabBar+`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      ${activeItems.length?`<button class="btn btn-ghost" style="font-size:12px" onclick="window.selectAllSaved(${JSON.stringify(activeItems.map(s=>s.id)).replace(/"/g,'&quot;')})">${_aSelCnt===activeItems.length?'Deselect All':'Select All'}</button>`:''}
    </div>
    ${_aBulk}
    ${!activeItems.length
      ?'<div class="card" style="text-align:center;padding:40px;color:var(--text3)">✓ No active loadsheets</div>'
      :activeItems.map(function(s){return _lsCard(s,{});}).join('')}`;
  }

  // ── Signed tab (complete, not yet uploaded) ──
  if(tab==='signed'){
    var _sSelCnt=Object.keys(S.savedSel).filter(function(id){return signedItems.find(function(s){return s.id===id;});}).length;
    var _sBulk=_sSelCnt>0?`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1e1a00;border:1px solid #ca8a04;border-radius:8px;margin-bottom:10px">
      <span style="font-size:13px;font-weight:600;color:#fde68a;flex:1">${_sSelCnt} selected</span>
      <button onclick="window.openSelectedSaved()" style="padding:5px 12px;border-radius:6px;border:none;background:#7c3aed;color:#fff;font-size:12px;font-weight:700;cursor:pointer">📂 Open (${_sSelCnt})</button>
      <button onclick="window.clearSavedSel()" style="padding:5px 12px;border-radius:6px;border:1px solid #ca8a04;background:transparent;color:#fde68a;font-size:12px;cursor:pointer">Clear</button>
      ${_sSelCnt>0?`<button onclick="window.bulkUploadSaved()" style="padding:5px 14px;border-radius:6px;border:none;background:#1a73e8;color:#fff;font-size:12px;font-weight:700;cursor:pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg> Upload All (${_sSelCnt})</button>`:''}
      <button onclick="window.bulkDeleteSaved()" style="padding:5px 12px;border-radius:6px;border:none;background:#ef4444;color:#fff;font-size:12px;font-weight:700;cursor:pointer">🗑 Move to Bin (${_sSelCnt})</button>
    </div>`:'';
    return tabBar+`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      ${signedItems.length?`<button class="btn btn-ghost" style="font-size:12px" onclick="window.selectAllSaved(${JSON.stringify(signedItems.map(s=>s.id)).replace(/"/g,'&quot;')})">${_sSelCnt===signedItems.length?'Deselect All':'Select All'}</button>`:''}
    </div>
    ${_sBulk}
    ${!signedItems.length
      ?'<div class="card" style="text-align:center;padding:40px;color:var(--text3)">☁ All signed loadsheets have been uploaded</div>'
      :signedItems.map(function(s){return _lsCard(s,{showNotUploaded:true,showUploadBtn:true});}).join('')}`;
  }

  // ── Archive tab (uploaded to Drive) ──
  if(tab==='archive'){
    return tabBar+`
    ${!archiveItems.length
      ?'<div class="card" style="text-align:center;padding:40px;color:var(--text3)">📦 No archived loadsheets yet</div>'
      :archiveItems.map(function(s){return _lsCard(s,{showUploaded:true,showUploadBtn:true});}).join('')}`;
  }

  // ── Manifests tab ──
  if(tab==='manifests'){
    return tabBar+_bulkBar+`
    ${!activeManifests.length
      ?`<div class="card" style="text-align:center;padding:40px;color:var(--text3)">📋 No saved manifests</div>`
      :activeManifests.map(m=>`<div style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;border:1px solid ${S.savedSel[m.id]?'#3b82f6':'var(--border)'};margin-bottom:8px;background:${S.savedSel[m.id]?'rgba(59,130,246,.08)':'var(--card)'}">
      <input type="checkbox" ${S.savedSel[m.id]?'checked':''} onchange="window.toggleSavedSel('${m.id}')" style="width:16px;height:16px;accent-color:#3b82f6;flex-shrink:0;cursor:pointer">
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">${m.name||'Unnamed'}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:3px">
          ${(m.data?.acSetup||[]).map(s=>{const col=AC_COL[s.acId]||'#64748b';return`<span style="padding:1px 7px;border-radius:12px;background:${col}22;border:1px solid ${col}55;color:${col};font-weight:700;font-size:11px">${s.acId||'?'}</span>`;}).join('')}
          <span style="font-size:11px;color:var(--text3)">${(function(){var _p=m.data&&m.data.pax||[];var a=_p.filter(function(x){return!x.infant&&x.type!=='child';}).length;var c=_p.filter(function(x){return x.type==='child';}).length;var i=_p.filter(function(x){return x.infant;}).length;var s=(a?a+'A ':'')+( c?c+'C ':''+(i?i+'i':''));return s.trim()||_p.length+' pax';})()}</span>${(function(){var nm=(m.data&&m.data.createdBy)||'';var at=(m.data&&m.data.createdAt)||'';if(!nm&&!at)return '';var ini=nm.trim().split(/\s+/).map(function(w){return w[0]||''}).join('').toUpperCase();var ts=at?(function(){var d=new Date(at);return ('0'+d.getHours()).slice(-2)+':'+(  '0'+d.getMinutes()).slice(-2);}()):'';return '<span style="padding:1px 7px;background:rgba(100,116,139,.12);border:1px solid rgba(100,116,139,.22);border-radius:4px;font-size:10px;font-weight:600;color:var(--text3)">By '+ini+(ts?' '+ts:'')+'</span>';})()}
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost" style="font-size:12px" onclick="loadManifest('${m.id}')">Open</button>
        <button class="btn btn-red" style="font-size:16px;line-height:1;padding:5px 8px" onclick="deleteManifest('${m.id}')" title="Delete">&#x1F5D1;</button>
      </div></div>`).join('')}`;
  }

  // Fallback: return tab bar
  return tabBar;
}

// ── CHARTER CALCULATOR ──
