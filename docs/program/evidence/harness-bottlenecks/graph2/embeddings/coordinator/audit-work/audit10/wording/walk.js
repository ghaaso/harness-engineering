const fs=require('fs');
const j=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const out=[];
function walk(o,p){ if(o&&typeof o==='object'){ if('diff' in o && 'lo' in o && 'hi' in o){ out.push(p+' diff='+o.diff+' lo='+o.lo+' hi='+o.hi+(o.p!==undefined?' p='+o.p:'')); return;} for(const k of Object.keys(o)) walk(o[k],p+'.'+k);} }
walk(j,'');
const f=process.argv[3]? new RegExp(process.argv[3]):null;
console.log(out.filter(l=>!f||f.test(l)).join('\n'));
console.log('total',out.length, 'top keys', Object.keys(j).join(','));
