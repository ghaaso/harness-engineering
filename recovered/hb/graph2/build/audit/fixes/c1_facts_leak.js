#!/usr/bin/env node
// Check 1 (audit of the fixes): facts leak over EVERY folder of facts/cache.
// Independent of facts/tools/verify_cache.js: task commits come from sealed/references.jsonl (the
// real task commits), not from "children of P on main"; PR membership is computed here.
// Read-only: git object reads only. Writes one JSON report to audit/fixes/c1_facts_leak.json.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const REPO = "C:/Users/User/Documents/projects/EMS_workshop1";
const FROZEN = "a31924a3818f4ac94b695906d107c72c912792b2";
const BUILD = path.resolve(__dirname, "..", "..");
const CACHE = path.join(BUILD, "facts", "cache");
const git = (a) => cp.execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", maxBuffer: 1 << 30 });

// ---- all commits (every ref) with parents and subjects
const C = new Map();
for (const ln of git(["log", "--all", "--format=%H%x09%P%x09%ct%x09%s"]).split("\n")) {
  if (!ln) continue;
  const [h, ps, ct, ...s] = ln.split("\t");
  C.set(h, { h, parents: ps ? ps.split(" ") : [], t: +ct, subj: s.join("\t") });
}
const byPrefix = new Map();
for (const h of C.keys()) { const k = h.slice(0, 7); if (!byPrefix.has(k)) byPrefix.set(k, []); byPrefix.get(k).push(h); }

// ---- PR membership within a given history (head): merges first, then "(#n)" squash subjects
const MEM = new Map();
function prMapAt(head) {
  const anc = new Set(git(["rev-list", head]).split("\n").filter(Boolean));
  const m = new Map();
  const merges = [...anc].map((h) => C.get(h)).filter((c) => c && c.parents.length > 1 && /^Merge pull request #\d+/.test(c.subj)).sort((a, b) => a.t - b.t || (a.h < b.h ? -1 : 1));
  for (const c of merges) {
    const id = "#" + /^Merge pull request #(\d+)/.exec(c.subj)[1];
    if (!MEM.has(c.h)) MEM.set(c.h, git(["rev-list", "--no-merges", ...c.parents.slice(1), "^" + c.parents[0]]).split("\n").filter(Boolean));
    const mem = MEM.get(c.h);
    for (const x of mem) if (!m.has(x)) m.set(x, id);
  }
  for (const h of anc) {
    const c = C.get(h);
    if (!c || c.parents.length > 1) continue;
    const mm = /\(#(\d+)\)\s*$/.exec(c.subj);
    if (mm && !m.has(h)) m.set(h, "#" + mm[1]);
  }
  return { anc, m };
}
const frozenPR = prMapAt(FROZEN).m;
// off-main commits: PR from their own history
const prOfTask = (h) => frozenPR.get(h) || prMapAt(h).m.get(h) || null;

// ---- real task commits per parent (all sets, both splits), read from the sealed references
const tasksByParent = new Map();
const taskCommits = new Set();
for (const ln of fs.readFileSync(path.join(BUILD, "sealed", "references.jsonl"), "utf8").split("\n")) {
  if (!ln) continue;
  const r = JSON.parse(ln);
  // T1/T1x/T2: commit; T4: fix_commit; T3: intro_commit (the document's commit); T5: none
  const tc = r.commit || r.fix_commit || r.intro_commit;
  if (!tc) continue;
  taskCommits.add(tc);
  if (!tasksByParent.has(r.parent)) tasksByParent.set(r.parent, new Set());
  tasksByParent.get(r.parent).add(tc);
}

const folders = fs.readdirSync(CACHE, { withFileTypes: true }).filter((e) => e.isDirectory() && /^[0-9a-f]{40}$/.test(e.name)).map((e) => e.name).sort();
const R = { folders: folders.length, commit_rows: 0, hex_runs_checked: 0, hex_runs_commit_like: 0, cochange_refs: 0, failures: [], over_dropped: [], pr_label_mismatch: 0, meta_keys: new Set(), extractor_versions: new Set(), per_folder: {} };
const fail = (P, m) => R.failures.push(P.slice(0, 12) + ": " + m);
const HEX = /(?<![0-9a-f])[0-9a-f]{7,40}(?![0-9a-f])/g;
function walkKeys(o, pre) { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { R.meta_keys.add(pre + k); walkKeys(v, pre + k + "."); } }
function filesUnder(d) { const out = []; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) out.push(...filesUnder(p)); else out.push(p); } return out; }

for (const P of folders) {
  const dir = path.join(CACHE, P);
  const { anc, m: prP } = prMapAt(P);
  const anc12 = new Set([...anc].map((h) => h.slice(0, 12)));
  const tasks = [...(tasksByParent.get(P) || [])];
  const taskPRs = new Set(tasks.map(prOfTask).filter(Boolean));
  const siblings = new Set([...anc].filter((h) => { const c = C.get(h); return c && c.parents.length <= 1 && taskPRs.has(frozenPR.get(h) || prP.get(h)); }));
  // commits.jsonl
  const rows = fs.readFileSync(path.join(dir, "commits.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  R.commit_rows += rows.length;
  const listed = new Set(rows.map((r) => r.sha));
  for (const r of rows) {
    if (!anc.has(r.sha)) fail(P, "commits.jsonl lists non-ancestor " + r.sha.slice(0, 12));
    if (taskCommits.has(r.sha) && !anc.has(r.sha)) fail(P, "task commit listed " + r.sha.slice(0, 12));
    if (siblings.has(r.sha)) fail(P, "same-PR sibling of a task commit listed " + r.sha.slice(0, 12));
    const keys = Object.keys(r).sort().join(",");
    if (keys !== "files,n_files,pr,sha,time,used") fail(P, "commit row fields " + keys);
    const exp = prP.get(r.sha) || null;
    if ((r.pr || null) !== exp) { R.pr_label_mismatch++; if (R.pr_label_mismatch <= 10) fail(P, "pr label " + r.pr + " but P's own history gives " + exp + " for " + r.sha.slice(0, 12)); }
    if (r.pr && taskPRs.has(r.pr)) fail(P, "listed commit labelled with a task PR " + r.sha.slice(0, 12));
    if (r.used !== (r.n_files >= 2 && r.n_files <= 30)) fail(P, "used flag not a function of n_files " + r.sha.slice(0, 12));
  }
  // non-merge ancestors missing from commits.jsonl that are NOT siblings of a real task commit
  const nonMergeAnc = [...anc].filter((h) => { const c = C.get(h); return c && c.parents.length <= 1; });
  const missing = nonMergeAnc.filter((h) => !listed.has(h));
  const over = missing.filter((h) => !siblings.has(h));
  if (over.length) R.over_dropped.push({ parent: P.slice(0, 12), n: over.length, prs: [...new Set(over.map((h) => frozenPR.get(h) || prP.get(h)))], real_task_commits_here: tasks.length });
  // meta.json
  const mtext = fs.readFileSync(path.join(dir, "meta.json"), "utf8");
  const meta = JSON.parse(mtext);
  walkKeys(meta, "");
  R.extractor_versions.add(meta.extractor_version);
  if (/#\d+/.test(mtext)) fail(P, "meta.json names a PR number");
  // "dropped_dangling_edges" (self-calls and dangling migration links) is not a commit drop label
  if (/task|drop|in_flight|child|sibling/i.test(Object.keys(meta).filter((k) => k !== "dropped_dangling_edges").join(" ") + " " + JSON.stringify(Object.keys(meta.switches || {})) + " " + JSON.stringify(Object.keys(((meta.stages || {}).git || {}).stats || {})))) fail(P, "meta.json has a task/drop key");
  // every file of the folder: commit-like hex runs must be ancestors-or-self
  for (const f of filesUnder(dir)) {
    const t = fs.readFileSync(f, "utf8");
    for (const mm of t.matchAll(HEX)) {
      R.hex_runs_checked++;
      const s = mm[0];
      const cands = (byPrefix.get(s.slice(0, 7)) || []).filter((h) => h.startsWith(s));
      if (!cands.length) continue;
      R.hex_runs_commit_like++;
      if (!cands.some((h) => anc.has(h))) fail(P, path.relative(dir, f) + " names non-ancestor commit " + s + (cands.some((h) => taskCommits.has(h)) ? " (A TASK COMMIT)" : ""));
    }
  }
  // co_changed commit refs
  for (const ln of fs.readFileSync(path.join(dir, "edges.jsonl"), "utf8").split("\n")) {
    if (!ln.includes('"co_changed"')) continue;
    const e = JSON.parse(ln);
    for (const c of (e.attrs && e.attrs.commits) || []) {
      R.cochange_refs++;
      if (!anc12.has(c)) fail(P, "co_changed cites non-ancestor " + c);
      if ([...siblings].some((h) => h.startsWith(c))) fail(P, "co_changed cites a dropped sibling " + c);
    }
  }
  R.per_folder[P.slice(0, 12)] = { tasks: tasks.length, task_prs: taskPRs.size, siblings_dropped: siblings.size, missing_nonmerge: missing.length, over_dropped: over.length, rows: rows.length };
}
// cache-level build log
const blog = path.join(CACHE, "build_log.jsonl");
if (fs.existsSync(blog)) {
  const t = fs.readFileSync(blog, "utf8");
  if (/"children"|"task/.test(t)) R.failures.push("cache build_log.jsonl carries task fields");
  // a SHA that is a folder name (a parent) is allowed even when it is also some other task's commit
  for (const mm of t.matchAll(HEX)) { const c = (byPrefix.get(mm[0].slice(0, 7)) || []).filter((h) => h.startsWith(mm[0])); if (c.length && !c.some((h) => folders.includes(h))) R.failures.push("build_log names a commit that is not a cache folder " + mm[0]); }
}
// coverage
const pl = fs.readFileSync(path.join(BUILD, "tasks", "parents.txt"), "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t")[0]);
R.parents_txt_lines = pl.length;
R.parents_txt_distinct = new Set(pl).size;
R.parents_txt_missing = [...new Set(pl)].filter((p) => !folders.includes(p));
const tl = fs.readFileSync(path.join(BUILD, "tasks", "tasks.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
R.task_parents_missing = [...new Set(tl.map((t) => t.parent))].filter((p) => !folders.includes(p));
R.extractor_versions = [...R.extractor_versions];
R.meta_keys = [...R.meta_keys].filter((k) => !k.startsWith("counts.") && !k.startsWith("stages.py.stats.") && !k.startsWith("stages.ts.stats.") && !k.startsWith("timings_ms."));
R.over_dropped_total = R.over_dropped.reduce((a, b) => a + b.n, 0);
R.siblings_total = Object.values(R.per_folder).reduce((a, b) => a + b.siblings_dropped, 0);
R.failure_count = R.failures.length;
R.failures = R.failures.slice(0, 60);
fs.writeFileSync(path.join(__dirname, "c1_facts_leak.json"), JSON.stringify(R, null, 1));
console.log(JSON.stringify({ folders: R.folders, failures: R.failure_count, commit_rows: R.commit_rows, cochange_refs: R.cochange_refs, hex_commit_like: R.hex_runs_commit_like, pr_label_mismatch: R.pr_label_mismatch, siblings_total: R.siblings_total, over_dropped_total: R.over_dropped_total, over_dropped_parents: R.over_dropped.length, missing: R.parents_txt_missing, task_parents_missing: R.task_parents_missing, versions: R.extractor_versions }));
