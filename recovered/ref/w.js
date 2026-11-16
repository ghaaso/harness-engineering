const fs=require('fs'),readline=require('readline');
const f='C:/Users/User/.claude/projects/C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop/7f348b2c-75ba-41bd-8132-d395ef24a5f6.jsonl';
const uses={};(async()=>{const rl=readline.createInterface({input:fs.createReadStream(f),crlfDelay:Infinity});
for await(const l of rl){let j;try{j=JSON.parse(l)}catch{continue}const c=j.message&&j.message.content;if(!Array.isArray(c))continue;
for(const b of c){if(b.type==='tool_use')uses[b.id]={t:j.timestamp,name:b.name,cmd:JSON.stringify(b.input).slice(0,160)};
if(b.type==='tool_result'){const s=JSON.stringify(b.content);if(s.includes('waited 2030 s')){const u=uses[b.tool_use_id];console.log('result',j.timestamp,'use',u&&u.t,u&&u.name,u&&u.cmd);}}}}})();
