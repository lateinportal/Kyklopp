(async function(){
const api=window.KykloppHubAPI;
let context;
try{context=await api.connect();}catch(error){
 const root=document.querySelector('#main');root.innerHTML='<section class="hub-error"><h1>Lernaufträge</h1><p></p><button class="btn" id="hub-reload">Erneut versuchen</button></section>';
 root.querySelector('p').textContent=error.message;root.querySelector('button').onclick=()=>location.reload();return;
}

'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],KEY='kyklopp-hub-ui-'+context.userId;
let profiles=context.profiles;
const paths={home:'<path d="m3 10 9-7 9 7v10H7V10m3 10v-7h4v7"/>',book:'<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2z"/>',gift:'<path d="M3 9h18v4H3zm2 4v8h14v-8M12 9v12M12 9C3 9 5 1 9 4l3 5c9 0 7-8 3-5z"/>',check:'<path d="m5 12 4 4L19 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/>',plus:'<path d="M12 4v16M4 12h16"/>',ticket:'<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zM15 6v3m0 2v2m0 2v3"/>',landscape:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m3 18 6-6 4 4 3-3 5 5"/>'};
const icon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.book)+'</svg>';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const coin=(large=false)=>'<span class="coin'+(large?' large':'')+'" aria-hidden="true">D</span>';
const voucherRewards = Array.from({length:9},(_,index)=>{
 const amount=10+index*5;
 return {id:'voucher'+amount,title:'Wunschgutschein ('+amount+' €)',amount,cost:amount*1000,type:'coupon',image:'reward-voucher-adjustable.webp'};
});
const parkRewards = Array.from({length:4},(_,index)=>{
 const amount=index+1;
 return {id:amount===1?'park':'park-'+amount,title:'Europa-Park · '+amount+(amount===1?' Ticket':' Tickets'),amount,cost:amount*75000,type:'coupon',image:'reward-park.webp'};
});
const rotatingRewards = [
 {id:'discord-tutoring',title:'Gratis Nachhilfestunde · 45 min',cost:5000,type:'coupon',image:'reward-discord-tutoring.webp'},
 {id:'thalia',title:'Thalia-Gutschein (15 €)',cost:15000,type:'coupon',image:'reward-thalia.webp'},
 {id:'wilhelma',title:'Wilhelma (Zoo) Stuttgart',cost:17000,type:'coupon',image:'reward-wilhelma.webp'},
 {id:'amazon',title:'Amazon-Gutschein (20 €)',cost:20000,type:'coupon',image:'reward-amazon.webp'},
 {id:'cinema',title:'Kino-Gutschein',cost:30000,type:'coupon',image:'reward-cinema-popcorn.webp'},
 {id:'baking',title:'Backkurs in Stuttgart',cost:35000,type:'coupon',image:'reward-baking.webp'},
 {id:'switch-rental',title:'Nintendo Switch ausleihen (30 Tage)',cost:50000,type:'coupon',image:'reward-switch-hands.webp'},
 {id:'tripsdrill',title:'Tripsdrill-Ticket',cost:75000,type:'coupon',image:'reward-tripsdrill.webp'}
];
const rewards = [...voucherRewards,...parkRewards,...rotatingRewards];
const rewardChoices = {voucher:voucherRewards[0],park:parkRewards[0]};
const specialReward = id => rotatingRewards.find(reward=>reward.id===state.specialRewards?.[id])??rotatingRewards[0];
const formatDenare = value => value.toLocaleString('de-DE');
const legacyRewards=[{id:'tutoring45',title:'Kostenlose Nachhilfestunde (45 Min.)',cost:25000,type:'coupon',image:'reward-tutoring-pencil.webp'},{id:'split-flight',title:'Flugticket nach Split (Kroatien) · 100 €',cost:200000,type:'coupon',image:'reward-split-flight.webp'},{id:'switch',title:'Nintendo-Switch-Konsole',cost:500000,type:'coupon',image:'reward-switch-hands.webp'},{id:'vfb',title:'VfB-Ticket',cost:80000,type:'coupon',image:'reward-vfb.webp'},{id:'tutoring90',title:'Kostenlose Nachhilfestunde (90 Min.)',cost:50000,type:'coupon',image:'reward-tutoring-pencil.webp'},{id:'avatar',title:'Kloppo mit Basecap',description:'Ein neuer Look für dein .',cost:60,type:'digital',image:'jonas.webp'},{id:'background',title:'Abendblauer Hintergrund',description:'Ein Hintergrund für deine persönliche Übersicht.',cost:40,type:'digital',icon:'landscape'},{id:'coupon',title:'Dein Wunschgutschein',description:'Ein kleiner Wunsch, den du mit deiner Lehrkraft vereinbarst.',cost:100,type:'coupon',icon:'ticket'}];
let state=JSON.parse(JSON.stringify(context.state));
try{state.walletSnapshots=JSON.parse(localStorage.getItem(KEY))??{};}catch{state.walletSnapshots={};}
let role=context.teacher?'teacher':'student',profile=context.userId,studentSection='tasks',rewardsReturnSection='top',denareReturnSection='top',teacherDenareOwner=null,teacherDenareReturn=null,teacherSection='students',managedStudent=null,managementTab='tasks',lastFocus=null,toastTimer;
let walletTimer, walletAnimationVersion=0;
const who=id=>profiles.find(p=>p.id===id),taskBy=id=>state.tasks.find(t=>t.id===id&&!t.deletedAt),rewardBy=id=>rewards.find(r=>r.id===id)??legacyRewards.find(r=>r.id===id),allMyTasks=id=>state.tasks.filter(t=>t.profile===id),myTasks=id=>allMyTasks(id).filter(t=>!t.deletedAt);
const earned=id=>allMyTasks(id).filter(t=>t.status==='approved').reduce((n,t)=>n+(t.awardedPoints??t.points),0)+(state.bonuses??[]).filter(entry=>entry.profile===id).reduce((sum,entry)=>sum+entry.amount,0);
const reserved=id=>state.purchases.filter(p=>p.profile===id).reduce((n,p)=>n+p.cost,0),available=id=>earned(id)-reserved(id);
// This code is inserted into the shared UI build after the authenticated context is loaded.
let pollTimer;
function rememberWallet(){try{localStorage.setItem(KEY,JSON.stringify(state.walletSnapshots??{}));}catch{}}
async function persist(next){
 document.querySelector('#main').setAttribute('aria-busy','true');
 document.body.classList.add('hub-saving');
 try{
  const snapshot=await api.save(next);
  Object.assign(next,JSON.parse(JSON.stringify(snapshot.state)));
  profiles=snapshot.profiles;
  rememberWallet();
 }finally{document.querySelector('#main').setAttribute('aria-busy','false');document.body.classList.remove('hub-saving');}
}
async function save(){await persist(state);}
function recover(error){
 const wallets=state.walletSnapshots;
 state={...JSON.parse(JSON.stringify(api.context.state)),walletSnapshots:wallets};
 profiles=api.context.profiles;
 if(document.querySelector('#modal').open)closeModal();
 render();toast(error.message||'Die Änderung konnte nicht gespeichert werden.');
}
function guardHandlers(){
 document.querySelectorAll('button,form,input,select,#main').forEach(element=>{
  for(const property of ['onclick','onsubmit','onchange']){
   const handler=element[property];
   if(!handler||handler.hubGuard)return;
   const guarded=function(event){
    if(api.working){event.preventDefault();return;}
    try{const result=handler.call(this,event);if(result?.catch)return result.catch(recover);return result;}
    catch(error){recover(error);}
   };
   guarded.hubGuard=true;element[property]=guarded;
  }
 });
}
function scheduleGuards(){queueMicrotask(guardHandlers);}
async function poll(){
 try{
  if(!document.hidden&&!api.working&&!document.querySelector('#modal').open&&!document.activeElement?.matches('input,textarea,select')){
   const revision=api.context.revision,people=JSON.stringify(api.context.profiles);
   const snapshot=await api.load();
   if(snapshot.revision!==revision||JSON.stringify(snapshot.profiles)!==people){
    const wallets=state.walletSnapshots;
    state={...JSON.parse(JSON.stringify(snapshot.state)),walletSnapshots:wallets};profiles=snapshot.profiles;render();
   }
  }
 }catch{ /* The last confirmed state remains visible while disconnected. */ }
 finally{pollTimer=setTimeout(poll,30000);}
}
function reportModal(){
 if(window.parent!==window)window.parent.postMessage({type:'kyklopp-hub-modal',open:document.querySelector('#modal').open},location.origin);
}
function reportHeight(){
 if(window.parent!==window)window.parent.postMessage({type:'kyklopp-hub-height',height:Math.ceil(document.querySelector('#main').scrollHeight+45)},location.origin);
}
window.addEventListener('beforeunload',()=>clearTimeout(pollTimer));
window.addEventListener('online',()=>{clearTimeout(pollTimer);poll();});
window.addEventListener('click',event=>{
 if(window.parent!==window&&event.target.closest('[data-target],[data-student-back],[data-teacher-denare-back],[data-denare-history]'))window.parent.postMessage({type:'kyklopp-hub-top'},location.origin);
},true);
if(window.ResizeObserver)new ResizeObserver(reportHeight).observe(document.querySelector('#main'));

function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3600)}
function person(id){const p=who(id);return '<div class="person"><img src="../'+esc(p.image)+'" alt=""><div>'+esc(p.name)+'</div></div>';}
function dateLabel(date){return date?new Date(date+'T12:00:00').toLocaleDateString('de-DE',{day:'numeric',month:'short'}):'Ohne Termin'}
function modal(title,body,actions){lastFocus=document.activeElement;$('#modal').classList.toggle('denare-dialog',body.includes('class="denare-history"'));$('#modal').innerHTML='<h2 id="modal-title" tabindex="-1">'+esc(title)+'</h2><div class="modal-body">'+body+'</div><div class="dialog-actions">'+actions+'</div>';$('#modal').onclick=dismissBackdrop;$('#modal').showModal();scheduleGuards();reportModal();$('#modal-title').focus({preventScroll:true});$$('[data-close]').forEach(b=>b.onclick=closeModal)}
function dismissBackdrop(event){
 const dialog=$('#modal');
 if(event.target!==dialog)return;
 const rect=dialog.getBoundingClientRect();
 if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeModal();
}
function closeModal(){$('#modal').close();lastFocus?.isConnected&&lastFocus.focus({preventScroll:true})}
function render(){
 clearTimeout(walletTimer);
 walletAnimationVersion++;
 const student=role==='student';
 const navigation=student?[]:[['people','Schüler','students'],['book','Abgaben','reviews'],['gift','Einlösungen','requests']];
 $('#navigation').innerHTML=navigation.map(([i,text,target],idx)=>'<button class="'+(target===(student?studentSection:teacherSection)?'active':'')+'" data-target="'+target+'">'+icon(i)+'<span>'+text+'</span></button>').join('');$('#main').innerHTML=student?studentPage():teacherPage();
 $$('[data-target]').forEach(b=>b.onclick=()=>{if(role==='student'){if(b.dataset.target==='rewards'&&studentSection!=='rewards')rewardsReturnSection=studentSection;studentSection=b.dataset.target;}else {teacherSection=b.dataset.target;managedStudent=null;}render();window.scrollTo(0,0)});
 $('#main').onchange = async ({target}) => {
  if(role==='teacher'&&target.dataset.specialReward&&who(target.dataset.specialReward)){
   if(!rotatingRewards.some(reward=>reward.id===target.value))return;
   state.specialRewards??={};
   state.specialRewards[target.dataset.specialReward]=target.value;
   await save();
   toast('Belohnung für '+who(target.dataset.specialReward).name+' gespeichert.');
   return;
  }
  const {checkTask} = target.dataset;
  const task = taskBy(checkTask);
  if (role!=='student' || !task || task.profile!==profile || !['open','revise','missing'].includes(task.status)) return;
  if (checkTask && target.checked) await submitTask(checkTask);
 };
 $('#main').oninput=({target})=>{
  const kind=target.dataset.rewardChoice;
  const options=kind==='voucher'?voucherRewards:null;
  const reward=options?.find(item=>item.amount===Number(target.value));
  if(role!=='student'||studentSection!=='rewards'||!reward)return;
  rewardChoices[kind]=reward;
  target.parentElement.style.setProperty("--reward-fill", rewardFill(reward,kind));
  $('#reward-amount-'+kind).textContent=rewardAmount(reward,kind);
  if(kind==='voucher')$('#voucher-image-amount').textContent=reward.amount+' €';
  $('#reward-price-'+kind).textContent=formatDenare(reward.cost)+' Denare';
  const button=$('#reward-button-'+kind);
  button.dataset.reward=reward.id;
  button.disabled=available(profile)<reward.cost;
 };
 const moreCompleted = $('#completed-more');
 if(moreCompleted){
  const completed = completedTasks(myTasks(profile));
  let visibleCount = completedPageSize;
  moreCompleted.onclick=()=>{
   const next=completed.slice(visibleCount,visibleCount+completedPageSize);
   $('#completed-task-rows').insertAdjacentHTML('beforeend',next.map(taskCard).join(''));
   visibleCount+=next.length;
   moreCompleted.hidden=visibleCount>=completed.length;
  };
 }
 $$('[data-task-complete]').forEach(b=>b.onclick=()=>studentFeedback(b.dataset.taskComplete));
 $$('[data-task-question]').forEach(b=>b.onclick=()=>studentFeedback(b.dataset.taskQuestion,true));
 $$('[data-answer-question]').forEach(b=>b.onclick=()=>answerTaskQuestion(b.dataset.answerQuestion));
 $$('[data-review]').forEach(b=>b.onclick=()=>reviewTask(b.dataset.review));$$('[data-reward]').forEach(b=>b.onclick=()=>buyReward(b.dataset.reward));$$('[data-request]').forEach(b=>b.onclick=()=>confirmRequest(b.dataset.request));$$('[data-new-task]').forEach(b=>b.onclick=()=>newTask());
 $$('[data-teacher-denare-back]').forEach(button=>button.onclick=()=>{if(role!=='teacher'||!teacherDenareReturn)return;({teacherSection,managedStudent,managementTab}=teacherDenareReturn);render();window.scrollTo(0,0);});
 $$('[data-student-back]').forEach(button=>button.onclick=()=>{if(role!=='student')return;studentSection=button.dataset.studentBack;render();window.scrollTo(0,0);});
 $$('[data-denare-history]').forEach(button=>button.onclick=()=>showDenareHistory(button.dataset.denareHistory||profile));
 $$('[data-grant-denare]').forEach(button=>button.onclick=()=>grantDenare());
 $$('[data-deduct-denare]').forEach(button=>button.onclick=()=>grantDenare(true));
 $$('[data-open-student]').forEach(button=>button.onclick=()=>{
  if(role!=='teacher'||!who(button.dataset.openStudent))return;
  managedStudent=button.dataset.openStudent;
  managementTab=button.dataset.openManagementTab||(button.dataset.openSubmissions==='true'?'submissions':'tasks');
  teacherSection='students';
  render();window.scrollTo(0,0);
 });
 $$('[data-management-tab]').forEach(button=>{
  button.onclick=()=>{
   if(role!=='teacher'||!who(managedStudent))return;
   managementTab=button.dataset.managementTab;render();
   $('[data-management-tab="'+managementTab+'"]').focus({preventScroll:true});
  };
  button.onkeydown=event=>{
   const tabs=$$('[data-management-tab]'),index=tabs.indexOf(button);
   const next={ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
   if(next===undefined)return;
   event.preventDefault();tabs[next].onclick();
  };
 });
 $$('[data-delete-task]').forEach(b=>b.onclick=()=>deleteTask(b.dataset.deleteTask));
 $$('[data-edit-task]').forEach(b=>b.onclick=()=>newTask(taskBy(b.dataset.editTask)));
 if(student)animateWallet();scheduleGuards();queueMicrotask(reportHeight);
}
const grades = [['1',3],['2',2.5],['3',2],['4',1.5],['5',1],['6',0.5]];
function taskStars(task) {
 const grade = {'1–2':'2','2–3':'4','3–4':'6'}[task.grade] ?? task.grade;
 const stars = grades.find(([value])=>value===grade)?.[1];
 const label = stars===undefined?'Noch keine Sternbewertung':stars.toLocaleString('de-DE')+' Sterne';
 return `<span class="check-stars" role="img" aria-label="${label}"><span aria-hidden="true" style="width:${(stars??0)/3*100}%">★★★</span>★★★</span>`;
}
const isFinished = task => task.status==='approved' && task.studentReview==='complete';
function taskSection(task) {
 if(isFinished(task))return 'done';
 return ['open','missing','revise'].includes(task.status)?'tasks':'submissions';
}

async function studentFeedback(id, question=false) {
 const task=taskBy(id);
 if(role!=='student'||task?.profile!==profile||task.status!=='approved'||isFinished(task)||task.studentReview==='question')return;
 if(!question){
  task.studentReview='complete';
  task.completedAt=Date.now();
  await save();
  render();
  return;
 }
 modal('Rückfrage stellen','<label class="feedback-label">Was möchtest du klären?<textarea id="task-question" rows="3" maxlength="800"></textarea></label>','<button class="btn secondary" data-close>Abbrechen</button><button class="btn" id="send-task-question">Rückfrage speichern</button>');
 $('#send-task-question').onclick=async()=>{
  const message=$('#task-question').value.trim();
  if(!message||task.studentReview==='question')return;
  task.question=message;
  task.answer='';
  task.studentReview='question';
  await save();
  closeModal();
  render();
 };
}

async function answerTaskQuestion(id) {
 const task=taskBy(id);
 if(role!=='teacher'||task?.studentReview!=='question')return;
 modal('Rückfrage beantworten','<p>'+esc(task.question)+'</p><label class="feedback-label">Antwort<textarea id="task-question-answer" rows="3" maxlength="800"></textarea></label>','<button class="btn secondary" data-close>Abbrechen</button><button class="btn" id="save-task-answer">Antwort speichern</button>');
 $('#save-task-answer').onclick=async()=>{
  const answer=$('#task-question-answer').value.trim();
  if(!answer||task.studentReview!=='question')return;
  task.answer=answer;
  task.studentReview='feedback';
  await save();
  closeModal();
  render();
 };
}


function webAddress(value) {
 try{
  const url=new URL(/^www\./i.test(value)?'https://'+value:value);
  return ['http:','https:'].includes(url.protocol)&&url.hostname?url.href:null;
 }catch{return null;}
}
function linkedText(value,format=false) {
 const links=[];
 const withMarkdown=String(value??'').replace(/\u0000/g,'').replace(/\[([^\]\n]+)\]\(((?:https?:\/\/|www\.)[^\s<>"']*?(?:\([^\s<>"']*\)[^\s<>"']*?)?)\)/gi,(match,label,address)=>{
  const href=webAddress(address);
  if(!href)return match;
  links.push('<a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>');
  return '\u0000'+(links.length-1)+'\u0000';
 });
 const text=withMarkdown.replace(/(?:https?:\/\/|www\.)[^\s<>"'*]+/gi,match=>{
  let address=match.replace(/[.,;:!?]+$/,'');
  while(address.endsWith(')')&&(address.match(/\)/g)??[]).length>(address.match(/\(/g)??[]).length)address=address.slice(0,-1);
  const href=webAddress(address);
  if(!href)return match;
  links.push('<a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(address)+'</a>');
  return '\u0000'+(links.length-1)+'\u0000'+match.slice(address.length);
 });
 let html=esc(text);
 if(format)html=html.replace(/\*\*([^\n]+?)\*\*/g,'<strong>$1</strong>').replace(/__([^\n]+?)__/g,'<u>$1</u>').replace(/\*([^*\n]+?)\*/g,'<em>$1</em>');
 return html.replace(/\n/g,'<br>').replace(/\u0000(\d+)\u0000/g,(_,index)=>links[Number(index)]);
}
function formattedFeedback(value) {return linkedText(value,true);}
function feedbackToolbar() {
 return '<div class="feedback-tools" role="group" aria-label="Feedback formatieren">'+
 [['**','Fett','<strong>F</strong>'],['*','Kursiv','<em>K</em>'],['__','Unterstrichen','<u>U</u>']].map(([marker,label,text])=>
 '<button type="button" class="btn secondary" data-feedback-format="'+marker+'" aria-label="'+label+'" title="'+label+'">'+text+'</button>').join('')+'</div>';
}
function bindFeedbackToolbar() {
 $$('[data-feedback-format]').forEach(button=>button.onclick=()=>{
  const field=$('#feedback'),start=field.selectionStart,end=field.selectionEnd,marker=button.dataset.feedbackFormat;
  const selected=field.value.slice(start,end);
  field.setRangeText(marker+selected+marker,start,end,'select');
  field.focus({preventScroll:true});
  field.setSelectionRange(start+marker.length,start+marker.length+selected.length);
 });
}
function worksheetIcon(){
 return '<svg class="worksheet-icon" viewBox="0 0 24 28" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2h10l6 6v17a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm10 0v7h6"/><path stroke-width="1.3" d="m6 21 2.5-7 2.5 7m-4-2h3m4-5v7h2.3a1.8 1.8 0 0 0 0-3.6H14m0-3.4h2.1a1.7 1.7 0 0 1 0 3.4"/></svg>';
}
function attachmentLinks(task) {
 const files=(task.attachments??[]).map(file=>'<button type="button" class="link" data-open-attachment="'+esc(file.id)+'">'+worksheetIcon()+' '+esc(file.name)+'</button>').join('');
 const links=(task.links??[]).filter(link=>webAddress(link)).map(link=>'<a class="link" href="'+esc(webAddress(link))+'" target="_blank" rel="noopener noreferrer">'+esc(link)+'</a>').join('');
 return files||links?'<div class="task-attachments">'+files+links+'</div>':'';
}
async function openAttachment(id) {
 const permitted=state.tasks.some(task=>!task.deletedAt&&(role==='teacher'||task.profile===profile)&&(task.attachments??[]).some(file=>file.id===id));
 if(!permitted)return;
 try{
  const url=await api.fileURL(id);
  const link=document.createElement('a');
  link.href=url;link.target='_blank';link.rel='noopener';link.click();

 }catch{toast('Die Datei ist in dieser lokalen Vorschau nicht verfügbar.');}
}

function deadlineLabel(task,now=new Date()) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(task.due??''))return '';
 const today=now.toLocaleDateString('sv-SE',{timeZone:'Europe/Berlin'});
 const days=(Date.parse(task.due+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000;
 const outstanding=['open','missing','revise'].includes(task.status)&&!isFinished(task);
 const overdue=outstanding&&days<0;
 const soon=outstanding&&days>=0&&days<=2;
 const date=task.due.slice(8,10)+'.'+task.due.slice(5,7)+'.';
 return '<span class="deadline'+(overdue?' deadline-overdue':soon?' deadline-soon':'')+'" title="Abgabetermin'+(overdue?' · '+date:'')+'">'+(overdue?'Überfällig':'Bis '+date)+'</span>';
}
function submissionLabel(task) {
 if(!task.submittedAt)return '';
 const date=new Date(task.submittedAt);
 if(Number.isNaN(date.getTime()))return '';
 const day=date.toLocaleDateString('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit',year:'numeric'});
 const time=date.toLocaleTimeString('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit'});
 return '<span class="submission-time"><time datetime="'+esc(date.toISOString())+'">Abgegeben am '+esc(day)+' um '+esc(time)+' Uhr</time></span>';
}
function taskCard(t) {
 const editable = ['open','revise','missing'].includes(t.status);
 const status = {open:'Offen',submitted:'Wartet auf Rückmeldung',approved:isFinished(t)?(t.feedback?.trim()?'Feedback':''):t.studentReview==='question'?'Rückfrage offen':'Korrigiert!',revise:'Bitte überarbeiten',missing:'Abgabe fehlt · Bitte über Discord schicken'}[t.status];
 const labelTone = {missing:'red',revise:'red',submitted:'yellow'}[t.status]
  || (t.status==='approved'&&!isFinished(t)&&t.studentReview!=='question'?'green':'');
 return `<article class="task-row checklist-row">
  ${isFinished(t)?'<span class="check-done" role="img" aria-label="Vollständig erledigt"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m3 8 3.3 3.3L13 4.7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>':`<label class="check-submit"><input type="checkbox" data-check-task="${esc(t.id)}" ${editable?'':'checked disabled'} aria-label="${esc(t.reference)} über Discord abgegeben"></label>`}
  <div class="check-title">
   <strong>${linkedText(t.reference)}</strong>
   ${!isFinished(t)&&t.description?.trim()?'<small class="check-instruction">'+linkedText(t.description.trim())+'</small>':''}
   ${attachmentLinks(t)}
   <div class="check-facts">
    ${isFinished(t)?'':`<span title="Geplante Dauer">${t.plannedMinutes??'–'} min</span>
    ${deadlineLabel(t)}`}
    ${t.status==='approved' && t.grade ? `<span class="check-rating"><span class="check-rating-label">Bewertung</span> ${taskStars(t)}</span>` : ''}
    <span title="${t.status==='approved'?'Erhaltene Denare':'Mögliche Denare'}">${t.status==='approved'?(t.awardedPoints??t.points)+'/'+t.points:t.points} Denare</span>
   </div>
   ${submissionLabel(t)}
  </div>
  <div class="check-meta check-feedback">
   ${!status||t.status==='open'?'':'<span class="check-result'+(labelTone?' check-status check-status-'+labelTone:'')+'">'+status+'</span>'}
   ${t.feedback?'<p>'+formattedFeedback(t.feedback)+'</p>':''}
   ${t.question?'<p><strong>Deine Rückfrage</strong><br>'+esc(t.question)+'</p>':''}
   ${t.answer?'<p><strong>Antwort deiner Lehrkraft</strong><br>'+esc(t.answer)+'</p>':''}
  </div>
  <div class="check-meta check-finish">
   ${t.status==='approved'&&!isFinished(t)&&t.studentReview!=='question'?'<button type="button" class="check-finish-button check-question-button" aria-label="Rückfrage stellen" title="Rückfrage stellen" data-task-question="'+esc(t.id)+'">?</button>':''}
   ${t.status==='approved'&&!isFinished(t)&&t.studentReview!=='question'?'<button type="button" class="check-finish-button" data-task-complete="'+esc(t.id)+'" aria-label="Feedback gelesen und Aufgabe vollständig erledigt" title="Feedback gelesen und Aufgabe vollständig erledigt">✓</button>':''}
  </div>
 </article>`;
}


function denareHistory(id){
 const credits=(state.bonuses??[]).filter(item=>item.profile===id).map(item=>({
  title:item.reason,amount:item.amount,createdAt:item.createdAt,status:item.amount<0?'Abzug':'Gutschrift'
 }));
 const tasks=allMyTasks(id).filter(task=>task.status==='approved').map(task=>({
  title:task.reference,amount:task.awardedPoints??task.points,createdAt:task.awardedAt,status:'Lernauftrag'
 }));
 const purchases=state.purchases.filter(item=>item.profile===id).map(item=>({
  title:rewardBy(item.reward)?.title??'Belohnung',amount:-item.cost,redemption:true,
  createdAt:item.createdAt??(/^p-\d+$/.test(item.id)?Number(item.id.slice(2)):null),
  status:item.status==='pending'?'Angefragt · Denare reserviert':'Eingelöst',pending:item.status==='pending'
 }));
 const entries=[...credits,...tasks,...purchases].sort((a,b)=>(new Date(b.createdAt??0).getTime()||0)-(new Date(a.createdAt??0).getTime()||0));
 const history=entries.length?'<ul class="denare-history">'+entries.map(entry=>{
  const date=entry.createdAt?new Date(entry.createdAt):null;
  const dateText=date&&!Number.isNaN(date.getTime())?date.toLocaleDateString('de-DE'):'';
  const debit=entry.amount<0;
  return '<li><div><strong>'+esc(entry.title)+'</strong><small>'+esc(dateText)+'</small><span class="check-status check-status-'+(entry.redemption?'yellow':debit?'red':'green')+'">'+esc(entry.status)+'</span></div><strong class="denare-history-cost '+(entry.redemption?'denare-redemption':debit?'denare-debit':'denare-credit')+'">'+(debit?'−':'+')+formatDenare(Math.abs(entry.amount))+' Denare</strong></li>';
 }).join('')+'</ul>':'<p>Hier gibt es noch keine Denare-Buchungen.</p>';
 return history;
}


function studentBack(section){
 const title={top:'Übersicht',tasks:'Lernaufträge',rewards:'Belohnungen',denare:'Denare'}[section]||'Lernaufträge';
 return '<button type="button" class="hub-back" data-student-back="'+esc(section)+'">← '+title+'</button>';
}
function showDenareHistory(id=profile){
 if(!who(id)||(role!=='teacher'&&id!==profile))return;
 if(role==='student'){
  if(studentSection!=='denare')denareReturnSection=studentSection;
  studentSection='denare';render();window.scrollTo(0,0);return;
 }
 if(teacherSection!=='denare')teacherDenareReturn={teacherSection,managedStudent,managementTab};
 teacherDenareOwner=id;teacherSection='denare';render();window.scrollTo(0,0);
}
function denarePage(id=profile,back=studentBack(denareReturnSection)){
 return back+'<header class="page-head"><div><h1>Denare</h1>'+(role==='teacher'?'<p class="quiet-subtitle">'+esc(who(id).name)+'</p>':'')+'</div></header><section class="quiet-panel denare-page"><div class="denare-page-balance"><img src="assets/denar-caesar-v2.png" alt=""><div><span>Verfügbar</span><strong>'+formatDenare(available(id))+' Denare</strong></div></div><h2>Gutschriften und Einlösungen</h2>'+denareHistory(id)+'</section>';
}

function walletSnapshot(id){
 const entries={};
 allMyTasks(id).filter(task=>task.status==='approved').forEach(task=>{
  entries['task:'+task.id]={amount:task.awardedPoints??task.points,type:'credit',label:'Lernauftrag'};
 });
 (state.bonuses??[]).forEach((entry,index)=>{
  if(entry.profile===id)entries['bonus:'+index]={amount:entry.amount,type:entry.amount<0?'debit':'credit',label:entry.amount<0?'Abgezogen':'Gutgeschrieben'};
 });
 state.purchases.filter(item=>item.profile===id).forEach(item=>{
  entries['purchase:'+item.id]={amount:-item.cost,type:'redemption',label:item.status==='pending'?'Reserviert':'Eingelöst'};
 });
 return {balance:available(id),entries};
}
function animateWallet(){
 const current=walletSnapshot(profile);
 state.walletSnapshots??={};
 const previous=state.walletSnapshots[profile];
 if(!previous){
  state.walletSnapshots[profile]=current;
  rememberWallet();return;
 }
 const changes=Object.keys({...previous.entries,...current.entries}).map(key=>{
  const entry=current.entries[key],old=previous.entries[key];
  const amount=(entry?.amount??0)-(old?.amount??0);
  return {amount,type:amount>0?'credit':entry?.type??'debit',label:entry?.label??'Korrigiert'};
 }).filter(change=>change.amount!==0);
 state.walletSnapshots[profile]=current;
 if(!changes.length)return;
 rememberWallet();
 const balance=$('#wallet-balance'),notice=$('#wallet-change');
 const version=walletAnimationVersion;
 let index=0,total=previous.balance;
 balance.textContent=formatDenare(total);
 const next=()=>{
  if(version!==walletAnimationVersion)return;
  const change=changes[index];
  if(!change){
   balance.textContent=formatDenare(current.balance);
   notice.textContent='';notice.className='wallet-change';return;
  }
  notice.className='wallet-change';
  notice.textContent=(change.amount>0?'+':'−')+formatDenare(Math.abs(change.amount))+' Denare · '+change.label;
  notice.className='wallet-change wallet-change-'+change.type;
  walletTimer=setTimeout(()=>{
   if(version!==walletAnimationVersion)return;
   total+=change.amount;balance.textContent=formatDenare(total);
   notice.className='wallet-change';
   index++;
   walletTimer=setTimeout(next,150);
  },2300);
 };
 next();
}

function wallet(showRewards=false){
 const balance='<button type="button" class="quiet-wallet" data-denare-history aria-label="Denare und bisherige Einlösungen ansehen"><img class="denar-icon" src="assets/denar-caesar-v2.png" alt=""><span class="balance" id="wallet-balance">'+formatDenare(available(profile))+'</span><span>Denare</span></button>';
 const gift='<button type="button" class="quiet-wallet reward-link" data-target="rewards" aria-label="Belohnungen ansehen" title="Belohnungen ansehen"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16v9H4zM3 8h18v4H3zM12 8v13M12 8H8.5A2.5 2.5 0 1 1 11 5.5L12 8Zm0 0h3.5A2.5 2.5 0 1 0 13 5.5L12 8Z"/></svg></button>';
 return '<div class="wallet-actions"><div class="wallet-with-change">'+balance+'<span class="wallet-change" id="wallet-change" role="status" aria-live="polite"></span></div>'+(showRewards?gift:'')+'</div>';
}
const completedPageSize = 5;
function completedTasks(tasks) {
 return tasks.filter(isFinished).reverse().sort((a,b)=>(b.completedAt??0)-(a.completedAt??0));
}

function studentPage(){
 const p=who(profile),tasks=myTasks(profile),active=tasks.filter(t=>!isFinished(t)),todo=active.filter(t=>taskSection(t)==='tasks'),feedbackTasks=active.filter(t=>taskSection(t)==='submissions'),done=completedTasks(tasks);
 if(studentSection==='denare')return denarePage();
 if(studentSection==='rewards')return studentBack(rewardsReturnSection)+'<header class="page-head"><div><h1>Belohnungen</h1><p class="quiet-subtitle">Mit deinen verdienten Denaren kannst du dir eine Belohnung aussuchen.</p></div>'+wallet()+'</header><div class="reward-grid">'+rewardCard(rewardChoices.voucher,'voucher')+rewardCard(rewardChoices.park,'park')+rewardCard(specialReward(profile),'special')+'</div><p class="quiet-foot">Sprich die Belohnung zuerst mit deinen Eltern ab. Danach kannst du sie bei deiner Lehrkraft anfragen.</p>';
 const overview=studentSection==='top',shown=overview?todo.slice(0,2):todo;
 return '<header class="page-head"><div><h1>'+(overview?'Hallo, '+esc(p.name)+'!':'Lernaufträge')+'</h1><p class="quiet-subtitle">'+(overview?'Schicke deine Lösungen über Discord und setze dann den Haken. Denare erhältst du nach der Korrektur.':'Schicke deine Lösungen über Discord und setze dann den Haken. Denare erhältst du nach der Korrektur.')+'</p></div>'+wallet(true)+'</header><section class="quiet-panel" id="tasks"><div class="quiet-panel-heading"><h2>'+(overview?'Aufgaben':'Lernaufträge')+'</h2>'+(overview&&active.length?'<button class="link" data-target="tasks">Alle Aufgaben →</button>':'')+'</div>'+(shown.length?shown.map(taskCard).join(''):'<div class="quiet-empty">'+'Heute ist noch nichts offen.'+'</div>')+'</section>'+ (feedbackTasks.length?'<section class="quiet-panel waiting-panel" aria-labelledby="waiting-title"><div class="quiet-panel-heading"><h2 id="waiting-title">Rückmeldung</h2></div>'+feedbackTasks.map(taskCard).join('')+'</section>':'')+(done.length?'<details class="quiet-history"><summary>Erledigt · '+done.length+' Aufgaben</summary><div class="quiet-panel" id="completed-task-rows">'+done.slice(0,completedPageSize).map(taskCard).join('')+'</div>'+(done.length>completedPageSize?'<button class="link completed-more" id="completed-more">Weitere anzeigen</button>':'')+'</details>':'')+'';
}
function rewardAmount(reward,kind){
 return kind==='voucher'?reward.amount+' €':reward.amount+(reward.amount===1?' Ticket':' Tickets');
}
function rewardFill(reward,kind) {
 const progress = kind==="voucher" ? (reward.amount-10)/40 : (reward.amount-1)/3;
 if(progress===1)return "100%";
 const start = kind==="voucher" ? 21 : 9;
 const offset = start*(1-progress)-9*progress;
 return `calc(${progress*100}% + ${offset}px)`;
}
function rewardCard(reward,kind) {
 const adjustable=kind==='voucher';
 const title=kind==='voucher'?'Wunschgutschein':reward.title;
 return `<article class="reward-card">
  ${kind==='special'?'<span class="reward-special-badge">Nur für kurze Zeit</span>':''}
  <div class="reward-art">
   ${kind==='voucher'?'<div class="voucher-art"><img src="assets/'+reward.image+'" alt=""><span id="voucher-image-amount" aria-hidden="true">'+reward.amount+' €</span></div>':'<img src="assets/'+reward.image+'" alt="">'}
  </div>
  <h3>${esc(title)}</h3>
  ${adjustable?`<label class="reward-slider">
   <span>${kind==='voucher'?'Gutscheinwert':'Anzahl Tickets'} <output id="reward-amount-${kind}">${rewardAmount(reward,kind)}</output></span>
   <span class="reward-slider-track" style="--reward-fill:${rewardFill(reward,kind)}"><input type="range" data-reward-choice="${kind}" min="${kind==='voucher'?10:1}" max="${kind==='voucher'?50:4}" step="${kind==='voucher'?5:1}" value="${reward.amount}"></span>
  </label>`:''}
  <div class="reward-bottom"><span class="reward-label" id="reward-price-${kind}">${formatDenare(reward.cost)} Denare</span>
   <button class="btn secondary" id="reward-button-${kind}" data-reward="${reward.id}" ${available(profile)<reward.cost?'disabled':''}>Freischalten</button>
  </div>
 </article>`;
}
async function submitTask(id) {
 const task = taskBy(id);
 if (role!=='student' || !task || task.profile !== profile || !['open','revise','missing'].includes(task.status)) return;
 task.submittedAt=new Date().toISOString();
 task.status = 'submitted';
 await save();
 render();
 toast('Als über Discord abgegeben markiert.');
}

function buyReward(id){
 const reward=rewardBy(id),buyer=profile;
 if(role!=='student'||!reward||available(buyer)<reward.cost)return;
 let committed=false;
 modal(reward.type==='coupon'?'Belohnung anfragen?':'Belohnung freischalten?','<p><strong>'+esc(reward.title)+'</strong></p><p>Dafür nutzt du <strong>'+formatDenare(reward.cost)+' Denare</strong>.'+(reward.type==='coupon'?' Sprich die Belohnung zuerst mit deinen Eltern ab. Bis deine Lehrkraft die Anfrage bestätigt, sind die Denare reserviert.':' Die Belohnung wird online als freigeschaltet gespeichert.')+'</p>',
 '<button class="btn secondary" data-close>Abbrechen</button><button class="btn" id="confirm-reward">'+(reward.type==='coupon'?'Anfragen':'Freischalten')+'</button>');
 $('#confirm-reward').onclick=async()=>{
  if(role!=='student'||profile!==buyer||committed||available(buyer)<reward.cost)return;
  const createdAt=Date.now();
  const purchase={id:crypto.randomUUID(),profile:buyer,reward:id,cost:reward.cost,createdAt,status:reward.type==='coupon'?'pending':'approved'};
  const next={...state,purchases:[...state.purchases,purchase]};
  try{await persist(next);}
  catch(error){recover(error);return;}
  committed=true;state=next;closeModal();render();
  toast(reward.type==='coupon'?'Deine Lehrkraft hat jetzt eine Anfrage.':'Deine Belohnung ist gespeichert.');
 };
}


function recipientPickerMarkup(prefix){
 return '<fieldset class="grant-recipients"><legend>Für wen?</legend><div id="'+prefix+'-selected" class="grant-selected"></div>'+
 '<label class="grant-search-label" for="'+prefix+'-search">Schüler suchen</label><input id="'+prefix+'-search" class="recipient-search" type="search" placeholder="Name oder Profil-ID eingeben" autocomplete="off" aria-controls="'+prefix+'-search-results">'+
 '<div id="'+prefix+'-search-results" class="grant-search-results" role="group" aria-label="Suchergebnisse" hidden></div><span id="'+prefix+'-selection-count" class="recipient-selection-count muted" aria-live="polite"></span></fieldset>';
}
function bindRecipientPicker(prefix,initialIds,locked=false){
 const selected=new Set(initialIds.filter(id=>who(id)));
 const drawSelection=()=>{
  $('#'+prefix+'-selected').innerHTML=[...selected].map(id=>'<span class="grant-recipient-chip">'+esc(who(id).name)+'<input type="hidden" name="recipient-'+esc(id)+'" value="on"><button type="button" data-remove-recipient="'+esc(id)+'" aria-label="'+esc(who(id).name)+' entfernen" '+(locked?'disabled':'')+'>×</button></span>').join('');
  $('#'+prefix+'-selection-count').textContent=selected.size?selected.size+' ausgewählt':'';
  $$('[data-remove-recipient]').forEach(button=>button.onclick=()=>{if(locked)return;selected.delete(button.dataset.removeRecipient);drawSelection();drawResults();});
 };
 const drawResults=()=>{
  if(locked)return;
  const query=$('#'+prefix+'-search').value.trim().toLocaleLowerCase('de-DE');
  const results=$('#'+prefix+'-search-results');
  results.hidden=!query;
  if(!query){results.innerHTML='';return;}
  const matches=profiles.filter(p=>!selected.has(p.id)&&(p.name+' '+p.id).toLocaleLowerCase('de-DE').includes(query)).slice(0,8);
  results.innerHTML=matches.length?matches.map(p=>'<button type="button" data-add-recipient="'+esc(p.id)+'"><span>'+esc(p.name)+'</span><small>Profil-ID · '+esc(p.id)+'</small></button>').join(''):'<p class="muted">Keine weiteren passenden Schüler.</p>';
  $$('[data-add-recipient]').forEach(button=>button.onclick=()=>{
   if(locked)return;selected.add(button.dataset.addRecipient);
   $('#'+prefix+'-search').value='';drawSelection();drawResults();
   $('#'+prefix+'-search').focus({preventScroll:true});
  });
 };
 $('#'+prefix+'-search').oninput=drawResults;
 $('#'+prefix+'-search').onkeydown=event=>{
  if(event.key==='ArrowDown'){
   const first=$$('[data-add-recipient]')[0];
   if(first){event.preventDefault();first.focus();}
  }
  if(event.key==='Enter'&&$('#'+prefix+'-search').value.trim()){
   event.preventDefault();
   const matches=$$('[data-add-recipient]');
   if(matches.length===1)matches[0].onclick();
  }
 };
 drawSelection();drawResults();
 $('#'+prefix+'-search').disabled=locked;
}

function grantDenare(deduct=false) {
 const action=deduct?'Denare abziehen':'Denare vergeben';
 if(role!=='teacher')return;
 modal(action,'<form id="grant-form">'+recipientPickerMarkup('grant')+
 '<label class="grant-field">Denare pro Schüler<input type="number" name="amount" min="1" step="1" required></label>'+
 '<label class="grant-field">Anlass<input name="reason" maxlength="300" placeholder="'+(deduct?'Grund für den Abzug':'Zum Beispiel eine gute Note oder eine Empfehlung')+'" required></label>'+
 '<p id="grant-error" class="error" role="alert"></p></form>',
 '<button class="btn secondary" data-close>Abbrechen</button><button class="btn" type="submit" form="grant-form">Weiter</button>');
 bindRecipientPicker('grant',who(managedStudent)?[managedStudent]:[]);
 $('#grant-form').onsubmit=event=>{
  event.preventDefault();
  if(role!=='teacher')return;
  const form=$('#grant-form');
  if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form));
  const recipients=profiles.filter(p=>data['recipient-'+p.id]);
  const amount=Number(data.amount),reason=(data.reason??'').trim();
  if(!recipients.length||!Number.isSafeInteger(amount)||amount<1||!reason||reason.length>300||recipients.some(p=>!Number.isSafeInteger(earned(p.id)+(deduct?-amount:amount)))){
   $('#grant-error').textContent='Wähle mindestens einen Schüler, einen positiven ganzen Betrag und einen Anlass.';
   return;
  }
  if(deduct&&recipients.some(p=>available(p.id)<amount)){
   $('#grant-error').textContent='Der Betrag übersteigt den verfügbaren Denarstand bei '+recipients.filter(p=>available(p.id)<amount).map(p=>p.name).join(', ')+'.';
   return;
  }
  let committed=false;
  modal(deduct?'Abzug bestätigen':'Denare bestätigen','<p>'+recipients.map(p=>esc(p.name)).join(', ')+'</p><p>Jeweils <strong>'+(deduct?'−':'+')+formatDenare(amount)+' Denare</strong></p><p>'+esc(reason)+'</p>',
   '<button class="btn secondary" data-close>Abbrechen</button><button class="btn '+(deduct?'danger':'')+'" id="confirm-grant">'+action+'</button>');
  $('#confirm-grant').onclick=async()=>{
   if(role!=='teacher'||committed)return;
   if(deduct&&recipients.some(p=>available(p.id)<amount)){toast('Der verfügbare Denarstand reicht für diesen Abzug nicht aus.');return;}
   const createdAt=new Date().toISOString();
   const next={...state,bonuses:[...(state.bonuses??[]),...recipients.map(p=>({profile:p.id,amount:deduct?-amount:amount,reason,createdAt}))]};
   try{await persist(next);}
   catch(error){recover(error);return;}
   committed=true;state=next;closeModal();render();toast(deduct?'Die Denare wurden abgezogen.':'Die Denare wurden gutgeschrieben.');
  };
 };
}

function deleteTask(id){
 const task=taskBy(id);if(role!=='teacher'||!task)return;
 modal('Auftrag löschen?', '<p>Der Lernauftrag „'+esc(task.reference)+'“ wird für dich und den Schüler aus allen Auftragslisten entfernt.</p><p>Bereits gutgeschriebene Denare bleiben erhalten.</p>', '<button class="btn secondary" data-close>Abbrechen</button><button class="btn task-delete-confirm" id="confirm-delete-task">Auftrag löschen</button>');
 $('#confirm-delete-task').onclick=async()=>{
  if(role!=='teacher'||!taskBy(id))return;
  task.deletedAt=new Date().toISOString();await save();closeModal();render();toast('Lernauftrag gelöscht.');
 };
}

function managementTaskCard(t){
    const hasReview=['approved','revise','missing'].includes(t.status);
    const review=hasReview?'Rückmeldung bearbeiten':'Rückmeldung geben';
    const status={open:'Noch zu erledigen',submitted:'Bereit für Rückmeldung',approved:isFinished(t)?'Erledigt · Rückmeldung gelesen':t.studentReview==='question'?'Rückfrage offen':'Korrigiert · Rückmeldung gegeben',revise:'Bitte überarbeiten · Rückmeldung gegeben',missing:'Abgabe fehlt'}[t.status]||t.status;
    const tone=t.status==='submitted'||t.studentReview==='question'?'yellow':['revise','missing'].includes(t.status)?'red':t.status==='approved'?'green':'';
    return `<article class="teacher-item"><div><span class="badge ${tone?'check-status-'+tone:'open'}">${esc(status)}</span><h3>${linkedText(t.reference)}</h3>${t.description?'<p>'+linkedText(t.description)+'</p>':''}<div class="check-facts"><span title="Mögliche Denare">${t.points} Denare</span>${deadlineLabel(t)}</div>${submissionLabel(t)}${attachmentLinks(t)}${t.feedback?.trim()?'<div class="teacher-feedback"><span>Feedback</span><p>'+formattedFeedback(t.feedback)+'</p></div>':''}${t.question?'<div class="teacher-feedback"><span>Rückfrage</span><p>'+linkedText(t.question)+'</p></div>':''}${t.answer?'<div class="teacher-feedback"><span>Antwort</span><p>'+linkedText(t.answer)+'</p></div>':''}</div>
     <div class="review-actions"><button class="btn secondary" data-edit-task="${esc(t.id)}">Aufgabe bearbeiten</button>
     ${hasReview||t.status==='submitted'?'<button class="btn'+(t.status==='submitted'?'':' secondary')+'" data-review="'+esc(t.id)+'">'+review+'</button>':''}${t.studentReview==='question'?'<button class="btn" data-answer-question="'+esc(t.id)+'">Rückfrage beantworten</button>':''}<button type="button" class="btn secondary task-delete-button" data-delete-task="${esc(t.id)}">Auftrag löschen</button></div></article>`;

}

function managementRewardCard(purchase){
 const pending=purchase.status==='pending';
 const timestamp=purchase.createdAt??(/^p-\d+$/.test(purchase.id)?Number(purchase.id.slice(2)):null);
 const date=timestamp?new Date(timestamp).toLocaleDateString('de-DE'):'';
 return '<article class="teacher-item"><div><span class="check-status check-status-'+(pending?'yellow':'green')+'">'+(pending?'Anfrage offen':'Bestätigt')+'</span><h3>'+esc(rewardBy(purchase.reward)?.title??'Belohnung')+'</h3><p>'+formatDenare(purchase.cost)+' Denare'+(date?' · '+esc(date):'')+'</p></div>'+
 (pending?'<button class="btn" data-request="'+esc(purchase.id)+'">Anfrage prüfen</button>':'')+'</article>';
}
function studentManagementPage(p){
 const tasks=myTasks(p.id),purchases=state.purchases.filter(item=>item.profile===p.id);
 const tabs=[['tasks','Aufgaben'],['submissions','Abgaben'],['done','Erledigt'],['denare','Denarverwaltung'],['requests','Belohnungsanfragen'],['redemptions','Einlösungen']];
 const counts={submissions:tasks.filter(task=>task.status==='submitted').length,requests:purchases.filter(item=>item.status==='pending').length};
 let content;
 if(['tasks','submissions','done'].includes(managementTab)){
  const filtered=managementTab==='done'?completedTasks(tasks):tasks.filter(task=>taskSection(task)===managementTab);
  const empty={tasks:'Keine offenen Lernaufträge.',submissions:'Zurzeit gibt es keine Abgaben oder Rückmeldungen.',done:'Noch keine erledigten Lernaufträge.'}[managementTab];
  content='<div class="teacher-list">'+(filtered.length?filtered.map(managementTaskCard).join(''):'<div class="quiet-empty">'+empty+'</div>')+'</div>';
 }else if(managementTab==='denare'){
  content='<section class="quiet-panel management-denare"><h2>'+formatDenare(available(p.id))+' Denare</h2><p class="quiet-subtitle">Verfügbarer Denarstand</p><div class="management-denare-actions"><button class="btn" data-grant-denare>Denare vergeben</button><button class="btn secondary" data-deduct-denare>Denare abziehen</button><button class="link" data-denare-history="'+esc(p.id)+'">Buchungen ansehen</button></div></section>';
 }else{
  const pending=managementTab==='requests';
  const list=purchases.filter(item=>item.status===(pending?'pending':'approved')).slice().reverse();
  const picker=pending?'<label class="special-reward-picker">Wechselnde Belohnung<select data-special-reward="'+esc(p.id)+'">'+rotatingRewards.map(reward=>'<option value="'+esc(reward.id)+'" '+(reward.id===specialReward(p.id).id?'selected':'')+'>'+esc(reward.title)+' · '+formatDenare(reward.cost)+' Denare</option>').join('')+'</select></label>':'';
  content='<div class="teacher-list">'+picker+(list.length?list.map(managementRewardCard).join(''):'<div class="quiet-empty">'+(pending?'Keine offenen Belohnungsanfragen.':'Noch keine bestätigten Einlösungen.')+'</div>')+'</div>';
 }
 return '<button type="button" class="hub-back" data-target="students">← Schüler</button><header class="page-head management-head"><div><h1>'+esc(p.name)+'</h1><p class="quiet-subtitle">Profil-ID · '+esc(p.id)+'</p></div><button class="btn secondary" data-new-task>Aufgabe zuweisen '+icon('plus')+'</button></header>'+
 '<div class="management-tabs" role="tablist" aria-label="Schülerverwaltung">'+tabs.map(([id,label])=>'<button type="button" role="tab" id="management-tab-'+id+'" aria-controls="management-content" aria-selected="'+(managementTab===id)+'" tabindex="'+(managementTab===id?'0':'-1')+'" data-management-tab="'+id+'">'+label+(counts[id]?'<span class="submission-count tab-count" aria-label="'+counts[id]+' offen">'+counts[id]+'</span>':'')+'</button>').join('')+'</div>'+
 '<section id="management-content" role="tabpanel" aria-labelledby="management-tab-'+managementTab+'">'+content+'</section>';
}
function teacherPage(){
 if(teacherSection==='denare'&&who(teacherDenareOwner)){const name=teacherDenareReturn?.managedStudent?who(teacherDenareReturn.managedStudent)?.name:'Schüler';return denarePage(teacherDenareOwner,'<button type="button" class="hub-back" data-teacher-denare-back>← '+esc(name||'Schüler')+'</button>');}
 if(teacherSection==='students'&&who(managedStudent))return studentManagementPage(who(managedStudent));
 const questions=state.tasks.filter(t=>!t.deletedAt&&t.studentReview==='question');
 const pending=state.tasks.filter(t=>!t.deletedAt&&t.status==='submitted'),requests=state.purchases.filter(p=>p.status==='pending'),title={reviews:'Abgaben',students:'Deine Schüler',requests:'Belohnungsanfragen'}[teacherSection];
 const heading='<header class="page-head"><div><h1>'+title+'</h1>'+(teacherSection==='students'?'':'<p class="quiet-subtitle">'+(teacherSection==='reviews'?'Prüfe die Fotos in Discord und gib hier Rückmeldung.':'Bestätige Belohnungen nach gemeinsamer Absprache.')+'</p>')+'</div><button class="btn secondary" data-new-task>'+icon('plus')+' Aufgabe zuweisen</button></header>';
 if(teacherSection==='students')return heading+
 '<div class="denare-grant-action"><button class="btn secondary" data-deduct-denare>Denare abziehen</button><button class="btn" data-grant-denare>Denare vergeben</button></div>'+
 '<div class="student-table"><table class="students-overview"><thead><tr><th scope="col">Schüler</th><th scope="col">Aufgaben</th><th scope="col">Erledigt</th><th scope="col">Abgaben</th><th scope="col">Denare</th><th scope="col">Belohnungsanfragen</th><th scope="col"><span class="student-action-label">Verwaltung</span></th></tr></thead><tbody>'+
 profiles.map(p=>{
  const tasks=myTasks(p.id),submitted=tasks.filter(task=>task.status==='submitted').length;
  const open=tasks.filter(task=>taskSection(task)==='tasks').length,done=tasks.filter(isFinished).length;
  const requests=state.purchases.filter(item=>item.profile===p.id&&item.status==='pending').length;
  const badge=submitted?'<button type="button" class="submission-count" data-open-submissions="true" data-open-student="'+esc(p.id)+'" aria-label="'+submitted+' Abgaben von '+esc(p.name)+' warten auf Rückmeldung">'+submitted+'</button>':'<span class="muted" aria-label="Keine Abgaben warten auf Rückmeldung">–</span>';
  const requestBadge=requests?'<button type="button" class="submission-count" data-open-management-tab="requests" data-open-student="'+esc(p.id)+'" aria-label="'+requests+' Belohnungsanfragen von '+esc(p.name)+' warten auf Bestätigung">'+requests+'</button>':'<span class="muted" aria-label="Keine offenen Belohnungsanfragen">–</span>';
  return '<tr><th scope="row">'+person(p.id)+'</th><td>'+open+'</td><td>'+done+'</td><td>'+badge+'</td><td><button type="button" class="link" data-denare-history="'+esc(p.id)+'" aria-label="Denare von '+esc(p.name)+' ansehen">'+formatDenare(available(p.id))+'</button></td><td>'+requestBadge+'</td><td><button class="btn secondary" data-open-student="'+esc(p.id)+'">Verwalten</button></td></tr>';
 }).join('')+
 '</tbody></table></div>';
 if(teacherSection==='requests')return heading+(requests.length?requests.map(p=>'<article class="teacher-item"><div>'+person(p.profile)+'<h3>'+rewardBy(p.reward).title+'</h3><p>'+formatDenare(p.cost)+' Denare reserviert</p></div><button class="btn secondary" data-request="'+p.id+'">Ansehen</button></article>').join(''):'<div class="quiet-panel quiet-empty">Zurzeit gibt es keine Belohnungsanfragen.</div>');
 const questionList=questions.length?'<div class="teacher-list">'+questions.map(t=>'<article class="teacher-item"><div>'+person(t.profile)+'<h3>'+linkedText(t.reference)+'</h3><p>'+esc(t.question)+'</p></div><button class="btn secondary" data-answer-question="'+esc(t.id)+'">Rückfrage beantworten</button></article>').join('')+'</div>':'';
 return heading+questionList+(pending.length?'<div class="teacher-list">'+pending.map(t=>'<article class="teacher-item"><div>'+person(t.profile)+'<h3>'+linkedText(t.reference)+'</h3><p>'+t.points+' Denare</p>'+submissionLabel(t)+'</div><button class="btn secondary" data-review="'+t.id+'">Rückmeldung geben</button></article>').join('')+'</div>':'<div class="quiet-panel quiet-empty">Zurzeit wartet keine Abgabe auf Rückmeldung.</div>');
}
function reviewTask(id){const t=taskBy(id);if(role!=='teacher'||!t)return;const editing=['approved','revise','missing'].includes(t.status);if(!editing&&t.status!=='submitted')return;
 const rated=editing&&t.status==='approved';
 const previousAward=t.awardedPoints??t.points;
 const minAward=rated?Math.max(0,previousAward-available(t.profile)):0;
 modal(editing?'Rückmeldung bearbeiten':'Deine Rückmeldung','<p class="modal-source">'+esc(who(t.profile).name)+' · '+esc(t.reference)+`</p><p>Dauer: ${t.plannedMinutes??'–'} min</p>${submissionLabel(t)}<div class="form-grid" ${editing&&!rated?'hidden':''}><label>Denare (max. ${t.points})<input id="award-points" type="number" min="${minAward}" max="${t.points}" value="${rated?previousAward:t.points}"></label><label>Sterne<select id="review-grade"><option value="">Bewertung auswählen</option>${grades.map(([grade,stars])=>'<option value="'+grade+'" '+(t.grade===grade?'selected':'')+'>'+grade+' · '+stars.toLocaleString('de-DE')+' / 3 Sterne</option>').join('')}</select></label></div><p id="review-error" class="error" role="alert"></p>`+'<label class="feedback-label"><span>Kommentar für '+esc(who(t.profile).name)+' (optional)</span>'+feedbackToolbar()+'<textarea id="feedback" rows="3" placeholder="Was ist schon gut? Was hilft beim nächsten Schritt?">'+esc(t.feedback??'')+'</textarea></label>','<button class="btn quiet" data-close>Abbrechen</button>'+(editing?'':'<button class="btn secondary" id="missing-task">Abgabe fehlt</button><button class="btn secondary" id="revise-task">Zur Überarbeitung</button>')+'<button class="btn" id="approve-task">'+(editing?'Speichern':'Bestätigen')+'</button>');bindFeedbackToolbar();const finish=async status=>{if(!editing&&t.status!=='submitted')return;const feedback=$('#feedback').value.trim();if(status==='revise'&&!feedback){toast('Schreibe kurz dazu, was noch verbessert werden soll.');return}if(status==='approved'){
 const field=$('#award-points'),points=Number(field.value),grade=$('#review-grade').value;
 if(field.value.trim()===''||!Number.isInteger(points)||points<minAward||points>t.points){$('#review-error').textContent='Wähle eine ganze Zahl zwischen '+minAward+' und '+t.points+'.';return;}
 if(!grades.some(([value])=>value===grade)){$('#review-error').textContent='Wähle eine Sternbewertung.';return;}
 if(!editing)t.studentReview='feedback';
 t.awardedPoints=points;
 t.awardedAt??=Date.now();
 t.grade=grades.some(([value])=>value===grade)?grade:'';
 }t.feedback=feedback;t.status=status;await save();closeModal();render();toast(editing?'Rückmeldung gespeichert.':status==='approved'?who(t.profile).name+' erhält '+t.awardedPoints+' Denare.':'Die Rückmeldung wartet jetzt im Schülerprofil.')};$('#approve-task').onclick=()=>finish(editing?t.status:'approved');if(editing)return;$('#revise-task').onclick=()=>finish('revise');$('#missing-task').onclick=async()=>{
 if(t.status!=='submitted')return;
 t.feedback=$('#feedback').value.trim();
 t.status='missing';
 await save();closeModal();render();
 toast('Der Hinweis zur fehlenden Abgabe steht jetzt beim Schüler.');
}}

function newTask(task=null){
 if(role!=='teacher')return;
 let attachments=[...(task?.attachments??[])],uploading=false,committed=false;
 const awarded=task?.status==='approved'?(task.awardedPoints??task.points):0;
 const description=[task?.description??'',...(task?.links??[])].filter(Boolean).join(String.fromCharCode(10,10));
 modal(task?'Aufgabe bearbeiten':'Eine Aufgabe zuweisen',
 '<form id="assign-form">'+recipientPickerMarkup('assign-recipient')+
 '<label>Aufgabentitel<input name="reference" placeholder="Arbeitsheft, S. 24 · Aufgabe 3" value="'+esc(task?.reference??'')+'" required maxlength="1000"></label>'+
 '<label>Arbeitsauftrag (optional)<textarea name="description" rows="4" maxlength="4000" placeholder="[Beispiel Text](https://beispiel.de)">'+esc(description)+'</textarea></label>'+
 '<label class="attachment-picker">PDFs und Bilder<input id="task-files" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/gif" multiple></label><div id="attachment-draft"></div>'+
 '<div class="assignment-metrics"><label>Dauer (min)<input name="plannedMinutes" type="number" min="1" max="999" value="'+(task?.plannedMinutes??'')+'" required></label>'+
 '<label>Denare<input name="points" type="number" min="'+Math.max(1,awarded)+'" max="100" value="'+(task?.points??'')+'" required></label>'+
 '<label>Bis wann?<input name="due" type="date" value="'+esc(task?.due??'')+'" required></label></div>'+
 '<p id="assign-error" class="error" role="alert"></p></form>',
 '<button class="btn secondary" data-close>Abbrechen</button><button class="btn" type="submit" form="assign-form">'+(task?'Speichern':'Aufgabe zuweisen')+'</button>');
 const form=$('#assign-form');
 bindRecipientPicker('assign-recipient',task?[task.profile]:who(managedStudent)?[managedStudent]:[],Boolean(task));
 form.onsubmit=async event=>{
  event.preventDefault();
  if(role!=='teacher'||committed)return;
  if(uploading){$('#assign-error').textContent='Bitte warte, bis die Dateien gespeichert sind.';return;}
  if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form));
  const points=Number(data.points),plannedMinutes=Number(data.plannedMinutes),reference=(data.reference??'').trim(),due=data.due??'';
  const owners=task?[task.profile]:profiles.filter(p=>data['recipient-'+p.id]).map(p=>p.id);
  const validDate=/^\d{4}-\d{2}-\d{2}$/.test(due)&&Number.isFinite(Date.parse(due+'T12:00:00Z'))&&new Date(due+'T12:00:00Z').toISOString().slice(0,10)===due;
  if(!owners.length||!Number.isInteger(plannedMinutes)||plannedMinutes<1||plannedMinutes>999||!Number.isInteger(points)||points<Math.max(1,awarded)||points>100||!reference||!validDate){
   $('#assign-error').textContent='Wähle mindestens einen Schüler und fülle Titel, Dauer, Denare und Abgabedatum aus.';return;
  }
  const changes={reference,description:(data.description??'').trim(),links:[],due,plannedMinutes,points,attachments:[...attachments]};
  const createdAt=Date.now();
  const updated=task?{...task,...changes,...(task.status==='approved'?{awardedPoints:awarded}:{})}:null;
  const newTasks=owners.map((owner,index)=>({id:crypto.randomUUID(),profile:owner,...changes,status:'open'}));
  const next={...state,tasks:task?state.tasks.map(item=>item.id===task.id?updated:item):[...state.tasks,...newTasks]};
  try{await persist(next);}
  catch(error){recover(error);return;}
  committed=true;state=next;closeModal();teacherSection='students';managedStudent=owners[0];managementTab=task?taskSection(updated):'tasks';render();window.scrollTo(0,0);
  toast(task?'Aufgabe gespeichert.':'Lernauftrag für '+owners.map(owner=>who(owner).name).join(', ')+' gespeichert.');
 };
 const drawAttachments=()=>{
  if(!form.isConnected)return;
  $('#attachment-draft').innerHTML=attachments.map(file=>'<div class="attachment-draft-row"><span>'+esc(file.name)+'</span><button type="button" class="link" data-remove-attachment="'+esc(file.id)+'">Entfernen</button></div>').join('');
  $$('[data-remove-attachment]').forEach(button=>button.onclick=()=>{attachments=attachments.filter(file=>file.id!==button.dataset.removeAttachment);drawAttachments();});
 };
 drawAttachments();
 $('#task-files').onchange=async event=>{
  const input=event.target,files=[...input.files],submit=$('#modal button[form="assign-form"]');
  uploading=true;submit.disabled=true;input.disabled=true;
  $('#assign-error').textContent='';
  try{
   for(const file of files){
    if(!['application/pdf','image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw new Error('Bitte wähle eine PDF-Datei oder ein Bild (JPG, PNG, WebP, GIF).');
    const id=context.userId+'/'+crypto.randomUUID();
    await api.upload(file,id);
    attachments.push({id,name:file.name,type:file.type,size:file.size});
   }
  }catch(error){if(form.isConnected)$('#assign-error').textContent=error.message||'Die Dateien konnten nicht gespeichert werden.';}
  finally{uploading=false;if(form.isConnected){submit.disabled=false;input.disabled=false;input.value='';drawAttachments();}}
 };
}

function confirmRequest(id){const p=state.purchases.find(p=>p.id===id);if(!p||p.status!=='pending')return;modal('Belohnung bestätigen','<p>'+esc(who(p.profile).name)+' möchte „'+esc(rewardBy(p.reward).title)+'“ für <strong>'+formatDenare(p.cost)+' Denare</strong> einlösen.</p><p>Vereinbart gemeinsam, wie die Belohnung übergeben wird.</p>','<button class="btn secondary" data-close>Später</button><button class="btn" id="approve-request">Anfrage bestätigen</button>');$('#approve-request').onclick=async()=>{if(p.status!=='pending')return;p.status='approved';await save();closeModal();render();toast('Bestätigt. Die Belohnung ist im  freigeschaltet.')}}

$('#main').addEventListener('click',event=>{const button=event.target.closest('[data-open-attachment]');if(button)openAttachment(button.dataset.openAttachment);});
$('#modal').addEventListener('close',()=>{reportModal();if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});});
state.walletSnapshots??={};profiles.forEach(p=>{state.walletSnapshots[p.id]??=walletSnapshot(p.id);});rememberWallet();render();pollTimer=setTimeout(poll,30000);
})();
