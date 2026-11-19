# guard-hook.mjs (unit U3b): spec, with the role files of U3b

Source of truth: `CONTRACT.md` §1.1, §1.3 (the hook exception), §2.1, §3.6 (task row), §3.20
(`tcb_paths_protected`, `hook_deadline_ms`), §3.13 (`by-url`), §3.21 (profile, settings, agent files,
hook input), §3.22 (`must_read.json`), §4.3 (`isUnder`, `segmentName`), §4.8 (`toolAccess`,
`urlKey`), §8.20.

## Purpose
The preventive half of R29: before every tool call of a research session or helper, refuse paths
outside the role, writes under `.claude/` or a protected path, Bash except the coordinator's `node
tcb/<n>.mjs`, a wrong helper type, a child's fetch of a non-witnessed URL, any call of a fenced
attempt. It decides from files, takes no lock, writes only by strict exclusive create inside its deadline (§8.20, 0b;
no step writes yet) and denies on its own error.

## Command line and protocol
```
node "<root>/tcb/guard-hook.mjs" --root <root> --role <role> [--task <id> --epoch <e>]
```
stdin: the harness's PreToolUse JSON (`hook_event_name`, `tool_name`, `tool_input`, `cwd`,
`session_id`, `transcript_path`, and for a helper's call `agent_type`; CONTRACT §3.21, believed,
needs-app 1).
Exit 0 = no objection (stdout empty; the harness's permission rules still apply). Exit 2 = deny, one
stderr line `[guard-hook] deny <code>: <detail>`. **No other exit code ever**: any other code is a
non-blocking error that lets the call through, so a usage error is a deny (not 66), the
run-from-attempt check is a deny (not 3), and uncaught exceptions, rejections and an internal
deadline (threshold `hook_deadline_ms`, 5000, guess) all exit 2 `internal`. It does not use
`runMain`'s stdout line; it reads no wall clock to decide anything; its one clock is its own deadline (the fallback timer, and for a
write the time left until `hook_deadline_ms` from its start, on the monotonic clock, 0b). Whether it runs as the entry is
decided by `import.meta.main`, or by comparing the realpath of `process.argv[1]` with the module's
own path (Node gives `import.meta.url` as the realpath): started through a junction or a symlink it
still decides, never exits 0 without deciding.

## Writes (0b, FIX-fence §0b)
Only through `hookCreate(io, file, data)`: `lib.createExclusive(file, data, {strict: true, budget})`, `budget` = the
time left until `hook_deadline_ms` counted from the hook process's start (in-process, a call counts from its own
start to 5000). Result `created`, `identical` or `different` (another writer's bytes; the caller reads them). Time
spent before or during the create → deny `budget-spent`; `no-parent`, `no-hardlink` → deny with that code; any
other error → `write-failed`. A denied write makes nothing at the name. No lock, never a path a script writes. The
files come with FX-OUT (outcome slots), FX-CLAIM (`claim.json`) and FX-CGATE (`start.json`, `coord-session-<ce>`,
close records): until then no step writes. `hookWrite(file, data, io)` is exported for tests.

## Reads
`tcb/profiles/<role>.json`, `tcb/thresholds.json`; task roles: `run/tasks.json` (`lib.readTasks`, no
lock); `fetch: witnessed`: `{attempt}/in/must_read.json` only, plus the one URL's
`.snapshots/by-url/<urlKey>.jsonl` and the `.snapshots/meta/<raw_sha>.json` it names (never the
ledger, so the cost does not grow with the run); checker: `queue/<b>/batch.json`.

## Steps (first deny wins)
1. Own file under `<root>/wt/` → `run-from-attempt`. Parse flags; `--task`/`--epoch` required for
   task roles (§3.6 roles), absent for `coordinator` → else `usage`. Read stdin (cap 32 MiB), parse;
   not an object, no `tool_name`, or `hook_event_name` ≠ `PreToolUse` → `bad-input`.
2. Effective role: `agent_type` present and non-empty → a helper: it must be in the folder role's
   `agent_types` (`helper-type`) and its own profile applies. Absent → the folder role.
3. Load and validate the profile against [profile] (`profile-missing`, `profile-invalid`); render
   `{root}`, `{attempt}` = `<root>/wt/<task>-e<epoch>`, `{batch}` (step 9).
4. Task roles: the row exists, `epoch` equals `--epoch`, state `active`, step `admitted|started|
   bound`; else `stale-epoch` for every tool (R2: a fenced attempt can do nothing). Table missing or
   corrupt → `table-unreadable`.
5. Tool name: in `tools_deny` → `tool-denied`; not in `tools_allow` (exact, or an entry ending `*`
   as a prefix) → `tool-not-allowed`.
6. `lib.toolAccess(name, input)` gives the kind and fields (the same table audit uses, CONTRACT §4.8).
   Paths: relative ones resolve against `cwd`; `~`, `\\?\`, UNC, an empty or non-string path, or a
   Glob pattern / Grep `glob` that is absolute or has a `..` segment → `path-unresolvable`.
7. read: every path under a `read_prefixes` entry, never under `<root>/sealed/` → else
   `read-outside-role`. A prefix ending `/` is a folder (`lib.isUnder`, case and junction safe);
   otherwise the path's folder equals the prefix's folder and its name starts with the prefix's
   last segment (so `store/objects/x_` admits certificates only).
8. write: the path is under `<root>`; no segment whose `lib.segmentName` is `.claude` at any depth
   and a last segment whose `segmentName` is not `claude.md` or `claude.local.md` (`write-claude`;
   so `.Claude.`, `CLAUDE.md.` and `Claude.MD` are caught); under no `tcb_paths_protected` entry
   (`write-protected`, `.git/` included) and not under `{attempt}/staging/harvested/` (§8.7); and
   under a `write_prefixes` entry (`write-outside-role`).
9. read by a checker: `{batch}` is any `b` with `<root>/queue/<b>/batch.json` present (CONTRACT
   §3.21); the path must be under that one folder.
10. fetch: `fetch: none` → `fetch-none`; `any` → pass; `witnessed` → the URL's `new URL(u).href` is
    an `href` of `{attempt}/in/must_read.json` (replace copied it from the frozen protocol; the
    manifest hashes it and the session cannot write `in/`), and
    `.snapshots/by-url/<lib.urlKey(u)>.jsonl` has a line with a non-null `raw_sha` whose meta has a
    `text_sha`; else `fetch-not-witnessed`. A missing or unparseable `must_read.json` → the same deny.
11. search: allowed by step 5 alone (the project-term denylist is audit's, after the fact).
12. exec: `bash: none` → `bash-refused`. `tcb-node`: the trimmed command is `node`, one script path
    (`tcb/<n>.mjs` with `cwd` = root, or `<root>/tcb/<n>.mjs`, optionally in double
    quotes), then arguments made only of `[A-Za-z0-9_\-./:=]` or double-quoted strings of those plus
    space and `\`; `<n>` matches `^[a-z][a-z-]*$`, is not `lib`, and the file exists; else
    `bash-pattern`. No shell metacharacter (`;&|<>$'(){}*?!%^@,`, a backtick, a newline) ever passes.
    Then **the allow list (FX-W1 step 5, R29; `stepAllowList`):** the script (the path's file name),
    its mode (the third token when it is not a `--` token) and its flags (the name, up to `=`, of
    every `--` token: `lib.parseArgs` reads each as a flag) must fit one of that script's production
    forms in `EXEC_FORMS` [mode or none, required flags, other allowed flags], taken from each
    script's spec ("## Command line") with the round-3 forms (`handover bind --nonce`, `replace fence
    --if-unclaimed`, `watch --alarm --ensure --nonce`, `status --reconcile --arm-nonces`, `status
    --deadman`); else `bash-pattern` with detail `flag not allowed: <script> <why>`, why one of
    `--<flag>`, `(no production form)` (the hook itself), `without a mode`, `mode <m>`, `without
    --<req>`, `<flags> together`. The test seams `TEST_SEAM_FLAGS` (`--once`, `--boot`, `--tick`,
    `--now`, `--sleep-ms`, `--interval-ms`, `--free-mb`, `--no-intake`, and `--rng-seed`,
    `--transcripts-root`) are in no form, so they are refused for every script (CONTRACT §1.2). The
    alarm form also admits a bare `--alarm` (the as-built M2 call) until FX-W2 requires `--ensure`.
13. agent: `subagent_type` present and in `agent_types` → pass; else `agent-type`.
14. Allow: exit 0.

## Profiles `tcb/profiles/<role>.json` (owned here; [profile] format)
| role | tools_allow | read_prefixes | write_prefixes | agent_types | fetch | bash |
|---|---|---|---|---|---|---|
| child, child-reviewing, canary | Read Glob Grep Write Edit Agent WebFetch ToolSearch | `{attempt}/` | `{attempt}/staging/` | reader | witnessed | none |
| fresh-reviewer, control, stpa, fmea, mapper | Read Glob Grep Write | `{attempt}/` | `{attempt}/staging/` | — | none | none |
| coordinator | Read Glob Grep Write Edit Agent Bash PowerShell ToolSearch + the host's session tools (owner lists them as `<prefix>*`) | `{root}/run/status.json`, `{root}/views/`, `{root}/store/objects/x_`, `{root}/completeness/gate.json`, `{root}/plan/`, `{root}/tcb/briefs/`, `{root}/tcb/README.md` | the coordinator paths of CONTRACT §2.1: `{root}/plan/questions/`, `{root}/plan/approaches.json`, `{root}/plan/protocols/`, `{root}/plan/analysis-plan.json`, `{root}/plan/cost-inputs.json`, `{root}/plan/tasks-plan.json`, `{root}/plan/plant-candidates/`, `{root}/plan/our-work/`, `{root}/plan/notes/` | checker | none | tcb-node |
| reader | WebSearch WebFetch ToolSearch StructuredOutput | — | — | — | any | none |
| checker | Read StructuredOutput | `{root}/queue/{batch}/` | — | — | none | none |

`tools_deny` (all; `schema_version: 1`): Bash, PowerShell (but coordinator), NotebookEdit, MultiEdit, WebSearch (but reader), Task.

## Settings `tcb/settings/` (CONTRACT §3.21)
- `<role>.json` for each task role and `coordinator.json`: harness settings `{permissions: {allow,
  deny}, hooks: {PreToolUse: [{matcher: "*", hooks: [{type: "command", command: "\"{node}\"
  \"{root}/tcb/guard-hook.mjs\" --root \"{root}\" --role <role> --task {task} --epoch
  {epoch}", timeout: 30}]}]}}` (coordinator: no task/epoch). `allow` scopes the profile's tools to
  its prefixes (`Read(//{attempt}/**)`, `Edit(//{attempt}/staging/**)`, `Agent(reader)`,
  `WebFetch`; coordinator `Bash(node tcb/*)`); `deny` repeats `tools_deny` and adds
  `Edit`/`Write` on `//{root}/{tcb,run,store,sealed,review-in,.git}/**` and `//{attempt}/.claude/**`.
  replace renders the task-role files into `wt/<task>-e<e>/.claude/settings.json` by placeholder
  substitution only ({root}, {attempt}, {task}, {epoch}, {node} = the absolute node path); the
  owner installs `coordinator.json` with `{node}` filled the same way.
- `user-deny.json`: user-level rules the owner merges into his settings: `deny` `Write`, `Edit` on
  `//{root}/` `tcb/**`, `run/**`, `store/**`, `sealed/**`, `review-in/**`, `wt/*/.claude/**`
  (research paths only, R29). The project-term denylist stays `tcb/denylist.txt`, audit's (§5).
- Agent files `tcb/agents/reader.md` (front matter `name: reader`, `description`, `tools: WebSearch,
  WebFetch`) and `checker.md` (`tools: Read`); body = the verbatim text of `tcb/briefs/<name>.md`
  (U5c), so no project data reaches a reader. replace copies the file of every type in the role's
  `agent_types` into `{attempt}/.claude/agents/` and lists it in the manifest `agents`; fsck accepts
  exactly those (CONTRACT §3.21).

## Rules implemented
R29 (preventive layer, fail-safe), R13 (staging only), R2 (fenced attempt), R22/R24 (declared
inputs), R25 (witnessed fetches), §8.7, §8.20; problems G2, G10 (by the canary), N1.

## Behaviours (each test spawns the hook with a stdin JSON in a `makeRoot()` root; every case asserts
the exit code is 0 or 2, stdout is empty, and on 2 stderr starts `[guard-hook] deny <code>`)
- T1 child Read of `{attempt}/in/brief.md` → 0; of `{root}/store/objects/c_x.json` → 2
  `read-outside-role`; of `{root}/sealed/seeds/b1-1.json` as coordinator → 2.
- T1b With a test profile whose `read_prefixes` is `["{root}/"]`, a Read of `{root}/sealed/x` and a
  Grep or Glob with path `{root}` (a folder that holds `sealed/`) are each 2 `read-outside-role`
  with detail `sealed:` (step 7's own refusal, not the prefixes').
- T2 child Write to `{attempt}/staging/card1.card.json` → 0; to `{attempt}/view/todo.json` → 2
  `write-outside-role`; to `{attempt}/staging/harvested/x` → 2; to `{attempt}/.claude/settings.json`,
  `{attempt}/staging/.CLAUDE/x`, `{attempt}/staging/.claude./x`, `{attempt}/staging/Claude.MD` and
  `{attempt}/staging/CLAUDE.md.` → 2 `write-claude`; coordinator Write to `{root}/.git/config` → 2
  `write-protected`, to `{root}/plan/notes/q1.txt` → 0.
- T3 Path tricks: `{attempt}/staging/../../../tcb/x.mjs`, a relative `..\..\run\tasks.json` with
  `cwd` = attempt, a case variant `C:/...` vs `c:\...` of an allowed path (allowed), a junction in
  staging pointing at `{root}/run` (denied; skipped where junctions cannot be made), `~/x`, a UNC
  path, a Glob pattern `../**` → each the stated result.
- T4 Edit, MultiEdit, NotebookEdit target fields are all checked; MultiEdit and NotebookEdit are
  `tool-denied` for a child.
- T5 Bash for child → `tool-denied`; coordinator `node tcb/status.mjs --root C:/r --ce 1`
  (cwd root) and the absolute quoted form → 0; `node tcb/x.mjs; del y`, `node -e 1`,
  `node tcb/../../a.mjs`, `node tcb/lib.mjs`, `node tcb/nosuch.mjs`, the old layout `node tcb/scripts/status.mjs` (relative or absolute), `$(x)`,
  a newline → 2 `bash-pattern`. (Its allowed calls are production forms, so they pass the FX-W1 allow
  list unchanged; its denied ones fail the grammar before it.)
- T6 Agent `subagent_type: reader` from a child → 0; `general-purpose` or absent → 2 `agent-type`;
  coordinator `checker` → 0, `reader` → 2.
- T7 A helper call (`agent_type: reader`) in a child folder: WebFetch of any http URL → 0, Read of
  `{attempt}/in/brief.md` → 2; `agent_type: checker` in a child folder → 2 `helper-type`.
- T8 checker Read of `{root}/queue/b1-1/item-i_0123456789abcdef.json` with `batch.json` present → 0;
  of a batch folder without `batch.json`, of `{root}/sealed/seeds/b1-1.json` → 2.
- T9 child WebFetch: a URL listed in `{attempt}/in/must_read.json` with a stored text snapshot → 0;
  the same URL with only a failed `by-url` line → 2; a URL not in the list → 2 `fetch-not-witnessed`;
  `must_read.json` missing → 2. fresh-reviewer WebFetch → 2. With a 50 MB ledger in the root the
  allowed call still answers within `hook_deadline_ms` (the hook does not read the ledger).
- T10 Stale epoch: row epoch 3, hook `--epoch 2` → every tool 2 `stale-epoch`; row at step `fenced`
  with equal epoch → 2; `tasks.json` corrupt or missing → 2 `table-unreadable`.
- T11 Fail-safe: no `--role`, unknown role, missing profile, a profile with an extra field, stdin not
  JSON, stdin empty, `hook_event_name: PostToolUse` → each 2; a hook copy run from `{root}/wt/x/`
  → 2 `run-from-attempt`; the hook started through a junction to `tcb/` still decides (a protected
  Write → 2 `write-protected`, an allowed Read → 0).
- T12 The module exports `decide(input, args, io)` (no side effect on import; `io` = its file
  readers): an `io` that throws a plain `Error` gives deny `internal`; as a process, an unparseable
  `thresholds.json` → 2, never 1 or 70; stdin never closed with `hook_deadline_ms` 200 → 2 promptly.
- T13 The hook writes nothing: the root's file tree hash (`lib.treeSha(root)`) is equal before and
  after 50 mixed calls, no lock file is created, the ledger is unchanged.
- T14 Every file in `tcb/profiles/` validates against [profile]; every `tcb/settings/<role>.json`
  parses after substitution, its hook command starts with the quoted `{node}`, names its own role, allows only tools in the
  profile's `tools_allow` and denies every `tools_deny` entry; `reader.md` lists exactly WebSearch,
  WebFetch and `checker.md` exactly Read, each body equal to its brief.
- T15 (0b) `hookWrite`: a create with time left → `created`, again `identical`, other bytes `different` (no
  deny, bytes kept); `budgetMs` 0 or below → `budget-spent`; a missing parent → `no-parent`, no folder made;
  `fs.linkSync` failing ENOTSUP → `no-hardlink`; a temp open failing EPERM every time with 150 ms left →
  `budget-spent` after 2 to 40 tries inside about that time; a throwing `create` → `write-failed`, a strange
  result → `internal`. Nothing is left at a denied name. (Runs in a checkout whose path has no `.claude` segment:
  under `.claude/` T2-T4, T11 and T13 deny every write `write-claude`.)

- T16 FX-W1 allow list (in process, through `decide`): one production call of every form of every
  script of `EXEC_FORMS`, with the round-3 forms and `--flag=value` spelling → allowed; each of the ten
  test seams, as `--x v` and `--x=v`, added to a production call of every script → `bash-pattern`
  `flag not allowed: <script> --<x>`; a mode flag's companions without it (`watch --ensure --nonce`,
  `status --arm-nonces`), two modes together, no mode, a flag of another mode, an unknown flag, a
  quoted `"--now"` and `guard-hook.mjs` itself → `bash-pattern` with the reason; and every `--flag`
  each script's spec names under "## Command line" (except "no `--x`" mentions) is in a form of that
  script or is a seam. (Named `FX-W1 allow list` in `tcb/test/guard-hook.test.mjs`.)

## Cannot be tested without the app (written, then `t.skip('needs-app: ...')`)
- needs-app 1: the harness runs this hook before every tool call, helpers included, passes the
  fields of step 1 and `agent_type`, and honours exit 2; a hook timeout or a `node` that fails to
  start is a non-blocking error (fail open), backed only by the user-level denies and audit.
- needs-app 2: user-level denies bind every session; the `//` absolute form works on Windows.
- needs-app 3: a session in `wt/<task>-e<e>/` obeys that folder's settings and agent files and no
  ancestor's (the coordinator's hook must not apply to children).

## Round-3 skeleton (S0.5): the steps of the decision
One context `pass` = {hook, root, role, task, epoch, attempt, toolName, toolInput, cwd, io, profile, row,
access}. Each step is empty until its fix fills it. A step denies by throwing; a step that writes does so
only through `hookCreate` (strict create, 0b), after every read-only check of the call (FIX-JOIN point 9).
- Step 4, task roles, after the epoch gate: `stepClaim` (FX-CLAIM).
- Step 6 is `checkAccess(pass)`, moved as it was; in its exec branch, after the tcb-node grammar check:
  `stepAllowList` (FX-W1).
- Step 7, after step 6 allowed the call. Task roles, Write or Edit: `stepReadySlot` (FX-OUT, built: a target
  whose path key is `{attempt}/staging/READY.json`: an Edit → deny `ready-write-only`; a Write whose `content`
  does not parse, fails `checkFormat(ready)`, or names another task, epoch or a step not in the row → deny
  `ready-invalid`; a repair marker → allow, no slot; else `lib.outcomeAppend` with `hookCreate` as its create:
  a fenced log → deny `attempt-fenced`, the same ready slot or a new one → allow, a bad log → deny
  `outcome-tamper`, no `outcome/` → deny `no-parent`). Coordinator:
  `coordinatorSteps`, in order `stepBind` (FX-CGATE 2), `stepCurrentSession` (FX-CGATE 3), `stepArmed`
  (FX-W3), `stepRowAtAdmitted` (FX-CGATE 4, read-only), `stepStartRecord` (FX-CGATE 4), `stepStopIntent`
  (FX-CGATE 5); a step that returns `'allow'` ends them.
- FX-CGATE as built. Names: a caller is the hook input's `session_id`, a lowercase UUID (`SESSION_ID_RE`); a stop
  target is an app id `local_<uuid>` (`APP_SESSION_ID_RE`); anything else (`self`, a CLI id, a path) is `bad-target`
  and nothing is written. Step 2 `stepBind`: an exec call `node <root>/tcb/handover.mjs bind` with exactly the pairs
  `--root <this root>`, `--ce <coord.json ce>`, `--nonce <coord.json successor_nonce>` (any order), a UUID caller
  that no `run/coord-session-<k>.json` with k < ce names (an unreadable one disqualifies) strict-creates
  `run/coord-session-<ce>.json` {session_id} and is allowed; another session already there → `bound-elsewhere`; a
  call that does not qualify goes on. Step 3 `stepCurrentSession`: the read kind passes; any other call of a
  caller other than the session of `coord-session-<ce>.json` (ce from coord.json) → `stale-coordinator`, also when
  either file cannot be read. Step 4 (the profile's `session_tools.start`): `cwd` absolute and exactly
  `<root>\wt\<T>-e<E>`, `use_worktree: false`, `context` absent or `fresh`, `target` absent or `local`, `host`,
  `preset`, `environment`, `repository`, `proposal_id`, `source_branch`, `branch_name` absent, else `bad-target`;
  the row (no lock) active/admitted at E, else `wrong-step` (`table-unreadable`); then `wt/<T>-e<E>/start.json`
  {kind:'start', session, tool_use_id|null, tick (watcher.json ticks_total or null), at}; a record already there
  is allowed only for the same session and the same non-null tool_use_id, else `start-issued`. Step 5
  (`session_tools.stop`): `run/close/intent/<target>.json` {kind:'close-intent', session, by, tool_use_id|null};
  a record already there passes when it is a close-intent of that target (a retried close), else `record-tamper`.
  Step 6, the Post mode: `PostToolUse` and `PostToolUseFailure` are taken for the coordinator's stop tools only
  (any other role or tool → `bad-input`); steps 4-7 do not run. The text (`tool_response` as a string, the joined
  `text` of a content array or of {content}, and `error`): `Archived session <t>` then ` (` or `.`, or `Session <t>
  is already archived.` → `stopped`; `Session <t> not found.` → `no-such-session`; any other text writes nothing
  (exit 0). The record `run/close/done/<t>.json` {kind:'close-done', session, outcome, by}; a record already there
  passes when it is a close-done of that target (the first stands), else `record-tamper`. The profile shape check
  takes the optional `session_tools` (CONTRACT 3.21).

## FX-CLAIM (round 3)

`stepClaim` (step 4, after the epoch gate, no lock): a `session_id` not of FX-CGATE's `SESSION_ID_RE` (a lowercase UUID) → `bad-input`; no claim → strict create of the session claim; another session → `attempt-claimed`; a tombstone → `attempt-cancelled`; bytes that do not parse → `claim-invalid`. Tests: T10b; T13 makes its session's claims before counting.
