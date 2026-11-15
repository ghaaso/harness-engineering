# Evaluation harness for the context system

This folder holds an A/B test for `tools/context_system`. It plays the same scripted work
session to Claude Code in separate sandboxes, lets the context fill up, then asks the same
follow-up tasks in each sandbox and checks the answers with fixed rules.

Nothing here runs unless you start it. A live run uses your Claude usage; the dry run does not.

## Before a live run

1. Log in the bundled Claude Code yourself. The harness never logs in for you.
   The dry run prints the `claude.exe` it would use, for example
   `%APPDATA%\Claude\claude-code\<version>\<build>\claude.exe`. Run that file with
   `auth login`, then check with `auth status`.
   If `auth status` reports `loggedIn: false`, every live command stops with exit code 2 before
   anything is created.
2. Start live runs from a plain terminal, not from a shell opened by a Claude Code session.
   Such a shell passes that session's environment variables to the sessions under test. The
   harness removes the ones it knows change behaviour and lists the rest.
3. Your user-level settings (`~/.claude/settings.json`) reach every sandbox. If they set
   `autoCompactWindow`, `autoCompactEnabled`, `precomputeCompactionEnabled`, `hooks` or
   `modelSettings`, the harness stops, because those keys define the arms. Remove them for the
   run or pass `--allow-user-overrides`.

## How to run

Use any Python 3.10 or newer. `-B` keeps Python from writing cache files next to the system
under test.

| Purpose | Command |
|---|---|
| Dry run: check everything offline, no model call | `python -B -X utf8 run.py --dry-run` |
| Mechanics check: show the plan | `python -B -X utf8 run.py --profile mechanics` |
| Mechanics check: start | `python -B -X utf8 run.py --profile mechanics --yes` |
| Quality comparison: show the plan and forecast | `python -B -X utf8 run.py --profile quality` |
| Quality comparison: start | `python -B -X utf8 run.py --profile quality --yes` |
| Continue after a usage limit, timeout or Ctrl+C | `python -B -X utf8 run.py --continue <run dir> --yes` |
| Rebuild the results of a run from its saved files | `python -B -X utf8 run.py --report <run dir>` |

Without `--yes` a live command only prints the plan and the token forecast and creates nothing.

Run directories go to `%LOCALAPPDATA%\ctx-eval\<run name>` (change with `--root` and `--run`).
Keep these paths short: Claude Code names a project's transcript folder after its path.

Useful options: `--size full|fit`, `--arms system,native,handoff,reference`, `--window`,
`--min-compactions`, `--handoff-at` (default 300000), `--ref-limit` (default 950000),
`--tasks E1,E2,E3,E4`, `--variants resume,fresh`, `--turn-timeout`, `--eval-timeout`,
`--max-turns`, `--allow-fewer-compactions`, `--claude <claude.exe>`, `--python <interpreter for
the hooks>`, `--seed`. Dry run only: `--keep-going`, `--keep-temp`, `--real-transcript <file>`.

### The two profiles

| | quality | mechanics |
|---|---|---|
| Model and effort | `claude-opus-5-5`, `xhigh` | `claude-sonnet-5-5`, `low` |
| Extra settings | `--settings {"ultracode":true}` | none |
| Compaction window | 400,000 | 150,000 |
| Default arms | system, native, handoff (`--size fit` adds reference) | system |
| Compactions required before the tasks | 3 (2 with `--size fit`) | 1 |
| Follow-up tasks | E1 to E4 | E3 |
| Step time limit | 90 minutes | 30 minutes |
| What it can show | see "What a result can and cannot show" | whether the hooks fire. **Not evidence of quality.** |

Both profiles call `claude -p` with `--setting-sources user,project,local` and never with
`--bare`, so project and local settings (where the hooks live) are loaded as in normal use.
The window is not a command-line flag: it is written as `autoCompactWindow` into the sandbox
project's `.claude/settings.json`. The dry run prints the exact command lines.

### Stopping and continuing

One step is one `claude -p` process. The run state (`run.json`) is saved before and after
each step. A usage limit, an error, a timeout that keeps recurring, or Ctrl+C stops the run
(exit code 3, or 130 for Ctrl+C) and prints the `--continue` command. When you continue:

- a step whose prompt had reached the session is finished with a short "my limit has reset,
  please continue" message in the same session;
- a step whose prompt never arrived is sent again;
- an interrupted follow-up task is set aside (`aborted-N`) and run again from the snapshot.

A single step that exceeds its time limit is stopped and followed by `continue` in the same
session, up to `--timeout-retries` times (default 2), before the run halts.

## The four arms

Each arm has its own copy of the generated project, its own copy of the context system, its
own `.claude` settings and its own transcripts. All arms receive the same scripted turns, the
same number of turns, and the same model, effort and settings.

| Arm | Setup | What the comparison isolates |
|---|---|---|
| `system` | Installed by the sandbox's own `ctx.py install`: hooks, rules file, `autoCompactWindow`, `precomputeCompactionEnabled=false` | The system as you would use it |
| `native` | Only `autoCompactWindow` and `precomputeCompactionEnabled=false`. No hooks, no rules | system minus native = what the hooks and rules add beyond compacting at the same window |
| `handoff` | No window. When context passes `--handoff-at`, the handoff prompt is sent and the next turn starts a fresh session that reads the handoff | The earlier manual handoff loop |
| `reference` | No compaction and no handoff: the whole history stays in context | What the model does when nothing is lost. Only with `--size fit`, and only while the history stays under `--ref-limit`; otherwise the arm is marked invalid |

## The scenario

`harness/scenario.py` generates a fictional water utility's meter reconciliation project
(documents, data files, starter code) from a seed, plus a script of user turns. Ordinary work
turns carry planted items that are never labelled as test items: instructions to keep, two
corrections, a decision with its reason, two rejected approaches, facts given only in
conversation, facts from files read early, evidence that has to be combined from distant
turns, and work that is deliberately left unfinished. Extension turns add reading until the
required number of compactions has happened.

After that, four follow-up tasks (E1 to E4) ask for work that only comes out right if those
items are still known. The task wording names none of them.

## Restarts and branches

Each follow-up task is run twice in every arm:

- `resume`: on a fork of the arm's session (`--resume <session> --fork-session --session-id <new>`),
  so the task sees the session exactly as it stood;
- `fresh`: in a new session that is told where the project's notes are. In the handoff arm a
  final handoff is written first and the fresh sessions read that.

Before the first task the project is copied to a snapshot. Every branch starts from the
restored snapshot, its changes and reply are saved under `eval/<variant>-<task>/`, its
transcript is moved out of the arm's transcript folder, and the project is restored again.
So tasks cannot affect each other, their order does not matter, and the main session never
contains a task.

## Scoring

Scoring is deterministic: rules in `harness/scoring.py` read the files a branch changed and
its reply. No model judges anything. Each check is passed, failed, or unscorable (nothing to
judge; listed, never counted).

Categories: `correction_applied`, `distant_evidence`, `rejected_avoided`,
`instruction_kept`, `conversation_fact`, `unfinished_work`, `early_file_fact`,
`decision_applied`, `repeated_work_avoided`.

## What is measured

From the transcripts and the driver's own records, per arm:

- context size: peak and floor per compaction cycle, overall peak;
- compactions: count, trigger, tokens before, and the pause around each (from timestamps;
  it includes the summary request and the hooks);
- handoffs and sessions;
- model requests and tokens (input, cache writes, cache reads, output), including subagents;
- retrieval calls (`ctx.py recall search` / `show`);
- rereads: the same file range read again in one cycle, and files read again after a compaction;
- repeated work: full rewrites of a file, repeated shell commands;
- wall time per step kind, timeouts, limit stops, API errors;
- what the system's hooks left on disk: snapshots saved, restored and superseded, summaries
  filed, hook errors;
- what the transcript proves about the profile (model, effort, ultracode, the real compaction
  threshold) and what it cannot prove (setting sources, `precomputeCompactionEnabled`, absence
  of `--bare`: those are known only from the driver's command line);
- writes outside the sandbox (should be none).

Per branch: the same counts from the point where the task was asked.

`results.json` in the run directory holds all of it; `--report` rebuilds it.

## What a result can and cannot show

- **The mechanics profile is not evidence of quality.** It uses a smaller model, low effort, a
  150k window and one task. It answers one question: around a real compaction, did the hooks
  save a snapshot, restore it, file the summary, put their notes into the conversation, and
  log no errors.
- **One scenario, one run per arm.** Model output varies between runs. A difference of a few
  checks between arms can be chance. One run does not support a general claim; repeating it
  (another `--seed` changes names and values, not the structure) shows how stable a difference is.
- **Scoring covers the planted items only.** It does not judge writing quality or anything
  else Claude did. A branch that does nothing still passes the "left alone" checks (data
  untouched, finished zones not redone), so read those together with the task's other checks.
- **Scripted user.** The turns are fixed; nobody reacts to what Claude says.
- **The handoff arm follows a fixed rule** (hand off past a token count). Your own judgment
  about when to hand off is not modelled.
- **Print mode, not the desktop app.** The harness drives `claude -p`. Sessions in the desktop
  app can differ in environment variables and attachments.
- **Version.** The system's compaction threshold and hook timing were checked on Claude Code
  2.1.293. The harness uses a running or the newest installed bundled version and says so;
  pass `--claude` to choose.
- **The dry run's simulated run is not a result.** Its transcripts and answers are fabricated;
  it only shows that the harness itself works.
- The required number of compactions depends on real token growth. If the script runs out
  first, the run halts and can be continued with `--allow-fewer-compactions`.

## Estimated usage

From `harness/estimate.py`, printed before any live run. Every constant in it is an
assumption (requests per turn, tokens per reply, context after compaction), not a measurement.
The low and high figures differ by the assumed number of model requests per turn (6 or 20).
Most tokens are cache reads of the growing context, re-sent with each request.

Quality comparison, default (`--size full`, at least 3 compactions):

| Arm | Turns | Requests | New input | Context re-sent (cache reads) | Output |
|---|---|---|---|---|---|
| system | 36 | 283 to 963 | 1.2M | 49.5M to 163.9M | 255k to 867k |
| native | 36 | 283 to 963 | 1.3M | 51.5M to 172.0M | 255k to 867k |
| handoff | 36 | 292 to 972 | 1.3M | 50.8M to 170.2M | 263k to 875k |
| all three | | | | 156M to 512M tokens in total | |

Quality comparison with the reference arm (`--size fit`, at least 2 compactions):

| Arm | Turns | Requests | New input | Context re-sent (cache reads) | Output |
|---|---|---|---|---|---|
| system | 26 | 222 to 762 | 0.8M | 36.2M to 120.5M | 200k to 686k |
| native | 26 | 222 to 762 | 0.9M | 38.1M to 128.3M | 200k to 686k |
| handoff | 26 | 228 to 768 | 0.9M | 36.9M to 124.9M | 205k to 691k |
| reference | 26 | 220 to 760 | 0.9M | 91.9M to 318.1M | 198k to 684k |
| all four | | | | 208M to 698M tokens in total | |

Mechanics check (system arm only): 4 turns, 41 to 141 requests, 2.8M to 9.4M tokens of
context re-sent, about 3M to 10M tokens in total.

## The dry run

`run.py --dry-run` checks the harness offline and exits 0 only if every section passes:

- (a) the scenario generates, is deterministic and passes its own audit;
- (b) a sandbox is created for every arm under a temporary folder with a temporary
  `CLAUDE_CONFIG_DIR`; the real project, `tools/context_system` and your `~/.claude` settings
  are compared before and after;
- (c) the `system` arm is installed by its own copy of `ctx.py` and `ctx.py doctor` reports OK
  there; the `native` arm has the two window settings and nothing else;
- (d) the step runner is exercised with the Python interpreter standing in for `claude.exe`,
  then two complete runs are simulated through the driver with fabricated transcripts,
  including usage-limit stops, a timeout, handoffs, fork and fresh branches, and continuing
  from `run.json`. In the `system` arm the installed hook commands really run against the
  fabricated transcript;
- (e) known-good and known-bad answers are scored for every task and category;
- (f) the metrics are computed on temporary copies of two real transcripts and compared with
  `ctx.py measure`;
- (g) the command lines of a live run are printed, and checked against `claude --help`;
- (h) the token forecast is printed.

It starts `claude.exe` only for `--version`, `--help` and `auth status`.

## Where things are written

- Run directory: `run.json`, `results.json`, and one folder per arm (`sys`, `nat`, `hof`,
  `ref`) with `p` (the project), `cs` (the copy of the context system), `prompts`, `logs`,
  `snap` and `eval`.
- Claude Code writes each sandbox's transcripts to its usual place,
  `~/.claude/projects/<name derived from the sandbox path>/`. These are new folders; existing
  ones are not touched. The system's runtime files for the `system` arm are inside that folder.
- The harness never writes to this repository and never deletes a run. To clean up, delete
  the run directory and the matching folders under `~/.claude/projects`.

## Files

- `run.py`: entry point.
- `harness/driver.py`: plan, run state, turn loop, branches, report, command line.
- `harness/scenario.py`, `textgen.py`: the generated project, script, tasks and reference solution.
- `harness/sandbox.py`: arms and their sandboxes, snapshots, outcome collection.
- `harness/claude_cli.py`: finding `claude.exe`, login check, command lines, running one step.
- `harness/metrics.py`, `scoring.py`, `estimate.py`: measurements, scoring, forecast.
- `harness/dryrun.py`, `simulate.py`: the offline checks and the stand-in for `claude.exe` they use.
