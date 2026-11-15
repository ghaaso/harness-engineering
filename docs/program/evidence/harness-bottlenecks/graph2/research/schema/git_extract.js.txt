// Commit, churn and co-change measurements; overlap of co-change with structural edges;
// same-capability folders across runtimes. Read-only. Usage: node git_extract.js <repo> <lane>
const fs = require("fs"), path = require("path"), cp = require("child_process");
const ROOT = process.argv[2], L = process.argv[3];
const t0 = Date.now();
const log = cp.execFileSync("git", ["-C", ROOT, "log", "--all", "--no-merges", "--name-only", "--format=@@%H|%ad|%s", "--date=short"], { encoding: "utf8", maxBuffer: 1 << 28 });
const commits = [];
for (const blk of log.split("@@").slice(1)) {
  const [head, ...files] = blk.split("\n").filter(Boolean);
  const [h, date, subj] = head.split("|");
  commits.push({ h, date, subj, files });
}
const code = (f) => !f.includes("/venv/") && /\.(py|ts|tsx|js|jsx|mjs)$/.test(f) && /^(backend|src|technician-app\/src|ops-server)/.test(f);
const rt = (f) => (f.startsWith("backend/") ? "backend" : f.startsWith("technician-app/") ? "mobile" : f.startsWith("src/") ? "web" : f.startsWith("docs/") || f.endsWith(".md") ? "docs" : "other");
const churn = {}, fixChurn = {};
const pair = new Map();
let used = 0;
for (const c of commits) {
  const fs_ = [...new Set(c.files.filter((f) => code(f) || f.endsWith(".md")))];
  for (const f of fs_) { churn[f] = (churn[f] || 0) + 1; if (/^fix/i.test(c.subj)) fixChurn[f] = (fixChurn[f] || 0) + 1; }
  if (fs_.length < 2 || fs_.length > 30) continue;
  used++;
  for (let i = 0; i < fs_.length; i++) for (let j = i + 1; j < fs_.length; j++) {
    const k = [fs_[i], fs_[j]].sort().join(" | ");
    pair.set(k, (pair.get(k) || 0) + 1);
  }
}
// structural file-level links from the extracted graphs
const py = JSON.parse(fs.readFileSync(path.join(L, "py_graph.json"), "utf8"));
const tsg = JSON.parse(fs.readFileSync(path.join(L, "ts_graph.json"), "utf8"));
const pathOf = (id) => (id.startsWith("sym:") ? (py.nodes[id] || {}).path : id.startsWith("file:") ? id.slice(5) : id.split("#")[0]);
const struct = new Set();
const addS = (a, b) => { if (a && b && a !== b) struct.add([a, b].sort().join(" | ")); };
for (const [t, s, d] of py.edges) if (["calls", "depends_injects"].includes(t)) addS(pathOf(s), pathOf(d));
for (const c of tsg.calls) addS(pathOf(c.src), pathOf(c.dst));
const routeHandler = {};
for (const r of py.routes) routeHandler[r.method + " " + r.path.replace(/\{[^}]+\}/g, "{}")] = (py.nodes[r.handler] || {}).path;
for (const u of tsg.urls) { const k = u.method + " " + u.url; for (const [rk, hp] of Object.entries(routeHandler)) if (rk === k) addS(u.file, hp); }
// table-mediated: model file <-> repository file through table edges
const tbl = {};
for (const [t, s, d] of py.edges) if (t === "writes_table" || t === "reads_table") (tbl[d] = tbl[d] || new Set()).add(pathOf(s));
const codePairs = [...pair.entries()].filter(([k]) => k.split(" | ").every(code));
const sup = (n) => codePairs.filter(([, v]) => v >= n);
const R = { commits: commits.length, fix_commits: commits.filter((c) => /^fix/i.test(c.subj)).length, commits_used_for_cochange: used,
  first: commits[commits.length - 1].date, last: commits[0].date };
for (const n of [2,3, 5]) {
  const s = sup(n);
  const cross = s.filter(([k]) => new Set(k.split(" | ").map(rt)).size > 1);
  const notStruct = s.filter(([k]) => !struct.has(k));
  const crossNotStruct = cross.filter(([k]) => !struct.has(k));
  R["cochange_support_ge_" + n] = { pairs: s.length, cross_runtime: cross.length, not_linked_by_calls_di_url: notStruct.length, cross_runtime_not_linked: crossNotStruct.length };
}
R.example_cross_runtime_unlinked_ge3 = sup(3).filter(([k]) => new Set(k.split(" | ").map(rt)).size > 1 && !struct.has(k)).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => v + " " + k);
const docCode = [...pair.entries()].filter(([k, v]) => v >= 3 && k.split(" | ").some((f) => f.endsWith(".md")) && k.split(" | ").some(code));
R.doc_code_cochange_ge3 = docCode.length;
R.structural_file_pairs = struct.size;
const ch = Object.entries(churn).filter(([f]) => code(f)).sort((a, b) => b[1] - a[1]);
R.code_files_with_churn = ch.length;
R.top_churn = ch.slice(0, 12).map(([f, v]) => `${v} (fix ${fixChurn[f] || 0}) ${f}`);
// same capability across runtimes
const caps = (dir) => { try { return fs.readdirSync(path.join(ROOT, dir)).filter((d) => fs.statSync(path.join(ROOT, dir, d)).isDirectory()); } catch (e) { return []; } };
const b = new Set(caps("backend/app/features")), m = new Set(caps("technician-app/src/features")), w = new Set(caps("src/features"));
const allc = [...new Set([...b, ...m, ...w])].sort();
R.capabilities = allc.map((c) => `${c}:${[b.has(c) && "B", m.has(c) && "M", w.has(c) && "W"].filter(Boolean).join("")}`);
R.capabilities_in_2plus = allc.filter((c) => [b.has(c), m.has(c), w.has(c)].filter(Boolean).length >= 2).length;
R.ms = Date.now() - t0;
fs.writeFileSync(path.join(L, "git_out.json"), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
