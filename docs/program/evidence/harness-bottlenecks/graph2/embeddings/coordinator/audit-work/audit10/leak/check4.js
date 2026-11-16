const fs=require('fs'),cp=require('child_process');
const L=process.argv[2], R=process.argv[3], OUT=process.argv[4];
const git=(...a)=>cp.execFileSync('git',['-C',R,...a],{encoding:'utf8',maxBuffer:1<<28});
const plan=JSON.parse(fs.readFileSync(L+'/train/stageB/plan.json','utf8'));
const tune=fs.readFileSync(L+'/eval/tune_tasks.jsonl','utf8').trim().split('\n').map(JSON.parse);
const byC={};
for(const C of plan.checkpoints){
  const tri=fs.readFileSync(L+'/export/graphs0/'+C+'/triples.tsv','utf8').split('\n').slice(1).map(l=>l.split('\t')).filter(x=>x[1]==='co_changed');
  const set=new Set(tri.map(x=>x[0]+'|'+x[2]));
  const pairs=[];
  for(const t of tune.filter(t=>plan.assignment[t.parent]===C)){
    for(const tr of t.truth){ if(set.has('file:'+t.seed+'|file:'+tr)) pairs.push({task:t.task_id,commit:t.commit,seed:t.seed,truth:tr}); }
  }
  // dedupe by unordered pair
  const seen=new Set();const u=pairs.filter(p=>{const k=[p.seed,p.truth].sort().join('|');if(seen.has(k))return false;seen.add(k);return true});
  byC[C]=u;
}
const ranked=Object.entries(byC).sort((a,b)=>b[1].length-a[1].length);
const counts=ranked.map(([C,u])=>u.length);
// pick 5: spread over ranks with >=4 pairs, take 4 pairs each => 20
const cand=ranked.filter(([C,u])=>u.length>=4);
const pick=[0,Math.floor(cand.length/4),Math.floor(cand.length/2),Math.floor(3*cand.length/4),cand.length-1].map(i=>cand[i]);
const res=[];
for(const [C,u] of pick){
  const log=git('log','--no-renames','--format=@@%H','--name-only',C);
  const commits=[];let cur=null;
  for(const line of log.split('\n')){if(line.startsWith('@@')){cur={h:line.slice(2),f:new Set()};commits.push(cur)}else if(line.trim()&&cur)cur.f.add(line.trim())}
  const rev=new Set(git('rev-list',C).trim().split('\n'));
  const step=Math.max(1,Math.floor(u.length/4));
  for(let i=0;i<4;i++){const p=u[Math.min(u.length-1,i*step)];
    const both=commits.filter(c=>c.f.has(p.seed)&&c.f.has(p.truth)).map(c=>c.h);
    const inRev=both.filter(h=>rev.has(h));
    const taskFiles=git('show','--no-renames','--format=','--name-only',p.commit).trim().split('\n');
    res.push({C,task:p.task,task_commit:p.commit,seed:p.seed,truth:p.truth,n_commits_both_upto_C:both.length,all_in_revlist_C:inRev.length===both.length,example:both.slice(0,2),task_commit_in_list:both.includes(p.commit),task_commit_touches_both:taskFiles.includes(p.seed)&&taskFiles.includes(p.truth)});
  }
}
fs.writeFileSync(OUT,JSON.stringify({pairs_per_checkpoint_sorted:counts,picked:pick.map(x=>x[0]),res},null,1));
console.log('pairs per ck (sorted):',counts.join(','));
for(const r of res)console.log(r.C.slice(0,8),r.task,r.seed,'<->',r.truth,'n_both<=C',r.n_commits_both_upto_C,'inRev',r.all_in_revlist_C,'taskInList',r.task_commit_in_list,'taskTouchesBoth',r.task_commit_touches_both,r.example.map(h=>h.slice(0,8)).join(' '));
console.log('zero-support pairs:',res.filter(r=>r.n_commits_both_upto_C===0).length);
