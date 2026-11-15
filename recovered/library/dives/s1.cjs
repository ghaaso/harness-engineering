const fs=require('fs');
const base='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/token-spend/';
for (const g of ['fixflow','clinic']) {
  const S=JSON.parse(fs.readFileSync(base+g+'.sessions.json','utf8'));
  let n=0,withCS=0,api=0,tool=0,wall=0,calls=0;
  const keys=new Set();
  for (const s of S){ n++; calls+=s.calls; Object.keys(s).forEach(k=>keys.add(k));
    if(s.costState){withCS++; api+=s.costState.apiMs||0; tool+=s.costState.toolMs||0; wall+=(new Date(s.lastTs)-new Date(s.firstTs))||0;}
  }
  console.log(g,{n,withCS,calls,apiH:(api/3.6e6).toFixed(1),toolH:(tool/3.6e6).toFixed(1),wallH:(wall/3.6e6).toFixed(1)});
  console.log([...keys].join(','));
  console.log(JSON.stringify(S[0].costState).slice(0,600));
}
