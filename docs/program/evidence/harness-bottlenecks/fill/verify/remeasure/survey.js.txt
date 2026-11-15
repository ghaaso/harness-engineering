const fs=require('fs'),rl=require('readline');
const f=process.argv[2];const c={};const inc=k=>c[k]=(c[k]||0)+1;
const r=rl.createInterface({input:fs.createReadStream(f)});
let ex={};
r.on('line',l=>{let o;try{o=JSON.parse(l)}catch(e){inc('BAD');return}
inc('type:'+o.type);
if(o.type==='attachment'){inc('att:'+(o.attachment&&o.attachment.type));}
if(o.isCompactSummary)inc('compactSummary');
if(o.type==='system')inc('sys:'+o.subtype);
const m=o.message;if(m&&Array.isArray(m.content))for(const b of m.content){inc(o.type+':blk:'+b.type);
 if(b.type==='thinking'){inc('think_len_'+(b.thinking?b.thinking.length>0:'none'));}
 if(b.type==='tool_use')inc('tool:'+b.name);
 if(b.type==='tool_result'&&!ex.tr){ex.tr=JSON.stringify(o).slice(0,1500)}}
 else if(m&&typeof m.content==='string')inc(o.type+':strcontent');
if(o.type==='assistant'&&!ex.a)ex.a=JSON.stringify(o).slice(0,1200);
if(o.type==='attachment'&&!ex['at'+o.attachment.type])ex['at'+o.attachment.type]=JSON.stringify(o).slice(0,600);
});
r.on('close',()=>{console.log(Object.entries(c).sort().map(x=>x.join(' ')).join('\n'));for(const k in ex)console.log('---',k,ex[k]);});
