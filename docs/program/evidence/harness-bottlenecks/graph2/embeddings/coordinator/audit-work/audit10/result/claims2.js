const fs=require('fs');const {L,D,j}=require('./p.js');
const CL=fs.readFileSync(D+'/CLAIMS.md','utf8').split('\n');const cache={};
const rp=f=>f.startsWith('<repo>')?'C:/Users/User/Documents/projects/EMS_workshop1'+f.slice(6):L+'/'+f;
const ptr1=(o,k)=>{let v=o; for(const t of k.split('/').slice(1).map(s=>s.replace(/~1/g,'/').replace(/~0/g,'~'))){ if(v==null||typeof v!=='object'||!(t in v)) return undefined; v=v[t];} return v;};
let tot=0,un=[],empty=[];
for(let i=0;i<CL.length;i++){const l=CL[i]; if(!/^\| \d+ \| \d+ \|/.test(l)) continue; const p=l.split(/(?<!\\)\|/).slice(1,-1).map(s=>s.trim());
 const f=p[3],k=p[5]; if(!/\.json$/.test(f)||!k.startsWith('/')) continue; const o=cache[f]=cache[f]||j(rp(f));
 for(const kk of k.split('; ')){tot++; const v=ptr1(o,kk); if(v===undefined) un.push(`CLAIMS.md:${i+1} row ${p[0]} RESULT L${p[1]} ${kk} value=${p[6]}`); else if(v&&typeof v==='object'&&Object.keys(v).length===0) empty.push(`CLAIMS.md:${i+1} row ${p[0]} L${p[1]} ${kk} value=${p[6]}`);}}
console.log('pointers',tot,'unresolved',un.length,'empty-object',empty.length);console.log(un.join('\n'));console.log('--');console.log(empty.slice(0,40).join('\n'));
