const fs = require("fs");
const j = JSON.parse(fs.readFileSync("train/leak_audit/leak_audit.json", "utf8"));
console.log("keys:", Object.keys(j).join(","));
console.log("ok:", j.ok, "| test:", j.test, "| plan_hash:", String(j.plan_hash).slice(0, 12));
for (const k of Object.keys(j)) { const v = j[k]; if (v && typeof v === "object" && !Array.isArray(v)) { const o = {}; for (const kk of Object.keys(v)) { const x = v[kk]; if (typeof x !== "object" || x === null) o[kk] = typeof x === "string" ? x.slice(0, 140) : x; else o[kk] = Array.isArray(x) ? "array[" + x.length + "]" : "object{" + Object.keys(x).length + "}"; } console.log("-- " + k + ": " + JSON.stringify(o).slice(0, 700)); } else if (Array.isArray(v)) console.log("-- " + k + ": array[" + v.length + "]" + (v.length && v.length <= 8 ? " " + JSON.stringify(v).slice(0, 300) : "")); }
