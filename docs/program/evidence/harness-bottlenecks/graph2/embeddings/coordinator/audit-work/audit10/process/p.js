const fs=require('fs');const L=process.argv[2];
const lines=fs.readFileSync(L,'utf8').split('\n').filter(Boolean);
lines.forEach((l,i)=>{let o;try{o=JSON.parse(l)}catch(e){console.log(i+1,'BAD');return}
if(o.step==='export')return;
let s=JSON.stringify(o);console.log(i+1,s.length>600?s.slice(0,600)+'...':s)});
