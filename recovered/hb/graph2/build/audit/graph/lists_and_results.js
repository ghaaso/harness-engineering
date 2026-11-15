'use strict';
// CHECKS 6 and 8 (bookkeeping part). Loads the three stage-1 lists through the harness (no logging),
// reports sizes, hashes, which section-6 factors each list moves, and the entries each graph arm
// added or dropped against the relational list. Then scans the graph arms' answer files and TQ files:
// every answer's split, the number of answers per configuration hash, and any held-out id.
//   node lists_and_results.js   (host or image; reads only)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const B = path.resolve(__dirname, '..', '..');
const H = require(path.join(B, 'arms/common/harness'));
const C = require(path.join(B, 'arms/common/config'));

const out = { lists: {}, diff: {}, answers: {}, tq: {} };
const L = {};
for (const arm of ['relational', 'ladybug', 'duckpgq']) {
  const l = H.loadArmList(arm, 1, false);
  L[arm] = l;
  const f = { hops: new Set(), traversal: new Set(), direction: new Set(), classes: new Set(), rank: new Set(), hub: new Set(), granularity: new Set(), form: new Set(), pad: new Set(), minConf: new Set(), native: [] };
  for (const { name, cfg } of l.list) {
    const tr = cfg.traversal; const rk = cfg.rank;
    f.traversal.add(tr.mode + (tr.variant ? '/' + tr.variant : ''));
    if (tr.mode === 'khop') f.hops.add(String(tr.hops));
    f.direction.add(cfg.direction); f.classes.add(cfg.classes.join('+'));
    f.rank.add(rk.mode === 'ppr' ? `ppr r${rk.restart} w${rk.cochange_w}${rk.variant ? ' ' + rk.variant : ''}` : rk.mode === 'hybrid' ? 'hybrid ' + rk.parts.map((p) => p.mode).join('+') : rk.mode);
    f.hub.add(cfg.hub.mode + (cfg.hub.k != null ? cfg.hub.k : '')); f.granularity.add(cfg.granularity); f.form.add(cfg.form); f.pad.add(cfg.pad); f.minConf.add(cfg.minConf);
    let ext = false; try { C.specOnly(cfg); } catch (e) { ext = true; }
    if (ext) f.native.push(name);
  }
  out.lists[arm] = { count: l.list.length, hash: l.hash, ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Array.isArray(v) ? v : [...v]])) };
}
const keyOf = (c) => C.configHash(c);
const rel = new Map(L.relational.list.map((x) => [keyOf(x.cfg), x.name]));
for (const arm of ['ladybug', 'duckpgq']) {
  const mine = new Map(L[arm].list.map((x) => [keyOf(x.cfg), x.name]));
  out.diff[arm] = { dropped_from_relational: [...rel].filter(([h]) => !mine.has(h)).map(([, n]) => n), added: [...mine].filter(([h]) => !rel.has(h)).map(([, n]) => n) };
}
// answers
const scan = (dir) => {
  const r = { files: 0, answers: 0, splits: {}, sets: {}, per_hash: {}, heldout_ids: 0 };
  if (!fs.existsSync(dir)) return 'missing ' + dir;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl.gz'))) {
    r.files++;
    const lines = zlib.gunzipSync(fs.readFileSync(path.join(dir, f))).toString('utf8').split('\n').filter(Boolean);
    for (const s of lines) { const a = JSON.parse(s); r.answers++; r.splits[a.split] = (r.splits[a.split] || 0) + 1; r.sets[a.set] = (r.sets[a.set] || 0) + 1; r.per_hash[a.config_hash] = (r.per_hash[a.config_hash] || 0) + 1; if (a.split !== 'tune') r.heldout_ids++; }
  }
  const counts = Object.values(r.per_hash); r.hashes = counts.length; r.min_per_hash = Math.min(...counts); r.max_per_hash = Math.max(...counts); delete r.per_hash;
  return r;
};
out.answers.ladybug = scan(path.join(B, 'results/ladybug/stage1/ladybug/tune'));
out.answers.duckpgq = scan(path.join(B, 'results/duckpgq/tune'));
const tasks = new Map(fs.readFileSync(path.join(B, 'tasks/tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).map((q) => [q.id, q.split]));
for (const f of fs.readdirSync(path.join(B, 'results/tq'))) {
  const rows = fs.readFileSync(path.join(B, 'results/tq', f), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  out.tq[f] = { rows: rows.length, splits: [...new Set(rows.map((x) => tasks.get(x.id)))], errors: rows.filter((x) => x.error).length };
}
// do the graph arms' TQ answers equal the relational ones?
const ans = (f) => { const p = path.join(B, 'results/tq', f); return fs.existsSync(p) ? new Map(fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(JSON.parse).map((x) => [x.id, JSON.stringify(x.answer)])) : null; };
const R = ans('relational.tune.answers.jsonl');
for (const arm of ['ladybug', 'duckpgq']) { const X = ans(arm + '.tune.answers.jsonl'); out.tq['same_as_relational_' + arm] = R && X ? [...R].filter(([id, a]) => X.get(id) === a).length + ' of ' + R.size : 'missing'; }
fs.writeFileSync(path.join(__dirname, 'results', 'lists_and_results.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 9000));
