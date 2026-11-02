/* Instructor participation email module: read-only until server send endpoint is deployed and verified. */
(() => {
 'use strict';
 let recipients=[]; const $=id=>document.getElementById(id);
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
       const pct=ss?Number(c?.completion_percentage??0):0, completed=!!ss&&(pct>=100||c?.status==='complete'||c?.status==='overridden');
       return {title:o.assignment?.title||'Participation lab',completion:pct,score:c?.participation_grade??c?.score_percentage??null,gradeKind:completed?'recorded':'provisional',status:completed?'Completed':ss?'In progress':'Not started',time:null};
     });
     return {id:e.id,name:rr.expected_full_name||e.profile?.full_name||'Student',email,section:'',labs};
   }).filter(Boolean);
 };
 const emailBody=(r)=>{
   const done=r.labs.filter(x=>x.status==='Completed').length;
   const cells=r.labs.map(l=>`<tr><td>${html(l.title)}</td><td>${l.completion.toFixed(1)}%</td><td>${l.score==null?'Not recorded':html(l.score)+' / 100'+(l.gradeKind==='provisional'?' (provisional)':'')}</td><td>${l.status}</td><td>Not tracked centrally</td></tr>`).join('');
   return `<div style="font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#18362e;line-height:1.5"><header style="background:#123e32;color:white;padding:22px"><small>MONROE UNIVERSITY</small><h2>Your Participation Progress</h2><p>${html(r.section)}</p></header><div style="padding:20px"><p>Dear ${html(r.name.split(/\\s+/)[0])},</p><p>Here is your personalized participation status based on course records. You have completed <b>${done} of ${r.labs.length}</b> assigned labs.</p><table style="border-collapse:collapse;width:100%;font-size:13px" border="1" cellpadding="8"><thead><tr><th>Lab</th><th>Completion</th><th>Grade</th><th>Status</th><th>Recorded study time</th></tr></thead><tbody>${cells}</tbody></table><p style="font-size:12px">Grades for unfinished labs are provisional. Study time displays as unavailable until authoritative cross-session tracking is enabled; no zero time is inferred from missing records.</p><p>Return to your course labs to complete any outstanding activity.</p><p>Sincerely,<br><b>Professor Fomba Kassoh</b><br>Monroe University</p></div></div>`;
 };
 async function load(){if(!session)throw Error('Please sign in.');const scope=$('mailScope').value, sections=(boot?.sections||[]).filter(x=>x.status==='active'&&x.term?.is_active!==false);
   const chosen=scope==='current'?sections.filter(s=>s.id===$('sectionSelect').value):sections;
   if(!chosen.length)throw Error('No active section selected.');
   const data=await Promise.all(chosen.map(async s=>{const [r,ro]=await Promise.all([api('results',{section_id:s.id}),api('roster_list',{section_id:s.id})]);r.roster_rows=ro.rows||[];return studentRows(r).map(x=>({...x,section:`${s.course?.code||'Course'} · ${s.section_code||''} · ${s.term?.name||''}`}));}));
   const uniq=new Map();for(const group of data)for(const r of group)uniq.set(`${r.id}:${r.section}`,r);
   recipients=[...uniq.values()].filter(r=>$('mailStatus').value==='all'||($('mailStatus').value==='complete'?r.labs.length>0&&r.labs.every(l=>l.status==='Completed'):r.labs.some(l=>l.status!=='Completed')));
   $('mailStats').textContent=`${recipients.length} eligible student-section reports. No emails sent.`;
   $('mailRecipients').replaceChildren();for(let i=0;i<recipients.length;i++){const r=recipients[i],tr=document.createElement('tr');tr.innerHTML=`<td><input type="checkbox" data-mail-index="${i}" checked></td><td>${html(r.name)}<div class="muted">${html(r.email)}</div></td><td>${html(r.section)}</td><td>${r.labs.filter(l=>l.status==='Completed').length}/${r.labs.length}</td><td>${r.labs.filter(l=>l.status!=='Completed').length}</td><td><button type="button" data-preview-index="${i}">Preview</button></td>`;$('mailRecipients').append(tr)}
   $('mailRecipients').querySelectorAll('[data-preview-index]').forEach(b=>b.onclick=()=>{$('mailEmailPreview').innerHTML=emailBody(recipients[Number(b.dataset.previewIndex)])});
   if(recipients.length)$('mailEmailPreview').innerHTML=emailBody(recipients[0]);$('mailMessage').textContent='Preview generated from roster and recorded sessions. Delivery is intentionally disabled until protected server sending and audit logging are installed.';
 }
 document.addEventListener('DOMContentLoaded',()=>{if(!$('mailPreview'))return;$('mailPreview').onclick=()=>load().catch(e=>{$('mailMessage').textContent='Preview failed: '+e.message});$('mailToggleAll').onchange=e=>$('mailRecipients').querySelectorAll('[data-mail-index]').forEach(x=>x.checked=e.target.checked)});
})();
