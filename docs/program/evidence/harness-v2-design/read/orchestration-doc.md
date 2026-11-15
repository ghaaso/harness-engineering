# ORCHESTRATION-DESIGN-2026-10.md — what it says (819 lines, read in full)

## 1. Structure, purpose, status
Title (l.1): "Orchestration design — the ship-to-client program (v2, 2026-10-31)". Purpose (l.3-7): "the role assignment and multi-agent orchestration for the work that gets FixFlow shipped... It is the *method*, not the plan: the phased plan is designed only after the workflows below have produced a verified picture."
Status (l.9-14): "v3 — v2 ... revised after a second external review ... Awaiting the owner's skills research (§9) and the W0 owner pre-flight (§4.0) before W1 runs." So: a design awaiting owner inputs, not declared adopted. Titled v2, status v3 (inconsistent header).
Sections: 1 Ground truth (l.23) · 2 Questions Q1-Q8 + hypotheses H1-H18 (l.40) · 3 Tier guide (l.86) · 4 The orchestration: 4.0 W0 owner pre-flight, 4.1 Fable inline pre-flight, 4.2 W1 discover, 4.3 W1 script contract, 4.4 G1 gate, 4.5 W2 deep-dive, 4.6 Verification policy, 4.7 G2 gate (l.103-357) · 5 Shared contracts: 5.1 CONTEXT block, 5.2 schemas, 5.3 briefing/reading rules (l.361-545) · 6 Why this shape (l.549) · 7 Cost envelope (l.574) · 8 Harness/machine constraints + Appendices A-C (l.591-711) · 9 Skills wanted (l.715) · 10 Deliberately not in this document (l.743) · 11 Change log v3/v2 (l.755).
Who decides (l.16-19): "The main session (Fable) is orchestrator, architect and judge... Subagents gather, analyse and verify; they never decide."

## 2. Parallel work
- Pipeline (l.105-111): W0 -> W1 "(wide, cheap)" -> G1 -> W2 "(narrow, expensive)" -> G2 -> "S3 not designed yet".
- Readers in slices of five (l.205, l.232): "Readers run in slices of **five** with a **circuit breaker**: two or more *fresh* nulls in one slice means the session limit is suspected; the script stops issuing". Code uses `parallel(slice.map(...))`.
- Long command agents run alongside (l.202-204): "Long agents (S-07a, S-07b, S-08) are issued first in their own `phase('Gates')`... their write-set (`node_modules/`, `dist/`, `coverage/`, Docker) is disjoint from everything the readers read." This is the only disjoint-write-set statement; it is about reads vs gate artefacts, not slice file footprints.
- Serial constraints: O-10 "pipelined after O-03" (l.306, l.341); O-08 "after the owner form" (l.305); O-07/O-08 gated on owner answers (l.269-270, l.564-566); S-07a runs root then mobile `npm ci` "never both at once" (l.187); "mechanically no second `pytest` against one DB" via fixed container names (l.620-622); W2 citation checks "pipelined per analyst so citation checks start as each analyst finishes" (l.340-341); G1 reads "by id... never loads all sixteen objects into one pass" (l.272).
- Wall-clock (l.578): "wall-clock set by S-07a/S-07b (25-40 min), which run alongside the readers". No other speed-up statement.
- Worktrees: only a mention in l.749-750 ("Opus reviewers with refute-by-default; worktrees"), deferred to a later, undesigned section. No isolation rule for implementation.
- Counts: W1 16 agents, W2 8 analysts, <=8 citation checks, <=12 Opus skeptics, 1 web re-check (l.576-581).
- All parallelism here is read-only discovery/analysis. No parallel implementation slices exist in the document.

## 3. Planning
- The doc is explicitly not the plan (l.5-6; l.745 "The phased plan and its one-session-per-phase sizing (designed after G2)"). Phase design "starts only after G2" (l.357).
- Two constraints the plan must carry (l.745-748): O-10 drain protocol is first phase in every recovery case; reliability claims need device evidence across OEMs.
- Briefs (l.528-530, l.267-268): "A brief names the goal, the files, the hypotheses it bears on, what is settled, and what 'done' returns. If the orchestrator cannot write that in a paragraph, the task is not understood well enough to delegate." W2 briefs "naming files, the hypotheses to rank, the settled facts... and the reading rules". Brief carries model/effort per task (TASKS table l.176; l.222).
- Plan gates: G1 and G2 are gates on findings, not on plans. G2 lists "three decisions" and an open-risks rule (l.347-349): "A P0 on this list blocks the phase that touches its area". Fable writes and judges; owner approves via the owner-decision form (l.274-285) and W0 items. No check on a plan's parallelisability, footprints, or budget.
- Per-phase "implementation recipes" are listed as not in the document (l.749-751).

## 4. Tokens, usage limits
- Routing (l.88-91): "raise effort on the current tier before moving up a tier. Ultracode multiplies every token across agents; the model per agent is the main cost lever. Every subagent also pays a fixed overhead (CLAUDE.md ≈ 7.5k tokens plus the CONTEXT block)... so tiny tasks are inline commands, and claims are batched per verifier."
- Tier table l.93-99: Haiku for typed-schema extraction, "Keep each prompt under ~100k input tokens (Haiku's price cliff)"; Sonnet; Opus; Fable orchestrates; `fixflow-explorer` pinned to Haiku because built-in Explore inherits session tier.
- Circuit breaker (l.205-211) on session limit; resume from journal with `resumeFromRunId` and `args.knownDead` (l.585-587; journal path l.586).
- Output discipline (l.217-219): "command agents redirect `npm`/`pytest`/`docker` output to scratchpad logs and return tails + exit codes; mappers return at most 40 facts, each evidence string ≤ 200 chars; FINDINGS are sliced to 12 in the script with the dropped count logged (no silent caps)." Map summary <=300 words (l.417). Command agents write full logs to disk, return `GATE[...] EXIT=` lines (l.659-660).
- Reading rules (l.531-539): never read a file over 300 lines whole; Grep then ranged Read; one-hop reads, extra files listed in `open_questions` "so the spend is visible".
- Hard cap l.329-331: "12 Opus skeptics per W2 run; claims beyond the cap go to the open-risks list as `unverified` — never dropped. This stage will cross the harness's agent/token warnings; that is deliberate."
- Cost envelope §7 (l.574-587): agent counts by tier, "order of magnitude", no token numbers. "Fixed overhead per agent... is why the git log, the migration greps and the `npm ci` are inline".
- Fable gates "0 agents... no fan-out" (l.581). Structured-only returns (l.384-385). Skills may let Haiku take over more work (l.738).
- Not present: prompt caching, compaction, context-size budget for the main session beyond "read by id", any per-run token ceiling number.

## 5. Knowledge store / memory
None as a library. Closest items: CONTEXT block "do not re-derive" and `args.settled` (l.366, l.377; §2.1 SETTLED rows) — hand-curated facts injected into every brief; "Prior registers to cite, not re-summarise" (l.378-380); the journal as resume cache (l.585-586); maps passed as `args` between stages; `challenges_settled` field lets agents contest settled facts (l.501-503, l.537-538); §9 distils sourced skills into `.claude/agents/<name>.md`, with an orchestration skill (l.735). No query-first rule, no lessons recall, no update mechanism.

## 6. Gaps on plan-time parallelization
Absent entirely: dependency graph between work items (only ad-hoc "after/pipelined" notes); file-footprint declaration or overlap check for implementation slices; lane-capacity calculation (machine, Docker, token budget; fixed "five" is a constant, justified by nothing); predicted speed-up or critical path; classification of serial vs parallel parts; wave planning for implementation; a plan-level gate (G1/G2 gate findings); any worktree/isolation rule.
Natural placement: a new subsection in §10's deferred territory, i.e. the phase-design step "after G2" (l.357, l.745-751), as a "plan check" between G2 and implementation; or a new §4.8 / S3 stage (l.111 "S3 not designed yet"). It would reuse §5.3's brief contract (files already named per brief), §7's cost envelope (extend with lane/budget math) and §8 (machine constraints are the capacity input: Docker, one DB, one `npm ci` at a time).
Conflicts with parallel slices:
- Fixed container names `fixflow-w1-db/gates/audit` and "mechanically no second pytest against one DB" (l.620-622) forbid concurrent backend gates; parallel slices need per-lane names/DBs.
- No second `npm ci` at once (l.187); Node 24 vs CI 22 re-run (l.596).
- `expo prebuild`/`run:android` forbidden in `technician-app/` (l.598-600).
- Circuit breaker treats two nulls per slice as a session limit (l.205-207); parallel lanes multiply that risk and the 12-skeptic cap is a per-run budget.
- G1/G2 are single-Fable serial gates reading by id (l.272); many lanes would raise reading load.
- Invariant-sensitive code (outbox, lifecycle, ledger, migrations) is Opus-only (l.96, l.749-750); migration numbering (next 0047, O-07 sketch) is a shared-resource collision point, though the doc never says so.
