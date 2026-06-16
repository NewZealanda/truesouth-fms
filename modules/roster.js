// === MODULE: roster.js v1.0 ===
function renderRoster(){
  // Auto-load on first visit per session
  if(!S._rosterLoaded){
    S._rosterLoaded=true;
    var _loc=lsGet('ts_roster');
    if(_loc&&typeof _loc==='object')S.roster=_loc;
    window.loadRosterFromCloud();
  }
  // Load approved leave for this week from ts_leave_requests
  if(!S._rosterLeaveWeek||S._rosterLeaveWeek!==S.rosterWeek){
    S._rosterLeaveWeek=S.rosterWeek||null;
    window.loadRosterLeave&&window.loadRosterLeave();
  }

  const role=S.user?.role||'desk';
  const _isAdminPlus=role==='superadmin'||role==='admin';

  // Week navigation
  function _monday(d){var dd=new Date(d);dd.setHours(0,0,0,0);var dy=dd.getDay();dd.setDate(dd.getDate()+(dy===0?-6:1-dy));return dd;}
  function _iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  var today=new Date();today.setHours(0,0,0,0);
  var curMon=_monday(today);
  var weekStart=S.rosterWeek?new Date(S.rosterWeek+'T00:00:00'):curMon;
  S.rosterWeek=_iso(weekStart);
  var curMonStr=_iso(curMon);

  var days=[],DNAMES=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for(var _i=0;_i<7;_i++){var _d=new Date(weekStart);_d.setDate(_d.getDate()+_i);days.push(_d);}
  var prevMon=new Date(weekStart);prevMon.setDate(prevMon.getDate()-7);
  var nextMon=new Date(weekStart);nextMon.setDate(nextMon.getDate()+7);

  // Week label
  var d0=days[0],d6=days[6];
  var wkLbl=d0.getDate()+' '+MONTHS[d0.getMonth()]+(d0.getFullYear()!==d6.getFullYear()?' '+d0.getFullYear():'')+' – '+d6.getDate()+' '+MONTHS[d6.getMonth()]+' '+d6.getFullYear();

  // Users
  var roleOrder={superadmin:0,admin:1,pilot:2,desk:3,maint:4,maintenance:4,ground_staff:5};
  var roleLabel={superadmin:'Super Admin',admin:'Admin',pilot:'Pilot',desk:'Desk',maint:'Maint',maintenance:'Maint',ground_staff:'Ground'};
  var roleCol={superadmin:'#f43f5e',admin:'#f59e0b',pilot:'#7B9EC6',desk:'#10b981',maint:'#a78bfa',maintenance:'#a78bfa',ground_staff:'#64748b'};
  var users=(S.users||[]).filter(function(u){return u.id&&u.name;}).slice().sort(function(a,b){
    return (roleOrder[a.role]||9)-(roleOrder[b.role]||9)||(a.name||'').localeCompare(b.name||'');
  });

  // Status config
  var CYCLE=['','on','leave','sick','training'];
  var SC={
    '':       {bg:'transparent',           bd:'rgba(255,255,255,.1)', col:'rgba(255,255,255,.25)',lbl:'—'},
    on:       {bg:'rgba(34,197,94,.15)',    bd:'#22c55e',              col:'#22c55e',             lbl:'On'},
    leave:    {bg:'rgba(245,158,11,.14)',   bd:'#f59e0b',              col:'#f59e0b',             lbl:'AL'},
    sick:     {bg:'rgba(239,68,68,.14)',    bd:'#ef4444',              col:'#ef4444',             lbl:'Sick'},
    training: {bg:'rgba(99,102,241,.15)',   bd:'#818cf8',              col:'#818cf8',             lbl:'Train'},
  };

  var roster=S.roster||{};
  var todayStr=_iso(today);

  // Header row
  var hd='<th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:var(--text3);white-space:nowrap;min-width:130px">Crew</th>';
  days.forEach(function(d,i){
    var ds=_iso(d),isToday=ds===todayStr,isWe=i>=5;
    hd+='<th style="padding:6px 4px;text-align:center;min-width:56px;font-size:11px;font-weight:700;color:'+(isToday?'#a78bfa':(isWe?'rgba(255,255,255,.3)':'var(--text3)'))+'">'
      +DNAMES[i]+'<br><span style="font-size:14px;font-weight:800;color:'+(isToday?'#a78bfa':'var(--text1)')+'">'+d.getDate()+'</span></th>';
  });

  // Body rows
  var rows='';
  if(!users.length){
    rows='<tr><td colspan="8" style="padding:28px;text-align:center;color:var(--text3);font-size:13px">No users found — check Admin › People.</td></tr>';
  } else {
    users.forEach(function(u){
      var rc=roleCol[u.role]||'#64748b',rl=roleLabel[u.role]||u.role;
      var cells='<td style="padding:7px 12px;white-space:nowrap;border-right:1px solid rgba(255,255,255,.05)">'
        +'<div style="font-size:13px;font-weight:600;color:var(--text1);line-height:1.2">'+u.name+'</div>'
        +'<span style="font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;background:'+rc+'22;color:'+rc+'">'+rl+'</span>'
        +'</td>';
      days.forEach(function(d,i){
        var ds=_iso(d);
        var _ini=(u.name||'').split(/\s+/).map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2);var st=(roster[ds]&&(roster[ds][u.id]||roster[ds][_ini]))||'';var _lvReq=S._rosterLeave&&S._rosterLeave[ds]&&S._rosterLeave[ds][u.id];if(_lvReq){var _lvMap={annual:'leave',sick:'sick',unpaid:'leave',other:'training'};st=_lvMap[_lvReq]||'leave';}
        var cfg=SC[st]||SC[''];
        var isWe=i>=5,isToday=ds===todayStr;
        var cellBg=isToday?'rgba(167,139,250,.04)':(isWe?'rgba(255,255,255,.015)':'');
        if(_isAdminPlus){
          cells+='<td style="padding:3px 4px;text-align:center'+(cellBg?';background:'+cellBg:'')+'">'
            +'<button onclick="window.rosterCycle(\''+ds+'\',\''+u.id+'\')" style="width:100%;min-width:46px;padding:5px 3px;border-radius:7px;border:1.5px solid '+cfg.bd+';background:'+cfg.bg+';color:'+cfg.col+';font-size:11px;font-weight:700;cursor:pointer">'+cfg.lbl+'</button>'
            +'</td>';
        } else {
          cells+='<td style="padding:3px 4px;text-align:center'+(cellBg?';background:'+cellBg:'')+'">'
            +'<div style="min-width:46px;padding:5px 3px;border-radius:7px;border:1.5px solid '+cfg.bd+';background:'+cfg.bg+';color:'+cfg.col+';font-size:11px;font-weight:700;text-align:center">'+cfg.lbl+'</div>'
            +'</td>';
        }
      });
      rows+='<tr style="border-bottom:1px solid rgba(255,255,255,.04)">'+cells+'</tr>';
    });
  }

  // Legend
  var lgd='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06)">'
    +'<span style="font-size:11px;color:var(--text3);font-weight:600;margin-right:2px">Legend:</span>';
  CYCLE.slice(1).forEach(function(s){var c=SC[s];lgd+='<span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;border:1.5px solid '+c.bd+';background:'+c.bg+';color:'+c.col+'">'+c.lbl+'</span>';});
  lgd+='</div>';

  // Save button (admin only)
  var saveBtn=_isAdminPlus
    ?'<div style="margin-top:14px"><button onclick="window.saveRosterToCloud()" style="padding:8px 20px;background:var(--acc);border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:700;cursor:pointer">Save Roster</button>'
      +(S._rosterSaved?'<span style="margin-left:10px;font-size:12px;color:#4ade80;font-weight:600">✓ Saved</span>':'')+'</div>'
    :'';

  // Week nav
  var nav='<div class="card" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
    +'<button onclick="S.rosterWeek=\''+_iso(prevMon)+'\';render()" style="padding:7px 14px;border-radius:8px;border:1px solid var(--border2);background:transparent;color:var(--text2);font-size:13px;font-weight:700;cursor:pointer">‹ Prev</button>'
    +'<div style="flex:1;text-align:center"><div style="font-size:13px;font-weight:700;color:var(--text1)">'+wkLbl+'</div></div>'
    +(S.rosterWeek!==curMonStr?'<button onclick="S.rosterWeek=\''+curMonStr+'\';render()" style="padding:7px 10px;border-radius:8px;border:1px solid rgba(167,139,250,.4);background:rgba(167,139,250,.1);color:#a78bfa;font-size:11px;font-weight:700;cursor:pointer">This week</button>':'')
    +'<button onclick="S.rosterWeek=\''+_iso(nextMon)+'\';render()" style="padding:7px 14px;border-radius:8px;border:1px solid var(--border2);background:transparent;color:var(--text2);font-size:13px;font-weight:700;cursor:pointer">Next ›</button>'
    +'</div>';

  return nav
    +'<div class="card" style="overflow-x:auto">'
    +'<table style="width:100%;border-collapse:collapse;min-width:500px">'
    +'<thead><tr style="border-bottom:2px solid var(--border)">'+hd+'</tr></thead>'
    +'<tbody>'+rows+'</tbody>'
    +'</table>'
    +lgd
    +saveBtn
    +'</div>';
}

window.rosterCycle=function(dateStr,userId){
  if(!S.roster)S.roster={};
  if(!S.roster[dateStr])S.roster[dateStr]={};
  var CYCLE=['','on','leave','sick','training'];
  var cur=S.roster[dateStr][userId]||'';
  var next=CYCLE[(CYCLE.indexOf(cur)+1)%CYCLE.length];
  if(next==='')delete S.roster[dateStr][userId];
  else S.roster[dateStr][userId]=next;
  S._rosterSaved=false;
  lsSet('ts_roster',S.roster);
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
    var r=await fetch(SB+'/rest/v1/ts_leave_requests?status=eq.approved&start_date=lte.'+weekEnd+'&end_date=gte.'+weekStart,{headers:SH});
    if(!r.ok)return;
    var rows=await r.json();
    // Build {dateISO:{userId:leaveType}} lookup for the week
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
