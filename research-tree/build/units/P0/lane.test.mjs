// Tests of the stale-hold rule of research-tree/tools/lane.mjs (unit P0, 2026-11-19; check/C-capacity.md row 9).
// Run: node research-tree/build/units/P0/lane.test.mjs [--lane <lane.mjs>]   (default: this repository's copy)
// The lane keeps its slots beside the script (../lane), so the script under test is copied into a temporary folder
// and gets a lane of its own; the real lane is not touched. A slot is held by a made-up owner: a live process (this
// test) or a finished one, with a start time set back by the hold's age. The lane runs `node -e 0` with --wait-s 2.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const i = process.argv.indexOf('--lane');
const lane = i > 0 ? resolve(process.argv[i + 1]) : join(repo, 'research-tree', 'tools', 'lane.mjs');
let pass = 0, fail = 0;
const tmp = mkdtempSync(join(tmpdir(), 'p0-lane-test-'));
try {
  mkdirSync(join(tmp, 'tools')); mkdirSync(join(tmp, 'lane'));
  copyFileSync(lane, join(tmp, 'tools', 'lane.mjs'));
  writeFileSync(join(tmp, 'lane', 'capacity.txt'), '1');
  const dead = spawnSync(process.execPath, ['-e', '0']).pid;
  const cases = [
    ['a live hold of 21 min (above the old 20 min break, below the 1,500 s cap) is not broken', process.pid, 21 * 60, 75],
    ['a live hold of 1,499 s is not broken', process.pid, 1499, 75],
    ['a live hold of 10 s is not broken', process.pid, 10, 75],
    ['a live hold of 27 min (above the cap and the kill minute) is broken', process.pid, 27 * 60, 0],
    ['a hold whose owner has ended is broken at once', dead, 10, 0],
  ];
  for (const [name, pid, ageS, want] of cases) {
    rmSync(join(tmp, 'lane', 'slot-0'), { recursive: true, force: true });
    mkdirSync(join(tmp, 'lane', 'slot-0'));
    writeFileSync(join(tmp, 'lane', 'slot-0', 'owner.json'), JSON.stringify({ pid, label: 'p0-test-hold', t: new Date(Date.now() - ageS * 1000).toISOString() }));
    const r = spawnSync(process.execPath, [join(tmp, 'tools', 'lane.mjs'), '--label', 'p0-test', '--wait-s', '2', '--timeout-s', '30', '--', process.execPath, '-e', '0'], { encoding: 'utf8', timeout: 60000 });
    const ok = r.status === want;
    ok ? pass++ : fail++;
    console.log(`${ok ? 'pass' : 'FAIL'}  C9 ${name}${ok ? '' : `  (exit ${r.status}, wanted ${want})`}`);
  }
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
