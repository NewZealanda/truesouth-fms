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
  if(!Array.isArray(S._bizPlan.budgets))S._bizPlan.budgets=JSON.parse(JSON.stringify(BIZ_DEFAULT.budgets));
  return S._bizPlan;
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
  try{var c=lsGet&&lsGet('ts_business_plan');if(c&&typeof c==='object')S._bizPlan=c;}catch(e){}
  try{fetch(SB+'/rest/v1/ts_settings?key=eq.business_plan&select=value',{headers:SH}).then(function(r){return r.ok?r.json():[];}).then(function(rows){try{if(rows&&rows[0]&&rows[0].value)S._bizPlan=JSON.parse(rows[0].value);}catch(e){}if(typeof safeRender==='function')safeRender();}).catch(function(){});}catch(e){}
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
window.bizPaxMonth=function(dir){var m=S._bizPaxMonth||'2025-06';var d=new Date(+m.slice(0,4),+m.slice(5,7)-1+dir,1);S._bizPaxMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');render();};
window.bizSetPaxTarget=function(ym,value){var p=_bizState();p.paxTargets[ym]=(value===''?'':(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizSetPax=function(ds,field,value){var p=_bizState();p.paxData[ds]=p.paxData[ds]||{};if(value===''||value==null)delete p.paxData[ds][field];else p.paxData[ds][field]=Math.max(0,Math.round(+value)||0);if(!p.paxData[ds].p26&&!p.paxData[ds].p25)delete p.paxData[ds];_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizBudgetSel=function(id){S._bizBudget=id;render();};
window.bizSetBudgetDriver=function(bid,field,m,value){var p=_bizState();var b=p.budgets.find(function(x){return x.id===bid;});if(!b||!b[field])return;b[field][m]=(value===''?'':(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizSetBudgetParam=function(bid,grp,field,value){var p=_bizState();var b=p.budgets.find(function(x){return x.id===bid;});if(!b||!b[grp])return;b[grp][field]=(value===''?'':(+value));_bizSave();if(typeof safeRender==='function')safeRender();};
window.bizToggleBudgetAc=function(bid,ai,m){var p=_bizState();var b=p.budgets.find(function(x){return x.id===bid;});if(!b||!b.aircraft[ai])return;b.aircraft[ai].active[m]=b.aircraft[ai].active[m]?0:1;_bizSave();render();};
window.bizReset=function(){if(typeof confirm==='function'&&!confirm('Reset the Main Plan to the original spreadsheet values?'))return;S._bizPlan=JSON.parse(JSON.stringify(BIZ_DEFAULT));_bizSave();render();};

// ── render ──
function renderBusinessPlan(){
  if(!S._bizLoaded){S._bizLoaded=true;if(window.loadBusinessPlan)window.loadBusinessPlan();}
  if(!(typeof hasRolePerm==='function'&&hasRolePerm('businessplan'))&&!(S.user&&S.user.superAdmin))
    return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div>';
  var tab=S._bizTab||'mainplan';
  var tabs=[{id:'mainplan',lbl:'Acquisition'},{id:'loans',lbl:'Loan schedules'},{id:'timeline',lbl:'Loan timeline'},{id:'running',lbl:'Running costs'},{id:'budget',lbl:'FY Budgets'},{id:'pnl',lbl:'P&L'},{id:'pax',lbl:'Pax tracker'},{id:'roster',lbl:'Pay rates'}];
  var bar='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'+
    tabs.map(function(t){return '<button class="sub-tab '+(tab===t.id?'on':'')+'" onclick="window.bizSetTab(\''+t.id+'\')">'+t.lbl+'</button>';}).join('')+'</div>';
  var body=(tab==='mainplan')?_bizRenderMainPlan():(tab==='loans')?_bizRenderLoans():(tab==='running')?_bizRenderRunning()
    :(tab==='timeline')?_bizRenderTimeline():(tab==='roster')?_bizRenderRoster():(tab==='pax')?_bizRenderPax():(tab==='budget')?_bizRenderBudget():_bizComingSoon(tabs.find(function(x){return x.id===tab;}));
  return '<div>'+bar+body+'</div>';
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

function _bizRenderPax(){
  var p=_bizState();var ym=S._bizPaxMonth||'2025-06';
  var y=+ym.slice(0,4),mo=+ym.slice(5,7);var daysIn=new Date(y,mo,0).getDate();
  var target=(p.paxTargets[ym]!=null&&p.paxTargets[ym]!=='')?(+p.paxTargets[ym]):'';
  var _inS='width:60px;font-size:12px;padding:3px 4px;border:1px solid var(--border2);border-radius:5px;background:var(--card);color:var(--text);text-align:center;box-sizing:border-box';
  var monLbl=new Date(y,mo-1,1).toLocaleDateString('en-NZ',{month:'long',year:'numeric'});
  var h='<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'+
    '<div><div class="st" style="margin-bottom:0">Pax tracker</div><p style="font-size:12px;color:var(--text3);margin:2px 0 0">Daily pax vs target and vs last year. Accumulated / % of target / tracking computed live.</p></div>'+
    '<div style="display:flex;align-items:center;gap:6px"><button class="btn btn-ghost" style="font-size:13px;padding:4px 10px" onclick="window.bizPaxMonth(-1)">◁</button>'+
    '<span style="font-weight:700;font-size:13px;min-width:130px;text-align:center">'+monLbl+'</span>'+
    '<button class="btn btn-ghost" style="font-size:13px;padding:4px 10px" onclick="window.bizPaxMonth(1)">▶</button></div></div>';
  // running totals
  var accum=0,run25=0,totT=(+target||0);
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;align-items:flex-end">'+
    '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Monthly target</label><input type="number" value="'+(target!==''?target:'')+'" onchange="window.bizSetPaxTarget(\''+ym+'\',this.value)" style="'+_inS+';width:90px;text-align:right"></div></div>';
  h+='<div class="card" style="padding:0;overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:560px">';
  h+='<thead><tr style="background:var(--card2)">'+['Date','26 Pax','Accum','% target','% month','Tracking','25 Pax','25 run','vs 25'].map(function(t,i){return '<th style="text-align:'+(i===0?'left':'center')+';padding:6px 6px;font-size:10px;color:var(--text3)">'+t+'</th>';}).join('')+'</tr></thead><tbody>';
  for(var d=1;d<=daysIn;d++){
    var ds=ym+'-'+String(d).padStart(2,'0');var row=p.paxData[ds]||{};
    var p26=(+row.p26||0),p25=(+row.p25||0);accum+=p26;run25+=p25;
    var pctTarget=totT?accum/totT:0;var pctMonth=d/daysIn;var tracking=pctTarget-pctMonth;
    var dow=new Date(y,mo-1,d).toLocaleDateString('en-NZ',{weekday:'short'});
    h+='<tr style="border-top:1px solid var(--border2)">'+
      '<td style="padding:2px 6px;white-space:nowrap"><b>'+d+'</b> <span style="color:var(--text3)">'+dow+'</span></td>'+
      '<td style="padding:2px 4px"><input type="number" value="'+(row.p26!=null?row.p26:'')+'" onchange="window.bizSetPax(\''+ds+'\',\'p26\',this.value)" style="'+_inS+'"></td>'+
      '<td style="padding:2px 6px;text-align:center;font-weight:700">'+(accum||'')+'</td>'+
      '<td style="padding:2px 6px;text-align:center;color:var(--text2)">'+(totT?Math.round(pctTarget*100)+'%':'—')+'</td>'+
      '<td style="padding:2px 6px;text-align:center;color:var(--text3)">'+Math.round(pctMonth*100)+'%</td>'+
      '<td style="padding:2px 6px;text-align:center;font-weight:700;color:'+(totT?(tracking>=0?'#22c55e':'#ef4444'):'var(--text3)')+'">'+(totT?(tracking>=0?'+':'')+Math.round(tracking*100)+'%':'—')+'</td>'+
      '<td style="padding:2px 4px"><input type="number" value="'+(row.p25!=null?row.p25:'')+'" onchange="window.bizSetPax(\''+ds+'\',\'p25\',this.value)" style="'+_inS+'"></td>'+
      '<td style="padding:2px 6px;text-align:center;color:var(--text3)">'+(run25||'')+'</td>'+
      '<td style="padding:2px 6px;text-align:center;color:var(--text2)">'+(run25?Math.round(accum/run25*100)+'%':'—')+'</td>'+
      '</tr>';
  }
  h+='<tr style="border-top:2px solid var(--border);background:var(--card2);font-weight:800"><td style="padding:6px">Month</td><td style="text-align:center">'+accum+'</td><td colspan="3" style="text-align:center;color:var(--text3)">'+(totT?Math.round(accum/totT*100)+'% of '+totT:'')+'</td><td></td><td style="text-align:center">'+run25+'</td><td></td><td style="text-align:center">'+(run25?Math.round(accum/run25*100)+'%':'')+'</td></tr>';
  h+='</tbody></table></div>';
  h+='<div style="font-size:11px;color:var(--text3);padding:6px 2px">Tracking = % of target reached minus % of the month elapsed (green = ahead of pace). "vs 25" compares this year\'s running total to last year\'s.</div>';
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
