# replace.mjs (unit U1a)

## Purpose
The one start and restart path (R7). It creates task rows from the coordinator's plan, moves the step
machine of `run/tasks.json` through `fence`, `start` (admission, attempt folder, inputs, checkpoint,
todo, manifest, settings, agent files, brief, `review-in/`) and `bind` (CONTRACT §3.6). It never
starts, stops or messages a session (§6); the coordinator does the session-tool step the row names.

## Command line
```
node tcb/replace.mjs plan  --root R --ce N [--now ISO] [--dry-run]
node tcb/replace.mjs fence --root R --ce N --task T --epoch E --reason first|stall|hang|loop|crash|tainted|memory|handover|cut|drop
                                   [--tick K] [--now ISO] [--boot B] [--dry-run]
node tcb/replace.mjs start --root R --ce N --task T --epoch E [--now ISO] [--free-mb M] [--dry-run]
node tcb/replace.mjs bind  --root R --ce N --task T --epoch E --session SID [--now ISO] [--boot B] [--dry-run]
```
All flags as in §1.1; a missing mode, an unknown reason, a `--session` not matching the session-id
pattern, a task not matching the task pattern exit 66 before anything is read. `--epoch` is always
the row's **current** epoch (for `fence`, the epoch being fenced; for `start`/`bind`, the new one).
Attempts are read only through `lib.attemptOf(row, e)`.

## Reads
`run/` (coord, tasks, ledger, watcher.json `ticks_total`), `plan/tasks-plan.json`, `plan/frozen/`,
`plan/our-work/`, `tcb/` (thresholds R, H_max, user_files, proc_exe and admit's; profiles, settings,
briefs, schemas, agents), `wt/<task>-e<k>/staging/**` (READY, cut prefixes, through `walkFiles`),
`store/commits/` and their objects, `store/witness.jsonl`, `completeness/` (gate.json, the current
cut file), `sealed/plants/<task>/`, `.snapshots/text/`, transcripts, the process list and boot
identifier (outside the lock), the files of threshold `user_files` (hash only).

## Writes
- `run/tasks.json` (+ `.prev`) through `lib.updateRow` / `lib.fence` / `lib.writeTasks`: plan
  creates rows; fence owns `epoch`, `reason`, `step` fenced/stopped(first, cut, drop), `restarts`,
  `handovers`, `parks`, `limit`, `fails`, new `attempts[]`, `state` active, and state `cut`/`dropped`
  of a row with no running attempt; start owns `step` admitted and the attempt's `{folder, manifest,
  settings_sha}`; bind owns `session`, the attempt's `{session, bound_at, boot}`, `step` bound.
- `run/ledger.jsonl`: `plan` {added}, `fence`, `overflow` (a cut with no running attempt), `admit`,
  `bind`, and `incident` {class: refusal} on exits 1, 5, 6.
- `wt/<task>-e<e>/` at start: the inputs of CONTRACT §3.22 under `in/` (`brief.md`,
  `manifest.json`, `checkpoint/committed/<id>.json`, `checkpoint/prefix/<relpath>`, and by stage and
  role `protocol.json`, `questions_sha.txt`, `must_read.json`, `reader-brief.md`, `cut.md`,
  `cut_sha.txt`, `stpa.json`, `fmea.json`, `problems.md`, `hazards.json`, the `review-in/` copy),
  `view/todo.json` [todo], `staging/` (empty), `.claude/settings.json`,
  `.claude/agents/<type>.md` for each type in the profile's `agent_types`.
- `store/objects/m_<16hex>.json` (manifest, lib.putObject); `review-in/<task>/` for stage
  `fresh-review`, built once per task (R13).

## Steps
**plan.** 1 Read `plan/tasks-plan.json` (missing → 2 `missing`), validate it against [tasks-plan]
(`schema-invalid` 1). 2 Under `withRunLock(ce)`: read the table (missing → 67: handover `init`
creates the empty table). 3 For each planned entry: absent row → add `{state planned, step none,
epoch 0, reason null, session null, restarts 0, handovers 0, parks 0, limit false, fails [],
attempts [], commits {}}` plus the entry's task, field, stage, role, tier, steps, deps,
question_ids, e_task; present and equal in those fields → unchanged; present and different →
refuse the whole plan, exit 1 `plan-differs`, no write. 4 A dep naming no task, or a cycle, → exit
1 `plan-invalid`, no write. 5 `writeTasks` once with `expectRev`; append `plan` {added} when rows
were added.

**fence.** 1 `edgeFacts` → now, boot (`proc.boot()`, taken before the lock). 2 Outside the lock
compute `spendAtFence` = `spendOf` over the transcripts of attempt E (its `session`, else
`transcriptsForFolder(folder)`), and the tick: `--tick`, else `run/watcher.json` `ticks_total`; for
a failure reason with neither → exit 2 `no-tick`. 3 Under `withRunLock(ce)`: `drop` needs an `owner`
line `{act: drop, subject: T}` → else exit 1 `no-owner-drop`. 4 `host` (failure reasons other than
`tainted`) = attempt E's `boot` non-null, the current boot non-null, and the two differ (equality
only; CONTRACT §3.6). 5 `cut = stagingCut(wt/T-eE)` (no folder → `{}`). 6 `lib.fence({task,
expectEpoch: E, reason, host, tick, readyCheck, cut, spendAtFence, R, Hmax})`, where `readyCheck`
re-reads `wt/T-eE/staging/READY.json` inside the lock and is true only for a parseable,
schema-valid `{kind: ready, task: T, epoch: E}` (not called for `tainted`). **M6 (CONTRACT
decision 40): the re-check applies to every reason but `first` and `tainted`**, a planned
`handover`, a `memory` park, a `cut` and a `drop` included: under the lock, before calling
`lib.fence`, when the row is at epoch E with a running attempt (active at bound|started|admitted,
or parked/stopped), `readyCheck()` true → exit 5 `ready-wins`, row unchanged, one `incident`
{class: refusal} (the coordinator commits first; the hand-over, park, cut or drop is then moot or
taken on the committed row). The library's own check covers failure reasons only, so replace makes
this one itself; `--dry-run` predicts the same. A `cut`/`drop` on a row
at planned/none or active/stopped takes the no-attempt row (state `cut`/`dropped`, epoch unchanged);
for `cut` append `overflow` {ids: `lib.variant(...).uncovered`, tokens: total spend of every attempt,
reason: "cut"}. 7 Append `fence` {reason, from, to, host, restart_charged, limit, cut_files: number
of files in cut}. 8 Exit 0, or 1 `limit`.

**start.** 1 `edgeFacts`; outside the lock take `proc.list()` (failure → slots counted unknown by
admit, which then refuses with `slots-unknown`), the boot identifier, each attempt's spend, and the
sha256 of every `user_files` path. 2 Under `withRunLock(ce)`: row must be state active|parked at step
`stopped` with epoch E (step `admitted` with this epoch and a manifest → exit 0, result rebuilt from
the row, nothing written). 3 Build admit's facts (admit.mjs.md, "facts") and call `decide`; refused
→ `incident`, exit 6 `deferred` with decide's reasons, row unchanged. 4 An existing `wt/T-eE/` at
step `stopped` is the remains of a torn start: `lib.removeTree` (a link inside → exit 3
`untrusted-path`, the folder left as it is). Every path built is checked with `isUnder(path, root)`
→ else exit 3 `path-escape`. 5 Checkpoint: for each step in `row.commits`, read the commit record,
`getObject` every output and re-check its `sha256` (mismatch → exit 3 `object-mismatch`), copy to
`in/checkpoint/committed/`; for every earlier attempt k < E with a `cut`, `readCutPrefix` and copy
the prefixes to `in/checkpoint/prefix/` (content-identical files once); `mismatched` paths are
reported, never copied. An `s_` id anywhere → exit 3 `seed-id`. 6 Inputs (CONTRACT §3.22): for a
row with a field, `lib.currentProtocol` (none → exit 2 `missing`) → `in/protocol.json` (its bytes),
`in/questions_sha.txt`, `in/must_read.json` [must-read] {schema_version, urls: [{url, href: new
URL(url).href}]}; roles whose
`agent_types` hold `reader` → `in/reader-brief.md`; stage `design-check` → `in/cut.md` and
`in/cut_sha.txt` from `lib.currentDesign` (no cut → exit 2 `missing`); role `mapper` also
`in/stpa.json`, `in/fmea.json` (the outputs `currentDesign`'s rule picks; missing → exit 2),
`in/problems.md` from `plan/our-work/problems.md`, and `in/hazards.json` when a hazards object
exists. 7 todo = `lib.variant(root, row, {f5Given})` → `view/todo.json` {schema_version, task,
epoch, todo: uncovered, covered}. 8 Fresh-review only: build `review-in/T/` once if absent
(CONTRACT §3.22: the dep's `pack` commit record → `pack.json`, `cards/<id>.json`; `files/<relpath>`
from `plan/our-work/` with `sealed/plants/T/<relpath>` replacing a planted file; `snapshots/
<text_sha>.txt` from each pack card's last witness record), then copy it into `in/`. 9 Brief:
`tcb/briefs/<role>.md` with the eight §5 placeholders filled (a placeholder left unfilled → exit 2
`brief-placeholder`). 10 Settings: `tcb/settings/<role>.json` with `{root}`, `{attempt}`, `{task}`,
`{epoch}`, `{node}` (= `process.execPath`) substituted, nothing else (CONTRACT §3.21; an unknown
`{...}` left → exit 2 `settings-placeholder`); hash → `settings_sha`. Agent files: copy
`tcb/agents/<type>.md` for each type in the profile's `agent_types` into `.claude/agents/`.
11 Manifest §3.5 (inputs = every file under `in/` with its sha256, `agents`, `user_files`, `tier`
from the row, outputs from the step table) → `putObject`; copy to `in/manifest.json`.
12 `updateRow`: step admitted, state active, the attempt's folder/manifest/settings_sha. 13 Append
`admit` {e_task, reservation, B, r, live, free_mb}. All of 4-13 happen under the one lock; any
failure in 4-11 removes the partial folder (`removeTree`) and leaves the row at `stopped`.

**bind.** `proc.boot()` before the lock. Under `withRunLock(ce)`: row active, epoch E, step admitted
or started. If a transcript of SID exists and its first `cwd` is not the attempt folder → exit 1
`wrong-folder`. Step `started` with another session → exit 1 `session-differs`. Set `session`, the
attempt's `session`, `bound_at` = now, `boot`; step bound; append `bind` {session, boot}. Step bound
with SID already → exit 0, nothing written.

## Exit codes
0 ok / idempotent repeat; 1 `limit`, `hmax`, `plan-differs`, `plan-invalid`, `no-owner-drop`,
`session-differs`, `wrong-folder`, `no-task`, `schema-invalid`; 2 `missing`, `no-tick`,
`brief-placeholder`, `settings-placeholder`, `schema-version`, `no-attempt`; 3 `run-from-attempt`,
`object-mismatch`, `seed-id`, `path-escape`, `untrusted-path`; 5 `ready-wins`; 6 `deferred`; 64; 65
`stale-epoch`/`wrong-step`/`rev-moved`; 66; 67; 70; 75.

## Rules implemented
R1, R2 (CAS fence, staging cut), R3 (refused admission leaves the row), R7 (checkpoint = commit
records + cut prefixes; READY re-check), R8 (R = 1, host class by boot identifier, limit exits 1),
R10, R11 (unstarted cut → overflow), R12, R13, R14, R21, R22 (user files hashed; tainted fence),
R29, R54 (cut input), R58. Decisions §8: 12, 13, 18, 19, 26, 31, 32, 40. Model findings F1, F5,
F6, A4, A7, E5×E8; second model check M6 (READY re-check for every reason).

## Behaviours (tests)
- T1 plan: a `tasks-plan.json` with two tasks → two rows at planned/none/epoch 0 with their `tier`,
  rev+1, one `plan` line, exit 0, `result.added` both; a repeat → exit 0, `added` [], `unchanged`
  both, file byte-identical, no new line.
- T2 plan: an entry differing from an existing row in `e_task` → exit 1 `plan-differs`, table and
  ledger unchanged; a dep naming an unknown task → exit 1 `plan-invalid`.
- T3 fence first: planned row → epoch 1, step `stopped`, state active, one `attempts` entry with
  folder `wt/<task>-e1`; one `fence` line `{reason:first, from:0, to:1, host:false}`; ledger verifies.
- T4 fence stall on a bound row (epoch 1, restarts 0, R 1), `--tick 7`: epoch 2, step fenced,
  restarts 1, `fails` `[{epoch:1, class:stall, host:false, tick:7}]`, `attemptOf(row,1).cut` lists
  the two staging files with their lengths and hashes, `spend_at_fence` = the fixture transcript's
  total.
- T5 fence stall with a valid READY `{kind:ready, epoch:1}` in staging → exit 5 `ready-wins`, row
  byte-identical, one `incident` line `{class:refusal}`; a READY with `epoch:0`, a schema-valid
  READY of another epoch (`epoch:2` in `wt/<task>-e1`, review U1-F7) or a torn READY does
  not count (fence applies); fence `tainted` with the same valid READY → applied (a READY never wins
  over a taint), restarts +1.
- T5b (M6) fence `handover` on a bound row with a valid READY of epoch 1 → exit 5 `ready-wins`,
  row byte-identical (handovers unchanged), one `incident` {class: refusal}, no `fence` line; the
  same for `memory`, `cut` and `drop` (with its owner line); `--dry-run` of `handover` → exit 5;
  without the READY the `handover` fence applies (epoch 2, handovers 1).
- T6 fence crash where `attemptOf(row,1).boot` is "A" and `--boot B` → `host:true`, restarts
  unchanged, `restart_charged:false`; `--boot A` → host false; a null recorded boot → host false.
- T7 fence stall at restarts = R → fence applied (epoch +1, step fenced), `limit:true`, exit 1
  `limit`, `fence` line written.
- T8 fence handover when handovers + parks = H_max → exit 1 `hmax`, row unchanged, `incident` line.
- T9 fence with `--epoch` one below the row's → exit 65, nothing written; two concurrent fences on
  epoch e (two child processes) → one exit 0, the other 65, final epoch e+1.
- T10 fence drop without an `owner` drop line → exit 1 `no-owner-drop`; with one on a bound row →
  applied (step fenced); with one on a planned row → state `dropped`, step `stopped`, epoch 0.
- T10b fence cut on a row at active/stopped (question_ids [a,b], no card) → state `cut`, epoch
  unchanged, no new attempt, one `overflow` line `{ids:[a,b], reason:"cut"}` and one `fence` line.
- T11 fence stall with no `--tick` and no `watcher.json` → exit 2 `no-tick`, no write.
- T12 fence with `--ce` ≠ coord → exit 64, table and ledger byte-identical; with `--dry-run` →
  exit as the real run, `dry_run:true`, no file changed, no lock file left.
- T13 start (research, deps committed, gate/selftest/fsck lines present, `--free-mb` ample, B null)
  → step admitted; folder has `in/brief.md` with no `{{`, `in/manifest.json`, `in/protocol.json`
  equal to the frozen bytes, `in/questions_sha.txt`, `in/must_read.json`, `in/reader-brief.md`,
  `view/todo.json` validating [todo], empty `staging/`, `.claude/settings.json` whose hook command
  starts with the quoted absolute node path, `.claude/agents/reader.md` equal to `tcb/agents/
  reader.md`; `store/objects/m_*.json` hash equals its name and lists every `in/` file and the agent
  file; the row's `attemptOf(row,e).manifest` is that id; one `admit` line.
- T14 start restart: attempt 1 cut `{a.card.json: 100 bytes}`, file since grown to 180 bytes and a
  new file added after the fence → `in/checkpoint/prefix/a.card.json` has exactly the first 100
  bytes; the new file is absent; a rewritten file appears in `result.checkpoint.mismatched`.
- T15 start copies every committed output; a stored object edited after commit → exit 3
  `object-mismatch`, row stays `stopped`, no folder left; likewise a commit record whose `sha256`
  for an intact object differs from the object's bytes (review U1 mutation R4).
- T16 start refused (free memory below reserve + peak; or a dep not committed; or `halt` line not
  followed by an `owner` resume; or a `drain` line of this ce) → exit 6 `deferred`, reasons carry
  the slug, row unchanged, no folder, one `incident` line.
- T17 start repeated at step admitted → exit 0, no new ledger line, folder unchanged.
- T18 start with a torn folder left at step `stopped` → old folder removed and rebuilt, exit 0; a
  brief holding an unknown `{{x}}` placeholder → exit 2 `brief-placeholder`, no folder left.
- T19 start where `wt/` is a junction to a folder outside the root → exit 3 `path-escape`, nothing
  written outside; a torn folder holding a junction to a temp folder with a sentinel file → exit 3
  `untrusted-path`, the sentinel still exists and was never read (skip both if a junction cannot be
  created).
- T20 start of a fresh-review task builds `review-in/<task>/` once (pack, cards, files with a
  planted copy replacing its original, snapshots); a second task start reuses it byte-identical; its
  files are listed in the manifest's `inputs`.
- T20b start of a design-check task of role `mapper` → `in/cut.md` equal to the current cut file,
  `in/cut_sha.txt`, `in/stpa.json`, `in/fmea.json`, `in/problems.md`; with no `cut` line → exit 2
  `missing`, no folder.
- T21 bind on admitted → step bound, `session` set, `bound_at` = `--now`, `boot` = `--boot`, `bind`
  line; repeat with the same session → exit 0, no line; another session after bound → exit 1
  `session-differs`.
- T22 bind where a fake transcript for the session has `cwd` of another folder → exit 1
  `wrong-folder`, row unchanged.
- T23 any mode with `tasks.json` unparseable → exit 67, `tasks.json.prev` untouched.
- T24 any writing mode while another process holds `run.lock` (a `spawnSleeper` record) → exit 75
  after the retries (the test sets threshold `lock_retries` to 3); stdout is one §1.3 line in every
  case above.

## Cannot be tested without the app
The rendered settings and agent files actually bind the session started in the folder (§7 item 3);
a real session's transcript `cwd` equals the folder named in `bind` (item 7).
