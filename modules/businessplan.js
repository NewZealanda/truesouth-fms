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
  }
};

function _bizState(){
  if(!S._bizPlan||typeof S._bizPlan!=='object')S._bizPlan=JSON.parse(JSON.stringify(BIZ_DEFAULT));
  if(!Array.isArray(S._bizPlan.tranches))S._bizPlan.tranches=JSON.parse(JSON.stringify(BIZ_DEFAULT.tranches));
  if(!Array.isArray(S._bizPlan.assets))S._bizPlan.assets=[];
  if(!Array.isArray(S._bizPlan.loans))S._bizPlan.loans=JSON.parse(JSON.stringify(BIZ_DEFAULT.loans));
  if(!S._bizPlan.running||typeof S._bizPlan.running!=='object')S._bizPlan.running=JSON.parse(JSON.stringify(BIZ_DEFAULT.running));
  if(!S._bizPlan.running.fuel)S._bizPlan.running.fuel=JSON.parse(JSON.stringify(BIZ_DEFAULT.running.fuel));
  if(!Array.isArray(S._bizPlan.running.aircraft))S._bizPlan.running.aircraft=[];
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
window.bizReset=function(){if(typeof confirm==='function'&&!confirm('Reset the Main Plan to the original spreadsheet values?'))return;S._bizPlan=JSON.parse(JSON.stringify(BIZ_DEFAULT));_bizSave();render();};

// ── render ──
function renderBusinessPlan(){
  if(!S._bizLoaded){S._bizLoaded=true;if(window.loadBusinessPlan)window.loadBusinessPlan();}
  if(!(typeof hasRolePerm==='function'&&hasRolePerm('businessplan'))&&!(S.user&&S.user.superAdmin))
    return '<div class="card" style="text-align:center;padding:40px;color:var(--text3)">Not available.</div>';
  var tab=S._bizTab||'mainplan';
  var tabs=[{id:'mainplan',lbl:'Acquisition'},{id:'loans',lbl:'Loan schedules'},{id:'budget',lbl:'FY Budgets'},{id:'pnl',lbl:'P&L'},{id:'running',lbl:'Running costs'}];
  var bar='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'+
    tabs.map(function(t){return '<button class="sub-tab '+(tab===t.id?'on':'')+'" onclick="window.bizSetTab(\''+t.id+'\')">'+t.lbl+'</button>';}).join('')+'</div>';
  var body=(tab==='mainplan')?_bizRenderMainPlan():(tab==='loans')?_bizRenderLoans():(tab==='running')?_bizRenderRunning():_bizComingSoon(tabs.find(function(x){return x.id===tab;}));
  return '<div>'+bar+body+'</div>';
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
