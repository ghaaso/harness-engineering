const fs=require('fs'),cp=require('child_process');
const L=process.argv[2], R=process.argv[3], OUT=process.argv[4];
const git=(...a)=>cp.execFileSync('git',['-C',R,...a],{encoding:'utf8',maxBuffer:1<<28});
const plan=JSON.parse(fs.readFileSync(L+'/train/stageB/plan.json','utf8'));
const pickT=[0,13,26,39,52].map(i=>plan.checkpoints[i]);const ho=plan.heldout.checkpoints;const pickH=[0,17,34,51,69].map(i=>ho[i]);
const res=[];
for(const [split,C] of [...pickT.map(c=>['tune',c]),...pickH.map(c=>['heldout',c])]){
  const tri=fs.readFileSync(L+'/export/graphs0/'+C+'/triples.tsv','utf8').split('\n').slice(1).map(l=>l.split('\t')).filter(x=>x[1]==='co_changed');
  const pairs=new Map();for(const [h,,t] of tri){const a=h.replace(/^file:/,''),b=t.replace(/^file:/,'');const k=a<b?a+'\u0000'+b:b+'\u0000'+a;pairs.set(k,[a,b]);}
  const log=git('log','--no-merges','--format=@@%H','--name-only',C);
  const fileCommits=new Map();let cur=null;
  for(const line of log.split('\n')){if(line.startsWith('@@')){cur=line.slice(2)}else if(line.trim()&&cur){const f=line.trim();if(!fileCommits.has(f))fileCommits.set(f,new Set());fileCommits.get(f).add(cur)}}
  const logR=git('log','--no-merges','-M','--format=@@%H','--name-status',C);// with renames for the unsupported ones
  const renamed=new Set();for(const line of logR.split('\n')){if(/^R\d*\t/.test(line)){const p=line.split('\t');renamed.add(p[1]);renamed.add(p[2]);}}
  let sup=0,unsup=[];
  for(const [k,[a,b]] of pairs){const A=fileCommits.get(a),B=fileCommits.get(b);let ok=false;if(A&&B)for(const h of A)if(B.has(h)){ok=true;break}
    if(ok)sup++;else unsup.push([a,b,renamed.has(a)||renamed.has(b)]);}
  res.push({split,C,co_triples:tri.length,pairs:pairs.size,supported:sup,unsupported:unsup.length,unsupported_touching_renamed:unsup.filter(x=>x[2]).length,examples:unsup.slice(0,5)});
}
fs.writeFileSync(OUT,JSON.stringify(res,null,1));
for(const r of res)console.log(r.split,r.C.slice(0,8),'triples',r.co_triples,'pairs',r.pairs,'supported',r.supported,'unsupported',r.unsupported,'(rename-touching',r.unsupported_touching_renamed+')',JSON.stringify(r.examples.slice(0,2)));
