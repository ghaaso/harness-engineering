#!/usr/bin/env node
// Check 2d: recall of the addendum-2 D.16 fixes at one commit, by line greps over a git-archive export.
//   node c2_recall.js <factsDir> <exportDir>
// 1 mobile config reads: `config.<group>.<key>` / `config.apiUrl` in technician-app/src (config imported
//   from lib/config) -> a reads_setting edge at that file:line to setting ...config.ts#config.<chain>
// 2 env reads: os.getenv("K") / os.environ["K"] / os.environ.get("K") / process.env.K in root vite configs
// 3 Protocol calls: self._storage.<m>( / self._rail.<m>( in backend production code -> calls edge with
//   attrs.how = protocol_impl at that line
// 4 looped URL literals in Python tests: "/api/..." literal lines inside `for x in (` ... `):` blocks ->
//   test_calls_route edge at that line
"use strict";
const fs = require("fs"), path = require("path");
const [F, X] = process.argv.slice(2);
const E = fs.readFileSync(path.join(F, "edges.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const at = new Map();
for (const e of E) { const k = e.evidence_path + ":" + e.evidence_line; if (!at.has(k)) at.set(k, []); at.get(k).push(e); }
function walk(d, out = []) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== "node_modules") walk(p, out); } else out.push(p); } return out; }
const rel = (p) => path.relative(X, p).split(path.sep).join("/");
const R = {};
// 1
{
  const hit = [], miss = [];
  for (const p of walk(path.join(X, "technician-app", "src")).filter((f) => /\.(ts|tsx)$/.test(f))) {
    const t = fs.readFileSync(p, "utf8");
    if (!/import\s*\{[^}]*\bconfig\b[^}]*\}\s*from\s*["'][^"']*lib\/config["']|from\s*["']\.\/config["']|from\s*["']\.\.\/config["']/.test(t) || rel(p).endsWith("lib/config.ts")) continue;
    t.split("\n").forEach((ln, i) => {
      if (/^\s*(\/\/|\*)/.test(ln)) return;
      for (const m of ln.matchAll(/\bconfig\.(apiUrl|(?:attendance|video|compress)\.\w+)/g)) {
        const k = rel(p) + ":" + (i + 1);
        const ok = (at.get(k) || []).some((e) => e.kind === "reads_setting" && e.dst.endsWith("#config." + m[1]));
        (ok ? hit : miss).push(k + " config." + m[1] + (/__tests__|\.test\./.test(k) ? " (test)" : ""));
      }
    });
  }
  R.mobile_config = { hit: hit.length, miss: miss.length, misses: miss };
}
// 2
{
  const hit = [], miss = [];
  const files = walk(path.join(X, "backend")).filter((f) => f.endsWith(".py")).concat(["vite.config.js", "vite.ops.config.js", "vitest.config.js"].map((f) => path.join(X, f)).filter(fs.existsSync));
  for (const p of files) fs.readFileSync(p, "utf8").split("\n").forEach((ln, i) => {
    for (const m of ln.matchAll(/os\.getenv\(\s*["'](\w+)["']|os\.environ\[\s*["'](\w+)["']\s*\]|os\.environ\.get\(\s*["'](\w+)["']|process\.env\.(\w+)|import\.meta\.env\.(\w+)/g)) {
      const key = m[1] || m[2] || m[3] || m[4] || m[5];
      const k = rel(p) + ":" + (i + 1);
      const ok = (at.get(k) || []).some((e) => e.kind === "reads_setting");
      (ok ? hit : miss).push(k + " " + key);
    }
  });
  R.env = { hit: hit.length, miss: miss.length, hits: hit, misses: miss };
}
// 3
{
  const hit = [], miss = [];
  for (const p of walk(path.join(X, "backend", "app")).filter((f) => f.endsWith(".py") && !/[\\/]tests[\\/]|test_/.test(f))) fs.readFileSync(p, "utf8").split("\n").forEach((ln, i) => {
    for (const m of ln.matchAll(/self\._(storage|rail)\.(\w+)\(/g)) {
      const k = rel(p) + ":" + (i + 1);
      const ok = (at.get(k) || []).some((e) => e.kind === "calls" && (e.attrs || {}).how === "protocol_impl" && e.dst.endsWith("." + m[2]));
      (ok ? hit : miss).push(k + " " + m[1] + "." + m[2]);
    }
  });
  R.protocol_calls = { hit: hit.length, miss: miss.length, misses: miss };
}
// 4
{
  const hit = [], miss = [];
  for (const p of walk(path.join(X, "backend")).filter((f) => /test_\w+\.py$/.test(f))) {
    const L = fs.readFileSync(p, "utf8").split("\n");
    for (let i = 0; i < L.length; i++) {
      if (!/^\s*for \w+ in \(\s*$|^\s*for \w+ in \[\s*$/.test(L[i])) continue;
      for (let j = i + 1; j < L.length && !/^\s*[\)\]]\s*:/.test(L[j]); j++) {
        const m = /["'](\/api\/[^"'?]*)/.exec(L[j]); if (!m) continue;
        const k = rel(p) + ":" + (j + 1);
        const ok = (at.get(k) || []).some((e) => e.kind === "test_calls_route");
        (ok ? hit : miss).push(k + " " + m[1]);
      }
    }
  }
  R.looped_urls = { hit: hit.length, miss: miss.length, misses: miss };
}
console.log(JSON.stringify(R, null, 1));
