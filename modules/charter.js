// === MODULE: charter === v1.0 ===
function renderCharter(){
  const sub=S.charterTab||'calc';
  const tabBar='<div style="display:flex;gap:6px;margin-bottom:14px">'+
    [{id:'calc',lbl:'Calculator'},{id:'saved',lbl:'Saved Quotes'},{id:'rates',lbl:'Rates'}].map(t=>
      '<button class="sub-tab '+(sub===t.id?'on':'')+'" onclick="S.charterTab=\''+t.id+'\';render()">'+t.lbl+'</button>'
    ).join('')+'</div>';

  if(sub==='rates') return tabBar+renderCharterRates();
  if(sub==='saved') return tabBar+renderSavedQuotes();

  // ── Calculator tab ──
  const c=S.charter;
  const legs=c.legs||[{from:'NZQN',to:'NZMF',acId:'',waitHrs:0,note:''}];
  const waitRate=S.charterWaitRate||150;

  const legCards=legs.map((leg,i)=>{
    const a=S.aircraft[leg.acId];const rates=leg.acId?S.charterRates[leg.acId]:null;
    const dist=distNm(leg.from,leg.to);const speed=a?.layout==='ga8'?130:170;
    const flightHrs=dist>0?dist/speed:0;
    const flightMins=Math.round(flightHrs*60);
    const legCost=rates&&flightHrs>0?flightHrs*rates.perHour:0;
    const waitHrs=parseFloat(leg.waitHrs)||0;
    const billableWait=Math.max(0,waitHrs-1); // first hour free
    const waitCost=billableWait*waitRate;
    return`<div class="leg-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-weight:700;font-size:13px;color:var(--text2)">Leg ${i+1}</span>
        ${legs.length>1?`<button class="icon-btn red" onclick="removeLeg(${i})" style="width:26px;height:26px;font-size:12px">✕</button>`:''}
      </div>
      <div class="g2" style="margin-bottom:10px">
        <div><label>From</label>
          <select class="fi" onchange="setLeg(${i},'from',this.value)">
            ${aptOpts(leg.from)}
          </select></div>
        <div><label>To</label>
          <select class="fi" onchange="setLeg(${i},'to',this.value)">
            ${aptOpts(leg.to)}
          </select></div>
      </div>
      <div style="margin-bottom:10px">
        <label>Aircraft</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          ${Object.values(S.aircraft).map(x=>{const col=AC_COL[x.id]||'#64748b';const sel=leg.acId===x.id;return`<button onclick="setLeg(${i},'acId','${x.id}')" style="padding:6px 12px;border-radius:7px;border:2px solid ${col};background:${sel?col:'transparent'};color:${sel?'#fff':col};font-size:12px;font-weight:700;cursor:pointer;transition:all .15s">${x.id.replace('ZK-','')}</button>`;}).join('')}
          ${leg.acId?`<button onclick="setLeg(${i},'acId','')" style="padding:6px 10px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-size:11px;cursor:pointer">✕ Clear</button>`:''}
        </div>
      </div>
      <div class="g2" style="margin-bottom:10px">
        <div>
          <label>Pilot Wait Time (hrs)</label>
          <input class="fi" type="number" min="0" step="0.25" placeholder="0" value="${leg.waitHrs||''}" onblur="setLeg(${i},'waitHrs',parseFloat(this.value)||0)">
          <div style="font-size:11px;color:var(--text3);margin-top:3px">First hour free · $${waitRate}/hr after</div>
        </div>
        <div><label>Notes</label>
          <input class="fi" type="text" placeholder="e.g. Milford Sound scenic" value="${leg.note||''}" onblur="setLeg(${i},'note',this.value)"></div>
      </div>
      ${a&&rates&&dist>0?`<div style="background:var(--card2);border-radius:8px;padding:10px;display:grid;grid-template-columns:repeat(${waitHrs>0?4:3},1fr);gap:8px;text-align:center">
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em">Distance</div><div style="font-weight:700">${dist.toFixed(0)} nm</div></div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em">Flight Time</div><div style="font-weight:700">${Math.floor(flightMins/60)}h ${String(flightMins%60).padStart(2,'0')}m</div></div>
        ${waitHrs>0?`<div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em">Wait Cost</div><div style="font-weight:700;color:${billableWait>0?'#fbbf24':'#6ee7b7'}">${billableWait>0?'$'+waitCost.toFixed(0):'Free'}</div></div>`:''}
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em">Leg Cost (incl. GST)</div><div style="font-weight:700;color:#86efac">$${(legCost+waitCost).toFixed(0)}</div></div>
      </div>`:''}
    </div>`;
  }).join('');

  // Total
  let totalCost=0,totalDist=0,totalMins=0,totalWaitHrs=0,totalWaitCost=0;
  legs.forEach(leg=>{
    const dist2=distNm(leg.from,leg.to);const speed2=S.aircraft[leg.acId]?.layout==='ga8'?130:170;
    const fh=dist2>0?dist2/speed2:0;
    const r2=leg.acId?S.charterRates[leg.acId]:null;
    const lc=r2&&fh>0?fh*r2.perHour:0;
    const wh=parseFloat(leg.waitHrs)||0;
    const wc=Math.max(0,wh-1)*waitRate;
    totalCost+=lc+wc;totalDist+=dist2;totalMins+=fh*60;
    totalWaitHrs+=wh;totalWaitCost+=wc;
  });
  // 2.5hr minimum
  const totalJourneyHrs=totalMins/60;
  if(totalJourneyHrs>0&&totalJourneyHrs<2.5){
    const primaryLeg=legs.find(l=>l.acId&&S.charterRates[l.acId]);
    if(primaryLeg){const r=S.charterRates[primaryLeg.acId];if(r){totalCost=Math.max(totalCost,2.5*r.perHour+totalWaitCost);}}
  }

  const charterLegs=legs.filter(l=>APT_COORDS[l.from]&&APT_COORDS[l.to]);
  if(charterLegs.length)renderRouteMap('charter-map',charterLegs);

  return tabBar+`<div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div><div class="st" style="margin-bottom:0">Charter Quote Calculator</div>
        <p style="font-size:12px;color:var(--text3);margin-bottom:0;margin-top:2px">Multi-leg quotes · 2.5hr minimum · GST incl.</p></div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn btn-ghost" style="font-size:12px" onclick="window.clearCharterQuote()">🗑 Clear</button>
        ${totalCost>0?'<button class="btn btn-ghost" style="font-size:12px;border-color:rgba(74,222,128,.5);color:#4ade80" onclick="window.saveCharterQuote()">💾 Save Quote</button>':''}
      </div>
    </div>
  </div>
  ${legCards}
  <button class="btn btn-ghost" style="width:100%;margin-bottom:14px;font-size:13px" onclick="addLeg()">+ Add Leg</button>
  ${totalCost>0?`<div class="card" style="background:linear-gradient(135deg,#052e16,#0a3d1c);border-color:#166534">
    <div class="st" style="color:#86efac;border-color:#166534">Quote Summary</div>
    <div class="g3" style="text-align:center;margin-bottom:12px">
      <div><div style="font-size:10px;color:#6ee7b7;text-transform:uppercase;letter-spacing:.08em">Total Distance</div><div style="font-weight:800;font-size:18px;color:#86efac">${totalDist.toFixed(0)} nm</div></div>
      <div><div style="font-size:10px;color:#6ee7b7;text-transform:uppercase;letter-spacing:.08em">Total Flight Time</div><div style="font-weight:800;font-size:18px;color:#86efac">${Math.floor(totalMins/60)}h ${Math.round(totalMins%60)}m</div></div>
      ${totalWaitCost>0?`<div><div style="font-size:10px;color:#6ee7b7;text-transform:uppercase;letter-spacing:.08em">Pilot Wait</div><div style="font-weight:800;font-size:18px;color:#86efac">$${totalWaitCost.toFixed(0)}<div style="font-size:10px;font-weight:400">${totalWaitHrs}h total (1h free)</div></div></div>`:''}
    </div>
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:10px;color:#6ee7b7;text-transform:uppercase;letter-spacing:.08em">Total (incl. GST)</div>
      <div style="font-weight:800;font-size:28px;color:#86efac">$${totalCost.toFixed(0)}</div>
      <div style="font-size:11px;color:#6ee7b7;margin-top:2px">GST: $${(totalCost/11).toFixed(0)} &nbsp;|&nbsp; ex. GST: $${(totalCost/1.15).toFixed(0)}</div>
    </div>
    ${legs.filter(l=>l.note).map(l=>`<div style="font-size:12px;color:#6ee7b7;padding:2px 0">• ${l.from}→${l.to}: ${l.note}</div>`).join('')}
    <div style="font-size:11px;color:#6ee7b7;margin-top:8px;opacity:.7">* Estimate only. 2.5hr minimum applies (whole journey). All prices include GST. Subject to availability and weather.</div>
  </div>`:''}
  ${charterLegs.length?`<div class="card" style="padding:12px"><div class="st">Route Map</div><div id="charter-map" class="route-map"></div></div>`:''}`;
}

function _charterRouteStr(legs){
  if(!legs||!legs.length)return'';
  var codes=[legs[0].from].concat(legs.map(function(l){return l.to;}));
  return codes.map(function(c){return c.replace(/^NZ/,'');}).join('-');
}
function renderSavedQuotes(){
  const quotes=lsGet('ts_charter_quotes_cache')||[];
  if(!quotes.length)return'<div class="card"><div class="st">Saved Quotes</div><p style="font-size:13px;color:var(--text3)">No saved quotes yet. Build a quote in the Calculator tab and tap Save Quote.</p></div>';
  return'<div class="card"><div class="st">Saved Quotes</div>'+quotes.map(function(q,qi){
    const legs=q.legs||[];const totalCost=q.totalCost||0;
    const routeStr=_charterRouteStr(legs);
    const d=q.savedAt?new Date(q.savedAt).toLocaleDateString('en-NZ',{day:'numeric',month:'short'}):'';
    const acIds=[...new Set(legs.filter(function(l){return l.acId;}).map(function(l){return l.acId;}))];
    const acPills=acIds.map(function(id){var col=AC_COL[id]||'#64748b';return'<span style="padding:1px 7px;border-radius:12px;background:'+col+'22;border:1px solid '+col+'55;color:'+col+';font-weight:700;font-size:10px">'+id.replace('ZK-','')+'</span>';}).join('');
    const name=q.name||routeStr;
    const fqd=q.quoteDate?new Date(q.quoteDate+'T00:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}):'';
    return'<div style="padding:12px 0;border-bottom:1px solid var(--border)">'
      +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">'
        +'<div style="min-width:0;flex:1">'
          +'<div contenteditable="true" data-qi="'+qi+'" onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur()}" style="font-weight:700;font-size:13px;color:var(--text1);cursor:text;outline:none;border-bottom:1px dashed transparent;transition:border-color .15s" onfocus="this.style.borderBottomColor=\'var(--acc)\'" onblur="this.style.borderBottomColor=\'transparent\';window.renameCharterQuote(+this.dataset.qi,this.textContent.trim())" title="Click to rename">'+name+'</div>'
          +'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+routeStr+(fqd?' · For: '+fqd:'')+'</div>'
          +'<div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap">'
            +acPills
            +'<span style="color:#86efac;font-weight:700;font-size:12px">$'+totalCost.toFixed(0)+'</span>'
            +(d?'<span style="font-size:10px;color:var(--text3)">'+d+'</span>':'')
            +(q.savedBy?'<span style="font-size:10px;color:var(--text3)">by '+q.savedBy+'</span>':'')
          +'</div>'
        +'</div>'
        +'<div style="display:flex;gap:6px;flex-shrink:0">'
          +'<button class="btn btn-ghost" style="font-size:12px" onclick="window.loadCharterQuote('+qi+')">📂 Load</button>'
          +'<button class="btn btn-ghost" style="font-size:12px;color:#ef4444;border-color:rgba(239,68,68,.4)" onclick="window.deleteCharterQuote('+qi+')">✕</button>'
        +'</div>'
      +'</div>'
    +'</div>';
  }).join('')+'</div>';
}
window.clearCharterQuote=function(){
  if(!confirm('Clear this quote and start fresh?'))return;
  S.charter={legs:[{from:'NZQN',to:'NZMF',acId:'',waitHrs:0,note:''}],showQuote:false};
  render();
};
window.saveCharterQuote=function(){
  if(typeof hasRolePerm==='function'&&!hasRolePerm('charter')){toast('Not authorised to save charter quotes.','warn');return;}
  const legs=S.charter.legs||[];
  let totalCost=0;
  const waitRate=S.charterWaitRate||150;
  legs.forEach(function(leg){
    const dist=distNm(leg.from,leg.to);const speed=(S.aircraft[leg.acId]||{}).layout==='ga8'?130:170;
    const fh=dist>0?dist/speed:0;
    const r=leg.acId?S.charterRates[leg.acId]:null;
    const lc=r&&fh>0?fh*r.perHour:0;
    const wh=parseFloat(leg.waitHrs)||0;
    totalCost+=lc+Math.max(0,wh-1)*waitRate;
  });
  const quote={legs:JSON.parse(JSON.stringify(legs)),totalCost,savedAt:new Date().toISOString()};
  const quotes=lsGet('ts_charter_quotes_cache')||[];
  quotes.unshift(quote);
  lsSet('ts_charter_quotes_cache',quotes);
  sbU('ts_settings',[{key:'charter_quotes',value:JSON.stringify(quotes)}]).catch(function(){});
  toast('Quote saved ✓','ok');
  if(typeof broadcastCharter==='function')broadcastCharter();
  render();
};
window.loadCharterQuote=function(idx){
  const quotes=lsGet('ts_charter_quotes_cache')||[];
  if(!quotes[idx])return;
  S.charter={legs:JSON.parse(JSON.stringify(quotes[idx].legs||[])),showQuote:false};
  S.charterTab='calc';
  render();toast('Quote loaded','ok');
};
window.deleteCharterQuote=function(idx){
  if(!confirm('Delete this saved quote?'))return;
  const quotes=lsGet('ts_charter_quotes_cache')||[];
  quotes.splice(idx,1);
  lsSet('ts_charter_quotes_cache',quotes);
  sbU('ts_settings',[{key:'charter_quotes',value:JSON.stringify(quotes)}]).catch(function(){});
  if(typeof broadcastCharter==='function')broadcastCharter();
  render();
};
window.renameCharterQuote=function(qi,newName){
  const quotes=lsGet('ts_charter_quotes_cache')||[];
  if(!quotes[qi])return;
  if(quotes[qi].name===newName)return;
  quotes[qi].name=newName;
  lsSet('ts_charter_quotes_cache',quotes);
  sbU('ts_settings',[{key:'charter_quotes',value:JSON.stringify(quotes)}]).catch(function(){});
  if(typeof broadcastCharter==='function')broadcastCharter();
};

// Charter Rates tab (moved from Admin)
function renderCharterRates(){
  const waitRate=S.charterWaitRate||150;
  return`<div class="card"><div class="st">Aircraft Charter Rates</div>
    <p style="font-size:12px;color:var(--text3);margin-bottom:12px">Set hourly rates per aircraft. Changes apply immediately to new quotes.</p>
    ${Object.entries(S.charterRates).map(([acId,r])=>{
      const col=AC_COL[acId]||'#64748b';
      return`<div style="display:grid;grid-template-columns:140px 1fr 100px;gap:10px;align-items:end;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:7px"><div style="width:10px;height:10px;border-radius:50%;background:${col}"></div><span style="font-weight:600;font-size:13px">${acId}</span></div>
        <div><label>$/hr (incl. GST)</label><input class="fi" type="number" value="${r.perHour||0}" onblur="S.charterRates['${acId}'].perHour=parseFloat(this.value)||0;saveCharterRates()"></div>
        <div><label>Min hrs</label><input class="fi" type="number" step="0.25" value="${r.minHours||1}" onblur="S.charterRates['${acId}'].minHours=parseFloat(this.value)||1;saveCharterRates()"></div>
      </div>`;}).join('')}
    <div style="padding:12px 0;border-top:1px solid var(--border);margin-top:8px">
      <div style="font-weight:600;font-size:13px;margin-bottom:8px">Pilot Wait / Ground Time</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:end;max-width:400px">
        <div><label>Rate $/hr (incl. GST)</label>
          <input class="fi" type="number" value="${waitRate}" onblur="S.charterWaitRate=parseFloat(this.value)||150;saveCharterRates()"></div>
        <div style="font-size:12px;color:var(--text3);padding-bottom:10px">First hour always free.<br>Charged per hour after.</div>
      </div>
    </div>
  </div>`;
}


// ── ADMIN ──
