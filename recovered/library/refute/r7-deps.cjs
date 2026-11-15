const {execSync}=require('child_process');const fs=require('fs');
const repo='C:/Users/User/Documents/projects/EMS_workshop1';
const out=[];
for (const [grp,path] of [['mobile','technician-app/package.json'],['web','package.json'],['backend-req','backend/pyproject.toml']]){
  if(grp==='backend-req') continue;
  const pj=JSON.parse(execSync(`git show main:${path}`,{cwd:repo}).toString());
  const deps=Object.assign({},pj.dependencies||{}, grp==='web'?{}:{});
  const sets=[['dep',pj.dependencies||{}],['dev',pj.devDependencies||{}]];
  for(const [kind,ds] of sets) for(const [n,v] of Object.entries(ds)){
    let latest='?'; try{ latest=execSync(`npm view ${n} dist-tags.latest`,{timeout:60000}).toString().trim(); }catch(e){}
    out.push({grp,kind,n,v,latest});
  }
}
fs.writeFileSync('r7-deps.json',JSON.stringify(out,null,1));
const maj=v=>{const m=v.replace(/^[~^>=< ]+/,'').split('.');return m[0]==='0'?'0.'+m[1]:m[0];};
const tally={};
for(const r of out){const k=r.grp+'/'+r.kind;tally[k]=tally[k]||{n:0,d:0,list:[]};tally[k].n++; if(maj(r.v)!==maj(r.latest)){tally[k].d++;tally[k].list.push(`${r.n} ${r.v}->${r.latest}`);} }
console.log(JSON.stringify(tally,null,1));
