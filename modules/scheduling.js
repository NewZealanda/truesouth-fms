// === MODULE: scheduling.js === v25.32 ===
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
// ── Calculated costs (run/hr × hours + landings) ───────────────────────────────
// Per TYPE (averaged owned Airvan / Caravan, plus the SDB lease) we hold a running cost $/hr and a
// landings+fees figure. Milford RETURN = airvan 1.2h · caravan/SDB 1.1h; FERRY (empty) = 1.0h all.
// rt = hrs_return × run/hr + landings; ferry = hrs_ferry × run/hr + landings. Because the allocator
// reads these accessors, changing a run/hr (fuel/maintenance/fees) auto-updates every cost downstream.
var SCHED_HRS={ret:{airvan:1.2,caravan:1.1,sdb:1.1},fer:{airvan:1.0,caravan:1.0,sdb:1.0}};
var SCHED_CALC_DEFAULT={airvan:{runhr:657.07,land:226.42},caravan:{runhr:1102.03,land:438.12},sdb:{runhr:2018.50,land:438.12}};
function _schedTypeKey(ac){return _schedIsSDB(ac)?'sdb':(_schedIsAirvan(ac)?'airvan':'caravan');}
function _schedCalc(){
  var c=_schedCfg();if(!c.calc||typeof c.calc!=='object')c.calc={};
  ['airvan','caravan','sdb'].forEach(function(k){var e=c.calc[k]||(c.calc[k]={});if(e.runhr==null)e.runhr=SCHED_CALC_DEFAULT[k].runhr;if(e.land==null)e.land=SCHED_CALC_DEFAULT[k].land;});
  return c.calc;
}
// ── Live link to the Business Plan running costs (single source of truth) ──
// run/hr: owned type-average (GA8/C208) or the SDB lease line; landings: the Milford round-trip
// (lands at Milford + Queenstown) charges for the type. Returns null when the plan isn't loaded so
// the manual figures below act as the fallback.
function _schedBizRunHr(typeKey){
  if(typeof _bizState!=='function'||!S._bizPlan)return null;
  try{var p=_bizState();
    if(typeKey==='sdb'){var sdb=(p.running.aircraft||[]).find(function(a){return String(a.code||'').toUpperCase()==='SDB';});return sdb?_bizRunCalc(sdb,p.running.fuel).totalHr:null;}
    var av=_bizTypeAvg(typeKey==='airvan'?'GA8':'C208');return (av&&av.n)?av.totalHr:null;
  }catch(e){return null;}
}
function _schedBizLandings(typeKey){
  if(typeof _bizState!=='function'||!S._bizPlan)return null;
  try{var p=_bizState();var locs=p.running.locations||[];
    var qn=locs.find(function(l){return /queens/i.test(l.name||'');}),mf=locs.find(function(l){return /milford/i.test(l.name||'');});
    if(!mf||typeof _bizLocFees!=='function')return null;
    var t=(typeKey==='airvan')?'GA8':'C208';
    var sum=function(loc){if(!loc)return 0;var f=_bizLocFees(loc,t);return f.ldg+f.conc+f.aw;};
    return sum(mf)+sum(qn);                 // round trip lands at Milford + Queenstown
  }catch(e){return null;}
}
function _schedRunHr(typeKey){var b=_schedBizRunHr(typeKey);if(b!=null)return b;return _schedNum((_schedCalc()[typeKey]||{}).runhr);}
function _schedLandVal(typeKey){var b=_schedBizLandings(typeKey);if(b!=null)return b;return _schedNum((_schedCalc()[typeKey]||{}).land);}
function _schedCostSource(typeKey){return _schedBizRunHr(typeKey)!=null?'biz':'manual';}
function _schedCalcCost(typeKey,hrs){var r=_schedRunHr(typeKey);if(r==null)return null;var l=_schedLandVal(typeKey);return r*hrs+(l!=null?l:0);}
// Effective Milford return / ferry cost for an aircraft — computed from its type's run/hr + landings.
function _schedRtCost(ac){var tk=_schedTypeKey(ac);var v=_schedCalcCost(tk,SCHED_HRS.ret[tk]||1.1);return v!=null?v:_schedNum(_schedTail(ac).rt);}
function _schedFerryCost(ac){var tk=_schedTypeKey(ac);var v=_schedCalcCost(tk,SCHED_HRS.fer[tk]||1.0);return v!=null?v:_schedNum(_schedTail(ac).ferry);}
function _schedCallIn(){return _schedNum(_schedCfg().callInPerDay);}
function _schedMoney(n){if(n==null)return '—';return '$'+Number(n).toLocaleString('en-NZ',{maximumFractionDigits:0});}

// ── persistence ──────────────────────────────────────────────────────────────
window.loadScheduling=function(){
  try{var c=(typeof lsGet==='function')&&lsGet('ts_scheduling');if(c&&typeof c==='object')S._schedCfg=c;}catch(e){}
  try{if(!S._bizPlan&&window.loadBusinessPlan){S._bizLoaded=true;window.loadBusinessPlan();}}catch(e){} // costs pull from the Business Plan running costs
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
window.schedSetCalc=function(type,field,v){var e=_schedCalc()[type];if(!e)return;var n=_schedNum(v);e[field]=(n!=null?n:'');_schedSave();render();};

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

  // Cost calculator (per type) — run/hr + landings drive the Milford return & ferry figures live.
  // When the Business Plan is loaded these are pulled from its running costs (read-only here); when
  // it isn't, the manual fields below act as the fallback.
  var _fromBiz=(_schedCostSource('caravan')==='biz');
  var _ni=function(type,field,val){return '<input type="number" min="0" inputmode="decimal" value="'+_schedEsc(val)+'" onchange="window.schedSetCalc(\''+type+'\',\''+field+'\',this.value)" style="width:96px;padding:5px 7px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text1);font-size:13px">';};
  var _ro=function(v){return '<span style="font-weight:700;color:var(--text1)">'+(v!=null?_schedMoney(v):'—')+'</span>';};
  h+='<div class="card" style="margin-bottom:14px"><div class="st">Cost calculator</div>'+
    '<p style="font-size:12px;color:var(--text3);margin:-4px 0 12px">Costs ex GST, less pilot (rostered = sunk cost). '+
      (_fromBiz?'Run/hr &amp; landings are pulled live from <b>Business Plan ▸ Running costs</b> — edit fuel / maintenance / fees there and every figure here (and the allocator) updates automatically.':'Enter <b>run/hr</b> and <b>landings + fees</b> per type (Business Plan not loaded — using manual fallback).')+
      ' Hours: Milford <b>return</b> = airvan 1.2h, caravan/SDB 1.1h; <b>ferry</b> (empty) = 1.0h.</p>'+
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:560px">'+
      '<thead><tr style="text-align:left;color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:.04em">'+
        '<th style="padding:6px 8px">Type</th><th style="padding:6px 8px">Run/hr $</th><th style="padding:6px 8px">Landings+fees $</th><th style="padding:6px 8px">Milford return</th><th style="padding:6px 8px">Ferry</th></tr></thead><tbody>';
  [['airvan','Airvan (owned avg)'],['caravan','Caravan (owned avg)'],['sdb','SDB (lease)']].forEach(function(row){
    var k=row[0];var e=_schedCalc()[k]||{};var biz=(_schedCostSource(k)==='biz');
    var rt=_schedCalcCost(k,SCHED_HRS.ret[k]),fer=_schedCalcCost(k,SCHED_HRS.fer[k]);
    h+='<tr style="border-top:1px solid var(--border2)">'+
      '<td style="padding:6px 8px;font-weight:800;color:var(--text1)">'+row[1]+'<div style="font-size:10px;color:var(--text3);font-weight:400">'+(SCHED_HRS.ret[k])+'h ret · '+(SCHED_HRS.fer[k])+'h ferry'+(biz?' · from Business Plan':'')+'</div></td>'+
      '<td style="padding:6px 8px">'+(biz?_ro(_schedRunHr(k)):_ni(k,'runhr',e.runhr))+'</td>'+
      '<td style="padding:6px 8px">'+(biz?_ro(_schedLandVal(k)):_ni(k,'land',e.land))+'</td>'+
      '<td style="padding:6px 8px;font-weight:800;color:#22c55e">'+_schedMoney(rt)+'</td>'+
      '<td style="padding:6px 8px;font-weight:800;color:#f59e0b">'+_schedMoney(fer)+'</td>'+
    '</tr>';
  });
  h+='</tbody></table></div></div>';

  // Per-tail seat capacity (SDB is 11; other caravans 13, airvans 7).
  h+='<div class="card" style="margin-bottom:14px"><div class="st">Aircraft seats</div>';
  if(!acIds.length)h+='<div style="color:var(--text3);font-size:13px">No aircraft configured.</div>';
  else{h+='<div style="display:flex;flex-wrap:wrap;gap:10px">';
    acIds.forEach(function(ac){var t=_schedTail(ac);var col=(typeof _rzAcCol==='function')?_rzAcCol(ac):'#64748b';
      h+='<div style="display:flex;align-items:center;gap:6px"><span style="font-weight:800;color:'+col+'">'+_schedEsc(_schedAcShort(ac))+'</span>'+
        '<input type="number" min="0" value="'+_schedEsc(t.cap)+'" onchange="window.schedSetTailField(\''+_schedEsc(ac)+'\',\'cap\',this.value)" style="width:58px;padding:4px 6px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text1);font-size:13px"><span style="font-size:11px;color:var(--text3)">'+_schedAcType(ac)+'</span></div>';});
    h+='</div>';}
  h+='</div>';

  // Pilot call-in
  h+='<div class="card"><div class="st">Pilots</div>'+
    '<p style="font-size:12px;color:var(--text3);margin:-4px 0 12px">Rostered pilots are already paid (sunk cost). Enter only the extra cost of calling in an off-roster pilot — the optimiser uses this to decide whether a call-in is cheaper than running SDB or ferrying.</p>'+
    '<label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px">Call-in cost ($/day)</label>'+
    '<input type="number" min="0" inputmode="decimal" placeholder="—" value="'+_schedEsc(cfg.callInPerDay)+'" onchange="window.schedSetCallIn(this.value)" style="width:160px;padding:7px 9px;border-radius:8px;border:1px solid var(--border2);background:transparent;color:var(--text1);font-size:14px">'+
  '</div>';
  return h;
}

// ── RESOURCE AVAILABILITY BOARD — per-date month calendar ──────────────────────
// Availability lives in cfg.avail[date][ac] = {mode:'on'|'custom'|'off', from, to, note}.
// 'on' (default, no entry) = available all day. 'off' = not available that day. 'custom' =
// available only within from/to (e.g. an aircraft back mid-morning → from 10:30).
function _resToday(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _resYMnow(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function _resAddMonth(ym,delta){var p=String(ym).split('-');var y=+p[0],m=(+p[1]-1)+delta;y+=Math.floor(m/12);m=((m%12)+12)%12;return y+'-'+String(m+1).padStart(2,'0');}
function _resDateStr(y,m,d){return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
function _resShiftDay(date,delta){var dt=new Date(date+'T00:00:00');dt.setDate(dt.getDate()+delta);return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');}
function _resAll(){var c=_schedCfg();if(!c.avail||typeof c.avail!=='object')c.avail={};return c.avail;}
function _resGet(date,ac){var a=_resAll()[date];return (a&&a[ac])||null;}
function _resState(date,ac){var e=_resGet(date,ac);return (e&&e.mode)?e.mode:'on';}
function _resEnsure(date,ac){var all=_resAll();var d=all[date]||(all[date]={});return d[ac]||(d[ac]={mode:'on',from:'',to:'',note:''});}
function _resPrune(date,ac){var all=_resAll();var d=all[date];if(!d)return;var e=d[ac];if(e&&e.mode==='on'&&!e.from&&!e.to&&!e.note){delete d[ac];}if(d&&!Object.keys(d).length)delete all[date];}
// A maintenance booking covering this date for this aircraft (start..end inclusive; end blank = go day).
function _schedMaintCovers(date,ac){
  var bks=(S.maintenance&&S.maintenance.bookings&&S.maintenance.bookings[ac])||[];
  for(var i=0;i<bks.length;i++){var b=bks[i];if(!b||!b.date)continue;var go=b.date,ret=b.end||b.date;if(date>=go&&date<=ret)return b;}
  return null;
}
// Effective availability state: a maintenance booking forces 'maint' (overrides manual avail).
function _resEffState(date,ac){return _schedMaintCovers(date,ac)?'maint':_resState(date,ac);}

window.resMonthNav=function(delta){S._resMonth=_resAddMonth(S._resMonth||_resYMnow(),delta);render();};
window.resPickDay=function(date){S._resDay=date;S._resMonth=String(date).slice(0,7);render();};
window.resSetMode=function(date,ac,mode){var e=_resEnsure(date,ac);e.mode=mode;if(mode==='on'){e.from='';e.to='';}_resPrune(date,ac);_schedSave();render();};
window.resSetTime=function(date,ac,field,val){var e=_resEnsure(date,ac);if(field==='from')e.from=val||'';else e.to=val||'';if(e.mode!=='off')e.mode=(e.from||e.to)?'custom':'on';_resPrune(date,ac);_schedSave();render();};
window.resSetNote=function(date,ac,val){var e=_resEnsure(date,ac);e.note=String(val==null?'':val);_resPrune(date,ac);_schedSave();};
window.resQuickToggle=function(date,ac){var st=_resState(date,ac);var e=_resEnsure(date,ac);e.mode=(st==='off')?'on':'off';if(e.mode==='on'){e.from='';e.to='';}_resPrune(date,ac);_schedSave();render();};

// Short availability summary for a cell chip / editor.
function _resChipStyle(state,col){
  if(state==='maint')return 'background:rgba(239,68,68,.14);border:1px solid #ef4444;color:#ef4444';
  if(state==='off')return 'background:rgba(148,163,184,.12);border:1px solid var(--border2);color:var(--text3);text-decoration:line-through;opacity:.7';
  if(state==='custom')return 'background:rgba(245,158,11,.14);border:1px solid #f59e0b;color:#f59e0b';
  return 'background:'+col+'22;border:1px solid '+col+';color:'+col;
}

function renderResources(){
  if(typeof hasRolePerm==='function'&&!hasRolePerm('operations'))return '<div class="page"><div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div></div>';
  if(!_schedEnabled())return '<div class="page"><div class="card" style="text-align:center;padding:40px;color:var(--text3)">Cost-aware scheduling is OFF. Turn it on in Settings ▸ Operations ▸ Scheduling.</div></div>';
  var acIds=Object.keys((S&&S.aircraft)||{});
  var today=_resToday();
  var ym=S._resMonth||_resYMnow();S._resMonth=ym;
  var sel=S._resDay||today;S._resDay=sel;
  var p=ym.split('-');var Y=+p[0],M=+p[1];
  var first=new Date(Y,M-1,1);var offset=(first.getDay()+6)%7;var dim=new Date(Y,M,0).getDate();
  var monLbl=first.toLocaleString('en-NZ',{month:'long',year:'numeric'});

  var h='<div class="page">';
  h+='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:0">Resource availability</div>'+
      '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">Tap a day to set times; tap an aircraft chip to toggle it off/on for that day. No entry = available all day.</p></div>'+
    '<div style="display:flex;align-items:center;gap:6px">'+
      '<button class="btn btn-ghost" style="font-size:13px;padding:5px 12px" onclick="window.resMonthNav(-1)">‹</button>'+
      '<span style="font-size:14px;font-weight:800;color:var(--text1);min-width:140px;text-align:center">'+_schedEsc(monLbl)+'</span>'+
      '<button class="btn btn-ghost" style="font-size:13px;padding:5px 12px" onclick="window.resMonthNav(1)">›</button>'+
    '</div></div>';

  // Month grid
  h+='<div class="card" style="padding:10px">';
  h+='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">';
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(function(d){h+='<div style="text-align:center;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">'+d+'</div>';});
  h+='</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">';
  for(var b=0;b<offset;b++)h+='<div></div>';
  for(var d=1;d<=dim;d++){
    var date=_resDateStr(Y,M,d);var isT=(date===today);var isSel=(date===sel);
    var chips='';
    acIds.forEach(function(ac){var st=_resEffState(date,ac);var col=(typeof _rzAcCol==='function')?_rzAcCol(ac):'#64748b';var e=_resGet(date,ac);
      var isM=(st==='maint');
      var lbl=(isM?'🔧':'')+_schedAcShort(ac)+(st==='custom'?(' '+_schedEsc((e&&e.from)||'')):'');
      var click=isM?'':('event.stopPropagation();window.resQuickToggle(\''+date+'\',\''+_schedEsc(ac)+'\')');
      var tip=_schedAcShort(ac)+': '+(isM?'in maintenance':(st==='off'?'unavailable':(st==='custom'?('from '+((e&&e.from)||'?')+(e&&e.to?(' to '+e.to):'')):'available all day')));
      chips+='<span'+(click?' onclick="'+click+'"':'')+' title="'+_schedEsc(tip)+'" style="'+(click?'cursor:pointer;':'')+'font-size:9px;font-weight:800;padding:1px 5px;border-radius:5px;'+_resChipStyle(st,col)+'">'+_schedEsc(lbl)+'</span>';
    });
    h+='<div onclick="window.resPickDay(\''+date+'\')" style="cursor:pointer;min-height:62px;border:1px solid '+(isSel?'var(--acc)':'var(--border2)')+';border-radius:8px;padding:4px;background:'+(isSel?'rgba(124,58,237,.08)':'transparent')+';outline:'+(isT?'2px solid rgba(96,165,250,.5);outline-offset:-2px':'none')+'">'+
      '<div style="font-size:11px;font-weight:'+(isT?'900':'700')+';color:'+(isT?'#60a5fa':'var(--text2)')+';margin-bottom:3px">'+d+'</div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:2px">'+chips+'</div>'+
    '</div>';
  }
  h+='</div></div>';

  // Day editor
  var selObj=new Date(sel+'T00:00:00');
  var selLbl=selObj.toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  h+='<div class="card">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px">'+
      '<div class="st" style="margin:0">'+_schedEsc(selLbl)+(sel===today?' <span style="font-size:11px;color:#60a5fa;font-weight:700">· today</span>':'')+'</div>'+
      '<div style="display:flex;gap:6px"><button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" onclick="window.resPickDay(\''+_resShiftDay(sel,-1)+'\')">‹ Prev</button>'+
        '<button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" onclick="window.resPickDay(\''+_resShiftDay(sel,1)+'\')">Next ›</button></div>'+
    '</div>';
  if(!acIds.length)h+='<div style="color:var(--text3);font-size:13px">No aircraft configured.</div>';
  acIds.forEach(function(ac){
    var st=_resEffState(sel,ac);var e=_resGet(sel,ac);var col=(typeof _rzAcCol==='function')?_rzAcCol(ac):'#64748b';
    var toRun=null;try{if(typeof maintToRun==='function')toRun=maintToRun(ac);}catch(_e){}
    var maintCol=(toRun!=null&&toRun<=5)?'#ef4444':((toRun!=null&&toRun<=15)?'#f59e0b':'var(--text3)');
    var mb=_schedMaintCovers(sel,ac);
    var btn=function(mode,lbl){var on=(st===mode);var c=(mode==='off')?'#ef4444':(mode==='custom'?'#f59e0b':'#22c55e');
      return '<button onclick="window.resSetMode(\''+sel+'\',\''+_schedEsc(ac)+'\',\''+mode+'\')" style="cursor:pointer;font-size:11px;font-weight:800;padding:4px 11px;border-radius:13px;border:'+(on?'2px solid '+c:'1px solid var(--border2)')+';background:'+(on?c+'1f':'transparent')+';color:'+(on?c:'var(--text3)')+'">'+lbl+'</button>';};
    h+='<div style="border-top:1px solid var(--border2);padding:9px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
      '<span style="font-size:14px;font-weight:900;color:'+col+';width:46px">'+_schedEsc(_schedAcShort(ac))+'</span>';
    if(mb){
      h+='<span style="font-size:12px;font-weight:800;color:#ef4444;display:inline-flex;align-items:center;gap:5px">🔧 In maintenance'+((mb.end&&mb.end!==mb.date)?(' '+_schedEsc(mb.date)+'→'+_schedEsc(mb.end)):'')+'</span>'+
        '<span style="font-size:11px;color:var(--text3)">set in Maintenance ▸ Bookings</span></div>';
      return;
    }
    h+='<div style="display:flex;gap:5px">'+btn('on','All day')+btn('custom','Custom')+btn('off','Off')+'</div>';
    if(st==='custom'){
      h+='<div style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text3)">from '+
        '<input type="time" value="'+_schedEsc((e&&e.from)||'')+'" onchange="window.resSetTime(\''+sel+'\',\''+_schedEsc(ac)+'\',\'from\',this.value)" style="padding:4px 6px;border-radius:6px;border:1px solid var(--border2);background:transparent;color:var(--text1);font-size:12px">'+
        ' to <input type="time" value="'+_schedEsc((e&&e.to)||'')+'" onchange="window.resSetTime(\''+sel+'\',\''+_schedEsc(ac)+'\',\'to\',this.value)" style="padding:4px 6px;border-radius:6px;border:1px solid var(--border2);background:transparent;color:var(--text1);font-size:12px"></div>';
    }
    if(toRun!=null)h+='<span style="font-size:11px;color:'+maintCol+';font-weight:700">'+toRun.toFixed(1)+'h to check</span>';
    h+='<input type="text" value="'+_schedEsc((e&&e.note)||'')+'" onblur="window.resSetNote(\''+sel+'\',\''+_schedEsc(ac)+'\',this.value)" placeholder="note…" style="flex:1;min-width:120px;padding:4px 8px;border-radius:6px;border:1px solid var(--border2);background:transparent;color:var(--text1);font-size:12px">'+
    '</div>';
  });
  // Recommended whole-day plan (preview only — does not change anything yet).
  (function(){
    var dp=_schedDayPlan(sel);
    h+='<div style="border-top:1px solid var(--border2);padding-top:10px;margin-top:6px">'+
      '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700;margin-bottom:6px">Recommended day plan <span style="font-weight:400;text-transform:none;letter-spacing:0">· preview, cost-optimised</span></div>';
    if(!dp.departures.length){
      h+='<div style="font-size:12px;color:var(--text3)">No Milford departures loaded for this day'+(sel!==S.rezdyDate?' (open it in Calendar/Operations to load its bookings).':'.')+'</div>';
    } else {
      dp.departures.forEach(function(d){
        var acs=d.aircraft.map(function(a){var c=(typeof _rzAcCol==='function')?_rzAcCol(a.ac):'#888';
          return '<span style="font-size:11px;font-weight:800;padding:1px 7px;border-radius:5px;background:'+c+'22;border:1px solid '+c+';color:'+c+'">'+_schedEsc(_schedAcShort(a.ac))+(a.reused?' ⤳':'')+'</span>';}).join(' ');
        var lockCtl;
        if(d.locked&&!d.manualLock)lockCtl='<span title="Departed — auto-locked" style="font-size:10px;color:var(--text3);font-weight:700">🔒 flown</span>';
        else lockCtl='<button onclick="window.schedToggleLock(\''+sel+'\',\''+_schedEsc(d.time)+'\')" title="'+(d.manualLock?'Locked — optimiser won\'t change it. Click to unlock.':'Lock this departure so the optimiser leaves it and only re-plans the rest of the day.')+'" style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;cursor:pointer;border:1px solid '+(d.manualLock?'#f59e0b':'var(--border2)')+';background:'+(d.manualLock?'rgba(245,158,11,.12)':'transparent')+';color:'+(d.manualLock?'#f59e0b':'var(--text3)')+'">'+(d.manualLock?'🔒 locked':'🔓 lock')+'</button>';
        h+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--text2);margin-bottom:4px;'+(d.locked?'opacity:.72;':'')+'">'+
          '<b style="color:var(--text1);min-width:46px">'+_schedEsc(d.time)+'</b>'+
          '<span style="color:var(--text3)">'+d.pax+' pax →</span>'+acs+
          (d.short?'<span style="color:#ef4444;font-weight:700;font-size:11px">⚠ short '+(d.pax-d.cap)+'</span>':'')+
          '<span style="margin-left:auto">'+lockCtl+'</span></div>';
      });
      var ferries=dp.emptyLegs/2;
      h+='<div style="font-size:12px;color:var(--text2);margin-top:6px;display:flex;gap:14px;flex-wrap:wrap">'+
        '<span>Est. cost <b style="color:var(--text1)">'+_schedMoney(dp.cost)+'</b> ex GST</span>'+
        '<span>Aircraft <b style="color:var(--text1)">'+dp.aircraftUsed.length+'</b></span>'+
        '<span>Pilots needed <b style="color:var(--text1)">'+dp.pilotsNeeded+'</b></span>'+
        (dp.emptyLegs?('<span style="color:#f59e0b">'+ferries+' reposition leg'+(ferries===1?'':'s')+'</span>'):'<span style="color:#22c55e">no ferries</span>')+'</div>'+
        '<div style="font-size:10px;color:var(--text3);margin-top:3px">⤳ = aircraft reused on a later departure (needs repositioning). Pilots/call-in advice coming next.</div>';
    }
    h+='</div>';
  })();

  // Pilots — only today (the roster picker is today-based for now).
  if(sel===today){
    var pilots=[];try{if(typeof _rzAvailablePilots==='function')pilots=_rzAvailablePilots()||[];}catch(_e){}
    var onDuty=pilots.filter(function(x){return x.rostered;});
    h+='<div style="border-top:1px solid var(--border2);padding-top:10px;margin-top:4px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700;margin-bottom:6px">Pilots rostered today · '+onDuty.length+'</div>';
    if(!pilots.length)h+='<div style="font-size:12px;color:var(--text3)">No rated pilots loaded (open the Roster once).</div>';
    else{h+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
      pilots.forEach(function(x){var off=!x.rostered;h+='<span title="'+_schedEsc(x.name)+'" style="font-size:12px;font-weight:800;color:#60a5fa;padding:4px 10px;border-radius:14px;background:rgba(96,165,250,'+(off?'.06':'.14')+');border:1px solid rgba(96,165,250,'+(off?'.28':'.5')+');opacity:'+(off?'.55':'1')+'">✈ '+_schedEsc(x.code)+(off?' off':'')+'</span>';});
      h+='</div>';}
    h+='</div>';
  }
  h+='</div></div>';
  return h;
}

// ── AUTO-ALLOCATION (Phase 2) ──────────────────────────────────────────────────
// As bookings come in, assign each departure's passengers to the CHEAPEST aircraft combination
// that fits, using only aircraft available that day/time (resource board) and preferring the
// priority caravan/airvan (the maintenance ★ flag). The result is a reversible overlay
// (S._schedAutoAc) consumed by _rzBookingAc only when the feature toggle is ON — a manual pill
// always wins, and turning the toggle OFF restores the original (Rezdy-comment) aircraft. The
// emergent behaviour reproduces the operator's rules (<7 airvan, ≤13 caravan, 14=2 airvans,
// 15-20 airvan+caravan, 21-26 two caravans) and keeps SDB (most expensive) for last.
function _schedPriorityList(){var p=(S.maintenance&&S.maintenance.priority)||[];return Array.isArray(p)?p:[];}
function _schedIsPriority(ac){return _schedPriorityList().indexOf(ac)>=0;}
function _schedMinOf(t){var m=/^(\d{1,2}):(\d{2})$/.exec(String(t||''));return m?(+m[1])*60+(+m[2]):null;}
// Available that date (resource board) and, if a time is given, within any custom from/to window.
function _schedAvailAt(date,ac,time){
  var st=_resEffState(date,ac);
  if(st==='off'||st==='maint')return false;
  if(st==='custom'){var e=_resGet(date,ac);var dm=_schedMinOf(time);if(dm!=null){var fm=_schedMinOf(e&&e.from),to=_schedMinOf(e&&e.to);if(fm!=null&&dm<fm)return false;if(to!=null&&dm>to)return false;}}
  return true;
}
// Fleet usable for a departure: serviceable + priced + available at the time.
function _schedFleetFor(date,time){
  var out=[];
  Object.keys((S&&S.aircraft)||{}).forEach(function(ac){
    var cost=_schedRtCost(ac);if(cost==null)return;          // no Milford price → can't cost it
    if(!_schedAvailAt(date,ac,time))return;
    out.push({ac:ac,cap:(_schedNum(_schedTail(ac).cap)||_schedDefaultCap(ac)),cost:cost,airvan:_schedIsAirvan(ac),priority:_schedIsPriority(ac)});
  });
  return out;
}
function _schedScoreLt(a,b){for(var i=0;i<a.length;i++){if(a[i]<b[i])return true;if(a[i]>b[i])return false;}return false;}
// Cheapest subset of `fleet` covering `pax`. Tie-break: fewer aircraft, more priority aircraft,
// less wasted capacity. If nothing can cover pax, returns the whole fleet (max lift, best effort).
function _schedPickFleet(pax,fleet){
  var n=fleet.length;if(!n)return [];
  var best=null;
  for(var mask=1;mask<(1<<n);mask++){
    var cap=0,cost=0,cnt=0,pri=0;
    for(var i=0;i<n;i++)if(mask&(1<<i)){cap+=fleet[i].cap;cost+=fleet[i].cost;cnt++;if(fleet[i].priority)pri++;}
    if(cap<pax)continue;
    var score=[+cost.toFixed(2),cnt,-pri,cap];
    if(!best||_schedScoreLt(score,best.score))best={mask:mask,score:score};
  }
  if(!best)return fleet.slice();                              // can't cover → use everything available
  var sel=[];for(var j=0;j<n;j++)if(best.mask&(1<<j))sel.push(fleet[j]);
  return sel;
}
// Pack whole booking groups into the chosen aircraft (best-fit, priority aircraft fill first).
function _schedPack(groups,chosen){
  var bins=chosen.map(function(a){return {ac:a.ac,rem:a.cap,priority:a.priority?1:0};});
  bins.sort(function(x,y){return (y.priority-x.priority)||(y.rem-x.rem);});
  var gs=groups.slice().sort(function(a,b){return b.size-a.size;});
  var map={};
  gs.forEach(function(g){
    var pick=null;
    bins.forEach(function(bn){if(bn.rem>=g.size){if(!pick||bn.priority>pick.priority||(bn.priority===pick.priority&&bn.rem<pick.rem))pick=bn;}});
    if(!pick)bins.forEach(function(bn){if(!pick||bn.rem>pick.rem)pick=bn;});   // group too big → most room
    if(pick){map[g.order]=pick.ac;pick.rem-=g.size;}
  });
  return map;
}
// Light change-signature so the day's allocation is only recomputed when something relevant moves.
function _schedSig(date,bks){
  var parts=[date,_schedEnabled()?'1':'0',_schedPriorityList().join(',')];
  (bks||[]).forEach(function(b){var o=String(b.orderNumber||'');
    var c=((typeof _rzIsCancelled==='function')&&_rzIsCancelled(b))?'x':'';
    var ns=((typeof _rzIsNoShow==='function')&&_rzIsNoShow(o))?'n':'';
    (b.items||[]).forEach(function(it){parts.push(o+ns+c+'@'+(it.startTimeLocal||'')+'='+(it.quantity||0));});});
  try{parts.push(JSON.stringify((_resAll()||{})[date]||{}));}catch(e){}
  try{Object.keys((S.maintenance&&S.maintenance.bookings)||{}).forEach(function(ac){((S.maintenance.bookings[ac])||[]).forEach(function(b){if(b&&b.date&&date>=b.date&&date<=(b.end||b.date))parts.push('M'+ac);});});}catch(e){}
  Object.keys((S&&S.aircraft)||{}).forEach(function(ac){parts.push(ac+':'+(_schedNum(_schedTail(ac).cap)||'')+':'+_schedRtCost(ac)+':'+_schedFerryCost(ac));});
  return parts.join('|');
}
// Compute the day's order→aircraft map (memoised). Skips cancelled/no-show + flybacks (the latter
// ride a return leg — handled later). An aircraft can serve different time slots, but not two
// departures at the SAME time.
function _schedEnsureAuto(){
  if(!_schedEnabled()){if(S._schedAutoAc&&Object.keys(S._schedAutoAc).length)S._schedAutoAc={};S._schedAutoKey='';return;}
  var date=S.rezdyDate;var bks=S._rezdyBookings||[];
  var sig=_schedSig(date,bks);
  if(S._schedAutoKey===sig&&S._schedAutoAc)return;
  var groups={};
  bks.forEach(function(b){
    if((typeof _rzIsCancelled==='function')&&_rzIsCancelled(b))return;
    var o=String(b.orderNumber||'');
    if((typeof _rzIsNoShow==='function')&&_rzIsNoShow(o))return;
    (b.items||[]).forEach(function(it){
      var t=(typeof _rzDepTime==='function')?_rzDepTime(it.startTimeLocal||''):'';if(!t)return;
      var start=(typeof _rzHHMMcolon==='function')?_rzHHMMcolon(t):t;
      var prod=(typeof _rzProduct==='function')?_rzProduct(it.product):String(it.product||'');
      if((typeof _rzIsFlyback==='function')&&_rzIsFlyback(prod))return;     // flybacks handled later
      var key=start+'|'+prod;
      var g=groups[key]||(groups[key]={time:start,items:{}});
      g.items[o]=(g.items[o]||0)+(parseInt(it.quantity,10)||0);
    });
  });
  var map={};var usedByTime={};
  Object.keys(groups).sort(function(a,b){return (_schedMinOf(groups[a].time)||0)-(_schedMinOf(groups[b].time)||0);}).forEach(function(k){
    var g=groups[k];var time=g.time;var used=usedByTime[time]||(usedByTime[time]={});
    var fleet=_schedFleetFor(date,time).filter(function(f){return !used[f.ac];});
    var groupsArr=Object.keys(g.items).map(function(o){return {order:o,size:g.items[o]};});
    var pax=groupsArr.reduce(function(s,x){return s+x.size;},0);
    if(!pax||!fleet.length)return;
    var chosen=_schedPickFleet(pax,fleet);
    chosen.forEach(function(c){used[c.ac]=true;});
    var packed=_schedPack(groupsArr,chosen);
    Object.keys(packed).forEach(function(o){map[o]=packed[o];});
  });
  S._schedAutoAc=map;S._schedAutoKey=sig;
}
// The auto-allocated aircraft for one booking (null when the feature is off or none assigned).
function _schedAutoAcFor(order){
  if(!_schedEnabled())return null;
  try{_schedEnsureAuto();}catch(e){return null;}
  return (S._schedAutoAc||{})[String(order)]||null;
}

// ── PHASE 3: whole-day cost engine ─────────────────────────────────────────────
// Per-departure allocation is "cheapest combo that fits". The whole-day layer adds the cost of
// EMPTY ferry legs: an aircraft flying its FIRST departure of the day is already at base (0 ferry,
// 2 loaded legs out+back); reusing an aircraft for a LATER departure forces it to reposition —
// ~2 extra empty legs ("1030 in, out for 1300 … then ferry in to collect"). So the engine prefers
// idle aircraft (even non-priority — priority only breaks cost ties), and weighs ferry-an-owned-
// aircraft vs run-SDB by counting the actual extra legs. Per-leg = round-trip ÷ 2 (empty = ferry
// round-trip ÷ 2). Greedy per departure in time order (optimal per departure given prior commitments;
// fleet is tiny). Pilots/call-in/auto-apply come next.
function _schedLoadedLeg(ac){var r=_schedRtCost(ac);return r==null?null:r/2;}
function _schedEmptyLeg(ac){var f=_schedFerryCost(ac);if(f!=null)return f/2;var r=_schedRtCost(ac);return r==null?null:r/2;}
// Passenger demand per departure time for a date (Milford scenic; skips flyback/cancel/no-show).
function _schedDayDepartures(date){
  if(date!==S.rezdyDate)return [];                 // bookings are only loaded for the current date
  var bks=S._rezdyBookings||[];var g={};
  bks.forEach(function(b){
    if((typeof _rzIsCancelled==='function')&&_rzIsCancelled(b))return;
    var o=String(b.orderNumber||'');if((typeof _rzIsNoShow==='function')&&_rzIsNoShow(o))return;
    (b.items||[]).forEach(function(it){
      var t=(typeof _rzDepTime==='function')?_rzDepTime(it.startTimeLocal||''):'';if(!t)return;
      var start=(typeof _rzHHMMcolon==='function')?_rzHHMMcolon(t):t;
      var prod=(typeof _rzProduct==='function')?_rzProduct(it.product):'';
      if((typeof _rzIsFlyback==='function')&&_rzIsFlyback(prod))return;
      g[start]=(g[start]||0)+(parseInt(it.quantity,10)||0);
    });
  });
  return Object.keys(g).map(function(t){return {time:t,pax:g[t]};}).sort(function(a,b){return _schedMinOf(a.time)-_schedMinOf(b.time);});
}
// Min total-incremental-cost subset of candidates covering pax (tie-break: fewer ferries, fewer
// aircraft, priority, less waste). Candidates carry {cap,inc,reused,priority}.
// maxNew caps how many NOT-yet-used aircraft this departure may introduce (for the "if we don't
// call in a pilot" comparison, which limits the day to the crewable aircraft count).
function _schedPlanPick(pax,cand,maxNew){
  var n=cand.length;if(!n)return [];if(maxNew==null)maxNew=Infinity;
  var best=null,partial=null;
  for(var mask=1;mask<(1<<n);mask++){
    var cap=0,inc=0,cnt=0,fer=0,pri=0,nw=0;
    for(var i=0;i<n;i++)if(mask&(1<<i)){var c=cand[i];cap+=c.cap;inc+=c.inc;cnt++;if(c.reused)fer++;if(c.priority)pri++;if(c.isNew)nw++;}
    if(nw>maxNew)continue;
    if(cap>=pax){var sc=[+inc.toFixed(2),fer,cnt,-pri,cap];if(!best||_schedScoreLt(sc,best.score))best={mask:mask,score:sc};}
    else{var sp=[-cap,+inc.toFixed(2),fer];if(!partial||_schedScoreLt(sp,partial.score))partial={mask:mask,score:sp};} // can't cover → carry the most
  }
  var pick=best||partial;if(!pick)return [];
  var sel=[];for(var j=0;j<n;j++)if(pick.mask&(1<<j))sel.push(cand[j]);return sel;
}
var SCHED_BLOCK_MIN=270;   // Milford rotation ~4.5h: an aircraft is back at QN block-minutes after it departs
function _schedNowMin(){var n=new Date();return n.getHours()*60+n.getMinutes();}
function _schedLockMap(){var c=_schedCfg();if(!c.locks||typeof c.locks!=='object')c.locks={};return c.locks;}
// A departure is LOCKED if manually pinned, or (on today) its time has already passed — the
// optimiser leaves it exactly as flown/assigned and only re-plans the rest of the day around it.
function _schedDepLocked(date,time){
  var m=(_schedLockMap()[date]||{})[time];if(m)return true;
  if(date===_resToday()&&_schedMinOf(time)!=null&&_schedMinOf(time)<=_schedNowMin())return true;
  return false;
}
function _schedDepManualLock(date,time){return !!((_schedLockMap()[date]||{})[time]);}
// The aircraft CURRENTLY assigned to a departure's bookings (manual/auto/comments) — used as the
// fixed set for a locked departure.
function _schedDepAssignedAc(date,time){
  if(date!==S.rezdyDate)return [];
  var bks=S._rezdyBookings||[];var seats={};
  bks.forEach(function(b){
    if((typeof _rzIsCancelled==='function')&&_rzIsCancelled(b))return;
    var o=String(b.orderNumber||'');if((typeof _rzIsNoShow==='function')&&_rzIsNoShow(o))return;
    (b.items||[]).forEach(function(it){
      var t=(typeof _rzDepTime==='function')?_rzDepTime(it.startTimeLocal||''):'';if(!t)return;
      var start=(typeof _rzHHMMcolon==='function')?_rzHHMMcolon(t):t;if(start!==time)return;
      var prod=(typeof _rzProduct==='function')?_rzProduct(it.product):'';if((typeof _rzIsFlyback==='function')&&_rzIsFlyback(prod))return;
      var ac=(typeof _rzBookingAc==='function')?_rzBookingAc(b,o):null;if(!ac)return;
      seats[ac]=(seats[ac]||0)+(parseInt(it.quantity,10)||0);
    });
  });
  return Object.keys(seats).map(function(ac){return {ac:ac,seats:seats[ac]};});
}
window.schedToggleLock=function(date,time){var lm=_schedLockMap();var d=lm[date]||(lm[date]={});if(d[time])delete d[time];else d[time]=true;if(!Object.keys(d).length)delete lm[date];_schedSave();render();};

function _schedDayPlan(date){
  var deps=_schedDayDepartures(date);
  var freeAt={},everUsed={},plan=[],cost=0,loadedLegs=0,emptyLegs=0;
  deps.forEach(function(d){
    var dm=_schedMinOf(d.time)||0;
    var locked=_schedDepLocked(date,d.time);
    if(locked){
      // Respect the committed aircraft; just position them so the rest of the day plans around it.
      var fixed=_schedDepAssignedAc(date,d.time);var ldAc=[],ldCap=0;
      fixed.forEach(function(a){var ll=_schedLoadedLeg(a.ac),el=_schedEmptyLeg(a.ac);var out=(freeAt[a.ac]!=null&&freeAt[a.ac]>dm);
        var cap=_schedNum(_schedTail(a.ac).cap)||0;ldCap+=cap;everUsed[a.ac]=true;freeAt[a.ac]=dm+SCHED_BLOCK_MIN;
        if(ll!=null){loadedLegs+=2;cost+=2*ll;if(out){emptyLegs+=2;cost+=2*el;}}
        ldAc.push({ac:a.ac,cap:cap,reused:out});});
      plan.push({time:d.time,pax:d.pax,aircraft:ldAc,cap:ldCap,short:ldCap<d.pax,locked:true,manualLock:_schedDepManualLock(date,d.time)});
      return;
    }
    var fleet=_schedFleetFor(date,d.time);
    // An aircraft needs a FERRY only if it's still airborne from an earlier load at this departure
    // time (freeAt > now). One that never flew, or already returned to base, is free (fresh rotation).
    var cand=fleet.map(function(f){var ll=_schedLoadedLeg(f.ac),el=_schedEmptyLeg(f.ac);
      var out=(freeAt[f.ac]!=null&&freeAt[f.ac]>dm);
      return {ac:f.ac,cap:f.cap,priority:f.priority,airvan:f.airvan,reused:out,ll:ll,el:el,inc:2*ll+(out?2*el:0)};});
    var chosen=_schedPlanPick(d.pax,cand);
    var depAc=[];var depCap=0;
    chosen.forEach(function(c){everUsed[c.ac]=true;freeAt[c.ac]=dm+SCHED_BLOCK_MIN;depCap+=c.cap;depAc.push({ac:c.ac,cap:c.cap,reused:c.reused});
      loadedLegs+=2;cost+=2*c.ll;if(c.reused){emptyLegs+=2;cost+=2*c.el;}});
    plan.push({time:d.time,pax:d.pax,aircraft:depAc,cap:depCap,short:depCap<d.pax,locked:false,manualLock:_schedDepManualLock(date,d.time)});
  });
  var acUsed=Object.keys(everUsed);
  return {date:date,departures:plan,cost:Math.round(cost),loadedLegs:loadedLegs,emptyLegs:emptyLegs,aircraftUsed:acUsed,pilotsNeeded:acUsed.length};
}
