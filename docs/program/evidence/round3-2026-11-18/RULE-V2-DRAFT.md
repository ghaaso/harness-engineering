# The decision rule, version 2 (draft of 2026-11-19, checks folded in)

**Status: a draft and a hypothesis. Nothing was run, measured or tuned in writing it or in folding the checks into
it.** Step 1 of the v2 work (kind analyse, Opus) wrote it from the brief `R:v2-brief-draft.md`. Step 3 (kind analyse,
Opus, brief `R:v2-brief-fold.md`) folded in two checks: `R:v2-gate.md` (does each cited claim id exist and carry the
stated verdict) and `R:v2-refute.md` (a fresh-context refuter's verdict on each statement). Sources: version 1
(`B:DECISION-RULE.md`), `B:BUILD-IN.md` sections 0 and 4, and the four final reports of round 3 (`R:c1-report.md`,
`R:w1-report.md`, `R:t1-report.md`, `R:a1-report.md`) with their claims and refute files. `B:` =
`docs/program/evidence/bottleneck-2026-11-18/`, `R:` = `docs/program/evidence/round3-2026-11-18/`. No record, version
1, `B:BUILD-IN.md` or lane file was edited. Section 8 says what the fold changed.

**How to read it.** Every statement that rests on a lane carries a number `V2-nnn` and, beside it, the v2 refuter's
verdict: `confirmed`, `holds in part`, `refuted` or `cannot be checked`. A statement that held in part is written here
narrowed: to the part that held, or with the part that failed named. The one refuted statement left the rule (Step 8).
`R:v2-claims.md` gives, for each number, the lane claims it rests on with their verdicts word for word, the v2 verdict,
and what the fold did. A lane claim id carries its lane: `c1:C07` (the check), `w1:W62` (several writers), `t1:C84`
(the tree), `a1:A82` (the allowance). Lanes c1 and t1 both count from C01. A lane claim "corrected" means its
refuter's corrected form.

**Marks** (r57-0010): `proven in the literature`, `measured here`, `hypothesis`. A result proven for databases, queues,
schedulers or ad systems, and not yet for model sessions, is `proven in the literature` for its field and `hypothesis`
for sessions; both are said. A mark names the kind of source; it never raises a v2 verdict: where a statement held in
part, its mark covers the narrowed part only. A company's own figure says "self-reported" (r57-0030). A claim that held
only in part is used for that part only; a refuted claim only to say what was refuted. No number is set here: a
missing number is named as a measurement (Q01 to Q36, section 5), never guessed (r57-0001, r57-0002). The rule is
stated in ratios (r57-0028) and shown by how each conclusion was reached (r57-0027). Objective, as ruled (r57-0003):
quality first, then the least time, memory and tokens.

**Symbols.** Unit and width: as in version 1. S: time of one check run. Z: a worker's own time between two checks.
c: check slots. N: workers. p: share of changes that fail the check. u_j: share of window j used; s_j: share of its
time gone. k: regions of a file one unit touches; F: regions of the file. L: leaves the packer makes; b: children one
parent holds per epoch; R: realised over estimated work of a leaf; f: fill factor.

## 1. The answer

1. Version 1's frame is kept as version 1's own: one calculation, the smallest width over all resources, redone at
   each start and finish, acting only at the gate (V2-001 holds in part: the frame is not a round-3 finding). Round 3
   adds two kinds of width. Each token window, which version 1 treated as a budget and not a width, joins the minimum
   only by a1's inference (V2-001 holds in part; V2-010 holds in part). The parent's window is the other (V2-002
   confirmed). It adds a second stop: a unit that reaches its own cap is stopped; the form this draft takes, commit and
   end, has no source and is untested (V2-003 holds in part).
2. From the moment a token window's used share runs ahead of its time share, u > s, it caps starts at (1 − u)/(1 − s)
   of the even rate, as Yahoo re-plans; the cap limits anything only while demand exceeds that rate (V2-004 holds in
   part; V2-005 holds in part). While it limits, the best value per token goes first (V2-017 confirmed).
3. A unit starts only if its expected usage fits in every window it draws on (V2-010 holds in part: proven only for
   meters that know a cost on arrival). Its price is the sum of the windows' prices, exact only for additive costs
   (V2-011 holds in part). The same price picks the model, a redo counted (V2-015 holds in part).
4. What starts next: where a unit needs a share of something not free now, a reservation for the oldest unit that does
   not fit, shorter units filling in behind it (V2-018 confirmed). Where every unit needs only a worker, the order is
   open between version 1's shortest expected check first and first come, first served; version 1's order stays until
   Q34 (V2-020 holds in part). A length is the mean of the last two units of its class and model, raised to the cap on
   overrun (V2-021 confirmed).
5. The check: past c(S + Z)/S workers more only queue; proven for one slot, computed for c (V2-029 confirmed; V2-030
   confirmed), and changes wait below that point too (V2-031 holds in part: the wait figures are the exponential
   model's). Its levers are to shorten the run, batch what waits, test ahead and let a waiting worker go on (V2-041
   holds in part; V2-035 confirmed; V2-044 confirmed; V2-046 holds in part). **Their order is open**: the only
   shortening open at the gate today, test files side by side, is untested, and the one study with few concurrent
   builds advises selection where builds are few and batching where machines are scarce, and we are both (V2-052 holds
   in part). Q21, Q05 and Q07 settle it.
6. Several writers: the per-file switch is replaced by seven parts, reshaping shared places first and version-checked
   writes second (V2-062 holds in part; V2-054 confirmed); the order of writes can be fixed before work only for what
   a plan declares (V2-059 confirmed). No file gets one owner by default; where an owner pays is open (V2-069 holds in
   part). A CRDT of a whole file is neither used nor ruled out: the draft's drop of it was refuted (V2-077 refuted; Q36).
7. The tree: its kind follows L against b and R against 1/f (V2-090 holds in part; V2-091 holds in part). No new keys
   arrive during a run, so a leaf overflows only from estimate error (V2-140 holds in part). Whether a leaf that
   outgrows its window is split or handed over is open; a split, if chosen, takes the B-link form (V2-092 holds in
   part; V2-098 confirmed). The largest expected gain is fewer parent wakes (V2-087 confirmed).
8. No number is set yet. The lanes name 33 measurements and the fold adds one (section 5). Six are counts over files
   already on disk that need no run, each with a gap its row states. Q01 and Q05, with Q10's meter readings, set the
   most numbers; Q01's window usage waits for Q10, and Q05's failure rate waits for a gate's results, which do not
   exist yet (V2-113 holds in part; V2-117 holds in part).

## 2. The table

Change: **kept**, **corrected**, **replaced**, **new**, against version 1. The v2 verdict stands beside each `V2-`
number. "Lane verdicts" are the lanes' fold verdicts; "in part" = holds in part. Count: 38 conclusions; 8 kept, 9
corrected, 2 replaced, 19 new (row 9 moved from replaced to corrected in the fold).

| # | Conclusion | Change, and why | From | Measured gain and its conditions | Lane verdicts | Still a guess for model sessions |
|---|---|---|---|---|---|---|
| 1 | The smallest width over all resources, redone at every start and finish; no switch (V2-001 holds in part) | **Kept** as version 1's own frame. a1's "fit in every window" joins it only by transfer (A71, a hypothesis): of the meters read only ATM's rule gates on every bucket (RFC 2698 marks a packet and passes it), and version 1 kept tokens a budget, not a width (rows 4, 6) | a1:A29, A30, A71 | None; the two-bucket rules are specifications | Confirmed | Whether a width can be read in time (Q15) |
| 2 | Act only at the gate; the limit is enforced there, and the budget is also shown in the prompt (V2-026 holds in part) | **Kept**; a1 adds a source. The draft's "not in the prompt" failed: the one tracker measured sat in the prompt | a1:A52, A53 | Told its costs, an agent still broke a hard budget in 32.8 % of tasks (GPT 4.1 mini) and 12.4 % (GPT 5 nano), on simulated tool prices; a budget tracker in the prompt raised SWE-bench Verified resolve from 36.8 to 55.4 % at 50 calls | A53 confirmed; A52 in part | One model per figure, simulated tools |
| 3 | Running work stops at the memory floor, and a unit that reaches its own cap is stopped; this draft takes commit-and-end as the form (V2-003 holds in part) | **Corrected.** Version 1 stopped only for memory. EASY kills a job at its stated length, losing its work; commit-and-end is the other option t1's refuter named, with no source. A reservation's start time needs a cap in time; the tree's cut is a token budget and bounds time only through the spend rate | a1:A61, A79; t1:C91, C92 | None for sessions | A61, C91 confirmed; A79, C92 in part | Tokens lost at a stop (Q02); the spend rate that turns a token cap into a time (Q01) |
| 4 | A window caps starts from the moment u > s; the cap limits anything only while demand exceeds the re-planned rate (V2-004 holds in part) | **Corrected.** Version 1 (r57-0408): only when a window is nearly spent | a1:A82, inferred from A01, A05, A14 | None | A82 confirmed, an inference, so a hypothesis; A01, A14 confirmed; A05 in part | Whether our demand exceeds the windows (Q09, Q10) |
| 5 | One window is paced by re-planning: the rest at (1 − u)/(1 − s) of the even rate; a reserve for running units; no fixed early finish (V2-005 to V2-008 holds in part; V2-009 confirmed) | **New.** Version 1 said "above a reserve" and named no pacing. Re-planning is Yahoo's form; LinkedIn's steps a participation rate against a fixed plan, a different form | a1:A05, A11, A14, A15, A21, A24, A41, A69, A70, A75, A76 | LinkedIn's form (not re-planning), pacing on against off, daily budgets: median budget life (time to spend 95 %) +44 % / +149 %, unique impressions per spend +7.74 % / +10.52 % (self-reported; V2-028 confirmed) | A11, A14, A15, A21 confirmed; A05, A24, A41, A69, A70, A75 in part; A76 refuted | Which form works at tens of units (Q33) |
| 6 | Several windows: a unit starts only if its expected usage fits in every window it draws on; its price is the sum of their prices (V2-010 holds in part; V2-011 holds in part; V2-012 holds in part) | **New.** The lane frame's "the dearer price binds" is replaced. Fit is proven for meters that know a cost on arrival, not for expected usage; the sum is exact only for additive costs, not shown for windows that count the same tokens; the week test needs windows that count usage alike | a1:A21-A23, A25, A29, A30, A71-A73 | None. The sum is asymptotically optimal at large volume and "not optimal in general" | A21-A23, A25, A29, A30, A71 confirmed; A72, A73 in part | Which windows a one-model unit draws on (Q11); sizes, k, and whether windows count alike (Q10) |
| 7 | The windows: the 5-hour period starts at the first message and resets in full five hours later; the weekly reset is fixed per account; some plans add a weekly window for one model; all clients count (V2-013 confirmed; V2-014 confirmed) | **Corrected.** Answers version 1's measurement 6, "fixed or rolling", from the provider's pages (undated, fetched 2026-11-19; limits may change) | a1:A36-A43 | Not a gain | A36-A39, A42, A43 confirmed; A40, A41 in part | Sizes, carry-over, cache weight, weights (Q10-Q13) |
| 8 | The model: the highest value minus summed price × window usage, a redo counted; no source read applies this to models (V2-015 holds in part; V2-016 holds in part) | **Replaced.** Version 1 used the cheaper model only where its gap was measured small | a1:A25, A44-A48, A74 | FrugalGPT 98.3 / 73.3 / 59.2 % lower cost in dollars at the best model's accuracy, read through the collector's note only; other routers counted per-query units (AutoMix) or a share of queries (Hybrid LLM), and some saved only below the best quality (RouteLLM at 95, 92 and 87 %; Hybrid LLM lost 10-14 %); none in tokens on code | A25, A46, A48 confirmed; A44, A45, A47, A74 in part | Pass rate, usage and redo by kind and model (Q16) |
| 9 | Next unit: fit as a filter; value per token first while a window limits; where a unit needs a share of something not free, a reservation for the oldest unit that does not fit, later units backfilled shortest first only if they do not delay it; where every unit needs only a worker, the order is open (V2-017 to V2-019 confirmed; V2-020 holds in part) | **Corrected.** Version 1: shortest check first, then oldest, with an age cap. The reservation replaces the age cap only together with the stop at the cap (row 3). With one-worker units it reduces to first come, first served, which is not shown to be good: shortest first lowered wait in A55 and A58. Version 1's order stays for that case until Q34 | a1:A12, A55, A56, A58, A62, A77, A79 | EASY++ against EASY: wait −23 %, bounded slowdown −37 %, four real logs replayed in a simulator, 100-1,152 processors, mean run 73-188 min (SDSC gained only 10 %). Yahoo value layers: cost per click −72 / −67 / −79 % (self-reported, 3 campaigns) | A12, A55, A56, A58, A62 confirmed; A77, A79 in part | Whether it holds at 3 to 16 workers, and which order for one-worker units (Q34); a value per unit (Q17) |
| 10 | A length is the mean of the last two units of its class and model; an overrun raises it to the cap; the cap is a limit, never the prediction (V2-021 confirmed; V2-022 confirmed) | **New.** Version 1's Step 0 kept figures but had no predictor | a1:A57-A59, A61, A79 | Uncorrected predictions: accuracy +49 % but wait +454 % (the mean of rows from +38 to +920 %), slowdown +515 % (same logs) | A57-A59, A61 confirmed; A79 in part | Keying by class and model is untested (Q01, Q18) |
| 11 | The check's worker cap: c(S + Z)/S; 1 + cZ/S is c − 1 too low; changes wait below the cap (V2-029 confirmed; V2-030 confirmed; V2-031 holds in part; V2-032 holds in part) | **Corrected.** The mark "reasoned" becomes proven for one slot and computed for c; waits below the cap added. The wait figures are the exponential model's; a fixed-length suite lowers them, not to zero; the spread of S is an input whose weight is not shown | c1:C01-C09, C11, C66 | None; analytic. At the cap the check is 79-92 % busy and a change waits 0.16-2.15 check times (exponential times) | C01-C09 confirmed; C11, C66 in part | Whether two runs at once slow each other (Q20); Z (Q06); the spread (Q05, Q35) |
| 12 | Case A, one task in pieces: the square root of (time outside / time inside) (V2-034 holds in part) | **Kept** | c1:C16 | Within 1 % of the minimum execution time (not of the best count), four programs, a simulator, a section inside one program | Confirmed | Whether session pieces fit case A |
| 13 | The cap moves with c, S and Z: a shorter or batched check moves it, more workers never do (V2-030 confirmed; V2-033 holds in part) | **Kept** (version 1: "makes the check wider or shorter"), now sourced. The draft's "only with the serial step" is in no claim | c1:C12-C15 | Memcached peak 22 → 48 threads after two changes (the cache lock partitioned, the stats made per thread); on a simulated chip MySQL saturated at 16 threads, and with ACS kept rising to 32, the most tried | C13 confirmed; C12, C14, C15 in part | None beyond S and Z |
| 14 | A worker that goes on while its change waits: the check binds when N·S/c reaches Z; w1's "T < 10N minutes" is this with one slot (V2-051 confirmed) | **New.** Settles w1 against c1 | c1:C07; w1:W84 | None; 596 s for one run (measured here) | C07, W84 confirmed; the w1 form is its refuter's own reasoning | T per unit (Q01, Q06) |
| 15 | Shorten the check: test files side by side; selection in the pre-check; the full suite at the gate until a dependency map exists, then dependency selection; no prediction at the gate (V2-041 holds in part; V2-042 confirmed; V2-043 confirmed). Whether it comes first is open (V2-052 holds in part) | **New** | c1:C26, C38, C39, C42, C44, C57, C58 | Ekstazi 32 % (54 % on long suites), up to 38 % slower on short ones; Facebook half the cost with 99.9 % of faulty changes caught, relying on later stages that run the rest, which our gate lacks; Google 42-55 % with no miss, a simulation on one month with the cut chosen on the same data (both self-reported) | C39, C42, C58 confirmed; C26, C38, C57 in part; C44 refuted | Whether our test files run side by side (Q21); the share of changes that touch `lib` (Q07) |
| 16 | Batch what waits: a greedy batch capped by p, a failed batch split in the fewest rounds the free slots allow, no timer (V2-035 to V2-040 confirmed) | **New** | c1:C17-C28, C59, C60 | Dorfman's gain 5.0 at p = 1 %, 1.7 at 10 %, 1.01 at 30 %; Ericsson 72 % fewer runs at 2.8 % culprits, 41 % with flaky tests (simulated); with few concurrent builds batching lost its lead | C17, C19, C20, C27, C28 confirmed; C18, C21-C26, C59, C60 in part | p of model changes (Q05); independence (Q22) |
| 17 | Test ahead on the success path in a free slot, the window halved per failure; a run whose base passes is the real check (V2-044 confirmed; V2-045 holds in part) | **New** | c1:C33-C36, C61, C65 | Uber P50 2.98 times an oracle against 80 for one queue: a maximum under contention in a replay of one iOS monorepo (self-reported) | C33, C35, C36, C65 confirmed; C34, C61 in part | Success odds of model changes (Q05) |
| 18 | A waiting worker starts its next unit, with a cap on changes in flight and a way back for a failed change; it saves clock time and costs the tokens of stacked work redone after a late failure (V2-046 holds in part) | **New** | c1:C30, C31, C56, C62 | None carries: Aether's 68 % came from relieving scheduler overload | C31, C56 confirmed; C30, C62 in part | A second unit ready; redo tokens after a late failure (Q02) |
| 19 | The lane logs its slots and waiters, orders them, and holds and times out above the longest check (V2-047 confirmed; V2-048 confirmed) | **New.** Version 1's Step 5 and measurement 7 need it | c1:C46, C47, C49-C51, C63; w1:W84 | 177 min waited against 365 run over 780 commands (measured here) | C46, C47, C49-C51, W84 confirmed; C63 in part | None |
| 20 | The order of writes is fixed before work only for what a plan declares; places found while working are claimed in resource order, by wait-die, or validated at landing (V2-059 to V2-061 confirmed) | **Corrected.** Version 1 lines 124-127 assume the change list is known | w1:W36-W39, W66, W93 | Aria 2.4 times Calvin at low contention, 39 % of itself at skew 0.999; Co-Coder 56.8 → 68.1 % on DevEval, 1.81 times faster, all on gpt-5-mini | W36, W37 confirmed; W38, W39, W66, W93 in part | Whether a plan's file list matches what a session touches (Q07) |
| 21 | Reshape shared places: one entry per unit applied at landing; "next free" numbers chosen at landing. It removes the hot place's own term; a unit's chance over the other regions still grows with N (V2-062 holds in part; V2-063 confirmed; V2-064 holds in part) | **New.** Generalises r57-0401's skeleton step, which version 1 offered beside one owner for its 7 sequences and 4 same-statement places (K9) | w1:W24, W40, W42, W43, W83 | Doppel 38 times OCC on one hot key, 3 times on a larger application, for updates that commute; invariant confluence 25-fold on 200 servers. No gain stated for taking Silo's counter out. Our 20 places counted from the plan's change list, not from diffs | W43 confirmed; W24, W40, W42, W83 in part | Which of our 20 places become entries (Q07) |
| 22 | Version-checked writes: a write names the version it read; a refusal gets the current text, a diff and a short reservation; one write is redone only when the refusal concerns that file alone (V2-054 confirmed; V2-055 holds in part; V2-056 holds in part; V2-057 confirmed; V2-058 holds in part) | **New** | w1:W01-W03, W62-W65, W87, W94 | 82.5 % against 63.8 % for own worktrees and 66.4 % for one agent, Commit0-Lite, at most 4 writers (3.6 on average), one preprint, no repeated runs or variance reported, gains concentrated on large repositories | W01-W03, W62, W63, W87 confirmed; W64, W65, W94 in part | Whether our Edit path can carry a check (Q26); how often a refusal comes from a changed read (Q02) |
| 23 | Claims below the file at the grain a unit touches, the grain measured; one owner of a hot pair or file only as the last rung (V2-065 confirmed; V2-066 holds in part; V2-067 confirmed; V2-068 confirmed; V2-069 holds in part) | **Replaced.** Version 1's per-file switch on a conflict count | w1:W10-W12, W15-W18, W20, W26, W90, W91, W95, W96 | 1977 simulation: useful I/O 7,042 → 9,438 from 1 to 10 granules, peak near 20; in another study coarse locks held to the end of 10-step units deadlocked. Neither number carries (V2-106 confirmed). Silo ownership 1.54 times with no crossing, below OCC at about 20 % crossing | W10-W12, W17, W18, W20, W26 confirmed; W15, W16, W90, W91, W95 in part; W96 cannot be checked | k and F per file (Q07); the replay over grain and ownership (Q08) |
| 24 | Wait or redo has no published direction; version 1's product is kept as a per-pair computation; with version-checked writes the redo is one write when the refusal concerns that file alone, and the steps built on a read when a read changed (V2-070 confirmed; V2-071 confirmed; V2-072 holds in part) | **Corrected.** Version 1 lines 131-135 took a direction from r57-0301 | w1:W30, W31, W34, W62, W92, W94 | In 2PL waiting beat no-wait as transactions grew; in Silo no-wait won | W62 confirmed; W30, W31, W34, W94 in part; W92 refuted | The crossover in tokens (Q02, Q25) |
| 25 | Every landing through the check, in one order, with undo; no check in a copy holding more than the units it judges (V2-074 confirmed; V2-075 holds in part) | **Kept**, one rule added. The added rule rests on the w1 refuter's reasoning about dirty reads by the judge, which no claim carries | w1:W03, W54-W56, W75, W80 | kdiff3: 3 wrong clean merges in 52; 1 % build and 6 % test failures over human merges | Confirmed; the added rule has no claim | The rate for session pairs (Q24) |
| 26 | Checkpoints inside a unit; a refusal returns to the last one (V2-073 holds in part) | **New** | w1:W71-W74, W94 | None: one survey found no performance metrics and one empirical study | W71-W74 confirmed; W94 in part | All of it (Q02) |
| 27 | Operation transforms among peers are out; a CRDT of a whole file is neither used nor ruled out; structured merge comes last, as a convenience (V2-076 confirmed; V2-077 refuted; V2-078 holds in part; V2-079 confirmed) | **Corrected.** r57-0304 narrowed: a central server is not covered. The draft's drop of a whole-file CRDT was refuted: one preprint cannot drop a family of methods | w1:W49-W51, W57-W61, W79 | Semistructured merge: about 24 % fewer reported conflicts and no fewer wrong clean merges; s3m, a structured tool, halved reported conflicts with at least 8 % fewer wrong clean merges. CodeCRDT: 13.1 % slower overall with 82-189 % more code, faster per 1,000 characters in 5 of 6 tasks | W50, W51, W57-W59, W79 confirmed; W49, W60, W61 in part | Rename-heavy session edits (Q23); a whole-file CRDT on session edits (Q36) |
| 28 | The parent's window is a resource; a wake waits while nothing urgent waits (V2-002 confirmed; V2-086 to V2-089 confirmed) | **New** | t1:C09, C18, C37-C42, C50, C92, C113 | B-epsilon: inserts 16 times faster for about twice the query cost (an argument). 97 % of tokens are window re-reads (measured here, on two other repositories; for the tree, which never ran, a transfer) | C09, C37-C41 confirmed; C18, C42, C50, C92, C113 in part | That a wake costs mostly its fixed re-read (Q03) |
| 29 | The tree's kind by size: two levels bulk-loaded for a small job; for a leaf that outgrows its window, split or hand over is open, and a split takes the B-link form; more epochs or an inner level for a very large job (V2-090 holds in part; V2-092 holds in part; V2-093 to V2-095 confirmed; V2-096 holds in part; V2-097 confirmed; V2-098 confirmed; V2-100 confirmed) | **New.** Version 1 has no tree; "three levels, never more" holds for the small case. No new keys arrive during a run (keys frozen, R46) | t1:C08, C12, C17, C19-C24, C34-C36, C45, C46, C51, C58, C70-C72, C76, C79-C90, C96, C109, C110, C114 | Dremel: a fourth level halved one many-group query; RAO 196K against 1,029K tokens with 83.9 % of delegations concurrent, 18 times slower with 1.6 % (trained agents; tasks both methods solved; the saving is in cache reads) | C12, C17, C19-C24, C58, C71, C72, C96 confirmed; C08, C34-C36, C45, C46, C70, C76, C79-C89, C109, C110 in part; C51, C90, C114 refuted | s_summary, compression, children at once (Q03, Q04); a hand-over's reload against a split's start cost (Q30) |
| 30 | f is computed: f = 1/q_{1−p}(R), one per capacity (V2-091 holds in part) | **New.** `fill_factor` 0.75 is read by no script | t1:C02, C62, C63, C84, C98, C100 | Occupancy, not gain, and guaranteed minima, not expected fill: B+ at least 1/2 (expected about 69 %, ln 2), B* at least 2/3; InnoDB 15/16 in key order (the vendor's manual, self-reported); Facebook 1/2-2/3 (self-reported) | C02, C62, C98, C100 confirmed; C84 in part | The spread of R (Q29) |
| 31 | Run-state files are written by a script step, not a session; whether that step takes the run lock for every write or keeps today's compare-and-set on the task table is open; code files get no owner by default (V2-099 holds in part; V2-069 holds in part) | **New.** The ground is cost (K10) | t1:C16, C36, C91, C92; w1:W20, W26, W87 | As row 23 | C91, W20, W26, W87 confirmed; C36, C92 in part | Splits per hour, seconds per posting (Q31) |
| 32 | A speculative copy only when the time saved is worth the summed price × its tokens (V2-023 holds in part) | **New.** Narrows x19-0701 | a1:A64-A67, A80 | LATE 27 % faster than Hadoop's own copies and Dolly 34-46 % (research prototypes); MapReduce's sort took 44 % longer without copies, Mantri 32 % (both self-reported); four baselines | A64, A65, A67 confirmed; A66, A80 in part | Whether slowness comes from the run (Q18) |
| 33 | A fixed batch: any order within 2 − 1/m of the best; longest first only with exact lengths, independent units and no shared token window, and ours share windows (V2-024 holds in part) | **New** | a1:A68, A81 | Analytic | A68 confirmed; A81 in part | Lengths known only roughly; shared windows |
| 34 | A reserved share for units that must not stall; retries as a budget (V2-025 confirmed) | **New** | a1:A31-A33 | None measured (practice, self-reported) | Confirmed | The share of reruns (Q01) |
| 35 | Memory, processor and bandwidth as in version 1; memory stays the hard limit; each part is chosen against the ruled objective, not tokens alone (V2-103 holds in part) | **Kept.** No lane read them. t1's "chosen against measured tokens" is narrowed to the objective of r57-0003 (K11) | t1:C115 | As version 1 | In part | As version 1 (its measurement 1); whether tokens bind ahead of memory (Q09, Q10, Q19) |
| 36 | Every constant is a measurement; only the shape carries (V2-027 holds in part; V2-106 confirmed) | **Kept** | a1:A03, A18, A20, A27, A78; c1:C14 | At our size, numbers only for known demand (at least 90 % at 25 units, given time to sell all at the run-out price) or the worst case (about 29 % at U/L = 10, for a unit 5 % of the window, a share no claim measured) | A27 confirmed; A03, A18, A20, A78, C14 in part | Every constant |
| 37 | The allowance and a shared check have papers; nested windows that count the same tokens still have none read; no real system with 3 to 16 workers and units of minutes was found, only near cases (V2-104 holds in part; V2-105 holds in part) | **Corrected.** Version 1's "three parts have no paper" (a statement on sources, not on the rule) | c1:C01-C06, C23-C26, C33-C37; a1:A01, A05, A11, A14, A21, A23, A25, A55, A56, A71; w1:W95 | Not a gain. Near cases: Ries 1977 simulated units of minutes, about 10 sharing one I/O path; one CI project with few concurrent builds | As in those rows | That the shapes carry to sessions |
| 38 | Step 5 (a standing queue at the check is the signal) and Step 6 (throughput against workers) stay; the outer fit needs at least six points (V2-031 holds in part; V2-106 confirmed) | **Kept** | c1:C08, C14, C66 | None | C08 confirmed; C14, C66 in part | None |

## 3. The rule, step by step

Each part says how it was reached and carries its mark. "Kept" means as version 1 words it.

### Step 0. Measure each class of unit first

- Kept: per class of unit, keep from finished units busy threads, peak private memory, time in the check, time outside
  it, and window usage; a new class runs alone until its figures are steady. `hypothesis` (version 1).
- Added: predict a unit's length and usage as the mean of the last two finished units of its class and model; when a
  unit outruns its prediction, raise the prediction to its cap (V2-021 confirmed). Reached: EASY++'s predictor, with
  "two jobs slightly better than one". `proven in the literature` for supercomputer job logs replayed in a simulator;
  `hypothesis` for sessions, since keying by class and model instead of by user is untested.
- Added: the cap is an upper limit that is enforced; it is never the prediction. Predictions that ran short, left
  uncorrected, made waits 454 % worse on average, rows from +38 to +920 % (V2-022 confirmed). `proven in the
  literature` (same logs); `hypothesis` for sessions.

### Step 1. Each width, in ratios

**Memory, processor, memory bandwidth, ready work.** Kept as version 1 words them; no lane of round 3 read them.
Memory stays the hard limit (V2-103 holds in part). The part of t1's statement that failed: "each part chosen against
measured tokens". The ruled objective is quality first, then the least time, memory and tokens (r57-0003), and t1's
own refuter found that the token figures show where tokens go, not that tokens bind ahead of memory (K11). Marks as
version 1.

**The check.** One formula covers every case: the check binds when N·S/c reaches the worker's cycle.
- A worker that waits for its check has the cycle S + Z, so the check binds from N = c(S + Z)/S (V2-029 confirmed;
  V2-030 confirmed). Reached: for one slot, Denning and Buzen's saturation point; for c slots no source states it, so
  lane c1 evaluated the exact finite-source model in 16 cases, and its refuter derived the same point from two bounds
  that hold for any distribution: each slot at most fully busy (throughput ≤ c/S) and a cycle at least S + Z
  (throughput ≤ N/(S + Z)). The form 1 + cZ/S treats c slots as one slot c times faster and is c − 1 too low. Mark:
  c = 1 `proven in the literature`; c > 1 `hypothesis` in the strict sense (no source states it), derived from
  published bounds. For model sessions `hypothesis`: it assumes S and Z do not change with N and that c runs go side
  by side at full speed on one PC.
- Changes wait below that point (V2-031 holds in part). In the exponential model, at the point the check is 79-92 %
  busy and a change waits 0.16-2.15 check times, and below it about 0.6 S in the two cases computed; a fixed-length
  suite with variable Z lowers these waits, not to zero. The spread of S is an input of the two-moment model; how much
  it changes the wait is not shown (V2-032 holds in part). `proven in the literature` for the exponential model;
  `hypothesis` for our spread. At 596 s a run, 3 waiting workers reach the cap with 2 slots only if Z/S < 0.5, with 1
  slot if Z/S < 2; 16 workers with 2 slots if Z/S < 7 (V2-049 confirmed). That is where they reach the cap, not where
  waiting starts. `hypothesis` (arithmetic on the formula).
- A worker that starts its next unit while its change waits has the cycle Z, so the check binds from N = cZ/S
  (V2-051 confirmed). w1's refuter computed "the check binds when T < 10N minutes" for 596 s a run: that is this case
  with c = 1. The lane has c = 2. `hypothesis` (arithmetic on the same two bounds).
- Batching: put S·C(k, p) for S, the check time spent per change (V2-035 confirmed). `proven in the literature`
  (Dorfman's cost; the batched point is a crossing of upper bounds, reached only where full batches form);
  `hypothesis` for model changes.
- The cap moves with c, S and Z; more workers never move it (V2-030 confirmed). The published examples (V2-033 holds
  in part): memcached's peak moved from 22 to 48 threads after two changes, the cache lock partitioned and the stats
  made per thread; on a simulated chip MySQL saturated at 16 threads, and with ACS kept rising up to 32, the most
  tried, so 32 is the end of the test, not a moved cap. The draft's "only with the serial step" is in no claim.
  `proven in the literature` for those examples.
- Case A, one task cut into pieces that each pass the check: the square root of (time outside / time inside), kept
  (V2-034 holds in part). Suleman's count came within 1 % of the minimum execution time, on a simulator, for a section
  inside one program. `proven in the literature` there; `hypothesis` for session pieces.

**Each token window j** (the 5-hour period, the week, and on some plans a week for one model: V2-013 confirmed).
- While u_j ≤ s_j the window does not limit starts. From u_j > s_j it caps them at (1 − u_j)/(1 − s_j) times the even
  rate (V2-004 holds in part; V2-005 holds in part). The cap limits anything only while demand exceeds that rate: a
  window ahead of its line limits nothing while demand stays under the reduced rate (A82 as its refuter reads it).
  Reached: a1's inference (A82) and Yahoo's re-planning of the rest over the rest (A11, self-reported). LinkedIn's
  pacing is a different form: it steps a participation rate by 1.1 or 0.9 each minute against a fixed plan (A14,
  self-reported). The price form of the theory (A05) is a third rule: after a lull it does not spend the saved part,
  and its no-early-stop gap is fixed in steps, so it can be a large share of a window of tens of units when one unit
  can cost several times the per-step budget (V2-006 holds in part). Mark: re-planning and the price form `proven in
  the literature` (production, self-reported, for re-planning; theory for the price form); their mapping to our
  windows `hypothesis`.
- A window's price (V2-007 holds in part). Under re-planning it is zero while demand fits the re-planned rate; above
  it, the value per token of the last unit the rate still lets in, re-solved at each decision (what is re-solved is
  the value-function approximation). Under the price form it is not zero below the line in general: it can stay
  positive after a lull, and a burst of lumpy units raises it while total demand is under the line (A69, A70 corrected;
  K14). `hypothesis` built on a `proven` bid-price form.
- A unit is admitted on its expected usage, so each window keeps back a reserve: the expected remaining usage of the
  running units (V2-008 holds in part). A latency margin (x20-0460, a designed-only record) would guard a lag of the
  meter that is not documented; Q15 measures it. The harm the reserve prevents is a unit cut off at the limit and
  redone: the provider stops work there. A small capped wrap-up of a response already under way is documented at the
  5-hour limit only; nothing is documented at the weekly limit. `hypothesis`.
- No plan ends one unit length before the reset: refuted in lane a1; a margin of that kind comes only from a measured
  forecast error, and only if an unspent part is lost (V2-009 confirmed).
- The week binds on average when k, the weekly size over the 5-hour size, is below the number of 5-hour periods opened
  in a week; that number is 33.6 only if work runs round the clock. This holds only if the windows count usage the
  same way, which is not documented. A one-model window adds a second ratio (V2-012 holds in part). `hypothesis`
  (arithmetic on documented rules).
- Not known: each window's size, the weights of models and effort, carry-over, how cached input counts in Claude
  Code, and whether a one-model unit is also charged to the all-models week (V2-014 confirmed). Each is a measurement
  (Q10 to Q13).

**The parent's window (new).** A coordinator re-reads its window at every wake: 97 % of tokens were such re-reads on
two other repositories (V2-086 confirmed, `measured here`; for the tree, which never ran, a transfer). It is a
resource the width table did not list (V2-002 confirmed). A parent can hold b children per epoch, with b ≤ (g·k* −
own growth per epoch)/s_summary: the room the parent's window grows by in one epoch, less its own calls, over the size
of one child's summary (V2-095 confirmed). `hypothesis` on a `proven` height law.

**Shared files.** No width: see Step 8.

### Step 2. Width = the smallest

Kept as version 1 states it (V2-001 holds in part: the frame is version 1's own). Applied to the windows: a unit
starts only if its expected usage fits in every window it draws on, above each window's reserve (V2-010 holds in
part). Reached: of the meters read, ATM's rule admits a cell only if every bucket allows it (RFC 2698 marks a packet
yellow and still passes it), and both know each cell's or packet's cost on arrival. Admitting on expected usage lies
outside them; that windows join the minimum at all is a1's transfer (A71), since version 1 kept tokens a budget, not a
width. `proven in the literature` for meters with known costs; `hypothesis` for the assembly. "Two resources within
one unit of each other count as two at once": kept.

### Step 3. Act only at the gate; two stops

- Hold new units back at the gate; the limit is enforced there (V2-026 holds in part). Told its costs, an agent still
  broke a hard budget in 32.8 % of tasks (GPT 4.1 mini) and 12.4 % (GPT 5 nano), on simulated tool prices. A budget
  tracker shown in the prompt raised SWE-bench Verified resolve from 36.8 to 55.4 % at 50 calls, so the budget is
  also shown in the prompt: that adds to the gate and does not replace it. `proven in the literature` (one model per
  figure, simulated tools); `hypothesis` here.
- Stop 1, kept: at the memory floor, the least important unit.
- Stop 2, new: a unit that reaches its own cap is stopped (V2-003 holds in part). Reached: a reservation for the
  oldest unit promises a start time only if running units end at their caps; a session that is not stopped can delay
  the reservation without bound. EASY kills a job at its stated length, and the kill loses its work. This draft takes
  the other form t1's refuter named: commit what the unit has and end; no source gives that form and it is untested.
  A reservation needs a cap in time; the tree's cut is a token budget (soft_frac), which bounds time only through the
  spend rate (Q01). The tree's cut becomes "commit at soft_frac and end" (t1:C92 corrected). Mark: a stop at the cap
  `proven in the literature` for supercomputer schedulers, as a kill; commit-and-end `hypothesis`. What is lost at
  the stop is the work since the last commit (Q02).
- A window's limit adds no stop: the provider stops work there; a small wrap-up of a response under way is documented
  at the 5-hour limit only (V2-008 holds in part).

### Step 4. Choose the next unit

1. Fit is a filter, not the order (kept; r57-0409 as corrected by b1-0506).
2. While any window limits (u_j > s_j and demand above its rate): the highest value per token first (V2-017
   confirmed). Reached: Yahoo's value layers (self-reported, three campaigns, no variance); no system measured value
   order and pacing on one baseline, so the split is only suggestive. `hypothesis`. Until a value per unit exists
   (Q17), all values are equal, so this is the fewest expected tokens first.
3. Where a unit needs a share of something not free now (a window, memory, the check): a reservation for the oldest
   waiting unit that does not fit; a later unit starts early only if it does not delay that reservation, the shortest
   first (V2-018 confirmed). This replaces the age cap, and only together with the stop at a unit's cap (Step 3).
   Gain: EASY++ against EASY, wait −23 % and bounded slowdown −37 % on four real logs replayed in a simulator; SDSC
   gained only 10 % (V2-019 confirmed). `proven in the literature` for those logs; `hypothesis` at 3 to 16 workers,
   where the logs had 100 to 1,152 processors.
4. Where every unit needs one worker and nothing else (V2-020 holds in part): the reservation rule then reduces to
   first come, first served, since the head unit always fits when a worker frees. That is what the rule does, not
   evidence that the order is good: shortest-first backfilling alone lowered wait 10 % (A55, A81 corrected), and
   EASY++ is close to shortest job first (A58). No claim compares the orders for our units (K7). Version 1's order is
   therefore not replaced for this case: shortest expected check first, then the oldest, with an age cap, until Q34,
   widened to compare the two orders, decides. `hypothesis` either way.
5. The model (V2-015 holds in part): for each model that can do the unit, its value minus the summed price of the
   windows it charges times the window usage it charges; the value counts the chance and the tokens of a redo when a
   cheaper model fails our check; take the largest. At zero prices this is the better model, with usage breaking ties.
   Reached: the acceptance test of the pacing theory applied to two versions of a unit; bandits with knapsacks prices
   each budget in the choice of an arm, and an arm can be a model, but no source read applies it to models.
   `hypothesis`. The routing savings read (V2-016 holds in part) are not in tokens on code: FrugalGPT's are in dollars
   at the best model's accuracy and were read through the collector's note only; AutoMix counted a fixed per-query
   unit ratio and Hybrid LLM a share of queries; RouteLLM's savings sit below the best quality (95, 92 and 87 %) and
   Hybrid LLM lost 10-14 %. Until pass rates exist (Q16), the better model runs.
6. A speculative copy of the unit expected to finish last only when the value of the time saved is at least the summed
   price times the copy's tokens, and only when it is slow from the run, not from more work. At 3 to 16 workers a 5 %
   cap is no worker (V2-023 holds in part). Figures: LATE 27 % and Dolly 34-46 % are research prototypes; MapReduce's
   44 % (how much longer a sort took without copies) and Mantri's 32 % are self-reported; the four have four
   baselines. `proven in the literature` for clusters (copies of the tail); `hypothesis` for sessions.
7. A fixed batch that must all finish: any order is within 2 − 1/m of the best (1.67 to 1.94 for 3 to 16 workers) and
   needs no lengths (V2-024 holds in part). Longest first's tighter bound, 4/3 − 1/(3m), needs exact lengths,
   independent units and no shared token window; our units share windows, so it is not used. `proven in the
   literature` (analytic); `hypothesis` that our batches are of that kind.
8. A reserved share for units that must not stall, and retries as a share of units (V2-025 confirmed). `proven in the
   literature` as practice only (self-reported, no gain measured); `hypothesis` for us.

### Step 5. Cross-check with the wait (kept)

A shortest wait above zero over a window means a standing queue at the check. Changes wait below the cap (V2-031
holds in part), so this test also covers the range below it. It needs the lane to log its slot count and its waiters,
which it does not (V2-047 confirmed). `proven in the literature` for the queue model; `hypothesis` for our lane.

### Step 6. A slow outer check (kept)

Throughput against workers after about 100 finished units. A fit of such a curve needs at least half a dozen points,
and its peak may lie outside any configuration reached (V2-106 confirmed). `proven in the literature`.

### Step 7. The check's levers (new; lane c1); their order is open

The draft ranked shortening first (V2-052 holds in part). What held: batching pays only where changes wait, and its
large published gains came with many concurrent builds. What failed: at the gate the only shortening open today is
running test files side by side, which is untested (V2-042 confirmed), because selection at the gate waits for a
dependency map and a change to `lib` selects every test file (V2-043 confirmed). And the one study with few concurrent
builds found selection best there, while its authors advise batching where machines are scarce; we have few builds
and scarce slots (c1:C26 corrected). No lane claim decides the order (K20). It is settled by Q21 (do our test files run
side by side, and how fast), Q05 (S, its spread, and p once a gate runs) and Q07 (the share of changes that touch
`lib`). The levers, in no order:
- **Shorten the run.** Test files side by side, towards the longest file, about 270 s from 596 s if the files are
  independent (V2-042 confirmed, untested); selection by changed files in the builder's pre-check; at the gate the
  full suite while no dependency map exists, then the dependency-selected targets as BMW's gate does;
  prediction-based selection kept out of the gate (V2-043 confirmed). The claim that BMW keeps the full suite at its
  gate was refuted. Gains (V2-041 holds in part): Ekstazi 32 % (54 % on long suites), up to 38 % slower on short ones;
  Facebook's selection relies on later stages that run the rest, which our gate lacks; Google's 42-55 % is a
  simulation on one month whose cut was chosen on the same data. The cap rises by S/S'. Mark: principle `proven in the
  literature`; our numbers `hypothesis`.
- **Batch what waits.** When a slot frees, take every change that waits, up to the cap p gives (best pool 11 at
  p = 1 %, 4 at 10 %, 3 at 30 %, where it saves 1 %: V2-036 confirmed), and run once (V2-035 confirmed). No timer
  (V2-038 confirmed). Split a failed batch in the fewest rounds the free slots allow: one by one where that fits them,
  else by halving (V2-037 confirmed). One run per batch holds only while the gate runs the full suite (V2-040
  confirmed). Figures: V2-039 confirmed. Mark: mechanism `proven in the literature`; fit to model sessions
  `hypothesis`. The tree's checker, which batches "12, a guess", takes the same rule (V2-050 confirmed).
- **Test ahead on the success path.** The gate tests each change on top of those ahead of it; a free slot starts the
  next one on top of an unfinished one; the window halves on each failure. A run whose base passes is the real check,
  which is how a serial gate uses its second slot. Checking two merges on one base instead accepts failures caused by
  the two together (V2-044 confirmed). Uber's 2.98 times an oracle is a self-reported maximum under contention in a
  replay of one iOS monorepo (V2-045 holds in part). `hypothesis`.
- **Let a waiting worker go on.** It starts its next unit while its change waits; it needs a second unit ready, a way
  back for a failed change and a cap on changes in flight per worker. Gain: clock time, not tokens. Cost: a late
  failure invalidates the stacked work, and each redo costs tokens (V2-046 holds in part; Q02). `hypothesis`.
- **Make the queue visible.** Log the slot count and the number waiting; order waiters as Step 4 does; set the
  timeout and the hold-break age above the longest check, since today a 25-minute timeout kills an hour-long check
  and from 20 minutes a waiter may start beside a live holder (V2-047 confirmed). A precondition of the others, with
  no gain alone. `hypothesis`.
- **The worker cap** is Step 1's formula; start fewer workers where waits must stay short.

### Step 8. Several writers (replaces version 1's section; lane w1)

Every engine figure read is for units of seconds or less, except one 1977 simulation of long units (V2-084
confirmed), so every "survives for sessions" below is a hypothesis about direction, never about size.

**The floor.** Own copies taken at one point, never two sessions in one working copy without claims (V2-058 holds in
part: own worktrees led instruction-only separation by 3 points in CAID, 59.1 against 56.1 on Commit0-Lite, within
what a rerun could move, and scored below one agent in STORM's rerun). Every landing passes the check, in one order,
with undo of a change that breaks (V2-074 confirmed). No check runs in a copy that holds more than the units it
judges, or a pass can belong to someone else's half-done edit (V2-075 holds in part: this rests on the w1 refuter's
reasoning about dirty reads by the judge, which no claim carries; `reasoned`). `proven in the literature` for engines
and for one large mainline (self-reported); `hypothesis` for sessions.

**Before work.** A fixed order of writes needs every unit's read and write sets in advance; without them work runs
almost serially or reruns (V2-059 confirmed). So only what a plan declares is ordered before work: its claims are
taken in one fixed order and cannot deadlock. Places found while working are claimed in resource order (a new claim
only above all held ones, else release and retake), by wait-die, or validated at landing; each option that aborts
costs a redo in tokens (V2-060 confirmed). A plan ordered by dependencies survives in direction (V2-061 confirmed).
`proven in the literature` for engines; `hypothesis` for sessions.

**The law in ratios.** Two units each touching k of F regions overlap with chance 1 − C(F−k, k)/C(F, k), about k²/F
when small; a unit meets at least one of N − 1 others with chance 1 − (1 − p)^(N−1), up to 15 times larger at 16
writers than at 2. It counts textual overlap only, so p is measured per region from history, never computed from F
(V2-068 confirmed). `hypothesis`.

**The parts, ranked by expected gain.**
1. **Reshape shared places** so writes commute or land at integration: one entry per unit for each registry or list,
   applied at landing; a number that must be "the next free one" chosen at landing by one allocator; an ordered
   sequence as one step per unit; a writer-chosen unique name checked for duplicates at landing (V2-062 holds in part;
   V2-063 confirmed). Our 14 units share 20 places: 9 separate entries, 7 ordered sequences, 4 places where the same
   statements change, counted from the plan's change list, not from diffs (V2-064 holds in part: a count of a plan,
   not a measurement). Removing a hot place removes that place's own term; a unit's chance of meeting another over
   the remaining regions still grows with N, and no gain is stated for taking Silo's counter out (V2-062 holds in
   part). Mechanism `proven in the literature` for updates that commute; `hypothesis` for our edits. The refuted bound
   "every method lands about one unit per unit time on a hot place" is the case for this part (V2-071 confirmed).
2. **Version-checked writes.** A write names the version of each region it read and lands only if what the unit read
   is unchanged (V2-054 confirmed). A refused write gets the current text, a diff and a short reservation on the file
   (V2-056 holds in part). One write is redone only when the refusal concerns that file alone: STORM also refuses a
   write when anything the unit read has changed, and then the steps built on that read are redone too (w1:W94
   corrected; K15). That the reservation stops two writers refusing each other in a loop is the w1 refuter's reading
   of the mechanism, not a result. The one measurement of an engine remedy on model sessions: 82.5 % against 63.8 % for
   own worktrees and 66.4 % for one agent, at most 4 writers (3.6 on average), no repeated runs or variance reported,
   gains concentrated on large repositories (V2-055 holds in part). Limits: writes through the shell bypass it, file
   grain refuses edits to different functions, and refusals grow with writers (V2-057 confirmed). `proven in the
   literature` at file grain, at most 4 writers, one preprint; region grain `hypothesis`.
3. **Claims below the file** at the grain a unit touches: an intention mark on the file, an insert claims only its
   gap, a delete also claims its neighbour (V2-065 confirmed). The grain is measured, not taken from a paper (V2-066
   holds in part): in a 1977 simulation the best grain rose as units touched fewer entities, but in another study
   coarse locks held to the end of 10-step units deadlocked, and the simulation's own number (about 10 granules) does
   not carry (V2-106 confirmed; K13, K16). Promotion to a file claim by share cannot be checked, and one wrong
   escalation stops every other writer; it waits for the replay (V2-067 confirmed). `proven in the literature` for
   engines; `hypothesis` for sessions.
4. **Wait for a known hot pair.** Version 1's product stays, per pair: wait when the chance of a conflict times the
   tokens of a redo exceeds the cost of the wait, in what is scarce now. It has no published direction (V2-070
   confirmed). Where writes are version-checked, the redo is the re-applied write when the refusal concerns that file
   alone, and the steps built on a read when a read changed; which case dominates is Q02 (V2-072 holds in part; K15).
   `hypothesis`.
5. **Checkpoints.** A unit commits in its own copy at checkpoints; a refusal returns it to the last one. That bounds
   the loss only for aborts not caused by a read made before the checkpoint, and the context must be rebuilt at a token
   cost; one survey found no performance metrics for these designs and one empirical study (V2-073 holds in part).
   `hypothesis`.
6. **Every landing through the serial check**, as in the floor (V2-074 confirmed). The check may cap landings before
   conflicts do (Step 1, V2-051 confirmed).
7. **Structured merge last**: line merge first, tree merge only where it conflicts, delete-versus-edit always flagged
   (V2-078 holds in part). Semistructured merge reported about 24 % fewer conflicts and no fewer wrong clean merges;
   s3m, a structured tool, halved reported conflicts with at least 8 % fewer wrong clean merges. `proven in the
   literature` for human merges; `hypothesis` for session edits.

**Dropped.** Operation transforms among peers with no central server (V2-076 confirmed). One owner per file as the
default (V2-069 holds in part; V2-067 confirmed): one wrong escalation stops every writer of the file. Silo's owned
store won 1.54 times with no crossing and fell below optimistic control at about 20 % crossing, so the crossover lies
between the two and is not located; "an owner only where none cross" was a choice, not the finding. Silo's owner is a
partitioned store, where version 1's owner is one writer at a time (K9). Where an owner pays is open: Q07 (the share
of units crossing owners) and Q08 with one writer at a time on the hot places as an arm. Agent conflict rates read:
19.8 % of same-agent and 41.7 % of cross-agent co-active pairs, a lower bound (V2-079 confirmed).

**Not dropped: a CRDT of a whole file** (V2-077 refuted; replaced). The draft dropped it on the grounds "13.1 % slower
on average, 82-189 % more code, semantic figures that do not reconcile". The refuter showed those grounds do not
support a drop: in the one preprint (CodeCRDT: one author, Claude Sonnet 4.5, up to 5 agents, 6 tasks, 13.8 % of times
removed as outliers) the parallel mode was 13.1 % slower overall (from 21.1 % faster to 39.4 % slower) while it wrote
82-189 % more code, and faster per 1,000 characters in 5 of 6 tasks (11-52 %); its semantic-conflict figures do not
reconcile (w1:W61 corrected). One preprint cannot rule a family of methods out. The point is open; Q36 would settle
it. Until then the rule uses own copies and neither uses nor rules out a whole-file CRDT.

**What the harness can enforce today.** Nothing per file for harness builds: the tier hook sees only starts, and the
Edit tool and shell writes were never tested (V2-080 confirmed). In the tree, writers already have own copies and the
task table is written by compare-and-set (V2-081 confirmed). Hooks would see reads by the read and search tools, shell
reads only as command text (V2-082 confirmed). A redo's tokens can be counted from transcripts without a run where the
redo ran as its own helper with a kept transcript; a redo inside a session cannot be told apart (V2-083 holds in
part).

### Step 9. The tree (new; lane t1)

Two measurable features choose the kind: L against b, and R against 1/f. The draft named a third, new keys during a
run; it has no case today: keys are frozen during a run (R46), so a leaf overflows only from estimate error (t1:C84,
C109 and C110 corrected; V2-140 holds in part; K19).
- **Small job known up front** (L ≤ b, R rarely above 1/f): the bulk-loaded two-level tree; nothing splits, merges or
  latches while work runs; "height, search, latches and merges add nothing" holds here (V2-090 holds in part). The
  schemes are alike when one resource binds, except under extreme contention: with one CPU, one disk and heavy
  appends, a pessimistic algorithm beat the B-link and optimistic ones (t1:C34 corrected; K18).
- **f** = 1/q_{1−p}(R), with R taken over the leaf, since a field's keys share context; one f per capacity (V2-091
  holds in part). The engine figures are occupancies, not gains: B+ 1/2 and B* 2/3 are guaranteed minima, not expected
  fill (about 69 % expected, ln 2), and InnoDB's 15/16 is the vendor's own manual (self-reported), as is Facebook's.
- **A leaf that outgrows its window** (R above 1/f at the leaf). Split or hand over is open (V2-098 confirmed; V2-092
  holds in part; K17). The tree design's rule at the window is a hand-over to a successor of the same leaf (R50); its
  D3-12 rules out splitting a field mid-research; a split comes only under R49's ratio, later. The B-link reading
  gives a split's mechanism, not that choice (t1:C90 and C114 refuted). If a split is chosen: move the unstarted keys
  in the B-link form, new leaf first, the overflow record as its link, the index posted after by one script step under
  the run lock; a separator only where the unstarted keys form one range, else a list of ids (V2-092 holds in part).
  Among 3 to 16 sessions B-link's own gain is a wash; it fits because its first step is local and the parent's post
  may wait (t1:C35 corrected). A small remainder goes to an unstarted sibling with room or to the next wave, and no
  leaf is merged (V2-093 confirmed). Keys are moved into a running session only if the message and the wake are
  priced (V2-094 confirmed). Start tokens per useful token are (P + S0)/(occupancy × A_leaf); P and S0 are guesses
  today (V2-100 confirmed). Q30 settles the choice: per leaf that outgrows its window, the tokens a hand-over reloads
  against a new leaf's start cost P + S0.
- **Very large project** (L > b): more coordinator epochs or an inner level, whichever costs fewer tokens; depth
  ⌈log_b L⌉ where levels win; width before depth (V2-095 confirmed). An inner level where its summary is much smaller
  than its inputs and its children run at once (V2-096 holds in part). That test weighs tokens and time only: a level
  that checks its children's reports may pay in errors, untested. RAO's figures cover tasks both methods solved, and
  its saving is in cache reads, so in token count more than in cost. Each inner node keeps one bounded summary per
  child; "merge once at the top" was refuted (V2-097 confirmed).
- **Fewer parent wakes**, the largest expected gain: a wake waits while nothing in the backlog is urgent; the backlog
  is counted in tokens; batching divides only the fixed re-read of a wake and only where the wake can wait (V2-087
  confirmed). Today the coordinator already reads every event since its last acknowledged one at each wake, so the
  content is batched and the wake is not (V2-088 confirmed). Database figures: V2-089 confirmed.
- **Run-state files.** `tree-plan.json` and the task table are written by a script step, not by a session: the ground
  is cost, since a session would spend minutes and a window re-read on seconds of file work (V2-099 holds in part).
  Whether that step takes the run lock for every write, replacing today's compare-and-set on the table's revision
  (w1:W87; t1:C16), or wraps only the split's posting, is open (K10); Q31 shows whether one locked step would queue.
- Still open: the split-or-hand-over choice (V2-098 confirmed). The 13 fixes come first in every case, since ten edit
  `lib.mjs` (V2-101 confirmed). Hot leaves only when observed (V2-102 confirmed).
Marks: database results `proven in the literature`; every transfer to sessions `hypothesis` (the t1 report marks each
"H on P").

### Contradictions

K1 to K8 were settled in the draft; the fold narrowed five of them. K9 to K20 are the ones the refuter found hidden in
the draft's statements or stated both ways (`R:v2-refute.md`, "Contradictions"). A position is taken only where a lane
claim, or for K11 the owner's ruling, decides it; otherwise the row names the measurement.

| K | Point | Version 1, or one lane, says | The other lane says | Position | Decided by |
|---|---|---|---|---|---|
| K1 | When a token window starts to limit | Version 1 (r57-0408): only when it is nearly spent | a1: from u > s | From u > s the window caps starts at the re-planned rate; the cap limits anything only while demand exceeds that rate (V2-004 holds in part) | a1:A82, an inference, as its refuter reads it |
| K2 | How several windows combine | The lane frame: the dearer price binds; version 1: one token row | a1: fit in all, prices summed | Admission: fit in every window (V2-010 holds in part). Price: the sum (V2-011 holds in part). Under the price form both prices are kept; the dearer price alone is exact only for a stateless price | a1:A71, on A21, A25, A29, A30; A72 corrected |
| K3 | Whether the order of writes can be fixed before work | Version 1 lines 124-127: place by place, from the change list, before work | w1: a fixed order needs every unit's sets first, and sessions learn them while working | Only the declared part, in one fixed claim order; places found later by resource order, wait-die or validation at landing (V2-059 confirmed; V2-060 confirmed) | w1:W37, with W36; W93 for the found places |
| K4 | The worker cap of a check with several slots | Version 1: case B, "a textbook bound, reasoned". w1: the check binds when T < 10N minutes | c1: c(S + Z)/S, computed for c and derived from two bounds for any distribution | One formula: the check binds when N·S/c reaches the worker's cycle, S + Z if it waits, Z if it goes on; w1's form is the second with one slot (V2-030 confirmed; V2-051 confirmed). Which lever first: K20 | c1:C07 |
| K5 | Which kind of tree for which size of job | Version 1: no tree. The tree design: "three levels, never more" | t1: cases by L/b and R against 1/f | Small: two levels, bulk-loaded (V2-090 holds in part). A leaf that outgrows its window: K17. Very large: more epochs or an inner level, priced in tokens (V2-095 confirmed). "Three levels" holds for the small case and while epochs win | t1:C82 corrected, with C84, C86, C109 |
| K6 | When running work may be stopped | Version 1 Step 3: at the memory floor only | t1: the budget cut stops running work; a1: a reservation needs an enforced cap | A second stop: a unit at its own cap is stopped; this draft's form, commit and end, is t1's refuter's option and untested; EASY kills. A window's limit adds no stop (V2-003 holds in part; V2-008 holds in part) | a1:A61; t1:C92 corrected |
| K7 | What starts next, and on which model | Version 1 Step 4 and c1: shortest check first, oldest, an age cap; the cheaper model only where its gap was measured small | a1: a reservation for the oldest, backfill behind it, first come, first served when a unit needs only a worker; value per token while a window limits; the model by summed price | Reservation and backfill where a unit needs a share of something not free (V2-018 confirmed); value per token while a window limits (V2-017 confirmed); the model by value minus summed price × usage, the better model until Q16 (V2-015 holds in part). Where every unit needs only a worker: not settled, since no claim compares the orders for our units and A55 and A58 favour shortest first for wait; version 1's order stays until Q34 compares them (V2-020 holds in part) | a1:A62, A55; a1:A74. Open part: Q34 |
| K8 | Wait or redo on a shared file | Version 1 lines 131-135: one owner where a conflict is likely when tokens or the check are scarce (r57-0301) | w1: no published direction; version-checked writes beat one agent | The product is computed per pair, with no direction given (V2-070 confirmed); the size of a redo under version checks: K15. Owners: K9; run-state files: K10 | w1:W31 and W62 |
| K9 | One owner | Version 1: one owner at a time wherever a conflict is likely, and for the 7 sequences and 4 same-statement places (lines 37-39, 125-127) | w1: an owned store won with no crossing and lost from about 20 % crossing (W26); one wrong escalation stops every writer (W20) | No file gets one owner by default (W20 decides that much). Where an owner pays is not settled: the crossover lies between no crossing and about 20 %, and Silo's owner is a partitioned store, not version 1's one writer at a time. Reshaping takes over the sequences where it applies (V2-062 holds in part; V2-069 holds in part) | w1:W20 for the default. Open part: Q07 and Q08 with one writer at a time as an arm |
| K10 | Who writes the task table | t1: one writer, a script step under the run lock (C92, C36 corrected) | w1 and t1: written today by compare-and-set on its revision (W87; C16) | A script step, not a session (V2-099 holds in part). Run lock or compare-and-set: not settled | t1:C36 corrected for the script step. Open part: Q31 |
| K11 | What a part is chosen against | t1: measured tokens, with memory as the hard limit (C115 corrected) | Version 1: quality first, then the least time, memory and tokens | Memory stays the hard limit; each part is chosen against the ruled objective (V2-103 holds in part). Whether tokens bind ahead of memory: not settled | The owner's ruling r57-0003, not a lane claim. Open part: Q09, Q10 with Q19 |
| K12 | Units of minutes with 3 to 16 workers | V2-104 holds in part; as first written: none found, engine units are seconds | w1: Ries 1977 simulated units of minutes, about 10 sharing one I/O path (W95 corrected); c1: a project with few concurrent builds (C26 corrected) | No real system found; one simulation and one project are near cases (V2-104 holds in part; V2-084 confirmed) | w1:W95 corrected; c1:C26 corrected |
| K13 | Whether numbers carry | Version 1 and V2-106 confirmed: only the shape carries | V2-066 holds in part; as first written: "about 10 coarse granules enough for long units" (w1:W16, W95) | Only the shape carries; the 10-granule number leaves the rule (V2-106 confirmed; V2-066 holds in part). Ries also found that keeping locks in memory made little difference to the best grain, which weakens version 1's stated reason (our lock cost differs), not the rule | c1:C14, a1:A03, A78 corrected (V2-106 confirmed) |
| K14 | A window's price under its line (inside a1) | a1:A69, A70, A72 as first written: zero while u ≤ s | Their refuter: under the price form it stays positive after a lull and a burst of lumpy units raises it | The corrections stand (V2-007 holds in part; V2-011 holds in part; V2-107 holds in part) | a1:A69, A70, A72 corrected |
| K15 | The size of a redo under version-checked writes (inside w1) | W62's refuter: one write | W94 corrected: a conflict on an earlier read invalidates the steps built on it | Both, by case: one write when the refusal concerns that file alone; the steps built on the read when a read changed. Which case dominates: not settled (V2-056 holds in part; V2-072 holds in part; V2-073 holds in part) | Open: Q02 (for each past conflict, whether the item was read before the last checkpoint) |
| K16 | The grain for long units (inside w1) | W16, W95 corrected: a few coarse granules best | W18: coarse locks held to the end of 10-step units deadlocked | Not settled (V2-066 holds in part) | Open: Q07 (k and F), Q08 swept over the grain |
| K17 | Split or hand-over (inside t1) | C86, C92: split the unstarted range | C90 and C114, refuted: the choice stays open; the design hands over (R50) and D3-12 forbids a mid-research split | Not settled; a split, if chosen, takes the B-link form (V2-092 holds in part; V2-098 confirmed) | Open: Q30 (a hand-over's reload against a split's start cost) |
| K18 | When the schemes are alike (inside t1) | C89 corrected: when one resource binds | C34 corrected: not under extreme contention | C34's exception stands (V2-090 holds in part) | t1:C34 corrected |
| K19 | New keys during a run (inside t1) | Q30 as first written: count new keys per leaf | C109 and C110 corrected: keys are frozen during a run (R46) | None arrive; a leaf overflows only from estimate error (V2-140 holds in part) | t1:C109, C110 corrected |
| K20 | Which check lever first (inside c1) | V2-052 holds in part; as first written: shortening first | C57 and V2-043 confirmed: the full suite at the gate until a dependency map exists, and a `lib` change selects every file; C26 corrected: selection where builds are few, batching where machines are scarce | Not settled (V2-052 holds in part) | Open: Q21, Q05, Q07 |

Corrected without a contradiction in the rule's behaviour: version 1's "three parts have no paper" (row 37, V2-105
holds in part).

## 4. From a small project to a very large one

Every input is a ratio or a share, so the rule has no size threshold of its own; what changes with size is which term
binds. Each project measures its inputs from its own files while it runs (last column).

| Input | Small project | Very large project | Measured while it runs from |
|---|---|---|---|
| N·S/c against the cycle (S + Z, or Z) | A check of seconds: Z/S in the tens, the cap far above N; no check lever pays, and selection made short suites slower (V2-053 confirmed) | A check of an hour: the cap binds with 1 or 2 slots; batching is the main lever; a lost speculative run costs an hour (V2-053 confirmed) | The lane log and the transcripts (Q05, Q06) |
| p, the share failing the check | A batch of one, which costs nothing (V2-035 confirmed) | The batch cap from p (V2-036 confirmed) | A gate's results, once a gate runs (Q05) |
| u_j against s_j; k | Demand under the windows: prices zero while demand fits the re-planned rate at every step, though a burst of lumpy units raises a price under the line; the better model; only the reserve acts (V2-107 holds in part) | Windows bind every week: the re-planned rate, value per token and the model by price act on every unit (V2-107 holds in part) | The meter and the transcripts (Q01, Q09, Q10) |
| Units waiting on a shared resource | Few, or one-worker units only: the reservation reduces to first come, first served; version 1's shortest expected first stays until Q34 (V2-020 holds in part) | Many: the reservation and backfill (V2-018 confirmed) | The unit records (Q01) |
| (N − 1)k²/F for a file | F near k: the whole file is the hot place; reshape it or wait (V2-085 confirmed) | F far above (N − 1)k²: claims below the file let all N go on, where a file claim stops all (V2-085 confirmed); the chance grows up to 15 times from 2 to 16 writers (V2-068 confirmed) | The history of changes (Q07) |
| The share of units crossing owners | | No owner by default; where an owner pays lies between no crossing and about 20 % and is not located (V2-069 holds in part) | Change lists (Q07); the replay (Q08) |
| L against b; R against 1/f | L ≤ b: two levels (V2-090 holds in part); no new keys arrive during a run | L > b: epochs or a level, depth ⌈log_b L⌉ (V2-095 confirmed) | The packer, the pilot's log, the transcripts (Q03, Q29, Q30) |
| Children per parent | Few wakes, small gain (V2-087 confirmed) | The largest gain is fewer wakes (V2-087 confirmed) | The transcripts (Q03) |
| Workers, for a speculative copy | A 10 % cap gives a copy only from 10 workers (V2-023 holds in part) | Rare: a copy pays a whole unit at a high price | Reruns (Q18) |

## 5. Measurements

One merged list; the numbers Q01 to Q36 are this draft's, not the lanes' M1 to M11. Kind: **count** over logs,
transcripts or history that already exist (no run); **readings** of the usage meter over ordinary work, which need the
usage reader (B8) but no experiment; **run** on this PC, which needs the owner's word (rule 3 of this repository);
**sim**, better done as a simulation swept over project sizes. Q19 and Q28 come from version 1 alone and Q36 from the
fold; they carry no `V2-` number. Rows marked "widened" or "narrowed" were changed in the fold.

| Q | Measurement | Sets | Kind | Until it exists the rule | Named by |
|---|---|---|---|---|---|
| Q01 | Tokens, minutes and start tokens per unit, by class and model, from transcripts; window usage per unit only once Q10 gives the weights; reruns flagged; a redo counted only where it ran as its own helper; the error of the last-two prediction and the share that ran short (V2-113 holds in part; narrowed) | Expected usage and the reserve (V2-008 holds in part), the length prediction (V2-021 confirmed), units per window, the largest unit's share, landings asked per hour (V2-051 confirmed), the start cost (V2-100 confirmed), the rerun share (V2-025 confirmed), the spend rate that turns a token cap into a time (V2-003 holds in part) | count, over transcripts; window usage with Q10's readings | Admits on each unit's cap; first come, first served; the reserve is the caps of the running units | Version 1 no. 6 (first part); a1 M1, M7, M10; w1 M9 |
| Q02 | Tokens of a redo: a whole unit, a re-applied refused write, the steps since a checkpoint; for each past conflict, whether the item was read before the last checkpoint (V2-114 confirmed) | The redo term of the wait-or-redo product (V2-070 confirmed; V2-072 holds in part), of the model choice (V2-015 holds in part), of a batch failure (V2-039 confirmed); which case of K15 dominates | count, over transcripts and history | Gives wait-or-redo no direction: own copies, version checks where they can be enforced | w1 M2; a1 M8 (redo part); c1 rank 2 |
| Q03 | A parent's tokens per wake, split into the fixed re-read and what each child adds (s_summary); the parent's own growth per epoch; how many wakes could have waited under a stated delay rule, since that part is a judgment, not a count (V2-115 holds in part; narrowed) | b and the depth (V2-095 confirmed), the wake trigger (V2-087 confirmed) | count, over other coordinators' transcripts (the tree never ran); for the tree, a run | Every note wakes the parent; three levels | t1 ranks 1 and 4 |
| Q04 | An inner node's compression (tokens out over tokens read); the share of children running at once; how often a parent reads against how often children report (V2-116 holds in part; narrowed) | Whether a level pays (V2-096 holds in part); the merge policy (V2-097 confirmed) | count, over other multi-level sessions if any; else a run (no inner level has run) | No inner level | t1 ranks 4 and 5 |
| Q05 | S and its spread per label, from the lane log; p, the share of gate runs that fail, and the flaky share, failures that do not repeat on the same tree, only once a gate runs: the lane log holds wait and run time, not pass or fail, and no gate exists yet (V2-117 holds in part; narrowed) | The cap and the waits (V2-030 confirmed; V2-031 holds in part; V2-032 holds in part), the batch cap (V2-036 confirmed), the test-ahead window (V2-044 confirmed); with Q21 and Q07, the order of the check's levers (K20) | count (S and its spread); p and the flaky share from a gate's results once they exist | Case B with S = 596 s from one run and c = 2; no batching, no testing ahead | c1 ranks 1-3 and 6; version 1 Step 1 |
| Q06 | Z, a unit's time outside the check, per piece and per change; the share of its cycle spent waiting at the check (V2-118 confirmed) | The cap (V2-030 confirmed), whether letting a worker go on pays (V2-046 holds in part; V2-051 confirmed) | count, over transcripts joined to the lane log, for units whose checks used the lane | Today's worker count | Version 1 no. 2; c1 rank 4 |
| Q07 | Per file: k per unit, F, units per region, each unit's share of diff on hot places and when it was written; the share of units crossing two owners; the share of changes that touch `lib` and so select every test file (V2-119 confirmed) | The overlap chance and the grain (V2-068 confirmed; V2-066 holds in part), what to reshape (V2-062 holds in part), where an owner pays (V2-069 holds in part; K9), the gate's selection (V2-043 confirmed) and the levers' order (K20) | count, over history and change lists | File grain, own copies, the full suite at the gate | w1 M1, M6; c1 rank 1 |
| Q08 | A replay of recorded units against escalation shares, resource-ordered claims, wait-die, the grain, and one writer at a time on the hot places: waits, conflicts, aborts (V2-120 confirmed; widened) | Escalation (V2-067 confirmed); the claim protocol for found places (V2-060 confirmed); the grain (K16); where an owner pays (K9) | sim: a replay over history, swept over N and file size | No escalation; claims in plan order; found places validated at landing | w1 M8; the fold (K9, K16) |
| Q09 | 5-hour periods opened per week and units per window, from Claude Code transcript times; periods opened from claude.ai or Desktop are not in those files and are missed; what opens a period is Q13 (V2-121 holds in part; narrowed) | Which window binds over a week (V2-012 holds in part) | count, over transcript times (a period opens at the first message) | Reads u and s directly; the week test is not used | a1 M6 (part) |
| Q10 | Each window's size and each model's and effort level's weight, from the change of each meter against counted tokens, over stretches with no use from other clients, which move the same meter; this gives k and shows whether the windows count usage alike (V2-122 holds in part; narrowed) | Usage per unit in each window (V2-010 holds in part), price levels (V2-007 holds in part), the week test (V2-012 holds in part) | readings, with Q01 | u read from the app in whole percent; admission by u against s only | a1 M2; version 1 no. 6 |
| Q11 | Whether a unit on the one-model week also moves the all-models week (V2-123 confirmed) | Which windows a unit draws on (V2-010 holds in part) | readings | Charges such a unit to both | a1 M3 |
| Q12 | How cached input counts in Claude Code windows (V2-124 confirmed) | Usage per unit for re-reads (V2-086 confirmed) | readings | Takes usage from the meter's change, not from token counts | a1 M4; version 1 no. 6 |
| Q13 | Whether an unspent part is lost at a reset; what opens the next 5-hour period; this account's weekly reset time, read in Settings (V2-125 confirmed) | Whether a margin is ever needed (V2-009 confirmed) | readings; the reset time is one look, no run | No early finish; re-planning, which spends a lull's saving anyway | a1 M5 |
| Q14 | The error of forecasting the rest of a window (V2-126 confirmed) | The margin, if Q13 says unspent is lost (V2-009 confirmed) | readings over windows | No margin beyond the reserve | a1 M6 (part) |
| Q15 | Usage of units in flight; the lag of the meter behind tokens spent (V2-127 confirmed) | The reserve and its latency margin (V2-008 holds in part) | readings | The reserve is the caps of the running units | a1 M11 |
| Q16 | Pass rate, window usage and redo per unit, by kind of work and model (V2-128 confirmed) | The model choice (V2-015 holds in part) | count where both models did one kind and the check's result is kept; a run for kinds the cheaper model never did | The better model | a1 M8; version 1 Step 4 |
| Q17 | A value or a ranking per unit (V2-129 confirmed) | Value per token (V2-017 confirmed); the model's value (V2-015 holds in part) | Not said by any lane (section 7) | Equal values: fewest expected tokens first while a window limits | a1 M9 |
| Q18 | The spread of length and tokens across reruns of one unit; whether a slow unit is slow from the run or has more work (V2-130 confirmed) | Speculative copies (V2-023 holds in part); the spread of predictions (V2-021 confirmed) | count where reruns exist; else a run | No speculative copies | a1 M10 (part) |
| Q19 | Per class: peak private memory and busy threads over time | Memory and processor widths; the child-session count (BUILD-IN correction 4); with Q09 and Q10, whether tokens bind ahead of memory (K11) | run (the recorder) | Today's numbers | Version 1 no. 1 |
| Q20 | Does one suite run slow when a second runs beside it (V2-131 confirmed) | Whether c slots run at full speed (V2-031 holds in part) | run | Assumes full speed, as case B does | Version 1 no. 3; c1 (C66) |
| Q21 | The suite with its test files side by side; whether the files are independent (V2-132 confirmed) | S' and the cap's rise (V2-042 confirmed); with Q05 and Q07, the levers' order (K20) | run | One file at a time | Version 1 no. 4; c1 rank 1 |
| Q22 | Suite time on a merge of 1, 2 and 4 changes; the share of batch failures whose changes each pass alone (V2-133 confirmed) | Cost of a batch run (V2-040 confirmed); independence of failures (V2-044 confirmed) | run | No batching | c1 rank 2 |
| Q23 | Conflicts of session edits on our own neighbouring lines; the share that are reorders or renames (V2-134 confirmed) | p per region for session edits (V2-068 confirmed); the worth of structured merge (V2-078 holds in part) | run | Version checks and own copies, no structured merge | Version 1 no. 5; w1 M4 |
| Q24 | The share of clean merges of two session units that fail the check (V2-135 confirmed) | The semantic-conflict rate (V2-074 confirmed) | run | Every merge passes the check | w1 M5 |
| Q25 | Clock time a unit waits for an owner (V2-136 confirmed) | The wait side of the product (V2-070 confirmed) | run | No waiting by default | w1 M3 |
| Q26 | Whether a PreToolUse refusal stops the Edit tool; whether a hook can check a version; what a hook sees of reads by the read, search and shell tools (V2-137 confirmed) | Whether parts 2 and 3 of Step 8 can be enforced (V2-080 confirmed; V2-082 confirmed) | run (one probe) | Own copies; no per-file enforcement | w1 M7 |
| Q27 | The lane's wait with one slot against two (V2-138 confirmed) | The effect of c on the wait (V2-047 confirmed) | run | Two slots | Version 1 no. 7; c1 rank 5 |
| Q28 | A memory-bandwidth counter, only if Q19 and Q20 show slowdowns they do not explain | The bandwidth width | run | Not read | Version 1 no. 8 |
| Q29 | R per leaf, from the pilot's predicted-against-realised log (V2-139 confirmed) | f (V2-091 holds in part) | run (the pilot) | `fill_factor` as today, read by no script | t1 rank 2 |
| Q30 | Per leaf that outgrows its window: unstarted tokens at overflow, the tokens a hand-over reloads, and a new leaf's start cost P + S0; whether keys are worked in key order; a session's start cost on a tree run. No new keys arrive during a run (R46), so none are counted (V2-140 holds in part; narrowed and widened) | Split or hand-over (K17; V2-092 holds in part; V2-098 confirmed), separator or list (V2-092 holds in part), the remainder rule (V2-093 confirmed), the start cost (V2-100 confirmed) | run (the pilot); the start cost partly a count (Q01) | No split: the design's hand-over at the window (R50), a remainder deferred to the next wave | t1 rank 3; the fold (K17) |
| Q31 | Splits per hour and seconds per posting (V2-141 confirmed) | Whether one script step queues (V2-099 holds in part), and so run lock or compare-and-set (K10) | count, over the tree's ledger once splits exist | One script step; the task table by compare-and-set as today | t1 section 1 |
| Q32 | Repeated or overlapping questions per leaf; restarts per hour (V2-142 confirmed) | Hot-leaf handling (V2-102 confirmed) | count, over ledgers once runs exist | Nothing | t1 rank 7 |
| Q33 | Pacing at tens of units per window: re-planning against the price form, with the reserve, swept over units per window, a unit's share of a window, and k (V2-143 confirmed) | Confirms re-planning at our scale (V2-005 holds in part; V2-006 holds in part; V2-027 holds in part) | sim, from Q01 and Q10 | Re-planning | a1 table rows 1 and 9 |
| Q34 | Backfilling at 3 to 16 workers with our length spread: Q01's units replayed, swept over workers; for units that need only a worker, first come, first served against shortest expected first (V2-144 confirmed; widened) | Whether the reservation gains at our scale (V2-018 confirmed; V2-019 confirmed); the order for one-worker units (V2-020 holds in part; K7) | sim | Reservation and backfill where a unit needs a share; version 1's order where it needs only a worker | a1 (A79); the fold (K7) |
| Q35 | The finite-source model swept over c, N and Z/S with Q05's and Q06's spread (V2-145 confirmed) | Waits below the cap at our sizes (V2-031 holds in part; V2-032 holds in part) | sim | Step 5's wait test | c1 (C08, C11, C66) |
| Q36 | A CRDT of a whole file against own copies with version-checked writes, 2 to 5 sessions on one file: accepted changes per hour, time per 1,000 characters of accepted code, check passes, semantic conflicts the check finds, tokens; repeated runs per arm | Whether a whole-file CRDT has a place in Step 8 (V2-077 refuted) | run | Own copies; a whole-file CRDT neither used nor ruled out | The v2 refuter, from w1:W61 corrected (new in the fold) |

Counts by kind, of the 33 the lanes name: 6 counts over files on disk that need no run (Q01, Q02, Q05, Q06, Q07, Q09),
each with the gap its row states; 2 counts only over other repositories' sessions until the tree runs (Q03, Q04); 2
counts where the data exist, else runs (Q16, Q18); 2 counts once tree runs exist (Q31, Q32); 6 readings (Q10-Q15); 10
runs (Q20-Q27, and the pilot, Q29, Q30); 4 simulations (Q08, Q33-Q35); 1 that no lane says how to measure (Q17).
Version 1 adds 2 runs (Q19, Q28); the fold adds 1 run (Q36). Before the fold the draft counted 8 counts over files on
disk; Q03 and Q04 left that group because the tree never ran.

**The three that set the most numbers.** Q01, the count of tokens, minutes and starts per unit from transcripts on
disk: it sets the length predictions, landings per hour, the start cost and the spend rate, and with Q10 the window
usage that sets admission and the reserve. Q05, the count of S and its spread from the lane log: it sets the check's
cap and its waits; the batch cap and the test-ahead window also need p, which waits for a gate's results. Q10, meter
readings against Q01's counts over stretches with no other client's use: every window's size, the model weights and
k, so every price. Q01's token part and Q05's S need no run.

## 6. Build order: what changes in `B:BUILD-IN.md` section 4

By piece number. No piece is built here.

| Piece | Change |
|---|---|
| B1 | Kept first. Adds the round-3 proposed corrections to what the top session adjudicates (c1-0500 to c1-0515, w1-0509 to w1-0512, a1-0511 to a1-0518, t1's four candidates) and this draft with its verdicts |
| B2 | Widened. `width.mjs` also holds, per window, u_j against s_j, the re-planned rate and the summed price (V2-005 holds in part; V2-011 holds in part); the check's cap for a waiting and a going-on worker and with S·C(k, p) (V2-030 confirmed; V2-035 confirmed; V2-051 confirmed); the parent's window term (V2-002 confirmed). Still no caller; every new term inert while its inputs are null |
| B3 | Widened. `lane-stats.mjs` also gives S's spread per label; p from exit codes and the flaky share only once a gate's runs are labelled and kept (Q05) |
| B4 | Moved first among the counts and widened: `unit-costs.mjs` gives Q01's token part and, from other coordinators' sessions, Q03 and Q04; with B3, Q06. It sets the most numbers and needs no run |
| B5 | Widened. The lane also logs its slot count and number waiting, and its timeout and hold-break age go above the longest check (V2-047 confirmed) |
| B6, B7 | Unchanged |
| B8 | Changed. Its test "two readings across a 5-hour boundary say fixed or rolling" is dropped, answered by the provider's pages (V2-013 confirmed). It must give u_j for each window and s_j from the window's anchor, and mark stretches with no other client's use; with B4 it gives Q10 to Q15 |
| B9 | Unchanged (Q19) |
| B10 | Changed. The token part of the width gate: per window, the re-planned rate with the reserve, fit in every window, price summed; value per token first while a window limits; the better model until Q16; the budget also shown in the prompt (V2-004 holds in part; V2-008 holds in part; V2-010 holds in part; V2-015 holds in part; V2-017 confirmed; V2-026 holds in part). Also depends on B2's new terms |
| B11 | Changed. Ticket order: fit as a filter, then a reservation for the oldest command that does not fit, shorter commands backfilled only if they do not delay it; lengths the last two per label, raised to the timeout on overrun. It replaces the age cap where a command needs a share of something not free (V2-018 confirmed; V2-021 confirmed). Where every command needs only a slot, version 1's order (shortest expected first, then oldest, with the age cap) stays until Q34 (V2-020 holds in part) |
| B12 | Changed. The window term in admit becomes one term per window (inert while sizes are null); a parent-window term; f from R once the pilot's log exists (V2-091 holds in part; Q29) |
| B13 | Widened. The watcher gains the wake policy: a wake waits while nothing urgent waits, the backlog counted in tokens (V2-087 confirmed), after Q03 |
| B14 | Replaced by four pieces in this order. B14a: reshape shared places at plan time, one entry per unit, numbers chosen at landing (V2-062 holds in part); needs Q07 only, no hook. B14b: version-checked writes with the diff and reservation (V2-054 confirmed; V2-056 holds in part); needs Q26 and B6. B14c: claims below the file (V2-065 confirmed), the grain from Q07 and Q08; needs Q26. B14d: the merge script, every landing through the check, delete-versus-edit flagged (V2-074 confirmed; V2-078 holds in part); the modes table only as the last rung. No whole-file CRDT before Q36 |
| B15 (new) | The check's levers: test files side by side once Q21 says they are independent; batching at the gate capped by p (Q05, Q22); testing ahead in a free slot; letting a waiting worker go on, with a cap (V2-041 holds in part; V2-035 confirmed; V2-044 confirmed; V2-046 holds in part). Their order is set by Q21, Q05 and Q07 (K20). Depends on B5 and B11 |
| B16 (new) | The second stop: a unit at its cap is stopped, in the form commit-and-end, which is untested; in the tree, R11's cut becomes "commit at soft_frac and end" (V2-003 holds in part). Depends on FX-CLOSE |
| B17 (new) | The tree's split of unstarted keys in the B-link form and the remainder rule (V2-092 holds in part; V2-093 confirmed), built only if Q30 shows that a split beats a hand-over (K17). After the 13 fixes (V2-101 confirmed) |

Order: B1, B2, B4, B3, B5, B6, B7 (no measurement, no change of behaviour); B8, B9; B10 to B13; B15, B16; B14a to
B14d; B17 if Q30 calls for it.

## 7. Not found

**No lane found** (each lane's own list, in its report).
- Every lane: a real system with 3 to 16 workers whose units last minutes (V2-104 holds in part). The backfilling logs
  match our unit lengths but have one to two orders more processors; the engines' units are seconds; the only fact on
  Z is "a unit lasts minutes". Two near cases exist: Ries 1977 simulated units of minutes, about 10 sharing one I/O
  path (w1:W95 corrected), and one CI project with few concurrent builds (c1:C26 corrected).
- c1: N* for c slots in any source (computed here); N* with batch service in a closed queue; a paper on splitting a
  suite over machines with a measured speedup; a paper on computing affected build targets; a measured gain of
  drum-buffer-rope; a controlled before-and-after of batching at a known failure rate in production (V2-108 cannot be
  checked).
- w1: a measurement of any mechanism with units of minutes in a real engine, or with reruns that differ; the conflict
  rate where locking and optimistic control cross; a measured gain for sagas, split transactions, check-out or
  notification; a study of agents in one repository measuring speed against writers with the merge and the test run
  counted; a semantic-conflict rate between sessions; repeated runs of any agent benchmark; grain measured on a real
  engine on current hardware (V2-109 cannot be checked). w1's refuter adds one unread item the list should hold:
  Agrawal's "fake restart" assumption, held only as a summary.
- t1: how long a half-split lasts; a law in ratios for structure changes per insert; a controlled sweep of depth
  against fan-out at equal work with tokens per level; an LSM-tree against a B-epsilon tree on one workload (V2-110
  cannot be checked).
- a1: pacing against two windows on separate clocks that count the same tokens; a pacing price used to choose a
  model; value ranking and pacing measured on one baseline; a team's account of hitting a usage limit and changing its
  design; project scheduling with rough durations; window sizes, carry-over and cache weight on the plans (V2-111
  cannot be checked).
- No lane says how a value per unit is measured (Q17).

**Papers that need the owner's sign-in** (V2-112 cannot be checked). None was fetched for this draft.
- c1: IEEE TSE 2021, https://ieeexplore.ieee.org/document/9392370/ ; ICSME 2021,
  https://doi.org/10.1109/ICSME52107.2021.00026 ; the shifting bottleneck, https://pubsonline.informs.org/doi/fpi/10.1287/mnsc.34.3.391 ;
  Duclos and Spencer, DOI 10.1016/0925-5273(95)00197-2 ; Reiser and Lavenberg 1980,
  https://dl.acm.org/doi/pdf/10.1145/322186.322195 (bot check).
- w1: Adya 1999 (MIT DSpace rate limit); Cahill, Röhm and Fekete 2008 and 2009; Fekete and others 2005; IntelliMerge
  2019; Korth, Kim and Bancilhon 1988.
- t1: Sagiv 1986; Johnson and Shasha 1990 and 1993 (the 1993 paper would settle t1:C65, whose paper sits behind a bot
  check); Lanin and Shasha 1986 (NYU page forbidden, archive bot block); behind paywalls: Bayer and Schkolnick 1977,
  Yao 1978, Baeza-Yates 1989, Graefe 2011 (sold).
- a1: Balseiro and Gur 2019; Balseiro, Kim, Mahdian and Mirrokni 2017/2021 (SSRN bot check, publisher 403); Wang and
  others, SIGMETRICS (POMACS) 2017 (ACM bot check). Mu'alem and Feitelson 2001 is saved but has no text layer; reading
  it needs an OCR install, which needs the owner's word. Also closed: Kolisch 1996 (paywall), ITU-T I.371 (purchase).
- Not opened for other reasons and needed by a lane: Pradel and others 1986 and Agrawal, Carey and Livny 1987 in full
  (w1: before any claim rests on "no source models a differing rerun").

## 8. Verdicts

**Counts by verdict** (`R:v2-refute.md`, 145 statements; the fold raised none): confirmed 86, holds in part 53,
refuted 1 (V2-077), cannot be checked 5 (V2-108 to V2-112). The gate (`R:v2-gate.md`) found every cited claim id and
every stated lane verdict; its three flags were all on V2-004.

**What the fold did to the statements.** 86 confirmed: kept, nine with a caveat or a widening the refuter or a fold
position asked for (listed in `R:v2-claims.md`, column "fold"). 53 held in part: each narrowed to the part that held,
or written with the part that failed named; 9 of them now leave a point open with the measurement that would settle
it (V2-020, V2-052, V2-056, V2-066, V2-069, V2-072, V2-092, V2-099, V2-103). 1 refuted: replaced by what the refuter
showed, its point open (V2-077, Q36). 5 that cannot be checked: kept as written.

**What changed in the fold, and why.**
1. V2-004 used a1:A05, found PARTIALLY, "in full" (the gate's flags). Its row in `R:v2-claims.md` now gives A01, A05
   and A14 their verdicts and the use "in part"; the statement is narrowed: A82 holds only while demand exceeds the
   window's rate.
2. The drop of a whole-file CRDT (V2-077) was refuted: the preprint's own per-character figures favour the parallel
   mode in 5 of 6 tasks, and one preprint cannot rule a family out. Replaced by W61 as corrected; open; Q36 added.
3. The levers of the check are no longer ranked (V2-052, K20): the one shortening open at the gate is untested, and
   the study with few builds points the other way. Q21, Q05 and Q07 set the order.
4. Where every unit needs only a worker, version 1's order is no longer replaced (V2-020, K7): first come, first served
   is what the reservation reduces to, not a result. Q34 is widened to compare the two.
5. A second stop stays; its form, commit and end, is marked as having no source, and a token cap is said to give a
   time only through the spend rate (V2-003).
6. A window's price is not zero below its line in general (V2-007, V2-011, V2-107, K14); fit in every window is proven
   only for costs known on arrival (V2-010); LinkedIn's pacing is a different form from re-planning (V2-005).
7. The gate also shows the budget in the prompt (V2-026): the one tracker measured sat there.
8. The tree: no new keys arrive during a run (V2-140, K19); split or hand-over is open and a split is only its
   mechanism (V2-092, K17, B17); the schemes differ under extreme contention (V2-090, K18); the run-state writer is a
   script step, lock or compare-and-set open (V2-099, K10).
9. Several writers: one owner is no longer "only where none cross" but open between 0 and about 20 % crossing (V2-069,
   K9); the grain is measured and the 10-granule number leaves the rule (V2-066, K13, K16); a redo under version checks
   is one write only when the refusal concerns that file alone (V2-056, V2-072, K15); the 20 places are a count of a
   plan, not a measurement (V2-064).
10. Memory stays the hard limit, but parts are chosen against the ruled objective, not tokens alone (V2-103, K11).
11. Contradictions: the twelve the refuter found hidden or stated both ways are rows K9 to K20. Five are settled by a
    lane claim's correction (K12, K13, K14, K18, K19), one by the owner's ruling (K11), six are open with a named
    measurement (K9, K10, K15, K16, K17, K20). K1, K2, K4, K6 and K7 were narrowed.
12. Measurements: Q01, Q03, Q04, Q05, Q09 and Q10 narrowed to what a count or reading can give; Q08, Q30 and Q34
    widened; Q36 added. Counts over files on disk that need no run went from 8 to 6.
13. Figures narrowed to their conditions: V2-006, V2-008, V2-012, V2-016, V2-023, V2-024, V2-027, V2-031 to V2-034,
    V2-041, V2-045, V2-046, V2-055, V2-058, V2-062, V2-073, V2-075, V2-078, V2-083, V2-091, V2-096, V2-104, V2-105,
    V2-113, V2-115 to V2-117, V2-121, V2-122. Version 1's frame (V2-001) is marked as version 1's own, with the windows
    joining it by transfer; the model rule (V2-015) now says "no source read applies it", not "never applied".
14. The table: row 9 moved from replaced to corrected (8 kept, 9 corrected, 2 replaced, 19 new).

**What stays open.**
- V2-108 to V2-112 cannot be checked: the refuter was not shown the report sections they rest on. A later check would
  read the c1 report's section 4 and its addendum's "Not found", the w1 report's section 10, the t1 report's "Not
  found, not opened" and the a1 report's section 5, each against its lane's collect and refute files: is every item
  there, does each "not found" name what was searched, and does w1's list hold Agrawal's "fake restart" assumption (w1
  refuter, "Missing" item 3). For V2-112 it would also confirm each sign-in or OCR need from the reports, since no
  claims or refute file names one.
- The points the fold left open, each with its measurement: one owner (K9: Q07, Q08); lock or compare-and-set (K10:
  Q31); whether tokens bind ahead of memory (K11: Q09, Q10, Q19); the size of a redo (K15: Q02); the grain (K16: Q07,
  Q08); split or hand-over (K17: Q30); the levers' order (K20: Q21, Q05, Q07); the order for one-worker units (K7:
  Q34); a whole-file CRDT (Q36).
- Every number of the rule: none is set until its measurement exists.
- These are one refuter's verdicts, judged on `R:v2-claims.md`'s wording without the draft's marks. Version 1 stays
  as it is until the top session decides.
