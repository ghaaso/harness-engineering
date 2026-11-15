'use strict';
// G-5 re-score: graphify's own default answer text, reference files named as whole paths.
const fs = require('fs'); const path = require('path'); const L = require('./lib');
const refs = L.refs();
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/heldout_tasks.json'), 'utf8'));
const PATHCH = /[A-Za-z0-9_.\/@\-]/;
function named(text, p) {
  let i = text.indexOf(p);
  while (i >= 0) {
    const a = i === 0 ? '' : text[i - 1]; const b = text[i + p.length] || '';
    if (!(a && PATHCH.test(a)) && !(b && PATHCH.test(b))) return true;
    i = text.indexOf(p, i + 1);
  }
  return false;
}
const out = {};
for (const set of ['T1', 'T2', 'T3', 'T1x', 'T4']) {
  const recs = L.readGz(path.join(L.G, 'answers/heldout/native', 'query-text.' + set + '.jsonl.gz'));
  const nat = []; let pooledN = 0; let pooledD = 0; const toks = []; let trunc = 0; const nodeLines = []; const distinct = [];
  for (const r of recs) {
    const ref = refs.get(r.id); const files = ref.files.map((x) => x.path);
    const tokens = r.tokens ?? r.tok ?? null; if (tokens != null) toks.push(tokens);
    if (/TRUNCATED/.test(r.text)) trunc++;
    const nl = r.text.split('\n').filter((l) => l.startsWith('NODE ')); nodeLines.push(nl.length);
    distinct.push(new Set(nl.map((l) => (l.match(/src=(\S+)/) || [])[1]).filter(Boolean)).size);
    if (!files.length) continue;
    const n = files.filter((p) => named(r.text, p)).length; pooledN += n; pooledD += files.length;
    nat.push({ id: r.id, cluster: L.clusterOf(ref), nat: n / files.length, seedNamed: files.includes(ref.seed.path) });
  }
  const st = L.stats(L.clusterMeans(nat, 'nat'));
  const o = { tasks_scored: nat.length, native_recall: L.r4(st.mean), pooled: L.r4(pooledN / pooledD), median_tokens: toks.length ? L.median(toks) : null, min_tok: Math.min(...toks), max_tok: Math.max(...toks), truncated: trunc, of: recs.length, median_node_lines: L.median(nodeLines), median_distinct_files: L.median(distinct), seed_is_ref: nat.filter((x) => x.seedNamed).length };
  const ids = new Set(nat.map((x) => x.id));
  for (const arm of ['graphify', 'relational', 'search', 'floor-co', 'floor-dir']) {
    const ar = rows[arm + '/' + set].filter((x) => ids.has(x.id));
    const st2 = L.stats(L.clusterMeans(ar, 'fr2000'));
    // paired native - arm
    const natByC = L.clusterMeans(nat, 'nat'); const arByC = L.clusterMeans(ar, 'fr2000');
    const ks = [...natByC.keys()].sort(); const d = ks.map((k) => natByC.get(k) - arByC.get(k));
    o[arm] = { fr2000: L.r4(st2.mean), native_minus: L.r4(L.mean(d)), ci: L.boot(d).map(L.r4), clusters: ks.length };
  }
  out[set] = o;
}
fs.writeFileSync(path.join(__dirname, 'out/native.json'), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k, JSON.stringify(v));
const gn = JSON.parse(fs.readFileSync(path.join(L.G, 'grader/heldout/native_g.json'), 'utf8'));
console.log('GRADER', JSON.stringify(gn).slice(0, 2500));
