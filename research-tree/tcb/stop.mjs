// stop.mjs (unit U1a): fence-first stop (R9).
// CONTRACT.md §3.6 (target attempt, step machine), §3.22 [stop-sample], §6 (no kill, no sleep),
// spec/stop.mjs.md. `request` records that the target attempt must be stopped; after the coordinator
// has stopped the session with its own tool, `verify` checks over `stop_verify_deltas` watcher ticks
// that no transcript of that session or its helpers grows, reports (never kills) processes that name
// the attempt, counts zombie spend, and on a confirmed stop sets the row's terminal disposition.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lib from './lib.mjs';

const SCRIPT = 'stop';
const MODES = ['request', 'verify'];
const TASK_RE = /^(?!(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:$|\.))[a-z][a-z0-9-]{1,39}$/;

const SPEC = {
  modes: MODES,
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    task: { type: 'string', required: true },
    epoch: { type: 'int', required: true },
    now: { type: 'string' },
    'dry-run': { type: 'bool' },
  },
};

// ---------------------------------------------------------------------------------------------
// helpers

function tcbError(code, exit, detail = null) {
  if (typeof lib.TcbError === 'function') return new lib.TcbError(code, exit, detail);
  const e = new Error(code);
  e.name = 'TcbError';
  e.code = code;
  e.exit = exit;
  e.detail = detail;
  return e;
}

const usage = (detail) => tcbError('usage', 66, detail);

function safe(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function pathKey(p) {
  const r = path.resolve(p);
  return process.platform === 'win32' ? r.toLowerCase() : r;
}

function posix(p) {
  return String(p).replace(/\\/g, '/');
}

function thresholdReader(root) {
  const t = lib.thresholds(root);
  return {
    get(name, dflt) {
      try {
        return t.get(name);
      } catch (e) {
        if (dflt !== undefined && e && e.code === 'param-missing') return dflt;
        throw e;
      }
    },
  };
}

function readTicks(root) {
  try {
    const w = lib.readJson(path.join(root, 'run', 'watcher.json'));
    return typeof w.ticks_total === 'number' && Number.isInteger(w.ticks_total) ? w.ticks_total : null;
  } catch (e) {
    if (e && e.exit === 2) return null;
    throw e;
  }
}

function samplePath(root, task, epoch) {
  return path.join(root, 'run', 'stop-sample', `${task}-e${epoch}.json`);
}

function readSample(file) {
  try {
    const v = lib.readJson(file);
    return v && typeof v === 'object' ? v : null;
  } catch (e) {
    if (e && e.exit === 2) return null;
    throw e;
  }
}

function attemptIndex(row, e) {
  lib.attemptOf(row, e); // no-attempt 2 when absent
  return row.attempts.findIndex((a) => a && a.epoch === e);
}

/** The target attempt (CONTRACT §3.6): e for a committed row, e−1 after a fence. */
function targetEpoch(row) {
  return row.state === 'committed' ? row.epoch : row.epoch - 1;
}

/**
 * Transcript files of the target attempt: its session (main + helpers), and every session whose
 * transcript names the attempt folder as cwd (main + helpers). Parsing happens outside the lock.
 */
function targetTranscripts(transcriptsRoot, root, att) {
  const sessions = [];
  const folderSessions = [];
  const files = new Map();
  const addFile = (p) => {
    if (typeof p === 'string' && p) files.set(pathKey(p), path.resolve(p));
  };
  if (att && att.session) sessions.push(att.session);
  const folderAbs = att && att.folder ? path.resolve(root, att.folder) : null;
  if (folderAbs) {
    for (const f of safe(() => lib.transcriptsForFolder(transcriptsRoot, folderAbs), []) ?? []) {
      if (!f || !f.sessionId) continue;
      if (!folderSessions.includes(f.sessionId)) folderSessions.push(f.sessionId);
      if (!sessions.includes(f.sessionId)) sessions.push(f.sessionId);
      addFile(f.path);
    }
  }
  for (const s of sessions) {
    const st = safe(() => lib.sessionTranscripts(transcriptsRoot, s), null);
    if (!st) continue;
    addFile(st.main);
    for (const h of st.helpers ?? []) addFile(h);
  }
  return { sessions, folderSessions, folderAbs, files: [...files.values()].sort() };
}

function spendTotal(files) {
  const parsed = [];
  for (const f of files ?? []) {
    try {
      parsed.push(lib.parseTranscript(f));
    } catch {
      /* a vanished transcript adds nothing */
    }
  }
  if (!parsed.length) return 0;
  const s = lib.spendOf(parsed);
  return Number(s && s.total) || 0;
}

function allAttemptsSpend(transcriptsRoot, root, row) {
  let total = 0;
  for (const a of row.attempts ?? []) total += spendTotal(targetTranscripts(transcriptsRoot, root, a).files);
  return total;
}

/** Byte sizes keyed by posix path relative to transcripts_root. */
function sizesOf(transcriptsRoot, files) {
  const sizes = {};
  for (const f of files) {
    let size;
    try {
      size = fs.statSync(f).size;
    } catch {
      continue;
    }
    let key;
    try {
      key = lib.relPosix(transcriptsRoot, f);
    } catch {
      key = posix(path.relative(transcriptsRoot, f));
    }
    sizes[key] = size;
  }
  return sizes;
}

/** The terminal disposition on reaching stopped (not for a committed row). */
function dispose(row) {
  if (row.state === 'committed') return;
  if (row.limit) row.state = 'failed';
  else if (row.reason === 'cut') row.state = 'cut';
  else if (row.reason === 'drop') row.state = 'dropped';
  else if (row.reason === 'memory') row.state = 'parked';
  else row.state = 'active';
}

function predictState(row) {
  const copy = { ...row };
  dispose(copy);
  return copy.state;
}

// ---------------------------------------------------------------------------------------------
// the environment, the lock and the incident lines

function incident(env, handle, cls, detail, task, epoch) {
  try {
    lib.recordIncident(env.root, handle, { ctx: env.ctx, ce: env.ce, cls, detail, task, epoch, now: env.now });
  } catch (e) {
    process.stderr.write(`[stop] incident line not written: ${e && e.message}\n`);
  }
}

function noteIncident(env, handle, e, task, epoch) {
  if (!e || typeof e.exit !== 'number') return;
  if (e.exit === 1) incident(env, handle, 'refusal', { code: e.code, detail: e.detail ?? null }, task, epoch);
  else if (e.exit === 2) incident(env, handle, 'not-run', { code: e.code, detail: e.detail ?? null }, task, epoch);
  else if (e.exit === 3 && e.code !== 'run-from-attempt' && e.code !== 'ledger-broken') {
    incident(env, handle, 'refusal', { tamper: true, script: SCRIPT, code: e.code }, task, epoch);
  }
}

async function underLock(env, fn, task, epoch) {
  if (env.dry) {
    lib.checkCe(env.root, env.ce);
    return fn(null);
  }
  return await lib.withRunLock(env.root, { script: SCRIPT, ce: env.ce, proc: env.proc, now: env.now, retries: env.retries }, (handle) => {
    try {
      return fn(handle);
    } catch (e) {
      noteIncident(env, handle, e, task, epoch);
      throw e;
    }
  });
}

function append(env, handle, kind, task, epoch, data) {
  return lib.appendLedger(env.root, handle, { ctx: env.ctx, ce: env.ce, kind, task, epoch, data, now: env.now });
}

function findRow(table, task) {
  const row = (table.tasks ?? []).find((r) => r && r.task === task);
  if (!row) throw tcbError('no-task', 1, { task });
  return row;
}

/** Writes the overflow line of a confirmed cut (R11), from the row as it now stands. */
function overflowIfCut(env, handle, row, T, E, tokens) {
  if (row.state !== 'cut') return null;
  const v = lib.variant(env.root, row, { f5Given: env.f5Given }) ?? {};
  const ids = Array.isArray(v.uncovered) ? v.uncovered : [];
  if (handle) append(env, handle, 'overflow', T, E, { ids, tokens, reason: 'cut' });
  return { ids, tokens };
}

// ---------------------------------------------------------------------------------------------
// request

async function modeRequest(env, T, E) {
  const { root, transcriptsRoot } = env;

  // Outside the lock: the target's folder transcripts (a session started but never bound).
  const table0 = lib.readTasks(root);
  const row0 = (table0.tasks ?? []).find((r) => r && r.task === T) ?? null;
  let pre = null;
  if (row0 && row0.epoch === E) {
    const k = targetEpoch(row0);
    const att = safe(() => lib.attemptOf(row0, k), null);
    if (att) {
      const tt = targetTranscripts(transcriptsRoot, root, att);
      pre = { k, tt, allSpend: row0.reason === 'cut' && row0.state !== 'committed' ? allAttemptsSpend(transcriptsRoot, root, row0) : 0 };
    }
  }

  return await underLock(
    env,
    (handle) => {
      const table = lib.readTasks(root);
      const row = findRow(table, T);
      if (row.epoch !== E) throw tcbError('stale-epoch', 65, { expected: E, actual: row.epoch });
      if (row.step === 'stop-requested' || row.step === 'stopped') {
        return { exit: 0, result: { task: T, epoch: E, step: row.step, state: row.state, repeat: true }, reasons: [] };
      }
      const fenced = row.step === 'fenced' && (row.state === 'active' || row.state === 'parked');
      const committedBound = row.state === 'committed' && row.step === 'bound';
      if (!fenced && !committedBound) throw tcbError('wrong-step', 65, { state: row.state, step: row.step });
      const k = targetEpoch(row);
      const att = lib.attemptOf(row, k);
      if (!pre || pre.k !== k) throw tcbError('rev-moved', 65, { task: T });
      const session = att.session ?? pre.tt.folderSessions[0] ?? null;
      // Review U1-F5 (R9, R10): an admitted attempt (it has a manifest) may have a session the
      // coordinator already started whose transcript is not visible yet. Without a session it is
      // still stop-requested (session null), and verify observes the folder's transcripts and
      // processes over stop_verify_deltas ticks. Only an attempt that was never admitted, or whose
      // stop an earlier verify already confirmed, is confirmed at once.
      const mayRun = !!att.manifest && att.stop !== 'confirmed';

      if (session || mayRun) {
        if (handle) {
          lib.updateRow(root, handle, { task: T, epoch: E, steps: [row.step], states: [row.state] }, (copy) => {
            const i = attemptIndex(copy, k);
            copy.attempts[i] = { ...copy.attempts[i], stop: 'requested' };
            copy.step = 'stop-requested';
            return copy;
          });
          append(env, handle, 'stop-request', T, E, { session });
        }
        return { exit: 0, result: { task: T, epoch: E, target: k, session, step: 'stop-requested', state: row.state }, reasons: [] };
      }

      // Nothing ran: never admitted (or already confirmed), no session and no transcript. Confirmed at once.
      let newRow = null;
      if (handle) {
        const out = lib.updateRow(root, handle, { task: T, epoch: E, steps: [row.step], states: [row.state] }, (copy) => {
          const i = attemptIndex(copy, k);
          copy.attempts[i] = { ...copy.attempts[i], stop: 'confirmed' };
          copy.step = 'stopped';
          dispose(copy);
          return copy;
        });
        newRow = out && out.row ? out.row : null;
        append(env, handle, 'stop', T, E, { session: null, confirmed: true, grew: [], survivors: [], zombie_tokens: 0 });
      }
      const state = newRow ? newRow.state : predictState(row);
      const rowForCut = newRow ?? { ...row, state, step: 'stopped' };
      const overflow = overflowIfCut(env, handle, rowForCut, T, E, pre.allSpend);
      const result = { task: T, epoch: E, target: k, session: null, step: 'stopped', state, confirmed: true, grew: [], survivors: [], zombie_tokens: 0 };
      if (overflow) result.overflow = overflow;
      return { exit: 0, result, reasons: [] };
    },
    T,
    E,
  );
}

// ---------------------------------------------------------------------------------------------
// verify

async function modeVerify(env, T, E) {
  const { root, transcriptsRoot } = env;

  // 1 pre-check without the lock
  const table0 = lib.readTasks(root);
  const row0 = (table0.tasks ?? []).find((r) => r && r.task === T) ?? null;
  if (!row0) {
    return await underLock(
      env,
      () => {
        throw tcbError('no-task', 1, { task: T });
      },
      T,
      E,
    );
  }
  if (row0.epoch !== E) throw tcbError('stale-epoch', 65, { expected: E, actual: row0.epoch });
  if (row0.step === 'stopped') {
    return { exit: 0, result: { task: T, epoch: E, step: 'stopped', state: row0.state, repeat: true }, reasons: [] };
  }
  if (row0.step !== 'stop-requested') throw tcbError('wrong-step', 65, { state: row0.state, step: row0.step });
  const committed = row0.state === 'committed';
  const k = targetEpoch(row0);
  const att = lib.attemptOf(row0, k);
  const tt = targetTranscripts(transcriptsRoot, root, att);
  const session = att.session ?? tt.folderSessions[0] ?? null;

  // 2 sizes now; 3 the tick
  const sizes = sizesOf(transcriptsRoot, tt.files);
  const ticks = readTicks(root);
  if (ticks === null) throw tcbError('no-watcher', 2, { file: 'run/watcher.json' });

  const recheck = (row) => {
    if (row.epoch !== E) throw tcbError('stale-epoch', 65, { expected: E, actual: row.epoch });
    if (row.step !== 'stop-requested') throw tcbError('wrong-step', 65, { state: row.state, step: row.step });
  };
  const sFile = samplePath(root, T, k); // keyed by the target attempt k (wt/<task>-e<k>)
  const sample = readSample(sFile);
  const sampleValid =
    sample && sample.task === T && sample.epoch === k && sample.target === k && typeof sample.tick === 'number' && sample.sizes && typeof sample.sizes === 'object';

  // 4 no sample (or one for another target): take it and come back later
  if (!sampleValid) {
    return await underLock(
      env,
      (handle) => {
        recheck(findRow(lib.readTasks(root), T));
        if (handle) lib.writeAtomic(sFile, JSON.stringify({ schema_version: 1, task: T, epoch: k, target: k, tick: ticks, sizes }));
        process.stderr.write('[stop] sample-a\n');
        return {
          exit: 6,
          result: { task: T, epoch: E, target: k, session, tick: ticks, files: Object.keys(sizes).length },
          reasons: [{ code: 'sampling', detail: { tick: ticks, deltas: env.deltas } }],
        };
      },
      T,
      E,
    );
  }

  // 5 not enough ticks yet
  if (ticks < sample.tick + env.deltas) {
    return {
      exit: 6,
      result: { task: T, epoch: E, target: k, session, tick: ticks, sample_tick: sample.tick },
      reasons: [{ code: 'waiting', detail: { tick: ticks, due: sample.tick + env.deltas } }],
    };
  }

  // 6 compare: growth, then processes (report only)
  const grew = Object.keys(sizes)
    .filter((key) => !Object.prototype.hasOwnProperty.call(sample.sizes, key) || sizes[key] > sample.sizes[key])
    .sort();
  let list;
  try {
    list = await env.proc.list();
  } catch (e) {
    const err = tcbError('proc-unavailable', 2, { message: e && e.message ? String(e.message) : null });
    return await underLock(
      env,
      () => {
        throw err;
      },
      T,
      E,
    );
  }
  const byPid = new Map();
  const ids = tt.sessions.length ? tt.sessions : [null];
  for (const sid of ids) {
    const m = lib.attemptProcesses(list, { folder: tt.folderAbs ?? path.join(root, 'wt', `${T}-e${k}`), sessionId: sid });
    for (const p of (m && m.matched) || []) if (p && !byPid.has(p.pid)) byPid.set(p.pid, { pid: p.pid, start_time: p.start_time ?? null, name: p.name ?? null });
  }
  const survivors = [...byPid.values()].sort((a, b) => a.pid - b.pid);
  const confirmed = grew.length === 0 && survivors.length === 0;

  // zombie spend: transcript total now minus the spend at the fence (0 for a committed row)
  let zombie = 0;
  if (!committed && typeof att.spend_at_fence === 'number') zombie = Math.max(0, spendTotal(tt.files) - att.spend_at_fence);
  const allSpend = confirmed && row0.reason === 'cut' && !committed ? allAttemptsSpend(transcriptsRoot, root, row0) : 0;

  // 7 under the lock: re-check, record
  return await underLock(
    env,
    (handle) => {
      const row = findRow(lib.readTasks(root), T);
      recheck(row);
      let newRow = null;
      if (handle) {
        const out = lib.updateRow(root, handle, { task: T, epoch: E, steps: ['stop-requested'] }, (copy) => {
          const i = attemptIndex(copy, k);
          copy.attempts[i] = { ...copy.attempts[i], stop: confirmed ? 'confirmed' : 'unconfirmed' };
          if (confirmed) {
            copy.step = 'stopped';
            dispose(copy);
          }
          return copy;
        });
        newRow = out && out.row ? out.row : null;
        if (confirmed) {
          try {
            lib.removeFile(sFile);
          } catch (e) {
            process.stderr.write(`[stop] sample not removed: ${e && e.message}\n`);
          }
        } else {
          lib.writeAtomic(sFile, JSON.stringify({ schema_version: 1, task: T, epoch: k, target: k, tick: ticks, sizes }));
        }
        append(env, handle, 'stop', T, E, { session, confirmed, grew, survivors, zombie_tokens: zombie });
      }
      const state = newRow ? newRow.state : confirmed ? predictState(row) : row.state;
      let overflow = null;
      if (confirmed) overflow = overflowIfCut(env, handle, newRow ?? { ...row, state, step: 'stopped' }, T, E, allSpend);
      const result = {
        task: T,
        epoch: E,
        target: k,
        session,
        confirmed,
        grew,
        survivors,
        zombie_tokens: zombie,
        step: confirmed ? 'stopped' : 'stop-requested',
        state,
      };
      if (overflow) result.overflow = overflow;
      if (confirmed) return { exit: 0, result, reasons: [] };

      const reasons = [{ code: 'stop-unconfirmed', detail: { grew } }];
      if (survivors.length) reasons.push({ code: 'survivors', detail: survivors });
      const eTask = typeof row.e_task === 'number' ? row.e_task : 0;
      if (zombie > env.zFrac * eTask) reasons.push({ code: 'zombie-over-z', detail: { zombie_tokens: zombie, z: env.zFrac * eTask } });
      if (handle) incident(env, handle, 'refusal', { code: 'stop-unconfirmed', detail: { grew, survivors: survivors.length, zombie_tokens: zombie } }, T, E);
      for (const s of survivors) process.stderr.write(`[stop] survivor pid ${s.pid} (${s.name ?? '?'}) names the attempt; nothing was killed\n`);
      return { exit: 1, result, reasons };
    },
    T,
    E,
  );
}

// ---------------------------------------------------------------------------------------------
// main

async function main(ctx) {
  const argv = process.argv.slice(2);
  ctx.mode = MODES.includes(argv[0]) ? argv[0] : null;
  ctx.dryRun = argv.includes('--dry-run');
  ctx.dry_run = ctx.dryRun;
  const { mode, flags } = lib.parseArgs(argv, SPEC);
  if (!MODES.includes(mode)) throw usage({ mode: mode ?? null });
  const dry = !!flags['dry-run'];
  ctx.mode = mode;
  ctx.dryRun = dry;
  ctx.dry_run = dry;

  if (typeof flags.root !== 'string' || !path.isAbsolute(flags.root)) throw usage({ flag: 'root' });
  if (!Number.isInteger(flags.ce) || flags.ce < 1) throw usage({ flag: 'ce' });
  if (typeof flags.task !== 'string' || !TASK_RE.test(flags.task)) throw usage({ flag: 'task' });
  if (!Number.isInteger(flags.epoch) || flags.epoch < 0) throw usage({ flag: 'epoch' });
  if (flags.now !== undefined && flags.now !== null && Number.isNaN(Date.parse(flags.now))) throw usage({ flag: 'now' });

  const root = path.resolve(flags.root);
  const th = thresholdReader(root);
  const edge = await lib.edgeFacts(flags);
  const env = {
    ctx,
    root,
    ce: flags.ce,
    dry,
    now: edge.now,
    retries: th.get('lock_retries', 300),
    proc: lib.realProc({ exe: th.get('proc_exe') }),
    transcriptsRoot: th.get('transcripts_root'),
    deltas: th.get('stop_verify_deltas'),
    zFrac: th.get('Z_frac'),
    f5Given: !!th.get('f5_given', false),
  };

  // An early, read-only ce check: a stale coordinator gets 64 on every path, also those that write
  // nothing (waiting); the check that guards writes runs again inside the run lock.
  lib.checkCe(root, env.ce);
  const out = mode === 'request' ? await modeRequest(env, flags.task, flags.epoch) : await modeVerify(env, flags.task, flags.epoch);
  return { exit: 0, reasons: [], ...out, mode, dry_run: dry };
}

// Node sets import.meta.url to the realpath of the entry, so argv[1] is compared by its realpath too:
// started through a junction or a symlink the script must still run (a lexical compare would skip
// main() and exit 0 with nothing printed). Same comparison as guard-hook.mjs.
function isMainModule() {
  if (import.meta.main === true) return true;
  try {
    if (typeof process.argv[1] !== 'string') return false;
    const key = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));
    const self = key(fileURLToPath(import.meta.url));
    if (key(process.argv[1]) === self) return true;
    return key(fs.realpathSync(path.resolve(process.argv[1]))) === self;
  } catch {
    return false;
  }
}

if (isMainModule()) lib.runMain(import.meta.url, SCRIPT, main);
