'use strict';
// Engine measures for the DuckDB + DuckPGQ graph arm at the frozen commit, mirroring
// arms/relational/bench.js: load time (3 builds), bytes on disk (per table), memory, p50/p95 latency cold
// and warm per query class (TQ included), a one-file incremental update checked against a fresh build,
// EXPLAIN plans of the hot statements, lines of query code per algorithm and which layer answers it.
// Run once inside graphtest:1; the numbers are indicative only (one machine, shared CPUs).
//   node bench.js        -> results/duckpgq/engine/duckpgq.json, results/duckpgq/engine/query_plans.txt
//   node bench.js mem    -> (child) prints RSS before/after open and after the query classes
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const P = require('../common/paths');
const C = require('../common/config');
const RS = require('../relational/sweep');
const L = require('./sweep');
const { loadFacts } = require('../common/facts');
const { seedQuery } = require('../common/textterms');
const S_ = require('./store');
const { PgqGraph, DEFAULT_THREADS } = require('./pgq');
const tq = require('./tq');

const OUT = path.join(P.RESULTS, 'duckpgq', 'engine');
const BENCH_DB = path.join(P.storeFor('duckpgq'), 'bench-' + P.FROZEN.slice(0, 12) + '.duckdb');
const THREADS = Number(process.env.GT_DUCKDB_THREADS || DEFAULT_THREADS);
const now = () => Number(process.hrtime.bigint()) / 1e6;
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(q * s.length))].toFixed(3); };
const stats = (a) => ({ n: a.length, p50_ms: pct(a, 0.5), p95_ms: pct(a, 0.95), max_ms: +Math.max(...a).toFixed(3) });

// the same 30 benchmark seeds as the relational bench
function benchSeeds(G) {
  const defs = G.nodes.filter((n) => ['function', 'method', 'component'].includes(n.kind) && !n.is_test && n.file);
  const k = Math.floor(defs.length / 30);
  return Array.from({ length: 30 }, (_, j) => defs[j * k]).map((n) => ({
    ids: [n.file, n.i].sort((a, b) => a - b),
    seed: { path: n.path, symbol: { name: n.sid.split('#')[1], kind: n.kind, start: n.ls, end: n.le } },
  }));
}

const cfg = (patch) => C.normalise({ ...RS.BASE, ...patch });
const byName = (n) => L.STAGE1.find((c) => c.name === n);
const CLASSES_Q = {
  'k-hop 1 (bounded recursive CTE, both)': cfg({ traversal: { mode: 'khop', hops: 1 }, rank: { mode: 'bfs' } }),
  'k-hop 3 (bounded recursive CTE, both)': cfg({ traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'bfs' } }),
  'k-hop 6 (bounded recursive CTE, both)': cfg({ traversal: { mode: 'khop', hops: 6 }, rank: { mode: 'bfs' } }),
  'unbounded (iterativelength over a CSR, both)': cfg({ traversal: { mode: 'khop', hops: null }, rank: { mode: 'bfs' } }),
  'k-hop 3 dependents (bounded recursive CTE)': cfg({ direction: 'dependents', traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'bfs' } }),
  'k-hop 1 (PGQ one-edge pattern per level)': { ...cfg({ traversal: { mode: 'khop', hops: 1 }, rank: { mode: 'bfs' } }), _impl: 'levels' },
  'k-hop 3 (PGQ one-edge pattern per level)': { ...cfg({ traversal: { mode: 'khop', hops: 3 }, rank: { mode: 'bfs' } }), _impl: 'levels' },
  'k-hop 6 (PGQ one-edge pattern per level)': { ...cfg({ traversal: { mode: 'khop', hops: 6 }, rank: { mode: 'bfs' } }), _impl: 'levels' },
  'budget B1 (recursive CTE, SQL)': cfg({ traversal: RS.STAGE1.find((c) => c.name === 'budget=B1').traversal, rank: { mode: 'bfs' } }),
  'metapath defs>code1-2>tests (PGQ fixed patterns)': cfg({ traversal: RS.METAPATH, rank: { mode: 'bfs' } }),
  'hub cut indeg>10, 2 hops': cfg({ hub: { mode: 'indeg', k: 10 }, rank: { mode: 'bfs' } }),
  'ranked: degree-normalised, 2 hops': cfg({ rank: { mode: 'degnorm' } }),
  'ranked: PPR r0.30, 2 hops (base)': cfg({}),
  'ranked: PPR r0.30, unbounded': cfg({ traversal: { mode: 'khop', hops: null } }),
  'ranked: co-change, 2 hops': cfg({ rank: { mode: 'cochange' } }),
  'ranked: text (BM25 in SQL), 2 hops': cfg({ rank: { mode: 'text' } }),
  'ranked: hybrid PPR+text, 2 hops': cfg({ rank: { mode: 'hybrid', parts: [{ mode: 'ppr', restart: 0.3, cochange_w: 1 }, { mode: 'text' }] } }),
  'native: pagerank() variant, 2 hops': C.normalise(byName('native: rank=pagerank (duckpgq global)')),
  'native: weighted shortest path (cheapest_path_length), 2 hops': C.normalise(byName('native: rank=x_wsp (LadybugDB class costs)')),
  'native: PPR + weakly_connected_component prior': C.normalise(byName('native: rank=ppr + wcc community prior')),
  'native: k-hop with pagerank top-50 cut': C.normalise(byName('native: hub=pagerank top 50 not expanded')),
};

async function runClass(g, c, s, full = false) {
  const cc = { ...c }; const impl = cc._impl; delete cc._impl;
  g.khopImpl = impl || null;
  try { const r = await g.rank(s.ids, cc, s.seed); return full ? r : r.ranked; } finally { g.khopImpl = null; }
}
// BM25 name lookup over every node (the same scoring as rank=text, without a candidate set)
async function nameLookup(g, s) {
  const q = seedQuery(s.seed);
  if (!q.length) return [];
  return g.all(`WITH q(term) AS (VALUES ${q.map((t) => `(${S_.lit(t)})`).join(', ')}),
    f AS (SELECT q.term, coalesce(df.n, 0) AS nh FROM q LEFT JOIN df ON df.term = q.term),
    idf AS (SELECT term, greatest(ln((${g.N}::DOUBLE - nh + 0.5) / (nh + 0.5)), 1e-6) AS idf FROM f)
    SELECT t.node AS v, sum(idf.idf * ((t.tf * 2.2) / (t.tf + 1.2 * (0.25 + 0.75 * n.dl / ${g.avgdl}::DOUBLE)))) AS x
    FROM term t JOIN idf ON idf.term = t.term JOIN node n ON n.id = t.node GROUP BY t.node ORDER BY x DESC, v LIMIT 20`);
}

async function latency(G) {
  const seeds = benchSeeds(G); const res = {}; const opens = [];
  // cold: a fresh DuckDB instance per sample (the store opened READ_ONLY; its property graphs are stored,
  // the connection caches (hub sets, transitions, native results) are rebuilt; the OS file cache is warm)
  // warm: the same connection, 5 repetitions after one discarded run
  const classes = [['name lookup (BM25 in SQL, top 20)', null], ...Object.entries(CLASSES_Q)];
  for (const [name, c] of classes) {
    const cold = []; const warm = []; const sizes = []; const setup = []; const eng = [];
    for (const s of seeds) {
      let t = now(); const g = await PgqGraph.open(BENCH_DB, { threads: THREADS }); opens.push(now() - t);
      t = now(); const r0 = c ? await runClass(g, c, s, true) : null; const out = c ? r0.ranked : await nameLookup(g, s);
      cold.push(now() - t); sizes.push(out.length); if (r0) { setup.push(r0.meta.setup_ms); eng.push(r0.engine_ms); }
      for (let k = 0; k < 6; k++) { t = now(); if (c) await runClass(g, c, s); else await nameLookup(g, s); if (k) warm.push(now() - t); }
      await g.close();
    }
    res[name] = { cold: stats(cold), warm: stats(warm), cold_connection_cache_setup_ms: setup.length ? stats(setup) : null, result_size_p50: pct(sizes, 0.5), result_size_max: Math.max(...sizes) };
    process.stderr.write(name + ' ' + JSON.stringify(res[name]) + '\n');
  }
  const qs = fs.readFileSync(path.join(P.TASKS, 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === 'tune');
  const cold = []; const warm = [];
  for (const q of qs) {
    const tg = tq.target(q);
    const g = await PgqGraph.open(BENCH_DB, { threads: THREADS });
    let t = now(); await tq.answer(g, q, tg); cold.push(now() - t);
    for (let k = 0; k < 6; k++) { t = now(); await tq.answer(g, q, tg); if (k) warm.push(now() - t); }
    await g.close();
  }
  res['TQ typed path-pattern queries (20 tune targets; the TQ graph is stored)'] = { cold: stats(cold), warm: stats(warm) };
  return { classes: res, open_ms: stats(opens), note: 'open = new DuckDB instance on the store file (READ_ONLY), load the extension, read the rowid map, kinds and meta; cold = the first query on that instance, including its connection-cache setup (reported apart as cold_connection_cache_setup_ms)' };
}

async function sizes(file) {
  const db = await S_.connect(file, { config: { access_mode: 'READ_ONLY' } });
  const tabs = await db.all("SELECT table_name AS t, estimated_size AS rows, column_count AS cols FROM duckdb_tables() WHERE database_name = current_database() ORDER BY table_name");
  const out = [];
  for (const x of tabs) {
    const b = await db.one(`SELECT count(DISTINCT block_id) AS blocks FROM pragma_storage_info('${x.t}') WHERE block_id >= 0`);
    out.push({ name: x.t, rows: x.rows, columns: x.cols, blocks_256KiB: b.blocks });
  }
  const ds = await db.one('PRAGMA database_size');
  db.close();
  const big = out.filter((x) => !x.name.startsWith('l_'));
  const lab = out.filter((x) => x.name.startsWith('l_'));
  return { file_bytes: fs.statSync(file).size, database_size: ds, tables: big,
    label_tables: { count: lab.length, rows: lab.reduce((a, x) => a + x.rows, 0), blocks_256KiB: lab.reduce((a, x) => a + x.blocks_256KiB, 0) } };
}

// One-file change: delete every edge touching one file's nodes (and their evidence, label-table, arc,
// TQ-label, co-change and posting rows), rewrite the nodes in place (UPDATE keeps rowid = id - 1, which the CSR functions
// need), re-insert the edges, then repair the derived rows (dl, deg, transport, df) of the affected nodes
// and terms. The facts are the same, so the result must equal a fresh build (checked table by table, and
// by re-running three configurations on the 30 bench seeds against both stores).
async function updateOneFile(G, file, F) {
  const db = await S_.connect(file);
  const T = {}; let t = now();
  const ids = G.nodes.filter((n) => n.path === F).map((n) => n.i);
  const idSet = new Set(ids);
  const edges = G.edges.filter((e) => idSet.has(e.s) || idSet.has(e.d));
  const IDS = ids.join(', ');
  const labelTabs = new Set((await db.all("SELECT table_name AS t FROM duckdb_tables() WHERE table_name LIKE 'l\\_%' ESCAPE '\\'")).map((r) => r.t));
  await db.run('BEGIN TRANSACTION');
  await db.run(`CREATE TEMP TABLE nb AS SELECT DISTINCT dst AS id FROM edge WHERE src IN (${IDS}) UNION SELECT DISTINCT src FROM edge WHERE dst IN (${IDS}) UNION SELECT id FROM node WHERE id IN (${IDS})`);
  await db.run(`CREATE TEMP TABLE aterm AS SELECT DISTINCT term FROM term WHERE node IN (${IDS})`);
  await db.run(`DELETE FROM edge_ev WHERE src IN (${IDS}) OR dst IN (${IDS})`);
  await db.run(`DELETE FROM edge WHERE src IN (${IDS}) OR dst IN (${IDS})`);
  for (const l of labelTabs) await db.run(`DELETE FROM ${l} WHERE src IN (${IDS}) OR dst IN (${IDS})`);
  await db.run(`DELETE FROM cochange WHERE a IN (${IDS}) OR b IN (${IDS})`);
  // the arc table and the TQ label tables under the stored property graphs (the graph definitions over
  // them need no change)
  const touch = `src IN (${IDS}) OR dst IN (${IDS})`;
  const kidMap = new Map(G.kinds.map((k, i) => [k, i + 1]));
  await db.run(`DELETE FROM arc WHERE ${touch}`);
  for (const [n] of S_.tqLabelDefs(kidMap)) await db.run(`DELETE FROM ${n} WHERE ${touch}`);
  await db.run(`DELETE FROM term WHERE node IN (${IDS})`);
  T.delete_ms = now() - t; t = now();
  const L_ = S_.lit; const v = (x) => (x === null || x === undefined ? 'NULL' : typeof x === 'number' ? String(x) : L_(x));
  await db.run(`CREATE TEMP TABLE nn AS SELECT * FROM (VALUES ${ids.map((i) => { const n = G.nodes[i - 1]; return `(${[n.i, n.sid, n.kind, n.path, n.name, n.ls, n.le, n.runtime, n.slice, n.is_test, n.file, n.tokens, n.text].map(v).join(', ')})`; }).join(', ')})
    t(id, sid, kind, path, name, ls, le, runtime, slice, is_test, file, tokens, text)`);
  await db.run(`UPDATE node SET sid = nn.sid, kind = nn.kind, path = nn.path, name = nn.name, ls = nn.ls, le = nn.le, runtime = nn.runtime, slice = nn.slice,
    is_test = nn.is_test, file = nn.file, tokens = nn.tokens, text = nn.text,
    dl = CASE WHEN nn.text IS NULL OR nn.text = '' THEN 0 ELSE len(string_split(nn.text, ' ')) END FROM nn WHERE node.id = nn.id`);
  const D = (x) => `${Number(x)}::DOUBLE`;
  const kidOf = new Map(G.kinds.map((k, i) => [k, i + 1]));
  if (edges.length) {
    await db.run('INSERT INTO edge VALUES ' + edges.map((e) => `(${e.s}, ${e.d}, ${kidOf.get(e.kind)}, ${e.c}, ${D(e.w)}, ${e.n}, ${e.kind === 'co_changed' ? 1 : 0})`).join(', '));
    // an empty CSV field loads as NULL in the fresh build, so an empty string is written as NULL here too
    const ve = (x) => (x === '' ? 'NULL' : v(x));
    const evs = []; for (const e of edges) for (const [p, l, op] of e.evs) evs.push(`(${e.s}, ${e.d}, ${kidOf.get(e.kind)}, ${ve(p)}, ${ve(l)}, ${ve(op)})`);
    if (evs.length) await db.run('INSERT INTO edge_ev VALUES ' + evs.join(', '));
    const byLab = new Map(); for (const e of edges) { const l = S_.labelOf(e.kind, e.cls); if (!byLab.has(l)) byLab.set(l, []); byLab.get(l).push(`(${e.s}, ${e.d}, ${D(e.w)}, ${e.n})`); }
    for (const [l, rows] of byLab) { if (!labelTabs.has(l)) await db.run(`CREATE TABLE ${l}(src BIGINT, dst BIGINT, w DOUBLE, n_ev INTEGER)`); await db.run(`INSERT INTO ${l} VALUES ${rows.join(', ')}`); }
    const cc = edges.filter((e) => e.kind === 'co_changed');
    if (cc.length) await db.run('INSERT INTO cochange VALUES ' + cc.map((e) => `(${e.s}, ${e.d}, ${D(e.w)}), (${e.d}, ${e.s}, ${D(e.w)})`).join(', '));
  }
  await db.run(`INSERT INTO arc ${S_.arcSelect(touch)}`);
  for (const [n, sql] of S_.tqLabelDefs(kidMap)) await db.run(`INSERT INTO ${n} SELECT * FROM (${sql}) WHERE ${touch}`);
  await db.run(`INSERT INTO term SELECT id, t, count(*)::INTEGER FROM (SELECT id, unnest(string_split(text, ' ')) AS t FROM node WHERE id IN (${IDS}) AND text IS NOT NULL AND text <> '') GROUP BY id, t`);
  T.insert_ms = now() - t; t = now();
  await db.run(`INSERT INTO aterm SELECT DISTINCT term FROM term WHERE node IN (${IDS})`);
  await db.run('DELETE FROM df WHERE term IN (SELECT term FROM aterm)');
  await db.run('INSERT INTO df SELECT term, count(*)::INTEGER FROM term WHERE term IN (SELECT DISTINCT term FROM aterm) GROUP BY term');
  await db.run('DELETE FROM deg WHERE node IN (SELECT id FROM nb)');
  await db.run(`INSERT INTO deg SELECT node, cid, count(*)::INTEGER FROM (
      SELECT e.dst AS node, e.cid FROM edge e JOIN node s ON s.id = e.src WHERE s.is_test = 0 AND e.dst IN (SELECT id FROM nb)
      UNION ALL SELECT e.src, e.cid FROM edge e JOIN node d ON d.id = e.dst WHERE e.sym = 1 AND d.is_test = 0 AND e.src IN (SELECT id FROM nb)) GROUP BY node, cid`);
  await db.run(`UPDATE node SET transport = CASE WHEN kind IN ('runtime', 'slice', 'invariant_group', 'ambiguous_ref', 'missing_ref')
      OR (kind IN ('function', 'method', 'class') AND is_test = 0 AND id IN (
        SELECT e.dst FROM edge e JOIN node x ON x.id = e.src JOIN ekind k ON k.kid = e.kid
        WHERE k.name IN ('calls', 'depends_injects', 'passes_callable') AND e.sym = 0 AND x.is_test = 0 AND x.slice IS NOT NULL AND e.dst IN (SELECT id FROM nb)
        GROUP BY e.dst HAVING count(DISTINCT coalesce(x.runtime, 'null') || '/' || x.slice) >= 3)) THEN 1 ELSE 0 END WHERE id IN (SELECT id FROM nb)`);
  T.derived_ms = now() - t; t = now();
  await db.run('COMMIT');
  await db.run('CHECKPOINT');
  T.commit_checkpoint_ms = now() - t;
  T.total_ms = T.delete_ms + T.insert_ms + T.derived_ms + T.commit_checkpoint_ms;
  T.nodes_rewritten = ids.length; T.edges_replaced = edges.length;
  T.rowid_identity_kept = (await db.one('SELECT count(*) AS n FROM (SELECT rowid AS r, id FROM node) WHERE r <> id - 1')).n === 0;
  db.close();
  return T;
}

async function sameStore(a, b) {
  const A = await S_.connect(':memory:'); await A.run(`ATTACH ${S_.lit(a)} AS a (READ_ONLY)`); await A.run(`ATTACH ${S_.lit(b)} AS b (READ_ONLY)`);
  const tabs = (await A.all("SELECT table_name AS t FROM duckdb_tables() WHERE database_name = 'a' AND table_name <> 'meta' ORDER BY 1")).map((r) => r.t);
  const r = {};
  for (const t of tabs) {
    const d = await A.one(`SELECT (SELECT count(*) FROM (SELECT * FROM a.${t} EXCEPT ALL SELECT * FROM b.${t})) + (SELECT count(*) FROM (SELECT * FROM b.${t} EXCEPT ALL SELECT * FROM a.${t})) AS n,
      (SELECT count(*) FROM a.${t}) AS na, (SELECT count(*) FROM b.${t}) AS nb`);
    r[t] = d.n === 0 && d.na === d.nb;
  }
  A.close();
  const all = Object.values(r).every(Boolean);
  return { all_tables_equal: all, tables_compared: tabs.length, unequal: Object.entries(r).filter(([, x]) => !x).map(([k]) => k) };
}
async function sameRankings(a, b, G) {
  const seeds = benchSeeds(G); const ga = await PgqGraph.open(a, { threads: THREADS }); const gb = await PgqGraph.open(b, { threads: THREADS });
  let n = 0; let diff = 0;
  for (const c of [cfg({}), cfg({ traversal: RS.METAPATH }), cfg({ traversal: RS.STAGE1.find((x) => x.name === 'budget=B1').traversal, rank: { mode: 'text' } })]) {
    for (const s of seeds) { n++; const x = await ga.rank(s.ids, c, s.seed); const y = await gb.rank(s.ids, c, s.seed); if (JSON.stringify(x.ranked) !== JSON.stringify(y.ranked)) diff++; }
  }
  await ga.close(); await gb.close();
  return { rankings_compared: n, rankings_different: diff };
}

// EXPLAIN of the statements one rank() call issues (captured while it runs), and of every TQ query
async function plans(G) {
  const g = await PgqGraph.open(BENCH_DB, { threads: THREADS });
  g.noTx = true; // a failed EXPLAIN inside rank()'s transaction would abort it
  const s0 = benchSeeds(G)[0]; const out = []; let label = '';
  const orig = g.run.bind(g); const seen = new Set();
  g.run = async (sql) => {
    const m = sql.match(/^CREATE OR REPLACE TEMP TABLE (q_\w+) AS([\s\S]*)$/);
    // (cheapest_path_length is not explained: planning the statement frees the CSR it is about to read)
    if (m && label && !seen.has(label + m[1]) && !/cheapest_path_length/.test(sql)) {
      seen.add(label + m[1]);
      try { const r = await g.db.all('EXPLAIN ' + m[2]); out.push(`### ${label} :: ${m[1]}\n` + r.map((x) => x.explain_value).join('\n')); } catch (e) { out.push(`### ${label} :: ${m[1]}\n(EXPLAIN failed: ${String(e.message).split('\n')[0]})`); }
    }
    return orig(sql);
  };
  for (const [name, c] of Object.entries({ 'base (khop 2, PPR)': cfg({}), 'budget B1': CLASSES_Q['budget B1 (recursive CTE, SQL)'], 'metapath': CLASSES_Q['metapath defs>code1-2>tests (PGQ fixed patterns)'],
    'text': CLASSES_Q['ranked: text (BM25 in SQL), 2 hops'], 'native wsp': CLASSES_Q['native: weighted shortest path (cheapest_path_length), 2 hops'] })) { label = name; await runClass(g, c, s0); }
  label = '';
  const qs = fs.readFileSync(path.join(P.TASKS, 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === 'tune');
  await tq.ensureGraph(g);
  const done = new Set();
  for (const q of qs) {
    if (done.has(q.kind)) continue; done.add(q.kind);
    const tg = tq.target(q);
    const names = { screen_tables: ['screen_tables_heads'], tests_reach: ['tests_reach_real', 'tests_reach_fake'], route_clients: ['route_call_sites', 'route_via_bff', 'route_direct_callers'] }[q.kind] || [q.kind];
    for (const k of names) {
      try { const r = await g.db.all('EXPLAIN ' + tq.fill(g, tq.Q[k], { ...tg, sid: tg.sid, heads: { raw: '0' } })); out.push(`### TQ ${k}\n` + r.map((x) => x.explain_value).join('\n')); } catch (e) { out.push(`### TQ ${k}\n(EXPLAIN failed: ${String(e.message).split('\n')[0]})`); }
    }
  }
  await g.close();
  const text = out.join('\n\n');
  const ops = {}; for (const m of text.matchAll(/╭─ ([A-Za-z_ ]+?) ─/g)) ops[m[1]] = (ops[m[1]] || 0) + 1;
  const fns = {}; for (const f of ['iterativelength', 'shortestpath', 'cheapest_path_length', 'create_csr_edge', 'create_csr_vertex', 'pagerank', 'weakly_connected_component']) fns[f] = (text.match(new RegExp(f, 'g')) || []).length;
  return { text, operators: ops, extension_functions_in_plans: fns };
}

// lines of query code per algorithm (non-empty, non-comment lines of the JS methods that hold the SQL/PGQ)
function loc() {
  const src = fs.readFileSync(path.join(__dirname, 'pgq.js'), 'utf8').split('\n');
  const method = (name) => {
    const i = src.findIndex((l) => new RegExp('^  (async )?' + name + '\\(').test(l)); if (i < 0) return 0;
    let j = i + 1; while (j < src.length && src[j] !== '  }') j++;
    return src.slice(i, j + 1).filter((l) => l.trim() && !l.trim().startsWith('//')).length;
  };
  const fn = (name) => {
    const i = src.findIndex((l) => l.startsWith('function ' + name + '(')); if (i < 0) return 0;
    let j = i + 1; while (j < src.length && src[j] !== '}') j++;
    return src.slice(i, j + 1).filter((l) => l.trim() && !l.trim().startsWith('//')).length;
  };
  const branch = (mode) => {
    const i = src.findIndex((l) => l.includes(`if (rk.mode === '${mode}'`)); if (i < 0) return 0;
    let j = i + 1; let depth = (src[i].match(/{/g) || []).length - (src[i].match(/}/g) || []).length;
    while (j < src.length && depth > 0) { depth += (src[j].match(/{/g) || []).length - (src[j].match(/}/g) || []).length; j++; }
    return src.slice(i, j).filter((l) => l.trim() && !l.trim().startsWith('//')).length;
  };
  const st = fs.readFileSync(path.join(__dirname, 'store.js'), 'utf8').split('\n');
  const storeGraphLines = st.filter((l) => !l.trim().startsWith('//') && /arcSelect|ARC_COST|PROPERTY GRAPH|edgeTable|TQ_SINGLE|tqLabelDefs\(kid\)/.test(l)).length;
  const groups = {
    'k-hop (bounded: recursive CTE, or PGQ one-edge pattern per level; unbounded: CSR + iterativelength; PGQ one-edge DAG; parents)': { lines: method('khop') + method('csrCtes'), layer: 'bounded: SQL recursive CTE (default) or PGQ pattern per level; unbounded: PGQ extension functions; DAG: PGQ pattern; explanation chain in SQL' },
    'per-edge-class budgets': { lines: method('budget') + method('statePaths'), layer: 'SQL (recursive CTE USING KEY); not expressible as a path pattern' },
    'ordered metapath': { lines: method('metapath') + fn('stepPred'), layer: 'PGQ fixed-length patterns over the stored graph (one filtered arc edge per step), UNION ALL; state DAG in SQL' },
    'projection (direction, classes, minConf, hub cut) as a filter on the stored arc label': { lines: fn('arcPred') + fn('blockPred') + method('blockedSeeds'), layer: 'SQL predicate inside PGQ element filters and CSR row sources; no per-configuration table or graph' },
    'stored property graphs g, gtq and the arc table (store build, once per store)': { lines: storeGraphLines, layer: 'CREATE TABLE arc, CREATE PROPERTY GRAPH' },
    'hub cuts (in-degree, transport)': { lines: method('hubSet'), layer: 'SQL' },
    'rank: traversal order (bfs)': { lines: branch('bfs'), layer: 'SQL' },
    'rank: degree-normalised': { lines: branch('degnorm'), layer: 'SQL, one statement per level from application code' },
    'rank: personalised PageRank': { lines: method('ppr') + method('transitions') + method('transSql') + branch('ppr\' || rk.mode === \'x_ppr_lift'), layer: 'SQL (recursive CTE, 40 iterations); DuckPGQ pagerank() is global only' },
    'rank: co-change weight': { lines: branch('cochange'), layer: 'SQL' },
    'rank: text match (BM25)': { lines: branch('text'), layer: 'SQL (no fts extension in the image)' },
    'rank: hybrid (RRF) and final ordering': { lines: method('order'), layer: 'SQL' },
    'native: pagerank() variant': { lines: method('nativePagerank') + branch('ppr\' && rk.variant'), layer: 'DuckPGQ pagerank() (scalar, over a CSR of the projected arcs)' },
    'native: weighted shortest path': { lines: method('weightedShortest') + branch('x_wsp'), layer: 'DuckPGQ cheapest_path_length over create_csr_edge with weights' },
    'native: WCC community prior': { lines: method('nativeWcc'), layer: 'DuckPGQ weakly_connected_component() (scalar, over a CSR)' },
  };
  const t = fs.readFileSync(path.join(__dirname, 'store.js'), 'utf8');
  const tqo = {}; for (const [k, v] of Object.entries(tq.Q)) tqo[k] = v.split('\n').filter((x) => x.trim()).length;
  const count = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n').filter((x) => x.trim() && !x.trim().startsWith('//')).length;
  return { lines_per_algorithm: groups, tq_query_lines_per_kind: tqo, tq_label_declarations_lines: (t.match(/function tqLabelDefs[\s\S]*?\n}/) || [''])[0].split('\n').length,
    file_lines: { 'pgq.js': count('pgq.js'), 'store.js': count('store.js'), 'tq.js': count('tq.js'), 'arm.js': count('arm.js') } };
}

// the one-file-update copy keeps the store's file name, in a side folder: a stored property graph records
// its database name, which is the file name without the extension
function updCopy() { const d = path.join(path.dirname(BENCH_DB), 'upd'); fs.mkdirSync(d, { recursive: true }); return path.join(d, path.basename(BENCH_DB)); }

async function memChild() {
  const r0 = process.memoryUsage().rss;
  const g = await PgqGraph.open(BENCH_DB, { threads: THREADS });
  const r1 = process.memoryUsage().rss;
  const G = loadFacts(P.FROZEN); const g1 = process.memoryUsage().rss;
  const seeds = benchSeeds(G);
  for (const s of seeds) for (const c of Object.values(CLASSES_Q)) await runClass(g, c, s);
  const r2 = process.memoryUsage().rss;
  const dm = await g.all('SELECT tag, memory_usage_bytes AS b FROM duckdb_memory() WHERE memory_usage_bytes > 0 ORDER BY b DESC');
  console.log(JSON.stringify({ rss_before_open: r0, rss_after_open: r1, rss_after_facts_loaded: g1, rss_after_all_query_classes: r2, duckdb_memory_after_queries: dm, memory_limit: '2GB', threads: THREADS }));
  await g.close();
}

async function debugPart(part) {
  const G = loadFacts(P.FROZEN);
  if (part === 'tq') { const qs = fs.readFileSync(path.join(P.TASKS, 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === 'tune');
    for (const q of qs) { const g = await PgqGraph.open(BENCH_DB, { threads: THREADS }); for (let k = 0; k < 3; k++) { try { await tq.answer(g, q); } catch (e) { console.log('TQ', q.id, k, String(e.message).slice(0, 300)); } } await g.close(); } }
  if (part === 'plans') { const pl = await plans(G); console.log(pl.text.length, JSON.stringify(pl.operators), JSON.stringify(pl.extension_functions_in_plans)); console.log(JSON.stringify(loc(), null, 1)); }
  if (part === 'update') { const copy = updCopy(); fs.copyFileSync(BENCH_DB, copy);
    try { console.log(JSON.stringify(await updateOneFile(G, copy, 'backend/app/features/jobs/service.py'))); console.log(JSON.stringify(await sameStore(BENCH_DB, copy))); console.log(JSON.stringify(await sameRankings(BENCH_DB, copy, G))); } catch (e) { console.log('UPDATE', e.stack); } fs.rmSync(copy, { force: true }); }
}

async function main() {
  if (process.argv[2] === 'mem') return memChild();
  if (process.argv[2] === 'debug') return debugPart(process.argv[3]);
  fs.mkdirSync(OUT, { recursive: true });
  const ver = await S_.connect(':memory:'); const v = await ver.one('SELECT version() AS v'); await S_.loadPgq(ver);
  const ext = await ver.one("SELECT extension_version AS e FROM duckdb_extensions() WHERE extension_name = 'duckpgq'"); ver.close();
  const res = { commit: P.FROZEN, duckdb: v.v, duckpgq: ext.e, node: process.version, threads: THREADS, store_location: path.dirname(BENCH_DB) };
  const loads = [];
  for (let k = 0; k < 3; k++) {
    fs.rmSync(BENCH_DB, { force: true });
    let t = now(); const G = loadFacts(P.FROZEN); const tl = now() - t;
    t = now(); const m = await S_.buildStore(G, BENCH_DB); const tb = now() - t;
    loads.push({ facts_load_ms: +tl.toFixed(1), build_ms: +tb.toFixed(1), export_csv_ms: Number(m.export_ms), bulk_load_and_derived_ms: Number(m.load_ms), label_tables_ms: Number(m.labels_ms), arc_table_and_stored_graphs_ms: Number(m.graph_ms), load_check_ms: Number(m.check_ms), bytes: m.bytes });
    process.stderr.write('load ' + JSON.stringify(loads[k]) + '\n');
  }
  res.load = loads;
  res.disk = await sizes(BENCH_DB);
  const G = loadFacts(P.FROZEN);
  res.graph = { nodes: G.nodes.length, edges_unique: G.edges.length, edge_evidence_rows: G.edges.reduce((a, e) => a + e.n, 0) };
  res.memory = JSON.parse(execFileSync(process.execPath, [__filename, 'mem'], { env: process.env }).toString().trim().split('\n').pop());
  res.latency = await latency(G);
  const copy = updCopy();
  const F = 'backend/app/features/jobs/service.py';
  fs.copyFileSync(BENCH_DB, copy);
  res.update_one_file = { file: F, ...(await updateOneFile(G, copy, F)), note: 'the stored property graphs are definitions over the updated tables and need no change; connection caches (hub sets, transitions, native results) are temp tables rebuilt after the next open; a change that adds or removes nodes renumbers the canonical ids, so it needs a full rebuild (see load.build_ms)' };
  res.update_one_file.equal_to_fresh_build = await sameStore(BENCH_DB, copy);
  res.update_one_file.same_rankings_as_fresh_build = await sameRankings(BENCH_DB, copy, G);
  fs.rmSync(copy, { force: true }); fs.rmSync(copy + '.wal', { force: true });
  const pl = await plans(G);
  fs.writeFileSync(path.join(OUT, 'query_plans.txt'), pl.text + '\n');
  res.plans = { operators: pl.operators, extension_functions_in_plans: pl.extension_functions_in_plans };
  res.lines_of_query_code = loc();
  fs.writeFileSync(path.join(OUT, 'duckpgq.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ load: loads.map((l) => l.build_ms), disk: res.disk.file_bytes, memory: res.memory.rss_after_all_query_classes, update: res.update_one_file }, null, 1));
}

main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
