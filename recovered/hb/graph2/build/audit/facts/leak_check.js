// Future-leak check for one facts build at commit P, using git directly (not the extractor's export):
//  - every node/edge path exists in `git ls-tree P`; every symbol's line range fits the file at P and its
//    name appears on its first lines at P;
//  - commits.jsonl / co_changed commits are ancestors of P and not later than P;
//  - labels that can only be known after P: PR ids whose merge is not an ancestor of P and whose subject has no
//    "(#n)", `dropped` labels, task SHAs in meta.json.
// node leak_check.js <factsdir> <sha>
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const REPO = "C:/Users/User/Documents/projects/EMS_workshop1";
const [dir, sha] = process.argv.slice(2);
const git = (a) => cp.execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", maxBuffer: 1 << 30 });
const rd = (f) => fs.readFileSync(path.join(dir, f), "utf8").split("\n").filter(Boolean).map(JSON.parse);
const nodes = rd("nodes.jsonl"), edges = rd("edges.jsonl"), commits = rd("commits.jsonl");
const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
const tree = new Set(git(["ls-tree", "-r", "--name-only", sha]).split("\n").filter(Boolean));
const anc = new Set(git(["rev-list", sha]).trim().split("\n"));
const tP = Number(git(["show", "-s", "--format=%ct", sha]).trim());
const dirs = new Set(); for (const f of tree) { const p = f.split("/"); for (let i = 1; i < p.length; i++) dirs.add(p.slice(0, i).join("/")); }
const inTree = (p) => tree.has(p) || dirs.has(p);
const fileText = new Map();
const textAt = (p) => { if (!fileText.has(p)) { let t = null; try { t = git(["show", sha + ":" + p]); } catch (e) {} fileText.set(p, t); } return fileText.get(p); };
const R = { nodes: nodes.length, node_paths_not_at_P: [], symbol_range_bad: [], symbol_name_not_at_line: 0, symbols_checked: 0, edge_evidence_not_at_P: [], commits_not_ancestor: 0, commits_after_P: 0, cochange_commit_refs_not_ancestor: 0 };
for (const n of nodes) {
  if (n.path && !inTree(n.path)) R.node_paths_not_at_P.push(n.id);
  if (!process.env.NOSYM && n.id.startsWith("sym:") && n.path && n.line_start) {
    const t = textAt(n.path); if (t == null) continue;
    const L = t.split("\n");
    if (n.line_end > L.length + 1) R.symbol_range_bad.push(n.id);
    R.symbols_checked++;
    const nm = (n.name || "").split(" > ").pop();
    const win = L.slice(n.line_start - 1, n.line_start + 3).join("\n");
    if (nm && !/^test:/.test(n.id.split("#")[1]) && !win.includes(nm.split(".").pop())) { R.symbol_name_not_at_line++; (R.name_examples = R.name_examples || []).length < 8 && R.name_examples.push(n.id + " L" + n.line_start); }
  }
}
for (const e of edges) if (e.evidence_path && !inTree(e.evidence_path)) R.edge_evidence_not_at_P.push(e.kind + " " + e.evidence_path);
for (const c of commits) { if (!anc.has(c.sha)) R.commits_not_ancestor++; if (c.time > tP) R.commits_after_P++; }
for (const e of edges.filter((e) => e.kind === "co_changed")) for (const s of e.attrs.commits || []) if (![...anc].some((a) => a.startsWith(s))) R.cochange_commit_refs_not_ancestor++;
// labels only knowable after P
const subj = new Map(git(["log", "--format=%H%x09%s", sha]).split("\n").filter(Boolean).map((l) => l.split("\t")));
const mergesAtP = new Set(git(["log", "--merges", "--format=%s", sha]).split("\n").map((s) => (s.match(/Merge pull request #(\d+)/) || [])[1]).filter(Boolean));
let prFuture = 0;
for (const c of commits) if (c.pr) { const n = c.pr.slice(1); const own = new RegExp("\\(#" + n + "\\)\\s*$").test(subj.get(c.sha) || ""); if (!own && !mergesAtP.has(n)) prFuture++; }
R.commit_pr_labels = commits.filter((c) => c.pr).length;
R.commit_pr_labels_known_only_after_P = prFuture;
R.commits_with_dropped_label = commits.filter((c) => c.dropped).length;
R.dropped_labels = [...new Set(commits.filter((c) => c.dropped).map((c) => c.dropped))];
R.dropped_commits_files_listed = commits.filter((c) => c.dropped).reduce((a, c) => a + c.files.length, 0);
R.meta_task_shas = (meta.switches && meta.switches.task) || null;
R.meta_task_prs = ((meta.stages.git || {}).stats || {}).task_prs || null;
R.node_paths_not_at_P = R.node_paths_not_at_P.slice(0, 10);
R.edge_evidence_not_at_P = R.edge_evidence_not_at_P.slice(0, 10);
console.log(JSON.stringify(R, null, 1));
