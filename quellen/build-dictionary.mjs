import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/data.js','utf8'),context);
const cards=context.window.CARDS, data=JSON.parse(fs.readFileSync('collatinus.json','utf8'));
// Corrections and school-vocabulary entries absent from the historical lexicon.
// These affect dictionary lookup only; original cards and learning IDs are untouched.
const added={latus:['corpus','later'],salvus:['nonus'],victor:['infans','victor'],melior:['deterior'],maior:['deterior'],minor:['deterior']};
for(const [lemma,[model,geninf]] of Object.entries(added))data.lemmas['roma_'+lemma]={lemma,model,geninf:geninf||null,perf:null,quantity:lemma,lexicon:''};
const norm=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/j/g,'i').replace(/v/g,'u').replace(/[!?]/g,'').replace(/\s+/g,' ').trim();
const rootsCache=new Map();
function roots(key){
 if(rootsCache.has(key))return rootsCache.get(key);
 const l=data.lemmas[key],m=data.models[l.model],base=(l.quantity||l.lemma.replace(/\d+/g,'')).split(',');let result={};
 for(const [id,[cut,add]] of Object.entries(m.R)){
  const explicit=id==='1'?l.geninf:id==='2'?l.perf:null;
  result[id]=explicit?explicit.split(','):cut==='K'?base:base.map(x=>(+cut?x.slice(0,-Number(cut)):x)+(add||''));
 }
 if(l.geninf&&!result['1'])result['1']=l.geninf.split(',');if(l.perf&&!result['2'])result['2']=l.perf.split(',');
 rootsCache.set(key,result);return result;
}
function forms(key,only){
 const m=data.models[data.lemmas[key].model],r=roots(key),out=[];
 for(const [id,parts] of Object.entries(m.des)){
  if(only&&!only.has(+id)||m.abs.includes(+id))continue;
  let values=[];
  // Classical future imperatives of deponents; the old CLTK conversion
  // incorrectly repeats the present plural -mini for every future person.
  if(key.endsWith('or')&&[183,184,185,186].includes(+id)){
   if(+id===185)continue;
   const inf=forms(key,new Set([187]))[0]?.[0],third=forms(key,new Set([126]))[0]?.[0];
   const future=+id===186?third?.replace(/ur$/,'or'):inf?.endsWith('ri')?inf.slice(0,-2)+'tor':inf?.endsWith('i')?inf.slice(0,-1)+'itor':null;
   if(future)out.push([future,+id]);continue;
  }
  for(const [rid,endings] of parts)for(const root of r[rid]||[])for(const ending of endings)values.push(root+ending);
  if(m.sufd.length)values=values.flatMap(x=>m.sufd.map(s=>x+s));
  const old=[...values];for(const [suffix,ids] of m.suf)if(ids.includes(+id))values.push(...old.map(x=>x+suffix));
  for(const form of new Set(values))if(form)out.push([form,+id]);
 }
 return out;
}
const aliases=new Map();function alias(word,key){let n=norm(word);if(!aliases.has(n))aliases.set(n,new Set());aliases.get(n).add(key);}
for(const [key,l] of Object.entries(data.lemmas)){
 alias(key.replace(/\d+$/,''),key);for(const q of (l.quantity||'').split(','))if(q)alias(q,key);
 const m=data.models[l.model];if(m.des['187'])for(const [form] of forms(key,new Set([187])))alias(form,key);
}
for(const [word,key] of Object.entries(data.maps))if(data.lemmas[key])alias(word,key);
// Common assimilated spellings are spelling variants, not new dictionary entries.
for(const [word,key] of [['attingo','adtingo'],['attingere','adtingo'],['affero','adfero'],['afferre','adfero'],['appeto','adpeto'],['appetere','adpeto']])if(data.lemmas[key])alias(word,key);
function modelType(key){let m=data.models[data.lemmas[key].model];return m.des['187']?'Verb':m.des['13']||m.des['37']?'Adjektiv':m.des['1']?'Substantiv':'other';}
const fixes={ceteri:'ceterus',liberi:'liberi',superi:'superi',reverti:'revertor',meminisse:'memini',odisse:'odi',coepisse:'coepi',attingere:'adtingo',afferre:'adfero',appetere:'adpeto',novisse:'nosco',nosse:'nosco',pauci:'paucus',multa:'multus',copiae:'copia',auxilia:'auxilium',plurimi:'plurimus',opes:'ops',virtutes:'virtus',plures:'plus',decem:'decem',tot:'tot',constat:'consto',oportet:'oporteo',refert:'refero'};
const normalizedFixes=Object.fromEntries(Object.entries(fixes).map(([k,v])=>[norm(k),v]));
function resolve(c){
 let n=norm(c.latin),target=c.pos==='Verb'?'Verb':c.pos==='Substantiv'||c.pos==='Name'?'Substantiv':'Adjektiv';
 let candidates=new Set([...(aliases.get(n)||[]),...(aliases.get(norm(normalizedFixes[n]))||[])]);
 for(const alternative of c.latin.split('/')){let an=norm(alternative);for(const k of [...(aliases.get(an)||[]),...(aliases.get(norm(normalizedFixes[an]))||[])])candidates.add(k);}
 if(c.pos==='Verb'&&c.stems?.[0])for(const key of aliases.get(norm(c.stems[0]))||[])candidates.add(key);
 let list=[...candidates].filter(k=>c.pos==='Pronomen'||modelType(k)===target||data.models[data.lemmas[k].model].des['416']);
 if(added[n])list=['roma_'+n];
 if(c.pos==='Pronomen'||c.pos==='Adjektiv')list=list.filter(k=>!data.models[data.lemmas[k].model].des['416']||list.length===1);
 if(!list.length)return [];
 if(c.pos==='Verb'){
 // Homonymous first-person forms do not identify the verb: volo can be velle or volare.
 // Prefer the actual present infinitive before consulting principal parts.
 const infinitives=c.latin.split('/').map(norm);
 const exactInfinitive=list.filter(k=>forms(k,new Set([187])).some(([f])=>infinitives.includes(norm(f))));
 if(exactInfinitive.length)list=exactInfinitive;
 const present=norm(c.stems?.[0]),matching=list.filter(k=>norm(k.replace(/\d+$/,''))===present);if(matching.length)list=matching;
 if(c.stems?.[1]){const perfect=norm(c.stems[1]),matchingPerfect=list.filter(k=>forms(k,new Set([139])).some(([f])=>norm(f)===perfect));if(matchingPerfect.length)list=matchingPerfect;}
}
 if(c.pos==='Substantiv'&&c.gender){let matching=list.filter(k=>data.lemmas[k].lexicon?.includes(c.gender+'.'));if(matching.length)list=matching;}
 // Prefer matching genitives over unrelated homographs (e.g. os/oris vs os/ossis).
 if(c.gen){let matching=list.filter(k=>forms(k,new Set([4])).some(([f])=>norm(f)===norm(c.gen)));if(matching.length)list=matching;}
 return list;
}
const phraseRules={
 c102:{parts:['Circus','Maximus']},c520:{parts:['res','publicus']},c640:{parts:['Gaius','Gracchus']},c641:{parts:['Tiberius','Gracchus']},c656:{parts:['aes','alienus']},c841:{parts:['res','gestus'],plural:true},c1129:{parts:['Colonia','Augustus'],suffix:' Treverorum'},
 c587:{base:'orbis',suffix:' terrarum'},c648:{base:'mos',suffix:' maiorum'},c677:{base:'regia'},c997:{base:'dextera'}
};
function getBase(word,pos='Verb'){return resolve({latin:word,pos,stems:[]})[0];}
function phraseForms(c){
 let rule=phraseRules[c.id];
 if(rule?.parts){
  const [a,b]=rule.parts,ka=getBase(a,'Substantiv')||getBase(a,'Adjektiv'),kb=getBase(b,'Adjektiv')||getBase(b,'Substantiv');if(!ka||!kb)return [];
  return forms(ka).flatMap(([f,id])=>forms(kb).filter(([,jd])=>{let p=data.pos[id],q=data.pos[jd];return p[2]===q[2]&&p[7]===q[7]&&(!rule.plural||p[2]==='p')&&(!q[6]||q[6]==='-'||q[6]===(c.grammar.includes(' f')?'f':c.grammar.includes(' n')?'n':'m'));}).map(([g])=>[f+' '+g+(rule.suffix||''),id]));
 }
 if(rule?.base){let k=getBase(rule.base,'Substantiv')||getBase(rule.base,'Adjektiv');return k?forms(k).map(([f,id])=>[f+(rule.suffix||''),id]):[];}
 if(c.pos==='Verb'||['c128','c121'].includes(c.id)||/dēbēre|tenēre/.test(c.latin)){
  let plain=c.latin.replace(/,.*$/,'').replace(/\/.*/,'').trim(),words=plain.split(' '),last=words.findLastIndex(w=>/re$|ri$|esse$|i$/.test(norm(w)));
  if(last>=0&&words.length>1){let k=getBase(words[last]);if(k)return forms(k).map(([f,id])=>[[...words.slice(0,last),f,...words.slice(last+1)].join(' '),id]);}
  if(c.latin.includes(',')){let k=getBase(plain);if(k)return forms(k).map(([f,id])=>[f+c.latin.slice(c.latin.indexOf(',')),id]);}
 }
 return [];
}
let nextTag=500;const labels=new Map();function label(text){if(!labels.has(text)){labels.set(text,nextTag);data.pos[nextTag++]='@'+text;}return labels.get(text);}
function compoundForms(key){
 let records=forms(key),dep=key.endsWith('or'),out=[];
 for(const [part,id] of records){let tag=data.pos[id];if(tag?.[0]!=='g'||tag[3]!=='r'||tag[7]!=='n')continue;
  let num=tag[2],gender={m:'Maskulinum',f:'Femininum',n:'Neutrum'}[tag[6]];
  for(const [tense,mood,aux] of [['Perfekt','Indikativ',num==='s'?['sum','es','est']:['sumus','estis','sunt']],['Plusquamperfekt','Indikativ',num==='s'?['eram','eras','erat']:['eramus','eratis','erant']],['Futur II','Indikativ',num==='s'?['ero','eris','erit']:['erimus','eritis','erunt']],['Perfekt','Konjunktiv',num==='s'?['sim','sis','sit']:['simus','sitis','sint']],['Plusquamperfekt','Konjunktiv',num==='s'?['essem','esses','esset']:['essemus','essetis','essent']]])aux.forEach((a,i)=>out.push([part+' '+a,label((i+1)+'. Person '+(num==='s'?'Singular':'Plural')+' · '+mood+' '+tense+' · '+(dep?'Deponens':'Passiv')+' · '+gender)]));
 }
 for(const [part,id] of records){let tag=data.pos[id];if(tag?.[0]==='g'&&['r','f'].includes(tag[3])&&tag[7]==='a'){
  out.push([part+' esse',label('Infinitiv '+(tag[3]==='r'?'Perfekt':'Futur')+' · '+(dep?'Deponens':tag[3]==='r'?'Passiv':'Aktiv'))]);
  if(tag[3]==='r')out.push([part+' fuisse',label('Infinitiv Perfekt '+(dep?'Deponens':'Passiv')+' (mit fuisse)')]);
 }}
 return out;
}
const fixedPronouns={tibi:['tu','tibi'],me:['ego','me'],mihi:['ego','mihi'],te:['tu','te'],nobis:['nos','nobis'],vos:['vos','vos'],secum:['se','secum']};
let byCard={},coverage=[],unknown=[];
for(const c of cards){
 const inflect=['Verb','Substantiv','Adjektiv','Pronomen','Name'].includes(c.pos),keys=inflect?resolve(c):[];
 let records=keys.flatMap(k=>[...forms(k),...(c.pos==='Verb'?compoundForms(k):[])]);let extra=phraseForms(c);records.push(...extra);
 let n=norm(c.latin);
 if(fixedPronouns[n]){let [base,word]=fixedPronouns[n],key=getBase(base,'Pronomen');if(key)records.push(...forms(key).filter(([f])=>norm(f)===norm(word)));}
 if(n==='qui'||n==='quis'){let key=getBase(n,'Pronomen');if(key)records.push(...forms(key));}
 if(n==='romam'||n==='romae'){let key=getBase('Roma','Substantiv');if(key)records.push(...forms(key).filter(([f])=>norm(f)===n));}
 if(n===norm('novisse/nosse')){let key=getBase('nosco');if(key)records.push(...forms(key).filter(([,id])=>['r','l','t'].includes(data.pos[id]?.[3])));}
 if(n===norm('novisse/nosse'))records.push(...records.filter(([f])=>/^novis/.test(f)).map(([f,id])=>[f.replace(/^novis/,'nos'),id]));
 if(n==='alius ... alius'){let key=getBase('alius','Adjektiv');if(key)records.push(...forms(key).map(([f,id])=>[f+' ... '+f,id]));}
 if(n==='opus est'){let key=getBase('esse');if(key)records.push(...forms(key).filter(([,id])=>data.pos[id]?.[0]==='v'&&data.pos[id]?.[1]==='3'&&data.pos[id]?.[2]==='s').map(([f,id])=>['opus '+f,id]));}
 if(n==='non dubito, quin'){let key=getBase('dubitare');if(key)records.push(...forms(key).map(([f,id])=>['non '+f+', quin',id]));}
 if(n==='fore')records.push(['fore',415],['futurum esse',415]);
 if(n==='inquam')for(const [f,desc] of [['inquam','1. Person Singular'],['inquis','2. Person Singular'],['inquit','3. Person Singular'],['inquimus','1. Person Plural'],['inquitis','2. Person Plural'],['inquiunt','3. Person Plural']])records.push([f,label(desc+' · Indikativ Präsens Aktiv')]);
 if(n==='quaesere'||n==='quaeso')records.push(['quaeso',label('1. Person Singular · Präsens Aktiv')],['quaesumus',label('1. Person Plural · Präsens Aktiv')]);
 // Keep assimilated spellings alongside the source's unassimilated variants.
 if(['attingere','afferre','appetere'].includes(n))records.push(...records.map(([f,id])=>[f.replace(/^adting/,'atting').replace(/^adfer/,'affer').replace(/^adtul/,'attul').replace(/^adlat/,'allat').replace(/^adpet/,'appet'),id]));
 // Plural-only entries must not invent singular senses.
 if(/\bPl\./.test(c.grammar.replace(/\bGen\.\s*Pl\./gi,''))||['ceteri','pauci','plurimi','plures'].includes(n))records=records.filter(([,id])=>data.pos[id]?.[2]==='p');
 if(n===norm('novisse/nosse'))records=records.filter(([,id])=>['r','l','t'].includes(data.pos[id]?.[3]));
 if(['oportet','refert','constat'].includes(n))records=records.filter(([,id])=>{let t=data.pos[id];return t?.[0]==='v'&&t[5]==='a'&&(t[4]==='n'||t[1]==='3'&&t[2]==='s');});
 const generated=records.length;records.push([c.latin,0]);
 if(c.latin.includes('/')&&!c.latin.includes(' '))for(const alternative of c.latin.split('/'))records.push([alternative,0]);
 for(const value of [c.gen,...(c.forms||[]),...(c.stems||[])])if(value)records.push([value,0]);
 const unique=new Map();for(const [f,id] of records){let key=norm(f);if(!unique.has(key))unique.set(key,{form:f,tags:new Set()});if(id)unique.get(key).tags.add(id);}
 byCard[c.id]=[...unique.values()].map(x=>[x.form,[...x.tags].sort((a,b)=>a-b)]);
 const status=generated?'Formenmodell':inflect?'Zu prüfen':'Unveränderlich / Wendung';
 coverage.push({id:c.id,latin:c.latin,pos:c.pos,lesson:c.lesson,models:keys,status,count:unique.size});
 if(inflect&&status==='Zu prüfen')unknown.push({latin:c.latin,grammar:c.grammar,pos:c.pos,cls:c.cls,id:c.id});
}
fs.writeFileSync('dictionary-coverage.json',JSON.stringify(coverage,null,2));fs.writeFileSync('dictionary-unresolved.json',JSON.stringify(unknown,null,2));
fs.writeFileSync('dist/morphology-data.js','window.ROMA_FORMS='+JSON.stringify({tags:data.pos,byCard,source:'Collatinus / CLTK',license:'GPL-3.0-or-later',version:1})+';');
console.log(JSON.stringify({cards:cards.length,modelled:coverage.filter(x=>x.models.length).length,unresolved:unknown.length,forms:Object.values(byCard).reduce((s,x)=>s+x.length,0),unknown},null,2));
