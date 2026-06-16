// === MODULE: roster.js v2.0 ===

// ── Status config ──
var ROSTER_SC={
  '':           {bg:'transparent',           bd:'rgba(255,255,255,.08)', col:'rgba(255,255,255,.2)',  lbl:'—'},
  on:           {bg:'rgba(34,197,94,.16)',    bd:'#22c55e',               col:'#4ade80',              lbl:'On'},
  c208b:        {bg:'rgba(59,130,246,.18)',   bd:'#3b82f6',               col:'#60a5fa',              lbl:'C208B'},
  ga8:          {bg:'rgba(168,85,247,.18)',   bd:'#a855f7',               col:'#c084fc',              lbl:'GA8'},
  desk:         {bg:'rgba(20,184,166,.18)',   bd:'#14b8a6',               col:'#2dd4bf',              lbl:'Desk'},
  admin_duty:   {bg:'rgba(251,191,36,.16)',   bd:'#fbbf24',               col:'#fde047',              lbl:'Admin'},
  called_in:    {bg:'rgba(34,197,94,.08)',    bd:'rgba(34,197,94,.45)',    col:'rgba(134,239,172,.8)', lbl:'Called'},
  half_day:     {bg:'rgba(234,179,8,.16)',    bd:'#eab308',               col:'#facc15',              lbl:'½ Day'},
  off:          {bg:'rgba(100,116,139,.1)',   bd:'rgba(100,116,139,.4)',   col:'#94a3b8',              lbl:'Off'},
  rdo:          {bg:'rgba(148,163,184,.08)',  bd:'rgba(148,163,184,.3)',   col:'#64748b',              lbl:'RDO'},
  leave:        {bg:'rgba(245,158,11,.15)',   bd:'#f59e0b',               col:'#fbbf24',              lbl:'AL'},
  sick:         {bg:'rgba(239,68,68,.15)',    bd:'#ef4444',               col:'#f87171',              lbl:'Sick'},
  training:     {bg:'rgba(99,102,241,.16)',   bd:'#818cf8',               col:'#a5b4fc',              lbl:'Train'},
  other:        {bg:'rgba(148,163,184,.08)',  bd:'rgba(148,163,184,.25)', col:'#94a3b8',              lbl:'?'},
};
var ROSTER_ORDER=['','on','c208b','ga8','desk','admin_duty','called_in','half_day','off','rdo','leave','sick','training','other'];
var ROSTER_WORKING=new Set(['on','c208b','ga8','desk','admin_duty','called_in','half_day']);

// ── Role groups ──
var ROLE_GROUPS=[
  {key:'pilot',    label:'Pilots',   roles:['pilot'],              col:'#7B9EC6'},
  {key:'desk',     label:'Desk',     roles:['desk','cx_manager'],  col:'#10b981'},
  {key:'admin',    label:'Admin',    roles:['admin','superadmin'], col:'#f59e0b'},
  {key:'ground',   label:'Ground',   roles:['ground_staff'],       col:'#64748b'},
  {key:'maint',    label:'Maint',    roles:['maint','maintenance'],col:'#a78bfa'},
  {key:'accounts', label:'Accounts', roles:['accounts'],           col:'#06b6d4'},
  {key:'marketing',label:'Marketing',roles:['marketing'],          col:'#ec4899'},
];

// ── Helpers ──
function _rMonday(d){var dd=new Date(d);dd.setHours(0,0,0,0);var dy=dd.getDay();dd.setDate(dd.getDate()+(dy===0?-6:1-dy));return dd;}
function _rThursday(d){var dd=new Date(d);dd.setHours(0,0,0,0);dd.setDate(dd.getDate()-((dd.getDay()+3)%7));return dd;}
function _rIso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _rGetStatus(u,ds,roster){
  var _ini=(u.name||'').split(/\s+/).map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2);
  var st=(roster[ds]&&(roster[ds][u.id]||roster[ds][_ini]))||'';
  var _lvReq=S._rosterLeave&&S._rosterLeave[ds]&&S._rosterLeave[ds][u.id];
  if(_lvReq){var _lvMap={annual:'leave',sick:'sick',unpaid:'leave',other:'training'};st=_lvMap[_lvReq]||'leave';}
  return st;
}
function _rIni(u){return (u.name||'').split(/\s+/).map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2);}

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
  var h='<div class="card" style="padding:0;overflow:hidden">';
  h+='<div style="display:flex;align-items:center;border-bottom:2px solid var(--border2)">';
  h+=_rTabBtn('📅 Roster','view',tab==='view');
  h+=_rTabBtn('🔨 Build Pattern','build',tab==='build');
  h+='<div style="flex:1"></div>';
  if(S._rosterSaved){h+='<span style="font-size:11px;color:#4ade80;font-weight:600;margin-right:12px">✓ Saved</span>';}
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
  var canEdit=isAdminPlus&&!S.rosterLocked;
  var today=new Date();today.setHours(0,0,0,0);
  var todayStr=_rIso(today);
  var MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DNAMES=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var filter=S.rosterFilter||'all';

  if(!S.rosterWeek){
    S.rosterWeek=_rIso(filter==='accounts'?_rThursday(today):_rMonday(today));
  }
  var weekStart=new Date(S.rosterWeek+'T00:00:00');
  var days=[];
  for(var _i=0;_i<7;_i++){var _d=new Date(weekStart);_d.setDate(_d.getDate()+_i);days.push(_d);}
  var prevStart=new Date(weekStart);prevStart.setDate(prevStart.getDate()-7);
  var nextStart=new Date(weekStart);nextStart.setDate(nextStart.getDate()+7);
  var d0=days[0],d6=days[6];
  var wkLbl=d0.getDate()+' '+MONTHS[d0.getMonth()]+(d0.getFullYear()!==d6.getFullYear()?' '+d0.getFullYear():'')+' – '+d6.getDate()+' '+MONTHS[d6.getMonth()]+' '+d6.getFullYear();

  var allUsers=(S.users||[]).filter(function(u){return u.id&&u.name&&!u.inactive;});
  var displayUsers=allUsers;
  if(filter!=='all'){
    var grp=ROLE_GROUPS.filter(function(g){return g.key===filter;})[0];
    if(grp)displayUsers=allUsers.filter(function(u){return grp.roles.indexOf(u.role)>=0;});
  }
  var roleOrder={superadmin:0,admin:1,pilot:2,desk:3,cx_manager:3,accounts:4,marketing:5,maint:6,maintenance:6,ground_staff:7};
  displayUsers=displayUsers.slice().sort(function(a,b){return (roleOrder[a.role]||9)-(roleOrder[b.role]||9)||(a.name||'').localeCompare(b.name||'');});
  var roster=S.roster||{};

  function _dayTots(ds){
    var t={};
    ROLE_GROUPS.forEach(function(g){t[g.key]=0;});
    allUsers.forEach(function(u){
      var st=_rGetStatus(u,ds,roster);
      var raw=st&&st.indexOf('other:')===0?'other':st;
      if(ROSTER_WORKING.has(raw)){
        ROLE_GROUPS.forEach(function(g){if(g.roles.indexOf(u.role)>=0)t[g.key]++;});
      }
    });
    return t;
  }

  // ── Toolbar ──
  var h='';
  h+='<div style="padding:10px 14px;border-bottom:1px solid var(--border2);display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--card)">';
  h+='<input type="date" value="'+S.rosterWeek+'" onchange="S.rosterWeek=this.value;S._rosterLeaveWeek=null;render()" style="padding:5px 8px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text1);font-size:12px">';
  h+='<button tabindex="-1" onclick="S.rosterWeek=\''+_rIso(prevStart)+'\';S._rosterLeaveWeek=null;render()" style="padding:5px 12px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:13px;cursor:pointer">‹</button>';
  h+='<span style="font-size:13px;font-weight:700;color:var(--text1);white-space:nowrap">'+wkLbl+'</span>';
  h+='<button tabindex="-1" onclick="S.rosterWeek=\''+_rIso(nextStart)+'\';S._rosterLeaveWeek=null;render()" style="padding:5px 12px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:13px;cursor:pointer">›</button>';
  h+='<button tabindex="-1" onclick="S.rosterWeek=null;S._rosterLeaveWeek=null;render()" style="padding:5px 10px;border-radius:8px;border:1px solid rgba(167,139,250,.4);background:rgba(167,139,250,.08);color:#a78bfa;font-size:11px;font-weight:700;cursor:pointer">Today</button>';
  h+='<select onchange="S.rosterFilter=this.value;S.rosterWeek=null;render()" style="padding:5px 8px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text1);font-size:12px;cursor:pointer;margin-left:4px">';
  h+='<option value="all"'+(filter==='all'?' selected':'')+'>All Staff</option>';
  ROLE_GROUPS.forEach(function(g){h+='<option value="'+g.key+'"'+(filter===g.key?' selected':'')+'>'+g.label+'</option>';});
  h+='</select>';
  if(isAdminPlus){
    var lk=!!S.rosterLocked;
    h+='<button tabindex="-1" onclick="S.rosterLocked=!S.rosterLocked;render()" style="padding:5px 10px;border-radius:8px;border:1px solid '+(lk?'#f59e0b':'var(--border2)')+';background:'+(lk?'rgba(245,158,11,.12)':'var(--card2)')+';color:'+(lk?'#fbbf24':'var(--text3)')+';font-size:12px;cursor:pointer" title="Toggle roster lock">'+(lk?'🔒 Locked':'🔓 Unlock')+'</button>';
    if(!lk){h+='<button tabindex="-1" onclick="window.saveRosterToCloud()" style="padding:5px 12px;border-radius:8px;border:none;background:var(--acc);color:#fff;font-size:12px;font-weight:700;cursor:pointer">Save</button>';}
  }
  h+='</div>';

  // ── Table ──
  h+='<div style="overflow:auto">';
  h+='<table style="width:100%;border-collapse:collapse;min-width:560px">';

  // Sticky header
  h+='<thead style="position:sticky;top:0;z-index:20">';
  h+='<tr style="background:#0d1526">';
  h+='<th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:var(--text3);min-width:155px;position:sticky;left:0;z-index:21;background:#0d1526;border-right:1px solid rgba(255,255,255,.07)">Crew</th>';
  days.forEach(function(d,i){
    var ds=_rIso(d),isTdy=ds===todayStr,isWe=i>=5;
    h+='<th style="padding:5px 3px;text-align:center;min-width:66px;background:'+(isTdy?'rgba(124,58,237,.14)':'#0d1526')+';border-bottom:1px solid rgba(255,255,255,.05)">';
    h+='<div style="font-size:10px;font-weight:700;color:'+(isTdy?'#a78bfa':(isWe?'rgba(255,255,255,.28)':'var(--text3)'))+'">'+DNAMES[i]+'</div>';
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
      var members=displayUsers.filter(function(u){return g.roles.indexOf(u.role)>=0;});
      if(members.length)grouped.push({g:g,members:members});
    });
    var ungrouped=displayUsers.filter(function(u){return !ROLE_GROUPS.some(function(g){return g.roles.indexOf(u.role)>=0;});});
    if(ungrouped.length)grouped.push({g:{key:'other',label:'Other',col:'#94a3b8'},members:ungrouped});

    grouped.forEach(function(grp){
      h+='<tr style="background:rgba(255,255,255,.025)">';
      h+='<td colspan="8" style="padding:4px 12px;font-size:10px;font-weight:800;color:'+grp.g.col+';text-transform:uppercase;letter-spacing:.08em;position:sticky;left:0">'+grp.g.label+'</td>';
      h+='</tr>';

      grp.members.forEach(function(u){
        var ini=_rIni(u);
        var rc=ROLE_GROUPS.filter(function(g2){return g2.roles.indexOf(u.role)>=0;})[0];
        var rowCol=rc?rc.col:'#94a3b8';
        var isPilot=u.role==='pilot';
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
          var otherNote=isOther?st.slice(6):'';
          var cfg=ROSTER_SC[rawSt]||ROSTER_SC[''];
          var dispLbl=isOther?(otherNote||'?'):cfg.lbl;
          h+='<td style="padding:3px 2px;text-align:center;background:'+(isTdy?'rgba(124,58,237,.06)':(isWe?'rgba(255,255,255,.01)':'transparent'))+'">';
          if(canEdit){
            h+='<select tabindex="-1" onchange="window.rosterSet(\''+u.id+'\',\''+ini+'\',\''+ds+'\',this.value)" title="'+(isOther?otherNote:'')+'" style="appearance:none;-webkit-appearance:none;padding:4px 3px;border-radius:6px;border:1px solid '+(st?cfg.bd:'rgba(255,255,255,.06)')+';background:'+(st?cfg.bg:'transparent')+';color:'+(st?cfg.col:'rgba(255,255,255,.15)')+';font-size:11px;font-weight:700;cursor:pointer;width:62px;text-align:center">';
            ROSTER_ORDER.forEach(function(s){
              var c=ROSTER_SC[s];
              h+='<option value="'+s+'"'+(rawSt===s?' selected':'')+'>'+c.lbl+'</option>';
            });
            h+='</select>';
            if(isOther&&otherNote){h+='<div style="font-size:8px;color:#94a3b8;line-height:1;margin-top:1px;max-width:62px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+otherNote+'</div>';}
          } else {
            h+='<span'+(isOther?' title="'+otherNote+'"':'')+' style="display:inline-block;padding:4px 3px;border-radius:6px;border:1px solid '+(st?cfg.bd:'rgba(255,255,255,.04)')+';background:'+(st?cfg.bg:'transparent')+';color:'+(st?cfg.col:'rgba(255,255,255,.1)')+';font-size:11px;font-weight:700;min-width:56px">'+dispLbl+'</span>';
          }
          h+='</td>';
        });
        h+='</tr>';
      });
    });
  }
  h+='</tbody></table></div>';

  // Legend
  h+='<div style="padding:8px 14px;border-top:1px solid var(--border2);display:flex;gap:5px;flex-wrap:wrap;align-items:center">';
  ROSTER_ORDER.filter(function(s){return s!=='';}).forEach(function(s){
    var c=ROSTER_SC[s];
    h+='<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;border:1px solid '+c.bd+';background:'+c.bg+';color:'+c.col+'">'+c.lbl+'</span>';
  });
  h+='</div>';
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

  var bs=S.rosterBuild||(S.rosterBuild={});
  if(!bs.startDate)bs.startDate=_rIso(_rMonday(today));
  if(!bs.weeks)bs.weeks=4;
  if(!bs.template)bs.template={};

  var h='<div style="padding:14px">';
  h+='<div style="font-size:12px;color:var(--text3);margin-bottom:12px;padding:10px 14px;border-radius:8px;border:1px solid var(--border2);background:rgba(124,58,237,.06)">Design a template week below. Click Apply to stamp it forward. Existing leave &amp; sick entries are never overwritten.</div>';

  h+='<div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:14px">';
  h+='<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:3px">Apply from date</label><input type="date" value="'+bs.startDate+'" onchange="S.rosterBuild.startDate=this.value" style="padding:6px 8px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text1);font-size:12px"></div>';
  h+='<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:3px">Weeks to fill</label><input type="number" value="'+bs.weeks+'" min="1" max="52" onchange="S.rosterBuild.weeks=Math.max(1,parseInt(this.value)||1)" style="padding:6px 8px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text1);font-size:12px;width:72px"></div>';
  h+='<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:3px">Quick-fill person</label><select id="qf-user" style="padding:6px 8px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text1);font-size:12px;cursor:pointer"><option value="">Select...</option>';
  allUsers.forEach(function(u){h+='<option value="'+u.id+'">'+u.name+'</option>';});
  h+='</select></div>';
  h+='<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:3px">Pattern</label><select id="qf-pat" style="padding:6px 8px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text1);font-size:12px;cursor:pointer">';
  h+='<option value="5on2off">5 on / 2 off (Mon–Fri)</option>';
  h+='<option value="4on3off_mth">4 on / 3 off (Mon–Thu)</option>';
  h+='<option value="4on3off_tfs">4 on / 3 off (Thu–Sun)</option>';
  h+='<option value="set_mth">Set days: Mon–Thu on</option>';
  h+='<option value="set_fssu">Set days: Fri–Sun on</option>';
  h+='<option value="all_rdo">All RDO</option>';
  h+='</select></div>';
  h+='<button tabindex="-1" onclick="window.rosterQuickFill()" style="padding:7px 14px;border-radius:8px;border:none;background:#7c3aed;color:#fff;font-size:12px;font-weight:700;cursor:pointer;align-self:flex-end">Fill ›</button>';
  h+='</div>';

  h+='<div style="overflow:auto;border:1px solid var(--border2);border-radius:10px;margin-bottom:14px">';
  h+='<table style="width:100%;border-collapse:collapse;min-width:560px">';
  h+='<thead><tr style="background:rgba(255,255,255,.04);border-bottom:1px solid var(--border2)">';
  h+='<th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:var(--text3);min-width:155px">Name</th>';
  DNAMES.forEach(function(dn){h+='<th style="padding:6px 3px;text-align:center;font-size:11px;font-weight:700;color:var(--text3);min-width:66px">'+dn+'</th>';});
  h+='</tr></thead><tbody>';

  if(!allUsers.length){
    h+='<tr><td colspan="8" style="padding:20px;text-align:center;color:var(--text3)">No users.</td></tr>';
  } else {
    allUsers.forEach(function(u){
      var rc=ROLE_GROUPS.filter(function(g){return g.roles.indexOf(u.role)>=0;})[0];
      var rowCol=rc?rc.col:'#94a3b8';
      var ini=_rIni(u);
      h+='<tr style="border-top:1px solid rgba(255,255,255,.04)">';
      h+='<td style="padding:5px 10px;white-space:nowrap"><div style="font-size:12px;font-weight:600;color:var(--text1)">'+u.name+'</div><span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;background:'+rowCol+'1a;color:'+rowCol+'">'+ini+'</span></td>';
      for(var di=0;di<7;di++){
        var tst=(bs.template[di]&&bs.template[di][u.id])||'';
        var cfg=ROSTER_SC[tst]||ROSTER_SC[''];
        h+='<td style="padding:3px 2px;text-align:center">';
        h+='<select tabindex="-1" onchange="window.rosterTplSet('+di+',\''+u.id+'\',this.value)" style="appearance:none;-webkit-appearance:none;padding:4px 3px;border-radius:6px;border:1px solid '+(tst?cfg.bd:'rgba(255,255,255,.06)')+';background:'+(tst?cfg.bg:'transparent')+';color:'+(tst?cfg.col:'rgba(255,255,255,.15)')+';font-size:11px;font-weight:700;cursor:pointer;width:62px;text-align:center">';
        ROSTER_ORDER.forEach(function(s){var c=ROSTER_SC[s];h+='<option value="'+s+'"'+(tst===s?' selected':'')+'>'+c.lbl+'</option>';});
        h+='</select>';
        h+='</td>';
      }
      h+='</tr>';
    });
  }
  h+='</tbody></table></div>';

  var endD=new Date((bs.startDate||_rIso(today))+'T00:00:00');
  endD.setDate(endD.getDate()+(bs.weeks||4)*7-1);
  var MTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var endLabel=endD.getDate()+' '+MTHS[endD.getMonth()]+' '+endD.getFullYear();
  var configDays=Object.keys(bs.template).filter(function(k){return Object.keys(bs.template[k]||{}).length>0;}).length;
  h+='<div style="display:flex;gap:10px;align-items:center">';
  h+='<button tabindex="-1" onclick="window.rosterApplyPattern()" style="padding:10px 22px;border-radius:10px;border:none;background:#7c3aed;color:#fff;font-size:13px;font-weight:700;cursor:pointer">Apply → '+endLabel+'</button>';
  h+='<button tabindex="-1" onclick="if(confirm(\'Clear template?\'))S.rosterBuild.template={};render()" style="padding:10px 16px;border-radius:10px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:13px;cursor:pointer">Clear</button>';
  h+='<span style="font-size:12px;color:var(--text3)">'+((bs.weeks)||4)+' week'+((bs.weeks||4)!==1?'s':'')+' • '+configDays+' days configured</span>';
  h+='</div></div>';
  return h;
}

// ── Window functions ──

window.rosterSet=function(uid,ini,ds,val){
  if(val==='other'){
    var note=prompt('Custom status note:','');
    if(note===null){render();return;}
    val=note?'other:'+note:'';
  }
  if(!S.roster)S.roster={};
  if(!S.roster[ds])S.roster[ds]={};
  if(val){S.roster[ds][uid]=val;if(ini)S.roster[ds][ini]=val;}
  else{delete S.roster[ds][uid];if(ini)delete S.roster[ds][ini];}
  S._rosterSaved=false;
  lsSet('ts_roster',S.roster);
  render();
};

window.rosterTplSet=function(di,uid,val){
  if(!S.rosterBuild)S.rosterBuild={};
  if(!S.rosterBuild.template)S.rosterBuild.template={};
  if(!S.rosterBuild.template[di])S.rosterBuild.template[di]={};
  if(val)S.rosterBuild.template[di][uid]=val;
  else delete S.rosterBuild.template[di][uid];
  render();
};

window.rosterQuickFill=function(){
  var el=document.getElementById('qf-user');
  var pe=document.getElementById('qf-pat');
  if(!el||!el.value||!pe)return;
  var uid=el.value;
  var pat=pe.value;
  var PATS={
    '5on2off':      ['on','on','on','on','on','rdo','rdo'],
    '4on3off_mth':  ['on','on','on','on','off','rdo','rdo'],
    '4on3off_tfs':  ['rdo','rdo','rdo','on','on','on','on'],
    'set_mth':      ['on','on','on','on','off','rdo','rdo'],
    'set_fssu':     ['rdo','rdo','rdo','rdo','on','on','on'],
    'all_rdo':      ['rdo','rdo','rdo','rdo','rdo','rdo','rdo'],
  };
  var days=PATS[pat]||PATS['5on2off'];
  if(!S.rosterBuild)S.rosterBuild={};
  if(!S.rosterBuild.template)S.rosterBuild.template={};
  for(var di=0;di<7;di++){
    if(!S.rosterBuild.template[di])S.rosterBuild.template[di]={};
    S.rosterBuild.template[di][uid]=days[di];
  }
  render();
};

window.rosterApplyPattern=function(){
  var bs=S.rosterBuild||{};
  var tpl=bs.template||{};
  var startStr=bs.startDate;
  var weeks=bs.weeks||4;
  if(!startStr){alert('Set a start date.');return;}
  var startD=new Date(startStr+'T00:00:00');
  if(isNaN(startD.getTime())){alert('Invalid start date.');return;}
  var PROTECTED=new Set(['leave','sick']);
  if(!S.roster)S.roster={};
  var count=0;
  for(var w=0;w<weeks;w++){
    for(var di=0;di<7;di++){
      var d=new Date(startD);
      d.setDate(d.getDate()+w*7+di);
      var ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      if(!S.roster[ds])S.roster[ds]={};
      var dayTpl=tpl[di]||{};
      Object.keys(dayTpl).forEach(function(uid){
        var newSt=dayTpl[uid];
        if(!newSt)return;
        var ex=S.roster[ds][uid]||'';
        var exRaw=ex.indexOf('other:')===0?'other':ex;
        if(PROTECTED.has(exRaw))return;
        S.roster[ds][uid]=newSt;
        count++;
      });
    }
  }
  lsSet('ts_roster',S.roster);
  window.saveRosterToCloud();
  alert('Applied '+count+' cells across '+weeks+' week'+(weeks!==1?'s':'')+'. Saved to cloud.');
  S.rosterTab='view';
  S.rosterWeek=startStr;
  render();
};

window.saveRosterToCloud=async function(){
  try{
    await sbU('ts_settings',[{key:'roster',value:JSON.stringify(S.roster||{})}]);
    S._rosterSaved=true;render();
    setTimeout(function(){S._rosterSaved=false;render();},3000);
  }catch(e){toast('Roster save failed','err');}
};

window.loadRosterFromCloud=async function(){
  try{
    var r=await fetch(SB+'/rest/v1/ts_settings?key=eq.roster&select=value',{headers:SH});
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
