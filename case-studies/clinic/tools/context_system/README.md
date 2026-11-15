# Context system for long Claude Code sessions

Status: built and checked offline (85 regression tests, harness dry run). Not installed in this project and not yet run in a live session. Whether it keeps the working quality of a long history at 300-400k tokens is unmeasured until the comparison in `eval/` has been run.

## What it does

Claude Code with Opus 5.5 only summarizes ("compacts") a conversation near 967k tokens, so long sessions here reached 731k and 870k without ever compacting. This system makes compaction happen at about 367k and tries to make each compaction lose nothing that matters:

| Part | What happens |
| --- | --- |
| Setting | `autoCompactWindow` 400000 in the project settings: Claude Code compacts once context passes about 367k. It is a trigger, not a ceiling; one step can overshoot it. |
| Before compaction | A hook saves an exact snapshot of the declared task-state sections, a factual ledger of the window (files changed, large reads, failed calls, background results, your prompts) and a raw copy of the window. It tells the summarizer exactly which sections will be restored, and that everything else must be in the summary. |
| After compaction | A hook restores that snapshot word for word, adds anything a second snapshot of the same compaction promised, and reports sections that changed on disk after the snapshot. |
| Before the threshold | One reminder per cycle, about 40k tokens early, to bring the task state file up to date. |
| Reads | A file over 30 KB returns its first page and an outline with line numbers; other ranges are read on request. |
| Recall | `ctx.py recall search "<terms>"` finds exact earlier text in main transcripts, subagent transcripts and the archive; `recall show "<ref>"` opens one hit. Local only, no model calls. |

## What gets restored

Only what the task state file declares, whole or not at all:

1. text between `<!-- ctx:restore -->` and `<!-- /ctx:restore -->`, if the file has such markers; otherwise
2. the whole file, if it is small enough; otherwise
3. whole sections whose heading is exactly one of the names in `config.json` `restore_sections` (Next action, Current state, User instructions and corrections, Decisions, Ruled out, Open questions and a few synonyms; numbering and case are ignored). Sections under a heading marked superseded or historical are skipped.

The state file is the one this session last changed among `task.md`, `state.md`, `handoff.md` and `session_state*.md` inside the project (a `docs/tasks/<id>/task.md` is preferred), or the one pinned with `ctx.py focus <path> --session <id>`. Keep the restorable sections short: the snapshot has about 9,000 characters in total.

## Commands

Run with any Python 3.10 or newer: `python -I -B tools/context_system/ctx.py <command>`.

| Command | Use |
| --- | --- |
| `install --project DIR --python EXE --window 400000` | Writes the hooks to `DIR/.claude/settings.local.json`, the window and `precomputeCompactionEnabled: false` to `DIR/.claude/settings.json`, the rules to `DIR/.claude/rules/context-system.md` and a record of what it changed. Refuses if a settings file cannot be parsed. |
| `uninstall --project DIR [--all]` | Removes the hooks; with `--all` also puts the settings back to what they were, leaving any you changed since. |
| `doctor --project DIR` | Checks the hooks, interpreter, window, background-compaction setting and a hook round trip. Run it after a Claude Code update. |
| `status`, `measure` | Current context size, observed compactions, per-cycle peaks, rereads and recall calls, from the transcripts. |
| `recall search`, `recall show` | Exact recall, as above. |
| `focus <path> --session ID` | Pin one session's task state file (`--clear` to unpin). |
| `prune --days N` | Delete archived raw window copies older than N days. |

Runtime files (snapshots, ledgers, summaries, window copies, the error log) live beside the session transcripts under `~/.claude/projects/<project>/context-system/`, outside this project.

## Limits to know

- The hooks rely on Claude Code behaviour read from the 2.1.293 binary. One part is undocumented: PreCompact output becoming summarizer instructions. The strings involved are also present in 2.1.295; `doctor` and the mechanics run in `eval/` are the checks after an update. If the hooks stop working, the 400k window still applies.
- Each compaction pauses the session while the summary is written; background compaction is off for this account and install turns it off explicitly. The pause length is unmeasured.
- Claude Code fires the compaction hooks for subagent compactions too, without saying whose compaction it is. The hooks assume the main conversation unless a subagent is clearly the one compacting. A wrong guess adds text to a subagent; it does not drop the main restore. When both compact at the same moment, their archived summaries can be filed under each other's tag.
- The interpreter path is stored in the machine-local settings file. If that interpreter moves, the hooks stop silently; `doctor` shows it.
- Hooks see project, local, user and managed settings and the environment, not launch flags. The threshold they report is the configured one; `status` shows where compaction really happened.

## Tests

- `python -B -X utf8 -m unittest tests.test_context_system` from the project root: 85 tests, all in temporary directories.
- `python -B -X utf8 tools/context_system/eval/run.py --dry-run`: the comparison harness's offline check. See `eval/README.md` for the live comparison and its cost.
