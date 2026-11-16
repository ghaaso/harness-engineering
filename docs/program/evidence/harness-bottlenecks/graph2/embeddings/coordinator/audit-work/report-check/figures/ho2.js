const fs=require('fs');const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/';
const ho=JSON.parse(fs.readFileSync(L+'grader-returns/heldout.json','utf8'));
console.log(JSON.stringify(ho.vs_RRF,null,0));
let c=0;for(const k in ho.rank)for(const s in ho.rank[k])for(const m in ho.rank[k][s])c++;console.log('rank figures',c, Object.keys(ho.rank).length);
console.log(ho.scorer, ho.split, ho.tasks, ho.test, ho.arm);
console.log('unr RRF', ho.rank.RRF.unrestricted);
