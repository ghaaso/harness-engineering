// Read-only: hours from a fix commit's commit date to the merge that put it on main.
// An entry recorded by that fix is pending_anchor (candidate-only) until then.
// Usage: node D2-mergelag.js <repo>
const { execFileSync } = require('child_process');
const repo = process.argv[2];
const git = (...a) => execFileSync('git', a, { cwd: repo, maxBuffer: 1 << 28 }).toString();
const merges = git('log', 'main', '--first-parent', '--merges', '--format=%H %ct').trim().split('\n').map((l) => l.split(' '));
const lags = [], fixLags = [];
for (const [m, mt] of merges) {
  let list;
  try { list = git('log', '--no-merges', '--format=%H %ct %s', `${m}^1..${m}^2`).trim(); } catch { continue; }
  if (!list) continue;
  for (const l of list.split('\n')) {
    const [h, ct, ...s] = l.split(' ');
    const hrs = (+mt - +ct) / 3600;
    lags.push(hrs);
    if (/^(@ )?fix/i.test(s.join(' '))) fixLags.push(hrs);
  }
}
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return +b[Math.floor(p * (b.length - 1))].toFixed(1); };
console.log(JSON.stringify({ commitsViaMerge: lags.length, medianHours: q(lags, 0.5), p75: q(lags, 0.75), fixCommits: fixLags.length, fixMedianHours: q(fixLags, 0.5), fixP25: q(fixLags, 0.25), fixP75: q(fixLags, 0.75), fixP90: q(fixLags, 0.9) }, null, 1));
