const j=require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/train/report/item22.json');
console.log(Object.keys(j));
const s=JSON.stringify(j.predict_target||j.checks||j, null, 0);
const k=Object.keys(j).filter(x=>/predict|recip|direction/i.test(x)); console.log(k);
for(const x of k) console.log(x, JSON.stringify(j[x]).slice(0,1500));
