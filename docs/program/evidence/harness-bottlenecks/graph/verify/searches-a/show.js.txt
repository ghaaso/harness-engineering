const s=require('../../sample.json');
const [a,b]=process.argv.slice(2).map(Number);
const P=new RegExp('/?c?:?/?Bilal_Migration/User/Downloads/20_PROJECTS/24_Clinic_Workshop(/\.claude/worktrees/[a-z0-9-]+)?/?','gi');
const c=(x,n)=>String(x==null?'':typeof x==='string'?x:JSON.stringify(x)).replace(P,'~/').replace(/\s+/g,' ').slice(0,n);
for(const it of s.slice(a,b)){
 console.log('#'+it.id,it.kind,it.sub?'S':'', '|',c(it.search,300));
 if(it.said_before)console.log('  said:',c(it.said_before,100));
 console.log('  next:',(it.next_calls||[]).map(n=>c(n,110)).join(' || '));
}
