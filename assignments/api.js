(function(){
 'use strict';
 let transport,context,pending=null,working=false;
 const wire=value=>({version:1,tasks:value.tasks,purchases:value.purchases,bonuses:value.bonuses??[],specialRewards:value.specialRewards??{}});
 function storageKey(){return 'kyklopp-hub-request-'+context.userId;}
 function message(error){
  if(error.status===409)return 'Die Lernaufträge wurden inzwischen geändert. Die Ansicht wurde aktualisiert. Bitte versuche es erneut.';
  if(error.message?.includes('insufficient_denare'))return 'Der verfügbare Denarstand reicht dafür nicht aus.';
  if(error.message?.includes('forbidden'))return 'Für diese Aktion fehlt die Berechtigung.';
  if(error.status===404||error.code==='PGRST202')return 'Die Lernaufträge müssen einmalig in Supabase eingerichtet werden.';
  return 'Die Änderung konnte nicht bestätigt werden. Bitte prüfe die Verbindung und versuche es erneut.';
 }
 async function request(path,options={}){return transport.request(path,options);}
 function accept(snapshot){context=snapshot;
  if(window.parent!==window){try{window.parent.KykloppLearningAssignments?.remember(snapshot);}catch{}}
  return snapshot;
 }
 async function reconcile(){
  if(!pending)return;
  try{
   const result=await request('/rest/v1/rpc/kyklopp_hub_save',{method:'POST',body:JSON.stringify(pending)});
   pending=null;localStorage.removeItem(storageKey());accept(result);
  }catch(error){
   if(error.status&&error.status<500&&error.status!==429){pending=null;localStorage.removeItem(storageKey());}
   throw error;
  }
 }
 async function load(){
  if(pending)await reconcile();
  return accept(await request('/rest/v1/rpc/kyklopp_hub_snapshot',{method:'POST',body:'{}'}));
 }
 async function connect(){
  transport=window.KykloppHubTransport;
  if(!transport&&window.parent!==window){try{transport=window.parent.KykloppHubTransport;}catch{}}
  if(!transport)throw new Error('Bitte öffne die Lernaufträge über deinen angemeldeten Kyklopp-Zugang.');
  try{
   const host=window.parent!==window?window.parent.KykloppLearningAssignments:null;
   if(host?.initialSnapshot)context=await host.initialSnapshot();else await load();
   const teacherPage=document.body.dataset.mode==='teacher';
   if(teacherPage!==context.teacher)throw new Error(teacherPage?'Dieser Zugang ist kein Lehrerzugang.':'Bitte nutze für den Lehrerzugang die separate Verwaltung.');
   try{pending=JSON.parse(localStorage.getItem(storageKey()));}catch{}
   if(pending)await load();
   return context;
  }catch(error){throw new Error(error.status?message(error):error.message);}
 }
 async function save(value){
  if(working)throw new Error('Bitte warte, bis die aktuelle Änderung gespeichert ist.');
  working=true;
  try{
   if(pending){await load();throw new Error('Die vorherige Änderung wurde abgeglichen. Bitte prüfe den aktuellen Stand.');}
   const state=wire(value);
   if(JSON.stringify(state)===JSON.stringify(wire(context.state)))return context;
   pending={p_state:state,p_revision:context.revision,p_request_id:crypto.randomUUID()};
   localStorage.setItem(storageKey(),JSON.stringify(pending));
   await reconcile();
   return context;
  }catch(error){
   if(!pending){try{await load();}catch{}}
   throw new Error(error.status?message(error):error.message);
  }finally{working=false;}
 }
 async function upload(file,id){
  if(!context.teacher)throw new Error('Nur Lehrkräfte können Dateien anhängen.');
  if(file.size>20*1024*1024)throw new Error('Eine Datei darf höchstens 20 MB groß sein.');
  await request('/storage/v1/object/kyklopp-assignment-files/'+id,{method:'POST',body:file,headers:{'Content-Type':file.type,'x-upsert':'false'}});
 }
 async function fileURL(id){
  const result=await request('/storage/v1/object/sign/kyklopp-assignment-files/'+id,{method:'POST',body:JSON.stringify({expiresIn:300})});
  const url=result.signedURL??result.signedUrl;
  if(!url)throw new Error('Die Datei konnte nicht geöffnet werden.');
  return url.startsWith('http')?url:transport.url+'/storage/v1'+url;
 }
 window.KykloppHubAPI={connect,load,save,upload,fileURL,get context(){return context;},get working(){return working;},get uncertain(){return Boolean(pending);}};
})();
