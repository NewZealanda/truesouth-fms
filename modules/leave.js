// === MODULE: leave.js v1.0 ===

var LEAVE_TYPES=[
  {id:'annual', lbl:'Annual Leave',  icon:'🌴'},
  {id:'sick',   lbl:'Sick Leave',    icon:'🤒'},
  {id:'unpaid', lbl:'Unpaid Leave',  icon:'💸'},
  {id:'other',  lbl:'Other',         icon:'📝'}
];
var LEAVE_SC={
  pending:  {bg:'rgba(245,158,11,.14)', bd:'#f59e0b', col:'#f59e0b', lbl:'Pending'},
  approved: {bg:'rgba(34,197,94,.15)',  bd:'#22c55e', col:'#22c55e', lbl:'Approved'},
  declined: {bg:'rgba(239,68,68,.14)',  bd:'#ef4444', col:'#ef4444', lbl:'Declined'},
  withdrawn:{bg:'rgba(100,116,139,.14)',bd:'#64748b', col:'#64748b', lbl:'Withdrawn'}
};

function _lvEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _lvDays(s,e){if(!s||!e)return 0;return Math.round((new Date(e+'T00:00:00')-new Date(s+'T00:00:00'))/86400000)+1;}
// Count the actual leave days used = days in range the person is rostered ON
// (excludes RDOs / days already off per the roster).
function _lvWorkingDays(userId,s,e){
  if(!s||!e)return 0;
  var roster=S.roster||{};
  var u=(S.users||[]).find(function(x){return x.id===userId;})||{id:userId,name:''};
  var off={rdo:1,off:1};
  var ini=(typeof _rCode==='function')?_rCode(u):'';
  var cur=new Date(s+'T00:00:00'),end=new Date(e+'T00:00:00'),n=0,guard=0;
  while(cur<=end&&guard++<3660){
    var ds=(typeof _rIso==='function')?_rIso(cur):cur.toISOString().slice(0,10);
    // Read the PERSISTED roster only — never the unsaved draft or leave overlay —
    // so a stored leave-day total is deterministic regardless of transient UI state.
    var st=(roster[ds]&&(roster[ds][userId]||(ini&&roster[ds][ini])))||'';
    if(!off[st])n++;
    cur.setDate(cur.getDate()+1);
  }
  return n;
}
// RDO/off days within a range (the days NOT counted against leave).
function _lvRdoDays(userId,s,e){return Math.max(0,_lvDays(s,e,false)-_lvWorkingDays(userId,s,e));}
// Conflicts straight from the ROSTER (catches leave that was imported/added directly
// on the calendar, not just in-app leave requests). Returns who is on AL/UL/Sick during the range.
function _lvRosterConflicts(req){
  var out=[];var roster=S.roster||{};
  if(!req||!req.start_date||!req.end_date)return out;
  var away={leave:'Annual',ul:'Unpaid',sick:'Sick'};
  var users=(S.users||[]).filter(function(u){return u&&!u.inactive&&u.id!==req.user_id;});
  var s=new Date(req.start_date+'T00:00:00'),e=new Date(req.end_date+'T00:00:00');
  users.forEach(function(u){
    var ini=(typeof _rCode==='function')?_rCode(u):'';
    var hitDays=[],code=null;
    for(var d=new Date(s);d<=e;d.setDate(d.getDate()+1)){
      var ds=(typeof _rIso==='function')?_rIso(d):d.toISOString().slice(0,10);
      var st=(roster[ds]&&(roster[ds][u.id]||(ini&&roster[ds][ini])))||'';
      if(typeof st==='string'&&st.indexOf('other:')===0)st='other';
      if(away[st]){hitDays.push(ds);code=st;}
    }
    if(hitDays.length)out.push({name:u.name||u.email||'Unknown',role:u.role||'',code:code,label:away[code],days:hitDays});
  });
  return out;
}
// Auto-stamp an approved leave onto the persisted roster (so it shows on the roster and is
// caught by future conflict checks). Skips days already RDO/off; writes by user id.
async function _lvStampRoster(req){
  if(!req||!req.start_date||!req.end_date||!req.user_id)return;
  // Make sure we stamp onto the real persisted roster, not an empty one.
  if((!S.roster||!Object.keys(S.roster).length)&&typeof window.loadRosterFromCloud==='function'){
    try{await window.loadRosterFromCloud();}catch(e){}
  }
  var _lvMap={annual:'leave',sick:'sick',unpaid:'leave',other:'training'};
  var code=_lvMap[req.leave_type]||'leave';
  if(!S.roster)S.roster={};
  var off={rdo:1,off:1};
  var cur=new Date(req.start_date+'T00:00:00'),end=new Date(req.end_date+'T00:00:00'),guard=0,changed=false;
  while(cur<=end&&guard++<3660){
    var ds=(typeof _rIso==='function')?_rIso(cur):cur.toISOString().slice(0,10);
    if(!S.roster[ds])S.roster[ds]={};
    var ex=S.roster[ds][req.user_id]||'';
    if(typeof ex==='string'&&ex.indexOf('other:')===0)ex='other';
    if(!off[ex]&&ex!==code){S.roster[ds][req.user_id]=code;changed=true;}
    cur.setDate(cur.getDate()+1);
  }
  if(changed){
    lsSet('ts_roster',S.roster);
    var res=await sbU('ts_settings',[{key:'roster',value:JSON.stringify(S.roster||{})}]);
    if(res===null)toast('Leave approved, but the roster auto-stamp didn’t save — add it on the roster manually.','warn');
  }
}
// Reverse an auto-stamp: clear the leave code from the roster for this request's days/user,
// restoring the day to its working/empty state. Only clears cells that STILL hold the
// stamped code (won't wipe a manual change made since).
async function _lvUnstampRoster(req){
  if(!req||!req.start_date||!req.end_date||!req.user_id)return;
  if((!S.roster||!Object.keys(S.roster).length)&&typeof window.loadRosterFromCloud==='function'){
    try{await window.loadRosterFromCloud();}catch(e){}
  }
  if(!S.roster)return;
  var _lvMap={annual:'leave',sick:'sick',unpaid:'leave',other:'training'};
  var code=_lvMap[req.leave_type]||'leave';
  var cur=new Date(req.start_date+'T00:00:00'),end=new Date(req.end_date+'T00:00:00'),guard=0,changed=false;
  while(cur<=end&&guard++<3660){
    var ds=(typeof _rIso==='function')?_rIso(cur):cur.toISOString().slice(0,10);
    if(S.roster[ds]&&S.roster[ds][req.user_id]===code){delete S.roster[ds][req.user_id];changed=true;}
    cur.setDate(cur.getDate()+1);
  }
  if(changed){
    lsSet('ts_roster',S.roster);
    var res=await sbU('ts_settings',[{key:'roster',value:JSON.stringify(S.roster||{})}]);
    if(res===null)toast('Leave removed, but the roster un-stamp didn’t save — adjust the roster manually.','warn');
  }
}
function _lvFmt(ds){if(!ds)return '';var d=new Date(ds+'T00:00:00');return d.toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'});}
function _lvCanApprove(role){
  // Base "can approve leave at all" is now driven by the permission grid (leave_approve);
  // the per-request hierarchy below (_lvCanApproveRole) still limits WHO they can approve.
  if(role==='superadmin'||role==='admin')return true;
  return (typeof hasRolePerm==='function')?hasRolePerm('leave_approve'):(role==='cx_manager');
}
function _lvCanApproveRole(myRole,reqRole){
  if(myRole==='superadmin')return true;
  if(myRole==='admin')return reqRole!=='superadmin';
  if(myRole==='cx_manager')return reqRole==='desk'||reqRole==='ground_staff';
  return false;
}

function _lvTab(label,id,cur){
  var on=cur===id;
  return '<button tabindex="-1" onclick="if(!S._leave)S._leave={};S._leave.tab=\''+id+'\';render()" style="padding:8px 18px;border:none;border-radius:8px 8px 0 0;background:'+(on?'rgba(124,58,237,.2)':'transparent')+';color:'+(on?'#c084fc':'rgba(255,255,255,.45)')+';font-size:13px;font-weight:'+(on?'700':'500')+';cursor:pointer;border-bottom:2px solid '+(on?'#c084fc':'transparent')+'">'+label+'</button>';
}

function _lvToggle(on,onclick){
  return '<button tabindex="-1" onclick="'+onclick+'" style="display:inline-flex;align-items:center;width:44px;height:26px;border-radius:13px;background:'+(on?'#22c55e':'#475569')+';border:none;cursor:pointer;padding:0;flex-shrink:0"><div style="width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.4);transition:transform .15s;transform:translateX('+(on?'21':'3')+'px)"></div></button>';
}

function _lvStatusBadge(status){
  var sc=LEAVE_SC[status]||LEAVE_SC.pending;
  return '<span style="padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;background:'+sc.bg+';color:'+sc.col+';border:1px solid '+sc.bd+';white-space:nowrap">'+sc.lbl+'</span>';
}

// ── Init state ──
function _lvInit(){
  if(!S._leave)S._leave={tab:'my'};
  var lv=S._leave;
  if(lv.myReqs===undefined)lv.myReqs=null;
  if(lv.allReqs===undefined)lv.allReqs=null;
  if(!lv._myLoaded)lv._myLoaded=false;
  if(!lv._allLoaded)lv._allLoaded=false;
  if(!lv.form)lv.form={show:false,type:'annual',startDate:'',endDate:'',reason:''};
  if(!lv.filter)lv.filter={status:'pending',userId:'',dateFrom:'',dateTo:''};
  if(lv.declineId===undefined)lv.declineId=null;
  if(lv.declineComment===undefined)lv.declineComment='';
  return lv;
}

// ── Main render ──
function renderLeave(){
  var role=S.user?.role||'desk';
  var lv=_lvInit();
  var canApprove=_lvCanApprove(role);

  if(!lv._myLoaded){lv._myLoaded=true;window.loadMyLeave();}
  if(canApprove&&!lv._allLoaded){lv._allLoaded=true;window.loadAllLeave();}
  // Need the roster to work out which leave days are RDOs vs working days.
  if(!S._rosterLoaded&&window.loadRosterFromCloud){S._rosterLoaded=true;window.loadRosterFromCloud();if(window.loadRosterLeave)window.loadRosterLeave();}

  var pendingCt=canApprove&&lv.allReqs
    ?lv.allReqs.filter(function(r){return r.status==='pending'&&_lvCanApproveRole(role,r.user_role||'desk');}).length
    :0;

  var h='<div style="padding:20px 16px;max-width:960px;margin:0 auto">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">';
  h+='<div><h2 style="font-size:20px;font-weight:700;color:var(--text);margin:0 0 2px">Leave Management</h2>';
  h+='<div style="font-size:12px;color:var(--text3)">Submit and track leave requests</div></div>';
  h+='</div>';

  h+='<div style="display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:20px">';
  h+=_lvTab('My Leave','my',lv.tab);
  if(canApprove)h+=_lvTab('Approvals'+(pendingCt>0?' ('+pendingCt+')':''),'approvals',lv.tab);
  h+='</div>';

  if(lv.tab==='my')h+=_renderMyLeave(lv);
  else if(lv.tab==='approvals')h+=_renderApprovals(lv,role);

  h+='</div>';
  return h;
}

// ── My Leave tab ──
function _renderMyLeave(lv){
  var f=lv.form;
  var h='';

  // Request button
  if(!f.show){
    h+='<button tabindex="-1" onclick="S._leave.form.show=true;render()" style="padding:10px 20px;background:rgba(124,58,237,.18);border:1.5px solid #7c3aed;color:#c084fc;font-size:14px;font-weight:700;border-radius:10px;cursor:pointer;margin-bottom:20px">+ Request Leave</button>';
  }

  // Request form
  if(f.show){
    var days=_lvDays(f.startDate,f.endDate);
    h+='<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:20px;margin-bottom:24px">';
    h+='<h3 style="font-size:15px;font-weight:700;color:var(--text);margin:0 0 16px">New Leave Request</h3>';

    // Leave type
    h+='<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:8px">Leave Type</div>';
    h+='<div style="display:flex;gap:8px;flex-wrap:wrap">';
    LEAVE_TYPES.forEach(function(lt){
      var on=f.type===lt.id;
      h+='<button tabindex="-1" onclick="S._leave.form.type=\''+lt.id+'\';render()" style="padding:7px 14px;border-radius:8px;border:1.5px solid '+(on?'#c084fc':'rgba(255,255,255,.15)')+';background:'+(on?'rgba(124,58,237,.2)':'transparent')+';color:'+(on?'#c084fc':'rgba(255,255,255,.55)')+';font-size:13px;font-weight:'+(on?'700':'500')+';cursor:pointer">'+lt.icon+' '+lt.lbl+'</button>';
    });
    h+='</div></div>';

    // Dates
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">';
    h+='<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:6px">Start Date</div>';
    h+='<input type="date" value="'+f.startDate+'" onchange="S._leave.form.startDate=this.value;safeRender()" style="width:100%;padding:9px 12px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.15);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box"></div>';
    h+='<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:6px">End Date</div>';
    h+='<input type="date" value="'+f.endDate+'" onchange="S._leave.form.endDate=this.value;safeRender()" style="width:100%;padding:9px 12px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.15);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box"></div>';
    h+='</div>';
    if(f.startDate&&f.endDate&&days>0){
      var _wd=_lvWorkingDays(S.user&&S.user.id,f.startDate,f.endDate);
      var _rd=days-_wd;
      h+='<div style="font-size:13px;color:#a78bfa;margin-bottom:12px">📅 <strong>'+_wd+' leave day'+(_wd!==1?'s':'')+'</strong> used'+(_rd>0?' <span style="color:var(--text3)">('+days+' calendar days − '+_rd+' RDO/off day'+(_rd!==1?'s':'')+')</span>':'')+'</div>';
      // Heads-up: who else is already off during this period (from the roster).
      var _subConf=_lvRosterConflicts({user_id:S.user&&S.user.id,start_date:f.startDate,end_date:f.endDate});
      if(_subConf.length){
        h+='<div style="font-size:12px;color:#fbbf24;margin-bottom:12px;line-height:1.5">⚠ Already off then (per roster): '+_subConf.map(function(c){return _lvEsc(c.name)+' ('+c.label+')';}).join(', ')+'</div>';
      }
    }

    // Reason
    h+='<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:6px">Reason / Comments</div>';
    h+='<textarea oninput="S._leave.form.reason=this.value" placeholder="Optional — add any relevant details" rows="3" style="width:100%;padding:9px 12px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.15);border-radius:8px;color:var(--text);font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit">'+_lvEsc(f.reason||'')+'</textarea></div>';

    h+='<div style="display:flex;gap:8px">';
    h+='<button tabindex="-1" onclick="window.submitLeaveRequest()" style="padding:10px 22px;background:#7c3aed;border:none;border-radius:9px;color:#fff;font-size:14px;font-weight:700;cursor:pointer">Submit Request</button>';
    h+='<button tabindex="-1" onclick="S._leave.form.show=false;render()" style="padding:10px 16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:9px;color:rgba(255,255,255,.55);font-size:13px;cursor:pointer">Cancel</button>';
    h+='</div>';
    h+='</div>';
  }

  var reqs=lv.myReqs;
  if(reqs)reqs=reqs.filter(function(r){return r&&r.user_id===(S.user&&S.user.id);}); // My Leave = own requests only
  if(reqs===null){
    return h+'<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px">Loading...</div>';
  }
  if(reqs.length===0){
    return h+'<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:40px;text-align:center;color:var(--text3);font-size:13px">No leave requests yet.</div>';
  }

  var today=new Date().toISOString().slice(0,10);
  var upcoming=reqs.filter(function(r){return r.end_date>=today&&(r.status==='approved'||r.status==='pending');});
  var history=reqs.filter(function(r){return upcoming.indexOf(r)===-1;});

  if(upcoming.length>0){
    h+='<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text3);margin-bottom:10px">Upcoming</div>';
    upcoming.forEach(function(r){h+=_lvCard(r,false);});
    h+='<div style="height:16px"></div>';
  }
  if(history.length>0){
    h+='<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text3);margin-bottom:10px">History</div>';
    history.forEach(function(r){h+=_lvCard(r,false);});
  }
  return h;
}

function _lvCard(r,showUser){
  var sc=LEAVE_SC[r.status]||LEAVE_SC.pending;
  var lt=LEAVE_TYPES.find(function(t){return t.id===r.leave_type;})||{icon:'📝',lbl:r.leave_type||'Leave'};
  var days=r.total_days||1;
  var h='<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px 16px;margin-bottom:8px">';
  h+='<div style="display:flex;align-items:flex-start;gap:10px">';
  h+='<div style="flex:1;min-width:0">';
  if(showUser){
    h+='<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:5px">👤 '+_lvEsc(r.user_name||'Unknown')+'</div>';
  }
  h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">';
  h+='<span style="font-size:14px;font-weight:700;color:var(--text)">'+lt.icon+' '+lt.lbl+'</span>';
  h+='</div>';
  h+='<div style="font-size:13px;color:var(--text2);margin-bottom:4px">📅 '+_lvFmt(r.start_date)+' → '+_lvFmt(r.end_date)+'<span style="color:var(--text3);margin-left:8px">('+days+' day'+(days!==1?'s':'')+')</span></div>';
  if(r.reason){h+='<div style="font-size:12px;color:var(--text3);margin-top:4px;font-style:italic">"'+_lvEsc(r.reason)+'"</div>';}
  if(r.admin_comment){h+='<div style="font-size:12px;color:#f87171;margin-top:6px;background:rgba(239,68,68,.08);border-radius:6px;padding:5px 8px">💬 '+_lvEsc(r.admin_comment)+'</div>';}
  h+='</div>';
  h+='<div style="flex-shrink:0">'+_lvStatusBadge(r.status)+'</div>';
  h+='</div>';
  h+='<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;flex-wrap:wrap">';
  if(r.status==='pending'||r.status==='approved'){
    h+='<button tabindex="-1" onclick="window.leaveEditOpen(\''+r.id+'\')" style="padding:5px 12px;border-radius:7px;border:1px solid rgba(124,58,237,.4);background:rgba(124,58,237,.1);color:#c084fc;font-size:12px;cursor:pointer">✎ Edit</button>';
  }
  if(r.status==='pending'){
    h+='<button tabindex="-1" onclick="window.withdrawLeave(\''+r.id+'\')" style="padding:5px 12px;border-radius:7px;border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.08);color:#f87171;font-size:12px;cursor:pointer">Withdraw</button>';
  }
  h+='<button tabindex="-1" onclick="window.toggleLeaveHistory(\''+r.id+'\')" style="padding:5px 12px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-size:12px;cursor:pointer">🕑 History</button>';
  h+='</div>';
  h+=_lvHistoryHtml(r.id);
  h+='</div>';
  return h;
}

// ── Approvals tab ──
function _renderApprovals(lv,role){
  var allReqs=lv.allReqs;
  var f=lv.filter;
  var h='';

  // Filter pills + date range
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center">';
  [{id:'pending',lbl:'Pending'},{id:'approved',lbl:'Approved'},{id:'declined',lbl:'Declined'},{id:'all',lbl:'All'}].forEach(function(s){
    var on=f.status===s.id;
    var cnt=allReqs?allReqs.filter(function(r){
      var canSee=_lvCanApproveRole(role,r.user_role||'desk');
      return canSee&&(s.id==='all'||r.status===s.id);
    }).length:0;
    h+='<button tabindex="-1" onclick="S._leave.filter.status=\''+s.id+'\';render()" style="padding:5px 12px;border-radius:7px;border:1.5px solid '+(on?'#c084fc':'rgba(255,255,255,.12)')+';background:'+(on?'rgba(124,58,237,.18)':'transparent')+';color:'+(on?'#c084fc':'rgba(255,255,255,.45)')+';font-size:12px;font-weight:'+(on?'700':'500')+';cursor:pointer">'+s.lbl+(cnt>0?' ('+cnt+')':'')+'</button>';
  });
  h+='<div style="display:flex;gap:6px;align-items:center;margin-left:auto">';
  h+='<input type="date" value="'+f.dateFrom+'" onchange="S._leave.filter.dateFrom=this.value;safeRender()" title="From" style="padding:5px 9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:7px;color:var(--text);font-size:12px">';
  h+='<span style="color:var(--text3);font-size:12px">to</span>';
  h+='<input type="date" value="'+f.dateTo+'" onchange="S._leave.filter.dateTo=this.value;safeRender()" title="To" style="padding:5px 9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:7px;color:var(--text);font-size:12px">';
  h+='<button tabindex="-1" onclick="S._leave._allLoaded=false;window.loadAllLeave()" style="padding:5px 10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:7px;color:rgba(255,255,255,.5);font-size:12px;cursor:pointer">⟳</button>';
  if(role==='superadmin')h+='<button tabindex="-1" onclick="window.deleteAllLeave()" title="Permanently delete ALL leave requests (superadmin — for clearing test data)" style="padding:5px 10px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.4);border-radius:7px;color:#f87171;font-size:12px;font-weight:600;cursor:pointer">🗑 Delete all</button>';
  h+='</div>';
  h+='</div>';

  if(!allReqs){
    return h+'<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px">Loading...</div>';
  }

  var filtered=allReqs.filter(function(r){
    if(!_lvCanApproveRole(role,r.user_role||'desk'))return false;
    if(f.status!=='all'&&r.status!==f.status)return false;
    if(f.dateFrom&&r.end_date<f.dateFrom)return false;
    if(f.dateTo&&r.start_date>f.dateTo)return false;
    return true;
  });

  if(filtered.length===0){
    return h+'<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:40px;text-align:center;color:var(--text3);font-size:13px">No leave requests found.</div>';
  }

  filtered.forEach(function(r){
    var sc=LEAVE_SC[r.status]||LEAVE_SC.pending;
    var lt=LEAVE_TYPES.find(function(t){return t.id===r.leave_type;})||{icon:'📝',lbl:r.leave_type||'Leave'};
    var days=r.total_days||1;
    var _calDays=_lvDays(r.start_date,r.end_date,false);
    var _rdoExcl=Math.max(0,_calDays-(_lvWorkingDays(r.user_id,r.start_date,r.end_date)));
    var isDecline=lv.declineId===r.id;

    // Conflicts: everyone else with overlapping leave (approved OR pending)
    var overlaps=allReqs.filter(function(o){
      return o.id!==r.id&&(o.status==='approved'||o.status==='pending')&&o.start_date<=r.end_date&&o.end_date>=r.start_date;
    });

    h+='<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px;margin-bottom:10px">';

    // Name + role tag
    h+='<div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">';
    h+='<div style="flex:1;min-width:200px">';
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">';
    h+='<span style="font-size:14px;font-weight:700;color:var(--text)">'+_lvEsc(r.user_name||'Unknown')+'</span>';
    h+='<span style="font-size:10px;padding:2px 7px;border-radius:5px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.06em">'+(r.user_role||'')+'</span>';
    h+='</div>';
    h+='<div style="font-size:13px;color:var(--text2);margin-bottom:4px">'+lt.icon+' '+lt.lbl;
    h+='</div>';
    h+='<div style="font-size:13px;color:var(--text3)">📅 '+_lvFmt(r.start_date)+' → '+_lvFmt(r.end_date)+'<span style="margin-left:8px">('+days+' leave day'+(days!==1?'s':'')+(_rdoExcl>0?', '+_rdoExcl+' RDO excl':'')+')</span></div>';
    if(r.reason){h+='<div style="font-size:12px;color:var(--text3);margin-top:4px;font-style:italic">"'+_lvEsc(r.reason)+'"</div>';}
    h+='</div>';
    h+='<div style="flex-shrink:0">'+_lvStatusBadge(r.status)+'</div>';
    h+='</div>';

    // Conflicts — anyone else off during this period. Pulls from the ROSTER (catches
    // leave imported from CSV or added directly on the calendar) PLUS in-app leave requests.
    var _ovNames={};overlaps.forEach(function(o){_ovNames[(o.user_name||'').toLowerCase()]=1;});
    var rConf=_lvRosterConflicts(r).filter(function(c){return !_ovNames[(c.name||'').toLowerCase()];});
    var _totalConf=overlaps.length+rConf.length;
    if(_totalConf>0){
      h+='<div style="margin-top:10px;padding:9px 11px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:8px">';
      h+='<div style="font-size:12px;font-weight:700;color:#fbbf24;margin-bottom:6px">⚠ '+_totalConf+' conflict'+(_totalConf!==1?'s':'')+' — others off during this period</div>';
      overlaps.sort(function(a,b){return (a.start_date<b.start_date?-1:1);}).forEach(function(o){
        var osc=LEAVE_SC[o.status]||LEAVE_SC.pending;
        var olt=LEAVE_TYPES.find(function(t){return t.id===o.leave_type;})||{icon:'📝'};
        h+='<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2);padding:2px 0;flex-wrap:wrap">'
          +'<span style="font-weight:700;color:var(--text)">'+_lvEsc(o.user_name||'Unknown')+'</span>'
          +'<span style="color:var(--text3);font-size:10px;text-transform:uppercase">'+(o.user_role||'')+'</span>'
          +'<span>'+olt.icon+'</span>'
          +'<span style="color:var(--text3)">'+_lvFmt(o.start_date)+' → '+_lvFmt(o.end_date)+'</span>'
          +'<span style="padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;background:'+osc.bg+';color:'+osc.col+';border:1px solid '+osc.bd+'">'+osc.lbl+'</span>'
          +'</div>';
      });
      rConf.forEach(function(c){
        var dr=c.days.length>1?(_lvFmt(c.days[0])+' → '+_lvFmt(c.days[c.days.length-1])):_lvFmt(c.days[0]);
        h+='<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2);padding:2px 0;flex-wrap:wrap">'
          +'<span style="font-weight:700;color:var(--text)">'+_lvEsc(c.name)+'</span>'
          +'<span style="color:var(--text3);font-size:10px;text-transform:uppercase">'+(c.role||'')+'</span>'
          +'<span style="color:var(--text3)">'+dr+'</span>'
          +'<span style="padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(148,163,184,.18);color:#cbd5e1;border:1px solid rgba(148,163,184,.4)">'+c.label+' · roster</span>'
          +'</div>';
      });
      h+='</div>';
    }

    // Submitted time + reviewed by
    h+='<div style="font-size:11px;color:var(--text3);margin-top:8px">Submitted '+new Date(r.submitted_at).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})+'</div>';
    if(r.admin_comment){h+='<div style="margin-top:8px;font-size:12px;color:#f87171;background:rgba(239,68,68,.08);border-radius:7px;padding:7px 10px">💬 '+_lvEsc(r.admin_comment)+'</div>';}
    if(r.status!=='pending'&&r.reviewed_by_name){
      h+='<div style="font-size:11px;color:var(--text3);margin-top:4px">'+sc.lbl+' by '+_lvEsc(r.reviewed_by_name)+' · '+new Date(r.reviewed_at).toLocaleDateString('en-NZ',{day:'numeric',month:'short'})+'</div>';
    }

    // Approve / Decline buttons (pending only)
    if(r.status==='pending'){
      h+='<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">';
      if(!isDecline){
        h+='<button tabindex="-1" onclick="window.approveLeave(\''+r.id+'\')" style="padding:7px 18px;background:#22c55e;border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:700;cursor:pointer">✓ Approve</button>';
        h+='<button tabindex="-1" onclick="S._leave.declineId=\''+r.id+'\';S._leave.declineComment=\'\';render()" style="padding:7px 14px;background:rgba(239,68,68,.12);border:1.5px solid rgba(239,68,68,.5);border-radius:8px;color:#f87171;font-size:13px;font-weight:700;cursor:pointer">✕ Decline</button>';
      } else {
        h+='<div style="width:100%">';
        h+='<textarea id="decline-comment-'+r.id+'" oninput="S._leave.declineComment=this.value" placeholder="Reason for declining (optional)" rows="2" style="width:100%;padding:8px 12px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.15);border-radius:8px;color:var(--text);font-size:13px;box-sizing:border-box;font-family:inherit;resize:none;margin-bottom:8px">'+_lvEsc(lv.declineComment||'')+'</textarea>';
        h+='<div style="display:flex;gap:8px">';
        h+='<button tabindex="-1" onclick="window.declineLeave(\''+r.id+'\')" style="padding:7px 14px;background:#ef4444;border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:700;cursor:pointer">Confirm Decline</button>';
        h+='<button tabindex="-1" onclick="S._leave.declineId=null;render()" style="padding:7px 12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:rgba(255,255,255,.5);font-size:13px;cursor:pointer">Cancel</button>';
        h+='</div></div>';
      }
      h+='</div>';
    }
    // Approver tools: edit the request directly + view full history
    h+='<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">';
    h+='<button tabindex="-1" onclick="window.leaveEditOpen(\''+r.id+'\')" style="padding:6px 13px;border-radius:7px;border:1px solid rgba(124,58,237,.4);background:rgba(124,58,237,.1);color:#c084fc;font-size:12px;font-weight:600;cursor:pointer">✎ Edit</button>';
    h+='<button tabindex="-1" onclick="window.toggleLeaveHistory(\''+r.id+'\')" style="padding:6px 13px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-size:12px;cursor:pointer">🕑 History</button>';
    if(role==='superadmin')h+='<button tabindex="-1" onclick="window.deleteLeaveRequest(\''+r.id+'\')" style="padding:6px 11px;border-radius:7px;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.08);color:#f87171;font-size:12px;cursor:pointer" title="Permanently delete (superadmin)">🗑</button>';
    h+='</div>';
    h+=_lvHistoryHtml(r.id);
    h+='</div>';
  });
  return h;
}

// Escape a notification message, then turn any aircraft id (e.g. "ZK-SLA") into a small
// coloured aircraft pill ("SLA" in the aircraft's colour) so loadsheet notifications read
// at a glance. Unknown ids are left as plain text.
function _notifFmtMsg(msg){
  return _lvEsc(msg||'').replace(/ZK-[A-Z0-9]{2,4}/g,function(m){
    var col=(typeof AC_COL!=='undefined'&&AC_COL[m]);
    if(!col)return m;
    var code=m.replace('ZK-','');
    return '<span style="display:inline-block;padding:1px 8px;border-radius:20px;background:'+col+'22;border:1px solid '+col+'66;color:'+col+';font-weight:700;font-size:11px;line-height:1.5">'+code+'</span>';
  });
}
// ── Notification panel ──
function renderNotificationPanel(){
  var notifs=S._notifications||[];
  var unread=notifs.filter(function(n){return !n.read;}).length;
  var _nMob=!!S.mobileView||(typeof window!=='undefined'&&window.innerWidth<560);
  var _nPos=_nMob
    ?'position:fixed;top:56px;right:8px;left:8px;width:auto;max-height:75vh'
    :'position:absolute;top:calc(100% + 6px);right:0;width:320px;max-width:calc(100vw - 16px);max-height:420px';
  var h='<div id="notif-panel" onclick="event.stopPropagation()" style="'+_nPos+';overflow-y:auto;background:#111827;border:1px solid rgba(255,255,255,.12);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.6);z-index:2100">';
  h+='<div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#111827">';
  h+='<span style="font-size:13px;font-weight:700;color:var(--text)">🔔 Notifications</span>';
  if(unread>0){h+='<button tabindex="-1" onclick="window.markNotificationsRead()" style="font-size:11px;color:#a78bfa;background:none;border:none;cursor:pointer;padding:0">Mark all read</button>';}
  h+='</div>';
  if(notifs.length===0){
    h+='<div style="padding:24px;text-align:center;color:var(--text3);font-size:13px">No notifications</div>';
  } else {
    notifs.forEach(function(n){
      h+='<div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.05);background:'+(n.read?'transparent':'rgba(124,58,237,.07)')+'">';
      if(!n.read){h+='<div style="width:6px;height:6px;border-radius:50%;background:#c084fc;display:inline-block;margin-right:6px;vertical-align:middle"></div>';}
      h+='<div style="font-size:12px;color:'+(n.read?'var(--text2)':'var(--text)')+';line-height:1.5;display:inline">'+_notifFmtMsg(n.message)+'</div>';
      h+='<div style="font-size:10px;color:var(--text3);margin-top:4px">'+new Date(n.created_at).toLocaleDateString('en-NZ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+'</div>';
      if(n.type==='leave_submitted'&&n.reference_id){
        h+='<div><button tabindex="-1" onclick="window.markNotifRead(\''+n.id+'\');S.section=\'leave\';_lvInit();S._leave.tab=\'approvals\';S._notifOpen=false;render()" style="font-size:11px;color:#a78bfa;background:none;border:none;cursor:pointer;padding:0;margin-top:4px">View request →</button></div>';
      }
      if(n.type==='loadsheet_pic'&&n.reference_id){
        h+='<div><button tabindex="-1" onclick="window.markNotifRead(\''+n.id+'\');window.openLoadsheetFromNotif(\''+n.reference_id+'\')" style="font-size:11px;color:#a78bfa;background:none;border:none;cursor:pointer;padding:0;margin-top:4px">Open loadsheet →</button></div>';
      }
      h+='</div>';
    });
    h+='<div style="padding:10px 16px;border-top:1px solid rgba(255,255,255,.08);text-align:center;position:sticky;bottom:0;background:#111827"><button tabindex="-1" onclick="window.clearAllNotifications()" style="font-size:12px;color:#f87171;background:none;border:none;cursor:pointer;padding:4px">🗑 Clear all notifications</button></div>';
  }
  h+='</div>';
  return h;
}
window.clearAllNotifications=async function(){
  var uid=S.user&&S.user.id;if(!uid)return;
  if(!confirm('Clear all your notifications?'))return;
  try{var r=await _sbFetch(SB+'/rest/v1/ts_notifications?user_id=eq.'+uid,{method:'DELETE',headers:{...SH}});if(!r.ok){toast('Could not clear notifications — please try again','warn');return;}}catch(e){toast('Could not clear notifications — please try again','warn');return;}
  S._notifications=[];S.__notifStr='';render();
};

// ══════════════════════════════════════════════
// Cloud functions
// ══════════════════════════════════════════════

window.loadMyLeave=async function(){
  var uid=S.user?.id;if(!uid)return;
  try{
    var r=await _sbFetch(SB+'/rest/v1/ts_leave_requests?select=*&user_id=eq.'+uid+'&order=submitted_at.desc',{headers:{...SH}});
    if(r.ok){_lvInit().myReqs=(await r.json()).filter(Boolean);}
    else{_lvInit().myReqs=_lvInit().myReqs||[];toast('Could not load your leave — check connection','warn');}
  }catch(e){_lvInit().myReqs=_lvInit().myReqs||[];}
  safeRender();
};

window.loadAllLeave=async function(){
  try{
    var r=await _sbFetch(SB+'/rest/v1/ts_leave_requests?select=*&order=submitted_at.desc',{headers:{...SH}});
    if(r.ok){_lvInit().allReqs=(await r.json()).filter(Boolean);}
    else{_lvInit().allReqs=_lvInit().allReqs||[];toast('Could not load leave requests — check connection','warn');}
  }catch(e){_lvInit().allReqs=_lvInit().allReqs||[];}
  safeRender();
};

window.submitLeaveRequest=async function(){
  var f=S._leave?.form;
  if(!f||!f.startDate||!f.endDate){toast('Please select start and end dates.','error');return;}
  if(f.endDate<f.startDate){toast('End date must be after start date.','error');return;}
  var uid=S.user?.id;
  if(!uid){toast('Could not identify your account — please sign in again.','error');return;}
  var uname=S.user?.name||S.user?.email||'Unknown';
  var urole=S.user?.role||'desk';
  // Ensure the persisted roster is loaded before counting leave days, so RDO exclusion is
  // correct and the STORED total_days isn't over-counted because the roster hadn't loaded yet.
  if((!S.roster||!Object.keys(S.roster).length)&&typeof window.loadRosterFromCloud==='function'){
    try{await window.loadRosterFromCloud();}catch(e){}
  }
  var days=_lvWorkingDays(uid,f.startDate,f.endDate); // leave days actually used (RDOs excluded)
  var payload={user_id:uid,user_name:uname,user_role:urole,
    leave_type:f.type,start_date:f.startDate,end_date:f.endDate,
    total_days:days,
    reason:f.reason||null,status:'pending',submitted_at:new Date().toISOString()};
  try{
    var r=await fetch(SB+'/rest/v1/ts_leave_requests',{
      method:'POST',
      headers:{...SH,'Prefer':'return=representation'},
      body:JSON.stringify([payload])
    });
    var res=r.ok?await r.json():null;
    if(res&&res[0]){
      try{await sbU('ts_leave_audit',[{request_id:res[0].id,action:'submitted',performed_by:uid,performed_by_name:uname}]);}catch(e){}
      try{await window._notifyLeaveApprovers(res[0].id,urole,uname,f.type,f.startDate,f.endDate);}catch(e){}
      try{window._triggerLeaveEmail(res[0].id,'submitted').catch(function(){});}catch(e){}
      S._leave.form={show:false,type:'annual',startDate:'',endDate:'',reason:''};
      S._leave._myLoaded=false;S._leave._allLoaded=false;
      toast('Leave request submitted!','success');
      window.loadMyLeave();
      if(_lvCanApprove(S.user?.role))window.loadAllLeave();
    } else {
      var errTxt='';
      try{errTxt=await r.text();}catch(e){}
      console.error('[submitLeave]',r&&r.status,errTxt);
      toast('Failed to submit request ('+((r&&r.status)||'network error')+').','error');
    }
  }catch(e){
    console.error('[submitLeave] exception:',e);
    toast('Failed to submit request.','error');
  }
};

window.approveLeave=async function(id){
  var me=S.user;
  var req=(S._leave?.allReqs||[]).find(function(r){return r.id===id;});
  if(!req)return;
  if(!_lvCanApprove(me&&me.role)||!_lvCanApproveRole(me&&me.role,req.user_role||'desk')){toast('Not authorised to approve this request.','warn');return;}
  var overlaps=(S._leave?.allReqs||[]).filter(function(r){
    return r.id!==id&&r.status==='approved'&&r.start_date<=req.end_date&&r.end_date>=req.start_date;
  });
  // Also surface clashes that exist directly on the roster (imported / hand-entered leave).
  var _clashNames=overlaps.map(function(r){return r.user_name||'Unknown';});
  try{(_lvRosterConflicts(req)||[]).forEach(function(c){if(_clashNames.indexOf(c.name)<0)_clashNames.push(c.name+' ('+c.label+')');});}catch(e){}
  if(_clashNames.length>0){
    if(!confirm('Warning: '+_clashNames.join(', ')+' also have leave overlapping these dates. Approve anyway?'))return;
  }
  var ok=await sbPatch('ts_leave_requests',id,{
    status:'approved',reviewed_at:new Date().toISOString(),
    reviewed_by:me?.id,reviewed_by_name:me?.name||me?.email
  });
  if(ok){
    await sbU('ts_leave_audit',[{request_id:id,action:'approved',performed_by:me?.id,performed_by_name:me?.name||me?.email}]);
    try{await _lvStampRoster(req);}catch(e){}   // auto-stamp the approved leave onto the roster
    await window._notifyLeaveUser(req.user_id,'approved',req.leave_type,req.start_date,req.end_date,null);
    window._triggerLeaveEmail(id,'approved').catch(function(){});
    S._leave._allLoaded=false;
    toast('Leave approved!','success');
    window.loadAllLeave();
  }
};

window.declineLeave=async function(id){
  var me=S.user;
  var comment=(document.getElementById('decline-comment-'+id)||{}).value||S._leave?.declineComment||'';
  var req=(S._leave?.allReqs||[]).find(function(r){return r.id===id;});
  if(!req)return;
  if(!_lvCanApprove(me&&me.role)||!_lvCanApproveRole(me&&me.role,req.user_role||'desk')){toast('Not authorised to decline this request.','warn');return;}
  var _wasApproved=req.status==='approved';
  var ok=await sbPatch('ts_leave_requests',id,{
    status:'declined',admin_comment:comment||null,
    reviewed_at:new Date().toISOString(),reviewed_by:me?.id,reviewed_by_name:me?.name||me?.email
  });
  if(ok){
    await sbU('ts_leave_audit',[{request_id:id,action:'declined',performed_by:me?.id,performed_by_name:me?.name||me?.email,comment:comment||null}]);
    if(_wasApproved){try{await _lvUnstampRoster(req);}catch(e){}}   // revert the roster auto-stamp
    await window._notifyLeaveUser(req.user_id,'declined',req.leave_type,req.start_date,req.end_date,comment);
    window._triggerLeaveEmail(id,'declined').catch(function(){});
    S._leave.declineId=null;S._leave.declineComment='';S._leave._allLoaded=false;
    toast('Leave declined.','info');
    window.loadAllLeave();
  }
};

window.withdrawLeave=async function(id){
  if(!confirm('Withdraw this leave request?'))return;
  var me=S.user;
  var _wReq=((S._leave&&(S._leave.myReqs||[]).concat(S._leave.allReqs||[]))||[]).find(function(r){return r.id===id;});
  var _wWasApproved=_wReq&&_wReq.status==='approved';
  var ok=await sbPatch('ts_leave_requests',id,{status:'withdrawn'});
  if(ok){
    try{await sbU('ts_leave_audit',[{request_id:id,action:'withdrawn',performed_by:me&&me.id,performed_by_name:me&&(me.name||me.email)}]);}catch(e){}
    if(_wWasApproved&&_wReq){try{await _lvUnstampRoster(_wReq);}catch(e){}}   // revert the roster auto-stamp
    S._leave._myLoaded=false;
    toast('Leave request withdrawn.','info');
    window.loadMyLeave();
  }
};

// ── Superadmin: permanently delete leave requests (for clearing test data) ──
window.deleteLeaveRequest=async function(id){
  if((S.user&&S.user.role)!=='superadmin'){toast('Only a superadmin can delete leave requests.','warn');return;}
  if(!confirm('Permanently delete this leave request? This cannot be undone.'))return;
  var _delReq=(S._leave&&S._leave.allReqs||[]).find(function(r){return r.id===id;})||{};
  // Log to the general audit trail (ts_audit_log) since the leave-specific audit rows are deleted below.
  try{if(typeof auditLog==='function')await auditLog('leave_delete',{id:id,user:_delReq.user_name,type:_delReq.leave_type,start:_delReq.start_date,end:_delReq.end_date});}catch(e){}
  try{
    var _dr=await _sbFetch(SB+'/rest/v1/ts_leave_requests?id=eq.'+id,{method:'DELETE',headers:{...SH}});
    if(!_dr.ok){toast('Delete failed on the server — not deleted. Try again.','error');return;}
    await _sbFetch(SB+'/rest/v1/ts_leave_audit?request_id=eq.'+id,{method:'DELETE',headers:{...SH}});
  }catch(e){toast('Delete failed — check connection.','error');return;}
  // If this leave had been approved (and auto-stamped onto the roster), revert the roster.
  if(_delReq.status==='approved'){try{await _lvUnstampRoster(_delReq);}catch(e){}}
  if(S._leave){
    if(S._leave.allReqs)S._leave.allReqs=S._leave.allReqs.filter(function(r){return r.id!==id;});
    if(S._leave.myReqs)S._leave.myReqs=S._leave.myReqs.filter(function(r){return r.id!==id;});
    if(S._leave._audit)delete S._leave._audit[id];
  }
  toast('Leave request deleted.','ok');
  render();
};
window.deleteAllLeave=async function(){
  if((S.user&&S.user.role)!=='superadmin'){toast('Only a superadmin can do this.','warn');return;}
  var n=((S._leave&&S._leave.allReqs)||[]).length;
  if(!confirm('Permanently delete ALL '+n+' leave request(s) and their history? This cannot be undone.'))return;
  if(!confirm('Are you absolutely sure? This wipes every leave request in the system.'))return;
  try{if(typeof auditLog==='function')await auditLog('leave_delete_all',{count:n});}catch(e){}
  try{
    var _dar=await _sbFetch(SB+'/rest/v1/ts_leave_requests?id=neq.__none__',{method:'DELETE',headers:{...SH}});
    if(!_dar.ok){toast('Delete failed on the server — nothing deleted. Try again.','error');return;}
    await _sbFetch(SB+'/rest/v1/ts_leave_audit?id=neq.__none__',{method:'DELETE',headers:{...SH}});
  }catch(e){toast('Delete failed — check connection.','error');return;}
  if(S._leave){S._leave.allReqs=[];S._leave.myReqs=[];S._leave._audit={};}
  toast('All leave requests deleted.','ok');
  render();
};

// ── Edit a leave request (owner = re-approval if it was approved; approver = edit in place) ──
window.leaveEditOpen=function(id){
  var lv=S._leave||{};
  var req=(lv.allReqs||[]).find(function(r){return r.id===id;})||(lv.myReqs||[]).find(function(r){return r.id===id;});
  if(!req)return;
  S._leaveEdit={id:id,type:req.leave_type,startDate:req.start_date,endDate:req.end_date,reason:req.reason||'',status:req.status,user_id:req.user_id};
  _leaveEditRender();
};
function _leaveEditRender(){
  var e=S._leaveEdit;if(!e)return;
  var ex=document.getElementById('leave-edit-ov');if(ex)ex.remove();
  var ov=document.createElement('div');ov.id='leave-edit-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:18px';
  var typeBtns=LEAVE_TYPES.map(function(lt){var on=e.type===lt.id;return '<button onclick="S._leaveEdit.type=\''+lt.id+'\';_leaveEditRender()" style="padding:6px 12px;border-radius:8px;border:1.5px solid '+(on?'#c084fc':'rgba(255,255,255,.15)')+';background:'+(on?'rgba(124,58,237,.2)':'transparent')+';color:'+(on?'#c084fc':'rgba(255,255,255,.55)')+';font-size:12px;font-weight:'+(on?'700':'500')+';cursor:pointer">'+lt.icon+' '+lt.lbl+'</button>';}).join('');
  var isOwner=e.user_id===(S.user&&S.user.id);
  var reappWarn=(isOwner&&e.status==='approved')?'<div style="font-size:12px;color:#fbbf24;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:7px;padding:7px 10px;margin-bottom:12px">⚠ Editing approved leave sets it back to pending for re-approval.</div>':'';
  ov.innerHTML='<div style="background:var(--card);border:1px solid var(--border2);border-radius:16px;padding:20px;max-width:420px;width:100%;max-height:88vh;overflow:auto;box-shadow:0 12px 44px rgba(0,0,0,.55)">'
    +'<div style="font-size:16px;font-weight:700;color:var(--text1);margin-bottom:14px">Edit leave request</div>'
    +reappWarn
    +'<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:6px">Type</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">'+typeBtns+'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">'
    +'<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:5px">Start</div><input type="date" value="'+e.startDate+'" onchange="S._leaveEdit.startDate=this.value" style="width:100%;padding:8px 10px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.15);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box"></div>'
    +'<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:5px">End</div><input type="date" value="'+e.endDate+'" onchange="S._leaveEdit.endDate=this.value" style="width:100%;padding:8px 10px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.15);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box"></div>'
    +'</div>'
    +'<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:5px">Reason / comments</div>'
    +'<textarea onchange="S._leaveEdit.reason=this.value" rows="2" style="width:100%;padding:8px 10px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.15);border-radius:8px;color:var(--text);font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit;margin-bottom:16px">'+_lvEsc(e.reason||'')+'</textarea>'
    +'<div style="display:flex;gap:8px">'
    +'<button onclick="window.leaveEditSave()" style="flex:1;padding:10px;background:#7c3aed;border:none;border-radius:9px;color:#fff;font-size:14px;font-weight:700;cursor:pointer">Save changes</button>'
    +'<button onclick="var o=document.getElementById(\'leave-edit-ov\');if(o)o.remove();S._leaveEdit=null" style="padding:10px 16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:9px;color:rgba(255,255,255,.55);font-size:13px;cursor:pointer">Cancel</button>'
    +'</div></div>';
  ov.addEventListener('click',function(ev){if(ev.target===ov){ov.remove();S._leaveEdit=null;}});
  document.body.appendChild(ov);
}
window._leaveEditRender=_leaveEditRender;
window.leaveEditSave=async function(){
  var e=S._leaveEdit;if(!e)return;
  if(!e.startDate||!e.endDate){toast('Select start and end dates.','error');return;}
  if(e.endDate<e.startDate){toast('End date must be after start date.','error');return;}
  var lv=S._leave||{};
  var req=(lv.allReqs||[]).find(function(r){return r.id===e.id;})||(lv.myReqs||[]).find(function(r){return r.id===e.id;});
  if(!req)return;
  var me=S.user;
  var changes=[];
  if(req.start_date!==e.startDate||req.end_date!==e.endDate)changes.push('dates '+_lvFmt(req.start_date)+'→'+_lvFmt(req.end_date)+' ⇒ '+_lvFmt(e.startDate)+'→'+_lvFmt(e.endDate));
  if(req.leave_type!==e.type){var ot=LEAVE_TYPES.find(function(t){return t.id===req.leave_type;}),nt=LEAVE_TYPES.find(function(t){return t.id===e.type;});changes.push('type '+(ot?ot.lbl:req.leave_type)+' ⇒ '+(nt?nt.lbl:e.type));}
  if((req.reason||'')!==(e.reason||''))changes.push('reason updated');
  if(!changes.length){var _o=document.getElementById('leave-edit-ov');if(_o)_o.remove();S._leaveEdit=null;toast('No changes made.','info');return;}
  var days=(typeof _lvWorkingDays==='function')?_lvWorkingDays(req.user_id,e.startDate,e.endDate):_lvDays(e.startDate,e.endDate);
  var isOwner=req.user_id===(me&&me.id);
  // Approvers editing someone else's request must actually be allowed to approve that role.
  if(!isOwner&&(!_lvCanApprove(me&&me.role)||!_lvCanApproveRole(me&&me.role,req.user_role||'desk'))){toast('Not authorised to edit this request.','warn');return;}
  var reapprove=isOwner&&req.status==='approved';
  var patch={leave_type:e.type,start_date:e.startDate,end_date:e.endDate,reason:e.reason||null,total_days:days};
  if(reapprove){patch.status='pending';patch.reviewed_at=null;patch.reviewed_by=null;patch.reviewed_by_name=null;patch.admin_comment=null;}
  var ok=await sbPatch('ts_leave_requests',e.id,patch);
  if(!ok){toast('Save failed — check connection.','error');return;}
  var action=reapprove?'edited_resubmit':(isOwner?'edited':'edited_by_approver');
  var detail=(me&&(me.name||me.email)||'?')+' edited — '+changes.join('; ')+(reapprove?' (re-approval required)':'');
  try{await sbU('ts_leave_audit',[{request_id:e.id,action:action,performed_by:me&&me.id,performed_by_name:me&&(me.name||me.email),comment:detail}]);}catch(_){}
  if(reapprove){try{await window._notifyLeaveApprovers(e.id,req.user_role||'desk',req.user_name||(me&&me.name),e.type,e.startDate,e.endDate);}catch(_){}}
  else if(!isOwner&&req.user_id){try{await sbU('ts_notifications',[{user_id:req.user_id,type:'leave_edited',message:'Your leave was updated by '+((me&&me.name)||'an approver')+' — '+changes.join('; '),read:false,created_at:new Date().toISOString()}]);if(me&&me.id===req.user_id)window.loadNotifications();}catch(_){}}
  var o=document.getElementById('leave-edit-ov');if(o)o.remove();S._leaveEdit=null;
  if(S._leave){S._leave._myLoaded=false;S._leave._allLoaded=false;if(S._leave._audit)delete S._leave._audit[e.id];}
  toast(reapprove?'Leave updated — sent for re-approval.':'Leave updated.','success');
  window.loadMyLeave();if(_lvCanApprove(S.user&&S.user.role))window.loadAllLeave();
};
// ── Audit history (per request) ──
window.toggleLeaveHistory=function(id){
  if(!S._leave._histOpen)S._leave._histOpen={};
  S._leave._histOpen[id]=!S._leave._histOpen[id];
  if(S._leave._histOpen[id])window.loadLeaveAudit(id);
  render();
};
window.loadLeaveAudit=async function(id){
  if(!S._leave._audit)S._leave._audit={};
  try{var r=await fetch(SB+'/rest/v1/ts_leave_audit?select=*&request_id=eq.'+id+'&order=created_at.desc',{headers:SH});if(r.ok){S._leave._audit[id]=await r.json();safeRender();}}catch(e){}
};
function _lvHistoryHtml(id){
  var open=S._leave&&S._leave._histOpen&&S._leave._histOpen[id];
  if(!open)return '';
  var rows=(S._leave._audit&&S._leave._audit[id]);
  if(rows===undefined)return '<div style="font-size:11px;color:var(--text3);padding:6px 2px">Loading history…</div>';
  if(!rows.length)return '<div style="font-size:11px;color:var(--text3);padding:6px 2px">No history yet.</div>';
  var LBL={submitted:'Submitted',approved:'Approved ✓',declined:'Declined',withdrawn:'Withdrawn',edited:'Edited',edited_resubmit:'Edited → re-approval',edited_by_approver:'Edited by approver'};
  return '<div style="margin-top:8px;border-top:1px solid rgba(255,255,255,.08);padding-top:8px;display:flex;flex-direction:column;gap:3px">'+rows.map(function(a){
    var when=a.created_at?new Date(a.created_at).toLocaleDateString('en-NZ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
    return '<div style="font-size:11px;color:var(--text2);display:flex;gap:8px"><span style="color:var(--text3);min-width:118px;flex-shrink:0">'+when+'</span><span style="flex:1"><strong>'+(LBL[a.action]||a.action)+'</strong>'+(a.performed_by_name?' · '+_lvEsc(a.performed_by_name):'')+(a.comment?'<div style="color:var(--text3);margin-top:1px">'+_lvEsc(a.comment)+'</div>':'')+'</span></div>';
  }).join('')+'</div>';
}

// ── Notifications ──
window._notifyLeaveApprovers=async function(requestId,requesterRole,requesterName,leaveType,startDate,endDate){
  var approverRoles=(requesterRole==='desk'||requesterRole==='ground_staff')
    ?['cx_manager','admin','superadmin']:['admin','superadmin'];
  var approvers=(S.users||[]).filter(function(u){return approverRoles.indexOf(u.role)>=0&&!u.inactive;});
  if(!approvers.length)return;
  var lt=LEAVE_TYPES.find(function(t){return t.id===leaveType;});
  var msg=requesterName+' has requested '+(lt?lt.lbl:leaveType)+' from '+_lvFmt(startDate)+' to '+_lvFmt(endDate);
  var notifs=approvers.map(function(u){return{user_id:u.id,type:'leave_submitted',message:msg,reference_id:requestId,read:false,created_at:new Date().toISOString()};});
  await sbU('ts_notifications',notifs);
  window.loadNotifications();
};

window._notifyLeaveUser=async function(userId,action,leaveType,startDate,endDate,comment){
  var lt=LEAVE_TYPES.find(function(t){return t.id===leaveType;});
  var ltl=lt?lt.lbl:leaveType;
  var msg='Your '+ltl+' ('+_lvFmt(startDate)+' → '+_lvFmt(endDate)+') has been '
    +(action==='approved'?'approved ✓':'declined'+(comment?' — '+comment:''));
  await sbU('ts_notifications',[{user_id:userId,type:'leave_'+action,message:msg,read:false,created_at:new Date().toISOString()}]);
  if(S.user?.id===userId)window.loadNotifications();
};

// Notify the PIC's user account when a loadsheet is saved with them as PIC.
// Message format: "BF has created a loadsheet for you. ZK-SLA QN-MF 0930"
window._notifyPicLoadsheet=async function(f,lsId){
  try{
    if(!f||!f.pic)return;
    var pic=String(f.pic).trim();
    var picUser=(S.users||[]).find(function(u){return u&&(u.name===pic||u.linkedCrew===pic||(u.name&&u.name.toLowerCase()===pic.toLowerCase()));});
    if(!picUser||!picUser.id)return;
    if(S.user&&picUser.id===S.user.id)return; // don't notify yourself
    var code=(typeof _rCode==='function'&&S.user)?_rCode(S.user):((S.user&&S.user.name&&S.user.name.split(' ')[0])||'Someone');
    var route=((f.dep||'').replace(/^NZ/,''))+'-'+((f.dest||'').replace(/^NZ/,''));
    var etd=(f.etd||'').replace(':','');
    var msg=code+' has created a loadsheet for you. '+(f.ac||'')+' '+route+(etd?' '+etd:'');
    var res=await sbU('ts_notifications',[{user_id:picUser.id,type:'loadsheet_pic',reference_id:lsId||null,message:msg,read:false,created_at:new Date().toISOString()}]);
    // reference_id is a UUID column; a text loadsheet id makes the insert fail. If so,
    // retry without it so the notification still arrives (the Open button needs the
    // reference_id, which works once reference_id is changed to TEXT in Supabase).
    if(res===null){await sbU('ts_notifications',[{user_id:picUser.id,type:'loadsheet_pic',message:msg,read:false,created_at:new Date().toISOString()}]);}
    if(S.user&&picUser.id===S.user.id&&window.loadNotifications)window.loadNotifications();
  }catch(e){}
};
// Open a loadsheet straight from its notification (jump to sign).
window.openLoadsheetFromNotif=function(id){
  S._notifOpen=false;S.section='operations';S._newLsTab=false;
  if((S.lsTabs||[]).find(function(t){return t.id===id;})){window.switchLsTab(id);return;}
  if((S.saved||[]).find(function(s){return s.id===id&&s.status!=='deleted';})){window.editSaved(id);return;}
  toast('That loadsheet is no longer available.','warn');render();
};

window._triggerLeaveEmail=async function(requestId,action){
  // Email disabled for now — in-app notifications only.
  // To re-enable, restore the fetch to SB+'/functions/v1/send-leave-email'.
  return Promise.resolve();
};

window.loadNotifications=async function(){
  var uid=S.user?.id;if(!uid)return;
  try{
    var r=await fetch(SB+'/rest/v1/ts_notifications?select=*&user_id=eq.'+uid+'&order=created_at.desc&limit=20',{headers:SH});
    if(r.ok){
      var data=await r.json();
      var _s=JSON.stringify(data);
      if(_s!==S.__notifStr){S.__notifStr=_s;S._notifications=data;safeRender();} // only re-render when something changed
    }
  }catch(e){}
};
// Poll for new notifications every 10s (and on foreground) so the bell stays current.
setInterval(function(){if(S.user&&document.visibilityState==='visible'&&window.loadNotifications)window.loadNotifications();},10000);

window.markNotificationsRead=async function(){
  var uid=S.user?.id;if(!uid)return;
  await fetch(SB+'/rest/v1/ts_notifications?user_id=eq.'+uid+'&read=eq.false',{
    method:'PATCH',headers:{...SH,'Prefer':'return=minimal'},body:JSON.stringify({read:true})
  });
  (S._notifications||[]).forEach(function(n){n.read=true;});
  S.__notifStr=JSON.stringify(S._notifications||[]);
  S._notifOpen=false;
  safeRender();
};
// Mark a SINGLE notification read — used when the user clicks through to it.
window.markNotifRead=async function(id){
  if(!id||id==='undefined')return;
  var n=(S._notifications||[]).find(function(x){return String(x.id)===String(id);});
  if(n&&n.read)return;            // already read — nothing to do
  if(n)n.read=true;
  S.__notifStr=JSON.stringify(S._notifications||[]);
  try{await fetch(SB+'/rest/v1/ts_notifications?id=eq.'+id,{method:'PATCH',headers:{...SH,'Prefer':'return=minimal'},body:JSON.stringify({read:true})});}catch(e){}
};
