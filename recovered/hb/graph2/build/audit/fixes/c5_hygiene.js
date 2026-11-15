#!/usr/bin/env node
// Check 5a: selection hygiene under arms/. Reports
//  - files whose names suggest labels, scores or references;
//  - any task commit SHA (T1/T2 commit, T4 fix commit, T3 document commit) written in a text file,
//    unless that SHA is also a facts parent (a parent may legitimately be named);
//  - the source store: every tree file equals `git ls-tree -r` of its commit, every blob file is
//    referenced by a tree and hashes to its own name (no blob from a later commit), and which split
//    each tree / store parent belongs to.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), crypto = require("crypto");
const BUILD = path.resolve(__dirname, "..", "..");
const REPO = "C:/Users/User/Documents/projects/EMS_workshop1";
const git = (a) => cp.execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", maxBuffer: 1 << 28 });
const tasks = fs.readFileSync(path.join(BUILD, "tasks/tasks.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const tuneP = new Set(tasks.filter((t) => t.split === "tune").map((t) => t.parent));
const heldP = new Set(tasks.filter((t) => t.split !== "tune").map((t) => t.parent));
const taskC = new Set();
for (const l of fs.readFileSync(path.join(BUILD, "sealed/references.jsonl"), "utf8").split("\n")) { if (!l) continue; const r = JSON.parse(l); const c = r.commit || r.fix_commit || r.intro_commit; if (c) taskC.add(c); }
const folders = new Set(fs.readdirSync(path.join(BUILD, "facts/cache")).filter((x) => /^[0-9a-f]{40}$/.test(x)));
const cls = (sha) => [tuneP.has(sha) ? "tune-parent" : null, heldP.has(sha) ? "heldout-parent" : null, taskC.has(sha) ? "task-commit" : null].filter(Boolean).join("+") || "other";
function walk(d, out = []) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else out.push(p); } return out; }
const files = walk(path.join(BUILD, "arms"));
const R = { files: files.length, suspicious_names: [], task_sha_mentions: [], trees: {}, tree_mismatch: [], blobs: 0, blob_hash_bad: [], blobs_unreferenced: [], stores: {} };
const HEX = /(?<![0-9a-f])[0-9a-f]{12,40}(?![0-9a-f])/g;
const taskList = [...taskC];
for (const f of files) {
  const rel = path.relative(BUILD, f).split(path.sep).join("/");
  if (rel.includes("/srcstore/blobs/")) continue;
  if (/label|score|recall|reference|sealed|answer_key/i.test(path.basename(f)) && !/arms\/common\/(score|tq_score)\.js$/.test(rel)) R.suspicious_names.push(rel);
  if (/\.(js|json|jsonl|md|txt|sh|sql|csv|mjs)$/.test(f) && fs.statSync(f).size < 50e6) {
    const t = fs.readFileSync(f, "utf8");
    for (const m of t.matchAll(HEX)) { const hit = taskList.find((c) => c.startsWith(m[0])); if (hit && !folders.has(hit)) R.task_sha_mentions.push(rel + " " + m[0]); }
  }
  const sm = /([0-9a-f]{40})[^/]*\.(sqlite|duckdb|lbug|db)$/.exec(path.basename(f));
  if (sm) R.stores[cls(sm[1])] = (R.stores[cls(sm[1])] || 0) + 1;
}
// source store
const SS = path.join(BUILD, "arms/common/srcstore");
const refBlobs = new Set();
for (const tf of fs.readdirSync(path.join(SS, "trees"))) {
  const sha = tf.replace(/\.json$/, "");
  R.trees[cls(sha)] = (R.trees[cls(sha)] || 0) + 1;
  if (cls(sha).includes("heldout") || cls(sha).includes("task-commit")) R.trees_flagged = (R.trees_flagged || []).concat(sha.slice(0, 12) + " " + cls(sha));
  const tree = JSON.parse(fs.readFileSync(path.join(SS, "trees", tf), "utf8"));
  const real = new Map();
  for (const ln of git(["ls-tree", "-r", sha]).split("\n")) { const m = /^\d+ blob ([0-9a-f]{40})\t(.*)$/.exec(ln); if (m) real.set(m[2], m[1]); }
  for (const [p, b] of Object.entries(tree)) { refBlobs.add(b); if (real.get(p) !== b) R.tree_mismatch.push(sha.slice(0, 12) + " " + p); }
}
for (const bf of fs.readdirSync(path.join(SS, "blobs"))) {
  R.blobs++;
  const b = bf.replace(/\.txt$/, "");
  if (!refBlobs.has(b)) R.blobs_unreferenced.push(b);
  const buf = fs.readFileSync(path.join(SS, "blobs", bf));
  const h = crypto.createHash("sha1").update("blob " + buf.length + "\0").update(buf).digest("hex");
  if (h !== b) R.blob_hash_bad.push(b);
}
R.blob_hash_bad_count = R.blob_hash_bad.length; R.blob_hash_bad = R.blob_hash_bad.slice(0, 5);
fs.writeFileSync(path.join(__dirname, "c5_hygiene.json"), JSON.stringify(R, null, 1));
console.log(JSON.stringify({ ...R, tree_mismatch: R.tree_mismatch.length, blobs_unreferenced: R.blobs_unreferenced.length, task_sha_mentions: R.task_sha_mentions.slice(0, 20) }, null, 1));
