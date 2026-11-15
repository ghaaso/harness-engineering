'use strict';
// Check 5 (TUNE only): score the search arm, its floors and a hand-made search on five TUNE T1 tasks
// against the sealed TUNE references, with BOTH scorers (common/score.js "locate" and "content" rules,
// and search/score.js). Held-out reference lines are never parsed: lines are filtered by the TUNE id
// list before JSON.parse. The TUNE labels are written to build/tmp only for the search scorer's CLI
// and deleted at the end.  node score_search.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const B = path.resolve(__dirname, '..', '..');
const SEARCH = path.join(B, 'arms', 'search');
const { scoreAnswer } = require(path.join(B, 'arms', 'common', 'score.js'));
const { loadFacts } = require(path.join(B, 'arms', 'common', 'facts.js'));
const { pack } = require(path.join(B, 'arms', 'common', 'packer.js'));
const { Ctx } = require(path.join(SEARCH, 'engine.js'));
const A = require(path.join(SEARCH, 'arm.js'));

const tasks = fs.readFileSync(path.join(B, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const tuneT1 = new Map(tasks.filter((t) => t.set === 'T1' && t.split === 'tune').map((t) => [t.id, t]));
const refs = new Map();
for (const line of fs.readFileSync(path.join(B, 'sealed', 'references.jsonl'), 'utf8').split('\n')) {
  const m = line.match(/"id": ?"([^"]+)"/); if (!m || !tuneT1.has(m[1])) continue;
  const r = JSON.parse(line); if (r.split !== 'tune' || r.set !== 'T1') continue;
  refs.set(r.id, r);
}
const common = new Map([...refs].map(([id, r]) => [id, { group: r.commit, files: [...new Set(r.files.map((f) => f.path))], defs: r.defs.map((d) => ({ path: d.path, start: d.start, end: d.end, name: d.name })) }]));
const tmp = path.join(B, 'tmp', 'aud-score-' + process.pid); fs.mkdirSync(path.join(tmp, 'out'), { recursive: true });
const labels = path.join(tmp, 'labels.jsonl');
fs.writeFileSync(labels, [...refs.values()].map((r) => JSON.stringify({ id: r.id, commit_group: r.commit, ref_files: [...new Set(r.files.map((f) => f.path))], ref_defs: r.defs.map((d) => d.path + '::' + d.name) })).join('\n') + '\n');

const mean = (a) => { const b = a.filter((x) => x != null); return b.length ? b.reduce((s, x) => s + x, 0) / b.length : null; };
function commonScore(recs, rule) {
  const g = new Map();
  for (const a of recs) { const r = common.get(a.id); if (!r || !(r.files.length + r.defs.length)) continue; const s = scoreAnswer(a, r, [2000, 4000, 8000, 16000], rule); if (!g.has(r.group)) g.set(r.group, []); g.get(r.group).push(s); }
  const by = (f) => mean([...g.values()].map((xs) => mean(xs.map(f))));
  const o = { commits: g.size };
  for (const b of [2000, 4000, 8000, 16000]) o['R' + b / 1000 + 'k'] = +by((s) => s.by_budget[b].recall).toFixed(4);
  o.tokens8k = +by((s) => s.by_budget[8000].tokens).toFixed(0); o.mrr = +by((s) => s.mrr).toFixed(4);
  return o;
}
const readJsonl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((r) => r.set === 'T1' && r.split === 'tune');
const searchScore = (dir) => JSON.parse((execFileSync('node', [path.join(SEARCH, 'score.js'), labels, dir, '--set', 'T1', '--json', path.join(tmp, 'ss.json')], { maxBuffer: 1 << 28 }), fs.readFileSync(path.join(tmp, 'ss.json'), 'utf8')));
const CFGS = ['rounds=1_names-only', 'base', 'prox=1.5', 'nofill', 'rounds=1_names-only_nofill', 'bm25', 'form=paths', 'form=snippet', 'gran=symbol_form=snippet', 'floor_DIR_form=signature', 'floor_CO_form=signature', 'floor_DIR_form=paths'];
const out = { refs_tune_T1: refs.size, full: {}, manual: {} };
// share of reference defs a file-granularity answer can never show (defs inside the seed's own file)
{ let n = 0; let s = 0; for (const r of refs.values()) for (const d of r.defs) { n++; if (d.same_file_as_seed) s++; } out.defs_in_seed_file_share = +(s / n).toFixed(4); out.defs_total = n; }
for (const c of CFGS) {
  const recs = readJsonl(path.join(SEARCH, 'out', c + '.jsonl'));
  out.full[c] = { locate: commonScore(recs, 'locate'), content: commonScore(recs, 'content') };
  fs.writeFileSync(path.join(tmp, 'out', c + '.jsonl'), recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
for (const row of searchScore(path.join(tmp, 'out'))) if (out.full[row.config.replace(/ /g, '_')]) out.full[row.config.replace(/ /g, '_')].search_scorer = { R2k: +row.R2000.toFixed(4), R4k: +row.R4000.toFixed(4), R8k: +row.R8000.toFixed(4), R16k: +row.R16000.toFixed(4), SE8k: +row.SE_R8000.toFixed(4) };
// the hand search on five tasks, packed by the shared packer (file granularity, signature form)
const manual = JSON.parse(fs.readFileSync(path.join(__dirname, 'manual_lists.json'), 'utf8'));
const ids = Object.keys(manual).filter((k) => !k.startsWith('_'));
const frozen = readJsonl(path.join(SEARCH, 'out', 'rounds=1_names-only.jsonl')).filter((r) => ids.includes(r.id));
const nofill = readJsonl(path.join(SEARCH, 'out', 'rounds=1_names-only_nofill.jsonl')).filter((r) => ids.includes(r.id));
const mk = (t, list, tag) => {
  const G = loadFacts(t.parent); const fb = new Map(G.nodes.filter((n) => n.kind === 'file').map((n) => [n.path, n.i]));
  const units = []; const seen = new Set(); const missing = [];
  for (const p of list) { const u = fb.get(p); if (!u) { missing.push(p); continue; } if (seen.has(u) || p === t.seed.path) continue; seen.add(u); units.push({ u, hop: 1, score: 1, via: 'grep' }); }
  const pk = pack(G, units, 'signature', 'file');
  return { id: t.id, set: 'T1', split: 'tune', parent: t.parent, config: tag, form: 'signature', granularity: 'file', items: pk.items.map((it) => ({ path: it.path, symbol: it.symbol, ls: it.ls, le: it.le, tok: it.tok, shown: it.shown })), budgets: pk.budgets, n_units: pk.n_units, missing };
};
const man = []; const manFill = [];
for (const id of ids) {
  const t = tuneT1.get(id); man.push(mk(t, manual[id], 'manual'));
  const ctx = new Ctx(t.parent); manFill.push(mk(t, [...manual[id], ...A.dirOrder(ctx, t.seed.path)], 'manual+DIR fill'));
}
const md = path.join(tmp, 'man'); fs.mkdirSync(md, { recursive: true });
const sets = { search_frozen: frozen, search_frozen_nofill: nofill, manual: man, manual_dirfill: manFill };
for (const [k, recs] of Object.entries(sets)) { fs.writeFileSync(path.join(md, k + '.jsonl'), recs.map((r) => JSON.stringify({ ...r, config: k })).join('\n') + '\n'); out.manual[k] = { locate: commonScore(recs, 'locate'), content: commonScore(recs, 'content') }; }
for (const row of searchScore(md)) out.manual[row.config].search_scorer = { R2k: +row.R2000.toFixed(4), R4k: +row.R4000.toFixed(4), R8k: +row.R8000.toFixed(4), R16k: +row.R16000.toFixed(4) };
out.manual_per_task = ids.map((id) => {
  const r = common.get(id); const per = {};
  for (const [k, recs] of Object.entries(sets)) { const a = recs.find((x) => x.id === id); const s = scoreAnswer(a, r, [2000, 4000, 8000], 'locate'); per[k] = { R2k: +s.by_budget[2000].recall.toFixed(3), R8k: +s.by_budget[8000].recall.toFixed(3), mrr: +s.mrr.toFixed(3), tok8k: s.by_budget[8000].tokens }; }
  return { id, ref_files: r.files.length, ref_defs: r.defs.length, missing_from_graph: man.find((x) => x.id === id).missing, ...per };
});
fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync(path.join(__dirname, 'score_search.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
