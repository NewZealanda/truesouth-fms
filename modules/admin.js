function renderAdmin(){
  const isAdmin=S.user?.role==='admin'||S.user?.role==='superadmin'||S.user?.superAdmin;
  // Aerodromes + Fuels moved INTO Settings ▸ Operations (tier-3) in v24.20 — remap any old
  // deep-link / restored view so it lands on the right tier-3 tab.
  if(((S.admin||{}).section)==='aerodromes'||((S.admin||{}).section)==='fuels'){
    if(!S.admin)S.admin={};S._opsSettingsTab=S.admin.section;S.admin.section='operations';
  }
  // Settings ▸ Operations (operations-gated, separate from the admin_users/admin_crew tabs).
  if(((S.admin||{}).section)==='operations'){
    if(typeof hasRolePerm==='function'&&hasRolePerm('operations')&&typeof renderAdminOperations==='function')return renderAdminOperations();
    if(!S.admin)S.admin={};S.admin.section='people';
  }
  // Non-admin: the permission grid governs what they see. admin_users can reach the full
  // settings area; admin_crew alone gets People. Anything the section-router lands them on
  // that they lack permission for falls back to People (or a no-access note).
  if(!isAdmin){
    if(typeof hasRolePerm==='function'&&hasRolePerm('admin_users')){
      const _s=(S.admin||{}).section||'people';
      return {people:renderAdminPeople,perms:renderAdminPerms}[_s]?.()||renderAdminPeople();
    }
    if(typeof hasRolePerm==='function'&&hasRolePerm('admin_crew')) return renderAdminPeople();
    return '<div class="card"><p style="color:var(--text3)">No sections available for your role.</p></div>';
  }
  const ad=S.admin;
  const ad_section=ad.section||'people';
  return {people:renderAdminPeople,perms:renderAdminPerms,gdrive:renderAdminGDrive,aerodromes:renderAerodromes,fuels:renderAdminFuels,statistics:renderAdminStatistics,audit:renderAdminAudit}[ad_section]?.()||renderAdminPeople();
}

function renderAdminStatistics(){
  // ── Filter state ─────────────────────────────────────────────────────────
  if(!S._sf)S._sf={ac:'',acType:'',dep:'',dest:'',dateFrom:'',dateTo:'',paxType:'',preset:'all'};
  const sf=S._sf;

  // ── Date preset logic ────────────────────────────────────────────────────
  const now=new Date();
  let _from='',_to='';
  if(sf.preset==='month'){
    _from=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';
    const lastDay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    _to=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+lastDay;
  } else if(sf.preset==='lastmonth'){
    const lm=new Date(now.getFullYear(),now.getMonth()-1,1);
    _from=lm.getFullYear()+'-'+String(lm.getMonth()+1).padStart(2,'0')+'-01';
    const lastDay=new Date(lm.getFullYear(),lm.getMonth()+1,0).getDate();
    _to=lm.getFullYear()+'-'+String(lm.getMonth()+1).padStart(2,'0')+'-'+lastDay;
  } else if(sf.preset==='year'){
    _from=now.getFullYear()+'-01-01';_to=now.getFullYear()+'-12-31';
  } else if(sf.preset==='custom'){
    _from=sf.dateFrom||'';_to=sf.dateTo||'';
  }

  // ── Build aircraft type map ───────────────────────────────────────────────
  const AC_TYPE={};
  Object.values(S.aircraft||{}).forEach(function(a){
    // Classify: ga8=Airvan, 208=C208B, else other
    if(a.layout==='ga8')AC_TYPE[a.id]='Airvan';
    else if((a.type||'').includes('208'))AC_TYPE[a.id]='C208B';
    else AC_TYPE[a.id]='Other';
  });

  // ── Filter signed loadsheets ──────────────────────────────────────────────
  const allSigned=S.saved.filter(function(s){return s.status==='complete'&&s.form;});
  const signed=allSigned.filter(function(s){
    const f=s.form;
    if(sf.ac&&f.ac!==sf.ac&&f.ac!=='ZK-'+sf.ac)return false;
    if(sf.acType&&(AC_TYPE[f.ac]||'Other')!==sf.acType)return false;
    if(sf.dep&&(f.dep||'')!==sf.dep)return false;
    if(sf.dest&&(f.dest||'')!==sf.dest)return false;
    if(_from&&f.date&&f.date<_from)return false;
    if(_to&&f.date&&f.date>_to)return false;
    return true;
  });

  // ── Collect pax stats ────────────────────────────────────────────────────
  var adultWts=[],childWts=[];
  var totalFuel=0,totalTow=0,towCount=0;
  var routeCounts={},acCounts={};
  signed.forEach(function(s){
    const f=s.form;
    const a=S.aircraft[f.ac];
    if(!a)return;
    const isCpCrew=!!f.coPilot;
    // Route tally
    const rk=(f.dep||'?')+' → '+(f.dest||'?');
    routeCounts[rk]=(routeCounts[rk]||0)+1;
    // Aircraft tally
    const ack=(f.ac||'?').replace('ZK-','');
    acCounts[ack]=(acCounts[ack]||0)+1;
    // Fuel
    totalFuel+=parseFloat(f.fuel||a.fuelKg||0);
    // TOW
    const r=calcFormWB(f);
    if(r&&r.tow){totalTow+=r.tow;towCount++;}
    // Per-seat weights
    for(var i=1;i<a.seats.length;i++){
      const nm=(f.names||{})[i]||'';
      if(!nm.trim())continue;
      if(i===1&&isCpCrew)continue;
      const hasInfant=!!(f.infantNames||{})[i];
      if(hasInfant)continue;
      const wt=parseFloat((f.seats||{})[i]||0);
      if(!wt)continue;
      const typ=(f.paxType||{})[i]||'A';
      // paxType filter
      if(sf.paxType==='A'&&typ!=='A')continue;
      if(sf.paxType==='C'&&typ!=='C')continue;
      if(typ==='C') childWts.push(wt);
      else adultWts.push(wt);
    }
  });
  const avg=function(arr){return arr.length?arr.reduce(function(a,b){return a+b;},0)/arr.length:0;};
  const aAvg=avg(adultWts),cAvg=avg(childWts);
  const paxCount=adultWts.length+childWts.length;
  const avgPax=signed.length?((paxCount)/signed.length).toFixed(1):0;

  // ── Build option lists for dropdowns ─────────────────────────────────────
  const allAc=Object.values(S.aircraft||{}).map(function(a){return a.id;});
  const allDeps=[...new Set(allSigned.map(function(s){return s.form.dep||'';}).filter(Boolean))].sort();
  const allDests=[...new Set(allSigned.map(function(s){return s.form.dest||'';}).filter(Boolean))].sort();
  const aptLbl=function(code){return code?(code.replace(/^NZ/,'')):code;};

  // ── Top routes ────────────────────────────────────────────────────────────
  const topRoutes=Object.entries(routeCounts).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
  const topAc=Object.entries(acCounts).sort(function(a,b){return b[1]-a[1];});

  // ── Helper: stat card ─────────────────────────────────────────────────────
  const statCard=function(label,val,sub,col){
    return '<div style="background:var(--card2);border-radius:10px;padding:14px 16px;border:1px solid var(--border2);text-align:center">'
      +'<div style="font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:'+(col||'var(--text3)')+';font-weight:700;margin-bottom:5px">'+label+'</div>'
      +'<div style="font-size:24px;font-weight:900;color:var(--text)">'+val+'</div>'
      +(sub?'<div style="font-size:10px;color:var(--text3);margin-top:2px">'+sub+'</div>':'')
      +'</div>';
  };

  // ── Filter bar HTML ───────────────────────────────────────────────────────
  const presets=[['all','All Time'],['year','This Year'],['month','This Month'],['lastmonth','Last Month'],['custom','Custom']];
  const filterBar='<div class="card" style="margin-bottom:0">'
    +'<div class="st" style="margin-bottom:10px">Filters</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end">'

    // Date preset
    +'<div style="min-width:130px"><div style="font-size:10px;color:var(--text3);margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Period</div>'
    +'<select class="fi" style="font-size:12px" onchange="S._sf=S._sf||{};S._sf.preset=this.value;render()">'
    +presets.map(function(p){return'<option value="'+p[0]+'"'+(sf.preset===p[0]?' selected':'')+'>'+p[1]+'</option>';}).join('')
    +'</select></div>'

    // Custom date range (only if preset=custom)
    +(sf.preset==='custom'?
      '<div><div style="font-size:10px;color:var(--text3);margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">From</div>'
      +'<input class="fi" type="date" value="'+(_from||'')+'" style="font-size:12px;width:130px" onchange="S._sf.dateFrom=this.value;render()"></div>'
      +'<div><div style="font-size:10px;color:var(--text3);margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">To</div>'
      +'<input class="fi" type="date" value="'+(_to||'')+'" style="font-size:12px;width:130px" onchange="S._sf.dateTo=this.value;render()"></div>'
    :'')

    // Aircraft
    +'<div style="min-width:100px"><div style="font-size:10px;color:var(--text3);margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Aircraft</div>'
    +'<select class="fi" style="font-size:12px" onchange="S._sf=S._sf||{};S._sf.ac=this.value;render()">'
    +'<option value="">All</option>'
    +allAc.map(function(id){var lbl=id.replace('ZK-','');return'<option value="'+id+'"'+(sf.ac===id?' selected':'')+'>'+lbl+'</option>';}).join('')
    +'</select></div>'

    // Aircraft type
    +'<div style="min-width:100px"><div style="font-size:10px;color:var(--text3);margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Type</div>'
    +'<select class="fi" style="font-size:12px" onchange="S._sf=S._sf||{};S._sf.acType=this.value;render()">'
    +'<option value="">All</option>'
    +'<option value="Airvan"'+(sf.acType==='Airvan'?' selected':'')+'>Airvan (GA8)</option>'
    +'<option value="C208B"'+(sf.acType==='C208B'?' selected':'')+'>C208B</option>'
    +'</select></div>'

    // Departure
    +'<div style="min-width:100px"><div style="font-size:10px;color:var(--text3);margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Departure</div>'
    +'<select class="fi" style="font-size:12px" onchange="S._sf=S._sf||{};S._sf.dep=this.value;render()">'
    +'<option value="">All</option>'
    +allDeps.map(function(d){return'<option value="'+d+'"'+(sf.dep===d?' selected':'')+'>'+aptLbl(d)+'</option>';}).join('')
    +'</select></div>'

    // Destination
    +'<div style="min-width:100px"><div style="font-size:10px;color:var(--text3);margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Destination</div>'
    +'<select class="fi" style="font-size:12px" onchange="S._sf=S._sf||{};S._sf.dest=this.value;render()">'
    +'<option value="">All</option>'
    +allDests.map(function(d){return'<option value="'+d+'"'+(sf.dest===d?' selected':'')+'>'+aptLbl(d)+'</option>';}).join('')
    +'</select></div>'

    // Pax type
    +'<div style="min-width:90px"><div style="font-size:10px;color:var(--text3);margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Pax Type</div>'
    +'<select class="fi" style="font-size:12px" onchange="S._sf=S._sf||{};S._sf.paxType=this.value;render()">'
    +'<option value="">Adults + Children</option>'
    +'<option value="A"'+(sf.paxType==='A'?' selected':'')+'>Adults only</option>'
    +'<option value="C"'+(sf.paxType==='C'?' selected':'')+'>Children only</option>'
    +'</select></div>'

    // Reset
    +'<button onclick="S._sf={ac:\'\',acType:\'\',dep:\'\',dest:\'\',dateFrom:\'\',dateTo:\'\',paxType:\'\',preset:\'all\'};render()" style="padding:6px 14px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-size:12px;cursor:pointer;white-space:nowrap;align-self:flex-end">✕ Reset</button>'
    +'</div></div>';

  // ── Stats grid ────────────────────────────────────────────────────────────
  const activeFilters=(sf.ac?1:0)+(sf.acType?1:0)+(sf.dep?1:0)+(sf.dest?1:0)+(sf.paxType?1:0)+(sf.preset!=='all'?1:0);
  const sourceLine='<p style="font-size:12px;color:var(--text3);margin-bottom:14px">Showing <strong style="color:var(--text1)">'+signed.length+' of '+allSigned.length+'</strong> signed loadsheets'+(activeFilters?' ('+activeFilters+' filter'+(activeFilters>1?'s':'')+' active)':'')+'. Excludes infant-attached seats &amp; co-pilot.</p>';

  const statsGrid='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px">'
    +statCard('Flights',signed.length,'signed loadsheets')
    +statCard('Total PAX',paxCount,'all filtered')
    +statCard('Avg PAX / Flight',signed.length?avgPax:'—','pax per flight')
    +statCard('Adults',adultWts.length,'pax','#4ade80')
    +statCard('Avg Adult Wt',adultWts.length?aAvg.toFixed(1)+'kg':'N/A',adultWts.length?'from '+adultWts.length:'','#4ade80')
    +statCard('Children',childWts.length,'pax','#fb923c')
    +statCard('Avg Child Wt',childWts.length?cAvg.toFixed(1)+'kg':'N/A',childWts.length?'from '+childWts.length:'','#fb923c')
    +statCard('Avg TOW',towCount?(totalTow/towCount).toFixed(0)+'kg':'—','at takeoff','#60a5fa')
    +'</div>';

  // Weight distribution
  const distH=(adultWts.length||childWts.length)?'<div style="padding:12px;background:var(--card2);border-radius:8px;border:1px solid var(--border2);margin-bottom:14px">'
    +'<div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Weight Distribution</div>'
    +(adultWts.length?'<div style="font-size:12px;margin-bottom:4px"><span style="color:#4ade80;font-weight:700">Adults:</span> min '+Math.min(...adultWts)+'kg &nbsp;·&nbsp; max '+Math.max(...adultWts)+'kg &nbsp;·&nbsp; avg '+aAvg.toFixed(1)+'kg &nbsp;·&nbsp; <span style="color:var(--text3)">'+adultWts.length+' records</span></div>':'')
    +(childWts.length?'<div style="font-size:12px"><span style="color:#fb923c;font-weight:700">Children:</span> min '+Math.min(...childWts)+'kg &nbsp;·&nbsp; max '+Math.max(...childWts)+'kg &nbsp;·&nbsp; avg '+cAvg.toFixed(1)+'kg &nbsp;·&nbsp; <span style="color:var(--text3)">'+childWts.length+' records</span></div>':'')
    +'</div>':'';

  // Flights per aircraft
  const acBarH=topAc.length?'<div style="padding:12px;background:var(--card2);border-radius:8px;border:1px solid var(--border2);margin-bottom:14px">'
    +'<div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Flights by Aircraft</div>'
    +topAc.map(function(e){
      var pct=Math.round(e[1]/signed.length*100);
      var col=AC_COL['ZK-'+e[0]]||'var(--accent)';
      return'<div style="margin-bottom:6px">'
        +'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span style="font-weight:700;color:'+col+'">'+e[0]+'</span><span style="color:var(--text3)">'+e[1]+' flight'+(e[1]!==1?'s':'')+' ('+pct+'%)</span></div>'
        +'<div style="height:5px;border-radius:3px;background:var(--border2)"><div style="height:100%;width:'+pct+'%;border-radius:3px;background:'+col+'"></div></div>'
        +'</div>';
    }).join('')
    +'</div>':'';

  // Top routes
  const routeH=topRoutes.length?'<div style="padding:12px;background:var(--card2);border-radius:8px;border:1px solid var(--border2)">'
    +'<div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Top Routes</div>'
    +topRoutes.map(function(e,i){
      var pct=Math.round(e[1]/signed.length*100);
      return'<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">'
        +'<span style="font-size:10px;color:var(--text3);width:14px;text-align:right">'+(i+1)+'.</span>'
        +'<span style="font-size:12px;font-weight:700;flex:1">'+e[0].split(' → ').map(function(c){return aptLbl(c);}).join(' → ')+'</span>'
        +'<span style="font-size:11px;color:var(--text3)">'+e[1]+'×</span>'
        +'<div style="width:60px;height:4px;border-radius:2px;background:var(--border2)"><div style="height:100%;width:'+pct+'%;border-radius:2px;background:var(--accent)"></div></div>'
        +'</div>';
    }).join('')
    +'</div>':'';

  return filterBar
    +'<div class="card"><div class="st">Statistics</div>'
    +sourceLine
    +statsGrid
    +distH
    +(acBarH||routeH?'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;flex-wrap:wrap">'+(acBarH||'')+(routeH||'')+'</div>':'')
    +'</div>';
}
function renderAdminGDrive(){
  const enabled=S.gdriveEnabled;
  if(!S._woFoldersLoaded){S._woFoldersLoaded=true;if(window.loadWoFolders)window.loadWoFolders();}
  // ── 1. Google sign-in (shared by every Drive upload) ──
  var oauth=`<div class="card"><div class="st">Google sign-in</div>
    <div><label>Google OAuth Client ID</label>
      <input class="fi" type="text" placeholder="xxxxxxx.apps.googleusercontent.com"
        value="${S.gdriveClientId||''}" onblur="S.gdriveClientId=this.value;lsSet('gdrive_client_id',this.value)">
      <div style="font-size:11px;color:var(--text3);margin-top:4px">Shared by all Drive uploads (loadsheets and work orders). From Google Cloud Console → APIs &amp; Services → Credentials; add your Netlify URL as an authorised origin.</div></div>
  </div>`;
  // ── 2. Loadsheets ──
  var loadsheets=`<div class="card"><div class="st">Loadsheets</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;padding:12px;background:var(--card2);border-radius:8px">
      <div style="flex:1"><div style="font-weight:600;margin-bottom:2px">Upload loadsheets to Google Drive</div>
        <div style="font-size:12px;color:var(--text3)">Toggle off for testing</div></div>
      <div onclick="S.gdriveEnabled=!S.gdriveEnabled;lsSet('gdrive_enabled',S.gdriveEnabled);render()"
        style="width:48px;height:26px;border-radius:13px;background:${enabled?'#7B9EC6':'#334155'};cursor:pointer;position:relative;transition:background .2s">
        <div style="width:22px;height:22px;border-radius:50%;background:#fff;position:absolute;top:2px;left:${enabled?'24px':'2px'};transition:left .2s"></div>
      </div>
    </div>
    <div style="margin-bottom:12px"><label>Loadsheets folder ID <span style="font-weight:400;color:var(--text3);font-size:10px">(paste from Drive URL)</span></label>
      <input class="fi" type="text" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
        value="${S.gdriveFolderId||''}" onblur="S.gdriveFolderId=this.value;lsSet('gdrive_folder_id',this.value)">
      <div style="font-size:11px;color:var(--text3);margin-top:4px">Open the Drive folder and copy the ID from the URL after <strong>/folders/</strong>.</div></div>
    <div style="padding:10px 14px;background:${enabled?'var(--ok-bg)':'var(--warn-bg)'};border:1px solid ${enabled?'var(--ok-border)':'var(--warn-border)'};border-radius:8px;color:${enabled?'var(--ok-text)':'var(--warn-text)'};font-size:13px;font-weight:600">
      ${enabled?'✓ Drive upload ENABLED for loadsheets':'⚠ Testing mode — loadsheets save to Supabase only, not Drive'}
    </div>
  </div>`;
  // ── 3. Work Order folders (per aircraft, separate from loadsheets) ──
  var acs=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(function(a){return S.aircraft&&S.aircraft[a];});
  var wf=S.gdriveWoFolders||{};
  var rows=acs.map(function(a){var id=(wf[a]||'').trim();var c=(typeof AC_COL!=='undefined'&&AC_COL[a])||'#888';var nm=(typeof acDisp==='function')?acDisp(a):a;
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">'+
      '<span style="flex-shrink:0;width:54px;font-size:12px;font-weight:800;color:'+c+'">'+nm+'</span>'+
      '<input class="fi" type="text" placeholder="Paste Drive folder link or ID" value="'+(id?id.replace(/"/g,'&quot;'):'')+'" onblur="window.mfSetWoFolder(\''+a+'\',this.value)" style="flex:1;font-size:12px">'+
      (id?'<span title="Folder set" style="flex-shrink:0;color:#22c55e;font-size:14px">✓</span>':'<span title="Not set" style="flex-shrink:0;color:#f59e0b;font-size:12px">—</span>')+
    '</div>';}).join('');
  var workorders='<div class="card"><div class="st">Work Order folders</div>'+
    '<div style="font-size:12px;color:var(--text3);margin-bottom:12px;line-height:1.6">Each aircraft’s work orders upload straight into its own Drive folder (separate from loadsheets). In Google Drive open the folder, copy the URL from the address bar — it looks like <strong>drive.google.com/drive/folders/<em>1AbCd…</em></strong> — and paste it below. The ID is pulled out automatically. Shared-drive folders work too. Synced across devices.</div>'+
    rows+'</div>';
  return oauth+loadsheets+workorders;
}
function renderAdminPeople(){
  const isAdmin=S.user?.role==='admin'||S.user?.role==='superadmin'||S.user?.superAdmin;
  const ad=S.admin;
  const today=new Date();today.setHours(0,0,0,0);
  const ROLE_LEVEL={superadmin:1,admin:2,cx_manager:2,pilot:3,desk:3,maint:3,ground_staff:4,accounts:3,marketing:3};
const roleColour={superadmin:'#f43f5e',admin:'#f59e0b',pilot:'#7B9EC6',desk:'#f9a8d4',maint:'#a78bfa',ground_staff:'#a16207',accounts:'#06b6d4',marketing:'#ec4899'};
  function expiryCol(v){if(!v)return'var(--text3)';const d=new Date(v+'T00:00:00');const dy=Math.round((d-today)/86400000);return dy<0?'#ef4444':dy<30?'#f59e0b':'#22c55e';}
  function expiryBg(v){if(!v)return'transparent';const d=new Date(v+'T00:00:00');const dy=Math.round((d-today)/86400000);return dy<0?'rgba(239,68,68,.08)':dy<30?'rgba(245,158,11,.08)':'transparent';}
  function fmt(v){if(!v)return'—';const p=v.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:v;}
  function daysLabel(v){if(!v)return'';const d=new Date(v+'T00:00:00');const dy=Math.round((d-today)/86400000);if(dy<0)return' (expired)';if(dy<30)return' ('+dy+'d)';return'';}

  // ── Build merged people list ──────────────────────────────────
  const people=[];
  const matchedUserIds=new Set();
  const sortedCrew=[...S.crew].sort((a,b)=>(a.n||'').localeCompare(b.n||''));
  sortedCrew.forEach(function(cr){
    const user=S.users.find(function(u){return u.linkedCrew&&(u.linkedCrew||'').trim().toLowerCase()===(cr.n||'').trim().toLowerCase();});
    if(user)matchedUserIds.add(user.id);
    people.push({crewId:cr.id,userId:user?user.id:null,cr:cr,user:user||null});
  });
  S.users.forEach(function(u){
    if(!matchedUserIds.has(u.id)) people.push({crewId:null,userId:u.id,cr:null,user:u});
  });

  // ── Determine current user's person entry ────────────────────
  const myEntry=people.find(function(p){return p.userId===S.user?.id;});

  // ── Modal ────────────────────────────────────────────────────
  const m=ad.personModal;
  let modalHtml='';
  if(m){
    const d=m.draft;
    const tab=m.tab||'profile';
    const canSeeLogin=isAdmin||(m.userId===S.user?.id);

    // Tab bar
    const tabBar='<div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin:0 0 16px">'
      +'<button onclick="S.admin.personModal.tab=\'profile\';render()" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid '+(tab==='profile'?'var(--accent)':'transparent')+';color:'+(tab==='profile'?'var(--accent)':'var(--text3)')+';font-size:13px;font-weight:700;cursor:pointer">👤 Profile</button>'
      +(canSeeLogin?'<button onclick="S.admin.personModal.tab=\'login\';render()" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid '+(tab==='login'?'var(--accent)':'transparent')+';color:'+(tab==='login'?'var(--accent)':'var(--text3)')+';font-size:13px;font-weight:700;cursor:pointer">🔐 Login</button>':'')
      +'</div>';

    // Profile tab
    let bodyHtml='';
    if(tab==='profile'){
      const isPilotOrAbove=['pilot','desk','admin','superadmin'].includes(d.role);
      const _expiryDefs=isPilotOrAbove?[['medExpiry','Medical Expiry','#22c55e'],['ocaDue','OCA Due','#7B9EC6'],['firstAid','First Aid','#f59e0b'],['avsecExpiry','AVSEC Expiry','#a78bfa']]:[['firstAid','First Aid','#f59e0b'],['avsecExpiry','AVSEC Expiry','#a78bfa']];
      const expiryRows=_expiryDefs.map(function(t){
        const k=t[0],lbl=t[1],col=t[2];
        const v=d[k]||'';const ec=v?expiryCol(v):'var(--text3)';const eb=v?expiryBg(v):'transparent';
        return'<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;background:'+eb+';border-radius:6px;padding:4px 6px">'
          +'<label style="font-size:11px;color:'+col+';font-weight:600">'+lbl.toUpperCase()+'</label>'
          +'<div style="display:flex;align-items:center;gap:6px">'
          +(v?'<span style="font-size:11px;color:'+ec+';font-weight:600">'+fmt(v)+daysLabel(v)+'</span>':'')
          +'<input type="date" class="fi" value="'+v+'" style="font-size:12px;max-width:140px" onchange="S.admin.personModal.draft[\''+k+'\']=this.value">'
          +'</div></div>';
      }).join('');
      const _AC_APPROVALS=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'];
      const endorseButtons=_AC_APPROVALS.map(function(acId){
        const on=(d.endorse||[]).includes(acId);
        const acCol=AC_COL[acId]||'#64748b';
        return'<button onclick="(function(){var en=S.admin.personModal.draft.endorse||[];var ix=en.indexOf(\''+acId+'\');if(ix>=0)en.splice(ix,1);else en.push(\''+acId+'\');S.admin.personModal.draft.endorse=en;render();})()" style="padding:5px 12px;border-radius:20px;font-size:11px;cursor:pointer;font-weight:700;border:1.5px solid '+(on?acCol:acCol+'55')+';background:'+(on?acCol+'28':'transparent')+';color:'+(on?acCol:'var(--text3)')+'">'+acId.replace('ZK-','')+'</button>';
      }).join('');
      bodyHtml='<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">'
        +'<div onclick="document.getElementById(\'person_photo_inp\').click()" style="width:72px;height:72px;border-radius:50%;border:2px solid var(--border2);background:var(--card2);overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        +(d.photo?'<img src="'+d.photo+'" style="width:100%;height:100%;object-fit:cover">':'<span style="font-size:28px;color:var(--text3)">👤</span>')
        +'</div>'
        +'<div><div style="font-size:13px;font-weight:600;color:var(--text2)">Photo</div>'
        +'<div style="font-size:11px;color:var(--text3)">Tap to upload</div>'
        +(d.photo?'<button onclick="S.admin.personModal.draft.photo=\'\';render()" style="margin-top:4px;background:none;border:none;color:#ef4444;font-size:11px;cursor:pointer;padding:0">Remove</button>':'')
        +'</div>'
        +'<input type="file" id="person_photo_inp" accept="image/*" style="display:none" onchange="window.personPhotoUpload(this)">'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 90px;gap:8px;margin-bottom:8px">'
        +'<div><label style="font-size:11px;color:var(--text3)">FULL NAME</label>'
        +'<input class="fi" type="text" value="'+esc(d.n||'')+'" placeholder="Full name" style="font-size:14px" oninput="S.admin.personModal.draft.n=this.value"></div>'
        +'<div><label style="font-size:11px;color:var(--text3)">CODE</label>'
        +'<input class="fi" type="text" value="'+esc(d.code||'')+'" placeholder="e.g. PD" style="font-size:13px;text-transform:uppercase" oninput="S.admin.personModal.draft.code=this.value.toUpperCase()"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
        +'<div><label style="font-size:11px;color:var(--text3)">WEIGHT (kg)</label>'
        +'<input class="fi" type="number" value="'+(d.w||'')+'" placeholder="kg" style="font-size:13px" oninput="S.admin.personModal.draft.w=this.value"></div>'
        +'<div><label style="font-size:11px;color:var(--text3)">DL NUMBER</label>'
        +'<input class="fi" type="text" value="'+esc(d.dlNum||'')+'" placeholder="Driver licence #" style="font-size:13px" oninput="S.admin.personModal.draft.dlNum=this.value"></div>'
        +'</div>'
        +'<div style="margin-bottom:8px"><label style="font-size:11px;color:var(--text3)">CAA LICENSE NUMBER</label>'
        +'<input class="fi" type="text" value="'+esc(d.caaNum||'')+'" placeholder="CAA pilot licence #" style="font-size:14px" oninput="S.admin.personModal.draft.caaNum=this.value"></div>'
        +'<div style="background:var(--card2);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:10px;margin-bottom:10px">'
        +'<div style="font-size:11px;font-weight:700;color:var(--text3);letter-spacing:.05em">EXPIRY DATES</div>'
        +expiryRows+'</div>'
        +'<div><label style="font-size:11px;color:var(--text3)">AIRCRAFT APPROVALS</label>'
        +'<div style="font-size:10px;color:var(--text3);margin-top:2px;opacity:.8">Anyone approved on at least one aircraft is PIC-eligible and appears in the manifest pilot list.</div>'
        +'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">'+endorseButtons+'</div></div>'
        +'<div style="margin-top:4px"><label style="font-size:11px;color:var(--text3)">DATE OF BIRTH</label>'
        +'<input class="fi" type="date" value="'+esc(d.dob||'')+'" style="font-size:13px;max-width:200px" onchange="S.admin.personModal.draft.dob=this.value">'
        +'<div style="font-size:10px;color:var(--text3);margin-top:4px;opacity:.8">Flight &amp; Duty type ratings (C208B / GA8) are taken automatically from the aircraft approvals above — SLA/SLB/SDB ⇒ C208B, SLD/SLQ ⇒ GA8.</div></div>';
    } else if(tab==='login'){
      const isOwnAccount=m.userId===S.user?.id;
      bodyHtml='<div style="display:flex;flex-direction:column;gap:12px">'
        +'<div><label style="font-size:11px;color:var(--text3)">EMAIL ADDRESS</label>'
        +'<input class="fi" type="email" value="'+esc(d.email||'')+'" placeholder="email@truesouth.co.nz" style="font-size:14px" oninput="S.admin.personModal.draft.email=this.value"></div>'
        +(isAdmin?'<div><label style="font-size:11px;color:var(--text3)">ROLE</label>'
        +'<select class="fi" style="font-size:13px" onchange="S.admin.personModal.draft.role=this.value">'
        +(S.user?.superAdmin?'<option value="superadmin"'+(d.role==='superadmin'?' selected':'')+'>Superadmin</option>':'')
        +'<option value="admin"'+(d.role==='admin'?' selected':'')+'>Admin</option>'
        +'<option value="cx_manager"'+(d.role==='cx_manager'?' selected':'')+'>CX Manager</option>'
        +'<option value="pilot"'+(d.role==='pilot'?' selected':'')+'>Pilot</option>'
        +'<option value="desk"'+(d.role==='desk'?' selected':'')+'>Desk</option>'
        +'<option value="maint"'+(d.role==='maint'?' selected':'')+'>Maintenance</option>'
        +'<option value="ground_staff"'+(d.role==='ground_staff'||d.role==='ground'?' selected':'')+'>Ground</option>'
        +'<option value="accounts"'+(d.role==='accounts'?' selected':'')+'>Accounts</option>'
        +'<option value="marketing"'+(d.role==='marketing'?' selected':'')+'>Marketing</option>'
        +'</select></div>':'')
        +(isAdmin&&m.userId?'<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--border2)">'
        +'<label style="font-size:11px;color:var(--text3);flex:1">MARK AS INACTIVE (hides from roster &amp; dropdowns from chosen date)</label>'
        +'<button onclick="S.admin.personModal.draft.inactive=!S.admin.personModal.draft.inactive;render()" '
        +'style="padding:4px 14px;border-radius:20px;border:none;font-size:12px;font-weight:700;cursor:pointer;'
        +'background:'+(d.inactive?'rgba(239,68,68,.25)':'var(--card2)')+';'
        +'color:'+(d.inactive?'#f87171':'var(--text3)')+'">⊘ '+(d.inactive?'Inactive':'Active')+'</button>'
        +'</div>':'')
        +(m.userId?'<div style="background:var(--card2);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px">'
        +'<div style="font-size:11px;font-weight:700;color:var(--text3);letter-spacing:.05em">CHANGE PASSWORD</div>'
        +(isOwnAccount?'<input class="fi" id="pm_curpw" type="password" placeholder="Current password" autocomplete="current-password" style="font-size:13px">':'')
        +'<input class="fi" id="pm_newpw" type="password" placeholder="New password (min 6 chars)" autocomplete="new-password" style="font-size:13px">'
        +'<input class="fi" id="pm_confpw" type="password" placeholder="Confirm new password" autocomplete="new-password" style="font-size:13px">'
        +'<button onclick="window.changePasswordFromModal()" style="padding:9px;background:var(--accent);border:none;border-radius:7px;color:#fff;font-size:13px;font-weight:700;cursor:pointer">🔑 Update Password</button>'
        +(ad.pwMsg?'<div style="font-size:12px;font-weight:600;padding:4px 0;color:'+(ad.pwMsg.ok?'var(--ok-text)':'var(--err-text)')+'">'+ad.pwMsg.text+'</div>':'')
        +'</div>':'')
        +(!m.userId?'<div style="background:var(--card2);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px">'
        +'<div style="font-size:11px;font-weight:700;color:var(--text3);letter-spacing:.05em">SET PASSWORD</div>'
        +'<input class="fi" id="pm_newpw" type="password" placeholder="Password (min 6 chars)" autocomplete="new-password" style="font-size:13px" oninput="S.admin.personModal.draft.password=this.value">'
        +'<input class="fi" id="pm_confpw" type="password" placeholder="Confirm password" autocomplete="new-password" style="font-size:13px">'
        +'<div style="font-size:11px;color:var(--text3)">💡 Leave blank for crew-only (no login). Email required if setting a password.</div>'
        +'</div>':'')
        +'</div>';
    }

    // Footer
    const canDelete=isAdmin&&(m.crewId||m.userId);
    const saveBtn='<button onclick="window.savePerson()" style="flex:1;padding:11px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:700;cursor:pointer">💾 Save</button>';
    const _dc=m.crewId?("'"+m.crewId+"'"):'null';const _du=m.userId?("'"+m.userId+"'"):'null';
    const delBtn=canDelete?'<button onclick="window.deletePerson('+_dc+','+_du+')" style="padding:11px 14px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:8px;color:#ef4444;font-size:13px;cursor:pointer">🗑</button>':'';

    modalHtml='<div id="person-modal" style="position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.7);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px 12px">'
      +'<div style="background:var(--card);border:1px solid var(--border2);border-radius:14px;width:100%;max-width:440px;padding:0 0 24px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid var(--border)">'
      +'<span style="font-size:16px;font-weight:700">'+(m.crewId||m.userId?'Edit Person':'New Person')+'</span>'
      +'<button onclick="S.admin.personModal=null;S.admin.err=\'\';S.admin.pwMsg=null;render()" style="background:none;border:none;color:var(--text2);font-size:20px;cursor:pointer;line-height:1">×</button>'
      +'</div>'
      +tabBar
      +'<div style="padding:0 20px">'+bodyHtml+'</div>'
      +(ad.err?'<div style="margin:8px 20px 0;padding:8px;background:var(--err-bg);border-radius:7px;color:var(--err-text);font-size:13px">'+ad.err+'</div>':'')
      +'<div style="padding:16px 20px 0;display:flex;gap:8px">'+saveBtn+delBtn+'</div>'
      +'</div>'
      +'</div>';
  }

  // ── People list ──────────────────────────────────────────────
  const expiryKeys=['medExpiry','ocaDue','firstAid','avsecExpiry'];
  const expiryLabels={medExpiry:'Med',ocaDue:'OCA',firstAid:'Aid',avsecExpiry:'AVSEC'};
  const expiryColors={medExpiry:'#22c55e',ocaDue:'#7B9EC6',firstAid:'#f59e0b',avsecExpiry:'#a78bfa'};

  const personCards=people.map(function(p){
    const cr=p.cr;const u=p.user;
    const name=(cr?cr.n:u?u.name:'')||'Unknown';
    const photo=cr?cr.photo:'';
    const code=cr?cr.code:'';
    const caaNum=cr?cr.caaNum:'';
    const endorses=cr?cr.endorse||[]:[];
    const role=u?u.role:'';
    const email=u?u.email:'';
    const isInactive=u?!!u.inactive:false;
    const isMe=p.userId===S.user?.id;
    const myLevel=ROLE_LEVEL[S.user?.role||'']||99;
    const theirLevel=ROLE_LEVEL[role||'']||3;
    const canEdit=isMe||S.user?.superAdmin||(isAdmin&&theirLevel>myLevel);

    // Worst expiry bg
    let worstBg='transparent';
    if(cr){
      expiryKeys.forEach(function(k){
        const v=cr[k];if(!v)return;
        const dy=Math.round((new Date(v+'T00:00:00')-today)/86400000);
        if(dy<0)worstBg='rgba(239,68,68,.06)';
        else if(dy<30&&worstBg!=='rgba(239,68,68,.06)')worstBg='rgba(245,158,11,.06)';
      });
    }

    // Expiry pills (only show if expired or within 30 days)
    const pills=cr?expiryKeys.map(function(k){
      const v=cr[k];if(!v)return'';
      const dy=Math.round((new Date(v+'T00:00:00')-today)/86400000);
      if(dy>=30)return'';
      const col=dy<0?'#ef4444':'#f59e0b';
      const bg=dy<0?'rgba(239,68,68,.15)':'rgba(245,158,11,.12)';
      return'<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;background:'+bg+';color:'+col+'">'+expiryLabels[k]+(dy<0?' EXP':' '+dy+'d')+'</span>';
    }).join(''):'' ;

    // Opener
    let opener='';
    if(canEdit){
      const endStr='['+(endorses.map(function(e){return"'"+e+"'";}).join(','))+']';
      const safeN=(name||'').replace(/'/g,"\\'");
      opener='window.openPersonModal(\''+p.crewId+'\',\''+p.userId+'\')';
    }

    return'<div style="display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--border);background:'+worstBg+';cursor:'+(canEdit?'pointer':'default')+'" onclick="'+opener+'">'
      +'<div style="width:38px;height:38px;border-radius:50%;background:var(--card2);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1px solid var(--border2)">'
      +(photo?'<img src="'+photo+'" style="width:100%;height:100%;object-fit:cover">':'<span style="font-size:17px">👤</span>')
      +'</div>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px;overflow:hidden">'
      +(code?'<span style="font-size:10px;background:var(--card2);border:1px solid var(--border);border-radius:3px;padding:1px 5px;flex-shrink:0">'+code+'</span>':'')
      +'<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">'+esc(name)+'</span>'
      +(isMe?'<span style="font-size:10px;color:var(--text3);flex-shrink:0;white-space:nowrap">(you)</span>':'')
      +(isInactive?'<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:8px;background:rgba(239,68,68,.15);color:#f87171;flex-shrink:0">Inactive</span>':'')
      +'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
      +(role?'<span style="color:'+(roleColour[role]||'#64748b')+';font-weight:600">'+role+'</span>':'')
      +(email?'<span>'+esc(email)+'</span>':'')
      +(endorses.length?endorses.filter(function(e){return e.startsWith('ZK-');}).map(function(e){var ec=AC_COL[e]||'#64748b';return'<span style="padding:1px 7px;border-radius:12px;background:'+ec+'22;border:1px solid '+ec+'55;color:'+ec+';font-size:9px;font-weight:700">'+e.replace('ZK-','')+'</span>';}).join(''):'')
      +(caaNum?'<span>CAA '+caaNum+'</span>':'')
      +'</div>'
      +(pills?'<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">'+pills+'</div>':'')
      +'</div>'
      +(canEdit?'<span style="font-size:11px;color:var(--text3)">✎</span>':'')
      +'</div>';
  }).join('');

  const addBtn=isAdmin?'<button onclick="window.openPersonModal(null,null)" style="padding:7px 14px;background:var(--accent);border:none;border-radius:7px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">+ Add Person</button>':'';

  return modalHtml
    +'<div class="card">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
    +'<div class="st" style="margin-bottom:0">People</div>'
    +addBtn
    +'</div>'
    +personCards
    +'</div>';
}


function renderAdminAircraft(){
  const ad=S.admin;
  const chips=['ZK-SLA','ZK-SLB','ZK-SLD','ZK-SLQ','ZK-SDB'].filter(k=>S.aircraft[k]).map(k=>`<button style="padding:6px 12px;border-radius:7px;border:2px solid ${ad.acSel===k?AC_COL[k]||'#7B9EC6':'var(--border2)'};background:${ad.acSel===k?'#0c1a3a':'transparent'};color:${ad.acSel===k?AC_COL[k]||'#7B9EC6':'var(--text2)'};font-size:12px;font-weight:700;cursor:pointer;margin:3px" onclick="S.admin.acSel='${k}';S.admin.acDraft=null;S.admin.acSaved=false;render()">${k}</button>`).join('');
  const d=ad.acDraft||S.aircraft[ad.acSel];if(!d)return`<div class="card"><p style="color:var(--text3)">Select aircraft.</p></div>`;
  const ed=!!ad.acDraft;const ro=!ed?'readonly style="opacity:.5"':'';
  const sR=d.seats.map((s,i)=>`<div class="seat-row-edit">
    <input class="fi" type="text" value="${s.lbl}" ${i===0?'readonly style="opacity:.5;font-weight:700"':''} onblur="if(${ed})S.admin.acDraft.seats[${i}].lbl=this.value" style="font-size:13px">
    <input class="fi" type="number" value="${s.arm}" onblur="if(${ed})S.admin.acDraft.seats[${i}].arm=parseFloat(this.value)||0" style="font-size:13px" ${ro}>
    ${i>0&&!s.crew?`<input class="fi" type="number" value="${s.maxKg||''}" onblur="if(${ed})S.admin.acDraft.seats[${i}].maxKg=parseFloat(this.value)||null" style="font-size:13px" ${ro}>`:`<span style="font-size:11px;color:var(--text3)">${s.crew?'Crew':''}</span>`}
    ${ed&&i>0&&!s.crew?`<button class="icon-btn red" onclick="S.admin.acDraft.seats.splice(${i},1);render()">✕</button>`:`<span></span>`}
  </div>`).join('');
  return`<div class="card"><div class="st">Select Aircraft</div><div style="display:flex;flex-wrap:wrap;margin:-3px">${chips}</div></div>
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:800">${d.name}</span>
      ${!ed?`<button class="btn btn-ghost" style="border-color:var(--sky);color:var(--sky);font-size:12px" onclick="S.admin.acDraft=JSON.parse(JSON.stringify(S.aircraft[S.admin.acSel]));render()">Edit</button>`
        :`<div style="display:flex;gap:6px"><button class="btn btn-ghost" style="font-size:12px" onclick="S.admin.acDraft=null;render()">Cancel</button><button class="btn btn-sky" style="font-size:12px" onclick="saveAircraftDraft()">Save & Sync</button></div>`}
    </div>
    <div class="g3" style="margin-bottom:10px">
      <div><label>Empty Wt (kg)</label><input class="fi" type="number" value="${d.ew}" onblur="if(${ed}){S.admin.acDraft.ew=parseFloat(this.value)||0}" ${ro}></div>
      <div><label>Empty Arm (in)</label><input class="fi" type="number" value="${d.ea}" onblur="if(${ed}){S.admin.acDraft.ea=parseFloat(this.value)||0}" ${ro}></div>
      <div><label>Empty Moment</label><input class="fi" type="number" value="${d.em}" onblur="if(${ed}){S.admin.acDraft.em=parseFloat(this.value)||0}" ${ro}></div>
    </div>
    <div class="g3" style="margin-bottom:10px">
      <div><label>Max T/O (kg)</label><input class="fi" type="number" value="${d.mtow}" onblur="if(${ed}){S.admin.acDraft.mtow=parseFloat(this.value)||0}" ${ro}></div>
      <div><label>Max Ldg (kg)</label><input class="fi" type="number" value="${d.mlw}" onblur="if(${ed}){S.admin.acDraft.mlw=parseFloat(this.value)||0}" ${ro}></div>
      <div><label>Fuel Over Tolerance (kg)</label><input class="fi" type="number" value="${d.fuelOver||50}" onblur="if(${ed}){S.admin.acDraft.fuelOver=parseFloat(this.value)||50}" ${ro}></div>
    </div>
    <div class="g2" style="margin-bottom:10px">
      <div><label>C of G Min (in)</label><input class="fi" type="number" value="${d.cogMin}" onblur="if(${ed}){S.admin.acDraft.cogMin=parseFloat(this.value)||0}" ${ro}></div>
      <div><label>C of G Max (in)</label><input class="fi" type="number" value="${d.cogMax}" onblur="if(${ed}){S.admin.acDraft.cogMax=parseFloat(this.value)||0}" ${ro}></div>
      <div><label>Fuel (kg)</label><input class="fi" type="number" value="${d.fuelKg}" onblur="if(${ed}){S.admin.acDraft.fuelKg=parseFloat(this.value)||0}" ${ro}></div>
      <div><label>Fuel Arm (in)</label><input class="fi" type="number" value="${d.fuelArm}" onblur="if(${ed}){S.admin.acDraft.fuelArm=parseFloat(this.value)||0}" ${ro}></div>
    </div>
    <div class="g2" style="margin-bottom:10px">
      <div><label>Default Flight Burn</label><input class="fi" type="number" value="${d.burnDef||''}" placeholder="${d.layout==='ga8'?'35':'187'}" onblur="if(${ed}){S.admin.acDraft.burnDef=parseFloat(this.value)||0}" ${ro}></div>
      <div><label>Burn Unit</label><select class="fi" onchange="if(${ed}){S.admin.acDraft.burnDefUnit=this.value}" ${ed?'':'disabled style=\"opacity:.5\"'}>${['L','lbs','kg'].map(u=>`<option ${(d.burnDefUnit||(d.layout==='ga8'?'L':'lbs'))===u?'selected':''}>${u}</option>`).join('')}</select></div>
    </div>
    <div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">Seats</div>
      <div style="display:grid;grid-template-columns:1.5fr 90px 90px 32px;gap:8px;margin-bottom:4px">${['Label','Arm (in)','Max (kg)',''].map(h=>`<span style="font-size:10px;font-weight:700;color:var(--text3)">${h}</span>`).join('')}</div>
      ${sR}${ed?`<button class="btn btn-ghost" style="margin-top:8px;font-size:12px" onclick="S.admin.acDraft.seats.push({lbl:'Seat '+S.admin.acDraft.seats.length,arm:0});render()">+ Add Seat</button>`:''}
    </div>
    ${ad.acErr?`<div style="padding:8px;background:var(--err-bg);border-radius:7px;color:var(--err-text);font-size:13px;margin-top:8px">${ad.acErr}</div>`:''}
    ${ad.acSaved?`<div style="padding:8px;background:var(--ok-bg);border-radius:7px;color:var(--ok-text);font-size:13px;font-weight:600;margin-top:8px">✓ Saved & synced</div>`:''}
  </div>`;
}

function renderAdminCharterRates(){
  return`<div class="card"><div class="st">Charter Rates</div>
    <p style="font-size:12px;color:var(--text3);margin-bottom:12px">Set hourly rates for each aircraft. Changes apply immediately to new charter quotes.</p>
    ${Object.entries(S.charterRates).map(([acId,r])=>{
      const col=AC_COL[acId]||'#64748b';
      return`<div style="display:grid;grid-template-columns:140px 1fr 100px;gap:10px;align-items:end;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:7px"><div style="width:10px;height:10px;border-radius:50%;background:${col}"></div><span style="font-weight:600;font-size:13px">${acId}</span></div>
        <div><label>$/hr (NZD)</label><input class="fi" type="number" value="${r.perHour||0}" onblur="S.charterRates['${acId}'].perHour=parseFloat(this.value)||0;saveCharterRates()"></div>
        <div><label>Min hrs</label><input class="fi" type="number" step="0.25" value="${r.minHours||1}" onblur="S.charterRates['${acId}'].minHours=parseFloat(this.value)||1;saveCharterRates()"></div>
      </div>`;}).join('')}
  </div>`;
}


// ═══════════════════════ EVENT HANDLERS ═══════════════════════

// ── Password Reset ──
window.requestReset=async()=>{
  const email=(document.getElementById('resetEmail')?.value||'').toLowerCase().trim();
  const u=S.users.find(x=>x.email.toLowerCase()===email);
  if(!u){S.resetMsg={ok:false,text:'No account found with that email.'};render();return;}
  const code=String(Math.floor(100000+Math.random()*900000));
  const expires=Date.now()+30*60*1000; // 30 min
  // Store reset token in Supabase (ts_users password_hash temporarily stores token)
  u.resetToken=code;u.resetExpires=expires;
  lsSet('ts_users_cache',S.users);
  await sbUserWrite([{id:u.id,name:u.name,email:u.email,role:u.role,
    linked_crew:u.linkedCrew,password_hash:u.passwordHash,
    reset_token:code,reset_expires:String(expires)}]);
  // Show code (in production this would email it - for now show in app since no email service)
  S.resetMsg={ok:true,text:'Reset code: '+code+' (valid 30 min). In production this would be emailed. Note it down and give it to the user.'};
  render();
};
window.applyReset=async()=>{
  const code=(document.getElementById('resetCode')?.value||'').trim();
  const newPw=(document.getElementById('resetNewPw')?.value||'').trim();
  if(!code||!newPw){S.resetMsg={ok:false,text:'Enter both the code and new password.'};render();return;}
  if(AUTH_PHASE_A){
    // Token is hidden from the client — verify + set server-side.
    const em=(document.getElementById('resetEmail')?.value||'').toLowerCase().trim();
    const res=await callFn('confirm-reset',{email:em,code:code,newPassword:newPw});
    if(!res.ok){S.resetMsg={ok:false,text:res.data&&res.data.error==='invalid_code'?'Invalid or expired code.':'Could not reset password.'};render();return;}
    S.resetMsg={ok:true,text:'Password updated. You can now log in.'};S.showReset=false;render();return;
  }
  const u=S.users.find(x=>x.resetToken===code&&x.resetExpires&&Date.now()<x.resetExpires);
  if(!u){S.resetMsg={ok:false,text:'Invalid or expired code.'};render();return;}
  u.passwordHash=await hashPw(newPw);delete u.resetToken;delete u.resetExpires;
  lsSet('ts_users_cache',S.users);
  await sbUserWrite([{id:u.id,name:u.name,email:u.email,role:u.role,linked_crew:u.linkedCrew,password_hash:u.passwordHash,reset_token:null,reset_expires:null}]);
  S.resetMsg={ok:true,text:'Password updated. You can now log in.'};
  S.showReset=false;render();
};

// (window.switchToLoadsheets removed in v23.76 — legacy loadsheet route retired.)
window.switchOpsTab=function(tabId){
  if(S.section==='roster'&&typeof _rosterUnsaved==='function'&&_rosterUnsaved()){window._navAway(function(){window.switchOpsTab(tabId);});return;}
  S.activeTabId=null;S._newLsTab=false;
  if(tabId!=='rloadsheets')S._rzLsActiveId=null; // leaving Loadsheets closes the inline editor
  S.section='operations';S.tab=tabId;
  render();
  if(tabId==='saved'){
    reloadTable('ts_loadsheets').then(function(){render();});
  }
  window.scrollTo(0,0);
};
window.setTab=function(t){
  if(S.section==='roster'&&typeof _rosterUnsaved==='function'&&_rosterUnsaved()){window._navAway(function(){window.setTab(t);});return;}
  if(t==='operations'){
    S.section='operations';
    if(S._newLsTab&&!S.activeTabId){S._newLsTab=false;S.tab='bookings';}
    else if(!['bookings','rseatmap','rloadsheets','manifest','seatmap','saved','charter','ground'].includes(S.tab)&&!S.activeTabId&&!S._newLsTab)S.tab='bookings';
  } else if(t==='charter'){
    S.section='operations';S.tab='charter';
  } else if(t==='maintenance'){
    S.section='maintenance';S.tab='maintenance';
  } else if(t==='admin'){
    S.section='settings';S.tab='admin';
  } else if(t==='leave'){
    S.section='leave';
  } else if(t==='scratchpad'){
    S.tab=t;
    if(S.pads.length===0&&S.padTabs.length===0){
      reloadTable('ts_scratchpads').then(function(){render();});return;
    }
  } else {
    S.section='operations';S.tab=t;
  }
  // Re-fetch live_draft when switching to manifest tab
  if(t==='manifest'||t==='operations'){
    (async function(){
      try{
        const r=await fetch(SB+'/rest/v1/ts_manifests?id=eq.live_draft&select=*',{headers:SH});
        if(r.ok){const rows=await r.json();
          if(rows&&rows[0]&&rows[0].data&&rows[0].data._updatedBy!==S.user?.id){
            mergeDispatch(rows[0].data);safeRender();
          }
        }
      }catch(e){}
    })();
  }
  // Re-fetch loadsheets from Supabase every time saved tab is opened
  if(t==='saved'){
    reloadTable('ts_loadsheets').then(function(){render();});
  }
  // Re-fetch crew + users from Supabase every time admin/crew tab is opened
  if(t==='admin'){
    Promise.all([reloadTable('ts_crew'),reloadTable('ts_users')]).then(function(){render();});
  }
  // Load maintenance: show local data instantly, sync from cloud in background.
  if(t==='maintenance'){window.ensureMaintenance(true);}
  window.scrollTo(0,0);
  render();
};

// ── Manifest handlers ──
window.toggleAcSetup=id=>{
  const i=S.dispatch.acSetup.findIndex(s=>s.acId===id);
  if(i>=0){
    // Removing aircraft: unpin pax assigned to it, delete leftover blank rows
    const seatCount=paxSeatIdxs(id).length;
    S.dispatch.pax.forEach(function(p){if(p.pinAc===id)p.pinAc=null;});
    var removed=0;
    S.dispatch.pax=S.dispatch.pax.filter(function(p){
      if(removed<seatCount&&!p.pinAc&&!p.name&&!p.infantName&&(!p.weight||p.weight===0)&&!p.infant){removed++;return false;}
      return true;
    });
    S.dispatch.acSetup.splice(i,1);
  } else {
    const a=S.aircraft[id];
    S.dispatch.acSetup.push({acId:id,pic:'',coPilot:'',fuelInput:a?Math.round(fromKg(a.fuelKg,id)):null,_ts:Date.now()});
    const seatCount=paxSeatIdxs(id).length;
    const now=Date.now();
    // Auto-assign existing unallocated pax to this aircraft
    const unalloc=S.dispatch.pax.filter(function(p){return !p.pinAc&&!p.infant;});
    const toAssign=unalloc.slice(0,seatCount);
    toAssign.forEach(function(p){p.pinAc=id;p._ts=now;});
    // Add blank rows only for remaining empty seats
    const remaining=seatCount-toAssign.length;
    for(var n=0;n<remaining;n++){S.dispatch.pax.push({id:'p_'+now+'_'+n,name:'',weight:0,bag:0,group:'',pinAc:id,_ts:now,infant:false,type:'adult'});}
  }
  autoSaveDispatch();render();
};
window.setAcField=(id,field,val)=>{const s=S.dispatch.acSetup.find(x=>x.acId===id);if(s){s[field]=val;s._ts=Date.now();if(field==='coPilot'){const cp=anyCrewList().find(x=>x.n===val);s._cpWeight=cp?cp.w:0;}autoSaveDispatch();safeRender();}};
window.addPax=function(infant){S.dispatch.pax.push({id:'p_'+Date.now(),name:'',weight:infant?10:0,bag:0,group:'',pinAc:null,_ts:Date.now(),infant:!!infant,type:'adult'});autoSaveDispatch();render();};
window.addInfant=function(){addPax(true);};
function _paxSafeRender(){
  var ae=document.activeElement;
  if(ae&&ae.dataset&&(ae.dataset.field==='name'||ae.dataset.field==='group'||ae.dataset.field==='weight'||ae.dataset.field==='bag'))return;
  safeRender();
}
function _lsSafeRender(){
  var ae=document.activeElement;
  var lsEl=document.getElementById('flash-loadsheet');
  if(ae&&lsEl&&lsEl.contains(ae)&&(ae.tagName==='INPUT'||ae.tagName==='SELECT'||ae.tagName==='TEXTAREA'))return;
  autoSaveLS();safeRender();
}
window.paxNameBlur=function(i,val){
  const plusIdx=val.indexOf(' + ');
  if(S.dispatch.pax[i]){
    if(plusIdx>0){
      S.dispatch.pax[i].name=val.slice(0,plusIdx).trim();
      S.dispatch.pax[i].infantName=val.slice(plusIdx+3).trim()||null;
    } else {
      S.dispatch.pax[i].name=val;
      S.dispatch.pax[i].infantName=null;
    }
  }
  if(S.dispatch.pax[i])S.dispatch.pax[i]._ts=Date.now();
  autoSaveDispatch();
  setTimeout(_paxSafeRender,150);
}
window.openPaxFieldPopup=function(pidx,field){
  var p=S.dispatch.pax[pidx];if(!p)return;
  var ex=document.getElementById('pax-fld-overlay');if(ex)ex.remove();
  var labels={name:'Passenger Name',weight:'Weight (kg)',bag:'Bag (kg)',group:'Group'};
  var lbl=labels[field]||field;
  var curVal=field==='name'?(p.name||'')+(p.infantName?' + '+p.infantName:''):String(p[field]||'');
  var inpType=(field==='weight'||field==='bag')?'number':'text';
  var inpMode=(field==='weight'||field==='bag')?'decimal':'text';
  window._paxFldPidx=pidx;window._paxFldField=field;
  var ov=document.createElement('div');
  ov.id='pax-fld-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  var fi='width:100%;padding:14px 12px;font-size:18px;border:1px solid var(--border);border-radius:10px;background:var(--bg3);color:var(--text1);box-sizing:border-box';
  var inner=document.createElement('div');
  inner.style.cssText='background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:20px 16px 22px;width:100%;max-width:420px;box-sizing:border-box;box-shadow:0 12px 40px rgba(0,0,0,.5)';
  var title=document.createElement('div');
  title.style.cssText='font-weight:700;font-size:15px;margin-bottom:14px;color:var(--text1)';
  title.textContent=lbl;
  inner.appendChild(title);
  if(field==='group'){
    var grpSet={};S.dispatch.pax.forEach(function(px){if(px.group)grpSet[px.group]=1;});
    var grps=Object.keys(grpSet);
    if(grps.length){
      var grpRow=document.createElement('div');
      grpRow.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px';
      grps.forEach(function(g){
        var gb=document.createElement('button');
        gb.textContent=g;
        gb.style.cssText='padding:5px 14px;border-radius:20px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:14px;cursor:pointer';
        gb.onclick=function(){var inp=document.getElementById('pax-fld-inp');if(inp)inp.value=g;};
        grpRow.appendChild(gb);
      });
      inner.appendChild(grpRow);
    }
  }
  var inp=document.createElement('input');
  inp.id='pax-fld-inp';inp.type=inpType;inp.inputMode=inpMode;inp.autocomplete='off';
  inp.value=curVal;inp.placeholder=lbl;inp.style.cssText=fi;
  inner.appendChild(inp);
  var btnRow=document.createElement('div');btnRow.style.cssText='display:flex;gap:10px;margin-top:14px';
  var saveBtn=document.createElement('button');
  saveBtn.textContent='Save';
  saveBtn.style.cssText='flex:1;padding:14px;background:#7c3aed;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer';
  saveBtn.onclick=function(){window.savePaxFieldPopup();};
  var cancelBtn=document.createElement('button');
  cancelBtn.textContent='Cancel';
  cancelBtn.style.cssText='flex:1;padding:14px;background:var(--bg3);color:var(--text1);border:1px solid var(--border);border-radius:10px;font-size:16px;cursor:pointer';
  cancelBtn.onclick=function(){ov.remove();};
  btnRow.appendChild(saveBtn);btnRow.appendChild(cancelBtn);
  inner.appendChild(btnRow);
  ov.appendChild(inner);
  document.body.appendChild(ov);
  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
  setTimeout(function(){inp.focus();try{inp.select();}catch(e){}},80);
};
window.savePaxFieldPopup=function(){
  var inp=document.getElementById('pax-fld-inp');if(!inp)return;
  var v=inp.value.trim();
  var pidx=window._paxFldPidx;var field=window._paxFldField;
  if(field==='name')window.paxNameBlur(pidx,v);
  else window.setPaxField(pidx,field,v);
  var ov=document.getElementById('pax-fld-overlay');if(ov)ov.remove();
};

;
window.rmInfant=function(i){if(!S.dispatch.pax[i])return;S.dispatch.pax[i].infantName=null;S.dispatch.pax[i]._ts=Date.now();autoSaveDispatch();render();};
window.lsRmInfant=function(idx){if(S.form.infantNames)delete S.form.infantNames[idx];// also clear from name field if encoded there
var nm=S.form.names&&S.form.names[idx]||'';if(nm.includes(' + '))S.form.names[idx]=nm.split(' + ')[0].trim();autoSaveLS();render();};
window.rmPax=i=>{S._paxUndo=S._paxUndo||[];var removed=S.dispatch.pax.splice(i,1)[0];if(removed)S._paxUndo.push(removed);autoSaveDispatch();render();};
window.undoPax=function(){if(!S._paxUndo||!S._paxUndo.length)return;var p=S._paxUndo.pop();p._ts=Date.now();S.dispatch.pax.push(p);autoSaveDispatch();render();};
window.removeEmptyPax=function(){
  S._paxUndo=S._paxUndo||[];
  var kept=[],removed=[];
  S.dispatch.pax.forEach(function(p){
    if(!p.infant&&!p.name&&!p.infantName&&(!p.weight||p.weight===0)&&(!p.bag||p.bag===0)){removed.push(p);}
    else{kept.push(p);}
  });
  if(!removed.length)return;
  removed.forEach(function(p){S._paxUndo.push(p);});
  S.dispatch.pax=kept;
  autoSaveDispatch();render();
};
window.setPaxField=(i,k,v)=>{
  if(!S.dispatch.pax[i])return;
  S.dispatch.pax[i][k]=v;S.dispatch.pax[i]._ts=Date.now();
  if(k==='weight'){
    var _wv=parseFloat(v||0);
    if(_wv>0&&_wv<50&&(!S.dispatch.pax[i].type||S.dispatch.pax[i].type==='adult')){
      if(confirm('Weight '+_wv+'kg — is this passenger a child?')){
        S.dispatch.pax[i].type='child';
      }
    }
  }
  autoSaveDispatch();setTimeout(_paxSafeRender,150);
};

// ── Seat map handlers ──
window.tapPax=pid=>{S.selectedPax=S.selectedPax===pid?null:pid;render();};
window.tapPool=function(ev){
  if(ev)ev.stopPropagation();
  const _D=curDisp();
  if(!S.selectedPax||!_D)return;
  const pid=S.selectedPax;
  const sm=_D.seatMap||{};
  Object.keys(sm).forEach(function(ac){
    Object.keys(sm[ac]||{}).forEach(function(idx){if(sm[ac][idx]===pid)delete sm[ac][idx];});
  });
  S.selectedPax=null;
  S.solverAutoApply=false;runSolver();S.solverAutoApply=true;
  saveSeatmapWS();render();
};
window.tapSeat=(toIdx,toAc)=>{
  const _D=curDisp();
  if(!_D)return;_D.seatMap=_D.seatMap||{};
  const sm=_D.seatMap;if(!sm[toAc])sm[toAc]={};
  const displaced=sm[toAc][toIdx]||null;
  if(S.selectedPax){
    const selPid=S.selectedPax;
    // Find source seat
    let fromAc=null,fromIdx=null;
    for(const id of Object.keys(sm)){
      for(const [i,pid] of Object.entries(sm[id])){
        if(pid===selPid){fromAc=id;fromIdx=parseInt(i);break;}
      }
      if(fromAc)break;
    }
    // Snapshot done; now mutate
    sm[toAc][toIdx]=selPid;
    if(fromAc!=null&&fromIdx!=null){
      delete sm[fromAc][fromIdx];
      if(displaced) sm[fromAc][fromIdx]=displaced; // swap
    }
    _D.origAcMap=_D.origAcMap||{};
    if(!_D.origAcMap[selPid]) _D.origAcMap[selPid]=fromAc||toAc;
    S.selectedPax=null;
  } else if(displaced){
    // Tap on occupied seat with nothing selected = select that pax
    S.selectedPax=displaced;
  }
  S.solverAutoApply=false;runSolver();S.solverAutoApply=true;
  saveSeatmapWS();render();
};
window.toggleViewAc=id=>{
  if(!S.viewAcs)S.viewAcs=[];
  const isMobile=window.innerWidth<640;
  const maxShow=isMobile?2:4;
  if(S.viewAcs.includes(id)){
    // Remove if more than 1 shown
    if(S.viewAcs.length>1)S.viewAcs=S.viewAcs.filter(x=>x!==id);
  } else {
    if(S.viewAcs.length<maxShow){S.viewAcs.push(id);}
    else{S.viewAcs=[...S.viewAcs.slice(1),id];} // replace oldest
  }
  render();
};

// Drag & Drop
S.dragState=null;
window.startDrag=(ev,pid,fromAc,fromSeat)=>{
  S.dragState={pid,fromAc,fromSeat:fromSeat!=null?parseInt(fromSeat):null};
  ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',pid);
};
window.dropOnSeat=function(ev,toIdx,toAc){
  ev.preventDefault();
  if(!S.dragState) return;
  const pid=S.dragState.pid;
  const fromAc=S.dragState.fromAc;
  const fromSeat=S.dragState.fromSeat;
  const _D=curDisp();
  if(!pid||!_D) return;
  _D.seatMap=_D.seatMap||{};
  const sm=_D.seatMap;
  if(!sm[toAc]) sm[toAc]={};
  if(fromAc&&fromAc!=='pool'&&!sm[fromAc]) sm[fromAc]={};
  // Read displaced pax BEFORE any writes
  const displaced=sm[toAc][toIdx]||null;
  // Write dragged pax to target seat
  sm[toAc][toIdx]=pid;
  // Handle source seat
  if(fromAc&&fromAc!=='pool'&&fromSeat!=null){
    delete sm[fromAc][fromSeat];
    // Swap: put displaced pax into vacated source seat
    if(displaced) sm[fromAc][fromSeat]=displaced;
  }
  // Track original AC for colour
  if(!_D.origAcMap) _D.origAcMap={};
  if(!_D.origAcMap[pid]) _D.origAcMap[pid]=fromAc||toAc;
  S.dragState=null;
  S.selectedPax=null;
  // If an infant was moved, warn to reweigh
  const movedPax=(_D.pax||[]).find(function(p){return p.id===pid;});
  if(movedPax&&movedPax.infant){toast('🔁 Infant moved — please reweigh passengers to confirm actual weights.','warn');}
  S.solverAutoApply=false;runSolver();S.solverAutoApply=true;
  saveSeatmapWS();render();
};
window.dropOnPool=(ev,forceAc)=>{
  ev.preventDefault();if(!S.dragState)return;
  const{fromAc,fromSeat}=S.dragState;
  if(fromAc&&fromAc!=='pool'&&fromSeat!=null){const sm=curDisp().seatMap;if(sm[fromAc])delete sm[fromAc][fromSeat];}
  S.dragState=null;S.selectedPax=null;runSolver();saveSeatmapWS();render();
};
window.dropOnPoolPax=function(targetPaxId,ev){
  ev.preventDefault();ev.stopPropagation();
  if(!S.dragState)return;
  const{pid,fromAc,fromSeat}=S.dragState;
  const _D=curDisp();
  if(!pid||pid===targetPaxId||!_D)return;
  const sm=_D.seatMap||{};
  if(fromAc&&fromAc!=='pool'&&fromSeat!=null){
    // Seat pax dragged onto pool pax: put pool pax into source seat (swap)
    if(!sm[fromAc])sm[fromAc]={};
    sm[fromAc][fromSeat]=targetPaxId;
  }
  S.dragState=null;S.selectedPax=null;
  S.solverAutoApply=false;runSolver();S.solverAutoApply=true;
  saveSeatmapWS();render();
};

// Loadsheet form seat map drag
window.tapFormSeat=(seatIdx,acId,ev)=>{
  if(ev&&ev.target&&(ev.target.tagName==='INPUT'||ev.target.tagName==='TEXTAREA'||ev.target.tagName==='SELECT'))return;
  const f=S.form;
  const nm=f.names[seatIdx]||'';
  if(S._selUnalloc!=null){
    const ua=_uaPool();
    if(ua&&ua[S._selUnalloc]){
      const p=ua[S._selUnalloc];
      if(p&&p.infant&&typeof _lsInfantFrontBlocked==='function'&&_lsInfantFrontBlocked(f,seatIdx,true)){
        if(typeof toast==='function')toast('Infants can’t sit in the front seat (beside the pilot). Choose another seat.','warn');
        S._selUnalloc=null;S._selFormSeat=null;render();return;
      }
      if(nm){ua.push({name:nm,weight:f.seats[seatIdx]||'',bag:f.bags[seatIdx]||'',infant:(f.infantNames||{})[seatIdx]||'',group:(f.paxGroups||{})[seatIdx]||'',paymentReq:!!((f.paxPaymentReq||{})[seatIdx]),type:((f.paxType||{})[seatIdx]==='C'?'child':'adult')});}
      f.names[seatIdx]=p.name;f.seats[seatIdx]=p.weight;f.bags[seatIdx]=p.bag;
      if(!f.infantNames)f.infantNames={};
      if(p.infant)f.infantNames[seatIdx]=p.infant;else delete f.infantNames[seatIdx];
      if(!f.paxGroups)f.paxGroups={};
      if(p.group)f.paxGroups[seatIdx]=p.group;else delete f.paxGroups[seatIdx];
      if(!f.paxType)f.paxType={};if(p.type==='child')f.paxType[seatIdx]='C';else delete f.paxType[seatIdx];
      if(!f.paxPaymentReq)f.paxPaymentReq={};if(p.paymentReq)f.paxPaymentReq[seatIdx]=true;else delete f.paxPaymentReq[seatIdx];
      ua.splice(S._selUnalloc,1);
    }
    S._selUnalloc=null;S._selFormSeat=null;autoSaveLS();render();return;
  }
  if(S._selFormSeat!=null){
    const from=S._selFormSeat;
    if(from!==seatIdx){
      if((f.infantNames||{})[from]&&typeof _lsInfantFrontBlocked==='function'&&_lsInfantFrontBlocked(f,seatIdx,true)){
        if(typeof toast==='function')toast('Infants can’t sit in the front seat (beside the pilot). Choose another seat.','warn');
        S._selFormSeat=null;render();return;
      }
      const swp=(obj,a,b)=>{const t=obj[a];obj[a]=obj[b];obj[b]=t;};
      swp(f.names,from,seatIdx);swp(f.seats,from,seatIdx);
      swp(f.bags,from,seatIdx);
      if(!f.infantNames)f.infantNames={};swp(f.infantNames,from,seatIdx);
      if(!f.paxGroups)f.paxGroups={};swp(f.paxGroups,from,seatIdx);
      if(!f.paxType)f.paxType={};swp(f.paxType,from,seatIdx);
      if(!f.paxPaymentReq)f.paxPaymentReq={};swp(f.paxPaymentReq,from,seatIdx);
    }
    S._selFormSeat=null;
  } else if(nm){
    S._selFormSeat=seatIdx;
  }
  autoSaveLS();
  render();
};
window.tapUnallocated=function(idx){
  // If a seat is selected, tapping unallocated moves pax there
  if(S._selFormSeat!=null){window.tapDropUnallocated();return;}
  S._selUnalloc=(S._selUnalloc===idx)?null:idx;
  S._selFormSeat=null;render();
};
window.tapDropUnallocated=function(){
  if(S._selFormSeat==null)return;
  const f=S.form;
  const nm=f.names[S._selFormSeat]||'';
  if(nm&&nm!==f.coPilot&&nm!==f.pic){
    _uaPool().push({name:nm,weight:f.seats[S._selFormSeat]||'',bag:f.bags[S._selFormSeat]||'',infant:(f.infantNames||{})[S._selFormSeat]||'',group:(f.paxGroups||{})[S._selFormSeat]||'',paymentReq:!!((f.paxPaymentReq||{})[S._selFormSeat]),type:((f.paxType||{})[S._selFormSeat]==='C'?'child':'adult')});
    delete f.names[S._selFormSeat];delete f.seats[S._selFormSeat];delete f.bags[S._selFormSeat];
    if(f.infantNames)delete f.infantNames[S._selFormSeat];
    if(f.paxGroups)delete f.paxGroups[S._selFormSeat];
    if(f.paxType)delete f.paxType[S._selFormSeat];
    if(f.paxPaymentReq)delete f.paxPaymentReq[S._selFormSeat];
  }
  S._selFormSeat=null;autoSaveLS();render();
};
window.removeUnallocated=function(idx){
  _uaPool().splice(idx,1);
  if(S._selUnalloc===idx)S._selUnalloc=null;saveSeatmapWS();render();
};
window.clearUnallocated=function(){
  var pool=_uaPool();
  S._unallocUndo=pool.map(function(p){return Object.assign({},p);});
  pool.length=0;S._selUnalloc=null;
  saveSeatmapWS();render();
};
window.undoClearUnallocated=function(){
  if(!S._unallocUndo)return;
  var pool=_uaPool();pool.length=0;
  S._unallocUndo.forEach(function(p){pool.push(p);});
  S._unallocUndo=null;
  saveSeatmapWS();render();
};
window.clearUnassigned=function(){
  // Removes unseated passengers from the SEATMAP WORKSPACE only — manifests are untouched.
  const _D=curDisp();
  if(!_D)return;
  const seatedIds=new Set(Object.values(_D.seatMap||{}).flatMap(function(sm){return Object.values(sm||{});}));
  const unassigned=(_D.pax||[]).filter(function(p){return !seatedIds.has(p.id);});
  if(!unassigned.length){toast('No unassigned passengers.','warn');return;}
  S._unassignedUndo=unassigned.map(function(p){return Object.assign({},p);});
  _D.pax=(_D.pax||[]).filter(function(p){return seatedIds.has(p.id);});
  // Also drop them from the shared pool array
  if(Array.isArray(_D._unallocated))_D._unallocated=_D._unallocated.filter(function(e){return e.id&&seatedIds.has(e.id);});
  saveSeatmapWS();render();
  toast('Cleared '+unassigned.length+' unassigned pax from the seatmap','ok');
};
window.undoClearUnassigned=function(){
  if(!S._unassignedUndo)return;
  const _D=curDisp();
  _D.pax=(_D.pax||[]).concat(S._unassignedUndo);
  S._unassignedUndo=null;
  saveSeatmapWS();render();
};
window.lsUnallocDragStart=function(idx,e){
  S._dragUnalloc=idx;S._dragSeat=null;
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain','ua:'+idx);
};
window.lsSeatDragStart=function(idx,e){
  S._dragSeat=idx;S._dragUnalloc=null;
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain','seat:'+idx);
};
window.lsDropOnSeat=function(toIdx,e){
  e.preventDefault();
  if(e.currentTarget)e.currentTarget.style.outline='';
  _lsUndoPush();
  const f=S.form;
  if(S._dragUnalloc!=null){
    // Drop from unallocated onto seat
    const ua=_uaPool();
    if(!ua||ua[S._dragUnalloc]==null){S._dragUnalloc=null;return;}
    const p=ua[S._dragUnalloc];
    if(p&&p.infant&&typeof _lsInfantFrontBlocked==='function'&&_lsInfantFrontBlocked(f,toIdx,true)){
      if(typeof toast==='function')toast('Infants can’t sit in the front seat (beside the pilot). Choose another seat.','warn');
      S._dragUnalloc=null;S._selUnalloc=null;render();return;
    }
    const curNm=f.names[toIdx]||'';
    // Bump existing occupant back to unallocated
    if(curNm&&curNm!==f.coPilot){ua.push({name:curNm,weight:f.seats[toIdx]||'',bag:f.bags[toIdx]||'',infant:(f.infantNames||{})[toIdx]||'',group:(f.paxGroups||{})[toIdx]||'',paymentReq:!!((f.paxPaymentReq||{})[toIdx]),type:((f.paxType||{})[toIdx]==='C'?'child':'adult')});}
    f.names[toIdx]=p.name;f.seats[toIdx]=p.weight;f.bags[toIdx]=p.bag;
    if(!f.infantNames)f.infantNames={};
    if(p.infant)f.infantNames[toIdx]=p.infant;else delete f.infantNames[toIdx];
    if(!f.paxGroups)f.paxGroups={};
    if(p.group)f.paxGroups[toIdx]=p.group;else delete f.paxGroups[toIdx];
    if(!f.paxType)f.paxType={};if(p.type==='child')f.paxType[toIdx]='C';else delete f.paxType[toIdx];
    if(!f.paxPaymentReq)f.paxPaymentReq={};if(p.paymentReq)f.paxPaymentReq[toIdx]=true;else delete f.paxPaymentReq[toIdx];
    ua.splice(S._dragUnalloc,1);
    S._dragUnalloc=null;S._selUnalloc=null;
  } else if(S._dragSeat!=null&&S._dragSeat!==toIdx){
    if((f.infantNames||{})[S._dragSeat]&&typeof _lsInfantFrontBlocked==='function'&&_lsInfantFrontBlocked(f,toIdx,true)){
      if(typeof toast==='function')toast('Infants can’t sit in the front seat (beside the pilot). Choose another seat.','warn');
      S._dragSeat=null;render();return;
    }
    // Swap two seats
    const swp=(obj,a,b)=>{const t=obj[a];obj[a]=obj[b];obj[b]=t;};
    swp(f.names,S._dragSeat,toIdx);swp(f.seats,S._dragSeat,toIdx);swp(f.bags,S._dragSeat,toIdx);
    if(!f.infantNames)f.infantNames={};swp(f.infantNames,S._dragSeat,toIdx);
    if(!f.paxGroups)f.paxGroups={};swp(f.paxGroups,S._dragSeat,toIdx);
    if(!f.paxType)f.paxType={};swp(f.paxType,S._dragSeat,toIdx);
    if(!f.paxPaymentReq)f.paxPaymentReq={};swp(f.paxPaymentReq,S._dragSeat,toIdx);
    S._dragSeat=null;
  }
  autoSaveLS();render();
};
window.lsDropOnUnalloc=function(e){
  e.preventDefault();
  if(e.currentTarget)e.currentTarget.style.outline='';
  _lsUndoPush();
  const f=S.form;
  if(S._dragSeat!=null){
    const nm=f.names[S._dragSeat]||'';
    if(nm&&nm!==f.coPilot&&nm!==f.pic){
      _uaPool().push({name:nm,weight:f.seats[S._dragSeat]||'',bag:f.bags[S._dragSeat]||'',infant:(f.infantNames||{})[S._dragSeat]||'',group:(f.paxGroups||{})[S._dragSeat]||'',paymentReq:!!((f.paxPaymentReq||{})[S._dragSeat]),type:((f.paxType||{})[S._dragSeat]==='C'?'child':'adult')});
      delete f.names[S._dragSeat];delete f.seats[S._dragSeat];delete f.bags[S._dragSeat];
      if(f.infantNames)delete f.infantNames[S._dragSeat];
      if(f.paxGroups)delete f.paxGroups[S._dragSeat];
      if(f.paxType)delete f.paxType[S._dragSeat];
      if(f.paxPaymentReq)delete f.paxPaymentReq[S._dragSeat];
    }
    S._dragSeat=null;autoSaveLS();render();
  }
};
window.startDragForm=(ev,idx,acId)=>{S.dragState={fromFormIdx:idx,fromFormAc:acId};ev.dataTransfer.setData('text/plain',String(idx));};
window.dropFormSeat=(ev,toIdx,acId)=>{
  ev.preventDefault();
  if(S._dragUnalloc!=null){window.lsDropOnSeat(toIdx,ev);return;}
  _lsUndoPush();
  if(!S.dragState?.fromFormIdx&&S.dragState?.fromFormIdx!==0)return;
  const from=S.dragState.fromFormIdx;
  // Swap ALL per-seat fields so name, weight, bag, infant, group, child type and
  // TO PAY all travel with the passenger.
  const f=S.form;
  if(!f.infantNames)f.infantNames={};if(!f.paxGroups)f.paxGroups={};if(!f.paxType)f.paxType={};if(!f.paxPaymentReq)f.paxPaymentReq={};
  const swp=(obj,a,b)=>{const t=obj[a];obj[a]=obj[b];obj[b]=t;};
  swp(f.names,from,toIdx);swp(f.seats,from,toIdx);swp(f.bags,from,toIdx);swp(f.infantNames,from,toIdx);swp(f.paxGroups,from,toIdx);swp(f.paxType,from,toIdx);swp(f.paxPaymentReq,from,toIdx);
  S.dragState=null;autoSaveLS();render();
};

// ── Manifest save/load ──
window.saveManifest=async()=>{
  // Always read ETD from DOM to capture current value
  const etdSel=document.getElementById('etd_sel_dispatch');
  if(etdSel){
    if(etdSel.value&&etdSel.value!=='custom') S.dispatch.etd=etdSel.value;
    else if(etdSel.value==='custom'){const etdInp=document.getElementById('etd_dispatch');if(etdInp&&etdInp.value)S.dispatch.etd=etdInp.value;}
  }
  const d=S.dispatch,name=d.name||`Manifest ${new Date().toLocaleDateString('en-NZ')}`;
  // If we have a loaded manifest ID, UPDATE it; otherwise create new
  const id=S._loadedManifestId||('mn_'+Date.now());
  const savedAt=new Date().toISOString();
  const data={dep:d.dep,dest:d.dest,date:d.date,etd:d.etd,acSetup:d.acSetup,pax:d.pax,name,createdBy:(S.user&&S.user.name)||'',createdAt:new Date().toISOString()};
  S.manifests=S.manifests.filter(m=>m.id!==id&&m.name!==name);
  S.manifests.unshift({id,name,savedAt,data});
  S._loadedManifestId=id;
  // Update active tab's savedId
  const _curTab=S.manifestTabs&&S.manifestTabs.find(function(t){return t.id===S.activeManifestTabId;});
  if(_curTab)_curTab.savedId=id;
  lsSet('ts_manifests_cache',S.manifests);
  await sbU('ts_manifests',[{id,name,saved_at:savedAt,data}]);
  auditLog('manifest_save',{name,pax:d.pax.length,aircraft:d.acSetup.map(s=>s.acId).join(',')});
  toast('Manifest "'+name+'" saved.','ok');
};
window.saveManifestAs=async function(){
  S._loadedManifestId=null;
  const _curTab2=S.manifestTabs&&S.manifestTabs.find(function(t){return t.id===S.activeManifestTabId;});
  if(_curTab2)_curTab2.savedId=null;
  await window.saveManifest();
};
window.deleteCurrentManifest=async function(){
  if(!S._loadedManifestId)return;
  const id=S._loadedManifestId;
  const m=S.manifests.find(function(x){return x.id===id;});
  if(!m){S._loadedManifestId=null;render();return;}
  if(!confirm('Move this manifest to Bin?'))return;
  if(!m.data)m.data={};
  m.data._deleted=true;m._deleted=true;
  S._loadedManifestId=null;
  const _delTab=S.manifestTabs&&S.manifestTabs.find(function(t){return t.id===S.activeManifestTabId;});
  if(_delTab)_delTab.savedId=null;
  lsSet('ts_manifests_cache',S.manifests);
  await sbU('ts_manifests',[{id:m.id,name:m.name,data:m.data,saved_at:m.savedAt}]);
  toast('Manifest moved to Bin.','ok');
};

function _autoSaveCurrent(reason){
  const d=S.dispatch;
  const hasPax=d.pax&&d.pax.length>0;
  const hasAc=d.acSetup&&d.acSetup.length>0;
  const hasName=d.name&&d.name.trim();
  if(!hasPax&&!hasAc&&!hasName)return; // nothing to save
  const nm=d.name||('Auto: '+(d.dep||'?')+'-'+(d.dest||'?')+' '+new Date().toLocaleString('en-NZ',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}));
  const id='mn_autosave_'+Date.now();
  const data={dep:d.dep,dest:d.dest,date:d.date,etd:d.etd,acSetup:d.acSetup,pax:d.pax,name:nm};
  S.manifests=S.manifests||[];
  S.manifests.unshift({id,name:nm,savedAt:new Date().toISOString(),data});
  lsSet('ts_manifests_cache',S.manifests);
  sbU('ts_manifests',[{id,name:nm,saved_at:new Date().toISOString(),data}]);
  auditLog('manifest_autosave',{name:nm,reason,pax:d.pax.length});
}
window.loadManifest=id=>{
  const m=S.manifests.find(x=>x.id===id);if(!m)return;
  const now=Date.now();
  const data={...bD(),...m.data,seatMap:{},step:1};
  (data.pax||[]).forEach(function(p){p._ts=now;});
  (data.acSetup||[]).forEach(function(s){s._ts=now;});
  data._updateTs=now;data._loadedAt=now;
  // Tab-aware load: if current tab is blank replace it, otherwise open new tab
  if(!S._manifestDispatches)S._manifestDispatches={};
  if(!S.manifestTabs)S.manifestTabs=[];
  const _curIsBlank=!S.dispatch.pax?.length&&!S.dispatch.acSetup?.length;
  const _curTab=S.manifestTabs.find(function(t){return t.id===S.activeManifestTabId;});
  if(_curIsBlank&&_curTab){
    // Replace current blank tab
    S.dispatch=data;
    S._loadedManifestId=m.id;
    _curTab.savedId=m.id;
    S._manifestDispatches[S.activeManifestTabId]=JSON.parse(JSON.stringify(data));
  } else {
    // No current tab, or current has data — open in new tab
    if(S.activeManifestTabId)S._manifestDispatches[S.activeManifestTabId]=JSON.parse(JSON.stringify(S.dispatch));
    const newId='mt_'+Date.now();
    S._manifestDispatches[newId]=JSON.parse(JSON.stringify(data));
    S.manifestTabs.push({id:newId,savedId:m.id});
    S.activeManifestTabId=newId;
    S.dispatch=JSON.parse(JSON.stringify(data));
    S._loadedManifestId=m.id;
  }
  S.viewAc=null;S.viewAc2=null;S.selectedPax=null;S.solverRes={};
  S._newLsTab=false;  // ensure manifest view isn't blocked by new-LS panel
  auditLog('manifest_load',{name:m.name,pax:(m.data&&m.data.pax?m.data.pax.length:0)});
  S._undoLabel='Load "'+m.name+'"';
  toast('Loaded: '+(m.name||'Manifest'),'ok');
  S.tab='manifest';window.scrollTo(0,0);
  autoSaveDispatch();
  window.saveWorkspace&&window.saveWorkspace();
  render();
};
window.undoManifest=function(){
  if(!S._dispatchUndo)return;
  S.dispatch=S._dispatchUndo;S._dispatchUndo=null;S._undoLabel=null;
  S.viewAc=null;S.viewAc2=null;S.selectedPax=null;S.solverRes={};
  autoSaveDispatch();render();
};
window.clearAllManifests=async function(){
  if(!confirm('Delete ALL saved manifests? This cannot be undone.'))return;
  var ids=S.manifests.map(function(m){return m.id;});
  S.manifests=[];lsSet('ts_manifests_cache',[]);render();
  for(var i=0;i<ids.length;i++){try{await sbDel('ts_manifests',ids[i]);}catch(e){}}
};
window.duplicateSaved=function(id){
  var s=S.saved.find(function(x){return x.id===id;});
  if(!s){toast('Loadsheet not found.','warn');return;}
  var newId='ls_dup_'+Date.now();
  var newForm=JSON.parse(JSON.stringify(s.form));
  newForm.sig=null;newForm.status='unsigned';
  var newSaved={id:newId,form:newForm,status:'unsigned',savedAt:new Date().toISOString()};
  S.saved.push(newSaved);
  var acCode=(newForm.ac||'ZK-SLD').replace('ZK-','');
  S.lsForms[acCode]=newForm;S.lsAc=acCode;S.form=newForm;S.editId=newId;S.formDirty=false;
  S.lsTabs=S.lsTabs||[];
  S.lsTabs.push({id:newId,acId:newForm.ac,form:newForm,status:'unsigned',savedAt:newSaved.savedAt,isNew:true});
  S.activeTabId=newId;S.tab='loadsheet';
  sbU('ts_loadsheets',[{id:newId,form:newForm,saved_at:newSaved.savedAt,status:'unsigned'}]).catch(function(){});
  render();
  toast('Loadsheet duplicated &mdash; edit and re-sign','ok');
};
window.viewSaved=function(id){
  // Open in the current Operations ▸ Loadsheets editor (the legacy 'loadsheet' route is retired).
  if(typeof window.rezdyOpenLsTab==='function'){window.rezdyOpenLsTab(id);window.saveWorkspace&&window.saveWorkspace();return;}
  var existing=S.lsTabs.find(function(t){return t.id===id;});
  if(existing){window.switchLsTab(id);return;}
  var s=S.saved.find(function(x){return x.id===id;});
  if(!s)return;
  var acFull=s.form&&s.form.ac?s.form.ac:'ZK-SLA';
  var _vsForm=dc(s.form);if(!_vsForm.cargo)_vsForm.cargo={};var _vsAc=S.aircraft[_vsForm.ac];if(_vsAc&&_vsAc.layout==='ga8'&&(!_vsForm.burnOff||parseFloat(_vsForm.burnOff)<30)){_vsForm.burnOff='35';}
  S.lsTabs.push({id:s.id,acId:acFull,form:_vsForm,status:s.status||'unsigned',savedAt:s.savedAt,isNew:false,originalForm:dc(s.form)});
  window.switchLsTab(s.id);window.saveWorkspace&&window.saveWorkspace();
};
window.reopenSaved=async function(id){
  if(!confirm('Reopen this loadsheet for editing? The pilot signature will be cleared and they will need to re-sign.'))return;
  var s=S.saved.find(function(x){return x.id===id;});
  if(!s)return;
  var form=dc(s.form);
  form.sig=null;form.status='unsigned';form.sigTs=null;
  if(!form.cargo)form.cargo={};var _rsAc=S.aircraft[form.ac];if(_rsAc&&_rsAc.layout==='ga8'&&(!form.burnOff||parseFloat(form.burnOff)<30)){form.burnOff='35';}
  s.form=form;s.status='unsigned';
  lsSet('ts_loadsheets_cache',S.saved);
  auditLog('loadsheet_reopen',{id:s.id,ac:form.ac||'',date:form.date||''}); // un-signs a controlled record
  await sbU('ts_loadsheets',[{id:s.id,form:form,saved_at:s.savedAt,status:'unsigned'}]);
  var acFull=form.ac||'ZK-SLA';
  var existing=S.lsTabs.find(function(t){return t.id===id;});
  if(existing){existing.form=form;existing.status='unsigned';existing.acId=acFull;}
  // Open in the current Operations ▸ Loadsheets editor (the legacy 'loadsheet' route is retired).
  if(typeof window.rezdyOpenLsTab==='function'){window.rezdyOpenLsTab(id);}
  else if(existing){window.switchLsTab(id);}
  else{S.lsTabs.push({id:s.id,acId:acFull,form:form,status:'unsigned',savedAt:s.savedAt});window.switchLsTab(s.id);}
  toast('Loadsheet reopened - signature cleared','ok');
  window.saveWorkspace&&window.saveWorkspace();
};
window.deleteManifest=async function(id){if(!confirm('Move this manifest to Bin?'))return;var m=S.manifests.find(function(x){return x.id===id;});if(!m)return;if(!m.data)m.data={};m.data._deleted=true;m._deleted=true;lsSet('ts_manifests_cache',S.manifests);render();await sbU('ts_manifests',[{id:m.id,name:m.name,data:m.data,saved_at:m.savedAt}]);};
window.toggleSavedSel=id=>{if(S.savedSel[id])delete S.savedSel[id];else S.savedSel[id]=true;render();};
window.selectAllSaved=ids=>{var all=ids.length&&ids.every(id=>S.savedSel[id]);ids.forEach(id=>{if(all)delete S.savedSel[id];else S.savedSel[id]=true;});render();};
window.clearSavedSel=()=>{S.savedSel={};render();};
window.bulkDeleteSaved=async function(){
  const ids=Object.keys(S.savedSel);
  if(!ids.length)return;
  if(!confirm('Move '+ids.length+' item(s) to Bin?'))return;
  const lsIds=ids.filter(function(id){return S.saved.find(function(s){return s.id===id;});});
  const mIds=ids.filter(function(id){return S.manifests.find(function(m){return m.id===id;});});
  S.saved.forEach(function(s){if(lsIds.indexOf(s.id)>=0){s.form._prevStatus=s.status;s.status='deleted';if(window._lsStickyMark)window._lsStickyMark(s.id,'deleted',true);}});
  S.manifests.forEach(function(m){if(mIds.indexOf(m.id)>=0){if(!m.data)m.data={};m.data._deleted=true;m._deleted=true;}});
  lsSet('ts_loadsheets_cache',S.saved);
  lsSet('ts_manifests_cache',S.manifests);
  auditLog('loadsheet_bin_bulk',{loadsheets:lsIds.length,manifests:mIds.length});
  S.savedSel={};render();
  for(var i=0;i<lsIds.length;i++){var s2=S.saved.find(function(x){return x.id===lsIds[i];});if(s2)await sbU('ts_loadsheets',[_lsWritePayload(s2.id,s2.form,s2.savedAt,'deleted',!!s2.driveUploaded)]).catch(function(){});}
  for(var j=0;j<mIds.length;j++){var m2=S.manifests.find(function(x){return x.id===mIds[j];});if(m2)await sbU('ts_manifests',[{id:m2.id,name:m2.name,data:m2.data,saved_at:m2.savedAt}]).catch(function(){});}
};
window.bulkUploadSaved=async function(){
  const ids=Object.keys(S.savedSel);
  const signed=ids.filter(function(id){const s=S.saved.find(function(x){return x.id===id;});return s&&s.status==='complete';});
  if(!signed.length){toast('No signed loadsheets selected.','warn');return;}
  if(!S.gdriveClientId){toast('Google Drive Client ID not set — check Admin > Google Drive.','warn');return;}
  var _bulkToken=null;
  try{
    _bulkToken=await new Promise(function(res,rej){
      function _init(){google.accounts.oauth2.initTokenClient({client_id:S.gdriveClientId,scope:'https://www.googleapis.com/auth/drive',callback:function(r){if(r.error)rej(new Error(r.error));else res(r.access_token);}}).requestAccessToken();}
      if(window.google&&window.google.accounts&&window.google.accounts.oauth2){_init();}
      else{var _gs=document.createElement('script');_gs.src='https://accounts.google.com/gsi/client';_gs.onload=_init;_gs.onerror=function(e){rej(new Error('Failed to load Google sign-in'));};document.head.appendChild(_gs);}
    });
  }catch(e){toast('Could not get Drive token: '+(e&&e.message||e),'err');return;}
  toast('Uploading '+signed.length+' sheet(s)…','info');
  var ok=0,fail=0;
  for(var i=0;i<signed.length;i++){
    var sheet=S.saved.find(function(s){return s.id===signed[i];});
    if(!sheet)continue;
    try{
      await uploadToDrive(sheet,_bulkToken);
      ok++;
    }catch(e){fail++;}
  }
  S.savedSel={};
  toast('Drive upload: '+ok+' uploaded'+(fail?' ('+fail+' failed)':''),'ok');
  render();
};

window.clearManifest=()=>{
  const hasData=(S.dispatch.pax&&S.dispatch.pax.length>0)||(S.dispatch.acSetup&&S.dispatch.acSetup.length>0);
  if(!hasData){return;} // nothing to clear
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
  var box=document.createElement('div');
  box.style.cssText='background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:22px;max-width:360px;width:100%';
  box.innerHTML='<div style="font-size:16px;font-weight:700;margin-bottom:8px">Close without saving?</div>'
    +'<div style="font-size:13px;color:var(--text3);margin-bottom:18px">This will clear the current manifest. Save first to keep it.</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:8px">'
    +(S._loadedManifestId
      ?'<button id="_clrSave" style="flex:1;padding:11px;background:var(--acc);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">💾 Save</button>'
      :'<button id="_clrSave" style="flex:1;padding:11px;background:var(--acc);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">💾 Save</button>')
    +'<button id="_clrDel" style="flex:1;padding:11px;background:transparent;color:#ef4444;border:1.5px solid #ef4444;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Discard</button>'
    +'</div>'
    +'<button id="_clrCancel" style="width:100%;padding:10px;background:var(--card2);color:var(--text2);border:1px solid var(--border2);border-radius:8px;font-size:13px;cursor:pointer">Cancel</button>';
  ov.appendChild(box);
  document.body.appendChild(ov);
  function _doClear(){
    ov.remove();
    S._dispatchUndo=JSON.parse(JSON.stringify(S.dispatch));
    auditLog('manifest_clear',{pax:(S.dispatch.pax||[]).length});
    S._undoLabel='Clear';
    S._loadedManifestId=null;
    const _clrTab=S.manifestTabs&&S.manifestTabs.find(function(t){return t.id===S.activeManifestTabId;});
    if(_clrTab)_clrTab.savedId=null;
    S.dispatch=bD();
    if(!S._manifestDispatches)S._manifestDispatches={};
    S._manifestDispatches[S.activeManifestTabId]=JSON.parse(JSON.stringify(S.dispatch));
    S.viewAc=null;S.viewAc2=null;S.selectedPax=null;S.solverRes={};
    autoSaveDispatch();render();
  }
  document.getElementById('_clrSave').onclick=function(){ov.remove();saveManifest();};
  document.getElementById('_clrDel').onclick=function(){_doClear();};
  document.getElementById('_clrCancel').onclick=function(){ov.remove();};
};

// ── Manifest tab management ──
window.switchManifestTab=function(id){
  if(!id)return;
  if(id===S.activeManifestTabId){
    // Second click on active tab → enter rename mode
    S._editingManifestTabId=id;
    render();
    setTimeout(function(){var inp=document.getElementById('tab-rename-'+id);if(inp){inp.focus();inp.select();}},60);
    return;
  }
  S._editingManifestTabId=null;
  if(!S._manifestDispatches)S._manifestDispatches={};
  // Save current dispatch (guard against null id before tabs are initialised)
  if(S.activeManifestTabId)S._manifestDispatches[S.activeManifestTabId]=JSON.parse(JSON.stringify(S.dispatch));
  // Switch
  S.activeManifestTabId=id;
  S.dispatch=JSON.parse(JSON.stringify(S._manifestDispatches[id]||bD()));
  const tab=S.manifestTabs&&S.manifestTabs.find(function(t){return t.id===id;});
  S._loadedManifestId=(tab&&tab.savedId)||null;
  S.viewAc=null;S.viewAc2=null;S.selectedPax=null;S.solverRes={};
  autoSaveDispatch();broadcastManifestTabs();
  render();
};
window.newManifestTab=function(){
  if(!S._manifestDispatches)S._manifestDispatches={};
  if(!S.manifestTabs)S.manifestTabs=[];
  // Save current
  if(S.activeManifestTabId)S._manifestDispatches[S.activeManifestTabId]=JSON.parse(JSON.stringify(S.dispatch));
  // Create new blank tab
  const newId='mt_'+Date.now();
  const newDisp=bD();
  S._manifestDispatches[newId]=JSON.parse(JSON.stringify(newDisp));
  S.manifestTabs.push({id:newId,savedId:null});
  S.activeManifestTabId=newId;
  S.dispatch=newDisp;
  S._loadedManifestId=null;
  S.viewAc=null;S.viewAc2=null;S.selectedPax=null;S.solverRes={};
  window.saveWorkspace&&window.saveWorkspace();
  broadcastManifestTabs();
  render();
};
window.closeManifestTab=function(id){
  if(!S.manifestTabs)return;
  const tabIdx=S.manifestTabs.findIndex(function(t){return t.id===id;});
  if(tabIdx<0)return;
  const d=id===S.activeManifestTabId?S.dispatch:((S._manifestDispatches||{})[id]||{});
  const hasData=(d.pax&&d.pax.length>0)||(d.acSetup&&d.acSetup.length>0);
  if(hasData&&!confirm('Close this manifest tab? Unsaved changes will be lost.'))return;
  S.manifestTabs.splice(tabIdx,1);
  if(S._manifestDispatches)delete S._manifestDispatches[id];
  // If closing active tab, switch to adjacent
  if(id===S.activeManifestTabId){
    if(S.manifestTabs.length===0){
      // Allow 0 open tabs — show empty state
      S.activeManifestTabId=null;
      S.dispatch=bD();
      S._loadedManifestId=null;
    } else {
      const nextTab=S.manifestTabs[Math.min(tabIdx,S.manifestTabs.length-1)];
      S.activeManifestTabId=nextTab.id;
      S.dispatch=JSON.parse(JSON.stringify((S._manifestDispatches||{})[nextTab.id]||bD()));
      S._loadedManifestId=(nextTab.savedId)||null;
    }
  }
  S.viewAc=null;S.viewAc2=null;S.selectedPax=null;S.solverRes={};
  window.saveWorkspace&&window.saveWorkspace();
  broadcastManifestTabs();
  render();
};

// ── Generate loadsheet from manifest ──
window.openAcLoadsheet=function(acId){generateLoadsheet(acId);};
function generateLoadsheet(acId){
  // acId may be a duplicate-instance seat key (e.g. "ZK-SLA_2"); resolve specs/physical.
  const d=curDisp();const a=_acSpec(acId);if(!a)return;
  const phys=_ac(acId);
  const setup=d.acSetup.find(s=>(s._seatmapKey||s.acId)===acId)||d.acSetup.find(s=>s.acId===phys);const form=bF();
  form.ac=phys;form.dep=d.dep;form.dest=d.dest;form.date=d.date;form.etd=d.etd;form.etdCustom=d.etdCustom||false;
  form.paxPaymentReq={};
  form.pic=setup?.pic||'';form.coPilot=setup?.coPilot||'';
  const picCrew=anyCrewList().find(c=>c.n===form.pic);if(picCrew&&picCrew.w){form.seats[0]=String(picCrew.w);form.names[0]=form.pic;}
  if(setup?.coPilot){const cp=anyCrewList().find(c=>c.n===setup.coPilot);if(cp&&cp.w){form.seats[1]=String(cp.w);form.names[1]=setup.coPilot;}}
  else{const sm=d.seatMap[acId]||{};const p=sm[1]?paxById(sm[1]):null;if(p){form.seats[1]=p.weight||'';form.bags[1]=p.bag||'';form.names[1]=p.name||'';if(p.type==='child')form.paxType[1]='C';form.paxGroups[1]=p.group||'';if(p.paymentReq)form.paxPaymentReq[1]=true;}}
  form.fuel=String(fuelKgForSetup(acId));
  form.createdBy=(S.user&&S.user.name)||'';
  form.createdAt=new Date().toISOString();
  const sm=d.seatMap[acId]||{};
  const seatIdxs=paxSeatIdxs(acId)||[];seatIdxs.forEach(function(i){if(i<=1)return;const p=sm[i]?paxById(sm[i]):null;if(p){form.seats[i]=p.weight||'';form.bags[i]=p.bag||'';form.names[i]=p.name||'';if(p.infantName)form.infantNames[i]=p.infantName;if(p.type==='child')form.paxType[i]='C';form.paxGroups[i]=p.group||'';if(p.paymentReq)form.paxPaymentReq[i]=true;}});
  // seat 1 infant (non-copilot)
  {const p=sm[1]?paxById(sm[1]):null;if(p&&p.infantName)form.infantNames[1]=p.infantName;}
  const _lsAcCode=phys.replace('ZK-','');
  const _newTabId='ls_'+_lsAcCode+'_'+Date.now();
  S.lsForms[_lsAcCode]=form;S.lsAc=_lsAcCode;S.form=form;S.editId=_newTabId;S.formDirty=false;
  // Populate _unallocated: pax pinned to this aircraft but not given a seat
  {const _spIds=new Set(Object.values(sm));const _unass=(d.pax||[]).filter(function(p){return p.pinAc===phys&&!_spIds.has(p.id)&&!p.infant&&p.name;});var _pool=_uaPool();_unass.forEach(function(p){if(!_pool.some(function(x){return x.name===p.name&&String(x.weight)===String(p.weight);}))_pool.push({name:p.name,weight:p.weight,bag:p.bag||0,infant:p.infantName||null,group:p.group||'',type:p.type||'adult',paymentReq:!!p.paymentReq});});form._unallocated=_pool;}
  // Fuel/burnOff defaults by aircraft type
  if(a.layout==='ga8'&&(!form.burnOff||parseFloat(form.burnOff)<30)){form.burnOff='35';}
  if(a.layout==='c208'){form.fuel=String(Math.round(800*0.453592));}
  var _savedAt=new Date().toISOString();
  S.lsTabs.push({id:_newTabId,acId:phys,form:form,status:'draft',savedAt:_savedAt,isNew:true});
  S.activeTabId=_newTabId;S._newLsTab=false;S.tab='loadsheet';
  // Save as draft — use clone so S.saved entry is not aliased to live edit buffer
  var _formSnap=dc(form);
  sbU('ts_loadsheets',[{id:_newTabId,form:_formSnap,saved_at:_savedAt,status:'draft'}]).catch(function(){});
  S.saved=S.saved||[];S.saved.unshift({id:_newTabId,form:_formSnap,status:'draft',savedAt:_savedAt});lsSet('ts_loadsheets_cache',S.saved);
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_tab_open',payload:{id:_newTabId,acId:acId,form:_formSnap,savedAt:_savedAt,status:'draft',isNew:true,by:(S.user&&S.user.name)||''}},ref:String(_rtRef)}));}
  window.saveWorkspace&&window.saveWorkspace();
  render();
};

// ── Loadsheet form handlers ──
window.lsAc=v=>{
  const oldAc=S.form.ac;
  const kN=S.form.names||{},kS=S.form.seats||{},kB=S.form.bags||{},kI=S.form.infantNames||{};
  const oldType=(S.aircraft[oldAc]||{}).type;
  const newType=(S.aircraft[v]||{}).type;
  const sameType=!!(oldType&&oldType===newType);
  const newA=S.aircraft[v];
  // Commit switch immediately (avoid confirm() which is unreliable on iOS PWA)
  S.form.ac=v;
  S.form.names=kN;S.form.seats=kS;S.form.bags=kB;S.form.infantNames=kI;
  if(!sameType){S.form.cargo={};S.form.fuel='';S.form.burnOff='';}
  S.form.sig=null;
  // Trim & warn about excess passengers
  if(newA){
    const maxIdx=newA.seats.length;
    // A seat is unusable on the new aircraft if it's past the array OR explicitly removed
    // (e.g. ZK-SLB has removedSeats [12,13] inside a 14-seat array). Ignoring removedSeats left a
    // pax in a removed seat: hidden on the grid but still counted by calcFormWB = phantom weight.
    const rm=(newA.removedSeats||[]);
    const _gone=i=>{const n=parseInt(i);return n>=maxIdx||rm.indexOf(n)>=0;};
    const excessIdxs=new Set();
    Object.keys(kN).forEach(i=>{if(_gone(i)&&kN[i])excessIdxs.add(i);});
    Object.keys(kS).forEach(i=>{if(_gone(i)&&parseFloat(kS[i])>0)excessIdxs.add(i);});
    // Move excess passengers to _unallocated instead of deleting
    excessIdxs.forEach(function(i){
      const nm=kN[i]||'';const wt=kS[i]||'';const bg=kB[i]||'';const inf=(kI||{})[i]||'';
      if(nm||wt){_uaPool().push({name:nm,weight:wt,bag:bg,infant:inf||null,group:(S.form.paxGroups||{})[i]||'',type:((S.form.paxType||{})[i]==='C'?'child':'adult'),paymentReq:!!((S.form.paxPaymentReq||{})[i])});}
    });
    [S.form.seats,S.form.bags,S.form.names,S.form.infantNames,S.form.paxGroups,S.form.paxType,S.form.paxPaymentReq].forEach(obj=>{
      if(obj)Object.keys(obj).forEach(i=>{if(_gone(i))delete obj[i];});
    });
    if(excessIdxs.size>0){
      toast('⚠ '+excessIdxs.size+' passenger(s) removed — '+acDisp(v)+' only has '+(maxIdx-1)+' pax seats.','warn');
    }
  }
  // W&B overload check
  const wb=calcFormWB(S.form);
  if(wb){
    if(!wb.towOk)toast('⚠ '+acDisp(v)+' TOW '+wb.tow.toFixed(0)+'kg exceeds MTOW '+newA.mtow+'kg — reduce load.','warn');
    else if(!wb.lwOk)toast('⚠ '+acDisp(v)+' landing weight '+wb.lw.toFixed(0)+'kg exceeds MLW '+newA.mlw+'kg.','warn');
    else if(!wb.cogOk)toast('⚠ '+acDisp(v)+' C of G out of range.','warn');
  }
  render();
};
window.lsCopyFlight=function(targetAc){
  const src=S.form;
  if(!S.lsForms[targetAc]) S.lsForms[targetAc]=bF_ac('ZK-'+targetAc);
  const tgt=S.lsForms[targetAc];
  const tgtAc=S.aircraft['ZK-'+targetAc];
  const tgtSeatCount=tgtAc?tgtAc.seats.length:999;
  tgt.dep=src.dep;tgt.dest=src.dest;tgt.date=src.date;tgt.etd=src.etd;tgt.etdCustom=src.etdCustom||false;
  tgt.pic=src.pic;tgt.coPilot=src.coPilot;
  tgt.names={};tgt.seats={};tgt.bags={};tgt.infantNames={};tgt.paxGroups={};tgt.paxType={};tgt.paxPaymentReq={};
  const srcInfants=src.infantNames||{},srcGroups=src.paxGroups||{},srcTypes=src.paxType||{},srcPay=src.paxPaymentReq||{};
  Object.keys(src.names||{}).forEach(function(k){
    const i=parseInt(k);
    const nm=src.names[i]||'';const wt=src.seats[i]||'';
    const bg=src.bags[i]||'';const inf=srcInfants[i]||'';const grp=srcGroups[i]||'';const typ=srcTypes[i]||'';const pay=!!srcPay[i];
    if(!nm&&!wt)return;
    if(i<tgtSeatCount){
      tgt.names[i]=nm;tgt.seats[i]=wt;tgt.bags[i]=bg;
      if(inf){if(!tgt.infantNames)tgt.infantNames={};tgt.infantNames[i]=inf;}
      if(grp)tgt.paxGroups[i]=grp;if(typ==='C')tgt.paxType[i]='C';if(pay)tgt.paxPaymentReq[i]=true;
    } else {
      _uaPool().push({name:nm,weight:wt,bag:bg,infant:inf||null,group:grp,type:(typ==='C'?'child':'adult'),paymentReq:pay});
    }
  });
  tgt.cargo=Object.assign({},src.cargo||{});
  // Unallocated pool is shared across all loadsheets — nothing to carry over.
  // Fuel: copy increased fuel if same aircraft type, otherwise use target standard
  const srcAc=S.aircraft[src.ac];
  const srcType=(srcAc&&(srcAc.layout||srcAc.type||'')).toLowerCase();
  const tgtType=(tgtAc&&(tgtAc.layout||tgtAc.type||'')).toLowerCase();
  const sameType=srcType&&tgtType&&srcType===tgtType;
  const srcStdFuelKg=srcAc&&srcAc.fuelKg?srcAc.fuelKg:0;
  const srcFuelValKg=parseFloat(src.fuel)||0;
  if(sameType&&srcFuelValKg>srcStdFuelKg){
    tgt.fuel=src.fuel;
    tgt.burnOff=src.burnOff||'';
  } else if(tgtAc&&tgtAc.fuelKg){
    tgt.fuel=String(tgtAc.fuelKg);
    tgt.burnOff='';
  }
  const unallocCount=_uaPool().length;
  const paxCount=Object.keys(tgt.names).filter(function(k){return tgt.names[k];}).length;
  autoSaveLS();
  toast('Copied to ZK-'+targetAc+' ('+paxCount+' seats'+(unallocCount?' +'+unallocCount+' unallocated':'')+')','ok');
};

window.lsTrimExcess=()=>{
  const a=S.aircraft[S.form.ac];if(!a)return;
  const max=a.seats.length,removed=a.removedSeats||[];
  [S.form.seats,S.form.bags,S.form.names,S.form.infantNames,S.form.paxGroups,S.form.paxType,S.form.paxPaymentReq].forEach(obj=>{
    if(!obj)return;
    Object.keys(obj).forEach(i=>{const n=parseInt(i);if(n>=max||removed.includes(n))delete obj[i];});
  });
  autoSaveLS();render();
};
window.lsDelPax=idx=>{
  _lsUndoPush();
  delete S.form.names[idx];delete S.form.seats[idx];delete S.form.bags[idx];
  if(S.form.infantNames)delete S.form.infantNames[idx];
  if(S.form.paxGroups)delete S.form.paxGroups[idx];
  if(S.form.paxType)delete S.form.paxType[idx];
  if(S.form.paxPaymentReq)delete S.form.paxPaymentReq[idx];
  autoSaveLS();render();
};
window.lsUndo=function(){
  var _us=S._lsFormUndoStack;
  if(!_us||!_us.length)return;
  var snap=_us.pop();
  // Back-compat: older snapshots were the bare form object.
  var snapForm=snap&&snap.form?snap.form:snap;
  var snapPool=snap&&snap.pool?snap.pool:null;
  S.form=snapForm;
  if(snapPool){var p=_uaPool();p.length=0;snapPool.forEach(function(x){p.push(x);});}
  S._lsFormUndo=_us.length?_us[_us.length-1]:null;
  var tab=S.lsTabs.find(function(t){return t.id===S.editId;});
  if(tab)tab.form=S.form;
  autoSaveLS();autoSaveDispatch();render();
};
window.lsPIC=v=>{S.form.pic=v;const c=anyCrewList().find(x=>x.n===v);if(c&&c.w){S.form.seats[0]=String(c.w);S.form.names[0]=v;}else{S.form.names[0]=v;}autoSaveLS();render();};
// Draggable PIC pool → drag a pilot bubble onto the PIC slot to set them as PIC.
window.lsPilotDragStart=function(e,name){S._lsPilotDrag=name;try{e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('text/plain',name);}catch(_){}};
window.lsPicDrop=function(e){var name=S._lsPilotDrag;S._lsPilotDrag=null;try{if(!name&&e&&e.dataTransfer)name=e.dataTransfer.getData('text/plain');}catch(_){}if(name&&typeof window.lsPIC==='function')window.lsPIC(name);};
window.lsCopilotDrop=function(e){var name=S._lsPilotDrag;S._lsPilotDrag=null;try{if(!name&&e&&e.dataTransfer)name=e.dataTransfer.getData('text/plain');}catch(_){}if(name&&typeof window.lsCoPilot==='function')window.lsCoPilot(name);};
window.lsCoPilot=v=>{
  const f=S.form;
  // Save displaced seat-1 passenger to unallocated before overwriting
  const prevName=f.names[1]||'';
  const prevWt=f.seats[1]||'';
  const prevBag=f.bags[1]||'';
  const prevInfant=(f.infantNames||{})[1]||'';
  const prevGroup=(f.paxGroups||{})[1]||'';const prevType=(f.paxType||{})[1]||'';const prevPay=!!((f.paxPaymentReq||{})[1]);
  const wasPassenger=prevName&&prevName!==f.coPilot;
  f.coPilot=v;
  const cr=anyCrewList().find(x=>x.n===v);
  // Pool any displaced real passenger before overwriting seat 1 — regardless of whether the new
  // co-pilot has a recorded weight (a weightless co-pilot must NOT silently drop the pax).
  if(v&&wasPassenger){
    _uaPool().push({name:prevName,weight:prevWt,bag:prevBag,infant:prevInfant||null,group:prevGroup,type:(prevType==='C'?'child':'adult'),paymentReq:prevPay});
  }
  // ALWAYS clear every per-seat-index map at seat 1 so no bag/group/type/TO-PAY/infant is orphaned.
  // An orphaned f.bags[1] would be counted as crew weight by calcFormWB, silently inflating the
  // TOW/CoG on a signable loadsheet (the per-seat maps must always move/clear together).
  delete f.seats[1];delete f.names[1];
  if(f.bags)delete f.bags[1];if(f.infantNames)delete f.infantNames[1];
  if(f.paxGroups)delete f.paxGroups[1];if(f.paxType)delete f.paxType[1];if(f.paxPaymentReq)delete f.paxPaymentReq[1];
  // Seat the co-pilot: name always, weight only if the crew record has one (else blank, not stale).
  if(v){f.names[1]=v;f.seats[1]=(cr&&cr.w)?String(cr.w):'';}
  autoSaveLS();
  render();
};
window.lsGrp=function(idx,val){
  S.form.paxGroups=S.form.paxGroups||{};
  S.form.paxGroups[parseInt(idx)]=val;
  var nm=(S.form.names[idx]||'').trim();
  if(nm&&S.dispatch&&S.dispatch.pax){
    var _dp=S.dispatch.pax.find(function(px){return(px.name||'').trim().toLowerCase()===nm.toLowerCase();});
    if(_dp)_dp.group=val;
  }
  autoSaveLS();_lsSafeRender();
};
window.lsN=(i,v)=>{S.form.names[i]=v;autoSaveLS();};window.lsS=(i,v)=>{S.form.seats[i]=v;autoSaveLS();setTimeout(_lsSafeRender,150);};window.lsB=(i,v)=>{S.form.bags[i]=v;autoSaveLS();setTimeout(_lsSafeRender,150);};window.lsC=(i,v)=>{if(!S.form.cargo)S.form.cargo={};S.form.cargo[i]=v;S.formDirty=true;autoSaveLS();setTimeout(_lsSafeRender,150);};
window.lsFuel=(v,acId)=>{
  var s=String(v==null?'':v).trim();
  if(s===''){ // cleared → drop back to the route/product default
    S.form._fuelUserSet=false;
    var _d=(typeof _lsDefaultFuelKg==='function')?_lsDefaultFuelKg(S.form):null;var _a=S.aircraft[acId];
    S.form.fuel=String(_d!=null?_d:(_a&&_a.fuelKg!=null?_a.fuelKg:0));
  }else{ // a typed value always overrides the standard/default fuel
    S.form.fuel=String(toKg(s,acId));S.form._fuelUserSet=true;
  }
  autoSaveLS();setTimeout(_lsSafeRender,150);
};
window.lsBurn=(v,acId)=>{if(!v||v===''){const _a=S.aircraft[acId];S.form.burnOff=(_a&&_a.layout==='ga8')?'35':(_a&&_a.burnDef?String(_a.burnDef):'');}else{S.form.burnOff=v;}autoSaveLS();setTimeout(_lsSafeRender,150);};
window.lsGndBurn=(v,acId)=>{const n=parseFloat(v);S.form.gndBurn=isNaN(n)?null:String(toKg(n,acId));autoSaveLS();setTimeout(_lsSafeRender,150);};
window.clearSig=()=>{S.form.sig=null;S.sigTypedName='';autoSaveLS();render();};
window.lsReserveNote=function(){
  var f=S.form,r=f?calcFormWB(f):null;
  var unit=(f&&typeof fuelUnit==='function')?fuelUnit(f.ac):'';
  var have=r?(unit==='L'?Math.round(r.fuelRemKg/AVGAS):Math.round(r.fuelRemKg/LB)):0;
  var need=r?(unit==='L'?Math.round(r.finalReserveKg/AVGAS):Math.round(r.finalReserveKg/LB)):0;
  alert('⚠ BELOW FINAL RESERVE\n\nFuel remaining at destination ('+have+' '+unit+') is less than the 30-minute final reserve minimum ('+need+' '+unit+').\n\nThis loadsheet cannot be signed until the fuel at destination is at or above the final reserve. Add fuel, or reduce ground/flight burn (shorter trip), then re-check.');
};

// Apply typed name as a signature
window.applyTypedSig=()=>{
  const name=(document.getElementById('sigTypeInput')?.value||'').trim();
  if(!name){toast('Please type your name.','warn');return;}
  S.sigTypedName=name;
  const c=document.getElementById('sigCanvas');if(!c)return;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle='rgba(255,255,255,0)';ctx.fillRect(0,0,c.width,c.height);
  // Render signature-style text
  ctx.font='italic 48px Georgia, serif';
  ctx.fillStyle='#1e293b';
  ctx.textBaseline='middle';
  const tw=ctx.measureText(name).width;
  const x=Math.max(20,(c.width-tw)/2);
  ctx.fillText(name,x,c.height/2);
  // Add underline
  ctx.beginPath();ctx.strokeStyle='#475569';ctx.lineWidth=1.5;
  ctx.moveTo(x-5,c.height/2+32);ctx.lineTo(x+tw+5,c.height/2+32);ctx.stroke();
  S.form.sig=c.toDataURL();
  autoSaveLS();
  render();
};

// ── Save / Submit ──
// Carry the Drive-archive flag (and who/when) forward across a re-save so an archived loadsheet
// (status 'complete' + driveUploaded) doesn't fall back to the Signed tab. Returns the flag for the
// upsert payload so the server keeps drive_uploaded too.
function _lsCarryArchive(id,sheet){
  var pv=(S.saved||[]).find(function(s){return s.id===id;})||{};
  if(pv.driveUploaded){sheet.driveUploaded=true;sheet.uploadedBy=pv.uploadedBy||'';sheet.uploadedAt=pv.uploadedAt||'';}
  return !!pv.driveUploaded;
}
window.saveUnsigned=async()=>{
  const f=S.form;if(!f.ac){toast('Select an aircraft first.','warn');return;}
  const id=S.editId||('ls_'+Date.now());
  const isEdit=!!S.editId;
  f.savedBy=(S.user&&S.user.name)||'';
  const sheet={id,savedAt:new Date().toISOString(),form:dc(f),status:'unsigned'};
  var _du=_lsCarryArchive(id,sheet);
  S.saved=S.saved.filter(s=>s.id!==id);S.saved.unshift(sheet);
  S.editId=id;S.formDirty=false;
  // Clear originalForm — user deliberately saved, so restore banner no longer needed
  var _savingTab=S.lsTabs.find(function(t){return t.id===id;});
  if(_savingTab)delete _savingTab.originalForm;
  lsSet('ts_loadsheets_cache',S.saved);
  await sbU('ts_loadsheets',[_lsWritePayload(sheet.id,sheet.form,sheet.savedAt,'unsigned',_du)]);
  window._notifyPicLoadsheet&&window._notifyPicLoadsheet(f,sheet.id);
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_signed',payload:{id:id,acCode:(f.ac||'').replace('ZK-',''),by:(S.user&&S.user.name)||'',sessionId:_sessionId}},ref:String(_rtRef)}));}
  auditLog(isEdit?'loadsheet_edit':'loadsheet_save',{id,ac:f.ac,dep:f.dep,dest:f.dest,date:f.date,pic:f.pic});
  toast('Draft saved.','ok');
  // Close the tab
  var _tid=id;var _idx=S.lsTabs.findIndex(function(t){return t.id===_tid;});
  if(_idx!==-1){
    if(S.activeTabId===_tid){
      if(S.lsTabs.length>1){var _nx=S.lsTabs[_idx>0?_idx-1:1];S.activeTabId=_nx.id;S.form=_nx.form;S.lsAc=_nx.acId.replace('ZK-','');S.editId=_nx.id;}
      else{S.activeTabId=null;S.editId=null;S._newLsTab=false;S.tab='saved';}
    }
    S.lsTabs.splice(_idx,1);
  }
  // Close the tab on every other device too
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_tab_close',payload:{id:_tid}},ref:String(_rtRef)}));}
  window.saveWorkspace&&window.saveWorkspace();
  try{window.scrollTo(0,0);}catch(e){} // jump to the top of the now-active loadsheet
  render();
};
window.saveDraft=window.saveUnsigned; // alias for desk staff button
// submitLsInPlace: save as complete, toast, STAY on tab (pilot view)
window.submitLsInPlace=async function(){
  const f=S.form;
  if(!f||!f.sig){toast('Please sign the loadsheet first.','warn');return;}
  if(!f.pic){toast('Select a PIC before submitting.','warn');return;}
  const r=calcFormWB(f);if(!r||!r.towOk||!r.lwOk||!r.cogOk){toast('Fix weight and balance limits before submitting.','warn');return;}
  if(r.reserveOk===false){toast('Fuel at destination is below the 30-minute final reserve — add fuel or reduce the trip before signing.','warn');return;}
  const id=S.editId||('ls_'+Date.now());
  f.sigBy=(S.user&&S.user.name)||'';f.sigTs=f.sigTs||new Date().toISOString();
  f.savedBy=(S.user&&S.user.name)||'';
  const sheet={id,savedAt:new Date().toISOString(),form:dc(f),status:'complete'};
  var _du=_lsCarryArchive(id,sheet);
  S.saved=S.saved.filter(function(s){return s.id!==id;});S.saved.unshift(sheet);
  lsSet('ts_loadsheets_cache',S.saved);
  S.editId=id;S.formDirty=false;
  var _t=S.lsTabs.find(function(t){return t.id===id;});if(_t)delete _t.originalForm;
  // Refresh a near/already-expired session BEFORE the signed write so it doesn't 401 (and queue) just
  // because the access token lapsed while the pilot was filling it in (idle phone). If the refresh
  // token is still good this uploads first time; only a truly dead session falls through to the queue.
  try{if(typeof AUTH_PHASE_C!=='undefined'&&AUTH_PHASE_C&&typeof _sbSession!=='undefined'&&_sbSession&&_sbSession.expires_at&&(_sbSession.expires_at-Date.now())<300000&&typeof _sbRefresh==='function')await _sbRefresh();}catch(e){}
  const _ok=await sbU('ts_loadsheets',[_lsWritePayload(sheet.id,sheet.form,sheet.savedAt,'complete',_du)]);
  window._notifyPicLoadsheet&&window._notifyPicLoadsheet(f,sheet.id);
  // Tell other devices to live-refresh: ls_signed carries the id so desktops reload AND swap the
  // open tab's form to the signed one (shows the signature without a manual refresh). ls_saved alone
  // didn't update an already-open tab / didn't re-render off the Saved tab.
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_signed',payload:{id:id,acCode:(f.ac||'').replace('ZK-',''),by:(S.user&&S.user.name)||'',sessionId:_sessionId}},ref:String(_rtRef)}));_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_saved',payload:{by:S.user?.id,sessionId:_sessionId}},ref:String(_rtRef)}));}
  auditLog('loadsheet_submit',{id,ac:f.ac,dep:f.dep,dest:f.dest,date:f.date,pic:f.pic});
  // sbU returns null when the cloud write failed (e.g. an expired session 401, or offline). Don't
  // claim "submitted ✓" in that case — it's queued (ts_sync_queue) and replays when back online /
  // re-signed-in, but the pilot must know it isn't on the system yet.
  if(_ok){toast('Loadsheet submitted ✓','ok');}
  else{toast((typeof _lsUploadFailMsg==='function')?_lsUploadFailMsg():'⚠ Signed on THIS device but NOT yet uploaded. It will upload automatically once you reconnect.','warn');}
  // Keep the signed loadsheet OPEN so the pilot can read it while loading the aircraft. Mark the
  // live form + its tab complete (removes the "unsigned" banner; the chip shows ✓).
  f.status='complete';
  var _t2=S.lsTabs.find(function(t){return t.id===id;});if(_t2){_t2.form=f;_t2.status='complete';}
  S.activeTabId=id;S.form=f;S.editId=id;S.lsAc=(f.ac||'').replace('ZK-','');
  window.saveWorkspace&&window.saveWorkspace();
  try{window.scrollTo(0,0);}catch(e){}
  render();
};
// handleSubmit for signed loadsheets
window.handleSubmit=async()=>{
  const f=S.form;
  if(!f.sig){toast('Please sign the loadsheet before submitting.','warn');return;}
  if(!f.pic){toast('Select a PIC before submitting.','warn');return;}
  const r=calcFormWB(f);if(!r||!r.towOk||!r.lwOk||!r.cogOk){toast('Fix weight and balance limits before submitting.','warn');return;}
  if(r.reserveOk===false){toast('Fuel at destination is below the 30-minute final reserve — add fuel or reduce the trip before signing.','warn');return;}
  const id=S.editId||('ls_'+Date.now());
  f.sigBy=(S.user&&S.user.name)||'';f.sigTs=new Date().toISOString();
  f.savedBy=(S.user&&S.user.name)||'';
  const sheet={id,savedAt:new Date().toISOString(),form:dc(f),status:'complete'};
  var _du=_lsCarryArchive(id,sheet);
  S.saved=S.saved.filter(s=>s.id!==id);S.saved.unshift(sheet);lsSet('ts_loadsheets_cache',S.saved);
  try{if(typeof AUTH_PHASE_C!=='undefined'&&AUTH_PHASE_C&&typeof _sbSession!=='undefined'&&_sbSession&&_sbSession.expires_at&&(_sbSession.expires_at-Date.now())<300000&&typeof _sbRefresh==='function')await _sbRefresh();}catch(e){} // fresh token before the signed write
  var _submitTab=S.lsTabs.find(function(t){return t.id===id;});
  if(_submitTab)delete _submitTab.originalForm;
  // Google Drive upload happens via nightly scheduler only
  const _ok2=await sbU('ts_loadsheets',[_lsWritePayload(sheet.id,sheet.form,sheet.savedAt,'complete',_du)]);
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_signed',payload:{id:id,acCode:(f.ac||'').replace('ZK-',''),by:(S.user&&S.user.name)||'',sessionId:_sessionId}},ref:String(_rtRef)}));_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_saved',payload:{by:S.user?.id,sessionId:_sessionId}},ref:String(_rtRef)}));}
  auditLog('loadsheet_submit',{id,ac:f.ac,dep:f.dep,dest:f.dest,date:f.date,pic:f.pic,tow:r.rampW?.toFixed(0)});
  if(_ok2){toast('Loadsheet submitted.','ok');}
  else{toast((typeof _lsUploadFailMsg==='function')?_lsUploadFailMsg():'⚠ Signed on THIS device but NOT yet uploaded. It will upload automatically once you reconnect.','warn');}
  // Keep the signed loadsheet OPEN so the pilot can read it while loading.
  f.status='complete';
  var _t3=S.lsTabs.find(function(t){return t.id===id;});if(_t3){_t3.form=f;_t3.status='complete';}
  S.activeTabId=id;S.form=f;S.editId=id;S.lsAc=(f.ac||'').replace('ZK-','');S.formDirty=false;
  render();
};
// (window.newSheet removed in v23.76 — legacy loadsheet route retired.)

// ── Drag-to-reorder loadsheet tabs ──
window._lsDragStart=function(e,id){S._lsDrag=id;try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);}catch(_){}};
window._lsDragEnd=function(){S._lsDrag=null;};
window._lsDrop=function(e,toId){
  if(e){e.preventDefault();e.stopPropagation();}
  var from=S._lsDrag||(e&&e.dataTransfer&&e.dataTransfer.getData('text/plain'));
  S._lsDrag=null;
  if(!from||from===toId)return;
  var arr=S.lsTabs||[];
  var fi=arr.findIndex(function(t){return t.id===from;});
  if(fi<0)return;
  var moved=arr.splice(fi,1)[0];
  var ti=arr.findIndex(function(t){return t.id===toId;});
  if(ti<0)arr.push(moved);else arr.splice(ti,0,moved);
  window.saveWorkspace&&window.saveWorkspace();
  render();
};
