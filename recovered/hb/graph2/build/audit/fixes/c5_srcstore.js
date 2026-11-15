#!/usr/bin/env node
// Check 5b: the shared source store holds only text of its own commit. For every trees/<sha>.json,
// each path's stored hash must equal sha1 of the file at <sha> (git cat-file, CRLF -> LF, the store's
// own convention), and the blob file must hash to its name. A blob from a later commit would fail.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), crypto = require("crypto");
const BUILD = path.resolve(__dirname, "..", "..");
const REPO = "C:/Users/User/Documents/projects/EMS_workshop1";
const SS = path.join(BUILD, "arms/common/srcstore");
const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");
const R = { trees: 0, entries: 0, entry_mismatch: [], blobs: 0, blob_self_hash_bad: [] };
for (const tf of fs.readdirSync(path.join(SS, "trees"))) {
  const sha = tf.slice(0, 40); R.trees++;
  const tree = JSON.parse(fs.readFileSync(path.join(SS, "trees", tf), "utf8"));
  const paths = Object.keys(tree);
  const out = cp.execFileSync("git", ["-C", REPO, "cat-file", "--batch"], { input: paths.map((p) => sha + ":" + p).join("\n") + "\n", maxBuffer: 1 << 30 });
  let off = 0;
  for (const p of paths) {
    const nl = out.indexOf(10, off); const hdr = out.slice(off, nl).toString();
    const m = /^([0-9a-f]{40}) blob (\d+)$/.exec(hdr);
    R.entries++;
    if (!m) { R.entry_mismatch.push(sha.slice(0, 12) + " " + p + " " + hdr); off = nl + 1; continue; }
    const len = +m[2]; const body = out.slice(nl + 1, nl + 1 + len).toString("utf8").replace(/\r\n/g, "\n");
    off = nl + 1 + len + 1;
    if (sha1(body) !== tree[p]) R.entry_mismatch.push(sha.slice(0, 12) + " " + p);
  }
}
for (const bf of fs.readdirSync(path.join(SS, "blobs"))) {
  R.blobs++;
  if (sha1(fs.readFileSync(path.join(SS, "blobs", bf), "utf8")) !== bf.replace(/\.txt$/, "")) R.blob_self_hash_bad.push(bf);
}
R.entry_mismatch_count = R.entry_mismatch.length; R.entry_mismatch = R.entry_mismatch.slice(0, 10);
fs.writeFileSync(path.join(__dirname, "c5_srcstore.json"), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R));
