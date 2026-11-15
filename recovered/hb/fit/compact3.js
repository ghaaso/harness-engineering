const fs = require('fs');
const base = process.argv[2];
const r = JSON.parse(fs.readFileSync(base + '/out/review.json', 'utf8'));
const cut = (s, n) => (s && s.length > n ? s.slice(0, n) + '…' : s || '');
const adjV = r.adj.filter(Boolean).flatMap((x) => x.verdicts);
const t = {}; for (const v of adjV) t[v.verdict] = (t[v.verdict] || 0) + 1;
const p = {}; for (const v of adjV) p[v.clinic_practice] = (p[v.clinic_practice] || 0) + 1;
console.log('adjudicated', adjV.length, JSON.stringify(t), JSON.stringify(p));
for (const x of r.adj) console.log('LANE ' + x.items_read + ' :: ' + cut(x.notes, 1100));
console.log('--- promoted ---');
for (const v of adjV.filter((v) => v.verdict.startsWith('promote'))) console.log(v.id + ' ' + v.verdict + ' ' + v.bottlenecks.join(',') + ' | testbed ' + v.clinic_practice + ' ' + v.clinic_evidence + ' | ' + v.added_cost + (v.needs_owner_decision ? ' | OWNER' : '') + String.fromCharCode(10) + '   idea: ' + v.idea_for_v2 + String.fromCharCode(10) + '   why: ' + v.why);
console.log('--- merge targets ---');
const mt = {};
for (const v of adjV.filter((v) => v.verdict === 'merge')) { (mt[v.merges_into] = mt[v.merges_into] || []).push(v.id + '[' + v.clinic_practice + ']'); }
for (const k of Object.keys(mt).sort()) console.log(cut(k, 90) + ' <= ' + mt[k].join(' '));
