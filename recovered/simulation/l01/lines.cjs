// usage: node lines.cjs <file> <from> <to> [max]  prints type/subtype/ts and a short preview, flags compaction
const fs=require('fs'),readline=require('readline');
const [f,a,b,mc]=process.argv.slice(2);const from=+a,to=+b,max=+(mc||200);
(async()=>{const rl=readline.createInterface({input:fs.createReadStream(f),crlfDelay:Infinity});let n=0;
for await(const line of rl){n++;if(n<from)continue;if(n>to)break;let o;try{o=JSON.parse(line)}catch{continue}
const m=o.message;let p='';
if(m&&Array.isArray(m.content))p=m.content.map(c=>c.type+':'+(c.text||c.thinking||(c.input?JSON.stringify(c.input):'')||(typeof c.content==='string'?c.content:JSON.stringify(c.content||''))).slice(0,max)).join(' || ');
else if(m&&typeof m.content==='string')p='STR:'+m.content.slice(0,max);
else p=JSON.stringify(o).slice(0,max);
const flag=/compact/i.test(o.type+' '+(o.subtype||'')+' '+(o.isCompactSummary?'summary':''))?' <<COMPACT>>':'';
console.log(n,o.timestamp||'',o.type,o.subtype||'',(m&&m.model)||'',flag,'|',p.replace(/\s+/g,' '));}})();
