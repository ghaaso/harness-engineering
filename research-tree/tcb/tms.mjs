// tms.mjs - the one label script (unit U2b; spec/tms.mjs.md, CONTRACT §3.1-§3.4, §3.15, §3.16, §3.18).
// Labels every card, sentence, verdict, dismissal and certificate from card status, stored objects
// and input hashes; writes views/labels.json and views/repair.json; judges gate targets; reopens
// dismissals (exit 10). Pure computation over files: no clock decides anything, no subprocess runs
// while run.lock is held, nothing outside the run root is written.
import fs from 'node:fs';
import path from 'node:path';
import * as lib from './lib.mjs';

const SCRIPT = 'tms';
const LEVELS = ['STALE', 'PENDING', 'JUDGMENT', 'IN']; // highest first
const CARD_LABELS = ['pending', 'witnessed', 'confirmed', 'unverifiable', 'rejected', 'superseded'];
const ARG_SPEC = {
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    target: { type: 'list' },
    now: { type: 'string' },
    'dry-run': { type: 'bool' },
  },
};
const TARGET_RE = /^[a-z][a-z0-9-]{1,39}\.[a-z]+$/;

const fail = (code, exit, detail) => new lib.TcbError(code, exit, detail);

// Every path this script touches (CONTRACT §2). Spelled once here.
function pathsOf(root) {
  return {
    objects: path.join(root, 'store', 'objects'),
    commits: path.join(root, 'store', 'commits'),
    cardStatus: path.join(root, 'store', 'status', 'card_status.jsonl'),
    labels: path.join(root, 'views', 'labels.json'),
    repair: path.join(root, 'views', 'repair.json'),
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

function targetsOf(flags) {
  return Array.isArray(flags.target) ? flags.target : flags.target ? [flags.target] : [];
}

function sortedUnique(arr) {
  return [...new Set(arr)].sort();
}

// ---------------------------------------------------------------- reading

function loadStatus(file) {
  if (!fs.existsSync(file)) return { records: [], badLines: [] };
  const r = lib.readJsonl(file);
  return { records: Array.isArray(r.records) ? r.records : [], badLines: r.badLines || [] };
}

function indexStatus(records) {
  const last = new Map();
  let lastSeq = 0;
  for (const rec of records) {
    if (!rec || typeof rec !== 'object' || typeof rec.card_id !== 'string') continue;
    last.set(rec.card_id, rec);
    if (Number.isInteger(rec.seq)) lastSeq = rec.seq;
  }
  return { last, lastSeq };
}

function loadObjects(root, dir) {
  const out = new Map();
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).sort()) {
    const m = /^([a-z]_[0-9a-f]{16})\.json$/.exec(f);
    if (!m) continue;
    out.set(m[1], lib.getObject(root, m[1]));
  }
  return out;
}

function loadCommits(dir) {
  const out = new Map(); // "<task>.<step>" -> record
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).sort()) {
    const m = /^([a-z][a-z0-9-]*\.[a-z]+)\.json$/.exec(f);
    if (!m) continue;
    out.set(m[1], lib.readJson(path.join(dir, f)));
  }
  return out;
}

function intakeFlags(lines) {
  const flags = [];
  for (const l of lines) {
    if (!l || l.kind !== 'intake' || !l.data || !Array.isArray(l.data.flagged)) continue;
    for (const f of l.data.flagged) {
      if (!f || typeof f.id !== 'string' || typeof f.sid !== 'string') continue;
      flags.push({
        id: f.id,
        obj_id: f.id,
        sid: f.sid,
        code: f.code,
        node: `${f.id}#${f.sid}`,
        seq: l.seq,
        intake_seq: l.seq,
        ledger_seq: l.seq,
        task: l.task,
        epoch: l.epoch,
      });
    }
  }
  return flags;
}

// ---------------------------------------------------------------- labelling

function covers(appliesTo, conditions) {
  if (!appliesTo || typeof appliesTo !== 'object') return true;
  const cond = conditions && typeof conditions === 'object' ? conditions : {};
  for (const [k, v] of Object.entries(appliesTo)) {
    if (v == null) continue;
    const have = cond[k];
    if (Array.isArray(v)) {
      const set = new Set(Array.isArray(have) ? have : have == null ? [] : [have]);
      for (const x of v) if (!set.has(x)) return false;
    } else if (Array.isArray(have)) {
      if (!have.includes(v)) return false;
    } else if (have !== v) {
      return false;
    }
  }
  return true;
}

function compute(root, flags, P) {
  // Step 1: read everything without the lock.
  lib.readTasks(root); // a corrupt table refuses (67)
  const st = loadStatus(P.cardStatus);
  if (st.badLines.length > 0) throw fail('status-unreadable', 2, { lines: st.badLines });
  const { last: lastStatus, lastSeq } = indexStatus(st.records);
  const objects = loadObjects(root, P.objects);
  const commits = loadCommits(P.commits);
  const { lines } = lib.readLedger(root);
  const flagsAll = intakeFlags(lines || []);

  const targets = targetsOf(flags);
  const missingTargets = targets.filter((t) => !commits.has(t));
  if (missingTargets.length) throw fail('no-target', 2, { targets: missingTargets });

  const dangling = new Set();
  const isKind = (id, kind) => objects.has(id) && objects.get(id).kind === kind;
  const needCard = (id) => {
    if (typeof id !== 'string' || !isKind(id, 'card')) dangling.add(String(id));
  };
  const needKind = (id, kind) => {
    if (typeof id !== 'string' || !isKind(id, kind)) dangling.add(String(id));
  };

  const cardIds = [];
  const packIds = [];
  const reviewIds = [];
  const certIds = [];
  for (const [id, o] of objects) {
    if (!o || typeof o !== 'object') continue;
    if (o.kind === 'card') cardIds.push(id);
    else if (o.kind === 'pack') packIds.push(id);
    else if (o.kind === 'review') reviewIds.push(id);
    else if (o.kind === 'certificate') certIds.push(id);
  }
  for (const id of cardIds) {
    const c = objects.get(id);
    if (c.supersedes != null) needCard(c.supersedes);
  }
  const sentencesOf = (o) =>
    o.kind === 'pack' ? (Array.isArray(o.conclusions) ? o.conclusions : []) : Array.isArray(o.sentences) ? o.sentences : [];
  for (const id of [...packIds, ...reviewIds]) {
    const o = objects.get(id);
    if (o.parent != null) needKind(o.parent, o.kind);
    if (o.kind === 'review') needKind(o.pack, 'pack');
    for (const s of sentencesOf(o)) for (const c of Array.isArray(s.cites) ? s.cites : []) needCard(c);
    if (o.kind === 'review') {
      for (const d of Array.isArray(o.dismissals) ? o.dismissals : [])
        for (const c of Array.isArray(d.supports) ? d.supports : []) needCard(c);
    }
  }
  for (const id of certIds) {
    const x = objects.get(id);
    for (const e of Array.isArray(x.read_set) ? x.read_set : []) needCard(e && e.card_id);
  }
  const committedIds = new Set();
  for (const [, rec] of commits) {
    for (const out of Array.isArray(rec.outputs) ? rec.outputs : []) {
      if (!objects.has(out.id)) dangling.add(String(out.id));
      else committedIds.add(out.id);
    }
  }
  if (dangling.size) throw fail('dangling', 2, { ids: [...dangling].sort() });

  // Protocols per field, checked against their ledger sha by lib.currentProtocol.
  const protoCache = new Map();
  const protocolOf = (field) => {
    if (typeof field !== 'string') return null;
    if (!protoCache.has(field)) {
      let p;
      try {
        p = lib.currentProtocol(root, field);
      } catch (e) {
        throw fail('protocol-unreadable', 2, { field, cause: e && e.code ? e.code : String(e && e.message) });
      }
      protoCache.set(field, p || null);
    }
    return protoCache.get(field);
  };
  const qShaCache = new Map();
  const currentQuestionsSha = (field) => {
    if (!qShaCache.has(field)) {
      const p = protocolOf(field);
      const ids = p && p.value && Array.isArray(p.value.question_ids) ? p.value.question_ids : null;
      qShaCache.set(field, ids ? lib.questionsSha(ids) : null);
    }
    return qShaCache.get(field);
  };

  // Step 2a: cards.
  const rawStatus = (id) => (lastStatus.has(id) ? lastStatus.get(id).status : 'pending');
  const superseded = new Set();
  for (const id of cardIds) {
    const c = objects.get(id);
    if (typeof c.supersedes === 'string' && rawStatus(id) === 'confirmed') superseded.add(c.supersedes);
  }
  const cardLabel = new Map();
  const cardsOut = {};
  for (const id of cardIds.sort()) {
    const label = superseded.has(id) ? 'superseded' : rawStatus(id);
    cardLabel.set(id, label);
    const seq = lastStatus.has(id) && Number.isInteger(lastStatus.get(id).seq) ? lastStatus.get(id).seq : 0;
    cardsOut[id] = { label, status_seq: seq };
  }

  // Step 2b: sentences.
  const repairedPacks = new Set();
  for (const id of packIds) {
    const p = objects.get(id);
    if (typeof p.parent === 'string' && committedIds.has(id)) repairedPacks.add(p.parent);
  }
  const flagsByNode = new Map();
  for (const f of flagsAll) {
    if (!flagsByNode.has(f.node)) flagsByNode.set(f.node, []);
    flagsByNode.get(f.node).push(f);
  }
  const clearedCache = new Map();
  const flagOpen = (f) => {
    const k = `${f.seq}|${f.node}|${f.code}`;
    if (!clearedCache.has(k)) clearedCache.set(k, lib.flagCleared(root, f) === true);
    return !clearedCache.get(k);
  };

  const nodes = {}; // key -> {label, why, causes}
  const nodeCauses = {}; // key -> [{card_id, code}] for the winning level
  const labelSentence = (objId, obj, s) => {
    const why = { STALE: new Set(), PENDING: new Set(), JUDGMENT: new Set() };
    const causes = { STALE: [], PENDING: [], JUDGMENT: [] };
    const add = (lvl, code, cardId) => {
      why[lvl].add(code);
      causes[lvl].push({ card_id: cardId, code });
    };
    const cites = Array.isArray(s.cites) ? s.cites : [];
    for (const c of cites) {
      const L = cardLabel.get(c);
      if (L === 'rejected' || L === 'superseded') add('STALE', 'support-fell', c);
      else if (L === 'pending' || L === 'witnessed') add('PENDING', 'support-unchecked', c);
      else if (L === 'unverifiable') add('JUDGMENT', 'support-unverifiable', c);
      const ls = lastStatus.get(c);
      if (ls && ls.check && ls.check.verdict === 'unclear') add('JUDGMENT', 'support-unclear', c);
    }
    const packId = obj.kind === 'pack' ? objId : obj.pack;
    if (repairedPacks.has(packId)) add('STALE', 'pack-repaired', null);
    const pack = objects.get(packId);
    const objQSha = pack ? pack.questions_sha : undefined;
    const field = obj.field != null ? obj.field : pack && pack.field;
    const curQSha = currentQuestionsSha(field);
    if (curQSha != null && objQSha !== curQSha) add('STALE', 'questions-changed', null);
    const node = `${objId}#${s.sid}`;
    const open = (flagsByNode.get(node) || []).filter(flagOpen);
    if (open.length) {
      if (cites.length) for (const c of cites) add('PENDING', 'flag-open', c);
      else add('PENDING', 'flag-open', null);
    }
    if (s.kind === 'judgment') add('JUDGMENT', 'judgment-kind', null);
    if (cites.length === 0) add('JUDGMENT', 'uncited', null);
    let label = 'IN';
    for (const lvl of ['STALE', 'PENDING', 'JUDGMENT']) {
      if (why[lvl].size) {
        label = lvl;
        break;
      }
    }
    const win = label === 'IN' ? [] : causes[label];
    nodes[node] = {
      label,
      why: label === 'IN' ? [] : [...why[label]].sort(),
      causes: sortedUnique(win.map((c) => c.card_id).filter((c) => typeof c === 'string')),
    };
    const seen = new Set();
    nodeCauses[node] = win
      .filter((c) => {
        const k = `${c.card_id}|${c.code}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => String(a.card_id).localeCompare(String(b.card_id)) || a.code.localeCompare(b.code));
    return label;
  };
  for (const id of [...packIds, ...reviewIds].sort()) {
    const o = objects.get(id);
    for (const s of sentencesOf(o)) if (s && typeof s.sid === 'string') labelSentence(id, o, s);
  }

  // Step 2c: verdicts.
  const rank = (l) => LEVELS.indexOf(l); // smaller = higher
  const verdicts = {};
  for (const rid of reviewIds.sort()) {
    const r = objects.get(rid);
    for (const v of Array.isArray(r.verdicts) ? r.verdicts : []) {
      if (!v || typeof v.approach_id !== 'string') continue;
      const key = `${rid}#${v.approach_id}`;
      const sups = (Array.isArray(v.supports) ? v.supports : []).map((sid) => nodes[`${rid}#${sid}`]).filter(Boolean);
      let entry;
      if (sups.length === 0) entry = { label: 'JUDGMENT', why: ['unsupported'] };
      else {
        let best = sups[0].label;
        for (const n of sups) if (rank(n.label) < rank(best)) best = n.label;
        const why = sortedUnique(sups.filter((n) => n.label === best).flatMap((n) => n.why));
        entry = { label: best, why };
      }
      if (!verdicts[key] || rank(entry.label) < rank(verdicts[key].label)) verdicts[key] = entry;
    }
  }

  // Step 2d: dismissals (R38).
  const confirmedCards = cardIds.filter((id) => cardLabel.get(id) === 'confirmed');
  const dismissals = {};
  for (const rid of reviewIds.sort()) {
    const r = objects.get(rid);
    const sentence = new Map((Array.isArray(r.sentences) ? r.sentences : []).map((s) => [s.sid, s]));
    for (const d of Array.isArray(r.dismissals) ? r.dismissals : []) {
      if (!d || typeof d.sid !== 'string') continue;
      const key = `${rid}#${d.sid}`;
      const supports = Array.isArray(d.supports) ? d.supports : [];
      const fell = supports.filter((c) => ['rejected', 'superseded'].includes(cardLabel.get(c)));
      const outlist = Array.isArray(d.outlist) ? d.outlist : [];
      const outMatch = confirmedCards.filter((c) => {
        const m = objects.get(c).measured || {};
        return outlist.some((o) => o && o.approach_id === m.approach_id && o.measure === m.measure && o.effect === m.effect);
      });
      if (fell.length || outMatch.length) {
        const why = [];
        if (fell.length) why.push('support-fell');
        if (outMatch.length) why.push('outlist-match');
        dismissals[key] = { label: 'reopened', why: why.sort(), matched: sortedUnique([...fell, ...outMatch]) };
        continue;
      }
      const s = sentence.get(d.sid);
      const proto = protocolOf(r.field);
      const sesoi = proto && proto.value && proto.value.sesoi && typeof proto.value.sesoi === 'object' ? proto.value.sesoi : {};
      const measure = s ? s.measure : undefined;
      const bound = typeof measure === 'string' && Object.prototype.hasOwnProperty.call(sesoi, measure) && typeof sesoi[measure] === 'number' ? sesoi[measure] : null;
      if (bound == null) {
        dismissals[key] = { label: 'untested', why: ['no-sesoi'], matched: [] };
        continue;
      }
      const bounding = supports.filter((c) => {
        if (cardLabel.get(c) !== 'confirmed') return false;
        const card = objects.get(c);
        const m = card.measured || {};
        if (m.approach_id !== s.approach_id || m.measure !== s.measure) return false;
        if (typeof m.value !== 'number' || typeof m.baseline !== 'number') return false;
        if (!(Math.abs(m.value - m.baseline) < bound)) return false;
        return covers(s.applies_to, card.conditions);
      });
      dismissals[key] = bounding.length
        ? { label: 'standing', why: ['bounded'], matched: sortedUnique(bounding) }
        : { label: 'untested', why: ['no-bound'], matched: [] };
    }
  }

  // Step 2e: certificates (R19, CONTRACT §3.16).
  const certificates = {};
  const staleCerts = [];
  for (const xid of certIds.sort()) {
    const x = objects.get(xid);
    const rs = (Array.isArray(x.read_set) ? x.read_set : [])
      .map((e) => ({
        card_id: e.card_id,
        status_seq: lastStatus.has(e.card_id) && Number.isInteger(lastStatus.get(e.card_id).seq) ? lastStatus.get(e.card_id).seq : 0,
      }))
      .sort((a, b) => (a.card_id < b.card_id ? -1 : a.card_id > b.card_id ? 1 : 0));
    const ok = lib.readSetSha(rs) === x.read_set_sha;
    certificates[xid] = ok ? 'VALID' : 'STALE';
    if (!ok) staleCerts.push(xid);
  }

  // Step 2f: targets.
  const targetList = [];
  const nodesOfObject = (id) => {
    const o = objects.get(id);
    if (!o || (o.kind !== 'pack' && o.kind !== 'review')) return [];
    return sentencesOf(o)
      .filter((s) => s && typeof s.sid === 'string')
      .map((s) => `${id}#${s.sid}`);
  };
  for (const [name, rec] of commits) {
    const bad = [];
    for (const out of Array.isArray(rec.outputs) ? rec.outputs : []) {
      for (const n of nodesOfObject(out.id)) {
        const l = nodes[n] && nodes[n].label;
        if (l === 'STALE' || l === 'PENDING') bad.push(n);
      }
    }
    targetList.push({ commit: name, ok: bad.length === 0, bad: sortedUnique(bad) });
  }
  targetList.sort((a, b) => (a.commit < b.commit ? -1 : a.commit > b.commit ? 1 : 0));
  const judged = targets.length ? new Set(targets) : null;
  const badTargets = targetList.filter((t) => !t.ok && (!judged || judged.has(t.commit))).map((t) => ({ commit: t.commit, bad: t.bad }));

  // Inputs (hashes only; no timestamp, so equal inputs give equal bytes).
  const inputs = {
    status_seq: lastSeq,
    objects: lib.sha256hex(lib.canonicalize([...objects.keys()].sort())),
    commits: lib.sha256hex(
      lib.canonicalize([...commits.entries()].map(([n, r]) => [n, typeof r.outputs_sha === 'string' ? r.outputs_sha : null]).sort()),
    ),
    flags: lib.sha256hex(lib.canonicalize(flagsAll.map((f) => [f.seq, f.id, f.sid, typeof f.code === 'string' ? f.code : null]))),
  };

  const labels = {
    schema_version: 1,
    inputs,
    cards: cardsOut,
    nodes,
    verdicts,
    dismissals,
    certificates,
    targets: targetList,
  };
  const repairItems = Object.keys(nodes)
    .filter((n) => nodes[n].label === 'STALE' || nodes[n].label === 'PENDING')
    .sort()
    .map((n) => ({ node: n, label: nodes[n].label, object: n.slice(0, n.indexOf('#')), causes: nodeCauses[n] }));
  const repair = { schema_version: 1, items: repairItems };

  // Step 3: newly reopened against the previous labels.json (absent or unreadable: all).
  let prev = null;
  try {
    if (fs.existsSync(P.labels)) prev = lib.readJson(P.labels);
  } catch {
    prev = null;
  }
  const prevD = prev && prev.dismissals && typeof prev.dismissals === 'object' ? prev.dismissals : {};
  const reopenedAll = Object.keys(dismissals).filter((k) => dismissals[k].label === 'reopened').sort();
  const newlyReopened = reopenedAll.filter((k) => !(prevD[k] && prevD[k].label === 'reopened'));

  const count = (vals, keys) => {
    const c = Object.fromEntries(keys.map((k) => [k, 0]));
    for (const v of vals) c[v] = (c[v] || 0) + 1;
    return c;
  };
  return {
    labels,
    repair,
    badTargets,
    newlyReopened,
    reopenedAll,
    staleCerts,
    cardCounts: count(Object.values(cardsOut).map((c) => c.label), CARD_LABELS),
    nodeCounts: count(Object.values(nodes).map((n) => n.label), LEVELS),
  };
}

// ---------------------------------------------------------------- main

async function recordTamper({ root, ctx, ce, err, now, proc, retries }) {
  try {
    await lib.withRunLock(root, { script: SCRIPT, ce, proc, now, retries }, async (h) => {
      const led = lib.readLedger(root);
      if (!lib.verifyLedger(led.lines || []).ok) return;
      await lib.recordIncident(root, h, {
        ctx,
        ce,
        cls: 'refusal',
        detail: { tamper: true, script: SCRIPT, code: err.code },
        now,
      });
    });
  } catch {
    // best effort (CONTRACT §1.4: only when the ce is current and the ledger verifies)
  }
}

lib.runMain(import.meta.url, SCRIPT, async (ctx) => {
  const { flags } = lib.parseArgs(process.argv.slice(2), ARG_SPEC);
  const root = flags.root;
  if (typeof root !== 'string' || !path.isAbsolute(root)) throw fail('usage', 66, { flag: 'root' });
  if (flags.now != null && Number.isNaN(Date.parse(flags.now))) throw fail('usage', 66, { flag: 'now' });
  for (const t of targetsOf(flags)) if (!TARGET_RE.test(t)) throw fail('usage', 66, { flag: 'target', value: t });
  const dryRun = flags['dry-run'] === true;
  const ce = flags.ce;
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
    const c = compute(root, flags, P);
    const labelsBytes = lib.canonicalize(c.labels) + '\n';
    const repairBytes = lib.canonicalize(c.repair) + '\n';
    const labelsSha = lib.sha256hex(labelsBytes);
    const result = c.badTargets.length || c.reopenedAll.length ? 'fail' : 'pass';
    const checkReasons = [];
    if (c.badTargets.length) checkReasons.push({ code: 'stale-or-pending', detail: c.badTargets });
    if (c.reopenedAll.length) checkReasons.push({ code: 'dismissals-reopened', detail: c.reopenedAll });
    if (c.newlyReopened.length) checkReasons.push({ code: 'reopened', detail: c.newlyReopened });

    let wrote = false;
    if (dryRun) {
      lib.checkCe(root, ce);
    } else {
      await lib.withRunLock(root, { script: SCRIPT, ce, proc: getProc(), now, retries }, async (h) => {
        if (h && typeof h.assertHeld === 'function') h.assertHeld();
        lib.writeAtomic(P.labels, labelsBytes);
        if (h && typeof h.assertHeld === 'function') h.assertHeld();
        lib.writeAtomic(P.repair, repairBytes);
        const led = lib.readLedger(root);
        const prevCheck = lib.lastLine(led.lines || [], 'check', (l) => l && l.data && l.data.check === 'tms');
        const due =
          !prevCheck ||
          prevCheck.data.labels_sha !== labelsSha ||
          prevCheck.data.result !== result ||
          c.newlyReopened.length > 0;
        if (due) {
          await lib.appendLedger(root, h, {
            ctx,
            ce,
            kind: 'check',
            data: { check: 'tms', subject: 'labels', result, reasons: checkReasons, labels_sha: labelsSha },
            now,
          });
        }
        wrote = true;
      });
    }

    let exit = 0;
    const reasons = [];
    if (c.newlyReopened.length) {
      exit = 10;
      reasons.push({ code: 'reopened', detail: c.newlyReopened });
    }
    if (c.badTargets.length) {
      if (exit === 0) exit = 1;
      reasons.push({ code: 'stale-or-pending', detail: c.badTargets });
    }
    for (const r of reasons) process.stderr.write(`tms: ${r.code}\n`);
    return {
      exit,
      mode: null,
      dry_run: dryRun,
      reasons,
      result: {
        cards: c.cardCounts,
        nodes: c.nodeCounts,
        bad_targets: c.badTargets,
        reopened: c.newlyReopened,
        reopened_all: c.reopenedAll,
        stale_certificates: c.staleCerts,
        labels_sha: labelsSha,
        written: wrote,
      },
    };
  } catch (e) {
    if (e && e.exit === 3 && !dryRun) await recordTamper({ root, ctx, ce, err: e, now, proc: getProc(), retries });
    throw e;
  }
});
