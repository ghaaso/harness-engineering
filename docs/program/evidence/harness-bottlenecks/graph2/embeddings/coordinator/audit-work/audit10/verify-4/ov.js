const fs=require('fs');const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const p=JSON.parse(fs.readFileSync(L+'/train/stageB/plan.json','utf8'));
const HO=new Set(Object.values(p.heldout.assignment).concat(Object.keys(p.heldout.assignment)));
const TC=new Set(Object.values(p.assignment).filter(v=>typeof v==='string'));const TP=new Set(Object.keys(p.assignment));
const ck=new Set(p.checkpoints||[]);const hck=new Set(p.heldout.checkpoints||[]);
const o=['tune ckpts(values)',TC.size,'tune parents',TP.size,'∩HO',[...TC].filter(x=>HO.has(x)).length,[...TP].filter(x=>HO.has(x)).length,'plan.checkpoints',ck.size,'∩HO',[...ck].filter(x=>HO.has(x)).length,'heldout.checkpoints',hck.size,'∩HO',[...hck].filter(x=>HO.has(x)).length];
fs.writeFileSync(L.replace(/hb\/.*$/,'coord/audit10/verify-4/ov.out.txt'),o.join(' '));
