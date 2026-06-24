// === MODULE: maintforms === v26.31 ===
// ─────────────────────────────────────────────────────────────────────────────
//  MAINTENANCE FORMS — fillable, cross-device aircraft documents.
//  v1 = the SLA 13 Work Order. Shown as "document squares" at the top of the
//  Maintenance ▸ Log page (per selected aircraft), with the aircraft switcher above.
//  Items 6/7/8 are ongoing line-item lists (✓ done / ✗ deferred + engineer initial).
//  Item 9 (oil) is calculated from the oil logs since the aircraft's last oil change.
//  Forms persist to ts_maint_forms (realtime), print, upload to Drive, and delete.
//  See maint_forms.sql.
// ─────────────────────────────────────────────────────────────────────────────

function _mfEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _mfAcType(ac){var sp=(typeof _acSpec==='function')?_acSpec(ac):null;if(sp&&sp.layout==='ga8')return 'GA8';if(ac)return 'C208B';return '';}
function _mfNowDate(){return (typeof _todayLocal==='function')?_todayLocal():new Date().toISOString().slice(0,10);}
function _mfAcDisp(ac){return (typeof acDisp==='function')?acDisp(ac):String(ac||'');}
function _mfTitle(f){var d=f.data||{};return 'WO'+(d.woNo?' '+d.woNo:'')+' · '+_mfAcDisp(f.aircraft)+(d.onDate?' · '+d.onDate:'');}
var _MF_CHK=[['wo','Work Order completed'],['techlog','Tech Log completed, no Defects'],['hours','A/C Hours recorded on Tech Log'],['engperf','Engine Performance check sighted'],['rts','Return to Service sighted'],['dupinsp','Duplicate Inspection sighted'],['toolctrl','Tool Control Records sighted'],['testflight','Test Flight undertaken']];
var _MF_SECTIONS={routine:'Routine Maintenance',unscheduled:'Unscheduled Maintenance',defect:'Defect Rectification'};

// Per-aircraft last oil-change date (persisted in the maintenance blob). Editable on the form.
function _mfOilChangeDate(ac){var m=S.maintenance||{};return (m.oilChange&&m.oilChange[ac])||'';}
function _mfSetOilChangeDate(ac,date){S.maintenance=S.maintenance||{};S.maintenance.oilChange=S.maintenance.oilChange||{};if(date)S.maintenance.oilChange[ac]=date;else delete S.maintenance.oilChange[ac];if(typeof saveMaintenance==='function')saveMaintenance();}
// Oil consumed (qts) + days for an aircraft between `from` (exclusive) and `to` (inclusive), from the logs.
function _mfOilCalc(ac,from,to){
  var oil=(S.maintenance&&S.maintenance.oil)||[];var qts=0;
  oil.forEach(function(e){if(!e||!e.date)return;if(from&&e.date<=from)return;if(to&&e.date>to)return;qts+=(+e[ac]||0);});
  var days=null;if(from&&to){var d1=new Date(from+'T00:00:00'),d2=new Date(to+'T00:00:00');if(!isNaN(d1)&&!isNaN(d2))days=Math.round((d2-d1)/86400000);}
  return {qts:qts,days:days};
}

function _mfBlankWO(ac){
  var t=_mfNowDate();
  return {
    id:'wo_'+Date.now()+'_'+Math.floor(Math.random()*1e4),
    form_type:'work_order', aircraft:ac||'', status:'open', drive_uploaded:false,
    data:{
      instructionsTo:'', woNo:'', acType:_mfAcType(ac), acReg:ac||'', onDate:t, orDate:'',
      routine:{items:[]}, unscheduled:{items:[]}, defect:{items:[]},
      oil:{lastChange:_mfOilChangeDate(ac), updateChange:false, note:''},
      notify:'', notifyPrice:'Y', notifyDelays:'Y', notifyExtra:'Y',
      comments:'', sendRecordTo:'PANZ', sendInvoiceTo:'Southern Lakes Aviation',
      slaName:(S.user&&S.user.name)||'', slaSig:'', slaDate:t, engName:'', engSig:'', engDate:t,
      checklist:{}
    },
    created_at:new Date().toISOString(), updated_at:new Date().toISOString(), updated_by:(S.user&&S.user.name)||''
  };
}
// Normalise older/blank forms so the editor never crashes on a missing shape.
function _mfMigrate(f){
  if(!f||!f.data)return f;var d=f.data;
  Object.keys(_MF_SECTIONS).forEach(function(k){
    if(!d[k]||!Array.isArray(d[k].items)){
      var old=d[k]||{};var items=[];
      if(old.text)items.push({text:old.text,status:old.completed?'completed':(old.deferred?'deferred':''),initial:old.initial||''});
      d[k]={items:items};
    }
  });
  if(!d.oil||typeof d.oil!=='object'||d.oil.items)d.oil={lastChange:_mfOilChangeDate(f.aircraft),updateChange:false,note:(d.oil&&d.oil.text)||''};
  if(!d.oil.lastChange)d.oil.lastChange=_mfOilChangeDate(f.aircraft);
  d.checklist=d.checklist||{};
  _MF_CHK.forEach(function(it){var c=d.checklist[it[0]];if(typeof c==='boolean')d.checklist[it[0]]={done:c,na:false,by:''};else if(!c||typeof c!=='object')d.checklist[it[0]]={done:false,na:false,by:''};});
  return f;
}

// ── load / persist ──────────────────────────────────────────────────────────
window.loadMaintForms=async function(){
  try{var c=lsGet&&lsGet('ts_maint_forms_cache');if(c&&typeof c==='object')S._mfData=c;}catch(e){}
  if(typeof sbF!=='function'){if(typeof render==='function')render();return;}
  try{
    var rows=await sbF('ts_maint_forms','','updated_at');
    if(Array.isArray(rows)){
      var d={};rows.forEach(function(r){if(r.status==='deleted')return;d[r.id]={id:r.id,form_type:r.form_type,aircraft:r.aircraft,status:r.status||'open',drive_uploaded:!!r.drive_uploaded,data:(typeof r.data==='string'?JSON.parse(r.data||'{}'):(r.data||{})),created_at:r.created_at,updated_at:r.updated_at,updated_by:r.updated_by||''};});
      S._mfData=d;try{lsSet&&lsSet('ts_maint_forms_cache',d);}catch(e){}
    }
  }catch(e){}
  if(typeof render==='function')render();
};
function _mfRowPayload(f){return {id:f.id,form_type:f.form_type,aircraft:f.aircraft||null,title:_mfTitle(f),data:f.data,status:f.status||'open',drive_uploaded:!!f.drive_uploaded,updated_at:new Date().toISOString(),updated_by:(S.user&&S.user.name)||''};}
function _mfSave(f,immediate){
  if(!f)return;f.updated_at=new Date().toISOString();f.updated_by=(S.user&&S.user.name)||'';
  S._mfData=S._mfData||{};S._mfData[f.id]=f;
  try{lsSet&&lsSet('ts_maint_forms_cache',S._mfData);}catch(e){}
  if(typeof sbU!=='function')return;
  if(immediate){sbU('ts_maint_forms',[_mfRowPayload(f)]).catch(function(){});return;}
  clearTimeout(S._mfSaveTimer);S._mfSaveTimer=setTimeout(function(){sbU('ts_maint_forms',[_mfRowPayload(f)]).catch(function(){});},800);
}
function _mfCur(){return (S._mfData||{})[S._mfOpen]||null;}

// ── CRUD / field edits ──────────────────────────────────────────────────────
window.maintFormNew=function(type,ac){
  if(type!=='work_order')return;
  var f=_mfBlankWO(ac||S.maintEntryAc||'ZK-SLA');_mfMigrate(f);
  S._mfData=S._mfData||{};S._mfData[f.id]=f;S._mfOpen=f.id;S._mfView='editor';
  _mfSave(f,true);
  if(typeof auditLog==='function')auditLog('maint_form_new',{type:type,aircraft:f.aircraft,id:f.id});
  render();
};
window.maintFormOpen=function(id){var f=(S._mfData||{})[id];if(!f)return;_mfMigrate(f);S._mfOpen=id;S._mfView='editor';render();};
window.maintFormShowList=function(ac){S._mfListAc=ac||S.maintEntryAc;S._mfView='list';S._mfOpen=null;render();};
window.maintFormBack=function(){S._mfView=null;S._mfOpen=null;render();};
window.mfPickAc=function(ac){S.maintEntryAc=ac;S._mfView=null;S._mfOpen=null;render();};
// Plain field (no re-render → keeps input focus). Debounced save.
window.mfField=function(id,path,val){var f=(S._mfData||{})[id];if(!f)return;var o=f.data,p=String(path).split('.');for(var i=0;i<p.length-1;i++){o[p[i]]=o[p[i]]||{};o=o[p[i]];}o[p[p.length-1]]=val;_mfSave(f);};
window.mfSetYN=function(id,path,v){window.mfField(id,path,v);render();};

// ── line items (6/7/8) ──────────────────────────────────────────────────────
function _mfList(f,section){f.data[section]=f.data[section]||{items:[]};if(!Array.isArray(f.data[section].items))f.data[section].items=[];return f.data[section].items;}
window.mfItemAdd=function(id,section,text){text=String(text||'').trim();if(!text)return;var f=(S._mfData||{})[id];if(!f)return;_mfList(f,section).push({text:text,status:'',initial:''});_mfSave(f);render();setTimeout(function(){var el=document.getElementById('mf_new_'+section);if(el)el.focus();},30);};
window.mfItemAddKey=function(id,section,e,el){if(e&&e.key==='Enter'){e.preventDefault();window.mfItemAdd(id,section,el.value);el.value='';}};
window.mfItemText=function(id,section,idx,val){var f=(S._mfData||{})[id];if(!f)return;var it=_mfList(f,section)[idx];if(it){it.text=val;_mfSave(f);}};
window.mfItemInitial=function(id,section,idx,val){var f=(S._mfData||{})[id];if(!f)return;var it=_mfList(f,section)[idx];if(it){it.initial=val;_mfSave(f);}};
window.mfItemStatus=function(id,section,idx,status){var f=(S._mfData||{})[id];if(!f)return;var it=_mfList(f,section)[idx];if(it){it.status=(it.status===status)?'':status;_mfSave(f);render();}};
window.mfItemDel=function(id,section,idx){var f=(S._mfData||{})[id];if(!f)return;var arr=_mfList(f,section);if(idx>=0&&idx<arr.length){arr.splice(idx,1);_mfSave(f);render();}};

// ── oil (item 9) ────────────────────────────────────────────────────────────
window.mfOilSetLastChange=function(id,date){var f=(S._mfData||{})[id];if(!f)return;f.data.oil=f.data.oil||{};f.data.oil.lastChange=date;_mfSave(f);render();};
window.mfOilUpdateToggle=function(id){
  var f=(S._mfData||{})[id];if(!f)return;f.data.oil=f.data.oil||{};
  f.data.oil.updateChange=!f.data.oil.updateChange;
  // When ticked, this WO performed an oil change → roll the aircraft's last-change date forward to this
  // WO's On Date (so the NEXT work order calculates from here). Unticking reverts to the form's reference.
  if(f.data.oil.updateChange){_mfSetOilChangeDate(f.aircraft,f.data.onDate||_mfNowDate());}
  else{_mfSetOilChangeDate(f.aircraft,f.data.oil.lastChange||'');}
  _mfSave(f);render();
};

// ── pilot checklist (Done / N/A + who ticked) ───────────────────────────────
window.mfChkToggle=function(id,item,fieldName){
  var f=(S._mfData||{})[id];if(!f)return;f.data.checklist=f.data.checklist||{};
  var c=f.data.checklist[item]||(f.data.checklist[item]={done:false,na:false,by:''});
  c[fieldName]=!c[fieldName];
  if(c[fieldName]){if(fieldName==='done')c.na=false;else c.done=false;c.by=(S.user&&S.user.name)||'';c.at=new Date().toISOString();}
  else if(!c.done&&!c.na){c.by='';c.at='';}
  _mfSave(f);render();
};

window.maintFormDelete=function(id){
  var f=(S._mfData||{})[id];if(!f)return;
  if(typeof confirm==='function'&&!confirm('Delete this work order? This cannot be undone.'))return;
  if(typeof auditLog==='function')auditLog('maint_form_delete',{type:f.form_type,aircraft:f.aircraft,id:id,title:_mfTitle(f)});
  delete S._mfData[id];try{lsSet&&lsSet('ts_maint_forms_cache',S._mfData);}catch(e){}
  S._mfOpen=null;S._mfView='list';render();
  if(typeof sbU==='function')sbU('ts_maint_forms',[{id:id,form_type:f.form_type,aircraft:f.aircraft||null,data:f.data,status:'deleted',updated_at:new Date().toISOString(),updated_by:(S.user&&S.user.name)||''}]).catch(function(){});
};

// ── signature pads (SLA + Engineer) ─────────────────────────────────────────
function _mfWireSig(canvasId,field){
  var c=document.getElementById(canvasId);if(!c||c._mfWired)return;c._mfWired=true;var ctx=c.getContext('2d');
  var f=_mfCur();var cur=f&&f.data?f.data[field]:'';
  if(cur){var img=new Image();img.onload=function(){ctx.drawImage(img,0,0,c.width,c.height);};img.src=cur;}
  var drawing=false;
  var pos=function(e){var r=c.getBoundingClientRect(),s=e.touches?e.touches[0]:e,sx=c.width/r.width,sy=c.height/r.height;return{x:(s.clientX-r.left)*sx,y:(s.clientY-r.top)*sy};};
  c.onmousedown=c.ontouchstart=function(e){e.preventDefault();drawing=true;var p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);};
  c.onmousemove=c.ontouchmove=function(e){if(!drawing)return;e.preventDefault();var p=pos(e);ctx.lineWidth=2.2;ctx.lineCap='round';ctx.strokeStyle='#1e293b';ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y);};
  c.onmouseup=c.onmouseleave=c.ontouchend=function(){if(drawing){drawing=false;var ff=_mfCur();if(ff){var had=!!ff.data[field];ff.data[field]=c.toDataURL('image/png');_mfSave(ff);if(!had)render();}}};
}
function _mfSetupSigs(){ if(S._mfView!=='editor'||!S._mfOpen)return; _mfWireSig('mf_sla_sig','slaSig'); _mfWireSig('mf_eng_sig','engSig'); }
window.mfClearSig=function(id,field,canvasId){var f=(S._mfData||{})[id];if(!f)return;var c=document.getElementById(canvasId);if(c)c.getContext('2d').clearRect(0,0,c.width,c.height);f.data[field]='';_mfSave(f);render();};

// ── print + Drive (shared HTML) ─────────────────────────────────────────────
function _mfWorkOrderHtml(f){
  _mfMigrate(f);var d=f.data||{};
  function listRows(no,label,key){
    var items=(d[key]&&d[key].items)||[];
    if(!items.length)return '<tr><td class="n">'+no+'</td><td class="lbl">'+label+'</td><td class="txt"></td><td class="c"></td><td class="c"></td><td class="c"></td></tr>';
    return items.map(function(it,i){return '<tr><td class="n">'+(i===0?no:'')+'</td><td class="lbl">'+(i===0?label:'')+'</td><td class="txt">'+_mfEsc(it.text)+'</td>'+
      '<td class="c">'+(it.status==='completed'?'✓':'')+'</td><td class="c">'+_mfEsc(it.initial)+'</td><td class="c">'+(it.status==='deferred'?'✗':'')+'</td></tr>';}).join('');
  }
  var oc=_mfOilCalc(f.aircraft,d.oil&&d.oil.lastChange,d.onDate);
  function yn(v){return v==='Y'?'Y':(v==='N'?'N':'—');}
  var sig=function(s){return s?'<img src="'+s+'" style="max-height:46px">':'';};
  var cl=d.checklist||{};
  function ck(c){c=c||{};var mark=c.done?'✓':(c.na?'N/A':'');return '<span class="box">'+mark+'</span>';}
  function ckRow(item,t){var c=cl[item]||{};return '<div class="ck">'+ck(c)+' '+t+(c.by?' <span style="color:#888;font-size:9px">— '+_mfEsc(c.by)+'</span>':'')+'</div>';}
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Work Order '+_mfEsc(d.woNo)+' '+_mfEsc(f.aircraft)+'</title><style>'+
    '*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:12mm;font-size:12px}'+
    'h1{font-size:17px;margin-bottom:2px}.sub{color:#555;font-size:11px;margin-bottom:10px}'+
    'table{width:100%;border-collapse:collapse;margin-bottom:10px}th,td{border:1px solid #999;padding:4px 6px;font-size:11px;vertical-align:top}th{background:#eee;text-align:left}'+
    'td.c{text-align:center;width:58px}td.n{width:22px;text-align:center;color:#666}td.lbl{width:140px;font-weight:bold}'+
    '.grid{display:flex;flex-wrap:wrap;gap:6px 18px;margin-bottom:10px}.fld{font-size:11px}.fld b{display:block;color:#555;font-weight:600;font-size:10px}'+
    '.sign{display:flex;gap:30px;margin-top:8px}.sign>div{flex:1;border-top:1px solid #333;padding-top:3px;font-size:11px;color:#333}'+
    '.ck{font-size:11px;margin:2px 0;display:flex;align-items:center;gap:6px}.ck .box{display:inline-block;min-width:24px;height:14px;border:1px solid #333;text-align:center;line-height:13px;font-size:9px;padding:0 2px}'+
    '.cols{display:flex;gap:24px}.note{font-size:10px;color:#666;margin-top:10px}</style></head><body>'+
    '<h1>Work Order'+(d.woNo?' — No. '+_mfEsc(d.woNo):'')+'</h1>'+
    '<div class="sub">SLA 13 (Rev 3) · True South Flights · Ph 03 441 1588 · info@truesouthflights.co.nz</div>'+
    '<div class="grid">'+
      '<div class="fld"><b>Instructions To</b>'+_mfEsc(d.instructionsTo)+'</div>'+
      '<div class="fld"><b>Aircraft Type</b>'+_mfEsc(d.acType)+'</div>'+
      '<div class="fld"><b>Aircraft Registration</b>'+_mfEsc(d.acReg||f.aircraft)+'</div>'+
      '<div class="fld"><b>On Date</b>'+_mfEsc(d.onDate)+'</div>'+
      '<div class="fld"><b>Or Date</b>'+_mfEsc(d.orDate)+'</div>'+
    '</div>'+
    '<table><thead><tr><th colspan="3">Please carry out the following</th><th class="c">Completed</th><th class="c">Eng. Initial</th><th class="c">Deferred</th></tr></thead><tbody>'+
      listRows('6','Routine Maintenance','routine')+listRows('7','Unscheduled Maintenance','unscheduled')+listRows('8','Defect Rectification','defect')+
      '<tr><td class="n">9</td><td class="lbl">Oil used since last inspection</td><td class="txt">'+(oc.qts.toFixed(1))+' qts since last oil change'+(d.oil&&d.oil.lastChange?' ('+_mfEsc(d.oil.lastChange)+(oc.days!=null?', '+oc.days+' days':'')+')':'')+(d.oil&&d.oil.note?' — '+_mfEsc(d.oil.note):'')+'</td><td class="c"></td><td class="c"></td><td class="c"></td></tr>'+
    '</tbody></table>'+
    '<div class="grid"><div class="fld"><b>10. Notify SLA about</b>'+_mfEsc(d.notify)+'</div>'+
      '<div class="fld"><b>Price</b>'+yn(d.notifyPrice)+'</div><div class="fld"><b>Delays</b>'+yn(d.notifyDelays)+'</div><div class="fld"><b>Extra Work</b>'+yn(d.notifyExtra)+'</div></div>'+
    '<div class="grid"><div class="fld" style="flex:1 1 100%"><b>11. Engineers Comments</b>'+_mfEsc(d.comments)+'</div></div>'+
    '<div class="grid"><div class="fld"><b>12. Send Record for logbook updates to</b>'+_mfEsc(d.sendRecordTo)+'</div>'+
      '<div class="fld"><b>13. Send Invoice to</b>'+_mfEsc(d.sendInvoiceTo)+'</div></div>'+
    '<div class="sign"><div><b>14. SLA</b> '+_mfEsc(d.slaName)+'<br>'+sig(d.slaSig)+'<br>Date: '+_mfEsc(d.slaDate)+'</div>'+
      '<div><b>15. Engineer</b> '+_mfEsc(d.engName)+'<br>'+sig(d.engSig)+'<br>Date: '+_mfEsc(d.engDate)+'</div></div>'+
    '<div style="margin-top:12px;border-top:1px solid #ccc;padding-top:8px"><b style="font-size:11px">SLA Pilot Checklist</b>'+
      '<div class="cols"><div>'+ckRow('wo','Work Order completed')+ckRow('techlog','Tech Log completed, no Defects')+ckRow('hours','A/C Hours recorded on Tech Log')+ckRow('engperf','Engine Performance check sighted')+'</div>'+
      '<div>'+ckRow('rts','Return to Service sighted')+ckRow('dupinsp','Duplicate Inspection sighted')+ckRow('toolctrl','Tool Control Records sighted')+ckRow('testflight','Test Flight undertaken')+'</div></div></div>'+
    '<div class="note">Retention Period — Two years post completion. Effective 06/08/24.</div>'+
    '<script>window.onload=function(){window.print();}<\/script></body></html>';
}
window.maintFormPrint=function(id){var f=(S._mfData||{})[id];if(!f)return;var w=window.open('','_blank','width=860,height=950');if(!w){if(typeof toast==='function')toast('Allow pop-ups to print.','warn');return;}w.document.write(_mfWorkOrderHtml(f));w.document.close();};

window.maintFormUpload=async function(id){
  var f=(S._mfData||{})[id];if(!f)return;
  if(!S.gdriveClientId){if(typeof toast==='function')toast('Set the Google Drive Client ID in Settings ▸ Drive first.','warn');return;}
  if(typeof toast==='function')toast('Uploading work order to Drive…','info');
  var token;
  try{
    token=await new Promise(function(res,rej){function init(){google.accounts.oauth2.initTokenClient({client_id:S.gdriveClientId,scope:'https://www.googleapis.com/auth/drive',callback:function(r){if(r.error)rej(new Error(r.error));else res(r.access_token);}}).requestAccessToken();}
      if(window.google&&window.google.accounts&&window.google.accounts.oauth2){init();}else{var s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=init;s.onerror=function(){rej(new Error('Failed to load Google sign-in'));};document.head.appendChild(s);}});
  }catch(e){if(typeof toast==='function')toast('Google sign-in failed: '+(e&&e.message||e),'err');return;}
  try{
    var rootId=(S.gdriveFolderId||'').trim()||await window.ensureDriveFolder(S.gdriveFolder||'Loadsheets','root',token);
    var woRoot=await window.ensureDriveFolder('Work Orders',rootId,token);
    var acFolder=await window.ensureDriveFolder(f.aircraft||'AC',woRoot,token);
    var d=f.data||{};
    var fname='WorkOrder_'+(f.aircraft||'AC')+'_'+((d.woNo||'').replace(/[^\w-]/g,'')||f.id.slice(-5))+'_'+(d.onDate||'').replace(/-/g,'')+'.html';
    var enc=new TextEncoder(),htmlBytes=enc.encode(_mfWorkOrderHtml(f)),CRLF='\r\n',b='-----mf_'+Date.now();
    var meta=enc.encode('--'+b+CRLF+'Content-Type: application/json; charset=UTF-8'+CRLF+CRLF+JSON.stringify({name:fname,parents:[acFolder]})+CRLF+'--'+b+CRLF+'Content-Type: text/html; charset=UTF-8'+CRLF+CRLF);
    var endB=enc.encode(CRLF+'--'+b+'--');
    var body=new Uint8Array(meta.length+htmlBytes.length+endB.length);body.set(meta,0);body.set(htmlBytes,meta.length);body.set(endB,meta.length+htmlBytes.length);
    var r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'multipart/related; boundary='+b},body:body});
    if(r.ok){f.drive_uploaded=true;_mfSave(f,true);if(typeof auditLog==='function')auditLog('maint_form_upload',{id:id,file:fname,aircraft:f.aircraft});if(typeof toast==='function')toast('Work order saved to Drive: '+fname,'ok');render();}
    else{var t=await r.text();if(typeof toast==='function')toast('Drive upload failed ('+r.status+'): '+t.slice(0,100),'err');}
  }catch(e){if(typeof toast==='function')toast('Drive upload failed — '+e,'err');}
};

// ── render ──────────────────────────────────────────────────────────────────
function _mfAcBar(selAc){
  var acs=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(a){return S.aircraft&&S.aircraft[a];});
  return '<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;scrollbar-width:none">'+
    acs.map(function(a){var on=a===selAc,c=(typeof AC_COL!=='undefined'&&AC_COL[a])||'#888';
      return '<button onclick="window.mfPickAc(\''+a+'\')" style="padding:6px 14px;border-radius:8px;border:2px solid '+c+';background:'+(on?c+'33':'transparent')+';color:'+(on?c:'var(--text3)')+';font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;flex-shrink:0">'+_mfAcDisp(a)+'</button>';}).join('')+'</div>';
}
function renderMaintDocSquares(ac){
  if(!S._mfLoaded){S._mfLoaded=true;if(window.loadMaintForms)window.loadMaintForms();}
  var wos=Object.keys(S._mfData||{}).map(function(k){return S._mfData[k];}).filter(function(f){return f.form_type==='work_order'&&f.aircraft===ac&&f.status!=='deleted';});
  function sq(onclick,icon,label,sub,col){
    return '<button onclick="'+onclick+'" style="flex:1 1 150px;min-width:140px;background:var(--card);border:1px solid var(--border2);border-top:3px solid '+col+';border-radius:12px;padding:16px 14px;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:4px">'+
      '<div style="font-size:24px">'+icon+'</div><div style="font-size:14px;font-weight:800;color:var(--text1)">'+label+'</div>'+
      '<div style="font-size:11px;color:var(--text3)">'+sub+'</div></button>';
  }
  return '<div class="card" style="margin-bottom:12px"><div class="st" style="margin-bottom:8px">Documents · '+_mfEsc(_mfAcDisp(ac))+'</div>'+
    _mfAcBar(ac)+
    '<div style="display:flex;gap:10px;flex-wrap:wrap">'+
      sq("window.maintFormNew('work_order','"+ac+"')",'📝','New Work Order','Create &amp; fill a new SLA 13 work order','#2563eb')+
      sq("window.maintFormShowList('"+ac+"')",'📁','Work Orders','Saved · print · upload · delete ('+wos.length+')','#f59e0b')+
    '</div></div>';
}
function renderMaintFormsList(ac){
  var wos=Object.keys(S._mfData||{}).map(function(k){return S._mfData[k];}).filter(function(f){return f.form_type==='work_order'&&f.aircraft===ac&&f.status!=='deleted';}).sort(function(a,b){return String(b.updated_at||'').localeCompare(String(a.updated_at||''));});
  var h='<div style="max-width:820px;margin:0 auto">';
  h+=_mfAcBar(ac);
  h+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;flex-wrap:wrap">'+
    '<button onclick="window.maintFormBack()" class="btn btn-ghost" style="font-size:12px">‹ Back</button>'+
    '<div class="st" style="margin:0">Work Orders · '+_mfEsc(_mfAcDisp(ac))+'</div>'+
    '<button onclick="window.maintFormNew(\'work_order\',\''+ac+'\')" style="font-size:12px;padding:7px 12px;border-radius:8px;border:none;background:var(--acc);color:#fff;font-weight:700;cursor:pointer">＋ New</button></div>';
  if(!wos.length)h+='<div class="card" style="text-align:center;color:var(--text3);padding:30px">No work orders saved for '+_mfEsc(_mfAcDisp(ac))+' yet.</div>';
  wos.forEach(function(f){var d=f.data||{};
    h+='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px">'+
      '<div onclick="window.maintFormOpen(\''+f.id+'\')" style="flex:1;min-width:160px;cursor:pointer">'+
        '<div style="font-size:14px;font-weight:800;color:var(--text1)">WO'+(d.woNo?' '+_mfEsc(d.woNo):' (no number)')+(f.drive_uploaded?' <span style="font-size:10px;color:#22c55e">☁ uploaded</span>':'')+'</div>'+
        '<div style="font-size:11px;color:var(--text3)">'+(d.onDate?_mfEsc(d.onDate)+' · ':'')+_mfEsc(d.instructionsTo||'—')+'</div></div>'+
      '<div style="display:flex;gap:6px;flex-shrink:0">'+
        '<button onclick="window.maintFormOpen(\''+f.id+'\')" class="btn btn-ghost" style="font-size:12px">Open</button>'+
        '<button onclick="window.maintFormPrint(\''+f.id+'\')" class="btn btn-ghost" style="font-size:12px">🖨</button>'+
        '<button onclick="window.maintFormUpload(\''+f.id+'\')" class="btn btn-ghost" style="font-size:12px;color:#60a5fa;border-color:rgba(96,165,250,.5)">☁ Drive</button>'+
        '<button onclick="window.maintFormDelete(\''+f.id+'\')" class="btn btn-ghost" style="font-size:12px;color:#ef4444;border-color:rgba(239,68,68,.4)">🗑</button>'+
      '</div></div>';
  });
  h+='</div>';return h;
}
function renderMaintFormEditor(id){
  var f=(S._mfData||{})[id];if(!f)return renderMaintFormsList(S._mfListAc||S.maintEntryAc||'ZK-SLA');
  _mfMigrate(f);var d=f.data||{};
  var _in='width:100%;padding:8px 10px;background:var(--card2);border:1px solid var(--border2);border-radius:7px;color:var(--text1);font-size:13px;box-sizing:border-box;font-family:inherit';
  var _ta=_in+';resize:vertical;min-height:46px';
  function fld(label,path,val,ph){return '<div><label style="font-size:11px;color:var(--text3);font-weight:600">'+label+'</label><input value="'+_mfEsc(val)+'" placeholder="'+(ph||'')+'" oninput="window.mfField(\''+id+'\',\''+path+'\',this.value)" style="'+_in+'"></div>';}
  function dt(label,path,val){return '<div><label style="font-size:11px;color:var(--text3);font-weight:600">'+label+'</label><input type="date" value="'+_mfEsc(val)+'" onchange="window.mfField(\''+id+'\',\''+path+'\',this.value)" style="'+_in+'"></div>';}
  function ta(label,path,val){return '<div style="flex:1 1 100%"><label style="font-size:11px;color:var(--text3);font-weight:600">'+label+'</label><textarea oninput="window.mfField(\''+id+'\',\''+path+'\',this.value)" style="'+_ta+'">'+_mfEsc(val)+'</textarea></div>';}
  function ynSel(label,path,val){return '<div><label style="font-size:11px;color:var(--text3);font-weight:600">'+label+'</label><select onchange="window.mfSetYN(\''+id+'\',\''+path+'\',this.value)" style="'+_in+'"><option value=""'+(!val?' selected':'')+'>—</option><option value="Y"'+(val==='Y'?' selected':'')+'>Y</option><option value="N"'+(val==='N'?' selected':'')+'>N</option></select></div>';}
  // A line-item section (6/7/8): existing items + a new-item input.
  function section(no,label,key){
    var items=(d[key]&&d[key].items)||[];
    var rowsH=items.map(function(it,i){
      var done=it.status==='completed',def=it.status==='deferred';
      return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">'+
        '<input value="'+_mfEsc(it.text)+'" oninput="window.mfItemText(\''+id+'\',\''+key+'\','+i+',this.value)" style="flex:1;min-width:0;padding:6px 8px;background:var(--card2);border:1px solid var(--border2);border-radius:6px;color:var(--text1);font-size:13px">'+
        '<button onclick="window.mfItemStatus(\''+id+'\',\''+key+'\','+i+',\'completed\')" title="Completed" style="width:30px;height:30px;border-radius:6px;border:1px solid '+(done?'#22c55e':'var(--border2)')+';background:'+(done?'rgba(34,197,94,.2)':'transparent')+';color:'+(done?'#22c55e':'var(--text3)')+';font-weight:800;cursor:pointer">✓</button>'+
        '<button onclick="window.mfItemStatus(\''+id+'\',\''+key+'\','+i+',\'deferred\')" title="Deferred" style="width:30px;height:30px;border-radius:6px;border:1px solid '+(def?'#ef4444':'var(--border2)')+';background:'+(def?'rgba(239,68,68,.2)':'transparent')+';color:'+(def?'#ef4444':'var(--text3)')+';font-weight:800;cursor:pointer">✗</button>'+
        '<input value="'+_mfEsc(it.initial)+'" placeholder="Init" oninput="window.mfItemInitial(\''+id+'\',\''+key+'\','+i+',this.value)" title="Engineer initial" style="width:48px;padding:6px 4px;text-align:center;background:var(--card2);border:1px solid var(--border2);border-radius:6px;color:var(--text1);font-size:12px">'+
        '<button onclick="window.mfItemDel(\''+id+'\',\''+key+'\','+i+')" title="Remove" style="width:26px;height:30px;border:none;background:transparent;color:var(--text3);cursor:pointer;font-size:15px">×</button>'+
      '</div>';
    }).join('');
    return '<div style="border:1px solid var(--border2);border-radius:8px;padding:10px;margin-bottom:8px">'+
      '<div style="font-size:12px;font-weight:700;color:var(--text1);margin-bottom:6px">'+no+'. '+label+'</div>'+
      rowsH+
      '<div style="display:flex;align-items:center;gap:6px"><input id="mf_new_'+key+'" placeholder="Type a task &amp; press Enter (e.g. Fix…, Inspect…)" onkeydown="window.mfItemAddKey(\''+id+'\',\''+key+'\',event,this)" style="flex:1;padding:7px 9px;background:var(--card2);border:1px dashed var(--border2);border-radius:6px;color:var(--text1);font-size:13px">'+
      '<button onclick="var el=document.getElementById(\'mf_new_'+key+'\');window.mfItemAdd(\''+id+'\',\''+key+'\',el.value);el.value=\'\'" style="padding:7px 12px;border-radius:6px;border:none;background:var(--acc);color:#fff;font-size:12px;font-weight:700;cursor:pointer">＋ Add</button></div></div>';
  }
  // Oil section (9): editable last-change date + calculated consumption + update toggle.
  var oc=_mfOilCalc(f.aircraft,d.oil&&d.oil.lastChange,d.onDate);
  function oilSection(){
    return '<div style="border:1px solid var(--border2);border-radius:8px;padding:10px;margin-bottom:8px">'+
      '<div style="font-size:12px;font-weight:700;color:var(--text1);margin-bottom:6px">9. Oil used since last inspection</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;align-items:end">'+
        '<div><label style="font-size:11px;color:var(--text3);font-weight:600">Last oil change (SLA)</label><input type="date" value="'+_mfEsc(d.oil&&d.oil.lastChange)+'" onchange="window.mfOilSetLastChange(\''+id+'\',this.value)" style="'+_in+'"></div>'+
        '<div><label style="font-size:11px;color:var(--text3);font-weight:600">Calculated to On Date ('+_mfEsc(d.onDate)+')</label><div style="padding:8px 10px;background:var(--card2);border:1px solid var(--border2);border-radius:7px;font-size:13px;font-weight:700;color:var(--text1)">'+oc.qts.toFixed(1)+' qts'+(oc.days!=null?' · '+oc.days+' days':'')+'</div></div>'+
      '</div>'+
      (d.oil&&d.oil.lastChange?'':'<div style="font-size:11px;color:#f59e0b;margin-top:6px">Set a last-oil-change date to calculate consumption.</div>')+
      '<label style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;color:var(--text2);cursor:pointer"><input type="checkbox" '+((d.oil&&d.oil.updateChange)?'checked':'')+' onchange="window.mfOilUpdateToggle(\''+id+'\')" style="width:15px;height:15px;accent-color:var(--accent)"> This work order changed the oil — set '+_mfEsc(_mfAcDisp(f.aircraft))+'\'s last oil change to '+_mfEsc(d.onDate)+'</label>'+
      '<input value="'+_mfEsc(d.oil&&d.oil.note)+'" placeholder="Oil note (optional)" oninput="window.mfField(\''+id+'\',\'oil.note\',this.value)" style="'+_in+';margin-top:8px">'+
    '</div>';
  }
  // Checklist (Done / N/A + who).
  function chkRow(item,t){var c=(d.checklist&&d.checklist[item])||{};
    return '<div style="display:flex;align-items:center;gap:10px;padding:4px 0;border-bottom:1px solid var(--border2)">'+
      '<div style="flex:1;font-size:12px;color:var(--text2)">'+t+(c.by?' <span style="font-size:10px;color:var(--text3)">— '+_mfEsc(c.by)+'</span>':'')+'</div>'+
      '<label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--text2);cursor:pointer"><input type="checkbox" '+(c.done?'checked':'')+' onchange="window.mfChkToggle(\''+id+'\',\''+item+'\',\'done\')" style="width:15px;height:15px;accent-color:#22c55e"> Done</label>'+
      '<label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--text2);cursor:pointer"><input type="checkbox" '+(c.na?'checked':'')+' onchange="window.mfChkToggle(\''+id+'\',\''+item+'\',\'na\')" style="width:15px;height:15px;accent-color:#94a3b8"> N/A</label>'+
    '</div>';
  }
  function sigBlock(title,nameP,nameV,sigField,sigCanvas,dateP,dateV){
    return '<div style="flex:1 1 280px"><div style="font-size:12px;font-weight:700;color:var(--text1);margin-bottom:6px">'+title+'</div>'+
      fld('Name',nameP,nameV)+
      '<div style="margin:6px 0"><label style="font-size:11px;color:var(--text3);font-weight:600;display:flex;justify-content:space-between">Signature <span onclick="window.mfClearSig(\''+id+'\',\''+sigField+'\',\''+sigCanvas+'\')" style="color:#60a5fa;cursor:pointer">clear</span></label>'+
      '<div style="border:1px solid var(--border2);border-radius:7px;background:#fff;touch-action:none"><canvas id="'+sigCanvas+'" width="540" height="90" style="width:100%;height:90px;display:block;cursor:crosshair"></canvas></div></div>'+
      dt('Date',dateP,dateV)+'</div>';
  }
  var h='<div style="max-width:820px;margin:0 auto">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;flex-wrap:wrap">'+
    '<button onclick="window.maintFormShowList(\''+f.aircraft+'\')" class="btn btn-ghost" style="font-size:12px">‹ Saved</button>'+
    '<div class="st" style="margin:0">Work Order · '+_mfEsc(_mfAcDisp(f.aircraft))+'</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
      '<button onclick="window.maintFormPrint(\''+id+'\')" class="btn btn-ghost" style="font-size:12px">🖨 Print</button>'+
      '<button onclick="window.maintFormUpload(\''+id+'\')" class="btn btn-ghost" style="font-size:12px;color:#60a5fa;border-color:rgba(96,165,250,.5)">☁ Drive</button>'+
      '<button onclick="window.maintFormDelete(\''+id+'\')" class="btn btn-ghost" style="font-size:12px;color:#ef4444;border-color:rgba(239,68,68,.4)">🗑 Delete</button>'+
    '</div></div>';
  h+='<div style="font-size:11px;color:var(--text3);margin-bottom:10px">SLA 13 (Rev 3) · auto-saves &amp; syncs across devices. Last edit by '+_mfEsc(f.updated_by||'—')+'.</div>';
  h+='<div class="card" style="margin-bottom:10px"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px">'+
    fld('2. Work Order No','woNo',d.woNo)+fld('1. Instructions To','instructionsTo',d.instructionsTo)+
    fld('3. Aircraft Type','acType',d.acType)+fld('4. Aircraft Registration','acReg',d.acReg||f.aircraft)+
    dt('5a. On Date','onDate',d.onDate)+dt('5b. Or Date','orDate',d.orDate)+'</div></div>';
  h+='<div class="card" style="margin-bottom:10px"><div class="st" style="font-size:13px;margin-bottom:8px">Please carry out the following</div>'+
    section('6','Routine Maintenance','routine')+section('7','Unscheduled Maintenance','unscheduled')+section('8','Defect Rectification','defect')+oilSection()+'</div>';
  h+='<div class="card" style="margin-bottom:10px"><div style="display:flex;flex-direction:column;gap:10px">'+
    ta('10. Notify SLA about','notify',d.notify)+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px">'+ynSel('Price','notifyPrice',d.notifyPrice)+ynSel('Delays','notifyDelays',d.notifyDelays)+ynSel('Extra Work','notifyExtra',d.notifyExtra)+'</div>'+
    ta('11. Engineers Comments','comments',d.comments)+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">'+fld('12. Send Record (logbook) to','sendRecordTo',d.sendRecordTo)+fld('13. Send Invoice to','sendInvoiceTo',d.sendInvoiceTo)+'</div></div></div>';
  h+='<div class="card" style="margin-bottom:10px"><div style="display:flex;gap:18px;flex-wrap:wrap">'+
    sigBlock('14. SLA','slaName',d.slaName,'slaSig','mf_sla_sig','slaDate',d.slaDate)+
    sigBlock('15. Engineer','engName',d.engName,'engSig','mf_eng_sig','engDate',d.engDate)+'</div></div>';
  h+='<div class="card" style="margin-bottom:10px"><div class="st" style="font-size:13px;margin-bottom:4px">SLA Pilot Checklist</div>'+
    '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">Tick Done or N/A — your name is recorded against each.</div>'+
    _MF_CHK.map(function(it){return chkRow(it[0],it[1]);}).join('')+'</div>';
  h+='</div>';
  return h;
}
