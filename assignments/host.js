(function(){
 'use strict';
 let frame=null;
 function open(main){
  frame=null;
  if(!window.KykloppHubTransport){main.innerHTML='<section class="panel"><h1>Lernaufträge</h1><p>Melde dich in der Online-Version mit deinem persönlichen Zugangscode an, um deine Lernaufträge zu öffnen.</p></section>';return;}
  main.innerHTML='<iframe class="learning-assignments-frame" title="Lernaufträge" src="assignments/student.html"></iframe>';
  frame=main.querySelector('iframe');
 }
 window.addEventListener('message',event=>{
  if(!frame?.isConnected||event.source!==frame.contentWindow||event.origin!==location.origin)return;
  if(event.data?.type==='kyklopp-hub-height'&&Number.isFinite(event.data.height))frame.style.height=Math.min(60000,Math.max(600,event.data.height))+'px';
  if(event.data?.type==='kyklopp-hub-top')window.scrollTo({top:0,behavior:'smooth'});
 });
 function busy(){
  if(!frame?.isConnected)return false;
  try{return Boolean(frame.contentWindow.KykloppHubAPI?.working||frame.contentWindow.KykloppHubAPI?.uncertain);}catch{return false;}
 }
 window.KykloppLearningAssignments={open,busy};
})();
