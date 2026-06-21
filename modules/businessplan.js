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
  notes:'Interest only for the portion of vendor finance — this would be paid down over 2 years and that number decreases yearly.'
};

function _bizState(){
  if(!S._bizPlan||typeof S._bizPlan!=='object')S._bizPlan=JSON.parse(JSON.stringify(BIZ_DEFAULT));
  if(!Array.isArray(S._bizPlan.tranches))S._bizPlan.tranches=JSON.parse(JSON.stringify(BIZ_DEFAULT.tranches));
  if(!Array.isArray(S._bizPlan.assets))S._bizPlan.assets=[];
  return S._bizPlan;
}
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
  var body=(tab==='mainplan')?_bizRenderMainPlan():_bizComingSoon(tabs.find(function(x){return x.id===tab;}));
  return '<div>'+bar+body+'</div>';
}

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
