# Trusted base: interface contract (build of 2026-11-16)

The one document every builder and test writer works from. Design: `harness-engineering/docs/program/
RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` (rules R1-R58, cited as "R12"). Where this contract and the
design differ, this contract wins and §8 says why. Everything two scripts share is settled here; a
unit's spec (`spec/<script>.md`) adds only what one script alone needs.

Source tree (this build): `tcb-build/tcb/` = the run root's `tcb/`.
`tcb/<name>.mjs` (24 scripts + `lib.mjs`, flat: there is no `scripts` subfolder; a script finds the library, the schemas and its sibling scripts relative to its own file, `import.meta.url`), `tcb/schemas/<format>.schema.json`,
`tcb/profiles/<role>.json`, `tcb/settings/<role>.json` (harness settings templates, incl.
`coordinator.json`), `tcb/settings/user-deny.json`, `tcb/briefs/<role>.md`, `tcb/agents/<name>.md`,
`tcb/thresholds.json`, `tcb/cost-inputs.json`, `tcb/denylist.txt`, `tcb/fixtures/<script>/<case>/`,
`tcb/test/<script>.test.mjs`, `tcb/test/main-guard.test.mjs`, `tcb/test/helpers.mjs`, `tcb/README.md`.
Node 24, ES modules, `node:` built-ins only, Windows 11 / NTFS.

## 1. Conventions

### 1.1 Command line

```
node <root>/tcb/<name>.mjs [<mode>] --root <dir> [--ce <n>] [--task <id> --epoch <e>]
     [--now <iso>] [--dry-run] [script flags]
```
- Flags are `--name value` or a bare boolean `--name`; repeated `--name` builds a list. An unknown
  flag, a missing required flag or a malformed value exits **66** before anything is read
  (`guard-hook.mjs` excepted: under the hook protocol every failure is exit 2, §5).
- `--root` (absolute path) is required by every script except `cost.mjs compute`. Every path a script
  reads or writes is resolved under it (the transcripts and process information excepted, §6).
  Everything under `tcb/` is read from `<root>/tcb/`; tests build that folder in their temp root.
- A script refuses to run (exit **3**, `run-from-attempt`) when its own file lies under `<root>/wt/`.
- A script that guards its entry decides it is the main module by `import.meta.main`, else by
  `process.argv[1]` against its own file (`import.meta.url`), first as written and then by the real
  path of `argv[1]`; any error answers false. A plain path compare is wrong: Node gives the entry's
  `import.meta.url` as its real path, so a script started through a junction or symlink would exit
  0 having done nothing (pinned for all 24 scripts by `tcb/test/main-guard.test.mjs`).
- `--ce <n>` is required by every script that writes anything under the run root, the ledger
  included. It is compared with `run/coord.json` `ce` **inside the run lock**, before the first write;
  a difference exits **64** and writes nothing. Read-only modes take no `--ce`. Exceptions:
  `guard-hook.mjs` (no lock; writes only by strict exclusive create, decision 20) and `handover.mjs init` (creates the first `ce`).
- `--task <id> --epoch <e>`: every call that acts on one attempt names both. `e` is compared by
  equality with the row's `epoch` inside the lock; a difference exits **65** (`stale-epoch`).
  Scripts that move the step machine also name the step they expect (§3.6) and exit 65 on a mismatch.
- `--dry-run`: read, decide and print the JSON result with `"dry_run": true`; take no lock, append no
  ledger line, write no file, kill nothing. Exit code as the real run would give. `--ce` is still
  checked (without the lock).

### 1.2 Time, counters, machine facts

- Library functions never read a clock, `os.freemem()`, the boot identifier or process lists on
  their own: each takes them as parameters (`now`, `freeMb`, `boot`, `proc`). Only `main()` of a
  script reads them, once, at the CLI edge; the watcher's loop reads `now` and `freeMb` once per
  tick. `--now <iso>`, `--free-mb <n>`, `--boot <string>` override the edge values (tests use them).
- Wall time is **information only** (ledger `ts`, `*_at` fields, time-taken measure). Nothing counted
  by the design is derived from it: stall counts model calls, hang counts watcher ticks, the
  common-cause window counts ticks (`W_cc_ticks`), a stop is confirmed after `stop_verify_deltas`
  ticks, and a tick is one completed sleep of Δ in the watcher's loop, never a clock difference (so
  a sleep across PC suspend is one tick). Whether a failure is `host` compares boot identifiers by
  equality (§3.6), never clock arithmetic.
- **The one exception, one-sided (decision 40, model fix M5):** a watcher tick whose wall gap since
  the previous evaluation (this tick's `now` minus the stored `last_tick_at`) exceeds 2Δ is a
  *paused* tick and is not counted toward `hang_ticks` (the counter is left as it was, neither
  raised nor reset). A clock can therefore only withhold a hang count, never add one: a gap that is
  negative, unparseable or ≤ 2Δ counts the tick as usual. `ticks_total` and every other tick count
  still advance on a paused tick.
- Durations that a script waits in-process are only the watcher's Δ and `watch.mjs --alarm`; both
  come from `tcb/thresholds.json` and can be overridden by `--interval-ms` / `--sleep-ms` in tests.
  No other script sleeps. Scripts that may run longer than 60 s (`watch.mjs` in every mode,
  `selftest.mjs run`, `snap.mjs --new`, `cost.mjs from-transcripts`) are started by the coordinator
  as background commands.
- Tokens are counted, never money. Weighted token cost uses the dimensionless weights in thresholds.

### 1.3 Output

- **stdout**: exactly one line of JSON, for machines, on every exit (also on errors, when possible):
  `{"ok":bool,"script":"<name>","mode":"<mode>|null","exit":<n>,"code":"<slug>",`
  `"dry_run":bool,"result":{...},"reasons":[{"code":"<slug>","detail":<json>}],"ledger_seq":[<n>...]}`.
  `result` is script-specific (its spec defines it); `reasons` lists every refusal or failure cause
  with a stable slug; `ledger_seq` lists the ledger lines this run appended.
- `code` is always the §1.4 slug of `exit` (`ok`, `fail`, `not-run`, `deferred`, ...). The specific
  cause is `reasons[0].code` (and the rest of `reasons`). Where a spec writes "exit n `slug`", the
  slug is that reason code. Tests and selftest's `expect.code` match it against the `code` of any
  entry of `reasons`.
- **stderr**: messages for people, free text, never parsed.
- `guard-hook.mjs` is the one exception: it speaks the harness's hook protocol (§5, U3b).

### 1.4 Exit codes (one table for all scripts)

| Code | Slug | Meaning |
|---|---|---|
| 0 | `ok` | Done, passed, or an identical repeat that changed nothing |
| 1 | `fail` | A definite no: a check failed, or the action is refused for a reason a retry will not fix (limit reached and task failed; stop unconfirmed; endturn or reconcile finds a wake source missing) |
| 2 | `not-run` | Could not decide: an input is missing or unreadable, a precondition is absent (F5 not given, transcript not found, PowerShell failed). Gates count it as fail (R40) |
| 3 | `tamper` | Integrity breach: tcb differs from the owner's commit, ledger chain broken, object bytes differ from their name, a write into a protected path, a card changed after witnessing, a seed id outside the seed store, a script run from an attempt folder. All work stops (R28) |
| 5 | `ready-wins` | `replace.mjs fence` with any reason but `first` and `tainted` (a planned hand-over, a park, a cut and a drop included; decision 40, M6) found a READY of the current epoch: commit first (R7) |
| 6 | `deferred` | Refused for now; retry on a later turn with the same call (admission refused, not quiescent, intake already running). The row stays at its step, no new fence, no count (R3) |
| 10 | `reopened` | A dismissal was reopened (tms, R38); also a watcher wake class |
| 11-17 | watcher, non-urgent | 11 `ready`, 12 `repair`, 13 `soft-limit`, 14 `checker-batch`, 15 `window-limit`, 16 `drain`, 17 `act-due` (the planner's own predicate holds: a row the coordinator can act on, a free slot for a waiting row, a drain ready to hand over, a run with every row terminal, or an `event` line above `acked_seq` whose condition has cleared; decision 40, M3) |
| 20-27 | watcher, urgent | 20 `stall`, 21 `hang`, 22 `loop`, 23 `hard-limit`, 24 `memory`, 25 `stop-unconfirmed` (zombie spend past Z), 26 `common-cause`, 27 `tamper-seen` |
| 30 | `alarm` | `watch.mjs --alarm`: the long silence elapsed |
| 64 | `stale-ce` | `--ce` differs from `run/coord.json` (also: a watcher or alarm superseded by a newer ce) |
| 65 | `stale-epoch` | `--epoch`/expected step differs from the row; a commit of a non-current epoch (logged `zombie-write`) |
| 66 | `usage` | Bad command line |
| 67 | `table-corrupt` | `run/tasks.json` (or another `run/` state file) unparseable or schema-invalid. Every writing script refuses; `tasks.json.prev` is kept; the owner is told |
| 70 | `internal` | Uncaught error. Gates count it as not-run; a watcher 70 means "restart the watcher", never a field failure |
| 75 | `lock-busy` | `run/run.lock` still held after the bounded retry (or lost while held) |
| 0, 1, 2, 5, 6, 17, 21 | round 3 | Reasons added by the round-3 fixes, each filled by its fix (S0.5 lists them): FX-W1 the endturn's tri-state report of the wake sources (1, 2) and the alarms' exit markers; FX-W2 1 `arm-unconfirmed`, 0 `present` / `nonce-reused` / `abandoned`; FX-W3 6 `not-armed`; FX-W6 21 `hang` by kind, 17 `idle-child` / `age-cap`; FX-CLAIM 5 `claimed-late`, 6 `not-claimed`, 1 `not-claim-holder` |

Watcher precedence when several classes are present (first wins): 64, 27, 26, 25, 24, 23, 22, 21, 20,
11, 12, 10, 13, 15, 16, 14, 17. Urgent classes exit at the tick that sees them; non-urgent ones wait up to
`coalesce_ticks` ticks for others (R4). A READY of the current epoch voids stall, hang and loop for
that epoch (R5).

**Tamper record.** A writing script that exits 3 first appends one `incident` line {class: refusal,
detail: {tamper: true, script, code}} when it can: its `--ce` is current and the ledger tail
verifies. `run-from-attempt`, `ledger-broken` and `guard-hook.mjs` append none (the watcher sees a
broken ledger through `verifyLedger`). This line and a failing `verifyLedger` are the watcher's two
sources of class 27; a `check` line of check `tms` carrying a `reopened` reason is its source of
class 10 (§3.7), because the detached intake's exit codes reach no one.

### 1.5 Ids and names

| Thing | Pattern | Notes |
|---|---|---|
| field | `^(?!(?:con\|prn\|aux\|nul\|com[0-9]\|lpt[0-9])$)[a-z][a-z0-9]{0,11}$` | no hyphen, so keys parse; no DOS device name |
| question key | `^<field>-[a-z0-9]{1,12}-\d{2,3}$` | `<field>-<group>-<nn>` (R46) |
| approach, measure | `^[a-z][a-z0-9_]{0,47}$` | vocabulary in the protocol |
| task | `^(?!(?:con\|prn\|aux\|nul\|com[0-9]\|lpt[0-9])(?:$\|\.))[a-z][a-z0-9-]{1,39}$` | e.g. `f1-research`, `f1-review-r1`; no DOS device name |
| intent key | `^(?!(?:con\|prn\|aux\|nul\|com[0-9]\|lpt[0-9])$)[a-z0-9][a-z0-9-]{0,63}$` | `status.mjs intent --key` |
| attempt folder | `wt/<task>-e<e>/` | `e` ≥ 1, decimal, no padding |
| commit step | one of `pack`, `review`, `stpa`, `fmea`, `hazards` | listed in the row's `steps`; its output kinds are fixed in §3.22 |
| plant id | `pl_<16 hex>` | §3.17 |
| object id | `<prefix>_<16 hex>` | first 16 hex of the sha256 of the canonical bytes |
| object prefixes | `c` card, `p` pack, `r` review, `m` manifest, `x` certificate, `d` design-check output | `s` = seed (reserved, §3.17) |
| queue item | `i_<16 hex>` | opaque; real and seeded items alike |
| batch | `b<ce>-<n>` | n = 1, 2, ... per ce |
| session id | `^[0-9a-f-]{36}$` | the harness's id |

In the patterns above `\|` is a literal `|` (escaped for the table).

## 2. The run root

Outside every repository and every folder with a CLAUDE.md or `.claude/` above it (layout §1 of the
design). Keep the root path short (at most 40 characters, e.g. `C:/tcb/<run>`): attempt folders and
transcript paths below it otherwise pass 260 characters; `handover.mjs init` reports a longer root
as reason `root-long` (a warning, not a refusal; tests use long temp roots). `handover.mjs init`
creates missing directories, an empty task table (§2.1), a `.gitattributes` holding `* -text` and a
`.gitignore` listing `wt/`, `.snapshots/`, `sealed/`, `tmp/`, `run/*.lock`, `run/alarm.json`,
`run/watcher.json`, `run/*.stale`, `run/*.orphan`, `*.tmp`. The owner makes the git repository; no
script commits to it in the pilot (`commit.mjs` records `git: null`, §8 decision 23); fsck reads it.

```
tcb/                       trusted base (owner's approved commit)
plan/                      questions/<field>.json, approaches.json, protocols/<field>.json,
                           analysis-plan.json, cost-inputs.json, tasks-plan.json,
                           plant-candidates/<field>.json, our-work/<relpath>, notes/; frozen/;
                           unit-costs.json
run/                       run.lock, tasks.json(.prev), ledger.jsonl(.corrupt), status.json,
                           coord.json, acked.json, alarm.json, watcher.json, watcher.lock,
                           intents/, audit/, selftest.json, stop-sample/<task>-e<e>.json
store/                     objects/, commits/, status/card_status.jsonl, witness.jsonl,
                           qualification.json
views/                     labels.json, repair.json, coverage.json, measures.json, *.md, blind/,
                           comparison.json
queue/<batch>/             checker inputs          review-in/<task>/   a fresh reviewer's inputs
completeness/              cut-<sha12>.md, gate.json, model/
sealed/                    heldout/, seeds/, plants/, blind/
.snapshots/                raw/, text/, meta/, by-url/
wt/<task>-e<e>/            in/ (brief.md, manifest.json, checkpoint/, the inputs of §3.22),
                           view/ (todo.json, rejected.json, committed.json), staging/,
                           staging/harvested/, .claude/settings.json, .claude/agents/<type>.md
```

### 2.1 Single writer of each path

Every write below `run/`, `store/`, `plan/frozen/` and `completeness/` that is not exclusive-create
happens under `run/run.lock`. "lib" means through the named library function. **No subprocess**
(git, PowerShell, taskkill, a child script) **and no transcript parse runs while `run.lock` is
held**: a script takes its facts before the lock and writes after taking it (the lock's own
`selfInfo` is computed once per process before the first acquisition, §4.4).

| Path | Single writer | How |
|---|---|---|
| `tcb/**` | the owner, by an approved commit | no script writes |
| `plan/questions/`, `approaches.json`, `protocols/`, `analysis-plan.json`, `cost-inputs.json`, `tasks-plan.json`, `plant-candidates/<field>.json`, `our-work/**`, `notes/**` | coordinator (drafts; owner approves in the file's `approval`; `notes/` holds the quote and text files `status.mjs` reads) | any |
| `plan/frozen/<name>-<sha12>.json` | protocol-freeze | exclusive create |
| `plan/unit-costs.json` | cost (`from-transcripts`) | lib.writeAtomic |
| `run/run.lock` | any writing script, via lib.acquireLock (`withRunLock`) | wx |
| `<root>/.gitignore`, `<root>/.gitattributes` | handover `init` (only when absent) | exclusive create |
| `run/tasks.json`, `.prev` | lib.writeTasks, called by handover `init` (the empty table, only when `tasks.json` and `.prev` are both absent), replace (plan, fence, start, bind), stop (request, verify), commit (`commits`, state `committed`), status `--reconcile` (step `started`) | CAS on `rev` |
| `run/stop-sample/<task>-e<e>.json` | stop (`verify`) | lib.writeAtomic |
| `run/ledger.jsonl`, `.corrupt` | lib.appendLedger (any script under the lock) | append |
| `run/status.json` | status | lib.writeAtomic |
| `run/coord.json` | handover | lib.writeAtomic |
| `run/acked.json` | status `--endturn` | lib.writeAtomic |
| `run/alarm.json` | watch `--alarm` | lib.writeAtomic |
| `run/watcher.json`; `run/watcher.lock` | watch (watcher mode) | writeAtomic; wx |
| `run/intents/<key>.json`, `.done` | status `intent` | exclusive create |
| `run/audit/<task>-e<e>.json`, `run/audit/search-<task>-e<e>.jsonl`, `run/audit/coordinator-ce<ce>.json` | audit | writeAtomic |
| `run/selftest.json` | selftest | writeAtomic |
| `store/objects/<id>.json` | by kind: commit (card, pack, review, design-check `d_`), replace (manifest), certify (certificate) | lib.putObject (exclusive create; identical bytes = no-op) |
| `store/commits/<task>.<step>.json` | commit | exclusive create |
| `store/witness.jsonl` | witness | append under lock |
| `store/status/card_status.jsonl` | promote | append under lock |
| `store/qualification.json` | seed (`score`) | writeAtomic |
| `views/labels.json`, `views/repair.json` | tms | writeAtomic |
| `views/coverage.json`, `views/measures.json`, `views/*.md` | render | writeAtomic |
| `views/blind/`, `views/comparison.json` | compare | writeAtomic |
| `queue/<batch>/` | check-queue | exclusive create |
| `review-in/<task>/` | replace | built once per task |
| `completeness/cut-<sha12>.md`, `completeness/gate.json` | gate | exclusive create; writeAtomic |
| `completeness/model/` | protocol-model (built elsewhere) | — |
| `sealed/heldout/<field>.json` | protocol-freeze | exclusive create |
| `sealed/seeds/<batch>.json` | check-queue (through seed.mjs's exported functions) | exclusive create |
| `sealed/plants/<task>.json`, `sealed/plants/<task>/` | seed (`plant`) | exclusive create |
| `sealed/blind/<plan-sha12>.json` | compare (`anon`) | exclusive create |
| `.snapshots/raw|text|meta/<sha>`, `.snapshots/by-url/<urlKey>.jsonl` | snap | exclusive create; append under lock |
| `wt/<task>-e<e>/in/` (§3.22 inputs), `view/todo.json`, `.claude/settings.json`, `.claude/agents/<type>.md` | replace | at `start` |
| `wt/<task>-e<e>/view/rejected.json`, `view/committed.json` | commit (`intake`) | writeAtomic |
| `wt/<task>-e<e>/staging/harvested/` | harvest | exclusive create |
| `wt/<task>-e<e>/staging/**` other | the attempt's session | — (untrusted) |

Field-level split of `run/tasks.json`: replace owns `epoch`, `reason`, `step` `fenced`/`admitted`/
`bound`, `restarts`, `handovers`, `parks`, `limit`, `fails`, new `attempts[]` entries,
`attempts[].{folder, manifest, settings_sha, boot, bound_at}`, `session`, `tier`, `state` `active`,
and the state `cut`/`dropped` of a row fenced before any attempt ran (§3.6, `step` `stopped`); stop
owns `attempts[].stop`, `step` `stop-requested`/`stopped` and the state a confirmed stop sets
(`failed`, `cut`, `dropped`, `parked`); commit owns `commits` and `state` `committed`; status
`--reconcile` owns `step` `started` and `attempts[].session` found from a transcript. Rows are
created (state `planned`) only by `replace.mjs plan` from `plan/tasks-plan.json` (§3.22).

## 3. File formats

All files are UTF-8 JSON (or JSONL, one object per line, `\n`). Every reader strips one leading
U+FEFF (a BOM from a Windows editor); a file starting with the bytes FF FE or FE FF is `unparseable`
with detail `utf16`. Every object carries
`schema_version` (integer, currently `1`); a reader refuses an unknown version (exit 2, or reject
code `schema-version` in commit). Stored objects are canonical JSON (§4.2). "?" marks a nullable
field; `[]` an array; `{}` an object; "≤15w" a word cap (`x-maxWords` in the schema). Unless stated,
`additionalProperties` is false. The library builder writes `tcb/schemas/<format>.schema.json` for
each heading below, with the file name in brackets.

### 3.1 Card [card] — staging `wt/.../staging/**/*.card.json`, stored `store/objects/c_*.json`
| Field | Type | Meaning |
|---|---|---|
| kind | `"card"` | |
| field | field id | owning field |
| question_ids | key[] (≥1) | approved ids this card answers |
| route | `keyword|backward|forward|contrary|seed` | how the source was found (R35) |
| source | {url: string (http/https), canonical_id: string, primary_id: string, date?: string, evidence_type: `controlled|replicated|observational|benchmark|vendor|anecdote|other`} | canonical_id = DOI/arXiv/normalised title; primary_id = the original it rests on |
| quote | string ≤15w | exact words from the source |
| measured | {approach_id, measure, value: number or `"not stated"`, unit: string, baseline: number or `"not stated"`, baseline_kind: `none|prior|control|vendor-claim|other`, better: `higher|lower`, effect: `improves|worsens|no-effect|mixed`} | |
| conditions | {task: string[], model_family: string[], repo_size: string?, language: string[], metric: string?, other: string ≤40w?} | typed scope, stored once, shown by join |
| what_measured | string ≤40w | |
| supersedes | card id? | a correction (R16) |
| supersede_reason | `wrong-number|wrong-quote|wrong-conditions|wrong-source|other`? | required with supersedes |

No status, label, provenance or id field: the schema refuses them (R27). Origin (harvested or
session-written) is recorded by commit in its `intake` ledger line.

### 3.2 Sentence (inside pack, review) [sentence]
| Field | Type | Meaning |
|---|---|---|
| sid | `^s[0-9]{1,4}$` | unique within its object |
| approach_id, measure | slug | the key prose is matched by (R37) |
| kind | `fact|judgment` | |
| text | string ≤80w | |
| cites | card id[] | a fact needs ≥1; all must be in the named pack |
| applies_to | {task?, model_family?, repo_size?, language?, metric?} (same types as conditions) | declared scope, checked against the cited cards |

### 3.3 Pack [pack] — staging `pack.json`, stored `p_*`
`{kind:"pack", field, questions_sha (sha256 of the frozen question list), cards: card id[] (sorted,
unique), conclusions: sentence[], index: [{mechanism: slug, summary: string ≤ index_words, cards: id[]}]?
(two-level form, R17), not_covered: [{question_id, reason: no-source|budget|cut|dropped-by-owner}],
parent: pack id?}`. The pack id hashes content only; status lives outside it.

### 3.4 Review [review] — staging `review.json`, stored `r_*`
`{kind:"review", field, task, pack: pack id, parent: review id?, sentences: sentence[],
verdicts: [{approach_id, verdict: promising|untested|wrong-form|wrong-problem|not-worth-testing|unclear,
supports: sid[]}], dismissals: [{sid, verdict: wrong-form|wrong-problem|not-worth-testing|dropped-field,
supports: card id[], outlist: [{approach_id, measure, effect}]}], our_work_findings: [{file, locator:
string, reason: wrong-assumption|wrong-number|wrong-scope|other, text ≤40w}]}`.
Design-check outputs (STPA, FMEA, hazards) are stored as `d_` objects with `kind` `stpa|fmea|hazards`
(`PREFIX` maps all three to `d`), staged as `staging/stpa.json`, `staging/fmea.json`,
`staging/hazards.json` (commit's `name-kind` check), with the fields of the design's §8 file list;
their schemas are written by U5a with gate.mjs (`spec/gate.mjs.md`).

### 3.5 Manifest [manifest] — `store/objects/m_*`, written by replace at `start`
`{kind:"manifest", task, epoch, role, brief_sha, schema_shas: {name: sha}, tier: string, tools: string[],
inputs: [{name: relpath under in/, sha256}] (sorted), agents: [{type, sha256}] (the
`.claude/agents/<type>.md` files copied, sorted), user_files: [{path, sha256?}] (user-level files
that still load, R22), outputs: [{step, kinds: string[]}]}`. Sources: `tier` = the row's `tier`;
`tools` = the profile's `tools_allow`; `schema_shas` = the schemas of every kind in `outputs` plus
`ready`; `user_files` = every path of threshold `user_files` with its sha256 (null when absent);
`outputs` = the row's `steps` mapped through §3.22's step table. The **step key** is the full sha256
of the manifest's canonical bytes.

### 3.6 Task row and the step machine [task-row]
`run/tasks.json` [tasks]: `{schema_version, rev: int ≥0, tasks: row[]}`. Row:

| Field | Type | Meaning |
|---|---|---|
| task, field | ids | field null for design-check tasks |
| stage | `research|review|fresh-review|control|design-check` | |
| role | `child|child-reviewing|fresh-reviewer|control|stpa|fmea|mapper|canary` | selects `tcb/profiles/<role>.json` |
| steps | step[] (≥1) | commit steps this task must commit, in order (e.g. `["pack","review"]` under F1(a)) |
| deps | task[] | must be `committed` before admission |
| question_ids | key[] | the ids this task owns (from the protocol) |
| e_task | int (tokens) | the task's term in the reservation (R10) |
| tier | string | the model tier the coordinator starts the session with (from the tasks-plan; recorded in the manifest, never in a brief) |
| state | `planned|active|parked|committed|cut|failed|dropped` | lifecycle |
| step | `none|fenced|stop-requested|stopped|admitted|started|bound` | where the current attempt's start is (R3) |
| epoch | int ≥0 | 0 = never started |
| reason | fence reason? | of the latest fence |
| session | session id? | bound session of the current epoch |
| restarts, handovers, parks | int | R8 counters (`restarts` counts non-host failures) |
| limit | bool | the limit path was taken: `failed` once the stop is confirmed |
| fails | [{epoch, class: stall|hang|loop|crash|tainted, host: bool, tick: int}] | `tick` = watcher.json `ticks_total` at the fence |
| attempts | [{epoch, folder, session?, bound_at?, boot?: string, manifest?: m_ id, settings_sha?, cut: {files: {relpath: {len, sha256}}, ledger_seq}?, spend_at_fence?, stop: none|requested|confirmed|unconfirmed}] | every attempt, for spend, live processes and fsck's `.claude/` check. Always read through `lib.attemptOf(row, e)` (the entry whose `epoch` is e), never by array position |
| commits | {step: commit-record sha256} | |
| updated_rev | int | rev that last changed the row |

Fence reasons: `first` (planned task only); failure: `stall|hang|loop|crash|tainted` (`tainted`: the
attempt's `audit` line is tainted, R22/R27: its output is not accepted and the task reruns once, then
fails); planned: `memory` (park; counts toward H_max), `handover` (counts toward H_max); terminal:
`cut`, `drop` (needs an `owner` ledger line naming the task). A failure fence is `host` (no charge to
R, no count toward W_cc) when the attempt's `boot` is non-null and differs from the current boot
identifier (`proc.boot()`, equality only; either unknown → not host; never `tainted`). Fast Startup
must be off on the PC, or a "shutdown" keeps the boot identifier and the failure is charged
(README).

**Target attempt.** `--epoch` is always the row's current epoch. A call that acts on the attempt a
fence ended (stop at step `fenced`/`stop-requested`) targets attempt e−1; on a row with no fence
since its last attempt (`committed`, or `cut`/`dropped` before any start) it targets attempt e.

| From (state / step) | Call | To |
|---|---|---|
| planned / none | `replace fence --reason first` | active / `stopped` (nothing to stop), epoch 1 |
| planned / none, or active / stopped | `replace fence --reason cut\|drop` | no new attempt, epoch unchanged, step `stopped`, state `cut` (replace writes the `overflow` line) or `dropped`. Nothing runs, so nothing is stopped |
| active / bound, started, admitted; parked / stopped | `replace fence --reason <r>` | step `fenced`, epoch e+1 (CAS: only if still e); staging cut and `spend_at_fence` recorded. Any reason other than `tainted` (failure reasons, `handover`, `memory`, `cut`, `drop`; decision 40, M6): READY of e present under the lock → exit 5, no change (a READY never wins over a taint); restarts = R already → fence applied, `limit` true, exit 1 `limit`; else restarts+1 unless host. `handover`/`memory` with handovers+parks ≥ H_max → exit 1 `hmax`, no change |
| active / fenced | `stop request` | `stop-requested` if attempt e−1 has a session (or a folder transcript), else `stopped` |
| active / stop-requested | (coordinator stops the session) then `stop verify`, repeated | first call samples and exits 6; a later call, once `stop_verify_deltas` watcher ticks have passed, → `stopped` if confirmed; else stays, `stop` = unconfirmed, exit 1 |
| committed / bound | `stop request`, then (coordinator closes the session) `stop verify`, repeated | step `stop-requested` → `stopped`, state stays `committed`, attempt e's `stop` = confirmed (frees its slot, decision 17) |
| on reaching `stopped` (by either call, not committed) | — | `limit` → state `failed`; reason `cut` → `cut` + `overflow` line; `drop` → `dropped`; `memory` → `parked`; otherwise state `active` awaiting `replace start` |
| active or parked / stopped | `replace start` | `admitted` (folder, manifest, brief built), state active; refused → exit 6, unchanged |
| active / admitted | (coordinator starts the session in the folder) then `replace bind --session S`, or `status --reconcile` finding a transcript whose cwd is the folder → `started` | `bound` (`started` then `bind`); `bind` records `boot` |
| active / bound | READY of this epoch seen → `audit --task --epoch`, then `commit record --task --epoch --step s` per step | state `committed` when every step has a commit record; a tainted audit makes record exit 1 `tainted` and the coordinator fences with reason `tainted` |

A step machine call that finds another step exits 65 and changes nothing; a call whose effect is
already there (same epoch, same step reached, same session) exits 0 (idempotent).

### 3.7 The ledger line [ledger-line] — `run/ledger.jsonl`
`{seq: int ≥1, prev: 64 hex, hash: 64 hex, ts: iso, ce: int?, writer: script name, writer_sha: 64 hex,
kind, task?, epoch?, data: {}}`; `hash = sha256hex(prev + canonical(line without hash))`; the first
line's prev is 64 zeros. Kinds and their `data`:

| kind | writer | data |
|---|---|---|
| `plan` | replace (`plan`) | added[] (task ids) |
| `fence` | replace | reason, from, to, host, restart_charged, limit, cut_files |
| `stop-request`, `stop` | stop | session; confirmed, grew[], survivors[{pid, start_time, name}], zombie_tokens |
| `admit` | replace | e_task, reservation, B, r, live, free_mb |
| `bind`, `started` | replace; status | session (bind also boot) |
| `intake` | commit | objects[{id, kind, origin: harvested|session|checkpoint}], rejected[{file, code}], flagged[{id, sid, code}] |
| `commit` | commit | step, outputs_sha, n, git (null in the pilot) |
| `zombie-write` | commit, watch | epoch_seen, tokens |
| `event` | watch | class, code, urgent, detail, key (§3.10) |
| `drain`, `halt` | watch | window, w_star; reason, fails[] |
| `overflow` | stop (on a confirmed `cut`); replace (a `cut` before any start) | ids[], tokens, reason |
| `check` | every checking script | check, subject (a string), result: pass|fail|not_run, reasons[{code, detail}] (R40). tms adds reason `{code: "reopened", detail: [keys]}` for every newly reopened dismissal |
| `witness` | witness | counts, first_seq, last_seq (the `store/witness.jsonl` seqs it wrote) |
| `promote` | promote | mode: witness|checker|revert, batch?, class?, first_seq, last_seq |
| `audit` | audit | label: clean|tainted, undeclared[], protected_writes[], first_context, notes_bad |
| `fsck` | fsck | result, failing[] (fsck's R40 record; no separate `check` line) |
| `selftest` | selftest | tcb_sha, result, failed[] |
| `protocol-freeze` | protocol-freeze | name, sha256, path |
| `protocol-amend` | protocol-freeze | name, sha256, path, old_sha, reason_code |
| `plan-freeze` | protocol-freeze | name, sha256, path |
| `seed-split` | protocol-freeze | field, n_brief, n_heldout, rng_seed |
| `queue` | check-queue | batch, n, n_seeds, rng_seed |
| `certificate` | certify | id, result |
| `cut`, `gate` | gate | sha; result, cut_sha, hazards_sha |
| `unit-costs` | cost (`from-transcripts`) | sha256, unattributed_share, trusted |
| `coord-init`, `ce-raise`, `coord-bind` | handover | tcb_commit; from, to; session |
| `owner`, `intent-open`, `intent-done`, `meter` | status | act: approve|accept|resume|drop|ruling, subject, quote (≤500 chars); key; key; pct, self_reported: true |
| `lock-break`, `torn-tail`, `incident` | lib; lib; any | stale {pid, start_time, nonce, script}, unreadable? {bytes, sha256} (§4.4); bytes; class: refusal|timeout|restart|not-run, detail (R58; a tamper exit's detail is {tamper: true, script, code}, §1.4) |

Fixed `check` subjects (check: subject): witness: `witness`; tms: `labels`; render: `views`; audit:
`<task>-e<e>` or `coordinator-ce<ce>`; certify: `<review id>`; plant: `<task>`; seed-score:
`qualification`; selftest: `<tcb_sha>`; canary: `canary:<session>`; gate: `<cut sha12>`; compare:
`anon`, `score`; protocol-freeze: the frozen `name`. Owner `subject`s:
`protocol:<field>` and `analysis-plan` (act approve), `hazard:<hazard_id>` (act accept), a task id
(act drop), `run` (act resume), free text (act ruling).

### 3.8 Status [status] — `run/status.json` (status.mjs)
`{generated_at, ce, rev, ledger: {seq, head}, tcb_commit, acked_seq, events_pending: seq[] (event
lines after acked_seq), slots: {live, unknown, unconfirmed, max}, memory: {free_mb, reserve_mb,
peak_mb}, budget: {B, reservation, r, spent_total}, halted: bool, draining: bool,
tasks: [{task, state, step, epoch, V, spent, e_task, soft, hard, window, next:
none|replace-fence|replace-start|stop-request|stop-session|stop-verify|start-session|bind|audit|commit|owner}],
watcher: {alive, ce, last_tick_at, ticks_total}, alarm: {alive, ce}, open_intents: key[],
not_run: [{check, subject}], anomalies: [{code, detail}]}`. A pure function of files; any writer
gives the same view for the same inputs (except `generated_at`). `V` is `lib.variant` (null where it
does not apply); `not_run` lists (check, subject) whose last `check` line is not_run, plus
(`fsck`, `store`) when the last `fsck` line is not_run.

### 3.9 Coordinator files
- [coord] `run/coord.json`: `{ce: int ≥1, session?, started_at, tcb_commit: 40 hex}`.
- [acked] `run/acked.json`: `{ce, acked_seq: int, at}`. Its bytes are also the alarm's **arm
  token** (decision 40, M1): every `status --endturn` rewrites it (a new `at`), and a running alarm
  that finds the file's sha256 changed since its last look sleeps again instead of exiting. No
  other writer; the format is unchanged.
- [alarm] `run/alarm.json`: `{pid, start_time, ce, armed_at, sleep_ms}`.
- [intent] `run/intents/<key>.json`: `{key, ce, subject, text_sha, created_at}`; `.done`: `{key, done_at}`.

### 3.10 Watcher [watcher] — `run/watcher.json`; `run/watcher.lock` [lock-record]
`watcher.json`: `{ce, pid, start_time, ticks_total, last_tick_at, intake: {pid, start_time}?,
active: {<key>: onset_tick}, pending: [{key, class, task?, first_tick}] (non-urgent, coalescing),
tasks: {<task>: {epoch, calls, stall_calls, hang_ticks, V, V_min, loop: {sig, run}, spend, window,
zombie_tokens, files: {<path relative to transcripts_root>: parse-state}}}, coord_file:
{<relpath>: parse-state}?}`. Counters are continued by any later watcher; a new epoch resets that
task's counters. A class instance's **key** is `<class>|<task or ->|<epoch or ->|<onset_tick>`:
`onset_tick` is the tick at which the condition became present after being absent (kept in
`active` while present, removed when absent). The watcher appends one `event` line per key and
exits for a key only while that line's seq > `acked_seq`; a condition that clears for a tick and
returns gets a new onset and raises again. For class 17 `act-due` the second part names the act
too: `17|<task or ->:<act>|<epoch or ->|<onset_tick>` (acts: `replace-fence`, `replace-start`,
`stop-request`, `stop-session`, `stop-verify@<sample tick or ->`, `start-session`, `bind`,
`handover`, `run-terminal`, `events`), so a row whose next act changes raises again.
`parse-state` = `{end_byte, last_call: {id, usage}?, calls, input, cache_read, cache_write, output,
last_context, peak_context, loop: {sig, run}}`: each tick parses only from `end_byte`
(`parseTranscript(..., {fromByte, lastCall})`); a file shorter than `end_byte` is re-parsed from 0.
Lock record (run.lock and watcher.lock): `{pid, start_time, nonce: 32 hex, script, ce?, acquired_at}`.

### 3.11 Commit record [commit-record] — `store/commits/<task>.<step>.json`
`{schema_version, task, step, epoch, step_key: 64 hex, outputs: [{id, kind, sha256}] (sorted by id), outputs_sha}`
where `outputs_sha = sha256hex(canonical(outputs))`. Created once (wx). The same bytes again is a
no-op (exit 0, and the `commit` ledger line is appended only if missing); different bytes exit 1
`commit-differs`. Consumers (pack freeze, review-in, synthesis, restart) read outputs **only**
through commit records and re-check every `sha256` first.

### 3.12 Ready marker [ready] — `wt/<task>-e<e>/staging/READY.json` (the session)
`{kind: "ready"|"repair", task, epoch, step?: commit step (ready), question_ids?: key[] (repair),
missing?: source|snapshot|card|check|other (repair)}`. Untrusted: a READY whose `epoch` differs from
the table is zombie-write telemetry only. READY.json is a copy that no decision reads; the decision is
the outcome log (§3.23): the guard-hook turns a valid Write of READY (`kind: ready`) into a ready slot
before the harness writes the copy, denies an Edit of READY (`ready-write-only`) and a READY of another
task, epoch or step (`ready-invalid`), and lets a repair marker through with no slot. READY.json is
still read for the repair marker (watcher class 12) and the zombie-write telemetry.

### 3.13 Snapshot metadata [snapshot-meta] — `.snapshots/meta/<raw_sha>.json`
`{url, final_url, retrieved_at, http_status: int, content_type, bytes: int, raw_sha, text_sha?,
extractor: "html-v1"?, reason?: http-error|blocked|too-large|timeout|pdf|unsupported-type|empty-text|
private-address|bad-scheme|too-many-redirects}`. The meta of a raw sha describes the **first**
retrieval of those bytes: the same bytes from another URL or a later fetch keep it (not an error).
`by-url/<lib.urlKey(url)>.jsonl` (`urlKey(u) = sha256hex(new URL(u).href)`, used by snap, witness,
guard-hook and replace alike) lines: `{schema_version, raw_sha: 64 hex|null, retrieved_at,
source_changed: bool, reason?: <the meta reason enum>}`; `reason` is required when `raw_sha` is null
(a retrieval that stored no bytes).

### 3.14 Witness record [witness] — `store/witness.jsonl`
`{seq, card_id, card_sha, raw_sha?, text_sha?, result: witnessed|rejected|unverifiable,
quote_offset?, number_offset?, number_bound: bool, reason: ok|quote-missing|number-missing|
number-without-quote|no-snapshot|pdf|empty-text|card-changed, source_changed: bool, w: int, at}`.

### 3.15 Card status record [card-status] — `store/status/card_status.jsonl` (promote only)
`{seq, card_id, card_sha, status: witnessed|rejected|unverifiable|confirmed, reason: slug,
witness_seq?, check: {batch, item, verdict, node?: "<obj_id>#<sid>"}?, classes?: J[] (the classes a
confirmation relies on: J1, J2, J4 for a card item; J1-J4 for a sentence item), at}`. The last line
per card is its status; no line = `pending`. A revert after an unqualified class Jk is one line per
card with reason `unqualified-revert`, `classes: [Jk]`, for every card whose own confirmation or
some confirmed `sentence-check` clearing relies on Jk (not already reverted for Jk); its status is
`witnessed` when the card's own confirmation relies on Jk, else the card's current status (the
line then only reopens the clearing; a confirmation that relies on other classes stands;
`spec/promote.mjs.md` revert step 2).

**R18 flag clearing** (`lib.flagCleared`, used by tms and certify alike). An `intake` flag on
sentence (object o, sid s) is cleared when, for every card the sentence cites, a status line exists
with `check.node` = `o#s`, `check.verdict` = `confirmed`, reason `sentence-check`, whose
`check.batch` has a `queue` ledger line with seq greater than the flagging `intake` line's seq, and
no later line of that card has reason `unqualified-revert` with a class in that line's `classes`.
Otherwise the flag stays open (`flag-open` in tms, `r18-flag` in certify).

### 3.16 Certificate [certificate] — `store/objects/x_*` (certify)
`{kind:"certificate", task, subject: review id, pack, step_key, read_set: [{card_id, status_seq}]
(sorted), read_set_sha, session_label: clean|tainted, coverage: {approved: int, covered: int,
not_covered: key[]}, cited: {n, confirmed, failing: [{card_id, code}]}, plants: {k, found,
contra_found}, seed_escape: {n, escaped}?, result: certified|not_certified|not_run, reasons: slug[]}`.
`status_seq` = the seq of the card's last status line (0 if none); `read_set_sha =
sha256hex(canonicalize(read_set))` (`lib.readSetSha`). Void (tms labels it STALE) once the
recomputed read-set hash differs.

### 3.17 Seed and plant records [seed-key], [plant-key]
- `sealed/seeds/<batch>.json`: `{batch, rng_seed, items: {<item_id>: {seed: false, card_id, node?:
  "<obj_id>#<sid>"} | {seed: true, class: S1|S2|S3|S4|J1|J2|J3|J4, operator: slug, from_card,
  seed_id: "s_<16hex>"}}}`; `node` names the sentence of a sentence item, so promote can attach the
  verdict to it.
  At most one seed per class per batch, at a random position (R42). Seed ids appear only here, in
  `queue/` item bodies' mapping and in qualification; commit, render and synthesis refuse any `s_` id
  (exit 3).
- `sealed/plants/<task>.json`: `{task, k, plants: [{plant_id, file, locator, card_id, against_hope:
  bool, original_sha, planted_sha}]}`; `plant_id` = `pl_` + 16 hex, `locator` = `line <n>` (1-based
  line of the change in the planted file), `file` relative to `plan/our-work/`. The planted copies are
  `sealed/plants/<task>/<relpath>`. Candidates come from `plan/plant-candidates/<field>.json` (§3.22).
- `queue/<batch>/item-<item_id>.json` [queue-item]: `{item, card: card fields (no id), window: string
  (~window_words around the offset), sentence?: sentence}`; `queue/<batch>/batch.json`:
  `{batch, mode: intake|freeze|post-review, items: item_id[]}`. Checker verdict schema [verdict]:
  `{item, verdict: confirmed|number_mismatch|baseline_swapped|conditions_mismatch|outside_conditions|
  unclear, field?: string, offset?: int}`.

### 3.18 Protocol [protocol] — `plan/protocols/<field>.json`, frozen copy in `plan/frozen/`
`{kind:"protocol", field, question_ids: key[], criteria: {include: [{code, text}], exclude: [{code,
text}]}, routes: route[], card_schema_version: int, certainty_method: string, sesoi: {<measure>:
number}, outlist_vocab: {approaches[], measures[], effects[]}, seeds: canonical_id[], must_read:
[{url, why}], fixed_files: [relpath] (our files copied into review-in, relative to `plan/our-work/`),
cross_field: [{question_id, owner_field}], approval: {quote: string, at}}`. The analysis plan
[analysis-plan]: `{kind: "analysis-plan", units, primary, secondary[], delta, decision_rules[],
looks: 1, arm_budget: {arm: tokens}, arm_tasks: {<arm>: {pack?: "<task>.<step>", review?:
"<task>.<step>"}}, predicted_total, labels[], approval}`; `arm_tasks` keys are within `arm_budget`'s,
each reference names a planned task and one of its steps (protocol-freeze checks it, `arm-tasks`), so
the arm-to-output mapping is fixed before any result. A frozen file's sha256 (of canonical bytes) is
what the ledger names.
- Frozen names: `plan/frozen/protocol-<field>-<sha12>.json` with ledger `data.name` `protocol-<field>`;
  `plan/frozen/analysis-plan-<sha12>.json` with `data.name` `analysis-plan`. The **current** frozen
  protocol of a field is the file named by the last `protocol-freeze`/`protocol-amend` line whose
  `data.name` is `protocol-<field>` (`lib.currentProtocol(root, field)`, which re-checks the bytes
  against the line's sha256).
- `questions_sha` = `sha256hex(canonicalize(sorted question_ids of the frozen protocol))`
  (`lib.questionsSha`); packs record it, commit checks it, tms marks a pack STALE when it differs.
  `plan/questions/<field>.json` is a coordinator draft no script reads; the protocol's `question_ids`
  are the approved list.

### 3.19 Gate [gate] — `completeness/gate.json`
`{schema_version, cut_sha: 64 hex|null, hazards_sha: 64 hex|null, model_result_sha?, matrix: {full:
bool, empty_cells: int}, p_ids_missing: string[], high_uncovered: string[], model: pass|fail|not_run,
action_lines: [{measure, line, value?, result: pass|fail|reading}], result: pass|fail|not_run,
reasons: slug[]}` (a sha is null on not_run when its input is absent). `p_ids_missing` lists the
required ids that no hazard's `p_ids` names: the problem ids `P1`..`P21` and the gap ids `G1`..`G12`
(R55: the gaps are problem rows too). Admission accepts it only when
`result` is pass and both shas equal `lib.currentDesign(root)`'s `cut_sha` and `hazards_sha` (R55).
Missing = not-run.

### 3.20 Thresholds [thresholds] — `tcb/thresholds.json`
`{schema_version, params: {<name>: {value: number|string|bool|null|array|object, unit, source:
"mapping:<ref>"|"owner"|"guess"|"measured", gate: bool, line?: {measure: string, op:
max|min|floor}}}}`. `value: null` or `gate: false` = a reading, never a gate (R45; this includes
`B_tokens` and `r_tokens`: while null, the budget is a reading and admission does not refuse on
it). `line` marks an owner **action line** that gate.mjs compares with
`views/measures.json` `values[measure]` (§3.19); only params carrying `line` are action lines. Every
name a script reads is listed here (`get` of an absent name is `param-missing` 2); the default is the
value `tcb/thresholds.json` ships:

| Name | Default | Source | Name | Default | Source |
|---|---|---|---|---|---|
| delta_ms | 60000 | mapping D1-02 | coalesce_ticks | 2 | guess (δ = 2 min) |
| stall_calls (c) | 30 | guess | hang_ticks (h) | 10 | guess |
| loop_k | 3 | mapping D3-06 | W_cc_ticks | 30 | mapping D1-09 |
| R | 1 | design R8 | H_max | 2 | guess |
| Z_frac | 0.1 | guess | stop_verify_deltas | 2 (ticks) | guess (R9's 2Δ) |
| N_max / N_ceiling | 2 / 3 | guess; computed by the decision rule (r57-0414), memory one of its limits, measured per session (Q19) | peak_mb / reserve_mb | 1200 / 1024 | guess |
| soft_frac / hard_frac | 0.8 / 0.9 | D3-05 / guess | alarm_ms | 3600000 | guess |
| B_tokens, r_tokens | null | owner (F4) | W_quality | 300000 | coordinator |
| W_star_coord | 133200 | mapping D3-01 (cost.js) | coord_over_factor | 1.5 | mapping D3-01 (R50) |
| W_star_child | null | option (b) only | lean_baseline_tokens / lean_tolerance_tokens | null / null | measured |
| child_prefix_tokens | 60000 | guess (cost inputs child P) | review_reserve_tokens | 75000 | guess (cost inputs review pack) |
| w_chars | 300 | D1-05 | window_words | 200 | D5-04 |
| d0, beta | 0.8, 0.05 | mapping D4-01, D4-09 | plants_k / plants_t | 3 / null | D5-07 / owner (reading) |
| unverifiable_share_max | null, `line: {measure: unverifiable_share, op: max}` | owner | coverage_floor | null, `line: {measure: coverage, op: floor}` | owner (reading) |
| unattributed_share_max | 0.1 | guess | blind_fail_rate | 0.8 | mapping D6-05 |
| batch_size | 12 | guess | index_words | 120 | guess |
| f5_given | false | owner | fetch_max_bytes / fetch_timeout_ms | 10485760 / 30000 | guess |
| fetch_max_redirects | 5 | guess | hook_deadline_ms | 5000 | guess |
| selftest_case_ms | 60000 | guess | sleep_gap_ms | 600000 | guess |
| lock_retries | 300 | guess (about 30 s at 100 ms) | intake_step_timeout_ms | 1800000 | guess (watch.mjs falls back to it when absent) |
| allow_loopback | false | owner (tests set it) | transcripts_root | `C:/Users/User/.claude/projects` | measured (fact 5) |
| proc_exe | `C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe` | measured (test seam) | user_files | `["C:/Users/User/.claude/CLAUDE.md", "C:/Users/User/.claude/settings.json"]` | owner (R22) |
| tcb_paths_protected | `["tcb/","sealed/","review-in/",".claude/","run/","store/",".git/"]` | R29 | weights | {read:0.05,write:1.25,out:5} | measured (pricing ratios, cost inputs tag M) |

Names only one script or the cost model reads (`seeds_per_class_per_call`, `proof_seed_share`,
`fill_factor`, `replan_ratio`, `s2_allowed`, `crossed_design_allowed`, `handover_measure`) keep the
values in `tcb/thresholds.json`. The design-rule or "tests only" note goes in `unit`.

### 3.21 Role profile [profile] — `tcb/profiles/<role>.json`
`{role, tools_allow: string[], tools_deny: string[], read_prefixes: string[], write_prefixes:
string[], agent_types: string[], fetch: none|witnessed|any, bash: none|tcb-node}`. Prefixes use
`{root}`, `{attempt}`, `{batch}` placeholders (`{batch}` = any `queue/<b>/` holding `batch.json`;
audit flags a checker that read more than one batch). Profiles exist for every row role and for
`coordinator`, `reader`, `checker` (`spec/guard-hook.mjs.md`).
- **Settings.** `replace start` renders `wt/<task>-e<e>/.claude/settings.json` from
  `tcb/settings/<role>.json` by placeholder substitution only: `{root}`, `{attempt}`, `{task}`,
  `{epoch}`, and `{node}` = `process.execPath` of the replace run. The hook entry is `{matcher: "*",
  hooks: [{type: "command", command: "\"{node}\" \"{root}/tcb/guard-hook.mjs\" --root
  \"{root}\" --role <role> --task {task} --epoch {epoch}", timeout: 30}]}` under `PreToolUse`. The
  owner installs `tcb/settings/coordinator.json` (no task, no epoch) and merges `user-deny.json` into
  his user settings. guard-hook and audit enforce the same profile.
- **Agent files.** `tcb/agents/<type>.md` (U3b: front matter `name`, `description`, `tools`; body =
  the verbatim `tcb/briefs/<type>.md`). replace copies the file of every type in the profile's
  `agent_types` into `.claude/agents/`; the manifest lists them (`agents`); fsck accepts exactly those.
- **Hook input** (believed, needs-app 1): stdin JSON with `hook_event_name`, `tool_name`,
  `tool_input`, `cwd`, `session_id`, `transcript_path`, and for a helper's call `agent_type`.

### 3.22 Other shared formats
A schema file is written for each bracketed name. Formats defined in a unit's spec are adopted here
as written there; the spec is the single place of their fields.
- [tasks-plan] `plan/tasks-plan.json` (coordinator): `{schema_version, tasks: [{task, field?, stage,
  role, tier, steps, deps, question_ids, e_task}], approval?: {quote, at}}`. replace `plan` validates
  it (deps name planned tasks, no cycle) and creates rows; it does not check `approval`.
- **Steps and kinds** (manifest `outputs`, commit `record`): `pack` → [card, pack]; `review` →
  [review]; `stpa` → [stpa]; `fmea` → [fmea]; `hazards` → [hazards].
- **Attempt inputs** built by `replace start` under `wt/<task>-e<e>/in/`, every file listed in the
  manifest `inputs`: always `brief.md`, `manifest.json`, `checkpoint/committed/<id>.json`,
  `checkpoint/prefix/<relpath>`; every stage with a field: `protocol.json` (the current frozen
  protocol's bytes; its `seeds` is the brief half) and `questions_sha.txt` (one line, §3.18),
  `must_read.json` [must-read] `{schema_version, urls: [{url, href}]}` (the frozen `must_read`;
  guard-hook reads only this file plus the URL's `by-url` file and meta); roles whose `agent_types`
  hold `reader`: `reader-brief.md` (a copy of `tcb/briefs/reader.md`); stage `design-check`:
  `cut.md` (the bytes of `completeness/cut-<sha12>.md` of the last `cut` line) and `cut_sha.txt`;
  role `mapper` also `stpa.json`, `fmea.json` (the committed outputs of that cut, chosen as
  `lib.currentDesign` chooses), `problems.md` (`plan/our-work/problems.md`) and, when a hazards object
  exists for the cut, `hazards.json`; stage `fresh-review`: a copy of `review-in/<task>/` (below).
- **review-in** `review-in/<task>/`, built once by replace: `pack.json` (the pack output of the
  research dep's `pack` commit record), `cards/<card id>.json` (every card of that pack),
  `files/<relpath>` (each protocol `fixed_files` entry from `plan/our-work/<relpath>`, replaced by
  `sealed/plants/<task>/<relpath>` where a planted copy exists), `snapshots/<text_sha>.txt` (the
  stored text named by each pack card's last witness record, when it has one).
- [todo] `view/todo.json` (replace): `{schema_version, task, epoch, todo: key[], covered: key[]}`
  from `lib.variant`.
- [rejected] `view/rejected.json` and [committed] `view/committed.json` (commit intake):
  `{schema_version, task, epoch, rejected: [{file, code}]}` with `file` the posix path relative to
  the attempt folder; `{schema_version, task, epoch, committed: [{id, kind, file}]}` for every
  accepted object, so a session can cite ids it cannot hash. Reject codes: `unparseable`,
  `schema-version`, `schema-invalid`, `unknown-kind`, `name-kind`, `wrong-field`,
  `question-not-owned`, `questions-sha`, `supersede-reason`, `supersedes-missing`,
  `url-not-in-transcript`, `not-sorted`, `fk-card`, `fk-parent`, `fk-pack`, `index-invalid`,
  `dup-sid`, `uncited-fact`, `cite-outside-pack`, `bad-sid`, `untrusted-path`. Flag codes:
  `scope-outside`, `scope-dropped`, `number-uncited`.
- [plant-candidates] `plan/plant-candidates/<field>.json` (coordinator, owner-approved):
  `{schema_version, field, candidates: [{key, file, find, replace, card_id, against_hope, reason}]}`,
  `file` relative to `plan/our-work/`.
- [reader-result] a reader helper's structured result: `{schema_version: 1, cards: card[] (each a
  full [card], `schema_version` included), skipped: [{url, reason: no-exact-words|blocked|other}]}`.
  harvest reads this and a bare card, and adds nothing to a card.
- [checker-result] `{schema_version: 1, verdicts: verdict[]}`; promote and seed extract verdicts
  with `lib.checkerVerdicts` (one rule). [scorer-result] as `spec/compare.mjs.md`.
- [qualification] `store/qualification.json` (seed `score`): as `spec/seed.mjs.md` step 6; readers use
  `classes.<C>.qualified` (bool) and `escape {n, escaped}`.
- [labels], [repair] `views/labels.json`, `views/repair.json`: as `spec/tms.mjs.md`.
- [coverage], [measures] `views/coverage.json`, `views/measures.json` and the page names
  `views/pack-<task>.md`, `review-<task>.md`, `synthesis.md`, `owner.md`: as `spec/render.mjs.md`;
  `measures.json` carries top-level `values: {unverifiable_share: number|null, coverage:
  number|null}` (gate's action lines).
- [comparison], [blind-index], [blind-key] `views/comparison.json`, `views/blind/index.json`,
  `sealed/blind/<plan-sha12>.json`: as `spec/compare.mjs.md`.
- [heldout] `sealed/heldout/<field>.json`: as `spec/protocol-freeze.mjs.md`.
- [selftest] `run/selftest.json` and [fixture-case] `tcb/fixtures/<script>/<case>/case.json`: as
  `spec/selftest.mjs.md`; every unit's fixtures use that case format. Its optional `git: true`
  makes the case root a git repository whose one commit holds the case's `tcb/` and sets
  `run/coord.json` `tcb_commit` to it (the only way an `fsck` case can pass the tcb check).
- [stop-sample] `run/stop-sample/<task>-e<e>.json` (stop): `{schema_version, task, epoch, target,
  tick, sizes: {<path relative to transcripts_root>: bytes}}`.
- [unit-costs] `plan/unit-costs.json`: as `spec/cost.mjs.md`.

### 3.23 Outcome log [outcome-slot] — `wt/<task>-e<e>/outcome/<j>.json`

FX-OUT (`model/as-built/FIX-fence.md` section 1). The two outcomes of attempt e, finished (READY) and
revoked (fenced), race through one log of write-once slots, one per file, j = 0, 1, 2 ...: every party
proposes by a strict exclusive create (0b, §8.20) of the next slot name, exactly one create of a name
succeeds, and everyone reads the winner (test-and-set, as in CORFU and the Paxos log).
- **Layout.** `replace start` makes `outcome/` with the manifest; it lies outside the session's write
  prefix (`{attempt}/staging/`). Ready slot bytes `{kind:"ready", task, epoch, step}` (written by the
  guard-hook for the session's READY); fenced slot bytes `{kind:"fenced", task, epoch, reason}` (written
  by `replace fence`); each the canonical JSON of exactly those fields (`lib.outcomeSlotBytes`). The log
  has no gaps, and nothing is ever appended after a fenced slot. A repeat READY for a step has identical
  bytes and takes no new slot, so a log holds at most |steps| ready slots and one fenced slot.
- **Reading rules** (`lib.outcomeState(attemptDir, row)`, the one reader of commit, the fence, the hook,
  the planners and fsck):
  - **R-a.** A log that holds a fenced slot is fenced (reason r): commit refuses (exit 1
    `attempt-fenced`), the fence takes its retry path, the hook denies (`attempt-fenced`).
  - **R-b.** A ready slot is uncommitted when its own step is not in `row.commits`.
  - **R-c.** Only names `<j>.json` are slots, read only when `lstat` shows a regular file; a slot whose
    bytes do not parse, or are not a slot of this folder's task and epoch, a name with leading zeros, a
    gap, a slot after the fenced one, or an `outcome` that is not a real folder is tamper:
    `outcome-tamper` 3 in a script, a deny in the hook, a failing item `outcome-<why>` in fsck. Other
    names (a create's temp file) are not read. No `outcome/` (an attempt never admitted, or started
    before the fix) is an empty log: the hook's create fails `no-parent` and the fence writes no slot.

## 4. The library `tcb/lib.mjs`

Named ES exports only; no side effects on import. Every error is a `TcbError {code (slug), exit,
detail}`; `runMain` turns it into the stdout line and the exit code. Constants exported: `EXIT`
(slug → code), `STATES`, `STEPS`, `REASONS`, `LEDGER_KINDS`, `PREFIX` (kind → id prefix).
Behaviours with failure cases are numbered T1... in `spec/lib.md`; the rule each serves is in brackets.

### 4.1 CLI and exit helpers
- `parseArgs(argv, spec) → {mode, flags}`; `spec = {modes?: string[], flags: {name: {type:
  'string'|'int'|'bool'|'list', required?: true|string[] (modes)}}}`. Errors: `usage` 66.
- `runMain(metaUrl, script, fn)`: parses nothing itself; refuses a script file under `<root>/wt/`
  (3 `run-from-attempt`); awaits `fn(ctx)` which returns `{exit=0, result, reasons?}`; prints
  the §1.3 line with `code` = the slug of `exit`; TcbError `{code, exit}` → its exit, and its `code`
  becomes `reasons[0]`; any other throw → 70. `ctx = {script, writerSha, ledgerSeq: []}`
  (appendLedger pushes each seq it writes).
- `edgeFacts(flags, proc?) → {now, freeMb, boot}` from `--now/--free-mb/--boot`, else the real
  clock, `os.freemem()` and `proc.boot()` (null without a proc or on failure); the only place they
  are read. [§1.2]
- `paths(root)`: every fixed path of §2 (`tasks`, `ledger`, `coord`, `attempt(task, e)`, ...), so no
  script spells a path itself. `thresholds(root) → {get(name), isGate(name), line(name), all}`; `get`
  of an absent name → `param-missing` 2. [R45]
- `recordIncident(root, handle, {ctx, ce, cls, detail, task?, epoch?, now})`: appends one `incident`
  line (R58); the tamper form of §1.4 is `cls: 'refusal', detail: {tamper: true, script, code}`.

### 4.2 Canonical JSON, hashes, objects
- `canonicalize(value) → string`: object keys sorted by code unit, strings NFC, no whitespace,
  numbers in JS shortest form with -0 written 0; arrays keep order. Refuses `undefined`, NaN,
  ±Infinity, BigInt, functions and non-plain objects (`not-canonical` 1). [R14, S4]
- `sha256hex(stringOrBuffer)` (strings as UTF-8). `objectId(prefix, value) = prefix + '_' +
  first 16 hex of sha256hex(canonicalize(value))`. [R14]
- `putObject(root, value, {allowSeed=false}) → {id, sha256, created}`: prefix from `value.kind`;
  writes canonical bytes to `store/objects/<id>.json` by exclusive create; identical bytes →
  `created:false`; same name, different bytes → `id-collision` 3; `s_` without allowSeed → `seed-id` 3.
- `getObject(root, id) → value`: missing → `missing` 2; bytes whose hash prefix ≠ the name →
  `object-mismatch` 3. `treeSha(dir)` = sha256 of canonical sorted `[[relpath, sha256]...]` of every
  file under `dir` (used for `tcb/` by selftest, fsck, admit). [R28, R41]

### 4.3 Files
- `tempName(path)` = `<path>.<pid>.<nonce8>.tmp`. `writeAtomic(path, data) → sha256`: makes the
  parent, writes the temp with `wx`, fsyncs the file (never a directory handle: EPERM on win32),
  renames over the target; removes the temp on failure. [R1]
- **Windows sharing.** Every rename, unlink, link and `wx` create retries on EPERM, EACCES or EBUSY
  up to 40 times, 25-100 ms apart with jitter (about 3 s), because an antivirus scanner, the search
  indexer or an editor may hold the file without delete sharing; a `wx` create of a lock that keeps
  failing with EPERM counts as busy (a delete-pending lock). `readJson`/`readJsonl` retry EPERM,
  EACCES and ENOENT-during-rename up to 5 times, 20 ms apart. A transient error is never surfaced.
- `createExclusive(path, data, {strict, budget}?) → 'created'|'identical'`; different bytes → `exists-different` 1.
  `strict` (0b, every hook write): no parent folder is made (`no-parent` 2) and no `wx` fallback where hard links
  are unsupported (`no-hardlink` 3), so the name never exists without its bytes. `budget` (ms left): spent before
  the write or the link → `budget-spent` 2 and nothing made. `fsRetry(op, budget?)`: the sharing retry above; with
  a budget it tries once at least and retries only while the sleep ends inside it, else `budget-spent` 2.
- `readJson(path)`: strips one leading BOM; missing → `missing` 2, unparseable (UTF-16 included) →
  `unparseable` 2.
  `readJsonl(path) → {records, torn: Buffer|null, badLines: int[]}`: trailing bytes after the last
  `\n` are the torn tail; an unparseable complete line is listed, not thrown.
- `appendJsonl(path, obj, handle)`: asserts the lock; a torn tail is first moved (appended) to
  `<path>.corrupt` and cut off; then one `write` of the line plus `\n`, then fsync. [S2]
- `isUnder(child, parent) → bool`: both resolved, separators unified, drive letter and case folded on
  win32, `..` resolved, existing prefixes realpath'd (a junction out of the parent is not under it).
  [R13, R29] `normPath(p)`; `relPosix(root, abs)`; `wordCount(s)` (whitespace-separated tokens).
- `walkFiles(dir) → {files: relpath[], links: relpath[]}`: an `lstat` walk; a symbolic link,
  junction or other reparse point, or a file with `nlink > 1`, is never followed or read: it is listed
  in `links`. Every walk of an untrusted folder (staging, checkpoint, a torn attempt folder) uses it.
  `removeTree(dir)`: removes with `fs.rmSync` only after `walkFiles` finds no link inside; else
  `untrusted-path` 3 and nothing is removed.
- `segmentName(s)`: a path segment with trailing `.` and ` ` removed and case-folded (Win32 strips
  them, so `.claude.` is `.claude` and `CLAUDE.md ` is `claude.md`); guard-hook and fsck compare
  `.claude`, `claude.md`, `claude.local.md` through it.

### 4.4 Locks [R1, R4]
- `acquireLock(root, name, {script, ce, proc, now, retries=300, retryMs=100}) → handle` (each wait
  `retryMs` ±50 % jitter, about 30 s in all); `name` is `run.lock` or `watcher.lock`. Creates the file
  with `wx` holding the §3.10 lock record. `selfInfo(proc)` is computed once per process, before the
  first attempt, and cached; the own start time comes from the process's own clock (the time now
  minus `process.uptime()`, in the 7-digit `Z` form of §4.9), never from PowerShell, and `proc` is
  not consulted. **No PowerShell call on the normal path**: taking a free lock, appending to the
  ledger, validating and releasing call none; `proc` is used only to judge another process (the
  holder of a lock that is already there). Scripts pass `retries` = threshold `lock_retries` (300;
  tests of exit 75 set it to 3).
  - Busy: retry `retries` times `retryMs` apart, then `lock-busy` 75. Within one acquisition
    `proc.alive` is asked about the holder only, at least once and never more than once per try;
    the library asks once per holder nonce and keeps the verdict, so a holder that dies during the
    wait ends in `lock-busy` 75 and the caller retries (fail-safe).
  - Stale: only when `proc.alive(pid, start_time)` is `false` (dead, or that pid now has another start
    time). `null` (unknown, or no `proc`, or `alive` throws) counts as alive. Start times are compared
    with a tolerance of two seconds (`sameStartTime`, `START_TOLERANCE_MS` = 2000; §4.9), never by
    string equality. Break: rename to `<name>.<ownNonce>.stale`; re-read; if
    pid and nonce are equal and start_time matches (same rule) the record judged stale, create the own lock (`wx`) and, once
    held, append a `lock-break` ledger line (run.lock only); otherwise restore with
    `fs.linkSync(renamed, lock)` (fails rather than replace) and unlink the renamed file; if the link
    fails because a lock exists, keep the file as `<name>.<nonce>.orphan` and log an `incident`
    at the next acquisition. Then start over.
  - Unreadable (empty, or no lock record; e.g. a reset between the `wx` create and the write): never
    judged by `proc`. When `retries` ≥ `LOCK_UNREADABLE_MIN_RETRIES` (50) and the lock's bytes stay
    unchanged for the whole budget, it is broken with the same rename / re-read / create protocol,
    and the `lock-break` line carries `stale` with all four fields null plus `unreadable: {bytes,
    sha256}` of the old bytes; bytes that change, or a smaller budget, leave it (`lock-busy` 75).
- `handle.assertHeld()`: re-reads the lock file; another nonce → `lock-lost` 75. Called by lib before
  every write it makes under a lock. `handle.release()`: unlinks only a file holding its own nonce;
  idempotent.
- `withRunLock(root, {script, ce, proc, now}, fn)`: acquire `run.lock`; when `ce` is given run
  `checkCe` inside the lock; `fn(handle)`; release in `finally`.
- `checkCe(root, ce)`: `coord.json` missing → `no-coordinator` 2; corrupt → 67; different → 64.

### 4.5 Ledger [R31, R58]
- `appendLedger(root, handle, {ctx, ce, kind, task, epoch, data, now}) → line`: asserts the lock;
  reads the tail **inside the lock**; a torn tail is moved to `ledger.jsonl.corrupt` and a `torn-tail`
  line is written first; recomputes the tail's own hash (mismatch → `ledger-broken` 3, nothing
  written); `seq = tail.seq + 1` (1 when empty), `prev = tail.hash` (64 zeros when empty), `hash` per
  §3.7; refuses a kind outside `LEDGER_KINDS` (`usage` 66); appends; pushes `seq` to `ctx.ledgerSeq`.
- `readLedger(root) → {lines, torn}`; `verifyLedger(lines) → {ok, brokenAt?, reason?}` (seq runs
  1..n with no gap, each prev equals the previous hash, each hash recomputes); `ledgerHead(root) →
  {seq, hash}`; `lastLine(lines, kind, pred?)`; `scriptSha(metaUrl)`.

### 4.6 The task table and the fence [R1-R3, R7, R8]
- `readTasks(root) → table`: missing, unparseable or schema-invalid → `table-corrupt` 67.
- `attemptOf(row, e) → entry`: the `attempts` entry whose `epoch` is e; none → `no-attempt` 2. Every
  script reads attempts only through it.
- `writeTasks(root, handle, table, {expectRev}) → rev`: asserts the lock; the file's `rev` ≠
  `expectRev` → `rev-moved` 65; copies the current file to `tasks.json.prev`; sets `rev + 1`;
  validates against [tasks]; `writeAtomic`.
- `updateRow(root, handle, {task, epoch?, steps?, states?}, mutate) → {row, rev, changed}`: the
  compare-and-set. Under the held lock: no such row → `no-task` 1; `epoch` given and ≠ → 65; step or
  state not in the allowed lists → `wrong-step` 65; `mutate(copy, table)` returns the new row (or
  throws); an unchanged row writes nothing (`changed:false`).
- `fence(root, handle, {task, expectEpoch, reason, host, tick, readyCheck, cut, spendAtFence, R,
  Hmax}) → {row, from, to, restartCharged, limit}`: the §3.6 fence rows on `updateRow`. For a failure
  reason other than `tainted` it calls `readyCheck()` under the lock first; true → `ready-wins` 5 with
  no change. The callback reads the outcome log (§3.23): an uncommitted ready slot in a log that is not
  fenced (FX-OUT, Q6 b: the library's scope stays failure-only). Decision 40, M6, the rule for every
  reason but `first` and `tainted` on a running attempt, is `replace.mjs fence`'s, in the same lock hold
  before it calls `fence` (FX-OUT steps 1-5): the log read (a log fenced with another reason → 65
  `fence-pending` {reason}); every refusal (`stale-epoch`, `wrong-step`, `hmax`) before any write; then,
  only when the fence moves the row to e+1 and attempt e has a manifest, the ready check (an uncommitted
  ready slot → `ready-wins` 5, never over `tainted`) and the fenced slot by `outcomeAppend` (a ready slot
  that takes the name first → `ready-wins` 5; `tainted` appends after it). By the time `fence` runs, its
  callback sees the fence's own slot as the winner.
- `outcomeState(attemptDir, row) → {present, fenced, slots, ready, next}` and `outcomeAppend(attemptDir,
  slot, {row, check, create}) → {result: created|identical|fenced, j, state}` (§3.23; FX-OUT): the log's
  one reader and its test-and-set; `outcomeSlotBytes(slot)` the canonical bytes of a slot. `handover`/`memory` at `handovers + parks ≥ Hmax` → `hmax` 1, no change. The limit path
  applies the fence and returns `limit:true` (the caller exits 1). `cut`/`drop` on a row at planned/none
  or active/stopped takes the no-attempt row of §3.6 (state `cut`/`dropped`, epoch unchanged).
- `stagingCut(attemptDir) → {files: {relpath: {len, sha256}}, links: relpath[]}`: every regular file
  under `staging/` found by `walkFiles` (READY.json excluded; links listed, never read), sorted posix
  relpaths. `readCutPrefix(attemptDir, cut) → {files: {relpath: Buffer}, mismatched: relpath[]}`:
  the first `len` bytes of each, read only when `lstat` shows a regular file with `nlink` 1; a
  shorter file, a link, or a different prefix hash is listed in `mismatched` and left out; `.jsonl`
  prefixes lose a trailing partial line.

### 4.7 The schema validator [R14, R27, R32]
- `validate(schema, value, {resolve}) → {ok, errors: [{path, keyword, message}]}` for JSON Schema
  2020-12 keywords `type` (incl. `integer`, type lists), `enum`, `const`, `properties`, `required`,
  `additionalProperties` (bool or schema), `patternProperties`, `items`, `minItems`, `maxItems`,
  `uniqueItems` (canonical equality), `minLength`, `maxLength` (code points), `pattern` (RegExp,
  `u` flag), `minimum`, `maximum`, `exclusiveMinimum`, `$ref` (`#/$defs/x` and
  `<name>.schema.json#/$defs/x` resolved from `tcb/schemas/`), `$defs`, `anyOf`, `oneOf`, `allOf`,
  plus the extension `x-maxWords`. `$schema`, `$id`, `title`, `description`, `x-version` are
  ignored; any other keyword → `schema-keyword` 70 (the subset is closed). `path` is a JSON pointer;
  for an array keyword (`minItems`, `maxItems`, `uniqueItems`) it is the array itself (a duplicate's
  index is in the `message`).
- `loadSchema(root, name)` (cached); `checkFormat(root, name, value)`: `schema_version` must equal the
  schema's `x-version` (`schema-version` 1), then `validate` (`schema-invalid` 1, errors in detail).

### 4.8 The transcript parser [R4, R5, R11, R15, R20, R22, R34]
- `projectDirName(folderAbs)`: every `:`, `\`, `/`, `.`, `_` and space becomes `-` (believed, §7).
- `sessionTranscripts(transcriptsRoot, sessionId) → {main, helpers}`: `main` = the first
  `<root>/*/<sessionId>.jsonl` (null if none); `helpers` = every `agent-*.jsonl` below
  `<root>/*/<sessionId>/subagents/`, sorted.
- `transcriptsForFolder(transcriptsRoot, folderAbs) → [{sessionId, path}]`: files in
  `<root>/<projectDirName(folder)>/` whose first record carrying `cwd` names the folder (case-folded).
  If that folder is absent, every `<root>/*/` whose name starts with the first 100 characters of
  `projectDirName(folder)` is scanned the same way (the harness is believed to shorten long names).
- `parseTranscript(path, {fromByte=0, lastCall=null}) → {sessionId, cwd, calls, toolUses,
  toolResults, structured, turnEnds, endByte, torn, badLines}`; reads the file in 1 MiB chunks
  (`fs.readSync`), never as one string:
  - a **model call** is one distinct `message.id` among `type:"assistant"` records whose
    `message.model` is not `<synthetic>`; its usage is taken from the last record of that id (the
    harness repeats it per content block). When parsing resumes at `fromByte`, a first call whose id
    equals `lastCall.id` is the same call continued: it is returned with `continued: true` and its
    usage replaces `lastCall.usage` (the caller subtracts the old usage), never counted as a new
    call. `usage = {input, cache_read, cache_write, output}` from
    `input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `output_tokens`;
    `context = input + cache_read + cache_write`; `total = context + output`; a missing field is 0
    and marks the call `partial`. Call: `{id, model, ts, sidechain, usage, context, total, tools}`.
  - a **tool use** is every `tool_use` block: `{id, name, input, callId, ts, sig, access}` with
    `sig = name + ':' + first 16 hex of sha256(canonicalize(input))` and `access = toolAccess(name,
    input) → {kind, paths, urls, query, command, agentType}`: Read → read(file_path); Glob, Grep →
    read(path or '.'); Write, Edit, MultiEdit, NotebookEdit → write(file_path / notebook_path);
    WebFetch → fetch(url); WebSearch → search(query); Bash, PowerShell → exec(command); Agent, Task →
    agent(subagent_type); anything else → other. Absent or non-string fields give empty values.
  - a **tool result** is every `tool_result` block: `{toolUseId, isError, ts, text, permission?:
    {decision, source}}` (`text`: the first 2,000 characters of its text content; `permission` from
    the record's permission decision when present, believed). A long helper result is read from the
    helper's own transcript (its `structured`), never from this cut text. Each tool result also has
    a non-enumerable `urls` (absent from JSON and deep equality): the distinct `http(s)` URLs of its
    **full** text, in order of first appearance, trailing `.,;:!?` dropped, URLs over 2,048
    characters skipped, at most 500; commit's URL evidence (R34) reads it, so a URL past the
    2,000-character cut still counts.
  - **turnEnds**: for each run of assistant records that ends before the next `type:"user"` record
    that is not a tool result (or at the end of the file), `{ts, text}` = the joined `text` blocks of
    the run's last assistant record (audit's notes rule, R30).
  - **structured** results: the input of each `StructuredOutput` tool use, and the `data` of each
    `attachment` record with `attachment.type == "structured_output"`, as `{toolUseId?, data}`.
  - an unparseable last line without `\n` is the torn tail (`torn: true`, skipped); other bad lines
    are counted; unknown record types are skipped. `endByte` is the end of the last complete line.
- `spendOf(parsed[]) → {calls, input, cache_read, cache_write, output, total, peak_context,
  last_context, partial}` over a session and its helpers. `loopRun(toolUses) → {sig, run}`: the
  trailing run of equal signatures. `toolAccess(name, input)` is a named export (guard-hook and audit
  classify with the one table). `urlKey(u) = sha256hex(new URL(u).href)` (§3.13).

### 4.9 Process information [R8-R10, R12; facts 9-11]
- A provider `proc = {list(), alive(pid, start_time), boot()}`; every function that needs process
  facts takes it as a parameter (tests pass real or fake ones). No script kills a process it did not
  spawn (§6); `killOwnTree` is the one kill.
- `realProc({timeoutMs=30000, exe})` (`exe` = threshold `proc_exe`, the absolute PowerShell path; a
  test seam): `list()` runs `<exe> -NoProfile -NonInteractive -Command
  "[Console]::OutputEncoding=[Text.Encoding]::UTF8; @(Get-CimInstance Win32_Process | Select-Object
  ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine,@{n='start_time';e={$_.CreationDate
  .ToUniversalTime().ToString('o')}}) | ConvertTo-Json -Compress -Depth 2"` → `[{pid, ppid, name, exe,
  cmdline, start_time}]` (a single object is normalised to a one-element array; `start_time` has
  the form `YYYY-MM-DDTHH:MM:SS.fffffffZ`); failure → `proc-unavailable` 2.
  `alive` → true, false, or null when PowerShell fails; the listed process is the holder when its
  reported start is at most the recorded start + `START_TOLERANCE_MS` (one-sided,
  `aliveFromQuery(out, startTime)`, review LR-2: the recorded start comes from the holder's own
  clock after Windows created it, so a slow start-up is alive and a pid reused by a later process
  is not). `boot()` →
  `(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().ToString('o')`, or null
  on failure (taken in the same PowerShell call as a `list` when both are needed).
- `sameStartTime(a, b) → boolean`: equal strings match; otherwise both must parse as ISO 8601 and lie
  at most `START_TOLERANCE_MS` = 2000 ms apart (a process's own-clock start and the CreationDate
  Windows reports differ by its start-up time); a missing or unparseable value never matches another.
  `killOwnTree` and the stale-lock break's re-read (§4.4) use it; `alive` uses the one-sided rule
  above.
- `selfInfo(proc) → {pid, start_time}` (computed once per process from its own clock, §4.4; no
  PowerShell call, `proc` unused); `descendants(list, pid) → pid[]`: a child
  counts only when `child.start_time >= parent.start_time` (Windows never clears a dead parent's
  pid, and pids are reused); `attemptProcesses(list, {folder, sessionId}) → {matched, method}`:
  processes whose command line names the folder (the folder followed by `\`, `/`, `"`, a space or the
  end, on normalised paths, so `wt/f1-e1` never matches `wt/f1-e10`) or the session id, plus their
  descendants. Report only: nothing acts on `matched` but counting.
- `killOwnTree(proc, child)` (selftest only, for a child it spawned and recorded `{pid,
  start_time}`): re-lists, checks the start time (`sameStartTime`), kills its verified descendants
  leaf-first and then the child, each by `taskkill /PID <n> /F` (absolute
  `C:/Windows/System32/taskkill.exe`) after re-matching its start time through `alive` (never `/T`).

### 4.10 Shared numerics
- `rng(seed: string) → {next(), int(n), shuffle(array)}`: `next()` = the first 4 bytes of
  `sha256(seed + ':' + counter)` / 2^32; `shuffle` is Fisher-Yates on a copy. Used for the seed split,
  checker positions, the blind order. [R35, R42, R39]
- `clopperPearson(x, n, conf=0.95) → {lower, upper}`: exact two-sided; `x=0` → lower 0, `x=n` →
  upper 1; `n=0` → `{lower:0, upper:1}`. [R35, R42]
- `reservation(rows, spentOf) → {reservation, spentTotal}` with `spentOf(task, epoch)` = tokens of
  that attempt: Σ spent over **every** attempt of every row (zombie and post-limit spend included)
  + Σ max(0, e_task − spent of the current attempt) over rows `active` at step admitted, started or
  bound. Admit iff `B − reservation − r ≥ e_new`. Never stored (R10).
- `slotCount(rows, procList, transcriptsRoot) → {live, unknown, unconfirmed}`: over attempts not
  known ended (stop ≠ confirmed, row not planned), each counted once: `stop: unconfirmed` →
  unconfirmed; else matched processes alive → live; else **the current attempt of a row at step
  admitted, started or bound, and the last attempt of a committed row, always count one slot**:
  unknown (never zero, so back-to-back starts cannot all pass); else a transcript exists → unknown.
  A `procList` of null (PowerShell failed) makes every such attempt unknown. Admission uses `live +
  unknown + unconfirmed < N_max` (R10; fail-safe). Shared by admit, status and handover.
- `variant(root, row, {f5Given}) → {V, covered: key[], uncovered: key[]}` (R5), used by replace
  (todo), stop and replace (overflow ids), watch (stall) and status: **research** and **control**:
  `covered` = `row.question_ids` carried by a card of this task (named by an `intake` line of the
  task, any epoch, or a commit record of the task) whose last status is witnessed or confirmed, or,
  while `f5Given` is false, any other stored card whose last status is witnessed or confirmed; `V` = |uncovered|. **review / fresh-review**: the
  latest review object named by an `intake` line of the current epoch (none: the approaches of the
  frozen protocol's `outlist_vocab.approaches`, all open); `V` = approaches with no entry in its
  `verdicts` + its cited cards whose last status is pending or witnessed; `covered`/`uncovered` as for
  research over the review's pack. **design-check**: `V` null (no stall counter; hang and loop still
  apply).
- `currentDesign(root) → {cut_sha, hazards_id, hazards_sha}`: `cut_sha` from the last `cut` line (null
  if none); the hazards object is the `hazards` output of the commit record whose `commit` ledger line
  has the highest seq among committed `mapper` rows and whose object `cut_sha` equals `cut_sha` (null
  if none); `hazards_sha` = sha256hex of its canonical bytes. The same "highest `commit` ledger seq"
  rule picks the stpa and fmea outputs. Used by gate, render, admit and replace.
- `currentProtocol(root, field) → {name, path, sha256, value}|null` (§3.18); `questionsSha(ids)`.
- `runFlags(lines, ce) → {halted, draining}`: halted = a `halt` line not followed by an `owner` line
  with `act: resume`; draining = a `drain` line whose `ce` equals ce. Used by admit, status, handover.
- `intakeCandidates(root) → [{card_id, in_flight: bool}]`: cards whose last status is `witnessed` (or
  `rejected` with reason `number-without-quote`) and whose last status line has no `check`, or has
  reason `unqualified`/`unqualified-revert` while `store/qualification.json` now marks J1, J2 and J4
  qualified; `in_flight` = a real item of an earlier batch with no status line carrying that batch.
  The earlier batches are read from their sealed keys `sealed/seeds/<b>.json`; a batch whose
  `queue/<b>/` folder exists without `batch.json` (a crashed write) is ignored, and a sealed key with
  no `queue/<b>/` folder still counts. Used by check-queue (intake mode) and watch (class 14).
- `flagCleared(root, flag) → bool`: §3.15's R18 rule, for tms and certify.
- `checkerVerdicts(parsed[], itemIds) → {verdicts: {<item>: verdict|unclear}, reasons: {<item>:
  slug}, duplicates, unknown_items}`: one structured result `{verdicts: [...]}` or a bare verdict; an
  invalid or off-enum verdict → unclear (`verdict-off-enum`), a missing item → unclear
  (`verdict-missing`), two different verdicts for one item → unclear (`verdict-conflict`), an equal
  repeat is counted in `duplicates`. Used by promote and seed.
- `readSetSha(readSet)` (§3.16).

### 4.11 Test helpers `tcb/test/helpers.mjs` (written with the library)
`makeRoot({thresholds?, tasks?, ce=1}) → {root, cleanup}` (mkdtemp with a 6-character prefix under
`tcb-build/tmp`, the §2 folders, `tcb/` copies of schemas, profiles, settings, agents and briefs,
`coord.json`, an empty `tasks.json`; thresholds always set `transcripts_root` = `<root>/transcripts`
(created empty) unless the test passes one, so no test reads the owner's real transcripts);
`runScript(name, args, {root}) → {exit, json, stderr}`; `fakeTranscript(path, {sessionId, cwd,
calls: [{usage, tools: [{name, input}], results?, text?}], structured?})` writing synthetic records in
the §4.8 shape; `spawnSleeper({args?}) → {pid, start_time, kill}` (a `node -e` child the test owns,
`args` appended to its command line as markers such as a folder path or `watch.mjs --alarm`);
`fakeProc(table)`. Tests run with `node --test --test-concurrency=4`; every test that calls the real
process list (directly or through a script) sets `{concurrency: false}`.

## 5. The scripts

Each script is `tcb/<name>.mjs` (flat, beside `lib.mjs`), runs through `runMain`, appends a `check` ledger line when it
is a check (R40), and has fixtures in `tcb/fixtures/<name>/`. Modes and the flags other scripts or
the coordinator rely on are fixed here; everything else is in its spec.

| Unit | Script | Purpose | Modes and shared flags | Exits besides 64-75 |
|---|---|---|---|---|
| U1a | replace.mjs | The one start and restart path: the step machine's fence, start and bind; builds attempt folders, settings, agent files, manifest, brief, inputs, checkpoint, todo and `review-in/` | `plan`; `fence --task --epoch --reason [--tick]`; `start --task --epoch` (admission through admit.mjs's exported `decide`); `bind --task --epoch --session` | 0, 1 (`limit`, `hmax`), 2, 3, 5, 6 |
| U1a | admit.mjs | Admission decision (R10): deps, protocol hash, gate, selftest, fresh fsck, slots over live processes, memory, reservation, gate A, halt, drain; design-check tasks skip the gate | `check [--task]` (read-only); exports `decide(facts) → {admit, reasons, reservation}` (pure) | 0, 6, 2 |
| U1a | stop.mjs | Fence-first stop: records the request, verifies non-growth over `stop_verify_deltas` watcher ticks without sleeping, reports (never kills) processes that name the attempt, counts zombie spend | `request --task --epoch`; `verify --task --epoch` (repeated: samples, then compares) | 0, 1, 2, 6 |
| U1b | watch.mjs | The watcher: ticks, counters, V, spend, loop, memory, windows, events, wake by exit | (default) `--ce`; `--once` (one tick, tests); `--alarm --ce [--sleep-ms]`; `--intake --ce` (harvest, commit intake, snap, witness, promote `--from witness`, tms, status, one at a time; spawned detached, not awaited) | 10-17, 20-27, 30, 0 (`--once` quiet, alarm superseded, intake done), 3 (a tamper exit inside intake), 70 |
| U1b | status.mjs | Builds `run/status.json`; reconciles started steps; end-of-turn check; owner, intent and meter lines | (default); `--reconcile`; `--endturn --acked-seq`; `intent open|done --key`; `owner --act --subject --quote-file`; `meter --pct` | 0, 1 (endturn; reconcile `alarm-missing`), 2 |
| U1b | handover.mjs | Coordinator epochs: first coordinator, ce raise after the drain, binding the successor | `init --tcb-commit [--session]`; `raise --ce`; `bind --ce --session` | 0, 6 (not quiescent / no drain), 1, 2 (`missing`, `proc-unavailable`, `no-coordinator`) |
| U2a | commit.mjs | The acceptor: validates staging, stores objects, flags R18 (d)(e), writes commit records (no git in the pilot) | `intake --task --epoch`; `record --task --epoch --step` | 0, 1, 2, 3, 6 (`intake-new`, `fsck-stale`, `audit-missing`, `cards-pending`) |
| U2a | harvest.mjs | Copies readers' schema-checked results from transcripts into `staging/harvested/`, re-validated against tcb's card schema | `--task --epoch` | 0, 1 (some invalid), 2, 3 (`untrusted-path`, `harvested-differs`) |
| U2a | fsck.mjs | Store check: object hashes, commit records, ledger chain, foreign keys, status writers, frozen and cut files, `tcb/` against the owner's commit, every attempt's `.claude/` | (default) `--ce` | 0, 2, 3 |
| U2b | tms.mjs | Labels cards, sentences, verdicts, claims, dismissals (with R38's bar), certificates; repair list | (default) `--ce` | 0, 1 (STALE/PENDING in a gate target), 2 (`dangling`, `no-target`), 10 |
| U2b | promote.mjs | Only writer of card status: witness results, checker verdicts from the checker's own transcript, seeds dropped, qualification applied, reverts | `--from witness`; `--batch --transcript`; `revert --class` | 0, 1 (off-enum → unclear), 2, 3 |
| U2b | certify.mjs | Certificate of a review: reads vs manifest, cited cards confirmed and passing R18, plants found | `--task --epoch` | 0, 1, 2, 3 (`object-mismatch`, `step-key-mismatch`) |
| U3a | snap.mjs | Plain Node fetch of a source (http/https, size and time caps, no cookies, no private addresses), bytes and HTML text by sha256 | `--url`; `--new` (cards with no snapshot) | 0, 2 (unverifiable: a URL without text, R40; F5 not given), 3 |
| U3a | witness.mjs | Normalises, finds the exact quote and the number within w; binds the result to card and snapshot hashes | (default) `[--card]...` | 0, 1, 2, 3 |
| U3b | guard-hook.mjs | Pre-tool hook: role paths, no `.claude/` writes, Bash only `node tcb/<name>.mjs` (not `lib.mjs`) for the coordinator, helper types, witnessed fetches; denies on its own error. Also owns `tcb/profiles/*.json`, `tcb/settings/*.json` and `tcb/agents/{reader,checker}.md` | stdin = the harness hook JSON; `--root --role --task --epoch` | hook protocol: 0 allow, 2 deny (reason on stderr) |
| U3b | selftest.mjs | Every script on its good and bad fixtures; the canary for hooks and user-level denies | `run --ce`; `canary --ce --transcript --expect` | 0, 1, 2 |
| U4a | render.mjs | Every page and view: pack, review, synthesis, owner page, coverage (held-out seed recall), seven measures, residual readings | (default) `--ce` | 0, 1, 2, 3 (`object-mismatch`, `seed-id`) |
| U4a | audit.mjs | Read audit, protected writes, search log, notes, first-call context, coordinator turns above 1.5·W*; owns `tcb/denylist.txt` | `--task --epoch`; `--coordinator --session` | 0, 1 (tainted), 2, 3 |
| U4b | seed.mjs | Seed operators S1-S4, J1-J4 (exported `makeSeed`), plants, scoring and qualification | `plant --task --k`; `score` | 0, 1, 2 |
| U4b | check-queue.mjs | Builds a checker batch: typed card, snapshot window, sentence; one seed per class at random positions; key in `sealed/` | `--mode intake|freeze|post-review [--field]` | 0, 2, 3 (`seed-id`) |
| U5a | protocol-freeze.mjs | Validates, checks approval and key ownership (R46), freezes and hashes protocols and the analysis plan; held-out seed split | `freeze --file`; `amend --file --reason-code`; `plan --file` | 0, 1, 2, 3 (`ledger-broken`, `frozen-tampered`) |
| U5a | compare.mjs | Blinds and shuffles the arms' outputs; scores Comparisons 1 and 2 under the frozen plan | `anon`; `score` | 0, 2, 3 (`object-mismatch`, `seed-id`) |
| U5a | gate.mjs | The design cut; the gate over matrix, hazards, model result and action lines; writes the design-check schemas | `cut --design --ce`; `check --ce` | 0, 1, 2, 3 (`cut-tampered`, `object-mismatch`, `ledger-broken`) |
| U5b | cost.mjs | Port of `tree-v2/cost/cost.js`: W*, k*, n_max, predictions; unit costs from transcripts | `compute [--inputs] [--text]`; `from-transcripts --root --ce`; `predict --root` | 0, 2 |
| U5c | — | Briefs `tcb/briefs/{child,reader,checker,fresh-reviewer,scorer,stpa,fmea,mapper}.md`, `tcb/README.md`, `tcb/thresholds.json`, `tcb/cost-inputs.json` (agent files are U3b's) | placeholders `{{task}} {{epoch}} {{field}} {{folder}} {{role}} {{todo_json}} {{checkpoint_json}} {{must_read_json}}`; the last line rule `TURN-END <field>` (child, fresh-reviewer) or `TURN-END <task>` (stpa, fmea, mapper: no field; audit accepts it) | — |

`protocol-model.mjs` is built elsewhere; gate.mjs reads `completeness/model/result.json` {result:
pass|fail|not_run, sha} and treats missing as not-run.

## 6. The boundary

- **No script starts, messages or stops a session.** The coordinator does that with its own tools;
  scripts record the step the row names (§3.6) and check it afterwards (`bind`, `--reconcile`,
  `stop verify`). A script never waits on a session.
- **No network** except `snap.mjs` (and a server on 127.0.0.1 that a test or `selftest.mjs run`
  starts itself for snap's fixtures, allowed only by the threshold `allow_loopback`). No package, no
  install, no download.
- **Nothing outside the run root** is written. Read outside it: transcripts under
  `transcripts_root`, process information through PowerShell, `os` facts at the CLI edge, the
  user-level files of threshold `user_files` (by hash, into the manifest), and the design file of
  `gate.mjs cut --design` (read-only). git runs only read-only inside `<root>` (fsck's tcb check):
  `git -c core.fsmonitor=false -c core.hooksPath=NUL -c core.longpaths=true -c core.autocrlf=false`,
  `--no-ext-diff --no-textconv`, `spawnSync` timeout 60000; no script commits.
- **Kills**: no script kills or signals a process it did not spawn. A stop is verified and reported
  (`stop.mjs verify` lists survivors); an old watcher or alarm ends itself on a newer ce (64) or a
  newer alarm (`superseded`); the coordinator stops sessions with its own tools. The one kill is
  `selftest.mjs run` ending its own timed-out case child through `lib.killOwnTree`.
- **Spawning**: `node` is spawned as `process.execPath`; PowerShell as threshold `proc_exe`;
  `taskkill` as `C:/Windows/System32/taskkill.exe`; `git` by name through `PATH` (fsck only; a
  failure is `no-git`, not-run). Every spawn passes `cwd: root` (never under `wt/`), `shell: false`,
  `windowsHide: true`. No environment variable is read except `PATH` for that one git lookup.
- No script reads a note's text to decide anything; no script writes `tcb/`, `.claude/` outside
  `replace start`, or another script's paths (§2.1).

## 7. Tests

- One file per script, `tcb/test/<script>.test.mjs`, plus `tcb/test/lib.test.mjs` (from
  `spec/lib.md`) and `tcb/test/main-guard.test.mjs` (every script started through one junction
  still answers, §1.1); `node --test <file>`; `node:test` and `node:assert/strict` only.
- Each test builds its own run root with `helpers.makeRoot()` under `tcb-build/tmp` and removes it in
  `after`/`finally`. Scripts are run as child processes with `--root <temp>`, `--now`, `--free-mb`,
  `--boot` and short `--interval-ms`/`--sleep-ms`; library functions are called directly with a
  fake `proc` where processes are not the point. A test that must order an event against a child
  script waits for a file the script writes (or a stderr line it prints), never for a timer. Run
  with `node --test --test-concurrency=4 tcb/test/`.
- Fixtures are synthetic: transcripts from `fakeTranscript`, pages served by a test's own
  `http.createServer` on 127.0.0.1, invented cards. Never text from a real transcript, page or project
  file. No test touches the network, kills a process it did not spawn, or writes outside `tcb-build`.
- Each behaviour named in a spec gets a test with its failure case. Exit codes and the stdout JSON
  shape (§1.3) are asserted on every script test; a ledger written by a test must pass `verifyLedger`.
- **Cannot be tested without the app.** A test of one of these is written, then marked
  `t.skip('needs-app: <reason>')`, and never faked: (1) the harness runs `guard-hook.mjs` before a
  tool call, for helpers too, and honours a deny; (2) user-level deny rules bind sessions and cannot
  be bypassed through `node`; (3) which settings files a session started in an attempt folder obeys;
  (4) a real session's `claude.exe` command line names its folder or session id (so
  `attemptProcesses` and the stop's `survivors` see it); (5) a background command's exit (watcher, alarm) starts or reaches the
  coordinator's turn, including during sleep or after a ce change; (6) Node timers and the PC across
  sleep; (7) real transcripts match §4.8 (helper linking, `structured_output`, a checker's verdict),
  and `projectDirName` matches the harness's folder naming; (8) the harness's schema retry of a
  helper result; (9) the usage meter; (10) real web pages (F5); (11) the canary's refusals
  (`selftest canary`) and the lean first-call baseline.

## 8. Decisions

Settled here where the sources leave it open or disagree (D = the design, L = a layer draft).
1. One exit table (§1.4) replaces the layers' per-script codes; 64 stale ce and 75 lock busy keep
   the design's numbers. Reason: two scripts must read one code the same way.
2. Watcher wake classes are exit codes 10-17 and 20-27 with a fixed precedence; 64 on a newer ce.
   Reason: "the exit code names the most urgent class" needs one order.
3. Events are `event` ledger lines; there is no `events.jsonl`. Reason: R6 acts on "ledger events
   after the last seq"; one sequence, one hash chain.
4. `acked_seq` and the alarm live in `run/acked.json` and `run/alarm.json`, not in `coord.json`.
   Reason: one writer per path (R13); the design put three writers' fields in one file.
5. The alarm re-arms itself: a new `watch.mjs --alarm` registers in `alarm.json` and kills nothing;
   the previous alarm, on waking, finds another pid in `alarm.json` and exits 0 `superseded`;
   `status --endturn` only checks. Reason: only a process the coordinator starts can wake it, so
   endturn cannot start the alarm; a kill is not needed for a sleeper that ends itself. (Amended by
   decision 40: a live alarm is re-armed by the `acked.json` token, never replaced, and
   `status --reconcile` asks for an alarm at the start of the turn.)
6. Commit records are per (task, step), `store/commits/<task>.<step>.json`, with the steps listed
   in the row. Reason: under F1(a) one task commits a pack and then a same-window review.
7. A session's write area is `staging/` minus `staging/harvested/` (harvest's); rejections go to
   `view/rejected.json` (commit's). Reason: one writer per path; L2 had commit writing in staging.
8. The checkpoint enters the new attempt at `in/checkpoint/`, which `commit intake` reads as staging.
   Reason: R7 "enters in/ as untrusted staging and passes commit.mjs again".
9. Witness results go to `store/witness.jsonl` (witness); only promote writes `store/status/`.
   Reason: R13 and R25 together.
10. Plants are made by `seed.mjs plant` into `sealed/plants/`; replace copies them into `review-in/`.
    Seeds are made by check-queue through seed.mjs's exported functions. Reason: R13 gives
    `review-in/` to replace alone; seeding stays in one unit.
11. Queue items have opaque `i_` ids; seed `s_` ids exist only in `sealed/`. Reason: R42's reserved
    namespace without letting the checker see which items are seeds (L3 wanted normal-looking ids).
12. A first fence on a planned task goes straight to step `stopped`. Reason: nothing to stop.
13. On the limit path `replace fence` applies the fence and exits 1 (`limit`); the task becomes
    `failed` when `stop verify` confirms (R8 "fence, stop, then failed").
14. The terminal dispositions (failed, cut, dropped, parked) are set by `stop verify` on a confirmed
    stop; the cut's overflow line is written there. Reason: R8/R11 order them after the stop.
15. The common-cause window is counted in watcher ticks (`W_cc_ticks` = 30); a failure records the
    tick at its fence. Reason: no wall clock for counted quantities.
16. Defaults that are guesses: stall c = 30 calls, hang h = 10 ticks, alarm 60 min, batch 12 items,
    pack index summary 120 words, fetch caps 10 MiB and 30 s. Each is logged with source "guess".
17. A committed child's process still counts toward slots until `stop verify` confirms it gone
    (§3.6 row committed / bound); the coordinator closes a committed session. Reason: R10 counts live
    processes, and without that row no committed slot is ever freed.
18. fsck and selftest are not called by replace, admit or commit; admission requires a passing `fsck`
    line newer than the last `intake`/`commit` and a `selftest` line for the current `treeSha(tcb/)`;
    `commit record` requires a passing `fsck` line newer than the last `intake` line of its
    task+epoch and newer than any failing `fsck` line, and an `audit` line of its task+epoch newer
    than that `intake` line (label clean). Reason: no cross-unit imports; R22, R23 and R41 still hold
    before every start and every commit. The canary (`selftest canary`) needs a real session and is
    not an admission condition; `status.json` shows it as not_run until run.
19. Cross-script imports allowed: replace imports admit's `decide` (same unit), check-queue imports
    seed's `makeSeed` (same unit). No other script imports another; what two units share
    (reservation, slot count, variant, current design, run flags, intake candidates, flag clearing,
    checker verdicts) is in lib.
20. guard-hook takes no lock and writes only by strict exclusive create (`createExclusive` with `strict` and the time
    left until `hook_deadline_ms` from its start; FIX-fence §0b), never a path a script writes (amended by 0b; the
    writes come with FX-OUT, FX-CLAIM, FX-CGATE); its refusals are read from transcripts by audit. Reason: a hook that
    takes the run lock would stall every tool call.
21. The owner's tcb commit is recorded by `handover init --tcb-commit` in `coord.json` and copied at
    each raise; fsck compares `tcb/` with it by git. Reason: R28 needs a script-readable value.
22. Scripts read everything of `tcb/` from `<root>/tcb/`. Reason: in a run they are the same folder,
    and tests need their own thresholds.
23. `commit record` runs no git in the pilot and records `git: null`. Reason: a git commit inside
    the lock can run hooks, wait on a signing prompt or rewrite line endings, and the ledger hash chain
    plus fsck already give tamper evidence; the owner commits the run root by hand if he wants
    history.
24. R46's key errors exit 1 (`key-owner`), not 3. Reason: 3 means tampering and stops all work.
25. Owner rulings (resume after a halt, accepted hazards, a dropped task, the meter reading) enter
    the ledger only through `status.mjs owner|meter` with the quote. Reason: R55, R11 and R48(e)
    need a script-readable record of the owner's word.
26. Rows are created only by `replace plan` from `plan/tasks-plan.json`. Reason: the table has
    script writers only (R13).
27. The validator rejects unknown schema keywords (70) instead of ignoring them. Reason: a schema
    that silently uses an unsupported keyword would pass anything.
28. A model call is a distinct `message.id`, usage from its last record; `<synthetic>` is not a call.
    Reason: the harness writes one record per content block with the usage repeated (probe shape).
29. No script kills a process (except selftest's own case children). `stop verify` reports
    `survivors`; `handover raise` and a new alarm leave old wake sources to exit 64 / `superseded`.
    Reason: a command-line substring is no proof of ownership, and §6 forbids a script stopping a
    session; a kill option can be added later behind an owner threshold once needs-app 4 is answered.
30. `stop verify` never sleeps: it samples, exits 6, and compares on a later call after
    `stop_verify_deltas` watcher ticks. Reason: a 2Δ in-process wait equals the harness's command
    timeout, and ticks, not clocks, are the design's unit of waiting.
31. A failure is `host` only when the attempt's recorded boot identifier differs from the current
    one. Reason: `now − uptime` is clock arithmetic and decides a charged restart.
32. A tainted audit refuses `commit record` (`tainted`); the coordinator fences with reason `tainted`,
    which counts toward R like a stall. Reason: R22/R27 "not accepted, rerun once clean, then failed".
33. `commit record` of a `pack` step checks R47's one pilot capacity check: pack tokens (canonical
    bytes / 4 of the pack and its cards) within `W_quality − child_prefix_tokens −
    review_reserve_tokens` unless the pack has an `index`, and no confirmed card of the field dropped.
34. Watcher events are keyed by condition onset (§3.10), so an acknowledged condition does not wake
    again while it persists, and one that clears and returns wakes again.
35. Gate action lines are only the params carrying `line` (§3.20). Reason: a suffix rule caught
    `N_max` and `unattributed_share_max`, which no measure carries, and blocked every admission.
36. `unverifiable` is exit 2 everywhere (snap and witness): it is not-run under R40, never a definite
    no.
37. The watcher, the alarm and every command that may pass 60 s (§1.2) run as background commands;
    scripts never wait on a session or sleep beyond the watcher's Δ and the alarm.
38. The R18 flag of a sentence clears only through a sentence-level checker confirmation recorded
    with `check.node` (§3.15). Reason: nothing else ever cleared it, so a flagged review could never
    be certified.
39. `B_tokens`/`r_tokens` null is a reading (R45), not a refusal. Reason: the contract's R45 rule
    wins over the briefs owner's note.
40. Six fixes from the second model check of the coordination rules (165 M states; each fix's
    ablation breaks the named property). **M1** (NoBusyLoop): the coordinator never kills its own
    wake source; a live alarm is re-armed by the token it reads, `run/acked.json` (§3.9), which
    every endturn rewrites; the alarm sleeps again while the token has changed and exits 30 only
    after a whole period without one. (Never killing was already decisions 5 and 29; the token is
    new.) **M2** (NoDeadlock): `status --reconcile`, the first act of every turn, checks the alarm
    of this ce and exits 1 `alarm-missing` when none lives (also when the process list is
    unavailable), so the coordinator starts `watch.mjs --alarm` before anything else and a turn
    that dies before its endturn still leaves a wake source. **M3** (AlwaysCanResolve,
    EventuallyResolves): the watcher raises class 17 `act-due` on the planner's own predicate (the
    `next` of status §3.8 for each row, `owner` excluded; `replace-fence`/`replace-start` only with
    a free slot and neither halted nor draining; `stop-verify` once its sample is
    `stop_verify_deltas` ticks old; an admitted row whose folder has a transcript is `bind`; a drain
    of this ce with no slot used; every row terminal; an `event` line above `acked_seq` whose key
    is no longer active). It is keyed and acknowledged like every class (§3.10), so a condition
    the coordinator has acknowledged and cannot act on stays quiet. The slot count here uses
    `slotCount` with an empty process list (no PowerShell per tick; it can only find a slot free
    too early, which costs one acknowledged wake). **M4** (Slots): admission counts rows admitted
    but not yet started as reservations: already so in `slotCount` (§4.10, an admitted current
    attempt always counts one slot); only a test was missing. **M5** (NoFalseSuspicion): the
    pause discount of §1.2. **M6** (ReadyNotDiscarded): the READY re-check of `fence` applies to
    every reason but `first` and `tainted` (§1.4 exit 5, §3.6).
41. The arm first, the armed gate and the dead-man (round 3: FX-W2, FX-W3, FX-W4; FIX-JOIN point 1).
    Filled by those fixes (S0.5 sets the heading only).
