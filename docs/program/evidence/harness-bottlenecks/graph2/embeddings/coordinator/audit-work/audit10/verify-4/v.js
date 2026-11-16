'use strict';
const fs=require('fs'),path=require('path');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const out=[];const log=(...a)=>out.push(a.join(' '));
const hoX=new Set(fs.readFileSync(L+'/heldout_export.sha256','utf8').split('\n').map(l=>(l.match(/export\/graphs0?\/([0-9a-f]{40})\//)||[])[1]).filter(Boolean));
const plan=JSON.parse(fs.readFileSync(L+'/train/stageB/plan.json','utf8'));
const hoP=new Set();for(const[k,v]of Object.entries(plan.heldout.assignment)){hoP.add(k);if(typeof v==='string')hoP.add(v);}
log('heldout_export.sha256 parents',hoX.size,'plan.heldout set',hoP.size,'overlap',[...hoX].filter(x=>hoP.has(x)).length);
log('plan.heldout keys sample',JSON.stringify(Object.entries(plan.heldout.assignment).slice(0,2)), 'n keys',Object.keys(plan.heldout.assignment).length);
for(const d of ['graphs','graphs0']){const g=fs.readdirSync(L+'/export/'+d);log(d,g.length,'in hoX',g.filter(x=>hoX.has(x)).length,'in hoP',g.filter(x=>hoP.has(x)).length);}
// scan all json files for docker inspect Mounts
const hits=[];
function walk(p,depth){if(depth>6)return;let st;try{st=fs.statSync(p)}catch(e){return}
 if(st.isDirectory()){const b=path.basename(p);if(['export','tune_inputs','heldout_inputs','probe_inputs','checkpoints','node_modules','.git'].includes(b))return;for(const f of fs.readdirSync(p))walk(p+'/'+f,depth+1);return}
 if(!/\.json$/.test(p)||st.size>5e6)return;let J;try{J=JSON.parse(fs.readFileSync(p,'utf8'))}catch(e){return}
 const arr=Array.isArray(J)?J:[J];for(const c of arr){if(!c||!Array.isArray(c.Mounts))continue;
  const w=c.Mounts.filter(m=>m.Destination==='/w/export');
  hits.push([p.replace(L,'LANE'),c.Name||'',(c.Config&&c.Config.Image)||c.Image||'',w.map(m=>m.Source.replace(/^.*embeddings/,'LANE')+(m.RW?':rw':':ro')).join(','),'graphRows='+c.Mounts.filter(m=>/graphs0?\/[0-9a-f]{40}$/.test(m.Source)).length]);}}
walk(L,0);
for(const h of hits)log(h.join(' | '));
fs.writeFileSync('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10/verify-4/v.out.txt',out.join('\n'));
