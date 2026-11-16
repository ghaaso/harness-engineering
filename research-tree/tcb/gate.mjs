// gate.mjs (unit U5a). Spec: spec/gate.mjs.md; contract: CONTRACT.md (section 1, 3.4, 3.7, 3.11, 3.19, 3.20, 5).
//
//   node gate.mjs cut   --root <dir> --ce <n> --design <path> [--dry-run]
//   node gate.mjs check --root <dir> --ce <n> [--dry-run]
//
// `cut` writes the design cut the two blind analysts read (R54). `check` decides whether admission may proceed: the matrix is
// full, every problem id has a row, every high hazard is covered or accepted on the owner's quoted word, the protocol model
// passes and the owner's action lines hold (R55, R45). The verdict is bound to the sha256 of the cut and of the hazards
// object. Missing inputs are not_run, never pass (R40). The design-check schemas (stpa, fmea, hazards) live in
// tcb/schemas/ beside this script's behaviours (spec "Design-check schemas").

import fs from 'node:fs';
import path from 'node:path';
import * as lib from './lib.mjs';

const SCRIPT = 'gate';
const MODES = ['cut', 'check'];
const SPEC = {
  modes: MODES,
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    design: { type: 'string', required: ['cut'] },
    'dry-run': { type: 'bool' },
    now: { type: 'string' },
    'free-mb': { type: 'int' },
    boot: { type: 'string' },
  },
};

const CUT_HEADER = '# Design cut (layout, role table, script lists, rule texts)';
const KEEP_SECTIONS = [1, 2, 3, 4, 5, 6, 7];
const CLASSICAL = '**Where the classical assumptions fail.**';
const ID_RE = /\b[PNGDK][0-9]{1,2}(-[0-9]{1,2})?\b/g;
const SEED_RE = /^s_[0-9a-f]{16}$/;
const UCA_TYPES = ['N', 'U', 'T', 'D'];
const KIND_COLS = {
  component: ['crash', 'amnesia', 'omission', 'timing', 'wrong_value', 'common_cause', 'fabrication', 'injected_text', 'agrees_with_brief'],
  data: ['dirty_write', 'dirty_read', 'non_repeatable_read', 'phantom', 'lost_update', 'read_skew', 'write_skew', 'torn_write', 'stale_derived', 'mutable_identity'],
  flow: ['spoofing', 'tampering', 'repudiation', 'information_disclosure', 'denial_of_service', 'elevation_of_privilege'],
};
const ROLES = { stpa: { step: 'stpa', kind: 'stpa' }, fmea: { step: 'fmea', kind: 'fmea' }, mapper: { step: 'hazards', kind: 'hazards' } };
const NOT_A_REFUSAL = new Set(['ledger-broken', 'run-from-attempt', 'lock-lost', 'lock-busy']);

const fail = (code, exit, detail) => new lib.TcbError(code, exit, detail);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const blank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const sorted = (s) => [...s].sort();

function optParam(th, name, fallback) {
  try {
    return th.get(name);
  } catch (e) {
    if (e instanceof lib.TcbError && e.code === 'param-missing') return fallback;
    throw e;
  }
}

// ---------------------------------------------------------------------------------------------- cut

function tidyLine(line) {
  const lead = /^\s*/.exec(line)[0];
  let r = line.slice(lead.length);
  for (let i = 0; i < 8; i += 1) {
    const before = r;
    r = r.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '');
    r = r.replace(/,(\s*,)+/g, ',');
    r = r.replace(/([(\[])\s*,\s*/g, '$1');
    r = r.replace(/\s*,\s*([)\]])/g, '$1');
    r = r.replace(/\s*,\s*\./g, '.');
    r = r.replace(/([(\[])\s+/g, '$1').replace(/\s+([)\]])/g, '$1');
    r = r.replace(/\s+([,.;])/g, '$1');
    r = r.replace(/ {2,}/g, ' ');
    if (r === before) break;
  }
  return lead + r.replace(/\s+$/, '');
}

/** The design cut of a design text (spec "Steps: cut" 2-5). */
function buildCut(raw) {
  const text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const sections = new Map();
  let cur = null;
  for (const line of text.split('\n')) {
    const m = /^## (\d+)\. /.exec(line);
    if (m) {
      cur = Number(m[1]);
      if (!sections.has(cur)) sections.set(cur, []);
    }
    if (cur !== null) sections.get(cur).push(line);
  }
  let kept = [];
  for (const n of KEEP_SECTIONS) {
    if (!sections.has(n)) throw fail('section-missing', 2, { section: n });
    kept = kept.concat(sections.get(n));
  }
  const s10 = sections.get(10);
  if (!s10) throw fail('section-missing', 2, { section: 10 });
  const from = s10.findIndex((l) => l.startsWith('**Scripts**'));
  if (from < 0) throw fail('section-missing', 2, { section: 10, block: 'Scripts' });
  let to = s10.findIndex((l, i) => i > from && l.startsWith('**Files:**'));
  if (to < 0) to = s10.length;
  kept = kept.concat([s10[0], ''], s10.slice(from, to));

  const noClassical = [];
  for (let i = 0; i < kept.length; i += 1) {
    if (kept[i].startsWith(CLASSICAL)) {
      while (i < kept.length && kept[i].trim() !== '') i += 1;
      continue;
    }
    noClassical.push(kept[i]);
  }
  let removed = 0;
  const cleaned = noClassical.map((line) => {
    let n = 0;
    const t = line.replace(ID_RE, () => {
      n += 1;
      return '';
    });
    if (n === 0) return line;
    removed += n;
    return tidyLine(t);
  });
  const body = cleaned.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
  return { text: `${CUT_HEADER}\n\n${body}\n`, idsRemoved: removed, sections: [...KEEP_SECTIONS, 10] };
}

// ---------------------------------------------------------------------------------------------- the check

function paramEntries(th) {
  let a = th.all;
  if (isObj(a) && isObj(a.params)) a = a.params;
  if (Array.isArray(a)) return a.filter(isObj).map((x) => [x.name, x]);
  return isObj(a) ? Object.entries(a) : [];
}

async function candidatesOf(root, role, tasks, lines, getVerified) {
  const { step, kind } = ROLES[role];
  const out = [];
  for (const row of arr(tasks.tasks)) {
    if (!isObj(row) || row.stage !== 'design-check' || row.role !== role || row.state !== 'committed') continue;
    const recPath = path.join(root, 'store', 'commits', `${row.task}.${step}.json`);
    if (!fs.existsSync(recPath)) continue;
    const rec = await lib.readJson(recPath);
    for (const o of arr(rec && rec.outputs)) if (isObj(o) && SEED_RE.test(String(o.id))) throw fail('seed-id', 3, { id: o.id });
    const o = arr(rec && rec.outputs).find((x) => isObj(x) && x.kind === kind);
    if (!o) continue;
    const value = await getVerified(o);
    let seq = 0;
    for (const l of lines) if (l.kind === 'commit' && l.task === row.task && l.data && l.data.step === step && l.seq > seq) seq = l.seq;
    out.push({ row, rec, id: o.id, value, seq, epoch: rec.epoch });
  }
  return out;
}

function stpaChecks(stpa, F, D) {
  const have = new Set(arr(stpa.ucas).map((u) => `${u.action_id}|${u.type}`));
  let missing = 0;
  const lacking = [];
  for (const c of arr(stpa.controllers)) {
    for (const a of arr(c.actions)) {
      for (const t of UCA_TYPES) {
        if (!have.has(`${a.id}|${t}`)) {
          missing += 1;
          lacking.push(`${a.id}/${t}`);
        }
      }
    }
  }
  if (missing) {
    F.add('stpa-type-missing');
    D.set('stpa-type-missing', lacking);
  }
  return missing;
}

function fmeaChecks(fmea, F, D) {
  const rowKind = new Map();
  const kinds = new Set();
  const unknownRows = [];
  for (const r of arr(fmea.rows)) {
    if (isObj(r) && KIND_COLS[r.kind]) {
      rowKind.set(r.row_id, r.kind);
      kinds.add(r.kind);
    } else {
      unknownRows.push(isObj(r) ? r.row_id : null);
    }
  }
  if (unknownRows.length) {
    F.add('fmea-row-unknown');
    D.set('fmea-row-unknown', unknownRows);
  }
  const noKind = Object.keys(KIND_COLS).filter((k) => !kinds.has(k));
  if (noKind.length) {
    F.add('fmea-kind-missing');
    D.set('fmea-kind-missing', noKind);
  }
  const seen = new Map();
  let empty = 0;
  const add = (code, what) => {
    F.add(code);
    if (!D.has(code)) D.set(code, []);
    D.get(code).push(what);
  };
  for (const c of arr(fmea.cells)) {
    if (!isObj(c)) continue;
    const key = `${c.row_id}/${c.col}`;
    if (!rowKind.has(c.row_id)) {
      add('fmea-row-unknown', key);
      continue;
    }
    if (!KIND_COLS[rowKind.get(c.row_id)].includes(c.col)) {
      add('fmea-column-unknown', key);
      continue;
    }
    seen.set(key, (seen.get(key) || 0) + 1);
    if (seen.get(key) > 1) add('fmea-cell-dup', key);
    const noFinding = blank(c.finding);
    const noReason = blank(c.na_reason);
    if (noFinding && noReason) {
      add('fmea-cell-empty', key);
      empty += 1;
    } else if (!noFinding && !noReason) {
      add('fmea-cell-both', key);
    }
  }
  for (const [rid, kind] of rowKind) {
    for (const col of KIND_COLS[kind]) {
      if (!seen.has(`${rid}/${col}`)) {
        add('fmea-cell-empty', `${rid}/${col}`);
        empty += 1;
      }
    }
  }
  return empty;
}

async function evaluate(env) {
  const { root, th, lines, tasks, getVerified, getOptional } = env;
  const F = new Set();
  const N = new Set();
  const D = new Map();
  const detail = (code, v) => D.set(code, v);

  // 2. the cut
  const cutLine = lib.lastLine(lines, 'cut');
  const cutSha = cutLine && cutLine.data && typeof cutLine.data.sha === 'string' ? cutLine.data.sha : null;
  if (!cutSha) {
    N.add('cut-missing');
  } else {
    const file = path.join(root, 'completeness', `cut-${cutSha.slice(0, 12)}.md`);
    if (!fs.existsSync(file)) N.add('cut-missing');
    else if (lib.sha256hex(fs.readFileSync(file)) !== cutSha) F.add('cut-mismatch');
  }

  // 3. the three roles' current outputs
  const chosen = {};
  for (const role of Object.keys(ROLES)) {
    const cands = await candidatesOf(root, role, tasks, lines, getVerified);
    const current = cands.filter((c) => cutSha && isObj(c.value) && c.value.cut_sha === cutSha);
    if (cands.length === 0) N.add(`${role}-missing`);
    else if (current.length === 0) N.add(`${role}-stale`);
    else chosen[role] = current.reduce((best, c) => (c.seq > best.seq ? c : best), current[0]);
  }

  // The hazards object and its sha come from the library's own choice (lib.currentDesign).
  let hazards = chosen.mapper ? chosen.mapper.value : null;
  let hazardsSha = hazards ? lib.sha256hex(lib.canonicalize(hazards)) : null;
  if (chosen.mapper) {
    const cd = await lib.currentDesign(root);
    if (cd && cd.hazards_id) {
      hazards = (await getOptional(cd.hazards_id)) || chosen.mapper.value;
      hazardsSha = cd.hazards_sha || lib.sha256hex(lib.canonicalize(hazards));
    }
  }

  // 4. audit lines for the stpa and fmea tasks
  for (const role of ['stpa', 'fmea']) {
    const c = chosen[role];
    if (!c) continue;
    let audit = null;
    for (const l of lines) if (l.kind === 'audit' && l.task === c.row.task && l.epoch === c.epoch) audit = l;
    if (!audit) N.add('audit-missing');
    else if (!audit.data || audit.data.label !== 'clean') F.add('analysis-tainted');
  }

  // 5. the rules
  let emptyCells = 0;
  const stpa = chosen.stpa ? chosen.stpa.value : null;
  const fmea = chosen.fmea ? chosen.fmea.value : null;
  if (stpa) emptyCells += stpaChecks(stpa, F, D);
  if (fmea) emptyCells += fmeaChecks(fmea, F, D);
  const matrixFull = Boolean(stpa && fmea) && !['stpa-type-missing', 'fmea-kind-missing', 'fmea-cell-empty', 'fmea-cell-both', 'fmea-cell-dup', 'fmea-row-unknown', 'fmea-column-unknown'].some((c) => F.has(c));

  let pMissing = [];
  let highUncovered = [];
  if (isObj(hazards)) {
    const hz = arr(hazards.hazards).filter(isObj);
    const ids = new Set(hz.map((h) => h.hazard_id));
    const mapEntries = arr(hazards.map).filter(isObj);
    const mapped = new Set(mapEntries.filter((m) => isObj(m.source)).map((m) => `${m.source.kind}:${m.source.id}`));
    const unmapped = [];
    if (stpa) for (const u of arr(stpa.ucas)) if (isObj(u) && u.hazardous === true && !mapped.has(`uca:${u.uca_id}`)) unmapped.push(`uca:${u.uca_id}`);
    if (fmea) for (const c of arr(fmea.cells)) if (isObj(c) && !blank(c.finding) && !mapped.has(`cell:${c.row_id}/${c.col}`)) unmapped.push(`cell:${c.row_id}/${c.col}`);
    if (unmapped.length) {
      F.add('unmapped-findings');
      detail('unmapped-findings', unmapped);
    }
    const bad = [];
    for (const m of mapEntries) {
      if (!ids.has(m.hazard_id)) bad.push(m.hazard_id);
      if (!blank(m.alt_hazard_id) && !ids.has(m.alt_hazard_id)) bad.push(m.alt_hazard_id);
    }
    if (bad.length) {
      F.add('map-hazard-missing');
      detail('map-hazard-missing', bad);
    }
    // append-only along the parent chain
    let child = hazards;
    const seen = new Set();
    const dropped = [];
    while (isObj(child) && typeof child.parent === 'string' && !seen.has(child.parent)) {
      seen.add(child.parent);
      const parent = await getOptional(child.parent);
      if (!isObj(parent)) {
        N.add('hazards-parent-missing');
        break;
      }
      const childIds = new Set(arr(child.hazards).map((h) => h.hazard_id));
      for (const ph of arr(parent.hazards)) if (isObj(ph) && !childIds.has(ph.hazard_id)) dropped.push(ph.hazard_id);
      child = parent;
    }
    if (dropped.length) {
      F.add('hazards-not-append-only');
      detail('hazards-not-append-only', dropped);
    }
    // every problem id has a row
    const pset = new Set();
    for (const h of hz) for (const p of arr(h.p_ids)) pset.add(p);
    for (let i = 1; i <= 21; i += 1) if (!pset.has(`P${i}`)) pMissing.push(`P${i}`);
    if (pMissing.length) {
      F.add('p-id-missing');
      detail('p-id-missing', pMissing);
    }
    // every high hazard is covered or accepted on the owner's word
    const accepted = new Set(
      lines.filter((l) => l.kind === 'owner' && l.data && l.data.act === 'accept' && typeof l.data.subject === 'string').map((l) => l.data.subject),
    );
    for (const h of hz) {
      if (h.severity !== 'high') continue;
      const covered = h.status === 'covered' && arr(h.covered_by).length > 0;
      if (!covered && !accepted.has(`hazard:${h.hazard_id}`)) highUncovered.push(h.hazard_id);
    }
    highUncovered = sorted(new Set(highUncovered));
    if (highUncovered.length) {
      F.add('high-uncovered');
      detail('high-uncovered', highUncovered);
    }
  }

  // 6. the protocol model
  let model = 'not_run';
  let modelSha = null;
  const modelPath = path.join(root, 'completeness', 'model', 'result.json');
  if (!fs.existsSync(modelPath)) {
    N.add('model-missing');
  } else {
    let mv = null;
    try {
      mv = await lib.readJson(modelPath);
    } catch (e) {
      if (!(e instanceof lib.TcbError)) throw e;
    }
    if (isObj(mv) && typeof mv.sha === 'string') modelSha = mv.sha;
    if (isObj(mv) && mv.result === 'pass') model = 'pass';
    else if (isObj(mv) && mv.result === 'fail') {
      model = 'fail';
      F.add('model-fail');
    } else if (isObj(mv) && mv.result === 'not_run') N.add('model-not-run');
    else N.add('model-unreadable');
  }

  // 7. the owner's action lines
  const actionLines = [];
  let measures;
  const readMeasures = async () => {
    if (measures !== undefined) return measures;
    measures = null;
    const p = path.join(root, 'views', 'measures.json');
    if (fs.existsSync(p)) {
      try {
        const v = await lib.readJson(p);
        if (isObj(v) && isObj(v.values)) measures = v.values;
      } catch (e) {
        if (!(e instanceof lib.TcbError)) throw e;
      }
    }
    return measures;
  };
  for (const [name, p] of paramEntries(th)) {
    const line = isObj(p) ? p.line : null;
    if (!isObj(line) || typeof line.measure !== 'string') continue;
    const value = th.get(name);
    const rec = { measure: line.measure, line: value };
    if (!th.isGate(name)) {
      actionLines.push({ ...rec, result: 'reading' });
      continue;
    }
    const vals = await readMeasures();
    const m = vals ? vals[line.measure] : null;
    if (typeof m !== 'number' || !Number.isFinite(m)) {
      N.add('measure-missing');
      actionLines.push({ ...rec, result: 'reading' });
      continue;
    }
    const ok = line.op === 'max' ? m <= value : m >= value;
    if (!ok) F.add('action-line-fail');
    actionLines.push({ ...rec, value: m, result: ok ? 'pass' : 'fail' });
  }

  // 8. the result
  const result = F.size > 0 ? 'fail' : N.size > 0 ? 'not_run' : 'pass';
  const reasons = sorted(new Set([...F, ...N]));
  const gate = {
    schema_version: 1,
    cut_sha: cutSha,
    hazards_sha: hazardsSha,
    matrix: { full: matrixFull, empty_cells: emptyCells },
    p_ids_missing: pMissing,
    high_uncovered: highUncovered,
    model,
    action_lines: actionLines,
    result,
    reasons,
  };
  if (modelSha !== null) gate.model_result_sha = modelSha;
  return { gate, details: Object.fromEntries(D) };
}

// ---------------------------------------------------------------------------------------------- main

const sameBytes = (file, text) => fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text;

async function cutBody(env) {
  const { root, designAbs, dry, handle, ctx, ce, facts } = env;
  let raw;
  try {
    raw = fs.readFileSync(designAbs, 'utf8');
  } catch {
    throw fail('missing', 2, { file: designAbs });
  }
  const built = buildCut(raw);
  const bytes = Buffer.from(built.text, 'utf8');
  const sha = lib.sha256hex(bytes);
  const rel = `completeness/cut-${sha.slice(0, 12)}.md`;
  const abs = path.join(root, 'completeness', `cut-${sha.slice(0, 12)}.md`);
  const led = await lib.readLedger(root);
  const v = lib.verifyLedger(led.lines);
  if (!v.ok) throw fail('ledger-broken', 3, v);
  if (fs.existsSync(abs) && !fs.readFileSync(abs).equals(bytes)) throw fail('cut-tampered', 3, { path: rel });
  const result = { cut_sha: sha, path: rel, sections_kept: built.sections, ids_removed: built.idsRemoved, bytes: bytes.length };
  if (dry) return { exit: 0, result, reasons: [] };
  if (!fs.existsSync(abs)) {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    await lib.createExclusive(abs, bytes);
  }
  const last = lib.lastLine(led.lines, 'cut');
  if (!last || !last.data || last.data.sha !== sha) {
    await lib.appendLedger(root, handle, { ctx, ce, kind: 'cut', data: { sha }, now: facts.now });
  }
  return { exit: 0, result, reasons: [] };
}

async function checkBody(env) {
  const { root, th, dry, handle, ctx, ce, facts } = env;
  const led = await lib.readLedger(root);
  const v = lib.verifyLedger(led.lines);
  if (!v.ok) throw fail('ledger-broken', 3, v);
  const lines = led.lines;
  const tasks = await lib.readTasks(root);
  const getOptional = async (id) => {
    if (typeof id === 'string' && SEED_RE.test(id)) throw fail('seed-id', 3, { id });
    try {
      return await lib.getObject(root, id);
    } catch (e) {
      if (e instanceof lib.TcbError && e.code === 'missing') return null;
      throw e;
    }
  };
  const getVerified = async (o) => {
    const val = await lib.getObject(root, o.id);
    if (lib.sha256hex(lib.canonicalize(val)) !== o.sha256) throw fail('object-mismatch', 3, { id: o.id });
    return val;
  };
  const { gate, details } = await evaluate({ root, th, lines, tasks, getVerified, getOptional });
  const exit = gate.result === 'pass' ? 0 : gate.result === 'fail' ? 1 : 2;
  const reasons = gate.reasons.map((code) => ({ code, detail: Object.prototype.hasOwnProperty.call(details, code) ? details[code] : null }));
  const result = { ...gate, details };
  if (dry) return { exit, result, reasons };

  const file = path.join(root, 'completeness', 'gate.json');
  const text = `${lib.canonicalize(gate)}\n`;
  const same = sameBytes(file, text);
  const hasGateLine = lines.some((l) => l.kind === 'gate');
  if (!same) await lib.writeAtomic(file, text);
  if (!same || !hasGateLine) {
    await lib.appendLedger(root, handle, {
      ctx,
      ce,
      kind: 'check',
      data: { check: 'gate', subject: gate.cut_sha ? gate.cut_sha.slice(0, 12) : 'none', result: gate.result, reasons },
      now: facts.now,
    });
    await lib.appendLedger(root, handle, {
      ctx,
      ce,
      kind: 'gate',
      data: { result: gate.result, cut_sha: gate.cut_sha, hazards_sha: gate.hazards_sha },
      now: facts.now,
    });
    if (gate.result !== 'pass') {
      await lib.recordIncident(root, handle, {
        ctx,
        ce,
        cls: gate.result === 'not_run' ? 'not-run' : 'refusal',
        detail: gate.reasons,
        now: facts.now,
      });
    }
  }
  return { exit, result, reasons };
}

async function main(ctx) {
  const { mode, flags } = lib.parseArgs(process.argv.slice(2), SPEC);
  const root = path.resolve(flags.root);
  const dry = Boolean(flags['dry-run']);
  const ce = flags.ce;
  let designAbs = null;
  if (mode === 'cut') {
    designAbs = path.resolve(root, flags.design);
    if (lib.isUnder(designAbs, path.join(root, 'wt'))) throw fail('file-path', 66, { flag: 'design', why: 'under wt/' });
  }
  const th = lib.thresholds(root);
  const facts = lib.edgeFacts(flags);
  const exe = optParam(th, 'proc_exe', undefined);
  const proc = lib.realProc(exe === undefined ? {} : { exe });
  const retries = optParam(th, 'lock_retries', undefined);
  ctx.mode = mode;
  ctx.dry_run = dry;

  const body = async (handle) => {
    const env = { root, th, designAbs, dry, handle, ctx, ce, facts };
    let res;
    try {
      res = mode === 'cut' ? await cutBody(env) : await checkBody(env);
    } catch (e) {
      if (!dry && e instanceof lib.TcbError && e.exit === 3 && !NOT_A_REFUSAL.has(e.code)) {
        await lib.recordIncident(root, handle, { ctx, ce, cls: 'refusal', detail: { tamper: true, script: SCRIPT, code: e.code }, now: facts.now });
      }
      throw e;
    }
    return { ...res, mode, dry_run: dry };
  };
  if (dry) {
    await lib.checkCe(root, ce);
    return body(null);
  }
  const opts = { script: SCRIPT, ce, proc, now: facts.now };
  if (retries !== undefined) opts.retries = retries;
  return lib.withRunLock(root, opts, body);
}

lib.runMain(import.meta.url, SCRIPT, main);
