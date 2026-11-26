// Generate equivalent wording and clause orders for identified L28 sentences only.
// These candidates are transient, so stored rounds do not grow or lose answers.
export function kykloppFreiarbeitVariants(variants,value){
 if(!Array.isArray(variants)||!variants.length)return variants;
 const first=variants[0],text=String(value||'');
 if(first.includes('großartigen Mann')&&first.includes('Liebe beunruhigt')){
  const expanded=new Set(variants);
  for(const variant of variants){
   const subjects=[variant];
   if(/^(Als|Während) sie /u.test(variant))subjects.push(variant.replace(/^(Als|Während) sie /u,'$1 diese '));
   for(const subject of subjects){
    expanded.add(subject);
    expanded.add(subject.replace(/beunruhigt/gu,'ergriffen'));
    expanded.add(subject.replace(/beunruhigt/gu,'bewegt'));
   }
  }
  return [...expanded];
 }
 let kind='',shape='';
 if(first.includes('unbekannten Ort')&&first.includes('Höhle')&&/^ich\s+(?:kam|gelangte|bin)\b/iu.test(text)){
  kind='arrival';shape=/;\s*ich\b/iu.test(text)?'subject':'place';
 }else if(/Hunger.*Durst/.test(first)&&first.includes('Speisen')&&first.includes('Polyphem')&&/^wir\s+nahm/iu.test(text)){
  kind='food';
  shape=[/^wir\s+\S+\s+gern\b/iu.test(text),/\bzu uns\b/iu.test(text),/\bworden waren\b/iu.test(text)?'prior':/\b(?:getrieben|gequält) waren\b/iu.test(text)?'state':'past'].join('|');
 }else if(first.includes('Auge fehlte')&&first.includes('Höhle')&&first.includes('fragte')&&/^(?:dieser|er)\s+(?:bemerkte|merkte|verstand|erkannte)\b/iu.test(text))kind='cave';
 if(!kind)return variants;
 const cache=kykloppFreiarbeitVariants.cache??=new WeakMap();
 let entries=cache.get(variants);if(!entries){entries=new Map();cache.set(variants,entries);}
 const key=kind+'|'+shape;if(entries.has(key))return entries.get(key);
 const result=new Set();
 for(const variant of variants){
  if(kind==='arrival'){
   const match=/^(Einst|Einmal) (kam|gelangte|bin) ich (.+); (an diesem Ort|dort) (fand|habe) ich (.+)$/u.exec(variant);
   if(!match)continue;
   const [,when,verb,body,place,secondVerb,ending]=match;
   result.add('Ich '+verb+' '+when.toLowerCase()+' '+body+'; '+(shape==='subject'?'ich '+secondVerb+' '+place:place+' '+secondVerb+' ich')+' '+ending);
  }else if(kind==='food'){
   const match=/^Weil ([^,]+), nahmen wir gern (.+), als (.+)$/u.exec(variant);
   if(!match)continue;
   let [,cause,food,ending]=match;
   const [front,reflexive,tense]=shape.split('|');
   if(tense==='state')cause=cause.replace(/(getrieben|gequält) wurden$/u,'$1 waren');
   if(tense==='prior')cause=cause.replace(/(getrieben|gequält) wurden$/u,'$1 worden waren');
   const bare=food.replace(/^die (\S+) Speisen/u,(_,adjective)=>adjective.replace(/en$/u,'e')+' Speisen').replace(/\bund den /u,'und ');
   for(const phrase of new Set([food,bare])){
    const main=front==='true'?'Wir nahmen gern '+phrase:'Wir nahmen '+phrase+' gern';
    result.add(main+(reflexive==='true'?' zu uns':'')+', weil '+cause+', als '+ending);
   }
  }else{
   const match=/^Obwohl ([^,]+), (\S+) (dieser|er) ([^,]+), dass ([^,]+), (.+)$/iu.exec(variant);
   if(!match)continue;
   const [,cause,verb,subject,adverbs,content,ending]=match;
   result.add(subject[0].toUpperCase()+subject.slice(1)+' '+verb+' '+adverbs+', obwohl '+cause+', dass '+content+', '+ending);
  }
 }
 const expanded=result.size?[...result]:variants;
 entries.set(key,expanded);return expanded;
}

export function improveFreiarbeitVariants(source){
 if(!source.includes('const freiarbeitData=')||!source.includes('function freiarbeitSentenceMatches(value,variants){'))return source;
 return kykloppFreiarbeitVariants.toString()+'\n'+source
  .replace("Die Verknüpfung des Nebensatzes verändert die Konstruktion.","Konstruktionsfehler: Prüfe, wie die lateinische Satzkonstruktion ins Deutsche übertragen wird, zum Beispiel ein AcI, PC, Ablativus absolutus, Relativsatz oder relativer Satzanschluss.")
  .replace("return issue('S','right',actual.length>=4||expected.length>=4?1:.5,'Prüfe den Inhalt dieser Wortgruppe und ihre Zuordnung im Satz.');","return issue('Nest','right',actual.length>=4||expected.length>=4?1:.5,'Zusammenhängendes Fehlernest: Prüfe den Inhalt dieser Wortgruppe und ihre Zuordnung im Satz.',{nest:true});")
  .replace("return issue.nest?'('+amount+') '+issue.code:(amount?amount+' ':'')+issue.code;","return issue.nest?(amount||issue.code):(amount?amount+' ':'')+issue.code;")
  .replace("if(best.cost&&bagA===bagB)return {issues:[],reference:best.variant,uncertain:true,note:'Die Wörter stimmen weitgehend überein. Diese Satzstellung lässt sich automatisch nicht sicher beurteilen.'};", "if(best.cost&&bagA===bagB)return {issues:[...issues.filter(item=>item.side==='left'),{...issue('Sb?','left',0,'Die Wörter stimmen überein. Bitte die Satzstellung prüfen; dies ist kein festgestellter Fehler und wird nicht abgezogen.',{advisory:true}),start:0,end:0,actual:'',expected:''}].sort((a,b)=>a.start-b.start||a.end-b.end),reference:best.variant,uncertain:true,advisoryOnly:true};")
  .replace("return !analysis.uncertain&&analysis.issues.length>0", "return (!analysis.uncertain||analysis.advisoryOnly)&&analysis.issues.length>0")
  .replace('if(analysis.uncertain){const note=', 'if(analysis.uncertain&&!analysis.advisoryOnly){const note=')
  .replace("if(['Z','L','Ff'].includes(item.code))continue;", "if(item.advisory||['Z','L','Ff'].includes(item.code))continue;")
  .replace("const style=issue.missing?'gap':", "const style=issue.advisory?'advisory':issue.missing?'gap':")
  .replace('class="fa-correction-symbol" title=',`class="fa-correction-symbol'+(issue.nest?' fa-correction-nest':'')+(issue.advisory?' fa-correction-advisory':'')+'" title=`)
  .replace('function freiarbeitSentenceMatches(value,variants){','function freiarbeitSentenceMatches(value,variants){\n variants=kykloppFreiarbeitVariants(variants,value);')
  .replace('function analyze(text,variants,options={}){','function analyze(text,variants,options={}){\n variants=kykloppFreiarbeitVariants(variants,text);');
}

export function improveFreiarbeitCorrectionStyle(source){
 if(!source.includes('.fa-error-nest{'))return source;
 return source+`\n.fa-correction-symbol.fa-correction-nest{min-width:30px;min-height:21px;padding:0 5px 3px;text-align:center;box-sizing:border-box;border:1.5px solid currentColor;border-top:0;border-radius:0 0 8px 8px}
.fa-error-advisory{text-decoration:none}
.fa-correction-symbol.fa-correction-advisory{color:#65768a}
`;
}
