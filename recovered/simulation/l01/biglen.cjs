// all Bash calls with command length > 6000: result ok/err, bytes (utf8), heredoc?
const fs=require('fs'),path=require('path'),readline=require('readline');
const root='C:/Users/User/.claude/projects';const skip=/house-expenses|lecture-stuff|compiler-construction/;
function walk(d,o){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(p.endsWith('.jsonl'))o.push(p);}}
(async()=>{const files=[];for(const d of fs.readdirSync(root)){if(skip.test(d))continue;walk(path.join(root,d),files);}
const out=[];
for(const f of files){const st=fs.statSync(f);if(st.mtimeMs<Date.parse('2026-10-20'))continue;
 const rl=readline.createInterface({input:fs.createReadStream(f),crlfDelay:Infinity});const calls={};
 for await(const line of rl){if(line.length>3e6)continue;if(line.indexOf('api-request')>=0&&line.indexOf('"type":"api-request')>=0)continue;let o;try{o=JSON.parse(line)}catch{continue}
  const c=o.message&&o.message.content;if(!Array.isArray(c)||!o.timestamp)continue;
  for(const b of c){if(b.type==='tool_use'&&b.name==='Bash'&&b.input&&b.input.command&&b.input.command.length>6000){const cmd=b.input.command;calls[b.id]={ts:o.timestamp,len:cmd.length,bytes:Buffer.byteLength(cmd),hd:/<<\s*'?"?\w+/.test(cmd),model:o.message.model};}
   if(b.type==='tool_result'&&calls[b.tool_use_id]){const t=typeof b.content==='string'?b.content:(Array.isArray(b.content)?b.content.map(x=>x.text||'').join(''):'');const k=calls[b.tool_use_id];k.err=!!b.is_error;k.eof=/unexpected EOF|here-document/.test(t);k.f=f.replace(/.*projects[\\/]/,'').slice(0,60);out.push(k);delete calls[b.tool_use_id];}}
 }}
fs.writeFileSync('biglen.json',JSON.stringify(out));
const bins=[[6000,7000],[7000,8000],[8000,8192],[8192,9000],[9000,12000],[12000,1e9]];
for(const [a,b] of bins){const r=out.filter(x=>x.bytes>=a&&x.bytes<b);console.log('bytes',a,b,'n',r.length,'ok',r.filter(x=>!x.err).length,'eof',r.filter(x=>x.eof).length,'otherErr',r.filter(x=>x.err&&!x.eof).length, 'heredoc',r.filter(x=>x.hd).length);}
const okBig=out.filter(x=>!x.err&&x.bytes>8192).sort((a,b)=>b.bytes-a.bytes).slice(0,8);console.log('largest ok:',JSON.stringify(okBig.map(x=>[x.ts,x.bytes,x.len,x.hd,x.f])));
const eofSmall=out.filter(x=>x.eof).sort((a,b)=>a.bytes-b.bytes).slice(0,5);console.log('smallest eof:',JSON.stringify(eofSmall.map(x=>[x.ts,x.bytes,x.len,x.f])));
})();
