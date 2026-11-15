#!/usr/bin/env node
// Leak and coverage check over a whole facts cache (protocol addendum 2, rule 13).
//   node verify_cache.js [cache-dir=facts/cache]
// For EVERY folder <P>:
//  1. every commit in commits.jsonl is an ancestor-or-self of P, and the rows carry only the
//     allowed fields (sha, time, pr, n_files, used, files): no dropped commit, no drop label;
//  2. every 40-hex string in meta.json is an ancestor-or-self of P; meta.json names no PR number
//     ("#n") and carries no task / drop field (task, task_children, task_prs, dropped_same_pr,
//     same_pr_as_task, pr_in_flight);
//  3. every commit id inside a co_changed edge is an ancestor-or-self of P;
//  4. independent recomputation of the drop rule: the same-PR siblings of P's child commits on main
//     (PRs read here from "Merge pull request #n" merges and "(#n)" subjects) do not appear in
//     commits.jsonl, and no PR label of a listed commit equals a task PR;
//  5. the cache-level build_log.jsonl carries no task field.
// Then: every parent in tasks/parents.txt has a folder. Prints one JSON summary; exit 1 on any failure.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const REPO = "C:/Users/User/Documents/projects/EMS_workshop1";
const FROZEN = "a31924a3818f4ac94b695906d107c72c912792b2";
const BUILD = path.join(__dirname, "..", "..");
const CACHE = path.resolve(process.argv[2] || path.join(BUILD, "facts", "cache"));
const git = (args) => cp.execFileSync("git", ["-C", REPO, ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
const fail = [];
const bad = (p, m) => fail.push(p.slice(0, 12) + ": " + m);
// PR membership on frozen main, computed here independently of git_extract.js
const prOf = new Map();
for (const ln of git(["log", "--merges", "--format=%H %P%x09%s", FROZEN]).split("\n")) {
  if (!ln) continue;
  const [hp, subj] = ln.split("\t");
  const m = /^Merge pull request #(\d+)/.exec(subj || "");
  if (!m) continue;
  const [, p1, p2] = hp.split(" ");
  if (!p2) continue;
  for (const c of git(["rev-list", "--no-merges", p2, "^" + p1]).split("\n").filter(Boolean)) if (!prOf.has(c)) prOf.set(c, "#" + m[1]);
}
for (const ln of git(["log", "--no-merges", "--format=%H%x09%s", FROZEN]).split("\n")) {
  if (!ln) continue;
  const [h, s] = ln.split("\t");
  const m = /\(#(\d+)\)\s*$/.exec(s || "");
  if (m && !prOf.has(h)) prOf.set(h, "#" + m[1]);
}
const kids = new Map();
for (const ln of git(["rev-list", "--no-merges", "--parents", FROZEN]).trim().split("\n")) { const [c, p] = ln.split(" "); if (p) { if (!kids.has(p)) kids.set(p, []); kids.get(p).push(c); } }
const ALLOWED = ["files", "n_files", "pr", "sha", "time", "used"].join(",");
const folders = fs.readdirSync(CACHE, { withFileTypes: true }).filter((e) => e.isDirectory() && /^[0-9a-f]{40}$/.test(e.name)).map((e) => e.name).sort();
const S = { folders: folders.length, commits_rows: 0, cochange_commit_refs: 0, meta_shas: 0, task_pr_siblings_checked: 0, parents_with_task_prs: 0, parents_with_several_task_prs: 0 };
for (const P of folders) {
  const dir = path.join(CACHE, P);
  const anc = new Set(git(["rev-list", P]).split("\n").filter(Boolean));
  const anc12 = new Set([...anc].map((h) => h.slice(0, 12)));
  if (!anc.has(P)) bad(P, "folder name is not a commit");
  const rows = fs.readFileSync(path.join(dir, "commits.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  S.commits_rows += rows.length;
  for (const r of rows) {
    if (!anc.has(r.sha)) bad(P, "commits.jsonl lists a non-ancestor " + r.sha.slice(0, 12));
    if (Object.keys(r).sort().join(",") !== ALLOWED) bad(P, "commits.jsonl row has fields " + Object.keys(r).sort().join(","));
  }
  const ctext = fs.readFileSync(path.join(dir, "commits.jsonl"), "utf8");
  if (/same_pr_as_task|pr_in_flight|"dropped"/.test(ctext)) bad(P, "commits.jsonl carries a drop or task label");
  const mtext = fs.readFileSync(path.join(dir, "meta.json"), "utf8");
  for (const m of mtext.matchAll(/\b[0-9a-f]{40}\b/g)) { S.meta_shas++; if (!anc.has(m[0])) bad(P, "meta.json names a non-ancestor " + m[0].slice(0, 12)); }
  if (/#\d+/.test(mtext)) bad(P, "meta.json names a PR number");
  if (/"(task|task_children|task_prs|dropped_same_pr|several_task_prs)"|same_pr_as_task|pr_in_flight|commits_dropped/.test(mtext)) bad(P, "meta.json carries a task or drop field");
  const meta = JSON.parse(mtext);
  if (meta.commit !== P) bad(P, "meta.commit differs from the folder");
  for (const ln of fs.readFileSync(path.join(dir, "edges.jsonl"), "utf8").split("\n")) {
    if (!ln.includes('"co_changed"')) continue;
    const e = JSON.parse(ln);
    for (const c of (e.attrs && e.attrs.commits) || []) { S.cochange_commit_refs++; if (!anc12.has(c)) bad(P, "co_changed cites a non-ancestor " + c); }
  }
  // independent drop-rule check
  const listed = new Set(rows.map((r) => r.sha));
  const taskPRs = new Set((kids.get(P) || []).map((c) => prOf.get(c)).filter(Boolean));
  if (taskPRs.size) S.parents_with_task_prs++;
  if (taskPRs.size > 1) S.parents_with_several_task_prs++;
  for (const a of anc) {
    const id = prOf.get(a);
    if (id && taskPRs.has(id)) { S.task_pr_siblings_checked++; if (listed.has(a)) bad(P, "a same-PR sibling of a task commit is listed: " + a.slice(0, 12)); }
  }
  for (const r of rows) if (r.pr && taskPRs.has(r.pr)) bad(P, "a listed commit carries a task PR label");
}
const blog = path.join(CACHE, "build_log.jsonl");
if (fs.existsSync(blog) && /"children"|"task/.test(fs.readFileSync(blog, "utf8"))) fail.push("cache build_log.jsonl carries task data");
const listedParents = fs.readFileSync(path.join(BUILD, "tasks", "parents.txt"), "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t")[0]);
const have = new Set(folders);
const missing = listedParents.filter((p) => !have.has(git(["rev-parse", "--verify", p + "^{commit}"]).trim()));
const mainParents = [...kids.keys()];
const missingMain = mainParents.filter((p) => !have.has(p));
const versions = new Set(folders.map((p) => JSON.parse(fs.readFileSync(path.join(CACHE, p, "meta.json"), "utf8")).extractor_version));
console.log(JSON.stringify(Object.assign(S, { parents_txt: listedParents.length, parents_txt_missing: missing, main_parents: mainParents.length, main_parents_missing: missingMain.length, extractor_versions: [...versions], failures: fail.length, first_failures: fail.slice(0, 20) })));
process.exit(fail.length || missing.length || missingMain.length ? 1 : 0);
