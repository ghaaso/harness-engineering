const fs=require('fs');
const cm={N:'NOT_A_SEARCH',C:'CONNECTION',D:'DEFINITION',T:'CONTENT',S:'STATE_OR_LISTING',U:'UNCLEAR'};
const gm={f:'full',p:'partial',n:'none'},sm={l:'likely',u:'unlikely',c:'cannot tell'};
const out=[];
for(const f of ['j1','j2','j3','j4']) for(const l of fs.readFileSync(f+'.txt','utf8').trim().split('\n')){
 const p=l.split(' ');const o={id:+p[0],cls:cm[p[1]],graph_answer:gm[p[2]],step_saved:sm[p[3]]};
 const n=p.slice(4).join(' ').split(' ').slice(0,12).join(' ');if(n)o.note=n;out.push(o);}
out.sort((a,b)=>a.id-b.id);
if(out.length!==200||out.some((o,i)=>o.id!==i+1))throw new Error('bad '+out.length);
fs.writeFileSync('classification.json',JSON.stringify(out,null,1));
const cnt=(k)=>out.reduce((a,o)=>(a[o[k]]=(a[o[k]]||0)+1,a),{});
console.log(cnt('cls'),cnt('graph_answer'),cnt('step_saved'));
const x={};for(const o of out){const k=o.cls+'/'+o.graph_answer;x[k]=(x[k]||0)+1}console.log(x);
