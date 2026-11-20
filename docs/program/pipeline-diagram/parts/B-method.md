# B-method: parts of the helper-agent method (orchestration design + status + Horthy ideas + BAML trials)
Basis: README (method-status 2026-11-18): the orchestration was run once on 2026-11-01; 14 rules ran and worked, 9 ran and failed or changed, 25 never ran. Harness v2 parts: none built. Hooks: tested once in a probe and they refuse (observed).
Abbrev: OD = docs/ORCHESTRATION-DESIGN-2026-10.md; RD = harness-method-status README; HPG = horthy-proved-general.md; HIF = horthy-instruction-files.md; BAML = HARNESS-IDEAS-BAML-2026-11.md s0.

## Parts
Orchestrator (main session, "Fable") | the one coordinating AI session that sets hypotheses, routes work, reads results and decides; helpers never decide | in: owner request, helper results | out: briefs, gate decisions | when: always on | ran and worked | src: OD header, s3, s6
Tier routing (Haiku/Sonnet/Opus/Fable) | cheap model for extraction, middle model for reading/running/ordinary code, strong model for invariant code, analysis and refuting, top model only to orchestrate | in: kind of job | out: model chosen per helper | when: planning | ran and worked (but the caller's model value overrides an agent file's model) | src: OD s3; RD s2, s8
Raise effort before tier | spend more thinking on the same model before moving up a model | in: job difficulty | out: effort level | when: planning | never run | src: OD s3; RD s3
Effort pinning on helpers | always pass explicit effort, never inherit the session's | in: tier guide | out: launch parameter | when: planning | idea only (Horthy G4-F044, adopt) | src: HPG
Owner pre-flight (W0) | before any AI spends tokens, the owner checks real-world facts (backups, hosting, phone builds) | in: owner's dashboards | out: facts that pick the recovery branch | when: before the task | ran and failed (skipped; Docker was down) | src: OD s4.0; RD s3
Fleet data-preservation procedure | rules for phone users (do not open app, update, discard) so queued data is not destroyed | in: owner notice | out: phones keep data | when: before the task | designed only | src: OD s4.0
Inline pre-flight | orchestrator runs a few cheap commands itself (docker check, git log, greps) instead of paying helpers | in: repo | out: facts passed as args | when: before the task | designed only | src: OD s4.1
Hypothesis list with status (SETTLED/RESIDUAL/OPEN/OWNER) | numbered guesses about the cause, each marked by how settled, so helpers do not re-investigate settled ones | in: code reading, earlier facts | out: settled facts and ranking targets | when: planning | designed only | src: OD s2.1
Stage W1 discovery | many cheap helpers pull constants, names, lines and maps from code and web in parallel, no judgement | in: briefs | out: schema-shaped fact objects | when: doing | ran and worked | src: OD s4.2
Judgement-free discovery rule | discovery helpers return facts only, never severity or verdict | in: brief | out: neutral facts | when: doing | ran and worked | src: OD s4, s5.3
Haiku extractors with strict schema | smallest model fills a fixed form that rejects extra fields, input kept under ~100k tokens | in: files | out: typed rows | when: doing | ran and worked | src: OD s3, s4.2
Sonnet mappers and researchers | middle model maps one area or collects web facts with fetched URLs | in: files, web | out: MAP / RESEARCH objects (<=40 facts, evidence <=200 chars) | when: doing | ran and worked | src: OD s4.2, s5.2
Explorer agent (pinned Haiku) | project helper that only answers "where is X?" | in: question | out: file location | when: doing | never run | src: OD s3, s8; RD s3
Gate-running helpers (node gates, backend gates in Docker, dependency and secret scan) | helpers that run tests, lint, audit in containers and report exit codes and log tails | in: repo, Docker | out: COMMANDS / SCAN objects | when: doing/checking | ran in part (Docker down) | src: OD s4.2, App. A
Secret redaction rule | scan returns file, line number and hash fingerprint, never the secret, since every output is journaled | in: scan | out: SCAN object | when: doing | designed only | src: OD s4.2, s11
Diff-restricted register reconciliation (S-06) | re-checks the old issue list only where code changed since, with a one-hop import check | in: git log, changed files, old register | out: REGISTER (FIXED/OPEN/UNCHANGED...) | when: doing | ran and worked | src: OD s4.2
Demote, never delete | a "fixed" claim only narrows a strong-model brief to "confirm or refute", never removes the analyst | in: REGISTER | out: edited briefs | when: gate | designed only | src: OD header, s4.4
Script contract for workflow scripts | stable labels, slices of five, no clock, every call returns value or null, fixed return shape | in: task list | out: {results, missing, not_started, coverage} | when: doing | designed only (mostly never run) | src: OD s4.3
Circuit breaker | stops issuing helpers when 2+ in a slice fail fresh (usage limit suspected), accounts for every unstarted id | in: null results | out: HALT log | when: doing | never run | src: OD s4.3; RD s3
Resume with knownDead, retries at the tail | after a crash replay cached results and retry failures at the end with new labels | in: journal | out: completed run | when: doing | never run | src: OD s4.3, s7; RD s3
Return-contract and coverage rule | every missing or not-started id must be re-run or waived in writing; coverage must read full | in: script output | out: gap list | when: gate | ran and worked | src: OD s4.3, s4.4; RD s3
Output discipline | commands write logs to disk and return tails; no silent caps; dropped counts logged | in: command output | out: short objects | when: doing | designed only | src: OD s4.3
Gate G1 (first orchestrator gate) | orchestrator reads W1 results by id, picks the recovery branch, updates hypotheses, writes W2 briefs | in: W1 results | out: W2 briefs, owner form | when: gate | ran and worked | src: OD s4.4
Owner-decision form | list of owner choices that blocks the design helpers until answered | in: research facts | out: owner answers | when: gate | designed only (see Unclear) | src: OD s4.4
Briefs (goal, files, hypotheses, settled facts, what done returns) | one paragraph per helper; if you cannot write it, the task is not understood | in: G1 | out: prompt | when: planning | ran and worked | src: OD s5.3
CONTEXT block | fixed text prepended verbatim to every helper prompt with project facts and rules | in: orchestrator facts | out: identical prefix | when: planning | ran and worked | src: OD s5.1
Output schemas (MAP, RESEARCH, REGISTER, FINDINGS, CITATIONS, VERDICT...) | JSON forms every helper must return | in: helper | out: validated object | when: doing | ran and worked | src: OD s5.2
Evidence labels | each fact tagged VERIFIED-IN-CODE / BY-COMMAND / WEB / INFERRED with path:line quote | in: helper | out: tagged fact | when: doing | ran and worked | src: OD s5.1
Reading rules for analysts | one-hop reads, never whole files over 300 lines, map facts cited for context only, no git/npm | in: brief | out: bounded reading | when: doing | designed only | src: OD s5.3
challenges_settled field | an analyst may contest a "settled" fact with evidence | in: analyst | out: note to orchestrator | when: doing | designed only | src: OD s4.5, s5.2
backlog field | claims seen but not written up are listed so omission is visible | in: analyst | out: backlog list | when: doing | designed only | src: OD s4.5
Stage W2 deep dive | strong-model analysts rank causes and write ranked findings with file:line and failing condition | in: maps, briefs | out: FINDINGS | when: doing | ran and worked | src: OD s4.5
Code gives candidates, device evidence gives conclusions | analyst outputs a one-phone field test that separates top causes | in: ranking | out: test procedure | when: doing | designed only | src: OD s4.5, s5.3
Fleet drain protocol (O-10) | ordered procedure to get queued phone data safely into the recovered backend; its output is the release condition | in: W0 facts, queue findings | out: release procedure | when: doing | designed only | src: OD s4.5
Citation check | cheap helper re-finds every quoted line and marks LOCATED/MOVED/DEAD_CITATION/ALREADY_FIXED | in: findings | out: CITATIONS | when: checking | ran and worked | src: OD s4.6; RD s3
Fresh-context skeptic | strong helper sees only claim, evidence and failing condition (not the author's reasoning) and tries to refute | in: claim | out: VERDICT (CONFIRMED/PARTIALLY/REFUTED/UNVERIFIABLE) | when: checking | ran and worked | src: OD s4.6
Verdict rules | CONFIRMED needs a traced path; REFUTED needs positive counter-evidence; otherwise UNVERIFIABLE with what_would_settle_it | in: skeptic | out: verdict | when: checking | ran and worked | src: OD s4.6
Skeptic cap (12) | at most 12 strong skeptics per run to bound spend; extra claims go to open risks as "unverified" | in: claim count | out: capped set | when: checking | ran and failed (first four analysts used it up; overflow wrongly ruled "corroborated") | src: OD s4.6; RD s3
Second lens at the skeptic | skeptic for the top cause is told to explain the symptom by a different cause, instead of paying two analysts | in: ranking | out: rival explanation | when: checking | designed only | src: OD s4.5
Web re-check | one helper re-fetches cited URLs and downgrades unconfirmed facts to "inferred" | in: URLs | out: downgraded facts | when: checking | ran and worked | src: OD s4.6; RD s3
Three buckets | verified register / open-risks list / refuted, derived from verdicts | in: verdicts | out: G2 inputs | when: checking | ran (open-risk bucket misused) | src: OD s4.6
Gate G2 (second orchestrator gate) | orchestrator sets final severity, takes the decisions, records conflicts and why | in: three buckets | out: verified register, decisions | when: gate | ran and worked | src: OD s4.7
Open-risks block | an unsettled P0 blocks the phase touching its area until settled | in: open-risks list | out: block on phase | when: landing | designed only | src: OD s4.7
Stage S3 phase plan and per-phase recipes | plan after G2: Sonnet implements specified fixes, Opus owns invariant code, Opus reviewers refute by default, worktrees, one session per phase | in: verified register | out: phases | when: planning/doing | designed only (not written) | src: OD s4, s10
Journal of runs | every helper output saved so the orchestrator reads by id and a dead run can resume | in: helpers | out: journal file | when: always on | ran and worked | src: OD s4.4, s7
Reading budget at gates | orchestrator never loads all results in one pass | in: journal | out: small window | when: gate | designed only | src: OD s4.4
Batching and inline commands | claims batched per verifier, cheap commands inline, to avoid each helper's fixed overhead (design says ~7.5k tokens; measured ~60k) | in: claims | out: fewer helpers | when: planning | ran; the number was wrong | src: OD s3, s7; RD s3
Machine constraints (Docker, Node parity, no prebuild, fixed container names) | gates in containers, rerun failures under CI's Node, a second run fails on name clash | in: machine | out: reproducible gates | when: doing | ran in part | src: OD s8
Web-unavailable honesty | empty facts with status web_unavailable is a valid result; never invent facts | in: research helper | out: honest empty | when: doing | designed only | src: OD s8
Skills into agent definitions | outside skills distilled into project agent files with pinned model | in: skills | out: agent definitions | when: before the task | designed only | src: OD s9
Hooks and deny rules | scripts that refuse a tool call inside a session (wrong-model helper, write outside folder), ~37 ms each | in: tool call | out: block + reason | when: always on | built and measured in a probe (observed); not installed at the status date | src: RD s1, s2, s7
Status line script | sees context percentage, cannot block | in: session | out: display | when: always on | idea only | src: RD s2
Session-start hook injecting record files | hook adds named files so the record is read first | in: session start | out: injected text | when: before the task | idea only | src: RD s2
autoCompactWindow ceiling | compacts the coordinator's context at 400000 tokens, Opus only | in: context size | out: compaction | when: always on | built | src: RD s1
guard-hook.mjs and audit.mjs (research tree) | scripts that guard writes and audit transcripts afterwards | in: tool calls, transcript | out: block / audit | when: always on / after | built and tested, not installed | src: RD s1
Transcript audit of helper models | after-the-fact check of which model each helper used | in: transcript | out: report | when: after | idea only (checked on one file) | src: RD s2
Lane script / slot lock for heavy commands | runs heavy commands in K slots with a lock (suite serial, 494 MB peak) | in: commands | out: queued runs | when: doing | built (slot count never sized) | src: RD s2, s6, s7
Finer write control for several writers | each fix owns its functions, writers on own copies merged afterwards, shared primitive built first | in: fix list | out: merge plan | when: planning | idea only (hypothesis, untried) | src: RD s7a
Harness v2 parts: planner, scheduler, governor, plan check, gate, merge queue, library | split work, set lanes and token ceilings, validate plans, land changes, keep reasoning | in: request | out: landed change | when: all | designed only (none built; its refuter puts best lanes near two) | src: RD s4
Horthy: CI or lint check per checkable rule (F010, F011, F008) | automatic checks catch repeat traps | in: repo | out: red CI | when: checking | idea only (adopt/trial) | src: HPG
Horthy: secrets by variable name (F046) | never read .env; scan diff for secret values before landing | in: diff | out: scan | when: landing | idea only (adopt) | src: HPG
Horthy: deny dangerous calls by value (F031) | permission deny for named commands | in: tool call | out: refusal | when: always on | idea only (adopt) | src: HPG
Horthy: skill-set lint (F045) | CI checks skill frontmatter | in: skills | out: pass/fail | when: checking | idea only (adopt) | src: HPG
Horthy: list new lint-disables and gate-config edits (F104, F073, F123) | reviewer lists every inline suppression and config edit | in: diff | out: list | when: checking | idea only (adopt/trial) | src: HPG
Horthy: new tests run on base commit (F086) | a fix's test must fail before and pass after | in: tests | out: base/head result | when: checking | idea only (trial) | src: HPG
Horthy: bounded CI-watch loop (F077) | stop and journal after 3 identical CI failures | in: CI | out: stop | when: doing | idea only (adopt) | src: HPG
Horthy: cite command and result (F015) | a claim needs the command and its output or "read, not run" | in: reviewer | out: cited claim | when: checking | idea only (adopt) | src: HPG
Horthy: deterministic work in code (F118, F232) | mechanical CI check of PR artefacts, advisory while draft | in: PR | out: check | when: checking | idea only (trial) | src: HPG
Horthy: close-time clean-worktree check (F068) | git status empty, manifest complete at phase close | in: worktree | out: pass/fail | when: landing | idea only (trial) | src: HPG
Horthy: cut one leg of the lethal trifecta (F024) | restricted research agent plus deny rules | in: agent | out: restricted agent | when: doing | idea only (trial) | src: HPG
Horthy: flail tell (F085) | a "preexisting failure" excuse must show the same failure on the base commit | in: red test | out: evidence | when: checking | idea only (adopt) | src: HPG
Horthy: keep context under about 40 percent, log the peak (F159) | log per-call peak context for 5 phases | in: usage | out: peak log | when: always on | idea only (trial; "no data shown") | src: HPG, HIF s2H
Horthy: make context use visible (F042) | read get_usage at phase close | in: session | out: tokens, percent, compactions | when: after | idea only (trial) | src: HPG
Horthy: tool surface per need (F157) | whitelist tools on high-volume helpers (one MCP server cost ~5.7k tokens, measured card) | in: tool list | out: lean helper | when: planning | idea only (trial) | src: HPG
Horthy: quiet check scripts (F048, G4-F157) | a gate prints one line and only failures | in: gate | out: short output | when: doing | idea only (trial) | src: HPG
Horthy: trim skill and agent descriptions (F036) | cut always-injected descriptions to 400 characters | in: skills | out: shorter text | when: before the task | idea only (trial) | src: HPG, HIF
Horthy: restart after two failed corrections (F170) | commit WIP, log the failure, resume in a new session | in: failures | out: fresh session | when: doing | idea only (trial) | src: HPG
Horthy: resume trusts the log and fails loudly (F054), fetch before resume diff (F056) | resume lists commits and asks, never silently restarts | in: log | out: stop-and-ask | when: before the task | idea only (adopt) | src: HPG
Horthy: one writer per plan, fetch live PR body first (F192) | avoids overwriting edits | in: PR | out: fresh body | when: doing | idea only (adopt) | src: HPG
Horthy: keep the answer key from the trial agent (F051) | hash the expected result, commit it after judging | in: trial | out: honest test | when: checking | idea only (adopt) | src: HPG
Horthy: test compliance by side effects (F044), classify each miss (F134) | check files and git state, not words; label miss absent / ambiguous / present-but-missed | in: transcript | out: judgement | when: checking | idea only | src: HPG
Horthy: kickoff block (F115), pass phase id explicitly (F105) | short block opens a phase; session told its phase id | in: phase | out: fixed start | when: before the task | idea only | src: HPG
Horthy: name 1-3 files to mirror in briefs (F069) | brief points at example files | in: brief | out: pattern-following code | when: planning | idea only (trial) | src: HPG
Horthy: force skills by slash command (F037), tally skill calls (F070, F074) | invoke explicitly; count Skill/Agent calls from transcript | in: transcript | out: tally | when: after | idea only (trial) | src: HPG
Horthy: shape before code (F033), rough HTML mockup (F029) | signatures and call stack, or a rough mockup, agreed first | in: plan | out: shape block | when: planning | idea only (trial) | src: HPG
Horthy: control flow in code, not prompt (F041, F114) | scripted phase-close and review sequence | in: process | out: script | when: all | idea only (trial) | src: HPG
Horthy: plan and PR fields (deviations from plan F077b, verifying command per step F152, non-goals F185, verify a human correction F180, split long planning prompt F098) | fields that catch drift and over-engineering | in: plan, PR | out: fields | when: planning/checking | idea only (trial) | src: HPG
Horthy: humans read code on money/auth paths (F140) | owner reads only hunks marked invariant-touching | in: diff | out: sign-off | when: landing | idea only (trial) | src: HPG
Horthy: reviewer-side checks (changed gate-file list F225, watch first loop iterations F186b, cap review-fix loops F081, fresh-context deviation review F186, past-pain anti-patterns F089, second-source-of-truth check F088, slow-loop design audit F017, cross-model review F084) | notes and audits added to review | in: diff | out: reviewer notes | when: checking | idea only (trial; F084 owner "not now") | src: HPG
Horthy: experiment-method rules (F022, F034, F023, F025, F031b, F032, F181, F203, F228) | single run is noise; pin sample, prompt, seed; log model ids; replay old verdicts; relative budget gate; failure journal; spend baselines | in: experiments | out: rules for trials | when: checking | idea only (adopt/trial; some measured cards) | src: HPG
Horthy: session records for compliance (F023b, F183, F024b, F066) | transcript greps, PR-to-session link, cause tag on corrections | in: transcript | out: audit | when: after | idea only (trial) | src: HPG
Horthy: grow the library from reuse (F117), save scripts as run (F088b) | save only after real reuse or failure; keep script, args and brief verbatim | in: runs | out: library, manifest | when: after | idea only (adopt) | src: HPG
Instruction file: short root map plus conditional blocks (F001, F004, F005) | keep root for always-true content, wrap task-specific parts with narrow triggers | in: CLAUDE.md | out: leaner file | when: before the task | idea only (F004 trial; no result; testbed context trials null) | src: HIF s2A
Instruction file: directory-scoped files (F022) | split single-runtime rules into nested files, keep cross-runtime rules and pointer index in root | in: repo | out: nested files | when: before the task | idea only (trial, not run; nested files load only on Read) | src: HIF s2C
Instruction file upkeep (re-validate at model release F016, audit stale lines F183, fixed precedence F018, pointer to task folder F021, PR-body structure check F196) | keep instructions fresh and unambiguous | in: files | out: checked files | when: before/after | idea only (adopt/trial) | src: HIF s2A, s2E
Instruction file: keep rules inline, do not shard into files found by tool call (F007) | rules stay in root, only narrative moves | in: layout | out: inline rules | when: before the task | already done on paper | src: HIF s2A
Hand-over by document, fresh window per phase | decisions written to a file so a new session resumes from it; a compaction summary alone is not enough | in: session state | out: handoff doc | when: after/before | already done on paper; testbed trials null or worse | src: HIF s2E, s2F
Context fill limit ("dumb zone") | wrap up or compact near 40 percent on 200k windows; the limit moved higher in 2026 | in: context size | out: compact or restart | when: always on | idea only (asserted) | src: HIF s2H
Subagents as context firewall | helpers do noisy work so the main context stays small (testbed: ~70k fixed tokens per helper, so delegating everything costs more) | in: task | out: short return | when: doing | already done on paper; measured against | src: HIF s2G
BAML trial I-13 | rename VERDICT.reasoning to explanation, since a "reasoning" field can trigger a refusal; grep old transcripts for refusals | in: schema | out: rename | when: planning | idea only (trial) | src: BAML s0
BAML trial D-13 | give schema fields description text and define P0-P3 once, then compare skeptic and analyst severity agreement | in: schemas | out: described schemas | when: planning | idea only (trial) | src: BAML s0
BAML trial T-08 | deterministic record-only checks over returned objects (quote length, URLs, unique ids, evidence format) | in: result JSON | out: violation list | when: checking | idea only (trial) | src: BAML s0
BAML trial P-10 | run the gate script with a stub agent injecting nulls, throws, REFUTED, UNVERIFIABLE and over-cap claims, to test bookkeeping | in: script | out: bug list | when: before the task | idea only (trial) | src: BAML s0
BAML structural borrows S-1..S-5 | tagged run() results; one constants table for enums and buckets; stub harness; pure prompt-input boundary for skeptic; transcript-derived read audit | in: scripts | out: small JS changes | when: planning/after | idea only (trial, unrefuted) | src: BAML s0 (structural comparison)
BAML tool itself | typed-function LLM language | in: - | out: - | when: n/a | dropped (needs API billing path, rebuilt tools, pre-1.0) | src: BAML s0
BAML brief regression tests (B-13) | re-run frozen inputs after each brief edit | in: - | out: - | when: n/a | dropped ("not now": 60-180 runs per edit) | src: BAML s0

## Flow
1. A request arrives; the orchestrator opens the record, picks questions and writes hypotheses with status (OD s2).
2. Owner pre-flight (W0): owner checks real-world state; fleet notice stops data loss (OD s4.0). Skipped in the 2026-11-01 run.
3. Orchestrator inline pre-flight: cheap commands, results passed as arguments (OD s4.1).
4. Route each job to a tier by kind and pin effort (OD s3).
5. Build briefs: CONTEXT block, goal, files, hypotheses, settled facts, schema (OD s5).
6. W1 discovery: Haiku extractors, Sonnet mappers, gate runners and web research in slices of five, judgement-free, with circuit breaker (OD s4.2-4.3).
7. Returns go to the journal; return-contract check; missing ids rerun or waived (OD s4.3).
8. G1: orchestrator reads by id, branches on the recovery case, updates hypotheses, demotes (not deletes) fixed items, writes W2 briefs, issues owner form (OD s4.4).
9. W2 deep dive: Opus analysts give ranked FINDINGS with file:line and failing condition; leftovers go to backlog (OD s4.5).
10. Citation check per analyst (OD s4.6).
11. Fresh-context skeptics on P0 and invariant-touching P1, cap 12, overflow to open risks (OD s4.6).
12. Web re-check of cited URLs (OD s4.6).
13. Verdicts sorted into three buckets (OD s4.6).
14. G2: orchestrator sets severity, takes decisions, records conflicts (OD s4.7).
15. Phase design (S3, not written): Sonnet implementers, Opus for invariant code, refuting reviewers, worktrees; drain protocol first (OD s10).
16. Landing: gates in containers, CI checks, base-commit test, review, hooks guard writes (OD s8; RD s2; HPG).
17. After: transcript audit, usage and peak-context log, library save rule, hand-over document so a fresh session resumes (RD s2; HPG; HIF).

## Loops
- Skeptic verdict vs analyst severity: measured agreement (8 of 12 verdicts lowered severity at G2) changes final severity and drives the D-13 trial (OD s4.6; BAML).
- Circuit breaker: fresh nulls per slice change issuing; halt; retry at the tail with new labels (OD s4.3).
- Coverage check: missing or not-started ids force rerun or written waiver (OD s4.4).
- G1 hypothesis update: W1 facts change hypothesis status and W2 briefs (OD s4.4).
- Open-risks loop: unsettled P0 blocks its area until settled (OD s4.7).
- Context peak and usage log: measured context and weekly percent would change compaction or restart (HPG F159, F042, F203).
- Failed-correction loop: two failed fixes trigger a restart (F170); three identical CI failures stop the loop (F077).
- Transcript audit after a session: compliance findings change rules (HPG F183; RD s2).
- Re-measure at model release: regression check of instruction adherence (HPG F016, F025).
- Slot limit: process counts cap parallel gates (RD s6-7).
- Weekly post-mortem cause tag: repeated tagged corrections become rules (HPG F066).

## Jargon
W0/W1/W2/S3 | stages: owner pre-flight, discovery, deep dive, phase plan
G1/G2 | the two orchestrator decision points between stages
Fable | top-tier model for the coordinating session only
Opus/Sonnet/Haiku | strong, middle, cheapest model tiers
Skeptic | fresh helper that tries to disprove one claim
Analyst | strong helper that ranks causes and writes findings
Citation check | confirming quoted text exists where claimed
Verified register | list of claims that survived refutation
Open-risks list | unconfirmed claims kept visible with what would settle them
Failing condition | input or state under which a claim shows up
Journal | file recording every helper output for resume
Circuit breaker | stop issuing helpers when failures suggest a usage limit
knownDead | ids that failed earlier, so resume does not trust them
Schema (additionalProperties false) | fixed output form that rejects extra fields
Demote, never delete | weaken a brief, never remove the helper
Drain protocol | safe procedure to upload phones' stored data
Hook | script run at a tool call that can refuse it
Deny rule | permission setting blocking a named call
Dumb zone | context size where the model gets worse
Compaction | model summarising its own long context
Handoff | notes letting a fresh session resume work
CLAUDE.md / AGENTS.md | instruction file the agent reads at start
Adopt/trial/already-done/skip | verdict classes for sweep ideas
Refuter | model that tries to knock down a proposal
Lane | one parallel stream of work
Worktree | separate checkout of the repository for one task
Fixed overhead | tokens a helper spends before real work
Sweep | review of outside sources for ideas
Probe | one-off test of what a tool actually does

## Unclear
- OD says per-helper overhead is about 7.5k tokens; RD s3 says measured about 60,000 (HIF testbed row says ~70k). Documents disagree.
- Skeptic cap overflow: OD says "unverified"; the 2026-11-01 run ruled it "corroborated" (RD s3).
- Explorer agent pinned to Haiku (OD s3) vs RD s2/s8: the caller's model value overrides an agent file's model.
- Owner-decision form (OD s4.4) gates design helpers; whether it was ever answered is not stated in these four documents.
- Whether hooks are installed now: RD says none at 2026-11-18 and "hooks stay off" never ruled; later state not stated here.
- BAML s0 says "four survive" and describes them in prose that does not map cleanly to the four ids; it also lists S-1..S-5 as separate unrefuted trials.
- Harness v2 planner, scheduler, governor, plan check, gate, merge queue, library: named in RD s4; how each works is not stated here.
- Lane script and slot lock: named in RD s2; how it works is not stated here.
- Which exact rules fall into "14 worked / 9 failed / 25 never run" is only partly listed (RD s3).
- Stage S3 (phase plan) and per-phase recipes: "not designed yet" (OD s4, s10).
- Horthy kept ideas: only 2 of 78 map directly to a measured bottleneck; 53 map to none (HPG s1, s5). Which are worth building is not stated.
