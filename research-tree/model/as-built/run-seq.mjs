// Sequential driver for the as-built copy (round 3). Runs one configuration, whole or by parts, ONE check.mjs process
// at a time, and keeps ONE result file per configuration, rewritten after every part (so a rerun resumes).
//   node model/as-built/run-seq.mjs <ID> --out <file.json> [--parts] [--mem-mb 400] [--wall-s 780] [--only k=2,x=1;k=2,cd=1,x=1]
// --parts: split into the maximal fault multisets (as model/run-all.mjs:30-43). Without it: one whole run.
// Each part gets check.mjs's own --deadline, so a part that runs out of time ends BOUNDED instead of being killed; the
// driver starts no new part after --wall-s and exits 3 ("more to do"); run the same command again to continue.
// Aggregation (run-all.mjs:3-9): a safety property fails if it fails in any part (shortest trace kept), holds only if it
// holds in every complete part; anything else is BOUNDED / not checked, never "holds".
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CONFIGS } from './configs.mjs';
import { FAULTS } from './model.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const id = argv[0];
const OUT = opt('--out', null);
const MEM = opt('--mem-mb', '400');
const WALL = +opt('--wall-s', 780) * 1000;
const T0 = Date.now();
const cfg = CONFIGS.find((c) => c.id === id);
if (!cfg || !OUT) { process.stderr.write('usage: run-seq.mjs <ID> --out <file> [--parts]\n'); process.exit(2); }

function maximalMultisets(bud) {
  const kinds = FAULTS.filter((k) => (bud[k] || 0) > 0);
  const out = [];
  const total = Math.min(bud.k, kinds.reduce((a, k) => a + bud[k], 0));
  const rec = (i, left, cur) => {
    if (left === 0) { out.push({ ...cur }); return; }
    if (i >= kinds.length) return;
    const k = kinds[i];
    for (let c = Math.min(bud[k], left); c >= 0; c--) { if (c) cur[k] = c; else delete cur[k]; rec(i + 1, left - c, cur); }
    delete cur[k];
  };
  rec(0, total, {});
  return out;
}
const bud = cfg.over.BUD;
let parts = argv.includes('--parts') ? maximalMultisets(bud).map((m) => [`k=${bud.k}`, ...Object.entries(m).map(([a, b]) => `${a}=${b}`)].join(',')) : [null];
if (opt('--only', null)) parts = opt('--only', '').split(';');

let res = { id, title: cfg.title, base: cfg.base || null, mode: parts[0] === null ? 'whole' : 'parts', parts_total: parts.length, parts: {} };
try { const old = JSON.parse(fs.readFileSync(OUT, 'utf8')); if (old.id === id && old.mode === res.mode) res.parts = old.parts || {}; } catch { /* new */ }

const PROPS = ['NoStaleAccepted', 'AtMostOneCommit', 'Slots', 'RestartLimit', 'TwoCoordinatorsAct', 'SingleWatcher', 'FailedTaskStopped', 'OneSessionPerAttempt', 'ReadyNotDiscarded', 'NoFalseSuspicion', 'NoDeadlock', 'AlwaysCanResolve', 'NoBusyLoop', 'EventuallyResolves'];
function aggregate() {
  const done = Object.values(res.parts);
  const props = {};
  // the round-3 properties (wake group, D7) appear only when their flags are on: aggregate every name a part reports
  const names = [...new Set([...PROPS, ...done.flatMap((r) => Object.keys(r.props))])];
  for (const p of names) {
    let fail = null, allTrue = true, why = new Set();
    for (const r of done) {
      const v = r.props[p];
      if (!v) { allTrue = false; why.add('missing'); continue; }
      if (v.holds === false) { if (!fail || v.trace.length < fail.trace.length) fail = { holds: false, steps: v.trace.length, part: r.part, trace: v.trace }; }
      else if (v.holds !== true) { allTrue = false; why.add(String(v.holds)); }
    }
    const missing = done.length < parts.length;
    props[p] = fail || (allTrue && !missing ? { holds: true } : { holds: 'BOUNDED/unknown: ' + [...why].join('; ') + (missing ? `; ${parts.length - done.length} part(s) not run` : '') });
  }
  res.parts_done = done.length;
  res.states_sum = done.reduce((a, r) => a + r.states, 0);
  res.complete_parts = done.filter((r) => r.complete).length;
  res.bounded_parts = done.filter((r) => !r.complete).map((r) => `${r.part}: ${r.bounded_why}`);
  res.props = props;
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1) + '\n');
}

let left = false;
for (const part of parts) {
  const key = part || 'whole';
  if (res.parts[key]) continue;
  const remain = WALL - (Date.now() - T0);
  if (remain < 60000) { left = true; break; }
  const deadline = Date.now() + remain - 50000;
  const args = [path.join(HERE, 'check.mjs'), id, '--mem-mb', MEM, '--deadline', String(deadline)];
  if (part) args.push('--bud', part);
  process.stderr.write(`[run-seq] ${id} ${key} start (${Math.round(remain / 1000)} s left)\n`);
  const r = spawnSync(process.execPath, args, { cwd: path.join(HERE, '..', '..'), encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0 || !r.stdout.trim()) { process.stderr.write(`[run-seq] ${key} failed: status ${r.status} ${r.signal || ''}\n${(r.stderr || '').slice(-2000)}\n`); left = true; break; }
  const j = JSON.parse(r.stdout.trim().split('\n').pop());
  res.parts[key] = { part: key, states: j.states, transitions: j.transitions, complete: j.complete, bounded_why: j.bounded_why, seconds: j.seconds, peak_mb: j.peak_mb, props: j.props };
  process.stderr.write(`[run-seq] ${key}: ${j.states} states, ${j.complete ? 'complete' : 'BOUNDED'}, ${j.seconds} s\n`);
  aggregate();
}
aggregate();
process.stderr.write(`[run-seq] ${id}: ${res.parts_done}/${parts.length} parts done\n`);
process.exit(left || res.parts_done < parts.length ? 3 : 0);
