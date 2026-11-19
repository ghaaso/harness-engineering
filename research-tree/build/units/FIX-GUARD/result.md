# FIX-GUARD result: the review's breaking findings in the record guard and the commit check (2026-11-19)

Brief `research-tree/build/briefs/FIX-GUARD.md`; findings from `research-tree/build/refute/P0-GATE.md`. Opus helper, main
checkout, nothing committed. Status: **done**. All tests pass, and the record guard now runs on Bash and PowerShell.

## Files changed

| File | Change |
|---|---|
| `.claude/hooks/record-guard.mjs` | version 2. Written as `record-guard.next.mjs`, tested, then put in place by a rename |
| `.claude/hooks/selftest.mjs` | 78 new cases (F1-F5, GA, GB); each made-up-repository run has a timeout |
| `tools/check-commit.mjs` | version 2: `docs/program/evidence/` added to `isArchived`. Written as `check-commit.next.mjs`, then put in place by a rename |
| `research-tree/build/units/P0/check-commit.test.mjs` | 11 new cases (F1, CA, CB, CC) |
| `.claude/settings.json`, `library/.claude/settings.json` | only the record guard's matcher: `Write\|Edit\|MultiEdit\|NotebookEdit\|AskUserQuestion\|Bash\|PowerShell` |
| `tools/git-hooks/pre-commit` | unchanged |
| new: `research-tree/build/units/FIX-GUARD/` | this file; `old/` (the five files as they were); test and mutant outputs (`*.txt`) |

## Findings, tests, before and after

Every test below fails on the old code and passes on the new, except the controls (marked "pass on both"). The old
code was run from `old/`. The old guard ran from a temporary copy in `.claude/hooks/`, which has since been removed.

| Finding | What the new code does | Tests | Old | New |
|---|---|---|---|---|
| 1. Evidence under `docs/program/evidence/` | Guard: a file there that the checkout's **own** HEAD holds is archived. HEAD is read with `git ls-tree -r HEAD -- docs/program/evidence`, once per checkout, in lower case. A folder holding such files cannot be deleted. If HEAD cannot be read, the guard refuses (fails closed). Uncommitted and new files still pass. Restoring from git still passes. Check: the prefix is added to `isArchived`; the check refuses only M, D, R and T against the committed checkout's HEAD | selftest F1: `COORDINATOR-REPORT.md` in this repository; in a made-up repository, Edit, Write and MultiEdit; Bash `>`, `sed -i`, `rm`, `rm -rf <folder>` and `git mv`; PowerShell `Remove-Item`; a real `git worktree` whose HEAD holds a file the main checkout's HEAD does not, and the reverse; a worktree whose HEAD cannot be read. 13 refusals and 5 controls. Check F1: change, delete and rename refused, in main and in a worktree at an old base; new files commit. 4 refusals and 2 controls | 13 of 13 and 4 of 4 refusals fail | all pass |
| 2. Dropping uncommitted journal lines | `gitCmd` handles `checkout -f`/`--force`/`-qf` with a branch, a commit or nothing, also with `-b`; `switch -f`/`--force`/`--discard-changes`; and `stash` with no subcommand, or `push` or `save`, with any options. Each is judged as a restore of the whole checkout, as `reset --hard` is. `stash push -- <paths>` is judged for those paths only. `checkout -f`, `switch -f` and `stash -u`/`-a` also count untracked journal files, which they can overwrite or put away | selftest F2: 18 Bash refusals (including `cd library && git stash push -- .` and `git -C <repo> stash`) and 3 PowerShell refusals, in a made-up repository with an uncommitted journal line. Controls: `stash list/show/pop/apply/drop`, `switch main`, `switch -c`, `checkout main`, `checkout -b`, `checkout -f [--] notes.md`, `stash push [-m] -- notes.md`, and `git stash` and `switch -f` where the journal is clean (15) | 21 of 21 fail | all pass |
| 3. A journal Edit changing the last line | `appendEdit`: the added text must start with `\n` or `\r\n`. The only exception is when `old_string` ends the file with its own newline. In every case the old content stays a prefix of the new | selftest F3: text added onto the last line (the verdict's input), one added character, and a MultiEdit whose second edit adds onto the new last line: refused. Controls: an added line, and an `old_string` that ends with the final newline | 3 of 3 fail | all pass |
| 4. UNC and volume paths | `winForm` in `canonical` reads `\\host\c$\x`, `//host/c$/x` and `\\?\UNC\host\c$\x` as `c:\x` for **any** host (on another PC, the same local path is no checkout of this one). Volume and device paths (`\\?\Volume{...}`, `\\.\Volume{...}`, `\\?\GLOBALROOT\...`) keep their prefix and go to `realpathSync.native`. A drive mapped to a share is brought to its path again after `real()`. Refused, because where the write lands cannot be told: another share of this PC (localhost, 127.x, ::1, its name or its addresses), and a device path the file system cannot resolve. `\\.\nul`, `\\.\pipe\...` and similar devices pass | selftest F4: Edit of `recovered/` through `\\localhost\c$`, `//localhost/c$`, `\\127.0.0.1\c$`, `\\<PC name>\c$`, `\\?\UNC\localhost\c$`, `\\?\Volume{...}` and `\\.\Volume{...}`; Bash `>` through `//localhost/c$`; PowerShell `Set-Content` through `\\127.0.0.1\c$`; another share of this PC; a volume that does not exist. 11 refusals. Controls: an ordinary file through the admin share and through the volume path, another PC's share, `> //./nul` (4) | 11 of 11 fail | all pass |
| 5 (verdict item 8). Regex time on long runs of spaces | `CALL_RE`: `Path\(\s*([^()]*?)\s*\)` became `Path\(([^()]*)\)`, and `evalArg` trims. The same class turned up in `canonical`: `/[. ]+$/` took quadratic time (0.86 s at 40,000 spaces). It is now a linear loop (`trimDotsSpaces`) | selftest F5, each stopped after 10 s: PowerShell `Path(` followed by 20,000 spaces; a Bash path with 200,000 spaces before its last letter | both stopped at 10 s (exit null) | about 40 and 60 ms |
| 6. Invariants with no test (verdict item 11, these files) | tests added | GA: a journal Edit whose `new_string` does not start with `old_string`, though the added text starts a new line. GB: `rm -rf library/journal/2026-11-19`. CA: an added record reusing an id. CB: deleting a journal file, and renaming one to the same writer on another day, so only the rename rule can refuse it. CC: an added line that is not JSON | mutants of the new code survive the old tests: GA and GB 124 of 124; CA, CB and CC 8 of 8 | killed: GA and GB each 201 of 202; CA 18 of 19; CB 17 of 19; CC 18 of 19 |

LA (`lane.mjs`) and PA (the gate) are outside this unit's files. PA belongs to FIX-GATE.

## Tests run (final, on the files in place)

- `node .claude/hooks/selftest.mjs`: **202 passed, 0 failed** (`selftest-new-guard.txt`). The old guard on the same cases: 152 passed and 50 failed, all of them the F1-F5 refusals (`selftest-old-guard.txt`).
- `node research-tree/build/units/P0/check-commit.test.mjs`: **19 passed, 0 failed** (`check-commit-new.txt`). The old check: 15 of 19 (`check-commit-old.txt`).
- Mutants: `mutant-*-old-*.txt` and `mutant-*-new-*.txt`.
- False refusals: 1,800 distinct real Bash and PowerShell commands from 169 transcripts of this project were judged by the new guard against today's files (none was run). It took 77 s, about 43 ms a call, and no call took over 2 s. 44 were refused:
  - 15 also by the old guard: `cat >` or `writeFileSync` onto journal files that exist now.
  - 29 by the new guard only. All 29 write to files now committed under `docs/program/evidence/round3-2026-11-18/`: state files, reports and intake samples. **Round 3 kept its working files there and edited them after committing them**: since 2026-11-12, 53 commits changed tracked files under `docs/program/evidence/` (`git log --diff-filter=M`). Those edits are now refused. A later round keeps its working files outside `docs/program/evidence/` until they are final, or writes new files.
- By hand, after the settings change. The hook was live in this session at once:
  - the probe `false && echo x > recovered/co_count.js` was refused by the hook and never ran;
  - `ls ... && wc -l ...` passed;
  - the journal append `printf '' >> library/journal/2026-11-19/r57.jsonl` passed, and the file's hash was the same before and after;
  - `git status --short` passed;
  - a PowerShell `Get-ChildItem` passed.

## Departures and limits

1. An admin share is read as the local drive for any host, not only this PC's names. That also covers its addresses, a fully qualified name, `127.0.0.2` and similar. Another share of this PC is refused rather than resolved: resolving it would need the share table. The admin share `ADMIN$` (C:\WINDOWS) falls under that refusal.
2. The newline rule is stricter than the verdict's in one case: a file that ends with a blank line. The text added there must start with a newline too, so that the commit check would pass it.
3. Not done, being outside the brief: verdict items 5 (`pre-merge-commit`, refusing `-n` and `core.hooksPath`), 6 (the manifests unprotected), 7 (a Write appended to a journal file with no final newline), 9 (hook timeouts), 10 (the lane), and the unseen writers it lists.
4. The guard now costs one node start on every Bash and PowerShell call of every session in this repository, about 43 ms measured.

## Tokens

About 11.5 M tokens over 56 calls, read from this helper's transcript: 10.97 M over 53 calls at the count, plus this
file's last edits (expected 10.9 M, limit 29.2 M). The largest context was about 276 K, under the 330 K checkpoint
mark, so no checkpoint was written.
