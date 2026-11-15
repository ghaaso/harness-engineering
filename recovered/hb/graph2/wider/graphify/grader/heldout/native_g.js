'use strict';
// Grader, graphify held-out, step 3: G-5, the native form (addendum 7 item 15).
// graphify's own printed answer to `graphify query "<name> <path>"` at its defaults (budget 2,000 by its
// own count, depth 2, breadth-first), kept by the runner in answers/heldout/native/query-text.T1.jsonl.gz.
// Matching rule: a reference file is "named" when its full repository path appears in the text as a whole
// path (not followed or preceded by another path character). Only reference FILES are scored (item 15).
// The seed file is never a reference file of its own task in the arms' answers (the shared projection
// drops it); the count of tasks whose reference lists the seed file is reported, and those files are
// scored as they come (named or not) for the native text, which may print the seed file.
// Compared with each arm's file recall inside its 2,000-token answer (score.js file_r2000, same tasks),
// per commit, paired bootstrap (compare.js pairedStats, 10,000, seed 20261112). Descriptive.
// Writes native_g.json (aggregates, per-commit difference arrays) and native_g.tasks.jsonl.gz (per task,
// grader only: the named reference files of each task).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const G = path.resolve(__dirname, '..', '..');
const BUILD = path.resolve(G, '..', '..', 'build');
const S = require(path.join(BUILD, 'arms', 'common', 'score'));
const CMP = require(path.join(BUILD, 'arms', 'common', 'compare'));
const H = require(path.join(BUILD, 'arms', 'common', 'harness'));
const OUT = __dirname;
const SEED = 20261112; const NRES = 10000;
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const REFS = path.join(BUILD, 'sealed', 'grader', 'heldout', 'refs_heldout.jsonl');
const refs = S.readRefs(REFS);
const tasks = new Map(fs.readFileSync(path.join(BUILD, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { const t = JSON.parse(l); return [t.id, t]; }));
const per = zlib.gunzipSync(fs.readFileSync(path.join(OUT, 'tasks.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const named = (text, p) => new RegExp('(^|[^A-Za-z0-9_./-])' + esc(p) + '($|[^A-Za-z0-9_./-])').test(text);
const out = { written_at: new Date().toISOString(), matching_rule: 'a reference file counts when its full repository path appears in graphify\'s printed default answer as a whole path', sets: {} };
const perTask = [];
for (const set of ['T1', 'T1x', 'T2', 'T3', 'T4']) {
  const nat = H.readGzJsonl(path.join(G, 'answers', 'heldout', 'native', 'query-text.' + set + '.jsonl.gz'));
  const rows = []; let seedIsRef = 0; let filesTotal = 0; let filesNamed = 0; let noFiles = 0;
  const pathsInText = [];
  for (const a of nat) {
    const ref = refs.get(a.id); const t = tasks.get(a.id);
    const pathSet = new Set((a.text.match(/src=([^\s\]]+)/g) || []).map((x) => x.slice(4)));
    pathsInText.push(pathSet.size);
    if (!ref.files.length) { noFiles++; continue; }
    if (ref.files.includes(t.seed.path)) seedIsRef++;
    const hit = ref.files.filter((p) => named(a.text, p));
    filesTotal += ref.files.length; filesNamed += hit.length;
    rows.push({ id: a.id, cluster: ref.cluster, native_file_recall: hit.length / ref.files.length, tokens: a.tokens, exit: a.exit, distinct_files_in_text: pathSet.size });
    perTask.push({ set, id: a.id, reference_files: ref.files.length, named_reference_files: hit, tokens: a.tokens });
  }
  // cluster means
  const cm = (vals) => { const g = new Map(); for (const v of vals) { if (!g.has(v.cluster)) g.set(v.cluster, []); g.get(v.cluster).push(v.x); } return new Map([...g].map(([k, xs]) => [k, S.mean(xs)])); };
  const natC = cm(rows.map((r) => ({ cluster: r.cluster, x: r.native_file_recall })));
  const ids = new Set(rows.map((r) => r.id));
  const blk = { tasks_scored: rows.length, tasks_without_reference_files: noFiles, tasks_where_reference_lists_seed_file: seedIsRef, commits: natC.size,
    native_file_recall: r4(S.mean([...natC.values()])), native_file_recall_pooled: r4(filesNamed / filesTotal),
    native_tokens_median: S.median(nat.map((a) => a.tokens)), native_tokens_min: Math.min(...nat.map((a) => a.tokens)), native_tokens_max: Math.max(...nat.map((a) => a.tokens)),
    native_distinct_files_named_median: S.median(pathsInText), arms: {} };
  for (const arm of ['graphify', 'relational', 'search', 'floor-co', 'floor-dir']) {
    const ts = per.filter((x) => x.arm === arm && x.set === set && ids.has(x.id));
    const ac = cm(ts.map((x) => ({ cluster: x.cluster, x: x.file_r2000 })));
    const ps = CMP.pairedStats(natC, ac, NRES, SEED);
    const keys = [...natC.keys()].filter((k) => ac.has(k)).sort();
    blk.arms[arm] = { file_recall_2000: r4(S.mean([...ac.values()])), tokens_2000_median: S.median(ts.map((x) => x.tok2000)),
      native_minus_arm: { diff: r4(ps.diff), ci95: ps.ci95 && ps.ci95.map(r4), commits: ps.clusters, per_commit_diffs: keys.map((k) => r4(natC.get(k) - ac.get(k))) } };
  }
  out.sets[set] = blk;
  console.log(set, JSON.stringify({ ...blk, arms: Object.fromEntries(Object.entries(blk.arms).map(([k, v]) => [k, { f: v.file_recall_2000, tok: v.tokens_2000_median, d: v.native_minus_arm.diff, ci: v.native_minus_arm.ci95 }])) }));
}
fs.writeFileSync(path.join(OUT, 'native_g.json'), JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(OUT, 'native_g.tasks.jsonl.gz'), zlib.gzipSync(perTask.map((x) => JSON.stringify(x)).join('\n') + '\n'));
