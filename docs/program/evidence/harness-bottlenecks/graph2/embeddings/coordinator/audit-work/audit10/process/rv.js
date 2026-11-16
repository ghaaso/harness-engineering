const fs=require('fs');for(const f of process.argv.slice(2)){const s=fs.readFileSync(f,'utf8');const o=JSON.parse(s);console.log('==',f.split('/').pop(),Object.keys(o).join(','));
const re=/(verdict|bootstrap|standard error|simplest|band|interval|selection|write_result|report\.py|alone_unrestricted|unrestricted word)/i;
const walk=(x,p)=>{if(typeof x==='string'){if(re.test(x)&&/(dropped|refut|not a defect|reject)/i.test(p+x))console.log(' ',p,'::',x.slice(0,260));return}if(x&&typeof x==='object')for(const k of Object.keys(x))walk(x[k],p+'.'+k)};walk(o,'');}
