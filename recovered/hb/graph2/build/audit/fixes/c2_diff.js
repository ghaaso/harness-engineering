#!/usr/bin/env node
// Check 2a: added and removed edges per kind between the old extractor's frozen-commit facts
// (arms/common/frozen-facts, version e409baad8b0c794b) and the new cache (59da7b753a4d908e), and a
// seeded sample (mulberry32, seed 11) of up to N added-or-changed edges per kind, each printed with
// the code at its evidence line in a git-archive export of the frozen commit, for reading by hand.
//   node c2_diff.js <exportDir> [N=20]
"use strict";
const fs = require("fs"), path = require("path");
const BUILD = path.resolve(__dirname, "..", "..");
const P = "a31924a3818f4ac94b695906d107c72c912792b2";
const EXP = process.argv[2];
const N = +(process.argv[3] || 20);
const rd = (f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const oldE = rd(path.join(BUILD, "arms/common/frozen-facts", P, "edges.jsonl"));
const newE = rd(path.join(BUILD, "facts/cache", P, "edges.jsonl"));
const newN = new Map(rd(path.join(BUILD, "facts/cache", P, "nodes.jsonl")).map((n) => [n.id, n]));
const key = (e) => [e.kind, e.src, e.dst, e.evidence_path, e.evidence_line].join("|");
const full = (e) => key(e) + "|" + e.confidence + "|" + JSON.stringify(e.attrs || {});
const oldK = new Map(oldE.map((e) => [key(e), e])), newK = new Map(newE.map((e) => [key(e), e]));
const oldF = new Set(oldE.map(full));
const byKind = {};
const add = (k, f, e) => { byKind[k] = byKind[k] || { added: [], removed: [], changed: [] }; byKind[k][f].push(e); };
for (const [k, e] of newK) { if (!oldK.has(k)) add(e.kind, "added", e); else if (!oldF.has(full(e))) add(e.kind, "changed", e); }
for (const [k, e] of oldK) if (!newK.has(k)) add(e.kind, "removed", e);
function rng(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const srcCache = new Map();
const line = (p, n, ctx = 1) => {
  if (!p || !n) return "(no evidence line)";
  if (!srcCache.has(p)) { try { srcCache.set(p, fs.readFileSync(path.join(EXP, p), "utf8").split("\n")); } catch (e) { srcCache.set(p, null); } }
  const L = srcCache.get(p); if (!L) return "(file missing in export)";
  const out = []; for (let i = Math.max(1, n - ctx); i <= Math.min(L.length, n + ctx); i++) out.push((i === n ? ">" : " ") + i + ": " + L[i - 1].slice(0, 200));
  return out.join("\n");
};
const nd = (id) => { const n = newN.get(id); return n ? `${n.kind} ${n.path || ""}:${n.line_start || ""}-${n.line_end || ""} ${n.name || ""}` : "(not a node) " + id; };
const summary = {};
let txt = "";
for (const k of Object.keys(byKind).sort()) {
  const g = byKind[k];
  summary[k] = { added: g.added.length, removed: g.removed.length, changed_attrs: g.changed.length };
  const pool = g.added.concat(g.changed).sort((a, b) => (full(a) < full(b) ? -1 : 1));
  const r = rng(11); const pick = pool.slice();
  for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
  const s = pick.slice(0, N);
  txt += `\n######## ${k}: added ${g.added.length}, attrs changed ${g.changed.length}, removed ${g.removed.length}; sample ${s.length}\n`;
  s.forEach((e, i) => {
    txt += `--- ${k} #${i + 1} ${newK.has(key(e)) && oldK.has(key(e)) ? "(attrs changed)" : "(added)"} conf=${e.confidence} attrs=${JSON.stringify(e.attrs || {}).slice(0, 220)}\n  src: ${nd(e.src)}\n  dst: ${nd(e.dst)}\n  ev: ${e.evidence_path}:${e.evidence_line}\n${line(e.evidence_path, e.evidence_line)}\n`;
  });
  txt += `-- removed (${g.removed.length}):\n` + g.removed.slice(0, 15).map((e) => `  ${e.src} -> ${e.dst} @ ${e.evidence_path}:${e.evidence_line} ${JSON.stringify(e.attrs || {}).slice(0, 120)}`).join("\n") + "\n";
}
fs.writeFileSync(path.join(__dirname, "c2_sample.txt"), txt);
fs.writeFileSync(path.join(__dirname, "c2_diff_summary.json"), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary));
