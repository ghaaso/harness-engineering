// cost.mjs (unit U5b): prices the shape of the research tree before and after the pilot.
// Spec: spec/cost.mjs.md. Formats: CONTRACT §3.7 (meter, unit-costs), §3.20, §3.22 [unit-costs], §4.8.
// Modes:
//   compute          the cost.js model (hand-over interval k*, window W*, n_max, F1 price, fan-out, bulk load,
//                    load control, admission factor, Smith's order). Reads one inputs file, writes nothing.
//   predict          R53: a stated prediction of the pilot's tokens over every arm, marked stand-in while the
//                    inputs are guesses. Read-only.
//   from-transcripts R52: unit costs measured from the pilot's transcripts -> plan/unit-costs.json.
// Tokens are counted, never money: the weighted figures use the dimensionless ratios in the inputs' `weights`.
// The model's own functions are exported (pure, nothing happens on import).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lib from './lib.mjs';

const SCRIPT = 'cost';
const HERE = path.dirname(fileURLToPath(import.meta.url));

const ARG_SPEC = {
  modes: ['compute', 'predict', 'from-transcripts'],
  flags: {
    root: { type: 'string', required: ['predict', 'from-transcripts'] },
    ce: { type: 'int', required: ['from-transcripts'] },
    inputs: { type: 'string' },
    text: { type: 'bool' },
    g: { type: 'string' },
    'child-form': { type: 'string' },
    s2: { type: 'bool' },
    actual: { type: 'string' },
    'transcripts-root': { type: 'string' },
    'dry-run': { type: 'bool' },
    now: { type: 'string' },
  },
};
// Flags a mode does not take are a usage error (66), whatever parseArgs let through.
const MODE_ONLY = {
  ce: ['from-transcripts'],
  text: ['compute'],
  g: ['predict'],
  'child-form': ['predict'],
  s2: ['predict'],
  actual: ['predict'],
  'transcripts-root': ['from-transcripts'],
  inputs: ['compute', 'predict'],
};

const fail = (code, exit, detail) => new lib.TcbError(code, exit, detail);

// ---------------------------------------------------------------------------------------------
// Rounding for machine output: the precision cost.js prints (k to 1 decimal, tokens to 100, counts to 10,000,
// ratios to 2 decimals). Non-finite figures are null, never NaN.
const fin = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const rd = (x, d) => (fin(x) === null ? null : Number(x.toFixed(d)));
const rK = (x) => (fin(x) === null ? null : Math.round(Number((x / 1000).toFixed(1)) * 10) * 100);
const rM = (x) => (fin(x) === null ? null : Math.round(Number((x / 1e6).toFixed(2)) * 100) * 10000);
const K = (x) => (x / 1000).toFixed(1) + 'k';
const M = (x) => (x / 1e6).toFixed(2) + 'M';

// ---------------------------------------------------------------------------------------------
// Inputs: reading and validation (spec "Inputs file").

const TAGS = new Set(['M', 'E', 'G', 'I']);
const KEY_RE = /^[A-Za-z][A-Za-z0-9]{0,11}-[A-Za-z0-9]{1,12}-\d{2,3}$/;
const SECTIONS = ['coordinator', 'child', 'review', 'weights', 'packing', 'concurrency', 'admission', 'order'];

class InputError extends Error {
  constructor(p, why) {
    super(`${p}: ${why}`);
    this.path = p;
    this.why = why;
  }
}

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const isWrapped = (n) => isObj(n) && 'v' in n;

// The value of `node` ({v, tag, src} or a bare value) and the path that names it.
function unwrap(node, p) {
  if (node === undefined) throw new InputError(p, 'missing');
  if (isWrapped(node)) {
    if (!('tag' in node)) throw new InputError(`${p}.tag`, 'missing tag');
    return [node.v, `${p}.v`];
  }
  return [node, p];
}
function numAt(node, p, { pos = false, max = Infinity, min = 0 } = {}) {
  const [v, pp] = unwrap(node, p);
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new InputError(pp, 'not a finite number');
  if (v < min) throw new InputError(pp, 'negative');
  if (pos && v <= 0) throw new InputError(pp, 'not positive');
  if (v > max) throw new InputError(pp, `above ${max}`);
  return v;
}
function arrAt(node, p, each) {
  const [v, pp] = unwrap(node, p);
  if (!Array.isArray(v) || v.length === 0) throw new InputError(pp, 'not a non-empty array');
  v.forEach((x, i) => each(x, `${pp}[${i}]`));
  return v;
}
function needObj(node, p) {
  if (!isObj(node)) throw new InputError(p, 'missing or not an object');
  return node;
}

// Walk every object: a `tag` anywhere must be M, E, G or I. Returns the tags met.
function scanTags(node, p, acc) {
  if (Array.isArray(node)) {
    node.forEach((x, i) => scanTags(x, `${p}[${i}]`, acc));
  } else if (isObj(node)) {
    if ('tag' in node) {
      if (typeof node.tag !== 'string' || !TAGS.has(node.tag)) throw new InputError(`${p}.tag`, 'tag not one of M, E, G, I');
      acc.push(node.tag);
    }
    for (const [k, v] of Object.entries(node)) scanTags(v, p ? `${p}.${k}` : k, acc);
  }
  return acc;
}

export function validateInputs(I) {
  if (!isObj(I)) throw new InputError('(root)', 'not an object');
  if ('schema_version' in I && I.schema_version !== 1) throw new InputError('schema_version', 'unknown version');
  for (const s of SECTIONS) if (!isObj(I[s])) throw new InputError(s, 'missing or not an object');
  const tags = scanTags(I, '', []);

  const C = I.coordinator;
  for (const f of ['P', 'S', 'hc', 'o', 'qf', 'w', 'fixed_line']) numAt(C[f], `coordinator.${f}`);
  numAt(C.g, 'coordinator.g', { pos: true });
  if (C.sigma !== undefined) numAt(C.sigma, 'coordinator.sigma');
  arrAt(C.recorded_avg_per_call, 'coordinator.recorded_avg_per_call', (x, p) => numAt(x, p));

  const Ch = I.child;
  for (const f of ['P', 'S0', 'sigma', 'hc', 'o', 'qf', 'w']) numAt(Ch[f], `child.${f}`);
  numAt(Ch.n, 'child.n', { min: 1, max: 10000 });
  numAt(Ch.W_quality, 'child.W_quality', { pos: true });
  arrAt(Ch.g_sweep, 'child.g_sweep', (x, p) => numAt(x, p, { pos: true }));

  const R = I.review;
  for (const f of ['pack', 'n_rev', 'R_rev']) numAt(R[f], `review.${f}`);
  numAt(R.g_rev, 'review.g_rev', { pos: true });

  for (const f of ['read', 'write', 'out']) numAt(I.weights[f], `weights.${f}`);

  const Pk = I.packing;
  numAt(Pk.f, 'packing.f', { pos: true, max: 1 });
  numAt(Pk.C_node, 'packing.C_node', { pos: true });
  numAt(Pk.A_leaf, 'packing.A_leaf', { pos: true });
  const [qs, qp] = unwrap(Pk.questions, 'packing.questions');
  if (!Array.isArray(qs)) throw new InputError(qp, 'not an array');
  qs.forEach((q, i) => {
    const pp = `${qp}[${i}]`;
    if (!isObj(q)) throw new InputError(pp, 'not an object');
    if (typeof q.id !== 'string' || !KEY_RE.test(q.id)) throw new InputError(`${pp}.id`, 'not a question key');
    numAt(q.t, `${pp}.t`);
    numAt(q.k, `${pp}.k`);
  });

  const Cc = I.concurrency;
  for (const f of ['N_cap', 'free_mb', 'reserve_mb']) numAt(Cc[f], `concurrency.${f}`);
  numAt(Cc.rss_mb, 'concurrency.rss_mb', { pos: true });
  arrAt(Cc.s_sweep, 'concurrency.s_sweep', (x, p) => numAt(x, p, { max: 1 }));

  const A = I.admission;
  for (const f of ['z', 'between_field_cv2', 'm_owner', 'remaining_in_pilot_units', 'theta']) numAt(A[f], `admission.${f}`);

  const [ord, op] = unwrap(I.order, 'order');
  if (!Array.isArray(ord)) throw new InputError(op, 'not an array');
  ord.forEach((x, i) => {
    const pp = `${op}[${i}]`;
    if (!isObj(x)) throw new InputError(pp, 'not an object');
    if (typeof x.field !== 'string' || x.field === '') throw new InputError(`${pp}.field`, 'not a non-empty string');
    numAt(x.w, `${pp}.w`);
    numAt(x.est, `${pp}.est`, { pos: true });
  });
  return { stand_in: tags.some((t) => t !== 'M') };
}

// Reads and validates an inputs file. Any failure is exit 2 `input-invalid` naming the path of the first bad value.
export function loadInputs(file) {
  let I;
  try {
    I = lib.readJson(file);
  } catch (e) {
    if (e instanceof lib.TcbError) throw new InputError(file, `unreadable: ${e.code}`);
    throw e;
  }
  const { stand_in } = validateInputs(I);
  return { I, stand_in };
}

const val = (o) => (o && typeof o === 'object' && !Array.isArray(o) && 'v' in o ? o.v : o);
const section = (o) => Object.fromEntries(Object.entries(o).map(([a, b]) => [a, val(b)]));

// ---------------------------------------------------------------------------------------------
// The model (cost.js, unchanged). A session's call i in an epoch reads W_i = P + S + g*i tokens. An epoch of k
// work calls is followed by hc hand-over calls at the full window, then the successor spends o orientation calls
// and qf failed calls at P+S, and w tokens are written once. Per work call:
//   c(k) = (P+S) + g(k-1)/2 + hc*g + H0/k,  H0 = (hc+o+qf)(P+S) + w,  so k* = sqrt(2*H0/g).

export const H0of = (p) => (p.hc + p.o + p.qf) * (p.P + p.S) + p.w;
export const kstar = (p) => Math.sqrt((2 * H0of(p)) / p.g);
const H0cost = (p, W8) => W8.read * (p.hc + p.o + p.qf) * (p.P + p.S) + W8.write * p.S + W8.out * p.w;
const kstarCost = (p, W8) => Math.sqrt((2 * H0cost(p, W8)) / (W8.read * p.g));

// Simulate n work calls with a hand-over every k calls (k = Infinity: one session). State grows by sigma per epoch.
export function simulate(n, p, k, Wcap, W8) {
  let count = 0;
  let cost = 0;
  let done = 0;
  let epoch = 0;
  let handovers = 0;
  let maxW = 0;
  let thrashAt = null;
  while (done < n) {
    const S = p.S0 + p.sigma * epoch;
    // k === 'adaptive': the square-root law re-applied each epoch from the state actually reloaded (rule 6):
    // with state growing sigma per epoch the law becomes k* = sqrt((2*H0 + sigma*n_remaining)/g).
    const kk = k === 'adaptive'
      ? Math.max(2, Math.round(Math.sqrt((2 * ((p.hc + p.o + p.qf) * (p.P + S) + p.w) + p.sigma * (n - done)) / p.g)))
      : k;
    const len = Math.min(kk, n - done);
    if (epoch > 0) {
      // successor start: orientation and failed calls, state written to cache once
      count += (p.o + p.qf) * (p.P + S);
      cost += W8.read * (p.o + p.qf) * (p.P + S) + W8.write * S;
      if (thrashAt === null && S >= p.g * kk) thrashAt = epoch;
    }
    for (let i = 0; i < len; i++) {
      const W = p.P + S + p.g * i;
      count += W;
      cost += W8.read * W + W8.write * p.g;
      if (W > maxW) maxW = W;
    }
    done += len;
    if (done < n) {
      // hand-over calls at the full window, then the brief
      const Wend = p.P + S + p.g * len;
      count += p.hc * Wend + p.w;
      cost += W8.read * p.hc * Wend + W8.out * p.w;
      handovers++;
    }
    epoch++;
  }
  return { count, cost, handovers, maxW, overCap: Wcap ? maxW > Wcap : false, thrashAt };
}

function bestK(n, p, Wcap, key, W8) {
  let best = null;
  for (let k = 2; k <= n; k++) {
    const r = simulate(n, p, k, null, W8);
    if (Wcap && r.maxW > Wcap) continue;
    if (!best || r[key] < best.r[key]) best = { k, r };
  }
  return best;
}

// All quantities of cost.js at full precision. `I` has been validated.
export function computeModel(I) {
  const W8 = { read: val(I.weights.read), write: val(I.weights.write), out: val(I.weights.out) };
  const out = {};

  // [1] Coordinator
  const C = section(I.coordinator);
  const pc = { P: C.P, S: C.S, g: C.g, hc: C.hc, o: C.o, qf: C.qf, w: C.w };
  const kc = kstar(pc);
  const Wc = pc.P + pc.S + pc.g * kc;
  const per = (p, k) => p.P + p.S + (p.g * (k - 1)) / 2 + p.hc * p.g + H0of(p) / k;
  const k200 = (C.fixed_line - pc.P - pc.S) / pc.g;
  const pcScript = Object.assign({}, pc, { w: 0 });
  const kc0 = kstar(pcScript);
  const kcc = kstarCost(pc, W8);
  const rowTok = 200; // G: tokens per status row
  out.coordinator = {
    C, H0: H0of(pc), kstar: kc, Wstar: Wc, perStar: per(pc, kc), k200, per200: per(pc, k200),
    avg: C.recorded_avg_per_call,
    script: { kstar: kc0, Wstar: pcScript.P + pcScript.S + pcScript.g * kc0 },
    weighted: { kstar: kcc, Wstar: pc.P + pc.S + pc.g * kcc },
    fanoutRows: Math.floor((Wc - pc.P - pc.S) / rowTok),
  };

  // [2] Research child
  const Ch = section(I.child);
  out.Ch = Ch;
  out.child = [];
  for (const g of Ch.g_sweep) {
    const p = { P: Ch.P, S: Ch.S0, S0: Ch.S0, sigma: Ch.sigma, g, hc: Ch.hc, o: Ch.o, qf: Ch.qf, w: Ch.w };
    const k = kstar(p);
    const kC = kstarCost(p, W8);
    const one = simulate(Ch.n, p, Infinity, Ch.W_quality, W8);
    const bc = bestK(Ch.n, p, null, 'count', W8);
    const bk = bestK(Ch.n, p, null, 'cost', W8);
    const atStar = simulate(Ch.n, p, Math.max(2, Math.round(k)), Ch.W_quality, W8);
    let nmin = null; // smallest n at which handing over at k* beats one session on count
    for (let n = 2; n <= 2000; n++) {
      if (simulate(n, p, Math.max(2, Math.round(k)), null, W8).count < simulate(n, p, Infinity, null, W8).count) { nmin = n; break; }
    }
    const adaptive = simulate(Ch.n, p, 'adaptive', Ch.W_quality, W8);
    const kGrowth = Math.sqrt((2 * H0of(p) + p.sigma * Ch.n) / g);
    const nMax = Math.floor((kGrowth * (g * kGrowth - p.S0)) / p.sigma);
    out.child.push({
      g, p, k, kC, Wk: p.P + p.S + g * k, WkC: p.P + p.S + g * kC, one, bc, bk, atStar, adaptive, kGrowth, nMax, nmin,
      ratioCount: one.count / atStar.count, ratioCost: one.cost / atStar.cost,
    });
  }

  // [3] F1: review in the researching session vs a fresh reviewer from the frozen pack
  const R = section(I.review);
  out.R = R;
  out.review = [];
  for (const g of Ch.g_sweep) {
    const p = { P: Ch.P, S0: Ch.S0, sigma: Ch.sigma, g, hc: Ch.hc, o: Ch.o, qf: Ch.qf, w: Ch.w };
    const same = simulate(Ch.n + R.n_rev, p, Infinity, null, W8);
    const k = Math.max(2, Math.round(kstar(Object.assign({ S: Ch.S0 }, p))));
    const research = simulate(Ch.n, p, k, null, W8);
    const rev = simulate(R.n_rev, { P: Ch.P, S0: R.pack, sigma: 0, g: R.g_rev, hc: 0, o: 0, qf: 0, w: 0 }, Infinity, null, W8);
    out.review.push({ g, same, research, rev, total: research.count + rev.count, ratio: same.count / (research.count + rev.count) });
  }
  out.reviewerCapacity = Ch.W_quality - Ch.P - R.R_rev;

  // [4] Token fan-out (D3-12), g = 2.8k
  {
    const p = { P: Ch.P, S: Ch.S0, g: 2800, hc: Ch.hc, o: Ch.o, qf: Ch.qf, w: Ch.w };
    const k = kstar(p);
    out.fanout = { g: 2800, kOpt: Ch.n / k, epochCalls: Number(k.toFixed(0)), k };
  }

  // [5] Bulk load (D2-01) in key order, mechanism group = atomic unit, leaf full at f on either axis
  {
    const Pk = section(I.packing);
    const f = Pk.f;
    const Ccap = Pk.C_node;
    const Acap = Pk.A_leaf;
    const groups = [];
    for (const q of Pk.questions) {
      const gid = q.id.split('-').slice(0, 2).join('-');
      let gr = groups.find((x) => x.id === gid);
      if (!gr) groups.push((gr = { id: gid, t: 0, k: 0, qs: [] }));
      gr.t += q.t;
      gr.k += q.k;
      gr.qs.push(q.id);
    }
    const tot = groups.reduce((a, g) => ({ t: a.t + g.t, k: a.k + g.k }), { t: 0, k: 0 });
    const minLeaves = Math.max(Math.ceil(tot.t / (f * Acap)), Math.ceil(tot.k / (f * Ccap)));
    const leaves = [];
    let cur = null;
    for (const gr of groups) {
      if (gr.t > f * Acap || gr.k > f * Ccap) {
        leaves.push({ groups: [gr.id], t: gr.t, k: gr.k, flag: 'oversized group: out-of-line pack, or owner splits the group' });
        cur = null;
        continue;
      }
      if (!cur || cur.t + gr.t > f * Acap || cur.k + gr.k > f * Ccap) {
        cur = { groups: [], t: 0, k: 0 };
        leaves.push(cur);
      }
      cur.groups.push(gr.id);
      cur.t += gr.t;
      cur.k += gr.k;
    }
    out.packing = { f, Acap, Ccap, tot, minLeaves, leaves };
  }

  // [6] Concurrency (D3-03 load control, D3-11 Amdahl)
  {
    const Cc = section(I.concurrency);
    const Nmem = Math.floor((Cc.free_mb - Cc.reserve_mb) / Cc.rss_mb);
    const N = Math.max(0, Math.min(Cc.N_cap, Nmem));
    const speedup = Cc.s_sweep.map((s) => {
      const S = (n) => 1 / (s + (1 - s) / n);
      return { s, S1: S(1), S2: S(2), S3: S(3), gain: S(3) - S(2) };
    });
    out.concurrency = { Cc, Nmem, N, speedup };
  }

  // [7] Admission from the internal pilot (D6-13, D1-08, D3-04)
  {
    const A = section(I.admission);
    const factor = 1 + Math.max(A.m_owner, A.z * Math.sqrt(A.between_field_cv2));
    out.admission = { A, factor, maxFields: Math.floor(A.remaining_in_pilot_units / factor) };
  }

  // [8] Order of work (D3-14 Smith's rule with aging)
  out.order = val(I.order).map((x) => ({ ...x, pr: x.w / x.est })).sort((a, b) => b.pr - a.pr);
  out.W8 = W8;
  return out;
}

// The text of cost.js, section by section (the format is kept).
export function reportText(m, base) {
  const lines = [];
  const log = (s) => lines.push(s);
  const c = m.coordinator;
  const Ch = m.Ch;
  const R = m.R;
  log('== cost.mjs output, inputs: ' + base + ' ==');
  log('\n[1] Coordinator (count): H0=' + K(c.H0) + ' k*=' + c.kstar.toFixed(1) + ' calls  W*=' + K(c.Wstar) +
    '  tokens per work call at k*=' + K(c.perStar) + '  at the 200k line (k=' + c.k200.toFixed(0) + ')=' + K(c.per200) +
    '  recorded main-session average=' + c.avg.map(K).join('-'));
  log('    with a script-written status (w=0): k*=' + c.script.kstar.toFixed(1) + ' W*=' + K(c.script.Wstar));
  log('    coordinator (weighted cost): k*=' + c.weighted.kstar.toFixed(1) + ' W*=' + K(c.weighted.Wstar) +
    '  (cost optimum hands over later than the count optimum)');
  log('    root fan-out capacity (rows of ~200 tokens that fit between P+S and W*): ' + c.fanoutRows +
    '  -> no inner level is ever needed for 7-10 fields');

  log('\n[2] Research child, n=' + Ch.n + ' work calls, state grows ' + K(Ch.sigma) + ' per epoch, quality cap ' + K(Ch.W_quality));
  for (const e of m.child) {
    const { g, p, one, bc, bk, atStar, adaptive } = e;
    log('  g=' + K(g) + ': k*=' + e.k.toFixed(1) + ' W*=' + K(e.Wk) + ' | cost k*=' + e.kC.toFixed(1) + ' W*=' + K(e.WkC) +
      ' | one session: ' + M(one.count) + ' (window reaches ' + K(one.maxW) + (one.overCap ? ', OVER the quality cap' : '') + ')' +
      ' | hand-over at k*: ' + M(atStar.count) + ', ' + atStar.handovers + ' hand-overs' +
      (atStar.thrashAt !== null ? ', reload >= useful growth from epoch ' + atStar.thrashAt + ' (split, do not hand over)' : '') +
      ' | best constant k by simulation: count k=' + (bc ? bc.k : 'n/a') + ' ' + (bc ? M(bc.r.count) : 'n/a') + ', cost k=' + (bk ? bk.k : 'n/a') +
      ' | adaptive k (law re-applied each epoch): ' + M(adaptive.count) + ', ' + adaptive.handovers + ' hand-overs, max window ' + K(adaptive.maxW) +
      (adaptive.thrashAt !== null ? ', reload >= growth from epoch ' + adaptive.thrashAt : '') +
      ' | law with state growth k*=' + e.kGrowth.toFixed(1) +
      ' | leaf capacity before reload thrash n_max=k*(g*k*-S0)/sigma=' + e.nMax + ' calls' +
      ' | ratio one/hand-over (count)=' + e.ratioCount.toFixed(2) + ' (weighted)=' + e.ratioCost.toFixed(2) +
      ' | break-even: hand-over pays from n=' + e.nmin + ' calls');
  }

  log('\n[3] F1 token price (count), n=' + Ch.n + ' research + ' + R.n_rev + ' review calls');
  for (const e of m.review) {
    log('  g=' + K(e.g) + ': same session ' + M(e.same.count) + ' (window ' + K(e.same.maxW) + ')  vs  hand-over research ' + M(e.research.count) +
      ' + fresh reviewer ' + M(e.rev.count) + ' (window ' + K(e.rev.maxW) + ') = ' + M(e.total) + '  ratio ' + e.ratio.toFixed(2));
  }
  log('  reviewer node capacity for the pack: W_quality - P - R_rev = ' + K(m.reviewerCapacity));

  log('\n[4] Token fan-out (D3-12), g=2.8k: k_opt = n/k* = ' + m.fanout.kOpt.toFixed(1) + ' windows of ~' + m.fanout.k.toFixed(0) +
    ' calls for n=' + Ch.n + '. These are window epochs, sequential or parallel; they are not fields.');

  const pk = m.packing;
  log('\n[5] Bulk load (illustrative key set), f=' + pk.f + ': spend ' + (pk.tot.t / pk.Acap).toFixed(2) + ' pack ' + (pk.tot.k / pk.Ccap).toFixed(2) +
    ' of one leaf; lower bound ' + pk.minLeaves + ' leaves; packed into ' + pk.leaves.length);
  pk.leaves.forEach((l, i) => log('  leaf ' + (i + 1) + ': ' + l.groups.join(',') + '  spend ' + (l.t / pk.Acap).toFixed(2) + '  pack ' + (l.k / pk.Ccap).toFixed(2) +
    (l.flag ? '  ' + l.flag : '') + (i > 0 ? '  separator key: ' + l.groups[0] : '') +
    (l.t < 0.5 * pk.f * pk.Acap && l.k < 0.5 * pk.f * pk.Ccap ? '  UNDERFLOW (below half of f): report to owner' : '')));

  const cc = m.concurrency;
  log('\n[6] Load control: N_mem=' + cc.Nmem + '  N=min(cap ' + cc.Cc.N_cap + ', N_mem)=' + cc.N);
  for (const x of cc.speedup) {
    log('  s=' + x.s + ': S(1..3)=' + [x.S1, x.S2, x.S3].map((v) => v.toFixed(2)).join(' ') + '  gain of the third slot ' + x.gain.toFixed(2) +
      ' (time only; tokens never fall with N)');
  }

  const ad = m.admission;
  log('\n[7] Admission: escrow per field = estimate x ' + ad.factor.toFixed(2) + ' until two fields are measured; with ' + ad.A.remaining_in_pilot_units +
    ' pilot-units left, at most ' + ad.maxFields + ' pilot-sized fields can be reserved at once; in-run re-plan when actual/estimate > ' + ad.A.theta);

  log('\n[8] Order after the pilot (w/est, highest first): ' + m.order.map((x) => x.field + '(' + x.pr.toFixed(2) + ')').join(' > '));
  return lines.join('\n');
}

// The numbers of `result` for `compute`.
export function computeResult(m, standIn) {
  const c = m.coordinator;
  return {
    coordinator: {
      H0: rK(c.H0),
      k_star: rd(c.kstar, 1),
      W_star: rK(c.Wstar),
      per_call_at_kstar: rK(c.perStar),
      per_call_at_200k: rK(c.per200),
      script_status: { k_star: rd(c.script.kstar, 1), W_star: rK(c.script.Wstar) },
      weighted: { k_star: rd(c.weighted.kstar, 1), W_star: rK(c.weighted.Wstar) },
      fanout_rows: c.fanoutRows,
    },
    child: m.child.map((e) => ({
      g: e.g,
      k_star: rd(e.k, 1),
      W_star: rK(e.Wk),
      cost: { k_star: rd(e.kC, 1), W_star: rK(e.WkC) },
      one_session: { count: rM(e.one.count), max_window: rK(e.one.maxW), over_cap: e.one.overCap },
      handover_at_kstar: { count: rM(e.atStar.count), handovers: e.atStar.handovers, thrash_at: e.atStar.thrashAt },
      best_k: {
        count: e.bc ? { k: e.bc.k, count: rM(e.bc.r.count) } : null,
        cost: e.bk ? { k: e.bk.k } : null,
      },
      adaptive: { count: rM(e.adaptive.count), handovers: e.adaptive.handovers, max_window: rK(e.adaptive.maxW), thrash_at: e.adaptive.thrashAt },
      k_star_with_growth: rd(e.kGrowth, 1),
      n_max: fin(e.nMax),
      ratio: { count: rd(e.ratioCount, 2), weighted: rd(e.ratioCost, 2) },
      break_even_n: e.nmin,
    })),
    review: m.review.map((e) => ({
      g: e.g,
      same_session: { count: rM(e.same.count), max_window: rK(e.same.maxW) },
      research: { count: rM(e.research.count) },
      fresh_review: { count: rM(e.rev.count), max_window: rK(e.rev.maxW) },
      total: rM(e.total),
      ratio: rd(e.ratio, 2),
    })),
    reviewer_capacity: rK(m.reviewerCapacity),
    fanout: { g: m.fanout.g, k_opt: rd(m.fanout.kOpt, 1), epoch_calls: m.fanout.epochCalls },
    packing: {
      f: m.packing.f,
      totals: { t: rd(m.packing.tot.t, 2), k: rd(m.packing.tot.k, 2), spend: rd(m.packing.tot.t / m.packing.Acap, 2), pack: rd(m.packing.tot.k / m.packing.Ccap, 2) },
      lower_bound_leaves: m.packing.minLeaves,
      leaves: m.packing.leaves.map((l, i) => ({
        groups: l.groups,
        t: rd(l.t, 2),
        k: rd(l.k, 2),
        spend: rd(l.t / m.packing.Acap, 2),
        pack: rd(l.k / m.packing.Ccap, 2),
        ...(l.flag ? { flag: l.flag } : {}),
        separator: i > 0 ? l.groups[0] : null,
        underflow: l.t < 0.5 * m.packing.f * m.packing.Acap && l.k < 0.5 * m.packing.f * m.packing.Ccap,
      })),
    },
    concurrency: {
      N_mem: m.concurrency.Nmem,
      N: m.concurrency.N,
      speedup: m.concurrency.speedup.map((x) => ({ s: x.s, S1: rd(x.S1, 2), S2: rd(x.S2, 2), S3: rd(x.S3, 2), gain_third: rd(x.gain, 2) })),
    },
    admission: { factor: rd(m.admission.factor, 2), max_fields: m.admission.maxFields, theta: m.admission.A.theta },
    order: m.order.map((x) => ({ field: x.field, ratio: rd(x.pr, 2) })),
    stand_in: standIn,
  };
}

// ---------------------------------------------------------------------------------------------
// predict (R53).

export function predictModel(I, { g, form, s2 }) {
  const m = computeModel(I);
  const W8 = m.W8;
  const Ch = m.Ch;
  const R = m.R;
  const p = { P: Ch.P, S0: Ch.S0, sigma: Ch.sigma, g, hc: Ch.hc, o: Ch.o, qf: Ch.qf, w: Ch.w };
  const Wcap = Ch.W_quality;
  const nCap = Math.floor((Wcap - p.P - p.S0) / g) + 1;
  const nSession = Math.max(0, Math.min(Ch.n, nCap));
  const nRev = R.n_rev;
  const kSt = Math.max(2, Math.round(kstar(Object.assign({ S: Ch.S0 }, p))));
  const S1 = simulate(nSession, p, Infinity, null, W8).count;
  let T;
  let Rsame;
  if (form === 'a') {
    T = S1;
    Rsame = simulate(nSession + nRev, p, Infinity, null, W8).count - T; // the review continues T's window
  } else {
    T = simulate(Ch.n, p, kSt, null, W8).count;
    Rsame = 0;
  }
  const revP = { P: Ch.P, S0: R.pack, sigma: 0, g: R.g_rev, hc: 0, o: 0, qf: 0, w: 0 };
  const R1 = simulate(nRev, revP, Infinity, null, W8).count;
  const R2 = R1;
  const arms = { T, R_same: Rsame, R1, R2, S1 };
  if (s2) arms.S2 = S1;
  const total = T + Rsame + R1 + R2 + S1 + (s2 ? S1 : 0);
  const oneSession = simulate(Ch.n + nRev, p, Infinity, null, W8).count;
  const tree = simulate(Ch.n, p, kSt, null, W8).count + R1;
  const ci = m.concurrency;
  const speed = ci.Cc.s_sweep.map((s) => {
    const N = Math.max(0, Math.min(ci.Cc.N_cap, ci.Nmem));
    return { s, N, speedup: rd(1 / (s + (1 - s) / N), 2) };
  });
  return { arms, total, nCap, form, g, oneSession, tree, speed };
}

// ---------------------------------------------------------------------------------------------
// from-transcripts (R52): unit costs from the pilot's transcripts.

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}
function sampleSd(a) {
  if (a.length < 2) return null;
  const mu = mean(a);
  return Math.sqrt(a.reduce((x, y) => x + (y - mu) * (y - mu), 0) / (a.length - 1));
}
const sortedKeys = (o) => Object.keys(o).sort();

function weightedOf(s, W) {
  return s.input + W.read * s.cache_read + W.write * s.cache_write + W.out * s.output;
}
const pathKey = (p) => path.resolve(p).toLowerCase();
const fileOf = (x) => (typeof x === 'string' ? x : x?.path);

async function parseAll(list, W) {
  // Sequential on purpose: one parse at a time keeps memory flat; nothing here holds the run lock.
  for (const s of list) {
    const parsed = await lib.parseTranscript(s.file);
    const calls = Array.isArray(parsed.calls) ? parsed.calls : [];
    const sp = lib.spendOf([parsed]);
    s.parsed = parsed;
    s.calls = calls;
    s.tokens = {
      calls: calls.length,
      input: sp.input || 0,
      cache_read: sp.cache_read || 0,
      cache_write: sp.cache_write || 0,
      output: sp.output || 0,
      total: sp.total || 0,
    };
    s.weighted = weightedOf(s.tokens, W);
  }
}

async function readLedgerSafe(root) {
  try {
    const led = await lib.readLedger(root);
    return led?.lines || [];
  } catch (e) {
    if (e instanceof lib.TcbError && (e.code === 'missing' || e.exit === 2)) return [];
    throw e;
  }
}

// Collects every transcript of the run: the coordinator's, each attempt's and each helper's.
async function discover({ root, table, coord, troot }) {
  const sessions = []; // {file, role, task, epoch, helper, agentType}
  const seen = new Set();
  const missing = [];
  const leads = {}; // task -> epoch -> session record (first main transcript)
  const add = (file, rec) => {
    const k = pathKey(file);
    if (seen.has(k)) return null;
    seen.add(k);
    const s = { file, ...rec };
    sessions.push(s);
    return s;
  };
  const addHelpers = (helpers, rec) => {
    for (const h of helpers || []) {
      const file = fileOf(h);
      if (!file) continue;
      let agentType = null;
      try {
        const meta = lib.readJson(file.replace(/\.jsonl$/i, '.meta.json'));
        if (meta && typeof meta.agentType === 'string' && meta.agentType !== '') agentType = meta.agentType;
      } catch {
        agentType = null;
      }
      add(file, { ...rec, helper: true, agentType: agentType || 'unknown', role: `helper:${agentType || 'unknown'}` });
    }
  };

  if (coord && typeof coord.session === 'string' && coord.session) {
    const st = await lib.sessionTranscripts(troot, coord.session);
    if (st?.main) add(fileOf(st.main), { role: 'coord', task: null, epoch: null, helper: false });
    addHelpers(st?.helpers, { task: null, epoch: null });
  }

  const rows = [...table.tasks].sort((a, b) => (a.task < b.task ? -1 : a.task > b.task ? 1 : 0));
  let attempts = 0;
  for (const row of rows) {
    const epochs = (row.attempts || []).map((a) => a.epoch).sort((a, b) => a - b);
    for (const e of epochs) {
      attempts++;
      const att = lib.attemptOf(row, e);
      const mains = [];
      const helpers = [];
      if (att.session) {
        const st = await lib.sessionTranscripts(troot, att.session);
        if (st?.main) mains.push({ sessionId: att.session, path: fileOf(st.main) });
        helpers.push(...(st?.helpers || []));
      }
      if (!mains.length) {
        const found = (await lib.transcriptsForFolder(troot, path.join(root, 'wt', `${row.task}-e${e}`))) || [];
        for (const f of found) {
          mains.push({ sessionId: f.sessionId, path: f.path });
          helpers.push(...((await lib.sessionTranscripts(troot, f.sessionId))?.helpers || []));
        }
      }
      if (!mains.length) missing.push({ task: row.task, epoch: e });
      const rec = { task: row.task, epoch: e };
      for (const mn of mains) {
        const s = add(mn.path, { ...rec, role: row.role, helper: false });
        if (s) {
          leads[row.task] ||= {};
          leads[row.task][e] ||= s;
        }
      }
      addHelpers(helpers, rec);
    }
  }
  return { sessions, missing, leads, rows, attempts };
}

function readCommits(root) {
  // store/commits/<task>.<step>.json -> {commits: {task: {step: record}}, unreadable: [{task, step}]}
  const dir = path.join(root, 'store', 'commits');
  const out = {};
  const unreadable = [];
  let names = [];
  try {
    names = fs.readdirSync(dir).sort();
  } catch {
    return { commits: out, unreadable };
  }
  for (const name of names) {
    const m = /^([^.]+)\.([^.]+)\.json$/.exec(name);
    if (!m) continue;
    try {
      const rec = lib.readJson(path.join(dir, name));
      (out[m[1]] ||= {})[m[2]] = rec;
    } catch {
      // an unreadable commit record gives no cards; it is reported, not dropped silently (U5-K-1)
      unreadable.push({ task: m[1], step: m[2] });
    }
  }
  return { commits: out, unreadable };
}

function cardsOf(root, taskCommits, bad = []) {
  // unique committed card ids of a task, in record order, with the stored card. A card is read through its commit record:
  // the object's bytes must hash to its name and to the record's sha256. A card that fails either is not counted and is
  // pushed to `bad` (the caller marks the run untrusted: t_q and k_q would shift without a trace, U5-K-1).
  const ids = [];
  const shaOf = new Map();
  for (const step of sortedKeys(taskCommits || {})) {
    for (const o of taskCommits[step]?.outputs || []) {
      if (o && o.kind === 'card' && typeof o.id === 'string' && !ids.includes(o.id)) {
        ids.push(o.id);
        shaOf.set(o.id, o.sha256);
      }
    }
  }
  const cards = [];
  for (const id of ids) {
    try {
      const value = lib.getObject(root, id);
      if (lib.sha256hex(lib.canonicalize(value)) !== shaOf.get(id)) throw new Error('record sha256 differs');
      cards.push({ id, value, bytes: Buffer.byteLength(lib.canonicalize(value), 'utf8') });
    } catch {
      bad.push(id);
    }
  }
  return cards;
}

function buildRoles(sessions, leads, rows) {
  const byRole = {};
  for (const s of sessions) (byRole[s.role] ||= []).push(s);
  const roles = {};
  const roleP = {};
  for (const role of sortedKeys(byRole)) {
    const ss = byRole[role];
    const withCalls = ss.filter((s) => s.calls.length > 0);
    if (!withCalls.length) continue;
    // P is the prefix a session starts with. A successor attempt (epoch >= 2) starts with the reloaded state as well, so
    // it is left out of P whenever the role has a session that is not one; S0 and sigma below are measured from it.
    const base = withCalls.filter((s) => s.helper || s.epoch == null || s.epoch < 2);
    const P = median((base.length ? base : withCalls).map((s) => s.calls[0].context));
    roleP[role] = P;
    const gs = [];
    let compactions = 0;
    for (const s of ss) {
      const pos = [];
      for (let i = 1; i < s.calls.length; i++) {
        const d = s.calls[i].context - s.calls[i - 1].context;
        if (d < 0) compactions++;
        else if (d > 0) pos.push(d);
      }
      if (s.calls.length >= 5 && pos.length) gs.push(mean(pos));
    }
    roles[role] = { sessions: withCalls.length, P, g: median(gs), S0: null, sigma: null, o: null, hc: null, qf: null, w: null, compactions };
  }
  // S0, sigma and o from the rows' successive attempts
  const s0 = {};
  const sig = {};
  const oo = {};
  for (const row of rows) {
    const role = row.role;
    if (!roles[role]) continue;
    const L = leads[row.task] || {};
    const eps = Object.keys(L).map(Number).sort((a, b) => a - b).filter((e) => L[e].calls.length > 0);
    if (eps.includes(1) && eps.includes(2)) (s0[role] ||= []).push(L[2].calls[0].context - roleP[role]);
    const succ = eps.filter((e) => e >= 2);
    for (let i = 1; i < succ.length; i++) {
      (sig[role] ||= []).push(L[succ[i]].calls[0].context - L[succ[i - 1]].calls[0].context);
    }
    for (const e of succ) {
      const s = L[e];
      const idx = new Map(s.calls.map((c, i) => [c.id, i]));
      for (const tu of s.parsed.toolUses || []) {
        if (tu?.access?.kind === 'write' && idx.has(tu.callId)) {
          (oo[role] ||= []).push(idx.get(tu.callId));
          break;
        }
      }
    }
  }
  for (const role of Object.keys(roles)) {
    roles[role].S0 = s0[role] ? median(s0[role]) : null;
    roles[role].sigma = sig[role] ? mean(sig[role]) : null;
    roles[role].o = oo[role] ? mean(oo[role]) : null;
  }
  return roles;
}

function unitOf(values, weighted) {
  return { mean: mean(values), sd: sampleSd(values), n: values.length, weighted_mean: mean(weighted) };
}

export function buildUnitCosts({ sessions, missing: missingIn, leads, rows, commits, unreadable = [], root, protocolIds, meter, W, shareMax, now }) {
  const missing = [...missingIn];
  const roles = buildRoles(sessions, leads, rows);
  const total = sessions.reduce((a, s) => a + s.tokens.total, 0);

  // per-task aggregates (attempts and their helpers)
  const task = {};
  for (const s of sessions) {
    if (!s.task) continue;
    const t = (task[s.task] ||= { tokens: 0, weighted: 0 });
    t.tokens += s.tokens.total;
    t.weighted += s.weighted;
  }
  const rowOf = Object.fromEntries(rows.map((r) => [r.task, r]));

  const units = {};
  const stageVals = {};
  for (const name of Object.keys(task).sort()) {
    const r = rowOf[name];
    if (!r) continue;
    const sv = (stageVals[r.stage] ||= { v: [], w: [] });
    sv.v.push(task[name].tokens);
    sv.w.push(task[name].weighted);
  }
  for (const st of Object.keys(stageVals).sort()) units[`stage:${st}`] = unitOf(stageVals[st].v, stageVals[st].w);
  const hv = {};
  for (const s of sessions) {
    if (!s.helper) continue;
    const h = (hv[s.agentType] ||= { v: [], w: [] });
    h.v.push(s.tokens.total);
    h.w.push(s.weighted);
  }
  for (const a of Object.keys(hv).sort()) units[`helper_run:${a}`] = unitOf(hv[a].v, hv[a].w);

  // cards: tokens of a research task shared over its committed cards, then over each card's question ids
  const tq = {};
  const cardV = [];
  const cardW = [];
  let unattributed = 0;
  const unattributedTasks = new Set();
  for (const name of Object.keys(task).sort()) {
    const r = rowOf[name];
    if (!r || r.stage !== 'research') continue;
    const bad = [];
    const cards = cardsOf(root, commits[name], bad);
    for (const id of bad) missing.push({ task: name, epoch: null, card: id, why: 'card-unreadable' });
    if (!cards.length) {
      unattributedTasks.add(name);
      continue;
    }
    cardV.push(task[name].tokens / cards.length);
    cardW.push(task[name].weighted / cards.length);
    for (const c of cards) {
      const qids = Array.isArray(c.value.question_ids) ? c.value.question_ids : [];
      if (!qids.length) continue;
      const tShare = task[name].tokens / cards.length / qids.length;
      const kShare = Math.round(c.bytes / 4) / qids.length;
      for (const q of qids) {
        const e = (tq[q] ||= { t: 0, k: 0 });
        e.t += tShare;
        e.k += kShare;
      }
    }
  }
  if (cardV.length) units.card = unitOf(cardV, cardW);

  for (const u of unreadable) {
    const r = rowOf[u.task];
    if (r && r.stage === 'research') missing.push({ task: u.task, epoch: null, step: u.step, why: 'commit-record-unreadable' });
  }

  const noEstimate = [...new Set(protocolIds)].filter((q) => !tq[q]).sort();

  for (const s of sessions) {
    if (s.task && unattributedTasks.has(s.task)) unattributed += s.tokens.total;
    else if (s.role === 'helper:unknown') unattributed += s.tokens.total;
  }
  const share = total > 0 ? unattributed / total : 0;
  const trusted = share <= shareMax && missing.length === 0;

  // tokens per meter percent (self-reported, whole percent)
  let perPct = null;
  if (meter.length >= 2) {
    const a = meter[0];
    const b = meter[meter.length - 1];
    const ta = Date.parse(a.ts);
    const tb = Date.parse(b.ts);
    const rise = b.pct - a.pct;
    if (rise > 0 && Number.isFinite(ta) && Number.isFinite(tb)) {
      let tok = 0;
      for (const s of sessions) {
        for (const c of s.calls) {
          const tc = Date.parse(c.ts);
          if (Number.isFinite(tc) && tc > ta && tc <= tb) tok += c.total;
        }
      }
      perPct = tok / rise;
    }
  }

  const tqOut = {};
  for (const q of sortedKeys(tq)) tqOut[q] = { t: tq[q].t, k: tq[q].k };
  const sortedUnits = {};
  for (const u of sortedKeys(units)) sortedUnits[u] = units[u];
  return {
    schema_version: 1,
    generated_at: now,
    trusted,
    unattributed_share: share,
    missing: [...missing].sort(
      (x, y) => (x.task < y.task ? -1 : x.task > y.task ? 1 : (x.epoch ?? -1) - (y.epoch ?? -1)) || String(x.card ?? x.step ?? '').localeCompare(String(y.card ?? y.step ?? '')),
    ),
    no_estimate: noEstimate,
    roles,
    units: sortedUnits,
    t_q: tqOut,
    tokens_per_meter_pct: perPct,
    meter_self_reported: true,
    serial_fraction: null,
    rss_mb: null,
  };
}

async function runFromTranscripts(flags, ctx, now) {
  const root = path.resolve(flags.root);
  const ce = flags.ce;
  const dryRun = !!flags['dry-run'];
  const P = {
    coord: path.join(root, 'run', 'coord.json'),
    out: path.join(root, 'plan', 'unit-costs.json'),
  };
  await lib.checkCe(root, ce); // fail fast; checked again inside the lock

  const th = await lib.thresholds(root);
  const W = th.get('weights');
  for (const k of ['read', 'write', 'out']) {
    if (!W || typeof W[k] !== 'number' || !Number.isFinite(W[k]) || W[k] < 0) {
      throw fail('input-invalid', 2, { path: `thresholds.weights.${k}`, message: 'not a finite non-negative number' });
    }
  }
  const shareMax = th.get('unattributed_share_max');
  if (typeof shareMax !== 'number' || !Number.isFinite(shareMax)) {
    throw fail('input-invalid', 2, { path: 'thresholds.unattributed_share_max', message: 'not a number' });
  }
  const troot = flags['transcripts-root'] ? path.resolve(flags['transcripts-root']) : th.get('transcripts_root');
  const retries = th.get('lock_retries');

  // Everything below up to the lock reads files and parses transcripts: the lock is not held (CONTRACT §2.1).
  const table = await lib.readTasks(root);
  let coord = null;
  try {
    coord = await lib.readJson(P.coord);
  } catch {
    coord = null;
  }
  const ledgerLines = await readLedgerSafe(root);
  const found = await discover({ root, table, coord, troot });
  if (found.attempts === 0 && found.sessions.length === 0) {
    return { exit: 2, mode: 'from-transcripts', dry_run: dryRun, result: { missing: found.missing }, reasons: [{ code: 'no-transcripts', detail: { rows: table.tasks.length, attempts: 0 } }] };
  }
  await parseAll(found.sessions, W);
  const live = found.sessions.filter((s) => s.calls.length > 0);
  if (live.length === 0) {
    return { exit: 2, mode: 'from-transcripts', dry_run: dryRun, result: { missing: found.missing }, reasons: [{ code: 'no-transcripts', detail: { missing: found.missing } }] };
  }
  const { commits, unreadable } = readCommits(root);
  const protocolIds = [];
  for (const field of [...new Set(found.rows.map((r) => r.field).filter(Boolean))].sort()) {
    try {
      const prot = await lib.currentProtocol(root, field);
      for (const q of prot?.value?.question_ids || []) protocolIds.push(q);
    } catch {
      // an unreadable protocol adds no ids; fsck reports it
    }
  }
  const meter = ledgerLines
    .filter((l) => l.kind === 'meter' && typeof l.data?.pct === 'number')
    .sort((a, b) => a.seq - b.seq)
    .map((l) => ({ ts: l.ts, pct: l.data.pct }));

  const unit = buildUnitCosts({
    sessions: found.sessions, missing: found.missing, leads: found.leads, rows: found.rows,
    commits, unreadable, root, protocolIds, meter, W, shareMax, now,
  });
  const bytes = JSON.stringify(unit, null, 2) + '\n';
  const sha = lib.sha256hex(bytes);

  let written = false;
  let appended = false;
  if (!dryRun) {
    await lib.withRunLock(root, { script: SCRIPT, ce, proc: lib.realProc({ exe: th.get('proc_exe') }), now, retries }, async (h) => {
      await lib.writeAtomic(P.out, bytes);
      written = true;
      const last = lib.lastLine(await readLedgerSafe(root), 'unit-costs');
      if (!(last && last.data && last.data.sha256 === sha)) {
        await lib.appendLedger(root, h, { ctx, ce, kind: 'unit-costs', data: { sha256: sha, unattributed_share: unit.unattributed_share, trusted: unit.trusted }, now });
        appended = true;
      }
    });
  }

  const reasons = [];
  let exit = 0;
  if (!unit.trusted) {
    exit = 2;
    reasons.push({ code: 'untrusted', detail: { unattributed_share: unit.unattributed_share, max: shareMax, missing: unit.missing } });
    process.stderr.write(`cost: not trusted (unattributed share ${unit.unattributed_share}, missing ${unit.missing.length})\n`);
  }
  return {
    exit,
    mode: 'from-transcripts',
    dry_run: dryRun,
    result: { ...unit, path: 'plan/unit-costs.json', written, sha256: sha, ledger_appended: appended },
    reasons,
  };
}

// ---------------------------------------------------------------------------------------------
// The command line.

function nowIso(flags) {
  if (flags.now !== undefined) {
    if (typeof flags.now !== 'string' || Number.isNaN(Date.parse(flags.now))) throw fail('usage', 66, { flag: 'now', message: 'not an ISO time' });
    return flags.now;
  }
  return lib.edgeFacts(flags).now;
}

function numFlag(flags, name) {
  const raw = flags[name];
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (String(raw).trim() === '' || !Number.isFinite(n)) throw fail('usage', 66, { flag: name, message: 'not a number' });
  return n;
}

async function main(ctx) {
  const { mode, flags } = lib.parseArgs(process.argv.slice(2), ARG_SPEC);
  if (!mode) throw fail('usage', 66, { message: 'a mode is required: compute, predict or from-transcripts' });
  for (const [flag, modes] of Object.entries(MODE_ONLY)) {
    if (flags[flag] !== undefined && flags[flag] !== false && !modes.includes(mode)) throw fail('usage', 66, { flag, message: `--${flag} is not a flag of ${mode}` });
  }
  const dryRun = !!flags['dry-run'];
  try {
    if (mode === 'compute') return runCompute(flags, dryRun);
    if (mode === 'predict') return runPredict(flags, dryRun);
    const now = nowIso(flags);
    return await runFromTranscripts(flags, ctx, now);
  } catch (e) {
    if (e instanceof InputError) {
      process.stderr.write(`cost: input-invalid at ${e.path}: ${e.why}\n`);
      return { exit: 2, mode, dry_run: dryRun, result: {}, reasons: [{ code: 'input-invalid', detail: { path: e.path, message: e.why } }] };
    }
    if (e instanceof lib.TcbError) {
      return { exit: e.exit, mode, dry_run: dryRun, result: {}, reasons: [{ code: e.code, detail: e.detail ?? null }] };
    }
    throw e;
  }
}

function defaultInputs() {
  // only the file beside the script: a file one folder up is outside tcb/ and has no single writer (U5-K-3)
  return path.join(HERE, 'cost-inputs.json');
}

function runCompute(flags, dryRun) {
  const file = flags.inputs ? path.resolve(flags.inputs) : defaultInputs();
  const { I, stand_in } = loadInputs(file);
  const m = computeModel(I);
  const result = computeResult(m, stand_in);
  if (flags.text) {
    const text = reportText(m, path.basename(file));
    result.text = text;
    process.stderr.write(text + '\n');
  }
  return { exit: 0, mode: 'compute', dry_run: dryRun, result, reasons: [] };
}

function runPredict(flags, dryRun) {
  const root = path.resolve(flags.root);
  const file = flags.inputs ? path.resolve(flags.inputs) : path.join(root, 'plan', 'cost-inputs.json');
  if (!fs.existsSync(file)) throw new InputError(file, 'absent');
  const { I, stand_in } = loadInputs(file);
  const sweep = val(I.child.g_sweep);
  const gFlag = numFlag(flags, 'g');
  const g = gFlag === undefined ? sweep[0] : gFlag;
  if (!sweep.includes(g)) throw fail('usage', 66, { flag: 'g', message: `${g} is not in child.g_sweep` });
  const form = flags['child-form'] === undefined ? 'a' : flags['child-form'];
  if (form !== 'a' && form !== 'b') throw fail('usage', 66, { flag: 'child-form', message: 'a or b' });
  const actual = numFlag(flags, 'actual');
  if (actual !== undefined && !(actual > 0)) throw fail('usage', 66, { flag: 'actual', message: 'not a positive number' });
  const s2 = !!flags.s2;
  const pm = predictModel(I, { g, form, s2 });
  const arms = {};
  for (const [k, v] of Object.entries(pm.arms)) arms[k] = Math.round(v);
  const result = {
    stand_in,
    form,
    g,
    n_cap: pm.nCap,
    arms,
    total: Math.round(pm.total),
    work_ratio: { one_session: Math.round(pm.oneSession), tree: Math.round(pm.tree), ratio: rd(pm.oneSession / pm.tree, 2) },
    time_speedup: pm.speed,
    helpers_modelled: false,
  };
  if (actual !== undefined) {
    const ratio = actual / pm.total;
    result.check = { ratio: rd(ratio, 4), within_2x: ratio >= 0.5 && ratio <= 2 };
  }
  return { exit: 0, mode: 'predict', dry_run: dryRun, result, reasons: [] };
}

function isMain() {
  if (!process.argv[1]) return false;
  try {
    const self = fs.realpathSync(fileURLToPath(import.meta.url));
    const run = fs.realpathSync(path.resolve(process.argv[1]));
    return process.platform === 'win32' ? self.toLowerCase() === run.toLowerCase() : self === run;
  } catch {
    return false;
  }
}

if (isMain()) lib.runMain(import.meta.url, SCRIPT, main);
