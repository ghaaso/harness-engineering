#!/usr/bin/env node
// Check 3a: score 5 TUNE T1 answers by hand-checkable steps and compare with arms/common/score.js.
// For each (answer file, task id) it prints the reference, then every item visible at 8,000 tokens with:
// whether its path line is shown, the content lines it shows (re-derived from the facts nodes and the
// file at the parent, NOT taken from the answer record), and which reference definitions those lines
// fall inside. The tally is then compared with score.js's scoreAnswer on the same record.
//   node c3_handscore.js <answers.jsonl.gz>:<taskId> ...   (TUNE T1 only; refuses anything else)
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib"), cp = require("child_process");
const BUILD = path.resolve(__dirname, "..", "..");
const REPO = "C:/Users/User/Documents/projects/EMS_workshop1";
const S = require(path.join(BUILD, "arms/common/score.js"));
const DEF = new Set(["function", "method", "class", "component", "constant", "test", "migration"]);
const refsRaw = new Map();
for (const ln of fs.readFileSync(path.join(BUILD, "sealed/references.jsonl"), "utf8").split("\n")) {
  if (!ln.includes('"split": "tune"') && !ln.includes('"split":"tune"')) continue;
  const r = JSON.parse(ln); if (r.set === "T1" && r.split === "tune") refsRaw.set(r.id, r);
}
const nodesAt = new Map();
function nodes(P) {
  if (!nodesAt.has(P)) nodesAt.set(P, fs.readFileSync(path.join(BUILD, "facts/cache", P, "nodes.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
  return nodesAt.get(P);
}
const nLines = (P, p) => { try { const t = cp.execFileSync("git", ["-C", REPO, "cat-file", "-p", P + ":" + p], { encoding: "utf8", maxBuffer: 1 << 26 }); return t.split("\n").length - (t.endsWith("\n") ? 1 : 0); } catch (e) { return null; } };
let out = "";
const say = (s) => { out += s + "\n"; };
const summary = [];
for (const spec of process.argv.slice(2)) {
  const [file, id] = spec.split(":");
  const r = refsRaw.get(id); if (!r) throw new Error("not a TUNE T1 task: " + id);
  const a = zlib.gunzipSync(fs.readFileSync(path.join(BUILD, file))).toString().split("\n").filter(Boolean).map((l) => JSON.parse(l)).find((x) => x.id === id);
  const P = a.parent;
  const files = [...new Set(r.files.map((f) => f.path))];
  const defs = r.defs.map((d) => ({ path: d.path, start: d.start, end: d.end, name: d.name }));
  say(`\n==== ${a.arm} ${a.config_name || a.config_hash} | ${a.granularity}/${a.form}/pad=${a.pad} | task ${id} | parent ${P.slice(0, 10)}`);
  say(`reference: ${files.length} files, ${defs.length} definitions`);
  files.forEach((f) => say("  F " + f));
  defs.forEach((d) => say(`  D ${d.path}:${d.start}-${d.end} ${d.name}`));
  const b = a.budgets["8000"];
  const gotF = new Set(), gotD = new Set();
  let mismatchShown = 0;
  const N = nodes(P);
  const visible = b.n_full + (b.cut ? 1 : 0);
  for (let i = 0; i < visible; i++) {
    const it = a.items[i];
    const isCut = i === b.n_full;
    // re-derive the full item's content lines from the facts
    let derived = null;
    if (a.form === "signature" && a.granularity === "file") derived = N.filter((n) => n.path === it.path && DEF.has(n.kind) && n.line_start).map((n) => n.line_start).sort((x, y) => x - y);
    else if (a.form === "signature") derived = [it.ls];
    else if (a.form === "snippet" && a.granularity === "file") { const k = nLines(P, it.path); derived = k ? [1, k] : null; }
    else if (a.form === "snippet") derived = [it.ls, it.le || it.ls];
    if (derived && JSON.stringify(derived) !== JSON.stringify(it.shown)) mismatchShown++;
    let shown = it.shown, pathShown = true;
    if (isCut) { shown = b.cut.shown; pathShown = b.cut.path_shown; }
    const inF = pathShown && files.includes(it.path);
    if (inF) gotF.add(it.path);
    const hitD = [];
    defs.forEach((d, j) => {
      if (d.path !== it.path || !shown || !shown.length || !["signature", "snippet"].includes(a.form)) return;
      const ok = a.form === "snippet" ? shown[0] <= d.end && d.start <= shown[1] : shown.some((l) => l >= d.start && l <= d.end);
      if (ok) { hitD.push(d.name); gotD.add(j); }
    });
    const sh = shown ? (shown.length > 8 ? shown.slice(0, 8).join(",") + ",..(" + shown.length + ")" : shown.join(",")) : "-";
    say(`  ${String(i + 1).padStart(3)} ${isCut ? "CUT" : "   "} pad=${it.pad} ${it.path}${it.symbol ? "::" + it.symbol : ""} tok=${it.tok}${isCut ? " cutTok=" + b.cut.tok + " pathShown=" + pathShown : ""} shown=[${sh}]${derived && JSON.stringify(derived) !== JSON.stringify(it.shown) ? " DERIVED-DIFFERS " + JSON.stringify(derived).slice(0, 80) : ""}${inF ? "  <-FILE" : ""}${hitD.length ? "  <-DEFS " + hitD.join(", ") : ""}`);
  }
  const mine = (gotF.size + gotD.size) / (files.length + defs.length);
  const refs = S.readRefs(path.join(BUILD, "sealed/references.jsonl"));
  const s = S.scoreAnswer(a, refs.get(id));
  const rec = { arm: a.arm, config: a.config_name || a.config_hash, form: a.granularity + "/" + a.form + "/" + a.pad, task: id, units: files.length + defs.length, files_hit: gotF.size, defs_hit: gotD.size, mine_r8000: +mine.toFixed(6), scorejs_r8000: s.r8000 == null ? null : +s.r8000.toFixed(6), scorejs_primary: s.primary == null ? null : +s.primary.toFixed(6), scorejs_def_r8000: s.def_r8000, shown_lines_rederived_mismatch: mismatchShown, used8000: b.used, visible_items: visible };
  say("  TALLY " + JSON.stringify(rec));
  summary.push(rec);
}
fs.writeFileSync(path.join(__dirname, "c3_handscore.txt"), out);
fs.writeFileSync(path.join(__dirname, "c3_handscore.json"), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
