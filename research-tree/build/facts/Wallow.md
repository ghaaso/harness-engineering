# Wallow (S0.1d)
Files read only. All paths relative to `research-tree/`. [r] = read, with file:line.

## W-helpers
- How the hook tells a helper from its session, and which profile applies: [r] `tcb/guard-hook.mjs:382-390`. The hook input field `agent_type`: absent or empty = the folder role's own profile (here `--role coordinator`); present = a helper, which must be in the folder profile's `agent_types` (else deny `helper-type`), and then `loadProfile(root, agentType)` replaces the profile for that call. Spec: `spec/guard-hook.mjs.md:41-42`. That the harness really passes `agent_type` is believed, not observed (`spec/guard-hook.mjs.md:19`, needs-app item 1 at line 162).
- Which helpers the coordinator may start: [r] `tcb/profiles/coordinator.json:41-44` `agent_types: [checker, mapper]`; the Agent tool call is checked against it at `guard-hook.mjs:523-528` (`agent-type` deny otherwise).
- The bash grammar a helper of the coordinator gets: none. [r] `tcb/profiles/checker.json:69` and `tcb/profiles/mapper.json:96` `bash: none`; Bash and PowerShell are in both `tools_deny` (`checker.json:56-57`, `mapper.json:81-82`); a Bash call by a helper is denied `tool-denied` (`guard-hook.mjs:411`). The only profile with `bash: tcb-node` is the coordinator (`coordinator.json:46`); its grammar is `checkTcbNode` (`guard-hook.mjs:315-353`).
- What it refuses that a helper needs, and what it refuses at all:
  - A mapper started by the coordinator cannot read or write anything: `mapper.json:88-93` prefixes are `{attempt}/` and `{attempt}/staging/`, but the coordinator folder has `attempt = null` (`guard-hook.mjs:379`, TASK_ROLES excludes coordinator) and `renderPrefix` returns null for `{attempt}` with no attempt (`guard-hook.mjs:283-285`), so every Read/Write is `read-outside-role` / `write-outside-role` (`guard-hook.mjs:437`, `:459`). [r]; the consequence is my reading of the code (inferred, not run).
  - A checker started by the coordinator can Read only under `{root}/queue/{batch}/` where `batch.json` exists (`checker.json:63-65`, `guard-hook.mjs:286-297`); it has Read and StructuredOutput only, no Bash. That fits a checker's job (read a batch, return structured output).
  - No helper has `session_tools` or Bash; the hook has no `session_tools` key (PROFILE_KEYS, `guard-hook.mjs:33`).
- Verdict W-helpers: the profiles give coordinator-started helpers no bash at all (checker and mapper `bash: none`); the checker is workable, but a mapper started from the coordinator folder is denied every Read and Write because `{attempt}` has no value there (inferred from code, not run).

## W-allow
Findings first. [r] `checkTcbNode` (`tcb/guard-hook.mjs:315-353`) has NO per-script flag list. It checks: no shell metacharacter (`; & | < > $ ' ( ) { } * ? ! % ^ @ , backtick`, control chars; line 318), tokens made only of `[A-Za-z0-9_-./:=]` or double-quoted `[A-Za-z0-9_-./:= \\]` (line 321), first token `node`, second token `tcb/<name>.mjs` (cwd = root) or `<root>/tcb/<name>.mjs`, name `[a-z][a-z-]*` and not `lib`, and a sibling file of that name beside the hook (lines 340-352). Any flag word is admitted as long as its characters are in the token set. `grep` for `flag not allowed`, `--once`, `--boot` in `guard-hook.mjs`: no match. The "allow-list of production flags" of `notes/r3-changes.md:253` (FX-W1) is a planned change, not in the code; `tcb/settings/coordinator.json:27` holds `Bash(node tcb/*)` only. So today the check gives "admitted: yes" to every form below, and also admits the flags that FX-W1 means to refuse (`--once`, `--boot`, `--tick`, `--now`, `--sleep-ms`, `--interval-ms`, `--free-mb`, `--no-intake`) and any other word. The question "does the list admit every production form" is therefore answered for the code as it is; the question for the planned list must be re-checked when it is written.

Admitted column = by `checkTcbNode` as it stands (grammar only; `y` also needs that the value tokens use only the allowed characters). All forms are the coordinator's (profile `coordinator`, `bash: tcb-node`); no other profile has Bash.

| script | call form (verbatim from spec) | admitted | profile |
|---|---|---|---|
| admit | `node tcb/admit.mjs check --root R [--task T] [--now ISO] [--free-mb M]` (`spec/admit.mjs.md:11`) | yes (grammar) | coordinator |
| certify | `node tcb/certify.mjs --root <abs> --ce <n> --task <id> --epoch <e> [--now <iso>] [--dry-run]` (`spec/certify.mjs.md:17`) | yes | coordinator |
| commit | `node tcb/commit.mjs intake --root <abs> --ce <n> --task <id> --epoch <e> [--now <iso>] [--dry-run]` (`spec/commit.mjs.md:14`) | yes | coordinator |
| commit | `node tcb/commit.mjs record --root <abs> --ce <n> --task <id> --epoch <e> --step <s> [--now <iso>] [--dry-run]` (`spec/commit.mjs.md:15`) | yes | coordinator |
| fsck | `node tcb/fsck.mjs --root <abs> --ce <n> [--now <iso>] [--dry-run]` (`spec/fsck.mjs.md:15`) | yes | coordinator |
| handover | `node tcb/handover.mjs init  --root R --tcb-commit SHA40 [--session SID] [--now ISO] [--dry-run]` (`spec/handover.mjs.md:12`) | yes | coordinator |
| handover | `node tcb/handover.mjs raise --root R --ce N [--now ISO] [--dry-run]` (`:13`) | yes | coordinator |
| handover | `node tcb/handover.mjs bind  --root R --ce N --session SID [--now ISO] [--dry-run]` (`:14`) | yes | coordinator |
| harvest | `node tcb/harvest.mjs --root <abs> --ce <n> --task <id> --epoch <e> [--now <iso>] [--dry-run]` (`spec/harvest.mjs.md:14`) | yes | coordinator |
| promote | `node tcb/promote.mjs --root <abs> --ce <n> --from witness [--now] [--dry-run]` (`spec/promote.mjs.md:16`) | yes | coordinator |
| promote | `node tcb/promote.mjs --root <abs> --ce <n> --batch <b> --transcript <abs path> [--now] [--dry-run]` (`:17`) | yes | coordinator |
| promote | `node tcb/promote.mjs revert --root <abs> --ce <n> --class J1|J2|J3|J4 [--now] [--dry-run]` (`:18`; `|` is notation for one value) | yes (one class value) | coordinator |
| replace | `node tcb/replace.mjs plan  --root R --ce N [--now ISO] [--dry-run]` (`spec/replace.mjs.md:11`) | yes | coordinator |
| replace | `node tcb/replace.mjs fence --root R --ce N --task T --epoch E --reason first\|stall\|...\|drop [--tick K] [--now ISO] [--boot B] [--dry-run]` (`:12-13`) | yes (fence-group) | coordinator |
| replace | `node tcb/replace.mjs start --root R --ce N --task T --epoch E [--now ISO] [--free-mb M] [--dry-run]` (`:14`) | yes (fence-group) | coordinator |
| replace | `node tcb/replace.mjs bind  --root R --ce N --task T --epoch E --session SID [--now ISO] [--boot B] [--dry-run]` (`:15`) | yes (fence-group) | coordinator |
| status | `node tcb/status.mjs --root R --ce N [--now ISO] [--free-mb M] [--dry-run]` (`spec/status.mjs.md:11`) | yes | coordinator |
| status | `node tcb/status.mjs --reconcile --root R --ce N [--now ISO] [--free-mb M] [--dry-run]` (`:12`) | yes | coordinator |
| status | `node tcb/status.mjs --endturn --acked-seq K --root R --ce N [--now ISO] [--dry-run]` (`:13`) | yes | coordinator |
| status | `node tcb/status.mjs intent open --key KEY --subject S [--text-file P] --root R --ce N` (`:14`) | yes if S has no space/comma/apostrophe (a multi-word subject needs double quotes; `,` `'` `@` `%` refused even inside quotes) | coordinator |
| status | `node tcb/status.mjs intent done --key KEY --root R --ce N` (`:15`) | yes | coordinator |
| status | `node tcb/status.mjs owner --act approve\|accept\|resume\|drop\|ruling --subject S --quote-file P --root R --ce N` (`:16`) | yes, same subject caveat | coordinator |
| status | `node tcb/status.mjs meter --pct P --root R --ce N` (`:17`) | yes | coordinator |
| stop | `node tcb/stop.mjs request --root R --ce N --task T --epoch E [--now ISO] [--dry-run]` (`spec/stop.mjs.md:12`) | yes (fence-group) | coordinator |
| stop | `node tcb/stop.mjs verify  --root R --ce N --task T --epoch E [--now ISO] [--dry-run]` (`:13`) | yes (fence-group) | coordinator |
| tms | `node tcb/tms.mjs --root <abs> --ce <n> [--target <task>.<step>]... [--now <iso>] [--dry-run]` (`spec/tms.mjs.md:16`) | yes | coordinator |
| watch | `node tcb/watch.mjs --root R --ce N [--interval-ms MS] [--no-intake] [--now ISO] [--free-mb M]` (`spec/watch.mjs.md:11`) | yes by grammar; FX-W1 means to refuse `--interval-ms`, `--no-intake`, `--free-mb`, `--once` (`r3-changes.md:255`) | coordinator (the watcher is also started by the scheduled task, not through this hook) |
| watch | `node tcb/watch.mjs --once ...` / `--alarm ... [--sleep-ms MS]` / `--intake ...` (`:12-14`) | yes by grammar; `--once`, `--sleep-ms` are on the refuse list | coordinator |
| compare | `node compare.mjs <anon\|score> --root <dir> --ce <n> [--scorer-transcript <abs path>] [--dry-run] [--now]` (`spec/compare.mjs.md:14-16`; spec writes the form without `tcb/`) | yes in the `tcb/` form | coordinator |
| cost | `node cost.mjs compute [--inputs <file>] [--text]`; `predict --root <dir> ...`; `from-transcripts --root <dir> --ce <n> ...` (`spec/cost.mjs.md:13-15`) | yes | coordinator |
| gate | `node gate.mjs cut --root <dir> --ce <n> --design <path>`; `check --root <dir> --ce <n>` (`spec/gate.mjs.md:12`) | yes | coordinator |
| render | `node render.mjs --root R --ce N [--now iso] [--dry-run]` (`spec/render.mjs.md:16`) | yes | coordinator |
| seed | `node seed.mjs plant --root R --ce N --task <id> [--k <n>]...`; `score --root R --ce N [--batch <b> --transcript <path>]` (`spec/seed.mjs.md:15-16`) | yes | coordinator |
| selftest | `node <root>/tcb/selftest.mjs run --root <dir> --ce <n> [--jobs 1\|2] [--case-timeout-ms <n>]`; `canary ... --transcript <path> --expect <file>` (`spec/selftest.mjs.md:26,28`) | yes (absolute form) | coordinator |
| snap | `node <root>/tcb/snap.mjs --root <dir> --ce <n> (--url <u> \| --new)` (`spec/snap.mjs.md:15`) | `--new` yes; `--url <u>` NO when the URL has `?` `&` `%` `~` `,` `@` `!` etc. (metacharacter refusal, `guard-hook.mjs:318`) or characters outside the token set | coordinator |
| witness | `node <root>/tcb/witness.mjs --root <dir> --ce <n> [--card <c_id>]...` (`spec/witness.mjs.md:15`) | yes | coordinator |
| protocol-freeze | `node protocol-freeze.mjs <freeze\|amend\|plan> --root <dir> --ce <n> --file <relpath> [--reason-code <code>]` (`spec/protocol-freeze.mjs.md:14-19`) | yes | coordinator |
| check-queue | `node check-queue.mjs --root R --ce N --mode intake\|freeze\|post-review [--field <f>] [--batch-size <n>] [--classes <c>]... [--no-seeds] [--requeue] ...` (`spec/check-queue.mjs.md:15-16`) | yes | coordinator |

(Specs for audit, briefs, lib, guard-hook name no production call form of their own beyond the hook line `node "<root>/tcb/guard-hook.mjs" ...`, which the harness runs, not the coordinator's Bash.)

- Forms in no list (named by `notes/r3-changes.md:79,418` and not found anywhere in `spec/*.md`, `tcb/*.mjs` or `tcb/briefs/*`: grep for `if-unclaimed` and `close-session` returned nothing): `replace fence --if-unclaimed`, the planner act `close-session`; the flags `handover bind --nonce` (line 79 says `handover bind --ce --nonce`; the spec `spec/handover.mjs.md:14` has no `--nonce`) and `status --arm-nonces` (not in `spec/status.mjs.md:11-17`) are named by the plan and absent from the specs. `--acked-seq` is in the spec (`status.mjs.md:13`). Note too: the code has no allow-list at all (above), so "in no list" means in no spec and no list that does not exist yet; by the present grammar these plain-token flags would pass.
- Also absent: a `session_tools` key and a session-start or session-stop tool name in `tools_allow` of `profiles/coordinator.json:4-14` (the hook's PROFILE_KEYS, `guard-hook.mjs:33`, has no such key); `r3-changes.md:381-382` plans it (FX-CGATE, Q5a).
- Verdict W-allow: of 38 spec call forms counted (all in the table; `snap --url`, and `status intent/owner` with a multi-word subject being the conditional ones), 37 are admitted by the present grammar because it checks no flag; 1 (`snap --url <u>` with a real URL) is refused by the metacharacter rule. Missing from the specs and the code: `--if-unclaimed`, `close-session`, `handover bind --nonce`, `status --arm-nonces`, session start/stop tools and `session_tools`; the per-script flag allow-list of FX-W1 does not exist yet, so nothing yet refuses `--once`, `--boot`, `--tick`, `--now`, `--sleep-ms`, `--interval-ms`, `--free-mb`, `--no-intake` (message: this is the gap, not too-narrow admission).
