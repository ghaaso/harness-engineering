// lib.mjs: the shared library of the trusted base (CONTRACT.md section 4).
//
// Named ES exports only, no side effects on import. Node built-ins only. Every refusal is a TcbError
// {code, exit, detail}; runMain turns it into the one stdout line of section 1.3.
//
// Library functions never read a clock, os.freemem(), the boot identifier or a process list on their
// own (section 1.2): they take now, freeMb, boot and proc as parameters. edgeFacts is the one place
// these are read, at the CLI edge. Two documented exceptions: appendLedger falls back to the clock
// for the information-only `ts` when a caller passes no `now`, and jitter uses Math.random.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
// child_process and fs are used through their default exports, looked up at call time, so a test
// that patches a property of either module (spec/lib.md T21b, T25b, T33, T88) reaches the library.
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';

// =============================================================================================
// Constants
// =============================================================================================

export const EXIT = Object.freeze({
  ok: 0,
  fail: 1,
  'not-run': 2,
  tamper: 3,
  'ready-wins': 5,
  deferred: 6,
  reopened: 10,
  ready: 11,
  repair: 12,
  'soft-limit': 13,
  'checker-batch': 14,
  'window-limit': 15,
  drain: 16,
  stall: 20,
  hang: 21,
  loop: 22,
  'hard-limit': 23,
  memory: 24,
  'stop-unconfirmed': 25,
  'common-cause': 26,
  'tamper-seen': 27,
  alarm: 30,
  'stale-ce': 64,
  'stale-epoch': 65,
  usage: 66,
  'table-corrupt': 67,
  internal: 70,
  'lock-busy': 75,
});

const SLUG_OF_EXIT = new Map(Object.entries(EXIT).map(([k, v]) => [v, k]));

/** The section 1.4 slug of an exit code (`internal` for a code the table does not name). */
export function exitSlug(exit) {
  return SLUG_OF_EXIT.get(exit) ?? 'internal';
}

export const STATES = Object.freeze(['planned', 'active', 'parked', 'committed', 'cut', 'failed', 'dropped']);
export const STEPS = Object.freeze(['none', 'fenced', 'stop-requested', 'stopped', 'admitted', 'started', 'bound']);
export const FAILURE_REASONS = Object.freeze(['stall', 'hang', 'loop', 'crash', 'tainted']);
export const REASONS = Object.freeze(['first', ...FAILURE_REASONS, 'memory', 'handover', 'cut', 'drop']);
export const COMMIT_STEPS = Object.freeze(['pack', 'review', 'stpa', 'fmea', 'hazards']);
export const STEP_KINDS = Object.freeze({
  pack: ['card', 'pack'],
  review: ['review'],
  stpa: ['stpa'],
  fmea: ['fmea'],
  hazards: ['hazards'],
});
export const LEDGER_KINDS = Object.freeze([
  'plan', 'fence', 'stop-request', 'stop', 'admit', 'bind', 'started', 'intake', 'commit',
  'zombie-write', 'event', 'drain', 'halt', 'overflow', 'check', 'witness', 'promote', 'audit',
  'fsck', 'selftest', 'protocol-freeze', 'protocol-amend', 'plan-freeze', 'seed-split', 'queue',
  'certificate', 'cut', 'gate', 'unit-costs', 'coord-init', 'ce-raise', 'coord-bind', 'owner',
  'intent-open', 'intent-done', 'meter', 'lock-break', 'torn-tail', 'incident',
]);
export const PREFIX = Object.freeze({
  card: 'c',
  pack: 'p',
  review: 'r',
  manifest: 'm',
  certificate: 'x',
  stpa: 'd',
  fmea: 'd',
  hazards: 'd',
  seed: 's',
});
export const ZERO_HASH = '0'.repeat(64);

// Section 1.5, exactly as the contract writes them. The task pattern refuses a DOS device name that
// is the whole name or is followed by a dot (`nul`, `com1`, `con.x`); `con-research` is a legal name
// (Win32 reserves only the bare device name, with or without an extension). spec/lib.md T2 lists
// `con-research` as 66; the contract is the source of truth and wins (see the build notes).
export const PATTERNS = Object.freeze({
  field: /^(?!(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$)[a-z][a-z0-9]{0,11}$/,
  questionKey: /^(?!(?:con|prn|aux|nul|com[0-9]|lpt[0-9])-)[a-z][a-z0-9]{0,11}-[a-z0-9]{1,12}-\d{2,3}$/,
  slug: /^[a-z][a-z0-9_]{0,47}$/,
  task: /^(?!(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:$|\.))[a-z][a-z0-9-]{1,39}$/,
  intentKey: /^(?!(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$)[a-z0-9][a-z0-9-]{0,63}$/,
  plantId: /^pl_[0-9a-f]{16}$/,
  objectId: /^[cprmxds]_[0-9a-f]{16}$/,
  queueItem: /^i_[0-9a-f]{16}$/,
  batch: /^b[0-9]+-[0-9]+$/,
  session: /^[0-9a-f-]{36}$/,
  sha256: /^[0-9a-f]{64}$/,
});

// =============================================================================================
// Errors
// =============================================================================================

export class TcbError extends Error {
  constructor(code, exit, detail) {
    const ex = Number.isInteger(exit) ? exit : (EXIT[code] ?? 70);
    super(`${code}${detail === undefined ? '' : `: ${safeString(detail)}`}`);
    this.name = 'TcbError';
    this.code = code;
    this.exit = ex;
    this.detail = detail === undefined ? null : detail;
  }
}

function safeString(v) {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

const err = (code, exit, detail) => new TcbError(code, exit, detail);

// =============================================================================================
// Small sync helpers: sleep, retry, the fs seam
// =============================================================================================

const SLEEP_CELL = new Int32Array(new SharedArrayBuffer(4));
function sleepMs(ms) {
  if (ms > 0) Atomics.wait(SLEEP_CELL, 0, 0, Math.ceil(ms));
}
const jitter = (lo, hi) => lo + Math.random() * (hi - lo);

let FS = fs;
/**
 * Test seam (spec/lib.md T21b, T25b): replace some `fs` functions (renameSync, unlinkSync, linkSync,
 * openSync, ...) for every library write until called again with null. Functions not given fall
 * back to node:fs. writeAtomic also takes `{fs}` as a third argument for one call.
 */
export function setFsSeam(partial) {
  FS = partial ? { ...fs, ...partial } : fs;
}
function fsOf(opts) {
  return opts && opts.fs ? { ...FS, ...opts.fs } : FS;
}

const SHARING = new Set(['EPERM', 'EACCES', 'EBUSY']);
const WRITE_RETRIES = 40;

/** Retry an fs operation that failed for a Windows sharing reason (section 4.3): 40 times, 25-100 ms. */
export function fsRetry(op) {
  for (let i = 0; ; i++) {
    try {
      return op();
    } catch (e) {
      if (!e || !SHARING.has(e.code) || i >= WRITE_RETRIES) throw e;
      sleepMs(jitter(25, 100));
    }
  }
}

function hasTempSibling(F, file) {
  try {
    const dir = path.dirname(file);
    const base = path.basename(file) + '.';
    return F.readdirSync(dir).some((n) => n.startsWith(base) && n.endsWith('.tmp'));
  } catch {
    return false;
  }
}

/** Read bytes; EPERM/EACCES and an ENOENT while a rename is in flight are retried 5 times, 20 ms apart. */
function readBytes(file, F = FS) {
  for (let i = 0; ; i++) {
    try {
      return F.readFileSync(file);
    } catch (e) {
      const transient = e && (SHARING.has(e.code) || (e.code === 'ENOENT' && hasTempSibling(F, file)));
      if (!transient || i >= 5) throw e;
      sleepMs(20);
    }
  }
}

function toBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === 'string') return Buffer.from(data, 'utf8');
  if (data instanceof Uint8Array) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return Buffer.from(JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function writeAll(F, fd, buf) {
  let off = 0;
  while (off < buf.length) off += F.writeSync(fd, buf, off, buf.length - off);
}

// =============================================================================================
// 4.1 CLI and exit helpers
// =============================================================================================

let LAST_ARGS = null;

const FLAG_CHECKS = {
  task: (v) => PATTERNS.task.test(v),
  field: (v) => PATTERNS.field.test(v),
  session: (v) => PATTERNS.session.test(v),
  root: (v) => path.isAbsolute(v),
  now: (v) => !Number.isNaN(Date.parse(v)),
};
const INT_CHECKS = {
  ce: (n) => n >= 1,
  epoch: (n) => n >= 0,
};

/**
 * parseArgs(argv, {modes?, flags: {name: {type, required?}}}) -> {mode, flags}. Flags are
 * `--name value` (also `--name=value`) or a bare boolean `--name`; a repeated list flag builds a
 * list. Absent booleans are false, absent other flags undefined. Every failure: usage 66.
 */
export function parseArgs(argv, spec = {}) {
  const defs = spec.flags || {};
  const modes = Array.isArray(spec.modes) ? spec.modes : null;
  const out = {};
  let mode = null;
  const args = Array.from(argv || [], String);
  for (let i = 0; i < args.length; i++) {
    const tok = args[i];
    if (tok.startsWith('--')) {
      let name = tok.slice(2);
      let inline;
      const eq = name.indexOf('=');
      if (eq >= 0) {
        inline = name.slice(eq + 1);
        name = name.slice(0, eq);
      }
      const def = Object.prototype.hasOwnProperty.call(defs, name) ? defs[name] : null;
      if (!def) throw err('usage', 66, { flag: name, why: 'unknown flag' });
      const type = def.type || 'string';
      if (type === 'bool') {
        if (inline !== undefined && inline !== 'true' && inline !== 'false') {
          throw err('usage', 66, { flag: name, why: 'boolean takes no value' });
        }
        if (Object.prototype.hasOwnProperty.call(out, name)) throw err('usage', 66, { flag: name, why: 'repeated' });
        out[name] = inline === undefined ? true : inline === 'true';
        continue;
      }
      let value = inline;
      if (value === undefined) {
        if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
          throw err('usage', 66, { flag: name, why: 'missing value' });
        }
        value = args[++i];
      }
      if (type === 'int') {
        if (!/^-?[0-9]+$/.test(value)) throw err('usage', 66, { flag: name, why: 'not an integer', value });
        const n = Number(value);
        if (!Number.isSafeInteger(n) || (INT_CHECKS[name] && !INT_CHECKS[name](n))) {
          throw err('usage', 66, { flag: name, why: 'out of range', value });
        }
        if (Object.prototype.hasOwnProperty.call(out, name)) throw err('usage', 66, { flag: name, why: 'repeated' });
        out[name] = n;
      } else if (type === 'list') {
        if (FLAG_CHECKS[name] && !FLAG_CHECKS[name](value)) throw err('usage', 66, { flag: name, why: 'malformed', value });
        (out[name] = out[name] || []).push(value);
      } else {
        if (FLAG_CHECKS[name] && !FLAG_CHECKS[name](value)) throw err('usage', 66, { flag: name, why: 'malformed', value });
        if (Object.prototype.hasOwnProperty.call(out, name)) throw err('usage', 66, { flag: name, why: 'repeated' });
        out[name] = value;
      }
    } else {
      if (!modes) throw err('usage', 66, { arg: tok, why: 'unexpected positional argument' });
      if (mode !== null) throw err('usage', 66, { arg: tok, why: 'more than one mode' });
      if (!modes.includes(tok)) throw err('usage', 66, { mode: tok, expect: modes });
      mode = tok;
    }
  }
  if (modes && mode === null) throw err('usage', 66, { why: 'missing mode', expect: modes });
  for (const [name, def] of Object.entries(defs)) {
    const req = def.required;
    const needed = req === true || (Array.isArray(req) && mode !== null && req.includes(mode));
    if (needed && !Object.prototype.hasOwnProperty.call(out, name)) {
      throw err('usage', 66, { flag: name, why: 'required' });
    }
    if (!Object.prototype.hasOwnProperty.call(out, name) && (def.type || 'string') === 'bool') out[name] = false;
  }
  LAST_ARGS = { mode, dryRun: out['dry-run'] === true };
  return { mode, flags: out };
}

function rootFromArgv(argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i]);
    if (a === '--root' && i + 1 < argv.length) return String(argv[i + 1]);
    if (a.startsWith('--root=')) return a.slice(7);
  }
  return null;
}

function toPathFromUrl(metaUrl) {
  const s = String(metaUrl);
  return s.startsWith('file:') ? fileURLToPath(s) : s;
}

/** sha256 of a script file's bytes (metaUrl: import.meta.url, or a path). */
export function scriptSha(metaUrl) {
  return sha256hex(fs.readFileSync(toPathFromUrl(metaUrl)));
}

let MAIN_SHA = null;
function mainScriptSha() {
  if (MAIN_SHA) return MAIN_SHA;
  try {
    MAIN_SHA = process.argv[1] ? sha256hex(fs.readFileSync(process.argv[1])) : null;
  } catch {
    MAIN_SHA = null;
  }
  if (!MAIN_SHA) MAIN_SHA = sha256hex(fs.readFileSync(fileURLToPath(import.meta.url)));
  return MAIN_SHA;
}

/**
 * runMain(metaUrl, script, fn): awaits fn(ctx), prints exactly one section 1.3 line on stdout and
 * sets the exit code. `fn` returns {exit=0, result, reasons?, mode?, dry_run?}. A TcbError becomes
 * its exit and reasons[0]; any other throw is 70 `internal`. Refuses (3 `run-from-attempt`) a script
 * file that lies under `<root>/wt/` (root from the `--root` argument). Returns the printed object.
 */
export async function runMain(metaUrl, script, fn) {
  const ctx = { script, writerSha: null, ledgerSeq: [], mode: null };
  let exit = 0;
  let result = {};
  let reasons = [];
  let ret = null;
  try {
    ctx.writerSha = scriptSha(metaUrl);
    const root = rootFromArgv(process.argv.slice(2));
    if (root && path.isAbsolute(root)) {
      const self = toPathFromUrl(metaUrl);
      if (isUnder(self, path.join(root, 'wt'))) {
        throw err('run-from-attempt', 3, { script: relPosix(root, self) });
      }
    }
    ret = (await fn(ctx)) || {};
    exit = Number.isInteger(ret.exit) ? ret.exit : 0;
    result = ret.result === undefined ? {} : ret.result;
    reasons = Array.isArray(ret.reasons) ? ret.reasons : [];
  } catch (e) {
    if (e && typeof e.code === 'string' && Number.isInteger(e.exit)) {
      exit = e.exit;
      reasons = [{ code: e.code, detail: e.detail === undefined ? null : e.detail }];
      result = e.result && typeof e.result === 'object' ? e.result : {};
      process.stderr.write(`[${script}] ${e.code} (exit ${e.exit})${e.detail != null ? `: ${safeString(e.detail)}` : ''}\n`);
    } else {
      exit = 70;
      reasons = [{ code: 'internal', detail: e && e.message ? e.message : String(e) }];
      result = {};
      process.stderr.write(`[${script}] internal error: ${e && e.stack ? e.stack : String(e)}\n`);
    }
  }
  const mode = (ret && ret.mode !== undefined ? ret.mode : undefined) ?? ctx.mode ?? (LAST_ARGS ? LAST_ARGS.mode : null) ?? null;
  const dryRun = (ret && typeof ret.dry_run === 'boolean' ? ret.dry_run : undefined)
    ?? (typeof ctx.dry_run === 'boolean' ? ctx.dry_run : undefined)
    ?? (typeof ctx.dryRun === 'boolean' ? ctx.dryRun : undefined)
    ?? (LAST_ARGS ? LAST_ARGS.dryRun : false);
  let line = {
    ok: exit === 0,
    script,
    mode,
    exit,
    code: exitSlug(exit),
    dry_run: !!dryRun,
    result,
    reasons,
    ledger_seq: ctx.ledgerSeq,
  };
  let text;
  try {
    text = JSON.stringify(line);
  } catch (e) {
    exit = 70;
    line = {
      ok: false, script, mode, exit, code: 'internal', dry_run: !!dryRun, result: {},
      reasons: [{ code: 'internal', detail: `result not serialisable: ${e.message}` }], ledger_seq: ctx.ledgerSeq,
    };
    text = JSON.stringify(line);
  }
  process.stdout.write(text + '\n');
  process.exitCode = exit;
  return line;
}

/** The edge facts {now, freeMb, boot}: --now/--free-mb/--boot when given, else the real values. */
export function edgeFacts(flags = {}, proc) {
  const f = flags || {};
  let now = f.now;
  if (now === undefined || now === null) now = new Date().toISOString();
  else if (now instanceof Date) now = now.toISOString();
  let freeMb = f['free-mb'] ?? f.freeMb;
  if (freeMb === undefined || freeMb === null) freeMb = Math.floor(os.freemem() / 1048576);
  else freeMb = Number(freeMb);
  let boot = f.boot;
  if (boot === undefined || boot === null) {
    boot = null;
    if (proc && typeof proc.boot === 'function') {
      try {
        const b = proc.boot();
        boot = typeof b === 'string' ? b : null;
      } catch {
        boot = null;
      }
    }
  }
  return { now, freeMb, boot };
}

/** Every fixed path of section 2, absolute. */
export function paths(root) {
  const R = path.resolve(root);
  const j = (...s) => path.join(R, ...s);
  return {
    root: R,
    tcb: j('tcb'),
    scripts: j('tcb', 'scripts'),
    schemas: j('tcb', 'schemas'),
    profiles: j('tcb', 'profiles'),
    settings: j('tcb', 'settings'),
    agents: j('tcb', 'agents'),
    briefs: j('tcb', 'briefs'),
    fixtures: j('tcb', 'fixtures'),
    thresholds: j('tcb', 'thresholds.json'),
    costInputs: j('tcb', 'cost-inputs.json'),
    denylist: j('tcb', 'denylist.txt'),
    plan: j('plan'),
    questions: j('plan', 'questions'),
    approaches: j('plan', 'approaches.json'),
    protocols: j('plan', 'protocols'),
    analysisPlan: j('plan', 'analysis-plan.json'),
    planCostInputs: j('plan', 'cost-inputs.json'),
    tasksPlan: j('plan', 'tasks-plan.json'),
    plantCandidates: j('plan', 'plant-candidates'),
    ourWork: j('plan', 'our-work'),
    notes: j('plan', 'notes'),
    frozen: j('plan', 'frozen'),
    unitCosts: j('plan', 'unit-costs.json'),
    run: j('run'),
    runLock: j('run', 'run.lock'),
    tasks: j('run', 'tasks.json'),
    tasksPrev: j('run', 'tasks.json.prev'),
    ledger: j('run', 'ledger.jsonl'),
    ledgerCorrupt: j('run', 'ledger.jsonl.corrupt'),
    status: j('run', 'status.json'),
    coord: j('run', 'coord.json'),
    acked: j('run', 'acked.json'),
    alarm: j('run', 'alarm.json'),
    watcher: j('run', 'watcher.json'),
    watcherJson: j('run', 'watcher.json'),
    watcherLock: j('run', 'watcher.lock'),
    intents: j('run', 'intents'),
    intent: (key) => j('run', 'intents', `${key}.json`),
    intentDone: (key) => j('run', 'intents', `${key}.done`),
    audit: j('run', 'audit'),
    selftest: j('run', 'selftest.json'),
    stopSampleDir: j('run', 'stop-sample'),
    stopSample: (task, e) => j('run', 'stop-sample', `${task}-e${e}.json`),
    store: j('store'),
    objects: j('store', 'objects'),
    object: (id) => j('store', 'objects', `${id}.json`),
    commits: j('store', 'commits'),
    commit: (task, step) => j('store', 'commits', `${task}.${step}.json`),
    commitRecord: (task, step) => j('store', 'commits', `${task}.${step}.json`),
    statusDir: j('store', 'status'),
    cardStatus: j('store', 'status', 'card_status.jsonl'),
    witness: j('store', 'witness.jsonl'),
    qualification: j('store', 'qualification.json'),
    views: j('views'),
    labels: j('views', 'labels.json'),
    repair: j('views', 'repair.json'),
    coverage: j('views', 'coverage.json'),
    measures: j('views', 'measures.json'),
    blind: j('views', 'blind'),
    comparison: j('views', 'comparison.json'),
    queue: j('queue'),
    batchDir: (b) => j('queue', b),
    batchFile: (b) => j('queue', b, 'batch.json'),
    item: (b, id) => j('queue', b, `item-${id}.json`),
    reviewInRoot: j('review-in'),
    reviewIn: (task) => j('review-in', task),
    completeness: j('completeness'),
    gate: j('completeness', 'gate.json'),
    cut: (sha12) => j('completeness', `cut-${sha12}.md`),
    cutFile: (sha) => j('completeness', `cut-${String(sha).slice(0, 12)}.md`),
    model: j('completeness', 'model'),
    sealed: j('sealed'),
    heldout: j('sealed', 'heldout'),
    heldoutOf: (field) => j('sealed', 'heldout', `${field}.json`),
    seeds: j('sealed', 'seeds'),
    seedKey: (b) => j('sealed', 'seeds', `${b}.json`),
    plants: j('sealed', 'plants'),
    plantKey: (task) => j('sealed', 'plants', `${task}.json`),
    plantDir: (task) => j('sealed', 'plants', task),
    sealedBlind: j('sealed', 'blind'),
    blindKey: (sha) => j('sealed', 'blind', `${String(sha).slice(0, 12)}.json`),
    frozenFile: (name, sha) => j('plan', 'frozen', `${name}-${String(sha).slice(0, 12)}.json`),
    protocolDraft: (field) => j('plan', 'protocols', `${field}.json`),
    plantCandidatesOf: (field) => j('plan', 'plant-candidates', `${field}.json`),
    auditFile: (task, e) => j('run', 'audit', `${task}-e${e}.json`),
    auditSearch: (task, e) => j('run', 'audit', `search-${task}-e${e}.jsonl`),
    auditCoordinator: (ce) => j('run', 'audit', `coordinator-ce${ce}.json`),
    snapshots: j('.snapshots'),
    snapRaw: j('.snapshots', 'raw'),
    snapText: j('.snapshots', 'text'),
    snapMeta: j('.snapshots', 'meta'),
    byUrl: j('.snapshots', 'by-url'),
    snapshotRaw: (sha) => j('.snapshots', 'raw', sha),
    snapshotText: (sha) => j('.snapshots', 'text', sha),
    snapshotMeta: (sha) => j('.snapshots', 'meta', `${sha}.json`),
    byUrlFile: (key) => j('.snapshots', 'by-url', `${key}.jsonl`),
    wt: j('wt'),
    attempt: (task, e) => j('wt', `${task}-e${e}`),
    attemptRel: (task, e) => `wt/${task}-e${e}`,
    tmp: j('tmp'),
    gitignore: j('.gitignore'),
    gitattributes: j('.gitattributes'),
  };
}

/** Thresholds of `tcb/thresholds.json`: {get(name), isGate(name), line(name), all}. */
export function thresholds(root) {
  const doc = readJson(path.join(path.resolve(root), 'tcb', 'thresholds.json'));
  const params = doc && typeof doc.params === 'object' && doc.params ? doc.params : {};
  const has = (name) => Object.prototype.hasOwnProperty.call(params, name);
  return {
    get(name) {
      if (!has(name)) throw err('param-missing', 2, { name });
      const p = params[name];
      return p && typeof p === 'object' && 'value' in p ? p.value : null;
    },
    isGate(name) {
      if (!has(name)) return false;
      const p = params[name];
      return !!p && p.gate === true && p.value !== null && p.value !== undefined;
    },
    line(name) {
      if (!has(name)) return null;
      const p = params[name];
      return p && p.line ? p.line : null;
    },
    has,
    all: params,
  };
}

/** Append one `incident` line (R58). The tamper form: cls 'refusal', detail {tamper: true, script, code}. */
export function recordIncident(root, handle, { ctx, ce, cls, detail, task, epoch, now } = {}) {
  return appendLedger(root, handle, {
    ctx, ce, kind: 'incident', task, epoch, now,
    data: { class: cls, detail: detail === undefined ? null : detail },
  });
}

// =============================================================================================
// 4.2 Canonical JSON, hashes, objects
// =============================================================================================

function isPlainObject(v) {
  if (v === null || typeof v !== 'object') return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
}

/**
 * Canonical JSON: keys sorted by UTF-16 code unit, strings NFC, no whitespace, numbers in JS
 * shortest form (-0 as 0); refuses undefined, NaN, Infinity, BigInt, functions, non-plain objects
 * and cycles (not-canonical 1).
 */
export function canonicalize(value) {
  const stack = new Set();
  const enc = (v, where) => {
    if (v === null) return 'null';
    switch (typeof v) {
      case 'boolean':
        return v ? 'true' : 'false';
      case 'number':
        if (!Number.isFinite(v)) throw err('not-canonical', 1, { at: where, why: 'non-finite number' });
        return Object.is(v, -0) ? '0' : JSON.stringify(v);
      case 'string':
        return JSON.stringify(v.normalize('NFC'));
      case 'undefined':
        throw err('not-canonical', 1, { at: where, why: 'undefined' });
      case 'bigint':
        throw err('not-canonical', 1, { at: where, why: 'bigint' });
      case 'function':
      case 'symbol':
        throw err('not-canonical', 1, { at: where, why: typeof v });
      default:
        break;
    }
    if (stack.has(v)) throw err('not-canonical', 1, { at: where, why: 'cycle' });
    if (Array.isArray(v)) {
      stack.add(v);
      const parts = [];
      for (let i = 0; i < v.length; i++) parts.push(enc(v[i], `${where}/${i}`));
      stack.delete(v);
      return '[' + parts.join(',') + ']';
    }
    if (!isPlainObject(v)) throw err('not-canonical', 1, { at: where, why: 'not a plain object' });
    stack.add(v);
    const keys = Object.keys(v).map((k) => [k.normalize('NFC'), k]);
    keys.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    for (let i = 1; i < keys.length; i++) {
      if (keys[i][0] === keys[i - 1][0]) throw err('not-canonical', 1, { at: where, why: 'duplicate key after NFC' });
    }
    const parts = keys.map(([nk, k]) => JSON.stringify(nk) + ':' + enc(v[k], `${where}/${nk}`));
    stack.delete(v);
    return '{' + parts.join(',') + '}';
  };
  return enc(value, '');
}

function safeCanon(v) {
  try {
    return canonicalize(v);
  } catch {
    try {
      return 'json:' + JSON.stringify(v);
    } catch {
      return 'str:' + String(v);
    }
  }
}

/** sha256 hex of a string (UTF-8) or a Buffer. */
export function sha256hex(data) {
  const h = crypto.createHash('sha256');
  h.update(typeof data === 'string' ? Buffer.from(data, 'utf8') : data);
  return h.digest('hex');
}

/** prefix + '_' + first 16 hex of sha256hex(canonicalize(value)). */
export function objectId(prefix, value) {
  return `${prefix}_${sha256hex(canonicalize(value)).slice(0, 16)}`;
}

/** Exclusive create of `buf` at `file`: 'created' | 'identical' | 'different'. Atomic (temp + link). */
function exclusiveWrite(file, buf, F = FS) {
  F.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = tempName(file);
  let fd = null;
  try {
    fd = fsRetry(() => F.openSync(tmp, 'wx'));
    writeAll(F, fd, buf);
    F.fsyncSync(fd);
    F.closeSync(fd);
    fd = null;
    let linked = false;
    try {
      fsRetry(() => F.linkSync(tmp, file));
      linked = true;
    } catch (e) {
      if (e && e.code === 'EEXIST') {
        // fall through to the comparison below
      } else if (e && ['ENOTSUP', 'EINVAL', 'EXDEV', 'ENOSYS', 'EMLINK'].includes(e.code)) {
        // No hard links here: exclusive create with wx (not atomic against a crash mid-write).
        let fd2 = null;
        try {
          fd2 = fsRetry(() => F.openSync(file, 'wx'));
          writeAll(F, fd2, buf);
          F.fsyncSync(fd2);
          linked = true;
        } catch (e2) {
          if (!e2 || e2.code !== 'EEXIST') throw e2;
        } finally {
          if (fd2 !== null) F.closeSync(fd2);
        }
      } else {
        throw e;
      }
    }
    if (linked) return 'created';
    const have = readBytes(file, F);
    return have.equals(buf) ? 'identical' : 'different';
  } finally {
    if (fd !== null) {
      try {
        F.closeSync(fd);
      } catch {
        // already closed
      }
    }
    try {
      fsRetry(() => F.unlinkSync(tmp));
    } catch {
      // the temp may not exist
    }
  }
}

/** Store `value` as canonical bytes at store/objects/<id>.json (exclusive create). */
export function putObject(root, value, { allowSeed = false } = {}) {
  const kind = value && typeof value === 'object' ? value.kind : undefined;
  const prefix = typeof kind === 'string' && Object.prototype.hasOwnProperty.call(PREFIX, kind) ? PREFIX[kind] : null;
  if (!prefix) throw err('unknown-kind', 1, { kind: kind ?? null });
  if (prefix === 's' && !allowSeed) throw err('seed-id', 3, { kind });
  const text = canonicalize(value);
  const buf = Buffer.from(text, 'utf8');
  const sha = sha256hex(buf);
  const id = `${prefix}_${sha.slice(0, 16)}`;
  const file = path.join(path.resolve(root), 'store', 'objects', `${id}.json`);
  const r = exclusiveWrite(file, buf);
  if (r === 'different') throw err('id-collision', 3, { id });
  return { id, sha256: sha, created: r === 'created' };
}

/** Read store/objects/<id>.json, re-checking that its bytes hash to its name. */
export function getObject(root, id) {
  if (typeof id !== 'string' || !/^[a-z]_[0-9a-f]{16}$/.test(id)) throw err('bad-id', 1, { id });
  const file = path.join(path.resolve(root), 'store', 'objects', `${id}.json`);
  let buf;
  try {
    buf = readBytes(file);
  } catch (e) {
    if (e && e.code === 'ENOENT') throw err('missing', 2, { id });
    throw e;
  }
  if (sha256hex(buf).slice(0, 16) !== id.slice(2)) throw err('object-mismatch', 3, { id });
  try {
    return JSON.parse(stripBom(buf).toString('utf8'));
  } catch {
    throw err('object-mismatch', 3, { id, why: 'unparseable' });
  }
}

/** sha256 of canonical sorted [[relpath, sha256]...] over every file under dir (links as 'link'). */
export function treeSha(dir) {
  const w = walkFiles(dir);
  const entries = w.files.map((rel) => [rel, sha256hex(readBytes(path.join(dir, ...rel.split('/'))))]);
  for (const rel of w.links) entries.push([rel, 'link']);
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return sha256hex(canonicalize(entries));
}

// =============================================================================================
// 4.3 Files
// =============================================================================================

/** `<path>.<pid>.<nonce8>.tmp` */
export function tempName(p) {
  return `${p}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
}

/**
 * Write `data` (Buffer or string) atomically: temp file with wx, fsync of the file (never a
 * directory handle), rename over the target, each step retried on Windows sharing errors.
 * Returns the sha256 of the bytes. `opts.fs` is a one-call test seam.
 */
export function writeAtomic(target, data, opts) {
  const F = fsOf(opts);
  const buf = toBuffer(data);
  F.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = tempName(target);
  let fd = null;
  try {
    fd = fsRetry(() => F.openSync(tmp, 'wx'));
    writeAll(F, fd, buf);
    F.fsyncSync(fd);
    F.closeSync(fd);
    fd = null;
    fsRetry(() => F.renameSync(tmp, target));
  } catch (e) {
    if (fd !== null) {
      try {
        F.closeSync(fd);
      } catch {
        // ignore
      }
    }
    try {
      fsRetry(() => F.unlinkSync(tmp));
    } catch {
      // ignore: the temp may be gone
    }
    throw e;
  }
  return sha256hex(buf);
}

/**
 * Remove one file with the Windows-sharing retries of section 4.3 (a scanner or indexer may hold
 * it). An absent file is not an error. Returns true when a file was removed.
 */
export function removeFile(p, opts) {
  const F = fsOf(opts);
  try {
    fsRetry(() => F.unlinkSync(p));
    return true;
  } catch (e) {
    if (e && e.code === 'ENOENT') return false;
    throw e;
  }
}

/** Exclusive create: 'created' | 'identical'; different bytes at the path: exists-different 1. */
export function createExclusive(p, data) {
  const buf = toBuffer(data);
  const r = exclusiveWrite(p, buf);
  if (r === 'different') throw err('exists-different', 1, { path: p });
  return r;
}

function stripBom(buf) {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3);
  return buf;
}
function isUtf16(buf) {
  return buf.length >= 2 && ((buf[0] === 0xff && buf[1] === 0xfe) || (buf[0] === 0xfe && buf[1] === 0xff));
}

/** Parse a JSON file: missing 2, unparseable 2 (detail 'utf16' for a UTF-16 file); one BOM stripped. */
export function readJson(p) {
  let buf;
  try {
    buf = readBytes(p);
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) throw err('missing', 2, { path: p });
    if (e && e.code === 'EISDIR') throw err('unparseable', 2, { path: p, why: 'directory' });
    throw e;
  }
  if (isUtf16(buf)) throw err('unparseable', 2, 'utf16');
  try {
    return JSON.parse(stripBom(buf).toString('utf8'));
  } catch (e) {
    throw err('unparseable', 2, { path: p, why: e.message });
  }
}

/**
 * JSONL: {records, torn: Buffer|null, badLines: int[] (1-based line numbers)}. Bytes after the last
 * newline are the torn tail; an unparseable complete line is listed, not thrown. Missing: missing 2.
 */
export function readJsonl(p) {
  let buf;
  try {
    buf = readBytes(p);
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) throw err('missing', 2, { path: p });
    throw e;
  }
  return parseJsonlBuffer(buf);
}

function parseJsonlBuffer(raw) {
  if (isUtf16(raw)) throw err('unparseable', 2, 'utf16');
  const buf = stripBom(raw);
  const last = buf.lastIndexOf(0x0a);
  const complete = last === -1 ? Buffer.alloc(0) : buf.subarray(0, last + 1);
  const torn = last + 1 < buf.length ? Buffer.from(buf.subarray(last + 1)) : null;
  const records = [];
  const badLines = [];
  if (complete.length) {
    const lines = complete.toString('utf8').split('\n');
    lines.pop(); // the empty string after the final newline
    lines.forEach((line, i) => {
      const t = line.endsWith('\r') ? line.slice(0, -1) : line;
      if (t.trim() === '') return;
      try {
        records.push(JSON.parse(t));
      } catch {
        badLines.push(i + 1);
      }
    });
  }
  return { records, torn, badLines };
}

/** Facts about a file's end: {size, completeEnd, torn: Buffer|null, last: Buffer|null}. */
function tailInfo(file, F = FS) {
  let fd;
  try {
    fd = fsRetry(() => F.openSync(file, 'r'));
  } catch (e) {
    if (e && e.code === 'ENOENT') return { size: 0, completeEnd: 0, torn: null, last: null, exists: false };
    throw e;
  }
  try {
    const size = F.fstatSync(fd).size;
    const CH = 65536;
    let pos = size;
    let buf = Buffer.alloc(0);
    let lastNL = -1;
    let prevNL = -1;
    while (pos > 0 && prevNL === -1) {
      const n = Math.min(CH, pos);
      pos -= n;
      const chunk = Buffer.alloc(n);
      F.readSync(fd, chunk, 0, n, pos);
      buf = Buffer.concat([chunk, buf]);
      if (lastNL === -1) {
        const i = buf.lastIndexOf(0x0a);
        if (i !== -1) lastNL = pos + i;
      }
      if (lastNL !== -1 && lastNL - pos - 1 >= 0) {
        const j = buf.lastIndexOf(0x0a, lastNL - pos - 1);
        if (j !== -1) prevNL = pos + j;
      }
    }
    const completeEnd = lastNL === -1 ? 0 : lastNL + 1;
    const torn = size > completeEnd ? Buffer.from(buf.subarray(completeEnd - pos)) : null;
    let last = null;
    if (lastNL !== -1) {
      const start = prevNL === -1 ? 0 : prevNL + 1;
      last = Buffer.from(buf.subarray(start - pos, lastNL - pos));
      if (start === 0) last = stripBom(last);
      if (last.length && last[last.length - 1] === 0x0d) last = last.subarray(0, last.length - 1);
    }
    return { size, completeEnd, torn, last, exists: true };
  } finally {
    F.closeSync(fd);
  }
}

/** Move a torn tail to `<file>.corrupt` (appending) and cut it off. Returns the torn bytes or null. */
function cutTornTail(file, info, F = FS) {
  if (!info.torn || info.torn.length === 0) return null;
  const corrupt = `${file}.corrupt`;
  const cfd = fsRetry(() => F.openSync(corrupt, 'a'));
  try {
    writeAll(F, cfd, info.torn);
    F.fsyncSync(cfd);
  } finally {
    F.closeSync(cfd);
  }
  fsRetry(() => F.truncateSync(file, info.completeEnd));
  return info.torn;
}

function appendRaw(file, text, F = FS) {
  F.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fsRetry(() => F.openSync(file, 'a'));
  try {
    writeAll(F, fd, Buffer.from(text, 'utf8'));
    F.fsyncSync(fd);
  } finally {
    F.closeSync(fd);
  }
}

function assertHandle(handle) {
  if (!handle || typeof handle.assertHeld !== 'function') throw err('lock-lost', 75, { why: 'no lock handle' });
  handle.assertHeld();
}

/** Append one JSON line under a held lock; a torn tail is first moved to `<path>.corrupt`. */
export function appendJsonl(p, obj, handle) {
  assertHandle(handle);
  const info = tailInfo(p);
  cutTornTail(p, info);
  const text = JSON.stringify(obj);
  if (typeof text !== 'string') throw err('not-canonical', 1, { why: 'not serialisable' });
  appendRaw(p, text + '\n');
  return { torn: info.torn ? info.torn.length : 0 };
}

function realExisting(p) {
  let cur = path.resolve(p);
  const rest = [];
  for (;;) {
    try {
      fs.lstatSync(cur);
      break;
    } catch {
      const parent = path.dirname(cur);
      if (parent === cur) break;
      rest.unshift(path.basename(cur));
      cur = parent;
    }
  }
  let real = cur;
  try {
    real = fs.realpathSync.native(cur);
  } catch {
    real = cur;
  }
  return rest.length ? path.join(real, ...rest) : real;
}

function foldPath(p) {
  let s = p.replace(/\\/g, '/');
  if (s.length > 1 && s.endsWith('/') && !/^[A-Za-z]:\/$/.test(s)) s = s.replace(/\/+$/, '');
  return process.platform === 'win32' ? s.toLowerCase() : s;
}

/** Resolved, forward slashes, no trailing slash, case-folded on win32 (for comparisons). */
export function normPath(p) {
  return foldPath(path.resolve(String(p)));
}

/** True when `child` is `parent` or below it, after resolving `..`, junctions and case. */
export function isUnder(child, parent) {
  if (typeof child !== 'string' || typeof parent !== 'string' || !child || !parent) return false;
  const a = foldPath(realExisting(child));
  const b = foldPath(realExisting(parent));
  if (a === b) return true;
  return a.startsWith(b.endsWith('/') ? b : `${b}/`);
}

/** The posix relative path from root to abs. */
export function relPosix(root, abs) {
  return path.relative(path.resolve(root), path.resolve(abs)).split(path.sep).join('/');
}

/** Whitespace-separated tokens. */
export function wordCount(s) {
  if (typeof s !== 'string') return 0;
  const t = s.trim();
  return t === '' ? 0 : t.split(/\s+/u).length;
}

/** A path segment with trailing dots and spaces removed, case-folded. */
export function segmentName(s) {
  return String(s).replace(/[. ]+$/u, '').toLowerCase();
}

/**
 * lstat walk: {files: relpath[], links: relpath[]} (posix, sorted). A symbolic link, junction, other
 * non-regular entry or a file with nlink > 1 is listed in `links` and never followed or read.
 */
export function walkFiles(dir) {
  const files = [];
  const links = [];
  let top;
  try {
    top = fs.lstatSync(dir);
  } catch {
    return { files, links };
  }
  if (top.isSymbolicLink()) return { files, links: [''] };
  if (!top.isDirectory()) return { files, links };
  const visit = (abs, rel) => {
    let names;
    try {
      names = fs.readdirSync(abs);
    } catch {
      return;
    }
    for (const name of names) {
      const a = path.join(abs, name);
      const r = rel ? `${rel}/${name}` : name;
      let st;
      try {
        st = fs.lstatSync(a);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) links.push(r);
      else if (st.isDirectory()) visit(a, r);
      else if (st.isFile()) {
        if (st.nlink > 1) links.push(r);
        else files.push(r);
      } else links.push(r);
    }
  };
  visit(dir, '');
  const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  files.sort(cmp);
  links.sort(cmp);
  return { files, links };
}

/** Remove a tree only when walkFiles finds no link inside; else untrusted-path 3, nothing removed. */
export function removeTree(dir) {
  let st;
  try {
    st = fs.lstatSync(dir);
  } catch {
    return;
  }
  if (st.isSymbolicLink()) throw err('untrusted-path', 3, { path: dir, links: [''] });
  const w = walkFiles(dir);
  if (w.links.length) throw err('untrusted-path', 3, { path: dir, links: w.links });
  fsRetry(() => fs.rmSync(dir, { recursive: true, force: true }));
}

// =============================================================================================
// 4.4 Locks
// =============================================================================================

const SELF_CACHE = new WeakMap();
let SELF_NOPROC = null;
let REAL_SELF_START = null;
const REAL = Symbol('realProc');

/** {pid, start_time} of this process, computed once per proc provider and cached. */
export function selfInfo(proc) {
  if (!proc) {
    if (!SELF_NOPROC) SELF_NOPROC = { pid: process.pid, start_time: null };
    return SELF_NOPROC;
  }
  if (SELF_CACHE.has(proc)) return SELF_CACHE.get(proc);
  let start = null;
  if (proc[REAL] && REAL_SELF_START) {
    start = REAL_SELF_START;
  } else {
    try {
      const list = typeof proc.list === 'function' ? proc.list() : null;
      if (Array.isArray(list)) {
        const me = list.find((p) => p && p.pid === process.pid);
        start = me && typeof me.start_time === 'string' ? me.start_time : null;
      }
    } catch {
      start = null;
    }
  }
  const info = { pid: process.pid, start_time: start };
  SELF_CACHE.set(proc, info);
  return info;
}

function readLockRecord(file) {
  let buf;
  try {
    buf = readBytes(file);
  } catch (e) {
    if (e && e.code === 'ENOENT') return { missing: true, record: null };
    return { missing: false, record: null };
  }
  try {
    const r = JSON.parse(stripBom(buf).toString('utf8'));
    return { missing: false, record: r && typeof r === 'object' ? r : null };
  } catch {
    return { missing: false, record: null };
  }
}

function makeHandle(root, name, file, record) {
  let released = false;
  const lost = (why) => err('lock-lost', 75, { lock: name, why });
  const handle = {
    root,
    name,
    path: file,
    nonce: record.nonce,
    record,
    get released() {
      return released;
    },
    assertHeld() {
      if (released) throw lost('released');
      const { missing, record: cur } = readLockRecord(file);
      if (missing) throw lost('lock file missing');
      if (!cur || cur.nonce !== record.nonce) throw lost('another holder');
      return true;
    },
    release() {
      if (released) return;
      released = true;
      const { record: cur } = readLockRecord(file);
      if (cur && cur.nonce === record.nonce) {
        try {
          fsRetry(() => FS.unlinkSync(file));
        } catch (e) {
          if (!e || e.code !== 'ENOENT') throw e;
        }
      }
    },
  };
  return handle;
}

function sameRecord(a, b) {
  return !!a && !!b && a.pid === b.pid && (a.start_time ?? null) === (b.start_time ?? null) && a.nonce === b.nonce;
}

function fallbackCtx(script) {
  return { script: script || path.basename(process.argv[1] || 'lib', '.mjs'), writerSha: mainScriptSha(), ledgerSeq: [] };
}

/**
 * acquireLock(root, name, {script, ce, proc, now, retries=300, retryMs=100, ctx?}) -> handle.
 * Busy: `retries` waits of retryMs +-50 %, then lock-busy 75. A stale lock (proc.alive false) is
 * broken by rename, re-read and create; a lost race restores the renamed lock with a hard link.
 */
export function acquireLock(root, name, opts = {}) {
  const { script = null, ce, proc = null, now, retries = 300, retryMs = 100, ctx } = opts;
  if (name !== 'run.lock' && name !== 'watcher.lock') throw err('usage', 66, { lock: name });
  const R = path.resolve(root);
  const runDir = path.join(R, 'run');
  const file = path.join(runDir, name);
  FS.mkdirSync(runDir, { recursive: true });
  const self = selfInfo(proc);
  const nonce = crypto.randomBytes(16).toString('hex');
  const record = { pid: self.pid, start_time: self.start_time, nonce, script: script || null };
  if (ce !== undefined && ce !== null) record.ce = ce;
  record.acquired_at = now === undefined ? null : now instanceof Date ? now.toISOString() : now;
  const bytes = Buffer.from(JSON.stringify(record), 'utf8');
  const judged = new Map(); // nonce -> alive verdict, so one holder costs one process query

  const tryCreate = () => {
    let fd;
    try {
      fd = FS.openSync(file, 'wx');
    } catch (e) {
      if (e && e.code === 'EEXIST') return 'exists';
      if (e && SHARING.has(e.code)) return 'busy'; // a delete-pending lock
      throw e;
    }
    try {
      writeAll(FS, fd, bytes);
      FS.fsyncSync(fd);
    } finally {
      FS.closeSync(fd);
    }
    return 'ok';
  };

  const isStale = (held) => {
    if (!proc || typeof proc.alive !== 'function' || !held || !Number.isInteger(held.pid)) return false;
    const key = String(held.nonce);
    if (!judged.has(key)) {
      let a = null;
      try {
        a = proc.alive(held.pid, held.start_time ?? null);
      } catch {
        a = null;
      }
      judged.set(key, a);
    }
    return judged.get(key) === false; // null (unknown) counts as alive
  };

  const finish = (stale) => {
    const handle = makeHandle(R, name, file, record);
    if (name !== 'run.lock') return handle;
    const lctx = ctx || fallbackCtx(script);
    try {
      if (stale) {
        appendLedger(R, handle, {
          ctx: lctx, ce, kind: 'lock-break', now,
          data: { stale: { pid: stale.pid ?? null, start_time: stale.start_time ?? null, nonce: stale.nonce ?? null, script: stale.script ?? null } },
        });
      }
      logOrphans(R, handle, lctx, ce, now);
    } catch (e) {
      handle.release();
      throw e;
    }
    return handle;
  };

  let tries = 0;
  let spins = 0;
  for (;;) {
    const r = tryCreate();
    if (r === 'ok') return finish(null);
    if (r === 'exists') {
      const { missing, record: held } = readLockRecord(file);
      if (missing) {
        if (++spins < 1000) continue; // released between our create and read
      } else if (held && isStale(held)) {
        const out = breakStale(file, held, nonce, bytes);
        if (out === 'held') return finish(held);
        if (++spins < 1000) continue;
      }
    }
    if (tries >= retries) throw err('lock-busy', 75, { lock: name, retries });
    tries++;
    sleepMs(retryMs * jitter(0.5, 1.5));
  }
}

function breakStale(file, held, ownNonce, bytes) {
  const renamed = `${file}.${ownNonce}.stale`;
  try {
    fsRetry(() => FS.renameSync(file, renamed));
  } catch (e) {
    if (e && e.code === 'ENOENT') return 'gone';
    throw e;
  }
  const { record: moved } = readLockRecord(renamed);
  if (sameRecord(moved, held)) {
    let fd;
    try {
      fd = FS.openSync(file, 'wx');
    } catch (e) {
      try {
        fsRetry(() => FS.unlinkSync(renamed));
      } catch {
        // ignore
      }
      if (e && (e.code === 'EEXIST' || SHARING.has(e.code))) return 'lost';
      throw e;
    }
    try {
      writeAll(FS, fd, bytes);
      FS.fsyncSync(fd);
    } finally {
      FS.closeSync(fd);
    }
    try {
      fsRetry(() => FS.unlinkSync(renamed));
    } catch {
      // ignore
    }
    return 'held';
  }
  // Another breaker's fresh lock was renamed: put it back without replacing anything.
  try {
    fsRetry(() => FS.linkSync(renamed, file));
    fsRetry(() => FS.unlinkSync(renamed));
  } catch (e) {
    if (e && e.code === 'EEXIST') {
      const orphan = `${file}.${ownNonce}.orphan`;
      fsRetry(() => FS.renameSync(renamed, orphan));
    } else {
      throw e;
    }
  }
  return 'restored';
}

function logOrphans(root, handle, ctx, ce, now) {
  const runDir = path.join(root, 'run');
  let names;
  try {
    names = fs.readdirSync(runDir).filter((n) => /^run\.lock\.[0-9a-f]+\.orphan$/.test(n)).sort();
  } catch {
    return;
  }
  if (!names.length) return;
  const { lines } = readLedger(root);
  const logged = new Set();
  for (const l of lines) {
    if (l && l.kind === 'incident' && l.data && l.data.detail && typeof l.data.detail.orphan === 'string') logged.add(l.data.detail.orphan);
  }
  for (const n of names) {
    if (logged.has(n)) continue;
    const { record } = readLockRecord(path.join(runDir, n));
    recordIncident(root, handle, { ctx, ce, cls: 'refusal', detail: { orphan: n, record: record ?? null }, now });
  }
}

/** Acquire run.lock, check ce inside it (when given), run fn(handle), release in finally. */
export async function withRunLock(root, opts, fn) {
  const o = opts || {};
  const handle = acquireLock(root, 'run.lock', o);
  try {
    if (o.ce !== undefined && o.ce !== null) checkCe(root, o.ce);
    return await fn(handle);
  } finally {
    handle.release();
  }
}

/** coord.json missing: no-coordinator 2; corrupt: table-corrupt 67; different ce: stale-ce 64. */
export function checkCe(root, ce) {
  const file = path.join(path.resolve(root), 'run', 'coord.json');
  let coord;
  try {
    coord = readJson(file);
  } catch (e) {
    if (e && e.code === 'missing') throw err('no-coordinator', 2, { path: 'run/coord.json' });
    if (e && e.code === 'unparseable') throw err('table-corrupt', 67, { path: 'run/coord.json' });
    throw e;
  }
  if (!coord || typeof coord !== 'object' || !Number.isInteger(coord.ce)) {
    throw err('table-corrupt', 67, { path: 'run/coord.json', why: 'no integer ce' });
  }
  if (coord.ce !== ce) throw err('stale-ce', 64, { given: ce, current: coord.ce });
  return coord;
}

// =============================================================================================
// 4.5 Ledger
// =============================================================================================

function ledgerFile(root) {
  return path.join(path.resolve(root), 'run', 'ledger.jsonl');
}

function lineHashOk(line) {
  if (!line || typeof line !== 'object' || typeof line.hash !== 'string') return false;
  const { hash, ...rest } = line;
  try {
    return sha256hex(String(line.prev) + canonicalize(rest)) === hash;
  } catch {
    return false;
  }
}

function writeLedgerLine(file, base) {
  const hash = sha256hex(base.prev + canonicalize(base));
  const full = { ...base, hash };
  appendRaw(file, canonicalize(full) + '\n');
  return full;
}

/**
 * appendLedger(root, handle, {ctx, ce, kind, task, epoch, data, now}) -> line. Under the held lock:
 * the tail is read and its hash re-checked (ledger-broken 3); a torn tail is moved to
 * ledger.jsonl.corrupt and a `torn-tail` line written first.
 */
export function appendLedger(root, handle, { ctx, ce, kind, task, epoch, data, now } = {}) {
  if (!LEDGER_KINDS.includes(kind)) throw err('usage', 66, { kind: kind ?? null, why: 'ledger kind' });
  assertHandle(handle);
  const file = ledgerFile(root);
  const info = tailInfo(file);
  let prev = ZERO_HASH;
  let seq = 0;
  if (info.last) {
    let tail;
    try {
      tail = JSON.parse(info.last.toString('utf8'));
    } catch {
      throw err('ledger-broken', 3, { why: 'tail unparseable' });
    }
    if (!lineHashOk(tail) || !Number.isInteger(tail.seq)) throw err('ledger-broken', 3, { why: 'tail hash', seq: tail && tail.seq });
    prev = tail.hash;
    seq = tail.seq;
  }
  const c = ctx || fallbackCtx(handle && handle.record ? handle.record.script : null);
  const writer = c.script || 'unknown';
  const writerSha = typeof c.writerSha === 'string' && /^[0-9a-f]{64}$/.test(c.writerSha) ? c.writerSha : mainScriptSha();
  let ts = now;
  if (ts instanceof Date) ts = ts.toISOString();
  else if (typeof ts === 'number') ts = new Date(ts).toISOString();
  else if (typeof ts !== 'string') ts = new Date().toISOString(); // information only (section 1.2)
  const mk = (k, t, e, d) => {
    const line = { seq: seq + 1, prev, ts };
    if (ce !== undefined && ce !== null) line.ce = ce;
    line.writer = writer;
    line.writer_sha = writerSha;
    line.kind = k;
    if (t !== undefined && t !== null) line.task = t;
    if (e !== undefined && e !== null) line.epoch = e;
    line.data = d === undefined || d === null ? {} : JSON.parse(JSON.stringify(d));
    return line;
  };
  const torn = cutTornTail(file, info);
  if (torn) {
    handle.assertHeld();
    const tl = writeLedgerLine(file, mk('torn-tail', null, null, { bytes: torn.length }));
    seq = tl.seq;
    prev = tl.hash;
    if (c && Array.isArray(c.ledgerSeq)) c.ledgerSeq.push(tl.seq);
  }
  handle.assertHeld();
  const line = writeLedgerLine(file, mk(kind, task, epoch, data));
  if (c && Array.isArray(c.ledgerSeq)) c.ledgerSeq.push(line.seq);
  return line;
}

/** {lines, torn, badLines}; an absent ledger is empty. */
export function readLedger(root) {
  const file = ledgerFile(root);
  try {
    const r = readJsonl(file);
    return { lines: r.records, torn: r.torn, badLines: r.badLines };
  } catch (e) {
    if (e && e.code === 'missing') return { lines: [], torn: null, badLines: [] };
    throw e;
  }
}

/** seq 1..n with no gap, each prev the previous hash, each hash recomputing. */
export function verifyLedger(lines) {
  const ls = Array.isArray(lines) ? lines : [];
  let prev = ZERO_HASH;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    const at = l && Number.isInteger(l.seq) ? l.seq : i + 1;
    if (!l || typeof l !== 'object') return { ok: false, brokenAt: i + 1, reason: 'not-an-object' };
    if (l.seq !== i + 1) return { ok: false, brokenAt: at, reason: 'seq' };
    if (l.prev !== prev) return { ok: false, brokenAt: at, reason: 'prev' };
    if (!lineHashOk(l)) return { ok: false, brokenAt: at, reason: 'hash' };
    prev = l.hash;
  }
  return { ok: true };
}

/** {seq, hash} of the last complete line; {0, 64 zeros} when empty or absent. */
export function ledgerHead(root) {
  const info = tailInfo(ledgerFile(root));
  if (!info.last) return { seq: 0, hash: ZERO_HASH };
  try {
    const l = JSON.parse(info.last.toString('utf8'));
    return { seq: Number.isInteger(l.seq) ? l.seq : 0, hash: typeof l.hash === 'string' ? l.hash : ZERO_HASH };
  } catch {
    return { seq: 0, hash: ZERO_HASH };
  }
}

/** The last line of `kind` (any kind when null) for which pred(line) holds. */
export function lastLine(lines, kind, pred) {
  const ls = Array.isArray(lines) ? lines : [];
  for (let i = ls.length - 1; i >= 0; i--) {
    const l = ls[i];
    if (!l) continue;
    if (kind !== null && kind !== undefined && l.kind !== kind) continue;
    if (typeof pred === 'function' && !pred(l)) continue;
    return l;
  }
  return null;
}

// =============================================================================================
// 4.6 The task table and the fence
// =============================================================================================

function tasksFile(root) {
  return path.join(path.resolve(root), 'run', 'tasks.json');
}

/** run/tasks.json, schema-checked; missing, unparseable or invalid: table-corrupt 67. */
export function readTasks(root) {
  let table;
  try {
    table = readJson(tasksFile(root));
  } catch (e) {
    if (e && (e.code === 'missing' || e.code === 'unparseable')) throw err('table-corrupt', 67, { path: 'run/tasks.json', cause: e.code });
    throw e;
  }
  try {
    checkFormat(root, 'tasks', table);
  } catch (e) {
    if (e && (e.code === 'schema-invalid' || e.code === 'schema-version')) {
      throw err('table-corrupt', 67, { path: 'run/tasks.json', cause: e.code, errors: e.detail });
    }
    throw e;
  }
  return table;
}

/** The attempts entry whose epoch is e; none: no-attempt 2. */
export function attemptOf(row, e) {
  const list = row && Array.isArray(row.attempts) ? row.attempts : [];
  const a = list.find((x) => x && x.epoch === e);
  if (!a) throw err('no-attempt', 2, { task: row ? row.task : null, epoch: e });
  return a;
}

/**
 * writeTasks(root, handle, table, {expectRev}) -> rev. CAS on rev (an absent file has rev -1 and
 * matches expectRev null or -1); copies the current file to tasks.json.prev; validates; writes.
 */
export function writeTasks(root, handle, table, { expectRev } = {}) {
  assertHandle(handle);
  const file = tasksFile(root);
  let curBytes = null;
  try {
    curBytes = readBytes(file);
  } catch (e) {
    if (!e || e.code !== 'ENOENT') throw e;
  }
  let curRev = -1;
  if (curBytes) {
    let cur;
    try {
      if (isUtf16(curBytes)) throw new Error('utf16');
      cur = JSON.parse(stripBom(curBytes).toString('utf8'));
    } catch {
      throw err('table-corrupt', 67, { path: 'run/tasks.json', cause: 'unparseable' });
    }
    curRev = cur && Number.isInteger(cur.rev) ? cur.rev : -1;
    if (expectRev !== curRev) throw err('rev-moved', 65, { expected: expectRev ?? null, current: curRev });
  } else if (!(expectRev === null || expectRev === undefined || expectRev === -1)) {
    throw err('rev-moved', 65, { expected: expectRev, current: null });
  }
  const next = { ...table, rev: curRev + 1 };
  checkFormat(root, 'tasks', next);
  handle.assertHeld();
  if (curBytes) writeAtomic(`${file}.prev`, curBytes);
  writeAtomic(file, JSON.stringify(next, null, 2) + '\n');
  return next.rev;
}

function plain(v) {
  return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}

/**
 * The compare-and-set on one row. Under the held lock: no row: no-task 1; epoch given and different:
 * stale-epoch 65; step or state outside the allowed lists: wrong-step 65. mutate(copy, table)
 * returns the new row; an unchanged row writes nothing.
 */
export function updateRow(root, handle, { task, epoch, steps, states } = {}, mutate) {
  assertHandle(handle);
  const table = readTasks(root);
  const rows = Array.isArray(table.tasks) ? table.tasks : [];
  const idx = rows.findIndex((r) => r && r.task === task);
  if (idx < 0) throw err('no-task', 1, { task });
  const row = rows[idx];
  if (epoch !== undefined && epoch !== null && row.epoch !== epoch) {
    throw err('stale-epoch', 65, { task, epoch, row_epoch: row.epoch });
  }
  if (Array.isArray(steps) && !steps.includes(row.step)) throw err('wrong-step', 65, { task, step: row.step, allowed: steps });
  if (Array.isArray(states) && !states.includes(row.state)) throw err('wrong-step', 65, { task, state: row.state, allowed: states });
  const copy = structuredClone(row);
  let next = typeof mutate === 'function' ? mutate(copy, structuredClone(table)) : copy;
  if (next === undefined) next = copy;
  next = plain(next);
  const strip = (r) => {
    const { updated_rev: _u, ...rest } = r || {};
    return safeCanon(rest);
  };
  if (strip(next) === strip(row)) return { row, rev: table.rev, changed: false };
  next.updated_rev = table.rev + 1;
  const newTable = { ...table, tasks: rows.map((r, i) => (i === idx ? next : r)) };
  const rev = writeTasks(root, handle, newTable, { expectRev: table.rev });
  return { row: next, rev, changed: true };
}

function newAttempt(task, e) {
  return { epoch: e, folder: `wt/${task}-e${e}`, session: null, stop: 'none' };
}

/**
 * fence(root, handle, {task, expectEpoch, reason, host, tick, readyCheck, cut, spendAtFence, R, Hmax})
 * -> {row, from, to, restartCharged, limit}: the section 3.6 fence rows on updateRow.
 */
export function fence(root, handle, o = {}) {
  const { task, expectEpoch, reason, host = false, tick = null, readyCheck, cut = null, spendAtFence = null } = o;
  const Rmax = Number.isInteger(o.R) ? o.R : 1;
  const Hmax = Number.isInteger(o.Hmax) ? o.Hmax : 2;
  if (!REASONS.includes(reason)) throw err('usage', 66, { reason });
  let info = null;
  const out = updateRow(root, handle, { task, epoch: expectEpoch }, (row) => {
    const e = row.epoch;
    const st = row.state;
    const sp = row.step;
    const planned = st === 'planned' && sp === 'none';
    row.attempts = Array.isArray(row.attempts) ? row.attempts : [];
    row.fails = Array.isArray(row.fails) ? row.fails : [];
    if (reason === 'first') {
      if (!planned) throw err('wrong-step', 65, { task, state: st, step: sp, reason });
      row.epoch = e + 1;
      row.state = 'active';
      row.step = 'stopped';
      row.reason = 'first';
      row.session = null;
      if (!row.attempts.some((a) => a && a.epoch === e + 1)) row.attempts.push(newAttempt(task, e + 1));
      info = { from: e, to: e + 1, restartCharged: false, limit: false };
      return row;
    }
    if ((reason === 'cut' || reason === 'drop') && (planned || (st === 'active' && sp === 'stopped'))) {
      row.state = reason === 'cut' ? 'cut' : 'dropped';
      row.step = 'stopped';
      row.reason = reason;
      info = { from: e, to: e, restartCharged: false, limit: false };
      return row;
    }
    const ok = (st === 'active' && ['bound', 'started', 'admitted'].includes(sp)) || (st === 'parked' && sp === 'stopped');
    if (!ok) throw err('wrong-step', 65, { task, state: st, step: sp, reason });
    const failure = FAILURE_REASONS.includes(reason);
    if (failure && reason !== 'tainted' && typeof readyCheck === 'function' && readyCheck()) {
      throw err('ready-wins', 5, { task, epoch: e });
    }
    const handovers = Number.isInteger(row.handovers) ? row.handovers : 0;
    const parks = Number.isInteger(row.parks) ? row.parks : 0;
    if ((reason === 'handover' || reason === 'memory') && handovers + parks >= Hmax) {
      throw err('hmax', 1, { task, handovers, parks, H_max: Hmax });
    }
    const isHost = failure && reason !== 'tainted' && host === true;
    let limit = false;
    let charged = false;
    if (failure) {
      const restarts = Number.isInteger(row.restarts) ? row.restarts : 0;
      if (restarts >= Rmax) limit = true;
      else if (!isHost) {
        row.restarts = restarts + 1;
        charged = true;
      }
      row.fails.push({ epoch: e, class: reason, host: isHost, tick: Number.isInteger(tick) ? tick : null });
    }
    if (reason === 'handover') row.handovers = handovers + 1;
    if (reason === 'memory') row.parks = parks + 1;
    if (limit) row.limit = true;
    const i = row.attempts.findIndex((a) => a && a.epoch === e);
    if (i >= 0) {
      const c = cut && typeof cut === 'object' ? cut : {};
      const cutRec = {
        files: c.files && typeof c.files === 'object' ? c.files : {},
        ledger_seq: Number.isInteger(c.ledger_seq) ? c.ledger_seq : ledgerHead(root).seq,
      };
      if (Array.isArray(c.links) && c.links.length) cutRec.links = c.links;
      row.attempts[i] = {
        ...row.attempts[i],
        cut: cutRec,
        spend_at_fence: typeof spendAtFence === 'number' && Number.isFinite(spendAtFence) ? spendAtFence : null,
      };
    }
    row.epoch = e + 1;
    row.step = 'fenced';
    row.reason = reason;
    row.session = null;
    if (!row.attempts.some((a) => a && a.epoch === e + 1)) row.attempts.push(newAttempt(task, e + 1));
    info = { from: e, to: e + 1, restartCharged: charged, limit };
    return row;
  });
  return { row: out.row, changed: out.changed, rev: out.rev, ...info };
}

function lstatSafe(p) {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
}

/** Every regular file under staging/ (READY.json excluded): {files: {relpath: {len, sha256}}, links}. */
export function stagingCut(attemptDir) {
  const staging = path.join(attemptDir, 'staging');
  const w = walkFiles(staging);
  const files = {};
  for (const rel of w.files) {
    if (rel === 'READY.json' || (!rel.includes('/') && segmentName(rel) === 'ready.json')) continue;
    const buf = readBytes(path.join(staging, ...rel.split('/')));
    files[rel] = { len: buf.length, sha256: sha256hex(buf) };
  }
  return { files, links: w.links };
}

/** The first `len` bytes of each cut file, read only from a plain regular file; else `mismatched`. */
export function readCutPrefix(attemptDir, cut) {
  const staging = path.join(attemptDir, 'staging');
  const out = {};
  const mismatched = [];
  const entries = cut && cut.files && typeof cut.files === 'object' ? Object.entries(cut.files) : [];
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  for (const [rel, want] of entries) {
    const segs = String(rel).split('/');
    if (segs.some((s) => s === '' || s === '.' || s === '..')) {
      mismatched.push(rel);
      continue;
    }
    let ok = true;
    let cur = staging;
    const top = lstatSafe(staging);
    if (!top || top.isSymbolicLink() || !top.isDirectory()) ok = false;
    for (let i = 0; ok && i < segs.length; i++) {
      cur = path.join(cur, segs[i]);
      const st = lstatSafe(cur);
      if (!st || st.isSymbolicLink()) ok = false;
      else if (i < segs.length - 1 && !st.isDirectory()) ok = false;
      else if (i === segs.length - 1 && (!st.isFile() || st.nlink !== 1 || st.size < want.len)) ok = false;
    }
    if (!ok || !want || !Number.isInteger(want.len)) {
      mismatched.push(rel);
      continue;
    }
    const fd = fs.openSync(cur, 'r');
    let buf;
    try {
      buf = Buffer.alloc(want.len);
      let off = 0;
      while (off < want.len) {
        const n = fs.readSync(fd, buf, off, want.len - off, off);
        if (n <= 0) break;
        off += n;
      }
      if (off < want.len) ok = false;
    } finally {
      fs.closeSync(fd);
    }
    if (!ok || sha256hex(buf) !== want.sha256) {
      mismatched.push(rel);
      continue;
    }
    if (rel.toLowerCase().endsWith('.jsonl')) {
      const nl = buf.lastIndexOf(0x0a);
      buf = nl === -1 ? Buffer.alloc(0) : buf.subarray(0, nl + 1);
    }
    out[rel] = buf;
  }
  return { files: out, mismatched };
}

// =============================================================================================
// 4.7 The schema validator
// =============================================================================================

const KNOWN_KEYWORDS = new Set([
  'type', 'enum', 'const', 'properties', 'required', 'additionalProperties', 'patternProperties',
  'items', 'minItems', 'maxItems', 'uniqueItems', 'minLength', 'maxLength', 'pattern', 'minimum',
  'maximum', 'exclusiveMinimum', '$ref', '$defs', 'anyOf', 'oneOf', 'allOf', 'x-maxWords',
  '$schema', '$id', 'title', 'description', 'x-version',
]);
const CHECKED = new WeakSet();
const SCHEMA_ROOT = new WeakMap();
const SCHEMA_CACHE = new Map();
const REGEX_CACHE = new Map();

function regexOf(src) {
  let r = REGEX_CACHE.get(src);
  if (!r) {
    try {
      r = new RegExp(src, 'u');
    } catch (e) {
      throw err('schema-keyword', 70, { pattern: src, why: e.message });
    }
    REGEX_CACHE.set(src, r);
  }
  return r;
}

function checkKeywords(schema, where = '#') {
  if (typeof schema === 'boolean') return;
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) throw err('schema-keyword', 70, { at: where, why: 'not a schema' });
  if (CHECKED.has(schema)) return;
  CHECKED.add(schema);
  for (const k of Object.keys(schema)) {
    if (!KNOWN_KEYWORDS.has(k)) throw err('schema-keyword', 70, { at: where, keyword: k });
  }
  for (const k of ['properties', 'patternProperties', '$defs']) {
    if (schema[k] !== undefined) {
      if (!schema[k] || typeof schema[k] !== 'object') throw err('schema-keyword', 70, { at: `${where}/${k}`, why: 'not an object' });
      for (const [n, s] of Object.entries(schema[k])) checkKeywords(s, `${where}/${k}/${n}`);
    }
  }
  for (const k of ['additionalProperties', 'items']) {
    if (schema[k] !== undefined) checkKeywords(schema[k], `${where}/${k}`);
  }
  for (const k of ['anyOf', 'oneOf', 'allOf']) {
    if (schema[k] !== undefined) {
      if (!Array.isArray(schema[k])) throw err('schema-keyword', 70, { at: `${where}/${k}`, why: 'not an array' });
      schema[k].forEach((s, i) => checkKeywords(s, `${where}/${k}/${i}`));
    }
  }
  if (schema.pattern !== undefined) regexOf(schema.pattern);
  if (schema.patternProperties) for (const p of Object.keys(schema.patternProperties)) regexOf(p);
}

const ptrEsc = (s) => String(s).replace(/~/g, '~0').replace(/\//g, '~1');
const ptrUnesc = (s) => s.replace(/~1/g, '/').replace(/~0/g, '~');

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isFinite(v) ? 'number' : 'non-finite';
  return typeof v;
}
function typeMatches(t, v) {
  switch (t) {
    case 'null':
      return v === null;
    case 'boolean':
      return typeof v === 'boolean';
    case 'object':
      return v !== null && typeof v === 'object' && !Array.isArray(v);
    case 'array':
      return Array.isArray(v);
    case 'number':
      return typeof v === 'number' && Number.isFinite(v);
    case 'integer':
      return typeof v === 'number' && Number.isInteger(v);
    case 'string':
      return typeof v === 'string';
    default:
      return false;
  }
}

function schemaFileName(name) {
  const n = String(name);
  return n.endsWith('.schema.json') ? n : `${n}.schema.json`;
}

// The schemas shipped beside this file (`<root>/tcb/schemas/` when lib.mjs is `<root>/tcb/lib.mjs`),
// used when a call names no run root: the same files, since tcb/ is the run root's copy.
const OWN_SCHEMAS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schemas');

function readSchemaFile(dir, file) {
  const doc = readJson(path.join(dir, schemaFileName(file)));
  checkKeywords(doc);
  return doc;
}

/**
 * validate(schema, value, {resolve?, root?}) -> {ok, errors: [{path, keyword, message}]}. The JSON
 * Schema 2020-12 subset of section 4.7 plus x-maxWords; any other keyword: schema-keyword 70.
 * A cross-file `$ref` (`<name>.schema.json#/$defs/x`) is resolved through `resolve`: a function
 * `(fileName) -> schema document`, or a string naming a run root (its `tcb/schemas/`) or a schemas
 * folder. Without one: the run root known from loadSchema or opts.root, else the schemas folder
 * beside this file. A file or definition that cannot be found is an error entry, never a throw.
 */
export function validate(schema, value, opts = {}) {
  checkKeywords(schema);
  const errors = [];
  const rootDir = (opts && opts.root) || SCHEMA_ROOT.get(schema) || null;
  const docs = new Map();
  const loadDoc = (file) => {
    if (docs.has(file)) return docs.get(file);
    let d = null;
    try {
      const rs = opts ? opts.resolve : undefined;
      if (typeof rs === 'function') d = rs(file) || null;
      else if (typeof rs === 'string' && rs) {
        const asRoot = path.join(path.resolve(rs), 'tcb', 'schemas');
        d = fs.existsSync(asRoot) ? loadSchema(rs, file) : readSchemaFile(path.resolve(rs), file);
      } else if (rootDir) d = loadSchema(rootDir, file);
      else d = readSchemaFile(OWN_SCHEMAS, file);
    } catch (e) {
      if (e && e.exit === 70) throw e;
      d = null;
    }
    if (d) checkKeywords(d);
    docs.set(file, d);
    return d;
  };
  const resolveRef = (ref, doc) => {
    const hashAt = ref.indexOf('#');
    const file = hashAt === -1 ? ref : ref.slice(0, hashAt);
    const frag = hashAt === -1 ? '' : ref.slice(hashAt + 1);
    const target = file === '' ? doc : loadDoc(file);
    if (!target) return { error: `cannot resolve ${ref}: schema file not found` };
    let cur = target;
    if (frag !== '') {
      if (!frag.startsWith('/')) return { error: `unsupported fragment in ${ref}` };
      for (const seg of frag.slice(1).split('/').map(ptrUnesc)) {
        if (cur && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur, seg)) cur = cur[seg];
        else return { error: `cannot resolve ${ref}: no such definition` };
      }
    }
    if (typeof cur !== 'boolean' && (!cur || typeof cur !== 'object')) return { error: `cannot resolve ${ref}: not a schema` };
    return { schema: cur, doc: target };
  };
  let depth = 0;
  const walk = (s, doc, v, p, errs) => {
    if (s === true) return;
    if (s === false) {
      errs.push({ path: p, keyword: 'false', message: 'no value is allowed here' });
      return;
    }
    if (++depth > 200) {
      depth--;
      errs.push({ path: p, keyword: '$ref', message: 'reference depth exceeded' });
      return;
    }
    try {
      if (s.$ref !== undefined) {
        const r = resolveRef(String(s.$ref), doc);
        if (r.error) errs.push({ path: p, keyword: '$ref', message: r.error });
        else walk(r.schema, r.doc, v, p, errs);
      }
      if (s.type !== undefined) {
        const types = Array.isArray(s.type) ? s.type : [s.type];
        if (!types.some((t) => typeMatches(t, v))) {
          errs.push({ path: p, keyword: 'type', message: `expected ${types.join('|')}, got ${typeOf(v)}` });
          return; // the remaining keywords would only repeat the type error
        }
      }
      if (s.enum !== undefined) {
        const c = safeCanon(v);
        if (!Array.isArray(s.enum) || !s.enum.some((x) => safeCanon(x) === c)) {
          errs.push({ path: p, keyword: 'enum', message: 'value is not one of the allowed values' });
        }
      }
      if (s.const !== undefined && safeCanon(s.const) !== safeCanon(v)) {
        errs.push({ path: p, keyword: 'const', message: `value must be ${safeString(s.const)}` });
      }
      if (typeof v === 'string') {
        const len = [...v].length;
        if (s.minLength !== undefined && len < s.minLength) errs.push({ path: p, keyword: 'minLength', message: `shorter than ${s.minLength}` });
        if (s.maxLength !== undefined && len > s.maxLength) errs.push({ path: p, keyword: 'maxLength', message: `longer than ${s.maxLength}` });
        if (s.pattern !== undefined && !regexOf(s.pattern).test(v)) errs.push({ path: p, keyword: 'pattern', message: `does not match ${s.pattern}` });
        if (s['x-maxWords'] !== undefined && wordCount(v) > s['x-maxWords']) {
          errs.push({ path: p, keyword: 'x-maxWords', message: `more than ${s['x-maxWords']} words` });
        }
      }
      if (typeof v === 'number') {
        if (s.minimum !== undefined && v < s.minimum) errs.push({ path: p, keyword: 'minimum', message: `below ${s.minimum}` });
        if (s.maximum !== undefined && v > s.maximum) errs.push({ path: p, keyword: 'maximum', message: `above ${s.maximum}` });
        if (s.exclusiveMinimum !== undefined && !(v > s.exclusiveMinimum)) {
          errs.push({ path: p, keyword: 'exclusiveMinimum', message: `not above ${s.exclusiveMinimum}` });
        }
      }
      if (Array.isArray(v)) {
        if (s.minItems !== undefined && v.length < s.minItems) errs.push({ path: p, keyword: 'minItems', message: `fewer than ${s.minItems} items` });
        if (s.maxItems !== undefined && v.length > s.maxItems) errs.push({ path: p, keyword: 'maxItems', message: `more than ${s.maxItems} items` });
        if (s.uniqueItems === true) {
          const seen = new Set();
          for (let i = 0; i < v.length; i++) {
            const c = safeCanon(v[i]);
            if (seen.has(c)) {
              // The keyword's instance is the array (as for minItems/maxItems); the message names the item.
              errs.push({ path: p, keyword: 'uniqueItems', message: `duplicate item at index ${i}` });
              break;
            }
            seen.add(c);
          }
        }
        if (s.items !== undefined) v.forEach((x, i) => walk(s.items, doc, x, `${p}/${i}`, errs));
      }
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        const props = s.properties || {};
        const pats = s.patternProperties ? Object.entries(s.patternProperties) : [];
        if (Array.isArray(s.required)) {
          for (const k of s.required) {
            if (!Object.prototype.hasOwnProperty.call(v, k)) errs.push({ path: `${p}/${ptrEsc(k)}`, keyword: 'required', message: `missing property ${k}` });
          }
        }
        for (const k of Object.keys(v)) {
          const kp = `${p}/${ptrEsc(k)}`;
          let matched = false;
          if (Object.prototype.hasOwnProperty.call(props, k)) {
            matched = true;
            walk(props[k], doc, v[k], kp, errs);
          }
          for (const [re, ps] of pats) {
            if (regexOf(re).test(k)) {
              matched = true;
              walk(ps, doc, v[k], kp, errs);
            }
          }
          if (!matched && s.additionalProperties !== undefined) {
            if (s.additionalProperties === false) errs.push({ path: kp, keyword: 'additionalProperties', message: `property ${k} is not allowed` });
            else walk(s.additionalProperties, doc, v[k], kp, errs);
          }
        }
      }
      if (Array.isArray(s.allOf)) for (const sub of s.allOf) walk(sub, doc, v, p, errs);
      if (Array.isArray(s.anyOf)) {
        const okAny = s.anyOf.some((sub) => {
          const e = [];
          walk(sub, doc, v, p, e);
          return e.length === 0;
        });
        if (!okAny) errs.push({ path: p, keyword: 'anyOf', message: 'matches none of anyOf' });
      }
      if (Array.isArray(s.oneOf)) {
        let n = 0;
        for (const sub of s.oneOf) {
          const e = [];
          walk(sub, doc, v, p, e);
          if (e.length === 0) n++;
        }
        if (n !== 1) errs.push({ path: p, keyword: 'oneOf', message: n === 0 ? 'matches none of oneOf' : `matches ${n} of oneOf` });
      }
    } finally {
      depth--;
    }
  };
  walk(schema, schema, value, '', errors);
  return { ok: errors.length === 0, errors };
}

/** Load (and cache) `<root>/tcb/schemas/<name>.schema.json`. */
export function loadSchema(root, name) {
  const R = path.resolve(root);
  const file = path.join(R, 'tcb', 'schemas', schemaFileName(name));
  let st = null;
  try {
    st = fs.statSync(file);
  } catch {
    st = null;
  }
  const key = `${file}|${st ? `${st.mtimeMs}|${st.size}` : 'absent'}`;
  if (SCHEMA_CACHE.has(key)) return SCHEMA_CACHE.get(key);
  const doc = readJson(file);
  checkKeywords(doc);
  SCHEMA_ROOT.set(doc, R);
  SCHEMA_CACHE.set(key, doc);
  return doc;
}

/**
 * checkFormat(root, name, value): schema_version must equal the schema's x-version when the schema
 * declares a `schema_version` property (required there: also when absent from the value), then
 * validate. schema-version 1, schema-invalid 1 (errors in detail). Returns {ok: true, errors: []}.
 */
export function checkFormat(root, name, value) {
  const schema = loadSchema(root, name);
  const declares = !!(schema && schema.properties && Object.prototype.hasOwnProperty.call(schema.properties, 'schema_version'));
  const required = declares && Array.isArray(schema.required) && schema.required.includes('schema_version');
  const isObj = value !== null && typeof value === 'object' && !Array.isArray(value);
  if (declares && isObj) {
    const has = Object.prototype.hasOwnProperty.call(value, 'schema_version');
    if ((required || has) && value.schema_version !== schema['x-version']) {
      throw err('schema-version', 1, { format: name, got: has ? value.schema_version : null, want: schema['x-version'] ?? null });
    }
  }
  const r = validate(schema, value, { root });
  if (!r.ok) throw err('schema-invalid', 1, { format: name, errors: r.errors });
  return r;
}

// =============================================================================================
// 4.8 The transcript parser
// =============================================================================================

/**
 * The harness's project-folder name of a folder. The contract lists `:`, `\`, `/`, `.`, `_` and
 * space; the harness documentation says every non-alphanumeric character, which this follows (equal
 * on every character the contract lists).
 */
export function projectDirName(folderAbs) {
  return String(folderAbs).replace(/[^A-Za-z0-9]/g, '-');
}

function listDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  } catch {
    return [];
  }
}

/** {main, helpers}: main = first <root>/*\/<id>.jsonl; helpers = agent-*.jsonl below <root>/*\/<id>/subagents/. */
export function sessionTranscripts(transcriptsRoot, sessionId) {
  const out = { main: null, helpers: [] };
  if (typeof transcriptsRoot !== 'string' || typeof sessionId !== 'string' || !sessionId) return out;
  const R = path.resolve(transcriptsRoot);
  for (const proj of listDirs(R)) {
    const mainPath = path.join(R, proj, `${sessionId}.jsonl`);
    const st = lstatSafe(mainPath);
    if (!out.main && st && st.isFile()) out.main = mainPath;
    const sub = path.join(R, proj, sessionId, 'subagents');
    const stack = [sub];
    while (stack.length) {
      const d = stack.pop();
      let ents;
      try {
        ents = fs.readdirSync(d, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of ents) {
        const a = path.join(d, e.name);
        if (e.isDirectory()) stack.push(a);
        else if (e.isFile() && /^agent-.*\.jsonl$/.test(e.name)) out.helpers.push(a);
      }
    }
  }
  out.helpers.sort();
  return out;
}

/** Visit the complete lines of a file from `fromByte`, in 1 MiB chunks; returns {endByte, size, torn, tail}. */
function forEachLine(file, fromByte, onLine) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const CHUNK = 1048576;
    let pos = Math.max(0, Math.min(fromByte, size));
    let carry = Buffer.alloc(0);
    let consumed = pos; // byte offset just after the last complete line handed out
    let stop = false;
    while (pos < size && !stop) {
      const n = Math.min(CHUNK, size - pos);
      const chunk = Buffer.alloc(n);
      let got = 0;
      while (got < n) {
        const r = fs.readSync(fd, chunk, got, n - got, pos + got);
        if (r <= 0) break;
        got += r;
      }
      pos += got;
      const buf = carry.length ? Buffer.concat([carry, chunk.subarray(0, got)]) : chunk.subarray(0, got);
      let start = 0;
      for (;;) {
        const nl = buf.indexOf(0x0a, start);
        if (nl === -1) break;
        const lineBuf = buf.subarray(start, nl);
        consumed += nl + 1 - start;
        if (onLine(lineBuf, true) === false) {
          stop = true;
          break;
        }
        start = nl + 1;
      }
      carry = Buffer.from(buf.subarray(start));
      if (got < n) break;
    }
    return { endByte: consumed, size, tail: stop ? null : carry };
  } finally {
    fs.closeSync(fd);
  }
}

function decodeLine(buf) {
  let s = buf.toString('utf8');
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  if (s.endsWith('\r')) s = s.slice(0, -1);
  return s;
}

/** The first record carrying `cwd` (string), or null. */
function firstCwd(file) {
  let cwd = null;
  try {
    forEachLine(file, 0, (lb) => {
      const s = decodeLine(lb);
      if (!s.trim()) return true;
      try {
        const r = JSON.parse(s);
        if (r && typeof r.cwd === 'string') {
          cwd = r.cwd;
          return false;
        }
      } catch {
        // skip a bad line
      }
      return true;
    });
  } catch {
    return null;
  }
  return cwd;
}

/** [{sessionId, path}] of transcripts whose first `cwd` record names the folder (case-folded). */
export function transcriptsForFolder(transcriptsRoot, folderAbs) {
  if (typeof transcriptsRoot !== 'string' || typeof folderAbs !== 'string') return [];
  const R = path.resolve(transcriptsRoot);
  const name = projectDirName(path.resolve(folderAbs));
  let dirs;
  const exact = lstatSafe(path.join(R, name));
  if (exact && exact.isDirectory()) dirs = [name];
  else {
    const prefix = name.slice(0, 100);
    dirs = listDirs(R).filter((d) => d.startsWith(prefix));
  }
  const want = normPath(folderAbs);
  const out = [];
  for (const d of dirs) {
    let ents;
    try {
      ents = fs.readdirSync(path.join(R, d), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of ents) {
      if (!e.isFile() || !e.name.endsWith('.jsonl')) continue;
      const p = path.join(R, d, e.name);
      const cwd = firstCwd(p);
      if (cwd !== null && normPath(cwd) === want) out.push({ sessionId: e.name.slice(0, -'.jsonl'.length), path: p });
    }
  }
  out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return out;
}

const str = (v) => (typeof v === 'string' ? v : '');

/** {kind, paths, urls, query, command, agentType}: the one table guard-hook and audit classify with. */
export function toolAccess(name, input) {
  const inp = input && typeof input === 'object' ? input : {};
  const out = { kind: 'other', paths: [], urls: [], query: '', command: '', agentType: '' };
  switch (name) {
    case 'Read':
      out.kind = 'read';
      if (typeof inp.file_path === 'string') out.paths = [inp.file_path];
      break;
    case 'Glob':
    case 'Grep':
      out.kind = 'read';
      out.paths = [typeof inp.path === 'string' && inp.path !== '' ? inp.path : '.'];
      break;
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
      out.kind = 'write';
      if (typeof inp.file_path === 'string') out.paths = [inp.file_path];
      break;
    case 'NotebookEdit':
      out.kind = 'write';
      if (typeof inp.notebook_path === 'string') out.paths = [inp.notebook_path];
      break;
    case 'WebFetch':
      out.kind = 'fetch';
      if (typeof inp.url === 'string') out.urls = [inp.url];
      break;
    case 'WebSearch':
      out.kind = 'search';
      out.query = str(inp.query);
      break;
    case 'Bash':
    case 'PowerShell':
      out.kind = 'exec';
      out.command = str(inp.command);
      break;
    case 'Agent':
    case 'Task':
      out.kind = 'agent';
      out.agentType = str(inp.subagent_type);
      break;
    default:
      break;
  }
  return out;
}

function sigOf(name, input) {
  let c;
  try {
    c = canonicalize(input === undefined ? null : input);
  } catch {
    c = safeCanon(input);
  }
  return `${name}:${sha256hex(c).slice(0, 16)}`;
}

function usageOf(u) {
  const src = u && typeof u === 'object' ? u : {};
  let partial = false;
  const pick = (k) => {
    const v = src[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    partial = true;
    return 0;
  };
  const usage = {
    input: pick('input_tokens'),
    cache_read: pick('cache_read_input_tokens'),
    cache_write: pick('cache_creation_input_tokens'),
    output: pick('output_tokens'),
  };
  return { usage, partial };
}

function resultText(content) {
  let s = '';
  if (typeof content === 'string') s = content;
  else if (Array.isArray(content)) {
    s = content
      .map((b) => (b && b.type === 'text' && typeof b.text === 'string' ? b.text : ''))
      .filter((x) => x !== '')
      .join('\n');
  }
  return s.length > 2000 ? s.slice(0, 2000) : s;
}

/** Attach a non-enumerable property: readable by callers, invisible to JSON and deep equality. */
function hidden(obj, key, value) {
  Object.defineProperty(obj, key, { value, enumerable: false, writable: true, configurable: true });
  return obj;
}

/**
 * parseTranscript(path, {fromByte=0, lastCall=null}) -> {sessionId, cwd, calls, toolUses,
 * toolResults, structured, turnEnds, endByte, torn, badLines (a count), reset}. Reads 1 MiB chunks;
 * one call per distinct message.id of non-synthetic assistant records, usage from its last record.
 * A first call whose id equals lastCall.id is returned with continued: true. A parseable last line
 * without a newline is taken (endByte then includes it); an unparseable one is the torn tail.
 * `reset` is true when fromByte lay past the end of the file and the parse restarted at 0.
 * Entries keep the contract's shapes; two extras are non-enumerable (absent from JSON and deep
 * equality): `line` on every tool use, tool result and structured entry (the 1-based line of the
 * parse, the file's line when fromByte is 0; harvest's `source.line`), and `open: true` on a turn end
 * that the end of the file closed rather than a user record.
 */
export function parseTranscript(file, { fromByte = 0, lastCall = null } = {}) {
  let start = Number.isInteger(fromByte) && fromByte > 0 ? fromByte : 0;
  let reset = false;
  try {
    const st = fs.statSync(file);
    if (start > st.size) {
      start = 0;
      reset = true;
    }
  } catch (e) {
    if (e && e.code === 'ENOENT') throw err('missing', 2, { path: file });
    throw e;
  }
  const res = {
    sessionId: null, cwd: null, calls: [], toolUses: [], toolResults: [], structured: [], turnEnds: [],
    endByte: start, torn: false, badLines: 0, reset,
  };
  const callIdx = new Map();
  // The current run of assistant records: only the text blocks of its last message id are kept
  // (the harness writes one record per content block, all with the message's id), so memory does not
  // grow with the length of a run.
  let run = null; // {lastId, ts, texts}
  let firstCall = true;
  let lineNo = 0; // 1-based line of the parse (the file's line number when fromByte is 0)
  const prevId = start > 0 && lastCall && typeof lastCall.id === 'string' ? lastCall.id : null;

  const closeRun = (open) => {
    if (!run) return;
    const te = { ts: run.ts, text: run.texts.join('\n') };
    if (open) hidden(te, 'open', true);
    res.turnEnds.push(te);
    run = null;
  };

  const onRecord = (rec) => {
    if (!rec || typeof rec !== 'object') {
      res.badLines++;
      return;
    }
    if (res.sessionId === null && typeof rec.sessionId === 'string') res.sessionId = rec.sessionId;
    if (res.cwd === null && typeof rec.cwd === 'string') res.cwd = rec.cwd;
    const ts = typeof rec.timestamp === 'string' ? rec.timestamp : null;
    if (rec.type === 'assistant') {
      const msg = rec.message && typeof rec.message === 'object' ? rec.message : {};
      const id = typeof msg.id === 'string' ? msg.id : (typeof rec.requestId === 'string' ? rec.requestId : (typeof rec.uuid === 'string' ? rec.uuid : null));
      const content = Array.isArray(msg.content) ? msg.content : [];
      const toolNames = [];
      const texts = [];
      for (const b of content) {
        if (!b || typeof b !== 'object') continue;
        if (b.type === 'tool_use') {
          const name = typeof b.name === 'string' ? b.name : '';
          const input = b.input === undefined ? null : b.input;
          res.toolUses.push(hidden({
            id: typeof b.id === 'string' ? b.id : null,
            name,
            input,
            callId: id,
            ts,
            sig: sigOf(name, input),
            access: toolAccess(name, input),
          }, 'line', lineNo));
          toolNames.push(name);
          if (name === 'StructuredOutput') res.structured.push(hidden({ toolUseId: typeof b.id === 'string' ? b.id : null, data: input }, 'line', lineNo));
        } else if (b.type === 'text' && typeof b.text === 'string') {
          texts.push(b.text);
        }
      }
      if (msg.model !== '<synthetic>' && id !== null) {
        const { usage, partial } = usageOf(msg.usage);
        const context = usage.input + usage.cache_read + usage.cache_write;
        if (callIdx.has(id)) {
          const c = res.calls[callIdx.get(id)];
          c.usage = usage;
          c.context = context;
          c.total = context + usage.output;
          c.partial = partial;
          c.tools.push(...toolNames);
          if (!c.model && typeof msg.model === 'string') c.model = msg.model;
        } else {
          const c = {
            id,
            model: typeof msg.model === 'string' ? msg.model : null,
            ts,
            sidechain: rec.isSidechain === true,
            usage,
            context,
            total: context + usage.output,
            tools: toolNames,
            partial,
          };
          if (firstCall && prevId !== null && id === prevId) c.continued = true;
          callIdx.set(id, res.calls.length);
          res.calls.push(c);
        }
        firstCall = false;
      }
      const key = id ?? `line:${lineNo}`;
      if (!run) run = { lastId: key, ts, texts: [] };
      if (run.lastId !== key) {
        run.lastId = key;
        run.texts = [];
      }
      run.ts = ts;
      run.texts.push(...texts);
      return;
    }
    if (rec.type === 'user') {
      const msg = rec.message && typeof rec.message === 'object' ? rec.message : {};
      const content = Array.isArray(msg.content) ? msg.content : null;
      let isToolResult = false;
      if (content) {
        for (const b of content) {
          if (b && b.type === 'tool_result') {
            isToolResult = true;
            const tr = {
              toolUseId: typeof b.tool_use_id === 'string' ? b.tool_use_id : null,
              isError: b.is_error === true,
              ts,
              text: resultText(b.content),
            };
            const pd = rec.permissionDecision;
            if (pd && typeof pd === 'object') tr.permission = { decision: pd.decision ?? null, source: pd.source ?? null };
            res.toolResults.push(hidden(tr, 'line', lineNo));
          }
        }
      }
      if (!isToolResult) closeRun(false);
      return;
    }
    if (rec.type === 'attachment') {
      const a = rec.attachment;
      if (a && typeof a === 'object' && a.type === 'structured_output') {
        const item = { data: a.data === undefined ? null : a.data };
        const tid = a.toolUseID ?? a.toolUseId ?? a.tool_use_id;
        if (typeof tid === 'string') item.toolUseId = tid;
        res.structured.push(hidden(item, 'line', lineNo));
      }
    }
    // every other record type is skipped
  };

  const handle = (lineBuf) => {
    lineNo++;
    const s = decodeLine(lineBuf);
    if (s.trim() === '') return true;
    let rec;
    try {
      rec = JSON.parse(s);
    } catch {
      res.badLines++;
      return true;
    }
    onRecord(rec);
    return true;
  };

  const r = forEachLine(file, start, handle);
  res.endByte = r.endByte;
  if (r.tail && r.tail.length) {
    lineNo++;
    const s = decodeLine(r.tail);
    if (s.trim() !== '') {
      let rec;
      let ok = true;
      try {
        rec = JSON.parse(s);
      } catch {
        ok = false;
      }
      if (ok && rec && typeof rec === 'object') {
        onRecord(rec);
        res.endByte = r.endByte + r.tail.length;
      } else {
        res.torn = true;
      }
    }
  }
  closeRun(true);
  return res;
}

/** Totals over a session's parses (main first, then helpers). */
export function spendOf(parsed) {
  const out = { calls: 0, input: 0, cache_read: 0, cache_write: 0, output: 0, total: 0, peak_context: 0, last_context: 0, partial: false };
  const list = Array.isArray(parsed) ? parsed : [];
  list.forEach((p, idx) => {
    if (!p || !Array.isArray(p.calls)) return;
    let lastTs = null;
    for (const c of p.calls) {
      out.calls++;
      out.input += c.usage.input;
      out.cache_read += c.usage.cache_read;
      out.cache_write += c.usage.cache_write;
      out.output += c.usage.output;
      out.total += c.total;
      if (c.context > out.peak_context) out.peak_context = c.context;
      if (c.partial) out.partial = true;
      if (idx === 0 && (lastTs === null || (c.ts ?? '') >= lastTs)) {
        lastTs = c.ts ?? '';
        out.last_context = c.context;
      }
    }
  });
  return out;
}

/** The trailing run of equal tool-call signatures. */
export function loopRun(toolUses) {
  const list = Array.isArray(toolUses) ? toolUses : [];
  if (!list.length) return { sig: null, run: 0 };
  const sig = list[list.length - 1].sig;
  let run = 0;
  for (let i = list.length - 1; i >= 0 && list[i].sig === sig; i--) run++;
  return { sig, run };
}

/** sha256hex(new URL(u).href). */
export function urlKey(u) {
  let href;
  try {
    href = new URL(String(u)).href;
  } catch {
    throw err('bad-url', 2, { url: String(u) });
  }
  return sha256hex(href);
}

// =============================================================================================
// 4.9 Process information
// =============================================================================================

export const PROC_EXE = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
export const TASKKILL = 'C:/Windows/System32/taskkill.exe';

const PS_LIST = [
  '[Console]::OutputEncoding=[Text.Encoding]::UTF8;',
  "$b=$null; try { $b=(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().ToString('o') } catch {};",
  '$p=@(Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine,',
  "@{n='start_time';e={if($_.CreationDate){$_.CreationDate.ToUniversalTime().ToString('o')}else{$null}}});",
  'ConvertTo-Json -InputObject @{boot=$b; procs=$p} -Compress -Depth 4',
].join(' ');
const PS_BOOT = "[Console]::OutputEncoding=[Text.Encoding]::UTF8; (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().ToString('o')";
const psOne = (pid) => `[Console]::OutputEncoding=[Text.Encoding]::UTF8; $x=Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}'; if($x){ if($x.CreationDate){$x.CreationDate.ToUniversalTime().ToString('o')}else{'NOSTART'} } else {'NONE'}`;

function stripBomStr(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/**
 * The real provider {list(), alive(pid, start_time), boot()} over one PowerShell per call (about
 * 2 s). list() failure: proc-unavailable 2; alive() and boot() give null on failure. list() also
 * reads the boot identifier in the same call and keeps it.
 */
export function realProc({ timeoutMs = 30000, exe = PROC_EXE } = {}) {
  let bootCache;
  const run = (script) => cp.execFileSync(exe, ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8', timeout: timeoutMs, windowsHide: true, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const proc = {
    list() {
      let raw;
      try {
        raw = stripBomStr(String(run(PS_LIST))).trim();
      } catch (e) {
        throw err('proc-unavailable', 2, { why: e && e.code ? e.code : (e && e.message ? e.message.split('\n')[0] : 'failed') });
      }
      let doc;
      try {
        doc = raw ? JSON.parse(raw) : { boot: null, procs: [] };
      } catch {
        throw err('proc-unavailable', 2, { why: 'unparseable output' });
      }
      if (doc && typeof doc.boot === 'string') bootCache = doc.boot;
      let ps = doc ? doc.procs : [];
      if (ps === null || ps === undefined) ps = [];
      if (!Array.isArray(ps)) ps = [ps];
      const list = ps.filter((p) => p && typeof p === 'object').map((p) => ({
        pid: p.ProcessId,
        ppid: p.ParentProcessId ?? null,
        name: p.Name ?? null,
        exe: p.ExecutablePath ?? null,
        cmdline: p.CommandLine ?? null,
        start_time: typeof p.start_time === 'string' ? p.start_time : null,
      }));
      const me = list.find((p) => p.pid === process.pid);
      if (me && me.start_time) REAL_SELF_START = me.start_time;
      return list;
    },
    // Identity needs the start time, so the answer always comes from PowerShell: true, false, or
    // null when PowerShell fails (section 4.9, spec/lib.md T89). No process.kill(pid, 0) shortcut:
    // it would answer `false` while PowerShell is unavailable.
    alive(pid, startTime) {
      if (!Number.isInteger(pid) || pid <= 0) return false;
      let out;
      try {
        out = stripBomStr(String(run(psOne(pid)))).trim();
      } catch {
        return null;
      }
      if (out === 'NONE') return false;
      if (startTime === null || startTime === undefined) return true;
      if (out === 'NOSTART') return null;
      return out === startTime;
    },
    boot() {
      if (bootCache !== undefined) return bootCache;
      try {
        const out = stripBomStr(String(run(PS_BOOT))).trim();
        bootCache = out || null;
      } catch {
        return null;
      }
      return bootCache;
    },
  };
  Object.defineProperty(proc, REAL, { value: true });
  return proc;
}

/** Descendants of pid (BFS); a child counts only when its start_time is not before its parent's. */
export function descendants(list, pid) {
  const procs = Array.isArray(list) ? list.filter((p) => p && Number.isInteger(p.pid)) : [];
  const byPid = new Map(procs.map((p) => [p.pid, p]));
  const out = [];
  const seen = new Set([pid]);
  const queue = [pid];
  while (queue.length) {
    const cur = queue.shift();
    const parent = byPid.get(cur);
    for (const c of procs) {
      if (c.ppid !== cur || seen.has(c.pid)) continue;
      const ps = parent ? parent.start_time : null;
      const cs = c.start_time;
      if (typeof ps === 'string' && typeof cs === 'string' && cs < ps) continue; // a reused parent pid
      seen.add(c.pid);
      out.push(c.pid);
      queue.push(c.pid);
    }
  }
  return out;
}

function normCmd(s) {
  const t = String(s).replace(/\\/g, '/');
  return process.platform === 'win32' ? t.toLowerCase() : t;
}

/**
 * {matched, method}: processes whose command line names the folder (followed by `/`, `\`, `"`, `'`,
 * a space or the end) or the session id, plus their descendants. Report only.
 */
export function attemptProcesses(list, { folder, sessionId } = {}) {
  const procs = Array.isArray(list) ? list.filter((p) => p && Number.isInteger(p.pid)) : [];
  let f = typeof folder === 'string' && folder ? normCmd(folder).replace(/\/+$/, '') : null;
  if (f === '') f = null;
  const sid = typeof sessionId === 'string' && sessionId ? sessionId.toLowerCase() : null;
  const direct = [];
  let byFolder = false;
  let bySession = false;
  for (const p of procs) {
    if (typeof p.cmdline !== 'string' || !p.cmdline) continue;
    const c = normCmd(p.cmdline);
    let hit = false;
    if (f) {
      let at = c.indexOf(f);
      while (at !== -1) {
        const next = c.charAt(at + f.length);
        if (next === '' || next === '/' || next === '"' || next === "'" || next === ' ') {
          hit = true;
          byFolder = true;
          break;
        }
        at = c.indexOf(f, at + 1);
      }
    }
    if (!hit && sid && c.toLowerCase().includes(sid)) {
      hit = true;
      bySession = true;
    }
    if (hit) direct.push(p.pid);
  }
  const pids = new Set(direct);
  for (const d of direct) for (const x of descendants(procs, d)) pids.add(x);
  const matched = procs.filter((p) => pids.has(p.pid));
  const method = byFolder && bySession ? 'both' : byFolder ? 'folder' : bySession ? 'session' : 'none';
  return { matched, method };
}

/**
 * killOwnTree(proc, child, {exec?}): for a child this process spawned and recorded {pid, start_time}.
 * Re-lists, checks the start time, kills verified descendants leaf-first and then the child, each by
 * `taskkill /PID <n> /F` (absolute path, never /T) after re-matching its start time. `exec(file,
 * args)` is a test seam (default spawnSync).
 */
export function killOwnTree(proc, child, opts = {}) {
  const exec = typeof opts.exec === 'function' ? opts.exec : (file, args) => cp.spawnSync(file, args, { windowsHide: true, stdio: 'ignore' });
  const res = { killed: [], skipped: [], reason: null };
  if (!proc || !child || !Number.isInteger(child.pid)) {
    res.reason = 'no-child';
    return res;
  }
  const list = proc.list();
  const me = Array.isArray(list) ? list.find((p) => p && p.pid === child.pid) : null;
  if (!me || typeof child.start_time !== 'string' || me.start_time !== child.start_time) {
    res.reason = 'start-mismatch';
    res.skipped.push(child.pid);
    return res;
  }
  const byPid = new Map(list.filter((p) => p && Number.isInteger(p.pid)).map((p) => [p.pid, p]));
  const desc = descendants(list, child.pid);
  const depth = new Map([[child.pid, 0]]);
  for (const pid of desc) {
    const p = byPid.get(pid);
    depth.set(pid, (depth.get(p.ppid) ?? 0) + 1);
  }
  const order = [...desc].sort((a, b) => depth.get(b) - depth.get(a));
  const killOne = (pid, startTime) => {
    if (typeof startTime !== 'string' || proc.alive(pid, startTime) !== true) {
      res.skipped.push(pid);
      return;
    }
    exec(TASKKILL, ['/PID', String(pid), '/F']);
    res.killed.push(pid);
  };
  for (const pid of order) killOne(pid, byPid.get(pid).start_time);
  killOne(child.pid, child.start_time);
  return res;
}

// =============================================================================================
// 4.10 Shared numerics and computations
// =============================================================================================

/** Deterministic generator: next() = first 4 bytes of sha256(seed + ':' + counter) / 2^32. */
export function rng(seed) {
  const s = String(seed);
  let counter = 0;
  const next = () => {
    const h = crypto.createHash('sha256').update(`${s}:${counter++}`, 'utf8').digest();
    return h.readUInt32BE(0) / 4294967296;
  };
  const int = (n) => Math.floor(next() * n);
  const shuffle = (array) => {
    const a = Array.from(array || []);
    for (let i = a.length - 1; i > 0; i--) {
      const j = int(i + 1);
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };
  return { next, int, shuffle };
}

function lgamma(x) {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  const xx = x - 1;
  let a = c[0];
  const t = xx + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (xx + i);
  return 0.5 * Math.log(2 * Math.PI) + (xx + 0.5) * Math.log(t) - t + Math.log(a);
}

function betacf(a, b, x) {
  const MAXIT = 300;
  const EPS = 3e-16;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function ibeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

function betaInv(p, a, b) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (ibeta(mid, a, b) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Exact two-sided Clopper-Pearson interval. */
export function clopperPearson(x, n, conf = 0.95) {
  if (!Number.isInteger(n) || n <= 0) return { lower: 0, upper: 1 };
  const k = Math.max(0, Math.min(n, Math.round(x)));
  const alpha = 1 - conf;
  const lower = k === 0 ? 0 : betaInv(alpha / 2, k, n - k + 1);
  const upper = k === n ? 1 : betaInv(1 - alpha / 2, k + 1, n - k);
  return { lower, upper };
}

const OPEN_STEPS = ['admitted', 'started', 'bound'];
const num0 = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * {reservation, spentTotal}: spend of every attempt of every row, plus max(0, e_task - spent of the
 * current attempt) for rows active at step admitted, started or bound. Never stored (R10).
 */
export function reservation(rows, spentOf) {
  let spentTotal = 0;
  let open = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row) continue;
    for (const a of Array.isArray(row.attempts) ? row.attempts : []) {
      if (a && Number.isInteger(a.epoch)) spentTotal += num0(spentOf(row.task, a.epoch));
    }
    if (row.state === 'active' && OPEN_STEPS.includes(row.step)) {
      open += Math.max(0, num0(row.e_task) - num0(spentOf(row.task, row.epoch)));
    }
  }
  return { reservation: spentTotal + open, spentTotal };
}

/**
 * {live, unknown, unconfirmed} (section 4.10) over every attempt not known ended (stop not
 * confirmed, row not planned), each counted once, in this order: stop `unconfirmed` -> unconfirmed;
 * procList null (PowerShell failed) -> unknown; matched processes alive -> live; the current attempt
 * of a row active at step admitted, started or bound, or the last attempt of a committed row ->
 * unknown (always one slot); a transcript of the attempt exists -> unknown; else nothing.
 * `opts.root` (optional, not in the contract's signature) resolves a relative attempt folder; without
 * it a relative folder is matched in command lines as written, and its transcripts are found by
 * session id or by a project folder whose first `cwd` ends with that relative folder.
 */
export function slotCount(rows, procList, transcriptsRoot, opts = {}) {
  const out = { live: 0, unknown: 0, unconfirmed: 0 };
  const root = opts && opts.root ? path.resolve(opts.root) : null;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || row.state === 'planned') continue;
    const atts = Array.isArray(row.attempts) ? row.attempts : [];
    const maxEpoch = atts.reduce((m, a) => (a && Number.isInteger(a.epoch) && a.epoch > m ? a.epoch : m), 0);
    const seen = new Set();
    for (const a of atts) {
      if (!a || a.stop === 'confirmed') continue;
      if (Number.isInteger(a.epoch)) {
        if (seen.has(a.epoch)) continue; // one attempt is never counted twice
        seen.add(a.epoch);
      }
      if (a.stop === 'unconfirmed') {
        out.unconfirmed++;
        continue;
      }
      if (procList === null || procList === undefined) {
        out.unknown++;
        continue;
      }
      const currentOpen = a.epoch === row.epoch && row.state === 'active' && OPEN_STEPS.includes(row.step);
      const lastCommitted = row.state === 'committed' && a.epoch === maxEpoch;
      const folderRel = typeof a.folder === 'string' && a.folder ? a.folder : `wt/${row.task}-e${a.epoch}`;
      const folderAbs = path.isAbsolute(folderRel) ? folderRel : root ? path.resolve(root, folderRel) : null;
      const m = attemptProcesses(procList, { folder: folderAbs ?? folderRel, sessionId: a.session ?? null });
      if (m.matched.length > 0) {
        out.live++;
        continue;
      }
      if (currentOpen || lastCommitted) {
        out.unknown++;
        continue;
      }
      if (attemptHasTranscript(transcriptsRoot, a.session, folderAbs, folderAbs ? null : folderRel)) out.unknown++;
    }
  }
  return out;
}

/** A transcript of an attempt: by session id, by the absolute folder, or (no root) by a folder suffix. */
function attemptHasTranscript(transcriptsRoot, session, folderAbs, folderRel) {
  if (typeof transcriptsRoot !== 'string' || !transcriptsRoot) return false;
  if (typeof session === 'string' && session && sessionTranscripts(transcriptsRoot, session).main) return true;
  if (folderAbs) return transcriptsForFolder(transcriptsRoot, folderAbs).length > 0;
  if (typeof folderRel !== 'string' || !folderRel) return false;
  const rel = foldPath(folderRel.replace(/\\/g, '/')).replace(/^\/+|\/+$/g, '');
  const suffix = '-' + projectDirName(rel);
  const R = path.resolve(transcriptsRoot);
  for (const d of listDirs(R)) {
    if (!d.endsWith(suffix)) continue;
    let ents;
    try {
      ents = fs.readdirSync(path.join(R, d), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of ents) {
      if (!e.isFile() || !e.name.endsWith('.jsonl')) continue;
      const cwd = firstCwd(path.join(R, d, e.name));
      if (cwd !== null && foldPath(String(cwd).replace(/\\/g, '/')).endsWith('/' + rel)) return true;
    }
  }
  return false;
}

function lastStatusMap(root) {
  const file = path.join(path.resolve(root), 'store', 'status', 'card_status.jsonl');
  const m = new Map();
  let recs = [];
  try {
    recs = readJsonl(file).records;
  } catch (e) {
    if (!e || e.code !== 'missing') throw e;
  }
  for (const r of recs) if (r && typeof r.card_id === 'string') m.set(r.card_id, r);
  return { map: m, records: recs };
}

function commitRecordsOf(root, task) {
  const dir = path.join(path.resolve(root), 'store', 'commits');
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((n) => n.startsWith(`${task}.`) && n.endsWith('.json')).sort();
  } catch {
    return [];
  }
  const out = [];
  for (const n of names) {
    try {
      out.push(readJson(path.join(dir, n)));
    } catch {
      // unreadable commit record: skipped here; fsck reports it
    }
  }
  return out;
}

function tryObject(root, id) {
  try {
    return getObject(root, id);
  } catch (e) {
    if (e && e.exit === 3) throw e;
    return null;
  }
}

function storedCards(root) {
  const dir = path.join(path.resolve(root), 'store', 'objects');
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((n) => /^c_[0-9a-f]{16}\.json$/.test(n)).sort();
  } catch {
    return [];
  }
  const out = [];
  for (const n of names) {
    const id = n.slice(0, -5);
    const v = tryObject(root, id);
    if (v && v.kind === 'card') out.push({ id, card: v });
  }
  return out;
}

function coverOver(questionIds, cards, statusMap, f5Given, extraCards) {
  const covered = [];
  const uncovered = [];
  const good = (id) => {
    const s = statusMap.get(id);
    return !!s && (s.status === 'witnessed' || s.status === 'confirmed');
  };
  for (const q of questionIds) {
    let hit = cards.some(({ id, card }) => good(id) && Array.isArray(card.question_ids) && card.question_ids.includes(q));
    // CONTRACT 4.10: without F5, "any such stored card" - such = last status witnessed or confirmed.
    if (!hit && !f5Given) hit = extraCards.some(({ id, card }) => good(id) && Array.isArray(card.question_ids) && card.question_ids.includes(q));
    (hit ? covered : uncovered).push(q);
  }
  return { covered, uncovered };
}

/**
 * variant(root, row, {f5Given}) -> {V, covered, uncovered} (R5). research/control: question ids
 * covered by a witnessed/confirmed card of the task (or, without F5, any witnessed/confirmed stored card); review /
 * fresh-review: open approaches plus cited cards still pending or witnessed; design-check: V null.
 */
export function variant(root, row, { f5Given = false } = {}) {
  const qids = row && Array.isArray(row.question_ids) ? row.question_ids : [];
  const stage = row ? row.stage : null;
  if (stage === 'design-check') return { V: null, covered: [], uncovered: [] };
  const { map: statusMap } = lastStatusMap(root);
  const { lines } = readLedger(root);
  if (stage === 'review' || stage === 'fresh-review') {
    let reviewId = null;
    for (const l of lines) {
      if (l && l.kind === 'intake' && l.task === row.task && l.epoch === row.epoch && l.data && Array.isArray(l.data.objects)) {
        for (const o of l.data.objects) if (o && o.kind === 'review' && typeof o.id === 'string') reviewId = o.id;
      }
    }
    let approaches = [];
    if (row.field) {
      const proto = currentProtocol(root, row.field);
      const v = proto && proto.value && proto.value.outlist_vocab;
      if (v && Array.isArray(v.approaches)) approaches = v.approaches;
    }
    const review = reviewId ? tryObject(root, reviewId) : null;
    if (!review) return { V: approaches.length, covered: [], uncovered: [...qids] };
    const judged = new Set((Array.isArray(review.verdicts) ? review.verdicts : []).map((v) => v && v.approach_id));
    const open = approaches.filter((a) => !judged.has(a)).length;
    const cited = new Set();
    for (const s of Array.isArray(review.sentences) ? review.sentences : []) {
      for (const c of Array.isArray(s && s.cites) ? s.cites : []) cited.add(c);
    }
    let unsettled = 0;
    for (const c of cited) {
      const st = statusMap.get(c);
      if (!st || st.status === 'pending' || st.status === 'witnessed') unsettled++;
    }
    const pack = typeof review.pack === 'string' ? tryObject(root, review.pack) : null;
    const packCards = [];
    for (const id of pack && Array.isArray(pack.cards) ? pack.cards : []) {
      const c = tryObject(root, id);
      if (c) packCards.push({ id, card: c });
    }
    const cov = coverOver(qids, packCards, statusMap, f5Given, packCards);
    return { V: open + unsettled, covered: cov.covered, uncovered: cov.uncovered };
  }
  // research and control (and any other stage with question ids)
  const ids = new Set();
  for (const l of lines) {
    if (l && l.kind === 'intake' && l.task === row.task && l.data && Array.isArray(l.data.objects)) {
      for (const o of l.data.objects) if (o && o.kind === 'card' && typeof o.id === 'string') ids.add(o.id);
    }
  }
  for (const rec of commitRecordsOf(root, row.task)) {
    for (const o of Array.isArray(rec && rec.outputs) ? rec.outputs : []) if (o && o.kind === 'card' && typeof o.id === 'string') ids.add(o.id);
  }
  const taskCards = [];
  for (const id of [...ids].sort()) {
    const c = tryObject(root, id);
    if (c) taskCards.push({ id, card: c });
  }
  const extra = f5Given ? [] : storedCards(root);
  const cov = coverOver(qids, taskCards, statusMap, f5Given, extra);
  return { V: cov.uncovered.length, covered: cov.covered, uncovered: cov.uncovered };
}

function designOutput(root, rows, lines, role, step, cutSha) {
  const tasksOfRole = new Set(rows.filter((r) => r && r.role === role).map((r) => r.task));
  const commits = lines
    .filter((l) => l && l.kind === 'commit' && tasksOfRole.has(l.task) && l.data && l.data.step === step)
    .sort((a, b) => b.seq - a.seq);
  const tried = new Set();
  for (const l of commits) {
    if (tried.has(l.task)) continue;
    tried.add(l.task);
    let rec;
    try {
      rec = readJson(path.join(path.resolve(root), 'store', 'commits', `${l.task}.${step}.json`));
    } catch {
      continue;
    }
    const o = (Array.isArray(rec.outputs) ? rec.outputs : []).find((x) => x && x.kind === step);
    if (!o) continue;
    const obj = tryObject(root, o.id);
    if (!obj || obj.cut_sha !== cutSha) continue;
    return { id: o.id, sha: sha256hex(canonicalize(obj)), task: l.task };
  }
  return null;
}

/**
 * {cut_sha, hazards_id, hazards_sha} (section 4.10): cut_sha from the last `cut` line; each output
 * from the commit with the highest `commit` ledger seq among rows of its role whose object names
 * that cut. The stpa and fmea outputs chosen by the same rule ride along as non-enumerable
 * `stpa_id`, `stpa_sha`, `fmea_id`, `fmea_sha` (readable, absent from JSON and deep equality).
 */
export function currentDesign(root) {
  const { lines } = readLedger(root);
  const cut = lastLine(lines, 'cut');
  const cutSha = cut && cut.data && typeof cut.data.sha === 'string' ? cut.data.sha : null;
  const withExtras = (o, stpa, fmea) => {
    hidden(o, 'stpa_id', stpa ? stpa.id : null);
    hidden(o, 'stpa_sha', stpa ? stpa.sha : null);
    hidden(o, 'fmea_id', fmea ? fmea.id : null);
    hidden(o, 'fmea_sha', fmea ? fmea.sha : null);
    return o;
  };
  if (!cutSha) return withExtras({ cut_sha: null, hazards_id: null, hazards_sha: null }, null, null);
  let rows = [];
  try {
    rows = readTasks(root).tasks || [];
  } catch (e) {
    if (e && e.exit === 67 && !fs.existsSync(path.join(path.resolve(root), 'run', 'tasks.json'))) rows = [];
    else throw e;
  }
  const hz = designOutput(root, rows, lines, 'mapper', 'hazards', cutSha);
  const stpa = designOutput(root, rows, lines, 'stpa', 'stpa', cutSha);
  const fmea = designOutput(root, rows, lines, 'fmea', 'fmea', cutSha);
  return withExtras({
    cut_sha: cutSha,
    hazards_id: hz ? hz.id : null,
    hazards_sha: hz ? hz.sha : null,
  }, stpa, fmea);
}

/**
 * The current frozen protocol of a field: the file named by the last protocol-freeze or
 * protocol-amend line of `protocol-<field>`, re-checked against that line's sha256 (of the file's
 * bytes or of its canonical form). {name, path, sha256, value} or null.
 */
export function currentProtocol(root, field) {
  const R = path.resolve(root);
  const { lines } = readLedger(R);
  const name = `protocol-${field}`;
  const l = lastLine(lines, null, (x) => (x.kind === 'protocol-freeze' || x.kind === 'protocol-amend') && x.data && x.data.name === name);
  if (!l) return null;
  const rel = l.data.path;
  if (typeof rel !== 'string' || !rel) throw err('missing', 2, { what: name, why: 'no path in ledger line' });
  const abs = path.isAbsolute(rel) ? rel : path.resolve(R, rel);
  if (!isUnder(abs, R)) throw err('path-escape', 3, { path: rel });
  let buf;
  try {
    buf = readBytes(abs);
  } catch (e) {
    if (e && e.code === 'ENOENT') throw err('missing', 2, { path: rel });
    throw e;
  }
  let value;
  try {
    value = JSON.parse(stripBom(buf).toString('utf8'));
  } catch {
    throw err('object-mismatch', 3, { path: rel, why: 'unparseable' });
  }
  const want = l.data.sha256;
  const shaBytes = sha256hex(buf);
  const shaCanon = sha256hex(canonicalize(value));
  if (want !== shaBytes && want !== shaCanon) throw err('object-mismatch', 3, { path: rel, want, got: shaCanon });
  return { name, path: abs, sha256: want, value };
}

/** sha256hex(canonicalize(sorted question ids)). */
export function questionsSha(ids) {
  const list = Array.from(ids || [], String);
  list.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return sha256hex(canonicalize(list));
}

/** {halted, draining}: a halt not followed by an owner resume; a drain line of this ce. */
export function runFlags(lines, ce) {
  const ls = Array.isArray(lines) ? lines : [];
  let halted = false;
  let draining = false;
  for (const l of ls) {
    if (!l) continue;
    if (l.kind === 'halt') halted = true;
    else if (l.kind === 'owner' && l.data && l.data.act === 'resume') halted = false;
    if (l.kind === 'drain' && l.ce === ce) draining = true;
  }
  return { halted, draining };
}

function qualifiedClasses(root) {
  try {
    const q = readJson(path.join(path.resolve(root), 'store', 'qualification.json'));
    const classes = q && q.classes && typeof q.classes === 'object' ? q.classes : {};
    return (c) => !!(classes[c] && classes[c].qualified === true);
  } catch {
    return () => false;
  }
}

/**
 * Whether batch `b` counts for the intake in-flight test (spec/check-queue.mjs.md step 2 and T14):
 * a batch whose `queue/<b>/` folder exists without `batch.json` is a write cut off before its last
 * file and is ignored; a `batch.json` of another mode (freeze, post-review) is ignored too (in
 * flight means "of the same mode"). A sealed key with no queue folder at all still counts.
 */
function intakeBatchCounts(R, batch) {
  const dir = path.join(R, 'queue', batch);
  const st = lstatSafe(dir);
  if (!st) return true;
  let doc;
  try {
    doc = readJson(path.join(dir, 'batch.json'));
  } catch (e) {
    if (e && e.code === 'missing') return false;
    return true; // unreadable batch.json: counted (the cautious answer)
  }
  return !(doc && typeof doc.mode === 'string' && doc.mode !== 'intake');
}

/**
 * [{card_id, in_flight}]: cards whose last status is witnessed (or rejected for
 * number-without-quote) and whose last line has no check, or (reason unqualified /
 * unqualified-revert) while J1, J2 and J4 are now qualified. in_flight: a real item of an earlier
 * intake batch (see intakeBatchCounts) with no status line carrying that batch.
 */
export function intakeCandidates(root) {
  const R = path.resolve(root);
  const { map, records } = lastStatusMap(R);
  const qualified = qualifiedClasses(R);
  const allJ = qualified('J1') && qualified('J2') && qualified('J4');
  const answered = new Set();
  for (const r of records) if (r && r.check && typeof r.check.batch === 'string') answered.add(`${r.check.batch}|${r.card_id}`);
  const pendingItems = new Map(); // card -> true when a real item of some batch has no answer
  let seedFiles = [];
  try {
    seedFiles = fs.readdirSync(path.join(R, 'sealed', 'seeds')).filter((n) => /^b[0-9]+-[0-9]+\.json$/.test(n)).sort();
  } catch {
    seedFiles = [];
  }
  for (const f of seedFiles) {
    const batch = f.slice(0, -5);
    if (!intakeBatchCounts(R, batch)) continue;
    let key;
    try {
      key = readJson(path.join(R, 'sealed', 'seeds', f));
    } catch {
      continue;
    }
    for (const e of Object.values(key && key.items ? key.items : {})) {
      if (!e || e.seed !== false || typeof e.card_id !== 'string') continue;
      if (!answered.has(`${batch}|${e.card_id}`)) pendingItems.set(e.card_id, true);
    }
  }
  const out = [];
  for (const [id, last] of [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
    const statusOk = last.status === 'witnessed' || (last.status === 'rejected' && last.reason === 'number-without-quote');
    if (!statusOk) continue;
    let take;
    if (last.reason === 'unqualified' || last.reason === 'unqualified-revert') take = allJ;
    else take = !last.check;
    if (take) out.push({ card_id: id, in_flight: pendingItems.get(id) === true });
  }
  return out;
}

/**
 * The R18 rule (section 3.15): an intake flag on (object o, sid s) is cleared when every card the
 * sentence cites has a confirmed `sentence-check` status line for node o#s from a batch queued after
 * the flag, not reverted later for one of its classes. A sentence with no citation stays open.
 */
export function flagCleared(root, flag) {
  if (!flag || typeof flag !== 'object') return false;
  const R = path.resolve(root);
  let objId = flag.id ?? flag.obj_id ?? null;
  let sid = flag.sid ?? null;
  if ((!objId || !sid) && typeof flag.node === 'string' && flag.node.includes('#')) {
    const [o, s] = flag.node.split('#');
    objId = objId || o;
    sid = sid || s;
  }
  if (typeof objId !== 'string' || typeof sid !== 'string') return false;
  const node = `${objId}#${sid}`;
  const { lines } = readLedger(R);
  let flagSeq = Number.isInteger(flag.seq) ? flag.seq : Number.isInteger(flag.intake_seq) ? flag.intake_seq : null;
  if (flagSeq === null) {
    const l = lastLine(lines, 'intake', (x) => x.data && Array.isArray(x.data.flagged) && x.data.flagged.some((f) => f && f.id === objId && f.sid === sid));
    if (!l) return false;
    flagSeq = l.seq;
  }
  const obj = tryObject(R, objId);
  if (!obj) return false;
  const sentences = Array.isArray(obj.conclusions) ? obj.conclusions : Array.isArray(obj.sentences) ? obj.sentences : [];
  const s = sentences.find((x) => x && x.sid === sid);
  if (!s || !Array.isArray(s.cites) || s.cites.length === 0) return false;
  const queuedAt = new Map();
  for (const l of lines) if (l && l.kind === 'queue' && l.data && typeof l.data.batch === 'string') queuedAt.set(l.data.batch, l.seq);
  const { records } = lastStatusMap(R);
  for (const card of s.cites) {
    const recs = records.filter((r) => r && r.card_id === card);
    let ok = false;
    for (let i = 0; i < recs.length && !ok; i++) {
      const r = recs[i];
      const ch = r.check;
      if (!ch || ch.node !== node || ch.verdict !== 'confirmed' || r.reason !== 'sentence-check') continue;
      const qs = queuedAt.get(ch.batch);
      if (!(Number.isInteger(qs) && qs > flagSeq)) continue;
      const classes = new Set(Array.isArray(r.classes) ? r.classes : []);
      const reverted = recs.slice(i + 1).some((x) => x.reason === 'unqualified-revert' && Array.isArray(x.classes) && x.classes.some((c) => classes.has(c)));
      if (!reverted) ok = true;
    }
    if (!ok) return false;
  }
  return true;
}

const VERDICTS = ['confirmed', 'number_mismatch', 'baseline_swapped', 'conditions_mismatch', 'outside_conditions', 'unclear'];
const VERDICT_KEYS = new Set(['item', 'verdict', 'field', 'offset', 'schema_version']);

function verdictValid(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  if (typeof v.item !== 'string' || !VERDICTS.includes(v.verdict)) return false;
  for (const k of Object.keys(v)) if (!VERDICT_KEYS.has(k)) return false;
  if (v.field !== undefined && typeof v.field !== 'string') return false;
  if (v.offset !== undefined && !Number.isInteger(v.offset)) return false;
  return true;
}

/**
 * checkerVerdicts(parsed[], itemIds) -> {verdicts: {item: verdict string}, reasons: {item: slug},
 * details: {item: verdict object}, duplicates, unknown_items}. Elements may be parseTranscript
 * results, structured entries {data}, results {verdicts: [...]} or bare verdicts. Invalid or
 * off-enum: unclear (verdict-off-enum); missing: unclear (verdict-missing); two different verdicts:
 * unclear (verdict-conflict); an equal repeat counts in duplicates.
 */
export function checkerVerdicts(parsed, itemIds) {
  const ids = Array.from(itemIds || [], String);
  const known = new Set(ids);
  const flat = [];
  const visit = (x, depth) => {
    if (depth > 4 || x === null || x === undefined) return;
    if (Array.isArray(x)) {
      for (const y of x) visit(y, depth + 1);
      return;
    }
    if (typeof x !== 'object') return;
    if (Array.isArray(x.structured) && !('item' in x)) {
      for (const s of x.structured) visit(s && typeof s === 'object' && 'data' in s ? s.data : s, depth + 1);
      return;
    }
    if (Array.isArray(x.verdicts) && !('item' in x)) {
      for (const v of x.verdicts) flat.push(v);
      return;
    }
    if ('data' in x && !('item' in x) && !('verdict' in x)) {
      visit(x.data, depth + 1);
      return;
    }
    flat.push(x);
  };
  visit(parsed, 0);
  const verdicts = {};
  const reasons = {};
  const details = {};
  let duplicates = 0;
  const unknown = new Set();
  const seen = new Map(); // item -> canonical of the first verdict
  for (const v of flat) {
    const item = v && typeof v === 'object' && typeof v.item === 'string' ? v.item : null;
    if (item === null) continue;
    if (!known.has(item)) {
      unknown.add(item);
      continue;
    }
    if (!verdictValid(v)) {
      if (reasons[item] !== 'verdict-conflict') {
        verdicts[item] = 'unclear';
        reasons[item] = 'verdict-off-enum';
        details[item] = { item, verdict: 'unclear' };
      }
      seen.set(item, seen.get(item) ?? 'invalid');
      continue;
    }
    const c = safeCanon({ item: v.item, verdict: v.verdict, field: v.field ?? null, offset: v.offset ?? null });
    if (seen.has(item)) {
      if (seen.get(item) === c) {
        duplicates++;
        continue;
      }
      verdicts[item] = 'unclear';
      reasons[item] = 'verdict-conflict';
      details[item] = { item, verdict: 'unclear' };
      continue;
    }
    seen.set(item, c);
    verdicts[item] = v.verdict;
    details[item] = { ...v };
  }
  for (const id of ids) {
    if (!Object.prototype.hasOwnProperty.call(verdicts, id)) {
      verdicts[id] = 'unclear';
      reasons[id] = 'verdict-missing';
      details[id] = { item: id, verdict: 'unclear' };
    }
  }
  // The contract's four keys; `details` (the verdict objects) and `unknown_ids` ride along hidden.
  const out = { verdicts, reasons, duplicates, unknown_items: unknown.size };
  hidden(out, 'details', details);
  hidden(out, 'unknown_ids', [...unknown].sort());
  return out;
}

/** sha256hex(canonicalize(readSet)) (section 3.16). */
export function readSetSha(readSet) {
  return sha256hex(canonicalize(readSet));
}
