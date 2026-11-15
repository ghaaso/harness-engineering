// R4 refuter, own method: for each fix commit on main, list the changed files
// (excluding docs and tests) and mark which Opus-reserved area each code file is in.
// Two definitions: KS L444 (outbox, migrations, auth, PIN, money, job lifecycle)
// and the ship plan Routing (adds drain tooling, native patches, location-privacy bounds).
// Test files and docs are reported separately: a fix that only touched a reserved
// area's tests is flagged so a reader can judge it.
const { execFileSync } = require('child_process');
const repo = process.argv[2];
const raw = execFileSync('git', ['log', 'main', '--no-merges', '--format=%x01%H%x02%s', '--name-only', '-M'], { cwd: repo, maxBuffer: 256 * 1024 * 1024 }).toString();
const commits = raw.split('\x01').filter(Boolean).map((b) => {
  const lines = b.split('\n');
  const [sha, subj] = lines[0].split('\x02');
  return { sha, subj, files: lines.slice(1).map((s) => s.trim()).filter(Boolean) };
});
const isFix = (c) => /^(@ )?fix/i.test(c.subj);
const isDoc = (f) => /^docs\//.test(f) || /\.md$/i.test(f);
const isTest = (f) => /(^|\/)tests?\//.test(f) || /\.test\.(ts|tsx|js|jsx)$/.test(f) || /(^|\/)test_[^/]*\.py$/.test(f) || /__tests__/.test(f);
const KS = {
  migrations: (f) => /^backend\/alembic\/versions\//.test(f),
  auth_pin: (f) => /backend\/app\/features\/identity\/(?!tests)/.test(f) || /backend\/app\/core\/security\.py$/.test(f) || /technician-app\/src\/(features\/auth|lib\/auth)/.test(f) || /src\/features\/auth\//.test(f),
  outbox: (f) => /technician-app\/src\/lib\/(outbox|outboxSync|jobsReconcile|syncClassification)\.ts$/.test(f) || /features\/attendance\/(queue|sync|presenceQueue|presenceSync)\.ts$/.test(f) || /features\/media\/pendingMedia\.ts$/.test(f) || /dispatch/i.test(f),
  money: (f) => /(ledger|chain\.py|payment|advance|payroll|bill|completion)/i.test(f) && !/\.md$/.test(f),
  job_lifecycle: (f) => /backend\/app\/features\/jobs\/(service|repository)\.py$/.test(f) || /(completionPrefill|wizardState)\.ts$/.test(f),
};
const SHIP_EXTRA = {
  native: (f) => /technician-app\/(patches|android|plugins)\//.test(f) || /technician-app\/app\.json$/.test(f),
  location: (f) => /(pingTracker|travelTracker|geofence)/i.test(f),
};
function areas(files, defs) {
  const hit = new Set();
  for (const f of files) for (const [k, fn] of Object.entries(defs)) if (fn(f)) hit.add(k);
  return [...hit];
}
const fixes = commits.filter(isFix);
let ksCode = 0, ksAny = 0, shipCode = 0, shipAny = 0;
const rows = [];
for (const c of fixes) {
  const code = c.files.filter((f) => !isDoc(f) && !isTest(f));
  const all = c.files.filter((f) => !isDoc(f));
  const aKsCode = areas(code, KS), aKsAll = areas(all, KS);
  const aShipCode = areas(code, { ...KS, ...SHIP_EXTRA }), aShipAll = areas(all, { ...KS, ...SHIP_EXTRA });
  if (aKsCode.length) ksCode++;
  if (aKsAll.length) ksAny++;
  if (aShipCode.length) shipCode++;
  if (aShipAll.length) shipAny++;
  rows.push({ sha: c.sha.slice(0, 7), subj: c.subj.slice(0, 78), ksCode: aKsCode.join(','), shipCode: aShipCode.join(','), testOnly: aShipAll.length && !aShipCode.length ? 'test/doc-only' : '', nCode: code.length });
}
console.log(`fix commits on main (no merges): ${fixes.length}`);
console.log(`KS L444 areas, non-test code files: ${ksCode} (${(100 * ksCode / fixes.length).toFixed(1)} %); incl. tests: ${ksAny}`);
console.log(`Ship-plan Routing areas, non-test code: ${shipCode} (${(100 * shipCode / fixes.length).toFixed(1)} %); incl. tests: ${shipAny}`);
for (const r of rows) console.log(r.sha, (r.ksCode || '-').padEnd(28), (r.shipCode || '-').padEnd(34), r.testOnly.padEnd(14), r.subj);
