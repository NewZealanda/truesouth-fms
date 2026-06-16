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
function _lvDays(s,e,partial){if(!s||!e)return 0;var d=Math.round((new Date(e)-new Date(s))/86400000)+1;return partial?Math.max(0.5,d-0.5):d;}
function _lvFmt(ds){if(!ds)return '';var d=new Date(ds+'T00:00:00');return d.toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'});}
function _lvCanApprove(role){return role==='superadmin'||role==='admin'||role==='cx_manager';}
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
  if(!S._leave)S._leave={
    tab:'my',
    myReqs:null,allReqs:null,
    _myLoaded:false,_allLoaded:false,
    form:{show:false,type:'annual',startDate:'',endDate:'',partialDay:false,partialType:'am',reason:''},
    filter:{status:'pending',userId:'',dateFrom:'',dateTo:''},
    declineId:null,declineComment:'',
    notifOpen:false
  };
  if(!S._leave.form)S._leave.form={show:false,type:'annual',startDate:'',endDate:'',partialDay:false,partialType:'am',reason:''};
  return S._leave;
}

// ── Main render ──
function renderLeave(){
  var role=S.user?.role||'desk';
  var lv=_lvInit();
  var canApprove=_lvCanApprove(role);

  if(!lv._myLoaded){lv._myLoaded=true;window.loadMyLeave();}
  if(canApprove&&!lv._allLoaded){lv._allLoaded=true;window.loadAllLeave();}

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
    var days=_lvDays(f.startDate,f.endDate,f.partialDay);
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
    h+='<input type="date" value="'+f.startDate+'" oninput="S._leave.form.startDate=this.value;render()" style="width:100%;padding:9px 12px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.15);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box"></div>';
    h+='<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:6px">End Date</div>';
    h+='<input type="date" value="'+f.endDate+'" oninput="S._leave.form.endDate=this.value;render()" style="width:100%;padding:9px 12px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.15);border-radius:8px;color:var(--text);font-size:14px;box-sizing:border-box"></div>';
    h+='</div>';
    if(f.startDate&&f.endDate&&days>0){
      h+='<div style="font-size:13px;color:#a78bfa;margin-bottom:12px">📅 '+days+' day'+(days!==1?'s':'')+' total</div>';
    }

    // Partial day
    h+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">';
    h+=_lvToggle(f.partialDay,"S._leave.form.partialDay=!S._leave.form.partialDay;render()");
    h+='<span style="font-size:13px;color:var(--text)">Partial day</span>';
    if(f.partialDay){
      h+='<div style="display:flex;gap:6px">';
      ['am','pm'].forEach(function(t){
        var on=f.partialType===t;
        h+='<button tabindex="-1" onclick="S._leave.form.partialType=\''+t+'\';render()" style="padding:4px 12px;border-radius:6px;border:1.5px solid '+(on?'#c084fc':'rgba(255,255,255,.15)')+';background:'+(on?'rgba(124,58,237,.2)':'transparent')+';color:'+(on?'#c084fc':'rgba(255,255,255,.4)')+';font-size:12px;font-weight:700;cursor:pointer">'+t.toUpperCase()+'</button>';
      });
      h+='</div>';
    }
    h+='</div>';

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
  if(r.partial_day){
    h+='<span style="font-size:11px;padding:2px 7px;border-radius:5px;background:rgba(99,102,241,.18);color:#818cf8">½ day '+(r.partial_type||'am').toUpperCase()+'</span>';
  }
  h+='</div>';
  h+='<div style="font-size:13px;color:var(--text2);margin-bottom:4px">📅 '+_lvFmt(r.start_date)+' → '+_lvFmt(r.end_date)+'<span style="color:var(--text3);margin-left:8px">('+days+' day'+(days!==1?'s':'')+')</span></div>';
  if(r.reason){h+='<div style="font-size:12px;color:var(--text3);margin-top:4px;font-style:italic">"'+_lvEsc(r.reason)+'"</div>';}
  if(r.admin_comment){h+='<div style="font-size:12px;color:#f87171;margin-top:6px;background:rgba(239,68,68,.08);border-radius:6px;padding:5px 8px">💬 '+_lvEsc(r.admin_comment)+'</div>';}
  h+='</div>';
  h+='<div style="flex-shrink:0">'+_lvStatusBadge(r.status)+'</div>';
  h+='</div>';
  if(r.status==='pending'){
    h+='<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">';
    h+='<button tabindex="-1" onclick="window.withdrawLeave(\''+r.id+'\')" style="padding:5px 12px;border-radius:7px;border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.08);color:#f87171;font-size:12px;cursor:pointer">Withdraw</button>';
    h+='</div>';
  }
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
  h+='<input type="date" value="'+f.dateFrom+'" oninput="S._leave.filter.dateFrom=this.value;render()" title="From" style="padding:5px 9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:7px;color:var(--text);font-size:12px">';
  h+='<span style="color:var(--text3);font-size:12px">to</span>';
  h+='<input type="date" value="'+f.dateTo+'" oninput="S._leave.filter.dateTo=this.value;render()" title="To" style="padding:5px 9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:7px;color:var(--text);font-size:12px">';
  h+='<button tabindex="-1" onclick="S._leave._allLoaded=false;window.loadAllLeave()" style="padding:5px 10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:7px;color:rgba(255,255,255,.5);font-size:12px;cursor:pointer">⟳</button>';
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
    var isDecline=lv.declineId===r.id;

    // Overlap warning
    var overlaps=allReqs.filter(function(o){
      return o.id!==r.id&&o.status==='approved'&&o.start_date<=r.end_date&&o.end_date>=r.start_date;
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
    if(r.partial_day){h+=' <span style="font-size:11px;padding:2px 6px;border-radius:5px;background:rgba(99,102,241,.18);color:#818cf8">½ '+(r.partial_type||'am').toUpperCase()+'</span>';}
    h+='</div>';
    h+='<div style="font-size:13px;color:var(--text3)">📅 '+_lvFmt(r.start_date)+' → '+_lvFmt(r.end_date)+'<span style="margin-left:8px">('+days+' day'+(days!==1?'s':'')+')</span></div>';
    if(r.reason){h+='<div style="font-size:12px;color:var(--text3);margin-top:4px;font-style:italic">"'+_lvEsc(r.reason)+'"</div>';}
    h+='</div>';
    h+='<div style="flex-shrink:0">'+_lvStatusBadge(r.status)+'</div>';
    h+='</div>';

    // Overlap warning
    if(overlaps.length>0&&r.status==='pending'){
      var names=overlaps.map(function(o){return o.user_name||'Unknown';}).join(', ');
      h+='<div style="margin-top:8px;padding:7px 10px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:7px;font-size:12px;color:#fbbf24">⚠ Overlap: '+_lvEsc(names)+' also on leave during this period</div>';
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
    h+='</div>';
  });
  return h;
}

// ── Notification panel ──
function renderNotificationPanel(){
  var notifs=S._notifications||[];
  var unread=notifs.filter(function(n){return !n.read;}).length;
  var h='<div id="notif-panel" onclick="event.stopPropagation()" style="position:absolute;top:calc(100% + 6px);right:0;width:320px;max-height:420px;overflow-y:auto;background:#111827;border:1px solid rgba(255,255,255,.12);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.6);z-index:2100">';
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
      h+='<div style="font-size:12px;color:'+(n.read?'var(--text2)':'var(--text)')+';line-height:1.5;display:inline">'+_lvEsc(n.message||'')+'</div>';
      h+='<div style="font-size:10px;color:var(--text3);margin-top:4px">'+new Date(n.created_at).toLocaleDateString('en-NZ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+'</div>';
      if(n.type==='leave_submitted'&&n.reference_id){
        h+='<button tabindex="-1" onclick="S.section=\'leave\';_lvInit();S._leave.tab=\'approvals\';S._notifOpen=false;render()" style="font-size:11px;color:#a78bfa;background:none;border:none;cursor:pointer;padding:0;margin-top:4px">View request →</button>';
      }
      h+='</div>';
    });
  }
  h+='</div>';
  return h;
}

// ══════════════════════════════════════════════
// Cloud functions
// ══════════════════════════════════════════════

window.loadMyLeave=async function(){
  var uid=S.user?.id;if(!uid)return;
  var r=await fetch(SB+'/rest/v1/ts_leave_requests?select=*&user_id=eq.'+uid+'&order=submitted_at.desc',{headers:SH});
  if(r.ok){_lvInit().myReqs=await r.json();safeRender();}
};

window.loadAllLeave=async function(){
  var r=await fetch(SB+'/rest/v1/ts_leave_requests?select=*&order=submitted_at.desc',{headers:SH});
  if(r.ok){_lvInit().allReqs=await r.json();safeRender();}
};

window.submitLeaveRequest=async function(){
  var f=S._leave?.form;
  if(!f||!f.startDate||!f.endDate){toast('Please select start and end dates.','error');return;}
  if(f.endDate<f.startDate){toast('End date must be after start date.','error');return;}
  var uid=S.user?.id;
  var uname=S.user?.name||S.user?.email||'Unknown';
  var urole=S.user?.role||'desk';
  var days=_lvDays(f.startDate,f.endDate,f.partialDay);
  var payload={user_id:uid,user_name:uname,user_role:urole,
    leave_type:f.type,start_date:f.startDate,end_date:f.endDate,
    total_days:days,partial_day:f.partialDay,partial_type:f.partialType||'am',
    reason:f.reason||null,status:'pending',submitted_at:new Date().toISOString()};
  var res=await sbU('ts_leave_requests',[payload]);
  if(res&&res[0]){
    await sbU('ts_leave_audit',[{request_id:res[0].id,action:'submitted',performed_by:uid,performed_by_name:uname}]);
    await window._notifyLeaveApprovers(res[0].id,urole,uname,f.type,f.startDate,f.endDate);
    window._triggerLeaveEmail(res[0].id,'submitted').catch(function(){});
    S._leave.form={show:false,type:'annual',startDate:'',endDate:'',partialDay:false,partialType:'am',reason:''};
    S._leave._myLoaded=false;S._leave._allLoaded=false;
    toast('Leave request submitted!','success');
    window.loadMyLeave();
    if(_lvCanApprove(S.user?.role))window.loadAllLeave();
  } else {
    toast('Failed to submit request. Please try again.','error');
  }
};

window.approveLeave=async function(id){
  var me=S.user;
  var req=(S._leave?.allReqs||[]).find(function(r){return r.id===id;});
  if(!req)return;
  var overlaps=(S._leave?.allReqs||[]).filter(function(r){
    return r.id!==id&&r.status==='approved'&&r.start_date<=req.end_date&&r.end_date>=req.start_date;
  });
  if(overlaps.length>0){
    var names=overlaps.map(function(r){return r.user_name||'Unknown';}).join(', ');
    if(!confirm('Warning: '+names+' also have approved leave overlapping these dates. Approve anyway?'))return;
  }
  var ok=await sbPatch('ts_leave_requests',id,{
    status:'approved',reviewed_at:new Date().toISOString(),
    reviewed_by:me?.id,reviewed_by_name:me?.name||me?.email
  });
  if(ok){
    await sbU('ts_leave_audit',[{request_id:id,action:'approved',performed_by:me?.id,performed_by_name:me?.name||me?.email}]);
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
  var ok=await sbPatch('ts_leave_requests',id,{
    status:'declined',admin_comment:comment||null,
    reviewed_at:new Date().toISOString(),reviewed_by:me?.id,reviewed_by_name:me?.name||me?.email
  });
  if(ok){
    await sbU('ts_leave_audit',[{request_id:id,action:'declined',performed_by:me?.id,performed_by_name:me?.name||me?.email,comment:comment||null}]);
    await window._notifyLeaveUser(req.user_id,'declined',req.leave_type,req.start_date,req.end_date,comment);
    window._triggerLeaveEmail(id,'declined').catch(function(){});
    S._leave.declineId=null;S._leave.declineComment='';S._leave._allLoaded=false;
    toast('Leave declined.','info');
    window.loadAllLeave();
  }
};

window.withdrawLeave=async function(id){
  if(!confirm('Withdraw this leave request?'))return;
  var ok=await sbPatch('ts_leave_requests',id,{status:'withdrawn'});
  if(ok){
    S._leave._myLoaded=false;
    toast('Leave request withdrawn.','info');
    window.loadMyLeave();
  }
};

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

window._triggerLeaveEmail=async function(requestId,action){
  return fetch(SB+'/functions/v1/send-leave-email',{
    method:'POST',
    headers:{...SH,'Content-Type':'application/json'},
    body:JSON.stringify({requestId:requestId,action:action})
  });
};

window.loadNotifications=async function(){
  var uid=S.user?.id;if(!uid)return;
  var r=await fetch(SB+'/rest/v1/ts_notifications?select=*&user_id=eq.'+uid+'&order=created_at.desc&limit=20',{headers:SH});
  if(r.ok){S._notifications=await r.json();safeRender();}
};

window.markNotificationsRead=async function(){
  var uid=S.user?.id;if(!uid)return;
  await fetch(SB+'/rest/v1/ts_notifications?user_id=eq.'+uid+'&read=eq.false',{
    method:'PATCH',headers:{...SH,'Prefer':'return=minimal'},body:JSON.stringify({read:true})
  });
  (S._notifications||[]).forEach(function(n){n.read=true;});
  S._notifOpen=false;
  safeRender();
};
