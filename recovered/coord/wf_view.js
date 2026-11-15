// prints a workflow result compactly: node wf_view.js <tasks/<id>.output> <agent key> [what]
// what: head (verdict, summary, discrepancies, fragile points, not_checked) | checks | recomputed | all
const fs = require("fs");
const [, , file, key, what = "head"] = process.argv;
let raw = fs.readFileSync(file, "utf8");
let j;
try { j = JSON.parse(raw); } catch (e) { const i = raw.indexOf("{"); j = JSON.parse(raw.slice(i, raw.lastIndexOf("}") + 1)); }
const res = j.result !== undefined ? (typeof j.result === "string" ? JSON.parse(j.result) : j.result) : j;
if (!key) { console.log("keys:", Object.keys(res).join(","), "| top keys:", Object.keys(j).join(",")); process.exit(0); }
const a = res[key];
if (!a) { console.log("no result for", key); process.exit(1); }
if (what === "head" || what === "all") {
  console.log("VERDICT:", a.verdict);
  console.log("SUMMARY:", a.summary);
  console.log("DISCREPANCIES (" + (a.discrepancies || []).length + "):");
  for (const d of a.discrepancies || []) console.log(" - [" + d.severity + "] " + d.what + "\n     expected: " + d.expected + "\n     found: " + d.found + "\n     evidence: " + d.evidence);
  console.log("FRAGILE POINTS (" + (a.fragile_points || []).length + "):"); for (const f of a.fragile_points || []) console.log(" - " + f);
  console.log("NOT CHECKED (" + (a.not_checked || []).length + "):"); for (const f of a.not_checked || []) console.log(" - " + f);
  console.log("FILES WRITTEN:", (a.files_written || []).length);
}
if (what === "checks" || what === "all") { console.log("CHECKS (" + (a.checks || []).length + "):"); for (const c of a.checks || []) console.log(" [" + c.result + "] " + c.name + " :: " + c.evidence); }
if (what === "recomputed" || what === "all") console.log("RECOMPUTED:\n" + (a.recomputed || "(none)"));
