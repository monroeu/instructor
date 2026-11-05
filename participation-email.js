/* Personalized participation reporting and protected instructor-approved sending. */
(() => {
 'use strict';
 let recipients=[]; const $=id=>document.getElementById(id);
 const endpoint='https://irnrjzeejalbbqdrbzmj.supabase.co/functions/v1/participation-bulk-email';
 const selected=()=>[...$('mailRecipients').querySelectorAll('[data-mail-index]:checked')].map(x=>recipients[Number(x.dataset.mailIndex)]);
 function updateSelection(){const n=selected().length;$('mailSend').disabled=n===0;$('mailToggleAll').disabled=recipients.length===0;$('mailSelectVisible').disabled=recipients.length===0;$('mailClearSelection').disabled=recipients.length===0;$('mailToggleAll').checked=recipients.length>0&&n===recipients.length;$('mailToggleAll').indeterminate=n>0&&n<recipients.length;$('mailStats').textContent=`${recipients.length} eligible student-section reports. ${n} selected for a ONE-TIME email. Preview and selection do not send any emails.`;}
 async function serverPreview(r){const {data:{session:authSession}}=await sb.auth.getSession();if(!authSession)throw Error('Instructor session expired');const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authSession.access_token},body:JSON.stringify({action:'preview',section_id:r.section_id,enrollment_ids:[r.id]})});const result=await response.json();if(!response.ok)throw Error(result.error||'Server preview failed');const match=(result.sent||[]).find(x=>x.id===r.id);if(!match?.html)throw Error('No eligible server preview returned for this student.');return match.html;}

 const html=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=x=>String(x||'').toLowerCase();
 const studentRows=(r)=>{
   const roster=(r.roster_rows||[]),byUser=new Map(roster.filter(x=>x.linked_user_id).map(x=>[String(x.linked_user_id),x]));
   const sessions=new Map((r.sessions||[]).map(x=>[`${x.enrollment_id}::${x.assignment_offering_id}`,x]));
   return (r.enrollments||[]).filter(e=>e.status==='active').map(e=>{
     const rr=byUser.get(String(e.student_id)); if(!rr||norm(rr.roster_status)!=='active') return null;
     const email=rr.email||e.profile?.email||''; if(!email.includes('@')||email.includes('@student-id.'))return null;
     if(rr.is_test_account||rr.is_professor_test||norm(rr.expected_full_name).includes('professor test'))return null;
     const labs=(r.offerings||[]).filter(o=>o.published!==false).map(o=>{
       const ss=sessions.get(`${e.id}::${o.id}`),c=Array.isArray(ss?.completion)?ss.completion[0]:ss?.completion;
       const pct=ss?Number(c?.completion_percentage??0):0, completed=!!ss&&(c?.status==='complete'||c?.status==='overridden');
       return {title:o.assignment?.title||'Participation lab',completion:pct,score:c?.participation_grade??null,gradeKind:completed?'recorded':'provisional',status:completed?'Completed':ss?'In progress':'Not started',time:null};
     });
     return {id:e.id,name:rr.expected_full_name||e.profile?.full_name||'Student',email,section:'',labs};
   }).filter(Boolean);
 };
 async function load(){if(!session)throw Error('Please sign in.');const scope=$('mailScope').value, sections=(boot?.sections||[]).filter(x=>x.status==='active'&&x.term?.is_active!==false);
   const chosen=scope==='current'?sections.filter(s=>s.id===$('sectionSelect').value):sections;
   if(!chosen.length)throw Error('No active section selected.');
   const data=await Promise.all(chosen.map(async s=>{const [r,ro]=await Promise.all([api('results',{section_id:s.id}),api('roster_list',{section_id:s.id})]);r.roster_rows=ro.rows||[];return studentRows(r).map(x=>({...x,section:`${s.course?.code||'Course'} · ${s.section_code||''} · ${s.term?.name||''}`,section_id:s.id}));}));
   const uniq=new Map();for(const group of data)for(const r of group)uniq.set(`${r.id}:${r.section}`,r);
   recipients=[...uniq.values()].filter(r=>$('mailStatus').value==='all'||($('mailStatus').value==='complete'?r.labs.length>0&&r.labs.every(l=>l.status==='Completed'):r.labs.some(l=>l.status!=='Completed')));
   $('mailSend').disabled=true;
   $('mailToggleAll').checked=false;
   $('mailRecipients').replaceChildren();for(let i=0;i<recipients.length;i++){const r=recipients[i],tr=document.createElement('tr');tr.innerHTML=`<td><input type="checkbox" data-mail-index="${i}"></td><td>${html(r.name)}<div class="muted">${html(r.email)}</div></td><td>${html(r.section)}</td><td>${r.labs.filter(l=>l.status==='Completed').length}/${r.labs.length}</td><td>${r.labs.filter(l=>l.status!=='Completed').length}</td><td><button type="button" data-preview-index="${i}">Preview</button></td>`;$('mailRecipients').append(tr)}
   $('mailRecipients').querySelectorAll('[data-mail-index]').forEach(c=>c.onchange=updateSelection);
   $('mailRecipients').querySelectorAll('[data-preview-index]').forEach(b=>b.onclick=async()=>{const el=$('mailEmailPreview');el.textContent='Loading the exact email from the sending server (including recorded active time)...';try{el.innerHTML=await serverPreview(recipients[Number(b.dataset.previewIndex)]);}catch(e){el.textContent='Preview failed: '+e.message;}});
   $('mailEmailPreview').textContent='Select Preview beside a student. Server-generated preview exactly matches the sending template and includes authoritative recorded active time.';
   updateSelection();$('mailMessage').textContent='Recipient list ready. All students are UNSELECTED by default. Preview does not send email.';
 }
 async function sendSelected(){
   const chosen=selected();
   if(!chosen.length)throw Error('Select at least one student.');
   const sections=new Map();for(const x of chosen){if(!sections.has(x.section_id))sections.set(x.section_id,[]);sections.get(x.section_id).push(x)}
   const labels=[...new Set(chosen.map(r=>r.section))];
   if(!confirm(`ONE-TIME MASS EMAIL\n\nThis will immediately send ${chosen.length} individualized participation report(s) across ${labels.length} section(s):\n${labels.join('\n')}\n\nThis action does not alter any recurring schedules. Real student emails will be sent. Continue?`))return;
   if(prompt(`Type SEND NOW to authorize ${chosen.length} real student email(s).`)!=='SEND NOW')return;
   $('mailSend').disabled=true; $('mailMessage').textContent='One-time send in progress. Submitting selected reports in protected batches...';
   const batchKey='progress'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
   let sent=0,skipped=0,errors=[];
   try{
    const {data:{session:authSession}}=await sb.auth.getSession();if(!authSession)throw Error('Instructor sign-in expired.');
    for(const [sectionId,students] of sections){
      for(let j=0;j<students.length;j+=10){
       const group=students.slice(j,j+10);
       const response=await fetch('https://irnrjzeejalbbqdrbzmj.supabase.co/functions/v1/participation-bulk-email',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authSession.access_token},
        body:JSON.stringify({action:'send',section_id:sectionId,enrollment_ids:group.map(x=>x.id),batch_key:batchKey})
       });const result=await response.json();if(!response.ok)throw Error(result.error||`Server returned ${response.status}`);
       sent+=(result.sent||[]).length;skipped+=(result.skipped||[]).length;
       errors.push(...(result.skipped||[]).map(x=>x.reason));
       $('mailMessage').textContent=`Sent ${sent} of ${chosen.length} selected reports; ${skipped} skipped.`;
      }
    }
    $('mailMessage').textContent=`Delivery requests completed: ${sent} accepted by email provider; ${skipped} skipped. ${errors.slice(0,3).join('; ')} Review Supabase instructor action logs for individual outcomes.`;
   }finally{
    // Require a fresh roster load for every new manual batch. This prevents an
    // accidental repeat send after a partial success or a dismissed message.
    recipients=[];
    $('mailRecipients').replaceChildren();
    $('mailEmailPreview').textContent='For another one-time send, load a fresh roster preview and select recipients again.';
    updateSelection();
   }
 }

 async function loadAudit(){
  const id=$('sectionSelect').value;if(!id)throw Error('Select a course section first.');
  const {data:{session:authSession}}=await sb.auth.getSession();if(!authSession)throw Error('Instructor session required');
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authSession.access_token},body:JSON.stringify({action:'audit',section_id:id})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to load audit');
  $('mailAuditRows').replaceChildren();
  for(const e of data.events||[]){const tr=document.createElement('tr');tr.innerHTML=`<td>${html(e.created_at)}</td><td>${html(e.action)}</td><td>${html(e.target_email||'—')}</td><td>${html(e.provider_message_id||e.reason||'—')}</td>`;$('mailAuditRows').append(tr)}
  $('mailAuditMessage').textContent=`${(data.events||[]).length} recent audit entries for the selected section. No emails sent by refreshing.`;
 }
 async function professorTest(action){
  const msg=$('mailTestMessage');msg.textContent='Contacting protected test endpoint...';
  const {data:{session:authSession}}=await sb.auth.getSession();if(!authSession)throw Error('Instructor sign-in required');
  if(action==='test_send'||action==='test_bulk_send'){
   const bulk=action==='test_bulk_send';
   if(!confirm(bulk?'Send TWO real test messages ONLY to fkassoh@monroeu.edu? No students will receive them.':'Send ONE real test report to fkassoh@monroeu.edu? No students will receive it.'))return;
   const phrase=bulk?'SEND_TWO_TESTS':'SEND_TEST';
   if(prompt('Type '+phrase+' to authorize this controlled test')!==phrase)return;
  }
  const response=await fetch('https://irnrjzeejalbbqdrbzmj.supabase.co/functions/v1/participation-bulk-email',{
   method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authSession.access_token},
   body:JSON.stringify({action,confirm:action==='test_bulk_send'?'SEND_TWO_TESTS':action==='test_send'?'SEND_TEST':null})
  });const result=await response.json();if(!response.ok)throw Error(result.error||'Test request failed');
  if(action==='test_preview'){$('mailEmailPreview').innerHTML=result.html;msg.textContent=`Professor-only test preview ready. Destination: ${result.to}. ${result.records} saved sessions.`;}
  else if(action==='test_bulk_send'){const results=result.deliveries||[];msg.textContent=`Controlled bulk test: ${results.filter(x=>x.accepted).length}/${results.length} accepted by Resend. Recipient: ${result.destination}. Student recipients: ${result.student_recipients}. Check inbox and audit log.`;}
  else msg.textContent=`Test email accepted by provider for ${result.to}. Provider message ID: ${result.provider_message_id||'unavailable'}. Check inbox and audit log.`;
 }
 document.addEventListener('DOMContentLoaded' ,()=>{if(!$('mailPreview'))return;$('mailTestPreview').onclick=()=>professorTest('test_preview').catch(e=>{$('mailTestMessage').textContent='Test preview failed: '+e.message});$('mailTestSend').onclick=()=>professorTest('test_send').catch(e=>{$('mailTestMessage').textContent='Test delivery failed: '+e.message});$('mailBulkTest').onclick=()=>professorTest('test_bulk_send').catch(e=>{$('mailTestMessage').textContent='Controlled bulk test failed: '+e.message});$('mailPreview').onclick=()=>load().catch(e=>{$('mailMessage').textContent='Preview failed: '+e.message});$('mailSelectVisible').onclick=()=>{$('mailRecipients').querySelectorAll('[data-mail-index]').forEach(x=>x.checked=true);updateSelection()};$('mailClearSelection').onclick=()=>{$('mailRecipients').querySelectorAll('[data-mail-index]').forEach(x=>x.checked=false);updateSelection()};for(const id of ['mailScope','mailStatus'])$(id).onchange=()=>{recipients=[];$('mailRecipients').replaceChildren();$('mailEmailPreview').textContent='Load the new recipient list and select Preview beside a student.';$('mailMessage').textContent='Filters changed. Reload eligible recipients before sending.';updateSelection()};$('mailSend').onclick=()=>sendSelected().catch(e=>{$('mailMessage').textContent='Sending stopped: '+e.message});$('mailToggleAll').onchange=e=>{$('mailRecipients').querySelectorAll('[data-mail-index]').forEach(x=>x.checked=e.target.checked);updateSelection();};$('mailAuditLoad').onclick=()=>loadAudit().catch(e=>{$('mailAuditMessage').textContent='Audit failed: '+e.message})});
})();
