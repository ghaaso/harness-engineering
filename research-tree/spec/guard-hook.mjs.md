# guard-hook.mjs (unit U3b): spec, with the role files of U3b

Source of truth: `CONTRACT.md` §1.1, §1.3 (the hook exception), §2.1, §3.6 (task row), §3.20
(`tcb_paths_protected`, `hook_deadline_ms`), §3.13 (`by-url`), §3.21 (profile, settings, agent files,
hook input), §3.22 (`must_read.json`), §4.3 (`isUnder`, `segmentName`), §4.8 (`toolAccess`,
`urlKey`), §8.20.

## Purpose
The preventive half of R29: before every tool call of a research session or helper, refuse paths
outside the role, writes under `.claude/` or a protected path, Bash except the coordinator's `node
tcb/scripts/*`, a wrong helper type, a child's fetch of a non-witnessed URL, any call of a fenced
attempt. It decides from files, writes nothing (§8.20) and denies on its own error.

## Command line and protocol
```
node "<root>/tcb/scripts/guard-hook.mjs" --root <root> --role <role> [--task <id> --epoch <e>]
```
stdin: the harness's PreToolUse JSON (`hook_event_name`, `tool_name`, `tool_input`, `cwd`,
`session_id`, `transcript_path`, and for a helper's call `agent_type`; CONTRACT §3.21, believed,
needs-app 1).
Exit 0 = no objection (stdout empty; the harness's permission rules still apply). Exit 2 = deny, one
stderr line `[guard-hook] deny <code>: <detail>`. **No other exit code ever**: any other code is a
non-blocking error that lets the call through, so a usage error is a deny (not 66), the
run-from-attempt check is a deny (not 3), and uncaught exceptions, rejections and an internal
deadline (threshold `hook_deadline_ms`, 5000, guess) all exit 2 `internal`. It does not use
`runMain`'s stdout line; it reads no clock to decide anything.

## Reads (never writes)
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
    (`tcb/scripts/<n>.mjs` with `cwd` = root, or `<root>/tcb/scripts/<n>.mjs`, optionally in double
    quotes), then arguments made only of `[A-Za-z0-9_\-./:=]` or double-quoted strings of those plus
    space and `\`; `<n>` matches `^[a-z][a-z-]*$`, is not `lib`, and the file exists; else
    `bash-pattern`. No shell metacharacter (`;&|<>$'(){}*?!%^@,`, a backtick, a newline) ever passes.
13. agent: `subagent_type` present and in `agent_types` → pass; else `agent-type`.
14. Allow: exit 0.

## Profiles `tcb/profiles/<role>.json` (owned here; [profile] format)
| role | tools_allow | read_prefixes | write_prefixes | agent_types | fetch | bash |
|---|---|---|---|---|---|---|
| child, child-reviewing, canary | Read Glob Grep Write Edit Agent WebFetch ToolSearch | `{attempt}/` | `{attempt}/staging/` | reader | witnessed | none |
| fresh-reviewer, control, stpa, fmea, mapper | Read Glob Grep Write | `{attempt}/` | `{attempt}/staging/` | — | none | none |
| coordinator | Read Glob Grep Write Edit Agent Bash PowerShell ToolSearch + the host's session tools (owner lists them as `<prefix>*`) | `{root}/run/status.json`, `{root}/views/`, `{root}/store/objects/x_`, `{root}/completeness/gate.json`, `{root}/plan/`, `{root}/tcb/briefs/`, `{root}/tcb/README.md` | the coordinator paths of CONTRACT §2.1: `{root}/plan/questions/`, `{root}/plan/approaches.json`, `{root}/plan/protocols/`, `{root}/plan/analysis-plan.json`, `{root}/plan/cost-inputs.json`, `{root}/plan/tasks-plan.json`, `{root}/plan/plant-candidates/`, `{root}/plan/our-work/`, `{root}/plan/notes/` | checker, mapper | none | tcb-node |
| reader | WebSearch WebFetch ToolSearch StructuredOutput | — | — | — | any | none |
| checker | Read StructuredOutput | `{root}/queue/{batch}/` | — | — | none | none |

`tools_deny` (all; `schema_version: 1`): Bash, PowerShell (but coordinator), NotebookEdit, MultiEdit, WebSearch (but reader), Task.

## Settings `tcb/settings/` (CONTRACT §3.21)
- `<role>.json` for each task role and `coordinator.json`: harness settings `{permissions: {allow,
  deny}, hooks: {PreToolUse: [{matcher: "*", hooks: [{type: "command", command: "\"{node}\"
  \"{root}/tcb/scripts/guard-hook.mjs\" --root \"{root}\" --role <role> --task {task} --epoch
  {epoch}", timeout: 30}]}]}}` (coordinator: no task/epoch). `allow` scopes the profile's tools to
  its prefixes (`Read(//{attempt}/**)`, `Edit(//{attempt}/staging/**)`, `Agent(reader)`,
  `WebFetch`; coordinator `Bash(node tcb/scripts/*)`); `deny` repeats `tools_deny` and adds
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
- T5 Bash for child → `tool-denied`; coordinator `node tcb/scripts/status.mjs --root C:/r --ce 1`
  (cwd root) and the absolute quoted form → 0; `node tcb/scripts/x.mjs; del y`, `node -e 1`,
  `node tcb/scripts/../../a.mjs`, `node tcb/scripts/lib.mjs`, `node tcb/scripts/nosuch.mjs`, `$(x)`,
  a newline → 2 `bash-pattern`.
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
  → 2 `run-from-attempt`.
- T12 The module exports `decide(input, args, io)` (no side effect on import; `io` = its file
  readers): an `io` that throws a plain `Error` gives deny `internal`; as a process, an unparseable
  `thresholds.json` → 2, never 1 or 70; stdin never closed with `hook_deadline_ms` 200 → 2 promptly.
- T13 The hook writes nothing: the root's file tree hash (`lib.treeSha(root)`) is equal before and
  after 50 mixed calls, no lock file is created, the ledger is unchanged.
- T14 Every file in `tcb/profiles/` validates against [profile]; every `tcb/settings/<role>.json`
  parses after substitution, its hook command starts with the quoted `{node}`, names its own role, allows only tools in the
  profile's `tools_allow` and denies every `tools_deny` entry; `reader.md` lists exactly WebSearch,
  WebFetch and `checker.md` exactly Read, each body equal to its brief.

## Cannot be tested without the app (written, then `t.skip('needs-app: ...')`)
- needs-app 1: the harness runs this hook before every tool call, helpers included, passes the
  fields of step 1 and `agent_type`, and honours exit 2; a hook timeout or a `node` that fails to
  start is a non-blocking error (fail open), backed only by the user-level denies and audit.
- needs-app 2: user-level denies bind every session; the `//` absolute form works on Windows.
- needs-app 3: a session in `wt/<task>-e<e>/` obeys that folder's settings and agent files and no
  ancestor's (the coordinator's hook must not apply to children).
