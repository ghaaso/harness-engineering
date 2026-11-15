// Independent recount of co_changed edges. node cochange_check.js <factsdir> <sha> [n=40]
// Recomputes support for sampled edges from `git log` of the build commit's ancestors, and checks that
// every commit in commits.jsonl is an ancestor of the build commit and older than it (no future data).
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const L = require("./lib.js");
const REPO = "C:/Users/User/Documents/projects/EMS_workshop1";
const [dir, sha, nArg] = process.argv.slice(2);
const F = L.loadFacts(dir);
const git = (a) => cp.execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", maxBuffer: 1 << 30 });
const anc = new Set(git(["rev-list", sha]).trim().split("\n"));
const tP = Number(git(["show", "-s", "--format=%ct", sha]).trim());
const raw = git(["log", "--no-merges", "--no-renames", "--name-only", "--format=@@%H", sha]);
const commits = raw.split("@@").slice(1).map((b) => { const l = b.split("\n").filter(Boolean); return { sha: l[0], files: [...new Set(l.slice(1))].filter((f) => !/(^|\/)(venv|\.venv|node_modules|__pycache__)\//.test(f)) }; });
const cj = fs.readFileSync(path.join(dir, "commits.jsonl"), "utf8").split("\n").filter(Boolean).map(JSON.parse);
const dropped = new Set(cj.filter((c) => c.dropped).map((c) => c.sha));
const bad = cj.filter((c) => !anc.has(c.sha) || c.time > tP).length;
const nodeFiles = new Set(F.nodes.filter((n) => n.kind === "file" || n.kind === "doc").map((n) => n.path));
const used = commits.filter((c) => c.files.length >= 2 && c.files.length <= 30 && !dropped.has(c.sha));
const cnt = (a, b) => used.filter((c) => c.files.includes(a) && c.files.includes(b)).length;
const touch = (a) => used.filter((c) => c.files.includes(a)).length;
const E = F.edges.filter((e) => e.kind === "co_changed");
const S = L.sample(E, Number(nArg || 40), 11);
let ok = 0, confOk = 0;
const out = [];
for (const e of S) {
  const a = e.src.slice(5), b = e.dst.slice(5);
  const s = cnt(a, b), t = touch(a);
  const good = s === e.attrs.support; if (good) ok++;
  const c = Math.round((s / t) * 1e4) / 1e4; if (Math.abs(c - e.confidence) < 1e-3) confOk++;
  if (!good || Math.abs(c - e.confidence) >= 1e-3) out.push(`${a} ~ ${b}: extractor support ${e.attrs.support} conf ${e.confidence}; mine ${s} conf ${c}`);
}
// recall: every pair with my support >= 2 among files present at the commit
const pairs = new Map();
for (const c of used) { const fs_ = c.files.filter((f) => nodeFiles.has(f)).sort(); for (let i = 0; i < fs_.length; i++) for (let j = i + 1; j < fs_.length; j++) { const k = fs_[i] + "|" + fs_[j]; pairs.set(k, (pairs.get(k) || 0) + 1); } }
const mine2 = [...pairs].filter(([k, v]) => v >= 2).map(([k]) => k);
const have = new Set(E.map((e) => [e.src.slice(5), e.dst.slice(5)].sort().join("|")));
const missing = mine2.filter((k) => !have.has(k));
const extra = [...have].filter((k) => !(pairs.get(k) >= 2));
const fileIdsNotAtCommit = F.nodes.filter((n) => (n.kind === "file" || n.kind === "doc") && n.path).length;
console.log(JSON.stringify({ sha: sha.slice(0, 12), commits_listed: cj.length, commits_not_ancestor_or_future: bad, dropped: dropped.size, sampled: S.length, support_match: ok, confidence_match: confOk, mismatches: out.slice(0, 8), my_pairs_support2: mine2.length, extractor_pairs: have.size, missing_pairs: missing.length, extra_pairs: extra.length, missing_examples: missing.slice(0, 5), extra_examples: extra.slice(0, 5) }, null, 1));
