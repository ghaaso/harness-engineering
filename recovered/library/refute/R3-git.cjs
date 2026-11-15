// R3 refuter, read-only: re-derive repeat gaps and fix-footprint churn on main by a second method.
// (a) per-file hazard, not only "first touch of any file"; (b) survival of the fix's own added lines
// (what a regex_in_span / control-pair probe actually keys on) at +7d, +30d and at main's head.
// Usage: node R3-git.cjs <repo>
const { execFileSync } = require('child_process');
const repo = process.argv[2];
const git = (...a) => execFileSync('git', a, { cwd: repo, maxBuffer: 1 << 28 }).toString();
const raw = git('log', 'main', '--no-merges', '--reverse', '--name-only', '--format=@@%H\x1f%ct\x1f%at\x1f%s');
const C = [];
let cur = null;
for (const line of raw.split('\n')) {
  if (line.startsWith('@@')) { const [h, ct, at, s] = line.slice(2).split('\x1f'); cur = { h, ct: +ct, at: +at, s, files: [] }; C.push(cur); }
  else if (line.trim() && cur) cur.files.push(line.trim());
}
const isCode = (p) => !(p.startsWith('docs/') || /\.md$/i.test(p) || /lock\.json$/.test(p) || /\.lock$/.test(p));
const fixes = C.map((c, i) => ({ c, i })).filter(({ c }) => /^(@ )?fix/i.test(c.s));
// first-parent main snapshots by time, to find "main as of t"
const fp = git('log', 'main', '--first-parent', '--format=%H %ct').trim().split('\n').map((l) => { const [h, t] = l.split(' '); return { h, t: +t }; }).reverse();
const mainAt = (t) => { let best = null; for (const s of fp) if (s.t <= t) best = s.h; return best; };
const headT = fp[fp.length - 1].t;
const out = { fixCommits: fixes.length, perFix: [] };
const firstAny = [], fileHaz = { h1: 0, d1: 0, d7: 0, d30: 0, n: 0 };
const surv = { d7: [], d30: [], head: [] };
for (const { c, i } of fixes) {
  const fpFiles = c.files.filter(isCode);
  if (!fpFiles.length) continue;
  // per-file first later touch (author time, as D2)
  let minD = null;
  for (const f of fpFiles) {
    fileHaz.n++;
    let d = null;
    for (let j = i + 1; j < C.length; j++) if (C[j].files.includes(f)) { d = (C[j].at - c.at) / 86400; break; }
    if (d !== null) { if (d <= 1 / 24) fileHaz.h1++; if (d <= 1) fileHaz.d1++; if (d <= 7) fileHaz.d7++; if (d <= 30) fileHaz.d30++; if (minD === null || d < minD) minD = d; }
  }
  firstAny.push(minD === null ? Infinity : minD);
  // added lines of the fix (code files only), substantive (>= 12 non-space chars)
  const diff = git('show', '-U0', '--format=', c.h, '--', ...fpFiles);
  const added = new Map(); let file = null;
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) { file = l.startsWith('+++ b/') ? l.slice(6) : null; continue; }
    if (file && l.startsWith('+') && l.replace(/\s/g, '').length >= 12) { if (!added.has(file)) added.set(file, []); added.get(file).push(l.slice(1).trim()); }
  }
  const survAt = (sha) => {
    if (!sha) return null; let tot = 0, ok = 0;
    for (const [f, lines] of added) {
      let body = ''; try { body = git('show', sha + ':' + f); } catch { body = ''; }
      const set = new Set(body.split('\n').map((x) => x.trim()));
      for (const l of lines) { tot++; if (set.has(l)) ok++; }
    }
    return tot ? ok / tot : null;
  };
  const s7 = c.ct + 7 * 86400 <= headT ? survAt(mainAt(c.ct + 7 * 86400)) : null;
  const s30 = c.ct + 30 * 86400 <= headT ? survAt(mainAt(c.ct + 30 * 86400)) : null;
  const sh = survAt('main');
  if (s7 !== null) surv.d7.push(s7); if (s30 !== null) surv.d30.push(s30); if (sh !== null) surv.head.push(sh);
  out.perFix.push({ h: c.h.slice(0, 7), s: c.s.slice(0, 60), files: fpFiles.length, firstTouchDays: minD === null ? null : +minD.toFixed(2), surv7: s7 === null ? null : +s7.toFixed(2), surv30: s30 === null ? null : +s30.toFixed(2), survHead: sh === null ? null : +sh.toFixed(2) });
}
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? +b[Math.floor((b.length - 1) / 2)].toFixed(2) : null; };
const fin = firstAny.filter(Number.isFinite);
out.firstTouchAnyFile = { n: firstAny.length, never: firstAny.length - fin.length, medianDays: med(firstAny), within1d: firstAny.filter((d) => d <= 1).length, within7d: firstAny.filter((d) => d <= 7).length, within30d: firstAny.filter((d) => d <= 30).length };
out.perFileHazard = { files: fileHaz.n, within1h: fileHaz.h1, within1d: fileHaz.d1, within7d: fileHaz.d7, within30d: fileHaz.d30 };
out.addedLineSurvival = { n7: surv.d7.length, median7: med(surv.d7), n30: surv.d30.length, median30: med(surv.d30), nHead: surv.head.length, medianHead: med(surv.head), headAtLeastHalf: surv.head.filter((x) => x >= 0.5).length };
// repeat pairs named by D2/D5 (author dates)
const pairs = [['dbb3661', 'd440855', 'expo-audio stop()'], ['2f09cec', 'f29f62f', 'NoReferencedTableError'], ['75b51f9', '981ae08', 'mypy re-export'], ['789d522', '0a3b38e', 'press-race guard'], ['b7a5b98', '6928828', 'SDK-52 pin drift'], ['a6f9048', '6928828', 'Sentry gradle plugin (ex8)']];
out.pairs = pairs.map(([a, b, n]) => { const ta = +git('show', '-s', '--format=%at', a).trim(); const tb = +git('show', '-s', '--format=%at', b).trim(); return { n, gapDays: +((tb - ta) / 86400).toFixed(2), gapHours: +((tb - ta) / 3600).toFixed(1) }; });
out.window = { firstMain: new Date(C[0].at * 1000).toISOString().slice(0, 10), lastMain: new Date(C[C.length - 1].at * 1000).toISOString().slice(0, 10), days: +((C[C.length - 1].at - C[0].at) / 86400).toFixed(1) };
console.log(JSON.stringify(out, null, 1));
