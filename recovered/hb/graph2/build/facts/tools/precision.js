#!/usr/bin/env node
// Precision sampler for the edge groups the facts-fix lane added or changed. For each group it prints
// up to N seeded-random edges (the whole group when smaller) with the evidence line and the
// destination's defining line, read from an export of the same commit, for reading by hand.
//   node precision.js <before-dir> <after-dir> <export-dir> [n=20] [seed=7] [group]
// A group is a set of AFTER edges: either all edges with a property (e.g. via=sql), or the edges of
// a kind that are new or changed against BEFORE (key = kind, src, dst, evidence, attrs).
"use strict";
const fs = require("fs"), path = require("path");
const [B, A, X, nArg, seedArg, only] = process.argv.slice(2);
const N = Number(nArg || 20);
const rd = (d, f) => fs.readFileSync(path.join(d, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const eB = rd(B, "edges.jsonl"), eA = rd(A, "edges.jsonl");
const nodes = new Map(rd(A, "nodes.jsonl").map((n) => [n.id, n]));
const key = (e) => JSON.stringify([e.kind, e.src, e.dst, e.evidence_path, e.evidence_line, e.attrs]);
const before = new Set(eB.map(key));
const isNew = (e) => !before.has(key(e));
const at = (e) => e.attrs || {};
const GROUPS = [
  ["reads_table from SQL text", (e) => e.kind === "reads_table" && at(e).via === "sql"],
  ["writes_table from SQL text", (e) => e.kind === "writes_table" && at(e).via === "sql"],
  ["writes_table / writes_column via query-flow typed locals", (e) => /^writes_(table|column)$/.test(e.kind) && at(e).typed === "query_flow"],
  ["writes_table via session.delete", (e) => e.kind === "writes_table" && at(e).op === "session.delete"],
  ["migration_touches from SQL text", (e) => e.kind === "migration_touches" && at(e).op === "sql"],
  ["reads_setting new or changed", (e) => e.kind === "reads_setting" && isNew(e)],
  ["calls new or changed (Protocol)", (e) => e.kind === "calls" && isNew(e)],
  ["calls_url / test_calls_route new", (e) => /^(calls_url|test_calls_route)$/.test(e.kind) && isNew(e)],
  ["cites new or changed", (e) => e.kind === "cites" && isNew(e)],
  ["constrains new or changed", (e) => e.kind === "constrains" && isNew(e)],
  ["uses_constant marked subscript_store", (e) => e.kind === "uses_constant" && at(e).subscript_store],
];
const cache = new Map();
const lineAt = (p, l) => {
  if (!p || !l) return "";
  if (!cache.has(p)) { try { cache.set(p, fs.readFileSync(path.join(X, p), "utf8").split("\n")); } catch (e) { cache.set(p, []); } }
  return (cache.get(p)[l - 1] || "").trim().slice(0, 170);
};
for (const [name, pred] of GROUPS) {
  if (only && !name.startsWith(only)) continue;
  const g = eA.filter(pred);
  let seed = Number(seedArg || 7);
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const idx = g.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const pick = idx.slice(0, N).sort((a, b) => a - b);
  console.log(`\n=== ${name}: group size ${g.length}, shown ${pick.length}`);
  pick.forEach((i, k) => {
    const e = g[i], d = nodes.get(e.dst) || {};
    console.log(`#${k + 1} ${e.kind} ${e.src} -> ${e.dst} conf=${e.confidence} ${JSON.stringify(e.attrs || {}).slice(0, 150)}`);
    console.log(`   at ${e.evidence_path}:${e.evidence_line}: ${lineAt(e.evidence_path, e.evidence_line)}`);
    if (d.path && d.line_start) console.log(`   dst ${d.kind} ${d.path}:${d.line_start}: ${lineAt(d.path, d.line_start)}`);
  });
}
