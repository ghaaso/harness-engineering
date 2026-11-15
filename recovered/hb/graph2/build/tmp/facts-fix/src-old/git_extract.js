// FACTS stage: co-change from history, leak-free.
// Uses ONLY commits that are ancestors of the build commit P (git rev-list P), never --all.
// Drops same-PR siblings of the task commit(s) whose parent is P, and every commit of a PR that is
// still in flight at P (its merge commit is not an ancestor of P).
// PR detection: (1) a merge commit M = parents (p1, p2, ...): the PR's commits are the non-merge
//   commits reachable from p2.. but not from p1; PR id "#n" from "Merge pull request #n" in M's
//   subject; back-merges are ignored; (2) a non-merge commit whose subject ends "(#n)" belongs to
//   PR "#n" (squash or rebase merges). A commit inside a merge's branch set takes that merge's id.
// Derived from research/schema/git_extract.js (which used --all and no leak control).
"use strict";
const cp = require("child_process");

const HALF_LIFE_DAYS = 30;
const MIN_FILES = 2, MAX_FILES = 30, MIN_SUPPORT_EDGE = 2;
const NOISE = (f) => /(^|\/)(venv|\.venv|node_modules|__pycache__)\//.test(f);

function git(repo, args) {
  return cp.execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 1 << 30 });
}

function prMap(repo, head) {
  // all commits reachable from head with parents, time, subject
  const raw = git(repo, ["log", "--format=%H%x09%P%x09%ct%x09%s", head]);
  const C = new Map();
  for (const ln of raw.split("\n")) {
    if (!ln) continue;
    const [h, ps, ct, ...s] = ln.split("\t");
    C.set(h, { h, parents: ps ? ps.split(" ") : [], t: Number(ct), subj: s.join("\t") });
  }
  const anc = new Map(); // memoised ancestor sets (including self) as Set
  const order = [...C.keys()].reverse(); // git log default order is reverse-chronological-ish; ensure parents first
  const done = new Set();
  const stack = [];
  const ancOf = (h) => {
    if (anc.has(h)) return anc.get(h);
    // iterative post-order
    stack.push(h);
    while (stack.length) {
      const x = stack[stack.length - 1];
      if (anc.has(x)) { stack.pop(); continue; }
      const c = C.get(x);
      const pend = (c ? c.parents : []).filter((p) => C.has(p) && !anc.has(p));
      if (pend.length) { stack.push(...pend); continue; }
      const s = new Set([x]);
      if (c) for (const p of c.parents) if (anc.has(p)) for (const y of anc.get(p)) s.add(y);
      anc.set(x, s);
      stack.pop();
    }
    return anc.get(h);
  };
  void order; void done;
  const pr = new Map(); // sha -> {id, merge}
  // only PR merges count; back-merges ("Merge branch 'main' into x", "Merge remote-tracking ...") bring
  // main's own commits into a branch and must not be read as that branch's PR
  const merges = [...C.values()].filter((c) => c.parents.length > 1 && /^Merge pull request #\d+/.test(c.subj)).sort((a, b) => a.t - b.t || (a.h < b.h ? -1 : 1));
  for (const m of merges) {
    const mm = m.subj.match(/Merge pull request #(\d+)/);
    const id = "#" + mm[1];
    const main = ancOf(m.parents[0]);
    for (const p of m.parents.slice(1)) for (const x of ancOf(p)) {
      if (main.has(x) || pr.has(x)) continue;
      const c = C.get(x);
      if (c && c.parents.length <= 1) pr.set(x, { id, merge: m.h });
    }
  }
  for (const c of C.values()) {
    if (c.parents.length > 1) continue;
    const mm = c.subj.match(/\(#(\d+)\)\s*$/);
    const cur = pr.get(c.h);
    if (mm && (!cur || cur.id.startsWith("merge:"))) pr.set(c.h, { id: "#" + mm[1], merge: cur ? cur.merge : null });
  }
  return { C, pr, ancOf };
}

function cochange({ repo, sha, frozen, taskShas, fileSet }) {
  const S = {};
  const { C, pr, ancOf } = prMap(repo, frozen && frozen !== sha ? frozen : sha);
  let Cp = C, prp = pr, ancOfp = ancOf;
  if (!C.has(sha)) { const r = prMap(repo, sha); Cp = r.C; prp = r.pr; ancOfp = r.ancOf; }
  const ancP = ancOfp(sha);
  // children of P among non-merge commits of the frozen history (or the given task shas)
  const children = taskShas && taskShas.length ? taskShas : [...C.values()].filter((c) => c.parents.length === 1 && c.parents[0] === sha).map((c) => c.h);
  const taskPRs = new Set(children.map((h) => (pr.get(h) || {}).id).filter(Boolean));
  const dropped = new Map();
  for (const x of ancP) {
    const c = Cp.get(x);
    if (!c || c.parents.length > 1) continue;
    const p = prp.get(x) || pr.get(x);
    if (!p) continue;
    if (taskPRs.has(p.id)) dropped.set(x, "same_pr_as_task:" + p.id);
    else if (p.merge && !ancP.has(p.merge)) dropped.set(x, "pr_in_flight_at_parent:" + p.id);
  }
  // files per non-merge ancestor commit
  const raw = git(repo, ["log", "--no-merges", "--no-renames", "--name-only", "--format=@@%H %ct", sha]);
  const commits = [];
  for (const blk of raw.split("@@").slice(1)) {
    const lines = blk.split("\n").filter(Boolean);
    const [h, ct] = lines[0].split(" ");
    const all = [...new Set(lines.slice(1))].filter((f) => !NOISE(f)).sort();
    commits.push({ sha: h, time: Number(ct), pr: (prp.get(h) || pr.get(h) || {}).id || null, n_files: all.length, files: all.filter((f) => fileSet.has(f)) });
  }
  commits.sort((a, b) => a.time - b.time || (a.sha < b.sha ? -1 : 1));
  const tP = (Cp.get(sha) || C.get(sha) || { t: 0 }).t;
  const nFile = new Map(), pair = new Map();
  let used = 0;
  for (const c of commits) {
    c.dropped = dropped.get(c.sha) || null;
    c.used = !c.dropped && c.n_files >= MIN_FILES && c.n_files <= MAX_FILES;
    if (!c.used) continue;
    used++;
    const w = Math.pow(0.5, Math.max(0, tP - c.time) / 86400 / HALF_LIFE_DAYS);
    for (const f of c.files) nFile.set(f, (nFile.get(f) || 0) + 1);
    for (let i = 0; i < c.files.length; i++) for (let j = i + 1; j < c.files.length; j++) {
      const k = c.files[i] + "\u0000" + c.files[j];
      const v = pair.get(k) || { n: 0, w: 0, shas: [] };
      v.n++; v.w += w; v.shas.push(c.sha.slice(0, 12));
      pair.set(k, v);
    }
  }
  const edges = [];
  const r4 = (x) => Math.round(x * 1e4) / 1e4;
  for (const [k, v] of [...pair.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (v.n < MIN_SUPPORT_EDGE) continue;
    const [a, b] = k.split("\u0000");
    for (const [s, d] of [[a, b], [b, a]]) {
      edges.push({ src: "file:" + s, dst: "file:" + d, kind: "co_changed", evidence_path: null, evidence_line: null,
        confidence: r4(v.n / nFile.get(s)), attrs: { support: v.n, recency_weight: r4(v.w), commits: v.shas.slice(-10) } });
    }
  }
  S.ancestor_non_merge_commits = commits.length;
  S.commits_used = used;
  S.commits_dropped_same_pr = [...dropped.values()].filter((x) => x.startsWith("same_pr")).length;
  S.commits_dropped_in_flight = [...dropped.values()].filter((x) => x.startsWith("pr_in_flight")).length;
  S.task_children = children.map((h) => h.slice(0, 12));
  S.task_prs = [...taskPRs].sort();
  S.pairs_support_1plus = pair.size;
  S.pairs_support_2plus = [...pair.values()].filter((v) => v.n >= 2).length;
  S.pairs_support_3plus = [...pair.values()].filter((v) => v.n >= 3).length;
  S.params = { HALF_LIFE_DAYS, MIN_FILES, MAX_FILES, MIN_SUPPORT_EDGE, recency: "sum over co-change commits of 0.5^(age_days/30), age measured from the build commit's committer time" };
  return { edges, commits: commits.map((c) => ({ sha: c.sha, time: c.time, pr: c.pr, n_files: c.n_files, used: c.used, dropped: c.dropped, files: c.files })), stats: S };
}
module.exports = { cochange, prMap };
