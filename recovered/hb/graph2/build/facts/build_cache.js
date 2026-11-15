#!/usr/bin/env node
// Builds FACTS for (a) the parent of every non-merge commit on frozen main and (b) every parent named
// in tasks/parents.txt that (a) does not cover (the off-main 8dafcecc and the frozen commit itself),
// into <out>/<parent-sha>/ (default facts/cache.new). A folder already built with the same extractor
// version is skipped. Builds run CONC at a time (each build runs node, python and the TS stage).
//
// Task commits and their PRs never enter a facts folder. For each parent, the task switch and what
// the co-change stage dropped go to sealed/facts_meta/<parent>.json; the build log with the task
// children goes to sealed/facts_meta/build_log.jsonl; <out>/build_log.jsonl carries no task data.
//
// Usage: node build_cache.js [--out DIR] [--limit N] [--conc K] [--only sha,sha]
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), crypto = require("crypto");
const REPO = "C:/Users/User/Documents/projects/EMS_workshop1";
const FROZEN = "a31924a3818f4ac94b695906d107c72c912792b2";
const HERE = __dirname;
const BUILD = path.join(HERE, "..");
const SEALED_META = path.join(BUILD, "sealed", "facts_meta");
const TMP = path.join(BUILD, "tmp", "facts-fix");
const SOURCES = ["build_facts.js", "py_extract.py", "ts_extract.js", "docs_extract.js", "git_extract.js"];
const h = crypto.createHash("sha256");
for (const f of SOURCES) h.update(f + "\0" + fs.readFileSync(path.join(HERE, f)));
const VERSION = h.digest("hex").slice(0, 16);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg("--out", path.join(HERE, "cache.new")));
const lim = Number(arg("--limit", "Infinity"));
const CONC = Number(arg("--conc", "3"));
const onlySet = arg("--only", null) ? new Set(arg("--only").split(",")) : null;
const git = (args) => cp.execFileSync("git", ["-C", REPO, ...args], { encoding: "utf8", maxBuffer: 1 << 28 });

// (a) parents of non-merge commits on frozen main, with their children (the task switch)
const children = new Map();
for (const ln of git(["rev-list", "--no-merges", "--parents", FROZEN]).trim().split("\n")) {
  const [c, p] = ln.split(" ");
  if (!p) continue;
  if (!children.has(p)) children.set(p, []);
  children.get(p).push(c);
}
// (b) parents named by the task sets that are not parents on main
const listed = fs.readFileSync(path.join(BUILD, "tasks", "parents.txt"), "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t")[0]);
const onMain = new Set(git(["rev-list", FROZEN]).trim().split("\n"));
let allParents = null; // lazy: child lists over every ref, for an off-main parent
for (const p0 of listed) {
  const p = git(["rev-parse", "--verify", p0 + "^{commit}"]).trim();
  if (children.has(p)) continue;
  if (onMain.has(p)) { children.set(p, []); continue; } // on main but no child on main (the frozen commit): no task switch
  if (!allParents) {
    allParents = new Map();
    for (const ln of git(["rev-list", "--all", "--no-merges", "--parents"]).trim().split("\n")) {
      const [c, pp] = ln.split(" ");
      if (!pp) continue;
      if (!allParents.has(pp)) allParents.set(pp, []);
      allParents.get(pp).push(c);
    }
  }
  children.set(p, (allParents.get(p) || []).slice());
}
const parents = [...children.keys()].sort().filter((p) => !onlySet || onlySet.has(p));
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SEALED_META, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });
const log = path.join(OUT, "build_log.jsonl");
const slog = path.join(SEALED_META, "build_log.jsonl");
let done = 0, skipped = 0, failed = 0;
const tally = { parents_with_drops: 0, dropped_commits: 0, parents_with_several_task_prs: 0, side_record_missing: 0 };
const queue = [];
for (const p of parents) {
  const out = path.join(OUT, p);
  const mf = path.join(out, "meta.json");
  if (fs.existsSync(mf)) { try { if (JSON.parse(fs.readFileSync(mf, "utf8")).extractor_version === VERSION) { skipped++; continue; } } catch (e) {} }
  if (queue.length >= lim) break;
  queue.push(p);
}
const t0 = Date.now();
function runOne(p) {
  return new Promise((resolve) => {
    const out = path.join(OUT, p);
    const mf = path.join(out, "meta.json");
    const kids = children.get(p).slice().sort();
    const args = [path.join(HERE, "build_facts.js"), p, out, "--sealed-out", path.join(SEALED_META, p + ".json")];
    if (kids.length) args.push("--task", kids.join(","));
    const t = Date.now();
    const ch = cp.spawn(process.execPath, args, { env: Object.assign({}, process.env, { FACTS_TMP: TMP }), windowsHide: true });
    let err = "";
    ch.stderr.on("data", (d) => (err += d));
    ch.stdout.on("data", () => {});
    ch.on("close", (code) => {
      const ms = Date.now() - t;
      let rec = { parent: p, ms, exit: code };
      if (code === 0 && fs.existsSync(mf)) {
        const m = JSON.parse(fs.readFileSync(mf, "utf8"));
        rec = Object.assign(rec, { nodes: m.counts.nodes_total, edges: m.counts.edges_total, stages: Object.fromEntries(Object.entries(m.stages).map(([k, v]) => [k, v.status])), ts_programs: (m.stages.ts || {}).programs || null, stage_ms: m.timings_ms });
        done++;
        // counts only (no identifiers) from the side record this build just wrote
        try {
          const s = JSON.parse(fs.readFileSync(path.join(SEALED_META, p + ".json"), "utf8"));
          tally.parents_with_drops += (s.dropped_same_pr || []).length ? 1 : 0;
          tally.dropped_commits += (s.dropped_same_pr || []).length;
          tally.parents_with_several_task_prs += s.several_task_prs ? 1 : 0;
        } catch (e) { tally.side_record_missing++; }
      } else { failed++; rec.error = err.slice(-500); }
      fs.appendFileSync(log, JSON.stringify(rec) + "\n");
      fs.appendFileSync(slog, JSON.stringify({ parent: p, children: kids, ms, exit: code }) + "\n");
      resolve();
    });
  });
}
(async () => {
  let i = 0;
  const workers = Array.from({ length: Math.max(1, CONC) }, async () => { while (i < queue.length) { const p = queue[i++]; await runOne(p); } });
  await Promise.all(workers);
  console.log(JSON.stringify({ version: VERSION, out: OUT, parents: parents.length, built: done, skipped, failed, wall_ms: Date.now() - t0, drops: tally }));
})();
