const fs=require('fs');
const [file,id,n]=[process.argv[2],process.argv[3],+process.argv[4]||4];
const L=fs.readFileSync(file,'utf8').split('\n');let hit=-1,cnt=0;
for(let i=0;i<L.length;i++){if(!L[i])continue;if(hit<0&&L[i].includes(id)&&L[i].includes('tool_result')){hit=i;}
 if(hit>=0&&i>=hit-1&&cnt<n*2+2){let o;try{o=JSON.parse(L[i])}catch{continue}const c=o.message&&o.message.content;
  if(typeof c==='string'){console.log(i,o.type,o.timestamp,'TEXT',c.slice(0,300));cnt++;continue}
  if(!Array.isArray(c))continue;
  for(const b of c){if(b.type==='tool_use')console.log(i,'USE',o.message.model||'',b.name,JSON.stringify(b.input).slice(0,350));
   else if(b.type==='tool_result')console.log(i,'RES',b.is_error?'ERR':'ok',(typeof b.content==='string'?b.content:JSON.stringify(b.content)).slice(0,250).replace(/\n/g,' '));
   else if(b.type==='text')console.log(i,'TXT',b.text.slice(0,250).replace(/\n/g,' '));}
  cnt++;}}
