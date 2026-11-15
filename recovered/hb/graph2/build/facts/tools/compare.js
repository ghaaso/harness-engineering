#!/usr/bin/env node
// Compare two facts builds: node and edge counts by kind, and (optionally) the added / removed
// edges of chosen kinds.  node compare.js <before-dir> <after-dir> [kind,kind ...] [--max N]
"use strict";
const fs = require("fs"), path = require("path");
const [A, B, kindsArg] = process.argv.slice(2);
const maxI = process.argv.indexOf("--max");
const MAX = maxI >= 0 ? Number(process.argv[maxI + 1]) : 40;
const rd = (d, f) => fs.readFileSync(path.join(d, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const cnt = (arr) => { const c = {}; for (const x of arr) c[x.kind] = (c[x.kind] || 0) + 1; return c; };
const nA = rd(A, "nodes.jsonl"), nB = rd(B, "nodes.jsonl"), eA = rd(A, "edges.jsonl"), eB = rd(B, "edges.jsonl");
const table = (ca, cb) => { const ks = [...new Set([...Object.keys(ca), ...Object.keys(cb)])].sort(); return ks.map((k) => ({ kind: k, before: ca[k] || 0, after: cb[k] || 0, delta: (cb[k] || 0) - (ca[k] || 0) })); };
console.log(JSON.stringify({ nodes_before: nA.length, nodes_after: nB.length, edges_before: eA.length, edges_after: eB.length }));
console.log("NODES"); for (const r of table(cnt(nA), cnt(nB))) console.log([r.kind, r.before, r.after, r.delta].join("\t"));
console.log("EDGES"); for (const r of table(cnt(eA), cnt(eB))) console.log([r.kind, r.before, r.after, r.delta].join("\t"));
if (kindsArg && !kindsArg.startsWith("--")) {
  const key = (e) => [e.kind, e.src, e.dst, e.evidence_path, e.evidence_line].join(" | ");
  for (const k of kindsArg.split(",")) {
    const sa = new Set(eA.filter((e) => e.kind === k).map(key)), sb = new Set(eB.filter((e) => e.kind === k).map(key));
    const add = [...sb].filter((x) => !sa.has(x)), rem = [...sa].filter((x) => !sb.has(x));
    console.log(`\n== ${k}: +${add.length} -${rem.length}`);
    for (const x of add.slice(0, MAX)) console.log("+ " + x);
    for (const x of rem.slice(0, MAX)) console.log("- " + x);
  }
}
