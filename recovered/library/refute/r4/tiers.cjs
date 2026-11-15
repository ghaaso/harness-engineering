// R4 refuter, own method: parse raw commit messages (not git's trailer parser).
// For each commit: every model name mentioned anywhere in the message, and
// the Co-Authored-By lines verbatim. Read-only.
const { execFileSync } = require('child_process');
const repo = process.argv[2];
const ref = process.argv[3] || 'main';
const raw = execFileSync('git', ['log', ...(ref === '--all' ? ['--all'] : [ref]), '--format=%x01%H%x02%ad%x02%P%x02%B', '--date=short'], { cwd: repo, maxBuffer: 256 * 1024 * 1024 }).toString();
const commits = raw.split('\x01').filter(Boolean).map((b) => {
  const [sha, date, parents, body] = b.split('\x02');
  const subj = body.split('\n')[0];
  const coauth = body.split('\n').filter((l) => /^co-authored-by:/i.test(l.trim())).map((l) => l.trim());
  const models = new Set();
  for (const m of body.matchAll(/\b(Fable|Opus|Sonnet|Haiku|Mythos)\b(?:\s*[0-9.]+)?/gi)) models.add(m[0].replace(/\s+/g, ' '));
  return { sha, date, merge: parents.trim().split(' ').length > 1, subj, coauth, models: [...models] };
});
const isFix = (c) => /^(@ )?fix/i.test(c.subj);
const tierOf = (lines) => {
  const s = lines.join(' ');
  const t = [];
  if (/Fable/i.test(s)) t.push('Fable');
  if (/Opus/i.test(s)) t.push('Opus');
  if (/Sonnet/i.test(s)) t.push('Sonnet');
  if (/Haiku/i.test(s)) t.push('Haiku');
  return t.length ? t.join('+') : 'none';
};
const tally = (list, f) => list.reduce((a, c) => ((a[f(c)] = (a[f(c)] || 0) + 1), a), {});
const fixes = commits.filter(isFix);
console.log(`ref=${ref} commits=${commits.length} nonmerge=${commits.filter((c) => !c.merge).length} fix(subject ^fix or ^@ fix)=${fixes.length}`);
console.log('fix tiers by Co-Authored-By lines:', JSON.stringify(tally(fixes, (c) => tierOf(c.coauth))));
console.log('fix tiers by any mention in body:', JSON.stringify(tally(fixes, (c) => tierOf(c.models))));
console.log('all commits tiers by coauthor:', JSON.stringify(tally(commits, (c) => tierOf(c.coauth))));
const anySonnet = commits.filter((c) => c.models.some((m) => /sonnet/i.test(m)));
console.log('commits mentioning Sonnet anywhere in message:', anySonnet.length);
for (const c of anySonnet.slice(0, 40)) console.log('  ', c.sha.slice(0, 7), c.date, c.subj.slice(0, 70), '|', c.models.join(','), '|', c.coauth.join(' ; ').slice(0, 120));
// distinct coauthor lines
const lines = {};
for (const c of commits) for (const l of c.coauth) lines[l] = (lines[l] || 0) + 1;
console.log('distinct Co-Authored-By lines:');
for (const [l, n] of Object.entries(lines).sort((a, b) => b[1] - a[1])) console.log('  ', n, l);
// fix commit dates and tiers
console.log('fix commits:');
for (const c of fixes) console.log('  ', c.sha.slice(0, 7), c.date, tierOf(c.coauth).padEnd(12), c.subj.slice(0, 80));
