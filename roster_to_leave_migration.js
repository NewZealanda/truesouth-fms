// ══════════════════════════════════════════════════════════
// Roster → Leave Requests Migration
// Run this in the browser console while logged into the app
// It reads S.roster + S.users and creates ts_leave_requests
// ══════════════════════════════════════════════════════════
(async()=>{
  const SB='https://wgycephyuwwfogggcbye.supabase.co';
  const SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneWNlcGh5dXd3Zm9nZ2djYnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NjEzNzAsImV4cCI6MjA5NjQzNzM3MH0.6ac1fI7NxOJla_cI6P2bMwBXr3qkBTaHoyipcG9r95Q';
  const SH={'Content-Type':'application/json','apikey':SK,'Authorization':'Bearer '+SK,'Prefer':'return=representation'};

  const roster=S.roster||{};
  const users=S.users||[];

  if(!users.length){console.error('No users loaded — navigate to Admin first, then re-run');return;}

  // Build initials → user map
  const initialsMap={};
  users.forEach(u=>{
    const ini=(u.name||'').split(/\s+/).map(w=>w[0]||'').join('').toUpperCase().slice(0,2);
    if(ini)initialsMap[ini]=u;
  });
  console.log('User initials map:',Object.keys(initialsMap));

  // Leave/sick/training status → leave_type
  const STATUS_MAP={leave:'annual',sick:'sick',training:'other'};

  // Collect all leave days per person per status
  const personDays={}; // "initials|status" → sorted array of dateISO strings

  Object.keys(roster).sort().forEach(ds=>{
    const day=roster[ds];
    Object.keys(day).forEach(key=>{
      const st=day[key];
      if(!STATUS_MAP[st])return; // skip 'on' and ''
      const k=key+'|'+st;
      if(!personDays[k])personDays[k]=[];
      personDays[k].push(ds);
    });
  });

  // Group consecutive days into date ranges (bridge up to 3-day gaps for weekends)
  function groupRanges(dates){
    if(!dates.length)return[];
    const sorted=[...dates].sort();
    const groups=[];
    let start=sorted[0],end=sorted[0];
    for(let i=1;i<sorted.length;i++){
      const prev=new Date(end+'T00:00:00');
      const curr=new Date(sorted[i]+'T00:00:00');
      const diff=(curr-prev)/86400000;
      if(diff<=3){end=sorted[i];} // bridge weekends (up to Sun→Mon gap = 1, Fri→Mon = 3)
      else{groups.push([start,end]);start=sorted[i];end=sorted[i];}
    }
    groups.push([start,end]);
    return groups;
  }

  // Count days in a range
  function countDays(s,e){
    return Math.round((new Date(e+'T00:00:00')-new Date(s+'T00:00:00'))/86400000)+1;
  }

  // Build leave request records
  const requests=[];
  for(const k of Object.keys(personDays)){
    const [key,status]=k.split('|');
    const leaveType=STATUS_MAP[status];
    // key could be a user ID (UUID) or initials
    let user=null;
    if(key.length<=3){
      user=initialsMap[key]; // initials lookup
    } else {
      user=users.find(u=>u.id===key); // UUID lookup
    }
    if(!user){console.warn('No user found for key:',key);continue;}

    const ranges=groupRanges(personDays[k]);
    for(const [start,end] of ranges){
      requests.push({
        user_id:user.id,
        user_name:user.name||user.email,
        user_role:user.role||'desk',
        leave_type:leaveType,
        start_date:start,
        end_date:end,
        total_days:countDays(start,end),
        partial_day:false,
        partial_type:null,
        reason:'Migrated from roster',
        status:'approved',
        submitted_at:new Date().toISOString(),
        reviewed_at:new Date().toISOString(),
        reviewed_by:null,
        reviewed_by_name:'Roster Migration'
      });
    }
  }

  console.log(`Built ${requests.length} leave request records from roster`);
  if(!requests.length){console.log('Nothing to migrate.');return;}

  // Preview first 5
  console.table(requests.slice(0,5).map(r=>({name:r.user_name,type:r.leave_type,start:r.start_date,end:r.end_date,days:r.total_days})));

  if(!confirm(`Ready to insert ${requests.length} leave requests into ts_leave_requests (all status=approved). Proceed?`))return;

  // Insert in batches of 50
  const BATCH=50;
  let inserted=0;
  for(let i=0;i<requests.length;i+=BATCH){
    const batch=requests.slice(i,i+BATCH);
    const r=await fetch(SB+'/rest/v1/ts_leave_requests',{
      method:'POST',
      headers:{...SH,'Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(batch)
    });
    if(r.ok){inserted+=batch.length;console.log(`Inserted ${inserted}/${requests.length}...`);}
    else{console.error('Batch error:',r.status,await r.text());break;}
  }

  console.log(`✓ Migration complete — ${inserted} records inserted.`);
  console.log('Reload the Roster page to see approved leave overlaid on the grid.');
})();
