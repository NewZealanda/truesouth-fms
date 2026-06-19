// === MODULE: roster.js v2.0 ===

// ── Status config ──
var ROSTER_SC={
  '':         {bg:'transparent',           bd:'rgba(255,255,255,.08)', col:'rgba(255,255,255,.2)',  lbl:'-'},
  c208b:      {bg:'rgba(59,130,246,.18)',   bd:'#3b82f6',               col:'#60a5fa',              lbl:'C208B'},
  ga8:        {bg:'rgba(168,85,247,.18)',   bd:'#a855f7',               col:'#c084fc',              lbl:'GA8'},
  desk:       {bg:'rgba(20,184,166,.18)',   bd:'#14b8a6',               col:'#2dd4bf',              lbl:'Desk'},
  admin_duty: {bg:'rgba(251,191,36,.16)',   bd:'#fbbf24',               col:'#fde047',              lbl:'Admin'},
  called_in:  {bg:'rgba(34,197,94,.25)',    bd:'#22c55e',               col:'#86efac',              lbl:'Called In'},
  half_day:   {bg:'rgba(34,197,94,.25)',    bd:'#22c55e',               col:'#86efac',              lbl:'1/2 Day'},
  gnd:        {bg:'rgba(100,116,139,.18)',  bd:'#64748b',               col:'#94a3b8',              lbl:'GND'},
  mrktg:      {bg:'rgba(236,72,153,.18)',   bd:'#ec4899',               col:'#f472b6',              lbl:'Marketing'},
  off:        {bg:'rgba(100,116,139,.1)',   bd:'rgba(100,116,139,.4)',   col:'#94a3b8',              lbl:'Off'},
  rdo:        {bg:'rgba(148,163,184,.08)',  bd:'rgba(148,163,184,.3)',   col:'#64748b',              lbl:'RDO'},
  leave:      {bg:'rgba(245,158,11,.15)',   bd:'#f59e0b',               col:'#fbbf24',              lbl:'AL'},
  ul:         {bg:'rgba(239,68,68,.12)',    bd:'rgba(239,68,68,.45)',    col:'#fca5a5',              lbl:'UL'},
  sick:       {bg:'rgba(239,68,68,.15)',    bd:'#ef4444',               col:'#f87171',              lbl:'Sick'},
  training:   {bg:'rgba(99,102,241,.16)',   bd:'#818cf8',               col:'#a5b4fc',              lbl:'Training'},
  other:      {bg:'rgba(148,163,184,.08)',  bd:'rgba(148,163,184,.25)', col:'#94a3b8',              lbl:'Other'},
};
var ROSTER_ORDER=['','c208b','ga8','desk','admin_duty','called_in','half_day','gnd','mrktg','rdo','leave','ul','sick','training','other'];
var ROSTER_WORKING=new Set(['c208b','ga8','desk','admin_duty','called_in','half_day','gnd','mrktg']);

// Color helpers
var ROSTER_SC_HEX={
  c208b:'#3b82f6',ga8:'#a855f7',desk:'#14b8a6',admin_duty:'#fbbf24',
  called_in:'#22c55e',half_day:'#22c55e',gnd:'#64748b',mrktg:'#ec4899',
  off:'#64748b',rdo:'#94a3b8',leave:'#f59e0b',ul:'#ef4444',
  sick:'#ef4444',training:'#818cf8',other:'#94a3b8'
};
function _rSC(key){
  var base=ROSTER_SC[key]||ROSTER_SC[''];
  var hex=S.rosterColors&&S.rosterColors[key];
  if(!hex)return base;
  var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  function lc(v){return Math.min(255,v+Math.round((255-v)*0.3));}
  var col='#'+[lc(r),lc(g),lc(b)].map(function(v){return v.toString(16).padStart(2,'0');}).join('');
  return {bg:'rgba('+r+','+g+','+b+',.18)',bd:hex,col:col,lbl:base.lbl};
}
function _rAccent(key){return (S.rosterColors&&S.rosterColors[key])||ROSTER_SC_HEX[key]||'#666666';}


// ── Role groups ──
var ROLE_GROUPS=[
  {key:'pilot',    label:'Pilots',   roles:['pilot'],              col:'#7B9EC6'},
  {key:'desk',     label:'Desk',     roles:['desk','cx_manager'],  col:'#f9a8d4'},
  {key:'admin',    label:'Admin',    roles:['admin','superadmin'], col:'#f59e0b'},
  {key:'ground',   label:'Ground',   roles:['ground_staff'], col:'#a16207'},
  {key:'maint',    label:'Maint',    roles:['maint','maintenance'],col:'#a78bfa'},
  {key:'accounts', label:'Accounts', roles:['accounts'],           col:'#06b6d4'},
  {key:'marketing',label:'Marketing',roles:['marketing'],          col:'#ec4899'},
];
// Which roster group a user belongs to. Anyone marked as a pilot (incl. admins who fly)
// is grouped under Pilots so their aircraft ratings show alongside the other pilots.
function _rGroupKey(u){
  if(!u)return null;
  if(u.role==='pilot'||(typeof _picEligible==='function'&&_picEligible(u)))return 'pilot';
  var g=ROLE_GROUPS.filter(function(g){return g.roles.indexOf(u.role)>=0;})[0];
  return g?g.key:null;
}

// ── Helpers ──
function _rMonday(d){var dd=new Date(d);dd.setHours(0,0,0,0);var dy=dd.getDay();dd.setDate(dd.getDate()+(dy===0?-6:1-dy));return dd;}
function _rThursday(d){var dd=new Date(d);dd.setHours(0,0,0,0);dd.setDate(dd.getDate()-((dd.getDay()+3)%7));return dd;}
function _rIso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _rCode(u){
  // Prefer the crew member's real code (e.g. Lily McLean -> "LL") over name initials.
  var _c=(S.crew||[]).find(function(c){return c.n===u.name||c.n===u.linkedCrew;});
  if(_c&&_c.code)return String(_c.code).toUpperCase();
  return (u.name||'').split(/\s+/).map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2);
}
function _rGetStatus(u,ds,roster){
  var _ini=_rCode(u);
  var _draft=S._rosterDraft||{};
  if(_draft[ds]){
    var _dv=u.id!==undefined&&_draft[ds][u.id]!==undefined?_draft[ds][u.id]:(_ini&&_draft[ds][_ini]!==undefined?_draft[ds][_ini]:undefined);
    if(_dv!==undefined)return _dv;
  }
  var st=(roster[ds]&&(roster[ds][u.id]||roster[ds][_ini]))||'';
  var _lvReq=S._rosterLeave&&S._rosterLeave[ds]&&S._rosterLeave[ds][u.id];
  if(_lvReq){
    // Don't let an approved-leave overlay paint over a rostered day off. If the day was
    // already RDO/off, leave it as-is — RDOs aren't paid leave, and accounts need to see
    // them unchanged even when AL spans them. (Mirrors the _lvStampRoster off-day guard.)
    var _offDay={rdo:1,off:1};
    if(!_offDay[st]){var _lvMap={annual:'leave',sick:'sick',unpaid:'leave',other:'training'};st=_lvMap[_lvReq]||'leave';}
  }
  return st;
}
function _rIni(u){return _rCode(u);}
// Crew sharing a code break the roster/leave-day keying (status is stored per code as
// well as per id). Returns {CODE:[name,...]} for any code held by more than one crew member.
function _dupCrewCodes(){
  var seen={},dupes={};
  (S.crew||[]).forEach(function(c){
    var code=String(c.code||'').trim().toUpperCase();
    if(!code)return;
    if(seen[code]){dupes[code]=dupes[code]||[seen[code]];dupes[code].push(c.n||'?');}
    else seen[code]=c.n||'?';
  });
  return dupes;
}
window._dupCrewCodes=_dupCrewCodes;
// ── Unsaved-roster guard ──
function _rosterUnsaved(){return !!(S._rosterDraft&&Object.keys(S._rosterDraft).length>0);}
// Run `go` immediately unless there are unsaved roster edits — then prompt first.
window._navAway=function(go){
  if(S.section==='roster'&&_rosterUnsaved()){_rosterSavePrompt(go);}
  else if(typeof go==='function'){go();}
};
function _rosterSavePrompt(proceed){
  var ex=document.getElementById('roster-save-ov');if(ex)ex.remove();
  S._rosterPendingNav=proceed||null;
  var ov=document.createElement('div');ov.id='roster-save-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML='<div style="background:var(--card);border:1px solid var(--border2);border-radius:16px;padding:22px;max-width:380px;width:100%;box-shadow:0 12px 44px rgba(0,0,0,.55)">'
    +'<div style="font-size:16px;font-weight:700;color:var(--text1);margin-bottom:8px">Unsaved roster changes</div>'
    +'<div style="font-size:13px;color:var(--text3);margin-bottom:18px;line-height:1.5">You have roster edits that haven\'t been saved. Save them before leaving?</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px">'
    +'<button onclick="window._rosterNavChoose(\'save\')" style="padding:11px;border-radius:10px;border:1.5px solid rgba(34,197,94,.55);background:rgba(34,197,94,.12);color:#4ade80;font-size:14px;font-weight:700;cursor:pointer">💾 Save &amp; continue</button>'
    +'<button onclick="window._rosterNavChoose(\'discard\')" style="padding:11px;border-radius:10px;border:1.5px solid rgba(239,68,68,.5);background:rgba(239,68,68,.12);color:#ef4444;font-size:14px;font-weight:700;cursor:pointer">Discard changes</button>'
    +'<button onclick="window._rosterNavChoose(\'cancel\')" style="padding:11px;border-radius:10px;border:1px solid var(--border2);background:transparent;color:var(--text2);font-size:14px;font-weight:600;cursor:pointer">Cancel</button>'
    +'</div></div>';
  ov.addEventListener('click',function(e){if(e.target===ov)window._rosterNavChoose('cancel');});
  document.body.appendChild(ov);
}
window._rosterNavChoose=async function(c){
  var ov=document.getElementById('roster-save-ov');if(ov)ov.remove();
  var go=S._rosterPendingNav;S._rosterPendingNav=null;
  if(c==='cancel')return;
  // Await the cloud save so navigation/reload can't race ahead and lose the write.
  if(c==='save'){try{if(window.saveRosterToCloud)await window.saveRosterToCloud();}catch(e){}}   // merges draft locally + persists
  else if(c==='discard'){S._rosterDraft={};S._rosterUndoStack=[];}
  if(typeof go==='function')go();
};

// ── Main entry ──
function renderRoster(){
  if(!S._rosterLoaded){
    S._rosterLoaded=true;
    var _loc=lsGet('ts_roster');
    if(_loc&&typeof _loc==='object')S.roster=_loc;
    window.loadRosterFromCloud();
  }
  if(!S._rosterLeaveWeek||S._rosterLeaveWeek!==S.rosterWeek){
    S._rosterLeaveWeek=S.rosterWeek||null;
    window.loadRosterLeave&&window.loadRosterLeave();
  }
  var tab=S.rosterTab||'view';
  var _rRole=S.user&&S.user.role||'desk';
  var _canEditRoster=_rRole==='superadmin'||_rRole==='admin'||hasRolePerm('roster_edit');
  if(tab==='build'&&!_canEditRoster)tab='view'; // build pattern is edit-only
  var h='<div class="card" style="padding:0;overflow:hidden">';
  h+='<div style="display:flex;align-items:center;border-bottom:2px solid var(--border2)">';
  h+=_rTabBtn('📅 Roster','view',tab==='view');
  if(_canEditRoster)h+=_rTabBtn('🔨 Build Pattern','build',tab==='build');
  h+='<div style="flex:1"></div>';
  h+='</div>';
  h+=(tab==='build'?renderRosterBuild():renderRosterView());
  h+='</div>';
  return h;
}

function _rTabBtn(label,id,active){
  return '<button tabindex="-1" onclick="S.rosterTab=\''+id+'\';render()" style="padding:10px 16px;border:none;border-bottom:3px solid '+(active?'#a78bfa':'transparent')+';background:transparent;color:'+(active?'#a78bfa':'var(--text3)')+';font-size:13px;font-weight:'+(active?'700':'500')+';cursor:pointer">'+label+'</button>';
}

// ── Roster View ──
function renderRosterView(){
  var role=S.user&&S.user.role||'desk';
  var isAdminPlus=role==='superadmin'||role==='admin';
  var canEditRoster=isAdminPlus||hasRolePerm('roster_edit'); // view = roster perm; edit = roster_edit perm
  var canEdit=canEditRoster&&!S.rosterLocked;
  var today=new Date();today.setHours(0,0,0,0);
  var todayStr=_rIso(today);
  var MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DNAMES=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  if(!S._rosterHide)S._rosterHide=[];var rHide=S._rosterHide;
  if(!S._rosterColorsLoaded){S._rosterColorsLoaded=true;window.loadRosterColors();}
  var NEVER_SHOW=['maint','accounts'];
  if(!S._rosterGroupHide)S._rosterGroupHide=lsGet('ts_roster_grouphide')||NEVER_SHOW.slice();
  NEVER_SHOW.forEach(function(k){if(S._rosterGroupHide.indexOf(k)===-1)S._rosterGroupHide.push(k);});
  var _rGH=S._rosterGroupHide;

  var _payAllowed=role==='superadmin'||role==='admin'||(typeof hasRolePerm==='function'&&hasRolePerm('pay_week'));
  if(typeof S._rosterPayWeek==='undefined')S._rosterPayWeek=lsGet('ts_roster_payweek')||false;
  var _payWeek=_payAllowed&&!!S._rosterPayWeek;
  // Align the displayed week to the active mode: Mon–Sun normally, Thu–Wed for pay week.
  var _anchor=S.rosterWeek?new Date(S.rosterWeek+'T00:00:00'):new Date(today);
  var weekStart=_payWeek?_rThursday(_anchor):_rMonday(_anchor);
  S.rosterWeek=_rIso(weekStart);
  var days=[];
  for(var _i=0;_i<7;_i++){var _d=new Date(weekStart);_d.setDate(_d.getDate()+_i);days.push(_d);}
  var prevStart=new Date(weekStart);prevStart.setDate(prevStart.getDate()-7);
  var nextStart=new Date(weekStart);nextStart.setDate(nextStart.getDate()+7);
  var d0=days[0],d6=days[6];
  var wkLbl=d0.getDate()+' '+MONTHS[d0.getMonth()]+(d0.getFullYear()!==d6.getFullYear()?' '+d0.getFullYear():'')+' – '+d6.getDate()+' '+MONTHS[d6.getMonth()]+' '+d6.getFullYear();

  var allUsers=(S.users||[]).filter(function(u){return u.id&&u.name&&!u.inactive;});
  var displayUsers=allUsers.filter(function(u){
    var gk=_rGroupKey(u);
    return gk&&_rGH.indexOf(gk)===-1;
  });
  var roleOrder={superadmin:0,admin:1,pilot:2,desk:3,cx_manager:3,accounts:4,marketing:5,maint:6,maintenance:6,ground_staff:7};
  displayUsers=displayUsers.slice().sort(function(a,b){return (roleOrder[a.role]||9)-(roleOrder[b.role]||9)||(a.name||'').localeCompare(b.name||'');});
  var roster=S.roster||{};

  function _dayTots(ds){
    var t={};
    ROLE_GROUPS.forEach(function(g){t[g.key]=0;});
    displayUsers.forEach(function(u){
      var st=_rGetStatus(u,ds,roster);
      var raw=st&&st.indexOf('other:')===0?'other':st;
      if(ROSTER_WORKING.has(raw)){
        var _gk=_rGroupKey(u);if(_gk&&t[_gk]!=null)t[_gk]++;
      }
    });
    return t;
  }

  // ── Toolbar ──
  var h='';
  h+='<div style="padding:10px 14px;border-bottom:1px solid var(--border2);display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--card)">';
  h+='<button tabindex="-1" onclick="window._navAway(function(){S.rosterWeek=\''+_rIso(prevStart)+'\';S._rosterLeaveWeek=null;render()})" style="padding:5px 12px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:13px;cursor:pointer">◁</button>';
  h+='<label onclick="this.querySelector(\'input\').showPicker?this.querySelector(\'input\').showPicker():null" style="display:inline-flex;align-items:center;cursor:pointer;position:relative">';
  h+='<span style="font-size:13px;font-weight:700;color:var(--accent);padding:4px 8px;border-radius:6px;border:1px solid rgba(167,139,250,.35);background:rgba(167,139,250,.08);white-space:nowrap">'+wkLbl+'</span>';
  h+='<input type="date" value="'+S.rosterWeek+'" onchange="window.rosterJump(this.value)" style="position:absolute;opacity:0;width:1px;height:1px;left:0;top:0">';
  h+='</label>';
  h+='<button tabindex="-1" onclick="window._navAway(function(){S.rosterWeek=\''+_rIso(nextStart)+'\';S._rosterLeaveWeek=null;render()})" style="padding:5px 12px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:13px;cursor:pointer">▶</button>';
  h+='<button tabindex="-1" onclick="window._navAway(function(){S.rosterWeek=null;S._rosterLeaveWeek=null;render()})" style="padding:5px 10px;border-radius:8px;border:1px solid rgba(167,139,250,.4);background:rgba(167,139,250,.08);color:#a78bfa;font-size:11px;font-weight:700;cursor:pointer">Today</button>';
  if(_payAllowed){
    h+='<button tabindex="-1" onclick="window.rosterTogglePayWeek()" title="Toggle pay-week display (Thursday–Wednesday)" style="padding:5px 10px;border-radius:8px;border:1px solid '+(_payWeek?'rgba(34,197,94,.5)':'var(--border2)')+';background:'+(_payWeek?'rgba(34,197,94,.12)':'var(--card2)')+';color:'+(_payWeek?'#4ade80':'var(--text3)')+';font-size:11px;font-weight:700;cursor:pointer">'+(_payWeek?'Pay wk · Thu–Wed':'Pay week')+'</button>';
  }
  if(canEditRoster){
    var lk=!!S.rosterLocked;
    h+='<button tabindex="-1" onclick="S.rosterLocked=!S.rosterLocked;render()" style="padding:5px 10px;border-radius:8px;border:1px solid '+(lk?'#f59e0b':'var(--border2)')+';background:'+(lk?'rgba(245,158,11,.12)':'var(--card2)')+';color:'+(lk?'#fbbf24':'var(--text3)')+';font-size:12px;cursor:pointer" title="Toggle roster lock">'+(lk?'🔒 Locked':'🔓 Unlocked')+'</button>';
    if(!lk){
      var _hasDraft=S._rosterDraft&&Object.keys(S._rosterDraft).length>0;
      var _undoLen=(S._rosterUndoStack||[]).length;
      h+='<button tabindex="-1" onclick="window.saveRosterToCloud()" style="padding:5px 12px;border-radius:8px;border:none;background:#22c55e;color:#fff;font-size:12px;font-weight:700;cursor:pointer">Save</button>';
      if(_hasDraft){h+='<button tabindex="-1" onclick="window.rosterDiscard()" style="padding:5px 10px;border-radius:8px;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.08);color:#f87171;font-size:11px;font-weight:600;cursor:pointer">Discard</button>';}
      if(_undoLen>0){h+='<button tabindex="-1" onclick="window.rosterUndo()" style="padding:5px 10px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:11px;cursor:pointer">Undo ('+_undoLen+')</button>';}
    }
  }
  // Right-aligned matching pills: Show (role filter) + Colours (admin)
  var _showOn=!!S._rosterShowFilter, _ce=!!S._rosterColorEdit;
  function _rTbPill(label,icon,active,onclick){
    return '<button tabindex="-1" onclick="'+onclick+'" style="display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:9px;border:1px solid '+(active?'rgba(167,139,250,.55)':'var(--border2)')+';background:'+(active?'rgba(167,139,250,.16)':'var(--card2)')+';color:'+(active?'#c4b5fd':'var(--text2)')+';font-size:12px;font-weight:600;cursor:pointer">'+icon+' <span>'+label+'</span><span style="font-size:9px;opacity:.6">'+(active?'▴':'▾')+'</span></button>';
  }
  h+='<div style="margin-left:auto;display:flex;gap:8px;align-items:center">';
  h+=_rTbPill('Show','👁',_showOn,"S._rosterShowFilter=!S._rosterShowFilter;render()");
  if(isAdminPlus)h+=_rTbPill('Colours','🎨',_ce,"S._rosterColorEdit=!S._rosterColorEdit;render()");
  h+='</div>';
  h+='</div>';
  // Warn admins about duplicate crew codes (they corrupt roster/leave-day counts).
  if(canEditRoster){
    var _dupes=_dupCrewCodes(),_dupKeys=Object.keys(_dupes);
    if(_dupKeys.length){
      h+='<div style="margin:10px 14px;padding:9px 12px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.4);border-radius:8px;font-size:12px;color:#fbbf24;line-height:1.5">⚠ Duplicate crew codes share roster &amp; leave-day data — give each a unique code in Admin → People: '+_dupKeys.map(function(k){return '<strong>'+k+'</strong> ('+_dupes[k].join(', ')+')';}).join('; ')+'</div>';
    }
  }
  // Collapsible role-visibility panel
  if(_showOn){
    h+='<div style="padding:10px 14px;border-bottom:1px solid var(--border2);background:var(--card2);display:flex;gap:6px;flex-wrap:wrap;align-items:center">';
    h+='<span style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-right:4px">Show roles</span>';
    ROLE_GROUPS.filter(function(g){return ['maint','accounts'].indexOf(g.key)<0;}).forEach(function(g){
      var hidden=_rGH.indexOf(g.key)>=0;
      h+='<button tabindex="-1" onclick="window.rosterToggleGroup(\''+g.key+'\')" style="padding:4px 12px;border-radius:20px;border:1px solid '+(hidden?'var(--border2)':g.col+'88')+';background:'+(hidden?'var(--card2)':g.col+'22')+';color:'+(hidden?'var(--text3)':g.col)+';font-size:11px;font-weight:700;cursor:pointer;opacity:'+(hidden?'0.5':'1')+'">'+g.label+'</button>';
    });
    h+='</div>';
  }
  h+=_renderRosterColors(isAdminPlus);

  // ── Table ──
  h+='<div style="overflow:auto;max-height:calc(100vh - 220px)">';
  h+='<table style="width:100%;border-collapse:collapse;min-width:560px">';

  // Sticky header
  h+='<thead style="position:sticky;top:0;z-index:20">';
  h+='<tr style="background:#0d1526">';
  h+='<th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:var(--text3);min-width:155px;position:sticky;left:0;z-index:21;background:#0d1526;border-right:1px solid rgba(255,255,255,.07)">Crew</th>';
  days.forEach(function(d,i){
    var ds=_rIso(d),isTdy=ds===todayStr,isWe=i>=5;
    h+='<th style="padding:5px 3px;text-align:center;min-width:66px;background:'+(isTdy?'rgba(124,58,237,.14)':'#0d1526')+';border-bottom:1px solid rgba(255,255,255,.05)">';
    var _DSHORT=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    h+='<div style="font-size:10px;font-weight:700;color:'+(isTdy?'#a78bfa':(isWe?'rgba(255,255,255,.28)':'var(--text3)'))+'">'+_DSHORT[d.getDay()]+'</div>';
    h+='<div style="font-size:16px;font-weight:800;color:'+(isTdy?'#a78bfa':'var(--text1)')+'">'+d.getDate()+'</div>';
    h+='<div style="font-size:9px;font-weight:500;color:var(--text3)">'+MONTHS[d.getMonth()]+'</div>';
    h+='</th>';
  });
  h+='</tr>';
  h+='<tr style="background:rgba(13,21,38,.97);border-bottom:2px solid rgba(255,255,255,.1)">';
  h+='<td style="padding:4px 12px;font-size:10px;font-weight:700;color:var(--text3);position:sticky;left:0;z-index:21;background:rgba(13,21,38,.97);border-right:1px solid rgba(255,255,255,.07)">Totals</td>';
  days.forEach(function(d,i){
    var ds=_rIso(d),isTdy=ds===todayStr;
    var tots=_dayTots(ds);
    h+='<td style="padding:3px 2px;text-align:center;background:'+(isTdy?'rgba(124,58,237,.08)':'transparent')+'">';
    ROLE_GROUPS.forEach(function(g){
      if(tots[g.key]>0){
        h+='<span style="display:inline-block;padding:1px 4px;border-radius:4px;font-size:9px;font-weight:800;margin:1px;background:'+g.col+'1a;color:'+g.col+'">'+g.label[0]+tots[g.key]+'</span>';
      }
    });
    h+='</td>';
  });
  h+='</tr>';
  h+='</thead>';

  // ── Body ──
  h+='<tbody>';
  if(!displayUsers.length){
    h+='<tr><td colspan="8" style="padding:32px;text-align:center;color:var(--text3);font-size:13px">No users found.</td></tr>';
  } else {
    var grouped=[];
    ROLE_GROUPS.forEach(function(g){
      var members=displayUsers.filter(function(u){return _rGroupKey(u)===g.key;});
      if(members.length)grouped.push({g:g,members:members});
    });
    var ungrouped=displayUsers.filter(function(u){return !_rGroupKey(u);});
    if(ungrouped.length)grouped.push({g:{key:'other',label:'Other',col:'#94a3b8'},members:ungrouped});

    grouped.forEach(function(grp){
      h+='<tr style="background:rgba(255,255,255,.025)">';
      h+='<td colspan="8" style="padding:4px 12px;font-size:10px;font-weight:800;color:'+grp.g.col+';text-transform:uppercase;letter-spacing:.08em;position:sticky;left:0">'+grp.g.label+'</td>';
      h+='</tr>';

      grp.members.forEach(function(u){
        var ini=_rIni(u);
        var rc=ROLE_GROUPS.filter(function(g2){return g2.key===_rGroupKey(u);})[0];
        var rowCol=rc?rc.col:'#94a3b8';
        var isPilot=!!(u.role==='pilot'||(typeof _picEligible==='function'&&_picEligible(u)));
        h+='<tr style="border-top:1px solid rgba(255,255,255,.035)">';
        // Sticky name cell
        h+='<td style="padding:5px 10px;white-space:nowrap;position:sticky;left:0;z-index:1;background:var(--card);border-right:1px solid rgba(255,255,255,.06)">';
        h+='<div style="font-size:12px;font-weight:700;color:var(--text1);margin-bottom:2px">'+u.name+'</div>';
        h+='<div style="display:flex;gap:2px;flex-wrap:wrap;align-items:center">';
        h+='<span style="font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px;background:'+rowCol+'1a;color:'+rowCol+'">'+ini+'</span>';
        // Pilot type ratings — endorsements live in S.crew, look up by name
        if(isPilot){
          var _cr=(S.crew||[]).find(function(c){return c.n===u.name||c.n===u.linkedCrew;});
          var _end=_cr?(_cr.endorse||[]):[];
          _end.filter(function(e){return e&&e.indexOf('ZK-')===0;}).forEach(function(e){
            var ec=(typeof AC_COL!=='undefined'&&AC_COL[e])||'#4a99d2';
            var lbl=e.replace('ZK-','');
            h+='<span style="font-size:8px;font-weight:800;padding:1px 4px;border-radius:3px;border:1px solid '+ec+'66;background:'+ec+'1a;color:'+ec+'">'+lbl+'</span>';
          });
        }
        h+='</div>';
        h+='</td>';

        days.forEach(function(d,i){
          var ds=_rIso(d);
          var isTdy=ds===todayStr,isWe=i>=5;
          var st=_rGetStatus(u,ds,roster);
          var isOther=st&&st.indexOf('other:')===0;
          var rawSt=isOther?'other':st;
          var isHidden=rawSt&&rHide.indexOf(rawSt)>-1;
          var otherNote=isOther?st.slice(6):'';
          var cfg=_rSC(rawSt||'');
          var dispLbl=isOther?esc(otherNote||'?'):cfg.lbl;
          h+='<td style="padding:3px 2px;text-align:center;background:'+(isTdy?'rgba(124,58,237,.06)':(isWe?'rgba(255,255,255,.01)':'transparent'))+'">';
          if(isHidden){h+='<span style="display:inline-block;width:66px;height:24px"></span>';}else if(canEdit){
            var _oe=S._rosterOtherEdit;
            var _editingOther=_oe&&_oe.uid===u.id&&_oe.ds===ds;
            if(_editingOther){
              h+='<div style="display:flex;flex-direction:column;gap:3px;align-items:center;padding:2px">';
              h+='<input id="_rOtherInput_'+ds+'_'+u.id+'" type="text" placeholder="Note..." autofocus style="width:62px;padding:3px 5px;border-radius:5px;border:1px solid rgba(167,139,250,.5);background:rgba(30,27,75,.8);color:#e2e8f0;font-size:10px" onkeydown="if(event.key===\'Enter\')window.rosterOtherConfirm(\''+u.id+'\',\''+ini+'\',\''+ds+'\');if(event.key===\'Escape\')window.rosterOtherCancel()">';
              h+='<div style="display:flex;gap:3px">';
              h+='<button tabindex="-1" onclick="window.rosterOtherConfirm(\''+u.id+'\',\''+ini+'\',\''+ds+'\')" style="padding:2px 6px;border-radius:4px;border:none;background:#22c55e;color:#fff;font-size:10px;font-weight:700;cursor:pointer">OK</button>';
              h+='<button tabindex="-1" onclick="window.rosterOtherCancel()" style="padding:2px 6px;border-radius:4px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-size:10px;cursor:pointer">X</button>';
              h+='</div></div>';
            }else{
            h+='<select tabindex="-1" onchange="window.rosterSetCell(\''+u.id+'\',\''+ini+'\',\''+ds+'\',this.value)" title="'+(isOther?esc(otherNote):'')+'" style="padding:4px 3px;border-radius:6px;border:1px solid '+(st?cfg.bd:'rgba(255,255,255,.06)')+';background:'+(st?cfg.bg:'transparent')+';color:'+(st?cfg.col:'rgba(255,255,255,.15)')+';font-size:11px;font-weight:700;cursor:pointer;width:66px;text-align:center">';
            ROSTER_ORDER.forEach(function(s){
              var c=_rSC(s);
              h+='<option value="'+s+'"'+(rawSt===s?' selected':'')+'>'+c.lbl+'</option>';
            });
            h+='</select>';
            if(isOther&&otherNote){h+='<div style="font-size:8px;color:#94a3b8;line-height:1;margin-top:1px;max-width:62px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(otherNote)+'</div>';}
            }
          } else {
            h+='<span'+(isOther?' title="'+esc(otherNote)+'"':'')+' style="display:inline-block;padding:4px 3px;border-radius:6px;border:1px solid '+(st?cfg.bd:'rgba(255,255,255,.04)')+';background:'+(st?cfg.bg:'transparent')+';color:'+(st?cfg.col:'rgba(255,255,255,.1)')+';font-size:11px;font-weight:700;min-width:56px">'+dispLbl+'</span>';
          }
          h+='</td>';
        });
        h+='</tr>';
      });
    });
  }
  h+='</tbody></table></div>';

  // Legend + filter
  h+='<div style="padding:6px 14px 8px;border-top:1px solid var(--border2);background:var(--card)">';
  h+='<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:5px">';
  h+='<span style="font-size:10px;color:var(--text3);font-weight:600;margin-right:2px">Show:</span>';
  h+='<button tabindex="-1" onclick="window.rosterVisAll()" style="padding:2px 8px;border-radius:4px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:10px;font-weight:700;cursor:pointer">All</button>';
  h+='<button tabindex="-1" onclick="window.rosterVisPreset(\'leave\')" style="padding:2px 8px;border-radius:4px;border:1px solid rgba(245,158,11,.5);background:rgba(245,158,11,.1);color:#fbbf24;font-size:10px;font-weight:700;cursor:pointer">Leave</button>';
  h+='<button tabindex="-1" onclick="window.rosterVisPreset(\'extra\')" style="padding:2px 8px;border-radius:4px;border:1px solid rgba(34,197,94,.5);background:rgba(34,197,94,.1);color:#86efac;font-size:10px;font-weight:700;cursor:pointer">Extra</button>';
  h+='</div>';
  h+='<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">';
  ROSTER_ORDER.filter(function(s){return s!=='';}).forEach(function(s){
    var c=_rSC(s);
    var isHid=rHide.indexOf(s)>-1;
    h+='<span onclick="window.rosterToggleVis(\''+s+'\')" style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;border:1px solid '+(isHid?'rgba(148,163,184,.2)':c.bd)+';background:'+(isHid?'rgba(148,163,184,.04)':c.bg)+';color:'+(isHid?'rgba(148,163,184,.3)':c.col)+';cursor:pointer;user-select:none;opacity:'+(isHid?'0.4':'1')+'" title="Click to '+(isHid?'show':'hide')+'">'+c.lbl+'</span>';
  });
  h+='</div>';
  h+='</div>';
  return h;
}

// ── Color settings panel ──
function _renderRosterColors(isAdminPlus){
  if(!isAdminPlus||!S._rosterColorEdit)return '';
  var keys=ROSTER_ORDER.filter(function(s){return s!=='';});
  var h='<div style="padding:10px 14px 12px;border-bottom:1px solid var(--border2);background:rgba(99,102,241,.04)">';
  h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">';
  h+='<span style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Roster Colors</span>';
  h+='<button tabindex="-1" onclick="window.saveRosterColors()" style="padding:3px 10px;border-radius:6px;border:none;background:#22c55e;color:#fff;font-size:11px;font-weight:700;cursor:pointer">Save</button>';
  h+='<button tabindex="-1" onclick="window.resetRosterColors()" style="padding:3px 10px;border-radius:6px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-size:11px;cursor:pointer">Reset Defaults</button>';
  h+='</div>';
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px 12px">';
  keys.forEach(function(s){
    var c=_rSC(s);
    var accent=_rAccent(s);
    h+='<div style="display:flex;align-items:center;gap:5px">';
    h+='<input type="color" value="'+accent+'" onchange="window.rosterSetColor(\''+s+'\',this.value)" style="width:22px;height:22px;flex-shrink:0;border:none;border-radius:4px;cursor:pointer;padding:1px;background:transparent">';
    h+='<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;border:1px solid '+c.bd+';background:'+c.bg+';color:'+c.col+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px">'+c.lbl+'</span>';
    h+='</div>';
  });
  h+='</div></div>';
  return h;
}

// ── Pattern Builder ──
function renderRosterBuild(){
  var today=new Date();today.setHours(0,0,0,0);
  var DNAMES=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var roleOrder={superadmin:0,admin:1,pilot:2,desk:3,cx_manager:3,accounts:4,marketing:5,maint:6,maintenance:6,ground_staff:7};
  var allUsers=(S.users||[]).filter(function(u){return u.id&&u.name&&!u.inactive;}).slice().sort(function(a,b){
    return (roleOrder[a.role]||9)-(roleOrder[b.role]||9)||(a.name||'').localeCompare(b.name||'');
  });
  var bs=S.rosterBuild||(S.rosterBuild=lsGet('ts_roster_build')||{});
  // Build always starts on a Monday — snap whatever is stored to its week's Monday.
  bs.startDate=_rIso(_rMonday(bs.startDate?new Date(bs.startDate+'T00:00:00'):today));
  if(!bs.weeks)bs.weeks=4;
  if(!bs.template)bs.template={};
  if(!bs.enabled)bs.enabled={};
  try{lsSet('ts_roster_build',bs);}catch(e){}
  var _MTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var _bMon=new Date(bs.startDate+'T00:00:00');
  var _bSun=new Date(_bMon); _bSun.setDate(_bSun.getDate()+6);
  var _wkLbl=_bMon.getDate()+' '+_MTHS[_bMon.getMonth()]+' – '+_bSun.getDate()+' '+_MTHS[_bSun.getMonth()];

  var h='<div style="padding:14px">';

  // Controls row
  h+='<div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:14px">';
  h+='<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:3px">Build from (week starting Monday)</label>'
    +'<div style="display:flex;align-items:center;gap:6px">'
    +'<button tabindex="-1" onclick="window.rosterBuildStep(-1)" style="padding:7px 11px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:13px;cursor:pointer">◁</button>'
    +'<label onclick="var i=this.querySelector(\'input\');try{i.showPicker&&i.showPicker()}catch(e){}" title="Click to jump to any week" style="position:relative;cursor:pointer"><span style="display:inline-block;font-size:13px;font-weight:700;color:var(--accent);padding:6px 12px;border-radius:8px;border:1px solid rgba(167,139,250,.35);background:rgba(167,139,250,.08);white-space:nowrap;min-width:150px;text-align:center">'+_wkLbl+'</span><input type="date" value="'+bs.startDate+'" onchange="window.rosterBuildJump(this.value)" style="position:absolute;opacity:0;width:1px;height:1px;left:0;bottom:0"></label>'
    +'<button tabindex="-1" onclick="window.rosterBuildStep(1)" style="padding:7px 11px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:13px;cursor:pointer">▶</button>'
    +'<button tabindex="-1" onclick="window.rosterBuildStep(0)" style="padding:7px 10px;border-radius:8px;border:1px solid rgba(167,139,250,.4);background:rgba(167,139,250,.08);color:#a78bfa;font-size:11px;font-weight:700;cursor:pointer">This week</button>'
    +'</div></div>';
  h+='<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:3px">Weeks to fill</label>'
    +'<input type="number" min="1" max="52" value="'+(bs.weeks||4)+'" onchange="S.rosterBuild.weeks=Math.max(1,parseInt(this.value)||4);render()" style="width:70px;padding:7px 10px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text1);font-size:13px"></div>';
  // Enable-all / disable-all
  h+='<div style="display:flex;gap:6px;padding-bottom:2px">';
  h+='<button tabindex="-1" onclick="window.rosterBuildAll(true)" style="padding:7px 12px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--accent);font-size:11px;font-weight:700;cursor:pointer">All On</button>';
  h+='<button tabindex="-1" onclick="window.rosterBuildAll(false)" style="padding:7px 12px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text3);font-size:11px;font-weight:700;cursor:pointer">All Off</button>';
  h+='</div>';
  h+='</div>';

  // Template grid
  h+='<div style="overflow:auto;border:1px solid var(--border2);border-radius:10px;margin-bottom:14px">';
  h+='<table style="width:100%;border-collapse:collapse;min-width:620px">';
  h+='<thead><tr style="background:rgba(255,255,255,.04);border-bottom:1px solid var(--border2)">';
  h+='<th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text3);min-width:48px">Inc.</th>';
  h+='<th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text3);min-width:140px">Name</th>';
  DNAMES.forEach(function(dn){
    h+='<th style="padding:6px 3px;text-align:center;font-size:11px;font-weight:700;color:var(--text3);min-width:70px">'+dn+'</th>';
  });
  h+='</tr></thead><tbody>';

  if(!allUsers.length){
    h+='<tr><td colspan="9" style="padding:20px;text-align:center;color:var(--text3)">No users.</td></tr>';
  } else {
    allUsers.forEach(function(u){
      var rc=ROLE_GROUPS.filter(function(g){return g.roles.indexOf(u.role)>=0;})[0];
      var rowCol=rc?rc.col:'#94a3b8';
      var enabled=bs.enabled[u.id]!==false;  // default on
      var rowOpacity=enabled?'1':'0.38';
      h+='<tr style="border-top:1px solid rgba(255,255,255,.04);opacity:'+rowOpacity+'">';
      // Toggle button
      var togBg=enabled?'var(--accent)':'var(--card2)';
      var togCol=enabled?'#fff':'var(--text3)';
      h+='<td style="padding:5px 8px;text-align:center">';
      h+='<button tabindex="-1" onclick="window.rosterBuildToggle(\''+u.id+'\')" '
        +'style="width:42px;height:24px;border-radius:12px;border:none;background:'+togBg+';color:'+togCol+';font-size:10px;font-weight:800;cursor:pointer;transition:background .15s">';
      h+=(enabled?'ON':'OFF')+'</button></td>';
      // Name
      h+='<td style="padding:5px 10px;white-space:nowrap">';
      h+='<div style="font-size:12px;font-weight:600;color:var(--text1)">'+u.name+'</div>';
      h+='<div style="font-size:10px;color:'+rowCol+';font-weight:600;text-transform:uppercase;letter-spacing:.04em">'+u.role+'</div>';
      h+='</td>';
      // Day cells
      for(var di=0;di<7;di++){
        var tst=(bs.template[di]&&bs.template[di][u.id])||'';
        var cfg=ROSTER_SC[tst]||ROSTER_SC[''];
        h+='<td style="padding:3px 2px;text-align:center">';
        h+='<select tabindex="-1" '+(enabled?'':'disabled ')
          +'onchange="window.rosterTplSet('+di+',\''+u.id+'\',this.value,this)" '
          +'style="width:68px;padding:4px 3px;border-radius:6px;border:1px solid '+(tst?cfg.bd:'var(--border2)')+';'
          +'background:'+(tst?cfg.bg:'var(--card2)')+';color:'+(tst?cfg.col:'var(--text3)')+';'
          +'font-size:11px;font-weight:700;cursor:pointer;text-align:center">';
        ROSTER_ORDER.forEach(function(s){var c=_rSC(s);h+='<option value="'+s+'"'+(tst===s?' selected':'')+'>'+c.lbl+'</option>';});
        h+='</select></td>';
      }
      h+='</tr>';
    });
  }
  h+='</tbody></table></div>';

  var endD=new Date((bs.startDate||_rIso(today))+'T00:00:00');
  endD.setDate(endD.getDate()+(bs.weeks||4)*7-1);
  var MTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var endLabel=endD.getDate()+' '+MTHS[endD.getMonth()]+' '+endD.getFullYear();
  var enabledCount=allUsers.filter(function(u){return bs.enabled[u.id]!==false;}).length;
  h+='<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">';
  h+='<button tabindex="-1" onclick="window.rosterApplyPattern()" '
    +'style="padding:10px 22px;border-radius:10px;border:none;background:var(--accent);color:#fff;font-size:13px;font-weight:700;cursor:pointer">'
    +'Push to Roster</button>';
  h+='<button tabindex="-1" onclick="if(confirm(\x22Clear all week templates?\x22)){S.rosterBuild.template={};try{lsSet(\x27ts_roster_build\x27,S.rosterBuild);}catch(e){}render();}" '
    +'style="padding:10px 16px;border-radius:10px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-size:12px;cursor:pointer">'
    +'Clear Templates</button>';
  h+='<span style="font-size:12px;color:var(--text3)">';
  h+=enabledCount+' person'+(enabledCount!==1?'s':'')+' included &bull; '+(bs.weeks||4)+' week'+((bs.weeks||4)!==1?'s':'')+' &bull; until '+endLabel;
  h+='</span>';
  h+='</div></div>';
  return h;
}

// ── Window functions ──



window.rosterSetCell=function(uid,ini,ds,val){
  if(val==='other'){
    S._rosterOtherEdit={uid:uid,ini:ini,ds:ds};
    render();
    return;
  }
  S._rosterOtherEdit=null;
  window._rosterDraftSet(uid,ini,ds,val);
};
window.rosterOtherConfirm=function(uid,ini,ds){
  var el=document.getElementById('_rOtherInput_'+ds+'_'+uid);
  var note=el?el.value.trim():'';
  S._rosterOtherEdit=null;
  window._rosterDraftSet(uid,ini,ds,note?'other:'+note:'other');
};
window.rosterOtherCancel=function(){
  S._rosterOtherEdit=null;
  render();
};
window.rosterSet=function(uid,ini,ds,val){
  window._rosterDraftSet(uid,ini,ds,val);
};
window._rosterDraftSet=function(uid,ini,ds,val){
  // Push current draft to undo stack (max 10)
  if(!S._rosterUndoStack)S._rosterUndoStack=[];
  S._rosterUndoStack.push(JSON.stringify(S._rosterDraft||{}));
  if(S._rosterUndoStack.length>10)S._rosterUndoStack.shift();
  // Apply to draft
  if(!S._rosterDraft)S._rosterDraft={};
  if(!S._rosterDraft[ds])S._rosterDraft[ds]={};
  if(val){
    S._rosterDraft[ds][uid]=val;
    if(ini)S._rosterDraft[ds][ini]=val;
  }else{
    delete S._rosterDraft[ds][uid];
    if(ini)delete S._rosterDraft[ds][ini];
    if(!Object.keys(S._rosterDraft[ds]).length)delete S._rosterDraft[ds];
  }
  render();
};

window.rosterTplSet=function(di,uid,val,el){
  if(!S.rosterBuild)S.rosterBuild={};
  if(!S.rosterBuild.template)S.rosterBuild.template={};
  if(!S.rosterBuild.template[di])S.rosterBuild.template[di]={};
  if(val)S.rosterBuild.template[di][uid]=val;
  else delete S.rosterBuild.template[di][uid];
  // Update the pill colour in place — no full re-render, so the page doesn't jump/close.
  if(el){var c=_rSC(val||'');el.style.background=val?c.bg:'var(--card2)';el.style.borderColor=val?c.bd:'var(--border2)';el.style.color=val?c.col:'var(--text3)';}
  try{lsSet('ts_roster_build',S.rosterBuild);}catch(e){}
};

// Build pattern: step the build week (always lands on a Monday). delta 0 = this week.
window.rosterBuildStep=function(delta){
  if(!S.rosterBuild)S.rosterBuild={};
  var base=(delta===0||!S.rosterBuild.startDate)?new Date():new Date(S.rosterBuild.startDate+'T00:00:00');
  base.setHours(0,0,0,0);
  var mon=_rMonday(base);
  if(delta)mon.setDate(mon.getDate()+delta*7);
  S.rosterBuild.startDate=_rIso(mon);
  try{lsSet('ts_roster_build',S.rosterBuild);}catch(e){}
  render();
};
// Build pattern: jump to any week via date picker (snaps to that week's Monday).
window.rosterBuildJump=function(v){
  if(!v)return;
  var d=new Date(v+'T00:00:00'); if(isNaN(d.getTime()))return;
  if(!S.rosterBuild)S.rosterBuild={};
  S.rosterBuild.startDate=_rIso(_rMonday(d));
  try{lsSet('ts_roster_build',S.rosterBuild);}catch(e){}
  render();
};
// Build pattern: enable/disable everyone (does NOT touch the day templates).
window.rosterBuildAll=function(on){
  if(!S.rosterBuild)S.rosterBuild={};
  if(!S.rosterBuild.enabled)S.rosterBuild.enabled={};
  (S.users||[]).filter(function(u){return u.id&&!u.inactive;}).forEach(function(u){S.rosterBuild.enabled[u.id]=!!on;});
  try{lsSet('ts_roster_build',S.rosterBuild);}catch(e){}
  render();
};
// Build pattern: toggle one person's inclusion (default is included/ON).
window.rosterBuildToggle=function(uid){
  if(!S.rosterBuild)S.rosterBuild={};
  if(!S.rosterBuild.enabled)S.rosterBuild.enabled={};
  S.rosterBuild.enabled[uid]=(S.rosterBuild.enabled[uid]===false);
  try{lsSet('ts_roster_build',S.rosterBuild);}catch(e){}
  render();
};

window.rosterApplyPattern=async function(){
  var bs=S.rosterBuild||{};
  var tpl=bs.template||{};
  var enabled=bs.enabled||{};
  var startStr=bs.startDate;
  var weeks=bs.weeks||4;
  if(!startStr){alert('Set a start date.');return;}
  var startD=new Date(startStr+'T00:00:00');
  if(isNaN(startD.getTime())){alert('Invalid start date.');return;}
  var endD=new Date(startD);endD.setDate(endD.getDate()+weeks*7-1);
  var endStr=_rIso(endD);
  // Fetch APPROVED leave across the whole build range (not just the visible week)
  var leaveLookup={};
  try{
    var r=await fetch(SB+'/rest/v1/ts_leave_requests?select=*&status=eq.approved&start_date=lte.'+endStr+'&end_date=gte.'+startStr,{headers:SH});
    if(r.ok){(await r.json()).forEach(function(req){
      var s=new Date(req.start_date+'T00:00:00'),e=new Date(req.end_date+'T00:00:00');
      for(var d=new Date(s);d<=e;d.setDate(d.getDate()+1)){var ds=_rIso(d);if(!leaveLookup[ds])leaveLookup[ds]={};leaveLookup[ds][req.user_id]={type:req.leave_type,name:req.user_name};}
    });}
  }catch(e){}
  // Detect cells where the pattern would write over an approved-leave day
  var conflicts=[];
  for(var w=0;w<weeks;w++)for(var di=0;di<7;di++){
    var d2=new Date(startD);d2.setDate(d2.getDate()+w*7+di);var ds2=_rIso(d2);
    var dayTpl=tpl[di]||{};
    Object.keys(dayTpl).forEach(function(uid){
      if(enabled[uid]===false||!dayTpl[uid])return;
      if(leaveLookup[ds2]&&leaveLookup[ds2][uid]){
        conflicts.push({uid:uid,ds:ds2,name:leaveLookup[ds2][uid].name||uid,type:leaveLookup[ds2][uid].type});
      }
    });
  }
  if(conflicts.length){S._rBuildLeave=leaveLookup;_rShowBuildLeavePrompt(conflicts);return;}
  _rDoApplyBuild('skip',leaveLookup);
};
function _rDoApplyBuild(mode,leaveLookup){
  var bs=S.rosterBuild||{};var tpl=bs.template||{};var enabled=bs.enabled||{};
  var startStr=bs.startDate;var weeks=bs.weeks||4;
  var startD=new Date(startStr+'T00:00:00');
  var PROTECTED=new Set(['leave','sick']);
  if(!S.roster)S.roster={};
  leaveLookup=leaveLookup||{};
  var count=0,skipped=0;
  for(var w=0;w<weeks;w++){
    for(var di=0;di<7;di++){
      var d=new Date(startD);d.setDate(d.getDate()+w*7+di);
      var ds=_rIso(d);
      if(!S.roster[ds])S.roster[ds]={};
      var dayTpl=tpl[di]||{};
      Object.keys(dayTpl).forEach(function(uid){
        if(enabled[uid]===false)return;
        var newSt=dayTpl[uid];if(!newSt)return;
        var ex=S.roster[ds][uid]||'';
        var exRaw=ex.indexOf('other:')===0?'other':ex;
        if(PROTECTED.has(exRaw))return;
        if(mode==='skip'&&leaveLookup[ds]&&leaveLookup[ds][uid]){skipped++;return;}
        S.roster[ds][uid]=newSt;count++;
      });
    }
  }
  lsSet('ts_roster',S.roster);
  window.saveRosterToCloud();
  toast('Pushed '+count+' cells'+(skipped?' · skipped '+skipped+' approved-leave day'+(skipped!==1?'s':''):'')+' across '+weeks+' week'+(weeks!==1?'s':'')+'.','success');
  S.rosterTab='view';S.rosterWeek=startStr;render();
}
function _rShowBuildLeavePrompt(conflicts){
  var ex=document.getElementById('rbuild-leave-ov');if(ex)ex.remove();
  var byPerson={};conflicts.forEach(function(c){(byPerson[c.name]=byPerson[c.name]||[]).push(c);});
  var list=Object.keys(byPerson).map(function(nm){
    var ds=byPerson[nm].map(function(c){return c.ds;}).sort();
    var rng=(typeof _lvFmt==='function'?_lvFmt(ds[0]):ds[0])+(ds.length>1?' → '+(typeof _lvFmt==='function'?_lvFmt(ds[ds.length-1]):ds[ds.length-1]):'');
    return '<div style="font-size:12px;color:var(--text2);padding:3px 0;border-bottom:1px solid var(--border)"><strong style="color:var(--text1)">'+nm+'</strong> · '+byPerson[nm].length+' day'+(byPerson[nm].length!==1?'s':'')+' <span style="color:var(--text3)">('+rng+')</span></div>';
  }).join('');
  var ov=document.createElement('div');ov.id='rbuild-leave-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML='<div style="background:var(--card);border:1px solid var(--border2);border-radius:16px;padding:22px;max-width:440px;width:100%;max-height:80vh;overflow:auto;box-shadow:0 12px 44px rgba(0,0,0,.55)">'
    +'<div style="font-size:16px;font-weight:700;color:var(--text1);margin-bottom:8px">⚠ '+conflicts.length+' day'+(conflicts.length!==1?'s':'')+' clash with approved leave</div>'
    +'<div style="font-size:13px;color:var(--text3);margin-bottom:12px;line-height:1.5">This pattern would write a roster code over days these people already have <strong>approved leave</strong>:</div>'
    +'<div style="background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:6px 12px;margin-bottom:16px">'+list+'</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px">'
    +'<button onclick="window._rBuildChoose(\'skip\')" style="padding:11px;border-radius:10px;border:1.5px solid rgba(34,197,94,.55);background:rgba(34,197,94,.12);color:#4ade80;font-size:14px;font-weight:700;cursor:pointer">✓ Skip those days — keep their leave (recommended)</button>'
    +'<button onclick="window._rBuildChoose(\'overwrite\')" style="padding:11px;border-radius:10px;border:1.5px solid rgba(239,68,68,.5);background:rgba(239,68,68,.12);color:#ef4444;font-size:14px;font-weight:700;cursor:pointer">Overwrite the leave days anyway</button>'
    +'<button onclick="window._rBuildChoose(\'cancel\')" style="padding:11px;border-radius:10px;border:1px solid var(--border2);background:transparent;color:var(--text2);font-size:14px;font-weight:600;cursor:pointer">Cancel</button>'
    +'</div></div>';
  ov.addEventListener('click',function(e){if(e.target===ov)window._rBuildChoose('cancel');});
  document.body.appendChild(ov);
}
window._rBuildChoose=function(c){
  var ov=document.getElementById('rbuild-leave-ov');if(ov)ov.remove();
  if(c==='cancel'){S._rBuildLeave=null;return;}
  _rDoApplyBuild(c==='skip'?'skip':'overwrite',S._rBuildLeave||{});
  S._rBuildLeave=null;
};

window.saveRosterToCloud=async function(){
  // Merge draft into roster locally, but DON'T discard the draft/undo stack until the
  // cloud write is CONFIRMED. sbU returns null on failure (it does not throw), so a
  // denied/failed save must not be reported as success or wipe the operator's edits.
  var draft=S._rosterDraft||{};
  if(!S.roster)S.roster={};
  Object.keys(draft).forEach(function(ds){
    if(!S.roster[ds])S.roster[ds]={};
    Object.assign(S.roster[ds],draft[ds]);
  });
  lsSet('ts_roster',S.roster);
  var res=await sbU('ts_settings',[{key:'roster',value:JSON.stringify(S.roster||{})}]);
  if(res===null){toast('Roster save failed — your changes are kept locally, please try again','err');return;}
  S._rosterDraft={};
  S._rosterUndoStack=[];
  toast('Roster saved!','success');
  render();
};

window.loadRosterFromCloud=async function(){
  try{
    var r=await _sbFetch(SB+'/rest/v1/ts_settings?key=eq.roster&select=value',{headers:{...SH}});
    if(!r.ok)return;
    var rows=await r.json();
    if(!rows||!rows.length)return;
    var val=typeof rows[0].value==='string'?JSON.parse(rows[0].value):rows[0].value;
    if(val&&typeof val==='object'){S.roster=val;lsSet('ts_roster',val);render();}
  }catch(e){}
};

window.loadRosterLeave=async function(){
  var weekStart=S.rosterWeek;
  if(!weekStart)return;
  var endD=new Date(weekStart+'T00:00:00');
  endD.setDate(endD.getDate()+6);
  var weekEnd=endD.getFullYear()+'-'+String(endD.getMonth()+1).padStart(2,'0')+'-'+String(endD.getDate()).padStart(2,'0');
  try{
    var r=await fetch(SB+'/rest/v1/ts_leave_requests?select=*&status=eq.approved&start_date=lte.'+weekEnd+'&end_date=gte.'+weekStart,{headers:SH});
    if(!r.ok)return;
    var rows=await r.json();
    var lookup={};
    rows.forEach(function(req){
      var s=new Date(req.start_date+'T00:00:00'),e=new Date(req.end_date+'T00:00:00');
      var lo=new Date(Math.max(s.getTime(),new Date(weekStart+'T00:00:00').getTime()));
      var hi=new Date(Math.min(e.getTime(),new Date(weekEnd+'T00:00:00').getTime()));
      for(var d=new Date(lo);d<=hi;d.setDate(d.getDate()+1)){
        var ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
        if(!lookup[ds])lookup[ds]={};
        lookup[ds][req.user_id]=req.leave_type;
      }
    });
    S._rosterLeave=lookup;
    safeRender();
  }catch(e){}
};


window.rosterJump=function(v){
  if(!v)return;
  var d=new Date(v+'T00:00:00');
  if(isNaN(d.getTime()))return;
  window._navAway(function(){
    var day=d.getDay();
    var diff=day===0?-6:1-day;
    d.setDate(d.getDate()+diff);
    var iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    S.rosterWeek=iso;
    S._rosterLeaveWeek=null;
    setTimeout(render,0);
  });
};

window.rosterVisAll=function(){
  S._rosterHide=[];
  render();
};

window.rosterVisPreset=function(preset){
  var LEAVE=['leave','ul','sick'];
  var EXTRA=['called_in','half_day'];
  var ALL_KEYS=Object.keys(ROSTER_SC).filter(function(s){return s!==''});
  if(preset==='leave'){
    S._rosterHide=ALL_KEYS.filter(function(s){return LEAVE.indexOf(s)===-1;});
  }else if(preset==='extra'){
    S._rosterHide=ALL_KEYS.filter(function(s){return EXTRA.indexOf(s)===-1;});
  }
  render();
};

window.rosterToggleVis=function(key){
  if(!S._rosterHide)S._rosterHide=[];
  var idx=S._rosterHide.indexOf(key);
  if(idx>-1){S._rosterHide.splice(idx,1);}
  else{S._rosterHide.push(key);}
  render();
};

window.rosterSetColor=function(key,hex){
  if(!S.rosterColors)S.rosterColors={};
  S.rosterColors[key]=hex;
  render();
};

window.resetRosterColors=function(){
  if(!confirm('Reset all roster colors to defaults?'))return;
  S.rosterColors={};
  render();
};

window.saveRosterColors=async function(){
  try{
    await sbU('ts_settings',[{key:'roster_colors',value:JSON.stringify(S.rosterColors||{})}]);
    toast('Colors saved!','success');
  }catch(e){toast('Save failed','err');}
};

window.loadRosterColors=async function(){
  try{
    var r=await fetch(SB+'/rest/v1/ts_settings?key=eq.roster_colors&select=value',{headers:SH});
    if(!r.ok)return;
    var rows=await r.json();
    if(rows&&rows.length&&rows[0].value){
      var val=typeof rows[0].value==='string'?JSON.parse(rows[0].value):rows[0].value;
      if(val&&typeof val==='object'){S.rosterColors=val;safeRender();}
    }
  }catch(e){}
};

window.rosterUndo=function(){
  if(!S._rosterUndoStack||!S._rosterUndoStack.length)return;
  S._rosterDraft=JSON.parse(S._rosterUndoStack.pop());
  render();
};

window.rosterDiscard=function(){
  if(!confirm('Discard all unsaved roster changes?'))return;
  S._rosterDraft={};
  S._rosterUndoStack=[];
  render();
};

window.rosterTogglePayWeek=function(){
  S._rosterPayWeek=!S._rosterPayWeek;
  try{lsSet('ts_roster_payweek',S._rosterPayWeek);}catch(e){}
  S.rosterWeek=null; // re-anchor to the current period in the new mode
  render();
};
window.rosterToggleGroup=function(key){
  var NEVER_SHOW=['maint','accounts'];
  if(NEVER_SHOW.indexOf(key)>=0)return;
  if(!S._rosterGroupHide)S._rosterGroupHide=[];
  var idx=S._rosterGroupHide.indexOf(key);
  if(idx>=0)S._rosterGroupHide.splice(idx,1);
  else S._rosterGroupHide.push(key);
  try{lsSet('ts_roster_grouphide',S._rosterGroupHide);}catch(e){}
  render();
};
