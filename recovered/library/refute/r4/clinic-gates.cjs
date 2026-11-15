// R4 refuter: from the clinic testbed's slice table (docs/tasks/clinic-build/task.md on main,
// copied read-only to clinic-task.md), take each slice's lead tier and the FIRST review round's
// P1/P2 counts, then tally by tier. Confounded by routing: Opus was given the money/posting slices.
const fs = require('fs');
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n').slice(9, 35);
const rows = [];
for (const l of lines) {
  const c = l.split('|').map((s) => s.trim());
  if (c.length < 6 || !c[1] || c[1] === '---') continue;
  const name = c[1].slice(0, 50), tier = c[c.length - 3], gate = c[c.length - 2];
  let t = /human/i.test(tier) ? 'human' : /Fable orchestrating/i.test(tier) ? 'mixed' : /^Sonnet.*Opus, high/i.test(tier) ? 'mixed' : /^Sonnet/i.test(tier) ? 'Sonnet' : /^Opus/i.test(tier) ? 'Opus' : 'other';
  const opusReview = /Opus review|Opus refute|two reviewers|refute-review/i.test(tier + ' ' + gate) || t === 'Opus';
  // first round's counts: the first "N P1" / "no P1" and "N P2" in the gate text
  const firstP1 = gate.match(/(\d+|no) P1/);
  const firstP2 = gate.match(/(\d+) P2/);
  const p1 = firstP1 ? (firstP1[1] === 'no' ? 0 : +firstP1[1]) : null;
  const p2 = firstP2 ? +firstP2[1] : null;
  const rounds = /three rounds|round 3/i.test(gate) ? 3 : /round 2|two rounds/i.test(gate) ? 2 : /one round|one independent|root read the diff|root gate/i.test(gate) ? 1 : null;
  rows.push({ name, t, opusReview, p1, p2, rounds });
}
const by = {};
for (const r of rows) {
  const k = r.t;
  by[k] = by[k] || { slices: 0, reviewedWithCounts: 0, withP1: 0, p1: 0, p2: 0, rounds: [] };
  by[k].slices++;
  if (r.p1 !== null) { by[k].reviewedWithCounts++; by[k].p1 += r.p1; if (r.p1 > 0) by[k].withP1++; }
  if (r.p2 !== null) by[k].p2 += r.p2;
  if (r.rounds) by[k].rounds.push(r.rounds);
}
for (const r of rows) console.log(r.t.padEnd(7), String(r.p1).padEnd(5), String(r.p2).padEnd(5), String(r.rounds).padEnd(5), r.name);
console.log(JSON.stringify(by, null, 1));
