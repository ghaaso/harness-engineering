// D7 write-side arithmetic. Tokens = context tokens processed (mostly cache reads), the F3 basis.
// Every input carries its tag. Run: node d7-econ.cjs
const M = 1e6;
const r = (lo, hi) => ({ lo, hi });
const fmt = x => (x / M).toFixed(2) + "M";
const show = (name, v) => console.log(name.padEnd(62), fmt(v.lo), "to", fmt(v.hi));

// Inputs
const ctxAgent = r(125e3, 150e3);   // [M] FixFlow Opus mean context per call 125k; agents 113-156k (F3 §1, §3)
const ctxSlice = 306e3;             // [M] November slice session mean context per call (F3 §1)
const agentWindow = 2.13e9 * 0.78 / 1118; // [D] FixFlow agent context tokens / agent windows (F3 §1)
console.log("agent window (processed tokens) [D]:", fmt(agentWindow));

// 1. KS strict entry, as designed (L452-458, L476): author turns record, missed-existing ruling,
//    capture, control (+ revisit) = 4-6 [G]; reviewer turns: re-run controls, blind re-rule, approve = 3-5 [G].
const authorLo = 4 * ctxAgent.lo, authorHi = 6 * ctxSlice;
const revLo = 3 * ctxAgent.lo, revHi = 5 * ctxAgent.hi;
const outLo = 7e3, outHi = 14e3;    // [E] 5-10k author + 2-4k reviewer output (L476)
const ksEntry = r(authorLo + revLo + outLo, authorHi + revHi + outHi);
show("KS strict entry, write + approve [D]", ksEntry);
// Solver was Sonnet or main: a fresh Opus subagent writes it (L476): about one agent window + reviewer
const ksEntryFresh = r(agentWindow * 0.6 + revLo, agentWindow + revHi);
show("KS strict entry, fresh Opus author [D]", ksEntryFresh);

// 2. Adversarial validation like the seed got (two xhigh refuters per claim, executed counter-evidence).
//    Workflow reported 1.7M "subagent tokens" for 7 agents (unit not stated). Processed basis:
//    298 tool uses / 7 agents ~ 43 calls each [M]; context ~100-150k [G] -> per agent:
const refAgent = r(43 * 100e3, 43 * 150e3);
show("one refuter agent, processed basis [D]", refAgent);
const advPerClaim = r(2 * refAgent.lo, 2 * refAgent.hi);
show("two refuters per claim [D]", advPerClaim);

// 3. Admission by measured benefit, per reader model: 2 arms x k trials x trial cost.
const trial = r(0.5 * M, agentWindow);    // [E] a cheap-reader solve attempt: half to one agent window
for (const k of [1, 5]) {
  show(`measured-benefit admission, k=${k} per arm, per reader model [D]`, r(2 * k * trial.lo, 2 * k * trial.hi));
}

// 4. Guard written in the fixing session: 2-4 turns [G] + 1-2 marginal review turns [G]
const guard = r(2 * ctxAgent.lo + 1 * ctxAgent.lo, 4 * ctxSlice + 2 * ctxAgent.hi);
show("guard (regression test / CI check) in the same PR [D]", guard);

// 5. Uses per entry over its life (D2, from 64 days of main): entries 15-25 [G: 30-50 % of 50 fixes];
//    verified repeats ~1 (pin drift); all true repeats 4 [M].
const hitsVer = r(1 / 25, 1 / 15), hitsAll = r(4 / 25, 4 / 15);
console.log("verified hits per entry [D]:", hitsVer.lo.toFixed(3), "to", hitsVer.hi.toFixed(3));
console.log("all hits per entry incl. candidates [D]:", hitsAll.lo.toFixed(3), "to", hitsAll.hi.toFixed(3));

// 6. Lookup-plus-verify on a hit: 3 turns at agent to slice context
const Lhit = r(3 * ctxAgent.lo, 3 * ctxSlice);
show("L_hit [D]", Lhit);

// 7. Write spend per useful hit (entry cost / hits per entry)
show("KS entry spend per verified hit [D]", r(ksEntry.lo / hitsVer.hi, ksEntry.hi / hitsVer.lo));
show("KS entry spend per hit incl. candidates [D]", r(ksEntry.lo / hitsAll.hi, ksEntry.hi / hitsAll.lo));
const mb1 = r(2 * trial.lo, 2 * trial.hi), mb5 = r(10 * trial.lo, 10 * trial.hi);
show("KS + measured benefit (k=1) per hit incl. candidates [D]", r((ksEntry.lo + mb1.lo) / hitsAll.hi, (ksEntry.hi + mb1.hi) / hitsAll.lo));
show("KS + measured benefit (k=5) per verified hit [D]", r((ksEntry.lo + mb5.lo) / hitsVer.hi, (ksEntry.hi + mb5.hi) / hitsVer.lo));

// 8. Break-even S: entry cost = hits * (S - Lhit)  =>  S = cost/hits + Lhit
const be = (cost, hits) => r(cost.lo / hits.hi + Lhit.lo, cost.hi / hits.lo + Lhit.hi);
show("break-even S, KS entry, all hits count fully [D]", be(ksEntry, hitsAll));
show("break-even S, KS entry, verified hits only [D]", be(ksEntry, hitsVer));
show("break-even S, KS + measured benefit k=1, all hits [D]", be(r(ksEntry.lo + mb1.lo, ksEntry.hi + mb1.hi), hitsAll));
show("break-even S, KS + measured benefit k=5, all hits [D]", be(r(ksEntry.lo + mb5.lo, ksEntry.hi + mb5.hi), hitsAll));

// 9. Re-validation per reader-model release over a corpus (D2: seed ~55 + 80-160 new)
const corpus = r(55 + 80, 55 + 160);
show("re-validate whole corpus once, k=1 [D]", r(corpus.lo * mb1.lo, corpus.hi * mb1.hi));
show("re-validate whole corpus once, k=5 [D]", r(corpus.lo * mb5.lo, corpus.hi * mb5.hi));
console.log("FixFlow recorded context tokens, Oct-Nov 2026 [M]: 2,130M");
// Pool the library could save: repeat-defect work 0.3-1 % of spend (D2 issue 3) of FixFlow's record
show("repeat-defect pool in FixFlow's recorded spend [D]", r(0.003 * 2.13e9, 0.01 * 2.13e9));
