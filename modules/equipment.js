// === MODULE: equipment === v1.0 ===
// Ground equipment & vehicle servicing tracker (Ground ▸ Equipment). Add an item (e.g. "Air Compressor"),
// add one or more checks to it (e.g. "Empty & Drain") each with a frequency; when a check falls due, on
// that day ground staff rostered on get a reminder notification. Every completion is kept in the item's
// service log. Persists to ts_equipment.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
var EQ_FREQ=[['weekly','Weekly',7],['fortnightly','Fortnightly',14],['monthly','Monthly',null],['quarterly','Quarterly',null],['6monthly','6-monthly',null],['annual','Annual',null]];
function _eqEsc(s){return (typeof esc==='function')?esc(s):String(s==null?'':s);}
function _eqToday(){return (typeof _todayLocal==='function')?_todayLocal():new Date().toISOString().slice(0,10);}
function _eqFmt(d){if(!d)return '—';var p=String(d).split('-');return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):d;}
function _eqCanManage(){return (typeof hasRolePerm==='function'&&(hasRolePerm('ground')||hasRolePerm('maintenance')))||!!(S.user&&S.user.superAdmin);}
function _eqAddFreq(dateStr,freq){
  var d=dateStr?new Date(String(dateStr)+'T00:00:00'):new Date();
  if(freq==='weekly')d.setDate(d.getDate()+7);
  else if(freq==='fortnightly')d.setDate(d.getDate()+14);
  else if(freq==='monthly')d.setMonth(d.getMonth()+1);
  else if(freq==='quarterly')d.setMonth(d.getMonth()+3);
  else if(freq==='6monthly')d.setMonth(d.getMonth()+6);
  else if(freq==='annual')d.setFullYear(d.getFullYear()+1);
  else d.setMonth(d.getMonth()+1);
  return (typeof _rIso==='function')?_rIso(d):d.toISOString().slice(0,10);
}
function _eqFreqLbl(f){var x=EQ_FREQ.find(function(e){return e[0]===f;});return x?x[1]:f;}

// ── Data ──────────────────────────────────────────────────────────────────────────
window.loadEquipment=async function(){
  try{var c=lsGet&&lsGet('ts_equipment_cache');if(c&&typeof c==='object')S._eqData=c;}catch(e){}
  if(typeof sbF!=='function')return;
  var rows=await sbF('ts_equipment','','created_at');
  if(rows){var d={};rows.forEach(function(r){if(r.active!==false)d[r.id]=_eqRow(r);});S._eqData=d;try{lsSet&&lsSet('ts_equipment_cache',d);}catch(e){}}
  if(!S._eqRemindDone&&S.user){S._eqRemindDone=true;_eqRemind();}
  if(typeof safeRender==='function')safeRender();
};
function _eqRow(r){return {id:r.id,name:r.name||'',category:r.category||'',notes:r.notes||'',checks:Array.isArray(r.checks)?r.checks:[],log:Array.isArray(r.log)?r.log:[],created_at:r.created_at};}
function _eqSave(item){
  if(!item)return;S._eqData=S._eqData||{};S._eqData[item.id]=item;
  try{lsSet&&lsSet('ts_equipment_cache',S._eqData);}catch(e){}
  if(typeof sbU==='function')sbU('ts_equipment',[{id:item.id,name:item.name,category:item.category||'',notes:item.notes||'',checks:item.checks||[],log:item.log||[],active:true,created_at:item.created_at||new Date().toISOString()}]).catch(function(){});
}
function _eqList(){return Object.keys(S._eqData||{}).map(function(k){return S._eqData[k];}).sort(function(a,b){return String(a.name).localeCompare(String(b.name));});}
function _eqDueChecks(item){var t=_eqToday();return (item.checks||[]).filter(function(c){return c.next&&c.next<=t;});}
function _eqItemDue(item){return _eqDueChecks(item).length>0;}

// ── Reminders (notify rostered ground staff on the day a check is due) ──────────────
function _eqGroundStaffToday(){
  var ds=_eqToday(),roster=S.roster||{},off={rdo:1,off:1,leave:1,ul:1,sick:1,'':1};
  return (S.users||[]).filter(function(u){if(!u||u.inactive||u.role!=='ground_staff')return false;var st=(typeof _rGetStatus==='function')?_rGetStatus(u,ds,roster):'';return !off[st];}).map(function(u){return String(u.id);});
}
function _eqRemind(){
  try{
    if(typeof sbU!=='function')return;var t=_eqToday();var ids=_eqGroundStaffToday();if(!ids.length)return;
    _eqList().forEach(function(item){
      (item.checks||[]).forEach(function(c){
        if(c.next&&c.next<=t&&c._notified!==t){
          c._notified=t;
          sbU('ts_notifications',ids.map(function(uid){return {user_id:uid,type:'equipment',reference_id:item.id,message:'🔧 '+item.name+' — "'+c.label+'" is due today',read:false,created_at:new Date().toISOString()};})).catch(function(){});
          _eqSave(item);
        }
      });
    });
  }catch(e){}
}

// ── Handlers ────────────────────────────────────────────────────────────────────────
window.eqAddItem=function(){var name=prompt('Equipment / vehicle name (e.g. Air Compressor):');if(!name||!name.trim())return;var item={id:'eq_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),name:name.trim(),category:'',notes:'',checks:[],log:[],created_at:new Date().toISOString()};_eqSave(item);S._eqOpen=item.id;render();};
window.eqDelItem=function(id){var it=(S._eqData||{})[id];if(!it)return;if(!confirm('Delete "'+it.name+'" and its checks/log?'))return;delete S._eqData[id];try{lsSet&&lsSet('ts_equipment_cache',S._eqData);}catch(e){}if(typeof sbU==='function')sbU('ts_equipment',[{id:id,name:it.name,active:false,checks:it.checks,log:it.log,created_at:it.created_at}]).catch(function(){});S._eqOpen=null;render();};
window.eqAddCheck=function(id){var it=(S._eqData||{})[id];if(!it)return;var label=prompt('Check to add (e.g. Empty & Drain):');if(!label||!label.trim())return;it.checks=it.checks||[];it.checks.push({id:'c_'+Date.now().toString(36),label:label.trim(),freq:'monthly',last:'',next:_eqToday()});_eqSave(it);render();};
window.eqCheckFreq=function(id,cid,freq){var it=(S._eqData||{})[id];if(!it)return;var c=(it.checks||[]).find(function(x){return x.id===cid;});if(c){c.freq=freq;if(c.last)c.next=_eqAddFreq(c.last,freq);_eqSave(it);render();}};
window.eqCheckDel=function(id,cid){var it=(S._eqData||{})[id];if(!it)return;it.checks=(it.checks||[]).filter(function(x){return x.id!==cid;});_eqSave(it);render();};
window.eqMarkDone=function(id,cid){
  var it=(S._eqData||{})[id];if(!it)return;var c=(it.checks||[]).find(function(x){return x.id===cid;});if(!c)return;
  var t=_eqToday();c.last=t;c.next=_eqAddFreq(t,c.freq);c._notified='';
  it.log=it.log||[];it.log.unshift({date:t,by:(S.user&&S.user.name)||'',check:c.label,ts:new Date().toISOString()});
  if(it.log.length>200)it.log=it.log.slice(0,200);
  _eqSave(it);if(typeof toast==='function')toast('Logged: '+c.label+' ✓','ok');render();
};
window.eqItemNotes=function(id,v){var it=(S._eqData||{})[id];if(it)it.notes=v;};
window.eqSaveNotes=function(id){var it=(S._eqData||{})[id];if(it)_eqSave(it);};

// ── Render ────────────────────────────────────────────────────────────────────────
function renderEquipment(){
  if(!S._eqLoaded){S._eqLoaded=true;if(window.loadEquipment)window.loadEquipment();}
  if(S._eqOpen)return _eqRenderItem(S._eqOpen);
  return _eqRenderList();
}
function _eqRenderList(){
  var items=_eqList();
  var h='<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><div class="st" style="margin:0">Equipment & servicing</div>'+
    (_eqCanManage()?'<button onclick="window.eqAddItem()" style="padding:8px 14px;border-radius:8px;border:none;background:var(--accent,#7c3aed);color:#fff;font-weight:700;font-size:13px;cursor:pointer">＋ Add item</button>':'')+'</div>';
  if(!items.length)return h+'<p style="color:var(--text3);margin-top:12px">No equipment yet. Add an item to start tracking its servicing.</p></div>';
  h+='<div style="margin-top:12px">';
  items.forEach(function(it){
    var due=_eqDueChecks(it);var nextChk=(it.checks||[]).slice().filter(function(c){return c.next;}).sort(function(a,b){return String(a.next).localeCompare(String(b.next));})[0];
    h+='<button onclick="S._eqOpen=\''+it.id+'\';render()" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:13px 15px;border:1px solid '+(due.length?'rgba(239,68,68,.4)':'var(--border2)')+';border-radius:10px;background:'+(due.length?'rgba(239,68,68,.06)':'var(--card2)')+';cursor:pointer;margin-bottom:8px">'+
      '<span style="font-size:18px">🔧</span><div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:700;color:var(--text)">'+_eqEsc(it.name)+'</div>'+
      '<div style="font-size:12px;color:var(--text3)">'+(it.checks||[]).length+' check'+((it.checks||[]).length===1?'':'s')+(nextChk?(' · next: '+_eqEsc(nextChk.label)+' '+_eqFmt(nextChk.next)):'')+'</div></div>'+
      (due.length?'<span style="flex-shrink:0;padding:3px 10px;border-radius:20px;background:rgba(239,68,68,.15);color:#dc2626;font-size:11px;font-weight:800">'+due.length+' due</span>':'<span style="flex-shrink:0;color:var(--text3);font-size:12px">→</span>')+
    '</button>';
  });
  h+='</div></div>';
  return h;
}
function _eqRenderItem(id){
  var it=(S._eqData||{})[id];if(!it){S._eqOpen=null;return _eqRenderList();}
  var t=_eqToday();
  var h='<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><button onclick="S._eqOpen=null;render()" style="font-size:12px;background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:5px 12px;cursor:pointer;color:var(--text2)">← Back</button>'+
    (_eqCanManage()?'<button onclick="window.eqDelItem(\''+it.id+'\')" style="font-size:12px;padding:5px 12px;border-radius:8px;border:1px solid rgba(239,68,68,.4);background:none;color:#f87171;cursor:pointer">Delete</button>':'')+'</div>'+
    '<div class="st" style="margin:12px 0 4px">🔧 '+_eqEsc(it.name)+'</div>';
  // checks
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin:14px 0 6px"><div style="font-size:12px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.05em">Checks</div>'+(_eqCanManage()?'<button onclick="window.eqAddCheck(\''+it.id+'\')" style="font-size:12px;color:var(--accent,#7c3aed);background:none;border:none;cursor:pointer;font-weight:700">＋ Add check</button>':'')+'</div>';
  if(!(it.checks||[]).length)h+='<p style="color:var(--text3);font-size:13px">No checks yet.</p>';
  (it.checks||[]).forEach(function(c){
    var overdue=c.next&&c.next<t,duetoday=c.next===t;
    h+='<div style="border:1px solid '+(overdue||duetoday?'rgba(239,68,68,.4)':'var(--border2)')+';border-radius:9px;padding:11px;margin-bottom:8px;background:var(--card2)">'+
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="flex:1;font-size:14px;font-weight:700;color:var(--text);min-width:120px">'+_eqEsc(c.label)+'</span>'+
        (_eqCanManage()?'<select onchange="window.eqCheckFreq(\''+it.id+'\',\''+c.id+'\',this.value)" style="padding:5px 8px;background:var(--card);border:1px solid var(--border2);border-radius:7px;color:var(--text2);font-size:12px">'+EQ_FREQ.map(function(e){return '<option value="'+e[0]+'"'+(c.freq===e[0]?' selected':'')+'>'+e[1]+'</option>';}).join('')+'</select>':'<span style="font-size:12px;color:var(--text3)">'+_eqFreqLbl(c.freq)+'</span>')+
        '<button onclick="window.eqMarkDone(\''+it.id+'\',\''+c.id+'\')" style="padding:6px 13px;border-radius:8px;border:none;background:#16a34a;color:#fff;font-size:12px;font-weight:800;cursor:pointer">Mark done</button>'+
        (_eqCanManage()?'<button onclick="window.eqCheckDel(\''+it.id+'\',\''+c.id+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:15px">×</button>':'')+
      '</div>'+
      '<div style="font-size:12px;margin-top:5px;color:'+(overdue?'#dc2626':duetoday?'#b45309':'var(--text3)')+'">Last: '+_eqFmt(c.last)+' · Next due: '+_eqFmt(c.next)+(overdue?' (overdue)':duetoday?' (today)':'')+'</div>'+
    '</div>';
  });
  // notes
  h+='<div style="margin-top:14px"><label style="font-size:11px;font-weight:700;color:var(--text3)">Notes</label><textarea oninput="window.eqItemNotes(\''+it.id+'\',this.value)" onblur="window.eqSaveNotes(\''+it.id+'\')" style="width:100%;box-sizing:border-box;padding:8px 10px;background:var(--card2);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-size:13px;min-height:46px;resize:vertical">'+_eqEsc(it.notes)+'</textarea></div>';
  // service log
  h+='<div style="margin-top:16px"><div style="font-size:12px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Service log</div>';
  if(!(it.log||[]).length)h+='<p style="color:var(--text3);font-size:13px">No servicing logged yet.</p>';
  else{h+='<table style="width:100%;border-collapse:collapse;font-size:13px"><tbody>';(it.log||[]).forEach(function(l){h+='<tr style="border-top:1px solid var(--border2)"><td style="padding:6px 8px;white-space:nowrap;color:var(--text2)">'+_eqFmt(l.date)+'</td><td style="padding:6px 8px;font-weight:600">'+_eqEsc(l.check)+'</td><td style="padding:6px 8px;color:var(--text3)">'+_eqEsc(l.by)+'</td></tr>';});h+='</tbody></table>';}
  h+='</div></div>';
  return h;
}
