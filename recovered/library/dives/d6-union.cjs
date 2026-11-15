// D6, read-only. How does the union warning rate of an identifier-keyed diff trigger grow
// with the number of entries, when every handle passes the design's own selectivity gate
// (fires on at most 5 % of first-parent PRs)? Entries are synthesised from this repo's fix
// PRs: each takes the 3 rarest identifiers on its own -U0 changed lines that recur in
// 1..7 other PRs (a handle that never recurs can never fire, true or false).
// Usage: node d6-union.cjs <repoDir>
const { execSync } = require('child_process');
const repo = process.argv[2];
const git = a => execSync('git -C "' + repo + '" ' + a, { encoding: 'utf8', maxBuffer: 1 << 28 });
const shas = git('rev-list --first-parent --reverse origin/main').trim().split('\n').slice(1); // drop root
const SKIP = /^(docs\/|.*\.md$|.*evidence\/|.*\.lock$|package-lock\.json$|.*\.svg$|.*\.snap$)/;
const prs = shas.map(s => {
  const subj = git('log -1 --format=%s ' + s).trim();
  const d = git('diff -U0 --no-color --no-ext-diff --no-textconv --no-renames ' + s + '~1 ' + s);
  const toks = new Set(); let file = '';
  for (const line of d.split('\n')) {
    if (line.startsWith('+++ ') || line.startsWith('--- ')) { const m = line.match(/^[+-]{3} [ab]\/(.*)$/); if (m) file = m[1]; continue; }
    if (SKIP.test(file)) continue;
    if ((line[0] === '+' || line[0] === '-') && !line.startsWith('+++') && !line.startsWith('---')) {
      for (const t of line.slice(1).match(/[A-Za-z_][A-Za-z0-9_]{3,}/g) || []) if (t.length <= 40 && (t.match(/[0-9]/g) || []).length <= 4) toks.add(t); // drop hashes and blobs
    }
  }
  const subs = git('log --no-merges --format=%s ' + s + '~1..' + s).split('\n');
  return { s, subj, toks, fix: subs.some(x => /^fix\b|^fix\(/i.test(x.trim())) };
});
const N = prs.length, gate = Math.floor(0.05 * N);
const df = new Map(); for (const p of prs) for (const t of p.toks) df.set(t, (df.get(t) || 0) + 1);
const entries = [];
prs.forEach((p, i) => {
  if (!p.fix) return;
  const cand = [...p.toks].filter(t => { const o = df.get(t) - 1; return o >= 1 && o <= gate; })
    .sort((a, b) => (df.get(a) - df.get(b)) || (b.length - a.length));
  if (cand.length) entries.push({ i, h: cand.slice(0, +(process.env.K || 3)) });
});
function union(k) {
  const es = entries.slice(0, k); let fired = 0;
  prs.forEach((p, i) => { if (es.some(e => e.i !== i && e.h.some(t => p.toks.has(t)))) fired++; });
  return fired;
}
const perEntry = entries.map(e => prs.filter((p, i) => i !== e.i && e.h.some(t => p.toks.has(t))).length);
const mean = perEntry.reduce((a, b) => a + b, 0) / perEntry.length;
const out = { prs: N, gateMaxOtherPRs: gate, fixPRs: prs.filter(p => p.fix).length, entries: entries.length,
  meanPerEntryFireRate_pct: Math.round(1000 * mean / N) / 10, union: {} };
for (const k of [1, 3, 5, 10, 15, 20, 25, 30, 40, entries.length]) if (k <= entries.length) { const u = union(k); out.union[k] = u + '/' + N + ' = ' + Math.round(1000 * u / N) / 10 + '%'; }
// independence extrapolation from the mean per-entry rate
const p = mean / N; out.extrapolated_union_pct = {};
for (const k of [15, 50, 133]) out.extrapolated_union_pct[k] = Math.round(1000 * (1 - Math.pow(1 - p, k))) / 10;
out.sampleEntries = entries.slice(0, 6).map(e => prs[e.i].s.slice(0, 7) + ' ' + e.h.join(','));
console.log(JSON.stringify(out, null, 1));
// Known same-cause pairs (F2, KS-C10): does the entry built from the first PR fire on the second PR?
const pairs = [['75b51f9','981ae08'],['2f09cec','f29f62f'],['789d522','0a3b38e'],['b7a5b98','6928828'],['dbb3661','d440855']];
const prOf = new Map();
shas.forEach((s, i) => { for (const c of git('log --no-merges --format=%h ' + s + '~1..' + s).trim().split('\n')) if (c) prOf.set(c.slice(0, 7), i); });
const pr = pairs.map(([a, b]) => {
  const ia = prOf.get(a), ib = prOf.get(b); const e = entries.find(x => x.i === ia);
  return a + '->' + b + ' prA=' + ia + ' prB=' + ib + ' entry=' + (e ? e.h.join(',') : 'none') + ' fires=' + (e && ib !== undefined && ia !== ib ? e.h.some(t => prs[ib].toks.has(t)) : 'n/a');
});
console.log(JSON.stringify(pr, null, 1));
