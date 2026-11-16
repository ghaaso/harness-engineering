const fs = require("fs"); const [, , file, keys, n = "1800"] = process.argv;
const j = JSON.parse(fs.readFileSync(file, "utf8")); const res = typeof j.result === "string" ? JSON.parse(j.result) : j.result;
for (const k of keys.split(",")) { const a = res.agents[k]; console.log("== " + k + " (" + a.verdict + "): " + String(a.summary).slice(0, Number(n)) + "\n"); }
