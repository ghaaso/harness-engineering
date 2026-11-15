# Costs and budget fact sheet (record only; nothing estimated)

Paths: FR = fit/review.txt, MF = map-full.txt, RF = refute.txt, VD = verdicts.txt, SC = sweep-cards.txt (all under evidence/harness-bottlenecks/). Numbers in brackets are line numbers.

## 1. Consolidation (FR 315-428)

Mechanisms (name | bottlenecks | cost class | owner decision | absorbs):
1. Replay seal and read log | B01,B17,B12 | cost script | none | G2-F051 G2-F044 G4-F023. Proof: one recorded B01 chain replayed in a clone cut at the frozen commit vs a plain worktree; read log shows zero opens of later refs, fixes, finding tables or the board. (FR:316-320)
2. Gate-round claims and fail-before verdict script | B01,B12,B17,B04 | cost script | OWNER: "Whether the typed verdict becomes the gate's record in place of the root's own diff read. The record-only replay over recorded gates needs no decision." Absorbs G4-F086 G1-F085 G2-F015 G4-F073 T-08 G2-F114. Proof: score the 20-plus recorded overstatements; "false flags must stay under 10 %". (FR:321-325)
3. Transcript compliance audit at merge | B17,B01,B13 | cost script | none | G2-F183 G2-F023 G3-F074. Proof: over 10-11 Nov merges it must reproduce "4 of 5 unread final heads" and the unread real-data switch. (FR:326-330)
4. Finding record table and parser | B21,B13 | cost script | OWNER: fixes P0-P3 definitions and the expiry and re-triage rule for the pilot-critical subset | D-13 S-2 R-05. Proof: received/kept/dropped, zero unmapped statuses, open count over the 183 P3 ids. (FR:331-335)
5. Stub harness for gate and merge scripts | B04,B17 | cost script | none | S-3. Zero tokens; "No testbed record applies". (FR:336-340)
6. Local merge queue with SHA refusal | B17,B04,B13,B15 | cost script | OWNER: "Letting a script refuse merges and apply board edits in place of the root, and naming the high-risk list (money, stock, access, import, restore)." | G2-F118 G4-F232 G1-F196 G2-F041 G4-F068. Proof: record-only over the 65 merges flags the four unread 10 Nov heads and the 11 Nov real-data merge; live "from 5 of 6 to zero". (FR:341-345)
7. Command-backed facts and checklist steps | B16,B19 | cost brief-or-config-line | none | G2-F180 G4-F152. (FR:346-350)
8. Resume mismatch guard | B03 | cost brief-or-config-line | none | G2-F054. Proof: count mismatches in the 9 Nov mass resume; "Zero means the guard is unproven; keep it dormant until the first mismatch." (FR:351-355)
9. Fix-round brief clauses | B01 | cost extra-agents-per-finding | none | G1-F170 G4-F081 G4-F088. Proof is under the replay seal on "the five late P1 fix commits". (FR:356-360)
10. Owner read of marked hunks | B17 | cost standing-process | OWNER: "Whether the owner commits time at each high-risk merge, and accepts those merges waiting for the owner's turn." | G4-F140. "It is a trial on three merges." (FR:361-365)
11. Whitelisted tools for gate subagents | B04 | cost brief-or-config-line | OWNER: "Adopting a restricted agent type is a config change; the owner decides after the A/B." | G1-F157. Proof: one /context reading vs CR-11's 70k, then "20 runs ... with zero refused writes". Tool definitions "are 34k of CR-11's 70k fixed cost"; "subagents took 18.3 % of November's tokens, and unmeasured here". (FR:366-370)

BUDGET (verbatim, FR:424): "If everything were taken, the extra agents would be: one fresh agent for each finding that fails twice (G1-F170, at least 70k fixed each), the G4-F084 replay of 14 passes, one A/B for G1-F157, and owner time on high-risk merges (G4-F140). To stay inside one budget, defer G4-F084 and make G1-F170's fresh agent the compile's fresh reviewer, not an extra one. The zero-token scripts are the replay seal, the gate-round verdict script, the transcript audit, the finding table and parser, the stub harness and the merge queue. The verdict script costs check-slot time, not tokens. The clauses on command-backed facts and the resume guard cost nothing."

Conflicts (FR:372-396), 8:
- base-SHA reruns (G4-F086, G1-F085) vs the one check slot (B07): "8 GiB was never free in about 980 samples ... waits reached 2,030 s." Resolution: "Run only the cited tests, inside the same lock hold as the round's one full gate. Never run a second full check. Run replays outside build hours."
- Owner-visible stops (G4-F140, G2-F054, G2-F118) vs B03 idle hours (about three days to under three): a refused/waiting merge parks only its own slice; owner reads batched; measure owner wait against B03 idle hours.
- G1-F157 allow-lists vs B16 refused writes: whitelist always keeps Write; "Twenty runs with zero refused writes" in the pass bar.
- G1-F170 fresh agents vs one budget: "Each fresh agent pays about 70k fixed (CR-11)." Resolution: "Put zero-token scripts first. Take agent-adding items one per window under the §3.6 budget, and defer G4-F084."
- G4-F081 non-blocking notes vs B21: a note exists only as a finding record with an S-2 status.
- G1-F196 reader field vs B12: field must match the SHA in the typed verdict and the transcript audit.
- G4-F232 advisory vs G2-F118 refusal: "Run it record-only first over the 65 recorded merges. Switch to refusal only after the owner decides."
- G1-F157 vs null context trials: "adopt it only on a measured /context drop, and drop it if the A/B shows no difference."

DO NOT TAKE (FR:422): G4-F084 only: "It adds nothing over the compile's own B17 replay arm ... It costs agents against the one budget, the result is exploratory at n=7, and code would leave owner-controlled machines. Take it only after the replay seal exists and the owner approves the vendor."

Build order: no numbered order is recorded. Only statements: "Put zero-token scripts first" (FR:384); record-only before refusal (FR:393); "Take agent-adding items one per window" (FR:384). MISSING (FR:428): transcript audit "depends on transcripts surviving cleanup, and nobody has checked the retention setting"; A7-13 (all-skipped passes) unclosed; flaky tests unaddressed; "Neither list touches slice-session windows, which took 66 % of tokens." Per-bottleneck contribution (FR:399-419): B17 only "direct"; B02,B05,B06,B07,B08,B09,B10,B11,B14,B18,B20 "none"; B01,B03,B04,B12,B13,B15,B16,B19,B21 "supporting-only".

## 2. Per-bottleneck class and cost statements (MF; class from header, reclass from RF:1-5)

- B01 TRIAL P0 (MF:4): fix-round contract "Brief and template text, about an hour. One full check per round (274-840 s ...) and one fresh Opus reviewer per round" (35); state-exit table "30-60 minutes per such fix" (38); blast-radius script "about 100-200 lines, no install. It runs in seconds" (41). Baseline pinning: "one Sonnet pass" (32). Adopt bar: zero fix-induced P1 and rate under half of baseline over five gated branches (36).
- B02 BUILD P0 (47): zero-seed drill "Half a day to a day ... about 2-3 minutes per run" (72); seeder-only check "2-4 hours" (75); real-shaped sample "Minutes per slice ... a few hours" to build (78).
- B03 DECIDE P0 (84): restart chain "An hour of settings, a 30-line script, and a UPS if chosen" (115); resume trigger "An afternoon probe, then about an hour of setup" (118); limit pacing "About an hour; the script exists" (121). Target idle "under 3 hours, against a baseline of about 3 days" (119).
- B04 BUILD, reclassified TRIAL, P1 (127; RF:2): gate workflow "About 200-300 lines of script ... Agent tokens move from the root to workers" (158); merge queue "About a day" (161); fragments+generator "About a day ... fact table optional, about a day" (164). One probe (155).
- B05 DIAGNOSE P0 (184): join "About one hour, read-only" (207); sensor logger "An afternoon of setup by the owner" (210); minidump/sleep fix "1-2 hours, plus a UPS if justified" (213).
- B06 DECIDE P1 (219): container-gate flip "About an hour, plus the owner's decision" (245); serial lane trial "Half a day" (248).
- B07 TRIAL, reclassified BUILD, P1 (254; RF:3): peak measurement "One afternoon" (278); FIFO queue "A few hours, stdlib" (281); one gate per round "A routine rule, no code" (284).
- B08 DIAGNOSE P1 (290): shared Postgres "About a day" (313); teardown "An hour of script, plus two owner settings" (316); WSL cap "Minutes plus a 'wsl --shutdown'" (319); attribution "One day with a 5 s per-group sampler" (310).
- B09 DIAGNOSE P2 (325): heartbeat+stacks "Half a day" (345); stall limit "Minutes" (348); native path "None beyond B06" (351).
- B10 DECIDE P1 (357): settings "Minutes; owner decision" (377); self-starting preflight "An hour" (380); resume list "A few hours" (383). Probe "One reboot" (374).
- B11 DECIDE P0 (389): off-machine bundle "15-30 minutes of the owner's time" (409); nightly WIP "A few hours; Task Scheduler route unverified" (412); VPS remote "An hour once the VPS exists" (415).
- B12 TRIAL P0 (436): claimcheck "About a day to build ... Zero model tokens" (467); mutation runner "Hours to build" (470); denominator "Free once the resolver exists" (473).
- B13 BUILD P1 (479): fragments+generator "About a day" (507); validity columns "Part of the fragment schema" (510); drift tests "About an hour each" (513).
- B14 DIAGNOSE, reclassified BUILD, P2 (519; RF:4): heartbeat "A few hours, plus one brief rule" (542); owner board "About a day. Reopens the harness review's 'skip hooks' ruling" (545).
- B15 DECIDE P1 (551): archive policy "Owner minutes" (575); reaper "Half a day" (578); shared DB container "About a day" (581).
- B16 DIAGNOSE, reclassified BUILD, P1 (587; RF:5): write-and-return-path "About an hour" (613); workflow fan-out "Script authoring per workflow kind" (616); checkable reports "Shared with B12" (619). Probe "about 15 minutes" (610).
- B17 TRIAL P1 (638): executed acceptance "About a 40-line T-08-style script ... Minutes per PR" (668); head-label block "One column ... Near zero" (671); replay+human sampling "About 14 reviewer runs plus about 3 owner hours" (674).
- B18 DECIDE P1 (680): "An owner decision plus about 1 hour" (699); parity check "About 30 lines" (702); caps "Minutes" (705).
- B19 DECIDE P0 (711): rig closures "About 1 owner minute (UAC) and 1-2 sessions of build" (732); rented host "a domain fee, a few hours of host rental; about one session" (735); box gate "Watcher already exists" (738).
- B20 BUILD P1 (744): rerun drill e "About 1-2 hours including warm-up; no new code" (764); volume generator "About one session" (767); perf gate "drills cost about 1 hour each time they trigger" (770).
- B21 BUILD P2 (776): extractor "One session; zero risk to code" (799) (RF:90-91 replaces Haiku with a script parser); footprint staleness "About 100 lines of script plus one owner decision" (802); severity brief "A brief edit" (805).

Dependencies stated: B08 WSL cap needs the per-check peak from B07 first (MF:319); B07 container slots tie to B06 (MF:288); B09 native-path fix follows B06 (MF:350); B19 box gate needs an alert channel from B19 mechanism 1 (MF:738); B20 run "when no gate is running" (B07) (MF:763); B11 nightly copy age checked by the B10 logon list (MF:413); B12 root-gate step first, Stop hook a separate decision (RF:55); B03/B10 resumes staggered, at most two sessions (RF:19,47,104); B05 diagnosis before widening auto-restart (RF:46); B16 reports reuse the B12 resolver (MF:619). Cross-cutting: "Make the root's gate script-first" (MF:627); chain B05, B10, B11, B03/B14 (MF:424); rehearse early, "rent before buying" (MF:815).

## 3. Refute attacks (RF:7-99), 23 attacks
Reclassifications (4, RF:1-5): B04 BUILD to TRIAL; B07 TRIAL to BUILD; B14 DIAGNOSE to BUILD; B16 DIAGNOSE to BUILD.
1 B01 narrowed: sec.0 already requires re-read; G4-F156 is refuted; add frozen-SHA replay as cheaper first step (9-11).
2 B02 narrowed: fresh-VM drill needs UAC; use fresh container DB as gate step (13-15).
3 B03 narrowed: cause stands (power-off); scheduled-task probe step (c) likely fails; stagger resumes (17-19).
4 B04 narrowed, RECLASS: root about 14% of Nov cache-read, slices 66% (21-23).
5 B05 stands; activity-join CSVs need wall-clock times (25-27).
6 B06 stands; expect an order-dependent test fix round (29-31).
7 B07 refuted ("misdescribed" claim wrong: wait 2030 s = 34 min), RECLASS to BUILD (33-35).
8 B08 narrowed: shared DB must join check network; attribute first (37-39).
9 B09 stands; 20-run false-kill proof on a loaded day (41-43).
10 B10 narrowed: staggered resume, keep auto-restart to two DBs (45-47).
11 B11 narrowed: KS journal mirrored only to VPS, not "as safe as the repo" (49-51).
12 B12 stands; build root-gate first, Stop hook separate (53-55).
13 B13 narrowed: clinic has no CI; use a local check step (57-59).
14 B14 narrowed, RECLASS: 74 h calls span the power-off, not a limit (61-63).
15 B15 stands; reaper must skip non-archived or recently written worktrees (65-67).
16 B16 narrowed, RECLASS: probe ran in bypass mode; 15-minute probe is acceptance (69-71).
17 B17 narrowed: G4-F154 refuted; replay exploratory; count reviewer in budget (73-75).
18 B18 stands; add order-dependent caveat (77-79).
19 B19 stands; no amendment (81-83).
20 B20 narrowed: rig rerun is regression signal, not proof; needs owner for UAC (85-87).
21 B21 narrowed: parse tables by script, not Haiku (89-91).
22 Thought-structures verdict narrowed: replay at frozen SHAs instead of live A/B; 6-finding arm underpowered; use 2030 s (93-95).
23 Graph-recall verdict refuted: root about 14%, slices 66% (97-99).
MISSED (RF:101-113) includes: "No one summed the new agent spend ... Against CR-04's measured two-lanes ceiling and October's 14 limit episodes, together they recreate B03" (109); unknown whether cache-read tokens count toward the 5-hour limit (110).

## 4. Verdicts (VD)
Thought structures bottom line (VD:3): "Not as named methods. The one narrow version with coding evidence is several candidate fixes per serious review finding, picked by an executed test that was written before the candidates. Nobody has shown it cuts fix-induced defects (B01), so run it once as a small, capped A/B trial on one slice. Do not build it into the harness." Confidence medium.
DO NOT BUILD, thought structures (VD:31-38): (1) prompt-level ToT/FoT/GoT layer; (2) MCTS/tree-search coding agent with a model judge; (3) majority vote or consensus over reviewers' findings ("keep the union"); (4) multi-agent debate or Reflexion loops; (5) GoT-style model aggregation for merging slice outputs or shared documents; (6) "A standing K-way candidate fan-out on every finding, or any candidate run that triggers a full 7-step check per candidate"; (7) "More model-review rounds as the cure for B01."
Trial design (VD:27-30): next slice with at least 4 round-1 P1/P2 on money/stock/hold-lock/state/deploy code; coin flip per finding; K=3 Opus candidates in separate worktrees; reproduction test frozen and sha256 recorded before candidates; script selects (fails on base, passes on candidate, guard removal fails the test, ties fewest files). Budget: "at most 18 candidate fixes and 6 frozen tests"; tokens capped "at 3.5x the control arm's mean per finding"; no candidate work "within the last 90 minutes of a 5-hour window"; full check once per arm per round on the winner only. Stop (pre-registered): cap passed on two findings; winner is candidate 1 in at least 3 of first 4; frozen test weak on 2 findings; usage-limit stop or wait over 742 s (RF:94 says use 2030 s). Adopt only if zero fix-induced P1 and "at least 2 fewer fix-induced P1 plus P2". RF:95 amends this to a retrospective replay at frozen pre-fix SHAs (GC-01, G07-01/02, GU-01, G01-01, S02 test fix), live trial only if the selector rejects the defect-making candidate. FR:311: replay "of three candidate fixes per recorded chain, selected by a frozen test"; "Live parallel attempts stay fallen on cost".
Graph recall bottom line (VD:49): "Partly, and mostly not through a graph. The tokens went into the root's large resident window (592.7M cache-read tokens over 1,107 calls) and into reports and diffs passing through it. A small SQLite store of what is valid now (slice status, gate verdicts, open findings, decisions), written only by deterministic tools, could let the root run with a small window. A recursive 'neighbourhood of this fix' query is a cheap add-on, worth having only if a zero-token replay shows it finds where the fix-induced defects landed. No such library exists in the testbed, and none of the testbed's own trials measured a token gain." (RF:97-99 refutes the root-token premise.)
DO NOT BUILD, graph recall (VD:189-196): LLM-extracted knowledge graph (GraphRAG/Graphiti/Graphify LLM pass); graph database server (Neo4j-class or Kuzu); embeddings or vector index; a memory layer that pushes context via hooks or injection; self-modifying rules or code driven by the store; time-to-live or age-based expiry; a separate code-graph tool trial before stage 0.
Trial (VD:150-188): Stage 0 zero tokens, "under an hour of Node": blast-radius query on the 9 recorded fix-induced defects plus S09 round 2; drop the query if later-defect files fall in "fewer than 6 of 10 cases, or the median result exceeds about 15 files". Stage 1: 10 gate rounds x 2 arms x 2 repeats = "40 Opus gate-agent runs", spend capped at an owner-set figure, lanes two at a time; adopt only if arm B median root tokens per gate are at least 30% below arm A with no lost P1. Loader build "about one session"; store "300-500 lines of Node ... A day or two of one session, after the trial says go" (139). Plain fallback: generated markdown state file plus earlier compaction (187).

## 5. Limits (SC)
- CR-03 (SC:1221-1227): 14 distinct limit episodes 6-20 Oct, 104 error records all five_hour; subagents made 82.4% of 4,155 calls and "91 of the 104 limit records"; "one burst gave 40 limit records within 78 seconds"; "typically reached about 75 minutes into the 5-hour window" (median first-error-to-reset 224.7 min); about 778M tokens, 94.1% cache reads; "How each token type counts toward plan limits is UNKNOWN".
- CR-04 (SC:1231-1233): 10 parallel lanes "died in about 15 minutes"; run 1 stopped at 2.44M subagent tokens, 2 of 19 agents finished; lanes 2 at a time: 30 minutes, 3.4M tokens, 48 agents, 18 finished; lean run 30 of 31 agents on 3.28M; "one window covered only about 3.4M subagent tokens"; "each full window used about 14% of the weekly limit"; no unattended resume after a limit.
- CR-11 (SC:1289): "About 70k tokens of overhead before work: one subagent breakdown summed to 70,021 (system tools 33,968; MCP tools 16,599; skills 9,059; system prompt 7,926; memory files 2,469)"; pre-read 8,753 to 34,749 tokens; chars/4 undercounts 25-35%.
