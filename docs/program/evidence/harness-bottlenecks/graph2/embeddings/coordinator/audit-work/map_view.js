const fs = require("fs"); const [, , file, key, gmax = "40", dmax = "260"] = process.argv;
const j = JSON.parse(fs.readFileSync(file, "utf8")); const res = typeof j.result === "string" ? JSON.parse(j.result) : j.result; const a = res[key];
console.log("== " + key + "\nSUMMARY: " + a.summary + "\n");
if (process.argv[6] === "facts") for (const f of a.facts) console.log("FACT " + f.topic + ": " + String(f.detail).slice(0, 700) + "\n");
console.log("GROUPS (" + a.groups.length + "):");
for (const g of a.groups.slice(0, Number(gmax))) console.log(" - " + g.group + " | " + g.status + " | files " + g.files + (g.megabytes !== undefined ? " | " + g.megabytes + " MB" : "") + " | " + String(g.detail).slice(0, Number(dmax)));
console.log("RISKS: " + a.risks.map((x) => String(x).slice(0, 300)).join(" || "));
console.log("OPEN: " + a.open_questions.map((x) => String(x).slice(0, 260)).join(" || "));
console.log("FILES: " + a.files_written.join(" ; ").slice(0, 600));
