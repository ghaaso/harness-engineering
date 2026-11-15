'use strict';
// Measurement lane: compare two full bench runs (results/bench/run1 and run2; run2 is the reported one).
//   node tmp/bench/compare.js            -> results/bench/compare.json and results/bench/compare.md
// Rule for "larger than the run-to-run difference": for engines A and B on one cell (graph, class,
// thread setting, measure), gap = |A2 - B2| (run 2); noise = |A2 - A1| + |B2 - B1|. The gap is larger
// than the run-to-run difference when gap > noise. No measurement here; reads the JSON files only.
const fs = require('fs');
const path = require('path');
const B = path.resolve(__dirname, '..', '..', 'results', 'bench');
const ENG = ['relational', 'ladybug', 'duckpgq'];
const rd = (run, f) => { const p = path.join(B, run, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const R = {}; const U = {};
for (const run of ['run1', 'run2']) { R[run] = {}; U[run] = {}; for (const e of ENG) { R[run][e] = rd(run, e + '.json'); U[run][e] = rd(run, 'update_' + e + '.json'); } }
const f = (x) => (x == null ? '-' : Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : Math.abs(x) >= 1 ? x.toFixed(2) : x.toFixed(3));
const pct = (a, b) => (a == null || b == null || b === 0 ? null : (a - b) / b * 100);
const fp = (x) => (x == null ? '-' : (x >= 0 ? '+' : '') + x.toFixed(1) + ' %');

// one row per engine / graph / class / setting ("1" or "best")
function cell(j, key, setting) {
  const c = j && j.classes[key]; if (!c) return null;
  const t = setting === '1' ? 1 : c.best_threads; const w = c.by_threads[t]; if (!w) return null;
  return {
    threads: t, warm_med: w.warm.median_ms, warm_p95: w.warm.p95_ms, uncached_med: w.warm_uncached.median_ms,
    cold_med: w.cold.cold.median_ms, cold_p95: w.cold.cold.p95_ms, open_med: w.cold.open.median_ms,
    api_med: w.breakdown.engine_api.median_ms, app_med: w.breakdown.app_code.median_ms, rtt_med: w.breakdown.roundtrip_estimate.median_ms,
    stmts: w.breakdown.statements.median, texts: w.query_text.distinct_texts, chars: w.query_text.chars, lines: w.query_text.lines,
    rss_mb: w.rss_mb, n: w.warm.n, cold_n: w.cold.n,
  };
}
const keys = [];
for (const e of ENG) { const j = R.run2[e] || R.run1[e]; if (!j) continue; for (const k of Object.keys(j.classes)) if (!keys.includes(k)) keys.push(k); }
const order = ['tune/primary', 'tune/S1', 'tune/base', 'tune/S2', 'frozen/primary', 'frozen/S1', 'frozen/base', 'frozen/S2', 'frozen/tq'];
keys.sort((a, b) => order.indexOf(a) - order.indexOf(b));
const out = { rule: 'gap > noise, gap = |A2-B2|, noise = |A2-A1| + |B2-B1|', rows: [], builds: [], updates: [], pairs: [], ipc: [] };
for (const key of keys) for (const e of ENG) for (const s of ['1', 'best']) {
  const a = cell(R.run2[e], key, s); const b = cell(R.run1[e], key, s); if (!a) continue;
  if (s === 'best' && a.threads === 1 && (!b || b.threads === 1)) continue;
  out.rows.push({ engine: e, key, setting: s, run2: a, run1: b });
}
for (const e of ENG) for (const g of ['tune', 'frozen']) {
  const a = R.run2[e] && R.run2[e].graphs[g]; const b = R.run1[e] && R.run1[e].graphs[g]; if (!a) continue;
  out.builds.push({ engine: e, graph: g, build2: a.build_ms.median_ms, build1: b ? b.build_ms.median_ms : null, builds2: a.builds.map((x) => x.build_ms), bytes2: a.store_size.bytes, bytes1: b ? b.store_size.bytes : null, best2: a.best_threads, best1: b ? b.best_threads : null });
  const ua = U.run2[e] && U.run2[e].graphs[g]; const ub = U.run1[e] && U.run1[e].graphs[g];
  if (ua) out.updates.push({ engine: e, graph: g, files: ua.files_updated, med2: ua.update_ms.median_ms, p952: ua.update_ms.p95_ms, med1: ub ? ub.update_ms.median_ms : null, p951: ub ? ub.update_ms.p95_ms : null, answers_differing: ua.check.answers_differing.length, fingerprint_differences: ua.check.fingerprint_differences.length });
}
for (const run of ['run1', 'run2']) { const j = R[run].ladybug; if (j && j.harness_ipc) for (const [g, x] of Object.entries(j.harness_ipc)) for (const [k, v] of Object.entries(x.classes)) out.ipc.push({ run, graph: g, cls: k, wall: v.harness_wall.median_ms, child: v.child_rank_ms.median_ms, ipc: v.ipc_roundtrip.median_ms }); }
// pairwise engine comparisons
const M = ['warm_med', 'warm_p95', 'cold_med', 'uncached_med'];
for (const key of keys) for (const s of ['1', 'best']) for (let i = 0; i < ENG.length; i++) for (let k = i + 1; k < ENG.length; k++) {
  const A = ENG[i]; const Bn = ENG[k];
  const a2 = cell(R.run2[A], key, s); const b2 = cell(R.run2[Bn], key, s); const a1 = cell(R.run1[A], key, s); const b1 = cell(R.run1[Bn], key, s);
  if (!a2 || !b2 || !a1 || !b1) continue;
  for (const m of M) {
    const gap = Math.abs(a2[m] - b2[m]); const noise = Math.abs(a2[m] - a1[m]) + Math.abs(b2[m] - b1[m]);
    out.pairs.push({ key, setting: s, a: A, b: Bn, measure: m, a2: a2[m], b2: b2[m], a1: a1[m], b1: b1[m], threads: [a2.threads, b2.threads], ratio: a2[m] / b2[m], gap, noise, larger: gap > noise });
  }
}
for (const g of ['tune', 'frozen']) for (let i = 0; i < ENG.length; i++) for (let k = i + 1; k < ENG.length; k++) {
  const x = out.builds.find((r) => r.engine === ENG[i] && r.graph === g); const y = out.builds.find((r) => r.engine === ENG[k] && r.graph === g);
  if (x && y && x.build1 != null && y.build1 != null) { const gap = Math.abs(x.build2 - y.build2); const noise = Math.abs(x.build2 - x.build1) + Math.abs(y.build2 - y.build1); out.pairs.push({ key: g + '/store-build', setting: '-', a: ENG[i], b: ENG[k], measure: 'build_med', a2: x.build2, b2: y.build2, a1: x.build1, b1: y.build1, ratio: x.build2 / y.build2, gap, noise, larger: gap > noise }); }
  const u = out.updates.find((r) => r.engine === ENG[i] && r.graph === g); const v = out.updates.find((r) => r.engine === ENG[k] && r.graph === g);
  if (u && v && u.med1 != null && v.med1 != null) { const gap = Math.abs(u.med2 - v.med2); const noise = Math.abs(u.med2 - u.med1) + Math.abs(v.med2 - v.med1); out.pairs.push({ key: g + '/one-file-update', setting: '-', a: ENG[i], b: ENG[k], measure: 'update_med', a2: u.med2, b2: v.med2, a1: u.med1, b1: v.med1, ratio: u.med2 / v.med2, gap, noise, larger: gap > noise }); }
}
fs.writeFileSync(path.join(B, 'compare.json'), JSON.stringify(out, null, 1));

const o = [];
o.push('# Engine bench: run 1 against run 2 (run 2 is the reported value)', '');
o.push('All times in milliseconds (ms). "diff" = (run 2 - run 1) / run 1. Settings: "1" = one thread, "best" = the thread count the run calibrated as best (shown as T=..).', '');
o.push('## Latency per engine, graph, query class and thread setting', '');
o.push('| graph/class | engine | setting | warm median r2 (r1, diff) | warm p95 r2 (r1, diff) | cold median r2 (r1, diff) | uncached median r2 (r1) | engine API / app code / round-trip estimate (r2 medians) | statements | query text: texts / chars / lines |', '|---|---|---|---|---|---|---|---|---|---|');
for (const r of out.rows) {
  const a = r.run2; const b = r.run1 || {};
  o.push(`| ${r.key} | ${r.engine} | ${r.setting === '1' ? '1' : 'best T=' + a.threads + (b.threads != null && b.threads !== a.threads ? ' (r1 T=' + b.threads + ')' : '')} | ${f(a.warm_med)} (${f(b.warm_med)}, ${fp(pct(a.warm_med, b.warm_med))}) | ${f(a.warm_p95)} (${f(b.warm_p95)}, ${fp(pct(a.warm_p95, b.warm_p95))}) | ${f(a.cold_med)} (${f(b.cold_med)}, ${fp(pct(a.cold_med, b.cold_med))}) | ${f(a.uncached_med)} (${f(b.uncached_med)}) | ${f(a.api_med)} / ${f(a.app_med)} / ${f(a.rtt_med)} | ${a.stmts} | ${a.texts} / ${a.chars} / ${a.lines} |`);
}
o.push('', '## Store build and size', '', '| engine | graph | build median r2 (r1, diff) | store bytes r2 (r1) |', '|---|---|---|---|');
for (const r of out.builds) o.push(`| ${r.engine} | ${r.graph} | ${f(r.build2)} (${f(r.build1)}, ${fp(pct(r.build2, r.build1))}) | ${r.bytes2} = ${(r.bytes2 / 1048576).toFixed(1)} MiB (${r.bytes1}) |`);
o.push('', '## One-file update', '', '| engine | graph | files | median r2 (r1) | p95 r2 (r1) | answers differing | fingerprint differences |', '|---|---|---|---|---|---|---|');
for (const r of out.updates) o.push(`| ${r.engine} | ${r.graph} | ${r.files} | ${f(r.med2)} (${f(r.med1)}) | ${f(r.p952)} (${f(r.p951)}) | ${r.answers_differing} | ${r.fingerprint_differences} |`);
o.push('', '## LadybugDB in the harness form (child process, 1 thread): median harness wall / child rank / IPC', '', '| run | graph | class | wall | child | IPC |', '|---|---|---|---|---|---|');
for (const r of out.ipc) o.push(`| ${r.run} | ${r.graph} | ${r.cls} | ${f(r.wall)} | ${f(r.child)} | ${f(r.ipc)} |`);
o.push('', '## Engine pairs: is the gap larger than the run-to-run difference?', '', 'gap = |A - B| in run 2; noise = |A run2 - A run1| + |B run2 - B run1|; "yes" when gap > noise.', '', '| cell | setting | A | B | measure | A r2 | B r2 | A/B | gap | noise | larger |', '|---|---|---|---|---|---|---|---|---|---|---|');
for (const p of out.pairs) o.push(`| ${p.key} | ${p.setting} | ${p.a} | ${p.b} | ${p.measure} | ${f(p.a2)} | ${f(p.b2)} | ${p.ratio.toFixed(2)} | ${f(p.gap)} | ${f(p.noise)} | ${p.larger ? 'yes' : 'NO'} |`);
fs.writeFileSync(path.join(B, 'compare.md'), o.join('\n') + '\n');
console.log('rows', out.rows.length, 'pairs', out.pairs.length, 'not larger', out.pairs.filter((p) => !p.larger).length);
