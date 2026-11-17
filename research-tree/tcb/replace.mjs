// replace.mjs (unit U1a): the one start and restart path (R7).
// CONTRACT.md §3.6 (step machine), §3.5 (manifest), §3.21-§3.22 (settings, agents, inputs),
// spec/replace.mjs.md. Modes: plan, fence, start, bind. It never starts, stops or messages a
// session (§6): the coordinator does the session-tool step the row names.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as lib from './lib.mjs';
import { decide, gatherFacts, attemptSpend, spentOfRows, thresholdReader } from './admit.mjs';

const SCRIPT = 'replace';
const MODES = ['plan', 'fence', 'start', 'bind'];
const REASONS = ['first', 'stall', 'hang', 'loop', 'crash', 'tainted', 'memory', 'handover', 'cut', 'drop'];
const FAILURE = new Set(['stall', 'hang', 'loop', 'crash', 'tainted']);
const TASK_RE = /^(?!(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:$|\.))[a-z][a-z0-9-]{1,39}$/;
const SESSION_RE = /^[0-9a-f-]{36}$/;
const OBJECT_ID_RE = /^[a-z]_[0-9a-f]{16}$/;
const SEED_ID_RE = /(?:^|[^0-9A-Za-z_])s_[0-9a-f]{16}(?![0-9a-f])/;
const TYPE_RE = /^[a-z][a-z0-9-]{0,63}$/;
const SHA_RE = /^[0-9a-f]{64}$/;
// CONTRACT §3.22: steps and the object kinds each commits
const STEP_KINDS = { pack: ['card', 'pack'], review: ['review'], stpa: ['stpa'], fmea: ['fmea'], hazards: ['hazards'] };
// CONTRACT §5 U5c: the only brief placeholders
const BRIEF_KEYS = ['task', 'epoch', 'field', 'folder', 'role', 'todo_json', 'checkpoint_json', 'must_read_json'];
// spec/briefs.md: the child brief serves roles child, child-reviewing and control
const BRIEF_FALLBACK = { 'child-reviewing': 'child', control: 'child' };
const PLAN_FIELDS = ['task', 'field', 'stage', 'role', 'tier', 'steps', 'deps', 'question_ids', 'e_task'];

const SPEC = {
  modes: MODES,
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    task: { type: 'string', required: ['fence', 'start', 'bind'] },
    epoch: { type: 'int', required: ['fence', 'start', 'bind'] },
    reason: { type: 'string', required: ['fence'] },
    tick: { type: 'int' },
    session: { type: 'string', required: ['bind'] },
    now: { type: 'string' },
    boot: { type: 'string' },
    'free-mb': { type: 'int' },
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

function exists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

function posix(p) {
  return String(p).replace(/\\/g, '/');
}

function relSegments(rel) {
  return String(rel).split(/[\\/]+/).filter((s) => s.length > 0);
}

function attemptOrNull(row, e) {
  try {
    return lib.attemptOf(row, e) ?? null;
  } catch {
    return null;
  }
}

function attemptIndex(row, e) {
  lib.attemptOf(row, e); // throws no-attempt 2 when absent
  return row.attempts.findIndex((a) => a && a.epoch === e);
}

/** Absolute folder of attempt e: the folder the fence recorded, else the §1.5 name. */
function attemptDir(root, task, e, att) {
  if (att && typeof att.folder === 'string' && att.folder) return path.resolve(root, att.folder);
  if (typeof lib.paths === 'function') {
    const p = lib.paths(root);
    if (p && typeof p.attempt === 'function') return path.resolve(root, p.attempt(task, e));
  }
  return path.join(root, 'wt', `${task}-e${e}`);
}

function guardUnder(child, parent) {
  if (!lib.isUnder(child, parent)) throw tcbError('path-escape', 3, { path: posix(child) });
  return child;
}

function readBytesOrMissing(file, what) {
  try {
    return fs.readFileSync(file);
  } catch (e) {
    if (e && e.code === 'ENOENT') throw tcbError('missing', 2, { what, file: posix(file) });
    throw e;
  }
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

function samePath(a, b) {
  const n = (p) => {
    let r = path.resolve(String(p)).replace(/[\\/]+$/, '');
    if (process.platform === 'win32') r = r.toLowerCase();
    return r;
  };
  return n(a) === n(b);
}

/** The cwd of the first record that carries one (read in 1 MiB chunks, at most 8 MiB). */
function firstCwd(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
  } catch {
    return null;
  }
  try {
    const chunk = Buffer.alloc(1 << 20);
    let carry = Buffer.alloc(0);
    let pos = 0;
    for (let i = 0; i < 8; i += 1) {
      const n = fs.readSync(fd, chunk, 0, chunk.length, pos);
      if (n <= 0) break;
      pos += n;
      let buf = Buffer.concat([carry, chunk.subarray(0, n)]);
      let nl;
      while ((nl = buf.indexOf(0x0a)) >= 0) {
        const line = buf.subarray(0, nl).toString('utf8').replace(/^﻿/, '');
        buf = buf.subarray(nl + 1);
        try {
          const rec = JSON.parse(line);
          if (rec && typeof rec.cwd === 'string' && rec.cwd) return rec.cwd;
        } catch {
          /* a bad line carries no cwd */
        }
      }
      carry = Buffer.from(buf);
    }
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

function hashFileOrNull(p) {
  try {
    return lib.sha256hex(fs.readFileSync(p));
  } catch {
    return null;
  }
}

/** The READY re-check (R7): a parseable, schema-valid {kind: ready, task: T, epoch: E}. */
function readyValid(root, dir, task, epoch) {
  const staging = path.join(dir, 'staging');
  const file = path.join(staging, 'READY.json');
  if (!exists(file) || !lib.isUnder(file, dir)) return false;
  try {
    const st = fs.lstatSync(file);
    if (!st.isFile() || st.nlink > 1) return false;
  } catch {
    return false;
  }
  let v;
  try {
    v = lib.readJson(file);
  } catch {
    return false;
  }
  if (!v || typeof v !== 'object' || v.kind !== 'ready' || v.task !== task || v.epoch !== epoch) return false;
  return readyShapeOk(root, v);
}

/**
 * Schema check of a READY marker. Sessions write READY without schema_version (the briefs give
 * {kind, task, epoch, step}), so a marker without one is validated against the schema directly,
 * and, should the schema require the field, once more with schema_version 1 added.
 */
function readyShapeOk(root, v) {
  const rethrowInternal = (e) => {
    if (e && e.exit === 70) throw e;
  };
  try {
    lib.checkFormat(root, 'ready', v);
    return true;
  } catch (e) {
    rethrowInternal(e);
  }
  if (Object.prototype.hasOwnProperty.call(v, 'schema_version')) return false;
  try {
    const r = lib.validate(lib.loadSchema(root, 'ready'), v, {});
    if (r && r.ok) return true;
  } catch (e) {
    rethrowInternal(e);
  }
  try {
    lib.checkFormat(root, 'ready', { schema_version: 1, ...v });
    return true;
  } catch (e) {
    rethrowInternal(e);
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// the environment, the lock and the incident lines

function makeEnv(ctx, flags, dry) {
  const root = path.resolve(flags.root);
  const th = thresholdReader(root);
  return {
    ctx,
    root,
    th,
    ce: flags.ce,
    dry,
    retries: th.get('lock_retries', 300),
    proc: lib.realProc({ exe: th.get('proc_exe') }),
    now: null,
    freeMb: null,
    boot: null,
  };
}

function incident(env, handle, cls, detail, task = null, epoch = null) {
  try {
    lib.recordIncident(env.root, handle, { ctx: env.ctx, ce: env.ce, cls, detail, task, epoch, now: env.now });
  } catch (e) {
    process.stderr.write(`[replace] incident line not written: ${e && e.message}\n`);
  }
}

function noteIncident(env, handle, e, task, epoch) {
  if (!e || typeof e.exit !== 'number') return;
  if (e.exit === 1 || e.exit === 5 || e.exit === 6) {
    incident(env, handle, 'refusal', { code: e.code, detail: e.detail ?? null }, task, epoch);
  } else if (e.exit === 3 && e.code !== 'run-from-attempt' && e.code !== 'ledger-broken') {
    incident(env, handle, 'refusal', { tamper: true, script: SCRIPT, code: e.code }, task, epoch);
  }
}

/** Runs fn(handle) under run.lock with the ce check; dry-run checks ce without the lock and passes null. */
async function underLock(env, fn, task = null, epoch = null) {
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

// ---------------------------------------------------------------------------------------------
// plan

function planCompare(plan, table) {
  const rows = Array.isArray(table.tasks) ? table.tasks : [];
  const byTask = new Map(rows.map((r) => [r.task, r]));
  const added = [];
  const unchanged = [];
  const differs = [];
  const seen = new Set();
  for (const e of plan.tasks) {
    if (seen.has(e.task)) throw tcbError('plan-invalid', 1, { duplicate: e.task });
    seen.add(e.task);
    const ex = byTask.get(e.task);
    if (!ex) {
      added.push(e);
      continue;
    }
    const same = PLAN_FIELDS.every((f) => lib.canonicalize(ex[f] ?? null) === lib.canonicalize(e[f] ?? null));
    if (same) unchanged.push(e.task);
    else differs.push(e.task);
  }
  if (differs.length) throw tcbError('plan-differs', 1, { tasks: differs });

  const graph = new Map();
  for (const r of rows) graph.set(r.task, Array.isArray(r.deps) ? r.deps : []);
  for (const e of plan.tasks) if (!graph.has(e.task)) graph.set(e.task, Array.isArray(e.deps) ? e.deps : []);
  const unknown = [];
  for (const [t, deps] of graph) for (const d of deps) if (!graph.has(d)) unknown.push({ task: t, dep: d });
  if (unknown.length) throw tcbError('plan-invalid', 1, { unknown_deps: unknown });
  const color = new Map();
  const cycle = [];
  const visit = (t, trail) => {
    color.set(t, 1);
    for (const d of graph.get(t) ?? []) {
      const c = color.get(d) ?? 0;
      if (c === 1) {
        cycle.push(...trail.slice(trail.indexOf(d)), t, d);
        return true;
      }
      if (c === 0 && visit(d, [...trail, t])) return true;
    }
    color.set(t, 2);
    return false;
  };
  for (const t of graph.keys()) {
    if ((color.get(t) ?? 0) === 0 && visit(t, [])) {
      throw tcbError('plan-invalid', 1, { cycle: [...new Set(cycle)] });
    }
  }
  return { added, unchanged };
}

async function modePlan(env) {
  const { root } = env;
  const plan = lib.readJson(path.join(root, 'plan', 'tasks-plan.json')); // missing → 2
  try {
    lib.checkFormat(root, 'tasks-plan', plan);
  } catch (e) {
    if (e && e.code === 'schema-version') throw tcbError('schema-version', 2, e.detail ?? null);
    if (e && e.exit === 1) {
      await underLock(env, () => {
        throw e;
      });
    }
    throw e;
  }
  return await underLock(env, (handle) => {
    const table = lib.readTasks(root); // 67 when missing or corrupt
    const { added, unchanged } = planCompare(plan, table);
    const rev = table.rev;
    if (added.length && handle) {
      const newRows = added.map((e) => ({
        task: e.task,
        field: e.field ?? null,
        stage: e.stage,
        role: e.role,
        tier: e.tier,
        steps: e.steps,
        deps: e.deps,
        question_ids: e.question_ids,
        e_task: e.e_task,
        state: 'planned',
        step: 'none',
        epoch: 0,
        reason: null,
        session: null,
        restarts: 0,
        handovers: 0,
        parks: 0,
        limit: false,
        fails: [],
        attempts: [],
        commits: {},
        updated_rev: rev + 1,
      }));
      const next = { ...table, tasks: [...table.tasks, ...newRows] };
      const newRev = lib.writeTasks(root, handle, next, { expectRev: rev });
      append(env, handle, 'plan', null, null, { added: added.map((e) => e.task) });
      return { exit: 0, result: { added: added.map((e) => e.task), unchanged, rev: typeof newRev === 'number' ? newRev : rev + 1 } };
    }
    return { exit: 0, result: { added: added.map((e) => e.task), unchanged, rev: added.length ? rev + 1 : rev } };
  });
}

// ---------------------------------------------------------------------------------------------
// fence

/** Dry-run only: what the §3.6 fence would do, without writing (the real run uses lib.fence). */
function predictFence(row, { E, reason, host, ready, R, Hmax }) {
  if (row.epoch !== E) throw tcbError('stale-epoch', 65, { expected: E, actual: row.epoch });
  const st = row.state;
  const sp = row.step;
  const planned = st === 'planned' && sp === 'none';
  const noAttemptOk = planned || (st === 'active' && sp === 'stopped');
  if (reason === 'first') {
    if (!planned) throw tcbError('wrong-step', 65, { state: st, step: sp });
    return { from: E, to: E + 1, limit: false, restartCharged: false, state: 'active', step: 'stopped' };
  }
  if ((reason === 'cut' || reason === 'drop') && noAttemptOk) {
    return { from: E, to: E, limit: false, restartCharged: false, state: reason === 'cut' ? 'cut' : 'dropped', step: 'stopped' };
  }
  const ok = (st === 'active' && ['bound', 'started', 'admitted'].includes(sp)) || (st === 'parked' && sp === 'stopped');
  if (!ok) throw tcbError('wrong-step', 65, { state: st, step: sp });
  if (reason !== 'tainted' && ready) throw tcbError('ready-wins', 5, { task: row.task, epoch: E, reason }); // M6: every reason
  if ((reason === 'handover' || reason === 'memory') && (row.handovers ?? 0) + (row.parks ?? 0) >= Hmax) {
    throw tcbError('hmax', 1, { handovers: row.handovers ?? 0, parks: row.parks ?? 0, H_max: Hmax });
  }
  let limit = false;
  let restartCharged = false;
  if (FAILURE.has(reason)) {
    if ((row.restarts ?? 0) >= R) limit = true;
    else if (!host) restartCharged = true;
  }
  return { from: E, to: E + 1, limit, restartCharged, state: st, step: 'fenced' };
}

async function modeFence(env, flags) {
  const { root, th } = env;
  const T = flags.task;
  const E = flags.epoch;
  const reason = flags.reason;
  const failure = FAILURE.has(reason);
  const transcriptsRoot = th.get('transcripts_root');
  const R = th.get('R');
  const Hmax = th.get('H_max');
  const f5Given = !!th.get('f5_given', false);

  // Outside the lock: spend of attempt E, every attempt's spend for a cut, the tick.
  const table0 = lib.readTasks(root);
  const row0 = (table0.tasks ?? []).find((r) => r && r.task === T) ?? null;
  const att0 = row0 ? attemptOrNull(row0, E) : null;
  const spendAtFence = att0 ? attemptSpend(transcriptsRoot, root, att0) : null;
  let allSpend = 0;
  if (reason === 'cut' && row0) for (const a of row0.attempts ?? []) allSpend += attemptSpend(transcriptsRoot, root, a);
  let tick = typeof flags.tick === 'number' ? flags.tick : null;
  if (tick === null) tick = readTicks(root);
  if (failure && tick === null) throw tcbError('no-tick', 2, { task: T, reason });
  const boot = env.boot ?? null;

  return await underLock(
    env,
    (handle) => {
      const table = lib.readTasks(root);
      const row = (table.tasks ?? []).find((r) => r && r.task === T);
      if (!row) throw tcbError('no-task', 1, { task: T });
      if (reason === 'drop') {
        const { lines } = lib.readLedger(root);
        const own = lib.lastLine(lines ?? [], 'owner', (l) => l && l.data && l.data.act === 'drop' && l.data.subject === T);
        if (!own) throw tcbError('no-owner-drop', 1, { task: T });
      }
      const att = attemptOrNull(row, E);
      const host = failure && reason !== 'tainted' && att && att.boot != null && boot != null && att.boot !== boot;
      const dir = attemptDir(root, T, E, att);
      guardUnder(dir, root);
      const cut = exists(dir) ? lib.stagingCut(dir) : {};
      const cutFiles = cut && cut.files ? Object.keys(cut.files).length : 0;
      const readyCheck = () => readyValid(root, dir, T, E);

      // M6 (CONTRACT decision 40): a READY of the current epoch wins over every reason but `first`
      // and `tainted`, a planned hand-over, a park, a cut and a drop included. lib.fence re-checks
      // for failure reasons only, so the check for every reason is made here, under the same lock.
      const running = row.epoch === E
        && ((row.state === 'active' && ['bound', 'started', 'admitted'].includes(row.step)) || (row.state === 'parked' && row.step === 'stopped'));
      if (running && reason !== 'first' && reason !== 'tainted' && readyCheck()) {
        throw tcbError('ready-wins', 5, { task: T, epoch: E, reason });
      }

      let out;
      if (handle) {
        out = lib.fence(root, handle, { task: T, expectEpoch: E, reason, host: !!host, tick, readyCheck, cut, spendAtFence, R, Hmax });
      } else {
        const ready = reason !== 'first' && reason !== 'tainted' ? readyCheck() : false;
        out = predictFence(row, { E, reason, host: !!host, ready, R, Hmax });
      }
      const from = out.from ?? E;
      const to = out.to ?? from;
      const limit = !!out.limit;
      const restartCharged = !!out.restartCharged;
      const newRow = out.row ?? null;
      const noAttempt = (reason === 'cut' || reason === 'drop') && to === from;

      let overflowIds = null;
      if (reason === 'cut' && noAttempt) {
        const v = lib.variant(root, newRow ?? row, { f5Given });
        overflowIds = v && Array.isArray(v.uncovered) ? v.uncovered : [];
        if (handle) append(env, handle, 'overflow', T, from, { ids: overflowIds, tokens: allSpend, reason: 'cut' });
      }
      if (handle) {
        append(env, handle, 'fence', T, to, { reason, from, to, host: !!host, restart_charged: restartCharged, limit, cut_files: cutFiles });
        if (limit) incident(env, handle, 'refusal', { code: 'limit', detail: { task: T, restarts: row.restarts ?? 0, R } }, T, to);
      }
      const result = {
        task: T,
        reason,
        from,
        to,
        host: !!host,
        restart_charged: restartCharged,
        limit,
        cut_files: cutFiles,
        state: newRow ? newRow.state : out.state ?? null,
        step: newRow ? newRow.step : out.step ?? null,
        spend_at_fence: spendAtFence,
      };
      if (overflowIds) result.overflow = { ids: overflowIds, tokens: allSpend };
      if (limit) return { exit: 1, result, reasons: [{ code: 'limit', detail: { restarts: row.restarts ?? 0, R } }] };
      return { exit: 0, result, reasons: [] };
    },
    T,
    E,
  );
}

// ---------------------------------------------------------------------------------------------
// start

function loadCheckedOutput(root, o) {
  if (!o || typeof o.id !== 'string') throw tcbError('object-mismatch', 3, { id: o ? o.id ?? null : null });
  if (o.id.startsWith('s_')) throw tcbError('seed-id', 3, { id: o.id });
  if (!OBJECT_ID_RE.test(o.id)) throw tcbError('object-mismatch', 3, { id: o.id });
  const v = lib.getObject(root, o.id); // object-mismatch 3 when the bytes differ from the name
  const bytes = lib.canonicalize(v);
  if (typeof o.sha256 === 'string' && lib.sha256hex(bytes) !== o.sha256) throw tcbError('object-mismatch', 3, { id: o.id });
  if (SEED_ID_RE.test(bytes)) throw tcbError('seed-id', 3, { id: o.id });
  return { value: v, bytes };
}

function commitRecordPath(root, task, step) {
  return path.join(root, 'store', 'commits', `${task}.${step}.json`);
}

/** gate.mjs's rule (CONTRACT §4.10 currentDesign): the stpa/fmea output for the cut with the highest commit seq. */
function pickDesignOutput(root, rows, lines, kind, cutSha) {
  let best = null;
  for (const r of rows) {
    if (!r || r.stage !== 'design-check' || r.role !== kind || r.state !== 'committed') continue;
    let rec;
    try {
      rec = lib.readJson(commitRecordPath(root, r.task, kind));
    } catch (e) {
      if (e && e.exit === 2) continue;
      throw e;
    }
    const o = (rec.outputs ?? []).find((x) => x && x.kind === kind);
    if (!o) continue;
    const { value, bytes } = loadCheckedOutput(root, o);
    if (!value || value.cut_sha !== cutSha) continue;
    const line = lib.lastLine(lines, 'commit', (l) => l && l.task === r.task && l.data && l.data.step === kind);
    const seq = line ? line.seq : 0;
    if (!best || seq > best.seq) best = { seq, id: o.id, bytes };
  }
  return best;
}

function nonce8() {
  return crypto.randomBytes(4).toString('hex');
}

function buildReviewIn(root, row, rows, protocol, rdir) {
  const dep = (row.deps ?? []).map((d) => rows.find((r) => r && r.task === d)).find((r) => r && r.commits && r.commits.pack);
  if (!dep) throw tcbError('missing', 2, { what: 'pack-commit', task: row.task });
  const rec = lib.readJson(commitRecordPath(root, dep.task, 'pack'));
  const po = (rec.outputs ?? []).find((o) => o && o.kind === 'pack');
  if (!po) throw tcbError('missing', 2, { what: 'pack-output', task: dep.task });
  const pack = loadCheckedOutput(root, po);
  const cardSha = new Map((rec.outputs ?? []).filter((o) => o && o.kind === 'card').map((o) => [o.id, o]));

  const base = path.join(root, 'review-in');
  const tmp = path.join(base, `.${row.task}.${process.pid}.${nonce8()}.tmp`);
  guardUnder(tmp, root);
  const put = (rel, data) => {
    const abs = path.join(tmp, ...relSegments(rel));
    guardUnder(abs, tmp);
    lib.writeAtomic(abs, data);
  };
  try {
    put('pack.json', pack.bytes);
    const cardIds = Array.isArray(pack.value.cards) ? pack.value.cards : [];
    for (const cid of cardIds) {
      const o = cardSha.get(cid) ?? { id: cid };
      const c = loadCheckedOutput(root, o);
      put(`cards/${cid}.json`, c.bytes);
    }
    const ourWork = path.join(root, 'plan', 'our-work');
    const plants = path.join(root, 'sealed', 'plants', row.task);
    for (const rel of (protocol && protocol.value && protocol.value.fixed_files) || []) {
      const segs = relSegments(rel);
      const planted = path.join(plants, ...segs);
      const original = path.join(ourWork, ...segs);
      guardUnder(planted, plants);
      guardUnder(original, ourWork);
      const src = exists(planted) ? planted : original;
      put(`files/${segs.join('/')}`, readBytesOrMissing(src, 'fixed-file'));
    }
    let records = [];
    try {
      records = lib.readJsonl(path.join(root, 'store', 'witness.jsonl')).records ?? [];
    } catch (e) {
      if (!(e && e.exit === 2)) throw e;
    }
    const lastWitness = new Map();
    for (const w of records) if (w && w.card_id) lastWitness.set(w.card_id, w);
    for (const cid of cardIds) {
      const w = lastWitness.get(cid);
      if (!w || typeof w.text_sha !== 'string' || !SHA_RE.test(w.text_sha)) continue;
      const src = path.join(root, '.snapshots', 'text', w.text_sha);
      put(`snapshots/${w.text_sha}.txt`, readBytesOrMissing(src, 'snapshot-text'));
    }
    fs.mkdirSync(tmp, { recursive: true });
    fs.renameSync(tmp, rdir);
  } catch (e) {
    try {
      if (exists(tmp)) lib.removeTree(tmp);
    } catch {
      /* the temp folder is left for fsck */
    }
    throw e;
  }
}

function buildAttempt(env, info) {
  const { root } = env;
  const { row, rows, lines, E, dir, f5Given, userFiles } = info;
  const inDir = path.join(dir, 'in');
  const put = (rel, data) => {
    const abs = path.join(inDir, ...relSegments(rel));
    guardUnder(abs, inDir);
    lib.writeAtomic(abs, data);
  };
  const tcb = path.join(root, 'tcb');

  // profile
  const role = row.role;
  if (typeof role !== 'string' || !TYPE_RE.test(role)) throw tcbError('missing', 2, { what: 'profile', role: role ?? null });
  const profile = lib.readJson(path.join(tcb, 'profiles', `${role}.json`));
  const agentTypes = Array.isArray(profile.agent_types) ? profile.agent_types : [];

  // 5 checkpoint
  const committed = [];
  for (const step of Object.keys(row.commits ?? {}).sort()) {
    const rec = lib.readJson(commitRecordPath(root, row.task, step));
    for (const o of rec.outputs ?? []) {
      const { bytes } = loadCheckedOutput(root, o);
      put(`checkpoint/committed/${o.id}.json`, bytes);
      committed.push({ id: o.id, kind: o.kind ?? null, step });
    }
  }
  const prefixFiles = new Map();
  const mismatched = new Set();
  const conflicts = new Set();
  const earlier = [...(row.attempts ?? [])].filter((a) => a && typeof a.epoch === 'number' && a.epoch < E && a.cut).sort((x, y) => x.epoch - y.epoch);
  for (const a of earlier) {
    const adir = attemptDir(root, row.task, a.epoch, a);
    guardUnder(adir, root);
    const cutFiles = a.cut && a.cut.files ? Object.keys(a.cut.files) : [];
    if (!exists(adir)) {
      for (const rel of cutFiles) mismatched.add(posix(rel));
      continue;
    }
    const got = lib.readCutPrefix(adir, a.cut);
    for (const m of got.mismatched ?? []) mismatched.add(posix(m));
    for (const [rel, buf] of Object.entries(got.files ?? {})) {
      const key = relSegments(rel).join('/');
      const prev = prefixFiles.get(key);
      if (prev && !Buffer.from(prev).equals(Buffer.from(buf))) conflicts.add(key);
      prefixFiles.set(key, buf);
    }
  }
  for (const [rel, buf] of prefixFiles) put(`checkpoint/prefix/${rel}`, buf);

  // 6 inputs
  let protocol = null;
  if (row.field !== null && row.field !== undefined) {
    protocol = lib.currentProtocol(root, row.field);
    if (!protocol) throw tcbError('missing', 2, { what: 'protocol', field: row.field });
    put('protocol.json', readBytesOrMissing(path.resolve(root, protocol.path), 'protocol'));
    put('questions_sha.txt', `${lib.questionsSha(protocol.value.question_ids ?? [])}\n`);
    const urls = (protocol.value.must_read ?? []).map((m) => ({ url: m.url, href: new URL(m.url).href }));
    put('must_read.json', lib.canonicalize({ schema_version: 1, urls }));
  }
  if (agentTypes.includes('reader')) {
    put('reader-brief.md', readBytesOrMissing(path.join(tcb, 'briefs', 'reader.md'), 'reader-brief'));
  }
  if (row.stage === 'design-check') {
    const cur = lib.currentDesign(root) ?? {};
    if (!cur.cut_sha) throw tcbError('missing', 2, { what: 'cut' });
    put('cut.md', readBytesOrMissing(path.join(root, 'completeness', `cut-${cur.cut_sha.slice(0, 12)}.md`), 'cut'));
    put('cut_sha.txt', `${cur.cut_sha}\n`);
    if (role === 'mapper') {
      for (const kind of ['stpa', 'fmea']) {
        const pick = pickDesignOutput(root, rows, lines, kind, cur.cut_sha);
        if (!pick) throw tcbError('missing', 2, { what: kind, cut_sha: cur.cut_sha });
        put(`${kind}.json`, pick.bytes);
      }
      put('problems.md', readBytesOrMissing(path.join(root, 'plan', 'our-work', 'problems.md'), 'problems'));
      if (cur.hazards_id) {
        const { bytes } = loadCheckedOutput(root, { id: cur.hazards_id, sha256: cur.hazards_sha ?? undefined });
        put('hazards.json', bytes);
      }
    }
  }

  // 7 todo
  const v = lib.variant(root, row, { f5Given }) ?? {};
  const todo = {
    schema_version: 1,
    task: row.task,
    epoch: E,
    todo: Array.isArray(v.uncovered) ? v.uncovered : [],
    covered: Array.isArray(v.covered) ? v.covered : [],
  };
  const viewTodo = path.join(dir, 'view', 'todo.json');
  guardUnder(viewTodo, dir);
  lib.writeAtomic(viewTodo, lib.canonicalize(todo));
  fs.mkdirSync(path.join(dir, 'staging'), { recursive: true });

  // 8 review-in (fresh review only), built once per task (R13)
  let reviewIn = null;
  if (row.stage === 'fresh-review') {
    const rdir = path.join(root, 'review-in', row.task);
    guardUnder(rdir, root);
    const built = !exists(rdir);
    if (built) buildReviewIn(root, row, rows, protocol, rdir);
    const { files, links } = lib.walkFiles(rdir);
    if (links && links.length) throw tcbError('untrusted-path', 3, { links: links.map(posix) });
    for (const rel of files ?? []) put(relSegments(rel).join('/'), fs.readFileSync(path.join(rdir, ...relSegments(rel))));
    reviewIn = { built, files: (files ?? []).length };
  }

  // 9 brief
  const briefName = exists(path.join(tcb, 'briefs', `${role}.md`)) ? role : BRIEF_FALLBACK[role] ?? role;
  const template = readBytesOrMissing(path.join(tcb, 'briefs', `${briefName}.md`), 'brief').toString('utf8');
  const values = {
    task: row.task,
    epoch: String(E),
    field: row.field ?? '',
    folder: posix(dir),
    role,
    todo_json: JSON.stringify(todo.todo),
    checkpoint_json: JSON.stringify({ committed: committed.map((c) => c.id), prefix: [...prefixFiles.keys()].sort() }),
    must_read_json: JSON.stringify(protocol && Array.isArray(protocol.value.must_read) ? protocol.value.must_read : []),
  };
  const unknownBrief = [];
  const brief = template.replace(/\{\{([^{}]*)\}\}/g, (m, name) => {
    if (BRIEF_KEYS.includes(name)) return values[name];
    unknownBrief.push(name);
    return m;
  });
  if (unknownBrief.length) throw tcbError('brief-placeholder', 2, { unknown: unknownBrief });
  put('brief.md', brief);
  const briefSha = lib.sha256hex(brief);

  // 10 settings and agent files
  const settingsTpl = readBytesOrMissing(path.join(tcb, 'settings', `${role}.json`), 'settings').toString('utf8');
  const sv = { root: posix(root), attempt: posix(dir), task: row.task, epoch: String(E), node: process.execPath };
  const leftOver = [];
  const settings = settingsTpl.replace(/\{([A-Za-z_][A-Za-z0-9_-]*)\}/g, (m, name) => {
    if (Object.prototype.hasOwnProperty.call(sv, name)) return JSON.stringify(sv[name]).slice(1, -1);
    leftOver.push(name);
    return m;
  });
  if (leftOver.length) throw tcbError('settings-placeholder', 2, { unknown: leftOver });
  try {
    JSON.parse(settings.replace(/^﻿/, ''));
  } catch {
    throw tcbError('settings-placeholder', 2, { unparseable: true });
  }
  const claudeDir = path.join(dir, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');
  guardUnder(settingsPath, dir);
  lib.writeAtomic(settingsPath, settings);
  const settingsSha = lib.sha256hex(settings);
  const agents = [];
  for (const type of agentTypes) {
    if (typeof type !== 'string' || !TYPE_RE.test(type)) throw tcbError('missing', 2, { what: 'agent', type: type ?? null });
    const bytes = readBytesOrMissing(path.join(tcb, 'agents', `${type}.md`), 'agent');
    const dst = path.join(claudeDir, 'agents', `${type}.md`);
    guardUnder(dst, dir);
    lib.writeAtomic(dst, bytes);
    agents.push({ type, sha256: lib.sha256hex(bytes) });
  }
  agents.sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : 0));

  // 11 manifest (§3.5)
  const walked = lib.walkFiles(inDir);
  if (walked.links && walked.links.length) throw tcbError('untrusted-path', 3, { links: walked.links.map(posix) });
  const inputs = (walked.files ?? [])
    .map((rel) => relSegments(rel).join('/'))
    .filter((rel) => rel !== 'manifest.json')
    .map((name) => ({ name, sha256: lib.sha256hex(fs.readFileSync(path.join(inDir, ...relSegments(name)))) }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const outputs = (row.steps ?? []).map((s) => ({ step: s, kinds: STEP_KINDS[s] ?? [] }));
  const schemaNames = [...new Set([...outputs.flatMap((o) => o.kinds), 'ready'])].sort();
  const schemaShas = {};
  for (const n of schemaNames) schemaShas[n] = lib.sha256hex(readBytesOrMissing(path.join(tcb, 'schemas', `${n}.schema.json`), 'schema'));
  const manifest = {
    schema_version: 1,
    kind: 'manifest',
    task: row.task,
    epoch: E,
    role,
    brief_sha: briefSha,
    schema_shas: schemaShas,
    tier: row.tier ?? '',
    tools: Array.isArray(profile.tools_allow) ? profile.tools_allow : [],
    inputs,
    agents,
    user_files: userFiles,
    outputs,
  };
  const stored = lib.putObject(root, manifest);
  put('manifest.json', lib.canonicalize(manifest));

  return {
    manifestId: stored.id,
    settingsSha,
    todo,
    checkpoint: {
      committed: committed.map((c) => c.id),
      prefix: [...prefixFiles.keys()].sort(),
      mismatched: [...mismatched].sort(),
      conflicts: [...conflicts].sort(),
    },
    reviewIn,
  };
}

async function modeStart(env, flags) {
  const { root, th } = env;
  const T = flags.task;
  const E = flags.epoch;
  const transcriptsRoot = th.get('transcripts_root');
  const f5Given = !!th.get('f5_given', false);

  // Outside the lock: the process list, every attempt's spend, the user files' hashes.
  let procList = null;
  try {
    procList = await env.proc.list();
  } catch {
    procList = null; // admit refuses with slots-unknown
  }
  const table0 = lib.readTasks(root);
  const spentOf = spentOfRows(root, table0.tasks ?? [], transcriptsRoot);
  const userPaths = th.get('user_files', []);
  const userFiles = (Array.isArray(userPaths) ? userPaths : []).map((p) => ({ path: p, sha256: hashFileOrNull(p) }));

  return await underLock(
    env,
    (handle) => {
      const table = lib.readTasks(root);
      const rows = table.tasks ?? [];
      const row = rows.find((r) => r && r.task === T);
      if (!row) throw tcbError('no-task', 1, { task: T });
      if (row.epoch !== E) throw tcbError('stale-epoch', 65, { expected: E, actual: row.epoch });
      const att = attemptOrNull(row, E);
      if (row.step === 'admitted' && att && att.manifest) {
        return {
          exit: 0,
          result: { task: T, epoch: E, folder: att.folder ?? null, manifest: att.manifest, settings_sha: att.settings_sha ?? null, repeat: true },
          reasons: [],
        };
      }
      if (!((row.state === 'active' || row.state === 'parked') && row.step === 'stopped')) {
        throw tcbError('wrong-step', 65, { state: row.state, step: row.step });
      }
      if (!att) throw tcbError('no-attempt', 2, { task: T, epoch: E });

      // 3 admission (admit.mjs decide, inside the lock)
      const facts = gatherFacts(root, { task: T, now: env.now, freeMb: env.freeMb, procList, ce: env.ce, spentOf, table });
      const dec = decide(facts);
      if (!dec.admit) {
        if (handle) incident(env, handle, 'refusal', { code: 'deferred', reasons: dec.reasons }, T, E);
        return { exit: 6, result: { task: T, epoch: E, admit: false, reservation: dec.reservation }, reasons: dec.reasons };
      }
      const dir = attemptDir(root, T, E, att);
      guardUnder(dir, root);
      if (!handle) {
        return { exit: 0, result: { task: T, epoch: E, admit: true, reservation: dec.reservation, folder: posix(path.relative(root, dir)) }, reasons: [] };
      }

      // 4 a torn start's remains (a link inside → untrusted-path 3, the folder left as it is)
      if (exists(dir)) lib.removeTree(dir);
      const { lines } = lib.readLedger(root);
      let built;
      let created = false;
      try {
        fs.mkdirSync(dir, { recursive: true });
        created = true;
        guardUnder(dir, root);
        built = buildAttempt(env, { row, rows, lines: lines ?? [], E, dir, f5Given, userFiles });
      } catch (e) {
        if (created) {
          try {
            lib.removeTree(dir);
          } catch (e2) {
            process.stderr.write(`[replace] partial folder not removed: ${e2 && e2.message}\n`);
          }
        }
        throw e;
      }

      // 12 the row
      const folderRel = posix(path.relative(root, dir));
      lib.updateRow(root, handle, { task: T, epoch: E, steps: ['stopped'], states: ['active', 'parked'] }, (copy) => {
        const i = attemptIndex(copy, E);
        copy.attempts[i] = { ...copy.attempts[i], folder: folderRel, manifest: built.manifestId, settings_sha: built.settingsSha };
        copy.step = 'admitted';
        copy.state = 'active';
        return copy;
      });

      // 13 the admit line
      const B = th.get('B_tokens', null);
      const r = th.get('r_tokens', null);
      append(env, handle, 'admit', T, E, {
        e_task: row.e_task,
        reservation: dec.reservation,
        B,
        r,
        live: facts.slots ? facts.slots.live ?? null : null,
        free_mb: typeof env.freeMb === 'number' ? env.freeMb : null,
      });
      process.stderr.write(`[replace] ${T} e${E} admitted in ${folderRel}\n`);
      return {
        exit: 0,
        result: {
          task: T,
          epoch: E,
          folder: folderRel,
          manifest: built.manifestId,
          settings_sha: built.settingsSha,
          reservation: dec.reservation,
          todo: built.todo.todo,
          checkpoint: built.checkpoint,
          review_in: built.reviewIn,
        },
        reasons: [],
      };
    },
    T,
    E,
  );
}

// ---------------------------------------------------------------------------------------------
// bind

async function modeBind(env, flags) {
  const { root, th } = env;
  const T = flags.task;
  const E = flags.epoch;
  const SID = flags.session;
  const transcriptsRoot = th.get('transcripts_root');
  const boot = env.boot ?? null;

  // Outside the lock: the transcript's first cwd, if a transcript of SID exists.
  let cwd = null;
  try {
    const st = lib.sessionTranscripts(transcriptsRoot, SID);
    if (st && st.main) cwd = firstCwd(st.main);
  } catch {
    cwd = null;
  }

  return await underLock(
    env,
    (handle) => {
      const table = lib.readTasks(root);
      const row = (table.tasks ?? []).find((r) => r && r.task === T);
      if (!row) throw tcbError('no-task', 1, { task: T });
      if (row.epoch !== E) throw tcbError('stale-epoch', 65, { expected: E, actual: row.epoch });
      if (row.state === 'active' && row.step === 'bound') {
        if (row.session === SID) return { exit: 0, result: { task: T, epoch: E, session: SID, repeat: true }, reasons: [] };
        throw tcbError('session-differs', 1, { bound: row.session ?? null, session: SID });
      }
      if (row.state !== 'active' || (row.step !== 'admitted' && row.step !== 'started')) {
        throw tcbError('wrong-step', 65, { state: row.state, step: row.step });
      }
      // The attempt is looked up only once the step says one must exist: a bind on a planned row
      // (epoch 0, no attempts) is a wrong step (65), not a missing attempt (2).
      const att = lib.attemptOf(row, E);
      const dir = attemptDir(root, T, E, att);
      if (cwd !== null && !samePath(cwd, dir)) throw tcbError('wrong-folder', 1, { cwd: posix(cwd), folder: posix(dir) });
      if (row.step === 'started') {
        const known = att.session ?? row.session ?? null;
        if (known && known !== SID) throw tcbError('session-differs', 1, { started: known, session: SID });
      }
      if (handle) {
        lib.updateRow(root, handle, { task: T, epoch: E, steps: ['admitted', 'started'], states: ['active'] }, (copy) => {
          const i = attemptIndex(copy, E);
          copy.attempts[i] = { ...copy.attempts[i], session: SID, bound_at: env.now, boot };
          copy.session = SID;
          copy.step = 'bound';
          return copy;
        });
        append(env, handle, 'bind', T, E, { session: SID, boot });
      }
      return { exit: 0, result: { task: T, epoch: E, session: SID, boot, bound_at: env.now }, reasons: [] };
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

  // Command-line checks, before anything is read (exit 66).
  if (typeof flags.root !== 'string' || !path.isAbsolute(flags.root)) throw usage({ flag: 'root' });
  if (!Number.isInteger(flags.ce) || flags.ce < 1) throw usage({ flag: 'ce' });
  if (mode !== 'plan') {
    if (typeof flags.task !== 'string' || !TASK_RE.test(flags.task)) throw usage({ flag: 'task' });
    if (!Number.isInteger(flags.epoch) || flags.epoch < 0) throw usage({ flag: 'epoch' });
  }
  if (mode === 'fence' && !REASONS.includes(flags.reason)) throw usage({ flag: 'reason', value: flags.reason ?? null });
  if (mode === 'bind' && (typeof flags.session !== 'string' || !SESSION_RE.test(flags.session))) throw usage({ flag: 'session' });
  if (flags.tick !== undefined && flags.tick !== null && (!Number.isInteger(flags.tick) || flags.tick < 0)) throw usage({ flag: 'tick' });
  if (flags['free-mb'] !== undefined && flags['free-mb'] !== null && flags['free-mb'] < 0) throw usage({ flag: 'free-mb' });
  if (flags.now !== undefined && flags.now !== null && Number.isNaN(Date.parse(flags.now))) throw usage({ flag: 'now' });

  const env = makeEnv(ctx, flags, dry);
  const needsBoot = mode === 'fence' || mode === 'bind';
  const edge = await lib.edgeFacts(flags, needsBoot ? env.proc : undefined);
  env.now = edge.now;
  env.freeMb = edge.freeMb;
  env.boot = edge.boot ?? null;

  // An early, read-only ce check: a stale coordinator gets 64 before any other refusal; the check
  // that guards writes runs again inside the run lock (withRunLock).
  lib.checkCe(env.root, env.ce);
  let out;
  if (mode === 'plan') out = await modePlan(env);
  else if (mode === 'fence') out = await modeFence(env, flags);
  else if (mode === 'start') out = await modeStart(env, flags);
  else out = await modeBind(env, flags);
  return { exit: 0, reasons: [], ...out, mode, dry_run: dry };
}

function isMainModule() {
  try {
    const self = path.resolve(fileURLToPath(import.meta.url));
    const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : '';
    return process.platform === 'win32' ? self.toLowerCase() === argv1.toLowerCase() : self === argv1;
  } catch {
    return false;
  }
}

if (isMainModule()) lib.runMain(import.meta.url, SCRIPT, main);
