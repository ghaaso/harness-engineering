#!/usr/bin/env node
// Builds FACTS for the parent of every non-merge commit on frozen main into cache/<parent-sha>/,
// skipping parents already built with the same extractor version. One build at a time (each build
// runs at most three processes: this driver's child node, python, and the TS stage).
// Usage: node build_cache.js [--limit N]
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), crypto = require("crypto");
const REPO = "C:/Users/User/Documents/projects/EMS_workshop1";
const FROZEN = "a31924a3818f4ac94b695906d107c72c912792b2";
const HERE = __dirname, CACHE = path.join(HERE, "cache");
const SOURCES = ["build_facts.js", "py_extract.py", "ts_extract.js", "docs_extract.js", "git_extract.js"];
const h = crypto.createHash("sha256");
for (const f of SOURCES) h.update(f + "\0" + fs.readFileSync(path.join(HERE, f)));
const VERSION = h.digest("hex").slice(0, 16);
const lim = process.argv.indexOf("--limit") >= 0 ? Number(process.argv[process.argv.indexOf("--limit") + 1]) : Infinity;
const lines = cp.execFileSync("git", ["-C", REPO, "rev-list", "--no-merges", "--parents", FROZEN], { encoding: "utf8" }).trim().split("\n");
const children = new Map();
for (const ln of lines) { const [c, p] = ln.split(" "); if (!p) continue; if (!children.has(p)) children.set(p, []); children.get(p).push(c); }
const parents = [...children.keys()].sort();
fs.mkdirSync(CACHE, { recursive: true });
const log = path.join(CACHE, "build_log.jsonl");
let done = 0, skipped = 0, failed = 0;
for (const p of parents) {
  if (done >= lim) break;
  const out = path.join(CACHE, p);
  const mf = path.join(out, "meta.json");
  if (fs.existsSync(mf)) { try { if (JSON.parse(fs.readFileSync(mf, "utf8")).extractor_version === VERSION) { skipped++; continue; } } catch (e) {} }
  const t = Date.now();
  const r = cp.spawnSync(process.execPath, [path.join(HERE, "build_facts.js"), p, out, "--task", children.get(p).sort().join(",")], { encoding: "utf8", maxBuffer: 1 << 26 });
  const ms = Date.now() - t;
  let rec = { parent: p, children: children.get(p).sort(), ms, exit: r.status };
  if (r.status === 0 && fs.existsSync(mf)) {
    const m = JSON.parse(fs.readFileSync(mf, "utf8"));
    rec = Object.assign(rec, { nodes: m.counts.nodes_total, edges: m.counts.edges_total, stages: Object.fromEntries(Object.entries(m.stages).map(([k, v]) => [k, v.status])), ts_programs: (m.stages.ts || {}).programs || null, stage_ms: m.timings_ms });
  } else { failed++; rec.error = (r.stderr || "").slice(-500); }
  fs.appendFileSync(log, JSON.stringify(rec) + "\n");
  done++;
}
console.log(JSON.stringify({ version: VERSION, parents: parents.length, built: done, skipped, failed }));
