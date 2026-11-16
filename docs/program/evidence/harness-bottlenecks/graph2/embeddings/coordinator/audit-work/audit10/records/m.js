const fs=require('fs');const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const plan=JSON.parse(fs.readFileSync(L+'/train/stageB/plan.json','utf8'));const man=JSON.parse(fs.readFileSync(L+'/tune_inputs/MANIFEST.json','utf8'));
const P=Array.isArray(man.parents)?man.parents:Object.keys(man.parents);console.log('tune manifest parents',P.length, man.parents_from);
const J=JSON.parse(fs.readFileSync(L+'/r58c/mounts/ktest-r4.json','utf8'))[0];const g=J.Mounts.filter(m=>/graphs\/[0-9a-f]{40}$/.test(m.Source)).map(m=>m.Source.slice(-40));
console.log('r4 graphs == manifest parents', g.length===P.length&&g.every(x=>P.includes(x)));
for(const n of ['ktest-r10','ktest-r6','ktest-r7','ktest-r5','ktest-r11','kge-R1','kge-H1P','kge-H1R','ktest-r2','ktest-r3','ktest-r1','ktest-eor']){const r=JSON.parse(fs.readFileSync(L+'/r58c/mounts/'+n+'.json','utf8'))[0];console.log('==',n);for(const m of r.Mounts)console.log('  ',m.Source.replace(L,'LANE').replace(/^C:.*scratchpad\/hb\/graph2/,'G2').replace('C:/Users/User/Documents/projects/EMS_workshop1','REPO'),'>',m.Destination,m.RW?'rw':'ro');}
