// The worksheet remains isolated. Only its toolbar is mirrored into a small,
// separately sandboxed window that uses native sticky positioning in the host.
export function createWorksheetDock(owner,source,onAction){
 let root=owner;
 try{while(root!==root.parent&&root.parent.document)root=root.parent;}catch{}
 const channel=crypto.randomUUID(),box=root.document.createElement('div');
 box.className='worksheet-tool-dock';
 box.style.cssText='position:absolute;z-index:100;pointer-events:none;display:flex;flex-direction:column;justify-content:flex-end';
 const frame=root.document.createElement('iframe');
 frame.title='Werkzeugleiste der Übung';
 frame.setAttribute('sandbox','allow-scripts');
 frame.style.cssText='position:sticky;display:block;width:100%;height:100px;border:0;flex-shrink:0;pointer-events:auto;background:transparent';
 frame.srcdoc='<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\';script-src \'unsafe-inline\';style-src \'unsafe-inline\';img-src data:;font-src data:"><style id="tools-style"></style><div id="tools"></div><script>('+renderDock.toString()+')('+JSON.stringify(channel)+');</scr'+'ipt>';
 box.append(frame);root.document.body.append(box);
 let data=null,ready=false,lastContent='',dragGhost=null;
 function clearDragGhost(){dragGhost?.remove();dragGhost=null;}
 function showDragGhost(text,x,y){
  if(!dragGhost){
   dragGhost=root.document.createElement('span');dragGhost.className='worksheet-drag-preview';
   dragGhost.setAttribute('aria-hidden','true');
   dragGhost.style.cssText='position:fixed;left:0;top:0;z-index:2147482000;pointer-events:none;padding:9px 15px;border:1px solid #d5b773;border-radius:4px;background:#ffdf9a;color:#343434;box-shadow:0 4px 9px #0005;font:16px/1.5 Arial,sans-serif;white-space:nowrap';
   root.document.body.append(dragGhost);
  }
  const caption=String(text||'').slice(0,160);
  if(dragGhost.textContent!==caption)dragGhost.textContent=caption;
  dragGhost.style.transform='translate3d('+x+'px,'+y+'px,0) translate(-50%,-50%) rotate(-4deg)';
 }
 function frameOffset(){
  let current=owner,x=source.getBoundingClientRect().left,y=source.getBoundingClientRect().top;
  while(current!==root){const rect=current.frameElement.getBoundingClientRect();x+=rect.left;y+=rect.top;current=current.parent;}
  return {x,y};
 }
 function position(){
  if(!data||!source.getBoundingClientRect().width){box.hidden=true;box.style.display='none';return;}
  box.hidden=false;box.style.display='flex';
  const offset=frameOffset();
  const left=Math.min(source.clientWidth,data.left),top=Math.min(source.clientHeight,data.top);
  box.style.left=offset.x+root.scrollX+left+'px';
  box.style.top=offset.y+root.scrollY+top+'px';
  box.style.width=Math.min(data.width,source.clientWidth-left)+'px';box.style.height=Math.min(data.height,source.clientHeight-top)+'px';
  const height=root.visualViewport?.height||root.innerHeight;
  frame.style.bottom=(data.kind==='aci'?12:Math.max(12,Math.min(56,height*.06)))+'px';
  sendBounds();
 }
 function update(next){
  if(!next)clearDragGhost();
  data=next;position();
  if(!next||!ready)return;
  const content=next.html+next.css;
  if(content!==lastContent){lastContent=content;frame.contentWindow.postMessage({channel,type:'render',html:next.html,css:next.css},'*');}
 }
 function sendBounds(){
  if(!data||data.kind!=='bank')return;
  const offset=frameOffset(),rect=frame.getBoundingClientRect();
  onAction({type:'bounds',rect:{left:rect.left-offset.x,right:rect.right-offset.x,top:rect.top-offset.y,bottom:rect.bottom-offset.y}});
 }
 function message(event){
  if(event.source!==frame.contentWindow||event.data?.channel!==channel)return;
  const action=event.data;
  if(action.type==='cancel-drag'){clearDragGhost();return;}
  if(action.type==='ready'){ready=true;update(data);return;}
  if(action.type==='height'&&Number.isFinite(action.height)){
   frame.style.height=Math.max(1,Math.min(2000,action.height))+'px';sendBounds();return;
  }
  if(!data||!['click','drop','drag'].includes(action.type))return;
  const offset=frameOffset(),rect=frame.getBoundingClientRect();
  const point={x:rect.left+action.x,y:rect.top+action.y};
  if(action.type==='drag'){
   showDragGhost(action.text,point.x,point.y);
   if(point.y<70)root.scrollBy(0,-18);
   else if(point.y>root.innerHeight-35)root.scrollBy(0,18);
   return;
  }
  clearDragGhost();
  onAction({...action,x:point.x-offset.x,y:point.y-offset.y});
 }
 root.addEventListener('message',message);
 root.addEventListener('resize',position);
 root.addEventListener('scroll',sendBounds,{passive:true,capture:true});
 return {update,position,destroy(){clearDragGhost();root.removeEventListener('message',message);root.removeEventListener('resize',position);root.removeEventListener('scroll',sendBounds,true);box.remove();}};
}

function renderDock(channel){
 const send=data=>parent.postMessage({channel,...data},'*');
 const tools=document.getElementById('tools'),style=document.getElementById('tools-style');
 let sender=null;
 const base='*{box-sizing:border-box}html,body{margin:0;padding:0;background:transparent;font:16px/1.5 Arial,sans-serif;color:#414850}button{font:inherit;cursor:pointer}button:disabled{cursor:default}.aci-toolbar,.card-bank{position:static!important;margin:0!important;transform:none!important;visibility:visible!important}.card-bank{touch-action:none}';
 window.addEventListener('message',event=>{
  // In the teacher page the owning exercise window is a child of our parent.
  // Bind the unguessable channel to its first sender rather than assuming parent.
  if(event.data?.channel!==channel||event.data.type!=='render'||sender&&event.source!==sender)return;
  sender??=event.source;
  const doc=new DOMParser().parseFromString(event.data.html,'text/html');
  for(const node of [...doc.body.querySelectorAll('*')]){
   if(!['DIV','STRONG','BUTTON','SPAN','SVG','PATH','G','CIRCLE','RECT','POLYGON'].includes(node.tagName.toUpperCase())){node.remove();continue;}
   for(const attribute of [...node.attributes])if(/^on/i.test(attribute.name)||['src','href','srcdoc'].includes(attribute.name))node.removeAttribute(attribute.name);
  }
  const mobile='@media(max-width:420px){.aci-tools{gap:clamp(4px,calc((100vw - 245px)/5),16px);padding-left:0}.bracket-tool{flex-shrink:0;min-width:28px}}';
  style.textContent=base+String(event.data.css).replace(/<[^>]*>/g,'')+mobile;
  const focused=document.activeElement?.dataset;
  tools.replaceChildren(...doc.body.childNodes);
  const key=focused?.marker!==undefined?'marker':focused?.boardToken!==undefined?'boardToken':null;
  if(key){const attr=key==='marker'?'data-marker':'data-board-token';tools.querySelector('['+attr+'="'+CSS.escape(focused[key])+'"]')?.focus({preventScroll:true});}
 });
 new ResizeObserver(()=>send({type:'height',height:Math.ceil(tools.getBoundingClientRect().height)})).observe(tools);
 let drag=null,suppressClick=false;
 tools.addEventListener('pointerdown',event=>{
  const button=event.target.closest('[data-board-token]');
  if(!button||button.disabled||event.button!==0)return;
  drag={token:Number(button.dataset.boardToken),text:button.textContent,x:event.clientX,y:event.clientY,moved:false};
  button.setPointerCapture(event.pointerId);
 });
 tools.addEventListener('pointermove',event=>{
  if(!drag)return;
  if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6)drag.moved=true;
  if(drag.moved)send({type:'drag',token:drag.token,text:drag.text,x:event.clientX,y:event.clientY});
 });
 tools.addEventListener('pointerup',event=>{
  if(!drag)return;
  if(drag.moved){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);send({type:'drop',token:drag.token,x:event.clientX,y:event.clientY});}
  drag=null;
 });
 tools.addEventListener('pointercancel',()=>{drag=null;send({type:'cancel-drag'});});
 tools.addEventListener('lostpointercapture',()=>{if(drag){drag=null;send({type:'cancel-drag'});}});
 tools.addEventListener('click',event=>{
  if(suppressClick){suppressClick=false;return;}
  const button=event.target.closest('button');if(!button||button.disabled)return;
  send({type:'click',marker:button.dataset.marker,token:button.dataset.boardToken,home:button.dataset.homeIndex,x:0,y:0});
 });
 send({type:'ready'});
}

// Serialized into the original worksheet's lexical scope by both integrations.
export function installWorksheetToolDock(send,canWrite){
 let active=null,previous='',dockBounds=null;
 if(typeof boardTargetAt==='function'){
  const original=boardTargetAt;
  boardTargetAt=(x,y)=>{
   const bank=document.querySelector('.card-bank');
   if(bank&&dockBounds&&x>=dockBounds.left&&x<=dockBounds.right&&y>=dockBounds.top&&y<=dockBounds.bottom)return {element:bank,place:null};
   return original(x,y);
  };
 }
 let css='';
 const relevant=/\.(?:aci-toolbar|aci-tools|highlighter|marker-|pen-|bracket-tool|eraser-tool|card-bank|card-token|card-home|has-selection)/;
 function collect(rules){let result='';for(const rule of rules){if(rule.selectorText&&relevant.test(rule.selectorText))result+=rule.cssText;else if(rule.cssRules){const nested=collect(rule.cssRules);if(nested)result+=rule.cssText.slice(0,rule.cssText.indexOf('{')+1)+nested+'}';}}return result;}
 for(const sheet of document.styleSheets){try{css+=collect(sheet.cssRules);}catch{}}
 function refresh(){
  const toolbar=document.querySelector('.aci-toolbar,.card-bank');
  if(!toolbar){if(active)send(null);active=null;previous='';dockBounds=null;return;}
  active=toolbar;toolbar.style.transform='none';toolbar.style.visibility='hidden';
  const clone=toolbar.cloneNode(true);clone.style.removeProperty('visibility');clone.style.removeProperty('transform');
  const container=toolbar.parentElement.getBoundingClientRect(),rect=toolbar.getBoundingClientRect();
  const data={kind:toolbar.classList.contains('aci-toolbar')?'aci':'bank',html:clone.outerHTML,css,
   left:rect.left,top:container.top,width:rect.width,height:container.height};
  const serialized=JSON.stringify(data);
  if(serialized!==previous){previous=serialized;send(data);}
 }
 function action(value){
  if(value.type==='bounds'){dockBounds=value.rect;return;}
  if(!canWrite())return;
  const toolbar=document.querySelector('.aci-toolbar,.card-bank');if(!toolbar)return;
  if(value.type==='click'){
   const number=Number(value.marker??value.token??value.home);
   if(!Number.isInteger(number)||number<0)return;
   const attr=value.marker!==undefined?'data-marker':value.token!==undefined?'data-board-token':'data-home-index';
   const selector='['+attr+'="'+number+'"]';
   toolbar.querySelector(selector)?.click();
  }else if(value.type==='drop'&&Number.isInteger(value.token)){
   const target=document.elementFromPoint(value.x,value.y)?.closest('[data-board-drop]');
   if(target)finishBoardMove(value.token,Number(target.dataset.boardDrop),false);
  }
  saveSession();refresh();
 }
 new MutationObserver(refresh).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-pressed','class','disabled']});
 window.addEventListener('resize',refresh);window.addEventListener('scroll',refresh,{passive:true});
 refresh();return {refresh,action};
}

// iPad may lose the compatibility click when pointerup autosaving updates the
// overview. Activate its navigation buttons directly and suppress ghost clicks.
export function installWorksheetTouchActions(){
 const selector='button[data-action="repeat-exercise"],button[data-action="continue-exercise"],button[data-action="overview-task"],button[data-action="confirm-repeat"],button[data-action="cancel-repeat"]';
 let press=null,suppressUntil=0;
 document.addEventListener('pointerdown',event=>{
  suppressUntil=0;press=null;
  const button=event.target.closest(selector);
  if(event.pointerType==='touch'&&event.isPrimary&&button&&!button.disabled)press={button,id:event.pointerId,x:event.clientX,y:event.clientY};
 },true);
 document.addEventListener('pointermove',event=>{
  if(press&&press.id===event.pointerId&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>12)press=null;
 },{capture:true,passive:true});
 document.addEventListener('pointercancel',()=>{press=null;},true);
 document.addEventListener('pointerup',event=>{
  const current=press;press=null;
  if(!current||current.id!==event.pointerId||event.target.closest(selector)!==current.button||current.button.disabled)return;
  event.preventDefault();suppressUntil=performance.now()+700;
  current.button.click();
 },{capture:true,passive:false});
 document.addEventListener('click',event=>{
  if(event.isTrusted&&event.detail>0&&performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 const style=document.createElement('style');style.textContent='.overview-actions button,.repeat-actions button{touch-action:manipulation}';document.head.append(style);
}
