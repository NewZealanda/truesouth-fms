// === MODULE: startday.js === v26.74 ===
// ─────────────────────────────────────────────────────────────────────────────
//  START OF DAY — one-action morning flow + exceptions dashboard.
//  Pressing "Run start of day" pulls Rezdy bookings, runs the declared-weight
//  seatmap preview + aircraft allocation, and auto-allocates pilots. The screen
//  then surfaces ONLY the things that need a human: bookings with no aircraft,
//  aircraft over capacity, W&B / CofG fails, split groups, flights with no (or an
//  unrated) pilot, transport without drivers, and balances owing. Every row deep-
//  links to the page where you fix it. The scan is read-only and recomputes on
//  every render, so it always reflects the live state — even before you press Run.
//  Also hosts renderHomeToday() (the "today at a glance" landing) — see below.
// ─────────────────────────────────────────────────────────────────────────────

function _sodSh(ac){return String(ac||'').replace(/^ZK-?/,'');}
// Resolve a flight's pilot the SAME way the calendar does — by the flight KEY first (so a flyback,
// whose key is its held outbound slot but whose depMin is the return time, still finds its pilot),
// then fall back to the aircraft+time lookup. Matches _rzSchedPilotFor's conflict-skip behaviour.
function _sodPilotFor(f){
  if(!f)return null;var k=f.key;
  if(k){var conf=(S._schedPilotConflict||{})[k];var man=conf?null:((S._schedPilots||{})[k]);var p=man||(S._schedAutoPilots||{})[k];if(p)return p;}
  var hhmm=(typeof _rzMinToHHMM==='function')?_rzMinToHHMM(f.depMin):'';
  return (typeof _rzSchedPilotFor==='function')?_rzSchedPilotFor(f.ac,hhmm):null;
}
function _sodEsc(s){return (typeof _rzEsc==='function')?_rzEsc(s):String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function _sodDepShort(dep){var p=String(dep||'').split('·');return (p[0]||'')+(p[1]?(' '+p[1]):'');}
function _sodAcCap(ac){var a=(typeof _acSpec==='function')?_acSpec(ac):(S.aircraft||{})[ac];if(!a||!a.seats)return 0;return a.seats.length-1-(((a.removedSeats)||[]).length);}

// Scan the current operations day and return stats + a prioritised exceptions list.
// Pure read of state — never mutates. Heavily guarded so a missing helper can't break the page.
function _sodScan(){
  var date=(S&&S.rezdyDate)||'';
  var out={date:date,loaded:!!(S&&S._rezdyBookings),stats:{bookings:0,pax:{a:0,c:0,i:0},flights:0,aircraft:0},ex:[]};
  if(!out.loaded)return out;
  var ex=out.ex;
  function add(sev,cat,msg,jump,order){ex.push({sev:sev,cat:cat,msg:msg,jump:jump,order:order||null});}
  var bks=(S._rezdyBookings||[]).filter(function(b){return !(typeof _rzIsCancelled==='function'&&_rzIsCancelled(b))&&!(typeof _rzIsNoShow==='function'&&_rzIsNoShow(String(b.orderNumber||'')));});
  out.stats.bookings=bks.length;
  bks.forEach(function(b){if(typeof _rzEffBreakdown==='function'){var e=_rzEffBreakdown(b);out.stats.pax.a+=(e.a||0);out.stats.pax.c+=(e.c||0);out.stats.pax.i+=(e.i||0);}});

  // 1) Bookings with NO aircraft assigned.
  bks.forEach(function(b){
    var o=String(b.orderNumber||'');
    var ac=(typeof _rzBookingAc==='function')?_rzBookingAc(b,o):null;
    if(!ac){
      var e=(typeof _rzEffBreakdown==='function')?_rzEffBreakdown(b):{a:0,c:0,i:0};
      var dep=(typeof _rzBookingDep==='function')?_rzBookingDep(b):'';
      add('red','No aircraft',(b.customerName||o)+' · '+((e.a||0)+(e.c||0)+(e.i||0))+'p · '+((typeof _rzDepDisplay==='function')?_rzDepDisplay(dep):dep),'bookings',o);
    }
  });

  // 2) Capacity + Weight & Balance per (departure, aircraft) from the seatmap pax.
  var byDA={};
  (S._rzManPax||[]).forEach(function(p){
    if(!p.ac)return;
    var dep=(typeof _rzPaxDep==='function')?_rzPaxDep(p):'';
    var k=dep+'@@'+p.ac;var d=byDA[k]||(byDA[k]={dep:dep,ac:p.ac,seat:0,pax:0});
    d.pax++;if(!p.infantOf)d.seat++;
  });
  Object.keys(byDA).forEach(function(k){
    var d=byDA[k];var cap=_sodAcCap(d.ac);
    if(cap&&d.seat>cap)add('red','Over capacity',_sodDepShort(d.dep)+' '+_sodSh(d.ac)+' · '+d.seat+' pax in '+cap+' seats','rseatmap');
    try{
      var wb=(d.dep&&typeof _rzManAcWB==='function')?_rzManAcWB(d.dep,d.ac):null;
      if(wb){
        if(wb.towOk===false)add('red','Over MTOW',_sodDepShort(d.dep)+' '+_sodSh(d.ac)+(wb.tow?(' · TOW '+Math.round(wb.tow)+'kg'):''),'rloadsheets');
        else if(wb.cogOk===false)add('red','CofG out of limits',_sodDepShort(d.dep)+' '+_sodSh(d.ac),'rloadsheets');
        else if(wb.lwOk===false)add('amber','Over landing weight',_sodDepShort(d.dep)+' '+_sodSh(d.ac),'rloadsheets');
        if(wb.reserveOk===false)add('amber','Below fuel reserve',_sodDepShort(d.dep)+' '+_sodSh(d.ac),'rloadsheets');
      }
    }catch(e){}
  });

  // 3) Split groups — a booking's pax ended up on more than one aircraft.
  var grp={};
  (S._rzManPax||[]).forEach(function(p){if(p.infantOf||!p.ac)return;(grp[p.group]=grp[p.group]||{})[p.ac]=1;});
  Object.keys(grp).forEach(function(o){var acs=Object.keys(grp[o]);if(acs.length>1)add('amber','Group split','Booking '+o+' across '+acs.map(_sodSh).join(' + '),'rseatmap',o);});

  // 4) Pilots — flights with no pilot, or a pilot not rated for the aircraft.
  var flights=(typeof _schedDayFlights==='function')?(_schedDayFlights(date)||[]):[];
  out.stats.flights=flights.length;
  var acSet={};
  flights.forEach(function(f){
    acSet[f.ac]=1;
    var hhmm=(typeof _rzMinToHHMM==='function')?_rzMinToHHMM(f.depMin):'';
    var pc=_sodPilotFor(f);
    if(!pc)add('amber','No pilot',hhmm+' '+_sodSh(f.ac),'calendar');
    else if(typeof _pilotRatedForAc==='function'&&!_pilotRatedForAc(pc,f.ac))add('red','Pilot not rated',pc+' on '+_sodSh(f.ac)+' '+hhmm,'calendar');
  });
  out.stats.aircraft=Object.keys(acSet).length;

  // 5) Transport — there are pickups to do but no drivers assigned yet.
  var needPk=false;
  bks.forEach(function(b){(b.items||[]).forEach(function(it){if(it.pickup&&!(typeof _rzIsSelfDrive==='function'&&_rzIsSelfDrive(it.pickup)))needPk=true;});});
  var anyDriver=false;var pd=(S._pickupDrivers||{});Object.keys(pd).forEach(function(kk){if(pd[kk])anyDriver=true;});
  if(needPk&&!anyDriver)add('amber','Transport','Pickups need drivers assigned','ground');

  // 6) Balances owing.
  bks.forEach(function(b){var bal=parseFloat(b.balanceDue);if(isFinite(bal)&&bal>0)add('amber','Balance owing',(b.customerName||b.orderNumber)+' · '+((typeof _rzMoney==='function')?_rzMoney(bal,b.currency):(bal+''))+' owing','bookings',String(b.orderNumber||''));});

  // Prioritise: red before amber, then by category.
  var sevRank={red:0,amber:1};
  ex.sort(function(a,b){return (sevRank[a.sev]-sevRank[b.sev])||String(a.cat).localeCompare(String(b.cat));});
  return out;
}

// One-action morning orchestration: pull bookings → load manifest → declared-weight
// preview pull → allocate unallocated pax per departure → auto-allocate pilots.
// Each step is guarded; a failure in one step doesn't abort the rest.
window.sodRun=async function(){
  if(S._sodRunning)return;
  S._sodRunning=true;S._sodStep='Loading bookings…';render();
  try{
    try{if(window.rezdyLoadBookings)await window.rezdyLoadBookings();}catch(e){}
    S._sodStep='Loading seatmap…';
    try{if(!S._rzManLoaded&&window.rezdyLoadManifest)await window.rezdyLoadManifest();}catch(e){}
    S._sodStep='Previewing weights…';
    try{if(window.rezdyManPull)window.rezdyManPull(null,true);}catch(e){}   // whole-day declared-weight preview
    S._sodStep='Allocating aircraft…';
    try{
      var deps=(typeof _rzManDeps==='function')?(_rzManDeps()||[]):[];
      var savedFilter=S._rzManDepFilter;
      deps.forEach(function(d){S._rzManDepFilter=d;if(typeof window.rezdyManAllocate==='function')window.rezdyManAllocate();});
      S._rzManDepFilter=savedFilter;
    }catch(e){}
    S._sodStep='Allocating pilots…';
    try{if(window.schedAutoPilots&&typeof _schedEnabled==='function'&&_schedEnabled())window.schedAutoPilots();}catch(e){}
  }finally{
    // Always release the spinner, even if a step throws — otherwise the button stays disabled forever.
    S._sodRunning=false;S._sodStep='';S._sodRan=Date.now();
    if(typeof toast==='function')toast('Start-of-day complete — review anything flagged below.','ok');
    try{render();}catch(e){}
  }
};

// Deep-link from an exception row to the page that fixes it.
window.sodJump=function(target,order){
  if(order){S._rezdyOpen=S._rezdyOpen||{};S._rezdyOpen[String(order)]=true;
    var _b=(S._rezdyBookings||[]).find(function(x){return String(x.orderNumber||'')===String(order);});
    if(_b&&typeof _rzBookingDep==='function'){try{S._bkDepFilter=(typeof _rzIsCancelled==='function'&&_rzIsCancelled(_b))?'__cancelled__':_rzBookingDep(_b);}catch(e){}}
  }
  if(target==='bookings'||target==='rseatmap'||target==='rloadsheets'){
    if(typeof window.switchOpsTab==='function')window.switchOpsTab(target);else{S.section='operations';S.tab=target;render();}
  }else if(target==='calendar'){S.section='calendar';S.rezdyTab='schedule';render();}
  else if(target==='ground'){S.section='ground';S._groundSecTab='transport';render();}
  else{S.section='operations';render();}
};

function renderStartDay(){
  var scan=_sodScan();
  var date=scan.date;
  var dow=(typeof _rzDowLabel==='function')?_rzDowLabel(date):date;
  var canShift=(typeof window.rezdyShiftDate==='function');
  var h='<div class="page">';

  // Header + day nav
  h+='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px">';
  h+='<div><div class="st" style="margin:0">🌅 Start of Day</div><div style="font-size:12px;color:var(--text3);margin-top:2px">'+_sodEsc(dow)+'</div></div>';
  if(canShift)h+='<div style="display:flex;gap:6px;align-items:center">'
    +'<button class="btn btn-ghost" style="font-size:13px;padding:5px 11px" onclick="window.rezdyShiftDate(-1)">‹</button>'
    +'<button class="btn btn-ghost" style="font-size:12px;padding:5px 11px" onclick="window.rezdySetDate&&window.rezdySetDate(_todayLocal?_todayLocal():new Date().toISOString().slice(0,10))">Today</button>'
    +'<button class="btn btn-ghost" style="font-size:13px;padding:5px 11px" onclick="window.rezdyShiftDate(1)">›</button></div>';
  h+='</div>';

  // Primary action
  var running=!!S._sodRunning;
  h+='<div class="card" style="margin-bottom:12px;text-align:center;padding:18px">';
  h+='<button onclick="window.sodRun()" '+(running?'disabled ':'')+'style="display:inline-flex;align-items:center;gap:9px;padding:13px 26px;border-radius:12px;border:none;background:'+(running?'var(--card2)':'var(--acc)')+';color:#fff;font-weight:800;font-size:16px;cursor:'+(running?'default':'pointer')+'">'+(running?('⏳ '+_sodEsc(S._sodStep||'Working…')):'▶ Run start of day')+'</button>';
  h+='<div style="font-size:11.5px;color:var(--text3);margin-top:10px;max-width:440px;margin-left:auto;margin-right:auto">Pulls bookings, previews weights, allocates aircraft + pilots, then lists anything that needs attention.</div>';
  if(S._sodRan)h+='<div style="font-size:11px;color:var(--text3);margin-top:6px">Last run '+_sodEsc((typeof _rzMinToHHMM==='function'&&typeof _todayLocal==='function')?new Date(S._sodRan).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):new Date(S._sodRan).toLocaleTimeString())+'</div>';
  h+='</div>';

  if(!scan.loaded){
    h+='<div class="card" style="text-align:center;color:var(--text3);padding:28px">Bookings not loaded yet — press <b>Run start of day</b> to pull today\'s bookings.</div></div>';
    return h;
  }

  // Stats strip
  var st=scan.stats;
  function chip(lbl,val){return '<div style="flex:1;min-width:78px;text-align:center;background:var(--card2);border:1px solid var(--border2);border-radius:10px;padding:9px 6px"><div style="font-size:19px;font-weight:800;color:var(--text1)">'+val+'</div><div style="font-size:10.5px;color:var(--text3);text-transform:uppercase;letter-spacing:.03em">'+lbl+'</div></div>';}
  var paxTot=st.pax.a+st.pax.c+st.pax.i;
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">';
  h+=chip('Bookings',st.bookings);
  h+=chip('Pax',paxTot+(st.pax.i?(' +'+st.pax.i+'i'):''));
  h+=chip('Flights',st.flights);
  h+=chip('Aircraft',st.aircraft);
  h+='</div>';

  // Exceptions
  var ex=scan.ex;
  if(!ex.length){
    h+='<div class="card" style="text-align:center;padding:30px;border-left:4px solid #22c55e"><div style="font-size:34px">✅</div><div class="st" style="margin:8px 0 2px">All clear</div><div style="font-size:12.5px;color:var(--text3)">Nothing needs attention for '+_sodEsc(dow)+'.</div></div>';
  }else{
    var reds=ex.filter(function(e){return e.sev==='red';}).length;
    var ambers=ex.length-reds;
    h+='<div style="font-size:13px;font-weight:800;color:var(--text1);margin-bottom:8px">'+ex.length+' need'+(ex.length===1?'s':'')+' attention'
      +(reds?'  <span style="color:#ef4444">● '+reds+' critical</span>':'')
      +(ambers?'  <span style="color:#f59e0b">● '+ambers+' check</span>':'')+'</div>';
    ex.forEach(function(e){
      var col=e.sev==='red'?'#ef4444':'#f59e0b';
      h+='<div onclick="window.sodJump(\''+e.jump+'\''+(e.order?(',\''+_sodEsc(String(e.order)).replace(/'/g,"\\'")+'\''):'')+')" style="cursor:pointer;display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--border2);border-left:4px solid '+col+';border-radius:10px;padding:10px 12px;margin-bottom:7px">';
      h+='<span style="flex-shrink:0;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:'+col+';background:'+(e.sev==='red'?'rgba(239,68,68,.12)':'rgba(245,158,11,.12)')+';padding:3px 8px;border-radius:999px;white-space:nowrap">'+_sodEsc(e.cat)+'</span>';
      h+='<span style="flex:1;font-size:13px;color:var(--text1)">'+_sodEsc(e.msg)+'</span>';
      h+='<span style="flex-shrink:0;color:var(--text3);font-size:13px">›</span>';
      h+='</div>';
    });
  }

  h+='</div>';
  return h;
}

// ─────────────────────────────────────────────────────────────────────────────
//  TODAY AT A GLANCE — the landing dashboard. Read-only snapshot of the day:
//  the departures board (time · dest · aircraft · pax · pilot), headline counts,
//  an attention banner that links to Start of Day, transport + money summary, and
//  quick links into the rest of the app. Recomputes on every render.
// ─────────────────────────────────────────────────────────────────────────────

function _todayFlights(date){
  var flights=((typeof _schedDayFlights==='function')?(_schedDayFlights(date)||[]):[]).map(function(f){
    var parts=String(f.key||'').split('|');
    var dest=(typeof _rzGroupDest==='function')?_rzGroupDest(parts[2]||''):(parts[2]||'');
    var orders=(typeof _rzOrdersForBlockKey==='function')?(_rzOrdersForBlockKey(f.key)||[]):[];
    var a=0,c=0,i=0;
    orders.forEach(function(o){var b=(S._rezdyBookings||[]).find(function(x){return String(x.orderNumber||'')===String(o);});if(b&&typeof _rzEffBreakdown==='function'){var e=_rzEffBreakdown(b);a+=(e.a||0);c+=(e.c||0);i+=(e.i||0);}});
    var hhmm=(typeof _rzMinToHHMM==='function')?_rzMinToHHMM(f.depMin):'';
    var pilot=_sodPilotFor(f);
    return {ac:f.ac,dest:dest,depMin:f.depMin,hhmm:hhmm,end:(typeof _rzMinToHHMM==='function')?_rzMinToHHMM(f.endMin):'',a:a,c:c,i:i,pax:a+c+i,pilot:pilot};
  }).sort(function(a,b){return a.depMin-b.depMin;});
  return flights;
}

window.todayNav=function(sec,tab){
  if(sec==='operations'){if(typeof window.switchOpsTab==='function'){window.switchOpsTab(tab||'bookings');return;}S.section='operations';S.tab=tab||'bookings';render();return;}
  if(sec==='ground'){S.section='ground';S._groundSecTab='transport';render();return;}
  if(sec==='calendar'){S.section='calendar';S.rezdyTab='schedule';render();return;}
  S.section=sec;render();
};

function renderHomeToday(){
  var date=(S&&S.rezdyDate)||'';
  var dow=(typeof _rzDowLabel==='function')?_rzDowLabel(date):date;
  var scan=_sodScan();
  var flights=_todayFlights(date);
  var hr=new Date().getHours();
  var greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  var who=(S.user&&(S.user.name||S.user.firstName))?(', '+String(S.user.name||S.user.firstName).split(' ')[0]):'';
  var canShift=(typeof window.rezdyShiftDate==='function');
  var acCol=(typeof _rzAcCol==='function')?_rzAcCol:function(){return 'var(--text2)';};
  var h='<div class="page">';

  // Header
  h+='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px">';
  h+='<div><div class="st" style="margin:0">'+_sodEsc(greet)+_sodEsc(who)+'</div><div style="font-size:12px;color:var(--text3);margin-top:2px">'+_sodEsc(dow)+'</div></div>';
  if(canShift)h+='<div style="display:flex;gap:6px;align-items:center">'
    +'<button class="btn btn-ghost" style="font-size:13px;padding:5px 11px" onclick="window.rezdyShiftDate(-1)">‹</button>'
    +'<button class="btn btn-ghost" style="font-size:13px;padding:5px 11px" onclick="window.rezdyShiftDate(1)">›</button></div>';
  h+='</div>';

  // Attention banner — tap to expand the live exceptions list inline (deep-links to the fix page).
  if(!scan.loaded){
    h+='<div style="background:var(--card);border:1px solid var(--border2);border-left:4px solid #60a5fa;border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:13px;color:var(--text1)">Bookings not loaded yet for today — open Bookings to pull them.</div>';
  }else if(scan.ex.length){
    var reds=scan.ex.filter(function(e){return e.sev==='red';}).length;
    var col=reds?'#ef4444':'#f59e0b';var _exOpen=!!S._todayExOpen;
    h+='<div onclick="S._todayExOpen=!S._todayExOpen;render()" style="cursor:pointer;background:var(--card);border:1px solid var(--border2);border-left:4px solid '+col+';border-radius:10px;padding:12px 14px;margin-bottom:'+(_exOpen?'7px':'12px')+';display:flex;align-items:center;justify-content:space-between">'
      +'<span style="font-size:13px;color:var(--text1)"><b>'+scan.ex.length+'</b> item'+(scan.ex.length===1?'':'s')+' need attention'+(reds?' · <span style="color:#ef4444;font-weight:700">'+reds+' critical</span>':'')+'</span><span style="color:var(--text3);font-size:12px">'+(_exOpen?'Hide ▲':'Show ▼')+'</span></div>';
    if(_exOpen){
      h+='<div style="margin-bottom:12px">';
      scan.ex.forEach(function(e){
        var ec=e.sev==='red'?'#ef4444':'#f59e0b';
        h+='<div onclick="window.sodJump(\''+e.jump+'\''+(e.order?(',\''+_sodEsc(String(e.order)).replace(/'/g,"\\'")+'\''):'')+')" style="cursor:pointer;display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--border2);border-left:4px solid '+ec+';border-radius:10px;padding:9px 12px;margin-bottom:6px">'
          +'<span style="flex-shrink:0;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:'+ec+';background:'+(e.sev==='red'?'rgba(239,68,68,.12)':'rgba(245,158,11,.12)')+';padding:3px 8px;border-radius:999px;white-space:nowrap">'+_sodEsc(e.cat)+'</span>'
          +'<span style="flex:1;font-size:13px;color:var(--text1)">'+_sodEsc(e.msg)+'</span><span style="flex-shrink:0;color:var(--text3);font-size:13px">›</span></div>';
      });
      h+='</div>';
    }
  }else{
    h+='<div style="background:var(--card);border:1px solid var(--border2);border-left:4px solid #22c55e;border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:13px;color:var(--text1)">✅ All set for today — nothing flagged.</div>';
  }

  // Headline counts
  var st=scan.stats;var paxTot=st.pax.a+st.pax.c+st.pax.i;
  function chip(lbl,val){return '<div style="flex:1;min-width:74px;text-align:center;background:var(--card2);border:1px solid var(--border2);border-radius:10px;padding:9px 6px"><div style="font-size:19px;font-weight:800;color:var(--text1)">'+val+'</div><div style="font-size:10.5px;color:var(--text3);text-transform:uppercase;letter-spacing:.03em">'+lbl+'</div></div>';}
  var paxSplit=st.pax.a+'A'+(st.pax.c?' '+st.pax.c+'C':'')+(st.pax.i?' '+st.pax.i+'i':'');
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+chip('Flights',flights.length)+chip('Pax','<span style="font-size:15px">'+_sodEsc(paxSplit)+'</span>')+chip('Aircraft',st.aircraft)+chip('Bookings',st.bookings)+'</div>';

  // Departures board
  h+='<div class="card" style="margin-bottom:12px"><div class="st" style="margin-bottom:8px">Departures</div>';
  if(!flights.length){
    h+='<div style="font-size:13px;color:var(--text3);text-align:center;padding:16px 0">No flights scheduled'+(scan.loaded?'':' — load bookings in Start of Day')+'.</div>';
  }else{
    flights.forEach(function(f){
      var coPilot=(typeof _rzSchedCoPilotFor==='function')?_rzSchedCoPilotFor(f.ac,f.hhmm):null;
      var pilotH=f.pilot?('<span style="font-weight:700;color:var(--text1)">'+_sodEsc(f.pilot)+(coPilot?'<span style="color:#818cf8;font-weight:700">+'+_sodEsc(coPilot)+'</span>':'')+'</span>'):'<span style="color:#f59e0b">no pilot</span>';
      // Pax split by type, the same A/C/i breakdown shown on the aircraft/seatmap (e.g. "5A 2C 1i").
      var paxH=(typeof _rzBdCompact==='function')?_rzBdCompact({a:f.a,c:f.c,i:f.i}).replace(/([A-Za-z])(\d)/g,'$1 $2'):(f.a+'A'+(f.c?' '+f.c+'C':'')+(f.i?' '+f.i+'i':''));
      h+='<div onclick="window.todayNav(\'calendar\')" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border2)">'
        +'<div style="width:46px;font-weight:800;font-size:14px;color:var(--text1)">'+_sodEsc(f.hhmm)+'</div>'
        +'<span style="display:inline-block;border:1.5px solid '+acCol(f.ac)+';color:'+acCol(f.ac)+';border-radius:9px;padding:1px 7px;font-weight:bold;font-size:10.5px;white-space:nowrap">'+_sodEsc(_sodSh(f.ac))+'</span>'
        +'<span style="flex:1;font-size:12.5px;color:var(--text2)">'+_sodEsc(f.dest||'')+' · <b style="color:var(--text1);font-weight:700">'+_sodEsc(paxH)+'</b></span>'
        +'<span style="font-size:12px">'+pilotH+'</span>'
        +'</div>';
    });
  }
  h+='</div>';

  // Transport — quick rundown of who's driving which vehicle (drivers stored per vi|dep).
  var _drvBy={};var _pd=S._pickupDrivers||{};
  Object.keys(_pd).forEach(function(k){var d=(_pd[k]==null?'':String(_pd[k])).trim();if(!d)return;var vi=parseInt(String(k).split('|')[0],10);if(isNaN(vi))return;var nm=(typeof _rzVehName==='function')?_rzVehName(vi):('Van '+(vi+1));(_drvBy[nm]=_drvBy[nm]||{})[d]=1;});
  var _vehNames=Object.keys(_drvBy).sort();
  h+='<div onclick="window.todayNav(\'ground\')" style="cursor:pointer;background:var(--card);border:1px solid var(--border2);border-radius:10px;padding:11px 13px;margin-bottom:12px">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.03em">Transport · drivers</div><span style="color:var(--text3);font-size:12px">Pickups & vans ›</span></div>';
  if(_vehNames.length){
    h+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">';
    _vehNames.forEach(function(nm){var ds=Object.keys(_drvBy[nm]).join(', ');h+='<span style="font-size:12px;font-weight:700;color:var(--text1);background:var(--card2);border:1px solid var(--border2);border-radius:999px;padding:3px 11px">🚐 '+_sodEsc(nm)+' · <span style="color:var(--text2);font-weight:600">'+_sodEsc(ds)+'</span></span>';});
    h+='</div>';
  }else{
    h+='<div style="font-size:12.5px;color:var(--text3);margin-top:6px">No drivers assigned yet — tap to set up transport.</div>';
  }
  h+='</div>';
  // Money summary (balances owing).
  var owe=0,oweN=0;(S._rezdyBookings||[]).forEach(function(b){if(typeof _rzIsCancelled==='function'&&_rzIsCancelled(b))return;var bal=parseFloat(b.balanceDue);if(isFinite(bal)&&bal>0){owe+=bal;oweN++;}});
  if(oweN)h+='<div onclick="window.todayNav(\'operations\',\'bookings\')" style="cursor:pointer;background:var(--card);border:1px solid var(--border2);border-left:4px solid #f59e0b;border-radius:10px;padding:11px 13px;margin-bottom:12px"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.03em">Owing</div><div style="font-size:14px;font-weight:700;color:var(--text1);margin-top:2px">'+_sodEsc((typeof _rzMoney==='function')?_rzMoney(owe,'NZD'):('$'+Math.round(owe)))+' · '+oweN+' booking'+(oweN===1?'':'s')+' ›</div></div>';

  // Quick links
  h+='<div class="st" style="margin-bottom:8px">Jump to</div><div style="display:flex;gap:8px;flex-wrap:wrap">';
  function ql(lbl,icon,onclick){return '<button onclick="'+onclick+'" class="btn btn-ghost" style="flex:1;min-width:104px;padding:11px 8px;font-size:13px;display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-size:18px">'+icon+'</span>'+lbl+'</button>';}
  h+=ql('Bookings','📋',"window.todayNav('operations','bookings')");
  h+=ql('Seatmap','💺',"window.todayNav('operations','rseatmap')");
  h+=ql('Calendar','📅',"window.todayNav('calendar')");
  h+=ql('Transport','🚐',"window.todayNav('ground')");
  if(typeof hasRolePerm==='function'&&hasRolePerm('roster'))h+=ql('Roster','🗓️',"S.section='roster';render()");
  h+='</div>';

  h+='</div>';
  return h;
}
