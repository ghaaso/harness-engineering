const fs=require('fs');
let j=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); if(j.result) j=j.result;
const want=(process.argv[3]||'').split(',').filter(Boolean);
for(const r of j.refutes){
  if(want.length && !want.includes(r.id)) continue;
  console.log('\n=================== '+r.id+' | VERDICT='+r.verdict+' | conf='+r.confidence);
  console.log('RESTATED: '+r.restated_issue);
  console.log('COUNTER: '+r.strongest_counter);
  console.log('CORRECTED: '+r.corrected_numbers.map(c=>'['+c.was+' -> '+c.now+' ('+c.why+')]').join(' '));
  console.log('FIXES: '+r.fixes_tested.map(f=>'['+f.fix+' => '+f.result+']').join(' '));
  console.log('OWNER CAN: '+r.owner_can);
  console.log('CHECKS: '+r.checks.map(c=>'{'+c.result.toUpperCase()+': '+c.claim+'}').join(' '));
}
if(j.critic && (!want.length || want.includes('critic'))){
  const c=j.critic;
  console.log('\n=================== CRITIC\nSUMMARY: '+c.summary);
  console.log('\nCONTRADICTIONS:'); for(const x of c.contradictions) console.log('- '+x.between+': '+x.what+' => '+x.resolution);
  console.log('\nUNIT ERRORS:'); for(const x of (c.unit_errors||[])) console.log('- '+x);
  console.log('\nMISSING:'); for(const x of c.missing_issues) console.log('- ['+x.confidence+'] '+x.title+': '+x.claim+' | EVIDENCE: '+x.evidence+' | WHY: '+x.why_not_easily_solved);
  console.log('\nMERGES:'); for(const x of c.merges) console.log('- '+x);
  console.log('\nEASILY SOLVED:'); for(const x of c.easily_solved) console.log('- '+x.issue+' => '+x.fix);
  console.log('\nCLOSEST TO TRUE:'); for(const x of c.closest_to_true) console.log('- '+x.expectation+': '+x.form+' | '+x.number);
}
console.log('\nMISSING AGENTS: '+JSON.stringify(j.missing));
