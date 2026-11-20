/* Only the public project key is shipped. Link capabilities are checked by PostgreSQL. */
(()=>{
 'use strict';
 const project='https://nxdnxqukjxrrpjljmsxn.supabase.co';
 const publicKey='sb_publishable_7LjyA4sSKa9LvffU4tuSBg_5-e61e3i';
 const token=location.hash.slice(1),writer=crypto.randomUUID();
 const $=id=>document.getElementById(id);
 const journalKey='kyklopp-personal-draft-'+token;
 let snapshot,memory={},adapter,claimed=false,blocked=false,dirty=false,saving=false;
 let generation=0,timer,polling=false,pendingRequest=null,pendingGeneration=0,settingsBusy=false,teacherRefresh;
 const status=text=>$('status').textContent=text;
 const valid=/^[0-9a-f]{64}$/;
 async function rpc(name,body,accessToken){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(project+'/rest/v1/rpc/kyklopp_personal_'+name,{
    method:'POST',signal:controller.signal,headers:{apikey:publicKey,'Content-Type':'application/json',
     ...(accessToken?{Authorization:'Bearer '+accessToken}:{})},body:JSON.stringify(body)
   });
   const data=await response.json().catch(()=>null);
   if(!response.ok){const error=new Error(data?.message||'Verbindung fehlgeschlagen.');error.status=response.status;throw error;}
   return data;
  }finally{clearTimeout(timeout);}
 }
 function showNotice(text,actions=[]){
  $('notice').hidden=false;$('notice-text').textContent=text;
  for(const id of ['reload','takeover','export','retry'])$(id).hidden=!actions.includes(id);
 }
 function cache(){
  if(snapshot?.role!=='student')return;
  try{localStorage.setItem(journalKey,JSON.stringify({revision:snapshot.revision,run:memory}));}
  catch{showNotice('Der lokale Sicherungsstand konnte nicht gespeichert werden. Halte diese Seite bis zur Online-Bestätigung geöffnet.',['export','retry']);}
 }
 function modified(){
  if(snapshot.role!=='student'||blocked||!claimed)return;
  dirty=true;generation++;cache();status('Wird gespeichert …');
  clearTimeout(timer);timer=setTimeout(flush,500);
 }
 async function flush(){
  if(!dirty||saving||blocked||!claimed)return;
  saving=true;
  if(!pendingRequest){
   pendingGeneration=generation;
   pendingRequest={p_token:token,p_writer:writer,p_revision:snapshot.revision,
    p_run:structuredClone(memory),p_request:crypto.randomUUID()};
  }
  try{
   const lease=await rpc('claim',{p_token:token,p_writer:writer,p_takeover:false});
   if(!lease.claimed){const error=new Error('writer_changed');error.status=409;throw error;}
   const saved=await rpc('save',pendingRequest);
   snapshot={...snapshot,revision:saved.revision,updatedAt:saved.updatedAt};
   pendingRequest=null;
   dirty=generation!==pendingGeneration;
   cache();
   if(!dirty){localStorage.removeItem(journalKey);status('Gespeichert');}
  }catch(error){
   if(error.status===409){
    blocked=true;adapter?.lock();
    showNotice('Auf einem anderen Gerät wurde weitergearbeitet. Dein lokaler Stand bleibt hier erhalten. Lade den Online-Stand, um dort weiterzumachen.',['export','reload']);
    status('Abgleich erforderlich');
   }else{
    status('Verbindung unterbrochen · Änderungen lokal gesichert');
    showNotice('Deine Änderungen warten auf die Online-Speicherung. Halte diese Seite geöffnet oder sichere den lokalen Stand.',['retry','export']);
   }
  }finally{saving=false;if(dirty&&!blocked)timer=setTimeout(flush,3000);}
 }
 async function saveSettings(settings){
  if(settingsBusy||snapshot.role==='view'||blocked)return false;
  settingsBusy=true;
  status('Einstellungen werden gespeichert …');
  try{
   const result=await rpc('settings',{p_token:token,p_revision:snapshot.settingsRevision,p_settings:settings});
   snapshot.settings=result.settings;snapshot.settingsRevision=result.settingsRevision;
   status('Einstellungen gespeichert · gelten für den nächsten Durchlauf');
   return true;
  }catch(error){
   showNotice(error.status===409?'Die Einstellungen wurden inzwischen auf einem anderen Gerät geändert. Lade zuerst den aktuellen Online-Stand. Deine laufende Runde bleibt erhalten.':'Die Einstellungen konnten nicht gespeichert werden. Versuche es bei bestehender Verbindung erneut.',['reload']);
   status('Einstellungen noch nicht gespeichert');
   return false;
  }finally{settingsBusy=false;}
 }
 function renderLinks(){
  $('links').hidden=snapshot.role!=='admin';
  if(snapshot.role!=='admin')return;
  $('links').open=true;
  const tokens=[['Verwaltung',token],['Schüler · bearbeiten',snapshot.studentToken],['Ansicht · mitverfolgen',snapshot.viewToken]];
  $('link-fields').replaceChildren();
  for(const [label,value] of tokens){
   const row=document.createElement('div');row.className='link-row';
   const text=document.createElement('label'),input=document.createElement('input'),button=document.createElement('button');
   const id='link-'+value.slice(0,8);input.id=id;text.htmlFor=id;text.textContent=label;
   input.readOnly=true;input.value=location.origin+location.pathname+'#'+value;
   button.type='button';button.textContent='Kopieren';
   button.onclick=async()=>{try{await navigator.clipboard.writeText(input.value);button.textContent='Kopiert';}
    catch{input.focus();input.select();button.textContent='Link markieren';}};
   row.append(text,input,button);$('link-fields').append(row);
  }
 }
 function loadFrame(){
  adapter=null;
  const frame=$('exercise');frame.hidden=false;
  frame.src='exercise.html';
 }
 function storage(){
  const readonly=snapshot.role!=='student'||blocked||!claimed;
  return {
   getItem:key=>memory[key]??null,
   setItem(key,value){if(readonly)return;if(memory[key]===String(value))return;memory[key]=String(value);modified();},
   removeItem(key){if(readonly)return;delete memory[key];modified();}
  };
 }
 async function claim(takeover=false){
  const result=await rpc('claim',{p_token:token,p_writer:writer,p_takeover:takeover});
  claimed=result.claimed;
  if(!claimed){
   blocked=true;adapter?.lock();
   showNotice('Dieser Schülerlink wird gerade auf einem anderen Gerät bearbeitet. Du kannst den Stand ansehen oder hier übernehmen.',['takeover']);
  }
  return claimed;
 }
 async function refresh(){
  if(polling||settingsBusy)return;
  polling=true;
  try{
   const remote=await rpc('snapshot',{p_token:token});
   if(snapshot.role==='student'&&!blocked){
    if(!await claim())return;
    if(remote.revision>snapshot.revision&&!saving){
     blocked=true;adapter?.lock();
     showNotice('Der Online-Stand wurde auf einem anderen Gerät geändert. Lade ihn zum Weiterarbeiten.',['reload',...(dirty?['export']:[])]);
    }
   }
   if(!settingsBusy&&remote.settingsRevision>snapshot.settingsRevision){
    if(adapter?.settingsDirty()){
     showNotice('Es gibt neue Einstellungen. Deine ungespeicherte Auswahl bleibt sichtbar. Lade den Online-Stand, um die neue Auswahl zu übernehmen.',['reload']);
    }else{
     snapshot.settings=remote.settings;snapshot.settingsRevision=remote.settingsRevision;
     adapter?.applySettings(remote.settings);
     status('Neue Einstellungen geladen · gelten für den nächsten Durchlauf');
    }
   }
   if(snapshot.role!=='student'&&remote.revision>snapshot.revision){
    if(adapter?.settingsDirty())status('Neue Antworten verfügbar · zuerst Einstellungen speichern');
    else{snapshot=remote;memory={...remote.run};loadFrame();status('Bearbeitungsstand aktualisiert');}
   }
  }catch{if(snapshot.role!=='student')status('Verbindung unterbrochen · letzter geladener Stand');}
  finally{polling=false;}
 }
 window.KAPersonal={
  storage,saveSettings,
  initialSettings:()=>structuredClone(snapshot.settings),
  role:()=>snapshot.role,
  canWrite:()=>snapshot.role==='student'&&claimed&&!blocked,
  attach(api){adapter=api;if(!this.canWrite())api.lock();},
  height(value){if(Number.isFinite(value))$('exercise').style.height=Math.max(800,value+20)+'px';}
 };
 async function teacherToken(){
  const key='kyklopp-teacher-session',auth=JSON.parse(localStorage.getItem(key)||'null');
  if(!auth?.access_token)throw new Error('Lehreranmeldung erforderlich.');
  if(auth.expires_at>Date.now()/1000+60)return auth.access_token;
  teacherRefresh??=(async()=>{
   const response=await fetch(project+'/auth/v1/token?grant_type=refresh_token',{method:'POST',
    headers:{apikey:publicKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:auth.refresh_token})});
   const data=await response.json();if(!response.ok)throw new Error('Bitte erneut als Lehrer anmelden.');
   localStorage.setItem(key,JSON.stringify({...data,expires_at:data.expires_at??Date.now()/1000+data.expires_in}));
   return data.access_token;
  })().finally(()=>teacherRefresh=null);
  return teacherRefresh;
 }
 async function boot(){
  if(!token){
   $('create').hidden=false;status('Fünf Übungen mit einem eigenen Bearbeitungsstand');
   $('create-form').onsubmit=async event=>{
    event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
    try{
     const accessToken=await teacherToken();
     const links=await rpc('create',{p_title:$('training-title').value.trim()},accessToken);
     location.hash=links.adminToken;location.reload();
    }catch(error){
     $('login-note').hidden=false;
     status(error.message.includes('function')?'Bitte zuerst das SQL-Update für persönliche Übungen in Supabase ausführen.':error.message);
    }finally{button.disabled=false;}
   };
   return;
  }
  if(!valid.test(token))throw new Error('Dieser persönliche Link ist ungültig.');
  snapshot=await rpc('snapshot',{p_token:token});memory={...snapshot.run};
  $('title').textContent=snapshot.title;document.title=snapshot.title;
  $('mode').textContent={admin:'Verwaltung · Einstellungen und Bearbeitungsstand',student:'Schüler · fünf Übungen',view:'Ansicht · Bearbeitungsstand'}[snapshot.role];
  renderLinks();
  if(snapshot.role==='student'){
   let journal;try{journal=JSON.parse(localStorage.getItem(journalKey)||'null');}catch{}
   if(journal&&JSON.stringify(journal.run)!==JSON.stringify(memory)){
    memory=journal.run;
    if(journal.revision===snapshot.revision){dirty=true;status('Lokale Änderungen werden wieder aufgenommen');}
    else{blocked=true;showNotice('Dein lokal gesicherter Stand unterscheidet sich vom Online-Stand. Sichere ihn vor dem Laden.',['export','reload']);}
   }
   if(!blocked)await claim();
  }
  loadFrame();
  if(!blocked&&!dirty)status(snapshot.revision?'Gespeicherter Stand geladen':'Bereit');
  if(dirty)flush();
  setInterval(refresh,7000);
 }
 $('reload').onclick=async()=>{
  if(dirty||pendingRequest){
   if(!confirm('Online-Stand laden? Sichere bei Bedarf vorher den lokalen Stand über „Lokalen Stand sichern“.'))return;
   localStorage.removeItem(journalKey);location.reload();return;
  }
  try{
   const remote=await rpc('snapshot',{p_token:token});
   snapshot.settings=remote.settings;snapshot.settingsRevision=remote.settingsRevision;
   adapter?.applySettings(remote.settings);$('notice').hidden=true;
   if(blocked){localStorage.removeItem(journalKey);location.reload();}
  }catch{status('Online-Stand konnte nicht geladen werden');}
 };
 $('takeover').onclick=async()=>{
  try{
   if(dirty&&!confirm('Hier übernehmen und den aktuellen Online-Stand laden? Sichere bei Bedarf vorher deinen lokalen Stand.'))return;
   await claim(true);
   snapshot=await rpc('snapshot',{p_token:token});
   memory={...snapshot.run};dirty=false;pendingRequest=null;blocked=false;
   localStorage.removeItem(journalKey);$('notice').hidden=true;loadFrame();status('Du kannst hier weiterarbeiten');
  }catch{status('Übernahme fehlgeschlagen. Bitte erneut versuchen.');}
 };
 $('retry').onclick=()=>{clearTimeout(timer);flush();};
 $('export').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify({title:snapshot.title,revision:snapshot.revision,run:memory},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='Lateintraining-Sicherung.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 window.addEventListener('beforeunload',event=>{if(dirty||saving){event.preventDefault();event.returnValue='';}});
 window.addEventListener('online',()=>{if(dirty)flush();refresh();});
 if(token)window.addEventListener('hashchange',()=>location.reload());
 boot().catch(error=>{status('Die Übung konnte nicht geladen werden.');showNotice(error.message);});
})();
