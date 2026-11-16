const L=process.argv[2];
for (const a of ['E1','E2','E3','E4','E5','PLACEBO']){const j=require(L+'/train/selectB/'+a+'/choices.json');
console.log(a, Object.keys(j).join(','));
for(const b of j.blocks){const o={...b};o.commits=(b.commits||[]).length;console.log('  ',JSON.stringify(o).slice(0,400));}}
