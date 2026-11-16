// every figure the coordinator's report quotes, from the source files (tuning late 50 and the grader's returns)
const fs = require("fs");
const t = JSON.parse(fs.readFileSync("train/report/tune.json", "utf8"));
const g = (x) => (x >= 0 ? "+" : "") + x.toFixed(4);
console.log("LATE 50 comparators pool P@10:", ["RRF", "PPR", "CO", "DIR", "RANDOM"].map((k) => k + " " + t.comparators.late50.pool[k]["P@10"].toFixed(4)).join(" | "), "|| unrestricted:", ["RRF", "PPR", "CO", "DIR", "RANDOM"].map((k) => k + " " + t.comparators.late50.unrestricted[k]["P@10"].toFixed(4)).join(" | "));
for (const arm of ["E1", "E2", "E3", "E4", "E5", "PLACEBO"]) {
  const cells = [];
  for (const [kind, scope] of [["fused", "pool"], ["alone", "pool"], ["fused", "unrestricted"], ["alone", "unrestricted"]]) {
    const d = t.contrasts.late50[scope][arm + "_" + kind].vs_RRF["P@10"], a = t.arms.late50[scope][arm + "_" + kind].seed_mean["P@10"];
    cells.push(kind + "/" + scope + " " + a.toFixed(4) + " " + g(d.diff) + " [" + g(d.lo) + ", " + g(d.hi) + "] " + t.verdicts.late50[arm][kind + "_" + scope]);
  }
  console.log(arm + ": " + cells.join(" || "));
}
const i24 = JSON.parse(fs.readFileSync("grader-returns/tune-item24.json", "utf8")).labels;
console.log("TUNING ANSWER LEVEL (grader, late 50): " + Object.keys(i24).filter((k) => !/_s[123]$/.test(k)).map((k) => k + " " + i24[k].mean.primary.toFixed(4) + (i24[k].vs_RRF ? " (" + g(i24[k].vs_RRF.primary.diff) + " [" + g(i24[k].vs_RRF.primary.lo) + ", " + g(i24[k].vs_RRF.primary.hi) + "])" : "")).join(" | "));
const h = JSON.parse(fs.readFileSync("grader-returns/heldout.json", "utf8"));
console.log("HELD-OUT pool P@10: " + ["RRF", "PPR", "CO", "DIR", "E1_alone_mean", "E1_fused_mean"].map((k) => k + " " + h.rank[k].pool["P@10"].toFixed(4)).join(" | ") + " || unrestricted: " + ["RRF", "PPR", "CO", "DIR", "E1_alone_mean", "E1_fused_mean"].map((k) => k + " " + h.rank[k].unrestricted["P@10"].toFixed(4)).join(" | "));
console.log("HELD-OUT answer level: " + ["RRF", "PPR", "CO", "DIR", "E1_alone_mean", "E1_fused_mean"].map((k) => k + " " + h.answer_level[k].toFixed(4)).join(" | "));
for (const k of ["E1_fused_mean", "E1_alone_mean"]) console.log("HELD-OUT " + k + " vs RRF: " + Object.keys(h.vs_RRF[k]).map((m) => m + " " + g(h.vs_RRF[k][m].diff) + " [" + g(h.vs_RRF[k][m].lo) + ", " + g(h.vs_RRF[k][m].hi) + "]").join(" | "));
console.log("choices (final all 65): " + ["E1", "E2", "E3", "E4", "E5"].map((a) => a + " " + t.choices[a].final_all65.config_id + " w " + t.choices[a].final_all65.w + " " + t.choices[a].final_all65.mean.toFixed(4)).join(" | "));
console.log("pilot-shared fused pool: " + ["E1", "E2", "E3", "E4", "E5"].map((a) => { const d = t.contrasts.late50_pilot_shared.pool[a + "_fused"].vs_RRF["P@10"]; return a + " " + g(d.diff) + " [" + g(d.lo) + ", " + g(d.hi) + "]"; }).join(" | "));
