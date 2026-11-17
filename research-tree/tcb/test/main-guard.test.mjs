// main-guard: every script must still answer when it is started through a junction (or a symlink).
// Node gives the entry module's import.meta.url as its real path while process.argv[1] stays as typed;
// a script that compares the two lexically skips main() and exits 0 with nothing printed: it does
// nothing and reports success. See done/fix-U3.json (F1) and done/fix-U1.json (note-main-guard).
//
// The call used for every runMain script is one unknown flag, `--main-guard-probe`: lib.parseArgs
// refuses it with `usage` 66 before anything is read (CONTRACT section 1, exit table: 66 usage).
// guard-hook is a hook, not a runMain script: it is started with no arguments and an empty stdin,
// which it refuses with exit 2 and a `[guard-hook] deny <code>` line on stderr, deciding nothing.
//
// One junction for the whole file, made under ROOT/tmp and pointing at ROOT/tcb; removed afterwards
// (the link only, never its target). One child process at a time.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TCB = path.resolve(HERE, '..');
const ROOT = path.resolve(TCB, '..');
const TMP = path.join(ROOT, 'tmp');

const SCRIPTS = [
  'admit', 'audit', 'certify', 'check-queue', 'commit', 'compare', 'cost', 'fsck', 'gate', 'guard-hook',
  'handover', 'harvest', 'promote', 'protocol-freeze', 'render', 'replace', 'seed', 'selftest', 'snap',
  'status', 'stop', 'tms', 'watch', 'witness',
];

const PROBE_FLAG = '--main-guard-probe';

let dir = null;
let link = null;

before(() => {
  fs.mkdirSync(TMP, { recursive: true });
  dir = fs.mkdtempSync(path.join(TMP, 'mg-'));
  link = path.join(dir, 'tcb-link');
  fs.symlinkSync(TCB, link, 'junction');
});

after(() => {
  // the link only: rmdir removes a junction without touching its target; never a recursive remove
  if (link) {
    try { fs.rmdirSync(link); } catch { /* already gone */ }
  }
  if (dir) {
    let linkGone = true;
    try { fs.lstatSync(link); linkGone = false; } catch { /* gone */ }
    if (linkGone) {
      try { fs.rmdirSync(dir); } catch { /* not empty: leave it rather than recurse near a junction */ }
    }
  }
});

function run(scriptPath, name) {
  const args = name === 'guard-hook' ? [] : [PROBE_FLAG];
  const r = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: dir,
    input: '',
    encoding: 'utf8',
    timeout: 60000,
    windowsHide: true,
  });
  return { status: r.status, signal: r.signal, stdout: r.stdout || '', stderr: r.stderr || '', error: r.error };
}

// The machine-readable part of an answer: the one JSON line on stdout of a runMain script; for
// guard-hook the deny code on stderr.
function machine(name, r) {
  if (name === 'guard-hook') {
    const m = /\[guard-hook\] deny ([a-z0-9-]+)/.exec(r.stderr);
    return { deny: m ? m[1] : null };
  }
  const lines = r.stdout.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length !== 1) return { lines };
  try {
    return JSON.parse(lines[0]);
  } catch {
    return { unparseable: lines[0] };
  }
}

const silentZero = (r) => r.status === 0 && r.stdout.trim() === '' && r.stderr.trim() === '';

for (const name of SCRIPTS) {
  test(`${name}.mjs answers the same through a junction as through its real path`, () => {
    const realPath = path.join(TCB, `${name}.mjs`);
    const viaLink = path.join(link, `${name}.mjs`);
    assert.ok(fs.existsSync(realPath), `${realPath} exists`);

    const real = run(realPath, name);
    assert.equal(real.error, undefined, `real path: spawn error ${real.error}`);
    assert.ok(!silentZero(real), 'real path: silent exit 0');
    assert.notEqual(real.status, 0, 'real path: the probe call is refused, not run');
    const realMachine = machine(name, real);
    if (name === 'guard-hook') {
      assert.equal(real.status, 2);
      assert.ok(realMachine.deny, 'real path: a deny code on stderr');
    } else {
      assert.equal(real.status, 66, `real path: usage 66 (stderr: ${real.stderr.trim()})`);
      assert.equal(realMachine.code, 'usage');
    }

    const jn = run(viaLink, name);
    assert.equal(jn.error, undefined, `junction: spawn error ${jn.error}`);
    assert.ok(!silentZero(jn), 'junction: silent exit 0 (main() skipped: the script did nothing and reported success)');
    assert.equal(jn.status, real.status, 'junction: same exit code');
    assert.deepEqual(machine(name, jn), realMachine, 'junction: same machine-readable answer');
  });
}
