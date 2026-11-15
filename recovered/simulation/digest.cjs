const fs=require('fs');
let j=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); if(j.result) j=j.result;
const mode=process.argv[3]||'matrix';
const ab={works:'W',strains:'s',breaks:'B',not_specified:'?',not_reached:'-'};
if(mode==='matrix'){
  const tot={};
  for(const l of j.lanes){
    console.log('\n## '+l.id+' (cases found '+l.cases_found+', walked '+l.walks.length+')');
    for(const w of l.walks){
      const m=Array(10).fill(' ');
      for(const s of w.steps){ if(s.step>=1&&s.step<=10) m[s.step-1]=ab[s.status]||'x'; }
      console.log((w.case_id+'            ').slice(0,12)+' '+m.join(' '));
      w.steps.forEach(s=>{const k=s.step+':'+s.status; tot[k]=(tot[k]||0)+1;});
    }
  }
  console.log('\n## totals per step (W works, s strains, B breaks, ? not specified, - not reached)');
  for(let st=1;st<=10;st++){ console.log('step '+st+': '+['works','strains','breaks','not_specified','not_reached'].map(x=>ab[x]+'='+(tot[st+':'+x]||0)).join('  ')); }
  console.log('\nmissing: '+JSON.stringify(j.missing));
} else if(mode==='summary'){
  for(const l of j.lanes){ console.log('\n## '+l.id+'\nSUMMARY: '+l.summary+'\nWORKS: '+l.works_well.map(x=>'- '+x).join('\n')+'\nDID NOT BREAK: '+l.did_not_break.map(d=>'- ['+d.listed_item+'] '+d.why).join('\n')); }
} else {
  const want=mode.split(',');
  for(const l of j.lanes){ if(!want.some(w=>l.id.startsWith(w))) continue;
    console.log('\n## '+l.id);
    const bs=[...l.breaks].sort((a,b)=>(a.seen_before===b.seen_before)?(b.cases_hit-a.cases_hit):(a.seen_before?1:-1));
    for(const b of bs){ console.log('- '+(b.seen_before?'[seen]':'[NEW ]')+' step '+b.step+' | hits '+b.cases_hit+' | '+b.title+' :: '+b.description+' || EV: '+b.evidence); }
  }
}
