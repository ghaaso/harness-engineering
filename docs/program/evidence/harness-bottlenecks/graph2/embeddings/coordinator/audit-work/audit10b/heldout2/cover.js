const fs=require('fs'),z=require('zlib');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const truth=fs.readFileSync('heldout_truth2.jsonl','utf8').trim().split('\n').map(JSON.parse);
const un={};for(const l of z.gunzipSync(fs.readFileSync(L+'/train/heldout/ranked/RRF_unrestricted.jsonl.gz')).toString().trim().split('\n')){const r=JSON.parse(l);un[r.id]=new Set(r.ranked);}
let pairs=0,miss=0,seedIn=0;const mp={};
for(const t of truth){for(const f of t.truth){pairs++;if(!un[t.task_id].has(f)){miss++;mp[t.parent.slice(0,8)]=(mp[t.parent.slice(0,8)]||0)+1;}} if(un[t.task_id].has(t.seed))seedIn++;}
// entities.tsv presence of seed file at parent graph
let seedNode=0;const ents={};
for(const t of truth){if(!ents[t.parent]){ents[t.parent]=fs.readFileSync(`${L}/export/graphs/${t.parent}/entities.tsv`,'utf8');} if(ents[t.parent].includes('F:'+t.seed))seedNode++;}
const s=`truth pairs ${pairs}; truth files absent from the unrestricted candidate list ${miss} ${JSON.stringify(mp)}; seed inside its own unrestricted list ${seedIn}; seeds with a F: node string in the parent's entities.tsv ${seedNode}/${truth.length}`;
fs.writeFileSync('cover.out',s);console.log(s);
