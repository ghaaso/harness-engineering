// usage: node scan.js <file> <regex> [ctx=200] [maxHits=20] [lineFrom] [lineTo]
const fs=require('fs');const rl=require('readline');
const [file,pat,ctxS,maxS,fromS,toS]=process.argv.slice(2);
const re=new RegExp(pat,'i');const ctx=+ctxS||200;const max=+maxS||20;const from=+fromS||0;const to=+toS||1e9;
let n=0,hits=0;
const r=rl.createInterface({input:fs.createReadStream(file),crlfDelay:Infinity});
r.on('line',l=>{n++; if(n<from||n>to)return; if(hits>=max)return;
 let o;try{o=JSON.parse(l)}catch(e){return}
 const ts=o.timestamp||'';const type=o.type+(o.message&&o.message.role?'/'+o.message.role:'');
 let texts=[];
 const c=o.message&&o.message.content;
 if(typeof c==='string')texts.push(c);
 else if(Array.isArray(c))for(const b of c){ if(b.type==='text')texts.push(b.text); else if(b.type==='tool_use')texts.push('[tool_use '+b.name+'] '+JSON.stringify(b.input)); else if(b.type==='tool_result'){const cc=b.content; if(typeof cc==='string')texts.push('[result] '+cc); else if(Array.isArray(cc))for(const x of cc){if(x.type==='text')texts.push('[result] '+x.text)}} else if(b.type==='thinking'){texts.push('[thinking] '+(b.thinking||''))}}
 if(o.type==='attachment'||o.attachment)texts.push(JSON.stringify(o.attachment||''));
 if(o.model||o.message&&o.message.model){}
 const all=texts.join(' || ');
 const m=all.match(re); if(!m)return; hits++;
 const i=m.index; const s=all.slice(Math.max(0,i-ctx),i+ctx).replace(/\s+/g,' ');
 console.log(`L${n} ${ts} ${type} ${o.message&&o.message.model?o.message.model:''}: ...${s}...`);
});
r.on('close',()=>console.log('lines',n,'hits',hits));
