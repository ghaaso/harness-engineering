const fs=require('fs');const {L,D}=require('./p.js');
const R=fs.readFileSync(D+'/RESULT.md','utf8').split('\n');
const P=fs.readFileSync('C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/protocol-addendum-8.md','utf8');
const norm=s=>s.replace(/\s+/g,' ').replace(/`/g,'').trim();
const PN=norm(P);
// also rulings files
const rdir=L+'/orchestrator/';const RF=fs.readdirSync(rdir).filter(f=>/^coordinator-rulings-.*\.md$/.test(f)).map(f=>norm(fs.readFileSync(rdir+f,'utf8'))).join(' ');
let tot=0, miss=[];
for(let l=131;l<=145;l++){
  let body=R[l-1].replace(/^- (Item \d+|Ruling \d+( \([a-z]\))?)\. /,'');
  const sents=body.split(/(?<=[.;:])\s+(?=[A-Z(])/);
  for(const s0 of sents){const s=norm(s0).replace(/[.;:]$/,''); if(s.length<12) continue; tot++;
    const inP=PN.includes(s), inR=RF.includes(s);
    if(!inP) miss.push({line:l,inRulingsFiles:inR,s:s.slice(0,220)});}
}
console.log('sentences',tot,'not verbatim in PROTOCOL',miss.length);for(const m of miss)console.log(JSON.stringify(m));
