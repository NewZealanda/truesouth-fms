// === MODULE: loadsheet ===
function _fmtLsDate(iso){
  if(!iso) return '-';
  var d=new Date(iso+'T00:00:00');
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]+' '+d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]+' '+String(d.getFullYear()).slice(-2);
}

// ── Large interactive seat grid for loadsheet ──
function renderLsSeatGrid(f,a){
  if(!a||!a.seats)return'';
  var layout=acLayout(f.ac);
  var _isCpCrew=!!f.coPilot;
  var isMob=window.innerWidth<=600;
  var sW=isMob?68:86;
  var sH=isMob?62:76;
  var isGa8=a.layout==='ga8';
  var isPod=!!(a.cargo&&a.cargo.length>1&&a.cargo[0]&&a.cargo[0].lbl&&a.cargo[0].lbl.startsWith('Pod'));
  // Build the seat rows column
  var _lsMode=S._lsSeatMode||'edit';

  var seatsCol='<div style="display:flex;flex-direction:column;align-items:'+(isMob?'flex-start':'center')+';gap:8px;padding:4px 0">';
  layout.forEach(function(row){
    if(row==='spacer'){seatsCol+='<div style="height:6px"></div>';return;}
    var _rowWt=0;
    seatsCol+='<div style="display:flex;gap:8px;align-items:center">';
    row.forEach(function(cell){
      var idx=cell.i;
      var isPIC=idx===0;
      var isCoPilot=idx===1&&_isCpCrew;
      var nm=f.names[idx]||'';
      var wt=f.seats[idx]||'';
      var bg=f.bags[idx]||'';
      var grp=(!isPIC&&!isCoPilot&&f.paxGroups)?f.paxGroups[idx]||'':'';
      var gc=grp?groupColor(grp):null;
      var paxType=(!isPIC&&!isCoPilot&&f.paxType)?f.paxType[idx]||'A':'A';
      var hasInfant=!!(f.infantNames&&f.infantNames[idx]);
      var payReq=!!(f.paxPaymentReq&&f.paxPaymentReq[idx]);
      // Full name display
      var displayNm=nm?nm.trim():'';
      if(isPIC){displayNm=(f.names[0]||f.pic||'').trim();}
      else if(isCoPilot){displayNm=(f.coPilot||'').trim();}
      var isOccupied=!!nm||parseFloat(wt)>0;
      var isSelSeat=S._selFormSeat===idx;
      var isDropTarget=!isPIC&&!isCoPilot&&(S._selFormSeat!=null||S._selUnalloc!=null)&&!isSelSeat;
      var bgCol=isSelSeat?'rgba(245,158,11,.45)':isPIC?'rgba(59,130,246,.18)':isCoPilot?'rgba(100,116,139,.12)':
        isOccupied?(gc?gc+'30':'rgba(124,58,237,.14)'):(isDropTarget?'rgba(124,58,237,.08)':'var(--card2)');
      var borderCol=isSelSeat?'#f59e0b':isPIC?'#3b82f6':isCoPilot?'#64748b':
        isOccupied?(gc||'var(--accent)'):(isDropTarget?'var(--accent)':'var(--border2)');
      var nameCol=gc?gc:(isPIC?'#93c5fd':isCoPilot?'#94a3b8':'var(--text1)');
      var clickable=!isCoPilot;
      var _clickFn=isPIC?'window.lsPicChangePopup()':clickable?(_lsMode==='move'?'window.tapFormSeat('+idx+',\''+f.ac+'\',event)':'window.lsSeatEditPopup('+idx+')'):''
;      var _dragSrc=(_lsMode==='move'&&isOccupied&&!isPIC&&!isCoPilot)?' draggable="true" ondragstart="window.lsSeatDragStart('+idx+',event)"':'';
      var _dropTgt=(!isPIC&&!isCoPilot)?' ondragover="event.preventDefault();this.style.outline=\'2px solid #22c55e\'" ondragleave="this.style.outline=\'\'" ondrop="window.lsDropOnSeat('+idx+',event);this.style.outline=\'\'"':'';
      var _dragAttrs=_dragSrc+_dropTgt;
      seatsCol+='<div onclick="'+_clickFn+'"'+_dragAttrs+' style="'
        +'width:'+sW+'px;height:'+sH+'px;border-radius:10px;border:2px solid '+borderCol+';'
        +'background:'+bgCol+';cursor:'+(_lsMode==='move'&&isOccupied&&!isPIC&&!isCoPilot?'grab':clickable?'pointer':'default')+';'
        +'display:flex;flex-direction:column;align-items:center;justify-content:center;'
        +'position:relative;padding:3px 5px;text-align:center;flex-shrink:0;'
        +'transition:box-shadow .12s'
        +'"'+(clickable?' onmouseover="this.style.boxShadow=\'0 0 0 2px var(--acc)\'" onmouseout="this.style.boxShadow=\'\'"':'')+'  >';
      seatsCol+='<div style="position:absolute;top:3px;left:4px;font-size:9px;font-weight:700;color:'
        +(isPIC?'#3b82f6':isCoPilot?'#64748b':'var(--text3)')+';line-height:1">'
        +(isPIC?'PIC':isCoPilot?'CP':cell.lbl)+'</div>';
      if(displayNm){
        seatsCol+='<div style="font-size:'+(isMob?'10':'12')+'px;font-weight:800;color:'+nameCol+';'
          +'line-height:1.1;max-width:'+(sW-10)+'px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
          +'margin-top:'+(isPIC||isCoPilot?'2':'6')+'px">'+displayNm.toUpperCase()+'</div>';
      } else if(!isPIC&&!isCoPilot){
        seatsCol+='<div style="font-size:11px;color:var(--border2);margin-top:8px">+</div>';
      }
      if(isOccupied&&!isPIC&&!isCoPilot&&parseFloat(wt)>0){
        _rowWt+=parseFloat(wt)||0;_rowWt+=parseFloat(bg)||0;
        seatsCol+='<div style="font-size:'+(isMob?'8':'9')+'px;color:'+(gc?gc:'var(--text3)')+';margin-top:2px;opacity:.9">'+wt+'kg'+(parseFloat(bg)>0?' +🎒':'')+'</div>';
      }
      if(!isPIC&&!isCoPilot&&isOccupied&&paxType==='C'){
        seatsCol+='<div style="position:absolute;bottom:3px;right:3px;font-size:7px;font-weight:900;background:rgba(251,146,60,.7);color:#7c2d12;border-radius:3px;padding:0 3px;line-height:1.6">C</div>';
      }
      if(hasInfant){
        seatsCol+='<div style="position:absolute;bottom:3px;right:3px;font-size:7px;font-weight:900;background:rgba(236,72,153,.7);color:#831843;border-radius:3px;padding:0 3px;line-height:1.6">i</div>';
      } else if(!isPIC&&paxType==='C'){
        // C badge already rendered above; only show $ if no child badge
      }
      if(payReq&&!isPIC&&!isCoPilot){
        seatsCol+='<div style="position:absolute;top:0;left:0;right:0;background:#ef4444;color:#fff;font-size:'+(isMob?'10':'12')+'px;font-weight:900;letter-spacing:.08em;text-align:center;line-height:1.9;border-radius:8px 8px 0 0;box-shadow:0 1px 4px rgba(239,68,68,.6)">💲 TO PAY</div>';
      }
      seatsCol+='</div>';
    });
    seatsCol+='</div>';
    if(_rowWt>0)seatsCol+='<div style="font-size:10px;font-weight:700;color:var(--text3);margin-left:6px;white-space:nowrap">'+Math.round(_rowWt)+'<span style="font-size:8px">kg</span></div>';
  });
  seatsCol+='</div>';
  return seatsCol;
}

// ── Seat editor popup ──
window.lsSeatEditPopup=function(idx){
  var f=S.form;if(!f)return;
  var a=S.aircraft[f.ac];if(!a||!a.seats[idx])return;
  var isCoPilot=idx===1&&!!f.coPilot;if(isCoPilot)return;
  var nm=f.names[idx]||'';
  var wt=String(f.seats[idx]||'');
  var bg=String(f.bags[idx]||'');
  var grp=(f.paxGroups&&f.paxGroups[idx])||'';
  var infantNm=(f.infantNames&&f.infantNames[idx])||'';
  var _pType=(f.paxType&&f.paxType[idx])||'A';
  var _payReq=!!(f.paxPaymentReq&&f.paxPaymentReq[idx]);
  var seatLbl=a.seats[idx].lbl||String(idx);
  var isOccupied=!!nm||parseFloat(wt)>0;
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
  var inner=document.createElement('div');
  inner.style.cssText='background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:20px;max-width:360px;width:100%;max-height:90vh;overflow-y:auto';
  var _hasInfant=!!infantNm;
  // Build initial pill display
  var _initNm=nm;var _initInfant=infantNm;
  // If nm has ' + ' pattern, split it
  if(!_initInfant&&_initNm.indexOf(' + ')>0){var _s=_initNm.split(' + ');_initNm=_s[0].trim();_initInfant=_s.slice(1).join(' + ').trim();}
  function _pillsHTML(rawVal){
    var plus=rawVal.indexOf(' + ');
    var pNm=plus>0?rawVal.slice(0,plus).trim():rawVal.trim();
    var iNm=plus>0?rawVal.slice(plus+3).trim():'';
    var out='';
    if(pNm)out+='<span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.35);font-size:13px;font-weight:700;color:#c4b5fd;white-space:nowrap">'+pNm+'</span>';
    if(iNm)out+='<span style="display:inline-flex;align-items:center;gap:3px;padding:3px 10px;border-radius:20px;background:rgba(236,72,153,.15);border:1px solid rgba(236,72,153,.35);font-size:12px;font-weight:700;color:#ec4899;white-space:nowrap;margin-left:4px">👶 '+iNm+'</span>';
    return out;
  }
  var _initVal=_initNm+(_initInfant?' + '+_initInfant:'');
  inner.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
    +'<div style="font-size:16px;font-weight:700">Seat '+seatLbl+'</div>'
    +'<button id="lsSpClose" style="background:none;border:none;color:var(--text3);font-size:22px;cursor:pointer;padding:0 4px;line-height:1">&times;</button>'
    +'</div>'
    +'<div style="margin-bottom:6px">'
    +'<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">'
    +'<input id="lsSpName" class="fi" type="text" placeholder="Passenger name" value="'+_initVal.replace(/"/g,'&quot;')+'" style="flex:1;font-size:15px;font-weight:600">'
    +'<button id="lsSpAddInfant" title="Add infant" style="padding:6px 10px;border-radius:8px;border:1.5px solid rgba(236,72,153,.5);background:rgba(236,72,153,.1);color:#ec4899;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">+ 👶</button>'
    +'</div>'
    +'<div id="lsSpPills" style="display:flex;flex-wrap:wrap;gap:4px;min-height:0">'+_pillsHTML(_initVal)+'</div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
    +'<div style="background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:8px 10px;cursor:pointer" onclick="this.querySelector(\'input\').focus()">'
    +'<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Weight</div>'
    +'<div style="display:flex;align-items:baseline;gap:3px"><input id="lsSpWt" class="fi" type="number" inputmode="decimal" min="0" step="1" placeholder="—" value="'+wt+'" style="font-size:16px;font-weight:800;width:52px;padding:0;background:transparent;border:none;color:var(--text1)"><span style="font-size:11px;color:var(--text3)">kg</span></div>'
    +'</div>'
    +'<div style="background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:8px 10px;cursor:pointer" onclick="this.querySelector(\'input\').focus()">'
    +'<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Bag</div>'
    +'<div style="display:flex;align-items:baseline;gap:3px"><input id="lsSpBag" class="fi" type="number" inputmode="decimal" min="0" step="1" placeholder="0" value="'+bg+'" style="font-size:16px;font-weight:800;width:52px;padding:0;background:transparent;border:none;color:var(--text1)"><span style="font-size:11px;color:var(--text3)">kg</span></div>'
    +'</div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px">'
    +'<button id="lsSpTA" style="padding:9px 4px;border-radius:8px;border:2px solid '+(_pType==='A'?'#3b82f6':'var(--border2)')+';background:'+(_pType==='A'?'rgba(59,130,246,.18)':'transparent')+';color:'+(_pType==='A'?'#60a5fa':'var(--text3)')+';font-size:12px;font-weight:700;cursor:pointer">Adult</button>'
    +'<button id="lsSpTC" style="padding:9px 4px;border-radius:8px;border:2px solid '+(_pType==='C'?'#fb923c':'var(--border2)')+';background:'+(_pType==='C'?'rgba(251,146,60,.18)':'transparent')+';color:'+(_pType==='C'?'#fb923c':'var(--text3)')+';font-size:12px;font-weight:700;cursor:pointer">Child</button>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">'
    +'<button id="lsSpPay" style="padding:9px 4px;border-radius:8px;border:2px solid '+(_payReq?'#ef4444':'var(--border2)')+';background:'+(_payReq?'rgba(239,68,68,.18)':'transparent')+';color:'+(_payReq?'#ef4444':'var(--text3)')+';font-size:12px;font-weight:700;cursor:pointer">'+(_payReq?'$ Needs Pay':'$ Payment')+'</button>'
    +'<div style="background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:4px 8px;display:flex;align-items:center">'
    +'<input id="lsSpGrp" class="fi" type="text" placeholder="Group" value="'+grp.replace(/"/g,'&quot;')+'" style="font-size:12px;width:100%;background:transparent;border:none;padding:0;color:var(--text1)">'
    +'</div>'
    +'</div>'
    +'<div style="display:flex;gap:8px">'
    +'<button id="lsSpSave" style="flex:2;padding:11px;background:var(--acc);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Save</button>'
    +(isOccupied?'<button id="lsSpClear" style="flex:1;padding:11px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Clear</button>':'')
    +'</div>';
  ov.appendChild(inner);
  document.body.appendChild(ov);
  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
  document.getElementById('lsSpClose').onclick=function(){ov.remove();};
  // Type toggle logic via closure
  function setType(t){
    _pType=t;
    var ta=document.getElementById('lsSpTA'),tc=document.getElementById('lsSpTC');
    if(!ta||!tc)return;
    if(t==='A'){ta.style.borderColor='#3b82f6';ta.style.background='rgba(59,130,246,.22)';tc.style.borderColor='var(--border2)';tc.style.background='transparent';}
    else{tc.style.borderColor='#fb923c';tc.style.background='rgba(251,146,60,.22)';ta.style.borderColor='var(--border2)';ta.style.background='transparent';}
  }
  document.getElementById('lsSpTA').onclick=function(){setType('A');};
  document.getElementById('lsSpTC').onclick=function(){setType('C');};
  // Live pill preview as user types name
  var _lsSpNameEl=document.getElementById('lsSpName');
  var _lsSpPillsEl=document.getElementById('lsSpPills');
  if(_lsSpNameEl&&_lsSpPillsEl){
    _lsSpNameEl.addEventListener('input',function(){_lsSpPillsEl.innerHTML=_pillsHTML(this.value);});
  }
  // + 👶 button: append ' + ' and focus cursor after it
  document.getElementById('lsSpAddInfant').onclick=function(){
    var inp=document.getElementById('lsSpName');if(!inp)return;
    var v=inp.value;var plusIdx=v.indexOf(' + ');
    if(plusIdx<0){inp.value=v.trimEnd()+' + ';}
    inp.focus();inp.selectionStart=inp.selectionEnd=inp.value.length;
    _lsSpPillsEl.innerHTML=_pillsHTML(inp.value);
  };
  // Payment toggle
  document.getElementById('lsSpPay').onclick=function(){
    _payReq=!_payReq;
    var btn=document.getElementById('lsSpPay');
    if(!btn)return;
    btn.style.borderColor=_payReq?'#ef4444':'var(--border2)';
    btn.style.background=_payReq?'rgba(239,68,68,.18)':'transparent';
    btn.style.color=_payReq?'#ef4444':'var(--text3)';
    btn.textContent=_payReq?'$ Needs Pay':'$ Payment';
  };
  // Save
  document.getElementById('lsSpSave').onclick=function(){
    var _rawNm=document.getElementById('lsSpName').value.trim();
    var _plusIdx=_rawNm.indexOf(' + ');
    var newNm=_plusIdx>0?_rawNm.slice(0,_plusIdx).trim():_rawNm;
    var newInfant=_plusIdx>0?_rawNm.slice(_plusIdx+3).trim():'';
    var newWt=document.getElementById('lsSpWt').value.trim();
    var newBg=document.getElementById('lsSpBag').value.trim();
    var newGrp=document.getElementById('lsSpGrp').value.trim();
    _lsUndoPush();
    f.names[idx]=newNm;
    f.seats[idx]=newWt||'';
    f.bags[idx]=newBg||'';
    if(!f.paxGroups)f.paxGroups={};
    if(newGrp)f.paxGroups[idx]=newGrp;else delete f.paxGroups[idx];
    if(!f.infantNames)f.infantNames={};
    if(newInfant)f.infantNames[idx]=newInfant;else delete f.infantNames[idx];
    if(!f.paxType)f.paxType={};
    if(newNm||parseFloat(newWt)){f.paxType[idx]=_pType;}else{delete f.paxType[idx];}
    if(!f.paxPaymentReq)f.paxPaymentReq={};
    // Pay flag is locked to the group: set/clear it for every member of this group
    var _pg=(newGrp||'').trim().toLowerCase();
    if(_pg){
      Object.keys(f.names||{}).forEach(function(k){
        if((((f.paxGroups||{})[k]||'').trim().toLowerCase())===_pg){
          if(_payReq)f.paxPaymentReq[k]=true;else delete f.paxPaymentReq[k];
        }
      });
    }
    if(_payReq)f.paxPaymentReq[idx]=true;else delete f.paxPaymentReq[idx];
    S.formDirty=true;autoSaveLS();
    ov.remove();render();
  };
  // Clear
  var clearEl=document.getElementById('lsSpClear');
  if(clearEl){
    clearEl.onclick=function(){
      if(!S._lsFormUndoStack)S._lsFormUndoStack=[];
      S._lsFormUndoStack.push(JSON.parse(JSON.stringify(S.form)));
      if(S._lsFormUndoStack.length>20)S._lsFormUndoStack.shift();
      f.names[idx]='';f.seats[idx]='';f.bags[idx]='';
      if(f.paxGroups)delete f.paxGroups[idx];
      if(f.paxType)delete f.paxType[idx];
      if(f.paxPaymentReq)delete f.paxPaymentReq[idx];
      if(f.infantNames)delete f.infantNames[idx];
      S.formDirty=true;autoSaveLS();
      ov.remove();render();
    };
  }
  setTimeout(function(){var el=document.getElementById('lsSpName');if(el){el.focus();try{el.select();}catch(e){}}},80);
};

function renderLoadsheet(){
  const f=S.form,a=S.aircraft[f.ac],r=a?calcFormWB(f):null,allOk=r&&r.towOk&&r.lwOk&&r.cogOk;
  if(f&&f._unallocated)delete f._unallocated; // pool lives only on S.dispatch._unallocated (shared), never on the form
  const picCrew=pilotCrewList().find(c=>c.n===f.pic);
  if(picCrew&&String(f.seats[0])!==String(picCrew.w))f.seats[0]=String(picCrew.w);

  const acOpts=Object.values(S.aircraft).map(x=>`<option value="${x.id}"${f.ac===x.id?' selected':''}>${x.name} — ${x.type}</option>`).join('');
  const _lsPilots=f.ac?pilotCrewList().filter(c=>(c.endorse||[]).includes(f.ac)):pilotCrewList();
  const crewOpts=_lsPilots.map(c=>`<option value="${c.n}"${f.pic===c.n?' selected':''}>${c.n}${c.w?' ('+c.w+'kg)':''}</option>`).join('');
  const cpOpts=`<option value="">None</option>`+pilotCrewList().filter(c=>c.n!==f.pic).map(c=>`<option value="${c.n}"${f.coPilot===c.n?' selected':''}>${c.n}</option>`).join('');
  const draftBanner=f.status==='unsigned'?`<div style="padding:9px 14px;background:#0c1a3a;border:1px solid #1e3a5f;border-radius:8px;color:#93c5fd;font-size:13px;font-weight:600;margin-bottom:10px">🖊 Unsigned loadsheet — pilot needs to sign below</div>`:'';
  const clearBtn=`<button class="btn btn-ghost" style="font-size:12px;margin-bottom:10px" onclick="if(confirm('Clear this loadsheet and start blank?')){S.lsForms[S.lsAc]=bF_ac('ZK-'+S.lsAc);S.form=S.lsForms[S.lsAc];S.editId=null;render();}">Clear & Start Blank</button>`;


  // Fuel display
  const fuelUnit_=a?fuelUnit(f.ac):'kg';
  const fuelKgVal=parseFloat(f.fuel||a?.fuelKg||0);
  const fuelDisplay=a?String(Math.round(fromKg(fuelKgVal,f.ac))):'';

  // Burn-off display  
  // Default flight burn per aircraft: configured burnDef, else 35 L (airvan) / 187 lb (caravan)
  const _acDefBurn=a?(a.burnDef||(a.layout==='ga8'?35:187)):'';
  const burnVal=f.burnOff||(_acDefBurn||'');
  const burnUnit_=a?.burnDefUnit||(a?.layout==='ga8'?'L':'lbs');
  const burnKgVal=f.burnOff?burnToKg(f.burnOff,f.ac):burnToKg(_acDefBurn||0,f.ac);

  // ── Unified Seats section (SVG seatmap + editable cards) ──
  let seatsH='',cargoH='',fuelH='',loadingH='',calcH='',sigH='',unallocH='',isPod=false;
  const isMob=window.innerWidth<=600;
  if(a){
    const cW=parseFloat(f.seats[0]||0);
    const picMom=(cW*(a.seats[0]?.arm||0)).toFixed(0);
    // PAX / POB counts
    const _isCpCrew=!!f.coPilot;
    const _paxSeats=Object.keys(f.names).filter(function(k){const ki=parseInt(k);return ki>=1&&!!f.names[k]&&ki<(a?a.seats.length:99)&&!(ki===1&&_isCpCrew);}).length;
    const _infantCount=Object.keys(f.infantNames||{}).filter(function(k){const ki=parseInt(k);return !!(f.infantNames||{})[k]&&ki<(a?a.seats.length:99);}).length;
    const _paxCount=_paxSeats+_infantCount;
    const _pobCount=(f.names[0]?1:0)+_paxCount;
    const _childCount=Object.keys(f.names).filter(function(k){const ki=parseInt(k);return ki>=1&&!!f.names[k]&&ki<(a?a.seats.length:99)&&!(ki===1&&_isCpCrew)&&(f.paxType||{})[ki]==='C';}).length;
    const _adultCount=_paxSeats-_childCount;
    // W&B summary row
    const wbSummary=r?`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px">
      <div style="text-align:center;background:var(--card2);border-radius:7px;padding:6px 4px">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">TOW</div>
        <div style="font-size:13px;font-weight:700;color:${r.towOk?'var(--ok-text)':'var(--err-text)'}">${r.tow.toFixed(0)}kg</div>
      </div>
      <div style="text-align:center;background:var(--card2);border-radius:7px;padding:6px 4px">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">C of G</div>
        <div style="font-size:13px;font-weight:700;color:${r.cogOk?'var(--ok-text)':'var(--err-text)'}">${r.towCog!=null?r.towCog.toFixed(2):'—'}</div>
      </div>
      <div style="text-align:center;background:var(--card2);border-radius:7px;padding:6px 4px">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">👥 PAX</div>
        <div style="font-size:13px;font-weight:700">${_paxCount}</div>
        <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;margin-top:2px">
          ${_adultCount>0?`<span style="font-size:9px;font-weight:700;color:#4ade80">${_adultCount}A</span>`:''}
          ${_childCount>0?`<span style="font-size:9px;font-weight:700;color:#fb923c">${_childCount}C</span>`:''}
          ${_infantCount>0?`<span style="font-size:9px;font-weight:700;color:#ec4899">${_infantCount}i</span>`:''}
        </div>
        <div style="font-size:9px;color:var(--text3)">${r.paxW.toFixed(0)}kg</div>
      </div>
      <div style="text-align:center;background:var(--card2);border-radius:7px;padding:6px 4px">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Status</div>
        <div style="font-size:12px;font-weight:700;color:${r.towOk&&r.lwOk&&r.cogOk?'var(--ok-text)':'var(--err-text)'}">${r.towOk&&r.lwOk&&r.cogOk?'✓ OK':'⚠ CHK'}</div>
      </div>
    </div>`:'';
    // PIC card
    const _picCol=AC_COL[f.ac]||'#7B9EC6';
    const picCard=`<div style="display:grid;grid-template-columns:1fr auto;gap:4px;align-items:center;padding:6px 8px;background:var(--card2);border-radius:7px;border-left:3px solid ${_picCol}">
      <div>
        <div style="font-size:9px;font-weight:700;color:${_picCol};text-transform:uppercase;letter-spacing:.04em">PIC</div>
        <input class="fi" type="text" value="${f.names[0]||f.pic||''}" ${picCrew?'readonly':''} style="font-size:12px;padding:2px 4px;${picCrew?'opacity:.65':''}" onblur="lsN(0,this.value)">
      </div>
      <div style="text-align:center">
        <div style="font-size:9px;color:var(--text3)">WT kg</div>
        <input class="fi" type="number" inputmode="decimal" value="${cW||''}" ${picCrew?'readonly':''} style="font-size:12px;width:52px;padding:2px 4px;${picCrew?'opacity:.65':''}" onblur="lsS(0,this.value)">
      </div>
    </div>`;
    // Pax seat cards (2-column grid)
    // Seat 1 is right-front (co-pilot side) — needs empty left-column spacer
    // Then seats 2&3, 4&5... are left/right pairs down the cabin
    const paxCards=a.seats.slice(1).map(function(s,i){
      const idx=i+1;
      const nm=f.names[idx]||'';
      const wt=f.seats[idx]||'';
      const bg=f.bags[idx]||'';
      const rawInfant=f.infantNames?.[idx]||'';
      const nameHasInfant=nm.includes(' + ');
      const displayNm=nameHasInfant?nm.split(' + ')[0]:nm;
      const infantNm=rawInfant||(nameHasInfant?nm.split(' + ').slice(1).join(' + '):'');
      const grp=f.paxGroups?.[idx]||(curDisp()?.pax||[]).find(p=>p.name===nm||p.name===displayNm)?.group||'';
      const gc=grp?groupColor(grp):null;
      const payReq=(f.paxPaymentReq||{})[idx]||false;
      const hasPerson=nm||parseFloat(wt);
      const selUnalloc=S._selUnalloc!=null;const selSeat=S._selFormSeat===idx;
      const isCp=idx===1&&!!f.coPilot;
      return`<div onclick="window.tapFormSeat(${idx},'${f.ac}',event)" draggable="${nm?'true':'false'}" ondragstart="window.lsSeatDragStart(${idx},event)" ondragover="event.preventDefault();event.currentTarget.style.outline='2px solid var(--accent)'" ondragleave="event.currentTarget.style.outline=''" ondrop="window.lsDropOnSeat(${idx},event)" style="position:relative;cursor:${selUnalloc||nm?'pointer':'default'};background:${selSeat?'rgba(245,158,11,.4)':selUnalloc&&!nm?'rgba(124,58,237,.15)':'var(--card2)'};border-radius:7px;padding:4px 6px;border:${payReq?'2px solid #ef4444':selSeat?'2px solid #f59e0b':selUnalloc&&!nm?'2px dashed var(--accent)':'1px solid var(--border2)'};outline:${selSeat?'3px solid rgba(245,158,11,.3)':'none'};transition:outline .1s">
        ${payReq?`<div onclick="event.stopPropagation();window.lsTogglePayReq(${idx})" style="background:#ef4444;color:#fff;font-size:13px;font-weight:900;letter-spacing:.1em;text-align:center;border-radius:5px;padding:5px 0;margin:0 0 5px;cursor:pointer;box-shadow:0 1px 4px rgba(239,68,68,.5)">💲 PAYMENT REQUIRED</div>`:''}
        <div style="display:flex;align-items:center;gap:3px;flex-wrap:wrap;margin-bottom:2px">
          <span style="font-size:9px;font-weight:700;color:var(--text3);min-width:16px;flex-shrink:0">${s.lbl}</span>
          ${nm
            ?`<div onclick="event.stopPropagation();window.lsNamePopup(${idx})" style="padding:2px 9px;border-radius:20px;background:${gc||'var(--card)'};${gc?'':'border:1px solid var(--border2);'}color:${gc?'#fff':'var(--text1)'};font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px">${displayNm.split(' ')[0]}</div>`
            :`<input class="fi" type="text" placeholder="Name" style="flex:1;font-size:11px;padding:2px 5px;min-width:0" onblur="lsN(${idx},this.value)" onclick="event.stopPropagation()">`
          }
          ${infantNm?`<span style="display:inline-flex;align-items:center;gap:2px;padding:1px 6px;border-radius:12px;background:rgba(236,72,153,.15);border:1px solid rgba(236,72,153,.35);font-size:9px;font-weight:700;color:#ec4899;white-space:nowrap">👶 ${infantNm}<button onclick="event.stopPropagation();window.lsRmInfant(${idx})" style="background:none;border:none;color:#ec4899;font-size:10px;cursor:pointer;padding:0;line-height:1;opacity:.7;margin-left:1px">×</button></span>`:''}
          ${hasPerson?`<button onclick="event.stopPropagation();window.lsTogglePayReq(${idx})" style="padding:1px 5px;border-radius:12px;border:1px solid ${payReq?'#ef4444':'var(--border)'};background:${payReq?'rgba(239,68,68,.2)':'transparent'};color:${payReq?'#ef4444':'var(--text3)'};font-size:8px;font-weight:800;cursor:pointer;flex-shrink:0">${payReq?'$ PAY':'$'}</button>`:''}
          ${hasPerson?`<button onclick="event.stopPropagation();window.lsDelPax(${idx})" style="margin-left:auto;width:14px;height:14px;border-radius:50%;background:#ef4444;border:none;color:#fff;font-size:9px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;opacity:.5" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.5'">×</button>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:3px;flex-wrap:wrap">
          <button id="ls-wt-${idx}" onclick="event.stopPropagation();window.lsInlineWt(${idx},this)" style="display:inline-flex;align-items:center;gap:2px;padding:1px 6px;border-radius:12px;border:1px solid var(--border2);background:${wt?'rgba(59,130,246,.12)':'transparent'};color:${wt?'#60a5fa':'var(--text3)'};font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap">⚖️ ${wt?wt+'kg':'—'}</button>
          <button id="ls-bag-${idx}" onclick="event.stopPropagation();window.lsInlineBag(${idx},this)" style="display:inline-flex;align-items:center;gap:2px;padding:1px 6px;border-radius:12px;border:1px solid var(--border2);background:${bg?'rgba(59,130,246,.12)':'transparent'};color:${bg?'#60a5fa':'var(--text3)'};font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap">🎒 ${bg?bg+'kg':'—'}</button>
          ${hasPerson?`<div style="display:inline-flex;align-items:center;gap:2px">${gc?`<div style="width:5px;height:5px;border-radius:50%;background:${gc};flex-shrink:0"></div>`:'<div style="width:5px;height:5px;flex-shrink:0"></div>'}<input class="fi" type="text" value="${(grp||'').replace(/"/g,'&quot;')}" placeholder="grp" style="font-size:9px;padding:1px 4px;width:44px;${gc?'color:'+gc+';font-weight:700':''}" onclick="event.stopPropagation()" onblur="window.lsGrp(${idx},this.value)"></div>`:''}
          <div style="margin-left:auto;display:flex;gap:2px;align-items:center">
            <button onclick="event.stopPropagation();window.lsTogglePaxType(${idx},'A')" style="padding:1px 5px;border-radius:10px;border:1px solid ${(f.paxType||{})[idx]==='C'?'rgba(74,222,128,.3)':'rgba(74,222,128,.8)'};background:${(f.paxType||{})[idx]==='C'?'transparent':'rgba(74,222,128,.2)'};color:#4ade80;font-size:9px;font-weight:700;cursor:pointer">A</button>
            <button onclick="event.stopPropagation();window.lsTogglePaxType(${idx},'C')" style="padding:1px 5px;border-radius:10px;border:1px solid ${(f.paxType||{})[idx]==='C'?'rgba(251,146,60,.8)':'rgba(251,146,60,.3)'};background:${(f.paxType||{})[idx]==='C'?'rgba(251,146,60,.2)':'transparent'};color:#fb923c;font-size:9px;font-weight:700;cursor:pointer">C</button>
          </div>
        </div>
      </div>`;
    }).join('');
    isPod=!!(a.cargo?.length>1&&a.cargo[0]?.lbl?.startsWith('Pod'));
    const podColors=['rgba(59,130,246,.15)','rgba(16,185,129,.15)','rgba(245,158,11,.15)','rgba(168,85,247,.15)'];
    const podBorders=['rgba(59,130,246,.5)','rgba(16,185,129,.5)','rgba(245,158,11,.5)','rgba(168,85,247,.5)'];
    const podTextColors=['#60a5fa','#34d399','#fbbf24','#c084fc'];
    seatsH='';

    // -- Compute ground burn (use form override if set)
    const gndBurnKg=parseFloat(f.gndBurn!=null?f.gndBurn:a.gndBurn)||0;
    const gndBurnDisplay=String(Math.round(fromKg(gndBurnKg,f.ac)));
    const fuelRemKg=fuelKgVal-gndBurnKg-burnKgVal;
    const flightMin=a?.layout==='ga8'?(parseFloat(burnVal||a?.burnDef||35)/58*60).toFixed(0):(burnKgVal/136.1*60).toFixed(0);
    // -- Build cargo section
    let cargoSection='';
    if(isPod){
      const nz=a.cargo.length;
      const zoneW=Math.floor(100/nz);
      const zoneSVG=a.cargo.map((zn,zi)=>{
        const x=zi*zoneW;const w=zi===nz-1?100-x:zoneW;
        return`<rect x="${x}%" y="30%" width="${w}%" height="40%" fill="${podColors[zi%4]}" stroke="${podBorders[zi%4]}" stroke-width="1.5" rx="3"/>
               <text x="${x+w/2}%" y="53%" text-anchor="middle" font-size="9" fill="${podTextColors[zi%4]}" font-weight="700">${zn.lbl.replace('Pod Zone ','Zone ')}</text>`;
      }).join('');
      const fusSVG=`<svg viewBox="0 0 300 60" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:50px;margin-bottom:8px">
        <rect x="2%" y="28%" width="96%" height="44%" rx="10" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.15)" stroke-width="1.5"/>
        <ellipse cx="2.5%" cy="50%" rx="2.5%" ry="22%" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.15)" stroke-width="1.5"/>
        <polygon points="97%,17% 100%,17% 100%,50%" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.15)" stroke-width="1"/>
        ${zoneSVG}
        <text x="4%" y="18%" font-size="8" fill="rgba(255,255,255,.3)">FRONT</text>
        <text x="84%" y="18%" font-size="8" fill="rgba(255,255,255,.3)">REAR</text>
      </svg>`;
      const zoneBoxes=a.cargo.map((zn,zi)=>{
        const w=(f.cargo&&f.cargo[zi])||'';
        return`<div onclick="this.querySelector('input').focus()" style="cursor:pointer;background:${podColors[zi%4]};border:1px solid ${podBorders[zi%4]};border-radius:10px;padding:10px 12px">
          <div style="font-size:10px;font-weight:700;letter-spacing:.06em;color:${podTextColors[zi%4]};text-transform:uppercase;margin-bottom:6px">${zn.lbl}${zn.maxKg?' · max '+zn.maxKg+'kg':''}</div>
          <div style="display:flex;align-items:baseline;gap:5px">
            <input class="fi ls-no-spin" type="number" inputmode="decimal" placeholder="0" value="${w}" style="font-size:20px;font-weight:800;width:70px;padding:0;background:transparent;border:none;color:var(--text)" onblur="lsC(${zi},this.value)">
            <span style="font-size:12px;color:${podTextColors[zi%4]}">kg</span>
          </div>
          <div style="font-size:11px;color:${podTextColors[zi%4]};margin-top:4px">${w?'mom '+(((parseFloat(w)||0)*zn.arm).toFixed(0)):''}</div>
        </div>`;
      }).join('');
      cargoSection=`<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">${zoneBoxes}</div>`;
    } else if(a.cargo&&a.cargo.length){
      // Non-pod cargo (e.g. Airvan baggage shelf)
      const shelfBoxes=a.cargo.map(function(zn,zi){
        const w=(f.cargo&&f.cargo[zi])||'';
        const wNum=parseFloat(w)||0;
        const overLimit=!!(zn.maxKg&&wNum>zn.maxKg);
        const lc=overLimit?'#ef4444':'#60a5fa';
        const bg=overLimit?'rgba(239,68,68,.12)':'rgba(59,130,246,.10)';
        const bdr=overLimit?'rgba(239,68,68,.45)':'rgba(59,130,246,.30)';
        return`<div onclick="this.querySelector('input').focus()" style="cursor:pointer;background:${bg};border:1px solid ${bdr};border-radius:10px;padding:10px 12px">
          <div style="font-size:10px;font-weight:700;letter-spacing:.06em;color:${lc};text-transform:uppercase;margin-bottom:6px">${zn.lbl}${zn.maxKg?' · max '+zn.maxKg+'kg':''}${overLimit?' ⚠ OVER':''}</div>
          <div style="display:flex;align-items:baseline;gap:5px">
            <input class="fi ls-no-spin" type="number" inputmode="decimal" placeholder="0" value="${w}" style="font-size:20px;font-weight:800;width:70px;padding:0;background:transparent;border:none;color:${overLimit?'#ef4444':'var(--text)'}" onblur="lsC(${zi},this.value)">
            <span style="font-size:12px;color:${lc}">kg</span>
          </div>
          ${w?`<div style="font-size:11px;color:${lc};margin-top:4px">mom ${((parseFloat(w)||0)*zn.arm).toFixed(0)}</div>`:''}
        </div>`;
      }).join('');
      cargoSection=`<div style="display:flex;justify-content:center;margin-bottom:8px"><div style="display:flex;flex-direction:column;gap:6px;width:fit-content">${shelfBoxes}</div></div>`;
    }
    // -- Combined Passengers & Loading card
    const _lwDisplay=r?r.lw.toFixed(1):null;
    const _fuelPanel=`<div style="display:flex;flex-direction:column;gap:8px">
      <div onclick="this.querySelector('input').focus()" style="cursor:pointer;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.35);border-radius:8px;padding:8px 10px">
        <div style="font-size:9px;font-weight:700;letter-spacing:.06em;color:#60a5fa;text-transform:uppercase;margin-bottom:4px">Fuel Loaded</div>
        <div style="display:flex;align-items:baseline;gap:4px">
          <input class="fi ls-no-spin" type="number" inputmode="decimal" placeholder="${fuelDisplay}" value="${fuelDisplay}" style="font-size:16px;font-weight:800;width:60px;padding:0;background:transparent;border:none;color:var(--text)" onblur="lsFuel(this.value,'${f.ac}')">
          <span style="font-size:11px;color:#60a5fa">${fuelUnit_}</span>
        </div>
        <div style="font-size:10px;color:#60a5fa;margin-top:2px">${fuelKgVal.toFixed(1)} kg</div>
      </div>
      <div onclick="this.querySelector('input').focus()" style="cursor:pointer;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.30);border-radius:8px;padding:8px 10px">
        <div style="font-size:9px;font-weight:700;letter-spacing:.06em;color:#f59e0b;text-transform:uppercase;margin-bottom:4px">Gnd Burn</div>
        <div style="display:flex;align-items:baseline;gap:4px">
          <input class="fi ls-no-spin" type="number" inputmode="decimal" placeholder="${gndBurnDisplay}" value="${gndBurnDisplay}" style="font-size:16px;font-weight:800;width:60px;padding:0;background:transparent;border:none;color:var(--text)" onblur="lsGndBurn(this.value,'${f.ac}')">
          <span style="font-size:11px;color:#f59e0b">${fuelUnit_}</span>
        </div>
        <div style="font-size:10px;color:#f59e0b;margin-top:2px">${gndBurnKg.toFixed(1)} kg</div>
      </div>
      <div onclick="this.querySelector('input').focus()" style="cursor:pointer;background:rgba(239,68,68,.10);border:1px solid rgba(239,68,68,.30);border-radius:8px;padding:8px 10px">
        <div style="font-size:9px;font-weight:700;letter-spacing:.06em;color:#f87171;text-transform:uppercase;margin-bottom:4px">Flight Burn</div>
        <div style="display:flex;align-items:baseline;gap:4px">
          <input class="fi ls-no-spin" type="number" inputmode="decimal" placeholder="${a.burnDef||(a?.layout==='ga8'?35:187)}" value="${burnVal}" style="font-size:16px;font-weight:800;width:60px;padding:0;background:transparent;border:none;color:var(--text)" onblur="lsBurn(this.value,'${f.ac}')">
          <span style="font-size:11px;color:#f87171">${a?.layout==='ga8'?'L':burnUnit_}</span>
        </div>
        <div style="font-size:10px;color:#f87171;margin-top:2px">&#x2248; ${flightMin} min</div>
      </div>
      <div style="background:rgba(34,197,94,.10);border:1px solid rgba(34,197,94,.30);border-radius:8px;padding:8px 10px">
        <div style="font-size:9px;font-weight:700;letter-spacing:.06em;color:#4ade80;text-transform:uppercase;margin-bottom:4px">Fuel at Dest</div>
        <div style="font-size:16px;font-weight:800;color:var(--text)">${a?.layout==='ga8'?(fuelRemKg/AVGAS).toFixed(0):(fuelRemKg/LB).toFixed(0)}</div>
        <div style="font-size:10px;color:#4ade80;margin-top:2px">${a?.layout==='ga8'?'litres':'lbs'}</div>
      </div>
      ${_lwDisplay!==null?`<div style="background:rgba(139,92,246,.10);border:1px solid rgba(139,92,246,.30);border-radius:8px;padding:8px 10px">
        <div style="font-size:9px;font-weight:700;letter-spacing:.06em;color:#c084fc;text-transform:uppercase;margin-bottom:4px">Landing Weight</div>
        <div style="font-size:16px;font-weight:800;color:${r.lwOk?'var(--text)':'#f87171'}">${_lwDisplay}</div>
        <div style="font-size:10px;color:#c084fc;margin-top:2px">kg (max ${r.mlw})</div>
      </div>`:''}
    </div>`;
    loadingH=`<div class="card" id="lsf-loading" style="border-left:4px solid ${AC_COL[f.ac]||'var(--accent)'}">
      <div class="st">Passengers, Loading &amp; Fuel</div>
      ${wbSummary}
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:10px">${(S._lsFormUndoStack&&S._lsFormUndoStack.length)?`<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="window.lsUndo()">&#x21b6; Undo (${S._lsFormUndoStack.length})</button>`:''}<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="window.pushLsToSeatmap()">&#x1f5fa; Push to Seatmap</button><button onclick="S._lsSeatMode='edit';autoSaveLS();render()" style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${(S._lsSeatMode||'edit')==='edit'?'var(--acc)':'var(--border2)'};background:${(S._lsSeatMode||'edit')==='edit'?'rgba(124,58,237,.18)':'transparent'};color:${(S._lsSeatMode||'edit')==='edit'?'var(--acc)':'var(--text3)'}">&#x270f; Edit</button><button onclick="S._lsSeatMode='move';autoSaveLS();render()" style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${S._lsSeatMode==='move'?'#22c55e':'var(--border2)'};background:${S._lsSeatMode==='move'?'rgba(34,197,94,.18)':'transparent'};color:${S._lsSeatMode==='move'?'#22c55e':'var(--text3)'}">&#x21c4; Move</button><button onclick="S._showUnalloc=!S._showUnalloc;autoSaveLS();render()" style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${S._showUnalloc||(_uaPool().length>0)?'#f59e0b':'var(--border2)'};background:${S._showUnalloc||(_uaPool().length>0)?'rgba(245,158,11,.18)':'transparent'};color:${S._showUnalloc||(_uaPool().length>0)?'#f59e0b':'var(--text3)'}">&#x1f465; Unallocated${_uaPool().length>0?' ('+_uaPool().length+')':''}</button></div>
      <div style="display:flex;gap:${isMob?'8px':'14px'};align-items:flex-start;${isMob?'':'flex-wrap:wrap;'}">
        <div style="${isMob?'flex:1 1 0;min-width:0':'flex:1;min-width:180px'};overflow-x:auto;-webkit-overflow-scrolling:touch">
          ${renderLsSeatGrid(f,a)}
          ${(!isPod||isMob)?cargoSection:''}
        </div>
        ${(isPod&&!isMob)?`<div style="flex:0 0 195px;min-width:150px">${cargoSection}</div>`:''}
        <div style="${isMob?'flex:0 0 112px;min-width:0':'flex:0 0 195px;min-width:160px'}">
          ${_fuelPanel}
        </div>
      </div>
    </div>`;

    if(r){
      const _wbSec=[
        {l:'Empty Weight',v:a.ew,t:'base'},{l:'Crew',v:r.crewW,t:'add'},{l:'Passengers',v:r.paxW,t:'add'},
        {l:'Cargo',v:r.cargoW,t:'add'},{l:'Zero Fuel Weight',v:r.zfw,t:'total'},
        {l:'Fuel',v:r.fuelW,t:'add'},{l:'Ramp Weight',v:r.rampW,t:'total'},
        {l:'Ground Burn',v:-r.gndBurn,t:'burn'},{l:'Takeoff Weight',v:r.tow,t:'limit',ok:r.towOk,lim:r.mtow},
        {l:'Flight Burn',v:-r.burnKg,t:'burn'},{l:'Landing Weight',v:r.lw,t:'limit',ok:r.lwOk,lim:r.mlw},
      ];
      const wbRows=_wbSec.map(function(row){
        if(row.t==='burn'){
          return`<div style="display:flex;justify-content:space-between;padding:3px 8px;border-radius:4px;background:rgba(239,68,68,.07)"><span style="font-size:11px;color:#f87171;font-style:italic">- ${row.l}</span><span style="font-size:11px;font-weight:600;color:#f87171">${Math.abs(row.v).toFixed(1)} kg</span></div>`;
        }
        if(row.t==='total'){
          return`<div style="display:flex;justify-content:space-between;padding:5px 8px;margin:3px 0;border-radius:6px;background:var(--card2);border:1px solid var(--border2)"><span style="font-size:12px;font-weight:700">${row.l}</span><span style="font-size:13px;font-weight:800">${row.v.toFixed(1)} kg</span></div>`;
        }
        if(row.t==='limit'){
          const _p=Math.min(100,(row.v/row.lim*100));
          const _bg=row.ok?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)';
          const _bd=row.ok?'rgba(34,197,94,.4)':'rgba(239,68,68,.4)';
          const _c=row.ok?'#4ade80':'#f87171';
          return`<div style="padding:6px 8px;margin:4px 0;border-radius:8px;background:${_bg};border:1px solid ${_bd}"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;font-weight:700;color:${_c}">${row.l}</span><span style="font-size:13px;font-weight:800;color:${_c}">${row.v.toFixed(1)} <span style="font-size:10px;opacity:.7">/ ${row.lim} kg</span></span></div><div style="height:4px;border-radius:2px;background:rgba(255,255,255,.1)"><div style="height:100%;width:${_p}%;background:${_c};border-radius:2px"></div></div></div>`;
        }
        return`<div style="display:flex;justify-content:space-between;padding:3px 8px;border-radius:4px"><span style="font-size:12px;color:var(--text3)">${row.l}</span><span style="font-size:12px;font-weight:600">${row.v.toFixed(1)} kg</span></div>`;
      }).join('');

      calcH=`<div class="card" style="border-left:4px solid ${AC_COL[f.ac]||'var(--accent)'};flex:1;display:flex;flex-direction:column"><div class="st">Weight & Balance</div>
        <div style="margin-bottom:14px">${wbRows}</div>
        <div class="g3">
          <div class="badge ${r.towOk?'bok':'berr'}"><div class="blbl">Takeoff</div><div class="bval">${r.tow.toFixed(1)}</div><div class="bsub">max ${r.mtow}kg</div></div>
          <div class="badge ${r.lwOk?'bok':'berr'}"><div class="blbl">Landing</div><div class="bval">${r.lw.toFixed(1)}</div><div class="bsub">max ${r.mlw}kg</div></div>
          <div class="badge ${r.cogOk?'bok':'berr'}"><div class="blbl">C of G</div><div class="bval" style="color:${cogPillClass(r.towCog,r.cogMin,r.cogMax)=='pill-red'?'#ef4444':cogPillClass(r.towCog,r.cogMin,r.cogMax)=='pill-orange'?'#fb923c':cogPillClass(r.towCog,r.cogMin,r.cogMax)=='pill-warn'?'#f59e0b':'inherit'}">${r.towCog.toFixed(2)}"</div><div class="bsub">${r.cogMin}–${r.cogMax}"</div></div>
        </div>
        ${!allOk?`<div style="margin-top:12px;padding:10px;background:var(--err-bg);border:1px solid var(--err-border);border-radius:8px;color:var(--err-text);font-size:13px;font-weight:600">⚠ One or more limits exceeded</div>`:
          `<div style="margin-top:12px;padding:10px;background:var(--ok-bg);border:1px solid var(--ok-border);border-radius:8px;color:var(--ok-text);font-size:13px;font-weight:600">✓ All weights and C of G within limits</div>`}
      </div>`;

      const canSign=hasRolePerm('sign_loadsheet');
      sigH=`<div class="card" style="border-left:4px solid ${AC_COL[f.ac]||'var(--accent)'};opacity:.9"><div class="st">PIC Certification</div>
        <p style="font-size:13px;color:var(--text3);margin-bottom:12px;line-height:1.6">I hereby certify that the particulars recorded on the above load sheet are correct${a.type.includes('208')?' and Part 125 security measures have been followed':''}.</p>
        ${canSign?`<div style="margin-bottom:6px;display:flex;gap:6px">
          <button onclick="S.sigMode='draw';render()" style="padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;border:1px solid var(--border);background:${(!S.sigMode||S.sigMode==='draw')?'var(--acc)':'var(--card2)'};color:${(!S.sigMode||S.sigMode==='draw')?'#fff':'var(--text2)'}">✍ Draw</button>
          <button onclick="S.sigMode='type';render()" style="padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;border:1px solid var(--border);background:${S.sigMode==='type'?'var(--acc)':'var(--card2)'};color:${S.sigMode==='type'?'#fff':'var(--text2)'}">⌨ Type Name</button>
        </div>
        ${S.sigMode==='type'?`<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <input id="sigTypeInput" class="fi" type="text" placeholder="Type your full name to sign" style="flex:1;font-size:15px" value="${S.sigTypedName||S.user?.name||''}">
          <button onclick="window.applyTypedSig()" style="padding:8px 14px;background:var(--acc);border:none;border-radius:7px;color:#fff;font-size:13px;cursor:pointer;font-weight:600">Apply</button>
        </div>`:''}
        <div style="border:1px solid var(--border2);border-radius:10px;overflow:hidden;position:relative;background:var(--card2);cursor:crosshair">
          <canvas id="sigCanvas" width="600" height="130"></canvas>
          ${!f.sig?`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;color:var(--border2);font-family:'Barlow Condensed',sans-serif;font-size:15px;letter-spacing:.12em">${(!S.sigMode||S.sigMode==='draw')?'DRAW SIGNATURE HERE':'APPLY NAME ABOVE'}</div>`:''}
        </div>
        <button onclick="clearSig()" style="margin-top:6px;padding:5px 12px;border-radius:6px;border:1px solid var(--border2);background:transparent;font-size:12px;cursor:pointer;color:var(--text2)">Clear</button>`
        :`<div style="padding:10px;background:var(--card2);border-radius:8px;font-size:12px;color:var(--text3);margin-bottom:8px">${canSign?(r&&a&&r.towCog!=null&&r.towCog<a.cogMin?"⚠ Forward CoG — fix seating before signing.":!allOk?"⚠ Fix W&B before signing.":""):"Only pilots can sign loadsheets. Save as draft for a pilot to complete."}</div>`}
        <div style="margin-top:12px">
          ${(()=>{
            const _overCap=a?Object.keys(f.seats).filter(i=>parseInt(i)>=a.seats.length&&(parseFloat(f.seats[i])>0||f.names[i])).length:0;
            const fwdCog=r&&a&&r.towCog!=null&&r.towCog<a.cogMin;
            const fwdWarn=fwdCog?`<div style="padding:8px 12px;background:rgba(245,158,11,.12);border:1px solid #f59e0b;border-radius:8px;margin-bottom:8px;font-size:12px;color:#fde68a">&#x26a0; Forward CoG ${r.towCog?.toFixed(2)}" &#x2014; forward of limit ${a?.cogMin}". Adjust seating before submitting.</div>`:'';
            if(f.sig){
              // Signed: Submit in place (save + toast, stay on tab)
              const canSubmit=canSign&&allOk&&f.pic&&!fwdCog&&_overCap===0;
              const btn=`<button class="btn-full ${canSubmit?'btn-primary':'btn-secondary'}" style="width:100%;padding:13px;font-size:14px;font-weight:700" onclick="window.submitLsInPlace()" ${canSubmit?'':'disabled'}>
                ${!f.pic?'&#x26a0; Select PIC first':fwdCog?'&#x26a0; Fix CoG first':!allOk?'&#x26a0; Fix W&B first':_overCap>0?'&#x26d4; Fix over-capacity first':'&#x2713; Submit'}
              </button>`;
              return fwdWarn+btn;
            } else {
              // Unsigned: Save draft & close
              const btn=`<button class="btn-full btn-secondary" style="width:100%;padding:13px;font-size:14px;font-weight:700" onclick="saveUnsigned()" ${_overCap>0?'disabled':''}>
                ${_overCap>0?'&#x26d4; Fix over-capacity first':'&#x1f4be; Save Draft &amp; Close'}
              </button>`;
              return fwdWarn+btn;
            }
          })()}
        </div>
        <div style="font-size:11px;color:var(--text3);text-align:center;margin-top:6px">${a.doc}</div>
      </div>`;
    }
  }

  // Invalid-seat check: index >= a.seats.length (over capacity, ignored by calcFormWB)
  // OR a removed seat (counted by calcFormWB but hidden on the grid → phantom weight).
  const _removedSeats=(a&&a.removedSeats)||[];
  const _overCap=a?Object.keys(f.seats).filter(i=>{const n=parseInt(i);return (n>=a.seats.length||_removedSeats.includes(n))&&(parseFloat(f.seats[i])>0||f.names[i]);}).length:0;
  const _overCapBanner=_overCap>0?`<div style="padding:12px 14px;background:#3b0000;border:2px solid #ef4444;border-radius:8px;color:#fca5a5;font-size:13px;font-weight:600;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
    <span>⚠ ${_overCap} passenger(s) are on invalid or removed seats for ${acDisp(f.ac)} and may not be reflected correctly in W&B — remove and reseat them.</span>
    <button onclick="window.lsTrimExcess()" style="padding:5px 12px;border-radius:6px;border:1px solid #ef4444;background:transparent;color:#fca5a5;font-size:12px;cursor:pointer;white-space:nowrap;font-weight:700">Remove excess pax</button>
  </div>`:'';

  
  {
    const ua=_uaPool();
    if(ua.length||S._showUnalloc){
      const selIdx=S._selUnalloc;
      // Dynamic slot count: min 3, always 1 empty; shrink when removing
      const _filled=ua.length;
      const _totalSlots=Math.max(3,_filled+1);
      const _emptySlots=_totalSlots-_filled;
      const cards=ua.map(function(p,i){
        const sel=selIdx===i;
        const gc=p.group?.trim()?groupColor(p.group.trim()):null;
        const wt=parseFloat(p.weight||0)+parseFloat(p.bag||0);
        const borderCol=gc||'#64748b';
        const cardStyle=sel
          ?'background:rgba(255,255,255,.97);border:2px solid var(--acc);box-shadow:0 0 0 3px rgba(124,58,237,.3),0 2px 10px rgba(0,0,0,.25)'
          :'background:rgba(255,255,255,.93);border-left:4px solid '+borderCol;
        return '<div class="seat filled" style="'+cardStyle+';flex-shrink:0" onclick="window.tapUnallocated('+i+')" draggable="true" ondragstart="window.lsUnallocDragStart('+i+',event)">'
          +(gc?'<div class="seat-dot" style="background:'+gc+'"></div>':'')
          +(p.paymentReq?'<div style="position:absolute;top:3px;left:3px;font-size:7px;font-weight:900;background:rgba(239,68,68,.3);color:#ef4444;border-radius:3px;padding:0 2px;line-height:1.4">$</div>':'')
          +(p.type==='child'?'<div style="position:absolute;bottom:3px;right:3px;font-size:8px;font-weight:900;background:rgba(251,146,60,.5);color:#c2500a;border-radius:3px;padding:0 3px;line-height:1.4;border:1px solid rgba(0,0,0,.4)">C</div>':'')
          +((p.infant||p.infantName)?'<div style="position:absolute;bottom:3px;right:3px;font-size:8px;font-weight:900;background:rgba(236,72,153,.5);color:#9d1768;border-radius:3px;padding:0 3px;line-height:1.4;border:1px solid rgba(0,0,0,.4)">i</div>':'')
          +'<div class="seat-name" style="color:#1e293b;font-weight:700">'+(p.name?p.name.split(' ')[0]:'?')+'</div>'
          +'<div class="seat-wt" style="color:#334155">'+(wt>0?wt+'kg':'')+'</div>'
          +'</div>';
      }).join('');
      // Placeholder empty slots — drop targets
      var _selFs=S._selFormSeat!=null;
      var _placeholders='';
      for(var _pi=0;_pi<_emptySlots;_pi++){
        _placeholders+='<div class="seat"'+(_selFs?' onclick="window.tapDropUnallocated()"':'')+' ondragover="event.preventDefault();this.style.outline=\'2px solid var(--acc)\'" ondragleave="this.style.outline=\'\'" ondrop="window.lsDropOnUnalloc(event);this.style.outline=\'\'" style="flex-shrink:0;border:2px dashed '+(_selFs?'#f59e0b':'var(--border2)')+';background:transparent;cursor:pointer;opacity:'+(_selFs?'1':'.5')+'">'
          +'<div style="font-size:18px;color:'+(_selFs?'#f59e0b':'var(--border2)')+'">+</div>'
          +'</div>';
      }
      const hint=_selFs
        ?'<div style="font-size:11px;color:#f59e0b;font-weight:700;margin-bottom:6px;cursor:pointer" onclick="window.tapDropUnallocated()">↓ Tap here to move passenger to unallocated</div>'
        :selIdx!=null
          ?'<div style="font-size:11px;color:var(--acc);font-weight:600;margin-bottom:6px">Passenger selected — tap an empty seat above to assign</div>'
          :'<div style="font-size:11px;color:var(--text3);margin-bottom:6px">Drag from seat or tap to add · drag to a seat above to assign</div>';
      var _unallocHdr='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><div class="st" style="margin-bottom:0;flex:1">Unallocated'+(ua.length?' ('+ua.length+')':'')+'</div>'
        +(S._unallocUndo?'<button style="font-size:11px;padding:3px 9px;border-radius:14px;border:1px solid #f59e0b;background:rgba(245,158,11,.12);color:#f59e0b;cursor:pointer;font-weight:700" onclick="window.undoClearUnallocated()">↩ Undo</button>':'')
        +(ua.length?'<button style="font-size:11px;padding:3px 9px;border-radius:14px;border:1px solid rgba(239,68,68,.4);background:transparent;color:#ef4444;cursor:pointer" onclick="if(confirm(\'Remove all unallocated passengers?\'))window.clearUnallocated()">Clear All</button>':'')
        +'</div>';
      unallocH='<div class="card" ondragover="event.preventDefault();event.currentTarget.style.outline=\'2px solid var(--acc)\'" ondragleave="event.currentTarget.style.outline=\'\'" ondrop="window.lsDropOnUnalloc(event)">'+_unallocHdr+hint+'<div style="display:flex;flex-wrap:wrap;gap:6px">'+cards+_placeholders+'</div></div>';
    }
  }
  return`${draftBanner}${_overCapBanner}${clearBtn}
  <div class="card" style="border-left:4px solid ${AC_COL[f.ac]||'var(--accent)'};flex:1;display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="font-size:22px;font-weight:800;letter-spacing:-.02em;color:${AC_COL[f.ac]||'#93c5fd'}">ZK-${S.lsAc||f.ac.replace('ZK-','')}</div>
        ${a?`<div style="font-size:11px;color:var(--text3);background:var(--card2);padding:3px 10px;border-radius:20px;border:1px solid var(--border2)">${a.type} &middot; EW ${a.ew}kg &middot; MTOW ${a.mtow}kg</div>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
        ${f.ac?`<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="window.pushLsToSeatmap()">&#x1f5fa; Push to Seatmap</button>`:''}
        <span style="font-size:10px;color:var(--text3)">Change:</span>
        ${['SLA','SLB','SLD','SLQ','SDB'].filter(function(ac){return ac!==(S.lsAc||f.ac.replace('ZK-',''));}).map(function(ac){var col=AC_COL['ZK-'+ac]||'#64748b';return'<button style="font-size:10px;padding:3px 9px;border-radius:6px;border:1.5px solid '+col+';background:transparent;color:'+col+';font-weight:700;cursor:pointer" onclick="window.changeLsAircraft(\'ZK-'+ac+'\')">'+ac+'</button>';}).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div style="background:var(--card2);border-radius:10px;padding:10px 12px;border:1px solid var(--border2);cursor:pointer" onclick="this.querySelector('select,input').focus()">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">PIC</div>
        <select class="fi" onchange="lsPIC(this.value)" style="border:none;background:transparent;width:100%;font-size:13px;font-weight:600;padding:0;color:var(--text1)"><option value="">&#x2014; select &#x2014;</option>${crewOpts}</select>
      </div>
      <div style="background:var(--card2);border-radius:10px;padding:10px 12px;border:1px solid var(--border2);cursor:pointer" onclick="this.querySelector('select,input').focus()">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Co-Pilot</div>
        <select class="fi" onchange="lsCoPilot(this.value)" style="border:none;background:transparent;width:100%;font-size:13px;font-weight:600;padding:0;color:var(--text1)">${cpOpts}</select>
      </div>
    </div>
    <div style="display:flex;align-items:stretch;gap:6px;margin-bottom:8px">
      <div style="flex:1;background:var(--card2);border-radius:10px;padding:10px 12px;border:1px solid var(--border2);cursor:pointer" onclick="this.querySelector('select,input').focus()">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Departure</div>
        <select class="fi" onchange="S.form.dep=this.value;S.formDirty=true;autoSaveLS();safeRender()" style="border:none;background:transparent;width:100%;font-size:13px;font-weight:600;padding:0;color:var(--text1)">${aptOpts(f.dep)}</select>
      </div>
      <button onclick="const t=S.form.dep;S.form.dep=S.form.dest;S.form.dest=t;autoSaveLS();safeRender()" title="Swap" style="align-self:center;background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:8px 10px;color:var(--accent);font-size:16px;cursor:pointer;flex-shrink:0;line-height:1">&#x21C4;</button>
      <div style="flex:1;background:var(--card2);border-radius:10px;padding:10px 12px;border:1px solid var(--border2);cursor:pointer" onclick="this.querySelector('select,input').focus()">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Destination</div>
        <select class="fi" onchange="S.form.dest=this.value;autoSaveLS();safeRender()" style="border:none;background:transparent;width:100%;font-size:13px;font-weight:600;padding:0;color:var(--text1)">${aptOpts(f.dest)}</select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div style="background:var(--card2);border-radius:10px;padding:10px 12px;border:1px solid var(--border2);cursor:pointer;position:relative" onclick="var i=this.querySelector('input[type=date]');try{i.showPicker&&i.showPicker()}catch(e){i.click()}">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;pointer-events:none">Date</div>
        <div style="font-size:13px;font-weight:600;color:var(--text1);pointer-events:none">${_fmtLsDate(f.date)}</div>
        <input type="date" class="fi" value="${f.date}" onchange="S.form.date=this.value;autoSaveLS();safeRender()" onclick="event.stopPropagation();try{this.showPicker&&this.showPicker()}catch(e){}" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;border:none;background:transparent;cursor:pointer;z-index:10;touch-action:manipulation">
      </div>
      <div style="background:var(--card2);border-radius:10px;padding:10px 12px;border:1px solid var(--border2)">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">ETD</div>
        ${etdSelect(f.etd,f.date,"form")}
      </div>
    </div>
    ${f.createdBy?`<div style="text-align:right;margin-top:6px;font-size:9px;color:rgba(255,255,255,.18);letter-spacing:.04em">Created by ${f.createdBy}</div>`:''}
  </div>  ${unallocH}${loadingH}${calcH}
  ${f.dep&&f.dest&&APT_COORDS[f.dep]&&APT_COORDS[f.dest]?`<div class="card" style="padding:12px;border-left:4px solid ${AC_COL[f.ac]||'var(--accent)'}"><div class="st">Route — ${APTS[f.dep]||f.dep} → ${APTS[f.dest]||f.dest}</div><div id="ls-map" class="route-map"></div></div>`:''}
  ${sigH}`;
}
window.lsCheckChildWt=function(idx){
  const f=S.form;if(!f)return;
  if(!f.paxType)f.paxType={};
  const wt=parseFloat(f.seats[idx]||0);
  if(wt>0&&wt<50&&(!f.paxType[idx]||f.paxType[idx]==='A')){
    if(confirm('Weight '+wt+'kg - is this passenger a child?')){
      f.paxType[idx]='C';S.formDirty=true;autoSaveLS();safeRender();
    } else { if(!f.paxType[idx]) f.paxType[idx]='A'; }
  }
};
window.lsTogglePaxType=function(idx,type){
  const f=S.form;if(!f)return;
  if(!f.paxType)f.paxType={};
  f.paxType[idx]=type;
  if(type==='A'){
    const wt=parseFloat(f.seats[idx]||0);
    if(wt>0&&wt<50){
      if(confirm('Weight '+wt+'kg - is this passenger a child?')) f.paxType[idx]='C';
    }
  }
  S.formDirty=true;autoSaveLS();safeRender();
};
window.lsNamePopup=function(idx){
  const f=S.form;if(!f)return;
  const cur=f.names[idx]||'';
  const w=window.prompt('Passenger name:',cur);
  if(w!==null){lsN(idx,w.trim());}
};
window.lsTogglePayReq=function(idx){
  const f=S.form;if(!f)return;
  if(!f.paxPaymentReq)f.paxPaymentReq={};
  var newVal=!f.paxPaymentReq[idx];
  var grp=((f.paxGroups||{})[idx]||'').trim();
  if(grp){
    // Pay flag is locked to the group: toggling any member toggles them all
    var gk=grp.toLowerCase();
    Object.keys(f.names||{}).forEach(function(k){
      if((((f.paxGroups||{})[k]||'').trim().toLowerCase())===gk){
        if(newVal)f.paxPaymentReq[k]=true;else delete f.paxPaymentReq[k];
      }
    });
  } else {
    if(newVal)f.paxPaymentReq[idx]=true;else delete f.paxPaymentReq[idx];
  }
  S.formDirty=true;autoSaveLS();safeRender();
};
window.lsInlineWt=function(idx,el){
  var cur=S.form.seats[idx]||'';
  var inp=document.createElement('input');
  inp.type='number';inp.inputMode='decimal';inp.value=cur;
  inp.style.cssText='width:52px;font-size:10px;background:var(--card2);border:1px solid var(--acc);border-radius:6px;color:var(--text1);padding:2px 5px;outline:none;-moz-appearance:textfield';
  inp.onclick=function(e){e.stopPropagation();};
  inp.onblur=function(){lsS(idx,this.value);window.lsCheckChildWt(idx);};
  inp.onkeydown=function(e){if(e.key==='Enter'||e.key==='Escape')this.blur();};
  el.replaceWith(inp);inp.focus();inp.select();
};
window.lsInlineBag=function(idx,el){
  var cur=S.form.bags[idx]||'';
  var inp=document.createElement('input');
  inp.type='number';inp.inputMode='decimal';inp.value=cur;
  inp.style.cssText='width:52px;font-size:10px;background:var(--card2);border:1px solid var(--acc);border-radius:6px;color:var(--text1);padding:2px 5px;outline:none;-moz-appearance:textfield';
  inp.onclick=function(e){e.stopPropagation();};
  inp.onblur=function(){lsB(idx,this.value);};
  inp.onkeydown=function(e){if(e.key==='Enter'||e.key==='Escape')this.blur();};
  el.replaceWith(inp);inp.focus();inp.select();
};

window.lsPicChangePopup=function(){
  var f=S.form;if(!f||!f.ac)return;
  var a=S.aircraft[f.ac];if(!a)return;
  var pilots=pilotCrewList().filter(function(c){return(c.endorse||[]).includes(f.ac);});
  if(!pilots.length)pilots=pilotCrewList();
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
  var inner=document.createElement('div');
  inner.style.cssText='background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:20px;max-width:320px;width:100%;max-height:80vh;overflow-y:auto';
  window._lsPicPilots=pilots;
  var rows=pilots.map(function(c,ci){
    var sel=c.n===f.pic;
    return'<div onclick="window._lsPickPic('+ci+')" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:8px;cursor:pointer;margin-bottom:6px;background:'+(sel?'rgba(124,58,237,.15)':'var(--card2)')+';border:1px solid '+(sel?'var(--acc)':'var(--border2)')+';">'
      +'<span style="font-size:13px;font-weight:700;color:'+(sel?'var(--acc)':'var(--text1)')+'">'+c.n+'</span>'
      +'<span style="font-size:11px;color:var(--text3)">'+c.w+'kg</span>'
      +'</div>';
  }).join('');
  inner.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
    +'<div style="font-size:15px;font-weight:700">Change PIC</div>'
    +'<button id="_picClose" style="background:none;border:none;color:var(--text3);font-size:22px;cursor:pointer;padding:0 4px;line-height:1">&times;</button>'
    +'</div>'+rows;
  ov.appendChild(inner);
  document.body.appendChild(ov);
  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
  document.getElementById('_picClose').onclick=function(){ov.remove();};
  window._lsPickPic=function(idx){
    var crew=(window._lsPicPilots||[])[idx];var name=crew?crew.n:'';
    _lsUndoPush();
    f.pic=name;
    f.names[0]=name;
    if(crew&&crew.w)f.seats[0]=String(crew.w);
    S.formDirty=true;autoSaveLS();
    ov.remove();render();
  };
};
