const fs=require('fs');const LANE='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const rows=fs.readFileSync(LANE+'/export/sizes.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const out={};
for(const sp of ['tune','heldout']){
 const r=rows.filter(x=>x.splits.includes(sp));
 for(const by of ['entities','triples']){
  const m=r.reduce((a,b)=>b[by]>a[by]?b:a);
  const g0=JSON.parse(fs.readFileSync(LANE+'/export/graphs0/'+m.sha+'/sizes.json','utf8'));
  // count from the files themselves
  const ent=fs.readFileSync(LANE+'/export/graphs0/'+m.sha+'/entities.tsv','utf8').split('\n').filter(Boolean).length-1;
  const tl=fs.readFileSync(LANE+'/export/graphs0/'+m.sha+'/triples.tsv','utf8').split('\n').filter(Boolean).slice(1);
  const used=new Set();let co=0;for(const l of tl){const[h,rel,t]=l.split('\t');used.add(h);used.add(t);if(rel==='co_changed')co++;}
  const undirected=tl.length-co/2; // co_changed stored both directions
  out[sp+'_max_'+by]={sha:m.sha,n_parents:r.length,sizes_jsonl:{entities:m.entities,triples:m.triples,co:m.co_changed_triples,edges_all_conf:m.edges_all_conf,minConf:m.minConf},graphs0_sizes:{entities:g0.entities,triples:g0.triples,co:g0.co_changed_triples,edges_all_conf:g0.edges_all_conf},files:{entities:ent,triples:tl.length,entities_in_triples:used.size,co_triples:co,undirected_facts:undirected,'2E/V_edges_all_conf':+(2*g0.edges_all_conf/g0.entities).toFixed(2),'T/V':+(tl.length/ent).toFixed(2),'2T/V':+(2*tl.length/ent).toFixed(2)}};
 }
}
fs.writeFileSync(__dirname+'/sizes-result.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out,null,1));
