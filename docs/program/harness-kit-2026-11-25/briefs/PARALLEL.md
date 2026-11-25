# Brief: the parallel work as commands she runs in a project of her own (one Opus builder)

The owner's words are in `../OWNER-WORDS.md`. Read them first. They outrank this brief.

token limit 10 M (expected about 5 M, basis r58-0104)

Deliverable: harness-kit/parallel/unit.mjs

## Why

This project ran work side by side and measured it (`harness-kit/parallel/SPEEDUPS.md`): several writers by giving
each unit its own copy and landing them one at a time, in one order, through the tests (one writer per file
allowed 3 units at once, this allows 7); the test suite from 596 s to 120 s with files side by side and the longest
in shards; a queue that lets only a few heavy commands run at once. The scripts that did it
(`research-tree/tools/lane.mjs`, `research-tree/tools/land.mjs`, `research-tree/build/facts/lane-measure/shards.cmds`)
carry this repository's layout and `node --test`. The teammate works in a repository of her own (Python, Postgres,
pytest). She must get the same gains there from her check command and paths in one small config, without editing a
script.

Read `../CONTRACT.md` in full (sections 1, 2, 3 and 6). Then, in `harness-kit/parallel/SPEEDUPS.md`, the sections
"Several writers on one file", "The test suite", "The heavy-command queue", "Helpers side by side in the build" and
"Every landing through the tests"; then the header comments of `lane.mjs` and `land.mjs` (the steps and exit codes).

## What to build

1. **The config**, `harness-kit/parallel/kit.example.json`, which the set-up copies to `<project>/.harness/kit.json`
   when none is there. It holds what the commands below need and nothing else: how her test files are listed, the
   command that checks one file (with `{file}`) and the command that checks everything, a timeout for each, the
   branch landings go to, the prefix of unit branches, the folder unit copies are made in (outside the project,
   never inside a `.claude` folder), how many heavy commands the queue runs at once. The defaults are for pytest;
   a second example for `node --test` sits beside it for the tests. Every key explained in a `"//"` field.
2. **`harness-kit/parallel/unit.mjs`** (run as `node <clone>/harness-kit/parallel/unit.mjs <verb> [--project <folder>]`,
   the project defaulting to the folder it is called from):
   - `start <name>`: a branch `<prefix><name>` from the tip of the landing branch and a copy (git worktree) for it;
     prints the folder. A session or helper for that unit works only there.
   - `land <name>`: the steps of `land.mjs`, for any repository: one landing at a time (a lock); `git merge --no-ff`
     of the unit's branch into the landing branch, in a copy kept for landings, never in her own checkout; a textual
     conflict aborts the merge (exit 2); her check runs through the queue; on a pass the merge stays and one line is
     written to `<project>/.harness/landings.jsonl`; on a failure the landing branch goes back to the commit before
     the merge and the line names what failed (exit 1); no result (timeout, no slot) undoes it too (exit 5). The
     same exit codes as `land.mjs`. Nothing is pushed.
   - `list`: the units, each with its branch, its folder and whether it has landed.
   - `report`: from `landings.jsonl`: units landed, failed and undone, conflicts, and the seconds waited and run.
   Decide from reading `land.mjs` whether `unit.mjs land` calls it with new options or carries the same steps
   itself. Either way `land.mjs` called as today behaves exactly as today and `land.test.mjs` passes.
3. **`harness-kit/parallel/check.mjs`**: lists her test files from the config and runs them `--at N` at once, each
   through the queue with the one-file command; prints pass or fail per file and the total seconds; exit 1 if one
   fails. `--measure` runs the whole set at 1, 2, 4 and 8 at once (never above the machine's processor count),
   prints the seconds for each and the fastest, and writes them to `<project>/.harness/check-measure.json`: her
   own before and after. It changes no setting. A file the config lists with shards (extra arguments per shard)
   runs as its shards plus nothing else.
4. **The queue**, `research-tree/tools/lane.mjs`: off Windows a timeout stops only the direct child. Make it stop the
   command's whole process group there (start it detached, signal the group); on Windows nothing changes. The
   number of slots stays in its capacity file; add a way to set and read it without editing a file by hand if there
   is none. If the 25 minute ceiling on one command (`MAX_TIMEOUT_S`) can be raised by an option without changing
   how a stale hold is found on this PC, do it; if not, leave it and say what the smallest change is.
   This script is in use on this PC now: work on a copy, test the copy, replace the file in one step.
5. **Tests**, `harness-kit/parallel/parallel.test.mjs`, in a toy git repository made in a temp folder, with
   `node --test` as its check: two units that change different files both land, in the order asked; a unit whose
   change fails the check is undone and the landing branch's tip is what it was; two units that change the same
   lines: the second landing exits 2 and nothing changes; a second `land` while one runs waits or is refused, never
   interleaves; `check.mjs` runs files side by side and `--measure` prints its table. Each call under 150 s.
   The tests must pass in a clone that holds only what `main` holds plus `harness-kit/`.

## What to say plainly in the scripts and the report

- Python is not on this PC: the pytest defaults were not run. Say it in the report and in the example config.
- The steps ran for real in this project's build through `land.mjs`; `unit.mjs` and `check.mjs` have run only in
  their tests. Each prints one line saying so the first time it runs in a project (a file in `.harness/` remembers).
- macOS was not run.

## Hand-back

`docs/program/harness-kit-2026-11-25/in/parallel-report.md`: each file built or changed; every command with its
arguments and exit codes, as a README would show it; the config's keys; test counts (and `land.test.mjs` before and
after if you touched `land.mjs`); what is not tested; what you could not do, with the smallest change. Return under
1,500 tokens.
