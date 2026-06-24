// === MODULE: maintenance === v1.0 ===
/* acDisp() moved to shared.js (single canonical definition) */
function renderMaintenance(){
  if(!S._maintLoaded&&typeof window.ensureMaintenance==='function')window.ensureMaintenance(); // lazy-load on a direct landing/refresh
  initMaintenance();
  const m=S.maintenance||{};
  if(m._loading){return'<div style="display:flex;align-items:center;justify-content:center;padding:60px 20px;gap:12px;color:var(--text3)"><div style="width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--acc);border-radius:50%;animation:spin 0.7s linear infinite"></div><span style="font-size:14px">Loading maintenance data…</span></div>';}
  if(m._loadFailed){return'<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px;color:var(--text3)"><div style="font-size:28px">&#9888;</div><div style="font-size:14px">Could not load maintenance data from cloud.</div><button onclick="window.retryMaintenance()" style="margin-top:8px;padding:8px 18px;background:var(--acc);border:none;border-radius:7px;color:#fff;font-size:13px;cursor:pointer">Retry</button></div>';}
  const ms=S.admin||{};
  const isAdmin=hasRolePerm('maint_bookings');
  const sub=S.maintTab||'overview';


  if(sub==='overview') return renderMaintOverview();
  if(sub==='log') return renderMaintLog();
  if(sub==='aircraft') return renderMaintAircraftData();
  if(sub==='observations') return renderMaintObservations();

  if(sub==='bookings'&&isAdmin) return renderMaintBookings();
  if(sub==='estimator'&&isAdmin) return renderMaintEstimator();
  return renderMaintSearch();
}


function renderMaintAircraftData(){
  return renderAdminAircraft();
}

// ── Aircraft Observations / Defects log ──
function _obsEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function renderMaintObservations(){
  var acs=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(a){return S.aircraft[a];});
  var canEdit=hasRolePerm('maintenance');
  if(!S._maintObsLoaded){S._maintObsLoaded=true;window.loadMaintObs();}
  if(!S.maintObs)S.maintObs={};
  var sel=S._obsAc&&acs.indexOf(S._obsAc)>=0?S._obsAc:(acs[0]||'ZK-SLA');
  S._obsAc=sel;
  var all=(S.maintObs[sel]||[]).slice().sort(function(a,b){return (b.ts||'').localeCompare(a.ts||'');});
  var showResolved=!!S._obsShowResolved;
  var TC={observation:'#06b6d4',defect:'#ef4444',note:'#94a3b8'},TL={observation:'Observation',defect:'Defect',note:'Note'};

  var h='<div style="max-width:820px;margin:0 auto">';
  h+='<div class="st" style="margin-bottom:10px">Aircraft Observations &amp; Defects</div>';
  // Aircraft selector (with open-defect badges)
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">';
  acs.forEach(function(a){
    var on=a===sel,col=AC_COL[a]||'#64748b';
    var od=(S.maintObs[a]||[]).filter(function(e){return e.type==='defect'&&e.status!=='resolved';}).length;
    h+='<button tabindex="-1" onclick="S._obsAc=\''+a+'\';render()" style="padding:7px 13px;border-radius:9px;border:2px solid '+(on?col:'var(--border2)')+';background:'+(on?col+'22':'transparent')+';color:'+(on?col:'var(--text2)')+';font-size:13px;font-weight:700;cursor:pointer">'+acDisp(a)+(od?' <span style="background:#ef4444;color:#fff;font-size:10px;font-weight:800;border-radius:10px;padding:1px 6px">'+od+'</span>':'')+'</button>';
  });
  h+='</div>';
  // Add-entry form (maintenance + admins)
  if(canEdit){
    var nt=S._obsNewType||'observation';
    h+='<div class="card" style="margin-bottom:14px"><div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">';
    [['observation','Observation'],['defect','Defect'],['note','Note']].forEach(function(t){
      var on=nt===t[0],c=TC[t[0]];
      h+='<button tabindex="-1" onclick="S._obsNewType=\''+t[0]+'\';render()" style="padding:5px 12px;border-radius:20px;border:1.5px solid '+(on?c:'var(--border2)')+';background:'+(on?c+'22':'transparent')+';color:'+(on?c:'var(--text3)')+';font-size:12px;font-weight:700;cursor:pointer">'+t[1]+'</button>';
    });
    h+='</div>';
    h+='<textarea id="obs-new-text" oninput="S._obsNewText=this.value" placeholder="Describe the observation or defect for '+acDisp(sel)+'…" rows="3" style="width:100%;padding:10px 12px;background:var(--card2);border:1px solid var(--border2);border-radius:8px;color:var(--text1);font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit">'+_obsEsc(S._obsNewText||'')+'</textarea>';
    h+='<div style="display:flex;justify-content:flex-end;margin-top:8px"><button tabindex="-1" onclick="window.maintObsAdd()" style="padding:8px 20px;border-radius:8px;border:none;background:var(--acc);color:#fff;font-size:13px;font-weight:700;cursor:pointer">Add entry</button></div></div>';
  }
  // Summary + resolved toggle
  var openDefects=all.filter(function(e){return e.type==='defect'&&e.status!=='resolved';}).length;
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
  h+='<div style="font-size:12px;color:var(--text3)">'+(openDefects?'<span style="color:#ef4444;font-weight:700">'+openDefects+' open defect'+(openDefects!==1?'s':'')+'</span>':'No open defects')+'</div>';
  h+='<button tabindex="-1" onclick="S._obsShowResolved=!S._obsShowResolved;render()" style="font-size:11px;padding:4px 10px;border-radius:14px;border:1px solid var(--border2);background:'+(showResolved?'var(--card2)':'transparent')+';color:var(--text3);cursor:pointer">'+(showResolved?'Hide resolved':'Show resolved')+'</button></div>';
  // Entries
  var visible=all.filter(function(e){return showResolved||!(e.type==='defect'&&e.status==='resolved');});
  if(!visible.length){
    h+='<div class="card" style="text-align:center;color:var(--text3);padding:30px">No observations logged for '+acDisp(sel)+' yet.</div>';
  } else {
    visible.forEach(function(e){
      var col=TC[e.type]||'#94a3b8',resolved=e.type==='defect'&&e.status==='resolved';
      var d=e.ts?new Date(e.ts):null;
      var dstr=d?d.toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('en-NZ',{hour:'2-digit',minute:'2-digit'}):'';
      h+='<div class="card" style="margin-bottom:8px;border-left:4px solid '+col+';'+(resolved?'opacity:.55':'')+'">';
      h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">';
      h+='<span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:'+col+';background:'+col+'1a;padding:2px 8px;border-radius:5px">'+(TL[e.type]||'Note')+'</span>';
      if(e.type==='defect')h+='<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;background:'+(resolved?'rgba(34,197,94,.15)':'rgba(239,68,68,.15)')+';color:'+(resolved?'#22c55e':'#ef4444')+'">'+(resolved?'Resolved':'Open')+'</span>';
      h+='<span style="font-size:11px;color:var(--text3);margin-left:auto">'+_obsEsc(e.author||'')+' · '+dstr+(e.editedAt?' · edited':'')+'</span></div>';
      var _editing=canEdit&&S._obsEditId===e.id;
      if(_editing){
        var _etype=S._obsEditType||e.type||'observation';
        h+='<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">';
        [['observation','Observation'],['defect','Defect'],['note','Note']].forEach(function(t){var on=_etype===t[0];var tc=TC[t[0]]||'#94a3b8';h+='<button tabindex="-1" onclick="S._obsEditType=\''+t[0]+'\';render()" style="font-size:11px;padding:5px 12px;border-radius:14px;border:1px solid '+(on?tc:'var(--border2)')+';background:'+(on?tc+'1a':'transparent')+';color:'+(on?tc:'var(--text3)')+';cursor:pointer;font-weight:'+(on?'700':'500')+'">'+t[1]+'</button>';});
        h+='</div>';
        h+='<textarea id="obs-edit-text" oninput="S._obsEditText=this.value" rows="3" style="width:100%;padding:10px 12px;background:var(--card2);border:1px solid var(--border2);border-radius:8px;color:var(--text1);font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit">'+_obsEsc(S._obsEditText!=null?S._obsEditText:(e.text||''))+'</textarea>';
        h+='<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">';
        h+='<button tabindex="-1" onclick="window.maintObsEditCancel()" style="font-size:12px;padding:6px 14px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text3);cursor:pointer">Cancel</button>';
        h+='<button tabindex="-1" onclick="window.maintObsEditSave(\''+e.id+'\')" style="font-size:12px;padding:6px 16px;border-radius:7px;border:none;background:var(--acc);color:#fff;font-weight:700;cursor:pointer">Save</button>';
        h+='</div>';
      } else {
        h+='<div style="font-size:13px;color:var(--text1);white-space:pre-wrap;line-height:1.5">'+_obsEsc(e.text||'')+'</div>';
        if(canEdit){
          h+='<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">';
          if(e.type==='defect')h+='<button tabindex="-1" onclick="window.maintObsResolve(\''+e.id+'\')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid '+(resolved?'var(--border2)':'rgba(34,197,94,.5)')+';background:transparent;color:'+(resolved?'var(--text3)':'#22c55e')+';cursor:pointer">'+(resolved?'Mark open':'Mark resolved')+'</button>';
          h+='<button tabindex="-1" onclick="window.maintObsEditStart(\''+e.id+'\')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--border2);background:transparent;color:var(--acc);cursor:pointer">Edit</button>';
          h+='<button tabindex="-1" onclick="window.maintObsDelete(\''+e.id+'\')" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(239,68,68,.4);background:transparent;color:#ef4444;cursor:pointer">Delete</button>';
          h+='</div>';
        }
      }
      h+='</div>';
    });
  }
  h+='</div>';
  return h;
}
window.loadMaintObs=async function(){
  try{
    var r=await fetch(SB+'/rest/v1/ts_settings?key=eq.aircraft_obs&select=value',{headers:SH});
    if(r.ok){var rows=await r.json();if(rows&&rows[0]&&rows[0].value){S.maintObs=typeof rows[0].value==='string'?JSON.parse(rows[0].value):rows[0].value;lsSet('ts_aircraft_obs',S.maintObs);if(typeof _sbSetBase==='function')_sbSetBase('aircraft_obs',S.maintObs);safeRender();return;}}
  }catch(e){}
  var c=lsGet('ts_aircraft_obs');if(c){S.maintObs=c;safeRender();}
};
function _saveMaintObs(){
  lsSet('ts_aircraft_obs',S.maintObs||{});
  if(typeof sbMergeSave==='function')sbMergeSave('aircraft_obs',S.maintObs||{},function(m){S.maintObs=m;try{lsSet&&lsSet('ts_aircraft_obs',m);}catch(e){}});
}
// Defense-in-depth: gate maintenance writes (the UI hides the controls; this stops
// console/edge-case writes too).
// General maintenance editing (logs, oil, observations, ADAS/comp-wash ticks, priority) is
// allowed for anyone with the 'maintenance' permission. Only BOOKINGS need 'maint_bookings'.
function _maintGuard(){if(typeof hasRolePerm==='function'&&!hasRolePerm('maintenance')){toast('Not authorised to edit maintenance.','warn');return false;}return true;}
function _maintBookGuard(){if(typeof hasRolePerm==='function'&&!hasRolePerm('maint_bookings')){toast('Not authorised to manage maintenance bookings.','warn');return false;}return true;}
var _maintTickGuard=_maintGuard;
window.maintObsAdd=function(){
  if(!_maintGuard())return;
  var el=document.getElementById('obs-new-text');var txt=el?el.value.trim():(S._obsNewText||'').trim();
  if(!txt){toast('Enter some text first.','err');return;}
  var ac=S._obsAc;if(!ac)return;
  if(!S.maintObs)S.maintObs={};if(!S.maintObs[ac])S.maintObs[ac]=[];
  var type=S._obsNewType||'observation';
  S.maintObs[ac].push({id:'obs_'+Date.now()+'_'+Math.floor(Math.random()*1e4),ts:new Date().toISOString(),author:(S.user&&(S.user.name||S.user.email))||'Unknown',type:type,text:txt,status:type==='defect'?'open':null});
  S._obsNewText='';
  _saveMaintObs();
  if(typeof auditLog==='function')auditLog('maint_obs_add',{ac:ac,type:type});
  toast('Entry added','ok');render();
};
window.maintObsResolve=function(id){
  if(!_maintGuard())return;
  var ac=S._obsAc,arr=(S.maintObs||{})[ac]||[],e=arr.find(function(x){return x.id===id;});
  if(!e)return;
  e.status=e.status==='resolved'?'open':'resolved';
  e.resolvedBy=e.status==='resolved'?((S.user&&S.user.name)||''):null;
  e.resolvedAt=e.status==='resolved'?new Date().toISOString():null;
  _saveMaintObs();render();
};
window.maintObsDelete=function(id){
  if(!_maintGuard())return;
  if(!confirm('Delete this entry?'))return;
  var ac=S._obsAc;if(!S.maintObs||!S.maintObs[ac])return;
  S.maintObs[ac]=S.maintObs[ac].filter(function(x){return x.id!==id;});
  _saveMaintObs();render();
};
window.maintObsEditStart=function(id){
  if(!_maintGuard())return;
  var ac=S._obsAc,e=((S.maintObs||{})[ac]||[]).find(function(x){return x.id===id;});
  if(!e)return;
  S._obsEditId=id;S._obsEditText=e.text||'';S._obsEditType=e.type||'observation';
  render();
};
window.maintObsEditCancel=function(){S._obsEditId=null;S._obsEditText=null;S._obsEditType=null;render();};
window.maintObsEditSave=function(id){
  if(!_maintGuard())return;
  var el=document.getElementById('obs-edit-text');
  var txt=el?el.value.trim():(S._obsEditText||'').trim();
  if(!txt){toast('Enter some text first.','err');return;}
  var ac=S._obsAc,e=((S.maintObs||{})[ac]||[]).find(function(x){return x.id===id;});
  if(!e){window.maintObsEditCancel();return;}
  var newType=S._obsEditType||e.type||'observation';
  e.text=txt;e.type=newType;
  // Keep the defect status consistent with the (possibly changed) type.
  if(newType==='defect'){if(!e.status)e.status='open';}
  else{e.status=null;e.resolvedBy=null;e.resolvedAt=null;}
  e.editedBy=(S.user&&(S.user.name||S.user.email))||'';e.editedAt=new Date().toISOString();
  S._obsEditId=null;S._obsEditText=null;S._obsEditType=null;
  _saveMaintObs();
  if(typeof auditLog==='function')auditLog('maint_obs_edit',{ac:ac,id:id});
  toast('Entry updated','ok');render();
};

function _lastUpdatedLabel(ac){
  // Include hist entries, comp wash dates, and ADAS dates
  const histDates=(S.maintenance?.hist||[]).filter(function(e){return e[ac]!=null;}).map(function(e){return e.date;});
  var cwArr=S.maintenance?.compwash?.[ac]||[];if(!Array.isArray(cwArr))cwArr=cwArr?[cwArr]:[];
  var adArr=S.maintenance?.adas?.[ac]||[];if(!Array.isArray(adArr))adArr=adArr?[adArr]:[];
  const allDates=[...histDates,...cwArr,...adArr].filter(Boolean);
  if(!allDates.length) return null;
  allDates.sort();
  const lastDate=allDates[allDates.length-1];
  const today=new Date();today.setHours(0,0,0,0);
  const d=new Date(lastDate+'T00:00:00');
  const diff=Math.round((today-d)/(1000*60*60*24));
  const dateStr=d.toLocaleDateString('en-NZ',{day:'numeric',month:'short'});
  if(diff===0) return 'Updated today ('+dateStr+')';
  if(diff===1) return 'Updated yesterday ('+dateStr+')';
  if(diff<7){const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];return 'Updated '+days[d.getDay()]+' ('+dateStr+')';}
  if(diff<14) return 'Updated last week ('+dateStr+')';
  return 'Updated '+dateStr+' ('+diff+' days ago)';
}

function renderMaintOverview(){
  const m=S.maintenance||{};
  const acs=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'];
  const isAdmin=hasRolePerm('maint_bookings');   // bookings-only (Edit Check / Bookings button)
  const canEditM=hasRolePerm('maintenance');     // general maintenance edit (priority etc.)

  const cards=acs.map(ac=>{
    const latest=maintGetLatest(ac);
    const nc=m.nextCheck?.[ac];
    const toRun=nc&&latest!=null?Math.round((nc-latest)*10)/10:null;
    const ct=m.checkType?.[ac]||'100 Hour';
    const bk=(m.bookings?.[ac]||[]).slice(0,2);
    const ctStr=m.checkType?.[ac]||'100 Hour';
    // GA8 Airvans always bar every 50hrs (oil change at 50, full inspection at 100)
    const isAirvan=S.aircraft[ac]?.layout==='ga8';
    const checkInterval=isAirvan?50:(ctStr.includes('200')?200:ctStr.includes('50')?50:100);
    // Last check TTIS = nextCheck - interval (i.e. the start of current interval)
    const lastCheckHrs=nc?nc-checkInterval:null;
    // Hours used in current interval
    const hrsUsed=nc&&latest!=null&&lastCheckHrs!=null?Math.max(0,latest-lastCheckHrs):0;
    const pct=checkInterval>0?Math.min(100,Math.max(0,(hrsUsed/checkInterval)*100)):0;
    const isPriority=(m.priority||[]).includes(ac);
    const _priBg=isPriority?'#f59e0b':'var(--card2)';
    const _priCol=isPriority?'#000':'var(--text3)';
    const _priLbl=isPriority?'★ PRIORITY':'☆';
    const _priOc=canEditM?('event.stopPropagation();window.toggleMaintPriority(\'' + ac + '\')'):'event.stopPropagation()';
    const _priCursor=canEditM?'pointer':'default';
    const priorityBtn=(isPriority||canEditM)?('<button onclick="'+_priOc+'" style="position:absolute;top:8px;right:8px;background:'+_priBg+';color:'+_priCol+';font-size:9px;font-weight:800;padding:3px 8px;border-radius:4px;border:none;cursor:'+_priCursor+';letter-spacing:.05em">'+_priLbl+'</button>'):'';

    // Colour: green>30hrs, amber 10-30, red <10
    const col=ac==='ZK-SLA'?'#a75aba':ac==='ZK-SLB'?'#7c7c7c':ac==='ZK-SLD'?'#48925f':ac==='ZK-SLQ'?'#4a99d2':'#e3683e';
    const statusCol=toRun==null?'#64748b':toRun>20?'#22c55e':toRun>10?'#f59e0b':toRun>0?'#fb923c':'#ef4444';
    const bgCol=toRun==null?'var(--card)':toRun>20?'rgba(34,197,94,.06)':toRun>10?'rgba(245,158,11,.08)':toRun>0?'rgba(251,146,60,.1)':'rgba(239,68,68,.12)';

    // CompWash days since / due
    const _cwA=m.compwash?.[ac]||null;const _cwAr=Array.isArray(_cwA)?_cwA:(_cwA?[_cwA]:[]);
    const lastCw=_cwAr.length?[..._cwAr].sort().reverse()[0]:null;
    const _adA=m.adas?.[ac]||null;const _adAr=Array.isArray(_adA)?_adA:(_adA?[_adA]:[]);
    const lastAdas=_adAr.length?[..._adAr].sort().reverse()[0]:null;
    function daysSince(ds){if(!ds)return null;const d=new Date(ds+'T00:00:00');const now=new Date();now.setHours(0,0,0,0);return Math.round((now-d)/(1000*60*60*24));}
    const cwDays=daysSince(lastCw);const adasDays=daysSince(lastAdas);
    function duePill(days,maxDays,label,col_){
      if(days===null) return`<span style="padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700;background:rgba(239,68,68,.15);border:1px solid #ef4444;color:#ef4444">${label}: NEVER</span>`;
      const due=maxDays-days;
      const bg=due<=0?'rgba(239,68,68,.15)':due<=2?'rgba(251,146,60,.12)':'rgba(6,182,212,.08)';
      const bc=due<=0?'#ef4444':due<=2?'#fb923c':col_;
      const txt=due<=0?'DUE NOW':(due===1?'due tomorrow':`${due}d`);
      return`<span style="padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700;background:${bg};border:1px solid ${bc};color:${bc}">${label}: ${txt}</span>`;
    }
    return`<div style="background:${bgCol};border:2px solid ${col};border-radius:12px;padding:14px;position:relative;cursor:pointer" onclick="S.maintEntryAc='${ac}';S.maintTab='log';window.scrollTo(0,0);render()">
      ${priorityBtn}
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:10px;height:10px;border-radius:50%;background:${col}"></div>
        <span style="font-weight:800;font-size:15px">${acDisp(ac)}</span>
        <span style="font-size:11px;color:var(--text3)">${S.aircraft[ac]?.type||''}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Current Hours</div>
          <div style="font-size:20px;font-weight:800;color:var(--text)">${latest!=null?latest.toFixed(1):'—'}</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Hours to Run</div>
          <div style="font-size:20px;font-weight:800;color:${statusCol}">${toRun!=null?toRun.toFixed(1):'—'}</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Next Check</div>
          <div style="font-size:13px;font-weight:600">${nc?nc.toFixed(1)+' hrs':'—'}</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Check Type</div>
          <div style="font-size:13px;font-weight:600">${ct}</div>
        </div>
      </div>
      ${nc&&latest!=null?`<div style="margin-bottom:8px">
        <div style="height:10px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="height:10px;width:${pct}%;background:${statusCol};border-radius:4px;transition:width .3s"></div>
        </div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px"><span style="font-size:14px;font-weight:800;color:${statusCol}">${pct.toFixed(0)}%</span>&nbsp;<span style="font-size:10px;color:var(--text3)">(${hrsUsed.toFixed(1)}/${checkInterval} hrs used)</span></div>
      </div>`:''}
      ${S.aircraft[ac]?.layout!=='ga8'?`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;margin-top:4px">
        ${duePill(cwDays,7,'Comp Wash','#06b6d4')}
        ${duePill(adasDays,7,'ADAS','#a78bfa')}
      </div>`:''}
      ${bk.length?'<div style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">'+
        bk.map(b=>`<div style="font-size:12px;color:var(--text);display:flex;align-items:center;gap:6px;padding:3px 0">
          <span style="color:${b.confirmed?'#22c55e':'#f59e0b'};font-size:13px">${b.confirmed?'●':'◑'}</span>
          <span style="font-weight:600">${fmtMaintDate(b.date)}${(b.end&&b.end!==b.date)?(' – '+fmtMaintDate(b.end)):''}</span>
          <span style="color:var(--text2)">— ${b.notes||'Maintenance'}</span>
          <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:${b.confirmed?'rgba(34,197,94,.15)':'rgba(245,158,11,.15)'};color:${b.confirmed?'#22c55e':'#f59e0b'}">${b.confirmed?'Confirmed':'Pencilled'}</span>
        </div>`).join('')+
      '</div>':''}
      ${isAdmin?`<div style="margin-top:10px">
        <button onclick="event.stopPropagation();S.maintEditAc='${ac}';S.maintTab='bookings';window.scrollTo(0,0);render()" style="width:100%;padding:5px;background:var(--card2);border:1px solid var(--border);border-radius:6px;font-size:11px;cursor:pointer;color:var(--text2)">Edit Check / Bookings</button>
      </div>`:''}
      ${(function(){const lbl=_lastUpdatedLabel(ac);return lbl?`<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);text-align:center;font-size:12px;font-weight:600;color:var(--text2)">${lbl}</div>`:'';})()}
    </div>`;
  }).join('');

  // Monthly hours summary
  const monthlyRows=renderMaintMonthly();

  // Aircraft data section for maintenance users
  return`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:16px">${cards}</div>
  <div class="card">
    <div class="st">Monthly Hours Summary</div>
    ${monthlyRows}
  </div>`;
}

function renderMaintMonthly(){
  const hist=S.maintenance?.hist||[];
  if(!hist.length) return '<div style="color:var(--text3);font-size:12px">No data</div>';
  const acs=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'];

  // Group by month
  const byMonth={};
  hist.forEach(function(e){
    const m=e.date.slice(0,7);
    if(!byMonth[m]) byMonth[m]={};
    acs.forEach(function(ac){if(e[ac]!=null) byMonth[m][ac]=(byMonth[m][ac]||[]).concat(e[ac]);});
  });

  const months=Object.keys(byMonth).sort().reverse().slice(0,12);
  if(!months.length) return '';

  const header='<div style="display:grid;grid-template-columns:80px repeat(5,1fr) 50px;gap:4px;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:4px;padding:0 4px">'+
    '<div>Month</div>'+acs.map(ac=>'<div style="text-align:right;color:'+(AC_COL[ac]||'#888')+'">'+ac.replace('ZK-','')+'</div>').join('')+'<div style="text-align:right;color:var(--text2);font-weight:700">Fleet</div></div>';

  // Build a sorted list of all months for cross-month boundary lookup
  const allMonths=Object.keys(byMonth).sort();
  const months2=allMonths.slice().reverse().slice(0,12);

  function monthLabel(m){
    const mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const parts=m.split('-');return mn[parseInt(parts[1])-1]+' '+parts[0].slice(2);
  }

  // For each AC, get the last known TTIS value up to end of a given month
  function lastKnownBefore(ac, beforeMonth){
    // Find the last entry before this month
    const cutoff=beforeMonth+'-32'; // all dates before next month
    const entries=hist.filter(function(e){return e.date<cutoff&&e[ac]!=null;});
    return entries.length?entries[entries.length-1][ac]:null;
  }

  const rows=months2.map(function(m){
    const md=byMonth[m];
    // Find prev month for cross-boundary start
    const mIdx=allMonths.indexOf(m);
    const prevMonth=mIdx>0?allMonths[mIdx-1]:null;

    const cols=acs.map(function(ac){
      const vals=(md[ac]||[]).sort(function(a,b){return a-b;});
      const maxVal=vals.length?vals[vals.length-1]:null;
      // Start = last known value from previous month, or first val this month
      let startVal=prevMonth?lastKnownBefore(ac, prevMonth):null;
      if(startVal==null) startVal=vals.length?vals[0]:null;
      if(maxVal==null||startVal==null) return '<div style="text-align:right;color:var(--text3)">—</div>';
      const hrs=Math.round((maxVal-startVal)*10)/10;
      if(hrs<=0) return '<div style="text-align:right;color:var(--text3)">—</div>';
      return '<div style="text-align:right;font-weight:600;font-size:12px">'+hrs+'</div>';
    }).join('');

    const fleetTotal=acs.reduce(function(s,ac){
      const vals=(md[ac]||[]).sort(function(a,b){return a-b;});
      const maxVal=vals.length?vals[vals.length-1]:null;
      const prevMonth2=mIdx>0?allMonths[mIdx-1]:null;
      let startVal=prevMonth2?lastKnownBefore(ac,prevMonth2):null;
      if(startVal==null) startVal=vals.length?vals[0]:null;
      if(maxVal==null||startVal==null) return s;
      const hrs=Math.round((maxVal-startVal)*10)/10;
      return s+(hrs>0?hrs:0);
    },0);

    return'<div style="display:grid;grid-template-columns:80px repeat(5,1fr) 50px;gap:4px;padding:4px;border-radius:4px;background:var(--card2);margin-bottom:2px">'+
      '<div style="font-size:11px;color:var(--text3);font-weight:600">'+monthLabel(m)+'</div>'+cols+
      '<div style="text-align:right;font-weight:700;font-size:12px;color:var(--ok-text)">'+(fleetTotal>0?fleetTotal.toFixed(1):'—')+'</div></div>';
  }).join('');

  return header+rows;
}

function renderMaintLog(){
  const hist=(S.maintenance?.hist||[]);
  const acs2=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'];
  const _tn=new Date();
  const today=_tn.getFullYear()+'-'+String(_tn.getMonth()+1).padStart(2,'0')+'-'+String(_tn.getDate()).padStart(2,'0');
  const selAc=S.maintEntryAc||acs2[0];
  const logDays=S.maintLogDays||90;
  const logSubTab=S.maintLogSubTab||'hours';
  // Maintenance documents (Work Orders) take over the Log area when a form is open.
  if(typeof renderMaintFormEditor==='function'){
    if(S._mfView==='editor'&&S._mfOpen)return renderMaintFormEditor(S._mfOpen);
    if(S._mfView==='list')return renderMaintFormsList(S._mfListAc||selAc);
  }

  // ── Entry form ──
  const entAcs2=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'];
  const editDate=S.maintEditDate||null;
  const editEntry=editDate?S.maintenance?.hist?.find(function(e){return e.date===editDate;})||{}:{};
  const editOilEntry=editDate?S.maintenance?.oil?.find(function(e){return e.date===editDate;})||{}:{};
  const prevHrs=maintGetLatest(selAc)||null;
  const entryForm=`<div class="card" style="margin-bottom:12px">
    <div class="st">Daily Entry</div>
    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;-webkit-overflow-scrolling:touch;scrollbar-width:none">
      ${entAcs2.map(ac=>`<button onclick="S.maintEntryAc='${ac}';render()" style="padding:6px 14px;border-radius:8px;border:2px solid ${AC_COL[ac]||'#888'};background:${selAc===ac?AC_COL[ac]+'33':'transparent'};color:${selAc===ac?AC_COL[ac]:'var(--text3)'};font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;flex-shrink:0">${acDisp(ac)}</button>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:10px">
      <div><label style="font-size:11px;color:var(--text3)">Date</label>
        <input type="date" class="fi" id="ml_date" value="${editDate||today}" style="font-size:12px"></div>
      <div><label style="font-size:11px;color:${AC_COL[selAc]||'#888'}">TTIS Hours (day-end)</label>
        <input type="number" class="fi ls-no-spin" id="ml_hours" step="0.1" class="fi ls-no-spin" value="${editDate&&editEntry[selAc]!=null?editEntry[selAc]:''}" placeholder="${prevHrs?'Prev: '+prevHrs.toFixed(1)+' hrs':'e.g. 8460.5'}" style="font-size:12px" oninput="window.calcHoursUsed()"></div>
      <div><label style="font-size:11px;color:var(--text3)">Hours Used</label>
        <input type="number" class="fi ls-no-spin" id="ml_used" step="0.1" class="fi ls-no-spin" placeholder="${prevHrs?'From '+prevHrs.toFixed(1):'—'}" style="font-size:12px" oninput="window.calcTTIS()"></div>
      <div><label style="font-size:11px;color:var(--text3)">Starts</label>
        <input type="number" class="fi ls-no-spin" id="ml_starts" step="1" min="0" class="fi ls-no-spin" placeholder="0" style="font-size:12px"></div>
      <div><label style="font-size:11px;color:var(--text3)">Landings</label>
        <input type="number" class="fi ls-no-spin" id="ml_landings" step="1" min="0" class="fi ls-no-spin" placeholder="0" style="font-size:12px"></div>
      <div><label style="font-size:11px;color:#f59e0b">Oil (qts)</label>
        <input type="number" class="fi ls-no-spin" id="ml_oil" step="1" min="0" class="fi ls-no-spin" placeholder="0" style="font-size:12px"></div>
      <div style="display:flex;align-items:center;gap:8px;padding-top:14px"><input type="checkbox" id="ml_compwash" style="width:16px;height:16px;accent-color:#06b6d4;cursor:pointer"><label for="ml_compwash" style="font-size:12px;color:#06b6d4;cursor:pointer;font-weight:600">Comp Wash Done</label></div>
      <div style="display:flex;align-items:center;gap:8px;padding-top:14px"><input type="checkbox" id="ml_adas" style="width:16px;height:16px;accent-color:#a78bfa;cursor:pointer"><label for="ml_adas" style="font-size:12px;color:#a78bfa;cursor:pointer;font-weight:600">ADAS Download Done</label></div>
    </div>
    <div style="margin-bottom:10px"><label style="font-size:11px;color:var(--text3)">Comment</label>
      <input type="text" class="fi" id="ml_comment" placeholder="Maintenance, snags, weather etc." style="font-size:12px"></div>
    <button onclick="window.addMaintEntry()" style="padding:8px 18px;background:var(--acc);border:none;border-radius:7px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">${S.maintEditDate?"↻ Update Entry":"+ Save Entry"}</button>
  </div>`;

  // ── Build date range ──
  const allDays3=[];
  for(var _di3=0;_di3<logDays;_di3++){
    var _dRef=new Date();_dRef.setDate(_dRef.getDate()-_di3);
    var _yr=_dRef.getFullYear(),_mo=String(_dRef.getMonth()+1).padStart(2,'0'),_dy=String(_dRef.getDate()).padStart(2,'0');
    allDays3.push(_yr+'-'+_mo+'-'+_dy);
  }
  const histMap2={};hist.forEach(function(e){histMap2[e.date]=e;});
  const oilMap={};(S.maintenance?.oil||[]).forEach(function(e){oilMap[e.date]=e;});

  const ac=selAc;
  const col2=AC_COL[ac]||'#888';
  const isCaravan=['ZK-SLA','ZK-SLB','ZK-SDB'].includes(ac);
  const cwDoneMap={}; const adasDoneMap={};
  var _cwArr=S.maintenance?.compwash?.[ac]||[];if(!Array.isArray(_cwArr))_cwArr=_cwArr?[_cwArr]:[];_cwArr.forEach(function(d){cwDoneMap[d]=true;});
  var _adArr=S.maintenance?.adas?.[ac]||[];if(!Array.isArray(_adArr))_adArr=_adArr?[_adArr]:[];_adArr.forEach(function(d){adasDoneMap[d]=true;});
  const rows2=allDays3.map(function(ds){
    const e=histMap2[ds]||{};
    const oe=oilMap[ds]||{};
    const ttis=e[ac]!=null?e[ac].toFixed(1):null;
    const prevIdx=allDays3.indexOf(ds)+1;
    const prevEntryDs=allDays3.slice(prevIdx).find(function(d){return histMap2[d]&&histMap2[d][ac]!=null;});
    const prevHrs2=prevEntryDs&&histMap2[prevEntryDs]&&histMap2[prevEntryDs][ac]!=null?histMap2[prevEntryDs][ac]:null;
    const hrsUsedToday=ttis!=null&&prevHrs2!=null?(parseFloat(ttis)-prevHrs2).toFixed(1):null;
    const starts=e[ac+'_starts']||null;
    const landings=e[ac+'_landings']||null;
    // Cumulative starts/landings = the most recent LIFETIME baseline (_startTot/_landTot,
    // e.g. seeded from the external maintenance system at a known airframe time) at or before
    // this date, PLUS the daily entries logged after that baseline up to this date. If no
    // baseline exists, fall back to simply summing the daily entries. allDays3 is newest-first
    // (older days at higher indices).
    var _dIdx=allDays3.indexOf(ds);
    var _maintCum=function(dailyKey,totKey){
      var baseVal=null,baseIdx=-1;
      for(var i=_dIdx;i<allDays3.length;i++){
        var e2=histMap2[allDays3[i]];
        if(e2&&e2[ac+totKey]!=null){baseVal=parseFloat(e2[ac+totKey])||0;baseIdx=i;break;}
      }
      if(baseVal!=null){
        var sum=baseVal;
        for(var j=_dIdx;j<baseIdx;j++){ // dates strictly newer than the baseline, up to this date
          var e3=histMap2[allDays3[j]];
          if(e3&&e3[ac+dailyKey]!=null)sum+=parseInt(e3[ac+dailyKey])||0;
        }
        return sum;
      }
      var s=0,has=false;
      for(var k=allDays3.length-1;k>=_dIdx;k--){
        var e4=histMap2[allDays3[k]];
        if(e4&&e4[ac+dailyKey]!=null){s+=parseInt(e4[ac+dailyKey])||0;has=true;}
      }
      return has?s:null;
    };
    var cumStarts=_maintCum('_starts','_startTot');
    var cumLandings=_maintCum('_landings','_landTot');
    const oil=oe[ac]||null;
    const hasFlightData=ttis!=null||starts!=null||landings!=null||oil!=null||e.comment;
    const cwDone=cwDoneMap[ds];
    const adasDone=adasDoneMap[ds];
    const isWe=[0,6].includes(new Date(ds+'T00:00:00').getDay());
    const editBtn=''; // removed — cells are directly editable
    const delBtn=hasFlightData?`<button onclick="window.deleteMaintEntry('${ds}','${ac}')" style="background:none;border:none;color:#ef444480;cursor:pointer;font-size:12px;padding:0 3px" title="Delete">✕</button>`:'';
    const cwTd=isCaravan?`<td style="padding:3px 4px;text-align:center"><button onclick="window.toggleCWLog('${ds}','${ac}')" style="padding:2px 7px;border-radius:4px;border:1px solid ${cwDone?'#06b6d4':'var(--border2)'};background:${cwDone?'rgba(6,182,212,.15)':'transparent'};color:${cwDone?'#06b6d4':'var(--text3)'};font-size:11px;font-weight:700;cursor:pointer;min-width:28px">${cwDone?'✓':'○'}</button></td>`:'';
    const adasTd=isCaravan?`<td style="padding:3px 4px;text-align:center"><button onclick="window.toggleADASLog('${ds}','${ac}')" style="padding:2px 7px;border-radius:4px;border:1px solid ${adasDone?'#a78bfa':'var(--border2)'};background:${adasDone?'rgba(167,139,250,.15)':'transparent'};color:${adasDone?'#a78bfa':'var(--text3)'};font-size:11px;font-weight:700;cursor:pointer;min-width:28px">${adasDone?'✓':'○'}</button></td>`:'';
    if(!hasFlightData){
      return `<tr style="opacity:.35;border-bottom:1px solid var(--border)${isWe?';background:var(--card2)':''}">
        <td style="padding:3px 6px;font-size:10px;color:var(--text3);white-space:nowrap">${fmtMaintDate(ds)}</td>
        <td style="padding:2px 4px;text-align:right"><input type="number" step="0.1" value="" placeholder="—" oninput="this.style.color=this.value?'var(--text)':('var(--border)')" onblur="window.saveMaintField('${ds}','${ac}','ttis',this.value)" style="width:58px;background:transparent;border:none;border-bottom:1px solid transparent;color:var(--text);font-size:12px;font-weight:700;text-align:right;padding:2px 0;outline:none" onfocus="this.style.borderBottomColor='var(--accent)';this.style.background='var(--card2)';this.closest('tr').style.opacity='1'" onblur2="this.style.borderBottomColor='transparent'"></td>
        <td style="padding:5px 6px;text-align:right;font-size:12px;color:var(--border)">—</td>
        ${isCaravan?`<td style="padding:2px 4px;text-align:right"><input type="number" step="1" value="" placeholder="—" oninput="this.style.color=this.value?'var(--text)':('var(--border)')" onblur="window.saveMaintField('${ds}','${ac}','starts',this.value)" style="width:36px;background:transparent;border:none;border-bottom:1px solid transparent;color:var(--text);font-size:12px;font-weight:700;text-align:right;padding:2px 0;outline:none" onfocus="this.style.borderBottomColor='var(--accent)';this.style.background='var(--card2)';this.closest('tr').style.opacity='1'"></td><td style="padding:2px 4px;text-align:right"><input type="number" step="1" value="" placeholder="—" oninput="this.style.color=this.value?'var(--text)':('var(--border)')" onblur="window.saveMaintField('${ds}','${ac}','landings',this.value)" style="width:36px;background:transparent;border:none;border-bottom:1px solid transparent;color:var(--text);font-size:12px;font-weight:700;text-align:right;padding:2px 0;outline:none" onfocus="this.style.borderBottomColor='var(--accent)';this.style.background='var(--card2)';this.closest('tr').style.opacity='1'"></td>`:''}
        <td style="padding:2px 4px;text-align:right"><input type="number" step="1" value="" placeholder="—" oninput="this.style.color=this.value?'var(--text)':('var(--border)')" onblur="window.saveMaintField('${ds}','${ac}','oil',this.value)" style="width:44px;background:transparent;border:none;border-bottom:1px solid transparent;color:#f59e0b;font-size:12px;font-weight:700;text-align:right;padding:2px 0;outline:none" onfocus="this.style.borderBottomColor='var(--accent)';this.style.background='var(--card2)';this.closest('tr').style.opacity='1'"></td>
        ${cwTd}${adasTd}
        <td style="padding:2px 4px"><input type="text" value="" placeholder="notes…" onblur="window.saveMaintField('${ds}','${ac}','comment',this.value)" style="width:100%;min-width:80px;background:transparent;border:none;border-bottom:1px solid transparent;color:var(--text3);font-size:11px;font-style:italic;padding:2px 0;outline:none" onfocus="this.style.borderBottomColor='var(--accent)';this.style.background='var(--card2)';this.closest('tr').style.opacity='1'"></td>
        <td></td></tr>`;
    }
    return `<tr style="border-bottom:1px solid var(--border)${isWe?';background:var(--card2)':''}">
      <td style="padding:5px 6px;font-size:11px;color:var(--text3);white-space:nowrap">${fmtMaintDate(ds)}</td>
      <td style="padding:2px 4px;text-align:right"><input type="number" step="0.1" value="${ttis||''}" placeholder="—" oninput="this.style.color=this.value?'var(--text)':('var(--border)')" onblur="window.saveMaintField('${ds}','${ac}','ttis',this.value)" style="width:58px;background:transparent;border:none;border-bottom:1px solid var(--border2);border-radius:2px;color:${ttis?'var(--text)':'var(--text3)'};font-size:12px;font-weight:700;text-align:right;padding:2px 4px;outline:none;cursor:text" onfocus="this.style.borderBottomColor='var(--accent)';this.style.background='var(--card2)'"></td>
      <td style="padding:5px 6px;text-align:right;font-size:12px">${hrsUsedToday!=null?`<span style="color:${col2}">+${hrsUsedToday}</span>`:'<span style="color:var(--border)">—</span>'}</td>
      ${isCaravan?`<td style="padding:2px 4px;text-align:right"><input type="number" step="1" value="${starts||''}" placeholder="—" title="${cumStarts!=null?'Total starts to date: '+cumStarts:''}" onblur="window.saveMaintField('${ds}','${ac}','starts',this.value)" style="width:36px;background:transparent;border:none;border-bottom:1px solid var(--border2);border-radius:2px;color:${starts!=null?'var(--text)':'var(--text3)'};font-size:12px;font-weight:700;text-align:right;padding:2px 4px;outline:none;cursor:text" onfocus="this.style.borderBottomColor='var(--accent)';this.style.background='var(--card2)'"></td><td style="padding:2px 4px;text-align:right"><input type="number" step="1" value="${landings||''}" placeholder="—" title="${cumLandings!=null?'Total landings to date: '+cumLandings:''}" onblur="window.saveMaintField('${ds}','${ac}','landings',this.value)" style="width:36px;background:transparent;border:none;border-bottom:1px solid var(--border2);border-radius:2px;color:${landings!=null?'var(--text)':'var(--text3)'};font-size:12px;font-weight:700;text-align:right;padding:2px 4px;outline:none;cursor:text" onfocus="this.style.borderBottomColor='var(--accent)';this.style.background='var(--card2)'"></td>`:''}
      <td style="padding:2px 4px;text-align:right"><input type="number" step="1" value="${oil||''}" placeholder="—" oninput="this.style.color=this.value?'var(--text)':('var(--border)')" onblur="window.saveMaintField('${ds}','${ac}','oil',this.value)" style="width:44px;background:transparent;border:none;border-bottom:1px solid transparent;color:${oil!=null?'#f59e0b':'var(--border)'};font-size:12px;font-weight:700;text-align:right;padding:2px 0;outline:none" onfocus="this.style.borderBottomColor='var(--accent)';this.style.background='var(--card2)'"></td>
      ${cwTd}${adasTd}
      <td style="padding:2px 4px"><input type="text" value="${esc(e.comment||'')}" placeholder="notes…" onblur="window.saveMaintField('${ds}','${ac}','comment',this.value)" style="width:100%;min-width:80px;background:transparent;border:none;border-bottom:1px solid transparent;color:var(--text3);font-size:11px;font-style:italic;padding:2px 0;outline:none" onfocus="this.style.borderBottomColor='var(--accent)';this.style.background='var(--card2)'"></td>
      <td style="padding:5px 6px;white-space:nowrap">${delBtn}</td>
    </tr>`;
  }).join('');

  const loadMoreBtn='<div style="text-align:center;margin:10px 0">'+
    '<button onclick="S.maintLogDays=(S.maintLogDays||90)+90;render()" style="padding:7px 20px;background:var(--card2);border:1px solid var(--border);border-radius:7px;font-size:12px;cursor:pointer;color:var(--text2)">Load more (+90 days)</button>'+
    '</div>';

  // Documents (Work Orders etc.) replace the prominent daily entry; the manual daily-entry form is kept
  // behind a toggle (the table below is directly editable).
  const _docs=(typeof renderMaintDocSquares==='function')?renderMaintDocSquares(selAc):'';
  const _dailyToggle=`<div style="margin-bottom:12px"><button onclick="S._maintDailyOpen=!S._maintDailyOpen;render()" style="font-size:11px;padding:5px 12px;border-radius:14px;border:1px solid var(--border2);background:transparent;color:var(--text3);cursor:pointer">${S._maintDailyOpen?'▾ Hide manual daily entry':'▸ Manual daily entry'}</button></div>`;
  return _docs+_dailyToggle+(S._maintDailyOpen?entryForm:'')+`<div class="card" style="overflow-x:auto">
    <div class="st" style="color:${col2}">${ac} <span style="font-size:11px;font-weight:400;color:var(--text3)">— last ${logDays} days · tap any cell to edit</span></div>
    <table class="maint-log-tbl" style="width:100%;border-collapse:collapse;min-width:480px">
      <thead><tr style="border-bottom:2px solid var(--border)">
        <th style="padding:6px 6px;text-align:left;font-size:11px;color:var(--text3)">Date</th>
        <th style="padding:6px 6px;text-align:right;font-size:11px;color:var(--text3)">TTIS</th>
        <th style="padding:6px 6px;text-align:right;font-size:11px;color:${col2}">Used</th>
        ${isCaravan?'<th style="padding:6px 6px;text-align:right;font-size:11px;color:var(--text3)">St</th><th style="padding:6px 6px;text-align:right;font-size:11px;color:var(--text3)">Ldg</th>':''}
        <th style="padding:6px 6px;text-align:right;font-size:11px;color:#f59e0b">Oil</th>
        ${isCaravan?'<th style="padding:6px 6px;text-align:center;font-size:11px;color:#06b6d4">CW</th><th style="padding:6px 6px;text-align:center;font-size:11px;color:#a78bfa">ADAS</th>':''}
        <th style="padding:6px 6px;text-align:left;font-size:11px;color:var(--text3)">Notes</th>
        <th></th>
      </tr></thead>
      <tbody>${rows2||'<tr><td colspan="7" style="padding:16px;text-align:center;color:var(--text3);font-size:12px">No entries found for this period.</td></tr>'}</tbody>
    </table>
    ${loadMoreBtn}
  </div>`;
}


function renderMaintOil(){
  const oil=(S.maintenance?.oil||[]).slice().reverse();
  const acs=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'];
  const today=(typeof _todayLocal==='function')?_todayLocal():new Date().toISOString().slice(0,10);

  const entryForm=`<div class="card" style="margin-bottom:12px">
    <div class="st">Add Oil Entry</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:8px">
      <div><label style="font-size:11px;color:var(--text3)">Date</label>
        <input type="date" class="fi" id="oil_date" value="${today}" style="font-size:12px"></div>
      ${acs.map(ac=>`<div><label style="font-size:11px;color:${AC_COL[ac]||'#888'}">${ac} (qts)</label>
        <input type="number" class="fi" id="oil_${ac.replace('-','')}" step="1" min="0" placeholder="0" style="font-size:12px"></div>`).join('')}
    </div>
    <button onclick="window.addOilEntry()" style="padding:8px 18px;background:var(--acc);border:none;border-radius:7px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">+ Add Oil Entry</button>
  </div>`;

  // Total oil per aircraft since last check
  const sinceCheck=acs.map(function(ac){
    const nc=S.maintenance?.nextCheck?.[ac];
    const latest=maintGetLatest(ac);
    // Find last check date (when hours jumped significantly or manually set)
    const totalQts=oil.reduce(function(s,e){return s+(e[ac]||0);},0);
    return'<div style="text-align:center"><div style="font-size:11px;color:var(--text3);margin-bottom:2px">'+ac.replace('ZK-','')+'</div>'+
      '<div style="font-size:18px;font-weight:800;color:var(--text)">'+totalQts.toFixed(1)+'</div>'+
      '<div style="font-size:10px;color:var(--text3)">qts total</div></div>';
  }).join('');

  const rows=oil.slice(0,60).map(function(e){
    const cols=acs.map(function(ac){
      return'<td style="padding:5px 8px;text-align:right;font-size:12px;color:'+(e[ac]?'var(--text)':'var(--text3)')+'">'+
        (e[ac]!=null?e[ac].toFixed(1)+'qt':'—')+'</td>';
    }).join('');
    return'<tr><td style="padding:5px 8px;font-size:12px;color:var(--text3)">'+fmtMaintDate(e.date)+'</td>'+cols+'</tr>';
  }).join('');

  return entryForm+`<div class="card" style="margin-bottom:12px">
    <div class="st">Oil Usage Summary</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:8px 0">${sinceCheck}</div>
  </div>
  <div class="card" style="overflow-x:auto">
    <div class="st">Oil Log</div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:2px solid var(--border)">
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--text3)">Date</th>
        ${acs.map(ac=>'<th style="padding:6px 8px;text-align:right;font-size:11px;color:'+(AC_COL[ac]||'#888')+'">'+ac+'</th>').join('')}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderMaintBookings(){
  const m=S.maintenance||{};
  const acs=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'];
  const ea=S.maintEditAc||acs[0];

  // Edit next check hours + type
  const checkEditor=acs.map(function(ac){
    const nc=m.nextCheck?.[ac]||'';
    const ct=m.checkType?.[ac]||'100 Hour';
    const bks=m.bookings?.[ac]||[];
    return`<div class="card" style="border-left:3px solid ${AC_COL[ac]||'#888'}">
      <div style="font-weight:700;font-size:14px;color:${AC_COL[ac]||'#888'};margin-bottom:10px">${ac}</div>
      <div class="g2" style="gap:8px;margin-bottom:10px">
        <div><label style="font-size:11px;color:var(--text3)">Next Check (hrs)</label>
          <input type="number" class="fi" step="0.1" value="${nc}"
            onchange="window.saveMaintCheck('${ac}','nextCheck',parseFloat(this.value))" style="font-size:12px"></div>
        <div><label style="font-size:11px;color:var(--text3)">Check Type</label>
          <select class="fi" onchange="window.saveMaintCheck('${ac}','checkType',this.value)" style="font-size:12px">
            ${['50 Hour','100 Hour','200 Hour'].map(t=>`<option ${ct===t?'selected':''}>${t}</option>`).join('')}
          </select></div>
      </div>
      <div class="g2" style="gap:8px;margin-bottom:10px">
        <div><label style="font-size:11px;color:var(--text3)">Engine Last OH (hrs)</label>
          <input type="number" class="fi" step="0.1" value="${m.engineLastOH?.[ac]??''}" placeholder="—"
            onchange="window.saveMaintCheck('${ac}','engineLastOH',this.value===''?null:parseFloat(this.value))" style="font-size:12px"></div>
        <div><label style="font-size:11px;color:var(--text3)">Prop Last OH (hrs)</label>
          <input type="number" class="fi" step="0.1" value="${m.propLastOH?.[ac]??''}" placeholder="—"
            onchange="window.saveMaintCheck('${ac}','propLastOH',this.value===''?null:parseFloat(this.value))" style="font-size:12px"></div>
      </div>
      <div class="g2" style="gap:8px;margin-bottom:10px">
        <div><label style="font-size:11px;color:var(--text3)">Engine hrs to run</label>
          <input type="number" class="fi" step="0.1" value="${m.engineToRun?.[ac]??''}" placeholder="—"
            onchange="window.saveMaintCheck('${ac}','engineToRun',this.value===''?null:parseFloat(this.value))" style="font-size:12px"></div>
        <div><label style="font-size:11px;color:var(--text3)">Prop hrs to run</label>
          <input type="number" class="fi" step="0.1" value="${m.propToRun?.[ac]??''}" placeholder="—"
            onchange="window.saveMaintCheck('${ac}','propToRun',this.value===''?null:parseFloat(this.value))" style="font-size:12px"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Maintenance Bookings</div>
      ${bks.map((b,bi)=>`<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;background:var(--card2);padding:6px 8px;border-radius:6px;flex-wrap:wrap">
        <label style="font-size:10px;color:var(--text3)">Go<br><input type="date" class="fi" value="${b.date||''}" onchange="window.editBooking('${ac}',${bi},'date',this.value)" style="width:118px;font-size:11px"></label>
        <label style="font-size:10px;color:var(--text3)">Return<br><input type="date" class="fi" value="${b.end||''}" min="${b.date||''}" onchange="window.editBooking('${ac}',${bi},'end',this.value)" style="width:118px;font-size:11px"></label>
        <input type="text" class="fi" value="${b.notes||''}" onchange="window.editBooking('${ac}',${bi},'notes',this.value)" placeholder="Notes" style="flex:1;min-width:90px;font-size:11px">
        <label style="display:flex;align-items:center;gap:4px;font-size:11px;white-space:nowrap">
          <input type="checkbox" ${b.confirmed?'checked':''} onchange="window.editBooking('${ac}',${bi},'confirmed',this.checked)"> Confirmed
        </label>
        <button onclick="window.deleteBooking('${ac}',${bi})" style="padding:3px 7px;background:var(--err-bg);border:1px solid var(--err-border);border-radius:4px;font-size:10px;cursor:pointer;color:var(--err-text)">✕</button>
      </div>`).join('')}
      <button onclick="window.addBooking('${ac}')" style="padding:6px 12px;background:var(--card2);border:1px solid var(--border);border-radius:6px;font-size:11px;cursor:pointer;color:var(--text2)">+ Add Booking</button>
    </div>`;
  }).join('');

  return`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">${checkEditor}</div>`;
}

function renderMaintEstimator(){
  const m=S.maintenance||{};
  const hist=m.hist||[];
  const acs=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'];
  const now=new Date();

  const rows=acs.map(function(ac){
    const latest=maintGetLatest(ac);
    const nc=m.nextCheck?.[ac];
    const toRun=nc&&latest!=null?nc-latest:null;

    // Compute average daily hours from ALL available history for this aircraft
    // Use full span from first to most recent entry
    const acHist=hist.filter(function(e){return e[ac]!=null;}).sort(function(a,b){return a.date.localeCompare(b.date);});
    let dailyAvg=null;
    if(acHist.length>=2){
      const firstDate=new Date(acHist[0].date+'T00:00:00');
      const lastDate=new Date(acHist[acHist.length-1].date+'T00:00:00');
      const spanDays=(lastDate-firstDate)/(24*60*60*1000);
      const totalHrs=acHist[acHist.length-1][ac]-acHist[0][ac];
      if(spanDays>0&&totalHrs>0) dailyAvg=totalHrs/spanDays;
    }
    // Fallback: recent 90-day rate if not enough full history
    if(!dailyAvg&&acHist.length>=2){
      const ninetyAgo=new Date(now-90*24*60*60*1000);
      const recent=acHist.filter(function(e){return new Date(e.date+'T00:00:00')>=ninetyAgo;});
      if(recent.length>=2){
        const span=(new Date(recent[recent.length-1].date)-new Date(recent[0].date))/(24*60*60*1000);
        const hrs=recent[recent.length-1][ac]-recent[0][ac];
        if(span>0&&hrs>0) dailyAvg=hrs/span;
      }
    }

    const hrsPerYear=dailyAvg?Math.round(dailyAvg*365):null;
    const daysToCheck=dailyAvg&&toRun?Math.round(toRun/dailyAvg):null;
    const checkDate=daysToCheck?new Date(now.getTime()+daysToCheck*24*60*60*1000).toISOString().slice(0,10):null;
    const inExtension=nc&&latest!=null&&latest>nc;

    const etr=m.engineToRun?.[ac];
    const ptr=m.propToRun?.[ac];
    const daysToEngine=dailyAvg&&etr?Math.round(etr/dailyAvg):null;
    const engineDate=daysToEngine?new Date(now.getTime()+daysToEngine*24*60*60*1000).toISOString().slice(0,10):null;
    const daysToProp=dailyAvg&&ptr?Math.round(ptr/dailyAvg):null;
    const propDate=daysToProp?new Date(now.getTime()+daysToProp*24*60*60*1000).toISOString().slice(0,10):null;

    function fmtEst(date,days){
      if(!date) return'<span style="color:var(--text3)">—</span>';
      const yr=Math.round(days/365*10)/10;
      const _d=new Date(date+'T00:00:00');
      const _lbl=isNaN(_d.getTime())?date.slice(0,10):_d.toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}); // full date, e.g. "14 Aug 2026"
      return`<span style="font-weight:700">${_lbl}</span><span style="font-size:10px;color:var(--text3);margin-left:4px">(${yr}yr)</span>`;
    }

    const col=AC_COL[ac]||'#888';
    return`<div class="card" style="border-top:3px solid ${col}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="font-weight:700;font-size:14px;color:${col}">${acDisp(ac)}</div>
        ${inExtension?'<span style="background:#ef444420;border:1px solid #ef4444;color:#ef4444;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px">IN EXTENSION</span>':''}
        ${hrsPerYear?`<span style="font-size:11px;color:var(--text3)">${hrsPerYear} hrs/yr avg</span>`:''}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px">Next ${m.checkType?.[ac]||'100hr'} Check</div>
          ${fmtEst(checkDate,daysToCheck)}
          ${toRun!=null?`<div style="font-size:10px;color:var(--text3)">${toRun.toFixed(1)} hrs to run</div>`:''}
        </div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px">Engine OH</div>
          ${fmtEst(engineDate,daysToEngine)}
          ${etr!=null?`<div style="font-size:10px;color:var(--text3)">${etr.toFixed(0)} hrs to run</div>`:''}
        </div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:3px">Prop OH</div>
          ${fmtEst(propDate,daysToProp)}
          ${ptr!=null?`<div style="font-size:10px;color:var(--text3)">${ptr.toFixed(0)} hrs to run</div>`:''}
        </div>
      </div>
    </div>`;
  }).join('');

  return`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">${rows}</div>
  <div style="font-size:11px;color:var(--text3);padding:8px 0">Estimates use average hrs/yr from all available history. Actual dates vary with utilisation.</div>`;
}

// Quick-set the maintenance search date range. Calendar-based for month/year/FY; rolling for 3m/12m.
// NZ financial year runs 1 Apr – 31 Mar; 'fy' = the last COMPLETED financial year.
window.maintSearchRange=function(key){
  S.maintSearch=S.maintSearch||{};
  var now=new Date();var y=now.getFullYear(),mo=now.getMonth(),dd=now.getDate();
  function ymd(yy,mm,d){return new Date(Date.UTC(yy,mm,d)).toISOString().slice(0,10);}
  var from='',to='';
  if(key==='clear'){from='';to='';}
  else if(key==='12m'){from=ymd(y-1,mo,dd);to=ymd(y,mo,dd);}
  else if(key==='3m'){from=ymd(y,mo-3,dd);to=ymd(y,mo,dd);}
  else if(key==='1m'){from=ymd(y,mo-1,1);to=ymd(y,mo,0);}            // previous calendar month
  else if(key==='cy'){from=ymd(y-1,0,1);to=ymd(y-1,11,31);}          // previous calendar year
  else if(key==='fy'){var fyStart=(mo>=3?y:y-1)-1;from=ymd(fyStart,3,1);to=ymd(fyStart+1,2,31);} // 1 Apr → 31 Mar
  S.maintSearch.from=from;S.maintSearch.to=to;
  if(typeof safeRender==='function')safeRender();
};
function renderMaintSearch(){
  const sf=S.maintSearch||{};
  const hist=S.maintenance?.hist||[];
  const oil=S.maintenance?.oil||[];
  const acs=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'];

  const form=`<div class="card" style="margin-bottom:12px">
    <div class="st">Search Maintenance Data</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:10px">
      <div><label style="font-size:11px;color:var(--text3)">Aircraft</label>
        <select class="fi" onchange="S.maintSearch=S.maintSearch||{};S.maintSearch.ac=this.value;safeRender()" style="font-size:12px">
          <option value="">All Aircraft</option>
          ${acs.map(ac=>`<option ${sf.ac===ac?'selected':''}>${ac}</option>`).join('')}
        </select></div>
      <div><label style="font-size:11px;color:var(--text3)">From Date</label>
        <input type="date" class="fi" value="${sf.from||''}" onchange="S.maintSearch=S.maintSearch||{};S.maintSearch.from=this.value;safeRender()" style="font-size:12px"></div>
      <div><label style="font-size:11px;color:var(--text3)">To Date</label>
        <input type="date" class="fi" value="${sf.to||''}" onchange="S.maintSearch=S.maintSearch||{};S.maintSearch.to=this.value;safeRender()" style="font-size:12px"></div>
      <div><label style="font-size:11px;color:var(--text3)">Data Type</label>
        <select class="fi" onchange="S.maintSearch=S.maintSearch||{};S.maintSearch.type=this.value;safeRender()" style="font-size:12px">
          <option value="hours" ${sf.type==='hours'?'selected':''}>Flight Hours</option>
          <option value="oil" ${sf.type==='oil'?'selected':''}>Oil Usage</option>
          <option value="starts" ${sf.type==='starts'?'selected':''}>Engine Starts</option>
          <option value="landings" ${sf.type==='landings'?'selected':''}>Landings</option>
        </select></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700;margin-right:2px">Quick range</span>
      <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="window.maintSearchRange('1m')">Last month</button>
      <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="window.maintSearchRange('3m')">Last 3 months</button>
      <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="window.maintSearchRange('12m')">Last 12 months</button>
      <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="window.maintSearchRange('cy')">Last calendar year</button>
      <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="window.maintSearchRange('fy')" title="NZ financial year: 1 Apr – 31 Mar (last completed)">Last FY</button>
      ${(sf.from||sf.to)?`<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;color:var(--text3)" onclick="window.maintSearchRange('clear')">✕ Clear</button>`:''}
    </div>
  </div>`;

  const type=sf.type||'hours';
  const data=type==='oil'?oil:hist;
  // For oil: generate every date in range so gaps show as —
  let filtered;
  if(type==='oil'){
    const today=(typeof _todayLocal==='function')?_todayLocal():new Date().toISOString().slice(0,10);
    const rangeFrom=sf.from||(data.length?data[0].date:today);
    const rangeTo=sf.to||today;
    const allDates=[];
    const d=new Date(rangeFrom+'T00:00:00');
    const end=new Date(rangeTo+'T00:00:00');
    while(d<=end){const ds=d.toISOString().slice(0,10);allDates.push(ds);d.setDate(d.getDate()+1);}
    const oilByDate={};
    data.forEach(function(e){oilByDate[e.date]=e;});
    filtered=allDates.map(function(ds){return oilByDate[ds]||{date:ds};});
  } else {
    filtered=data.filter(function(e){
      if(sf.from&&e.date<sf.from) return false;
      if(sf.to&&e.date>sf.to) return false;
      return true;
    });
    // For starts/landings, only show rows that have at least one value
    if(type==='starts'||type==='landings'){
      const key=type==='starts'?'_starts':'_landings';
      const acCols2=sf.ac?[sf.ac]:acs;
      filtered=filtered.filter(function(e){return acCols2.some(function(ac){return e[ac+key]!=null;});});
    }
  }

  const acCols=sf.ac?[sf.ac]:acs;

  if(!filtered.length) return form+'<div class="card" style="color:var(--text3);font-size:12px">No results for the selected filters.</div>';

  // Summary
  const summary=acCols.map(function(ac){
    if(type==='oil'){
      const acData=filtered.filter(function(e){return e[ac]!=null;});
      if(acData.length<1) return null;
      const total=acData.reduce(function(s,e){return s+(e[ac]||0);},0);
      return{ac,total:Math.round(total*10)/10,unit:'quarts added'};
    }
    if(type==='starts'){
      const acData=filtered.filter(function(e){return e[ac+'_starts']!=null;});
      if(acData.length<1) return null;
      const total=acData.reduce(function(s,e){return s+(e[ac+'_starts']||0);},0);
      return{ac,total,unit:'starts'};
    }
    if(type==='landings'){
      const acData=filtered.filter(function(e){return e[ac+'_landings']!=null;});
      if(acData.length<1) return null;
      const total=acData.reduce(function(s,e){return s+(e[ac+'_landings']||0);},0);
      return{ac,total,unit:'landings'};
    }
    // hours
    const acData=filtered.filter(function(e){return e[ac]!=null;});
    if(acData.length<2) return null;
    const total=acData[acData.length-1][ac]-acData[0][ac];
    return{ac,total:Math.round(total*10)/10,unit:'hours flown'};
  }).filter(Boolean);

  const summaryHtml=summary.length?`<div class="card" style="margin-bottom:12px">
    <div class="st">Period Summary: ${sf.from||'all time'} → ${sf.to||'now'}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;padding:4px 0">
      ${summary.map(function(s){return`<div style="text-align:center;padding:8px;background:var(--card2);border-radius:8px;border:1px solid ${AC_COL[s.ac]||'#888'}">
        <div style="font-size:11px;font-weight:700;color:${AC_COL[s.ac]||'#888'}">${s.ac}</div>
        <div style="font-size:20px;font-weight:800;color:var(--text)">${s.total}</div>
        <div style="font-size:10px;color:var(--text3)">${s.unit}</div>
      </div>`;}).join('')}
    </div>
  </div>`:'' ;

  const rows=filtered.slice().reverse().slice(0,100).map(function(e){
    const cols=acCols.map(function(ac){
      let val,display;
      if(type==='starts'){val=e[ac+'_starts'];display=val!=null?String(val):'—';}
      else if(type==='landings'){val=e[ac+'_landings'];display=val!=null?String(val):'—';}
      else if(type==='oil'){val=e[ac];display=val!=null?val.toFixed(1)+' qt':'—';}
      else{val=e[ac];display=val!=null?val.toFixed(1):'—';}
      return'<td style="padding:5px 8px;text-align:right;font-size:12px;color:'+(val!=null?'var(--text)':'var(--text3)')+'">'+display+'</td>';
    }).join('');
    return'<tr><td style="padding:5px 8px;font-size:12px;color:var(--text3)">'+fmtMaintDate(e.date)+'</td>'+cols+
      (e.comment?'<td style="padding:5px 8px;font-size:11px;color:var(--text3);font-style:italic">'+esc(e.comment)+'</td>':'<td></td>')+'</tr>';
  }).join('');

  return form+summaryHtml+`<div class="card" style="overflow-x:auto">
    <div class="st">Results (${filtered.length})</div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:2px solid var(--border)">
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--text3)">Date</th>
        ${acCols.map(ac=>'<th style="padding:6px 8px;text-align:right;font-size:11px;color:'+(AC_COL[ac]||'#888')+'">'+ac+'</th>').join('')}
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--text3)">Notes</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ── Maintenance action handlers ──

window.saveMaintField=function(date,ac,field,rawVal){
  if(!_maintGuard())return;
  const val=rawVal.trim();
  initMaintenance();
  if(field==='oil'){
    const v=parseFloat(val)||0;
    S.maintenance.oil=S.maintenance.oil||[];
    var oilEntry=S.maintenance.oil.find(function(e){return e.date===date;});
    if(!oilEntry&&v>0){oilEntry={date};S.maintenance.oil.push(oilEntry);S.maintenance.oil.sort(function(a,b){return a.date.localeCompare(b.date);});}
    if(oilEntry){if(v>0)oilEntry[ac]=v;else delete oilEntry[ac];}
  } else {
    var existing=S.maintenance.hist.find(function(e){return e.date===date;});
    if(!existing&&val){existing={date};S.maintenance.hist.push(existing);S.maintenance.hist.sort(function(a,b){return a.date.localeCompare(b.date);});}
    if(existing){
      if(field==='ttis'){const v=parseFloat(val);if(!isNaN(v)&&v>0)existing[ac]=v;else delete existing[ac];}
      else if(field==='starts'){const v=parseInt(val);if(!isNaN(v)&&v>=0)existing[ac+'_starts']=v;else delete existing[ac+'_starts'];}
      else if(field==='landings'){const v=parseInt(val);if(!isNaN(v)&&v>=0)existing[ac+'_landings']=v;else delete existing[ac+'_landings'];}
      else if(field==='comment'){if(val)existing.comment=val;else delete existing.comment;}
    }
  }
  saveMaintenance();
  if(rawVal.trim()) auditLog('maint_field_edit',{date:date,ac:ac,field:field,val:rawVal.trim()});
  render();
};
window.addMaintEntry=function(){
  if(!_maintGuard())return;
  const cwSel=document.getElementById('ml_compwash')?.checked?'done':'';
  const adasSel=document.getElementById('ml_adas')?.checked?'done':'';
  const date=document.getElementById('ml_date')?.value;
  if(!date){toast('Select a date.','warn');return;}
  const ac=S.maintEntryAc||'ZK-SLD';
  const hours=parseFloat(document.getElementById('ml_hours')?.value);
  const starts=parseInt(document.getElementById('ml_starts')?.value)||0;
  const landings=parseInt(document.getElementById('ml_landings')?.value)||0;
  const oil=parseFloat(document.getElementById('ml_oil')?.value)||0;
  const comment=document.getElementById('ml_comment')?.value||'';
  if(!hours||hours<=0){toast('Enter TTIS hours for '+ac,'warn');return;}
  // Sanity checks on TTIS hours used
  const prevHrs=maintGetLatest(ac);
  if(prevHrs!=null){
    const used=hours-prevHrs;
    if(used<0.5&&used>=0){
      if(!confirm('Hours used since last entry: '+used.toFixed(1)+'hrs — this is less than 0.5hrs. Is this correct?')) return;
    }
    if(used>10){
      if(!confirm('Hours used since last entry: '+used.toFixed(1)+'hrs — this is more than 10hrs. Is this correct?')) return;
    }
  }
  // Sanity checks on oil
  if(oil>1){
    if(!confirm('Oil added: '+oil+' quarts — more than 1qt. Is this correct?')) return;
  }
  // Sanity checks on starts/landings
  if(starts>8){
    if(!confirm('Starts entered: '+starts+' — more than 8. Is this correct?')) return;
  }
  if(landings>8){
    if(!confirm('Landings entered: '+landings+' — more than 8. Is this correct?')) return;
  }
  initMaintenance();
  // Update hist entry (hours)
  var existing=S.maintenance.hist.find(function(e){return e.date===date;});
  if(!existing){existing={date};S.maintenance.hist.push(existing);S.maintenance.hist.sort(function(a,b){return a.date.localeCompare(b.date);});}
  existing[ac]=hours;
  if(starts>0){existing[ac+'_starts']=starts;}
  if(landings>0){existing[ac+'_landings']=landings;}
  if(comment) existing.comment=comment;
  // Update oil separately
  if(oil>0){
    S.maintenance.oil=S.maintenance.oil||[];
    var oilEntry=S.maintenance.oil.find(function(e){return e.date===date;});
    if(!oilEntry){oilEntry={date};S.maintenance.oil.push(oilEntry);S.maintenance.oil.sort(function(a,b){return a.date.localeCompare(b.date);});}
    oilEntry[ac]=oil;
  }
  // Save compwash/adas completion if logged
  if(cwSel==='done'){if(!S.maintenance.compwash)S.maintenance.compwash={};var _cwa=S.maintenance.compwash[ac]||[];if(!Array.isArray(_cwa))_cwa=_cwa?[_cwa]:[];if(!_cwa.includes(date))_cwa.push(date);S.maintenance.compwash[ac]=_cwa;}
  if(adasSel==='done'){if(!S.maintenance.adas)S.maintenance.adas={};var _ada=S.maintenance.adas[ac]||[];if(!Array.isArray(_ada))_ada=_ada?[_ada]:[];if(!_ada.includes(date))_ada.push(date);S.maintenance.adas[ac]=_ada;}
  saveMaintenance();
  S.maintEditDate=null;   // exit "Update Entry" mode after saving (form returns to Add)
  toast('Entry saved: '+ac+' '+hours+'hrs on '+fmtMaintDate(date),'ok');auditLog('maint_entry_add',{date:date,ac:ac,ttis:hours,starts:starts,landings:landings,oil:oil});render();
};
window.toggleCWLog=function(date,ac){
  if(!_maintTickGuard())return;
  if(!S.maintenance.compwash)S.maintenance.compwash={};
  var arr=S.maintenance.compwash[ac]||[];if(!Array.isArray(arr))arr=arr?[arr]:[];
  var ix=arr.indexOf(date);if(ix>=0)arr.splice(ix,1);else arr.push(date);
  S.maintenance.compwash[ac]=arr;auditLog('maint_compwash_toggle',{date:date,ac:ac});saveMaintenance();render();
};
window.toggleADASLog=function(date,ac){
  if(!_maintTickGuard())return;
  if(!S.maintenance.adas)S.maintenance.adas={};
  var arr=S.maintenance.adas[ac]||[];if(!Array.isArray(arr))arr=arr?[arr]:[];
  var ix=arr.indexOf(date);if(ix>=0)arr.splice(ix,1);else arr.push(date);
  S.maintenance.adas[ac]=arr;auditLog('maint_adas_toggle',{date:date,ac:ac});saveMaintenance();render();
};

window.deleteMaintEntry=function(date,ac){
  if(!_maintGuard())return;
  if(!confirm('Delete log entry for '+ac+' on '+date+'?')) return;
  initMaintenance();
  S.maintenance.hist=S.maintenance.hist.filter(function(e){
    if(e.date!==date) return true;
    var others=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(a){return a!==ac;});
    if(others.some(function(a){return e[a]!=null;})){delete e[ac];delete e[ac+'_starts'];delete e[ac+'_landings'];return true;}
    return false;
  });
  if(S.maintenance.compwash?.[ac]){var _ca=S.maintenance.compwash[ac];if(Array.isArray(_ca))S.maintenance.compwash[ac]=_ca.filter(function(d){return d!==date;});else if(_ca===date)S.maintenance.compwash[ac]=null;}
  if(S.maintenance.adas?.[ac]){var _aa=S.maintenance.adas[ac];if(Array.isArray(_aa))S.maintenance.adas[ac]=_aa.filter(function(d){return d!==date;});else if(_aa===date)S.maintenance.adas[ac]=null;}
  auditLog('maint_entry_delete',{date:date,ac:ac});saveMaintenance();toast('Entry deleted','ok');render();
};
window.addOilEntry=function(){
  if(!_maintGuard())return;
  const date=document.getElementById('oil_date')?.value;
  if(!date) return;
  initMaintenance();
  const entry={date};
  ['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].forEach(function(ac){
    const v=parseFloat(document.getElementById('oil_'+ac.replace('-',''))?.value);
    if(v&&v>0) entry[ac]=v;
  });
  if(Object.keys(entry).length<=1){toast('Enter at least one oil value.','warn');return;}
  S.maintenance.oil=S.maintenance.oil||[];
  // Merge into any existing oil row for this date (don't drop per-aircraft oil already
  // entered for the day via the daily form / other columns left blank here).
  var _oilRow=S.maintenance.oil.find(function(e){return e.date===date;});
  if(_oilRow){
    ['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].forEach(function(ac){if(entry[ac]!=null)_oilRow[ac]=entry[ac];});
  }else{
    S.maintenance.oil.push(entry);
    S.maintenance.oil.sort(function(a,b){return a.date.localeCompare(b.date);});
  }
  auditLog('maint_oil_entry',{date:date});
  saveMaintenance();
  toast('Oil entry saved.','ok');
};

window.saveMaintCheck=function(ac,field,val){
  if(!_maintGuard())return;
  initMaintenance();
  if(field==='nextCheck') S.maintenance.nextCheck[ac]=val;
  if(field==='checkType') S.maintenance.checkType[ac]=val;
  if(field==='engineLastOH'){S.maintenance.engineLastOH=S.maintenance.engineLastOH||{};S.maintenance.engineLastOH[ac]=val;}
  if(field==='propLastOH'){S.maintenance.propLastOH=S.maintenance.propLastOH||{};S.maintenance.propLastOH[ac]=val;}
  if(field==='engineToRun'){S.maintenance.engineToRun=S.maintenance.engineToRun||{};S.maintenance.engineToRun[ac]=val;}
  if(field==='propToRun'){S.maintenance.propToRun=S.maintenance.propToRun||{};S.maintenance.propToRun[ac]=val;}
  saveMaintenance();render();
};

// "Monday 18 Aug" for a YYYY-MM-DD string.
function _maintDateLabel(ds){var d=ds?new Date(ds+'T00:00:00'):null;return (d&&!isNaN(d))?d.toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'short'}):'';}
// Notify Desk staff + pilots (anyone who flies/dispatches) when a maintenance booking is set,
// moved, confirmed or cancelled. Includes a link to the Maintenance overview.
window._notifyMaintBooking=async function(ac,dateStr,action){
  try{
    var acLbl=String(ac||'').replace('ZK-','');var when=_maintDateLabel(dateStr);
    var verb=action==='cancelled'?'maintenance booking cancelled':action==='confirmed'?'maintenance confirmed':action==='moved'?'maintenance moved':'maintenance booked';
    var msg='🔧 '+acLbl+' '+verb+(when?' for '+when:'')+'.';
    var me=(S.user&&S.user.id)||null,seen={},recips=[];
    (S.users||[]).forEach(function(u){
      if(!u||u.inactive||!u.id||u.id===me||seen[u.id])return;
      var role=String(u.role||'').toLowerCase();
      if(role==='desk'||role==='pilot'||role==='cx_manager'||(typeof _picEligible==='function'&&_picEligible(u))){seen[u.id]=1;recips.push(u);}
    });
    if(!recips.length)return;
    var now=new Date().toISOString();
    var rows=recips.map(function(u){return {user_id:u.id,type:'maintenance',reference_id:null,message:msg,read:false,created_at:now};});
    if(typeof sbU==='function')await sbU('ts_notifications',rows);
    if(typeof auditLog==='function')auditLog('maint_notify',{ac:acLbl,action:action,date:dateStr,n:recips.length});
  }catch(e){}
};
// Open the Maintenance overview from a notification.
window.openMaintFromNotif=function(){S._notifOpen=false;S.maintTab='overview';if(typeof window.setTab==='function')window.setTab('maintenance');else{S.section='maintenance';render();}};

function _maintBkId(){return 'mbk_'+Date.now()+'_'+Math.floor(Math.random()*1e5);}
window.addBooking=function(ac){
  if(!_maintBookGuard())return;
  initMaintenance();
  S.maintenance.bookings=S.maintenance.bookings||{};
  S.maintenance.bookings[ac]=S.maintenance.bookings[ac]||[];
  var bk={id:_maintBkId(),date:(typeof _todayLocal==='function'?_todayLocal():new Date().toISOString().slice(0,10)),end:'',notes:'',confirmed:false};
  S.maintenance.bookings[ac].push(bk);
  saveMaintenance();
  _maintSyncFerry(ac,bk);     // create the QN→WF / WF→QN ferry blocks immediately (date defaults to today)
  render();
};

window.editBooking=function(ac,idx,field,val){
  if(!_maintBookGuard())return;
  initMaintenance();
  var bk=S.maintenance.bookings?.[ac]?.[idx];if(!bk)return;
  if(!bk.id)bk.id=_maintBkId();                  // backfill an id for older bookings
  var oldVal=bk[field];
  bk[field]=val;saveMaintenance();
  // Notify on a (start) date set/move or a confirmation (not on every notes keystroke).
  if(field==='date'&&val&&val!==oldVal){
    var action=bk._announced?'moved':'booked';bk._announced=true;saveMaintenance();
    if(window._notifyMaintBooking)window._notifyMaintBooking(ac,val,action);
  }else if(field==='confirmed'&&val){
    bk._announced=true;saveMaintenance(); // so a later delete still fires the 'cancelled' notice
    if(window._notifyMaintBooking)window._notifyMaintBooking(ac,bk.date,'confirmed');
  }
  // Keep the calendar ferry blocks (QN→WF on the go day, WF→QN on the return day) in step.
  if(field==='date'||field==='end')_maintSyncFerry(ac,bk);
  render();
};

window.deleteBooking=function(ac,idx){
  if(!_maintBookGuard())return;
  initMaintenance();
  var bk=S.maintenance.bookings?.[ac]?.[idx];var _d=bk&&bk.date,_ann=bk&&bk._announced;
  if(bk)_maintDeleteFerry(bk);                    // remove its auto ferry blocks
  S.maintenance.bookings[ac].splice(idx,1);
  saveMaintenance();
  if(_ann&&_d&&window._notifyMaintBooking)window._notifyMaintBooking(ac,_d,'cancelled'); // only if it had been announced
  render();
};

// ── Maintenance → calendar ferry blocks ────────────────────────────────────────
// A maintenance booking ferries the aircraft to Wanaka (WF): QN→WF 08:00 on the GO day and
// WF→QN 16:00 on the RETURN day (= end date, or the go day if no end). Stored as normal editable
// calendar blocks in ts_schedule (deterministic ids keyed to the booking) so the operator can
// change the times/dates or delete them like any other block.
async function _maintSyncFerry(ac,bk){
  try{
    if(!bk||!bk.id||!bk.date||typeof sbU!=='function')return;
    var go=bk.date,ret=bk.end||bk.date;
    var col=(typeof _rzAcCol==='function')?_rzAcCol(ac):'#888';
    var rows=[
      {id:'maintfer_'+bk.id+'_out', block_date:go, data:{aircraft:ac,label:'QN-WF',start:'08:00',end:'08:30',color:col,notes:'Maintenance ferry → WF',ftype:'Ferry'}},
      {id:'maintfer_'+bk.id+'_back',block_date:ret,data:{aircraft:ac,label:'WF-QN',start:'16:00',end:'16:30',color:col,notes:'Maintenance ferry ← WF',ftype:'Ferry'}}
    ];
    await sbU('ts_schedule',rows);
    if((S.rezdyDate===go||S.rezdyDate===ret)&&window.rezdyLoadSchedule)window.rezdyLoadSchedule();
  }catch(e){}
}
async function _maintDeleteFerry(bk){
  try{
    if(!bk||!bk.id||typeof sbDel!=='function')return;
    await sbDel('ts_schedule','maintfer_'+bk.id+'_out');
    await sbDel('ts_schedule','maintfer_'+bk.id+'_back');
    if(window.rezdyLoadSchedule&&S.rezdyDate)window.rezdyLoadSchedule();
  }catch(e){}
}

window.toggleMaintPriority=function(ac){
  if(!_maintGuard())return;
  initMaintenance();
  S.maintenance.priority=S.maintenance.priority||[];
  const i=S.maintenance.priority.indexOf(ac);
  if(i>=0) S.maintenance.priority.splice(i,1);
  else S.maintenance.priority.push(ac);
  saveMaintenance();render();
};

// ── Init ─
window.addEventListener('online',function(){if(S.user&&S.rtStatus!=='live')initRealtime();});
window.addEventListener('visibilitychange',function(){if(!document.hidden&&S.user&&S.rtStatus!=='live')initRealtime();});
loadAll();

// ── Also update PIC weight select in loadsheet after pilot updates weight ──
window.onload=()=>{
  // Check if pilot should be reminded to update weight (monthly)
  const last=localStorage.getItem('ts_wt_reminder');
  const now=Date.now();
  if(S.user?.role==='pilot'&&(!last||now-parseInt(last)>30*24*60*60*1000)){
    // Show after render
    setTimeout(()=>{
      if(S.user?.role==='pilot'){
        const wt=prompt('Monthly reminder: Update your weight (kg)? (or Cancel to skip)');
        if(wt)updateMyWeight(wt);
        localStorage.setItem('ts_wt_reminder',String(now));
      }
    },2000);
  }
};
</script>

<div id="ptr-indicator" style="position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;justify-content:center;height:0;overflow:hidden;background:var(--bg,#0f172a);transition:height .15s;pointer-events:none">
  <div id="ptr-inner" style="display:flex;align-items:center;gap:14px;font-size:22px;color:var(--text2);padding:18px 0">
    <span id="ptr-icon" style="font-size:42px;transition:transform .3s">↓</span>
    <span id="ptr-label">Pull to refresh</span>
  </div>
</div>
<script>
(function(){
  var startY=0, pulling=false, triggered=false;
  var indicator=document.getElementById('ptr-indicator');
  var icon=document.getElementById('ptr-icon');
  var label=document.getElementById('ptr-label');
  var THRESHOLD=72;
  document.addEventListener('touchstart',function(e){
    if(window.scrollY===0){startY=e.touches[0].clientY;pulling=true;triggered=false;}
  },{passive:true});
  document.addEventListener('touchmove',function(e){
    if(!pulling||triggered) return;
    var dy=e.touches[0].clientY-startY;
    if(dy<=0){indicator.style.height='0';return;}
    var h=Math.min(dy*0.7,156);
    indicator.style.height=h+'px';
    if(dy>=THRESHOLD){icon.style.transform='rotate(180deg)';label.textContent='Release to refresh';}
    else{icon.style.transform='rotate(0deg)';label.textContent='Pull to refresh';}
  },{passive:true});
  document.addEventListener('touchend',function(e){
    if(!pulling) return;
    pulling=false;
    var dy=e.changedTouches[0].clientY-startY;
    if(dy>=THRESHOLD&&!triggered){
      triggered=true;if(navigator.vibrate)navigator.vibrate(50);icon.textContent='↻';icon.style.transform='rotate(0deg)';
      label.textContent='Refreshing…';indicator.style.height='156px';
      setTimeout(function(){window.location.reload();},400);
    } else {indicator.style.height='0';}
  },{passive:true});
})();
</script>
<script>
(function(){
  var wl=null;
  function reqWake(){
    if(navigator.wakeLock){
      navigator.wakeLock.request('screen').then(function(l){wl=l;}).catch(function(){});
    }
  }
  reqWake();
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible') reqWake();
  });
})();
