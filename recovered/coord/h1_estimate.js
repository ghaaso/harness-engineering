// Coordinator: a wall-time estimate of the held-out run from stage B's own unit times.
// usage (from LANE): node h1_estimate.js            -> unit-name samples and per-setting wall seconds of stage B (no score is read)
//                    node h1_estimate.js <arm> <cid> -> the estimate for 70 parents x 3 seeds of that setting
const fs = require("fs");
const L = fs.readFileSync("train/progress.jsonl", "utf8").split("\n").filter(Boolean).map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
const done = L.filter((o) => o.status === "done" && typeof o.wall_s === "number" && "reps_deleted" in o);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const by = {};
for (const o of done) { const parts = String(o.unit).split("/"); const k = parts.slice(0, parts.length >= 4 ? parts.length - 2 : 2).join("/"); (by[k] = by[k] || []).push(o); }
if (process.argv.length < 4) {
  console.log("samples of unit names:", done.slice(0, 2).map((o) => o.unit).join(" | "), "|", done[done.length - 1].unit, "| step values:", [...new Set(done.map((o) => o.step))].join(","));
  for (const k of Object.keys(by).sort()) { const w = by[k].map((o) => o.wall_s); console.log(k, "| units", w.length, "| wall_s median", med(w), "max", Math.max(...w), "sum", Math.round(w.reduce((a, b) => a + b, 0)), "| peak_rss_mb max", Math.max(...by[k].map((o) => o.peak_rss_mb || 0))); }
} else {
  const [arm, cid] = process.argv.slice(2);
  const keys = Object.keys(by).filter((k) => k.split("/").includes(arm) && k.split("/").includes(cid));
  const w = keys.flatMap((k) => by[k].map((o) => o.wall_s));
  if (!w.length) { console.log("no stage-B unit found for", arm, cid); process.exit(1); }
  const m = med(w), mx = Math.max(...w), units = 70 * 3;
  console.log(arm, cid, "| stage-B units", w.length, "| wall_s median", m, "max", mx, "| held-out units", units, "| estimate at the median", (m * units / 3600).toFixed(2), "h | at the max", (mx * units / 3600).toFixed(2), "h");
}
