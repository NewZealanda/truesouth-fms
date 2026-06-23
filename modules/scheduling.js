// === MODULE: scheduling.js === v25.43 ===
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
function _schedMoney(n){if(n==null||isNaN(n))return '—';return '$'+Number(n).toLocaleString('en-NZ',{maximumFractionDigits:0});}

// ── persistence ──────────────────────────────────────────────────────────────
window.loadScheduling=function(){
  try{var c=(typeof lsGet==='function')&&lsGet('ts_scheduling');if(c&&typeof c==='object')S._schedCfg=c;}catch(e){}
  try{if(!S._bizPlan&&window.loadBusinessPlan){S._bizLoaded=true;window.loadBusinessPlan();}}catch(e){} // costs pull from the Business Plan running costs
  try{if(typeof _schedStartAutoNotify==='function')_schedStartAutoNotify();}catch(e){} // 2pm day-before call-in check
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

  // Pilot priority (drag to reorder) — separate Caravan and Airvan lists; SDB-rated pilots flagged.
  h+='<div class="card" style="margin-top:14px"><div class="st">Pilot priority</div>'+
    '<p style="font-size:12px;color:var(--text3);margin:-4px 0 12px">Drag pilots to set who gets allocated <b>first</b> (top) and <b>last</b> (bottom). The allocator fills aircraft in this order, respecting type ratings. <span style="color:#ef4444;font-weight:700">SDB</span> badge = also rated to fly the leased SDB — only these can crew it.</p>';
  var _col=function(typeKey,label){
    var rows=_schedPilotList(typeKey);var ranks=_schedPilotRanks(typeKey);var tie=(_schedCfg().pilotTie||{})[typeKey]||{};
    var inner='<div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700;margin-bottom:6px">'+label+'</div>';
    if(!rows.length)inner+='<div style="font-size:12px;color:var(--text3)">No rated pilots (set endorsements in Crew, or open the Roster once).</div>';
    inner+='<div ondragover="event.preventDefault()" ondrop="window.schedPilotDrop(\''+typeKey+'\',\'\')" style="display:flex;flex-direction:column;gap:5px;min-height:30px">';
    rows.forEach(function(p,i){
      var tier=ranks[p.code];var tied=(i>0&&tie[p.code]);
      var tieBtn=(i>0)?('<button onclick="event.stopPropagation();window.schedPilotTie(\''+typeKey+'\',\''+_schedEsc(p.code)+'\')" title="'+(tied?'Even priority with the one above — click to separate':'Make even priority with the one above')+'" style="font-size:11px;font-weight:800;padding:1px 7px;border-radius:9px;cursor:pointer;border:1px solid '+(tied?'#22c55e':'var(--border2)')+';background:'+(tied?'rgba(34,197,94,.14)':'transparent')+';color:'+(tied?'#22c55e':'var(--text3)')+'">=</button>'):'';
      inner+='<div draggable="true" ondragstart="window.schedPilotDragStart(\''+typeKey+'\',\''+_schedEsc(p.code)+'\',event)" ondragover="event.preventDefault()" ondrop="event.stopPropagation();window.schedPilotDrop(\''+typeKey+'\',\''+_schedEsc(p.code)+'\')" '+
        'style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;border:1px solid '+(tied?'rgba(34,197,94,.4)':'var(--border2)')+';background:var(--card2,rgba(0,0,0,.04));cursor:grab'+(tied?';margin-left:14px':'')+'">'+
        '<span title="Priority tier" style="font-size:11px;color:var(--text3);font-weight:700;width:18px">'+(tier+1)+'</span>'+
        '<span style="font-size:13px;font-weight:800;color:#60a5fa">'+_schedEsc(p.code)+'</span>'+
        '<span style="font-size:12px;color:var(--text2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_schedEsc(p.name||'')+'</span>'+
        (p.sdb?'<span title="Rated to fly SDB" style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:5px;background:rgba(239,68,68,.14);border:1px solid #ef4444;color:#ef4444">SDB</span>':'')+
        tieBtn+
        '<span style="color:var(--text3);font-size:13px">⋮⋮</span>'+
      '</div>';
    });
    inner+='</div><div style="font-size:10px;color:var(--text3);margin-top:5px">Same tier number = even priority. The <b>=</b> button ties a pilot with the one above; drag to reorder.</div>';
    return '<div style="flex:1;min-width:220px">'+inner+'</div>';
  };
  h+='<div style="display:flex;gap:16px;flex-wrap:wrap">'+_col('c208','Caravan (C208B) pilots')+_col('ga8','Airvan (GA8) pilots')+'</div>';
  h+='</div>';
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
// Bookings available to the planner for a date: live set for the current Operations date, else the
// per-date cache fetched when a resource day is picked (null = not loaded yet).
function _schedBookingsFor(date){
  if(date===S.rezdyDate)return S._rezdyBookings||[];
  var c=(S._schedBkCache||{})[date];return Array.isArray(c)?c:null;
}
function _schedFetchDayBookings(date){
  if(date===S.rezdyDate||typeof sbF!=='function')return;
  S._schedBkCache=S._schedBkCache||{};S._schedBkLoading=S._schedBkLoading||{};
  if(Array.isArray(S._schedBkCache[date])||S._schedBkLoading[date])return;   // cached or in flight
  S._schedBkLoading[date]=true;
  sbF('ts_rezdy_bookings','&tour_date=eq.'+encodeURIComponent(date)).then(function(rows){
    S._schedBkCache[date]=(typeof _rzMapBookings==='function')?(_rzMapBookings(rows,date)||[]):(rows||[]);
    S._schedBkLoading[date]=false;if(typeof safeRender==='function')safeRender();else render();
  }).catch(function(){S._schedBkLoading[date]=false;S._schedBkCache[date]=[];if(typeof render==='function')render();});
}
window.resPickDay=function(date){S._resDay=date;S._resMonth=String(date).slice(0,7);_schedFetchDayBookings(date);render();};
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
  if(typeof hasRolePerm==='function'&&!hasRolePerm('resources'))return '<div class="page"><div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div></div>';
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
      '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700;margin-bottom:6px">Today\'s plan <span style="font-weight:400;text-transform:none;letter-spacing:0">· auto-applied (aircraft + pilots)</span></div>';
    if(!dp.departures.length){
      var _ld=(S._schedBkLoading||{})[sel]&&!Array.isArray((S._schedBkCache||{})[sel]);
      h+='<div style="font-size:12px;color:var(--text3)">'+(_ld?'Loading bookings for this day…':'No departures for this day.')+'</div>';
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
      var ci=_schedCallInAnalysis(sel);
      h+='<div style="font-size:12px;color:var(--text2);margin-top:6px;display:flex;gap:14px;flex-wrap:wrap">'+
        '<span>Est. cost <b style="color:var(--text1)">'+_schedMoney(dp.cost)+'</b> ex GST</span>'+
        '<span>Aircraft <b style="color:var(--text1)">'+dp.aircraftUsed.length+'</b></span>'+
        '<span>Pilots need <b style="color:'+(ci.callIn?'#ef4444':'var(--text1)')+'">'+dp.pilotsNeeded+'</b> · have <b style="color:var(--text1)">'+ci.pilotsAvail+'</b></span>'+
        (dp.emptyLegs?('<span style="color:#f59e0b">'+ferries+' reposition leg'+(ferries===1?'':'s')+'</span>'):'<span style="color:#22c55e">no ferries</span>')+'</div>';
      if(ci.callIn){
        var savTxt=(ci.saving>0)?('Calling in saves ~<b>'+_schedMoney(ci.saving)+'</b> vs running short.'):((ci.cappedPaxShort>0)?('Without it you can\'t carry <b>'+ci.cappedPaxShort+'</b> pax.'):'Weigh it against running short.');
        h+='<div style="margin-top:8px;padding:9px 11px;border-radius:9px;background:rgba(245,158,11,.12);border:1px solid #f59e0b;font-size:12px;color:var(--text1)">'+
          '<b style="color:#f59e0b">⚠ Call-in decision</b> — short <b>'+ci.shortfall+'</b> pilot'+(ci.shortfall===1?'':'s')+'. Call-in ≈ <b>'+_schedMoney(ci.callInCost)+'</b>. '+savTxt+
          (ci.sdbUncrewed?'<div style="margin-top:4px;color:#ef4444;font-weight:700">⚠ SDB has no qualified pilot available — it can\'t fly unless someone SDB-rated is added.</div>':'')+
          '<div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span style="color:var(--text3)">Add a pilot below to override, or</span>'+
            '<button onclick="window.schedNotifyCallIn(\''+sel+'\')" style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:9px;cursor:pointer;border:1px solid #f59e0b;background:transparent;color:#f59e0b">📣 Notify management</button></div>'+
        '</div>';
      }
      h+='<div style="font-size:10px;color:var(--text3);margin-top:4px">⤳ = aircraft reused on a later departure (needs repositioning).</div>';
    }
    h+='</div>';
  })();

  // Available pilots for the selected day = roster (today) + manual extras/call-ins. Add an extra to
  // override a call-in suggestion (the optimiser then counts it).
  (function(){
    var pilots=_schedDayPilots(sel);
    h+='<div style="border-top:1px solid var(--border2);padding-top:10px;margin-top:6px"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px"><span style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700">Available pilots · '+pilots.length+' (roster + call-ins)</span></div>';
    h+='<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">';
    if(!pilots.length)h+='<span style="font-size:12px;color:var(--text3)">none rostered — add a call-in, or check the Roster</span>';
    pilots.forEach(function(p){var col=p.extra?'#22c55e':'#60a5fa';
      var rm=p.extra?(' <span onclick="event.stopPropagation();window.schedRemovePilot(\''+sel+'\',\''+_schedEsc(p.code)+'\')" title="Remove" style="cursor:pointer;opacity:.7;margin-left:1px">✕</span>'):'';
      h+='<span title="'+_schedEsc(p.name)+(p.extra?' · call-in':' · rostered')+'" style="font-size:12px;font-weight:800;color:'+col+';padding:4px 10px;border-radius:14px;background:'+(p.extra?'rgba(34,197,94,.14)':'rgba(96,165,250,.14)')+';border:1px solid '+(p.extra?'rgba(34,197,94,.5)':'rgba(96,165,250,.5)')+'">'+(p.extra?'➕ ':'✈ ')+_schedEsc(p.code)+rm+'</span>';});
    var all=_schedAllPilots().filter(function(x){return !pilots.some(function(p){return p.code===x.code;});});
    if(all.length)h+='<select onchange="if(this.value){window.schedAddPilot(\''+sel+'\',this.value);}" style="font-size:12px;padding:4px 8px;border-radius:10px;border:1px dashed var(--border2);background:transparent;color:var(--text2)"><option value="">+ add call-in…</option>'+all.map(function(x){return '<option value="'+_schedEsc(x.code)+'">'+_schedEsc(x.code+(x.name?(' — '+x.name):''))+'</option>';}).join('')+'</select>';
    h+='</div><div style="font-size:10px;color:var(--text3);margin-top:4px">➕ = extra/called-in pilot you\'ve added for this day — counted by the optimiser, overriding the call-in suggestion.</div></div>';
  })();
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
  try{parts.push('P:'+_schedDayPilots(date).map(function(p){return p.code;}).join(','));}catch(e){}   // roster + call-ins
  try{var c=_schedCfg();parts.push('T:'+JSON.stringify(c.pilotOrder||{})+JSON.stringify(c.pilotTie||{}));}catch(e){}
  try{parts.push('MP:'+JSON.stringify(S._schedPilots||{}));}catch(e){}   // manual pilot picks
  return parts.join('|');
}
// The pilot a user has MANUALLY picked for an aircraft on the calendar (any of its blocks), or null.
function _schedManualPilotForAc(ac){var sp=S._schedPilots||{};var pre=ac+'|',found=null;Object.keys(sp).forEach(function(k){if(!found&&k.indexOf(pre)===0&&sp[k])found=sp[k];});return found;}
// Sticky auto pilot→aircraft assignment for the day: keep last time's pilots where still valid, only
// (re)assign the rest. Manual picks win and are never overridden; their pilot is reserved.
function _schedComputeAutoPilots(date,aircraftUsed){
  if(!_schedEnabled())return {};
  var avail=_schedDayPilots(date);
  var manualTaken={};aircraftUsed.forEach(function(ac){var m=_schedManualPilotForAc(ac);if(m)manualTaken[m]=true;});
  var prev=(S._schedAutoPilotsDate===date)?(S._schedAutoPilots||{}):{};
  var out={},used={};
  aircraftUsed.forEach(function(ac){
    if(_schedManualPilotForAc(ac))return;                        // manual handles this aircraft
    var p=prev[ac];
    if(p&&!used[p]&&!manualTaken[p]&&_schedPilotRates(p,ac)&&avail.some(function(x){return x.code===p;})){out[ac]=p;used[p]=true;}
  });
  var need=aircraftUsed.filter(function(ac){return !_schedManualPilotForAc(ac)&&!out[ac];});
  var free=avail.filter(function(x){return !used[x.code]&&!manualTaken[x.code];});
  var m=_schedAssignPilots(need,free);
  Object.keys(m.byAc).forEach(function(ac){out[ac]=m.byAc[ac];});
  return out;
}
// The auto-assigned pilot for an aircraft on the current day (null when off / different date).
function _schedAutoPilotFor(ac){if(!_schedEnabled()||S._schedAutoPilotsDate!==S.rezdyDate)return null;return (S._schedAutoPilots||{})[ac]||null;}
// Live order→aircraft map (memoised). The per-departure aircraft SETS come from the whole-day
// optimiser (_schedDayPlan — idle-first, ferry-aware, lock-aware); bookings are then packed into
// each departure's set. Locked departures are left as committed. Skips cancelled/no-show + flybacks.
// A re-entry guard prevents recursion (the plan reads _rzBookingAc for locked departures).
function _schedEnsureAuto(){
  if(!_schedEnabled()){if(S._schedAutoAc&&Object.keys(S._schedAutoAc).length)S._schedAutoAc={};S._schedAutoKey='';return;}
  if(S._schedAutoBusy)return;                       // re-entry from the plan's locked-dep lookup
  var date=S.rezdyDate;var bks=S._rezdyBookings||[];
  var sig=_schedSig(date,bks);
  if(S._schedAutoKey===sig&&S._schedAutoAc)return;
  S._schedAutoBusy=true;
  try{
    // bookings per departure time (orders → seats)
    var byTime={};
    bks.forEach(function(b){
      if((typeof _rzIsCancelled==='function')&&_rzIsCancelled(b))return;
      var o=String(b.orderNumber||'');if((typeof _rzIsNoShow==='function')&&_rzIsNoShow(o))return;
      (b.items||[]).forEach(function(it){
        var t=(typeof _rzDepTime==='function')?_rzDepTime(it.startTimeLocal||''):'';if(!t)return;
        var start=(typeof _rzHHMMcolon==='function')?_rzHHMMcolon(t):t;
        var prod=(typeof _rzProduct==='function')?_rzProduct(it.product):'';
        if((typeof _rzIsFlyback==='function')&&_rzIsFlyback(prod))return;
        var g=byTime[start]||(byTime[start]={});g[o]=(g[o]||0)+(parseInt(it.quantity,10)||0);
      });
    });
    var dp=_schedDayPlan(date);
    var map={};
    dp.departures.forEach(function(d){
      if(d.locked)return;                            // committed — keep current assignment
      var orders=byTime[d.time]||{};
      var groupsArr=Object.keys(orders).map(function(o){return {order:o,size:orders[o]};});
      if(!groupsArr.length||!d.aircraft.length)return;
      var chosen=d.aircraft.map(function(a){return {ac:a.ac,cap:a.cap,priority:_schedIsPriority(a.ac)};});
      var packed=_schedPack(groupsArr,chosen);
      Object.keys(packed).forEach(function(o){map[o]=packed[o];});
    });
    S._schedAutoAc=map;S._schedAutoKey=sig;
    S._schedAutoPilots=_schedComputeAutoPilots(date,dp.aircraftUsed);S._schedAutoPilotsDate=date;  // sticky auto pilots
  }finally{S._schedAutoBusy=false;}
}
// ── Auto-allocate pilots (one-shot, overridable) ───────────────────────────────
// Writes a type-rated pilot onto each of the day's calendar blocks (ac|time|prod) from the plan's
// pilot↔aircraft match. It writes into the SAME store the manual calendar pickers use, so the
// operator can override any pilot afterwards. One press = apply; not a live overlay.
window.schedAutoPilots=function(){
  if(!_schedEnabled())return;
  var date=S.rezdyDate;var dp=_schedDayPlan(date);
  var match=_schedAssignPilots(dp.aircraftUsed,_schedDayPilots(date));
  S._schedPilots=S._schedPilots||{};var bks=S._rezdyBookings||[];var keys={};
  bks.forEach(function(b){
    if((typeof _rzIsCancelled==='function')&&_rzIsCancelled(b))return;
    var o=String(b.orderNumber||'');if((typeof _rzIsNoShow==='function')&&_rzIsNoShow(o))return;
    (b.items||[]).forEach(function(it){
      var t=(typeof _rzDepTime==='function')?_rzDepTime(it.startTimeLocal||''):'';if(!t)return;
      var start=(typeof _rzHHMMcolon==='function')?_rzHHMMcolon(t):t;
      var prod=(typeof _rzProduct==='function')?_rzProduct(it.product):'';if((typeof _rzIsFlyback==='function')&&_rzIsFlyback(prod))return;
      var ac=(typeof _rzBookingAc==='function')?_rzBookingAc(b,o):null;if(!ac)return;
      var pc=match.byAc[ac];if(pc)keys[(typeof _rzDepKey==='function')?_rzDepKey(ac,start,prod):(ac+'|'+start+'|'+prod)]=pc;
    });
  });
  var n=0;Object.keys(keys).forEach(function(k){S._schedPilots[k]=keys[k];n++;});
  if(window.pickupSave)window.pickupSave(true);
  if(typeof _rzSchedBroadcast==='function')_rzSchedBroadcast();
  if(typeof toast==='function')toast(n?('Pilots auto-allocated to '+n+' block'+(n===1?'':'s')+' — edit any on the calendar'):'No blocks to allocate','ok');
  render();
};
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
  var bks=_schedBookingsFor(date);if(!bks)return [];   // not loaded yet (fetch triggered on day-pick)
  var g={},dests={};
  bks.forEach(function(b){
    if((typeof _rzIsCancelled==='function')&&_rzIsCancelled(b))return;
    var o=String(b.orderNumber||'');if((typeof _rzIsNoShow==='function')&&_rzIsNoShow(o))return;
    (b.items||[]).forEach(function(it){
      var t=(typeof _rzDepTime==='function')?_rzDepTime(it.startTimeLocal||''):'';if(!t)return;
      var start=(typeof _rzHHMMcolon==='function')?_rzHHMMcolon(t):t;
      var prod=(typeof _rzProduct==='function')?_rzProduct(it.product):'';
      if((typeof _rzIsFlyback==='function')&&_rzIsFlyback(prod))return;
      g[start]=(g[start]||0)+(parseInt(it.quantity,10)||0);
      var dst=(typeof _rzGroupDest==='function')?_rzGroupDest(prod):'MF';(dests[start]||(dests[start]={}))[dst]=1;
    });
  });
  return Object.keys(g).map(function(t){return {time:t,pax:g[t],dests:Object.keys(dests[t]||{})};}).sort(function(a,b){return _schedMinOf(a.time)-_schedMinOf(b.time);});
}
// Flight hours for a return to a destination, by type. Milford 1.2/1.1; Mt Cook 2.1/1.8; Franz 2.2/1.9.
var SCHED_DEST_HRS={MF:{airvan:1.2,caravan:1.1},MC:{airvan:2.1,caravan:1.8},FJ:{airvan:2.2,caravan:1.9}};
function _schedDestFltHrs(dest,airvan){var d=SCHED_DEST_HRS[dest]||SCHED_DEST_HRS.MF;return airvan?d.airvan:d.caravan;}
// A departure's flight hours for an aircraft type = the longest of its destinations (worst case).
function _schedDepFltHrs(dests,airvan){var mx=0;(dests&&dests.length?dests:['MF']).forEach(function(dd){mx=Math.max(mx,_schedDestFltHrs(dd,airvan));});return mx||(airvan?1.2:1.1);}
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
  var bks=_schedBookingsFor(date);if(!bks)return [];
  var seats={};
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

function _schedDayPlan(date,opts){
  opts=opts||{};var maxAc=(opts.maxAircraft!=null)?opts.maxAircraft:Infinity;
  var deps=_schedDayDepartures(date);
  var freeAt={},everUsed={},plan=[],cost=0,loadedLegs=0,emptyLegs=0,paxShort=0;
  // Projected hours-to-the-next-check per aircraft, decremented as the day's flights are assigned.
  // An aircraft is only eligible for a departure if the flight would still leave the 0.5h ferry
  // reserve (runLeft − flightHrs ≥ floor). e.g. airvan at −3.2 can do a 1.2h Milford (→ −4.4 ≥ −4.5).
  var runLeft={};Object.keys((S&&S.aircraft)||{}).forEach(function(ac){runLeft[ac]=(typeof _rzMaintRunHrs==='function')?_rzMaintRunHrs(ac):null;});
  var _mxFloor=function(ac){return (typeof _rzMaintFloor==='function')?_rzMaintFloor(ac):(_schedIsAirvan(ac)?-4.5:-9.5);};
  var _mxFits=function(ac,fh){return runLeft[ac]==null||(runLeft[ac]-fh)>=_mxFloor(ac);};   // fh = this departure's flight hours
  var _mxUse=function(ac,fh){if(runLeft[ac]!=null)runLeft[ac]-=fh;};
  deps.forEach(function(d){
    var dm=_schedMinOf(d.time)||0;
    var locked=_schedDepLocked(date,d.time);
    if(locked){
      // Respect the committed aircraft; just position them so the rest of the day plans around it.
      var fixed=_schedDepAssignedAc(date,d.time);var ldAc=[],ldCap=0;
      fixed.forEach(function(a){var ll=_schedLoadedLeg(a.ac),el=_schedEmptyLeg(a.ac);var out=(freeAt[a.ac]!=null&&freeAt[a.ac]>dm);
        var cap=_schedNum(_schedTail(a.ac).cap)||_schedDefaultCap(a.ac);ldCap+=cap;everUsed[a.ac]=true;freeAt[a.ac]=dm+SCHED_BLOCK_MIN;_mxUse(a.ac,_schedDepFltHrs(d.dests,_schedIsAirvan(a.ac)));
        if(ll!=null){loadedLegs+=2;cost+=2*ll;if(out){emptyLegs+=2;cost+=2*el;}}
        ldAc.push({ac:a.ac,cap:cap,reused:out});});
      if(ldCap<d.pax)paxShort+=(d.pax-ldCap);
      plan.push({time:d.time,pax:d.pax,aircraft:ldAc,cap:ldCap,short:ldCap<d.pax,locked:true,manualLock:_schedDepManualLock(date,d.time)});
      return;
    }
    var fleet=_schedFleetFor(date,d.time).filter(function(f){return _mxFits(f.ac,_schedDepFltHrs(d.dests,f.airvan));});   // drop aircraft that can't fit this flight before maintenance
    var maxNew=maxAc-Object.keys(everUsed).length;if(maxNew<0)maxNew=0;
    // An aircraft needs a FERRY only if it's still airborne from an earlier load at this departure
    // time (freeAt > now). One that never flew, or already returned to base, is free (fresh rotation).
    var cand=fleet.map(function(f){var ll=_schedLoadedLeg(f.ac),el=_schedEmptyLeg(f.ac);
      var out=(freeAt[f.ac]!=null&&freeAt[f.ac]>dm);
      return {ac:f.ac,cap:f.cap,priority:f.priority,airvan:f.airvan,reused:out,isNew:!everUsed[f.ac],ll:ll,el:el,inc:2*ll+(out?2*el:0)};});
    var chosen=_schedPlanPick(d.pax,cand,maxNew);
    var depAc=[];var depCap=0;
    chosen.forEach(function(c){everUsed[c.ac]=true;freeAt[c.ac]=dm+SCHED_BLOCK_MIN;_mxUse(c.ac,_schedDepFltHrs(d.dests,c.airvan));depCap+=c.cap;depAc.push({ac:c.ac,cap:c.cap,reused:c.reused});
      loadedLegs+=2;cost+=2*c.ll;if(c.reused){emptyLegs+=2;cost+=2*c.el;}});
    if(depCap<d.pax)paxShort+=(d.pax-depCap);
    plan.push({time:d.time,pax:d.pax,aircraft:depAc,cap:depCap,short:depCap<d.pax,locked:false,manualLock:_schedDepManualLock(date,d.time)});
  });
  var acUsed=Object.keys(everUsed);
  return {date:date,departures:plan,cost:Math.round(cost),loadedLegs:loadedLegs,emptyLegs:emptyLegs,paxShort:paxShort,aircraftUsed:acUsed,pilotsNeeded:acUsed.length};
}

// ── Pilots (roster + manual call-in/override extras) ───────────────────────────
function _schedExtraMap(){var c=_schedCfg();if(!c.extraPilots||typeof c.extraPilots!=='object')c.extraPilots={};return c.extraPilots;}
function _schedDayExtras(date){var a=_schedExtraMap()[date];return Array.isArray(a)?a:[];}
window.schedAddPilot=function(date,code){if(!code)return;var m=_schedExtraMap();var a=m[date]||(m[date]=[]);if(a.indexOf(code)<0)a.push(code);_schedSave();render();};
window.schedRemovePilot=function(date,code){var m=_schedExtraMap();var a=m[date];if(!a)return;var i=a.indexOf(code);if(i>=0)a.splice(i,1);if(!a.length)delete m[date];_schedSave();render();};
function _schedAllPilots(){try{return (typeof _rzAvailablePilots==='function')?(_rzAvailablePilots()||[]):[];}catch(e){return [];}}
// Available pilots for ANY date = rostered that day (roster is date-addressable) + manual extras/call-ins.
function _schedDayPilots(date){
  var out=[],seen={};
  var rost=[];try{rost=(typeof _rzAvailablePilots==='function')?(_rzAvailablePilots(date)||[]):[];}catch(e){}
  rost.forEach(function(p){if(p.rostered&&!seen[p.code]){seen[p.code]=1;out.push({code:p.code,name:p.name,extra:false});}});
  _schedDayExtras(date).forEach(function(code){if(!seen[code]){seen[code]=1;var pp=rost.find(function(x){return x.code===code;});out.push({code:code,name:(pp&&pp.name)||code,extra:true});}});
  return out;
}
function _schedPilotRates(code,ac){var en=(typeof _rzPilotEndorse==='function')?_rzPilotEndorse(code):null;return !en||!en.length||en.indexOf(ac)>=0;}
// What a pilot can actually fly, from their ENDORSEMENTS — only counts known aircraft tails (a stray
// non-aircraft endorsement no longer makes someone "caravan-rated"). No endorsement → flies nothing
// here, so unrated pilots don't appear in the type lists.
function _schedPilotCan(code){
  var en=(typeof _rzPilotEndorse==='function')?(_rzPilotEndorse(code)||[]):[];
  var a=false,c=false,s=false;
  en.forEach(function(t){var sp=(typeof _acSpec==='function')?_acSpec(t):((S.aircraft||{})[t]);if(!sp)return;if(sp.layout==='ga8')a=true;else c=true;if(_schedIsSDB(t))s=true;});
  return {airvan:a,caravan:c,sdb:s};
}
// Priority TIERS per type: pilots in the same tier share a rank ("even priority"). cfg.pilotTie[type]
// marks a pilot as tied with the one above it in the order; a new tier starts otherwise.
function _schedPilotRanks(typeKey){
  var order=_schedPilotList(typeKey).map(function(p){return p.code;});
  var tie=(_schedCfg().pilotTie||{})[typeKey]||{};
  var ranks={},tier=-1;
  order.forEach(function(c,i){if(i===0||!tie[c])tier++;ranks[c]=tier;});
  return ranks;
}
// Allocation priority for a pilot on an aircraft's type (lower = earlier; equal = even).
function _schedPilotRank(code,ac){var r=_schedPilotRanks(_schedIsAirvan(ac)?'ga8':'c208');return (r[code]!=null)?r[code]:9999;}
window.schedPilotTie=function(typeKey,code){var cfg=_schedCfg();cfg.pilotTie=cfg.pilotTie||{};var t=cfg.pilotTie[typeKey]||(cfg.pilotTie[typeKey]={});if(t[code])delete t[code];else t[code]=true;_schedSave();render();};
// Rated pilots for a type ('c208'|'ga8'), ordered by the saved priority then name; flags SDB-rated.
function _schedPilotList(typeKey){
  var want=(typeKey==='ga8')?'airvan':'caravan';
  var list=_schedAllPilots().filter(function(p){return _schedPilotCan(p.code)[want];}).map(function(p){return {code:p.code,name:p.name,sdb:_schedPilotCan(p.code).sdb};});
  var order=(_schedCfg().pilotOrder||{})[typeKey]||[];
  list.sort(function(a,b){var ia=order.indexOf(a.code),ib=order.indexOf(b.code);ia=ia<0?9999:ia;ib=ib<0?9999:ib;if(ia!==ib)return ia-ib;return String(a.name||a.code).localeCompare(String(b.name||b.code));});
  return list;
}
// Greedy match the plan's distinct aircraft to available pilots by endorsement; honours the priority
// order, conserves flexible pilots (most-constrained aircraft — e.g. SDB — assigned first). Returns
// the shortfall + which uncrewed aircraft are SDB (so we can flag the worst case).
function _schedAssignPilots(acList,pilots){
  var avail=pilots.slice(),byAc={},shortfall=0;
  var acs=acList.slice().sort(function(a,b){return avail.filter(function(p){return _schedPilotRates(p.code,a);}).length-avail.filter(function(p){return _schedPilotRates(p.code,b);}).length;});
  acs.forEach(function(ac){
    var cands=avail.filter(function(p){return _schedPilotRates(p.code,ac);});
    if(!cands.length){shortfall++;return;}
    cands.sort(function(p,q){
      var rp=_schedPilotRank(p.code,ac),rq=_schedPilotRank(q.code,ac);if(rp!==rq)return rp-rq;       // priority order first
      var cp=acList.filter(function(x){return _schedPilotRates(p.code,x);}).length,cq=acList.filter(function(x){return _schedPilotRates(q.code,x);}).length;
      if(cp!==cq)return cp-cq;                                                                          // then conserve flexible pilots
      return String(p.code).localeCompare(String(q.code));
    });
    byAc[ac]=cands[0].code;avail=avail.filter(function(p){return p.code!==cands[0].code;});
  });
  var sdbUncrewed=acList.some(function(a){return _schedIsSDB(a)&&!byAc[a];});
  return {byAc:byAc,shortfall:shortfall,sdbUncrewed:sdbUncrewed};
}
// Drag-to-reorder the per-type pilot priority list.
window.schedPilotDragStart=function(typeKey,code,e){S._schedPDrag={t:typeKey,c:code};try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',code);}catch(_){}};
window.schedPilotDrop=function(typeKey,targetCode){
  var d=S._schedPDrag;S._schedPDrag=null;if(!d||d.t!==typeKey||d.c===targetCode)return;
  var order=_schedPilotList(typeKey).map(function(p){return p.code;});      // current display order
  var from=order.indexOf(d.c);if(from<0)return;order.splice(from,1);
  var to=targetCode?order.indexOf(targetCode):order.length;if(to<0)to=order.length;
  order.splice(to,0,d.c);
  var cfg=_schedCfg();cfg.pilotOrder=cfg.pilotOrder||{};cfg.pilotOrder[typeKey]=order;_schedSave();render();
};
// Call-in decision: cheapest plan (unlimited) vs pilots available. If short, compare against the
// best plan capped at the crewable aircraft count and the call-in cost.
function _schedCallInAnalysis(date){
  var plan=_schedDayPlan(date);
  var pilots=_schedDayPilots(date);
  var match=_schedAssignPilots(plan.aircraftUsed,pilots);
  var ci=_schedCallIn()||0;
  var res={plan:plan,pilotsAvail:pilots.length,pilotsNeed:plan.pilotsNeeded,shortfall:match.shortfall,callIn:match.shortfall>0,callInCost:match.shortfall*ci,sdbUncrewed:match.sdbUncrewed};
  if(match.shortfall>0){
    var capped=_schedDayPlan(date,{maxAircraft:pilots.length});
    res.cappedCost=capped.cost;res.cappedPaxShort=capped.paxShort;
    res.saving=capped.cost-(plan.cost+match.shortfall*ci);   // >0 → calling in is cheaper overall
  }
  return res;
}
// Notify management (admin / superadmin / cx_manager) that a call-in may be worth it for a date.
// `pre` = a precomputed analysis (used by the 2pm auto-check, which evaluates a non-current date).
window.schedNotifyCallIn=async function(date,pre){
  try{
    var a=pre||_schedCallInAnalysis(date);if(!a.callIn){if(typeof toast==='function')toast('No call-in needed for '+date,'info');return;}
    var msg='🧑‍✈️ '+date+': roster short by '+a.shortfall+' pilot'+(a.shortfall===1?'':'s')+'. Call-in ≈ '+_schedMoney(a.callInCost)+
      (a.saving>0?(' — saves ~'+_schedMoney(a.saving)+' vs running short'):(a.cappedPaxShort>0?(' — without it you cannot carry '+a.cappedPaxShort+' pax'):''))+'. Open Resources to add a pilot or decline.';
    var me=(S.user&&S.user.id)||null,seen={},recips=[];
    (S.users||[]).forEach(function(u){if(!u||u.inactive||!u.id||u.id===me||seen[u.id])return;var role=String(u.role||'').toLowerCase();if(role==='admin'||role==='superadmin'||role==='cx_manager'){seen[u.id]=1;recips.push(u);}});
    if(!recips.length){if(typeof toast==='function')toast('No managers to notify','warn');return;}
    var now=new Date().toISOString();
    var rows=recips.map(function(u){return {user_id:u.id,type:'scheduling',reference_id:null,message:msg,read:false,created_at:now};});
    if(typeof sbU==='function')await sbU('ts_notifications',rows);
    if(typeof toast==='function')toast('Management notified ('+recips.length+')','ok');
  }catch(e){if(typeof toast==='function')toast('Notify failed','err');}
};

// ── Automatic day-before call-in check (fires from 2pm) ────────────────────────
// From 2pm each day, the first device with the app open checks TOMORROW's plan against the rostered
// pilots; if a call-in would be needed it notifies management — once per target day (cfg.lastCallInNotify).
// (No server cron in this app, so it runs in-app; an ops desk is normally open at 2pm.)
function _schedPad2(n){return (n<10?'0':'')+n;}
async function _schedAutoNotifyTick(){
  try{
    if(!_schedEnabled()||!S.user)return;
    var now=new Date();if(now.getHours()<14)return;                 // 2pm onward
    if(!S._rosterLoaded){try{_rzAvailablePilots();}catch(e){}return;} // need the roster first; try next tick
    var d=new Date(now.getTime()+86400000);                          // tomorrow (local)
    var tomorrow=d.getFullYear()+'-'+_schedPad2(d.getMonth()+1)+'-'+_schedPad2(d.getDate());
    var cfg=_schedCfg();
    if(cfg.lastCallInNotify===tomorrow)return;                       // already handled tomorrow
    if(typeof sbF!=='function')return;
    var rows=await sbF('ts_rezdy_bookings','&tour_date=eq.'+encodeURIComponent(tomorrow));
    var bks=(typeof _rzMapBookings==='function')?(_rzMapBookings(rows,tomorrow)||[]):[];
    // Evaluate tomorrow without disturbing the current view: swap globals, compute, restore.
    var sd=S.rezdyDate,sb=S._rezdyBookings,sk=S._schedAutoKey,sm=S._schedAutoAc,sbsy=S._schedAutoBusy;
    var a=null;
    try{S.rezdyDate=tomorrow;S._rezdyBookings=bks;S._schedAutoBusy=false;S._schedAutoKey='';a=_schedCallInAnalysis(tomorrow);}
    finally{S.rezdyDate=sd;S._rezdyBookings=sb;S._schedAutoKey=sk;S._schedAutoAc=sm;S._schedAutoBusy=sbsy;}
    if(!a)return;                                                    // analysis threw — leave unmarked so a later tick retries
    cfg.lastCallInNotify=tomorrow;_schedSave();                      // mark handled (so it won't re-run all afternoon)
    if(a.callIn&&a.plan&&a.plan.departures.length)await window.schedNotifyCallIn(tomorrow,a);
  }catch(e){}
}
function _schedStartAutoNotify(){if(S._schedNotifyTimer)return;S._schedNotifyTimer=setInterval(_schedAutoNotifyTick,5*60*1000);setTimeout(_schedAutoNotifyTick,8000);}
