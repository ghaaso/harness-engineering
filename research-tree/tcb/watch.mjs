// watch.mjs (unit U1b): the coordinator's event loop (R4-R6, R8, R10-R12, R50).
//   (watcher) --root R --ce N [--interval-ms MS] [--no-intake] [--now ISO] [--free-mb M]
//   --once    --root R --ce N [--no-intake] [--now ISO] [--free-mb M]
//   --alarm   --root R --ce N [--sleep-ms MS] [--now ISO]
//   --intake  --root R --ce N
// Source of truth: CONTRACT.md (sections 1.2, 1.4, 2.1, 3.10, 4) and spec/watch.mjs.md.
// Reads, decides and exits with the most urgent class. Counts model calls and ticks; the one clock
// difference is the one-sided pause discount of the hang count (M5, CONTRACT 1.2). Transcripts are parsed before the run lock; every ledger append goes through
// withRunLock(ce), so the ce is re-checked inside the lock. Kills nothing (decisions 5, 29).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as lib from './lib.mjs';

const SCRIPT = 'watch';

const CLASS_SLUG = {
  10: 'reopened', 11: 'ready', 12: 'repair', 13: 'soft-limit', 14: 'checker-batch', 15: 'window-limit', 16: 'drain',
  20: 'stall', 21: 'hang', 22: 'loop', 23: 'hard-limit', 24: 'memory', 25: 'stop-unconfirmed', 26: 'common-cause',
  27: 'tamper-seen', 17: 'act-due',
};
// CONTRACT 1.4 precedence after 64 (handled before any class).
const PRECEDENCE = [27, 26, 25, 24, 23, 22, 21, 20, 11, 12, 10, 13, 15, 16, 14, 17];
const TERMINAL = new Set(['committed', 'cut', 'failed', 'dropped']);
const isUrgent = (c) => c >= 20 && c <= 27;

const F = {
  coord: 'run/coord.json',
  acked: 'run/acked.json',
  alarm: 'run/alarm.json',
  watcherJson: 'run/watcher.json',
  commits: 'store/commits',
};

const FLAGS = {
  root: { type: 'string', required: true },
  ce: { type: 'int', required: true },
  once: { type: 'bool' },
  alarm: { type: 'bool' },
  intake: { type: 'bool' },
  'interval-ms': { type: 'int' },
  'sleep-ms': { type: 'int' },
  'no-intake': { type: 'bool' },
  now: { type: 'string' },
  'free-mb': { type: 'int' },
  boot: { type: 'string' },
};

// ---------------------------------------------------------------- small local helpers

function err(code, exit, detail) {
  if (typeof lib.TcbError === 'function') return new lib.TcbError(code, exit, detail);
  const e = new Error(code);
  e.name = 'TcbError';
  e.code = code;
  e.exit = exit;
  e.detail = detail;
  return e;
}

function fileOf(root, key) {
  return path.join(root, ...F[key].split('/'));
}

function isoOf(now) {
  if (typeof now === 'string') return now;
  if (now instanceof Date) return now.toISOString();
  if (typeof now === 'number') return new Date(now).toISOString();
  return new Date(String(now)).toISOString();
}

function exists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

function readState(p, name) {
  try {
    return lib.readJson(p);
  } catch (e) {
    if (e && e.code === 'missing') return null;
    if (e && e.code === 'unparseable') throw err('table-corrupt', 67, { file: name, detail: e.detail ?? null });
    throw e;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function num(v, d = 0) {
  return typeof v === 'number' && Number.isFinite(v) ? v : d;
}

function attemptOfSafe(row, e) {
  try {
    return lib.attemptOf(row, e);
  } catch {
    return null;
  }
}

function attemptDir(root, row, e) {
  const att = attemptOfSafe(row, e);
  if (att && typeof att.folder === 'string' && att.folder) {
    return path.isAbsolute(att.folder) ? att.folder : path.join(root, ...att.folder.split(/[\\/]/));
  }
  const p = typeof lib.paths === 'function' ? lib.paths(root) : null;
  if (p && typeof p.attempt === 'function') return p.attempt(row.task, e);
  return path.join(root, 'wt', `${row.task}-e${e}`);
}

// The outcome log of attempt e (lib.outcomeState), or null when it does not read (status and fsck
// report a bad log).
function readLog(root, row, e) {
  try {
    return lib.outcomeState(attemptDir(root, row, e), row);
  } catch {
    return null;
  }
}

// READY.json of attempt e, a copy (FX-OUT): read for the repair marker and the zombie-write telemetry
// only. The parsed value, or null when absent or unparseable.
function readReady(root, row, e) {
  try {
    const v = lib.readJson(path.join(attemptDir(root, row, e), 'staging', 'READY.json'));
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

function commitExists(root, task, step) {
  return exists(path.join(fileOf(root, 'commits'), `${task}.${step}.json`));
}

// M3: the act status.json's `next` names for this row (status.mjs nextOf), when it is an act the
// coordinator can take now; null for `none`, `owner`, `audit`/`commit` (READY is class 11) and for
// an act that can only defer (a start with no free slot, a verify before its sample is old enough).
function rowAct(root, tr, row, facts) {
  // Round 3 (S0.5; FIX-JOIN point 11): 1 planAct (FX-PLAN); 2 `owner` or `none` gives null (FX-W5
  // step 1); then today's filters (3) and the act as keyed today (4).
  const planned = rowActPlanned(root, tr, row, facts);
  if (ownerOrNone(planned)) return null;
  const { slotFree, blocked, tick, svd } = facts;
  const e = row.epoch;
  // 3. The "can take now" filters (FIX-JOIN point 11): the work-creating first fence and restart wait
  // for a free slot and for neither halted nor draining; audit and commit are class 11's (READY); a
  // verify waits until its sample is stop_verify_deltas ticks old. Every other act is due as planned.
  if (planned === 'replace-fence' || planned === 'replace-start') return !blocked && slotFree ? planned : null;
  if (planned === 'audit' || planned === 'commit') return null;
  if (planned === 'stop-verify') {
    const k = row.state === 'committed' ? e : e - 1;
    const target = attemptOfSafe(row, k);
    let sample = null;
    try {
      sample = lib.readJson(path.join(root, 'run', 'stop-sample', `${row.task}-e${k}.json`));
    } catch {
      sample = null;
    }
    if (sample && Number.isInteger(sample.tick)) return tick >= sample.tick + svd ? `stop-verify@${sample.tick}` : null;
    return target && target.stop === 'unconfirmed' ? 'stop-verify@-' : null;
  }
  return planned;
}

// FX-PLAN, rowAct step 1: lib.planAct over lib.planFacts, the planner status's nextOf calls, with the
// watcher's facts (`facts.plan`: tick, wall time, lease, an empty process list as slotCount has it,
// the step-7 sessions and the rows over Z). The transcript-visible branch is gone: the claim decides.
function rowActPlanned(root, tr, row, facts) { // eslint-disable-line no-unused-vars
  const p = facts.plan ?? {};
  const zombieOver = p.zombieRows instanceof Set && p.zombieRows.has(row.task);
  return lib.planAct(row, lib.planFacts(root, row, { ...p, blocked: facts.blocked === true, zombieOver, audited: false }));
}

// FX-W5 step 1 (FX-PLAN step 2): an `owner` or `none` act raises no act due, so it is never raised
// again nor counted `stuck` (FIX-JOIN point 11; zombie-over arrives as `owner` through planAct's facts).
// Until FX-PLAN fills rowActPlanned, `planned` is undefined and today's filters decide.
function ownerOrNone(planned) {
  return planned === 'owner' || planned === 'none';
}

function lockOpts(th, ce, proc, now) {
  return { script: SCRIPT, ce, proc, now, retries: th.get('lock_retries') };
}

// ---------------------------------------------------------------- transcripts

function freshParseState() {
  return {
    end_byte: 0, last_call: null, calls: 0, input: 0, cache_read: 0, cache_write: 0, output: 0,
    last_context: 0, peak_context: 0, loop: { sig: null, run: 0 },
  };
}

function usageOf(u) {
  return {
    input: num(u && u.input), cache_read: num(u && u.cache_read), cache_write: num(u && u.cache_write),
    output: num(u && u.output),
  };
}

// One file's parse-state advanced from its stored end_byte (CONTRACT 3.10). A file shorter than
// end_byte is re-parsed from 0; a call split across the boundary (lastCall) is counted once.
function advanceFile(abs, prev) {
  let size;
  try {
    size = fs.statSync(abs).size;
  } catch {
    return { ps: prev ?? freshParseState(), newCalls: 0, missing: true };
  }
  let ps = prev ? { ...prev, loop: { ...(prev.loop ?? { sig: null, run: 0 }) } } : freshParseState();
  const shrunk = size < num(ps.end_byte);
  if (shrunk) ps = freshParseState();
  if (size === num(ps.end_byte) && ps.end_byte > 0) return { ps, newCalls: 0, moved: false };
  // FX-W6: the tail state continues from the stored one; `moved` = a new conversation record (or a re-parse).
  const prevN = ps.tail && Number.isInteger(ps.tail.n) ? ps.tail.n : 0;
  const parsed = lib.parseTranscript(abs, { fromByte: num(ps.end_byte), lastCall: ps.last_call ?? null, tail: ps.tail ?? null });
  const moved = shrunk || parsed.reset === true || (parsed.tail ? parsed.tail.n : 0) > prevN;
  ps.tail = parsed.tail ?? null;
  ps.kind = parsed.kind ?? null;
  let newCalls = 0;
  for (const c of parsed.calls ?? []) {
    const u = usageOf(c.usage);
    if (c.continued && ps.last_call && ps.last_call.id === c.id) {
      const old = usageOf(ps.last_call.usage);
      for (const k of ['input', 'cache_read', 'cache_write', 'output']) ps[k] -= old[k];
    } else {
      ps.calls += 1;
      newCalls += 1;
    }
    for (const k of ['input', 'cache_read', 'cache_write', 'output']) ps[k] += u[k];
    const context = typeof c.context === 'number' ? c.context : u.input + u.cache_read + u.cache_write;
    ps.last_call = { id: c.id, usage: u };
    ps.last_context = context;
    ps.peak_context = Math.max(num(ps.peak_context), context);
  }
  const uses = parsed.toolUses ?? [];
  if (uses.length) {
    const lr = lib.loopRun(uses);
    if (lr.run === uses.length && lr.sig === ps.loop.sig) ps.loop = { sig: lr.sig, run: ps.loop.run + lr.run };
    else ps.loop = { sig: lr.sig ?? null, run: num(lr.run) };
  }
  if (Number.isInteger(parsed.endByte) && parsed.endByte >= 0) ps.end_byte = parsed.endByte;
  return { ps, newCalls, moved };
}

function spendOfState(ps) {
  return num(ps.input) + num(ps.cache_read) + num(ps.cache_write) + num(ps.output);
}

// The current attempt's transcripts: the session's main file and helpers, else the folder's.
function transcriptSet(root, tr, row, att) {
  const out = { main: null, helpers: [] };
  const session = att && att.session ? att.session : row.session ?? null;
  if (session) {
    try {
      const st = lib.sessionTranscripts(tr, session);
      out.main = st.main ?? null;
      out.helpers = [...(st.helpers ?? [])];
    } catch {
      /* no transcripts yet */
    }
    if (out.main) return out;
  }
  let found = [];
  try {
    found = lib.transcriptsForFolder(tr, attemptDir(root, row, att ? att.epoch : row.epoch)) ?? [];
  } catch {
    found = [];
  }
  const paths = found.map((f) => f.path).sort();
  if (paths.length) {
    out.main = out.main ?? paths[0];
    for (const p of paths) if (p !== out.main && !out.helpers.includes(p)) out.helpers.push(p);
  }
  for (const sid of [...new Set(found.map((f) => f.sessionId).filter(Boolean))]) {
    try {
      for (const h of lib.sessionTranscripts(tr, sid).helpers ?? []) if (!out.helpers.includes(h)) out.helpers.push(h);
    } catch {
      /* ignore */
    }
  }
  return out;
}

// Full spend of a non-current attempt (zombie accounting): parsed whole, only when needed.
function attemptSpendFull(root, tr, row, att) {
  const set = transcriptSet(root, tr, row, att);
  const files = [set.main, ...set.helpers].filter(Boolean);
  const parsed = [];
  for (const f of files) {
    try {
      parsed.push(lib.parseTranscript(f, {}));
    } catch {
      /* unreadable: not counted */
    }
  }
  if (!parsed.length) return 0;
  return num(lib.spendOf(parsed).total);
}

// ---------------------------------------------------------------- watcher state

function freshTaskState(epoch) {
  return {
    epoch, calls: 0, stall_calls: 0, hang_ticks: 0, V: null, V_min: null, loop: { sig: null, run: 0 },
    spend: 0, window: null, zombie_tokens: 0, files: {},
    kind: null, deadline: null, age_ticks: 0, age_base: 0, // FX-W6
  };
}

// FX-W6 steps 1-3 and 5's count. `hang_ticks` counts the counted, unpaused ticks since the attempt's
// last new conversation record in any of its transcripts (an operation's start), so a new record of
// any kind restarts it; the first tick of an epoch counts nothing (not ticks_total, FIX-JOIN 2c).
// The kind is the main transcript's tail; one that cannot be read counts as `model`. `age_ticks`
// counts the counted ticks at step bound (a paused tick too, M5).
function opCount(env, ts, row, { fresh, moved, counted, paused, kind, tail }) {
  ts.kind = lib.TRANSCRIPT_KINDS.includes(kind) ? kind : 'model';
  if (fresh) { /* step 1: nothing is counted */ } else if (moved) ts.hang_ticks = 0;
  else if (counted && !paused) ts.hang_ticks = num(ts.hang_ticks) + 1;
  if (!fresh && counted && row.step === 'bound') ts.age_ticks = num(ts.age_ticks) + 1;
  ts.deadline = kindDeadline(ts.kind, tail, env.th, env.delta);
}

// The deadline in counted ticks (branch B1, marked guesses): tool = the largest declared timeout of
// its pending tool uses in ticks of delta + tool_slack_ticks; bg-wait = bg_wait_ticks; model =
// model_ticks; idle = none (never a charged hang, step 4).
function kindDeadline(kind, tail, th, delta) {
  if (kind === 'idle') return null;
  if (kind === 'bg-wait') return th.get('bg_wait_ticks');
  if (kind === 'tool') {
    const ms = Math.max(0, ...Object.values((tail && tail.pending) || {}).filter((v) => typeof v === 'number' && Number.isFinite(v)));
    const d = Number.isFinite(delta) && delta > 0 ? delta : th.get('delta_ms');
    return Math.ceil(ms / d) + th.get('tool_slack_ticks');
  }
  return th.get('model_ticks');
}

function loadWatcherState(root) {
  const s = readWatcherJson(root);
  const state = s && typeof s === 'object' ? s : {};
  return {
    schema_version: 1,
    ...state,
    ticks_total: Number.isInteger(state.ticks_total) ? state.ticks_total : 0,
    last_tick_at: state.last_tick_at ?? null,
    active: state.active && typeof state.active === 'object' ? state.active : {},
    pending: Array.isArray(state.pending) ? state.pending : [],
    tasks: state.tasks && typeof state.tasks === 'object' ? state.tasks : {},
  };
}

// FX-W7 step 3: an unparseable watcher.json is quarantined instead of exiting 67 at every restart. It
// is renamed, as found, to watcher.json.<pid>.<nonce8>.corrupt beside it, and the watcher starts from
// fresh counters (spends re-parsed from byte 0). Called only while watcher.lock is held.
function readWatcherJson(root) {
  const file = fileOf(root, 'watcherJson');
  try {
    return readState(file, 'watcher.json');
  } catch (e) {
    if (!(e && e.code === 'table-corrupt')) throw e;
    const aside = lib.tempName(file).replace(/\.tmp$/, '.corrupt');
    lib.fsRetry(() => fs.renameSync(file, aside));
    QUARANTINED.push(path.basename(aside));
    return null;
  }
}
const QUARANTINED = [];

// FX-W7 step 2: run/watcher-busy.json {ce, busy_ticks}, the busy ticks in a row. Its one writer is
// the holder of watcher.lock, without the run lock; unreadable counts as 0.
function busyTicksOf(root) {
  try {
    const v = lib.readJson(lib.paths(root).watcherBusy);
    return v && Number.isInteger(v.busy_ticks) && v.busy_ticks > 0 ? v.busy_ticks : 0;
  } catch {
    return 0;
  }
}
function writeBusy(env, n) {
  lib.writeAtomic(lib.paths(env.root).watcherBusy, JSON.stringify({ ce: env.ce, busy_ticks: n }) + '\n');
  env.busyTicks = n;
}

// FX-W7 step 2: one evaluation of a copy of the state, kept by adoptState only after its hold wrote
// watcher.json. On a busy run lock the copy is dropped, so the tick does not count and the
// transcripts are read again from the kept end_byte; only the copy's intake record is kept (an intake
// it spawned is running). Then assertHeld (a lost watcher.lock exits 75) and one more busy tick.
async function evaluateCopy(env, flags, counted) {
  const next = structuredClone(env.state);
  if (counted) next.ticks_total += 1;
  const out = await evaluate(env, next, lib.edgeFacts(flags), counted);
  if (out.busy) {
    env.handle.assertHeld();
    if (next.intake !== undefined) env.state.intake = next.intake;
    writeBusy(env, env.busyTicks + 1);
  }
  return out;
}

// FX-W7 step 2: fn(handle) in one run-lock hold that waits about watcher_lock_try_ms (retries of
// TRY_RETRY_MS, the library's wait), the ce re-checked inside (R4). False when the run lock stayed
// busy and fn did not run.
const TRY_RETRY_MS = 100;
async function holdTick(env, facts, fn) {
  const { root, th, ce, proc } = env;
  const retries = Math.max(0, Math.ceil(th.get('watcher_lock_try_ms') / TRY_RETRY_MS));
  let entered = false;
  try {
    await lib.withRunLock(root, { ...lockOpts(th, ce, proc, facts.now), retries, retryMs: TRY_RETRY_MS }, async (handle) => {
      entered = true;
      await fn(handle);
    });
  } catch (x) {
    if (!entered && x && x.code === 'lock-busy') return false;
    throw x;
  }
  return true;
}

// ---------------------------------------------------------------- one evaluation (spec step 4 a-i)

async function evaluate(env, state, facts, counted) {
  const { ctx, root, th, ce, proc, flags } = env;
  const tick = state.ticks_total;
  const tr = th.get('transcripts_root');

  // a. The ce check is the first act; then the table and the ledger chain.
  lib.checkCe(root, ce);
  const coord = readState(fileOf(root, 'coord'), 'coord.json');
  const table = lib.readTasks(root);
  const { lines } = lib.readLedger(root);
  const acked = readState(fileOf(root, 'acked'), 'acked.json');
  const ackedSeq = acked && Number.isInteger(acked.acked_seq) ? acked.acked_seq : 0;
  const runFlags = lib.runFlags(lines, ce);

  const conds = []; // {cls, task?, epoch?, sub?, detail}
  const appends = []; // ledger lines to write under the run lock
  const ver = lib.verifyLedger(lines);
  if (!ver.ok) conds.push({ cls: 27, detail: { source: 'ledger', brokenAt: ver.brokenAt ?? null, reason: ver.reason ?? null } });

  // b. Per row active at step started|bound (current attempt e).
  const activeRows = (table.tasks ?? []).filter((r) => r.state === 'active' && (r.step === 'started' || r.step === 'bound'));
  const f5Given = th.get('f5_given') === true;
  const stallMax = th.get('stall_calls');
  const loopK = th.get('loop_k');
  const softFrac = th.get('soft_frac');
  const hardFrac = th.get('hard_frac');
  const wChildGate = th.isGate('W_star_child');
  const wChild = wChildGate ? th.get('W_star_child') : null;

  // M5 (CONTRACT 1.2, decision 40): a counted tick whose wall gap since the previous evaluation is
  // more than 2 delta is a paused tick (the PC slept) and does not count toward hang. One-sided: a
  // missing, unparseable, negative or short gap counts the tick as usual.
  const prevMs = typeof state.last_tick_at === 'string' ? Date.parse(state.last_tick_at) : NaN;
  const nowMs = Date.parse(isoOf(facts.now));
  const paused = counted && Number.isFinite(prevMs) && Number.isFinite(nowMs) && Number.isFinite(env.delta)
    && nowMs - prevMs > 2 * env.delta;

  for (const row of activeRows) {
    const e = row.epoch;
    let ts = state.tasks[row.task];
    let fresh = false;
    if (!ts || ts.epoch !== e) {
      ts = freshTaskState(e); // a new epoch resets that task's counters
      state.tasks[row.task] = ts;
      fresh = true;
    }
    const att = attemptOfSafe(row, e);
    const set = transcriptSet(root, tr, row, att);
    const files = {};
    let mainState = null;
    let moved = false; // FX-W6: a new conversation record in any transcript of the attempt
    for (const abs of [set.main, ...set.helpers].filter(Boolean)) {
      const rel = lib.relPosix(tr, abs);
      const adv = advanceFile(abs, ts.files[rel]);
      const { ps } = adv;
      if (adv.moved) moved = true;
      files[rel] = ps;
      if (abs === set.main) mainState = ps;
    }
    for (const [rel, ps] of Object.entries(ts.files ?? {})) if (!(rel in files)) files[rel] = ps;
    ts.files = files;
    let calls = 0;
    let spend = 0;
    for (const ps of Object.values(files)) {
      calls += num(ps.calls);
      spend += spendOfState(ps);
    }
    // A task first seen (or a new epoch) takes its calls as the baseline: none of them is new.
    const newCalls = fresh ? 0 : Math.max(0, calls - num(ts.calls));
    ts.calls = calls;
    ts.spend = spend;
    ts.window = mainState ? num(mainState.last_context) : null;
    ts.loop = mainState ? { ...mainState.loop } : { sig: null, run: 0 };

    let V = null;
    try {
      const v = await lib.variant(root, row, { f5Given });
      V = v && typeof v.V === 'number' ? v.V : null;
    } catch (x) {
      if (x && x.exit === 3) throw x;
      V = null;
    }
    ts.V = V;
    if (V !== null) {
      if (ts.V_min === null || ts.V_min === undefined || V < ts.V_min) {
        ts.V_min = V;
        ts.stall_calls = 0;
      } else {
        ts.stall_calls = num(ts.stall_calls) + newCalls;
      }
    }
    opCount(env, ts, row, { fresh, moved: moved || newCalls > 0, counted, paused, kind: mainState ? mainState.kind : null, tail: mainState ? mainState.tail : null });

    // The READY of this epoch is an uncommitted ready slot in the outcome log (FX-OUT, FIX-JOIN 2c);
    // READY.json is read only for a repair marker, which takes no slot.
    const ready = readReady(root, row, e);
    const log = readLog(root, row, e);
    let readyCls = null;
    let readyStep = null;
    if (log && log.fenced === null && log.ready.length) {
      readyStep = log.ready[log.ready.length - 1];
      readyCls = 11;
    } else if (ready && ready.epoch === e && ready.kind === 'repair') {
      readyCls = 12;
    }
    const base = { task: row.task, epoch: e };
    if (readyCls === 11) conds.push({ ...base, cls: 11, detail: { step: readyStep } });
    else if (readyCls === 12) conds.push({ ...base, cls: 12, detail: { question_ids: Array.isArray(ready.question_ids) ? ready.question_ids : [] } });
    else {
      // A READY of this epoch voids stall, hang and loop (R5, finding A4).
      if (V !== null && ts.stall_calls >= stallMax) conds.push({ ...base, cls: 20, detail: { stall_calls: ts.stall_calls, V, V_min: ts.V_min } });
      if (ts.deadline !== null && ts.hang_ticks >= ts.deadline) conds.push({ ...base, cls: 21, detail: { hang_ticks: ts.hang_ticks, kind: ts.kind, deadline: ts.deadline } });
      if (num(ts.loop.run) >= loopK) conds.push({ ...base, cls: 22, detail: { sig: ts.loop.sig, run: ts.loop.run } });
    }
    const eTask = num(row.e_task);
    if (eTask > 0) {
      const soft = Math.floor(softFrac * eTask);
      const hard = Math.floor(hardFrac * eTask);
      if (spend >= soft) conds.push({ ...base, cls: 13, detail: { spend, soft, e_task: eTask } });
      if (spend >= hard) conds.push({ ...base, cls: 23, detail: { spend, hard, e_task: eTask } });
    }
    if (wChildGate && typeof wChild === 'number' && ts.window !== null && ts.window >= wChild) {
      conds.push({ ...base, cls: 15, detail: { window: ts.window, w_star: wChild } });
    }
  }

  // c. Zombie writes and zombie spend: attempts k < e, and fenced attempts not confirmed stopped.
  const zFrac = th.get('Z_frac');
  const zombieRows = new Set(); // FX-PLAN: rows whose zombie spend is over Z (class 25), owner rows for the planner
  for (const row of table.tasks ?? []) {
    const e = row.epoch;
    let zombieTokens = 0;
    for (const att of row.attempts ?? []) {
      const k = att.epoch;
      if (!(k < e)) continue;
      const unconfirmed = att.stop !== 'confirmed';
      const ready = readReady(root, row, k);
      const readyK = !!ready && ready.epoch === k;
      const logged = readyK && lines.some((l) => l.kind === 'zombie-write' && l.task === row.task && l.epoch === k
        && String(l.writer ?? '').replace(/\.mjs$/, '') === SCRIPT);
      if (!unconfirmed && !(readyK && !logged)) continue;
      const tokens = Math.max(0, attemptSpendFull(root, tr, row, att) - num(att.spend_at_fence));
      if (unconfirmed) zombieTokens += tokens;
      if (readyK && !logged) {
        appends.push({ kind: 'zombie-write', task: row.task, epoch: k, data: { epoch_seen: k, tokens } });
      }
    }
    if (state.tasks[row.task]) state.tasks[row.task].zombie_tokens = zombieTokens;
    const eTask = num(row.e_task);
    if (zombieTokens > 0 && zombieTokens > zFrac * eTask) {
      conds.push({ cls: 25, task: row.task, epoch: e, detail: { zombie_tokens: zombieTokens, z: zFrac * eTask } });
      zombieRows.add(row.task);
    }
  }

  // d. Memory (R10).
  const reserve = th.get('reserve_mb');
  if (typeof facts.freeMb === 'number' && Number.isFinite(facts.freeMb) && facts.freeMb < reserve) {
    conds.push({ cls: 24, detail: { free_mb: facts.freeMb, reserve_mb: reserve } });
  }

  // e. Common cause: two or more non-host fails within W_cc_ticks ticks (R8).
  const wcc = th.get('W_cc_ticks');
  const recent = [];
  for (const row of table.tasks ?? []) {
    for (const f of row.fails ?? []) {
      if (f.host === true) continue;
      if (Number.isInteger(f.tick) && tick - f.tick < wcc) {
        recent.push({ task: row.task, epoch: f.epoch ?? null, class: f.class ?? null, tick: f.tick });
      }
    }
  }
  // The largest group of those fails that also lie within W_cc_ticks of each other (only differs
  // from the plain count when a fail's tick is ahead of ticks_total).
  recent.sort((a, b) => a.tick - b.tick);
  let cluster = [];
  for (let i = 0, j = 0; j < recent.length; j++) {
    while (recent[j].tick - recent[i].tick >= wcc) i++;
    if (j - i + 1 > cluster.length) cluster = recent.slice(i, j + 1);
  }
  if (cluster.length >= 2) {
    conds.push({ cls: 26, detail: { fails: cluster } });
    // One halt per set of fails (review U1-F4): a fail already named by an earlier halt line does
    // not halt again, so an owner resume takes effect while those fails are still inside W_cc. A
    // fail no halt has named yet (a new common cause) halts again.
    const failKey = (f) => `${f.task}|${f.epoch ?? null}|${f.class ?? null}|${f.tick}`;
    const named = new Set();
    for (const l of lines) {
      if (l.kind !== 'halt' || !l.data || !Array.isArray(l.data.fails)) continue;
      for (const f of l.data.fails) if (f) named.add(failKey(f));
    }
    const fresh = cluster.some((f) => !named.has(failKey(f)));
    if (!runFlags.halted && fresh) appends.push({ kind: 'halt', data: { reason: 'common-cause', fails: cluster } });
  }

  // f. The coordinator's window (R12, R50), parsed incrementally through coord_file.
  if (coord && coord.session) {
    let main = null;
    try {
      main = lib.sessionTranscripts(tr, coord.session).main ?? null;
    } catch {
      main = null;
    }
    if (main) {
      const rel = lib.relPosix(tr, main);
      const prev = state.coord_file && state.coord_file[rel] ? state.coord_file[rel] : null;
      const { ps } = advanceFile(main, prev);
      state.coord_file = { [rel]: ps };
      const win = num(ps.last_context);
      const wStar = th.get('W_star_coord');
      const wQuality = th.get('W_quality');
      if (typeof wStar === 'number' && win >= wStar) {
        conds.push({ cls: 16, detail: { window: win, w_star: wStar } });
        if (!runFlags.draining) appends.push({ kind: 'drain', data: { window: win, w_star: wStar } });
      }
      if (typeof wQuality === 'number' && win >= wQuality) conds.push({ cls: 15, detail: { who: 'coordinator', window: win, w_quality: wQuality } });
    }
  }

  // g. Tamper incidents and reopened dismissals above acked_seq: one instance per line.
  for (const l of lines) {
    if (!(l.seq > ackedSeq)) continue;
    if (l.kind === 'incident' && l.data && l.data.detail && l.data.detail.tamper === true) {
      conds.push({ cls: 27, sub: `@${l.seq}`, detail: { source: 'incident', seq: l.seq, script: l.data.detail.script ?? null, code: l.data.detail.code ?? null } });
    }
    if (l.kind === 'check' && l.data && l.data.check === 'tms' && Array.isArray(l.data.reasons)) {
      const r = l.data.reasons.find((x) => x && x.code === 'reopened');
      if (r) conds.push({ cls: 10, sub: `@${l.seq}`, detail: { seq: l.seq, keys: r.detail ?? null } });
    }
  }

  // h. Checker batch (R4: full, or the only thing blocking).
  const batchSize = th.get('batch_size');
  const cands = ((await lib.intakeCandidates(root)) ?? []).filter((c) => !c.in_flight).length;
  if (cands >= batchSize || (cands > 0 && activeRows.length === 0)) conds.push({ cls: 14, detail: { candidates: cands, batch_size: batchSize } });

  // j. Act due (M3, CONTRACT decision 40): the planner's own predicate, so a live watcher cannot
  // stay silent while work waits. Keyed and acknowledged like every class (step 5).
  const rows = table.tasks ?? [];
  let used = Infinity;
  const counted = []; // FX-PLAN: the step-7 sessions, for the planner
  try {
    const sc = await lib.slotCount(rows, [], tr, { root, counted }); // empty process list: no PowerShell per tick
    used = num(sc && sc.live) + num(sc && sc.unknown) + num(sc && sc.unconfirmed);
  } catch (x) {
    if (x && x.exit === 3) throw x;
    used = Infinity;
  }
  const slotFree = used < num(th.get('N_max'), 0);
  const blocked = runFlags.halted === true || runFlags.draining === true;
  const svd = num(th.get('stop_verify_deltas'), 0);
  const opt = (k) => (th.has(k) ? th.get(k) : undefined);
  // FX-PLAN: the planner's facts as status has them, with the watcher's empty process list and tick.
  const plan = { ticksTotal: tick, nowMs, lease: { start_lease_ticks: opt('start_lease_ticks'), start_lease_ms: opt('start_lease_ms') },
    procList: [], counted, Hmax: opt('H_max'), zombieRows };
  let rowActs = 0;
  for (const row of rows) {
    const act = rowAct(root, tr, row, { slotFree, blocked, tick, svd, plan });
    if (!act) continue;
    rowActs += 1;
    conds.push({ cls: 17, task: row.task, epoch: row.epoch, act, detail: { act } });
  }
  actDueIdleAgeCap(env, state, conds, { rows, tick, lines, ackedSeq });
  if (runFlags.draining === true && used === 0) conds.push({ cls: 17, act: 'handover', detail: { act: 'handover' } });
  if (rows.length > 0 && rowActs === 0 && rows.every((r) => TERMINAL.has(r.state))) {
    conds.push({ cls: 17, act: 'run-terminal', detail: { act: 'run-terminal' } });
  }

  // i. Intake: spawned detached, never awaited (R4).
  if (!flags['no-intake'] && activeRows.length > 0) {
    let alive = false;
    if (state.intake && state.intake.pid) {
      try {
        alive = (await proc.alive(state.intake.pid, state.intake.start_time ?? null)) === true;
      } catch {
        alive = false;
      }
    }
    if (!alive) state.intake = await spawnIntake(root, ce, proc);
  }

  // 5. Events keyed by onset (CONTRACT 3.10). Class 17 names its act in the second part.
  const identOf = (c) => (c.cls === 17
    ? `17|${c.task ?? '-'}:${c.act}|${c.epoch ?? '-'}`
    : `${c.cls}|${c.task ?? c.sub ?? '-'}|${c.epoch ?? '-'}`);

  // j (end). An `event` line above acked_seq whose condition has cleared no longer wakes through its
  // own key; it is still work for the coordinator (R6 acts on ledger events after the acked seq).
  const presentIdents = new Set(conds.map(identOf));
  const orphans = [];
  for (const l of lines) {
    if (l.kind !== 'event' || !(l.seq > ackedSeq) || !l.data || typeof l.data.key !== 'string') continue;
    const ident = l.data.key.slice(0, l.data.key.lastIndexOf('|'));
    if (ident === '17|-:events|-' || presentIdents.has(ident)) continue;
    orphans.push(l.seq);
  }
  if (orphans.length) conds.push({ cls: 17, act: 'events', detail: { act: 'events', seqs: orphans } });

  const present = [];
  const seenIdent = new Set();
  for (const c of conds) {
    const ident = identOf(c);
    if (seenIdent.has(ident)) continue;
    seenIdent.add(ident);
    present.push({ ...c, ident });
  }
  const eventSeq = new Map();
  for (const l of lines) if (l.kind === 'event' && l.data && typeof l.data.key === 'string') eventSeq.set(l.data.key, l.seq);
  reraiseStuck(env, state, present, tick, { eventSeq, ackedSeq });
  const newActive = {};
  for (const c of present) {
    let key = Object.keys(state.active).find((k) => k.slice(0, k.lastIndexOf('|')) === c.ident);
    if (!key) {
      key = `${c.ident}|${tick}`;
      appends.push({
        kind: 'event',
        task: c.task ?? undefined,
        epoch: c.epoch ?? undefined,
        data: { class: CLASS_SLUG[c.cls], code: c.cls, urgent: isUrgent(c.cls), detail: c.detail ?? null, key },
      });
    }
    newActive[key] = Number.isInteger(state.active[key]) ? state.active[key] : tick;
    c.key = key;
  }
  state.active = newActive;

  // FX-W7 step 2: one run-lock hold per evaluation, with a short wait (holdTick): assertHeld of
  // watcher.lock, the ledger appends (ce re-checked inside the lock, R4) and the watcher.json write.
  // A busy run lock writes nothing here: the caller drops this copy and counts a busy tick.
  let result = null;
  const held = await holdTick(env, facts, async (handle) => {
    env.handle.assertHeld();
    try {
      for (const a of appends) {
        const line = { ctx, ce, kind: a.kind, data: a.data, now: facts.now };
        if (a.task !== undefined) line.task = a.task;
        if (a.epoch !== undefined) line.epoch = a.epoch;
        const written = await lib.appendLedger(root, handle, line);
        if (a.kind === 'event' && written && Number.isInteger(written.seq)) eventSeq.set(a.data.key, written.seq);
      }
    } catch (x) {
      // A broken ledger tail refuses appends; the tamper class still wakes the coordinator.
      if (!(x && x.exit === 3 && present.some((c) => c.cls === 27))) throw x;
    }

    // Which keys are due: their event line is above acked_seq (no line found counts as due).
    const isDue = (key) => {
      const s = eventSeq.get(key);
      return s === undefined || s > ackedSeq;
    };
    const due = present.filter((c) => isDue(c.key));
    const coalesce = th.get('coalesce_ticks');
    const pending = [];
    for (const c of due) {
      if (isUrgent(c.cls)) continue;
      const old = state.pending.find((p) => p.key === c.key);
      const entry = old ?? { key: c.key, class: c.cls, first_tick: tick };
      if (!old && c.task) entry.task = c.task;
      pending.push(entry);
    }
    state.pending = pending;
    const ripe = pending.some((p) => tick - p.first_tick >= coalesce);
    const urgentDue = due.some((c) => isUrgent(c.cls));
    let classes = [];
    if (ripe || urgentDue) classes = PRECEDENCE.filter((cl) => due.some((c) => c.cls === cl));

    // 6. watcher.json (assertHeld first), then this copy becomes the state.
    state.last_tick_at = isoOf(facts.now);
    env.handle.assertHeld();
    lib.writeAtomic(fileOf(root, 'watcherJson'), JSON.stringify(state) + '\n');
    adoptState(env, state);

    result = {
      exit: classes.length ? classes[0] : 0,
      classes,
      paused,
      reasons: classes.length
        ? due
            .filter((c) => classes.includes(c.cls))
            .sort((a, b) => PRECEDENCE.indexOf(a.cls) - PRECEDENCE.indexOf(b.cls))
            .map((c) => ({ code: CLASS_SLUG[c.cls], detail: { key: c.key, task: c.task ?? null, epoch: c.epoch ?? null, ...(c.detail ?? {}) } }))
        : [],
    };
  });
  return held ? result : { busy: true, exit: 0, classes: [], paused, reasons: [] };
}

async function spawnIntake(root, ce, proc) {
  // The intake is this very file: found from import.meta.url, never through a fixed tcb/scripts path.
  const script = fileURLToPath(import.meta.url);
  const child = spawn(process.execPath, [script, '--intake', '--root', root, '--ce', String(ce)], {
    detached: true, stdio: 'ignore', windowsHide: true, cwd: root, shell: false,
  });
  child.on('error', () => {});
  child.unref();
  const pid = child.pid ?? null;
  let startTime = null;
  if (pid !== null) {
    try {
      const list = await proc.list();
      const me = Array.isArray(list) ? list.find((p) => Number(p.pid) === Number(pid)) : null;
      startTime = me ? me.start_time ?? null : null;
    } catch {
      startTime = null;
    }
  }
  return { pid, start_time: startTime };
}

// ---------------------------------------------------------------- watcher and --once

async function runWatcher(ctx, root, flags, once) {
  const ce = flags.ce;
  lib.checkCe(root, ce); // step 1: stale -> 64 at once
  const th = lib.thresholds(root);
  const proc = lib.realProc({ exe: th.get('proc_exe') });
  const delta = Number.isInteger(flags['interval-ms']) ? flags['interval-ms'] : th.get('delta_ms');
  const facts0 = lib.edgeFacts(flags);
  const handle = await lib.acquireLock(root, 'watcher.lock', { script: SCRIPT, ce, proc, now: facts0.now, retries: th.get('lock_retries') });
  try {
    const state = loadWatcherState(root); // corrupt -> quarantined (FX-W7 step 3)
    const self = await lib.selfInfo(proc);
    state.ce = ce;
    state.pid = self.pid;
    state.start_time = self.start_time;
    // env.state: the kept state; each tick evaluates a copy (evaluateCopy, FX-W7 step 2).
    const env = { ctx, root, th, ce, proc, flags, handle, delta, state, busyTicks: busyTicksOf(root) };
    const run = once ? 'once' : 'watcher';
    let out;
    if (once) {
      out = await evaluateCopy(env, flags, true);
      if (out.busy) throw err('lock-busy', 75, { lock: 'run.lock', busy_ticks: env.busyTicks });
    } else {
      // A new watcher re-evaluates everything once without counting a tick (R6). A busy run lock
      // drops that evaluation (FX-W7): it is made again, still uncounted, and the watcher never
      // exits on a busy tick (no wake loop, B6.1).
      let counted = false;
      for (;;) {
        out = await evaluateCopy(env, flags, counted);
        if (!out.busy) {
          if (out.exit !== 0) break;
          counted = true;
        }
        await sleep(delta);
      }
    }
    return {
      exit: out.exit,
      result: {
        run, classes: out.classes, ticks_total: env.state.ticks_total, pending: env.state.pending, paused: out.paused === true,
        ...(QUARANTINED.length ? { quarantined: QUARANTINED[0] } : {}),
      },
      reasons: out.reasons,
    };
  } finally {
    try {
      await handle.release();
    } catch {
      /* release is idempotent; a lost lock has nothing to release */
    }
  }
}

// ---------------------------------------------------------------- --alarm

async function runAlarm(ctx, root, flags) {
  const ce = flags.ce;
  lib.checkCe(root, ce);
  const th = lib.thresholds(root);
  const proc = lib.realProc({ exe: th.get('proc_exe') });
  const sleepMs = Number.isInteger(flags['sleep-ms']) ? flags['sleep-ms'] : th.get('alarm_ms');
  const facts = lib.edgeFacts(flags);
  let previous = null;
  try {
    previous = lib.readJson(fileOf(root, 'alarm'));
  } catch {
    previous = null;
  }
  const self = await lib.selfInfo(proc);
  // M1 (CONTRACT 3.9, decision 40): the arm token is run/acked.json, which every endturn rewrites.
  // Read before alarm.json is written, so an endturn after this alarm registered always re-arms it.
  let token = armToken(root);
  const record = { schema_version: 1, pid: self.pid, start_time: self.start_time, ce, armed_at: isoOf(facts.now), sleep_ms: sleepMs };
  // the alarm's registration, for the round-3 steps (S0.5): handle is set in the hold only
  const reg = { root, ce, th, proc, flags, facts, self, record, handle: null, registered: false };
  try {
    await lib.withRunLock(root, lockOpts(th, ce, proc, facts.now), async (handle) => {
      handle.assertHeld();
      reg.handle = handle;
      alarmSlotTurnSeq(reg);
      alarmRegisterSlot(reg);
      lib.writeAtomic(fileOf(root, 'alarm'), JSON.stringify(record) + '\n');
      reg.registered = true;
    });
  } catch (e) {
    reg.handle = null;
    // FX-W1: alarm.json written, then the hold failed (its lock lost at the release, 75): an exit after registration
    if (reg.registered) alarmExit(reg, e && Number.isInteger(e.exit) ? e.exit : 70);
    throw e;
  }
  reg.handle = null;
  const result = { run: 'alarm', previous, armed: record, rearms: 0 };
  let out = null;
  try {
    for (;;) {
      await sleep(sleepMs);
      lib.checkCe(root, ce); // a newer ce -> 64
      let cur = null;
      try {
        cur = lib.readJson(fileOf(root, 'alarm'));
      } catch {
        cur = null;
      }
      const mine = !!cur && Number(cur.pid) === Number(self.pid)
        && (cur.start_time === self.start_time || lib.sameStartTime(cur.start_time, self.start_time));
      if (!mine) {
        out = { exit: 0, result: { ...result, superseded: true }, reasons: [{ code: 'superseded', detail: cur ? { pid: cur.pid ?? null } : null }] };
        break;
      }
      const now = armToken(root);
      if (now === token) break; // a whole period with no endturn: the long silence
      token = now; // re-armed by an endturn: sleep one more period (nothing written, no clock read)
      result.rearms += 1;
    }
    if (!out) out = { exit: 30, result: { ...result, superseded: false }, reasons: [{ code: 'alarm', detail: { sleep_ms: sleepMs, rearms: result.rearms } }] };
  } catch (e) {
    alarmExit(reg, e && Number.isInteger(e.exit) ? e.exit : 70); // an error exit after registration
    throw e;
  }
  return alarmExit(reg, out);
}

// ---------------------------------------------------------------------------------------------
// the round-3 steps of watch (S0.5; FIX-JOIN point 11): each is empty until its fix fills it.

// FX-W3: the slot record's turn_seq_at_reg (turn.json's turn_seq), in the registration hold.
function alarmSlotTurnSeq(reg) { // eslint-disable-line no-unused-vars
}

// FX-W2: the ensure's slot record run/arm/slot-<k>.json, in the registration hold.
function alarmRegisterSlot(reg) { // eslint-disable-line no-unused-vars
}

// Every exit after registration passes here: `out` is the output of a normal exit (30, or 0
// superseded) or the exit code of an error exit (64 included). Returns `out` unchanged.
function alarmExit(reg, out) {
  const exit = typeof out === 'number' ? out : out.exit;
  if (exit === 30) alarmUnarmedRecord(reg);
  alarmExitMarker(reg, exit);
  return out;
}

// FX-W3: on exit 30, the unarmed record run/arm/unarmed-<pt>.json when turn.json's turn_seq has not moved.
function alarmUnarmedRecord(reg) { // eslint-disable-line no-unused-vars
}

// FX-W1: the exit marker run/arm/exited-<pt>.json {ce, exit, at}, a lock-free strict create.
// It makes run/arm/ when absent. A failure costs one stderr line and leaves the exit code as it was:
// readers then judge this alarm by the process list alone.
function alarmExitMarker(reg, exit) {
  try {
    const at = isoOf(lib.edgeFacts(reg.flags).now);
    const file = lib.paths(reg.root).armExited(reg.self.pid, reg.self.start_time);
    lib.createExclusive(file, JSON.stringify({ ce: reg.ce, exit, at }) + '\n');
  } catch (e) {
    process.stderr.write(`watch --alarm: exit marker not written: ${(e && (e.code || e.message)) || e}\n`);
  }
}

// FX-W6: the act-due `idle-child` (idle_ticks) and `age-cap` (attempt_max_ticks) for the coordinator,
// added to the act-due set after the row acts; they are not row acts. Both are uncharged and fence
// nothing. idle-child: the main transcript's kind is `idle` for idle_ticks counted ticks (step 4).
// age-cap: age_ticks - age_base >= attempt_max_ticks (step 5); the coordinator's acknowledgement of
// its event line (seq <= acked_seq, the endturn) lets the attempt continue and re-arms the cap
// (age_base = age_ticks). A READY of the current epoch (class 11 or 12) voids both, as it voids hang.
function actDueIdleAgeCap(env, state, conds, { rows, lines = [], ackedSeq = 0 }) {
  let idleMax;
  let ageMax;
  for (const row of rows) {
    if (row.state !== 'active' || (row.step !== 'started' && row.step !== 'bound')) continue;
    const ts = state.tasks[row.task];
    const e = row.epoch;
    if (!ts || ts.epoch !== e) continue;
    if (conds.some((c) => (c.cls === 11 || c.cls === 12) && c.task === row.task && c.epoch === e)) continue;
    idleMax ??= env.th.get('idle_ticks');
    ageMax ??= env.th.get('attempt_max_ticks');
    const base = { cls: 17, task: row.task, epoch: e };
    if (ts.kind === 'idle' && num(ts.hang_ticks) >= idleMax) {
      conds.push({ ...base, act: 'idle-child', detail: { act: 'idle-child', idle_ticks: ts.hang_ticks } });
    }
    const ident = `17|${row.task}:age-cap|${e}`;
    const key = Object.keys(state.active ?? {}).find((k) => k.slice(0, k.lastIndexOf('|')) === ident);
    if (key) {
      let seq;
      for (const l of lines) if (l.kind === 'event' && l.data && l.data.key === key) seq = l.seq;
      if (Number.isInteger(seq) && seq <= ackedSeq) ts.age_base = num(ts.age_ticks);
    }
    if (num(ts.age_ticks) - num(ts.age_base) >= ageMax) {
      conds.push({ ...base, act: 'age-cap', detail: { act: 'age-cap', age_ticks: ts.age_ticks, attempt_max_ticks: ageMax } });
    }
  }
}

// FX-W5: the re-raise of an act still due at the capped interval and its `stuck` count (stuck_raises),
// over the whole present set, before the active keys are renewed.
//
// FIX-wake.md FX-W5 steps 2-3, branch R1 (build/branches.md row 6). Raised again: every act-due (17)
// but `run-terminal` (its condition never clears), and stall, hang and loop (20-22), the set the model
// checked R1 with (ABLATION-wake.md:234-235). The interval before raise n + 1 after n raises is
// min(RERAISE_BASE_TICKS x 2^b, RERAISE_CAP_TICKS) ticks, b = min(n, RERAISE_B_MAX): 15, 30, 60, 60.
// Both tick counts are marked guesses kept here (slice 1 writes no thresholds.json key).
const RERAISE_CLASSES = new Set([17, 20, 21, 22]);
const RERAISE_BASE_TICKS = 15; // a guess (FIX-wake.md FX-W5 step 2)
const RERAISE_CAP_TICKS = 60; // a guess (FIX-wake.md FX-W5 step 2)
const RERAISE_B_MAX = 2;
const STUCK_RAISES_DEFAULT = 3; // the design's stuck_raises, used when thresholds.json lacks a valid one

const reraiseInterval = (n) => Math.min(RERAISE_BASE_TICKS * 2 ** Math.min(n, RERAISE_B_MAX), RERAISE_CAP_TICKS);

// stuck_count after n raises: one per raise made once b was at its cap, i.e. after the raises at 15,
// 30 and 60 ticks (FIX-wake.md:54: 15 + 30 + 60, then 3 x 60 = 285 ticks, about 4.75 h at delta 60 s).
const stuckCount = (n) => Math.max(0, n - (RERAISE_B_MAX + 1));

// Threshold stuck_raises; missing, or not a positive integer, falls back to the design's 3.
function stuckRaisesOf(th) {
  let v;
  try {
    v = th.get('stuck_raises');
  } catch (x) {
    if (x && x.code === 'param-missing') return STUCK_RAISES_DEFAULT;
    throw x;
  }
  return Number.isInteger(v) && v >= 1 ? v : STUCK_RAISES_DEFAULT;
}

// A present ident of those classes whose key's event line is acknowledged (seq <= acked_seq) and whose
// last raise (the key's tick) is at least the interval old is raised again: its key leaves `active`, so
// the keying below gives it a new key <ident>|<tick> and one new event line with detail.reraise = n + 1.
// An unacknowledged key is due anyway. `reraise` {ident: n >= 1} and `stuck` [ident] are rebuilt from
// the present idents each evaluation: an ident leaving the active set leaves both (step 3).
function reraiseStuck(env, state, present, tick, { eventSeq, ackedSeq }) {
  const limit = stuckRaisesOf(env.th);
  const prev = state.reraise && typeof state.reraise === 'object' ? state.reraise : {};
  const reraise = {};
  const stuck = [];
  for (const c of present) {
    if (!RERAISE_CLASSES.has(c.cls) || (c.cls === 17 && c.act === 'run-terminal')) continue;
    const key = Object.keys(state.active).find((k) => k.slice(0, k.lastIndexOf('|')) === c.ident);
    if (!key) continue; // a new onset: the keying below raises it
    let n = Number.isInteger(prev[c.ident]) && prev[c.ident] > 0 ? prev[c.ident] : 0;
    const seq = eventSeq.get(key);
    let last = Number.isInteger(state.active[key]) ? state.active[key] : Number(key.slice(key.lastIndexOf('|') + 1));
    if (!Number.isFinite(last)) last = -Infinity;
    if (seq !== undefined && seq <= ackedSeq && tick - last >= reraiseInterval(n)) {
      delete state.active[key];
      n += 1;
      c.detail = { ...(c.detail ?? {}), reraise: n };
    }
    if (n > 0) reraise[c.ident] = n;
    if (stuckCount(n) >= limit) stuck.push(c.ident);
  }
  state.reraise = reraise;
  state.stuck = stuck.sort();
}

// FX-W7: the tick's state is kept only when its hold succeeded (the copy `next`), after watcher.json.
function adoptState(env, state) { // eslint-disable-line no-unused-vars
  env.state = state;
  if (env.busyTicks) writeBusy(env, 0); // a successful hold resets the busy count
}

// The alarm's arm token: the sha256 of run/acked.json's bytes, null when it cannot be read.
function armToken(root) {
  try {
    return lib.sha256hex(fs.readFileSync(fileOf(root, 'acked')));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- --intake

// Threshold intake_step_timeout_ms (ms one intake step may run before spawnSync ends it). Until the
// shared thresholds.json carries it, a missing parameter falls back to 30 minutes.
const INTAKE_STEP_TIMEOUT_DEFAULT_MS = 30 * 60 * 1000;
function intakeStepTimeoutMs(th) {
  let v;
  try {
    v = th.get('intake_step_timeout_ms');
  } catch (x) {
    if (x && x.code === 'param-missing') return INTAKE_STEP_TIMEOUT_DEFAULT_MS;
    throw x;
  }
  return Number.isInteger(v) && v > 0 ? v : INTAKE_STEP_TIMEOUT_DEFAULT_MS;
}

async function runIntake(ctx, root, flags) {
  const ce = flags.ce;
  lib.checkCe(root, ce);
  const th = lib.thresholds(root);
  const table = lib.readTasks(root);
  const steps = [];
  for (const row of table.tasks ?? []) {
    if (row.state !== 'active' || (row.step !== 'started' && row.step !== 'bound')) continue;
    steps.push(['harvest.mjs', ['--task', row.task, '--epoch', String(row.epoch)]]);
    steps.push(['commit.mjs', ['intake', '--task', row.task, '--epoch', String(row.epoch)]]);
  }
  if (th.get('f5_given') === true) steps.push(['snap.mjs', ['--new']]);
  steps.push(['witness.mjs', []], ['promote.mjs', ['--from', 'witness']], ['tms.mjs', []], ['status.mjs', []]);

  // Review U1-F6: one step that never exits must not block every later intake. spawnSync's timeout
  // ends only its own child; a timeout counts as exit 70 (one not-run incident) and the intake goes on.
  const stepTimeout = intakeStepTimeoutMs(th);
  let proc = null;
  const done = [];
  for (const [script, a] of steps) {
    const args = [...a, '--root', root, '--ce', String(ce)];
    // Sibling scripts are found beside this file (import.meta.url), not under a fixed tcb/scripts path.
    const r = spawnSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), script), ...args], {
      cwd: root, shell: false, windowsHide: true, stdio: 'ignore', timeout: stepTimeout, killSignal: 'SIGTERM',
    });
    const timedOut = !!(r.error && r.error.code === 'ETIMEDOUT');
    const exit = !timedOut && typeof r.status === 'number' ? r.status : 70;
    done.push(timedOut ? { script, args, exit, timeout: true } : { script, args, exit });
    if (exit === 64 || exit === 3) {
      return {
        exit,
        result: { run: 'intake', steps: done },
        reasons: [{ code: exit === 64 ? 'stale-ce' : 'tamper', detail: { script } }],
      };
    }
    if (![0, 1, 6, 10].includes(exit)) {
      proc = proc ?? lib.realProc({ exe: th.get('proc_exe') });
      const facts = lib.edgeFacts(flags);
      await lib.withRunLock(root, lockOpts(th, ce, proc, facts.now), async (handle) => {
        const detail = timedOut ? { script, exit, timeout: true } : { script, exit };
        await lib.recordIncident(root, handle, { ctx, ce, cls: 'not-run', detail, now: facts.now });
      });
    }
  }
  return { exit: 0, result: { run: 'intake', steps: done } };
}

// ---------------------------------------------------------------- main

async function main(ctx) {
  const { flags } = lib.parseArgs(process.argv.slice(2), { flags: FLAGS });
  ctx.mode = null;
  ctx.dryRun = false;
  const picked = ['once', 'alarm', 'intake'].filter((m) => flags[m] === true);
  if (picked.length > 1) throw err('usage', 66, { expect: '--once, --alarm and --intake are exclusive', given: picked });
  if (typeof flags.root !== 'string' || !path.isAbsolute(flags.root)) throw err('usage', 66, { flag: 'root', expect: 'absolute path' });
  if (!Number.isInteger(flags.ce) || flags.ce < 1) throw err('usage', 66, { flag: 'ce', expect: 'integer >= 1' });
  for (const f of ['interval-ms', 'sleep-ms']) {
    if (flags[f] !== undefined && (!Number.isInteger(flags[f]) || flags[f] < 0)) throw err('usage', 66, { flag: f });
  }
  const root = path.resolve(flags.root);

  let out;
  if (picked[0] === 'alarm') out = await runAlarm(ctx, root, flags);
  else if (picked[0] === 'intake') out = await runIntake(ctx, root, flags);
  else out = await runWatcher(ctx, root, flags, picked[0] === 'once');
  return { mode: null, dry_run: false, reasons: [], ...out };
}

lib.runMain(import.meta.url, SCRIPT, main);
