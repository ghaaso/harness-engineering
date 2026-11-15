'use strict';
// TQ (code-reading questions): one query per question KIND, written as typed SQL/PGQ path patterns over
// the store's per-kind edge labels. The question intent of every kind mirrors the relational arm's
// queries (arms/relational/tq.js) so that a difference measures the engine, not a different reading.
//
// DuckPGQ limits shape these queries: a quantified segment takes exactly one label, has no edge filter,
// cannot point left, and only one quantified segment fits in a MATCH. So every multi-kind repeated step
// is a label of its own (a union of kinds, a table stored at build time by store.js, reversed when the walk
// goes upstream, with the interior-vertex filter baked in), and a chain with two repeated steps is two
// GRAPH_TABLE queries joined in SQL. Evidence-line logic (enclosing definition, upgrade() body) is SQL.
//   node arms/duckpgq/tq.js [--split tune]   -> results/duckpgq/tq_diagnostic/duckpgq.<split>.jsonl (with targets)
//   the scored answers file: node arms/common/run.js tq --arm duckpgq --split tune
const fs = require('fs');
const path = require('path');
const { lit } = require('./store');

const DEPTH = 12; // depth cap of every repeated step (as the relational arm)
const DEF_KINDS = "('function', 'method', 'component', 'class', 'constant')";

// the named target of a question: the shared parser of every arm (arms/common/tqtarget.js; the
// pre-flight fix round 1 replaced this arm's copy of the relational rules with it)
const { target, routesOf } = require('../common/tqtarget');

// the TQ property graph gtq (the multi-kind labels below and the single-kind labels) is STORED in the
// store file at build time (store.js tqLabelDefs, TQ_SINGLE); nothing is declared per connection
async function ensureGraph(g) { void g; }

const LABEL = (n) => `(${n}.path || '::' || CASE WHEN instr(${n}.sid, '#') > 0 AND (${n}.sid LIKE 'sym:%' OR ${n}.sid LIKE 'const:%')
  THEN substr(${n}.sid, instr(${n}.sid, '#') + 1) ELSE ${n}.name END)`;

// one query per kind; $-placeholders are filled with SQL literals of the target
const Q = {
  // two statements: the backend handlers reached from the screen, then (handler ids inlined into the
  // vertex filter, which DuckPGQ pushes below the path-length function) what those handlers execute
  screen_tables_heads: `
WITH c AS (SELECT DISTINCT y AS n FROM GRAPH_TABLE (gtq MATCH (f:node WHERE f.path = $path)-[e:tq_client]->{0,${DEPTH}}(x:node) COLUMNS (x.id AS y))),
h AS (SELECT DISTINCT hd FROM GRAPH_TABLE (gtq MATCH (s:node)-[u:calls_url]->(r:node WHERE r.runtime = 'backend')-[k:registers_route]->(hn:node) COLUMNS (s.id AS s, hn.id AS hd)) WHERE s IN (SELECT n FROM c))
SELECT hd AS a FROM h ORDER BY 1`,
  screen_tables: `
WITH b AS (SELECT DISTINCT y AS n FROM GRAPH_TABLE (gtq MATCH (s:node WHERE s.id IN ($heads))-[e:tq_exec]->{0,${DEPTH}}(x:node) COLUMNS (x.id AS y)))
SELECT DISTINCT w.name AS a FROM GRAPH_TABLE (gtq MATCH (s:node)-[e:writes_table]->(t:node) COLUMNS (s.id AS s, t.name AS name)) w WHERE w.s IN (SELECT n FROM b) ORDER BY 1`,

  tests_reach_real: `
SELECT DISTINCT path AS a FROM GRAPH_TABLE (gtq MATCH (t:node WHERE t.sid = $sid)-[e:tq_up_tests]->{0,${DEPTH}}(x:node WHERE x.is_test = 1) COLUMNS (x.path AS path)) ORDER BY 1`,
  tests_reach_fake: `
WITH t AS (SELECT id, file FROM node WHERE sid = $sid)
SELECT DISTINCT path AS a FROM (
  SELECT s, path, d FROM GRAPH_TABLE (gtq MATCH (x:node WHERE x.is_test = 1)-[m:mocks]->(y:node) COLUMNS (x.id AS s, x.path AS path, y.id AS d))
  UNION ALL SELECT s, path, d FROM GRAPH_TABLE (gtq MATCH (x:node WHERE x.is_test = 1)-[m:overrides]->(y:node) COLUMNS (x.id AS s, x.path AS path, y.id AS d))
) z WHERE z.d IN (SELECT id FROM t UNION SELECT file FROM t) ORDER BY 1`,

  invariants_on_file: `
SELECT a FROM (SELECT DISTINCT 'CLAUDE.md:L' || ls AS a, ls FROM GRAPH_TABLE (gtq MATCH (i:node WHERE i.kind = 'invariant')-[c:constrains]->(t:node WHERE t.path = $path) COLUMNS (i.ls AS ls))) ORDER BY ls`,

  other_half: `
WITH r AS (SELECT DISTINCT y AS n FROM GRAPH_TABLE (gtq MATCH (t:node WHERE t.sid = $sid)-[e:tq_up_prod]->{0,${DEPTH}}(x:node) COLUMNS (x.id AS y))),
sites AS (SELECT DISTINCT s FROM GRAPH_TABLE (gtq MATCH (sn:node WHERE sn.is_test = 0 AND coalesce(sn.runtime, '') <> 'backend')-[u:calls_url]->(rt:node WHERE rt.kind = 'route') COLUMNS (sn.id AS s, rt.id AS rt)) WHERE rt IN (SELECT n FROM r)),
callers AS (SELECT DISTINCT c FROM GRAPH_TABLE (gtq MATCH (cn:node)-[k:calls]->(sn:node) COLUMNS (cn.id AS c, sn.id AS s)) WHERE s IN (SELECT s FROM sites))
SELECT DISTINCT ${LABEL('n')} AS a FROM node n WHERE n.id IN (SELECT s FROM sites UNION SELECT c FROM callers)
  AND n.is_test = 0 AND coalesce(n.runtime, '') <> 'backend' ORDER BY 1`,

  setting_readers: `
WITH rd AS (SELECT s, st FROM GRAPH_TABLE (gtq MATCH (sn:node)-[e:reads_setting]->(tn:node WHERE tn.sid = 'setting:' || $name OR tn.sid = 'setting:env/' || $env) COLUMNS (sn.id AS s, tn.id AS st)))
SELECT DISTINCT
  CASE WHEN s.kind IN ${DEF_KINDS} THEN s.path || '::' || substr(s.sid, instr(s.sid, '#') + 1)
  ELSE coalesce(
    (SELECT f.path || '::' || substr(f.sid, instr(f.sid, '#') + 1) FROM node f
      WHERE f.path = ev.path AND f.kind IN ('function', 'method', 'constant') AND ev.line BETWEEN f.ls AND f.le ORDER BY f.ls DESC LIMIT 1),
    ev.path || '::' || tn.name) END AS a
FROM rd JOIN node s ON s.id = rd.s JOIN node tn ON tn.id = rd.st
JOIN edge_ev ev ON ev.src = rd.s AND ev.dst = rd.st AND ev.kid = $kid_reads_setting
WHERE s.is_test = 0 ORDER BY 1`,

  migrations_touch_table: `
WITH mt AS (SELECT m, t FROM GRAPH_TABLE (gtq MATCH (mn:node)-[e:migration_touches]->(tn:node WHERE tn.sid = 'table:' || $table) COLUMNS (mn.id AS m, tn.id AS t)))
SELECT DISTINCT m.name AS a FROM mt JOIN node m ON m.id = mt.m
JOIN edge_ev ev ON ev.src = mt.m AND ev.dst = mt.t AND ev.kid = $kid_migration_touches
JOIN node up ON up.path = m.path AND up.sid = 'sym:' || m.path || '#upgrade'
WHERE ev.line BETWEEN up.ls AND up.le AND coalesce(ev.op, '') <> 'create_foreign_key' ORDER BY 1`,

  route_call_sites: `
SELECT DISTINCT a FROM GRAPH_TABLE (gtq MATCH (n:node WHERE n.is_test = 0)-[u:calls_url]->(r:node WHERE r.sid = 'route:backend ' || $route) COLUMNS (${LABEL('n')} AS a)) ORDER BY 1`,
  route_via_bff: `
SELECT DISTINCT a FROM GRAPH_TABLE (gtq MATCH (n:node WHERE n.is_test = 0)-[u:calls_url]->(r:node WHERE r.sid = 'route:ops ' || $route) COLUMNS (${LABEL('n')} AS a)) ORDER BY 1`,
  route_direct_callers: `
SELECT DISTINCT a FROM GRAPH_TABLE (gtq MATCH (n:node WHERE n.is_test = 0)-[c:calls]->(s:node WHERE s.is_test = 0)-[u:calls_url]->(r:node WHERE r.sid = 'route:backend ' || $route) COLUMNS (${LABEL('n')} AS a)) ORDER BY 1`,

  change_reach: `
WITH r AS (SELECT DISTINCT y AS n FROM GRAPH_TABLE (gtq MATCH (t:node WHERE t.sid = $sid)-[e:tq_up_entry]->{0,${DEPTH}}(x:node) COLUMNS (x.id AS y)))
SELECT DISTINCT 'backend' AS rt, CASE WHEN n.kind = 'route' THEN n.name WHEN n.kind = 'scheduled_job' THEN 'scheduler:' || n.name ELSE 'script:' || n.path END AS a
  FROM node n WHERE n.id IN (SELECT n FROM r) AND ((n.kind = 'route' AND n.runtime = 'backend') OR n.kind = 'scheduled_job' OR n.path LIKE 'backend/scripts/%')
UNION
SELECT DISTINCT CASE WHEN path LIKE 'technician-app/%' THEN 'mobile' ELSE 'web' END, path || '::' || substr(sid, instr(sid, '#') + 1)
  FROM GRAPH_TABLE (gtq MATCH (s:node WHERE s.is_test = 0)-[u:calls_url]->(rt:node WHERE rt.kind = 'route' AND rt.runtime = 'backend') COLUMNS (s.path AS path, s.sid AS sid, rt.id AS rt))
  WHERE rt IN (SELECT n FROM r) AND (path LIKE 'src/%' OR path LIKE 'technician-app/%')
ORDER BY 1, 2`,
};

function fill(g, sql, p) {
  return sql.replace(/\$(kid_[a-z_]+|[a-z]+)\b/g, (m, k) => {
    if (k.startsWith('kid_')) return String(g.kindId.get(k.slice(4)) ?? -1);
    if (!(k in p)) throw new Error('missing parameter ' + k);
    return p[k] && p[k].raw !== undefined ? p[k].raw : lit(p[k]);
  });
}

// variants for the target forms added in the pre-flight fix (the TUNE forms run the queries unchanged):
// other_half from every node of a file ({ path }); setting_readers with the condition built from the
// fields present ({ config } matches the setting node's name)
const SETTING_COND = "tn.sid = 'setting:' || $name OR tn.sid = 'setting:env/' || $env";
function settingQuery(tg) {
  if (tg.name != null && tg.env != null && tg.config == null) return { sql: Q.setting_readers, p: { name: tg.name, env: tg.env } };
  const c = []; const p = {};
  if (tg.name != null) { c.push("tn.sid = 'setting:' || $name"); p.name = tg.name; }
  if (tg.env != null) { c.push("tn.sid = 'setting:env/' || $env"); p.env = tg.env; }
  if (tg.config != null) { c.push('tn.name = $config'); p.config = tg.config; }
  if (!c.length) throw new Error('setting target without a name, env or config');
  return { sql: Q.setting_readers.replace(SETTING_COND, c.join(' OR ')), p };
}
// several routes: each answered alone, the lists merged (distinct, byte order as ORDER BY gives)
const byBytes = (a, b) => Buffer.compare(Buffer.from(String(a)), Buffer.from(String(b)));
const mergeLists = (lists) => [...new Set(lists.flat())].sort(byBytes);

async function answer(g, q, tg = target(q)) {
  await ensureGraph(g);
  let lookups = 0;
  const col = async (name, p) => { lookups++; return (await g.all(fill(g, Q[name], p))).map((r) => r.a); };
  const colSql = async (sql, p) => { lookups++; return (await g.all(fill(g, sql, p))).map((r) => r.a); };
  let ans;
  switch (q.kind) {
    case 'screen_tables': { const hd = await col('screen_tables_heads', { path: tg.path }); ans = hd.length ? await col('screen_tables', { heads: { raw: hd.join(', ') } }) : []; break; }
    case 'tests_reach': ans = { real: await col('tests_reach_real', { sid: tg.sid }), fake: await col('tests_reach_fake', { sid: tg.sid }) }; break;
    case 'invariants_on_file': ans = await col('invariants_on_file', { path: tg.path }); break;
    case 'other_half': ans = tg.path != null && tg.sid == null
      ? await colSql(Q.other_half.replace('MATCH (t:node WHERE t.sid = $sid)', 'MATCH (t:node WHERE t.path = $path)'), { path: tg.path })
      : await col('other_half', { sid: tg.sid }); break;
    case 'setting_readers': { const v = settingQuery(tg); ans = await colSql(v.sql, v.p); break; }
    case 'migrations_touch_table': ans = (await col('migrations_touch_table', { table: tg.table })).map((x) => String(x).padStart(4, '0')); break;
    case 'route_clients': {
      const one = async (route) => ({ call_sites: await col('route_call_sites', { route }), via_bff: await col('route_via_bff', { route }), direct_callers: await col('route_direct_callers', { route }) });
      const rs = routesOf(tg);
      if (rs.length === 1) { ans = await one(rs[0]); break; }
      const parts = []; for (const r of rs) parts.push(await one(r));
      ans = { call_sites: mergeLists(parts.map((x) => x.call_sites)), via_bff: mergeLists(parts.map((x) => x.via_bff)), direct_callers: mergeLists(parts.map((x) => x.direct_callers)) };
      break;
    }
    case 'change_reach': {
      lookups++;
      const rows = await g.all(fill(g, Q.change_reach, { sid: tg.sid })); ans = { backend: [], web: [], mobile: [] };
      for (const r of rows) ans[r.rt].push(r.a);
      break;
    }
    default: throw new Error(q.kind);
  }
  // one TQ call is one lookup for the reader (as the relational arm reports); the query count is kept apart
  return { answer: ans, lookups: 1, queries: lookups };
}

async function main() {
  const P = require('../common/paths');
  const { graphFor, openArm } = require('../common/arms');
  const split = process.argv.includes('--split') ? process.argv[process.argv.indexOf('--split') + 1] : 'tune';
  if (split !== 'tune') throw new Error('REFUSED: TQ held-out is not run in this phase');
  const qs = fs.readFileSync(path.join(P.TASKS, 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((x) => x.split === split);
  const G = graphFor(P.FROZEN);
  const arm = await openArm('duckpgq', G);
  const g = arm.raw.graph;
  const out = [];
  for (const q of qs) {
    const tg = target(q);
    const s = process.hrtime.bigint(); let a = null; let err = null;
    try { a = (await answer(g, q, tg)).answer; } catch (e) { err = String(e.message || e); }
    const ms = Number(process.hrtime.bigint() - s) / 1e6;
    const exists = tg.sid ? (await g.all(`SELECT count(*) AS n FROM node WHERE sid = ${lit(tg.sid)}`))[0].n > 0 : null;
    out.push({ id: q.id, kind: q.kind, split: q.split, arm: 'duckpgq', target: tg, target_node_found: exists, answer: a, error: err, ms: +ms.toFixed(2) });
  }
  await arm.close();
  const f = path.join(P.RESULTS, 'duckpgq', 'tq_diagnostic', 'duckpgq.' + split + '.jsonl');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, out.map((x) => JSON.stringify(x)).join('\n') + '\n');
  for (const x of out) console.log(x.id, x.kind, JSON.stringify(x.target), x.target_node_found, x.error || JSON.stringify(x.answer).slice(0, 300), x.ms + 'ms');
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { Q, target, answer, ensureGraph, fill, settingQuery };
