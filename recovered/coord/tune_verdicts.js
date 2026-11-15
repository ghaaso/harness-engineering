// prints the tuning report's verdicts and primary contrasts (late 50). Tuning data only.
const fs = require("fs");
const j = JSON.parse(fs.readFileSync("train/report/tune.json", "utf8"));
const f = (x) => typeof x === "number" ? (Math.abs(x) < 1e-12 ? "0" : x.toFixed(4)) : JSON.stringify(x);
const show = (o) => typeof o === "object" && o !== null ? Object.keys(o).map((k) => k + "=" + (typeof o[k] === "object" && o[k] !== null ? JSON.stringify(o[k]).slice(0, 120) : f(o[k]))).join(" ") : f(o);
console.log("== comparators, late 50, pool:");
for (const k of Object.keys(j.comparators.late50.pool)) console.log("  " + k + ": " + show(j.comparators.late50.pool[k]).slice(0, 300));
console.log("== verdicts.late50.E1 (shape):", JSON.stringify(j.verdicts.late50.E1).slice(0, 700));
console.log("== contrasts.late50.pool.E1_fused (shape):", JSON.stringify(j.contrasts.late50.pool.E1_fused).slice(0, 700));
console.log("== arms.late50.pool.E1_fused (shape):", JSON.stringify(j.arms.late50.pool.E1_fused).slice(0, 500));
console.log("== holm.late50.pool.fused (shape):", JSON.stringify(j.holm.late50.pool.fused).slice(0, 600));
console.log("== harness_check:", JSON.stringify(j.harness_check).slice(0, 900));
