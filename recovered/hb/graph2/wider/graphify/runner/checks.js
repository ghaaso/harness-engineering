'use strict';
// Checks without references on the held-out run of the frozen graphify configuration, plus the
// set-named copies of the answer files and the inventory (sha256 per file). Reads no reference:
// only tasks.jsonl (seeds, parents, removed paths), tq_questions.jsonl (question text), the answer
// files, graphify's raw call output and the graph folders.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const G = path.resolve(__dirname, '..');
const BUILD = path.resolve(G, '..', '..', 'build');
const OUT = path.join(G, 'answers', 'heldout');
const GRAPHS = path.join(G, 'graphs');
const FZ = JSON.parse(fs.readFileSync(path.join(G, 'FROZEN.json'), 'utf8'));
const HASH = FZ.config_hash;
const SETS = ['T1', 'T1x', 'T2', 'T3', 'T4'];
const EXPECT = { T1: 418, T1x: 82, T2: 237, T3: 25, T4: 8 };
const BUDGETS = [2000, 4000, 8000, 16000];
const FROZEN_COMMIT = 'a31924a3818f4ac94b695906d107c72c912792b2';

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const gz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const jl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const max = (a) => (a.length ? Math.max(...a) : null);
const min = (a) => (a.length ? Math.min(...a) : null);
const sum = (a) => a.reduce((s, x) => s + x, 0);
const graphKey = (p, rp) => { const r = (rp || []).slice().sort(); return r.length ? p + '-rm-' + sha(r.join('\n')).slice(0, 8) : p; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// whole-path match: the path bounded by start/end, whitespace or the punctuation graphify and the packer print around paths
const wholePath = (p) => new RegExp('(^|[\\s\\[\\](=,\'"`])' + esc(p) + '($|[\\s\\]\\[):,\'"`])', 'm');

const res = { at: new Date().toISOString(), frozen: { config_name: FZ.config_name, config_hash: HASH, adapter_code_hash: FZ.adapter_code_hash }, ok: true, problems: [] };
const bad = (m) => { res.ok = false; if (res.problems.length < 300) res.problems.push(m); };

const tasks = jl(path.join(BUILD, 'tasks', 'tasks.jsonl')).filter((t) => t.split === 'heldout' && SETS.includes(t.set));
const byId = new Map(tasks.map((t) => [t.id, t]));

// ---- 1. answer files: complete, each task once, stored format, budgets ---------------------------
res.sets = {};
const copies = [];
for (const set of SETS) {
  const want = tasks.filter((t) => t.set === set).map((t) => t.id).sort();
  if (want.length !== EXPECT[set]) bad(set + ': ' + want.length + ' held-out tasks in tasks.jsonl, expected ' + EXPECT[set]);
  const hf = path.join(OUT, HASH + '.' + set + '.jsonl.gz');
  if (!fs.existsSync(hf)) { bad(set + ': answer file missing'); continue; }
  // the set-named copy (the stored layout <set>.jsonl.gz), byte-identical to the file the packer wrote
  const sf = path.join(OUT, set + '.jsonl.gz');
  const hb = fs.readFileSync(hf);
  if (!fs.existsSync(sf) || sha(fs.readFileSync(sf)) !== sha(hb)) fs.writeFileSync(sf, hb);
  copies.push({ set, from: path.basename(hf), to: path.basename(sf), sha256: sha(hb), identical: sha(fs.readFileSync(sf)) === sha(hb) });
  const recs = gz(sf);
  const ids = recs.map((r) => r.id);
  const have = new Set(ids);
  const s = { records: recs.length, expected: want.length, missing: want.filter((x) => !have.has(x)).length, duplicate: ids.length - have.size,
    foreign: ids.filter((x) => !want.includes(x)).length, header_mismatch: 0, budget_over: 0, padded_items: 0,
    empty: 0, empty_reasons: {}, empty_ids: [], seed_match: {}, seed_def_rule: {}, call_exit: {}, call_zero_nodes: 0, call_skipped: 0,
    files_in_list_median: null, files_in_list_min: null, files_in_list_max: null, tok8000_used_median: null, lookups_total: 0, ms_median: null,
    nodes_without_file_total: 0, nodes_unmapped_total: 0 };
  if (s.missing || s.duplicate || s.foreign || recs.length !== want.length) bad(set + ': ' + s.missing + ' missing, ' + s.duplicate + ' duplicate, ' + s.foreign + ' foreign');
  const units = []; const used8 = []; const ms = [];
  for (const r of recs) {
    if (r.arm !== 'graphify' || r.config_hash !== HASH || r.config_name !== FZ.config_name || r.split !== 'heldout' || r.set !== set || r.granularity !== 'file' || r.form !== 'signature' || r.pad !== 'none') { s.header_mismatch++; bad(r.id + ': header fields'); }
    const t = byId.get(r.id);
    if (t && r.parent !== t.parent) { s.header_mismatch++; bad(r.id + ': parent differs from tasks.jsonl'); }
    for (const b of BUDGETS) {
      const bb = r.budgets[b];
      if (!bb) { s.header_mismatch++; bad(r.id + ': budget ' + b + ' missing'); continue; }
      let tk = 0; for (let i = 0; i < bb.n_full; i++) tk += r.items[i].tok;
      if (bb.cut) tk += bb.cut.tok;
      if (bb.used > b || tk > b) { s.budget_over++; bad(r.id + ': budget ' + b + ' over (used ' + bb.used + ', shown ' + tk + ')'); }
    }
    if (r.items.some((it) => it.pad)) { s.padded_items++; bad(r.id + ': padded item'); }
    const m = r.meta || {};
    s.seed_match[r.seed_match] = (s.seed_match[r.seed_match] || 0) + 1;
    s.seed_def_rule[m.seed_def_rule] = (s.seed_def_rule[m.seed_def_rule] || 0) + 1;
    for (const c of m.calls || []) {
      const k = c.key + ':' + (c.skipped ? 'skipped' : c.exit);
      s.call_exit[k] = (s.call_exit[k] || 0) + 1;
      if (c.skipped) s.call_skipped++; else if (!c.n) s.call_zero_nodes++;
    }
    s.nodes_without_file_total += m.n_no_file || 0; s.nodes_unmapped_total += m.n_unmapped || 0;
    if (r.n_head === 0) {
      s.empty++; s.empty_ids.push(r.id);
      const why = m.empty_reason || 'NO REASON GIVEN';
      s.empty_reasons[why] = (s.empty_reasons[why] || 0) + 1;
      if (!m.empty_reason) bad(r.id + ': empty without a reason');
    }
    units.push(r.n_units); used8.push(r.budgets['8000'] ? r.budgets['8000'].used : 0); ms.push(r.ms); s.lookups_total += r.lookups;
  }
  s.files_in_list_median = med(units); s.files_in_list_min = min(units); s.files_in_list_max = max(units);
  s.tok8000_used_median = med(used8); s.ms_median = med(ms); s.ms_max = max(ms);
  res.sets[set] = s;
}
res.set_named_copies = copies;

// ---- 2. native form ------------------------------------------------------------------------------
res.native = {};
const nativeBySet = {};
for (const set of SETS) {
  const f = path.join(OUT, 'native', 'query-text.' + set + '.jsonl.gz');
  if (!fs.existsSync(f)) { bad('native ' + set + ': missing'); continue; }
  const recs = gz(f); nativeBySet[set] = recs;
  const want = tasks.filter((t) => t.set === set).length;
  const ids = new Set(recs.map((r) => r.id));
  const tok = recs.map((r) => r.tokens);
  res.native[set] = { records: recs.length, distinct_ids: ids.size, expected: want, exit_codes: recs.reduce((m, r) => { m[r.exit] = (m[r.exit] || 0) + 1; return m; }, {}),
    tokens_median: med(tok), tokens_min: min(tok), tokens_max: max(tok), empty_text: recs.filter((r) => !r.text).length };
  if (recs.length !== want || ids.size !== want) bad('native ' + set + ': ' + recs.length + ' records for ' + want);
}

// ---- 3. removed documents (T3, T4): never in an answer; whole-path match ---------------------------
res.removed = { tasks_with_removal: 0, paths_checked: 0, hits: [], graphs: [] };
const callCache = new Map();
const callsOf = (key) => { if (!callCache.has(key)) { const f = path.join(OUT, 'calls', key + '.jsonl.gz'); callCache.set(key, fs.existsSync(f) ? new Map(gz(f).map((r) => [r.id, r])) : null); } return callCache.get(key); };
const answerBySetId = {};
for (const set of ['T3', 'T4']) { const f = path.join(OUT, set + '.jsonl.gz'); answerBySetId[set] = fs.existsSync(f) ? new Map(gz(f).map((r) => [r.id, r])) : new Map(); }
const seenGraph = new Set();
for (const t of tasks.filter((x) => x.set === 'T3' || x.set === 'T4')) {
  const rp = t.remove_paths || [];
  if (!rp.length) continue;
  res.removed.tasks_with_removal++;
  const key = graphKey(t.parent, rp);
  const a = answerBySetId[t.set].get(t.id);
  const nat = (nativeBySet[t.set] || []).find((r) => r.id === t.id);
  const cr = (callsOf(key) || new Map()).get(t.id);
  if (!cr) bad(t.id + ': no raw graphify output for graph ' + key);
  for (const p of rp) {
    res.removed.paths_checked++;
    const re = wholePath(p);
    const where = [];
    if (a) {
      if (a.items.some((it) => it.path === p)) where.push('answer items');
      if ((a.beyond_sample || []).some((x) => x === p)) where.push('answer beyond_sample');
      if ((a.seeds || []).some((x) => x === 'file:' + p || x.startsWith('sym:' + p + '#'))) where.push('answer seeds');
    } else bad(t.id + ': answer record missing for removed-path check');
    if (nat && re.test(nat.text || '')) where.push('native text');
    if (cr) for (const [k, c] of Object.entries(cr.calls || {})) {
      if (re.test(c.stdout || '')) where.push('graphify stdout ' + k);
      if ((c.items || []).some((it) => it.file === p)) where.push('graphify items ' + k);
    }
    if (where.length) { res.removed.hits.push({ id: t.id, path: p, where }); bad(t.id + ': removed path ' + p + ' appears in ' + where.join(', ')); }
  }
  if (!seenGraph.has(key)) {
    seenGraph.add(key);
    const gdir = path.join(GRAPHS, key);
    const removedTxt = fs.existsSync(path.join(gdir, 'removed.txt')) ? fs.readFileSync(path.join(gdir, 'removed.txt'), 'utf8').split('\n').filter(Boolean) : [];
    const gj = JSON.parse(fs.readFileSync(path.join(gdir, 'graphify-out', 'graph.json'), 'utf8'));
    const inGraph = rp.filter((p) => gj.nodes.some((n) => n.source_file === p));
    res.removed.graphs.push({ key, parent: t.parent, remove_paths: rp, removed_txt: removedTxt, removed_paths_with_a_node_in_graph: inGraph });
    if (inGraph.length) bad(key + ': removed path still has a node in the graph: ' + inGraph.join(', '));
    if (rp.some((p) => !removedTxt.includes('removed ' + p))) bad(key + ': removed.txt does not list every removed path');
  }
}

// ---- 4. graphify raw calls: every task once, exit codes ---------------------------------------------
res.raw_calls = { graphs: 0, records: 0, distinct_ids: 0, exits: {}, timeouts: 0, ms_median_by_call: {}, ms_max_by_call: {} };
const keys = [...new Set(tasks.map((t) => graphKey(t.parent, t.remove_paths)))].sort();
const allIds = new Set(); const msBy = {};
for (const k of keys) {
  const m = callsOf(k);
  if (!m) { bad('raw calls missing for graph ' + k); continue; }
  res.raw_calls.graphs++;
  for (const r of m.values()) {
    res.raw_calls.records++; allIds.add(r.id);
    for (const [ck, c] of Object.entries(r.calls || {})) {
      const e = ck + ':' + (c.argv ? c.exit : 'skipped');
      res.raw_calls.exits[e] = (res.raw_calls.exits[e] || 0) + 1;
      if (c.exit === 'timeout') res.raw_calls.timeouts++;
      if (c.argv) (msBy[ck] = msBy[ck] || []).push(c.ms);
    }
  }
}
for (const [k, v] of Object.entries(msBy)) { res.raw_calls.ms_median_by_call[k] = med(v); res.raw_calls.ms_max_by_call[k] = max(v); }
res.raw_calls.distinct_ids = allIds.size;
if (allIds.size !== tasks.length) bad('raw calls cover ' + allIds.size + ' of ' + tasks.length + ' tasks');

// ---- 5. graphs: build time and counts per graph key ----------------------------------------------
res.graphs = [];
for (const k of keys) {
  const f = path.join(GRAPHS, k, 'build.json');
  if (!fs.existsSync(f)) { bad('graph ' + k + ' has no build.json'); continue; }
  const b = JSON.parse(fs.readFileSync(f, 'utf8'));
  res.graphs.push({ key: k, parent: b.sha, remove_paths: b.remove_paths, tasks: tasks.filter((t) => graphKey(t.parent, t.remove_paths) === k).length,
    sets: [...new Set(tasks.filter((t) => graphKey(t.parent, t.remove_paths) === k).map((t) => t.set))].sort(),
    built_at: b.built_at, extract_s: +b.extract_s.toFixed(2), container_s: +b.container_wall_s.toFixed(1), extract_exit: b.extract_exit,
    source_files: b.source_files, nodes: b.nodes, edges: b.edges, export_tar_bytes: b.export_tar_bytes, no_symbols_line: b.no_symbols_line });
  if (b.extract_exit !== 0) bad('graph ' + k + ' extract exit ' + b.extract_exit);
}
const ex = res.graphs.map((g) => g.extract_s); const cs = res.graphs.map((g) => g.container_s);
res.graph_summary = { count: res.graphs.length, extract_s_median: med(ex), extract_s_min: min(ex), extract_s_max: max(ex), container_s_median: med(cs), container_s_total: +sum(cs).toFixed(1),
  nodes_median: med(res.graphs.map((g) => g.nodes)), nodes_min: min(res.graphs.map((g) => g.nodes)), nodes_max: max(res.graphs.map((g) => g.nodes)),
  edges_median: med(res.graphs.map((g) => g.edges)), edges_min: min(res.graphs.map((g) => g.edges)), edges_max: max(res.graphs.map((g) => g.edges)),
  source_files_min: min(res.graphs.map((g) => g.source_files)), source_files_max: max(res.graphs.map((g) => g.source_files)) };
res.exports_left = fs.existsSync(path.join(G, 'exports')) ? fs.readdirSync(path.join(G, 'exports')) : [];
if (res.exports_left.length) bad('exports not deleted: ' + res.exports_left.join(', '));

// ---- 6. questions -------------------------------------------------------------------------------
const qs = jl(path.join(BUILD, 'tasks', 'tq_questions.jsonl')).filter((q) => q.split === 'held_out');
res.tq = { held_out_questions: qs.length, graph: FROZEN_COMMIT, graph_exists: fs.existsSync(path.join(GRAPHS, FROZEN_COMMIT, 'graphify-out', 'graph.json')), variants: {} };
if (qs.length !== 30) bad('tq: ' + qs.length + ' held-out questions, expected 30');
for (const v of ['default', 'b8000']) {
  const f = path.join(OUT, 'tq', 'graphify.held_out.' + v + '.jsonl');
  if (!fs.existsSync(f)) { bad('tq ' + v + ': missing'); continue; }
  const rows = jl(f);
  const qid = new Map(qs.map((q) => [q.id, q]));
  let textMismatch = 0; let budgetFlag = 0;
  for (const r of rows) {
    const q = qid.get(r.id);
    if (!q || r.command[2] !== q.question) textMismatch++;
    const hasB = r.command.includes('--budget');
    if ((v === 'b8000') !== hasB || (hasB && r.command[r.command.indexOf('--budget') + 1] !== '8000')) budgetFlag++;
  }
  const tok = rows.map((r) => r.tokens);
  res.tq.variants[v] = { rows: rows.length, distinct_ids: new Set(rows.map((r) => r.id)).size, exit_codes: rows.reduce((m, r) => { m[r.exit] = (m[r.exit] || 0) + 1; return m; }, {}),
    question_text_mismatch: textMismatch, budget_flag_mismatch: budgetFlag, tokens_median: med(tok), tokens_min: min(tok), tokens_max: max(tok), empty_text: rows.filter((r) => !r.text).length,
    ms_median: med(rows.map((r) => r.ms)) };
  if (rows.length !== 30 || res.tq.variants[v].distinct_ids !== 30) bad('tq ' + v + ': ' + rows.length + ' rows');
  if (textMismatch) bad('tq ' + v + ': ' + textMismatch + ' question texts differ from tq_questions.jsonl');
  if (budgetFlag) bad('tq ' + v + ': budget flag wrong on ' + budgetFlag + ' rows');
  if (rows.some((r) => r.exit !== 0)) bad('tq ' + v + ': non-zero exit');
}

// ---- 7. the adapter's own check ------------------------------------------------------------------
const ac = path.join(OUT, 'checks.heldout.json');
if (fs.existsSync(ac)) { const a = JSON.parse(fs.readFileSync(ac, 'utf8')); res.adapter_check = { ok: a.ok, problems: a.problems.slice(0, 20) }; if (!a.ok) bad('adapter check reported problems'); }
else bad('adapter check file missing');

// ---- 8. inventory --------------------------------------------------------------------------------
const walk = (d, rel = '') => fs.readdirSync(path.join(d, rel), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d, path.posix.join(rel, e.name)) : [path.posix.join(rel, e.name)]));
const inv = { at: res.at, root: 'answers/heldout (under the graphify scratch folder)', frozen: res.frozen, files: [] };
for (const f of walk(OUT).sort()) {
  if (f === 'INVENTORY.json' || f === 'own_checks.json') continue;
  const b = fs.readFileSync(path.join(OUT, f));
  inv.files.push({ path: f, bytes: b.length, sha256: sha(b) });
}
fs.writeFileSync(path.join(OUT, 'own_checks.json'), JSON.stringify(res, null, 1));
inv.files.push({ path: 'own_checks.json', bytes: fs.statSync(path.join(OUT, 'own_checks.json')).size, sha256: sha(fs.readFileSync(path.join(OUT, 'own_checks.json'))) });
fs.writeFileSync(path.join(OUT, 'INVENTORY.json'), JSON.stringify(inv, null, 1));
console.log(JSON.stringify({ ok: res.ok, problems: res.problems.slice(0, 15), files: inv.files.length }));
process.exit(res.ok ? 0 : 1);
