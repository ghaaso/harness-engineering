// the tuning report's verdict table (late 50 tuning commits): per arm, alone and fused, pool and unrestricted, P@10 difference to RRF with its 95 % interval
const fs = require("fs");
const j = JSON.parse(fs.readFileSync("train/report/tune.json", "utf8"));
const f = (x) => (x >= 0 ? "+" : "") + x.toFixed(4);
const out = [];
for (const scope of ["pool", "unrestricted"]) {
  out.push("== late 50, " + scope + ": RRF P@10 " + j.comparators.late50[scope].RRF["P@10"].toFixed(4) + " | PPR " + j.comparators.late50[scope].PPR["P@10"].toFixed(4) + " | CO " + j.comparators.late50[scope].CO["P@10"].toFixed(4) + " | DIR " + j.comparators.late50[scope].DIR["P@10"].toFixed(4) + " | RANDOM " + j.comparators.late50[scope].RANDOM["P@10"].toFixed(4));
  for (const arm of ["E1", "E2", "E3", "E4", "E5", "PLACEBO"]) for (const kind of ["fused", "alone"]) {
    const a = j.arms.late50[scope][arm + "_" + kind], c = j.contrasts.late50[scope][arm + "_" + kind];
    if (!a || !c) { out.push("  " + arm + " " + kind + ": missing"); continue; }
    const d = c.vs_RRF["P@10"], v = j.verdicts.late50[arm][kind + "_" + scope];
    out.push("  " + arm.padEnd(7) + kind.padEnd(6) + " P@10 " + a.seed_mean["P@10"].toFixed(4) + " | diff to RRF " + f(d.diff) + " [" + f(d.lo) + ", " + f(d.hi) + "] p " + d.p + " | verdict: " + v + (kind === "fused" && scope === "pool" ? " (primary: " + j.verdicts.late50[arm].primary + ")" : ""));
  }
}
out.push("== choices per block (config, w): " + ["E1", "E2", "E3", "E4", "E5"].map((a) => a + ": " + j.choices[a].blocks.map((b) => b.config_id + "/" + b.w).join(" ")).join(" | "));
out.push("== counts (keys of E1): " + JSON.stringify(j.counts.E1).slice(0, 400));
out.push("== lag: " + JSON.stringify(j.lag).slice(0, 300));
out.push("== notes keys: " + Object.keys(j.notes).join(","));
console.log(out.join("\n"));
