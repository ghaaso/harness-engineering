// watch.mjs (unit U1b): the coordinator's event loop (R4-R6, R8, R10-R12, R50).
//   (watcher) --root R --ce N [--interval-ms MS] [--no-intake] [--now ISO] [--free-mb M]
//   --once    --root R --ce N [--no-intake] [--now ISO] [--free-mb M]
//   --alarm   --root R --ce N [--sleep-ms MS] [--now ISO]
//   --intake  --root R --ce N
// Source of truth: CONTRACT.md (sections 1.2, 1.4, 2.1, 3.10, 4) and spec/watch.mjs.md.
// Reads, decides and exits with the most urgent class. Counts model calls and ticks, never clock
// differences. Transcripts are parsed before the run lock; every ledger append goes through
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
  27: 'tamper-seen',
};
// CONTRACT 1.4 precedence after 64 (handled before any class).
const PRECEDENCE = [27, 26, 25, 24, 23, 22, 21, 20, 11, 12, 10, 13, 15, 16, 14];
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

// READY.json of attempt e: the parsed value, or null when absent or unparseable (status reports that).
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
  if (size < num(ps.end_byte)) ps = freshParseState();
  if (size === num(ps.end_byte) && ps.end_byte > 0) return { ps, newCalls: 0 };
  const parsed = lib.parseTranscript(abs, { fromByte: num(ps.end_byte), lastCall: ps.last_call ?? null });
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
  return { ps, newCalls };
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
  };
}

function loadWatcherState(root) {
  const s = readState(fileOf(root, 'watcherJson'), 'watcher.json');
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
  const hangMax = th.get('hang_ticks');
  const loopK = th.get('loop_k');
  const softFrac = th.get('soft_frac');
  const hardFrac = th.get('hard_frac');
  const wChildGate = th.isGate('W_star_child');
  const wChild = wChildGate ? th.get('W_star_child') : null;

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
    for (const abs of [set.main, ...set.helpers].filter(Boolean)) {
      const rel = lib.relPosix(tr, abs);
      const { ps } = advanceFile(abs, ts.files[rel]);
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
    if (newCalls > 0) ts.hang_ticks = 0;
    else if (counted) ts.hang_ticks = num(ts.hang_ticks) + 1;

    const ready = readReady(root, row, e);
    let readyCls = null;
    let readyStep = null;
    if (ready && ready.epoch === e) {
      if (ready.kind === 'ready') {
        readyStep = typeof ready.step === 'string'
          ? ((row.steps ?? []).includes(ready.step) ? ready.step : null)
          : (row.steps ?? []).find((s) => !commitExists(root, row.task, s)) ?? null;
        if (readyStep && !commitExists(root, row.task, readyStep)) readyCls = 11;
      } else if (ready.kind === 'repair') {
        readyCls = 12;
      }
    }
    const base = { task: row.task, epoch: e };
    if (readyCls === 11) conds.push({ ...base, cls: 11, detail: { step: readyStep } });
    else if (readyCls === 12) conds.push({ ...base, cls: 12, detail: { question_ids: Array.isArray(ready.question_ids) ? ready.question_ids : [] } });
    else {
      // A READY of this epoch voids stall, hang and loop (R5, finding A4).
      if (V !== null && ts.stall_calls >= stallMax) conds.push({ ...base, cls: 20, detail: { stall_calls: ts.stall_calls, V, V_min: ts.V_min } });
      if (ts.hang_ticks >= hangMax) conds.push({ ...base, cls: 21, detail: { hang_ticks: ts.hang_ticks } });
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
    if (!runFlags.halted) appends.push({ kind: 'halt', data: { reason: 'common-cause', fails: cluster } });
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

  // 5. Events keyed by onset (CONTRACT 3.10).
  const identOf = (c) => `${c.cls}|${c.task ?? c.sub ?? '-'}|${c.epoch ?? '-'}`;
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

  // Ledger appends: one run-lock acquisition, ce re-checked inside (R4).
  if (appends.length) {
    try {
      await lib.withRunLock(root, lockOpts(th, ce, proc, facts.now), async (handle) => {
        for (const a of appends) {
          const line = { ctx, ce, kind: a.kind, data: a.data, now: facts.now };
          if (a.task !== undefined) line.task = a.task;
          if (a.epoch !== undefined) line.epoch = a.epoch;
          const written = await lib.appendLedger(root, handle, line);
          if (a.kind === 'event' && written && Number.isInteger(written.seq)) eventSeq.set(a.data.key, written.seq);
        }
      });
    } catch (x) {
      // A broken ledger tail refuses appends; the tamper class still wakes the coordinator.
      if (!(x && x.exit === 3 && present.some((c) => c.cls === 27))) throw x;
    }
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

  // 6. watcher.json (assertHeld first).
  state.last_tick_at = isoOf(facts.now);
  env.handle.assertHeld();
  lib.writeAtomic(fileOf(root, 'watcherJson'), JSON.stringify(state) + '\n');

  return {
    exit: classes.length ? classes[0] : 0,
    classes,
    reasons: classes.length
      ? due
          .filter((c) => classes.includes(c.cls))
          .sort((a, b) => PRECEDENCE.indexOf(a.cls) - PRECEDENCE.indexOf(b.cls))
          .map((c) => ({ code: CLASS_SLUG[c.cls], detail: { key: c.key, task: c.task ?? null, epoch: c.epoch ?? null, ...(c.detail ?? {}) } }))
      : [],
  };
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
    const state = loadWatcherState(root); // corrupt -> 67
    const self = await lib.selfInfo(proc);
    state.ce = ce;
    state.pid = self.pid;
    state.start_time = self.start_time;
    const env = { ctx, root, th, ce, proc, flags, handle };
    const run = once ? 'once' : 'watcher';
    let out;
    if (once) {
      state.ticks_total += 1;
      out = await evaluate(env, state, lib.edgeFacts(flags), true);
    } else {
      // A new watcher re-evaluates everything once without counting a tick (R6).
      out = await evaluate(env, state, lib.edgeFacts(flags), false);
      while (out.exit === 0) {
        await sleep(delta);
        state.ticks_total += 1;
        out = await evaluate(env, state, lib.edgeFacts(flags), true);
      }
    }
    return {
      exit: out.exit,
      result: { run, classes: out.classes, ticks_total: state.ticks_total, pending: state.pending },
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
  const record = { schema_version: 1, pid: self.pid, start_time: self.start_time, ce, armed_at: isoOf(facts.now), sleep_ms: sleepMs };
  await lib.withRunLock(root, lockOpts(th, ce, proc, facts.now), async (handle) => {
    handle.assertHeld();
    lib.writeAtomic(fileOf(root, 'alarm'), JSON.stringify(record) + '\n');
  });
  await sleep(sleepMs);
  lib.checkCe(root, ce); // a newer ce -> 64
  let cur = null;
  try {
    cur = lib.readJson(fileOf(root, 'alarm'));
  } catch {
    cur = null;
  }
  const result = { run: 'alarm', previous, armed: record };
  if (!cur || Number(cur.pid) !== Number(self.pid) || cur.start_time !== self.start_time) {
    return { exit: 0, result: { ...result, superseded: true }, reasons: [{ code: 'superseded', detail: cur ? { pid: cur.pid ?? null } : null }] };
  }
  return { exit: 30, result: { ...result, superseded: false }, reasons: [{ code: 'alarm', detail: { sleep_ms: sleepMs } }] };
}

// ---------------------------------------------------------------- --intake

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

  let proc = null;
  const done = [];
  for (const [script, a] of steps) {
    const args = [...a, '--root', root, '--ce', String(ce)];
    // Sibling scripts are found beside this file (import.meta.url), not under a fixed tcb/scripts path.
    const r = spawnSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), script), ...args], {
      cwd: root, shell: false, windowsHide: true, stdio: 'ignore',
    });
    const exit = typeof r.status === 'number' ? r.status : 70;
    done.push({ script, args, exit });
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
        await lib.recordIncident(root, handle, { ctx, ce, cls: 'not-run', detail: { script, exit }, now: facts.now });
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
