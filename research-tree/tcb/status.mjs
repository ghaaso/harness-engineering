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
const ARM_FLAGS = { 'arm-nonces': { type: 'string' } };
// FX-W2: the ensure nonces of this turn's call 1 (S1: one), 32 lowercase hex each, comma-separated.
const NONCE_RE = /^[0-9a-f]{32}$/;
// FX-W2 step 6: reconcile reads the nonce files this often while it waits.
const NONCE_POLL_MS = 200;
const DEADMAN_FLAGS = { deadman: { type: 'bool' } };
// FX-W4 (FIX-wake.md FX-W4 steps 2-3, rev 5 N1; FIX-JOIN point 1; branches.md rows 8 and 10): the
// design's constants, kept here (slice 1 writes no thresholds.json key); realert_runs and
// busy_alert_ticks come from thresholds.json, these values only when a key is missing or invalid.
const DM = {
  periodMs: 300000, // the task's period, tcb/settings/deadman-task.xml <Interval>PT5M</Interval>
  noAlarmRuns: 2, // runs_no_alarm >= 2
  noWatcherRuns: 2, // runs_no_watcher >= 2 (FIX-JOIN point 1.4)
  listWindow: 5, // list_hist: the last 5 runs (rev 4)
  listFailMin: 3, // at least 3 of them saw the list fail
  unarmedTurnsMin: 3, // turn.json.unarmed_turns >= 3
  unarmedSameTurn: 2, // two unarmed records of the current ce share the current turn_seq
  realertRuns: 6, // P1 (branches.md row 10)
  busyAlertTicks: 10, // FX-W7 step 2
  gapPeriods: 2, // two runs of one boot further apart than 2 periods: runs were missed (deadman-nowake)
  stalePeriods: 3, // the status view: a record older than 3 periods is stale (deadman-nowake)
  listTimeoutMs: 30000, // its one proc.list (30 s)
};
const DM_CAUSES = ['no-alarm', 'no-watcher', 'list-failing', 'stuck', 'run-lock-busy', 'unarmed-turns', 'unarmed-records'];
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
        recon.push({ task: row.task, epoch: row.epoch, current: true, sessions: folderSessions(root, tr, row, row.epoch), claim: claimOf(root, row, row.epoch) });
      }
      for (const att of row.attempts ?? []) {
        if (att.epoch === row.epoch || att.session) continue;
        const sessions = folderSessions(root, tr, row, att.epoch);
        const claim = claimOf(root, row, att.epoch);
        if (sessions.length || claim.kind === 'session') recon.push({ task: row.task, epoch: att.epoch, rowEpoch: row.epoch, current: false, sessions, claim });
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

// FX-CLAIM step 3: the attempt's claim, the first source of `started` ({kind:'invalid'} when it does not parse).
function claimOf(root, row, e) {
  try {
    return lib.readClaim(attemptDir(root, row, e));
  } catch (err) {
    if (err && err.exit === 3) return { kind: 'invalid', session_id: null };
    throw err;
  }
}

// ---------------------------------------------------------------- reconcile (under the lock)

async function applyReconcile(ctx, root, handle, pre, ce, facts, anomalies, dryTable) {
  const changes = [];
  for (const r of pre.recon) {
    // FX-CLAIM step 3: a session claim is the first source (the session is the claim holder; any other
    // folder session is the anomaly duplicate-session); transcripts are the second, as before. A
    // tombstone (a no-start fence cancelled the attempt) starts nothing; an invalid claim is tamper.
    const kind = r.claim ? r.claim.kind : 'none';
    if (kind === 'invalid') {
      anomalies.push({ code: 'claim-invalid', detail: { task: r.task, epoch: r.epoch } });
      continue;
    }
    if (kind === 'tombstone') continue;
    let sid;
    if (kind === 'session') {
      sid = r.claim.session_id;
      const others = r.sessions.filter((s) => s !== sid);
      if (others.length) anomalies.push({ code: 'duplicate-session', detail: { task: r.task, epoch: r.epoch, holder: sid, sessions: others } });
    } else {
      if (r.sessions.length > 1) {
        anomalies.push({ code: 'several-sessions', detail: { task: r.task, epoch: r.epoch, sessions: r.sessions } });
        continue;
      }
      if (r.sessions.length !== 1) continue;
      sid = r.sessions[0];
    }
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
  await reconcileRedo(ctx, root, handle, ce, facts, dryTable, changes); // FX-REDO
  return changes;
}

// FX-REDO (FIX-fence section 5): the reconcile repeated at its exact post-state. A row at started
// whose `started` line a death left missing gets it from the row (the attempt's session, the same
// as the row's when that is set), marked `data.redo: true`, in this hold; rows this call moved are
// skipped. A dry run lists it and writes nothing.
async function reconcileRedo(ctx, root, handle, ce, facts, dryTable, changes) {
  const table = dryTable ?? lib.readTasks(root);
  const { lines } = lib.readLedger(root);
  for (const row of table.tasks ?? []) {
    if (row.state !== 'active' || row.step !== 'started') continue;
    if (changes.some((c) => c.task === row.task && c.epoch === row.epoch)) continue;
    const att = (row.attempts ?? []).find((a) => a && a.epoch === row.epoch);
    const sid = att && typeof att.session === 'string' ? att.session : null;
    if (!sid || (row.session && row.session !== sid)) continue;
    if (lib.lastLine(lines ?? [], 'started', (l) => l.task === row.task && l.epoch === row.epoch)) continue;
    if (handle) await lib.appendLedger(root, handle, { ctx, ce, kind: 'started', task: row.task, epoch: row.epoch, data: { session: sid, redo: true }, now: facts.now });
    changes.push({ task: row.task, epoch: row.epoch, session: sid, step: 'started', redo: true });
  }
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
  // FX-W1 steps 1 and 4: the wake records re-read here (files only), corrupt is an anomaly, not 67.
  const markers = lib.exitMarkers(root);
  const wNow = sourceNow(fileOf(root, 'watcherJson'), pre.wake ? pre.wake.watcher : null, markers);
  const aNow = sourceNow(fileOf(root, 'alarm'), pre.wake ? pre.wake.alarm : null, markers);
  const watcher = wNow.rec;
  const alarm = aNow.rec;
  if (wNow.corrupt) anomalies.push({ code: 'state-corrupt', detail: { file: 'watcher.json' } });
  if (aNow.corrupt) anomalies.push({ code: 'state-corrupt', detail: { file: 'alarm.json' } });

  const tr = pre.tr;
  const spentOf = (task, e) => pre.spend.get(`${task}|${e}`)?.total ?? 0;
  const windowOf = (task, e) => pre.spend.get(`${task}|${e}`)?.window ?? null;

  if (torn && (torn.length === undefined || torn.length > 0)) anomalies.push({ code: 'ledger-torn', detail: { bytes: torn.length ?? null } });

  const counted = []; // FX-PLAN: the step-7 sessions, for the planner
  const slots = await lib.slotCount(table.tasks, pre.procList, tr, { root, counted });
  const res = await lib.reservation(table.tasks, spentOf);
  const flags = lib.runFlags(lines, ce);
  const blocked = flags.halted === true || flags.draining === true;
  const f5Given = th.get('f5_given') === true;
  const softFrac = th.get('soft_frac');
  const hardFrac = th.get('hard_frac');
  const zFrac = th.get('Z_frac');

  const plan = planContext(th, watcher, facts.now, pre.procList, counted);
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
    // An uncommitted ready slot in the outcome log, not READY.json (FX-OUT; R-a: a fenced log has none).
    let readyPending = false;
    if (e >= 1) {
      try {
        const log = lib.outcomeState(attemptDir(root, row, e), row);
        readyPending = log.fenced === null && log.ready.length > 0;
      } catch (x) {
        anomalies.push({ code: 'outcome-tamper', detail: { task: row.task, epoch: e, why: x && x.detail ? x.detail.why ?? null : null } });
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
      next: nextOf(root, row, { blocked, zombieOver, lines, plan }),
    });
  }

  // Wake sources (FX-W1): alive true, false (dead: absent, gone, or an exit marker) or null (unknown).
  const tri = (s) => (s === 'alive' ? true : s === 'unknown' ? null : false);
  const wAlive = tri(wNow.state);
  const aAlive = tri(aNow.state);
  if (watcher && wNow.state === 'dead') anomalies.push({ code: 'watcher-dead', detail: { pid: watcher.pid ?? null } });
  if (watcher && watcher.ce !== coord.ce) anomalies.push({ code: 'watcher-stale-ce', detail: { ce: watcher.ce ?? null } });
  if (alarm && aNow.state === 'dead') anomalies.push({ code: 'alarm-dead', detail: { pid: alarm.pid ?? null } });
  const nowake = deadmanNowake(root, th, facts.now); // FX-W4
  if (nowake) anomalies.push({ code: 'deadman-nowake', detail: nowake });

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

// The row's next action (spec Steps, "first match"): FX-PLAN's lib.planAct over lib.planFacts, the
// one planner the watcher's rowAct also calls. `plan`: {ticksTotal, nowMs, lease, procList, counted,
// Hmax}, made once per build. `audited`: an `audit` line of this task and epoch newer than its last
// `intake` line (commit, else audit).
function nextOf(root, row, { blocked, zombieOver, lines, plan }) {
  const e = row.epoch;
  const intake = lib.lastLine(lines, 'intake', (l) => l.task === row.task && l.epoch === e);
  const audit = lib.lastLine(lines, 'audit', (l) => l.task === row.task && l.epoch === e);
  const audited = !!audit && audit.seq > (intake ? intake.seq : 0);
  return lib.planAct(row, lib.planFacts(root, row, { ...plan, blocked, zombieOver, audited }));
}

// FX-PLAN: the planner's run-wide facts for one build (the start lease's ticks and wall time, H_max).
function planContext(th, watcher, now, procList, counted) {
  const opt = (k) => (th.has(k) ? th.get(k) : undefined);
  return {
    ticksTotal: watcher && Number.isInteger(watcher.ticks_total) ? watcher.ticks_total : null,
    nowMs: Date.parse(isoOf(now)),
    lease: { start_lease_ticks: opt('start_lease_ticks'), start_lease_ms: opt('start_lease_ms') },
    procList,
    counted,
    Hmax: opt('H_max'),
  };
}

// ---------------------------------------------------------------- build and reconcile

async function runBuild(ctx, root, flags, reconcile, dry) {
  const ce = flags.ce;
  lib.checkCe(root, ce);
  const th = lib.thresholds(root);
  const facts = lib.edgeFacts(flags);
  const proc = lib.realProc({ exe: th.get('proc_exe') });
  const nonces = reconcile ? armNonces(flags) : []; // FX-W2: a malformed list is 66 before any write
  const table0 = lib.readTasks(root);
  const wake0 = readWake(root); // FX-W1 step 1: the wake records, read before the process list
  const arm0 = reconcile ? readArmSlots(root, th) : null; // FX-W2 step 7: the slot records, read before r1
  const pre = await gatherFacts(root, th, table0, proc, { reconcile });
  pre.wake = judgeWake(wake0, pre.procList, lib.exitMarkers(root));
  if (reconcile) pre.arm = { nonces, slots: judgeArmSlots(arm0, pre.procList, lib.exitMarkers(root), ce) };

  if (dry) {
    const anomalies = [...pre.anomalies];
    const table = structuredClone(table0);
    const changes = reconcile ? await applyReconcile(ctx, root, null, pre, ce, facts, anomalies, table) : [];
    const status = await computeStatus(root, th, ce, pre, facts, table, anomalies);
    lib.checkFormat(root, 'status', status);
    if (reconcile) pre.turn = turnHold1(root, ce, nonces, status.ledger.seq);
    const res = { exit: 0, result: { run: reconcile ? 'reconcile' : 'build', written: false, reconciled: changes, status } };
    return reconcile ? reconcileHold2({ root, ce, th, flags, facts, proc, pre, dry }, res) : res;
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
    if (reconcile) {
      pre.turn = turnHold1(root, ce, nonces, status.ledger.seq);
      handle.assertHeld();
      lib.writeAtomic(lib.paths(root).turn, serialize(pre.turn));
    }
    out = { run: reconcile ? 'reconcile' : 'build', written: true, reconciled: changes, status };
  });
  const res = { exit: 0, result: out };
  return reconcile ? reconcileHold2({ root, ce, th, flags, facts, proc, pre, dry }, res) : res;
}

// ---------------------------------------------------------------- FX-W2: the arm (FIX-wake FX-W2)

// --arm-nonces X[,X2]: the nonces of this turn's ensures; absent: [] (a reconcile later in the turn).
function armNonces(flags) {
  const v = flags['arm-nonces'];
  if (v === undefined) return [];
  const list = String(v).split(',');
  if (!list.every((x) => NONCE_RE.test(x))) throw usage({ flag: 'arm-nonces', expect: '32 lowercase hex, comma-separated' });
  return [...new Set(list)];
}

// alarm_slots (FX-W2, branch S1: 1), an integer >= 1.
function slotCountOf(th) {
  const n = th.get('alarm_slots');
  if (!Number.isInteger(n) || n < 1) throw err('param-invalid', 2, { name: 'alarm_slots', value: n ?? null });
  return n;
}

// A slot record names a process: an object with an integer pid > 0 and a string start_time.
function slotRec(rec) {
  return !!rec && Number.isInteger(rec.pid) && rec.pid > 0 && typeof rec.start_time === 'string' ? rec : null;
}

// FX-W2 step 7's r1 part, outside every lock: the slot files' bytes, read BEFORE the process list
// (a record written after the list would name a live process the list does not show), judged after it.
function readArmSlots(root, th) {
  const P = lib.paths(root);
  const out = [];
  for (let k = 1; k <= slotCountOf(th); k += 1) out.push({ k, ...readSource(P.armSlot(k)) });
  return out;
}
function judgeArmSlots(arm0, procList, markers, ce) {
  return arm0.map((s) => {
    const rec = slotRec(s.rec);
    return { k: s.k, bytes: s.bytes, state: rec && rec.ce === ce ? lib.liveness(rec, listProc(procList), markers) : 'dead' };
  });
}

// turn.json as last written, or null when absent or not a turn record (rewritten then, never 67).
function readTurn(root) {
  const t = readLoose(lib.paths(root).turn);
  if (!t || typeof t !== 'object' || !Number.isInteger(t.ce) || !Number.isInteger(t.turn_seq) || !Array.isArray(t.slots)) return null;
  return { ...t, unarmed_turns: Number.isInteger(t.unarmed_turns) && t.unarmed_turns >= 0 ? t.unarmed_turns : 0 };
}

// FX-W2 step 5, the record the r8-r13 hold writes after status.json: turn_seq + 1 (never reset, so a
// waiting abandoned ensure always sees it grow), read_seq (the ledger head status.json reflects),
// arm unconfirmed and no slots, except that a reconcile given no nonces keeps a confirmed turn of this
// ce (B1.4: a second reconcile in one turn; hold 2 re-checks its slots all the same).
function turnHold1(root, ce, nonces, readSeq) {
  const prev = readTurn(root);
  const keep = nonces.length === 0 && !!prev && prev.ce === ce && prev.arm === 'confirmed';
  return {
    ce,
    turn_seq: (prev ? prev.turn_seq : 0) + 1,
    read_seq: readSeq,
    arm: keep ? 'confirmed' : 'unconfirmed',
    slots: keep ? prev.slots : [],
    unarmed_turns: prev ? prev.unarmed_turns : 0,
  };
}

// Reconcile after its main hold (S0.5), in both paths (FX-W2 removed M2's armAtStart), in the order of FIX-wake
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

// FX-W2 step 6, before hold 2 and outside every lock: poll the given nonces' files every 200 ms; the
// wait ends when none is absent or `started` and release_ms has passed, or at arm_confirm_ms (a bound
// on this one call, read on the monotonic clock). No nonces (a later reconcile of the turn): no wait.
// The `abandoned` write is hold 2's (hold2ArmSlots), under the run lock the ensure's hold 1 also takes.
async function hold2Wait(hold) {
  const nonces = hold.pre.arm ? hold.pre.arm.nonces : [];
  if (!nonces.length) return;
  const least = hold.th.get('release_ms');
  const most = hold.th.get('arm_confirm_ms');
  const P = lib.paths(hold.root);
  const t0 = performance.now();
  for (;;) {
    const open = nonces.filter((x) => { const v = readLoose(P.armNonce(x)); return !v || v.state === 'started'; });
    const t = performance.now() - t0;
    if ((open.length === 0 && t >= least) || t >= most) return;
    await new Promise((r) => setTimeout(r, NONCE_POLL_MS));
  }
}

// FX-W2 (runBuild's two holds): hold 2 runs fn(handle) under the run lock with the ce re-checked
// (lib.withRunLock with lockOpts(hold.th, hold.ce, hold.proc, hold.facts.now)); a dry run checks the
// ce and passes null, as the main hold does. FX-W1's step takes no lock of its own: run.lock is not
// re-entrant.
async function hold2Lock(hold, fn) {
  if (hold.dry) {
    lib.checkCe(hold.root, hold.ce);
    return fn(null);
  }
  let out;
  await lib.withRunLock(hold.root, lockOpts(hold.th, hold.ce, hold.proc, hold.facts.now), async (handle) => { out = await fn(handle); });
  return out;
}

// FX-W2 step 7, in hold 2 (files only): first each nonce of this call still absent or `started` is
// written `abandoned`; then a slot of this ce is live when it has no exit marker now, was not judged
// dead by r1 with its bytes unchanged, and either was registered by a nonce of this call (its record
// carries that nonce and the nonce file says registered with its k and pid) or was judged alive or
// unknown by r1 with its bytes unchanged. n >= alarm_slots: arm confirmed, slots (also hold.slots),
// unarmed_turns 0; otherwise arm unconfirmed, unarmed_turns + 1, exit 1 arm-unconfirmed. turn.json is
// written only while it is still the record this call's main hold wrote (otherwise `turn-moved`).
async function hold2ArmSlots(hold, handle) {
  const { root, ce, th, dry, pre } = hold;
  if (handle) handle.assertHeld();
  const P = lib.paths(root);
  const nonces = pre.arm ? pre.arm.nonces : [];
  const states = new Map();
  for (const x of nonces) {
    let v = readLoose(P.armNonce(x));
    if (!v || typeof v !== 'object' || v.state === 'started') {
      v = { state: 'abandoned' };
      if (handle) lib.writeAtomic(P.armNonce(x), JSON.stringify(v) + '\n');
    }
    states.set(x, v);
  }
  const base = pre.turn;
  const res = hold.res;
  const need = slotCountOf(th);
  if (!dry) {
    const cur = readTurn(root);
    if (!cur || cur.ce !== base.ce || cur.turn_seq !== base.turn_seq) {
      hold.slots = cur ? cur.slots : [];
      hold.res = {
        exit: 1,
        result: { ...res.result, arm: 'unconfirmed', turn_seq: base.turn_seq, slots: [] },
        reasons: [...(res.reasons ?? []), { code: 'arm-unconfirmed', detail: { ce, why: 'turn-moved', turn_seq: cur ? cur.turn_seq : null } }],
      };
      return;
    }
  }
  const markers = lib.exitMarkers(root);
  const live = [];
  const seen = [];
  for (let k = 1; k <= need; k += 1) {
    const s = readSource(P.armSlot(k));
    const rec = slotRec(s.rec);
    const r1 = pre.arm ? pre.arm.slots.find((v) => v.k === k) : null;
    const same = !!r1 && !!r1.bytes && !!s.bytes && s.bytes.equals(r1.bytes);
    let state;
    if (!rec) state = s.bytes ? 'corrupt' : 'absent';
    else if (rec.ce !== ce) state = 'other-ce';
    else if (markers.has(lib.markerKey(rec.pid, rec.start_time))) state = 'exited';
    else if (same && r1.state === 'dead') state = 'dead';
    else {
      const byCall = nonces.some((x) => {
        const v = states.get(x);
        return rec.nonce === x && v.state === 'registered' && v.k === k && Number(v.pid) === rec.pid;
      });
      state = byCall ? 'registered' : same ? r1.state : 'unjudged';
    }
    seen.push({ k, state, pid: rec ? rec.pid : null });
    if (state === 'registered' || state === 'alive' || state === 'unknown') live.push({ k, pid: rec.pid, start_time: rec.start_time });
  }
  const confirmed = live.length >= need;
  const turn = { ...base, arm: confirmed ? 'confirmed' : 'unconfirmed', slots: live, unarmed_turns: confirmed ? 0 : base.unarmed_turns + 1 };
  hold.slots = live;
  if (handle) lib.writeAtomic(P.turn, serialize(turn));
  const result = { ...res.result, arm: turn.arm, turn_seq: turn.turn_seq, slots: live };
  hold.res = confirmed
    ? { ...res, result }
    : { exit: 1, result, reasons: [...(res.reasons ?? []), { code: 'arm-unconfirmed', detail: { ce, live: live.length, need, slots: seen } }] };
}

// FX-W1 (FIX-JOIN point 6), in hold 2 after hold2ArmSlots: an exit marker is removed only when
// neither a slot record nor hold.slots names its (pid, start_time); `unarmed-*` records of the
// current ce stay.
// The names are read after the folder is listed, so a marker that appears later is not touched, and
// a marker is kept when alarm.json, a slot file or hold.slots names it. A dry run removes nothing.
async function hold2PruneMarkers(hold, handle) {
  if (hold.dry) return;
  if (handle) handle.assertHeld();
  const dir = lib.paths(hold.root).arm;
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return;
  }
  const keep = new Set();
  const name = (r) => {
    if (r && typeof r === 'object' && r.pid !== undefined && r.pid !== null) keep.add(lib.markerKey(r.pid, r.start_time));
  };
  name(readLoose(fileOf(hold.root, 'alarm')));
  for (const n of names) if (/^slot-[^.]+\.json$/.test(n)) name(readLoose(path.join(dir, n)));
  for (const s of Array.isArray(hold.slots) ? hold.slots : []) name(s);
  for (const n of names) {
    const m = /^exited-([0-9A-Za-z-]+)\.json$/.exec(n);
    if (!m || keep.has(m[1])) continue;
    try {
      fs.unlinkSync(path.join(dir, n));
    } catch {
      /* removed already */
    }
  }
}

// FX-W4: `status.mjs --deadman --root R` (read-only, no lock, no ce). Runs before the ce check and
// returns its output, or null when the flag is absent. The ce is coord.json's. The records are read
// before its one process list (FX-W1 step 1), judged after it with the exit markers. It counts in its
// own runs and writes only run/deadman.json (its one writer, no lock; a dry run writes nothing). Exit 1
// `deadman-alert` {alerts, causes} when a cause alerts this run: at its onset, then again every
// realert_runs runs while it holds (P1); one run without it ends the onset. The task toasts on any exit
// but 0 (branch H4 B).
const dmInt = (v) => (Number.isInteger(v) && v >= 0 ? v : null);
function dmParam(th, name, dflt) {
  try {
    const v = th.get(name);
    return Number.isInteger(v) && v >= 1 ? v : dflt;
  } catch {
    return dflt;
  }
}
async function deadmanRun(ctx, flags, dry) { // eslint-disable-line no-unused-vars
  if (flags.deadman !== true) return null;
  for (const f of ['ce', 'reconcile', 'endturn', 'acked-seq', 'arm-nonces']) {
    if (flags[f] !== undefined && flags[f] !== false) throw usage({ flag: f, expect: 'not with --deadman' });
  }
  if (typeof flags.root !== 'string' || !path.isAbsolute(flags.root)) throw usage({ flag: 'root', expect: 'absolute path' });
  const root = path.resolve(flags.root);
  const P = lib.paths(root);
  const th = lib.thresholds(root);
  const now = isoOf(lib.edgeFacts(flags).now);
  const coord = readState(fileOf(root, 'coord'), 'coord.json');
  if (!coord || !Number.isInteger(coord.ce) || coord.ce < 1) throw err('no-coordinator', 2, null);
  const ce = coord.ce;
  const nSlots = dmParam(th, 'alarm_slots', 1);
  // Before the list: the alarm records (alarm.json, the slots) and the watcher's (watcher.json, watcher.lock).
  const alarm0 = [readSource(fileOf(root, 'alarm'))];
  for (let k = 1; k <= nSlots; k += 1) alarm0.push(readSource(P.armSlot(k)));
  const watcher = readLoose(fileOf(root, 'watcherJson'));
  const wlock = readLoose(fileOf(root, 'watcherLock'));
  const proc = lib.realProc({ timeoutMs: DM.listTimeoutMs, exe: th.get('proc_exe') });
  let procList = null;
  try {
    procList = await proc.list();
    if (!Array.isArray(procList)) procList = null;
  } catch {
    procList = null;
  }
  let boot = typeof flags.boot === 'string' ? flags.boot : null;
  if (boot === null && procList !== null) {
    try {
      const b = proc.boot();
      boot = typeof b === 'string' ? b : null;
    } catch {
      boot = null;
    }
  }
  const markers = lib.exitMarkers(root);
  const lp = listProc(procList);
  const verdict = (states) => (states.includes('alive') ? 'alive' : states.includes('unknown') ? 'unknown' : 'none');
  const alarm = verdict(alarm0.map((s) => (slotRec(s.rec) && s.rec.ce === ce ? lib.liveness(s.rec, lp, markers) : 'dead')));
  const wFiles = !!watcher && watcher.ce === ce && !!wlock && Number(wlock.pid) === Number(watcher.pid) && lib.sameStartTime(wlock.start_time, watcher.start_time);
  const watcherV = verdict([wFiles ? lib.liveness(watcher, lp, markers) : 'dead']);
  // Files, no lock: watcher.json.stuck (FX-W5), watcher-busy.json (FX-W7), turn.json and the unarmed records (FX-W3).
  const stuck = watcher && Array.isArray(watcher.stuck) ? watcher.stuck.filter((s) => typeof s === 'string') : [];
  const busy = readLoose(P.watcherBusy);
  const busyTicks = busy && dmInt(busy.busy_ticks) !== null ? busy.busy_ticks : 0;
  const turn = readLoose(P.turn);
  const turnSeq = turn && Number.isInteger(turn.turn_seq) ? turn.turn_seq : 0; // as the alarm reads it (watch turnSeqOf)
  const unarmedTurns = turn && dmInt(turn.unarmed_turns) !== null ? turn.unarmed_turns : 0;
  let names = [];
  try {
    names = fs.readdirSync(P.arm);
  } catch {
    names = [];
  }
  let sameTurn = 0;
  for (const n of names) {
    if (!/^unarmed-[0-9A-Za-z-]+\.json$/.test(n)) continue;
    const u = readLoose(path.join(P.arm, n));
    if (u && u.ce === ce && u.turn_seq === turnSeq) sameTurn += 1;
  }
  // The counters, in its own runs; runs_no_* are of the current ce (a new ce starts them at 0) and an
  // unknown verdict leaves them as they were.
  const prevFile = readSource(P.deadman);
  const prev = prevFile.rec;
  const state = prev ? 'continued' : prevFile.bytes || prevFile.corrupt ? 'reset' : 'fresh';
  const sameCe = !!prev && prev.ce === ce;
  const count = (v, key) => {
    const n = sameCe && dmInt(prev[key]) !== null ? prev[key] : 0;
    return v === 'none' ? n + 1 : v === 'alive' ? 0 : n;
  };
  const runsNoAlarm = count(alarm, 'runs_no_alarm');
  const runsNoWatcher = count(watcherV, 'runs_no_watcher');
  const hist = [...(prev && Array.isArray(prev.list_hist) ? prev.list_hist.filter((b) => typeof b === 'boolean') : []), procList === null].slice(-DM.listWindow);
  const listFailed = hist.filter(Boolean).length;
  const holds = {
    'no-alarm': runsNoAlarm >= DM.noAlarmRuns,
    'no-watcher': runsNoWatcher >= DM.noWatcherRuns,
    'list-failing': listFailed >= DM.listFailMin,
    stuck: stuck.length > 0,
    'run-lock-busy': busyTicks >= dmParam(th, 'busy_alert_ticks', DM.busyAlertTicks),
    'unarmed-turns': unarmedTurns >= DM.unarmedTurnsMin,
    'unarmed-records': sameTurn >= DM.unarmedSameTurn,
  };
  // The onset and the re-alert (rev 5 N1, P1): alerted {cause: runs since its last alert}.
  const realert = dmParam(th, 'realert_runs', DM.realertRuns);
  const prevAlerted = prev && prev.alerted && typeof prev.alerted === 'object' && !Array.isArray(prev.alerted) ? prev.alerted : {};
  const alerted = {};
  const alerts = [];
  const causes = DM_CAUSES.filter((c) => holds[c]);
  for (const c of causes) {
    const n = dmInt(prevAlerted[c]);
    if (n === null || n + 1 >= realert) {
      alerts.push(c);
      alerted[c] = 0;
    } else alerted[c] = n + 1;
  }
  // deadman-nowake's evidence: a gap in its own runs within one boot (missed runs: no wake, or blocked).
  const nowMs = Date.parse(now);
  const prevMs = prev ? Date.parse(prev.at) : NaN;
  let gap = prev && prev.gap && typeof prev.gap === 'object' ? { ...prev.gap, runs_since: (dmInt(prev.gap.runs_since) ?? 0) + 1 } : null;
  if (Number.isFinite(prevMs) && boot !== null && prev.boot === boot && nowMs - prevMs > DM.gapPeriods * DM.periodMs) {
    gap = { from: prev.at, to: now, ms: nowMs - prevMs, boot, runs_since: 0 };
  }
  const rec = {
    schema_version: 1, ce, runs: (prev && dmInt(prev.runs) !== null ? prev.runs : 0) + 1, at: now, boot,
    runs_no_alarm: runsNoAlarm, runs_no_watcher: runsNoWatcher, list_hist: hist, alerted, gap,
  };
  if (!dry) lib.writeAtomic(P.deadman, serialize(rec));
  const result = {
    ce, written: !dry, state, runs: rec.runs, list: procList === null ? 'failed' : 'answered', alarm, watcher: watcherV,
    runs_no_alarm: runsNoAlarm, runs_no_watcher: runsNoWatcher, list_failed: listFailed, list_runs: hist.length,
    stuck, busy_ticks: busyTicks, unarmed_turns: unarmedTurns, turn_seq: turnSeq, unarmed_same_turn: sameTurn,
    causes, alerts, alerted, gap,
  };
  const reasons = alerts.length ? [{ code: 'deadman-alert', detail: { alerts, causes } }] : [];
  return { exit: alerts.length ? 1 : 0, result, reasons };
}

// FX-W4, the status view: anomaly deadman-nowake when the dead-man is not shown to run every period
// (its wake-to-run's effect, FIX-wake.md FX-W4 step 1): no record (never ran), unreadable, older than
// stalePeriods periods, or a gap of its runs within one boot fewer than 2 alarm periods of runs ago.
function deadmanNowake(root, th, now) {
  const s = readSource(lib.paths(root).deadman);
  if (!s.bytes && !s.corrupt) return { why: 'no-run' };
  const at = s.rec ? Date.parse(s.rec.at) : NaN;
  if (!Number.isFinite(at)) return { why: 'unreadable' };
  if (Date.parse(isoOf(now)) - at > DM.stalePeriods * DM.periodMs) return { why: 'stale', at: s.rec.at };
  let alarmMs = null;
  try {
    alarmMs = th.get('alarm_ms');
  } catch {
    alarmMs = null;
  }
  const flagRuns = Number.isFinite(alarmMs) && alarmMs > 0 ? Math.max(1, Math.ceil((2 * alarmMs) / DM.periodMs)) : 24;
  const g = s.rec.gap;
  if (g && typeof g === 'object' && dmInt(g.runs_since) !== null && g.runs_since < flagRuns) {
    return { why: 'gap', from: g.from ?? null, to: g.to ?? null, ms: g.ms ?? null };
  }
  return null;
}

// ---------------------------------------------------------------- FX-W1: the wake sources' liveness

// lib.liveness's `proc` over one process list taken outside every lock: true, false, or null when
// the list is unavailable.
function listProc(procList) {
  return { alive: (pid, startTime) => aliveIn(procList, { pid, start_time: startTime }) };
}

// A wake source's record from its bytes: absent (no file), corrupt (unreadable, not JSON, UTF-16 or
// not an object) or the record.
function readSource(file) {
  let bytes = null;
  try {
    bytes = fs.readFileSync(file);
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) return { file, bytes: null, rec: null, corrupt: false };
    return { file, bytes: null, rec: null, corrupt: true };
  }
  if (bytes.length >= 2 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff))) {
    return { file, bytes, rec: null, corrupt: true };
  }
  const b = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
  let rec = null;
  try {
    rec = JSON.parse(b.toString('utf8'));
  } catch {
    rec = null;
  }
  const ok = !!rec && typeof rec === 'object' && !Array.isArray(rec);
  return { file, bytes, rec: ok ? rec : null, corrupt: !ok };
}

// FX-W1 step 1, outside every lock: the watcher's and the alarm's records, read BEFORE the process
// list is taken (wake0), judged after it (judgeWake): a record that predates the list names a
// process the list shows if it lives. Absent or corrupt: dead.
function readWake(root) {
  return { watcher: readSource(fileOf(root, 'watcherJson')), alarm: readSource(fileOf(root, 'alarm')) };
}
function judgeWake(wake0, procList, markers) {
  const judge = (s) => ({ ...s, state: lib.liveness(s.rec, listProc(procList), markers) });
  return { watcher: judge(wake0.watcher), alarm: judge(wake0.alarm) };
}

// FX-W1 step 1, inside a hold (files only): the verdict `j` counts only while the record's bytes
// are unchanged. A marker for the record now: dead. Changed bytes: unknown (that record was in no
// list). Absent or corrupt now: dead.
function sourceNow(file, j, markers) {
  const s = readSource(file);
  if (!s.rec) return { ...s, state: 'dead' };
  if (markers.has(lib.markerKey(s.rec.pid, s.rec.start_time))) return { ...s, state: 'dead' };
  if (j && j.bytes && s.bytes.equals(j.bytes)) return { ...s, state: j.state };
  return { ...s, state: 'unknown' };
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

  // Step 1 (FX-W3 A3: K is the turn's read_seq, with the ce checked; FIX-JOIN part 2b row 9), under the
  // lock: run/turn.json must be of this ce (absent, corrupt or of another ce: exit 1 turn-stale, nothing
  // written: no reconcile of this ce showed a status to acknowledge). K above the ledger head, or above
  // turn.json's read_seq (the head the turn's status showed), is acked-ahead; K below the stored
  // acked_seq is acked-backwards; otherwise acked.json (the M1 arm token). The turn is spent in every
  // case once turn.json is of this ce (arm 'spent'): between turns nothing is armed (FIX-JOIN point 10),
  // and a second endturn with the same K is accepted.
  const step1 = (handle) => {
    const { lines } = lib.readLedger(root);
    const head = lines.length ? lines[lines.length - 1].seq : 0;
    const acked = readState(fileOf(root, 'acked'), 'acked.json');
    const stored = acked && Number.isInteger(acked.acked_seq) ? acked.acked_seq : 0;
    const turn = readTurn(root);
    if (!turn || turn.ce !== ce) return { exit: 1, code: 'turn-stale', detail: { ce, turn_ce: turn ? turn.ce : null } };
    const readSeq = Number.isInteger(turn.read_seq) ? turn.read_seq : null;
    let refusal = null;
    if (K > head) refusal = { exit: 1, code: 'acked-ahead', detail: { acked_seq: K, head } };
    else if (readSeq === null || K > readSeq) refusal = { exit: 1, code: 'acked-ahead', detail: { acked_seq: K, read_seq: readSeq } };
    else if (K < stored) refusal = { exit: 1, code: 'acked-backwards', detail: { acked_seq: K, stored } };
    if (handle) {
      handle.assertHeld();
      if (turn.arm !== 'spent') lib.writeAtomic(lib.paths(root).turn, serialize({ ...turn, arm: 'spent' }));
      if (!refusal) lib.writeAtomic(fileOf(root, 'acked'), serialize({ schema_version: 1, ce, acked_seq: K, at: isoOf(facts.now) }));
    }
    return refusal;
  };

  let refusal = null;
  if (dry) refusal = step1(null);
  else await lib.withRunLock(root, lockOpts(th, ce, proc, facts.now), async (handle) => { refusal = step1(handle); });
  // A refusal of step 1 still gets step 2's report (FX-W3, N2): endturn is every turn's last call, and
  // its report of a dead source is what the coordinator acts on once before it ends the turn.

  // Step 2 (FX-W1 step 3): the two wake sources, each alive, dead or unknown; checked, never started
  // or killed. The records are read first (corrupt counts as absent, not 67), then the process list
  // is taken, so a record names a process the list shows if it lives; all outside every lock.
  const watcher = readLoose(fileOf(root, 'watcherJson'));
  const alarm = readLoose(fileOf(root, 'alarm'));
  const wlock = readLoose(fileOf(root, 'watcherLock'));
  const wFiles = !!watcher && watcher.ce === ce && !!wlock && Number(wlock.pid) === Number(watcher.pid) && lib.sameStartTime(wlock.start_time, watcher.start_time);
  const aFiles = !!alarm && alarm.ce === ce;
  let procList = null;
  try {
    procList = await proc.list();
    if (!Array.isArray(procList)) procList = null;
  } catch {
    procList = null;
  }
  const markers = lib.exitMarkers(root);
  const sources = {
    watcher: wFiles ? lib.liveness(watcher, listProc(procList), markers) : 'dead',
    alarm: aFiles ? lib.liveness(alarm, listProc(procList), markers) : 'dead',
  };
  const result = { acked_seq: refusal ? null : K, written: !dry && !refusal, watcher: sources.watcher === 'alive', alarm: sources.alarm === 'alive', sources };
  const missing = (rec) => ({ ce: rec && typeof rec === 'object' ? rec.ce ?? null : null, pid: rec && typeof rec === 'object' ? rec.pid ?? null : null, state: 'dead' });
  const reasons = refusal ? [{ code: refusal.code, detail: refusal.detail }] : [];
  if (sources.watcher === 'dead') reasons.push({ code: 'watcher-missing', detail: missing(watcher) });
  if (sources.alarm === 'dead') reasons.push({ code: 'alarm-missing', detail: missing(alarm) });
  const unknown = ['watcher', 'alarm'].filter((k) => sources[k] === 'unknown');
  // exit 1 when any source is dead; 2 only when none is dead and some is unknown; else 0.
  if (unknown.length) reasons.push({ code: 'proc-unavailable', detail: { unknown } });
  const anyDead = sources.watcher === 'dead' || sources.alarm === 'dead';
  return { exit: refusal || anyDead ? 1 : unknown.length ? 2 : 0, result, reasons };
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
  if (act === 'closed') return runOwnerClosed(ctx, root, flags, dry); // FX-CGATE
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

// FX-CGATE: `owner --act closed --subject SID --quote-file P --root R --ce N`. The owner says a session's
// process is gone: the close's fallback when no hook record names it (the hook names a close by the
// app's id, FX-CLOSE's verify reads by the CLI's: departures/CGATE.md). SID is the CLI session id, a
// lowercase UUID, else 66. In the hold: the owner line, then run/close/done/<SID>.json {kind:
// 'close-done', session, outcome: 'owner', by: null} by an exclusive create (a record already there is
// kept: the first record stands). A dry run writes nothing.
const CLI_SESSION = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function runOwnerClosed(ctx, root, flags, dry) {
  const sid = flags.subject;
  if (typeof sid !== 'string' || !CLI_SESSION.test(sid)) throw usage({ flag: 'subject', expect: 'act closed takes the CLI session id, a lowercase UUID' });
  if (typeof flags['quote-file'] !== 'string') throw usage({ flag: 'quote-file' });
  const quote = stripBom(notesFile(root, flags['quote-file']).toString('utf8'));
  const n = [...quote].length;
  if (n < 1 || n > 500) throw err('quote-length', 66, { length: n });
  return withLockOrDry(root, flags, dry, async (handle, facts) => {
    let done = null;
    if (handle) {
      await lib.appendLedger(root, handle, { ctx, ce: flags.ce, kind: 'owner', data: { act: 'closed', subject: sid, quote }, now: facts.now });
      handle.assertHeld();
      try {
        done = lib.createExclusive(lib.paths(root).closeDone(sid), { kind: 'close-done', session: sid, outcome: 'owner', by: null });
      } catch (e) {
        if (!(e && e.code === 'exists-different')) throw e;
        done = 'kept';
      }
    }
    return { exit: 0, result: { act: 'closed', subject: sid, quote_chars: n, done } };
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
    if (flags['arm-nonces'] !== undefined && !flags.reconcile) throw usage({ flag: 'arm-nonces', expect: 'with --reconcile only' });
    if (flags.endturn) out = await runEndturn(ctx, root, flags, dry);
    else out = await runBuild(ctx, root, flags, flags.reconcile === true, dry);
  }
  if (out.result && sub) out.result = { sub, ...out.result };
  return { mode, dry_run: dry, reasons: [], ...out };
}

lib.runMain(import.meta.url, SCRIPT, main);
