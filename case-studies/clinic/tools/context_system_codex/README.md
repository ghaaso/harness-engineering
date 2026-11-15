# Context checkpoints for local Codex

Latest completed comparison: [2026-10-15 results](RESULTS_2026-10-15.md). Persistent
native, maintained-notes and adapter arms all recalled 15/15 facts and completed
the executable task. Two exact 2,894-byte checkpoint restores passed; the first
resumed boundary included startup context and totaled 4,962 bytes. No added
retention or context-efficiency gain was demonstrated. All interruptions and
verifier corrections remain in the qualified independent audit.

Earlier screen: [2026-10-14 results](RESULTS_2026-10-14.md). Native, maintained notes
and adapter all reached their task caps unfinished. Two exact automatic restores
fit below 4 KiB, but no incremental gain was demonstrated. Larger live expansion
stopped; the next study needs an affordable completed control.

Earlier evidence: [2026-10-12 results](RESULTS_2026-10-12.md). Bounded restoration
and automatic compaction passed; the one work comparison used 10.31% more ordinary
reported input with the adapter. High context gains remain unproven.

Adapted only from the completed `../context_system/` harness. Its Claude adapter
is preserved. This adapter is standard-library Python and needs no GPU or server.

## Behavior

- `PreCompact` saves an immutable, checksummed snapshot of explicitly selected
  task-state blocks. Native Codex compaction continues with its normal summary.
- `SessionStart(source=compact)` returns the saved text before continuation.
  Blocks fit whole or are omitted whole. Changes on disk appear separately.
- Startup/resume supplies the focus and recall commands with the current session ID.
- Submitted prompts, tool results, assistant completion messages and subagent results
  are journaled with distinct provenance. Exact search/show uses this journal,
  **not Codex's unstable transcript format**. Earlier conversations and events
  before hook activation are not imported. No automatic whole-account search.
  A submitted-prompt event does not establish human authorship (other hooks can
  generate continuation prompts); authorship is recorded as unknown.
- A clear resets the current checkpoint/focus; it retains the local journal.
- Repeated callbacks, concurrent processes, absent transcripts and damaged data
  have explicit handling. Hook failures report unavailable coverage and allow
  native behavior to continue.

The state selection rules come from the finished harness: explicit
`<!-- ctx:restore -->` blocks first, otherwise a small whole file, otherwise exact
current-state section headings. Newlines are normalized. Keep corrections,
decisions, rejected approaches, unfinished work and next actions concise.

The legacy defaults are a 6,000-character snapshot cap and 9,000-character
restoration cap. Optional `snapshot_bytes` and `restore_bytes` impose an additional
UTF-8 limit on the complete compact JSON hook envelope, including its final newline.
Both character and byte limits apply; a byte count is not a model-token count.
Recall defaults to 2,048 bytes per complete response, with exact paged text,
provenance, integrity hashes and session-bound cursors. Raw payloads are not duplicated.
The SessionStart handler disables Codex output spilling only because the adapter
enforces these bounds. Configuration cannot raise either bound above 20,000.
Native thresholds, model selection, summarizer prompts and tool permissions are
not changed. Large reads are an explicit range-reading habit in this version;
there is no transparent shell-command rewriting or token-threshold reminder.

## Install and use

From this folder, using a real Python 3.10+ interpreter:

```text
python -I -B ctx.py --project <project> install --state-file docs/tasks/current/task.md
python -I -B ctx.py --project <scratch-project> install --state-file task.md --snapshot-bytes 4096 --restore-bytes 4096 --recall-bytes 2048
python -I -B ctx.py --project <project> doctor
python -I -B ctx.py --project <project> doctor --native <absolute-codex-executable>
python -I -B ctx.py --project <project> focus docs/tasks/another/task.md --session <id>
python -I -B ctx.py --project <project> recall search "earlier correction" --session <id>
python -I -B ctx.py --project <project> recall show <ref> --session <id>
python -I -B ctx.py --project <project> recall show <ref> --session <id> --cursor <next_cursor>
python -I -B ctx.py --project <project> snapshot --session <id>
python -I -B ctx.py --project <project> restore --session <id>
python -I -B ctx.py --project <project> uninstall
```

Installation merges seven project-local hooks into `.codex/hooks.json`, writes
`.codex/context-system.json` and an ownership record, and appends an owned block
to `AGENTS.md`. Unrelated configuration/instructions are preserved. Unowned
configuration is refused. Uninstall retains modified owned content for review
and retains runtime evidence. Malformed JSON is refused before mutation.

By default, runtime files go under `.codex/context-runtime/`, with a local ignore
file. An explicit `--runtime` can select a different directory. The cinema pilot
uses its already ignored `.data/codex-context/`. Journal inputs are capped at
1 MiB per event; larger inputs produce a coverage warning instead of being
silently truncated. There is no retention/prune command in this first adapter;
uninstall stops capture without deleting evidence.

Windows commands use an explicitly named PowerShell executable and an encoded
command to preserve paths literally under either shell. The decoded command is
included in the installation record as `windows_source` for review. No execution
policy or security setting is changed.

Codex requires review/trust of the exact hook definitions. Installation does
**not** change the native trust store. Review these project hooks in Codex's
hook browser (`/hooks` in the CLI) and resume/start the project chat afterward.
`doctor --native` calls only initialize and hooks/list: no turns, model calls,
trust changes or transcript reads. Local registration alone does not prove
that the hooks are active in an already running desktop conversation.

## Verification

```text
python -B -X utf8 -m unittest discover -s tools/context_system_codex/tests
```

Run from the Clinic project root. Tests use synthetic temporary projects only.
They cover exact block selection, omission budgets, Unicode, checksums,
repeat/clear/changed-file behavior, concurrent writes, session/path isolation,
historical provenance, unavailable storage, rollback and ownership-preserving
installation, and the real Windows command runner.

Observed on 2026-10-11: 40 tests, 39 passed and one native symlink test skipped
because this Windows account cannot create symlinks. A Windows extended-path
prefix race exposed by concurrent writes was reproduced and fixed. The tests
are evidence of adapter mechanics, not long-context model quality.

On 2026-10-12 the extended suite ran 136 tests: 134 passed and two symlink checks
skipped. It covers byte limits, paged recall, supported-event collection, hidden
artifact graders, deferred restoration and spawned-process storage. Latest results
include live observations and retained verifier corrections.

## Live verification

The cinema pilot was installed and its seven exact hook definitions reviewed
and trusted using the normal CLI hook browser. Native hooks/list then reported
all seven enabled and trusted, with no project hook errors.
An additional startup smoke test used the default configuration, with no hook
feature overrides: it captured one startup callback and returned ACK. See
`default-startup-report.json`. Startup context is delivered when the thread
begins work; creating an idle ephemeral thread alone did not capture a callback.

The small live comparison used the default `gpt-6-astra` model, ephemeral threads,
read-only tool permissions and three manual compactions per arm. Both native and
adapter arms answered all five corrected task facts correctly in all three
cycles (15/15 each). The native arm captured no hook events or snapshots. The
adapter arm captured three PreCompact events, three PostCompact events, three
compact-start events and three immutable snapshots. This validates real callback
integration, not a quality improvement over native compaction. See
`live-mechanics-report.json` for the synthetic results.

To repeat the explicit comparison (it calls models):

```text
python -B -X utf8 eval_live.py --codex <codex-executable> --project <trusted-pilot-project> --output <report.json> --yes
```

## Remaining quality evaluation

The gated three-arm [eval_screen.py](eval_screen.py) adds independent note sections,
staged source release, bounded complete tool RPCs, hidden repair/audit grading and
automatic-boundary checks. The October 13-14 screen retained capped outcomes and
one host-suspension retry, counting its usage. Its remaining time allowance was
amended to measured awake time; the original elapsed wall-time breach is disclosed.
The live process temporarily requests Windows idle-sleep prevention and clears it
on exit. Final suite: 151 tests, 149 passed and two symlink-capability skips.
See the results before preparing another model run; no gain gate passed.

The concrete next experiment is in [EVALUATION_PLAN.md](EVALUATION_PLAN.md).
It defines byte/token accounting, native and task-file controls, hidden real-work
grading, a staged budget search and proposed acceptance gates. The 2026-10-12
implementation adds explicit byte budgets, bounded recall and a supported-event
collector. Ordinary-turn usage and separate descendant updates were observed live.
Compaction usage does not increase the reported totals in this runtime, so full
cumulative efficiency remains unverified.

The new [eval_pilot.py](eval_pilot.py) has model-free `dry-run` and `prepare`
commands, then a capped `run` command. It uses two synthetic continuation tasks,
agent-maintained blank state, hidden controller graders, allowlisted read/write/check
tools and counterbalanced native/adapter order. Disposable projects require the
normal hook review flow; no trust bypass or global configuration mutation is used.
Native tool guards have documented coverage limits, so the runner states its access
isolation scope and records unexpected tool routes. Source hashes and pristine
fixture checks prevent externally prefilled answers entering a scored episode.
The older `eval_live.py` remains a separately labelled five-fact mechanics test.

```text
python -B -X utf8 eval_pilot.py dry-run --output <offline-report.json>
python -B -X utf8 eval_pilot.py prepare --workspace <new-disposable-folder> --manifest <manifest.json>
python -B -X utf8 eval_pilot.py run --manifest <manifest.json> --codex <codex-executable> --output <new-report.json>
```

Each prepared pilot permits four work episodes, a soft 1M reported input-token
limit, 40k output-token limit and one-hour watchdog. Mid-turn usage monitoring and
interrupts bound expansion; late/in-flight usage can overshoot a soft cap and remains
reported. Missing per-turn usage, rerouting, output overruns and invalid compaction
evidence stop expansion. A finished pilot is separate from a quality/efficiency pass.

Use a disposable project containing synthetic facts only. Compare native Codex
with this adapter using the same model, prompts and compaction threshold. Cover
automatic compaction and immediate mid-turn continuation, longer windows,
corrections overriding earlier instructions, failed checks and unfinished work,
concurrent subagents, missing callbacks, and output-budget boundaries. Record
answers, model/token usage, checkpoint coverage and wall time. Use the native
hook-review flow for activation. A small mechanics comparison does not establish
quality at 300–400k tokens.

Only explicit `agent_id` compaction callbacks are ignored as subagent callbacks.
The documented compaction payload does not guarantee a subagent ID. An extra
checkpoint for a parent session can therefore occur. It snapshots that session's
explicit state file; no summarizer is told to omit it. Full root/subagent
compaction correlation remains a live-test item.

References: [Codex hooks](https://learn.chatgpt.com/docs/hooks) and
[configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).
