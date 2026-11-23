// admit.mjs (unit U1a): the admission decision of R10.
// CONTRACT.md §5 (U1a), spec/admit.mjs.md. Exports the pure `decide(facts)` that replace.mjs calls
// inside its run lock, `gatherFacts(root, ...)` that reads the facts, and a read-only `check` mode.
// It reserves nothing: the reservation is computed at each decision and never stored.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lib from './lib.mjs';

const SCRIPT = 'admit';
const TASK_RE = /^(?!(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:$|\.))[a-z][a-z0-9-]{1,39}$/;
const PROTOCOL_STAGES = new Set(['research', 'review', 'fresh-review', 'control']);
const GATE_A_STAGES = new Set(['review', 'fresh-review']);
const RUNNABLE_STATES = new Set(['active', 'parked']);
const PENDING_STEPS = new Set(['admitted', 'started']);

// ---------------------------------------------------------------------------------------------
// Small helpers (no library code is copied here; these only adapt calls to the contract's API).

function tcbError(code, exit, detail = null) {
  if (typeof lib.TcbError === 'function') return new lib.TcbError(code, exit, detail);
  const e = new Error(code);
  e.name = 'TcbError';
  e.code = code;
  e.exit = exit;
  e.detail = detail;
  return e;
}

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

/** Thresholds through lib, with an optional default for names a test root may not carry. */
export function thresholdReader(root) {
  const t = lib.thresholds(root);
  return {
    raw: t,
    get(name, dflt) {
      try {
        return t.get(name);
      } catch (e) {
        if (dflt !== undefined && e && e.code === 'param-missing') return dflt;
        throw e;
      }
    },
    isGate(name) {
      try {
        return !!t.isGate(name);
      } catch {
        return false;
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Spend of attempts (transcript parsing: callers run these outside the run lock, CONTRACT §2.1).

/**
 * The transcript files of one attempt: its bound session (main + helpers), the sessions whose
 * transcript names the attempt folder as cwd (main + helpers), deduplicated by resolved path.
 */
export function attemptTranscriptFiles(transcriptsRoot, root, attempt) {
  const sessions = [];
  const folderSessions = [];
  const files = new Map();
  const addFile = (p) => {
    if (typeof p === 'string' && p) files.set(pathKey(p), path.resolve(p));
  };
  if (!attempt) return { sessions, folderSessions, files: [] };
  if (attempt.session) sessions.push(attempt.session);
  if (attempt.folder) {
    const folderAbs = path.resolve(root, attempt.folder);
    const found = safe(() => lib.transcriptsForFolder(transcriptsRoot, folderAbs), []) ?? [];
    for (const f of found) {
      if (f && f.sessionId && !folderSessions.includes(f.sessionId)) folderSessions.push(f.sessionId);
      if (f && f.sessionId && !sessions.includes(f.sessionId)) sessions.push(f.sessionId);
      addFile(f && f.path);
    }
  }
  for (const s of sessions) {
    const st = safe(() => lib.sessionTranscripts(transcriptsRoot, s), null);
    if (!st) continue;
    addFile(st.main);
    for (const h of st.helpers ?? []) addFile(h);
  }
  return { sessions, folderSessions, files: [...files.values()].sort() };
}

/** spendOf over the given transcript files; unreadable files are skipped. */
export function spendOfFiles(files) {
  const parsed = [];
  for (const f of files ?? []) {
    try {
      parsed.push(lib.parseTranscript(f));
    } catch {
      /* a vanished or unreadable transcript adds nothing */
    }
  }
  if (parsed.length === 0) {
    return { calls: 0, input: 0, cache_read: 0, cache_write: 0, output: 0, total: 0, peak_context: 0, last_context: 0, partial: false };
  }
  return lib.spendOf(parsed);
}

/** Tokens spent by one attempt (0 when it has no transcript). */
export function attemptSpend(transcriptsRoot, root, attempt) {
  const { files } = attemptTranscriptFiles(transcriptsRoot, root, attempt);
  const s = spendOfFiles(files);
  return Number(s && s.total) || 0;
}

/** {"<task>:<epoch>": tokens} over every attempt of every row (R10: zombie and post-limit spend included). */
export function spentOfRows(root, rows, transcriptsRoot) {
  const out = {};
  for (const row of rows ?? []) {
    for (const a of row.attempts ?? []) {
      if (!a || typeof a.epoch !== 'number') continue;
      out[`${row.task}:${a.epoch}`] = attemptSpend(transcriptsRoot, root, a);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// decide(facts): pure, no I/O, no clock; every failing condition adds one reason.

function thValue(th, name) {
  const v = th ? th[name] : undefined;
  if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.prototype.hasOwnProperty.call(v, 'value')) return v.value;
  return v;
}

function thIsGate(th, name) {
  const value = thValue(th, name);
  if (value === null || value === undefined) return false;
  const ig = th ? th.isGate : undefined;
  if (ig && (typeof ig === 'object' || typeof ig === 'function') && Object.prototype.hasOwnProperty.call(ig, name)) return !!ig[name];
  if (typeof ig === 'function') return !!ig(name);
  const v = th ? th[name] : undefined;
  if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.prototype.hasOwnProperty.call(v, 'gate')) return !!v.gate;
  return true;
}

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

export function decide(facts) {
  const f = facts ?? {};
  const row = f.row ?? {};
  const rows = Array.isArray(f.rows) ? f.rows : [];
  const th = f.thresholds ?? {};
  const reasons = [];
  const add = (code, detail = null) => reasons.push({ code, detail });

  // 1. state and dependencies
  if (!(RUNNABLE_STATES.has(row.state) && row.step === 'stopped')) {
    add('wrong-state', { state: row.state ?? null, step: row.step ?? null });
  }
  const pendingDeps = [];
  for (const d of row.deps ?? []) {
    const dep = rows.find((r) => r && r.task === d);
    if (!dep || dep.state !== 'committed') pendingDeps.push(d);
  }
  if (pendingDeps.length) add('dep-not-committed', { deps: pendingDeps });

  // 2. frozen protocol (R33); design-check tasks (field null) skip it
  if (PROTOCOL_STAGES.has(row.stage) && !(f.protocol && f.protocol.frozen)) {
    add('no-protocol', { field: row.field ?? null });
  }

  // 3. the gate (R55, R40: missing = not-run = fail); skipped for design-check
  if (row.stage !== 'design-check') {
    const g = f.gate;
    if (!g || g.result === null || g.result === undefined) {
      add('gate-missing', null);
    } else {
      if (g.result !== 'pass') add('gate-fail', { result: g.result });
      const cut = g.cut_sha ?? null;
      const haz = g.hazards_sha ?? null;
      const curCut = g.current_cut_sha ?? null;
      const curHaz = g.current_hazards_sha ?? null;
      if (cut !== curCut || haz !== curHaz) {
        add('gate-stale', { cut_sha: cut, hazards_sha: haz, current_cut_sha: curCut, current_hazards_sha: curHaz });
      }
    }
  }

  // 4. selftest for the current tcb (R41)
  const st = f.selftest;
  if (!st || st.result === null || st.result === undefined) add('selftest-missing', null);
  else {
    if (st.result !== 'pass') add('selftest-fail', { result: st.result });
    if ((st.tcb_sha ?? null) !== (st.current_tcb_sha ?? null)) {
      add('selftest-stale', { tcb_sha: st.tcb_sha ?? null, current_tcb_sha: st.current_tcb_sha ?? null });
    }
  }

  // 5. a passing fsck newer than the last intake/commit (R23)
  const fk = f.fsck;
  if (!fk || fk.result === null || fk.result === undefined) add('fsck-missing', null);
  else {
    if (fk.result !== 'pass') add('fsck-fail', { result: fk.result });
    const lw = num(fk.last_write_seq);
    if (lw !== null && !(num(fk.seq) !== null && fk.seq > lw)) {
      add('fsck-stale', { seq: fk.seq ?? null, last_write_seq: lw });
    }
  }

  // 6. slots over live processes (R10, F6)
  const nMax = num(thValue(th, 'N_max'));
  const nCeil = num(thValue(th, 'N_ceiling'));
  if (nMax === null) add('param-missing', { name: 'N_max' });
  else if (nCeil !== null && nMax > nCeil) add('ceiling', { N_max: nMax, N_ceiling: nCeil });
  const slots = f.slots;
  if (slots === null || slots === undefined) add('slots-unknown', null);
  else if (nMax !== null) {
    const live = num(slots.live) ?? 0;
    const unknown = num(slots.unknown) ?? 0;
    const unconfirmed = num(slots.unconfirmed) ?? 0;
    const cap = Math.min(nMax, nCeil ?? nMax);
    if (live + unknown + unconfirmed >= cap) add('slots-full', { live, unknown, unconfirmed, N_max: nMax });
  }

  // 7. memory: free − reserve − peak × pending must still cover one peak
  const peak = num(thValue(th, 'peak_mb'));
  const reserve = num(thValue(th, 'reserve_mb'));
  const pending = num(f.pending) ?? 0;
  const freeMb = num(f.freeMb);
  if (peak === null || reserve === null) {
    add('param-missing', { name: peak === null ? 'peak_mb' : 'reserve_mb' });
  } else if (freeMb === null || freeMb - reserve - peak * pending < peak) {
    add('memory', { free_mb: freeMb, reserve_mb: reserve, peak_mb: peak, pending });
  }

  // 8. budget: the reservation is always computed and returned; a refusal only under a gate
  const spent = f.spentOf ?? {};
  const spentOf = (task, epoch) => {
    const v = spent[`${task}:${epoch}`];
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  };
  const res = lib.reservation(rows, spentOf);
  const reservation = typeof res === 'number' ? res : num(res && res.reservation) ?? 0;
  if (thIsGate(th, 'B_tokens')) {
    const B = thValue(th, 'B_tokens');
    const r = num(thValue(th, 'r_tokens')) ?? 0;
    const eTask = num(row.e_task) ?? 0;
    if (B - reservation - r < eTask) add('budget', { B, reservation, r, e_task: eTask });
  }

  // 9. halt and drain (R12: every start is blocked while draining)
  if (f.halted) add('halted', null);
  if (f.draining) add('draining', null);

  // 10. gate A before a review (R44)
  if (GATE_A_STAGES.has(row.stage)) {
    const ga = f.gateA;
    if (!ga) add('gate-a-uncovered', { ids: null });
    else if (ga.needed !== false) {
      const ids = Array.isArray(ga.uncovered) ? ga.uncovered : [];
      if (ids.length) add('gate-a-uncovered', { ids });
      const f5 = !!thValue(th, 'f5_given');
      const share = num(ga.unverifiable_share);
      if (f5 && share !== null && thIsGate(th, 'unverifiable_share_max')) {
        const max = thValue(th, 'unverifiable_share_max');
        if (share > max) add('gate-a-unverifiable', { share, max });
      }
    }
  }

  return { admit: reasons.length === 0, reasons, reservation };
}

// ---------------------------------------------------------------------------------------------
// gatherFacts: reads the files the decision needs (no transcript parse when spentOf is given).

function readJsonOrNull(file) {
  try {
    return { value: lib.readJson(file), error: null };
  } catch (e) {
    if (e && (e.exit === 2 || e.code === 'missing' || e.code === 'unparseable')) return { value: null, error: e };
    throw e;
  }
}

function loadCommitRecords(root, lines, cache) {
  if (cache && cache.commits) return cache.commits;
  const dir = path.join(root, 'store', 'commits');
  const out = [];
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort();
  } catch {
    names = [];
  }
  for (const n of names) {
    const { value: rec } = readJsonOrNull(path.join(dir, n));
    if (!rec || !Array.isArray(rec.outputs)) continue;
    const commitLine = lib.lastLine(lines, 'commit', (l) => l.task === rec.task && l.data && l.data.step === rec.step);
    const objects = [];
    for (const o of rec.outputs) {
      if (!o || (o.kind !== 'card' && o.kind !== 'pack')) continue;
      const v = lib.getObject(root, o.id);
      if (lib.sha256hex(lib.canonicalize(v)) !== o.sha256) throw tcbError('object-mismatch', 3, { id: o.id });
      objects.push({ id: o.id, kind: o.kind, value: v });
    }
    out.push({ task: rec.task, step: rec.step, seq: commitLine ? commitLine.seq : 0, objects });
  }
  if (cache) cache.commits = out;
  return out;
}

function lastCardStatus(root, cache) {
  if (cache && cache.status) return cache.status;
  const map = new Map();
  try {
    const { records } = lib.readJsonl(path.join(root, 'store', 'status', 'card_status.jsonl'));
    for (const r of records ?? []) if (r && r.card_id) map.set(r.card_id, r);
  } catch (e) {
    if (!(e && e.exit === 2)) throw e;
  }
  if (cache) cache.status = map;
  return map;
}

function gateAFacts(root, row, lines, f5Given, cache) {
  const proto = lib.currentProtocol(root, row.field);
  const approved = proto && proto.value && Array.isArray(proto.value.question_ids) ? proto.value.question_ids : [];
  const records = loadCommitRecords(root, lines, cache);
  const status = lastCardStatus(root, cache);
  const cards = new Map();
  let latestPack = null;
  for (const rec of records) {
    for (const o of rec.objects) {
      if (o.kind === 'card' && o.value && o.value.field === row.field) cards.set(o.id, o.value);
      if (o.kind === 'pack' && o.value && o.value.field === row.field) {
        if (!latestPack || rec.seq > latestPack.seq) latestPack = { seq: rec.seq, value: o.value };
      }
    }
  }
  const covered = new Set();
  let unverifiable = 0;
  for (const [id, card] of cards) {
    const s = status.get(id);
    const st = s ? s.status : 'pending';
    if (st === 'unverifiable') unverifiable += 1;
    const covers = f5Given ? st === 'witnessed' || st === 'confirmed' : true;
    if (covers) for (const q of card.question_ids ?? []) covered.add(q);
  }
  const notCovered = new Set(
    latestPack && Array.isArray(latestPack.value.not_covered) ? latestPack.value.not_covered.map((x) => x && x.question_id) : [],
  );
  const uncovered = approved.filter((q) => !covered.has(q) && !notCovered.has(q));
  return {
    needed: true,
    uncovered,
    unverifiable_share: cards.size ? unverifiable / cards.size : null,
  };
}

/**
 * Reads every fact `decide` needs. `procList` is the process list taken by the caller (null when
 * PowerShell failed); `spentOf` may be passed in (replace computes it before taking the lock);
 * `table` may be passed in (replace has read it under the lock). The returned facts also carry
 * `unreadable`: the fact files that were missing or unparseable (check mode exits 2 on them).
 */
export function gatherFacts(root, { task, now = null, freeMb = null, procList = null, ce = null, spentOf = null, table = null, cache = null } = {}) {
  void now;
  const th = thresholdReader(root);
  const tbl = table ?? lib.readTasks(root);
  const rows = Array.isArray(tbl.tasks) ? tbl.tasks : [];
  const row = rows.find((r) => r && r.task === task);
  if (!row) throw tcbError('no-task', 1, { task });
  const transcriptsRoot = th.get('transcripts_root');
  const unreadable = [];
  const { lines } = lib.readLedger(root);
  const allLines = Array.isArray(lines) ? lines : [];

  let runCe = ce;
  if (runCe === null || runCe === undefined) {
    const { value: coord, error } = readJsonOrNull(path.join(root, 'run', 'coord.json'));
    if (coord && typeof coord.ce === 'number') runCe = coord.ce;
    else if (error) unreadable.push({ code: error.code ?? 'missing', detail: { file: 'run/coord.json' } });
  }

  const f5Given = !!th.get('f5_given', false);
  const thresholds = {
    N_max: th.get('N_max'),
    N_ceiling: th.get('N_ceiling'),
    peak_mb: th.get('peak_mb'),
    reserve_mb: th.get('reserve_mb'),
    B_tokens: th.get('B_tokens', null),
    r_tokens: th.get('r_tokens', null),
    unverifiable_share_max: th.get('unverifiable_share_max', null),
    f5_given: f5Given,
    isGate: {
      N_max: th.isGate('N_max'),
      N_ceiling: th.isGate('N_ceiling'),
      peak_mb: th.isGate('peak_mb'),
      reserve_mb: th.isGate('reserve_mb'),
      B_tokens: th.isGate('B_tokens'),
      r_tokens: th.isGate('r_tokens'),
      unverifiable_share_max: th.isGate('unverifiable_share_max'),
      f5_given: th.isGate('f5_given'),
    },
  };

  // protocol (R33)
  const protocolNeeded = PROTOCOL_STAGES.has(row.stage);
  const frozen =
    row.field !== null &&
    row.field !== undefined &&
    allLines.some(
      (l) => l && (l.kind === 'protocol-freeze' || l.kind === 'protocol-amend') && l.data && l.data.name === `protocol-${row.field}`,
    );
  const protocol = { needed: protocolNeeded, frozen };

  // gate (R55)
  let gate = null;
  const gateNeeded = row.stage !== 'design-check';
  if (gateNeeded) {
    const { value: g, error } = readJsonOrNull(path.join(root, 'completeness', 'gate.json'));
    if (error) unreadable.push({ code: error.code ?? 'missing', detail: { file: 'completeness/gate.json' } });
    else if (g && g.schema_version !== 1) unreadable.push({ code: 'schema-version', detail: { file: 'completeness/gate.json' } });
    else if (g) {
      const cur = lib.currentDesign(root) ?? {};
      gate = {
        needed: true,
        result: g.result ?? null,
        cut_sha: g.cut_sha ?? null,
        hazards_sha: g.hazards_sha ?? null,
        current_cut_sha: cur.cut_sha ?? null,
        current_hazards_sha: cur.hazards_sha ?? null,
      };
    }
  }

  // selftest (R41)
  let selftest = null;
  const stLine = lib.lastLine(allLines, 'selftest');
  if (stLine) {
    let current = cache && cache.tcbSha;
    if (!current) {
      current = lib.treeSha(path.join(root, 'tcb'));
      if (cache) cache.tcbSha = current;
    }
    selftest = { result: stLine.data ? stLine.data.result ?? null : null, tcb_sha: stLine.data ? stLine.data.tcb_sha ?? null : null, current_tcb_sha: current };
  }

  // fsck (R23)
  let fsck = null;
  const fsckLine = lib.lastLine(allLines, 'fsck');
  if (fsckLine) {
    let lastWrite = null;
    for (const l of allLines) if (l && (l.kind === 'intake' || l.kind === 'commit') && (lastWrite === null || l.seq > lastWrite)) lastWrite = l.seq;
    fsck = { result: fsckLine.data ? fsckLine.data.result ?? null : null, seq: fsckLine.seq, last_write_seq: lastWrite };
  }

  // slots and pending sessions (F6: count live processes, not table state)
  const slots = procList === null || procList === undefined ? null : lib.slotCount(rows, procList, transcriptsRoot, { root });
  let pending = 0;
  for (const r of rows) {
    if (!r || r.state !== 'active' || !PENDING_STEPS.has(r.step)) continue;
    if (!procList) {
      pending += 1;
      continue;
    }
    let att = null;
    try {
      att = lib.attemptOf(r, r.epoch);
    } catch {
      att = null;
    }
    const folder = att && att.folder ? path.resolve(root, att.folder) : path.join(root, 'wt', `${r.task}-e${r.epoch}`);
    const m = lib.attemptProcesses(procList, { folder, sessionId: (att && att.session) || null });
    if (!m || !Array.isArray(m.matched) || m.matched.length === 0) pending += 1;
  }

  const { halted, draining } = lib.runFlags(allLines, runCe ?? null);

  const gateA = GATE_A_STAGES.has(row.stage) ? gateAFacts(root, row, allLines, f5Given, cache) : null;

  return {
    row,
    rows,
    spentOf: spentOf ?? spentOfRows(root, rows, transcriptsRoot),
    thresholds,
    freeMb: typeof freeMb === 'number' ? freeMb : null,
    slots,
    pending,
    halted: !!halted,
    draining: !!draining,
    protocol,
    gate,
    selftest,
    fsck,
    gateA,
    unreadable,
  };
}

// ---------------------------------------------------------------------------------------------
// check mode (read-only: no lock, no ce, writes nothing)

const SPEC = {
  modes: ['check'],
  flags: {
    root: { type: 'string', required: true },
    task: { type: 'string' },
    now: { type: 'string' },
    'free-mb': { type: 'int' },
    'dry-run': { type: 'bool' },
  },
};

function isNotRunRefusal(decision, unreadable) {
  if (decision.admit) return false;
  if (unreadable.length) return true;
  return decision.reasons.length > 0 && decision.reasons.every((r) => r.code === 'slots-unknown');
}

async function main(ctx) {
  const argv = process.argv.slice(2);
  ctx.mode = 'check';
  ctx.dryRun = false;
  ctx.dry_run = false;
  const { mode, flags } = lib.parseArgs(argv, SPEC);
  if (mode !== 'check') throw tcbError('usage', 66, { mode: mode ?? null });
  if (typeof flags.root !== 'string' || !path.isAbsolute(flags.root)) throw tcbError('usage', 66, { flag: 'root' });
  if (flags.task !== undefined && flags.task !== null && !TASK_RE.test(flags.task)) throw tcbError('usage', 66, { flag: 'task' });
  if (flags.now !== undefined && flags.now !== null && Number.isNaN(Date.parse(flags.now))) throw tcbError('usage', 66, { flag: 'now' });
  if (flags['free-mb'] !== undefined && flags['free-mb'] !== null && flags['free-mb'] < 0) throw tcbError('usage', 66, { flag: 'free-mb' });
  const root = path.resolve(flags.root);

  const edge = await lib.edgeFacts(flags);
  const table = lib.readTasks(root); // 67 when corrupt
  const rows = Array.isArray(table.tasks) ? table.tasks : [];
  const th = thresholdReader(root);

  let candidates;
  if (flags.task) {
    const row = rows.find((r) => r && r.task === flags.task);
    if (!row) throw tcbError('no-task', 1, { task: flags.task });
    candidates = [row];
  } else {
    candidates = rows.filter((r) => r && RUNNABLE_STATES.has(r.state) && r.step === 'stopped');
  }

  let procList = null;
  try {
    const proc = lib.realProc({ exe: th.get('proc_exe') });
    procList = await proc.list();
  } catch {
    procList = null; // slots unknown: a fail-safe refusal
  }

  const transcriptsRoot = th.get('transcripts_root');
  const spentOf = candidates.length ? spentOfRows(root, rows, transcriptsRoot) : {};
  const cache = {};
  const decisions = [];
  const notRun = [];
  let slots = procList === null ? null : lib.slotCount(rows, procList, transcriptsRoot, { root });
  for (const row of candidates) {
    const facts = gatherFacts(root, { task: row.task, now: edge.now, freeMb: edge.freeMb, procList, ce: null, spentOf, table, cache });
    const d = decide(facts);
    slots = facts.slots;
    const reasons = [...d.reasons];
    for (const u of facts.unreadable) reasons.push(u);
    decisions.push({ task: row.task, admit: d.admit, reasons, reservation: d.reservation });
    notRun.push(isNotRunRefusal(d, facts.unreadable));
  }

  const result = {
    decisions,
    slots,
    free_mb: typeof edge.freeMb === 'number' ? edge.freeMb : null,
    B: th.get('B_tokens', null),
    r: th.get('r_tokens', null),
  };

  let exit = 0;
  let reasons = [];
  if (flags.task) {
    const d = decisions[0];
    if (!d.admit) {
      exit = notRun[0] ? 2 : 6;
      reasons = d.reasons;
    }
  } else if (decisions.length && decisions.every((d) => !d.admit)) {
    exit = notRun.some(Boolean) ? 2 : 6;
    for (const d of decisions) for (const r of d.reasons) reasons.push(r);
  }
  for (const d of decisions) {
    if (!d.admit) process.stderr.write(`[admit] ${d.task}: refused (${d.reasons.map((r) => r.code).join(', ')})\n`);
  }
  return { exit, result, reasons, mode: 'check', dry_run: false };
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
