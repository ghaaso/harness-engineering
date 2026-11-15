'use strict';
// CHECK 1, identical input. For 5 TUNE parents: the canonical graph G (shared loader) and its
// exportCanon content hash, then the content each store actually holds, read back from the store:
//   ladybug   the builders' store (volume gt-ladybug, mounted read-only): table N and the arc table A
//             (stored-direction rows, prim = 1), plus row counts of every typed f_/r_ table
//   duckpgq   the builders' store (volume gt-duckpgq, read-only): tables node and edge
//   relational a fresh build with the arm's own buildDb (into /work), tables node, edge, fts
// Each is reduced to the same digest: sha256 over the sorted node lines
// "id|sid|kind|path|name|ls|le|runtime|slice|is_test|file|tokens|text" and edge lines
// "kind|class|src|dst|weight|n_ev" (co_changed once, src < dst). Equal digests = identical content.
//   node inputs.js [--parents a,b,...]  -> inputs.json
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const A = '/build/arms';
const { loadFacts, exportCanon } = require(A + '/common/facts');
const { CLASSES } = require(A + '/common/edgeclasses');
const LS = require(A + '/ladybug/store');
const DS = require(A + '/duckpgq/store');
const { buildDb, openDb } = require(A + '/relational/db');

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const s = (v) => (v === null || v === undefined ? '' : typeof v === 'bigint' ? String(Number(v)) : String(v));
const num = (v) => (typeof v === 'bigint' ? Number(v) : v);
function digest(nodes, edges) {
  const nl = nodes.map((n) => [n.id, n.sid, n.kind, n.path, n.name, n.ls, n.le, n.runtime, n.slice, n.is_test, n.file, n.tokens, n.text].map(s).join('|')).sort();
  const el = edges.map((e) => [e.kind, e.cls, e.src, e.dst, e.w, e.n].map(s).join('|')).sort();
  return { nodes: nl.length, edges: el.length, node_digest: sha(nl.join('\n')), edge_digest: sha(el.join('\n')) };
}

function pickParents() {
  const t = fs.readFileSync('/build/tasks/tasks.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((x) => x.split === 'tune');
  const ps = [...new Set(t.map((x) => x.parent))].sort();
  // spread over the list, deterministic: positions 0, 13, 26, 39, 52
  return [0, 13, 26, 39, 52].map((i) => ps[Math.min(i, ps.length - 1)]);
}

async function main() {
  const a = process.argv.slice(2);
  const parents = a[0] === '--parents' ? a[1].split(',') : pickParents();
  const out = [];
  for (const p of parents) {
    const G = loadFacts(p);
    const tmp = '/work/canon-' + p.slice(0, 12);
    fs.rmSync(tmp, { recursive: true, force: true });
    const man = exportCanon(G, tmp);
    fs.rmSync(tmp, { recursive: true, force: true });
    const r = { parent: p, canon_hash: man.hash, canon_nodes: man.nodes, canon_edges: man.edges, kinds: G.kinds.length };
    r.G = digest(G.nodes.map((n) => ({ id: n.i, sid: n.sid, kind: n.kind, path: n.path, name: n.name, ls: n.ls, le: n.le, runtime: n.runtime, slice: n.slice, is_test: n.is_test, file: n.file, tokens: n.tokens, text: n.text })),
      G.edges.map((e) => ({ kind: e.kind, cls: e.cls, src: e.s, dst: e.d, w: e.w, n: e.n })));
    // ---- ladybug (builders' store, read-only) ----
    try {
      const dir = LS.storeDir(G, '/lbstore/ladybug');
      const meta = JSON.parse(fs.readFileSync(dir + '.meta.json', 'utf8'));
      const lbug = require('@ladybugdb/core');
      const db = new lbug.Database(dir, 256 * 1024 * 1024, true, true, 2 ** 32);
      const c = new lbug.Connection(db);
      const q = (t) => LS.getAll(c.querySync(t));
      const nodes = q('MATCH (n:N) RETURN n.id AS id, n.sid AS sid, n.kind AS kind, n.path AS path, n.name AS name, n.ls AS ls, n.le AS le, n.runtime AS runtime, n.slice AS slice, n.is_test AS is_test, n.file AS file, n.tokens AS tokens, n.text AS text');
      const kindOf = [null, ...G.kinds];
      const arcs = q('MATCH (u:N)-[r:A]->(v:N) RETURN u.id AS src, v.id AS dst, r.kid AS kid, r.cls AS cls, r.w AS w, r.n AS n, r.sym AS sym, r.prim AS prim');
      const prim = arcs.filter((x) => num(x.prim) === 1).map((x) => ({ kind: kindOf[num(x.kid)], cls: CLASSES[num(x.cls)], src: num(x.src), dst: num(x.dst), w: x.w, n: num(x.n) }));
      const mirror = arcs.filter((x) => num(x.prim) === 0);
      const typed = {};
      for (const t of meta.types) {
        typed['f_' + t.t] = num(q(`MATCH ()-[r:f_${t.t}]->() RETURN count(*) AS k`)[0].k);
        if (!t.sym) typed['r_' + t.t] = num(q(`MATCH ()-[r:r_${t.t}]->() RETURN count(*) AS k`)[0].k);
      }
      const expectTyped = {};
      for (const e of G.edges) { const t = LS.typeOf(e.kind, e.cls); expectTyped['f_' + t] = (expectTyped['f_' + t] || 0) + (e.sym ? 2 : 1); if (!e.sym) expectTyped['r_' + t] = (expectTyped['r_' + t] || 0) + 1; }
      const typedBad = Object.keys({ ...typed, ...expectTyped }).filter((k) => typed[k] !== expectTyped[k]);
      const symN = G.edges.filter((e) => e.sym).length;
      r.ladybug = { store: path.basename(dir), meta_canon_hash: meta.canon_hash, meta_hash_equal: meta.canon_hash === man.hash, ...digest(nodes, prim),
        mirror_rows: mirror.length, mirror_expected: symN, mirror_ok: mirror.length === symN && mirror.every((x) => num(x.sym) === 1),
        typed_tables: Object.keys(typed).length, typed_mismatch: typedBad };
      c.closeSync(); db.closeSync();
    } catch (e) { r.ladybug = { error: String(e.stack || e).slice(0, 600) }; }
    // ---- duckpgq (builders' store, read-only) ----
    try {
      const f = DS.storeFile(G, '/dkstore/duckpgq');
      const db = await DS.connect(':memory:');
      await db.run(`ATTACH ${DS.lit(f)} AS st (READ_ONLY)`);
      const meta = Object.fromEntries((await db.all('SELECT k, v FROM st.meta')).map((x) => [x.k, x.v]));
      const nodes = await db.all('SELECT id, sid, kind, path, name, ls, le, runtime, slice, is_test, file, tokens, text FROM st.node');
      const edges = await db.all('SELECT k.name AS kind, c.name AS cls, e.src, e.dst, e.w, e.n_ev AS n FROM st.edge e JOIN st.ekind k USING (kid) JOIN st.eclass c USING (cid)');
      const labels = await db.all("SELECT table_name FROM duckdb_tables() WHERE database_name = 'st' AND table_name LIKE 'l_%'");
      let lsum = 0; for (const l of labels) lsum += (await db.all(`SELECT count(*) AS n FROM st.${l.table_name}`))[0].n;
      r.duckpgq = { store: path.basename(f), meta_canon_hash: meta.canon_hash, meta_hash_equal: meta.canon_hash === man.hash, ...digest(nodes, edges), label_tables: labels.length, label_rows: lsum };
      db.close();
    } catch (e) { r.duckpgq = { error: String(e.stack || e).slice(0, 600) }; }
    // ---- relational (fresh build with the arm's own loader) ----
    try {
      const f = '/work/relational-input-' + p.slice(0, 12) + '.sqlite';
      buildDb(G, f);
      const db = openDb(f);
      const kindN = new Map(db.prepare('SELECT ekid, name FROM ekind').all().map((x) => [x.ekid, x.name]));
      const nk = new Map(db.prepare('SELECT kid, name FROM nkind').all().map((x) => [x.kid, x.name]));
      const text = new Map(db.prepare('SELECT rowid AS r, body FROM fts').all().map((x) => [x.r, x.body]));
      const nodes = db.prepare('SELECT * FROM node').all().map((n) => ({ id: n.id, sid: n.sid, kind: nk.get(n.kid), path: n.path, name: n.name, ls: n.ls, le: n.le, runtime: n.runtime, slice: n.slice, is_test: n.is_test, file: n.file_id, tokens: n.tokens, text: text.get(n.id) }));
      const edges = db.prepare('SELECT * FROM edge WHERE sym = 0 OR src < dst').all().map((e) => ({ kind: kindN.get(e.ekid), cls: CLASSES[e.cid], src: e.src, dst: e.dst, w: e.w, n: e.n }));
      r.relational = { ...digest(nodes, edges), sym_rows: db.prepare('SELECT count(*) AS n FROM edge WHERE sym = 1').get().n };
      db.close(); fs.rmSync(f, { force: true });
    } catch (e) { r.relational = { error: String(e.stack || e).slice(0, 600) }; }
    for (const k of ['ladybug', 'duckpgq', 'relational']) if (r[k] && !r[k].error) r[k].identical_to_G = r[k].node_digest === r.G.node_digest && r[k].edge_digest === r.G.edge_digest && r[k].nodes === r.G.nodes && r[k].edges === r.G.edges;
    out.push(r);
    process.stderr.write(JSON.stringify({ p: p.slice(0, 8), n: r.G.nodes, e: r.G.edges, lb: r.ladybug.identical_to_G, dk: r.duckpgq.identical_to_G, rel: r.relational.identical_to_G, lbh: r.ladybug.meta_hash_equal, dkh: r.duckpgq.meta_hash_equal }) + '\n');
  }
  fs.writeFileSync('/build/audit/graph/inputs.json', JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
