/* Only the public project key is shipped. Link capabilities are checked by PostgreSQL. */
(()=>{
 'use strict';
 const project='https://nxdnxqukjxrrpjljmsxn.supabase.co';
 const publicKey='sb_publishable_7LjyA4sSKa9LvffU4tuSBg_5-e61e3i';
 const token=location.hash.slice(1),writer=crypto.randomUUID();
 const assets=new URL('.',document.currentScript.src);
 const buildVersion=new URL(document.currentScript.src).searchParams.get('v');
 const linkBase=new URL('../u/',assets).href;
 const $=id=>document.getElementById(id);
 const journalKey='kyklopp-personal-draft-'+token;
 let snapshot,memory={},adapter,claimed=false,blocked=false,dirty=false,saving=false,pendingAnswers=false;
 let generation=0,timer,polling=false,pendingRequest=null,pendingGeneration=0,settingsBusy=false,teacherRefresh;
 let activeDialog=null,modalSurfaces=[];
 let templateDocument=null,embedChannel=null,embedSettingsDirty=false,embedLive=false,embeddedModal=false;
 let toolDock=null,toolData=null,dockLoading=null;
 async function showToolDock(data){
  if(data){
   if(!['aci','bank'].includes(data.kind)||typeof data.html!=='string'||typeof data.css!=='string'||data.html.length+data.css.length>200000||!['left','top','width','height'].every(key=>Number.isFinite(data[key])))return;
   data={...data,...Object.fromEntries(['left','top','width','height'].map(key=>[key,Math.max(0,Math.min(100000,data[key]))]))};
  }
  toolData=data;
  if(!data){toolDock?.update(null);return;}
  dockLoading??=import(new URL('dock.js?v='+(buildVersion||'1'),assets));
  const {createWorksheetDock}=await dockLoading;
  toolDock??=createWorksheetDock(window,$('exercise'),action=>adapter?.toolAction?.(action));
  toolDock.update(activeDialog||embeddedModal?null:toolData);
 }
 window.addEventListener('pagehide',()=>{toolDock?.destroy();toolDock=null;closeModalSurfaces();});
 window.addEventListener('pageshow',()=>{if(activeDialog||embeddedModal){openModalSurfaces();positionDialog();}if(toolData)showToolDock(toolData);});
 const status=text=>$('status').textContent=text;
 const valid=/^(?:[A-Za-z0-9_-]{22}|[0-9a-f]{64})$/;
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
  for(const id of ['reload','takeover','export','retry','refresh-answers'])$(id).hidden=!actions.includes(id);
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
   status('Einstellungen gespeichert');
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
  const tokens=[['Schüler · bearbeiten',snapshot.studentToken],['Ansicht · für Eltern oder Lehrer zum mitverfolgen',snapshot.viewToken]];
  $('link-fields').replaceChildren();
  for(const [label,value] of tokens){
   const row=document.createElement('div');row.className='link-row';
   const text=document.createElement('label'),input=document.createElement('input'),button=document.createElement('button');
   const id='link-'+value.slice(0,8);input.id=id;text.htmlFor=id;text.textContent=label;
   input.readOnly=true;input.value=linkBase+'#'+value;
   button.type='button';button.textContent='Kopieren';
   button.onclick=async()=>{try{await navigator.clipboard.writeText(input.value);button.textContent='Kopiert';}
    catch{input.focus();input.select();button.textContent='Link markieren';}};
   row.append(text,input,button);$('link-fields').append(row);
  }
 }
 async function loadFrame(){
  showToolDock(null);
  adapter=null;
  const frame=$('exercise');frame.hidden=false;
  frame.title=snapshot.template?.title||'Persönliche Übungen';
  if(snapshot.template?.kind==='html'){
   try{
    const {prepareEmbeddedHTML}=await import(new URL('embed.js?v='+(buildVersion||'1'),assets));
    templateDocument??=await rpc('document',{p_token:token});
    embedChannel=crypto.randomUUID();
    embedSettingsDirty=false;embedLive=false;
    // Local checkers need submit events; the injected CSP still blocks form navigation.
    frame.setAttribute('sandbox','allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox');
    frame.removeAttribute('src');
    frame.srcdoc=prepareEmbeddedHTML(templateDocument.html,{channel:embedChannel,role:snapshot.role,
     writable:snapshot.role==='student'&&claimed&&!blocked,settings:snapshot.settings,run:memory});
   }catch(error){status('Die Übung konnte nicht geöffnet werden.');showNotice(error.message);}
   return;
  }
  frame.removeAttribute('sandbox');frame.removeAttribute('srcdoc');embedChannel=null;
  const source=new URL('exercise.html',assets);
  if(buildVersion)source.searchParams.set('v',buildVersion);
  frame.src=source.href;
 }
 function storage(){
  const readonly=snapshot.role!=='student'||blocked||!claimed;
  return {
   getItem:key=>memory[key]??null,
   setItem(key,value){if(readonly)return;if(memory[key]===String(value))return;memory[key]=String(value);modified();},
   removeItem(key){if(readonly)return;delete memory[key];modified();}
  };
 }
 function openModalSurfaces(){
  if(modalSurfaces.length)return;
  let current=window,foreground=$('exercise');
  try{
   for(;;){
    const doc=current.document,cover=doc.createElement('div'),style=doc.documentElement.style;
    cover.className='personal-modal-backdrop';
    cover.style.cssText='position:fixed;inset:0;z-index:2147483000;background:rgba(255,255,255,.86)';
    cover.addEventListener('click',()=>{
     if(activeDialog){
      const dialog=activeDialog;
      for(const type of ['pointerdown','pointerup','click'])if(dialog.open)dialog.dispatchEvent(new MouseEvent(type,{bubbles:true,clientX:0,clientY:0}));
     }else postEmbed('modal-backdrop');
    });
    modalSurfaces.push({cover,style,overflow:style.overflow,gutter:style.scrollbarGutter,foreground,position:foreground.style.position,zIndex:foreground.style.zIndex});
    doc.body.append(cover);
    if(current.getComputedStyle(foreground).position==='static')foreground.style.position='relative';
    foreground.style.zIndex='2147483001';
    // Overlay scrollbars reserve no space; forcing a gutter would shift the page.
    if(current.innerWidth-doc.documentElement.clientWidth>0)style.scrollbarGutter='stable';
    style.overflow='hidden';
    if(current===current.parent)break;
    foreground=current.frameElement;current=current.parent;
   }
  }catch{ /* The local surface still works if a cross-origin ancestor is inaccessible. */ }
 }
 function closeModalSurfaces(){
  for(const item of modalSurfaces){
   item.cover.remove();item.style.overflow=item.overflow;item.style.scrollbarGutter=item.gutter;
   item.foreground.style.position=item.position;item.foreground.style.zIndex=item.zIndex;
  }
  modalSurfaces=[];
 }
 function positionDialog(){
  if(!activeDialog&&!embeddedModal)return;
  let current=window,offset=$('exercise').getBoundingClientRect().top;
  try{while(current!==current.parent){offset+=current.frameElement.getBoundingClientRect().top;current=current.parent;}}catch{}
  const viewport=current.visualViewport,height=viewport?.height||current.innerHeight;
  const metrics={top:(viewport?.offsetTop||0)+height/2-offset,maxHeight:Math.max(180,height-48)};
  if(activeDialog){
   activeDialog.style.setProperty('--personal-dialog-top',metrics.top+'px');
   activeDialog.style.setProperty('--personal-dialog-height',metrics.maxHeight+'px');
  }else postEmbed('modal-position',metrics);
 }
 function closeDialog(){
  if(!activeDialog)return;
  activeDialog=null;
  toolDock?.update(toolData);
  closeModalSurfaces();
 }
 function prepareDialog(dialog){
  if(!activeDialog)openModalSurfaces();
  activeDialog=dialog;toolDock?.update(null);positionDialog();
  dialog.addEventListener('close',closeDialog,{once:true});
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
    else{
     const nextRun={...remote.run};
     if(adapter?.applyRun?.(nextRun)){
      snapshot=remote;memory=nextRun;
      if(pendingAnswers){$('notice').hidden=true;pendingAnswers=false;}
      status('Bearbeitungsstand aktualisiert');
     }else{
      pendingAnswers=true;
      showNotice('Neue Antworten sind verfügbar. Diese Übung unterstützt noch keine direkte Aktualisierung. Deine geöffnete Aufgabe bleibt stehen. Über „Antworten laden“ kannst du die Übung mit dem aktuellen Stand neu öffnen.',['refresh-answers']);
      status('Neue Antworten verfügbar');
     }
    }
   }
  }catch{if(snapshot.role!=='student')status('Verbindung unterbrochen · letzter geladener Stand');}
  finally{polling=false;}
 }
 window.KAPersonal={
  storage,saveSettings,prepareDialog,closeDialog,showTools:showToolDock,
  syncDialog(){if(activeDialog&&(!activeDialog.isConnected||!activeDialog.open))closeDialog();},
  initialSettings:()=>structuredClone(snapshot.settings),
  role:()=>snapshot.role,
  canWrite:()=>snapshot.role==='student'&&claimed&&!blocked,
  attach(api){adapter=api;if(!this.canWrite())api.lock();scheduleViewport();},
  height(value){if(Number.isFinite(value))$('exercise').style.height=Math.max(800,value+20)+'px';scheduleViewport();}
 };
 function postEmbed(type,payload={}){
  $('exercise').contentWindow?.postMessage({kykloppExercise:embedChannel,type,...payload},'*');
 }
 // Dock geometry only changes with content or viewport size, never while the
 // outer document scrolls. Its browser-native sticky layer handles scrolling.
 function updateExerciseViewport(){
  toolDock?.position();
  positionDialog();
 }
 let viewportFrame;
 function scheduleViewport(){
  if(viewportFrame)return;
  viewportFrame=requestAnimationFrame(()=>{viewportFrame=null;updateExerciseViewport();});
 }
 let viewportWindow=window;
 try{
  for(;;){
   viewportWindow.addEventListener('resize',scheduleViewport);
   viewportWindow.visualViewport?.addEventListener('resize',scheduleViewport);
   viewportWindow.visualViewport?.addEventListener('scroll',positionDialog);
   if(viewportWindow===viewportWindow.parent)break;
   viewportWindow=viewportWindow.parent;
  }
 }catch{}
 new ResizeObserver(scheduleViewport).observe($('exercise'));
 function embeddedOverlay(open){
  if(open&&!embeddedModal){
   embeddedModal=true;toolDock?.update(null);openModalSurfaces();positionDialog();
  }else if(!open&&embeddedModal){
   embeddedModal=false;closeModalSurfaces();toolDock?.update(toolData);
  }
 }
 window.addEventListener('message',async event=>{
  const message=event.data,frame=$('exercise');
  if(!embedChannel||event.source!==frame.contentWindow||message?.kykloppExercise!==embedChannel)return;
  if(message.type==='storage'&&snapshot.role==='student'&&claimed&&!blocked){
   if(!message.run||typeof message.run!=='object'||Array.isArray(message.run))return;
   memory={...message.run};modified();
  }
  if(message.type==='settings'){
   const saved=await saveSettings(message.settings);
   postEmbed('settings-result',{id:message.id,saved});
  }
  if(message.type==='height'&&!embeddedModal)window.KAPersonal.height(message.height);
  if(message.type==='modal')embeddedOverlay(message.open===true);
  if(message.type==='settings-dirty')embedSettingsDirty=message.dirty===true;
  if(message.type==='tools')showToolDock(message.tools);
  if(message.type==='live-support')embedLive=true;
  if(message.type==='ready'){
   adapter={toolAction:action=>postEmbed('tool-action',{action}),
    applyRun:run=>{if(!embedLive)return false;postEmbed('run-update',{run});return true;},
    applySettings:settings=>postEmbed('settings-update',{settings}),
    settingsDirty:()=>embedSettingsDirty,lock:()=>postEmbed('lock')};
   scheduleViewport();
  }
 });
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
 async function loadTrainings(){
  $('existing').hidden=false;$('list-status').textContent='Übungen werden geladen …';
  try{
   const access=await teacherToken();
   const items=await rpc('list',{},access);
   $('training-list').replaceChildren();
   $('login-note').hidden=true;
   $('list-status').textContent=items.length?'':'Es wurden noch keine persönlichen Übungen erstellt.';
   for(const item of items){
    const row=document.createElement('article');row.className='training-entry';
    const copy=document.createElement('div'),title=document.createElement('h3'),note=document.createElement('p'),button=document.createElement('button');
    title.textContent=item.title;
    const lessons=(item.settings.lessons||[]).join(', ');
    note.textContent=(item.templateTitle||'Lateintraining')+(lessons?' · Lektionen '+lessons:'')+' · '+(item.started?'Bearbeitung begonnen':'Noch nicht bearbeitet');
    button.type='button';button.textContent='Öffnen';
    button.onclick=async()=>{
     button.disabled=true;
     try{
      const result=await rpc('open',{p_id:item.id},await teacherToken());
      location.href=linkBase+'#'+result.adminToken;
     }catch{status('Die Übung konnte nicht geöffnet werden. Bitte erneut versuchen.');button.disabled=false;}
    };
    const remove=document.createElement('button');
    remove.type='button';remove.className='danger delete-access';remove.textContent='×';remove.title='Übung löschen';
    remove.setAttribute('aria-label','Übung „'+item.title+'“ löschen');
    remove.onclick=async()=>{
     if(!confirm('„'+item.title+'“ endgültig löschen? Alle zugehörigen persönlichen Links werden ungültig und der gespeicherte Bearbeitungsstand wird gelöscht.'))return;
     remove.disabled=true;button.disabled=true;
     try{
      await rpc('delete',{p_id:item.id},await teacherToken());
      await loadTrainings();
     }catch(error){
      const message=error.message.includes('function')?'Bitte zuerst das SQL-Update für persönliche Übungen in Supabase ausführen.':error.message;
      status(message);showNotice(message);
      remove.disabled=false;button.disabled=false;
     }
    };
    const actions=document.createElement('div');actions.className='actions';actions.append(button,remove);
    copy.append(title,note);row.append(copy,actions);$('training-list').append(row);
   }
  }catch{
   $('list-status').textContent='Melde dich in der Lehrerverwaltung an, um deine erstellten Übungen zu öffnen.';
   $('login-note').hidden=false;
  }
 }
 async function loadLibrary(selected){
  const items=await rpc('templates',{},await teacherToken());
  const selector=$('training-template');
  const selection=selected??selector.value;
  selector.replaceChildren();
  const placeholder=new Option('Auswählen','',true,true);placeholder.disabled=true;selector.add(placeholder);
  for(const item of items){
   selector.add(new Option(item.title,item.id));
  }
  selector.value=items.some(item=>item.id===selection)?selection:'';
 }
 async function boot(){
  if(!token){
   $('title').textContent='Persönliche Übungen';
   $('create').hidden=false;status('Übungsvorlagen und persönliche Zugänge');
   $('library').hidden=false;
   $('create-form').onsubmit=async event=>{
    event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
    try{
     const accessToken=await teacherToken();
     const links=await rpc('create_for_template',{p_title:$('training-title').value.trim(),p_template:$('training-template').value},accessToken);
     location.href=linkBase+'#'+links.adminToken;
    }catch(error){
     $('login-note').hidden=false;
     status(error.message.includes('function')?'Bitte zuerst das SQL-Update für persönliche Übungen in Supabase ausführen.':error.message);
    }finally{button.disabled=false;}
   };
   $('publish-form').onsubmit=async event=>{
    event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
    try{
     const file=$('template-file').files[0];
     if(!file||file.size>6000000)throw new Error('Bitte wähle eine HTML-Datei mit höchstens 6 MB aus.');
     const html=await file.text();
     const {prepareEmbeddedHTML}=await import(new URL('embed.js?v='+(buildVersion||'1'),assets));
     prepareEmbeddedHTML(html,{channel:'validation',role:'view',writable:false,settings:{},run:{}});
     const item=await rpc('publish',{p_title:$('template-title').value.trim(),p_html:html},await teacherToken());
     await loadLibrary();
     event.target.reset();$('library-status').textContent='Vorlage hinzugefügt. Du kannst jetzt persönliche Zugänge dafür erstellen.';
    }catch(error){$('library-status').textContent=error.message;}
    finally{button.disabled=false;}
   };
   await loadTrainings();
   try{await loadLibrary();}catch{$('library-status').textContent='Bitte als Lehrer anmelden und das Update für die Übungsbibliothek in Supabase ausführen.';}
   return;
  }
  if(!valid.test(token))throw new Error('Dieser persönliche Link ist ungültig.');
  snapshot=await rpc('snapshot',{p_token:token});memory={...snapshot.run};
  document.body.dataset.trainingRole=snapshot.role;
  $('title').textContent=snapshot.title;document.title=snapshot.title;
  $('mode').textContent={admin:'Verwaltung · Einstellungen und Bearbeitungsstand',student:'Schüler',view:'Ansicht · Bearbeitungsstand'}[snapshot.role];
  renderLinks();
  if(snapshot.role==='admin'){
   const back=document.createElement('a');back.href=new URL('index.html',assets).href;
   back.textContent='← Alle persönlichen Übungen';$('mode').before(back);
  }
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
  setInterval(refresh,snapshot.role==='student'?7000:2000);
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
 $('refresh-answers').onclick=async()=>{
  if(snapshot.role==='student'||adapter?.settingsDirty())return;
  try{
   snapshot=await rpc('snapshot',{p_token:token});memory={...snapshot.run};
   pendingAnswers=false;$('notice').hidden=true;
   await loadFrame();status('Bearbeitungsstand aktualisiert');
  }catch{status('Antworten konnten nicht geladen werden');}
 };
 $('export').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify({title:snapshot.title,revision:snapshot.revision,run:memory},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='Lateintraining-Sicherung.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 window.addEventListener('beforeunload',event=>{if(dirty||saving){event.preventDefault();event.returnValue='';}});
 window.addEventListener('online',()=>{if(dirty)flush();refresh();});
 window.addEventListener('resize',positionDialog);
 window.visualViewport?.addEventListener('resize',positionDialog);
 window.visualViewport?.addEventListener('scroll',positionDialog);
 if(token)window.addEventListener('hashchange',()=>location.reload());
 else window.addEventListener('focus',async()=>{
  await loadTrainings();
  try{await loadLibrary($('training-template').value);}catch{}
 });
 boot().catch(error=>{status('Die Übung konnte nicht geladen werden.');showNotice(error.message);});
})();
