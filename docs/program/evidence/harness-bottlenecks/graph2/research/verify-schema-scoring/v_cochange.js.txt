// Independent co-change count (all refs, non-merge), same file filter as described by the schema lane.
const cp=require('child_process');const ROOT='C:/Users/User/Documents/projects/EMS_workshop1';
function run(refs,label,filt){
 const log=cp.execFileSync('git',['-C',ROOT,'log',...refs,'--no-merges','--name-only','--format=@@%H|%s'],{encoding:'utf8',maxBuffer:1<<28});
 const cs=log.split('@@').slice(1).map(b=>{const [h,...f]=b.split('\n').filter(Boolean);return {h:h.split('|')[0],s:h.split('|').slice(1).join('|'),f}});
 const pair=new Map();let used=0;
 for(const c of cs){const F=[...new Set(c.f.filter(filt))];if(F.length<2||F.length>30)continue;used++;for(let i=0;i<F.length;i++)for(let j=i+1;j<F.length;j++){const k=[F[i],F[j]].sort().join(' | ');pair.set(k,(pair.get(k)||0)+1);}}
 const rt=f=>f.startsWith('backend/')?'b':f.startsWith('technician-app/')?'m':f.startsWith('src/')?'w':f.endsWith('.md')?'d':'o';
 const out={label,commits:cs.length,used};
 for(const s of [2,3,5]){const ps=[...pair].filter(([k,v])=>v>=s);const cr=ps.filter(([k])=>{const [a,b]=k.split(' | ');const A=rt(a),B=rt(b);return A!==B&&'bmw'.includes(A)&&'bmw'.includes(B)&&A!=='o'&&B!=='o'});out['ge'+s]=ps.length;out['ge'+s+'_crossrt_code']=cr.length;out['ge'+s+'_involving_md']=ps.filter(([k])=>k.includes('.md')).length;}
 const venv=cs.filter(c=>c.f.some(x=>x.includes('/venv/')));out.commits_touching_venv=venv.map(c=>c.h.slice(0,7)+' '+c.f.filter(x=>x.includes('/venv/')).length).join(',');
 console.log(JSON.stringify(out));
}
const code=f=>!f.includes('/venv/')&&/\.(py|ts|tsx|js|jsx|mjs)$/.test(f)&&/^(backend|src|technician-app\/src|ops-server)/.test(f);
run(['--all'],'all refs, code+md',f=>code(f)||f.endsWith('.md'));
run(['--all'],'all refs, code only',code);
run(['main'],'main, code only',code);
