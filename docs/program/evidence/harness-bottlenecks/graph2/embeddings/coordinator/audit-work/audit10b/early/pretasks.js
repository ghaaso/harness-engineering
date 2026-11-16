const fs=require('fs');const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/';
const T=fs.readFileSync(L+'eval/tune_tasks.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
for(const p of ['cd806c803c4ad8ec198790096d196460789951f0','7766ca7a0ca529b75fa8f2e82be82a1b4df49a74','2fa68134d22db238b53b12e5f24315af29dce4a0']){
 const ts=T.filter(t=>t.parent===p);console.log(p.slice(0,8),ts.map(t=>t.task_id+':'+t.date_order+':late50='+t.late50+':pilot='+t.late50_pilot).join(' '));}
// pilot vs late50 set
const C=fs.readFileSync(L+'eval/tune_commits.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const a=C.filter(c=>c.late50).map(c=>c.commit),b=C.filter(c=>c.late50_pilot).map(c=>c.commit);
console.log('late50',a.length,'pilot',b.length,'shared',a.filter(x=>b.includes(x)).length);
console.log('late50 only',C.filter(c=>c.late50&&!c.late50_pilot).map(c=>c.commit.slice(0,8)+' do'+c.date_order+' po'+c.pilot_order).join(', '));
console.log('pilot only',C.filter(c=>!c.late50&&c.late50_pilot).map(c=>c.commit.slice(0,8)+' do'+c.date_order+' po'+c.pilot_order).join(', '));
console.log('late50 tasks',T.filter(t=>t.late50).length,'pilot tasks',T.filter(t=>t.late50_pilot).length);
