(function(){
 'use strict';
 let frame=null,placeholder=null,previousOverflow='',previousGutter='',blocked=[];
 function modal(open){
  if(open&&!placeholder&&frame?.isConnected){
   const rect=frame.getBoundingClientRect(),body=frame.contentDocument.body;
   body.style.setProperty('--hub-origin-x',rect.left+'px');body.style.setProperty('--hub-origin-y',rect.top+'px');body.style.setProperty('--hub-original-width',rect.width+'px');body.classList.add('hub-overlay');frame.contentDocument.documentElement.classList.add('hub-overlay-open');
   placeholder=document.createElement('div');placeholder.style.height=rect.height+'px';placeholder.setAttribute('aria-hidden','true');frame.before(placeholder);
   previousOverflow=document.documentElement.style.overflow;previousGutter=document.documentElement.style.scrollbarGutter;document.documentElement.style.overflow='hidden';document.documentElement.style.scrollbarGutter='auto';
   blocked=[...document.querySelectorAll('aside,button,a,input,select,textarea')].filter(el=>!el.inert&&el.tagName!=='SCRIPT');blocked.forEach(el=>el.inert=true);
   frame.classList.add('is-modal');
  }else if(!open&&placeholder){
   frame?.classList.remove('is-modal');frame?.contentDocument?.body?.classList.remove('hub-overlay');frame?.contentDocument?.documentElement?.classList.remove('hub-overlay-open');placeholder.remove();placeholder=null;
   document.documentElement.style.overflow=previousOverflow;document.documentElement.style.scrollbarGutter=previousGutter;blocked.forEach(el=>el.inert=false);blocked=[];
  }
 }

 let cacheAccount=null,cached=null,cachedAt=0,loading=null,assetsPrepared=false;
 function currentAccount(){
  const transport=window.KykloppHubTransport;
  return transport&&'userId' in transport?transport.userId:cacheAccount;
 }
 function clear(){cacheAccount=null;cached=null;cachedAt=0;loading=null;}
 function remember(snapshot){
  if(snapshot?.userId===currentAccount()&&!snapshot.teacher){cached=structuredClone(snapshot);cachedAt=Date.now();}
 }
 async function initialSnapshot(){
  const id=currentAccount(),transport=window.KykloppHubTransport;
  if(id!==cacheAccount){clear();cacheAccount=id;}
  if(id&&cached&&Date.now()-cachedAt<15000)return structuredClone(cached);
  if(loading)return structuredClone(await loading);
  const job=transport.request('/rest/v1/rpc/kyklopp_hub_snapshot',{method:'POST',body:'{}'}).then(snapshot=>{
   if(id!==currentAccount())throw new Error('Der Zugang wurde inzwischen gewechselt. Bitte erneut öffnen.');
   remember(snapshot);return snapshot;
  });
  loading=job;
  try{return structuredClone(await job);}finally{if(loading===job)loading=null;}
 }
 function prepare(){
  if(!assetsPrepared){
   assetsPrepared=true;
   for(const file of ['student.html','style.css','api.js','ui.js']){
    const link=document.createElement('link');link.rel='prefetch';link.href='assignments/'+file;document.head.appendChild(link);
   }
  }
  initialSnapshot().catch(()=>{});
 }
 function syncHeading(main){
  if(!frame?.contentDocument?.documentElement)return;
  const probe=document.createElement('h1');probe.textContent='Lernaufträge';probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none';main.appendChild(probe);
  const style=getComputedStyle(probe),root=frame.contentDocument.documentElement;
  for(const [property,value] of Object.entries({'size':style.fontSize,'family':style.fontFamily,'weight':style.fontWeight,'height':style.lineHeight,'spacing':style.letterSpacing}))root.style.setProperty('--hub-heading-'+property,value);
  probe.remove();
  const back=document.createElement('button');back.className='back';back.style.cssText='position:absolute;visibility:hidden;pointer-events:none';main.appendChild(back);
  const backStyle=getComputedStyle(back);root.style.setProperty('--hub-back-size',backStyle.fontSize);root.style.setProperty('--hub-back-color',backStyle.color);back.remove();
 }
 function open(main){
  modal(false);frame=null;
  if(!window.KykloppHubTransport){main.innerHTML='<section class="panel"><h1>Aufträge</h1><p>Melde dich in der Online-Version mit deinem persönlichen Zugangscode an, um deine Lernaufträge zu öffnen.</p></section>';return;}
  main.innerHTML='<iframe class="learning-assignments-frame" title="Lernaufträge" src="assignments/student.html?v=715cc22af2a0"></iframe>';
  frame=main.querySelector('iframe');frame.addEventListener('load',()=>syncHeading(main));
 }
 window.addEventListener('message',event=>{
  if(!frame?.isConnected||event.source!==frame.contentWindow||event.origin!==location.origin)return;
  if(event.data?.type==='kyklopp-hub-grammar'&&!busy()){modal(false);window.dispatchEvent(new CustomEvent('kyklopp-open-grammar'));}
  if(event.data?.type==='kyklopp-hub-modal')modal(event.data.open===true);
  if(!placeholder&&event.data?.type==='kyklopp-hub-height'&&Number.isFinite(event.data.height))frame.style.height=Math.min(60000,Math.max(600,event.data.height))+'px';
  if(event.data?.type==='kyklopp-hub-top')window.scrollTo({top:0,behavior:'smooth'});
 });
 function busy(){
  if(!frame?.isConnected)return false;
  try{return Boolean(frame.contentWindow.KykloppHubAPI?.working||frame.contentWindow.KykloppHubAPI?.uncertain);}catch{return false;}
 }
 window.addEventListener('resize',()=>{if(frame?.isConnected&&!placeholder)syncHeading(frame.parentElement);});
 window.KykloppLearningAssignments={open,busy,prepare,initialSnapshot,remember,clear};
})();




