const fs=require('fs');
const raw=fs.readFileSync('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/tasks/wq9y8l9o4.output','utf8');
let r; try{r=JSON.parse(raw);}catch(e){ const i=raw.indexOf('{"edges"'); r=JSON.parse(raw.slice(i,raw.lastIndexOf('}')+1)); }
if(r.result)r=r.result; const L=[]; const p=s=>L.push(s);
p('=== EDGES'); const e=r.edges; for(const k of Object.keys(e)){ const v=e[k]; if(k==='connection_kinds_the_graph_cannot_see'){ p(k+':'); for(const c of v)p('  - '+c.kind+' | e.g. '+c.example+' | count: '+(c.rough_count||'')+' | scriptable: '+c.scriptable); } else p(k+': '+(Array.isArray(v)?'\n  - '+v.join('\n  - '):v)); }
p('\n=== CLAIMS'); const c=r.claims; for(const x of c.claims){ p('['+x.id+'] '+x.verdict); p('  did: '+x.what_you_did); if(x.correction)p('  correction: '+x.correction); }
p('FOR: '+c.strongest_case_for_the_owners_idea); p('AGAINST: '+c.strongest_case_against); p('MISSING:\n  - '+c.missing_from_the_claims.join('\n  - ')); p('ONE LINE: '+c.one_line_answer_you_would_give);
p('\n=== CLASSIFIERS');
const tab=(items,f)=>{const t={};for(const i of items)t[f(i)]=(t[f(i)]||0)+1;return JSON.stringify(t);};
for(const [n,k] of [['A',r.clsA],['B',r.clsB]]){ p(n+' items '+k.items.length+' | cls '+tab(k.items,i=>i.cls)+' | graph_answer '+tab(k.items,i=>i.graph_answer)+' | step_saved '+tab(k.items,i=>i.step_saved));
  p(n+' full by cls '+tab(k.items.filter(i=>i.graph_answer==='full'),i=>i.cls)+' | partial by cls '+tab(k.items.filter(i=>i.graph_answer==='partial'),i=>i.cls)+' | step likely by cls '+tab(k.items.filter(i=>i.step_saved==='likely'),i=>i.cls));
  p(n+' observations:\n  - '+k.observations.join('\n  - ')); p(n+' how: '+k.how_sessions_already_search); p(n+' change: '+k.what_an_index_would_change); }
const A={},B={}; for(const i of r.clsA.items)A[i.id]=i; for(const i of r.clsB.items)B[i.id]=i; let same=0,sg=0,ss=0,n=0,bothFull=0,eitherFull=0,bothLikely=0,eitherLikely=0,bothConn=0,eitherConn=0; const pairs={};
for(const id in A){ if(!B[id])continue; n++; if(A[id].cls===B[id].cls)same++; if(A[id].graph_answer===B[id].graph_answer)sg++; if(A[id].step_saved===B[id].step_saved)ss++;
  const k=A[id].cls+' / '+B[id].cls; if(A[id].cls!==B[id].cls)pairs[k]=(pairs[k]||0)+1;
  const af=A[id].graph_answer==='full',bf=B[id].graph_answer==='full'; if(af&&bf)bothFull++; if(af||bf)eitherFull++;
  const al=A[id].step_saved==='likely',bl=B[id].step_saved==='likely'; if(al&&bl)bothLikely++; if(al||bl)eitherLikely++;
  const ac=A[id].cls==='CONNECTION',bc=B[id].cls==='CONNECTION'; if(ac&&bc)bothConn++; if(ac||bc)eitherConn++; }
p('AGREEMENT n '+n+' | same cls '+same+' | same graph_answer '+sg+' | same step_saved '+ss);
p('CONNECTION both '+bothConn+' either '+eitherConn+' | graph full both '+bothFull+' either '+eitherFull+' | step likely both '+bothLikely+' either '+eitherLikely);
p('disagreements (A / B): '+JSON.stringify(pairs));
fs.writeFileSync('verify/check.txt',L.join('\n')); console.log('lines',L.length,'chars',L.join('\n').length);
