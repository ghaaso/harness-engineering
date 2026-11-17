// writes point 11 of section 16 (the model run of groups 1 to 5) from the run's SUMMARY.json; the prose figures that
// do not come from that file (times, tier counts) are from results/ladder.log and the result files, read on 2026-11-17
// usage: node mk_point11.js <SUMMARY.json> <out file>
const fs = require("fs");
const s = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const R = Object.fromEntries(s.configs.map((r) => [r.id, r]));
const fails = (r) => Object.entries(r.props || {}).filter(([, v]) => v && v.holds === false).map(([k, v]) => k + "(" + v.steps + ")");
const undecided = (r) => Object.entries(r.props || {}).filter(([, v]) => !v || (v.holds !== true && v.holds !== false)).length;
const M = (n) => (n / 1e6).toFixed(1) + " M";
const done = (r) => r.complete === r.parts && !r.bounded.length && !r.failed.length;
const t = s.totals;
if (t.parts !== 5163 || t.complete !== 5154 || t.bounded !== 9 || t.failed !== 0 || t.pending !== 0) { console.error("the totals are not the ones the prose states: " + JSON.stringify(t)); process.exit(1); }
const o = [];
o.push("**11. The model run of groups 1 to 5 (2026-11-17, afternoon and evening).**");
o.push("");
o.push("- **The decision.** The owner stopped the full run after group 5 and asked for every core to be used.");
o.push("  The model changes next (four fixes are to be modelled as built, point 2), and the larger groups would");
o.push("  have to be run again after that. Groups 6 to 11 of `model/RUN-FULL.md` were not run.");
o.push("- **How it was run.** The runner unchanged, as a ladder of memory sizes (`model/RUN-LADDER.md`,");
o.push("  `model/ladder2.sh`): 500 MB with up to 16 workers, then the parts that did not fit again at 1,150 MB");
o.push("  (9 workers by free memory), at 2,600 MB (4) and at 6,000 MB (2). A part ends complete at the size");
o.push("  where it fitted, or BOUNDED at 6,000 MB. None is cut down or skipped; the attempts at the smaller sizes");
o.push("  are kept in `model/results-ladder/`.");
o.push("- **Time.** The ladder ran from 15:29 to 15:43 and, after the interruption of point 4, from 17:19 to");
o.push("  18:49: about 104 minutes for groups 2 to 5. Group 1 had taken four minutes at three workers.");
o.push("  RUN-FULL.md had estimated about 4 hours for groups 1 to 5 at four workers.");
o.push("- **Sizes.** Of 5,163 parts, 1,118 were complete from the first run (at 1,500 MB) and 3,914 fitted in");
o.push("  500 MB; 94 needed 1,150 MB, 26 needed 2,600 MB and 2 needed 6,000 MB (the largest: 28.1 million");
o.push("  states, 3,115 MB counted by the checker). Nine stayed BOUNDED at 6,000 MB: the nine parts of A-FENCE-CE.");
o.push("- **Totals.** " + s.configs.length + " configurations, 5,163 parts: 5,154 complete, 9 BOUNDED, none failed; " + (t.states / 1e9).toFixed(2) + " billion states, " + Math.round(t.cpu_seconds).toLocaleString("en-US") + " cpu-seconds.");
o.push("");
o.push("The adopted design (D, before the six fixes of point 2) and the design with them (DF). Every row is complete.");
o.push("");
o.push("| Size | D: states | D: properties that fail (shortest trace, steps) | DF: states | DF: fails |");
o.push("|---|---|---|---|---|");
for (const [label, f, k] of [["2 fields, 2 faults", 2, "K2"], ["2 fields, 3 faults", 2, "K3"], ["3 fields, 2 faults", 3, "K2"], ["2 fields, 4 faults, at most one of each kind", 2, "K4"]]) {
  for (const r of ["R1", "R2"]) {
    const d = R["D" + f + "-" + k + "-" + r], df = R["DF" + f + "-" + k + "-" + r];
    if (!d || !df || !done(d) || !done(df)) { console.error("row missing or not complete: " + f + " " + k + " " + r); process.exit(1); }
    o.push("| " + label + ", R = " + r.slice(1) + " | " + M(d.states) + " | " + fails(d).join(", ") + " | " + M(df.states) + " | " + (fails(df).join(", ") || "none") + " |");
  }
}
const nk = R["D2-K2-R1-NOKILLWAKE"], rc = R["DFPLUS-RECHECK"];
o.push("");
o.push("Two more rows at 2 fields and 2 faults, both complete. D2-K2-R1-NOKILLWAKE (the adopted design under the");
o.push("reading that a killed background command does not wake its session): fails " + fails(nk).join(", ") + ".");
o.push("DFPLUS-RECHECK (the design with the fixes and one more, a re-check at endturn): fails " + (fails(rc).join(", ") || "none") + ", so that extra");
o.push("fix is not shown to be needed.");
o.push("");
o.push("The design with the fixes with one safeguard taken out, at 2 and at 3 faults (2 fields, R = 1). Every row is");
o.push("complete at both sizes.");
o.push("");
o.push("| Taken out | What it is | With 2 faults: fails | With 3 faults: fails |");
o.push("|---|---|---|---|");
const abl = s.configs.filter((r) => /^(A|X)-/.test(r.id) && !/-K3$/.test(r.id) && r.id !== "A-FENCE-CE");
const nothing = [];
for (const a of abl) {
  const b = R[a.id + "-K3"];
  if (!b || !done(a) || !done(b)) { console.error("ablation row missing or not complete: " + a.id); process.exit(1); }
  const what = (a.title || "").replace(/\|/g, "/").replace(/^ablation from design \+ fixes \(2 faults, R=1\): /, "").replace(/^design \+ fixes without (FIX_[A-Z_]+) \(2 faults, R=1\)$/, "the fix $1");
  o.push("| " + a.id + " | " + what + " | " + (fails(a).join(", ") || "nothing") + " | " + (fails(b).join(", ") || "nothing") + " |");
  if (!fails(a).length && !fails(b).length) nothing.push(a.id);
}
const fc = R["A-FENCE-CE"];
o.push("");
o.push("What the run shows, and what it does not:");
o.push("");
o.push("- **With the six fixes the design holds all 14 properties at every size that was run**: 2 fields with 2, 3");
o.push("  and 4 faults and 3 fields with 2 faults, each with R = 1 and R = 2. New against point 2: R = 2, three");
o.push("  faults complete instead of bounded, four faults, and 3 fields.");
o.push("- **Without them the adopted design fails the same seven properties at every size.**");
o.push("- **Each of the six fixes is needed in the model**: every X- row fails at 2 and at 3 faults.");
o.push("- **" + nothing.length + " of the " + abl.length + " rows fail nothing at either size: " + nothing.join(" and ") + ".** The model does not show these safeguards to");
o.push("  be needed. For A-WX the fidelity review gave the reason (the mechanism behind AtMostOneCommit is never");
o.push("  exercised; with reconcile taken out as well, A-WX+RECONCILE, AtMostOneCommit fails). This is a");
o.push("  statement about the model, not a finding that the safeguards can go.");
o.push("- **A-FENCE-CE** (no --ce check, 1 fault) fails " + fails(fc).join(", ") + "; " + undecided(fc) + " properties are");
o.push("  undecided, because all nine parts stopped at 6,000 MB after about 46 million states each. The fidelity");
o.push("  review says its state space has no end, so a larger size would not finish it.");
o.push("- **Not shown.** Point 2 stands: four of the fixes are oracles in this model, so this run tests the");
o.push("  idealised design and R57 stays blocked. Not run: 3 fields with 3 or 4 faults, two faults of a kind,");
o.push("  and A-FENCE-CE with 2 and 3 faults.");
o.push("- **A correction of an earlier record.** The message of commit 164df64 says the design without the fixes");
o.push("  fails five properties. It fails seven.");
o.push("");
o.push("The results are in `research-tree/model/results/` (one file per part, with the shortest trace of every");
o.push("failing property; `SUMMARY.md`; `DIGEST.md`) and `research-tree/model/results-ladder/`.");
fs.writeFileSync(process.argv[3], o.join("\n") + "\n");
console.log("point 11 written: " + o.length + " lines; ablation rows " + abl.length + "; rows that fail nothing: " + nothing.join(", "));
