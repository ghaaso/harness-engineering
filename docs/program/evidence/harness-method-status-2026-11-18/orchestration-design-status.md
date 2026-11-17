# Orchestration design: what stands behind each rule (extraction, 2026-11-18)

Facts and sources only. No verdict, no recommendation. Paths are under `docs/` unless the name starts with `program/`.
Short names: D = `ORCHESTRATION-DESIGN-2026-10.md`; G1, G2, HR = `program/G1-discovery-gate-2026-11-01.md`, `program/G2-deep-dive-gate-2026-11-01.md`, `program/HARNESS-REVIEW-2026-11-01.md`; T = `program/TOKEN-BOTTLENECK-2026-11.md`; HB = `program/HARNESS-BOTTLENECKS-2026-11.md` (clinic repo data unless said); BM = `program/HARNESS-IDEAS-BAML-2026-11.md`; SR = `program/SPLIT-RULE-2026-11.md`; SK = `.claude/skills/fixflow-orchestration/SKILL.md`.
Method: the run is W1 `wf_989263ce-0ef` and W2 `wf_5fe2ec50-8de` (G1:4, G2:4-5). Raw outputs: `program/evidence/w1/`, `program/evidence/w2/`. None of the run records says which model or effort each agent used, except G2:5-6 (7 Opus, O-08 Sonnet, skeptics Opus/xhigh). Everything below that says "no record" means: not in the sources named in the brief.

## 1. Status table

| Rule or mechanism | Sec | Status | Quote that shows the status (file:line) |
| --- | --- | --- | --- |
| Haiku extractors with closed schema (H-01, H-02, H-03, S-08) | 3, 4.2 | RAN-HERE-WORKED | G1:4-5 "coverage 16/16, no nulls". Outputs exist: `evidence/w1/H-01.json`, `H-02`, `H-03`, `S-08`. Output accuracy against the code: no record. |
| Haiku effort `low` literal, `medium` when names vary | 3 | DESIGNED-ONLY | D:95 "`low` for literal dumps, `medium` when names vary". No record of the effort any agent ran at. |
| Haiku prompts under ~100k input (price cliff) | 3 | OUTSIDE-EVIDENCE | D:95 "(Haiku's price cliff)". Only local datum: SR:132 "Its largest recorded call read 116k and it never compacted". No cost test. |
| Haiku "never for any inference, anything cross-file" | 3 | DESIGNED-ONLY | D:95. No record of a Haiku inference test. BM:723 "what `agent()` returns on schema exhaustion (UNKNOWN today)". |
| Sonnet for maps, gates, citation checks, web collection, S-06 | 3 | RAN-HERE-WORKED | G2:5-7 "109 claims re-located by Sonnet citation checkers ... one Sonnet web re-check (12 URLs)". G1:59 S-07a gates ran. |
| Sonnet effort `medium`, `high` for cross-referencing | 3 | DESIGNED-ONLY | D:96. No record of effort per agent. |
| Sonnet "never for security sign-off, invariant-sensitive code" | 3 | DESIGNED-ONLY | D:96. No record of a Sonnet task in that list. O-08 (Sonnet) was a draft; two of its claims went to skeptics (G2:27-28 O08-F01 CONFIRMED, O08-F02 PARTIALLY). |
| Opus analysts at `high` (O-03..O-07, O-10) | 3, 4.5 | RAN-HERE-WORKED | G2:5 "8 analysts (7 Opus, O-08 Sonnet), 139 findings". No record of an Opus-versus-Sonnet comparison. |
| Opus `xhigh` for O-01 and P0 skeptics | 3 | RAN-HERE-WORKED | G2:6 "12 Opus/xhigh fresh-context skeptics". O-01 ranking: G2:105-108. No record that `xhigh` beat `high`. |
| Opus "never for high-volume reading a map can replace; the three G2 decisions" | 3 | DESIGNED-ONLY | D:97. G2:238 shows the three decisions taken by the main session. No record either way on the first clause. |
| Fable: hypotheses, routing, gates, adjudication | 3 | RAN-HERE-WORKED | G1:3 "The first Fable gate of the ship program", G2:3 "The second Fable gate". G2:61 "verified by me at G1 in the pinned native sources". |
| Fable "never for subagent work; last resort" | 3 | DESIGNED-ONLY | D:98. No record of a Fable subagent. |
| `fixflow-explorer` (Haiku locator); built-in Explore inherits session tier | 3 | DESIGNED-ONLY | D:99. SK:35-38 "true only on PR #182". No record of a run in G1, G2, HR. Tier claim about built-in Explore: OUTSIDE-EVIDENCE (no local test). |
| "Raise effort on the current tier before moving up a tier" | 3 | DESIGNED-ONLY | D:88. No record of any effort raise, or of a comparison between effort and tier. |
| Fixed overhead per agent "CLAUDE.md ≈ 7.5k tokens plus the CONTEXT block" | 3, 7 | MEASURED-HERE | D:90 vs T:44 "56 % of every agent's tokens is its fixed prefix, about 60k tokens, roughly 50k of it tool and connector schemas". |
| "Tiny tasks are inline commands" (the §4.1 pre-flight) | 3, 4.1 | DESIGNED-ONLY | D:90-91. No record of which commands ran inline. Premise bears out in T:44 "Fan-out multiplied the prefix, not the work". |
| "The model per agent is the main cost lever" | 3 | DESIGNED-ONLY | D:89. No cost measurement in G1, G2, HR. See section 3, T:57. |
| Judgement-free discovery (no comparison, severity, verdict in Stage 1) | 4 | DESIGNED-ONLY | D:112-117. Ran, but no record that any Stage-1 output was checked for a verdict. G1:67-87 verdicts are the main session's. |
| Readers in slices of five | 4.3 | DESIGNED-ONLY | D:205. G1 records no slice count. W1 ran 16 agents (G1:4). |
| Circuit breaker (two fresh nulls = halt) | 4.3 | DESIGNED-ONLY | D:205-206. G1:4 "no nulls": it never fired. BM:723 notes it cannot tell a schema failure from a limit. |
| Resume replay, `knownDead`, tail retries `#retry<n>` | 4.3, 7 | DESIGNED-ONLY | D:207-211, 586-587. No record of any resume in W1 or W2. HR:6-7 "7 refuters lost to a usage limit": no record that resume was tried. |
| Return contract: `missing`, `not_started`, `coverage` | 4.3 | RAN-HERE-WORKED | G1:4 "coverage 16/16, no nulls" (nothing to account for, so only the counting was exercised). |
| Script bookkeeping fixes (`not_started`, `.catch`, tail label) | 4.3, 11 | DESIGNED-ONLY | D:784-786. BM:725 "three recorded bookkeeping defects"; found "by review", BM:680. No record of a run that hit them. |
| W0 owner pre-flight before any agent | 4.0 | RAN-HERE-FAILED-OR-CHANGED | G1:91-92 "W0 is still with the owner, so the branch is unresolved. W2 runs with `recoveryCase=unknown`". |
| Fable inline pre-flight (docker, greps, `npm ci`) | 4.1 | DESIGNED-ONLY | D:160-172. No record of its output in G1. |
| G1: verdicts per hypothesis, W2 briefs, owner form | 4.4 | RAN-HERE-WORKED | G1:67-87 verdict table; G1:112 "Owner-decision form (issued at G1)". |
| G1: branch on the recovery case | 4.4 | RAN-HERE-FAILED-OR-CHANGED | G1:89-94 "O-10 treats the keystore match, hostname control and recovery case as parameters". |
| G1: read results by id, never all sixteen at once | 4.4 | DESIGNED-ONLY | D:271-272. No record. |
| G1: "demote, never delete" a `FIXED` | 4.4 | DESIGNED-ONLY | D:265-266. G1:83 "H14 narrowed" is a hypothesis, not a brief. No record of a narrowed Opus brief. |
| Owner form gates O-07 and O-08 ("may not start") | 4.4, 6 | RAN-HERE-FAILED-OR-CHANGED | D:269-270 vs G1:100-102 "O-08 runs now as a Sonnet draft with the box location, domain and ISP as explicit unknowns". |
| G2: verified register, open-risks list, three decisions, adjudications | 4.7 | RAN-HERE-WORKED | G2:96 "The verified register", G2:220 open-risks, G2:238 "The three decisions", G2:276 "Conflicts adjudicated". |
| Citation check (Sonnet/high, per analyst, batched) | 4.6 | RAN-HERE-WORKED | G2:39-40 "109 claims re-located, none `DEAD_CITATION`, none `ALREADY_FIXED`; several `MOVED` (line drift only)". No record that it ever caught a dead citation. |
| Skeptic gets claim, evidence, failing condition only | 4.6, 5.3 | DESIGNED-ONLY | D:326-327, 543. BM:726 "No contaminated skeptic is on record". No record of the prompts. |
| Skeptic verdicts CONFIRMED / PARTIALLY, severity corrected | 4.6 | RAN-HERE-WORKED | G2:78 "Eight of twelve skeptic verdicts lowered a severity (table above); none refuted a claim." Table G2:24-36. |
| Verdict rules for REFUTED and UNVERIFIABLE (`what_would_settle_it`) | 4.6 | DESIGNED-ONLY | G2:24-36 holds only CONFIRMED and PARTIALLY. No REFUTED or UNVERIFIABLE skeptic verdict in the record. |
| One skeptic per P0 and per invariant-touching P1; other P1s share one | 4.6 | RAN-HERE-FAILED-OR-CHANGED | G2:13-16 "The twelve skeptics were consumed by the first four analysts to finish (O-04, O-06, O-08, O-03)". |
| Hard cap of 12 Opus skeptics; overflow goes to open risks as `unverified` | 4.6 | RAN-HERE-FAILED-OR-CHANGED | G2:281 "corroboration policy, no second Opus pass"; G2:44-49 overflow ruled C (corroborated) or O (open). Only 2 of 18 overflow rows ended as open (G2:59, 70). |
| Web re-check (Sonnet/medium, one agent) | 4.6 | RAN-HERE-WORKED | G2:40-43 "11 of 12 statements confirmed on page; the one `NOT_ON_PAGE` was a misattributed URL in R-01". `evidence/w2/web-recheck.txt`. |
| Three buckets (verified, open-risks, refuted) | 4.6 | RAN-HERE-FAILED-OR-CHANGED | Built (`evidence/w2/buckets.json`), but G2:78 "none refuted a claim" and G2:44-49 moved most overflow to "corroborated". |
| Severity re-set by Fable at G2, no materiality skeptic | 4.6 | RAN-HERE-WORKED | G2:98-99 "Severity is after correction". |
| Reading rules §5.3 (one hop, ranged reads, list extra files) | 5.3 | DESIGNED-ONLY | D:531-539. BM:727 S-5 proposes a transcript audit of self-listed reads; no record it was done. |
| Cost row W1: 16 agents, "cheap in tokens", wall clock "25–40 min" | 7 | MEASURED-HERE | D:578 vs G1:4-5 "about 1.67M subagent tokens, 14 min". S-07b never ran (see section 8 row). |
| Cost row W2 analysts: 8 agents, "the main spend" | 7 | MEASURED-HERE | D:579 vs G2:5 "8 analysts (7 Opus, O-08 Sonnet)". Analysts' token share of the 3.3M: no record. |
| Cost row W2 verification: ≤8 checks, ≤12 skeptics, 1 web | 7 | MEASURED-HERE | D:580 vs G2:5-7 "12 ... skeptics (the cap), one Sonnet web re-check (12 URLs), about 3.3M subagent tokens, 23 minutes". Number of citation checkers: no record. |
| Cost row Fable gates: 0 agents, "no fan-out" | 7 | RAN-HERE-WORKED | D:581. Main-session cost is not in G1 or G2. HR:72-73 "before the first compaction every call re-sent up to 944k tokens" (a later session, same program). |
| The whole envelope is "order of magnitude", an "Expectation" | 7 | GUESS | D:574 "Cost envelope (order of magnitude, before skills)"; D:576 column "Expectation". |

### Section 8 constraints (not about phones, Expo or Postgres)

| Constraint | Status | Quote |
| --- | --- | --- |
| Docker engine up before W1 launches; agents never start it | RAN-HERE-FAILED-OR-CHANGED | D:593-595 vs G1:60-61 "Backend gates were blocked on the Docker engine." `evidence/w1/S-07b.txt:3` `blocked: ["DOCKER_ENGINE_DOWN"]`. The agent returned the designed `blocked` value, so the fallback worked; the precondition did not hold. |
| Node parity: re-run a failure under `node:22` | DESIGNED-ONLY | D:596-598. G1:59 "CI-equivalent gates pass locally on Node 24", so no failure arose to re-run. |
| Never `expo prebuild` / `expo run:android` | DESIGNED-ONLY | D:599-602. No record of a breach or a test of it. G1:59 shows `expo export` ran. |
| Web research: load tools first, stop after two denials, honest `web_unavailable` | RAN-HERE-WORKED | G1:81 "bodies were 403"; G1:103-104 O-01 given the `gh` route; `evidence/w2/web-recheck.txt:2` "tool_status=web_ok". No `web_unavailable` result on record. |
| Command agents: 600000 timeout, fixed container names, no re-issue of mutating commands | RAN-HERE-FAILED-OR-CHANGED | Appendix A never ran in W1 (S-07b blocked). D:632-635 "Superseded for phase work (2026-11-13) ... this machine cannot create Docker networks". |
| Open ranges, no lockfile: S-07b says so in `notes` | DESIGNED-ONLY | D:624-625. S-07b did not run its gates. No record. |
| `.claude/agents/` holds only `fixflow-explorer.md`; pass `agentType` only if the file exists | RAN-HERE-FAILED-OR-CHANGED | D:626 vs SK:35-38 "true only on PR #182". Today the folder holds 12 agent files (Glob of `.claude/agents/`). |
| "Nothing here touches production" | DESIGNED-ONLY | D:628. No record of a breach; no record of a check. |

## 2. What the run records say went wrong or was changed

1. **The gate record was missing when W2 started.** G2:10-13 "The G1 gate record did not exist when W2 started (a shell quoting failure delayed the write by one turn), so every analyst fell back to the hypothesis table in the design doc". HR:283-284 turns it into a lesson: "write the gate record before dispatching the next workflow".
2. **The skeptic cap was spent first-come.** G2:13-16 "The twelve skeptics were consumed by the first four analysts to finish ... The claims that matter most to the plan ... overflowed." HR:284-285 "allocate a capped verification budget by priority, not first-come".
3. **The overflow rule was replaced by a corroboration policy.** D:329-330 says overflow "go to the open-risks list as `unverified`". G2:72-74 "No second Opus pass was bought: every over-cap P0/P1 either shares a skeptic-confirmed mechanism, was verified by me at the native layer, or is arithmetic."
4. **The planned second lens was lost.** D:308-311 puts O-01's app-logic lens in its skeptic. G2:285 "the second lens was to be the skeptic, which the cap removed".
5. **Docker was down; backend gates and the dump queries did not run.** G1:60-61 "Backend gates were blocked on the Docker engine." G2:27 "unverified: no Python here"; G2:233 "(no Python here today)".
6. **W0 was not done, so the recovery branch stayed open.** G1:91-94; G2:224-231 lists H4, H14, recovery case and the Supabase deadline as open.
7. **O-08 ran before the owner form**, against D:305 "(**after** the owner form)": G1:100-102.
8. **The main session's own design claim was wrong.** G2:90-91 "My own W0 §2 '503 stub' — wrong (O10-F3/F4)"; D:130 now reads "Not a 503". It was found by an analyst and settled by the main session reading the client code (G2:280), not by a skeptic.
9. **Analysts' severities ran high.** G2:78 "Eight of twelve skeptic verdicts lowered a severity". G2:26 O6-F01 P0 to P1.
10. **Analysts corrected each other and the settled facts, outside the verification stage.** G2:86-89 "O3-F8's failing condition — corrected by O-10"; "Settled fact S7 — refined by O-03".
11. **One misattributed URL reached the register input.** G2:40-43.
12. **The method found defects but did not review the architecture.** HR:36-37 "Until today, no: G1/G2 found defects and took three decisions; the plan repaired the current design in place."
13. **A later pass lost agents to a usage limit.** HR:6-7 "101 agents (94 completed, 7 refuters lost to a usage limit)"; HR:209-212 "Seven refuter runs ... did not happen ... those claims stay owner questions, not findings".
14. **Gate recipe replaced.** D:632-637 (Appendix A superseded). G2:215 O08-F06 "Appendix C's `--exit-on-error` tripped on the benign schema error (fixed in the design doc)".
15. **The design's cap on analyst output was removed in v3, and 139 findings came back.** D:799 "Reporting caps removed from analysts"; G2:5 "139 findings". D:219 still says "FINDINGS are sliced to 12 in the script".

## 3. Later measurements that confirm or contradict

| Rule | Measurement | Quote |
| --- | --- | --- |
| Fixed overhead per agent (7.5k) | Contradicts the size, confirms the point | T:44 "about 60k tokens, roughly 50k of it tool and connector schemas". HB:85 (clinic) "About 70,000 tokens before any work". T:35 "fixed prefix re-read every call ... 47 %" for FixFlow. |
| Tiny tasks inline | Confirms the premise | T:44 "1,118 agent windows, about 12 calls each". HB:223 "the fixed 70k per agent". |
| "Model per agent is the main cost lever" | Bears on it; counts tokens, not cost | T:57 "Opus made 65 % of calls and read 52 % of tokens ... Routing changes the rate per token, not the token count." |
| Fan-out under limits (slices of five, breaker) | Confirms that limits hit fan-out | HB:84 (clinic Oct) "Subagents made 82.4 % of 4,155 calls and 91 of 104 limit errors; one burst gave 40 limit errors in 78 s". HB:86 "Ten parallel lanes died in 15 minutes; two at a time, with state on disk, finished." |
| Breaker counts nulls | Possible conflation | BM:723 "a schema-exhaustion failure cannot masquerade as a usage limit"; precondition "UNKNOWN today". |
| Cache reads and limits | Unknown | T:64 "How cache reads count against the five-hour limit is unknown". |
| Orchestrator and fixed gates in the main session | Window size dominates tokens | T:18 "Token usage is **calls × window size**"; T:50 "Cap the orchestrator window at 150–200k". HB:21 (clinic) "it took **15 % of November's tokens. Slice sessions took 66 %**". |
| Haiku under ~100k | A Haiku call above 100k is on record | SR:132 "Its largest recorded call read 116k and it never compacted". |
| Citation check / claims check | A script-based claims check is proposed for clinic, unrun | HB:157 "a script checks that every cited test exists, ran, and fails when its guard is removed ... Trial". HB:50 "the final head often merged unread". |
| Skeptic isolation | Hygiene test proposed, no contamination on record | BM:726 "No contaminated skeptic is on record, so this is hygiene, not a fix." |
| Fresh-context refuters in the clinic gates | Refute-reviewers were in use there | HB:108 "Two-level gates with Opus refute-reviewers and findings tables per round". HB:143 "9 of 11 slice gates took three rounds ... 19 P1 findings in round one". Not the same design; no head-to-head. |
| Gate record before next workflow; priority budget | Taken into later practice | HR:283-285. |
| Workflow resume at a limit | Documentation only | HB:129 "workflows pause and resume at a limit but not inside scheduled or background sessions" ("not verified on this install"). |
| Tool allow-list for subagents | Proposed, no measured drop | HB:414 "It cuts fixed overhead and restores nothing. Adopt only on a measured drop." |

## 4. Rules with no record of a run at all (in the sources read)

- Haiku effort levels; Sonnet effort levels; Opus `high` versus `xhigh` effect; "raise effort before tier".
- `fixflow-explorer` (any use); the claim that the built-in Explore inherits the session tier.
- Any Fable subagent; "Opus never for the three G2 decisions" (only the main session's decisions are on record, G2:238).
- Judgement-free discovery (no check of Stage-1 outputs for verdicts); the `hypotheses` tag as routing only.
- Slices of five; the circuit breaker firing; `knownDead`; `#retry` tail labels; any resume of W1 or W2.
- G1 reading by id; "demote, never delete"; a `FIXED` narrowing an Opus brief.
- Skeptic prompt contents (claim, evidence, failing condition only); UNVERIFIABLE and REFUTED verdict rules; a shared P1 skeptic per analyst; O-01 skeptic with the app-logic brief.
- §5.3 reading rules (one hop, no `npm`/`docker`/`git`, list extra reads).
- §4.1 Fable inline pre-flight outputs; Node parity re-run; `expo prebuild` ban; open-ranges note; "nothing touches production".
- Appendix A and C as run by agents in W1 (S-07b blocked); Appendix B queries on a restored dump (no dump).
- O-10 "pipelined after O-03" and the per-analyst pipelining of citation checks (D:340-341): no timing record.
- Whether the §4.6 "warnings" the cap would cross (D:331) appeared: no record.
