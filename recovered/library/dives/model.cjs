// Upper-bound model of the library's token and time saving. Pure arithmetic on measured inputs.
// S = rh * [ e*(1 - (cv + kp)/mt) + (F + OL)*(1 - e)*(1 - af) ] - c*q*e/mb
//   rh  = share of exploration runs that are repeats AND are hit (repeat share x hit rate)
//   e   = token share of lookup-only calls (they re-read the window)
//   mt  = token-weighted mean run length of consecutive lookup-only calls (calls a hit can remove)
//   mb  = count-weighted mean run length (one lookup per run when asking before every run)
//   cv  = verify calls per hit at the caller's window; kp = 1 if push (the first call of the run still happens)
//   F   = fetched-content share of tokens; OL = lookup calls' own output carried (commands, thinking)
//   af  = answer size / content the run would have added (answer stays in the window)
//   c   = model turns per lookup (pull = 1, push = 0); q = share of runs that trigger a lookup
// Time (one lane, model time only): T = rh * Lt * (1 - (cv + kp)/mt) - c*q*Lt/mb ; lane = M * T
const cases = [];
const base = { e: 0.451, mt: 11.1, mb: 3.76, F: 0.27, OL: 0.09, Lt: 0.43, M: 0.51 }; // Clinic, loose classifier (closest to the recorded 43.6 %)
const ff = { e: 0.567, mt: 21.1, mb: 5.25, F: 0.23, OL: 0.09, Lt: 0.39, M: 0.86 };  // FixFlow, loose
const strict = { e: 0.165, mt: 3.38, mb: 1.73, F: 0.27, OL: 0.05, Lt: 0.17, M: 0.51 }; // Clinic, strict classifier
function S(p) {
  const g = p.rh * (p.e * (1 - (p.cv + p.kp) / p.mt) + (p.F + p.OL) * (1 - p.e) * (1 - p.af));
  const o = p.c * p.q * p.e / p.mb;
  const t = p.rh * p.Lt * (1 - (p.cv + p.kp) / p.mt) - p.c * p.q * p.Lt / p.mb;
  return { gross: g, overhead: o, net: g - o, modelTime: t, laneTime: p.M * t };
}
function solveRh(p, target) { let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (S({ ...p, rh: m }).net < target) lo = m; else hi = m; } return lo; }
const v2 = 0.25 * 133 / (133 + 20); // design's guessed steady-state hit rate (hitMax 0.25, half point 20, ~133 entries)
const C = [
  ['A0 design formula as written (V2: e*h - 0.02)', null],
  ['A1 design hit rate, pull before every run, KS verify 2 turns', { ...base, rh: v2, cv: 2, kp: 0, af: 0.04, c: 1, q: 1 }],
  ['A2 design hit rate, pull, no verify', { ...base, rh: v2, cv: 0, kp: 0, af: 0.04, c: 1, q: 1 }],
  ['A3 design hit rate, push (hook), no verify', { ...base, rh: v2, cv: 0, kp: 1, af: 0.04, c: 0, q: 1 }],
  ['B1 coding-memory evidence (ReasoningBank SWE steps -6..-9 %) as rh*e', null],
  ['B2 plan-caching hit rate 0.46, push, no verify', { ...base, rh: 0.46, cv: 0, kp: 1, af: 0.04, c: 0, q: 1 }],
  ['B3 same, FixFlow shape', { ...ff, rh: 0.46, cv: 0, kp: 1, af: 0.04, c: 0, q: 1 }],
  ['C1 oracle, question-level repeats (read-set overlap >= 0.5: rh 0.16 at most)', { ...base, rh: 0.16, cv: 0, kp: 0, af: 0.04, c: 0, q: 1 }],
  ['C2 oracle, file-level repeats with perfect digests (rh 0.49..0.66)', { ...base, rh: 0.66, cv: 0, kp: 0, af: 0.04, c: 0, q: 1 }],
  ['C3 oracle removes ALL exploration (rh 1)', { ...base, rh: 1, cv: 0, kp: 0, af: 0.04, c: 0, q: 1 }],
  ['C3 same, FixFlow shape', { ...ff, rh: 1, cv: 0, kp: 0, af: 0.04, c: 0, q: 1 }],
];
for (const [name, p] of C) {
  if (name.startsWith('A0')) { console.log(name.padEnd(80), 'net', (0.436 * v2 - 0.02).toFixed(3), ' (rh', v2.toFixed(3) + ')'); continue; }
  if (name.startsWith('B1')) { console.log(name.padEnd(80), 'net about 0.06..0.09 of tokens if tokens track steps'); continue; }
  const r = S(p);
  console.log(name.padEnd(80), 'gross', r.gross.toFixed(3), 'overhead', r.overhead.toFixed(3), 'NET', r.net.toFixed(3), '| model time', r.modelTime.toFixed(3), 'lane time', r.laneTime.toFixed(3));
}
console.log('\nBreak-even rh (net = 0):');
console.log(' pull, KS verify, clinic loose ', solveRh({ ...base, cv: 2, kp: 0, af: 0.04, c: 1, q: 1 }, 0).toFixed(3));
console.log(' pull, no verify, clinic loose ', solveRh({ ...base, cv: 0, kp: 0, af: 0.04, c: 1, q: 1 }, 0).toFixed(3));
console.log(' pull, no verify, clinic strict', solveRh({ ...strict, cv: 0, kp: 0, af: 0.13, c: 1, q: 1 }, 0).toFixed(3));
console.log(' pull, no verify, FixFlow loose', solveRh({ ...ff, cv: 0, kp: 0, af: 0.04, c: 1, q: 1 }, 0).toFixed(3));
console.log('rh needed for a 50 % token cut:');
console.log(' oracle shape, clinic', solveRh({ ...base, cv: 0, kp: 0, af: 0.04, c: 0, q: 1 }, 0.5).toFixed(3), '; FixFlow', solveRh({ ...ff, cv: 0, kp: 0, af: 0.04, c: 0, q: 1 }, 0.5).toFixed(3));
console.log(' push, no verify, clinic', solveRh({ ...base, cv: 0, kp: 1, af: 0.04, c: 0, q: 1 }, 0.5).toFixed(3));
console.log('lookup-turn overhead per turn when asking before every run (c*e/mb): clinic loose', (base.e / base.mb).toFixed(3), ' FixFlow loose', (ff.e / ff.mb).toFixed(3), ' clinic strict', (strict.e / strict.mb).toFixed(3), ' vs design lookupCost 0.02');
