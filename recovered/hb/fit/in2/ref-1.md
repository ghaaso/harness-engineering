# Mappings to attack: Horthy groups G1, G2, G3, G5 (source rows: horthy-survivors-A.md, horthy-survivors-B.md)

23 items.

### G1-F085 (horthy, adopt in the PR)
- idea as mapped: A 'preexisting/unrelated' reason for a new skip, xfail or red test must show the same failure on the base SHA; if it cannot, the work is rejected and a fresh agent is re-briefed from the journal.
- fit: supporting -> B12, B17 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: In v2 this is one claim type the B12 claims-file script can resolve mechanically: rerun the named test at the base SHA. It would have checked the 11 November real-data merge, whose first root check failed 2 of 2,570 tests, and the open A7-13 defect class of tests passing by being skipped.
- attaches to: 3.4 B12 claims file checked by script; 3.3 B17 finding closes only on a harness-run test
- caveat: Each base-SHA rerun takes a check slot, and only one slot was ever open (B07). Limit it to the named tests, never a full gate.
- proof on the record: Grep the recorded gate rounds and slice reports for 'preexisting', 'unrelated' or 'flaky' claims; rerun each named test at its base SHA; count how many claims fail to reproduce.
- reopened part: -

### G1-F036 (horthy, trial in the PR)
- idea as mapped: A trial trim of the about 24k characters of skill and agent descriptions, with a routing check before adoption; the disable-model-invocation flag only for a future owner-typed command no agent preloads.
- fit: supporting -> B04 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: This is the skills part of section 3.6 lever (2), the fixed 70k per agent (CR-11: skills 9k of it). Every gate-workflow agent in B04's first step pays that fixed cost, so a trim makes that step slightly cheaper.
- attaches to: 3.6 token budget lever (2); 3.4 B04 gate workflow
- caveat: Bounded small: about 6k tokens against about 306k context per slice call; context trims measured null in the testbed. No proof number moves.
- proof on the record: One /context reading of a gate-workflow agent before and after the trim, against CR-11's 9k skills line, plus a routing check that each skill still loads where it did.
- reopened part: -

### G1-F042 (horthy, trial in the PR)
- idea as mapped: One line in the closing message: the orchestrator calls get_usage('self') at phase close, with no owner transcription and no new tooling, giving the 500k trigger its sensor.
- fit: supporting -> B04 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: The B04 proof is 'no compaction across a wave of five gates'; the root compacted at 574k to 970k. A usage reading at each gate close would make that proof checkable live, rather than only by the after-the-fact transcript tally (tally.js).
- attaches to: 3.4 B04 proof; 4 item 6 per-slice tokens
- caveat: A sensor only; it does not reduce root context. The root is 15 percent of tokens.
- proof on the record: For one recorded root session, compare get_usage figures against tally.js per-call context at the four compaction points; agreement means the sensor can replace the forensics rerun.
- reopened part: -

### G1-F159 (horthy, trial in the PR)
- idea as mapped: For the first 5 phase sessions, record the main session's peak per-call context and the context position of each gating or judging decision later reversed, read from the transcript JSONL.
- fit: supporting -> B04 [strengthens-first-step; cost: script]
- how it fits: Tests B04's premise that root overload degrades judgment. On the testbed, tally.js already computes per-call context; joining it to reversed root decisions (unread merges on 10 November, the 11 November merge failing 2 tests) says whether bad calls cluster at high fill.
- attaches to: 3.4 B04 trial, before building the gate workflow
- caveat: Use a script, not a Haiku extractor: tally.js does the arithmetic. Few reversed decisions, so the result is exploratory.
- proof on the record: Extend tally.js over the root transcript; mark the context position of each recorded reversed root decision; compare with the four compaction points.
- reopened part: -

### G1-F170 (horthy, trial in the PR)
- idea as mapped: After two failed corrections on the same box: commit the WIP, record what failed as ruled out, resume in a new session; a failed subagent gets a fresh brief in a fresh agent; a third failure goes to the plan-wrong path.
- fit: supporting -> B01 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: Counterpart is the fix-round contract's 'at most two rounds' and 'fresh reviewer'. It adds what happens after round two: escalate, not patch again. On the record, 9 of 11 gates reached a third round read by the root alone; this rule would have sent those to re-plan.
- attaches to: 3.3 B01 fix-round contract
- caveat: A new session starts only on the owner's turn (B03), and each fresh agent pays about 70k fixed cost. Needs parked starts to work while the owner is away.
- proof on the record: On the recorded fix chains, count findings that needed a third correction and whether the five late P1s and ten P2s came from those third-round patches.
- reopened part: -

### G1-F183 (horthy, trial in the PR)
- idea as mapped: One sweep after the skills land, covering always-loaded and phase-start sources against CLAUDE.md and section 0, fixing contradictions at source; no per-phase standing check.
- fit: supporting -> B13 [strengthens-first-step; cost: extra-agents-per-phase]
- how it fits: B13 records stale parts of AGENTS.md and the context map. A one-off contradiction sweep finds what the compile's 'tests assert routing documents against the plan' should then assert, which seeds that step.
- attaches to: 3.4 B13 routing-document tests
- caveat: A one-off sweep does not move the board size or root-edit numbers; staleness returns unless the tests follow.
- proof on the record: Run the sweep over the testbed's AGENTS.md and context map at the final head; count contradictions found; check each against the board.
- reopened part: -

### G1-F196 (horthy, trial in the PR)
- idea as mapped: A narrow CI check of the PR body's structure, run as a separate workflow and trialled over 5 PRs.
- fit: supporting -> B17 [strengthens-first-step; cost: script]
- how it fits: The testbed has no PRs; the counterpart is the merge record. A structure check that each merge record names the head SHA and who read the final head makes B17's 'cannot merge on none or own' rule enforceable by script.
- attaches to: 3.3 B17 merge records who read the final head
- caveat: It proves a field is present, not true; B12 shows sessions fill fields falsely. Local script in the testbed, since it has no remote CI.
- proof on the record: Apply the structure check to the 65 recorded merges; it should flag the 4 of 5 unread merges on 10 November and the 11 November real-data merge.
- reopened part: -

### G3-F088 (horthy, adopt in the PR)
- idea as mapped: Write into the evidence rules what already happens ad hoc: save each Workflow script as run, add its args JSON, and keep the per-PR reviewer brief verbatim. No prompt dumps per step, no filler-reading reviewer.
- fit: supporting -> B17, B01 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: The B17 replay of seven known misses and the B01 replay at frozen commits must give the new reviewer what the original was given. Verbatim gate briefs on disk make those replays like-for-like.
- attaches to: 3.3 B17 replay of seven misses; B01 replay on recorded chains
- caveat: Helps future replays only; whether the testbed kept its gate briefs is not in the compile.
- proof on the record: Check whether the reviewer briefs for the seven known misses are recoverable from the clinic record; count how many replays could be like-for-like.
- reopened part: -

### G3-F074 (horthy, trial in the PR)
- idea as mapped: A read-only tally of a phase transcript's Skill, Agent, Workflow, ks lookup and main-session Edit/Write calls, compared with the closing message; the outside W2 check that needs no hook.
- fit: supporting -> B13, B12 [strengthens-first-step; cost: script]
- how it fits: B13's proof 'root edits at merge: zero' is exactly a count of main-session Edit/Write calls on shared documents; this tally measures it. Comparing a slice's reported test runs with its transcript's commands flags B12 overstatements about tests that never ran.
- attaches to: 3.4 B13 proof; B12 claims-file check
- caveat: Transcripts show a command ran, not that the cited test exists or fails without its guard; it complements the claims script, not replaces it.
- proof on the record: Extend tally.js: count root Edit/Write on board and shared files per recorded merge (the B13 baseline); diff slice reports against slice transcripts for the 20-plus recorded overstatements.
- reopened part: -

### G1-F157 (horthy, trial in the PR)
- idea as mapped: On high-volume workflow subagents, a whitelisted tool set (as fixflow-explorer uses) may cut a measured about 64k first-turn prompt re-read on every call; trial with one /context reading and one A/B workflow; install nothing.
- fit: supporting -> B04, B03 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: Section 3.6 lever (2): the fixed 70k per agent (CR-11: tools 34k, connectors 17k). The gate workflows of B03's and B04's first steps fan out such agents, and October's 40 limit errors in 78 s came from subagent bursts; a smaller fixed cost lets the one budget hold more.
- attaches to: 3.6 token budget lever (2); 3.4 B04 gate workflow
- caveat: A tools list without Write is a measured cause of B16's refused writes; keep Write for report agents. Stops were power-offs, and cache-read accounting is unknown.
- proof on the record: A /context reading of one gate subagent with and without the whitelist against CR-11's 70k; then 20 runs confirming zero refused writes in the clinic's permission mode.
- reopened part: -

### G2-F015 (horthy, adopt in the PR)
- idea as mapped: One reviewer-brief clause: each fail-before line cites the command run on the base SHA and its observed result, or is marked 'read, not run'. Not hook-enforced.
- fit: supporting -> B01, B12 [already-cited-in-compile; cost: brief-or-config-line]
- how it fits: A line in the slice claims file and the fix-round brief. In the testbed it would have turned the cited-but-nonexistent tests behind the 20-plus recorded overstatements into lines carrying a command the B12 claims script can rerun, and gives B01's reproduction test a stated base-SHA run.
- attaches to: §3.3 B01 fix-round contract; §3.4 B12 claims file
- caveat: Still self-report: an agent can cite a command it never ran. Only the script that reruns it, or the transcript check, resolves the claim.
- proof on the record: Over the recorded gates, count overstatements whose claim cited no command; those are the ones this clause would have exposed as 'read, not run'.
- reopened part: -

### G2-F051 (horthy, adopt in the PR)
- idea as mapped: In a resume or replay trial, keep the answer key out of the agent's reach: record its sha256, commit it only after judging, name its path nowhere the agent reads.
- fit: supporting -> B01, B17, B12 [strengthens-first-step; cost: script]
- how it fits: Guards the compile's replays: B01 at frozen commits, B17's seven known misses, B12 over recorded gates, the §5 candidate-fix replay. At a frozen commit the later fix, finding table and board are reachable through other refs, so an unsealed replay can pass by reading what came after.
- attaches to: §3.3 B01 replay on recorded chains; §3.3 B17 replay; A6-10 sealed-reference contract
- caveat: Adds validity, not a number. A6-10 already names sealed references for the store; this extends it to the gate replays.
- proof on the record: On one B01 chain, run the replay in a clone cut at the frozen commit and in a plain worktree; check the read log for any ref or file past the frozen commit.
- reopened part: The no-history raw checkout. It was cut as unneeded for FixFlow's P1 trial. For testbed replays at frozen commits the answer is in later commits of the same repository, so a clone cut at the frozen commit is the seal.

### G2-F054 (horthy, adopt in the PR)
- idea as mapped: One §0 sentence: if a resume source is missing, lacks Plan @ sha, has an unreachable sha, or the branch has commits the ticked boxes do not cover, list the commits and stop and ask rather than start fresh.
- fit: supporting -> B03 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: Counterpart: each slice's task record (A1-03) against its branch head at the B03 resume list. After the 24 shutdowns, uncommitted or unrecorded work can put task record and branch out of step; this makes a released session refuse a silent fresh start.
- attaches to: §3.1 B03 resume list at sign-in, sessions released two at a time
- caveat: No bad resume is on record. 'Stop and ask' adds an owner wait, which pulls against B03's goal of resuming while the owner is away.
- proof on the record: For the resumes on 9 November after the power-offs, count sessions whose task record disagreed with their branch head. Zero means the rule is untested.
- reopened part: -

### G2-F104 (horthy, adopt in the PR)
- idea as mapped: One clause on §0's 'new skip or xfail' item: the reviewer lists every new inline suppression and lint, type or import-config exception, each with its reason.
- fit: supporting -> B12, B17 [already-cited-in-compile; cost: brief-or-config-line]
- how it fits: Counterpart: the testbed gate's findings table and the open red-team defect 'verify passes when every test is skipped' (A7-13). A new skip makes a cited test 'pass' without running, which is a B12 overstatement; naming it lets B17's harness-run-test closure refuse it.
- attaches to: §3.3 B17 a finding closes only on a harness-run test
- caveat: A diff grep for skip and suppression markers does this without a reviewer; the brief clause is the weaker form.
- proof on the record: Grep recorded slice-branch diffs for new skip, xfail, noqa and type-ignore markers; count how many the gate findings tables named.
- reopened part: -

### G2-F023 (horthy, trial in the PR)
- idea as mapped: Trial one local transcript grep after each phase closes, covering only routine acts git cannot show: who implemented, the reviewer's SHA and ids, the resume dispatch.
- fit: supporting -> B17, B12 [strengthens-first-step; cost: script]
- how it fits: Counterpart: the slice and root transcripts. It reads who actually read the final head from tool_use records rather than the board, so B17's 'who read the final head' line and B12's 'cited test ran' become checkable from the harness's own record.
- attaches to: §3.3 B17 merge records who read the final head; §3.4 B12 claims check
- caveat: Near-duplicate of G2-F183; adopt one. Depends on transcripts surviving default cleanup. Stays local.
- proof on the record: Run the grep over the 10 and 11 November merge sessions; does it independently reproduce 4 of 5 unread final heads and the unread real-data switch?
- reopened part: -

### G2-F024 (horthy, trial in the PR)
- idea as mapped: One plain 'Sessions: <uuid>' line in the PR journal, copied from the scratchpad path, only for resumed or multi-session phases, and only if transcripts are kept.
- fit: supporting -> B04, B03 [strengthens-first-step; cost: brief-or-config-line; needs owner decision]
- how it fits: Counterpart: the slice task record. A session-id line per slice turns §3.6's per-slice November token figures and limit events, an open question in §4, into a join instead of an inference across the 9 November mass resume.
- attaches to: §3.6 token budget: rerun forensics for per-slice figures
- caveat: The November tally already split slice from root by folder; the gain is limited to resumed or multi-session slices. Transcript retention is a setting.
- proof on the record: Rerun the tally per slice; count sessions the folder heuristic cannot attribute to one slice. If near zero, drop it.
- reopened part: -

### G2-F041 (horthy, trial in the PR)
- idea as mapped: Gated trial: script the mechanical phase-close sequence, only if the prose routine is shown dropping close steps.
- fit: supporting -> B04, B13, B17 [strengthens-first-step; cost: script; needs owner decision]
- how it fits: Counterpart: the slice merge, where the root merged, applied board edits by script and updated documents by hand. The gate condition is met on the testbed record: final heads merged unread (B17). A scripted close is the compile's local merge queue and zero root edits at merge.
- attaches to: §3.4 B04 local merge queue under a lock; §3.4 B13 root edits at merge zero
- caveat: Alone it does not stop root compaction; review is the larger part of the root's load, and the root is 15 % of tokens.
- proof on the record: Across the 65 recorded merges, count close steps the root did by hand and merges lacking a final-head read that a scripted close would have refused.
- reopened part: -

### G2-F044 (horthy, trial in the PR)
- idea as mapped: One bounded side-effect check inside an existing trial: HEAD and worktree unchanged, plus a transcript read log showing the plan was read and the answer key was not.
- fit: supporting -> B01, B17 [strengthens-first-step; cost: script]
- how it fits: The checker half of G2-F051 for the compile's replays: a read log proving the B01 or B17 replay agent never opened the later fix, finding table or board makes a replay result admissible.
- attaches to: §3.3 B01 and B17 replays
- caveat: Validity only. Overlaps G2-F051; treat them as one replay-hygiene script.
- proof on the record: On the first B01 replay, the read log shows zero accesses to post-freeze refs or the board.
- reopened part: -

### G2-F077 (horthy, trial in the PR)
- idea as mapped: A §0 journal heading 'deviations from Scope @ Plan sha (expected/found/why)' ending in explicit 'none'; a reviewer line treating an unlisted deviation as a routine miss; a mismatches field in implementer schemas.
- fit: supporting -> B12 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: Counterpart: the per-node file set (A1-02) and slice report. A required deviations line with explicit 'none' is a claims-file line; a script comparing the diff's footprint with the declared file set makes it checkable, which catches reports that overstate what was confined.
- attaches to: §3.4 B12 claims file checked by script
- caveat: As narrowed it is a reviewer line, still model reading. Only the footprint-versus-file-set script makes it checkable.
- proof on the record: Over the recorded slice branches, compare diff footprint against the declared file set; count out-of-set files and how many the slice report listed.
- reopened part: -

### G2-F114 (horthy, trial in the PR)
- idea as mapped: One saved Workflow script for the deterministic part of the review stage: SHA binding, a per-id fail/pass table, the comparison done in code. Trial only.
- fit: supporting -> B04, B17, B01 [strengthens-first-step; cost: script; needs owner decision]
- how it fits: This is the compile's gate workflow returning a typed verdict naming the head SHA. It moves the per-id comparison out of the root, where round three of 9 of 11 gates was the root reading the diff alone, and produces the SHA-bound verdict that a merge check can test.
- attaches to: §3.4 B04 gate workflow with typed verdict; §7 gate-as-workflow row
- caveat: It produces the verdict; the B17 number moves only if merge refuses a mismatched SHA (G2-F118). Must share the one budget with the other gate remedies.
- proof on the record: Replay the 10 and 11 November gates: share of root diff-reading rounds the script's per-id table would have replaced, and whether the head SHA in each verdict matched the merged head.
- reopened part: -

### G2-F118 (horthy, trial in the PR)
- idea as mapped: One CI-run, mechanical-only check of code-phase PR artefacts: Plan @ SHA, reviewer verdict bound to the head SHA, ticked boxes, OWNER-VIEW changed, manifest hashes.
- fit: direct -> B17, B12, B13 [strengthens-first-step; cost: script; needs owner decision]
- how it fits: The testbed has no CI; the counterpart is a step of the local check or merge queue that refuses a merge whose verdict does not name the merged head. That turns B17's 4 of 5 unread final heads on 10 November into refused merges. Plan @ SHA, boxes and OWNER-VIEW have no counterpart.
- attaches to: §3.3 B17 high-risk branch cannot merge on 'none' or 'own'; §3.4 B13 board diff as a check step
- caveat: Only the SHA-bound verdict and manifest hashes transfer. Needs G2-F114's typed verdict first. A refused merge is an owner-visible stop.
- proof on the record: Over the 65 merges, count merges whose recorded verdict did not name the merged head; the check should flag the four 10 November cases and the 11 November real-data switch.
- reopened part: -

### G2-F180 (horthy, trial in the PR)
- idea as mapped: When an owner correction states a checkable code or environment fact, check it inline with a grep or command; the journal carries 'verified: path:line or command' or 'contradicted: evidence, raised to owner'.
- fit: supporting -> B16, B12 [adds-a-step; cost: brief-or-config-line]
- how it fits: The testbed record supplies the evidence the PR lacked. B16's rule came from two agents' unchecked report and was false, and the list's facts on B03, B05 and B07 were wrong too. Checking an environment fact before it becomes a harness rule would have caught the write rule early.
- attaches to: §3.4 B16 Write-enabled agents return path, hash, summary
- caveat: It does not move B16's refused-writes count; it stops a false rule forming. Scope must widen beyond owner corrections (see reopened part).
- proof on the record: Over the root's 15 lesson files and the 21 bottleneck statements, count environment-fact claims a single command could check, and how many §1 shows were wrong.
- reopened part: Agent-reported facts and prior notes were cut as already covered by KS §12.7, ORCH §5(d) and HR §6. Those are FixFlow documents. The testbed has no counterpart, and its B16 rule came from exactly such an agent report.

### G2-F183 (horthy, trial in the PR)
- idea as mapped: A deterministic, read-only phase-close check of transcript tool_use records for routine steps with no git or gh artifact: reviewer ran, gates ran, coordinator edited no code, resume diff ran.
- fit: supporting -> B17, B01, B12 [already-cited-in-compile; cost: script]
- how it fits: Counterpart: slice and root transcripts. It checks from tool_use records whether a reviewer read the final head (B17), whether the full gate ran before each fix commit as the B01 contract demands, and whether cited tests ran (B12).
- attaches to: §3.3 B01 full gate before the fix commit; §3.3 B17 who read the final head
- caveat: Near-duplicate of G2-F023. Transcripts must survive cleanup. It records compliance after the fact and blocks nothing.
- proof on the record: Run it over the recorded fix commits: share where no full gate ran before the commit, set against where fix-induced P1s and P2s appeared.
- reopened part: -
