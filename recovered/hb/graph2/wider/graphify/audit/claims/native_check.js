'use strict';
// Native form (G-5) check: how often graphify's keyword query "<name> <path>" starts or spends its
// default answer in another runtime than the seed; and native file recall recomputed (whole-path match).
const fs = require('fs'); const zlib = require('zlib'); const path = require('path');
const ROOT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2';
const B = ROOT + '/build'; const G = ROOT + '/wider/graphify';
const S = require(B + '/arms/common/score.js');
const readGz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const tasks = new Map(fs.readFileSync(B + '/tasks/tasks.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).map((t) => [t.id, t]));
const rt = (p) => (p.startsWith('technician-app/') ? 'mobile' : p.startsWith('backend/') ? 'backend' : 'web');
const refs = S.readRefs(B + '/sealed/references.jsonl');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rows = readGz(G + '/answers/heldout/native/query-text.T1.jsonl.gz');
let n = 0, otherShareSum = 0, majorityOther = 0; const byC = new Map(); const byCsame = new Map();
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); const k = s.length; return k % 2 ? s[(k - 1) / 2] : (s[k / 2 - 1] + s[k / 2]) / 2; };
const shares = [];
for (const r of rows) {
  const seed = tasks.get(r.id).seed.path; const sr = rt(seed);
  const srcs = [...r.text.matchAll(/^NODE .*?\[src=([^ \]]+)/gm)].map((m) => m[1]);
  const other = srcs.filter((p) => rt(p) !== sr).length; const share = srcs.length ? other / srcs.length : 0;
  shares.push(share); n++; if (share > 0.5) majorityOther++;
  const ref = refs.get(r.id); const files = ref.files;
  if (!files.length) continue;
  const hit = files.filter((f) => new RegExp('(^|[\\s\\[=\'"(])' + esc(f) + '($|[\\s\\]\'",):])', 'm').test(r.text)).length / files.length;
  const c = ref.cluster; if (!byC.has(c)) byC.set(c, []); byC.get(c).push(hit);
  if (share <= 0.5) { if (!byCsame.has(c)) byCsame.set(c, []); byCsame.get(c).push(hit); }
}
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const out = {
  t1_native_answers: n,
  median_share_of_node_lines_in_other_runtime: med(shares),
  answers_with_majority_of_node_lines_in_other_runtime: majorityOther,
  native_file_recall_per_commit_recomputed: mean([...byC.values()].map(mean)),
  commits: byC.size,
  native_file_recall_answers_mostly_in_seed_runtime: mean([...byCsame.values()].map(mean)), commits_mostly_same: byCsame.size,
};
fs.writeFileSync(path.join(__dirname, 'native_check.json'), JSON.stringify(out, null, 1));
console.log(out);
