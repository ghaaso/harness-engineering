const fs=require('fs');
const raw=fs.readFileSync(process.argv[2],'utf8');
let j;
try{ j=JSON.parse(raw);}catch(e){ const i=raw.indexOf('{"dir"'); j=JSON.parse(raw.slice(i, raw.lastIndexOf('}')+1)); }
const mode=process.argv[3]||'issues';
if(j.result) j=j.result;
for(const r of j.results){
  if(r.dive.startsWith('P-')){
    if(mode==='pro'){
      console.log('=== '+r.dive+'\nSUMMARY: '+r.summary+'\n');
      for(const e of r.per_expectation){
        console.log('--- '+e.id+' NUMBER: '+e.defensible_number);
        console.log('CASE: '+e.case);
        console.log('FIT: '+e.fit_to_owner_workload);
        console.log('ASSUME: '+e.key_assumptions.join(' | '));
        console.log('UNANSWERED: '+e.unanswered_objections.join(' | ')+'\n');
      }
    }
    continue;
  }
  if(mode!=='issues' && mode!==r.dive) continue;
  if(mode==='pro') continue;
  console.log('\n=================== '+r.dive+' (written='+r.written+')');
  console.log('SUMMARY: '+r.summary);
  for(const i of r.issues){
    console.log('\n## '+i.id+' | '+i.title+' | effect='+i.effect+' | conf='+i.confidence+' | inDesign='+i.already_in_design+' | hits='+i.expectations_hit.join(','));
    console.log('CLAIM: '+i.claim);
    console.log('MECH: '+i.mechanism);
    console.log('MAGNITUDE: '+i.magnitude);
    console.log('FIXES: '+i.best_fixes_tried.map(f=>'['+f.fix+' => '+f.result+']').join(' '));
    console.log('RESIDUAL: '+i.residual);
    console.log('FALSIFIER: '+i.falsifier);
    if(i.design_cite) console.log('CITE: '+i.design_cite);
  }
  console.log('\nDISSOLVED: '+r.dissolved.map(d=>'{'+d.title+': '+d.why+'}').join(' '));
  if(r.new_angles&&r.new_angles.length) console.log('NEW ANGLES: '+r.new_angles.join(' | '));
}
