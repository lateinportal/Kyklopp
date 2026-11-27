// Only the Stamatia worksheet has this storage key and these three task types.
// Other uploaded HTML and the shared rating functions are left unchanged.
function stamatiaRebuildMeaningRating(state){
 if(!state?.round?.length)return;
 const fields=state.fields||(typeof drafts!=='undefined'?[...drafts.values()].find(saved=>saved.round===state.round)?.fields:null);
 if(!Array.isArray(fields))return;
 const values=new Map(fields.filter(field=>field[2]).map(([value,,id])=>[id,String(value||'')]));
 for(const question of state.round){
  if(![7,8,9].includes(question.type)||!question.entries?.length||question.stamatiaMeaningRating===2)continue;
  // Additional meanings in older rounds have no first-correct history. Keep
  // recorded history and use the saved attempt for newly reconstructed units.
  const attempt=Math.max(1,Number(state.tries||question.worksheetEvidence?.attempts)||1);
  const result=stamatiaGrade(question,id=>values.get(id)||'');
  worksheetCaptureRating(question,result.results,attempt);
 }
}
export function improveStamatiaMeaningRating(source){
 if(!/const exerciseStorageKey\s*=\s*['"]stamatia-vocabulary-session-v1['"]/.test(source)||!source.includes('const taskTypes=[7,8,9];')||source.includes('const stamatiaMeaningRatingVersion=2;'))return source;
 const patch=(before,after)=>{if(!source.includes(before))throw Error('Stamatia rating marker missing: '+before.slice(0,80));source=source.replace(before,after);};
 const begin=source.indexOf('function worksheetCaptureRating('),end=source.indexOf('function worksheetTaskRating(',begin);
 if(begin<0||end<0)throw Error('Stamatia rating functions missing');
 let capture=source.slice(begin,end);
 const count="const count=question.type===6&&/^v\\d+$/.test(field.id||'')?Math.min(2,question.entries[Number(field.id.slice(1))]?.senses?.length||1):1;";
 if(!capture.includes(count))throw Error('Stamatia count marker missing');
 capture=capture.replace(' const evidence=', ' question.stamatiaMeaningRating=2;\n const evidence=')
 .replace(count,"const isMeaning=[7,8,9].includes(question.type)&&/^meaning-\\d+$/.test(field.id||'');\n  const entry=isMeaning?question.entries[Number(field.id.split('-').pop())]:null;\n  const count=isMeaning?Math.max(1,Number(entry?.required)||1):1;")
 .replace("const parts=Array.isArray(field.meaningStates)&&field.meaningStates.length?field.meaningStates.slice(0,count):Array(count).fill(field.result==='correct');", "const matched=isMeaning?Math.min(count,Number(field.meaningMatched??field.meaningStates?.filter(Boolean).length??(field.result==='correct'?count:0))):0;\n  const parts=isMeaning?Array.from({length:count},(_,index)=>index<matched):Array(count).fill(field.result==='correct');");
 source=source.slice(0,begin)+'const stamatiaMeaningRatingVersion=2;\n'+stamatiaRebuildMeaningRating.toString()+'\n'+capture+source.slice(end);
 patch('function worksheetTaskRating(state){','function worksheetTaskRating(state){\n stamatiaRebuildMeaningRating(state);');
 patch("let correct=false,hint='',meaningStates;", "let correct=false,hint='',meaningStates,meaningMatched;");
 patch('meaningStates=result.meaningStates;', 'meaningStates=result.meaningStates;meaningMatched=result.matched;');
 patch("results.push({id:spec.id,result:correct?'correct'", "results.push({id:spec.id,...(spec.kind==='meaning'?{meaningMatched}:{}),result:correct?'correct'");
 return source;
}
