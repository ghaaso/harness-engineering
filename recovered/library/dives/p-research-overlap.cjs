// Proponent dive: how much of today's literature gathering (F4, F5, F6) was
// already in the owner's earlier research record (KS sweep lanes, KS design,
// harness docs and evidence). Measures research repetition by arXiv id and by URL host+path.
// Read-only. argv: factsDir, then one or more roots to scan for prior research.
const fs = require('fs');
const path = require('path');
const [factsDir, ...roots] = process.argv.slice(2);
const AX = /\b(\d{4}\.\d{4,5})(v\d+)?\b/g;
const ids = (t) => new Set([...t.matchAll(AX)].map((m) => m[1]).filter((x) => { const yy = +x.slice(0, 2), mm = +x.slice(2, 4); return yy >= 20 && yy <= 26 && mm >= 1 && mm <= 12; }));
const today = {};
for (const f of ['F4-lit-positive.md', 'F5-lit-negative.md', 'F6-lit-tiers-baselines.md']) {
  today[f] = ids(fs.readFileSync(path.join(factsDir, f), 'utf8'));
}
const prior = new Map(); // id -> first file seen
const walk = (d) => {
  let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|\.git$/.test(e.name)) walk(p); continue; }
    if (!/\.(md|json|txt|jsonl)$/i.test(e.name)) continue;
    let t; try { t = fs.readFileSync(p, 'utf8'); } catch { continue; }
    if (t.length > 20e6) continue;
    for (const id of ids(t)) if (!prior.has(id)) prior.set(id, p);
  }
};
for (const r of roots) walk(r);
const all = new Set(Object.values(today).flatMap((s) => [...s]));
const res = { priorDistinctIds: prior.size, perSheet: {}, union: {} };
for (const [f, s] of Object.entries(today)) {
  const hit = [...s].filter((x) => prior.has(x));
  res.perSheet[f] = { ids: s.size, alreadyHeld: hit.length, share: +(hit.length / s.size).toFixed(2), held: hit };
}
const uh = [...all].filter((x) => prior.has(x));
res.union = { ids: all.size, alreadyHeld: uh.length, share: +(uh.length / all.size).toFixed(2), notHeld: [...all].filter((x) => !prior.has(x)) };
console.log(JSON.stringify(res, null, 1));
