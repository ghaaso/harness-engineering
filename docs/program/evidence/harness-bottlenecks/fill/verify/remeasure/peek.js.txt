const fs=require('fs'),rl=require('readline');
const f=process.argv[2];const want=process.argv[3].split(',');let n={};
const r=rl.createInterface({input:fs.createReadStream(f)});
r.on('line',l=>{let o;try{o=JSON.parse(l)}catch(e){return}
if(want.includes(o.type)){n[o.type]=(n[o.type]||0)+1;if(n[o.type]<=2){const s=JSON.stringify(o);console.log('=== '+o.type+' len='+s.length);console.log(s.slice(0,+process.argv[4]||1500));}}});
