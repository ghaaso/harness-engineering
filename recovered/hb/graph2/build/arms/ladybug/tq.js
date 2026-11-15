'use strict';
// TQ on LadybugDB: one Cypher query function per question kind (protocol section 4), input = the named
// target only (the target parser is the relational arm's, so both arms read the same target). Each
// kind is the relational arm's SQL rewritten as Cypher over the typed per-kind tables (f_<kind>) and
// the evidence table EV. Recursive CTEs become recursive SHORTEST patterns (reachability within the
// depth cap equals "a shortest path of length <= cap exists", since every filter is per edge or per
// node). One exception, an engine limit: screen_tables' first stage keeps an edge only when
// "the kind is in set 1, or the kind is in set 2 and the node it enters is not backend". A recursive
// pattern filter may not mix the relationship and the node ("Cannot evaluate ... because it depends on
// both n and r"), so that stage runs as one Cypher query per BFS level, the loop in application code.
//   node tq.js [--split tune]   -> results/ladybug/tq_diagnostic/ladybug.<split>.jsonl (diagnostic, with targets)
//   The scored answer file (SPEC.md section 12) is written by: node ../common/run.js tq --arm ladybug
// The reference answers are never read here.
const fs = require('fs');
const path = require('path');
const P = require('../common/paths');
const { graphFor } = require('../common/arms');
// the shared target parser of every arm (pre-flight fix round 1; before, the relational arm's copy)
const { target, routesOf } = require('../common/tqtarget');
const S = require('./store');

const DEPTH = 12; // depth cap of every recursive step (the relational arm's)
const num = S.num;

// suffix after the first '#', or the whole string (SQLite substr(s, instr(s, '#') + 1))
const SUF = (x) => `CASE WHEN contains(${x}, '#') THEN regexp_extract(${x}, '^[^#]*#(.*)$', 1) ELSE ${x} END`;
// path::Symbol label of a node (SQLite LIKE is case-insensitive for ASCII, hence lower())
const LABEL = (n) => `${n}.path + '::' + CASE WHEN contains(${n}.sid, '#') AND regexp_matches(lower(${n}.sid), '^(sym|const):') THEN regexp_extract(${n}.sid, '^[^#]*#(.*)$', 1) ELSE ${n}.name END`;
const DEFS = "['function', 'method', 'constant']";

// SQLite BINARY collation (UTF-8 bytes), NULL first
const byBytes = (a, b) => (a == null ? (b == null ? 0 : -1) : b == null ? 1 : Buffer.compare(Buffer.from(String(a)), Buffer.from(String(b))));
const sortU = (xs) => [...new Set(xs)].sort(byBytes);

function labels(g, kinds) {
  const want = new Set(kinds);
  return g.types.filter((x) => want.has(x.kind)).map((x) => 'f_' + x.t);
}
function kidsOf(g, kinds) { return kinds.map((k) => g.kindId.get(k)).filter((x) => x != null); }

// nodes reachable from the start ids within DEPTH edges (start included); dir 'out' follows edges
// forward, 'in' backward; the node filter applies to every node entered
function reach(g, start, kinds, dir, nodePred) {
  const out = new Set(start);
  const L = labels(g, kinds);
  if (!start.length || !L.length) return [...out];
  const [a, b] = dir === 'out' ? ['-', '->'] : ['<-', '-'];
  const f = nodePred ? ` (r, n | WHERE ${nodePred('n')})` : '';
  for (const r of g.q(`MATCH (s:N)${a}[p:${L.join('|')}* SHORTEST 1..${DEPTH}${f}]${b}(v:N) WHERE s.id IN $S RETURN DISTINCT v.id AS v`, { S: start })) out.add(num(r.v));
  return [...out];
}
const ids = (rows, k = 'i') => rows.map((r) => num(r[k]));

const KINDS = {
  screen1: ['defines', 'calls', 'renders', 'passes_callable', 'enqueues_kind', 'kind_handled_by'],
  screen2: ['calls_url', 'registers_route'],
  backendCalls: ['calls', 'depends_injects', 'passes_callable'],
  testsReal: ['calls', 'depends_injects', 'passes_callable', 'registers_route', 'test_calls_route', 'renders'],
  otherHalf: ['calls', 'depends_injects', 'passes_callable', 'registers_route'],
  change: ['calls', 'depends_injects', 'passes_callable', 'registers_route', 'runs'],
};

const Q = {
  // screen -> client calls/renders/outbox -> (BFF) -> backend route -> handler -> calls -> writes_table
  screen_tables(g, tg) {
    const start = ids(g.q('MATCH (n:N) WHERE n.path = $p RETURN n.id AS i', { p: tg.path }));
    const k1 = kidsOf(g, KINDS.screen1); const k2 = kidsOf(g, KINDS.screen2);
    const L = labels(g, [...KINDS.screen1, ...KINDS.screen2]);
    const seen = new Set(start); let F = start;
    for (let d = 0; d < DEPTH && F.length && L.length; d++) {
      const nx = ids(g.q(`MATCH (u:N)-[e:${L.join('|')}]->(x:N) WHERE u.id IN $F AND x.is_test = 0 AND (e.kid IN $k1 OR (e.kid IN $k2 AND coalesce(x.runtime, '') <> 'backend')) RETURN DISTINCT x.id AS i`, { F, k1, k2 }));
      F = nx.filter((x) => !seen.has(x)); for (const x of F) seen.add(x);
    }
    const c = [...seen];
    const Lu = labels(g, ['calls_url']); const Lr = labels(g, ['registers_route']);
    if (!Lu.length || !Lr.length) return [];
    const b0 = ids(g.q(`MATCH (c:N)-[:${Lu.join('|')}]->(r:N)-[:${Lr.join('|')}]->(h:N) WHERE c.id IN $C AND r.runtime = 'backend' RETURN DISTINCT h.id AS i`, { C: c }));
    const b = reach(g, b0, KINDS.backendCalls, 'out', (n) => `${n}.is_test = 0`);
    const Lw = labels(g, ['writes_table']);
    if (!Lw.length) return [];
    return sortU(g.q(`MATCH (b:N)-[:${Lw.join('|')}]->(t:N) WHERE b.id IN $B RETURN DISTINCT t.name AS a`, { B: b }).map((r) => r.a));
  },

  // tests whose call chain reaches the target (real), and tests that mock/override it or its module (fake)
  tests_reach(g, tg) {
    const t = ids(g.q('MATCH (n:N) WHERE n.sid = $sid RETURN n.id AS i', { sid: tg.sid }));
    const r = reach(g, t, KINDS.testsReal, 'in', null);
    const real = sortU(g.q('MATCH (n:N) WHERE n.id IN $R AND n.is_test = 1 RETURN DISTINCT n.path AS a', { R: r }).map((x) => x.a));
    const Lm = labels(g, ['mocks', 'overrides']);
    const fake = Lm.length ? sortU(g.q(`MATCH (t:N) WHERE t.sid = $sid MATCH (s:N)-[:${Lm.join('|')}]->(x:N) WHERE (x.id = t.id OR x.id = t.file) AND s.is_test = 1 RETURN DISTINCT s.path AS a`, { sid: tg.sid }).map((x) => x.a)) : [];
    return { real, fake };
  },

  // invariants with a constrains edge to the file or to anything defined in it
  invariants_on_file(g, tg) {
    const L = labels(g, ['constrains']);
    if (!L.length) return [];
    const rows = g.q(`MATCH (i:N)-[:${L.join('|')}]->(t:N) WHERE t.path = $p AND i.kind = 'invariant' RETURN DISTINCT 'CLAUDE.md:L' + CAST(i.ls AS STRING) AS a, i.ls AS ls`, { p: tg.path });
    return rows.sort((x, y) => num(x.ls) - num(y.ls) || byBytes(x.a, y.a)).map((x) => x.a);
  },

  // client functions that call a route whose handler reaches the target, plus their direct callers
  other_half(g, tg) {
    // a file target ({ path }, pre-flight fix): every node of the file, as screen_tables starts
    const t = tg.path != null && tg.sid == null
      ? ids(g.q('MATCH (n:N) WHERE n.path = $p RETURN n.id AS i', { p: tg.path }))
      : ids(g.q('MATCH (n:N) WHERE n.sid = $sid RETURN n.id AS i', { sid: tg.sid }));
    const r = reach(g, t, KINDS.otherHalf, 'in', (n) => `${n}.is_test = 0`);
    const Lu = labels(g, ['calls_url']);
    if (!Lu.length) return [];
    const sites = ids(g.q(`MATCH (s:N)-[:${Lu.join('|')}]->(rt:N) WHERE rt.id IN $R AND rt.kind = 'route' AND s.is_test = 0 AND coalesce(s.runtime, '') <> 'backend' RETURN DISTINCT s.id AS i`, { R: r }));
    const Lc = labels(g, ['calls']);
    const callers = Lc.length && sites.length ? ids(g.q(`MATCH (n:N)-[:${Lc.join('|')}]->(s:N) WHERE s.id IN $X RETURN DISTINCT n.id AS i`, { X: sites })) : [];
    const z = [...new Set([...sites, ...callers])];
    if (!z.length) return [];
    return sortU(g.q(`MATCH (n:N) WHERE n.id IN $Z AND n.is_test = 0 AND coalesce(n.runtime, '') <> 'backend' RETURN DISTINCT ${LABEL('n')} AS a`, { Z: z }).map((x) => x.a));
  },

  // readers of a setting: reads_setting sources mapped to their enclosing definition (the innermost
  // function, method or constant of the evidence line; SQLite's LIMIT 1 among equal starts is
  // unspecified, the smallest label is taken here). Pre-flight fix round 2: LadybugDB's string + treats
  // NULL as '', so with no enclosing definition the label was '::' (not NULL, as SQLite's || gives) and
  // coalesce() never fell back to path::NAME; the CASE keeps it NULL, as in the relational query.
  setting_readers(g, tg) {
    const L = labels(g, ['reads_setting']);
    if (!L.length) return [];
    // the condition on the setting node: the TUNE form unchanged when both name and env are given; else
    // built from the fields present ({ config } matches the node's name; pre-flight fix)
    let cond = "(st.sid = 'setting:' + $name OR st.sid = 'setting:env/' + $env)"; let p = { name: tg.name, env: tg.env };
    if (!(tg.name != null && tg.env != null && tg.config == null)) {
      const c = []; p = {};
      if (tg.name != null) { c.push("st.sid = 'setting:' + $name"); p.name = tg.name; }
      if (tg.env != null) { c.push("st.sid = 'setting:env/' + $env"); p.env = tg.env; }
      if (tg.config != null) { c.push('st.name = $config'); p.config = tg.config; }
      if (!c.length) throw new Error('setting target without a name, env or config');
      cond = '(' + c.join(' OR ') + ')';
    }
    const rows = g.q(`MATCH (s:N)-[e:${L.join('|')}]->(st:N) WHERE ${cond} AND s.is_test = 0
MATCH (s)-[ev:EV]->(st) WHERE ev.kid = e.kid
OPTIONAL MATCH (f:N) WHERE f.path = ev.path AND f.kind IN ${DEFS} AND ev.line >= f.ls AND ev.line <= f.le
WITH s.kind AS sk, s.path AS sp, s.sid AS ss, st.name AS sn, ev.path AS ep, ev.line AS el, max(f.ls) AS mls
OPTIONAL MATCH (f2:N) WHERE f2.path = ep AND f2.kind IN ${DEFS} AND f2.ls = mls AND el <= f2.le
WITH sk, sp, ss, sn, ep, min(CASE WHEN f2 IS NULL THEN NULL ELSE f2.path + '::' + ${SUF('f2.sid')} END) AS enc
RETURN DISTINCT CASE WHEN sk IN ['function', 'method', 'component', 'class', 'constant'] THEN sp + '::' + ${SUF('ss')} ELSE coalesce(enc, ep + '::' + sn) END AS a`, p);
    return sortU(rows.map((x) => x.a));
  },

  // migrations whose upgrade() touches the table (foreign-key operations on other tables excluded)
  migrations_touch_table(g, tg) {
    const L = labels(g, ['migration_touches']);
    if (!L.length) return [];
    const rows = g.q(`MATCH (m:N)-[e:${L.join('|')}]->(t:N) WHERE t.sid = 'table:' + $tbl
MATCH (m)-[ev:EV]->(t) WHERE ev.kid = e.kid AND coalesce(ev.op, '') <> 'create_foreign_key'
MATCH (up:N) WHERE up.path = m.path AND up.sid = 'sym:' + m.path + '#upgrade' AND ev.line >= up.ls AND ev.line <= up.le
RETURN DISTINCT m.name AS a`, { tbl: tg.table }); // "table" is a reserved word as a parameter name
    return sortU(rows.map((x) => x.a)).map((x) => String(x).padStart(4, '0'));
  },

  // call sites of a backend route, BFF callers of the same path, and direct callers of the call sites
  route_clients(g, tg) {
    const rs = routesOf(tg);
    if (rs.length > 1) { // several routes (pre-flight fix): each answered alone, the lists merged
      const parts = rs.map((route) => Q.route_clients(g, { route }));
      const merge = (k) => sortU(parts.flatMap((x) => x[k]));
      return { call_sites: merge('call_sites'), via_bff: merge('via_bff'), direct_callers: merge('direct_callers') };
    }
    const route = rs[0];
    const Lu = labels(g, ['calls_url']); const Lc = labels(g, ['calls']);
    const sites = (pre) => (Lu.length ? sortU(g.q(`MATCH (n:N)-[:${Lu.join('|')}]->(r:N) WHERE r.sid = $rs AND n.is_test = 0 RETURN DISTINCT ${LABEL('n')} AS a`, { rs: pre + route }).map((x) => x.a)) : []);
    const direct = Lu.length && Lc.length ? sortU(g.q(`MATCH (n:N)-[:${Lc.join('|')}]->(s:N)-[:${Lu.join('|')}]->(r:N) WHERE r.sid = $rs AND n.is_test = 0 AND s.is_test = 0 RETURN DISTINCT ${LABEL('n')} AS a`, { rs: 'route:backend ' + route }).map((x) => x.a)) : [];
    return { call_sites: sites('route:backend '), via_bff: sites('route:ops '), direct_callers: direct };
  },

  // entry points whose execution reaches the target, and the client functions that call those routes
  change_reach(g, tg) {
    const t = ids(g.q('MATCH (n:N) WHERE n.sid = $sid RETURN n.id AS i', { sid: tg.sid }));
    const r = reach(g, t, KINDS.change, 'in', (n) => `${n}.is_test = 0`);
    const o = { backend: [], web: [], mobile: [] };
    if (!r.length) return o;
    o.backend = sortU(g.q(`MATCH (n:N) WHERE n.id IN $R AND ((n.kind = 'route' AND n.runtime = 'backend') OR n.kind = 'scheduled_job' OR starts_with(lower(n.path), 'backend/scripts/'))
RETURN DISTINCT CASE WHEN n.kind = 'route' THEN n.name WHEN n.kind = 'scheduled_job' THEN 'scheduler:' + n.name ELSE 'script:' + n.path END AS a`, { R: r }).map((x) => x.a));
    const Lu = labels(g, ['calls_url']);
    if (Lu.length) {
      for (const x of g.q(`MATCH (s:N)-[:${Lu.join('|')}]->(rt:N) WHERE rt.id IN $R AND rt.kind = 'route' AND rt.runtime = 'backend' AND s.is_test = 0 AND (starts_with(lower(s.path), 'src/') OR starts_with(lower(s.path), 'technician-app/'))
RETURN DISTINCT CASE WHEN starts_with(lower(s.path), 'technician-app/') THEN 'mobile' ELSE 'web' END AS rt, s.path + '::' + ${SUF('s.sid')} AS a`, { R: r })) o[x.rt].push(x.a);
      o.web = sortU(o.web); o.mobile = sortU(o.mobile);
    }
    return o;
  },
};

function answer(g, q) {
  const tg = target(q);
  if (!Q[q.kind]) throw new Error('kind ' + q.kind);
  return { answer: Q[q.kind](g, tg), lookups: 1 };
}

async function main() {
  const split = process.argv.includes('--split') ? process.argv[process.argv.indexOf('--split') + 1] : 'tune';
  if (split !== 'tune') throw new Error('REFUSED: TQ held-out is not run in this phase');
  const qs = fs.readFileSync(path.join(P.TASKS, 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse)
    .filter((q) => q.split === split);
  const G = graphFor(P.FROZEN);
  const arm = require('./arm').openInProc(G, { store: P.storeFor('ladybug') }); // in process: the diagnostic needs the engine handle
  const g = arm.lb;
  const out = [];
  for (const q of qs) {
    const tg = target(q);
    const s = process.hrtime.bigint(); const q0 = g.stats.queries;
    let a; let err = null;
    try { a = answer(g, q).answer; } catch (e) { err = String(e.message || e); }
    const ms = Number(process.hrtime.bigint() - s) / 1e6;
    const exists = tg.sid ? g.q('MATCH (n:N) WHERE n.sid = $sid RETURN count(*) AS c', { sid: tg.sid })[0].c > 0 : null;
    out.push({ id: q.id, kind: q.kind, split: q.split, arm: 'ladybug', target: tg, target_node_found: exists, answer: a, error: err, ms: +ms.toFixed(2), cypher_queries: g.stats.queries - q0 - (tg.sid ? 1 : 0) });
  }
  await arm.close();
  const f = path.join(P.RESULTS, 'ladybug', 'tq_diagnostic', 'ladybug.' + split + '.jsonl');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, out.map((x) => JSON.stringify(x)).join('\n') + '\n');
  for (const x of out) console.log(x.id, x.kind, JSON.stringify(x.target), x.target_node_found, x.error || JSON.stringify(x.answer).slice(0, 200), x.ms + 'ms');
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { Q, answer, reach };
