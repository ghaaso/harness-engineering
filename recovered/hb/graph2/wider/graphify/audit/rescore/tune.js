'use strict';
// Independent re-score of the 10 graphify tuning configurations and the selection rule (addendum 4 item 1).
// Usage: node tune.js [extra answer dir with <hash>.T1.jsonl.gz files and a configs map json] ...
const fs = require('fs'); const path = require('path'); const L = require('./lib');
const refs = L.refs();
const dir = path.join(L.G, 'answers/tune');
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'configs.json'), 'utf8'));
const list = Array.isArray(cfg) ? cfg : (cfg.configs || Object.entries(cfg).map(([name, v]) => ({ name, hash: typeof v === 'string' ? v : v.hash })));
const extra = process.argv.slice(2);
const entries = list.map((c) => ({ name: c.name, hash: c.hash || c.config_hash, dir }));
for (const e of extra) { const m = JSON.parse(fs.readFileSync(e, 'utf8')); for (const c of m) entries.push(c); }
const heldIds = new Set([...refs.values()].filter((r) => r.split !== 'tune').map((r) => r.id));
const res = []; const problems = [];
for (const e of entries) {
  const o = { name: e.name, hash: e.hash };
  for (const set of ['T1', 'T1x', 'T2']) {
    const f = path.join(e.dir, `${e.hash}.${set}.jsonl.gz`);
    if (!fs.existsSync(f)) { o[set] = null; continue; }
    const rows = [];
    for (const rec of L.readGz(f)) {
      if (heldIds.has(rec.id)) problems.push('HELD-OUT id in tune file ' + f + ' ' + rec.id);
      const ref = refs.get(rec.id); if (!ref || ref.split !== 'tune') { problems.push('no tune ref ' + rec.id); continue; }
      rows.push(L.scoreTask(rec, ref));
    }
    const st = L.stats(L.clusterMeans(rows, 'r8000'));
    o[set] = { tasks: rows.length, clusters: st.clusters, primary: L.r4(st.mean), se: L.r4(st.se), r2000: L.r4(L.stats(L.clusterMeans(rows, 'r2000')).mean), empty: rows.filter((r) => r.empty).length, med_tok: L.median(rows.map((r) => r.tok8000)) };
    if (set === 'T1') o._rows = rows;
  }
  res.push(o);
}
const sel = JSON.parse(fs.readFileSync(path.join(L.G, 'grader/selection.json'), 'utf8'));
const base = res.slice(0, list.length);
const best = base.reduce((a, b) => (b.T1.primary > a.T1.primary ? b : a));
console.log('problems', problems.length, problems.slice(0, 5));
for (const o of res) console.log(o.name.padEnd(34), o.hash, 'T1', o.T1 && o.T1.primary, '+-', o.T1 && o.T1.se, 'T1x', o.T1x && o.T1x.primary, 'T2', o.T2 && o.T2.primary, 'empty', o.T1 && o.T1.empty, 'r2k', o.T1 && o.T1.r2000);
console.log('best', best.name, best.T1.primary, 'threshold', L.r4(best.T1.primary - best.T1.se));
// paired differences of every extra entry against the frozen config on T1 tune
const frozen = res.find((o) => o.hash === '66367cd303fdd75b');
for (const o of res) if (o !== frozen && o._rows) { const p = L.paired(o._rows, frozen._rows, 'r8000'); o.vs_frozen = { diff: L.r4(p.diff), ci: p.ci.map(L.r4), higher: p.higher, lower: p.lower }; console.log('  vs frozen', o.name, JSON.stringify(o.vs_frozen)); }
for (const o of res) delete o._rows;
fs.writeFileSync(path.join(__dirname, 'out', extra.length ? 'tune_with_variants.json' : 'tune.json'), JSON.stringify({ problems, res, grader_selection_file: sel }, null, 1));
