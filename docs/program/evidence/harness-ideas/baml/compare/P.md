# The problem case P, and the dimensions for a structural comparison

Written by the orchestrator on 2026-11-04 from `docs/ORCHESTRATION-DESIGN-2026-10.md` §4.3–§4.6
and §5 at commit 3415b5e (a copy is at
`C:\Users\User\AppData\Local\Temp\claude\C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-harness-ideas-baml-57fde3\6fc590cb-ff83-499d-b6f2-2a45ddb0a464\scratchpad\pr182\docs\ORCHESTRATION-DESIGN-2026-10.md`).
Nothing here is to be installed or run. This is a design comparison on paper.

## P: one deep-dive lane, end to end

The harness's canonical unit of work. One lane of the W2 pass (`fixflow-deep-dive`), for example
O-03 `offline-sync-correctness`:

1. **Analyst** (Opus, high effort). Receives earlier map outputs as inputs (facts with
   `path:line — quote` evidence). Reads the LIVE repository on this machine under reading rules:
   start from the files named in the brief, follow an import one hop when a claim depends on it,
   never read a file over 300 lines whole (grep the symbol, read a range), list every extra file
   read. Returns `FINDINGS`: every defect/risk claim it can evidence, ranked by severity P0–P3,
   each with `path:line` evidence it read itself, a *failing condition* (the input or state under
   which the claim is observable), `confidence` 0–1, `in_field_apk` yes/no/unknown, a fix sketch
   and effort; a `backlog` of claims seen but not written up (title, file:line, severity) so an
   omission is visible, never silent; `challenges_settled` (a settled fact it believes wrong,
   with evidence); `open_questions`.
2. **Citation check** (Sonnet, high), one per analyst, batched: re-locates every quoted line by
   content against the current git state and marks each `LOCATED` / `MOVED` / `DEAD_CITATION` /
   `ALREADY_FIXED(<hash>)`. Establishes only that the cited text exists where claimed.
3. **Fresh-context skeptic** (Opus, xhigh), one per surviving P0 and per P1 touching the outbox,
   job lifecycle, ledger, auth or location privacy; other P1s share one Opus/high skeptic per
   analyst. The skeptic receives **only** the claim, its evidence and its failing condition, never
   the analyst's reasoning, and reads the repository itself. Verdict rules: `CONFIRMED` needs the
   path traced from the cited lines to the failing condition; `REFUTED` needs positive
   counter-evidence (a line that prevents the condition, or a commit that removed it); otherwise
   `UNVERIFIABLE` with `what_would_settle_it`. **Hard cap 12 Opus skeptics per run**; claims over
   the cap go to the open-risks list as `unverified`, never dropped.
4. **Web re-check** (Sonnet, medium), one agent: re-fetches every cited URL and confirms the
   statement is on the page; unconfirmed facts become `inferred`.
5. **The script** derives three buckets from `verdict`: the verified register (`CONFIRMED`,
   `PARTIALLY`), the open-risks list (`UNVERIFIABLE`, over-cap, `DEAD_CITATION`, each with what
   would settle it), refuted (with the counter-evidence). **The orchestrator (a Claude Fable
   session, a model acting as judge with the whole program in view) gates at G2**: re-sets
   severity, spot-reads every refuted P0, records conflicts and why.

Standing constraints of the harness today:

- Scripts are plain JavaScript run by Claude Code's Workflow tool: no imports, no filesystem, no
  Node API; `agent(prompt, {schema, model, effort})` spawns a Claude Code subagent **with tools**
  (Read, Grep, Bash, WebFetch…); with `schema` (JSON Schema) the subagent is forced to call a
  StructuredOutput tool, validated at the tool layer, retried on mismatch; `agent()` returns the
  validated object, or `null` when the subagent dies. Fan-out via `parallel`/`pipeline`;
  concurrency capped; every agent's return value journaled; a run resumes from its id with
  cached prefixes.
- Auth and billing: the owner's Claude Code subscription. There are **no separate provider API
  keys** in use; a tool that needs `ANTHROPIC_API_KEY` is a second billing and egress path the
  owner would have to decide on.
- Machine: Windows 11, Git Bash and PowerShell, Node 24 (CI pins 22), no `python` on PATH, Docker
  Desktop started by the owner only.
- §4.3 breaker: fresh `null`s are read as a suspected session or usage limit, not as "nothing
  found"; an absent result is never "nothing found"; no silent caps (every drop is logged).
- §5: fixed JSON-Schema contracts (`FINDINGS`, `VERDICT`, `CITATIONS`, `RESEARCH`…), a CONTEXT
  block prepended verbatim to every prompt, agents told scope and rules but never their tier,
  "an empty result with `tool_status: web_unavailable` is valid; never fabricate to fill".
- Recorded failures of the harness so far: usage and session limits that killed agents mid-run
  (seven refuters lost in one review); script bookkeeping defects found by review (`not_started`
  on HALT, a swallowed catch, a cached null re-served). Not recorded: malformed output, schema
  retry storms, fabricated citations past the checks.

## The dimensions (R1–R10)

For each, say how P is built in each structure, what property each gives, and which is better
**for P**, with evidence.

- **R1 Unit of work.** How a lane step is specified: a brief plus a JSON Schema, versus a typed
  function with a prompt template and a return type.
- **R2 Agentic reading.** How the analyst and the skeptic read a live repository: a subagent with
  file and shell tools, versus whatever BAML's structure gives an LLM function or an agent loop
  for tool use.
- **R3 Structure enforcement.** Forced tool call with tool-layer validation and retry, versus
  schema rendered into the prompt and schema-aligned parsing with `@assert`/`@check`. Failure
  modes on both sides (what is silent, what is loud, what is lost).
- **R4 Context isolation.** How the skeptic is guaranteed to see only the claim, evidence and
  failing condition, in a fresh context, in each structure.
- **R5 Control flow.** Fan-out, pipelining per analyst, the hard cap of 12 with overflow to a
  bucket, breakers on fresh nulls; plain JS versus BAML's language (v1: agent loop,
  `max_steps`, `schema_attempts`, green threads, or whatever the docs actually say).
- **R6 Failure visibility and resume.** Journal, cached-prefix resume, null on death, versus
  BAML's run result, journal, Collector, trace store.
- **R7 Testing and regression.** None today versus test blocks, testsets, evals. What is
  actually testable for P given that its inputs are a live repository and the web.
- **R8 Model routing, effort, auth.** Per-agent tier and effort through Claude Code, versus BAML
  clients (provider API keys, client options, fallback/round-robin policies). Billing and
  egress paths.
- **R9 Operability on this box.** Install footprint, Windows, telemetry, version line (v0 legacy
  / v1 pre-1.0), maintenance burden, who fixes it when it breaks.
- **R10 The gate.** A model acting as judge with the whole program in view. Whether BAML's
  structure gives the gate anything (evals, dashboards, testsets) or nothing.

Rules for both agents: cite every claim about BAML as `URL — "quote ≤ 15 words"` fetched in this
run, and every claim about the harness as `path:line — quote` from the design copy above. Mark
anything you could not establish as UNKNOWN rather than guessing. Fewer well-evidenced lines
beat many speculative ones. Read, do not install or run anything.
