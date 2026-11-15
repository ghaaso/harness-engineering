'use strict';
// Summary of the interleaved engine bench (protocol addendum 5 section C, addendum 4 items 18 to 20).
//   node bench/isummary.js    -> <BENCH_OUT>/summary.md and summary.json (no measurement here)
// Per engine, graph, query class and thread setting: each pass gives one value per measure (for example
// the median over seeds of the warm wall time); the tables show the MEDIAN OVER PASSES and the SPREAD
// BETWEEN PASSES (largest minus smallest pass value), in wall time and in CPU time of the process that
// does the work. A difference between two engines "holds" only if it has the same direction in wall and
// in CPU time and is larger than the spread between passes of both engines, in both; everything else is
// listed as inside the noise. Only complete units (units/p<k>-<graph>.json) are read.
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const OUT = L.OUT;
const plan = L.readPlan();
const ENG = ['relational', 'ladybug', 'duckpgq'];
const NAME = { relational: 'SQLite', ladybug: 'LadybugDB', duckpgq: 'DuckDB+DuckPGQ' };
const rd = (f) => { const p = path.join(OUT, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const udir = path.join(OUT, 'units');
const units = fs.existsSync(udir) ? fs.readdirSync(udir).filter((f) => /^p\d+-(tune|frozen)\.json$/.test(f)).sort().map((f) => JSON.parse(fs.readFileSync(path.join(udir, f), 'utf8'))) : [];
const cal = rd('calibration.json'); const check = rd('check.json'); const rc = rd('run_config.json');
const med = L.median; const p95 = (a) => L.pctile(a, 0.95);
const f1 = (x) => (x == null || Number.isNaN(x) ? '-' : Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : Math.abs(x) >= 1 ? x.toFixed(2) : x.toFixed(3));
const uniq = (a) => [...new Set(a)];

// where each ranking runs (addendum 4 item 20 and addendum 2 item 20), per class and engine
const WHERE = {
  primary: { relational: 'unbounded walk and degree-normalised spreading in SQL, one statement per BFS level, level loop in application code', ladybug: 'arcs and out-degrees fetched by Cypher; the degree-normalised spreading runs in application code (JavaScript): not in the engine', duckpgq: 'reach by iterativelength() over a CSR built in the statement; spreading in SQL, one statement per BFS level, level loop in application code' },
  S1: { relational: '4-hop reach by a recursive CTE; personalised PageRank in SQL, about 270 statements per ranking (one per iteration step, loop in application code) over TEMP transition tables', ladybug: '4-hop reach by the native recursive pattern; personalised PageRank, 40 iterations in application code (JavaScript) over a transition CSR fetched by one Cypher query and cached in application code', duckpgq: '4-hop reach by a recursive SQL statement (no bounded graph operator in DuckPGQ); personalised PageRank as one recursive SQL statement (40 steps) over TEMP transition tables' },
  base: { relational: 'as S1 with 2 hops', ladybug: 'as S1 with 2 hops', duckpgq: 'as S1 with 2 hops' },
  S2: { ladybug: 'unbounded reach by the native recursive pattern; personalised PageRank in application code (as S1) fused with the community prior stored in the database (native Louvain at build, grouping read from the stored prior file)' },
  tq: { relational: 'in the engine: SQL per question (statements re-prepared on every call, as the arm does)', ladybug: 'in the engine: Cypher per question (prepared statements kept)', duckpgq: 'in the engine: SQL per question (literals inlined)' },
};
function labels(o, cls) {
  o.push('Labels (addendum 4 item 20): ' + L.LABELS.slice(0, 3).join(' '));
  if (cls && WHERE[cls]) o.push('Where the ranking runs (' + cls + '): ' + Object.entries(WHERE[cls]).map(([e, w]) => NAME[e] + ': ' + w).join('; ') + '.');
  else o.push('Where the rankings run: ' + L.LABELS[3]);
  o.push('');
}

// ---- per-pass values ----------------------------------------------------------------------------
const best = (u, e, cls) => (u.best_threads[e] || {})[cls];
const settingT = (u, e, cls, s) => (s === 'one' ? 1 : best(u, e, cls));
function blocksOf(u, type, e, cls, T) { return u.blocks.filter((b) => b.spec.type === type && b.spec.engine === e && b.spec.cls === cls && b.spec.T === T); }
function passValues(u, e, cls, s) {
  const T = settingT(u, e, cls, s); if (T == null) return null;
  const wb = blocksOf(u, 'warm', e, cls, T); if (!wb.length) return null;
  const it = wb.flatMap((b) => b.res.items.map((x) => ({ ...x, noop: b.res.noop })));
  const pm = (k) => med(it.map(k).filter((x) => x != null));
  const wW = it.map((x) => med(x.warm_ms)); const wC = it.map((x) => med(x.warm_cpu_ms));
  const cb = blocksOf(u, 'cold', e, cls, T); const cr = cb.flatMap((b) => b.res.rows);
  const texts = new Map(); for (const b of wb) for (const [k, v] of b.res.texts) texts.set(k, v);
  const all = [...wb, ...cb];
  return {
    T,
    warm: [med(wW), med(wC)], warm_p95: [p95(wW), p95(wC)],
    uncached: [pm((x) => x.unc_ms), pm((x) => x.unc_cpu_ms)],
    api: [pm((x) => x.bd && x.bd.api_ms), pm((x) => x.bd && x.bd.api_cpu_ms)],
    app: [pm((x) => x.bd && x.bd.app_ms), pm((x) => x.bd && x.bd.app_cpu_ms)],
    rtt: [pm((x) => x.bd && x.noop && x.bd.stmts * x.noop.median_ms), pm((x) => x.bd && x.noop && x.bd.stmts * x.noop.median_cpu_ms)],
    api_minus_rtt: [pm((x) => x.bd && x.noop && x.bd.api_ms - x.bd.stmts * x.noop.median_ms), pm((x) => x.bd && x.noop && x.bd.api_cpu_ms - x.bd.stmts * x.noop.median_cpu_ms)],
    cold: cr.length ? [med(cr.map((x) => x.cold_ms)), med(cr.map((x) => x.cold_cpu_ms))] : [null, null],
    cold_p95: cr.length ? [p95(cr.map((x) => x.cold_ms)), p95(cr.map((x) => x.cold_cpu_ms))] : [null, null],
    cold_open: cr.length ? [med(cr.map((x) => x.open_ms)), med(cr.map((x) => x.open_cpu_ms))] : [null, null],
    stmts: pm((x) => x.bd && x.bd.stmts), text: [texts.size, [...texts.values()].reduce((a, v) => a + v[0], 0), [...texts.values()].reduce((a, v) => a + v[1], 0)],
    size: pm((x) => x.size), rss_mb: Math.max(...wb.map((b) => b.res.rss_mb)), seeds: it.length, cold_n: cr.length,
    readback: uniq(wb.map((b) => JSON.stringify(b.res.readback))),
    blocks: all.length, flagged: all.filter((b) => b.flagged).length, repeats: all.reduce((a, b) => a + b.attempts - 1, 0), other_cpus: med(all.map((b) => b.load.other_cpus)),
  };
}
function acrossPasses(vals, k) {
  const w = vals.map((v) => (Array.isArray(v[k]) ? v[k][0] : v[k])).filter((x) => x != null);
  const c = vals.map((v) => (Array.isArray(v[k]) ? v[k][1] : null)).filter((x) => x != null);
  return { wall: med(w), wall_spread: w.length ? Math.max(...w) - Math.min(...w) : null, cpu: c.length ? med(c) : null, cpu_spread: c.length ? Math.max(...c) - Math.min(...c) : null, n: w.length, wall_passes: w, cpu_passes: c };
}
const ms2 = (a) => (a.wall == null ? '-' : `${f1(a.wall)} ±${f1(a.wall_spread)} / ${f1(a.cpu)} ±${f1(a.cpu_spread)}`);

const S = { generated_at: new Date().toISOString(), units: units.map((u) => u.unit), rows: {}, comparisons: [], builds: {}, updates: {}, ipc: {} };
const MEASURES = [['warm', 'warm median'], ['warm_p95', 'warm p95'], ['uncached', 'warm, application caches dropped'], ['cold', 'cold (open + first call)']];

function compare(o, title, A, B, a, b, unit) {
  if (!A || !B || A.wall == null || B.wall == null || A.cpu == null || B.cpu == null) return;
  const dW = A.wall - B.wall; const dC = A.cpu - B.cpu;
  const sameDir = Math.sign(dW) === Math.sign(dC) && Math.sign(dW) !== 0;
  const big = Math.abs(dW) > Math.max(A.wall_spread, B.wall_spread) && Math.abs(dC) > Math.max(A.cpu_spread, B.cpu_spread);
  const n = Math.min(A.wall_passes.length, B.wall_passes.length);
  let agree = 0; for (let i = 0; i < n; i++) if (Math.sign(A.wall_passes[i] - B.wall_passes[i]) === Math.sign(dW) && Math.sign(A.cpu_passes[i] - B.cpu_passes[i]) === Math.sign(dW)) agree++;
  const [fast, slow] = dW < 0 ? [a, b] : [b, a];
  // with one pass there is no spread between passes, so nothing can be shown to exceed it
  const x = { what: title, a, b, wall_diff: dW, cpu_diff: dC, holds: sameDir && big && n >= 2, same_direction: sameDir, larger_than_spread: big && n >= 2, passes_agreeing: agree, passes: n,
    text: `${title}: ${NAME[fast]} lower than ${NAME[slow]} by ${f1(Math.abs(dW))} ${unit} wall and ${f1(dC * Math.sign(dW))} ${unit} CPU (spreads wall ${f1(A.wall_spread)} / ${f1(B.wall_spread)}, CPU ${f1(A.cpu_spread)} / ${f1(B.cpu_spread)}; ${agree} of ${n} passes agree in both)` };
  S.comparisons.push(x);
}

const o = [];
const smoke = rc && rc.config.seeds < plan.n_seeds;
o.push('# Engine benches, interleaved (protocol addendum 5 section C; addendum 4 items 18 to 20)', '');
o.push(`Generated ${S.generated_at} from ${units.length} complete units (${units.map((u) => u.unit).join(', ') || 'none'}). ${smoke || (rc && rc.config.passes < 5) ? '**PROOF RUN (' + rc.config.seeds + ' seeds, ' + rc.config.passes + ' pass' + (rc.config.passes === 1 ? '' : 'es') + '): these numbers only show that the driver works and are discarded.**' : ''}`, '');
o.push('Every time is in milliseconds (ms). A cell "a ±s / c ±t" = median over passes of the wall time ± spread between passes (largest minus smallest pass value) / the same for CPU time of the process that does the work (all its threads; for the cold rows the fresh process). Inputs are TUNE seeds and the frozen-commit graph only (plan.json).', '');
if (rc) o.push(`Settings: ${JSON.stringify(rc.config)}.`, '');
labels(o, null);

o.push('## Load on the host while the blocks ran', '');
const allB = units.flatMap((u) => u.blocks);
if (allB.length) {
  o.push(`${allB.length} kept blocks; ${allB.reduce((a, b) => a + b.attempts - 1, 0)} repeats because other work used more than half of the host CPUs; ${allB.filter((b) => b.flagged).length} blocks kept and flagged after ${rc ? rc.config.max_repeats : 3} repeats. "Other work" = host processes outside the Docker VM plus VM work outside this container, in CPUs (the host has ${allB[0].load.limit_cpus * 2} logical CPUs).`, '');
  o.push('| engine | kept blocks | repeats | kept flagged | other work, median CPUs | other work, max CPUs | VM steal, median CPUs |', '|---|---|---|---|---|---|---|');
  for (const e of ENG) { const bs = allB.filter((b) => b.spec.engine === e); if (!bs.length) continue; o.push(`| ${NAME[e]} | ${bs.length} | ${bs.reduce((a, b) => a + b.attempts - 1, 0)} | ${bs.filter((b) => b.flagged).length} | ${f1(med(bs.map((b) => b.load.other_cpus)))} | ${f1(Math.max(...bs.map((b) => b.load.other_cpus)))} | ${f1(med(bs.map((b) => b.load.vm_steal_cpus).filter((x) => x != null)))} |`); }
  const missing = allB.filter((b) => b.load.host_timeline !== 'ok').length;
  o.push('', `Blocks judged without the host timeline (VM side only): ${missing}.`, '');
}

if (cal) {
  o.push('## Thread calibration (once, before the passes; calibration seeds disjoint from the measured ones)', '');
  o.push(`Rule: ${cal.rule}. Candidates: ${cal.candidates.join(', ')} threads.`, '');
  for (const [g, x] of Object.entries(cal.graphs)) for (const [e, byCls] of Object.entries(x.by || {})) o.push(`- ${NAME[e]} / ${g}: ` + Object.entries(byCls).map(([k, byT]) => `${k} [` + Object.entries(byT).map(([t, v]) => `${t}: ${f1(v.median_ms)} ms wall, ${f1(v.median_cpu_ms)} ms CPU${v.flagged ? ' (flagged)' : ''}`).join('; ') + `] best ${cal.best[e][g][k]}`).join('; '));
  o.push('');
}

for (const graph of ['tune', 'frozen']) {
  const us = units.filter((u) => u.graph === graph); if (!us.length) continue;
  const g = plan.graphs[graph];
  o.push(`## Query classes on the ${graph} graph (${g.sha.slice(0, 12)}, ${g.nodes} nodes, ${g.edges} edges; ${us.length} passes)`, '');
  for (const cls of plan.classes.filter((c) => c.graphs.includes(graph))) {
    const rows = [];
    for (const e of ENG) for (const s of ['one', 'best']) {
      const vals = us.map((u) => passValues(u, e, cls.key, s)).filter(Boolean); if (!vals.length) continue;
      const r = { engine: e, setting: s, T: uniq(vals.map((v) => v.T)), passes: vals.length };
      for (const k of ['warm', 'warm_p95', 'uncached', 'cold', 'cold_p95', 'cold_open', 'api', 'app', 'rtt', 'api_minus_rtt', 'stmts', 'size']) r[k] = acrossPasses(vals, k);
      r.text = vals[vals.length - 1].text; r.rss_mb = Math.max(...vals.map((v) => v.rss_mb)); r.readback = uniq(vals.flatMap((v) => v.readback));
      r.blocks = vals.reduce((a, v) => a + v.blocks, 0); r.flagged = vals.reduce((a, v) => a + v.flagged, 0); r.repeats = vals.reduce((a, v) => a + v.repeats, 0); r.seeds = vals[0].seeds; r.cold_n = vals[0].cold_n;
      r.same_as_one = s === 'best' && r.T.every((t) => t === 1);
      rows.push(r); (S.rows[graph + '/' + cls.key] = S.rows[graph + '/' + cls.key] || []).push(r);
    }
    if (!rows.length) continue;
    o.push(`### ${graph} / ${cls.key}${cls.config_hash ? ' (' + cls.config_hash + ')' : ''}: ${cls.role}`, '');
    labels(o, cls.key);
    o.push('| engine | threads | warm median | warm p95 | uncached | cold | cold open | engine API | app code | round trips (est.) | engine API minus round trips | statements per call | query text: texts / chars / lines | blocks (repeats, flagged) |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of rows) {
      if (r.same_as_one) { o.push(`| ${NAME[r.engine]} | best = 1 | same as the 1-thread row | | | | | | | | | | | |`); continue; }
      o.push(`| ${NAME[r.engine]} | ${r.setting === 'one' ? '1' : 'best ' + r.T.join('/')} | ${ms2(r.warm)} | ${ms2(r.warm_p95)} | ${ms2(r.uncached)} | ${ms2(r.cold)} | ${ms2(r.cold_open)} | ${ms2(r.api)} | ${ms2(r.app)} | ${ms2(r.rtt)} | ${ms2(r.api_minus_rtt)} | ${f1(r.stmts.wall)} | ${r.text.join(' / ')} | ${r.blocks} (${r.repeats}, ${r.flagged}) |`);
    }
    o.push('', `Seeds per pass: ${rows[0].seeds} (warm, uncached, instrumented), ${rows[0].cold_n} (cold). Thread read-back: ${rows.map((r) => NAME[r.engine] + ' ' + r.setting + ' ' + r.readback.join(' ')).join('; ')}.`, '');
    for (const s of ['one', 'best']) for (let i = 0; i < ENG.length; i++) for (let j = i + 1; j < ENG.length; j++) {
      const A = rows.find((r) => r.engine === ENG[i] && r.setting === s); const B = rows.find((r) => r.engine === ENG[j] && r.setting === s);
      if (!A || !B) continue;
      for (const [k, t] of MEASURES) compare(o, `${graph}/${cls.key} ${s === 'one' ? '1 thread' : 'best threads'} ${t}`, A[k], B[k], ENG[i], ENG[j], 'ms');
    }
  }
}

// ---- store build, size, update, harness IPC -------------------------------------------------------
o.push('## Store build (fresh process per build) and size on disk', '');
labels(o, null);
o.push('| engine | graph | builds | build wall / CPU (median over passes ± spread) | store bytes (MiB), median | blocks flagged |', '|---|---|---|---|---|---|');
for (const graph of ['tune', 'frozen']) for (const e of ENG) {
  const us = units.filter((u) => u.graph === graph); if (!us.length) continue;
  const per = us.map((u) => { const bs = u.blocks.filter((b) => b.spec.type === 'build' && b.spec.engine === e); return bs.length ? { build: [med(bs.map((b) => b.res.build_ms)), med(bs.map((b) => b.res.build_cpu_ms))], bytes: med(bs.map((b) => b.res.bytes)), n: bs.length, flagged: bs.filter((b) => b.flagged).length } : null; }).filter(Boolean);
  if (!per.length) continue;
  const a = acrossPasses(per, 'build'); const bytes = med(per.map((x) => x.bytes));
  S.builds[graph + '/' + e] = { ...a, bytes, builds: per.reduce((s, x) => s + x.n, 0) };
  o.push(`| ${NAME[e]} | ${graph} | ${per.reduce((s, x) => s + x.n, 0)} | ${ms2(a)} | ${bytes} (${(bytes / 1048576).toFixed(1)}) | ${per.reduce((s, x) => s + x.flagged, 0)} |`);
}
o.push('');
for (const graph of ['tune', 'frozen']) for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) compare(o, `${graph} store build`, S.builds[graph + '/' + ENG[i]], S.builds[graph + '/' + ENG[j]], ENG[i], ENG[j], 'ms');

o.push('## One-file update (bench/update.js steps; re-ingest one seed file into an existing store, local and global refresh)', '');
labels(o, null);
o.push('| engine | graph | files per pass | update wall / CPU per file, median over files (median over passes ± spread) | p95 over files | fingerprint differences | answers differing after the updates |', '|---|---|---|---|---|---|---|');
for (const graph of ['tune', 'frozen']) for (const e of ENG) {
  const us = units.filter((u) => u.graph === graph && u.update); if (!us.length) continue;
  const per = us.map((u) => { const rows = u.blocks.filter((b) => b.spec.type === 'update' && b.spec.engine === e).flatMap((b) => b.res.rows); return rows.length ? { upd: [med(rows.map((r) => r.total_ms)), med(rows.map((r) => r.total_cpu_ms))], p95: [p95(rows.map((r) => r.total_ms)), p95(rows.map((r) => r.total_cpu_ms))], n: rows.length } : null; }).filter(Boolean);
  if (!per.length) continue;
  const a = acrossPasses(per, 'upd'); const q = acrossPasses(per, 'p95');
  S.updates[graph + '/' + e] = { ...a, p95: q };
  const chk = us.map((u) => u.update.check[e]);
  o.push(`| ${NAME[e]} | ${graph} | ${per[0].n} | ${ms2(a)} | ${ms2(q)} | ${chk.reduce((s, c) => s + c.fingerprint_differences.length, 0)} | ${chk.reduce((s, c) => s + c.answers_differing.length, 0)} |`);
}
o.push('');
for (const graph of ['tune', 'frozen']) for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) compare(o, `${graph} one-file update`, S.updates[graph + '/' + ENG[i]], S.updates[graph + '/' + ENG[j]], ENG[i], ENG[j], 'ms');

o.push('## LadybugDB as the harness runs it (store in a child process, one IPC round trip per ranking, 1 thread)', '');
labels(o, null);
o.push('| graph | class | harness wall | child rank time | IPC round trip | CPU of the child process | CPU of the calling process |', '|---|---|---|---|---|---|---|');
for (const graph of ['tune', 'frozen']) for (const cls of ['primary', 'S1', 'base', 'S2']) {
  const per = units.filter((u) => u.graph === graph).map((u) => { const b = u.blocks.find((x) => x.spec.type === 'ipc' && x.spec.cls === cls); if (!b) return null; const r = b.res.rows; return { w: med(r.map((x) => x.harness_wall_ms)), c: med(r.map((x) => x.child_rank_ms)), i: med(r.map((x) => x.ipc_ms)), cc: med(r.map((x) => x.child_cpu_ms).filter((x) => x != null)), pc: med(r.map((x) => x.parent_cpu_ms)) }; }).filter(Boolean);
  if (!per.length) continue;
  const m = (k) => `${f1(med(per.map((x) => x[k])))} ±${f1(Math.max(...per.map((x) => x[k])) - Math.min(...per.map((x) => x[k])))}`;
  S.ipc[graph + '/' + cls] = per;
  o.push(`| ${graph} | ${cls} | ${m('w')} | ${m('c')} | ${m('i')} | ${m('cc')} | ${m('pc')} |`);
}
o.push('');

o.push('## Differences between engines', '');
o.push('A difference **holds** when it has the same direction in wall time and in CPU time and is larger than the spread between passes of both engines in both. Everything else is inside the noise. With fewer than five passes this list is not a finding.', '');
labels(o, null);
o.push('### Differences that hold', '');
for (const x of S.comparisons.filter((c) => c.holds)) o.push('- ' + x.text);
if (!S.comparisons.some((c) => c.holds)) o.push('- none');
o.push('', '### Differences inside the noise', '');
for (const x of S.comparisons.filter((c) => !c.holds)) o.push('- ' + x.text + (x.same_direction ? '' : ' [wall and CPU disagree in direction]') + (x.larger_than_spread ? '' : ' [not larger than the spread]'));
if (!S.comparisons.some((c) => !c.holds)) o.push('- none');
o.push('');

o.push('## Equivalence of the timed answers (bench/icheck.js)', '');
if (check) {
  for (const [e, m] of Object.entries(check.engines)) o.push(`- ${NAME[e]} against the reference arm: ` + Object.entries(m).map(([k, r]) => `${k} ${r.score9_equal}/${r.compared}`).join('; ') + ' (answers equal at 1e-9 / answers compared, all passes).');
  o.push(`- Cold against warm: ${Object.values(check.cold).reduce((a, r) => a + r.equal, 0)} of ${Object.values(check.cold).reduce((a, r) => a + r.compared, 0)} equal.`);
  if (check.tq) o.push(`- TQ: ${check.tq.answers} answers to ${check.tq.questions} questions from ${check.tq.engines.map((e) => NAME[e]).join(', ')}; ${check.tq.differing_from_first} differ.`);
  for (const [g, s] of Object.entries(check.s2)) o.push(`- LadybugDB S2 on ${g}: ${s.answers} answers over passes and thread settings; ${s.differing_from_first} differ.`);
  o.push(`- Problems: ${check.problems.length ? check.problems.join('; ') : 'none'}.`);
} else o.push('check.json missing (run bench/icheck.js).');
o.push('');

o.push('## What makes a number not comparable across engines', '');
for (const x of [
  'Client form: SQLite (node:sqlite) and LadybugDB are synchronous in-process calls; the DuckDB Node client is asynchronous, so each statement pays a promise and event-loop round trip. "Round trips (est.)" = statements x the median no-op statement through the same client path; it is an estimate (a no-op statement still parses and plans).',
  'Where the algorithm runs differs (see the labels): LadybugDB runs the PageRank and the degree-normalised spreading in application code, so its "engine API" time is not the algorithm time in the same sense as for SQLite and DuckDB.',
  'Thread knobs differ: SQLite PRAGMA threads only adds sorter helper threads (a recursive CTE runs on one thread); LadybugDB CALL threads is per connection; DuckDB SET threads is instance-wide. In the warm workers the setting is switched at run time between blocks and read back each block; cold processes open with it.',
  'CPU time is the CPU of the whole process doing the work (every thread). A multi-threaded engine can show more CPU than wall time; at one thread CPU is close to wall time unless the process waited.',
  'Store contents differ per arm (SQLite: closure table, FTS5, global PageRank column; LadybugDB: typed and arc relationship tables, term graph, native priors incl. page_rank, k-core and Louvain at build; DuckDB: label tables, arc table, BM25 postings, two stored property graphs), so build time, update time and bytes compare designs, not engines alone. Builds and updates run at each engine\'s default thread count.',
  'Memory settings are the arms\' own: SQLite 64 MiB page cache, LadybugDB 1 GiB buffer pool, DuckDB memory limit 2 GB.',
  'Cold = fresh process and connection; the operating-system file cache stays warm (dropping it needs privileges the container lacks).',
  'Load: blocks alternate so load falls on all engines alike, but a short block (LadybugDB base, TQ) samples a shorter window than a long one (SQLite S1); the load table above shows how the load fell per engine. The host sampler resolves about 1 second; a block shorter than that is judged by the sample that contains it.',
  'Hyper-V schedules the VM\'s virtual CPUs on busy host cores; the CPU set pinned inside the VM cannot prevent that. CPU time counts only time the thread actually ran, so it is less affected by waiting than wall time, but not by slower execution (shared caches, a busy sibling hardware thread, clock speed).',
  'TQ code differs per arm (the relational arm re-prepares statements per question; LadybugDB keeps prepared statements; DuckDB inlines literals).',
  'tune seeds are TUNE T1 seeds of many June parents mapped onto the largest TUNE parent by path and symbol (plan.json).',
]) o.push('- ' + x);
o.push('');
fs.writeFileSync(path.join(OUT, 'summary.md'), o.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(S, null, 1));
console.log('wrote ' + path.join(OUT, 'summary.md') + ' (' + units.length + ' units, ' + S.comparisons.filter((c) => c.holds).length + ' differences hold, ' + S.comparisons.filter((c) => !c.holds).length + ' inside the noise)');
