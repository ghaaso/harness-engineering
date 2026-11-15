// Read-only: classify main-branch commits by whether they touch the areas the
// ship plan's Routing reserves to Opus. Approximate path patterns, stated below.
const { execFileSync } = require('child_process');
const repo = process.argv[2];
const out = execFileSync(
  'git',
  ['log', 'main', '--format=@@%H|%s|%(trailers:key=Co-Authored-By,valueonly,separator=;)', '--name-only'],
  { cwd: repo, maxBuffer: 64 * 1024 * 1024 }
).toString();
const reserved = {
  migrations: /^backend\/alembic\/versions\//,
  auth_pin_jwt: /(features\/identity\/|core\/security\.py|\/auth\/|throttle)/,
  outbox: /(lib\/outbox|outboxSync|jobsReconcile|syncClassification|attendance\/(queue|sync|presenceQueue|presenceSync)\.ts|pendingMedia|dispatch)/i,
  job_lifecycle: /(backend\/app\/features\/jobs\/(service|repository)\.py|completionPrefill|wizardState)/,
  money: /(ledger|chain|payment|advance|payroll|money|bill)/i,
  native: /(technician-app\/(patches|android|plugins)\/)/,
  location_privacy: /(pingTracker|travelTracker|geofence)/i,
};
const commits = out.split('@@').filter(Boolean).map((blk) => {
  const lines = blk.split('\n').filter((l) => l.trim());
  const [sha, subj, trailers] = lines[0].split('|');
  return { sha, subj, trailers: trailers || '', files: lines.slice(1) };
});
function tier(t) {
  if (/Fable/i.test(t)) return 'Fable';
  if (/Opus/i.test(t)) return 'Opus';
  if (/Sonnet/i.test(t)) return 'Sonnet';
  if (/Haiku/i.test(t)) return 'Haiku';
  return 'none';
}
function classify(c) {
  const hits = new Set();
  for (const f of c.files) for (const [k, re] of Object.entries(reserved)) if (re.test(f)) hits.add(k);
  return [...hits];
}
const isFix = (c) => /^fix/i.test(c.subj);
const code = (c) => c.files.some((f) => /\.(py|ts|tsx|js|jsx|mjs|json)$/.test(f) && !/^docs\//.test(f));
const groups = { fix: commits.filter(isFix), nonfixCode: commits.filter((c) => !isFix(c) && code(c)) };
for (const [g, list] of Object.entries(groups)) {
  const res = list.filter((c) => classify(c).length > 0);
  const byArea = {};
  for (const c of res) for (const a of classify(c)) byArea[a] = (byArea[a] || 0) + 1;
  const tiers = {};
  for (const c of list) tiers[tier(c.trailers)] = (tiers[tier(c.trailers)] || 0) + 1;
  console.log(`${g}: ${list.length} commits; touching a reserved area: ${res.length} (${(100 * res.length / list.length).toFixed(1)} %)`);
  console.log('  by area:', JSON.stringify(byArea));
  console.log('  tiers:', JSON.stringify(tiers));
}
// list fix commits with areas
for (const c of groups.fix) console.log(c.sha.slice(0, 7), tier(c.trailers).padEnd(6), (classify(c).join(',') || '-').padEnd(40), c.subj.slice(0, 80));
