// R10: file churn on FixFlow main, by my own method (per file touch, not per footprint).
// For every (commit, code file) on main (no merges), the time until the next main commit touching that file.
// Reported for fix commits and for all commits, as the share still unchanged after a gap g (censored at the
// last main commit: a file never touched again counts as unchanged at every g within the remaining history).
// Read-only. Usage: node r10-churn.cjs <repo>
const { execSync } = require('child_process');
const repo = process.argv[2];
const raw = execSync('git log main --no-merges --reverse --name-only --format=@@%at%x09%s', { cwd: repo, maxBuffer: 1 << 28 }).toString();
const commits = []; let cur = null;
for (const line of raw.split('\n')) {
  if (line.startsWith('@@')) { const [t, s] = line.slice(2).split('\t'); cur = { t: +t, s, files: [] }; commits.push(cur); }
  else if (line.trim() && cur) cur.files.push(line.trim());
}
const isCode = p => !(p.startsWith('docs/') || /\.md$/i.test(p) || /lock\.json$/i.test(p));
const end = commits[commits.length - 1].t;
const touches = new Map(); // file -> sorted times
for (const c of commits) for (const f of c.files) if (isCode(f)) { if (!touches.has(f)) touches.set(f, []); touches.get(f).push(c.t); }
function rows(filter) {
  const out = [];
  for (const c of commits) {
    if (!filter(c)) continue;
    const fs = c.files.filter(isCode);
    // per-file next touch
    const per = fs.map(f => { const ts = touches.get(f); const nx = ts.find(t => t > c.t); return { gap: nx ? (nx - c.t) / 3600 : null, left: (end - c.t) / 3600 }; });
    // per-footprint: earliest next touch of any file
    const any = per.filter(p => p.gap !== null).map(p => p.gap);
    out.push({ per, fp: { gap: any.length ? Math.min(...any) : null, left: (end - c.t) / 3600 } });
  }
  return out;
}
function unchangedShare(items, g) { // among items with at least g hours of history left
  const elig = items.filter(x => x.left >= g); if (!elig.length) return null;
  const unch = elig.filter(x => x.gap === null || x.gap > g).length; return { share: +(100 * unch / elig.length).toFixed(1), n: elig.length };
}
const isFix = c => /^(@ )?fix/i.test(c.s);
for (const [name, filt] of [['fix commits', isFix], ['all commits', () => true]]) {
  const R = rows(filt);
  const files = R.flatMap(r => r.per), fps = R.map(r => r.fp).filter((x, i) => R[i].per.length);
  console.log(`== ${name}: ${R.length} commits, ${files.length} (commit, file) pairs, ${fps.length} footprints`);
  for (const g of [1.1, 24, 93, 24 * 7, 24 * 30]) {
    console.log(`  gap ${String(g).padStart(5)} h: per file unchanged ${JSON.stringify(unchangedShare(files, g))}; per footprint (any file) unchanged ${JSON.stringify(unchangedShare(fps, g))}`);
  }
  const gaps = fps.map(x => x.gap === null ? Infinity : x.gap).sort((a, b) => a - b);
  const changed = gaps.filter(Number.isFinite);
  console.log(`  footprint median time to first change: over all ${(gaps[Math.floor((gaps.length - 1) / 2)] / 24).toFixed(2)} d; over the ${changed.length} that changed ${(changed[Math.floor((changed.length - 1) / 2)] / 24).toFixed(2)} d`);
}
