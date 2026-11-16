const {L,j}=require('./p.js');const T=j(L+'/train/report/tune.json');
for(const a of ['E1','E2','E3','E4','E5']){const f=T.counts[a].all65_final_choice;console.log(a,f.config_id,JSON.stringify(f.figures.pool.occurrences));}
console.log(Object.keys(T.counts.E1.late50_block_choices));
