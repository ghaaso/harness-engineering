'use strict';
// Classifies packed-answer differences between two arms of a cross-check run whose ranked lists passed the
// SPEC 9 equivalence: which fields differ, and whether the differing items have equal scores (a tie the
// specification leaves unordered) or equal hops with a different, valid explanation (via).
//   node arms/duckpgq/dev/answer_diff.js <crosscheck out dir> [armA] [armB]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const dir = process.argv[2]; const A = process.argv[3] || 'duckpgq'; const B = process.argv[4] || 'reference';
const read = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString().split('\n').filter(Boolean).map(JSON.parse);
const names = {}; try { const c = require(path.resolve(dir, 'sweep', 'configs.json')); for (const l of Object.values(c.lists)) for (const x of l.configs) names[x.hash] = x.name; } catch (e) { /* none */ }
const cls = {}; const byCfg = {}; let n = 0; let differ = 0;
for (const f of fs.readdirSync(path.join(dir, A, 'tune'))) {
  const xa = read(path.join(dir, A, 'tune', f)); const xb = new Map(read(path.join(dir, B, 'tune', f)).map((x) => [x.id, x]));
  for (const a of xa) {
    const b = xb.get(a.id); n++;
    const strip = (q) => JSON.stringify({ ...q, arm: null, ms: null, engine_ms: null });
    if (strip(a) === strip(b)) continue;
    differ++;
    const fields = Object.keys(a).filter((k) => !['arm', 'ms', 'engine_ms'].includes(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    let why = 'other:' + fields.join(',');
    if (fields.every((k) => ['items', 'ranked_sha'].includes(k))) {
      const ia = a.items; const ib = b.items; const kinds = new Set();
      if (ia.length !== ib.length) kinds.add('item-count');
      const key = (x) => x.path + '|' + x.symbol;
      const sa = new Set(ia.map(key)); const sb = new Set(ib.map(key));
      if ([...sa].some((k) => !sb.has(k))) kinds.add('different-units(tie-cut)');
      for (let i = 0; i < Math.min(ia.length, ib.length); i++) {
        if (JSON.stringify(ia[i]) === JSON.stringify(ib[i])) continue;
        if (key(ia[i]) !== key(ib[i])) kinds.add(Math.abs((ia[i].score ?? 0) - (ib[i].score ?? 0)) <= 1e-9 && ia[i].hop === ib[i].hop ? 'order-within-tie' : 'order-other');
        else { const f2 = Object.keys(ia[i]).filter((k) => JSON.stringify(ia[i][k]) !== JSON.stringify(ib[i][k])); kinds.add('same-unit:' + f2.join(',')); }
      }
      why = [...kinds].sort().join('+') || 'ranked_sha-only';
    }
    cls[why] = (cls[why] || 0) + 1;
    const cn = names[a.config_hash] || a.config_hash; byCfg[cn] = (byCfg[cn] || 0) + 1;
  }
}
console.log(JSON.stringify({ answers: n, differ, by_reason: cls, by_config: byCfg }, null, 1));
