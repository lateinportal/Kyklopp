(function(root){
'use strict';
const data=root.ROMA_FORMS,cards=root.CARDS;
const normalize=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/j/g,'i').replace(/v/g,'u').replace(/[.!?„“"'’]/g,'').replace(/\s+/g,' ').trim();
const cases={n:'Nominativ',v:'Vokativ',a:'Akkusativ',g:'Genitiv',d:'Dativ',b:'Ablativ',l:'Lokativ'},numbers={s:'Singular',p:'Plural'},genders={m:'Maskulinum',f:'Femininum',n:'Neutrum'},tenses={p:'Präsens',i:'Imperfekt',f:'Futur I',r:'Perfekt',l:'Plusquamperfekt',t:'Futur II'},moods={i:'Indikativ',s:'Konjunktiv',m:'Imperativ',n:'Infinitiv'},voices={a:'Aktiv',p:'Passiv'};
function describe(id,c){
 const tag=data.tags[id];if(!tag)return 'Grundform / Angabe aus der Vokabeltabelle';if(tag.startsWith('@'))return tag.slice(1);if(tag==='inv.-----')return 'Unveränderlich';
 let parts=[];
 if(tag[0]==='v'){
  if(/[123]/.test(tag[1]))parts.push(tag[1]+'. Person');if(numbers[tag[2]])parts.push(numbers[tag[2]]);if(moods[tag[4]])parts.push(moods[tag[4]]);if(tenses[tag[3]])parts.push(tenses[tag[3]]);if(voices[tag[5]])parts.push(voices[tag[5]]);
  if(/or$/.test(normalize(c?.stems?.[0]))&&tag[5]==='a')parts.push('Deponens');
 }else{
  if(tag[0]==='g')parts.push('Partizip',tenses[tag[3]]||'',voices[tag[5]]||'');
  if(tag[4]==='g')parts.push('Gerundivum');
  if(cases[tag[7]])parts.push(cases[tag[7]]);if(numbers[tag[2]])parts.push(numbers[tag[2]]);const gender=c?.pos==='Substantiv'&&c.gender?c.gender:tag[6];if(gender)parts.push(genders[gender]||gender);
  if(tag[8]==='c')parts.push('Komparativ');if(tag[8]==='s')parts.push('Superlativ');
  if(id>=261&&id<=262)parts.unshift('Supinum');
 }
 return parts.filter(Boolean).join(' · ')||'Form';
}
let index=null;function ensureIndex(){if(index)return;index=new Map();for(const c of cards)for(const [form,tags] of data.byCard[c.id]||[]){let n=normalize(form);if(!index.has(n))index.set(n,new Map());let entries=index.get(n);if(!entries.has(c.id))entries.set(c.id,{card:c,forms:[]});entries.get(c.id).forms.push({form,tags});}}
function search(query){
 let q=normalize(query);if(!q)return cards.map(card=>({card,forms:[],exact:false}));ensureIndex();let found=new Map();
 for(const hit of index.get(q)?.values()||[])found.set(hit.card.id,{...hit,exact:true});
 if(!found.size)for(const ending of ['que','ne','ve'])if(q.endsWith(ending)&&q.length>ending.length+1){for(const hit of index.get(q.slice(0,-ending.length))?.values()||[])found.set(hit.card.id,{...hit,exact:true,enclitic:ending});}
 // Exact Latin forms take precedence over substring suggestions.
 if(found.size)return [...found.values()].sort((a,b)=>a.card.latin.localeCompare(b.card.latin,'de'));
 for(const card of cards)if(!found.has(card.id)&&(normalize(card.latin).includes(q)||normalize(card.de).includes(q)))found.set(card.id,{card,forms:[],exact:normalize(card.latin)===q});
 return [...found.values()].sort((a,b)=>Number(b.exact)-Number(a.exact)||a.card.latin.localeCompare(b.card.latin,'de'));
}
function analyses(hit){return [...new Set(hit.forms.flatMap(f=>f.tags.length?f.tags.map(id=>describe(id,hit.card)):['Grundform / Angabe aus der Vokabeltabelle']))];}
root.RomaDictionary={search,describe,analyses,normalize,formsFor:c=>data.byCard[c.id]||[],count:Object.values(data.byCard).reduce((n,a)=>n+a.length,0)};
})(typeof window!=='undefined'?window:globalThis);
