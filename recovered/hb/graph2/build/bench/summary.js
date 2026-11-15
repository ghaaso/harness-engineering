'use strict';
// Writes <BENCH_OUT>/summary.md from the per-engine JSON files, check.json, plan.json and the host
// records that run_all.sh writes (host_stats.jsonl, host_env.json). No measurement here.
//   node bench/summary.js
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const ENGINES = ['relational', 'ladybug', 'duckpgq'];
const rd = (f) => { const p = path.join(L.OUT, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const f1 = (x) => (x == null ? '-' : Number(x).toFixed(x >= 100 ? 0 : x >= 10 ? 1 : 2));
const ms = (s) => (s && s.n ? f1(s.median_ms) + ' / ' + f1(s.p95_ms) : '-');
const mb = (b) => (b / 1048576).toFixed(1);

function main() {
  const plan = L.readPlan(); const J = {}; for (const e of ENGINES) { const j = rd(e + '.json'); if (j) J[e] = j; }
  const check = rd('check.json'); const env = rd('host_env.json');
  const statsLines = fs.existsSync(path.join(L.OUT, 'host_stats.jsonl')) ? fs.readFileSync(path.join(L.OUT, 'host_stats.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return { bad: l }; } }) : [];
  const any = Object.values(J)[0];
  const o = [];
  o.push('# Engine benches (protocol addendum 4, section E)', '');
  o.push(`Generated ${new Date().toISOString()} from ${Object.keys(J).join(', ')}. ${any && any.run.smoke ? '**SMOKE RUN (' + any.run.seeds + ' seeds per class): these numbers only prove the scripts work and are discarded.**' : 'Full run.'}`, '');
  o.push('Every number is a wall time in milliseconds (ms) unless named otherwise. "a / b" = median / 95th percentile (nearest rank). Seeds are TUNE inputs only (plan.json); nothing held-out was run.', '');
  o.push('## Labels that go with every number here (addendum 4, item 20)', '');
  for (const l of L.LABELS) o.push('- ' + l);
  o.push('');
  o.push('## Run', '');
  if (any) {
    o.push(`- Seeds per class: ${any.run.seeds} (warm), cold samples per class and thread setting: ${any.run.cold_samples}, timed repetitions per seed: ${any.run.reps}, store builds per graph: ${any.run.builds}, calibration seeds: ${any.run.calibration_seeds}, no-op samples: ${any.run.noop_samples}, thread candidates: ${any.run.thread_candidates.join(', ')}.`);
    o.push(`- Container CPUs allowed: ${any.host_start.cpus_allowed_list} (Node sees ${any.host_start.available_parallelism}); load average at start of each engine: ${Object.entries(J).map(([e, j]) => e + ' ' + j.host_start.loadavg).join('; ')}.`);
  }
  if (env) o.push(`- Docker host: ${env.docker || ''}; CPU set ${env.cpuset}; running containers at start: ${env.containers_at_start}${env.other_than_unrelated && env.other_than_unrelated.trim() ? '; **NOT QUIET: other containers ran (' + env.other_than_unrelated.trim() + '), quiet-machine guard overridden (BENCH_ALLOW_BUSY=' + env.allow_busy + ')**' : '; quiet (only the three unrelated containers)'}.`);
  o.push(`- Graphs: tune = ${plan.graphs.tune.sha} (${plan.graphs.tune.nodes} nodes, ${plan.graphs.tune.edges} edges; the largest TUNE parent), frozen = ${plan.graphs.frozen.sha} (${plan.graphs.frozen.nodes} nodes, ${plan.graphs.frozen.edges} edges).`);
  o.push(`- Configurations: ${plan.classes.filter((c) => c.kind === 'rank').map((c) => c.key + ' ' + c.config_hash).join(', ')}; plus the 20 TUNE question lookups (TQ) on the frozen graph.`, '');
  o.push('## Store build and size', '');
  o.push('| engine | graph | build ms (median of runs) | facts load ms (not in build) | store bytes (MiB) |', '|---|---|---|---|---|');
  for (const [e, j] of Object.entries(J)) for (const [g, x] of Object.entries(j.graphs)) o.push(`| ${e} | ${g} | ${f1(x.build_ms.median_ms)} (${x.builds.length} runs: ${x.builds.map((b) => f1(b.build_ms)).join(', ')}) | ${f1(x.facts_load_ms.median_ms)} | ${x.store_size.bytes} (${mb(x.store_size.bytes)}) |`);
  o.push('');
  o.push('## Latency per query class', '');
  o.push('warm = median of 3 repeats per seed, then median / p95 over seeds, application caches warm; uncached = process and connection warm, application-keyed caches dropped before each call; cold = fresh process and fresh connection, open + first call (client library load and facts load excluded, reported in the JSON). API = time inside engine client calls; app = rest of the call; stmts = statements per ranking (median); rtt = statements x median no-op statement time; text = distinct statement texts / characters / lines.', '');
  for (const graph of ['tune', 'frozen']) {
    for (const cls of plan.classes.filter((c) => c.graphs.includes(graph))) {
      const rows = [];
      for (const [e, j] of Object.entries(J)) {
        const c = j.classes[graph + '/' + cls.key]; if (!c) continue;
        for (const [t, w] of Object.entries(c.by_threads)) rows.push(`| ${e} | ${t}${Number(t) === c.best_threads ? ' (best)' : ''} | ${ms(w.warm)} | ${ms(w.warm_uncached)} | ${ms(w.cold.cold)} | ${ms(w.cold.open)} | ${ms(w.breakdown.engine_api)} | ${ms(w.breakdown.app_code)} | ${w.breakdown.statements.median} | ${f1(w.breakdown.roundtrip_estimate.median_ms)} | ${w.query_text.distinct_texts} / ${w.query_text.chars} / ${w.query_text.lines} | ${w.result_size.median} |`);
      }
      if (!rows.length) continue;
      o.push(`### ${graph} / ${cls.key}${cls.config_hash ? ' (' + cls.config_hash + ')' : ''}: ${cls.role}`, '');
      o.push('| engine | threads | warm | uncached | cold | cold open | API | app | stmts | rtt | text | result size |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
      o.push(...rows, '');
    }
  }
  o.push('## Thread calibration (warm median ms on the calibration seeds; best = fewest threads within 3 % of the lowest)', '');
  for (const [e, j] of Object.entries(J)) for (const [g, x] of Object.entries(j.graphs)) {
    const ts = Object.keys(x.calibration);
    o.push(`- ${e} / ${g}: ` + Object.keys(x.best_threads).map((k) => `${k} [${ts.map((t) => t + ':' + f1(x.calibration[t].classes[k].median_ms)).join(' ')}] best ${x.best_threads[k]}`).join('; ') + `. Knob: ${j.thread_knob}`);
  }
  o.push('');
  o.push('## Caches held or keyed by application code (addendum 4, item e)', '');
  for (const [e, j] of Object.entries(J)) for (const c of j.caches) o.push(`- ${e}: **${c.name}**: ${c.where}; classes: ${(c.classes || []).join(', ') || 'none timed'}; dropped in "uncached": ${c.dropped_in_warm_uncached ? 'yes' : 'no'}${c.note ? ' (' + c.note + ')' : ''}.`);
  o.push('');
  if (J.ladybug && J.ladybug.harness_ipc) {
    o.push('## LadybugDB as the harness runs it (child process per store, one IPC round trip per ranking; 1 thread)', '');
    o.push('| graph | class | harness wall | child rank | IPC round trip |', '|---|---|---|---|---|');
    for (const [g, x] of Object.entries(J.ladybug.harness_ipc)) for (const [k, v] of Object.entries(x.classes)) o.push(`| ${g} | ${k} | ${ms(v.harness_wall)} | ${ms(v.child_rank_ms)} | ${ms(v.ipc_roundtrip)} |`);
    o.push('');
  }
  // the one-file update measure (bench/update.js, added in pre-flight fix round 1)
  const U = {}; for (const e of ENGINES) { const j = rd('update_' + e + '.json'); if (j) U[e] = j; }
  o.push('## One-file update (bench/update.js): re-ingest one seed file into an existing store, local and global refresh', '');
  if (Object.keys(U).length) {
    o.push('| engine | graph | files | update | delete | insert | local refresh | global refresh | answers differing | fingerprint differences |', '|---|---|---|---|---|---|---|---|---|---|');
    const pm = (x, k) => (x.parts_ms[k] ? ms(x.parts_ms[k]) : '-');
    for (const [e, j] of Object.entries(U)) for (const [g, x] of Object.entries(j.graphs)) {
      o.push(`| ${e} | ${g} | ${x.files_updated} | ${ms(x.update_ms)} | ${pm(x, 'delete_ms')} | ${pm(x, 'insert_ms')} | ${pm(x, 'local_ms')} | ${pm(x, 'global_ms')} | ${x.check.answers_differing.length} | ${x.check.fingerprint_differences.length} |`);
    }
    o.push('', 'Each update is timed over its parts (other parts: SQLite closure and commit; LadybugDB commit; DuckDB commit, node-table reorder and checkpoint). Known engine effects (not failures): ' + (Object.values(U).flatMap((j) => Object.values(j.graphs).flatMap((x) => (x.check.known_engine_effects || []).map((k) => j.engine + ': ' + k.why))).filter((v, i, a) => a.indexOf(v) === i).join('; ') || 'none') + '.', '');
  } else o.push('No update_<engine>.json (run_all.sh runs bench/update.js after each engine).', '');
  o.push('## Equivalence of the timed answers', '');
  if (check) {
    o.push(`Reference arm against each engine (seeds with equal order / equal scores at 1e-9 / exactly equal):`, '');
    for (const [e, m] of Object.entries(check.engines)) o.push(`- ${e}: ` + Object.entries(m).map(([k, r]) => `${k} ${r.order_equal}/${r.score9_equal}/${r.exact_equal} of ${r.seeds}${r.cold_samples_equal_to_warm ? '' : ' (a cold answer differs from warm)'}`).join('; '));
    if (check.tq_across_engines) o.push(`- TQ: ${check.tq_across_engines.questions} questions, answers equal across ${check.tq_across_engines.engines.join(', ')}: ${check.tq_across_engines.all_equal}.`);
    for (const [g, s] of Object.entries(check.s2_across_threads)) o.push(`- LadybugDB S2 on ${g}: equal across thread settings ${s.threads.join(', ')}: ${s.exact_equal_all}; cold equal to warm: ${s.cold_samples_equal_to_warm}.`);
    o.push(`- Problems: ${check.problems.length ? check.problems.join('; ') : 'none'}.`);
  } else o.push('check.json missing (bench/check.js not run).');
  o.push('');
  o.push('## The three unrelated host containers (docker stats --no-stream, before and after each engine)', '');
  if (statsLines.length) { o.push('| when | engine | container | CPU % | memory |', '|---|---|---|---|---|'); for (const s of statsLines) if (s.stats) o.push(`| ${s.when} | ${s.engine} | ${s.stats.Name} | ${s.stats.CPUPerc} | ${s.stats.MemUsage} |`); } else o.push('No host_stats.jsonl (run_all.sh writes it).');
  o.push('');
  o.push('## What makes a number not comparable across engines', '');
  const nc = new Set();
  for (const [e, j] of Object.entries(J)) for (const x of j.not_comparable) nc.add(e + ': ' + x);
  for (const x of nc) o.push('- ' + x);
  o.push('- All engines: "cold" starts a fresh process and connection, but the operating-system file cache stays warm (dropping it needs privileges the container does not have); store files sit on the container filesystem.');
  o.push('- All engines: the CPU set is pinned inside the Docker Desktop WSL2 virtual machine; Hyper-V may still move those virtual CPUs between physical cores.');
  o.push('- All engines: builds run at each engine\'s default thread count (SQLite one thread); only queries are timed at 1 and at the best setting.');
  o.push('- All engines: store contents differ (each arm stores what its queries need: SQLite a closure table, FTS5 and a global PageRank column; LadybugDB typed and arc relationship tables, a term graph and native priors; DuckDB label tables, an arc table, BM25 postings and two stored property graphs), so bytes on disk compare designs, not engines alone.');
  o.push('- tune seeds come from TUNE T1 tasks of many parents, mapped onto the largest TUNE parent by path and symbol (plan.json says how many come from that parent\'s own tasks).');
  o.push('');
  fs.writeFileSync(path.join(L.OUT, 'summary.md'), o.join('\n') + '\n');
  console.log('wrote ' + path.join(L.OUT, 'summary.md'));
}

main();
