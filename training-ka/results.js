export function worksheetCaptureRating(question,fields,attempt){
 const evidence=question.worksheetEvidence??={units:{},attempts:0};
 evidence.attempts=Math.max(evidence.attempts,attempt);
 evidence.clean=fields.every(field=>field.result==='correct');
 for(const unit of Object.values(evidence.units))unit.active=false;
 for(const field of fields){
  const key=field.name?'choice:'+field.name:field.id?'field:'+field.id:null;
  if(!key)continue;
  const count=question.type===6&&/^v\d+$/.test(field.id||'')?Math.min(2,question.entries[Number(field.id.slice(1))]?.senses?.length||1):1;
  const parts=Array.isArray(field.meaningStates)&&field.meaningStates.length?field.meaningStates.slice(0,count):Array(count).fill(field.result==='correct');
  while(parts.length<count)parts.push(false);
  parts.forEach((correct,index)=>{
   const unit=evidence.units[key+':'+index]??={first:null,correct:false};
   unit.active=true;
   unit.correct=Boolean(correct);
   if(correct&&unit.first===null)unit.first=attempt;
  });
 }
}
export function worksheetTaskRating(state){
 if(!state)return null;
 const evidence=(state.round||[]).map(question=>question.worksheetEvidence).filter(Boolean);
 if(evidence.length){
  const units=evidence.flatMap(item=>Object.values(item.units).filter(unit=>unit.active!==false));
  if(units.length)return {total:units.length,earned:units.reduce((sum,unit)=>sum+(unit.correct?(unit.first===1?1:unit.first===2?.5:.25):0),0),perfect:evidence.every(item=>item.attempts===1&&item.clean)&&units.every(unit=>unit.correct&&unit.first===1)};
 }
 // Older saved rounds have final field feedback but no first-correct history.
 // Preserve partial credit conservatively using their recorded attempt count.
 const fields=state.fieldResults||[];
 if(fields.length){
  const question={};worksheetCaptureRating(question,fields,Math.max(1,state.tries||1));
  return worksheetTaskRating({round:[question]});
 }
 return null;
}
export function worksheetRating(rows){
 const total=rows.reduce((sum,row)=>sum+(row.rating?.total??(Number(row.total)||0)),0);
 if(!total)return 0;
 let perfect=true;
 const earned=rows.reduce((sum,row)=>{
  if(row.rating){perfect&&=row.rating.perfect;return sum+row.rating.earned;}
  const attempts=Math.max(1,Number(row.attempts)||1),score=Math.max(0,Math.min(Number(row.total)||0,Number(row.score)||0));
  if(attempts!==1||score!==row.total)perfect=false;
  return sum+score*(attempts===1?1:attempts===2?.5:.25);
 },0);
 return perfect?3:Math.min(2.5,Math.max(0,Math.floor(6*earned/total+1e-9)/2));
}
export function worksheetStars(stars,animate=true){
 const svg='<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 2 61.8 36.2 98 36.2 68.8 57.4 80 92 50 70.6 20 92 31.2 57.4 2 36.2 38.2 36.2Z"/></svg>';
 return '<span class="kyklopp-rating'+(animate?' is-animated':'')+'" role="img" aria-label="'+String(stars).replace('.',',')+' von 3 Sternen">'+[0,1,2].map(index=>'<span class="kyklopp-star" aria-hidden="true" style="--fill:'+Math.min(100,Math.max(0,(stars-index)*100))+'%;--delay:'+(index*.25)+'s"><span>'+svg+'</span><b>'+svg+'</b></span>').join('')+'</span>';
}
export function worksheetResult(stars,base){
 const tier=stars<=1?'practice':stars<=1.5?'progress':stars===2?'strong':'perfect';
 const alt={practice:'Kloppo ermutigt zum Weiterüben',progress:'Kloppo zeigt deinen Fortschritt',strong:'Kloppo zeigt den Daumen nach oben',perfect:'Kloppo jubelt'};
 return '<div class="kyklopp-result">'+worksheetStars(stars)+'<img class="kyklopp-result-art" width="600" height="400" src="'+base+'kloppo-'+tier+'.webp" alt="'+alt[tier]+'"></div>';
}
const css=`
.kyklopp-rating{display:inline-flex;justify-content:center;gap:6px;font:56px/1.2 Arial,sans-serif;vertical-align:middle;letter-spacing:0}
.kyklopp-star{display:inline-block;position:relative;width:1em;height:1em;color:#d7dce2;text-align:left}
.kyklopp-star svg{display:block;width:1em;height:1em;fill:currentColor}
.kyklopp-star>b{position:absolute;inset:0 auto 0 0;width:var(--fill);overflow:hidden;color:#b8780c;font-weight:inherit;white-space:nowrap}
.kyklopp-rating.is-animated .kyklopp-star>b{animation:kyklopp-star-fill .55s ease-out var(--delay) both}
.kyklopp-rating.is-animated .kyklopp-star{animation:kyklopp-star-pop .45s ease-out var(--delay) both}
.kyklopp-result-art{display:block;width:min(280px,85%);height:auto;margin:12px auto 8px}
.history-stars .kyklopp-rating{font-size:23px;gap:2px}
@keyframes kyklopp-star-fill{from{width:0}to{width:var(--fill)}}
@keyframes kyklopp-star-pop{from{opacity:0;transform:scale(.75)}to{opacity:1;transform:scale(1)}}
@media(prefers-reduced-motion:reduce){.kyklopp-rating.is-animated .kyklopp-star,.kyklopp-rating.is-animated .kyklopp-star>b{animation:none}}
`;
export function improveWorksheetResults(source,base='../vokabelbilder/grammatik-ergebnisse/'){
 if(source.includes('function progressRows(){')&&!source.includes('function worksheetRating(')){
  source=source.replace('function progressRows(){',[worksheetCaptureRating,worksheetTaskRating,worksheetRating,worksheetStars,worksheetResult].map(fn=>fn.toString().replace(/^export /,'')).join('\n')+'\nfunction progressRows(){');
  source=source.replace('tries++;good=',"tries++;worksheetCaptureRating(q,[...fieldResults.filter(field=>!(type===6&&field.id?.startsWith('grammar-')&&!vocabularyGrammarSpec(q.entries[Number(field.id.slice(8))]).required)),...(type===1?boardTokens(q).map(({word},index)=>({id:'board-'+index,result:q.entries[word].keys.includes(cardPlaces[index]??10)?'correct':'review'})):[]),...(type===4?marks.flatMap((row,index)=>aciExpectedKeys(q.entries[index]).map((key,role)=>({id:'mark-'+index+'-'+role,result:row[role]===key?'correct':'review'}))):[])],tries);good=");
  source=source.replace('return {name,total,done,score:','return {rating:worksheetTaskRating(state),name,total,done,score:');
  source=source.replace('name:row.name,total:row.total','rating:row.rating,name:row.name,total:row.total');
  source=source.replace("+' '+sum.right+' von '+sum.total+' Übungsteilen richtig.'",'');
  source=source.replace('ready?Math.round(3*sum.right/sum.total):0','ready?worksheetRating(rows):0')
   .replace('complete?Math.round(3*right/total):null','complete?worksheetRating(tasks):null')
   .replace('Number.isInteger(item.stars)&&item.stars>=0','Number.isFinite(item.stars)&&Number.isInteger(item.stars*2)&&item.stars>=0');
  source=source.replace(/const mark=ready\?[^\n]+;/,'const mark=ready?worksheetResult(stars,'+JSON.stringify(base)+'):\'\';');
  source=source.replace(/const stars=item.stars===null\?[^\n]+;/,'const stars=item.stars===null?\'<span class="history-star-note">Sterne nach Abschluss</span>\':worksheetStars(item.stars,false);');
  source=source.replace('function ensureRunMeta(){','runHistory=runHistory.map(item=>item.complete?{...item,stars:worksheetRating(item.tasks)}:item);\nfunction ensureRunMeta(){');
 }
 if(source.includes('.result-stars{'))source=source.includes('</style>')?source.replace('</style>',css+'\n</style>'):source+'\n'+css;
 return source;
}
