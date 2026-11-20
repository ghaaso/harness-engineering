// S2.2 (task r57-0507, slice 2): the model as built. Every new configuration starts and ends at its smallest size, and
// every new flag changes what is explored (states or a verdict), so no new check is vacuous. Run from research-tree/:
//   node --test model/as-built/model-build.test.mjs        (about 60-90 s; RUN-BUILD.md has the full-size runs)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CONFIGS } from './configs-build.mjs';

const CHECK = fileURLToPath(new URL('./check-build.mjs', import.meta.url));
const memo = new Map();
// run check-build.mjs on one part; returns its JSON plus `fails` (the properties that fail)
function run(id, bud, { set = null, mem = 600, extra = [] } = {}) {
  const args = [CHECK, id, '--mem-mb', String(mem)];
  if (bud) args.push('--bud', bud);
  if (set) args.push('--set', set);
  args.push(...extra);
  const key = args.join(' ');
  if (!memo.has(key)) memo.set(key, new Promise((resolve, reject) => {
    const p = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = ''; p.stdout.on('data', (d) => { out += d; });
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(`${key}: exit ${code}`));
      const j = JSON.parse(out.trim().split('\n').pop());
      j.fails = Object.entries(j.props).filter(([, v]) => v.holds === false).map(([k]) => k);
      resolve(j);
    });
  }));
  return memo.get(key);
}

// the smallest size of every new configuration (k=0: no fault; the fault of the item where it needs one)
const SMALL = {
  'FN-R5-B': ['k=0'], 'FN-OUT-CLOSE-K2-B': ['k=0'], 'FXW-4R-B': ['k=0'], 'FXW-5-B': ['k=1,o=1'], 'FXW-6-B': ['k=0'],
  'FN-N2-B': ['k=0'], 'BQ5-SJ': ['k=1,q=1'], 'BQ5-NOSJ': ['k=1,q=1'], 'BQ5-X': ['k=1,q=1'],
  'LEASE-B': ['k=0', 120], 'LEASE-ORDER': ['k=0', 120], 'LEASE-NOWIN': ['k=0', 120], 'LEASE-X': ['k=0', 120],
  'IDGAP-W': ['k=1,w=1'], 'IDGAP-WZ': ['k=2,z=1,w=1'], 'IDGAP-X': ['k=0'], 'CLOSE-APPROVAL': ['k=0'], 'CLOSE-APPROVAL-R5': ['k=0'],
};
const small = (id) => run(id, SMALL[id][0], { mem: SMALL[id][1] ?? 600 });
const FINAL = ['SMOKE', 'FN-R5', 'FN-OUT-CLOSE-K2', 'FXW-4R', 'FXW-5', 'FXW-6', 'FN-N2', 'FX-CLAIM', 'FX-CLOSE'];

describe('model-build', { concurrency: 4 }, () => {
  test('every configuration of configs-build.mjs is the R57 final pass or has a smallest size here', () => {
    for (const c of CONFIGS) assert.ok(FINAL.includes(c.id) || SMALL[c.id], `${c.id} has no smallest size in SMALL`);
  });

  test('flags off, the R57 model: SMOKE explores the states check.mjs explores (132,761)', async () => {
    const j = await run('SMOKE', null, { mem: 600 });
    assert.equal(j.states, 132761);
  });

  for (const id of Object.keys(SMALL)) test(`${id} starts and ends at ${SMALL[id][0]}`, async () => {
    const j = await small(id);
    assert.ok(j.states > 0);
    if (id.startsWith('LEASE-')) assert.equal(j.complete, false, 'reading (ii) is bounded by memory (RUN-BUILD.md)');
    else assert.equal(j.complete, true, `${id} did not finish`);
  });

  test('BQ5_OWNER_TURN changes the states (FN-R5-B k=0)', async () => {
    const [on, off] = await Promise.all([small('FN-R5-B'), run('FN-R5-B', 'k=0', { set: 'BQ5_OWNER_TURN=0' })]);
    assert.notEqual(on.states, off.states);
  });

  test('BQ5_NO_OWNER: with no owner typing, a start never comes (AlwaysCanResolve fails only then)', async () => {
    const [x, nosj] = await Promise.all([small('BQ5-X'), small('BQ5-NOSJ')]);
    assert.ok(x.fails.includes('AlwaysCanResolve'));
    assert.ok(!nosj.fails.includes('AlwaysCanResolve'));
  });

  test('BQ5_REFUSED_SJ: start.json left by a refused start -> the third no-start fence is charged (k=3,q=3)', async () => {
    const [sj, nosj, sj1, nosj1] = await Promise.all([run('BQ5-SJ', 'k=3,q=3'), run('BQ5-NOSJ', 'k=3,q=3'), small('BQ5-SJ'), small('BQ5-NOSJ')]);
    assert.ok(sj.fails.includes('RefusedStartNotCharged'));
    assert.ok(!nosj.fails.includes('RefusedStartNotCharged'));
    assert.notEqual(sj1.states, nosj1.states);
  });

  test('the owner typing is strongly fair: weak fairness alone leaves a fair cycle (FN-R5-B k=1,cs=1)', async () => {
    const [sf, wf] = await Promise.all([run('FN-R5-B', 'k=1,cs=1'), run('FN-R5-B', 'k=1,cs=1', { extra: ['--weak-owner'] })]);
    assert.ok(!sf.fails.includes('EventuallyResolves'));
    assert.ok(wf.fails.includes('EventuallyResolves'));
  });

  test('the lease act: the window charges a claimed attempt; --if-unclaimed without it or the closing order does not', async () => {
    const [b, order, nowin, x] = await Promise.all(['LEASE-B', 'LEASE-ORDER', 'LEASE-NOWIN', 'LEASE-X'].map(small));
    assert.ok(b.fails.includes('LeaseFenceClaimed'), 'BLD_LEASE_WINDOW');
    assert.ok(x.fails.includes('LeaseFenceClaimed'), 'BLD_IF_UNCLAIMED off');
    assert.ok(!order.fails.includes('LeaseFenceClaimed'), 'BLD_LEASE_ORDER');
    assert.ok(!nowin.fails.includes('LeaseFenceClaimed'), 'the window off');
  });

  test('BLD_CLOSE_IDGAP and the close facts change the states (k=0)', async () => {
    const [gap, nogap, appr] = await Promise.all([small('FN-OUT-CLOSE-K2-B'), small('IDGAP-X'), small('CLOSE-APPROVAL')]);
    assert.notEqual(gap.states, nogap.states);
    assert.notEqual(gap.states, appr.states);
  });

  test('BLD_VERIFY_RECORDS changes the states; a dead session reaches its record or the owner (k=1,cd=1)', async () => {
    const [on, off, r5] = await Promise.all([run('FN-OUT-CLOSE-K2-B', 'k=1,cd=1'), run('FN-OUT-CLOSE-K2-B', 'k=1,cd=1', { set: 'BLD_VERIFY_RECORDS=0' }), run('FN-R5-B', 'k=1,cd=1')]);
    assert.notEqual(on.states, off.states);
    assert.deepEqual(on.fails, []);
    assert.deepEqual(r5.fails, []);
  });

  test('fault w: a false closed relay for a live session breaks Slots (IDGAP-W k=1,w=1)', async () => {
    const j = await small('IDGAP-W');
    assert.ok(j.fails.includes('Slots'));
  });

  test('BLD_PROPS adds the two observers', async () => {
    const [on, off] = await Promise.all([small('FN-R5-B'), run('FN-R5-B', 'k=0', { set: 'BLD_PROPS=0' })]);
    for (const p of ['RefusedStartNotCharged', 'LeaseFenceClaimed']) { assert.ok(p in on.props); assert.ok(!(p in off.props)); }
  });
});
