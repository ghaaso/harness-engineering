const fs=require('fs'),path=require('path');
const G=process.argv[2], OUT=process.argv[3];
const rd=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(JSON.parse):null;
const tasks=rd(G+'/tasks/tasks.jsonl').filter(t=>t.set==='T1');
const truth=new Map(rd(G+'/sealed/grader/embeddings/truth/truth.jsonl').map(r=>[r.id,r]));
const uni=new Map(rd(G+'/sealed/grader/embeddings/truth/universe.jsonl').map(r=>[r.parent,new Set(r.code_files)]));
const late=new Set([...truth.values()].filter(r=>r.late50).map(r=>r.id));
const cache={};
function load(sha){ if(cache[sha]) return cache[sha]; const d=G+'/facts/cache/'+sha;
  const files=fs.existsSync(d)?fs.readdirSync(d).sort():null;
  const exp=fs.existsSync(d+'/experimental')?fs.readdirSync(d+'/experimental').sort():null;
  const raw=rd(d+'/nodes.jsonl'); const expn=rd(d+'/experimental/response_fields.nodes.jsonl')||[];
  const r={files,exp,raw,expn,sorted:raw?[...new Set(raw.map(n=>n.id))].sort():null,byId:raw?new Map(raw.map(n=>[n.id,n])):null,kinds:raw?new Set(raw.map(n=>n.kind)):null,expkinds:new Set(expn.map(n=>n.kind))};
  return cache[sha]=r;}
const res={};
function bump(o,k){o[k]=(o[k]||0)+1}
const parentsBy={tune:new Set(),late50:new Set(),heldout:new Set()};
const mism=[];
for(const t of tasks){
  const tr=truth.get(t.id); if(!tr||tr.parent!==t.parent||tr.seed!==t.seed.path) mism.push(t.id);
  const grp=t.split==='heldout'?'heldout':(late.has(t.id)?'late50':'tune_early');
  if(grp==='tune_early') parentsBy.tune.add(t.parent); else parentsBy[grp].add(t.parent);
  const R=res[grp]=res[grp]||{n:0,file_node:0,doc_node:0,no_node:0,no_facts:0,file_first_sorted_all_path_nodes:0,file_first_raw_all_path_nodes:0,file_before_sym_sorted:0,file_before_sym_raw:0,sym_tasks:0,sym_found:0,sym_found_ambiguous:0,shapes_sorted:{},shapes_raw:{},nofile:[],sym_kind_vs_task_kind:{}};
  R.n++; const F=load(t.parent); if(!F.raw){R.no_facts++;continue}
  const p=t.seed.path, fid='file:'+p; const fn=F.byId.get(fid);
  if(fn&&fn.kind==='file') R.file_node++; else if(fn&&fn.kind==='doc') R.doc_node++;
  const docAlt=F.raw.find(n=>(n.kind==='file'||n.kind==='doc')&&n.path===p);
  if(!fn){ R.no_node++; R.nofile.push({symkind:t.seed.symbol?t.seed.symbol.kind:null, in_universe:uni.has(t.parent)?uni.get(t.parent).has(p):'no_universe_row', other_file_doc_node_for_path:!!docAlt, any_node_with_path:F.raw.some(n=>n.path===p)}); }
  const pathNodesSorted=F.sorted.filter(id=>{const n=F.byId.get(id);return n.path===p});
  const pathNodesRaw=F.raw.filter(n=>n.path===p).map(n=>n.id);
  if(fn&&pathNodesSorted[0]===fid) R.file_first_sorted_all_path_nodes++;
  if(fn&&pathNodesRaw[0]===fid) R.file_first_raw_all_path_nodes++;
  let sid=null;
  if(t.seed.symbol){ R.sym_tasks++; const s=t.seed.symbol;
    const c=F.raw.filter(n=>n.path===p&&n.id.startsWith('sym:')&&(n.name===s.name||n.id.endsWith('.'+s.name)||n.id.endsWith('#'+s.name)));
    let pick=c.filter(n=>n.line_start===s.start); if(!pick.length) pick=c;
    if(pick.length){R.sym_found++; if(pick.length>1)R.sym_found_ambiguous++; sid=pick[0].id; bump(R.sym_kind_vs_task_kind,s.kind+'->'+pick[0].kind);} else bump(R.sym_kind_vs_task_kind,s.kind+'->NONE');
  }
  const seedIds=[fn?fid:null,sid].filter(Boolean);
  const shS=F.sorted.filter(id=>seedIds.includes(id)).map(id=>F.byId.get(id).kind).join(',')||'(none)';
  const rawIdx=id=>F.raw.findIndex(n=>n.id===id);
  const shR=seedIds.slice().sort((a,b)=>rawIdx(a)-rawIdx(b)).map(id=>F.byId.get(id).kind).join(',')||'(none)';
  bump(R.shapes_sorted,shS); bump(R.shapes_raw,shR);
  if(fn&&sid){ if(fid<sid)R.file_before_sym_sorted++; if(rawIdx(fid)<rawIdx(sid))R.file_before_sym_raw++; }
}
// parent-level differences
const summ=s=>{const files={},exps={},kinds={},expk={};let n=0,missing=0;for(const sha of s){n++;const F=load(sha);if(!F.files){missing++;continue}for(const f of F.files)bump(files,f);for(const f of F.exp||['(no experimental dir)'])bump(exps,f);for(const k of F.kinds||[])bump(kinds,k);for(const k of F.expkinds)bump(expk,k)}return{parents:n,missing_dir:missing,files,exps,kinds,expk}};
const P={tune_all:summ(new Set([...parentsBy.tune,...parentsBy.late50])),late50:summ(parentsBy.late50),heldout:summ(parentsBy.heldout)};
fs.writeFileSync(OUT,JSON.stringify({mism:mism.length,res,P},null,1));
for(const g in res){const R={...res[g]};R.nofile_count=R.nofile.length;const nf={};for(const x of R.nofile)bump(nf,JSON.stringify(x));R.nofile=nf;console.log(g,JSON.stringify(R));}
console.log('mismatch',mism.length);
for(const g in P)console.log(g,JSON.stringify(P[g]));
