// writes one step-10 workflow result to a file in the lane's coordinator folder, in one write; prints its sha256 and counts
const fs = require("fs"), crypto = require("crypto");
const [, , src, dst, what, runId] = process.argv;
const j = JSON.parse(fs.readFileSync(src, "utf8")); const res = typeof j.result === "string" ? JSON.parse(j.result) : j.result;
if (fs.existsSync(dst)) { console.error("the target exists already: " + dst); process.exit(2); }
const agents = Object.keys(res.agents);
const count = (sev) => agents.reduce((n, k) => n + (res.agents[k] ? res.agents[k].findings.filter((f) => f.severity === sev).length : 0), 0);
const out = { what, workflow_run: runId, agents_total: j.agentCount, verdicts: Object.fromEntries(agents.map((k) => [k, res.agents[k] ? res.agents[k].verdict : null])),
  findings: { invalidates_result: count("invalidates_result"), must_disclose: count("must_disclose"), minor: count("minor") },
  verified: (res.verified || []).filter(Boolean).map((v) => ({ from: v.finding.from, id: v.finding.id, title: v.finding.title, claimed: v.finding.severity, outcome: v.verdict && v.verdict.outcome, severity: v.verdict && v.verdict.severity })),
  unverified: (res.unverified || []).map((f) => ({ from: f.from, id: f.id, title: f.title, severity: f.severity })), result: res };
fs.writeFileSync(dst, JSON.stringify(out, null, 1) + "\n");
const b = fs.readFileSync(dst);
console.log(dst.split("/").slice(-2).join("/"), b.length, "bytes | sha256", crypto.createHash("sha256").update(b).digest("hex"), "| agents", j.agentCount, "| verdicts", JSON.stringify(out.verdicts), "| findings", JSON.stringify(out.findings), "| verified", out.verified.length, "(" + out.verified.map((v) => v.outcome).join(",") + ") | unverified", out.unverified.length, "| checks", agents.reduce((n, k) => n + res.agents[k].checks.length, 0), "not pass", agents.reduce((n, k) => n + res.agents[k].checks.filter((c) => c.result !== "pass").length, 0));
