'use strict';
// Stage-2 additions of the search arm (protocol addendum 3, D.9), taken from the mode catalogue:
//   - a co-change part: the files a person sees with `git log --format= --name-only -- <seed file> |
//     sort | uniq -c | sort -rn`, i.e. files changed together with the seed file in the counted
//     ancestor commits of commits.jsonl (the same commits, counting rule and order as the shared CO
//     padding tail: count desc, recency weight sum 0.5^(age_days/30) desc, path). One lookup in the
//     ledger; its tokens are the "count path" lines. It reads commits, not facts edges.
//   - reciprocal-rank fusion (RRF, k = 60, as SPEC 8.5) of the search's file rankings (grep, BM25,
//     co-change), instead of the default sum of max-normalised scores.
// Both are pure functions so they can be hand-checked on a toy input (tmp/tune-search/handcheck.js).
const { commitCounts } = require('../common/padding');

const RRF_K = 60;
const cmpPath = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// commits: [{time, files, used?, dropped?, n_files?}]; keep(path) says whether a path may be listed
// (code, test or migration file that exists at the parent). Returns [{path, count, rec}] in rank order.
function coChanged(commits, seedPath, keep) {
  let tP = 0; for (const c of commits) if (c.time > tP) tP = c.time;
  const cnt = new Map(); const rec = new Map();
  for (const c of commits) {
    if (!commitCounts(c) || !(c.files || []).includes(seedPath)) continue;
    const wt = Math.pow(0.5, (tP - c.time) / 86400 / 30);
    for (const x of c.files) if (x !== seedPath && keep(x)) { cnt.set(x, (cnt.get(x) || 0) + 1); rec.set(x, (rec.get(x) || 0) + wt); }
  }
  return [...cnt.keys()].sort((a, b) => cnt.get(b) - cnt.get(a) || rec.get(b) - rec.get(a) || cmpPath(a, b))
    .map((p) => ({ path: p, count: cnt.get(p), rec: rec.get(p) }));
}

// RRF over parts. Each part is an array of paths in that part's rank order (position 1 = first). A
// path absent from a part gets nothing from it. fused(p) = sum over parts of 1 / (60 + r).
// Returns [{path, score}] by score desc, then path.
function rrf(parts) {
  const m = new Map();
  for (const part of parts) part.forEach((p, idx) => { m.set(p, (m.get(p) || 0) + 1 / (RRF_K + idx + 1)); });
  return [...m.entries()].map(([path, score]) => ({ path, score })).sort((a, b) => b.score - a.score || cmpPath(a.path, b.path));
}

module.exports = { coChanged, rrf, RRF_K };
