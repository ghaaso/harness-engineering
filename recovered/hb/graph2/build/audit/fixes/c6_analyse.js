#!/usr/bin/env node
// Check 6 analysis: classify every logged access of the leak re-run (tmp/audit-fixes/leak/<arm>.log).
// Flags: any path under sealed/ or audit/ (other than the two preload files); any commit SHA (12+ hex
// characters matching a repository commit) in a path, a git argument or an engine SQL path that is not
// one of the 6 parents of the 30 tasks, classified as held-out parent, task commit, other.
// Also compares the re-run's answers with the stored re-run answers (results/<arm>) for the same tasks.
//   node c6_analyse.js
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), zlib = require("zlib");
const BUILD = path.resolve(__dirname, "..", "..");
const REPO = "C:/Users/User/Documents/projects/EMS_workshop1";
const L = path.join(BUILD, "tmp/audit-fixes/leak");
const commits = cp.execFileSync("git", ["-C", REPO, "log", "--all", "--format=%H"], { encoding: "utf8" }).split("\n").filter(Boolean);
const allowed = new Set(fs.readFileSync(path.join(BUILD, "tmp/audit-fixes/leak_parents.txt"), "utf8").split("\n").filter(Boolean));
const tasks = fs.readFileSync(path.join(BUILD, "tasks/tasks.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const heldP = new Set(tasks.filter((t) => t.split !== "tune").map((t) => t.parent));
const tuneP = new Set(tasks.filter((t) => t.split === "tune").map((t) => t.parent));
const taskC = new Set();
for (const l of fs.readFileSync(path.join(BUILD, "sealed/references.jsonl"), "utf8").split("\n")) { if (!l) continue; const r = JSON.parse(l); const c = r.commit || r.fix_commit || r.intro_commit; if (c) taskC.add(c); }
const cls = (h) => [heldP.has(h) ? "heldout-parent" : null, taskC.has(h) ? "task-commit" : null, tuneP.has(h) ? "other-tune-parent" : null].filter(Boolean).join("+") || "other-commit";
const HEX = /(?<![0-9a-f])[0-9a-f]{12,40}(?![0-9a-f])/g;
const PRE = new Set(["/build/audit/fixes/accesslog2.js", "/build/audit/arms/accesslog.js"]);
const out = {};
for (const arm of ["relational", "search", "ladybug", "duckpgq"]) {
  const f = path.join(L, arm + ".log"); if (!fs.existsSync(f)) { out[arm] = "no log"; continue; }
  const rows = fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const o = { entries: rows.length, sealed: [], audit: [], foreign_shas: [], git_calls: [], child_processes: [], engine_paths: new Set(), prefixes: {}, facts_folders: new Set(), pids: new Set() };
  for (const r of rows) {
    if (r.pid) o.pids.add(r.pid);
    const strs = [];
    if (r.path) strs.push(r.path);
    if (r.op && r.op.startsWith("cp.")) { const s = [r.cmd, ...(r.args || [])].join(" "); strs.push(s); o.child_processes.push(s.slice(0, 160)); if (/\bgit\b/.test(r.cmd) || (r.args || []).includes("git")) o.git_calls.push(s.slice(0, 200)); }
    if (r.op && /\.(sqlpath|open)$/.test(r.op) && r.path) o.engine_paths.add(r.op + " " + r.path.replace(/[0-9a-f]{40}/g, "<sha>"));
    for (const s of strs) {
      if (/\/sealed(\/|$)/.test(s)) o.sealed.push(r.op + " " + s);
      if (/\/build\/audit\//.test(s) && !PRE.has(s)) o.audit.push(r.op + " " + s);
      const m = /\/facts\/cache\/([0-9a-f]{40})/.exec(s); if (m) o.facts_folders.add(m[1]);
      for (const mm of s.matchAll(HEX)) {
        const c = commits.filter((h) => h.startsWith(mm[0])); if (!c.length) continue;
        if (c.some((h) => allowed.has(h))) continue;
        o.foreign_shas.push(r.op + " " + s.slice(0, 160) + " => " + c.map(cls).join("|"));
      }
      const p = s.replace(/[0-9a-f]{12,40}/g, "<hex>").split("/").slice(0, 5).join("/");
      if (r.path) o.prefixes[p] = (o.prefixes[p] || 0) + 1;
    }
  }
  o.facts_folders = [...o.facts_folders].map((h) => h.slice(0, 12) + (allowed.has(h) ? " (task parent)" : " " + cls(h)));
  o.engine_paths = [...o.engine_paths].slice(0, 30); o.pids = o.pids.size;
  o.git_calls = [...new Set(o.git_calls)]; o.child_processes = [...new Set(o.child_processes)].slice(0, 20);
  o.sealed_count = o.sealed.length; o.audit_count = o.audit.length; o.foreign_sha_count = o.foreign_shas.length;
  o.sealed = o.sealed.slice(0, 10); o.audit = o.audit.slice(0, 10); o.foreign_shas = [...new Set(o.foreign_shas)].slice(0, 20);
  o.prefixes = Object.fromEntries(Object.entries(o.prefixes).sort((a, b) => b[1] - a[1]).slice(0, 25));
  out[arm] = o;
}
// determinism against the stored stage-1 answers
const DIRS = { relational: "results/relational/tune", search: "results/search/tune", ladybug: "results/ladybug/stage1/ladybug/tune", duckpgq: "results/duckpgq/tune" };
const strip = (a) => JSON.stringify({ ...a, ms: null, engine_ms: null });
for (const [arm, d] of Object.entries(DIRS)) {
  const nd = path.join(L, "res", arm, arm, "tune"); if (!fs.existsSync(nd)) continue;
  let same = 0, diff = 0, missing = 0; const ex = [];
  for (const f of fs.readdirSync(nd)) {
    const mine = zlib.gunzipSync(fs.readFileSync(path.join(nd, f))).toString().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const sf = path.join(BUILD, d, f); if (!fs.existsSync(sf)) { missing += mine.length; continue; }
    const st = new Map(zlib.gunzipSync(fs.readFileSync(sf)).toString().split("\n").filter(Boolean).map((l) => { const a = JSON.parse(l); return [a.id, a]; }));
    for (const a of mine) { const b = st.get(a.id); if (!b) { missing++; continue; } if (strip(a) === strip(b)) same++; else { diff++; if (ex.length < 3) ex.push(f + " " + a.id); } }
  }
  out[arm].vs_stored_answers = { identical: same, differ: diff, missing, examples: ex };
}
fs.writeFileSync(path.join(__dirname, "c6_leak.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, typeof v === "string" ? v : { entries: v.entries, pids: v.pids, sealed: v.sealed_count, audit: v.audit_count, foreign_shas: v.foreign_sha_count, facts_folders: v.facts_folders, git_calls: v.git_calls.length, vs_stored: v.vs_stored_answers }])), null, 1));
