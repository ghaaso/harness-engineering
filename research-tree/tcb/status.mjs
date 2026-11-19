// status.mjs (unit U1b): run/status.json, the coordinator's only state (R6, R12, R20).
//   (default)   --root R --ce N [--now ISO] [--free-mb M] [--dry-run]
//   --reconcile --root R --ce N [--now ISO] [--free-mb M] [--dry-run]
//   --endturn --acked-seq K --root R --ce N [--now ISO] [--dry-run]
//   intent open --key KEY --subject S [--text-file P] --root R --ce N
//   intent done --key KEY --root R --ce N
//   owner --act approve|accept|resume|drop|ruling --subject S --quote-file P --root R --ce N
//   meter --pct P --root R --ce N
// Source of truth: CONTRACT.md (sections 1-4, 3.8, 3.9) and spec/status.mjs.md.
// Process list and transcript parses happen before the run lock (CONTRACT section 2.1).
// Endturn starts and kills nothing (decision 5).
import fs from 'node:fs';
import path from 'node:path';
import * as lib from './lib.mjs';

const SCRIPT = 'status';
const MODES = ['intent', 'owner', 'meter'];
const ACTS = ['approve', 'accept', 'resume', 'drop', 'ruling'];
const INTENT_KEY = /^(?!(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$)[a-z0-9][a-z0-9-]{0,63}$/;
const ZERO64 = '0'.repeat(64);

const F = {
  coord: 'run/coord.json',
  acked: 'run/acked.json',
  alarm: 'run/alarm.json',
  watcherJson: 'run/watcher.json',
  watcherLock: 'run/watcher.lock',
  status: 'run/status.json',
  intents: 'run/intents',
  stopSample: 'run/stop-sample',
  run: 'run',
  commits: 'store/commits',
  notes: 'plan/notes',
};

const COMMON = {
  root: { type: 'string', required: true },
  ce: { type: 'int' },
  now: { type: 'string' },
  'free-mb': { type: 'int' },
  boot: { type: 'string' },
  'dry-run': { type: 'bool' },
};
// The round-3 flags of the default mode (S0.5), each filled by its fix: FX-W2's `arm-nonces` (with
// --reconcile) and FX-W4's `deadman`.
const ARM_FLAGS = {};
const DEADMAN_FLAGS = {};
const FLAGS_BY_MODE = {
  default: { ...COMMON, reconcile: { type: 'bool' }, endturn: { type: 'bool' }, 'acked-seq': { type: 'int' }, ...ARM_FLAGS, ...DEADMAN_FLAGS },
  intent: { ...COMMON, key: { type: 'string' }, subject: { type: 'string' }, 'text-file': { type: 'string' } },
  owner: { ...COMMON, act: { type: 'string' }, subject: { type: 'string' }, 'quote-file': { type: 'string' } },
  meter: { ...COMMON, pct: { type: 'int' } },
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

const usage = (detail) => err('usage', 66, detail);

function fileOf(root, key) {
  return path.join(root, ...F[key].split('/'));
}

function attemptDir(root, row, e) {
  let att = null;
  try {
    att = lib.attemptOf(row, e);
  } catch {
    att = null;
  }
  if (att && typeof att.folder === 'string' && att.folder) {
    return path.isAbsolute(att.folder) ? att.folder : path.join(root, ...att.folder.split(/[\\/]/));
  }
  const p = typeof lib.paths === 'function' ? lib.paths(root) : null;
  if (p && typeof p.attempt === 'function') return p.attempt(row.task, e);
  return path.join(root, 'wt', `${row.task}-e${e}`);
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

function readLoose(p) {
  try {
    return lib.readJson(p);
  } catch {
    return null;
  }
}

function serialize(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

function lockOpts(th, ce, proc, now) {
  return { script: SCRIPT, ce, proc, now, retries: th.get('lock_retries') };
}

function aliveIn(procList, rec) {
  if (!rec || rec.pid === undefined || rec.pid === null) return false;
  if (!Array.isArray(procList)) return null;
  // One-sided, as lib.aliveFromQuery (lib-fix LR-2): the listed start may lie before the recorded one
  // (a record's own clock reads later than the OS creation time), never more than the tolerance after it.
  return procList.some((p) => Number(p.pid) === Number(rec.pid) && typeof rec.start_time === 'string' && typeof p.start_time === 'string' && lib.aliveFromQuery(p.start_time, rec.start_time) === true);
}

function numOrNull(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// A flag file named by --quote-file / --text-file: must resolve under <root>/plan/notes/.
function notesFile(root, p) {
  const abs = path.isAbsolute(p) ? path.resolve(p) : path.resolve(root, p);
  if (!lib.isUnder(abs, fileOf(root, 'notes'))) throw err('path-outside-root', 66, { path: p });
  let buf;
  try {
    buf = fs.readFileSync(abs);
  } catch {
    throw err('missing', 2, { path: p });
  }
  return buf;
}

function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

// ---------------------------------------------------------------- transcripts (before the lock)

function transcriptSet(root, tr, row, att) {
  const out = { main: null, helpers: [], sessions: [] };
  const session = att && att.session ? att.session : att && att.epoch === row.epoch && row.session ? row.session : null;
  if (session) {
    try {
      const st = lib.sessionTranscripts(tr, session);
      out.main = st.main ?? null;
      out.helpers = [...(st.helpers ?? [])];
      out.sessions = [session];
    } catch {
      /* no transcripts root */
    }
    if (out.main) return out;
  }
  const folder = attemptDir(root, row, att ? att.epoch : row.epoch);
  let found = [];
  try {
    found = lib.transcriptsForFolder(tr, folder) ?? [];
  } catch {
    found = [];
  }
  const sids = [...new Set(found.map((f) => f.sessionId))].sort();
  const paths = found.map((f) => f.path).sort();
  if (paths.length) {
    out.main = out.main ?? paths[0];
    for (const p of paths) if (p !== out.main) out.helpers.push(p);
  }
  for (const sid of sids) {
    try {
      for (const h of lib.sessionTranscripts(tr, sid).helpers ?? []) if (!out.helpers.includes(h)) out.helpers.push(h);
    } catch {
      /* ignore */
    }
  }
  out.sessions = out.sessions.length ? out.sessions : sids;
  return out;
}

async function gatherFacts(root, th, table, proc, { reconcile }) {
  const tr = th.get('transcripts_root');
  const anomalies = [];
  let procList = null;
  try {
    procList = await proc.list();
    if (!Array.isArray(procList)) procList = null;
  } catch {
    procList = null;
  }
  if (procList === null) anomalies.push({ code: 'proc-unavailable', detail: null });

  const cache = new Map();
  const parse = (p) => {
    if (!cache.has(p)) {
      try {
        cache.set(p, lib.parseTranscript(p, {}));
      } catch {
        cache.set(p, null);
      }
    }
    return cache.get(p);
  };

  const spend = new Map(); // `${task}|${epoch}` -> {total, window}
  for (const row of table.tasks ?? []) {
    for (const att of row.attempts ?? []) {
      const set = transcriptSet(root, tr, row, att);
      const mainParsed = set.main ? parse(set.main) : null;
      const helperParsed = set.helpers.map(parse).filter(Boolean);
      const all = [mainParsed, ...helperParsed].filter(Boolean);
      let total = 0;
      let window = null;
      if (all.length) total = numOrNull(lib.spendOf(all).total) ?? 0;
      if (mainParsed) window = numOrNull(lib.spendOf([mainParsed]).last_context);
      spend.set(`${row.task}|${att.epoch}`, { total, window });
    }
  }

  // Reconcile facts: sessions found by folder for admitted rows and for older attempts.
  const recon = [];
  if (reconcile) {
    for (const row of table.tasks ?? []) {
      if (row.state === 'active' && row.step === 'admitted') {
        recon.push({ task: row.task, epoch: row.epoch, current: true, sessions: folderSessions(root, tr, row, row.epoch) });
      }
      for (const att of row.attempts ?? []) {
        if (att.epoch === row.epoch || att.session) continue;
        const sessions = folderSessions(root, tr, row, att.epoch);
        if (sessions.length) recon.push({ task: row.task, epoch: att.epoch, rowEpoch: row.epoch, current: false, sessions });
      }
    }
  }
  return { procList, spend, anomalies, recon, tr };
}

function folderSessions(root, tr, row, e) {
  let found = [];
  try {
    found = lib.transcriptsForFolder(tr, attemptDir(root, row, e)) ?? [];
  } catch {
    found = [];
  }
  return [...new Set(found.map((f) => f.sessionId).filter(Boolean))].sort();
}

// ---------------------------------------------------------------- reconcile (under the lock)

async function applyReconcile(ctx, root, handle, pre, ce, facts, anomalies, dryTable) {
  const changes = [];
  for (const r of pre.recon) {
    if (r.sessions.length > 1) {
      anomalies.push({ code: 'several-sessions', detail: { task: r.task, epoch: r.epoch, sessions: r.sessions } });
      continue;
    }
    if (r.sessions.length !== 1) continue;
    const sid = r.sessions[0];
    if (dryTable) {
      const row = dryTable.tasks.find((x) => x.task === r.task);
      if (!row) continue;
      if (r.current) {
        if (row.epoch !== r.epoch || row.step !== 'admitted') continue;
        row.step = 'started';
        setSession(row, r.epoch, sid);
        changes.push({ task: r.task, epoch: r.epoch, session: sid, step: 'started' });
      } else {
        if (row.epoch !== r.rowEpoch) continue;
        setSession(row, r.epoch, sid);
        changes.push({ task: r.task, epoch: r.epoch, session: sid, step: null });
      }
      continue;
    }
    try {
      if (r.current) {
        const out = await lib.updateRow(root, handle, { task: r.task, epoch: r.epoch, steps: ['admitted'] }, (copy) => {
          const row = structuredClone(copy);
          row.step = 'started';
          setSession(row, r.epoch, sid);
          return row;
        });
        if (out && out.changed !== false) {
          await lib.appendLedger(root, handle, {
            ctx, ce, kind: 'started', task: r.task, epoch: r.epoch, data: { session: sid }, now: facts.now,
          });
          changes.push({ task: r.task, epoch: r.epoch, session: sid, step: 'started' });
        }
      } else {
        const out = await lib.updateRow(root, handle, { task: r.task, epoch: r.rowEpoch }, (copy) => {
          const row = structuredClone(copy);
          const att = lib.attemptOf(row, r.epoch);
          if (att.session) return copy;
          setSession(row, r.epoch, sid);
          return row;
        });
        if (out && out.changed !== false) changes.push({ task: r.task, epoch: r.epoch, session: sid, step: null });
      }
    } catch (e) {
      if (e && e.exit === 65) continue; // the row moved meanwhile: skipped (spec T9)
      throw e;
    }
  }
  return changes;
}

function setSession(row, e, sid) {
  const att = lib.attemptOf(row, e);
  att.session = sid;
}

// ---------------------------------------------------------------- the status view

function readReady(root, row, e) {
  const p = path.join(attemptDir(root, row, e), 'staging', 'READY.json');
  try {
    return { value: lib.readJson(p), bad: false };
  } catch (x) {
    if (x && x.code === 'missing') return { value: null, bad: false };
    return { value: null, bad: true };
  }
}

function commitExists(root, task, step) {
  return exists(path.join(fileOf(root, 'commits'), `${task}.${step}.json`));
}

function readyStep(root, row, ready) {
  if (typeof ready.step === 'string') return (row.steps ?? []).includes(ready.step) ? ready.step : null;
  return (row.steps ?? []).find((s) => !commitExists(root, row.task, s)) ?? null;
}

async function computeStatus(root, th, ce, pre, facts, table, anomalies) {
  const coord = readState(fileOf(root, 'coord'), 'coord.json');
  if (!coord) throw err('no-coordinator', 2, null);
  const { lines, torn } = lib.readLedger(root);
  const headLine = lines.length ? lines[lines.length - 1] : null;
  const head = headLine ? { seq: headLine.seq, hash: headLine.hash } : { seq: 0, hash: ZERO64 };
  const acked = readState(fileOf(root, 'acked'), 'acked.json');
  const ackedSeq = acked && Number.isInteger(acked.acked_seq) ? acked.acked_seq : 0;
  const watcher = readState(fileOf(root, 'watcherJson'), 'watcher.json');
  const alarm = readState(fileOf(root, 'alarm'), 'alarm.json');

  const tr = pre.tr;
  const spentOf = (task, e) => pre.spend.get(`${task}|${e}`)?.total ?? 0;
  const windowOf = (task, e) => pre.spend.get(`${task}|${e}`)?.window ?? null;

  if (torn && (torn.length === undefined || torn.length > 0)) anomalies.push({ code: 'ledger-torn', detail: { bytes: torn.length ?? null } });

  const slots = await lib.slotCount(table.tasks, pre.procList, tr);
  const res = await lib.reservation(table.tasks, spentOf);
  const flags = lib.runFlags(lines, ce);
  const blocked = flags.halted === true || flags.draining === true;
  const f5Given = th.get('f5_given') === true;
  const softFrac = th.get('soft_frac');
  const hardFrac = th.get('hard_frac');
  const zFrac = th.get('Z_frac');

  const tasks = [];
  for (const row of table.tasks ?? []) {
    const e = row.epoch;
    let V = null;
    try {
      const v = await lib.variant(root, row, { f5Given });
      V = v && typeof v.V === 'number' ? v.V : null;
    } catch (x) {
      if (x && x.exit === 3) throw x;
      V = null;
    }
    const eTask = Number.isFinite(row.e_task) ? row.e_task : 0;

    // Zombie spend over Z on an attempt fenced and not confirmed stopped.
    let zombieOver = false;
    for (const att of row.attempts ?? []) {
      if (!(att.epoch < e) || att.stop === 'confirmed') continue;
      if (typeof att.spend_at_fence === 'number') {
        const z = Math.max(0, spentOf(row.task, att.epoch) - att.spend_at_fence);
        if (z > zFrac * eTask) zombieOver = true;
      }
      const r = readReady(root, row, att.epoch);
      if (r.value && r.value.epoch === att.epoch) anomalies.push({ code: 'zombie-write', detail: { task: row.task, epoch: att.epoch } });
    }

    // READY of the current epoch.
    let readyPending = false;
    if (e >= 1) {
      const r = readReady(root, row, e);
      if (r.bad) anomalies.push({ code: 'ready-unparseable', detail: { task: row.task, epoch: e } });
      else if (r.value && r.value.kind === 'ready' && r.value.epoch === e) {
        const step = readyStep(root, row, r.value);
        if (step && !commitExists(root, row.task, step)) readyPending = true;
      }
    }

    tasks.push({
      task: row.task,
      state: row.state,
      step: row.step,
      epoch: e,
      V,
      spent: e >= 1 ? spentOf(row.task, e) : 0,
      e_task: eTask,
      soft: Math.floor(softFrac * eTask),
      hard: Math.floor(hardFrac * eTask),
      window: e >= 1 ? windowOf(row.task, e) : null,
      next: nextOf(root, row, { blocked, zombieOver, readyPending, lines }),
    });
  }

  // Wake sources.
  const wAlive = aliveIn(pre.procList, watcher) === true;
  const aAlive = aliveIn(pre.procList, alarm) === true;
  if (watcher && pre.procList && !wAlive) anomalies.push({ code: 'watcher-dead', detail: { pid: watcher.pid ?? null } });
  if (watcher && watcher.ce !== coord.ce) anomalies.push({ code: 'watcher-stale-ce', detail: { ce: watcher.ce ?? null } });
  if (alarm && pre.procList && !aAlive) anomalies.push({ code: 'alarm-dead', detail: { pid: alarm.pid ?? null } });

  // Lock orphans.
  let runEntries = [];
  try {
    runEntries = fs.readdirSync(fileOf(root, 'run'));
  } catch {
    runEntries = [];
  }
  const orphans = runEntries.filter((n) => n.endsWith('.orphan')).sort();
  if (orphans.length) anomalies.push({ code: 'lock-orphan', detail: { files: orphans } });

  // Open intents: <key>.json without <key>.done.
  let intentEntries = [];
  try {
    intentEntries = fs.readdirSync(fileOf(root, 'intents'));
  } catch {
    intentEntries = [];
  }
  const done = new Set(intentEntries.filter((n) => n.endsWith('.done')).map((n) => n.slice(0, -5)));
  const openIntents = intentEntries
    .filter((n) => n.endsWith('.json'))
    .map((n) => n.slice(0, -5))
    .filter((k) => !done.has(k))
    .sort();

  // not_run: (check, subject) whose last `check` line is not_run; (fsck, store) likewise.
  const lastCheck = new Map();
  let lastFsck = null;
  for (const l of lines) {
    if (l.kind === 'check' && l.data) lastCheck.set(JSON.stringify([l.data.check, l.data.subject]), l.data.result);
    if (l.kind === 'fsck') lastFsck = l;
  }
  const notRun = [];
  for (const [k, result] of lastCheck) {
    if (result === 'not_run') {
      const [check, subject] = JSON.parse(k);
      notRun.push({ check, subject });
    }
  }
  if (lastFsck && lastFsck.data && lastFsck.data.result === 'not_run') notRun.push({ check: 'fsck', subject: 'store' });
  const nrKey = (x) => `${x.check}\u0000${x.subject}`;
  notRun.sort((a, b) => (nrKey(a) < nrKey(b) ? -1 : nrKey(a) > nrKey(b) ? 1 : 0));

  const seenAnomaly = new Set();
  const anomaliesOut = [];
  for (const a of anomalies) {
    const k = JSON.stringify(a);
    if (seenAnomaly.has(k)) continue;
    seenAnomaly.add(k);
    anomaliesOut.push({ code: a.code, detail: a.detail ?? null });
  }
  anomaliesOut.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));

  return {
    schema_version: 1,
    generated_at: isoOf(facts.now),
    ce: coord.ce,
    rev: table.rev,
    ledger: { seq: head.seq, head: head.hash },
    tcb_commit: coord.tcb_commit ?? null,
    acked_seq: ackedSeq,
    events_pending: lines.filter((l) => l.kind === 'event' && l.seq > ackedSeq).map((l) => l.seq),
    slots: {
      live: slots.live ?? 0,
      unknown: slots.unknown ?? 0,
      unconfirmed: slots.unconfirmed ?? 0,
      max: th.get('N_max'),
    },
    memory: { free_mb: numOrNull(facts.freeMb), reserve_mb: th.get('reserve_mb'), peak_mb: th.get('peak_mb') },
    budget: {
      B: th.get('B_tokens'),
      reservation: res.reservation,
      r: th.get('r_tokens'),
      spent_total: res.spentTotal ?? res.spent_total ?? null,
    },
    halted: flags.halted === true,
    draining: flags.draining === true,
    tasks,
    watcher: {
      alive: wAlive,
      ce: watcher ? watcher.ce ?? null : null,
      last_tick_at: watcher ? watcher.last_tick_at ?? null : null,
      ticks_total: watcher && Number.isInteger(watcher.ticks_total) ? watcher.ticks_total : 0,
    },
    alarm: { alive: aAlive, ce: alarm ? alarm.ce ?? null : null },
    open_intents: openIntents,
    not_run: notRun,
    anomalies: anomaliesOut,
  };
}

// The row's next action (spec Steps, "first match").
function nextOf(root, row, { blocked, zombieOver, readyPending, lines }) {
  const { state, step } = row;
  const e = row.epoch;
  if (state === 'failed' || row.limit === true || zombieOver) return 'owner';
  if (state === 'planned' && step === 'none') return blocked ? 'none' : 'replace-fence';
  if ((state === 'active' || state === 'parked') && step === 'stopped') return blocked ? 'none' : 'replace-start';
  if (step === 'fenced' || (state === 'committed' && step === 'bound')) return 'stop-request';
  if (step === 'stop-requested') {
    const target = state === 'committed' ? e : e - 1;
    let stop = 'none';
    try {
      stop = lib.attemptOf(row, target).stop ?? 'none';
    } catch {
      stop = 'none';
    }
    // stop.mjs names the sample by the target attempt (wt/<task>-e<k>), not by the row's epoch.
    const sample = exists(path.join(fileOf(root, 'stopSample'), `${row.task}-e${target}.json`));
    // A sample means `stop verify` has started: verify again before anything else.
    if (stop === 'unconfirmed' || sample) return 'stop-verify';
    if (stop === 'none' || stop === 'requested') return 'stop-session';
    return 'stop-verify';
  }
  if (step === 'admitted') return 'start-session';
  if (step === 'started') return 'bind';
  if (step === 'bound' && readyPending) {
    const intake = lib.lastLine(lines, 'intake', (l) => l.task === row.task && l.epoch === e);
    const audit = lib.lastLine(lines, 'audit', (l) => l.task === row.task && l.epoch === e);
    const intakeSeq = intake ? intake.seq : 0;
    return audit && audit.seq > intakeSeq ? 'commit' : 'audit';
  }
  return 'none';
}

// ---------------------------------------------------------------- build and reconcile

async function runBuild(ctx, root, flags, reconcile, dry) {
  const ce = flags.ce;
  lib.checkCe(root, ce);
  const th = lib.thresholds(root);
  const facts = lib.edgeFacts(flags);
  const proc = lib.realProc({ exe: th.get('proc_exe') });
  const table0 = lib.readTasks(root);
  const pre = await gatherFacts(root, th, table0, proc, { reconcile });

  if (dry) {
    const anomalies = [...pre.anomalies];
    const table = structuredClone(table0);
    const changes = reconcile ? await applyReconcile(ctx, root, null, pre, ce, facts, anomalies, table) : [];
    const status = await computeStatus(root, th, ce, pre, facts, table, anomalies);
    lib.checkFormat(root, 'status', status);
    const res = { exit: 0, result: { run: reconcile ? 'reconcile' : 'build', written: false, reconciled: changes, status } };
    return reconcile ? armAtStart(root, ce, pre.procList, await reconcileHold2({ root, ce, th, flags, facts, proc, pre, dry }, res)) : res;
  }

  let out = null;
  await lib.withRunLock(root, lockOpts(th, ce, proc, facts.now), async (handle) => {
    const anomalies = [...pre.anomalies];
    const changes = reconcile ? await applyReconcile(ctx, root, handle, pre, ce, facts, anomalies, null) : [];
    const table = lib.readTasks(root);
    const status = await computeStatus(root, th, ce, pre, facts, table, anomalies);
    lib.checkFormat(root, 'status', status);
    handle.assertHeld();
    lib.writeAtomic(fileOf(root, 'status'), serialize(status));
    out = { run: reconcile ? 'reconcile' : 'build', written: true, reconciled: changes, status };
  });
  const res = { exit: 0, result: out };
  return reconcile ? armAtStart(root, ce, pre.procList, await reconcileHold2({ root, ce, th, flags, facts, proc, pre, dry }, res)) : res;
}

// Reconcile after its main hold (S0.5), in both paths before armAtStart, in the order of FIX-wake
// FX-W2 steps 6-7 and FIX-JOIN part 2b row 3 (collision point B11):
//   1. hold2Wait (FX-W2 step 6): the wait for this call's nonces, outside every lock.
//   2. Hold 2: hold2Lock runs the next two steps in one hold of the run lock (FIX-JOIN point 6: the
//      runner "already holds the run lock"; part 2c: turn.json is written only under the run lock).
//      The hold is file-only: no process list inside it; a slot's r1 verdict counts only with its
//      bytes unchanged (FX-W1 step 1).
//      a. hold2ArmSlots (FX-W2 step 7): the live slots, then turn.json's arm and slots.
//      b. hold2PruneMarkers (FX-W1, FIX-JOIN point 6): the prune reads the slots that step a writes
//         in this same hold.
// The context `hold`: root, ce, th, flags, facts, proc, pre and dry as runBuild has them; res, the
// output (a step that changes it sets hold.res); slots, the turn.json slots of this hold (set by
// step a, read by step b; null until FX-W2 fills step a).
async function reconcileHold2({ root, ce, th, flags, facts, proc, pre, dry }, res) {
  const hold = { root, ce, th, flags, facts, proc, pre, dry, res, slots: null };
  await hold2Wait(hold);
  await hold2Lock(hold, async (handle) => {
    await hold2ArmSlots(hold, handle);
    await hold2PruneMarkers(hold, handle);
  });
  return hold.res;
}

// FX-W2 step 6, before hold 2 and outside every lock: poll the given nonces' files every 200 ms (at
// least release_ms, at most arm_confirm_ms), then write `abandoned` into each one still `started`.
async function hold2Wait(hold) { // eslint-disable-line no-unused-vars
}

// FX-W2 (runBuild's two holds): hold 2 runs fn(handle) under the run lock with the ce re-checked
// (lib.withRunLock with lockOpts(hold.th, hold.ce, hold.proc, hold.facts.now)); a dry run checks the
// ce and passes null, as the main hold does. Until FX-W2 fills it, fn(null) runs without the lock
// (both steps are empty). FX-W1's step takes no lock of its own: run.lock is not re-entrant.
async function hold2Lock(hold, fn) { // eslint-disable-line no-unused-vars
  return fn(null);
}

// FX-W2 step 7, in hold 2: the live slots n of this ce; n >= alarm_slots gives arm confirmed, slots
// (also hold.slots) and unarmed_turns 0; otherwise arm unconfirmed, unarmed_turns + 1, exit 1
// arm-unconfirmed.
async function hold2ArmSlots(hold, handle) { // eslint-disable-line no-unused-vars
}

// FX-W1 (FIX-JOIN point 6), in hold 2 after hold2ArmSlots: an exit marker is removed only when
// neither a slot record nor hold.slots names its (pid, start_time); `unarmed-*` records of the
// current ce stay.
async function hold2PruneMarkers(hold, handle) { // eslint-disable-line no-unused-vars
}

// FX-W4: `status.mjs --deadman --root R` (read-only, no lock, no ce). Runs before the ce check and
// returns its output, or null when the flag is absent. Empty until FX-W4.
async function deadmanRun(ctx, flags, dry) { // eslint-disable-line no-unused-vars
  return null;
}

// M2 (CONTRACT decision 40): reconcile is the first act of every turn, so it asks for the alarm
// whenever none of this ce is known to live (absent, another ce, dead, or the process list
// unavailable). The coordinator then starts `watch.mjs --alarm` before anything else, and a turn
// that dies before its endturn still leaves a wake source. Nothing is started or killed here.
function armAtStart(root, ce, procList, res) {
  const alarm = readLoose(fileOf(root, 'alarm'));
  const alive = alarm && alarm.ce === ce ? aliveIn(procList, alarm) : false;
  if (alive === true) return res;
  return {
    exit: 1,
    result: { ...res.result, arm: 'alarm' },
    reasons: [{ code: 'alarm-missing', detail: { ce: alarm ? alarm.ce ?? null : null, pid: alarm ? alarm.pid ?? null : null, alive } }],
  };
}

// ---------------------------------------------------------------- endturn

async function runEndturn(ctx, root, flags, dry) {
  const ce = flags.ce;
  const K = flags['acked-seq'];
  if (!Number.isInteger(K) || K < 0) throw usage({ flag: 'acked-seq', expect: 'integer >= 0' });
  lib.checkCe(root, ce);
  const th = lib.thresholds(root);
  const facts = lib.edgeFacts(flags);
  const proc = lib.realProc({ exe: th.get('proc_exe') });
  let procList = null;
  try {
    procList = await proc.list();
    if (!Array.isArray(procList)) procList = null;
  } catch {
    procList = null;
  }

  const step1 = (handle) => {
    const { lines } = lib.readLedger(root);
    const head = lines.length ? lines[lines.length - 1].seq : 0;
    const acked = readState(fileOf(root, 'acked'), 'acked.json');
    const stored = acked && Number.isInteger(acked.acked_seq) ? acked.acked_seq : 0;
    if (K > head) return { exit: 1, code: 'acked-ahead', detail: { acked_seq: K, head } };
    if (K < stored) return { exit: 1, code: 'acked-backwards', detail: { acked_seq: K, stored } };
    if (handle) {
      handle.assertHeld();
      lib.writeAtomic(fileOf(root, 'acked'), serialize({ schema_version: 1, ce, acked_seq: K, at: isoOf(facts.now) }));
    }
    return null;
  };

  let refusal = null;
  if (dry) refusal = step1(null);
  else await lib.withRunLock(root, lockOpts(th, ce, proc, facts.now), async (handle) => { refusal = step1(handle); });
  if (refusal) {
    return { exit: 1, result: { acked_seq: null, written: false }, reasons: [{ code: refusal.code, detail: refusal.detail }] };
  }

  // Step 2: the two wake sources (checked, never started or killed).
  const watcher = readState(fileOf(root, 'watcherJson'), 'watcher.json');
  const alarm = readState(fileOf(root, 'alarm'), 'alarm.json');
  const wlock = readLoose(fileOf(root, 'watcherLock'));
  const wFiles = !!watcher && watcher.ce === ce && !!wlock && Number(wlock.pid) === Number(watcher.pid) && lib.sameStartTime(wlock.start_time, watcher.start_time);
  const aFiles = !!alarm && alarm.ce === ce;
  const wAlive = wFiles ? aliveIn(procList, watcher) : false;
  const aAlive = aFiles ? aliveIn(procList, alarm) : false;
  const result = { acked_seq: K, written: !dry, watcher: wAlive === true, alarm: aAlive === true };
  if (wAlive === null || aAlive === null) {
    return { exit: 2, result, reasons: [{ code: 'proc-unavailable', detail: null }] };
  }
  const reasons = [];
  if (wAlive !== true) reasons.push({ code: 'watcher-missing', detail: watcher ? { ce: watcher.ce ?? null, pid: watcher.pid ?? null } : null });
  if (aAlive !== true) reasons.push({ code: 'alarm-missing', detail: alarm ? { ce: alarm.ce ?? null, pid: alarm.pid ?? null } : null });
  return { exit: reasons.length ? 1 : 0, result, reasons };
}

// ---------------------------------------------------------------- intent, owner, meter

async function withLockOrDry(root, flags, dry, fn) {
  const ce = flags.ce;
  lib.checkCe(root, ce);
  const th = lib.thresholds(root);
  const facts = lib.edgeFacts(flags);
  if (dry) return fn(null, facts);
  const proc = lib.realProc({ exe: th.get('proc_exe') });
  let out = null;
  await lib.withRunLock(root, lockOpts(th, ce, proc, facts.now), async (handle) => {
    out = await fn(handle, facts);
  });
  return out;
}

async function runIntent(ctx, root, flags, sub, dry) {
  const key = flags.key;
  if (typeof key !== 'string' || !INTENT_KEY.test(key)) throw usage({ flag: 'key', expect: 'intent key (CONTRACT 1.5)' });
  const dir = fileOf(root, 'intents');
  const jsonPath = path.join(dir, `${key}.json`);
  const donePath = path.join(dir, `${key}.done`);

  if (sub === 'open') {
    if (typeof flags.subject !== 'string' || flags.subject.length === 0) throw usage({ flag: 'subject' });
    const text = flags['text-file'] !== undefined ? notesFile(root, flags['text-file']) : Buffer.alloc(0);
    const textSha = lib.sha256hex(text);
    return withLockOrDry(root, flags, dry, async (handle, facts) => {
      const existing = readState(jsonPath, `intents/${key}.json`);
      if (existing) {
        const same = existing.key === key && existing.subject === flags.subject && existing.text_sha === textSha;
        if (same) return { exit: 0, result: { key, created: false } };
        return { exit: 1, result: { key, created: false }, reasons: [{ code: 'intent-differs', detail: { subject: existing.subject ?? null } }] };
      }
      if (!handle) return { exit: 0, result: { key, created: true } };
      const rec = { schema_version: 1, key, ce: flags.ce, subject: flags.subject, text_sha: textSha, created_at: isoOf(facts.now) };
      fs.mkdirSync(dir, { recursive: true });
      handle.assertHeld();
      const made = lib.createExclusive(jsonPath, serialize(rec));
      if (made === 'created') {
        await lib.appendLedger(root, handle, { ctx, ce: flags.ce, kind: 'intent-open', data: { key }, now: facts.now });
      }
      return { exit: 0, result: { key, created: made === 'created' } };
    });
  }

  // done
  if (flags.subject !== undefined || flags['text-file'] !== undefined) throw usage({ expect: 'intent done takes --key only' });
  return withLockOrDry(root, flags, dry, async (handle, facts) => {
    const existing = readState(jsonPath, `intents/${key}.json`);
    if (!existing) return { exit: 2, result: { key }, reasons: [{ code: 'missing', detail: { key } }] };
    if (exists(donePath)) return { exit: 0, result: { key, done: false } };
    if (!handle) return { exit: 0, result: { key, done: true } };
    handle.assertHeld();
    const made = lib.createExclusive(donePath, serialize({ schema_version: 1, key, done_at: isoOf(facts.now) }));
    if (made === 'created') {
      await lib.appendLedger(root, handle, { ctx, ce: flags.ce, kind: 'intent-done', data: { key }, now: facts.now });
    }
    return { exit: 0, result: { key, done: made === 'created' } };
  });
}

async function runOwner(ctx, root, flags, dry) {
  const act = flags.act;
  if (!ACTS.includes(act)) throw usage({ flag: 'act', expect: ACTS });
  if (typeof flags.subject !== 'string' || flags.subject.length === 0) throw usage({ flag: 'subject' });
  if (typeof flags['quote-file'] !== 'string') throw usage({ flag: 'quote-file' });
  const quote = stripBom(notesFile(root, flags['quote-file']).toString('utf8'));
  const n = [...quote].length;
  if (n < 1 || n > 500) throw err('quote-length', 66, { length: n });
  return withLockOrDry(root, flags, dry, async (handle, facts) => {
    if (act === 'drop') {
      const table = lib.readTasks(root);
      if (!(table.tasks ?? []).some((r) => r.task === flags.subject)) {
        return { exit: 1, result: { act, subject: flags.subject }, reasons: [{ code: 'no-task', detail: { task: flags.subject } }] };
      }
    }
    if (handle) {
      await lib.appendLedger(root, handle, { ctx, ce: flags.ce, kind: 'owner', data: { act, subject: flags.subject, quote }, now: facts.now });
    }
    return { exit: 0, result: { act, subject: flags.subject, quote_chars: n } };
  });
}

async function runMeter(ctx, root, flags, dry) {
  const pct = flags.pct;
  if (!Number.isInteger(pct) || pct < 0 || pct > 100) throw usage({ flag: 'pct', expect: 'integer 0..100' });
  return withLockOrDry(root, flags, dry, async (handle, facts) => {
    if (handle) {
      await lib.appendLedger(root, handle, { ctx, ce: flags.ce, kind: 'meter', data: { pct, self_reported: true }, now: facts.now });
    }
    return { exit: 0, result: { pct, self_reported: true } };
  });
}

// ---------------------------------------------------------------- main

async function main(ctx) {
  const argv = process.argv.slice(2);
  let mode = null;
  let sub = null;
  let rest = argv;
  if (argv.length && !String(argv[0]).startsWith('--')) {
    mode = argv[0];
    if (!MODES.includes(mode)) throw usage({ mode, expect: MODES });
    rest = argv.slice(1);
    if (mode === 'intent') {
      sub = rest[0];
      if (sub !== 'open' && sub !== 'done') throw usage({ mode, expect: ['open', 'done'] });
      rest = rest.slice(1);
    }
  }
  ctx.mode = mode;
  const { flags } = lib.parseArgs(rest, { flags: FLAGS_BY_MODE[mode ?? 'default'] });
  const dry = flags['dry-run'] === true;
  ctx.dryRun = dry;
  const dm = await deadmanRun(ctx, flags, dry);
  if (dm) return { mode, dry_run: dry, reasons: [], ...dm };
  if (typeof flags.root !== 'string' || !path.isAbsolute(flags.root)) throw usage({ flag: 'root', expect: 'absolute path' });
  if (!Number.isInteger(flags.ce) || flags.ce < 1) throw usage({ flag: 'ce', expect: 'required, integer >= 1' });
  const root = path.resolve(flags.root);

  let out;
  if (mode === 'intent') out = await runIntent(ctx, root, flags, sub, dry);
  else if (mode === 'owner') out = await runOwner(ctx, root, flags, dry);
  else if (mode === 'meter') out = await runMeter(ctx, root, flags, dry);
  else {
    if (flags.reconcile && flags.endturn) throw usage({ expect: '--reconcile and --endturn are exclusive' });
    if (flags['acked-seq'] !== undefined && !flags.endturn) throw usage({ flag: 'acked-seq', expect: 'with --endturn only' });
    if (flags.endturn) out = await runEndturn(ctx, root, flags, dry);
    else out = await runBuild(ctx, root, flags, flags.reconcile === true, dry);
  }
  if (out.result && sub) out.result = { sub, ...out.result };
  return { mode, dry_run: dry, reasons: [], ...out };
}

lib.runMain(import.meta.url, SCRIPT, main);
