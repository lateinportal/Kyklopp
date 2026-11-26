// Reviewed PC resolutions for the five participial sentences in Freiarbeit L28.
// Keep the original answers. Generate equivalent German constructions without
// treating every subordinate conjunction or every participial tense as valid.
export function kykloppPCVariants(variants,value){
 if(!variants?.length)return variants;
 const first=variants[0],text=String(value||'');
 let kind='';
 if(first.includes('großartigen Mann')&&first.includes('Liebe beunruhigt'))kind='notice';
 else if(first.includes('Hunger')&&first.includes('Speisen')&&first.includes('Polyphem'))kind='hunger';
 else if(first.includes('Auge fehlte')&&first.includes('Höhle')&&first.includes('fragte'))kind='recognize';
 else if(first.includes('bedachte')&&first.includes('antwortete ihm'))kind='think';
 else if(first.includes('Höhle verließen')&&first.includes('hörten wir'))kind='leave';
 if(!kind)return variants;
 let family='',shape='';
 if(kind==='think')shape=/\ban\s+viele Dinge\b/iu.test(text)?'viele Dinge':/\ban\s+viel\b/iu.test(text)?'viel':'vieles';
 if(kind==='hunger'){
  family=/^Aus\b/iu.test(text)?'prep':/^Wir,\s*die/iu.test(text)?'relative':/^Von\b/iu.test(text)?'literal':/^Wir\s+(?:wurden|waren)/iu.test(text)?'coordinate':'subordinate';
  shape=[family,/\bdie\s+\S+\s+Speisen\b/u.test(text),/nahmen wir gern/u.test(text),/\bworden waren\b/u.test(text)?'anterior':/\b(?:getrieben|gequält) waren\b/u.test(text)?'state':'past',/^Als\b/iu.test(text)?'Als':/^Während\b/iu.test(text)?'Während':/^Da\b/iu.test(text)?'Da':/^Nachdem\b/iu.test(text)?'Nachdem':'Weil'].join('|');
 }
 const cache=kykloppPCVariants.cache??=new WeakMap();
 let entries=cache.get(variants);if(!entries){entries=new Map();cache.set(variants,entries);}
 const key=kind+'|'+shape;if(entries.has(key))return entries.get(key);
 const out=new Set(variants),add=value=>out.add(value),upper=value=>value[0].toUpperCase()+value.slice(1);
 if(kind==='notice')for(const variant of variants){
  const match=/^(Diese|Sie) bemerkte (.+) und wurde (.+ Liebe (?:beunruhigt|ergriffen|bewegt))\.$/u.exec(variant);
  if(!match)continue;
  const [,subject,object,passive]=match,lower=subject.toLowerCase();
  for(const verb of ['bemerkte','wahrnahm']){
   for(const link of ['Als','Während','Weil','Da']){
    add(link+' '+lower+' '+object+' '+verb+', wurde sie '+passive+'.');
    add(subject+' wurde '+passive+', '+link.toLowerCase()+' sie '+object+' '+verb+'.');
   }
   add(subject+', die '+object+' '+verb+', wurde '+passive+'.');
  }
  for(const participle of ['bemerkend','wahrnehmend']){
   add(upper(object)+' '+participle+', wurde sie '+passive+'.');
   add(subject+' wurde, '+object+' '+participle+', '+passive+'.');
  }
  const genitive=object.replace(/^den /u,'des ').replace(/ Mann$/u,' Mannes');
  if(genitive!==object)for(const noun of ['Bemerken','Wahrnehmen','Anblick'])add('Beim '+noun+' '+genitive+' wurde sie '+passive+'.');
 }
 if(kind==='hunger')for(const variant of variants){
  const match=/^Weil wir (von (?:Hunger und Durst|Durst und Hunger) (?:gequält|getrieben)) wurden, nahmen wir gern (.+), als (.+)$/u.exec(variant);
  if(!match)continue;
  const [,participle,originalFood,ending]=match,[,articles,front,tense,link]=shape.split('|');
  const food=articles==='true'?originalFood:originalFood.replace(/^die (\S+) Speisen/u,(_,a)=>a.replace(/en$/u,'e')+' Speisen').replace(/\bund den /u,'und ');
  const meal='nahmen wir '+(front==='true'?'gern '+food:food+' gern');
  const cause=participle+(tense==='anterior'?' worden waren':tense==='state'?' waren':' wurden');
  const tail=', als '+ending;
  if(family==='literal')add(upper(participle)+', '+meal+tail);
  if(family==='prep')add('Aus '+(participle.includes('Hunger und Durst')?'Hunger und Durst':'Durst und Hunger')+' '+meal+tail);
  if(family==='relative'){
   add('Wir, die '+cause+', '+meal.replace(/^nahmen wir /u,'nahmen ')+tail);
   add('Wir, die wir '+cause+', '+meal.replace(/^nahmen wir /u,'nahmen ')+tail);
  }
  if(family==='coordinate'){
   add('Wir wurden '+participle+' und '+meal.replace(/^nahmen wir /u,'nahmen deshalb ')+tail);
   add('Wir waren '+participle+' worden und '+meal.replace(/^nahmen wir /u,'nahmen deshalb ')+tail);
  }
  if(family==='subordinate'){
   // A temporal nachdem clause preserves the PPP's anteriority explicitly.
   const temporalCause=link==='Nachdem'?participle+' worden waren':cause;
   add(link+' wir '+temporalCause+', '+meal+tail);
  }
 }
 if(kind==='recognize')for(const variant of variants){
  const match=/^Obwohl ihm ein Auge fehlte, (bemerkte|erkannte|verstand) (dieser|er) dennoch sofort, dass ([^,]+), und fragte (.+)$/u.exec(variant);
  if(!match)continue;
  const [,verb,subject,content,voice]=match;
  for(const link of ['Als','Während','Weil','Da'])add(link+' '+subject+' sofort '+verb+', dass '+content+', fragte er, obwohl ihm ein Auge fehlte, dennoch '+voice);
  add('Obwohl ihm ein Auge fehlte, fragte '+subject+', der dennoch sofort '+verb+', dass '+content+', '+voice);
  add('Obwohl ihm ein Auge fehlte, fragte '+subject+' dennoch sofort in der Erkenntnis, dass '+content+', '+voice);
  for(const participle of ['erkennend','bemerkend'])add('Sofort '+participle+', dass '+content+', fragte '+subject+', obwohl ihm ein Auge fehlte, dennoch '+voice);
 }
 if(kind==='think'){
  const tails=new Set(variants.map(variant=>variant.includes(':')?variant.slice(variant.indexOf(':')+1).trim():'').filter(Boolean));
  for(const tail of tails)for(const adverb of ['freilich','allerdings'])for(const plea of ['flehend','demütig bittend','als Bittsteller']){
   const answer='antwortete ich ihm '+adverb+' '+plea+': '+tail;
   add('Vieles bedenkend, '+answer);
   add('Über vieles nachdenkend, '+answer);
   for(const link of ['Als','Während']){
    add(link+' ich vieles bedachte, '+answer);
    add(link+' ich über vieles nachdachte, '+answer);
   }
   add('Ich, der vieles bedachte, '+answer.replace(/^antwortete ich /u,'antwortete '));
   add('Ich, der über vieles nachdachte, '+answer.replace(/^antwortete ich /u,'antwortete '));
   add('Beim Nachdenken über vieles '+answer);
   add('Unter vielen Überlegungen '+answer);
   add('Ich dachte '+adverb+' über vieles nach und antwortete ihm '+plea+': '+tail);
   add('Ich antwortete ihm '+adverb+' '+plea+', während ich über vieles nachdachte: '+tail);
   add('An '+shape+' denkend, '+answer);
   for(const link of ['Als','Während'])add(link+' ich an '+shape+' dachte, '+answer);
   add('Ich, der an '+shape+' dachte, '+answer.replace(/^antwortete ich /u,'antwortete '));
   add('Beim Denken an '+shape+' '+answer);
   add('Ich dachte '+adverb+' an '+shape+' und antwortete ihm '+plea+': '+tail);
   add('Ich dachte an '+shape+' und antwortete ihm '+adverb+' '+plea+': '+tail);
   add('Ich antwortete ihm '+adverb+' '+plea+', während ich an '+shape+' dachte: '+tail);
  }
 }
 if(kind==='leave'){
  for(const name of ['Polyphem','Polyphemus'])for(const object of ['„Niemand“','Niemand'])for(const farewell of ['Lebe wohl!','Leb wohl!','Lebwohl!']){
   const endings=[
    'der laut weinende '+name+' vergeblich '+object+' suchte',
    'der laut klagende '+name+' vergeblich '+object+' suchte',
    name+', der laut weinte, vergeblich '+object+' suchte',
    name+', der mit lautem Geschrei weinte, vergeblich '+object+' suchte',
    name+' laut weinte und vergeblich '+object+' suchte',
    name+', während er laut weinte, vergeblich '+object+' suchte',
    name+' unter lautem Weinen vergeblich '+object+' suchte',
    name+' unter lautem Klagen vergeblich '+object+' suchte',
    name+' laut weinend vergeblich '+object+' suchte',
    name+' mit lautem Geschrei weinend vergeblich '+object+' suchte'
   ];
   for(const content of endings){
    const ending='dass '+content+'. '+farewell;
    add('Während wir schnell die Höhle verließen, hörten wir, '+ending);
    add('Als wir schnell die Höhle verließen, hörten wir, '+ending);
    add('Wir verließen schnell die Höhle und hörten, '+ending);
    add('Wir, die wir schnell die Höhle verließen, hörten, '+ending);
    add('Beim schnellen Verlassen der Höhle hörten wir, '+ending);
    add('Die Höhle schnell verlassend, hörten wir, '+ending);
    add('Schnell die Höhle verlassend, hörten wir, '+ending);
   }
  }
 }
 const result=[...out];entries.set(key,result);return result;
}
