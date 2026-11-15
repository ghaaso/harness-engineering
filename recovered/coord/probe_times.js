// prints only the keys of the probe's record and its time and memory fields (no score field is printed)
const fs = require("fs");
const j = JSON.parse(fs.readFileSync("train/probe/probe.json", "utf8"));
console.log("keys:", Object.keys(j).join(","));
const want = /sec|time|wall|eta|hour|minute|rss|peak|mem|unit|estimate|epochs|cap/i;
const walk = (o, p, d) => { if (d > 4 || o === null) return; if (typeof o !== "object") { if (want.test(p) && String(o).length < 200) console.log(p, "=", o); return; }
  if (Array.isArray(o)) { if (o.length <= 6) o.forEach((v, i) => walk(v, p + "[" + i + "]", d + 1)); else console.log(p, "= array of", o.length); return; }
  for (const k of Object.keys(o)) { if (/score|p@|r@|mrr|rank|metric/i.test(k)) continue; walk(o[k], p ? p + "." + k : k, d + 1); } };
walk(j, "", 0);
