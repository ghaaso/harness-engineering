'use strict';
// Parts 1, 2, 6: overlap of top 10s, headroom, structural mechanisms. Late 50, pool and unrestricted.
const fs = require('fs');
const X = require('./lib.js');
const { late, comp, selB, get, ranked, rrf, summ, diff, f3, fb, mean, median } = X;
const out = [];
const log = s => { out.push(s); };
const ARMS = ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO'];
for (const sc of ['pool', 'unrestricted']) {
  const cl = X.candLists(sc);
  const PPR = comp('PPR', sc), CO = comp('CO', sc), RRF = comp('RRF', sc), DIR = comp('DIR', sc);
  log(`\n===== scope ${sc} =====`);
  // check stored RRF table equals recomputed
  let rrfMis = 0;
  const top = {}; // top[name][tid] = array
  const p10 = {};
  const addList = (name, tid, list, truth) => { (top[name] = top[name] || {})[tid] = list.slice(0, 10); (p10[name] = p10[name] || new Map()).set(tid, X.C.p10(list, truth)); };
  for (const t of late) {
    const tid = t.task_id, cands = cl.get(tid) || [];
    const r1 = ranked(tid, cands, get(RRF, tid)), r2 = ranked(tid, cands, rrf(tid, cands, get(PPR, tid), get(CO, tid)));
    if (r1.slice(0, 10).join() !== r2.slice(0, 10).join()) rrfMis++;
    addList('RRF', tid, r1, t.truth); addList('PPR', tid, ranked(tid, cands, get(PPR, tid)), t.truth);
    addList('CO', tid, ranked(tid, cands, get(CO, tid)), t.truth); addList('DIR', tid, ranked(tid, cands, get(DIR, tid)), t.truth);
    for (const a of ARMS) for (const s of [1, 2, 3]) {
      addList(`${a}_alone_s${s}`, tid, ranked(tid, cands, get(selB(a, 'alone', sc, s), tid)), t.truth);
      addList(`${a}_fused_s${s}`, tid, ranked(tid, cands, get(selB(a, 'fused', sc, s), tid)), t.truth);
    }
  }
  log(`recomputed RRF top10 differs from stored RRF table top10 on ${rrfMis} of ${late.length} tasks`);
  log(`P@10 (late50 item-23 aggregation): RRF ${summ(p10.RRF).toFixed(4)} PPR ${summ(p10.PPR).toFixed(4)} CO ${summ(p10.CO).toFixed(4)} DIR ${summ(p10.DIR).toFixed(4)}`);
  const ov = (A, B, tid) => { const s = new Set(B[tid]); return A[tid].filter(x => s.has(x)).length; };
  const N = late.length;
  log(`top-10 overlap PPR vs CO: mean ${mean(late.map(t => ov(top.PPR, top.CO, t.task_id))).toFixed(2)} of 10`);
  for (const a of ARMS) {
    for (const s of [1, 2, 3]) {
      const F = top[`${a}_fused_s${s}`], A = top[`${a}_alone_s${s}`];
      const o = (P, Q) => mean(late.map(t => ov(P, Q, t.task_id)));
      const sameSet = late.filter(t => ov(F, top.RRF, t.task_id) === F[t.task_id].length && F[t.task_id].length === top.RRF[t.task_id].length).length;
      const sameOrder = late.filter(t => F[t.task_id].join() === top.RRF[t.task_id].join()).length;
      const pf = p10[`${a}_fused_s${s}`], pa = p10[`${a}_alone_s${s}`];
      const diffP = late.filter(t => Math.abs(pf.get(t.task_id) - p10.RRF.get(t.task_id)) > 1e-12);
      const up = diffP.filter(t => pf.get(t.task_id) > p10.RRF.get(t.task_id)).length;
      const aDiff = late.filter(t => Math.abs(pa.get(t.task_id) - p10.RRF.get(t.task_id)) > 1e-12).length;
      log(`${a} s${s}: overlap fused-RRF ${o(F, top.RRF).toFixed(2)}, alone-RRF ${o(A, top.RRF).toFixed(2)}, alone-CO ${o(A, top.CO).toFixed(2)}, alone-PPR ${o(A, top.PPR).toFixed(2)}, alone-DIR ${o(A, top.DIR).toFixed(2)} | fused top10 set == RRF ${sameSet}/${N} (${(sameSet / N * 100).toFixed(1)}%), same order ${sameOrder}/${N} | fused P@10 != RRF on ${diffP.length} tasks (${up} up, ${diffP.length - up} down) | alone P@10 != RRF on ${aDiff} | fused P@10 ${summ(pf).toFixed(4)} alone ${summ(pa).toFixed(4)}`);
    }
    // seed mean
    const pm = new Map(), am = new Map();
    for (const t of late) { const id = t.task_id; pm.set(id, mean([1, 2, 3].map(s => p10[`${a}_fused_s${s}`].get(id)))); am.set(id, mean([1, 2, 3].map(s => p10[`${a}_alone_s${s}`].get(id)))); }
    const dm = late.filter(t => Math.abs(pm.get(t.task_id) - p10.RRF.get(t.task_id)) > 1e-12).length;
    log(`${a} seed-mean: fused-RRF ${fb(diff(pm, p10.RRF))} ; alone-RRF ${fb(diff(am, p10.RRF))} ; tasks with seed-mean fused P@10 != RRF: ${dm}/${N}`);
  }
  // headroom
  const inC = late.map(t => { const c = new Set(cl.get(t.task_id) || []); return t.truth.filter(x => c.has(x)).length; });
  const truthTot = late.reduce((s, t) => s + t.truth.length, 0);
  const oracle = new Map(late.map((t, i) => [t.task_id, Math.min(10, inC[i]) / 10]));
  const sizes = late.map(t => (cl.get(t.task_id) || []).length);
  const coN = late.map(t => get(CO, t.task_id).size);
  const tr = late.map(t => t.truth.length);
  log(`truth per task: mean ${mean(tr).toFixed(2)}, median ${median(tr)}, tasks with truth >10: ${tr.filter(x => x > 10).length}; truth inside candidates: ${inC.reduce((a, b) => a + b, 0)}/${truthTot} = ${(inC.reduce((a, b) => a + b, 0) / truthTot).toFixed(3)}; tasks with 0 truth inside: ${inC.filter(x => x === 0).length}`);
  log(`oracle P@10 ${summ(oracle).toFixed(4)} ; RRF ${summ(p10.RRF).toFixed(4)} ; headroom ${(summ(oracle) - summ(p10.RRF)).toFixed(4)}`);
  log(`candidate list size: median ${median(sizes)}, min ${Math.min(...sizes)}, <=10: ${sizes.filter(x => x <= 10).length}/${N}, <=20: ${sizes.filter(x => x <= 20).length}`);
  log(`CO-scored candidates per task: median ${median(coN)}, 0: ${coN.filter(x => x === 0).length}, >=10: ${coN.filter(x => x >= 10).length}/${N}`);
  // truth inside the CO block
  const inCO = late.map(t => t.truth.filter(x => get(CO, t.task_id).has(x)).length);
  log(`truth among CO-scored candidates: ${inCO.reduce((a, b) => a + b, 0)} of ${inC.reduce((a, b) => a + b, 0)} truth-in-candidates`);
  // oracle within CO-block constraint: if nCO>=10 the RRF top 10 is CO-only; best possible P@10 reordering only within CO block
  // structural dominance: for w, does every CO-scored candidate necessarily outrank every non-CO candidate in fused?
  for (const w of [0.25, 0.5, 1, 2, 4]) {
    let dom = 0, domTop = 0, fixedSet = 0;
    for (let i = 0; i < N; i++) {
      const n = sizes[i], m = coN[i]; if (m === 0 || m === n) { if (m === n || m === 0) {} }
      const minCO = (1 + w) / (60 + n) + 1 / (60 + m), maxNon = (1 + w) / 61;
      const d = m > 0 && m < n && minCO > maxNon; if (d) dom++;
      if (d && m >= 10) domTop++;
      if (n <= 10) fixedSet++;
    }
    log(`w=${w}: tasks where every CO-scored candidate must outrank every non-CO candidate in the fused list: ${dom}/${N}; of them with >=10 CO candidates (top-10 SET then confined to the CO block, as in RRF): ${domTop}`);
  }
  // how many tasks' fused top-10 set is fixed regardless of embedding: (n<=10) or (dominance at max chosen w=1 and m>=10 and ... ) report n<=10
  // what share of RRF top10 is CO-scored
  const coInTop = late.map(t => top.RRF[t.task_id].filter(x => get(CO, t.task_id).has(x)).length);
  log(`RRF top10 members that are CO-scored: mean ${mean(coInTop).toFixed(2)}`);
  // RRF hits that are CO-scored vs not
  let hitCO = 0, hitNon = 0;
  for (const t of late) { const T = new Set(t.truth); for (const c of top.RRF[t.task_id]) if (T.has(c)) { if (get(CO, t.task_id).has(c)) hitCO++; else hitNon++; } }
  log(`RRF top10 hits: CO-scored ${hitCO}, not CO-scored ${hitNon}`);
  // truth not CO-scored but in candidates, and where RRF misses them
  let truthNon = 0, truthNonInTop = 0;
  for (const t of late) { const c = new Set(cl.get(t.task_id) || []); for (const x of t.truth) if (c.has(x) && !get(CO, t.task_id).has(x)) { truthNon++; if (top.RRF[t.task_id].includes(x)) truthNonInTop++; } }
  log(`truth in candidates without CO score: ${truthNon}; of them in RRF top10: ${truthNonInTop}`);
}
fs.writeFileSync(__dirname + '/a1.out.txt', out.join('\n') + '\n');
console.log(out.join('\n'));
