#!/usr/bin/env node
// Check 1b: recompute co_changed edges from git at chosen parents under the rule
// "ancestors of P only; drop the same-PR siblings of the REAL task commits built on P (sealed
// references); count commits touching 2..30 non-noise files; support >= 2; confidence =
// support / commits touching src; recency = sum 0.5^(age_days/30); commits = last 10 short SHAs".
// Written from the protocol text, not from git_extract.js. Compares with facts/cache/<P>/edges.jsonl.
//   node c1_cochange.js <sha> [<sha> ...]
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const REPO = "C:/Users/User/Documents/projects/EMS_workshop1";
const FROZEN = "a31924a3818f4ac94b695906d107c72c912792b2";
const BUILD = path.resolve(__dirname, "..", "..");
const git = (a) => cp.execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", maxBuffer: 1 << 30 });
const NOISE = /(^|\/)(venv|\.venv|node_modules|__pycache__)\//;

// PR of a commit in the frozen history (and its own history for an off-main commit)
function prMembers(head) {
  const m = new Map();
  const merges = git(["log", "--merges", "--reverse", "--format=%H %P%x09%s", head]).split("\n").filter(Boolean);
  for (const ln of merges) {
    const [hp, s] = ln.split("\t");
    const mm = /^Merge pull request #(\d+)/.exec(s || ""); if (!mm) continue;
    const [, p1, ...ps] = hp.split(" ");
    for (const x of git(["rev-list", "--no-merges", ...ps, "^" + p1]).split("\n").filter(Boolean)) if (!m.has(x)) m.set(x, "#" + mm[1]);
  }
  for (const ln of git(["log", "--no-merges", "--format=%H%x09%s", head]).split("\n").filter(Boolean)) {
    const [h, s] = ln.split("\t"); const mm = /\(#(\d+)\)\s*$/.exec(s || ""); if (mm && !m.has(h)) m.set(h, "#" + mm[1]);
  }
  return m;
}
const PRF = prMembers(FROZEN);
const tasks = new Map();
for (const ln of fs.readFileSync(path.join(BUILD, "sealed", "references.jsonl"), "utf8").split("\n")) {
  if (!ln) continue; const r = JSON.parse(ln);
  if (!r.commit || !["T1", "T1x", "T2", "T4"].includes(r.set)) continue;
  if (!tasks.has(r.parent)) tasks.set(r.parent, new Set()); tasks.get(r.parent).add(r.commit);
}
const out = [];
for (const P of process.argv.slice(2)) {
  const dir = path.join(BUILD, "facts", "cache", P);
  const fileSet = new Set();
  for (const ln of fs.readFileSync(path.join(dir, "nodes.jsonl"), "utf8").split("\n")) { if (!ln) continue; const n = JSON.parse(ln); if (n.kind === "file" || n.kind === "doc") fileSet.add(n.path); }
  const tc = [...(tasks.get(P) || [])];
  const tprs = new Set(tc.map((h) => PRF.get(h) || prMembers(h).get(h)).filter(Boolean));
  const tP = +git(["log", "-1", "--format=%ct", P]).trim();
  const raw = git(["log", "--no-merges", "--no-renames", "--name-only", "--format=@@%H %ct", P]);
  const commits = [];
  for (const blk of raw.split("@@").slice(1)) {
    const L = blk.split("\n").filter(Boolean); const [h, ct] = L[0].split(" ");
    if (tprs.has(PRF.get(h))) continue; // same-PR sibling of a task commit: dropped
    const all = [...new Set(L.slice(1))].filter((f) => !NOISE.test(f));
    commits.push({ h, t: +ct, n: all.length, files: all.filter((f) => fileSet.has(f)).sort() });
  }
  commits.sort((a, b) => a.t - b.t || (a.h < b.h ? -1 : 1));
  const nF = new Map(), pair = new Map();
  for (const c of commits) {
    if (c.n < 2 || c.n > 30) continue;
    const w = Math.pow(0.5, Math.max(0, tP - c.t) / 86400 / 30);
    for (const f of c.files) nF.set(f, (nF.get(f) || 0) + 1);
    for (let i = 0; i < c.files.length; i++) for (let j = 0; j < c.files.length; j++) {
      if (i === j) continue;
      const k = c.files[i] + "\t" + c.files[j];
      const v = pair.get(k) || { n: 0, w: 0, s: [] }; v.n++; v.w += w; v.s.push(c.h.slice(0, 12)); pair.set(k, v);
    }
  }
  const mine = new Map();
  const r4 = (x) => Math.round(x * 1e4) / 1e4;
  for (const [k, v] of pair) { if (v.n < 2) continue; const [a] = k.split("\t"); mine.set(k, { support: v.n, conf: r4(v.n / nF.get(a)), rw: r4(v.w), commits: v.s.slice(-10).join(",") }); }
  const theirs = new Map();
  for (const ln of fs.readFileSync(path.join(dir, "edges.jsonl"), "utf8").split("\n")) {
    if (!ln.includes('"co_changed"')) continue; const e = JSON.parse(ln);
    theirs.set(e.src.slice(5) + "\t" + e.dst.slice(5), { support: e.attrs.support, conf: e.confidence, rw: e.attrs.recency_weight, commits: e.attrs.commits.join(",") });
  }
  let same = 0, diff = [], onlyMine = 0, onlyTheirs = 0;
  for (const [k, v] of mine) { const t = theirs.get(k); if (!t) { onlyMine++; continue; } if (JSON.stringify(t) === JSON.stringify(v)) same++; else diff.push({ k, mine: v, theirs: t }); }
  for (const k of theirs.keys()) if (!mine.has(k)) onlyTheirs++;
  // listed commits vs mine
  const listed = new Set(fs.readFileSync(path.join(dir, "commits.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).sha));
  const mineShas = new Set(commits.map((c) => c.h));
  const rec = { parent: P.slice(0, 12), task_commits: tc.length, task_prs: [...tprs].length, edges_mine: mine.size, edges_cache: theirs.size, identical: same, differ: diff.length, only_mine: onlyMine, only_cache: onlyTheirs, commits_mine: mineShas.size, commits_listed: listed.size, commit_sets_equal: mineShas.size === listed.size && [...mineShas].every((h) => listed.has(h)), first_diffs: diff.slice(0, 3) };
  out.push(rec); console.log(JSON.stringify(rec));
}
fs.writeFileSync(path.join(__dirname, "c1_cochange.json"), JSON.stringify(out, null, 1));
