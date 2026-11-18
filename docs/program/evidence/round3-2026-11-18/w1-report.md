# w1 report (draft, step 2): several writers on one object, as engines solve it, and what carries to sessions

Lane `writers`, research round 3, task r57-0512, 2026-11-19. Draft for the gate and the refuter; the column "what the
refuter left" says "pending" until step 4. Claims W01 to W98 are in `R:w1-claims.md` (`R:` =
`docs/program/evidence/round3-2026-11-18/`), each with its quotation, its line and its mark (proven, measured here,
hypothesis). Inputs: the seven collect files `R:w1-collect-{isolation,grain,engines,order,merge,long,production}.md`
with their second attempts. N = writers at once on one file; F = independent regions of the file (functions,
entries); k = regions one unit touches; T = a unit's time. "Rule" = `docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md`.

## 1. The answer

1. The frame's four failures and remedies are right in kind (W01, W03, W04, W12); "order first, so nothing is redone"
   is wrong for us: it needs each unit's sets in advance, else "declare the set or run serially" (W36, W37).
2. Missing failures: wasted work and starvation of long units (W31, W68), deadlock and cascading redo (W18, W35), dirty
   write (W02), delete-versus-edit lost silently (W51, W82). Missing means: escalation and de-escalation (W19, W20),
   the hot place taken out of the unit (W24), snapshots for readers (W22), recovery steps smaller than a unit (W72-W74).
3. Largest gains, all for units of seconds or less (W95): commuting writes 38x (W40), hot place out 17.21x (W24),
   snapshots 80x (W22); long units should wait, not abort (W31); on sessions version-checked writes beat worktrees 82.5 to 63.8 % (W62).
4. Today nothing per file is enforced for helpers (W85, W88). Ranked proposal: reshape shared places, claims below the
   file, version-checked landing, wait for hot pairs, checkpoints, the serial check, structured merge; governed by a
   unit's conflict chance ≈ (N − 1) k²/F (W90), with k, F, redo tokens and waits still to be measured.

## 2. The table

| Conclusion | From | Measured gain and its conditions | Refuter left | Still a guess for model sessions | What it changes in our rule or tree |
|---|---|---|---|---|---|
| Lost update: a write lands only on the version it read; never a whole-file overwrite of a shared file | W01, W62, W79 | First-committer-wins prevents it (a definition, W01); version-checked writes with read-set check: 82.5 % against 63.8 % for worktrees, 4 Claude writers, one preprint (W62) | pending | Whether our Edit path can carry a version check: a refusal was seen for Write only (W86, W88) | Rule line 136: add "a landing names the version it read" |
| Dirty write and dirty read: own copies taken at one point; never two sessions in one working copy without claims | W02, W03, W65, W87 | Worktrees beat instruction-only separation, 59.1 against 56.1 % and 63.3 against 55.5 % (W65, preprint) | pending | Read skew when a copy is refreshed mid-unit (W03) | Tree unchanged: it already isolates writers (W87) |
| Write skew: validate at landing, and the serial check is the last judge | W05, W06, W54, W56, W75 | SSI costs under 7 % in an engine, short units (W05); textual tools left 5 wrong merges in 52 filtered ones (W54); 1 % build and 6 % test failures over all human merges (W56) | pending | The rate for session pairs; long units raise SSI's conflicts (W06) | Keep rule line 136, "every merge passes the check" |
| Phantom: guard the gap of an ordered list, not a predicate | W12-W15, W59 | None measured; 42 % of agent-PR conflicts are add/add or modify/delete (W59) | pending | Which places of code form ordered lists | New: gap claims for registries and lists (part 2) |
| Order first is wrong as stated; a dependency-ordered plan survives | W36-W39, W66 | Aria 2.4x Calvin and 10.3x a locking engine at low contention, 39 % of its own at skew 0.999 (W39); dependency-aware LLM agents 1.81x faster on greenfield tasks (W66) | pending | Whether a plan's file list matches what a session touches | Rule lines 124-127 hold for the declared part only (W93) |
| Finer claims | W10-W20, W83 | 1 to 10 granules +34 % useful I/O, simulation, dear locks (W16); coarse claims held long lost "severely" by deadlock, size unread (W18); our count 3 to 7 units at once (W83) | pending | k and F per file; deadlock of claims taken while working (W93) | Replace the per-file switch by a ladder (section 4) |
| Writes that commute, hot place out of the unit | W24, W40-W43 | 17.21x at 32 workers (W24); 38x OCC at one hot key, 20 cores (W40); 25-fold, 200 servers (W43) | pending | Which of our 20 places become entries applied at landing | Generalise r57-0401's skeleton step (part 1) |
| Snapshots for readers | W22, W32 | 80x update throughput with half long readers, 12 cores (W22) | pending | How many sessions only read | None in the tree, whose writers already work on own copies (W87); for builds, a reviewer reads a copy and never holds a claim |
| Long units: wait, do not redo | W30, W31, W34, W67, W68 | Direction only; the size is in an unread plot (W31) | pending | The crossover ratio | Rule lines 131-135 gain a published direction |
| Long-unit means: checkpoints, early release, notice | W69-W74 | None measured anywhere; the survey says so (W71) | pending | All of it | New parts 3 and 5 |
| Structured merge | W48-W53 | About 24 % fewer reported conflicts over 34,030 scenarios, no fewer wrong ones (W49); delete-versus-edit dropped silently (W51) | pending | Rename-heavy session edits | Optional, last |
| Operation transforms and CRDTs | W57, W61, W79 | Google runs transforms through one server, no figures (W79); 5 agents on one CRDT 13.1 % slower on average (W61) | pending | None | Narrow rule line 137 to "without a central order" |
| Agent conflict rates | W58-W60, W64 | 19.8 to 41.7 % per co-active PR pair, a lower bound (W58); overlap 21.7 to 35.1 % from 4 to 8 writers (W64) | pending | Our own pair rate | Correct r57-0308 (section 5) |
| Partition ownership is our one-owner mode | W26, W45-W47 | 1.54x with no crossing, below OCC at about 20 % crossing, 2.98x worse at 60 % (W26) | pending | Share of our units that cross owners | One owner only where no other unit crosses |

## 3. The four points the lane must settle

### (a) The frame

How reached: each row of the frame in `R:lane-writers.md` was checked against the quotations of the seven collect
files; a row is "right" where a quoted source states the remedy, and a failure or means is "missing" where a quoted
source names it and the frame does not.

| Frame row | Verdict | Why |
|---|---|---|
| Lost update, first writer wins | Right | W01; tested on sessions at file grain (W62) |
| Dirty read, snapshot per writer | Right, with a condition | The copy must be taken at one point, else read skew (W03); cooperating writers sometimes need each other's unfinished work, which a snapshot forbids (W98) |
| Write skew, validate what was read | Right in kind | Validation costs little only for short units (W05, W06) and has false positives (W08); the test suite states only the invariants it tests (W43) |
| Phantom, range or next-key locks | Right in kind | Full predicate locks are undecidable (W14); products use gap locks (W12, W15) |
| Means 1, smaller units with an intention mark | Right, half missing | Escalation and de-escalation (W19, W20); a delete needs its neighbour (W15) |
| Means 2, order first so nothing is redone | Wrong as stated | Needs the sets first (W36, W37); without them work is rerun (W39) |
| Means 3, writes that commute | Right | Needs the operations restated as commuting ones (W40, W42); character-level commuting gave semantic conflicts (W61) |
| Means 4, merge by structure | Right only for spurious conflicts | No fewer wrong merges (W49); delete-versus-edit silent (W51) |
| Missing failures | | Dirty write (W02); delete-versus-edit (W51, W82); starvation (W21, W68); deadlock (W18, W38); cascading redo (W35); wasted work as the price (W30, W31); escalation collapse (W20); false refusals (W08, W63) |
| Missing means | | Hot place out of the unit (W24); snapshots for readers (W22); ownership with a slow lane across owners (W26, W47); early release and steps (W72-W74); notice before landing (W69, W70); a serial landing order with undo (W80) |

### (b) Each means: its largest measured gain, and whether it survives for sessions

How reached: the largest figure quoted per means, with its conditions; "survives" judged against the four
differences of our case (minutes, redo costs tokens, 3 to 16 writers, a rerun differs). No source measured a unit
longer than seconds (W95); the engines assume a rerun repeats the same program (W09) and say slow steps inside a
transaction raise aborts (W25). So every "survives" below is a hypothesis about direction, never about size.

- **Grain.** Largest engine figure: +34 % useful I/O from 1 to 10 granules in a 1977 simulation where a lock cost as
  much as a data access (W16); that model's optimum is coarse because locks were dear, and it moved finer as units
  touched less (W17). With claims held long, coarse units deadlocked and forced re-execution (W18). Our own count:
  3 units at once at file grain, 7 at function grain, 8 at statement grain with 0b first (W83). Survives in
  direction: our claims are cheap and our waits dear, the reverse of 1977, so the optimum moves finer (hypothesis).
- **Order first.** Largest: Aria 2.4x Calvin and 10.3x a locking engine, low contention, falling to 39 % of itself
  at high skew because of reruns (W39). Deterministic order does not survive: sessions do not know their sets (W37).
  A plan ordered by dependencies does: 1.81x faster with LLM agents on greenfield tasks (W66).
- **Commuting writes.** Largest: 38x over OCC on one hot key (W40), 17.21x by taking a hot counter out of the
  transaction (W24), 25-fold for confluent operations (W43). Survives for places that can become entries (lists,
  registries, numbers allocated at landing), not for free text edits: commuting at the character level gave
  5-10 % semantic conflicts and 13.1 % slower runs (W61).
- **Merge by structure.** About 24 % fewer reported conflicts on 34,030 scenarios (W49); in a smaller study 34 %
  fewer in 60 % of scenarios and more in 26 % of them (W48); no fewer wrong merges (W49). Survives at a cost of seconds (W50), as a
  convenience, not a guard.
- **Added: versions and validation.** Snapshots: 80x update throughput with long readers (W22), at 10-19 % cost
  for serializability (W23). Validation on sessions: +18.7 points over worktrees (W62), the only measurement on
  model sessions of an engine remedy.

### (c) What the harness can enforce today, and what it cannot

How reached: only from records b1-0101 to b1-0126, r57-0105 and the gated build-in design (W85-W89); nothing is
assumed about the Edit tool, a hook or a worktree beyond them.

- Can: in the tree, writers already have own copies (staging), first-committer-wins by exclusive create, and one
  owner of run state by compare-and-set (W87). A hook can refuse a Write outside an allowed folder, and hooks fire
  inside helpers (W86). Tokens per unit can be counted after the fact (W89).
- Cannot: the tier hook sees only helper and session starts (W85), so no per-file owner, claim or version check
  exists for harness builds; the modes table, merge script and Write/Edit branch are unbuilt (W88). The Edit tool,
  shell writes and hook timeouts were never tested (W86). Nothing records what a session read; a read through a
  shell would stay invisible even with a hook on the read tool (W97, hypothesis), as reads outside the database are
  to the engine (W07).

### (d) The architecture that replaces the two-way switch

Section 4. How reached: each part takes an engine mechanism whose quoted condition our case meets or can be made to
meet, ranked by the size of its measured gain in its source and by whether that gain depends on the condition our
case breaks (short, cheap-to-redo units). The two-way switch survives as the last rungs (one owner of a pair or of a
hot file).

## 4. The architecture proposed for our case, ranked by expected gain

The ratio behind every part (W90, hypothesis, computed): a unit's chance to meet another on one file is about
(N − 1) k²/F while small. From 2 to 16 writers it grows up to 15-fold; holding it needs F/k² 15 times larger.
At file grain F = 1 and every pair conflicts (W91). Uniform access is assumed, as in the grain studies (W16, W18);
hot places break it (W15, W24), so p is measured per region, never computed from F alone.

Measurements named (none is guessed here; "count" needs no run, "run" needs the owner's word under rule 3):
- M1, count: k per unit and F per file, and how many units touch each region, from the change lists and diffs of past units.
- M2, count: tokens of a redone unit and of the part since a checkpoint, from transcripts (W89; the rule's measurement 6).
- M3, run: clock time a unit waits for an owner (the rule's measurement 2).
- M4, run: conflicts of session edits on our own neighbouring lines (the rule's measurement 5).
- M5, run: share of clean merges of two session units that fail the check.
- M6, count: share of units whose change list crosses two owners.
- M7, run: does a PreToolUse refusal stop the Edit tool, and can it check a version (W86).

### Part 1. Reshape shared places so writes commute or land at integration (largest expected gain)

- What: each registry or list gets one entry per unit, applied at landing; a number that must be "the next free one"
  (a migration number, an id) is chosen at landing by one allocator, never by the writer; an ordered sequence becomes
  one step per unit (r57-0401's skeleton); units start in dependency order.
- Mark: mechanism proven in engines (W24, W40, W42, W43); our count measured here (W83: 3 to 8 at once with
  statement-level split and 0b first); a dependency-ordered plan proven with LLMs on greenfield tasks only (W66);
  for our edits a hypothesis. A writer-chosen name that must be unique does not commute (W43): a duplicate check at landing.
- 2 against 16 writers: under very high contention every engine design falls to the same low throughput (W27, W28);
  a place every unit touches serializes all writers whatever the method, and optimism adds up to N − 1 redone units
  per landing (W92, hypothesis); reshaping removes that term, so its value grows with N.
- Small file: the whole file is often the hot place, and reshaping is the only part that helps (W92). Very large
  file: the hot places are a few regions (registry, imports, exports); reshaping them leaves the rest to part 2.
- Numbers from: M1 (which regions every unit touches), M5 (whether entries applied at landing pass the check).

### Part 2. Claims below the file, with a mark on the file

- What: a unit claims the regions it will change and marks the file (W10, W11); an insert claims only its position in
  a gap (W12); a delete also claims its neighbour (W15); claims named in the plan are taken in one fixed order and
  cannot deadlock, while places found during work are not waited for but checked at landing (W93, hypothesis); a
  unit whose claims cover a set share of a file is promoted to the file and hands back when another waits (W96, hypothesis).
- Mark: mechanism proven (W10-W12, W15, W19, W20); in production, Figma resolves at the grain of one property of
  one object (W77, self-reported); our count measured here (3 to 7 units at once, W83); behaviour for sessions a
  hypothesis; enforcement depends on M7 (W86, W88).
- 2 against 16 writers: the grain enough for 2 can be 15 times too coarse for 16 (W90).
- Small file (F near k): no gain over a file claim (W90, W91). Very large file (F far above (N − 1) k²): all N proceed,
  where a file claim would stop all of them (W20).
- Numbers from: M1 (k, F, the share for promotion), M7.

### Part 3. Version-checked landing, a read check, and a notice

- What: a change lands only on the version of each region it read, and only if what the unit read is unchanged
  (W01, W62); a refused unit gets the current text and a diff and a short reservation (W62); a running unit is told as
  soon as a file it read changes, so it re-reads before landing instead of being refused at the end (W69, W70).
- Mark: proven on model sessions at file grain, 4 writers, one preprint (W62); checking overlap of what was read and
  written commits more than checking "the file changed" (W29); Figma checks an invariant across items at each write
  (W78, self-reported); region grain and the notice are hypotheses; reads outside the read tool stay unseen (W97).
- 2 against 16 writers: refusals grow as in W90; STORM's overlap rose from 21.7 to 35.1 % from 4 to 8 writers (W64).
- Small file: refusals frequent, part 4 takes over. Very large file: file grain refuses edits to different
  functions (W63), so region grain is needed.
- Numbers from: M2 (tokens per refusal), M4, M7.

### Part 4. Wait for a known hot pair instead of redoing

- What: where part 1 cannot remove a collision, the second unit waits for the first's landing; per pair, wait when
  chance of conflict × tokens of a redo > cost of the wait, in what is scarce now (rule lines 131-135); a unit refused
  once gets priority on its claims next time (W68).
- Mark: direction proven: waiting beats aborting as units lengthen (W31), and optimism wins only where waste can be
  tolerated (W34); aborts are acceptable only when cheap (W30); the product form and its numbers are hypotheses.
- 2 against 16 writers: the wait grows with the queue on the hot place, the redo with N − 1 per landing (W92).
- Small file: waiting usually wins (W92). Very large file: rarely used. In one large system, defects rose with the
  degree of parallel change on a file (W76), so the most-edited places are where this part pays most (hypothesis).
- Numbers from: M2 (redo tokens), M3 (wait), M1 and M4 (chance).

### Part 5. Recovery steps smaller than the unit

- What: a unit commits in its own copy at checkpoints; a refusal or failed check returns it to the last checkpoint,
  not to the start; a finished file whose sets do not depend on the rest lands early and frees its claims (W73).
- Mark: hypothesis (W94); the designs exist in the literature (W72-W74) and none was ever measured (W71); an engine
  in use tells jobs longer than its 5-second limit to split into smaller transactions (W33).
- Behaviour: cuts the cost of every redo to the part since the last checkpoint, for any N and any file size.
- Numbers from: M2 (tokens since a checkpoint against the whole unit).

### Part 6. Every landing through the serial check, in one order, with undo

- What: as the rule already says (line 136) and as a very large mainline does it (W80): one landing order, the
  check after each, automatic undo of a change that breaks.
- Mark: proven as practice (self-reported, W80); it is the only guard against the wrong clean merge (W54-W56, W75).
  How many landings the check can carry is lane `c1`'s answer.
- Behaviour: landings grow with N; the check's time per landing is the cap (lane `c1`); one run took 596 s here
  (W84). Long-lived branches merged in bulk broke Microsoft's merge tools first (W81, self-reported).
- Numbers from: M5.

### Part 7. Structured merge, last

- What: line merge first, tree merge only where it conflicts (W50), delete-versus-edit always flagged (W51).
- Mark: proven for human merges (W48-W50); a hypothesis for session edits.
- Behaviour: seconds per merge whatever N (W50); likely worth most in large files with many members, where reordered
  members make line conflicts (hypothesis).
- Numbers from: the share of our conflicts that are reorders or renames (M4).

Dropped, with the reason: deterministic order (needs the sets, W36, W37); transforms of operations without a central
order (W57); a CRDT of a whole file (W61); escrow on text (numbers only, W44; it may fit the token allowance in lane
`a1`); one owner per file as the default (one escalation stops all, W20; ownership loses once units cross, W26;
M6 says where it still fits).

## 5. Proposed corrections for the fold (records to propose, not written here)

- r57-0304 says transforms of operations are out for more than two writers. Narrow it: the five algorithms checked
  fail without a central order (W57); Google runs transforms through one server (W79, self-reported, no figures).
- r57-0308 (summary) can become quoted from the papers, and must split its numbers: 19.8 and 41.7 % are pair rates
  (W58), 27.67 % is pull requests against their base (W60), and the 21.1 % speed-up is the best task while the mean was
  13.1 % slower (W61).
- r57-0406 (the switch): proposed to become the last rungs of the ladder in section 4 (hypothesis).
- Lane wording, sub-topic 7: Discord's migration was driven by read hot spots, not write contention (W82).
- The rule's Step 2 row "Shared files | Per file: own copies, or one owner" (line 116) and answer 5 (lines 34-36) follow r57-0406.

## 6. What was not found and what was not opened

Searched (per the collect files): library look-ups for every search word of `R:lane-writers.md` and for `Adya`,
`phantom`, `Lomet`, `Graefe`, `Doppel`, `Kallman`, `saga`, `Barghouti`, `Perry`, `Korth`, `Spork`, `IntelliMerge`,
`Figma`, `Discord`, `Piper`, `monorepo`; web searches by paper title only.

Not found:
- A measurement of any mechanism with units of minutes, or with reruns that differ (W95).
- A conflict rate at which locking and optimistic control cross (`R:w1-collect-engines.md:296`).
- A measured gain for sagas, split transactions, check-out or notification (W71).
- A study of AI agents in one repository measuring speed against the number of writers with the merge and the test
  run counted (`R:w1-collect-merge.md:264`); a semantic-conflict rate between model sessions beyond a 60-run inspection (W61).
- Grain measured on a real engine on current hardware (`R:w1-collect-grain.md:137`).
- A conflict or rollback rate for Google's trunk; how often Figma or Google Docs drops an edit; a primary Meta text on
  server-side rebase (only a third party's notes, `summary`, no claim rests on it); a migration that its company
  says was forced by write contention (`R:w1-collect-production.md:108-113`).

Not opened, needs the owner's sign-in: Adya 1999 (MIT DSpace rate limit); Cahill, Röhm, Fekete 2008 and 2009 (ACM,
Sydney, CORE); Fekete and others 2005 (ACM; the Minnesota copy fails the certificate check); IntelliMerge 2019 (ACM;
abstract only); Korth, Kim, Bancilhon 1988 (ScienceDirect). Not opened otherwise: Srinivasan and Carey 1991 (the
1993 journal version was read); Pradel 1986, Yeh 1987, Weihl 1988; BOHM and PWV; Spanner, CockroachDB, LMDB,
RocksDB (skipped as changing no answer).

Read with a caveat: Mohan 1990 came from a copy of unrecorded origin, so no claim rests on it alone (W12 rests on
InnoDB); sagas from a poor OCR course copy (W74); Ries 1977 digits are OCR (W16); Srinivasan's Figure 23 and Tanabe's
plots were not read as numbers (W18, W31); Kung, Agrawal, Larson, Silo, Yu, Harding, Bailis, Apel and Cavalcanti
come from the earlier round's quotations, whose paper texts are not in this repository; Uber's merge queue is lane `c1`'s.
