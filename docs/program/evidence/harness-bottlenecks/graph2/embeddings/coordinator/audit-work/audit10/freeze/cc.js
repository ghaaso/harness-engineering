const H=require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/train/report/answer_level/handoff/HANDOFF.json');
console.log(JSON.stringify(H.cross_check,null,1), H.test, H.split);
const T=require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/train/report/tune.json');
console.log(Object.keys(T.arms), Object.keys(T.sets||{}));
