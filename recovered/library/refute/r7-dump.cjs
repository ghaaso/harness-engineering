const {execSync}=require('child_process');const fs=require('fs');
const repo='C:/Users/User/Documents/projects/EMS_workshop1';
const g=c=>execSync('git '+c,{cwd:repo,maxBuffer:1e8}).toString();
const list=g("log main --format=%h%x09%s").split('\n').filter(l=>/^\w+\t(@ )?fix/i.test(l));
let out='';
for(const l of list){const h=l.split('\t')[0];
 let body=g(`show -s --format=%B ${h}`); if(body.length>2500) body=body.slice(0,2500)+'\n[...cut]';
 const files=g(`show --name-only --format= ${h}`).trim().split('\n');
 out+=`\n=================== ${h}\n${body}\n--- files (${files.length}): ${files.slice(0,25).join(', ')}${files.length>25?' ...':''}\n`;}
fs.writeFileSync('r7-fix-bodies.txt',out);console.log(list.length,out.length);
