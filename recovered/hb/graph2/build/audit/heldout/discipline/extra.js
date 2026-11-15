'use strict';
// Extra: answer-file mtime inside its logged run window; LadybugDB S2 draws differ from draw 0; prior file names.
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const plan = JSON.parse(fs.readFileSync(path.join(B, 'results/frozen/PLAN.json'), 'utf8'));
const runs = fs.readFileSync(path.join(B, 'results/heldout/runs.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const out = { window: [], draws: [] };
for (const e of [...plan.runs, ...plan.question_runs]) {
  const r = runs.find((x) => x.out === e.out.replace(/^results\//, ''));
  const m = fs.statSync(path.join(B, e.out)).mtimeMs; const s = Date.parse(r.at_start); const en = Date.parse(r.at_end);
  if (m < s - 2000 || m > en + 5000) out.window.push({ n: e.n, out: e.out, mtime: new Date(m).toISOString(), at_start: r.at_start, at_end: r.at_end });
}
out.window_outside = out.window.length;
const rd = (f) => new Map(zlib.gunzipSync(fs.readFileSync(path.join(B, f))).toString('utf8').split('\n').filter(Boolean).map(JSON.parse).map((a) => [a.id, JSON.stringify([a.items, a.ranked_sha])]));
for (const set of ['T1', 'T1x', 'T2', 'T3', 'T4']) {
  const d0 = rd('results/heldout/ladybug/s2/' + set + '.jsonl.gz');
  for (const k of [1, 2, 3, 4]) { const dk = rd('results/heldout/ladybug/s2-draw' + k + '/' + set + '.jsonl.gz'); let diff = 0; for (const [id, v] of d0) if (dk.get(id) !== v) diff++; out.draws.push({ set, draw: k, tasks: d0.size, differ_from_draw0: diff }); }
}
const pri = fs.readdirSync(path.join(B, 'arms/ladybug/priors'));
out.priors = pri.length; out.prior_name_samples = pri.slice(0, 5);
out.prior_names_with_draw = pri.filter((f) => /draw|-d[1-4]\b|_d[1-4]\b/.test(f)).length;
fs.writeFileSync(path.join(B, 'audit/heldout/discipline/extra.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
