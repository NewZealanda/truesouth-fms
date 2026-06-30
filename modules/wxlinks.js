// === MODULE: wxlinks === v1.0 ===
// Customer weather-call links. A pilot makes a weather call → the desk copies a unique per-booking link
// (wx.html?t=token) and sends it to the customer (WhatsApp/email). When the customer opens it, the
// acknowledgement comes back and auto-ticks the booking's Wx ("AUTO"). Full activity history + a
// reset-to-live control. Data: ts_wx_links (snapshot built in rezdy._wxSnapFor, stashed in S._wxSnap).
// ─────────────────────────────────────────────────────────────────────────────────────────────────
function _wxEsc(s){return (typeof esc==='function')?esc(s):String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function _wxNewToken(){return 'wx'+Date.now().toString(36)+Math.random().toString(36).slice(2,12);}
function _wxLinkUrl(token){var o=(typeof location!=='undefined'&&location.origin)?location.origin:'';return o+'/wx.html?t='+token;}
function _wxLinkRow(order){return (S._wxLinks||{})[String(order)]||null;}
function _wxLinkExists(order){return !!_wxLinkRow(order);}
function _wxLinkAcked(order){var r=_wxLinkRow(order);return !!(r&&r.ack_at);}   // customer opened/acknowledged → auto-Wx
function _wxLinkAction(order){var r=_wxLinkRow(order);return (r&&r.action)||'';}
// Pickup status badge for a booking, from the customer's link action.
function _wxHadPickup(order){var r=_wxLinkRow(order);return !!(r&&r.snapshot&&String(r.snapshot.pickup_loc||'').trim());}
function _wxPickupBadge(order){
  var a=_wxLinkAction(order);if(!a)return '';
  if(a==='confirmed')return '<span title="Customer confirmed their pickup via the weather link" style="display:inline-flex;align-items:center;gap:3px;color:#16a34a;font-weight:800">✓ Confirmed</span>';
  if(a==='self_drive'){
    // Amber warning ONLY when they changed FROM a booked pickup to self-drive. If they were already
    // self-drive (no pickup), it's just a confirmation → green tick.
    if(_wxHadPickup(order))return '<span title="Customer changed from a pickup to self-drive via the weather link" style="display:inline-flex;align-items:center;gap:3px;color:#d97706;font-weight:800">⚠ Self drive</span>';
    return '<span title="Customer confirmed — self-drive as booked" style="display:inline-flex;align-items:center;gap:3px;color:#16a34a;font-weight:800">✓ Self drive</span>';
  }
  if(a==='change_pickup')return '<span title="Customer asked to change their pickup via the weather link — please contact them" style="display:inline-flex;align-items:center;gap:3px;color:#d97706;font-weight:800">⚠ Change pickup</span>';
  return '';
}
// On each links load: auto-flag self-drive bookings + notify the desk of pickup changes (deduped).
function _wxProcessActions(){
  try{
    var links=S._wxLinks||{};var dirty=false;var toNotify=[];
    Object.keys(links).forEach(function(order){var r=links[order];if(!r)return;var a=r.action||'';
      if(a==='self_drive'){S._rzSelfDrive=S._rzSelfDrive||{};if(!S._rzSelfDrive[order]){S._rzSelfDrive[order]=true;dirty=true;}}
      // Only ping the desk when a human is actually needed: change-pickup (fix it / call them), or a
      // refund / contact request. A switch to self-drive needs no action — it just shows visually (amber).
      var _notable=(a==='change_pickup'||a==='refund'||a==='contact');
      if(_notable){
        var ev=Array.isArray(r.events)?r.events:[];var key='notified_'+a;
        if(!ev.some(function(e){return e.t===key;}))toNotify.push({order:order,row:r,action:a,key:key});
      }
    });
    if(dirty&&typeof window.pickupSave==='function')window.pickupSave(true);
    if(toNotify.length)_wxSendActionNotifs(toNotify);
  }catch(e){}
}
function _wxSendActionNotifs(list){
  try{
    if(typeof sbU!=='function')return;
    var recips=(typeof _wxBroadcastRecipients==='function')?_wxBroadcastRecipients(S.rezdyDate,null):[];
    var ACT={change_pickup:'wants to CHANGE their pickup',self_drive:'switched to SELF-DRIVE (no pickup needed)',refund:'requested a REFUND',contact:'asked to be contacted'};
    list.forEach(function(n){
      var snap=(n.row&&n.row.snapshot)||{};
      if(recips.length){
        var msg='🔔 '+(snap.pax_name||'#'+n.order)+' '+(ACT[n.action]||n.action)+(snap.dep_time?' · '+snap.dep_time:'')+(snap.dep_label?' · '+snap.dep_label:'')+' (via weather link)';
        sbU('ts_notifications',recips.map(function(uid){return {user_id:uid,type:'wx_pickup',reference_id:n.order,message:msg,read:false,created_at:new Date().toISOString()};})).catch(function(){});
      }
      n.row.events=(Array.isArray(n.row.events)?n.row.events:[]);n.row.events.push({t:n.key,at:new Date().toISOString(),src:'system'});
      n.row.updated_at=new Date().toISOString();
      sbU('ts_wx_links',[n.row]).catch(function(){});
    });
  }catch(e){}
}

window.loadWxLinks=async function(date){
  date=date||S.rezdyDate;if(!date||typeof _sbFetch!=='function')return;
  try{
    var r=await _sbFetch(SB+'/rest/v1/ts_wx_links?fr_date=eq.'+encodeURIComponent(date)+'&select=*',{headers:SH});
    if(!r||!r.ok)return;
    var rows=await r.json();var d={};(rows||[]).forEach(function(x){if(x&&x.order_number)d[String(x.order_number)]=x;});
    S._wxLinks=d;S._wxLinksDate=date;
    try{_wxProcessActions();}catch(e){}
    if(typeof safeRender==='function')safeRender();
  }catch(e){}
};
// Keep the day's links loaded (called from the bookings render) + a light poll so customer actions
// show without a manual refresh even if the realtime push is delayed.
function _wxLinksEnsure(){
  if(S._wxLinksDate!==S.rezdyDate&&!S._wxLinksLoading){S._wxLinksLoading=true;Promise.resolve(window.loadWxLinks(S.rezdyDate)).finally(function(){S._wxLinksLoading=false;});}
  _wxStartPoll();
}
function _wxStartPoll(){
  if(S._wxPoll)return;
  S._wxPoll=setInterval(function(){try{
    if(S.section!=='operations')return;                                  // only while on the bookings/ops pages
    if(typeof document!=='undefined'&&document.visibilityState!=='visible')return;
    if(S._wxLinksDate&&typeof window.loadWxLinks==='function')window.loadWxLinks(S.rezdyDate);
  }catch(e){}},10000);
}

function _wxClipboard(text){
  try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text);return true;}}catch(e){}
  try{var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);return true;}catch(e){}
  return false;
}

// Create/refresh the link for a booking, copy the URL, log a 'copied' event. Preserves any existing
// customer acknowledgement (re-arming is the explicit Reset button).
window.wxCopyLink=async function(order){
  order=String(order);
  var snap=(S._wxSnap||{})[order]||{};
  var ex=_wxLinkRow(order);
  var token=(ex&&ex.token)||_wxNewToken();
  var events=(ex&&Array.isArray(ex.events))?ex.events.slice():[];
  events.push({t:'copied',at:new Date().toISOString(),src:'staff',by:(S.user&&S.user.name)||''});
  var row={token:token,order_number:order,dep_key:snap.dep_key||'',fr_date:S.rezdyDate||null,snapshot:snap,events:events,
           ack_at:(ex&&ex.ack_at)||null,action:(ex&&ex.action)||null,action_at:(ex&&ex.action_at)||null,
           action_note:(ex&&ex.action_note)||null,created_at:(ex&&ex.created_at)||new Date().toISOString(),updated_at:new Date().toISOString()};
  S._wxLinks=S._wxLinks||{};S._wxLinks[order]=row;S._wxLinksDate=S.rezdyDate;
  var ok=(typeof sbU==='function')?await sbU('ts_wx_links',[row]):true;
  var url=_wxLinkUrl(token);var copied=_wxClipboard(url);
  if(typeof toast==='function')toast(copied?'Weather link copied — paste it to the customer':'Link saved — copy it from the panel',ok?'ok':'warn');
  render();
};
window.wxMarkSent=function(order,channel){
  order=String(order);var ex=_wxLinkRow(order);if(!ex)return;
  var events=Array.isArray(ex.events)?ex.events.slice():[];
  events.push({t:'sent_'+(channel||'manual'),at:new Date().toISOString(),src:'staff',by:(S.user&&S.user.name)||''});
  ex.events=events;ex.updated_at=new Date().toISOString();
  if(typeof sbU==='function')sbU('ts_wx_links',[ex]).catch(function(){});
  if(typeof toast==='function')toast('Marked as sent','ok');render();
};
// Reset to "live" — clears the customer acknowledgement (un-ticks AUTO), refreshes the snapshot to the
// latest weather call, and logs a 'reset'. The same link is now active again for the customer.
window.wxResetLink=function(order){
  order=String(order);var ex=_wxLinkRow(order);if(!ex)return;
  if(typeof confirm==='function'&&!confirm('Reset this weather link to live again?\nIt clears the customer’s confirmation and re-arms the same link.'))return;
  var snap=(S._wxSnap||{})[order]||ex.snapshot||{};
  var events=Array.isArray(ex.events)?ex.events.slice():[];
  events.push({t:'reset',at:new Date().toISOString(),src:'staff',by:(S.user&&S.user.name)||''});
  var row=Object.assign({},ex,{snapshot:snap,ack_at:null,action:null,action_at:null,action_note:null,events:events,updated_at:new Date().toISOString()});
  S._wxLinks[order]=row;
  if(typeof sbU==='function')sbU('ts_wx_links',[row]).catch(function(){});
  if(typeof toast==='function')toast('Weather link reset — live again','ok');render();
};
window.wxLinkOpen=function(order){_wxLinksEnsure();S._wxLinkOpen=String(order);render();};
window.wxLinkClose=function(){S._wxLinkOpen=null;render();};
// Clear the visible activity history (admin/superadmin only). Keeps the link, status, ack + the internal
// notified-markers (so it won't re-ping the desk), just wipes the displayed log.
function _wxIsAdmin(){var u=S.user||{};var r=u.role||'';return !!(u.superAdmin||r==='admin'||r==='superadmin');}
window.wxClearHistory=function(order){
  order=String(order);if(!_wxIsAdmin())return;var ex=_wxLinkRow(order);if(!ex)return;
  if(typeof confirm==='function'&&!confirm('Clear the activity history for this weather link?\nThe link, status and acknowledgement stay — only the history log is wiped.'))return;
  ex.events=(Array.isArray(ex.events)?ex.events:[]).filter(function(e){return String(e.t||'').indexOf('notified_')===0;});
  ex.updated_at=new Date().toISOString();
  if(typeof sbU==='function')sbU('ts_wx_links',[ex]).catch(function(){});
  if(typeof toast==='function')toast('History cleared','ok');render();
};
// When a pilot makes/changes/clears a weather call, refresh the wx fields on every link for that
// departure so the customer page shows the latest automatically (no re-copy needed).
window.wxSyncDep=function(dep){
  try{
    dep=String(dep);var links=S._wxLinks||{};var c=(typeof _wxCall==='function')?_wxCall(dep):null;
    var REA={cloud:'Cloud',rain:'Rain',wind:'Wind',snow:'Snow',visibility:'Visibility',vis:'Visibility',fog:'Fog'};
    var reasons=((c&&c.reasons)||[]).map(function(r){return REA[String(r).toLowerCase()]||r;});
    Object.keys(links).forEach(function(order){var r=links[order];if(!r||String(r.dep_key||'')!==dep)return;
      r.snapshot=r.snapshot||{};
      r.snapshot.wx_status=(c&&c.status)||'';r.snapshot.wx_reasons=reasons;r.snapshot.wx_comment=(c&&c.comment)||'';r.snapshot.next_day=(c&&c.nextDay)||'';
      r.updated_at=new Date().toISOString();
      if(typeof sbU==='function')sbU('ts_wx_links',[r]).catch(function(){});
    });
  }catch(e){}
};

function _wxLinkStatus(order){
  var r=_wxLinkRow(order);
  if(!r)return {label:'Not created',col:'var(--text3)'};
  if(r.action==='refund')return {label:'Customer requested refund',col:'#f87171'};
  if(r.action==='contact')return {label:'Customer asked to be contacted',col:'#f59e0b'};
  if(r.action==='change_pickup')return {label:'Customer wants to change pickup',col:'#f59e0b'};
  if(r.action==='self_drive')return {label:'Customer will make own way (no pickup)',col:'#60a5fa'};
  if(r.action==='confirmed')return {label:'Customer confirmed ✓',col:'#4ade80'};
  if(r.ack_at)return {label:'Customer opened the link',col:'#60a5fa'};
  var ev=Array.isArray(r.events)?r.events:[];
  if(ev.some(function(e){return String(e.t).indexOf('sent')===0;}))return {label:'Sent — not opened yet',col:'#a78bfa'};
  return {label:'Created — not sent yet',col:'var(--text3)'};
}
var _WX_EV_LBL={copied:'Link copied',sent_manual:'Marked sent',sent_whatsapp:'Sent via WhatsApp',sent_email:'Sent via email',
  view:'Customer opened the link',confirmed:'Customer confirmed',refund:'Customer requested refund',contact:'Customer asked to be contacted',
  self_drive:'Customer will make own way (no pickup)',change_pickup:'Customer wants to change pickup',reset:'Reset to live (staff)'};
function _wxEvLabel(t){return _WX_EV_LBL[t]||t;}
function _wxEvTime(iso){try{var d=new Date(iso);if(isNaN(d.getTime()))return '';return d.toLocaleString('en-NZ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){return '';}}

// App-wide modal (rendered from renderApp). Shows the link, copy, status, history + reset.
function _wxLinkModal(){
  var order=S._wxLinkOpen;if(!order)return '';
  var r=_wxLinkRow(order);var snap=(S._wxSnap||{})[order]||(r&&r.snapshot)||{};
  var st=_wxLinkStatus(order);
  var url=r?_wxLinkUrl(r.token):'';
  var ev=(r&&Array.isArray(r.events))?r.events.filter(function(e){return String(e.t||'').indexOf('notified_')!==0;}).slice().reverse():[];
  var h='<div onclick="window.wxLinkClose()" style="position:fixed;inset:0;z-index:11000;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;padding:24px 14px;overflow:auto">'+
    '<div onclick="event.stopPropagation()" style="background:var(--card);border:1px solid var(--border2);border-radius:16px;max-width:460px;width:100%;padding:18px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px"><div class="st" style="margin:0">Weather link · #'+_wxEsc(order)+'</div>'+
        '<button onclick="window.wxLinkClose()" style="background:none;border:none;color:var(--text3);font-size:20px;cursor:pointer;line-height:1">✕</button></div>'+
      '<div style="font-size:12px;color:var(--text3);margin-bottom:12px">'+_wxEsc(snap.pax_name||'')+(snap.dep_time?' · '+_wxEsc(snap.dep_time):'')+(snap.dep_label?' · '+_wxEsc(snap.dep_label):'')+'</div>'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span style="width:9px;height:9px;border-radius:50%;background:'+st.col+';flex-shrink:0"></span><span style="font-size:13px;font-weight:700;color:'+st.col+'">'+_wxEsc(st.label)+'</span></div>';
  // link + copy
  h+='<div style="display:flex;gap:6px;margin-bottom:10px">'+
       '<input readonly value="'+_wxEsc(url||'(generate the link first)')+'" onclick="this.select()" style="flex:1;min-width:0;font-size:12px;padding:9px 10px;background:var(--card2);border:1px solid var(--border2);border-radius:8px;color:var(--text2)">'+
       '<button onclick="window.wxCopyLink(\''+_wxEsc(order).replace(/'/g,"\\'")+'\')" style="flex-shrink:0;padding:9px 14px;border-radius:8px;border:none;background:var(--accent,#7c3aed);color:#fff;font-size:13px;font-weight:700;cursor:pointer">'+(r?'Copy':'Create + copy')+'</button>'+
     '</div>';
  if(r){
    h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">'+
       '<button onclick="window.wxMarkSent(\''+order+'\',\'whatsapp\')" style="font-size:11px;padding:5px 11px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);cursor:pointer">✓ Mark sent · WhatsApp</button>'+
       '<button onclick="window.wxMarkSent(\''+order+'\',\'email\')" style="font-size:11px;padding:5px 11px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);color:var(--text2);cursor:pointer">✓ Mark sent · Email</button>'+
       (r.ack_at?'<button onclick="window.wxResetLink(\''+order+'\')" style="font-size:11px;padding:5px 11px;border-radius:8px;border:1px solid rgba(245,158,11,.45);background:transparent;color:#f59e0b;cursor:pointer;font-weight:700">↺ Reset to live</button>':'')+
     '</div>';
    // history
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><span style="font-size:11px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">History</span>'+
      ((_wxIsAdmin()&&ev.length)?'<button onclick="window.wxClearHistory(\''+order+'\')" style="font-size:10px;color:#ef4444;background:none;border:1px solid rgba(239,68,68,.4);border-radius:7px;padding:3px 8px;cursor:pointer">Clear history</button>':'')+
    '</div>';
    if(!ev.length)h+='<div style="font-size:12px;color:var(--text3)">No activity yet.</div>';
    else{h+='<div style="display:flex;flex-direction:column;gap:0">';ev.forEach(function(e){
      var isCust=e.src==='customer';
      h+='<div style="display:flex;align-items:center;gap:9px;padding:6px 0;border-top:1px solid var(--border2)">'+
         '<span style="width:7px;height:7px;border-radius:50%;flex-shrink:0;background:'+(isCust?'#60a5fa':'var(--text3)')+'"></span>'+
         '<span style="flex:1;font-size:12.5px;color:var(--text2)">'+_wxEsc(_wxEvLabel(e.t))+(e.by?' <span style="color:var(--text3)">· '+_wxEsc(e.by)+'</span>':'')+'</span>'+
         '<span style="font-size:11px;color:var(--text3);white-space:nowrap">'+_wxEsc(_wxEvTime(e.at))+'</span></div>';
    });h+='</div>';}
  }else{
    h+='<div style="font-size:12px;color:var(--text3);margin-top:4px">Create the link, then paste it to the customer (WhatsApp/email). When they open it, the booking’s Wx ticks automatically.</div>';
  }
  h+='</div></div>';
  return h;
}
