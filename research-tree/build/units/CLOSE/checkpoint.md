# CLOSE checkpoint 2 (FX-CLOSE, branch u/CLOSE, worktree MAIN/.claude/worktrees/CLOSE, 2026-11-20)

**Commit d478c7cc** on u/CLOSE, tree clean (effce0f2 the code, 4126cb75 G5 and redo, d478c7cc the T3 tests).
`git merge build` at d478c7cc: already up to date (build tip still 2a8480af), so nothing to rerun after it.

Tokens: helper 1 `CLOSE stop verify build` 22.42 M (116 calls, stopped at 305 K context); helper 2 `CLOSE stop verify
successor` about 6.7 M (54 calls; LIMIT reached at about 175 K context, each call then cost about 175 K). The unit has
used about 29.1 M of its 29.2 M: the next helper needs a new limit from the root.

## Done and tested (lane, from the worktree's research-tree; guard-hook from hx-CLOSE outside .claude/, removed)

| File | Label | Commit | Tests | Pass | Fail | Not run |
|---|---|---|---|---|---|---|
| stop.test.mjs + lib.test.mjs | CLOSE-stop-lib | effce0f2 (unchanged since) | 253 | 248 | 0 | 5 skipped |
| redo.test.mjs | CLOSE-redo | 4126cb75 | 7 | 7 | 0 | 0 |
| guard-hook.test.mjs | CLOSE-guard-hook | 4126cb75 | 30 | 27 | 0 | 3 skipped |
| status.test.mjs | CLOSE-status | d478c7cc | 40 | 38 | 0 | 2 skipped (NA1, NA2: needs the app) |
| watch.test.mjs | CLOSE-watch | d478c7cc | 84 | 80 | 0 | 4 skipped |

Checkpoint 1's list of the code stands (stop request at started; verify (a)-(c) with the wall floor; verify_rounds and
`close-missing`; `lib.fence` reset; anchored close answer; watcher wall floor; contract, spec, brief 5c).

New in helper 2 (d478c7cc):
- status "FX-CLOSE T3 status: close-session on continuing and ended rows, ...": one build over late folder sessions
  (transcript cwd = a stop-confirmed attempt's folder) on rows active/stopped, active/admitted at e2, active/bound,
  committed/stopped -> `close-session <sid>` each; status `owner --act closed` (the script) -> replace-start,
  start-session, none, none. f1-sr (stop-requested, verify_rounds 3, holder claim, another folder session) -> owner,
  still owner after the holder's close, stop-verify after both. Facts rows: fenced log (`lib.outcomeAppend`) ->
  `replace-fence --reason stall`; outcome/0.json `{` -> owner; claim.json `{` -> owner.
- watch "FX-CLOSE T3 watch: close-session due on ...": the same acts as class-17 lines per task (N_max 20), then
  replace-start and start-session, then `stop-verify@-`; with N_max 1 the orphan holds the only slot: close-session
  due, then replace-start after the close.
- watch "FX-CLOSE T3 watch: stop-verify waits for stop_verify_ms ...": sample tick 100, `at` NOW, svm 60000: no act
  at ticks 101-103 (NOW, +1 s, +59.999 s), `stop-verify@100` at +60 s.
- `MAIN/research-tree/build/departures/CLOSE.md` written, items 1-10 (1 is the id gap for S2.2). Add item 11 for the
  e2e edits.

## Left (next step: 1)

1. **The e2e, once.** `git -C MAIN -c core.longpaths=true worktree add --detach C:/Users/User/Documents/projects/hx-CLOSEe2e
   u/CLOSE`; from its `research-tree/`: `node MAIN/research-tree/tools/lane.mjs --label CLOSE-e2e --timeout-s 135
   --wait-s 10 -- node e2e/run-e2e.mjs` (232 steps; keep the Bash call under 150 s). Expected failures from FX-CLOSE:
   `stopCommitted` (e2e:758-767) and the f1-control stop (e2e:632-635): the comparing verify now needs the holder's
   close and the wall floor. Adapt `research-tree/e2e/run-e2e.mjs` only, in the .claude worktree on u/CLOSE: after
   `stop request`, record each session's close by the owner's act (`sc('status', ['owner', '--act', 'closed',
   '--subject', <sid>, '--quote-file', <a plan/notes file>])`; sid = the attempt's claim holder, else its `session`)
   and move the e2e clock past `stop_verify_ms` (thresholds 120000) before the comparing verify (`tick(120000)`, the
   clock helper at e2e:55-56). Never change a script to suit the e2e. Read only those e2e lines, not the whole file.
   Commit, then rerun from the checkout (`git -C <checkout> checkout --detach u/CLOSE`), then
   `git -C MAIN worktree remove --force C:/Users/User/Documents/projects/hx-CLOSEe2e`.
2. departures/CLOSE.md item 11: the e2e edits.
3. result.md last (never at a LIMIT): the table above plus CLOSE-e2e as the files to run at the landing, with
   counts and labels; tokens of every helper; the departures; the id gap for S2.2. CLOSE has no reviewer of its own
   (B1-4's combined review); the root lands it on the result.

## Checkpoint 3 (helper 3, `CLOSE stop verify finish`): all three steps done

1. e2e edited at 572bb8eb (u/CLOSE, the e2e only) and run once from the detached checkout hx-CLOSEe2e (removed):
   lane CLOSE-e2e exit 0, 83 s, `# 239/239 steps ok, 0 FAIL`.
2. departures/CLOSE.md item 11 written.
3. `units/CLOSE/result.md` written: it supersedes this file.
