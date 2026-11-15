# Codex context evaluation plan

Status: proposed experiment, 2026-10-11. No quality benchmark was run to create this plan.

## The result we want

Find the smallest working memory that lets Codex continue real work correctly after
repeated compaction, without spending the saved context on repeated searches, reads,
memory maintenance or retries. Success means preserved task quality at materially
lower measured input, not merely a small checkpoint file.

Use only the completed `../context_system/` harness and this Codex adapter. The two
unfinished Clinic coding/context systems are excluded from implementation, fixtures
and evaluation sources. Synthetic fixtures must not contain real clinic records,
cinema secrets, production data or private conversation exports.

The current adapter supplements native compaction. It does not replace the native
summary or lower the compaction threshold. Therefore there are two separate hypotheses:

1. **At the same compaction settings**, the adapter improves useful task retention.
2. **At matched task quality**, the adapter permits a smaller working context and
   lower cumulative input than native Codex or an ordinary maintained task file.

An improvement in only the first is a reliability benefit, not proven compression.
An improvement against native that disappears against a plain task file supports
using the simpler task-file workflow. Retain that outcome as a legitimate result.

## What the existing evidence establishes

`live-mechanics-report.json` records three manual compactions per arm with the same
default `gpt-6-astra` model. Both arms answered all five facts correctly each time.
The adapter recorded the expected callbacks and snapshots. The synthetic unit suite
has 39 passing tests and one symlink test skipped on this Windows account.

The small live test is not a quality benchmark:

- The evaluator wrote the correct answers directly into the adapter's task file.
- Repeated questions and answers refreshed the same facts before later compactions.
- There was no intervening task, tool use, autonomous state maintenance or retrieval.
- It did not collect token usage. Its `complete` flag records execution completion.
- Native always ran first. Adapter cycles took longer in that tiny sequential sample;
  isolate and measure that overhead rather than treating those timings as causal.

The configured 6,000/9,000 limits count Python characters, not UTF-8 bytes or model
tokens. Recall can return a large journal record containing both text and its payload;
the 1 MiB event-ingestion limit is not a bound on rendered recall output. These are
measurement and output-budget gaps to fix before claiming low-byte operation.

## Measurements: keep the units honest

| Quantity | Definition and use |
| --- | --- |
| Restored memory bytes | UTF-8 bytes of the complete delivered `additionalContext` string, including headings, provenance, paths, warnings and changed-file appendix. Measure startup instructions separately and include them in total overhead. |
| Recall bytes | Complete model-visible search/show output, including metadata, errors, cursors and every page; record per response and cumulative per continuation. |
| Wire bytes | Serialized hook/tool transport output. Record separately: JSON escaping is not the same as decoded model-visible text. |
| Memory tokens | Count only with a tokenizer verified for the chosen model; otherwise explicitly label an estimate or leave unknown. Never assume four characters per token. |
| Reported request input | Runtime-reported `last.inputTokens`, after validating its update semantics. Sample immediately around compaction/continuation and at work checkpoints. This is a request-input measure, not continuous context occupancy. |
| Cumulative usage | Validated deltas/final values of thread totals: input, cached input, output, reasoning and total. Include descendants, compaction and retries when covered; disclose missing components. Do not sum cumulative updates or double-count reasoning/cached subtotals. |
| Working context | Report request-input median, p95 and maximum plus pre/post-compaction observations. Do not substitute configured threshold or model capacity for observed input. |
| External storage | Journal/state/snapshot disk bytes and growth. Storage is separate from model context, but reads from it count when delivered. |
| Work and time | Correct artifacts, repeated investigations, retrieval calls, model/tool/hook time, total elapsed time and local RAM/CPU/disk use. |

The installed app-server schema exposes `thread/tokenUsage/updated` with thread/turn
IDs, `last`, `total` and nullable `modelContextWindow`. Capacity is not occupancy.
The protocol does not expose a complete native compaction summary or its exact byte
size. Do not claim exact total-context bytes when that content is unavailable.
Use exact bytes for observable adapter payloads and reported input tokens for the
whole-model comparison. Missing telemetry is unknown, never zero.

Capture these through supported app-server events, not private Codex transcript
parsing. The official [app-server documentation](https://learn.chatgpt.com/docs/app-server)
describes token-usage, item and hook notifications. Validate what the installed
version actually reports before relying on those fields.

## Comparison arms

All main arms use isolated synthetic projects, the same model and reasoning effort,
the same task material, tool access, output limits, non-adapter instructions and
time limits. Record the resolved configuration and model, including any rerouting.

| Arm | Behavior | Question answered |
| --- | --- | --- |
| D: native default | Normal native compaction settings; no adapter instructions or hooks | Does the proposed workflow improve today's practical baseline? |
| N: native small | Native alone at each tested smaller threshold | Is reducing the threshold sufficient by itself? |
| M: task-file control | Same smaller threshold, agent-maintained bounded task file and ordinary file reads; no automatic restore or journal | Does simple disciplined note-taking provide the benefit? |
| A: full adapter | Same smaller threshold, agent-maintained state, bounded restore and bounded recall | Does the complete adapter justify its overhead? |

Development-only component comparisons: checkpoint without recall; recall without
automatic restore; and a minimal hook restoring the same checkpoint. A perfect
checkpoint supplied by the evaluator is allowed only as a separately labelled
diagnostic upper bound, never as primary evidence. A full-history reference is useful
only for workloads that fit the model; do not call a compacted thread uncompacted.

All arms may create normal working files. M and A get the same blank state template,
state-writing guidance and milestone opportunities. The evaluator must never fill
in the correct state or repair omissions. Charge all state-writing turns and tools.
Automatic compaction can occur between milestones, so stale state is part of the test.

Only the adapter varies across arms. Do not disable all hooks in a real project to
create the baseline. Use fixtures without unrelated hooks, verify native hook trust
normally, and keep experimental instructions out of baseline projects. Disable
cross-session memory injection for fixtures using supported per-run settings and
verify effective settings; do not alter the user's global configuration.

Run two evidence-access tracks separately:

- **Practical workflow:** each arm gets the capabilities it would actually have;
  journal access is part of A's treatment. Report this capability difference.
- **Retrieval control:** give the control arm an equivalent searchable archive of
  the same permitted source events. This separates the benefit of stored history
  from the adapter's selection/restoration method. Keep evaluator answers outside it.

## Budget search

Begin at a **4 KiB complete restore ceiling**. On development tasks, compare 2 KiB
and 8 KiB; add 1 KiB only if 2 KiB remains effective. One KiB means 1,024 UTF-8 bytes.
Reserve wrapper space before selecting whole blocks. Never split a multibyte
character or silently chop a decision halfway through. Report which blocks did not fit.

Introduce byte-aware configuration as a new adapter version before this sweep;
retain the current character-limited version as a recorded baseline. Check actual
delivered strings, not only an internal selected-block length. Test English, Urdu,
mixed scripts, emoji, code and long paths so ASCII-only fixtures cannot hide overruns.

Use a proposed recall ceiling of 2 KiB per returned page and 8 KiB cumulatively per
scored continuation, including search results. A page must carry a source reference,
range/continuation information and an omission indication. Requests beyond the cap
are visible budget exhaustion, not a silent truncated success. Trial a larger recall
budget separately if needed; include that extra context in the comparison.

For native compaction, pilot total-scope thresholds of 64k, 32k and 16k tokens, in
that order. These are candidate triggers, not promised hard context ceilings. Skip
any level too small for the measured fixed prefix plus a usable turn, and report the
reason. Leave the model's actual context capacity unchanged. Keep threshold scope
identical across paired arms and record it. Codex documents both total and
body-after-prefix accounting in its
[configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

Do not run the complete combination grid. First establish a viable threshold with
D/N/M/A at 4 KiB. Then vary memory bytes, then recall, keeping everything else fixed.
Select one candidate on development data before opening the held-out results.

## Workloads and hidden grading

Build six small scenario families with real executable outcomes. Reuse useful
scenario/scoring ideas only from the completed harness; add different task structures,
not merely renamed facts from its single water-utility scenario.

| Family | Example continuation and what must survive |
| --- | --- |
| Requirements and corrections | Implement a synthetic booking rule after two earlier requirements were superseded; exact limits and latest instruction must win. |
| Debugging and recovery | Finish a failed restore/configuration task using an old failure result; avoid repeating an already disproved investigation. |
| Distant evidence | Join a schema rule, an exception and an identifier introduced far apart to produce a correct patch or report. |
| Decisions and unfinished work | Continue an interrupted implementation while preserving the reason an apparently attractive alternative was rejected. |
| Exactness and uncertainty | Preserve opaque IDs, units, numbers and provenance; distinguish observed results from proposals; say unknown for facts never supplied or not captured. |
| Tool/subagent work | Reconcile worker findings, conflicting stale notes and a parent correction; finish the actual parent task after compaction. |

Vary relevant-information density, fact age, order, distance and the number of
compactions. Include credible distractors, similar identifiers, changed files,
contradictions, large outputs and historical text containing instructions that must
remain evidence rather than acquire authority. Include impossible-to-answer probes.
Some facts should exist only in conversation, some only in documents, and some in
transient tool output. Label each availability class in the hidden evaluator.

For example: an early task says a booking hold lasts 10 minutes; a later correction
says 7 minutes only for the kiosk flow. Much later, ask for an expiry-worker fix
while an old log and a worker note still say 10. Grade the actual behavior for both
flows and the retained exception, not whether the final response repeats “7”.

The agent sees ordinary task requests, never rubric labels, answer keys or future
probes. Keep answer keys in the evaluator and expose only fixture data to task tools;
putting a grader in a sibling directory is not sufficient access isolation. Verify
that task tools cannot read evaluator artifacts or another arm's files. If that cannot
be enforced in the selected runner, disclose the limitation and do not call the
grading access-isolated. Hidden tests must require
positive work: leaving everything unchanged cannot pass through negative checks.
Use executable assertions, artifact comparisons and event evidence first. If prose
needs judgment, blind reviewers to arm/budget, calibrate a fixed rubric, and report
disagreements. A model judge must not be the sole judge of its own memory quality.

Score distinct questions at different boundaries. Diagnostic recall probes run in
separate copies/episodes and never feed their answers back into the main work stream.
Do not count five facts or repeated cycles inside one episode as independent trials.

## Main scores and proposed pass criteria

Freeze scoring weights and critical rules before confirmation. Compute a task score
from required successful actions/artifacts, macro-average families, and separately
report complete-task success. Also report correction precedence, exact-fact recovery,
unsupported assertions, appropriate abstention, repeated work and per-family scores.
Never let an average mask a violated critical constraint.

These are ambitious **acceptance targets**, not measured results:

| Gate | Proposed requirement |
| --- | --- |
| Quality preserved | A retains at least 95% of D's mean task score, with the lower bound of the paired 95% confidence interval for A minus D above -5 percentage points. D must itself be competent (at least 90% mean score); otherwise diagnose the workload/model before interpreting savings. |
| Low working input | At least 50% lower observed median request input than D on equivalent scored continuation points. Also publish p95/max and all work requests so cherry-picked checkpoints cannot hide large rereads. |
| Whole-episode efficiency | At least 25% lower cumulative reported input than D, including memory maintenance, recall, retries and captured compaction/descendant usage. Report output separately; a large output increase prevents an overall cost-saving claim without validated cost accounting. |
| Adapter adds value | On frozen small-context settings, improve task score over N or achieve comparable quality with less input. Show a meaningful advantage over M as well; otherwise recommend the simpler workflow. |
| Critical behavior | No observed cross-session contamination, ignored critical correction, corrupt state accepted as valid, invented exact evidence or hidden byte-budget overrun. Report the denominator and uncertainty; zero observed failures is not proof of zero risk. |
| Operational overhead | Target local hook p95 below 1 second and end-to-end median no more than 25% slower than D. Report p95 latency and timeout rates; a quality win with excessive latency is a tradeoff, not an unqualified pass. |

For M, define the minimum worthwhile advantage on development data before freezing
confirmation: initially target either at least 5 percentage points better task score
at matched input, or at least 20% less input at non-inferior quality. Publish both
comparisons, not only the favorable one.

The headline chart is quality against measured input, with marker labels for restore
and recall bytes. A second chart shows quality against cumulative episode usage.
The desired point is the smallest context meeting the quality gate, not the largest
ratio obtained by deleting necessary information. Also show recall bytes/calls and
latency so external storage cannot hide the cost of repeatedly rebuilding context.

Report effective context gain as the native input needed to reach the frozen quality
target divided by the adapter input needed to reach that same target, using only
tested settings. A gain of 2x means equivalent measured quality at half the input.
If a crossing was not measured, give a bound or say unknown; do not extrapolate.
Show paired uncertainty for savings as well as quality. Dividing a huge archive by
a tiny checkpoint is a storage ratio and must not be presented as this gain.

## Fairness, uncertainty and reproducibility

Pair scenario seeds across arms, randomize/counterbalance arm order, and keep local
load comparable. Scenarios can seed facts and scripts; do not claim model sampling
is deterministic. Repeat a subset in separate time blocks and report variation.
Record cached input separately; do not describe cache hits as context reduction.

Use a frozen development/held-out split with different structural variants. Target
60 independent held-out episode blocks, ten per family, with each selected arm run
on every block. Report paired episode-level confidence intervals, stratified by
family; repeated checkpoints remain clustered within an episode. A small pilot is
for debugging and variance estimates, not proof of superiority. Freeze sample size
after development; do not keep adding runs until a desired p-value appears.

Store executable version/hash, adapter source hash, configuration, fixture/rubric
hashes, scenario seed, selected model/effort, arm order, resource limits and raw
supported events. Separate `run_finished`, `measurement_valid`, `quality_pass` and
`efficiency_pass`. Preserve failures. Infrastructure-invalid runs get an explicit
reason and a sensitivity report; ordinary tool/model errors, timeouts and adapter
failures count in end-to-end reliability. Never silently discard weak runs.

This approach follows the general guidance to define objectives and metrics,
include representative/edge/adversarial tasks, and calibrate grading in
[OpenAI's evaluation guide](https://developers.openai.com/api/docs/guides/evaluation-best-practices).
The experiment is local tooling; it does not depend on a hosted evaluation product.

## Execution stages and stopping rules

| Stage | Work | Exit gate / resource bound |
| --- | --- | --- |
| 0. Measurement and bounds | Build reliable event collection, byte-bounded output, fixtures and graders; replay synthetic events and validate scorers with deliberately good/bad artifacts. | No model calls. Output caps, offline accounting invariants and isolation must pass before the live pilot. Actual provider reporting semantics remain for stage 1. |
| 1. Instrumented pilot | Two independent paired N/A cases (four episodes), then at most two targeted automatic-compaction/child-usage probes. | At most six episodes, 1M reported input tokens, 40k output tokens or one hour, whichever first. Validate complete telemetry and event correlation. |
| 2. Development search | Four scenario variants with D/N/M/A at 4 KiB; up to eight extra runs to compare 2/8 KiB or a component ablation. | At most 24 episodes, 8M reported input, 250k output or eight hours. Freeze the candidate, rubric and confirmation sample size. |
| 3. Held-out confirmation | Target 60 paired blocks with D/M/A (180 episodes). Add N to the frozen manifest if development shows it is the stronger small-context control or a same-threshold superiority claim is intended. | Before launch, write an explicit token/output/time cap using measured pilot costs and available usage. Forecast all arms, retries and descendants. If the affordable cap cannot support the fixed sample, report exploratory evidence, not confirmation. |
| 4. Long-session and failure stress | Test automatic mid-turn compaction, fresh resume, multiple workers and long heterogeneous histories using the frozen candidate. | Begin with six paired episodes, expand only for an unresolved deployment question under a separately recorded cap. |

Stage caps are proposed defaults, not usage forecasts or a request to launch all
stages. The runner must persist results continuously, monitor usage events during
turns and check cumulative usage before new dispatch. Reserve capacity for in-flight
requests, stop new dispatch at the cap, and interrupt active test threads and their
descendants. A turn can contain multiple model requests; usage can arrive late.
These are soft operational token limits, not guaranteed billing ceilings. Measure
and report all overshoot, including child requests already in flight. If token
accounting is unavailable, stop live expansion rather than pretending the token
budget is enforceable. Keep a separate wall-time watchdog for stalled event streams.

Stop immediately for invalid telemetry, cross-project leakage, uncontrolled output,
or a repeated compaction loop. Do not repeatedly retry quality failures. A transient
transport failure gets at most one separately labelled retry; its usage remains counted.
At budget exhaustion, return partial results and “inconclusive” where appropriate.
This planning task does not launch any of these live runs or change active settings.

## Automatic compaction and local hardware tests

Manual compaction first establishes a controlled boundary. Qualification then needs
native automatic compaction, including a tool result that crosses the trigger and
immediate continuation without another user reminder. Verify actual compaction items,
hook timing, the delivered checkpoint hash and the subsequent correct action.

Vary total unique encountered history separately from simultaneous context: start
around 32k/64k source tokens, then 128k, then 300k-400k across an episode if earlier
gates pass. Report source-history tokens, repeated/cumulative input and peak request
input separately. A 400k-long history processed in small windows does not mean a
400k simultaneous context. Do not manufacture scale only by repeating filler text.

Test parent-only, child-only and simultaneous compactions. Correlate child IDs and
usage through supported events; compaction hooks do not guarantee an `agent_id`.
If correlation is incomplete, do not claim subagent isolation or complete usage.
Test restart after snapshot, duplicate/missing callbacks, disk-write failure,
checksummed corruption, task switching and a correction arriving during compaction.
Failures must visibly fall back to native behavior without claiming restored coverage.

Use the local CPU/RAM for fixture generation, executable grading and real multi-process
stress at 1, 4, 8 and 16 hook writers. Threads alone do not prove process-lock behavior.
Measure journal search at 100, 1,000 and 10,000 events with a 256 MiB fixture-storage
cap. Keep failed interleavings reproducible. Run latency comparisons without competing
stress workloads. The current adapter is standard-library Python and needs no GPU.
Hosted Codex inference remains account usage; local hardware does not replace it.

A future local GPU summarizer or reranker is a separate treatment: freeze its model,
count its latency/memory/energy and test quality against the same held-out work.
Do not add one until a measured selection/retrieval bottleneck justifies the change.

## Implementation order and deliverables

1. Extend/replace the small evaluator's client: retain all supported usage/item/hook
   events, correlate thread/turn/item IDs, distinguish interrupted/failed/completed
   turns, verify compaction completion, handle cancellation and persist partial runs.
2. Add complete-output UTF-8 bounds and bounded, paged recall without duplicate raw
   payload. Test changed-file appendices, Unicode, wrappers, huge blocks and errors.
3. Build isolated scenario factories, hidden graders, manifests and a dry-run mode
   requiring no model/auth data. Separate mechanics fixtures from real-work episodes.
4. Complete offline event-replay accounting checks. Then use the capped live pilot
   to verify plain/tool turns, manual/automatic compaction and child usage. Establish
   whether compaction/child usage is already included before aggregation; expose
   coverage gaps. Do not derive private native summary bytes.
5. Run the capped development search after the pilot is valid. Fix measurement bugs
   before selecting a configuration; never tune on held-out failures.
6. Produce a frozen confirmation manifest, resource forecast and quality/input plots.
   Run confirmation and long-session stress only as subsequent execution work.
7. Publish a concise verdict: **use**, **revise**, **prefer simple task file**, or
   **inconclusive**, with evidence, failures, byte/token budgets and practical limits.

The next concrete task is steps 1-3: trustworthy measurement and enforceable output
budgets. Larger live tests before those changes cannot answer the user's question.
