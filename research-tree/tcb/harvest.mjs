// harvest.mjs: copy readers' schema-checked results from transcripts into staging/harvested/
// (CONTRACT §5 unit U2a; spec/harvest.mjs.md; design rules R15, R32, R13).
//
//   node tcb/scripts/harvest.mjs --root <abs> --ce <n> --task <id> --epoch <e> [--now <iso>] [--dry-run]
//
// Each card is checked against tcb's card schema exactly as found (nothing added, dropped, trimmed or
// coerced) and written as canonical bytes to `wt/<task>-e<e>/staging/harvested/<c_id>.card.json` by
// exclusive create. A result that does not validate is counted, never repaired. No ledger line except the
// §1.4 tamper `incident` on an exit 3.

import fs from 'node:fs';
import path from 'node:path';
import * as lib from './lib.mjs';

const SCRIPT = 'harvest';
const TASK_RE = /^(?!(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:$|\.))[a-z][a-z0-9-]{1,39}$/;
const CUT_CHARS = 2000; // CONTRACT §4.8: a tool result's `text` is its first 2,000 characters
const NO_INCIDENT = new Set(['run-from-attempt', 'ledger-broken']);

const ARGS = {
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    task: { type: 'string', required: true },
    epoch: { type: 'int', required: true },
    now: { type: 'string' },
    'free-mb': { type: 'int' },
    boot: { type: 'string' },
    'dry-run': { type: 'bool' },
  },
};

function tcbError(code, exit, detail) {
  if (typeof lib.TcbError === 'function') return new lib.TcbError(code, exit, detail);
  const e = new Error(code);
  e.code = code;
  e.exit = exit;
  e.detail = detail;
  return e;
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const toPosix = (p) => String(p).replace(/\\/g, '/');
const say = (msg) => process.stderr.write(`harvest: ${msg}\n`);

function layout(root) {
  const L = lib.paths(root) || {};
  return {
    attempt(task, e) {
      if (typeof L.attempt === 'function') {
        const p = L.attempt(task, e);
        if (typeof p === 'string') return p;
      }
      return path.join(root, 'wt', `${task}-e${e}`);
    },
  };
}

function getOr(T, name, dflt) {
  try {
    const v = T.get(name);
    return v === null || v === undefined ? dflt : v;
  } catch (e) {
    if (e && e.code === 'param-missing') return dflt;
    throw e;
  }
}

// A candidate is a bare card or a [reader-result]; anything else is `unparseable` (spec "Candidates").
function cardsOf(value) {
  if (!isObj(value)) return null;
  if (value.kind === 'card') return [value];
  if (Array.isArray(value.cards) && value.schema_version === 1) return value.cards;
  return null;
}

function errorsOf(e) {
  const d = e && e.detail;
  if (Array.isArray(d)) return d;
  if (isObj(d) && Array.isArray(d.errors)) return d.errors;
  return [{ code: e && e.code, detail: d ?? null }];
}

async function main(ctx) {
  const { flags } = lib.parseArgs(process.argv.slice(2), ARGS);
  const { root, ce, task, epoch } = flags;
  const dry = !!flags['dry-run'];
  if (!path.isAbsolute(root)) throw tcbError('usage', 66, { flag: 'root', why: 'not absolute' });
  if (!TASK_RE.test(task)) throw tcbError('usage', 66, { flag: 'task' });
  if (!(Number.isInteger(epoch) && epoch >= 1)) throw tcbError('usage', 66, { flag: 'epoch' });
  if (!(Number.isInteger(ce) && ce >= 1)) throw tcbError('usage', 66, { flag: 'ce' });
  ctx.mode = null;
  ctx.dryRun = dry;
  ctx.dry_run = dry;

  const facts = lib.edgeFacts(flags);
  const now = facts.now;
  const T = lib.thresholds(root);
  const L = layout(root);
  const transcriptsRoot = T.get('transcripts_root');

  // Step 1: find S without the lock.
  const table0 = await lib.readTasks(root);
  const row0 = (table0.tasks || []).find((r) => r.task === task);
  if (!row0) throw tcbError('no-task', 1, { task });
  let S = null;
  try {
    S = (await lib.attemptOf(row0, epoch)).session || null;
  } catch (e) {
    if (!(e && e.code === 'no-attempt')) throw e;
  }
  if (!S) throw tcbError('no-session', 2, { task, epoch });
  const st = await lib.sessionTranscripts(transcriptsRoot, S);
  const mainT = (st && st.main) || null;
  const helpers = (st && st.helpers) || [];
  if (!mainT && !helpers.length) throw tcbError('transcript-missing', 2, { session: S });

  // Step 2: parse every transcript (outside the lock; transcripts are append-only).
  const rel = (abs) => {
    try {
      return lib.relPosix(transcriptsRoot, abs);
    } catch {
      return toPosix(abs);
    }
  };
  let badLines = 0;
  const raw = []; // {source: {file, line}, value} or {source, text} (an Agent result's text)
  const parseOne = async (abs) => {
    const p = await lib.parseTranscript(abs);
    badLines += Array.isArray(p.badLines) ? p.badLines.length : Number(p.badLines) || 0;
    return p;
  };
  for (const h of helpers) {
    const p = await parseOne(h);
    for (const s of p.structured || []) raw.push({ source: { file: rel(h), line: s.line ?? null }, value: s.data, parsed: true });
  }
  if (mainT) {
    const p = await parseOne(mainT);
    for (const s of p.structured || []) raw.push({ source: { file: rel(mainT), line: s.line ?? null }, value: s.data, parsed: true });
    const agentIds = new Set(
      (p.toolUses || []).filter((u) => u.name === 'Agent' || u.name === 'Task').map((u) => u.id),
    );
    for (const r of p.toolResults || []) {
      if (!agentIds.has(r.toolUseId)) continue;
      raw.push({ source: { file: rel(mainT), line: r.line ?? null }, text: typeof r.text === 'string' ? r.text : '' });
    }
  }

  // Step 3: candidates, validation (exactly as found), dedupe by id.
  let candidates = 0;
  let unparseable = 0;
  const invalid = [];
  const cards = new Map(); // c_id -> canonical bytes
  for (const c of raw) {
    let value = c.value;
    if (!c.parsed) {
      try {
        value = JSON.parse(c.text);
      } catch {
        // A cut text (exactly the parser's 2,000 characters) is read from the helper's own transcript
        // instead (CONTRACT §4.8), so it is no candidate here.
        if (c.text.length >= CUT_CHARS) continue;
        candidates++;
        unparseable++;
        continue;
      }
    }
    candidates++;
    const list = cardsOf(value);
    if (!list) {
      unparseable++;
      continue;
    }
    for (const card of list) {
      try {
        await lib.checkFormat(root, 'card', card);
      } catch (e) {
        if (e && (e.code === 'schema-version' || e.code === 'schema-invalid')) {
          invalid.push({ source: c.source, errors: errorsOf(e) });
          continue;
        }
        throw e;
      }
      const id = lib.objectId('c', card);
      if (!cards.has(id)) cards.set(id, lib.canonicalize(card));
    }
  }

  const ids = [...cards.keys()].sort();
  const lockOpts = {
    script: SCRIPT,
    ce,
    now,
    proc: dry ? null : lib.realProc({ exe: getOr(T, 'proc_exe', undefined) }),
    retries: getOr(T, 'lock_retries', 300),
  };

  const body = async (handle) => {
    // Step 4.
    const table = await lib.readTasks(root);
    const row = (table.tasks || []).find((r) => r.task === task);
    if (!row) throw tcbError('no-task', 1, { task });
    if (row.epoch !== epoch) throw tcbError('stale-epoch', 65, { epoch_seen: epoch, row_epoch: row.epoch });
    if (row.state !== 'active' || !['started', 'bound'].includes(row.step)) {
      throw tcbError('wrong-step', 65, { state: row.state, step: row.step });
    }

    // Step 5: the folder must be the attempt's own, with no link inside.
    const attemptDir = L.attempt(task, epoch);
    const stagingDir = path.join(attemptDir, 'staging');
    const dir = path.join(stagingDir, 'harvested');
    const linkOrOut = async (p) => {
      let s;
      try {
        s = fs.lstatSync(p);
      } catch {
        return false; // absent
      }
      return s.isSymbolicLink() || !(await lib.isUnder(p, attemptDir));
    };
    if (fs.existsSync(attemptDir) && !(await lib.isUnder(attemptDir, path.join(root, 'wt')))) {
      throw tcbError('untrusted-path', 3, { path: 'attempt' });
    }
    if ((await linkOrOut(stagingDir)) || (await linkOrOut(dir))) throw tcbError('untrusted-path', 3, { path: 'staging/harvested' });
    if (!dry && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      if (await linkOrOut(dir)) throw tcbError('untrusted-path', 3, { path: 'staging/harvested' });
    }
    const foreign = [];
    const existing = new Map(); // name -> bytes
    if (fs.existsSync(dir)) {
      const walked = await lib.walkFiles(dir);
      if ((walked.links || []).length) throw tcbError('untrusted-path', 3, { links: walked.links.map(toPosix) });
      for (const f of walked.files || []) {
        const name = toPosix(f);
        const bytes = fs.readFileSync(path.join(dir, ...name.split('/')), 'utf8');
        existing.set(name, bytes);
        let own = false;
        try {
          const v = JSON.parse(bytes);
          own = !name.includes('/') && name === `${lib.objectId('c', v)}.card.json` && lib.canonicalize(v) === bytes;
        } catch {
          own = false;
        }
        if (!own) foreign.push(name);
      }
    }
    foreign.sort();

    // Step 6: exclusive create; a different file under a content-hash name is a foreign write.
    const differs = ids.filter((id) => existing.has(`${id}.card.json`) && existing.get(`${id}.card.json`) !== cards.get(id));
    if (differs.length) throw tcbError('harvested-differs', 3, { ids: differs });
    const written = [];
    let already = 0;
    for (const id of ids) {
      const file = path.join(dir, `${id}.card.json`);
      if (dry) {
        if (existing.has(`${id}.card.json`)) already++;
        else written.push(id);
        continue;
      }
      let r;
      try {
        r = await lib.createExclusive(file, cards.get(id));
      } catch (e) {
        if (e && e.code === 'exists-different') throw tcbError('harvested-differs', 3, { ids: [id] });
        throw e;
      }
      if (r === 'created') written.push(id);
      else already++;
    }

    const result = {
      session: S,
      transcripts: (mainT ? 1 : 0) + helpers.length,
      candidates,
      written,
      already,
      invalid,
      unparseable,
      bad_lines: badLines,
      foreign,
    };
    const bad = invalid.length + unparseable;
    if (bad) {
      say(`${invalid.length} invalid and ${unparseable} unparseable candidate(s); valid cards were written`);
      return { exit: 1, result, reasons: [{ code: 'some-invalid', detail: { invalid: invalid.length, unparseable } }] };
    }
    return { exit: 0, result, reasons: [] };
  };

  const withTamperRecord = async (handle) => {
    try {
      return await body(handle);
    } catch (e) {
      if (e && e.exit === 3 && handle && !NO_INCIDENT.has(e.code)) {
        try {
          await lib.recordIncident(root, handle, {
            ctx,
            ce,
            cls: 'refusal',
            detail: { tamper: true, script: SCRIPT, code: e.code },
            task,
            epoch,
            now,
          });
        } catch {
          /* the ledger tail does not verify: no line (CONTRACT §1.4) */
        }
      }
      if (e && e.exit === 3) say(`tamper: ${e.code}`);
      throw e;
    }
  };

  let out;
  if (dry) {
    await lib.checkCe(root, ce);
    out = await body(null);
  } else {
    out = await lib.withRunLock(root, lockOpts, withTamperRecord);
  }
  return { ...out, mode: null, dry_run: dry, dryRun: dry };
}

lib.runMain(import.meta.url, SCRIPT, main);
