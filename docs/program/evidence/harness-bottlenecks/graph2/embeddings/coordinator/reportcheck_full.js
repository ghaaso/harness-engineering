const fs = require("fs"); const [, , file, key, ...idx] = process.argv;
const j = JSON.parse(fs.readFileSync(file, "utf8")); const res = typeof j.result === "string" ? JSON.parse(j.result) : j.result; const a = res[key];
for (const i of idx) { const c = a.corrections[Number(i) - 1]; console.log("C" + i + " SHOULD BE: " + c.should_be + "\n   EVIDENCE: " + c.evidence + "\n"); }
