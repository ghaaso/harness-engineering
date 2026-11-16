// certify.mjs - the certificate of a committed review (unit U2b; spec/certify.mjs.md, CONTRACT §3.4,
// §3.11, §3.15, §3.16, §3.17, §3.20, §3.7). Every field is computed by script: session label from the
// audit line, cited cards and their R18 flags, plants found, coverage (recorded, not a condition), and
// the read set whose hash voids the certificate when a status changes (tms labels it STALE).
import fs from 'node:fs';
import path from 'node:path';
import * as lib from './lib.mjs';

const SCRIPT = 'certify';
const ARG_SPEC = {
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    task: { type: 'string', required: true },
    epoch: { type: 'int', required: true },
    now: { type: 'string' },
    'dry-run': { type: 'bool' },
  },
};
const TASK_RE = /^(?!(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:$|\.))[a-z][a-z0-9-]{1,39}$/;

const fail = (code, exit, detail) => new lib.TcbError(code, exit, detail);

function pathsOf(root) {
  return {
    objects: path.join(root, 'store', 'objects'),
    commit: (task, step) => path.join(root, 'store', 'commits', `${task}.${step}.json`),
    cardStatus: path.join(root, 'store', 'status', 'card_status.jsonl'),
    qualification: path.join(root, 'store', 'qualification.json'),
    plants: (task) => path.join(root, 'sealed', 'plants', `${task}.json`),
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

const fold = (s) => String(s).trim().toLowerCase();
const byId = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function rowOf(root, task, epoch) {
  const table = lib.readTasks(root); // 67
  const row = (Array.isArray(table.tasks) ? table.tasks : []).find((r) => r && r.task === task);
  if (!row) throw fail('no-task', 1, { task });
  if (row.epoch !== epoch) throw fail('stale-epoch', 65, { task, epoch, row_epoch: row.epoch });
  return row;
}

function plantsGate(th) {
  let t = null;
  let gate = false;
  try {
    t = th.get('plants_t');
    gate = th.isGate('plants_t') === true && typeof t === 'number';
  } catch {
    gate = false;
  }
  return { gate, t };
}

function compute(root, P, th, { task, epoch }) {
  // Step 1: the row.
  const row = rowOf(root, task, epoch);

  // Step 2: the commit record that holds exactly one review output.
  let rec = null;
  let reviewOut = null;
  for (const step of Array.isArray(row.steps) ? row.steps : []) {
    const f = P.commit(task, step);
    if (!fs.existsSync(f)) continue;
    const r = lib.readJson(f);
    const reviews = (Array.isArray(r.outputs) ? r.outputs : []).filter((o) => o && o.kind === 'review');
    if (reviews.length === 1) {
      rec = r;
      reviewOut = reviews[0];
      break;
    }
  }
  if (!rec) throw fail('not-committed', 2, { task });
  if (rec.epoch !== epoch) throw fail('stale-epoch', 65, { task, epoch, record_epoch: rec.epoch });
  const review = lib.getObject(root, reviewOut.id); // missing 2, object-mismatch 3
  if (lib.sha256hex(lib.canonicalize(review)) !== reviewOut.sha256) throw fail('object-mismatch', 3, { id: reviewOut.id });
  const pack = lib.getObject(root, review.pack);
  const attempt = lib.attemptOf(row, epoch); // no-attempt 2
  if (typeof attempt.manifest !== 'string') throw fail('missing', 2, { manifest: null, task, epoch });
  const manifest = lib.getObject(root, attempt.manifest);
  if (lib.sha256hex(lib.canonicalize(manifest)) !== rec.step_key)
    throw fail('step-key-mismatch', 3, { manifest: attempt.manifest, step_key: rec.step_key });

  // Stored cards (for supersession and existence).
  const cards = new Map();
  if (fs.existsSync(P.objects)) {
    for (const f of fs.readdirSync(P.objects).sort()) {
      const m = /^(c_[0-9a-f]{16})\.json$/.exec(f);
      if (m) cards.set(m[1], lib.getObject(root, m[1]));
    }
  }

  // Step 3: plants.
  const notRun = [];
  const { gate: plantsIsGate, t: plantsT } = plantsGate(th);
  let plantList = null;
  if (fs.existsSync(P.plants(task))) {
    const pf = lib.readJson(P.plants(task));
    plantList = Array.isArray(pf.plants) ? pf.plants : [];
    const dangling = plantList.filter((p) => !p || !cards.has(p.card_id)).map((p) => (p ? p.card_id : null));
    if (dangling.length) throw fail('dangling', 2, { plant_cards: dangling });
  } else if (plantsIsGate) {
    notRun.push('plants-missing');
  }

  // Card status (last line per card; an unreadable file makes the certificate not_run).
  const last = new Map();
  if (fs.existsSync(P.cardStatus)) {
    const r = lib.readJsonl(P.cardStatus);
    if (r.badLines && r.badLines.length) notRun.push('status-unreadable');
    for (const s of Array.isArray(r.records) ? r.records : []) if (s && typeof s.card_id === 'string') last.set(s.card_id, s);
  }
  const statusSeq = (id) => (last.has(id) && Number.isInteger(last.get(id).seq) ? last.get(id).seq : 0);
  const superseded = new Set();
  for (const [id, c] of cards) {
    if (typeof c.supersedes === 'string' && last.has(id) && last.get(id).status === 'confirmed') superseded.add(c.supersedes);
  }
  const isConfirmed = (id) => !superseded.has(id) && last.has(id) && last.get(id).status === 'confirmed';

  // Ledger facts.
  const { lines = [] } = lib.readLedger(root);
  const audit = lib.lastLine(lines, 'audit', (l) => l && l.task === task && l.epoch === epoch);
  const sessionLabel = audit && audit.data ? audit.data.label : null;
  if (!audit) notRun.push('audit-missing');

  // Cited cards and their failures.
  const sentences = Array.isArray(review.sentences) ? review.sentences : [];
  const cited = [...new Set(sentences.flatMap((s) => (Array.isArray(s.cites) ? s.cites : [])))].sort(byId);
  const missingCited = cited.filter((id) => !cards.has(id));
  if (missingCited.length) throw fail('dangling', 2, { cited: missingCited });
  const failing = [];
  for (const id of cited) {
    if (superseded.has(id)) failing.push({ card_id: id, code: 'superseded' });
    else if (!isConfirmed(id)) failing.push({ card_id: id, code: 'not-confirmed' });
  }
  // R18: an intake flag on a review or pack sentence that is not cleared marks the cards it cites.
  const citedSet = new Set(cited);
  const sentenceOf = new Map();
  for (const s of sentences) sentenceOf.set(`${reviewOut.id}#${s.sid}`, s);
  for (const s of Array.isArray(pack.conclusions) ? pack.conclusions : []) sentenceOf.set(`${review.pack}#${s.sid}`, s);
  const r18 = new Set();
  for (const l of lines) {
    if (!l || l.kind !== 'intake' || !l.data || !Array.isArray(l.data.flagged)) continue;
    for (const f of l.data.flagged) {
      if (!f || (f.id !== reviewOut.id && f.id !== review.pack)) continue;
      const node = `${f.id}#${f.sid}`;
      const s = sentenceOf.get(node);
      if (!s) continue;
      const flag = { id: f.id, obj_id: f.id, sid: f.sid, code: f.code, node, seq: l.seq, intake_seq: l.seq, ledger_seq: l.seq, task: l.task, epoch: l.epoch };
      if (lib.flagCleared(root, flag) === true) continue;
      for (const c of Array.isArray(s.cites) ? s.cites : []) if (citedSet.has(c)) r18.add(c);
    }
  }
  for (const id of r18) failing.push({ card_id: id, code: 'r18-flag' });
  failing.sort((a, b) => byId(a.card_id, b.card_id) || byId(a.code, b.code));
  const confirmedN = cited.filter(isConfirmed).length;

  // Plants found (file equal, locator equal after trim and case fold).
  const findings = Array.isArray(review.our_work_findings) ? review.our_work_findings : [];
  let found = 0;
  let contraFound = 0;
  for (const p of plantList || []) {
    const hit = findings.some((w) => w && w.file === p.file && typeof w.locator === 'string' && fold(w.locator) === fold(p.locator));
    if (hit) {
      found += 1;
      if (p.against_hope === true) contraFound += 1;
    }
  }
  const k = plantList ? plantList.length : 0;

  // Coverage (recorded only).
  const approved = Array.isArray(row.question_ids) ? row.question_ids : [];
  const coveredSet = new Set();
  for (const cid of Array.isArray(pack.cards) ? pack.cards : []) {
    if (!isConfirmed(cid) || !cards.has(cid)) continue;
    for (const q of Array.isArray(cards.get(cid).question_ids) ? cards.get(cid).question_ids : []) coveredSet.add(q);
  }
  for (const n of Array.isArray(pack.not_covered) ? pack.not_covered : []) if (n && n.question_id) coveredSet.add(n.question_id);
  const coverage = {
    approved: approved.length,
    covered: approved.filter((q) => coveredSet.has(q)).length,
    not_covered: approved.filter((q) => !coveredSet.has(q)),
  };

  // Seed escape from the qualification file.
  let seedEscape;
  if (fs.existsSync(P.qualification)) {
    const q = lib.readJson(P.qualification);
    if (q && q.escape && typeof q.escape === 'object') seedEscape = { n: q.escape.n, escaped: q.escape.escaped };
  }

  // Read set: every card of the pack and every cited card.
  const readIds = [...new Set([...(Array.isArray(pack.cards) ? pack.cards : []), ...cited])].sort(byId);
  const readSet = readIds.map((id) => ({ card_id: id, status_seq: statusSeq(id) }));
  const readSetSha = lib.readSetSha(readSet);

  // Result.
  let result;
  let reasons;
  if (notRun.length) {
    result = 'not_run';
    reasons = [...new Set(notRun)].sort();
  } else {
    const bad = [];
    if (sessionLabel !== 'clean') bad.push('tainted');
    if (failing.length) bad.push('cited-failing');
    const hasFacts = sentences.some((s) => s && s.kind === 'fact');
    if (hasFacts && cited.length < 1) bad.push('no-cited');
    if (plantsIsGate) {
      if (found < plantsT) bad.push('plants-short');
      if (contraFound < 1) bad.push('plant-contra-missed');
    }
    result = bad.length ? 'not_certified' : 'certified';
    reasons = bad.sort();
  }

  const cert = {
    schema_version: 1,
    kind: 'certificate',
    task,
    subject: reviewOut.id,
    pack: review.pack,
    step_key: rec.step_key,
    read_set: readSet,
    read_set_sha: readSetSha,
    session_label: sessionLabel === 'clean' || sessionLabel === 'tainted' ? sessionLabel : null,
    coverage,
    cited: { n: cited.length, confirmed: confirmedN, failing },
    plants: { k, found, contra_found: contraFound },
    result,
    reasons,
  };
  if (seedEscape) cert.seed_escape = seedEscape;
  return { cert, failing };
}

async function recordTamper({ root, ctx, ce, err, now, proc, retries, task, epoch }) {
  try {
    await lib.withRunLock(root, { script: SCRIPT, ce, proc, now, retries }, async (h) => {
      const led = lib.readLedger(root);
      if (!lib.verifyLedger(led.lines || []).ok) return;
      await lib.recordIncident(root, h, {
        ctx,
        ce,
        cls: 'refusal',
        detail: { tamper: true, script: SCRIPT, code: err.code },
        task,
        epoch,
        now,
      });
    });
  } catch {
    // best effort
  }
}

lib.runMain(import.meta.url, SCRIPT, async (ctx) => {
  const { flags } = lib.parseArgs(process.argv.slice(2), ARG_SPEC);
  const root = flags.root;
  if (typeof root !== 'string' || !path.isAbsolute(root)) throw fail('usage', 66, { flag: 'root' });
  if (!TASK_RE.test(flags.task)) throw fail('usage', 66, { flag: 'task' });
  if (!Number.isInteger(flags.epoch) || flags.epoch < 1) throw fail('usage', 66, { flag: 'epoch' });
  if (flags.now != null && Number.isNaN(Date.parse(flags.now))) throw fail('usage', 66, { flag: 'now' });
  const { task, epoch, ce } = flags;
  const dryRun = flags['dry-run'] === true;
  const now = isoNow(flags);
  const P = pathsOf(root);
  const th = lib.thresholds(root);
  const retries = lockRetries(th);
  let proc = null;
  const getProc = () => {
    if (!proc) proc = lib.realProc({ exe: th.get('proc_exe') });
    return proc;
  };

  try {
    const { cert, failing } = compute(root, P, th, { task, epoch });
    const id = lib.objectId('x', cert);
    let created = false;
    if (dryRun) {
      lib.checkCe(root, ce);
      created = !fs.existsSync(path.join(P.objects, `${id}.json`));
    } else {
      await lib.withRunLock(root, { script: SCRIPT, ce, proc: getProc(), now, retries }, async (h) => {
        rowOf(root, task, epoch); // the epoch is compared inside the lock (65)
        if (h && typeof h.assertHeld === 'function') h.assertHeld();
        const put = lib.putObject(root, cert);
        created = put.created === true;
        const { lines = [] } = lib.readLedger(root);
        const seen = lib.lastLine(lines, 'certificate', (l) => l && l.data && l.data.id === put.id);
        if (seen) return; // an identical repeat
        await lib.appendLedger(root, h, { ctx, ce, kind: 'certificate', task, epoch, data: { id: put.id, result: cert.result }, now });
        const checkResult = cert.result === 'certified' ? 'pass' : cert.result === 'not_certified' ? 'fail' : 'not_run';
        const checkReasons = cert.reasons.map((code) => ({ code, detail: code === 'cited-failing' ? failing : null }));
        await lib.appendLedger(root, h, {
          ctx,
          ce,
          kind: 'check',
          task,
          epoch,
          data: { check: 'certify', subject: cert.subject, result: checkResult, reasons: checkReasons },
          now,
        });
      });
    }
    const exit = cert.result === 'certified' ? 0 : cert.result === 'not_certified' ? 1 : 2;
    const reasons = cert.reasons.map((code) => ({ code, detail: code === 'cited-failing' ? failing : null }));
    for (const r of reasons) process.stderr.write(`certify: ${r.code}\n`);
    return {
      exit,
      mode: null,
      dry_run: dryRun,
      reasons,
      result: {
        certificate: id,
        result: cert.result,
        reasons: cert.reasons,
        cited: { n: cert.cited.n, confirmed: cert.cited.confirmed },
        plants: cert.plants,
        read_set_sha: cert.read_set_sha,
        created,
      },
    };
  } catch (e) {
    if (e && e.exit === 3 && !dryRun) await recordTamper({ root, ctx, ce, err: e, now, proc: getProc(), retries, task, epoch });
    throw e;
  }
});
