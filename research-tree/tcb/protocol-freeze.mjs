// protocol-freeze.mjs (unit U5a). Spec: spec/protocol-freeze.mjs.md; contract: CONTRACT.md (section 1, 3.7, 3.18, 5).
//
// Turns the coordinator's drafts into frozen, hashed, owner-approved files (R33, R39), enforces one owner per
// question key (R46) and splits each field's seed list so half is held out in sealed/ (R35).
//
//   node protocol-freeze.mjs freeze --root <dir> --ce <n> --file plan/protocols/<field>.json
//   node protocol-freeze.mjs amend  --root <dir> --ce <n> --file <protocol or plan/analysis-plan.json> --reason-code <code>
//   node protocol-freeze.mjs plan   --root <dir> --ce <n> --file plan/analysis-plan.json
//
// Everything of the library goes through `lib.*` (CONTRACT section 4). This script reads no clock and no process
// list itself: the ledger time comes from edgeFacts, the lock facts from the library.

import fs from 'node:fs';
import path from 'node:path';
import * as lib from './lib.mjs';

const SCRIPT = 'protocol-freeze';
const MODES = ['freeze', 'amend', 'plan'];
const REASON_CODES = [
  'question-change', 'criteria', 'routes', 'sesoi', 'vocab', 'must-read', 'fixed-files', 'schema-version', 'other',
];
const FIELD_RE = /^(?!(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$)[a-z][a-z0-9]{0,11}$/;
const ANY_KEY_RE = /^[a-z][a-z0-9]{0,11}-[a-z0-9]{1,12}-\d{2,3}$/;
const PLAN_LABEL = 'descriptive, n = 1 per arm';
const ARMS_ALL = ['T', 'R_same', 'R1', 'R2', 'S1', 'S2'];
const ARMS_REQUIRED = ['T', 'R_same', 'R1', 'S1'];
const NOT_A_REFUSAL = new Set(['ledger-broken', 'run-from-attempt', 'lock-lost', 'lock-busy']);

const SPEC = {
  modes: MODES,
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    file: { type: 'string', required: true },
    'reason-code': { type: 'string', required: ['amend'] },
    'rng-seed': { type: 'string' },
    'dry-run': { type: 'bool' },
    now: { type: 'string' },
    'free-mb': { type: 'int' },
    boot: { type: 'string' },
  },
};

/** A decided outcome other than success: exit code, reasons, and whether it is a tamper (exit 3 incident form). */
class Out extends Error {
  constructor(exit, reasons, opts = {}) {
    super(reasons[0] ? reasons[0].code : 'out');
    this.exit = exit;
    this.reasons = reasons;
    this.tamper = Boolean(opts.tamper);
  }
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const clip500 = (s) => String(s === undefined || s === null ? '' : s).slice(0, 500).trim();

function optParam(th, name, fallback) {
  try {
    return th.get(name);
  } catch (e) {
    if (e instanceof lib.TcbError && e.code === 'param-missing') return fallback;
    throw e;
  }
}

// ---------------------------------------------------------------------------------------------- the file argument

function resolveTarget(root, mode, fileArg) {
  const bad = (why) => new lib.TcbError('file-path', 66, { why, file: fileArg });
  if (typeof fileArg !== 'string' || fileArg === '' || fileArg.includes('\0')) throw bad('empty');
  if (fileArg.split(/[\\/]+/).includes('..')) throw bad('dotdot');
  const abs = path.resolve(root, fileArg);
  if (!lib.isUnder(abs, root)) throw bad('outside-root');
  const protoDir = path.join(root, 'plan', 'protocols');
  const planAbs = path.join(root, 'plan', 'analysis-plan.json');
  if (lib.normPath(abs) === lib.normPath(planAbs)) {
    if (mode === 'freeze') throw bad('freeze-wants-a-protocol');
    if (!lib.isUnder(abs, path.join(root, 'plan'))) throw bad('plan-link');
    return { kind: 'plan', abs, name: 'analysis-plan', field: null };
  }
  if (mode === 'plan') throw bad('plan-wants-the-analysis-plan');
  if (lib.normPath(path.dirname(abs)) !== lib.normPath(protoDir)) throw bad('not-under-plan-protocols');
  if (!lib.isUnder(abs, protoDir)) throw bad('link-leaves-folder');
  const base = path.basename(abs);
  if (!base.endsWith('.json')) throw bad('not-json');
  const field = base.slice(0, -5);
  if (!FIELD_RE.test(field)) throw bad('field-name');
  return { kind: 'protocol', abs, name: `protocol-${field}`, field };
}

// ---------------------------------------------------------------------------------------------- the checks

function approvalFieldsOk(draft) {
  const a = draft.approval;
  if (!isObj(a)) return false;
  if (typeof a.quote !== 'string' || a.quote.trim() === '') return false;
  if (typeof a.at !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(a.at) || !Number.isFinite(Date.parse(a.at))) return false;
  return true;
}

function unsafeRelPath(p, protectedPrefixes) {
  if (typeof p !== 'string' || p === '') return true;
  const q = p.replace(/\\/g, '/');
  if (q.startsWith('/') || /^[A-Za-z]:/.test(q)) return true;
  const segs = q.split('/');
  if (segs.some((s) => s === '..' || s === '')) return true;
  const lower = q.toLowerCase();
  for (const pre of protectedPrefixes) {
    const pl = String(pre).replace(/\\/g, '/').toLowerCase();
    if (pl && (lower === pl.replace(/\/$/, '') || lower.startsWith(pl.endsWith('/') ? pl : `${pl}/`))) return true;
  }
  return false;
}

async function readSiblings(protoDir, ownField) {
  const out = new Map();
  if (!fs.existsSync(protoDir)) return out;
  for (const ent of fs.readdirSync(protoDir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.json')) continue;
    const f = ent.name.slice(0, -5);
    if (f === ownField) continue;
    try {
      out.set(f, await lib.readJson(path.join(protoDir, ent.name)));
    } catch (e) {
      throw new Out(2, [{ code: 'sibling-unreadable', detail: { file: ent.name, code: e && e.code ? e.code : 'unparseable' } }]);
    }
  }
  return out;
}

function keyChecks(field, draft, siblings, add) {
  const qids = arr(draft.question_ids);
  const own = new RegExp(`^${field}-[a-z0-9]{1,12}-\\d{2,3}$`);
  const seen = new Set();
  for (const id of qids) {
    if (typeof id !== 'string' || !own.test(id)) {
      add(typeof id === 'string' && ANY_KEY_RE.test(id) ? 'key-prefix' : 'key-format', { id });
    }
    if (seen.has(id)) add('key-duplicate', { id });
    seen.add(id);
    for (const [f, v] of siblings) {
      if (isObj(v) && arr(v.question_ids).includes(id)) add('key-two-owners', { id, other: f });
    }
  }
  for (const cf of arr(draft.cross_field)) {
    const owner = isObj(cf) ? cf.owner_field : undefined;
    const qid = isObj(cf) ? cf.question_id : undefined;
    if (owner === field) {
      add('cross-self', { question_id: qid });
      continue;
    }
    const prefix = typeof qid === 'string' ? qid.split('-')[0] : '';
    if (prefix !== owner) add('key-prefix', { question_id: qid, owner_field: owner });
    const sib = typeof owner === 'string' ? siblings.get(owner) : undefined;
    if (!isObj(sib) || !arr(sib.question_ids).includes(qid)) add('key-no-owner', { question_id: qid, owner_field: owner });
  }
}

async function contentChecks(root, draft, protectedPrefixes, add) {
  const cardSchema = await lib.loadSchema(root, 'card');
  const cardVersion = cardSchema ? cardSchema['x-version'] : undefined;
  if (draft.card_schema_version !== cardVersion) {
    add('card-version', { got: draft.card_schema_version, want: cardVersion === undefined ? null : cardVersion });
  }
  const vocab = isObj(draft.outlist_vocab) ? draft.outlist_vocab : {};
  const measures = arr(vocab.measures);
  const sesoi = isObj(draft.sesoi) ? draft.sesoi : {};
  for (const m of measures) {
    if (!(m in sesoi) || typeof sesoi[m] !== 'number' || !Number.isFinite(sesoi[m])) add('sesoi-missing', { measure: m });
  }
  for (const m of Object.keys(sesoi)) if (!measures.includes(m)) add('sesoi-unknown', { measure: m });
  const codes = new Set();
  const crit = isObj(draft.criteria) ? draft.criteria : {};
  for (const c of [...arr(crit.include), ...arr(crit.exclude)]) {
    const code = isObj(c) ? c.code : undefined;
    if (codes.has(code)) add('criteria-dup', { code });
    codes.add(code);
  }
  for (const f of arr(draft.fixed_files)) {
    if (unsafeRelPath(f, protectedPrefixes)) add('unsafe-path', { path: f });
  }
  for (const m of arr(draft.must_read)) {
    let ok = false;
    try {
      const u = new URL(isObj(m) ? m.url : '');
      ok = u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      ok = false;
    }
    if (!ok) add('bad-url', { url: isObj(m) ? m.url : null });
  }
}

function planChecks(draft, tasksTable, add) {
  if (draft.looks !== 1) add('looks', { looks: draft.looks === undefined ? null : draft.looks });
  if (!Array.isArray(draft.labels) || !draft.labels.includes(PLAN_LABEL)) add('label-missing', { label: PLAN_LABEL });
  const budget = isObj(draft.arm_budget) ? draft.arm_budget : null;
  if (!budget) {
    add('arm-budget', { why: 'not-an-object' });
  } else {
    for (const k of Object.keys(budget)) {
      if (!ARMS_ALL.includes(k)) add('arm-budget', { why: 'unknown-arm', arm: k });
      else if (!Number.isInteger(budget[k]) || budget[k] <= 0) add('arm-budget', { why: 'not-a-positive-integer', arm: k });
    }
    for (const k of ARMS_REQUIRED) if (!(k in budget)) add('arm-budget', { why: 'missing-arm', arm: k });
  }
  if (!Number.isInteger(draft.predicted_total) || draft.predicted_total <= 0) {
    add('predicted-total', { value: draft.predicted_total === undefined ? null : draft.predicted_total });
  }
  if (!Array.isArray(draft.decision_rules) || draft.decision_rules.length === 0) add('decision-rules');
  const armTasks = isObj(draft.arm_tasks) ? draft.arm_tasks : null;
  if (!armTasks) {
    add('arm-tasks', { why: 'not-an-object' });
    return;
  }
  const rows = new Map();
  for (const r of arr(tasksTable && tasksTable.tasks)) if (isObj(r) && typeof r.task === 'string') rows.set(r.task, r);
  for (const [arm, entry] of Object.entries(armTasks)) {
    if (!budget || !(arm in budget)) add('arm-tasks', { why: 'arm-not-in-budget', arm });
    if (!isObj(entry)) {
      add('arm-tasks', { why: 'entry-not-an-object', arm });
      continue;
    }
    for (const [slot, ref] of Object.entries(entry)) {
      if (slot !== 'pack' && slot !== 'review') {
        add('arm-tasks', { why: 'unknown-slot', arm, slot });
        continue;
      }
      const m = typeof ref === 'string' ? /^([a-z][a-z0-9-]{1,39})\.([a-z]+)$/.exec(ref) : null;
      if (!m) {
        add('arm-tasks', { why: 'bad-reference', arm, slot, ref });
        continue;
      }
      const row = rows.get(m[1]);
      if (!row) add('arm-tasks', { why: 'task-not-in-table', arm, slot, ref });
      else if (!arr(row.steps).includes(m[2])) add('arm-tasks', { why: 'step-not-in-task', arm, slot, ref });
    }
  }
}

// ---------------------------------------------------------------------------------------------- the decision

async function decide(env) {
  const { root, mode, target, flags, handle, dry, ctx, ce, facts, reasonCode, protectedPrefixes } = env;
  const { name } = target;
  const reasons = [];
  const add = (code, detail = null) => {
    reasons.push({ code, detail });
  };
  const append = (kind, data) => lib.appendLedger(root, handle, { ctx, ce, kind, data, now: facts.now });

  // 3. the draft (missing or unparseable: 2)
  const draft = await lib.readJson(target.abs);
  if (!isObj(draft)) throw new Out(1, [{ code: 'schema-invalid', detail: 'the draft is not a JSON object' }]);

  // The ledger (a broken chain: 3, nothing written).
  const led = await lib.readLedger(root);
  const verdict = lib.verifyLedger(led.lines);
  if (!verdict.ok) throw new lib.TcbError('ledger-broken', 3, verdict);
  const lines = led.lines;

  // 4. format against the schema
  try {
    await lib.checkFormat(root, target.kind === 'plan' ? 'analysis-plan' : 'protocol', draft);
  } catch (e) {
    if (e instanceof lib.TcbError && e.exit === 1) add(e.code, e.detail === undefined ? null : e.detail);
    else throw e;
  }

  // 5a. the approval fields
  if (!approvalFieldsOk(draft)) add('no-approval');

  if (target.kind === 'protocol' && draft.field !== target.field) {
    add(mode === 'amend' ? 'field-changed' : 'field-name', { field: draft.field === undefined ? null : draft.field, file: target.field });
    throw new Out(1, reasons);
  }

  // 6 and 7. the checks that need the rest of the tree
  let siblings = new Map();
  if (target.kind === 'protocol') {
    siblings = await readSiblings(path.join(root, 'plan', 'protocols'), target.field);
    keyChecks(target.field, draft, siblings, add);
    await contentChecks(root, draft, protectedPrefixes, add);
  } else {
    const tasksPath = path.join(root, 'run', 'tasks.json');
    if (!fs.existsSync(tasksPath)) throw new Out(2, [{ code: 'missing', detail: { file: 'run/tasks.json' } }]);
    planChecks(draft, await lib.readTasks(root), add);
  }

  // 8. the ledger: the name's last freeze or amend line
  let last = null;
  for (const l of lines) {
    if ((l.kind === 'protocol-freeze' || l.kind === 'protocol-amend' || l.kind === 'plan-freeze') && l.data && l.data.name === name) last = l;
  }
  if (mode === 'amend' && !last) add('not-frozen', { name });

  // The seed split and the frozen value.
  let frozenValue = draft;
  let split = null; // {rngSeed, heldout, brief, seedsSha}
  let sealed = null;
  const sealedAbs = target.kind === 'protocol' ? path.join(root, 'sealed', 'heldout', `${target.field}.json`) : null;
  if (target.kind === 'protocol') {
    const uniq = [...new Set(arr(draft.seeds).filter((s) => typeof s === 'string'))].sort();
    const seedsSha = lib.sha256hex(lib.canonicalize(uniq));
    if (fs.existsSync(sealedAbs)) sealed = await lib.readJson(sealedAbs);
    if (mode === 'amend') {
      if (!last) {
        // not-frozen is already listed; there is no split to compare with
      } else if (!sealed) {
        throw new Out(2, [{ code: 'missing', detail: { file: `sealed/heldout/${target.field}.json` } }]);
      } else if (sealed.seeds_sha256 !== seedsSha) {
        add('seeds-changed');
      } else {
        const held = arr(sealed.heldout);
        split = { rngSeed: sealed.rng_seed, heldout: held, brief: uniq.filter((s) => !held.includes(s)), seedsSha };
      }
    } else {
      const normalised = { ...draft, seeds: uniq };
      const rngSeed =
        flags['rng-seed'] !== undefined
          ? flags['rng-seed']
          : sealed && typeof sealed.rng_seed === 'string'
            ? sealed.rng_seed
            : lib.sha256hex(`seed-split:${target.field}:${lib.sha256hex(lib.canonicalize(normalised))}`);
      const shuffled = lib.rng(rngSeed).shuffle(uniq);
      const nHeld = Math.floor(uniq.length / 2);
      const heldout = shuffled.slice(0, nHeld).sort();
      const heldSet = new Set(heldout);
      split = { rngSeed, heldout, brief: uniq.filter((s) => !heldSet.has(s)), seedsSha };
    }
    if (split) frozenValue = { ...draft, seeds: split.brief };
  }

  let bytes = null;
  let sha = null;
  let sha12 = null;
  if (split || target.kind === 'plan') {
    try {
      bytes = lib.canonicalize(frozenValue);
      sha = lib.sha256hex(bytes);
      sha12 = sha.slice(0, 12);
    } catch (e) {
      if (e instanceof lib.TcbError && e.exit === 1) add(e.code, e.detail === undefined ? null : e.detail);
      else throw e;
    }
  }

  const replay = Boolean(last && sha && last.data.sha256 === sha);
  if (mode === 'freeze' && last && sha && !replay) add('already-frozen', { name, frozen: last.data.sha256, new: sha });

  // 5b. the approval must be recorded in the ledger, after the last freeze or amend of the name (not for a replay)
  if (!replay && approvalFieldsOk(draft)) {
    const subject = target.kind === 'plan' ? 'analysis-plan' : `protocol:${target.field}`;
    const want = clip500(draft.approval.quote);
    const after = last ? last.seq : 0;
    const owner = lines.filter(
      (l) => l.kind === 'owner' && l.data && l.data.act === 'approve' && l.data.subject === subject && clip500(l.data.quote) === want && l.seq > after,
    );
    // An owner line that names the content it approved (`draft_sha256`: the sha256 of the canonical draft without its `approval`
    // field) covers only that content (U5-PF-1). A line without the field is the contract's current shape and is not bound.
    let content = null;
    try {
      const { approval: _approval, ...rest } = draft;
      content = lib.sha256hex(lib.canonicalize(rest));
    } catch {
      content = null;
    }
    const covers = (l) => l.data.draft_sha256 === undefined || l.data.draft_sha256 === content;
    if (owner.length === 0) add('approval-unrecorded', { subject, after_seq: after });
    else if (!owner.some(covers)) add('approval-unrecorded', { subject, after_seq: after, why: 'draft-changed-after-approval' });
  }

  if (reasons.length > 0) throw new Out(1, reasons);

  // 9 and 10. the files, and a tampered frozen file
  const frozenRel = `plan/frozen/${name}-${sha12}.json`;
  const frozenAbs = path.join(root, 'plan', 'frozen', `${name}-${sha12}.json`);
  const wantBytes = Buffer.from(bytes, 'utf8');
  if (fs.existsSync(frozenAbs) && !fs.readFileSync(frozenAbs).equals(wantBytes)) {
    throw new Out(3, [{ code: 'frozen-tampered', detail: { path: frozenRel } }], { tamper: true });
  }
  let sealedBytes = null;
  if (target.kind === 'protocol' && mode === 'freeze') {
    sealedBytes = Buffer.from(
      lib.canonicalize({
        schema_version: 1,
        field: target.field,
        protocol_sha256: sha,
        rng_seed: split.rngSeed,
        seeds_sha256: split.seedsSha,
        heldout: split.heldout,
      }),
      'utf8',
    );
    if (fs.existsSync(sealedAbs) && !fs.readFileSync(sealedAbs).equals(sealedBytes)) {
      throw new Out(3, [{ code: 'frozen-tampered', detail: { path: `sealed/heldout/${target.field}.json` } }], { tamper: true });
    }
  }

  const result = {
    name,
    sha256: sha,
    sha12,
    path: frozenRel,
    questions_sha: target.kind === 'protocol' ? lib.questionsSha(arr(draft.question_ids)) : null,
    seed_split: split ? { n_brief: split.brief.length, n_heldout: split.heldout.length, rng_seed: split.rngSeed } : null,
    replay,
    amended: mode === 'amend' && !replay,
  };
  if (dry) return { exit: 0, result, reasons: [] };

  // 11. files first, the ledger last
  fs.mkdirSync(path.dirname(frozenAbs), { recursive: true });
  if (!fs.existsSync(frozenAbs)) await lib.createExclusive(frozenAbs, wantBytes);
  if (sealedBytes && !fs.existsSync(sealedAbs)) {
    fs.mkdirSync(path.dirname(sealedAbs), { recursive: true });
    await lib.createExclusive(sealedAbs, sealedBytes);
  }

  if (replay) {
    if (mode === 'freeze' && !lines.some((l) => l.kind === 'seed-split' && l.data && l.data.field === target.field)) {
      await append('seed-split', { field: target.field, ...result.seed_split });
    }
    return { exit: 0, result, reasons: [] };
  }
  if (mode === 'freeze') {
    await append('protocol-freeze', { name, sha256: sha, path: frozenRel });
    await append('seed-split', { field: target.field, ...result.seed_split });
  } else if (mode === 'amend') {
    await append('protocol-amend', { name, sha256: sha, path: frozenRel, old_sha: last.data.sha256, reason_code: reasonCode });
  } else {
    await append('plan-freeze', { name, sha256: sha, path: frozenRel });
  }
  await append('check', { check: 'protocol-freeze', subject: name, result: 'pass', reasons: [] });
  return { exit: 0, result, reasons: [] };
}

async function refuse(env, out) {
  const { root, mode, target, handle, dry, ctx, ce, facts } = env;
  if (!dry) {
    const codes = out.reasons.map((r) => r.code);
    const detail = out.tamper ? { tamper: true, script: SCRIPT, code: codes[0] } : { script: SCRIPT, mode, codes };
    await lib.recordIncident(root, handle, { ctx, ce, cls: 'refusal', detail, now: facts.now });
    await lib.appendLedger(root, handle, {
      ctx,
      ce,
      kind: 'check',
      data: { check: 'protocol-freeze', subject: target.name, result: out.exit === 2 ? 'not_run' : 'fail', reasons: out.reasons },
      now: facts.now,
    });
  }
  return {
    exit: out.exit,
    result: { name: target.name, sha256: null, sha12: null, path: null, questions_sha: null, seed_split: null, replay: false, amended: false },
    reasons: out.reasons,
  };
}

async function main(ctx) {
  const { mode, flags } = lib.parseArgs(process.argv.slice(2), SPEC);
  const root = path.resolve(flags.root);
  const dry = Boolean(flags['dry-run']);
  const target = resolveTarget(root, mode, flags.file);
  let reasonCode = null;
  if (mode === 'amend') {
    reasonCode = flags['reason-code'];
    if (!REASON_CODES.includes(reasonCode)) throw new lib.TcbError('usage', 66, { flag: 'reason-code', value: reasonCode, allowed: REASON_CODES });
  }
  const th = lib.thresholds(root);
  const protectedPrefixes = arr(th.get('tcb_paths_protected'));
  const facts = lib.edgeFacts(flags);
  const exe = optParam(th, 'proc_exe', undefined);
  const proc = lib.realProc(exe === undefined ? {} : { exe });
  const retries = optParam(th, 'lock_retries', undefined);
  const base = { root, mode, target, flags, dry, ctx, ce: flags.ce, facts, reasonCode, protectedPrefixes };

  const body = async (handle) => {
    const env = { ...base, handle };
    let res;
    try {
      res = await decide(env);
    } catch (e) {
      let out = e;
      if (!(e instanceof Out)) {
        if (e instanceof lib.TcbError && [1, 2, 3].includes(e.exit) && !NOT_A_REFUSAL.has(e.code)) {
          out = new Out(e.exit, [{ code: e.code, detail: e.detail === undefined ? null : e.detail }], { tamper: e.exit === 3 });
        } else {
          throw e;
        }
      }
      res = await refuse(env, out);
    }
    return { ...res, mode, dry_run: dry };
  };

  ctx.mode = mode;
  ctx.dry_run = dry;
  if (dry) {
    await lib.checkCe(root, flags.ce);
    return body(null);
  }
  const opts = { script: SCRIPT, ce: flags.ce, proc, now: facts.now };
  if (retries !== undefined) opts.retries = retries;
  return lib.withRunLock(root, opts, body);
}

lib.runMain(import.meta.url, SCRIPT, main);
