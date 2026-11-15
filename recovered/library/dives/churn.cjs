// Read-only analysis: of the reading that repeats a read made in an earlier window,
// how much found the file unchanged (no commit touching it) since that earlier read?
// Usage: node churn.cjs reads.jsonl git-main.txt git-all.txt
const fs = require('fs');
const [rf, gm, ga] = process.argv.slice(2);
const reads = fs.readFileSync(rf, 'utf8').trim().split('\n').map(JSON.parse).filter(r => r.ts);
function loadGit(f) {
  const m = new Map(); let t = 0;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (line.startsWith('C ')) { t = +line.slice(2) * 1000; continue; }
    const p = line.trim().toLowerCase(); if (!p) continue;
    if (!m.has(p)) m.set(p, []); m.get(p).push(t);
  }
  for (const v of m.values()) v.sort((a, b) => a - b);
  return m;
}
const G = { main: loadGit(gm), all: loadGit(ga) };
function changedBetween(g, p, t0, t1) { const v = g.get(p); if (!v) return false; for (const t of v) if (t > t0 && t <= t1) return true; return false; }
reads.sort((a, b) => a.ts - b.ts);
const lastByPathWin = new Map(); // path -> Map(window -> ts)
let tot = 0, inGit = 0, cross = 0, crossUnchMain = 0, crossUnchAll = 0, firstEver = 0, sameWinOnly = 0;
const gaps = [];
for (const r of reads) {
  tot += r.ch;
  const tracked = G.all.has(r.p) || G.main.has(r.p);
  if (tracked) inGit += r.ch;
  let m = lastByPathWin.get(r.p); if (!m) { m = new Map(); lastByPathWin.set(r.p, m); }
  // most recent read of this path in another window
  let prev = -1;
  for (const [w, t] of m) if (w !== r.w && t > prev) prev = t;
  if (prev < 0) { if (m.size === 0) firstEver += r.ch; else sameWinOnly += r.ch; }
  else if (tracked) {
    cross += r.ch;
    if (!changedBetween(G.main, r.p, prev, r.ts)) crossUnchMain += r.ch;
    if (!changedBetween(G.all, r.p, prev, r.ts)) crossUnchAll += r.ch;
    gaps.push((r.ts - prev) / 3.6e6);
  }
  m.set(r.w, r.ts);
}
gaps.sort((a, b) => a - b);
const pc = x => (100 * x / tot).toFixed(1) + '%';
console.log({ readChars: tot, trackedInGit: pc(inGit), firstReadEver: pc(firstEver), repeatOnlyInSameWindow: pc(sameWinOnly),
  crossWindowRepeatTracked: pc(cross), crossUnchangedMain: pc(crossUnchMain), crossUnchangedAnyBranch: pc(crossUnchAll),
  shareOfCrossUnchangedMain: (100 * crossUnchMain / cross).toFixed(1) + '%', shareOfCrossUnchangedAll: (100 * crossUnchAll / cross).toFixed(1) + '%',
  medianGapHours: gaps[Math.floor(gaps.length / 2)].toFixed(2), p25: gaps[Math.floor(gaps.length / 4)].toFixed(2), p75: gaps[Math.floor(3 * gaps.length / 4)].toFixed(2) });
// hot paths: top 72 by chars, their commit counts
const byP = new Map(); for (const r of reads) byP.set(r.p, (byP.get(r.p) || 0) + r.ch);
const top = [...byP.entries()].sort((a, b) => b[1] - a[1]);
let acc = 0, k = 0; for (const [, v] of top) { acc += v; k++; if (acc >= tot / 2) break; }
const hot = top.slice(0, k);
const hotTracked = hot.filter(([p]) => G.all.has(p));
const cm = hotTracked.map(([p]) => (G.main.get(p) || []).length).sort((a, b) => a - b);
const allPaths = [...G.main.keys()]; const cmAll = allPaths.map(p => G.main.get(p).length).sort((a, b) => a - b);
console.log('paths holding half the read chars:', k, 'of', top.length, '; tracked in git:', hotTracked.length,
  '; median main commits touching a hot tracked path:', cm[Math.floor(cm.length / 2)], '; median over all main-touched paths:', cmAll[Math.floor(cmAll.length / 2)]);
console.log('top 12:', hot.slice(0, 12).map(([p, v]) => p + ' ' + (100 * v / tot).toFixed(1) + '% c=' + ((G.main.get(p) || []).length)).join(' | '));
