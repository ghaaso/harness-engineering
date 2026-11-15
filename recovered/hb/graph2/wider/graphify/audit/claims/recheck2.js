'use strict';
// Refuter 2 (claims), second pass: seeds matched by id only (addendum 6 item 12), excluding the commits
// that also have cross-runtime-only reference files is not possible here, so the T1 tasks are split by
// whether graphify's answer list reached at least one reference file anywhere (reach), and the
// tuning-split table of graphify's 10 configurations is printed.
const fs = require('fs'); const zlib = require('zlib'); const path = require('path');
const ROOT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2';
const B = ROOT + '/build'; const G = ROOT + '/wider/graphify';
const readGz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function boot(d, n = 10000, seed = 20261112) { const r = mulberry32(seed); const k = d.length; const m = new Float64Array(n); for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < k; j++) s += d[Math.floor(r() * k)]; m[i] = s / k; } m.sort(); return [m[Math.floor(0.025 * n)], m[Math.ceil(0.975 * n) - 1]]; }
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length; const r4 = (x) => Math.round(x * 10000) / 10000;
const per = readGz(G + '/grader/heldout/tasks.jsonl.gz');
const val = {}; for (const r of per) { ((val[r.arm] = val[r.arm] || {})[r.set] = val[r.arm][r.set] || {})[r.id] = r; }
const gAns = new Map(readGz(G + '/answers/heldout/66367cd303fdd75b.T1.jsonl.gz').map((a) => [a.id, a]));
function paired(a, b, set, metric, filt) {
  const agg = (arm) => { const by = new Map(); for (const [id, r] of Object.entries(val[arm][set])) { if (filt && !filt(id)) continue; if (r[metric] == null) continue; if (!by.has(r.cluster)) by.set(r.cluster, []); by.get(r.cluster).push(r[metric]); } return new Map([...by].map(([k, xs]) => [k, mean(xs)])); };
  const va = agg(a), vb = agg(b); const keys = [...va.keys()].filter((k) => vb.has(k)); const d = keys.map((k) => va.get(k) - vb.get(k));
  return { tasks: Object.keys(val[a][set]).filter((id) => !filt || filt(id)).length, commits: keys.length, graphify: r4(mean(keys.map((k) => va.get(k)))), other: r4(mean(keys.map((k) => vb.get(k)))), diff: r4(mean(d)), ci95: boot(d).map(r4) };
}
const out = { id_only: {}, tune: null };
const idOnly = (id) => gAns.get(id).seed_match === 'id';
for (const [cid, arm] of Object.entries({ 'G-1': 'relational', 'G-2': 'search', 'G-3': 'floor-co', 'G-4': 'floor-dir' })) out.id_only[cid] = paired('graphify', arm, 'T1', 'primary', idOnly);
// tuning table
const sc = JSON.parse(fs.readFileSync(G + '/grader/scores.json', 'utf8'));
out.tune = sc;
fs.writeFileSync(path.join(__dirname, 'recheck2.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.id_only));
const rows = Array.isArray(sc) ? sc : (sc.rows || sc.configs || sc.table || Object.values(sc));
console.log(JSON.stringify(rows).slice(0, 3000));
