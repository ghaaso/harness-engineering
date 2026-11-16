// the grader's aggregated returns, compact: held-out (descriptive) and the tuning answer level
const fs = require("fs");
const h = JSON.parse(fs.readFileSync("grader-returns/heldout.json", "utf8"));
const f = (x) => typeof x === "number" ? x.toFixed(4) : JSON.stringify(x);
console.log("== HELD-OUT (75 commits, 418 tasks), rank metrics; keys of rank.RRF.pool:", Object.keys(h.rank.RRF.pool).join(","));
for (const scope of ["pool", "unrestricted"]) for (const v of ["RRF", "PPR", "CO", "DIR", "E1_alone_mean", "E1_fused_mean", "E1_alone_s1", "E1_alone_s2", "E1_alone_s3", "E1_fused_s1", "E1_fused_s2", "E1_fused_s3"]) { const r = h.rank[v][scope]; console.log("  " + scope.padEnd(13) + v.padEnd(15) + Object.keys(r).map((k) => k + " " + f(r[k])).join(" | ").slice(0, 200)); }
console.log("== vs_RRF:", JSON.stringify(h.vs_RRF).slice(0, 1800));
console.log("== answer level (8,000-token answer recall):", Object.keys(h.answer_level).map((k) => k + " " + f(h.answer_level[k])).join(" | "));
const t = JSON.parse(fs.readFileSync("grader-returns/tune-item24.json", "utf8"));
console.log("== TUNING answer level (late 50): keys", Object.keys(t).join(","));
const al = t.answer_level || t.item24 || t;
console.log(JSON.stringify(al).slice(0, 2200));
