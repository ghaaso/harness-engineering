'use strict';
// LadybugDB store for one (parent commit, removed document): built once from the canonical graph
// (common/facts.js exportCanon files, verified by their content hash) and cached on the container
// filesystem (GT_STORE/ladybug). Schema chosen for this workload:
//   N        one node table, the canonical node columns plus precomputed properties
//            (dl = BM25 document length, transport flag, pi_<class> = production in-degree per class,
//            prank = global PageRank, core = k-core number, comm = Louvain community)
//   f_<t>    one relationship table per edge type t = (kind, class), in the stored direction
//   r_<t>    the same edges reversed, so "dependents" is a forward pattern over r_ tables and
//            "both" is the union f_ + r_ (one arc per edge end, as SPEC section 4 counts arcs)
//            co_changed is symmetric: only f_co_changed, holding both orientations of each pair
//   A        the arc table: every canonical edge once in its stored direction (sym 0, prim 1), plus
//            the mirror row of every co_changed edge (sym 1, prim 0); properties w, n, kid, cls, sym,
//            prim, cost. The traversals run over A (one table is far faster for deep recursion than
//            a union of 61 labels), and it is the single-table input of the native algorithms
//            (page_rank, k_core, Louvain, GDS_*), projected with "sym = 0 OR prim = 1"
//   EV       evidence rows (path, line, op) of every edge, for the TQ queries
//   T, HAS   the BM25 term index: one node per term (df), one HAS edge per (node, term) with tf
// Every arc table carries: w (weight = highest confidence), n (evidence count), kid (kind id),
// cls (class index), o (orientation: 0 = stored direction or symmetric, 1 = reversed).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const lbug = require('@ladybugdb/core');
const { exportCanon } = require('../common/facts');
const { CLASSES, STRUCTURAL } = require('../common/edgeclasses');

// LB6 (addendum 3): page_rank prior over a projection that holds both orientations of every co_changed
// edge; the Louvain grouping read from a file per canonical graph (priors/), not one draw per build
const STORE_VERSION = 'LB6';
const NONSTRUCT = CLASSES.map((c, i) => i).filter((i) => !STRUCTURAL.has(CLASSES[i]));
const CODE_CLS = ['structure', 'imports', 'calls', 'http', 'tests', 'data', 'config', 'history'].map((c) => CLASSES.indexOf(c));
// x_wsp edge cost = CLASS_COST[class of the edge's kind] / max(confidence, 0.05) (NOTES.md has the
// kind-by-kind table). Fixed before any score was seen.
const CLASS_COST = { structure: 1, membership: 4, imports: 1, calls: 1, http: 1, tests: 1, data: 1.5, config: 1.5, capability: 3, docs: 3, history: 2, experimental: 3 };
const COST_FLOOR = 0.05;
const edgeCost = (cls, w) => (CLASS_COST[cls] == null ? 3 : CLASS_COST[cls]) / (w < COST_FLOOR ? COST_FLOOR : w);
// Each Database reserves maxDBSize of virtual address space (default 8 TiB); a closed database is only
// unmapped once nothing references it, so a long sweep over many stores ran out of address space
// ("Mmap for size 8796093022208 failed"). 4 GiB is far above any store here (about 17 MB).
const MAX_DB = 2 ** 32;
// the code graph, each canonical edge once (Louvain and k-core: the engine treats them as undirected)
const CODE_FILTER = `r.cls IN [${CODE_CLS.join(', ')}] AND (r.sym = 0 OR r.prim = 1)`;
// the code graph for page_rank (directed in this engine): every directed edge in its stored direction,
// and every co_changed edge in BOTH orientations (both rows of A), so co-change is not given the
// arbitrary direction "smaller id to larger id" (addendum 3, A.3)
const PR_FILTER = `r.cls IN [${CODE_CLS.join(', ')}]`;

// Community prior files (addendum 3, B.5): arms/ladybug/priors/<canonical hash>.json holds the Louvain
// grouping of one canonical graph (draw 0, used by every store build of that graph); <hash>.draw<k>.json
// (k = 1..4) are further draws for the spread measurement, selected with LB_COMM_DRAW=k.
const PRIORS_DIR = process.env.LB_PRIORS_DIR || path.join(__dirname, 'priors');
const commDraw = (opts = {}) => {
  const d = Number(opts.commDraw != null ? opts.commDraw : process.env.LB_COMM_DRAW || 0);
  if (!Number.isInteger(d) || d < 0 || d > 4) throw new Error('LB_COMM_DRAW must be 0..4');
  return d;
};
const priorFile = (hash, draw) => path.join(PRIORS_DIR, hash + (draw ? '.draw' + draw : '') + '.json');

// edge type of a canonical edge: kind, plus "_m" for membership containment
const typeOf = (kind, cls) => (kind === 'contains' && cls === 'membership' ? 'contains_m' : kind);

function storeKey(G, opts = {}) {
  const d = commDraw(opts);
  return crypto.createHash('sha1').update([STORE_VERSION, G.loader_version, G.meta.extractor_version, G.removed.join(',')].join('|') + (d ? '|draw' + d : '')).digest('hex').slice(0, 8);
}

function ari(a, b) {
  const n = a.length; const ct = new Map(); const ra = new Map(); const rb = new Map();
  for (let i = 0; i < n; i++) { const k = a[i] + '|' + b[i]; ct.set(k, (ct.get(k) || 0) + 1); ra.set(a[i], (ra.get(a[i]) || 0) + 1); rb.set(b[i], (rb.get(b[i]) || 0) + 1); }
  const c2 = (x) => (x * (x - 1)) / 2; const sum = (m) => [...m.values()].reduce((x, v) => x + c2(v), 0);
  const s = sum(ct); const sa = sum(ra); const sb = sum(rb); const e = (sa * sb) / c2(n); const m = (sa + sb) / 2;
  return m === e ? 1 : (s - e) / (m - e);
}
// community labels renumbered 0, 1, 2, ... in order of first appearance over node ids 1..N, so one
// grouping always has one text whatever labels the engine happened to give it
function canonLabels(arr) {
  const m = new Map(); return arr.map((x) => { if (!m.has(x)) m.set(x, m.size); return m.get(x); });
}
// The grouping of this canonical graph: read from its prior file, or (first build of this graph, or a
// new draw) taken from this build's Louvain run and written. The write is atomic and never replaces an
// existing file (hard link of a temporary file), so two processes building the same graph at once end
// up with the one grouping that landed first.
// A further draw k (1..4): the same louvain() on the same code graph, in a scratch database whose node
// and edge rows are loaded in a seeded random order (seed k). Louvain's result depends on the order it
// visits nodes, so this is a fresh, reproducible draw (the store build itself loads in id order and
// gives the same grouping build after build in this image).
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, r) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function louvainDraw(G, draw, tmp) {
  const r = rngOf(20261112 + draw * 7919);
  for (const s of ['', '.wal', '.shadow', '.csv']) fs.rmSync(tmp + s, { recursive: true, force: true });
  fs.mkdirSync(tmp + '.csv', { recursive: true });
  const ids = shuffle(G.nodes.map((n, j) => j + 1), r);
  const code = new Set(CODE_CLS);
  const edges = shuffle(G.edges.filter((e) => code.has(e.c)).map((e) => [e.s, e.d]), r);
  fs.writeFileSync(tmp + '.csv/n.csv', 'id\n' + ids.join('\n') + '\n');
  fs.writeFileSync(tmp + '.csv/e.csv', 'src,dst\n' + edges.map((e) => e.join(',')).join('\n') + '\n');
  const db = new lbug.Database(tmp, 256 * 1024 * 1024, true, false, MAX_DB);
  const c = new lbug.Connection(db);
  const run = (s) => getAll(c.querySync(s));
  run('CREATE NODE TABLE N(id INT64, PRIMARY KEY(id))');
  run('CREATE REL TABLE A(FROM N TO N)');
  run(`COPY N FROM '${tmp}.csv/n.csv' (header=true, parallel=false)`);
  run(`COPY A FROM '${tmp}.csv/e.csv' (header=true, parallel=false)`);
  run('LOAD EXTENSION algo');
  run("CALL PROJECT_GRAPH('g', ['N'], ['A'])");
  const lv = new Map(run("CALL louvain('g') RETURN node.id AS i, louvain_id AS c").map((x) => [num(x.i), num(x.c)]));
  c.closeSync(); db.closeSync();
  for (const s of ['', '.wal', '.shadow', '.csv']) fs.rmSync(tmp + s, { recursive: true, force: true });
  return G.nodes.map((n, j) => (lv.has(j + 1) ? lv.get(j + 1) : 'alone' + (j + 1)));
}

function commPrior(hash, G, draw, louvainRun, scratch) {
  const f = priorFile(hash, draw);
  const read = () => {
    const x = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (x.canon_hash !== hash || x.comm.length !== G.nodes.length) throw new Error('prior file does not match the graph: ' + f);
    return x;
  };
  const fresh = canonLabels(louvainRun);
  let x; let source;
  if (fs.existsSync(f)) { x = read(); source = 'file'; } else {
    fs.mkdirSync(PRIORS_DIR, { recursive: true });
    const drawn = draw ? canonLabels(louvainDraw(G, draw, scratch)) : fresh;
    const rec = { canon_hash: hash, sha: G.sha, removed: G.removed, draw, algorithm: 'LadybugDB louvain() on the code graph, each edge once (store.js CODE_FILTER)' + (draw ? '; rows loaded in a seeded random order, seed ' + (20261112 + draw * 7919) : '; the first store build of this graph'), store_version: STORE_VERSION, nodes: G.nodes.length, communities: new Set(drawn).size, created: new Date().toISOString(), comm: drawn };
    if (draw) {
      const f0 = priorFile(hash, 0);
      if (fs.existsSync(f0)) rec.ari_vs_draw0 = +ari(JSON.parse(fs.readFileSync(f0, 'utf8')).comm, drawn).toFixed(4);
    }
    const tmp = f + '.' + process.pid + '.' + Date.now() + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(rec));
    try { fs.linkSync(tmp, f); source = 'computed'; } catch (e) { if (e.code !== 'EEXIST') throw e; source = 'file (lost the race)'; }
    fs.rmSync(tmp, { force: true });
    x = read();
  }
  return { comm: x.comm, info: { file: path.basename(f), draw, source, communities: x.communities, this_build_louvain_communities: new Set(fresh).size, this_build_ari_vs_file: +ari(x.comm, fresh).toFixed(4) } };
}
// write a community array (index = node id - 1) into N.comm
function setComm(run, comm) {
  const B = 2000;
  for (let i = 0; i < comm.length; i += B) {
    const rows = comm.slice(i, i + B).map((c, j) => '[' + (i + j + 1) + ', ' + c + ']').join(', ');
    run(`UNWIND [${rows}] AS r MATCH (n:N) WHERE n.id = r[1] SET n.comm = r[2]`);
  }
}
// the stored priors: page_rank (PR_FILTER projection), k-core and Louvain (CODE_FILTER projection);
// the community column comes from the prior file of the canonical graph
function nativePriors(run, G, hash, opts = {}) {
  run('LOAD EXTENSION algo');
  const tag = 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6);
  run(`CALL PROJECT_GRAPH('code_${tag}', ['N'], {'A': '${CODE_FILTER}'})`);
  run(`CALL PROJECT_GRAPH('pr_${tag}', ['N'], {'A': '${PR_FILTER}'})`);
  run(`CALL page_rank('pr_${tag}') WITH node, rank SET node.prank = rank`);
  run(`CALL k_core_decomposition('code_${tag}') WITH node, k_degree SET node.core = k_degree`);
  const lv = new Map(run(`CALL louvain('code_${tag}') RETURN node.id AS i, louvain_id AS c`).map((r) => [num(r.i), num(r.c)]));
  const louvainRun = G.nodes.map((n, j) => (lv.has(j + 1) ? lv.get(j + 1) : 'alone' + (j + 1)));
  const p = commPrior(hash, G, commDraw(opts), louvainRun, opts.tmpDir || path.join(require('os').tmpdir(), 'lb-louvain-' + process.pid));
  setComm(run, p.comm);
  return p.info;
}
function storeDir(G, root, opts = {}) { return path.join(root, G.sha + '-' + storeKey(G, opts)); }

const now = () => Number(process.hrtime.bigint()) / 1e6;
// rows of a result, then release the native result at once (results left to the garbage collector
// keep their buffers pinned and exhaust the buffer pool within seconds)
const getAll = (r) => {
  const rs = Array.isArray(r) ? r : [r];
  const rows = rs[rs.length - 1].getAllSync();
  for (const x of rs) x.close();
  return rows;
};
const num = (v) => (typeof v === 'bigint' ? Number(v) : v);
// bytes of the database: the database file plus its siblings (.wal, .shadow) if any
function dirBytes(d) {
  let s = 0;
  const base = path.basename(d);
  for (const f of fs.readdirSync(path.dirname(d))) {
    if (f !== base && !(f.startsWith(base + '.') && !f.endsWith('.meta.json') && !f.endsWith('.csv'))) continue;
    const p = path.join(path.dirname(d), f); const st = fs.statSync(p);
    if (st.isFile()) s += st.size;
  }
  return s;
}

// The edge types present in G, with their class and symmetry: [{t, kind, cls, kid, sym}]
function edgeTypes(G) {
  const m = new Map();
  for (const e of G.edges) {
    const t = typeOf(e.kind, e.cls);
    if (!m.has(t)) m.set(t, { t, kind: e.kind, cls: e.c, kid: e.k, sym: e.sym });
  }
  return [...m.values()].sort((a, b) => (a.t < b.t ? -1 : 1));
}

// Build the store. Returns timings and sizes. The CSV input is written by exportCanon into a
// scratch folder next to the store and removed afterwards.
function build(G, dir, opts = {}) {
  const T = {}; let t = now(); const t0 = t;
  // a store whose build was interrupted can leave a .wal (or .shadow) behind; a new database with the
  // same name refuses it ("Database ID for temporary file ... does not match"), so remove them all
  for (const sfx of ['', '.wal', '.shadow', '.tmp', '.meta.json']) fs.rmSync(dir + sfx, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const csv = dir + '.csv';
  fs.rmSync(csv, { recursive: true, force: true });
  const manifest = exportCanon(G, csv);
  // our own hash of the files we load must equal the canonical content hash
  const files = Object.keys(manifest.files).sort();
  const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(csv, f))).digest('hex');
  const own = crypto.createHash('sha256').update(files.map((f) => f + ' ' + sha(f) + '\n').join('')).digest('hex');
  if (own !== manifest.hash) throw new Error('canonical hash mismatch ' + own + ' vs ' + manifest.hash);
  // evidence rows (not in the canonical CSVs): one row per (edge, evidence)
  let ev = 'src,dst,kid,path,line,op\n';
  const q = (s) => (s == null ? '' : /[",\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s));
  for (const e of G.edges) for (const [p, l, op] of e.evs) ev += [e.s, e.d, e.k, q(p), l || 0, q(op)].join(',') + '\n';
  fs.writeFileSync(path.join(csv, 'evidence.csv'), ev);
  T.export_ms = now() - t; t = now();

  const db = new lbug.Database(dir, opts.bufferPool || 512 * 1024 * 1024, true, false, MAX_DB);
  const c = new lbug.Connection(db);
  const run = (s) => getAll(c.querySync(s));
  const types = edgeTypes(G);
  const piCols = NONSTRUCT.map((i) => 'pi_' + i + ' INT64 DEFAULT 0').join(', ');
  run(`CREATE NODE TABLE N(id INT64, sid STRING, kind STRING, path STRING, name STRING, ls INT64, le INT64, runtime STRING, slice STRING, is_test INT64, file INT64, tokens INT64, text STRING, dl INT64 DEFAULT 0, transport BOOLEAN DEFAULT false, ${piCols}, prank DOUBLE DEFAULT 0, core INT64 DEFAULT 0, comm INT64 DEFAULT -1, p DOUBLE DEFAULT 0, q DOUBLE DEFAULT 0, W DOUBLE DEFAULT 0, PRIMARY KEY(id))`);
  const NCOLS = 'id INT64, sid STRING, kind STRING, path STRING, name STRING, ls INT64, le INT64, runtime STRING, slice STRING, is_test INT64, file INT64, tokens INT64, text STRING';
  run(`COPY N FROM (LOAD WITH HEADERS (${NCOLS}) FROM '${csv}/nodes.csv' (header=true, parallel=false, quote='"', escape='"') RETURN id, sid, kind, path, name, ls, le, runtime, slice, is_test, file, tokens, text, 0, false, ${NONSTRUCT.map(() => '0').join(', ')}, 0.0, 0, -1, 0.0, 0.0, 0.0)`);
  const ECOLS = 'class STRING, src INT64, dst INT64, weight DOUBLE, n_ev INT64';
  const RP = 'w DOUBLE, n INT64, kid INT64, cls INT64, o INT64';
  // typed tables: f_<type> in the stored direction (o = 0), r_<type> reversed (o = 1); the symmetric
  // co_changed has only f_co_changed, holding both orientations (o = 0). A typed path pattern then
  // always reads left to right: a step "out" is f_ labels, "in" is r_ labels, "both" is both.
  for (const x of types) {
    const where = x.kind === 'contains' ? `WHERE class = '${CLASSES[x.cls]}' ` : '';
    const from = `LOAD WITH HEADERS (${ECOLS}) FROM '${csv}/edges_${x.kind}.csv' (header=true, parallel=false, quote='"', escape='"') ${where}`;
    run(`CREATE REL TABLE f_${x.t}(FROM N TO N, ${RP})`);
    run(`COPY f_${x.t} FROM (${from}RETURN src, dst, weight, n_ev, ${x.kid}, ${x.cls}, 0)`);
    if (x.sym) run(`COPY f_${x.t} FROM (${from}RETURN dst, src, weight, n_ev, ${x.kid}, ${x.cls}, 0)`);
    else {
      run(`CREATE REL TABLE r_${x.t}(FROM N TO N, ${RP})`);
      run(`COPY r_${x.t} FROM (${from}RETURN dst, src, weight, n_ev, ${x.kid}, ${x.cls}, 1)`);
    }
  }
  // the arc table A: every canonical edge once in its stored direction (sym = 0), and each symmetric
  // edge in both orientations (sym = 1; prim = 1 on the stored row src < dst). Traversals filter it
  // by class and weight: dependencies = (u)-[A]->(v); dependents = (u)<-[A]-(v); both = (u)-[A]-(v)
  // restricted to sym = 0 OR prim = 1, so every symmetric edge gives one arc in every direction.
  run('CREATE REL TABLE A(FROM N TO N, w DOUBLE, n INT64, kid INT64, cls INT64, sym INT64, prim INT64, cost DOUBLE)');
  const AL = `LOAD WITH HEADERS (kind STRING, class STRING, src INT64, dst INT64, weight DOUBLE, n_ev INT64) FROM '${csv}/edges.csv' (header=true, parallel=false, quote='"', escape='"')`;
  const KID = `CASE ${G.kinds.map((k, i) => `WHEN kind = '${k}' THEN ${i + 1}`).join(' ')} END`;
  const CID = `CASE ${CLASSES.map((cn, i) => `WHEN class = '${cn}' THEN ${i}`).join(' ')} END`;
  // edge cost for the weighted-shortest-path mode (x_wsp): a fixed cost per class, written before any
  // score was seen, divided by the confidence (floored at 0.05)
  const COST = `(CASE ${Object.entries(CLASS_COST).map(([cn, v]) => `WHEN class = '${cn}' THEN ${v.toFixed(1)}`).join(' ')} ELSE 3.0 END) / CASE WHEN weight < ${COST_FLOOR} THEN ${COST_FLOOR} ELSE weight END`;
  run(`COPY A FROM (${AL} RETURN src, dst, weight, n_ev, ${KID}, ${CID}, CASE WHEN kind = 'co_changed' THEN 1 ELSE 0 END, 1, ${COST})`);
  run(`COPY A FROM (${AL} WHERE kind = 'co_changed' RETURN dst, src, weight, n_ev, ${KID}, ${CID}, 1, 0, ${COST})`);
  run('CREATE REL TABLE EV(FROM N TO N, kid INT64, path STRING, line INT64, op STRING)');
  run(`COPY EV FROM (LOAD WITH HEADERS (src INT64, dst INT64, kid INT64, path STRING, line INT64, op STRING) FROM '${csv}/evidence.csv' (header=true, parallel=false, quote='"', escape='"') RETURN src, dst, kid, path, line, op)`);
  T.load_ms = now() - t; t = now();

  // ---- precomputed properties, all computed by Cypher inside the engine ----
  // BM25 term index (SPEC 8.4 / 8.6): documents = node texts split on single spaces
  run('CREATE NODE TABLE T(term STRING, df INT64, PRIMARY KEY(term))');
  run('CREATE REL TABLE HAS(FROM N TO T, tf INT64)');
  run("COPY T FROM (MATCH (n:N) WHERE n.text IS NOT NULL AND n.text <> '' UNWIND string_split(n.text, ' ') AS t WITH t, n WHERE t <> '' RETURN t, count(DISTINCT n.id))");
  run("COPY HAS FROM (MATCH (n:N) WHERE n.text IS NOT NULL AND n.text <> '' UNWIND string_split(n.text, ' ') AS t WITH n, t WHERE t <> '' RETURN n.id, t, count(*))");
  run('MATCH (n:N)-[h:HAS]->(:T) WITH n, sum(h.tf) AS dl SET n.dl = dl');
  // production in-degree per class (SPEC 5, indeg): edges into v from a non-test source; a symmetric
  // edge counts at each end whose other end is not a test (f_co_changed holds both orientations)
  for (const ci of NONSTRUCT) {
    const lab = types.filter((x) => x.cls === ci).map((x) => 'f_' + x.t);
    if (!lab.length) continue;
    run(`MATCH (u:N)-[r:${lab.join('|')}]->(v:N) WHERE u.is_test = 0 WITH v, count(r) AS k SET v.pi_${ci} = k`);
  }
  // transport nodes (SPEC 5)
  run("MATCH (n:N) WHERE n.kind IN ['runtime', 'slice', 'invariant_group', 'ambiguous_ref', 'missing_ref'] SET n.transport = true");
  const callers = types.filter((x) => ['calls', 'depends_injects', 'passes_callable'].includes(x.kind)).map((x) => 'f_' + x.t);
  if (callers.length) run(`MATCH (x:N)-[:${callers.join('|')}]->(n:N) WHERE n.kind IN ['function', 'method', 'class'] AND n.is_test = 0 AND x.is_test = 0 AND x.slice IS NOT NULL WITH n, count(DISTINCT coalesce(x.runtime, 'null') + '/' + x.slice) AS k WHERE k >= 3 SET n.transport = true`);
  T.derived_ms = now() - t; t = now();

  // ---- native algorithms stored as priors (used only by the engine-native configuration modes) ----
  // the code graph: classes structure, imports, calls, http, tests, data, config, history. Louvain takes
  // no seed and its grouping depends on the build's physical order, so the grouping is read from the
  // canonical graph's prior file (written by the first build of that graph); see nativePriors
  const comm = nativePriors(run, G, manifest.hash, { ...opts, tmpDir: dir + '.louvain' });
  T.native_priors_ms = now() - t; t = now();
  c.closeSync(); db.closeSync();
  T.close_ms = now() - t;
  fs.rmSync(csv, { recursive: true, force: true });
  T.total_ms = now() - t0;
  const meta = { store_version: STORE_VERSION, sha: G.sha, removed: G.removed, canon_hash: manifest.hash, nodes: G.nodes.length, edges: G.edges.length, types, comm, build: T, bytes: dirBytes(dir) };
  fs.writeFileSync(dir + '.meta.json', JSON.stringify(meta, null, 1));
  return meta;
}

// Open (building first when absent). One Database and one Connection per store.
function open(G, root, opts = {}) {
  const dir = storeDir(G, root, opts);
  let built = null;
  if (!fs.existsSync(dir + '.meta.json') || !fs.existsSync(dir)) built = build(G, dir, opts);
  const meta = JSON.parse(fs.readFileSync(dir + '.meta.json', 'utf8'));
  const db = new lbug.Database(dir, opts.bufferPool || 1024 * 1024 * 1024, true, !!opts.readOnly, MAX_DB);
  const conn = new lbug.Connection(db);
  if (opts.threads) conn.querySync('CALL threads=' + opts.threads);
  conn.querySync('CALL var_length_extend_max_depth=10000');
  return { db, conn, dir, meta, built };
}

module.exports = { build, open, storeDir, storeKey, edgeTypes, typeOf, STORE_VERSION, NONSTRUCT, CODE_FILTER, PR_FILTER, CLASS_COST, COST_FLOOR, edgeCost, PRIORS_DIR, priorFile, commDraw, nativePriors, setComm, ari, canonLabels, num, getAll, dirBytes };
