# L09 Ladder in real life: four cases

Family: a cheaper or weaker agent was wrong, a stronger one caught it, or nobody did.
Short paths: CLINIC = C:/Bilal_Migration/User/Downloads/20_PROJECTS/24_Clinic_Workshop ; EV = C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks

Caveat on models: the clinic records name "Opus" for the reviewers and for the real-data session. They do not name the model of most slice sessions, so "who was cheaper" is often not recorded. Where it is not recorded, I say so.

## Case 1. Race tests that passed with their lock removed (clinic build, Nov 2026)

What happened: Slice sessions wrote race tests and records that named a lock. Two Opus refute-reviewers (read-only, ran nothing) read them and found the tests did not depend on the named lock. The root then demanded lock-removal experiments. Those experiments were model-run and four were later found misleading. The root's own round-1 premise was wrong in the same way (S04). The ladder here is: slice session, then Opus reviewer by reading, then root. Nobody re-ran the claims independently except where the root re-ran the check.

When: S02 about late Oct; S04 gate 4 Nov; S08 and S10 later; counted in the compile 2026-11-11.

Who: slice sessions (model not recorded); Opus refute-reviewers; root (the orchestrating session).

Evidence (exact):
- G02-02 (P1): "Two race tests (last unit; two payments) serialize on the document-number counter row, not on the lock they name, and pass with those locks removed" (CLINIC/docs/tasks/clinic-build/task.md:149).
- G04-02 (P1, test honesty): "The final-unit race is decided by the ledger's scope lock, not the ISS counter the test names" (task.md:282). Y2 in round 2: "the final-unit race was still attributed to the stock scope while the ISS counter row ... serializes two postings; the root's own round-1 premise was wrong the same way" (task.md:303).
- G08-05: "E6 was an earlier code variant, not a removal of the final lock" (task.md:411).
- Reviewer limit: "It was read-only: it ran no tests, scripts or database commands" (CLINIC/docs/tasks/opening-cutoff-guards/evidence/review-opus-round2.md:3).
- Cost: 9 of 11 slice gates S00-S10 took three rounds or ended with a root-read round 3 (EV/sweep-cards.txt card A2-01). A fix produced a new P1/P2 in round 2 or later on 8 of about 20 gated branches (EV/verdicts.txt).

What was handed up: numbered finding tables (G<slice>-NN, severity, disposition) and the root's brief "to refute" the slice's invariant claims. The stronger model got the claims plus the files, not a run.

Sources: EV/sweep-cards.txt cards A2-01, A2-05, A2-06; EV/map-full.txt problem B12; CLINIC/docs/tasks/clinic-build/task.md lines above.

Later moment (the same knowledge was needed again): the same defect came back in later slices after the fix was known: G08-05 (E6), G10-23 "lock-removal experiments show that no single S10 lock is load-bearing" (task.md:527), G05-21 "Not verified by anyone: the lock-removal experiments actually fail without their lock" (EV/sweep-cards.txt A2-06). The cutoff-guard slice, 6 Nov, again: removing GD-05's lock_fresh check "leaves every stock and race test passing" (CLINIC/docs/tasks/opening-cutoff-guards/task.md:75).

## Case 2. Real-data switch merged with no final read, first check failed (clinic, 10-11 Nov 2026)

What happened: A session (Opus, high effort, branch claude/unruffled-elgamal-fac0dd, head 6eaed2a) built the real-data switch. Its own two Opus refute-reviews found no P1 and every P2 was fixed. The root read the design and two files and ran no further review. The root's check on the merged tree then failed twice for different reasons: Docker was not running, then 2 of 2570 tests failed. The cause was an order-dependent migration-reversal test the session's own run had not met. The root fixed three tests. A reader of the final head would have been the only other chance to catch it; the check caught it, not a reviewer.

When: merged 11 Nov 2026 as fb55599; fix 6a2fd45.

Who: Opus session (build), Opus reviewers (earlier heads), root (merge and check).

Evidence (exact):
- "The root read the design, the core module `operations/realdata.py` and the staff trigger, and did not run a further review (USER-24)." (CLINIC/docs/tasks/clinic-build/task.md:821)
- "the second failed 2 of 2570 tests, both real-staff tests, because the pay follow-up's migration-reversal test went back to `people/0013` and forward only to `0014`, leaving its worker's test database without `0015` (an order-dependent failure the session's own run did not meet)" (task.md:821).
- Commits (git in CLINIC): 6a2fd45 "Migration-reversal tests restore the app's latest migration, not a named one"; fb55599 "Merge the real-data switch and the money setup command ...".
- Scale: in the 10 Nov batch 4 of 5 merges had no independent read of the final head (task.md:788-796; EV/sweep-cards.txt A2-08). Owner's wrap-up instruction explains part of it (card A2-11).

What was handed up: nothing by design; the failure surfaced as a red check at the root, with the failing test names.

Sources: CLINIC/docs/tasks/clinic-build/task.md:788-796, 821; EV/map-full.txt B17; EV/sweep-cards.txt A2-08.

Later moment: refute.txt (EV/refute.txt, the Linux test runner entry, line ~30) says to expect one fix-up round for order-dependent tests when the worker count changes (container 12 workers against native 6), and cites this 11 Nov failure and the earlier S02 V1 "pass only because files run alphabetically". So the lesson was needed again for a planned change within days.

## Case 3. A "harness refuses subagent file writes" rule that was never true (clinic, 1 Nov, caught 12 Nov)

What happened: On 2026-11-01 two Opus analyst subagents reported "the harness blocks subagents from writing report files". The root saved this as a memory, and it became a written rule in the clinic's orchestration doc. Nobody tested it for eleven days. All subagent reports then flowed through the root's context. On 12 Nov (the harness review) a read-only probe showed a general-purpose subagent and a background workflow subagent writing and reading back a file with no prompt. The same memory already noted Sonnet extractors had written files earlier in that session. So a stronger model's unchecked self-report became policy, and the contradicting evidence sat in the same note.

When: claim 2026-11-01; probe 2026-11-12.

Who: two Opus analysts (claim); root (made it a rule); a probe in the harness-bottlenecks session (correction).

Evidence (exact):
- Memory: "both Opus analysts on 2026-11-01 reported 'the harness blocks subagents from writing report files'" and "Sonnet extractors did manage to write files earlier in the same session" (C:/Users/User/.claude/projects/C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop/memory/subagents-return-text-not-files.md).
- Rule text: "Subagents reply with their full result as text; file writes from subagents are refused here." (CLINIC/docs/agentic-coding/orchestration.md:14)
- Correction: "a background workflow subagent **wrote and read back a file with no permission prompt**" (EV/machine-facts.md:33; probe scratchpad/hb/subagent-write-probe.txt). Compile: "B16 is misdescribed ... an agent's self-report became policy without a check, which is itself a B12 instance" (EV/map-full.txt, B16 and M3 notes).
- Cost named: subagents made 82.4 percent of API calls and 78.7 percent of output tokens in October, and long reports flowed into the root, which compacted three times (EV/map-full.txt B16, CR-03, CR-05).

What was handed up: only the analysts' one-sentence claim. No error text, no tool result, no repro.

Sources: the three files above.

Later moment: the rule shaped every later brief ("reply with full result as text") until the 12 Nov probe; the compile's B16 remedy (reports on disk, script-checked) depends on the correction. EV/map-full.txt M3 note.

## Case 4. A critic wrongly refuted the owner's number; a later refuter read the transcript and reversed it (12 Nov 2026)

What happened: In the harness-bottlenecks compile, a critic searched only docs/tasks/*/task.md for "34 minutes" and reported "CONFIRMED NOT FOUND", so the compile said the owner's figure was wrong ("recorded waits are 3-742 s") and built a stop rule on "742 s, the largest recorded". A later refute pass searched the root transcript and found the check runner's own output "waited 2030 s" (33.8 minutes), plus "waited 350 s", which matches the owner's "6 to 34 minutes". The stronger pass caught the error of the earlier checker; before that, the compile had an uncaught false correction of the person who was right.

When: 9 Nov 2026 12:52Z (the 2030 s wait, after the mass resume following the 6-9 Nov outage); compile and correction 11-12 Nov.

Who: critic lane (model not recorded here); refute lane (model not recorded here); source of truth is root transcript 7f348b2c.

Evidence (exact):
- "[refuted] B07 (TRIAL, none) and the 'misdescribed' claim: Recorded waits are 3-742 s; '34 minutes' appears in no file; the owner's figure is wrong." (EV/refute.txt:33)
- "The check runner's own output in the root transcript 7f348b2c reads 'lock held for the test step (waited 2030 s)', returned at 2026-11-09T12:52:03Z ... The critic searched only docs/tasks/*/task.md (sweep-critic 'CONFIRMED NOT FOUND'), not transcripts." (EV/refute.txt:33-34)
- Amendment: "Every proof and stop rule that cites '742 s, the largest recorded' [must] use 2030 s." (EV/refute.txt)
- Side find in the same pass: "Thundering herd on resume. Releasing all parked sessions at once ... produced that 2030 s wait." (EV/refute.txt:103-104)

What was handed up: the exact claim plus a pointer to where it had been checked (docs only), which let the second pass see the search scope was too narrow.

Sources: EV/refute.txt lines 33-34, 100-105; EV/sweep-critic.txt; EV/map-full.txt B07.

Later moment: the same compile has other stop rules and remedies resting on the 742 s figure (verdict 1's stop rule) and B03/B10 resume remedies that would worsen the herd; the correction was needed there at once, in the same document set. No separate later session is recorded.

## Notes

Searched: EV/map-full.txt (B12, B16, B17), EV/sweep-cards.txt (A2-01, A2-05..A2-08), EV/refute.txt, EV/verdicts.txt, EV/machine-facts.md; CLINIC task.md files (clinic-build, opening-cutoff-guards, faster-check); root and clinic memory notes; git log of CLINIC for fb55599 and 6a2fd45. I did not scan subagent transcripts (.jsonl) for model-by-model comparisons, so "which model made the error" is only as the board records it.

Other candidates not written up: GE-01 (record "named two tests that no longer existed", fixed in root gate round 3, CLINIC/docs/tasks/opening-cutoff-guards/task.md:97; later repeat: faster-check review, "cites 'task.md section 13', which did not exist", faster-check/evidence/review-opus-round4.md:8). S11 GT: restore-volume and secret-scan claims that cited evidence did not support (clinic-build/task.md:660; scan built nine needles while the record said 55).
