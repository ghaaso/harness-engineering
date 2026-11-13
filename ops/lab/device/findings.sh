#!/usr/bin/env bash
# FixFlow device lab: tabulate result.json files into the findings table (Markdown).
#
#   bash ops/lab/device/findings.sh <evidence-dir|result.json> ...
#
# One row per (register id, check family): the verdicts counted across every run given
# ("reproduced 3 of 3"), the register's prediction, and the latest observation. Controls are
# listed separately. Repeated checks are named "<check>#<n>"; the family drops the "#<n>".
set -u
[ "$#" -ge 1 ] || {
  sed -n '2,8p' "$0" >&2
  exit 2
}
files=()
for a in "$@"; do
  if [ -d "$a" ]; then files+=("$a/result.json"); else files+=("$a"); fi
done
node - "${files[@]}" << 'NODE'
const fs = require("fs");
const rows = new Map();
for (const f of process.argv.slice(2)) {
  let j;
  try { j = JSON.parse(fs.readFileSync(f, "utf8")); } catch { console.error(`skip ${f}`); continue; }
  for (const c of j.checks || []) {
    const fam = c.check.replace(/#\d+/, "");
    const key = `${c.register_id}\u0000${fam}`;
    const r = rows.get(key) || { id: c.register_id, fam, predicted: c.predicted, v: {}, last: "", ev: "" };
    r.v[c.verdict] = (r.v[c.verdict] || 0) + 1;
    r.last = c.observed;
    r.ev = `${j.protocol}/${c.evidence}`;
    rows.set(key, r);
  }
}
const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const fmt = (r) => {
  const n = Object.values(r.v).reduce((a, b) => a + b, 0);
  return Object.entries(r.v).map(([k, x]) => `${k.replace("_", " ")} ${x} of ${n}`).join(", ");
};
const all = [...rows.values()];
for (const [title, list] of [
  ["Register checks", all.filter((r) => r.id !== "control")],
  ["Controls (the lab checking itself)", all.filter((r) => r.id === "control")],
]) {
  if (!list.length) continue;
  console.log(`\n**${title}**\n`);
  console.log("| Register id | Check | Predicted | Verdict (n of runs) | Observed (latest run) | Evidence |");
  console.log("| --- | --- | --- | --- | --- | --- |");
  for (const r of list) console.log(`| ${esc(r.id)} | ${esc(r.fam)} | ${esc(r.predicted)} | ${fmt(r)} | ${esc(r.last)} | \`${esc(r.ev)}\` |`);
}
NODE
