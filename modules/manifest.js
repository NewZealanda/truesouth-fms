// === MODULE: manifest === v1.0 ===
function renderManifestStickyBar(){
  var h='<div style="height:68px"></div>';
  h+='<div style="position:fixed;bottom:0;left:0;right:0;z-index:200;background:var(--card);border-top:1px solid var(--border2);padding:10px 14px;padding-bottom:max(10px,env(safe-area-inset-bottom));display:flex;gap:8px;align-items:center">';
  var saveBdr=S._loadedManifestId?'rgba(74,222,128,.55)':'rgba(255,255,255,.15)';
  var saveBg=S._loadedManifestId?'rgba(74,222,128,.1)':'transparent';
  var saveTxt=S._loadedManifestId?'#4ade80':'var(--text2)';
  var saveLbl=S._loadedManifestId?'Save':'Save New';
  h+='<button tabindex="-1" onclick="saveManifest()" style="flex:2;padding:11px 10px;border-radius:10px;border:1.5px solid '+saveBdr+';background:'+saveBg+';color:'+saveTxt+';font-size:14px;font-weight:700;cursor:pointer">💾 '+saveLbl+'</button>';
  if(S._loadedManifestId){
    h+='<button tabindex="-1" onclick="window.saveManifestAs()" style="padding:11px 12px;border-radius:10px;border:1.5px solid rgba(255,255,255,.15);background:transparent;color:var(--text2);font-size:14px;font-weight:700;cursor:pointer">+ New</button>';
    h+='<button tabindex="-1" onclick="window.deleteCurrentManifest()" style="padding:11px 12px;border-radius:10px;border:1.5px solid rgba(239,68,68,.35);background:transparent;color:#ef4444;font-size:14px;font-weight:700;cursor:pointer">🗑</button>';
  }
  h+='<button tabindex="-1" onclick="clearManifest()" style="padding:11px 12px;border-radius:10px;border:1.5px solid rgba(255,255,255,.15);background:transparent;color:var(--text2);font-size:14px;font-weight:700;cursor:pointer">✕</button>';
  h+='</div>';
  return h;
}
function renderManifest(){
  return renderStep1();
}
function renderSeatmap(){
  return renderStep2();
}

function _initManifestTabs(){
  // Only auto-create if tabs have never been set (undefined), not if user closed all tabs
  if(!S.manifestTabs){
    const id='mt_'+Date.now();
    S.manifestTabs=[{id,savedId:S._loadedManifestId||null}];
    S.activeManifestTabId=id;
    if(!S._manifestDispatches)S._manifestDispatches={};
    S._manifestDispatches[id]=JSON.parse(JSON.stringify(S.dispatch));
  }
}
function _manifestTabLabel(tab){
  const d=tab.id===S.activeManifestTabId?S.dispatch:((S._manifestDispatches||{})[tab.id]||{});
  if(d.name)return d.name;
  const ac=(d.acSetup||[]).map(function(s){return s.acId.replace('ZK-','');}).filter(Boolean);
  return ac.length?ac.join('+'):'New';
}
// ── Drag-to-reorder manifest tabs ──
window._mtDragStart=function(e,id){S._mtDrag=id;try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);}catch(_){}};
window._mtDragEnd=function(){S._mtDrag=null;};
window._mtDrop=function(e,toId){
  if(e){e.preventDefault();e.stopPropagation();}
  var from=S._mtDrag||(e&&e.dataTransfer&&e.dataTransfer.getData('text/plain'));
  S._mtDrag=null;
  if(!from||from===toId)return;
  var arr=S.manifestTabs||[];
  var fi=arr.findIndex(function(t){return t.id===from;});
  if(fi<0)return;
  var moved=arr.splice(fi,1)[0];
  var ti=arr.findIndex(function(t){return t.id===toId;});
  if(ti<0)arr.push(moved);else arr.splice(ti,0,moved);
  window.saveWorkspace&&window.saveWorkspace();
  render();
};
function renderStep1(){
  _initManifestTabs();
  // Empty state — all tabs closed
  if(!S.manifestTabs||S.manifestTabs.length===0){
    return`<div class="card" style="text-align:center;padding:40px 20px">
      <div style="font-size:32px;margin-bottom:12px">📋</div>
      <div style="font-size:16px;font-weight:700;color:var(--text1);margin-bottom:6px">No open manifests</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:20px">Start a new manifest or load a saved one.</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="window.newManifestTab()">+ New Manifest</button>
        <button class="btn btn-ghost" onclick="S.tab='saved';S.savedTab='manifests';render()">📂 Open Saved</button>
      </div>
    </div>`;
  }
  const d=S.dispatch;
  // Airport options via aptOpts()
  const _tabBar=`<div style="display:flex;align-items:center;gap:4px;margin-bottom:10px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px">
    ${S.manifestTabs.map(function(tab){
      const active=tab.id===S.activeManifestTabId;
      const lbl=_manifestTabLabel(tab);
      const editing=active&&S._editingManifestTabId===tab.id;
      if(editing){
        return`<div style="display:flex;align-items:center;gap:5px;padding:3px 8px;border-radius:8px;border:1px solid var(--acc);background:rgba(124,58,237,.15);white-space:nowrap;flex-shrink:0">
          <input id="tab-rename-${tab.id}" class="fi" type="text" value="${lbl.replace(/"/g,'&quot;')}" style="font-size:12px;font-weight:700;width:110px;padding:2px 6px;color:var(--acc)" onclick="event.stopPropagation()" onblur="window.saveManifestTabName(this.value,'${tab.id}')" onkeydown="if(event.key==='Enter')this.blur();if(event.key==='Escape'){S._editingManifestTabId=null;render();}">
          <span onclick="event.stopPropagation();window.closeManifestTab('${tab.id}')" style="font-size:11px;opacity:.5;line-height:1;cursor:pointer;padding:0 1px" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.5'">&#x2715;</span>
        </div>`;
      }
      return`<div draggable="true" ondragstart="window._mtDragStart(event,'${tab.id}')" ondragover="event.preventDefault()" ondrop="window._mtDrop(event,'${tab.id}')" ondragend="window._mtDragEnd&&window._mtDragEnd()" onclick="window.switchManifestTab('${tab.id}')" style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:8px;border:1px solid ${active?'var(--acc)':'var(--border2)'};background:${active?'rgba(124,58,237,.15)':'var(--card2)'};cursor:grab;white-space:nowrap;flex-shrink:0;font-size:12px;font-weight:${active?'700':'500'};color:${active?'var(--acc)':'var(--text2)'}">
        <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;pointer-events:none">${lbl}</span>
        <span onclick="event.stopPropagation();window.closeManifestTab('${tab.id}')" style="font-size:11px;opacity:.5;line-height:1;cursor:pointer;padding:0 1px" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.5'">&#x2715;</span>
      </div>`;
    }).join('')}
    <button onclick="window.newManifestTab()" style="padding:5px 10px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text3);font-size:12px;cursor:pointer;flex-shrink:0;white-space:nowrap">+ New</button>
  </div>`;

  const AC_ORDER_M=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'];
  const acCards=AC_ORDER_M.filter(id=>S.aircraft[id]).map(id=>{const a=S.aircraft[id];
    const setup=d.acSetup.find(s=>s.acId===a.id);const sel=!!setup;
    const col=AC_COL[a.id]||'#64748b';
    const unit=fuelUnit(a.id);
    const defFuel=String(Math.round(fromKg(a.fuelKg,a.id)));
    const fuelVal=setup?.fuelInput!=null?setup.fuelInput:defFuel;
    const fuelKgV=toKg(fuelVal,a.id);
    const paxOnAc=d.pax.filter(p=>p.pinAc===a.id&&!p.infant).length;
    const capOnAc=paxSeatIdxs(a.id).length;
    const overBy=sel&&paxOnAc>capOnAc?paxOnAc-capOnAc:0;
    return`<div class="ac-card ${sel?'selected':''}" style="position:relative;border-color:${col}${sel?'':'55'};background:${col}${sel?'1a':'08'};${sel?`box-shadow:0 0 0 1px ${col}55`:''}" onclick="toggleAcSetup('${a.id}')">
      ${overBy>0?`<div style="position:absolute;top:-8px;right:-8px;background:#ef4444;color:#fff;font-size:10px;font-weight:800;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg);z-index:10;pointer-events:none">+${overBy}</div>`:''}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${sel?'10px':'0'}">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:14px;height:14px;border-radius:50%;border:2.5px solid ${sel?col:'var(--border2)'};background:${sel?col:'transparent'}"></div>
          <div><span style="font-weight:700;font-size:14px">${a.name}</span>
            <span style="font-size:11px;color:var(--text3);margin-left:7px">${a.type}</span></div>
        </div>
        <span style="font-size:11px;color:var(--text3)">${sel?paxSeatIdxs(a.id).length:a.seats.length-1} pax seats</span>
      </div>
      ${sel?`<div onclick="event.stopPropagation()">
        <div class="g2" style="margin-bottom:10px">
          <div><label>PIC</label>
            <select tabindex="-1" class="fi" onchange="setAcField('${a.id}','pic',this.value)">
              <option value="">— select PIC —</option>
              ${pilotCrewList().filter(c=>(c.endorse||[]).includes(a.id)).slice().sort((a,b)=>a.n.localeCompare(b.n)).map(c=>`<option value="${c.n}"${setup.pic===c.n?' selected':''}>${c.n} (${c.w}kg)</option>`).join('')}
            </select></div>
          <div><label>Co-Pilot (optional)</label>
            <select tabindex="-1" class="fi" onchange="setAcField('${a.id}','coPilot',this.value)">
              <option value="">None — Seat 1 = pax</option>
              ${anyCrewList().slice().sort((a,b)=>a.n.localeCompare(b.n)).map(c=>`<option value="${c.n}"${setup.coPilot===c.n?' selected':''}>${c.n}</option>`).join('')}
            </select></div>
        </div>
        <div><label>Fuel at departure (${unit}) <span style="font-weight:400;color:var(--text3);font-size:10px">= ${fuelKgV.toFixed(1)}kg</span></label>
          <div class="fuel-row">
            <input tabindex="-1" class="fi" type="number" value="${fuelVal}" placeholder="${defFuel}" onblur="setAcField('${a.id}','fuelInput',parseFloat(this.value)||null)">
            <span style="font-size:12px;color:var(--text3);padding-bottom:2px">${unit}</span>
          </div></div>
      </div>`:''}
    </div>`;
  }).join('');

  const groups=[...new Set(d.pax.map(p=>p.group).filter(Boolean))];
  const totalSeats=d.acSetup.reduce((s,ac)=>s+paxSeatIdxs(ac.acId).length,0);
  const paxRows=(()=>{
  // Filter out legacy infant rows; new infants stored as p.infantName on parent
  const realPax=d.pax.filter(p=>!p.infant);
  const ri=realPax.map((p,i)=>{
    const oi=d.pax.indexOf(p);
    const gc=p.group?.trim()?groupColor(p.group.trim()):null;
    const rowBg=p.pinAc?AC_COL[p.pinAc]+'2e':'';
    // Aircraft assignment buttons
    const acBtns=d.acSetup.length?d.acSetup.map(s=>{
      const id=s.acId,lbl=id.replace('ZK-',''),col=AC_COL[id]||'#64748b',sel=p.pinAc===id;
      return`<button tabindex="-1" onclick="setPaxField(${oi},'pinAc','${id}')" style="padding:2px 8px;border-radius:20px;border:1px solid ${col}${sel?'cc':'33'};background:${sel?col+'28':'transparent'};color:${sel?col:'var(--text3)'};font-size:10px;font-weight:800;cursor:pointer;line-height:1.6;white-space:nowrap">${lbl}</button>`;
    }).join(''):'';
    // Name column: pill (click-to-edit) when name set, input otherwise
    const nameCol=p.name
      ?`<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0">
          <div onclick="window.openPaxFieldPopup(${oi},'name')" style="padding:4px 12px;border-radius:20px;background:${gc||'var(--card2)'};${gc?'':'border:1px solid var(--border2);'}color:${gc?'#fff':'var(--text1)'};font-size:13px;font-weight:700;cursor:pointer;user-select:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px">${esc(p.name)}</div>
          ${p.infantName?`<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;background:rgba(236,72,153,.15);border:1px solid rgba(236,72,153,.35);font-size:11px;font-weight:700;color:#ec4899;white-space:nowrap">👶 ${p.infantName}<button tabindex="-1" onclick="window.rmInfant(${oi})" style="background:none;border:none;color:#ec4899;font-size:12px;cursor:pointer;padding:0 1px;line-height:1;opacity:.7;margin-left:1px">×</button></span>`:''}
          <button tabindex="-1" onclick="setPaxField(${oi},'paymentReq',${!p.paymentReq})" style="padding:2px 7px;border-radius:20px;border:1px solid ${p.paymentReq?'#ef4444':'var(--border)'};background:${p.paymentReq?'rgba(239,68,68,.2)':'transparent'};color:${p.paymentReq?'#ef4444':'var(--text3)'};font-size:9px;font-weight:800;cursor:pointer;letter-spacing:.04em;flex-shrink:0">${p.paymentReq?'$ PAY REQ':'$'}</button>
        </div>`
      :`<div style="display:flex;flex-direction:column;gap:2px">
          <input class="fi" type="text" placeholder="Tap to enter name" value="" style="font-size:13px;width:100%" data-row="${i}" data-field="name" onclick="if('ontouchstart' in document.documentElement){this.blur();window.openPaxFieldPopup(${oi},'name');}" onblur="window.paxNameBlur(${oi},this.value)">
        </div>`;
    // Group column: coloured pill (click-to-edit) when set, 🏷️ button otherwise
    const _pillStyle='display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;line-height:1.6';
    const groupCol=p.group?.trim()
      ?`<div onclick="window.openPaxFieldPopup(${oi},'group')" style="${_pillStyle};background:${gc};color:#fff;user-select:none;max-width:80px;overflow:hidden;text-overflow:ellipsis">${esc(p.group)}</div>`
      :`<div onclick="window.openPaxFieldPopup(${oi},'group')" style="${_pillStyle};background:var(--card2);border:1px solid var(--border2);color:var(--text3)">🏷️</div>`;
    const typeBtns=`<button tabindex="-1" onclick="setPaxField(${oi},'type','adult')" style="padding:2px 7px;border-radius:20px;border:1px solid rgba(59,130,246,${(p.type||'adult')==='adult'?'.8':'.25'});background:${(p.type||'adult')==='adult'?'rgba(59,130,246,.25)':'transparent'};color:${(p.type||'adult')==='adult'?'#93c5fd':'var(--text3)'};font-size:10px;font-weight:700;cursor:pointer;line-height:1.6">A</button><button tabindex="-1" onclick="setPaxField(${oi},'type','child')" style="padding:2px 7px;border-radius:20px;border:1px solid rgba(16,185,129,${p.type==='child'?'.8':'.25'});background:${p.type==='child'?'rgba(16,185,129,.25)':'transparent'};color:${p.type==='child'?'#6ee7b7':'var(--text3)'};font-size:10px;font-weight:700;cursor:pointer;line-height:1.6">C</button>`;
    const wtPill=`<div id="wt-icon-${oi}" onclick="window.inlineEditPaxField(${oi},'weight',this)" style="${_pillStyle};background:var(--card2);border:1px solid var(--border2);color:var(--text2)">⚖️ ${p.weight?p.weight+'kg':'—'}</div>`;
    const bagPill=`<div id="bag-icon-${oi}" onclick="window.inlineEditPaxField(${oi},'bag',this)" style="${_pillStyle};background:var(--card2);border:1px solid var(--border2);color:var(--text2)">🎒 ${p.bag?p.bag+'kg':'—'}</div>`;
    const delBtn=`<button tabindex="-1" class="icon-btn red" onclick="rmPax(${oi})" style="width:28px;height:28px;font-size:13px">✕</button>`;
    const payBtn=`<button tabindex="-1" onclick="setPaxField(${oi},'paymentReq',${!p.paymentReq})" style="padding:2px 7px;border-radius:20px;border:1px solid ${p.paymentReq?'#ef4444':'var(--border)'};background:${p.paymentReq?'rgba(239,68,68,.2)':'transparent'};color:${p.paymentReq?'#ef4444':'var(--text3)'};font-size:9px;font-weight:800;cursor:pointer;letter-spacing:.04em;flex-shrink:0">${p.paymentReq?'$ PAY REQ':'$'}</button>`;
    if(S.mobileView){
      // Mobile: name gets full row 1 width; controls on row 2
      const mName=p.name
        ?`<div onclick="window.openPaxFieldPopup(${oi},'name')" style="padding:5px 14px;border-radius:20px;background:${gc||'var(--card2)'};${gc?'':'border:1px solid var(--border2);'}color:${gc?'#fff':'var(--text1)'};font-size:14px;font-weight:700;cursor:pointer;user-select:none;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</div>
          ${p.infantName?`<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;background:rgba(236,72,153,.15);border:1px solid rgba(236,72,153,.35);font-size:11px;font-weight:700;color:#ec4899;white-space:nowrap">👶 ${p.infantName}<button tabindex="-1" onclick="window.rmInfant(${oi})" style="background:none;border:none;color:#ec4899;font-size:12px;cursor:pointer;padding:0 1px;line-height:1;opacity:.7;margin-left:1px">×</button></span>`:''}`
        :`<input class="fi" type="text" placeholder="Tap to enter name" value="" style="font-size:14px;flex:1;min-width:0" data-row="${i}" data-field="name" onclick="if('ontouchstart' in document.documentElement){this.blur();window.openPaxFieldPopup(${oi},'name');}" onblur="window.paxNameBlur(${oi},this.value)">`;
      return `<div style="padding:8px 4px;border-bottom:1px solid var(--border);background:${rowBg}">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;min-width:0">
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;flex:1;min-width:0">${mName}</div>${delBtn}
        </div>
        <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
          <div style="display:flex;flex-wrap:wrap;gap:2px;align-items:center">${acBtns}</div>
          ${typeBtns}${payBtn}
          <div style="min-width:0">${groupCol}</div>
          ${wtPill}${bagPill}
        </div>
      </div>`;
    }
    return `<div style="display:grid;grid-template-columns:70px 46px 1fr 68px 52px 52px 26px;gap:4px;align-items:center;padding:6px 4px;border-bottom:1px solid var(--border);border-radius:6px;min-width:0;overflow:hidden;background:${rowBg}">
      <div style="display:flex;flex-wrap:wrap;gap:2px;align-items:center;min-width:0">${acBtns}</div>
      <div style="display:flex;gap:2px;align-items:center;min-width:0">${typeBtns}</div>
      ${nameCol}
      <div style="min-width:0;overflow:hidden">${groupCol}</div>
      ${wtPill}${bagPill}${delBtn}
    </div>`;
  });
  return ri.join('');
})();

  const canNext=d.acSetup.length>0&&d.acSetup.every(s=>s.pic)&&d.pax.length>0;
  const _depOther=!!S._rtOther_dep||(!!d.dep&&!_isKnownApt(d.dep));
  const _destOther=!!S._rtOther_dest||(!!d.dest&&!_isKnownApt(d.dest));
  const _otherInput=function(field,val){return '<input tabindex="-1" class="fi" type="text" value="'+(val||'').replace(/"/g,'&quot;')+'" placeholder="Type location" onclick="event.stopPropagation()" onchange="S.dispatch.'+field+'=this.value;autoSaveDispatch();safeRender()" style="margin-top:6px;width:100%;font-size:13px;font-weight:600;background:var(--card);border:1px solid var(--border2);border-radius:6px;padding:5px 7px;color:var(--text1)">';};

  return _tabBar+`
  <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center">
    <button tabindex="-1" class="btn btn-primary" style="font-size:12px" onclick="saveManifest()">💾 Save${S._loadedManifestId?'':' New'}</button>
    ${S._loadedManifestId?`<button tabindex="-1" class="btn btn-ghost" style="font-size:12px" onclick="window.saveManifestAs()" title="Save as a new manifest">💾 Save As New</button>`:''}
    <button tabindex="-1" class="btn btn-ghost" style="font-size:12px" onclick="S.section='operations';S.tab='saved';S.savedTab='manifests';render()">📂 Open Saved</button>
    <button tabindex="-1" class="btn btn-red" style="font-size:12px" onclick="clearManifest()">✕ Clear</button>
    ${S._undoLabel?`<button tabindex="-1" class="btn btn-ghost" style="font-size:12px;border-color:rgba(245,158,11,.5);color:#f59e0b" onclick="undoManifest()">&#x21A9; Undo ${S._undoLabel}</button>`:''}
  </div>
  <div class="card"><div class="st">Flight Details</div>
    <div style="display:flex;align-items:stretch;gap:6px;margin-bottom:8px">
      <div style="flex:1;background:var(--card2);border-radius:10px;padding:10px 12px;border:1px solid var(--border2);cursor:pointer" onclick="this.querySelector('select,input').focus()">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Departure</div>
        <select tabindex="-1" class="fi" onchange="window.setRouteField('dep',this.value)" style="border:none;background:transparent;width:100%;font-size:13px;font-weight:600;padding:0;color:var(--text1)">${aptOpts(_depOther?'':d.dep, _depOther)}</select>
        ${_depOther?_otherInput('dep',d.dep):''}
      </div>
      <button tabindex="-1" onclick="const t=S.dispatch.dep;S.dispatch.dep=S.dispatch.dest;S.dispatch.dest=t;S._rtOther_dep=false;S._rtOther_dest=false;autoSaveDispatch();safeRender()" title="Swap" style="align-self:center;background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:8px 10px;color:var(--accent);font-size:16px;cursor:pointer;flex-shrink:0;line-height:1">&#x21C4;</button>
      <div style="flex:1;background:var(--card2);border-radius:10px;padding:10px 12px;border:1px solid var(--border2);cursor:pointer" onclick="this.querySelector('select,input').focus()">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Destination</div>
        <select tabindex="-1" class="fi" onchange="window.setRouteField('dest',this.value)" style="border:none;background:transparent;width:100%;font-size:13px;font-weight:600;padding:0;color:var(--text1)">${aptOpts(_destOther?'':d.dest, _destOther)}</select>
        ${_destOther?_otherInput('dest',d.dest):''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div style="background:var(--card2);border-radius:10px;padding:10px 12px;border:1px solid var(--border2);cursor:pointer;position:relative" onclick="var i=this.querySelector('input[type=date]');try{i.showPicker&&i.showPicker()}catch(e){i.click()}">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Date</div>
        <div style="font-size:13px;font-weight:600;color:var(--text1)">${_fmtLsDate(d.date)}</div>
        <input type="date" class="fi" value="${d.date}" onchange="S.dispatch.date=this.value;autoSaveDispatch();this.blur();render()" onclick="event.stopPropagation();try{this.showPicker&&this.showPicker()}catch(e){}" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;border:none;background:transparent;touch-action:manipulation;cursor:pointer">
      </div>
      <div style="background:var(--card2);border-radius:10px;padding:10px 12px;border:1px solid var(--border2)">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">ETD</div>
        ${etdSelect(d.etd,d.date,"dispatch")}
      </div>
    </div>
  </div>
  <div class="card"><div class="st">Select Aircraft, PICs & Fuel</div>
    <p style="font-size:12px;color:var(--text3);margin-bottom:10px">Tap aircraft to select. Co-pilot optional — if blank, Seat 1 is a passenger seat.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px;align-items:start">${acCards}</div>
    ${d.acSetup.length&&!d.acSetup.every(s=>s.pic)?`<div style="font-size:12px;color:var(--warn-text);margin-top:4px">⚠ Assign a PIC to each selected aircraft</div>`:''}
  </div>
  <div style="position:sticky;top:0;z-index:100;background:var(--bg);padding:4px 0 6px;margin:-4px 0">
  <div class="card" style="margin-bottom:0;border-radius:8px">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span style="font-size:12px;font-weight:700;color:var(--text2)">Passengers</span>
      <span style="font-size:12px;color:var(--text3)">${d.pax.filter(p=>!p.infant).length} pax · ${totalSeats} seats</span>${d.acSetup.length?d.acSetup.map(s=>{const c=d.pax.filter(p=>p.pinAc===s.acId&&!p.infant).length;const cap=S.aircraft[s.acId]?paxSeatIdxs(s.acId).length:0;const col=AC_COL[s.acId]||"#888";const over=c>cap;return c?`·<span style="color:${over?'#ef4444':col};font-weight:700;${over?'border:2px solid #ef4444;border-radius:8px;padding:1px 6px':''}">${s.acId.replace('ZK-','')} ${c}/${cap}</span>`:""}).join(""):""}
      ${(()=>{const nonInf=d.pax.filter(p=>!p.infant).length;return nonInf>totalSeats&&totalSeats>0?`<span style="color:#ef4444;font-weight:700">⚠ ${nonInf-totalSeats} over capacity</span>`:'';})()} 
    </div>
  </div>
    ${!S.mobileView?`<div style="display:grid;grid-template-columns:80px 52px 1.5fr 72px 56px 56px 28px;gap:5px;padding:4px 0 6px;border-bottom:2px solid var(--border);margin-bottom:2px">
      ${'AC,TYPE,NAME,GROUP,WT,BAG,'.split(',').map(h=>`<span style="font-size:10px;font-weight:700;color:var(--text3)">${h}</span>`).join('')}
    </div>`:''}</div>
    ${paxRows}
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <button tabindex="-1" class="btn btn-ghost" style="flex:1;font-size:13px" onclick="addPax()">+ Add Passenger</button>
      ${(()=>{const empty=d.pax.filter(p=>!p.infant&&!p.name&&!p.infantName&&(!p.weight||p.weight===0)&&(!p.bag||p.bag===0));return empty.length?`<button tabindex="-1" class="btn btn-ghost" style="font-size:13px;color:#ef4444;border-color:rgba(239,68,68,.4)" onclick="window.removeEmptyPax()">&#x2715; Remove ${empty.length} Empty</button>`:''})()}
      ${(S._paxUndo&&S._paxUndo.length)?`<button tabindex="-1" class="btn btn-ghost" style="font-size:13px;color:#f59e0b;border-color:rgba(245,158,11,.4)" onclick="window.undoPax()">&#x21A9; Undo Delete (${S._paxUndo.length})</button>`:""}
    </div>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button tabindex="-1" class="btn-full ${canNext?'btn-primary':'btn-disabled'}" style="flex:2;min-width:200px" onclick="${canNext?'autoAllocate()':''}"
      ${!canNext?'disabled':''}>Auto-Allocate & Open Seat Map →</button>
    <button tabindex="-1" class="btn-full ${d.pax.filter(p=>!p.infant).length?'btn-ghost':'btn-disabled'}" style="flex:1;min-width:150px;${d.pax.filter(p=>!p.infant).length?'border-color:rgba(99,179,237,.6);color:#63b3ed':''}" onclick="${d.pax.filter(p=>!p.infant).length?'sendManifestToPool()':''}"
      ${d.pax.filter(p=>!p.infant).length?'':'disabled'}>↓ Send to Pool</button>
  </div>
  <p style="font-size:11px;color:var(--text3);margin:6px 2px 0">Pushing copies these passengers into the seatmap workspace — your manifest stays put, so you can push from any manifest and clear the seatmap freely.</p>
  ${renderManifestStickyBar()}
`;
}


// ── MANIFEST STEP 2: Dual-aircraft seat map ──

function cogPillClass(cog, cogMin, cogMax){
  if(!cog||!cogMax) return 'pill-blue';   // unknown CoG (no data / misconfigured aircraft) — neutral, not a reassuring green
  if(cog>cogMax||cog<cogMin) return 'pill-red';
  // Caravan: cogMax ~204.4, warn from 203 (1.4" away)
  // Airvan: cogMax ~64, warn from 63 (1" away)
  const range=cogMax-cogMin;
  const warnDist=range<100?1.0:1.4; // 1" airvan, 1.4" caravan
  const warnMin=cogMin+warnDist; const warnMax=cogMax-warnDist;
  const orangeDist=warnDist*0.5;
  const orangeMax=cogMax-orangeDist; const orangeMin=cogMin+orangeDist;
  if(cog>=orangeMax||cog<=orangeMin) return 'pill-orange';
  if(cog>=warnMax||cog<=warnMin) return 'pill-warn';
  return 'pill-green';
}
window.toggleLockAc=function(acId){
  S.lockedAcs=S.lockedAcs||[];
  const i=S.lockedAcs.indexOf(acId);
  if(i>=0) S.lockedAcs.splice(i,1);
  else S.lockedAcs.push(acId);
  autoSaveDispatch();render();
};

window.reAllocate=function(){
  // Re-seat the SEATMAP WORKSPACE (never the manifest).
  const d=curDisp();
  const locked=S.lockedAcs||[];
  if(locked.length===0){
    // Full re-allocation: clear all seats first, then re-seat the workspace pax
    d.seatMap={};d.origAcMap={};
    _seatWorkspaceUnseated();
    _seatmapSyncPool();
    S.solverAutoApply=true;runSolver();saveSeatmapWS();render();
    return;
  }
  // Partial re-allocation: keep locked aircraft seats, clear unlocked, then fill
  const lockedPaxIds=new Set();
  locked.forEach(function(id){
    Object.values(d.seatMap[id]||{}).forEach(function(pid){lockedPaxIds.add(pid);});
  });
  // Clear only the unlocked aircraft seats
  const acs=d.acSetup.map(function(s){return s._seatmapKey||s.acId;});
  acs.forEach(function(id){
    if(!locked.includes(id))delete d.seatMap[id];
  });
  // Temporarily pin locked pax so re-seat leaves them alone
  const origPins={};
  d.pax.forEach(function(p){
    origPins[p.id]=p.pinAc;
    if(lockedPaxIds.has(p.id)){
      locked.forEach(function(id){
        if(Object.values(d.seatMap[id]||{}).includes(p.id))p.pinAc=id;
      });
    } else {
      p.pinAc=null;
    }
  });
  _seatWorkspaceUnseated();
  d.pax.forEach(function(p){p.pinAc=origPins[p.id];});
  _seatmapSyncPool();
  S.solverAutoApply=true;runSolver();saveSeatmapWS();render();
};

window.applySwapFix=function(acId,fromIdx,toIdx){
  const d=curDisp();
  const sm=(d.seatMap||{})[acId]||{};
  const fromPax=sm[fromIdx];
  const toPax=sm[toIdx];
  if(fromPax) sm[toIdx]=fromPax; else delete sm[toIdx];
  if(toPax) sm[fromIdx]=toPax; else delete sm[fromIdx];
  d.seatMap[acId]=sm;
  runSolver();saveSeatmapWS();
  S.appMsg={type:'ok',text:'Swap applied — check CoG is now within limits'};
  render();
};

// === restored: cabin seatmap renderer (was lost in modularization, caused 'something went wrong' on Seatmap) ===
function renderCabinSVG(acId,interactive,form,_sz,_ht,smKey){
  if(typeof seatSz==='undefined'){var seatSz=_sz||64;var seatHt=_ht||52;}
  const a=_acSpec(acId);if(!a)return'';
  const _key=smKey||acId; // seat-data key: the duplicate-instance key if there is one
  const layout=acLayout(acId);
  const isGA8=a.layout==='ga8';
  const col=AC_COL[_ac(acId)]||'#1e6b8c';
  const d=curDisp();
  const sm=interactive?(d.seatMap||{})[_key]||{}:{};
  const formSm=form?form.names:null; // for loadsheet view
  const rows=layout.filter(r=>r!=='spacer');
  const hasSpacerBefore=(idx)=>layout.slice(0,layout.indexOf(layout.filter(r=>r!=='spacer')[idx])).some(r=>r==='spacer');

  // Build seat rows HTML
  let seatRowsHTML='';
  let rowIdx=0;
  layout.forEach((row,li)=>{
    if(row==='spacer'){seatRowsHTML+=`<div style="height:${isGA8?'16px':'10px'}"></div>`;return;}
    // Compute row total weight
    const rowWt=row.filter(c=>!c.crew&&c.i!==0&&!(c.i===1&&seat1IsCoPilot(acId))).reduce((s,c)=>{
      if(interactive){
        const pid=sm[c.i];const p=pid?paxById(pid):null;
        return s+(p?parseFloat(p.weight||0)+parseFloat(p.bag||0):0);
      } else if(form){
        return s+parseFloat(form.seats?.[c.i]||0)+parseFloat(form.bags?.[c.i]||0);
      }
      return s;
    },0);
    seatRowsHTML+=`<div style="display:flex;gap:7px;justify-content:center;align-items:center;margin-bottom:7px">`;
    row.forEach(cell=>{
      const isPIC=cell.i===0;
      const isCoPilotSeat=cell.i===1&&seat1IsCoPilot(acId);
      const isCrew=isPIC||isCoPilotSeat;
      if(!interactive&&form){
        // Loadsheet view — same style as manifest allocation cards
        const nm=formSm?formSm[cell.i]||'':'';
        // Read group/infant from the FORM's own per-seat maps (keyed by seat index), not by
        // matching the name against d.pax — duplicate/blank names otherwise mis-coloured groups.
        const isInfant=!!(form.infantNames||{})[cell.i];
        const wt=form?parseFloat(form.seats?.[cell.i]||0)+parseFloat(form.bags?.[cell.i]||0):0;
        const grp=(form.paxGroups||{})[cell.i]||'';
        const gc=grp?groupColor(grp):null;
        // Match interactive card style: white bg + coloured left border when filled
        const lsSeatStyle=isCrew?''
          :nm?('background:rgba(255,255,255,.93);border-left:4px solid '+(gc||col)+';border-radius:8px')
          :'background:rgba(255,255,255,.05);border-radius:8px';
        const lsTextCol=nm&&!isCrew?'color:#1a2035':'color:rgba(255,255,255,.7)';
        const _payF=!isCrew&&nm&&(form.paxPaymentReq||{})[cell.i];
        seatRowsHTML+=`<div class="seat ${isCrew?'crew':nm?'filled':''} ${S._selFormSeat===cell.i?'sel-src':''}" style="position:relative;overflow:hidden;width:${seatSz}px;height:${seatHt}px;${lsSeatStyle}${_payF?';border:2px solid #ef4444':''}${S._selFormSeat===cell.i?';box-shadow:0 0 0 2px #f59e0b':''}" onclick="${!isCrew?`tapFormSeat(${cell.i},'${acId}')`:''}" draggable="${!isCrew&&nm?'true':'false'}" ondragstart="if(${!isCrew&&!!nm})startDragForm(event,${cell.i},'${acId}')" ondragover="event.preventDefault()" ondrop="dropFormSeat(event,${cell.i},'${acId}')">
          ${_payF?`<div style="position:absolute;top:0;left:0;right:0;background:#ef4444;color:#fff;font-size:7px;font-weight:900;text-align:center;line-height:1.5">$ TO PAY</div>`:''}
          <span class="seat-lbl" style="${_payF?'margin-top:10px;':''}${nm&&!isCrew?'color:#475569;opacity:.7':''}font-size:9px">${cell.lbl}</span>
          ${gc?`<div class="seat-dot" style="background:${gc};top:3px;right:3px"></div>`:''}
          ${nm?`<div class="seat-name" style="${lsTextCol};font-weight:700;font-size:${seatSz<52?'7px':'9px'}">${nm.split(' ')[0].slice(0,seatSz<52?5:9)}${(form?.infantNames?.[cell.i])?' 👶':''}</div><div class="seat-wt" style="${lsTextCol};font-size:${seatSz<52?'7px':'8px'}">${wt>0?wt+'kg':''}</div>`:isCrew?`<div class="seat-name" style="color:rgba(255,255,255,.85);font-weight:700">${isPIC?'PIC':'CP'}</div>`:''}
        </div>`;
      } else {
        // Manifest seat map view
        const pid=sm[cell.i];const p=pid?paxById(pid):null;
        const gc=p?.group?.trim()?groupColor(p.group.trim()):null;
        const setup=d.acSetup.find(s=>(s._seatmapKey||s.acId)===_key);
        const crewName=isPIC?(setup?.pic||'PIC'):(setup?.coPilot||'CP');
        const isSrcSel=S.selectedPax&&p&&p.id===S.selectedPax;
        const isDrop=S.selectedPax&&!p&&!isCrew;
        const origAc=p&&d.origAcMap?d.origAcMap[p.id]:null;
        const movedIn=origAc&&origAc!==_key;
        const leftBorderCol=movedIn?(AC_COL[_ac(origAc)]||col):col;
        const needPay=p&&!isCrew&&p.paymentReq;
        // Filled: white bg + dark text. Empty: dark bg + light text. Crew: CSS handles.
        const seatStyle=isCrew?''
          :p?('background:rgba(255,255,255,.93);border-left:4px solid '+leftBorderCol+';border-radius:8px')
          :'background:rgba(255,255,255,.05);border-radius:8px';
        // Text colour set per-seat based on background
        const textCol=p&&!isCrew?'color:#1a2035':'color:rgba(255,255,255,.7)';
        seatRowsHTML+=`<div class="seat ${isCrew?'crew':p?'filled':''} ${isSrcSel?'sel-src':''} ${isDrop?'drop-target':''}"
          style="width:66px;height:54px;position:relative;overflow:hidden;${seatStyle}${needPay?';border:2px solid #ef4444':''}"
          onclick="tapSeat(${cell.i},'${_key}')"
          draggable="${!!p&&!isCrew}" ondragstart="if(${!!p&&!isCrew})startDrag(event,'${p?p.id:''}','${_key}',${cell.i})"
          ondragover="event.preventDefault()" ondrop="dropOnSeat(event,${cell.i},'${_key}')">
          ${needPay?`<div style="position:absolute;top:0;left:0;right:0;background:#ef4444;color:#fff;font-size:10px;font-weight:900;letter-spacing:.06em;text-align:center;line-height:1.7;padding:0 2px">$ TO PAY</div>`:''}
          <span class="seat-lbl" style="${needPay?'margin-top:15px;':''}${p&&!isCrew?'opacity:.4;color:#334155':''}">${cell.lbl}</span>
          ${gc?`<div class="seat-dot" style="background:${gc}${needPay?';top:13px':''}"></div>`:''}
          ${p&&!isCrew&&p.type==='child'?`<div style="position:absolute;bottom:3px;right:3px;font-size:8px;font-weight:900;background:rgba(251,146,60,.5);color:#c2500a;border-radius:3px;padding:0 3px;line-height:1.4;border:1px solid rgba(0,0,0,.4)">C</div>`:''}
          ${p&&!isCrew&&p.infantName?`<div style="position:absolute;bottom:3px;right:${p.type==='child'?'18px':'3px'};font-size:8px;font-weight:900;background:rgba(236,72,153,.5);color:#9d1768;border-radius:3px;padding:0 3px;line-height:1.4;border:1px solid rgba(0,0,0,.4)">i</div>`:''}
          ${isCrew?`<div class="seat-name" style="color:rgba(255,255,255,.88);font-size:9px">${crewName.split(' ').slice(-1)[0]}</div><div class="seat-wt" style="color:rgba(255,255,255,.55)">${isPIC?'PIC':'CP'}</div>`
            :p?`<div class="seat-name" style="color:#1e293b;font-weight:700">${esc(p.name?p.name.split(' ')[0]:'?')}</div><div class="seat-wt" style="color:#334155">${parseFloat(p.weight||0)+parseFloat(p.bag||0)}kg</div>`:''}
        </div>`;
      }
    });
    seatRowsHTML+=`<div style="font-size:10px;color:var(--text3);width:28px;min-width:28px;text-align:center;font-weight:600;line-height:1.2;margin-left:2px">${rowWt>0?rowWt.toFixed(0)+'<br><span style="font-weight:400;font-size:9px">kg</span>':''}</div>`;
    seatRowsHTML+='</div>';
    rowIdx++;
  });

  const cabinBg=col;
  return`<div>
    <div style="background:${cabinBg}22;border:2px solid ${cabinBg};border-radius:${isGA8?'16px 16px 10px 10px':'18px 18px 12px 12px'};padding:10px 8px;display:inline-block;min-width:${isGA8?'155px':'160px'}">
      <div style="text-align:center;font-size:9px;color:${cabinBg};font-weight:700;letter-spacing:.1em;margin-bottom:6px">▲ FRONT</div>
      ${seatRowsHTML}
      <div style="text-align:center;font-size:9px;color:${cabinBg};font-weight:700;letter-spacing:.1em;margin-top:4px">▼ REAR</div>
    </div>
    ${(()=>{
      // Show cargo/baggage zones if any values entered
      const cargoItems=a.cargo||[];
      if(!cargoItems.length) return "";
      const cargoVals=interactive?((d&&d.cargo&&d.cargo[acId])||{}):form?(form.cargo||{}):(S.form?.cargo||{});
      const hasVal=cargoItems.some((_,i)=>parseFloat(cargoVals[i]||0)>0);
      if(!hasVal) return "";
      const rows=cargoItems.map((c,i)=>{
        const w=parseFloat(cargoVals[i]||0);
        if(!w) return "";
        return`<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 6px;background:rgba(0,0,0,.1);border-radius:4px;margin-bottom:2px">
          <span style="font-size:10px;color:${cabinBg}">${c.lbl}</span>
          <span style="font-size:11px;font-weight:700;color:var(--text)">${w}kg</span>
        </div>`;
      }).join("");
      if(!rows) return "";
      return`<div style="margin-top:6px;padding:6px;background:${cabinBg}15;border:1px solid ${cabinBg}44;border-radius:6px;min-width:155px">
        <div style="font-size:9px;color:${cabinBg};font-weight:700;letter-spacing:.08em;margin-bottom:4px">CARGO / PODS</div>
        ${rows}
      </div>`;
    })()}
  </div>`;
}

function renderStep2(){
  const d=curDisp();
  _seatmapSyncPool(); // keep seatmap "Unassigned" in step with the shared loadsheet pool
  const setups=d.acSetup||[];
  // Find open loadsheet tabs not yet in the seatmap
  const _lsTabs=S.lsTabs||[];
  const _inSeatmap=new Set((setups).map(s=>s.acId));
  const _notInSeatmap=_lsTabs.filter(t=>t.form&&t.form.ac&&!_inSeatmap.has(t.form.ac));
  const _lsBanner='';
  const _poolNoAc=(d.pax||[]).filter(p=>!p.infant).length;
  if(!setups.length){
    // Passengers were sent to the pool but no aircraft chosen yet — show the pool
    if(_poolNoAc){
      const ua=(d.pax||[]).filter(p=>!p.infant);
      return `<div class="card" style="text-align:center;padding:18px;color:var(--text3);margin-bottom:12px">${_poolNoAc} passenger${_poolNoAc!==1?'s':''} in the pool. Choose aircraft on the <button class="btn btn-ghost" style="font-size:13px" onclick="S.tab='manifest';render()">Manifest</button>, then Auto-Allocate — or push a manifest with aircraft.</div>
      <div class="card" style="padding:10px 12px"><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Unassigned (${ua.length}) <button style="font-size:11px;padding:2px 8px;border-radius:12px;border:1px solid rgba(239,68,68,.4);background:transparent;color:#ef4444;cursor:pointer;float:right" onclick="if(confirm('Clear all pooled passengers from the seatmap? (Manifests are not affected.)'))window.clearUnassigned()">Clear All</button></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${ua.map(p=>{const wt=parseFloat(p.weight||0)+parseFloat(p.bag||0);return`<div class="seat filled" style="background:rgba(255,255,255,.93);border-left:4px solid #64748b;flex-shrink:0"><div class="seat-name" style="color:#1e293b;font-weight:700">${esc(p.name?p.name.split(' ')[0]:'?')}</div><div class="seat-wt" style="color:#334155">${wt>0?wt+'kg':''}</div></div>`;}).join('')}</div></div>`;
    }
    S.tab='manifest';render();return'';
  }

  const solverHTML=setups.map(function(setup){
    const id=setup.acId;const smKey=setup._seatmapKey||id;
    const sr=S.solverRes[smKey];if(!sr||sr.err)return'';
    let msgs=[];
    if(sr.towFatal)msgs.push('<div class="solver-box solver-err">&#x26d4; <strong>'+id+' TOW '+sr.tow?.toFixed(1)+'kg &mdash; '+sr.towOver?.toFixed(1)+'kg over MTOW ('+sr.mtow+'kg)</strong><br>Cannot be resolved with fuel alone. Remove passengers.</div>');
    else if(!sr.towOk&&sr.suggestKg)msgs.push('<div class="solver-box solver-warn">&#x26a0; <strong>'+id+' TOW '+sr.tow?.toFixed(1)+'kg &mdash; '+sr.towOver?.toFixed(1)+'kg over MTOW</strong><br>Reduce fuel by <strong>'+sr.suggestKg.toFixed(1)+'kg ('+sr.suggestUnit+')</strong>.</div>');
    if(!sr.cogOk){
      let cogMsg='&#x26d4; <strong>'+id+' C of G '+sr.cog?.toFixed(2)+'" '+(sr.cog>sr.cogMax?'AFT':'FWD')+' of limits ('+sr.cogMin+'&ndash;'+sr.cogMax+'")</strong>';
      if(sr.cogSwapSuggestion){const sw=sr.cogSwapSuggestion;cogMsg+='<br>&#x1f4a1; Suggested fix: move <strong>'+sw.pname+'</strong> to Seat 1'+(sw.prev1name?' (swap with '+sw.prev1name+')':'')+' &rarr; projected CoG '+sw.newCog.toFixed(2)+'"'+(sw.fixes?' &#x2713; legal':'');if(sw.fixes)cogMsg+='&nbsp;<button onclick="window.applySwapFix(\''+smKey+'\','+sw.fromIdx+',1)" style="margin-left:8px;padding:2px 8px;background:var(--ok-bg);border:1px solid var(--ok-border);border-radius:4px;font-size:11px;cursor:pointer;color:var(--ok-text)">Apply Fix</button>';}
      else if(sr.cog>sr.cogMax)cogMsg+='<br>Move the heaviest non-front passenger to Seat 1 to shift CoG forward';
      else cogMsg+='<br>Move a heavy passenger aft to shift CoG rearward';
      msgs.push('<div class="solver-box solver-err">'+cogMsg+'</div>');
    }
    return msgs.join('');
  }).join('');

  const groups=[...new Set((d.pax||[]).map(p=>p.group).filter(g=>g?.trim()))];

  // Unassigned pax pool
  const allAssigned=new Set(Object.values(d.seatMap||{}).flatMap(sm=>Object.values(sm)));
  const unassigned=(d.pax||[]).filter(p=>!allAssigned.has(p.id));

  const cabinsHTML=setups.map(function(setup){
    const id=setup.acId;const smKey=setup._seatmapKey||id;
    const dispSuffix=setup._displaySuffix?' '+setup._displaySuffix:'';
    const a=S.aircraft[id];const col=AC_COL[id]||'#1e6b8c';
    const sr=S.solverRes[smKey];
    const paxCount=paxSeatIdxs(id).filter(i=>(d.seatMap[smKey]||{})[i]).length;
    const paxTotal=paxSeatIdxs(id).length;
    // Pax breakdown in AC format, e.g. 12A1C1i
    let _A=0,_C=0,_I=0;
    Object.values(d.seatMap[smKey]||{}).forEach(function(pidv){var pp=paxById(pidv);if(!pp)return;if(pp.type==='child')_C++;else _A++;if(pp.infantName)_I++;});
    const paxFmt=((_A?_A+'A':'')+(_C?_C+'C':'')+(_I?_I+'i':''))||'0';
    const _srcTag=(setup._srcManifest||'').replace(/[<>&"]/g,'');
    const _ok=sr?.towOk&&sr?.lwOk&&sr?.cogOk;const _warn=sr&&!_ok&&!sr?.towFatal&&!sr?.lwFatal;
    return`<div style="margin-bottom:16px;width:fit-content">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <div style="width:10px;height:10px;border-radius:50%;background:${col};flex-shrink:0"></div>
        <span style="font-weight:700;font-size:13px">${(a?.name||id)+dispSuffix}</span>
        <button onclick="window.removeAcFromSeatmap('${smKey}')" style="margin-left:auto;padding:2px 8px;border-radius:6px;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.1);color:#ef4444;font-size:11px;cursor:pointer" title="Remove this aircraft from the seatmap — its card disappears and its passengers go to the pool (manifest not affected)">&#x2715; Remove aircraft</button>
      </div>
      ${sr?`<div style="display:flex;gap:6px;justify-content:center;margin-bottom:4px;flex-wrap:wrap">
        <span class="pill ${sr.towOk?'pill-green':sr.towFatal?'pill-red':'pill-warn'}">${sr.tow?.toFixed(0)}/${sr.mtow}kg</span>
        <span class="pill ${cogPillClass(sr.cog,sr.cogMin,sr.cogMax)}">CoG ${sr.cog?.toFixed(2)}"</span>
      </div>`:''}
      <div style="display:flex;justify-content:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">
        <span class="pill pill-blue">${paxFmt} · ${paxCount}/${paxTotal}</span>
        ${_srcTag?`<span class="pill" style="background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.45);color:#c4b5fd" title="Pushed from this manifest">📋 ${_srcTag}</span>`:''}
      </div>
      <div style="display:inline-flex;flex-direction:column" ondragover="event.preventDefault()" ondrop="dropOnPool(event,'${smKey}')">
        ${renderCabinSVG(id,true,null,undefined,undefined,smKey)}
        <button onclick="window.createLsTab('${smKey}')" style="margin-top:8px;padding:9px;border-radius:8px;border:none;background:${_ok?'linear-gradient(135deg,#166534,#15803d)':_warn?'linear-gradient(135deg,#78350f,#92400e)':'#7f1d1d'};color:#fff;font-size:13px;font-weight:700;cursor:pointer;align-self:stretch">
          Create Loadsheet ${_ok?'&#x2713;':_warn?'&#x26a0;':'&#x26d4;'}
        </button>
      </div>
    </div>`;
  }).join('');

  const _hasSel=!!S.selectedPax;
  const poolHTML=`<div class="card" style="padding:10px 12px;margin-bottom:12px;${_hasSel&&!unassigned.length?'border-color:var(--acc);box-shadow:0 0 0 1px var(--acc)':''}" ondragover="event.preventDefault()" ondrop="dropOnPool(event)" onclick="window.tapPool(event)">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;flex:1">Unassigned${unassigned.length?' ('+unassigned.length+')':''}</div>
      ${S._unassignedUndo?`<button style="font-size:11px;padding:2px 8px;border-radius:12px;border:1px solid #f59e0b;background:rgba(245,158,11,.12);color:#f59e0b;cursor:pointer;font-weight:700" onclick="event.stopPropagation();window.undoClearUnassigned()">↩ Undo</button>`:''}
      ${unassigned.length?`<button style="font-size:11px;padding:2px 8px;border-radius:12px;border:1px solid rgba(239,68,68,.4);background:transparent;color:#ef4444;cursor:pointer" onclick="event.stopPropagation();if(confirm('Remove all unassigned passengers from the seatmap? (Your manifests are not affected.)'))window.clearUnassigned()">Clear All</button>`:''}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;min-height:54px;align-items:flex-start">
      ${unassigned.length?unassigned.map(p=>{
        const gc=p.group?.trim()?groupColor(p.group.trim()):null;
        const isSel=S.selectedPax===p.id;
        const wt=parseFloat(p.weight||0)+parseFloat(p.bag||0);
        const borderCol=p._pushedFrom?(AC_COL[p._pushedFrom]||gc||'#64748b'):gc||'#64748b';
        const _poolPay=!!p.paymentReq;
        const cardStyle=isSel?'background:rgba(255,255,255,.97);border:2px solid #ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.35),0 2px 10px rgba(0,0,0,.25)':('background:rgba(255,255,255,.93);'+(_poolPay?'border:2px solid #ef4444':'border-left:4px solid '+borderCol));
        return`<div class="seat filled" style="position:relative;overflow:hidden;${cardStyle};flex-shrink:0" onclick="event.stopPropagation();tapPax('${p.id}')" draggable="true" ondragstart="startDrag(event,'${p.id}','pool',null)" ondragover="event.preventDefault();event.stopPropagation()" ondrop="event.stopPropagation();window.dropOnPoolPax('${p.id}',event)">
          ${_poolPay?`<div style="position:absolute;top:0;left:0;right:0;background:#ef4444;color:#fff;font-size:8px;font-weight:900;letter-spacing:.04em;text-align:center;line-height:1.6">$ TO PAY</div>`:''}
          ${gc?`<div class="seat-dot" style="background:${gc}${_poolPay?';top:13px':''}"></div>`:''}
          ${p.type==='child'?'<div style="position:absolute;bottom:3px;right:3px;font-size:8px;font-weight:900;background:rgba(251,146,60,.5);color:#c2500a;border-radius:3px;padding:0 3px;line-height:1.4;border:1px solid rgba(0,0,0,.4)">C</div>':''}
          ${p.infantName?'<div style="position:absolute;bottom:3px;right:'+(p.type==='child'?'18px':'3px')+';font-size:8px;font-weight:900;background:rgba(236,72,153,.5);color:#9d1768;border-radius:3px;padding:0 3px;line-height:1.4;border:1px solid rgba(0,0,0,.4)">i</div>':''}
          <div class="seat-name" style="color:#1e293b;font-weight:700;${_poolPay?'margin-top:11px':''}">${esc(p.name?p.name.split(' ')[0]:'?')}</div>
          <div class="seat-wt" style="color:#334155">${wt>0?wt+'kg':''}</div>
        </div>`;
      }).join(''):''}
      <div class="seat" ondragover="event.preventDefault();this.style.outline='2px solid var(--acc)'" ondragleave="this.style.outline=''" ondrop="event.preventDefault();event.stopPropagation();this.style.outline='';window.dropOnPool(event)" onclick="event.stopPropagation();window.tapPool(event)" style="flex-shrink:0;border:2px dashed ${_hasSel?'#f59e0b':'var(--border2)'};background:transparent;cursor:pointer;opacity:${_hasSel?'1':'.6'};display:flex;flex-direction:column;align-items:center;justify-content:center" title="Drag a seat here to unassign">
        <div style="font-size:18px;color:${_hasSel?'#f59e0b':'var(--border2)'};line-height:1">+</div>
        <div style="font-size:8px;color:var(--text3);line-height:1.2">drag here</div>
      </div>
    </div>
  </div>`;

  const hasLsTabs=S.lsTabs&&S.lsTabs.length>0;

  return`
  ${_lsBanner}
  ${solverHTML?`<div style="margin-bottom:12px">${solverHTML}</div>`:''}
  ${poolHTML}
  <div class="card" style="padding:12px">
    <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;overflow-x:auto;-webkit-overflow-scrolling:touch">
      ${cabinsHTML}
    </div>
  </div>
  ${groups.length?`<div class="card" style="padding:10px 12px">
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Groups</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      ${groups.map(g=>`<div style="display:flex;align-items:center;gap:5px"><div style="width:9px;height:9px;border-radius:50%;background:${groupColor(g)}"></div><span style="font-size:12px">${g}</span></div>`).join('')}
    </div>
  </div>`:''}
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
    <button class="btn btn-ghost" onclick="S.tab='manifest';window.scrollTo(0,0);render()">&#x2190; Back to Manifest</button>
    <button class="btn btn-ghost" onclick="window.clearSeatmap()" style="border-color:rgba(245,158,11,.4);color:#f59e0b" title="Unseat everyone — they drop to the pool">&#x2715; Clear Seats to Pool</button>
    <button class="btn btn-ghost" onclick="window.resetSeatmap()" style="border-color:rgba(239,68,68,.5);color:#ef4444" title="Empty the whole seatmap (manifests are not affected)">&#x1F5D1; Delete Seatmap</button>
  </div>`;
}

window.inlineEditPaxField=function(oi,field,el){
  var cur=S.dispatch.pax[oi]?.[field]||'';
  var inp=document.createElement('input');
  inp.type='number';inp.inputMode='decimal';inp.value=cur;
  inp.style.cssText='width:56px;font-size:11px;background:var(--card2);border:1px solid var(--acc);border-radius:6px;color:var(--text1);padding:2px 5px;outline:none;-moz-appearance:textfield';
  inp.onblur=function(){setPaxField(oi,field,this.value.trim());};
  inp.onkeydown=function(e){if(e.key==='Enter'||e.key==='Escape')this.blur();};
  el.replaceWith(inp);inp.focus();inp.select();
};

window.saveManifestTabName=function(name,id){
  S._editingManifestTabId=null;
  var trimmed=(name||'').trim();
  if(trimmed){
    if(id===S.activeManifestTabId){
      S.dispatch.name=trimmed;
      autoSaveDispatch();
    } else if(S._manifestDispatches&&S._manifestDispatches[id]){
      S._manifestDispatches[id].name=trimmed;
    }
  }
  render();
  // Re-focus after render
  setTimeout(function(){var el=document.getElementById('tab-rename-'+id);if(el){el.focus();}},0);
};
