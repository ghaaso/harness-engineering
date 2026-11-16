const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const re=new RegExp(process.argv[3]);const out=[];
(function w(o,p){if(o&&typeof o==='object'){if(Array.isArray(o)){o.forEach((v,i)=>w(v,p+'['+i+']'));}else for(const k of Object.keys(o))w(o[k],p?p+'.'+k:k);}else if(re.test(p))out.push(p+' = '+JSON.stringify(o));})(j,'');
console.log(out.slice(0,+process.argv[4]||400).join('\n'));console.log('n='+out.length);
