'use strict';
// Put the cached snapshots in commit order along main's first-parent chain (read-only git).
// Output: data/chain.json = { main, fp_len, snapshots: [{sha, fp_index, gap_commits, time}], off_chain: [...] }
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const C = require('./conf');

const git = (...a) => execFileSync('git', ['-C', C.REPO, ...a], { maxBuffer: 1 << 28 }).toString();
const main = git('rev-parse', 'main').trim();
const fp = git('rev-list', '--first-parent', '--reverse', main).trim().split('\n');
const fpIdx = new Map(fp.map((s, i) => [s, i]));
const all = git('rev-list', '--reverse', main).trim().split('\n');
const allIdx = new Map(all.map((s, i) => [s, i]));
const snaps = fs.readdirSync(C.FACTS).filter((d) => fs.existsSync(path.join(C.FACTS, d, 'meta.json')));
const on = []; const off = [];
for (const s of snaps) {
  const meta = JSON.parse(fs.readFileSync(path.join(C.FACTS, s, 'meta.json'), 'utf8'));
  const rec = { sha: s, time: meta.commit_time, extractor_version: meta.extractor_version };
  if (fpIdx.has(s)) on.push({ ...rec, fp_index: fpIdx.get(s) });
  else {
    // where does it sit? the first first-parent commit that contains it (merge point), if any
    let merged = null;
    try {
      const desc = git('rev-list', '--first-parent', '--reverse', '--ancestry-path', s + '..' + main).trim().split('\n').filter(Boolean);
      merged = desc.length ? desc[0] : null;
    } catch (e) { merged = null; }
    off.push({ ...rec, in_main_history: allIdx.has(s), merged_at_fp_index: merged && fpIdx.has(merged) ? fpIdx.get(merged) : null });
  }
}
on.sort((a, b) => a.fp_index - b.fp_index);
for (let i = 0; i < on.length; i++) on[i].gap_commits = i === 0 ? null : on[i].fp_index - on[i - 1].fp_index;
const ev = new Set(on.map((x) => x.extractor_version));
const out = { main, fp_len: fp.length, n_snapshots: snaps.length, n_on_chain: on.length, n_off_chain: off.length, extractor_versions_on_chain: [...ev], snapshots: on, off_chain: off };
fs.mkdirSync(C.DATA, { recursive: true });
fs.writeFileSync(path.join(C.DATA, 'chain.json'), JSON.stringify(out, null, 1));
const gaps = on.slice(1).map((x) => x.gap_commits).sort((a, b) => a - b);
const hist = {}; for (const g of gaps) hist[g] = (hist[g] || 0) + 1;
console.log(JSON.stringify({ main, fp_len: fp.length, snaps: snaps.length, on: on.length, off: off.length, ev: [...ev], gaps_hist: hist, first: on[0] && on[0].sha, last: on[on.length - 1].sha, off_sample: off.slice(0, 5) }, null, 1));
