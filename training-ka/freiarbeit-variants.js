import {kykloppPCVariants} from './pc-variants.js?v=756e7b3f7f18';
export function kykloppSyntaxIssues(actual,expected,text){
 const issues=[],add=(start,end,hint)=>issues.push({code:'Sb',side:'left',weight:.5,start,end,actual:text.slice(start,end),expected:'',hint});
 if(/^(wo|wer|was|wann|warum|wie|wohin|woher|weshalb|wieso)$/.test(expected[0]?.key)){
  const at=actual.findIndex(word=>word.key===expected[0].key);
  if(at>0&&at<=6&&actual.slice(0,at).every(word=>expected.some(model=>model.key===word.key))&&!/[,;:.!?—–]/.test(text.slice(actual[0].start,actual[at].start))){
   const end=actual[Math.min(at+1,actual.length-1)].end;
   add(actual[0].start,end,'In dieser direkten Frage steht das Fragewort am Anfang: zum Beispiel „Wo ist jener Dieb …?“');
  }
 }
 for(let index=1;index<actual.length;index++){
  const determiner=actual[index].key,noun=actual[index-1].key;
  if(!/^(mein|dein|sein|ihr|unser|euer)(e|er|es|en|em)?$/.test(determiner))continue;
  if(expected.some((word,i)=>word.key===determiner&&expected[i+1]?.key===noun))add(actual[index-1].start,actual[index].end,'Der Possessivbegleiter gehört hier vor das Substantiv: zum Beispiel „meine Speisen“.');
 }
 return issues;
}
// Generate equivalent wording and clause orders for identified L28 sentences only.
// These candidates are transient, so stored rounds do not grow or lose answers.
export function kykloppFreiarbeitVariants(variants,value){
 if(!Array.isArray(variants)||!variants.length)return variants;
 variants=kykloppPCVariants(variants,value);
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
 return kykloppPCVariants.toString()+'\n'+kykloppSyntaxIssues.toString()+'\n'+kykloppFreiarbeitVariants.toString()+'\n'+source
  .replace("['kommen',['komme','kommst','kommt','kommen','kommt','kommen'],", "['irren',['irre','irrst','irrt','irren','irrt','irren'],['irrte','irrtest','irrte','irrten','irrtet','irrten']],\n  ['kommen',['komme','kommst','kommt','kommen','kommt','kommen'],")
  .replace('const entirelyMissing=issues.length===1&&issues[0].missing;',"const syntax=kykloppSyntaxIssues(actual,expected,text);if(syntax.length)return {issues:[...(best.score>.65?[]:issues.filter(item=>!syntax.some(mark=>item.start<mark.end&&item.end>mark.start))),...syntax].sort((a,b)=>a.start-b.start||a.end-b.end),reference:best.variant,uncertain:false};const entirelyMissing=issues.length===1&&issues[0].missing;")
  .replace('let best=null;for(const variant of variants){',"let best=null;const actualKey=actual.map(word=>word.key).join(' '),exactVariant=variants.find(variant=>words(variant).map(word=>word.key).join(' ')===actualKey);if(exactVariant)variants=[exactVariant];for(const variant of variants){")
  .replace("Die Verknüpfung des Nebensatzes verändert die Konstruktion.","Konstruktionsfehler: Prüfe, wie die lateinische Satzkonstruktion ins Deutsche übertragen wird, zum Beispiel ein AcI, PC, Ablativus absolutus, Relativsatz oder relativer Satzanschluss.")
  .replace("return issue('S','right',actual.length>=4||expected.length>=4?1:.5,'Prüfe den Inhalt dieser Wortgruppe und ihre Zuordnung im Satz.');","if(actual.length===1){if(allExpected.some(word=>word.key===actual[0].key))return issue('Sb?','left',0,'Dieses Wort kommt in der Vergleichsübersetzung an einer anderen Stelle vor. Bitte die Wortstellung prüfen; kein gesicherter Fehler.',{advisory:true});return issue('V','right',.5,'Prüfe die Bedeutung dieses einzelnen Wortes.');}return issue('Nest','right',actual.length>=4||expected.length>=4?1:.5,'Zusammenhängendes Fehlernest: Prüfe den Inhalt dieser Wortgruppe und ihre Zuordnung im Satz.',{nest:true});")
  .replace("if(articles.has(a)&&articles.has(b))return issue('Gr'", "if(/^(dies|jen)(e|er|es|en|em)$/.test(a)&&/^(dies|jen)(e|er|es|en|em)$/.test(b)&&a.replace(/^(dies|jen)/,'')===b.replace(/^(dies|jen)/,'')&&!((a.startsWith('dies')&&b.startsWith('dies'))||(a.startsWith('jen')&&b.startsWith('jen'))))return issue('V','right',.5,'Prüfe die Bedeutung des Demonstrativpronomens: dieser und jener sind hier nicht gleichbedeutend.');if(articles.has(a)&&articles.has(b))return issue('Gr'")
  .replace("||pieces.every(piece=>piece.code==='R')))", "||pieces.every(piece=>piece.code==='R')||pieces.length===2&&pieces.every(piece=>['V','R'].includes(piece.code))))")
  .replace("return issue.nest?'('+amount+') '+issue.code:(amount?amount+' ':'')+issue.code;","return issue.nest?(amount||issue.code):(amount?amount+' ':'')+issue.code;")
  .replace("if(best.cost&&bagA===bagB)return {issues:[],reference:best.variant,uncertain:true,note:'Die Wörter stimmen weitgehend überein. Diese Satzstellung lässt sich automatisch nicht sicher beurteilen.'};", "if(best.cost&&bagA===bagB)return {issues:[...issues.filter(item=>item.side==='left'),{...issue('Sb?','left',0,'Die Wörter stimmen überein. Bitte die Satzstellung prüfen; dies ist kein festgestellter Fehler und wird nicht abgezogen.',{advisory:true}),start:0,end:0,actual:'',expected:''}].sort((a,b)=>a.start-b.start||a.end-b.end),reference:best.variant,uncertain:true,advisoryOnly:true};")
  .replace("return !analysis.uncertain&&analysis.issues.length>0", "return (!analysis.uncertain||analysis.advisoryOnly)&&analysis.issues.length>0")
  .replace("analysis.issues.every(issue=>issue.side==='left')", "analysis.issues.every(issue=>issue.side==='left'&&issue.code!=='Sb')")
  .replace('if(analysis.uncertain){const note=', 'if(analysis.uncertain&&!analysis.advisoryOnly){const note=')
  .replace("if(['Z','L','Ff'].includes(item.code))continue;", "if(item.advisory||['Z','L','Ff'].includes(item.code))continue;")
  .replace("const style=issue.missing?'gap':", "const style=issue.code==='Sb'?'syntax':issue.advisory?'advisory':issue.missing?'gap':")
  .replace('class="fa-correction-symbol" title=',`class="fa-correction-symbol'+(issue.nest?' fa-correction-nest':'')+(issue.advisory?' fa-correction-advisory':'')+'" title=`)
  .replace('function freiarbeitSentenceMatches(value,variants){','function freiarbeitSentenceMatches(value,variants){\n variants=kykloppFreiarbeitVariants(variants,value);')
  .replace('function analyze(text,variants,options={}){','function analyze(text,variants,options={}){\n variants=kykloppFreiarbeitVariants(variants,text);');
}

export function improveFreiarbeitCorrectionStyle(source){
 if(!source.includes('.fa-error-nest{'))return source;
 return source+`\n.fa-correction-symbol.fa-correction-nest{min-width:30px;min-height:21px;padding:0 5px 3px;text-align:center;box-sizing:border-box;border:1.5px solid currentColor;border-top:0;border-radius:0 0 8px 8px}
.fa-error-advisory{text-decoration:none}
.fa-error-syntax{text-decoration-line:underline;text-decoration-style:wavy}
.fa-correction-symbol.fa-correction-advisory{color:#65768a}
`;
}
