// compare.mjs (unit U5a). Spec: spec/compare.mjs.md; contract: CONTRACT.md (section 1, 3.1-3.4, 3.14-3.18, 3.22, 5).
//
//   node compare.mjs anon  --root <dir> --ce <n> [--dry-run]
//   node compare.mjs score --root <dir> --ce <n> [--scorer-transcript <abs path>] [--transcripts-root <dir>] [--dry-run]
//
// `anon` blinds and shuffles the arms' committed outputs for the scorer. `score` computes the frozen plan's outcomes for
// Comparison 1 (tree against one session) and Comparison 2 (same-window review against fresh). It never says which arm is
// better: it prints counts, the exact test, the spread and the label the plan fixes (CONTRACT section 3.18).
//
// The figures are computed from committed objects only (store/commits -> store/objects, hash re-checked). The transcripts are
// parsed before the run lock is taken (CONTRACT 2.1: no transcript parse while run.lock is held).

import fs from 'node:fs';
import path from 'node:path';
import * as lib from './lib.mjs';

const SCRIPT = 'compare';
const MODES = ['anon', 'score'];
const LABEL_FROZEN = 'descriptive, n = 1 per arm';
const LABEL_EXPLORATORY = 'exploratory';
const REF_RE = /^([a-z][a-z0-9-]{1,39})\.([a-z]+)$/;
const SEED_RE = /^s_[0-9a-f]{16}$/;
const RUBRIC = ['specificity', 'support', 'scope', 'calibration'];
const NOT_A_REFUSAL = new Set(['ledger-broken', 'run-from-attempt']);

const SPEC = {
  modes: MODES,
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    'scorer-transcript': { type: 'string' },
    'transcripts-root': { type: 'string' },
    'dry-run': { type: 'bool' },
    now: { type: 'string' },
    'free-mb': { type: 'int' },
    boot: { type: 'string' },
  },
};

const fail = (code, exit, detail) => new lib.TcbError(code, exit, detail);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const fold = (v) => String(v).toLowerCase();

function optParam(th, name, fallback) {
  try {
    return th.get(name);
  } catch (e) {
    if (e instanceof lib.TcbError && e.code === 'param-missing') return fallback;
    throw e;
  }
}

// ---------------------------------------------------------------------------------------------- inputs

async function loadLedger(root) {
  const led = await lib.readLedger(root);
  const v = lib.verifyLedger(led.lines);
  if (!v.ok) throw fail('ledger-broken', 3, v);
  return led.lines;
}

/** The plan and how far it is frozen (spec "Plan binding"). */
async function bindPlan(root, lines) {
  const named = (l) => l.data && l.data.name === 'analysis-plan';
  const amended = lines.filter((l) => l.kind === 'protocol-amend' && named(l)).length;
  const hasFreeze = lines.some((l) => l.kind === 'plan-freeze' && named(l));
  let last = null;
  for (const l of lines) if ((l.kind === 'plan-freeze' || l.kind === 'protocol-amend') && named(l)) last = l;
  let reason = 'plan-not-frozen';
  if (hasFreeze && last) {
    const frozenDir = path.join(root, 'plan', 'frozen');
    const fp = typeof last.data.path === 'string' ? path.resolve(root, last.data.path) : null;
    if (fp && lib.isUnder(fp, frozenDir) && fs.existsSync(fp)) {
      const bytes = fs.readFileSync(fp);
      if (lib.sha256hex(bytes) === last.data.sha256) {
        let plan;
        try {
          plan = JSON.parse(bytes.toString('utf8'));
        } catch {
          throw fail('unparseable', 2, { file: last.data.path });
        }
        return { frozen: true, plan, sha256: last.data.sha256, amended, reasons: [] };
      }
    }
    reason = 'plan-hash-mismatch';
  }
  const draft = path.join(root, 'plan', 'analysis-plan.json');
  if (!fs.existsSync(draft)) return { frozen: false, plan: null, sha256: null, amended, reasons: [reason] };
  return { frozen: false, plan: await lib.readJson(draft), sha256: null, amended, reasons: [reason] };
}

function armTasksOf(plan) {
  const at = plan && isObj(plan.arm_tasks) ? plan.arm_tasks : null;
  if (!at) throw fail('plan-invalid', 2, { why: 'no arm_tasks' });
  return at;
}

function tasksOfEntry(entry) {
  const out = [];
  for (const slot of ['pack', 'review']) {
    const m = typeof (entry && entry[slot]) === 'string' ? REF_RE.exec(entry[slot]) : null;
    if (m && !out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

function makeObjects(root) {
  const cache = new Map();
  const get = async (id, { optional = false } = {}) => {
    if (typeof id === 'string' && SEED_RE.test(id)) throw fail('seed-id', 3, { id });
    if (cache.has(id)) return cache.get(id);
    let v = null;
    try {
      v = await lib.getObject(root, id);
    } catch (e) {
      if (!(optional && e instanceof lib.TcbError && e.code === 'missing')) throw e;
    }
    cache.set(id, v);
    return v;
  };
  const verified = async (out) => {
    if (!isObj(out) || typeof out.id !== 'string') throw fail('object-mismatch', 3, { why: 'bad output entry' });
    const v = await get(out.id);
    if (lib.sha256hex(lib.canonicalize(v)) !== out.sha256) throw fail('object-mismatch', 3, { id: out.id });
    return v;
  };
  return { get, verified };
}

/** One arm: its commit records and, through them only, its review and pack objects. */
async function loadArm(root, name, entry, objects) {
  const arm = { name, status: 'not_run', tasks: tasksOfEntry(entry), review: null, reviewId: null, pack: null, packId: null };
  const refs = [];
  for (const slot of ['pack', 'review']) if (isObj(entry) && typeof entry[slot] === 'string') refs.push([slot, entry[slot]]);
  if (refs.length === 0) return arm;
  const records = {};
  for (const [slot, ref] of refs) {
    if (!REF_RE.test(ref)) return arm;
    const p = path.join(root, 'store', 'commits', `${ref}.json`);
    if (!fs.existsSync(p)) return arm;
    records[slot] = await lib.readJson(p);
  }
  for (const rec of Object.values(records)) {
    for (const o of arr(rec && rec.outputs)) if (isObj(o) && SEED_RE.test(String(o.id))) throw fail('seed-id', 3, { id: o.id });
  }
  if (records.review) {
    const o = arr(records.review.outputs).find((x) => isObj(x) && x.kind === 'review');
    if (!o) return arm;
    arm.reviewId = o.id;
    arm.review = await objects.verified(o);
  }
  if (records.pack) {
    const o = arr(records.pack.outputs).find((x) => isObj(x) && x.kind === 'pack');
    if (o) {
      arm.packId = o.id;
      arm.pack = await objects.verified(o);
    }
  }
  if (arm.review) {
    for (const s of arr(arm.review.sentences)) for (const c of arr(s.cites)) if (SEED_RE.test(String(c))) throw fail('seed-id', 3, { id: c });
    if (typeof arm.review.pack === 'string') {
      if (SEED_RE.test(arm.review.pack)) throw fail('seed-id', 3, { id: arm.review.pack });
      arm.packOfReview = await objects.get(arm.review.pack, { optional: true });
    }
  }
  arm.status = 'committed';
  return arm;
}

async function cardStatusMap(root) {
  const file = path.join(root, 'store', 'status', 'card_status.jsonl');
  const map = new Map();
  if (!fs.existsSync(file)) return map;
  const r = await lib.readJsonl(file);
  for (const rec of arr(r.records)) if (isObj(rec) && typeof rec.card_id === 'string') map.set(rec.card_id, rec.status);
  return map;
}

// ---------------------------------------------------------------------------------------------- definitions

/** "applies_to is within the card's conditions" (spec, Answered). */
function withinConditions(applies, cond) {
  if (!isObj(applies)) return true;
  const c = isObj(cond) ? cond : {};
  for (const k of ['task', 'model_family', 'language']) {
    if (applies[k] === undefined || applies[k] === null) continue;
    const want = [].concat(applies[k]).map(fold);
    const have = new Set([].concat(c[k] === undefined || c[k] === null ? [] : c[k]).map(fold));
    if (!want.every((w) => have.has(w))) return false;
  }
  for (const k of ['repo_size', 'metric']) {
    if (applies[k] === undefined || applies[k] === null) continue;
    if (c[k] === undefined || c[k] === null || fold(applies[k]) !== fold(c[k])) return false;
  }
  return true;
}

/** Exact two-sided McNemar: p = min(1, 2 * P(Bin(b + c, 1/2) <= min(b, c))); 1 when b + c = 0. */
function mcnemarP(b, c) {
  const n = b + c;
  if (n === 0) return 1;
  const k = Math.min(b, c);
  let term = Math.pow(2, -n);
  let cum = term;
  for (let i = 1; i <= k; i += 1) {
    term = (term * (n - i + 1)) / i;
    cum += term;
  }
  return Math.min(1, Number((2 * cum).toPrecision(12)));
}

async function findCertificate(root, lines, reviewId, objects) {
  let found = null;
  for (const l of lines) {
    if (l.kind !== 'certificate' || !l.data || typeof l.data.id !== 'string') continue;
    const cert = await objects.get(l.data.id, { optional: true });
    if (isObj(cert) && cert.subject === reviewId) found = cert;
  }
  return found;
}

async function armFigures(root, arm, ctx) {
  const { objects, statuses, qids, lines } = ctx;
  const review = arm.review;
  const pack = isObj(arm.packOfReview) ? arm.packOfReview : arm.pack;
  const packSet = new Set(pack ? arr(pack.cards) : []);
  const sentences = arr(review.sentences);
  const cards = new Map();
  const cardOf = async (id) => {
    if (!cards.has(id)) cards.set(id, await objects.get(id, { optional: true }));
    return cards.get(id);
  };
  const Y = {};
  for (const q of qids) Y[q] = 0;
  let outside = 0;
  let judgment = 0;
  let factsNotInPack = 0;
  let facts = 0;
  for (const s of sentences) {
    if (s.kind === 'judgment') judgment += 1;
    if (s.kind !== 'fact') continue;
    facts += 1;
    let anyInPack = false;
    let anyOutside = false;
    for (const cid of arr(s.cites)) {
      const inPack = packSet.has(cid);
      if (inPack) anyInPack = true;
      const c = await cardOf(cid);
      if (!isObj(c)) continue;
      const within = withinConditions(s.applies_to, c.conditions);
      if (!within) anyOutside = true;
      if (inPack && within && statuses.get(cid) === 'confirmed') {
        for (const q of qids) if (arr(c.question_ids).includes(q)) Y[q] = 1;
      }
    }
    if (!anyInPack) factsNotInPack += 1;
    if (anyOutside) outside += 1;
  }
  const answered = qids.reduce((n, q) => n + Y[q], 0);
  const cert = await findCertificate(root, lines, arm.reviewId, objects);
  let citation = null;
  let plants = null;
  if (isObj(cert)) {
    if (isObj(cert.cited)) {
      const n = Number.isFinite(cert.cited.n) ? cert.cited.n : 0;
      const failing = arr(cert.cited.failing).length;
      citation = { n, failing, rate: n > 0 ? failing / n : 0 };
    }
    if (isObj(cert.plants)) plants = { k: cert.plants.k ?? null, found: cert.plants.found ?? null, contra_found: cert.plants.contra_found ?? null };
  }
  const fig = {
    status: 'committed',
    answered,
    Y,
    citation_failures: citation,
    outside_conditions: outside,
    judgment_share: sentences.length > 0 ? judgment / sentences.length : null,
    plants,
  };
  if (arm.name === 'R_same') {
    fig.u = {
      fact_sentences: facts,
      fact_citing_nothing_in_pack: factsNotInPack,
      share: facts > 0 ? factsNotInPack / facts : null,
      checked_sample: null,
    };
  }
  return fig;
}

// ---------------------------------------------------------------------------------------------- tokens and time

function callsOfTask(task, rows, tctx) {
  const row = rows.get(task);
  const calls = [];
  let missing = false;
  for (const a of arr(row && row.attempts)) {
    const files = [];
    if (typeof a.session === 'string') {
      const t = lib.sessionTranscripts(tctx.root_t, a.session);
      if (!t.main) {
        missing = true;
        continue;
      }
      files.push(t.main, ...t.helpers);
    } else if (typeof a.folder === 'string') {
      let found = [];
      try {
        found = lib.transcriptsForFolder(tctx.root_t, path.join(tctx.root, ...String(a.folder).split('/')));
      } catch {
        found = [];
      }
      for (const f of found) {
        files.push(f.path);
        files.push(...lib.sessionTranscripts(tctx.root_t, f.sessionId).helpers);
      }
    }
    for (const f of files) {
      if (!tctx.parsed.has(f)) tctx.parsed.set(f, lib.parseTranscript(f));
      for (const c of arr(tctx.parsed.get(f).calls)) calls.push(c);
    }
  }
  return { calls, missing };
}

function sumCalls(calls, w) {
  let count = 0;
  let weighted = 0;
  let partial = false;
  for (const c of calls) {
    const u = c.usage || {};
    count += Number.isFinite(c.total) ? c.total : 0;
    weighted += (u.input || 0) + w.read * (u.cache_read || 0) + w.write * (u.cache_write || 0) + w.out * (u.output || 0);
    if (c.partial) partial = true;
  }
  return { count, weighted: Number(weighted.toPrecision(15)), calls: calls.length, partial };
}

const tsMs = (ts) => (typeof ts === 'string' ? Date.parse(ts) : Number.NaN);

function computeTokens(arms, armTasks, rows, lines, tctx, weights, reasons) {
  const taskCalls = new Map();
  const callsFor = (task) => {
    if (!taskCalls.has(task)) taskCalls.set(task, callsOfTask(task, rows, tctx));
    return taskCalls.get(task);
  };
  // The one shared task: T's pack step and R_same's review step run in one session (spec, tokens).
  let split = null;
  if ('T' in armTasks && 'R_same' in armTasks) {
    const tPack = REF_RE.exec(String(armTasks.T && armTasks.T.pack));
    const shared = tasksOfEntry(armTasks.T).filter((t) => tasksOfEntry(armTasks.R_same).includes(t));
    if (tPack && shared.includes(tPack[1])) {
      let boundary = null;
      for (const l of lines) {
        if (l.kind === 'commit' && l.task === tPack[1] && l.data && l.data.step === tPack[2]) boundary = tsMs(l.ts);
      }
      split = { task: tPack[1], boundary: Number.isFinite(boundary) ? boundary : null };
    }
  }
  const out = {};
  const missingTasks = new Set();
  for (const arm of arms) {
    let calls = [];
    let ok = true;
    for (const task of arm.tasks) {
      const tc = callsFor(task);
      if (tc.missing) {
        missingTasks.add(task);
        ok = false;
        continue;
      }
      let part = tc.calls;
      if (split && task === split.task && (arm.name === 'T' || arm.name === 'R_same')) {
        if (split.boundary === null) {
          if (arm.name === 'R_same') {
            ok = false;
            reasons.add(`boundary-missing:${task}`);
          }
        } else if (arm.name === 'T') {
          part = part.filter((c) => !(tsMs(c.ts) > split.boundary));
        } else {
          part = part.filter((c) => tsMs(c.ts) > split.boundary);
        }
      }
      calls = calls.concat(part);
    }
    if (!ok) {
      out[arm.name] = null;
      continue;
    }
    out[arm.name] = sumCalls(calls, weights);
    if (split && split.boundary !== null && (arm.name === 'T' || arm.name === 'R_same') && arm.tasks.includes(split.task)) {
      out[arm.name].boundary = 'ledger-ts';
    }
  }
  for (const t of [...missingTasks].sort()) reasons.add(`transcript-missing:${t}`);
  // Prediction: every distinct task once, whole.
  const distinct = [...new Set(arms.flatMap((a) => a.tasks))].sort();
  let actual = 0;
  let known = true;
  for (const t of distinct) {
    const tc = callsFor(t);
    if (tc.missing) known = false;
    else actual += sumCalls(tc.calls, weights).count;
  }
  return { tokens: out, actual: known ? actual : null };
}

function timeOf(lines, tasks) {
  const set = new Set(tasks);
  let first = null;
  let last = null;
  for (const l of lines) {
    if (!set.has(l.task)) continue;
    const t = tsMs(l.ts);
    if (!Number.isFinite(t)) continue;
    if (first === null || t < first.t) first = { t, ts: l.ts };
    if (last === null || t > last.t) last = { t, ts: l.ts };
  }
  if (!first) return { first_ts: null, last_ts: null, wall_s: null };
  return { first_ts: first.ts, last_ts: last.ts, wall_s: (last.t - first.t) / 1000 };
}

// ---------------------------------------------------------------------------------------------- blinding

async function blindingOf(root, scorerAbs, planSha, arms, th) {
  const none = { blinding: { status: 'not_run' }, rubric: null, reasons: [] };
  if (!scorerAbs) return none;
  if (!planSha) return { blinding: { status: 'not_run', reason: 'no-key' }, rubric: null, reasons: [] };
  const keyPath = path.join(root, 'sealed', 'blind', `${planSha.slice(0, 12)}.json`);
  if (!fs.existsSync(keyPath)) return { blinding: { status: 'not_run', reason: 'no-key' }, rubric: null, reasons: [] };
  const key = await lib.readJson(keyPath);
  const parsed = lib.parseTranscript(scorerAbs);
  const items = arr(parsed.structured);
  const data = items.length > 0 ? items[items.length - 1].data : null;
  const invalid = () => ({ blinding: { status: 'not_run', reason: 'scores-invalid' }, rubric: null, reasons: ['scores-invalid'] });
  if (!isObj(data) || !Array.isArray(data.scores) || data.scores.length === 0) return invalid();
  const keyItems = isObj(key.items) ? key.items : {};
  const seen = new Set();
  const perArm = new Map();
  let right = 0;
  for (const s of data.scores) {
    if (!isObj(s) || typeof s.item !== 'string' || !(s.item in keyItems) || seen.has(s.item)) return invalid();
    seen.add(s.item);
    if (!isObj(s.rubric) || typeof s.guess_arm !== 'string') return invalid();
    let total = 0;
    for (const crit of RUBRIC) {
      const v = s.rubric[crit];
      if (!Number.isInteger(v) || v < 0 || v > 4) return invalid();
      total += v;
    }
    const arm = keyItems[s.item].arm;
    if (s.guess_arm === arm) right += 1;
    if (!perArm.has(arm)) perArm.set(arm, []);
    perArm.get(arm).push(total);
  }
  const n = data.scores.length;
  const rate = right / n;
  const threshold = th.get('blind_fail_rate');
  const rubric = {};
  for (const a of arms) {
    const v = perArm.get(a.name);
    rubric[a.name] = v && v.length ? v.reduce((x, y) => x + y, 0) / v.length : null;
  }
  return { blinding: { status: 'scored', n_items: n, n_guessed_right: right, rate, threshold, failed: rate > threshold }, rubric, reasons: [] };
}

// ---------------------------------------------------------------------------------------------- score

async function computeScore(env) {
  const { root, th, lines, bound, armTasks, tctx, scorerAbs } = env;
  const objects = makeObjects(root);
  const names = Object.keys(armTasks).sort();
  const arms = [];
  for (const n of names) arms.push(await loadArm(root, n, armTasks[n], objects));
  const committed = arms.filter((a) => a.status === 'committed' && a.review);
  if (committed.length === 0) throw fail('no-arm-committed', 2, { arms: names });
  const field = committed[0].review.field;
  const proto = await lib.currentProtocol(root, field);
  if (!proto || !isObj(proto.value)) throw fail('protocol-missing', 2, { field });
  const qids = arr(proto.value.question_ids).slice().sort();
  const statuses = await cardStatusMap(root);
  const fctx = { objects, statuses, qids, lines };
  const reasons = new Set(bound.reasons);

  const armsOut = {};
  for (const a of arms) {
    if (a.status !== 'committed' || !a.review) {
      armsOut[a.name] = { status: 'not_run' };
      continue;
    }
    armsOut[a.name] = await armFigures(root, a, fctx);
  }

  const rows = new Map(arr((await lib.readTasks(root)).tasks).map((r) => [r.task, r]));
  const weights = th.get('weights');
  const live = arms.filter((a) => a.status === 'committed');
  const { tokens, actual } = computeTokens(live, armTasks, rows, lines, tctx, weights, reasons);
  for (const a of arms) {
    if (armsOut[a.name].status === 'not_run') continue;
    armsOut[a.name].tokens = Object.prototype.hasOwnProperty.call(tokens, a.name) ? tokens[a.name] : null;
    armsOut[a.name].time = timeOf(lines, a.tasks);
  }

  const bl = await blindingOf(root, scorerAbs, bound.sha256, arms, th);
  for (const r of bl.reasons) reasons.add(r);
  for (const a of arms) {
    if (armsOut[a.name].status === 'not_run') continue;
    armsOut[a.name].rubric_total = bl.rubric ? bl.rubric[a.name] : { status: 'not_run' };
  }

  const ans = (n) => (armsOut[n] && armsOut[n].status === 'committed' ? armsOut[n].answered : null);
  const reading = (gap, spread) => (spread !== null && gap !== null && gap > spread ? 'above_spread' : 'no_difference_shown');

  let comparison1 = { status: 'not_run' };
  if (ans('T') !== null && ans('S1') !== null) {
    let b = 0;
    let c = 0;
    for (const q of qids) {
      const t = armsOut.T.Y[q];
      const s = armsOut.S1.Y[q];
      if (t === 1 && s === 0) b += 1;
      if (t === 0 && s === 1) c += 1;
    }
    const spread = ans('S2') !== null ? Math.abs(ans('S1') - ans('S2')) : null;
    const gap = Math.abs(ans('T') - ans('S1'));
    const tT = armsOut.T.tokens;
    const tS = armsOut.S1.tokens;
    let perMillion = null;
    if (tT && tS && tT.count - tS.count > 0) perMillion = (ans('T') - ans('S1')) / ((tT.count - tS.count) / 1e6);
    comparison1 = {
      status: 'computed',
      arms: ['T', 'S1'],
      answered: { T: ans('T'), S1: ans('S1') },
      mcnemar: { b, c, p: mcnemarP(b, c), conditional_on_run: true },
      spread,
      reading: reading(gap, spread),
      confirmed_per_extra_million_tokens: perMillion,
    };
  }

  const found = (n) => (armsOut[n] && armsOut[n].status === 'committed' && armsOut[n].plants ? armsOut[n].plants.found : null);
  let comparison2 = { status: 'not_run' };
  if (armsOut.R_same && armsOut.R_same.status === 'committed' && armsOut.R1 && armsOut.R1.status === 'committed') {
    const spread = found('R1') !== null && found('R2') !== null ? Math.abs(found('R1') - found('R2')) : null;
    const gap = found('R_same') !== null && found('R1') !== null ? Math.abs(found('R_same') - found('R1')) : null;
    comparison2 = {
      status: 'computed',
      arms: ['R_same', 'R1'],
      plants_found: { R_same: found('R_same'), R1: found('R1'), R2: found('R2') },
      spread,
      reading: reading(gap, spread),
    };
  }

  const predicted = Number.isFinite(env.plan.predicted_total) ? env.plan.predicted_total : null;
  let ratio = null;
  if (predicted && actual !== null) ratio = actual / predicted;
  const prediction = { predicted, actual, ratio, within_2x: ratio !== null && ratio <= 2 && ratio >= 0.5 };

  const comparison = {
    schema_version: 1,
    plan_sha256: bound.sha256,
    label: bound.frozen ? LABEL_FROZEN : LABEL_EXPLORATORY,
    plan_amended: bound.amended,
    field,
    n_questions: qids.length,
    arms: armsOut,
    comparison1,
    comparison2,
    blinding: bl.blinding,
    prediction,
    reasons: [...reasons].sort(),
  };
  const notRun =
    bl.blinding.status === 'not_run' ||
    arms.some((a) => armsOut[a.name].status === 'not_run') ||
    comparison.reasons.some((r) => r.startsWith('transcript-missing:') || r.startsWith('boundary-missing:'));
  return { comparison, checkResult: notRun ? 'not_run' : 'pass' };
}

// ---------------------------------------------------------------------------------------------- anon

function scrubber(tasks) {
  const taskRes = [...new Set(tasks)].filter(Boolean).map((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
  return (text) => {
    let s = String(text === undefined || text === null ? '' : text);
    s = s.replace(/\b[cprmxds]_[0-9a-f]{16}\b/g, '[ref]');
    s = s.replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s)\]>"']+/gi, '[link]');
    s = s.replace(/\bwt[\\/][^\s"']*/gi, '[path]');
    s = s.replace(/\b[A-Za-z]:[\\/][^\s"']*/g, '[path]');
    for (const re of taskRes) s = s.replace(re, '[name]');
    s = s.replace(/\b(?:R_same|S1|S2|R1|R2)\b/g, '[name]');
    s = s.replace(/\bT\b/g, '[name]');
    s = s.replace(/\bepoch\s*[:#=]?\s*\d+\b/gi, '[epoch]');
    s = s.replace(/-e\d+\b/gi, '[epoch]');
    return s.replace(/\s+/g, ' ').trim();
  };
}

const scopeText = (o, scrub) => {
  const parts = [];
  if (isObj(o)) {
    for (const k of ['task', 'model_family', 'language', 'repo_size', 'metric', 'other']) {
      if (o[k] === undefined || o[k] === null) continue;
      parts.push(`${k}=${[].concat(o[k]).map((x) => scrub(x)).join(', ')}`);
    }
  }
  return parts.length ? parts.join('; ') : 'not stated';
};

async function blindText(review, objects, scrub) {
  const order = [];
  const index = new Map();
  const numOf = (cid) => {
    if (!index.has(cid)) {
      order.push(cid);
      index.set(cid, order.length);
    }
    return index.get(cid);
  };
  const out = ['# Review item', '', '## Statements', ''];
  const sentences = arr(review.sentences);
  sentences.forEach((s, i) => {
    const cites = arr(s.cites).map((c) => `[${numOf(c)}]`).join(' ');
    out.push(`s${i + 1} (${scrub(s.kind)}) approach: ${scrub(s.approach_id)}; measure: ${scrub(s.measure)}`);
    out.push(scrub(s.text));
    out.push(`cites: ${cites || 'none'}`);
    out.push(`scope: ${scopeText(s.applies_to, scrub)}`);
    out.push('');
  });
  out.push('## Cited cards', '');
  for (let i = 0; i < order.length; i += 1) {
    const c = await objects.get(order[i], { optional: true });
    out.push(`[${i + 1}]`);
    if (!isObj(c)) {
      out.push('- card not available', '');
      continue;
    }
    const m = isObj(c.measured) ? c.measured : {};
    const src = isObj(c.source) ? c.source : {};
    out.push(`- approach: ${scrub(m.approach_id)}`);
    out.push(`- measure: ${scrub(m.measure)}`);
    out.push(`- value: ${scrub(m.value)} ${scrub(m.unit)}`);
    out.push(`- baseline: ${scrub(m.baseline)} (${scrub(m.baseline_kind)})`);
    out.push(`- effect: ${scrub(m.effect)}`);
    out.push(`- conditions: ${scopeText(c.conditions, scrub)}`);
    out.push(`- evidence type: ${scrub(src.evidence_type)}`);
    out.push(`- date: ${scrub(src.date === undefined ? 'not stated' : src.date)}`);
    out.push(`- what measured: ${scrub(c.what_measured)}`);
    out.push(`- quote: "${scrub(c.quote)}"`);
    out.push('');
  }
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

async function computeAnon(env) {
  const { root, bound, armTasks } = env;
  const objects = makeObjects(root);
  const names = Object.keys(armTasks).sort();
  const live = [];
  for (const n of names) {
    const a = await loadArm(root, n, armTasks[n], objects);
    if (a.status === 'committed' && a.review) live.push(a);
  }
  if (live.length === 0) throw fail('no-arm-committed', 2, { arms: names });
  const scrub = scrubber(names.flatMap((n) => tasksOfEntry(armTasks[n])));
  const seed = lib.sha256hex(`blind:${bound.sha256}`);
  const order = lib.rng(seed).shuffle(live.map((a) => a.name).sort());
  const byName = new Map(live.map((a) => [a.name, a]));
  const files = new Map();
  const keyItems = {};
  const ids = [];
  for (let i = 0; i < order.length; i += 1) {
    const id = `b${i + 1}`;
    ids.push(id);
    keyItems[id] = { arm: order[i] };
    files.set(path.join(root, 'views', 'blind', `item-${id}.md`), await blindText(byName.get(order[i]).review, objects, scrub));
  }
  const index = lib.canonicalize({ schema_version: 1, items: ids, arm_names: names.filter((n) => byName.has(n)) }) + '\n';
  files.set(path.join(root, 'views', 'blind', 'index.json'), index);
  const key = lib.canonicalize({ schema_version: 1, plan_sha256: bound.sha256, rng_seed: seed, items: keyItems }) + '\n';
  return { files, keyPath: path.join(root, 'sealed', 'blind', `${bound.sha256.slice(0, 12)}.json`), key, ids };
}

// ---------------------------------------------------------------------------------------------- main

async function recordTamper({ root, ctx, ce, err, now, proc, retries }) {
  try {
    const opts = { script: SCRIPT, ce, proc, now };
    if (retries !== undefined) opts.retries = retries;
    await lib.withRunLock(root, opts, async (h) => {
      const led = await lib.readLedger(root);
      if (!lib.verifyLedger(led.lines).ok) return;
      await lib.recordIncident(root, h, { ctx, ce, cls: 'refusal', detail: { tamper: true, script: SCRIPT, code: err.code }, now });
    });
  } catch {
    // best effort (CONTRACT 1.4: only when the ce is current and the ledger tail verifies)
  }
}

const sameBytes = (file, text) => fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text;

async function main(ctx) {
  const { mode, flags } = lib.parseArgs(process.argv.slice(2), SPEC);
  const root = path.resolve(flags.root);
  const dry = Boolean(flags['dry-run']);
  const ce = flags.ce;
  const th = lib.thresholds(root);
  const facts = lib.edgeFacts(flags);
  const transcriptsRoot = path.resolve(flags['transcripts-root'] !== undefined ? flags['transcripts-root'] : th.get('transcripts_root'));
  let scorerAbs = null;
  if (flags['scorer-transcript'] !== undefined) {
    scorerAbs = path.resolve(flags['scorer-transcript']);
    if (!path.isAbsolute(flags['scorer-transcript']) || !lib.isUnder(scorerAbs, transcriptsRoot)) {
      throw fail('file-path', 66, { flag: 'scorer-transcript' });
    }
  }
  ctx.mode = mode;
  ctx.dry_run = dry;
  await lib.checkCe(root, ce); // before anything is read (no lock yet)

  const exe = optParam(th, 'proc_exe', undefined);
  const proc = lib.realProc(exe === undefined ? {} : { exe });
  const retries = optParam(th, 'lock_retries', undefined);
  const lockOpts = { script: SCRIPT, ce, proc, now: facts.now };
  if (retries !== undefined) lockOpts.retries = retries;

  let work;
  try {
    const lines = await loadLedger(root);
    const bound = await bindPlan(root, lines);
    if (!bound.plan) throw fail('plan-missing', 2, { file: 'plan/analysis-plan.json' });
    if (mode === 'anon' && !bound.frozen) throw fail('plan-not-frozen', 2, { reasons: bound.reasons });
    const armTasks = armTasksOf(bound.plan);
    if (mode === 'score' && scorerAbs && !fs.existsSync(scorerAbs)) throw fail('scorer-transcript-missing', 2, { file: scorerAbs });
    const env = { root, th, lines, bound, plan: bound.plan, armTasks, scorerAbs, tctx: { root, root_t: transcriptsRoot, parsed: new Map() } };
    work = mode === 'anon' ? await computeAnon(env) : await computeScore(env);
    work.bound = bound;
  } catch (e) {
    if (e instanceof lib.TcbError && e.exit === 3 && !NOT_A_REFUSAL.has(e.code) && !dry) await recordTamper({ root, ctx, ce, err: e, now: facts.now, proc, retries });
    throw e;
  }

  if (mode === 'anon') {
    const result = { plan_sha256: work.bound.sha256, items: work.ids, n_items: work.ids.length };
    if (dry) return { exit: 0, mode, dry_run: true, result, reasons: [] };
    return lib.withRunLock(root, lockOpts, async (h) => {
      if (fs.existsSync(work.keyPath) && !sameBytes(work.keyPath, work.key)) {
        throw fail('blind-key-differs', 1, { path: path.relative(root, work.keyPath).split(path.sep).join('/') });
      }
      let changed = !fs.existsSync(work.keyPath);
      for (const [file, text] of work.files) if (!sameBytes(file, text)) changed = true;
      for (const [file, text] of work.files) {
        if (!sameBytes(file, text)) await lib.writeAtomic(file, text);
      }
      if (!fs.existsSync(work.keyPath)) {
        fs.mkdirSync(path.dirname(work.keyPath), { recursive: true });
        await lib.createExclusive(work.keyPath, work.key);
      }
      const led = await lib.readLedger(root);
      const had = led.lines.some((l) => l.kind === 'check' && l.data && l.data.check === 'compare' && l.data.subject === 'anon');
      if (changed || !had) {
        await lib.appendLedger(root, h, { ctx, ce, kind: 'check', data: { check: 'compare', subject: 'anon', result: 'pass', reasons: [] }, now: facts.now });
      }
      return { exit: 0, mode, dry_run: false, result, reasons: [] };
    });
  }

  const { comparison, checkResult } = work;
  const text = `${lib.canonicalize(comparison)}\n`;
  const result = { label: comparison.label, plan_sha256: comparison.plan_sha256, field: comparison.field, n_questions: comparison.n_questions, comparison };
  if (dry) return { exit: 0, mode, dry_run: true, result, reasons: [] };
  const out = path.join(root, 'views', 'comparison.json');
  return lib.withRunLock(root, lockOpts, async (h) => {
    const same = sameBytes(out, text);
    if (!same) await lib.writeAtomic(out, text);
    const led = await lib.readLedger(root);
    const prev = lib.lastLine(led.lines, 'check', (l) => l.data && l.data.check === 'compare' && l.data.subject === 'score');
    if (!same || !prev) {
      await lib.appendLedger(root, h, {
        ctx,
        ce,
        kind: 'check',
        data: { check: 'compare', subject: 'score', result: checkResult, reasons: comparison.reasons.map((code) => ({ code, detail: null })) },
        now: facts.now,
      });
    }
    return { exit: 0, mode, dry_run: false, result, reasons: [] };
  });
}

lib.runMain(import.meta.url, SCRIPT, main);
