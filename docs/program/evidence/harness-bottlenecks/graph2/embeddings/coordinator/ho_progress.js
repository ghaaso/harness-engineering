// the held-out run's own progress file: counts by status, the unit time distribution and the timeline (no score is read)
const fs = require("fs");
const L = fs.readFileSync("train/heldout/progress.jsonl", "utf8").split("\n").filter(Boolean).map((s) => { try { return JSON.parse(s); } catch (e) { return { bad: s.slice(0, 80) }; } });
const by = {}; for (const o of L) { const k = (o.step || "?") + "/" + (o.status || "?") + (o.unit === "start" ? "/start" : ""); by[k] = (by[k] || 0) + 1; }
console.log("lines", L.length, "|", JSON.stringify(by));
console.log("key sets:", [...new Set(L.map((o) => Object.keys(o).join(",")))].slice(0, 6).join(" || ").slice(0, 700));
const starts = L.filter((o) => o.unit === "start"); console.log("start lines", starts.length, "| freeze_sha256 values", JSON.stringify([...new Set(starts.map((o) => o.freeze_sha256))]), "| t", starts.map((o) => o.t).join(","));
const done = L.filter((o) => o.status === "done" && typeof o.wall_s === "number");
const w = done.map((o) => o.wall_s).sort((a, b) => a - b);
const q = (p) => w[Math.min(w.length - 1, Math.floor(p * w.length))];
console.log("done units with wall_s", done.length, "| wall_s min", w[0], "q25", q(0.25), "median", q(0.5), "q75", q(0.75), "max", w[w.length - 1], "| sum h", (w.reduce((a, b) => a + b, 0) / 3600).toFixed(2));
const ts = done.map((o) => Date.parse(o.t)).sort((a, b) => a - b);
let maxGap = 0, at = null; for (let i = 1; i < ts.length; i++) if (ts[i] - ts[i - 1] > maxGap) { maxGap = ts[i] - ts[i - 1]; at = new Date(ts[i - 1]).toISOString(); }
console.log("first done", new Date(ts[0]).toISOString(), "| last done", new Date(ts[ts.length - 1]).toISOString(), "| largest gap between done lines", (maxGap / 1000).toFixed(0), "s after", at);
const rss = done.map((o) => o.peak_rss_mb).filter((x) => typeof x === "number"); if (rss.length) console.log("peak_rss_mb max", Math.max(...rss), "| peak_cuda_reserved_mb max", Math.max(...done.map((o) => o.peak_cuda_reserved_mb || 0)));
const perHour = {}; for (const o of done) { const h = o.t.slice(11, 13); perHour[h] = (perHour[h] || 0) + 1; } console.log("done units per UTC hour:", JSON.stringify(perHour));
console.log("sample unit names:", done.slice(0, 2).map((o) => o.unit).join(" | "), "| other statuses:", L.filter((o) => o.status !== "done" && o.unit !== "start").slice(0, 5).map((o) => JSON.stringify(o).slice(0, 160)).join(" ## "));
