// prints the audit agents' returned results from a workflow journal: verdict, summary (cut), findings (severity, title, claim cut)
const fs = require("fs");
const [, , file, mode = "head"] = process.argv;
const L = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
const res = L.filter((o) => o.type === "result");
console.log("journal lines", L.length, "| results", res.length, "| keys of a result line:", res[0] ? Object.keys(res[0]).join(",") : "-");
for (const r of res) {
  const v = r.result !== undefined ? r.result : r.value;
  const label = r.label || r.agentLabel || r.id || "?";
  if (!v || typeof v !== "object") { console.log("== " + label + ": " + String(v).slice(0, 200)); continue; }
  if (v.outcome) { console.log("== " + label + " [verify] outcome " + v.outcome + " | severity " + v.severity + " | " + String(v.reason).slice(0, 500)); continue; }
  if (v.gaps) { console.log("== " + label + " [critic] " + String(v.overall).slice(0, 600)); for (const g of v.gaps) console.log("   gap (" + g.priority + "): " + String(g.what).slice(0, 300)); continue; }
  console.log("== " + label + ": verdict " + v.verdict + " | checks " + (v.checks || []).length + " (not pass: " + (v.checks || []).filter((c) => c.result !== "pass").length + ") | findings " + (v.findings || []).length);
  if (mode !== "brief") console.log("   SUMMARY: " + String(v.summary).slice(0, mode === "full" ? 3000 : 700));
  for (const f of v.findings || []) console.log("   [" + f.severity + "] " + f.id + " " + String(f.title).slice(0, 160) + (mode === "full" ? "\n      CLAIM: " + String(f.claim).slice(0, 900) + "\n      EVIDENCE: " + String(f.evidence).slice(0, 700) : ""));
  if (mode === "full") { for (const c of (v.checks || []).filter((c) => c.result !== "pass")) console.log("   CHECK [" + c.result + "] " + String(c.name).slice(0, 140) + " :: " + String(c.evidence).slice(0, 400)); }
}
