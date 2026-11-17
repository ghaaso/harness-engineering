// promote.mjs - the only writer of card status (unit U2b; spec/promote.mjs.md, CONTRACT §2.1, §3.14,
// §3.15, §3.17, §3.7 `promote`, decisions 9 and 11). Turns witness results into status lines, reads a
// checker's verdicts from the checker's own transcript, drops seeds, applies qualification, and
// reverts confirmations of a class that lost its qualification. The transcript is parsed before the
// run lock is taken; status lines are appended under it.
import fs from 'node:fs';
import path from 'node:path';
import * as lib from './lib.mjs';

const SCRIPT = 'promote';
const ARG_SPEC = {
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    from: { type: 'string' },
    batch: { type: 'string' },
    transcript: { type: 'string' },
    class: { type: 'string' },
    now: { type: 'string' },
    'dry-run': { type: 'bool' },
  },
};
const CLASSES = ['J1', 'J2', 'J3', 'J4'];
const CARD_CLASSES = ['J1', 'J2', 'J4'];
const BATCH_RE = /^b[0-9]+-[0-9]+$/;
const ITEM_RE = /^i_[0-9a-f]{16}$/;
const REJECTING = new Set(['number_mismatch', 'baseline_swapped', 'conditions_mismatch']);

const fail = (code, exit, detail) => new lib.TcbError(code, exit, detail);

function pathsOf(root) {
  return {
    objects: path.join(root, 'store', 'objects'),
    cardStatus: path.join(root, 'store', 'status', 'card_status.jsonl'),
    witness: path.join(root, 'store', 'witness.jsonl'),
    qualification: path.join(root, 'store', 'qualification.json'),
    coord: path.join(root, 'run', 'coord.json'),
    batchDir: (b) => path.join(root, 'queue', b),
    batchFile: (b) => path.join(root, 'queue', b, 'batch.json'),
    item: (b, id) => path.join(root, 'queue', b, `item-${id}.json`),
    seedKey: (b) => path.join(root, 'sealed', 'seeds', `${b}.json`),
  };
}

function isoNow(flags) {
  let now;
  try {
    now = lib.edgeFacts(flags).now;
  } catch {
    now = flags.now;
  }
  if (now == null) now = flags.now;
  if (now instanceof Date) return now.toISOString();
  if (typeof now === 'number') return new Date(now).toISOString();
  return String(now);
}

function lockRetries(th) {
  try {
    const v = th.get('lock_retries');
    return Number.isInteger(v) && v > 0 ? v : 300;
  } catch {
    return 300;
  }
}

// ---------------------------------------------------------------- shared reads

function readStatus(P) {
  if (!fs.existsSync(P.cardStatus)) return { records: [], last: new Map(), lastSeq: 0 };
  const r = lib.readJsonl(P.cardStatus);
  if (r.badLines && r.badLines.length) throw fail('status-unreadable', 2, { lines: r.badLines });
  const records = Array.isArray(r.records) ? r.records : [];
  const last = new Map();
  let lastSeq = 0;
  for (const rec of records) {
    if (!rec || typeof rec.card_id !== 'string') continue;
    last.set(rec.card_id, rec);
    if (Number.isInteger(rec.seq)) lastSeq = rec.seq;
  }
  return { records, last, lastSeq };
}

function storedCard(root, P, id) {
  if (typeof id !== 'string') throw fail('missing', 2, { card_id: id });
  if (id.startsWith('s_')) throw fail('seed-id', 3, { card_id: id });
  const value = lib.getObject(root, id); // missing 2, object-mismatch 3
  const sha = lib.sha256hex(fs.readFileSync(path.join(P.objects, `${id}.json`)));
  return { value, sha };
}

function readQualification(P) {
  if (!fs.existsSync(P.qualification)) return null;
  return lib.readJson(P.qualification);
}

function qualified(qual, cls) {
  return !!(qual && qual.classes && qual.classes[cls] && qual.classes[cls].qualified === true);
}

function stripVersion(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v;
  const { schema_version: _ignored, ...rest } = v;
  return rest;
}

// ---------------------------------------------------------------- planners (pure over files read)

// --from witness (spec steps 1-3). Returns the lines to append.
function planWitness(root, P, now) {
  const st = readStatus(P);
  let cursor = 0;
  for (const rec of st.records) if (Number.isInteger(rec.witness_seq) && rec.witness_seq > cursor) cursor = rec.witness_seq;
  let wrecs = [];
  if (fs.existsSync(P.witness)) wrecs = lib.readJsonl(P.witness).records || [];
  const latest = new Map();
  for (const w of wrecs) {
    if (!w || typeof w.card_id !== 'string' || !Number.isInteger(w.seq) || w.seq <= cursor) continue;
    const prev = latest.get(w.card_id);
    if (!prev || w.seq > prev.seq) latest.set(w.card_id, w);
  }
  const todo = [...latest.values()].sort((a, b) => a.seq - b.seq);
  // Every check before any line (nothing written in a run that finds a breach).
  const shas = new Map();
  for (const w of todo) {
    if (w.card_id.startsWith('s_')) throw fail('seed-id', 3, { card_id: w.card_id, witness_seq: w.seq });
    if (w.reason === 'card-changed') throw fail('card-changed', 3, { card_id: w.card_id, witness_seq: w.seq });
    const { sha } = storedCard(root, P, w.card_id);
    if (w.card_sha !== sha) throw fail('card-changed', 3, { card_id: w.card_id, witness_seq: w.seq });
    shas.set(w.card_id, sha);
  }
  const lines = [];
  let seq = st.lastSeq;
  for (const w of todo) {
    const cur = st.last.get(w.card_id);
    if (w.result === 'witnessed' && cur && cur.status === 'confirmed') continue; // the confirmation stands
    lines.push({
      schema_version: 1,
      seq: ++seq,
      card_id: w.card_id,
      card_sha: shas.get(w.card_id),
      status: w.result,
      reason: w.reason,
      witness_seq: w.seq,
      at: now,
    });
  }
  return { lines, skipped: [], seeds_dropped: 0, unclear: [], unknown_items: 0 };
}

// --batch --transcript (spec steps 5-7), given the verdicts read from the transcript beforehand.
function planChecker(root, P, now, { batch, batchJson, key, verdictOf }) {
  const st = readStatus(P);
  const qual = readQualification(P);
  const cardOk = CARD_CLASSES.every((c) => qualified(qual, c));
  const allOk = CLASSES.every((c) => qualified(qual, c));
  const cur = new Map(); // card -> current status (updated as lines are planned)
  for (const [id, rec] of st.last) cur.set(id, rec.status);
  const items = Array.isArray(batchJson.items) ? batchJson.items : [];
  const keyItems = key && key.items && typeof key.items === 'object' ? key.items : {};
  // Checks first: the key is complete, cards unchanged, no seed id outside the seed store.
  const planned = [];
  let seedsDropped = 0;
  for (const item of items) {
    const k = keyItems[item];
    if (!k || typeof k !== 'object') throw fail('no-key', 2, { item });
    if (k.seed === true) {
      seedsDropped += 1;
      continue;
    }
    if (typeof k.card_id !== 'string') throw fail('no-key', 2, { item });
    const qi = lib.readJson(P.item(batch, item));
    const isSentence = qi && qi.sentence != null;
    if (isSentence && typeof k.node !== 'string') throw fail('no-key', 2, { item, missing: 'node' });
    const { value, sha } = storedCard(root, P, k.card_id);
    if (!qi || lib.canonicalize(stripVersion(qi.card)) !== lib.canonicalize(stripVersion(value)))
      throw fail('card-changed', 3, { item, card_id: k.card_id });
    planned.push({ item, card: k.card_id, node: k.node, sha, isSentence });
  }
  const lines = [];
  const skipped = [];
  let seq = st.lastSeq;
  const push = (p, status, reason, check, classes) => {
    const line = { schema_version: 1, seq: ++seq, card_id: p.card, card_sha: p.sha, status, reason, check };
    if (classes) line.classes = classes;
    line.at = now;
    lines.push(line);
    cur.set(p.card, status);
  };
  for (const p of planned) {
    const verdict = verdictOf(p.item);
    const status = cur.get(p.card);
    if (p.isSentence) {
      if (!status) {
        skipped.push(p.card);
        continue;
      }
      const check = { batch, item: p.item, verdict, node: p.node };
      if (verdict === 'confirmed' && allOk) push(p, status, 'sentence-check', check, [...CLASSES]);
      else if (verdict === 'confirmed') push(p, status, 'sentence-unqualified', check);
      else push(p, status, 'sentence-check', check);
      continue;
    }
    const check = { batch, item: p.item, verdict };
    if (verdict === 'confirmed') {
      if (status !== 'witnessed') skipped.push(p.card);
      else if (cardOk) push(p, 'confirmed', 'checker-confirmed', check, [...CARD_CLASSES]);
      else push(p, 'witnessed', 'unqualified', check);
    } else if (REJECTING.has(verdict)) {
      push(p, 'rejected', verdict, check);
    } else if (status) {
      push(p, status, 'unclear', check); // outside_conditions, unclear
    } else {
      skipped.push(p.card);
    }
  }
  return { lines, skipped: [...new Set(skipped)].sort(), seeds_dropped: seedsDropped };
}

// revert --class (spec steps 1-2, CONTRACT §3.15). A card's last line need not be the confirmation:
// promote itself writes status-keeping lines after one (card-item `unclear`, sentence lines). So the
// card's own confirmation is read from its latest confirmed card-item check line (status `confirmed`,
// `check.verdict` confirmed, no `check.node`; the card being confirmed now), and a sentence clearing from any `sentence-check` line with verdict `confirmed`, each not yet
// reverted for the class by a later `unqualified-revert` line naming it. One revert line per card when
// either relies on the class; the status falls to `witnessed` only when the card's own confirmation
// relies on it (a sentence clearing alone keeps the current status, the line still reopens the
// clearing through lib.flagCleared).
function planRevert(P, now, cls) {
  const qual = readQualification(P);
  if (!qual) throw fail('no-qualification', 2, {});
  if (qualified(qual, cls)) throw fail('class-qualified', 1, { class: cls });
  const st = readStatus(P);
  const byCard = new Map();
  for (const rec of st.records) {
    if (!rec || typeof rec.card_id !== 'string') continue;
    if (!byCard.has(rec.card_id)) byCard.set(rec.card_id, []);
    byCard.get(rec.card_id).push(rec);
  }
  const names = (rec) => Array.isArray(rec.classes) && rec.classes.includes(cls);
  const revertedAfter = (recs, i) => recs.slice(i + 1).some((x) => x.reason === 'unqualified-revert' && names(x));
  const lines = [];
  let seq = st.lastSeq;
  for (const id of [...byCard.keys()].sort()) {
    const recs = byCard.get(id);
    const last = recs[recs.length - 1];
    let cardRelies = false;
    if (last.status === 'confirmed') {
      let ci = -1;
      for (let i = recs.length - 1; i >= 0; i--) {
        const r = recs[i];
        if (r.status === 'confirmed' && r.check && r.check.verdict === 'confirmed' && r.check.node == null && r.reason !== 'unqualified-revert') {
          ci = i;
          break;
        }
      }
      cardRelies = ci >= 0 && names(recs[ci]) && !revertedAfter(recs, ci);
    }
    let sentenceRelies = false;
    recs.forEach((r, i) => {
      if (r.reason === 'sentence-check' && r.check && r.check.verdict === 'confirmed' && names(r) && !revertedAfter(recs, i))
        sentenceRelies = true;
    });
    if (!cardRelies && !sentenceRelies) continue;
    lines.push({
      schema_version: 1,
      seq: ++seq,
      card_id: id,
      card_sha: last.card_sha,
      status: cardRelies ? 'witnessed' : last.status,
      reason: 'unqualified-revert',
      classes: [cls],
      at: now,
    });
  }
  return { lines, skipped: [], seeds_dropped: 0 };
}

// ---------------------------------------------------------------- the checker transcript

function transcriptPlace(transcript, transcriptsRoot, session) {
  if (!fs.existsSync(transcript)) throw fail('transcript-missing', 2, { transcript });
  let real;
  let realRoot;
  try {
    real = fs.realpathSync.native(transcript);
    realRoot = fs.realpathSync.native(transcriptsRoot);
  } catch {
    throw fail('transcript-outside', 1, { transcript });
  }
  if (!lib.isUnder(real, realRoot)) throw fail('transcript-outside', 1, { transcript });
  const rel = path.relative(realRoot, real);
  const segs = rel.split(/[\\/]+/).filter(Boolean);
  const ok =
    segs.length >= 4 &&
    !segs.includes('..') &&
    segs[1].toLowerCase() === String(session).toLowerCase() &&
    segs[2].toLowerCase() === 'subagents';
  if (!ok) throw fail('transcript-outside', 1, { transcript });
  return real;
}

function inRole(parsed, queueDir) {
  for (const u of Array.isArray(parsed.toolUses) ? parsed.toolUses : []) {
    if (u.name === 'StructuredOutput') continue; // how the checker returns its verdicts
    if (u.name !== 'Read') return false;
    const p = (u.access && Array.isArray(u.access.paths) && u.access.paths[0]) || (u.input && u.input.file_path);
    if (typeof p !== 'string' || !path.isAbsolute(p)) return false;
    if (!lib.isUnder(p, queueDir)) return false;
  }
  return true;
}

// ---------------------------------------------------------------- main

async function recordTamper({ root, ctx, ce, err, now, proc, retries }) {
  try {
    await lib.withRunLock(root, { script: SCRIPT, ce, proc, now, retries }, async (h) => {
      const led = lib.readLedger(root);
      if (!lib.verifyLedger(led.lines || []).ok) return;
      await lib.recordIncident(root, h, { ctx, ce, cls: 'refusal', detail: { tamper: true, script: SCRIPT, code: err.code }, now });
    });
  } catch {
    // best effort
  }
}

function parseCommandLine(argv) {
  let mode = null;
  let rest = argv;
  if (argv[0] === 'revert') {
    mode = 'revert';
    rest = argv.slice(1);
  } else if (argv.length && !String(argv[0]).startsWith('--')) {
    throw fail('usage', 66, { mode: argv[0] });
  }
  const { flags } = lib.parseArgs(rest, ARG_SPEC);
  if (typeof flags.root !== 'string' || !path.isAbsolute(flags.root)) throw fail('usage', 66, { flag: 'root' });
  if (flags.now != null && Number.isNaN(Date.parse(flags.now))) throw fail('usage', 66, { flag: 'now' });
  const has = (n) => flags[n] != null;
  if (mode === 'revert') {
    if (has('from') || has('batch') || has('transcript')) throw fail('usage', 66, { mode: 'revert' });
    if (!CLASSES.includes(flags.class)) throw fail('usage', 66, { flag: 'class' });
    return { mode: 'revert', flags };
  }
  if (has('class')) throw fail('usage', 66, { flag: 'class' });
  const witness = has('from');
  const checker = has('batch') || has('transcript');
  if (witness === checker) throw fail('usage', 66, { need: '--from witness | --batch --transcript' });
  if (witness) {
    if (flags.from !== 'witness') throw fail('usage', 66, { flag: 'from' });
    return { mode: 'witness', flags };
  }
  if (!has('batch') || !has('transcript')) throw fail('usage', 66, { need: '--batch and --transcript' });
  if (!BATCH_RE.test(flags.batch)) throw fail('usage', 66, { flag: 'batch' });
  if (!path.isAbsolute(flags.transcript)) throw fail('usage', 66, { flag: 'transcript' });
  return { mode: 'checker', flags };
}

lib.runMain(import.meta.url, SCRIPT, async (ctx) => {
  const { mode, flags } = parseCommandLine(process.argv.slice(2));
  const root = flags.root;
  const ce = flags.ce;
  const dryRun = flags['dry-run'] === true;
  const now = isoNow(flags);
  const P = pathsOf(root);
  lib.readTasks(root); // a writing script refuses a corrupt table (67)
  const th = lib.thresholds(root);
  const retries = lockRetries(th);
  let proc = null;
  const getProc = () => {
    if (!proc) proc = lib.realProc({ exe: th.get('proc_exe') });
    return proc;
  };
  const outMode = mode === 'revert' ? 'revert' : null;

  try {
    // ----- facts taken before the lock (the transcript parse never runs under run.lock)
    let checker = null;
    if (mode === 'checker') {
      const batch = flags.batch;
      if (!fs.existsSync(P.batchFile(batch))) throw fail('no-batch', 2, { batch });
      if (!fs.existsSync(P.seedKey(batch))) throw fail('no-key', 2, { batch });
      const already = () =>
        !!lib.lastLine(lib.readLedger(root).lines || [], 'promote', (l) => l && l.data && l.data.mode === 'checker' && l.data.batch === batch);
      if (already()) {
        return {
          exit: 0,
          mode: outMode,
          dry_run: dryRun,
          reasons: [{ code: 'already', detail: { batch } }],
          result: { mode: 'checker', written: [], seeds_dropped: 0, unclear: [], skipped: [], unknown_items: 0, already: true },
        };
      }
      const coord = lib.readJson(P.coord);
      if (coord.session == null) throw fail('no-coordinator-session', 2, {});
      const real = transcriptPlace(flags.transcript, th.get('transcripts_root'), coord.session);
      const parsed = lib.parseTranscript(real);
      const batchJson = lib.readJson(P.batchFile(batch));
      const key = lib.readJson(P.seedKey(batch));
      const itemIds = Array.isArray(batchJson.items) ? batchJson.items : [];
      for (const id of itemIds) if (typeof id !== 'string' || !ITEM_RE.test(id)) throw fail('batch-unreadable', 2, { batch, item: id });
      const role = inRole(parsed, P.batchDir(batch));
      const structured = (Array.isArray(parsed.structured) ? parsed.structured : []).map((s) => (s && 'data' in s ? s.data : s));
      const cv = lib.checkerVerdicts(structured, itemIds) || {};
      const seedItem = (id) => !!(key.items && key.items[id] && key.items[id].seed === true);
      const unclear = [];
      const verdictOf = (id) => {
        if (!role) return 'unclear';
        const v = cv.verdicts ? cv.verdicts[id] : undefined;
        if (typeof v === 'string') return v;
        if (v && typeof v.verdict === 'string') return v.verdict;
        return 'unclear';
      };
      for (const id of itemIds) {
        if (seedItem(id)) continue;
        if (!role) unclear.push({ item: id, reason: 'checker-out-of-role' });
        else if (cv.reasons && typeof cv.reasons[id] === 'string') unclear.push({ item: id, reason: cv.reasons[id] });
        else if (verdictOf(id) === 'unclear' && !(cv.verdicts && cv.verdicts[id] != null)) unclear.push({ item: id, reason: 'verdict-missing' });
      }
      checker = { batch, batchJson, key, verdictOf, unclear, role, unknown_items: cv.unknown_items ?? 0, already };
    }

    // ----- the plan, under the lock (or without it in a dry run)
    const plan = () => {
      if (mode === 'witness') return planWitness(root, P, now);
      if (mode === 'revert') return planRevert(P, now, flags.class);
      return planChecker(root, P, now, checker);
    };
    let planned;
    let alreadyInLock = false;
    if (dryRun) {
      lib.checkCe(root, ce);
      planned = plan();
    } else {
      await lib.withRunLock(root, { script: SCRIPT, ce, proc: getProc(), now, retries }, async (h) => {
        if (checker && checker.already()) {
          alreadyInLock = true;
          return;
        }
        planned = plan();
        if (!planned.lines.length) return;
        for (const line of planned.lines) lib.appendJsonl(P.cardStatus, line, h);
        const data = { mode: mode === 'witness' ? 'witness' : mode === 'revert' ? 'revert' : 'checker' };
        if (mode === 'checker') data.batch = checker.batch;
        if (mode === 'revert') data.class = flags.class;
        data.first_seq = planned.lines[0].seq;
        data.last_seq = planned.lines[planned.lines.length - 1].seq;
        await lib.appendLedger(root, h, { ctx, ce, kind: 'promote', data, now });
      });
    }
    if (alreadyInLock) {
      return {
        exit: 0,
        mode: outMode,
        dry_run: dryRun,
        reasons: [{ code: 'already', detail: { batch: checker.batch } }],
        result: { mode: 'checker', written: [], seeds_dropped: 0, unclear: [], skipped: [], unknown_items: 0, already: true },
      };
    }

    const resultMode = mode;
    const written = planned.lines.map((l) => ({ seq: l.seq, card_id: l.card_id, status: l.status, reason: l.reason }));
    const unclear = checker ? checker.unclear : [];
    const reasons = [];
    let exit = 0;
    if (checker && !checker.role) {
      exit = 1;
      reasons.push({ code: 'checker-out-of-role', detail: { batch: checker.batch } });
    }
    for (const u of unclear) {
      if (u.reason === 'checker-out-of-role') continue;
      exit = 1;
      reasons.push({ code: u.reason, detail: { item: u.item } });
    }
    for (const r of reasons) process.stderr.write(`promote: ${r.code}\n`);
    return {
      exit,
      mode: outMode,
      dry_run: dryRun,
      reasons,
      result: {
        mode: resultMode,
        written,
        seeds_dropped: planned.seeds_dropped || 0,
        unclear,
        skipped: planned.skipped || [],
        unknown_items: checker ? checker.unknown_items : 0,
      },
    };
  } catch (e) {
    if (e && e.exit === 3 && !dryRun) await recordTamper({ root, ctx, ce, err: e, now, proc: getProc(), retries });
    throw e;
  }
});
