// prints the step-10 workflow's verified findings, the unverified ones and the critic's gaps
const fs = require("fs");
const [, , file, what = "verified"] = process.argv;
const j = JSON.parse(fs.readFileSync(file, "utf8"));
const res = typeof j.result === "string" ? JSON.parse(j.result) : j.result;
if (what === "verified") {
  console.log("verified", res.verified.length, "| unverified", res.unverified.length);
  for (const v of res.verified) { if (!v) { console.log("(no verifier result)"); continue; } const f = v.finding, d = v.verdict || {};
    console.log("\n[" + f.from + "/" + f.id + "] " + f.title + "\n   claimed " + f.severity + " -> " + d.outcome + ", " + d.severity + "\n   REASON: " + String(d.reason).slice(0, 900) + (d.corrected_claim ? "\n   CORRECTED: " + String(d.corrected_claim).slice(0, 700) : "")); }
  console.log("\nUNVERIFIED:"); for (const f of res.unverified) console.log(" [" + f.from + "/" + f.id + "] (" + f.severity + ") " + f.title);
} else if (what === "critic") {
  console.log("CRITIC: " + res.critic.overall); for (const g of res.critic.gaps) console.log("\n(" + g.priority + ") " + g.what + "\n   WHY: " + String(g.why_it_matters).slice(0, 500) + "\n   HOW: " + String(g.how_to_close).slice(0, 500));
} else if (what === "verdicts") {
  for (const k of Object.keys(res.agents)) { const a = res.agents[k]; console.log(k + ": " + (a ? a.verdict + " | checks " + a.checks.length + " (pass " + a.checks.filter((c) => c.result === "pass").length + ") | findings " + a.findings.length + " (" + a.findings.filter((f) => f.severity === "invalidates_result").length + " invalidating, " + a.findings.filter((f) => f.severity === "must_disclose").length + " to disclose, " + a.findings.filter((f) => f.severity === "minor").length + " minor)" : "no result")); }
}
