const fs=require('fs');
let j=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); if(j.result) j=j.result;
const mode=process.argv[3]||'titles';
let nNew=0,nSeen=0;
const all=[];
for(const l of j.lanes){ for(const b of l.breaks){ all.push({lane:l.id.slice(0,3),...b}); if(b.seen_before) nSeen++; else nNew++; } }
if(mode==='titles'){
  for(const l of j.lanes){ console.log('\n## '+l.id);
    for(const b of l.breaks){ console.log((b.seen_before?'  seen ':'  NEW  ')+'s'+String(b.step).slice(0,14).padEnd(14)+' h'+b.cases_hit+' '+b.title); } }
  console.log('\nTOTAL breaks '+all.length+' new '+nNew+' seen '+nSeen);
  fs.writeFileSync('scratchpad/sim/all-breaks.json', JSON.stringify(all,null,1));
} else {
  const want=mode.split(',');
  for(const b of all){ if(b.seen_before) continue; if(!want.includes(b.lane)) continue;
    console.log('\n['+b.lane+' s'+b.step+' h'+b.cases_hit+'] '+b.title+'\n   '+b.description+'\n   EV: '+b.evidence); }
}
