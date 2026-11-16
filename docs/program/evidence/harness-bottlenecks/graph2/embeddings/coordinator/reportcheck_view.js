const fs = require("fs"); const [, , file, key, from = "0"] = process.argv;
const j = JSON.parse(fs.readFileSync(file, "utf8")); const res = typeof j.result === "string" ? JSON.parse(j.result) : j.result; const a = res[key];
console.log("== " + key + ": " + a.verdict + " | checked " + a.checked + " | corrections " + a.corrections.length + " | missing " + a.missing.length);
if (from === "0") console.log("SUMMARY: " + a.summary + "\n");
a.corrections.slice(Number(from)).forEach((c, i) => console.log("C" + (i + 1 + Number(from)) + " [" + c.importance + "] " + c.where + "\n   STATED: " + String(c.stated).slice(0, 330) + "\n   SHOULD BE: " + String(c.should_be).slice(0, 520) + "\n   EVIDENCE: " + String(c.evidence).slice(0, 300)));
a.missing.forEach((m, i) => console.log("M" + (i + 1) + " [" + m.importance + "] " + String(m.what).slice(0, 520) + "\n   EVIDENCE: " + String(m.evidence).slice(0, 260)));
console.log("NOT CHECKED: " + a.not_checked.map((x) => String(x).slice(0, 200)).join(" | "));
