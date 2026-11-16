// the suspended unit against its two sibling seeds on the same checkpoint: loss lists and score agreement (no truth, no metric)
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const C = process.argv[2];
const base = "train/heldout/parts/E1/c04";
const info = {};
for (const s of ["s1", "s2", "s3"]) {
  const d = path.join(base, s, C); const o = { files: fs.readdirSync(d) };
  for (const f of o.files) if (f.endsWith(".json")) { try { const j = JSON.parse(fs.readFileSync(path.join(d, f), "utf8")); o[f] = j; } catch (e) { o[f] = "unparsable"; } }
  info[s] = o;
}
for (const s of Object.keys(info)) { for (const f of info[s].files.filter((x) => x.endsWith(".json"))) { const j = info[s][f]; const ks = j && typeof j === "object" ? Object.keys(j) : []; console.log(s, f, "keys:", ks.slice(0, 20).join(","));
    const walk = (o, p, d) => { if (d > 3 || o === null || typeof o !== "object") return; for (const k of Object.keys(o)) { const v = o[k]; if (Array.isArray(v) && v.length >= 10 && v.every((x) => typeof x === "number")) console.log("   list " + p + k + ": n " + v.length + " first " + v[0].toFixed(4) + " [n/2] " + v[Math.floor(v.length / 2)].toFixed(4) + " last " + v[v.length - 1].toFixed(4) + " max step up " + Math.max(...v.slice(1).map((x, i) => x - v[i])).toFixed(4) + " all finite " + v.every(Number.isFinite)); else if (/epoch|wall|sec|loss|rss|cuda|triples|entities|relations|seed|device|det/i.test(k) && (typeof v !== "object" || v === null)) console.log("   " + p + k + " = " + v); else walk(v, p + k + ".", d + 1); } };
    walk(j, "", 0); } }
