const {execSync}=require('child_process');
const repo='C:/Users/User/Documents/projects/EMS_workshop1';
const g=c=>execSync('git '+c,{cwd:repo,maxBuffer:1e8}).toString();
const list=g("log main --format=%h%x09%s").split('\n').filter(l=>/^\w+\t(@ )?fix/i.test(l)).map(l=>l.split('\t')[0]);
const cfg=f=>/(\.json|\.ya?ml|\.toml|Dockerfile|\.example|\.md|\.lock|\.cfg|\.ini)$/.test(f);
let n=0;const hits=[];
for(const h of list){const fs=g(`show --name-only --format= ${h}`).trim().split('\n').filter(Boolean);
 const nonDoc=fs.filter(f=>!/\.md$/.test(f));
 if(nonDoc.length&&nonDoc.every(cfg)){hits.push(h+' '+nonDoc.join(','));}}
console.log(list.length,'fixes; config-only:',hits.length);hits.forEach(h=>console.log(' ',h));
