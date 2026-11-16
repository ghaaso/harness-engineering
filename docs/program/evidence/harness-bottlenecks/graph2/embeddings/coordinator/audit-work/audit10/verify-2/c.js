const fs=require('fs');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const D='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings';
const t=JSON.parse(fs.readFileSync(L+'/train/report/tune.json','utf8'));
const c=t.contrasts; console.log(typeof c, Array.isArray(c)?c.length:Object.keys(c).slice(0,20));
const s=JSON.stringify(c); 
function word(d,lo,hi){ if(lo>0&&d>=0.02) return 'adds'; if(lo>=-0.02&&hi<=0.02) return 'matches'; if(hi<0) return 'cannot tell (lower)'; return 'cannot tell';}
function walk(o,p){ if(o&&typeof o==='object'){ if('lo' in o&&'hi' in o&&'diff' in o){ if(/alone/.test(p)&&/unres/.test(p)&&/P@10/.test(p)) console.log(p, o.diff.toFixed(4), o.lo.toFixed(4), o.hi.toFixed(4), word(o.diff,o.lo,o.hi)); return;} for(const k in o) walk(o[k],p+'/'+k);} }
walk(c,'tune.contrasts');
const r=JSON.parse(fs.readFileSync(D+'/result.json','utf8'));
walk(r.tune_full,'result.tune_full');
