// Read-only: how soon does an entry's footprint change after its fix lands?
// Footprint proxy = the code files the fix commit touched (no lockfiles, no docs).
// Usage: node D2-staleness.js <repo>
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const repo = process.argv[2];
const sh = (c) => execSync(c, { cwd: repo, maxBuffer: 1 << 28 }).toString();
const raw = sh('git log main --no-merges --reverse --name-only --format=@@%h%x1f%at%x1f%s');
const commits = [];
let cur = null;
for (const line of raw.split('\n')) {
  if (line.startsWith('@@')) { const [h, t, s] = line.slice(2).split('\x1f'); cur = { h, t: +t, s, files: [] }; commits.push(cur); }
  else if (line.trim() && cur) cur.files.push(line.trim());
}
const isCode = (p) => !(p.startsWith('docs/') || /\.md$/i.test(p) || /lock\.json$/.test(p));
const atHead = new Set(sh('git ls-tree -r --name-only main').split(/\r?\n/).map((s) => s.trim()));
const end = commits[commits.length - 1].t;
const fixes = commits.map((c, i) => ({ c, i })).filter(({ c }) => /^(@ )?fix/i.test(c.s));
const gaps = [], within = { d1: 0, d7: 0, d30: 0, never: 0 }, commitsUntil = [];
let filesGone = 0, filesTotal = 0;
for (const { c, i } of fixes) {
  const fp = new Set(c.files.filter(isCode));
  if (!fp.size) continue;
  for (const f of fp) { filesTotal++; if (!atHead.has(f)) filesGone++; }
  let hit = null, n = 0;
  for (let j = i + 1; j < commits.length; j++) { n++; if (commits[j].files.some((f) => fp.has(f))) { hit = commits[j]; break; } }
  if (!hit) { within.never++; continue; }
  const d = (hit.t - c.t) / 86400;
  gaps.push(d); commitsUntil.push(n);
  if (d <= 1) within.d1++; if (d <= 7) within.d7++; if (d <= 30) within.d30++;
}
gaps.sort((a, b) => a - b); commitsUntil.sort((a, b) => a - b);
const q = (a, p) => a.length ? +a[Math.floor(p * (a.length - 1))].toFixed(2) : null;
// How many later commits touch each fix footprint over the rest of history (re-verification events).
let touches = [];
for (const { c, i } of fixes) {
  const fp = new Set(c.files.filter(isCode)); if (!fp.size) continue;
  let k = 0; for (let j = i + 1; j < commits.length; j++) if (commits[j].files.some((f) => fp.has(f))) k++;
  touches.push(k);
}
touches.sort((a, b) => a - b);
console.log(JSON.stringify({
  fixCommits: fixes.length, withCodeFootprint: gaps.length + within.never,
  footprintChangedWithin: within, medianDaysToFirstChange: q(gaps, 0.5), p25: q(gaps, 0.25), p75: q(gaps, 0.75),
  medianCommitsToFirstChange: q(commitsUntil, 0.5),
  laterTouchesPerFootprint: { median: q(touches, 0.5), p75: q(touches, 0.75), max: touches[touches.length - 1] },
  footprintFilesNoLongerAtHead: filesGone + ' of ' + filesTotal,
  historyDays: +((end - commits[0].t) / 86400).toFixed(1),
}, null, 1));
