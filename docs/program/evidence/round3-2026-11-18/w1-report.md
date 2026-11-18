# w1 report (final, 2026-11-19): several writers on one object, as engines solve it, and what carries to sessions

**Final, 2026-11-19 (step 4, fold).** Lane `writers`, research round 3, task r57-0512. The gate (`R:w1-gate.md`) and
the refuter (`R:w1-refute.md`) are folded in. Claims W01 to W98 are in `R:w1-claims.md` (`R:` =
`docs/program/evidence/round3-2026-11-18/`), each with its quotation, its line and its mark (proven, measured here,
hypothesis). Inputs: the seven collect files `R:w1-collect-{isolation,grain,engines,order,merge,long,production}.md`
with their second attempts. Where a claim holds in part, this report uses the refuter's corrected wording; such a
claim is never called supported. A hypothesis stays a hypothesis whatever the refuter said.

Records: `library/journal/2026-11-19/w1.jsonl`, 99 lines: 75 results (w1-0300 to w1-0374, one per confirmed or
holds-in-part claim from a paper that the rule or the architecture rests on, in the refuter's wording), 8 hypotheses
(the seven parts and the law, w1-0400 to w1-0407), 1 fact (w1-0100), 1 status with the verdicts (w1-0200), 13 open
(measurements M1 to M9, w1-0500 to w1-0508; four proposed corrections, w1-0509 to w1-0512), 1 pointer (w1-0700). No
result was written for W07, W13, W23, W32, W45 and W81 (nothing here rests on them) or for W53, W56 and W57 (held
already as r57-0302, r57-0305 and r57-0304). Every record was checked by script (parse, key order, ids, evidence
paths, and each number and leading name within three lines of a cited source line): 7 failed the first run and were
corrected at the source, 6 more were narrowed by hand to what their cited lines say, and the final run removed none.

N = writers at once on one file; F = independent regions of the file (functions, entries); k = regions one unit
touches; T = a unit's time. "Rule" = `docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md`.

## 1. The answer

1. The frame's four failures are right in kind (W01-W04, W12); "order first" is wrong for us: it needs each unit's sets
   before it starts (W36, W37). Missing: dirty write, deadlock, starvation of long units, delete-versus-edit lost
   silently, the judge reading half-done edits; and the means of taking the hot place out of the unit (sections 3, 7).
2. Every engine figure is for units of seconds or less; the one simulation of long units found about 10 coarse
   granules sufficient (W95 in part). On model sessions, one preprint, 4 writers, no repeated runs: version-checked
   writes 82.5 %, one agent 66.4 %, own worktrees 63.8 % (W62, W65 in part). Wait-or-redo has no general answer (W31 in part).
3. Nothing per file is enforced for harness builds today (W85, W88). Ranked proposal: reshape shared places;
   version-checked writes with a diff and a reservation on refusal; claims at the grain a unit touches; wait for a hot
   pair; checkpoints; the serial check, which at 596 s a run may cap landings first; structured merge. Every number
   in it is a measurement still to make (M1 to M9, section 6).

## 2. The table

| Conclusion | From | Measured gain and its conditions | What the refuter left of it | Still a guess for model sessions | What it changes in our rule or tree |
|---|---|---|---|---|---|
| Lost update: a write lands only on the version it read; never a whole-file overwrite of a shared file | W01, W62 | First-committer-wins prevents it (a definition, W01). Version-checked writes with a read-set check: 82.5 % against 63.8 % for worktrees and 66.4 % for one agent, Commit0-Lite, at most 4 writers (3.6 deployed on average), Sonnet 4.6, one preprint (W62) | Both confirmed. Added from the same paper: a refused write gets the current file, a diff and a short reservation, so what is redone is one write, not the unit; gains concentrate on large repositories; no repeated runs | Whether our Edit path can carry a version check: only Write was seen refused (W86, W88) | Rule line 136: add "a landing names the version of each place it read" |
| Dirty write and dirty read: own copies taken at one point; never two sessions in one working copy without claims | W02, W03, W65, W87 | In CAID (Sonnet 4.5), worktrees beat instruction-only separation, 59.1 against 56.1 % and 63.3 against 55.5 % (W65) | W02, W03, W87 confirmed. W65 holds in part: STORM's rerun of the same worktree method scored 63.8 % against 66.4 % for one agent; the abstract's +14.3 and +26.7 points are not Sonnet's | Read skew when a copy is refreshed mid-unit (W03); a test run in a shared copy judges another unit's half-done edits (section 7) | Tree unchanged (W87). For builds, own copies are the floor, not the method that gains |
| Write skew: validate at landing, and the serial check is the last judge | W05, W06, W08, W54-W56, W75 | SSI cost under 7 % against SI on two benchmarks, failures under 0.25 % disk-bound (W05); kdiff3 left 3 wrong merges in 52 once the verifier's 2 false positives were removed (W54); 1 % build and 6 % test failures over all human merges (W56) | W05 in part: the low cost came from dangerous structures being rare, not from low contention. W06 in part: long read-only transactions that read much take more read locks. W08, W54-W56, W75 confirmed | The rate for session pairs; semantic conflicts with no overlap (W75) | Keep rule line 136, "every merge passes the check" |
| Phantom: guard the gap of an ordered list, not a predicate | W04, W12, W14, W15, W59 | None measured; 42 % of agent-PR conflicts are add/add or modify/delete (W59) | W15 in part: key-range locking, a special form of predicate locking over intervals of a sort order, is what products use; an ordered list of entries is such a domain. The rest confirmed | Which places of code form ordered lists | New: gap claims for registries and lists (part 3) |
| Order first is wrong as stated; a dependency-ordered plan survives | W36-W39, W66 | Aria 2.4x Calvin and 10.3x a replicated primary-backup engine at low contention; 39 % of its own at skew 0.999 (W39); Co-Coder on gpt-5-mini lifted DevEval from 56.8 to 68.1 % at 1.81x speed-up and 28 % less cost (W66) | W36, W37 confirmed. W38 in part: log-order locking needs the set; ordering by resource does not. W39 in part: below PWV and BOHM above skew 0.8 and 0.9. W66 in part: "Claude Code" there ran on gpt-5-mini through a proxy; benchmarks were mixed in the draft | Whether a plan's file list matches what a session touches | Rule lines 124-127 hold for the declared part only |
| Claims below the file, at the grain a unit touches | W10-W12, W15-W20, W83, W95 | 1 to 10 granules: useful I/O 7041.957 to 9437.987 in a 1977 simulation, peak near 20, steep fall past a few hundred (W16); coarse claims held to the end of 10-operation transactions did "much worse" from deadlock and re-execution (W18); our count 3 (3 to 5) at once at file grain, 7 (5 to 7) at function grain (W83) | W16 in part: the value at 1,000 granules cannot be fixed from the OCR. The same paper found keeping locks in memory made little difference to the best grain, and with its long units (5 to 50 s of I/O) about 10 granules sufficed (W95 in part). W19 in part (also a memory trigger). W83 in part (ranges). W10-W12, W17, W18, W20 confirmed | k and F per file | Replace the per-file switch by claims at the grain a unit touches (part 3) |
| Writes that commute; the hot place out of the unit | W24, W40-W44 | Doppel 38x OCC and 19x 2PL with every transaction on one hot key, 20 cores; 3x on a larger application (W40); Silo with the counter out of the transaction 17.21x the partitioned store at 32 workers (W24); 25-fold on 200 servers against prior results elsewhere (W43) | W24 in part: 17.21x compares two engines; the gain from taking the counter out within Silo is not stated. W40 in part: transactions that read split data wait for the next joined phase. W42 in part: commutativity suffices, is not necessary. W41, W43, W44 confirmed | Which of our 20 places become entries applied at landing; how often a unit reads a place while entries are pending | Generalise r57-0401's skeleton step (part 1) |
| Snapshots for readers | W22 | Multiversion 80x the single-version update throughput with half the transactions long readers, 12 cores (W22) | W22 in part: with only short update transactions the single-version engine was twice as fast; the paper calls it fragile, not worse | How many sessions only read | None in the tree, whose writers work on own copies (W87); a reviewer reads a copy and holds no claim |
| Long units: wait or redo | W30, W31, W34, W67, W68 | In 2PL, waiting began to beat no-wait as operations per transaction grew; in Silo no-wait won (W31) | W31 in part: "One cannot give a general statement". W34 in part: optimistic control won only with low utilisation and many transactions available. W30 in part ("only" was added). W92 refuted. W67, W68 confirmed | The crossover, in tokens | Rule lines 131-135: no published direction; the per-pair product stands as a computation from M2 and M3 |
| Long-unit means: checkpoints, early release, notice | W69-W74 | None measured anywhere; the survey says so (W71) | Designs confirmed. W94 in part: a checkpoint bounds the loss only for aborts not caused by what was read before it | All of it | Parts 2 (notice) and 5 |
| Structured merge | W48-W53 | About 24 % fewer reported conflicts on 34,030 scenarios (W49); line merge first, tree merge only where it conflicts, 5 times faster on average than pure tree merge (W50) | W49 in part: estimated added wrong clean merges 20.60 ± 21.30 % against 9.62 ± 16.29 % for line merge (upper bounds), a sign of more; the improved s3m halved conflicts with at least 8 % fewer. W53 in part (as r57-0302). W48, W50-W52 confirmed | Rename-heavy session edits | Optional, last (part 7) |
| Operation transforms and CRDTs | W57, W61, W79 | Google runs transforms through one server, no figures (W79); up to 5 agents on one CRDT 13.1 % slower overall (W61) | W57, W79 confirmed. W61 in part: the parallel runs wrote 82-189 % more code and were faster per 1,000 characters in 5 of 6 tasks; the semantic-conflict figures (5-10 % against 20 % and 80 %) are not reconciled | None | Narrow rule line 137 and r57-0304: the five algorithms checked fail; a central server is not covered |
| Agent conflict rates | W58-W60, W64 | 19.8 % of same-agent and 41.7 % of cross-agent co-active pairs, textual, a lower bound (W58); 27.67 % of unmerged agent PRs against their base (W60); STORM's overlap 21.7 % at 4 writers, 35.1 % at 8 (W64) | W58, W59 confirmed. W60 in part: merged PRs were excluded. W64 in part: cost grew 2.2 times from 2 to 8 writers, sublinear; r = 0.28 overall | Our own pair rate | Correct r57-0308 (section 9) |
| Partition ownership is our one-owner mode | W26, W46, W47 | 1.54x with no crossing, below OCC at about 20 % crossing, 2.98x worse at about 60 % (W26) | W26, W47 confirmed. W46 in part: Harding's 12-40 % drop is a cost of distribution, not of ownership | Share of our units that cross owners (M6) | One owner only where no other unit crosses |
| New: the serial check may cap landings before conflicts do | W84, section 7 item 1 | 596 s a run allows about 6 landings an hour; N writers with units of T minutes ask 60N/T an hour; the check binds when T < 10N minutes (computed, hypothesis) | Raised by the refuter | T per unit (M9) | Lane `c1`'s batching answer is a precondition of every part |

## 3. Point (a): the frame, right, wrong, or missing a failure or a means

How reached: each row of the frame in `R:lane-writers.md` was checked against the claims as the refuter left them; a
row is "right" where a confirmed claim states the remedy, "right in kind" where the remedy holds only under a
condition a narrowed claim names, and a failure or means is "missing" where a quoted source names it and the frame
does not.

| Frame row | Verdict | Why |
|---|---|---|
| Lost update, first writer wins | Right | W01 confirmed; tested on model sessions at file grain (W62 confirmed) |
| Dirty read, snapshot per writer | Right, with two conditions | The copy is taken at one point, else read skew (W03); cooperating writers sometimes need each other's unfinished work, which a snapshot forbids (W98) |
| Write skew, validate what was read | Right in kind | Validation was cheap where dangerous structures were rare (W05 in part); long read-only units that read much hold more read locks (W06 in part); it has false positives (W08); the test suite states only the invariants it tests (W43) |
| Phantom, range or next-key locks | Right | General predicates are undecidable (W14); products use key-range locking, a restricted predicate lock over an ordered domain (W15 in part, W12) |
| Means 1, smaller units with an intention mark | Right, half missing | Escalation (W19 in part, W20); a delete needs its neighbour (W15 in part); what moves the best grain is how much a unit touches, not the cost of a lock (W17; Ries, section 7 item 7) |
| Means 2, order first so nothing is redone | Wrong as stated | Needs the sets first (W36, W37); without them, work is rerun (W39 in part) |
| Means 3, writes that commute | Right | Needs operations restated as commuting ones (W40 in part, W42 in part); readers of a split place wait (W40 in part) |
| Means 4, merge by structure | Right only for spurious conflicts | No fewer wrong clean merges, a sign of more (W49 in part); delete-versus-edit dropped silently (W51) |
| Missing failures | | Dirty write (W02); delete-versus-edit (W51, W82 in part); starvation (W68, W21 in part); deadlock (W18); cascading redo from work under validation (W35 in part); wasted work as the price (W30 in part); escalation collapse (W20); false refusals (W08, W63); the judge reading half-done edits in a shared copy and livelock between two optimistic writers (section 7) |
| Missing means | | Hot place out of the unit (W24 in part); snapshots for readers (W22 in part); ownership with a slow lane across owners (W26, W47); early release and steps (W72-W74); notice before landing (W69, W70); a short reservation after a refusal (STORM, section 7 item 6); a serial landing order with undo (W80); a check that carries more landings (section 7 item 1, lane `c1`) |

## 4. Point (b): each means of parallelism, its largest measured gain, and whether it survives for sessions

How reached: the largest figure that survived the refuter, per means, with its conditions; "survives" judged against
the four differences of our case (minutes, a redo costs tokens, 3 to 16 writers, a rerun differs). Every engine unit
read was seconds or less, except a 1977 simulation whose long units were best served by about 10 coarse granules (W95 in part). The engines'
retry is documented to see newly committed data and may act differently, so a differing rerun alone does not break
the remedy; its cost and a program that may itself be wrong differently on each run do (W09 in part). Slow steps
inside a transaction raise aborts (W25). So every "survives" below is a hypothesis about direction, never about size.

- **Grain.** Largest engine figure: useful I/O from 7041.957 to 9437.987 between 1 and 10 granules in a 1977
  simulation, peak near 20, and the authors' "about 10 granules suffice" (W16 in part). The best number rose as each
  transaction touched fewer entities (W17), while keeping locks in main memory made little difference (section 7 item
  7). With claims held to the end of 10-operation transactions, coarse claims deadlocked and forced re-execution
  (W18). Our count: 3 (3 to 5) units at once at file grain, 7 (5 to 7) at function grain, 8 only at statement grain
  with 0b first (W83 in part). Survives in direction: the grain to aim for is set by k/F, which M1 measures; the draft's
  argument "our claims are cheap, so the optimum moves finer" is withdrawn.
- **Order first.** Largest: Aria 2.4x Calvin and 10.3x a replicated primary-backup engine at low contention, falling to
  39 % of itself at skew 0.999 because aborted transactions rerun (W39 in part). Deterministic order does not survive:
  sessions do not know their sets (W37). A plan ordered by dependencies does in direction: Co-Coder, all methods on
  gpt-5-mini, generation from a specification, 1.81x faster on DevEval with a higher pass rate (W66 in part).
- **Commuting writes.** Largest: 38x over OCC with every transaction on one hot key, at the end of a sweep, at a latency
  cost for readers of split data; 3x on a larger application (W40 in part); 25-fold for confluent operations against
  prior results on other systems (W43). Survives for places that can become entries (lists, registries, numbers
  allocated at landing), not for free text: a CRDT of text gave semantic conflicts whose figures do not reconcile and
  a speed result confounded with more code (W61 in part).
- **Merge by structure.** About 24 % fewer reported conflicts on 34,030 scenarios, with no fewer wrong clean merges and
  a sign of more (W49 in part); line merge first with tree merge where it conflicts was 5 times faster on average than
  pure tree merge (W50). Survives at a cost of seconds, as a convenience, not a guard.
- **Added: versions and validation.** Snapshots: 80x update throughput with half the transactions long readers, but
  the single-version engine twice as fast with short updates only (W22 in part). On model sessions: version-checked
  writes 82.5 % against 63.8 % for worktrees, 4 writers, one preprint, no repeated runs (W62), the only measurement on
  model sessions of an engine remedy; a refusal there costs re-planning one write from a diff.

## 5. Point (c): what the harness can enforce today, and what it cannot

How reached: only from records b1-0101 to b1-0126, r57-0105 and the gated build-in design (W85-W89, all confirmed);
nothing is assumed about the Edit tool, a hook or a worktree beyond them.

- Can: in the tree, writers already have own copies (staging), objects are stored by exclusive create, and run state
  has one owner by compare-and-set (W87). A hook can refuse a Write outside an allowed folder, and hooks fire inside
  helpers (W86). Tokens per unit can be counted after the fact from kept transcripts (W89).
- Cannot: the tier hook sees only helper and session starts (W85), so no per-file owner, claim or version check
  exists for harness builds; the modes table, the merge script, the Write/Edit branch and the build plan are unbuilt
  (W88, record w1-0100). The Edit tool, shell writes and a hook that times out were never tested (W86).
- What reads can be known (W97, hypothesis, holds in part): tool hooks would see reads by the read and search tools;
  reads inside shell commands are seen only as command text unless file access is traced by the operating system,
  which a container allows; what a write may rest on is bounded by the transcript, which of it is not known. M7 tests it.

## 6. Point (d): the architecture that replaces the two-way switch, ranked by expected gain

How reached: each part takes an engine or session mechanism whose condition, as the refuter left it, our case meets
or can be made to meet; ranked by the size of the gain that survived and by whether that gain was measured in our
condition (minutes, costly redo) or depends on the condition our case breaks. The two-way switch survives as the
last rungs: one owner of a hot pair (part 4) or of a hot file.

**What moved, and why.** Version-checked writes move from third to second: they are the one part measured on model
sessions (W62 confirmed), and a refusal there costs re-planning one write from a diff, not the unit (section 7 item
6). Claims below the file move from second to third: the engines' grain gain is modest and simulated (W16 in part),
the best grain moves with how much a unit touches and hardly with the cost of a lock (W17, section 7 item 7), the
one study with long units found about 10 coarse granules sufficient (W95 in part), and escalation by share cannot be checked
(W96). Waiting for a hot pair loses its "direction proven" (W31, W34 in part; W92 refuted) and stays fourth as a
computation per pair.

**The ratio behind every part** (W90, hypothesis, holds in part). For two units each touching k of F regions chosen
uniformly, the chance of overlap is exactly 1 − C(F−k, k)/C(F, k), about k²/F when small; a unit meets at least one
of N − 1 others with chance 1 − (1 − p)^(N−1), which grows up to 15 times from 2 to 16 writers. It counts textual
overlap only: it misses semantic conflicts with no overlap (W54-W56, W75) and counts overlaps that merge cleanly
(separate entries, W12). Under file-grain claims p = 1 by definition; with merged own copies only overlapping or
interfering edits conflict; our 3 against 7 count used the same definition and illustrates the rule, it does not test
it (W91 in part). So p is measured per region from history (M1, M4), never computed from F alone.

Measurements named (none is guessed; "count" needs no run, "run" needs the owner's word under rule 3). Each is an
`open` record, w1-0500 to w1-0508.
- M1, count: k per unit and F per file, how many units touch each region, and for each unit the share of its diff on
  hot places and when in the unit it was written, from the change lists and diffs of past units.
- M2, count: tokens of a redone unit, of re-applying a refused write from a diff, and of the steps since a checkpoint,
  from transcripts (W89; the rule's measurement 6); for each past conflict, whether the conflicting item was read
  before the last checkpoint.
- M3, run: clock time a unit waits for an owner (the rule's measurement 2).
- M4, run: conflicts of session edits on our own neighbouring lines (the rule's measurement 5).
- M5, run: the share of clean merges of two session units that fail the check.
- M6, count: the share of units whose change list crosses two owners.
- M7, run: whether a PreToolUse refusal stops the Edit tool, whether a hook can check a version, and what a hook sees
  of reads by the read, search and shell tools (W86, W97).
- M8, count (replay, no run): replay recorded units (regions per file, in order of first touch) against share
  thresholds for escalation and against resource-ordered claims or wait-die; count waits, conflicts and aborts (W93, W96).
- M9, count: minutes per unit and its spread, and landings asked per hour, from transcripts, against the check's
  capacity from lane `c1`.

### Part 1. Reshape shared places so writes commute or land at integration (largest expected gain)

- What: each registry or list gets one entry per unit, applied at landing; a number that must be "the next free one"
  (a migration number, an id) is chosen at landing by one allocator, never by the writer; an ordered sequence becomes
  one step per unit (r57-0401's skeleton); units start in dependency order.
- Mark: mechanism proven in engines (W43 confirmed; W24, W40, W42 in part); a dependency-ordered plan measured with
  LLM agents on generation from a specification only (W66 in part); our count measured here (W83 in part); for our
  edits a hypothesis. A writer-chosen name that must be unique does not commute (W43): a duplicate check at landing.
  The refuter's case against W92 is the case for this part: a hot edit such as a registry line is a small, late part
  of a unit and can be applied at landing (reasoned).
- Cost: a unit that reads a place while entries are pending sees the old state (the latency cost of W40).
- 2 against 16 writers: removing the hot place removes the term that grows with N, so the value grows with N.
- Small file: the whole file is often the hot place, and reshaping is what helps. Very large file: the hot places
  are a few regions (registry, imports, exports); reshaping them leaves the rest to parts 2 and 3.
- Numbers from: M1 (which regions every unit touches, and when), M5 (whether entries applied at landing pass the check).

### Part 2. Version-checked writes, a read check, a diff and a short reservation on refusal, a notice

- What: a write names the version of each region it read and lands only if what the unit read is unchanged (W01,
  W62); a refused write gets the current text, a diff of what changed since its read and a list of stale
  dependencies, and a short reservation on that file so two writers cannot refuse each other in a loop (STORM,
  section 7 item 6); a running unit is told as soon as a file it read changes, so it re-reads before landing (W69,
  W70). A conflict counts as serious only on an item read before the other unit landed (Pradel's snapshot
  validation, section 7 item 4, not opened).
- Mark: proven on model sessions at file grain, at most 4 writers, Sonnet 4.6, one preprint, no repeated runs (W62);
  validation has false positives (W08) and at file grain refuses edits to different functions (W63); writes through
  bash bypass it (W63); region grain, the notice and the serious-only rule are hypotheses; reads outside the read and
  search tools stay unseen without tracing (W97 in part).
- 2 against 16 writers: refusals grow with the overlap law; STORM's first-round overlap rose from 21.7 % at 4 writers
  to 35.1 % at 8 (W64 in part).
- Small file: refusals frequent; part 1 or part 4 takes over. Very large file: file grain refuses edits to different
  functions (W63), so the version is kept per region (part 3).
- Numbers from: M2 (tokens to re-apply a refused write against a redone unit), M4, M7.

### Part 3. Claims below the file, at the grain a unit touches

- What: a unit claims the regions it will change and marks the file (W10, W11); an insert claims only its position in
  a gap (W12); a delete also claims its neighbour (W15 in part); claims named in the plan are taken in one fixed order
  and cannot deadlock (W38 in part); places found during work are claimed in resource order (a new claim only above all
  held ones, else release and retake), by wait-die, or validated at landing (W93, hypothesis, holds in part); each option
  that aborts costs a redo in tokens. Promotion of a unit's claims to the whole file by a share (W96) cannot be checked:
  a session learns its regions while working, so a share is reached late, and one wrong escalation stops every other
  writer of the file (W20); it is held back until M8.
- Mark: mechanism proven in engines (W10-W12, W18, W20 confirmed; W15, W19 in part); in production Figma resolves at
  the grain of one property of one object (W77, self-reported); our count measured here (W83 in part); behaviour for
  sessions a hypothesis; enforcement depends on M7 (W86, W88).
- 2 against 16 writers: the grain enough for 2 can be up to 15 times too coarse for 16 (W90 in part).
- Small file (F near k): no gain over a file claim. Very large file (F far above (N − 1) k²): all N proceed, where a file
  claim would stop all of them (W20).
- Numbers from: M1 (k, F), M7, M8.

### Part 4. Wait for a known hot pair instead of redoing

- What: where part 1 cannot remove a collision, the second unit waits for the first's landing; per pair, wait when
  chance of conflict × tokens of a redo > cost of the wait, in what is scarce now (rule lines 131-135); a unit refused
  once gets the reservation of part 2.
- Mark: hypothesis. No published direction: in the one source that compared them, waiting beat no-wait as operations
  per transaction grew in 2PL while no-wait won in Silo, and the authors give no general statement (W31 in part);
  optimistic control won only with low utilisation and many transactions available (W34 in part); cheap aborts can
  make high abort rates acceptable (W30 in part). The draft's bound "every method lands about one unit per unit time on
  a hot place" is refuted (W92). Waiting a long time on a starving unit is what the engines cure with a whole-database
  lock, which the survey calls not acceptable (W21 in part, W68).
- 2 against 16 writers: the wait grows with the queue on the hot place, the redo with the overlap law.
- Small file: used often. Very large file: rarely. In one large system, defects rose with the degree of parallel
  change on a file (W76, a correlation), so the most-edited places are where it may pay (hypothesis).
- Numbers from: M2 (redo tokens), M3 (wait), M1 and M4 (chance).

### Part 5. Recovery steps smaller than the unit

- What: a unit commits in its own copy at checkpoints; a refusal or failed check returns it to the last checkpoint,
  not to the start; a finished file whose sets do not depend on the rest lands early and frees its claims (W73).
- Mark: hypothesis (W94, holds in part). A checkpoint bounds the loss to the steps since it only for aborts not caused
  by what the unit read (crash, deadlock: W72) and for conflicts on items first read after it; a conflict on something
  read before it invalidates the steps built on that read; the model's context at the checkpoint must be rebuilt at a
  token cost. The designs exist (W72-W74) and none was ever measured (W71); an engine in use tells transactions longer
  than its 5-second window to split into smaller ones (W33 in part).
- Behaviour: cuts the cost of a redo to the part since the last checkpoint where the conflict is on a later read, for
  any N and any file size.
- Numbers from: M2 (tokens since a checkpoint against the whole unit, and when conflicting items were read).

### Part 6. Every landing through the serial check, in one order, with undo

- What: as the rule already says (line 136) and as a very large mainline does it (W80): one landing order, the check
  after each, automatic undo of a change that breaks.
- Mark: proven as practice (W80, self-reported); it is the only guard against the wrong clean merge (W54-W56, W75).
- Behaviour: at 596 s per run here (W84) one check per landing allows about 6 landings an hour; N writers with units
  of T minutes ask 60N/T, so the check binds when T < 10N minutes: for 3 writers at units under 30 minutes, for 16 under
  160 minutes (computed, hypothesis, section 7 item 1). So the check's capacity, lane `c1`'s answer, may cap every
  other part before write conflicts do.
- Numbers from: M5, M9.

### Part 7. Structured merge, last

- What: line merge first, tree merge only where it conflicts (W50), delete-versus-edit always flagged (W51).
- Mark: proven for human merges (W48, W50-W52 confirmed; W49 in part: no fewer wrong clean merges); a hypothesis for
  session edits.
- Behaviour: seconds per merge whatever N (W50); likely worth most in large files with many members, where reordered
  members make line conflicts (hypothesis).
- Numbers from: the share of our conflicts that are reorders or renames (M4).

Dropped, with the reason: deterministic order (needs the sets, W36, W37); transforms of operations among sites with no
central server (W57; Google's central server, W79, needs a transform for every pair of change types, which free code
edits do not have); a CRDT of a whole file (W61 in part); escrow on text (numbers only, W44; it may fit the token
allowance in lane `a1`); one owner per file as the default (one escalation stops all, W20; ownership loses once units
cross, W26; M6 says where it still fits).

## 7. What the refuter found missing, and what would settle each

1. **The serial check caps landings before write conflicts do** (computed from W84, hypothesis). Settles it: M9 (unit
   minutes and landings asked per hour) against lane `c1`'s capacity of one check with batching, bisecting or selection.
2. **Dirty reads by the judge**: a test run in one working copy sees another unit's half-done edits, so a pass or a
   fail can belong to someone else's work (Berenson's P1 and A1). Settles it: the build plan names where each check
   runs; no check runs in a copy holding more than the units it judges. A design rule, no measurement.
3. **Agrawal's "fake restart" assumption**: a restarted transaction replaced by a different one, the engine
   literature's nearest model of "a rerun is not the same run". The library holds it only as a summary
   (`E:concurrency-literature.md:26`). Settles it: read Agrawal, Carey and Livny 1987 in full before any claim rests on
   "no source models a differing rerun"; until then that phrase is not used.
4. **Pradel's snapshot validation** (Barghouti and Kaiser's account): restart only for conflicts on objects read
   before the other transaction finished. Folded into part 2 as a hypothesis. Settles it: read Pradel and others 1986
   (not opened); then M2's count of conflicts on items read before against after the other unit landed.
5. **Wait-die, wound-wait and deadlock detection** as deadlock-free ways to wait on places found while working.
   Folded into part 3 (W93 in part). Settles it: M8.
6. **STORM's rejection payload and reservation**: a refused write is re-planned from the current file, a diff and a
   list of stale dependencies, and a short reservation stops two agents invalidating each other in a loop. Folded into
   part 2. Settles it: M2 (tokens to re-apply a refused write).
7. **Ries 1977 experiment 2**: keeping locks in main memory "appears to make little difference" to the best grain.
   Folded into sections 3 and 4 and part 3. Settles it: M1 (k/F per unit, which is what moved the grain).
8. **Variance**: STORM, CAID and Co-Coder report no repeated runs in the lines read; CodeCRDT reports a spread at
   temperature 0. Gaps of a few points (W65 on PaperBench; W62 on PaperBench, 74.1 against 72.7) are within what a
   rerun could move. Settles it: no conclusion here rests on a gap of a few points; W62's 82.5 against 63.8 % rests on
   one run per arm and is marked so.

Failures or means the claims ignored, folded in above: the judge as the bottleneck (item 1, part 6); speculative
landing on work already under test (Hekaton's commit dependency, W35 in part; a merge queue that tests stacked
changes is lane `c1`'s); livelock between two optimistic writers (item 6, part 2); the straggler cost of every
batch-barrier design (Aria's batches, Doppel's phase change, Calvin's epochs) when units last minutes and differ in
length (W41), settled by M9's spread of unit minutes.

## 8. Verdicts

Rule (`R:w1-brief-fold.md`): confirmed = gate STANDS or MOVED and refuter CONFIRMED; holds in part = refuter PARTIALLY
or gate NUMBER-ABSENT (the corrected claim is used); refuted; cannot be checked = gate ABSENT or NO-FILE, or refuter
UNVERIFIABLE. Gate: 91 STANDS, 7 NO-QUOTE (the hypotheses W90-W94, W96, W97, nothing to check by quote; their verdict
is the refuter's), no MOVED, ABSENT or NO-FILE.

| Verdict | Count | Claims |
|---|---|---|
| confirmed | 57 | W01-W04, W08, W10-W14, W17, W18, W20, W23, W25, W26, W28, W36, W37, W41, W43-W45, W47, W48, W50-W52, W54-W59, W62, W63, W67-W80, W84-W89, W98 |
| holds in part | 39 | listed below |
| refuted | 1 | W92 |
| cannot be checked | 1 | W96 |

Not confirmed, one line each (the corrected wording is the one used):
- W05 in part: SSI's low cost (under 7 %; 5 % in memory; failures under 0.25 % disk-bound) came from dangerous structures being rare, not from low contention; read tracking cost 10-20 % CPU on a microbenchmark; "4 to 36 client threads" is not in the text.
- W06 in part: it is long read-only transactions that read much that take more read locks; their length holds back cleanup, which can exhaust memory.
- W07 in part: the untracked write-read flows run through the application; SSI tracks every read inside the database; the analogy to a shell read is a different failure.
- W09 in part: the documented retry sees newly committed data and may act differently; what fails for sessions is the cost and a program that may be wrong differently each run, not non-determinism.
- W15 in part: key-range locking is a special form of predicate locking and is what products use.
- W16 in part: the peak is near 20 granules, "within 1%" at 10; the value at 1,000 cannot be fixed from the OCR; locks kept in memory made little difference to the best grain.
- W19 in part: SQL Server also escalates when lock memory passes a threshold (24 % of engine memory by default); the count trigger is per statement.
- W21 in part: Kung and Robinson's starvation cure is equivalent to write-locking the whole database.
- W22 in part: with only short update transactions the single-version engine was twice as fast as the multiversion ones.
- W24 in part: 17.21x compares Silo without the counter to another engine; the gain of removing the counter within Silo is not stated.
- W27 in part: thrashing at 16 cores is one 2PL scheme; the all-schemes drop is a separate 64-core skew sweep; OCC did best at theta 0.8 on 1,024 cores.
- W29 in part: TicToc's commit order alone gave 10 % over Silo on high-contention YCSB and 35.6 % on TPC-C with 4 warehouses; most of the 92 % came from no-wait and pre-emptive aborts.
- W30 in part: Cicada says cheap aborts can make high abort rates acceptable, not that they are acceptable only then.
- W31 in part: in Silo no-wait beat wait; the authors give no general statement; size is operations per transaction, not duration.
- W32 in part: one multiversion protocol (Cicada) was tested; the generalisation is the authors' reasoning.
- W33 in part: OCC was chosen to avoid lock logic; the under-1 % conflict rate (self-reported) is why it works well.
- W34 in part: optimistic control won only with low utilisation and, in addition, many transactions available; the authors doubt such low use occurs.
- W35 in part: Hekaton's commit dependency, and so its cascading abort, arises from reading a version of a transaction already in its validation phase (finished, awaiting commit), not of one still working.
- W38 in part: the cited line is a requirement; the deadlock-free statement is log-order locking, which needs the set first.
- W39 in part: the 10.3x is against a replicated primary-backup engine; above skew 0.8 and 0.9 Aria fell below PWV and BOHM.
- W40 in part: readers of split data wait for the next joined phase; 38x is the end of a sweep; a larger application gained 3x.
- W42 in part: commutativity gives a conflict-free implementation per situation, is sufficient and not necessary; "conflict" is cache-line sharing.
- W46 in part: Harding's 12-40 % drop from two to four partitions is a cost of distribution, not a result on ownership.
- W49 in part: estimated added wrong clean merges were 20.60 ± 21.30 % against 9.62 ± 16.29 %, a sign of more; s3m halved conflicts with at least 8 % fewer.
- W53 in part: diff3 is clean only under a specific condition on the edits; "separated edits" is the intuition the paper shows insufficient (as r57-0302).
- W60 in part: 27.67 % is of agent PRs open or closed without merging; merged PRs were excluded; the rate levelled at 32-33 % and fell for larger PRs.
- W61 in part: the parallel runs wrote 82-189 % more code and were faster per 1,000 characters in 5 of 6 tasks; the semantic-conflict figures do not reconcile.
- W64 in part: r = 0.28 overall; cost rose 2.2 times from 2 to 8 writers while deployed writers rose 3.2 times, so sublinear.
- W65 in part: the abstract's gains are not Sonnet's; STORM's rerun of the worktree method scored below one agent.
- W66 in part: all methods ran gpt-5-mini; "Claude Code" scored lowest on both benchmarks; the draft mixed two benchmarks.
- W81 in part: Microsoft's pull-request UI hung on very large merges in the first week and was fixed within days; not a lasting limit.
- W82 in part: Discord's later migration was driven by hot partitions from reads, compaction backlogs and garbage-collection pauses; write contention is not named.
- W83 in part: the counts carry ranges, 3 to 5 at file grain and 5 to 7 at function grain.
- W90 in part: the exact pair overlap is 1 − C(F−k, k)/C(F, k); the law counts textual overlap only.
- W91 in part: file-grain conflict is true by definition under file claims; the count illustrates the rule, it does not test it.
- W93 in part: places found while working can still be claimed without deadlock (resource order, wait-die, wound-wait, detection).
- W94 in part: a checkpoint bounds the loss only for aborts not caused by reads made before it.
- W95 in part: Ries 1977 simulated long units (50 to 500 entities at 100 ms of I/O each) and its authors concluded that about 10 granules suffice.
- W97 in part: hooks would see reads by the read and search tools; the transcript bounds what a write rests on; "invisible" overstates.
- W92 refuted: "every method lands at most about one unit per unit time on a hot place" is contradicted by taking the hot write out of the unit (W24) and by commuting writes (W40); the bound holds only if the claim on the hot place is held for the whole unit.
- W96 cannot be checked: nothing read tests escalation by share; the refuter's strongest reasons against it are in part 3.

## 9. Proposed corrections (written as `open` records in the lane's journal; the top session decides)

- r57-0304 (w1-0509): "OT is ruled out for more than two writers" goes beyond Boucheneb and
  Imine (five algorithms model-checked, a counterexample each); Google Docs (self-reported, no figures) orders all
  changes at one server and transforms there, which that result does not cover.
- r57-0308 (w1-0510): from summary to quoted, with its numbers split: 19.8 and 41.7 % are pair rates (W58); 27.67 % is unmerged
  pull requests against their base (W60 in part); the 21.1 % speed-up is the best task while the mean was 13.1 % slower,
  with 82-189 % more code (W61 in part).
- r57-0406 (w1-0511, the switch): becomes the last rungs of the ranked architecture of section 6; the one measurement on model
  sessions put own worktrees below one agent and version-checked writes above both (W62, W65 in part); where writes are
  checked as they are made, the redo cost in its threshold is the cost of re-applying a write.
- r57-0301 (w1-0512): Agrawal, Carey and Livny's optimistic win needs, in addition to low utilisation, a large number of
  transactions available to run (W34 in part).
- Not records: the rule's Step 2 row "Shared files | Per file: own copies, or one owner" (line 116), answer 5 (lines
  34-36) and lines 124-137 follow r57-0406 and change with it; the lane file's sub-topic 7 wording ("a storage
  migration forced by write contention", Discord) is wrong (W82 in part).

## 10. What was not found and what was not opened

Searched (per the collect files): library look-ups for every search word of `R:lane-writers.md` and for `Adya`,
`phantom`, `Lomet`, `Graefe`, `Doppel`, `Kallman`, `saga`, `Barghouti`, `Perry`, `Korth`, `Spork`, `IntelliMerge`,
`Figma`, `Discord`, `Piper`, `monorepo`; web searches by paper title only.

Not found:
- A measurement of any mechanism with units of minutes in a real engine, or with reruns that differ (W95 in part; the
  1977 simulation is the one exception for length).
- A conflict rate at which locking and optimistic control cross (`R:w1-collect-engines.md:296`); the one source that
  compared waiting with no-wait gives no general statement (W31 in part).
- A measured gain for sagas, split transactions, check-out or notification (W71).
- A study of AI agents in one repository measuring speed against the number of writers with the merge and the test
  run counted (`R:w1-collect-merge.md:264`); a semantic-conflict rate between model sessions beyond a 60-run inspection
  whose figures do not reconcile (W61 in part); repeated runs of any agent benchmark (section 7 item 8).
- Grain measured on a real engine on current hardware (`R:w1-collect-grain.md:137`).
- A conflict or rollback rate for Google's trunk; how often Figma or Google Docs drops an edit; a primary Meta text on
  server-side rebase (only a third party's notes, `summary`, no claim rests on it); a migration that its company
  says was forced by write contention (`R:w1-collect-production.md:108-113`).

Not opened, needs the owner's sign-in: Adya 1999 (MIT DSpace rate limit); Cahill, Röhm, Fekete 2008 and 2009 (ACM,
Sydney, CORE); Fekete and others 2005 (ACM; the Minnesota copy fails the certificate check); IntelliMerge 2019 (ACM;
abstract only); Korth, Kim, Bancilhon 1988 (ScienceDirect). Not opened otherwise: Srinivasan and Carey 1991 (the
1993 journal version was read); Pradel 1986 (now needed, section 7 item 4), Yeh 1987, Weihl 1988; BOHM and PWV;
Spanner, CockroachDB, LMDB, RocksDB (skipped as changing no answer). Agrawal, Carey and Livny 1987 on fake restarts is
held only as a summary (section 7 item 3).

Read with a caveat: Mohan 1990 came from a copy of unrecorded origin, so no claim rests on it alone (W12 rests on
InnoDB); sagas from a poor OCR course copy (W74); Ries 1977 digits are OCR (W16); Srinivasan's Figure 23 and Tanabe's
plots were not read as numbers (W18, W31); Kung, Agrawal, Larson, Silo, Yu, Harding, Bailis, Apel and Cavalcanti
come from the earlier round's quotations, whose paper texts are not in this repository (the refuter checked them
against those quotations); Uber's merge queue is lane `c1`'s.
