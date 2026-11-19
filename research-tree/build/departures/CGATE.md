# CGATE departures (FX-CGATE, branch u/CGATE, 2026-11-20)

Where the build departs from FIX-fence 3, FIX-JOIN and the S0.5 skeleton, why, and the test that shows it.

## 1. The id-space gap: the hook's close records cannot be found by a CLI id (the main one)

- **What.** A caller is named by the hook input's `session_id`: the CLI's id, a lowercase UUID (F-P1b). The app's
  session tools (`archive_session`, `stop_session`) take the app's id, `local_<uuid>` (CGATE M1: 27 past calls;
  the app's record `claude-code-sessions/<a>/<b>/local_<id>.json` holds both `sessionId` and `cliSessionId`; the
  app's `getSession` looks up app ids only). So the hook names `run/close/intent/<t>.json` and
  `run/close/done/<t>.json` by the **app id** `t` (the only id the stop call carries), while FX-CLOSE verify (a)/(b)
  and FX-CLAIM step 7 look dones up by the claim holder's **CLI id**. No hook done matches until a map exists.
- **What the hook can name.** The caller (CLI id, from the hook input), the target (app id, from the tool input),
  the call (`tool_use_id`). It never sees the target's CLI id.
- **What a close falls back to.** The owner's act `status.mjs owner --act closed --subject <CLI id> --quote-file P`
  (built here, D10): the owner line, then `run/close/done/<CLI id>.json` {kind:'close-done', outcome:'owner',
  by:null}, a record already there kept. Safe (nothing counts a close the owner did not see), liveness through the
  owner. The coordinator brief (5d) tells the coordinator to hand an unreadable answer to the owner.
- **Why not more.** A bare UUID given to archive answers "Session <id> not found." while the session lives (M1): a
  CLI id as a stop target would write a false `no-such-session`, which H3 would count for the coordinator's own
  start and free a live slot. So a CLI id is never a target (`bad-target`).
- **Candidate maps (for FX-CLOSE or the root, not built):** (a) a PostToolUse step on the start tool that records the
  app id the start returns in the attempt folder (`wt/<T>-e<E>/`), so verify can translate; (b) the app's own record
  above (internal, not a stable interface).
- **Tests.** guard-hook G3 (a CLI id, `self`, a path are `bad-target`, nothing under `run/close/`), G5 (dones by app
  id); status S1 (the owner's `closed` by CLI id only).

## 2. Names in guard-hook

`SESSION_ID_RE` (lowercase UUID: callers, `coord-session` files) and `APP_SESSION_ID_RE` (`local_` + that UUID: stop
targets, close record names), not `SID_RE`: FX-CLAIM may declare `SID_RE` in the same module, and two `const`s of
one name are a SyntaxError at landing. Test: G1-G5.

## 3. The stop tools and the Post mode

- `session_tools.stop` holds both `archive_session` (the process stop of 6(a)) and `stop_session` (it interrupts a
  working child's turn so archive can run; the session stays open, M2). Both get a close intent before the call;
  only an archive answer can give `stopped`. Thin item 2 named one stop tool.
- Outcomes from the result text (M2): `Archived session <t>` followed by ` (` or `.` → `stopped`; `Session <t> is
  already archived.` → `stopped` (the process is gone; it completes a record lost when a Post hook died); `Session <t>
  not found.` → `no-such-session`; any other text (stop_session's interrupt, `Archiving this session...` deferred,
  still working, held) writes nothing and exits 0: the close stays open and falls back to the owner (1).
- **PostToolUseFailure** is handled beside PostToolUse (M3: the CLI has the event with `error`; that MCP error texts
  arrive there is inferred, not observed). Both settings entries carry the stop tools' matcher.
- A record already at a close name passes when it has the same kind and target (a retried close; the first record
  stands), else `record-tamper`. Tests: G3, G5.

## 4. The start tool's shape (D6)

The start target is the start tool's `cwd`, required **absolute** and exactly `<root>\wt\<T>-e<E>`; `use_worktree:
false` required; `context` absent or `fresh`; `target` absent or `local`; `host`, `preset`, `environment`,
`repository`, `proposal_id`, `source_branch`, `branch_name` absent (a JSON `null` counts as given), else `bad-target`
(the measured schema, M4 / PROBE 4). **FX-W3's brief section 6 must name `cwd` (absolute) and `use_worktree: false`**,
or every start is `bad-target`. `start.json` holds the caller's CLI id. Test: G4.

## 5. Bind by nonce (D7, D9)

- `handover bind --nonce X` replaces `bind --session`; `--session` with bind is 66. The hook's bind step reads
  `run/` with `fs.readdirSync` (not through `io`), and an earlier `coord-session-<k>.json` without a string
  `session_id`, or unreadable, disqualifies the caller. `no-nonce` (coord.json has no nonce and names another
  session than the file) records no incident; `nonce-mismatch` and `not-bound` do. `init` writes a nonce whenever it
  creates coord.json, also with `--session` (the hook still needs `coord-session-1.json`). A dry run names no nonce.
- The brief's bind command is written in the hook's tcb-node grammar: forward slashes, a path with a blank quoted.
- **W1's exec allow-list must admit `handover.mjs bind --root R --ce N --nonce X`** (and may refuse `--session`):
  step 6 runs before step 2, so a list without it denies the successor's bind (Wallow.md line 62 names the gap).
- Tests: guard-hook G1, G2; handover T11 (rewritten), H1, X1, T6 (brief carries coord.json's nonce).

## 6. Settings permissions

`settings/coordinator.json` gets the two Post entries only (FIX-fence's file table: "a Post entry"); no
`permissions.allow` entry for the three MCP tools, so the harness may ask for them: the owner's installation
decides (needs the app; not tested).

## 7. Lines outside the CGATE steps (shared lines, for the landing)

- guard-hook.mjs: `parseInput`'s event check (now `HOOK_EVENTS`); `profileShapeError`'s extra-field loop line and
  its `return` (now `sessionToolsError`); one line after `const pass` (the Post dispatch).
- handover.mjs: the usage comment line of bind; `FLAGS` (`session` no longer required, `nonce`); the `RUN_DIRS` line
  with `run/`; the `briefLine` call (`briefNoncePart(nonce, root, ce)`); the two coord values of init and raise.
- status.mjs: one dispatch line in `runOwner` (`closed` is handled before the `ACTS` check, so `ACTS` is unchanged).
- selftest.mjs: its own `profileShapeError` copy takes `session_tools` (else the static check `role-files` fails the
  shipped coordinator profile); one line after the `hard-links` block (`close-folders`).
- Tests: guard-hook.test.mjs `makeWorld` (one statement after coord.json), T14 (coordinator keys, extras = the
  session tools, the Post entries); selftest.test.mjs `makeRoot` (one statement) and T11 (one block).
- Not touched: the U3-F8 (mapper) lines of `profiles/coordinator.json`, `settings/coordinator.json` and T14's
  `COORD.agent_types` (W1 carries them).

## 8. Test count

BUILD-PLAN counts 5 for CGATE; built: guard-hook G1-G5, handover H1 (and T11 rewritten), status S1, and a
`close-folders` case inside selftest T11.
