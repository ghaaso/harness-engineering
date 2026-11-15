#!/usr/bin/env node
// Check 3b: paths and range forms earn no definition credit and no primary; a bare list of files no
// longer scores high. Uses arms/common/score.js on TUNE T1 answer files only (references filtered to
// T1 tune before scoring). Also scores a FORGED copy of the bare-paths floor answers relabelled as
// signature form (shown = null), to show what a bare list can earn at most under the content rule.
//   node c3_forms.js <answers.jsonl.gz> ...
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const BUILD = path.resolve(__dirname, "..", "..");
const S = require(path.join(BUILD, "arms/common/score.js"));
const all = S.readRefs(path.join(BUILD, "sealed/references.jsonl"));
const refs = new Map([...all].filter(([, r]) => r.set === "T1" && r.split === "tune"));
const res = [];
function scoreList(answers, label, rule) {
  const per = [];
  for (const a of answers) { const r = refs.get(a.id); if (!r) continue; const s = S.scoreAnswer(a, r, { rule }); if (s) per.push(s); }
  const rows = S.clusterValues(per); const sm = S.summarise(per, rows);
  const m = (k) => (sm.metrics[k].mean == null ? null : +sm.metrics[k].mean.toFixed(4));
  const rec = { label, rule, tasks: sm.tasks, clusters: sm.clusters, primary: m("primary"), r8000: m("r8000"), def_r8000: m("def_r8000"), file_r8000: m("file_r8000"), auc: m("auc"), file_r10: m("file_r10"), ndcg10: m("ndcg10"), mrr: m("mrr"), tok8000_median: sm.metrics.tok8000.median_over_tasks };
  res.push(rec); console.log(JSON.stringify(rec));
}
for (const f of process.argv.slice(2)) {
  const answers = zlib.gunzipSync(fs.readFileSync(path.join(BUILD, f))).toString().split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((a) => a.split === "tune" && a.set === "T1");
  const a0 = answers[0];
  const label = `${a0.arm} ${a0.config_name || a0.config_hash} ${a0.granularity}/${a0.form}/${a0.pad}`;
  scoreList(answers, label, "content");
  if (a0.form === "paths" || a0.form === "range") {
    scoreList(answers, label + " [old rule locate]", "locate");
    const forged = answers.map((a) => ({ ...a, form: "signature", items: a.items.map((it) => ({ ...it, shown: null })), budgets: Object.fromEntries(Object.entries(a.budgets).map(([k, b]) => [k, { ...b, cut: b.cut ? { ...b.cut, shown: null } : null }])) }));
    scoreList(forged, label + " [FORGED as signature, shown=null]", "content");
  }
}
fs.writeFileSync(path.join(__dirname, "c3_forms.json"), JSON.stringify(res, null, 1));
