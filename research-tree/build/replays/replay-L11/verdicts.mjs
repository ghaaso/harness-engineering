// verdicts.mjs: list every verifier helper (review/refute/check) of CL, FF, H, RUN with the head of its report, for reading.
import fs from 'node:fs';
const L = fs.readFileSync('claims.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const V = /(refute|review|verify|re-?check|audit|judge|critic|skeptic|self-check)/i;
const rows = L.filter(c => V.test(c.desc) && c.finished !== false && !/hit your (session|usage|weekly) limit/i.test(c.final));
rows.sort((a, b) => (a.proj + a.start).localeCompare(b.proj + b.start));
fs.writeFileSync('verifiers.jsonl', rows.map(r => JSON.stringify({ proj: r.proj, session: r.session, id: r.id, start: r.start, desc: r.desc, head: r.final.slice(0, 500) })).join('\n') + '\n');
const n = {}; for (const r of rows) n[r.proj] = (n[r.proj] || 0) + 1;
console.log(JSON.stringify(n));
for (const r of rows) if (r.proj === process.argv[2]) console.log(`${r.id.slice(0,6)} ${r.start.slice(5,10)} ${r.desc.slice(0,48)} || ${r.final.slice(0, +process.argv[3] || 160).replace(/\s+/g, ' ')}`);
