# Brief: the rules every session loads, the README, and the final coverage table (one Opus writer)

The owner's words are in `../OWNER-WORDS.md`. Read them first. They outrank this brief.

token limit 6 M (expected about 3 M, basis r58-0105)

Deliverable: harness-kit/README.md

## Who reads what you write

The teammate, who has not followed this project, works on a Mac in a repository of her own (Python, Postgres,
pytest), and her Claude Code sessions. The owner's test of the kit: she sets it up from the README alone, all her
work then follows the method, she gets the speed-ups the documents name, and what is on trial she can see for
herself. Nothing may be left out, and nothing called proven that no record measures.

## What you have

- `../CONTRACT.md`: the kit's parts, kit mode, the eight marks.
- The hand-backs of the builders: `../in/hooks-report.md` (what each hook holds in kit mode, `tokens.mjs`,
  `basis.json`, the start hook), `../in/parallel-report.md` (the commands, their arguments and exit codes, the
  config). A third builder is writing the set-up while you work: its flags are fixed by `SETUP.md` beside this brief
  (`--apply`, `--project <folder>`, `--no-usage-tool`, `--status`, `--remove`), and `harness-kit/setup.mjs` is the
  truth once it has changed.
- `harness-kit/COVERAGE.md` as it stood before the build: 4 tables, one row per item of the four sources, each with
  a mark and a last column saying `in` or `missing: ...`.
- `harness-kit/README.md`, `ORCHESTRATION.md`, `RESULTS.md` as they are; `harness-kit/parallel/SPEEDUPS.md`.

## What to write

1. **`harness-kit/RULES.md`**, the short rules the start hook puts into every session. At most 6,000 characters:
   every session pays for every line. Numbered K1, K2, ... One line each, as an instruction, with the number and
   record where one is measured. First what the hooks will refuse and how to pass (the kind and model on a helper,
   the limit line with a basis, the cap and state file in `.harness/`, the meter before a wave, the deliverable
   line, the width file, the hand-over past the window line), then the commands for parallel work, then the rules
   no hook can see. Every row of `COVERAGE.md` marked `loaded` must be carried by one of these rules; several rows
   may share one. This file is loaded by every session, so it is written at the quality of its sources: no rule
   that the records do not hold, no softened or raised standing.
2. **`harness-kit/COVERAGE.md`, final.** Keep every row and its `#`. From the hand-backs and the files themselves:
   - last column: `in` where the part now exists and the set-up switches it on; where something could not be built,
     the row's mark becomes `cannot` with the reason and the smallest change;
   - `loaded` rows: "by what" names the rule, `RULES.md K<n>`;
   - `hook` rows name the hook, `command` rows the command file, exactly as they are called;
   - a row becomes `trial` when its part is in the kit and switched on but either the source calls the rule a
     hypothesis, designed or decided and never run, or the part's form for her project has run only in its tests;
     "by what" then says how she sees whether it works (which log, which printed number, which before and after);
   - `design` rows say what building it takes, from the source.
   Head the file with: what it is, the eight marks, the count of rows per source and per mark (count them by
   script), and one line saying plainly that `design` and `result` were added to the five marks so that no row
   claims more than is true. No row without a mark; no row left saying `missing`.
3. **`harness-kit/README.md`.** Keep what is true; rewrite what is not. It must hold, in this order:
   - what the kit is, in three lines;
   - **Set-up**: for the clone, and for a repository of her own (`--project`), the one command, what it wires and
     makes, how she sees it held (`--status`, the clean-clone check), the terminal case (`--no-usage-tool`);
   - **What holds your sessions after set-up**: one table, hook by hook: what it refuses, how a session passes,
     where its log is;
   - **The speed-ups and how to get each**: one entry for each gain of `parallel/SPEEDUPS.md` she can reach (several
     writers by own copies landing through the check in one order; the queue for heavy commands; the test suite
     side by side and in shards; helpers and readers side by side; the model by kind of job; the window ceiling and
     hand-over; limits with a basis and her own measured costs): the measured figure with its record and what it
     was measured on, then what is wired or the exact command she runs in her repository;
   - **On trial: see for yourself**: each part marked `trial`, what was decided, and the command, log or number that
     shows her whether it works;
   - **Designed, not built**: each `design` part and what building it takes;
   - what is proven and what is not; macOS (not run on this PC: keep every line true against the code as it now
     is, and remove a line the builders made untrue); where everything is, `COVERAGE.md` included.
4. **`harness-kit/ORCHESTRATION.md` and `RESULTS.md`**: change only a line that is no longer true (a rule that was
   a habit and is now checked; a path that moved to `.harness/`).

## Rules

- Your files: the `.md` files directly under `harness-kit/`. Nothing else. You have no edit tool: write whole files,
  and for the coverage table change rows with a small script and check the row count before and after.
- Plain words, short sentences, no em dashes, no pitch. Figures first. Paths and commands in backticks.
- Every command you print must exist: run it with `--help` or read the file. Do not run the set-up with `--apply`
  in this repository's own folder.
- Evidence is never edited. No commit.

## Hand-back

`docs/program/harness-kit-2026-11-25/in/docs-report.md`: each file written with its size; rows per mark in the final
table; every row whose mark you changed and why; anything the README could not truthfully say. Return under 1,200
tokens.
