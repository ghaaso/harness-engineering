'use strict';
// Configuration: schema, validation, canonical form and hash (protocol section 6, addendum 2 B and D.15).
// Shared factors, present in every arm's configuration (graph or not): granularity, form, pad, minConf.
// A graph configuration adds direction, classes, traversal, hub and rank (schema in SPEC.md section 9).
// Every configuration is packed at all four token budgets, so a result is a curve, never one point.
// The per-arm sweep lists live in arms/<arm>/sweep.js (exactly 40 stage-1 configurations).
const crypto = require('crypto');
const { CLASSES, KIND_CLASS } = require('./edgeclasses');

const BUDGETS = [2000, 4000, 8000, 16000];
const PPR_ITERS = 40;     // fixed iteration count (deterministic; 0.85^40 = 0.0015 residual at restart 0.15)
const RRF_K = 60;         // reciprocal-rank-fusion constant for hybrids
const FOOTER_RESERVE = 8; // tokens reserved for the "[+N more]" line when not everything fits
const STATE_LIMIT = 8192; // largest automaton state space a budget or metapath configuration may have
const MP_MAX_STEPS = 8;   // metapath: at most 8 steps
const MP_MAX_REPEAT = 6;  // metapath: a step repeats at most 6 times
const BUDGET_MAX = 9;     // per-class budget: at most 9 edges of one class
const SHARED_DEFAULTS = { pad: 'none', minConf: 0.5 };
const FORMS = ['paths', 'signature', 'range', 'snippet'];
const PADS = ['none', 'DIR', 'CO'];
const DIRS = ['dependents', 'dependencies', 'both'];
const STEP_DIRS = ['out', 'in', 'both'];
const RANKS = ['bfs', 'degnorm', 'ppr', 'cochange', 'text', 'hybrid'];

function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
const hash = (o) => crypto.createHash('sha256').update(canon(o)).digest('hex').slice(0, 16);
const fail = (m) => { throw new Error('INVALID CONFIG: ' + m); };
const isInt = (x) => Number.isInteger(x);
const byClassOrder = (a, b) => CLASSES.indexOf(a) - CLASSES.indexOf(b);
const checkClass = (c) => { if (!CLASSES.includes(c)) fail('unknown edge class ' + c); };

// classes an edge kind can belong to (contains is structure or membership by its source kind)
function classesOfKind(k) {
  if (k === 'contains') return ['structure', 'membership'];
  if (!KIND_CLASS[k]) fail('unknown edge kind ' + k);
  return [KIND_CLASS[k]];
}

function budgetStates(budgets) { let m = 1; for (const c of Object.keys(budgets)) m *= budgets[c] + 1; return m; }
function metapathStates(steps) { return steps.reduce((s, x) => s + x.max + 1, 0); }

// Extensions (SPEC.md 9.4): a mode named "x_..." is an arm-specific algorithm (kept verbatim, never
// cross-checked); "variant" (a string) marks an engine's native variant of a specified algorithm
// (E.19), kept in the hash so it is a separate configuration. The reference and relational arms
// refuse both.
const isExt = (m) => typeof m === 'string' && /^x_[a-z0-9_]+$/.test(m);
function withVariant(o, r) {
  if (r.variant !== undefined) { if (typeof r.variant !== 'string' || !r.variant) fail('variant must be a non-empty string'); o.variant = r.variant; }
  return o;
}
function normaliseRank(r) {
  if (r && isExt(r.mode)) return JSON.parse(JSON.stringify(r));
  if (!r || !RANKS.includes(r.mode)) fail('rank.mode must be one of ' + RANKS.join(', ') + ' or an x_ extension');
  if (r.mode === 'ppr') {
    if (!(r.restart > 0 && r.restart < 1)) fail('ppr restart must be in (0, 1)');
    if (!(r.cochange_w >= 0)) fail('ppr cochange_w must be >= 0');
    return withVariant({ mode: 'ppr', restart: r.restart, cochange_w: r.cochange_w }, r);
  }
  if (r.mode === 'hybrid') {
    if (!Array.isArray(r.parts) || r.parts.length < 2) fail('hybrid needs at least two parts');
    return withVariant({ mode: 'hybrid', parts: r.parts.map((p) => { if (p.mode === 'hybrid') fail('nested hybrid'); return normaliseRank(p); }) }, r);
  }
  return withVariant({ mode: r.mode }, r);
}

function normaliseGraph(o) {
  const tr = o.traversal;
  if (!tr || typeof tr !== 'object') fail('traversal must be an object');
  // an arm-only traversal (x_...) may leave direction out; when given it must be valid
  if (!(isExt(tr.mode) && o.direction === undefined) && !DIRS.includes(o.direction)) fail('direction must be one of ' + DIRS.join(', '));
  if (tr.hops === undefined) tr.hops = null;
  if (tr.hops !== null && !(isInt(tr.hops) && tr.hops >= 0)) fail('hops must be a non-negative integer or null');
  if (isExt(tr.mode)) {
    (o.classes || []).forEach(checkClass);
    o.classes = [...new Set(o.classes || [])].sort(byClassOrder);
  } else if (tr.mode === 'khop') {
    o.traversal = withVariant({ mode: 'khop', hops: tr.hops }, tr);
    (o.classes || []).forEach(checkClass);
    o.classes = [...new Set(o.classes || [])].sort(byClassOrder);
  } else if (tr.mode === 'budget') {
    const b = {};
    for (const c of Object.keys(tr.budgets || {}).sort(byClassOrder)) {
      checkClass(c);
      const v = tr.budgets[c];
      if (!(isInt(v) && v >= 1 && v <= BUDGET_MAX)) fail('budget for ' + c + ' must be an integer 1..' + BUDGET_MAX);
      b[c] = v;
    }
    if (!Object.keys(b).length) fail('budget mode needs at least one class budget');
    const n = budgetStates(b);
    if (n > STATE_LIMIT) fail('budget state space ' + n + ' exceeds the limit ' + STATE_LIMIT);
    o.traversal = withVariant({ mode: 'budget', hops: tr.hops, budgets: b }, tr);
    o.classes = Object.keys(b);
  } else if (tr.mode === 'metapath') {
    if (!Array.isArray(tr.steps) || tr.steps.length < 1 || tr.steps.length > MP_MAX_STEPS) fail('metapath needs 1..' + MP_MAX_STEPS + ' steps');
    const steps = tr.steps.map((s, j) => {
      const classes = [...new Set(s.classes || [])].sort(byClassOrder); classes.forEach(checkClass);
      const kinds = [...new Set(s.kinds || [])].sort(); kinds.forEach(classesOfKind);
      if (!classes.length && !kinds.length) fail('metapath step ' + j + ' matches nothing');
      const dir = s.dir || 'both';
      if (!STEP_DIRS.includes(dir)) fail('metapath step dir must be out, in or both');
      const min = s.min === undefined ? 1 : s.min; const max = s.max === undefined ? 1 : s.max;
      if (!(isInt(min) && isInt(max) && min >= 0 && max >= 1 && min <= max && max <= MP_MAX_REPEAT)) fail('metapath step ' + j + ' repeat range must satisfy 0 <= min <= max, 1 <= max <= ' + MP_MAX_REPEAT);
      return { classes, kinds, dir, min, max };
    });
    const n = metapathStates(steps);
    if (n > STATE_LIMIT) fail('metapath state space ' + n + ' exceeds the limit ' + STATE_LIMIT);
    const emit = tr.emit || 'all';
    if (!['all', 'end'].includes(emit)) fail('metapath emit must be all or end');
    o.traversal = withVariant({ mode: 'metapath', hops: tr.hops, emit, steps }, tr);
    const u = new Set();
    for (const s of steps) { s.classes.forEach((c) => u.add(c)); s.kinds.forEach((k) => classesOfKind(k).forEach((c) => u.add(c))); }
    o.classes = [...u].sort(byClassOrder);
  } else fail('traversal.mode must be khop, budget, metapath or an x_ extension');
  const h = o.hub || { mode: 'none' };
  if (h.mode === 'indeg') { if (!(isInt(h.k) && h.k >= 0)) fail('hub k must be a non-negative integer'); o.hub = { mode: 'indeg', k: h.k }; }
  else if (h.mode === 'transport' || h.mode === 'none') o.hub = { mode: h.mode };
  else fail('hub.mode must be none, indeg or transport');
  o.rank = normaliseRank(o.rank);
  return o;
}

// Canonical form: defaults filled, lists sorted, the display name removed. Throws on an invalid
// configuration (the same rejection in every arm, so no arm silently runs something else).
function normalise(c) {
  const o = JSON.parse(JSON.stringify(c));
  delete o.name;
  for (const [k, v] of Object.entries(SHARED_DEFAULTS)) if (o[k] === undefined) o[k] = v;
  if (!['file', 'symbol'].includes(o.granularity)) fail('granularity must be file or symbol');
  if (!FORMS.includes(o.form)) fail('form must be one of ' + FORMS.join(', '));
  if (!PADS.includes(o.pad)) fail('pad must be one of ' + PADS.join(', '));
  if (!(typeof o.minConf === 'number' && o.minConf >= 0 && o.minConf <= 1)) fail('minConf must be a number in [0, 1]');
  if (o.traversal) normaliseGraph(o);
  return o;
}
const configHash = (c) => hash(normalise(c));
// The part that decides the ranked node list (output granularity, form and padding do not).
const rankKey = (c) => { const o = normalise(c); delete o.granularity; delete o.form; delete o.pad; return canon(o); };

// Ordered-metapath automaton (SPEC.md section 6). A state is (j, c): inside step j after c edges of it.
// moves(j, c) = the (k, nc) an arc may lead to: k = j (nc = c + 1) while c < max_j; and k > j
// (nc = 1) when c >= min_j and every step strictly between j and k has min 0.
function metapathMoves(steps) {
  const S = steps.length; const out = [];
  for (let j = 0; j < S; j++) {
    for (let c = 0; c <= steps[j].max; c++) {
      if (c < steps[j].max) out.push({ j, c, k: j, nc: c + 1 });
      if (c >= steps[j].min) {
        for (let k = j + 1; k < S; k++) {
          out.push({ j, c, k, nc: 1 });
          if (steps[k].min > 0) break; // a later step needs this one to be taken
        }
      }
    }
  }
  return out;
}
// accepting states: c >= min_j and every later step has min 0
function metapathAccepting(steps) {
  const S = steps.length; const out = [];
  for (let j = 0; j < S; j++) {
    let tailOptional = true; for (let k = j + 1; k < S; k++) if (steps[k].min > 0) tailOptional = false;
    if (!tailOptional) continue;
    for (let c = steps[j].min; c <= steps[j].max; c++) out.push({ j, c });
  }
  return out;
}

// Throws when a configuration uses an extension or a native variant (the reference and relational
// arms implement the specification only).
function specOnly(cfg) {
  const tr = cfg.traversal || {}; const rk = cfg.rank || {};
  const parts = rk.mode === 'hybrid' ? [rk, ...rk.parts] : [rk];
  if (isExtension(cfg)) throw new Error('configuration uses an extension or native variant; this arm implements the specification only');
}
// true when a configuration uses an x_ mode or a native variant anywhere (never cross-checked; the
// sweep runs it only on the arm whose list holds it)
function isExtension(cfg) {
  const tr = cfg.traversal || {}; const rk = cfg.rank || {};
  const parts = rk.mode === 'hybrid' ? [rk, ...(rk.parts || [])] : [rk];
  return !!(isExt(tr.mode) || tr.variant || parts.some((p) => isExt(p.mode) || p.variant));
}

module.exports = {
  specOnly,
  BUDGETS, PPR_ITERS, RRF_K, FOOTER_RESERVE, STATE_LIMIT, MP_MAX_STEPS, MP_MAX_REPEAT, BUDGET_MAX, SHARED_DEFAULTS,
  FORMS, PADS, canon, hash, normalise, configHash, rankKey, metapathMoves, metapathAccepting, budgetStates,
  metapathStates, classesOfKind, isExt, isExtension,
};
