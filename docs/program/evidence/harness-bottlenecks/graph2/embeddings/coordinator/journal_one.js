// prints ONE agent's full result from the journal: the first result whose summary contains the given text
const fs = require("fs");
const [, , file, needle, maxClaim = "1600"] = process.argv;
const L = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
const r = L.filter((o) => o.type === "result" && o.result && typeof o.result === "object" && String(o.result.summary || "").includes(needle))[0];
if (!r) { console.log("no result with that text"); process.exit(1); }
const v = r.result, n = Number(maxClaim);
console.log("VERDICT " + v.verdict + "\nSUMMARY: " + v.summary);
for (const f of v.findings || []) console.log("\n[" + f.severity + "] " + f.id + " " + f.title + "\n  CLAIM: " + String(f.claim).slice(0, n) + "\n  EVIDENCE: " + String(f.evidence).slice(0, n) + "\n  CHECK: " + String(f.how_to_check).slice(0, 400));
console.log("\nNOT CHECKED: " + (v.not_checked || []).map((x) => String(x).slice(0, 220)).join(" | "));
