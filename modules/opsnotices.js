// === MODULE: opsnotices === v1.0 ===
// Operations Notices (SMS). Admins create/issue notices to selected staff groups; recipients get a
// notification, open the notice, and Mark as read (recorded). Admins/superadmin/CX see who has / hasn't
// read. Unsigned notices re-notify the user on each login. Files (PDF/photo) stored as data-URIs for now
// (Supabase Storage is the planned upgrade — all uploads go through _onStoreFile). Numbering starts at 175.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
var ON_START_NO=175;
var ON_GROUPS=[
  {k:'pilots',lbl:'Pilots',roles:['pilot']},
  {k:'desk',  lbl:'Desk',  roles:['desk']},
  {k:'ground',lbl:'Ground Staff',roles:['ground_staff']},
  {k:'admin', lbl:'Admin', roles:['admin','superadmin','cx_manager']},
  {k:'other', lbl:'Other Staff',roles:['maint','maintenance','accounts','marketing']},
  {k:'everyone',lbl:'Everyone',roles:'*'}
];
var ON_STATUS=[['active','Active'],['ongoing','Ongoing'],['closed','Closed']];
function _onEsc(s){return (typeof esc==='function')?esc(s):String(s==null?'':s);}
function _onCanManage(){return (typeof hasRolePerm==='function'&&hasRolePerm('ops_notices_manage'))||!!(S.user&&S.user.superAdmin);}
function _onToday(){return (typeof _todayLocal==='function')?_todayLocal():new Date().toISOString().slice(0,10);}
function _onFmt(d){if(!d)return '';try{var p=String(d).split('-');return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):d;}catch(e){return d;}}
// roles a notice's selected groups resolve to (null = everyone)
function _onRolesFor(groups){groups=groups||[];if(groups.indexOf('everyone')>=0)return null;var set={};ON_GROUPS.forEach(function(g){if(groups.indexOf(g.k)>=0&&Array.isArray(g.roles))g.roles.forEach(function(r){set[r]=1;});});return Object.keys(set);}
function _onApplToRole(n,role){var roles=_onRolesFor(n.groups);return roles===null||roles.indexOf(role)>=0;}
function _onApplToMe(n){return S.user&&_onApplToRole(n,S.user.role);}
function _onReadKey(nid,uid){return String(nid)+'|'+String(uid);}
function _onHasRead(nid,uid){return !!(S._onReads&&S._onReads[_onReadKey(nid,uid)]);}

// ── Data ──────────────────────────────────────────────────────────────────────────
window.loadOpsNotices=async function(){
  try{var c=lsGet&&lsGet('ts_ops_notices_cache');if(c&&c.n)S._onData=c.n;if(c&&c.r)S._onReads=c.r;}catch(e){}
  if(typeof sbF!=='function')return;
  var nn=await sbF('ts_ops_notices','','created_at');
  if(nn){var d={};nn.forEach(function(r){d[r.id]=_onRow(r);});
    // Recover any notices that failed to sync earlier (e.g. the no-as-string bug) — keep + re-push.
    try{Object.keys(S._onData||{}).forEach(function(k){if(!d[k]&&S._onData[k]){d[k]=S._onData[k];if(typeof sbU==='function')sbU('ts_ops_notices',[_onPayload(S._onData[k])]).catch(function(){});}});}catch(e){}
    S._onData=d;}
  var rr=await sbF('ts_ops_notice_reads','','read_at');
  if(rr){var m={};rr.forEach(function(r){m[_onReadKey(r.notice_id,r.user_id)]={by:r.user_name,at:r.read_at};});S._onReads=m;}
  try{lsSet&&lsSet('ts_ops_notices_cache',{n:S._onData,r:S._onReads});}catch(e){}
  if(!S._onResent&&S.user){S._onResent=true;if(window.onResendUnreadOnLogin)window.onResendUnreadOnLogin();}
  if(typeof safeRender==='function')safeRender();
};
function _onRow(r){return {id:r.id,no:r.no,subject:r.subject||'',body:r.body||'',issued_by:r.issued_by||'',issued_by_id:r.issued_by_id||'',date_issued:r.date_issued||'',status:r.status||'active',groups:Array.isArray(r.groups)?r.groups:[],files:Array.isArray(r.files)?r.files:[],created_at:r.created_at};}
function _onPayload(f){var _no=parseInt(f.no,10);return {id:f.id,no:(isFinite(_no)?_no:null),subject:f.subject,body:f.body,issued_by:f.issued_by||'',issued_by_id:f.issued_by_id||null,date_issued:f.date_issued||null,status:f.status||'active',groups:f.groups||[],files:f.files||[],created_at:f.created_at||new Date().toISOString()};}
function _onNextNo(){var mx=ON_START_NO-1;Object.keys(S._onData||{}).forEach(function(k){var n=+(S._onData[k].no);if(!isNaN(n)&&n>mx)mx=n;});return mx+1;}
function _onList(){return Object.keys(S._onData||{}).map(function(k){return S._onData[k];}).sort(function(a,b){return (+b.no||0)-(+a.no||0);});}

// ── File upload (data-URI stub) ─────────────────────────────────────────────────────
function _onStoreFile(file,cb){
  if(file.size>25*1024*1024){if(typeof toast==='function')toast('File too big (max 25MB).','warn');cb(null);return;}
  var asBase64=function(){
    if(file.size>6*1024*1024){if(typeof toast==='function')toast('Upload failed and file too big to embed.','warn');cb(null);return;}
    var rd=new FileReader();rd.onload=function(){cb({name:file.name,type:file.type,data:rd.result});};rd.onerror=function(){cb(null);};rd.readAsDataURL(file);
  };
  // Upload to Supabase Storage → store the public URL; fall back to an inline data-URI on failure.
  if(typeof window._tsUploadFile==='function'){
    window._tsUploadFile(file,'opsnotice',file.name).then(function(url){ if(url)cb({name:file.name,type:file.type,data:url}); else asBase64(); });
  } else asBase64();
}
window.onAddFile=function(input){var f=input&&input.files&&input.files[0];if(!f||!S._onDraft)return;_onStoreFile(f,function(rec){if(rec&&S._onDraft){S._onDraft.files=S._onDraft.files||[];S._onDraft.files.push(rec);render();}});};
window.onDelFile=function(i){if(S._onDraft&&S._onDraft.files){S._onDraft.files.splice(i,1);render();}};

// ── Draft / create / issue ──────────────────────────────────────────────────────────
window.onNew=function(){S._onDraft={id:'on_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),no:_onNextNo(),subject:'',body:'',issued_by:(S.user&&S.user.name)||'',issued_by_id:(S.user&&S.user.id)||'',date_issued:_onToday(),status:'active',groups:[],files:[]};S._onView='edit';S._onOpen=null;render();};
window.onEdit=function(id){var n=(S._onData||{})[id];if(!n)return;S._onDraft=JSON.parse(JSON.stringify(n));S._onView='edit';S._onOpen=null;render();};
window.onDraftField=function(k,v){if(S._onDraft)S._onDraft[k]=v;};            // no render (keep focus)
window.onDraftStatus=function(v){if(S._onDraft){S._onDraft.status=v;render();}};
window.onToggleGroup=function(k){if(!S._onDraft)return;var g=S._onDraft.groups||[];var i=g.indexOf(k);if(i>=0)g.splice(i,1);else g.push(k);S._onDraft.groups=g;render();};
window.onCancelEdit=function(){S._onDraft=null;S._onView='list';render();};
window.onSave=async function(issue){
  var f=S._onDraft;if(!f)return;
  if(!f.subject||!f.subject.trim()){if(typeof toast==='function')toast('Enter a subject.','warn');return;}
  if(!f.body||!f.body.trim()){if(typeof toast==='function')toast('Enter the notice text.','warn');return;}
  if(!f.groups||!f.groups.length){if(typeof toast==='function')toast('Pick at least one group under "Applicable to".','warn');return;}
  S._onData=S._onData||{};S._onData[f.id]=JSON.parse(JSON.stringify(f));
  try{lsSet&&lsSet('ts_ops_notices_cache',{n:S._onData,r:S._onReads});}catch(e){}
  var r=(typeof sbU==='function')?await sbU('ts_ops_notices',[_onPayload(f)]):true;
  if(typeof toast==='function')toast(r?(issue?'Notice issued ✓':'Notice saved ✓'):'Saved on device — will sync','ok');
  if(issue)_onNotifyRecipients(f);
  S._onDraft=null;S._onView='list';render();
};
function _onNotifyRecipients(n){
  try{
    var roles=_onRolesFor(n.groups);
    var ids=(S.users||[]).filter(function(u){return u&&!u.inactive&&String(u.id)!==String(S.user&&S.user.id)&&(roles===null||roles.indexOf(u.role)>=0);}).map(function(u){return String(u.id);});
    if(!ids.length||typeof sbU!=='function')return;
    var msg='📋 Ops Notice #'+n.no+': '+n.subject;
    sbU('ts_notifications',ids.map(function(uid){return {user_id:uid,type:'ops_notice',reference_id:n.id,message:msg,read:false,created_at:new Date().toISOString()};})).catch(function(){});
    if(typeof window.loadNotifications==='function')window.loadNotifications();
  }catch(e){}
}
window.onDelete=async function(id){var n=(S._onData||{})[id];if(!n)return;if(!confirm('Delete Ops Notice #'+n.no+'?'))return;delete S._onData[id];try{lsSet&&lsSet('ts_ops_notices_cache',{n:S._onData,r:S._onReads});}catch(e){}if(typeof sbU==='function')await sbU('ts_ops_notices',[{id:id,no:n.no,subject:n.subject,body:n.body,status:'deleted',date_issued:n.date_issued,groups:n.groups,created_at:n.created_at}]).catch(function(){});S._onOpen=null;render();};

// ── Mark as read ────────────────────────────────────────────────────────────────────
window.onMarkRead=async function(id){
  var uid=(S.user&&S.user.id)||'';if(!uid)return;
  S._onReads=S._onReads||{};S._onReads[_onReadKey(id,uid)]={by:(S.user&&S.user.name)||'',at:new Date().toISOString()};
  try{lsSet&&lsSet('ts_ops_notices_cache',{n:S._onData,r:S._onReads});}catch(e){}
  if(typeof sbU==='function')await sbU('ts_ops_notice_reads',[{id:_onReadKey(id,uid),notice_id:id,user_id:uid,user_name:(S.user&&S.user.name)||'',read_at:new Date().toISOString()}]).catch(function(){});
  if(typeof toast==='function')toast('Marked as read ✓','ok');render();
};
// On login: re-notify the user of any ACTIVE notice applicable to them that they haven't read yet.
window.onResendUnreadOnLogin=function(){
  try{
    if(!S.user||typeof sbU!=='function')return;var uid=String(S.user.id);
    var unread=_onList().filter(function(n){return n.status!=='closed'&&n.status!=='deleted'&&_onApplToMe(n)&&!_onHasRead(n.id,uid);});
    if(!unread.length)return;
    sbU('ts_notifications',unread.map(function(n){return {user_id:uid,type:'ops_notice',reference_id:n.id,message:'📋 Unread Ops Notice #'+n.no+': '+n.subject,read:false,created_at:new Date().toISOString()};})).catch(function(){});
  }catch(e){}
};

// ── Render ────────────────────────────────────────────────────────────────────────
function renderOpsNotices(){
  if(!S._onLoaded){S._onLoaded=true;if(window.loadOpsNotices)window.loadOpsNotices();}
  if(S._onView==='edit'&&_onCanManage())return _onRenderEdit();
  if(S._onOpen)return _onRenderView(S._onOpen);
  return _onRenderList();
}
function _onRenderList(){
  var mine=!_onCanManage();
  var rows=_onList().filter(function(n){return n.status!=='deleted'&&(!mine||_onApplToMe(n));});
  var q=(S._onSearch||'').trim().toLowerCase();
  if(q)rows=rows.filter(function(n){return (n.subject+' '+n.body+' '+n.no).toLowerCase().indexOf(q)>=0;});
  var h='<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><div class="st" style="margin:0">Operations Notices</div>'+
    (_onCanManage()?'<button onclick="window.onNew()" style="padding:8px 14px;border-radius:8px;border:none;background:var(--accent,#7c3aed);color:#fff;font-weight:700;font-size:13px;cursor:pointer">＋ New notice</button>':'')+'</div>'+
    '<input type="text" placeholder="Search notices…" value="'+_onEsc(S._onSearch||'')+'" oninput="S._onSearch=this.value;render()" style="width:100%;box-sizing:border-box;margin:12px 0;padding:9px 12px;background:var(--card2);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-size:13px">';
  if(!rows.length)return h+'<p style="color:var(--text3)">No notices'+(q?' match.':' yet.')+'</p></div>';
  h+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:.04em"><th style="padding:6px 8px">#</th><th style="padding:6px 8px">Date</th><th style="padding:6px 8px">Subject</th><th style="padding:6px 8px">Status</th><th style="padding:6px 8px">Applicable to</th>'+(_onCanManage()?'<th style="padding:6px 8px">Read</th>':'<th style="padding:6px 8px"></th>')+'</tr></thead><tbody>';
  rows.forEach(function(n){
    var st=ON_STATUS.find(function(s){return s[0]===n.status;});
    var read=_onHasRead(n.id,(S.user&&S.user.id)||'');
    var applLbls=(n.groups||[]).map(function(k){var g=ON_GROUPS.find(function(x){return x.k===k;});return g?g.lbl:k;}).join(', ');
    var readInfo='';
    if(_onCanManage()){var rec=_onRecipients(n);var rc=rec.filter(function(u){return _onHasRead(n.id,u.id);}).length;readInfo='<span style="font-size:12px;color:'+(rc>=rec.length&&rec.length?'#16a34a':'#f59e0b')+';font-weight:700">'+rc+'/'+rec.length+'</span>';}
    else readInfo=read?'<span style="font-size:11px;color:#16a34a;font-weight:700">✓ read</span>':'<span style="font-size:11px;color:#f59e0b;font-weight:700">unread</span>';
    h+='<tr onclick="S._onOpen=\''+n.id+'\';render()" style="cursor:pointer;border-top:1px solid var(--border2)'+(!read&&!_onCanManage()?';background:rgba(124,58,237,.05)':'')+'">'+
      '<td style="padding:8px;font-weight:800">'+_onEsc(n.no)+'</td>'+
      '<td style="padding:8px;white-space:nowrap">'+_onEsc(_onFmt(n.date_issued))+'</td>'+
      '<td style="padding:8px;font-weight:600;max-width:280px">'+_onEsc(n.subject)+'</td>'+
      '<td style="padding:8px"><span style="padding:2px 9px;border-radius:20px;font-size:11px;font-weight:800;background:rgba(0,0,0,.06);color:'+(n.status==='active'?'#16a34a':n.status==='ongoing'?'#f59e0b':'var(--text3)')+'">'+_onEsc(st?st[1]:n.status)+'</span></td>'+
      '<td style="padding:8px;font-size:12px;color:var(--text2)">'+_onEsc(applLbls)+'</td>'+
      '<td style="padding:8px">'+readInfo+'</td></tr>';
  });
  h+='</tbody></table></div></div>';
  return h;
}
function _onRecipients(n){var roles=_onRolesFor(n.groups);return (S.users||[]).filter(function(u){return u&&!u.inactive&&(roles===null||roles.indexOf(u.role)>=0);}).map(function(u){return {id:String(u.id),name:u.name||u.email||''};});}
function _onRenderView(id){
  var n=(S._onData||{})[id];if(!n){S._onOpen=null;return _onRenderList();}
  var read=_onHasRead(n.id,(S.user&&S.user.id)||'');
  var h='<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><button onclick="S._onOpen=null;render()" style="font-size:12px;background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:5px 12px;cursor:pointer;color:var(--text2)">← Back</button>'+
    (_onCanManage()?'<div style="display:flex;gap:6px"><button onclick="window.onEdit(\''+n.id+'\')" style="font-size:12px;padding:5px 12px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);cursor:pointer;color:var(--text2)">Edit</button><button onclick="window.onDelete(\''+n.id+'\')" style="font-size:12px;padding:5px 12px;border-radius:8px;border:1px solid rgba(239,68,68,.4);background:none;color:#f87171;cursor:pointer">Delete</button></div>':'')+'</div>'+
    '<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 2px">Ops Notice #'+_onEsc(n.no)+'</div>'+
    '<div class="st" style="margin:0 0 6px">'+_onEsc(n.subject)+'</div>'+
    '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--text3);margin-bottom:14px"><span>Issued '+_onEsc(_onFmt(n.date_issued))+'</span>'+(n.issued_by?'<span>By '+_onEsc(n.issued_by)+'</span>':'')+'<span>Status: '+_onEsc((ON_STATUS.find(function(s){return s[0]===n.status;})||[])[1]||n.status)+'</span><span>To: '+_onEsc((n.groups||[]).map(function(k){var g=ON_GROUPS.find(function(x){return x.k===k;});return g?g.lbl:k;}).join(', '))+'</span></div>'+
    '<div style="font-size:14px;line-height:1.6;color:var(--text);white-space:pre-wrap;border-top:1px solid var(--border2);padding-top:14px">'+_onEsc(n.body)+'</div>';
  if(n.files&&n.files.length){
    h+='<div style="margin-top:14px"><div style="font-size:11px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Attachments</div>';
    n.files.forEach(function(fl,i){
      if(fl.type&&fl.type.indexOf('image')===0)h+='<img src="'+fl.data+'" style="max-width:100%;border-radius:8px;border:1px solid var(--border2);margin-bottom:8px">';
      else h+='<a href="'+fl.data+'" download="'+_onEsc(fl.name)+'" style="display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid var(--border2);border-radius:8px;background:var(--card2);color:var(--text2);font-size:13px;text-decoration:none;margin:0 8px 8px 0">📎 '+_onEsc(fl.name)+'</a>';
    });
    h+='</div>';
  }
  // Mark-as-read (recipients) or read-status (managers)
  if(_onApplToMe(n)){
    h+='<div style="margin-top:18px;border-top:1px solid var(--border2);padding-top:14px">'+
      (read?'<div style="display:inline-flex;align-items:center;gap:8px;color:#16a34a;font-weight:700;font-size:14px">✅ You have read &amp; acknowledged this notice</div>'
            :'<button onclick="window.onMarkRead(\''+n.id+'\')" style="width:100%;padding:13px;background:#16a34a;border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:800;cursor:pointer">✓ I have read &amp; understood this notice</button>')+
    '</div>';
  }
  if(_onCanManage()){
    var rec=_onRecipients(n);var readers=rec.filter(function(u){return _onHasRead(n.id,u.id);});var pend=rec.filter(function(u){return !_onHasRead(n.id,u.id);});
    h+='<div style="margin-top:18px;border-top:1px solid var(--border2);padding-top:14px"><div style="font-size:12px;font-weight:800;color:var(--text2);margin-bottom:8px">Read receipts — '+readers.length+'/'+rec.length+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
        '<div><div style="font-size:11px;color:#16a34a;font-weight:700;margin-bottom:4px">Read ('+readers.length+')</div>'+(readers.map(function(u){return '<div style="font-size:12px;color:var(--text2);padding:2px 0">✓ '+_onEsc(u.name)+'</div>';}).join('')||'<div style="font-size:12px;color:var(--text3)">—</div>')+'</div>'+
        '<div><div style="font-size:11px;color:#f59e0b;font-weight:700;margin-bottom:4px">Not yet ('+pend.length+')</div>'+(pend.map(function(u){return '<div style="font-size:12px;color:var(--text2);padding:2px 0">• '+_onEsc(u.name)+'</div>';}).join('')||'<div style="font-size:12px;color:var(--text3)">everyone has read ✓</div>')+'</div>'+
      '</div></div>';
  }
  h+='</div>';
  return h;
}
function _onRenderEdit(){
  var f=S._onDraft;if(!f)return _onRenderList();
  var _i='width:100%;box-sizing:border-box;padding:9px 11px;background:var(--card2);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-size:14px';
  var staff=(S.users||[]).filter(function(u){return u&&!u.inactive;}).map(function(u){return u.name||u.email;}).filter(Boolean).sort();
  var h='<div class="card"><div class="st">'+(((S._onData||{})[f.id])?'Edit':'New')+' Operations Notice</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-top:12px">'+
      '<div><label style="font-size:11px;font-weight:700;color:var(--text3)">Notice number *</label><input type="number" value="'+_onEsc(f.no)+'" oninput="window.onDraftField(\'no\',this.value)" style="'+_i+'"></div>'+
      '<div><label style="font-size:11px;font-weight:700;color:var(--text3)">Subject *</label><input value="'+_onEsc(f.subject)+'" oninput="window.onDraftField(\'subject\',this.value)" style="'+_i+'"></div>'+
      '<div><label style="font-size:11px;font-weight:700;color:var(--text3)">Date issued</label><input type="date" value="'+_onEsc(f.date_issued)+'" onchange="window.onDraftField(\'date_issued\',this.value)" style="'+_i+'"></div>'+
      '<div><label style="font-size:11px;font-weight:700;color:var(--text3)">Issued by</label><input value="'+_onEsc(f.issued_by)+'" oninput="window.onDraftField(\'issued_by\',this.value)" list="on_staff" style="'+_i+'"><datalist id="on_staff">'+staff.map(function(s){return '<option value="'+_onEsc(s)+'">';}).join('')+'</datalist></div>'+
      '<div><label style="font-size:11px;font-weight:700;color:var(--text3)">Status</label><select onchange="window.onDraftStatus(this.value)" style="'+_i+'">'+ON_STATUS.map(function(s){return '<option value="'+s[0]+'"'+(f.status===s[0]?' selected':'')+'>'+s[1]+'</option>';}).join('')+'</select></div>'+
    '</div>'+
    '<div style="margin-top:14px"><label style="font-size:11px;font-weight:700;color:var(--text3)">Applicable to *</label><div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:5px">'+
      ON_GROUPS.map(function(g){var on=(f.groups||[]).indexOf(g.k)>=0;return '<button onclick="window.onToggleGroup(\''+g.k+'\')" style="padding:6px 13px;border-radius:20px;border:1px solid '+(on?'var(--accent,#7c3aed)':'var(--border2)')+';background:'+(on?'var(--accent,#7c3aed)':'var(--card2)')+';color:'+(on?'#fff':'var(--text2)')+';font-size:12px;font-weight:700;cursor:pointer">'+g.lbl+'</button>';}).join('')+
    '</div></div>'+
    '<div style="margin-top:14px"><label style="font-size:11px;font-weight:700;color:var(--text3)">Operations Notice text *</label><textarea oninput="window.onDraftField(\'body\',this.value)" placeholder="Type the notice…" style="'+_i+';min-height:180px;resize:vertical;line-height:1.5">'+_onEsc(f.body)+'</textarea></div>'+
    // attachments
    '<div style="margin-top:14px"><label style="font-size:11px;font-weight:700;color:var(--text3)">Attachments (PDF / photos)</label><div style="margin-top:5px">'+
      (f.files||[]).map(function(fl,i){return '<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid var(--border2);border-radius:8px;background:var(--card2);font-size:12px;color:var(--text2);margin:0 8px 8px 0">📎 '+_onEsc(fl.name)+' <button onclick="window.onDelFile('+i+')" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:13px">×</button></span>';}).join('')+
      '<label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--accent,#7c3aed);cursor:pointer">＋ Add file<input type="file" accept="application/pdf,image/*" onchange="window.onAddFile(this)" style="display:none"></label>'+
    '</div></div>'+
    '<div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap">'+
      '<button onclick="window.onSave(true)" style="flex:1;min-width:160px;padding:13px;background:var(--accent,#7c3aed);border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:800;cursor:pointer">Issue notice &amp; notify</button>'+
      '<button onclick="window.onSave(false)" style="padding:13px 18px;background:var(--card2);border:1px solid var(--border2);border-radius:10px;color:var(--text2);font-size:14px;font-weight:700;cursor:pointer">Save only</button>'+
      '<button onclick="window.onCancelEdit()" style="padding:13px 18px;background:none;border:1px solid var(--border2);border-radius:10px;color:var(--text3);font-size:14px;cursor:pointer">Cancel</button>'+
    '</div>'+
  '</div>';
  return h;
}
