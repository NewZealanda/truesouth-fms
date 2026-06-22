// ─────────────────────────────────────────────────────────────────────────────
//  FLIGHT & DUTY  (Subpart K / AC119-2 — single-pilot VFR, ATO+CTO combined envelope)
//  Advisory tracker + 12-month record. Per-pilot daily log (one row/day), rolling-window
//  limit checks, 90-day day-currency per type, monthly print & certify. Source of truth for the
//  NUMBERS is the operator's Exposition — every limit here is configurable (Settings ▸ Operations).
//  NOTE: persistence needs the ts_flightduty / ts_fd_certs tables (see flightduty.sql migration).
// ─────────────────────────────────────────────────────────────────────────────

// Default limits (AC119-2 example / SLA Exposition §4.8). Editable via S._fdLimits overlay.
var FD_LIMITS_DEFAULT={
  duty_daily:{lbl:'Daily duty',           val:11,   unit:'h', win:'day'},
  duty_30:   {lbl:'Duty · any 30 days',   val:200,  unit:'h', win:30},
  flt_7:     {lbl:'Flight · any 7 days',  val:35,   unit:'h', win:7},
  flt_28:    {lbl:'Flight · 28 days (ATO)', val:100,  unit:'h', win:28},
  flt_30:    {lbl:'Flight · 30 days (CTO cap)', val:160,  unit:'h', win:30},
  flt_90:    {lbl:'Flight · any 90 days', val:300,  unit:'h', win:90},
  flt_365:   {lbl:'Flight · any 365 days',val:1000, unit:'h', win:365}
};
var FD_DUTY_EXT=12;                 // a commenced duty may extend to 12h for a disrupted schedule
var FD_CURRENCY_DAYS=90, FD_CURRENCY_LDG=3; // 3 take-offs+landings / 90 days per type (day, pax recency)
var FD_TYPES=[{id:'c208b',lbl:'C208B'},{id:'ga8',lbl:'GA8'}]; // tracked types (currency on type)
var FD_BUFFER_DEFAULT={amber:90,red:100};   // % of limit → amber / red (per-limit overridable)

// Effective limit set = defaults overlaid by the saved config (val + per-limit amber/red buffer).
function _fdLimits(){
  var ov=S._fdLimits||{};var out={};
  Object.keys(FD_LIMITS_DEFAULT).forEach(function(k){
    var d=FD_LIMITS_DEFAULT[k],o=ov[k]||{};
    out[k]={lbl:d.lbl,unit:d.unit,win:d.win,
      val:(o.val!=null&&o.val!=='')?(+o.val):d.val,
      amber:(o.amber!=null&&o.amber!=='')?(+o.amber):FD_BUFFER_DEFAULT.amber,
      red:(o.red!=null&&o.red!=='')?(+o.red):FD_BUFFER_DEFAULT.red};
  });
  return out;
}

// ── date helpers (local, YYYY-MM-DD) ──
function _fdToday(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _fdDateObj(ds){var m=/(\d{4})-(\d{2})-(\d{2})/.exec(String(ds||''));return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
function _fdIso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _fdAddDays(ds,n){var d=_fdDateObj(ds);if(!d)return ds;d.setDate(d.getDate()+n);return _fdIso(d);}
function _fdDaysBetween(a,b){var da=_fdDateObj(a),db=_fdDateObj(b);if(!da||!db)return 0;return Math.round((db-da)/86400000);}
function _fdFmt(ds){var d=_fdDateObj(ds);return d?d.toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}):ds;}
function _fdMonth(ds){return String(ds||'').slice(0,7);}            // YYYY-MM
function _fdMonthLabel(m){var d=_fdDateObj(m+'-01');return d?d.toLocaleDateString('en-NZ',{month:'long',year:'numeric'}):m;}

// Minutes between two "HH:MM" duty times (same calendar day; pilots never finish after 19:00).
function _fdMins(t){var m=/(\d{1,2}):(\d{2})/.exec(String(t||''));return m?(+m[1])*60+(+m[2]):null;}
function _fdDutyHours(r){if(!r||!r.ds||!r.de)return 0;var a=_fdMins(r.ds),b=_fdMins(r.de);if(a==null||b==null)return 0;var d=(b-a)/60;return d>0?d:0;}

// ── per-pilot data access ──
function _fdKey(uid,ds){return uid+'|'+ds;}
function _fdRow(uid,ds){return (S._fdData||{})[_fdKey(uid,ds)]||null;}
// All rows for a pilot as [{date,...}] sorted ascending.
function _fdRows(uid){
  var out=[];var d=S._fdData||{};
  Object.keys(d).forEach(function(k){var p=k.split('|');if(p[0]===uid)out.push(Object.assign({date:p[1]},d[k]));});
  out.sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0;});
  return out;
}
// Rolling sum of a field over the window ENDING on `asOf` (inclusive), spanning `win` days back.
function _fdRollSum(uid,asOf,win,fn){
  var from=_fdAddDays(asOf,-(win-1));var tot=0;
  _fdRows(uid).forEach(function(r){if(r.date>=from&&r.date<=asOf)tot+=(fn(r)||0);});
  return tot;
}
function _fdFlight(r){return +(r.ft||0);}
// Current value for a configured limit key, as of a date.
function _fdValueFor(uid,key,asOf){
  var L=_fdLimits()[key];if(!L)return 0;
  if(key==='duty_daily'){var r=_fdRow(uid,asOf);return r?_fdDutyHours(r):0;}
  if(key.indexOf('duty')===0)return _fdRollSum(uid,asOf,L.win,_fdDutyHours);
  return _fdRollSum(uid,asOf,L.win,_fdFlight); // flight windows
}
// Status of a value vs a limit → 'ok' | 'amber' | 'red' | 'over'.
function _fdStatus(val,L){
  if(!L||!L.val)return 'ok';var pct=val/L.val*100;
  if(val>L.val+1e-9)return 'over';
  if(pct>=(L.red||100))return 'red';
  if(pct>=(L.amber||90))return 'amber';
  return 'ok';
}
var _FD_COL={ok:'#22c55e',amber:'#f59e0b',red:'#ef4444',over:'#ef4444'};

// ── currency (3 landings / 90 days, per type, day) ──
// Expiry = the 3rd-most-recent landing (across ALL history) + 90 days. If that's in the future the
// pilot is current (daysLeft); if it's passed they're un-current by daysOver. Returns
// {current,everCurrent,recent,expiry,daysLeft,daysOver}.
function _fdCurrency(uid,type,asOf){
  asOf=asOf||_fdToday();
  var field=type==='ga8'?'lg':'lc';
  var days=_fdRows(uid).filter(function(r){return r.date<=asOf&&(+r[field]||0)>0;}); // all landing-days, ascending
  var recent=days.filter(function(r){return r.date>=_fdAddDays(asOf,-(FD_CURRENCY_DAYS-1));}).reduce(function(s,r){return s+(+r[field]||0);},0);
  // date of the 3rd-most-recent landing overall
  var acc=0,thirdDay=null;
  for(var i=days.length-1;i>=0;i--){acc+=(+days[i][field]||0);if(acc>=FD_CURRENCY_LDG){thirdDay=days[i].date;break;}}
  if(!thirdDay)return {current:false,everCurrent:false,recent:recent,expiry:null,daysLeft:0,daysOver:0};
  var expiry=_fdAddDays(thirdDay,FD_CURRENCY_DAYS);
  var diff=_fdDaysBetween(asOf,expiry); // +ve = days remaining, -ve = days overdue
  if(diff>=0)return {current:true,everCurrent:true,recent:recent,expiry:expiry,daysLeft:diff,daysOver:0};
  return {current:false,everCurrent:true,recent:recent,expiry:expiry,daysLeft:0,daysOver:-diff};
}

// ── days off ──
// A day is "free of duty" when there is NO duty/flight entry for it — so a past date with nothing
// logged counts as a day off; a logged duty period or flight makes it a working day. Counts the
// rule floors (2 off / any 14 days; 2 CONSECUTIVE off / any 30 days) looking back from asOf.
function _fdIsOffDay(uid,ds){var r=_fdRow(uid,ds);return !(r&&((r.ds&&r.de)||(+r.ft||0)>0));}
function _fdDaysOff(uid,asOf){
  var off14=0,maxConsec30=0,run=0,today=_fdToday();
  for(var i=0;i<30;i++){var ds=_fdAddDays(asOf,-i);
    // only a PAST day with no entry is a confirmed day off — today/future blanks are "unknown", not off
    var off=(ds<today)&&_fdIsOffDay(uid,ds);
    if(i<14&&off)off14++;
    if(off){run++;if(run>maxConsec30)maxConsec30=run;}else run=0;
  }
  return {off14:off14,consec30:maxConsec30};
}

// ── who is a tracked pilot ──
// Type ratings are DERIVED from the pilot's aircraft endorsements (crew.endorse) by each
// aircraft's W&B layout: a 'c208' airframe (SLA/SLB/SDB) ⇒ C208B, a 'ga8' airframe (SLD/SLQ) ⇒ GA8.
// So endorsing a registration automatically gives the matching type rating — no separate field.
function _fdTypeRatings(uid){
  var u=(S.users||[]).find(function(x){return x.id===uid;});
  var cr=u&&typeof _crewForUser==='function'?_crewForUser(u):null;
  var en=(cr&&cr.endorse)||[];var set={};
  en.forEach(function(e){
    var sp=(typeof _acSpec==='function')?_acSpec(e):((S.aircraft||{})[e]);
    var lay=sp&&sp.layout;
    if(lay==='ga8')set.ga8=1; else if(lay==='c208')set.c208b=1;
  });
  return Object.keys(set);
}
// A tracked "pilot" = anyone who can act as PIC: role pilot, the isPilot flag, has type ratings,
// or holds at least one aircraft approval (endorsement) — i.e. is PIC-eligible.
function _fdIsPilot(u){
  if(!u||u.inactive)return false;
  if(u.role==='pilot'||u.isPilot)return true;
  if(_fdTypeRatings(u.id).length>0)return true;
  var cr=(typeof _crewForUser==='function')?_crewForUser(u):null;
  return !!(cr&&cr.endorse&&cr.endorse.length);
}
function _fdPilots(){return (S.users||[]).filter(_fdIsPilot).sort(function(a,b){return (a.name||'').localeCompare(b.name||'');});}
function _fdCanManage(){return (typeof hasRolePerm==='function'&&hasRolePerm('flightduty_manage'))||(S.user&&S.user.superAdmin);}
function _fdSelfUid(){return S.user&&S.user.id;}
function _fdActiveUid(){
  if(_fdCanManage()&&S._fdPilot)return S._fdPilot;
  return _fdSelfUid();
}

// ── persistence ──
window.fdSaveRow=function(uid,ds,patch){
  S._fdData=S._fdData||{};var k=_fdKey(uid,ds);
  var cur=S._fdData[k]||{};
  var row=Object.assign({},cur,patch,{by:(S.user&&S.user.name)||'',at:new Date().toISOString()});
  // An all-empty row is removed (locally + in the DB) so it doesn't orphan a zero row or wrongly
  // count as a logged day.
  var empty=!row.ds&&!row.de&&!(+row.ft)&&!(+row.lc)&&!(+row.lg)&&!row.ext&&!row.note;
  if(empty){
    delete S._fdData[k];
    try{lsSet&&lsSet('ts_flightduty_cache',S._fdData);}catch(e){}
    try{if(typeof SB!=='undefined')fetch(SB+'/rest/v1/ts_flightduty?id=eq.'+encodeURIComponent(k),{method:'DELETE',headers:SH}).catch(function(){});}catch(e){}
    if(typeof safeRender==='function')safeRender();return;
  }
  S._fdData[k]=row;
  try{lsSet&&lsSet('ts_flightduty_cache',S._fdData);}catch(e){}
  if(typeof sbU==='function')sbU('ts_flightduty',[{id:k,user_id:uid,fd_date:ds,duty_start:row.ds||null,duty_end:row.de||null,flight_time:+row.ft||0,ldg_c208:+row.lc||0,ldg_ga8:+row.lg||0,extended:!!row.ext,override:!!row.ov,override_reason:row.ovr||null,note:row.note||null,updated_at:row.at,updated_by:row.by}]).catch(function(){});
  if(typeof safeRender==='function')safeRender();
};
window.fdEditField=function(uid,ds,field,value){
  if(value===''||value==null){/* keep blank */}
  else if(field==='lc'||field==='lg')value=Math.max(0,Math.round(+value)||0);   // landings = non-negative integer
  else if(field==='ft')value=Math.max(0,+value||0);                            // flight hours = non-negative
  var p={};p[field]=value;window.fdSaveRow(uid,ds,p);
};
// Duty start/end are locked to 15-minute blocks — round the entered time to the nearest quarter hour.
function _fdHM(t){t=Math.round(t/15)*15;if(t<0)t=0;if(t>=1440)t=1425;return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
window.fdSetTime=function(uid,ds,field,value){
  var m=/(\d{1,2}):(\d{2})/.exec(String(value||''));
  if(m)value=_fdHM((+m[1])*60+(+m[2]));
  window.fdEditField(uid,ds,field,value);
};
// "Now" button — fill the field with the current time (nearest 15 min). Mainly for the end time.
window.fdTimeNow=function(uid,ds,field){var d=new Date();window.fdEditField(uid,ds,field,_fdHM(d.getHours()*60+d.getMinutes()));};
// +/- 15-minute steppers. Bases off the current value, or now if empty.
window.fdTimeAdj=function(uid,ds,field,delta){
  var r=_fdRow(uid,ds)||{};var m=/(\d{1,2}):(\d{2})/.exec(String(r[field]||''));
  var t=m?((+m[1])*60+(+m[2])):(function(){var d=new Date();return d.getHours()*60+d.getMinutes();})();
  window.fdEditField(uid,ds,field,_fdHM(t+delta));
};
// 15-minute time options (realistic duty window 04:00–22:00; any out-of-range existing value is added).
var _FD_TIMES=(function(){var a=[];for(var t=4*60;t<=22*60;t+=15)a.push(String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0'));return a;})();
window.fdToggle=function(uid,ds,field){var r=_fdRow(uid,ds)||{};var p={};p[field]=!r[field];window.fdSaveRow(uid,ds,p);};
window.fdCertify=function(uid,month){
  if(!uid||!month)return;
  S._fdCerts=S._fdCerts||{};var k=uid+'|'+month;
  S._fdCerts[k]={at:new Date().toISOString(),by:(S.user&&S.user.name)||''};
  if(typeof sbU==='function')sbU('ts_fd_certs',[{id:k,user_id:uid,period:month,certified_at:S._fdCerts[k].at,certified_by:S._fdCerts[k].by}]).catch(function(){});
  if(typeof toast==='function')toast('Period '+_fdMonthLabel(month)+' certified ✓','ok');
  render();
};
function _fdCert(uid,month){return (S._fdCerts||{})[uid+'|'+month]||null;}

window.fdSetMonth=function(m){S._fdMonth=m;render();};
window.fdShiftMonth=function(dir){
  var m=S._fdMonth||_fdMonth(_fdToday());var d=_fdDateObj(m+'-01');d.setMonth(d.getMonth()+dir);
  S._fdMonth=_fdIso(d).slice(0,7);render();
};
window.fdSetPilot=function(uid){S._fdPilot=uid;render();};
window.fdSetTab=function(t){S._fdTab=t;render();};
window.fdToggleLA=function(){S._fdLA=!S._fdLA;render();};          // look-ahead collapse toggle
window.fdEditRow=function(ds){S._fdEditRow=ds;render();};          // open a day's row for editing
window.fdEditDone=function(){S._fdEditRow=null;render();};         // close the editing row

// Prefill landings for a day from the calendar PIC allocation (best-effort, only for the loaded date).
window.fdPrefillLandings=function(uid,ds){
  var u=(S.users||[]).find(function(x){return x.id===uid;});var nm=(u&&u.name||'').trim();
  // Count departures where this pilot is the allocated PIC for that aircraft, on this date, split by type.
  var lc=0,lg=0;
  try{
    if(S.rezdyDate===ds && typeof _rzSchedPilotFor==='function'){ /* same-day calendar is loaded */ }
  }catch(e){}
  if(typeof toast==='function')toast('Auto-prefill from flights comes with the flight-record cards — enter landings for now.','warn');
};

// Lazy-load the F&D records, certifications and limit config (needs the ts_flightduty /
// ts_fd_certs tables — see flightduty.sql). Cache the daily rows locally for instant paint.
window.loadFlightDuty=async function(){
  try{var c=lsGet&&lsGet('ts_flightduty_cache');if(c&&typeof c==='object')S._fdData=c;}catch(e){}
  if(typeof sbF!=='function'){if(typeof render==='function')render();return;}
  try{
    // Load ALL pilots' rows so the Team Summary (rostering view, shown to every pilot) populates —
    // not just the signed-in pilot's. RLS still governs server-side access.
    var _scope='';
    var rows=await sbF('ts_flightduty',_scope,'fd_date');
    if(Array.isArray(rows)){var d={};rows.forEach(function(r){d[r.user_id+'|'+r.fd_date]={ds:r.duty_start||'',de:r.duty_end||'',ft:r.flight_time||0,lc:r.ldg_c208||0,lg:r.ldg_ga8||0,ext:!!r.extended,ov:!!r.override,ovr:r.override_reason||'',note:r.note||'',by:r.updated_by||'',at:r.updated_at||''};});S._fdData=d;try{lsSet&&lsSet('ts_flightduty_cache',d);}catch(e){}}
    var certs=await sbF('ts_fd_certs',_scope,'certified_at');
    if(Array.isArray(certs)){var cc={};certs.forEach(function(r){cc[r.user_id+'|'+r.period]={at:r.certified_at,by:r.certified_by||''};});S._fdCerts=cc;}
    fetch(SB+'/rest/v1/ts_settings?key=eq.fd_limits&select=value',{headers:SH}).then(function(r){return r.ok?r.json():[];}).then(function(s){try{if(s&&s[0]&&s[0].value){S._fdLimits=JSON.parse(s[0].value);if(typeof _sbSetBase==='function')_sbSetBase('fd_limits',S._fdLimits);}}catch(e){}if(typeof safeRender==='function')safeRender();}).catch(function(){});
  }catch(e){}
  if(typeof safeRender==='function')safeRender();
};
// Save one limit's value / amber / red buffer (Settings ▸ Operations ▸ Flight & Duty).
window.fdSetLimit=function(key,field,value){
  S._fdLimits=S._fdLimits||{};S._fdLimits[key]=S._fdLimits[key]||{};
  S._fdLimits[key][field]=(value===''||value==null||isNaN(+value))?'':(+value); // NaN → revert to default
  if(typeof sbMergeSave==='function')sbMergeSave('fd_limits',S._fdLimits||{},function(m){S._fdLimits=m;});
  if(typeof safeRender==='function')safeRender();
};

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderFlightDuty(){
  if(!S._fdLoaded){S._fdLoaded=true;if(window.loadFlightDuty)window.loadFlightDuty();}
  if(!(typeof hasRolePerm==='function'&&hasRolePerm('flightduty'))&&!(S.user&&S.user.superAdmin))
    return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div>';
  var canManage=_fdCanManage();
  var tab=S._fdTab||'record';
  var tabs=[{id:'record',lbl:'My Record'},{id:'summary',lbl:'Team Summary'}];
  if(canManage)tabs[0]={id:'record',lbl:'Pilot Record'};
  var bar=(typeof _tier2==='function')?_tier2(tabs.map(function(t){return {lbl:t.lbl,on:tab===t.id,onclick:"window.fdSetTab('"+t.id+"')"};})):'';
  var body=(tab==='summary')?_fdRenderSummary():_fdRenderRecord(canManage);
  return '<div>'+bar+body+'</div>';
}

function _fdRenderRecord(canManage){
  var uid=_fdActiveUid();
  if(!uid)return '<div class="card" style="color:var(--text3);padding:24px">No pilot selected.</div>';
  var u=(S.users||[]).find(function(x){return x.id===uid;});
  var month=S._fdMonth||_fdMonth(_fdToday());
  var types=_fdTypeRatings(uid); // currency tracks ONLY the pilot's rated types (set on their crew profile)
  var L=_fdLimits();
  var h='';

  // header: pilot picker (managers) / pilot name. Month nav now sits just above the day list.
  h+='<div class="card" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">';
  if(canManage){
    h+='<select class="fi" style="font-size:13px;max-width:200px" onchange="window.fdSetPilot(this.value)"><option value="">— select pilot —</option>'+
      _fdPilots().map(function(p){return '<option value="'+_rzEscSafe(p.id)+'"'+(p.id===S._fdPilot?' selected':'')+'>'+_rzEscSafe(p.name)+'</option>';}).join('')+'</select>';
  } else {
    h+='<div style="font-weight:800;font-size:16px">'+_rzEscSafe((u&&u.name)||'My record')+'</div>';
  }
  h+='</div>';

  if(canManage&&!S._fdPilot){
    return h+'<div class="card" style="text-align:center;padding:30px;color:var(--text3);font-size:13px">Select a pilot to view their flight &amp; duty record.</div>';
  }

  // ── live limit panel (as of the latest day with data this month, else today) ──
  var asOf=_fdToday();
  h+='<div class="card"><div class="st">Rolling limits <span style="font-weight:400;font-size:11px;color:var(--text3)">— as at '+_rzEscSafe(_fdFmt(asOf))+'</span></div>';
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">';
  // Daily-duty isn't a rolling window — it's shown per-day in the grid below, so leave it out here.
  Object.keys(L).filter(function(key){return key!=='duty_daily';}).forEach(function(key){
    var lim=L[key];var val=_fdValueFor(uid,key,asOf);var st=_fdStatus(val,lim);var col=_FD_COL[st];
    var pct=Math.min(100,lim.val?val/lim.val*100:0);
    h+='<div style="border:1px solid var(--border2);border-left:3px solid '+col+';border-radius:8px;padding:8px 10px">'+
      '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--text3);font-weight:700">'+_rzEscSafe(lim.lbl)+'</div>'+
      '<div style="font-size:15px;font-weight:800;color:'+col+'">'+(Math.round(val*10)/10)+' <span style="font-size:11px;color:var(--text3);font-weight:600">/ '+lim.val+lim.unit+'</span></div>'+
      '<div style="height:4px;border-radius:3px;background:var(--card2);margin-top:4px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+col+'"></div></div>'+
      (st==='over'?'<div style="font-size:9px;font-weight:800;color:'+col+';margin-top:2px">⚠ LIMIT EXCEEDED</div>':st==='amber'||st==='red'?'<div style="font-size:9px;font-weight:700;color:'+col+';margin-top:2px">approaching limit</div>':'')+
      '</div>';
  });
  h+='</div>';
  // days off
  var doff=_fdDaysOff(uid,asOf);
  var doffOk1=doff.off14>=2,doffOk2=doff.consec30>=2;
  h+='<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--text2)">'+
    '<span style="color:'+(doffOk1?'#22c55e':'#ef4444')+';font-weight:700">'+(doffOk1?'✓':'⚠')+' '+doff.off14+' day(s) off / last 14 <span style="color:var(--text3);font-weight:400">(min 2)</span></span>'+
    '<span style="color:'+(doffOk2?'#22c55e':'#ef4444')+';font-weight:700">'+(doffOk2?'✓':'⚠')+' '+doff.consec30+' consecutive off / last 30 <span style="color:var(--text3);font-weight:400">(min 2)</span></span>'+
    '<span style="color:var(--text3)">a day with no logged duty counts as a day off</span>'+
    '</div></div>';

  // ── currency ──
  if(types.length){
    h+='<div class="card"><div class="st">Currency — day, on type <span style="font-weight:400;font-size:11px;color:var(--text3)">('+FD_CURRENCY_LDG+' landings / '+FD_CURRENCY_DAYS+' days)</span></div>';
    h+='<div style="display:flex;gap:10px;flex-wrap:wrap">';
    types.forEach(function(tid){
      var ty=FD_TYPES.find(function(x){return x.id===tid;});if(!ty)return;
      var c=_fdCurrency(uid,tid,asOf);
      var col=!c.current?'#ef4444':(c.daysLeft<=14?'#f59e0b':'#22c55e');
      h+='<div style="flex:1 1 200px;border:1px solid var(--border2);border-top:3px solid '+col+';border-radius:8px;padding:10px">'+
        '<div style="font-weight:800;font-size:14px;color:'+col+'">'+_rzEscSafe(ty.lbl)+'</div>'+
        (c.current
          ?'<div style="font-size:12px;color:var(--text2);margin-top:2px">Current — expires <b>'+_rzEscSafe(_fdFmt(c.expiry))+'</b> ('+c.daysLeft+' day'+(c.daysLeft===1?'':'s')+')</div>'
          :(c.everCurrent
            ?'<div style="font-size:12px;color:#ef4444;font-weight:700;margin-top:2px">NOT CURRENT — lapsed '+_rzEscSafe(_fdFmt(c.expiry))+', <b>'+c.daysOver+' day'+(c.daysOver===1?'':'s')+' overdue</b> ('+c.recent+'/'+FD_CURRENCY_LDG+' in last '+FD_CURRENCY_DAYS+' days)</div>'
            :'<div style="font-size:12px;color:#ef4444;font-weight:700;margin-top:2px">NOT CURRENT — '+c.recent+'/'+FD_CURRENCY_LDG+' landings on record</div>'))+
        '</div>';
    });
    h+='</div></div>';
  } else {
    h+='<div class="card" style="font-size:12px;color:var(--text3)">'+(canManage?'No type ratings on this pilot’s profile':'No type ratings on your profile')+' — set C208B / GA8 in the crew profile so currency can be tracked.</div>';
  }

  // ── look-ahead: how much you can still work as past days roll off the 30-day window ──
  // 2 dp so quarter-hour figures read true (e.g. 0.25 = 15 min, not rounded to 0.3).
  function _r1(x){return Math.round(x*100)/100;}
  function _fdShort(d){var o=_fdDateObj(d);return o?o.toLocaleDateString('en-NZ',{weekday:'short',day:'numeric',month:'short'}):d;}
  var _laTh=function(t,al){return '<th style="text-align:'+(al||'center')+';padding:6px 6px;font-size:10px;color:var(--text3);font-weight:700">'+t+'</th>';};
  var laOpen=!!S._fdLA;
  h+='<div class="card">';
  h+='<div onclick="window.fdToggleLA()" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:800;font-size:13px">'+
     '<span>Look ahead <span style="font-weight:400;font-size:11px;color:var(--text3)">— how much you can still work</span></span>'+
     '<span style="font-size:11px;color:var(--text3);font-weight:700">'+(laOpen?'▲ Hide':'▼ Show')+'</span></div>';
  if(laOpen){
    h+='<div style="overflow-x:auto;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:440px;table-layout:fixed">';
    h+='<colgroup><col style="width:118px"><col style="width:62px"><col style="width:64px"><col style="width:64px"><col style="width:64px"><col style="width:64px"></colgroup>';
    h+='<thead><tr style="background:var(--card2)">'+_laTh('Date','left')+_laTh('Rolls off')+_laTh('Duty/30')+_laTh('Can work')+_laTh('Flight/30')+_laTh('Can fly')+'</tr></thead><tbody>';
    for(var k=0;k<14;k++){
      var fd=_fdAddDays(asOf,k);
      var pd=_fdValueFor(uid,'duty_30',fd),pf=_fdValueFor(uid,'flt_30',fd);   // existing entries only → declines
      var rollOff=_fdDutyHours(_fdRow(uid,_fdAddDays(fd,-30))||{});
      var dCol=_FD_COL[_fdStatus(pd,L.duty_30)],fCol=_FD_COL[_fdStatus(pf,L.flt_30)];
      h+='<tr style="border-top:1px solid var(--border2)'+(k===0?';background:rgba(124,58,237,.06)':'')+'">'+
        '<td style="padding:4px 8px;white-space:nowrap">'+(k===0?'<b>Today</b> · ':'')+_rzEscSafe(_fdShort(fd))+'</td>'+
        '<td style="padding:4px;text-align:center;color:var(--text3)">'+(rollOff?'−'+_r1(rollOff):'')+'</td>'+
        '<td style="padding:4px;text-align:center;font-weight:700;color:'+dCol+'">'+_r1(pd)+'</td>'+
        '<td style="padding:4px;text-align:center;font-weight:800;color:'+dCol+'">'+_r1(Math.max(0,L.duty_30.val-pd))+'h</td>'+
        '<td style="padding:4px;text-align:center;font-weight:700;color:'+fCol+'">'+_r1(pf)+'</td>'+
        '<td style="padding:4px;text-align:center;font-weight:800;color:'+fCol+'">'+_r1(Math.max(0,L.flt_30.val-pf))+'h</td>'+
        '</tr>';
    }
    h+='</tbody></table></div><div style="font-size:11px;color:var(--text3);padding:6px 2px">"Rolls off" = duty that leaves the 30-day window that day. "Can work / fly" = hours left to your 30-day limit ('+L.duty_30.val+'h duty / '+L.flt_30.val+'h flight) if nothing more is added before then.</div>';
  }
  h+='</div>';

  // ── daily grid for the month ──
  var _gTh=function(t,c){return '<th style="text-align:center;padding:7px 4px;font-size:10px;color:'+(c||'var(--text3)')+';font-weight:700">'+t+'</th>';};
  var _inS='width:100%;font-size:12px;padding:4px 3px;border:1px solid var(--border2);border-radius:5px;background:var(--card);color:var(--text);text-align:center;box-sizing:border-box';
  var _stepBtn='width:18px;height:26px;border:1px solid var(--border2);border-radius:5px;background:var(--card2);color:var(--text2);font-size:13px;font-weight:800;cursor:pointer;padding:0;line-height:1;flex-shrink:0';
  // a 15-min time picker (select) + −/+ steppers (+ a "now" button on the end time)
  function _timeCell(ds,field,val,withNow){
    var a="'"+uid+"','"+ds+"','"+field+"'";
    var opts='<option value=""'+(!val?' selected':'')+'>—</option>';var found=false;
    for(var i=0;i<_FD_TIMES.length;i++){var t=_FD_TIMES[i];if(t===val)found=true;opts+='<option value="'+t+'"'+(t===val?' selected':'')+'>'+t+'</option>';}
    if(val&&!found)opts+='<option value="'+_rzEscSafe(val)+'" selected>'+_rzEscSafe(val)+'</option>';
    return '<td style="padding:3px 2px"><div style="display:flex;align-items:center;gap:2px;justify-content:center">'+
      '<button title="&minus;15 min" onclick="window.fdTimeAdj('+a+',-15)" style="'+_stepBtn+'">&minus;</button>'+
      '<select onchange="window.fdEditField('+a+',this.value)" style="width:46px;font-size:11px;padding:3px 0;border:1px solid var(--border2);border-radius:5px;background:var(--card);color:var(--text);box-sizing:border-box">'+opts+'</select>'+
      '<button title="+15 min" onclick="window.fdTimeAdj('+a+',15)" style="'+_stepBtn+'">+</button>'+
      (withNow?'<button title="Set to now (nearest 15 min)" onclick="window.fdTimeNow('+a+')" style="'+_stepBtn+';width:22px;color:#4ade80">⏱</button>':'')+
    '</div></td>';
  }
  // Landing-entry columns appear ONLY for the types the pilot is rated on (derived from endorsements).
  var showC=types.indexOf('c208b')>=0, showG=types.indexOf('ga8')>=0;
  // Month selector sits directly above the day list (was up in the header).
  h+='<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin:6px 0 8px">'+
    '<button class="btn btn-ghost" style="font-size:14px;padding:5px 14px" onclick="window.fdShiftMonth(-1)">◁</button>'+
    '<span style="font-weight:800;font-size:15px;min-width:160px;text-align:center">'+_rzEscSafe(_fdMonthLabel(month))+'</span>'+
    '<button class="btn btn-ghost" style="font-size:14px;padding:5px 14px" onclick="window.fdShiftMonth(1)">▶</button>'+
    '</div>';
  h+='<div style="font-size:11px;color:var(--text3);padding:0 2px 6px">Tap a day to enter or edit its times, flight hours and landings.</div>';
  h+='<div class="card" style="padding:0;overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:'+(516+(showC?58:0)+(showG?58:0))+'px;table-layout:fixed">';
  h+='<colgroup><col style="width:90px"><col style="width:92px"><col style="width:112px"><col style="width:52px"><col style="width:62px"><col style="width:60px">'+(showC?'<col style="width:58px">':'')+(showG?'<col style="width:58px">':'')+'<col style="width:40px"></colgroup>';
  h+='<thead><tr style="background:var(--card2)">'+
    '<th style="text-align:left;padding:7px 8px;font-size:10px;color:var(--text3);font-weight:700">Date</th>'+
    _gTh('Start')+_gTh('End')+_gTh('Duty&nbsp;h')+_gTh('Duty&nbsp;30d')+_gTh('Flight&nbsp;h')+(showC?_gTh('C208B','#22c55e'):'')+(showG?_gTh('GA8','#60a5fa'):'')+
    '<th style="text-align:center;padding:7px 4px;font-size:10px;color:var(--text3);font-weight:700" title="Tick when a commenced duty is extended to 12h to complete a disrupted schedule (normal max 11h)">Ext</th>'+
    '</tr></thead><tbody>';
  var mDate=_fdDateObj(month+'-01');var y=mDate.getFullYear(),mo=mDate.getMonth();
  var daysIn=new Date(y,mo+1,0).getDate();
  var today=_fdToday();
  // Default the open row to TODAY in the current month (so it's ready to fill); otherwise display-only.
  var editRow=(S._fdEditRow!==undefined)?S._fdEditRow:(month===_fdMonth(today)?today:null);
  var _dim='color:var(--text3)';
  for(var dd=1;dd<=daysIn;dd++){
    var ds=y+'-'+String(mo+1).padStart(2,'0')+'-'+String(dd).padStart(2,'0');
    var r=_fdRow(uid,ds)||{};
    var dh=_fdDutyHours(r);
    var _dlim=r.ext?FD_DUTY_EXT:L.duty_daily.val;
    var dHotCol=dh>_dlim+1e-9?'#ef4444':(dh>L.duty_daily.val+1e-9?'#f59e0b':'var(--text1)');
    var d30=_fdValueFor(uid,'duty_30',ds);var d30col=_FD_COL[_fdStatus(d30,L.duty_30)];
    var dow=_fdDateObj(ds).toLocaleDateString('en-NZ',{weekday:'short'});
    var isToday=ds===today;var future=ds>today;var off=!future&&_fdIsOffDay(uid,ds);
    var editing=(ds===editRow);
    var dhTxt=dh?(''+(Math.round(dh*100)/100)):'';     // duty hrs to 0.25 precision
    var d30Txt=d30?(''+(Math.round(d30*10)/10)):'';
    var rowBg=isToday?'background:rgba(124,58,237,.16);':(editing?'background:rgba(96,165,250,.10);':(off?'background:rgba(100,116,139,.05);':''));
    var rowStyle='border-top:1px solid var(--border2);'+(isToday?'box-shadow:inset 3px 0 0 #7c3aed;':'')+rowBg+(future&&!editing?'opacity:.55;':'');
    var dateCell='<b>'+dd+'</b> <span style="color:var(--text3)">'+dow+'</span>'+
      (isToday?' <span style="font-size:9px;color:#a78bfa;font-weight:800">TODAY</span>':off?' <span style="font-size:9px;color:#94a3b8">off</span>':'');
    if(editing){
      h+='<tr style="'+rowStyle+'">'+
        '<td style="padding:4px 8px;white-space:nowrap">'+dateCell+' <button title="Done" onclick="window.fdEditDone()" style="border:none;background:none;color:#4ade80;font-weight:800;cursor:pointer;font-size:14px;padding:0 2px">✓</button></td>'+
        _timeCell(ds,'ds',r.ds,false)+
        _timeCell(ds,'de',r.de,true)+
        '<td style="padding:3px 4px;text-align:center;font-weight:700;color:'+dHotCol+'">'+dhTxt+'</td>'+
        '<td style="padding:3px 4px;text-align:center;font-weight:700;color:'+(d30?d30col:'var(--text3)')+'">'+d30Txt+'</td>'+
        '<td style="padding:3px 4px"><input type="number" step="0.1" min="0" value="'+(r.ft!=null&&r.ft!==''?r.ft:'')+'" onchange="window.fdEditField(\''+uid+'\',\''+ds+'\',\'ft\',this.value)" style="'+_inS+'"></td>'+
        (showC?'<td style="padding:3px 4px"><input type="number" min="0" value="'+(r.lc!=null&&r.lc!==''?r.lc:'')+'" onchange="window.fdEditField(\''+uid+'\',\''+ds+'\',\'lc\',this.value)" style="'+_inS+'"></td>':'')+
        (showG?'<td style="padding:3px 4px"><input type="number" min="0" value="'+(r.lg!=null&&r.lg!==''?r.lg:'')+'" onchange="window.fdEditField(\''+uid+'\',\''+ds+'\',\'lg\',this.value)" style="'+_inS+'"></td>':'')+
        '<td style="padding:3px 4px;text-align:center"><input type="checkbox" '+(r.ext?'checked':'')+' onchange="window.fdToggle(\''+uid+'\',\''+ds+'\',\'ext\')"></td>'+
        '</tr>';
    } else {
      h+='<tr onclick="window.fdEditRow(\''+ds+'\')" style="cursor:pointer;'+rowStyle+'">'+
        '<td style="padding:7px 8px;white-space:nowrap">'+dateCell+'</td>'+
        '<td style="padding:7px 4px;text-align:center;'+(r.ds?'':_dim)+'">'+(r.ds||'·')+'</td>'+
        '<td style="padding:7px 4px;text-align:center;'+(r.de?'':_dim)+'">'+(r.de||'·')+'</td>'+
        '<td style="padding:7px 4px;text-align:center;font-weight:700;color:'+(dh?dHotCol:'var(--text3)')+'">'+(dh?dhTxt:'·')+'</td>'+
        '<td style="padding:7px 4px;text-align:center;font-weight:700;color:'+(d30?d30col:'var(--text3)')+'">'+(d30?d30Txt:'·')+'</td>'+
        '<td style="padding:7px 4px;text-align:center;'+((r.ft!=null&&r.ft!=='')?'':_dim)+'">'+((r.ft!=null&&r.ft!=='')?r.ft:'·')+'</td>'+
        (showC?'<td style="padding:7px 4px;text-align:center;'+((r.lc!=null&&r.lc!=='')?'color:#22c55e;font-weight:700':_dim)+'">'+((r.lc!=null&&r.lc!=='')?r.lc:'·')+'</td>':'')+
        (showG?'<td style="padding:7px 4px;text-align:center;'+((r.lg!=null&&r.lg!=='')?'color:#60a5fa;font-weight:700':_dim)+'">'+((r.lg!=null&&r.lg!=='')?r.lg:'·')+'</td>':'')+
        '<td style="padding:7px 4px;text-align:center">'+(r.ext?'<span style="color:#f59e0b;font-weight:800">✓</span>':'<span style="color:var(--text3)">·</span>')+'</td>'+
        '</tr>';
    }
  }
  h+='</tbody></table></div>';
  h+='<div style="font-size:11px;color:var(--text3);padding:6px 2px"><b>Duty&nbsp;30d</b> = rolling duty over the previous 30 days (towards the '+L.duty_30.val+'h limit). <b>Ext</b> = tick when a commenced duty ran past 11h to 12h to finish a disrupted schedule. Start/end times are locked to 15-minute blocks. Advisory only — your printed &amp; signed monthly record is the controlled document; limits in Settings ▸ Operations ▸ Flight &amp; Duty.</div>';

  // ── monthly print + certify/sign — at the BOTTOM, so it's signed once the month's entries are done ──
  var cert=_fdCert(uid,month);
  var monthEnded=month<_fdMonth(_fdToday());
  if(cert){
    h+='<div class="card" style="border-left:3px solid #22c55e;font-size:12px;color:var(--text2)">✓ '+_rzEscSafe(_fdMonthLabel(month))+' certified by '+_rzEscSafe(cert.by)+(cert.at?' on '+_rzEscSafe(_fdFmt(String(cert.at).slice(0,10))):'')+'.</div>';
  } else {
    h+='<div class="card" style="border-left:3px solid '+(monthEnded?'#f59e0b':'var(--border2)')+';display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'+
      '<div style="font-size:12px;color:var(--text2)">'+(monthEnded?'<b style="color:#f59e0b">This period needs certifying.</b> ':'')+'When '+_rzEscSafe(_fdMonthLabel(month))+' is complete, print, check, then certify the record.</div>'+
      '<div style="display:flex;gap:6px;flex-shrink:0">'+
        '<button class="btn btn-ghost" style="font-size:12px" onclick="window.fdPrint(\''+uid+'\',\''+month+'\')">🖨 Print</button>'+
        '<button class="btn btn-ghost" style="font-size:12px;border-color:rgba(74,222,128,.5);color:#4ade80" onclick="window.fdCertify(\''+uid+'\',\''+month+'\')">✓ Certify &amp; sign</button>'+
      '</div></div>';
  }
  return h;
}

function _fdRenderSummary(){
  var L=_fdLimits();var asOf=_fdToday();
  var pilots=_fdPilots();
  if(!pilots.length)return '<div class="card" style="color:var(--text3);padding:24px">No pilots found. Set type ratings on crew profiles (Settings ▸ People).</div>';
  var h='<div class="card"><div class="st">Team summary <span style="font-weight:400;font-size:11px;color:var(--text3)">— rolling totals as at '+_rzEscSafe(_fdFmt(asOf))+', for rostering</span></div>';
  h+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:560px">';
  h+='<thead><tr style="background:var(--card2)">'+
    '<th style="text-align:left;padding:7px 8px;font-size:10px;color:var(--text3)">Pilot</th>'+
    '<th style="padding:7px 6px;font-size:10px;color:var(--text3)">Duty / 30d</th>'+
    '<th style="padding:7px 6px;font-size:10px;color:var(--text3)">Flight / 7d</th>'+
    '<th style="padding:7px 6px;font-size:10px;color:var(--text3)">Flight / 30d</th>'+
    '<th style="padding:7px 6px;font-size:10px;color:var(--text3)">C208B curr</th>'+
    '<th style="padding:7px 6px;font-size:10px;color:var(--text3)">GA8 curr</th>'+
    '</tr></thead><tbody>';
  function cell(val,key){var lim=L[key];var st=_fdStatus(val,lim);var col=_FD_COL[st];return '<td style="padding:5px 6px;text-align:center;font-weight:700;color:'+col+'">'+(Math.round(val*10)/10)+'<span style="font-size:10px;color:var(--text3);font-weight:500"> /'+lim.val+'</span></td>';}
  function currCell(uid,type){
    // Currency shows ONLY for a type the pilot is rated on (set on their crew profile); otherwise dash.
    var rated=_fdTypeRatings(uid).indexOf(type)>=0;
    if(!rated)return '<td style="padding:5px 6px;text-align:center;color:var(--text3)">—</td>';
    var c=_fdCurrency(uid,type,asOf);
    if(!c.everCurrent)return '<td style="padding:5px 6px;text-align:center;font-weight:700;color:#ef4444" title="Fewer than '+FD_CURRENCY_LDG+' landings on record">'+c.recent+'/'+FD_CURRENCY_LDG+'</td>';
    var col=!c.current?'#ef4444':(c.daysLeft<=14?'#f59e0b':'#22c55e');
    // current → days remaining; un-current → days overdue ("−Nd uncurrent")
    return '<td style="padding:5px 6px;text-align:center;font-weight:700;color:'+col+'" title="'+(c.current?'expires '+_rzEscSafe(_fdFmt(c.expiry)):'lapsed '+_rzEscSafe(_fdFmt(c.expiry)))+'">'+(c.current?c.daysLeft+'d':'−'+c.daysOver+'d')+'</td>';
  }
  pilots.forEach(function(p){
    h+='<tr style="border-top:1px solid var(--border2)">'+
      '<td style="padding:5px 8px;font-weight:700;cursor:pointer" onclick="window.fdSetTab(\'record\');window.fdSetPilot(\''+p.id+'\')">'+_rzEscSafe(p.name)+'</td>'+
      cell(_fdValueFor(p.id,'duty_30',asOf),'duty_30')+
      cell(_fdValueFor(p.id,'flt_7',asOf),'flt_7')+
      cell(_fdValueFor(p.id,'flt_30',asOf),'flt_30')+
      currCell(p.id,'c208b')+
      currCell(p.id,'ga8')+
      '</tr>';
  });
  h+='</tbody></table></div>';
  h+='<div style="font-size:11px;color:var(--text3);padding:6px 2px">Green / amber / red track each pilot against their configured limits. Tap a name to open their record.</div></div>';
  return h;
}

// ── monthly print (controlled record) ──
window.fdPrint=function(uid,month){
  var u=(S.users||[]).find(function(x){return x.id===uid;});var nm=(u&&u.name)||'';
  var types=_fdTypeRatings(uid);var L=_fdLimits();
  var mDate=_fdDateObj(month+'-01');var y=mDate.getFullYear(),mo=mDate.getMonth();var daysIn=new Date(y,mo+1,0).getDate();
  var rows='';var totF=0,totD=0;
  for(var dd=1;dd<=daysIn;dd++){
    var ds=y+'-'+String(mo+1).padStart(2,'0')+'-'+String(dd).padStart(2,'0');var r=_fdRow(uid,ds)||{};var dh=_fdDutyHours(r);totF+=+(r.ft||0);totD+=dh;
    rows+='<tr><td>'+dd+'</td><td>'+(r.ds||'')+'</td><td>'+(r.de||'')+'</td><td class="c">'+(dh?Math.round(dh*10)/10:'')+(r.ext?'<sup>+</sup>':'')+'</td><td class="c">'+(r.ft||'')+'</td><td class="c">'+(r.lc||'')+'</td><td class="c">'+(r.lg||'')+'</td></tr>';
  }
  // rolling figures are computed as at the END of the printed period (not "today"), so a printed
  // past month shows that month's rolling totals, not the current window's.
  var _pEnd=(month<_fdMonth(_fdToday()))?(y+'-'+String(mo+1).padStart(2,'0')+'-'+String(daysIn).padStart(2,'0')):_fdToday();
  var d30=_fdValueFor(uid,'duty_30',_pEnd),f30=_fdValueFor(uid,'flt_30',_pEnd);
  var w=window.open('','_blank','width=820,height=900');if(!w){if(typeof toast==='function')toast('Allow pop-ups to print.','warn');return;}
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Flight & Duty — '+_rzEscSafe(nm)+' — '+_fdMonthLabel(month)+'</title><style>'+
    '*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:14mm;font-size:12px}'+
    'h1{font-size:15px;margin-bottom:2px}.sub{color:#555;font-size:11px;margin-bottom:10px}'+
    'table{width:100%;border-collapse:collapse;margin-bottom:10px}th,td{border:1px solid #999;padding:3px 6px;font-size:11px}th{background:#eee;text-align:center}td.c{text-align:center}'+
    '.tot{font-weight:bold;background:#f4f4f4}.sign{margin-top:24px;display:flex;gap:40px}.sign div{flex:1;border-top:1px solid #333;padding-top:4px;font-size:11px;color:#333}'+
    '.note{font-size:10px;color:#666;margin-top:8px}</style></head><body>'+
    '<h1>Flight &amp; Duty Record — '+_rzEscSafe(nm)+'</h1>'+
    '<div class="sub">Period: '+_fdMonthLabel(month)+' · Single-pilot VFR (AC119-2). Flight time = off-blocks → on-blocks.</div>'+
    '<table><thead><tr><th>Day</th><th>Duty start</th><th>Duty end</th><th>Duty h</th><th>Flight h</th><th>C208B ldg</th><th>GA8 ldg</th></tr></thead><tbody>'+rows+
    '<tr class="tot"><td colspan="3">Month totals</td><td class="c">'+(Math.round(totD*10)/10)+'</td><td class="c">'+(Math.round(totF*10)/10)+'</td><td class="c"></td><td class="c"></td></tr>'+
    '</tbody></table>'+
    '<div class="sub">Rolling at period end — Duty/30 days: '+(Math.round(d30*10)/10)+' / '+L.duty_30.val+' h · Flight/30 days: '+(Math.round(f30*10)/10)+' / '+L.flt_30.val+' h</div>'+
    '<div class="sign"><div>Pilot signature &amp; date</div></div>'+
    '<div class="note">+ = duty extended to '+FD_DUTY_EXT+'h to complete a disrupted schedule. I certify the above flight and duty times are correct and complete.</div>'+
    '<script>window.onload=function(){window.print();}<\/script></body></html>');
  w.document.close();
};

// Settings ▸ Operations ▸ Flight & Duty — editable limit values + per-limit amber/red buffers.
function renderFDLimits(){
  if(!S._fdLoaded){S._fdLoaded=true;if(window.loadFlightDuty)window.loadFlightDuty();}
  var L=_fdLimits();
  var h='<div class="card"><div class="st">Flight &amp; Duty limits</div>'+
    '<p style="font-size:12px;color:var(--text3);margin:0 0 10px">These drive the Flight &amp; Duty warnings. Defaults follow AC119-2 / your Exposition §4.8 (single-pilot VFR). <b>Confirm every value against your approved Exposition.</b> Amber/red are the % of each limit at which a warning shows.</p>'+
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:480px">'+
    '<thead><tr style="background:var(--card2)"><th style="text-align:left;padding:7px 8px;font-size:10px;color:var(--text3)">Limit</th><th style="padding:7px 6px;font-size:10px;color:var(--text3)">Value</th><th style="padding:7px 6px;font-size:10px;color:var(--text3)">Amber %</th><th style="padding:7px 6px;font-size:10px;color:var(--text3)">Red %</th></tr></thead><tbody>';
  Object.keys(L).forEach(function(key){
    var lim=L[key];
    h+='<tr style="border-top:1px solid var(--border2)">'+
      '<td style="padding:5px 8px;font-weight:600">'+_rzEscSafe(lim.lbl)+' <span style="color:var(--text3);font-weight:400">('+lim.unit+')</span></td>'+
      '<td style="padding:3px 4px;text-align:center"><input type="number" step="0.1" value="'+lim.val+'" onchange="window.fdSetLimit(\''+key+'\',\'val\',this.value)" style="width:70px;font-size:12px;padding:3px;border:1px solid var(--border2);border-radius:5px;background:var(--card);color:var(--text);text-align:center"></td>'+
      '<td style="padding:3px 4px;text-align:center"><input type="number" value="'+lim.amber+'" onchange="window.fdSetLimit(\''+key+'\',\'amber\',this.value)" style="width:56px;font-size:12px;padding:3px;border:1px solid var(--border2);border-radius:5px;background:var(--card);color:var(--text);text-align:center"></td>'+
      '<td style="padding:3px 4px;text-align:center"><input type="number" value="'+lim.red+'" onchange="window.fdSetLimit(\''+key+'\',\'red\',this.value)" style="width:56px;font-size:12px;padding:3px;border:1px solid var(--border2);border-radius:5px;background:var(--card);color:var(--text);text-align:center"></td>'+
      '</tr>';
  });
  h+='</tbody></table></div>'+
    '<div style="font-size:11px;color:var(--text3);margin-top:8px">Currency: '+FD_CURRENCY_LDG+' day landings per type in '+FD_CURRENCY_DAYS+' days · Days off: ≥2 / 14 days, ≥2 consecutive / 30 days (Part 135.803 — fixed). Disrupted-duty extension: '+FD_DUTY_EXT+'h.</div>'+
    '</div>';
  return h;
}

// Safe escape that works whether or not esc/_rzEsc is in scope at call time.
function _rzEscSafe(s){if(typeof _rzEsc==='function')return _rzEsc(s);if(typeof esc==='function')return esc(s);return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
