// Recall of calls_url / test_calls_route: every '/api/' literal in client code (JS/TS) and every pytest
// client call, matched by MY route table, then looked up among the extractor's edges (same file, line +-2).
// node url_recall.js <factsdir> <exportdir>
"use strict";
const L = require("./lib.js");
const F = L.loadFacts(process.argv[2]), repo = L.mkRepo(process.argv[3]), R = L.routeTable(repo);
const isTest = (p) => /(^|\/)(tests|__tests__)\//.test(p) || /(^|\/)test_[^/]*\.py$/.test(p) || /(^|\/)conftest\.py$/.test(p) || /\.(test|spec)\.[^/]+$/.test(p);
const urlEdges = F.edges.filter((e) => e.kind === "calls_url" || e.kind === "test_calls_route");
const byFile = new Map();
for (const e of urlEdges) { if (!byFile.has(e.evidence_path)) byFile.set(e.evidence_path, []); byFile.get(e.evidence_path).push(e); }
const res = { client_prod: { lits: 0, matched_mine: 0, found: 0, wrong_route: 0, miss: [] }, client_test: { lits: 0, matched_mine: 0, found: 0, wrong_route: 0, miss: [] }, pytest: { lits: 0, matched_mine: 0, found: 0, wrong_route: 0, miss: [] } };
function methodNear(txt) {
  const m = txt.match(/method:\s*["'](GET|POST|PUT|PATCH|DELETE)["']/i); if (m) return m[1].toUpperCase();
  const f = txt.match(/\b(apiSend|apiGet|apiPost|apiPut|apiPatch|apiDelete|get|post|put|patch|delete)\s*[(<]/i);
  if (f) { const k = f[1].replace(/^api/i, "").toLowerCase(); if (["get", "post", "put", "patch", "delete"].includes(k)) return k.toUpperCase(); }
  return null;
}
for (const f of repo.files) {
  const client = /^(src|technician-app|tests)\/.*\.(js|jsx|ts|tsx|mjs)$/.test(f) || f === "ops-server.mjs";
  const py = /^backend\/.*\.py$/.test(f) && isTest(f);
  if (!client && !py) continue;
  const lines = repo.lines(f);
  lines.forEach((ln, i) => {
    const clean = ln.replace(/\$?\{[^{}]*\}/g, "X");
    for (const m of clean.matchAll(/["'`](\/api\/[^"'`?\s]*)/g)) {
      if (f === "ops-server.mjs" && /pathname\s*===/.test(ln)) continue; // a route definition, not a call
      if (py && /@\w+\.(get|post|put|patch|delete)\(/.test(ln)) continue; // toy app decorator
      const bucket = py ? res.pytest : isTest(f) ? res.client_test : res.client_prod;
      bucket.lits++;
      const url = m[1].replace(/\/$/, "") || "/";
      const ctx = lines.slice(Math.max(0, i - 2), i + 3).join("\n");
      const meth = methodNear(lines.slice(Math.max(0, i - 1), i + 1).join("\n")) || methodNear(ctx);
      const prefer = f.startsWith("src/ops/") || f.startsWith("src/features/ops/") || f === "ops-server.mjs" ? null : "backend";
      let cands = R.filter((r) => r.rx.test(url) && (!meth || r.method === meth));
      if (f === "ops-server.mjs") cands = cands.filter((r) => r.server === "backend");
      else if (cands.length > 1 && prefer) { const c2 = cands.filter((r) => r.server === prefer); if (c2.length) cands = c2; }
      if (cands.length > 1 && (f.startsWith("src/ops/") || f.startsWith("src/features/ops/"))) { const c2 = cands.filter((r) => r.server === "ops"); if (c2.length) cands = c2; }
      if (!cands.length) { bucket.miss.push(f + ":" + (i + 1) + " " + url + " (no route by my table; method " + meth + ")"); continue; }
      bucket.matched_mine++;
      const es = (byFile.get(f) || []).filter((e) => Math.abs(e.evidence_line - (i + 1)) <= 3);
      const ids = new Set(cands.map((r) => "route:" + r.server + " " + r.method + " " + r.path));
      if (es.some((e) => ids.has(e.dst))) bucket.found++;
      else if (es.length) { bucket.wrong_route++; bucket.miss.push(f + ":" + (i + 1) + " " + url + " mine=" + [...ids].join("|") + " extractor=" + es.map((e) => e.dst).join("|")); }
      else bucket.miss.push(f + ":" + (i + 1) + " " + url + " mine=" + [...ids].join("|") + " extractor=none");
    }
  });
}
for (const [k, v] of Object.entries(res)) { console.log(k, JSON.stringify({ lits: v.lits, matched_mine: v.matched_mine, found: v.found, wrong_route: v.wrong_route })); for (const m of v.miss.slice(0, 40)) console.log("   " + m); }
