const fs=require('fs'),rl=require('readline');
const f=process.argv[2];const cmd={};const agg={};const cn={};let userText=0,userN=0,notif=0,notifN=0;
function cat(c){c=c||'';
 if(/clinic-build[\\/]+task\.md/.test(c)&&/(sed|cat|grep|head|tail|awk|Get-Content|Select-String|wc)/.test(c)&&!/git (diff|show)/.test(c))return 'board read/grep';
 if(/git (-C \S+ )?(diff|show)/.test(c))return 'git diff/show';
 if(/git (-C \S+ )?log/.test(c))return 'git log';
 if(/check\.py|pytest|manage\.py test/.test(c))return 'check/tests';
 if(/task\.md/.test(c))return 'other task.md read';
 if(/(sed|cat|head|tail|grep|rg|awk) /.test(c))return 'other file read/grep';
 if(/git /.test(c))return 'other git';
 if(/python|py /.test(c))return 'python script';
 return 'other';}
const r=rl.createInterface({input:fs.createReadStream(f)});
r.on('line',l=>{let o;try{o=JSON.parse(l)}catch(e){return}const m=o.message;if(!m)return;
 if(o.type==='user'&&typeof m.content==='string'){userN++;userText+=m.content.length;if(/task-notification|<task/.test(m.content)){notif+=m.content.length;notifN++;}}
 if(!Array.isArray(m.content))return;
 for(const c of m.content){
  if(o.type==='user'&&c.type==='text'){userN++;userText+=c.text.length;if(/task-notification|<task/.test(c.text)){notif+=c.text.length;notifN++;}}
  if(c.type==='tool_use'&&c.name==='Bash')cmd[c.id]=cat(c.input&&c.input.command);
  if(c.type==='tool_result'&&cmd[c.tool_use_id]){const k=cmd[c.tool_use_id];let s=0;if(typeof c.content==='string')s=c.content.length;else if(Array.isArray(c.content))for(const x of c.content)if(x.text)s+=x.text.length;agg[k]=(agg[k]||0)+s;cn[k]=(cn[k]||0)+1;}
 }});
r.on('close',()=>{for(const k of Object.keys(agg).sort((a,b)=>agg[b]-agg[a]))console.log(k,'n='+cn[k],'chars='+agg[k]);console.log('user text msgs',userN,'chars',userText,'task-notifications',notifN,'chars',notif);});
