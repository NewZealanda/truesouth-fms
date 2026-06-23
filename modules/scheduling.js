// === MODULE: scheduling.js === v25.24 ===
// ─────────────────────────────────────────────────────────────────────────────
//  SCHEDULING — cost-aware aircraft allocation + resource board (Phase 1).
//  Phase 1 (this build): the data foundation only —
//    • Admin pricing/config page (Settings ▸ Operations ▸ Scheduling): a master ON/OFF
//      toggle (so the feature can snap on/off while testing), per-tail capacity +
//      Milford round-trip cost + empty-ferry cost, and the pilot call-in $/day.
//    • Resource Availability board (its own nav section, only visible when the toggle is
//      ON): a visual fleet board — serviceable / note / down, maintenance hours-to-check,
//      capacity + Milford cost — plus today's available pilots from the roster.
//  Phase 2/3 (later, on top of this): auto-allocate passengers to the cheapest aircraft
//  combination as bookings come in, and a whole-day optimiser comparing run-SDB vs
//  ferry-an-airvan vs call-in-a-pilot. Persisted to ts_settings key 'scheduling'.
// ─────────────────────────────────────────────────────────────────────────────

var SCHED_KEY='scheduling';
function _schedEsc(s){if(typeof _rzEsc==='function')return _rzEsc(s);return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _schedAcShort(ac){return String(ac||'').replace(/^ZK-?/,'');}
function _schedIsAirvan(ac){var sp=(typeof _acSpec==='function')?_acSpec(ac):((S.aircraft||{})[ac]);return !!(sp&&sp.layout==='ga8');}
function _schedAcType(ac){return _schedIsAirvan(ac)?'Airvan':'Caravan';}
function _schedIsSDB(ac){return _schedAcShort(ac).toUpperCase()==='SDB';}
// Seat capacity: SDB is an 11-seat lease; other caravans 13, airvans 7.
function _schedDefaultCap(ac){if(_schedIsSDB(ac))return 11;return _schedIsAirvan(ac)?7:13;}
// Seed Milford round-trip cost ($ ex GST, incl. landings + fees, less pilot) from the operator's
// figures: GA8 (owned avg) $1,014.91 · C208B (owned avg) $1,650.35 · SDB (NEW lease) $2,658.47.
function _schedSeedRt(ac){if(_schedIsSDB(ac))return 2658.47;return _schedIsAirvan(ac)?1014.91:1650.35;}
// Seed ferry (empty) Milford return cost ($ ex GST) — the cost of dispatching an aircraft QN→MF→QN
// empty to reposition/collect: GA8 $883.49 · C208B $1,540.15 · SDB (NEW lease) $2,456.62.
function _schedSeedFerry(ac){if(_schedIsSDB(ac))return 2456.62;return _schedIsAirvan(ac)?883.49:1540.15;}
var SCHED_SEED_CALLIN=550;   // call in an off-roster pilot — $550, no GST

// The live config (defaults overlaid by the saved blob). Tails are ensured for the current fleet.
// First-creation seeds the operator's known figures; once a tail exists we never re-seed (so a
// cleared field stays cleared).
function _schedCfg(){
  var c=S._schedCfg;if(!c||typeof c!=='object')c=S._schedCfg={};
  if(typeof c.enabled!=='boolean')c.enabled=false;
  if(c.callInPerDay===undefined)c.callInPerDay=SCHED_SEED_CALLIN;
  if(!c.tails||typeof c.tails!=='object')c.tails={};
  Object.keys((S&&S.aircraft)||{}).forEach(function(ac){
    if(!c.tails[ac]){
      c.tails[ac]={cap:_schedDefaultCap(ac),rt:_schedSeedRt(ac),ferry:_schedSeedFerry(ac),status:'ok',note:''};
    } else {
      var t=c.tails[ac];
      if(t.cap==null||t.cap==='')t.cap=_schedDefaultCap(ac);
      if(t.rt==null)t.rt='';            // Milford round-trip cost ($)
      if(t.ferry==null)t.ferry='';      // empty-ferry leg cost ($); blank → round-trip ÷ 2
      if(!t.status)t.status='ok';       // ok | note | down
      if(t.note==null)t.note='';
    }
  });
  return c;
}
function _schedTail(ac){return _schedCfg().tails[ac]||{cap:_schedDefaultCap(ac),rt:'',ferry:'',status:'ok',note:''};}
function _schedEnabled(){return !!_schedCfg().enabled;}
function _schedNum(v){v=parseFloat(v);return isFinite(v)?v:null;}
// Effective costs (null when not yet entered). Ferry is its own full QN→MF→QN empty round-trip
// figure (not half the passenger trip).
function _schedRtCost(ac){return _schedNum(_schedTail(ac).rt);}
function _schedFerryCost(ac){return _schedNum(_schedTail(ac).ferry);}
function _schedCallIn(){return _schedNum(_schedCfg().callInPerDay);}
function _schedMoney(n){if(n==null)return '—';return '$'+Number(n).toLocaleString('en-NZ',{maximumFractionDigits:0});}

// ── persistence ──────────────────────────────────────────────────────────────
window.loadScheduling=function(){
  try{var c=(typeof lsGet==='function')&&lsGet('ts_scheduling');if(c&&typeof c==='object')S._schedCfg=c;}catch(e){}
  if(typeof SB==='undefined'){if(typeof safeRender==='function')safeRender();return;}
  try{fetch(SB+'/rest/v1/ts_settings?key=eq.'+SCHED_KEY+'&select=value',{headers:SH}).then(function(r){return r.ok?r.json():[];}).then(function(rows){
    try{var v=rows&&rows[0]&&rows[0].value;if(typeof v==='string')v=JSON.parse(v);
      if(v&&typeof v==='object'){S._schedCfg=v;try{lsSet&&lsSet('ts_scheduling',v);}catch(e){}if(typeof _sbSetBase==='function')_sbSetBase(SCHED_KEY,v);}
    }catch(e){}
    if(typeof safeRender==='function')safeRender();
  }).catch(function(){});}catch(e){}
};
function _schedSave(){
  _schedCfg();
  try{lsSet&&lsSet('ts_scheduling',S._schedCfg);}catch(e){}
  if(typeof sbMergeSave==='function'){
    sbMergeSave(SCHED_KEY,S._schedCfg,function(m){S._schedCfg=m;try{lsSet&&lsSet('ts_scheduling',m);}catch(e){}}).then(function(r){
      if(r===null&&typeof toast==='function')toast('Scheduling settings did not save to the server — check connection.','warn');
    });
  }
}

// ── handlers ───────────────────────────────────────────────────────────────────
window.schedSetEnabled=function(v){_schedCfg().enabled=!!v;_schedSave();render();};
window.schedToggleEnabled=function(){_schedCfg().enabled=!_schedEnabled();_schedSave();render();};
window.schedSetCallIn=function(v){_schedCfg().callInPerDay=(v===''||v==null)?'':(_schedNum(v)!=null?_schedNum(v):'');_schedSave();};
window.schedSetTailField=function(ac,field,v){var t=_schedCfg().tails[ac];if(!t)return;
  if(field==='cap'){var n=_schedNum(v);t.cap=(n!=null?Math.max(0,Math.round(n)):'');}
  else if(field==='rt'){var r=_schedNum(v);t.rt=(r!=null?r:'');}
  else if(field==='ferry'){var f=_schedNum(v);t.ferry=(f!=null?f:'');}
  else if(field==='note')t.note=String(v==null?'':v);
  _schedSave();
};
// Cycle a tail's availability: ok → note → down → ok.
window.schedCycleStatus=function(ac){var t=_schedCfg().tails[ac];if(!t)return;t.status=(t.status==='ok')?'note':(t.status==='note'?'down':'ok');_schedSave();render();};

// ── SETTINGS ▸ OPERATIONS ▸ SCHEDULING (admin pricing/config) ───────────────────
function renderSchedulingSettings(){
  var cfg=_schedCfg();var on=_schedEnabled();
  var acIds=Object.keys((S&&S.aircraft)||{});
  var h='';
  // Master toggle
  h+='<div class="card" style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:2px">Cost-aware scheduling</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:0;max-width:560px">When ON, the Resource board appears and (later) bookings auto-allocate to the cheapest aircraft. Leave OFF to keep everything manual while we test.</p></div>'+
    '<button onclick="window.schedToggleEnabled()" style="flex-shrink:0;display:inline-flex;align-items:center;gap:8px;cursor:pointer;border:none;background:transparent;padding:0">'+
      '<span style="position:relative;width:52px;height:28px;border-radius:16px;background:'+(on?'#22c55e':'var(--border2)')+';transition:background .15s;display:inline-block">'+
        '<span style="position:absolute;top:3px;left:'+(on?'27px':'3px')+';width:22px;height:22px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span></span>'+
      '<span style="font-size:13px;font-weight:800;color:'+(on?'#22c55e':'var(--text3)')+'">'+(on?'ON':'OFF')+'</span>'+
    '</button></div>';

  // Per-tail pricing
  h+='<div class="card" style="margin-bottom:14px"><div class="st">Aircraft costs &amp; capacity</div>'+
    '<p style="font-size:12px;color:var(--text3);margin:-4px 0 12px">Costs ex GST, incl. landings + fees, less pilot (rostered = sunk cost). <b>Milford return</b> = QN→MF→QN with passengers; <b>Ferry return</b> = the same trip flown empty to reposition/collect. SDB carries its own (leased) figures.</p>';
  if(!acIds.length)h+='<div style="color:var(--text3);font-size:13px">No aircraft configured.</div>';
  else{
    h+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:520px">'+
      '<thead><tr style="text-align:left;color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:.04em">'+
        '<th style="padding:6px 8px">Aircraft</th><th style="padding:6px 8px">Type</th><th style="padding:6px 8px">Seats</th><th style="padding:6px 8px">Milford return $</th><th style="padding:6px 8px">Ferry return $</th></tr></thead><tbody>';
    acIds.forEach(function(ac){var t=_schedTail(ac);var col=(typeof _rzAcCol==='function')?_rzAcCol(ac):'#64748b';
      h+='<tr style="border-top:1px solid var(--border2)">'+
        '<td style="padding:6px 8px;font-weight:800;color:'+col+'">'+_schedEsc(_schedAcShort(ac))+'</td>'+
        '<td style="padding:6px 8px;color:var(--text2)">'+_schedAcType(ac)+'</td>'+
        '<td style="padding:6px 8px"><input type="number" min="0" value="'+_schedEsc(t.cap)+'" onchange="window.schedSetTailField(\''+_schedEsc(ac)+'\',\'cap\',this.value)" style="width:64px;padding:5px 7px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text1);font-size:13px"></td>'+
        '<td style="padding:6px 8px"><input type="number" min="0" inputmode="decimal" placeholder="—" value="'+_schedEsc(t.rt)+'" onchange="window.schedSetTailField(\''+_schedEsc(ac)+'\',\'rt\',this.value)" style="width:104px;padding:5px 7px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text1);font-size:13px"></td>'+
        '<td style="padding:6px 8px"><input type="number" min="0" inputmode="decimal" placeholder="—" value="'+_schedEsc(t.ferry)+'" onchange="window.schedSetTailField(\''+_schedEsc(ac)+'\',\'ferry\',this.value)" style="width:104px;padding:5px 7px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text1);font-size:13px"></td>'+
      '</tr>';
    });
    h+='</tbody></table></div>';
  }
  h+='</div>';

  // Pilot call-in
  h+='<div class="card"><div class="st">Pilots</div>'+
    '<p style="font-size:12px;color:var(--text3);margin:-4px 0 12px">Rostered pilots are already paid (sunk cost). Enter only the extra cost of calling in an off-roster pilot — the optimiser uses this to decide whether a call-in is cheaper than running SDB or ferrying.</p>'+
    '<label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px">Call-in cost ($/day)</label>'+
    '<input type="number" min="0" inputmode="decimal" placeholder="—" value="'+_schedEsc(cfg.callInPerDay)+'" onchange="window.schedSetCallIn(this.value)" style="width:160px;padding:7px 9px;border-radius:8px;border:1px solid var(--border2);background:transparent;color:var(--text1);font-size:14px">'+
  '</div>';
  return h;
}

// ── RESOURCE AVAILABILITY BOARD (tier-1 section) ───────────────────────────────
function _schedStatusMeta(s){
  if(s==='down')return {col:'#ef4444',bg:'rgba(239,68,68,.12)',lbl:'Unserviceable',dot:'#ef4444'};
  if(s==='note')return {col:'#f59e0b',bg:'rgba(245,158,11,.12)',lbl:'Note',dot:'#f59e0b'};
  return {col:'#22c55e',bg:'rgba(34,197,94,.10)',lbl:'Serviceable',dot:'#22c55e'};
}
function renderResources(){
  if(typeof hasRolePerm==='function'&&!hasRolePerm('operations'))return '<div class="page"><div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div></div>';
  if(!_schedEnabled())return '<div class="page"><div class="card" style="text-align:center;padding:40px;color:var(--text3)">Cost-aware scheduling is OFF. Turn it on in Settings ▸ Operations ▸ Scheduling.</div></div>';
  var acIds=Object.keys((S&&S.aircraft)||{});
  var h='<div class="page">';
  h+='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:0">Resource availability</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">Fleet status &amp; today\'s pilots. Tap a status chip to cycle serviceable → note → unserviceable.</p></div></div>';

  // Pilots available today (from the roster, reused from the calendar pilot picker).
  var pilots=[];try{if(typeof _rzAvailablePilots==='function')pilots=_rzAvailablePilots()||[];}catch(e){}
  var onDuty=pilots.filter(function(p){return p.rostered;});
  h+='<div class="card"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700;margin-bottom:8px">Pilots available today · '+onDuty.length+' rostered</div>';
  if(!pilots.length)h+='<div style="font-size:12px;color:var(--text3)">No aircraft-rated pilots found (open the Roster once to load it).</div>';
  else{h+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
    pilots.forEach(function(p){var off=!p.rostered;
      h+='<span title="'+_schedEsc(p.name)+(off?' (not rostered today)':'')+'" style="display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:16px;background:rgba(96,165,250,'+(off?'.06':'.14')+');border:1px solid rgba(96,165,250,'+(off?'.28':'.5')+');font-size:12px;font-weight:800;color:#60a5fa;opacity:'+(off?'.55':'1')+'">✈ '+_schedEsc(p.code)+(off?' <span style="font-size:8px;font-weight:700">off</span>':'')+'</span>';});
    h+='</div>';}
  h+='<div style="font-size:11px;color:var(--text3);margin-top:8px">Call-in cost: <b style="color:var(--text2)">'+(_schedCallIn()!=null?_schedMoney(_schedCallIn())+'/day':'not set')+'</b></div></div>';

  // Fleet cards
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">';
  if(!acIds.length)h+='<div class="card" style="color:var(--text3)">No aircraft configured.</div>';
  acIds.forEach(function(ac){
    var t=_schedTail(ac);var m=_schedStatusMeta(t.status);var col=(typeof _rzAcCol==='function')?_rzAcCol(ac):'#64748b';
    var toRun=null;try{if(typeof maintToRun==='function')toRun=maintToRun(ac);}catch(e){}
    var hrs=null;try{if(typeof maintGetLatest==='function')hrs=maintGetLatest(ac);}catch(e){}
    var maintCol=(toRun!=null&&toRun<=5)?'#ef4444':((toRun!=null&&toRun<=15)?'#f59e0b':'var(--text2)');
    h+='<div class="card" style="margin:0;border-left:4px solid '+col+'">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">'+
        '<span style="font-size:16px;font-weight:900;color:'+col+'">'+_schedEsc(_schedAcShort(ac))+'</span>'+
        '<button onclick="window.schedCycleStatus(\''+_schedEsc(ac)+'\')" style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;border:1px solid '+m.col+';background:'+m.bg+';color:'+m.col+';font-size:11px;font-weight:800;padding:3px 10px;border-radius:14px">'+
          '<span style="width:8px;height:8px;border-radius:50%;background:'+m.dot+';display:inline-block"></span>'+m.lbl+'</button>'+
      '</div>'+
      '<div style="font-size:12px;color:var(--text3);line-height:1.7">'+
        '<div>'+_schedAcType(ac)+' · <b style="color:var(--text2)">'+_schedEsc(t.cap)+' seats</b></div>'+
        '<div>Milford return: <b style="color:var(--text2)">'+_schedMoney(_schedRtCost(ac))+'</b>'+(_schedFerryCost(ac)!=null?(' · ferry <b style="color:var(--text2)">'+_schedMoney(_schedFerryCost(ac))+'</b>'):'')+'</div>'+
        '<div>Maintenance: '+(toRun!=null?('<b style="color:'+maintCol+'">'+toRun.toFixed(1)+' h to check</b>'):'<span style="color:var(--text3)">—</span>')+(hrs!=null?(' <span style="color:var(--text3)">('+Number(hrs).toFixed(1)+' TTIS)</span>'):'')+'</div>'+
      '</div>'+
      '<input type="text" value="'+_schedEsc(t.note)+'" onblur="window.schedSetTailField(\''+_schedEsc(ac)+'\',\'note\',this.value)" placeholder="Status note…" style="width:100%;box-sizing:border-box;margin-top:8px;padding:5px 8px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text1);font-size:12px">'+
    '</div>';
  });
  h+='</div></div>';
  return h;
}
