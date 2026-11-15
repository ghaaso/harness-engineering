// usage: node grep.js <file> <regex> [from-ts] [to-ts] [maxctx]
const fs=require('fs'),rl=require('readline');
const [file,re,from,to,maxc]=process.argv.slice(2);
const R=new RegExp(re,'i');const M=+(maxc||300);
const s=rl.createInterface({input:fs.createReadStream(file)});
let n=0;
s.on('line',l=>{n++;let o;try{o=JSON.parse(l)}catch{return}
 const ts=o.timestamp||'';if(from&&ts<from)return;if(to&&ts>to)return;
 let txt='';const m=o.message;
 if(m){if(typeof m.content==='string')txt=m.content;else if(Array.isArray(m.content))txt=m.content.map(c=>c.text||c.thinking||(c.input?JSON.stringify(c.input):'')||(typeof c.content==='string'?c.content:Array.isArray(c.content)?c.content.map(x=>x.text||'').join(' '):'')).join(' ');}
 else if(o.summary)txt=o.summary; else if(o.content) txt=typeof o.content==='string'?o.content:JSON.stringify(o.content);
 const i=txt.search(R);if(i<0)return;
 console.log(`#${n} ${ts} ${o.type}/${m&&m.role||''} model=${m&&m.model||''}: ...${txt.slice(Math.max(0,i-M),i+M).replace(/\s+/g,' ')}...`);
});
