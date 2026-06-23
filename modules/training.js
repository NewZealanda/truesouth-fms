// === MODULE: training.js === v25.40 ===
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
    {title:'Ground · Transport',section:'operations',tab:'ground',groundTab:'pickups',body:'Passenger pickups and return drop-offs, grouped by departure, assigned to vans and drivers. Drivers mark people collected / dropped off and acknowledge their run.'},
    {title:'Maintenance',section:'maintenance',maintTab:'overview',body:'Aircraft hours and TTIS, upcoming checks, and maintenance bookings. A booking here blocks the aircraft and even creates its ferry-to-Wanaka blocks on the calendar.'},
    {title:'Roster & Leave',section:'roster',body:'Who\'s working each day. Leave requests and approvals live alongside it, and rostered pilots feed the scheduling tools.'},
    {title:'That\'s the tour',body:'You\'ve seen the main areas. Your day-to-day depends on your role — try the Desk/Operations or Pilot module next for the step-by-step. You can reopen Training any time from the menu.'}
  ]},
  ops:{label:'Desk / Operations',icon:'🎧',desc:'The everyday flow for desk and operations staff, start of day to dispatch.',steps:[
    {title:'Start of day · Bookings',section:'operations',tab:'bookings',body:'Open Operations ▸ Bookings. This is your worklist for the day. Confirm numbers, watch for the "$ TO PAY" and lunch flags, and add an internal note on any booking that needs one.'},
    {title:'Checking passengers in',section:'operations',tab:'bookings',body:'Tap "Checked in" on a booking to enter names and actual weights. Use Wx if a passenger called about weather, and No-show to exclude someone who didn\'t turn up (it drops them from pickups and the seatmap).'},
    {title:'Seat them',section:'operations',tab:'rseatmap',body:'On the Seatmap, drag each booking\'s passengers onto seats for their aircraft. Set the PIC. Everything you place here builds the loadsheet.'},
    {title:'Loadsheet & sign-off',section:'operations',tab:'rloadsheets',body:'Check the weight & balance and fuel. If it flags below reserve, fix it before you push. The pilot signs the loadsheet — then it can be archived.'},
    {title:'Transport',section:'operations',tab:'ground',groundTab:'pickups',body:'Allocate pickups (and the matching return drop-offs) to vans and drivers. Re-order stops, assign drivers, and they\'ll get their run on My Pickups.'},
    {title:'Calendar',section:'calendar',body:'Use the Calendar to see the day\'s shape and to assign aircraft and pilots to flights (drag a pilot onto a block, or tap a block and pick one).'},
    {title:'Resource board',section:'resources',body:'If cost-aware scheduling is on, the Resource board shows aircraft availability and a recommended day plan — the cheapest aircraft mix, pilots needed, and any call-in decision.'},
    {title:'You\'re set',body:'That\'s the core desk flow: Bookings → check-in → Seatmap → Loadsheet → Transport, with the Calendar and Resource board to plan. Ask any time — and revisit this from the menu.'}
  ]},
  pilot:{label:'Pilot',icon:'🧑‍✈️',desc:'What pilots use day to day: loadsheets, flight records, logbook and currency.',steps:[
    {title:'Your loadsheet',section:'operations',tab:'rloadsheets',body:'Before each flight, check your loadsheet: passenger and bag weights, fuel and burn, and the weight & balance. It won\'t let you sign below reserve. Sign it when you\'re happy.'},
    {title:'Seatmap & PIC',section:'operations',tab:'rseatmap',body:'Confirm you\'re set as PIC on your aircraft and that the seated passengers and weights match what you\'re carrying.'},
    {title:'Flight Record',section:'flightrecord',body:'Log each flight here — off/on blocks, airframe hours (TTIS), product, route and POB. The last PIC reviews the day and uploads it to the aircraft\'s maintenance hours.'},
    {title:'Your Logbook',section:'logbook',body:'Your personal logbook builds automatically from the flights you fly — date, type, registration, route and flight time. Tap a row to adjust it.'},
    {title:'Flight & Duty',section:'flightduty',body:'Your flight-and-duty and currency tracker (NZ rules): rolling flight/duty hours, days off, and 90-day type currency. Print and sign your month to make it a controlled record.'},
    {title:'All yours',body:'Loadsheet → fly → flight record → logbook, with Flight & Duty keeping you current. Reopen this module any time from the menu.'}
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

// ── Training landing page (module picker) ──────────────────────────────────────
function renderTraining(){
  if(!S.user)return '<div class="page"><div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div></div>';
  var h='<div class="page">';
  h+='<div class="card"><div class="st" style="margin-bottom:2px">Training</div>'+
    '<p style="font-size:13px;color:var(--text3);margin:0">Pick a module and I\'ll walk you through the real screens, one step at a time. Use it as often as you like.</p></div>';
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
