// R8 refuter, read-only. Extract per-PR changed-line tokens and files from origin/main first-parent history.
// Own tokenizer: separates + and - lines, skips lockfiles anywhere (D6's SKIP only anchored package-lock.json at root),
// tags tokens as "symbol-ish" (has _ , internal capital, or ALL_CAPS) vs plain words.
// Usage: node r8-extract.cjs <repoDir> <out.json>
const { execSync } = require('child_process');
const fs = require('fs');
const [repo, out] = process.argv.slice(2);
const git = a => execSync('git -C "' + repo + '" ' + a, { encoding: 'utf8', maxBuffer: 1 << 28 });
const shas = git('rev-list --first-parent --reverse origin/main').trim().split('\n').slice(1);
const SKIPFILE = /(^|\/)(docs\/|evidence\/)|\.md$|(^|\/)package-lock\.json$|(^|\/)yarn\.lock$|\.lock$|pnpm-lock\.yaml$|\.svg$|\.snap$|\.png$|\.jpg$|\.ico$/;
const symbolish = t => /_/.test(t) || /[a-z][A-Z]/.test(t) || /^[A-Z][A-Z0-9_]{3,}$/.test(t);
const looksRandom = t => (t.match(/[0-9]/g) || []).length > 2 || (t.length >= 16 && !/_/.test(t) && (t.match(/[A-Z]/g) || []).length >= 5 && (t.match(/[A-Z][A-Z]/g) || []).length >= 1 && !/^[A-Z0-9_]+$/.test(t));
const prs = shas.map((s, idx) => {
  const subj = git('log -1 --format=%s ' + s).trim();
  const date = git('log -1 --format=%aI ' + s).trim();
  const commits = git('log --no-merges --format=%h%x09%s ' + s + '~1..' + s).trim().split('\n').filter(Boolean).map(l => { const [h, ...r] = l.split('\t'); return { h: h.slice(0, 7), s: r.join('\t') }; });
  const d = git('diff -U0 --no-color --no-ext-diff --no-textconv --no-renames ' + s + '~1 ' + s);
  const plus = new Set(), minus = new Set(), files = new Set(); let file = '', skip = false;
  for (const line of d.split('\n')) {
    if (line.startsWith('diff --git')) { const m = line.match(/ b\/(.*)$/); file = m ? m[1] : ''; skip = SKIPFILE.test(file); if (!skip) files.add(file); continue; }
    if (line.startsWith('+++ ') || line.startsWith('--- ') || line.startsWith('@@')) continue;
    if (skip) continue;
    if (line[0] !== '+' && line[0] !== '-') continue;
    const set = line[0] === '+' ? plus : minus;
    for (const t of line.slice(1).match(/[A-Za-z_][A-Za-z0-9_]*/g) || []) if (t.length >= 4 && t.length <= 40 && !looksRandom(t)) set.add(t);
  }
  const isFix = /^(@ )?fix(\(|:|!|\b)/i.test(subj) || commits.some(c => /^(@ )?fix(\(|:|!|\b)/i.test(c.s));
  return { i: idx, s: s.slice(0, 7), date, subj, commits: commits.map(c => c.h), isFix, files: [...files], plus: [...plus], minus: [...minus] };
});
fs.writeFileSync(out, JSON.stringify({ symbolishRule: 'has _ or internal capital or ALL_CAPS', prs }, null, 0));
console.log('PRs', prs.length, 'fix PRs', prs.filter(p => p.isFix).length);
