// R2 refuter: re-derive the same-cause pair table from git (read-only).
// For each pair: gap, whether the first fix is in the second fix's ancestry (lane test),
// and what the second fix (or the next commits within 24 h) added as a standing check.
const { execFileSync } = require('child_process');
const repo = 'C:/Users/User/Documents/projects/EMS_workshop1';
const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8' }).trim();
const isAnc = (a, b) => { try { git('merge-base', '--is-ancestor', a, b); return true; } catch { return false; } };
const pairs = [
  ['mypy re-export', '75b51f9', '981ae08'],
  ['NoReferencedTableError', '2f09cec', 'f29f62f'],
  ['press race', '789d522', '0a3b38e'],
  ['SDK-52 pin drift', 'b7a5b98', '6928828'],
  ['expo-audio stop()', 'dbb3661', 'd440855'],
  ['Sentry plugin (ex8)', 'a6f9048', '6928828'],
  ['Expo peer dep missing (not in F2 list)', 'b7a5b98', 'aab2d91'],
];
const checkPath = /(^|\/)(tests?|__tests__)\/|\.test\.|test_|\.github\/|dependabot|ci\.yml|conftest/;
for (const [name, a, b] of pairs) {
  const ta = Number(git('show', '-s', '--format=%at', a));
  const tb = Number(git('show', '-s', '--format=%at', b));
  const gapH = ((tb - ta) / 3600).toFixed(1);
  const anc = isAnc(a, b + '^');
  const files = git('show', '--name-status', '--format=', b).split('\n').filter(Boolean);
  const checkFiles = files.filter(l => checkPath.test(l.split('\t').pop()));
  // commits on main within 24 h after b that add check files
  const after = git('log', 'main', '--no-merges', `--since=@${tb}`, `--until=@${tb + 86400}`, '--format=@@%h %ad %s', '--date=format:%m-%d %H:%M', '--name-only')
    .split('@@').map(s => s.trim()).filter(Boolean)
    .filter(s => s.split('\n').slice(1).some(f => /\.github\/workflows|\.github\/dependabot/.test(f)))
    .map(s => s.split('\n')[0]);
  console.log(`${name}: ${a} -> ${b}  gap ${gapH} h  firstFixInLane=${anc}`);
  console.log(`   second-fix check files: ${checkFiles.length ? checkFiles.join(', ') : 'none'}`);
  console.log(`   CI-config commits on main within 24 h after: ${after.length ? after.join(' | ') : 'none'}`);
}
// third presentations: later commits touching the same cause words, all refs
console.log('\nDependabot jest-expo bumps (SDK-tracked, not in the ignore list):');
console.log(git('log', '--all', '--format=%h %ad %s', '--date=iso', '--grep=jest-expo'));
