'use strict';
// Grader, graphify held-out, step 6: build cost per held-out parent commit, graphify against the typed facts.
// graphify: graphs/<key>/build.json (extract seconds inside the container, whole container seconds,
// graph.json bytes, nodes, edges) for the 79 held-out graphs (70 parents without removal, 9 with one
// removed document). Typed facts: facts/cache/<parent>/meta.json timings_ms and counts, bytes of
// nodes.jsonl + edges.jsonl + commits.jsonl, for the 74 held-out parents (removal is a load-time filter
// there, so there is one build per parent). Writes buildcost.json (aggregates).
const fs = require('fs');
const path = require('path');
const G = path.resolve(__dirname, '..', '..');
const BUILD = path.resolve(G, '..', '..', 'build');
const r2 = (x) => Math.round(x * 100) / 100;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
const stat = (xs) => ({ n: xs.length, median: r2(median(xs)), min: r2(Math.min(...xs)), max: r2(Math.max(...xs)), sum: r2(xs.reduce((a, b) => a + b, 0)) });
const tasks = fs.readFileSync(path.join(BUILD, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((t) => t.split === 'heldout' && t.set !== 'T5');
const parents = [...new Set(tasks.map((t) => t.parent))];
const own = JSON.parse(fs.readFileSync(path.join(G, 'answers', 'heldout', 'own_checks.json'), 'utf8')).graphs;
const gb = own.map((g) => ({ ...g, ...JSON.parse(fs.readFileSync(path.join(G, 'graphs', g.key, 'build.json'), 'utf8')) }));
const typed = parents.map((p) => {
  const d = path.join(BUILD, 'facts', 'cache', p); const m = JSON.parse(fs.readFileSync(path.join(d, 'meta.json'), 'utf8'));
  const bytes = ['nodes.jsonl', 'edges.jsonl', 'commits.jsonl'].reduce((s, f) => s + (fs.existsSync(path.join(d, f)) ? fs.statSync(path.join(d, f)).size : 0), 0);
  const tm = m.timings_ms || {}; const total = tm.total != null ? tm.total : Object.values(tm).filter((v) => typeof v === 'number').reduce((a, b) => a + b, 0);
  return { p, nodes: m.counts.nodes_total, edges: m.counts.edges_total, bytes, seconds: total / 1000, timing_keys: Object.keys(tm) };
});
// paired by parent, graphs without removal only
const noRm = new Map(gb.filter((g) => !g.remove_paths.length).map((g) => [g.parent, g]));
const paired = typed.filter((t) => noRm.has(t.p)).map((t) => ({ nodes_ratio: noRm.get(t.p).nodes / t.nodes, edges_ratio: noRm.get(t.p).edges / t.edges, bytes_ratio: noRm.get(t.p).graph_bytes / t.bytes, time_ratio: noRm.get(t.p).extract_s / t.seconds }));
const out = { written_at: new Date().toISOString(),
  graphify: { graphs: gb.length, parents_without_removal: noRm.size, extract_seconds: stat(gb.map((g) => g.extract_s)), container_seconds: stat(gb.map((g) => g.container_s)), graph_json_megabytes: stat(gb.map((g) => g.graph_bytes / 1e6)), nodes: stat(gb.map((g) => g.nodes)), edges: stat(gb.map((g) => g.edges)), source_files: stat(gb.map((g) => g.source_files)),
    note: 'extract = `graphify extract --code-only --max-workers 6` inside the container (6 CPUs, 4 GB, network off); container = start, unpack, extract, copy, counts. graph.json only (the per-file AST cache was not kept).' },
  typed_facts: { parents: typed.length, build_seconds: stat(typed.map((t) => t.seconds)), stored_megabytes: stat(typed.map((t) => t.bytes / 1e6)), nodes: stat(typed.map((t) => t.nodes)), edges: stat(typed.map((t) => t.edges)), timing_keys: typed[0].timing_keys,
    note: 'meta.json timings_ms of the shared extractor (all stages it records: export, Python, TypeScript, documents, git history); built earlier by the facts lane under conditions not recorded here (not the same run, CPU limit or load as graphify), so times compare only roughly; stored = nodes.jsonl + edges.jsonl + commits.jsonl. Edges are evidence rows before the loader merges them.' },
  paired_by_parent: { parents: paired.length, median_nodes_ratio_graphify_over_typed: r2(median(paired.map((x) => x.nodes_ratio))), median_edges_ratio: r2(median(paired.map((x) => x.edges_ratio))), median_bytes_ratio: r2(median(paired.map((x) => x.bytes_ratio))), median_time_ratio: r2(median(paired.map((x) => x.time_ratio))) } };
fs.writeFileSync(path.join(__dirname, 'buildcost.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
