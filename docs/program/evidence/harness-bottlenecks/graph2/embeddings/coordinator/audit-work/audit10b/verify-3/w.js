const fs=require('fs');const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const j=JSON.parse(fs.readFileSync(L+'/train/report/tune.json','utf8'));
const word=c=>c.lo>0&&c.diff>=0.02?'adds':(c.lo>=-0.02&&c.hi<=0.02?'matches':(c.hi<0&&c.diff<=-0.02?'worse':'cannot tell'));
const out=[];
for(const set of ['late50','late50_pilot_shared'])for(const sc of ['pool','unrestricted'])for(const a of ['E1','E2','E3','E4','E5','PLACEBO'])for(const k of ['fused','alone']){
 const c=(((j.contrasts[set]||{})[sc]||{})[a+'_'+k]||{}).vs_RRF; if(!c||!c['P@10'])continue; const x=c['P@10']; out.push([set,sc,a+'_'+k,x.diff.toFixed(4),x.lo.toFixed(4),x.hi.toFixed(4),word(x)].join(' '));}
fs.writeFileSync('w-result.txt',out.join('\n'));console.log(out.join('\n'));
