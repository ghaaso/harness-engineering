const fs=require('fs'),zlib=require('zlib'),path=require('path');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/';
const T=fs.readFileSync(L+'eval/tune_tasks.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const out=[];
out.push('tune tasks '+T.length+' late50 '+T.filter(t=>t.late50).length+' max date_order '+Math.max(...T.map(t=>t.date_order)));
for(const p of ['cd806c80','7766ca7a','2fa68134']){const ts=T.filter(t=>t.parent.startsWith(p));out.push(p+' '+ts.map(t=>t.task_id+' do'+t.date_order+' late50='+t.late50+' pilot='+t.late50_pilot).join(' | '));}
// late50 min date_order
const l=T.filter(t=>t.late50).map(t=>t.date_order);out.push('late50 date_order range '+Math.min(...l)+'..'+Math.max(...l));
// scoretest cfg vs top3
const top=JSON.parse(fs.readFileSync(L+'train/stageA/top3.json'));
const sc={E1:{embedding_dim:256,margin:6,lr:0.002,adversarial_temperature:0.5},E2:{embedding_dim:128,n3_weight:0.05,lr:0.1},E3:{embedding_dim:256,margin:6,lr:0.002,scoring_fct_norm:1},E4:{num_layers:1,embedding_dim:100,composition:'mult',lr:0.001},E5:{embedding_dim:256,margin:6,lr:0.002,adversarial_temperature:0.5}};
const eq=(a,b)=>{const k=new Set([...Object.keys(a),...Object.keys(b)]);for(const x of k)if(a[x]!==b[x])return false;return true;};
for(const a of Object.keys(sc)){const t=top[a].top3;out.push(a+' top3 '+t.map(x=>x.config_id).join(',')+' scoretest cfg in top3: '+t.some(x=>eq(x.cfg,sc[a]))+' ; top3 cfgs '+t.map(x=>JSON.stringify(x.cfg)).join(' '));}
// test2 table header and task ids
for(const f of ['E2_c01_s1_pool.tsv.gz','E2_c01_s1_unrestricted.tsv.gz']){const s=zlib.gunzipSync(fs.readFileSync(L+'train/stageB/_pre_m/test2/tables/'+f)).toString();const ls=s.split('\n').filter(Boolean);out.push(f+' header: '+ls[0]+' rows '+(ls.length-1)+' tasks '+[...new Set(ls.slice(1).map(x=>x.split('\t')[0]))].join(','));out.push(' sample '+ls[1]);}
// test parts contents
function walk(d){let r=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())r=r.concat(walk(p));else r.push(p.replace(L,'')+' '+fs.statSync(p).size+' '+fs.statSync(p).mtime.toISOString());}return r;}
out.push(...walk(L+'train/stageB/_pre_m'));
fs.writeFileSync('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10b/verify-6/check-out.txt',out.join('\n')+'\n');
console.log(out.join('\n'));
