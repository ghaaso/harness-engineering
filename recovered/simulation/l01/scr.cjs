const fs=require('fs'),path=require('path'),readline=require('readline');
const root='C:/Users/User/.claude/projects';const skip=/house-expenses|lecture-stuff|compiler-construction/;
const RE=/Temp[\\\/]+claude[\\\/]+([^\\\/]+)[\\\/]+[0-9a-f-]{36}[\\\/]+scratchpad/;
(async()=>{const rows=[];
for(const d of fs.readdirSync(root)){if(skip.test(d))continue;const dd=path.join(root,d);
 for(const f of fs.readdirSync(dd)){if(!f.endsWith('.jsonl'))continue;const p=path.join(dd,f);
  const rl=readline.createInterface({input:fs.createReadStream(p),crlfDelay:Infinity});let n=0,ts=null,form=null;
  for await(const line of rl){n++;if(n>400)break;if(!ts){const m=line.match(/"timestamp":"([^"]+)"/);if(m)ts=m[1];}
   const m=line.match(RE);if(m){form=/^C--/.test(m[1])?'long':'short:'+m[1];break;}}
  rl.close();if(form&&ts)rows.push([ts,form,d.slice(0,40)]);}}
rows.sort();const longs=rows.filter(r=>r[1]==='long'),shorts=rows.filter(r=>r[1]!=='long');
console.log('long n',longs.length,'first',longs[0]&&longs[0][0],'last',longs.length&&longs[longs.length-1].join(' '));
console.log('short n',shorts.length,'first',shorts[0]&&shorts[0].join(' '),'last',shorts.length&&shorts[shorts.length-1][0]);
})();
