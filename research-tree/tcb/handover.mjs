// handover.mjs (unit U1b): coordinator epochs (R12, R28).
//   init  --root R --tcb-commit SHA40 [--session SID] [--now ISO] [--dry-run]
//   raise --root R --ce N [--now ISO] [--dry-run]
//   bind  --root R --ce N --nonce X [--now ISO] [--dry-run]   (FX-CGATE: the hook names the session)
// Source of truth: CONTRACT.md (sections 1-6, decisions 4, 5, 21, 29) and spec/handover.mjs.md.
// Starts, kills and messages nothing (CONTRACT section 6, decision 29). Process facts are taken
// before the run lock (CONTRACT section 2.1).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lib from './lib.mjs';

const SCRIPT = 'handover';
const SHA40 = /^[0-9a-f]{40}$/;
const SESSION = /^[0-9a-f-]{36}$/;
// FX-CGATE: a CLI session id (a lowercase UUID, F-P1b) and the successor's bind nonce.
const SESSION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NONCE = /^[0-9a-f]{32}$/;

// Folders of CONTRACT section 2 that init creates when missing (`tcb/` is the owner's).
const RUN_DIRS = [
  'plan', 'plan/questions', 'plan/protocols', 'plan/plant-candidates', 'plan/our-work', 'plan/notes',
  'plan/frozen',
  'run', 'run/intents', 'run/audit', 'run/stop-sample', 'run/close', 'run/close/intent', 'run/close/done',
  'store', 'store/objects', 'store/commits', 'store/status',
  'views', 'views/blind',
  'queue', 'review-in',
  'completeness', 'completeness/model',
  'sealed', 'sealed/heldout', 'sealed/seeds', 'sealed/plants', 'sealed/blind',
  '.snapshots', '.snapshots/raw', '.snapshots/text', '.snapshots/meta', '.snapshots/by-url',
  'wt',
];
const GITIGNORE_LINES = [
  'wt/', '.snapshots/', 'sealed/', 'tmp/', 'run/*.lock', 'run/alarm.json', 'run/watcher.json',
  'run/arm/', 'run/*.stale', 'run/*.orphan', '*.tmp',
];
const GITATTRIBUTES = '* -text\n';

// Run-root files this script reads or writes (relative to the root).
const F = {
  coord: 'run/coord.json',
  tasks: 'run/tasks.json',
  tasksPrev: 'run/tasks.json.prev',
  watcherJson: 'run/watcher.json',
  watcherLock: 'run/watcher.lock',
  alarm: 'run/alarm.json',
};

const FLAGS = {
  root: { type: 'string', required: true },
  ce: { type: 'int', required: ['raise', 'bind'] },
  'tcb-commit': { type: 'string', required: ['init'] },
  session: { type: 'string' },
  nonce: { type: 'string', required: ['bind'] },
  now: { type: 'string' },
  'free-mb': { type: 'int' },
  boot: { type: 'string' },
  'dry-run': { type: 'bool' },
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

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function exists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

// A run/ state file: absent -> null, unparseable -> 67 (table-corrupt).
function readState(p, name) {
  try {
    return lib.readJson(p);
  } catch (e) {
    if (e && e.code === 'missing') return null;
    if (e && e.code === 'unparseable') throw err('table-corrupt', 67, { file: name, detail: e.detail ?? null });
    throw e;
  }
}

// A record that is only reported (lock records, alarm): unreadable -> null.
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
  const o = { script: SCRIPT, proc, now, retries: th.get('lock_retries') };
  if (ce !== undefined && ce !== null) o.ce = ce;
  return o;
}

// proc.alive semantics over one list taken before the lock: same pid and a listed start time accepted by lib.aliveFromQuery.
function aliveIn(procList, rec) {
  if (!rec || rec.pid === undefined || rec.pid === null) return false;
  if (!Array.isArray(procList)) return null;
  // One-sided, as lib.aliveFromQuery (lib-fix LR-2): the listed start may lie before the recorded one
  // (a record's own clock reads later than the OS creation time), never more than the tolerance after it.
  return procList.some((p) => Number(p.pid) === Number(rec.pid) && typeof rec.start_time === 'string' && typeof p.start_time === 'string' && lib.aliveFromQuery(p.start_time, rec.start_time) === true);
}

// ---------------------------------------------------------------- init

async function doInit(ctx, root, flags, dry) {
  const commit = flags['tcb-commit'];
  if (typeof commit !== 'string' || !SHA40.test(commit)) throw err('usage', 66, { flag: 'tcb-commit', expect: '40 lowercase hex' });
  if (flags.session !== undefined && (typeof flags.session !== 'string' || !SESSION.test(flags.session))) {
    throw err('usage', 66, { flag: 'session', expect: '[0-9a-f-]{36}' });
  }
  if (flags.ce !== undefined) throw err('usage', 66, { flag: 'ce', expect: 'init takes no --ce' });

  // Step 1: the root exists and holds tcb/.
  if (!isDir(root) || !isDir(path.join(root, 'tcb'))) {
    throw err('missing', 2, { path: isDir(root) ? path.join(root, 'tcb') : root });
  }
  const reasons = [];
  if (root.length > 40) reasons.push({ code: 'root-long', detail: { length: root.length } });

  const th = lib.thresholds(root);
  const facts = lib.edgeFacts(flags);
  const nowIso = isoOf(facts.now);

  // Step 2: folders, .gitignore, .gitattributes (each only when missing).
  const missingDirs = RUN_DIRS.filter((d) => !isDir(path.join(root, ...d.split('/'))));
  const gitignorePath = path.join(root, '.gitignore');
  const gitattrPath = path.join(root, '.gitattributes');
  const result = {
    root,
    created_dirs: missingDirs,
    gitignore: exists(gitignorePath) ? 'kept' : 'created',
    gitattributes: exists(gitattrPath) ? 'kept' : 'created',
    tasks: exists(fileOf(root, 'tasks')) || exists(fileOf(root, 'tasksPrev')) ? 'kept' : 'created',
    coord: null,
  };

  if (dry) {
    const coord = readState(fileOf(root, 'coord'), 'coord.json');
    if (!coord) {
      result.coord = 'created';
      result.would_write = { schema_version: 1, ce: 1, session: flags.session ?? null, started_at: nowIso, tcb_commit: commit };
      return { exit: 0, result, reasons };
    }
    if (coord.tcb_commit === commit) {
      result.coord = 'identical';
      return { exit: 0, result, reasons };
    }
    result.coord = 'exists';
    return { exit: 1, result, reasons: [{ code: 'coord-exists', detail: { tcb_commit: coord.tcb_commit ?? null } }, ...reasons] };
  }

  for (const d of missingDirs) fs.mkdirSync(path.join(root, ...d.split('/')), { recursive: true });
  createIfAbsent(gitignorePath, GITIGNORE_LINES.join('\n') + '\n');
  createIfAbsent(gitattrPath, GITATTRIBUTES);

  // Step 3: under the run lock (no ce: init creates the first one).
  const proc = lib.realProc({ exe: th.get('proc_exe') });
  let outcome = null;
  await lib.withRunLock(root, lockOpts(th, undefined, proc, facts.now), async (handle) => {
    const coord = readState(fileOf(root, 'coord'), 'coord.json');
    if (coord && coord.tcb_commit !== commit) {
      outcome = { exit: 1, code: 'coord-exists', detail: { tcb_commit: coord.tcb_commit ?? null } };
      return;
    }
    if (!exists(fileOf(root, 'tasks')) && !exists(fileOf(root, 'tasksPrev'))) {
      await writeEmptyTable(root, handle);
      result.tasks = 'created';
    } else {
      result.tasks = 'kept';
    }
    if (coord) {
      result.coord = 'identical';
      outcome = { exit: 0 };
      return;
    }
    const nonce = newNonce();
    const value = { schema_version: 1, ce: 1, session: flags.session ?? null, started_at: nowIso, tcb_commit: commit, successor_nonce: nonce };
    // The ledger line first: a broken ledger refuses before coord.json exists.
    await lib.appendLedger(root, handle, { ctx, ce: 1, kind: 'coord-init', data: { tcb_commit: commit }, now: facts.now });
    handle.assertHeld();
    lib.writeAtomic(fileOf(root, 'coord'), serialize(value));
    result.coord = 'created';
    result.brief = briefLine(flags.root, 1, commit, nonce);
    outcome = { exit: 0 };
  });

  if (outcome.exit !== 0) {
    result.coord = 'exists';
    return { exit: outcome.exit, result, reasons: [{ code: outcome.code, detail: outcome.detail }, ...reasons] };
  }
  return { exit: 0, result, reasons };
}

function createIfAbsent(p, text) {
  if (exists(p)) return 'kept';
  try {
    return lib.createExclusive(p, text);
  } catch (e) {
    if (e && e.code === 'exists-different') return 'kept'; // never rewritten
    throw e;
  }
}

// The empty task table through lib.writeTasks (CONTRACT section 2.1). The contract does not say
// which expectRev stands for "no file yet"; null is tried first, then -1 (see the return notes).
async function writeEmptyTable(root, handle) {
  const table = { schema_version: 1, rev: 0, tasks: [] };
  try {
    return await lib.writeTasks(root, handle, table, { expectRev: null });
  } catch (e) {
    if (e && e.exit === 65) return await lib.writeTasks(root, handle, table, { expectRev: -1 });
    throw e;
  }
}

// ---------------------------------------------------------------- raise

// Exported for one test seam (review U1-F8): `hooks.beforeLock` runs after the read-only pre-checks
// and before the run lock is taken, so a test can move a row between the two and reach the in-lock
// re-check. The command line never passes hooks.
export async function doRaise(ctx, root, flags, dry, hooks = {}) {
  const N = flags.ce;
  if (!Number.isInteger(N) || N < 1) throw err('usage', 66, { flag: 'ce' });
  if (flags.session !== undefined || flags['tcb-commit'] !== undefined) throw err('usage', 66, { expect: 'raise takes --ce only' });

  // Step 1: read-only pre-checks.
  lib.checkCe(root, N);
  const th = lib.thresholds(root);
  const facts = lib.edgeFacts(flags);
  const nowIso = isoOf(facts.now);
  const tr = th.get('transcripts_root');
  const proc = lib.realProc({ exe: th.get('proc_exe') });

  const { lines } = lib.readLedger(root);
  if (!lib.runFlags(lines, N).draining) {
    return refuse(ctx, root, th, proc, facts, dry, N, 6, 'no-drain', { ce: N });
  }
  const table = lib.readTasks(root);
  let procList;
  try {
    procList = await proc.list();
  } catch (e) {
    throw err('proc-unavailable', 2, { detail: e && e.message ? e.message : null });
  }
  if (!Array.isArray(procList)) throw err('proc-unavailable', 2, null);
  const slots = await lib.slotCount(table.tasks, procList, tr, { root });
  const counts = { live: slots.live ?? 0, unknown: slots.unknown ?? 0, unconfirmed: slots.unconfirmed ?? 0 };
  if (counts.live + counts.unknown + counts.unconfirmed > 0) {
    return refuse(ctx, root, th, proc, facts, dry, N, 6, 'not-quiescent', counts);
  }

  // Step 2: wake sources of the old ce, reported and never touched.
  const stale = [];
  const seen = new Set();
  const wjson = readLoose(fileOf(root, 'watcherJson'));
  const wlock = readLoose(fileOf(root, 'watcherLock'));
  const alarm = readLoose(fileOf(root, 'alarm'));
  for (const [which, rec] of [['watcher', wlock], ['watcher', wjson], ['alarm', alarm]]) {
    if (!rec || rec.pid === undefined) continue;
    const id = `${which}|${rec.pid}|${rec.start_time}`;
    if (seen.has(id)) continue;
    if ((await aliveIn(procList, rec)) === true) {
      seen.add(id);
      stale.push({ which, pid: rec.pid, start_time: rec.start_time ?? null });
    }
  }

  const coord0 = readState(fileOf(root, 'coord'), 'coord.json');
  const tcbCommit = coord0 ? coord0.tcb_commit : null;
  const to = N + 1;
  const result = {
    from: N,
    to,
    stale_wake_sources: stale,
    brief: briefLine(flags.root, to, tcbCommit),
  };
  if (dry) return { exit: 0, result };
  if (hooks && typeof hooks.beforeLock === 'function') await hooks.beforeLock();

  // Step 3: under the run lock of ce N (withRunLock re-checks ce first).
  let refusal = null;
  await lib.withRunLock(root, lockOpts(th, N, proc, facts.now), async (handle) => {
    const ledger = lib.readLedger(root);
    if (!lib.runFlags(ledger.lines, N).draining) {
      refusal = { code: 'no-drain', detail: { ce: N } };
    } else {
      const t = lib.readTasks(root);
      const moved = [];
      for (const row of t.tasks) {
        if (!['admitted', 'started', 'bound'].includes(row.step)) continue;
        let stop = null;
        try {
          stop = lib.attemptOf(row, row.epoch).stop;
        } catch {
          stop = null;
        }
        if (stop !== 'confirmed') moved.push(row.task);
      }
      if (moved.length) refusal = { code: 'not-quiescent', detail: { live: 0, unknown: moved.length, unconfirmed: 0, tasks: moved } };
    }
    if (refusal) {
      await lib.recordIncident(root, handle, {
        ctx, ce: N, cls: 'refusal', detail: { script: SCRIPT, code: refusal.code, ...refusal.detail }, now: facts.now,
      });
      return;
    }
    const coord = readState(fileOf(root, 'coord'), 'coord.json');
    const nonce = newNonce();
    const value = { schema_version: coord.schema_version ?? 1, ce: to, session: null, started_at: nowIso, tcb_commit: coord.tcb_commit, successor_nonce: nonce };
    result.brief = briefLine(flags.root, to, coord.tcb_commit, nonce);
    await lib.appendLedger(root, handle, { ctx, ce: N, kind: 'ce-raise', data: { from: N, to }, now: facts.now });
    handle.assertHeld();
    lib.writeAtomic(fileOf(root, 'coord'), serialize(value));
  });
  if (refusal) return { exit: 6, result: { from: N, to: N }, reasons: [{ code: refusal.code, detail: refusal.detail }] };
  return { exit: 0, result };
}

// The successor runs the sibling status.mjs, found beside this file (import.meta.url); in the
// flat layout that is <root>/tcb/status.mjs, as the spec's brief reads.
// Round 3 (S0.5): `nonce` and the two parts appended to the line, each empty until its fix fills it.
function briefLine(root, ce, tcbCommit, nonce = null) {
  const status = path.join(path.dirname(fileURLToPath(import.meta.url)), 'status.mjs').replace(/\\/g, '/');
  return `Coordinator ce ${ce} for run ${root}, tcb ${tcbCommit}: run node ${status} --root ${root} --ce ${ce} and act on run/status.json.`
    + briefNoncePart(nonce, root, ce) + briefPathPart(root);
}

// FX-CGATE step 1: the successor's bind nonce (`handover.mjs bind --ce <ce> --nonce <X>`) in the brief line.
// The command is in the guard hook's tcb-node grammar (forward slashes; a path with a blank quoted), so
// the successor's first call passes the hook's bind step (FX-CGATE step 2). No nonce (a dry run): ''.
function briefNoncePart(nonce, root, ce) {
  if (typeof nonce !== 'string' || !NONCE.test(nonce)) return '';
  const q = (s) => {
    const f = String(s).replace(/\\/g, '/');
    return /\s/.test(f) ? `"${f}"` : f;
  };
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'handover.mjs');
  return ` Before any other call: node ${q(script)} bind --root ${q(root)} --ce ${ce} --nonce ${nonce}.`;
}

// A fresh bind nonce: 16 random bytes in hex.
function newNonce() {
  return crypto.randomBytes(16).toString('hex');
}

// FX-W3: the path of the coordinator's brief, tcb/briefs/coordinator.md, in the brief line (FIX-JOIN 2c).
function briefPathPart(root) { // eslint-disable-line no-unused-vars
  return '';
}

// A refusal (exit 6) of raise: one `incident` line under the lock, unless dry-run.
async function refuse(ctx, root, th, proc, facts, dry, N, exit, code, detail) {
  if (!dry) {
    await lib.withRunLock(root, lockOpts(th, N, proc, facts.now), async (handle) => {
      await lib.recordIncident(root, handle, {
        ctx, ce: N, cls: 'refusal', detail: { script: SCRIPT, code, ...detail }, now: facts.now,
      });
    });
  }
  return { exit, result: { from: N, to: N }, reasons: [{ code, detail }] };
}

// ---------------------------------------------------------------- bind

// FX-CGATE step 1 (FIX-fence 3): the successor names no session. Its first call, `bind --ce N --nonce X`,
// passes the guard hook's bind step, which strict-creates run/coord-session-<N>.json naming the caller;
// bind then checks X against coord.json's successor_nonce and copies that session into coord.json,
// clearing the nonce. No nonce left: exit 0 when coord.json already names the session file's session
// (a repeat), else no-nonce; a wrong nonce is nonce-mismatch and a missing or invalid session file
// not-bound, each with an incident line.
async function doBind(ctx, root, flags, dry) {
  const N = flags.ce;
  const nonce = flags.nonce;
  if (!Number.isInteger(N) || N < 1) throw err('usage', 66, { flag: 'ce' });
  if (flags.session !== undefined) throw err('usage', 66, { flag: 'session', expect: 'bind takes --nonce; the guard hook names the session' });
  if (typeof nonce !== 'string' || !NONCE.test(nonce)) throw err('usage', 66, { flag: 'nonce', expect: '32 lowercase hex' });
  if (flags['tcb-commit'] !== undefined) throw err('usage', 66, { flag: 'tcb-commit', expect: 'bind takes no --tcb-commit' });

  lib.checkCe(root, N);
  const th = lib.thresholds(root);
  const facts = lib.edgeFacts(flags);
  const sessionFile = lib.paths(root).coordSession(N);

  const decide = (coord) => {
    const bound = boundSessionOf(sessionFile);
    const want = coord.successor_nonce;
    if (want === undefined || want === null) {
      if (bound !== null && coord.session === bound) return { exit: 0, change: false, session: bound };
      return { exit: 1, change: false, session: coord.session ?? null, code: 'no-nonce', detail: { session: coord.session ?? null } };
    }
    if (want !== nonce) return { exit: 1, change: false, session: null, code: 'nonce-mismatch', detail: { ce: N }, incident: true };
    if (bound === null) return { exit: 1, change: false, session: null, code: 'not-bound', detail: { file: `run/coord-session-${N}.json` }, incident: true };
    return { exit: 0, change: true, session: bound };
  };
  const out = (d) => ({
    exit: d.exit,
    result: { ce: N, session: d.session, changed: d.change },
    reasons: d.code ? [{ code: d.code, detail: d.detail }] : [],
  });

  if (dry) {
    const coord = readState(fileOf(root, 'coord'), 'coord.json');
    if (!coord) throw err('no-coordinator', 2, null);
    return out(decide(coord));
  }

  const proc = lib.realProc({ exe: th.get('proc_exe') });
  let d = null;
  await lib.withRunLock(root, lockOpts(th, N, proc, facts.now), async (handle) => {
    const coord = readState(fileOf(root, 'coord'), 'coord.json');
    if (!coord) throw err('no-coordinator', 2, null);
    d = decide(coord);
    if (d.incident) {
      await lib.recordIncident(root, handle, {
        ctx, ce: N, cls: 'refusal', detail: { script: SCRIPT, code: d.code, ...d.detail }, now: facts.now,
      });
    }
    if (!d.change) return;
    await lib.appendLedger(root, handle, { ctx, ce: N, kind: 'coord-bind', data: { session: d.session }, now: facts.now });
    handle.assertHeld();
    const { successor_nonce: _used, ...rest } = coord; // eslint-disable-line no-unused-vars
    lib.writeAtomic(fileOf(root, 'coord'), serialize({ ...rest, session: d.session }));
  });
  return out(d);
}

// The session a run/coord-session-<ce>.json names, or null when it is missing or invalid.
function boundSessionOf(file) {
  let v;
  try {
    v = lib.readJson(file);
  } catch {
    return null;
  }
  return v && typeof v === 'object' && typeof v.session_id === 'string' && SESSION_UUID.test(v.session_id) ? v.session_id : null;
}

// ---------------------------------------------------------------- main

async function main(ctx) {
  const { mode, flags } = lib.parseArgs(process.argv.slice(2), { modes: ['init', 'raise', 'bind'], flags: FLAGS });
  const dry = flags['dry-run'] === true;
  ctx.mode = mode ?? null;
  ctx.dryRun = dry;
  if (!mode) throw err('usage', 66, { expect: 'init|raise|bind' });
  if (typeof flags.root !== 'string' || !path.isAbsolute(flags.root)) throw err('usage', 66, { flag: 'root', expect: 'absolute path' });
  const root = path.resolve(flags.root);

  let out;
  if (mode === 'init') out = await doInit(ctx, root, flags, dry);
  else if (mode === 'raise') out = await doRaise(ctx, root, flags, dry);
  else out = await doBind(ctx, root, flags, dry);
  return { mode, dry_run: dry, reasons: [], ...out };
}

// Run only as a script, so that a test can import doRaise without starting main.
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
