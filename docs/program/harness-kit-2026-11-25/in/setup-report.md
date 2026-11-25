# Setup report (the builder's hand-back of 2026-11-25, saved by the top session)

## Files

`harness-kit/setup.mjs`, `harness-kit/check-clone.mjs`, `harness-kit/setup.test.mjs` (15 of 15 pass).

- `node harness-kit/setup.mjs` prints what it would do; `--apply` does it; `--remove` undoes it.
- It writes `.claude/settings.local.json` in that clone (per machine), wiring the kit hooks with that machine's own
  absolute path. Its entries carry a trailing `--harness-kit` argument, so `--remove` takes out only those. It never
  writes `.claude/settings.json`, never sets `core.hooksPath`, never touches a branch.
- `node harness-kit/check-clone.mjs` clones the branch `bilal/promote-first` (what `main` will hold) into a temp
  folder, copies `harness-kit/` in, runs the setup, runs each kit hook's tests, and feeds each kit hook one call that
  must pass and one that must be refused. Exit 0 on the last run (shallow clone, Windows, Node 24.22.1).

## Kit hooks, decided by test in a clean clone

| hook | in the kit | own tests in the clone | what it does for her | what it loses without this PC's files |
|---|---|---|---|---|
| window-ceiling | in | 119 of 119 | refuses calls once a session's window passes its line, so the session hands over | without the owner's state files every session gets the checkpoint line; the separate coordinator line is lost |
| tier-hook | in | no test file of its own; 10 of 10 sample cases in check-clone | refuses a helper whose kind of job does not match its model (the routes) | nothing |
| creep-gate | in | 36 of 36 | refuses rounds of review nobody asked for | only the "owner: r57-NNNN" way past its rules, which needs the record book |
| count-gate | out | 23 of 25 fail in the clone | (limits helpers at once) | two of its tests read this PC's `research-tree/build/WIDTHS.md` and `plan.json`; the hook itself does not depend on them |
| fanout-gate | out | 37 of 37 | (a limit with a basis, the meter before a fan-out) | it would refuse ordinary work elsewhere: every helper start needs a meter reading from the desktop app's usage tool, and every stated limit must cite a record in the record book |

Not candidates, they hold this owner's own rules or work: record-guard, owner-report, library-start, plan-gate,
journal-watch, migration-gate, owner-guard.

## What she needs on her machine

Node 20 or later, git, Claude Code; the clone at a path without `"`, `$`, backtick or backslash. Two lines in
`.gitignore`, which the setup prints (the `.gitignore` on `main` ignores neither): `.claude/settings.local.json` and
`.claude/logs/`. A route that names Fable needs access to Fable. `main` carries the archived FixFlow skills and
agents but not the settings file that switches them off on this PC, so they load in her sessions unless she
switches them off herself (they cost about 8,000 tokens a session here: record r57-0155).

## Not tested

macOS and Linux were not run: this PC is Windows. No live Claude Code session ran on the kit's settings: the hooks
were fed their input through the commands the settings hold, in a shell.

## Smallest changes that would bring the excluded parts in (not made)

- count-gate: its two tests skip when `research-tree/build/WIDTHS.md` or `plan.json` is absent.
- fanout-gate: skip the meter rule where no usage tool exists, and skip the record lookup where the record book is
  absent, keeping the rule that a limit is above its expected figure.
- tier-hook: its five cases moved out of `selftest.mjs` (which needs the record book) into a test file of its own.

## Read-only checks

The eight lean helper types (`.claude/agents/lean-*.md`) and `.claude/hooks/tier-routes.json` hold nothing of this
PC: usable as they are. `research-tree/tools/lane.mjs` runs on macOS and Linux as written, with one fault there: a
timeout kills only the direct child, not its whole process tree.
