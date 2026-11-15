// Precision sampler: prints N seeded-random edges of one kind with the evidence line and the
// destination's defining line, read from a kept export, for a human (or agent) to check by reading.
// Usage: node sample.js <factsdir> <exportdir> <kind> [n=20] [seed=1] [--exp]
"use strict";
const fs = require("fs"), path = require("path");
const [dir, exp, kind, nArg, seedArg] = process.argv.slice(2);
const n = Number(nArg || 20);
let seed = Number(seedArg || 1);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const xp = process.argv.includes("--exp");
const read = (f) => fs.existsSync(f) ? fs.readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : [];
const nodes = new Map(read(path.join(dir, "nodes.jsonl")).concat(xp ? read(path.join(dir, "experimental/response_fields.nodes.jsonl")) : []).map((x) => [x.id, x]));
const edges = (xp ? read(path.join(dir, "experimental/response_fields.edges.jsonl")) : read(path.join(dir, "edges.jsonl"))).filter((e) => e.kind === kind);
const lineCache = new Map();
const lineAt = (p, l) => {
  if (!p || !l) return "";
  if (!lineCache.has(p)) { try { lineCache.set(p, fs.readFileSync(path.join(exp, p), "utf8").split("\n")); } catch (e) { lineCache.set(p, []); } }
  return (lineCache.get(p)[l - 1] || "").trim().slice(0, 170);
};
const idx = edges.map((_, i) => i);
for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
console.log(`kind=${kind} total=${edges.length} sample=${Math.min(n, edges.length)}`);
idx.slice(0, n).forEach((i, k) => {
  const e = edges[i];
  const d = nodes.get(e.dst) || {};
  console.log(`#${k + 1} ${e.src}  ->  ${e.dst}  conf=${e.confidence} ${e.attrs ? JSON.stringify(e.attrs).slice(0, 140) : ""}`);
  console.log(`   at ${e.evidence_path}:${e.evidence_line}: ${lineAt(e.evidence_path, e.evidence_line)}`);
  console.log(`   dst ${d.kind} ${d.path}:${d.line_start}: ${lineAt(d.path, d.line_start) || d.signature || ""}`);
});
