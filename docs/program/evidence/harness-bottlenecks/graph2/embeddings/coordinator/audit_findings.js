// lists every finding of a step-10 workflow result by agent: severity, id, title (and the claim, cut)
const fs = require("fs");
const [, , file, n = "260"] = process.argv;
const j = JSON.parse(fs.readFileSync(file, "utf8")); const res = typeof j.result === "string" ? JSON.parse(j.result) : j.result;
for (const k of Object.keys(res.agents)) { const a = res.agents[k]; if (!a) continue; console.log("== " + k + " (" + a.verdict + ")"); for (const f of a.findings) console.log("  [" + f.severity + "] " + f.id + " " + f.title + (Number(n) ? "\n      " + String(f.claim).slice(0, Number(n)) : "")); }
