// === MODULE: visitors === v1.0 ===
// Visitor sign-in system (Visitors section). Touch-friendly kiosk sign-in with a H&S acknowledgement,
// a live on-site dashboard, sign-out (by name search), and a permanent filterable history with CSV export.
// Persists to ts_visitors. (Public QR / unauthenticated kiosk route is a planned follow-up — for now the
// iPad runs it from a signed-in reception account.)
// ─────────────────────────────────────────────────────────────────────────────────────────────────
function _viEsc(s){return (typeof esc==='function')?esc(s):String(s==null?'':s);}
function _viNow(){return new Date().toISOString();}
function _viDateStr(iso){if(!iso)return '';try{return new Date(iso).toLocaleDateString('en-NZ');}catch(e){return '';}}
function _viTimeStr(iso){if(!iso)return '';try{return new Date(iso).toLocaleTimeString('en-NZ',{hour:'2-digit',minute:'2-digit'});}catch(e){return '';}}
function _viDur(a,b){if(!a)return '';var s=(new Date(b||Date.now())-new Date(a))/1000;if(s<0)s=0;var h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return (h?h+'h ':'')+m+'m';}
function _viCanManage(){return (typeof hasRolePerm==='function'&&hasRolePerm('visitors_manage'))||!!(S.user&&(S.user.role==='admin'||S.user.role==='cx_manager'||S.user.superAdmin));}

window.loadVisitors=async function(){
  try{var c=lsGet&&lsGet('ts_visitors_cache');if(c&&typeof c==='object')S._visData=c;}catch(e){}
  if(typeof sbF!=='function')return;
  var rows=await sbF('ts_visitors','','sign_in');
  if(rows){var d={};rows.forEach(function(r){if(r.status!=='deleted')d[r.id]=_viRow(r);});S._visData=d;try{lsSet&&lsSet('ts_visitors_cache',d);}catch(e){}if(typeof safeRender==='function')safeRender();}
};
function _viRow(r){return {id:r.id,name:r.name||'',company:r.company||'',mobile:r.mobile||'',visiting:r.visiting||'',reason:r.reason||'',vehicle_reg:r.vehicle_reg||'',sign_in:r.sign_in,sign_out:r.sign_out||null,status:r.status||'onsite'};}
function _viPayload(v){return {id:v.id,name:v.name,company:v.company||'',mobile:v.mobile||'',visiting:v.visiting||'',reason:v.reason||'',vehicle_reg:v.vehicle_reg||'',sign_in:v.sign_in,sign_out:v.sign_out||null,status:v.status||'onsite'};}
function _viList(){return Object.keys(S._visData||{}).map(function(k){return S._visData[k];}).sort(function(a,b){return String(b.sign_in||'').localeCompare(String(a.sign_in||''));});}
function _viSave(v){S._visData=S._visData||{};S._visData[v.id]=v;try{lsSet&&lsSet('ts_visitors_cache',S._visData);}catch(e){}if(typeof sbU==='function')sbU('ts_visitors',[_viPayload(v)]).catch(function(){});}

// ── Sign-in draft ────────────────────────────────────────────────────────────────
function _viDraft(){if(!S._visDraft)S._visDraft={name:'',company:'',mobile:'',visiting:'',reason:'',vehicle_reg:'',ack:false};return S._visDraft;}
window.viField=function(k,v){_viDraft()[k]=v;};
window.viAck=function(){_viDraft().ack=!_viDraft().ack;render();};
window.viSignIn=function(){
  var d=_viDraft();
  if(!d.name||!d.name.trim()){if(typeof toast==='function')toast('Please enter the visitor\'s full name.','warn');return;}
  if(!d.ack){if(typeof toast==='function')toast('Please tick the Health & Safety acknowledgement.','warn');return;}
  var v={id:'vis_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),name:d.name.trim(),company:d.company||'',mobile:d.mobile||'',visiting:d.visiting||'',reason:d.reason||'',vehicle_reg:d.vehicle_reg||'',sign_in:_viNow(),sign_out:null,status:'onsite'};
  _viSave(v);S._visDraft=null;S._visDone=v.name;S._visTab='signin';render();
  setTimeout(function(){if(S._visDone){S._visDone=null;if(typeof render==='function')render();}},4500);
};
window.viSignOut=function(id){var v=(S._visData||{})[id];if(!v)return;v.sign_out=_viNow();v.status='out';_viSave(v);if(typeof toast==='function')toast(v.name+' signed out ✓','ok');render();};
window.viDelete=function(id){var v=(S._visData||{})[id];if(!v||!_viCanManage())return;if(!confirm('Delete visitor record for '+v.name+'?'))return;v.status='deleted';if(typeof sbU==='function')sbU('ts_visitors',[_viPayload(v)]).catch(function(){});delete S._visData[id];try{lsSet&&lsSet('ts_visitors_cache',S._visData);}catch(e){}render();};
window.viExportCsv=function(){
  var rows=_viFiltered();var head=['Name','Company','Mobile','Visiting','Reason','Vehicle','Date','Time In','Time Out','Duration','Status'];
  var csv=[head.join(',')].concat(rows.map(function(v){return [v.name,v.company,v.mobile,v.visiting,v.reason,v.vehicle_reg,_viDateStr(v.sign_in),_viTimeStr(v.sign_in),_viTimeStr(v.sign_out),_viDur(v.sign_in,v.sign_out),v.status].map(function(x){x=String(x==null?'':x);return /[",\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x;}).join(',');})).join('\n');
  try{var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='visitors_'+_viDateStr(_viNow()).replace(/\//g,'-')+'.csv';a.click();}catch(e){}
};

// ── Render ────────────────────────────────────────────────────────────────────────
function renderVisitors(){
  if(!S._visLoaded){S._visLoaded=true;if(window.loadVisitors)window.loadVisitors();}
  var tab=S._visTab||'signin';
  var bar='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'+
    '<button class="sub-tab '+(tab==='signin'?'on':'')+'" onclick="S._visTab=\'signin\';render()">Sign in</button>'+
    '<button class="sub-tab '+(tab==='onsite'?'on':'')+'" onclick="S._visTab=\'onsite\';render()">On site</button>'+
    '<button class="sub-tab '+(tab==='history'?'on':'')+'" onclick="S._visTab=\'history\';render()">History</button></div>';
  if(tab==='onsite')return bar+_viRenderOnsite();
  if(tab==='history')return bar+_viRenderHistory();
  return bar+_viRenderSignin();
}
// Reception QR → the public sign-in page (visit.html), so visitors can sign in on their own phone.
function _viSignInUrl(){return (typeof location!=='undefined'?location.origin:'')+'/visit.html';}
function _viQrCard(){
  if(!_viCanManage())return '';
  var url=_viSignInUrl();
  var qr='https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data='+encodeURIComponent(url);
  return '<div class="card" style="margin-bottom:14px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">'+
    '<img src="'+qr+'" alt="Sign-in QR" style="width:118px;height:118px;border-radius:10px;background:#fff;padding:6px;flex-shrink:0">'+
    '<div style="flex:1;min-width:200px">'+
      '<div class="st" style="font-size:14px;margin:0 0 4px">Reception sign‑in QR</div>'+
      '<div style="font-size:12px;color:var(--text3);line-height:1.5;margin-bottom:8px">Print this for the front desk — visitors scan it to sign in on their own phone (no app login). New sign‑ins appear under <b>On site</b> automatically.</div>'+
      '<div style="font-size:11px;color:var(--text3);word-break:break-all;margin-bottom:8px">'+_viEsc(url)+'</div>'+
      '<button onclick="window.viPrintQr()" style="padding:7px 14px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:12px;font-weight:700;cursor:pointer">🖨 Print poster</button>'+
    '</div></div>';
}
window.viPrintQr=function(){
  var url=_viSignInUrl();
  var qr='https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=12&data='+encodeURIComponent(url);
  var w=window.open('','_blank','width=720,height=900');if(!w){if(typeof toast==='function')toast('Allow pop-ups to print.','warn');return;}
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Visitor Sign-In</title><style>*{margin:0;box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;text-align:center;padding:40px;color:#111}h1{font-size:42px;margin:10px 0 4px}p{font-size:21px;color:#444;margin:0 0 28px}img{width:380px;height:380px}.u{font-size:14px;color:#666;margin-top:22px;word-break:break-all}.b{font-size:13px;letter-spacing:4px;color:#777;text-transform:uppercase;font-weight:800}</style></head><body><div class="b">True South Flights</div><h1>Visitor Sign‑In</h1><p>Scan to sign in on your phone</p><img src="'+qr+'" alt="QR"><div class="u">'+url+'</div><scr'+'ipt>window.onload=function(){setTimeout(function(){window.print();},700);}</scr'+'ipt></body></html>');
  w.document.close();
};
function _viRenderSignin(){
  if(S._visDone){
    return '<div class="card" style="text-align:center;padding:48px 20px"><div style="font-size:48px">✅</div><div style="font-size:22px;font-weight:800;color:var(--text);margin-top:10px">Thank you, '+_viEsc(S._visDone)+'</div><div style="font-size:15px;color:var(--text3);margin-top:6px">You have successfully signed in.</div><div style="font-size:13px;color:var(--text3);margin-top:14px">Please follow all staff instructions while on site.</div><button onclick="S._visDone=null;render()" style="margin-top:22px;padding:12px 26px;border-radius:10px;border:none;background:var(--accent,#7c3aed);color:#fff;font-size:15px;font-weight:700;cursor:pointer">Done</button></div>';
  }
  var d=_viDraft();
  var staff=[];try{(S.users||[]).forEach(function(u){if(u&&!u.inactive&&u.name)staff.push(u.name);});(S.crew||[]).forEach(function(c){var n=c&&(c.n||c.name);if(n&&staff.indexOf(n)<0)staff.push(n);});}catch(e){}staff.sort();
  var _i='width:100%;box-sizing:border-box;padding:13px 14px;background:var(--card2);border:1px solid var(--border2);border-radius:10px;color:var(--text);font-size:16px';
  var _lab='font-size:12px;font-weight:700;color:var(--text3);display:block;margin-bottom:4px';
  var h='<div style="max-width:560px;margin:0 auto">'+_viQrCard()+'<div class="card"><div class="st" style="text-align:center;font-size:20px">Visitor sign-in</div><p style="text-align:center;font-size:13px;color:var(--text3);margin:2px 0 18px">Welcome — please sign in below.</p>'+
    '<div style="display:grid;gap:13px">'+
      '<div><label style="'+_lab+'">Full name *</label><input value="'+_viEsc(d.name)+'" oninput="window.viField(\'name\',this.value)" style="'+_i+'"></div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:13px"><div><label style="'+_lab+'">Company</label><input value="'+_viEsc(d.company)+'" oninput="window.viField(\'company\',this.value)" style="'+_i+'"></div><div><label style="'+_lab+'">Mobile</label><input value="'+_viEsc(d.mobile)+'" inputmode="tel" oninput="window.viField(\'mobile\',this.value)" style="'+_i+'"></div></div>'+
      '<div><label style="'+_lab+'">Person visiting</label><input value="'+_viEsc(d.visiting)+'" list="vi_staff" placeholder="Search staff, or type a name" oninput="window.viField(\'visiting\',this.value)" style="'+_i+'"><datalist id="vi_staff">'+staff.map(function(s){return '<option value="'+_viEsc(s)+'">';}).join('')+'<option value="Other"></datalist></div>'+
      '<div><label style="'+_lab+'">Reason for visit</label><input value="'+_viEsc(d.reason)+'" oninput="window.viField(\'reason\',this.value)" style="'+_i+'"></div>'+
      '<div><label style="'+_lab+'">Vehicle registration</label><input value="'+_viEsc(d.vehicle_reg)+'" oninput="window.viField(\'vehicle_reg\',this.value)" style="'+_i+'"></div>'+
    '</div>'+
    // H&S acknowledgement
    '<div style="margin-top:16px;border:1px solid var(--border2);border-radius:10px;padding:14px;background:var(--card2)">'+
      '<div style="font-size:14px;font-weight:800;color:var(--text);margin-bottom:6px">Visitor Health &amp; Safety acknowledgement</div>'+
      '<div style="font-size:13px;color:var(--text2);line-height:1.6">Welcome to our premises. Your safety is important to us. While on site you agree to:<br>• Follow all instructions given by staff.<br>• Remain in authorised visitor areas unless accompanied by a staff member.<br>• Report any hazards or incidents immediately.<br>• Follow all emergency evacuation procedures if instructed.<br>• Wear any required PPE where directed.<br>• Do not interfere with aircraft, equipment or vehicles unless authorised.</div>'+
      '<label style="display:flex;align-items:center;gap:10px;margin-top:12px;cursor:pointer"><input type="checkbox" '+(d.ack?'checked':'')+' onchange="window.viAck()" style="width:22px;height:22px;accent-color:#16a34a;flex-shrink:0"><span style="font-size:14px;font-weight:700;color:var(--text)">I have read and agree to the Health &amp; Safety requirements.</span></label>'+
    '</div>'+
    '<button onclick="window.viSignIn()" style="width:100%;margin-top:16px;padding:16px;background:var(--accent,#7c3aed);border:none;border-radius:12px;color:#fff;font-size:18px;font-weight:800;cursor:pointer">Sign in</button>'+
  '</div></div>';
  return h;
}
function _viRenderOnsite(){
  var rows=_viList().filter(function(v){return v.status==='onsite';});
  var h='<div class="card"><div style="display:flex;align-items:center;justify-content:space-between"><div class="st" style="margin:0">On site now</div><span style="font-size:13px;color:var(--text3)">'+rows.length+' visitor'+(rows.length===1?'':'s')+'</span></div>';
  if(!rows.length)return h+'<p style="color:var(--text3);margin-top:12px">No visitors currently on site.</p></div>';
  h+='<div style="overflow-x:auto;margin-top:10px"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:.04em"><th style="padding:6px 8px">Name</th><th style="padding:6px 8px">Company</th><th style="padding:6px 8px">Visiting</th><th style="padding:6px 8px">Time in</th><th style="padding:6px 8px">On site</th><th style="padding:6px 8px"></th></tr></thead><tbody>';
  rows.forEach(function(v){h+='<tr style="border-top:1px solid var(--border2)"><td style="padding:8px;font-weight:700">'+_viEsc(v.name)+'</td><td style="padding:8px">'+_viEsc(v.company)+'</td><td style="padding:8px">'+_viEsc(v.visiting)+'</td><td style="padding:8px;white-space:nowrap">'+_viTimeStr(v.sign_in)+'</td><td style="padding:8px;white-space:nowrap">'+_viDur(v.sign_in)+'</td><td style="padding:8px"><button onclick="window.viSignOut(\''+v.id+'\')" style="padding:6px 13px;border-radius:8px;border:none;background:#16a34a;color:#fff;font-size:12px;font-weight:700;cursor:pointer">Sign out</button></td></tr>';});
  h+='</tbody></table></div></div>';
  return h;
}
function _viFiltered(){
  var rows=_viList().filter(function(v){return v.status!=='deleted';});
  var q=(S._visQ||'').trim().toLowerCase(),co=(S._visCo||'').trim().toLowerCase(),dt=(S._visDate||'');
  if(q)rows=rows.filter(function(v){return (v.name+' '+v.visiting).toLowerCase().indexOf(q)>=0;});
  if(co)rows=rows.filter(function(v){return (v.company||'').toLowerCase().indexOf(co)>=0;});
  if(dt)rows=rows.filter(function(v){return (v.sign_in||'').slice(0,10)===dt;});
  return rows;
}
function _viRenderHistory(){
  var rows=_viFiltered();
  var _f='padding:8px 11px;background:var(--card2);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-size:13px';
  var h='<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><div class="st" style="margin:0">Visitor history</div><button onclick="window.viExportCsv()" style="padding:8px 14px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-weight:700;font-size:13px;cursor:pointer">⬇ Export CSV</button></div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><input id="viSearchName" placeholder="Name / staff…" value="'+_viEsc(S._visQ||'')+'" oninput="S._visQ=this.value;render()" style="'+_f+'"><input id="viSearchCo" placeholder="Company…" value="'+_viEsc(S._visCo||'')+'" oninput="S._visCo=this.value;render()" style="'+_f+'"><input type="date" value="'+_viEsc(S._visDate||'')+'" onchange="S._visDate=this.value;render()" style="'+_f+'">'+((S._visQ||S._visCo||S._visDate)?'<button onclick="S._visQ=\'\';S._visCo=\'\';S._visDate=\'\';render()" style="'+_f+';cursor:pointer">Clear</button>':'')+'</div>';
  if(!rows.length)return h+'<p style="color:var(--text3)">No records.</p></div>';
  h+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:.04em"><th style="padding:6px 8px">Name</th><th style="padding:6px 8px">Company</th><th style="padding:6px 8px">Visiting</th><th style="padding:6px 8px">Date</th><th style="padding:6px 8px">In</th><th style="padding:6px 8px">Out</th><th style="padding:6px 8px">Dur</th>'+(_viCanManage()?'<th></th>':'')+'</tr></thead><tbody>';
  rows.forEach(function(v){h+='<tr style="border-top:1px solid var(--border2)"><td style="padding:8px;font-weight:600">'+_viEsc(v.name)+'</td><td style="padding:8px">'+_viEsc(v.company)+'</td><td style="padding:8px">'+_viEsc(v.visiting)+'</td><td style="padding:8px;white-space:nowrap">'+_viDateStr(v.sign_in)+'</td><td style="padding:8px;white-space:nowrap">'+_viTimeStr(v.sign_in)+'</td><td style="padding:8px;white-space:nowrap">'+(v.sign_out?_viTimeStr(v.sign_out):'<span style="color:#16a34a;font-weight:700">on site</span>')+'</td><td style="padding:8px;white-space:nowrap">'+_viDur(v.sign_in,v.sign_out)+'</td>'+(_viCanManage()?'<td style="padding:8px"><button onclick="window.viDelete(\''+v.id+'\')" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:14px">×</button></td>':'')+'</tr>';});
  h+='</tbody></table></div></div>';
  return h;
}
