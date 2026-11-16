const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const mode=process.argv[3]||'a';
const keep=j.hits.filter(h=>{const tags=h.match(/\[([^\]]*)\]/)[1].split(',');
 if(mode==='a')return tags.includes('ho_sha')||tags.includes('hinputs');
 if(mode==='b')return (tags.includes('graphs'))&&(tags.includes('plan_ho')||tags.includes('heldout'));
 if(mode==='c')return tags.includes('facts');
});
const excl=process.argv[4]?new RegExp(process.argv[4]):null;
for(const h of keep){if(excl&&excl.test(h))continue;console.log(h.slice(0,260));}
console.log('n',keep.length);
