# A: problem case P built in BAML's own structure (v1, canary line)

## 1. What I reached

Citation shorthand: `[X]` = the URL in this table; quotes are as returned by WebFetch (a small summariser
sits between me and each page, so quotes are not byte-checked). `B` = `https://raw.githubusercontent.com/BoundaryML/baml/canary/baml_language/crates/baml_builtins2/baml_std/`.
`G` = `https://raw.githubusercontent.com/BoundaryML/baml/canary/`.

| Tag | URL (v1 unless marked) |
|---|---|
| SK | G`skills/baml-core/SKILL.md` (v1 agent skill; refused verbatim dump, so read via ~10 targeted queries) |
| ARCH, TESTI, README | G`baml_language/ARCHITECTURE.md`, G`baml_language/TEST_INSTRUCTIONS.md`, G`README.md` |
| ENV, REL, TYPES | G`baml_language/ENV_VARS.md`, `RELEASING.md`, `TYPE_SYSTEM.md` |
| NEW, QS, EXP, PRC | https://new.boundaryml.com , https://boundaryml.com/quickstart.md , `/explore.md` , `/pricing.md` |
| RUN, JRN, SPEC, TURN | B`ai/runner.baml`, `ai/journal.baml`, `ai/spec.baml`, `ai/turn.baml` |
| TOOLS, MCP, CLIENTS, TMO, CTX, EVT, ERR | B`ai/ns_tools/tools.baml`, `ai/ns_mcp/mcp.baml`, `ai/ns_clients/clients.baml`, `ai/timeouts.baml`, `ai/context.baml`, `ai/ns_events/events.baml`, `ai/ns_errors/errors.baml` |
| CC, CCI, CCC | B`claude_code/cli.baml`, `claude_code/ns_internal/cli.baml`, `claude_code/ns_internal/content.baml` |
| ANT | B`anthropic/messages.baml` |
| TT, TR, TRC | B`testing/types.baml`, `testing/runners.baml`, `trace/trace.baml` |
| SYS, FS | B`baml/ns_sys/sys.baml`, `baml/ns_fs/fs.baml` |
| FLO | G`baml_language/crates/baml_tests/baml_src/ns_from_llm_output/from_llm_output.baml` |
| MODE, POL, LOC | G`baml_language/crates/btel_settings/src/mode.rs`, `policy.rs`, `local_files.rs` |
| I2673, I4590 | `https://api.github.com/repos/BoundaryML/baml/issues/2673`, `.../4590` |
| v0 fallback | https://docs.boundaryml.com/llms.txt (index), `/guide/baml-advanced/checks-and-asserts.md` [CHK], `/ref/llm-client-providers/anthropic.md` [ANTv0], `/guide/baml-advanced/collector-track-tokens.md` [COL] |
| GitHub listings | `api.github.com/repos/BoundaryML/baml/contents/...` for skills/, baml_language/, crates/, baml_std/ (directory names only) |

Could not read: `boundaryml.com/agent/guide` (404), `/agent/guide.md` (404), `boundaryml.com/llms.txt` (404); no machine-readable v1 index exists
that I could reach (the v0 `llms.txt` states no v1/agent pages). `beps.boundaryml.com/beps/58` returned only a "BEP Feedback" heading. Issue 2673's
five comments were not returned. ARCH says nothing on tools, journal or Windows. The stdlib `.baml` files above are the nearest thing to v1
reference docs; the `tools:` attachment syntax for an LLM function appears in no page I reached. The user-facing v1 docs are thin; most detail below is stdlib source.

## 2. P built BAML's way

**Shape.** One BAML project (`baml.toml`, `baml_src/`), laid out per SK as numbered step folders (`1_analyst/`, `2_cite/`, `3_skeptic/`, `4_web/`, `5_buckets/`),
prompts in `*_prompt.baml`, logic beside them, tests in `*_test.baml` [SK, "Project layout"]. The orchestration is itself BAML code running on BAML's
Rust VM, started with `baml run main` [QS: "`baml run main`"; ARCH: "bytecode for BexVM"]. Alternative host: a generated Python/TS SDK [NEW]. Types (INFERRED
from SK `tags: string[] @alias(...)` and TT `type Outcome = "pass" | "fail" | "error";`):

```baml
type Severity = "P0" | "P1" | "P2" | "P3";                // INFERRED
class Claim { title: string  severity: Severity  evidence: Evidence[]
              failing_condition: string  confidence: float  in_field_apk: "yes"|"no"|"unknown" }
class Findings { findings: Claim[]  backlog: BacklogItem[]  open_questions: string[] }
```

**How the repository is read: two routes, neither built in.**
- Route A, Claude Code as the client. The stdlib has `ClaudeCodeClient` (provider `"claude-code"`, `model` default `"haiku"`, `executable` `"claude"`, `cwd`,
  `timeout_ms` 240000, `permission_mode`, `harness_tools`) [CC]. Each model turn runs one `claude -p` process with `--tools` set from `harness_tools`,
  `--json-schema`, `--no-session-persistence` [CCI]. The Read/Grep/Bash loop is Claude Code's, inside one BAML "model call": [CCI] "one CLI run is one model call".
- Route B, BAML tools on `anthropic.Client`. A tool is "plain functions" [TOOLS]; `tool(handler, name, description)` derives the JSON Schema from the signature; the runner runs
  tool calls concurrently (`spawn { self._run_one_tool(...) }`, `baml.future.all`) [RUN]. BAML ships no file or grep tool: [TOOLS] "does not define any built-in filesystem, shell, or grep tools" (fetch summary);
  `baml.fs` has `read`, `read_dir`, byte-limited `File.read`, no line-range read, no grep [FS]; `baml.sys.run(program, args, cwd, capture_output=...)` can shell out to `rg`/`git` [SYS]. So the analyst's `read_range`/`grep` tools are written by us.
  Attachment syntax is INFERRED: TOOLS comment says `tools: [f]` normalises through `tool()`; I found no documented example.
- The reading rules therefore sit in the prompt on Route A. On Route B the 300-line limit lives in handler code, and "list every extra file read" can be derived from `ToolRequested{id,name,args}` events [EVT] instead of self-report.

```baml
client Opus = claude_code.ClaudeCodeClient.new(model = "opus", cwd = "C:/.../repo",
                                                harness_tools = ["Read","Grep","Bash"]);   // INFERRED: params from [CC]
function Analyze(brief: string, facts: Fact[]) -> Findings {
    client: Opus
    prompt: `${rules}\n${brief}\n${facts}\n${ctx.output_format()}`      // form from SK Example 1
}
```

**Step 1, analyst.** `Analyze` above. Return type is the schema, rendered by `ctx.output_format()` [SK: "always inject `${ctx.output_format()}`"]. Run via `F(args)`, shorthand for
`ai.Agent.new(client=...).run(F@spec(args)).value`, or explicitly with `ai.Agent.new(max_steps=12, schema_attempts=2, ...)` [SK]. Result: `ai.RunResult{value, journal, usage}`.

**Step 2, citation check.** Mostly code, not a model: `baml.fs.read(path)` plus a string search, `git log -S` via `baml.sys.run`. A literal-union `status` plus `hash` field carries
`LOCATED|MOVED|DEAD_CITATION|ALREADY_FIXED`. If a Sonnet pass is wanted it is a second function with a Sonnet client. One call per analyst, batched in the input array (INFERRED).

**Step 3, skeptic.** `function Skeptic(c: SkepticInput) -> Verdict`, where `SkepticInput` has only `claim, evidence, failing_condition`; the analyst's reasoning field is absent from the type,
so it cannot be passed (static, `baml check`). Fresh context: each `Agent.run` starts `Journal.new(spec)` whose first event is `RunStarted{spec_name, arguments}` [JRN]; on Route A "each invoke is a fresh CLI process" [CCI].
Verdict is a literal union; the rules ("CONFIRMED needs the path traced") are prompt text plus a post-parse check in code that downgrades to `UNVERIFIABLE` (INFERRED). **Cap of 12**: plain code. `baml.spawn.Limit.new(n)` caps
*concurrency*, extra spawns queue [SK], not count; so sort surviving claims by severity, take the first 12, and emit the rest as `unverified` records. A global cap means a barrier after all analysts, or reserved per-lane quotas; a shared counter's safety under green threads is UNKNOWN.

```baml
let g = baml.spawn.Limit.new(4);                                  // form from SK Example 5
let vs = claims_first_12.map((c) -> { spawn with g { Skeptic(c) } });
let results = await baml.future.all_settled(vs);                  // Success<T> | Failure<E> | Panicked [SK]
```

**Step 4, web re-check.** `baml.http.fetch(url, timeout=...).text()` inside `spawn` [SK] and a substring test in code, or an LLM function on a Sonnet client with `harness_tools=["WebFetch"]` (INFERRED). Unconfirmed becomes `inferred` in the result type.

**Step 5, buckets.** A pure function with `match` over the verdict union; SK/EXP list pattern matching with exhaustiveness checks (EXP: "exhaustiveness checks"), so an unplaced verdict is a compile error. The gate is outside BAML: the Fable session reads what `baml run` wrote.

**Tier and effort per step.** Tier = the client's `model` string. Effort: `ClaudeCodeClient` builds no `--effort` flag [CCI]; `anthropic.Client` has `thinking: ThinkingConfig? = null` (budget tokens) and a `request_body` deep-merge, no effort field [ANT].

**Resume.** Documented: none. `Journal` is an in-memory `log` list with no serialise/persist/replay [JRN]; the runner "has no resume or replay" (fetch of [RUN]); [ERR] says of `StepBudgetExceeded`: "a blind replay is not safe". DIY: write each step's output with `baml.fs.write_atomic`, decode with `baml.json.decode<T>`, skip steps whose file exists (INFERRED). [SK] says a custom `ai.Runner` can add "metering, caching, replay, budgets".

**Journaled.** Per run: `RunStarted, UserMessage, AssistantMessage, ToolRequested, ToolCompleted, ToolFailed, ModelCall(usage, timing, http), FinalProduced` [EVT]; `on_event` streams them, a throwing listener cannot fail the run [SK]. Separately, spans for AI calls are recorded by default (inputs, output, error) [POL: "Default entry input capture for AI invocations"], stored under `.baml/btel/recordings` [LOC], queryable with `baml query` SQL over a `spans` table [SK]. Orchestration decisions (cap, drops) are journaled only if our code writes them.

## 3. Per dimension

**R1 Unit of work.** A typed function: parameters, return class, backtick prompt, client [SK Example 1]. The contract is the return type, not a separate brief+JSON Schema. Schema constraints are limited: literal unions and classes; `@description`/`@alias` documented [SK]; `@assert`/`@check` appear only in v0 [CHK], and v1 TYPE_SYSTEM says nothing on value constraints [TYPES]. Range (confidence 0–1) is checked in code.

**R2 Agentic reading.** Route A delegates to Claude Code's tools (opaque to BAML's journal [CCI]); Route B needs hand-written tools and an API-keyed client. `max_steps` default 12, a tool-failure futility breaker at three identical failures (`if (n >= 3)`), `StepBudgetExceeded` on exhaustion [RUN]. MCP is stdio-only, tools only, no auth [MCP].

**R3 Structure enforcement.** Schema rendered into the prompt, parsed by SAP; on an unparseable reply the agent "re-asks with a correction" up to `schema_attempts` (default 2) without consuming a step [SK; RUN]. Loud: `ParseFailed{raw_output}` after the budget. Silent: in a plain list, refused items are dropped and valid ones kept (FLO, fetch paraphrase of the file's comment), matching open issue "SAP silently discards array elements it cannot coerce" [I4590] (filed against v0 0.17.0). A dropped `findings[]` element is exactly an invisible omission. Route A also passes `--json-schema` to Claude Code, then BAML parses again [CCI; RUN].

**R4 Context isolation.** By signature (the call can only carry its arguments) plus a fresh `Journal`; on Route A a fresh process with no session persistence. Whether that process loads the cwd's project memory/settings is not controlled by any flag in [CCI]: UNKNOWN.

**R5 Control flow.** Green threads: `spawn`, `await`, `baml.future.all/all_settled/race/any`, `Limit`, `CancelToken`, `defer`, typed `throws/catch/catch_all` [SK]. Nulls become typed failures: `RateLimited, NetworkFailure, ProviderError, Refused, ParseFailed…` [ERR]. A "fresh null breaker" is our code counting `Failure`s; recognising a usage limit as such is UNKNOWN (Route A: `is_error` becomes `ProviderError`, non-zero exit `InvalidRequest` [CCI]).

**R6 Failure visibility and resume.** Rich per-run journal and typed errors, local span recordings; no cross-run resume (above). `ai.RunResult.usage` is summed per model [RUN]; v0's Collector [COL] is not the v1 mechanism.

**R7 Testing.** `test "name" { … }` passes iff no uncaught throw; `testset` only groups; `baml test`, `-i`, `--list` [TESTI; SK]. Offline: `F@spec(args).parse(saved_reply)`, `.build_request`, a fake `ai.Client` [SK]. Runners `Quorum(n,m)`, `Retry`, `PassRate`, `Sequential`, `FailFast` [TR]. Testable for P: the cap/overflow logic, bucketing, verdict downgrade, parsing of canned replies. Not testable without a live call: whether the analyst finds anything in the live repo ([SK] a live-client test "makes a real request"; TESTI: "do not rely on live LLM calls in e2e tests"). Typed `eval`: "planned, not yet available" [EXP].

**R8 Routing, effort, auth.** Clients are values: `anthropic.Client`, `openai.*`, `claude_code.ClaudeCodeClient`, wrapped by `ai.clients.Retry/RoundRobin/Fallback` [SK; CLIENTS]. Retry: 3 attempts, backoff 250 ms ×2 to 10 s, rejects `Refused/InvalidRequest/ParseFailed/FinishReasonError` [CLIENTS]. `anthropic.Client` key: `ANTHROPIC_API_KEY` via `ai.wire.resolve_credential` [ANT]; billing is the API. `ClaudeCodeClient` resolves no auth itself [CCI], so the `claude` CLI's own login applies (INFERRED).

**R9 Operability.** Section 4.

**R10 The gate.** BAML gives the judge only artefacts we write: result JSON, `baml query` over spans, the human Workflow View and Profiler [EXP]. No dashboard API or eval for a model judge was found.

## 4. What BAML needs to run P here

- **Runtime/install.** Rust toolchain binary `baml`; Windows PowerShell: `irm https://pkg.boundaryml.com/install.ps1 | iex` [QS: "Windows (PowerShell)" listed]. The landing page lists only brew and `install.sh` and states "Not covered: Windows support" (fetch summary of NEW). The wrapper is built for "x64-windows, aarch64-windows" [REL]. Default toolchain channel `canary` (`BAML_TOOLCHAIN`) [ENV]. Bridges download native libs unless `BAML_BRIDGE_DISABLE_DOWNLOAD` [ENV]. No Node, Python or Docker needed for `baml run` (INFERRED); SDK use needs them.
- **Keys/billing.** Route B: `ANTHROPIC_API_KEY`, a second billing/egress path [ANT]. Route A: spawns the owner's `claude`; whether it resolves on Windows (`claude.cmd` shims) is UNKNOWN; `inherit_env` defaults true [SYS], so an `ANTHROPIC_API_KEY` in the environment could redirect billing (INFERRED).
- **Telemetry.** `BAML_TELEMETRY` unset means medium: "If `BAML_TELEMETRY` is unset, the level is medium" [MODE]; AI-call inputs/outputs captured by default [POL] and written locally [LOC], so repo excerpts land in `.baml/btel`. Upload: `BOUNDARY_API_KEY` is the credential "for cloud queries and telemetry" [ENV]; PRC: local BAML "does not call Boundary's servers"; default-off upload is UNKNOWN (transport code unread). CLI analytics have an opt-out (`DO_NOT_TRACK`, `~/.baml/telemetry.toml`) [ENV], so default-on is likely; destination UNKNOWN.
- **Version line/stability.** v1, "currently pre-1.0 … some APIs and tooling may continue to evolve" [NEW]; release channels nightly and canary only [REL]; no stability policy stated. `ClaudeCodeClient` is absent from SK ("claude_code" not found) and I2673 (request for it) is still open [I2673]: treat it as unreleased-in-docs. Source is canary head, not a pinned release.
- **Who fixes it.** Boundary (open source; Discord linked [NEW]). v0 and v1 docs coexist on the docs site; v0 pages say v1 is "a separate language" [CHK].

## 5. Cannot express / could not establish

1. CANNOT (documented): per-step effort. No `--effort` in the Claude Code client [CCI]; no effort field in `anthropic.Client` [ANT]. UNKNOWN whether `request_body` can carry it.
2. CANNOT: observe Claude Code's internal tool reads on Route A; the journal sees one model call [CCI]. File-list self-report only.
3. CANNOT (documented): schema-level `@assert`/`@check` in v1; none in SK, FLO, TYPES. Range and rule checks go in code.
4. CANNOT: guarantee no silent drop of a list element; v1 drops refused items [FLO], issue open [I4590]. Needs a declared count field compared in code (INFERRED).
5. CANNOT: resume a run from a journal; none exists [JRN; RUN]. DIY persistence only.
6. UNKNOWN: the `tools:` syntax attaching a BAML function to an LLM function; the `claude_code` namespace prefix in client declarations; array slicing and shared-counter semantics.
7. UNKNOWN: whether `claude -p` loads cwd `CLAUDE.md`/hooks/user memory into the skeptic; whether a usage-limit error is distinguishable from other `ProviderError`s, and whether `Retry` would re-run it.
8. UNKNOWN: Windows behaviour of `baml run`, `baml.sys.subprocess` finding `claude`, and nested `claude` under a Claude Code session (the CLI reads `CLAUDECODE` for agent detection [ENV]; effect unknown).
9. UNKNOWN: whether `ClaudeCodeClient` is in any released toolchain; telemetry upload default; install footprint.
10. UNKNOWN: model-judge tooling (evals "planned, not yet available" [EXP]); `baml query` schema beyond `spans`/`network_span`.
