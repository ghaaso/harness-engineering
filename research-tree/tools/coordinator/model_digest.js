// turns the model run's SUMMARY.json into the two tables of the record (markdown) and a few totals
// usage: node model_digest.js <SUMMARY.json> [md]
const fs = require("fs");
const s = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const rows = s.configs;
const failing = (r) => Object.entries(r.props || {}).filter(([, v]) => v && v.holds === false).map(([k, v]) => k + (v.steps != null ? "(" + v.steps + ")" : v.trace_steps != null ? "(" + v.trace_steps + ")" : ""));
const unknown = (r) => Object.entries(r.props || {}).filter(([, v]) => !v || (v.holds !== true && v.holds !== false)).map(([k]) => k);
const st = (r) => (r.pending || (r.running && r.running.length) ? "not finished (" + r.complete + "/" + r.parts + ")" : r.bounded.length || r.failed.length ? (r.bounded.length ? r.bounded.length + " of " + r.parts + " parts cut off" : "") + (r.failed.length ? " " + r.failed.length + " failed" : "") : "complete");
const M = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + " G" : n >= 1e6 ? (n / 1e6).toFixed(1) + " M" : String(n));
const tot = { configs: rows.length, parts: 0, complete: 0, bounded: 0, failed: 0, pending: 0, states: 0, cpu: 0 };
for (const r of rows) { tot.parts += r.parts; tot.complete += r.complete; tot.bounded += r.bounded.length; tot.failed += r.failed.length; tot.pending += r.pending + (r.running ? r.running.length : 0); tot.states += r.states; tot.cpu += r.cpu_seconds; }
const out = [];
out.push("TOTALS: " + tot.configs + " configurations, " + tot.parts + " parts: " + tot.complete + " complete, " + tot.bounded + " cut off, " + tot.failed + " failed, " + tot.pending + " not run; " + M(tot.states) + " states; " + Math.round(tot.cpu) + " cpu-s");
const design = rows.filter((r) => /^(D|DF)\d|^DFPLUS/.test(r.id));
out.push("", "| Configuration | What it is | Parts | States | Outcome | Properties that fail (shortest trace, steps) |", "|---|---|---|---|---|---|");
for (const r of design) out.push("| " + r.id + " | " + (r.title || "").replace(/\|/g, "/") + " | " + r.parts + " | " + M(r.states) + " | " + st(r) + " | " + (failing(r).join(", ") || "none") + (unknown(r).length ? "; not decided: " + unknown(r).join(", ") : "") + " |");
const abl = rows.filter((r) => /^(A|X)-/.test(r.id));
const base = (id) => id.replace(/-K3$/, "");
const names = [...new Set(abl.map((r) => base(r.id)))];
out.push("", "| Safeguard removed | What it is | With 2 faults: fails | With 3 faults: fails | Cut off |", "|---|---|---|---|---|");
for (const n of names) {
  const k2 = abl.find((r) => r.id === n), k3 = abl.find((r) => r.id === n + "-K3");
  const cell = (r) => (r ? (failing(r).join(", ") || "nothing") + (unknown(r).length ? " (not decided: " + unknown(r).length + ")" : "") + (st(r).startsWith("not finished") ? " [" + st(r) + "]" : "") : "not in the matrix");
  const cut = [k2, k3].filter(Boolean).filter((r) => r.bounded.length).map((r) => r.id + ": " + r.bounded.length + " of " + r.parts).join("; ") || "none";
  const what = ((k2 || k3).title || "").replace(/\|/g, "/").replace(/^ablation from design \+ fixes \(2 faults, R=1\): /, "").replace(/^design \+ fixes without (FIX_[A-Z_]+) \(2 faults, R=1\)$/, "the fix $1 taken out");
  out.push("| " + n + " | " + what + " | " + cell(k2) + " | " + cell(k3) + " | " + cut + " |");
}
const nothing = abl.filter((r) => !failing(r).length && !st(r).startsWith("not finished")).map((r) => r.id + (r.bounded.length ? " (" + r.bounded.length + " parts cut off)" : ""));
out.push("", "ABLATIONS THAT FAIL NOTHING: " + (nothing.join(", ") || "none"));
const dfBad = design.filter((r) => /^DF\d/.test(r.id) && (failing(r).length || unknown(r).length || r.bounded.length || r.failed.length || r.pending));
out.push("DESIGN WITH FIXES, rows that are not 'complete, none fail': " + (dfBad.map((r) => r.id + " [" + st(r) + "; fails " + (failing(r).join(",") || "none") + "; undecided " + unknown(r).length + "]").join("; ") || "none"));
console.log(out.join("\n"));
