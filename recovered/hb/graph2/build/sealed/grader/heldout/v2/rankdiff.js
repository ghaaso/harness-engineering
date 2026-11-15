'use strict';
// v2 item g: the 8 (arm, task) pairs whose full ranked-list hash differs from the reference arm.
// Reads stored answers only (results/heldout, read-only). Writes rankdiff.json in this folder.
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const B = path.resolve(__dirname, '..', '..', '..', '..');
const rd = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const detail = JSON.parse(fs.readFileSync(path.join(B, 'tmp/runner/diff_detail.json'), 'utf8'));
const S = require(path.join(B, 'arms/common/score.js'));
const refs = S.readRefs(path.join(B, 'sealed/grader/heldout/refs_heldout.jsonl'));
const cache = new Map();
const load = (arm, role, set) => { const k = [arm, role, set].join('|'); if (!cache.has(k)) { const f = arm === 'reference' ? path.join(B, 'results/heldout/reference/crosscheck-95e990307da3b42b', set + '.jsonl.gz') : path.join(B, 'results/heldout', arm, role, set + '.jsonl.gz'); cache.set(k, new Map(rd(f).map((a) => [a.id, a]))); } return cache.get(k); };
const strip = (it) => { const o = { ...it }; delete o.score; return JSON.stringify(o); };
const out = [];
for (const d of detail) {
  const a = load(d.arm, 'primary', d.set).get(d.id); const r = load('reference', 'primary', d.set).get(d.id); const lb = load('ladybug', 'primary', d.set).get(d.id);
  const sameItemsExact = JSON.stringify(a.items) === JSON.stringify(r.items);
  const sameItemsNoScore = a.items.length === r.items.length && a.items.every((it, i) => strip(it) === strip(r.items[i]));
  let maxScoreDiff = 0; for (let i = 0; i < Math.min(a.items.length, r.items.length); i++) maxScoreDiff = Math.max(maxScoreDiff, Math.abs((a.items[i].score || 0) - (r.items[i].score || 0)));
  const sameBudgets = JSON.stringify(a.budgets) === JSON.stringify(r.budgets);
  const sameSeeds = JSON.stringify(a.seeds) === JSON.stringify(r.seeds) && a.seed_match === r.seed_match;
  const bsA = a.beyond_sample || []; const bsR = r.beyond_sample || [];
  const sameBeyondSample = JSON.stringify(bsA) === JSON.stringify(bsR);
  const sameBeyondSet = bsA.length === bsR.length && [...bsA].sort().join('|') === [...bsR].sort().join('|');
  let firstBeyondDiff = -1; for (let i = 0; i < Math.max(bsA.length, bsR.length); i++) if (bsA[i] !== bsR[i]) { firstBeyondDiff = i; break; }
  // ties among the shown items' scores (does the arm's order rest on equal scores anywhere?)
  const sc = r.items.map((it) => it.score); let tiesShown = 0; for (let i = 1; i < sc.length; i++) if (sc[i] === sc[i - 1]) tiesShown++;
  const lastScore = sc[sc.length - 1];
  const nearLast = r.items.filter((it) => Math.abs(it.score - lastScore) <= 1e-9).length;
  // scores of both arms on this task
  const ref = refs.get(d.id); const sa = S.scoreAnswer(a, ref); const sr = S.scoreAnswer(r, ref);
  const scoreKeys = Object.keys(sr).filter((k) => typeof sr[k] === 'number' || Array.isArray(sr[k]));
  const sameScores = scoreKeys.every((k) => JSON.stringify(sa[k]) === JSON.stringify(sr[k]));
  out.push({ arm: d.arm, set: d.set, id: d.id, differing_fields: d.diff, n_ranked_arm: a.n_ranked, n_ranked_reference: r.n_ranked, ladybug_ranked_sha_equals_reference: lb.ranked_sha === r.ranked_sha,
    shown_items_identical_including_scores: sameItemsExact, shown_items_identical_except_scores: sameItemsNoScore, max_abs_score_difference_shown_items: maxScoreDiff,
    budgets_identical: sameBudgets, seeds_identical: sameSeeds, beyond_sample_identical: sameBeyondSample, beyond_sample_same_set: sameBeyondSet, beyond_sample_length: bsR.length, first_beyond_sample_position_that_differs: firstBeyondDiff,
    shown_items: r.items.length, equal_adjacent_scores_in_shown_items: tiesShown, items_tied_with_last_shown_score: nearLast, all_score_fields_identical: sameScores });
}
fs.writeFileSync(path.join(__dirname, 'rankdiff.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
