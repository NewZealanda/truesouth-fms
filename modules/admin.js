// === MODULE: admin === v1.0 ===
function renderAdminAudit(){
  if(!S.user?.superAdmin) return '<div class="card"><div style="color:var(--err-text)">Super admin access only.</div></div>';

  // Action label/colour helpers
  function actCol(a){return a==='session_restore'?'#34d399':a==='login'?'#22c55e':a==='login_fail'?'#ef4444':a==='loadsheet_submit'?'#3b82f6':a==='loadsheet_create'||a==='loadsheet_save'?'#a78bfa':a==='maint_entry'||a==='maint_edit'?'#f59e0b':a==='manifest_save'||a==='manifest_autosave'?'#10b981':a==='manifest_load'?'#06b6d4':a==='manifest_clear'?'#f97316':a==='crew_update'?'#8b5cf6':'#64748b';}
  function actLbl(a){return a==='session_restore'?'Reopened':a==='login'?'Login':a==='login_fail'?'⚠ Login Fail':a==='loadsheet_submit'?'LS Signed':a==='loadsheet_save'||a==='loadsheet_create'?'LS Saved':a==='loadsheet_edit'?'LS Edit':a==='maint_entry'?'Maint Entry':a==='maint_edit'?'Maint Edit':a==='manifest_save'?'Manifest Saved':a==='manifest_autosave'?'Auto-saved':a==='manifest_load'?'Manifest Loaded':a==='manifest_clear'?'Manifest Cleared':a==='crew_update'?'Crew Updated':a==='password_change'?'Password Changed':a==='password_reset'?'Password Reset':a||'—';}

  const filterAct=S.auditFilter||'';
  const filterUser=S.auditFilterUser||'';
  const pageSize=50;
  const page=S.auditPage||0;

  // Get unique users from log for filter dropdown
  const allUsers=[...new Set((S.auditLog||[]).map(e=>e.user).filter(Boolean))].sort();

  // Apply filters
  let filtered=(S.auditLog||[]);
  if(filterAct) filtered=filtered.filter(e=>e.action===filterAct);
  if(filterUser) filtered=filtered.filter(e=>e.user===filterUser||e.name===filterUser);

  const totalFiltered=filtered.length;
  const pageItems=filtered.slice(page*pageSize,(page+1)*pageSize);

  const actionTypes=['login','session_restore','login_fail','loadsheet_save','loadsheet_edit','loadsheet_submit','maint_entry','maint_edit','manifest_save','manifest_autosave','manifest_load','manifest_clear','crew_update','password_change','password_reset'];

  const rows=pageItems.map(function(e){
    const ac=actCol(e.action);
    const shortDev=e.device?(e.device.includes('iPhone')||e.device.includes('iPad')?'📱 iOS':e.device.includes('Android')?'📱 Android':'🖥 '+e.device.slice(0,25)):'—';
    return'<tr style="border-bottom:1px solid var(--border)">'+
      '<td style="padding:5px 8px;font-size:11px;white-space:nowrap;color:var(--text3)">'+(e.time?new Date(e.time).toLocaleString('en-NZ',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—')+'</td>'+
      '<td style="padding:5px 8px;font-size:12px;font-weight:600">'+e.name+'</td>'+
      '<td style="padding:5px 8px;font-size:11px;color:var(--text3)">'+e.user+'</td>'+
      '<td style="padding:5px 8px"><span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:var(--card2)">'+e.role+'</span></td>'+
      '<td style="padding:5px 8px"><span style="padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;background:'+ac+'22;color:'+ac+'">'+actLbl(e.action)+'</span></td>'+
      '<td style="padding:5px 8px;font-size:11px;color:var(--text3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+((e.detail||'').slice(0,60))+'</td>'+
      '<td style="padding:5px 8px;font-size:10px;color:var(--text3)">'+shortDev+'</td>'+
    '</tr>';
  }).join('');

  const paginationHTML=`<div style="display:flex;align-items:center;gap:8px;margin-top:12px">
    <button onclick="S.auditPage=Math.max(0,(S.auditPage||0)-1);render()"
      style="padding:5px 12px;background:var(--card2);border:1px solid var(--border);border-radius:6px;font-size:12px;cursor:pointer;color:var(--text);${page===0?'opacity:.3;pointer-events:none':''}">‹ Prev</button>
    <span style="font-size:12px;color:var(--text3)">Page ${page+1} of ${Math.max(1,Math.ceil(totalFiltered/pageSize))} · ${totalFiltered} events</span>
    <button onclick="S.auditPage=(S.auditPage||0)+1;render()"
      style="padding:5px 12px;background:var(--card2);border:1px solid var(--border);border-radius:6px;font-size:12px;cursor:pointer;color:var(--text);${(page+1)*pageSize>=totalFiltered?'opacity:.3;pointer-events:none':''}">Next ›</button>
    <button onclick="window.loadMoreAudit()" style="padding:5px 12px;background:var(--card2);border:1px solid var(--border);border-radius:6px;font-size:12px;cursor:pointer;color:var(--text);margin-left:4px">↓ Load more from DB</button>
  </div>`;

  return`<div class="card" style="overflow-x:auto">
    <div class="st" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <span>Audit Log <span style="font-size:11px;font-weight:400;color:var(--text3)">${totalFiltered} of ${(S.auditLog||[]).length} events shown</span></span>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
      <select style="font-size:11px;padding:4px 8px;background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--text)"
        onchange="S.auditFilter=this.value;S.auditPage=0;safeRender()">
        <option value="">All Actions</option>
        ${actionTypes.map(a=>`<option value="${a}"${filterAct===a?' selected':''}>${actLbl(a)}</option>`).join('')}
      </select>
      <select style="font-size:11px;padding:4px 8px;background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--text)"
        onchange="S.auditFilterUser=this.value;S.auditPage=0;safeRender()">
        <option value="">All Users</option>
        ${allUsers.map(u=>`<option value="${u}"${filterUser===u?' selected':''}>${u}</option>`).join('')}
      </select>
      <button onclick="S.auditFilter='';S.auditFilterUser='';S.auditPage=0;render()"
        style="padding:4px 10px;background:var(--card2);border:1px solid var(--border);border-radius:6px;font-size:11px;cursor:pointer;color:var(--text3)">Clear</button>
    </div>
    ${pageItems.length?`<table style="width:100%;border-collapse:collapse;min-width:600px">
      <thead><tr style="border-bottom:2px solid var(--border)">
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--text3)">Time</th>
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--text3)">Name</th>
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--text3)">Email</th>
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--text3)">Role</th>
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--text3)">Action</th>
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--text3)">Detail</th>
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--text3)">Device</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>${paginationHTML}`:'<div style="color:var(--text3);padding:16px;text-align:center">No events match the current filters</div>'}
    <div style="display:flex;gap:8px;margin-top:12px">
      <button onclick="lsSet('ts_audit_log',[]);S.auditLog=[];render()" style="padding:5px 12px;background:var(--err-bg);border:1px solid var(--err-border);border-radius:6px;font-size:11px;cursor:pointer;color:var(--err-text)">Clear Local Log</button>
      <span style="font-size:11px;color:var(--text3);align-self:center">Full history in Supabase · ts_audit_log</span>
    </div>
  </div>`;
}

// Load more audit events from Supabase
window.loadMoreAudit=async function(){
  try{
    const currentCount=(S.auditLog||[]).length;
    const resp=await fetch(SB+'/rest/v1/ts_audit_log?order=created_at.desc&limit=50&offset='+currentCount,{
      headers:{'apikey':SK,'Authorization':'Bearer '+SK}
    });
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const rows=await resp.json();
    if(!rows.length){toast('No more events to load.','info');return;}
    // Map DB columns to our format
    const newEntries=rows.map(r=>({
      time:r.created_at,user:r.user_email,name:r.user_name||r.user_email,
      role:r.role,action:r.action,detail:r.detail,device:r.device
    }));
    // Merge avoiding duplicates
    const existing=new Set((S.auditLog||[]).map(e=>e.time+e.user+e.action));
    const fresh=newEntries.filter(e=>!existing.has(e.time+e.user+e.action));
    S.auditLog=[...(S.auditLog||[]),...fresh];
    lsSet('ts_audit_log',S.auditLog.slice(0,1000));
    toast('Loaded '+fresh.length+' more events.','ok');
    render();
  }catch(e){toast('Failed to load from DB: '+e.message,'err');}
};


function renderAdminPerms(){
  const roles=['superadmin','admin','pilot','desk','maint','ground_staff'];
  const roleLabels={superadmin:'Superadmin',admin:'Admin',pilot:'Pilot',desk:'Desk',maint:'Maintenance',ground_staff:'Ground Staff'};
  const mainPages=[
    {id:'operations',     lbl:'Operations',         icon:'✈️', desc:'Manifest, Seatmap & Loadsheet'},
    {id:'charter',        lbl:'Charter',            icon:'💰', desc:'Charter pricing & bookings'},
    {id:'maintenance',    lbl:'Maintenance',        icon:'🔧', desc:'Aircraft logs & scheduling'},
    {id:'maint_bookings', lbl:'Maint Bookings',     icon:'🗓', desc:'Edit maintenance checks & bookings'},
    {id:'sign_loadsheet', lbl:'Sign Loadsheets',    icon:'✍️', desc:'PIC certification signature on loadsheets'},
  ];
  const adminPages=[
    {id:'admin_crew',  lbl:'Crew & Profile', icon:'👤', desc:'View crew list and edit own profile'},
    {id:'admin_users', lbl:'User Accounts',  icon:'🔐', desc:'Manage user logins and roles (admin-only)'},
    {id:'scratchpad',  lbl:'Scratchpad',     icon:'📝', desc:'Shared notes & drawing board'},
    {id:'audit',       lbl:'Audit Log',      icon:'🔍', desc:'System audit log (superadmin only)'}
  ];
  const rp=S.rolePerms||{};
  const ROLE_LEVEL={superadmin:1,admin:2,pilot:3,desk:3,maint:3,ground_staff:4};

  function togStyle(on){
    return on
      ?'display:inline-flex;align-items:center;width:44px;height:26px;border-radius:13px;background:#22c55e;cursor:pointer;transition:background .2s;border:none;padding:0;flex-shrink:0'
      :'display:inline-flex;align-items:center;width:44px;height:26px;border-radius:13px;background:#64748b;cursor:pointer;transition:background .2s;border:none;padding:0;flex-shrink:0';
  }
  function togKnob(on){
    return`<div style="width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.4);transition:transform .2s;transform:translateX(${on?'21px':'3px'});pointer-events:none"></div>`;
  }
  function makeRow(pg, extra){
    const cells=roles.map(role=>{
      const def=(DEFAULT_ROLE_PERMS[role]||{})[pg.id]||false;
      const val=(rp[role]!==undefined&&rp[role][pg.id]!==undefined)?rp[role][pg.id]:def;
      return`<td style="padding:12px 16px;text-align:center;border-bottom:1px solid var(--border)">
        <button style="${togStyle(val)}" onclick="window.toggleRolePerm('${role}','${pg.id}')" title="${val?'ON — click to disable':'OFF — click to enable'}">
          ${togKnob(val)}
        </button>
      </td>`;
    }).join('');
    return`<tr${extra||''}>
      <td style="padding:12px 16px;border-bottom:1px solid var(--border)">
        <div style="font-weight:700;font-size:13px">${pg.icon} ${pg.lbl}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">${pg.desc}</div>
      </td>
      ${cells}
    </tr>`;
  }

  const mainRows=mainPages.map(pg=>makeRow(pg)).join('');
  const adminRows=adminPages.map(pg=>makeRow(pg)).join('');

  const thead=`<thead>
    <tr style="border-bottom:2px solid var(--border)">
      <th style="padding:10px 16px;text-align:left;font-size:11px;color:var(--text3);font-weight:700">PAGE / SECTION</th>
      ${roles.map(r=>`<th style="padding:10px 16px;text-align:center;font-size:11px;color:var(--text3);font-weight:700">${roleLabels[r]}</th>`).join('')}
    </tr>
  </thead>`;

  return`<div class="card">
    <div class="st">Role Permissions</div>
    <p style="font-size:12px;color:var(--text3);margin-bottom:16px">Superadmin (L1) &gt; Admin (L2) &gt; Pilot/Desk/Maint (L3) &gt; Ground (L4). Admins can only edit lower-level accounts. Changes sync across devices. Admin accounts always see everything.</p>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;min-width:480px">
        ${thead}
        <tbody>
          <tr><td colspan="${roles.length+1}" style="padding:8px 16px 4px;background:rgba(99,102,241,.06);border-bottom:1px solid var(--border)">
            <span style="font-size:10px;font-weight:800;letter-spacing:.08em;color:var(--accent);text-transform:uppercase">Main Pages</span>
          </td></tr>
          ${mainRows}
          <tr><td colspan="${roles.length+1}" style="padding:10px 16px 4px;background:rgba(34,197,94,.06);border-bottom:1px solid var(--border)">
            <span style="font-size:10px;font-weight:800;letter-spacing:.08em;color:#22c55e;text-transform:uppercase">Admin Sub-sections</span>
          </td></tr>
          ${adminRows}
        </tbody>
      </table>
    </div>
  </div>`;
}

window.toggleRolePerm=function(role,page){
  if(!S.rolePerms) S.rolePerms={};
  if(!S.rolePerms[role]) S.rolePerms[role]=Object.assign({},DEFAULT_ROLE_PERMS[role]||{});
  const current=S.rolePerms[role][page];
  const def=(DEFAULT_ROLE_PERMS[role]||{})[page]||false;
  S.rolePerms[role][page]=!(current!==undefined?current:def);
  lsSet('ts_role_perms',S.rolePerms);
  // Persist to Supabase (fire-and-forget — ts_settings table may not exist yet)
  sbU('ts_settings',[{key:'role_perms',value:JSON.stringify(S.rolePerms)}]).catch(()=>{});
  render();
};

function renderAdmin(){
  const isAdmin=S.user?.role==='admin'||S.user?.role==='superadmin'||S.user?.superAdmin;
  // Non-admin: show sub-tabs based on their role permissions
  if(!isAdmin){
    const _role=S.user?.role||'desk';
    const _rp=S.rolePerms?.[_role]||DEFAULT_ROLE_PERMS[_role]||{};
    if(_rp.admin_crew!==false) return renderAdminPeople();
    return '<div class="card"><p style="color:var(--text3)">No sections available for your role.</p></div>';
  }
  const ad=S.admin;
  const sections=['people','perms','gdrive','aerodromes','statistics',...(S.user?.superAdmin?['audit']:[])];
  const sectionLabels={people:'People',perms:'Permissions',gdrive:'Google Drive PDF',aerodromes:'Aerodromes',statistics:'Statistics',audit:'Audit Log'};
  const tabBar=`<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">
    ${sections.map(s=>`<button class="sub-tab ${ad.section===s?'on':''}" onclick="S.admin.section='${s}';render()">${sectionLabels[s]}</button>`).join('')}
  </div>`;
  return tabBar+{people:renderAdminPeople,perms:renderAdminPerms,gdrive:renderAdminGDrive,aerodromes:renderAerodromes,statistics:renderAdminStatistics,audit:renderAdminAudit}[ad.section]?.()||renderAdminPeople();
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
  return `<div class="card"><div class="st">Google Drive PDF Upload</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;padding:12px;background:var(--card2);border-radius:8px">
      <div style="flex:1"><div style="font-weight:600;margin-bottom:2px">Upload to Google Drive</div>
        <div style="font-size:12px;color:var(--text3)">Toggle off for testing</div></div>
      <div onclick="S.gdriveEnabled=!S.gdriveEnabled;lsSet('gdrive_enabled',S.gdriveEnabled);render()"
        style="width:48px;height:26px;border-radius:13px;background:${enabled?'#7B9EC6':'#334155'};cursor:pointer;position:relative;transition:background .2s">
        <div style="width:22px;height:22px;border-radius:50%;background:#fff;position:absolute;top:2px;left:${enabled?'24px':'2px'};transition:left .2s"></div>
      </div>
    </div>
    <div style="margin-bottom:12px"><label>Google OAuth Client ID</label>
      <input class="fi" type="text" placeholder="xxxxxxx.apps.googleusercontent.com"
        value="${S.gdriveClientId||''}" onblur="S.gdriveClientId=this.value;lsSet('gdrive_client_id',this.value)">
      <div style="font-size:11px;color:var(--text3);margin-top:4px">From Google Cloud Console → APIs &amp; Services → Credentials. Add your Netlify URL as an authorised origin.</div></div>
    <div style="margin-bottom:12px"><label>Existing Folder ID <span style="font-weight:400;color:var(--text3);font-size:10px">(recommended — paste from Drive URL)</span></label>
      <input class="fi" type="text" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
        value="${S.gdriveFolderId||''}" onblur="S.gdriveFolderId=this.value;lsSet('gdrive_folder_id',this.value)">
      <div style="font-size:11px;color:var(--text3);margin-top:4px">Copy the folder ID from the Drive URL after <strong>/folders/</strong>.</div></div>

    <div style="padding:10px 14px;background:${enabled?'var(--ok-bg)':'var(--warn-bg)'};border:1px solid ${enabled?'var(--ok-border)':'var(--warn-border)'};border-radius:8px;color:${enabled?'var(--ok-text)':'var(--warn-text)'};font-size:13px;font-weight:600">
      ${enabled?'✓ Drive upload ENABLED — signed loadsheets will upload automatically':'⚠ Testing mode — loadsheets save to Supabase only, not Drive'}
    </div>
    <div style="margin-top:12px;padding:12px 14px;background:var(--card2);border-radius:8px;border:1px solid var(--border)">
      <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text2)">Scheduled &amp; Manual Upload</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:10px;line-height:1.6">Signed loadsheets upload automatically at <strong style="color:var(--text)">11:59 PM</strong> daily. Only loadsheets not yet uploaded are sent.</div>
      <div style="display:flex;gap:8px;align-items:center">
        <button onclick="window.forceUploadAll()" style="padding:8px 16px;background:var(--acc);border:none;border-radius:7px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">⬆ Force Upload Now</button>
        <span style="font-size:11px;color:var(--text3)">${S.driveLastUpload?'Last: '+S.driveLastUpload:S.driveQueue&&S.driveQueue.length?S.driveQueue.length+' queued':''}</span>
      </div>
      ${S.uploadProgress?`<div style="margin-top:8px;font-size:12px;color:var(--ok-text)">${S.uploadProgress}</div>`:''}
    </div>
  </div>`;
}
function renderAdminPeople(){
  const isAdmin=S.user?.role==='admin'||S.user?.role==='superadmin'||S.user?.superAdmin;
  const ad=S.admin;
  const today=new Date();today.setHours(0,0,0,0);
  const ROLE_LEVEL={superadmin:1,admin:2,pilot:3,desk:3,maint:3,ground_staff:4};
const roleColour={superadmin:'#f43f5e',admin:'#f59e0b',pilot:'#7B9EC6',desk:'#10b981',maint:'#a78bfa',ground_staff:'#64748b'};
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
      const isPilotOrAbove=['pilot','admin'].includes(d.role);
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
        +'<input class="fi" type="text" value="'+(d.n||'')+'" placeholder="Full name" style="font-size:14px" oninput="S.admin.personModal.draft.n=this.value"></div>'
        +'<div><label style="font-size:11px;color:var(--text3)">CODE</label>'
        +'<input class="fi" type="text" value="'+(d.code||'')+'" placeholder="e.g. PD" style="font-size:13px;text-transform:uppercase" oninput="S.admin.personModal.draft.code=this.value.toUpperCase()"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
        +'<div><label style="font-size:11px;color:var(--text3)">WEIGHT (kg)</label>'
        +'<input class="fi" type="number" value="'+(d.w||'')+'" placeholder="kg" style="font-size:13px" oninput="S.admin.personModal.draft.w=this.value"></div>'
        +'<div><label style="font-size:11px;color:var(--text3)">DL NUMBER</label>'
        +'<input class="fi" type="text" value="'+(d.dlNum||'')+'" placeholder="Driver licence #" style="font-size:13px" oninput="S.admin.personModal.draft.dlNum=this.value"></div>'
        +'</div>'
        +'<div style="margin-bottom:8px"><label style="font-size:11px;color:var(--text3)">CAA LICENSE NUMBER</label>'
        +'<input class="fi" type="text" value="'+(d.caaNum||'')+'" placeholder="CAA pilot licence #" style="font-size:14px" oninput="S.admin.personModal.draft.caaNum=this.value"></div>'
        +'<div style="background:var(--card2);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:10px;margin-bottom:10px">'
        +'<div style="font-size:11px;font-weight:700;color:var(--text3);letter-spacing:.05em">EXPIRY DATES</div>'
        +expiryRows+'</div>'
        +'<div><label style="font-size:11px;color:var(--text3)">AIRCRAFT APPROVALS</label>'
        +'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">'+endorseButtons+'</div></div>';
    } else if(tab==='login'){
      const isOwnAccount=m.userId===S.user?.id;
      bodyHtml='<div style="display:flex;flex-direction:column;gap:12px">'
        +'<div><label style="font-size:11px;color:var(--text3)">EMAIL ADDRESS</label>'
        +'<input class="fi" type="email" value="'+(d.email||'')+'" placeholder="email@truesouth.co.nz" style="font-size:14px" oninput="S.admin.personModal.draft.email=this.value"></div>'
        +(isAdmin?'<div><label style="font-size:11px;color:var(--text3)">ROLE</label>'
        +'<select class="fi" style="font-size:13px" onchange="S.admin.personModal.draft.role=this.value">'
        +(S.user?.superAdmin?'<option value="superadmin"'+(d.role==='superadmin'?' selected':'')+'>Superadmin</option>':'')
        +'<option value="admin"'+(d.role==='admin'?' selected':'')+'>Admin</option>'
        +'<option value="pilot"'+(d.role==='pilot'?' selected':'')+'>Pilot</option>'
        +'<option value="desk"'+(d.role==='desk'?' selected':'')+'>Desk</option>'
        +'<option value="maint"'+(d.role==='maint'?' selected':'')+'>Maintenance</option>'
        +'<option value="ground_staff"'+(d.role==='ground_staff'?' selected':'')+'>Ground Staff</option>'
        +'</select></div>':'')
        +(isAdmin?'<div style="display:flex;align-items:center;gap:10px;padding:8px 0">'
        +'<label style="font-size:11px;color:var(--text3)">PIC ELIGIBLE (appears in pilot dropdowns)</label>'
        +'<button onclick="S.admin.personModal.draft.isPilot=!S.admin.personModal.draft.isPilot;render()" '
        +'style="padding:4px 14px;border-radius:20px;border:none;font-size:12px;font-weight:700;cursor:pointer;'
        +'background:'+(d.isPilot?'rgba(59,130,246,.3)':'rgba(255,255,255,.06)')+';'
        +'color:'+(d.isPilot?'#60a5fa':'var(--text3)')+'">✈ '+(d.isPilot?'Yes — PIC':'No')+'</button>'
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
      +'<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">'+name+'</span>'
      +(isMe?'<span style="font-size:10px;color:var(--text3);flex-shrink:0;white-space:nowrap">(you)</span>':'')
      +'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
      +(role?'<span style="color:'+(roleColour[role]||'#64748b')+';font-weight:600">'+role+'</span>':'')
      +(email?'<span>'+email+'</span>':'')
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
  await sbU('ts_users',[{id:u.id,name:u.name,email:u.email,role:u.role,
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
  const u=S.users.find(x=>x.resetToken===code&&x.resetExpires&&Date.now()<x.resetExpires);
  if(!u){S.resetMsg={ok:false,text:'Invalid or expired code.'};render();return;}
  u.passwordHash=await hashPw(newPw);delete u.resetToken;delete u.resetExpires;
  lsSet('ts_users_cache',S.users);
  await sbU('ts_users',[{id:u.id,name:u.name,email:u.email,role:u.role,linked_crew:u.linkedCrew,password_hash:u.passwordHash,reset_token:null,reset_expires:null}]);
  S.resetMsg={ok:true,text:'Password updated. You can now log in.'};
  S.showReset=false;render();
};

window.switchToLoadsheets=function(){
  if(S.lsTabs&&S.lsTabs.length){
    if(!S.activeTabId)S.activeTabId=S.lsTabs[0].id;
    S._newLsTab=false;
  } else {
    S._newLsTab=true;S.activeTabId=null;
  }
  S.tab='loadsheet';render();
};
window.switchOpsTab=function(tabId){
  S.activeTabId=null;S._newLsTab=false;
  S.tab=tabId;
  render();
  if(tabId==='saved'){
    reloadTable('ts_loadsheets').then(function(){render();});
  }
  window.scrollTo(0,0);
};
window.setTab=function(t){
  if(t==='operations'){
    if(S._newLsTab&&!S.activeTabId){S._newLsTab=false;S.tab='manifest';}
    else if(!['manifest','seatmap','saved'].includes(S.tab)&&!S.activeTabId&&!S._newLsTab)S.tab='manifest';
  } else if(t==='scratchpad'){
    S.tab=t;
    if(S.pads.length===0&&S.padTabs.length===0){
      reloadTable('ts_scratchpads').then(function(){render();});return;
    }
  } else {
    S.tab=t;
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
  // Load maintenance: show local data instantly, sync from cloud in background
  if(t==='maintenance'){
    var _mLocal=lsGet('ts_maintenance');
    S.maintenance=(_mLocal&&_mLocal.hist)
      ?Object.assign({},_mLocal,{_loading:false})
      :{hist:[],oil:[],nextCheck:{},checkType:{},engineLastOH:{},engineToRun:{},propLastOH:{},propToRun:{},bookings:{},priority:[],compwash:{},adas:{},_loading:false};
    // Background cloud sync — update silently if cloud has data
    loadMaintenanceFromCloud().then(function(cloud){
      if(cloud&&cloud.hist){
        S.maintenance=cloud;
        lsSet('ts_maintenance',cloud);
        render();
      }
    }).catch(function(){});
  }
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
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:0';
  var fi='width:100%;padding:14px 12px;font-size:18px;border:1px solid var(--border);border-radius:10px;background:var(--bg3);color:var(--text1);box-sizing:border-box';
  var inner=document.createElement('div');
  inner.style.cssText='background:var(--bg2);border-top:1px solid var(--border);border-radius:16px 16px 0 0;padding:20px 16px 36px;width:100%;max-width:480px;box-sizing:border-box';
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
var nm=S.form.names&&S.form.names[idx]||'';if(nm.includes(' + '))S.form.names[idx]=nm.split(' + ')[0].trim();render();};
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
  if(!S.selectedPax||!S.dispatch)return;
  const pid=S.selectedPax;
  const sm=S.dispatch.seatMap||{};
  Object.keys(sm).forEach(function(ac){
    Object.keys(sm[ac]||{}).forEach(function(idx){if(sm[ac][idx]===pid)delete sm[ac][idx];});
  });
  S.selectedPax=null;
  S.solverAutoApply=false;runSolver();S.solverAutoApply=true;
  autoSaveDispatch();render();
};
window.tapSeat=(toIdx,toAc)=>{
  if(!S.dispatch)return;S.dispatch.seatMap=S.dispatch.seatMap||{};
  const sm=S.dispatch.seatMap;if(!sm[toAc])sm[toAc]={};
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
    S.dispatch.origAcMap=S.dispatch.origAcMap||{};
    if(!S.dispatch.origAcMap[selPid]) S.dispatch.origAcMap[selPid]=fromAc||toAc;
    S.selectedPax=null;
  } else if(displaced){
    // Tap on occupied seat with nothing selected = select that pax
    S.selectedPax=displaced;
  }
  S.solverAutoApply=false;runSolver();S.solverAutoApply=true;
  autoSaveDispatch();render();
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
  if(!pid||!S.dispatch) return;
  S.dispatch.seatMap=S.dispatch.seatMap||{};
  const sm=S.dispatch.seatMap;
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
  if(!S.dispatch.origAcMap) S.dispatch.origAcMap={};
  if(!S.dispatch.origAcMap[pid]) S.dispatch.origAcMap[pid]=fromAc||toAc;
  S.dragState=null;
  S.selectedPax=null;
  // If an infant was moved, warn to reweigh
  const movedPax=S.dispatch.pax.find(function(p){return p.id===pid;});
  if(movedPax&&movedPax.infant){toast('🔁 Infant moved — please reweigh passengers to confirm actual weights.','warn');}
  S.solverAutoApply=false;runSolver();S.solverAutoApply=true;
  autoSaveDispatch();render();
};
window.dropOnPool=(ev,forceAc)=>{
  ev.preventDefault();if(!S.dragState)return;
  const{fromAc,fromSeat}=S.dragState;
  if(fromAc&&fromAc!=='pool'&&fromSeat!=null){const sm=S.dispatch.seatMap;if(sm[fromAc])delete sm[fromAc][fromSeat];}
  S.dragState=null;S.selectedPax=null;runSolver();autoSaveDispatch();render();
};
window.dropOnPoolPax=function(targetPaxId,ev){
  ev.preventDefault();ev.stopPropagation();
  if(!S.dragState)return;
  const{pid,fromAc,fromSeat}=S.dragState;
  if(!pid||pid===targetPaxId||!S.dispatch)return;
  const sm=S.dispatch.seatMap||{};
  if(fromAc&&fromAc!=='pool'&&fromSeat!=null){
    // Seat pax dragged onto pool pax: put pool pax into source seat (swap)
    if(!sm[fromAc])sm[fromAc]={};
    sm[fromAc][fromSeat]=targetPaxId;
  }
  S.dragState=null;S.selectedPax=null;
  S.solverAutoApply=false;runSolver();S.solverAutoApply=true;
  autoSaveDispatch();render();
};

// Loadsheet form seat map drag
window.tapFormSeat=(seatIdx,acId,ev)=>{
  if(ev&&ev.target&&(ev.target.tagName==='INPUT'||ev.target.tagName==='TEXTAREA'||ev.target.tagName==='SELECT'))return;
  const f=S.form;
  const nm=f.names[seatIdx]||'';
  if(S._selUnalloc!=null){
    const ua=f._unallocated;
    if(ua&&ua[S._selUnalloc]){
      const p=ua[S._selUnalloc];
      if(nm){ua.push({name:nm,weight:f.seats[seatIdx]||'',bag:f.bags[seatIdx]||'',infant:(f.infantNames||{})[seatIdx]||''});}
      f.names[seatIdx]=p.name;f.seats[seatIdx]=p.weight;f.bags[seatIdx]=p.bag;
      if(!f.infantNames)f.infantNames={};
      if(p.infant)f.infantNames[seatIdx]=p.infant;else delete f.infantNames[seatIdx];
      ua.splice(S._selUnalloc,1);
    }
    S._selUnalloc=null;S._selFormSeat=null;autoSaveLS();render();return;
  }
  if(S._selFormSeat!=null){
    const from=S._selFormSeat;
    if(from!==seatIdx){
      const swp=(obj,a,b)=>{const t=obj[a];obj[a]=obj[b];obj[b]=t;};
      swp(f.names,from,seatIdx);swp(f.seats,from,seatIdx);
      swp(f.bags,from,seatIdx);
      if(!f.infantNames)f.infantNames={};swp(f.infantNames,from,seatIdx);
    }
    S._selFormSeat=null;
  } else if(nm){
    S._selFormSeat=seatIdx;
  }
  autoSaveLS();
  render();
};
window.tapUnallocated=function(idx){
  S._selUnalloc=(S._selUnalloc===idx)?null:idx;
  S._selFormSeat=null;render();
};
window.removeUnallocated=function(idx){
  if(S.form._unallocated)S.form._unallocated.splice(idx,1);
  if(S._selUnalloc===idx)S._selUnalloc=null;render();
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
  e.currentTarget.style.outline='';
{var _us=S._lsFormUndoStack;_us.push(dc(S.form));if(_us.length>10)_us.shift();S._lsFormUndo=null;}
  const f=S.form;
  if(S._dragUnalloc!=null){
    // Drop from unallocated onto seat
    const ua=f._unallocated;
    if(!ua||ua[S._dragUnalloc]==null){S._dragUnalloc=null;return;}
    const p=ua[S._dragUnalloc];
    const curNm=f.names[toIdx]||'';
    // Bump existing occupant back to unallocated
    if(curNm&&curNm!==f.coPilot){ua.push({name:curNm,weight:f.seats[toIdx]||'',bag:f.bags[toIdx]||'',infant:(f.infantNames||{})[toIdx]||''});}
    f.names[toIdx]=p.name;f.seats[toIdx]=p.weight;f.bags[toIdx]=p.bag;
    if(!f.infantNames)f.infantNames={};
    if(p.infant)f.infantNames[toIdx]=p.infant;else delete f.infantNames[toIdx];
    ua.splice(S._dragUnalloc,1);
    S._dragUnalloc=null;S._selUnalloc=null;
  } else if(S._dragSeat!=null&&S._dragSeat!==toIdx){
    // Swap two seats
    const swp=(obj,a,b)=>{const t=obj[a];obj[a]=obj[b];obj[b]=t;};
    swp(f.names,S._dragSeat,toIdx);swp(f.seats,S._dragSeat,toIdx);swp(f.bags,S._dragSeat,toIdx);
    if(!f.infantNames)f.infantNames={};swp(f.infantNames,S._dragSeat,toIdx);
    S._dragSeat=null;
  }
  render();
};
window.lsDropOnUnalloc=function(e){
  e.preventDefault();
  e.currentTarget.style.outline='';
{var _us=S._lsFormUndoStack;_us.push(dc(S.form));if(_us.length>10)_us.shift();S._lsFormUndo=null;}
  const f=S.form;
  if(S._dragSeat!=null){
    const nm=f.names[S._dragSeat]||'';
    if(nm&&nm!==f.coPilot&&nm!==f.pic){
      if(!f._unallocated)f._unallocated=[];
      f._unallocated.push({name:nm,weight:f.seats[S._dragSeat]||'',bag:f.bags[S._dragSeat]||'',infant:(f.infantNames||{})[S._dragSeat]||''});
      delete f.names[S._dragSeat];delete f.seats[S._dragSeat];delete f.bags[S._dragSeat];
      if(f.infantNames)delete f.infantNames[S._dragSeat];
    }
    S._dragSeat=null;render();
  }
};
window.startDragForm=(ev,idx,acId)=>{S.dragState={fromFormIdx:idx,fromFormAc:acId};ev.dataTransfer.setData('text/plain',String(idx));};
window.dropFormSeat=(ev,toIdx,acId)=>{
  ev.preventDefault();
  if(S._dragUnalloc!=null){window.lsDropOnSeat(toIdx,ev);return;}
  {var _us=S._lsFormUndoStack;_us.push(dc(S.form));if(_us.length>10)_us.shift();S._lsFormUndo=null;}
  if(!S.dragState?.fromFormIdx&&S.dragState?.fromFormIdx!==0)return;
  const from=S.dragState.fromFormIdx;
  // Swap names, weights, bags, infant names
  const f=S.form;
  if(!f.infantNames)f.infantNames={};
  const tmp={n:f.names[from],s:f.seats[from],b:f.bags[from],inf:f.infantNames[from]||''};
  f.names[from]=f.names[toIdx]||'';f.seats[from]=f.seats[toIdx]||'';f.bags[from]=f.bags[toIdx]||'';
  if(f.infantNames[toIdx])f.infantNames[from]=f.infantNames[toIdx];else delete f.infantNames[from];
  f.names[toIdx]=tmp.n;f.seats[toIdx]=tmp.s;f.bags[toIdx]=tmp.b;
  if(tmp.inf)f.infantNames[toIdx]=tmp.inf;else delete f.infantNames[toIdx];
  S.dragState=null;render();
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
  lsSet('ts_manifests_cache',S.manifests);render();
  await sbU('ts_manifests',[{id,name,saved_at:savedAt,data}]);
  auditLog('manifest_save',{name,pax:d.pax.length,aircraft:d.acSetup.map(s=>s.acId).join(',')});
  S.appMsg={type:'ok',text:'Manifest "'+name+'" saved.'};
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
  lsSet('ts_manifests_cache',S.manifests);render();
  await sbU('ts_manifests',[{id:m.id,name:m.name,data:m.data,saved_at:m.savedAt}]);
  S.appMsg={type:'ok',text:'Manifest moved to Bin.'};
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
  const _curIsBlank=!S.dispatch.pax?.length&&!S.dispatch.acSetup?.length;
  if(_curIsBlank){
    // Replace current tab
    S.dispatch=data;
    S._loadedManifestId=m.id;
    const _lt=S.manifestTabs&&S.manifestTabs.find(function(t){return t.id===S.activeManifestTabId;});
    if(_lt)_lt.savedId=m.id;
    S._manifestDispatches[S.activeManifestTabId]=JSON.parse(JSON.stringify(data));
  } else {
    // Save current dispatch, open new tab
    S._manifestDispatches[S.activeManifestTabId]=JSON.parse(JSON.stringify(S.dispatch));
    const newId='mt_'+Date.now();
    S._manifestDispatches[newId]=JSON.parse(JSON.stringify(data));
    if(!S.manifestTabs)S.manifestTabs=[];
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
  var existing=S.lsTabs.find(function(t){return t.id===id;});
  if(existing){window.switchLsTab(id);return;}
  var s=S.saved.find(function(x){return x.id===id;});
  if(!s)return;
  var acFull=s.form&&s.form.ac?s.form.ac:'ZK-SLA';
  var _vsForm=dc(s.form);if(!_vsForm.cargo)_vsForm.cargo={};var _vsAc=S.aircraft[_vsForm.ac];if(_vsAc&&_vsAc.layout==='ga8'&&(!_vsForm.burnOff||parseFloat(_vsForm.burnOff)<30)){_vsForm.burnOff='35';}
  S.lsTabs.push({id:s.id,acId:acFull,form:_vsForm,status:s.status||'unsigned',savedAt:s.savedAt,isNew:false,originalForm:dc(s.form)});
  window.switchLsTab(s.id);
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
  await sbU('ts_loadsheets',[{id:s.id,form:form,saved_at:s.savedAt,status:'unsigned'}]);
  var acFull=form.ac||'ZK-SLA';
  var existing=S.lsTabs.find(function(t){return t.id===id;});
  if(existing){existing.form=form;existing.status='unsigned';existing.acId=acFull;window.switchLsTab(id);}
  else{S.lsTabs.push({id:s.id,acId:acFull,form:form,status:'unsigned',savedAt:s.savedAt});window.switchLsTab(s.id);}
  toast('Loadsheet reopened - signature cleared','ok');
};
window.deleteManifest=async function(id){if(!confirm('Move this manifest to Bin?'))return;var m=S.manifests.find(function(x){return x.id===id;});if(!m)return;if(!m.data)m.data={};m.data._deleted=true;m._deleted=true;lsSet('ts_manifests_cache',S.manifests);render();await sbU('ts_manifests',[{id:m.id,name:m.name,data:m.data,saved_at:m.savedAt}]);};
window.toggleSavedSel=id=>{if(S.savedSel[id])delete S.savedSel[id];else S.savedSel[id]=true;render();};
window.selectAllSaved=ids=>{ids.forEach(id=>S.savedSel[id]=true);render();};
window.clearSavedSel=()=>{S.savedSel={};render();};
window.bulkDeleteSaved=async function(){
  const ids=Object.keys(S.savedSel);
  if(!ids.length)return;
  if(!confirm('Move '+ids.length+' item(s) to Bin?'))return;
  const lsIds=ids.filter(function(id){return S.saved.find(function(s){return s.id===id;});});
  const mIds=ids.filter(function(id){return S.manifests.find(function(m){return m.id===id;});});
  S.saved.forEach(function(s){if(lsIds.indexOf(s.id)>=0){s.form._prevStatus=s.status;s.status='deleted';}});
  S.manifests.forEach(function(m){if(mIds.indexOf(m.id)>=0){if(!m.data)m.data={};m.data._deleted=true;m._deleted=true;}});
  lsSet('ts_loadsheets_cache',S.saved);
  lsSet('ts_manifests_cache',S.manifests);
  S.savedSel={};render();
  for(var i=0;i<lsIds.length;i++){var s2=S.saved.find(function(x){return x.id===lsIds[i];});if(s2)await sbU('ts_loadsheets',[{id:s2.id,form:s2.form,saved_at:s2.savedAt,status:'deleted'}]).catch(function(){});}
  for(var j=0;j<mIds.length;j++){var m2=S.manifests.find(function(x){return x.id===mIds[j];});if(m2)await sbU('ts_manifests',[{id:m2.id,name:m2.name,data:m2.data,saved_at:m2.savedAt}]).catch(function(){});}
};
window.bulkUploadSaved=async function(){
  const ids=Object.keys(S.savedSel);
  const signed=ids.filter(function(id){const s=S.saved.find(function(x){return x.id===id;});return s&&s.status==='complete';});
  if(!signed.length){toast('No signed loadsheets selected.','warn');return;}
  if(!S.gdriveEnabled||!S.gdriveClientId){toast('Google Drive not configured — check Admin > Google Drive.','warn');return;}
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
  render();
};

// ── Generate loadsheet from manifest ──
window.openAcLoadsheet=function(acId){generateLoadsheet(acId);};
function generateLoadsheet(acId){
  const a=S.aircraft[acId];const d=S.dispatch;if(!a)return;
  const setup=d.acSetup.find(s=>s.acId===acId);const form=bF();
  form.ac=acId;form.dep=d.dep;form.dest=d.dest;form.date=d.date;form.etd=d.etd;form.etdCustom=d.etdCustom||false;
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
  const _lsAcCode=acId.replace('ZK-','');
  const _newTabId='ls_'+_lsAcCode+'_'+Date.now();
  S.lsForms[_lsAcCode]=form;S.lsAc=_lsAcCode;S.form=form;S.editId=_newTabId;S.formDirty=false;
  // Populate _unallocated: pax pinned to this aircraft but not given a seat
  {const _spIds=new Set(Object.values(sm));const _unass=(d.pax||[]).filter(function(p){return p.pinAc===acId&&!_spIds.has(p.id)&&!p.infant&&p.name;});if(_unass.length){form._unallocated=_unass.map(function(p){return{name:p.name,weight:p.weight,bag:p.bag||0,infant:p.infantName||null};});}}
  // Fuel/burnOff defaults by aircraft type
  if(a.layout==='ga8'&&(!form.burnOff||parseFloat(form.burnOff)<30)){form.burnOff='35';}
  if(a.layout==='c208'){form.fuel=String(Math.round(800*0.453592));}
  var _savedAt=new Date().toISOString();
  S.lsTabs.push({id:_newTabId,acId:acId,form:form,status:'unsigned',savedAt:_savedAt,isNew:false});
  S.activeTabId=_newTabId;S._newLsTab=false;S.tab='loadsheet';
  // Save immediately so other devices can load it
  sbU('ts_loadsheets',[{id:_newTabId,form:form,saved_at:_savedAt,status:'unsigned'}]).catch(function(){});
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_tab_open',payload:{id:_newTabId,acId:acId,form:form,savedAt:_savedAt,by:(S.user&&S.user.name)||''}},ref:String(_rtRef)}));}
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
    const excessIdxs=new Set();
    Object.keys(kN).forEach(i=>{if(parseInt(i)>=maxIdx&&kN[i])excessIdxs.add(i);});
    Object.keys(kS).forEach(i=>{if(parseInt(i)>=maxIdx&&parseFloat(kS[i])>0)excessIdxs.add(i);});
    // Move excess passengers to _unallocated instead of deleting
    excessIdxs.forEach(function(i){
      const nm=kN[i]||'';const wt=kS[i]||'';const bg=kB[i]||'';const inf=(kI||{})[i]||'';
      if(nm||wt){if(!S.form._unallocated)S.form._unallocated=[];S.form._unallocated.push({name:nm,weight:wt,bag:bg,infant:inf||null});}
    });
    [S.form.seats,S.form.bags,S.form.names,S.form.infantNames].forEach(obj=>{
      Object.keys(obj).forEach(i=>{if(parseInt(i)>=maxIdx)delete obj[i];});
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
  tgt.names={};tgt.seats={};tgt.bags={};tgt.infantNames={};tgt._unallocated=[];
  const srcInfants=src.infantNames||{};
  Object.keys(src.names||{}).forEach(function(k){
    const i=parseInt(k);
    const nm=src.names[i]||'';const wt=src.seats[i]||'';
    const bg=src.bags[i]||'';const inf=srcInfants[i]||'';
    if(!nm&&!wt)return;
    if(i<tgtSeatCount){
      tgt.names[i]=nm;tgt.seats[i]=wt;tgt.bags[i]=bg;
      if(inf){if(!tgt.infantNames)tgt.infantNames={};tgt.infantNames[i]=inf;}
    } else {
      tgt._unallocated.push({name:nm,weight:wt,bag:bg,infant:inf});
    }
  });
  tgt.cargo=Object.assign({},src.cargo||{});
  // Also carry over existing unallocated passengers from source
  const srcUnalloc=src._unallocated||[];
  if(srcUnalloc.length){
    tgt._unallocated=(tgt._unallocated||[]).concat(srcUnalloc.map(function(p){return Object.assign({},p);}));
  }
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
  const unallocCount=tgt._unallocated.length;
  const paxCount=Object.keys(tgt.names).filter(function(k){return tgt.names[k];}).length;
  autoSaveLS();
  toast('Copied to ZK-'+targetAc+' ('+paxCount+' seats'+(unallocCount?' +'+unallocCount+' unallocated':'')+')','ok');
};

window.lsTrimExcess=()=>{
  const a=S.aircraft[S.form.ac];if(!a)return;
  const max=a.seats.length;
  [S.form.seats,S.form.bags,S.form.names,S.form.infantNames].forEach(obj=>{
    Object.keys(obj).forEach(i=>{if(parseInt(i)>=max)delete obj[i];});
  });
  render();
};
window.lsDelPax=idx=>{
  {var _us=S._lsFormUndoStack;_us.push(dc(S.form));if(_us.length>10)_us.shift();S._lsFormUndo=null;}
  delete S.form.names[idx];delete S.form.seats[idx];delete S.form.bags[idx];
  if(S.form.infantNames)delete S.form.infantNames[idx];
  autoSaveLS();render();
};
window.lsUndo=function(){
  var _us=S._lsFormUndoStack;
  if(!_us||!_us.length)return;
  S.form=_us.pop();
  S._lsFormUndo=_us.length?_us[_us.length-1]:null;
  var tab=S.lsTabs.find(function(t){return t.id===S.editId;});
  if(tab)tab.form=S.form;
  autoSaveLS();render();
};
window.lsPIC=v=>{S.form.pic=v;const c=anyCrewList().find(x=>x.n===v);if(c&&c.w){S.form.seats[0]=String(c.w);S.form.names[0]=v;}else{S.form.names[0]=v;}autoSaveLS();render();};
window.lsCoPilot=v=>{
  const f=S.form;
  // Save displaced seat-1 passenger to unallocated before overwriting
  const prevName=f.names[1]||'';
  const prevWt=f.seats[1]||'';
  const prevBag=f.bags[1]||'';
  const prevInfant=(f.infantNames||{})[1]||'';
  const wasPassenger=prevName&&prevName!==f.coPilot;
  f.coPilot=v;
  const cr=anyCrewList().find(x=>x.n===v);
  if(v&&cr&&cr.w){
    if(wasPassenger){
      if(!f._unallocated)f._unallocated=[];
      f._unallocated.push({name:prevName,weight:prevWt,bag:prevBag,infant:prevInfant});
    }
    f.seats[1]=String(cr.w);f.names[1]=v;
  } else if(!v){
    // Copilot cleared - seat 1 becomes empty pax seat
    delete f.seats[1];delete f.names[1];
    if(f.infantNames)delete f.infantNames[1];
  } else {
    delete f.seats[1];delete f.names[1];
  }
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
window.lsN=(i,v)=>{S.form.names[i]=v;};window.lsS=(i,v)=>{S.form.seats[i]=v;setTimeout(_lsSafeRender,150);};window.lsB=(i,v)=>{S.form.bags[i]=v;setTimeout(_lsSafeRender,150);};window.lsC=(i,v)=>{if(!S.form.cargo)S.form.cargo={};S.form.cargo[i]=v;S.formDirty=true;setTimeout(_lsSafeRender,150);};
window.lsFuel=(v,acId)=>{S.form.fuel=String(toKg(v,acId));setTimeout(_lsSafeRender,150);};
window.lsBurn=(v,acId)=>{S.form.burnOff=v;setTimeout(_lsSafeRender,150);};
window.lsGndBurn=(v,acId)=>{const n=parseFloat(v);S.form.gndBurn=isNaN(n)?null:String(toKg(n,acId));setTimeout(_lsSafeRender,150);};
window.clearSig=()=>{S.form.sig=null;S.sigTypedName='';autoSaveLS();render();};

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
  ctx.fillStyle='#e2e8f0';
  ctx.textBaseline='middle';
  const tw=ctx.measureText(name).width;
  const x=Math.max(20,(c.width-tw)/2);
  ctx.fillText(name,x,c.height/2);
  // Add underline
  ctx.beginPath();ctx.strokeStyle='#94a3b8';ctx.lineWidth=1.5;
  ctx.moveTo(x-5,c.height/2+32);ctx.lineTo(x+tw+5,c.height/2+32);ctx.stroke();
  S.form.sig=c.toDataURL();
  autoSaveLS();
  render();
};

// ── Save / Submit ──
window.saveUnsigned=async()=>{
  const f=S.form;if(!f.ac){toast('Select an aircraft first.','warn');return;}
  const id=S.editId||('ls_'+Date.now());
  const isEdit=!!S.editId;
  const sheet={id,savedAt:new Date().toISOString(),form:dc(f),status:'unsigned'};
  S.saved=S.saved.filter(s=>s.id!==id);S.saved.unshift(sheet);
  S.editId=id;S.formDirty=false;
  // Clear originalForm — user deliberately saved, so restore banner no longer needed
  var _savingTab=S.lsTabs.find(function(t){return t.id===id;});
  if(_savingTab)delete _savingTab.originalForm;
  lsSet('ts_loadsheets_cache',S.saved);
  await sbU('ts_loadsheets',[{id:sheet.id,form:sheet.form,saved_at:sheet.savedAt,status:'unsigned'}]);
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_signed',payload:{acCode:(f.ac||'').replace('ZK-',''),by:(S.user&&S.user.name)||'',sessionId:_sessionId}},ref:String(_rtRef)}));}
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
  render();
};
window.saveDraft=window.saveUnsigned; // alias for desk staff button
// handleSubmit for signed loadsheets
window.handleSubmit=async()=>{
  const f=S.form;
  if(!f.sig){toast('Please sign the loadsheet before submitting.','warn');return;}
  if(!f.pic){toast('Select a PIC before submitting.','warn');return;}
  const r=calcFormWB(f);if(!r||!r.towOk||!r.lwOk||!r.cogOk){toast('Fix weight and balance limits before submitting.','warn');return;}
  const id=S.editId||('ls_'+Date.now());
  const sheet={id,savedAt:new Date().toISOString(),form:dc(f),status:'complete'};
  S.saved=S.saved.filter(s=>s.id!==id);S.saved.unshift(sheet);lsSet('ts_loadsheets_cache',S.saved);
  var _submitTab=S.lsTabs.find(function(t){return t.id===id;});
  if(_submitTab)delete _submitTab.originalForm;
  // Google Drive upload happens via nightly scheduler only
  await sbU('ts_loadsheets',[{id:sheet.id,form:sheet.form,saved_at:sheet.savedAt,status:'complete'}]);
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_saved',payload:{by:S.user?.id}},ref:String(_rtRef)}));}
  auditLog('loadsheet_submit',{id,ac:f.ac,dep:f.dep,dest:f.dest,date:f.date,pic:f.pic,tow:r.rampW?.toFixed(0)});
  toast('Loadsheet submitted.','ok');
  // Close the tab
  var _tid=id;S.editId=null;S.lsForms[S.lsAc]=bF_ac('ZK-'+S.lsAc);S.form=S.lsForms[S.lsAc];S.formDirty=false;
  var _idx=S.lsTabs.findIndex(function(t){return t.id===_tid;});
  if(_idx!==-1){
    if(S.activeTabId===_tid){
      if(S.lsTabs.length>1){var _nx=S.lsTabs[_idx>0?_idx-1:1];S.activeTabId=_nx.id;S.form=_nx.form;S.lsAc=_nx.acId.replace('ZK-','');S.editId=_nx.id;}
      else{S.activeTabId=null;S._newLsTab=false;S.tab='saved';}
    }
    S.lsTabs.splice(_idx,1);
  } else {S.tab='saved';}
  render();
};
window.newSheet=function(){S._newLsTab=true;S.activeTabId=null;S.tab='manifest';render();};

window.switchLsTab=function(id){
  var tab=S.lsTabs.find(function(t){return t.id===id;});
  if(!tab)return;
  S.activeTabId=id;S.form=tab.form;S.lsAc=tab.acId.replace('ZK-','');S.editId=id;
  S._newLsTab=false;S.tab='loadsheet';render();
};
window.closeLsTab=function(id){
  var idx=S.lsTabs.findIndex(function(t){return t.id===id;});
  if(idx===-1)return;
  var tab=S.lsTabs[idx];
  var acCode=tab.acId?tab.acId.replace('ZK-',''):id;
  // Build custom dialog
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
  var box=document.createElement('div');
  box.style.cssText='background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:22px;max-width:360px;width:100%';
  var title=acCode+' loadsheet';
  if(tab.isNew){
    box.innerHTML='<div style="font-size:16px;font-weight:700;margin-bottom:8px">Close '+title+'?</div>'
      +'<div style="font-size:13px;color:var(--text3);margin-bottom:18px">This is a new loadsheet. Keep it in Saved for later, or delete it now.</div>'
      +'<div style="display:flex;gap:8px;margin-bottom:8px">'
      +'<button id="_lsCloseKeep" style="flex:1;padding:11px;background:var(--acc);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Keep</button>'
      +'<button id="_lsCloseDelete" style="flex:1;padding:11px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Delete</button>'
      +'</div>'
      +'<button id="_lsCloseCancel" style="width:100%;padding:10px;background:var(--card2);color:var(--text2);border:1px solid var(--border2);border-radius:8px;font-size:13px;cursor:pointer">Cancel</button>';
  } else {
    box.innerHTML='<div style="font-size:16px;font-weight:700;margin-bottom:8px">Close '+title+'?</div>'
      +'<div style="font-size:13px;color:var(--text3);margin-bottom:18px">Save your changes to the folder, or close without saving.</div>'
      +'<div style="display:flex;gap:8px;margin-bottom:8px">'
      +'<button id="_lsCloseKeep" style="flex:1;padding:11px;background:var(--acc);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Save &amp; Close</button>'
      +'<button id="_lsCloseDelete" style="flex:1;padding:11px;background:transparent;color:#f59e0b;border:1.5px solid #f59e0b;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Discard Changes</button>'
      +'</div>'
      +'<button id="_lsClosePermDel" style="width:100%;margin-bottom:6px;padding:10px;background:transparent;color:#ef4444;border:1.5px solid #ef4444;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">🗑 Delete Loadsheet</button>'
      +'<button id="_lsCloseCancel" style="width:100%;padding:10px;background:var(--card2);color:var(--text2);border:1px solid var(--border2);border-radius:8px;font-size:13px;cursor:pointer">Cancel</button>';
  }
  ov.appendChild(box);
  document.body.appendChild(ov);
  function _doClose(action){
    ov.remove();
    _execCloseLsTab(id,idx,tab,action);
  }
  document.getElementById('_lsCloseKeep').onclick=function(){_doClose('keep');};
  document.getElementById('_lsCloseDelete').onclick=function(){_doClose(tab.isNew?'delete':'revert');};
  document.getElementById('_lsCloseCancel').onclick=function(){ov.remove();};
  var _permDelBtn=document.getElementById('_lsClosePermDel');
  if(_permDelBtn)_permDelBtn.onclick=function(){
    if(confirm('Permanently delete this loadsheet? This cannot be undone.'))_doClose('delete');
  };
};
function _execCloseLsTab(id,idx,tab,action){
  if(action==='delete'){
    sbDel('ts_loadsheets',id).catch(function(){});
    S.saved=S.saved.filter(function(s){return s.id!==id;});
    lsSet('ts_loadsheets_cache',S.saved);
    S._lsFormUndo=null;
    if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_deleted',payload:{id:id,sessionId:_sessionId}},ref:String(_rtRef)}));}
  } else if(action==='revert'){
    // Discard: just close, DB unchanged (holds the original)
    S._lsFormUndo=null;
  } else if(action==='keep'){
    // Save & Close: explicit DB write
    const _sf=tab.form||S.form;
    if(_sf)saveLsToDb(id,_sf).catch(function(){});
  }
  // Broadcast close
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_tab_close',payload:{id:id}},ref:String(_rtRef)}));}
  if(S.activeTabId===id){
    if(S.lsTabs.length>1){var next=S.lsTabs[idx>0?idx-1:1];S.activeTabId=next.id;S.form=next.form;S.lsAc=next.acId.replace('ZK-','');S.editId=next.id;}
    else{S.activeTabId=null;S.editId=null;S._newLsTab=false;S.tab='manifest';}
  }
  S.lsTabs.splice(idx,1);render();
}
window.newLsTab=function(){S._newLsTab=true;S.activeTabId=null;S.tab='manifest';render();};
window.toggleLsManage=function(){S._lsManageMode=!S._lsManageMode;S._lsTabSel={};render();};
window.toggleLsTabSel=function(id){S._lsTabSel[id]=!S._lsTabSel[id];render();};
window.deleteSelectedLsTabs=function(){
  var ids=Object.keys(S._lsTabSel).filter(function(id){return S._lsTabSel[id];});
  if(!ids.length)return;
  ids.forEach(function(id){
    sbDel('ts_loadsheets',id).catch(function(){});
    S.saved=S.saved.filter(function(s){return s.id!==id;});
    if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_tab_close',payload:{id:id}},ref:String(_rtRef)}));}
  });
  lsSet('ts_loadsheets_cache',S.saved);
  S.lsTabs=S.lsTabs.filter(function(t){return!S._lsTabSel[t.id];});
  if(S.activeTabId&&S._lsTabSel[S.activeTabId]){S.activeTabId=null;S.editId=null;S.tab='manifest';}
  S._lsManageMode=false;S._lsTabSel={};render();
};
window.createLsTab=function(acId){S._newLsTab=false;generateLoadsheet(acId);};
window.pushLsToSeatmap=function(){
  const f=S.form;if(!f||!f.ac)return;
  const acId=f.ac;
  if(!S.dispatch)S.dispatch=bD();
  S.dispatch.acSetup=S.dispatch.acSetup||[];
  S.dispatch.seatMap=S.dispatch.seatMap||{};
  S.dispatch.pax=S.dispatch.pax||[];
  // Auto-add aircraft to seatmap setup if not already present; always update PIC/coPilot
  var _acsEntry=S.dispatch.acSetup.find(function(s){return s.acId===acId;});
  if(!_acsEntry){
    _acsEntry={acId:acId,pic:f.pic||'',coPilot:f.coPilot||''};
    S.dispatch.acSetup.push(_acsEntry);
  } else {
    if(f.pic)_acsEntry.pic=f.pic;
    if(f.coPilot)_acsEntry.coPilot=f.coPilot;
  }
  // Build name→id map from existing pax
  const nameMap={};
  S.dispatch.pax.forEach(function(p){if(p.name)nameMap[p.name.trim().toLowerCase()]=p.id;});
  // Merge loadsheet seats on top of existing seatmap for this aircraft
  const sm=Object.assign({},S.dispatch.seatMap[acId]||{});
  Object.keys(f.names||{}).forEach(function(idx){
    if(parseInt(idx)===0)return; // Skip PIC — not pushed as pax
    const nm=(f.names[idx]||'').trim();if(!nm)return;
    const key=nm.toLowerCase();
    let pid=nameMap[key];
    if(!pid){
      // Pax in loadsheet but not in manifest — add them tagged
      pid='_ls_'+key.replace(/[^a-z0-9]/g,'_');
      if(!S.dispatch.pax.find(function(p){return p.id===pid;})){
        S.dispatch.pax.push({id:pid,name:nm,
          weight:parseFloat((f.seats||{})[idx]||0)||0,
          bag:parseFloat((f.bags||{})[idx]||0)||0,
          type:((f.paxType||{})[idx]==='C'?'child':'adult'),
          group:(f.paxGroups||{})[idx]||'',
          paymentReq:!!((f.paxPaymentReq||{})[idx]),
          _pushedFrom:acId});
      }
      nameMap[key]=pid;
    }
    sm[parseInt(idx)]=pid;
    var grpVal=(f.paxGroups||{})[idx];
    if(grpVal!=null){var _dp=S.dispatch.pax.find(function(px){return px.id===pid;});if(_dp)_dp.group=grpVal;}
    var payReqVal=(f.paxPaymentReq||{})[idx];
    if(payReqVal!=null){var _dp2=S.dispatch.pax.find(function(px){return px.id===pid;});if(_dp2)_dp2.paymentReq=!!payReqVal;}
  });
  S.dispatch.seatMap[acId]=sm;
  autoSaveDispatch();
  render();
  toast('✅ Pushed to seatmap','ok');
};
window.pushAllLsToSeatmap=function(){
  const tabs=S.lsTabs||[];
  if(!tabs.length){toast('No open loadsheets to push.','warn');return;}
  if(!S.dispatch)S.dispatch=bD();
  S.dispatch.pax=S.dispatch.pax||[];
  S.dispatch.seatMap=S.dispatch.seatMap||{};
  S.dispatch.acSetup=S.dispatch.acSetup||[];
  // Build name→id map from existing pax
  const nameMap={};
  S.dispatch.pax.forEach(function(p){if(p.name)nameMap[p.name.trim().toLowerCase()]=p.id;});
  // Group tabs by physical aircraft
  const acGroups={};
  tabs.forEach(function(tab){
    const ac=(tab.form?.ac)||tab.acId;if(!ac)return;
    if(!acGroups[ac])acGroups[ac]=[];
    acGroups[ac].push(tab);
  });
  // Merge each loadsheet into dispatch
  Object.keys(acGroups).forEach(function(phyId){
    const group=acGroups[phyId];
    group.forEach(function(tab,i){
      const multi=group.length>1;
      const smKey=multi?(phyId+'_'+(i+1)):phyId;
      const suffix=multi?'('+(i+1)+')':null;
      // Add to acSetup if not present; always update PIC/coPilot from loadsheet
      var _pacs=S.dispatch.acSetup.find(function(s){return(s._seatmapKey||s.acId)===smKey;});
      if(!_pacs){
        var _ephys=S.dispatch.acSetup.find(function(s){return s.acId===phyId;});
        _pacs=Object.assign({},_ephys||{acId:phyId},{acId:phyId,_seatmapKey:smKey,_displaySuffix:suffix});
        if(f&&f.pic)_pacs.pic=f.pic;if(f&&f.coPilot)_pacs.coPilot=f.coPilot;
        S.dispatch.acSetup.push(_pacs);
      } else {
        if(f&&f.pic)_pacs.pic=f.pic;if(f&&f.coPilot)_pacs.coPilot=f.coPilot;
      }
      // Merge seat assignments (loadsheet takes priority for assigned seats)
      const sm=Object.assign({},S.dispatch.seatMap[smKey]||{});
      const f=tab.form;if(!f)return;
      Object.keys(f.names||{}).forEach(function(idx){
        if(parseInt(idx)===0)return; // Skip PIC
        const nm=(f.names[idx]||'').trim();if(!nm)return;
        const key=nm.toLowerCase();
        let pid=nameMap[key];
        if(!pid){
          pid='_ls_'+key.replace(/[^a-z0-9]/g,'_');
          if(!S.dispatch.pax.find(function(p){return p.id===pid;})){
            S.dispatch.pax.push({id:pid,name:nm,
              weight:parseFloat((f.seats||{})[idx]||0)||0,
              bag:parseFloat((f.bags||{})[idx]||0)||0,
              type:((f.paxType||{})[idx]==='C'?'child':'adult'),
              group:(f.paxGroups||{})[idx]||'',
              _pushedFrom:phyId});
          }
          nameMap[key]=pid;
        }
        sm[parseInt(idx)]=pid;
        var grpVal=(f.paxGroups||{})[idx];
        if(grpVal!=null){var _dp=S.dispatch.pax.find(function(px){return px.id===pid;});if(_dp)_dp.group=grpVal;}
      });
      S.dispatch.seatMap[smKey]=sm;
    });
  });
  autoSaveDispatch();render();
  toast('✅ All loadsheets pushed to seatmap','ok');
};
window.pullFromSeatmap=function(){
  const d=S.dispatch;
  // Sync pax pinAc from seatmap seat assignments
  Object.entries(d.seatMap||{}).forEach(function(e){
    const acId=e[0];const sm=e[1];
    Object.values(sm||{}).forEach(function(paxId){
      const p=(d.pax||[]).find(function(x){return x.id===paxId;});
      if(p){p.pinAc=acId;p._ts=Date.now();}
    });
  });
  // Update PICs in acSetup from open loadsheets
  (d.acSetup||[]).forEach(function(s){
    const tab=(S.lsTabs||[]).find(function(t){return t.acId===s.acId&&t.form&&t.form.pic;});
    if(tab&&tab.form.pic)s.pic=tab.form.pic;
    if(tab&&tab.form.coPilot)s.coPilot=tab.form.coPilot;
  });
  autoSaveDispatch();render();
  toast('✅ Pulled from seatmap','ok');
};
window.clearSeatmap=function(){
  S.dispatch.seatMap={};
  S.selectedPax=null;
  autoSaveDispatch();render();
  toast('Seatmap cleared','ok');
};
window.removeAcFromSeatmap=function(smKey){
  S.dispatch.acSetup=(S.dispatch.acSetup||[]).filter(function(s){return(s._seatmapKey||s.acId)!==smKey;});
  if(S.dispatch.seatMap)delete S.dispatch.seatMap[smKey];
  // If no aircraft left, go back to manifest
  if(!(S.dispatch.acSetup||[]).length){S.tab='manifest';}
  autoSaveDispatch();render();
};
window.createBlankLsTab=function(acId){
  const a=S.aircraft[acId];if(!a)return;
  const d=S.dispatch;
  const setup=d.acSetup.find(function(s){return s.acId===acId;});
  const form=bF();
  form.ac=acId;
  form.dep=d.dep;form.dest=d.dest;form.date=d.date;form.etd=d.etd;form.etdCustom=d.etdCustom||false;
  form.pic=setup?.pic||'';form.coPilot=setup?.coPilot||'';
  const picCrew=anyCrewList().find(function(c){return c.n===form.pic;});
  if(picCrew&&picCrew.w){form.seats[0]=String(picCrew.w);form.names[0]=form.pic;}
  const _lsAcCode=acId.replace('ZK-','');
  const _newTabId='ls_'+_lsAcCode+'_'+Date.now();
  S.lsForms[_lsAcCode]=form;S.lsAc=_lsAcCode;S.form=form;S.editId=_newTabId;S.formDirty=false;
  var _savedAt=new Date().toISOString();
  S.lsTabs.push({id:_newTabId,acId:acId,form:form,status:'unsigned',savedAt:_savedAt,isNew:true});
  S.activeTabId=_newTabId;S._newLsTab=false;S.tab='loadsheet';
  sbU('ts_loadsheets',[{id:_newTabId,form:form,saved_at:_savedAt,status:'unsigned'}]).catch(function(){});
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'ls_tab_open',payload:{id:_newTabId,acId:acId,form:form,savedAt:_savedAt,by:(S.user&&S.user.name)||''}},ref:String(_rtRef)}));}
  render();
};
window.changeLsAircraft=function(targetAcFull){
  var tab=S.lsTabs.find(function(t){return t.id===S.activeTabId;});
  if(tab)tab.acId=targetAcFull;
  S.lsAc=targetAcFull.replace('ZK-','');
  window.lsAc(targetAcFull);
  if(tab)tab.form=S.form;
  autoSaveLS();
};
window.editSaved=function(id){
  var existing=S.lsTabs.find(function(t){return t.id===id;});
  if(existing){window.switchLsTab(id);return;}
  var s=S.saved.find(function(x){return x.id===id;});
  if(!s)return;
  var acFull=s.form&&s.form.ac?s.form.ac:'ZK-SLA';
  var _esForm=dc(s.form);if(!_esForm.cargo)_esForm.cargo={};var _esAc=S.aircraft[_esForm.ac];if(_esAc&&_esAc.layout==='ga8'&&(!_esForm.burnOff||parseFloat(_esForm.burnOff)<30)){_esForm.burnOff='35';}
  S.lsTabs.push({id:s.id,acId:acFull,form:_esForm,status:s.status||'unsigned',savedAt:s.savedAt,originalForm:dc(s.form)});
  window.switchLsTab(s.id);
};
window.delSaved=async function(id){if(!confirm('Move this loadsheet to Bin?'))return;var s=S.saved.find(function(x){return x.id===id;});if(!s)return;s.form._prevStatus=s.status;s.status='deleted';lsSet('ts_loadsheets_cache',S.saved);render();await sbU('ts_loadsheets',[{id:s.id,form:s.form,saved_at:s.savedAt,status:'deleted'}]);};
window.restoreFromBin=async function(id){
  var s=S.saved.find(function(x){return x.id===id;});
  if(s){var ps=s.form._prevStatus||'unsigned';delete s.form._prevStatus;s.status=ps;lsSet('ts_loadsheets_cache',S.saved);render();await sbU('ts_loadsheets',[{id:s.id,form:s.form,saved_at:s.savedAt,status:s.status}]);return;}
  var m=S.manifests.find(function(x){return x.id===id;});
  if(m){if(m.data)delete m.data._deleted;m._deleted=false;lsSet('ts_manifests_cache',S.manifests);render();await sbU('ts_manifests',[{id:m.id,name:m.name,data:m.data,saved_at:m.savedAt}]);}
};
window.permDeleteFromBin=async function(id){if(!confirm('Permanently delete? This cannot be undone.'))return;S.saved=S.saved.filter(function(s){return s.id!==id;});S.manifests=S.manifests.filter(function(m){return m.id!==id;});lsSet('ts_loadsheets_cache',S.saved);lsSet('ts_manifests_cache',S.manifests);render();await sbDel('ts_loadsheets',id).catch(function(){});await sbDel('ts_manifests',id).catch(function(){});};
window.emptyBin=async function(){var bLs=S.saved.filter(function(s){return s.status==='deleted';});var bMs=S.manifests.filter(function(m){return m._deleted;});if(!bLs.length&&!bMs.length){toast('Bin is already empty','info');return;}if(!confirm('Permanently delete all '+(bLs.length+bMs.length)+' item(s)? This cannot be undone.'))return;S.saved=S.saved.filter(function(s){return s.status!=='deleted';});S.manifests=S.manifests.filter(function(m){return!m._deleted;});lsSet('ts_loadsheets_cache',S.saved);lsSet('ts_manifests_cache',S.manifests);render();for(var i=0;i<bLs.length;i++)await sbDel('ts_loadsheets',bLs[i].id).catch(function(){});for(var j=0;j<bMs.length;j++)await sbDel('ts_manifests',bMs[j].id).catch(function(){});};
window.restoreLsOriginal=function(){
  if(!confirm('Restore to the version loaded from saved? Any unsaved edits will be lost.'))return;
  var tab=S.lsTabs.find(function(t){return t.id===S.activeTabId;});
  if(!tab||!tab.originalForm)return;
  tab.form=dc(tab.originalForm);
  S.form=tab.form;
  delete tab.originalForm;
  clearTimeout(_autoSaveLSTimer);
  autoSaveLS(); // push the restored version to DB
  render();
};
window.dismissLsRestore=function(){
  var tab=S.lsTabs.find(function(t){return t.id===S.activeTabId;});
  if(tab)delete tab.originalForm;
  render();
};

// ── Charter ──
// -- Pad (Scratchpad) management --
var _padDebounce=null;
window.newPad=function(){
  var id='pad_'+Date.now();
  var nextN=(S.pads.length+S.padTabs.filter(function(t){return!S.pads.find(function(p){return p.id===t.id;});}).length)+1;
  var title='Scratch '+nextN;
  var pad={id:id,title:title,content:'',drawing:[],savedAt:new Date().toISOString(),_mode:'text',_dirty:false};
  S.padTabs.push(pad);S.activePadId=id;
  S.tab='scratchpad';S.activeTabId=null;S._newLsTab=false;
  render();
  sbU('ts_scratchpads',[{id:id,title:title,content:'',drawing:[],saved_at:new Date().toISOString()}]).then(function(){
    if(!S.pads.find(function(p){return p.id===id;}))S.pads.push({id:id,title:title,content:'',drawing:[]});
    if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'pad_new',payload:{id:id,title:title}},ref:String(_rtRef)}));}
  }).catch(function(){});
};
window.openPad=function(id){
  var ex=S.padTabs.find(function(t){return t.id===id;});
  if(ex){S.activePadId=id;render();return;}
  var ps=S.pads.find(function(p){return p.id===id;});
  if(!ps)return;
  S.padTabs.push(Object.assign({},ps,{_mode:'text',_dirty:false}));
  S.activePadId=id;S.tab='scratchpad';S.activeTabId=null;render();
};
window.switchPad=function(id){S.activePadId=id;render();};
window.closePad=function(id){
  S.padTabs=S.padTabs.filter(function(t){return t.id!==id;});
  if(S.activePadId===id){S.activePadId=S.padTabs.length?S.padTabs[S.padTabs.length-1].id:null;}
  render();
};
window.savePad=async function(){
  var act=S.padTabs.find(function(t){return t.id===S.activePadId;});
  if(!act||!S.user)return;
  try{
    await sbU('ts_scratchpads',[{id:act.id,title:act.title||'Untitled',content:act.content||'',drawing:act.drawing||[],saved_at:new Date().toISOString()}]);
    act._dirty=false;
    var ex=S.pads.findIndex(function(p){return p.id===act.id;});
    if(ex>=0)S.pads[ex]=Object.assign({},S.pads[ex],{title:act.title,content:act.content,drawing:act.drawing});
    else S.pads.push({id:act.id,title:act.title||'Untitled',content:act.content||'',drawing:act.drawing||[]});
    toast('Saved','ok');render();
  }catch(e){toast('Save failed','warn');}
};
window.clearPad=function(){
  var act=S.padTabs.find(function(t){return t.id===S.activePadId;});if(!act)return;
  act.content='';act.drawing=[];act._dirty=true;
  var cv=document.getElementById('pad-canvas');
  if(cv){var ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);}
  render();
};
window.deletePad=async function(id){
  if(!confirm('Delete this scratchpad?'))return;
  try{await sbDel('ts_scratchpads',id);}catch(e){}
  S.pads=S.pads.filter(function(p){return p.id!==id;});
  S.padTabs=S.padTabs.filter(function(t){return t.id!==id;});
  if(S.activePadId===id){S.activePadId=S.padTabs.length?S.padTabs[S.padTabs.length-1].id:null;}
  render();
};
window.updatePadTitle=function(v){
  var act=S.padTabs.find(function(t){return t.id===S.activePadId;});if(!act)return;
  act.title=v;act._dirty=true;
  window._broadcastPadUpdate&&window._broadcastPadUpdate(act);
  window._padAutoSave&&window._padAutoSave(act);
};
window.padUpdateContent=function(v){
  var act=S.padTabs.find(function(t){return t.id===S.activePadId;});if(!act)return;
  act.content=v;act._dirty=true;
  clearTimeout(_padDebounce);
  _padDebounce=setTimeout(function(){window._broadcastPadUpdate&&window._broadcastPadUpdate(act);window._padAutoSave&&window._padAutoSave(act);},600);
};
window._padAutoSave=function(act){
  if(!act||!S.user)return;
  clearTimeout(act._saveTimer);
  act._saveTimer=setTimeout(async function(){
    try{
      await sbU('ts_scratchpads',[{id:act.id,title:act.title||'Untitled',content:act.content||'',drawing:act.drawing||[],saved_at:new Date().toISOString()}]);
      act._dirty=false;
      var ex=S.pads.findIndex(function(p){return p.id===act.id;});
      if(ex>=0)S.pads[ex]=Object.assign({},S.pads[ex],{title:act.title,content:act.content,drawing:act.drawing});
      else S.pads.push({id:act.id,title:act.title||'Untitled',content:act.content||'',drawing:act.drawing||[]});
      safeRender();
    }catch(e){}
  },1500);
};
window._broadcastPadUpdate=function(act){
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'pad_update',payload:{id:act.id,title:act.title,content:act.content}},ref:String(_rtRef)}));}
};
window._broadcastPadStroke=function(id,stroke){
  if(_rtWs&&_rtWs.readyState===1){_rtRef++;_rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',payload:{type:'broadcast',event:'pad_stroke',payload:{id:id,stroke:stroke}},ref:String(_rtRef)}));}
};
window.addLeg=()=>{
  const legs=S.charter.legs;
  const prev=legs.length>0?legs[legs.length-1]:{};
  legs.push({from:prev.to||'NZQN',to:'NZQN',acId:prev.acId||'',pax:prev.pax||1,waitHrs:0,note:''});
  render();
};
window.removeLeg=i=>{S.charter.legs.splice(i,1);render();};
window.setLeg=function(i,k,v){
  S.charter.legs[i][k]=v;
  if(k==='acId') S.charter.legs.forEach(function(leg){leg.acId=v;});
  render();
};

// ── Debounced search ──
let _searchTimer=null;
window.debounceSearch=v=>{clearTimeout(_searchTimer);_searchTimer=setTimeout(()=>{S.savedSearch=v;render();// Re-focus the input and restore cursor
const el=document.getElementById('savedSearchInput');if(el){const pos=el.value.length;el.focus();try{el.setSelectionRange(pos,pos);}catch{}}},300);};


// ── ETD season-based options ──
function etdOptions(dateStr){
  const d=new Date(dateStr||Date.now());const m=d.getMonth()+1;
  return (m>=10||m<=4)?['08:00','10:30','13:00','14:30','15:30']:['08:00','09:30','12:00','15:30'];
}
function etdSelect(val,dateStr,dispatchKey){
  var opts=etdOptions(dateStr);
  var stateObj=dispatchKey==='dispatch'?S.dispatch:(dispatchKey==='form'?S.form:null);
  var isCustom=!!(stateObj&&stateObj.etdCustom)||(!!val&&opts.indexOf(val)<0);
  var h='<div style="display:flex;flex-wrap:wrap;gap:5px">';
  opts.forEach(function(t){
    var sel=val===t&&!isCustom;
    h+='<button onclick="event.stopPropagation();window.handleEtdSel(\''+t+'\',\''+dispatchKey+'\')" style="padding:4px 10px;border-radius:20px;border:1.5px solid '+(sel?'var(--acc)':'var(--border2)')+';background:'+(sel?'rgba(124,58,237,.18)':'transparent')+';color:'+(sel?'var(--acc)':'var(--text2)')+';font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;box-shadow:'+(sel?'0 0 0 2px rgba(124,58,237,.18)':'none')+'">'+t+'</button>';
  });
  var otherSel=isCustom;
  h+='<button onclick="event.stopPropagation();window.handleEtdSel(\'other\',\''+dispatchKey+'\')" style="padding:4px 10px;border-radius:20px;border:1.5px solid '+(otherSel?'var(--acc)':'var(--border2)')+';background:'+(otherSel?'rgba(124,58,237,.18)':'transparent')+';color:'+(otherSel?'var(--acc)':'var(--text2)')+';font-size:12px;font-weight:700;cursor:pointer;box-shadow:'+(otherSel?'0 0 0 2px rgba(124,58,237,.18)':'none')+'">Other</button>';
  h+='</div>';
  if(isCustom){
    h+='<input type="text" class="fi" id="etd_custom_'+dispatchKey+'" placeholder="e.g. 15:30" style="margin-top:6px;font-size:13px;font-weight:600" value="'+(val&&opts.indexOf(val)<0?val:'')+'" oninput="window.handleEtdCustom(this,\''+dispatchKey+'\')">';
  }
  return h;
}
window.handleEtdSel=function(v,key){
  const obj=key==='dispatch'?S.dispatch:(key==='form'?S.form:null);
  if(v==='other'){
    if(obj){obj.etdCustom=true;obj.etd='';}
  } else {
    if(obj){obj.etd=v;obj.etdCustom=false;}
  }
  if(key==='dispatch'){autoSaveDispatch();render();}
  else if(key==='form'){autoSaveLS();safeRender();}
};
window.handleEtdCustom=function(inp,key){
  const obj=key==='dispatch'?S.dispatch:(key==='form'?S.form:null);
  if(obj){obj.etd=inp.value;if(key==='dispatch')autoSaveDispatch();if(key==='form')autoSaveLS();}
};

// ── Route Map (Leaflet) ──
var _maps={};
var _mapTimers={};
function renderRouteMap(elId,legs){
  // Debounce: rapid re-renders (from RT broadcasts) cancel and restart the timer
  // so the map only initialises once rendering has settled.
  if(_mapTimers[elId])clearTimeout(_mapTimers[elId]);
  _mapTimers[elId]=setTimeout(function(){
    delete _mapTimers[elId];
    var el=document.getElementById(elId);if(!el)return;
    if(_maps[elId]){try{_maps[elId].remove();}catch(e){}delete _maps[elId];}
    var points=[];
    legs.forEach(function(l){
      var A=APT_COORDS[l.from],B=APT_COORDS[l.to];
      if(A&&!points.find(function(p){return p[0]===A.lat&&p[1]===A.lng;}))points.push([A.lat,A.lng,l.from]);
      if(B&&!points.find(function(p){return p[0]===B.lat&&p[1]===B.lng;}))points.push([B.lat,B.lng,l.to]);
    });
    if(points.length<2)return;
    if(typeof L==='undefined')return;
    var map=L.map(elId,{zoomControl:true,attributionControl:false});
    _maps[elId]=map;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:18}).addTo(map);
    legs.forEach(function(l){
      var A=APT_COORDS[l.from],B=APT_COORDS[l.to];
      if(A&&B)L.polyline([[A.lat,A.lng],[B.lat,B.lng]],{color:'#7B9EC6',weight:2.5,dashArray:'6 4',opacity:.85}).addTo(map);
    });
    var icon=L.divIcon({className:'',html:'<div style="width:10px;height:10px;border-radius:50%;background:#7B9EC6;border:2px solid #fff;margin:-5px 0 0 -5px"></div>',iconSize:[0,0]});
    points.forEach(function(pt){
      L.marker([pt[0],pt[1]],{icon:icon}).bindTooltip((APTS[pt[2]]||pt[2])+' ('+pt[2]+')',{permanent:false,direction:'top'}).addTo(map);
    });
    map.fitBounds(L.latLngBounds(points.map(function(p){return[p[0],p[1]];})),{padding:[30,30]});
  },600);
}

// ── Google Drive PDF Upload ──
window.uploadToDrive=async function(sheet,preToken){
  if(!S.gdriveClientId){alert('No Google OAuth Client ID set in Admin.');return;}
  S.driveStatus='uploading';render();
  // Use pre-fetched token or request a new one
  var token=preToken||null;
  if(!token){
    try{
      token=await new Promise(function(resolve,reject){
        function init(){
          google.accounts.oauth2.initTokenClient({
            client_id:S.gdriveClientId,
            scope:'https://www.googleapis.com/auth/drive',
            callback:function(r){if(r.error)reject(new Error(r.error));else resolve(r.access_token);}
          }).requestAccessToken();
        }
        if(window.google&&window.google.accounts&&window.google.accounts.oauth2){init();}
        else{var s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=init;s.onerror=function(e){reject(new Error('Failed to load Google sign-in library'));};document.head.appendChild(s);}
      });
    }catch(e){S.driveStatus='error:'+e.message;render();alert('Google sign-in failed: '+e.message);return;}
  }

  // Build the loadsheet HTML content
  var htmlContent=generatePrintHTML(sheet);

  // Resolve folder path: LOADSHEETS / YEAR / MONTH
  var date=new Date(sheet.savedAt);
  var year=String(date.getFullYear());
  var month=String(date.getMonth()+1).padStart(2,'0')+'-'+date.toLocaleString('en-NZ',{month:'long'});
  var explicitId=(S.gdriveFolderId||'').trim();
  var rootId=explicitId||await ensureDriveFolder(S.gdriveFolder||'Loadsheets','root',token);
  var yearId=await ensureDriveFolder(year,rootId,token);
  var monthId=await ensureDriveFolder(month,yearId,token);
  console.log('Uploading to folder IDs — root:',rootId,'year:',yearId,'month:',monthId);

  // Build filename
  var f=sheet.form;
  var fname='Loadsheet_'+(f.ac||'AC')+'_'+(f.dep||'')+'-'+(f.dest||'')+'_'+(f.date||'').replace(/-/g,'')+'_'+((f.pic||'PIC').split(' ').slice(-1)[0])+'.html';

  // Upload using multipart — build raw body to avoid FormData encoding issues
  var boundary='-------loadsheet_boundary_'+Date.now();
  var meta=JSON.stringify({name:fname,parents:[monthId]});
  // Encode HTML as UTF-8 bytes via TextEncoder to avoid corruption
  var encoder=new TextEncoder();
  var htmlBytes=encoder.encode(htmlContent);
  var CRLF='\r\n';
  var metaPart='--'+boundary+CRLF+'Content-Type: application/json; charset=UTF-8'+CRLF+CRLF+meta+CRLF+'--'+boundary+CRLF+'Content-Type: text/html; charset=UTF-8'+CRLF+CRLF;
  var endPart=CRLF+'--'+boundary+'--';
  var metaBytes=encoder.encode(metaPart);
  var endBytes=encoder.encode(endPart);
  // Combine into one Uint8Array
  var body=new Uint8Array(metaBytes.length+htmlBytes.length+endBytes.length);
  body.set(metaBytes,0);body.set(htmlBytes,metaBytes.length);body.set(endBytes,metaBytes.length+htmlBytes.length);

  var r=await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true',
    {method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'multipart/related; boundary='+boundary},body:body}
  );
  var respText=await r.text();
  console.log('Drive response:',r.status,respText.slice(0,200));
  if(r.ok){
    var result=JSON.parse(respText);
    var fileLink='https://drive.google.com/file/d/'+result.id+'/view';
    var folderLink='https://drive.google.com/drive/folders/'+monthId;
    S.driveStatus='ok:'+fname;S.driveLastLink=fileLink;S.driveLastFile=fname;S.driveLastFolder=folderLink;
    S.appMsg={type:'ok',text:'Saved to Drive: '+fname+' — <a href="'+fileLink+'" target="_blank" style="color:inherit">Open ↗</a> &nbsp; <a href="'+folderLink+'" target="_blank" style="color:inherit">Folder ↗</a>'};
    // Mark as uploaded in Supabase — updates drive_uploaded column on ts_loadsheets row
    if(sheet&&sheet.id){
      sbPatch('ts_loadsheets',sheet.id,{drive_uploaded:true}).catch(function(){});
      var _sh=S.saved.find(function(s){return s.id===sheet.id;});
      if(_sh)_sh.driveUploaded=true;
    }
    render();
    // No popup - status banner handles it
  }else{
    S.driveStatus='error:'+r.status;S.appMsg={type:'err',text:'Drive upload failed ('+r.status+'): '+respText.slice(0,120)};render();
    // No popup - status banner shows error
  }
};
window.ensureDriveFolder=async function(name,parentId,token){
  var parent=(parentId&&parentId!=='null'&&parentId!=='')?parentId:'root';
  // supportsAllDrives=true allows access to shared drives
  var q="mimeType='application/vnd.google-apps.folder' and name='"+name+"' and '"+parent+"' in parents and trashed=false";
  var res=await fetch('https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true',{headers:{Authorization:'Bearer '+token}});
  var data=await res.json();
  if(data.files&&data.files.length){
    console.log('Found folder "'+name+'" id:',data.files[0].id);
    return data.files[0].id;
  }
  // Create it inside the parent
  var body={name:name,mimeType:'application/vnd.google-apps.folder',parents:[parent]};
  var cr=await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
  var fj=await cr.json();
  console.log('Created folder "'+name+'" id:',fj.id,'in parent:',parent);
  return fj.id;
};
function generatePrintHTML(sheet){
  var f=sheet.form;
  var a=S.aircraft[f.ac]||{seats:[],cargo:[],doc:'',type:'',burnDef:'',burnDefUnit:'kg',gndBurn:0,fuelArm:0,ew:0,em:0,cogMin:0,cogMax:0,mtow:0,mlw:0};
  var r=calcFormWB(f);
  var acCol=AC_COL[f.ac]||'#1e6b8c';
  function hexRgba(h,op){var x=parseInt(h.slice(1),16);return 'rgba('+((x>>16)&255)+','+((x>>8)&255)+','+(x&255)+','+op+')';}
  var acFaint=hexRgba(acCol,0.09);
  var acLight=hexRgba(acCol,0.18);

  var towOk=r&&r.towOk,lwOk=r&&r.lwOk,cogOk=r&&r.cogOk;
  var allOk=towOk&&lwOk&&cogOk;
  var statusBg=allOk?'#f0fdf4':'#fef2f2';
  var statusBorder=allOk?'#16a34a':'#dc2626';
  var statusColor=allOk?'#15803d':'#b91c1c';
  var status=allOk?'✓  ALL LIMITS WITHIN RANGE':'⚠  ONE OR MORE LIMITS EXCEEDED';

  // Fuel calcs
  var fuelKgV=parseFloat(f.fuel)||0;
  var burnKgV=r?r.burnKg:0;
  var remKg=fuelKgV-a.gndBurn-burnKgV;
  var fuelU=fuelUnit(f.ac);
  var fuelDisplay=f.ac?fromKg(fuelKgV,f.ac).toFixed(1):fuelKgV;
  var remDisplay=f.ac?fromKg(Math.max(0,remKg),f.ac).toFixed(1):Math.max(0,remKg).toFixed(1);

  // Shared inline styles
  var TD='border:1px solid #e2e8f0;padding:5px 8px;font-family:Arial,sans-serif;font-size:11px;vertical-align:top;';
  var TH='border:1px solid '+acCol+';padding:5px 8px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.05em;text-align:left;background:'+acCol+';color:#fff;';
  var THSPAN='border:1px solid '+acCol+';padding:5px 8px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:.05em;text-align:left;background:'+acCol+';color:#fff;';

  function thRow(label,span){return '<tr><th colspan="'+(span||2)+'" style="'+THSPAN+'">'+label.toUpperCase()+'</th></tr>';}

  // Seat rows
  var seatRows='';
  a.seats.forEach(function(s,i){
    var n=(f.names&&f.names[i])||'';
    var w=(f.seats&&f.seats[i])||'';
    var b=(f.bags&&f.bags[i])||'';
    if(n||parseFloat(w)){
      var m=((parseFloat(w)||0)+(parseFloat(b)||0))*s.arm;
      var _inf=(f.infantNames&&f.infantNames[i])||'';
      var _dispN=n+(_inf?' + '+_inf:'');
      var isPIC=(i===0);
      var rowBg=isPIC?acFaint:'transparent';
      seatRows+='<tr style="background:'+rowBg+'">'
        +'<td style="'+TD+'font-weight:'+(isPIC?'700':'400')+';color:'+(isPIC?acCol:'#1a1a1a')+'">'+s.lbl+'</td>'
        +'<td style="'+TD+'">'+_dispN+'</td>'
        +'<td style="'+TD+'text-align:right">'+( w||'—')+'</td>'
        +'<td style="'+TD+'text-align:right">'+(b||'—')+'</td>'
        +'<td style="'+TD+'text-align:right">'+m.toFixed(0)+'</td>'
        +'</tr>';
    }
  });

  // W&B rows
  var wbRows='';
  if(r){
    var items=[
      ['Empty Weight',a.ew,false],['Crew',r.crewW,false],['Passengers',r.paxW,false],
      ['Cargo / Baggage',r.cargoW,false],['Zero Fuel Weight',r.zfw,true],
      ['+ Fuel',r.fuelW,false],['Ramp Weight',r.rampW,true],
      ['− Ground Burn',a.gndBurn,false],['Takeoff Weight',r.tow,true],
      ['− Flight Burn',r.burnKg,false],['Landing Weight',r.lw,true]
    ];
    items.forEach(function(it){
      var isTotal=it[2];
      var bg=isTotal?acFaint:'transparent';
      var fw=isTotal?'700':'400';
      var bl=isTotal?'border-left:3px solid '+acCol+';':'';
      wbRows+='<tr style="background:'+bg+'">'
        +'<td style="'+TD+bl+'font-weight:'+fw+'">'+it[0]+'</td>'
        +'<td style="'+TD+'text-align:right;font-weight:'+fw+'">'+it[1].toFixed(1)+' kg</td>'
        +'</tr>';
    });
  }

  // Cargo rows
  var cargoRows='';
  if(a.cargo&&a.cargo.length){
    a.cargo.forEach(function(zn,i){
      var w=(f.cargo&&f.cargo[i])||'';
      var m=((parseFloat(w)||0)*zn.arm).toFixed(0);
      if(w)cargoRows+='<tr><td style="'+TD+'">'+zn.lbl+'</td><td style="'+TD+'text-align:right">'+w+' kg</td><td style="'+TD+'text-align:right">'+m+'</td></tr>';
    });
  }

  // Limit boxes
  function limitBox(lbl,val,unit,ok,maxVal){
    var bc=ok?'#16a34a':'#dc2626';var vc=ok?'#15803d':'#b91c1c';
    return '<td style="border:2px solid '+bc+';border-radius:6px;padding:10px;text-align:center;width:33%;font-family:Arial,sans-serif">'
      +'<div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">'+lbl+'</div>'
      +'<div style="font-size:20px;font-weight:800;color:'+vc+'">'+val+'</div>'
      +'<div style="font-size:9px;color:#888;margin-top:2px">'+unit+'</div>'
      +'</td>';
  }

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>True South Flights — Loadsheet</title></head><body style="font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;margin:0;padding:20px;background:#fff">'

    // Header
    +'<div style="border-left:5px solid '+acCol+';padding:6px 14px;margin-bottom:14px">'
    +'<h1 style="margin:0;font-size:17px;font-weight:800;color:#111;font-family:Arial,sans-serif">TRUE SOUTH FLIGHTS — LOADSHEET</h1>'
    +'<div style="font-size:10px;color:#666;margin-top:3px;font-family:Arial,sans-serif">'+a.doc+' &nbsp;|&nbsp; Generated '+new Date().toLocaleString('en-NZ')+'</div>'
    +'</div>'

    // Status
    +'<div style="padding:10px 14px;border:2px solid '+statusBorder+';border-radius:6px;background:'+statusBg+';color:'+statusColor+';font-weight:800;font-size:13px;margin-bottom:14px;font-family:Arial,sans-serif;letter-spacing:.03em">'+status+'</div>'

    // Limit boxes
    +(r?'<table style="width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:14px"><tr>'
      +limitBox('Takeoff Weight',r.tow.toFixed(1)+' kg','max '+a.mtow+' kg',towOk)
      +limitBox('Landing Weight',r.lw.toFixed(1)+' kg','max '+a.mlw+' kg',lwOk)
      +limitBox('Centre of Gravity',r.towCog.toFixed(2)+'"',a.cogMin+'–'+a.cogMax+'"',cogOk)
      +'</tr></table>':'')

    // Two-col: Flight Details + W&B
    +'<table style="width:100%;border-collapse:collapse;margin-bottom:14px"><tr style="vertical-align:top">'
    +'<td style="width:50%;padding-right:8px;border:none">'
    +'<table style="width:100%;border-collapse:collapse">'
    +thRow('Flight Details',2)
    +'<tr><td style="'+TD+'color:#666;width:40%">Aircraft</td><td style="'+TD+'"><strong style="color:'+acCol+'">'+f.ac.replace('ZK-','')+' </strong>— '+a.type+'</td></tr>'
    +'<tr><td style="'+TD+'color:#666">PIC</td><td style="'+TD+'">'+f.pic+'</td></tr>'
    +'<tr><td style="'+TD+'color:#666">Co-Pilot</td><td style="'+TD+'">'+(f.coPilot||'—')+'</td></tr>'
    +(f.coPilot?'<tr><td colspan="2" style="'+TD+'font-size:10px;color:#888;font-style:italic">A staff member in the co-pilot seat does not automatically qualify as acting crew.</td></tr>':'')
    +'<tr><td style="'+TD+'color:#666">Date</td><td style="'+TD+'">'+f.date+'</td></tr>'
    +'<tr><td style="'+TD+'color:#666">ETD</td><td style="'+TD+'">'+(f.etd||'—')+'</td></tr>'
    +'<tr><td style="'+TD+'color:#666">From</td><td style="'+TD+'">'+(APTS[f.dep]||f.dep)+' ('+f.dep+')</td></tr>'
    +'<tr><td style="'+TD+'color:#666">To</td><td style="'+TD+'">'+(APTS[f.dest]||f.dest)+' ('+f.dest+')</td></tr>'
    +'</table></td>'
    +'<td style="width:50%;padding-left:8px;border:none">'
    +'<table style="width:100%;border-collapse:collapse">'
    +thRow('Weight & Balance',2)
    +wbRows
    +'</table></td></tr></table>'

    // Occupants
    +'<table style="width:100%;border-collapse:collapse;margin-bottom:14px">'
    +thRow('Occupants',5)
    +'<tr>'
    +'<th style="'+TH+'">Seat</th><th style="'+TH+'">Passenger</th>'
    +'<th style="'+TH+'text-align:right">Weight (kg)</th>'
    +'<th style="'+TH+'text-align:right">Bag (kg)</th>'
    +'<th style="'+TH+'text-align:right">Moment</th>'
    +'</tr>'
    +seatRows
    +'</table>'

    // Cargo
    +(cargoRows?'<table style="width:100%;border-collapse:collapse;margin-bottom:14px">'+thRow('Cargo',3)
      +'<tr><th style="'+TH+'">Zone</th><th style="'+TH+'text-align:right">Weight (kg)</th><th style="'+TH+'text-align:right">Moment</th></tr>'
      +cargoRows+'</table>':'')

    // Fuel
    +'<table style="width:100%;border-collapse:collapse;margin-bottom:14px">'
    +thRow('Fuel',2)
    +'<tr><td style="'+TD+'color:#666">Fuel at departure</td><td style="'+TD+'text-align:right">'+fuelKgV.toFixed(1)+' kg ('+fuelDisplay+' '+fuelU+')</td></tr>'
    +'<tr><td style="'+TD+'color:#666">Ground burn</td><td style="'+TD+'text-align:right">'+a.gndBurn+' kg</td></tr>'
    +'<tr><td style="'+TD+'color:#666">Flight burn</td><td style="'+TD+'text-align:right">'+(f.burnOff||a.burnDef)+' '+(a.burnDefUnit||'kg')+'</td></tr>'
    +'<tr style="background:'+acFaint+'"><td style="'+TD+'border-left:3px solid '+acCol+';font-weight:700">Fuel at destination</td><td style="'+TD+'text-align:right;font-weight:700">'+remDisplay+' '+fuelU+'</td></tr>'
    +'</table>'

    // Certification
    +'<table style="width:100%;border-collapse:collapse;margin-bottom:8px">'
    +thRow('PIC Certification',2)
    +'<tr><td colspan="2" style="'+TD+'font-style:italic;color:#444">I hereby certify that the particulars recorded on the above load sheet are correct'+(a.type&&a.type.includes('208')?' and Part 125 security measures have been followed':'')+'.</td></tr>'
    +(f.sig?'<tr><td style="'+TD+'color:#666;width:30%">Signature</td><td style="'+TD+'"><img src="'+f.sig+'" style="max-height:55px;border:1px solid #ccc;border-radius:3px;display:block;margin:4px 0"></td></tr>':'<tr><td style="'+TD+'color:#666">Signature</td><td style="'+TD+'padding:22px 8px">___________________________</td></tr>')
    +'<tr><td style="'+TD+'color:#666">Name</td><td style="'+TD+'">'+f.pic+'</td></tr>'
    +'<tr><td style="'+TD+'color:#666">Date</td><td style="'+TD+'">'+f.date+'</td></tr>'
    +'</table>'
    +'</body></html>';
}

function setupSig(){
  const c=document.getElementById('sigCanvas');if(!c)return;
  if(S.form.sig){const img=new Image();img.onload=()=>c.getContext('2d').drawImage(img,0,0,c.width,c.height);img.src=S.form.sig;}
  let drawing=false;
  const pos=e=>{const r=c.getBoundingClientRect(),s=e.touches?e.touches[0]:e,sx=c.width/r.width,sy=c.height/r.height;return{x:(s.clientX-r.left)*sx,y:(s.clientY-r.top)*sy};};
  c.onmousedown=c.ontouchstart=e=>{e.preventDefault();drawing=true;const p=pos(e);c.getContext('2d').beginPath();c.getContext('2d').moveTo(p.x,p.y);};
  c.onmousemove=c.ontouchmove=e=>{if(!drawing)return;e.preventDefault();const ctx=c.getContext('2d'),p=pos(e);ctx.lineWidth=2.5;ctx.lineCap='round';ctx.strokeStyle='#e2e8f0';ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y);};
  c.onmouseup=c.onmouseleave=c.ontouchend=()=>{if(drawing){drawing=false;S.form.sig=c.toDataURL();}};
}

// ── Admin handlers ──
window.toggleEndorse=function(type,checked){
  S.admin.crewDraftEndorse=S.admin.crewDraftEndorse||[];
  if(checked&&!S.admin.crewDraftEndorse.includes(type)) S.admin.crewDraftEndorse.push(type);
  else if(!checked) S.admin.crewDraftEndorse=S.admin.crewDraftEndorse.filter(e=>e!==type);
};
window.openPersonModal=async function(crewId,userId){
  crewId=(crewId&&crewId!=='null')?crewId:null;
  userId=(userId&&userId!=='null')?userId:null;
  // Fetch fresh data from Supabase before populating modal
  await reloadTable('ts_crew');
  await reloadTable('ts_users');
  const cr=crewId?S.crew.find(function(x){return x.id===crewId;}):null;
  const u=userId?S.users.find(function(x){return x.id===userId;}):null;
  S.admin.personModal={
    crewId:crewId||null,
    userId:userId||null,
    tab:'profile',
    draft:{
      n:cr?cr.n:(u?u.name:''),
      code:cr?cr.code||'':'',
      w:cr?(cr.w||u?.weight||''):(u?u.weight||'':''),
      dlNum:cr?cr.dlNum||'':'',
      caaNum:cr?cr.caaNum||'':'',
      medExpiry:cr?cr.medExpiry||'':'',
      ocaDue:cr?cr.ocaDue||'':'',
      firstAid:cr?cr.firstAid||'':'',
      avsecExpiry:cr?cr.avsecExpiry||'':'',
      endorse:cr?JSON.parse(JSON.stringify(cr.endorse||[])):[],
      photo:cr?cr.photo||'':'',
      email:u?u.email||'':'',
      role:u?u.role||'desk':'desk',
      isPilot:u?!!u.isPilot:false,
      password:'',
    }
  };
  S.admin.err='';
  render();
};

window.personPhotoUpload=function(input){
  const file=input.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=function(e){
    const img=new Image();
    img.onload=function(){
      const canvas=document.createElement('canvas');
      const MAX=200;
      let w=img.width,h=img.height;
      if(w>h){if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}}else{if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}}
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      S.admin.personModal.draft.photo=canvas.toDataURL('image/jpeg',0.75);
      render();
    };
    img.src=e.target.result;
  };
  r.readAsDataURL(file);
};

window.savePerson=async function(){
  const m=S.admin.personModal;if(!m)return;
  const d=m.draft;
  const name=(d.n||'').trim();
  const isAdmin=S.user?.role==='admin'||S.user?.role==='superadmin'||S.user?.superAdmin;
  // Validate
  if(!name&&!d.email){S.admin.err='Name is required.';render();return;}
  const finalName=name||(d.email?d.email.split('@')[0]:'');
  // Check duplicate email
  if(d.email){
    const dupUser=S.users.find(function(x){return x.email.toLowerCase()===d.email.toLowerCase()&&x.id!==m.userId;});
    if(dupUser){S.admin.err='That email is already used by another account.';render();return;}
  }

  // ── Save crew record ──
  let crewId=m.crewId;
  if(crewId||finalName){
    crewId=crewId||('c_'+Date.now());
    const crewRec={id:crewId,n:finalName,w:parseFloat(d.w)||0,endorse:d.endorse||[],
      code:d.code||'',dlNum:d.dlNum||'',caaNum:d.caaNum||'',
      medExpiry:d.medExpiry||'',ocaDue:d.ocaDue||'',firstAid:d.firstAid||'',
      avsecExpiry:d.avsecExpiry||'',photo:d.photo||''};
    const existIdx=S.crew.findIndex(function(cr){return cr.id===crewId;});
    if(existIdx>=0) S.crew[existIdx]=crewRec;else S.crew.push(crewRec);
    lsSet('ts_crew_cache',S.crew);
    if(d.photo) lsSet('ts_crew_photo_'+crewId,d.photo);
    {
      const fullR=await sbU('ts_crew',[{id:crewId,name:finalName,weight:parseFloat(d.w)||null,
        endorsements:JSON.stringify(d.endorse||[]),code:d.code||'',dl_num:d.dlNum||'',
        caa_license:d.caaNum||'',medical_expiry:d.medExpiry||null,oca_due:d.ocaDue||null,
        first_aid:d.firstAid||null,avsec_expiry:d.avsecExpiry||null,photo:d.photo||''}]);
      if(!fullR){
        // Full upsert failed (likely missing columns) — retry with minimal safe payload
        const minR=await sbU('ts_crew',[{id:crewId,name:finalName,weight:parseFloat(d.w)||null,
          endorsements:JSON.stringify(d.endorse||[]),code:d.code||'',dl_num:d.dlNum||'',
          caa_license:d.caaNum||'',medical_expiry:d.medExpiry||null,oca_due:d.ocaDue||null}]);
        if(!minR) toast('Warning: profile may not have saved to server — check connection','warn');
      }
    }
  }

  // ── Save user record (only if email present OR already has userId) ──
  let userId=m.userId;
  if(userId||(d.email&&(isAdmin||userId===S.user?.id))){
    if(d.email){
      userId=userId||('u_'+Date.now());
      const existing=S.users.find(function(x){return x.id===userId;});
      const userRec=existing
        ?{...existing,name:finalName,email:d.email,role:isAdmin?(d.role||existing.role):existing.role,isPilot:isAdmin?!!d.isPilot:existing?.isPilot||false,linkedCrew:finalName,weight:parseFloat(d.w)||existing?.weight||0}
        :{id:userId,name:finalName,email:d.email,role:d.role||'desk',isPilot:!!d.isPilot,linkedCrew:finalName,passwordHash:'',weight:parseFloat(d.w)||0};
      if(d.password) userRec.passwordHash=await hashPw(d.password);
      else if(!existing&&!d.password){toast('Password required for new login account','warn');return;}
      const confPwEl=document.getElementById('pm_confpw');
      if(!existing&&confPwEl&&confPwEl.value&&confPwEl.value!==d.password){S.admin.err='Passwords do not match.';render();return;}
      if(userId===S.user?.id){S.user={...S.user,...userRec};sessionStorage.setItem('ts_user',JSON.stringify(S.user));}
      const uIdx=S.users.findIndex(function(x){return x.id===userId;});
      if(uIdx>=0) S.users[uIdx]=userRec;else S.users.push(userRec);
      lsSet('ts_users_cache',S.users);
      // Two-tier upsert: full payload first, minimal fallback if columns missing
      const fullUR=await sbU('ts_users',[{id:userRec.id,name:userRec.name,email:userRec.email,role:userRec.role,
        linked_crew:userRec.linkedCrew,password_hash:userRec.passwordHash,weight:userRec.weight||0,is_pilot:!!userRec.isPilot}]);
      if(!fullUR){
        const minUR=await sbU('ts_users',[{id:userRec.id,name:userRec.name,email:userRec.email,
          role:userRec.role,linked_crew:userRec.linkedCrew,password_hash:userRec.passwordHash}]);
        if(!minUR) toast('Warning: account may not have saved to server — check connection','warn');
      }
    }
  }

  S.admin.personModal=null;S.admin.err='';S.admin.pwMsg=null;
  toast(finalName+' saved','ok');
  // Reload crew + users from Supabase to confirm save and refresh all viewers
  Promise.all([reloadTable('ts_crew'),reloadTable('ts_users')]).then(function(){render();});
  // Broadcast crew update to all connected devices
  if(_rtWs&&_rtWs.readyState===1){
    _rtRef++;
    _rtWs.send(JSON.stringify({topic:'realtime:ts-fms',event:'broadcast',
      payload:{type:'broadcast',event:'crew_update',payload:{updatedBy:S.user?.id}},
      ref:String(_rtRef)}));
  }
  render();
};

window.deletePerson=async function(crewId,userId){
  if(!confirm('Delete this person? This cannot be undone.'))return;
  if(crewId){S.crew=S.crew.filter(function(cr){return cr.id!==crewId;});lsSet('ts_crew_cache',S.crew);await sbDel('ts_crew',crewId);}
  if(userId){S.users=S.users.filter(function(u){return u.id!==userId;});lsSet('ts_users_cache',S.users);await sbDel('ts_users',userId);}
  S.admin.personModal=null;S.admin.err='';
  render();
};


window.saveAircraftDraft=async()=>{
  const d=S.admin.acDraft;if(!d)return;
  if(!d.ew||!d.mtow||!d.mlw){S.admin.acErr='Empty weight, MTOW and max landing required.';render();return;}
  if(d.cogMin>=d.cogMax){S.admin.acErr='C of G min must be less than max.';render();return;}
  S.aircraft[S.admin.acSel]=dc(d);S.admin.acDraft=null;S.admin.acSaved=true;lsSet('ts_aircraft_cache',S.aircraft);render();
  await sbU('ts_aircraft',[{id:d.id,data:d}]);
};
window.saveCharterRates=async()=>{
  lsSet('ts_charter_rates_cache',S.charterRates);
  lsSet('ts_charter_wait_rate',S.charterWaitRate);
  const rows=Object.entries(S.charterRates).map(([acId,rates])=>({id:acId,acId,rates}));
  await sbU('ts_charter_rates',rows);
  // Also persist wait rate to Supabase so all devices stay in sync
  await sbU('ts_settings',[{key:'charter_wait_rate',value:String(S.charterWaitRate||150)}]).catch(function(){});
};

// ── Pilot weight update ──
window.updateMyWeight=async w=>{
  const wn=parseFloat(w);if(!wn||wn<30||wn>250){alert('Enter a valid weight.');return;}
  const linked=S.user?.linkedCrew;if(!linked){toast('No crew record linked to your account.','err');return;}
  const c=S.crew.find(x=>x.n===linked);if(!c){toast('Crew record not found.','err');return;}
  c.w=wn;render();
  await sbU('ts_crew',[{id:c.id,name:c.n,weight:wn}]);
  toast('Weight updated.','ok');
};

// ── Runtime modules (need S) ──
window.forceUploadAll=async function(){
  if(!S.gdriveEnabled||!S.gdriveClientId){toast('Google Drive not configured in Admin.','err');return;}
  const pending=S.saved.filter(function(s){return s.status==='complete'&&!s.driveUploaded;});
  if(!pending.length){toast('No new signed loadsheets to upload.','info');return;}
  S.uploadProgress='Authorising Drive…';render();
  // Get OAuth token ONCE and reuse for all uploads
  var sharedToken;
  try{
    sharedToken=await new Promise(function(resolve,reject){
      function init(){
        google.accounts.oauth2.initTokenClient({
          client_id:S.gdriveClientId,
          scope:'https://www.googleapis.com/auth/drive',
          callback:function(r){if(r.error)reject(new Error(r.error));else resolve(r.access_token);}
        }).requestAccessToken();
      }
      if(window.google&&window.google.accounts&&window.google.accounts.oauth2){init();}
      else{var s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=init;s.onerror=function(e){reject(new Error('Failed to load Google sign-in library'));};document.head.appendChild(s);}
    });
  }catch(e){S.uploadProgress=null;toast('Google sign-in failed: '+e.message,'err');render();return;}
  S.uploadProgress='Uploading '+pending.length+' loadsheet(s)…';render();
  var ok=0,fail=0;
  for(var _i=0;_i<pending.length;_i++){
    var _sheet=pending[_i];
    try{
      await uploadToDrive(_sheet,sharedToken);
      ok++;
      S.uploadProgress='Uploaded '+ok+'/'+pending.length+'…';render();
    }catch(_e){fail++;console.error('Upload failed:',_sheet.id,_e);}
  }
  lsSet('ts_loadsheets_cache',S.saved);
  S.driveLastUpload=new Date().toLocaleString('en-NZ');lsSet('ts_drive_last_upload',S.driveLastUpload);
  S.uploadProgress=null;
  toast('Drive upload: '+ok+' uploaded'+(fail?' ('+fail+' failed)':''),'ok');render();
};
(function(){
  function msTo1159(){var n=new Date(),t=new Date(n);t.setHours(23,59,0,0);if(t<=n)t.setDate(t.getDate()+1);return t-n;}
  function daily(){
    if(S.gdriveEnabled&&S.gdriveClientId){
      var last=lsGet('ts_drive_last_upload');
      if(!last||new Date(last).toDateString()!==new Date().toDateString()){window.forceUploadAll&&window.forceUploadAll();}
    }
    setTimeout(daily,24*60*60*1000);
  }
  setTimeout(daily,msTo1159());
})();

// ── MAINTENANCE MODULE ──
// Seed data from spreadsheet import
const MAINT_SEED={"hist":[{"date":"2025-06-10","ZK-SLB":11901.0,"ZK-SLD":7975.7,"ZK-SLQ":7141.3},{"date":"2025-06-12","ZK-SLA":3365.0,"ZK-SLD":7976.9,"ZK-SDB":18312.1},{"date":"2025-06-13","ZK-SLD":7979.3},{"date":"2025-06-14","ZK-SLD":7980.5,"ZK-SLQ":7143.4,"ZK-SDB":18313.3},{"date":"2025-06-15","ZK-SLA":3366.1},{"date":"2025-06-17","ZK-SLA":3368.0,"ZK-SLD":7981.9,"ZK-SLQ":7149.2,"ZK-SDB":18315.5},{"date":"2025-06-18","ZK-SLA":3371.1,"ZK-SLQ":7151.0,"ZK-SDB":18316.5},{"date":"2025-06-21","ZK-SLA":3374.4,"ZK-SLQ":7155.7,"ZK-SDB":18317.6},{"date":"2025-06-23","ZK-SLA":3377.0,"ZK-SLQ":7158.7,"ZK-SDB":18320.6},{"date":"2025-06-24","ZK-SDB":18321.5},{"date":"2025-06-26","ZK-SLD":7982.2},{"date":"2025-06-27","ZK-SLB":11902.2,"ZK-SLD":7984.6,"ZK-SLQ":7160.0},{"date":"2025-06-29","ZK-SLB":11905.0,"ZK-SLD":7985.8,"ZK-SLQ":7162.4,"ZK-SDB":18323.0},{"date":"2025-06-30","ZK-SLA":3380.9,"ZK-SLB":11906.0,"ZK-SLD":7987.1,"ZK-SLQ":7164.3,"ZK-SDB":18324.0},{"date":"2025-07-01","ZK-SLA":3382.0,"ZK-SLB":11907.0,"ZK-SLQ":7167.0,"ZK-SDB":18325.2},{"date":"2025-07-02","ZK-SLA":3382.9,"ZK-SLB":11908.0,"ZK-SLD":7988.3,"ZK-SLQ":7169.0,"ZK-SDB":18326.3},{"date":"2025-07-04","ZK-SLA":3383.9,"ZK-SLB":11909.0,"ZK-SLD":7991.8,"ZK-SLQ":7172.6,"ZK-SDB":18327.4},{"date":"2025-07-05","ZK-SLA":3384.9,"ZK-SLB":11910.9,"ZK-SLD":7993.5,"ZK-SLQ":7174.9},{"date":"2025-07-06","ZK-SLD":7994.6},{"date":"2025-07-07","ZK-SLA":3386.9,"ZK-SLB":1191.3,"ZK-SLD":7996.2,"ZK-SDB":18329.4},{"date":"2025-07-08","ZK-SLA":3389.7,"ZK-SLB":11911.3,"ZK-SLD":7999.4,"ZK-SLQ":7175.9,"ZK-SDB":18330.4},{"date":"2025-07-10","ZK-SLD":8001.3},{"date":"2025-07-11","ZK-SLA":3390.8,"ZK-SLB":11913.8,"ZK-SLD":8002.5},{"date":"2025-07-14","ZK-SLA":3394.2,"ZK-SLB":11916.4,"ZK-SLD":8003.8},{"date":"2025-07-15","ZK-SLD":8005.7},{"date":"2025-07-16","ZK-SLA":3396.2,"ZK-SLB":11919.3,"ZK-SLD":8009.0,"ZK-SDB":18333.2},{"date":"2025-07-17","ZK-SLA":3398.1,"ZK-SLB":11921.3,"ZK-SLD":8010.7,"ZK-SDB":18334.3},{"date":"2025-07-18","ZK-SLD":8014.5},{"date":"2025-07-19","ZK-SLA":3399.3,"ZK-SLB":11923.2,"ZK-SLD":8015.6,"ZK-SDB":18336.5},{"date":"2025-07-20","ZK-SLA":3400.3,"ZK-SLB":11924.5,"ZK-SLD":8018.6,"ZK-SDB":18337.5},{"date":"2025-07-21","ZK-SLA":3401.3,"ZK-SLB":11925.6,"ZK-SLD":8020.4,"ZK-SDB":18338.4},{"date":"2025-07-22","ZK-SLA":3403.2,"ZK-SLB":11926.5,"ZK-SLD":8022.2},{"date":"2025-07-23","ZK-SLA":3404.2,"ZK-SLB":11928.6},{"date":"2025-07-24","ZK-SLA":3405.3,"ZK-SLB":11932.1,"ZK-SLD":8025.6,"ZK-SLQ":7177.2},{"date":"2025-07-25","ZK-SLA":3406.3,"ZK-SLB":11933.2,"ZK-SLD":8027.0,"ZK-SLQ":7178.6},{"date":"2025-07-27","ZK-SLA":3407.3,"ZK-SLD":8029.6,"ZK-SLQ":7180.1},{"date":"2025-07-28","ZK-SLA":3408.3,"ZK-SLB":11934.4,"ZK-SLD":8030.3,"ZK-SLQ":7180.4},{"date":"2025-07-29","ZK-SLB":11935.5},{"date":"2025-07-30","ZK-SLA":3410.3,"ZK-SLB":11936.5,"ZK-SLD":8032.4,"ZK-SDB":18339.3},{"date":"2025-07-31","ZK-SLA":3411.3,"ZK-SLB":11938.3,"ZK-SLD":8034.9,"ZK-SLQ":7180.7},{"date":"2025-08-01","ZK-SLA":3412.4,"ZK-SLB":11940.2,"ZK-SLD":8037.1,"ZK-SDB":18340.2},{"date":"2025-08-02","ZK-SLA":3413.6,"ZK-SLB":11941.4,"ZK-SLD":8038.2,"ZK-SLQ":7183.1,"ZK-SDB":18341.6},{"date":"2025-08-03","ZK-SLB":11944.5,"ZK-SLD":8040.7,"ZK-SLQ":7185.2,"ZK-SDB":18342.6},{"date":"2025-08-04","ZK-SLA":3416.5,"ZK-SLB":11946.4,"ZK-SDB":18343.7},{"date":"2025-08-05","ZK-SLA":3417.5,"ZK-SLB":11947.5,"ZK-SLD":8043.4,"ZK-SLQ":7186.4,"ZK-SDB":18344.7},{"date":"2025-08-06","ZK-SLD":8045.7},{"date":"2025-08-08","ZK-SLA":3419.0,"ZK-SLD":8048.0,"ZK-SLQ":7188.0},{"date":"2025-08-09","ZK-SLA":3420.2,"ZK-SLB":11950.0,"ZK-SLQ":7189.4},{"date":"2025-08-10","ZK-SLB":11952.0,"ZK-SLD":8050.2,"ZK-SLQ":7190.6},{"date":"2025-08-11","ZK-SLA":3423.4,"ZK-SDB":18345.9},{"date":"2025-08-12","ZK-SLA":3425.7,"ZK-SLD":8054.8,"ZK-SLQ":7195.4,"ZK-SDB":18346.9},{"date":"2025-08-13","ZK-SLA":3428.4,"ZK-SLB":11953.2,"ZK-SLD":8056.7,"ZK-SLQ":7196.7,"ZK-SDB":18347.9},{"date":"2025-08-14","ZK-SLB":11953.9,"ZK-SLD":8059.1},{"date":"2025-08-15","ZK-SLA":3430.1,"ZK-SLQ":7201.1},{"date":"2025-08-16","ZK-SLD":8060.8},{"date":"2025-08-17","ZK-SLD":8062.5},{"date":"2025-08-19","ZK-SLQ":7201.9},{"date":"2025-08-20","ZK-SLA":3433.0,"ZK-SLB":11956.7,"ZK-SLD":8064.7,"ZK-SLQ":7204.0},{"date":"2025-08-21","ZK-SLA":3435.7,"ZK-SLB":11959.6,"ZK-SLD":8067.1,"ZK-SLQ":7205.4},{"date":"2025-08-22","ZK-SLA":3438.4,"ZK-SLD":8070.1,"ZK-SLQ":7207.3},{"date":"2025-08-23","ZK-SLA":3440.4,"ZK-SLD":8072.4,"ZK-SLQ":7209.5},{"date":"2025-08-24","ZK-SLA":3443.2,"ZK-SLD":8073.7,"ZK-SLQ":7211.0},{"date":"2025-08-25","ZK-SLA":3444.3,"ZK-SLD":8075.8,"ZK-SLQ":7213.3},{"date":"2025-08-26","ZK-SLA":3446.2,"ZK-SLB":11961.7,"ZK-SLD":8077.1,"ZK-SLQ":7214.5},{"date":"2025-08-31","ZK-SLA":3447.2,"ZK-SLB":11962.6,"ZK-SLQ":7214.9,"ZK-SDB":18348.9},{"date":"2025-09-02","ZK-SLA":3448.4,"ZK-SLB":11963.8,"ZK-SLQ":7216.3,"ZK-SDB":18350.0},{"date":"2025-09-03","ZK-SLA":3449.5,"ZK-SLB":11964.8,"ZK-SLQ":7218.9,"ZK-SDB":18351.1},{"date":"2025-09-06","ZK-SLA":3450.6,"ZK-SLB":11966.0,"ZK-SLQ":7220.1,"ZK-SDB":18352.2},{"date":"2025-09-07","ZK-SLA":3451.9,"ZK-SLB":11967.1,"ZK-SLQ":7222.1},{"date":"2025-09-08","ZK-SLA":3454.8,"ZK-SLB":11970.0,"ZK-SLQ":7225.4,"ZK-SDB":18354.0},{"date":"2025-09-11","ZK-SLA":3456.8,"ZK-SLQ":7227.1,"ZK-SDB":8355.2},{"date":"2025-09-12","ZK-SLA":3458.7,"ZK-SLQ":7227.4},{"date":"2025-09-13","ZK-SLQ":7228.1},{"date":"2025-09-14","ZK-SLA":3460.0,"ZK-SLB":11973.6,"ZK-SLQ":7229.4,"ZK-SDB":18356.3},{"date":"2025-09-17","ZK-SLQ":7231.1},{"date":"2025-09-18","ZK-SLB":11974.3},{"date":"2025-09-19","ZK-SLA":3465.0,"ZK-SLB":11978.0,"ZK-SLQ":7235.6,"ZK-SDB":18359.1},{"date":"2025-09-23","ZK-SLA":3467.7,"ZK-SLB":11980.8,"ZK-SLQ":7236.6,"ZK-SDB":18361.9},{"date":"2025-09-24","ZK-SLA":3469.5,"ZK-SLD":8077.9,"ZK-SLQ":7236.9},{"date":"2025-09-25","ZK-SLA":3470.6,"ZK-SLD":8079.3,"ZK-SDB":18362.9},{"date":"2025-09-26","ZK-SLB":11982.9},{"date":"2025-09-29","ZK-SLA":3470.8,"ZK-SLD":8080.8},{"date":"2025-09-30","ZK-SLB":11983.4},{"date":"2025-10-01","ZK-SLB":11987.4,"ZK-SLD":8085.7,"ZK-SLQ":7239.5,"ZK-SDB":18367.0},{"date":"2025-10-02","ZK-SLB":11988.5,"ZK-SLD":8087.0},{"date":"2025-10-03","ZK-SLA":3473.1,"ZK-SLB":11992.3,"ZK-SLD":8090.2,"ZK-SLQ":7243.8,"ZK-SDB":18369.5},{"date":"2025-10-04","ZK-SLQ":7245.9},{"date":"2025-10-06","ZK-SLB":11994.4,"ZK-SLD":8092.7,"ZK-SDB":18372.3},{"date":"2025-10-10","ZK-SLA":3475.3,"ZK-SLB":11995.5,"ZK-SLD":8095.2,"ZK-SLQ":7247.6},{"date":"2025-10-14","ZK-SLA":3479.3,"ZK-SLB":11999.4,"ZK-SLD":8100.0,"ZK-SLQ":7250.4},{"date":"2025-10-28","ZK-SLB":12002.5,"ZK-SLD":8103.7,"ZK-SLQ":7252.7},{"date":"2025-10-29","ZK-SLA":3486.1,"ZK-SLB":12006.7,"ZK-SLD":8107.7,"ZK-SLQ":7254.9},{"date":"2025-11-01","ZK-SLD":8116.5},{"date":"2025-11-02","ZK-SLA":3494.3,"ZK-SLD":8118.1},{"date":"2025-11-03","ZK-SLA":3496.5,"ZK-SLB":12016.7,"ZK-SLQ":7262.0},{"date":"2025-11-04","ZK-SLB":12017.5},{"date":"2025-11-05","ZK-SLB":12021.1,"ZK-SLD":8126.9},{"date":"2025-11-07","ZK-SLA":3504.4,"ZK-SLB":12025.1,"ZK-SLD":8133.0,"ZK-SLQ":7267.4},{"date":"2025-11-09","ZK-SLA":3509.3,"ZK-SLQ":7272.9},{"date":"2025-11-11","ZK-SLA":3513.2,"ZK-SLB":12029.5,"ZK-SLD":8137.8,"ZK-SLQ":7275.8},{"date":"2025-11-12","ZK-SLB":12032.3,"ZK-SLD":8140.3,"ZK-SLQ":7276.1},{"date":"2025-11-13","ZK-SLA":3519.2,"ZK-SLB":12036.1,"ZK-SLD":8143.1},{"date":"2025-11-14","ZK-SLD":8143.6},{"date":"2025-11-15","ZK-SLA":3520.6,"ZK-SLB":12039.4,"ZK-SLD":8145.2,"ZK-SLQ":7277.7},{"date":"2025-11-16","ZK-SLA":3524.4,"ZK-SLB":12043.9,"ZK-SLD":8148.0,"ZK-SLQ":7280.0},{"date":"2025-11-19","ZK-SLA":3528.7,"ZK-SLB":12047.8,"ZK-SLD":8150.9,"ZK-SLQ":7282.8},{"date":"2025-11-20","ZK-SLA":3532.4,"ZK-SLB":12051.2,"ZK-SLD":8155.0,"ZK-SLQ":7284.7},{"date":"2025-11-22","ZK-SLA":3536.6,"ZK-SLB":12055.3,"ZK-SLD":8157.1,"ZK-SLQ":7287.1},{"date":"2025-11-23","ZK-SLA":3540.7,"ZK-SLB":12056.6,"ZK-SLD":8159.5,"ZK-SLQ":7292.2},{"date":"2025-11-24","ZK-SLA":3543.5,"ZK-SLD":8164.4},{"date":"2025-11-25","ZK-SLA":3547.9,"ZK-SLD":8170.0,"ZK-SLQ":7302.0},{"date":"2025-11-26","ZK-SLD":8170.6},{"date":"2025-11-28","ZK-SLA":3551.4,"ZK-SLD":8175.0,"ZK-SLQ":7303.1},{"date":"2025-12-02","ZK-SLA":3555.2,"ZK-SLD":8180.0,"ZK-SLQ":7307.7},{"date":"2025-12-03","ZK-SLA":3556.3,"ZK-SLD":8181.2,"ZK-SLQ":7309.9},{"date":"2025-12-04","ZK-SLA":3559.7,"ZK-SLQ":7312.3},{"date":"2025-12-06","ZK-SLQ":7317.6},{"date":"2025-12-08","ZK-SLA":3568.2,"ZK-SLB":12056.9,"ZK-SLD":8181.5,"ZK-SLQ":7320.4},{"date":"2025-12-09","ZK-SLA":3572.2,"ZK-SLQ":7324.2},{"date":"2025-12-10","ZK-SLB":12063.9,"ZK-SLD":8181.8,"ZK-SLQ":7326.4},{"date":"2025-12-11","ZK-SLB":12065.0,"ZK-SLD":8185.3,"ZK-SLQ":7328.9},{"date":"2025-12-12","ZK-SLB":12066.1,"ZK-SLD":8188.2,"ZK-SLQ":7331.7},{"date":"2025-12-13","ZK-SLA":3576.6,"ZK-SLB":12067.2,"ZK-SLD":8190.5,"ZK-SLQ":7332.9},{"date":"2025-12-14","ZK-SLA":3577.9,"ZK-SLD":8194.1,"ZK-SLQ":7335.9},{"date":"2025-12-16","ZK-SLB":12068.7},{"date":"2025-12-17","ZK-SLA":3581.9,"ZK-SLD":8199.0},{"date":"2025-12-18","ZK-SLA":3584.7,"ZK-SLB":12069.0,"ZK-SLD":8203.8,"ZK-SLQ":7343.9},{"date":"2025-12-20","ZK-SLB":12073.3,"ZK-SLD":8206.8,"ZK-SLQ":7347.0},{"date":"2025-12-21","ZK-SLA":3593.0,"ZK-SLB":12077.1,"ZK-SLD":8211.9,"ZK-SLQ":7351.6},{"date":"2025-12-22","ZK-SLA":3594.2,"ZK-SLB":12078.2,"ZK-SLD":8214.1,"ZK-SLQ":7352.8},{"date":"2025-12-23","ZK-SLA":3597.0,"ZK-SLB":12081.0,"ZK-SLD":8218.5,"ZK-SLQ":7355.5},{"date":"2025-12-27","ZK-SLA":3601.1,"ZK-SLB":12085.3,"ZK-SLD":8222.8,"ZK-SLQ":7360.4},{"date":"2025-12-28","ZK-SLA":3604.9,"ZK-SLB":12089.0,"ZK-SLD":8225.7,"ZK-SLQ":7365.9},{"date":"2025-12-29","ZK-SLA":3608.8,"ZK-SLB":12092.2,"ZK-SLD":8230.3,"ZK-SLQ":7370.4},{"date":"2025-12-30","ZK-SLA":3615.1},{"date":"2025-12-31","ZK-SLA":3619.7,"ZK-SLB":12095.6,"ZK-SLD":8235.8,"ZK-SLQ":7373.0},{"date":"2026-01-01","ZK-SLB":12099.4,"ZK-SLD":8240.3},{"date":"2026-01-02","ZK-SLA":3625.5,"ZK-SLD":8241.9},{"date":"2026-01-03","ZK-SLB":12103.3,"ZK-SLD":8246.9,"ZK-SLQ":7375.7},{"date":"2026-01-04","ZK-SLB":12104.3,"ZK-SLD":8249.5,"ZK-SLQ":7377.1},{"date":"2026-01-05","ZK-SLB":12107.1,"ZK-SLD":8254.2,"ZK-SLQ":7378.1},{"date":"2026-01-06","ZK-SLA":3643.2,"ZK-SLD":8257.7},{"date":"2026-01-07","ZK-SLB":12109.9,"ZK-SLD":8259.5,"ZK-SLQ":7381.5},{"date":"2026-01-08","ZK-SLA":3645.0},{"date":"2026-01-09","ZK-SLA":3649.4,"ZK-SLB":12114.2,"ZK-SLD":8263.6,"ZK-SLQ":7386.7},{"date":"2026-01-12","ZK-SLA":3654.1,"ZK-SLB":12118.9,"ZK-SLD":8269.1,"ZK-SLQ":7389.7},{"date":"2026-01-13","ZK-SLD":8272.6,"ZK-SLQ":7391.3},{"date":"2026-01-14","ZK-SLA":3657.8,"ZK-SLB":12123.8,"ZK-SLD":8276.0,"ZK-SLQ":7395.4},{"date":"2026-01-15","ZK-SLA":3661.6,"ZK-SLB":12127.7,"ZK-SLD":8277.3,"ZK-SLQ":7396.8},{"date":"2026-01-16","ZK-SLA":3663.6,"ZK-SLB":12129.6,"ZK-SLD":8278.7,"ZK-SLQ":7400.4},{"date":"2026-01-17","ZK-SLA":3664.6,"ZK-SLB":12131.6,"ZK-SLD":8280.0,"ZK-SLQ":7403.9},{"date":"2026-01-18","ZK-SLA":3666.5,"ZK-SLB":12135.4,"ZK-SLD":8281.2,"ZK-SLQ":7406.2},{"date":"2026-01-19","ZK-SLA":3670.0,"ZK-SLB":12139.4,"ZK-SLQ":7410.5},{"date":"2026-01-20","ZK-SLB":12143.3,"ZK-SLQ":7413.2},{"date":"2026-01-21","ZK-SLA":3674.5,"ZK-SLB":12146.5,"ZK-SLQ":7414.3},{"date":"2026-01-22","ZK-SLB":12149.6,"ZK-SLD":8285.1,"ZK-SLQ":7417.5},{"date":"2026-01-23","ZK-SLB":12151.0,"ZK-SLQ":7419.0},{"date":"2026-01-24","ZK-SLB":12152.2,"ZK-SLD":8289.9,"ZK-SLQ":7423.2},{"date":"2026-01-25","ZK-SLB":12153.3},{"date":"2026-01-26","ZK-SLB":12157.1},{"date":"2026-01-27","ZK-SLD":8302.6,"ZK-SLQ":7429.2},{"date":"2026-01-28","ZK-SLB":12165.6,"ZK-SLQ":7430.7},{"date":"2026-01-29","ZK-SLB":12166.0,"ZK-SLD":8309.7},{"date":"2026-01-30","ZK-SLA":3682.7,"ZK-SLB":12170.5,"ZK-SLD":8314.6,"ZK-SLQ":7433.0},{"date":"2026-01-31","ZK-SLA":3684.9,"ZK-SLB":12173.8,"ZK-SLD":8317.3,"ZK-SLQ":7435.1},{"date":"2026-02-01","ZK-SLQ":7436.8},{"date":"2026-02-02","ZK-SLD":8321.7},{"date":"2026-02-03","ZK-SLA":3685.5},{"date":"2026-02-04","ZK-SLA":3690.2,"ZK-SLB":12181.6,"ZK-SLD":8326.2,"ZK-SLQ":7440.2},{"date":"2026-02-05","ZK-SLA":3694.3,"ZK-SLB":12187.1,"ZK-SLD":8329.7,"ZK-SLQ":7443.3},{"date":"2026-02-06","ZK-SLB":12190.2,"ZK-SLD":8331.4,"ZK-SLQ":7447.5},{"date":"2026-02-07","ZK-SLD":8331.8},{"date":"2026-02-08","ZK-SLA":3701.9,"ZK-SLB":12195.3,"ZK-SLD":8336.6,"ZK-SLQ":7452.2},{"date":"2026-02-09","ZK-SLA":3708.2,"ZK-SLB":12200.7,"ZK-SLD":8341.6,"ZK-SLQ":7454.6,"ZK-SDB":18701.9},{"date":"2026-02-10","ZK-SDB":18706.8},{"date":"2026-02-11","ZK-SLB":12203.5,"ZK-SLD":8345.0,"ZK-SLQ":7457.0,"ZK-SDB":18707.7},{"date":"2026-02-12","ZK-SLA":3715.1,"ZK-SLB":12207.5,"ZK-SLD":8347.8,"ZK-SLQ":7461.9,"ZK-SDB":18709.9},{"date":"2026-02-13","ZK-SLA":3716.1,"ZK-SLB":12208.4,"ZK-SLD":8349.1,"ZK-SLQ":7464.4,"ZK-SDB":18710.8},{"date":"2026-02-14","ZK-SLB":12209.9},{"date":"2026-02-15","ZK-SLA":3719.8,"ZK-SLB":12213.5,"ZK-SLD":8351.4,"ZK-SLQ":7469.3,"ZK-SDB":18714.5},{"date":"2026-02-16","ZK-SLA":3722.0,"ZK-SLB":12216.7,"ZK-SLD":8353.8,"ZK-SDB":18715.3},{"date":"2026-02-17","ZK-SLB":12221.1,"ZK-SLD":8356.2,"ZK-SLQ":7472.0,"ZK-SDB":18718.1},{"date":"2026-02-18","ZK-SLA":3730.0,"ZK-SLD":8359.8,"ZK-SLQ":7472.4,"ZK-SDB":18722.3},{"date":"2026-02-19","ZK-SLA":3731.1,"ZK-SLB":12226.4},{"date":"2026-02-20","ZK-SLQ":7472.8},{"date":"2026-02-21","ZK-SLA":3732.2,"ZK-SLD":8363.1,"ZK-SLQ":7474.0},{"date":"2026-02-22","ZK-SLA":3736.7,"ZK-SLB":12235.3,"ZK-SLD":8368.9,"ZK-SLQ":7478.8,"ZK-SDB":18726.4},{"date":"2026-02-23","ZK-SLA":3739.8,"ZK-SLB":12238.3,"ZK-SLD":8372.6,"ZK-SLQ":7481.1,"ZK-SDB":18729.5},{"date":"2026-02-24","ZK-SLA":3743.7,"ZK-SLB":12242.4,"ZK-SLD":8377.2,"ZK-SLQ":7486.3,"ZK-SDB":18733.2},{"date":"2026-02-25","ZK-SLA":3747.9,"ZK-SLB":12246.4,"ZK-SLD":8381.8,"ZK-SLQ":7489.6,"ZK-SDB":18735.3},{"date":"2026-02-27","ZK-SLA":3751.9,"ZK-SLB":12250.5,"ZK-SLD":8382.1,"ZK-SLQ":7493.1,"ZK-SDB":18738.2},{"date":"2026-02-28","ZK-SLA":3755.8,"ZK-SLB":12254.5,"ZK-SLQ":7496.6,"ZK-SDB":18740.0},{"date":"2026-03-01","ZK-SLA":3758.3,"ZK-SLB":12259.1,"ZK-SLD":8382.1},{"date":"2026-03-02","ZK-SLA":3760.5,"ZK-SLB":12259.4,"ZK-SLQ":7504.7,"ZK-SDB":18741.2},{"date":"2026-03-03","ZK-SLA":3765.1,"ZK-SLQ":7509.0,"ZK-SDB":18744.9},{"date":"2026-03-04","ZK-SLA":3769.1,"ZK-SLQ":7513.5,"ZK-SDB":18749.0},{"date":"2026-03-05","ZK-SLA":3770.6,"ZK-SLQ":7516.5,"ZK-SDB":18753.6},{"date":"2026-03-09","ZK-SLB":12262.0,"ZK-SLQ":7519.4,"ZK-SDB":18755.8},{"date":"2026-03-10","ZK-SLB":12266.5,"ZK-SLQ":7523.7,"ZK-SDB":18760.3},{"date":"2026-03-11","ZK-SLA":3770.8,"ZK-SLQ":7525.2},{"date":"2026-03-12","ZK-SLB":12268.9,"ZK-SLQ":7525.5},{"date":"2026-03-13","ZK-SLA":3772.0,"ZK-SLB":12270.0,"ZK-SDB":18761.4},{"date":"2026-03-14","ZK-SLA":3773.1,"ZK-SLB":12271.9,"ZK-SDB":18762.4},{"date":"2026-03-15","ZK-SLA":3775.0},{"date":"2026-03-16","ZK-SLQ":7525.9},{"date":"2026-03-17","ZK-SLA":3777.1,"ZK-SLB":12274.6,"ZK-SLQ":7528.1},{"date":"2026-03-18","ZK-SLA":3780.8,"ZK-SLB":12278.3,"ZK-SLQ":7531.6,"ZK-SDB":18764.3},{"date":"2026-03-19","ZK-SLA":3784.5,"ZK-SLB":12281.8,"ZK-SLQ":7533.7,"ZK-SDB":18767.7},{"date":"2026-03-20","ZK-SLA":3788.2,"ZK-SLB":12285.6,"ZK-SLD":8383.7,"ZK-SLQ":7534.8,"ZK-SDB":18769.5},{"date":"2026-03-21","ZK-SLA":3791.6,"ZK-SLB":12289.0,"ZK-SLD":8385.6},{"date":"2026-03-22","ZK-SLA":3793.5,"ZK-SLB":12291.7,"ZK-SDB":18770.5},{"date":"2026-03-23","ZK-SLA":3798.4,"ZK-SLB":12295.8,"ZK-SLQ":7539.2,"ZK-SDB":18774.5},{"date":"2026-03-24","ZK-SLA":3802.0,"ZK-SLB":12300.2,"ZK-SLQ":7541.4,"ZK-SDB":18775.5},{"date":"2026-03-25","ZK-SLA":3805.6,"ZK-SLB":12303.6,"ZK-SLD":8389.9,"ZK-SLQ":7544.1,"ZK-SDB":18777.2},{"date":"2026-03-26","ZK-SLA":3807.4,"ZK-SLA_landings":8,"ZK-SLA_starts":8,"ZK-SLA_landTot":5292,"ZK-SLA_startTot":5173,"ZK-SLB":12259.4,"ZK-SLB_landings":8,"ZK-SLB_starts":8,"ZK-SLB_landTot":22010,"ZK-SLB_startTot":21956,"ZK-SLD":8391.7,"ZK-SLQ":7545.2},{"date":"2026-03-30","ZK-SLA":3808.4,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5294,"ZK-SLA_startTot":5181,"ZK-SLB":12305.7,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22012,"ZK-SLB_startTot":21958,"ZK-SDB":18779.1,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":2,"ZK-SDB_startTot":2,"ZK-SLD":8393.2},{"date":"2026-03-31","ZK-SLA":3812.3,"ZK-SLA_landings":8,"ZK-SLA_starts":8,"ZK-SLA_landTot":5302,"ZK-SLA_startTot":5183,"ZK-SLB":12309.3,"ZK-SLB_landings":8,"ZK-SLB_starts":8,"ZK-SLB_landTot":22020,"ZK-SLB_startTot":21966,"ZK-SDB":18782.7,"ZK-SDB_landings":8,"ZK-SDB_starts":8,"ZK-SDB_landTot":10,"ZK-SDB_startTot":10,"ZK-SLD":8397.1},{"date":"2026-04-01","ZK-SLA":3815.8,"ZK-SLA_landings":8,"ZK-SLA_starts":8,"ZK-SLA_landTot":5310,"ZK-SLA_startTot":5191,"ZK-SLB":12312.0,"ZK-SLB_landings":6,"ZK-SLB_starts":6,"ZK-SLB_landTot":22026,"ZK-SLB_startTot":21972,"ZK-SDB":18784.5,"ZK-SDB_landings":4,"ZK-SDB_starts":4,"ZK-SDB_landTot":14,"ZK-SDB_startTot":14,"ZK-SLD":8400.8},{"date":"2026-04-02","ZK-SLA":3818.6,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5316,"ZK-SLA_startTot":5199,"ZK-SLB":12313.8,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22030,"ZK-SLB_startTot":21976,"ZK-SDB":18786.3,"ZK-SDB_landings":4,"ZK-SDB_starts":4,"ZK-SDB_landTot":18,"ZK-SDB_startTot":18,"ZK-SLD":8404.7,"ZK-SLQ":7558.2},{"date":"2026-04-05","ZK-SLA":3821.5,"ZK-SLA_landings":4,"ZK-SLA_starts":4,"ZK-SLA_landTot":5320,"ZK-SLA_startTot":5205,"ZK-SLB_landTot":22030,"ZK-SLB_startTot":21976,"ZK-SDB_landTot":18,"ZK-SDB_startTot":18,"ZK-SLQ":7560.0},{"date":"2026-04-06","ZK-SLA":3824.4,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5326,"ZK-SLA_startTot":5209,"ZK-SLB":12316.5,"ZK-SLB_landings":6,"ZK-SLB_starts":6,"ZK-SLB_landTot":22036,"ZK-SLB_startTot":21982,"ZK-SDB":18789.0,"ZK-SDB_landings":6,"ZK-SDB_starts":7,"ZK-SDB_landTot":24,"ZK-SDB_startTot":25,"ZK-SLD":8406.4,"ZK-SLQ":7563.3},{"date":"2026-04-07","ZK-SLA_landTot":5326,"ZK-SLA_startTot":5215,"ZK-SLB_landTot":22036,"ZK-SLB_startTot":21982,"ZK-SDB_landTot":24,"ZK-SDB_startTot":25,"ZK-SLD":8407.2},{"date":"2026-04-08","ZK-SLA_landTot":5326,"ZK-SLA_startTot":5215,"ZK-SLB":12317.2,"ZK-SLB_landings":3,"ZK-SLB_starts":3,"ZK-SLB_landTot":22039,"ZK-SLB_startTot":21985,"ZK-SDB_landTot":24,"ZK-SDB_startTot":25},{"date":"2026-04-10","ZK-SLA":3827.9,"ZK-SLA_landings":7,"ZK-SLA_starts":7,"ZK-SLA_landTot":5333,"ZK-SLA_startTot":5215,"ZK-SLB":12320.7,"ZK-SLB_landings":7,"ZK-SLB_starts":7,"ZK-SLB_landTot":22046,"ZK-SLB_startTot":21992,"ZK-SDB":18791.7,"ZK-SDB_landings":6,"ZK-SDB_starts":6,"ZK-SDB_landTot":30,"ZK-SDB_startTot":31,"ZK-SLD":8412.1,"ZK-SLQ":7567.1},{"date":"2026-04-11","ZK-SLA":3832.0,"ZK-SLA_landings":8,"ZK-SLA_starts":8,"ZK-SLA_landTot":5341,"ZK-SLA_startTot":5222,"ZK-SLB":12324.9,"ZK-SLB_landings":8,"ZK-SLB_starts":8,"ZK-SLB_landTot":22054,"ZK-SLB_startTot":22000,"ZK-SDB":18793.8,"ZK-SDB_landings":4,"ZK-SDB_starts":5,"ZK-SDB_landTot":34,"ZK-SDB_startTot":36,"ZK-SLD":8416.0,"ZK-SLQ":7570.3},{"date":"2026-04-15","ZK-SLA":3833.0,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5342,"ZK-SLA_startTot":5230,"ZK-SLB":12325.8,"ZK-SLB_landings":1,"ZK-SLB_starts":1,"ZK-SLB_landTot":22055,"ZK-SLB_startTot":22001,"ZK-SDB_landTot":34,"ZK-SDB_startTot":36},{"date":"2026-04-19","ZK-SLA":3834.3,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5344,"ZK-SLA_startTot":5231,"ZK-SLB":12326.8,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22057,"ZK-SLB_startTot":22003,"ZK-SDB":18794.9,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":36,"ZK-SDB_startTot":38,"ZK-SLD":8417.3,"ZK-SLQ":7571.7},{"date":"2026-04-20","ZK-SLA":3835.3,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5345,"ZK-SLA_startTot":5233,"ZK-SLB_landTot":22057,"ZK-SLB_startTot":22003,"ZK-SDB_landTot":36,"ZK-SDB_startTot":38,"ZK-SLD":8418.5,"ZK-SLQ":7572.3},{"date":"2026-04-21","ZK-SLA":3836.4,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5346,"ZK-SLA_startTot":5234,"ZK-SLB":12327.9,"ZK-SLB_landings":1,"ZK-SLB_starts":1,"ZK-SLB_landTot":22058,"ZK-SLB_startTot":22004,"ZK-SDB_landTot":36,"ZK-SDB_startTot":38},{"date":"2026-04-22","ZK-SLA":3840.0,"ZK-SLA_landings":8,"ZK-SLA_starts":8,"ZK-SLA_landTot":5354,"ZK-SLA_startTot":5235,"ZK-SLB":12330.7,"ZK-SLB_landings":6,"ZK-SLB_starts":6,"ZK-SLB_landTot":22064,"ZK-SLB_startTot":22010,"ZK-SDB":18796.8,"ZK-SDB_landings":4,"ZK-SDB_starts":4,"ZK-SDB_landTot":40,"ZK-SDB_startTot":42,"ZK-SLD":8420.9},{"date":"2026-04-23","ZK-SLA":3840.9,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5356,"ZK-SLA_startTot":5243,"ZK-SLB":12332.5,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22068,"ZK-SLB_startTot":22014,"ZK-SDB_landTot":40,"ZK-SDB_startTot":42,"ZK-SLD":8424.2,"ZK-SLQ":7573.7},{"date":"2026-04-24","ZK-SLA":3843.7,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5362,"ZK-SLA_startTot":5245,"ZK-SLB":12334.2,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22072,"ZK-SLB_startTot":22018,"ZK-SDB":18797.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":42,"ZK-SDB_startTot":44,"ZK-SLQ":7577.0},{"date":"2026-04-25","ZK-SLA":3846.6,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5368,"ZK-SLA_startTot":5251,"ZK-SLB":12336.2,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22076,"ZK-SLB_startTot":22022,"ZK-SDB_landTot":42,"ZK-SDB_startTot":44,"ZK-SLD":8427.9,"ZK-SLQ":7580.1},{"date":"2026-04-27","ZK-SLA":3847.5,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5370,"ZK-SLA_startTot":5257,"ZK-SLB":12337.1,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22078,"ZK-SLB_startTot":22024,"ZK-SDB":18798.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":44,"ZK-SDB_startTot":46,"ZK-SLD":8431.0,"ZK-SLQ":7582.4},{"date":"2026-04-28","ZK-SLA_landTot":5370,"ZK-SLA_startTot":5259,"ZK-SLB_landTot":22078,"ZK-SLB_startTot":22024,"ZK-SDB_landTot":44,"ZK-SDB_startTot":46,"ZK-SLD":8431.6,"ZK-SLQ":7583.0},{"date":"2026-04-30","ZK-SLA":3850.3,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5376,"ZK-SLA_startTot":5259,"ZK-SLB":12339.7,"ZK-SLB_landings":6,"ZK-SLB_starts":6,"ZK-SLB_landTot":22084,"ZK-SLB_startTot":22030,"ZK-SDB":18800.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":46,"ZK-SDB_startTot":48,"ZK-SLD":3435.0,"ZK-SLQ":7585.9},{"date":"2026-05-01","ZK-SLA":3852.1,"ZK-SLA_landings":4,"ZK-SLA_starts":4,"ZK-SLA_landTot":5380,"ZK-SLA_startTot":5265,"ZK-SLB":12342.0,"ZK-SLB_landings":8,"ZK-SLB_starts":3,"ZK-SLB_landTot":22092,"ZK-SLB_startTot":22033,"ZK-SDB_landTot":46,"ZK-SDB_startTot":48,"ZK-SLD":8436.2,"ZK-SLQ":7587.1},{"date":"2026-05-02","ZK-SLA":3854.0,"ZK-SLA_landings":4,"ZK-SLA_starts":4,"ZK-SLA_landTot":5384,"ZK-SLA_startTot":5269,"ZK-SLB":12343.0,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22094,"ZK-SLB_startTot":22035,"ZK-SDB":18801.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":48,"ZK-SDB_startTot":50,"ZK-SLQ":7588.1},{"date":"2026-05-03","ZK-SLA":3855.1,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5386,"ZK-SLA_startTot":5273,"ZK-SLB":12343.9,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22096,"ZK-SLB_startTot":22037,"ZK-SDB_landTot":48,"ZK-SDB_startTot":50,"ZK-SLD":8438.4,"ZK-SLQ":7590.3},{"date":"2026-05-04","ZK-SLA":3855.9,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5388,"ZK-SLA_startTot":5275,"ZK-SLB":12345.2,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22098,"ZK-SLB_startTot":22039,"ZK-SDB":18802.6,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":50,"ZK-SDB_startTot":52,"ZK-SLD":8441.6,"ZK-SLQ":7592.9},{"date":"2026-05-05","ZK-SLA":3858.1,"ZK-SLA_landings":4,"ZK-SLA_starts":4,"ZK-SLA_landTot":5392,"ZK-SLA_startTot":5277,"ZK-SLB":12346.2,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22100,"ZK-SLB_startTot":22041,"ZK-SDB":18803.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":52,"ZK-SDB_startTot":54,"ZK-SLQ":7596.1},{"date":"2026-05-06","ZK-SLA_landTot":5392,"ZK-SLA_startTot":5281,"ZK-SLB_landTot":22100,"ZK-SLB_startTot":22041,"ZK-SDB":18803.9,"ZK-SDB_landings":1,"ZK-SDB_starts":1,"ZK-SDB_landTot":53,"ZK-SDB_startTot":55},{"date":"2026-05-07","ZK-SLA_landTot":5392,"ZK-SLA_startTot":5281,"ZK-SLB_landTot":22100,"ZK-SLB_startTot":22041,"ZK-SDB":18804.2,"ZK-SDB_landings":1,"ZK-SDB_starts":1,"ZK-SDB_landTot":54,"ZK-SDB_startTot":56},{"date":"2026-05-08","ZK-SLA":3859.1,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5393,"ZK-SLA_startTot":5281,"ZK-SLB_landTot":22100,"ZK-SLB_startTot":22041,"ZK-SDB_landTot":54,"ZK-SDB_startTot":56,"ZK-SLQ":7597.5},{"date":"2026-05-09","ZK-SLA":3860.2,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5394,"ZK-SLA_startTot":5282,"ZK-SLB":12347.2,"ZK-SLB_landings":1,"ZK-SLB_starts":1,"ZK-SLB_landTot":22101,"ZK-SLB_startTot":22042,"ZK-SDB_landTot":54,"ZK-SDB_startTot":56,"ZK-SLQ":7598.9},{"date":"2026-05-10","ZK-SLA_landTot":5394,"ZK-SLA_startTot":5283,"ZK-SLB_landTot":22101,"ZK-SLB_startTot":22042,"ZK-SDB_landTot":54,"ZK-SDB_startTot":56,"ZK-SLQ":7599.9},{"date":"2026-05-11","ZK-SLA":3862.9,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5400,"ZK-SLA_startTot":5283,"ZK-SLB":12349.1,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22105,"ZK-SLB_startTot":22046,"ZK-SDB":18805.2,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58,"ZK-SLD":8443.6,"ZK-SLQ":7602.1},{"date":"2026-05-12","ZK-SLA":3864.1,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5402,"ZK-SLA_startTot":5289,"ZK-SLB":12351.2,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22109,"ZK-SLB_startTot":22050,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58,"ZK-SLQ":7605.3},{"date":"2026-05-13","ZK-SLA":3865.1,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5404,"ZK-SLA_startTot":5291,"ZK-SLB":12352.4,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22111,"ZK-SLB_startTot":22052,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58},{"date":"2026-05-14","ZK-SLA":3866.0,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5406,"ZK-SLA_startTot":5293,"ZK-SLB":12353.4,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22113,"ZK-SLB_startTot":22054,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58,"ZK-SLD":8444.0,"ZK-SLQ":7607.4},{"date":"2026-05-15","ZK-SLA":3866.9,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5408,"ZK-SLA_startTot":5295,"ZK-SLB":12354.3,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22115,"ZK-SLB_startTot":22056,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58,"ZK-SLQ":7610.2},{"date":"2026-05-16","ZK-SLA":3867.9,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5410,"ZK-SLA_startTot":5297,"ZK-SLB":12355.4,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22117,"ZK-SLB_startTot":22058,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58,"ZK-SLQ":7611.4},{"date":"2026-05-17","ZK-SLA":3869.8,"ZK-SLA_landings":3,"ZK-SLA_starts":3,"ZK-SLA_landTot":5413,"ZK-SLA_startTot":5299,"ZK-SLB_landTot":22117,"ZK-SLB_startTot":22058,"ZK-SDB_landTot":56,"ZK-SDB_startTot":58,"ZK-SLQ":7612.4},{"date":"2026-05-18","ZK-SLA":3870.8,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5415,"ZK-SLA_startTot":5302,"ZK-SLB":12356.3,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22119,"ZK-SLB_startTot":22060,"ZK-SDB":18807.0,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":58,"ZK-SDB_startTot":60},{"date":"2026-05-19","ZK-SLA":3871.0,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5416,"ZK-SLA_startTot":5304,"ZK-SLB":12357.3,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22121,"ZK-SLB_startTot":22062,"ZK-SDB_landTot":58,"ZK-SDB_startTot":60,"ZK-SLD":8445.0,"ZK-SLQ":7613.6},{"date":"2026-05-20","ZK-SLA_landTot":5416,"ZK-SLA_startTot":5305,"ZK-SLB_landTot":22121,"ZK-SLB_startTot":22062,"ZK-SDB_landTot":58,"ZK-SDB_startTot":60,"ZK-SLD":8447.0,"ZK-SLQ":7615.7},{"date":"2026-05-21","ZK-SLA_landTot":5416,"ZK-SLA_startTot":5305,"ZK-SLB":12358.4,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22123,"ZK-SLB_startTot":22064,"ZK-SDB_landTot":58,"ZK-SDB_startTot":60,"ZK-SLQ":7616.8},{"date":"2026-05-22","ZK-SLA_landTot":5416,"ZK-SLA_startTot":5305,"ZK-SLB":12359.4,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22125,"ZK-SLB_startTot":22066,"ZK-SDB":18808.0,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":60,"ZK-SDB_startTot":62,"ZK-SLD":8448.2,"ZK-SLQ":7618.0},{"date":"2026-05-23","ZK-SLA_landTot":5416,"ZK-SLA_startTot":5305,"ZK-SLB":12361.4,"ZK-SLB_landings":4,"ZK-SLB_starts":4,"ZK-SLB_landTot":22129,"ZK-SLB_startTot":22070,"ZK-SDB":18809.0,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":62,"ZK-SDB_startTot":64,"ZK-SLQ":7620.1},{"date":"2026-05-24","ZK-SLA_landTot":5416,"ZK-SLA_startTot":5305,"ZK-SLB":12362.2,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22131,"ZK-SLB_startTot":22072,"ZK-SDB":18809.9,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":64,"ZK-SDB_startTot":66,"ZK-SLD":8449.4,"ZK-SLQ":7621.3},{"date":"2026-05-27","ZK-SLA_landTot":5416,"ZK-SLA_startTot":5305,"ZK-SLB":12363.2,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22133,"ZK-SLB_startTot":22074,"ZK-SDB":18810.9,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":66,"ZK-SDB_startTot":68,"ZK-SLQ":7623.5},{"date":"2026-05-28","ZK-SLA":3872.2,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5418,"ZK-SLA_startTot":5305,"ZK-SLB":12364.2,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22135,"ZK-SLB_startTot":22076,"ZK-SDB":18811.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":68,"ZK-SDB_startTot":70,"ZK-SLD":8451.6},{"date":"2026-05-29","ZK-SLA":3873.1,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5420,"ZK-SLA_startTot":5307,"ZK-SLB":12365.1,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22137,"ZK-SLB_startTot":22078,"ZK-SDB_landTot":68,"ZK-SDB_startTot":70,"ZK-SLD":8452.7},{"date":"2026-05-30","ZK-SLA_landTot":5420,"ZK-SLA_startTot":5309,"ZK-SLB_landTot":22137,"ZK-SLB_startTot":22078,"ZK-SDB_landTot":68,"ZK-SDB_startTot":70,"ZK-SLD":8454.0,"ZK-SLQ":7624.9},{"date":"2026-06-02","ZK-SLA":3875.4,"ZK-SLA_landings":1,"ZK-SLA_starts":1,"ZK-SLA_landTot":5421,"ZK-SLA_startTot":5309,"ZK-SLB_landTot":22137,"ZK-SLB_startTot":22078,"ZK-SDB_landTot":68,"ZK-SDB_startTot":70,"ZK-SLQ":7625.1},{"date":"2026-06-03","ZK-SLA":3878.3,"ZK-SLA_landings":6,"ZK-SLA_starts":6,"ZK-SLA_landTot":5427,"ZK-SLA_startTot":5310,"ZK-SLB":12368.0,"ZK-SLB_landings":6,"ZK-SLB_starts":6,"ZK-SLB_landTot":22143,"ZK-SLB_startTot":22084,"ZK-SDB":18813.7,"ZK-SDB_landings":4,"ZK-SDB_starts":4,"ZK-SDB_landTot":72,"ZK-SDB_startTot":74,"ZK-SLD":8455.9,"ZK-SLQ":7628.6},{"date":"2026-06-06","ZK-SLA":3879.3,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5429,"ZK-SLA_startTot":5316,"ZK-SLB":12369.1,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22145,"ZK-SLB_startTot":22086,"ZK-SDB":18814.7,"ZK-SDB_landings":2,"ZK-SDB_starts":2,"ZK-SDB_landTot":74,"ZK-SDB_startTot":76,"ZK-SLD":8457.2},{"date":"2026-06-07","ZK-SLA_landTot":5429,"ZK-SLA_startTot":5318,"ZK-SLB_landTot":22145,"ZK-SLB_startTot":22086,"ZK-SDB_landTot":74,"ZK-SDB_startTot":76,"ZK-SLD":8459.2},{"date":"2026-06-09","ZK-SLA_landTot":5429,"ZK-SLA_startTot":5318,"ZK-SLB":12370.1,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22147,"ZK-SLB_startTot":22088,"ZK-SDB_landTot":74,"ZK-SDB_startTot":76,"ZK-SLD":8460.5,"ZK-SLQ":7627.8},{"date":"2026-06-10","ZK-SLA":3880.2,"ZK-SLA_landings":2,"ZK-SLA_starts":2,"ZK-SLA_landTot":5431,"ZK-SLA_startTot":5318,"ZK-SLB":12371.0,"ZK-SLB_landings":2,"ZK-SLB_starts":2,"ZK-SLB_landTot":22149,"ZK-SLB_startTot":22090,"ZK-SDB_landTot":74,"ZK-SDB_startTot":76,"ZK-SLD":8462.7},{"date":"2026-06-11","ZK-SLA_landTot":5431,"ZK-SLA_startTot":5320,"ZK-SLB":12372.3,"ZK-SLB_landings":1,"ZK-SLB_starts":1,"ZK-SLB_landTot":22150,"ZK-SLB_startTot":22091,"ZK-SDB_landTot":74,"ZK-SDB_startTot":76,"ZK-SLD":8464.5}],"oil":[{"date":"2026-01-04","ZK-SLD":1.0,"ZK-SLQ":2.0},{"date":"2026-01-05","ZK-SLD":1.0},{"date":"2026-01-06","ZK-SLD":2.0},{"date":"2026-01-08","ZK-SLD":1.0},{"date":"2026-01-10","ZK-SLD":1.0},{"date":"2026-01-12","ZK-SLD":1.0},{"date":"2026-01-14","ZK-SLA":1.0},{"date":"2026-01-16","ZK-SLD":1.0,"ZK-SLQ":1.0},{"date":"2026-01-21","ZK-SLB":1.0,"ZK-SLQ":1.0},{"date":"2026-01-23","ZK-SLQ":1.0},{"date":"2026-01-26","ZK-SLQ":1.0},{"date":"2026-01-27","ZK-SLQ":1.0},{"date":"2026-01-30","ZK-SLD":2.0},{"date":"2026-01-31","ZK-SLD":2.0},{"date":"2026-02-04","ZK-SLA":1.0,"ZK-SLB":1.0},{"date":"2026-02-07","ZK-SLQ":1.0},{"date":"2026-02-11","ZK-SLD":1.0,"ZK-SLQ":1.0},{"date":"2026-02-15","ZK-SLQ":1.0},{"date":"2026-02-16","ZK-SLA":1.0},{"date":"2026-02-17","ZK-SLD":1.0},{"date":"2026-02-18","ZK-SLD":1.0},{"date":"2026-02-21","ZK-SLB":1.0},{"date":"2026-02-22","ZK-SLD":1.0,"ZK-SLQ":1.0},{"date":"2026-02-24","ZK-SLD":1.0},{"date":"2026-02-25","ZK-SLD":1.0},{"date":"2026-02-27","ZK-SLQ":1.0},{"date":"2026-03-04","ZK-SLQ":2.0},{"date":"2026-03-13","ZK-SLB":1.0},{"date":"2026-03-25","ZK-SLA":1.0},{"date":"2026-03-30","ZK-SLB":1.0},{"date":"2026-04-01","ZK-SLQ":1.0},{"date":"2026-04-06","ZK-SDB":1.0},{"date":"2026-04-10","ZK-SLA":1.0,"ZK-SLQ":1.0},{"date":"2026-04-11","ZK-SLQ":1.0},{"date":"2026-04-15","ZK-SLQ":1.0},{"date":"2026-05-03","ZK-SLQ":1.0},{"date":"2026-05-04","ZK-SLQ":1.0},{"date":"2026-05-06","ZK-SLQ":1.0},{"date":"2026-05-11","ZK-SLQ":1.0},{"date":"2026-05-16","ZK-SLQ":2.0},{"date":"2026-05-20","ZK-SLQ":2.0},{"date":"2026-05-28","ZK-SLA":1.0,"ZK-SLB":1.0},{"date":"2026-05-30","ZK-SLQ":1.0}],"nextCheck":{"ZK-SLA":3970,"ZK-SLB":12450.4,"ZK-SLD":8477.1,"ZK-SLQ":7672.4,"ZK-SDB":18878.8},"checkType":{"ZK-SLA":"100 Hour","ZK-SLB":"200 Hour","ZK-SLD":"100 Hour","ZK-SLQ":"100 Hour","ZK-SDB":"100 Hour"},"engineLastOH":{"ZK-SLA":0,"ZK-SLB":11850.4,"ZK-SLD":8382.1,"ZK-SLQ":5464.5},"engineToRun":{"ZK-SLA":4120.7,"ZK-SLB":3080.3,"ZK-SLD":2121.6,"ZK-SLQ":35.9},"propLastOH":{"ZK-SLA":1780.6,"ZK-SLB":11895.5,"ZK-SLD":8382.1,"ZK-SLQ":5432.9},"propToRun":{"ZK-SLA":1901.3,"ZK-SLB":3525.4,"ZK-SLD":2321.6,"ZK-SLQ":204.3}};
const MAINT_SEED_VERSION=5;

function saveMaintenance(){
  lsSet('ts_maintenance',S.maintenance);
  // Persist to Supabase (ts_settings key='maintenance')
  sbU('ts_settings',[{key:'maintenance',value:JSON.stringify(S.maintenance)}]).catch(function(){});
}
async function loadMaintenanceFromCloud(){
  try{
    const r=await fetch(SB+'/rest/v1/ts_settings?key=eq.maintenance&select=value',{headers:SH});
    if(!r.ok)return null;
    const rows=await r.json();
    if(!rows||!rows.length)return null;
    const val=typeof rows[0].value==='string'?JSON.parse(rows[0].value):rows[0].value;
    return val&&val.hist?val:null;
  }catch{return null;}
}
function initMaintenance(){
  // Fetch handled by setTab on every tab click; just ensure state exists
  if(!S.maintenance){
    S.maintenance={hist:[],oil:[],nextCheck:{},checkType:{},engineLastOH:{},engineToRun:{},propLastOH:{},propToRun:{},bookings:{},priority:[],compwash:{},adas:{},_loading:true};
  }
}

function maintGetLatest(acId){
  const hist=S.maintenance?.hist||[];
  for(let i=hist.length-1;i>=0;i--){if(hist[i][acId]!=null)return hist[i][acId];}
  return null;
}

function maintToRun(acId){
  const latest=maintGetLatest(acId);
  const nc=S.maintenance?.nextCheck?.[acId];
  if(latest==null||nc==null)return null;
  return Math.round((nc-latest)*10)/10;
}

function fmtMaintDate(d){
  if(!d) return '—';
  const dt=new Date(d+'T00:00:00');
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day=String(dt.getDate()).padStart(2,'0');
  const mon=months[dt.getMonth()];
  const yr=String(dt.getFullYear()).slice(2);
  return day+'-'+mon+'-'+yr;
}

window.retryMaintenance=function(){setTab('maintenance');};

function generateHalfSheetContent(sheet){
  var f=sheet.form;
  var a=S.aircraft[f.ac]||{seats:[],cargo:[],doc:'',type:'',burnDef:'',burnDefUnit:'kg',gndBurn:0,fuelArm:0,ew:0,em:0,cogMin:0,cogMax:0,mtow:0,mlw:0};
  var r=calcFormWB(f);
  var acCol=AC_COL[f.ac]||'#1e6b8c';
  function hexRgba(h,op){var x=parseInt(h.slice(1),16);return 'rgba('+((x>>16)&255)+','+((x>>8)&255)+','+(x&255)+','+op+')';}
  var acFaint=hexRgba(acCol,0.08);
  var allOk=r&&r.towOk&&r.lwOk&&r.cogOk;
  var statusBg=allOk?'#f0fdf4':'#fef2f2';
  var statusBorder=allOk?'#16a34a':'#dc2626';
  var statusColor=allOk?'#15803d':'#b91c1c';
  var fuelKgV=parseFloat(f.fuel)||0;
  var burnKgV=r?r.burnKg:0;
  var remKg=fuelKgV-(a.gndBurn||0)-burnKgV;
  var fuelU=fuelUnit(f.ac);
  var fuelDisplay=f.ac?fromKg(fuelKgV,f.ac).toFixed(1):fuelKgV;
  var remDisplay=f.ac?fromKg(Math.max(0,remKg),f.ac).toFixed(1):Math.max(0,remKg).toFixed(1);
  var TD='border:1px solid #e2e8f0;padding:3px 6px;font-family:Arial,sans-serif;font-size:9px;vertical-align:top;';
  var TH='border:1px solid '+acCol+';padding:3px 6px;font-family:Arial,sans-serif;font-size:8px;font-weight:700;text-align:left;background:'+acCol+';color:#fff;';
  // Seat rows
  var seatRows='';
  a.seats.forEach(function(s,i){
    var n=(f.names&&f.names[i])||'';var w=(f.seats&&f.seats[i])||'';var b=(f.bags&&f.bags[i])||'';
    if(n||parseFloat(w)){
      var inf=(f.infantNames&&f.infantNames[i])||'';
      var pt=(f.paxType&&f.paxType[i])||'A';
      seatRows+='<tr style="background:'+(i===0?acFaint:'transparent')+'">'
        +'<td style="'+TD+'font-weight:'+(i===0?'700':'400')+';color:'+(i===0?acCol:'#111')+'">'+s.lbl+'</td>'
        +'<td style="'+TD+'">'+n+(inf?' + '+inf:'')+(i>0&&n?' <span style="font-size:8px;color:'+(pt==='C'?'#ea580c':'#16a34a')+';margin-left:3px">'+(pt==='C'?'C':'A')+'</span>':'')+'</td>'
        +'<td style="'+TD+'text-align:right">'+(w||'—')+'</td>'
        +'<td style="'+TD+'text-align:right">'+(b||'—')+'</td>'
        +'</tr>';
    }
  });
  var cargoRows='';
  if(a.cargo&&a.cargo.length){a.cargo.forEach(function(zn,i){var w=(f.cargo&&f.cargo[i])||'';if(w)cargoRows+='<tr><td style="'+TD+'">'+zn.lbl+'</td><td style="'+TD+'text-align:right">'+w+' kg</td></tr>';});}
  return '<div style="font-family:Arial,sans-serif;font-size:9px;color:#111;height:100%;display:flex;flex-direction:column;gap:5px">'
    // Header strip
    +'<div style="display:flex;align-items:center;gap:10px;border-left:4px solid '+acCol+';padding:4px 8px">'
    +'<div><div style="font-size:12px;font-weight:800;color:'+acCol+'">'+f.ac.replace('ZK-','')+' <span style="color:#444;font-weight:400;font-size:10px">'+a.type+'</span></div>'
    +'<div style="font-size:8px;color:#666">TRUE SOUTH FLIGHTS — LOADSHEET</div></div>'
    +'<div style="flex:1"></div>'
    +'<div style="text-align:right;font-size:9px"><div><b>'+(APTS[f.dep]||f.dep||'—')+'</b> → <b>'+(APTS[f.dest]||f.dest||'—')+'</b></div>'
    +'<div style="color:#666">'+f.date+' &nbsp; ETD '+(f.etd||'—')+'</div></div></div>'
    // Status
    +'<div style="padding:4px 8px;border:1.5px solid '+statusBorder+';border-radius:4px;background:'+statusBg+';color:'+statusColor+';font-weight:800;font-size:9px">'+(allOk?'✓  ALL LIMITS WITHIN RANGE':'⚠  ONE OR MORE LIMITS EXCEEDED')+'</div>'
    // Two-col: flight info + W&B
    +'<div style="display:flex;gap:8px">'
    +'<table style="flex:1;border-collapse:collapse;font-size:9px"><tr><th colspan="2" style="'+TH+'">FLIGHT</th></tr>'
    +'<tr><td style="'+TD+'color:#666">PIC</td><td style="'+TD+'font-weight:700">'+f.pic+'</td></tr>'
    +(f.coPilot?'<tr><td style="'+TD+'color:#666">Co-Pilot</td><td style="'+TD+'">'+f.coPilot+'</td></tr>':'')
    +(r?'<tr><td style="'+TD+'color:#666">TOW</td><td style="'+TD+'font-weight:700;color:'+(r.towOk?'#15803d':'#b91c1c')+'">'+r.tow.toFixed(1)+' / '+a.mtow+' kg</td></tr>':'')
    +(r?'<tr><td style="'+TD+'color:#666">Land Wt</td><td style="'+TD+'font-weight:700;color:'+(r.lwOk?'#15803d':'#b91c1c')+'">'+r.lw.toFixed(1)+' / '+a.mlw+' kg</td></tr>':'')
    +(r?'<tr><td style="'+TD+'color:#666">C of G</td><td style="'+TD+'font-weight:700;color:'+(r.cogOk?'#15803d':'#b91c1c')+'">'+r.towCog.toFixed(2)+'" ('+a.cogMin+'–'+a.cogMax+'")</td></tr>':'')
    +'</table>'
    +'<table style="flex:1;border-collapse:collapse;font-size:9px"><tr><th colspan="2" style="'+TH+'">FUEL</th></tr>'
    +'<tr><td style="'+TD+'color:#666">Loaded</td><td style="'+TD+'">'+fuelKgV.toFixed(1)+' kg ('+fuelDisplay+' '+fuelU+')</td></tr>'
    +'<tr><td style="'+TD+'color:#666">Gnd burn</td><td style="'+TD+'">'+(a.gndBurn||0)+' kg</td></tr>'
    +'<tr><td style="'+TD+'color:#666">Flt burn</td><td style="'+TD+'">'+(f.burnOff||a.burnDef)+' '+(a.burnDefUnit||'kg')+'</td></tr>'
    +'<tr style="background:'+acFaint+'"><td style="'+TD+'border-left:2px solid '+acCol+';font-weight:700">@ Dest</td><td style="'+TD+'font-weight:700">'+remDisplay+' '+fuelU+'</td></tr>'
    +'</table></div>'
    // Occupants
    +'<table style="width:100%;border-collapse:collapse;font-size:9px"><tr><th colspan="4" style="'+TH+'">OCCUPANTS</th></tr>'
    +'<tr><th style="'+TH+'">Seat</th><th style="'+TH+'">Name</th><th style="'+TH+'text-align:right">Wt kg</th><th style="'+TH+'text-align:right">Bag kg</th></tr>'
    +seatRows
    +(cargoRows?'<tr><th colspan="2" style="'+TH+'">CARGO</th><th colspan="2" style="'+TH+'"></th></tr>'+cargoRows:'')
    +'</table>'
    // Signature
    +'<div style="margin-top:auto">'
    +'<table style="width:100%;border-collapse:collapse;font-size:9px"><tr><th colspan="2" style="'+TH+'">PIC CERTIFICATION</th></tr>'
    +'<tr><td colspan="2" style="'+TD+'font-style:italic;color:#555;font-size:8px">I hereby certify the particulars above are correct'+(a.type&&a.type.includes('208')?' and Part 125 security measures followed':'')+'.</td></tr>'
    +(f.sig?'<tr><td style="'+TD+'color:#666;width:25%">Signature</td><td style="'+TD+'"><img src="'+f.sig+'" style="max-height:36px;display:block"></td></tr>'
           :'<tr><td style="'+TD+'color:#666">Signature</td><td style="'+TD+'padding:16px 6px">_____________________________</td></tr>')
    +'<tr><td style="'+TD+'color:#666">Name / Date</td><td style="'+TD+'">'+f.pic+' &nbsp; '+f.date+'</td></tr>'
    +'</table></div>'
    +'</div>';
}
function _openPrintWindow(sheets){
  var contents=sheets.map(generateHalfSheetContent);
  var pairs=[];
  for(var i=0;i<contents.length;i+=2){
    pairs.push('<div class="pp">'
      +'<div class="lsh">'+contents[i]+'</div>'
      +(contents[i+1]?'<div class="lsh brd">'+contents[i+1]+'</div>':'<div class="lsh"></div>')
      +'</div>');
  }
  var w=window.open('','_blank','width=900,height=750');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Loadsheet</title>'
    +'<style>'
    +'*{box-sizing:border-box;margin:0;padding:0}'
    +'body{background:#fff;font-family:Arial,sans-serif}'
    +'@page{size:A4 portrait;margin:6mm}'
    +'.pp{display:flex;flex-direction:column;height:277mm;page-break-after:always}'
    +'.pp:last-child{page-break-after:auto}'
    +'.lsh{flex:1;overflow:hidden;padding:5mm}'
    +'.lsh.brd{border-top:1px dashed #bbb}'
    +'@media print{body{padding:0}}'
    +'</style>'
    +'</head><body>'+pairs.join('')
    +'<script>window.onload=function(){window.print();}<\/script>'
    +'</body></html>');
  w.document.close();
}
window.printSingleSheet=function(id){
  var sheet=S.saved.find(function(s){return s.id===id;});
  if(!sheet)return;
  _openPrintWindow([sheet]);
};
window.printMultiSheet=function(ids){
  var sheets=ids.map(function(id){return S.saved.find(function(s){return s.id===id;});}).filter(Boolean);
  if(!sheets.length)return;
  _openPrintWindow(sheets);
};
window.uploadSingleSheet=async function(id){
  const sheet=S.saved.find(function(s){return s.id===id;});
  if(!sheet){return;}
  if(!S.gdriveEnabled||!S.gdriveClientId){toast('Google Drive not configured — check Admin > Google Drive.','warn');return;}
  toast('Uploading to Drive…','info');
  try{
    await uploadToDrive(sheet,null);
    toast('Uploaded to Drive ✓','ok');render();
  }catch(e){
    toast('Upload failed: '+(e&&e.message||e),'err');
  }
};

window.editMaintCell=function(cell,date,ac){
  initMaintenance();
  const subTab=S.maintLogSubTab||'hours';
  var e=S.maintenance.hist.find(function(x){return x.date===date;});
  var oilE=(S.maintenance.oil||[]).find(function(x){return x.date===date;});

  if(subTab==='hours'){
    const cur=e?e[ac]:'';
    const val=prompt('TTIS for '+ac+' on '+fmtMaintDate(date)+':', cur||'');
    if(val===null) return;
    const v=parseFloat(val);
    if(!e){e={date};S.maintenance.hist.push(e);S.maintenance.hist.sort(function(a,b){return a.date.localeCompare(b.date);});}
    if(v&&v>0) e[ac]=v; else delete e[ac];
  } else if(subTab==='starts'){
    const cur=e?e[ac+'_starts']||'':'';
    const val=prompt('Starts for '+ac+' on '+fmtMaintDate(date)+':', cur);
    if(val===null) return;
    const v=parseInt(val);
    if(!e){e={date};S.maintenance.hist.push(e);S.maintenance.hist.sort(function(a,b){return a.date.localeCompare(b.date);});}
    if(v>0) e[ac+'_starts']=v; else delete e[ac+'_starts'];
  } else if(subTab==='landings'){
    const cur=e?e[ac+'_landings']||'':'';
    const val=prompt('Landings for '+ac+' on '+fmtMaintDate(date)+':', cur);
    if(val===null) return;
    const v=parseInt(val);
    if(!e){e={date};S.maintenance.hist.push(e);S.maintenance.hist.sort(function(a,b){return a.date.localeCompare(b.date);});}
    if(v>0) e[ac+'_landings']=v; else delete e[ac+'_landings'];
  } else if(subTab==='oil'){
    const cur=oilE?oilE[ac]||'':'';
    const val=prompt('Oil added (qts) for '+ac+' on '+fmtMaintDate(date)+':', cur);
    if(val===null) return;
    const v=parseFloat(val);
    if(!oilE){oilE={date};S.maintenance.oil=S.maintenance.oil||[];S.maintenance.oil.push(oilE);S.maintenance.oil.sort(function(a,b){return a.date.localeCompare(b.date);});}
    if(v>0) oilE[ac]=v; else delete oilE[ac];
  }

  saveMaintenance();auditLog('maint_edit',{ac,date,field:subTab});render();
};

window.calcHoursUsed=function(){
  const ttis=parseFloat(document.getElementById('ml_hours')?.value);
  const ac=S.maintEntryAc||'ZK-SLD';
  const prev=maintGetLatest(ac);
  const el=document.getElementById('ml_used');
  if(!el) return;
  if(ttis&&ttis>0&&prev&&prev>0){
    const used=Math.round((ttis-prev)*10)/10;
    el.value=used>0?used:'';
    el.style.color=used>0?'var(--text)':'#ef4444';
  } else {
    el.value='';
  }
};
window.calcTTIS=function(){
  const used=parseFloat(document.getElementById('ml_used')?.value);
  const ac=S.maintEntryAc||'ZK-SLD';
  const prev=maintGetLatest(ac);
  const el=document.getElementById('ml_hours');
  if(!el) return;
  if(used&&used>0&&prev&&prev>0){
    const ttis=Math.round((prev+used)*10)/10;
    el.value=ttis;
  } else {
    el.value='';
  }
};

