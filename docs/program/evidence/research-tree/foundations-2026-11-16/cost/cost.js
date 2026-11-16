// cost.js - shape and cost quantities for the research tree (layer 6).
// Usage: node cost.js [inputs.json]   (plain Node 24, no packages; reads one JSON, prints text; exit 0 ok, 2 bad input)
// Model (derived in the spec, rule 6): a session's call i in an epoch reads W_i = P + S + g*i tokens.
// An epoch of k work calls is followed by hc hand-over calls at the full window, then the successor
// spends o orientation calls and qf failed calls at P+S, and w tokens are written once.
// Per work call: c(k) = (P+S) + g(k-1)/2 + hc*g + H0/k,  H0 = (hc+o+qf)(P+S) + w,  so k* = sqrt(2*H0/g).
'use strict';
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, 'inputs.json');
let I;
try { I = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('bad input: ' + e.message); process.exit(2); }
const v = (o) => (o && typeof o === 'object' && 'v' in o) ? o.v : o;
const K = (x) => (x / 1000).toFixed(1) + 'k';
const M = (x) => (x / 1e6).toFixed(2) + 'M';
const W8 = I.weights;

function H0of(p) { return (p.hc + p.o + p.qf) * (p.P + p.S) + p.w; }
function kstar(p) { return Math.sqrt(2 * H0of(p) / p.g); }
// Weighted (token cost, input-token equivalents): re-reads at W8.read, new tokens and reloaded state written at W8.write.
function H0cost(p) { return W8.read * (p.hc + p.o + p.qf) * (p.P + p.S) + W8.write * p.S + W8.out * p.w; }
function kstarCost(p) { return Math.sqrt(2 * H0cost(p) / (W8.read * p.g)); }

// Simulate n work calls with hand-over every k calls (k = Infinity: one session). State grows by sigma per epoch.
function simulate(n, p, k, Wcap) {
  let count = 0, cost = 0, done = 0, epoch = 0, handovers = 0, maxW = 0, thrashAt = null;
  while (done < n) {
    const S = p.S0 + p.sigma * epoch;
    // k === 'adaptive': recompute the square-root law each epoch from the state actually reloaded (rule 6).
    // With state growing sigma per epoch the law becomes k* = sqrt((2*H0 + sigma*n_remaining)/g).
    const kk = k === 'adaptive' ? Math.max(2, Math.round(Math.sqrt((2 * ((p.hc + p.o + p.qf) * (p.P + S) + p.w) + p.sigma * (n - done)) / p.g))) : k;
    const len = Math.min(kk, n - done);
    if (epoch > 0) { // successor start: orientation and failed calls, state written to cache once
      count += (p.o + p.qf) * (p.P + S); cost += W8.read * (p.o + p.qf) * (p.P + S) + W8.write * S;
      if (thrashAt === null && S >= p.g * kk) thrashAt = epoch;
    }
    for (let i = 0; i < len; i++) {
      const W = p.P + S + p.g * i; count += W; cost += W8.read * W + W8.write * p.g; if (W > maxW) maxW = W;
    }
    done += len;
    if (done < n) { // hand-over calls at the full window, then the brief
      const Wend = p.P + S + p.g * len; count += p.hc * Wend + p.w; cost += W8.read * p.hc * Wend + W8.out * p.w; handovers++;
    }
    epoch++;
  }
  return { count, cost, handovers, maxW, overCap: Wcap ? maxW > Wcap : false, thrashAt };
}
function bestK(n, p, Wcap, key) {
  let best = null;
  for (let k = 2; k <= n; k++) {
    const r = simulate(n, p, k, null);
    if (Wcap && r.maxW > Wcap) continue;
    if (!best || r[key] < best.r[key]) best = { k, r };
  }
  return best;
}

console.log('== cost.js output, inputs: ' + path.basename(file) + ' ==');

// 1. Coordinator: hand-over interval by the square-root law (D2-04, D3-01).
const C = Object.fromEntries(Object.entries(I.coordinator).map(([a, b]) => [a, v(b)]));
const pc = { P: C.P, S: C.S, g: C.g, hc: C.hc, o: C.o, qf: C.qf, w: C.w };
const kc = kstar(pc), Wc = pc.P + pc.S + pc.g * kc;
const per = (p, k) => (p.P + p.S) + p.g * (k - 1) / 2 + p.hc * p.g + H0of(p) / k;
const k200 = (C.fixed_line - pc.P - pc.S) / pc.g;
console.log('\n[1] Coordinator (count): H0=' + K(H0of(pc)) + ' k*=' + kc.toFixed(1) + ' calls  W*=' + K(Wc) +
  '  tokens per work call at k*=' + K(per(pc, kc)) + '  at the 200k line (k=' + k200.toFixed(0) + ')=' + K(per(pc, k200)) +
  '  recorded main-session average=' + C.recorded_avg_per_call.map(K).join('-'));
const pcScript = Object.assign({}, pc, { w: 0 });
console.log('    with a script-written status (w=0): k*=' + kstar(pcScript).toFixed(1) + ' W*=' + K(pcScript.P + pcScript.S + pcScript.g * kstar(pcScript)));
const kcc = kstarCost(pc);
console.log('    coordinator (weighted cost): k*=' + kcc.toFixed(1) + ' W*=' + K(pc.P + pc.S + pc.g * kcc) + '  (cost optimum hands over later than the count optimum)');
const rowTok = 200; // G: tokens per status row
console.log('    root fan-out capacity (rows of ~' + rowTok + ' tokens that fit between P+S and W*): ' + Math.floor((Wc - pc.P - pc.S) / rowTok) + '  -> no inner level is ever needed for 7-10 fields');

// 2. Research child: sweep g; closed form, best constant k by simulation, single session, break-even.
const Ch = Object.fromEntries(Object.entries(I.child).map(([a, b]) => [a, v(b)]));
console.log('\n[2] Research child, n=' + Ch.n + ' work calls, state grows ' + K(Ch.sigma) + ' per epoch, quality cap ' + K(Ch.W_quality));
for (const g of Ch.g_sweep) {
  const p = { P: Ch.P, S: Ch.S0, S0: Ch.S0, sigma: Ch.sigma, g, hc: Ch.hc, o: Ch.o, qf: Ch.qf, w: Ch.w };
  const k = kstar(p), kC = kstarCost(p);
  const one = simulate(Ch.n, p, Infinity, Ch.W_quality);
  const bc = bestK(Ch.n, p, null, 'count'), bk = bestK(Ch.n, p, null, 'cost');
  const atStar = simulate(Ch.n, p, Math.max(2, Math.round(k)), Ch.W_quality);
  let nmin = null; // smallest n at which handing over at k* beats one session on count
  for (let n = 2; n <= 2000; n++) { if (simulate(n, p, Math.max(2, Math.round(k)), null).count < simulate(n, p, Infinity, null).count) { nmin = n; break; } }
  console.log('  g=' + K(g) + ': k*=' + k.toFixed(1) + ' W*=' + K(p.P + p.S + g * k) + ' | cost k*=' + kC.toFixed(1) + ' W*=' + K(p.P + p.S + g * kC) +
    ' | one session: ' + M(one.count) + ' (window reaches ' + K(one.maxW) + (one.overCap ? ', OVER the quality cap' : '') + ')' +
    ' | hand-over at k*: ' + M(atStar.count) + ', ' + atStar.handovers + ' hand-overs' + (atStar.thrashAt !== null ? ', reload >= useful growth from epoch ' + atStar.thrashAt + ' (split, do not hand over)' : '') +
    ' | best constant k by simulation: count k=' + bc.k + ' ' + M(bc.r.count) + ', cost k=' + bk.k +
    ' | adaptive k (law re-applied each epoch): ' + (() => { const a = simulate(Ch.n, p, 'adaptive', Ch.W_quality); return M(a.count) + ', ' + a.handovers + ' hand-overs, max window ' + K(a.maxW) + (a.thrashAt !== null ? ', reload >= growth from epoch ' + a.thrashAt : ''); })() +
    ' | law with state growth k*=' + Math.sqrt((2 * H0of(p) + p.sigma * Ch.n) / g).toFixed(1) +
    ' | leaf capacity before reload thrash n_max=k*(g*k*-S0)/sigma=' + (() => { const k2 = Math.sqrt((2 * H0of(p) + p.sigma * Ch.n) / g); return Math.floor(k2 * (g * k2 - p.S0) / p.sigma); })() + ' calls' +
    ' | ratio one/hand-over (count)=' + (one.count / atStar.count).toFixed(2) + ' (weighted)=' + (one.cost / atStar.cost).toFixed(2) +
    ' | break-even: hand-over pays from n=' + nmin + ' calls');
}

// 3. F1: review in the researching session vs a fresh reviewer from the frozen pack.
const R = Object.fromEntries(Object.entries(I.review).map(([a, b]) => [a, v(b)]));
console.log('\n[3] F1 token price (count), n=' + Ch.n + ' research + ' + R.n_rev + ' review calls');
for (const g of Ch.g_sweep) {
  const p = { P: Ch.P, S0: Ch.S0, sigma: Ch.sigma, g, hc: Ch.hc, o: Ch.o, qf: Ch.qf, w: Ch.w };
  const same = simulate(Ch.n + R.n_rev, p, Infinity, null);
  const k = Math.max(2, Math.round(kstar(Object.assign({ S: Ch.S0 }, p))));
  const research = simulate(Ch.n, p, k, null);
  const rev = simulate(R.n_rev, { P: Ch.P, S0: R.pack, sigma: 0, g: R.g_rev, hc: 0, o: 0, qf: 0, w: 0 }, Infinity, null);
  console.log('  g=' + K(g) + ': same session ' + M(same.count) + ' (window ' + K(same.maxW) + ')  vs  hand-over research ' + M(research.count) +
    ' + fresh reviewer ' + M(rev.count) + ' (window ' + K(rev.maxW) + ') = ' + M(research.count + rev.count) + '  ratio ' + (same.count / (research.count + rev.count)).toFixed(2));
}
console.log('  reviewer node capacity for the pack: W_quality - P - R_rev = ' + K(Ch.W_quality - Ch.P - R.R_rev));

// 4. Fan-out by tokens (D3-12): pieces that minimise tokens for a body of n calls.
{
  const p = { P: Ch.P, S: Ch.S0, g: 2800, hc: Ch.hc, o: Ch.o, qf: Ch.qf, w: Ch.w };
  const k = kstar(p);
  console.log('\n[4] Token fan-out (D3-12), g=2.8k: k_opt = n/k* = ' + (Ch.n / k).toFixed(1) + ' windows of ~' + k.toFixed(0) +
    ' calls for n=' + Ch.n + '. These are window epochs, sequential or parallel; they are not fields.');
}

// 5. Bulk load (D2-01) in key order, mechanism group = atomic unit, leaf full at f on either axis.
{
  const P = I.packing, f = v(P.f), Ccap = v(P.C_node), Acap = v(P.A_leaf), qs = v(P.questions);
  const groups = [];
  for (const q of qs) { const gid = q.id.split('-').slice(0, 2).join('-'); let gr = groups.find((x) => x.id === gid); if (!gr) groups.push(gr = { id: gid, t: 0, k: 0, qs: [] }); gr.t += q.t; gr.k += q.k; gr.qs.push(q.id); }
  const tot = groups.reduce((a, g) => ({ t: a.t + g.t, k: a.k + g.k }), { t: 0, k: 0 });
  const minLeaves = Math.max(Math.ceil(tot.t / (f * Acap)), Math.ceil(tot.k / (f * Ccap)));
  const leaves = []; let cur = null;
  for (const gr of groups) {
    if (gr.t > f * Acap || gr.k > f * Ccap) { leaves.push({ groups: [gr.id], t: gr.t, k: gr.k, flag: 'oversized group: out-of-line pack, or owner splits the group' }); cur = null; continue; }
    if (!cur || cur.t + gr.t > f * Acap || cur.k + gr.k > f * Ccap) { cur = { groups: [], t: 0, k: 0 }; leaves.push(cur); }
    cur.groups.push(gr.id); cur.t += gr.t; cur.k += gr.k;
  }
  console.log('\n[5] Bulk load (illustrative key set), f=' + f + ': spend ' + tot.t.toFixed(2) + ' pack ' + tot.k.toFixed(2) + ' of one leaf; lower bound ' + minLeaves + ' leaves; packed into ' + leaves.length);
  leaves.forEach((l, i) => console.log('  leaf ' + (i + 1) + ': ' + l.groups.join(',') + '  spend ' + (l.t / Acap).toFixed(2) + '  pack ' + (l.k / Ccap).toFixed(2) + (l.flag ? '  ' + l.flag : '') +
    (i > 0 ? '  separator key: ' + l.groups[0] : '') + ((l.t < 0.5 * f * Acap && l.k < 0.5 * f * Ccap) ? '  UNDERFLOW (below half of f): report to owner' : '')));
}

// 6. Concurrency (D3-03 load control, D3-11 Amdahl).
{
  const Cc = Object.fromEntries(Object.entries(I.concurrency).map(([a, b]) => [a, v(b)]));
  const Nmem = Math.floor((Cc.free_mb - Cc.reserve_mb) / Cc.rss_mb), N = Math.max(0, Math.min(Cc.N_cap, Nmem));
  console.log('\n[6] Load control: N_mem=' + Nmem + '  N=min(cap ' + Cc.N_cap + ', N_mem)=' + N);
  for (const s of Cc.s_sweep) { const S = (n) => 1 / (s + (1 - s) / n); console.log('  s=' + s + ': S(1..3)=' + [1, 2, 3].map((n) => S(n).toFixed(2)).join(' ') + '  gain of the third slot ' + (S(3) - S(2)).toFixed(2) + ' (time only; tokens never fall with N)'); }
}

// 7. Admission from the internal pilot (D6-13, D1-08, D3-04).
{
  const A = Object.fromEntries(Object.entries(I.admission).map(([a, b]) => [a, v(b)]));
  const factor = 1 + Math.max(A.m_owner, A.z * Math.sqrt(A.between_field_cv2));
  console.log('\n[7] Admission: escrow per field = estimate x ' + factor.toFixed(2) + ' until two fields are measured; with ' + A.remaining_in_pilot_units +
    ' pilot-units left, at most ' + Math.floor(A.remaining_in_pilot_units / factor) + ' pilot-sized fields can be reserved at once; in-run re-plan when actual/estimate > ' + A.theta);
}

// 8. Order of work (D3-14 Smith's rule with aging).
{
  const o = v(I.order).map((x) => ({ ...x, pr: x.w / x.est })).sort((a, b) => b.pr - a.pr);
  console.log('\n[8] Order after the pilot (w/est, highest first): ' + o.map((x) => x.field + '(' + x.pr.toFixed(2) + ')').join(' > '));
}
process.exit(0);
