import {improveWorksheetResults} from './results.js?v=c4fc486fd30b';
import {installWorksheetToolDock,installWorksheetTouchActions} from './dock.js?v=c4fc486fd30b';
import {improveFreiarbeitVariants,improveFreiarbeitCorrectionStyle} from './freiarbeit-variants.js?v=c4fc486fd30b';
export function installTabletKeyboardNavigation(){
 const tablet=/iPad/i.test(navigator.userAgent)||(/Macintosh|MacIntel/i.test(navigator.userAgent+' '+navigator.platform)&&navigator.maxTouchPoints>0);
 if(!tablet)return;
 // Keep Safari's native focus and keyboard session. Never cancel Tab or call
 // focus() here: DOM focus and Magic Keyboard focus can otherwise diverge.
 const style=document.createElement('style');
 style.textContent='#response input[type=text],#response textarea{font-size:16px!important}';
 (document.head||document.documentElement).append(style);
 const update=()=>{
  const response=document.getElementById('response');if(!response)return;
  const fields=[...response.querySelectorAll('input:not([type]),input[type=text],input[type=search],input[type=email],input[type=number],input[type=url],input[type=tel],input[type=password],textarea')]
   .filter(node=>!node.matches(':disabled')&&!node.closest('[hidden],[inert]')&&node.getClientRects().length&&getComputedStyle(node).visibility==='visible');
  // Give the answer fields a continuous native order across table rows.
  fields.forEach((field,index)=>{field.tabIndex=index+1;});
  const check=document.getElementById('check');
  if(check)check.tabIndex=fields.length?fields.length+1:0;
 };
 const install=()=>{update();new MutationObserver(update).observe(document.body,{childList:true,subtree:true});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}

export function installInputVisibility(send){
 if(!navigator.maxTouchPoints)return;
 // iPad Safari handles keyboard visibility natively; do not scroll its outer
 // frames after focus, which can disturb the active keyboard input session.
 if(/iPad/i.test(navigator.userAgent)||(/Macintosh|MacIntel/i.test(navigator.userAgent+' '+navigator.platform)&&navigator.maxTouchPoints>0))return;
 let timer;
 const report=()=>{
  const field=document.activeElement;
  if(!field?.matches('textarea,input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),[contenteditable=true]'))return;
  const rect=field.getBoundingClientRect();
  send({top:rect.top,bottom:rect.bottom});
 };
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(report,150);};
 document.addEventListener('focusin',schedule);
 // Do not re-scroll on every character; keyboard resize and focus are enough.
 window.addEventListener('resize',schedule);
 window.addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='kyklopp-focus-viewport')schedule();});
}

// Runs inside the isolated HTML exercise. The parent only accepts messages from its own frame.
export function embeddedExercise(config){
 installTabletKeyboardNavigation();
 installInputVisibility(rect=>parent.postMessage({kykloppExercise:config.channel,type:"input-visibility",rect},"*"));
 const channel=config.channel;
 const values=Object.assign(Object.create(null),config.run);
 const listeners=new Set(),stateListeners=new Set(),toolListeners=new Set(),requests=new Map();
 let locked=!config.writable,settings=config.settings,timer;
 const send=(type,payload={})=>parent.postMessage({kykloppExercise:channel,type,...payload},'*');
 const storage={
  get length(){return Object.keys(values).length;},
  key:index=>Object.keys(values)[index]??null,
  getItem:key=>values[key]??null,
  setItem(key,value){
   if(locked)return;
   if(values[key]===String(value))return;
   values[key]=String(value);queue();
  },
  removeItem(key){if(locked)return;delete values[key];queue();},
  clear(){if(locked)return;for(const key of Object.keys(values))delete values[key];queue();}
 };
 function queue(){
  clearTimeout(timer);timer=setTimeout(()=>send('storage',{run:{...values}}),100);
 }
 Object.defineProperty(window,'localStorage',{value:storage,configurable:false});
 window.KykloppExercise={
  role:config.role,
  get readOnly(){return locked;},
  get settings(){return structuredClone(settings);},
  get state(){try{return JSON.parse(values['kyklopp-exercise-state']||'{}');}catch{return {};}},
  saveState(state){storage.setItem('kyklopp-exercise-state',JSON.stringify(state));},
  saveSettings(next){
   if(config.role==='view')return Promise.resolve(false);
   const id=crypto.randomUUID();
   return new Promise(resolve=>{requests.set(id,{resolve,next});send('settings',{settings:next,id});});
  },
  onSettingsChange(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
  onStateChange(listener){stateListeners.add(listener);send('live-support');return ()=>stateListeners.delete(listener);},
  showTools:tools=>send('tools',{tools}),onToolAction:listener=>toolListeners.add(listener),
  scrollToStart:()=>send('scroll-top')
 };
 function protect(){
  if(!locked)return;
  for(const node of document.querySelectorAll('input,textarea,select,button,[draggable]')){
   const canConfigure=config.role!=='view'&&node.closest('[data-kyklopp-settings],#settings');
   const navigation=node.matches('[data-kyklopp-navigation],#overview,[data-main]');
   if(canConfigure||navigation)continue;
   if('disabled' in node)node.disabled=true;
   if(node.hasAttribute('draggable'))node.draggable=false;
  }
 }
 window.addEventListener('message',event=>{
  if(event.source!==parent||event.data?.kykloppExercise!==channel)return;
  const message=event.data;
  if(message.type==='settings-result'){
   const request=requests.get(message.id);if(!request)return;
   if(message.saved){settings=request.next;send('settings-dirty',{dirty:false});}
   request.resolve(message.saved);requests.delete(message.id);
  }
  if(message.type==='settings-update'){
   settings=message.settings;
   for(const listener of listeners)listener(structuredClone(settings));
  }
  if(message.type==='lock'){locked=true;protect();}
  if(message.type==='tool-action')for(const listener of toolListeners)listener(message.action);
  if(message.type==='modal-position'){
   const dialog=document.querySelector('dialog[open]');
   if(dialog){
    Object.assign(dialog.style,{inset:'auto',left:'50%',top:message.top+'px',margin:'0',transform:'translate(-50%,-50%)',maxHeight:message.maxHeight+'px'});
    const panel=dialog.querySelector('.finish-panel');if(panel)panel.style.maxHeight=message.maxHeight+'px';
   }
  }
  if(message.type==='modal-backdrop'){
   const dialog=document.querySelector('dialog[open]');
   if(dialog)for(const type of ['pointerdown','pointerup','click'])if(dialog.open)dialog.dispatchEvent(new MouseEvent(type,{bubbles:true,clientX:0,clientY:0}));
  }
  if(message.type==='run-update'&&locked&&message.run&&typeof message.run==='object'){
   for(const key of Object.keys(values))delete values[key];
   Object.assign(values,message.run);
   for(const listener of stateListeners)listener(structuredClone(values));
   report();
  }
 });
 function report(){
  const height=Math.max(...[...document.body.children].filter(node=>!['SCRIPT','STYLE'].includes(node.tagName)&&!node.matches('.card-drag-ghost'))
   .map(node=>node.getBoundingClientRect().bottom+scrollY+16),300);
  send('height',{height});
  send('modal',{open:Boolean(document.querySelector('dialog[open]'))});
  protect();
 }
 document.addEventListener('DOMContentLoaded',()=>{
  for(const type of ['input','change'])document.addEventListener(type,event=>{
   if(event.target.closest('[data-kyklopp-settings],#settings'))send('settings-dirty',{dirty:true});
  },true);
  new MutationObserver(report).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  new ResizeObserver(report).observe(document.body);
  window.addEventListener('resize',report);
  report();send('ready');
 });
}

// Shared by the built-in worksheet build and existing uploaded worksheet templates.
export function improveWorksheetFeedback(source,artBase){
 source=improveWorksheetResults(source,artBase);
 if(source.includes('function vocabularySenses(record){')){
  source=source.replace('const records=[record,...sheet.filter(item=>item.la===record.la&&(!record.type||item.type===record.type))];','const records=[record];');
  const start=source.indexOf('function liamVocabularyRecords(pool){'),end=source.indexOf('function liamPrincipal(',start);
  if(start>=0&&end>start){
   const original=source.slice(start,end);
   const updated=original.replace('for(const record of pool){',    "for(const record of pool){\n  const key=(record.sourceKind==='Verb'||record.type==='v')?record.la:JSON.stringify([record.la,record.type,record.sourceGrammar||'',record.de]);")
    .replaceAll('records.get(record.la)','records.get(key)').replaceAll('records.set(record.la,record)','records.set(key,record)');
   source=source.slice(0,start)+updated+source.slice(end);
  }
  source=source.replace("esc(entry.word)+'</td><td>'+field('grammar-'",   "esc(entry.word)+(entry.record?.la==='cum'?'<small class=\"muted\" style=\"display:block\">Lektion '+esc(entry.record.lesson)+' · '+esc(entry.record.sourceGrammar||'')+'</small>':'')+'</td><td>'+field('grammar-'");
 }
 return source.replace("Geschrei:'Schreie'","Geschrei:'Schreie|Geschreie'").replace('liveTimer=setTimeout(()=>{liveTimer=null;check(true)},400);',
   'liveTimer=setTimeout(()=>{liveTimer=null;check(true);saveSession()},400);')
 .replace("window.scrollTo({top:0,left:0,behavior:'instant'});",`window.scrollTo({top:0,left:0,behavior:'instant'});
  if(window.KykloppExercise)window.KykloppExercise.scrollToStart?.();
  else{try{window.parent.KAPersonal?.scrollToStart?.();}catch{}}`)
 .replace('function restoreSession(){','function restoreSession(incoming){')
 .replace("const saved=JSON.parse(localStorage.getItem(exerciseStorageKey)||'null');","const saved=incoming||JSON.parse(localStorage.getItem(exerciseStorageKey)||'null');")
 .replace('if(!verifiedNominal.has(id))return;',`if(!verifiedNominal.has(id)){
      const previous=fieldResults.find(result=>result.id===id);
      if(previous&&['missing','unverified'].includes(previous.result)){
        const filled=Boolean(input.value.trim());
        previous.result=filled?'unverified':'missing';
        previous.hint=filled?'Noch nicht geprüft. Klicke auf „Überprüfen“, um die Eingabe zu bewerten.':'';
        clearFieldResults();paintFieldResults();
      }
      return;
    }`).replace('.field-badge[data-result="unverified"]{background:#66717e}',
     '.field-badge[data-result="unverified"]{background:#0755b2}');
}

// Repaint remote answers while keeping the observer's independent task and scroll position.
export function applyWorksheetRun(run){
 const saved=JSON.parse(run[exerciseStorageKey]||'null');
 if(!saved||!Array.isArray(saved.states))return false;
 const selected=t,overview=viewingOverview,scrollX=window.scrollX,scrollY=window.scrollY;
 const previous=drafts.get(selected);
 if(previous&&!saved.states.some(([index])=>index===selected)&&saved.runMeta?.id===runMeta?.id){
  saved.states.push([selected,{...previous,verifiedNominal:[...previous.verifiedNominal]}]);
 }
 // Answer snapshots may still contain older settings while the student receives an update.
 saved.settings=settingsSnapshot();
 saved.index=selected;saved.overview=overview;saved.popup=false;
 const scrollToStart=scrollToExerciseStart;
 scrollToExerciseStart=()=>{};
 try{
  drafts.clear();
  const restored=restoreSession(saved);
  if(restored){
   runHistory=JSON.parse(run[runHistoryStorageKey]||'[]');
   if(viewingOverview)renderRunHistory();
   window.scrollTo(scrollX,scrollY);
  }
  return restored;
 }finally{scrollToExerciseStart=scrollToStart;}
}

export function prepareEmbeddedHTML(html,config){
 const doc=new DOMParser().parseFromString(html,'text/html');
 const originalScripts=[...doc.scripts];
 if(!originalScripts.some(script=>/\b(?:localStorage|KykloppExercise)\b/.test(script.textContent))){
  throw new Error('Diese HTML-Datei speichert ihren Bearbeitungsstand noch nicht. Bitte zuerst die Speicherung für diese Übung ergänzen.');
 }
 if(doc.querySelector('script[src],link[rel="stylesheet"][href]:not([href^="data:"])')){
  throw new Error('Diese HTML-Datei lädt Skripte oder Stylesheets aus weiteren Dateien. Bitte zuerst als eigenständige HTML-Datei zusammenfassen.');
 }
 const meta=doc.createElement('meta');meta.httpEquiv='Content-Security-Policy';
 meta.content="default-src 'none'; script-src 'unsafe-inline' blob:; style-src 'unsafe-inline'; img-src data: blob: https:; font-src data:; media-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'";
 doc.head.prepend(meta);
 const bootstrap=doc.createElement('script');
 bootstrap.textContent=installTabletKeyboardNavigation.toString()+'\n'+installInputVisibility.toString()+'\n('+embeddedExercise.toString()+')('+JSON.stringify(config).replace(/</g,'\\u003c')+');';
 doc.head.insertBefore(bootstrap,meta.nextSibling);
 for(const link of doc.querySelectorAll('a'))link.rel='noopener noreferrer';
 if(originalScripts.some(script=>script.textContent.includes('function settingsSnapshot(){')&&script.textContent.includes('const exerciseStorageKey='))){
  for(const script of originalScripts)script.textContent=improveFreiarbeitVariants(improveWorksheetFeedback(script.textContent,new URL('../vokabelbilder/grammatik-ergebnisse/',import.meta.url).href));
  for(const style of doc.querySelectorAll('style'))style.textContent=improveFreiarbeitCorrectionStyle(improveWorksheetFeedback(style.textContent));
  doc.documentElement.dataset.kykloppWorksheet='';
  const layout=doc.createElement('style');
  layout.textContent='html[data-kyklopp-worksheet] body>main{padding-left:0;padding-right:0;max-width:none;margin-left:0;margin-right:0}';
  doc.head.append(layout);
  const adapter=doc.createElement('script');adapter.textContent=installWorksheetTouchActions.toString()+'\n'+installWorksheetToolDock.toString()+'\n'+applyWorksheetRun.toString()+'\n('+legacySettings.toString()+')();';doc.body.append(adapter);
 }
 return '<!doctype html>\n'+doc.documentElement.outerHTML;
}

// Adapter for standalone versions of the original five-exercise worksheet.
function legacySettings(){
 const api=window.KykloppExercise;
 installWorksheetTouchActions();
 function apply(config){
  if(!Array.isArray(config.lessons))return;
  const attempted=[...drafts.values()].some(draft=>draft.tries>0||draft.score>0||draft.historyRows?.length||
   draft.fields?.some(([value,checked,id])=>checked||id&&String(value).trim())||
   draft.marks?.flat(Infinity).some(value=>value!==null&&value!==undefined)||
   draft.cardPlaces?.some(value=>value!==null&&value!==undefined));
  const previous=JSON.stringify(runSettings);
  selectedLessons=new Set(config.lessons);packSelection=config.packs===null?null:new Set(config.packs||[]);
  pickedVocab.clear();for(const id of config.extras||[])if(sheet[id])pickedVocab.add(id);
  committedSettings=settingsSnapshot();filters();renderPickedVocab();updateSettingsSave();
  if(!attempted&&previous!==JSON.stringify(committedSettings)){
   const overview=viewingOverview;runHistory=runHistory.filter(item=>item.id!==runMeta?.id);
   runMeta=null;drafts.clear();runSettings=committedSettings;hideOverview();t=0;start();
   if(overview)showOverview(true);saveSession();
  }
 }
 apply(api.settings);
 if(api.readOnly)showOverview(true);
 api.onSettingsChange(apply);
 api.onStateChange(run=>{applyWorksheetRun(run);});
 const tools=installWorksheetToolDock(data=>api.showTools(data),()=>!api.readOnly);
 api.onToolAction(tools.action);
 const button=document.getElementById('save-settings'),original=button.onclick;
 button.onclick=async event=>{
  if(!selectedLessons.size)return original(event);
  if(!await api.saveSettings(settingsSnapshot()))return;
  const config=settingsSnapshot();original(event);apply(config);
 };
}
