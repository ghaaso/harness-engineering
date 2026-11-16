const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[2]+'/result.json','utf8'));
console.log(JSON.stringify(j.nonfinite_heldout));
const s=fs.readFileSync(process.argv[2]+'/AUDIT.md','utf8');
for(const w of ['sleep','Sleep','rulings_112','ruling 112','Kernel-Power','7,237','7237']) console.log(w, s.split(w).length-1);
const r=fs.readFileSync(process.argv[2]+'/RESULT.md','utf8');
for(const w of ['sleep','Sleep','112','ruling','nonfinite','non-finite','finite']) console.log('RESULT',w, r.split(w).length-1);
