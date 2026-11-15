// R9 refuter arithmetic. Inputs measured by R9-tx.cjs and R9-git.cjs where tagged [M].
// Unit: context tokens processed (mostly cache reads), the owner's unit (F3).
const M = 1e6, f = x => (x / M).toFixed(2) + "M";
const tx = require("./R9-tx.json"), g = require("./R9-git.json");
// [M] caller context at a `git commit` call: workflow agents median, main sessions median
const ctxAgent = tx.commitCallCtx["wf-agent"].median, ctxMain = tx.commitCallCtx.main.median;
// [M] small fresh agent windows: p10/p25 (3-4 calls) and median (7 calls)
const smallLo = tx.agentWindowTotal.p10, smallMid = tx.agentWindowTotal.p25, agentMed = tx.agentWindowTotal.median, agentMean = tx.agentWindowTotal.mean;
console.log("record-time ctx: agent", f(ctxAgent), "main", f(ctxMain), "| fresh agent 3-4 calls", f(smallLo), "-", f(smallMid), "| median agent", f(agentMed), "mean", f(agentMean));
// Entry cost. Lean: 1 extra author turn in an agent solver + a 3-call fresh reviewer;
// up to 2 turns in a main-session solver + a median fresh reviewer. Heavy: D7's turn counts (4-6 author) at measured ctx.
const lean = [1 * ctxAgent + smallLo, 2 * ctxMain + agentMed];
const heavy = [4 * ctxAgent + smallMid, 6 * ctxMain + agentMed];
console.log("strict entry, lean:", f(lean[0]), "-", f(lean[1]), "| heavy (D7 turn counts):", f(heavy[0]), "-", f(heavy[1]));
console.log("design's stated figure: 7k-14k (5-10k author + 2-4k reviewer); ratio lean-low/design-high:", Math.round(lean[0] / 14e3) + "x");
// Uses per entry [M from git + F2 pairs]
const uAllEvery = [3 / g.fixCommits, 5 / g.fixCommits], uVerEvery = [1 / g.fixCommits, 2 / g.fixCommits];
const nStrict = g.usesPerEntry.strictSignalRecorded.entries, firsts = g.usesPerEntry.strictSignalRecorded.firstsRecorded;
const uAllStrict = firsts / nStrict, uVerStrict = 1 / nStrict; // only the SDK-pin first is gate-checkable
console.log("uses/entry, every fix recorded: all", uAllEvery.map(x => x.toFixed(3)).join("-"), "verified", uVerEvery.map(x => x.toFixed(3)).join("-"));
console.log("uses/entry, strict rule (", nStrict, "entries,", firsts, "firsts recorded): all", uAllStrict.toFixed(3), "verified", uVerStrict.toFixed(3));
const uLo = Math.min(uAllEvery[0], uAllStrict), uHi = Math.max(uAllEvery[1], uAllStrict);
const vLo = uVerEvery[0], vHi = Math.max(uVerEvery[1], uVerStrict);
// Write spend per use
console.log("write spend per use (all hits):", f(lean[0] / uHi), "to", f(heavy[1] / uLo), "| central (1M / 0.1):", f(1e6 / 0.1));
console.log("write spend per verified use:", f(lean[0] / vHi), "to", f(heavy[1] / vLo));
// Trust layer per reader model
const replay = [agentMed, agentMean]; // one with-entry replay on the source instance (AgentBrew-style)
const full = [2 * 5 * 2 * agentMed, 2 * 5 * 2 * agentMean]; // with/without x 5 x (own case + different-cause case)
console.log("trust per entry per reader model: one replay", f(replay[0]), "-", f(replay[1]), "| with/without k=5, two cases", f(full[0]), "-", f(full[1]));
console.log("trust spend per use (uses 0.05-0.15): replay", f(replay[0] / 0.15), "-", f(replay[1] / 0.05), "| full", f(full[0] / 0.15), "-", f(full[1] / 0.05));
// A negative's lifetime saving vs one deliberate re-test, S_neg = cost of the failed approach it saves [G 1-5M]
console.log("negative: lifetime saving at 0.05-0.15 uses x 1-5M:", f(0.05 * 1e6), "-", f(0.15 * 5e6), "| one re-test (agent run):", f(agentMed), "-", f(agentMean), "+ a build where the symptom is EAS/device");
// Store-level probe trial per reader model (40-60 probes; author 0.5-1M each [G]; 2 arms x agent run)
console.log("store-level probe trial per reader model:", f(40 * (0.5e6 + 2 * agentMed)), "-", f(60 * (1e6 + 2 * agentMean)));
