'use strict';
// Preflight check 3: the amended selection rule (addendum 4 item 1) recomputed from an independent score
// table (audit/selection/myscore.js re-run into <mydir>, which does not use score.js).
// Complexity: addendum 3 item 10, the earlier audit's reading (myselect.js; its open-reading switches
// were shown not to change the choice). Rule: best = highest T1 TUNE primary; eligible = primary >=
// best - se (se over commits, n-1); choose lowest complexity, then HIGHER primary, then lower median
// tokens at 8,000, then name. Also derives S1 (old tie order: complexity, median tokens, name) and S2
// (highest primary regardless of complexity), and compares all three to results/frozen/<arm>/.
// usage: node myselect2.js <build> <mydir> <out.json>
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const BUILD = path.resolve(process.argv[2]); const MY = path.resolve(process.argv[3]);
const tables = JSON.parse(fs.readFileSync(path.join(MY, 'my_tables.json'), 'utf8'));
const isX = (m) => typeof m === 'string' && m.startsWith('x_');
function rankParts(r) {
  if (!r) return 0;
  if (r.mode === 'hybrid') return r.parts.reduce((s, p) => s + rankParts(p), 0);
  if (r.mode === 'x_ppr_lift' || (isX(r.mode) && r.ppr)) return 2;
  return 1;
}
function depthOver3(t) {
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
    n += 1 + (s.co ? 1 : 0);
    n += Math.max(0, (s.rounds || 1) - 1);
    if (s.routes) n++;
    if (s.bm25 || s.bm25only) n++;
    if (s.followImports || s.seedImports) n++;
  }
  if (c.pad && c.pad !== 'none') n++;
  if (c.granularity === 'symbol') n++;
  return n;
}
const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const out = { arms: {} };
for (const arm of ['relational', 'ladybug', 'duckpgq', 'search', 'floor-dir', 'floor-co']) {
  const rows = tables[arm].filter((r) => r.set === 'T1');
  const missing = rows.filter((r) => r.missing).map((r) => r.name);
  const cand = rows.filter((r) => !r.missing && r.primary != null).map((r) => ({ ...r, cx: cx(r.cfg) }));
  cand.sort((a, b) => b.primary - a.primary || byName(a, b));
  const best = cand[0]; const thr = best.primary - best.se;
  const elig = cand.filter((r) => r.primary >= thr);
  const amended = [...elig].sort((a, b) => a.cx - b.cx || b.primary - a.primary || a.tok8000_median - b.tok8000_median || byName(a, b))[0];
  const old = [...elig].sort((a, b) => a.cx - b.cx || a.tok8000_median - b.tok8000_median || byName(a, b))[0];
  // exact ties on the amended key (complexity and primary equal to 1e-12)
  const tiedAmended = elig.filter((r) => r.cx === amended.cx && Math.abs(r.primary - amended.primary) < 1e-12).map((r) => r.name);
  const frozen = {};
  const dir = path.join(BUILD, 'results', 'frozen', arm);
  for (const f of fs.readdirSync(dir).filter((x) => /^[0-9a-f]{16}\.json$/.test(x))) { const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); frozen[r.role] = r.hash; }
  out.arms[arm] = {
    configs_scored: cand.length, missing, best: { name: best.name, hash: best.hash, primary: +best.primary.toFixed(4), se: +best.se.toFixed(4), cx: best.cx }, eligible: elig.length,
    amended: { name: amended.name, hash: amended.hash, primary: +amended.primary.toFixed(4), cx: amended.cx, tok: amended.tok8000_median },
    amended_exact_ties: tiedAmended,
    old_rule: { name: old.name, hash: old.hash, primary: +old.primary.toFixed(4), cx: old.cx },
    s2_best_form: best.hash !== amended.hash ? { name: best.name, hash: best.hash, primary: +best.primary.toFixed(4) } : null,
    frozen,
    primary_matches: frozen.primary === amended.hash,
    s1_matches: old.hash === amended.hash ? !frozen.s1 : frozen.s1 === old.hash,
    s2_matches: best.hash === amended.hash ? !frozen.s2 : frozen.s2 === best.hash,
  };
}
fs.writeFileSync(process.argv[4], JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
