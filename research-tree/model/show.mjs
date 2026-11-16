// prints a check.mjs JSON line readably: node check.mjs ID | node show.mjs
let s = ''; process.stdin.on('data', (d) => (s += d)).on('end', () => {
  for (const line of s.trim().split('\n')) { const r = JSON.parse(line);
    console.log(`${r.id}: ${r.states} states, ${r.transitions} transitions, ${r.seconds} s, ${r.complete ? 'complete' : 'BOUNDED ' + r.bounded_why}`);
    for (const [p, v] of Object.entries(r.props)) { console.log(`  ${v.holds === true ? 'HOLDS' : v.holds === false ? 'FAILS' : 'UNKNOWN'} ${p}`); if (v.trace && !process.argv.includes('--brief')) v.trace.forEach((l, i) => console.log(`      ${i + 1}. ${l}`)); } }
});
