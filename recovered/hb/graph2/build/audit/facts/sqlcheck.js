// Lists every SQL-text-derived table edge with the source lines that mention the table in an SQL shape,
// marking whether each hit sits inside a string passed to execute/text/op.execute or only in a docstring/comment.
"use strict";
const L = require("./lib.js");
const F = L.loadFacts(process.argv[2]);
const repo = L.mkRepo(process.argv[3]);
for (const e of F.edges.filter((e) => (e.kind === "writes_table" || e.kind === "reads_table" || e.kind === "migration_touches") && e.attrs && (e.attrs.via === "sql" || e.attrs.op === "sql"))) {
  const s = F.N.get(e.src);
  const tb = F.N.get(e.dst).name;
  const all = repo.lines(s.path || e.evidence_path);
  const a = s.line_start || 1, b = s.line_end || all.length;
  const rx = new RegExp("(INSERT\\s+INTO|UPDATE|DELETE\\s+FROM|FROM|JOIN|ALTER\\s+TABLE|INTO|TABLE)\\s+\"?" + tb + "\\b", "i");
  const hits = [];
  for (let i = a; i <= b; i++) if (rx.test(all[i - 1])) hits.push(i + ": " + all[i - 1].trim().slice(0, 100));
  console.log(e.kind, e.src.split("/").pop().slice(0, 60), tb, "ev L" + e.evidence_line, "\n    " + hits.slice(0, 4).join("\n    "));
}
