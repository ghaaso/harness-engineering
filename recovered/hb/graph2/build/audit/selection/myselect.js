'use strict';
// Independent selection (audit-selection lane): protocol addendum 2 item 9 and addendum 3 item 10,
// applied to the independent score tables of myscore.js (not to the grader's tables).
// Complexity is written here from the addendum text, with switches for the points the text leaves
// open, so the sensitivity of each choice can be seen:
//   DEPTH=raw       "more than 3 hops" read from traversal.hops only (default: effective cap, i.e. the
//                   budget sum or the sum of metapath step maxima when smaller)
//   SEEDIMP=0       the search arm's seedImports is NOT import following (default: it is)
//   CO=0            the search arm's `co` field adds no ranking part (default: +1 part)
//   TIE=t80         tie measure after complexity = median tokens to 80 % recall instead of median tokens
// node myselect.js <build> <mydir>
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const BUILD = path.resolve(process.argv[2]); const MY = path.resolve(process.argv[3]);
const V = { DEPTH: process.env.DEPTH || 'cap', SEEDIMP: process.env.SEEDIMP !== '0', CO: process.env.CO !== '0' };
const tables = JSON.parse(fs.readFileSync(path.join(MY, 'my_tables.json'), 'utf8'));
const isX = (m) => typeof m === 'string' && m.startsWith('x_');

function rankParts(r) {
  if (!r) return 0;
  if (r.mode === 'hybrid') return r.parts.reduce((s, p) => s + rankParts(p), 0);
  if (r.mode === 'x_ppr_lift' || (isX(r.mode) && r.ppr)) return 2; // PPR fused with a second signal
  return 1;
}
function depthOver3(t) {
  if (V.DEPTH === 'raw') return t.hops == null || t.hops > 3;
  let cap = t.hops == null ? Infinity : t.hops;
  if (t.mode === 'budget') cap = Math.min(cap, Object.values(t.budgets).reduce((a, b) => a + b, 0));
  if (t.mode === 'metapath') cap = Math.min(cap, t.steps.reduce((a, s) => a + (s.max == null ? 1 : s.max), 0));
  return cap > 3;
}
function cx(c) {
  let n = 0;
  if (c.traversal) {
    n += rankParts(c.rank);
    if (c.traversal.mode === 'budget' || c.traversal.mode === 'metapath') n++;
    if (depthOver3(c.traversal)) n++;
    if (c.hub && c.hub.mode !== 'none') n++;
    const parts = c.rank.mode === 'hybrid' ? c.rank.parts : [c.rank];
    if (isX(c.traversal.mode) || c.traversal.variant || c.rank.variant || parts.some((p) => isX(p.mode) || p.variant)) n++;
  } else if (c.search) {
    const s = c.search;
    n += 1 + (V.CO && s.co ? 1 : 0);
    n += Math.max(0, (s.rounds || 1) - 1);
    if (s.routes) n++;
    if (s.bm25 || s.bm25only) n++;
    if (s.followImports || (V.SEEDIMP && s.seedImports)) n++;
  }
  if (c.pad && c.pad !== 'none') n++;
  if (c.granularity === 'symbol') n++;
  return n;
}

const out = { variant: V, arms: {} };
for (const arm of ['relational', 'search', 'ladybug', 'duckpgq', 'floor-dir', 'floor-co']) {
  const rows = tables[arm].filter((r) => r.set === 'T1' && !r.missing);
  const counts = { all: rows.length, stage1: rows.filter((r) => r.stage === 1).length, stage2: rows.filter((r) => r.stage === 2).length, floor: rows.filter((r) => r.stage === 'floor').length };
  const cand = rows.filter((r) => r.primary != null).map((r) => ({ ...r, cx: cx(r.cfg) }));
  cand.sort((a, b) => b.primary - a.primary);
  const best = cand[0]; const thr = best.primary - best.se;
  const elig = cand.filter((r) => r.primary >= thr);
  elig.sort((a, b) => a.cx - b.cx || a.tok8000_median - b.tok8000_median || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const ch = elig[0];
  const tied = elig.filter((r) => r.cx === ch.cx && r.tok8000_median === ch.tok8000_median);
  out.arms[arm] = { counts, candidates: cand.length, best: { name: best.name, primary: best.primary, se: best.se, cx: best.cx }, threshold: thr, eligible: elig.length,
    chosen: { name: ch.name, hash: ch.hash, primary: ch.primary, cx: ch.cx, tok: ch.tok8000_median, stage: ch.stage },
    tied_at_chosen: tied.map((r) => ({ name: r.name, primary: +r.primary.toFixed(4), r2000: +r.r2000.toFixed(4), stage: r.stage })),
    best_of_tied: tied.slice().sort((a, b) => b.primary - a.primary)[0].name };
}
// frozen records: the file's config must hash to its name and equal the chosen configuration
const canon = (v) => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v === undefined ? null : v);
const fz = {};
const dir = path.join(BUILD, 'results/frozen');
for (const f of fs.readdirSync(dir).filter((x) => /^[0-9a-f]{16}\.json$/.test(x))) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  fz[r.hash] = { file: f, arm: r.arm, hash_ok: crypto.createHash('sha256').update(canon(r.config)).digest('hex').slice(0, 16) === r.hash && f === r.hash + '.json' };
}
for (const [arm, a] of Object.entries(out.arms)) {
  const rec = fz[a.chosen.hash];
  const row = tables[arm].find((r) => r.hash === a.chosen.hash);
  a.frozen = rec ? { file: rec.file, record_arm: rec.arm, record_names_this_arm: rec.arm === arm, hash_recomputed_ok: rec.hash_ok,
    config_equal: rec && canon(JSON.parse(fs.readFileSync(path.join(dir, rec.file), 'utf8')).config) === canon(row.cfg) } : null;
}
console.log(JSON.stringify(out, null, 1));
