const fs=require('fs');const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/';
const o=JSON.parse(fs.readFileSync(L+'train/heldout/item27.json','utf8'));
for(const k of ['frozen_at','rule','s','tie_group_4dp','device','test','pins','stamp_tune']) console.log(k, JSON.stringify(o[k]).slice(0,600));
