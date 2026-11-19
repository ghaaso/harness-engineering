# REFUTE P0 and GATE: verdict (2026-11-19)

Blind review, Opus, per `research-tree/build/briefs/REFUTE-P0-GATE.md`. Nothing committed. No hook or setting was
edited. Every probe ran on copies in the scratchpad: the guard copy was wired to this repository's manifests and
journal through a `.git` file, and the gate ran in temporary fixtures. Commands were judged by the hooks but never run.

**Verdict: not a pass. Six findings break: four in the record guard and commit check, two in the gate.** No false
refusal would stop the build.

## Breaking findings: the input that shows each, and the smallest fix

1. **Evidence under `docs/program/evidence/` that the manifests do not list is unprotected.** 1,063 of the 4,042
   tracked files are not listed. One of them is `docs/program/evidence/harness-bottlenecks/graph2/embeddings/COORDINATOR-REPORT.md`,
   which CLAUDE.md names. CLAUDE.md rule 1 covers all of them.
   - Input: an Edit of that file (`old_string` `a`, `new_string` `b`) exits 0. The commit check would also pass
     the change, since `isArchived` knows only `recovered/` and the manifests.
   - P0 saw this and left it (its departure 4).
   - Fix, in the guard: in `archivedBy`, treat a path under `docs/program/evidence/` that HEAD holds
     (`git -C <top> cat-file -e HEAD:<rel>`) as archived. New and untracked files still pass.
   - Fix, in the check: add the same prefix to `isArchived`. The check refuses only M, D, R and T, so additions still
     pass.
2. **Uncommitted journal lines can be dropped through git forms the guard does not read.** In the main checkout
   `r57.jsonl` has uncommitted lines. There, `git reset --hard` and `git checkout -- .` are refused, but these
   commands exit 0:
   - `git checkout -f main`
   - `git switch -f main`
   - `git switch --discard-changes main`
   - `git stash`
   - `git stash push -- library/journal`

   The same holds for PowerShell `git stash`. This applies once the Bash and PowerShell matcher is registered.
   - Fix, in `gitCmd`: handle `checkout -f`/`--force <branch>`, `switch -f`/`--force`/`--discard-changes`, and
     `stash` with no subcommand, `push` or `save`, the way `reset --hard` is handled:
     `hitPath(locate(gcwd).top, 'restore', ...)`.
3. **A journal Edit can change the last line.**
   - Input: an Edit of `r57.jsonl` with `old_string` = its last line and `new_string` = that line +
     ` {"id":"r57-9998"}` exits 0. The line is changed (README rule 1). The commit check refuses the result later,
     and the repair then needs a non-append edit, which the guard refuses.
   - Fix, in `appendEdit`: the text that `new_string` adds after `old_string` must begin with a newline unless
     `old_string` ends with one.
   - No test guards this rule (mutant GA below).
4. **Some path forms are not brought to the real path.** An Edit of `recovered/co_count.js` exits 0 through each of
   these forms:
   - `\\localhost\c$\Users\...`
   - `//localhost/c$/...`
   - `\\127.0.0.1\c$\...`
   - `\\DESKTOP-8FQHJAP\c$\...`
   - `\\?\UNC\localhost\c$\...`
   - `\\?\Volume{657980aa-10f0-442d-a5de-4f44a9495451}\...`
   - `\\.\Volume{...}\...`

   The Bash command `echo x > //localhost/c$/Users/.../recovered/co_count.js` also exits 0. The admin share is open on
   this PC: `ls` through it lists `recovered/`. Using these forms takes a deliberate choice.
   - Fix, in `canonical`: map `\\(localhost|127.0.0.1|::1|<hostname>)\<d>$\` to `<d>:\`. Pass a `\\?\Volume{...}`
     path to `realpathSync.native` without stripping its prefix.
5. **The gate counts a unit as done once its done file exists, even while its helper still runs or after it returned
   LIMIT with a partial file.**
   - Inputs: S0.1a, S0.1b and S0.1c have ended; S0.1d still runs with `facts/Wallow.md` written. Then
     `analyse: S0.3 ...` on opus is allowed. Likewise, with S0.3 running and `branches.md` written,
     `refute: S0.3 ...` is allowed.
   - Fix: in `notDone()`, and for `needs`, a unit that has a helper of role `unit` in `running()` is not done. The
     briefs also say to write the fact file or result file last.
6. **A helper continued with SendMessage is invisible to the gate.** ORCHESTRATION section 3 makes SendMessage the
   parent's first option at a LIMIT, but the helper's SubagentStop has already ended it in the gate's log.
   - Input: W1, OUT and CLAIM are started; SubagentStop arrives for W1; W1 is continued with SendMessage. Then
     `build-invariant: CGATE ...` is allowed, so four units run in B1-1 at width 3. A second W1 builder passes
     likewise when the width has room.
   - Fix: register the gate on PostToolUse for SendMessage and log a start for that agent id. `running()` then keeps
     the latest event per agent, so a start after an end means running.

## What the hooks can and cannot see

**They can see:**
- the paths and contents of Write, Edit, MultiEdit and NotebookEdit;
- the text of every Bash and PowerShell command;
- the Agent tool's inputs.

**They cannot see:**
- what a program does when it runs: script files, `node --test`, the lane's commands;
- paths built at run time: loops, `$(...)`, string concatenation in `node -e`, `child_process` strings, PowerShell
  `$f='...'` with no spaces (`$f = '...'` with spaces is caught);
- writers the guard has no rule for: `awk -i inplace`, `sort -o`, `patch`, `git apply`, `git read-tree -u`,
  `tar -x`, `unzip -o`, `rsync --delete`, `Expand-Archive`, `[IO.File]::OpenWrite`, `IO.StreamWriter`, `ruby -i`,
  `find -exec sh -c`, `xargs` reading from a file;
- a hard link made outside the repository and then written.

**Edge forms that also pass:**
- `(cd x); rm ...`: the guard keeps the subshell's `cd` for the commands after it;
- `nohup` written 21 times before `rm`;
- 20,000 `xargs` words: the guard overflows its stack and allows the call, by its own fail-open rule.

**The commit check sees only `git commit` without `-n`.** These run no pre-commit (tested on a scratch repository
with git 2.56): merges, `git revert` (including the bisection's `git revert -m 1`), cherry-picks and rebases. Writes
that are never committed are not seen either.

## Non-breaking items

1. **Gate id forms.** Only the exact first word after the colon is read. These pass before W1's dependencies are done
   and are left to the tier hook: `w1`, `fx-w1`, `"W1"`, `(W1)`, `` `W1` ``, `W1` followed by a zero-width space,
   and `unit W1`. This is the GATE brief's design, and ROOT-START forbids wording around the gate.
   - Cheap fix: refuse a near miss that differs only in case when its kind equals the unit's kind, and strip quotes
     and brackets.
2. **Gate with a plan.json cut mid-file.** Ids that are missing from the cut text pass. With the file cut before W2's
   row, W2, PLAN, W4 and S2.1 are allowed and W1 is refused.
   - Fix: refuse when a part is among the text's ids or matches `ID_FORMS`.
3. **Gate: starts it does not check.**
   - A unit that has already landed can be started again.
   - `orchestrate: L1` passes, although plan.json and ORCHESTRATION section 0 say there is no L1, and GATE-USE
     lines 11-12 still offer it.
   - GATE's result.md describes 42 rows and 27 units, including an L1 row. plan.json now has 41 rows and 26 units,
     with no L1.
4. **plan.json checked against the plans.** It agrees with ORCHESTRATION sections 2, 3 and 6 and BUILD-PLAN section 2:
   - 26 units and 15 refuters;
   - kinds and models;
   - dependencies: S0.5 after S0.4; S0.3 after S0.1a-d; W2 after W1; PLAN after OUT, CLAIM and CGATE; W3 after W1
     and W2; CLOSE after CGATE and PLAN; W4 after W3, W5 and W7;
   - widths: B0a 4; B0b 2; B1-1 3 (max 7); B1-2 to B1-4 2; S2 1;
   - expected and limit tokens, and done forms.

   It could not be checked against section 13: ORCHESTRATION.md has no section 13 and ends at section 12. Section 0
   (three times), ROOT-START.md (five times, including "section 13 wins") and plan.json (twice) cite it. Sections 2
   and 3 still put the root on Fable, kind orchestrate-deep, with an L1 if the probe passes. Section 0 and ROOT-START
   say Opus and no L1.
5. **Commit check: merges are not checked.** `tools/git-hooks` has no `pre-merge-commit`, so landings are never
   checked as a whole. Two units could add the same id, or a revert could delete journal lines. `git commit -n` and
   `git -c core.hooksPath=/dev/null commit` pass the guard.
   - Fix: add a `pre-merge-commit` that runs the same check, and have the Bash guard refuse `-n`, `--no-verify` and
     `core.hooksPath` on a commit.
6. **The manifests are unprotected.** An Edit of `migration/source-manifest.json` passes. The check reads the
   manifests from the working tree, so dropping an entry and changing that file in the same commit passes both
   hooks.
   - Fix: protect `migration/*-manifest.json`, and read the manifests from HEAD as well.
7. **Journal file without a final newline.** An append to such a file (`>>`, Add-Content, an appending Write) glues
   the new record onto the last line. Guard and check both pass it, because they only test `startsWith(old)`. No
   tracked journal file lacks a final newline today.
8. **Hang on odd input.**
   - Cause: `CALL_RE`'s `Path\(\s*([^()]*?)\s*\)` backtracks cubically on whitespace, and `checkCode` runs on every
     PowerShell command.
   - Measured: a command with `Path(` followed by 2,000, 4,000 and 8,000 spaces took 1.5 s, 12.8 s and over 25 s.
   - What the app does: the settings set no hook timeout. Per the hooks documentation (not observed here), a hook
     that is cancelled or crashes does not block, so the call proceeds after the wait.
   - Fix: `Path\(([^()]*)\)\.`, trimming in code.
   - Other odd inputs exit 0 at once in both hooks: empty, not JSON, 2 MB, missing or non-string fields, a NUL in a
     path. The gate fails closed on a bad batches list.
9. **Timing.** The settings give no `timeout`. A gate check can wait 8 s for its lock and up to 15 s for each git call;
   B1-2's start makes 8 such calls. Under the PC's known blocked program starts this could pass the app's timeout
   and fail open.
10. **Lane.**
    - Two waiters breaking the same stale slot can both enter: the lane uses rmSync then mkdir, where the gate's lock
      renames first.
    - A reused PID keeps a dead holder's slot for up to 26 min.
11. **Mutations (item 5).** Run in scratch copies. Each mutant passes every test of its file, so these seven invariants
    have no test:

    | Mutant | Change | Tests passed | What it lets through |
    |---|---|---|---|
    | GA | `appendEdit` without `!n.startsWith(o)` | selftest 124 of 124 | |
    | GB | `holds()` without its journal line | selftest 124 of 124 | `rm -rf library/journal/2026-11-19`, refused today |
    | CA | check without the duplicate-id error | 8 of 8 | |
    | CB | check without the journal delete or rename error | 8 of 8 | |
    | CC | check without the not-JSON error | 8 of 8 | |
    | LA | lane without the `--timeout-s` clamp | 5 of 5 | a command run with `--timeout-s 3000` loses its slot at 1,560 s |
    | PA | gate without `endTus`, so `--end <tool_use_id>` is ignored | 27 of 27 | |

    The other invariants are guarded: worktree mapping, the A7 path forms, MultiEdit, the A11 shell forms, fail-closed
    manifests, and in the gate kind and model, dependencies, `needs`, same unit, width, pending starts, lock and an
    unreadable plan. P0's old-against-new runs and GATE's 8 mutants killed these; they were not re-run here.
12. **False refusals (item 2).** I ran 23 ordinary commands of a builder or the root, and none was refused:
    - worktree add and remove, lane runs;
    - commits and merges in worktrees, `git revert -m 1`;
    - journal appends by `>>` and by heredoc;
    - `--end`, a branch checkout, a file checkout, `stash pop`, the wake timer;
    - writes and `sed -i` under `research-tree/build/`;
    - `git status` and `git log`, `restore --staged`.

    Two are refused in the main checkout, and both refusals are right while it holds uncommitted or untracked journal
    lines: `git checkout -- .`, and `git clean -fd`, which would delete `bp.jsonl` and `hc1.jsonl`. The gate refuses
    an unrelated helper whose first word after the colon is a planned id such as PROBE or PLAN
    (`read: PROBE facts`); reword it.

## Tokens

42 calls and 8.8 M tokens, read from this helper's transcript (expected 10.8 M, limit 31.2 M). Context was 305 K at
the count.
