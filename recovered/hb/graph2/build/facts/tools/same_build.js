#!/usr/bin/env node
// Are two facts builds the same? Every output file byte for byte; meta.json once timings_ms is removed.
//   node same_build.js <dirA> <dirB>   -> prints one JSON line, exit 1 when anything differs
"use strict";
const fs = require("fs"), path = require("path");
const [A, B] = process.argv.slice(2);
const FILES = ["nodes.jsonl", "edges.jsonl", "commits.jsonl", "experimental/response_fields.nodes.jsonl", "experimental/response_fields.edges.jsonl"];
const res = {};
for (const f of FILES) res[f] = Buffer.compare(fs.readFileSync(path.join(A, f)), fs.readFileSync(path.join(B, f))) === 0;
const meta = (d) => { const m = JSON.parse(fs.readFileSync(path.join(d, "meta.json"), "utf8")); delete m.timings_ms; return JSON.stringify(m); };
res["meta.json (without timings_ms)"] = meta(A) === meta(B);
const same = Object.values(res).every(Boolean);
console.log(JSON.stringify({ a: A, b: B, same, files: res }));
process.exit(same ? 0 : 1);
