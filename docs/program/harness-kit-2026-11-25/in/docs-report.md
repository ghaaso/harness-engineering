# Documents unit: hand-back (writer of briefs/DOCS.md, 2026-11-25/26)

Status: done. Nothing committed. Only `.md` files directly under `harness-kit/` were written.

## Files

| file | size (characters) | what changed |
|---|---|---|
| `harness-kit/RULES.md` | 5,992 (limit 6,000; ASCII) | new: K1-K7 what the hooks refuse and how to pass, K8-K10 the commands, K11-K22 rules no hook sees |
| `harness-kit/COVERAGE.md` | 53,960 | final: new head (the eight marks, counts by script); 280 rows kept with their `#`; rows changed by a script (`cov.mjs` in the scratchpad), count checked before and after |
| `harness-kit/README.md` | 26,860 | rewritten in the brief's order: Rust set-up (rustup 1.100.0, Node, git, `--fetch` for the 15 crates.io crates, no fallback), `--project`, `--no-usage-tool`, the clean-clone check, the hooks table by program, the per-call times, "Still JavaScript", eight speed-ups with record and command, On trial, Designed not built, proven and not, macOS, where everything is |
| `harness-kit/ORCHESTRATION.md` | 11,576 | eight lines added to: the count, limit, cap, meter and hand-over rules now checked by the kit's programs; state file in `.harness/`; `tokens.mjs`; `basis.json`; copying the lean types into a project |
| `harness-kit/RESULTS.md` | 8,116 | unchanged: no line had become untrue |

`node harness-kit/basis.build.mjs --check`: "basis.json matches (18 records)", before and after the changes. Not rebuilt.

## The final table

Rows 280 (S 38, E 115, D 42, O 85). Per mark: hook 55, loaded 50, command 6, trial 15, owner's own 49, cannot 0,
design 51, result 54. No row says `missing`. I reran the clean-clone check's own coverage test on this folder: 0 rows
wrong on marks, hook names, command files or `missing`. `hook` rows name the program (`kit-tier-hook`, ...).

## Marks changed, and why

- command to trial (10): S3, S4, S19, E23, E25, D3, D26, D31, D38, O59. `unit.mjs` and `check.mjs` have run only in
  their tests, and the pytest defaults were never run.
- loaded to trial (5): O19, O25, O43, O45 (the source calls the rule a hypothesis), and O64 (shell calls under 240 s:
  written, never piloted, t9-0102).
- cannot to hook (2): O38, O81. `kit-fanout-gate` now holds the meter rule where the session has the app's usage tool;
  with `--no-usage-tool` it is off and `RULES.md` K4 says to read the usage by hand.
- No mark became `cannot`. Every other row kept its mark. "By what" was updated on every `hook`, `loaded`, `trial`
  and changed row; O72 now gives what building the effort check takes (from `hooks-report.md`).

## kit-tokens: what was true when I wrote

When I started, `crates/kit-tokens/src/main.rs` still said "not ported yet". At 23:56-23:58 the second builder D
finished it: its report (`in/rust-D-report.md`, second part) gives `tokens.test.mjs` 8 of 8 against both, and 9 of 9
identical runs side by side. The README and the table say it is finished, built by the set-up with the others, and a
command (no hook runs it). `tokens.mjs` stays the named command because the start hook prints it.

## What the README could not truthfully say

- That anything works on macOS or Linux: nothing was built or run there. It lists six places most likely to need a
  change.
- That a live Claude Code session has run on the kit's settings, or that `--fetch` has run against crates.io.
- That the clean-clone check passes now. Its last run failed only on files still being written then (`RULES.md`,
  coverage rows, `kit-tokens`). It was not run again: it runs cargo, and I was told to make no cargo call.
- Any gain in tokens, time or quality from the hooks, any effort advice, or any "overthinking" figure: no record holds
  one.
- A single command that removes a landed unit's copy: it gives `git worktree remove` and `git branch -d` instead.

## Faults found in other units' files

- None that breaks the kit. Two notes: in kit mode the session must learn its own id for the state file; the README
  points at `tokens.mjs`, which prints the newest session's id first. `kit-count-gate --status` and `--end` must come
  before the kit arguments (the program reads the mode from its first argument); the README's command does that, and I
  ran it read-only against this session.
