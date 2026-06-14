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
  const tab=S.savedTab||'unsigned';
  const search=(S.savedSearch||'').toLowerCase();
  const sort=S.savedSort||'newest';
  const _myName=(S.user?.linkedCrew||S.user?.name||'').trim();
  // Exclude deleted from mine/counts
  const mySheets=_myName?S.saved.filter(function(s){return(s.form&&s.form.pic||'').trim()===_myName&&s.status!=='deleted';}):[];

  // Bin contents
  const binLs=S.saved.filter(s=>s.status==='deleted');
  const binMs=S.manifests.filter(m=>m._deleted);
  const binCount=binLs.length+binMs.length;
  const activeManifests=S.manifests.filter(m=>!m._deleted);
  const allCount=S.saved.filter(s=>s.status!=='deleted').length;

  const driveStatusHTML=''; // handled by appMsg banner
  const _selCount=Object.keys(S.savedSel).length;
  const _selSignedCount=Object.keys(S.savedSel).filter(id=>{const s=S.saved.find(x=>x.id===id);return s&&s.status==='complete';}).length;
  const _bulkBar=_selCount>0&&tab!=='bin'?`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1e1a00;border:1px solid #ca8a04;border-radius:8px;margin-bottom:10px">
    <span style="font-size:13px;font-weight:600;color:#fde68a;flex:1">${_selCount} item(s) selected</span>
    <button onclick="window.clearSavedSel()" style="padding:5px 12px;border-radius:6px;border:1px solid #ca8a04;background:transparent;color:#fde68a;font-size:12px;cursor:pointer">Clear</button>
    <button onclick="window.printMultiSheet(Object.keys(S.savedSel))" style="padding:5px 12px;border-radius:6px;border:none;background:#374151;color:#fff;font-size:16px;font-weight:700;cursor:pointer" title="Print selected">&#x1F5A8;</button>
    ${_selSignedCount>0?`<button onclick="window.bulkUploadSaved()" style="padding:5px 14px;border-radius:6px;border:none;background:#1a73e8;color:#fff;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;box-shadow:0 1px 4px rgba(26,115,232,.4)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>Upload to Drive (${_selSignedCount})</button>`:''}
    <button onclick="window.bulkDeleteSaved()" style="padding:5px 12px;border-radius:6px;border:none;background:#ef4444;color:#fff;font-size:12px;font-weight:700;cursor:pointer">🗑 Move to Bin (${_selCount})</button>
  </div>`:'';
  const tabBar=`<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <button class="sub-tab ${tab==='unsigned'?'on':''}" onclick="S.savedTab='unsigned';render()">Active — Unsigned (${S.saved.filter(s=>s.status==='unsigned').length})</button>
    <button class="sub-tab ${tab==='loadsheets'?'on':''}" onclick="S.savedTab='loadsheets';render()">All (${allCount})</button>
    <button class="sub-tab ${tab==='archived'?'on':''}" onclick="S.savedTab='archived';render()">📦 Archived — Signed (${S.saved.filter(s=>s.status==='complete').length})</button>
    ${_myName?`<button class="sub-tab ${tab==='mine'?'on':''}" onclick="S.savedTab='mine';render()">Mine (${mySheets.length})</button>`:''}
    <button class="sub-tab ${tab==='manifests'?'on':''}" onclick="S.savedTab='manifests';render()">Manifests (${activeManifests.length})</button>
    <button class="sub-tab ${tab==='bin'?'on':''}" onclick="S.savedTab='bin';render()">🗑️ Bin${binCount>0?' ('+binCount+')':''}</button>
  </div>`;

  // ── Bin tab ──
  if(tab==='bin'){
    return tabBar+`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:13px;color:var(--text3)">Items here can be restored or permanently deleted.</span>
      ${binCount>0?`<button class="btn btn-red" style="font-size:12px" onclick="window.emptyBin()">🗑️ Empty Bin</button>`:''}
    </div>`+
    (!binCount
      ?`<div class="card" style="text-align:center;padding:40px;color:var(--text3)">🗑️ Bin is empty</div>`
      :(binLs.map(s=>{
          const col=AC_COL[s.form.ac]||'#64748b';
          const _savedStr=s.savedAt?_lsRelTime(s.savedAt):'';
          return`<div style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;border:1px solid var(--border);margin-bottom:8px;background:var(--card);border-left:3px solid #ef444488;opacity:.85">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
                <span style="padding:2px 8px;border-radius:20px;background:${col}22;border:1px solid ${col}55;color:${col};font-weight:700;font-size:12px">${s.form.ac||'?'}</span>
                <span class="pill pill-blue">${s.form.dep||'?'} → ${s.form.dest||'?'}</span>
                ${s.form.pic?`<span style="padding:2px 7px;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.35);border-radius:4px;font-size:10px;font-weight:700;color:#c4b5fd">✈ ${s.form.pic}</span>`:''}
                <span class="pill pill-warn" style="font-size:10px">Loadsheet</span>
              </div>
              <div style="font-size:11px;color:var(--text3)">${_savedStr?'Saved '+_savedStr:''}</div>
            </div>
            <div style="display:flex;gap:5px;flex-shrink:0">
              <button class="btn btn-ghost" style="font-size:12px;padding:6px 10px" onclick="window.restoreFromBin('${s.id}')">↩ Restore</button>
              <button class="btn btn-red" style="font-size:12px;padding:6px 10px" onclick="window.permDeleteFromBin('${s.id}')">🗑 Delete</button>
            </div></div>`;
        }).join('')+
        binMs.map(m=>{
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
        }).join('')));
  }

  // ── Mine tab ──
  if(tab==='mine'){
    return tabBar+(_myName
      ?(!mySheets.length
        ?`<div class="card" style="text-align:center;padding:40px;color:var(--text3)">No loadsheets found as PIC for ${_myName}</div>`
        :mySheets.map(function(s){
            var col=AC_COL[s.form.ac]||'#64748b';
            var isSigned=s.status==='complete';
            var _isCpCrew=!!s.form.coPilot;
            var _paxCnt=Object.keys(s.form.names||{}).filter(function(k){var ki=parseInt(k);return ki>=1&&!!(s.form.names||{})[k]&&((s.form.names||{})[k]||'').trim()&&!(ki===1&&_isCpCrew);}).length;
            var _savedStr=s.savedAt?_lsRelTime(s.savedAt):'';
            return'<div style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;border:1px solid var(--border);margin-bottom:8px;background:var(--card);border-left:3px solid '+col+'">'
              +'<div style="flex:1;min-width:0">'
              +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">'
              +'<span style="padding:2px 10px;border-radius:20px;background:'+col+'22;border:1px solid '+col+'55;color:'+col+';font-weight:700;font-size:12px;white-space:nowrap">'+(s.form.ac||'?')+'</span>'
              +'<span class="pill pill-blue">'+(s.form.dep||'?')+' &#x2192; '+(s.form.dest||'?')+'</span>'
              +(s.form.pic?'<span style="padding:2px 7px;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.35);border-radius:4px;font-size:10px;font-weight:700;color:#c4b5fd">&#x2708; '+s.form.pic+'</span>':'')
              +(isSigned?'<span class="pill pill-green">&#x2713; Signed</span>':'<span class="pill" style="background:#0c1a3a;color:#93c5fd">UNSIGNED</span>')
              +'</div>'
              +'<div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap">'+'<span style="padding:2px 7px;background:rgba(100,116,139,.12);border:1px solid rgba(100,116,139,.22);border-radius:4px;font-size:10px;font-weight:700;color:var(--text3)">'+_fmtFlightDate(s.form.date)+'</span>'+(s.form.etd?'<span style="padding:2px 7px;background:rgba(59,130,246,.13);border:1px solid rgba(59,130,246,.28);border-radius:4px;font-size:10px;font-weight:700;color:#93c5fd">ETD '+s.form.etd+'</span>':'')+'<span style="padding:2px 7px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);border-radius:4px;font-size:10px;font-weight:700;color:#4ade80">'+_paxCnt+' PAX</span>'+(_savedStr?'<span style="padding:2px 7px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.2);border-radius:4px;font-size:10px;font-weight:700;color:#fbbf24">Saved '+_savedStr+'</span>':'')+'</div>'
              +'</div>'
              +'<div style="display:flex;gap:5px;flex-shrink:0">'
              +'<button class="btn btn-sky" style="font-size:12px;padding:6px 10px" data-sid="'+s.id+'" onclick="editSaved(this.dataset.sid)">Open</button>'
              +'<button class="btn btn-red" style="font-size:16px;line-height:1;padding:5px 8px" data-sid="'+s.id+'" onclick="delSaved(this.dataset.sid)" title="Delete">&#x1F5D1;</button>'
              +'</div></div>';
          }).join(''))
      :'<div class="card" style="text-align:center;padding:40px;color:var(--text3)">No crew name linked to your account.</div>');
  }
  if(tab==='manifests'){
    return tabBar+_bulkBar+(activeManifests.length?'<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn btn-red" style="font-size:12px" onclick="window.clearAllManifests()">&#x1f5d1; Clear All Manifests</button></div>':'')+`
    ${!activeManifests.length
      ?`<div class="card" style="text-align:center;padding:40px;color:var(--text3)">📋 No saved manifests</div>`
      :activeManifests.map(m=>`<div style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;border:1px solid ${S.savedSel[m.id]?'#3b82f6':'var(--border)'};margin-bottom:8px;background:${S.savedSel[m.id]?'rgba(59,130,246,.08)':'var(--card)'}">
      <input type="checkbox" ${S.savedSel[m.id]?'checked':''} onchange="window.toggleSavedSel('${m.id}')" style="width:16px;height:16px;accent-color:#3b82f6;flex-shrink:0;cursor:pointer">
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">${m.name||'Unnamed'}</div>
        <div style="font-size:12px;color:var(--text3)">${m.savedAt?_lsRelTime(m.savedAt):''} · ${m.data?.pax?.length||0} pax</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost" style="font-size:12px" onclick="loadManifest('${m.id}')">Load</button>
        <button class="btn btn-red" style="font-size:16px;line-height:1;padding:5px 8px" onclick="deleteManifest('${m.id}')" title="Delete">&#x1F5D1;</button>
      </div></div>`).join('')}`;
  }

  // ── Unsigned tab ──
  if(tab==='unsigned'){
    const unsigned=S.saved.filter(s=>s.status==='unsigned');
    const _unsignedSelCount=Object.keys(S.savedSel).filter(id=>unsigned.find(s=>s.id===id)).length;
    const _unsignedBulkBar=_unsignedSelCount>0?`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1e1a00;border:1px solid #ca8a04;border-radius:8px;margin-bottom:10px">
      <span style="font-size:13px;font-weight:600;color:#fde68a;flex:1">${_unsignedSelCount} selected</span>
      <button onclick="window.clearSavedSel()" style="padding:5px 12px;border-radius:6px;border:1px solid #ca8a04;background:transparent;color:#fde68a;font-size:12px;cursor:pointer">Clear</button>
      <button onclick="window.bulkDeleteSaved()" style="padding:5px 12px;border-radius:6px;border:none;background:#ef4444;color:#fff;font-size:12px;font-weight:700;cursor:pointer">🗑 Move to Bin (${_unsignedSelCount})</button>
    </div>`:'';
    return tabBar+`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:10px 14px;background:#0c1a3a;border:1px solid #1e3a5f;border-radius:8px">
      <span style="color:#93c5fd;font-size:13px;font-weight:600;flex:1">🖊 ${unsigned.length} loadsheet${unsigned.length!==1?'s':''} awaiting pilot signature</span>
      ${unsigned.length?`<button class="btn btn-ghost" style="font-size:12px" onclick="window.selectAllSaved(${JSON.stringify(unsigned.map(s=>s.id))})">${_unsignedSelCount===unsigned.length?'Deselect All':'Select All'}</button>`:''}
    </div>
    ${_unsignedBulkBar}
    ${!unsigned.length
      ?`<div class="card" style="text-align:center;padding:40px;color:var(--text3)">✓ All loadsheets signed</div>`
      :unsigned.map(s=>{
        const col=AC_COL[s.form.ac]||'#64748b';
        const _isCpCrew=!!s.form.coPilot;
        const _paxCnt=Object.keys(s.form.names||{}).filter(function(k){var ki=parseInt(k);return ki>=1&&!!(s.form.names||{})[k]&&((s.form.names||{})[k]||'').trim()&&!(ki===1&&_isCpCrew);}).length;
        const _savedStr=s.savedAt?_lsRelTime(s.savedAt):'';
        return`<div style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;border:1px solid ${S.savedSel[s.id]?'#3b82f6':'#1e3a5f'};margin-bottom:8px;background:${S.savedSel[s.id]?'rgba(59,130,246,.08)':'var(--card)'};border-left:3px solid ${col}">
          <input type="checkbox" ${S.savedSel[s.id]?'checked':''} onchange="window.toggleSavedSel('${s.id}')" style="width:16px;height:16px;accent-color:#3b82f6;flex-shrink:0;cursor:pointer">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
              <span style="padding:2px 10px;border-radius:20px;background:${col}22;border:1px solid ${col}55;color:${col};font-weight:700;font-size:12px;white-space:nowrap">${s.form.ac||'?'}</span>
              <span class="pill pill-blue">${s.form.dep||'?'} → ${s.form.dest||'?'}</span>
              ${s.form.pic?`<span style="padding:2px 7px;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.35);border-radius:4px;font-size:10px;font-weight:700;color:#c4b5fd">✈ ${s.form.pic}</span>`:''}
              <span class="pill" style="background:#0c1a3a;color:#93c5fd">🖊 UNSIGNED</span>
            </div>
            <div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap"><span style="padding:2px 7px;background:rgba(100,116,139,.12);border:1px solid rgba(100,116,139,.22);border-radius:4px;font-size:10px;font-weight:700;color:var(--text3)">${_fmtFlightDate(s.form.date)}</span>${s.form.etd?`<span style="padding:2px 7px;background:rgba(59,130,246,.13);border:1px solid rgba(59,130,246,.28);border-radius:4px;font-size:10px;font-weight:700;color:#93c5fd">ETD ${s.form.etd}</span>`:''}<span style="padding:2px 7px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);border-radius:4px;font-size:10px;font-weight:700;color:#4ade80">${_paxCnt} PAX</span>${_savedStr?`<span style="padding:2px 7px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.2);border-radius:4px;font-size:10px;font-weight:700;color:#fbbf24">Saved ${_savedStr}</span>`:''}</div>
          </div>
          <div style="display:flex;gap:5px;flex-shrink:0">
            <button class="btn btn-sky" style="font-size:12px;padding:6px 10px" onclick="editSaved('${s.id}')">Edit</button>
            <button class="btn" style="font-size:12px;padding:6px 10px;background:var(--card2);border:1px solid var(--border2);border-radius:6px;cursor:pointer;color:var(--text2)" onclick="window.duplicateSaved('${s.id}')">&#x2398; Dup</button>
            <button class="btn btn-red" style="font-size:16px;line-height:1;padding:5px 8px" onclick="delSaved('${s.id}')" title="Delete">&#x1F5D1;</button>
          </div></div>`;
      }).join('')}`;
  }

  // ── All loadsheets tab (and archived) ──
  let items=S.saved.filter(s=>s.status!=='deleted');
  if(tab==='archived') items=items.filter(s=>s.status==='complete');
  else if(tab==='loadsheets') {} // show all non-deleted
  else if(tab!=='manifests') items=items.filter(s=>s.status!=='complete');
  if(search){
    items=items.filter(s=>{
      const f=s.form;
      return (f.ac||'').toLowerCase().includes(search)
          || (f.pic||'').toLowerCase().includes(search)
          || (f.dep||'').toLowerCase().includes(search)
          || (f.dest||'').toLowerCase().includes(search)
          || Object.values(f.names||{}).some(n=>(n||'').toLowerCase().includes(search));
    });
  }
  if(sort==='newest')items.sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt));
  else if(sort==='oldest')items.sort((a,b)=>new Date(a.savedAt)-new Date(b.savedAt));
  else if(sort==='aircraft')items.sort((a,b)=>(a.form.ac||'').localeCompare(b.form.ac||''));
  else if(sort==='pic')items.sort((a,b)=>(a.form.pic||'').localeCompare(b.form.pic||''));

  return driveStatusHTML+tabBar+`
  <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
    <div class="search-bar" style="flex:1;min-width:180px">
      <span class="icon">🔍</span>
      <input class="fi" type="text" placeholder="Search pax, PIC, aircraft…" value="${S.savedSearch||''}" id="savedSearchInput" oninput="debounceSearch(this.value)">
    </div>
    <select class="fi" style="width:auto;padding-right:24px" onchange="S.savedSort=this.value;safeRender()">
      <option value="newest"${sort==='newest'?' selected':''}>Most Recent</option>
      <option value="oldest"${sort==='oldest'?' selected':''}>Oldest First</option>
      <option value="aircraft"${sort==='aircraft'?' selected':''}>By Aircraft</option>
      <option value="pic"${sort==='pic'?' selected':''}>By PIC</option>
    </select>
    <button class="btn btn-sky" onclick="newSheet()">+ New</button>
    ${Object.keys(S.savedSel).length<items.length?`<button class="btn btn-ghost" style="font-size:12px" onclick="window.selectAllSaved(${JSON.stringify(items.map(x=>x.id))})">Select All (${items.length})</button>`:`<button class="btn btn-ghost" style="font-size:12px" onclick="window.clearSavedSel()">Deselect All</button>`}
  </div>
  ${_bulkBar}
  ${!items.length
    ?`<div class="card" style="text-align:center;padding:40px;color:var(--text3)">📋 ${allCount?'No results for "'+search+'"':'No saved loadsheets'}</div>`
    :items.map(s=>{
      const col=AC_COL[s.form.ac]||'#64748b';
      const _paxCnt=Object.keys(s.form.names||{}).filter(function(k){var ki=parseInt(k);if(ki===0)return false;var nm=s.form.names[k];return nm&&nm.trim();}).length;
      const _savedStr=s.savedAt?_lsRelTime(s.savedAt):'';
      const r=calcFormWB(s.form);
      const ok=r&&r.towOk&&r.lwOk&&r.cogOk;
      const isSigned=s.status==='complete';
      const isUnsigned=s.status==='unsigned';
      return`<div style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;border:1px solid ${S.savedSel[s.id]?'#3b82f6':'var(--border)'};margin-bottom:8px;background:${S.savedSel[s.id]?'rgba(59,130,246,.08)':'var(--card)'};border-left:3px solid ${col}">
        <input type="checkbox" ${S.savedSel[s.id]?'checked':''} onchange="window.toggleSavedSel('${s.id}')" style="width:16px;height:16px;accent-color:#3b82f6;flex-shrink:0;cursor:pointer">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
            <span style="padding:2px 10px;border-radius:20px;background:${col}22;border:1px solid ${col}55;color:${col};font-weight:700;font-size:12px;white-space:nowrap">${s.form.ac||'?'}</span>
            <span class="pill pill-blue">${s.form.dep||'?'} → ${s.form.dest||'?'}</span>
            ${s.form.pic?`<span style="padding:2px 7px;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.35);border-radius:4px;font-size:10px;font-weight:700;color:#c4b5fd">✈ ${s.form.pic}</span>`:''}
            ${isUnsigned
              ?`<span class="pill" style="background:#0c1a3a;color:#93c5fd">🖊 Unsigned</span>`
              :isSigned
                ?`<span class="pill ${ok?'pill-green':'pill-warn'}">${ok?'✓ Signed':'⚠ Signed (check limits)'}</span>`
                :`<span class="pill pill-warn">Draft</span>`}
            ${isSigned?(s.driveUploaded?'<span class="pill pill-green" style="font-size:10px">☁ Drive ✓</span>':'<span class="pill" style="background:rgba(100,116,139,.12);border:1px solid var(--border2);color:var(--text3);font-size:10px">☁ Not uploaded</span>'):''}

          </div>
          <div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap"><span style="padding:2px 7px;background:rgba(100,116,139,.12);border:1px solid rgba(100,116,139,.22);border-radius:4px;font-size:10px;font-weight:700;color:var(--text3)">${_fmtFlightDate(s.form.date)}</span>${s.form.etd?`<span style="padding:2px 7px;background:rgba(59,130,246,.13);border:1px solid rgba(59,130,246,.28);border-radius:4px;font-size:10px;font-weight:700;color:#93c5fd">ETD ${s.form.etd}</span>`:''}<span style="padding:2px 7px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);border-radius:4px;font-size:10px;font-weight:700;color:#4ade80">${_paxCnt} PAX</span>${_savedStr?`<span style="padding:2px 7px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.2);border-radius:4px;font-size:10px;font-weight:700;color:#fbbf24">Saved ${_savedStr}</span>`:''}</div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0">
          ${isSigned?`<button class="btn btn-ghost" style="font-size:12px;padding:6px 10px" onclick="window.viewSaved('${s.id}')">View</button><button class="btn" style="font-size:12px;padding:6px 10px;background:#854d0e;color:#fde68a;border:none;border-radius:6px;cursor:pointer" onclick="window.reopenSaved('${s.id}')">&#x21BA; Reopen</button>`:`<button class="btn btn-ghost" style="font-size:12px;padding:6px 10px" onclick="editSaved('${s.id}')">Edit</button>`}
          ${isSigned&&(S.gdriveEnabled||S.gdriveClientId)?`<button class="btn" title="${s.driveUploaded?'Re-upload to Drive':'Upload to Drive'}" style="font-size:16px;line-height:1;padding:5px 9px;background:var(--acc);color:#fff;border:none;border-radius:6px;cursor:pointer" onclick="window.uploadSingleSheet('${s.id}')">&#x2601;</button>`:''}
          <button class="btn" title="Print" style="font-size:16px;line-height:1;padding:5px 9px;background:var(--card2);color:var(--text2);border:1px solid var(--border2);border-radius:6px;cursor:pointer" onclick="window.printSingleSheet('${s.id}')">&#x1F5A8;</button>
          <button class="btn" title="Duplicate" style="font-size:12px;padding:5px 9px;background:var(--card2);color:var(--text2);border:1px solid var(--border2);border-radius:6px;cursor:pointer" onclick="window.duplicateSaved('${s.id}')">&#x2398; Dup</button>
          <button class="btn btn-red" style="font-size:16px;line-height:1;padding:5px 8px" onclick="delSaved('${s.id}')" title="Delete">&#x1F5D1;</button>
        </div></div>`;
    }).join('')}`;
}

// ── CHARTER CALCULATOR ──
