const fs=require('fs');const models={};let t0,t1;
const rl=require('readline').createInterface({input:fs.createReadStream(process.argv[2])});
rl.on('line',l=>{ if(!l.includes('"model"')) return; try{const o=JSON.parse(l); if(o.message&&o.message.role==='assistant'&&o.message.model){models[o.message.model]=(models[o.message.model]||0)+1; if(!t0)t0=o.timestamp; t1=o.timestamp;}}catch{} });
rl.on('close',()=>console.log(process.argv[2].slice(-50),JSON.stringify(models),t0,t1));
