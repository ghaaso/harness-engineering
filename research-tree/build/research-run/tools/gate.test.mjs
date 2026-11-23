import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SAMPLE, tmpRun, helper, run } from './test-util.mjs';

const NOW = { GATE_NOW: '2026-11-23T11:00:00Z' }; // one hour before the reset
const gate = (t, unit, all, fab, env = NOW) => run('gate.mjs', [unit, '--all', String(all), '--fable', String(fab)], t, env);

test('fits: START, and the line is appended to usage.log', () => {
  const t = tmpRun();
  const r = gate(t, 'f2', 50, 20);
  assert.match(r.out, /^START f2: /);
  assert.match(fs.readFileSync(path.join(t.root, 'run', 'usage.log'), 'utf8'), /START f2:/);
});

test('holds on the all-models meter', () => {
  const r = gate(tmpRun(), 'f2', 99.5, 20);
  assert.match(r.out, /^HOLD f2: all-models meter over: all 100\.\d+ vs 99\.79/);
  assert.doesNotMatch(r.out, /Fable meter over/);
});

test('holds on the Fable meter', () => {
  const r = gate(tmpRun(), 'f2', 50, 95);
  assert.match(r.out, /^HOLD f2: Fable meter over/);
  assert.doesNotMatch(r.out, /all-models meter over/);
});

test('holds on the cap', () => {
  const t = tmpRun({ ...SAMPLE, cap_M: 150 }); // 150 - 100 = 50 left; coordinator 30 + unit 50 = 80
  const r = gate(t, 'f2', 10, 10);
  assert.match(r.out, /^HOLD f2: cap over: .*cap 80 vs 50 M/);
});

test('holds while preparation_M is null, and on an unreadable config', () => {
  assert.match(gate(tmpRun({ ...SAMPLE, preparation_M: null }), 'f2', 1, 1).out, /^HOLD f2: preparation_M is null/);
  const t = tmpRun(null);
  fs.writeFileSync(path.join(t.root, 'run', 'config.json'), '{ not json');
  assert.match(gate(t, 'f2', 1, 1).out, /^HOLD f2: .*unreadable/);
});

test('a running unit holds a reserve (expected less its tokens so far); done units do not', () => {
  const t = tmpRun();
  slot(t, 1, 'f3');
  helper(t.folder, 's1', 'a1', 'build: f3 reader', [['m1', 0, 0, 10_000_000, 0]]); // 10 M used, reserve 40
  let r = gate(t, 'f2', 50, 20);
  assert.match(r.out, /^START f2: /);
  assert.match(r.out, /reserve 1\.13 \+ unit 0\.81/); // (30 coordinator + 40) / 62
  assert.match(r.out, /running: f3/);
  fs.mkdirSync(path.join(t.root, 'fields', '3-encoders'), { recursive: true });
  fs.writeFileSync(path.join(t.root, 'fields', '3-encoders', 'RETURN.md'), 'f3 DONE');
  r = gate(t, 'f2', 50, 20);
  assert.match(r.out, /running: none/);
  assert.match(r.out, /reserve 0\.48 \+/); // coordinator alone: 30 / 62
});

test('a non-field unit is done by its done_file', () => {
  const t = tmpRun();
  slot(t, 1, 'sheet');
  assert.match(gate(t, 'f2', 50, 20).out, /running: sheet/);
  fs.mkdirSync(path.join(t.root, 'sheet'));
  fs.writeFileSync(path.join(t.root, 'sheet', 'SHEET.md'), 'done');
  assert.match(gate(t, 'f2', 50, 20).out, /running: none/);
});

function slot(t, k, unit) {
  fs.mkdirSync(path.join(t.root, 'gate'), { recursive: true });
  fs.writeFileSync(path.join(t.root, 'gate', `${k}.json`), JSON.stringify({ unit }));
}

test('two concurrent calls where only one fits: one START, one HOLD, one slot', async () => {
  const { spawn } = await import('node:child_process');
  const { TOOLS } = await import('./test-util.mjs');
  const t = tmpRun();
  // reading 98.4: f2 fits alone (98.4 + 0.48 + 0.81 <= 99.79); with f2 running, f3 adds 0.81 more and does not
  const go = unit => new Promise(res => {
    let s = '';
    const p = spawn(process.execPath, [path.join(TOOLS, 'gate.mjs'), unit, '--all', '98.4', '--fable', '20'], { env: { ...process.env, RUN_ROOT: t.root, CLAUDE_PROJECTS: t.projects, ...NOW } });
    p.stdout.on('data', d => s += d);
    p.on('close', () => res(s.trim()));
  });
  const outs = await Promise.all([go('f2'), go('f3')]);
  assert.equal(outs.filter(o => o.startsWith('START')).length, 1, outs.join('\n'));
  assert.equal(outs.filter(o => o.startsWith('HOLD')).length, 1, outs.join('\n'));
  assert.deepEqual(fs.readdirSync(path.join(t.root, 'gate')), ['1.json']);
});

test('a slot left by a killed call is a START like any other; the next start takes the next slot', () => {
  const t = tmpRun();
  slot(t, 3, 'f3');
  const r = gate(t, 'f2', 50, 20);
  assert.match(r.out, /^START f2: .*running: f3/);
  assert.deepEqual(fs.readdirSync(path.join(t.root, 'gate')).sort(), ['3.json', '4.json']);
});

test('a HOLD makes no slot', () => {
  const t = tmpRun();
  gate(t, 'f2', 99.5, 20);
  assert.ok(!fs.existsSync(path.join(t.root, 'gate')) || fs.readdirSync(path.join(t.root, 'gate')).length === 0);
});
