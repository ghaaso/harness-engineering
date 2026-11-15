'use strict';
// Turn graphify's read results (calls.py output) into answer records with the SHARED harness: the
// shared seed mapping (seed.js), projection, packer, budgets and record format (harness.js answer()),
// exactly as every other arm. Runs inside a container (graphtest-graphify:1, --network none) where
// /build holds only arms/, tasks/ and facts/cache/ of the build (read-only): sealed/ and audit/ are
// never mounted.
//
//   node /adapter/pack.js --configs <name,...|all> --sets T1,T1x,T2 --split tune
//        --calls /calls --out /out [--tasks-file /jobs/ids.txt] [--lock /jobs/lock.json]
//
// Output: /out/<config hash>.<set>.jsonl.gz (one record per task, the stored format plus
// config_name, as sweep.js writes it), /out/native/query-text.<set>.jsonl.gz (graphify's own answer
// text at its defaults with its shared-tokenizer token count), /out/pack_summary.json.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const BUILD = process.env.GT_BUILD || '/build';
const H = require(path.join(BUILD, 'arms/common/harness.js'));
const C = require(path.join(BUILD, 'arms/common/config.js'));
const { graphFor } = require(path.join(BUILD, 'arms/common/arms.js'));
const { DEF_KINDS } = require(path.join(BUILD, 'arms/common/seed.js'));
const { countTokens } = require(path.join(BUILD, 'arms/common/tokenizer.js'));
const CF = require('./configs');
const L = require('./lib');

function args() {
  const a = process.argv.slice(2); const o = { sets: ['T1', 'T1x', 'T2'], split: 'tune', configs: 'all' };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === '--configs') o.configs = a[++i];
    else if (k === '--sets') o.sets = a[++i].split(',');
    else if (k === '--split') o.split = a[++i];
    else if (k === '--calls') o.calls = a[++i];
    else if (k === '--out') o.out = a[++i];
    else if (k === '--tasks-file') o.tasksFile = a[++i];
    else if (k === '--lock') o.lock = a[++i];
    else if (k === '--allow-heldout') o.allowHeldout = true;
    else throw new Error('unknown argument ' + k);
  }
  return o;
}

// ---- mapping graphify's printed nodes to the shared graph's nodes ---------------------------------
// A printed node maps to the shared file node of its source file; where graphify gives a line and the
// node is a definition (not the file node itself, not a docstring), to the shared definition node of
// that file starting on that line (same name preferred), else to the file node. At file granularity
// both give the same file in the same order; the definition is kept for symbol granularity.
function mapper(G) {
  if (G._gfyMap) return G._gfyMap;
  const fileOf = new Map(); const defAt = new Map();
  for (const n of G.nodes) {
    if ((n.kind === 'file' || n.kind === 'doc') && n.path && !fileOf.has(n.path)) fileOf.set(n.path, n.i);
    if (n.path && n.ls && DEF_KINDS.has(n.kind)) { const k = n.path + '|' + n.ls; if (!defAt.has(k)) defAt.set(k, []); defAt.get(k).push(n); }
  }
  G._gfyMap = { fileOf, defAt };
  return G._gfyMap;
}
const bare = (s) => String(s || '').trim().replace(/^\./, '').replace(/\(\)$/, '');

function toRanked(G, items, seedIds) {
  const { fileOf, defAt } = mapper(G);
  const seeds = new Set(seedIds);
  const ranked = []; const seen = new Set();
  const st = { n_items: items.length, n_no_file: 0, n_unmapped: 0, unmapped_files: [], n_def: 0, n_file: 0 };
  const unm = new Set();
  for (const it of items) {
    if (!it.file) { st.n_no_file++; continue; }
    const f = fileOf.get(it.file);
    if (!f) { st.n_unmapped++; unm.add(it.file); continue; }
    let i = f;
    const isFileNode = it.line === 1 && (it.label === path.posix.basename(it.file) || String(it.label).endsWith('/' + path.posix.basename(it.file)));
    if (it.line && it.ft === 'code' && !isFileNode) {
      const c = defAt.get(it.file + '|' + it.line) || [];
      const d = c.find((n) => n.name === bare(it.label)) || c[0];
      if (d) i = d.i;
    }
    if (i === f) st.n_file++; else st.n_def++;
    if (seeds.has(i) || seen.has(i)) continue;
    seen.add(i);
    ranked.push({ i, hop: null, score: null, via: it.rel ? [it.rel] : null });
  }
  st.unmapped_files = [...unm].slice(0, 5);
  st.n_unmapped_distinct = unm.size;
  return { ranked, st };
}

function emptyReason(sm, rec, calls, st, head, seedFile) {
  if (head > 0) return null;
  if (!sm.ids.length) return 'seed file not in the shared facts';
  if (!rec.seed_res.file_in_graph) return 'seed file not in graphify graph';
  const issued = calls.filter((c) => c.argv);
  if (issued.length && issued.every((c) => c.exit !== 0)) return 'graphify found no unique node (exit ' + [...new Set(issued.map((c) => c.exit))].join('/') + ')';
  if (st.n_items === 0) return (rec.seed.symbol && !rec.seed_res.def) ? 'definition not in graphify graph and no node returned' : 'no node returned (no edges from the seed under this command)';
  const files = new Set(calls.flatMap((c) => c.items || []).map((x) => x.file).filter(Boolean));
  if ([...files].every((f) => f === seedFile)) return 'only nodes of the seed file returned';
  if (st.n_unmapped > 0 && st.n_unmapped + st.n_no_file >= st.n_items) return 'returned files not in the shared facts';
  return 'only nodes without a source file returned';
}

function readCalls(dir, key) {
  const f = path.join(dir, key + '.jsonl.gz');
  if (!fs.existsSync(f)) throw new Error('no graphify results for graph ' + key + ' (' + f + ')');
  const m = new Map();
  for (const l of zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n')) if (l) { const r = JSON.parse(l); m.set(r.id, r); }
  return m;
}

async function main() {
  const o = args();
  const lock = L.checkLock(o, __dirname);
  const tasks = L.loadTasks(path.join(BUILD, 'tasks', 'tasks.jsonl'), o, lock);
  const configs = L.selectConfigs(o.configs, lock);
  const writers = new Map(); const nativeW = new Map();
  const W = (c, set) => { const k = c.name + '|' + set; if (!writers.has(k)) writers.set(k, new H.GzWriter(path.join(o.out, c.hash + '.' + set + '.jsonl.gz'))); return writers.get(k); };
  const NW = (set) => { if (!nativeW.has(set)) nativeW.set(set, new H.GzWriter(path.join(o.out, 'native', 'query-text.' + set + '.jsonl.gz'))); return nativeW.get(set); };
  const sum = { at: new Date().toISOString(), split: o.split, sets: o.sets, configs: {}, tasks: tasks.length };
  for (const c of configs) sum.configs[c.name] = { hash: c.hash, tasks: 0, empty_head: 0, empty_reasons: {}, items: 0, no_file: 0, unmapped: 0 };
  const byKey = new Map();
  for (const t of tasks) { const k = L.graphKey(t.parent, t.remove_paths); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(t); }
  for (const [key, ts] of [...byKey].sort()) {
    const calls = readCalls(o.calls, key);
    const G = graphFor(ts[0].parent, ts[0].remove_paths || []);
    for (const t of ts) {
      const rec = calls.get(t.id);
      if (!rec) throw new Error('graphify results lack task ' + t.id);
      if (JSON.stringify(rec.seed) !== JSON.stringify(t.seed)) throw new Error('seed mismatch for ' + t.id);
      const sm = H.mapSeed(G, t.seed);
      {
        // the native form (addendum 7 item 15): every run issues the default query, whatever the configuration
        const q = rec.calls['query:text'];
        if (!q) throw new Error('task ' + t.id + ' lacks the native call query:text');
        NW(t.set).write({ id: t.id, set: t.set, split: t.split, parent: t.parent, arm: 'graphify', form: 'native', command: q.argv, exit: q.exit, ms: q.ms, text: q.stdout || '', tokens: countTokens(q.stdout || '') });
      }
      for (const c of configs) {
        const cs = c.calls.map((k) => { const x = rec.calls[k]; if (!x) throw new Error('task ' + t.id + ' lacks call ' + k); return x; });
        const items = cs.flatMap((x) => x.items || []);
        const { ranked, st } = toRanked(G, items, sm.ids);
        const issued = cs.filter((x) => x.argv);
        const ms = issued.reduce((s, x) => s + (x.ms || 0), 0);
        const meta = {
          graphify: '0.9.108', calls: c.calls.map((k, j) => ({ key: k, exit: cs[j].exit, n: (cs[j].items || []).length, skipped: cs[j].skipped || null })),
          seed_def_rule: rec.seed_res.def_rule, seed_file_in_graph: rec.seed_res.file_in_graph,
          n_items: st.n_items, n_no_file: st.n_no_file, n_unmapped: st.n_unmapped, n_unmapped_distinct: st.n_unmapped_distinct, unmapped_files: st.unmapped_files,
          n_mapped_def: st.n_def, n_mapped_file: st.n_file,
        };
        const res = { ranked: sm.ids.length ? ranked : [], engine_ms: +ms.toFixed(3), lookups: issued.length, meta };
        const a = H.answer(G, t, sm, res, c.cfg, 'graphify', +ms.toFixed(3));
        a.config_name = c.name;
        const er = emptyReason(sm, rec, cs, st, a.n_head, t.seed.path);
        a.meta.empty_reason = er;
        W(c, t.set).write(a);
        const s = sum.configs[c.name]; s.tasks++; s.items += st.n_items; s.no_file += st.n_no_file; s.unmapped += st.n_unmapped;
        if (er) { s.empty_head++; s.empty_reasons[er] = (s.empty_reasons[er] || 0) + 1; }
      }
    }
  }
  for (const w of [...writers.values(), ...nativeW.values()]) await w.close();
  sum.files = [...writers.keys()].sort();
  fs.writeFileSync(path.join(o.out, 'pack_summary.' + o.split + '.json'), JSON.stringify(sum, null, 1));
  console.log(JSON.stringify({ tasks: tasks.length, configs: configs.map((c) => c.name + '=' + c.hash), files: writers.size }));
}

main().catch((e) => { console.error(String(e.stack || e)); process.exit(2); });
