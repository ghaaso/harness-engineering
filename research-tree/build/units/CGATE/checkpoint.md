# CGATE checkpoint 1 (FX-CGATE, branch u/CGATE, 2026-11-20)

**Done:** read the design places (FIX-fence 3, 0b, rev-5 notes; FIX-JOIN points 2-3, 8-9, 2a-2c, part 3 R2/R9/R12/R13;
r3-changes 1, 3-6; branches.md rows 1, 17, thin items 1-2; facts FP1b-FP2) and the code; measured four harness facts
(below). **No code written; worktree `.claude/worktrees/CGATE` clean at ec3b04fd; nothing to commit.** The context
reached 340 K during reading and measuring. **Left:** everything under "Plan". **Next step:** guard-hook.mjs (D1-D8).

## Measured here (2026-11-20; read only, no tool called on the app)

- **M1 two id spaces.** The stop and archive tools take the app's `sessionId`, `local_<uuid>`; the hook's `session_id`
  is the CLI id (a bare UUID, FP1b). Sources: inputs of 27 past calls in transcripts under `~/.claude/projects`; the
  app's record `C:/Users/User/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/claude-code-sessions/<a>/<b>/local_<id>.json`
  holds both `sessionId` and `cliSessionId` (the build root: `local_a4b13878-...` and `8a7db643-...`); the app's
  `getSession(e)` looks up app ids only (`app.asar` of Claude 5.11492.5.0). So a CLI id given to archive answers
  "Session <id> not found." while the session lives: **never accept a bare UUID as a stop target** (a false
  `no-such-session` would count under H3 for the coordinator's own start and free a live slot).
- **M2 result texts** (27 calls: 9 archive, 5 stop shapes seen, all ok; error texts from `app.asar`):
  archive ok `Archived session <id>( (<title>))?.<more>`; errors `Session <id> not found.`, `Session <id> is already
  archived.`, `session_id is required.`, other non-archived kinds (`ef(...)`: still working, held...); self or
  cascade answers `Archiving this session...` (deferred: write nothing). stop_session ok `Stopped session <id>
  (<title>)'s current turn. It stays open; ...` (not a process stop); also `... nothing to stop.`, `... was not
  stopped: ...`, `Asked session ... to stop; ...`, `Stopped session ... before it began ...`.
- **M3 hook events** (`probe-hooks-log.jsonl` keys; CLI 2.1.325 binary): PreToolUse carries `tool_use_id` (and
  `mcp_server` for MCP tools); PostToolUse carries `tool_response`, `tool_use_id`, `duration_ms`. The CLI also has
  **PostToolUseFailure** `{tool_name, tool_input, tool_use_id, error, is_interrupt, duration_ms}`; the CLI throws on an
  MCP `isError` result, so the error texts of M2 most likely arrive there as `error` (inferred). Handle both events.
- **M4 start tool input** (`mcp__ccd_session__start_session` schema): `cwd`, `context` fresh|fork, `use_worktree`,
  `target` local|cloud|ssh, `host`, `preset`, `environment`, `repository`, `proposal_id`, `source_branch`,
  `branch_name`, plus initiation, prompt, background, title, name, model, effort, permission_mode, wake_when_done.

## Plan (decisions; each "dep" goes to `departures/CGATE.md`)

- **D1 guard-hook names.** In the CGATE block (above `stepBind`): `SESSION_ID_RE` = lowercase UUID 8-4-4-4-12 (caller
  ids, `start.json.session`, `by`), `APP_SESSION_ID_RE` = `^local_` + that UUID (stop targets, close record names).
  Not `SID_RE`: FX-CLAIM likely declares `SID_RE` in the same module, and two `const`s would be a SyntaxError (dep).
- **D2 profile** `profiles/coordinator.json`: tools_allow += `mcp__ccd_session__start_session`,
  `mcp__ccd_session_mgmt__archive_session`, `mcp__ccd_session_mgmt__stop_session` (exact names; a prefix would admit
  `hand_off_to_session`, an ungated start); `session_tools: {start: [start_session], stop: [archive_session,
  stop_session]}` (dep: thin item 2; archive is the process stop of 6(a); stop_session interrupts a working child so
  archive can run; its success never counts). `profileShapeError`: `session_tools` optional; `{start, stop}` arrays
  of non-empty strings, each name exactly in tools_allow, start and stop disjoint. `schemas/profile.schema.json` gets
  the property.
- **D3 Post mode.** `settings/coordinator.json` keeps its one PreToolUse entry; adds PostToolUse and
  PostToolUseFailure entries, matcher `mcp__ccd_session_mgmt__archive_session|mcp__ccd_session_mgmt__stop_session`,
  the same command, timeout 30. `parseInput` line 226 accepts the three events; one line after `const pass` (443):
  a Post event goes to `postToolUse(pass)`; a role other than coordinator, or a tool not in `session_tools.stop`, is
  `bad-input` (keeps T11's child PostToolUse case). Steps 4-6 do not run for Post.
- **D4 Post outcome** (text = `tool_response` as string, or joined `text` of a content array / `{content}`; or
  `error`): starts with `Archived session <t>` then ` (` or `.` -> `stopped`; contains `Session <t> is already
  archived.` -> `stopped` (dep: process gone; completes a record lost by a Post death); contains `Session <t> not
  found.` -> `no-such-session`; else write nothing, exit 0. Done `{kind:'close-done', session:t, outcome, by:<caller
  sid>}`; caller sid not a UUID -> write nothing (deny). `different` -> read it: valid kind and session -> exit 0,
  else deny `record-tamper`.
- **D5 Pre stop** (`stepStopIntent`): target `tool_input.session_id` must match `APP_SESSION_ID_RE` (so `self`, CLI
  ids, dots, separators -> `bad-target`, nothing written); intent `{kind:'close-intent', session:t, by, tool_use_id|null}`;
  created/identical -> allow; different -> valid intent -> allow (a retried close), else `record-tamper`.
- **D6 start** (`stepRowAtAdmitted`, `stepStartRecord`; only for `session_tools.start`): `cwd` required and
  `resolveToolPath` gives exactly `<root>\wt\<T>-e<E>` (TASK_RE, EPOCH_RE); `use_worktree === false` required;
  `context` absent or `fresh`; `target` absent or `local`; `host`, `preset`, `environment`, `repository`,
  `proposal_id`, `source_branch`, `branch_name` absent; else `bad-target` (dep: the measured shape of PROBE 4; FX-W3's
  brief section 6 must name `cwd` and `use_worktree: false`). Row from `io.readTasks` (no lock) active/admitted at E,
  else `wrong-step`; unreadable -> `table-unreadable`. `start.json` `{kind:'start', session, tool_use_id|null, tick:
  run/watcher.json ticks_total or null, at: ISO now}`; created -> allow; different -> parse: session and tool_use_id
  both equal and non-null -> allow, else `start-issued`.
- **D7 bind** (`stepBind`, exec kind): tokens `node`, the handover script (`tcb/handover.mjs` with cwd = root, or
  `<root>/tcb/handover.mjs`), `bind`, then exactly the pairs `--root R` (samePath root), `--ce N`, `--nonce X`, any
  order; N = `coord.json` ce; X = `coord.successor_nonce`; caller sid valid; no `run/coord-session-<k>.json` with k < N
  (readdirSync of `run/`) names the sid; an unreadable earlier file -> not qualifying. Then `hookCreate(coordSession(N),
  {session_id})`: created/identical -> return 'allow'; different -> `bound-elsewhere`. Not qualifying -> go on.
- **D8 current session** (`stepCurrentSession`): `coord.json` ce, then `coord-session-<ce>.json` session_id equal to the
  caller -> current; otherwise only the read kind (Read, Glob, Grep; step 6 checked the prefixes) passes, every other
  call `stale-coordinator`; an unreadable coord or session file -> reads only.
- **D9 handover.** Nonce `crypto.randomBytes(16).toString('hex')`. `init`, when it creates coord: `successor_nonce`
  plus `result.brief` (ce 1, nonce). `raise`, in the hold: `successor_nonce`; `result.brief` with the nonce (dry run:
  none). `briefNoncePart(nonce)`: ` Before any other call: node <sibling handover.mjs> bind --root <root> --ce <ce>
  --nonce <X>.` (`root` double-quoted if it holds a space). `bind --nonce X` replaces `bind --session` (`nonce`
  `^[0-9a-f]{32}$` else 66; `--session` with bind 66). Hold: no nonce -> coord.session equals the session file's ->
  exit 0 unchanged, else exit 1 `no-nonce`; nonce differs -> exit 1 `nonce-mismatch` + incident; session file
  missing or invalid -> exit 1 `not-bound` + incident; else ledger `coord-bind` {session}, coord.json without
  `successor_nonce` and with `session` from the file. RUN_DIRS += `run/close`, `run/close/intent`, `run/close/done`.
  `schemas/coord.schema.json`: optional `successor_nonce` `^[0-9a-f]{32}$`.
- **D10 status** `owner --act closed --subject <sid>`: ACTS += `closed`; sid must be the CLI UUID (verify reads dones
  by the claim holder's CLI id) else 66; in the hold `lib.createExclusive(run/close/done/<sid>.json, {kind:'close-done',
  session, outcome:'owner', by:null})` (first record kept) and the owner line; dry run writes nothing.
- **D11 selftest**: a static check `close-folders` (`run/close/intent`, `run/close/done` are folders; fail closed)
  beside `hard-links` in `runMode` (not dry, not `--only`).
- **ID-space gap (dep, the main one):** hook dones are named by app ids; FX-CLOSE verify (a)/(b) and FX-CLAIM step 7
  look dones up by CLI ids, so no hook done matches until a map exists; until then every close ends with the owner's
  `closed` (safe; liveness through the owner). Candidate maps for FX-CLOSE/the root: a Post step on the start tool
  recording the returned app id in the attempt folder; or the app's own record (internal, not stable).

## Existing tests and fixtures that change (by design)

- `tcb/test/guard-hook.test.mjs`: `makeWorld` writes `run/coord-session-1.json` `{session_id: SESSION}`; T14 accepts
  `session_tools` on the coordinator and requires its tools_allow extras to equal start + stop (no `*` rule there);
  check the Post entries.
- `tcb/fixtures/guard-hook/good-coordinator-agent-checker/`: stdin `session_id` a UUID; `root/run/coord.json`
  `{schema_version:1, ce:1, started_at, tcb_commit: 40 zeros}`, `root/run/coord-session-1.json` `{session_id}`.
- `tcb/test/handover.test.mjs`: `bind` helper takes `--nonce`; T11 rewritten for the nonce; T6's anchored brief
  regex extended (capture the nonce, equal to coord's); X1's `bind --session short` stays 66 (unknown flag).
- `tcb/test/selftest.test.mjs` line 228: make `run/close/intent` and `run/close/done`.

## New tests (place: guard-hook before the "T14: the shipped role files" comment; handover after T11; status after T14 owner)

G1 bind by nonce, wrong first binder `bound-elsewhere`, an earlier ce's session not qualifying, wrong nonce falls to
step 3; G2 stale session: Read passes, Write/Bash/Agent `stale-coordinator`, no session file -> reads only, helper of the
current session passes; G3 forged close targets `bad-target` (`self`, `../x`, a CLI UUID, `local_..`), nothing under
`run/close/`; G4 start: same `tool_use_id` again allowed, another `start-issued`, row not admitted `wrong-step`, bad
mappings `bad-target`, nothing written on a deny; G5 Post: archive ok -> `stopped`, already archived -> `stopped`, not
found -> `no-such-session` with `by`, stop_session ok -> nothing, both events. H nonce bind (raise and init write it,
brief carries it, bind copies the session file and clears it, mismatch and no file exit 1). S owner closed.

## Lane

From the worktree's `research-tree/`: handover T 17 W 128; status T 63 W 82; guard-hook from
`git -C MAIN -c core.longpaths=true worktree add --detach C:/Users/User/Documents/projects/hx-CGATE u/CGATE` (T 23
W 122), removed after; selftest as its 4 shards in one call (`build/facts/lane-measure/shards.cmds`, logs in the
worktree), T 140. Token counter words: `"CGATE coordinator start gate"`.

**Tokens:** build-invariant: CGATE coordinator start gate | calls 71 | tokens 16.31 M | context now 340.7 K
