const fs=require('fs');const F=process.argv[2];let s=fs.readFileSync(F,'utf8');
function r(a,b){if(!s.includes(a))throw new Error('missing: '+a.slice(0,80));s=s.split(a).join(b);}
// MF8 frequency words
r("The failed call, often a long command, is already spent,","The failed call, which can be a long command, is already spent,");
r("Lessons are written in the solver's words for how things work, often in another part of the code.","Lessons are written in the solver's words for how things work, and can sit in another part of the code.");
// break titles quoted from all-breaks.json: drop sample-frequency words (MF8)
r("source = 'all-breaks.json #' + src + ' (' + br.lane + ', \"' + br.title + '\"), evidence';","source = 'all-breaks.json #' + src + ' (' + br.lane + ', \"' + noFreq(br.title) + '\"), evidence';");
r("breaks: it.b.map((i) => ({ index: i, family: breaks[i].lane, title: breaks[i].title })),","breaks: it.b.map((i) => ({ index: i, family: breaks[i].lane, title: noFreq(breaks[i].title) })),");
r("// ---------- works list ----------","// Break titles are the walkers' own. A frequency word in a title rests on the chosen sample,\n// which cannot carry it, so it is dropped here (map refuter pass, MF8).\nconst noFreq = (t) => t.replace(/, often by agents\\b/g, '').replace(/\\boften /g, '');\n\n// ---------- works list ----------");
// MF6: limitations the model cannot show, or shows only in part
r("c: [], p: ['g_tests_visible', 'c_check_share', 'c_screen'] });","c: [], p: ['g_tests_visible', 'c_screen'],\n  sh: ['partly', 'The model shows the slow outside check only through the tests catching less. It cannot show a stored check that passes here and fails outside: its mechanical check never passes a wrong entry.'] });");
r("c: [], p: ['c_check_share', 'g_tests_latent', 'e_right'] });","c: [], p: ['g_tests_latent', 'e_right'],\n  sh: ['partly', 'The model shows a wrong solve passing the tests and being stored. It cannot show the stored check passing the wrong entry later: its mechanical check accepts every good entry and rejects every wrong one.'] });");
r("c: [], p: ['c_check_share'] });\n\n// Step 8","c: [], p: [],\n  sh: ['no', \"Its mechanism is a check that passes a wrong entry. The model's mechanical check never does that, so raising the share of entries with a check can only help the library.\"] });\n\n// Step 8");
r("c: [], p: [],\n  note: 'Acts on how failures and misses are counted, not on a branch of the model.' });","c: [], p: [],\n  note: 'Acts on how failures and misses are counted, not on a branch of the model.',\n  sh: ['no', 'It acts on how failures and misses are counted, not on a branch of the model.'] });");
r("c: [], p: ['c_write', 'fix_on_found'] });","c: [], p: [],\n  sh: ['no', 'Repair has no cost of its own in the model: a repaired escape costs the same as one left bad. So upkeep has no term, and the cost of writing an entry does not stand in for it.'] });");
r("b: [], k: [], a: [20], ex: [], c: [], p: [] });","b: [], k: [], a: [20], ex: [], c: [], p: [],\n  sh: ['no', 'Privacy is not a chance or a cost in the model.'] });");
fs.writeFileSync(F,s);
