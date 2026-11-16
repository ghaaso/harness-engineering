const L=process.argv[2],D=process.argv[3];const fs=require('fs');
const t=JSON.parse(fs.readFileSync(L+'/train/report/tune.json'));
console.log(JSON.stringify(t.verdicts.late50,null,1));
const r=JSON.parse(fs.readFileSync(D+'/result.json'));
console.log('RESULT verdict keys',JSON.stringify(Object.keys(r.verdicts||{})), JSON.stringify(r.verdicts).slice(0,1500));
