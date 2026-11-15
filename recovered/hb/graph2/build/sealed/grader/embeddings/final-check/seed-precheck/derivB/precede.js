const fs=require('fs');const G=process.argv[2];
const rd=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(JSON.parse):[];
const truth=new Map(rd(G+'/sealed/grader/embeddings/truth/truth.jsonl').map(r=>[r.id,r]));
const out={};const C={};
for(const t of rd(G+'/tasks/tasks.jsonl').filter(t=>t.set==='T1')){
 const g=t.split==='heldout'?'heldout':(truth.get(t.id).late50?'late50':'tune_early');
 const d=G+'/facts/cache/'+t.parent;
 if(!C[t.parent]){const m=rd(d+'/nodes.jsonl'),e=rd(d+'/experimental/response_fields.nodes.jsonl');C[t.parent]={m,e}}
 const {m,e}=C[t.parent];const p=t.seed.path,fid='file:'+p;
 const o=out[g]=out[g]||{preceding_kinds_main:{},exp_nodes_on_seed_path:0,exp_before_file:0,dup_file_ids:0,file_nodes_same_path_other_id:0};
 const ks=new Set(m.filter(n=>n.path===p&&n.id<fid).map(n=>n.kind));for(const k of ks)o.preceding_kinds_main[k]=(o.preceding_kinds_main[k]||0)+1;
 const ep=e.filter(n=>n.path===p);if(ep.length)o.exp_nodes_on_seed_path++;if(ep.some(n=>n.id<fid))o.exp_before_file++;
 if(m.filter(n=>n.id===fid).length>1)o.dup_file_ids++;
 if(m.some(n=>(n.kind==='file'||n.kind==='doc')&&n.path===p&&n.id!==fid))o.file_nodes_same_path_other_id++;
}
console.log(JSON.stringify(out,null,1));
