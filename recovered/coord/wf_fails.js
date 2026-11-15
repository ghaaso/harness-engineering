const fs = require("fs"); const j = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const k of Object.keys(j.agents)) for (const c of j.agents[k].checks) if (c.result !== "pass") console.log(k, "[" + c.result + "]", c.name, "::", String(c.evidence).slice(0, 400));
console.log("done");
