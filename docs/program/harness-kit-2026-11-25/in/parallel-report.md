# Parallel unit: hand-back (2026-11-25)

Done. Every test listed below passes. Nothing was committed, pushed or branched.

## Files

| file | state |
|---|---|
| `harness-kit/parallel/unit.mjs` | new: start, land, list, report |
| `harness-kit/parallel/check.mjs` | new: test files side by side; `--measure` |
| `harness-kit/parallel/kitlib.mjs` | new: what both share (project, config, git, file list, queue calls, first-run notice) |
| `harness-kit/parallel/kit.example.json` | new: pytest defaults, every key explained in a `//<key>` note (not run, see below) |
| `harness-kit/parallel/kit.node.example.json` | new: the same config for `node --test`, which the tests use |
| `harness-kit/parallel/parallel.test.mjs` | new: P1 to P6 |
| `research-tree/tools/lane.mjs` | changed on a copy, tested, then replaced in one rename |
| `research-tree/tools/land.mjs` | not changed |

**Decision on land.mjs:** `unit.mjs land` carries the same steps itself and uses the same exit codes. `land.mjs` is tied to
`research-tree/`, to `node --test` and its TAP counts, to the `u/` prefix, to its shard file and to its tree-hash
cache. Adding an option for each would have changed it more than a new script does. Its exit 3 cannot happen in
`unit.mjs`, because every landing merge records its check in a `Land-Check:` trailer.

## Commands (run from the project, or give `--project <folder>`; a unit's copy resolves to the same project)

    node <clone>/harness-kit/parallel/unit.mjs start <name>        prints the copy's folder (<copies_dir>/<name>, branch <unit_prefix><name>
                                                                   from the landing branch tip); a second call prints the same folder. 0 / 64
    node <clone>/harness-kit/parallel/unit.mjs land <name> [test file...]
        0 landed (--no-ff merge kept, one line in .harness/landings.jsonl)
        1 check failed: landing branch reset to the commit before the merge; the line names what failed
        2 textual conflict: merge aborted, branch unchanged, the line lists the files
        4 an unrecorded landing merge failed its re-check   5 no result (timeout 124 / no slot 75): undone
        6 already landed   64 usage or set-up, or another landing is running (refused, never interleaved)   70 internal
        Runs in <copies_dir>/_landing, never in her checkout; check_all, or each named file with check_one
        (queue_slots at once); nothing is pushed
    node <clone>/harness-kit/parallel/unit.mjs list   [--json]     unit, state (landed / not landed: conflict, failed, no result), branch, folder
    node <clone>/harness-kit/parallel/unit.mjs report [--json]     landed, check failed and undone, no result and undone, conflicts,
                                                                   re-checks, seconds waited and seconds run
    node <clone>/harness-kit/parallel/check.mjs [file...] [--at N] [--in DIR]   pass / fail / no result per file and total seconds;
                                                                   exit 1 if a file fails or gets no result; 64 usage
    node <clone>/harness-kit/parallel/check.mjs --measure [--in DIR]   seconds at 1, 2, 4 and 8 at once (never above the processor count),
                                                                   the fastest, and .harness/check-measure.json; changes no setting
    node <clone>/research-tree/tools/lane.mjs [--dir DIR] --capacity [N]   read or set the queue's slots

## Config keys (`<project>/.harness/kit.json`)

`test_files` (glob patterns), `check_one` (word list holding `{file}`, with an optional `{args}` for shard words),
`check_one_timeout_s`, `check_all`, `check_all_timeout_s`, `landing_branch` (default `build`; it must not be checked out
anywhere else, and it is made from HEAD on first use), `unit_prefix` (`u/`), `copies_dir` (`../{project}-units`; refused
if it lies inside the project or inside `.claude`), `queue_slots` (4, capped at the processor count), `shards`
(file to a list of extra-word lists; the file then runs as its shards and nothing else).

## lane.mjs changes (on Windows and in the default folder its behaviour is the same as before)

- Off Windows the command now starts detached, in its own process group. A timeout sends SIGKILL to the whole group.
  SIGINT, SIGTERM and SIGHUP sent to the lane are passed on to the group. On Windows the spawn and the taskkill are as before.
- `--dir DIR`: a folder of its own for slots, capacity and log. The kit uses `<project>/.harness/lane`. Up to the
  processor count of slots are allowed there; the default folder keeps its maximum of 4.
- `--capacity [N]`: reads or sets the slot count without editing a file by hand (the file is written atomically).
- `--max-timeout-s N` raises a single call's ceiling above 1,500 s, up to 7 days. Such a hold writes `max_s` into
  owner.json, and other callers treat it as stale only after `max_s` plus 60 s. A hold without `max_s`, or with a
  smaller one, is judged as before at 1,560 s. Tested: a live hold 30 minutes old with `max_s` 3000 was kept; the
  same hold without `max_s` was broken, as before.
- `land.test.mjs`: 7 of 7 passed against the copy before the replacement (the old file was byte-checked as unchanged
  just before the rename). The live file is byte-identical to the tested copy, and `--capacity` still reads 4 here.

## Tests

`parallel.test.mjs`: 6 of 6 pass in this repository (about 52 s) and 6 of 6 in a temporary folder holding only `main`'s
`research-tree/tools` plus `harness-kit/` and the new `lane.mjs`. Every toy repository lives in the OS temp folder and
uses its own queue folder; this PC's queue and the folders `work/`, `.github/` and `recovered/` were not touched. The
tests cover:

- P1: two units land in the order asked.
- P2: a failing check is undone and the tip is unchanged, for both check_all and named files; a timeout gives exit 5.
- P3: a conflict gives exit 2 and changes nothing.
- P4: a second land while one runs is refused.
- P5: check runs side by side (overlap measured from timestamps), a failure gives exit 1, and shards replace their file.
- P6: the `--measure` table and its JSON file.

## Not tested / not run

- Python is not on this PC, so the pytest defaults were never run. The example config says so.
- macOS and Linux were not run. That covers the process-group kill, the passing-on of signals, and the git and path
  handling there. Docker would have needed an image download.
- The steps ran for real in this project's build through `land.mjs`. `unit.mjs` and `check.mjs` have run only in
  their tests. Each prints one line saying so the first time it runs in a project (`.harness/notice-*.txt` remembers).
- No figure of hers is measured. The speed-ups quoted in the config's notes are this project's own, each with its source.

## Could not do / for the other units

- The set-up should copy `kit.example.json` to `.harness/kit.json` and make sure `.harness/` is ignored. I did not
  touch `.git/info/exclude` or `.gitignore` in her project.
- The kit needs the new `lane.mjs` (`--dir`, `--capacity`). Against `main`'s old lane, `unit.mjs` and `check.mjs` stop
  with exit 64, so the lane has to reach `main` together with `harness-kit/parallel/`.
- `--measure` runs each level through a queue of its own (`.harness/lane-measure`) so that it really runs N at once.
  It does not wait for her project's queue, so it should be run when nothing else heavy is running. The script says so.
- There is no `unit.mjs` verb that removes a unit's copy after it lands. The smallest change is `git worktree remove
  <folder>` followed by `git branch -d <prefix><name>`, by hand or as a fifth verb.
