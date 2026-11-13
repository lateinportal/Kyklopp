(async function(){
 'use strict';
 const url='https://nxdnxqukjxrrpjljmsxn.supabase.co',key='sb_publishable_7LjyA4sSKa9LvffU4tuSBg_5-e61e3i';
 const sessionKey='kyklopp-teacher-session';
 let auth=null,refreshing=null;
 const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function request(path,options={},authorized=true){
  if(authorized){
   if(!auth)throw new Error('Bitte melde dich mit deinem Lehrerzugang an.');
   if(auth.expires_at<Date.now()/1000+60){
    if(!refreshing)refreshing=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:auth.refresh_token})},false).then(store).finally(()=>{refreshing=null;});
    await refreshing;
   }
  }
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(url+path,{...options,signal:controller.signal,headers:{apikey:key,'Content-Type':'application/json',...(authorized?{Authorization:'Bearer '+auth.access_token}:{}),...options.headers}});
   const data=await response.json().catch(()=>null);
   if(!response.ok){const error=new Error(data?.message??'Anmeldung oder Verbindung fehlgeschlagen.');error.status=response.status;error.code=data?.code;throw error;}
   return data;
  }finally{clearTimeout(timeout);}
 }
 function store(data){auth={...data,expires_at:data.expires_at??Math.floor(Date.now()/1000)+(data.expires_in??3600)};localStorage.setItem(sessionKey,JSON.stringify(auth));}
 async function enter(){
  const snapshot=await request('/rest/v1/rpc/kyklopp_hub_snapshot',{method:'POST',body:'{}'});
  if(!snapshot.teacher){localStorage.removeItem(sessionKey);auth=null;throw new Error('Dieser Code gehört zu einem Schülerprofil. Bitte nutze deinen Lehrer-Zugangscode.');}
  window.KykloppHubTransport={url,request};
  document.querySelector('#teacher-logout').hidden=false;
  const script=document.createElement('script');script.src='ui.js?v=8783d78df491';document.body.appendChild(script);
 }
 function login(message=''){
  document.querySelector('#main').innerHTML='<section class="teacher-login"><h1>Lehrerzugang</h1><form id="teacher-login-form"><label for="teacher-code">Dein Lehrer-Zugangscode</label><input id="teacher-code" type="password" autocomplete="current-password" spellcheck="false" required><p class="error" id="teacher-login-error" role="alert">'+escape(message)+'</p><button class="btn">Anmelden</button></form></section>';
  document.querySelector('#teacher-login-form').onsubmit=async event=>{
   event.preventDefault();const field=document.querySelector('#teacher-code'),error=document.querySelector('#teacher-login-error'),button=event.submitter;
   const code=field.value.replace(/[\s-]/g,'').toLowerCase();
   if(!/^[a-f0-9]{32}$/.test(code)){error.textContent='Bitte prüfe deinen vollständigen Lehrer-Zugangscode.';return;}
   button.disabled=true;error.textContent='';
   try{
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code)))].map(n=>n.toString(16).padStart(2,'0')).join('');
    store(await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:hash+'@codes.kyklopp.invalid',password:code})},false));
    field.value='';await enter();
   }catch(reason){error.textContent=reason.status===400?'Der Lehrer-Zugangscode stimmt nicht.':reason.status===404?'Bitte richte zuerst die Lernaufträge in Supabase ein.':reason.message;button.disabled=false;}
  };
 }
 document.querySelector('#teacher-logout').onclick=async()=>{
  if(window.KykloppHubAPI.working||window.KykloppHubAPI.uncertain){alert('Bitte warte, bis die aktuelle Änderung gespeichert oder abgeglichen ist.');return;}
  try{await request('/auth/v1/logout?scope=local',{method:'POST'});localStorage.removeItem(sessionKey);location.reload();}
  catch{alert('Abmelden nicht möglich. Bitte prüfe die Verbindung.');}
 };
 async function run(){
  try{auth=JSON.parse(localStorage.getItem(sessionKey));}catch{}
  if(auth){try{await enter();return;}catch(error){login(error.message);return;}}
  login();
 }
 if(navigator.locks){navigator.locks.request('kyklopp-teacher-tab',{ifAvailable:true},async lock=>{if(!lock){login('Die Lehrer-Verwaltung ist bereits in einem anderen Tab geöffnet.');return;}await run();await new Promise(()=>{});});}
 else await run();
})();
