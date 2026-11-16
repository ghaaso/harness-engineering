const fs=require('fs'),rl=require('readline');
const f=process.argv[2];const names={};const res={};const cnt={};let inp={};const big=[];
let usage={in:0,cr:0,cc:0,out:0},calls=0;const seen=new Set();
const r=rl.createInterface({input:fs.createReadStream(f)});
r.on('line',l=>{let o;try{o=JSON.parse(l)}catch(e){return}
 const m=o.message; if(!m||!Array.isArray(m.content))return;
 if(o.type==='assistant'&&m.usage&&m.id&&!seen.has(m.id)){seen.add(m.id);calls++;usage.in+=m.usage.input_tokens||0;usage.cr+=m.usage.cache_read_input_tokens||0;usage.cc+=m.usage.cache_creation_input_tokens||0;usage.out+=m.usage.output_tokens||0;}
 for(const c of m.content){
  if(c.type==='tool_use'){names[c.id]=c.name;const s=JSON.stringify(c.input||{}).length;inp[c.name]=(inp[c.name]||0)+s;}
  if(c.type==='tool_result'){const n=names[c.tool_use_id]||'?';let s=0;if(typeof c.content==='string')s=c.content.length;else if(Array.isArray(c.content))for(const x of c.content){if(x.text)s+=x.text.length}
   res[n]=(res[n]||0)+s;cnt[n]=(cnt[n]||0)+1;}
 }});
r.on('close',()=>{const rows=Object.keys(res).map(k=>[k,cnt[k],res[k],inp[k]||0]).sort((a,b)=>b[2]-a[2]);
 let tot=0;for(const x of rows)tot+=x[2];
 console.log('tool_result chars total',tot);for(const x of rows.slice(0,14))console.log(x[0],'n='+x[1],'resultChars='+x[2],'('+(100*x[2]/tot).toFixed(1)+'%)','inputChars='+x[3]);
 console.log('dedup assistant calls',calls,JSON.stringify(usage));});
