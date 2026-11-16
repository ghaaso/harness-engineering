const fs=require('fs'),path=require('path'),rl=require('readline');
function walk(d,a=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,a);else if(p.endsWith('.jsonl'))a.push(p);}return a;}
const files=walk(process.argv[2]);let calls=0,u={in:0,cr:0,cc:0,out:0};const seen=new Set();let i=0;
function next(){if(i>=files.length){console.log('files',files.length,'calls',calls,JSON.stringify(u));return;}
 const r=rl.createInterface({input:fs.createReadStream(files[i++])});
 r.on('line',l=>{let o;try{o=JSON.parse(l)}catch(e){return}const m=o.message;if(o.type==='assistant'&&m&&m.usage&&m.id&&!seen.has(m.id)){seen.add(m.id);calls++;u.in+=m.usage.input_tokens||0;u.cr+=m.usage.cache_read_input_tokens||0;u.cc+=m.usage.cache_creation_input_tokens||0;u.out+=m.usage.output_tokens||0;}});
 r.on('close',next);}
next();
