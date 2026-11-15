// Recall probe for unit-of-work writes: every `name.attr = value` line in backend production code where attr is
// a mapped column name, with name not self/cls/settings, checked against writes_column/writes_table evidence lines.
"use strict";
const L = require("./lib.js");
const F = L.loadFacts(process.argv[2]), repo = L.mkRepo(process.argv[3]);
const cols = new Set(F.nodes.filter((n) => n.kind === "column").map((n) => n.name));
const ev = new Set(F.edges.filter((e) => e.kind === "writes_column" || e.kind === "writes_table").map((e) => e.evidence_path + ":" + e.evidence_line));
const isTest = (p) => /(^|\/)tests\//.test(p) || /(^|\/)test_[^/]*\.py$/.test(p) || /conftest\.py$/.test(p);
let total = 0, hit = 0;
const miss = [];
for (const f of repo.files.filter((f) => /^backend\/(app|scripts)\/.*\.py$/.test(f) && !isTest(f) && !/\/alembic\//.test(f))) {
  repo.lines(f).forEach((ln, i) => {
    const m = ln.match(/^\s+([a-z_]\w*)\.(\w+)\s*(=|\+=|-=)(?!=)/);
    if (!m || ["self", "cls", "settings", "app", "os", "logger", "request", "response", "resp", "state"].includes(m[1]) || !cols.has(m[2])) return;
    total++;
    if (ev.has(f + ":" + (i + 1))) hit++; else miss.push(f + ":" + (i + 1) + ": " + ln.trim().slice(0, 80));
  });
}
console.log(JSON.stringify({ assignment_lines: total, with_write_edge: hit }));
for (const m of miss) console.log("  " + m);
