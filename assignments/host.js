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

 function open(main){
  modal(false);frame=null;
  if(!window.KykloppHubTransport){main.innerHTML='<section class="panel"><h1>Lernaufträge</h1><p>Melde dich in der Online-Version mit deinem persönlichen Zugangscode an, um deine Lernaufträge zu öffnen.</p></section>';return;}
  main.innerHTML='<iframe class="learning-assignments-frame" title="Lernaufträge" src="assignments/student.html"></iframe>';
  frame=main.querySelector('iframe');
 }
 window.addEventListener('message',event=>{
  if(!frame?.isConnected||event.source!==frame.contentWindow||event.origin!==location.origin)return;
  if(event.data?.type==='kyklopp-hub-modal')modal(event.data.open===true);
  if(!placeholder&&event.data?.type==='kyklopp-hub-height'&&Number.isFinite(event.data.height))frame.style.height=Math.min(60000,Math.max(600,event.data.height))+'px';
  if(event.data?.type==='kyklopp-hub-top')window.scrollTo({top:0,behavior:'smooth'});
 });
 function busy(){
  if(!frame?.isConnected)return false;
  try{return Boolean(frame.contentWindow.KykloppHubAPI?.working||frame.contentWindow.KykloppHubAPI?.uncertain);}catch{return false;}
 }
 window.KykloppLearningAssignments={open,busy};
})();




