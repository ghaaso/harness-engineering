'use strict';
// Parts 3, 4 (distinctness), 5 (fixed w and larger w, oracle bound).
const fs = require('fs');
const X = require('./lib.js');
const { late, comp, stageB, selB, get, ranked, rrf, fuse, summ, diff, f3, fb, mean, median, spearman, C } = X;
const out = []; const log = s => out.push(s);
const CH = { E1: 'c04', E2: 'c07', E3: 'c03', E4: 'c12', E5: 'c03' };
const CFGS = { E1: ['c04', 'c12', 'c15'], E2: ['c07', 'c10', 'c11'], E3: ['c03', 'c11', 'c13'], E4: ['c12', 'c13', 'c16'], E5: ['c03', 'c09', 'c11'] };
const scopes = process.argv[2] ? [process.argv[2]] : ['pool', 'unrestricted'];
for (const sc of scopes) {
  const cl = X.candLists(sc);
  const PPR = comp('PPR', sc), CO = comp('CO', sc), DIR = comp('DIR', sc);
  log(`\n===== scope ${sc} =====`);
  const rrfP = new Map(), rrfTop = new Map();
  for (const t of late) { const c = cl.get(t.task_id) || []; const r = ranked(t.task_id, c, rrf(t.task_id, c, get(PPR, t.task_id), get(CO, t.task_id))); rrfP.set(t.task_id, C.p10(r, t.truth)); rrfTop.set(t.task_id, r.slice(0, 10)); }
  // ---- copies check: selectB alone == stageB chosen config on late50
  for (const a of Object.keys(CH)) {
    let mism = 0, rows = 0;
    for (const s of [1, 2, 3]) { const A = selB(a, 'alone', sc, s), B = stageB(a, CH[a], s, sc); for (const t of late) { const x = get(A, t.task_id), y = get(B, t.task_id); for (const [c, v] of x) { rows++; if (y.get(c) !== v) mism++; } if (x.size !== y.size) mism++; } }
    log(`${a}: selectB alone vs stageB ${CH[a]} late50 rows ${rows}, mismatches ${mism}`);
  }
  // ---- Part 4: distinctness of seeds and configs (pool only meaningful; do both)
  for (const a of Object.keys(CH)) {
    for (const cid of CFGS[a]) {
      const T = [1, 2, 3].map(s => stageB(a, cid, s, sc));
      let ident = 0, rows = 0; const rho12 = [], rho13 = [], top10eq = [];
      for (const t of late) {
        const m = [0, 1, 2].map(i => get(T[i], t.task_id)); const cs = [...m[0].keys()].filter(c => m[1].has(c) && m[2].has(c));
        for (const c of cs) { rows++; if (m[0].get(c) === m[1].get(c) || m[0].get(c) === m[2].get(c)) ident++; }
        if (cs.length >= 3) { rho12.push(spearman(cs.map(c => m[0].get(c)), cs.map(c => m[1].get(c)))); rho13.push(spearman(cs.map(c => m[0].get(c)), cs.map(c => m[2].get(c)))); }
      }
      log(`${a} ${cid}: rows ${rows}, rows where s1 equals s2 or s3 exactly ${ident}; per-task Spearman s1-s2 median ${median(rho12).toFixed(3)} (min ${Math.min(...rho12).toFixed(3)}), s1-s3 median ${median(rho13).toFixed(3)}`);
    }
    // between configs, seed 1
    const [c0, c1] = CFGS[a]; const A = stageB(a, c0, 1, sc), B = stageB(a, c1, 1, sc); const r = [];
    for (const t of late) { const x = get(A, t.task_id), y = get(B, t.task_id); const cs = [...x.keys()].filter(c => y.has(c)); if (cs.length >= 3) r.push(spearman(cs.map(c => x.get(c)), cs.map(c => y.get(c)))); }
    log(`${a} config ${c0} vs ${c1} s1: per-task Spearman median ${median(r).toFixed(3)}`);
  }
  // ---- Part 3: signal
  for (const a of [...Object.keys(CH), 'PLACEBO']) {
    const E = a === 'PLACEBO' ? selB('PLACEBO', 'alone', sc, 1) : stageB(a, CH[a], 1, sc);
    let embOnly = 0, rrfOnly = 0, embOnlyHits = 0, rrfOnlyHits = 0;
    const rCO = [], rCOin = [], rPPR = [];
    const nonco = { emb: new Map(), PPR: new Map(), DIR: new Map(), RAND: new Map() }; const hitAny = { emb: 0, PPR: 0, DIR: 0, RAND: 0 }; let nTasksNon = 0;
    for (const t of late) {
      const tid = t.task_id, cands = cl.get(tid) || [], T = new Set(t.truth), e = get(E, tid), co = get(CO, tid), ppr = get(PPR, tid);
      const at = ranked(tid, cands, e).slice(0, 10), rt = rrfTop.get(tid);
      const hA = at.filter(c => T.has(c) && !rt.includes(c)).length, hR = rt.filter(c => T.has(c) && !at.includes(c)).length;
      if (hA) embOnly++; if (hR) rrfOnly++; embOnlyHits += hA; rrfOnlyHits += hR;
      const cs = cands.filter(c => e.has(c));
      if (cs.length >= 3) {
        rCO.push(spearman(cs.map(c => e.get(c)), cs.map(c => co.get(c) || 0)));
        rPPR.push(spearman(cs.map(c => e.get(c)), cs.map(c => ppr.get(c) || 0)));
        const ci = cs.filter(c => co.has(c)); if (ci.length >= 3) rCOin.push(spearman(ci.map(c => e.get(c)), ci.map(c => co.get(c))));
      }
      // candidates with no co-change history with the seed
      const non = cands.filter(c => !co.has(c));
      const Tn = t.truth.filter(c => non.includes(c));
      const rand = new Map(non.map(c => [c, 0]));
      const lists = { emb: ranked(tid, non, e), PPR: ranked(tid, non, ppr), DIR: ranked(tid, non, get(DIR, tid)), RAND: ranked(tid, non, rand) };
      for (const k in lists) nonco[k].set(tid, C.p10(lists[k], Tn));
      if (Tn.length && non.length > 10) { nTasksNon++; for (const k in lists) if (lists[k].slice(0, 10).some(c => Tn.includes(c))) hitAny[k]++; }
    }
    const nm = x => median(x.filter(v => !Number.isNaN(v))).toFixed(3);
    log(`${a} (s1, ${a === 'PLACEBO' ? 'p3' : CH[a]}): tasks where alone top10 has a truth file RRF's top10 lacks: ${embOnly} (${embOnlyHits} files); reverse: ${rrfOnly} (${rrfOnlyHits} files)`);
    log(`   per-task Spearman emb vs CO (absent=0) median ${nm(rCO)}; emb vs CO on CO-scored only median ${nm(rCOin)} (n=${rCOin.length}); emb vs PPR median ${nm(rPPR)}`);
    log(`   no-co-change candidates only: P@10 emb ${summ(nonco.emb).toFixed(4)} PPR ${summ(nonco.PPR).toFixed(4)} DIR ${summ(nonco.DIR).toFixed(4)} RANDOM ${summ(nonco.RAND).toFixed(4)}; emb-PPR ${fb(diff(nonco.emb, nonco.PPR))}; emb-DIR ${fb(diff(nonco.emb, nonco.DIR))}; hit rate (>=1 truth in top10, ${nTasksNon} tasks with a non-co truth and >10 such candidates): emb ${hitAny.emb} PPR ${hitAny.PPR} DIR ${hitAny.DIR} RANDOM ${hitAny.RAND}`);
  }
  // ---- Part 5: fixed w, beyond the grid, plus oracle bound
  const WS = [0.25, 0.5, 1, 2, 4, 8, 1e6];
  for (const a of Object.keys(CH)) for (const cid of CFGS[a]) {
    const row = [];
    for (const w of WS) {
      const pm = new Map();
      for (const t of late) { const c = cl.get(t.task_id) || []; const v = [1, 2, 3].map(s => C.p10(ranked(t.task_id, c, fuse(t.task_id, c, get(PPR, t.task_id), get(CO, t.task_id), get(stageB(a, cid, s, sc), t.task_id), w)), t.truth)); pm.set(t.task_id, mean(v)); }
      row.push(`w${w === 1e6 ? 'inf' : w} ${fb(diff(pm, rrfP))}`);
    }
    log(`${a} ${cid}${cid === CH[a] ? '*' : ''} fused-RRF P@10 seed mean: ${row.join(' | ')}`);
  }
  { // placebo p3-like: use selectB PLACEBO alone tables as raw score
    const row = [];
    for (const w of WS) { const pm = new Map(); for (const t of late) { const c = cl.get(t.task_id) || []; pm.set(t.task_id, mean([1, 2, 3].map(s => C.p10(ranked(t.task_id, c, fuse(t.task_id, c, get(PPR, t.task_id), get(CO, t.task_id), get(selB('PLACEBO', 'alone', sc, s), t.task_id), w)), t.truth)))); } row.push(`w${w === 1e6 ? 'inf' : w} ${fb(diff(pm, rrfP))}`); }
    log(`PLACEBO fused-RRF: ${row.join(' | ')}`);
  }
  // oracle embeddings: truth scored 1, others 0 (all candidates scored); and a weak oracle: truth gets +0.5 on a random score
  for (const kind of ['oracle', 'half']) {
    const row = [];
    for (const w of [0.25, 0.5, 1, 2, 4]) {
      const pm = new Map();
      for (const t of late) { const tid = t.task_id, c = cl.get(tid) || [], T = new Set(t.truth); const e = new Map(c.map(x => [x, kind === 'oracle' ? (T.has(x) ? 1 : 0) : (C.tiebreak(tid + '#o', x) + (T.has(x) ? 0.5 : 0))])); pm.set(tid, C.p10(ranked(tid, c, fuse(tid, c, get(PPR, tid), get(CO, tid), e, w)), t.truth)); }
      row.push(`w${w} ${fb(diff(pm, rrfP))}`);
    }
    log(`${kind.toUpperCase()} embedding fused-RRF: ${row.join(' | ')}`);
  }
}
fs.writeFileSync(__dirname + '/a2.out.' + scopes.join('_') + '.txt', out.join('\n') + '\n');
console.log(out.join('\n'));
