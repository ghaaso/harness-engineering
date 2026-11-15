const fs=require('fs');
const raw=fs.readFileSync('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/tasks/wn34n8ff1.output','utf8');
let r; try{r=JSON.parse(raw);}catch(e){ const i=raw.indexOf('{"research"'); r=JSON.parse(raw.slice(i,raw.lastIndexOf('}')+1)); } if(r.result)r=r.result;
fs.writeFileSync('research/result.json',JSON.stringify(r,null,1));
const W=(name,L)=>{fs.writeFileSync('research/'+name,L.join('\n')); console.log(name,L.length,'lines',L.join('\n').length,'chars');};
let L=[]; const c=r.critic; L.push('=== CRITIC'); L.push('ENOUGH: '+c.enough_to_design_from);
L.push('MISSING:'); for(const m of c.missing)L.push('  - '+m.what+' | WHY: '+m.why_it_matters+' | FILL: '+m.how_to_fill);
L.push('CONFLICTS:\n  - '+c.conflicts_between_lanes.join('\n  - ')); L.push('DESIGN:\n  - '+c.design_implications.join('\n  - ')); L.push('FAIRNESS RISKS:\n  - '+c.fairness_risks_in_the_planned_test.join('\n  - '));
W('critic.txt',L);
L=[]; for(const v of r.checks){ L.push('=== '+v.key); const t={}; for(const x of v.checked)t[x.verdict]=(t[x.verdict]||0)+1; L.push('verdicts '+JSON.stringify(t));
  L.push('BIGGEST ERRORS:\n  - '+v.biggest_errors.join('\n  - ')); L.push('LEAN:\n  - '+v.lean_or_bias_found.join('\n  - '));
  for(const x of v.checked) if(x.verdict!=='confirmed')L.push('  ['+x.lane+'] '+x.verdict+': '+x.claim.slice(0,160)+' || '+(x.correction||x.what_you_did).slice(0,600)); }
W('verify.txt',L);
for(const a of r.research){ L=[]; L.push('=== '+a.key+' | '+a.lane.slice(0,300)); const t={}; for(const f of a.findings)t[f.favours]=(t[f.favours]||0)+1; L.push('findings '+a.findings.length+' favours '+JSON.stringify(t));
  L.push('BUILD RECS:\n  - '+a.recommendations_for_the_build.join('\n  - ')); L.push('TEST RECS:\n  - '+a.recommendations_for_the_test.join('\n  - '));
  L.push('OPEN:\n  - '+a.open_questions.join('\n  - ')); L.push('NOT COVERED:\n  - '+a.not_covered.join('\n  - '));
  for(const tb of (a.tables||[])){ L.push('TABLE '+tb.title); for(const row of tb.rows)L.push('  | '+row); }
  L.push('FINDINGS:'); for(const f of a.findings)L.push('  * ['+f.favours+'/'+f.confidence+(f.fetched?'':'/snippet')+'] '+f.claim+' :: '+f.detail.slice(0,700)+' ('+f.source.slice(0,120)+')');
  W('lane-'+a.key+'.txt',L); }
