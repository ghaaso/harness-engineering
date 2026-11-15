'use strict';
// TQ: one SQL query function per question kind (protocol section 4), input = the named target only.
//   node tq.js [--split tune]   -> results/relational/tq_diagnostic/relational.<split>.diag.jsonl
//                                  (diagnostic format with targets; not an answer file)
//   The scored answer file (SPEC.md section 12) is written by: node ../common/run.js tq --arm relational
// Each function is SQL (recursive CTEs as metapaths: an ordered sequence of typed steps) plus a line of
// formatting. The reference answers are never read here.
const fs = require('fs');
const path = require('path');
const P = require('../common/paths');
const { graphFor, openArm } = require('../common/arms');

const DEPTH = 12; // depth cap of every recursive step

function kindIds(db) {
  const m = new Map(db.prepare('SELECT ekid, name FROM ekind').all().map((r) => [r.name, r.ekid]));
  return (names) => names.split(',').map((n) => { const v = m.get(n.trim()); return v == null ? -1 : v; }).join(',');
}
// "{k:a,b}" -> kind ids; "{nk:x}" -> node kind id
function sqlWith(db, sql) {
  const K = kindIds(db);
  const NK = new Map(db.prepare('SELECT kid, name FROM nkind').all().map((r) => [r.name, r.kid]));
  // Every join is written driver first (the target, then the recursive set, then indexed lookups);
  // CROSS JOIN pins that order, because the planner has no statistics for a CTE and would otherwise
  // scan the node or edge table and probe the CTE.
  return sql.replace(/(?<!CROSS )\bJOIN\b/g, 'CROSS JOIN').replace(/\{k:([a-z_,]+)\}/g, (m, a) => K(a)).replace(/\{nk:([a-z_]+)\}/g, (m, a) => String(NK.get(a) ?? -1));
}
// path::Symbol label of a node (symbol id after '#', or the kind and name)
const LABEL = `(n.path || '::' || CASE WHEN instr(n.sid, '#') > 0 AND (n.sid LIKE 'sym:%' OR n.sid LIKE 'const:%')
  THEN substr(n.sid, instr(n.sid, '#') + 1) ELSE n.name END)`;

const SQL = {
  // screen -> client calls/renders/outbox -> (BFF) -> backend route -> handler -> calls -> writes_table
  screen_tables: `
WITH RECURSIVE
c(n, d) AS (
  SELECT id, 0 FROM node WHERE path = $path
  UNION
  SELECT e.dst, c.d + 1 FROM c JOIN edge e ON e.src = c.n JOIN node x ON x.id = e.dst
  WHERE c.d < ${DEPTH} AND x.is_test = 0 AND (
        e.ekid IN ({k:defines,calls,renders,passes_callable,enqueues_kind,kind_handled_by})
     OR (e.ekid IN ({k:calls_url,registers_route}) AND COALESCE(x.runtime, '') <> 'backend'))
),
b(n, d) AS (
  SELECT h.dst, 0 FROM c JOIN edge u ON u.src = c.n AND u.ekid = {k:calls_url}
  JOIN node r ON r.id = u.dst AND r.runtime = 'backend'
  JOIN edge h ON h.src = r.id AND h.ekid = {k:registers_route}
  UNION
  SELECT e.dst, b.d + 1 FROM b JOIN edge e ON e.src = b.n JOIN node x ON x.id = e.dst
  WHERE b.d < ${DEPTH} AND x.is_test = 0 AND e.ekid IN ({k:calls,depends_injects,passes_callable})
)
SELECT DISTINCT t.name AS a FROM b JOIN edge w ON w.src = b.n AND w.ekid = {k:writes_table}
JOIN node t ON t.id = w.dst ORDER BY 1`,

  // tests whose call chain reaches the target (real), and tests that mock/override it or its module (fake)
  tests_reach_real: `
WITH RECURSIVE r(n, d) AS (
  SELECT id, 0 FROM node WHERE sid = $sid
  UNION
  SELECT e.src, r.d + 1 FROM r JOIN edge e ON e.dst = r.n
  WHERE r.d < ${DEPTH} AND e.ekid IN ({k:calls,depends_injects,passes_callable,registers_route,test_calls_route,renders})
)
SELECT DISTINCT n.path AS a FROM r JOIN node n ON n.id = r.n WHERE n.is_test = 1 ORDER BY 1`,
  tests_reach_fake: `
SELECT DISTINCT s.path AS a FROM node t
JOIN edge e ON e.dst IN (t.id, t.file_id) AND e.ekid IN ({k:mocks,overrides})
JOIN node s ON s.id = e.src
WHERE t.sid = $sid AND s.is_test = 1 ORDER BY 1`,

  // invariants with a constrains edge to the file or to anything defined in it
  invariants_on_file: `
SELECT DISTINCT 'CLAUDE.md:L' || i.ls AS a, i.ls FROM node t
JOIN edge e ON e.dst = t.id AND e.ekid = {k:constrains}
JOIN node i ON i.id = e.src AND i.kid = {nk:invariant}
WHERE t.path = $path ORDER BY i.ls`,

  // client functions that call a route whose handler reaches the target, plus their direct callers
  other_half: `
WITH RECURSIVE r(n, d) AS (
  SELECT id, 0 FROM node WHERE sid = $sid
  UNION
  SELECT e.src, r.d + 1 FROM r JOIN edge e ON e.dst = r.n JOIN node x ON x.id = e.src
  WHERE r.d < ${DEPTH} AND x.is_test = 0 AND e.ekid IN ({k:calls,depends_injects,passes_callable,registers_route})
),
sites(n) AS (
  SELECT DISTINCT e.src FROM r JOIN node rt ON rt.id = r.n AND rt.kid = {nk:route}
  JOIN edge e ON e.dst = rt.id AND e.ekid = {k:calls_url} JOIN node s ON s.id = e.src
  WHERE s.is_test = 0 AND COALESCE(s.runtime, '') <> 'backend'
)
SELECT DISTINCT ${LABEL} AS a FROM (
  SELECT n FROM sites
  UNION SELECT e.src FROM sites JOIN edge e ON e.dst = sites.n AND e.ekid = {k:calls}
) z JOIN node n ON n.id = z.n WHERE n.is_test = 0 AND COALESCE(n.runtime, '') <> 'backend' ORDER BY 1`,

  // readers of a setting: reads_setting sources mapped to their enclosing definition
  setting_readers: `
SELECT DISTINCT
  CASE WHEN s.kid IN ({nk:function},{nk:method},{nk:component},{nk:class},{nk:constant}) THEN
    s.path || '::' || substr(s.sid, instr(s.sid, '#') + 1)
  ELSE COALESCE(
    (SELECT f.path || '::' || substr(f.sid, instr(f.sid, '#') + 1) FROM node f
      WHERE f.path = ev.path AND f.kid IN ({nk:function},{nk:method},{nk:constant}) AND ev.line BETWEEN f.ls AND f.le
      ORDER BY f.ls DESC LIMIT 1),
    ev.path || '::' || st.name) END AS a
FROM node st
JOIN edge e ON e.dst = st.id AND e.ekid = {k:reads_setting}
JOIN edge_ev ev ON ev.src = e.src AND ev.ekid = e.ekid AND ev.dst = e.dst
JOIN node s ON s.id = e.src
WHERE (st.sid = 'setting:' || $name OR st.sid = 'setting:env/' || $env) AND s.is_test = 0
ORDER BY 1`,

  // migrations whose upgrade() touches the table (foreign-key ops on other tables excluded)
  migrations_touch_table: `
SELECT DISTINCT m.name AS a FROM node t
JOIN edge e ON e.dst = t.id AND e.ekid = {k:migration_touches}
JOIN node m ON m.id = e.src
JOIN edge_ev ev ON ev.src = e.src AND ev.ekid = e.ekid AND ev.dst = e.dst
JOIN node up ON up.path = m.path AND up.sid = 'sym:' || m.path || '#upgrade'
WHERE t.sid = 'table:' || $table AND ev.line BETWEEN up.ls AND up.le
  AND COALESCE(ev.op, '') <> 'create_foreign_key'
ORDER BY 1`,

  // call sites of a backend route, BFF callers of the same path, and direct callers of the call sites
  route_call_sites: `
SELECT DISTINCT ${LABEL} AS a FROM node r JOIN edge e ON e.dst = r.id AND e.ekid = {k:calls_url}
JOIN node n ON n.id = e.src WHERE r.sid = 'route:backend ' || $route AND n.is_test = 0 ORDER BY 1`,
  route_via_bff: `
SELECT DISTINCT ${LABEL} AS a FROM node r JOIN edge e ON e.dst = r.id AND e.ekid = {k:calls_url}
JOIN node n ON n.id = e.src WHERE r.sid = 'route:ops ' || $route AND n.is_test = 0 ORDER BY 1`,
  route_direct_callers: `
SELECT DISTINCT ${LABEL} AS a FROM node r
JOIN edge e ON e.dst = r.id AND e.ekid = {k:calls_url}
JOIN edge c ON c.dst = e.src AND c.ekid = {k:calls}
JOIN node n ON n.id = c.src
JOIN node s ON s.id = e.src
WHERE r.sid = 'route:backend ' || $route AND n.is_test = 0 AND s.is_test = 0 ORDER BY 1`,

  // entry points whose execution reaches the target, and the client functions that call those routes
  change_reach: `
WITH RECURSIVE r(n, d) AS (
  SELECT id, 0 FROM node WHERE sid = $sid
  UNION
  SELECT e.src, r.d + 1 FROM r JOIN edge e ON e.dst = r.n JOIN node x ON x.id = e.src
  WHERE r.d < ${DEPTH} AND x.is_test = 0
    AND e.ekid IN ({k:calls,depends_injects,passes_callable,registers_route,runs})
)
SELECT DISTINCT 'backend' AS rt, CASE
    WHEN n.kid = {nk:route} THEN n.name
    WHEN n.kid = {nk:scheduled_job} THEN 'scheduler:' || n.name
    ELSE 'script:' || n.path END AS a
  FROM r JOIN node n ON n.id = r.n
  WHERE (n.kid = {nk:route} AND n.runtime = 'backend') OR n.kid = {nk:scheduled_job} OR n.path LIKE 'backend/scripts/%'
UNION
SELECT DISTINCT CASE WHEN s.path LIKE 'technician-app/%' THEN 'mobile' ELSE 'web' END, s.path || '::' || substr(s.sid, instr(s.sid, '#') + 1)
  FROM r JOIN node rt ON rt.id = r.n AND rt.kid = {nk:route} AND rt.runtime = 'backend'
  JOIN edge e ON e.dst = rt.id AND e.ekid = {k:calls_url} JOIN node s ON s.id = e.src
  WHERE s.is_test = 0 AND (s.path LIKE 'src/%' OR s.path LIKE 'technician-app/%')
ORDER BY 1, 2`,
};

// Target extraction from the question text (the named target only): the shared parser of every arm
// (arms/common/tqtarget.js; pre-flight fix round 1 moved it there and widened it to the held-out phrasings)
const { target, routesOf } = require('../common/tqtarget');

// variants for the target forms added in the pre-flight fix (the TUNE forms use SQL unchanged):
//   other_half with { path }: start from every node of the file (as screen_tables does)
//   setting_readers without both name and env: the condition built from the fields present; { config }
//   matches the setting node's name (a mobile config value such as config.video.minMs)
const SETTING_COND = "(st.sid = 'setting:' || $name OR st.sid = 'setting:env/' || $env)";
function settingVariant(tg) {
  if (tg.name != null && tg.env != null && tg.config == null) return { sql: SQL.setting_readers, p: { name: tg.name, env: tg.env } };
  const c = []; const p = {};
  if (tg.name != null) { c.push("st.sid = 'setting:' || $name"); p.name = tg.name; }
  if (tg.env != null) { c.push("st.sid = 'setting:env/' || $env"); p.env = tg.env; }
  if (tg.config != null) { c.push('st.name = $config'); p.config = tg.config; }
  if (!c.length) throw new Error('setting target without a name, env or config');
  return { sql: SQL.setting_readers.replace(SETTING_COND, '(' + c.join(' OR ') + ')'), p };
}
// several routes: each answered alone, the lists merged (distinct, SQLite BINARY order)
const byBytes = (a, b) => Buffer.compare(Buffer.from(String(a)), Buffer.from(String(b)));
const mergeLists = (lists) => [...new Set(lists.flat())].sort(byBytes);

function answer(db, q, tg) {
  const all = (name, p) => db.prepare(sqlWith(db, SQL[name])).all(p);
  const allSql = (sql, p) => db.prepare(sqlWith(db, sql)).all(p);
  const col = (rows) => rows.map((r) => r.a);
  switch (q.kind) {
    case 'screen_tables': return col(all('screen_tables', { path: tg.path }));
    case 'tests_reach': return { real: col(all('tests_reach_real', { sid: tg.sid })), fake: col(all('tests_reach_fake', { sid: tg.sid })) };
    case 'invariants_on_file': return col(all('invariants_on_file', { path: tg.path }));
    case 'other_half': return tg.path != null && tg.sid == null
      ? col(allSql(SQL.other_half.replace('SELECT id, 0 FROM node WHERE sid = $sid', 'SELECT id, 0 FROM node WHERE path = $path'), { path: tg.path }))
      : col(all('other_half', { sid: tg.sid }));
    case 'setting_readers': { const v = settingVariant(tg); return col(allSql(v.sql, v.p)); }
    case 'migrations_touch_table': return col(all('migrations_touch_table', { table: tg.table })).map((x) => String(x).padStart(4, '0'));
    case 'route_clients': {
      const one = (route) => ({
        call_sites: col(all('route_call_sites', { route })),
        via_bff: col(all('route_via_bff', { route })),
        direct_callers: col(all('route_direct_callers', { route })),
      });
      const rs = routesOf(tg);
      if (rs.length === 1) return one(rs[0]);
      const parts = rs.map(one);
      return { call_sites: mergeLists(parts.map((x) => x.call_sites)), via_bff: mergeLists(parts.map((x) => x.via_bff)), direct_callers: mergeLists(parts.map((x) => x.direct_callers)) };
    }
    case 'change_reach': {
      const rows = all('change_reach', { sid: tg.sid }); const o = { backend: [], web: [], mobile: [] };
      for (const r of rows) o[r.rt].push(r.a);
      return o;
    }
    default: throw new Error(q.kind);
  }
}

async function main() {
  const split = process.argv.includes('--split') ? process.argv[process.argv.indexOf('--split') + 1] : 'tune';
  if (split !== 'tune') throw new Error('REFUSED: TQ held-out is not run in this phase');
  const qs = fs.readFileSync(path.join(P.TASKS, 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse)
    .filter((q) => q.split === split);
  const G = graphFor(P.FROZEN);
  const arm = await openArm('relational', G);
  const db = arm.raw.db;
  const out = [];
  for (const q of qs) {
    const tg = target(q);
    const s = process.hrtime.bigint();
    let a; let err = null;
    try { a = answer(db, q, tg); } catch (e) { err = String(e.message || e); }
    const ms = Number(process.hrtime.bigint() - s) / 1e6;
    const exists = tg.sid ? !!db.prepare('SELECT 1 FROM node WHERE sid = ?').get(tg.sid) : null;
    out.push({ id: q.id, kind: q.kind, split: q.split, arm: 'relational', target: tg, target_node_found: exists, answer: a, error: err, ms: +ms.toFixed(2) });
  }
  arm.close();
  // diagnostic file, kept out of results/tq/ so that the only question answer file there is
  // <arm>.<split>.answers.jsonl (written by common/run.js tq; addendum 3 / SPEC 12)
  const f = path.join(P.RESULTS, 'relational', 'tq_diagnostic', 'relational.' + split + '.diag.jsonl');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, out.map((x) => JSON.stringify(x)).join('\n') + '\n');
  for (const x of out) console.log(x.id, x.kind, JSON.stringify(x.target), x.target_node_found, x.error || JSON.stringify(x.answer).slice(0, 300), x.ms + 'ms');
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { SQL, target, answer, sqlWith, settingVariant };
