// The full matrix: configs.mjs plus every configuration it lacks. This module imports configs.mjs and
// pushes the missing configurations into its exported CONFIGS array (the same array object), so any
// process that loads this file first sees one list:
//   node --import ./configs-full.mjs check.mjs D3-K4-R2 --mem-mb 1500      (check.mjs finds the new ids)
//   node --import ./configs-full.mjs run-all.mjs --only D3-K4-R2            (run-all.mjs partitions them)
// run-resumable.mjs passes --import ./configs-full.mjs to every check.mjs child by default.
// Nothing in configs.mjs is changed or removed; an id that configs.mjs already has is never redefined.
//
// What is added (the full matrix of RUN-FULL.md):
//   1. design (D) and design + fixes (DF) for every combination of 2 and 3 fields, 2, 3 and 4 faults and
//      restart limits R=1 and R=2, with the budgets K2, K3 and K4 exactly as configs.mjs defines them
//      (K4 there allows at most one fault of each kind);
//   2. every ablation (A-*) and fix ablation (X-*) of configs.mjs again with three faults (id + "-K3"),
//      with the same overrides; A-FENCE-CE, which configs.mjs runs at one fault, also at two (A-FENCE-CE-K2);
//   3. four faults with two of a kind allowed (K4F: the caps of K2 and K3, k=4) for D and DF, 2 and 3
//      fields, R=1 and R=2. configs.mjs bounds four faults to one of each kind because the 15-minute run
//      could not hold more; the owner's rule is that a limit may slow the work, never make it smaller, so
//      the uncapped budget is in the matrix. Every K4 part is contained in a K4F part (caps 1 <= caps 2),
//      so K4F subsumes K4; K4 is kept because it is far cheaper and its results arrive first.
import { CONFIGS, K2, K3, K4, FIXES } from './configs.mjs';

export { CONFIGS };
// run-resumable.mjs orders the work cheapest first by run-all.mjs's weight(); that estimate does not see
// that removing the --ce fence multiplies the state space (A-FENCE-CE at one fault: 9 parts of more than
// 2.1 million states each, against about 85,000 per part for DF2-K2-R1), so its configurations carry a
// factor. Ordering only: it changes when a part runs, never what it explores.
export const COST_FACTOR = { 'A-FENCE-CE': 100 };
export const K4F = { ...K2, k: 4 };
const BUDS = { K2, K3, K4, K4F };
export const ADDED = [];
const have = new Set(CONFIGS.map((c) => c.id));
const add = (c) => { if (have.has(c.id)) return; have.add(c.id); CONFIGS.push(c); ADDED.push(c.id); };

// 1 + 3: the design matrix
for (const [kName, bud] of Object.entries(BUDS)) {
  for (const fields of [2, 3]) {
    for (const R of [1, 2]) {
      const kText = kName === 'K4' ? '4 faults (at most one of each kind)' : kName === 'K4F' ? '4 faults (two of a kind allowed)' : `${bud.k} faults`;
      const fieldsOver = fields === 2 ? {} : { FIELDS: 3 };
      add({ id: `D${fields}-${kName}-R${R}`, title: `adopted design, ${fields} fields, ${kText}, R=${R}`, over: { ...fieldsOver, BUD: bud, R }, full: kName });
      add({ id: `DF${fields}-${kName}-R${R}`, title: `design + fixes, ${fields} fields, ${kText}, R=${R}`, over: { ...FIXES, ...fieldsOver, BUD: bud, R }, full: kName });
    }
  }
}

// 2: every ablation with three faults (and A-FENCE-CE also with two), same overrides otherwise
for (const c of CONFIGS.filter((x) => /^[AX]-/.test(x.id) && !/-K[0-9]F?$/.test(x.id))) {
  const ks = c.over.BUD && c.over.BUD.k === 1 ? [['K2', K2], ['K3', K3]] : [['K3', K3]];
  for (const [kName, bud] of ks) {
    const title = c.title.replace('(2 faults, R=1)', `(${bud.k} faults, R=1)`).replace('; 1 fault (the break needs none)', `; ${bud.k} faults`);
    add({ id: `${c.id}-${kName}`, title, over: { ...c.over, BUD: bud }, base: c.base ? `DF2-${kName}-R1` : null, full: kName });
  }
}
