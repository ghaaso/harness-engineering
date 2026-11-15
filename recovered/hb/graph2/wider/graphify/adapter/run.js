'use strict';
// Host runner of the graphify arm (protocol addendum 7). Every graphify build and call runs in a
// container of graphtest-graphify:1 started with --network none, with only what it needs mounted.
//
//   node run.js graphs [--split tune] [--sets ...]        build the graphs of the parents the tasks use
//   node run.js calls  [--configs all|a,b] [--sets T1,T1x,T2] [--split tune] [--tasks-file f]
//   node run.js pack   [--configs all|a,b] [--sets ...] [--split tune] [--tasks-file f]
//   node run.js tq     [--split tune]                    the questions, default and larger budget
//   node run.js check  [--split tune]                    checks without references
//   node run.js all    (graphs, calls, pack, tq, check on the tuning split)
// Held-out (only after the grader froze one configuration): add --split heldout --allow-heldout
// --lock <frozen record> and, optionally, --out <dir>; see ADAPTER.md section 9.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');
const L = require('./lib');
const CF = require('./configs');

const ADAPTER = __dirname;
const ROOT = path.resolve(__dirname, '..');
const BUILD = L.BUILD;
const REPO = process.env.GT_REPO || 'C:/Users/User/Documents/projects/EMS_workshop1';
const FROZEN = 'a31924a3818f4ac94b695906d107c72c912792b2'; // the commit the questions are asked at
const IMAGE = 'graphtest-graphify:1';
const GRAPHS = path.join(ROOT, 'graphs');
const EXPORTS = path.join(ROOT, 'exports');
const NATIVE_CALL = 'query:text';

function args() {
  const a = process.argv.slice(2); const o = { cmd: a[0], sets: ['T1', 'T1x', 'T2'], split: 'tune', configs: 'all' };
  for (let i = 1; i < a.length; i++) {
    const k = a[i];
    if (k === '--configs') o.configs = a[++i];
    else if (k === '--sets') o.sets = a[++i].split(',');
    else if (k === '--split') o.split = a[++i];
    else if (k === '--tasks-file') o.tasksFile = path.resolve(a[++i]);
    else if (k === '--lock') o.lock = path.resolve(a[++i]);
    else if (k === '--allow-heldout') o.allowHeldout = true;
    else if (k === '--out') o.out = path.resolve(a[++i]);
    else throw new Error('unknown argument ' + k);
  }
  o.out = o.out || path.join(ROOT, 'answers', o.split);
  return o;
}

const tasksOf = (o, lock) => L.loadTasks(path.join(BUILD, 'tasks', 'tasks.jsonl'), o, lock);
const mount = (src, dst, ro) => ['--mount', 'type=bind,source=' + src + ',target=' + dst + (ro ? ',readonly' : '')];
function docker(name, mounts, env, cmd) {
  const argv = ['run', '--rm', '--name', 'gfy-' + name + '-' + process.pid, '--network', 'none', '--cpus', '6', '--memory', '4g',
    '--read-only', '--tmpfs', '/tmp:rw,exec,size=3g', '--tmpfs', '/root:rw,size=64m'];
  for (const [k, v] of Object.entries(env || {})) argv.push('-e', k + '=' + v);
  argv.push(...mounts, IMAGE, ...cmd);
  const t0 = Date.now();
  const r = spawnSync('docker', argv, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28, env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
  return { status: r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || ''), wall_s: (Date.now() - t0) / 1000, argv };
}
const log = (o, msg) => { fs.mkdirSync(o.out, { recursive: true }); fs.appendFileSync(path.join(o.out, 'run.log'), new Date().toISOString() + ' ' + msg + '\n'); console.log(msg); };

// ---- graphs ---------------------------------------------------------------------------------------
function buildGraph(o, sha, removePaths) {
  const key = L.graphKey(sha, removePaths);
  const dir = path.join(GRAPHS, key);
  if (fs.existsSync(path.join(dir, 'build.json'))) return JSON.parse(fs.readFileSync(path.join(dir, 'build.json'), 'utf8'));
  const exp = path.join(EXPORTS, key);
  fs.rmSync(exp, { recursive: true, force: true }); fs.mkdirSync(exp, { recursive: true });
  const tar = path.join(exp, 'export.tar');
  // git archive of the parent commit only: no .git, never the working tree (hard rule 1)
  const g = spawnSync('git', ['-C', REPO, 'archive', '--format=tar', '-o', tar, sha], { stdio: ['ignore', 'pipe', 'pipe'] });
  if (g.status !== 0) throw new Error('git archive ' + sha + ': ' + g.stderr);
  const tarBytes = fs.statSync(tar).size;
  const part = dir + '.part';
  fs.rmSync(part, { recursive: true, force: true }); fs.mkdirSync(part, { recursive: true });
  const r = docker('build', [...mount(exp, '/in', true), ...mount(part, '/out', false), ...mount(ADAPTER, '/adapter', true)], {},
    ['sh', '/adapter/build_graph.sh', ...(removePaths || [])]);
  fs.rmSync(exp, { recursive: true, force: true }); // the export is deleted after every build
  if (r.status !== 0) throw new Error('graph build ' + key + ' failed (exit ' + r.status + '): ' + r.stderr.slice(-2000) + ' ' + (fs.existsSync(path.join(part, 'extract.log')) ? fs.readFileSync(path.join(part, 'extract.log'), 'utf8').slice(-2000) : ''));
  const stats = JSON.parse(fs.readFileSync(path.join(part, 'stats.json'), 'utf8'));
  const [rc, s, e] = fs.readFileSync(path.join(part, 'extract.rc'), 'utf8').trim().split(' ');
  const xlog = fs.readFileSync(path.join(part, 'extract.log'), 'utf8');
  const pick = (re) => { const m = xlog.match(re); return m ? m[0] : null; };
  const rec = { key, sha, remove_paths: removePaths || [], built_at: new Date().toISOString(), export_tar_bytes: tarBytes,
    container_wall_s: r.wall_s, extract_s: (Number(e) - Number(s)) / 1e9, extract_exit: Number(rc), ...stats,
    found_line: pick(/found \d+ code[^\n]*/), wrote_line: pick(/wrote [^\n]*graph\.json[^\n]*/), no_symbols_line: pick(/warning: \d+ code file\(s\) yielded no symbols[^\n]{0,120}/) };
  fs.writeFileSync(path.join(part, 'build.json'), JSON.stringify(rec, null, 1));
  fs.renameSync(part, dir);
  return rec;
}

function graphsCmd(o) {
  const lock = L.checkLock(o, ADAPTER);
  const ts = tasksOf(o, lock);
  const want = new Map();
  for (const t of ts) want.set(L.graphKey(t.parent, t.remove_paths), [t.parent, t.remove_paths || []]);
  // the questions are asked at the frozen commit; its graph is built for the TUNING questions
  if (o.split === 'tune') want.set(FROZEN, [FROZEN, []]);
  const keys = [...want.keys()].sort();
  log(o, 'graphs: ' + keys.length + ' to have');
  let n = 0;
  for (const k of keys) {
    const [sha, rp] = want.get(k);
    const had = fs.existsSync(path.join(GRAPHS, k, 'build.json'));
    const rec = buildGraph(o, sha, rp);
    n++;
    if (!had) log(o, 'graph ' + n + '/' + keys.length + ' ' + k.slice(0, 12) + ': ' + rec.nodes + ' nodes, ' + rec.edges + ' edges, extract ' + rec.extract_s.toFixed(1) + ' s, container ' + rec.container_wall_s.toFixed(1) + ' s');
  }
  return keys;
}

// ---- graphify calls ------------------------------------------------------------------------------
function callsCmd(o) {
  const lock = L.checkLock(o, ADAPTER);
  const configs = L.selectConfigs(o.configs, lock);
  const ts = tasksOf(o, lock);
  const keys = new Set([NATIVE_CALL, ...configs.flatMap((c) => c.calls)]);
  const calls = {}; for (const k of [...keys].sort()) calls[k] = CF.CALLS[k];
  const groups = new Map();
  for (const t of ts) {
    const k = L.graphKey(t.parent, t.remove_paths);
    if (!fs.existsSync(path.join(GRAPHS, k, 'graphify-out', 'graph.json'))) throw new Error('graph ' + k + ' is not built (run graphs first)');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push({ id: t.id, set: t.set, split: t.split, parent: t.parent, seed: t.seed });
  }
  // a task of several sets (T1 and T1x) shares one record per id; sets are kept per id
  const job = { kind: 'tasks', calls, groups: [...groups].sort().map(([graph, tasks]) => ({ graph, tasks })) };
  const cdir = path.join(o.out, 'calls'); const jdir = path.join(cdir, 'jobs');
  fs.mkdirSync(jdir, { recursive: true });
  const jf = 'tasks-' + o.sets.join('_') + '.json';
  fs.writeFileSync(path.join(jdir, jf), JSON.stringify(job));
  log(o, 'calls: ' + ts.length + ' tasks, ' + groups.size + ' graphs, ' + Object.keys(calls).length + ' call kinds per task');
  const r = docker('calls', [...mount(GRAPHS, '/graphs', true), ...mount(ADAPTER, '/adapter', true), ...mount(jdir, '/jobs', true), ...mount(cdir, '/out', false)],
    {}, ['/opt/graphify/bin/python', '-I', '/adapter/calls.py', '/jobs/' + jf]);
  log(o, 'calls container exit ' + r.status + ' in ' + r.wall_s.toFixed(0) + ' s' + (r.status ? ': ' + r.stderr.slice(-3000) : ''));
  if (r.status !== 0) throw new Error('calls failed');
}

// ---- packing with the shared packer ------------------------------------------------------------
function packCmd(o) {
  const lock = L.checkLock(o, ADAPTER);
  const configs = L.selectConfigs(o.configs, lock);
  const cdir = path.join(o.out, 'calls');
  const mounts = [...mount(path.join(BUILD, 'arms'), '/build/arms', true), ...mount(path.join(BUILD, 'tasks'), '/build/tasks', true),
    ...mount(path.join(BUILD, 'facts', 'cache'), '/build/facts/cache', true), ...mount(ADAPTER, '/adapter', true),
    ...mount(cdir, '/calls', true), ...mount(o.out, '/out', false)];
  const extra = [];
  if (o.tasksFile) { mounts.push(...mount(path.dirname(o.tasksFile), '/tasksdir', true)); extra.push('--tasks-file', '/tasksdir/' + path.basename(o.tasksFile)); }
  if (o.lock) { mounts.push(...mount(path.dirname(o.lock), '/lockdir', true)); extra.push('--lock', '/lockdir/' + path.basename(o.lock), '--allow-heldout'); }
  const r = docker('pack', mounts, { GT_BUILD: '/build', GT_TMP: '/tmp/gt', GT_RESULTS: '/tmp/results' },
    ['node', '/adapter/pack.js', '--configs', configs.map((c) => c.name).join(','), '--sets', o.sets.join(','), '--split', o.split, '--calls', '/calls', '--out', '/out', ...extra]);
  log(o, 'pack container exit ' + r.status + ' in ' + r.wall_s.toFixed(0) + ' s: ' + (r.stdout.trim().slice(-1500)) + (r.status ? ' ' + r.stderr.slice(-3000) : ''));
  if (r.status !== 0) throw new Error('pack failed');
}

// ---- questions ------------------------------------------------------------------------------------
function tqCmd(o) {
  const lock = L.checkLock(o, ADAPTER);
  const split = o.split === 'tune' ? 'tune' : 'held_out';
  if (split !== 'tune' && !lock) throw new Error('REFUSED');
  const qs = fs.readFileSync(path.join(BUILD, 'tasks', 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse)
    .filter((q) => q.split === split).map((q) => ({ id: q.id, split: q.split, question: q.question }));
  if (!fs.existsSync(path.join(GRAPHS, FROZEN, 'graphify-out', 'graph.json'))) throw new Error('graph of the frozen commit is not built');
  const variants = [{ name: 'default', budget: null }, { name: 'b8000', budget: 8000 }];
  const tdir = path.join(o.out, 'tq'); const jdir = path.join(tdir, 'jobs');
  fs.mkdirSync(jdir, { recursive: true });
  fs.writeFileSync(path.join(jdir, 'tq.json'), JSON.stringify({ kind: 'tq', graph: FROZEN, questions: qs, variants }));
  const raw = path.join(tdir, 'raw'); fs.mkdirSync(raw, { recursive: true });
  const r = docker('tq', [...mount(GRAPHS, '/graphs', true), ...mount(ADAPTER, '/adapter', true), ...mount(jdir, '/jobs', true), ...mount(raw, '/out', false)],
    {}, ['/opt/graphify/bin/python', '-I', '/adapter/calls.py', '/jobs/tq.json']);
  if (r.status !== 0) throw new Error('tq failed: ' + r.stderr.slice(-2000));
  const { countTokens } = require(path.join(BUILD, 'arms', 'common', 'tokenizer.js'));
  for (const v of variants) {
    const rows = fs.readFileSync(path.join(raw, 'tq.' + v.name + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
    const out = rows.map((x) => ({ id: x.id, split: x.split, arm: 'graphify', variant: v.name, command: x.argv, exit: x.exit, ms: x.ms, lookups: 1, tokens: countTokens(x.text || ''), text: x.text || '' }));
    fs.writeFileSync(path.join(tdir, 'graphify.' + split + '.' + v.name + '.jsonl'), out.map((x) => JSON.stringify(x)).join('\n') + '\n');
  }
  log(o, 'tq: ' + qs.length + ' questions x ' + variants.length + ' variants in ' + r.wall_s.toFixed(0) + ' s');
}

// ---- checks without references ---------------------------------------------------------------
const gz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
function checkCmd(o) {
  const lock = L.checkLock(o, ADAPTER);
  const configs = L.selectConfigs(o.configs, lock);
  const ts = tasksOf(o, lock);
  const { BUDGETS } = require(path.join(BUILD, 'arms', 'common', 'config.js'));
  // the stored format: one record of the frozen typed arm's tuning answers
  const sdir = path.join(BUILD, 'results', 'relational', 'tune');
  const sf = fs.readdirSync(sdir).filter((f) => f.endsWith('.T1.jsonl.gz')).sort()[0];
  const stored = gz(path.join(sdir, sf))[0];
  const keyset = (r) => Object.keys(r).sort().join(',');
  const itemKeys = Object.keys(stored.items[0]).sort().join(',');
  const budKeys = Object.keys(stored.budgets['2000']).sort().join(',');
  const out = { at: new Date().toISOString(), split: o.split, stored_format_from: 'results/relational/tune/' + sf, configs: {}, ok: true, problems: [] };
  const bad = (m) => { out.ok = false; if (out.problems.length < 200) out.problems.push(m); };
  for (const c of configs) {
    const cr = out.configs[c.name] = { hash: c.hash, sets: {} };
    for (const set of o.sets) {
      const f = path.join(o.out, c.hash + '.' + set + '.jsonl.gz');
      const want = ts.filter((t) => t.set === set).map((t) => t.id).sort();
      if (!fs.existsSync(f)) { bad(c.name + ' ' + set + ': answer file missing'); continue; }
      const recs = gz(f);
      const ids = recs.map((r) => r.id).sort();
      const s = { file: path.basename(f), records: recs.length, expected: want.length, missing: 0, duplicate: 0, format_mismatch: 0, budget_over: 0,
        empty_head: 0, empty_reasons: {}, items_returned: 0, nodes_no_file: 0, nodes_unmapped: 0, tasks_with_unmapped: 0,
        lookups_total: 0, n_head_median: null, seed_match: {}, seed_def_rule: {} };
      const have = new Set(ids);
      s.missing = want.filter((x) => !have.has(x)).length;
      s.duplicate = ids.length - have.size;
      if (s.missing || s.duplicate || ids.length !== want.length) bad(c.name + ' ' + set + ': ' + s.missing + ' missing, ' + s.duplicate + ' duplicate, ' + ids.length + ' records for ' + want.length + ' tasks');
      const heads = [];
      for (const r of recs) {
        if (keyset(r) !== keyset(stored)) { s.format_mismatch++; bad(c.name + ' ' + r.id + ': record keys ' + keyset(r)); }
        if (r.arm !== 'graphify' || r.config_hash !== c.hash || r.split !== o.split || r.set !== set || r.granularity !== 'file' || r.form !== 'signature' || r.pad !== 'none') { s.format_mismatch++; bad(c.name + ' ' + r.id + ': header fields'); }
        for (const it of r.items) if (Object.keys(it).sort().join(',') !== itemKeys) { s.format_mismatch++; bad(c.name + ' ' + r.id + ': item keys'); break; }
        for (const b of BUDGETS) {
          const bb = r.budgets[b];
          if (!bb || Object.keys(bb).sort().join(',') !== budKeys) { s.format_mismatch++; bad(c.name + ' ' + r.id + ': budget ' + b + ' keys'); continue; }
          let t = 0; for (let i = 0; i < bb.n_full; i++) t += r.items[i].tok;
          if (bb.cut) t += bb.cut.tok;
          if (bb.used > b || t > b) { s.budget_over++; bad(c.name + ' ' + r.id + ': budget ' + b + ' used ' + bb.used); }
          if (bb.n_full > r.items.length) { s.format_mismatch++; bad(c.name + ' ' + r.id + ': n_full beyond items'); }
        }
        if (r.items.some((it) => it.pad)) bad(c.name + ' ' + r.id + ': a padded item (pad is none)');
        s.lookups_total += r.lookups;
        heads.push(r.n_head);
        s.seed_match[r.seed_match] = (s.seed_match[r.seed_match] || 0) + 1;
        const m = r.meta || {};
        s.seed_def_rule[m.seed_def_rule] = (s.seed_def_rule[m.seed_def_rule] || 0) + 1;
        s.items_returned += m.n_items || 0; s.nodes_no_file += m.n_no_file || 0; s.nodes_unmapped += m.n_unmapped || 0;
        if (m.n_unmapped) s.tasks_with_unmapped++;
        if (m.empty_reason) { s.empty_head++; s.empty_reasons[m.empty_reason] = (s.empty_reasons[m.empty_reason] || 0) + 1; }
        if (!m.empty_reason && r.n_head === 0) bad(c.name + ' ' + r.id + ': empty head without a reason');
      }
      heads.sort((a, b) => a - b); s.n_head_median = heads.length ? heads[Math.floor(heads.length / 2)] : null;
      cr.sets[set] = s;
    }
  }
  // the native form
  out.native = {};
  for (const set of o.sets) {
    const f = path.join(o.out, 'native', 'query-text.' + set + '.jsonl.gz');
    if (!fs.existsSync(f)) { bad('native ' + set + ': file missing'); continue; }
    const recs = gz(f); const want = ts.filter((t) => t.set === set).length;
    const tok = recs.map((r) => r.tokens).sort((a, b) => a - b);
    out.native[set] = { records: recs.length, expected: want, distinct_ids: new Set(recs.map((r) => r.id)).size, exit_codes: recs.reduce((m, r) => { m[r.exit] = (m[r.exit] || 0) + 1; return m; }, {}),
      tokens_median: tok[Math.floor(tok.length / 2)], tokens_max: tok[tok.length - 1], tokens_min: tok[0] };
    if (recs.length !== want || out.native[set].distinct_ids !== want) bad('native ' + set + ': ' + recs.length + ' records for ' + want + ' tasks');
  }
  // the questions
  if (o.split === 'tune') {
    out.tq = {};
    for (const v of ['default', 'b8000']) {
      const f = path.join(o.out, 'tq', 'graphify.tune.' + v + '.jsonl');
      if (!fs.existsSync(f)) { bad('tq ' + v + ': file missing'); continue; }
      const rows = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
      const tok = rows.map((r) => r.tokens).sort((a, b) => a - b);
      out.tq[v] = { questions: rows.length, exit_codes: rows.reduce((m, r) => { m[r.exit] = (m[r.exit] || 0) + 1; return m; }, {}), tokens_median: tok[Math.floor(tok.length / 2)], tokens_max: tok[tok.length - 1] };
      if (rows.length !== 20) bad('tq ' + v + ': ' + rows.length + ' questions, expected 20');
    }
  }
  // graph build costs
  const builds = fs.existsSync(GRAPHS) ? fs.readdirSync(GRAPHS).filter((d) => fs.existsSync(path.join(GRAPHS, d, 'build.json'))).map((d) => JSON.parse(fs.readFileSync(path.join(GRAPHS, d, 'build.json'), 'utf8'))) : [];
  const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const rel = {}; for (const b of builds) for (const [k, v] of Object.entries(b.relations || {})) rel[k] = (rel[k] || 0) + v;
  out.graphs = { count: builds.length, extract_s_median: q(builds.map((b) => b.extract_s), 0.5), extract_s_max: q(builds.map((b) => b.extract_s), 1),
    container_s_median: q(builds.map((b) => b.container_wall_s), 0.5), container_s_total: builds.reduce((s, b) => s + b.container_wall_s, 0),
    nodes_median: q(builds.map((b) => b.nodes), 0.5), nodes_min: q(builds.map((b) => b.nodes), 0), nodes_max: q(builds.map((b) => b.nodes), 1),
    edges_median: q(builds.map((b) => b.edges), 0.5), edges_min: q(builds.map((b) => b.edges), 0), edges_max: q(builds.map((b) => b.edges), 1),
    relations_total: rel, per_graph: builds.map((b) => ({ key: b.key, nodes: b.nodes, edges: b.edges, extract_s: +b.extract_s.toFixed(2), container_s: +b.container_wall_s.toFixed(1), source_files: b.source_files, relations: b.relations })) };
  out.adapter_code = L.adapterHash(ADAPTER);
  fs.writeFileSync(path.join(o.out, 'checks.' + o.split + '.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ ok: out.ok, problems: out.problems.slice(0, 10) }));
  return out;
}

function main() {
  const o = args();
  if (o.cmd === 'graphs') return graphsCmd(o);
  if (o.cmd === 'calls') return callsCmd(o);
  if (o.cmd === 'pack') return packCmd(o);
  if (o.cmd === 'tq') return tqCmd(o);
  if (o.cmd === 'check') return checkCmd(o);
  if (o.cmd === 'hash') return console.log(JSON.stringify({ adapter: L.adapterHash(ADAPTER), configs: L.configsAll().map((c) => ({ name: c.name, hash: c.hash, calls: c.calls })) }, null, 1));
  if (o.cmd === 'all') { if (o.split !== 'tune') throw new Error('all runs the tuning split only'); graphsCmd(o); callsCmd(o); packCmd(o); tqCmd(o); return checkCmd(o); }
  throw new Error('usage: node run.js graphs|calls|pack|tq|check|hash|all [options]');
}
try { main(); } catch (e) { console.error(String(e.stack || e)); process.exit(2); }
