const fs=require('fs'),rl=require('readline');
const r=rl.createInterface({input:fs.createReadStream(process.argv[2])});
const seen=new Map();
r.on('line',l=>{try{const o=JSON.parse(l);if(o.type==='assistant'&&o.message&&o.message.usage){seen.set(o.message.id,o.message.usage);}}catch(e){}});
r.on('close',()=>{let cr=0,cc=0,out=0,inp=0;for(const u of seen.values()){cr+=u.cache_read_input_tokens||0;cc+=u.cache_creation_input_tokens||0;out+=u.output_tokens||0;inp+=u.input_tokens||0;}console.log({calls:seen.size,cr,cc,out,inp});});
