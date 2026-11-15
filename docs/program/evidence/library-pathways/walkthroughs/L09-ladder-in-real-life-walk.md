# L09 Ladder in real life: walk

Family: a cheaper agent was wrong and a stronger one caught it, or nobody did.
Short paths: CLINIC = C:/Bilal_Migration/User/Downloads/20_PROJECTS/24_Clinic_Workshop ; EV = C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks ; KS = .claude/worktrees/knowledge-store-research-9c609c/docs/program/KNOWLEDGE-STORE-DESIGN-2026-11.md (line numbers L…). Transcript folders are under C:/Users/User/.claude/projects/.

Scripts used (read-only, node): scratchpad/sim/l09/*.cjs (writes, refusals, models, window, grepctx).

## 0. What the sources changed in the case sheet

Read before the walks. Three details in the case sheet are wrong or incomplete.

1. **Case 1 had no cheaper agent.** The slice sessions were Opus. Transcript model counts: S02 ecstatic-snyder 16a65b98 (787 Opus calls), S04 quirky-vaughan a9b52f2e (835 Opus), S08 kind-grothendieck 1c7937a3 (857 Opus), S10 nervous-newton eb18b462 (979 Opus). The plan says so too: slice lead "Opus, high, for slices that touch stock posting, money ..." (CLINIC/docs/agentic-coding/orchestration.md:10). The root 7f348b2c was Fable (2,454 fable-5-1 and 198 fable-5-2 calls). So the rungs were Opus author, Opus reviewer, Fable root.
2. **Case 1: the root's wrong premise ran the other way.** The slice named the ISS counter. G04-02 (strong reviewer, adopted by the root) said "decided by the ledger's scope lock, not the ISS counter the test names" (task.md:282). Round 2 Y2 reversed it: the counter row "serializes two postings; the root's own round-1 premise was wrong the same way" (task.md:303). Round 3 proved the counter by removing locks one at a time (CLINIC/docs/tasks/s04-issuing/evidence/check-summary.md:75). The slice's naming was right but unproven. The strong rung's correction was wrong.
3. **Case 1 later moment GD-05 is a success, not a recurrence.** "Removing it leaves every stock and race test passing ... it is defence in depth, unreachable today, and D05-32 says so. Kept." (opening-cutoff-guards/task.md:75). That is the lesson applied honestly.
4. **Case 3 was a real refusal, not an unchecked claim.** The two Opus analysts' Writes in session cb58bdc7 got this tool result: `<tool_use_error>Subagents should return findings as text, not write report files. Include this content in your final response instead.</tool_use_error>` (subagents/agent-a6a48ae57b11d3539.jsonl at 2026-11-01T16:32:58Z, file `analysis-ai-ux.md`; agent-a8f87cc1755bb407b.jsonl at 16:34:29Z, `analysis-design.md`). In the same session Sonnet extractors wrote `plan-mapping.md`, `part-b.md`, `ledger-notebook.md` and scripts in the same folder with no error. The 11 Nov probe was a Haiku general-purpose agent writing a one-line `subagent-write-probe.txt` (e24f17dc, 00:33:24Z workflow source). On 12 Nov, in the same session that wrote "They can", eight workflow subagents (4 Opus, 4 Sonnet) had `report.md` writes refused with the same message between 06:56:45Z and 07:43:46Z, while their `.js` and `.py` writes succeeded (e24f17dc/subagents/workflows/wf_548351eb-ab1 and wf_5a9f904a-4b0). HARNESS-BOTTLENECKS-2026-11.md was last saved 2026-11-12 08:07Z and still says "B16: subagents cannot write files | They can." (line 23). The cost figure in the sheet (82.4 % of calls, October) predates the 1 Nov rule.
5. **Case 4 critic and refuter were the same tier.** Both are `model: 'opus', effort: 'high'` (EV/clinic-harness-sweep-wf_1f8b665a-b60.workflow.js.txt:91; EV/bottleneck-map-wf_00659e96-f2a.workflow.js.txt:103). The compile session e24f17dc was Fable. The truth was also in a model's own words: the clinic root's 9 Nov recap, "That check waited 34 minutes for the single lock slot behind the resumed sessions' checks." (7f348b2c, 2026-11-09T12:52:45Z).
6. **Case 2 root was Fable**, and the defect was copied. The fix commit is co-authored "Claude Fable 5.2" (6a2fd45). Its diff changes the pay follow-up's test and "The two new reversal tests get the same change": the real-data session had written two new tests with the same `finally: MigrationExecutor(migrator).migrate([(APP, AFTER)])`. The session's own check had passed: "record the full check (2570 passed)" (6eaed2a).

---

## Case L09-1. Race tests that passed with their named lock removed

**What happened (verified).** S02 gate, 3 Nov: G02-02 (P1) "Two race tests ... serialize on the document-number counter row, not on the lock they name, and pass with those locks removed" (task.md:149). Fixed with experiments E1-E8; round 2 V2 says the last-unit race "still passes without the explicit scope locks (the slice's own E1 says so)", recorded not fixed (task.md:170). From S04 on, the root's brief to every slice carried the lesson:
- S04, 2026-11-04T04:38Z: "name the lock each race depends on and record a lock-removal experiment for each, as S02 and S03 did" (a9b52f2e).
- S08, 2026-11-04T10:33Z: "each naming the lock it depends on with a lock-removal experiment" (1c7937a3).
- S10, 2026-11-05T11:05Z: "with the S02 harness and lock-removal experiments" (eb18b462).
The class still came back each time, in a new form: S04's own Opus review, "The lock-removal experiments were unsound. 'Either lock alone suffices' was an artifact of `hold_then_race`" (s04-issuing/evidence/review-round-1.md:11); S04 gate G04-02 and Y2 (above); G06-08 "the evidence overstates the deferred check"; G08-05 "E6 was an earlier code variant, not a removal of the final lock" (task.md:411); G10-18 docstring credits the wrong lock; G10-23 "no single S10 lock is load-bearing" (task.md:527); G05-21 "Not verified by anyone". The rule reached the conventions only on 9 Nov: "a test that claims a particular lock also asserts on the recorded waits" (CLINIC/docs/application/conventions.md:21, commit 51c8cf6).

**The entry, as the S02 solver could have written it on 3 Nov (round 3):**
> race-test-serializes-elsewhere. Clinic posting kernel, Postgres, two-connection races (committed_db, hold_then_race). Problem: a race test names a lock but passes with that lock removed (G02-02: last-unit and two-payment races). Cause: both postings call open_document, which updates the per-type document-number counter row before any stock or scope lock, so the counter serializes them. Unique indexes and deferred FK checks can do the same (G02-07, G02-08). Rule: a race test proves a lock only if it fails with that lock removed. Method: remove one named lock at a time and record which assertion fails (E1-E8). Open: E1 shows the last-unit race still passes without the scope locks (V2, recorded).

**The later moment.** 4 Nov, S04 root gate. The Fable root has the S04 branch, its check (1189 tests), and briefs two read-only Opus reviewers to refute. The reviewers read the slice's final-unit race, which names the ISS counter. One writes G04-02: the scope lock decides. The root adopts it as the round-1 premise. Second later moment: S08 (Opus slice, same day) runs its correction-versus-reversal experiments with the lesson in its brief; its E6 runs on an earlier code variant.

**What a lookup would return.** Keyed on "race test, final unit, counter, lock": the S02 entry as a lead. For S04 it is the right cause (counter row). For S08 (keyed on "correction, reversal, FOR KEY SHARE"), only "race" and "lock" overlap; the S02 entry surfaces with the wrong cause.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | strains | The S04 slice (Opus) holds the root's brief, which already carries the lesson. The task is tests to write, not a problem. The session had compacted at least once (transcript opens "continued from a previous conversation"). |
| 2 Trigger | breaks | Nothing fails: the race tests pass with or without their lock. A cheap model gets no signal, and the ladder never starts. In reality the root pushed the lesson into every brief from S04 on, outside the design's fetch path. |
| 3 Query | strains | Task words ("race test, final unit, ISS counter, lock") reach the S02 entry. For S08 the words ("correction, reversal, FOR KEY SHARE") share only "race" and "lock" with it. |
| 4 Match | breaks | Later failures share the claim, not the cause: counter row (S02, S04), helper holding after deferred checks (S04 review), service locks removed while a trigger locks (G06-08), earlier code variant (G08-05), no single lock load-bearing (G10-23). One entry surfaces for all; it is right for one. |
| 5 Delivery | not_specified | The design does not say which window gets the entry. The S04 error was made by the read-only reviewers and the Fable root (G04-02), not by the slice. Slice windows compacted; whether a task-start entry survives is not recorded. |
| 6 Use | breaks | The lesson was in every brief from S04 on and was followed in form: experiments were run. They held after deferred checks, ran on an earlier variant (E6), or removed the wrong layer. The method was used; its preconditions were not in it. |
| 7 Check | strains | What decided was a reviewer reading ("ran no tests"), then model-run experiments, at least four later shown misleading (A2-06). KS inject-control (L277) re-applies the fail-side mutant for a stored entry's own test; it does not judge the new race tests a slice writes. |
| 8 Ladder | breaks | Noticed by Opus reviewers reading; handed up as finding tables. Going up did not settle it: the Fable root's round-1 premise was wrong (task.md:303); 9 of 11 gates took three rounds. It settled when locks were removed one at a time with pause_then_race (check-summary.md:75). |
| 9 Capture | breaks | "Solved" moved twice: round 1 (strong reviewer and root) said scope lock, round 2 said counter, round 3 proved counter. A capture at the strong model's verdict stores the wrong lock. KS records before the PR is ready (L452), which here is before any gate round. |
| 10 Afterlife | breaks | Which lock decides depends on the whole lock set: without the counter the item lock decides; without both a unique rule does (check-summary.md:75). Any added guard changes the answer without touching the test. KS: race footprints are identical in good and bad runs (L358). |

**What it would have saved.** The S02 entry, fetched by the S04 round-1 reviewer or by the root, says the counter row serializes same-type postings before any stock lock. That stops G04-02's wrong premise and the Y2 finding. One finding's round trip, not the whole round 2 (Y1, Y3 to Y5 remained). It saves nothing for S06, S08, S10 or S05, whose causes differ. What did carry forward was code: `pause_then_race` and `blocked_by_a_lock` became test helpers, and the cutoff-guard tests RS-2 and RS-5 "were each run with their guard removed and failed" (opening-cutoff-guards/evidence/review-opus-round3.md:39).

---

## Case L09-2. Real-data switch merged with no final read; the check found the failure

**What happened (verified).** The real-data session (Opus high, unruffled-elgamal f59bdcd4, 402 Opus calls) recorded "the full check (2570 passed)" (6eaed2a). Its two Opus refute-reviews found no P1. The Fable root "did not run a further review (USER-24)" (task.md:821). The root's check on the merged tree failed 2 of 2570 at 2026-11-11T00:33:14Z: `FAILED src/clinic/people/tests/test_real_data_staff.py::test_on_a_real_record_is_accepted_and_the_privacy_rules_hold`, with `psycopg.errors.CheckViolation: new row for relation "clinic_people_employee" violates check constraint "people_employee_synthetic_only"` (7f348b2c). The root grepped migrate calls, read three tests and edited all three by 00:34:12Z. Rerun passed 7/7, 2570 (00:46:36Z). It wrote the rule to the conventions at 00:48:04Z: "A test that runs an app's migrations backwards restores the app's latest migration afterwards (`executor.loader.graph.leaf_nodes(app)`), never a named one" (f6b5c6c). The root compacted at 00:49:45Z.

**The entry, as the Fable root could have written it on 11 Nov:**
> migration-reversal-test-leaves-db-short. Clinic, Django, pytest-xdist 6 workers, one test database per worker. Symptom: full check on merged main fails 2 of 2570 in people/tests/test_real_data_staff.py with CheckViolation "people_employee_synthetic_only"; the branch's own run passed. Cause: people/tests/test_followup_guards.py migrates back to 0013 and in its finally forward only to (APP, AFTER)=0014; once 0015 exists the worker's database stays at 0014 and later tests in that worker see the old check constraint. Fix: in the finally, migrate to executor.loader.graph.leaf_nodes(APP); same in the two new reversal tests. Check: full check on the merged tree, 7/7, 2570 (6a2fd45).

**The later moments.** (a) Before the solve, 10 Nov: the Opus session writing two reversal tests for its new migrations. In its window: its design, its code, and the pay follow-up's test (8dbde8b, 6 Nov), which it copied: same name `test_the_migration_reverses_and_applies_again`, same `finally`. (b) After the solve: any session adding a migration with a reversal test. (c) EV/refute.txt:30 merges this failure with S02 V1 into "expect one fix-up round for order-dependent tests when the worker count changes" (6 native to 12 container workers).

**What a lookup would return.** At (a), keyed on "migration reverses and applies again": the pay follow-up's test as a stored, gated solution, with its latent defect. At the failure, keyed on the error text: entries about the synthetic-only guard of the feature just built, not this one. At (b), only an action handle on MigrationExecutor reversals matches.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | strains | The Opus session's window held its design, its code and the pay follow-up's test it copied. The defect was unknown to everyone; there was nothing right to fetch. A stored "how to test a reversal" from 6 Nov would be that same test. |
| 2 Trigger | breaks | No trigger: the session's own full check passed 2570 (6eaed2a) and its two Opus reviews found no P1. The failure appeared only on the merged tree, in another test order. |
| 3 Query | breaks | When it failed, the error text named a business rule of the feature just built: "violates check constraint people_employee_synthetic_only". A query in those words points at the real-data guard, not at a migration test in another app's file. |
| 4 Match | breaks | Before 11 Nov the nearest stored items are the pay follow-up's test (latent defect) and S02 V1 (rows left behind, fixed by row snapshots, task.md:174). Same class, different mechanism; S02's fix does not cover schema state. |
| 5 Delivery | works | The failure arrived in the Fable root's main window as test-runner output and stayed there through the fix. The root compacted about 100 s after writing the lesson down. |
| 6 Use | breaks | Reuse multiplied the defect: the session copied the template's finally into two new tests. The fix commit says "The two new reversal tests get the same change" (6a2fd45). |
| 7 Check | breaks | "Passes the full check" was not a stable fact: 2570 passed on the branch, 2 of 2570 failed on the merged tree, same suite, other order. The check that judges equality certified a wrong solution, and certified the template on 6 Nov. |
| 8 Ladder | works | A red deterministic check, not a model, noticed it. The handoff was tool output: failing ids and traceback. Fable found and fixed it in about a minute (00:33:14 to 00:34:12Z, three edits). |
| 9 Capture | strains | The root wrote the rule into the conventions, keyed on the action, with the reason, within two minutes (f6b5c6c). Under KS's write rule (escalation, 2+ failed approaches, or a burned build, L452) this one-attempt top-tier fix is routine and is not recorded. |
| 10 Afterlife | strains | The entry covers MigrationExecutor reversals; a reversal written another way, or failing on another app's constraint, shares no words. refute.txt's merged prediction for 12 workers is untested; 12-worker container runs had passed 2,370 of 2,370 (linux-test-runner/task.md:215-217). |

**What it would have saved.** Nothing at the time: no entry could exist before the first failure, and the fix cost the top tier about a minute and three edits. A lookup plus verify would cost about as much as the fix. The capture is what the project's own conventions file already did.

---

## Case L09-3. "Subagents cannot write files": a real refusal, widened, then wrongly refuted

**What happened (verified).** See section 0 item 4. Timeline:
- 1 Nov 16:32-16:34Z: two Opus analysts' Writes of `analysis-*.md` refused with the harness message. Sonnet extractors' Writes in the same folder succeeded (15:29-17:00Z).
- 1 Nov 16:52Z: the Fable root saves memory `subagents-return-text-not-files.md`: description "subagents cannot write report files (the harness refuses the Write)"; body quotes the analysts and adds "Sonnet extractors did manage to write files earlier in the same session, so the refusal may depend on the agent type or output size".
- 2 Nov: the rule enters CLINIC/docs/agentic-coding/orchestration.md:14: "Subagents reply with their full result as text; file writes from subagents are refused here." (5816c70). Still there today.
- 11 Nov 00:33Z: the harness-bottlenecks session (Fable, e24f17dc) runs a Haiku probe that writes a one-line `.txt`; it succeeds. The compile writes "B16 is misdescribed. Subagents can write; the rule came from two Opus analysts' unchecked self-report" (EV/map-full.txt:630) and "Read-only agent types, a tools list without Write, or an unanswered prompt in default mode cause the refusal" (HARNESS-BOTTLENECKS-2026-11.md:23).
- 12 Nov 06:56-07:43Z: eight subagents in that session hit the same refusal on `report.md`; each returned its result as structured output. Nobody recorded it. The compile was saved again at 08:07Z, unchanged on B16.

**The entry, as the root wrote it on 1 Nov (its memory note):**
> subagents-return-text-not-files. Clinic desktop session, 1 Nov. Subagents launched with the Agent tool could not write their reports to the scratchpad: both Opus analysts reported "the harness blocks subagents from writing report files" and returned the full text in their reply. Sonnet extractors wrote files earlier in the same session, so the refusal may depend on agent type or output size. Use: brief subagents to return the complete result as their final reply, then save it yourself.
(The exact tool error, "Subagents should return findings as text, not write report files", sat in the analysts' transcripts and was not copied.)

**The later moment.** 11 Nov. The Fable root of the harness-bottlenecks work has B16 "subagents cannot write files" as an explicit item. It reads the memory note (map-full.txt:588: "(2026-11-01, read)"). It runs a probe and compiles a verdict.

**What a lookup would return.** Keyed on "subagent write file refused": the 1 Nov entry, the same problem, with "report files" in it as a phrase.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | The Fable root had B16 as an explicit question and the memory note in hand. |
| 2 Trigger | works | The task was the question, so a lookup had a clear trigger. |
| 3 Query | works | "Subagent write file refused" matches the entry's words. |
| 4 Match | strains | Same problem, but the entry carried a paraphrase, not the tool error, and its own hedge pointed at the wrong variables (agent type, output size). The deciding detail, "report files", was present only as a phrase. |
| 5 Delivery | works | The entry sat in the root's main window and stayed through the compile. |
| 6 Use | breaks | The session overrode a right entry with a weaker test: a Haiku agent writing a one-line .txt. It then wrote that the rule came from an "unchecked self-report". The correction tested a different condition from the claim. |
| 7 Check | breaks | The probe answered "can a subagent write a file", not "can a subagent write a report file". Nothing compared the two conditions. The refusal text that decides it was in the 1 Nov subagent transcripts, never read. |
| 8 Ladder | breaks | The ladder ran downward: a Haiku probe overruled two Opus observations, and the Fable root sided with the probe. The original observers were right. Nothing in the ladder ranks a tool's own error text above a model's conclusion. |
| 9 Capture | breaks | Each write widened or flipped the entry: "report files" (memory) became "file writes from subagents are refused" (orchestration.md:14), then "They can", with wrong causes (HARNESS-BOTTLENECKS:23). Two contradictory entries, neither naming the condition. |
| 10 Afterlife | breaks | On 12 Nov eight subagents hit the refusal; they adapted silently and the root never saw it. The compile keeps "They can" and a remedy (full reports into a folder, §3.4 line 159) that the refusal blocks. KS: untracked dependencies are not detectable (L358). |

**What it would have saved.** The 1 Nov note, widened as it was, kept clinic briefs on "reply with text" for eleven days. No report was lost to a refused write. On 1 Nov each refused analyst had paid one wasted Write turn. The fact also held across projects: the same refusal appeared in the clinic on 1 Nov and in this repository's sessions on 12 Nov.

---

## Case L09-4. A critic wrongly refuted the owner's 34-minute wait

**What happened (verified).** The completeness critic (Opus high) wrote: "The owner's B07 figure of waits 'up to 34 minutes' does not appear in any docs/tasks/*/task.md ... The largest recorded waits are 742 s ... and 726 s" (EV/sweep-critic.txt:9). The map lanes (Opus high) wrote "The list's figure is wrong: recorded waits run 3-742 s ... '34 minutes' appears in no file" (EV/map-full.txt:255). Verdict 1's stop rule reads "a slot wait over 742 s, the largest recorded" (EV/verdicts.txt:30). The refuter (Opus high, "default verdict REFUTED") found the check runner's output in root transcript 7f348b2c: "machine-wide test lock held for the test step (waited 2030 s)" at 2026-11-09T12:52:03Z, and the root's recap 42 s later: "That check waited 34 minutes" (EV/refute.txt:33-35). It also found the cause: "Releasing all parked sessions at once after the 6-9 Nov outage produced that 2030 s wait" (refute.txt:103-104). The final compile says "The 34-minute wait is real: 2,030 s on 9 November" (HARNESS-BOTTLENECKS:22). verdicts.txt:30 still says 742 s.

**The entry, as the critic could have written it on 11 Nov:**
> check-wait-max. Clinic check runner, single slot lock. Claim checked: the owner says check waits reach 34 minutes (B07). Searched docs/tasks/*/task.md for "waited/wait N s" and "34 min". Largest recorded waits: 742 s (linux-test-runner/task.md:88, run c9) and 726 s (faster-check). "34 minutes" not found. Conclusion: the owner's figure is not supported by the records; the largest recorded wait is 742 s.

**The later moment.** The same workflow, minutes later. Four Opus map lanes and two verdict writers receive the critic's output in their input. One lane classifies B07; a verdict writer sets a trial's stop rule.

**What a lookup would return.** Keyed on "check wait", "slot wait", "34 minutes": the critic's negative, an exact match.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | Each map lane held the sweep cards and the critic's output; its task was to classify B07. |
| 2 Trigger | not_specified | The lanes did not decide to look anything up; the entry was pushed into their input. The design does not say whether a negative result is pushed or fetched, or by whom. |
| 3 Query | works | "34 minutes" and "slot wait" hit the critic's entry exactly. |
| 4 Match | breaks | Exact match, wrong answer. The entry is a "not found" whose search scope (task.md files) excluded the root transcript, where the check's own output said "waited 2030 s" and the root's recap said "34 minutes". |
| 5 Delivery | strains | One entry reached four parallel map lanes and the verdict writers at once, before anything checked it. |
| 6 Use | breaks | "Not in task.md" became "in no file", then "the owner's figure is wrong", then a stop rule on 742 s. The person who was right was overruled by a stored negative. |
| 7 Check | breaks | Nothing checks a negative. KS stores negatives with their footprint (L502); here that is the task.md files, which stayed valid. Footprint validity cannot show that the search missed where the evidence lived. |
| 8 Ladder | strains | Caught by a same-tier Opus refuter with a refute-by-default brief and a wider search, not by a higher tier. The handoff carried the critic's search scope, and that is what exposed the gap. |
| 9 Capture | breaks | The correction reached refute.txt and the compile's B07 row; verdicts.txt:30 still carries 742 s. The 9 Nov observation itself was a measurement, never a solved problem, so no capture rule would have stored it then. |
| 10 Afterlife | strains | The refuter's side find (all parked sessions resumed at once) entered the compile as a "staggered resume list" (HARNESS-BOTTLENECKS:271). The 742 s copy survives in the evidence file a trial would run from. |

**What it would have saved.** The critic's output recorded its search scope; that is what let the refuter see the gap. KS's rule that negatives carry their validity condition (L502) is the same idea. A captured correction keyed on "check wait" would keep verdict 1's stop rule from firing falsely on waits between 742 and 2030 s, and would carry the herd cause to every resume remedy.

---

## Breaks (most clearly shown first)

1. **"Equal to the strong model" copies the strong model's errors** (step 7; new; 4 cases). In every case a top-tier model made or endorsed the error: Opus slice authors and the Fable root (case 1), an Opus-high session with two Opus reviews (case 2), the Fable root widening the rule and a Fable compile over-correcting it (case 3), an Opus-high critic and map lanes (case 4).
2. **Role, access and execution caught errors; tier did not** (step 8; new; 4 cases). Same-tier reviewer by role (case 1), the test runner (case 2), a same-tier refuter reading a transcript (case 4), a tool's own error text (case 3). Going up made it worse twice: the Fable root's S04 premise, and the Fable compile siding with a Haiku probe.
3. **Nothing fails, so nothing triggers** (step 2; known 1, 23; 3 cases). Race tests pass with or without their lock; the session's full check passed 2570; the critic returned a confident "not found".
4. **A correction is an entry too, tested under a different condition** (steps 6-7; new; 3 cases). G04-02 "corrected" the slice's right lock to a wrong one; a one-line .txt probe "refuted" a report-file refusal; a task.md search "refuted" the owner. Each correction looked stronger than the claim it overrode.
5. **Same claim, different cause; the delivered lesson is followed in form** (steps 4, 6; known 3, 7, 22; 2 cases). Every slice from S04 had the lesson in its brief and ran experiments; each failed a new way. S02 V1 (rows) and the reversal test (schema) are one class with different mechanisms.
6. **A passing check certifies a latent defect, and reuse multiplies it** (steps 6-7; new; 2 cases). The pay follow-up's reversal test passed its gate on 6 Nov, became the template, was copied twice, and failed only once migration 0015 existed. Race tests pass whichever guard happens to decide.
7. **The deciding detail is dropped when the entry is written or copied** (step 9; known 29, 5; 2 cases). "Report files" became "file writes"; "not in docs/tasks/*/task.md" became "in no file".
8. **Copies of a refuted entry survive** (step 10; known 8, 35; 2 cases). verdicts.txt:30 keeps 742 s; orchestration.md:14 keeps the widened rule; the compile keeps "They can".
9. **The needed knowledge was an observation, not a solved problem** (step 9; new; 2 cases). "waited 2030 s" and the harness refusal were measured facts. The design stores solutions; KS's entry kinds are defect, trap, do_not_apply, open_defect, rule_without_case (L239).
10. **Contrary evidence stays inside subagent windows** (step 10; new; 1 case). Eight refusals on 12 Nov were met and absorbed by subagents; the root edited the compile later that day without them.
11. **A stored "not found" overrules the person who was right** (step 6; known 19; 1 case). "the owner's figure is wrong" (refute.txt:33) against the root's own "waited 34 minutes".
12. **The write rule keys on the solver's difficulty and skips the cheap model's mistake** (step 9; known 28; 1 case). Fable fixed case 2 in one attempt; under KS L452 that is routine and unrecorded, though an Opus session made the mistake.

## Did not break

- **Handoff by the failed model (known 25).** In case 2 the handoff was raw test output; in case 4 it carried the critic's search scope, which exposed the error. When the failure signal is a check or a stated scope, the handoff was clean.
- **Session dies before writing (known 30).** Case 2: the root wrote the conventions line at 00:48:04Z and compacted at 00:49:45Z. It landed, with 100 s to spare.
- **A rule in one project is a bug in another (known 34).** Case 3's fact held in both projects: the same refusal text in the clinic (1 Nov) and here (12 Nov).
- **Empty at the start (known 9).** Case 1: the lesson existed from 3 Nov and was in every brief from S04 on. Emptiness was not the limit; use was.
- **Hard problems pay every rung (known 24).** Case 2 paid one rung for about a minute; the cost was check reruns, not rungs.

## Works

- Case 2: a red check handed raw output to the top tier, which fixed it and wrote the rule with its reason within two minutes, keyed on the action. That is capture working as designed.
- Case 1: the S02 entry, fetched at the S04 gate, would have stopped the strong rung's wrong premise (G04-02, Y2): one finding's round trip saved.
- Case 1: the lesson carried in code (`pause_then_race`, `blocked_by_a_lock`) reached later slices more reliably than prose. The cutoff-guard tests were run with guards removed and failed, and GD-05 was recorded honestly.
- Case 3: the over-broad note still kept briefs on "reply with text" for eleven days; no report was lost to a refused write.
- Case 4: a negative that recorded its search scope was correctable. A captured correction would have kept a false stop rule from firing.
