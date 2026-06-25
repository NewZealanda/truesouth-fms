// === MODULE: training.js === v26.15 ===
// ─────────────────────────────────────────────────────────────────────────────
//  TRAINING — in-app guided tour. Role-based modules (New hire overview, Desk/Ops,
//  Pilot) walk a trainee through the real screens: each step auto-navigates to the
//  relevant area and a fixed "coach" card explains it, with Back / Next / Exit.
//  The screen behind stays live so staff can look and follow along. Session-only
//  (S._train), no persistence, no quiz — purely instructional.
// ─────────────────────────────────────────────────────────────────────────────

function _trainEsc(s){if(typeof _rzEsc==='function')return _rzEsc(s);return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// nav fields on a step: section + optional sub-tab vars (tab / maintTab / groundTab / adminSection).
var TRAIN_MODULES={
  newhire:{label:'New here — full overview',icon:'🧭',desc:'A tour of every part of the app so you know what each area does and where to find it.',steps:[
    {title:'Welcome to TrueSouth FMS',body:'This is the system we run the whole operation on — bookings, loadsheets, the calendar, pickups, maintenance, rosters and more. I\'ll walk you through each area. Use Next to move on, Back to revisit, or Exit any time.'},
    {title:'Operations · Bookings',section:'operations',tab:'bookings',body:'The day\'s flights and passengers live here, pulled from Rezdy. You check passengers in, capture weights, flag children/infants, and mark no-shows. Each card is one booking.'},
    {title:'Operations · Seatmap',section:'operations',tab:'rseatmap',body:'Drag passengers onto seats for each aircraft. The pilot (PIC) and weights flow through to the loadsheet. An aircraft can appear twice if it flies a departure twice.'},
    {title:'Operations · Loadsheets',section:'operations',tab:'rloadsheets',body:'The weight & balance for each flight: seat weights, bags, fuel and burn. It warns if you\'re below reserve, and the PIC signs it before the flight.'},
    {title:'Calendar',section:'calendar',body:'The whole day at a glance — aircraft down the columns, time down the side. You can switch to "Aircraft movements" to see each leg (including ferries).'},
    {title:'Ground · Transport',section:'ground',groundSecTab:'transport',body:'Passenger pickups and return drop-offs, grouped by departure, assigned to vans and drivers. Drivers mark people collected / dropped off and acknowledge their run.'},
    {title:'Maintenance',section:'maintenance',maintTab:'overview',body:'Aircraft hours and TTIS, upcoming checks, and maintenance bookings. A booking here blocks the aircraft and even creates its ferry-to-Wanaka blocks on the calendar.'},
    {title:'Roster & Leave',section:'roster',body:'Who\'s working each day. Leave requests and approvals live alongside it, and rostered pilots feed the scheduling tools.'},
    {title:'That\'s the tour',body:'You\'ve seen the main areas. Your day-to-day depends on your role — try the Desk/Operations or Pilot module next for the step-by-step. You can reopen Training any time from the menu.'}
  ]},
  ops:{label:'Desk / Operations',icon:'🎧',desc:'The everyday desk flow — from the booking through weather calls, check-in and onto the seatmap.',steps:[
    {title:'Bookings — the order',section:'operations',tab:'bookings',body:'Operations ▸ Bookings is the day\'s orders. Each card is a booking. Watch the "$ TO PAY" and lunch flags, and add an internal note on any booking that needs one.'},
    {title:'Weather calls (Wx)',section:'operations',tab:'bookings',body:'When a passenger phones about the weather, tap Wx on their booking to record that they\'ve contacted us. That lets you see who HASN\'T called and ring them to confirm or cancel their flight due to weather.'},
    {title:'Transport (ground staff)',section:'ground',groundSecTab:'transport',body:'Transport is generated from the bookings — it\'s us picking passengers up to bring them in to check in. Day to day this is run by the ground staff on the Transport board (vans, drivers, pickups & drop-offs).'},
    {title:'Check passengers in',section:'operations',tab:'bookings',body:'When passengers arrive at the office, tap "Checked in" to enter names and actual weights, and hand out their lunch passes and lanyards for the aircraft they\'re flying on.'},
    {title:'No-shows',section:'operations',tab:'bookings',body:'No-show means a passenger didn\'t turn up for their pickup — the driver or desk marks them No-show, which drops them from the run and the seatmap push.'},
    {title:'Close check-in → push to seatmap',section:'operations',tab:'bookings',body:'When you\'re ready to close check-in, close it (you can close with the no-shows) and it pushes everyone onto the seatmap.'},
    {title:'Seatmap — seat everyone',section:'operations',tab:'rseatmap',body:'Everyone lands on the Seatmap. Auto-allocate if they aren\'t already on an aircraft, or drag and drop to the right seats — adjusting for centre of gravity (C of G) and MAUW where needed.'},
    {title:'That\'s the desk flow',body:'Booking → Wx (weather calls) → check-in (lunch passes + lanyards) → close & push → seatmap. Transport/pickups are handled by ground staff, and the pilot signs the loadsheet. Reopen this any time from the 🎓 menu.'}
  ]},
  pilot:{label:'Pilot',icon:'🧑‍✈️',desc:'What pilots use day to day: loadsheet, flight record, logbook and currency.',steps:[
    {title:'Your loadsheet',section:'operations',tab:'rloadsheets',body:'Check your loadsheet — passenger and bag weights, fuel and burn, and the weight & balance. It won\'t let you sign below reserve. Sign it when you\'re happy, then load the aircraft accordingly. (No need to touch the allocator seatmap — your loadsheet is all you need.)'},
    {title:'Flight Record — log each flight',section:'flightrecord',body:'Your flight is auto-populated and it\'s pretty intuitive. When you\'re about to taxi, check the selected flight details are correct and tap Off Blocks. Fly your flight, then tap On Blocks and make sure all the data is right. Add any notes. Keep logging your flights like this through the day.'},
    {title:'End of day — submit',section:'flightrecord',body:'When the day\'s done, submit all your flights. That updates the aircraft\'s maintenance hours and your Flight & Duty — and each flight also drops into your personal logbook automatically.'},
    {title:'Your Logbook',section:'logbook',body:'Your personal logbook builds itself from the flights you log — date, type, registration, route and flight time. Tap a row if you ever need to adjust it.'},
    {title:'Flight & Duty',section:'flightduty',body:'Your flight-and-duty and currency tracker (NZ rules): rolling flight/duty hours, days off, and 90-day type currency. Print and sign your month to make it a controlled record.'},
    {title:'All yours',body:'Loadsheet → sign → load → log each flight (off/on blocks) → submit at end of day. That feeds maintenance, Flight & Duty and your logbook. Reopen this any time from the 🎓 menu.'}
  ]}
};

function _trainMod(){return TRAIN_MODULES[(S._train&&S._train.mod)]||null;}
function _trainStep(){var m=_trainMod();return (m&&m.steps[(S._train&&S._train.idx)||0])||null;}
// Navigate to a step's screen (only if the trainee's role can reach it — else just explain in place).
function _trainNav(step){
  if(!step)return;
  if(step.section){
    var ok=(typeof _sectionAllowed!=='function')||_sectionAllowed(step.section);
    if(ok){
      if(step.tab!=null)S.tab=step.tab;
      if(step.maintTab!=null)S.maintTab=step.maintTab;
      if(step.groundTab!=null)S._groundTab=step.groundTab;
      if(step.groundSecTab!=null)S._groundSecTab=step.groundSecTab;
      if(step.adminSection!=null){S.admin=S.admin||{};S.admin.section=step.adminSection;}
      S.section=step.section;
    }
  }
  if(typeof render==='function')render();
}
window.trainStart=function(mod){if(!TRAIN_MODULES[mod])return;S._train={mod:mod,idx:0};_trainNav(_trainStep());};
window.trainNext=function(){if(!S._train)return;var m=_trainMod();if(!m)return;if(S._train.idx>=m.steps.length-1){window.trainExit(true);return;}S._train.idx++;_trainNav(_trainStep());};
window.trainBack=function(){if(!S._train)return;if(S._train.idx<=0)return;S._train.idx--;_trainNav(_trainStep());};
window.trainExit=function(done){S._train=null;if(done&&typeof toast==='function')toast('Training complete ✓','ok');if(typeof render==='function')render();};

// ── Tips & Tricks — hidden shortcuts / sneaky features people might not know about ──────────────
var _TRAIN_TIPS=[
  {icon:'👆',title:'Quad-tap to your Flight Record',body:'Tap any blank space on the screen four times quickly and you jump straight to your Flight Record — handy in the aircraft. Taps on buttons, fields or cards don\'t count, only empty space.'},
  {icon:'⬅➡',title:'Arrow keys cycle the tabs',body:'On a keyboard, ← and → flip through the tier-2 tabs of the section you\'re in: Operations cycles Calendar ↔ Bookings ↔ Seatmap ↔ Loadsheets ↔ Saved, and Maintenance flips its tabs. (The Roster shifts a week.) To change the DAY, hold ⌘/Ctrl — see below.'},
  {icon:'⌘',title:'⌘ / Ctrl + arrows change the day',body:'Hold ⌘ (Mac) or Ctrl (Windows) with ← / → to step the DATE one day at a time on Calendar, Bookings, Seatmap, Loadsheets and Ground — the same as the ◁ ▷ buttons.'},
  {icon:'👉',title:'Swipe to switch tabs (phone)',body:'On a phone, a firm sideways swipe cycles the Operations sub-tabs (Calendar, Bookings, Seatmap, Loadsheets, Saved). Swipe left for the next one, right to go back. Use the ◁ ▷ buttons to change the day.'},
  {icon:'🗓',title:'Drag calendar blocks',body:'On the Calendar, drag a flight block\'s TOP edge to set its departure, its BOTTOM edge to set the return, or grab the MIDDLE to move it — drop it on another aircraft\'s column to reassign. A single tap just opens it.'},
  {icon:'🧑‍✈',title:'Hold a pilot on the ground',body:'In Pilot movements, tap a pilot\'s ＋ to add an all-day note/meeting and the allocator will keep them off the aircraft.'},
  {icon:'🏠',title:'Set your start page',body:'Tap your name (top-right) and choose which page the app opens to, so you always land on Bookings, the Calendar, your Flight Record — whatever you use most.'},
  {icon:'🎒',title:'Everything pilot in one place',body:'Flight Record, Logbooks and Flight & Duty all live together under Pilot Bag in the menu.'},
  {icon:'📶',title:'Logs survive no reception',body:'Logs save on your device the instant you tap Off Blocks / On Blocks — whether you start in coverage or already out of range. They upload themselves automatically once you\'re back in range.'},
  {icon:'⏭',title:'Skip the intro',body:'The mountains-and-plane loading animation has a Skip button in the corner when you\'re in a hurry.'}
];
window.trainTipsOpen=function(){S._trainTips=true;render();};
window.trainTipsClose=function(){S._trainTips=false;render();};
function _renderTrainTips(){
  var h='<div class="page">';
  h+='<div class="card" style="display:flex;align-items:center;gap:10px">'+
    '<button onclick="window.trainTipsClose()" style="padding:7px 13px;border-radius:9px;border:1px solid var(--border2);background:transparent;color:var(--text2);font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0">‹ Back</button>'+
    '<div><div class="st" style="margin-bottom:2px">💡 Tips &amp; Tricks</div>'+
    '<p style="font-size:13px;color:var(--text3);margin:0">Little shortcuts and hidden features that make the app quicker once you know them.</p></div></div>';
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">';
  _TRAIN_TIPS.forEach(function(t){
    h+='<div class="card" style="margin:0;display:flex;gap:12px;align-items:flex-start">'+
      '<div style="font-size:24px;flex-shrink:0;line-height:1.2">'+t.icon+'</div>'+
      '<div><div style="font-size:14px;font-weight:800;color:var(--text1);margin-bottom:3px">'+_trainEsc(t.title)+'</div>'+
      '<div style="font-size:12.5px;color:var(--text3);line-height:1.55">'+_trainEsc(t.body)+'</div></div>'+
    '</div>';
  });
  h+='</div></div>';
  return h;
}
// ── Training landing page (module picker) ──────────────────────────────────────
function renderTraining(){
  if(!S.user)return '<div class="page"><div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div></div>';
  if(S._trainTips)return _renderTrainTips();
  var h='<div class="page">';
  h+='<div class="card"><div class="st" style="margin-bottom:2px">Training</div>'+
    '<p style="font-size:13px;color:var(--text3);margin:0">Pick a module and I\'ll walk you through the real screens, one step at a time. Use it as often as you like.</p></div>';
  // Tips & Tricks — sneaky features / shortcuts.
  h+='<div class="card" onclick="window.trainTipsOpen()" style="cursor:pointer;display:flex;align-items:center;gap:12px;border:1px solid rgba(124,58,237,.35)">'+
    '<div style="font-size:26px;flex-shrink:0">💡</div>'+
    '<div style="flex:1"><div style="font-size:15px;font-weight:800;color:var(--text1)">Tips &amp; Tricks</div>'+
    '<div style="font-size:12px;color:var(--text3)">Hidden shortcuts &amp; sneaky features — quad-tap, arrow keys, swipes and more.</div></div>'+
    '<div style="font-size:20px;color:var(--text3)">›</div></div>';
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">';
  Object.keys(TRAIN_MODULES).forEach(function(k){var m=TRAIN_MODULES[k];
    h+='<div class="card" style="margin:0;display:flex;flex-direction:column;gap:8px">'+
      '<div style="font-size:30px">'+m.icon+'</div>'+
      '<div style="font-size:16px;font-weight:800;color:var(--text1)">'+_trainEsc(m.label)+'</div>'+
      '<div style="font-size:12px;color:var(--text3);flex:1">'+_trainEsc(m.desc)+'</div>'+
      '<div style="font-size:11px;color:var(--text3)">'+m.steps.length+' steps</div>'+
      '<button onclick="window.trainStart(\''+k+'\')" style="margin-top:2px;padding:8px 14px;border-radius:9px;border:none;background:var(--acc,#7c3aed);color:#fff;font-size:13px;font-weight:700;cursor:pointer">▶ Start</button>'+
    '</div>';
  });
  h+='</div></div>';
  return h;
}

// ── Coach card (fixed; rendered by renderApp whenever a tour is running) ────────
function renderTrainCoach(){
  if(!S._train)return '';
  var m=_trainMod();var step=_trainStep();if(!m||!step)return '';
  var i=S._train.idx,n=m.steps.length;var pct=Math.round(((i+1)/n)*100);
  var first=(i<=0),last=(i>=n-1);
  return '<div style="position:fixed;left:0;right:0;bottom:0;z-index:9000;display:flex;justify-content:center;pointer-events:none">'+
    '<div style="pointer-events:auto;width:min(680px,calc(100% - 20px));margin:0 10px 12px;background:var(--card,#fff);border:1px solid var(--border);border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.28);overflow:hidden">'+
      '<div style="height:3px;background:var(--border2)"><div style="height:3px;width:'+pct+'%;background:#7c3aed;transition:width .2s"></div></div>'+
      '<div style="padding:12px 14px">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">'+
          '<span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#7c3aed">'+m.icon+' '+_trainEsc(m.label)+' · '+(i+1)+'/'+n+'</span>'+
          '<button onclick="window.trainExit()" style="font-size:12px;color:var(--text3);background:transparent;border:none;cursor:pointer;font-weight:700">✕ Exit</button>'+
        '</div>'+
        '<div style="font-size:16px;font-weight:800;color:var(--text1);margin-bottom:4px">'+_trainEsc(step.title)+'</div>'+
        '<div style="font-size:13px;color:var(--text2);line-height:1.5">'+_trainEsc(step.body)+'</div>'+
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">'+
          '<button onclick="window.trainBack()"'+(first?' disabled':'')+' style="padding:7px 14px;border-radius:9px;border:1px solid var(--border2);background:transparent;color:var(--text2);font-size:13px;font-weight:700;cursor:'+(first?'default':'pointer')+';opacity:'+(first?'.4':'1')+'">‹ Back</button>'+
          '<button onclick="window.trainNext()" style="padding:7px 16px;border-radius:9px;border:none;background:#7c3aed;color:#fff;font-size:13px;font-weight:800;cursor:pointer">'+(last?'Finish ✓':'Next ›')+'</button>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>';
}
