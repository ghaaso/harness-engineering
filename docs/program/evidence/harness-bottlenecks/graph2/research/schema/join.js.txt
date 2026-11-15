// Join the Python and TS extractions into one typed graph; match client URLs to routes;
// measure hop growth, hubs and damping on repo-specific traversal patterns.
// Usage: node join.js <repo_root> <lane_dir>
const fs = require("fs");
const path = require("path");
const ROOT = process.argv[2];
const L = process.argv[3];
const py = JSON.parse(fs.readFileSync(path.join(L, "py_graph.json"), "utf8"));
const tsg = JSON.parse(fs.readFileSync(path.join(L, "ts_graph.json"), "utf8"));
const R = {};
const t0 = Date.now();

// ---------- nodes ----------
const N = new Map(); // id -> {type, test, runtime, path}
for (const [id, v] of Object.entries(py.nodes)) N.set(id, { type: v.type, path: v.path, runtime: "backend", test: /\/tests?\/|\/test_[^/]*\.py$|conftest\.py$/.test(v.path || ""), tokens: v.tokens });
for (const d of tsg.defs) N.set(d.id, { type: d.kind, path: d.id.split("#")[0], runtime: d.runtime, test: d.test, tokens: d.tokens });

// ---------- edges ----------
const E = []; // [type, src, dst]
for (const [t, s, d] of py.edges) E.push([t, s, d]);
for (const c of tsg.calls) E.push(["calls", c.src, c.dst]);

// routes (backend) + ops-server.mjs routes by regex
const routes = py.routes.map((r) => ({ ...r, server: "backend" }));
const ops = fs.readFileSync(path.join(ROOT, "ops-server.mjs"), "utf8");
for (const m of ops.matchAll(/pathname === "(\/api\/[^"]+)"(?:\s*&&\s*req\.method === "(\w+)")?/g)) {
  const id = `route:ops-server ${m[2] || "GET"} ${m[1]}`;
  routes.push({ id, method: m[2] || "GET", path: m[1], handler: "ops-server.mjs", server: "ops-server" });
  N.set(id, { type: "route", runtime: "ops-server" });
}
const rx = (p) => new RegExp("^" + p.replace(/\{[^}]+\}/g, "[^/]+") + "/?$");
const routeRx = routes.map((r) => ({ ...r, re: rx(r.path) }));
function matchUrl(method, url, preferServer) {
  const u = url.replace(/\{\}/g, "X");
  let c = routeRx.filter((r) => r.re.test(u) && r.method === method);
  if (c.length > 1 && preferServer) c = c.filter((r) => r.server === preferServer).concat(c.filter((r) => r.server !== preferServer)).slice(0, 1);
  // prefer literal segments over params when two routes match (e.g. /jobs/evidence-gaps vs /jobs/{id})
  if (c.length > 1) c.sort((a, b) => (b.path.match(/\{/g) || []).length < (a.path.match(/\{/g) || []).length ? 1 : -1);
  if (c.length) return { route: c[0], ambiguous: c.length > 1, methodOnlyMiss: false };
  const any = routeRx.filter((r) => r.re.test(u));
  return { route: null, methodOnlyMiss: any.length > 0 };
}
const urlStats = { client: { total: 0, matched: 0, ambiguous: 0, unmatched: [] }, pytests: { total: 0, matched: 0, unmatched: [] } };
for (const u of tsg.urls) {
  const isOps = u.file.startsWith("src/ops/") || u.file.startsWith("src/features/ops/");
  const m = matchUrl(u.method, u.url, isOps ? "ops-server" : "backend");
  const bucket = urlStats.client;
  if (!u.test) bucket.total++;
  if (m.route) {
    if (!u.test) { bucket.matched++; if (m.ambiguous) bucket.ambiguous++; }
    E.push(["calls_url", u.site, m.route.id]);
  } else if (!u.test) bucket.unmatched.push(`${u.file}:${u.line} ${u.method} ${u.url}${m.methodOnlyMiss ? " (path matches, method differs)" : ""}`);
}
for (const [t, s, d] of py.edges) {
  if (t !== "calls_url") continue;
  const [method, ...rest] = d.slice(4).split(" ");
  const m = matchUrl(method, rest.join(" "), "backend");
  urlStats.pytests.total++;
  if (m.route) { urlStats.pytests.matched++; E.push(["test_calls_route", s, m.route.id]); }
  else urlStats.pytests.unmatched.push(d);
}
const routesHit = new Set(E.filter((e) => e[0] === "calls_url").map((e) => e[2]));
urlStats.backendRoutes = routes.filter((r) => r.server === "backend").length;
urlStats.backendRoutesWithClient = routes.filter((r) => r.server === "backend" && routesHit.has(r.id)).length;
urlStats.backendRoutesNoClient = routes.filter((r) => r.server === "backend" && !routesHit.has(r.id)).map((r) => r.method + " " + r.path);
urlStats.routesTestedOverHttp = new Set(E.filter((e) => e[0] === "test_calls_route").map((e) => e[2])).size;
R.urls = urlStats;

// outbox kinds: screen -> kind (sendKinds) ; kind -> jobsApi method (switch case)
const jobsApiFile = "technician-app/src/lib/jobsApi.ts";
for (const s of tsg.sendKinds) if (!s.test) E.push(["enqueues_kind", s.site, "kind:" + s.kind]);
for (const k of tsg.kinds) for (const c of k.calls) if (c.startsWith("jobsApi.")) E.push(["kind_handled_by", "kind:" + k.kind, jobsApiFile + "#" + c]);
for (const k of new Set(tsg.sendKinds.map((s) => s.kind).concat(tsg.kinds.map((k) => k.kind)))) N.set("kind:" + k, { type: "outbox_kind", runtime: "mobile" });
R.outbox = { kindsInSwitch: [...new Set(tsg.kinds.map((k) => k.kind))].length, switchSites: [...new Set(tsg.kinds.map((k) => k.file + " " + k.switchOn))], kindsEnqueued: [...new Set(tsg.sendKinds.filter((s) => !s.test).map((s) => s.kind))], enqueueSites: tsg.sendKinds.filter((s) => !s.test).length };

// ---------- adjacency ----------
const fwd = new Map(), rev = new Map();
const add = (m, a, b, t) => { if (!m.has(a)) m.set(a, []); m.get(a).push([b, t]); };
const TRAVERSE = new Set(["calls", "registers_route", "calls_url", "depends_injects", "writes_table", "reads_table", "enqueues_kind", "kind_handled_by", "test_calls_route", "reads_setting"]);
for (const [t, s, d] of E) {
  if (!TRAVERSE.has(t)) continue;
  if (t === "registers_route") { add(fwd, s, d, t); add(rev, d, s, t); continue; } // route -> handler
  add(fwd, s, d, t); add(rev, d, s, t);
}
const deg = (m, id) => (m.get(id) || []).length;
const typeOf = (id) => (N.get(id) || {}).type || (id.startsWith("table:") ? "table" : id.startsWith("setting:") ? "setting" : id.startsWith("kind:") ? "outbox_kind" : "?");
const isTest = (id) => (N.get(id) || {}).test || /test|\.test\.|conftest/.test(id);

// hubs: in-degree on calls, distinct sources
const inSrc = new Map();
for (const [t, s, d] of E) if (t === "calls") { if (!inSrc.has(d)) inSrc.set(d, new Set()); inSrc.get(d).add(s); }
const hubs = [...inSrc.entries()].map(([d, s]) => [d, s.size, [...s].filter((x) => !isTest(x)).length]).sort((a, b) => b[2] - a[2]).slice(0, 20);
R.hubs_by_prod_callers = hubs.map((h) => `${h[0]} prod=${h[2]} all=${h[1]}`);
const outSrc = new Map();
for (const [t, s, d] of E) if (t === "calls") { if (!outSrc.has(s)) outSrc.set(s, new Set()); outSrc.get(s).add(d); }
R.hubs_by_fanout = [...outSrc.entries()].map(([s, d]) => [s, d.size]).sort((a, b) => b[1] - a[1]).slice(0, 10).map((x) => `${x[0]} out=${x[1]}`);

// ---------- traversal ----------
function bfs(start, adj, maxHop, opts = {}) {
  const seen = new Map([[start, 0]]);
  let frontier = [start];
  const perHop = [];
  for (let h = 1; h <= maxHop; h++) {
    const next = [];
    for (const u of frontier) {
      if (opts.stopAtHub && u !== start && deg(adj, u) > opts.stopAtHub) continue; // reach the hub, do not expand it
      for (const [v, t] of adj.get(u) || []) {
        if (opts.edgeTypes && !opts.edgeTypes.has(t)) continue;
        if (opts.skipTests && isTest(v)) continue;
        if (!seen.has(v)) { seen.set(v, h); next.push(v); }
      }
    }
    const types = {};
    for (const v of next) types[typeOf(v)] = (types[typeOf(v)] || 0) + 1;
    perHop.push({ hop: h, new: next.length, cum: seen.size - 1, types });
    frontier = next;
    if (!next.length) break;
  }
  return { seen, perHop };
}
const pick = (pat) => [...N.keys()].find((k) => k.endsWith(pat)) || pat;
const Q = {};
// 1. screen -> table (forward)
const screen = pick("ArrivalJobBillScreen.tsx#ArrivalJobBillScreen");
for (const [label, opts] of [["raw", {}], ["no tests, hub stop >25 out", { skipTests: true, stopAtHub: 25 }]]) {
  const r = bfs(screen, fwd, 10, opts);
  const tables = [...r.seen.entries()].filter(([k]) => k.startsWith("table:")).map(([k, h]) => k.slice(6) + "@" + h);
  Q["screen_to_table " + label] = { start: screen, perHop: r.perHop.map((p) => `h${p.hop}:+${p.new}(${Object.entries(p.types).map(([a, b]) => a + "=" + b).join(",")})`), tables };
}
// 1b. path-constrained (typed metapath) version: screen -calls*-> client fn -calls_url-> route -> handler -calls*-> -writes_table->
function metapath(start, stages) {
  let cur = new Set([start]);
  const trace = [];
  for (const st of stages) {
    const next = new Set();
    let frontier = [...cur];
    const seen = new Set(cur);
    for (let i = 0; i < (st.repeat || 1); i++) {
      const nf = [];
      for (const u of frontier) for (const [v, t] of fwd.get(u) || []) {
        if (!st.types.has(t) || seen.has(v) || isTest(v)) continue;
        if (st.filter && !st.filter(v)) continue;
        seen.add(v); nf.push(v); next.add(v);
      }
      frontier = nf;
      if (st.keepAll) for (const v of nf) next.add(v);
    }
    if (st.carry) for (const v of cur) next.add(v);
    trace.push(`${st.name}: ${next.size}`);
    cur = next;
  }
  return { trace, end: [...cur] };
}
const mp = metapath(screen, [
  { name: "calls up to 4 hops", types: new Set(["calls", "enqueues_kind", "kind_handled_by"]), repeat: 4, carry: true },
  { name: "calls_url", types: new Set(["calls_url"]) },
  { name: "route->handler", types: new Set(["registers_route"]) },
  { name: "backend calls up to 4 hops", types: new Set(["calls"]), repeat: 4, carry: true },
  { name: "writes_table", types: new Set(["writes_table"]) },
]);
Q.screen_to_table_metapath = { trace: mp.trace, tables: mp.end.map((x) => x.slice(6)) };

// 2. impact of a service method change (reverse), raw vs damped
const target = "sym:app.features.jobs.service:JobService.submit_completion";
for (const [label, opts] of [["raw", {}], ["no tests", { skipTests: true }], ["no tests, hub stop >15 in", { skipTests: true, stopAtHub: 15 }]]) {
  const r = bfs(target, rev, 8, opts);
  Q["impact " + label] = r.perHop.map((p) => `h${p.hop}:+${p.new}=${p.cum}(${Object.entries(p.types).map(([a, b]) => a + "=" + b).join(",")})`);
}
// 2b. reverse reach from a hub-ish core function
for (const tgt of ["sym:app.core.security:compare_secret", "sym:app.core.db:get_session", "technician-app/src/lib/api.ts#request", "src/shared/lib/api.js#apiGet"]) {
  const r = bfs(tgt, rev, 6, { skipTests: true });
  Q["reverse " + tgt] = r.perHop.map((p) => `h${p.hop}:+${p.new}=${p.cum}`);
}
// 3. tests reaching a function: direct call, call chain, HTTP route
function testsReaching(t) {
  const r = bfs(t, rev, 6, {});
  const tests = [...r.seen.entries()].filter(([k]) => isTest(k) && /test_|\.test\.|#(it|describe)/.test(k));
  const byHop = {};
  for (const [, h] of tests) byHop[h] = (byHop[h] || 0) + 1;
  return byHop;
}
Q.tests_reaching_submit_completion_by_hop = testsReaching(target);
Q.tests_reaching_try_transition_by_hop = testsReaching("sym:app.features.jobs.repository:JobRepository.try_transition");
R.queries = Q;

// ---------- global hop growth (median reverse reach by hop over all prod backend functions) ----------
const prodFns = [...N.entries()].filter(([k, v]) => ["function", "method"].includes(v.type) && !v.test && k.startsWith("sym:app.")).map(([k]) => k);
const growth = {};
for (const h of [1, 2, 3, 4, 6]) {
  const sizes = prodFns.map((f) => bfs(f, rev, h, { skipTests: true }).seen.size - 1).sort((a, b) => a - b);
  growth["hop" + h] = { median: sizes[Math.floor(sizes.length / 2)], p90: sizes[Math.floor(sizes.length * 0.9)], max: sizes[sizes.length - 1] };
}
R.reverse_reach_growth_prod_backend_fns = { n: prodFns.length, growth };
const ec = {};
for (const [t] of E) ec[t] = (ec[t] || 0) + 1;
R.edge_counts_joined = ec;
const nc = {};
for (const v of N.values()) nc[v.type] = (nc[v.type] || 0) + 1;
R.node_counts_joined = nc;
R.ms = Date.now() - t0;
fs.writeFileSync(path.join(L, "join_out.json"), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
