// ─────────────────────────────────────────────────────────────────────────────
//  TSF BUSINESS PLAN  (admin / superadmin — gated by the 'businessplan' permission)
//  v1: the "Main Plan" acquisition-finance model, fully interactive (edit inputs → interest,
//  monthly/annual repayments and totals recompute live). Persisted to ts_settings key
//  'business_plan'. The other workbook sheets (loan schedules, FY budgets, P&Ls, running costs)
//  are scaffolded as tabs and will be built out once the formulas are confirmed.
// ─────────────────────────────────────────────────────────────────────────────

// Defaults seeded from "TSF Business Plan.xlsx → Main Plan" (Scenario 1).
var BIZ_DEFAULT={
  tranches:[
    {name:'Bank Finance',   amount:8003000, rate:6.68, type:'io', term:10},
    {name:'Bank Finance 2', amount:1000000, rate:6.68, type:'io', term:10},
    {name:'Vendor Finance', amount:1000000, rate:10.0, type:'io', term:2},
    {name:'Deposit',        amount:1200000, rate:10.0, type:'pi', term:7}
  ],
  assets:[
    {name:'VVL1377', value:607161.11},
    {name:'VVL1379', value:922208.85},
    {name:'K12583',  value:4712780.52},
    {name:'K12584',  value:3355408.13}
  ],
  notes:'Interest only for the portion of vendor finance — this would be paid down over 2 years and that number decreases yearly.',
  // Loan schedules (KBC / SHD / Vendor). ioMonths = interest-only months at the start; paydowns =
  // lump-sum payments {date,amount} applied to the balance (the schedule re-amortises after each).
  loans:[
    {id:'kbc1',name:'Kiwibank Loan 1',principal:8003000,rate:6.68,term:10,start:'2025-06-01',ioMonths:3,paydowns:[]},
    {id:'kbc2',name:'Kiwibank Loan 2',principal:1000000,rate:6.68,term:10,start:'2025-06-01',ioMonths:0,paydowns:[]},
    {id:'shd', name:'Shareholder Deposit',principal:1200000,rate:10,term:7,start:'2025-06-01',ioMonths:0,paydowns:[{date:'2028-03-01',amount:600000}]},
    {id:'vf',  name:'Vendor Finance',principal:1000000,rate:10,term:5,start:'2025-06-01',ioMonths:10,paydowns:[{date:'2026-04-01',amount:500000}]}
  ],
  // Running cost: per-aircraft cost per flight hour. fuel price $/L, burn L/hr by type; maintenance
  // $/hr = annual maint ÷ hours; engine/prop overhaul reserves = cost ÷ interval hours.
  running:{
    fuel:{avgas:4.35,jeta1:3.05},
    aircraft:[
      {code:'SLA',type:'C208',burn:170,fuelType:'jeta1',hours:529.3,maint:114000,eoCost:1000000,eoInt:3600,propCost:20000,propInt:2400},
      {code:'SLB',type:'C208',burn:170,fuelType:'jeta1',hours:477,  maint:181000,eoCost:1000000,eoInt:3600,propCost:20000,propInt:2400},
      {code:'SLD',type:'GA8', burn:70, fuelType:'avgas',hours:503.8,maint:95000, eoCost:210000, eoInt:2000,propCost:20000,propInt:2400},
      {code:'SLQ',type:'GA8', burn:70, fuelType:'avgas',hours:524.3,maint:152000,eoCost:210000, eoInt:2000,propCost:20000,propInt:2400}
    ]
  },
  // Staff pay-rate reference (daily rates). new = post-raise (Oct).
  payRates:[
    {code:'DF',cur:130,nw:130},{code:'BR',cur:70,nw:72.5},{code:'BF',cur:72.5,nw:75},{code:'FC',cur:62.5,nw:65},
    {code:'IG',cur:60,nw:62.5},{code:'RK',cur:60,nw:65},{code:'JT',cur:60,nw:62.5},{code:'JY',cur:130,nw:130},
    {code:'AA',cur:130,nw:130},{code:'LH',cur:72.5,nw:75},{code:'TP',cur:72.5,nw:72.5},{code:'MS',cur:70,nw:72.5},
    {code:'LL',cur:67.5,nw:67.5},{code:'DO',cur:60,nw:67.5},{code:'JC',cur:65,nw:65},{code:'MD',cur:60,nw:60},{code:'EB',cur:60,nw:60}
  ],
  // Pax tracker: monthly targets + daily pax (this year / prior year), keyed by date.
  paxTargets:{'2025-06':828},
  paxData:{},  // 'YYYY-MM-DD' -> {p26, p25}
  // FY budgets — pax & revenue forecast. Drivers per month → Total Departures → Pax Carried
  // (= Σ effective seats of ACTIVE aircraft × departures) → revenue by channel (Milford + Other).
  budgets:[
    {id:'fy26',label:'FY26 Budget',startYM:'2025-04',
     days:[30,31,30,31,31,30,31,30,31,31,28,31],
     flyPct:[0.55,0.55,0.55,0.55,0.55,0.55,0.55,0.55,0.55,0.55,0.55,0.55],
     downtime:[0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.08],
     avgDep:[1.75,1.5,1.25,1.25,1.25,1.25,1.5,2.0,2.5,2.5,2.15,2.25],
     aircraft:[
       {code:'SLA C208B',seats:13,loading:0.85,active:[1,1,1,1,1,1,1,1,1,1,1,1]},
       {code:'SLB C208B',seats:13,loading:0.86,active:[0,0,1,1,1,1,1,1,1,1,1,1]},
       {code:'SLD GA8',seats:7,loading:0.86,active:[1,1,1,1,1,1,1,1,1,1,1,1]},
       {code:'SLQ GA8',seats:7,loading:0.86,active:[1,1,1,1,1,1,1,1,1,1,1,1]},
       {code:'SDB C208B',seats:11,loading:0.85,active:[1,1,1,1,1,1,0,0,0,0,1,1]}
     ],
     fy25:[568,548,528,677,441,441,536,1018,1221,1624,1407,1221],
     pctAgents:[0.81,0.78,0.75,0.85,0.83,0.89,0.78,0.80,0.73,0.70,0.74,0.74],
     milford:{factor:0.92,agentRate:440,directRate:600,uplift:0.1342,upliftFrom:6},
     other:{factor:0.08,agentRate:1000,directRate:1200,uplift:0.0589,upliftFrom:6}},
    {id:'fy27',label:'FY27 Budget',startYM:'2026-04',
     days:[30,31,30,31,31,30,31,30,31,31,28,31],
     flyPct:[0.55,0.55,0.55,0.55,0.55,0.40,0.40,0.55,0.60,0.65,0.65,0.60],
     downtime:[0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.08],
     avgDep:[1.5,1.0,1.0,1.25,1.25,1.25,1.5,2.0,2.5,2.5,2.5,2.25],
     aircraft:[
       {code:'SLA C208B',seats:13,loading:0.85,active:[1,1,1,1,1,1,1,1,1,1,1,1]},
       {code:'SLB C208B',seats:13,loading:0.86,active:[1,1,1,1,1,1,1,1,1,1,1,1]},
       {code:'SLD GA8',seats:7,loading:0.86,active:[1,1,1,1,1,1,1,1,1,1,1,1]},
       {code:'SLQ GA8',seats:7,loading:0.86,active:[1,1,1,1,1,1,1,1,1,1,1,1]},
       {code:'SDB C208B',seats:11,loading:0.85,active:[1,1,1,1,1,1,0,0,0,0,1,1]}
     ],
     fy25:null,
     pctAgents:[0.8,0.8,0.75,0.75,0.75,0.75,0.75,0.8,0.85,0.85,0.85,0.85],
     milford:{factor:0.92,agentRate:520,directRate:640,uplift:0.1074,upliftFrom:6},
     other:{factor:0.08,agentRate:1250,directRate:1460,uplift:0.1154,upliftFrom:6}}
  ]
};
// Compute a budget's 12-month forecast arrays.
function _bizBudgetCalc(b){
  var n=12,dep=[],eff=[],pax=[],rev=[],mil=[],oth=[];
  for(var m=0;m<n;m++){
    var d=(+b.days[m]||0)*(+b.flyPct[m]||0)*(+b.avgDep[m]||0)*(1-(+b.downtime[m]||0));dep.push(d);
    var es=0;(b.aircraft||[]).forEach(function(a){if((a.active||[])[m])es+=(+a.seats||0)*(+a.loading||0);});eff.push(es);
    var px=es*d;pax.push(px);
    var pa=(+b.pctAgents[m]||0),pd=1-pa;
    var mp=px*(+b.milford.factor||0),mr=mp*(pa*(+b.milford.agentRate||0)+pd*(+b.milford.directRate||0));if(m>=(b.milford.upliftFrom||99))mr+=mr*(+b.milford.uplift||0);mil.push(mr);
    var op=px*(+b.other.factor||0),or=op*(pa*(+b.other.agentRate||0)+pd*(+b.other.directRate||0));if(m>=(b.other.upliftFrom||99))or+=or*(+b.other.uplift||0);oth.push(or);
    rev.push(mr+or);
  }
  return {dep:dep,eff:eff,pax:pax,mil:mil,oth:oth,rev:rev};
}
// Consolidated loan cashflow: total payment (incl. paydowns) per calendar month across all loans.
function _bizTimeline(){
  var p=_bizState();var byMonth={};
  p.loans.forEach(function(l){var s=_bizLoanSchedule(l);s.rows.forEach(function(r){var ym=String(r.date).slice(0,7);byMonth[ym]=byMonth[ym]||{};byMonth[ym][l.id]=(byMonth[ym][l.id]||0)+r.payment+(r.extra||0);});});
  return {months:Object.keys(byMonth).sort(),byMonth:byMonth,loans:p.loans};
}

function _bizState(){
  if(!S._bizPlan||typeof S._bizPlan!=='object')S._bizPlan=JSON.parse(JSON.stringify(BIZ_DEFAULT));
  if(!Array.isArray(S._bizPlan.tranches))S._bizPlan.tranches=JSON.parse(JSON.stringify(BIZ_DEFAULT.tranches));
  if(!Array.isArray(S._bizPlan.assets))S._bizPlan.assets=[];
  if(!Array.isArray(S._bizPlan.loans))S._bizPlan.loans=JSON.parse(JSON.stringify(BIZ_DEFAULT.loans));
  if(!S._bizPlan.running||typeof S._bizPlan.running!=='object')S._bizPlan.running=JSON.parse(JSON.stringify(BIZ_DEFAULT.running));
  if(!S._bizPlan.running.fuel)S._bizPlan.running.fuel=JSON.parse(JSON.stringify(BIZ_DEFAULT.running.fuel));
  if(!Array.isArray(S._bizPlan.running.aircraft))S._bizPlan.running.aircraft=[];
  if(!Array.isArray(S._bizPlan.payRates))S._bizPlan.payRates=JSON.parse(JSON.stringify(BIZ_DEFAULT.payRates));
  if(!S._bizPlan.paxTargets||typeof S._bizPlan.paxTargets!=='object')S._bizPlan.paxTargets={};
  if(!S._bizPlan.paxData||typeof S._bizPlan.paxData!=='object')S._bizPlan.paxData={};
  // Backfill historical pax from the spreadsheet for any date/field not already present, so a saved
  // or partial cloud blob can't hide the history. Runs once per load; Rezdy-synced / edited values win.
  if(!S._bizPaxMerged&&typeof _bizPaxDefault==='function'){
    var _seed=_bizPaxDefault(),_pd=S._bizPlan.paxData;
    Object.keys(_seed).forEach(function(ds){
      if(!_pd[ds])_pd[ds]={};
      if(_pd[ds].p26==null&&_seed[ds].p26!=null)_pd[ds].p26=_seed[ds].p26;
      if(_pd[ds].p25==null&&_seed[ds].p25!=null)_pd[ds].p25=_seed[ds].p25;
      if(_pd[ds].p26==null&&_pd[ds].p25==null)delete _pd[ds];
    });
    S._bizPaxMerged=true;
  }
  if(!Array.isArray(S._bizPlan.budgets))S._bizPlan.budgets=JSON.parse(JSON.stringify(BIZ_DEFAULT.budgets));
  if(!Array.isArray(S._bizPlan.pnls)&&typeof _bizPnlDefault==='function')S._bizPlan.pnls=_bizPnlDefault();
  return S._bizPlan;
}
// P&L computed columns from the line items.
function _bizPnlCalc(pl){
  var n=12,cos=[],opex=[],gross=[],ebitda=[],yld=[];
  for(var m=0;m<n;m++){
    var cs=0;(pl.cos||[]).forEach(function(l){cs+=(+l.vals[m]||0);});cos.push(cs);
    var ox=0;(pl.opex||[]).forEach(function(l){ox+=(+l.vals[m]||0);});opex.push(ox);
    var g=(+pl.ti[m]||0)-cs;gross.push(g);ebitda.push(g-ox);
    yld.push((+pl.pax[m])?((+pl.ti[m]||0)/(+pl.pax[m])):0);
  }
  return {cos:cos,opex:opex,gross:gross,ebitda:ebitda,yld:yld};
}
// Per-aircraft cost-per-flight-hour breakdown.
function _bizRunCalc(ac,fuel){
  var fp=(ac.fuelType==='avgas')?(+fuel.avgas||0):(+fuel.jeta1||0);
  var fuelHr=(+ac.burn||0)*fp;
  var mHr=(+ac.hours>0)?((+ac.maint||0)/(+ac.hours)):0;
  var eoHr=(+ac.eoInt>0)?((+ac.eoCost||0)/(+ac.eoInt)):0;
  var propHr=(+ac.propInt>0)?((+ac.propCost||0)/(+ac.propInt)):0;
  var maintHr=mHr+eoHr+propHr;
  return {fuelHr:fuelHr,mHr:mHr,eoHr:eoHr,propHr:propHr,maintHr:maintHr,totalHr:fuelHr+maintHr};
}
function _bizAddMonths(ds,n){var m=/(\d{4})-(\d{2})/.exec(String(ds||''));if(!m)return ds;var d=new Date(+m[1],+m[2]-1+n,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';}
function _bizMonLabel(ds){var m=/(\d{4})-(\d{2})/.exec(String(ds||''));if(!m)return ds;return new Date(+m[1],+m[2]-1,1).toLocaleDateString('en-NZ',{month:'short',year:'2-digit'});}
// Build a loan's month-by-month schedule. Interest-only for ioMonths, then amortise the (paydown-
// reduced) balance over the remaining term; lump-sum paydowns reduce the balance and re-amortise.
function _bizLoanSchedule(loan){
  var P=+loan.principal||0,r=(+loan.rate||0)/100/12,n=Math.max(1,Math.round((+loan.term||1)*12)),io=Math.max(0,Math.round(+loan.ioMonths||0));
  var pd={};(loan.paydowns||[]).forEach(function(p){if(!p||!p.date)return;var mi=_bizMonthsBetween(loan.start,p.date);if(mi>=0)pd[mi]=(pd[mi]||0)+(+p.amount||0);});
  var bal=P,rows=[],cumInt=0,firstPI=0;
  for(var m=1;m<=n&&bal>0.01;m++){
    var date=_bizAddMonths(loan.start,m-1);
    var interest=bal*r,principal=0,payment;
    if(m<=io){payment=interest;}
    else{var rem=n-(m-1);var amort=r>0?(bal*r/(1-Math.pow(1+r,-rem))):(bal/rem);if(amort-interest>bal){amort=bal+interest;}payment=amort;principal=payment-interest;if(!firstPI)firstPI=payment;}
    bal-=principal;
    var extra=pd[m-1]||0;if(extra){if(extra>bal)extra=bal;bal-=extra;}
    cumInt+=interest;
    rows.push({m:m,date:date,interest:interest,principal:principal,payment:payment,extra:extra,balance:bal});
  }
  return {rows:rows,totalInterest:cumInt,totalCost:P+cumInt,firstPI:firstPI||(rows[0]?rows[0].payment:0),nPayments:rows.length};
}
function _bizMonthsBetween(a,b){var ma=/(\d{4})-(\d{2})/.exec(String(a||'')),mb=/(\d{4})-(\d{2})/.exec(String(b||''));if(!ma||!mb)return -1;return (+mb[1]-+ma[1])*12+(+mb[2]-+ma[2]);}
function _bizMoney(n){n=+n||0;return '$'+n.toLocaleString('en-NZ',{minimumFractionDigits:0,maximumFractionDigits:0});}
function _bizMoney2(n){n=+n||0;return '$'+n.toLocaleString('en-NZ',{minimumFractionDigits:2,maximumFractionDigits:2});}
// Monthly repayment for a tranche: interest-only = amount×rate/12; P&I = standard amortising PMT.
function _bizMonthly(t){
  var amt=+t.amount||0,r=(+t.rate||0)/100/12;
  var interest=amt*r;
  if(t.type==='io'||!t.term)return {interest:interest,principal:0,monthly:interest};
  var n=(+t.term||1)*12;
  var pmt=r>0?(amt*r/(1-Math.pow(1+r,-n))):(amt/n);
  return {interest:interest,principal:pmt-interest,monthly:pmt};
}

// ── persistence ──
window.loadBusinessPlan=function(){
  try{var c=lsGet&&lsGet('ts_business_plan');if(c&&typeof c==='object'){S._bizPlan=c;S._bizPaxMerged=false;}}catch(e){}
  try{fetch(SB+'/rest/v1/ts_settings?key=eq.business_plan&select=value',{headers:SH}).then(function(r){return r.ok?r.json():[];}).then(function(rows){try{if(rows&&rows[0]&&rows[0].value){S._bizPlan=JSON.parse(rows[0].value);S._bizPaxMerged=false;}}catch(e){}if(typeof safeRender==='function')safeRender();}).catch(function(){});}catch(e){}
};
function _bizSave(){
  var p=_bizState();
  try{lsSet&&lsSet('ts_business_plan',p);}catch(e){}
  if(typeof sbU==='function')sbU('ts_settings',[{key:'business_plan',value:JSON.stringify(p)}]).then(function(r){if(r===null&&typeof toast==='function')toast('Business plan did not save to the server — check connection','warn');}).catch(function(){});
}
window.bizSetTranche=function(i,field,value){var p=_bizState();if(!p.tranches[i])return;p.tranches[i][field]=(field==='name'||field==='type')?value:(value===''?'':(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizAddTranche=function(){_bizState().tranches.push({name:'New facility',amount:0,rate:0,type:'io',term:10});_bizSave();render();};
window.bizDelTranche=function(i){var p=_bizState();p.tranches.splice(i,1);_bizSave();render();};
window.bizSetAsset=function(i,field,value){var p=_bizState();if(!p.assets[i])return;p.assets[i][field]=(field==='name')?value:(value===''?'':(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizAddAsset=function(){_bizState().assets.push({name:'New asset',value:0});_bizSave();render();};
window.bizDelAsset=function(i){var p=_bizState();p.assets.splice(i,1);_bizSave();render();};
window.bizSetNotes=function(v){_bizState().notes=v;_bizSave();};
window.bizSetTab=function(t){S._bizTab=t;render();};
window.bizSetLoan=function(i,field,value){var p=_bizState();if(!p.loans[i])return;p.loans[i][field]=(field==='name'||field==='start')?value:(value===''?'':(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizAddLoan=function(){_bizState().loans.push({id:'loan'+Date.now(),name:'New loan',principal:0,rate:0,term:10,start:'2025-06-01',ioMonths:0,paydowns:[]});_bizSave();render();};
window.bizDelLoan=function(i){var p=_bizState();p.loans.splice(i,1);_bizSave();render();};
window.bizToggleSched=function(id){S._bizSchedOpen=(S._bizSchedOpen===id)?null:id;render();};
window.bizAddPaydown=function(i){var p=_bizState();if(!p.loans[i])return;(p.loans[i].paydowns=p.loans[i].paydowns||[]).push({date:p.loans[i].start||'2025-06-01',amount:0});_bizSave();render();};
window.bizSetPaydown=function(i,j,field,value){var p=_bizState();if(!p.loans[i]||!p.loans[i].paydowns[j])return;p.loans[i].paydowns[j][field]=(field==='date')?value:(value===''?'':(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizDelPaydown=function(i,j){var p=_bizState();if(!p.loans[i])return;p.loans[i].paydowns.splice(j,1);_bizSave();render();};
window.bizSetFuel=function(k,value){var p=_bizState();p.running.fuel[k]=(value===''?'':(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizSetRunAc=function(i,field,value){var p=_bizState();if(!p.running.aircraft[i])return;p.running.aircraft[i][field]=(field==='code'||field==='type'||field==='fuelType')?value:(value===''?'':(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizAddRunAc=function(){_bizState().running.aircraft.push({code:'NEW',type:'C208',burn:170,fuelType:'jeta1',hours:500,maint:0,eoCost:1000000,eoInt:3600,propCost:20000,propInt:2400});_bizSave();render();};
window.bizDelRunAc=function(i){var p=_bizState();p.running.aircraft.splice(i,1);_bizSave();render();};
window.bizSetPay=function(i,field,value){var p=_bizState();if(!p.payRates[i])return;p.payRates[i][field]=(field==='code')?value:(value===''?'':(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizAddPay=function(){_bizState().payRates.push({code:'NEW',cur:0,nw:0});_bizSave();render();};
window.bizDelPay=function(i){var p=_bizState();p.payRates.splice(i,1);_bizSave();render();};
window.bizPaxMonth=function(dir){var m=S._bizPaxMonth||_bizDefaultPaxMonth();var d=new Date(+m.slice(0,4),+m.slice(5,7)-1+dir,1);S._bizPaxMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');render();};
window.bizSetPax=function(ds,field,value){var p=_bizState();p.paxData[ds]=p.paxData[ds]||{};if(value===''||value==null)delete p.paxData[ds][field];else p.paxData[ds][field]=Math.max(0,Math.round(+value)||0);if(p.paxData[ds].p26==null&&p.paxData[ds].p25==null)delete p.paxData[ds];_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizPaxView=function(v){S._bizPaxView=v;render();};
function _bizDefaultPaxMonth(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
// Monthly target = the FY budget's forecast pax for that month (budget whose 12-month range covers it).
function _bizPaxTarget(ym){
  var p=_bizState();
  for(var i=0;i<p.budgets.length;i++){var b=p.budgets[i];var startIdx=_bizMonthsBetween(b.startYM,ym+'-01');if(startIdx>=0&&startIdx<12){return Math.round(_bizBudgetCalc(b).pax[startIdx]);}}
  return null;
}
// Pull this year's daily pax (26 Pax) from Rezdy seats-sold for the displayed month.
window.bizPaxSyncRezdy=async function(ym){
  if(typeof sbF!=='function')return;
  var from=ym+'-01';var d=new Date(+ym.slice(0,4),+ym.slice(5,7),0);var to=ym+'-'+String(d.getDate()).padStart(2,'0');
  if(typeof toast==='function')toast('Pulling seats sold from Rezdy…','info');
  try{
    var rows=await sbF('ts_rezdy_bookings','&tour_date=gte.'+from+'&tour_date=lte.'+to);
    if(!Array.isArray(rows)){if(typeof toast==='function')toast('No bookings found for that month.','warn');return;}
    // Count seats sold EXACTLY like the Bookings/Calendar page: map each row to a booking (drops
    // supplier-duplicate rows), skip cancellations (status lives on the booking JSON, not the DB
    // row), and sum adults + children (infants travel free, so excluded — matches "seats sold").
    var byDate={};
    rows.forEach(function(r){
      var ds=String(r.tour_date||'').slice(0,10);if(!ds)return;
      var b=null;try{b=(typeof _rzMapBookings==='function')?_rzMapBookings([r])[0]:null;}catch(e){}
      if(!b)return;
      if(/cancel/i.test(b.status||''))return; // exclude cancellations (matches the Bookings page)
      var seats=0;try{var e=_rzEffBreakdown(b);seats=(e.a||0)+(e.c||0);}catch(e){}
      byDate[ds]=(byDate[ds]||0)+seats;
    });
    var p=_bizState();
    // Wipe THIS month's 26-Pax first so a day that now has no bookings resets to blank — otherwise a
    // stale value from an earlier sync lingers on days that should read 0.
    Object.keys(p.paxData).forEach(function(ds){if(ds.slice(0,7)===ym&&p.paxData[ds]){delete p.paxData[ds].p26;if(p.paxData[ds].p25==null)delete p.paxData[ds];}});
    var n=0;
    Object.keys(byDate).forEach(function(ds){p.paxData[ds]=p.paxData[ds]||{};p.paxData[ds].p26=byDate[ds];n++;});
    _bizSave();render();
    if(typeof toast==='function')toast('Updated '+n+' day'+(n===1?'':'s')+' from Rezdy seats sold ✓','ok');
  }catch(e){if(typeof toast==='function')toast('Could not pull from Rezdy — '+e,'err');}
};
window.bizBudgetSel=function(id){S._bizBudget=id;render();};
window.bizSetBudgetDriver=function(bid,field,m,value){var p=_bizState();var b=p.budgets.find(function(x){return x.id===bid;});if(!b||!b[field])return;b[field][m]=(value===''?'':(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizSetBudgetParam=function(bid,grp,field,value){var p=_bizState();var b=p.budgets.find(function(x){return x.id===bid;});if(!b||!b[grp])return;b[grp][field]=(value===''?'':(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizToggleBudgetAc=function(bid,ai,m){var p=_bizState();var b=p.budgets.find(function(x){return x.id===bid;});if(!b||!b.aircraft[ai])return;b.aircraft[ai].active[m]=b.aircraft[ai].active[m]?0:1;_bizSave();render();};
window.bizPnlSel=function(id){S._bizPnl=id;render();};
window.bizSetPnlHead=function(plid,field,m,value){var p=_bizState();var pl=p.pnls.find(function(x){return x.id===plid;});if(!pl||!pl[field])return;pl[field][m]=(value===''?0:(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizSetPnlCell=function(plid,sec,li,m,value){var p=_bizState();var pl=p.pnls.find(function(x){return x.id===plid;});if(!pl||!pl[sec]||!pl[sec][li])return;pl[sec][li].vals[m]=(value===''?0:(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizReset=function(){if(typeof confirm==='function'&&!confirm('Reset the Main Plan to the original spreadsheet values?'))return;S._bizPlan=JSON.parse(JSON.stringify(BIZ_DEFAULT));_bizSave();render();};

// ── render ──
function renderBusinessPlan(){
  if(!S._bizLoaded){S._bizLoaded=true;if(window.loadBusinessPlan)window.loadBusinessPlan();}
  if(!(typeof hasRolePerm==='function'&&hasRolePerm('businessplan'))&&!(S.user&&S.user.superAdmin))
    return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div>';
  // Acquisition / Loan schedules / Loan timeline / FY Budgets / P&L are hidden for now (to be rebuilt
  // properly) — their render code is kept dormant below. Active tabs: Running costs, Pax tracker, Pay rates.
  var tabs=[{id:'pax',lbl:'Pax tracker'},{id:'running',lbl:'Running costs'},{id:'roster',lbl:'Pay rates'}];
  var tab=S._bizTab||'pax';
  if(!tabs.some(function(t){return t.id===tab;}))tab='pax';
  var bar='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'+
    tabs.map(function(t){return '<button class="sub-tab '+(tab===t.id?'on':'')+'" onclick="window.bizSetTab(\''+t.id+'\')">'+t.lbl+'</button>';}).join('')+'</div>';
  var body=(tab==='running')?_bizRenderRunning():(tab==='roster')?_bizRenderRoster():_bizRenderPax();
  return '<div>'+bar+body+'</div>';
}

function _bizRenderPnl(){
  var p=_bizState();var plid=S._bizPnl||(p.pnls[0]&&p.pnls[0].id);
  var pl=p.pnls.find(function(x){return x.id===plid;})||p.pnls[0];
  if(!pl)return '<div class="card" style="color:var(--text3)">No P&amp;L defined.</div>';
  var c=_bizPnlCalc(pl);
  var months=[];for(var m=0;m<12;m++)months.push(_bizMonLabel(_bizAddMonths(pl.startYM+'-01',m)));
  var _ci='width:62px;font-size:10.5px;padding:2px 2px;border:1px solid var(--border2);border-radius:4px;background:var(--card);color:var(--text);text-align:right;box-sizing:border-box';
  var sum=function(a){return a.reduce(function(s,v){return s+(+v||0);},0);};
  var th='<th style="position:sticky;left:0;background:var(--card2);text-align:left;padding:4px 8px;font-size:10px;color:var(--text3);min-width:150px;z-index:1">';
  var thd='<th style="position:sticky;left:0;background:var(--card);text-align:left;padding:3px 8px;font-size:10.5px;min-width:150px;z-index:1">';
  var h='<div class="card" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><div style="flex:1"><div class="st" style="margin-bottom:0">Profit &amp; Loss</div><p style="font-size:12px;color:var(--text3);margin:2px 0 0">'+_rzEscSafe(pl.basis||'')+'. Gross profit, EBITDA &amp; totals computed; income/cost lines editable.</p></div>'+
    p.pnls.map(function(x){return '<button class="sub-tab '+(x.id===pl.id?'on':'')+'" onclick="window.bizPnlSel(\''+x.id+'\')">'+_rzEscSafe(x.label)+'</button>';}).join('')+'</div>';
  // headline
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">'+
    '<div style="flex:1 1 150px;border:1px solid var(--border2);border-top:3px solid #7c3aed;border-radius:10px;padding:12px 14px"><div style="font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase">Trading income</div><div style="font-size:18px;font-weight:800">'+_bizMoney(sum(pl.ti))+'</div></div>'+
    '<div style="flex:1 1 150px;border:1px solid var(--border2);border-top:3px solid #22c55e;border-radius:10px;padding:12px 14px"><div style="font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase">Gross profit</div><div style="font-size:18px;font-weight:800">'+_bizMoney(sum(c.gross))+'</div></div>'+
    '<div style="flex:1 1 150px;border:1px solid var(--border2);border-top:3px solid #f59e0b;border-radius:10px;padding:12px 14px"><div style="font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase">EBITDA</div><div style="font-size:18px;font-weight:800;color:'+(sum(c.ebitda)>=0?'#22c55e':'#ef4444')+'">'+_bizMoney(sum(c.ebitda))+'</div></div>'+
    '</div>';
  h+='<div class="card" style="padding:0;overflow-x:auto"><table style="border-collapse:collapse;font-size:10.5px;min-width:'+(150+12*66+80)+'px">';
  h+='<thead><tr style="background:var(--card2)">'+th+'</th>'+months.map(function(mn){return '<th style="text-align:right;padding:4px 4px;font-size:9px;color:var(--text3);min-width:62px">'+mn+'</th>';}).join('')+'<th style="text-align:right;padding:4px 8px;font-size:9px;color:var(--text3)">Year</th></tr></thead><tbody>';
  // editable head rows (TI, PAX) + computed yield
  function headRow(lbl,field){var r='<tr style="border-top:1px solid var(--border2)">'+thd+'<b>'+lbl+'</b></th>';for(var m=0;m<12;m++){r+='<td style="padding:1px 2px"><input type="number" value="'+(pl[field][m]||'')+'" onchange="window.bizSetPnlHead(\''+pl.id+'\',\''+field+'\','+m+',this.value)" style="'+_ci+'"></td>';}r+='<td style="padding:2px 8px;text-align:right;font-weight:700">'+(field==='pax'?Math.round(sum(pl[field])):_bizMoney(sum(pl[field])))+'</td></tr>';return r;}
  h+=headRow('Trading income','ti');
  h+=headRow('PAX','pax');
  var yr='<tr style="border-top:1px solid var(--border2)">'+thd+'Avg yield $/pax</th>';for(var m=0;m<12;m++){yr+='<td style="padding:2px 4px;text-align:right;color:var(--text3)">'+(c.yld[m]?Math.round(c.yld[m]):'')+'</td>';}yr+='<td style="padding:2px 8px;text-align:right;color:var(--text3)">'+(sum(pl.pax)?Math.round(sum(pl.ti)/sum(pl.pax)):'')+'</td></tr>';h+=yr;
  // section helper
  function section(title,sec,lines,totals){
    var r='<tr style="background:rgba(124,58,237,.06)"><td colspan="14" style="padding:4px 8px;font-size:10px;font-weight:800;color:#c084fc;text-transform:uppercase;position:sticky;left:0;background:rgba(124,58,237,.06)">'+title+'</td></tr>';
    lines.forEach(function(l,li){
      r+='<tr style="border-top:1px solid var(--border2)">'+thd.replace('var(--card)','var(--card)')+_rzEscSafe(l.label)+'</th>';
      for(var m=0;m<12;m++){r+='<td style="padding:1px 2px"><input type="number" value="'+(l.vals[m]||'')+'" onchange="window.bizSetPnlCell(\''+pl.id+'\',\''+sec+'\','+li+','+m+',this.value)" style="'+_ci+'"></td>';}
      r+='<td style="padding:2px 8px;text-align:right;color:var(--text3)">'+_bizMoney(sum(l.vals))+'</td></tr>';
    });
    // total row
    r+='<tr style="border-top:2px solid var(--border);background:var(--card2);font-weight:800">'+th+totals.lbl+'</th>';
    for(var m=0;m<12;m++){r+='<td style="padding:3px 4px;text-align:right">'+_bizMoney(totals.arr[m])+'</td>';}
    r+='<td style="padding:3px 8px;text-align:right;color:#f59e0b">'+_bizMoney(sum(totals.arr))+'</td></tr>';
    return r;
  }
  h+=section('Cost of sales','cos',pl.cos,{lbl:'Total cost of sales',arr:c.cos});
  // gross profit
  var gr='<tr style="border-top:2px solid var(--border);background:rgba(34,197,94,.08);font-weight:800">'+th.replace('var(--card2)','transparent')+'Gross profit</th>';for(var m=0;m<12;m++){gr+='<td style="padding:3px 4px;text-align:right;color:'+(c.gross[m]>=0?'#22c55e':'#ef4444')+'">'+_bizMoney(c.gross[m])+'</td>';}gr+='<td style="padding:3px 8px;text-align:right;color:#22c55e">'+_bizMoney(sum(c.gross))+'</td></tr>';h+=gr;
  h+=section('Operating expenses','opex',pl.opex,{lbl:'Total operating expenses',arr:c.opex});
  // ebitda
  var er='<tr style="border-top:2px solid var(--border);background:rgba(245,158,11,.10);font-weight:800">'+th.replace('var(--card2)','transparent')+'EBITDA</th>';for(var m=0;m<12;m++){er+='<td style="padding:3px 4px;text-align:right;color:'+(c.ebitda[m]>=0?'#22c55e':'#ef4444')+'">'+_bizMoney(c.ebitda[m])+'</td>';}er+='<td style="padding:3px 8px;text-align:right;color:'+(sum(c.ebitda)>=0?'#22c55e':'#ef4444')+'">'+_bizMoney(sum(c.ebitda))+'</td></tr>';h+=er;
  h+='</tbody></table></div>';
  h+='<div style="font-size:11px;color:var(--text3);padding:6px 2px">Total cost of sales / operating expenses, gross profit (income − COS) and EBITDA (gross − OPEX) are computed live from the line items. Seeded from the workbook; edit any income or cost cell.</div>';
  return h;
}

function _bizRenderBudget(){
  var p=_bizState();var bid=S._bizBudget||(p.budgets[0]&&p.budgets[0].id);
  var b=p.budgets.find(function(x){return x.id===bid;})||p.budgets[0];
  if(!b)return '<div class="card" style="color:var(--text3);padding:24px">No budget defined.</div>';
  var c=_bizBudgetCalc(b);
  var months=[];for(var m=0;m<12;m++)months.push(_bizMonLabel(_bizAddMonths(b.startYM+'-01',m)));
  var _ci='width:52px;font-size:11px;padding:2px 3px;border:1px solid var(--border2);border-radius:4px;background:var(--card);color:var(--text);text-align:center;box-sizing:border-box';
  var sum=function(a){return a.reduce(function(s,v){return s+(+v||0);},0);};
  // selector
  var h='<div class="card" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><div class="st" style="margin-bottom:0;flex:1">FY Budget — pax &amp; revenue forecast</div>'+
    p.budgets.map(function(x){return '<button class="sub-tab '+(x.id===b.id?'on':'')+'" onclick="window.bizBudgetSel(\''+x.id+'\')">'+_rzEscSafe(x.label)+'</button>';}).join('')+'</div>';
  // headline tiles
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">'+
    '<div style="flex:1 1 150px;border:1px solid var(--border2);border-top:3px solid #7c3aed;border-radius:10px;padding:12px 14px"><div style="font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase">Departures /yr</div><div style="font-size:19px;font-weight:800">'+Math.round(sum(c.dep))+'</div></div>'+
    '<div style="flex:1 1 150px;border:1px solid var(--border2);border-top:3px solid #22c55e;border-radius:10px;padding:12px 14px"><div style="font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase">Pax carried /yr</div><div style="font-size:19px;font-weight:800">'+Math.round(sum(c.pax)).toLocaleString('en-NZ')+'</div></div>'+
    '<div style="flex:1 1 150px;border:1px solid var(--border2);border-top:3px solid #f59e0b;border-radius:10px;padding:12px 14px"><div style="font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase">Revenue /yr</div><div style="font-size:19px;font-weight:800">'+_bizMoney(sum(c.rev))+'</div></div>'+
    '</div>';
  // grid
  var th='<th style="position:sticky;left:0;background:var(--card2);text-align:left;padding:5px 8px;font-size:10px;color:var(--text3);min-width:140px;z-index:1">';
  h+='<div class="card" style="padding:0;overflow-x:auto"><table style="border-collapse:collapse;font-size:11px;min-width:'+(140+12*58+70)+'px">';
  h+='<thead><tr style="background:var(--card2)">'+th+'</th>'+months.map(function(mn){return '<th style="text-align:center;padding:5px 4px;font-size:9px;color:var(--text3);min-width:54px">'+mn+'</th>';}).join('')+'<th style="text-align:right;padding:5px 8px;font-size:9px;color:var(--text3)">Year</th></tr></thead><tbody>';
  // editable driver rows
  function drow(lbl,field,step,fmt){var r='<tr style="border-top:1px solid var(--border2)">'+th.replace('var(--card2)','var(--card)')+lbl+'</th>';for(var m=0;m<12;m++){r+='<td style="padding:1px 2px"><input type="number" step="'+step+'" value="'+(b[field][m]!==''?b[field][m]:'')+'" onchange="window.bizSetBudgetDriver(\''+b.id+'\',\''+field+'\','+m+',this.value)" style="'+_ci+'"></td>';}r+='<td></td></tr>';return r;}
  h+=drow('Days','days','1');
  h+=drow('Flying days %','flyPct','0.01');
  h+=drow('Maint downtime','downtime','0.01');
  h+=drow('Avg daily departures','avgDep','0.25');
  // computed: total departures
  function crow(lbl,arr,money,strong){var r='<tr style="border-top:1px solid var(--border2)'+(strong?';background:var(--card2);font-weight:800':'')+'">'+th.replace('var(--card2)',strong?'var(--card2)':'var(--card)')+lbl+'</th>';for(var m=0;m<12;m++){var v=arr[m];r+='<td style="padding:3px 4px;text-align:center;color:'+(strong?'var(--text1)':'var(--text2)')+'">'+(money?_bizMoney(v):(Math.round(v*10)/10))+'</td>';}r+='<td style="padding:3px 8px;text-align:right;font-weight:800;color:'+(money?'#f59e0b':'var(--text1)')+'">'+(money?_bizMoney(sum(arr)):Math.round(sum(arr)))+'</td></tr>';return r;}
  h+=crow('Total departures',c.dep,false,true);
  // aircraft effective-seat active toggles
  b.aircraft.forEach(function(a,ai){
    var r='<tr style="border-top:1px solid var(--border2)">'+th.replace('var(--card2)','var(--card)')+'<span style="font-size:10px">'+_rzEscSafe(a.code)+' <span style="color:var(--text3)">'+(Math.round(a.seats*a.loading*100)/100)+'</span></span></th>';
    for(var m=0;m<12;m++){var on=(a.active||[])[m];r+='<td style="padding:1px 2px;text-align:center"><button onclick="window.bizToggleBudgetAc(\''+b.id+'\','+ai+','+m+')" title="Toggle in-service" style="width:46px;height:20px;border:1px solid var(--border2);border-radius:4px;background:'+(on?'rgba(34,197,94,.18)':'transparent')+';color:'+(on?'#22c55e':'var(--text3)')+';cursor:pointer;font-size:10px;font-weight:700">'+(on?(Math.round(a.seats*a.loading*100)/100):'—')+'</button></td>';}
    r+='<td></td></tr>';h+=r;
  });
  h+=crow('Pax carried',c.pax,false,true);
  if(b.fy25){var r='<tr style="border-top:1px solid var(--border2)">'+th.replace('var(--card2)','var(--card)')+'FY25 actual</th>';for(var m=0;m<12;m++){r+='<td style="padding:3px 4px;text-align:center;color:var(--text3)">'+(b.fy25[m]||'')+'</td>';}r+='<td style="padding:3px 8px;text-align:right;color:var(--text3)">'+sum(b.fy25)+'</td></tr>';h+=r;}
  h+=crow('Revenue',c.rev,true,true);
  h+='</tbody></table></div>';
  // revenue params
  function pgrp(lbl,grp){var g=b[grp];return '<div style="flex:1 1 260px;border:1px solid var(--border2);border-radius:9px;padding:10px"><div style="font-size:11px;font-weight:800;margin-bottom:6px">'+lbl+'</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">'+
    _bizFld('Tour factor','<input type="number" step="0.01" value="'+g.factor+'" onchange="window.bizSetBudgetParam(\''+b.id+'\',\''+grp+'\',\'factor\',this.value)" style="'+_ci+';width:100%">')+
    _bizFld('Uplift (Oct+)','<input type="number" step="0.001" value="'+g.uplift+'" onchange="window.bizSetBudgetParam(\''+b.id+'\',\''+grp+'\',\'uplift\',this.value)" style="'+_ci+';width:100%">')+
    _bizFld('Agent rate','<input type="number" step="10" value="'+g.agentRate+'" onchange="window.bizSetBudgetParam(\''+b.id+'\',\''+grp+'\',\'agentRate\',this.value)" style="'+_ci+';width:100%">')+
    _bizFld('Direct rate','<input type="number" step="10" value="'+g.directRate+'" onchange="window.bizSetBudgetParam(\''+b.id+'\',\''+grp+'\',\'directRate\',this.value)" style="'+_ci+';width:100%">')+
    '</div></div>';}
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">'+pgrp('Milford tours',milGrp(b))+pgrp('Other tours',othGrp(b))+'</div>';
  h+='<div style="font-size:11px;color:var(--text3);padding:6px 2px">Total departures = days × flying-day % × avg daily departures × (1−downtime). Pax carried = (sum of in-service aircraft effective seats) × departures. Tap an aircraft cell to toggle it in/out of service that month. Revenue = pax × tour factor × (% agent×agent rate + % direct×direct rate), + uplift from October.</div>';
  return h;
}
function milGrp(){return 'milford';}
function othGrp(){return 'other';}

// Conditional-formatting colour: t below mid → red, at mid → amber, above → green (subtle bg).
function _bizHeat(val,lo,hi){
  var t=Math.max(0,Math.min(1,(val-lo)/(hi-lo)));
  function L(a,b,u){return Math.round(a+(b-a)*u);}
  var r,g,b;
  if(t<0.5){var u=t/0.5;r=L(239,245,u);g=L(68,158,u);b=L(68,11,u);}
  else{var u=(t-0.5)/0.5;r=L(245,34,u);g=L(158,197,u);b=L(11,94,u);}
  return {bg:'rgba('+r+','+g+','+b+',0.20)',fg:'rgb('+L(r,r,1)+','+g+','+b+')'};
}
function _bizPaxMonths(){var p=_bizState();var o={};Object.keys(p.paxData).forEach(function(ds){if((+p.paxData[ds].p26)>0||(+p.paxData[ds].p25)>0)o[ds.slice(0,7)]=1;});return Object.keys(o).sort();}
function _bizMonthTot(ym,field){var p=_bizState();var t=0;Object.keys(p.paxData).forEach(function(ds){if(ds.slice(0,7)===ym)t+=(+p.paxData[ds][field]||0);});return t;}

function _bizRenderPax(){
  var p=_bizState();var view=S._bizPaxView||'daily';
  var tabs='<div style="display:flex;gap:6px;margin-bottom:12px">'+
    ['daily','summary'].map(function(v){return '<button class="sub-tab '+(view===v?'on':'')+'" onclick="window.bizPaxView(\''+v+'\')">'+(v==='daily'?'Daily':'Summary')+'</button>';}).join('')+'</div>';
  return tabs+(view==='summary'?_bizRenderPaxSummary():_bizRenderPaxDaily());
}

function _bizRenderPaxSummary(){
  var months=_bizPaxMonths();
  if(!months.length)return '<div class="card" style="color:var(--text3);padding:24px">No pax data yet.</div>';
  var h='<div class="card"><div class="st">Pax summary — months gone by</div><p style="font-size:12px;color:var(--text3);margin:0 0 10px">Each month\'s pax vs the budget target and vs last year. Colour shows how we tracked.</p>';
  h+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:520px">';
  h+='<thead><tr style="background:var(--card2)">'+['Month','Pax','Target','% target','Last Yr','vs Last Yr'].map(function(t,i){return '<th style="text-align:'+(i===0?'left':'right')+';padding:7px 10px;font-size:10px;color:var(--text3)">'+t+'</th>';}).join('')+'</tr></thead><tbody>';
  var tP=0,tT=0,tL=0;
  months.forEach(function(ym){
    var pax=_bizMonthTot(ym,'p26'),ly=_bizMonthTot(ym,'p25'),target=_bizPaxTarget(ym);
    tP+=pax;tT+=(target||0);tL+=ly;
    var pctT=target?pax/target:null;var vsLy=ly?pax/ly:null;
    var ct=pctT!=null?_bizHeat(pctT,0.7,1.1):null;var cl=vsLy!=null?_bizHeat(vsLy,0.7,1.3):null;
    h+='<tr style="border-top:1px solid var(--border2)">'+
      '<td style="padding:5px 10px;font-weight:700;white-space:nowrap">'+_bizMonLabel(ym+'-01')+'</td>'+
      '<td style="padding:5px 10px;text-align:right;font-weight:700">'+pax+'</td>'+
      '<td style="padding:5px 10px;text-align:right;color:var(--text3)">'+(target!=null?target:'—')+'</td>'+
      '<td style="padding:5px 10px;text-align:right;font-weight:700'+(ct?';background:'+ct.bg+';color:'+ct.fg:'') +'">'+(pctT!=null?Math.round(pctT*100)+'%':'—')+'</td>'+
      '<td style="padding:5px 10px;text-align:right;color:var(--text3)">'+(ly||'—')+'</td>'+
      '<td style="padding:5px 10px;text-align:right;font-weight:700'+(cl?';background:'+cl.bg+';color:'+cl.fg:'')+'">'+(vsLy!=null?Math.round(vsLy*100)+'%':'—')+'</td>'+
      '</tr>';
  });
  h+='<tr style="border-top:2px solid var(--border);background:var(--card2);font-weight:800">'+
    '<td style="padding:7px 10px">Total</td><td style="padding:7px 10px;text-align:right">'+tP+'</td><td style="padding:7px 10px;text-align:right">'+Math.round(tT)+'</td>'+
    '<td style="padding:7px 10px;text-align:right">'+(tT?Math.round(tP/tT*100)+'%':'—')+'</td><td style="padding:7px 10px;text-align:right">'+tL+'</td><td style="padding:7px 10px;text-align:right">'+(tL?Math.round(tP/tL*100)+'%':'—')+'</td></tr>';
  h+='</tbody></table></div></div>';
  return h;
}

function _bizRenderPaxDaily(){
  var p=_bizState();var ym=S._bizPaxMonth||_bizDefaultPaxMonth();
  var y=+ym.slice(0,4),mo=+ym.slice(5,7);var daysIn=new Date(y,mo,0).getDate();
  var target=_bizPaxTarget(ym);var totT=(+target||0);
  var _inS='width:100%;font-size:12px;padding:4px 2px;border:1px solid var(--border2);border-radius:5px;background:var(--card);color:var(--text);text-align:center;box-sizing:border-box';
  var monLbl=new Date(y,mo-1,1).toLocaleDateString('en-NZ',{month:'long',year:'numeric'});
  var curMonth=_bizDefaultPaxMonth();var today=new Date();
  var h='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'+
    '<div style="display:flex;align-items:center;gap:6px"><button class="btn btn-ghost" style="font-size:13px;padding:4px 10px" onclick="window.bizPaxMonth(-1)">◁</button>'+
    '<span style="font-weight:700;font-size:14px;min-width:130px;text-align:center">'+monLbl+'</span>'+
    '<button class="btn btn-ghost" style="font-size:13px;padding:4px 10px" onclick="window.bizPaxMonth(1)">▶</button></div>'+
    '<button class="btn btn-ghost" style="font-size:12px;border-color:rgba(96,165,250,.5);color:#60a5fa" onclick="window.bizPaxSyncRezdy(\''+ym+'\')" title="Fill 26 Pax from Rezdy seats sold for this month">⟳ Sync seats sold</button></div>';
  // Fixed-width table (natural width from the colgroup) so headers, inputs and computed cells line up.
  var W=[78,62,60,72,62,64,72]; // Date,26 Pax,Accum,Tracking,Last Yr,Accum LY,Compare
  h+='<div class="card" style="padding:0;overflow-x:auto"><table style="border-collapse:collapse;font-size:12px;table-layout:fixed;width:'+W.reduce(function(a,b){return a+b;},0)+'px">';
  h+='<colgroup>'+W.map(function(w){return '<col style="width:'+w+'px">';}).join('')+'</colgroup>';
  h+='<thead><tr style="background:var(--card2)">'+['Date','26 Pax','Accum','Tracking','Last Yr','Accum LY','Compare'].map(function(t,i){return '<th style="text-align:'+(i===0?'left':'center')+';padding:6px 4px;font-size:9.5px;color:var(--text3);font-weight:700">'+t+'</th>';}).join('')+'</tr></thead><tbody>';
  var accum=0,runLy=0,daysElapsed=0,accumToday=0;
  var _tdy=(ym===curMonth)?today.getDate():(ym<curMonth?daysIn:0); // "today" within this month (0 = whole month ahead, daysIn = all past)
  for(var d=1;d<=daysIn;d++){
    var ds=ym+'-'+String(d).padStart(2,'0');var row=p.paxData[ds]||{};
    var p26=(+row.p26||0),ly=(+row.p25||0);accum+=p26;runLy+=ly;if(d<=_tdy)accumToday=accum;
    var isPast=(ym<curMonth)||(ym===curMonth&&d<=today.getDate());if(isPast)daysElapsed=d;
    var isToday=(ym===curMonth&&d===today.getDate());
    var isFuture=(ym>curMonth)||(ym===curMonth&&d>today.getDate()); // forward bookings — indicative, not confirmed
    var hasAny=row.p26!=null||row.p25!=null;
    var tracking=(totT&&hasAny)?(accum/totT)-(d/daysIn):null; // % of target reached − % of month elapsed
    var compare=runLy?accum/runLy:null;
    var ht=tracking!=null?_bizHeat(tracking,-0.15,0.15):null;
    var hc=compare!=null?_bizHeat(compare,0.7,1.3):null;
    var dow=new Date(y,mo-1,d).toLocaleDateString('en-NZ',{weekday:'short'});
    var rowStyle='border-top:1px solid var(--border2);'+(isToday?'background:rgba(124,58,237,.14);box-shadow:inset 3px 0 0 #7c3aed;':(isFuture?'opacity:.45;':''));
    h+='<tr style="'+rowStyle+'">'+
      '<td style="padding:3px 4px;white-space:nowrap;font-size:11px"><b>'+d+'</b> <span style="color:var(--text3)">'+dow+'</span>'+(isToday?' <span style="font-size:8.5px;color:#a78bfa;font-weight:800">TODAY</span>':'')+'</td>'+
      '<td style="padding:2px 3px"><input type="number" value="'+(row.p26!=null?row.p26:'')+'" onchange="window.bizSetPax(\''+ds+'\',\'p26\',this.value)" style="'+_inS+'"></td>'+
      '<td style="padding:3px 4px;text-align:center;font-weight:700">'+(accum||'')+'</td>'+
      '<td style="padding:3px 4px;text-align:center;font-weight:700'+(ht?';background:'+ht.bg+';color:'+ht.fg:';color:var(--text3)')+'">'+(tracking!=null?(tracking>=0?'+':'')+Math.round(tracking*100)+'%':'—')+'</td>'+
      '<td style="padding:2px 3px"><input type="number" value="'+(row.p25!=null?row.p25:'')+'" onchange="window.bizSetPax(\''+ds+'\',\'p25\',this.value)" style="'+_inS+'"></td>'+
      '<td style="padding:3px 4px;text-align:center;color:var(--text3)">'+(runLy||'')+'</td>'+
      '<td style="padding:3px 4px;text-align:center;font-weight:700'+(hc?';background:'+hc.bg+';color:'+hc.fg:';color:var(--text3)')+'">'+(compare!=null?Math.round(compare*100)+'%':'—')+'</td>'+
      '</tr>';
  }
  h+='</tbody></table></div>';
  // bottom figures — confirmed-to-today vs target
  var daysLeft=Math.max(0,daysIn-_tdy);                          // days remaining in the month (after today)
  var paxToTarget=totT?Math.max(0,totT-accumToday):null;          // target − pax accumulated up to today
  var paxPerDay=(paxToTarget!=null&&daysLeft>0)?Math.ceil(paxToTarget/daysLeft):(paxToTarget||0); // daily rate needed to hit target
  function fig(lbl,val,col){return '<div style="flex:1 1 120px;border:1px solid var(--border2);border-top:3px solid '+(col||'#7c3aed')+';border-radius:9px;padding:10px 12px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--text3);font-weight:700">'+lbl+'</div><div style="font-size:19px;font-weight:800;margin-top:2px">'+val+'</div></div>';}
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">'+
    fig('Pax/day needed',paxPerDay,'#60a5fa')+
    fig('Pax to target',(paxToTarget!=null?paxToTarget:'—'),'#f59e0b')+
    fig('Days left',daysLeft,'#ef4444')+
    fig('Target',(target!=null?target:'—'),'#22c55e')+
    '</div>';
  h+='<div style="font-size:11px;color:var(--text3);padding:6px 2px">Today is highlighted; <span style="opacity:.55">dimmed days are still to come — forward bookings, not yet confirmed flown</span>. Target comes from the FY budget for this month. Tracking = % of target reached − % of the month elapsed (green = ahead of pace). Compare = this year vs last year. "Sync seats sold" pulls 26 Pax from Rezdy bookings.</div>';
  return h;
}

function _bizRenderTimeline(){
  var t=_bizTimeline();
  if(!t.months.length)return '<div class="card" style="color:var(--text3);padding:24px">No loans to show — add some on the Loan schedules tab.</div>';
  var h='<div class="card"><div class="st">Loan timeline — total repayments per month</div><p style="font-size:12px;color:var(--text3);margin:0 0 0">Every loan\'s monthly payment (including lump-sum paydowns) consolidated into one cash-out schedule.</p></div>';
  // annual summary
  var byYear={};t.months.forEach(function(ym){var y=ym.slice(0,4);var tot=0;t.loans.forEach(function(l){tot+=(t.byMonth[ym][l.id]||0);});byYear[y]=(byYear[y]||0)+tot;});
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+Object.keys(byYear).sort().map(function(y){return '<div style="flex:0 1 auto;border:1px solid var(--border2);border-top:3px solid #7c3aed;border-radius:9px;padding:8px 12px"><div style="font-size:10px;color:var(--text3);font-weight:700">'+y+'</div><div style="font-size:15px;font-weight:800">'+_bizMoney(byYear[y])+'</div></div>';}).join('')+'</div>';
  h+='<div class="card" style="padding:0;overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:'+(220+t.loans.length*90)+'px">';
  h+='<thead><tr style="background:var(--card2)"><th style="text-align:left;padding:6px 8px;font-size:10px;color:var(--text3);position:sticky;left:0;background:var(--card2)">Month</th>'+
    t.loans.map(function(l){return '<th style="text-align:right;padding:6px 8px;font-size:10px;color:var(--text3);white-space:nowrap">'+_rzEscSafe(l.name)+'</th>';}).join('')+
    '<th style="text-align:right;padding:6px 8px;font-size:10px;color:var(--text3)">Total /mo</th></tr></thead><tbody>';
  t.months.forEach(function(ym){
    var tot=0;
    h+='<tr style="border-top:1px solid var(--border2)"><td style="padding:3px 8px;white-space:nowrap;position:sticky;left:0;background:var(--card)">'+_bizMonLabel(ym+'-01')+'</td>'+
      t.loans.map(function(l){var v=t.byMonth[ym][l.id]||0;tot+=v;return '<td style="padding:3px 8px;text-align:right;color:'+(v?'var(--text2)':'var(--text3)')+'">'+(v?_bizMoney(v):'—')+'</td>';}).join('')+
      '<td style="padding:3px 8px;text-align:right;font-weight:800;color:#f59e0b">'+_bizMoney(tot)+'</td></tr>';
  });
  h+='</tbody></table></div>';
  return h;
}

function _bizRenderRoster(){
  var p=_bizState();var _inS='width:80px;font-size:12px;padding:4px 5px;border:1px solid var(--border2);border-radius:5px;background:var(--card);color:var(--text);text-align:right;box-sizing:border-box';
  var totCur=p.payRates.reduce(function(s,r){return s+(+r.cur||0);},0),totNw=p.payRates.reduce(function(s,r){return s+(+r.nw||0);},0);
  var h='<div class="card"><div class="st">Staff pay rates <span style="font-weight:400;font-size:11px;color:var(--text3)">(daily rate, $)</span></div>';
  h+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;max-width:460px">';
  h+='<thead><tr style="background:var(--card2)"><th style="text-align:left;padding:7px 8px;font-size:10px;color:var(--text3)">Staff</th><th style="text-align:right;padding:7px 8px;font-size:10px;color:var(--text3)">Current</th><th style="text-align:right;padding:7px 8px;font-size:10px;color:var(--text3)">New rate</th><th></th></tr></thead><tbody>';
  p.payRates.forEach(function(r,i){
    var up=(+r.nw||0)>(+r.cur||0);
    h+='<tr style="border-top:1px solid var(--border2)">'+
      '<td style="padding:3px 6px"><input value="'+_rzEscSafe(r.code||'')+'" onchange="window.bizSetPay('+i+',\'code\',this.value)" style="'+_inS+';width:80px;text-align:left;font-weight:700"></td>'+
      '<td style="padding:3px 6px;text-align:right"><input type="number" step="2.5" value="'+(r.cur!==''?r.cur:'')+'" onchange="window.bizSetPay('+i+',\'cur\',this.value)" style="'+_inS+'"></td>'+
      '<td style="padding:3px 6px;text-align:right"><input type="number" step="2.5" value="'+(r.nw!==''?r.nw:'')+'" onchange="window.bizSetPay('+i+',\'nw\',this.value)" style="'+_inS+';'+(up?'color:#22c55e':'')+'"></td>'+
      '<td style="padding:3px 6px;text-align:center"><button onclick="window.bizDelPay('+i+')" style="background:none;border:none;color:#ef4444;cursor:pointer">✕</button></td>'+
      '</tr>';
  });
  h+='<tr style="border-top:2px solid var(--border);background:var(--card2);font-weight:800"><td style="padding:7px 8px">Total / day</td><td style="padding:7px 8px;text-align:right">'+_bizMoney(totCur)+'</td><td style="padding:7px 8px;text-align:right;color:#22c55e">'+_bizMoney(totNw)+'</td><td></td></tr>';
  h+='</tbody></table></div><div style="margin-top:8px"><button class="btn btn-ghost" style="font-size:12px" onclick="window.bizAddPay()">+ Add staff</button></div>';
  h+='<div style="font-size:11px;color:var(--text3);margin-top:6px">Daily rates; the "New rate" column is the post-raise figure. Total/day is the sum of all daily rates.</div></div>';
  return h;
}

function _bizRenderRunning(){
  var p=_bizState();var fuel=p.running.fuel;
  var _inS='width:100%;font-size:12px;padding:4px 5px;border:1px solid var(--border2);border-radius:5px;background:var(--card);color:var(--text);box-sizing:border-box';
  function _ph(n){return '$'+(+n||0).toLocaleString('en-NZ',{minimumFractionDigits:2,maximumFractionDigits:2});}
  var h='<div class="card"><div class="st">Running cost — cost per flight hour</div>'+
    '<p style="font-size:12px;color:var(--text3);margin:0 0 10px">Fuel $/hr = burn (L/hr) × fuel price. Maintenance $/hr = annual maintenance ÷ hours flown, plus engine &amp; prop overhaul reserves (cost ÷ interval hours).</p>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">'+
      '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">AvGas $/L</label><input type="number" step="0.01" value="'+(fuel.avgas!==''?fuel.avgas:'')+'" onchange="window.bizSetFuel(\'avgas\',this.value)" style="'+_inS+';width:90px;text-align:right"></div>'+
      '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Jet A1 $/L</label><input type="number" step="0.01" value="'+(fuel.jeta1!==''?fuel.jeta1:'')+'" onchange="window.bizSetFuel(\'jeta1\',this.value)" style="'+_inS+';width:90px;text-align:right"></div>'+
    '</div></div>';

  h+='<div class="card" style="padding:0;overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:860px">';
  h+='<thead><tr style="background:var(--card2)">'+
    ['AC','Type','Burn L/hr','Fuel','Hours/yr','Maint $/yr','Eng OH $','Eng int hr','Prop OH $','Prop int hr','Fuel/hr','Maint/hr','Total $/hr',''].map(function(t,i){return '<th style="text-align:'+(i<2?'left':'center')+';padding:6px 5px;font-size:9px;color:var(--text3);font-weight:700;white-space:nowrap">'+t+'</th>';}).join('')+
    '</tr></thead><tbody>';
  p.running.aircraft.forEach(function(ac,i){
    var c=_bizRunCalc(ac,fuel);
    var num=function(field,step,w){return '<td style="padding:2px 3px"><input type="number" step="'+(step||'1')+'" value="'+(ac[field]!==''&&ac[field]!=null?ac[field]:'')+'" onchange="window.bizSetRunAc('+i+',\''+field+'\',this.value)" style="'+_inS+';width:'+(w||56)+'px;text-align:right"></td>';};
    h+='<tr style="border-top:1px solid var(--border2)">'+
      '<td style="padding:2px 4px"><input value="'+_rzEscSafe(ac.code||'')+'" onchange="window.bizSetRunAc('+i+',\'code\',this.value)" style="'+_inS+';width:54px;font-weight:700"></td>'+
      '<td style="padding:2px 3px"><select onchange="window.bizSetRunAc('+i+',\'type\',this.value)" style="'+_inS+';width:64px"><option'+(ac.type==='C208'?' selected':'')+'>C208</option><option'+(ac.type==='GA8'?' selected':'')+'>GA8</option></select></td>'+
      num('burn','1',54)+
      '<td style="padding:2px 3px"><select onchange="window.bizSetRunAc('+i+',\'fuelType\',this.value)" style="'+_inS+';width:66px"><option value="jeta1"'+(ac.fuelType==='jeta1'?' selected':'')+'>Jet A1</option><option value="avgas"'+(ac.fuelType==='avgas'?' selected':'')+'>AvGas</option></select></td>'+
      num('hours','0.1',58)+num('maint','1000',74)+num('eoCost','1000',80)+num('eoInt','100',64)+num('propCost','1000',74)+num('propInt','100',64)+
      '<td style="padding:2px 5px;text-align:right;color:var(--text2)">'+_ph(c.fuelHr)+'</td>'+
      '<td style="padding:2px 5px;text-align:right;color:var(--text2)">'+_ph(c.maintHr)+'</td>'+
      '<td style="padding:2px 5px;text-align:right;font-weight:800;color:#f59e0b">'+_ph(c.totalHr)+'</td>'+
      '<td style="padding:2px 4px;text-align:center"><button onclick="window.bizDelRunAc('+i+')" title="Remove" style="background:none;border:none;color:#ef4444;cursor:pointer">✕</button></td>'+
      '</tr>';
  });
  h+='</tbody></table></div>';
  h+='<div style="margin:4px 0 12px"><button class="btn btn-ghost" style="font-size:12px" onclick="window.bizAddRunAc()">+ Add aircraft</button></div>';

  // type averages
  function avg(type,key){var list=p.running.aircraft.filter(function(a){return a.type===type;});if(!list.length)return 0;return list.reduce(function(s,a){return s+_bizRunCalc(a,fuel)[key];},0)/list.length;}
  function avgCard(type){var t=avg(type,'totalHr');if(!t)return '';return '<div style="flex:1 1 200px;border:1px solid var(--border2);border-top:3px solid #22c55e;border-radius:10px;padding:12px 14px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700">Average '+type+' cost/hr</div><div style="font-size:20px;font-weight:800;color:#22c55e;margin-top:2px">'+_ph(t)+'</div><div style="font-size:10px;color:var(--text3);margin-top:2px">fuel '+_ph(avg(type,'fuelHr'))+' + maint '+_ph(avg(type,'maintHr'))+'</div></div>';}
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap">'+avgCard('C208')+avgCard('GA8')+'</div>';
  h+='<div style="font-size:11px;color:var(--text3);padding:6px 2px">Total $/hr is the direct cost of flying that aircraft one hour (fuel + maintenance + overhaul reserves) — the basis for tour pricing. Insurance, finance, pilot &amp; training costs sit in the P&amp;L, not here.</div>';
  return h;
}

function _bizRenderLoans(){
  var p=_bizState();
  var _inS='width:100%;font-size:12px;padding:5px 6px;border:1px solid var(--border2);border-radius:5px;background:var(--card);color:var(--text);box-sizing:border-box';
  // headline: total monthly across all loans (at their first post-IO P&I, i.e. once amortising)
  var totMonthly=0,totInterest=0,totPrincipal=0;
  p.loans.forEach(function(l){var s=_bizLoanSchedule(l);totMonthly+=s.firstPI||0;totInterest+=s.totalInterest;totPrincipal+=(+l.principal||0);});
  var h='<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><div class="st" style="margin-bottom:0">Loan schedules</div>'+
    '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">Each loan amortises month-by-month. Set an interest-only period and lump-sum paydowns — the schedule re-amortises after each paydown.</p></div></div></div>';
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">'+
    '<div style="flex:1 1 160px;border:1px solid var(--border2);border-top:3px solid #7c3aed;border-radius:10px;padding:12px 14px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700">Total borrowed</div><div style="font-size:20px;font-weight:800;margin-top:2px">'+_bizMoney(totPrincipal)+'</div></div>'+
    '<div style="flex:1 1 160px;border:1px solid var(--border2);border-top:3px solid #f59e0b;border-radius:10px;padding:12px 14px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700">Monthly (amortising)</div><div style="font-size:20px;font-weight:800;margin-top:2px">'+_bizMoney(totMonthly)+'</div></div>'+
    '<div style="flex:1 1 160px;border:1px solid var(--border2);border-top:3px solid #ef4444;border-radius:10px;padding:12px 14px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700">Total interest</div><div style="font-size:20px;font-weight:800;margin-top:2px">'+_bizMoney(totInterest)+'</div></div>'+
    '</div>';

  p.loans.forEach(function(l,i){
    var s=_bizLoanSchedule(l);var open=S._bizSchedOpen===l.id;
    h+='<div class="card">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px">'+
      '<input value="'+_rzEscSafe(l.name||'')+'" onchange="window.bizSetLoan('+i+',\'name\',this.value)" style="'+_inS+';max-width:220px;font-weight:700">'+
      '<div style="display:flex;gap:6px"><button class="btn btn-ghost" style="font-size:12px" onclick="window.bizToggleSched(\''+l.id+'\')">'+(open?'Hide schedule':'View schedule')+'</button><button onclick="window.bizDelLoan('+i+')" title="Remove loan" style="background:none;border:1px solid var(--border2);border-radius:6px;color:#ef4444;cursor:pointer;font-size:12px;padding:4px 8px">✕</button></div>'+
      '</div>';
    // inputs
    h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:8px">'+
      _bizFld('Principal','<input type="number" step="1000" value="'+(l.principal!==''?l.principal:'')+'" onchange="window.bizSetLoan('+i+',\'principal\',this.value)" style="'+_inS+';text-align:right">')+
      _bizFld('Rate %','<input type="number" step="0.01" value="'+(l.rate!==''?l.rate:'')+'" onchange="window.bizSetLoan('+i+',\'rate\',this.value)" style="'+_inS+';text-align:center">')+
      _bizFld('Term (yr)','<input type="number" step="1" value="'+(l.term!==''?l.term:'')+'" onchange="window.bizSetLoan('+i+',\'term\',this.value)" style="'+_inS+';text-align:center">')+
      _bizFld('Start','<input type="month" value="'+_rzEscSafe(String(l.start||'').slice(0,7))+'" onchange="window.bizSetLoan('+i+',\'start\',this.value+\'-01\')" style="'+_inS+'">')+
      _bizFld('Interest-only (mo)','<input type="number" step="1" value="'+(l.ioMonths!==''?l.ioMonths:'')+'" onchange="window.bizSetLoan('+i+',\'ioMonths\',this.value)" style="'+_inS+';text-align:center">')+
      '</div>';
    // computed summary
    h+='<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--text2);margin-bottom:6px">'+
      '<span>Amortising payment: <b style="color:#f59e0b">'+_bizMoney2(s.firstPI)+'</b>/mo</span>'+
      '<span>Payments: <b>'+s.nPayments+'</b></span>'+
      '<span>Total interest: <b style="color:#ef4444">'+_bizMoney(s.totalInterest)+'</b></span>'+
      '<span>Total cost: <b>'+_bizMoney(s.totalCost)+'</b></span>'+
      '</div>';
    // paydowns
    h+='<div style="border-top:1px solid var(--border2);padding-top:8px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700;margin-bottom:4px">Lump-sum paydowns</div>';
    (l.paydowns||[]).forEach(function(pdw,j){
      h+='<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px"><input type="month" value="'+_rzEscSafe(String(pdw.date||'').slice(0,7))+'" onchange="window.bizSetPaydown('+i+','+j+',\'date\',this.value+\'-01\')" style="'+_inS+';max-width:140px"><input type="number" step="1000" value="'+(pdw.amount!==''?pdw.amount:'')+'" onchange="window.bizSetPaydown('+i+','+j+',\'amount\',this.value)" style="'+_inS+';max-width:140px;text-align:right" placeholder="amount"><button onclick="window.bizDelPaydown('+i+','+j+')" style="background:none;border:none;color:#ef4444;cursor:pointer">✕</button></div>';
    });
    h+='<button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" onclick="window.bizAddPaydown('+i+')">+ Add paydown</button></div>';
    // schedule table (collapsible)
    if(open){
      h+='<div style="overflow-x:auto;margin-top:10px"><table style="width:100%;border-collapse:collapse;font-size:11px;min-width:520px">'+
        '<thead><tr style="background:var(--card2)">'+['#','Month','Payment','Principal','Interest','Paydown','Balance'].map(function(t,k){return '<th style="text-align:'+(k<2?'left':'right')+';padding:5px 7px;font-size:10px;color:var(--text3)">'+t+'</th>';}).join('')+'</tr></thead><tbody>';
      s.rows.forEach(function(r){
        h+='<tr style="border-top:1px solid var(--border2)">'+
          '<td style="padding:3px 7px;color:var(--text3)">'+r.m+'</td>'+
          '<td style="padding:3px 7px">'+_bizMonLabel(r.date)+'</td>'+
          '<td style="padding:3px 7px;text-align:right">'+_bizMoney(r.payment)+'</td>'+
          '<td style="padding:3px 7px;text-align:right;color:var(--text2)">'+_bizMoney(r.principal)+'</td>'+
          '<td style="padding:3px 7px;text-align:right;color:var(--text2)">'+_bizMoney(r.interest)+'</td>'+
          '<td style="padding:3px 7px;text-align:right;color:'+(r.extra?'#7c3aed':'var(--text3)')+'">'+(r.extra?_bizMoney(r.extra):'—')+'</td>'+
          '<td style="padding:3px 7px;text-align:right;font-weight:700">'+_bizMoney(r.balance)+'</td>'+
          '</tr>';
      });
      h+='</tbody></table></div>';
    }
    h+='</div>';
  });
  h+='<div style="margin:4px 0 14px"><button class="btn btn-ghost" style="font-size:12px" onclick="window.bizAddLoan()">+ Add loan</button></div>';
  h+='<div style="font-size:11px;color:var(--text3);padding:4px 2px">Interest-only months pay only interest (balance flat); after that the remaining balance amortises over the rest of the term. A paydown re-amortises the lower balance from the next month.</div>';
  return h;
}
function _bizFld(lbl,inner){return '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">'+lbl+'</label>'+inner+'</div>';}

function _bizComingSoon(t){
  return '<div class="card" style="text-align:center;padding:48px 24px;color:var(--text3)">'+
    '<div style="font-size:34px;margin-bottom:8px">📊</div>'+
    '<div style="font-size:16px;font-weight:700;color:var(--text2);margin-bottom:6px">'+_rzEscSafe((t&&t.lbl)||'')+'</div>'+
    '<div style="font-size:13px;max-width:460px;margin:0 auto;line-height:1.5">This sheet from the workbook will be built out next. A few formulas need confirming first (e.g. the loan schedule’s interest-only period &amp; lump-sum paydowns, the budget’s per-aircraft departure allocation, and the P&amp;L line detail).</div>'+
  '</div>';
}

function _bizRenderMainPlan(){
  var p=_bizState();
  var totAmt=0,totInt=0,totPrin=0,totMon=0,totAnn=0;
  p.tranches.forEach(function(t){var c=_bizMonthly(t);totAmt+=+t.amount||0;totInt+=c.interest;totPrin+=c.principal;totMon+=c.monthly;totAnn+=c.monthly*12;});
  var assetTot=p.assets.reduce(function(s,a){return s+(+a.value||0);},0);

  var h='<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><div class="st" style="margin-bottom:0">TSF Acquisition — Scenario 1</div>'+
    '<p style="font-size:12px;color:var(--text3);margin:2px 0 0">Edit any input (amount, rate, type, term) and the interest, repayments and totals recompute live.</p></div>'+
    '<button class="btn btn-ghost" style="font-size:12px" onclick="window.bizReset()">↺ Reset to spreadsheet</button></div></div>';

  // headline tiles
  function tile(lbl,val,col){return '<div style="flex:1 1 150px;border:1px solid var(--border2);border-top:3px solid '+(col||'var(--accent)')+';border-radius:10px;padding:12px 14px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700">'+lbl+'</div><div style="font-size:20px;font-weight:800;color:var(--text1);margin-top:2px">'+val+'</div></div>';}
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">'+
    tile('Total financed',_bizMoney(totAmt),'#7c3aed')+
    tile('Monthly repayments',_bizMoney(totMon),'#f59e0b')+
    tile('Annual repayments',_bizMoney(totAnn),'#ef4444')+
    tile('Asset value',_bizMoney(assetTot),'#22c55e')+
    '</div>';

  // financing table
  var _inS='width:100%;font-size:12px;padding:5px 6px;border:1px solid var(--border2);border-radius:5px;background:var(--card);color:var(--text);box-sizing:border-box';
  h+='<div class="card" style="padding:0;overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:720px">';
  h+='<thead><tr style="background:var(--card2)">'+
    ['Facility','Financed amount','Rate %','Type','Term (yr)','Interest /mo','Principal /mo','Monthly','Annual',''].map(function(t,i){return '<th style="text-align:'+(i===0?'left':'center')+';padding:8px 8px;font-size:10px;color:var(--text3);font-weight:700">'+t+'</th>';}).join('')+
    '</tr></thead><tbody>';
  p.tranches.forEach(function(t,i){
    var c=_bizMonthly(t);
    h+='<tr style="border-top:1px solid var(--border2)">'+
      '<td style="padding:4px 6px"><input value="'+_rzEscSafe(t.name||'')+'" onchange="window.bizSetTranche('+i+',\'name\',this.value)" style="'+_inS+'"></td>'+
      '<td style="padding:4px 6px"><input type="number" step="1000" value="'+(t.amount!==''?t.amount:'')+'" onchange="window.bizSetTranche('+i+',\'amount\',this.value)" style="'+_inS+';text-align:right"></td>'+
      '<td style="padding:4px 6px"><input type="number" step="0.01" value="'+(t.rate!==''?t.rate:'')+'" onchange="window.bizSetTranche('+i+',\'rate\',this.value)" style="'+_inS+';text-align:center"></td>'+
      '<td style="padding:4px 6px"><select onchange="window.bizSetTranche('+i+',\'type\',this.value)" style="'+_inS+'"><option value="io"'+(t.type==='io'?' selected':'')+'>Interest only</option><option value="pi"'+(t.type==='pi'?' selected':'')+'>P &amp; I</option></select></td>'+
      '<td style="padding:4px 6px"><input type="number" step="1" value="'+(t.term!==''?t.term:'')+'" onchange="window.bizSetTranche('+i+',\'term\',this.value)" style="'+_inS+';text-align:center"'+(t.type==='io'?' title="Used for the amortising P&I calc"':'')+'></td>'+
      '<td style="padding:4px 6px;text-align:right;color:var(--text2)">'+_bizMoney2(c.interest)+'</td>'+
      '<td style="padding:4px 6px;text-align:right;color:var(--text2)">'+(c.principal?_bizMoney2(c.principal):'—')+'</td>'+
      '<td style="padding:4px 6px;text-align:right;font-weight:700;color:#f59e0b">'+_bizMoney2(c.monthly)+'</td>'+
      '<td style="padding:4px 6px;text-align:right;font-weight:700;color:var(--text1)">'+_bizMoney(c.monthly*12)+'</td>'+
      '<td style="padding:4px 6px;text-align:center"><button onclick="window.bizDelTranche('+i+')" title="Remove" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px">✕</button></td>'+
      '</tr>';
  });
  h+='<tr style="border-top:2px solid var(--border);background:var(--card2);font-weight:800">'+
    '<td style="padding:7px 8px">Total</td>'+
    '<td style="padding:7px 6px;text-align:right">'+_bizMoney(totAmt)+'</td><td></td><td></td><td></td>'+
    '<td style="padding:7px 6px;text-align:right">'+_bizMoney2(totInt)+'</td>'+
    '<td style="padding:7px 6px;text-align:right">'+(totPrin?_bizMoney2(totPrin):'—')+'</td>'+
    '<td style="padding:7px 6px;text-align:right;color:#f59e0b">'+_bizMoney2(totMon)+'</td>'+
    '<td style="padding:7px 6px;text-align:right;color:#ef4444">'+_bizMoney(totAnn)+'</td><td></td>'+
    '</tr>';
  h+='</tbody></table></div>';
  h+='<div style="margin:6px 0 14px"><button class="btn btn-ghost" style="font-size:12px" onclick="window.bizAddTranche()">+ Add facility</button></div>';

  // asset register
  h+='<div class="card"><div class="st">Asset valuation</div>';
  h+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:340px;max-width:520px">';
  h+='<thead><tr style="background:var(--card2)"><th style="text-align:left;padding:7px 8px;font-size:10px;color:var(--text3);font-weight:700">Asset</th><th style="text-align:right;padding:7px 8px;font-size:10px;color:var(--text3);font-weight:700">Value</th><th></th></tr></thead><tbody>';
  p.assets.forEach(function(a,i){
    h+='<tr style="border-top:1px solid var(--border2)">'+
      '<td style="padding:4px 6px"><input value="'+_rzEscSafe(a.name||'')+'" onchange="window.bizSetAsset('+i+',\'name\',this.value)" style="'+_inS+'"></td>'+
      '<td style="padding:4px 6px"><input type="number" step="0.01" value="'+(a.value!==''?a.value:'')+'" onchange="window.bizSetAsset('+i+',\'value\',this.value)" style="'+_inS+';text-align:right"></td>'+
      '<td style="padding:4px 6px;text-align:center"><button onclick="window.bizDelAsset('+i+')" title="Remove" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px">✕</button></td>'+
      '</tr>';
  });
  h+='<tr style="border-top:2px solid var(--border);background:var(--card2);font-weight:800"><td style="padding:7px 8px">Total</td><td style="padding:7px 8px;text-align:right;color:#22c55e">'+_bizMoney2(assetTot)+'</td><td></td></tr>';
  h+='</tbody></table></div><div style="margin-top:8px"><button class="btn btn-ghost" style="font-size:12px" onclick="window.bizAddAsset()">+ Add asset</button></div></div>';

  // notes
  h+='<div class="card"><div class="st">Notes</div><textarea onchange="window.bizSetNotes(this.value)" style="width:100%;min-height:70px;font-size:13px;padding:8px;border:1px solid var(--border2);border-radius:7px;background:var(--card);color:var(--text);box-sizing:border-box;resize:vertical">'+_rzEscSafe(p.notes||'')+'</textarea></div>';

  h+='<div style="font-size:11px;color:var(--text3);padding:4px 2px">Confidential — visible only to those with the Business Plan permission. Interest only = amount × rate ÷ 12; P&amp;I = standard amortising payment over the term.</div>';
  return h;
}
// Safe escape (mirrors flightduty.js).
function _bizEscSafe(s){return _rzEscSafe(s);}

// P&L seed (FY26 + FY25) extracted from the workbook — monthly Apr→Mar.
function _bizPnlDefault(){return [{"id":"fy26pl","label":"FY26","startYM":"2024-04","basis":"Forecast \u2014 year ended 31 Mar 2026","ti":[522948.0,271435.0,410622.0,399975.0,402362.0,394459.0,606145.0,619369.0,748606.0,956269.0,806862.0,766519.0],"pax":[1064.0,548.0,821.0,822.0,822.0,821.0,1096.0,1125.0,1333.0,1689.0,1443.0,1370.0],"cos":[{"label":"Activity Costs","vals":[33942.0,17617.0,26651.0,25960.0,26115.0,25602.0,39341.0,40200.0,48588.0,62068.0,52369.0,49750.0]},{"label":"Agents Commission","vals":[3857.0,2002.0,3028.0,2950.0,2967.0,2909.0,4470.0,4568.0,5521.0,7053.0,5951.0,5653.0]},{"label":"Aircraft Tracking","vals":[1612.0,837.0,1266.0,1233.0,1240.0,1216.0,1868.0,1909.0,2308.0,2948.0,2487.0,2363.0]},{"label":"Aviation Fuel","vals":[58616.0,30424.0,46026.0,44832.0,45100.0,44214.0,67941.0,69424.0,83909.0,107189.0,90439.0,85917.0]},{"label":"Cash Commission","vals":[8420.0,4370.0,6611.0,6440.0,6478.0,6351.0,9759.0,9972.0,12053.0,15397.0,12991.0,12341.0]},{"label":"Credit Card Charges","vals":[7463.0,3874.0,5860.0,5708.0,5742.0,5630.0,8651.0,8839.0,10684.0,13648.0,11515.0,10939.0]},{"label":"Cruise Costs","vals":[62423.0,32400.0,49015.0,47744.0,48029.0,47085.0,72354.0,73932.0,89359.0,114150.0,96313.0,91497.0]},{"label":"Landing Fees","vals":[28801.0,14949.0,22615.0,22028.0,22160.0,21725.0,33383.0,34111.0,41229.0,52668.0,44438.0,42216.0]},{"label":"Lunch Purchases","vals":[475.0,247.0,373.0,363.0,366.0,358.0,551.0,563.0,680.0,869.0,733.0,697.0]},{"label":"Marketing","vals":[3488.0,1810.0,2739.0,2668.0,2684.0,2631.0,4043.0,4131.0,4993.0,6378.0,5381.0,5112.0]},{"label":"Subload Expense","vals":[8594.0,4461.0,6748.0,6573.0,6612.0,6482.0,9961.0,10179.0,12302.0,15715.0,13260.0,12597.0]},{"label":"Taxi","vals":[2077.0,1078.0,1631.0,1589.0,1598.0,1567.0,2408.0,2461.0,2974.0,3799.0,3205.0,3045.0]}],"opex":[{"label":"ACC Levy","vals":[0,0,0,17277.0,10769.0,0,0,0,0,0,0,0]},{"label":"Accountancy Fees","vals":[0,0,71.0,142.0,755.0,74.0,0,80.0,0,3000.0,0,0]},{"label":"Advertising","vals":[3165.0,14640.0,594.0,3094.0,1474.0,1718.0,2034.0,976.0,1473.0,1890.0,1890.0,1890.0]},{"label":"Bank Charges","vals":[126.0,107.0,69.0,69.0,69.0,82.0,69.0,74.0,69.0,72.0,72.0,72.0]},{"label":"CAA","vals":[0,6040.0,0,1690.0,1941.0,0,0,2806.0,0,0,0,0]},{"label":"Computer Expenses","vals":[0,0,0,0,0,0,416.0,0,923.0,0,0,0]},{"label":"Donations","vals":[3000.0,0,0,0,0,0,0,0,0,0,0,0]},{"label":"Eftpos Fees","vals":[65.0,65.0,65.0,65.0,65.0,65.0,65.0,65.0,65.0,65.0,65.0,65.0]},{"label":"Exchange Rate Variation","vals":[0,0,8.0,0,0,0,0,0,0,0,0,0]},{"label":"General Expenses","vals":[1063.0,263.0,1913.0,490.0,225.0,195.0,280.0,50.0,1398.0,434.0,434.0,434.0]},{"label":"Insurance","vals":[4549.0,4549.0,4549.0,3923.0,0,0,0,2861.0,2861.0,2861.0,2861.0,2861.0]},{"label":"Licenses & Registrations","vals":[746.0,724.0,134.0,0,0,1885.0,13325.0,0,639.0,0,0,0]},{"label":"Light, Power & Heating","vals":[69.0,64.0,86.0,52.0,62.0,56.0,767.0,61.0,1037.0,675.0,675.0,675.0]},{"label":"Medicals","vals":[0,0,374.0,0,336.0,0,2860.0,0,0,0,0,0]},{"label":"Met Service","vals":[150.0,85.0,85.0,150.0,150.0,150.0,0,150.0,150.0,150.0,150.0,150.0]},{"label":"Motor Vehicle Expenses","vals":[0,0,1042.0,-1042.0,1042.0,0,150.0,0,0,0,0,0]},{"label":"Plant & Equipment Hire","vals":[657.0,679.0,657.0,679.0,679.0,657.0,679.0,657.0,0,0,0,0]},{"label":"Printing & Stationery","vals":[1062.0,0,305.0,275.0,297.0,129.0,253.0,98.0,85.0,250.0,250.0,200.0]},{"label":"Rent","vals":[6137.0,6137.0,10477.0,8222.0,9070.0,13568.0,10448.0,10448.0,10448.0,10448.0,10448.0,10448.0]},{"label":"Repairs & Maintenance","vals":[0,870.0,0,659.0,1240.0,1139.0,165.0,0,270.0,200.0,200.0,200.0]},{"label":"Repairs & Maintenance - Aircraft","vals":[56226.0,33343.0,28180.0,4885.0,47080.0,23384.0,4715.0,7536.0,92331.0,45651.0,30000.0,30000.0]},{"label":"Staff Training","vals":[0,0,0,0,0,1870.0,0,815.0,211.0,0,0,0]},{"label":"Subcontractors","vals":[0,0,0,0,0,3598.0,6596.0,7995.0,7396.0,10000.0,4000.0,3000.0]},{"label":"Subscriptions","vals":[2190.0,8648.0,330.0,5366.0,3455.0,629.0,1630.0,793.0,320.0,609.0,609.0,609.0]},{"label":"Telephone, Tolls & Internet","vals":[1449.0,302.0,1126.0,1006.0,905.0,924.0,1445.0,1291.0,1246.0,1283.0,1283.0,1283.0]},{"label":"Travel Local","vals":[0,0,0,0,0,115.0,0,0,0,0,0,0]},{"label":"Uniform","vals":[361.0,2068.0,0,0,342.0,0,1837.0,0,0,0,0,0]},{"label":"Vehicle Expenses","vals":[766.0,944.0,732.0,536.0,1118.0,466.0,662.0,1117.0,1119.0,744.0,744.0,744.0]},{"label":"Wages & Salaries","vals":[80269.6,103295.0,60779.0,73046.0,103897.0,58368.0,75910.0,61555.0,64687.0,85021.0,78349.0,78349.0]},{"label":"Website Adwords","vals":[2000.0,1000.0,2569.0,2906.0,2460.0,1112.0,1955.0,1996.0,1751.0,0,1000.0,3507.0]},{"label":"Website exepenses","vals":[4302.6,3390.0,1199.0,5376.0,5332.0,4188.0,4137.0,757.0,3742.0,5857.0,5672.0,5800.0]}]},{"id":"fy25pl","label":"FY25","startYM":"2024-04","basis":"Year ended 31 Mar 2025","ti":[252250.0,256697.0,274565.0,365492.0,222828.0,192258.0,315454.0,494179.0,607581.0,832038.0,630720.0,714816.0],"pax":[568.0,548.0,528.0,677.0,441.0,441.0,536.0,1018.0,1221.0,1624.0,1209.0,1370.0],"cos":[{"label":"Activity Costs","vals":[9403.0,15634.0,14751.0,52583.0,9982.0,13026.0,22443.0,30285.0,25391.0,54003.0,40936.0,46395.0]},{"label":"Agents Commission","vals":[854.0,337.0,1611.0,1266.0,3367.0,4405.0,665.0,6714.0,6278.0,1040.0,5394.0,6114.0]},{"label":"Aircraft Lease - Caravan","vals":[0,0,0,0,0,0,0,0,0,0,31821.0,60460.0]},{"label":"Aircraft Tracking","vals":[1273.0,1247.0,1256.0,1291.4,1218.0,322.9,636.0,929.0,1017.0,2565.0,1944.0,2203.0]},{"label":"Aviation Fuel","vals":[32845.0,43345.0,25374.0,50090.4,32636.0,16914.6,37019.0,43097.0,52847.0,93261.0,70696.0,80122.0]},{"label":"Cash Commission","vals":[3000.0,3000.0,6000.0,9000.4,3000.0,2999.6,11000.0,7000.0,3000.0,13396.0,10155.0,11509.0]},{"label":"Credit Card Charges","vals":[3564.0,2526.0,3487.0,4958.0,3633.0,4629.6,6638.0,7219.0,5892.0,11874.0,9001.0,10202.0]},{"label":"Cruise Costs","vals":[10045.0,47954.0,31260.0,39264.4,23119.0,18017.6,29118.0,65392.0,91699.0,99318.0,75287.0,85325.0]},{"label":"Landing Fees","vals":[13526.0,16365.0,14713.0,10817.4,13904.0,9548.0,20679.0,28871.0,35771.0,45824.0,34737.0,39368.0]},{"label":"Lunch Purchases","vals":[0,341.0,22.0,219.0,5.0,2002.0,0,0,121.0,756.0,573.0,650.0]},{"label":"Marketing","vals":[109.0,245.0,0,82.0,2403.0,0,5042.0,7973.0,4030.0,5549.0,4207.0,4767.0]},{"label":"Subload Expense","vals":[13209.0,6304.0,0,5348.0,2557.4,3737.0,2190.6,5005.0,10643.4,13673.4,10365.0,11746.7]},{"label":"Taxi","vals":[498.0,656.0,1367.0,2292.0,643.4,837.0,495.6,1810.0,3246.4,3305.4,2506.0,2839.7]}],"opex":[{"label":"ACC Levy","vals":[0,0,0,17277.0,10769.0,0,0,0,0,0,0,0]},{"label":"Accountancy Fees","vals":[0,0,71.0,142.0,755.0,74.0,0,80.0,0,3000.0,0,0]},{"label":"Advertising","vals":[3165.0,14640.0,594.0,3094.0,1474.0,1718.0,2034.0,976.0,1473.0,1890.0,1890.0,1890.0]},{"label":"Bank Charges","vals":[126.0,107.0,69.0,69.0,69.0,82.0,69.0,74.0,69.0,72.0,72.0,72.0]},{"label":"CAA","vals":[0,6040.0,0,1690.0,1941.0,0,0,2806.0,0,0,0,0]},{"label":"Computer Expenses","vals":[0,0,0,0,0,0,416.0,0,923.0,0,0,0]},{"label":"Donations","vals":[3000.0,0,0,0,0,0,0,0,0,0,0,0]},{"label":"EFTPOS Fees","vals":[65.0,65.0,65.0,65.0,65.0,65.0,65.0,65.0,65.0,65.0,65.0,65.0]},{"label":"Exchange Rate Variation","vals":[0,0,8.0,0,0,0,0,0,0,0,0,0]},{"label":"General Expenses","vals":[1063.0,263.0,1913.0,490.0,225.0,195.0,280.0,50.0,1398.0,434.0,434.0,434.0]},{"label":"Insurance","vals":[4549.0,4549.0,4549.0,3923.0,0,0,13325.0,2861.0,2861.0,2861.0,2861.0,2861.0]},{"label":"Licenses & Registrations","vals":[746.0,724.0,134.0,0,0,1885.0,767.0,0,639.0,0,0,0]},{"label":"Light, Power & Heating","vals":[69.0,64.0,86.0,52.0,62.0,56.0,2860.0,61.0,1037.0,675.0,675.0,675.0]},{"label":"Medicals","vals":[0,0,374.0,0,366.0,0,0,0,0,0,0,0]},{"label":"Met Service","vals":[150.0,85.0,85.0,150.0,150.0,150.0,150.0,150.0,150.0,150.0,150.0,150.0]},{"label":"Motor Vehicle Expenses","vals":[0,0,1042.0,-1042.0,1042.0,0,0,0,0,0,0,0]},{"label":"Plant & Equipment Hire","vals":[657.0,679.0,657.0,679.0,679.0,657.0,679.0,657.0,0,0,0,0]},{"label":"Printing & Stationery","vals":[1062.0,0,305.0,275.0,297.0,129.0,253.0,98.0,85.0,250.0,250.0,200.0]},{"label":"Rent","vals":[6137.0,6137.0,10477.0,8222.0,9070.0,13568.0,10448.0,10448.0,10448.0,10448.0,10448.0,10448.0]},{"label":"Repairs & Maintenance","vals":[0,870.0,0,659.0,1240.0,1139.0,165.0,0,270.0,200.0,200.0,200.0]},{"label":"Repairs & Maintenance - Aircraft","vals":[56226.0,33343.0,28180.0,4885.0,47080.0,23384.0,4715.0,7536.0,92331.0,45651.0,30000.0,30000.0]},{"label":"Staff Training","vals":[0,0,0,0,0,1870.0,0,815.0,211.0,0,0,0]},{"label":"Subcontractors","vals":[0,0,0,0,0,3598.0,6596.0,7995.0,7396.0,10000.0,4000.0,3000.0]},{"label":"Subscriptions","vals":[2190.0,8648.0,330.0,5366.0,3455.0,629.0,1630.0,793.0,320.0,609.0,609.0,609.0]},{"label":"Telephone, Tolls & Internet","vals":[1449.0,302.0,1126.0,1006.0,905.0,924.0,1445.0,1291.0,1246.0,1283.0,1283.0,1283.0]},{"label":"Tracel Local","vals":[0,0,0,0,0,115.0,0,0,0,0,0,0]},{"label":"Uniform","vals":[361.0,2068.0,0,0,342.0,0,1837.0,0,0,0,0,0]},{"label":"Vehicle Expenses","vals":[766.0,944.0,732.0,536.0,1118.0,466.0,662.0,1117.0,1119.0,744.0,744.0,744.0]},{"label":"Wages & Salaries","vals":[80270.0,103295.0,60779.0,73046.0,103897.0,58368.0,75910.0,61555.0,64687.0,85021.0,78349.0,78349.0]},{"label":"Website Adwords","vals":[2000.0,1000.0,2569.0,2906.0,2460.0,1112.0,1955.0,1996.0,1751.0,0,1000.0,3507.0]},{"label":"Website Expenses","vals":[4303.0,3390.0,1199.0,5376.0,5332.0,4188.0,4137.0,757.0,3742.0,5857.0,5672.0,5800.0]}]}];}

// Pax tracker historical seed (daily 26 Pax / Last-Yr) from the Pax Carried sheet, Jun 2025+.
function _bizPaxDefault(){return {"2025-06-01":{"p26":31},"2025-06-02":{"p25":32},"2025-06-03":{"p25":17},"2025-06-04":{"p25":21},"2025-06-05":{"p26":9,"p25":22},"2025-06-06":{"p26":12,"p25":20},"2025-06-07":{"p26":39,"p25":15},"2025-06-08":{"p26":28,"p25":24},"2025-06-09":{"p26":18},"2025-06-10":{"p26":27,"p25":13},"2025-06-11":{"p26":11,"p25":19},"2025-06-12":{"p26":15,"p25":20},"2025-06-13":{"p26":21},"2025-06-14":{"p26":18},"2025-06-15":{"p26":18},"2025-06-16":{"p26":34,"p25":18},"2025-06-17":{"p26":36,"p25":19},"2025-06-18":{"p26":36},"2025-06-19":{"p25":30},"2025-06-20":{"p26":4,"p25":8},"2025-06-21":{"p26":41},"2025-06-23":{"p26":29,"p25":19},"2025-06-24":{"p26":11,"p25":19},"2025-06-25":{"p25":2},"2025-06-26":{"p25":35},"2025-06-27":{"p26":28,"p25":29},"2025-06-29":{"p26":49,"p25":38},"2025-06-30":{"p26":33},"2025-07-01":{"p26":38},"2025-07-02":{"p26":41,"p25":13},"2025-07-03":{"p25":19},"2025-07-04":{"p26":44,"p25":57},"2025-07-05":{"p26":47,"p25":11},"2025-07-06":{"p26":4,"p25":50},"2025-07-07":{"p26":52,"p25":39},"2025-07-08":{"p26":52,"p25":32},"2025-07-09":{"p25":40},"2025-07-10":{"p26":4,"p25":35},"2025-07-11":{"p26":30,"p25":36},"2025-07-12":{"p25":41},"2025-07-13":{"p25":31},"2025-07-14":{"p26":49,"p25":25},"2025-07-15":{"p25":25},"2025-07-16":{"p26":84},"2025-07-17":{"p26":61,"p25":27},"2025-07-18":{"p26":9,"p25":46},"2025-07-19":{"p26":57,"p25":9},"2025-07-20":{"p26":46},"2025-07-21":{"p26":38,"p25":23},"2025-07-22":{"p26":42,"p25":15},"2025-07-23":{"p26":31,"p25":35},"2025-07-24":{"p26":42,"p25":22},"2025-07-25":{"p26":36,"p25":36},"2025-07-27":{"p26":25},"2025-07-30":{"p26":55},"2025-07-31":{"p26":42},"2025-08-01":{"p26":46,"p25":41},"2025-08-02":{"p26":46,"p25":25},"2025-08-03":{"p26":66,"p25":41},"2025-08-04":{"p26":47,"p25":14},"2025-08-05":{"p26":46,"p25":3},"2025-08-06":{"p26":7,"p25":6},"2025-08-08":{"p26":38,"p25":20},"2025-08-09":{"p26":30,"p25":55},"2025-08-10":{"p26":37,"p25":23},"2025-08-11":{"p26":43},"2025-08-12":{"p26":41},"2025-08-13":{"p26":57,"p25":41},"2025-08-14":{"p26":8,"p25":21},"2025-08-15":{"p26":29},"2025-08-17":{"p26":3,"p25":7},"2025-08-20":{"p26":62,"p25":54},"2025-08-21":{"p26":67,"p25":19},"2025-08-22":{"p26":42},"2025-08-23":{"p26":32},"2025-08-24":{"p26":35},"2025-08-25":{"p26":31},"2025-08-26":{"p26":40,"p25":48},"2025-08-27":{"p25":19},"2025-08-28":{"p25":4},"2025-08-31":{"p26":35,"p25":8},"2025-09-02":{"p26":43},"2025-09-03":{"p26":50,"p25":26},"2025-09-04":{"p25":31},"2025-09-05":{"p25":3},"2025-09-06":{"p26":42},"2025-09-07":{"p26":30},"2025-09-08":{"p26":87,"p25":26},"2025-09-11":{"p26":57,"p25":15},"2025-09-12":{"p26":6},"2025-09-13":{"p26":1,"p25":13},"2025-09-14":{"p26":41,"p25":57},"2025-09-16":{"p25":26},"2025-09-17":{"p25":78},"2025-09-18":{"p26":13,"p25":1},"2025-09-19":{"p26":108},"2025-09-22":{"p25":6},"2025-09-23":{"p26":73,"p25":16},"2025-09-24":{"p26":11},"2025-09-25":{"p26":26,"p25":52},"2025-09-27":{"p25":13},"2025-09-28":{"p25":25},"2025-09-29":{"p25":56},"2025-09-30":{"p25":24},"2025-10-01":{"p26":101,"p25":22},"2025-10-02":{"p26":10},"2025-10-03":{"p26":115},"2025-10-05":{"p25":60},"2025-10-06":{"p26":43,"p25":20},"2025-10-10":{"p26":38,"p25":86},"2025-10-12":{"p25":41},"2025-10-14":{"p26":100,"p25":57},"2025-10-15":{"p25":27},"2025-10-16":{"p26":3,"p25":46},"2025-10-17":{"p25":16},"2025-10-18":{"p25":33},"2025-10-19":{"p25":2},"2025-10-20":{"p25":47},"2025-10-21":{"p25":4},"2025-10-22":{"p25":13},"2025-10-25":{"p25":35},"2025-10-28":{"p26":74,"p25":13},"2025-10-29":{"p26":84,"p25":68},"2025-10-30":{"p25":35},"2025-10-31":{"p26":87},"2025-11-01":{"p26":76,"p25":12},"2025-11-02":{"p26":33},"2025-11-03":{"p26":49,"p25":53},"2025-11-04":{"p26":6},"2025-11-05":{"p26":80,"p25":52},"2025-11-06":{"p25":60},"2025-11-07":{"p26":97,"p25":12},"2025-11-09":{"p26":54,"p25":31},"2025-11-10":{"p25":49},"2025-11-11":{"p26":101,"p25":45},"2025-11-12":{"p26":75,"p25":66},"2025-11-13":{"p26":68,"p25":62},"2025-11-14":{"p26":1,"p25":18},"2025-11-15":{"p26":47,"p25":40},"2025-11-16":{"p26":101,"p25":65},"2025-11-17":{"p25":68},"2025-11-18":{"p25":64},"2025-11-19":{"p26":98},"2025-11-20":{"p26":63},"2025-11-21":{"p25":17},"2025-11-22":{"p26":100,"p25":66},"2025-11-23":{"p26":66,"p25":65},"2025-11-24":{"p26":62,"p25":30},"2025-11-25":{"p26":81,"p25":13},"2025-11-26":{"p25":54},"2025-11-28":{"p26":47},"2025-11-29":{"p25":56},"2025-11-30":{"p25":55},"2025-12-01":{"p25":12},"2025-12-02":{"p26":82,"p25":13},"2025-12-03":{"p26":25},"2025-12-04":{"p26":39},"2025-12-05":{"p25":38},"2025-12-06":{"p26":40,"p25":70},"2025-12-07":{"p25":73},"2025-12-08":{"p26":51},"2025-12-09":{"p26":88},"2025-12-10":{"p26":38},"2025-12-11":{"p26":38,"p25":28},"2025-12-12":{"p26":35},"2025-12-13":{"p26":58,"p25":25},"2025-12-14":{"p26":53},"2025-12-15":{"p25":62},"2025-12-16":{"p25":49},"2025-12-17":{"p26":79,"p25":111},"2025-12-18":{"p26":56,"p25":81},"2025-12-19":{"p25":77},"2025-12-20":{"p26":106,"p25":68},"2025-12-21":{"p26":118},"2025-12-22":{"p26":37},"2025-12-23":{"p26":87,"p25":24},"2025-12-24":{"p25":81},"2025-12-26":{"p25":30},"2025-12-27":{"p26":109,"p25":94},"2025-12-28":{"p26":119,"p25":92},"2025-12-29":{"p26":114},"2025-12-30":{"p26":20,"p25":57},"2025-12-31":{"p26":114,"p25":93},"2026-01-01":{"p26":97,"p25":79},"2026-01-02":{"p26":26,"p25":72},"2026-01-03":{"p26":125,"p25":12},"2026-01-04":{"p26":66,"p25":72},"2026-01-05":{"p26":103,"p25":33},"2026-01-06":{"p26":70,"p25":63},"2026-01-07":{"p26":20,"p25":40},"2026-01-08":{"p26":14,"p25":54},"2026-01-09":{"p26":100,"p25":79},"2026-01-10":{"p25":55},"2026-01-11":{"p25":45},"2026-01-12":{"p26":133,"p25":47},"2026-01-13":{"p26":20,"p25":44},"2026-01-14":{"p26":99,"p25":37},"2026-01-15":{"p26":97,"p25":57},"2026-01-16":{"p26":64,"p25":66},"2026-01-17":{"p26":62,"p25":52},"2026-01-18":{"p26":66,"p25":34},"2026-01-19":{"p26":97,"p25":50},"2026-01-20":{"p26":89,"p25":77},"2026-01-21":{"p26":51,"p25":72},"2026-01-22":{"p26":53,"p25":51},"2026-01-23":{"p26":7,"p25":4},"2026-01-24":{"p26":40,"p25":79},"2026-01-25":{"p26":15,"p25":20},"2026-01-26":{"p26":76,"p25":4},"2026-01-27":{"p26":71,"p25":78},"2026-01-28":{"p26":94,"p25":17},"2026-01-29":{"p25":52},"2026-01-30":{"p26":117,"p25":79},"2026-01-31":{"p26":77,"p25":74},"2026-02-01":{"p26":4,"p25":58},"2026-02-02":{"p25":77},"2026-02-03":{"p26":52,"p25":61},"2026-02-04":{"p26":127,"p25":71},"2026-02-05":{"p26":91,"p25":48},"2026-02-06":{"p26":81,"p25":34},"2026-02-07":{"p25":42},"2026-02-08":{"p26":118,"p25":19},"2026-02-09":{"p26":108},"2026-02-10":{"p25":42},"2026-02-11":{"p26":87,"p25":57},"2026-02-12":{"p26":135,"p25":54},"2026-02-13":{"p26":52,"p25":52},"2026-02-14":{"p26":11,"p25":77},"2026-02-15":{"p26":140,"p25":66},"2026-02-16":{"p26":79,"p25":32},"2026-02-17":{"p26":138,"p25":84},"2026-02-18":{"p26":125,"p25":7},"2026-02-19":{"p26":33},"2026-02-20":{"p26":12,"p25":41},"2026-02-21":{"p26":45,"p25":74},"2026-02-22":{"p26":153,"p25":14},"2026-02-23":{"p26":88,"p25":97},"2026-02-24":{"p26":124,"p25":50},"2026-02-25":{"p26":136,"p25":66},"2026-02-26":{"p25":92},"2026-02-27":{"p26":128,"p25":96},"2026-02-28":{"p26":111,"p25":93},"2026-03-01":{"p26":72},"2026-03-02":{"p26":53},"2026-03-03":{"p26":111},"2026-03-04":{"p26":96,"p25":97},"2026-03-05":{"p26":75,"p25":98},"2026-03-06":{"p25":97},"2026-03-07":{"p26":4,"p25":69},"2026-03-08":{"p26":4,"p25":51},"2026-03-09":{"p26":59,"p25":93},"2026-03-10":{"p26":117,"p25":75},"2026-03-11":{"p26":26,"p25":22},"2026-03-12":{"p25":2},"2026-03-13":{"p26":37,"p25":124},"2026-03-14":{"p26":40,"p25":42},"2026-03-15":{"p26":5,"p25":110},"2026-03-16":{"p26":13},"2026-03-17":{"p26":43},"2026-03-18":{"p26":103},"2026-03-19":{"p26":110},"2026-03-20":{"p26":102,"p25":95},"2026-03-21":{"p26":94,"p25":55},"2026-03-22":{"p26":55,"p25":3},"2026-03-23":{"p26":132,"p25":40},"2026-03-24":{"p26":111,"p25":69},"2026-03-25":{"p26":113,"p25":76},"2026-03-26":{"p26":67,"p25":61},"2026-03-28":{"p25":47},"2026-03-29":{"p25":67},"2026-03-30":{"p26":56},"2026-03-31":{"p26":149},"2026-04-01":{"p26":106,"p25":28},"2026-04-02":{"p26":96,"p25":27},"2026-04-03":{"p25":14},"2026-04-04":{"p25":2},"2026-04-05":{"p26":41,"p25":63},"2026-04-06":{"p26":95,"p25":27},"2026-04-07":{"p25":2},"2026-04-09":{"p25":60},"2026-04-10":{"p26":128,"p25":33},"2026-04-11":{"p26":122,"p25":7},"2026-04-12":{"p25":64},"2026-04-13":{"p25":55},"2026-04-15":{"p25":55},"2026-04-16":{"p25":73},"2026-04-17":{"p25":62},"2026-04-18":{"p25":25},"2026-04-19":{"p26":47},"2026-04-20":{"p26":12,"p25":36},"2026-04-21":{"p26":22,"p25":63},"2026-04-22":{"p26":88,"p25":53},"2026-04-23":{"p26":59,"p25":55},"2026-04-24":{"p26":70,"p25":62},"2026-04-25":{"p26":79,"p25":20},"2026-04-26":{"p25":34},"2026-04-27":{"p26":56},"2026-04-28":{"p25":2},"2026-04-29":{"p25":58},"2026-04-30":{"p26":94,"p25":14},"2026-05-01":{"p26":42},"2026-05-02":{"p26":48,"p25":28},"2026-05-03":{"p26":33,"p25":27},"2026-05-04":{"p26":50,"p25":44},"2026-05-05":{"p26":60,"p25":17},"2026-05-08":{"p26":20},"2026-05-09":{"p26":30,"p25":40},"2026-05-10":{"p25":2},"2026-05-11":{"p26":72,"p25":48},"2026-05-12":{"p26":40,"p25":3},"2026-05-13":{"p26":29,"p25":12},"2026-05-14":{"p26":25,"p25":33},"2026-05-15":{"p26":28},"2026-05-16":{"p26":30},"2026-05-17":{"p26":16,"p25":2},"2026-05-18":{"p26":31,"p25":38},"2026-05-19":{"p26":22,"p25":16},"2026-05-20":{"p26":7,"p25":27},"2026-05-21":{"p26":19,"p25":25},"2026-05-22":{"p26":32},"2026-05-23":{"p26":36,"p25":48},"2026-05-24":{"p26":33,"p25":23},"2026-05-26":{"p25":2},"2026-05-27":{"p26":38,"p25":34},"2026-05-28":{"p26":40},"2026-05-29":{"p26":26,"p25":4},"2026-05-30":{"p26":26,"p25":4},"2026-05-31":{"p25":6},"2026-06-01":{"p25":31},"2026-06-04":{"p25":4},"2026-06-05":{"p25":11},"2026-06-06":{"p25":12},"2026-06-07":{"p25":39},"2026-06-08":{"p25":23},"2026-06-09":{"p25":20},"2026-06-10":{"p25":27},"2026-06-11":{"p25":12},"2026-06-12":{"p25":15},"2026-06-13":{"p25":14},"2026-06-14":{"p25":15},"2026-06-15":{"p25":16},"2026-06-16":{"p25":29},"2026-06-17":{"p25":33},"2026-06-18":{"p25":35},"2026-06-20":{"p25":2},"2026-06-21":{"p25":34},"2026-06-22":{"p25":2},"2026-06-23":{"p25":29},"2026-06-24":{"p25":13},"2026-06-27":{"p25":21},"2026-06-28":{"p25":3},"2026-06-29":{"p25":48},"2026-06-30":{"p25":34}};}
