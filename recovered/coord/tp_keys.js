// prints the key sets of the lines of train/progress.jsonl by status (keys only, no values except counts)
const fs = require("fs");
const L = fs.readFileSync("train/progress.jsonl", "utf8").split("\n").filter(Boolean).map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
const by = {};
for (const o of L) { const k = (o.status || o.event || o.unit_status || "?") + " :: " + Object.keys(o).join(","); by[k] = (by[k] || 0) + 1; }
for (const k of Object.keys(by).sort((a, b) => by[b] - by[a]).slice(0, 12)) console.log(by[k], k.slice(0, 300));
console.log("lines", L.length);
