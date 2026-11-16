const fs=require('fs'),cp=require('child_process');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const R='C:/Users/User/Documents/projects/EMS_workshop1';
const rows=fs.readFileSync(L+'/eval/tune_tasks.jsonl','utf8').trim().split('\n').map(JSON.parse);
const by={};for(const r of rows){(by[r.commit]=by[r.commit]||[]).push(r);}
let out=[],bad=0,parentBad=0,late=0;
for(const c in by){const rs=by[c];
 const ns=cp.execSync(`git -C "${R}" diff-tree --no-commit-id -r --name-status -M0 ${rs[0].parent} ${c}`).toString().trim().split('\n').map(l=>l.split('\t'));
 const M=new Set(ns.filter(x=>x[0]==='M').map(x=>x[1]));
 const seeds=new Set(rs[0].commit_seeds);
 const parents=cp.execSync(`git -C "${R}" rev-list --parents -n1 ${c}`).toString().trim().split(' ').slice(1);
 if(!parents.includes(rs[0].parent))parentBad++;
 const extraSeeds=[...seeds].filter(s=>!M.has(s)); const missing=[...M].filter(s=>!seeds.has(s));
 for(const r of rs){const exp=[...seeds].filter(s=>s!==r.seed).sort().join('|');if(exp!==[...r.truth].sort().join('|'))bad++;}
 if(rs.some(r=>r.late50))late++;
 if(extraSeeds.length)out.push(c.slice(0,8)+' seeds not M: '+extraSeeds.join(','));
 out.push(c.slice(0,8)+' M not seeds: '+missing.length+' ['+missing.slice(0,6).join(',')+']');
}
fs.writeFileSync('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10/critic/truth.out',`commits ${Object.keys(by).length} tasks ${rows.length} late50commits ${late} truthVsSeedsBad ${bad} parentNotGitParent ${parentBad}\n`+out.join('\n'));
