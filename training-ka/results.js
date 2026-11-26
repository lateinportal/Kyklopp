export function worksheetRating(rows){
 const total=rows.reduce((sum,row)=>sum+(Number(row.total)||0),0);
 if(!total)return 0;
 let perfect=true;
 const earned=rows.reduce((sum,row)=>{
  const attempts=Math.max(1,Number(row.attempts)||1),score=Math.max(0,Math.min(Number(row.total)||0,Number(row.score)||0));
  if(attempts!==1||score!==row.total)perfect=false;
  return sum+score*(attempts===1?1:attempts===2?.5:.25);
 },0);
 return perfect?3:Math.min(2.5,Math.max(.5,Math.floor(6*earned/total+1e-9)/2));
}
export function worksheetStars(stars,animate=true){
 return '<span class="kyklopp-rating'+(animate?' is-animated':'')+'" role="img" aria-label="'+String(stars).replace('.',',')+' von 3 Sternen">'+[0,1,2].map(index=>'<span class="kyklopp-star" aria-hidden="true" style="--fill:'+Math.min(100,Math.max(0,(stars-index)*100))+'%;--delay:'+(index*.25)+'s"><span>★</span><b>★</b></span>').join('')+'</span>';
}
export function worksheetResult(stars,base){
 const tier=stars<=1?'practice':stars<=1.5?'progress':stars===2?'strong':'perfect';
 const alt={practice:'Kloppo ermutigt zum Weiterüben',progress:'Kloppo zeigt deinen Fortschritt',strong:'Kloppo zeigt den Daumen nach oben',perfect:'Kloppo jubelt'};
 return '<div class="kyklopp-result">'+worksheetStars(stars)+'<img class="kyklopp-result-art" src="'+base+'kloppo-'+tier+'.webp" alt="'+alt[tier]+'"></div>';
}
const css=`
.kyklopp-rating{display:inline-flex;justify-content:center;gap:6px;font:56px/1.2 Arial,sans-serif;vertical-align:middle;letter-spacing:0}
.kyklopp-star{display:inline-block;position:relative;width:1em;color:#d7dce2;text-align:left}
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
  source=source.replace('function progressRows(){',[worksheetRating,worksheetStars,worksheetResult].map(fn=>fn.toString().replace(/^export /,'')).join('\n')+'\nfunction progressRows(){');
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
