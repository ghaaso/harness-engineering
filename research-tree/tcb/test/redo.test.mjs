// FX-REDO (FIX-fence section 5): a repeat call completes a ledger line that a death left missing,
// only at the exact post-state. The death is made through the library's fs seam (lib.setFsSeam,
// spec/lib.md T21b): a preload in the child process makes the write of one kind's ledger line throw
// after the row was written, so the row has moved and the line is missing. Every script runs as a
// child process against its own temporary run root. One file for the five scripts the fix touches
// (replace, stop, status, fsck; render's part is in render.test.mjs, beside its fixtures).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as lib from '../lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TCB = path.resolve(HERE, '..');
const TMP = path.resolve(HERE, '..', '..', 'tmp');
const NOW = '2026-11-17T10:00:00.000Z';
const T = 'f1-research';
const SID1 = '11111111-1111-4111-8111-111111111111';
const SID2 = '22222222-2222-4222-8222-222222222222';
const M0 = 'm_' + '0'.repeat(16);
const Z64 = '0'.repeat(64);

const row = (o) => ({
  task: T, field: 'f1', stage: 'research', role: 'child', steps: ['pack'], deps: [], question_ids: ['f1-a-01', 'f1-a-02'], e_task: 50000, tier: 'sonnet',
  state: 'active', step: 'none', epoch: 1, reason: 'first', session: null, restarts: 0, handovers: 0, parks: 0, limit: false, fails: [], attempts: [], commits: {}, updated_rev: 1, ...o,
});
const att = (e, o = {}) => ({ epoch: e, folder: `wt/${T}-e${e}`, stop: 'none', ...o });

// FX-CLAIM: an attempt's claim.json as the child hook makes it on a session's first tool call (or the fence,
// a tombstone), by strict create (0b), in the folder `start` made. On the merge every row is as a run leaves
// it: the claim comes before any bind (FIX-JOIN 2b rows 6-7), so a bound attempt holds its session's claim.
function claimAt(root, e, v) {
  const dir = path.join(root, 'wt', `${T}-e${e}`);
  fs.mkdirSync(dir, { recursive: true });
  lib.createExclusive(path.join(dir, 'claim.json'), v, { strict: true });
}

function makeRoot(rows, dirs) {
  const root = fs.mkdtempSync(path.join(TMP, 'redo-'));
  dirs.push(root);
  for (const d of ['tcb', 'run', 'run/stop-sample', 'store/objects', 'store/commits', 'store/status', 'plan/frozen', 'completeness', 'views', 'wt', 'transcripts']) {
    fs.mkdirSync(path.join(root, ...d.split('/')), { recursive: true });
  }
  for (const d of ['schemas', 'profiles', 'settings', 'agents', 'briefs']) {
    if (fs.existsSync(path.join(TCB, d))) fs.cpSync(path.join(TCB, d), path.join(root, 'tcb', d), { recursive: true });
  }
  const th = JSON.parse(fs.readFileSync(path.join(TCB, 'thresholds.json'), 'utf8'));
  th.params.stop_verify_ms = { ...th.params.stop_verify_ms, value: 0 }; // FX-CLOSE: the wall floor is stop.test.mjs's subject
  th.params.transcripts_root = { ...(th.params.transcripts_root ?? { unit: 'test', source: 'guess', gate: false }), value: path.join(root, 'transcripts') };
  fs.writeFileSync(path.join(root, 'tcb', 'thresholds.json'), JSON.stringify(th, null, 2));
  fs.writeFileSync(path.join(root, 'run', 'coord.json'), JSON.stringify({ schema_version: 1, ce: 1, started_at: '2026-11-17T09:00:00.000Z', tcb_commit: '0'.repeat(40) }));
  fs.writeFileSync(path.join(root, 'run', 'tasks.json'), JSON.stringify({ schema_version: 1, rev: 1, tasks: rows }));
  for (const r of rows) for (const a of r.attempts ?? []) if (a && a.session && a.bound_at) claimAt(root, a.epoch, lib.claimRecord(a.session));
  return root;
}

// The preload: imports the library the script imports (one module instance) and, when REDO_SEAM_KIND
// names a ledger kind, makes the write of that kind's line throw (the row was written before it).
function writeSeam(dir) {
  const f = path.join(dir, 'seam.mjs');
  fs.writeFileSync(f, [
    "import fs from 'node:fs';",
    `import * as lib from ${JSON.stringify(pathToFileURL(path.join(TCB, 'lib.mjs')).href)};`,
    'const kind = process.env.REDO_SEAM_KIND;',
    'if (kind) {',
    '  const needle = Buffer.from(`"kind":"${kind}"`);',
    '  lib.setFsSeam({ writeSync(fd, buf, ...rest) {',
    '    if (Buffer.isBuffer(buf) && buf.includes(needle)) throw new Error(`seam: the ${kind} line is not written`);',
    '    return fs.writeSync(fd, buf, ...rest);',
    '  } });',
    '}',
    '',
  ].join('\n'));
  return pathToFileURL(f).href;
}

function runner(seamUrl) {
  return (root, script, args, kind = null) => {
    const r = spawnSync(process.execPath, ['--import', seamUrl, path.join(TCB, `${script}.mjs`), ...args], {
      cwd: root, encoding: 'utf8', windowsHide: true, timeout: 120000, env: { ...process.env, REDO_SEAM_KIND: kind ?? '' },
    });
    const out = (r.stdout ?? '').split('\n').filter(Boolean);
    assert.equal(out.length, 1, `${script} ${args[0]}: one stdout line\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
    const j = JSON.parse(out[0]);
    assert.equal(j.exit, r.status, `exit of ${script} ${args[0]}; stderr: ${r.stderr}`);
    return j;
  };
}

const ledger = (root) => lib.readLedger(root).lines ?? [];
const ofKind = (root, kind) => ledger(root).filter((l) => l.kind === kind && l.task === T);
const rowOf = (root) => JSON.parse(fs.readFileSync(path.join(root, 'run', 'tasks.json'), 'utf8')).tasks.find((r) => r.task === T);

test('FX-REDO: each repeat call completes a missing ledger line only at the exact post-state; fsck warns while one is missing', async (t) => {
  fs.mkdirSync(TMP, { recursive: true });
  const dirs = [];
  t.after(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); });
  const seamDir = fs.mkdtempSync(path.join(TMP, 'redo-seam-'));
  dirs.push(seamDir);
  const run = runner(writeSeam(seamDir));
  const missing = (root) => {
    const j = run(root, 'fsck', ['--root', root, '--ce', '1', '--now', NOW]);
    return (j.result.anomalies ?? []).filter((a) => a.code === 'ledger-line-missing').map((a) => a.id);
  };
  const verifies = (root) => assert.ok(lib.verifyLedger(ledger(root)).ok, 'the ledger verifies');

  await t.test('replace fence, stop request, stop verify on one row', () => {
    const A = makeRoot([row({ step: 'bound', session: SID1, attempts: [att(1, { session: SID1, bound_at: NOW, boot: 'BOOT-A', manifest: M0, settings_sha: Z64 })] })], dirs);
    const R = ['--root', A, '--ce', '1', '--now', NOW];
    const fence = (reason, kind = null, extra = []) => run(A, 'replace', ['fence', ...R, '--task', T, '--epoch', '1', '--reason', reason, '--tick', '3', '--boot', 'BOOT-A', ...extra], kind);
    const stop = (mode, kind = null) => run(A, 'stop', [mode, ...R, '--task', T, '--epoch', '2'], kind);

    // fence: the row moves (E+1, fenced, cut), the line dies
    assert.equal(fence('crash', 'fence').exit, 70, 'the seam kills the fence line');
    let r = rowOf(A);
    assert.deepEqual([r.epoch, r.step, r.reason, !!r.attempts.find((a) => a.epoch === 1).cut], [2, 'fenced', 'crash', true]);
    assert.equal(ofKind(A, 'fence').length, 0);
    assert.ok(missing(A).includes(`${T}-e2:fence`), 'fsck warns about the missing fence line');
    // not the exact post-state (another reason): the refusal stands, nothing written
    assert.equal(fence('hang').exit, 65);
    // a dry repeat says it would redo and writes nothing
    const dry = fence('crash', null, ['--dry-run']);
    assert.deepEqual([dry.exit, dry.result.repeat, dry.result.redo], [0, true, true]);
    assert.equal(ofKind(A, 'fence').length, 0);
    // the exact post-state: exit 0 repeat, the line completed from the row, once
    let j = fence('crash');
    assert.deepEqual([j.exit, j.result.repeat, j.result.redo], [0, true, true]);
    const f = ofKind(A, 'fence');
    assert.equal(f.length, 1);
    assert.deepEqual([f[0].epoch, f[0].data.from, f[0].data.to, f[0].data.reason, f[0].data.restart_charged, f[0].data.host, f[0].data.redo], [2, 1, 2, 'crash', true, false, true]);
    j = fence('crash');
    assert.deepEqual([j.exit, j.result.redo], [0, false]);
    assert.equal(ofKind(A, 'fence').length, 1);
    assert.ok(!missing(A).includes(`${T}-e2:fence`), 'no warning once the line is there');

    // stop request: stop-requested, the line dies; the repeat completes it once
    assert.equal(stop('request', 'stop-request').exit, 70);
    assert.equal(rowOf(A).step, 'stop-requested');
    assert.equal(ofKind(A, 'stop-request').length, 0);
    assert.equal(fence('crash').exit, 65, 'a fence repeated after the row moved on keeps 65 (R1)');
    j = stop('request');
    assert.deepEqual([j.exit, j.result.repeat, j.result.redo], [0, true, true]);
    const sr = ofKind(A, 'stop-request');
    assert.deepEqual([sr.length, sr[0].epoch, sr[0].data.session, sr[0].data.redo], [1, 2, SID1, true]);
    assert.equal(stop('request').result.redo, false);
    assert.equal(ofKind(A, 'stop-request').length, 1);

    // stop verify: sample, then a confirmed stop whose line dies; the repeat completes it once
    const ticks = (n) => fs.writeFileSync(path.join(A, 'run', 'watcher.json'), JSON.stringify({ schema_version: 1, ticks_total: n }));
    ticks(10);
    assert.equal(stop('verify').exit, 6, 'the first verify samples');
    ticks(100);
    // FX-CLOSE (a): the claim holder's close is recorded (the owner's act, by the CLI id)
    fs.mkdirSync(path.join(A, 'run', 'close', 'done'), { recursive: true });
    fs.writeFileSync(path.join(A, 'run', 'close', 'done', `${SID1}.json`), JSON.stringify({ kind: 'close-done', session: SID1, outcome: 'owner', by: null }));
    assert.equal(stop('verify', 'stop').exit, 70);
    r = rowOf(A);
    assert.deepEqual([r.step, r.attempts.find((a) => a.epoch === 1).stop], ['stopped', 'confirmed']);
    assert.equal(ofKind(A, 'stop').length, 0);
    assert.ok(missing(A).includes(`${T}-e2:stop`), 'fsck warns about the missing stop line');
    j = stop('verify');
    assert.deepEqual([j.exit, j.result.repeat, j.result.redo], [0, true, true]);
    const st = ofKind(A, 'stop');
    assert.deepEqual([st.length, st[0].epoch, st[0].data.confirmed, st[0].data.redo], [1, 2, true, true]);
    assert.equal(stop('verify').result.redo, false);
    assert.equal(stop('request').result.redo, false, 'a request repeated at stopped finds the line');
    assert.equal(ofKind(A, 'stop').length, 1);
    verifies(A);
  });

  await t.test('replace bind: the same session completes the line, another session is refused', () => {
    const B = makeRoot([row({ step: 'admitted', attempts: [att(1, { manifest: M0, settings_sha: Z64 })] })], dirs);
    const bind = (sid, kind = null) => run(B, 'replace', ['bind', '--root', B, '--ce', '1', '--now', NOW, '--task', T, '--epoch', '1', '--session', sid, '--boot', 'BOOT-B'], kind);
    // FX-CLAIM step 4: bind needs the claim; the child hook makes it on SID1's first tool call
    assert.equal(bind(SID1).exit, 6, 'no claim yet: not-claimed');
    assert.equal(rowOf(B).step, 'admitted');
    claimAt(B, 1, lib.claimRecord(SID1));
    assert.equal(bind(SID1, 'bind').exit, 70);
    assert.deepEqual([rowOf(B).step, rowOf(B).session], ['bound', SID1]);
    assert.ok(missing(B).includes(`${T}-e1:bind`));
    assert.equal(bind(SID2).exit, 1, 'another session: session-differs');
    assert.equal(ofKind(B, 'bind').length, 0);
    let j = bind(SID1);
    assert.deepEqual([j.exit, j.result.repeat, j.result.redo], [0, true, true]);
    const b = ofKind(B, 'bind');
    assert.deepEqual([b.length, b[0].data.session, b[0].data.boot, b[0].data.redo], [1, SID1, 'BOOT-B', true]);
    j = bind(SID1);
    assert.deepEqual([j.exit, j.result.redo], [0, false]);
    assert.equal(ofKind(B, 'bind').length, 1);
    verifies(B);
  });

  await t.test('replace start at admitted with a manifest: the admit line (the row as a death leaves it)', () => {
    const C = makeRoot([row({ step: 'admitted', attempts: [att(1, { folder: `wt/${T}-e1`, manifest: M0, settings_sha: Z64 })] })], dirs);
    const start = () => run(C, 'replace', ['start', '--root', C, '--ce', '1', '--now', NOW, '--task', T, '--epoch', '1', '--free-mb', '99999']);
    assert.ok(missing(C).includes(`${T}-e1:admit`));
    let j = start();
    assert.deepEqual([j.exit, j.result.repeat, j.result.redo], [0, true, true]);
    const a = ofKind(C, 'admit');
    assert.deepEqual([a.length, a[0].epoch, a[0].data.e_task, a[0].data.redo], [1, 1, 50000, true]);
    j = start();
    assert.deepEqual([j.exit, j.result.redo], [0, false]);
    assert.equal(ofKind(C, 'admit').length, 1);
    verifies(C);
  });

  await t.test('status --reconcile: a row at started gets its started line, once', () => {
    const D = makeRoot([row({ step: 'admitted', attempts: [att(1, { manifest: M0, settings_sha: Z64 })] })], dirs);
    const folder = path.join(D, 'wt', `${T}-e1`);
    const tf = path.join(D, 'transcripts', lib.projectDirName(folder), `${SID1}.jsonl`);
    fs.mkdirSync(path.dirname(tf), { recursive: true });
    fs.writeFileSync(tf, JSON.stringify({ type: 'user', sessionId: SID1, cwd: folder, timestamp: NOW, uuid: 'u-0', message: { role: 'user', content: 'synthetic start' } }) + '\n');
    const rec = (kind = null) => run(D, 'status', ['--reconcile', '--root', D, '--ce', '1', '--now', NOW, '--free-mb', '100000'], kind);
    assert.equal(rec('started').exit, 70);
    assert.deepEqual([rowOf(D).step, rowOf(D).attempts[0].session], ['started', SID1]);
    assert.equal(ofKind(D, 'started').length, 0);
    assert.ok(missing(D).includes(`${T}-e1:started`));
    let j = rec();
    assert.ok((j.result.reconciled ?? []).some((c) => c.task === T && c.redo === true), JSON.stringify(j.result));
    const s = ofKind(D, 'started');
    assert.deepEqual([s.length, s[0].epoch, s[0].data.session, s[0].data.redo], [1, 1, SID1, true]);
    j = rec();
    assert.ok(!(j.result.reconciled ?? []).some((c) => c.redo === true));
    assert.equal(ofKind(D, 'started').length, 1);
    verifies(D);
  });

  // On the merge with FX-CLAIM: the line a repeat completes is the line the dead call wrote, claims in place.
  await t.test('replace fence of an attempt no session claimed (FX-CLAIM N7): the repeat completes the no-start line, uncharged', () => {
    const N = makeRoot([row({ step: 'admitted', attempts: [att(1, { manifest: M0, settings_sha: Z64 })] })], dirs);
    fs.mkdirSync(path.join(N, 'wt', `${T}-e1`), { recursive: true }); // start made the folder; no session claimed it
    const fence = (kind = null) => run(N, 'replace', ['fence', '--root', N, '--ce', '1', '--now', NOW, '--task', T, '--epoch', '1', '--reason', 'crash', '--tick', '3', '--boot', 'BOOT-A'], kind);
    assert.equal(fence('fence').exit, 70);
    const r = rowOf(N);
    assert.deepEqual([r.epoch, r.step, r.restarts, r.nostart, r.fails.length], [2, 'fenced', 0, 1, 0], 'a no-start fence: uncharged, nostart counts it');
    assert.equal(lib.readClaim(path.join(N, 'wt', `${T}-e1`)).kind, 'tombstone');
    assert.ok(missing(N).includes(`${T}-e2:fence`));
    const j = fence();
    assert.deepEqual([j.exit, j.result.repeat, j.result.redo, j.result.restart_charged], [0, true, true, false]);
    const f = ofKind(N, 'fence');
    assert.deepEqual([f.length, f[0].data.restart_charged, f[0].data.host, f[0].data.limit, f[0].data.redo], [1, false, false, false, true]);
    assert.deepEqual([rowOf(N).restarts, rowOf(N).nostart], [0, 1], 'the repeat charges and counts nothing');
    verifies(N);
  });

  await t.test('stop request (FX-CLAIM step 6): the repeat names the claim holder, and every folder session after a tombstone', () => {
    const fenced = (claim) => {
      const S = makeRoot([row({ step: 'admitted', attempts: [att(1, { manifest: M0, settings_sha: Z64 })] })], dirs);
      fs.mkdirSync(path.join(S, 'wt', `${T}-e1`), { recursive: true });
      if (claim) claimAt(S, 1, claim);
      assert.equal(run(S, 'replace', ['fence', '--root', S, '--ce', '1', '--now', NOW, '--task', T, '--epoch', '1', '--reason', 'crash', '--tick', '3', '--boot', 'BOOT-A']).exit, 0);
      return S;
    };
    const request = (S, kind = null) => run(S, 'stop', ['request', '--root', S, '--ce', '1', '--now', NOW, '--task', T, '--epoch', '2'], kind);
    // a session claim on an attempt fenced at admitted (no bind, no reconcile yet): the request names SID2
    const S1 = fenced(lib.claimRecord(SID2));
    assert.equal(rowOf(S1).attempts.find((a) => a.epoch === 1).session ?? null, null);
    assert.equal(request(S1, 'stop-request').exit, 70);
    assert.equal(rowOf(S1).step, 'stop-requested');
    let j = request(S1);
    assert.deepEqual([j.exit, j.result.repeat, j.result.redo], [0, true, true]);
    let sr = ofKind(S1, 'stop-request');
    assert.deepEqual([sr.length, sr[0].data.session, sr[0].data.sessions ?? null, sr[0].data.redo], [1, SID2, null, true]);
    verifies(S1);
    // a tombstone, a late session visible in the folder: the request names every folder session
    const S2 = fenced(null);
    const folder = path.join(S2, 'wt', `${T}-e1`);
    assert.equal(lib.readClaim(folder).kind, 'tombstone');
    const tf = path.join(S2, 'transcripts', lib.projectDirName(folder), `${SID1}.jsonl`);
    fs.mkdirSync(path.dirname(tf), { recursive: true });
    fs.writeFileSync(tf, JSON.stringify({ type: 'user', sessionId: SID1, cwd: folder, timestamp: NOW, uuid: 'u-0', message: { role: 'user', content: 'a late start' } }) + '\n');
    assert.equal(request(S2, 'stop-request').exit, 70);
    assert.equal(rowOf(S2).step, 'stop-requested');
    j = request(S2);
    assert.deepEqual([j.exit, j.result.repeat, j.result.redo], [0, true, true]);
    sr = ofKind(S2, 'stop-request');
    assert.deepEqual([sr.length, sr[0].data.session, sr[0].data.sessions, sr[0].data.redo], [1, SID1, [SID1], true]);
    verifies(S2);
  });
});
