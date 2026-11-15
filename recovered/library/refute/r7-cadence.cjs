const fs=require('fs');
for (const [f,re] of [['r7-expo-time.json',/^(\d+)\.0\.0$/],['r7-rn-time.json',/^0\.(\d+)\.0$/]]){
 const t=JSON.parse(fs.readFileSync(f,'utf8'));
 const rows=Object.keys(t).filter(k=>re.test(k)).map(k=>[k,t[k].slice(0,10)]).sort((a,b)=>a[1]<b[1]?-1:1);
 console.log(f); rows.slice(-10).forEach(r=>console.log('  ',r[0],r[1]));
}
const t=JSON.parse(fs.readFileSync('r7-expo-time.json','utf8'));
const d=v=>new Date(t[v]); const mo=(a,b)=>(d(b)-d(a))/864e5/30.44;
console.log('52->58 months',mo('52.0.0','58.0.0').toFixed(2),'per major',(mo('52.0.0','58.0.0')/6).toFixed(2));
console.log('55->58',mo('55.0.0','58.0.0').toFixed(2));
for(let v=46;v<58;v++){ if(t[v+'.0.0']&&t[(v+1)+'.0.0']) console.log(v,'->',v+1, mo(v+'.0.0',(v+1)+'.0.0').toFixed(1)); }
const rt=JSON.parse(fs.readFileSync('r7-rn-time.json','utf8'));
console.log('RN 0.76.0',rt['0.76.0'],'0.88.0',rt['0.88.0'], 'latest per npm view later');
