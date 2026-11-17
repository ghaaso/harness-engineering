# Research tree protocol, version 2: built from solved designs (draft for the owner, 2026-11-16)

**Status.** A draft; nothing starts before the owner's go. It replaces the rules of version 1
(`RESEARCH-TREE-PROTOCOL-2026-11-16.md`) and of amendments 2 and 3. Amendment 1 stays in force until he
rules (§12). Its core is his own idea: the child that researched also reviews. Its form of a second
expert and its 300,000 ceiling were the coordinator's additions, not his word. Version 1 and its amendments stay as the record of how the problems
were found.

**Reading it.** Rules R1 to R58 run across the document. Each names its runner (in brackets, or as the script
that is the subject of the rule) and its basis by mapping id (D1-01 = expert field D1, mapping 01, in
`evidence/research-tree/foundations-2026-11-16/map/`). P1-P21, F1-F5, S and C are amendment 3's ids.
*Pilot*: needed before the first field runs. *Later*: waits for what the pilot measures.

**Amended by §16 (2026-11-17).** The build of the trusted scripts changed R5, R6, R7 and R10, added R59 and
R60, and showed other sentences of this document to be wrong (R4, R9, R12, R57, the layout line, the script
list); they are all in §16. Where §16 and an earlier section disagree, §16 holds.

## 1. The idea and the design

The owner's words (typing corrected): "we have to fix these problems; they probably align with
different well documented and solved branches and domains of CS, like I'm reusing distributed systems
and B+ trees." So no rule is made up for the occasion: each problem is an instance of a solved one, the
branch's whole design is borrowed, and where its assumptions fail for language-model sessions we say so.

| Layer | Borrowed design | Classical source | Fixes |
|---|---|---|---|
| 1 Execution | Master-worker batch job (task table, attempts, atomic commit, re-execution) under a supervision tree; crash-only; admission by a computed reservation; progress-kicked watchdog with level-triggered wakes | Dean and Ghemawat 2004; Armstrong 2003; Candea and Fox 2003; O'Neil 1986; Lampson and Redell 1980 | P6 P8 P9 P10 P11 P12 P14 P19 |
| 2 Storage | Append-only, content-addressed, multi-version store; constraints at commit; views with lineage; a build with traces; truth maintenance | Mohan et al. 1992; Bernstein and Goodman 1983; Codd 1970; Gupta and Mumick 1995; Mokhov et al. 2018; Doyle 1979 | P1 P4 P6 P7 P10 P11 P13 P17 |
| 3 Integrity | Clark-Wilson with a small trusted checker that alone promotes, Biba low-water labels, least privilege | Clark and Wilson 1987; Biba 1977; Anderson 1972; Saltzer and Schroeder 1975 | P1 P5 P6 P11 P13 P17 P20 P21 |
| 4 Evidence | Rapid systematic review with GRADE certainty; synthesis as an overview of reviews | Cochrane Handbook; Moher et al. 2015; Rethlefsen et al. 2021; Guyatt et al. 2008; Garritty et al. 2021; Chapman 1951 | P2 P3 P15 P16 P17 P18 F1 F2 |
| 5 Assurance | Independent V&V: checks measured by seeded faults; acceptance sampling | IEEE 1012; Mills 1972; DeMillo, Lipton and Sayward 1978; Dodge and Romig 1929 | P1 P13 P20 |
| 6 Shape and cost | B+ tree bulk-loaded at a fill factor (what must share a window); square-root hand-over law; load control; Smith's rule; internal pilot | Bayer and McCreight 1972; Knuth 1973; Harris 1913; Young 1974; Denning 1968; Smith 1956; Wittes and Brittain 1990 | S P8 P11 P12 P14 P18 |
| 7 Completeness | STPA against one FMEA matrix; capture-recapture of what is missing; protocol model checked with faults; FRACAS | Leveson 2011; MIL-STD-1629A; Cristian 1991; Chao 1987; Eick et al. 1992; Holzmann 1997 | C |

**Where the experts' mappings overrule the coordinator's frame** (followed here):
- Two trust grades, not one: a script certifies only that quote and number are in the stored page
  (*witnessed*); what the number means is judgment, measured, not certified (*confirmed*) (D7-01, D1-05).
- The child must read web text, so sessions are labelled by what they read (Biba, D5-06); only the pack
  freeze, the fresh reviewer and the synthesis are trusted-only readers. The coordinator is labelled
  low: the harness puts each child's 400-character note into its window. That is harmless because the
  coordinator certifies nothing. Every procedure it invokes checks its own inputs (Clark-Wilson).
- Only a session can stop a session, so a hard limit sits below its admission reservation (D3-05);
  fencing is equality with the task table, not "reject older numbers" (D1-01, source check).
- The B+ tree governs what must share one window: the pack at review. The square-root law (R50) governs
  the coordinator and the fresh-review path. How long the research child's window runs is the owner's
  decision (§12).
- Detection rates are calibrated once and pooled (D4-01, D4-11); coverage is held-out seed recall
  (D8-10); a dismissal needs a bar (D6-06); the completeness estimate is a reading, never a stop or a
  gate (D4-05, D8-11); the 400-character note into the coordinator's turn is bounded and measured, not
  closed (D5-09).

**One name for one thing.** *Task*: one stage of one field (research, review, fresh review, control).
*Task table*: `run/tasks.json`. *Attempt*: one start of a task, numbered by its *epoch* e, run in its
*attempt folder* `wt/<task>-e<e>/`. *ce*: the coordinator's epoch. *Ledger*: `run/ledger.jsonl`, the one
hash-chained log. *Commit record*: the ledger line that makes a step's outputs visible. *Status file*:
`run/status.json`. *Store*: `store/`. *Trusted base*: `tcb/`. *Gate*: `completeness/gate.json`.

**Layout.** The run root sits outside every repository and outside every folder that has a CLAUDE.md
or a `.claude/` above it, for example `C:/research-runs/2026-11-harness-leads/`, kept in its own git
repository with no CLAUDE.md. The design documents stay in harness-engineering.
```
tcb/            scripts, schemas, briefs, agent files, role profiles, fixtures
plan/           question lists, approach ids, field protocols, analysis plan, tree-plan, cost inputs
run/            tasks.json, ledger.jsonl, status.json, coord.json (ce, session, acked_seq, alarm pid),
                watcher.json (per-task call and tick counters), watcher.lock, run.lock,
                intents/ (messages to the owner only)
store/          objects/ (cards, packs, reviews, certificates, manifests); status/ (promote only)
views/          labels, repair list, pack.md, review.md, synthesis, owner page, coverage, sof
queue/<batch>/  checker inputs            review-in/<task>/  a fresh reviewer's inputs
completeness/   control structure, UCAs, FMEA, hazards, estimate, model, gate
wt/<task>-e<e>/ attempt folders: in/ (declared inputs), view/, staging/, .claude/settings.json
sealed/         seed keys, held-out seeds, blind key (outside every attempt folder)
.snapshots/     page bytes, extracted text, metadata (outside git)
```

## 2. Layer 1: execution

**Borrowed whole.** The coordinator is a MapReduce master and an OTP supervisor at once (D1 whole,
D1-03, D1-09): a task table, numbered attempts, one atomic commit per attempt, re-execution from the
last commit, restarts limited and escalated (D3-08, D4-07). Crash-only: first start, crash, hand-over
and fresh review take one path (D1-12). Admission by a reservation and quotas come from batch systems
(D1-08, D3-03, D3-05). A session acts only in a turn, so a watcher script is the coordinator's event
loop.

- **R1. One run lock** (pilot). One lock, `run/run.lock`, covers every shared write: `tasks.json`, a
ledger append (the tail is read inside the lock), `status.json` and the git commit. It is created with
wx and holds {pid, process start time, nonce}. A busy lock gets a short bounded retry, then exit 75. A
stale lock is broken only by renaming it to a unique name and checking that the renamed file still
holds the pid, start time and nonce judged stale; on a mismatch it is renamed back. Every `--ce` and
epoch check happens inside the lock. Temp files are named `<file>.<pid>.<nonce>.tmp`, then renamed.
Unparseable table: every script refuses, the owner is told, `tasks.json.prev` kept. [lib.] D3-10,
D2-05, model extra flaw E1.
- **R2. Attempts, epochs, fencing** (pilot). Every start raises the task's epoch e and builds a fresh,
lean attempt folder; commit.mjs accepts only the staging folder whose epoch equals the table's, logs
any other as a zombie write with its tokens. Every script that writes takes `--ce` and exits 64 on a
stale one. The fence is a compare-and-set under the run lock: replace.mjs passes the target epoch, and
the epoch becomes e+1 (restarts +1 for a failure reason) only if it is still e. At the fence the task
row records the attempt's staging cut: per staging file, its byte length and the sha256 of that prefix
(log truncation at the leader epoch, as in Kafka; an extension of D1-01). The coordinator always passes
the table's epoch to commit.mjs. A READY in a stale attempt folder is logged only as zombie-write
telemetry. [replace, commit.] D1-01 as its source check corrects it (Chubby checks against the lock
service), D7-04, D3-09.
- **R3. Start and replace are a step machine in the task row** (pilot): fenced, stop-requested,
stopped, admitted, started(session id), bound. Each script call names the target epoch and the step it
expects, and acts only if the row is there. The coordinator performs only the session-tool step that
the row names. `status.mjs --reconcile` runs at the start of every coordinator turn: a transcript on
disk for the attempt folder means the start happened, so it is recorded. Commit records and pack
freezes are idempotent by exclusive create. Only a message to the owner keeps an intent file. A refused
admission leaves the row at its step, with no new fence and no new count. [replace, status, commit.]
D1-07, D1-12, D3-09.
- **R4. The watcher** (pilot). watch.mjs reads, decides and exits. It holds `run/watcher.lock` (wx;
pid, process start time, ce) for its whole life. The ce check is the first act of every tick and is
repeated inside the lock before each append. Intake (harvest, commit, snap, witness, tms, status) runs
as a separate process that the watcher spawns and does not wait for, one at a time under the run lock.
Its results are read at the next tick. Spend is computed in the tick by lib's single transcript parser.
The watcher exits at once on an urgent event (stall, hang, loop, hard limit, memory, failed stop) and
within δ on others. It also exits on a newer ce. A checker batch is an event only when it is full or
when it is the only thing blocking a task. There is no deadline exit. [watch.] D3-06, D3-07, IEC
61508-7 (a watchdog is independent of what it watches).
- **R5. Progress, not liveness** (pilot). A variant V comes from files: in research, approved ids not
covered by a witnessed card (a committed card until F5); in review, empty form slots plus unchecked
cited cards. Stall: c consecutive model calls across the attempt's transcripts with no fall in V. Hang:
h watcher ticks with no new call in any transcript of the attempt. Both counters are kept per task in
`run/watcher.json` and continued by any later watcher. A tick counts at most once per Δ. No clock reads
elapsed wall time. A READY of the current epoch voids any suspicion of that epoch. c and h are guesses
until the pilot measures them (§11 replaces T_box with c and h). Loop: one tool-call signature three
times running. [watch.] D7-07, D3-06, D4-06, D1-02.
- **R6. Level-triggered wakes** (pilot). Any wake is a hint: the coordinator runs status.mjs, acts on
the status file and ledger events after the last seq it acknowledged, never on a note's text.
`status.mjs --endturn` makes sure two wake sources that the coordinator itself started are pending:
the watcher, and an alarm (`watch.mjs --alarm`, a long sleep and then an exit). Each endturn kills and
re-arms the alarm, so it fires only after a long silence. Its pid and ce go in `coord.json`. Endturn
writes acked_seq into `coord.json` under the run lock, and exits 1 unless both sources run. A
coordinator woken with a stale ce ends its turn without running any script that writes. The bound: a
wake arrives while either source lives; if both wakes are lost, only the owner wakes the tree. The
pilot injects one lost wake (R42's fault list). [status, watch.] D3-07 (Mesa), D5-09.
- **R7. One restart path** (pilot). replace.mjs runs first start, stall, hang, loop, crash, memory
parking, hand-over and fresh review: the fence (R2) and the steps of R3, stop (R9), fsck (R23),
checkpoint = the commit records plus the dead attempt's staging prefixes at or below the cut recorded
at the fence (R2), todo = approved minus covered ids, admit (R10), brief. Those objects enter the new
attempt's `in/` as untrusted staging and pass commit.mjs again. For a failure reason, replace.mjs first
re-checks under the run lock for a READY of the current epoch, and if it finds one it refuses with its
own exit code, so the commit wins. The pilot's fresh review is its first real run. D1-12, D2-03,
D3-13, D4-07.
- **R8. Restart limit** (pilot). A failed task is replaced at most once (R = 1, any class). A restart
is class host, with no charge to R and no count toward W_cc, when the OS boot time (from os.uptime) is
later than the attempt's start. On the limit path, replace.mjs fences, runs stop.mjs and only then
marks the task failed for the owner. Its slot is freed when the stop is confirmed; until then it counts
as live (R10). Memory parking counts toward H_max. Planned replacements do not count toward R;
hand-overs stop at H_max; two failures within W_cc halt admission. [replace exit 1; watch.] D1-09,
D4-07 (beta factor: a common cause is split from independent failures); D3-08 allows two, but a
restart costs a field's tokens.
- **R9. Stopping** (pilot). stop.mjs fences first; after the coordinator's stop it checks for 2Δ that
no transcript of the session or its helpers grows, then kills processes naming the attempt folder;
later growth is zombie spend, sent to the owner past Z. If a stop does not end the helpers, the owner
ends the process, and its tokens are charged to B as zombie spend. D1-01, D3 missing risks (orphans).
- **R10. Admission per task** (pilot). admit.mjs starts a task only if its dependencies are committed,
its field protocol hash is in the ledger (R33), the gate passes for the hash of the design cut (R55),
selftest passes (R41), fewer than N_max live child processes run, stop-unconfirmed ones included (2
until memory is measured, never above 3), free memory minus the reserve covers one session's peak, and
the admission reservation allows it. The reservation is computed at each admission and never stored:
Σ measured spend of every attempt (zombie and post-limit spend included) + Σ (e_task − spent) over
admitted and running tasks; admit if B − reservation − r ≥ e_new. B is a target the owner enforces
beyond r, not a bound. Design-check tasks (blind analyses, mapper, canary helpers) take slots,
reservation and fencing, but not the gate. Before a review task, gate A: every approved id is covered
by a witnessed or confirmed card or listed as not covered, and the share of unverifiable cards is under
its line. No waves as barriers; below the reserve the newest session is parked. [admit.] D1-08, D3-03,
D3-04, D3-05.
- **R11. Spend measured by script, stopped by the coordinator** (pilot). The watcher computes spend
from session and helper transcripts (R4): at 0.8·e the child is told to commit; at e − (Δ + wake
latency) × peak rate the watcher's tick decides, exits urgent, and the coordinator stops the child, the
task cut, its uncovered ids kept. Cutting a task writes an overflow record {ids, tokens, reason} to the
ledger, and those ids stay visible as not covered in every view. The overshoot is reported per
incident, with no bound claimed. The coordinator logs meter readings as lines marked self-reported,
compared only at the end of the pilot. A child awaiting repair commits and ends. [watch, replace.]
D3-05, D1-08, D2-02, Coffman (D3 missing risks).
- **R12. The coordinator's state and hand-over** (pilot). Its only state is the status file and
`coord.json`. From W*_coord (R50) the coordinator drains: it blocks every start (first starts, planned
replacements and failure restarts), and a child that reaches its limit commits and ends with no
successor (notes go to whoever started the child). Quiescence means no live child process of any
epoch. The coordinator then asks the owner, and handover.mjs kills the watcher and the alarm and raises
ce; the owner starts a fresh coordinator from a one-line brief. At the 300k quality line with no answer
from the owner, it ends its turns until he comes. [admit, handover.] D1-10, D2-04.

**Scripts:** admit, replace, stop, watch (with `--alarm`), status, handover; lib.mjs (run lock, atomic
write, ledger append, the single transcript parser). Later: salvage (helper results from a dead
transcript, if the pilot shows loss; it must take `--epoch` when built).

**Where the classical assumptions fail.** Workers are not fail-stop: a confident wrong answer looks
like success, so integrity, not the supervisor, catches it. A restart costs a field's tokens, so it
starts from a checkpoint, once. Faults from a brief recur (D4-07), so they escalate. Reruns are not
deterministic, so recovery reads commits and never replays (D2-03). Only a session can stop a session,
so rlimit is an idea, not a guarantee (D3 source check). MapReduce promises one execution per reduce
task only (D1 source check); here one commit per task holds because consumers read commit records and
the restart path reads only the prefix cut at the fence. Suspicion is not final: a slow call recovers,
so READY outranks suspicion. A stop may not take effect, so slots count live processes. A host reset is
a common cause, not a task failure. A session cannot be woken by a timer it did not start.

## 3. Layer 2: storage

**Borrowed whole.** An append-only, content-addressed, multi-version store with a commit log,
constraints at commit and views with lineage (D2 whole), run as a hashed build with traces (D7-04,
D7-05), with truth maintenance (D7-02), as pipes and filters over immutable artefacts (D8 whole). Git
records history only.

- **R13. One writer per file** (pilot). A session writes only its `staging/`; commit.mjs writes
objects and commit records; promote.mjs writes `store/status/`; replace.mjs alone builds
`review-in/<task>/`, from the frozen pack hash, the must-read snapshots and the field's fixed file list
in `protocol.json`; view scripts write `views/`; only lib.mjs appends to the ledger. [guard-hook
prevents; fsck detects.] D2-05, D8-08.
- **R14. Commit protocol and identity** (pilot). commit.mjs validates each staging file (reject with a
code, never repair) and stores it as `store/objects/<sha256 prefix>.json` by exclusive create. A step's
outputs become visible only through its commit record {task, epoch, step key, output hashes}: the
first wins, an identical repeat is a no-op, a different one is refused; then a git commit carries the
ledger head. Nothing is edited in place, ids are never reused, an unknown `schema_version` is refused.
D2-03, D1-03, D3-09, D8-05, D8-02.
- **R15. Harvest, never retype** (pilot). harvest.mjs copies each reader's schema-checked result from
the transcripts into `staging/`; where none parses, the child's card is tagged `copied_by_session` and
counted. D2-08, D8-01.
- **R16. Correction and retraction** (pilot). A correction is a new card with `supersedes`; only
promote.mjs rejects a card; nothing is deleted; a citation is never re-pointed, its sentence goes stale
(R19). D7-02, D2-07.
- **R17. Packs are frozen snapshots** (pilot). A pack is an object (question-list hash, sorted card
ids, conclusions, parent hash) whose hash covers content only (a hash tree; status outside it); over
capacity it becomes a two-level index, and no confirmed card is cut. D2-02, D8-02 (as corrected).
- **R18. Citations are foreign keys** (pilot). Each sentence {sid, approach_id, measure, kind, text,
cites, applies_to} names one pack. commit.mjs rejects a bad schema, an uncited fact, a cite outside
the pack; it flags to the checker, gate shut, an applies_to outside or dropping the card's typed
conditions, and a number equal to no cited value or baseline. Conditions are stored once and shown by
join, replacing "copy conditions field by field". D2-07, D2-08, D7-08, D4-10, D8-06, D1-06.
- **R19. One label script, with staleness** (pilot). tms.mjs labels cards (pending, witnessed,
confirmed, unverifiable, rejected, superseded) and every sentence, verdict, claim and dismissal: STALE
(a support fell or an input hash changed) > PENDING > JUDGMENT (judgment kind, uncited, an unverifiable
or unclear support, or support only in our own files) > IN. Certificates hold their read-set hash and
void on change; gates refuse STALE and PENDING. Integrity's low-water labels use the same script. D7-02,
D2-07, D5-03, D2-10.
- **R20. Everything a person reads is a view** (pilot). render.mjs and status.mjs build `views/`
(labels, repair list, pack.md, review.md, synthesis table, owner page, coverage over the union of
fields, sof per field), rebuilt, never edited. render.mjs computes the owner's seven measures per task,
field and arm from the transcripts and the ledger. Throughput: approved ids covered by a witnessed or
confirmed card, per hour. Efficiency: confirmed answers per million tokens. Token count: all
transcripts, helpers included. Token cost: the count weighted by the provider's relative prices per
tier and cache class, with no currency. Time taken: from ledger timestamps, with sleep gaps shown
apart. Quality: Comparison 1's primary plus the blinded rubric. Hallucinations: witness rejections,
checker rejections, citation failures and the seeded escape rate. They go on the owner page. A
cross-field adjudication is a model's, so it is an object under R18. D2-08, D1-10, D7-05, D7-11.
- **R21. Declared inputs** (pilot). Each step has a manifest (brief, schema, tier, tools, input
hashes, the named user-level files) whose hash is its key; it is the reference for R22 and R27.
Recovery is R7, from commit records; a model step is never rerun to verify it; a reader's fetches are
recorded as discovered inputs. Keyed reuse and repair of STALE nodes only wait for later. [replace,
audit.] D7-04, D7-05 (Shake).
- **R22. Read audit** (pilot). audit.mjs, after every turn, taints output whose transcripts read
outside `in/`, own `staging/`, `view/` or trusted read-only paths: not accepted, rerun once clean,
then failed. It flags a first-call context above the lean baseline (auto-loaded files). The lean
baseline comes from a control session started in an empty folder outside every repository. Every
manifest names the user-level files that still load (the user CLAUDE.md, the user settings), by hash,
as a declared input. D7-04, D5-07.
- **R23. Store check** (pilot). fsck.mjs recomputes object hashes, the ledger chain, foreign keys and
status writers, and checks `tcb/` against the commit the owner named (R28), before any restart and
each commit record; on failure nothing proceeds. D5-12, D2-03.

**Scripts:** harvest, commit, tms, render, status, audit, fsck. Later: index (cross-field source index,
only if overlap × reader tokens × remaining fields exceeds its cost: D2-06, D1-11), migrate, keyed
reuse (R21).

**Where the classical assumptions fail.** Writers commit confident falsehoods: constraints check
references and scope, never truth. Lineage is only what is declared: a same-window review has
undeclared inputs and is labelled JUDGMENT; the pilot measures their share (u, D8-07). Steps are not
deterministic: recovery reads commits, and early cutoff would hold for script steps only. Reads cannot
be sandboxed, so they are audited. The web keeps no versions, so we keep snapshots. Prose is matched by
(approach, measure).

## 4. Layer 3: integrity

**Borrowed whole.** Clark-Wilson with a small reference monitor and Biba low-water labels (D5 whole);
promote.mjs is the only writer of `store/status/` (R13), behind the harness deny rules of R29. Only
witnessed is certified by a script (result checking, D7-01). Confirmed is a judgment whose detection
rate is measured (R42). Scripts exit 0 pass, 1 fail, 2 not run, 3 tampering.

- **R24. Two classes** (pilot). Untrusted: web text, reader returns, drafts, notes, anything in an
attempt folder. Trusted: snapshots, witnessed or confirmed cards, ledger-hashed packs, certified
reviews. Pack freeze, a fresh reviewer's inputs, synthesis and status file read only trusted items.
[Those scripts exit 1 listing the ids.] D5-01 (rule C5).
- **R25. The witness, by script** (pilot; needs F5). snap.mjs fetches with Node's own fetch (http(s)
only, size and time caps, no cookies, no private addresses) and stores bytes and HTML text by sha256.
witness.mjs normalises, finds the exact quote, then the number within w characters: witnessed,
rejected or unverifiable (never passed), bound to card and snapshot hashes. A new hash on refetch is
`source_changed`; number-without-quote goes to the checker as a paraphrase case. It runs at intake, at
freeze and after the review. D7-01, D1-05, D5-04, D2-09, D4-04, D8-02.
- **R26. Judgment through a narrow interface** (pilot). check-queue.mjs writes one file per flagged item
(typed card, about 200 words around the offset, the sentence). The coordinator, never the child,
starts the checker: Read only on its batch, a fixed brief, an enum verdict. promote.mjs reads it from
the checker's own transcript and writes *confirmed* only for a witnessed card and a qualified fault
class (R42); off-enum is *unclear*. D5-10, D5-05, D8-06, D4-10.
- **R27. Labels are computed** (pilot). Schemas reject status or label fields in session files;
audit.mjs labels a session clean only if it reads only manifest inputs, the named user-level files
included (R22), else tainted; a tainted session's facts stand only on their own promoted cards. D5-03,
D5-06 (low-water mark, Flume).
- **R28. The trusted base** (pilot). `tcb/` sits at a pinned commit, changed only by an owner-approved
commit; checks run from it, never from an attempt folder. `tcb.lock.json` is no longer the reference:
the owner's go message names the approved tcb commit hash, the coordinator's brief echoes it, every tcb
check compares against it, and the owner page shows it so he can compare. This is tamper-evident, not
tamper-proof. fsck.mjs checks tcb's hashes against that commit and every attempt's `.claude/` before
each check run and commit record. [Mismatch: exit 3, all work stops, items revert to untrusted, owner
told.] D5-08 (Anderson; Tripwire).
- **R29. Least privilege, enforced twice** (pilot). replace.mjs writes each attempt folder's settings
from its role. Permission deny rules in the user-level settings refuse Write and Edit on the run root's
`tcb/**`, `run/**`, `store/**`, `sealed/**`, `review-in/**` and `wt/*/.claude/**`; they name only
research paths, so the owner's other work is untouched, and the owner applies them. Per-folder settings
keep Bash refused except the coordinator's `node tcb/scripts/*`. guard-hook.mjs refuses out-of-role
paths, writes to `.claude/`, Bash (except the coordinator's `node tcb/scripts/*`), wrong helper types
and a child's fetch of a non-witnessed URL, and denies on its own error. The R41 canary also tests the
user-level denies. audit.mjs, not relying on hooks, checks every transcript's tools, paths, URLs and
search text against a project-term denylist, and exits 3 on any write call that touches `tcb/`,
`.claude/`, `sealed/` or `review-in/`. D5-02, D8-05.

| Role | Tools | Reads | Writes |
|---|---|---|---|
| Reader | WebSearch, WebFetch; brief holds no project data | nothing on disk | nothing; capped schema result |
| Checker | Read | `queue/<batch>/` | nothing; enum result |
| Child | Read, Write, Edit, Agent (reader), WebFetch (witnessed must-read URLs) | its attempt folder | its `staging/` |
| Child (reviewing), under F1 option a | as the child | its attempt folder; its window holds its research | its `staging/` |
| Fresh reviewer | Read, Write | its attempt folder (`in/` from `review-in/`, built by replace) | its `staging/` |
| Coordinator | Read, Write, Agent (checker, mapper), session tools, `node tcb/scripts/*` | status file, certificates, trusted files | its notes |
| Scripts | Node fs; fetch (snap only); git (commit only) | all | per R13 |

- **R30. The coordinator reads typed status** (pilot). The child's last line is `TURN-END <field>`;
audit.mjs flags any other note; the coordinator treats a note only as a wake. D5-09 (no read-down for
the most privileged subject). Obedience remains, flagged afterwards.
- **R31. The ledger** (pilot). Only lib.mjs appends, h_i = sha256(h_{i−1} ‖ entry_i); gate figures come
only from script lines; the head goes into each git commit and the status file. The chain is
tamper-evident against writers who do not recompute the chain; a deliberate rewrite is caught only
against a head the owner noted. [fsck; a break stops all work.] D5-11 (Schneier and Kelsey; rule C4).
- **R32. Reader returns at the boundary** (pilot). The harness validates a reader's result against the
schema the child passes. harvest.mjs re-validates every result against tcb's card schema, so an altered
schema costs only retries, and cards made that way count as `copied_by_session`. The card schema: typed
fields, quote at most 15 words, capped free text, every required number able to say "not stated";
anything else is rejected, never escaped or filtered. D8-05 (recognise before processing), D2-13, D5-02.

**Scripts:** guard-hook, snap, witness, check-queue, promote; the tcb check runs in fsck, folder
settings are written by replace.

**Where the classical assumptions fail.** Clark-Wilson certifies procedures; a model checker cannot be
certified, so a script certifies what it can and the model is measured. A sentence depends on its whole
window, so labels are per session. Two instances of one model are not independent. Hooks and settings
are editable files, unverified here, so a detective layer backs them. The deputy to bound is the
child, not the reader; the most privileged reader of relayed text is the coordinator (D5-02, D5-09).

## 5. Layer 4: evidence

**Borrowed whole.** A rapid systematic review with GRADE certainty, the synthesis as an overview of
reviews (D6 whole): question list = registered protocol, readers = searchers, cards = extraction forms,
checker = second extractor, pack = evidence tables. Our own work is never graded as a source.

- **R33. Field protocol frozen before the search** (pilot). `protocol.json` (question ids, criteria
with reason codes, routes, schema version, certainty method, smallest effect of interest per measure,
out-list vocabulary) is owner-approved and hashed into the ledger by protocol-freeze.mjs; changes go
through `--amend` with a reason. [admit refuses readers before it.] D6-07 (PRISMA-P is a reporting
guide, not a registry; the ledger hash does that job), D6 missing risks (forking paths).
- **R34. Search documented from transcripts** (pilot). audit.mjs logs every query, tool, time, result
count and fetched URL; commit.mjs rejects a card whose URL is in no transcript; the log is marked not
repeatable. D6-07 (PRISMA-S).
- **R35. Coverage as held-out seed recall** (pilot). Cards record route, canonical id and primary id.
protocol-freeze.mjs splits the seeds before Stage A (half held out in `sealed/`). The coverage figure
is held-out seed recall per field, with its Clopper-Pearson interval, in render.mjs's coverage view. It
is labelled an upper bound for a stated reason, as an assumption: seeds are probably easier to find
than the average relevant source. Chapman's N̂ = (n1+1)(n2+1)/(m+1) − 1 is computed pooled per field,
only from routes that happened anyway, and only as a diagnostic of route dependence. Low or not
estimable coverage feeds R36. It logs yield per reader call. Later: per-question two-route capture.
D6-04, D8-10.
- **R36. Certainty: the script sets a ceiling** (later: before the first synthesis). certainty.mjs
starts from distinct primaries (high only for replicated or independent controlled comparisons) and
downgrades mechanically (inconsistency, typed-condition mismatch, one primary or low coverage, vendor
majority); the model may only lower it, with a reason per domain; only `sof.json` enters the
synthesis. The evidence that selected a lead never confirms it. D6-08, D4-10, D5-03, D6 missing risks
(winner's curse).
- **R37. Agreement never raises a claim** (pilot). The synthesis ignores agreement counts; a
disagreement marks a key weak and goes to one source-tied adjudication. [render, tms.] D6-01 (Ladha),
D4-02, D7-09, D8-03, D1-04.
- **R38. A dismissal is an open hazard with a bar** (pilot). tms.mjs keeps a dismissal only if a
confirmed card bounds the effect below the smallest effect of interest under covering conditions, else
labels it "untested"; an out-list match or stale support reopens it (exit 10). Later: a refuter attacks
every standing entry with 2 or 3 seeded false dismissals. D6-06, D4-12 (MIL-STD-882E), D7-03 (Doyle).
- **R39. The pilot's analysis plan is frozen** (pilot). Units, outcomes, Δ, decision rules, one look,
arm budgets and the label "descriptive, n = 1 per arm" are owner-approved and hashed before the first
arm. [compare.mjs labels results "exploratory" otherwise.] D6-05, D6 missing risks (optional stopping).

**Scripts:** protocol-freeze (with the held-out seed split), compare; dismissals are labels in tms and
coverage is a view in render. Later: certainty, stop-check (saturation stop in the hook, D6-12), an
exclusion re-screen (D6-07), second-opinion (error correlation, n_eff, beta factor: D6-10, D4-02).

**Where the classical assumptions fail.** Captures by one model and engine are dependent and favour
popular papers, so N̂ runs low; Chapman is near-unbiased only when n1 + n2 is at least about N (source
check). Risk of bias is judgment, so a script ceiling bounds it. A summariser's search is not
repeatable. The knee stopping rule has no guarantee (source check).

## 6. Layer 5: assurance

**Borrowed whole.** Independent verification and validation (IEEE 1012) with seeded faults: every check
has a measured detection rate, the chain a measured escape rate (D4 whole, D4-01, D8-04).

- **R40. Three values** (pilot). Every check records pass, fail or not-run; a missing record or a stale
watcher tick is not-run; gates count not-run as fail. D4 missing risks (fail-safe defaults).
- **R41. Scripts are tested before use** (pilot). selftest.mjs runs every trusted script on good and
bad fixtures per fault class, plus a canary for hooks and user-level denies (a throwaway helper tries
each forbidden call; the refusal is read from its transcript), whenever `tcb/` changes. D4 missing
risks, D5-08.
- **R42. Seeded faults** (pilot). seed.mjs makes script classes (S1 invented quote, S2 altered number,
S3 borrowed quote, S4 wrong id) and checker classes (J1 number and baseline swapped, J2 condition
dropped, J3 sentence wider than the card, J4 planted instruction) in a reserved id namespace refused
outside the seed store, key in `sealed/`. One checker call carries at most one seed of each class, at a
random position among real items. Calibration: ⌈ln 0.05 / ln d0⌉ calls per J class (14 calls at
d0 = 0.8); the Clopper-Pearson bound counts calls, not seeds. Later batches carry 10 % proof seeds. A
class whose Clopper-Pearson lower bound falls below d0 is unqualified and its confirmations revert to
witnessed. The escape rate is measured on seeds, never multiplied. The pilot also kills a child, sleeps
once, forces a hand-over, plants a stale-epoch write and a loop, loses one wake, and runs the probes of
§13. D4-01, D8-04, D5-14, D4-02, D1-12.
- **R43. Cited cards checked in full** (pilot). Every cited card is checked, and certification
requires each to be confirmed and to pass R18. The escape rate measured on seeds is reported beside the
review. Later: a zero-acceptance lot of uncited cards per reader, n = ⌈ln β / ln(1 − d·p1)⌉. D4-09,
D6-03 (Dodge and Romig).
- **R44. Certifying an expert** (pilot). Gate A runs in admit.mjs before the review (R10). After the
review, certify.mjs certifies only if reads match the manifest, cited cards are confirmed and pass R18,
and t of k = 3 plants are found (one against the hoped answer; rates pooled). D5-07, D4-11.
- **R45. Every measure has an action line** (pilot). The owner sets each threshold before the pilot,
one of them on the share of unverifiable cards; action lines are stated in the seven measures (R20);
gate.mjs compares at each admission. Silence on a threshold means the default stated in its mapping,
logged as such (d0 = 0.8, β = 0.05). Where no mapping gives a default (plants t, coverage floor, action
lines), the item is a reading in the pilot, not a gate. D4 missing risks (normalisation of deviance).

**Scripts:** selftest, seed, check-queue, certify. Later: correct-rates (D6-02), challenge (D7-10),
cooke (D6-09).

**Where the classical assumptions fail.** Hand-made seeds may be easier than real faults, so the
checker's disagreement with the script is tracked. Mills' estimate needs equally detectable faults
(source check). Three plants per expert give no rate, so plants are pooled.

## 7. Layer 6: shape and cost

**Borrowed whole, where each holds.** A B+ tree bulk-loaded at a fill factor governs what must share a
window: a field's key range and its pack at review (D2-01, D2-02). The square-root checkpoint law
governs the coordinator and the fresh-review path: every call re-reads its window, so windows stay
small (D3-01, D2-04). How long the research child's window runs is the owner's decision (§12). Key =
approved question id; leaf = field; root = coordinator; t_q, κ_q = research and pack tokens of a key;
P = fixed prefix; g = tokens per call; S = reloaded state; σ = its growth per epoch; H0 = fixed
hand-over tokens.

- **R46. Key space** (pilot). Keys are `<field>-<group>-<nn>`, each with one owning field; a
cross-field key is a read-only input of the other field, counted over the union. [protocol-freeze exit
3 on a key with no owner, two owners or no group; plan-tree repeats it later.] D8-09 (Conway), D2-01.
- **R47. Bulk load after the pilot** (pilot: the lanes and one check). In the pilot the leaves are the
lanes, with one capacity check at pack freeze (C_node = W_quality − P − R_rev; no confirmed card is
cut). plan-tree.mjs runs after the pilot on the t_q measured by `cost.mjs --from-transcripts`, before
wave 1: it packs whole groups in key order; a leaf is full at Σt_q ≥ f·A_leaf or Σκ_q ≥ f·C_node, with
f = 0.75 retuned to the slack used (ln 2 holds only for high-order B-trees: source check). A lane over
f·C splits by group range then, before any spend. An id with no estimate is listed and blocks admission
(D2-01 on_failure). D2-01.
- **R48. Overflow in the tree's own order** (pilot for (b) and (e); the rest later). (a) Later: before a
reader starts, the hook allows its group only if U + Σ_group t_q(1+m) ≤ (1−r)A_leaf and the projected
pack fits f·C_node; in the pilot the watcher logs the predicted against the realised t_q per group.
(b) The pack goes out of line (R17). (c) Later: a cross-field key may move to its co-owner. (d) Later:
a split. The overflow record (R11) becomes a new leaf whose separator is written into
`tree-plan.json`, and the field's review reads both leaves through R17's two-level index. (e) Only the
owner drops a range. Later, before the first synthesis: gate.mjs refuses the synthesis while any range
is neither committed, scheduled, nor dropped on the owner's quoted word. Once (d) exists, this replaces
"cut the pack and list the rest". D2-02 (B*-tree; TOAST; Lehman and Yao), D6-12.
- **R49. A roll-over is not a split** (later; only under option (b) of the research child's window,
§12). At W* a successor of the same leaf continues from commits; once S ≥ g·k*, or past
n_max = k*(g·k* − S0)/σ calls, the range splits by R48(d). D2-02, D3-01, D3 missing risks (Denning's
thrashing).
- **R50. The hand-over interval** (pilot for the coordinator and the fresh-review path; for the
research child only under option (b) of §12). With H0 = (h_c + o + q_f)(P + S) + w, tokens per work
call are least at k* = √(2H0/g), so W* = P + S + √(2H0·g); with state growth
k* = √((2H0 + σ·n_rem)/g), re-applied each epoch. cost.mjs computes W*; the watcher reads each window
from its transcript and exits at W*; audit.mjs flags every coordinator turn above 1.5·W*_coord to the
owner. Read-once content goes to a helper. D3-01 (Harris; Young), D2-04, D3-02; the σ term is derived
here (D3-12 has no source).
- **R51. Order of work** (later). Precedence first, then Smith's rule (w_f/est_f highest first, w_f
doubled per wave waited); groups in the same order within a leaf. [admit.] D3-14.
- **R52. A budget from the internal pilot** (measured in the pilot, applied after).
`cost.mjs --from-transcripts` turns the pilot's transcripts into unit costs and t_q per key; then each
task's term in the admission reservation is e_f = C_f(1 + max(m_owner, z√v, worst overrun)), checks and
a synthesis share included; re-plan when actual exceeds 1.5 × estimate; update by exponential
averaging. The pilot runs on the owner's allowance. D6-13, D1-08, D2-12, D3-04.
- **R53. A stated prediction for P18** (pilot). Before the pilot, cost.mjs predicts the tokens of one
session against the tree, reported as speed-up in time and work ratio in tokens, and the pilot's total
over every arm (T, R_same, R1, R2, S1, and S2 if allowed), with its figures marked stand-in. Off by
more than 2×, no fan-out choice rests on the model. D3-12, D3-11 (Amdahl, read, not fitted).

**Scripts:** cost (the existing prototype `tree-v2/cost/cost.js`, renamed, with a `--from-transcripts`
mode for unit costs at the pilot's end). Later: plan-tree, coupling (source sharing, to choose split
cuts, D8-08).

**Where the classical assumptions fail.** A B+ tree wants full nodes, windows want small ones, so the
tree covers only what must co-reside, with two capacities (pack and spend). Keys are not independent:
only cross-field keys move, and a split keeps one expertise. Young's law trades checkpoints against lost
work; here hand-overs against re-reading, and growing state adds σ (cost.mjs found the plain law
handing over about twice too often, on stand-in inputs). At seven leaves the borrowed parts are node
capacity, fill factor, splitting the key range with a separator written to the parent, and never
dropping a key. Height, search, latches and merges add nothing. A hand-over's quality loss has no token
price; H_max and n_max bound it.

## 8. Layer 7: completeness

**Borrowed whole.** Completeness is relative to a model, a fault list and a property list (D7-13,
D4-05). Claimed: a stated control structure; two blind analyses (STPA, Leveson 2011; one FMEA matrix,
MIL-STD-1629A); a residual estimate as a reading (Eick et al. 1992; Chao 1987); a protocol model with
faults (Holzmann); feedback from operation (FRACAS). The coordinator, under analysis, fills none.

- **R54. Two blind analyses** (pilot). `gate.mjs --cut` writes the design cut: the layout, the role
table, the script lists and the rule texts, with §8, §9, §13, every "where the classical assumptions
fail" paragraph and every P, N, G, D and K id removed. Two fresh leaf sessions get only the cut and run
in hermetic folders (outside every repository, like the run root); audit.mjs refuses an analysis whose
transcript read the full design. One writes the STPA (each control action not given, unsafe,
mistimed, too long or short). The other fills one FMEA matrix: components by crash, amnesia, omission,
timing, wrong value, common cause, fabrication, injected text, agreeing with the brief; data by
Berenson's anomalies plus torn write and stale derived data; boundary flows by STRIDE. Later: a refuter
samples the "n/a" cells. They run before the pilot, after it, and whenever the cut's hash changes.
D4-05, D1-13, D2-11, D5-13.
- **R55. Map and gate** (pilot). A mapper helper maps findings into `hazards.jsonl` (append-only).
gate.mjs passes only if the matrix is full, every P-id has a row, every high hazard (gaps G1-G12
included) is covered or accepted on the owner's quoted word, and R57 passes; it binds to the hash of
the design cut plus `hazards.jsonl`. A tcb change reruns selftest and the canary only (R41). [admit
refuses without it; missing is not-run.] D2-11, D4-05.
- **R56. The residual is a reading** (pilot). render.mjs computes Chapman between the two analyses and
Chao2 over the lenses, with a range over borderline merges. They are readings that never pass, stop or
add anything. The pilot's incident list (R58) is the next capture source, not another blind lens. Never
"complete". D6-04, D8-11.
- **R57. A protocol model** (pilot). protocol-model.mjs is the existing `tree-v2/model/model.mjs`,
extended. It searches breadth-first over epochs, watcher ownership, up to three sessions and the faults
crash, sleep, allowance out, loop, lost wake and owner absent. It models the adopted designs, not
oracles: the alarm, the call and tick counters, the watcher lock, the compare-and-set step machine with
a coordinator crash, the lock break and live-process counting. It checks one accepted ce, COMMIT
creations counted (at most one per task), no replacement beside a live predecessor, Slots and
FailedTaskStopped over live processes, R = 1, every wake reaching the active coordinator while either
wake source lives (if both wakes are lost, only the owner wakes the tree), no admission without a gate,
recoverable stalls, a READY landing during a turn, and every task ending within K steps. The fault
budget is 4 events, checked when a plan runs, not when it is built. A counterexample blocks the change.
First case: a watcher waking a stale coordinator. Current verdict: blocked, until the extended model
holds. D7-06, D7-13.
- **R58. Incidents** (pilot format, later analysis). Every refusal, timeout, restart and not-run is an
`incident` ledger line; later fracas.mjs maps each to a hazard, and an unmapped high one stops
admission. D4-05(e).

**What the estimate says today.** The experts' 63 missing risks map, by one mapper, to 47 risks over
8 lenses (33 seen once, 11 twice, 3 thrice): Chao2 gives roughly 40 to 80 unseen, and the merges
alone move it twofold; a two-method Chapman gives about 7, but that pass read the lists first. No
estimator is valid here; each exceeds the experts' proposed stop (2 or 3), so the estimate is reported,
not used as a stop.

**Scripts:** gate (with `--cut`), protocol-model; the residual readings are computed in render. Later:
fracas.

**Where the classical assumptions fail.** Capture-recapture needs independent, equally catchable
captures of a closed population; the lenses share one model, are stratified by field, and the design
changes at each amendment. STPA draws feedback as it is: a free-text note and a whole-percent meter.

## 9. Every problem and its fix

| Id | Problem | Classical name | Standard solution | Rules | What remains |
|---|---|---|---|---|---|
| P1 | A wrong fact travels | Clark-Wilson C5; result checking; stale derived data | Witness by script, one promotion, staleness, measured checker | R14 R18 R19 R24-R26 R42 R43 | Meaning is judgment, measured not certified |
| P2 | Anchoring | Undeclared dependencies; registered protocol | Lean folder, declared inputs, frozen protocol, plant against hope | R2 R21 R22 R33 R44 | Wording of approved questions; auto-loaded files seen by prefix size only |
| P3 | Ensemble agrees wrongly | Coincident failure; correlated jury | Compare to detect, never vote; measure coupling | R37 R42 | No diversity without F3 |
| P4 | Loss at a hand-over | Update anomaly; data processing inequality; end-to-end check | Store once, join, harvest, check at consumer | R15 R17 R18 R20 R49 R50 | Untyped caveats; unwritten understanding |
| P5 | Web text steers a session | Confused deputy; injection | Least privilege per role; strict typed schema | R29 R30 R32 R42 | Capped text reaches the child; the note stays open |
| P6 | Two writers | Lost update; split brain | Shared-nothing, exclusive create, fencing | R1 R2 R13 R14 R29 | Rests on the hook; zombie tokens |
| P7 | Sources read twice | Coordination avoidance | Accept idempotent duplicates; count overlap | R25 R35 | Index later |
| P8 | Runaway fan-out | Load control; admission reservation | Slots, memory check, admission reservation | R10 R11 | Helpers bounded by the reservation only |
| P9 | Waiting | Failure detection; lost wake-up; pause | Progress watchdog, level-triggered wakes | R4 R5 R6 R9 | Both wake sources lost: only the owner wakes the tree; PC awake unproven |
| P10 | A crash | Crash-only; atomic commit; checkpoint | One path, commit record, fsck, R = 1 | R3 R7 R8 R14 R23 | Unwritten knowledge; reboot needs the owner; host resets are not charged |
| P11 | Coordinator's window | Snapshot from the log; checkpoint interval | Status file, hand-over at W*, ce | R6 R12 R30 R50 | Owner starts the successor; the drain idles slots |
| P12 | Children's cost | Square-root law; quotas | W*, n_max, limits, admission reservation | R11 R49 R50 R52 | Inputs unmeasured; overshoot reported per incident; no bound after a lost wake |
| P13 | A weak expert | IVPs; known-answer tests; phantom | Script certificate, plants, gate A, read-set hash | R19 R22 R43 R44 | Three plants catch gross failure only |
| P14 | Unknown cost | Internal pilot; audit by the system | Unit costs from transcripts, admission reservation, re-plan | R10 R11 R31 R52 | One chosen pilot; coarse meter |
| P15 | Wrong dismissal unchallenged | Absence of evidence; hazard log; OUT-list | Bar, reopening; seeded refuter later | R38 | No refuter in the pilot |
| P16 | Search decides knowledge | PRISMA-S; capture-recapture; sponsorship | Search log, held-out seed recall, distinct primaries | R34 R35 R36 | Coverage overstated |
| P17 | Card outside its conditions | Design by contract; Ariane 501; indirectness | Typed scope check, checker on flags | R18 R26 R36 | Prose conditions are judgment |
| P18 | Tree may not beat one session | Pre-registered paired design; Amdahl | Frozen plan, blind scoring, cost prediction | R39 R53, §11 | n = 1 per arm |
| P19 | Busy, not progressing | Variant function; logical supervision | V from files, loop signature | R5 | Irrelevant sources until c calls |
| P20 | Shared blind spots | Common-mode failure; separation of duty | Script first, narrow checker, measured | R25 R26 R42 | No diversity without F3 |
| P21 | Check sees a summary | Reference monitor; TOCTOU | Own snapshot, hash-bound witness | R25 | Needs F5; PDFs unverifiable |
| F1 | Where the review runs | Recovery block; Biba; dirty read | Fresh path always runs; both in the pilot | R7 R19 R22, §11 | Owner's ruling |
| F2 | The second expert | Generalizability theory; beta factor | Measure before buying | R37, §11 | Owner's call |
| S | The shape | B+ bulk load; overflow; square-root law | As in the rules | R46-R50 | Pilot on the lanes; bulk load after it |
| C | Completeness | STPA, FMEA, capture-recapture, model checking | As in the rules | R54-R58 | Relative to a model |
| N1 | Zombie writes after replacement | Split brain | Fencing token | R2 R9 | Tokens until stopped |
| N2 | Every timer fires after sleep | Process pause | Counters in calls and ticks | R5 | PC awake unknown |
| N3 | Wake reaches nobody or the old coordinator | Lost wake-up | Level-triggered; watcher and alarm; quiet hand-over | R6 R12 R57 | Both wakes lost |
| N4 | Helpers outlive a stopped child | Orphans | Kill by tree; verify | R9 | Unverified |
| N5 | Half-written files read as done | Torn write | Commit record last | R3 R14 R23 | A torn step is retried by reconcile at each turn |
| N6 | Restart storm; common cause | Restart intensity | Limit, escalate, halt | R8 | W_cc a guess |
| N7 | Nothing resumes after reboot | Crash-only needs a starter | Step machine reconciled each turn | R3 R6 | Owner restarts |
| N8 | Page changes between read and check | Non-repeatable read | Snapshot reads | R25 | Needs F5 |
| N9 | Deadlock on slots | Hold and wait | Release before waiting | R11 | The model check found no slot deadlock within its bounds; the lost-wake deadlock is fixed in R6 |
| N10 | Unmeasured or unrun check read as pass | Fail-safe defaults; seeding | Three values, seeds | R40-R42 | Seeds may be easy |
| N11 | Analysis chosen after results | Forking paths | Pre-registration | R33 R39 | None in the plan |
| N12 | Winner's curse | Regression to the mean | Judge on a new test | R36 | No shrinkage |
| N13 | Schema changes mid-run | Versioning | Refuse unknown versions | R14 | migrate later |
| N14 | One original counted twice | Pseudoreplication | Distinct primaries | R35 R36 | Primary ids from readers |
| N15 | A dropped card lives on | Cascading abort | Truth maintenance | R19 | Uncited restatement |
| N16 | Self-attested records | Rule C4 | Script-only chained ledger | R31 | Tamper-evident against the owner's noted head only |
| G1 | Escalation waits holding slots | Hold and wait on an absent server | Park and release | R8 R11 | Owner's response time |
| G2 | The fetcher is a web reader | Least privilege | Scheme, size, time, address caps | R25 | F5 scope |
| G3 | Not-run floods trust | Fail-safe vs availability | Action line on unverifiable share | R45 | PDFs |
| G4 | Shared weekly percent vs tokens | Noisy neighbour; units | Spend from transcripts; meter readings logged as self-reported | R11 R52 | Whole percent |
| G5 | Checks cut first | Budget order | The admission reservation includes checks | R52 | One pilot |
| G6 | Polling costs full-window calls | Polling cost | Watcher instead | R4 | PC awake |
| G7 | Quote is a paraphrase | Lossy channel | Paraphrase case to checker | R25 | Counted |
| G8 | Coordinator enforces its own hand-over | Self-supervision | Watcher reads its window | R50 | Obedience; only the owner can stop the coordinator |
| G9 | Required fields invite invention | Robustness principle | "Not stated" allowed | R32 | Retries counted |
| G10 | Hooks unproven for helpers | Untested control | Hook canary | R41 | Fallback is the owner's |
| G11 | A seed enters the real store | Contamination | Reserved namespace | R42 | None known |
| G12 | Estimate rests on one mapper | Item identity | Sensitivity range | R56 | Second mapper later |

N1-N16 are the experts' missing risks; G1-G12 come from the completeness analysis.

## 10. What must exist before the pilot field runs

**Scripts** (Node 24 `.mjs` in `tcb/`, no packages, each with fixtures): 25 scripts and the shared
library lib.mjs.
- lib.mjs: the run lock with a verified stale break, unique temp names, ledger append with the tail
  read in the lock, the compare-and-set fence, the single transcript parser.
- admit.mjs: counts live processes, computes the reservation, gate A before reviews, admits
  design-check tasks.
- replace.mjs: the step machine in the task row, the staging cut at the fence, restore of the cut
  prefix, a READY re-check under the lock, the host class, fence and stop before "failed"; it builds
  attempt folders and their settings (absorbs make-profile) and builds `review-in/`.
- stop.mjs.
- watch.mjs: reads, decides and exits; `watcher.lock`; call and tick counters; spawns intake without
  waiting; computes spend; `--alarm` mode.
- status.mjs: `--reconcile` every turn; `--endturn` checks that the watcher and the alarm run and writes
  acked_seq.
- handover.mjs: kills the watcher and the alarm, raises ce.
- harvest.mjs: re-validates against tcb's card schema.
- commit.mjs.
- tms.mjs: labels, including the dismissal bar of R38.
- render.mjs: views, the coverage view (held-out seed recall), the seven measures.
- audit.mjs: reads, writes into protected paths (exit 3), search log, notes, coordinator turns above
  1.5·W*.
- fsck.mjs: absorbs tcb-verify against the commit the owner named.
- guard-hook.mjs.
- snap.mjs and witness.mjs: need F5; without it every card is unverifiable and the pilot only
  measures.
- check-queue.mjs and promote.mjs.
- protocol-freeze.mjs, with the held-out seed split.
- compare.mjs.
- selftest.mjs: includes the canary for hooks and user-level denies.
- seed.mjs: one seed per class per checker call.
- certify.mjs.
- cost.mjs (the existing cost.js) with a `--from-transcripts` mode for unit costs at the pilot's end.
- gate.mjs: `--cut` for the design cut.
- protocol-model.mjs (the existing model.mjs), extended as R57 states, and passing.

Merged, so no longer separate: alarm (a mode of watch), spend (a function in watch over lib's single
transcript parser), make-profile (a step of replace), tcb-verify (part of fsck), recapture (a coverage
view in render), the dismissal bar (a label in tms), redact (a mode of gate, `--cut`), unit-costs (a
mode of cost).

**Files:**
- Schemas for card, pack, review, manifest, ledger line, task row with its step, protocol.
- Briefs for child, reader, checker, fresh reviewer, scorer, STPA, FMEA and mapper.
- Agent files (reader: web tools only; checker: Read only).
- Per-folder role settings and the denylist; the user-level deny rules for the research paths, applied
  by the owner.
- The tcb commit hash in the owner's go message.
- The pilot's approved question list, approach ids and frozen protocol; the frozen analysis plan with
  the predicted total over every arm.
- Cost inputs tagged measured, computed or guessed; the thresholds file with each default marked by its
  mapping, and unset items marked as readings.
- The run root outside every repository; the lean baseline from a control session in an empty folder.
- Before the go: both blind analyses run on the design cut, hazards mapped, a passing gate (with the
  extended model's passing run).

**Moved to later:**
- certainty.mjs (R36): needed before the first synthesis, not for one field.
- plan-tree.mjs (R47 bulk load): runs on measured t_q before wave 1.
- R48(a) budget check in the hook; R48(c) redistribution; R48(d) split with a separator in
  `tree-plan.json`; the synthesis gate on unresolved ranges.
- R49 roll-over and split, and R50 for the research child: only under option (b) of the research
  child's window.
- R21 keyed reuse and STALE-only repair.
- R43 lot sampling of uncited cards.
- R38's seeded refuter.
- Per-question two-route Chapman (R35).
- A third blind lens: the pilot's incident list is the next capture source.
- R51 Smith's order; R52 budget from unit costs (measured in the pilot, applied after).
- The hook's schema check (after the canary shows its inputs).
- A "measures moved" column in §9.
- The D6-10 crossed design (pack B): an F2 option at the cost of one research run.
- S2: owner's option, default off.
- Already later and unchanged: salvage (it must take `--epoch` when built), migrate, fracas, index,
  coupling, stop-check, exclusion re-screen, second-opinion, correct-rates, challenge, cooke, PDF
  extraction (an install, needs the owner's word).

**Deleted, not deferred:** the SPRT; pause detection by tick gaps (its rule is gone); the watcher's
T_watch deadline exit; the stored escrow; intent files for anything but owner messages; R56 as a gate;
the meter's 20 % halt; the "LCF kernel" and "forward integrity" claims.

**Left out on purpose:** backup tasks (double tokens); consensus, two-phase commit, distributed locks
(one coordinator and epochs suffice; blocking stalls on a sleeping session); same-model voting
(correlated); per-sentence information flow (a window is one flow); injection filters (filtering in
band is the root of injection); meta-analysis and GRADE upgrades (no common scale; upgrades would be
self-assigned); debate or Delphi (conformity); a scalability fit (nothing to gain at this size; the B+
parts not borrowed are named in §7); bidding (sessions cannot estimate their own cost); a database
engine (files merge and read by eye); deleting anything mid-run; FMEA risk numbers and fault trees
(false precision); a separate Windows account (the fallback if the hook test fails); any currency.

## 11. What the pilot measures

**Parameters** (by script from transcripts, ledger and files; none has a value yet unless marked):
- Execution: stall and hang counts in calls and ticks (c and h, which replace T_box); poll gaps and
  wakes (Δ, δ); loop flags; peak spend rate and wake latency; peak memory (reserve, N_max); tokens per
  meter percent; W_cc, H_max, Z; whether a stop ends helpers, helper transcripts link; coordinator calls
  and tokens per field; owner interventions per hour; the owner's start latency.
- Storage and integrity: harvest exactness; undeclared reads; lean first-call context; u; the share of
  sources a plain fetch turns into text; quote-found rate, also on cards the summary path confirmed
  (P21); false mismatches; w; whether verdicts are readable from transcripts; out-of-profile calls.
- Assurance and evidence: d_k with lower bounds, false alarms, escape rate, whether J4 was obeyed;
  plants found; route overlap against chance; yield per reader call; held-out seed recall; dismissals
  with a bounding card.
- Shape and completeness: P, g, S0, σ, h_c, o, q_f, w per role; t_q, κ_q; unit costs; slack used;
  serial fraction; estimate error; blind-analysis overlap; fault-injection outcomes; unmapped incidents.
  On record already: P = 79k per session, about 60k per agent, g = 2.8k per call
  (SPLIT-RULE-2026-11.md, TOKEN-BOTTLENECK-2026-11.md).

**Comparison 1 (P18): the tree against one session** (R39, R53; D6-05). Arms: the tree (child T,
pack A, fresh review R1) and one session S1 with the same cap, schemas, checks and ids. S1 runs with no
fan-out until the 300k quality line, then stops. It is not compacted or handed over, and its uncovered
ids are counted. S2 repeats S1 if the owner allows, for spread. Primary, per question: answered by a
confirmed card within its conditions. Secondary, stated in the seven measures (R20): citation failures,
tokens and time, a blinded rubric score, confirmed answers per extra million tokens, the stated
prediction. compare.mjs blinds and shuffles; the scorer guesses the arm (blinding failed above 80 %);
McNemar on discordant questions, conditional on the run. It can show a difference above |S1 − S2|, a
gross failure and real costs; not equality, nor other fields.

**Comparison 2 (F1): same-window review against fresh** (D6-05, D4-08, D8-07). The pilot child runs in
amendment 1's form (one session up to the ceiling), so that R_same really holds the field. R_same in
T's window, R1 fresh from pack A, R2 a second fresh review for spread, kept unconditionally as part of
the frozen plan; one pack hash, one copy of our files with k planted wrong assumptions. Primary: plants
found with the right reason. Secondary: citation failures, use outside conditions, tokens, u with a
checked sample, and D8-07's count of factual sentences in R_same that cite nothing in the frozen pack.
It can show whether R_same's extra sentences carry correct knowledge the pack lost, and a plant gap
above |R1 − R2|; not equivalence. On stand-in inputs cost.mjs priced the same-window form at 2.4 to 4.4
times the tokens. The D6-10 crossed design (a review of pack B from an independent research run) is an
F2 option, off unless the owner allows its cost of about one more research run.

## 12. The owner's decisions

What the classical fields say, then what follows if he says nothing.
- **The go.** Silent: nothing starts.
- **F1, where the review runs.** Only a fresh review from trusted inputs can be labelled clean (Biba);
  the fresh path must run anyway (crash-only); no source compares the two here. Options: (a) amendment
  1, the child that researched reviews in the same session, and a fresh session reviews past the 300k
  ceiling; (b) a fresh review from the pack. Silent: (a), amendment 1. The fresh-from-pack path also
  runs at least once per wave (D4-08, D1-12). The pilot writes both reviews (Comparison 2) and he rules
  after it.
- **F2, the second expert.** Correlated judges add little (Knight and Leveson; Ladha); diversity comes
  from inputs or another model, measured before it is bought. Silent: no second expert until he rules.
  If he wants one, the options are amendment 1's form (a second child researching independently) or
  the mapper's form (a second reviewer of the same pack plus the contrary-evidence reader), and the
  D6-10 crossed design can measure the difference at the cost of one research run.
- **Research child's window.** (a) Amendment 1: one session up to the 300k ceiling, then freeze; the
  ids left over go to an overflow record (R11) and later to a split. Silent default. The 300k figure is the coordinator's, not his. (b)
  Roll-overs at W* (R49, R50) and a fresh review: by cost.js about 2.4 to 4.4 times fewer tokens than
  one unbounded session (stand-in inputs), with a quality loss no formula prices.
- **F3, another provider's model.** The cheapest real diversity for checks and lenses. Silent: none;
  judgment checks are labelled undiversified.
- **F4, cap, pilot allowance, margin.** The admission reservation needs them (O'Neil); the pilot's
  predicted total over every arm (R53) is stated beside them. Silent: nothing admitted.
- **F5, the fetch script, local snapshots, PDFs.** The witness rests on it (reference monitor;
  end-to-end). Silent: every card is unverifiable, no certificate passes, and the pilot only measures.
- **Restart limit.** OTP practice limits restarts; D3-08 allows two. Silent: one, then you decide.
- **Coordinator hand-over.** (a) The drain of R12: from W*_coord every start is blocked, the
  coordinator waits for quiescence and asks you, and you start the successor. Silent default, as now.
  (b) Crash-only: fence every running child as a planned replacement (a supervisor restart restarts its
  subtree, D1-09, D1-12). It saves idle time, but each child pays a hand-over re-read and, under
  amendment 1, loses the field it holds. (c) The hand-over point: by token count W* = 133.2k (default),
  weighted W* = 157.1k, or a band up to the 200k line. By cost.js that is about 12 % more per call
  against about 2.3 times as many hand-overs (stand-in inputs).
- **Keeping the PC awake.** Processes resume on wake, so sleep costs time only; holding a turn open
  costs a full-window call per poll. Silent: sleeps accepted. **Memory reserve, N_max:** load control
  admits what fits (Denning). Silent: two children until memory is measured.
- **Thresholds** (d0 per class; β; plants t of 3; coverage floor; smallest effects of interest; an
  action line per measure). Silent: the default stated in each item's mapping, logged as such
  (d0 = 0.8, β = 0.05); an item with no mapped default (plants t, coverage floor, action lines) is a
  reading in the pilot, not a gate. **Approvals** (question lists, approach ids, protocols, the analysis
  plan, the model's properties, splits, dropped ranges). Silent: no gate can run, so nothing is
  admitted.
- **If the hook test fails:** detective layer only, or a separate Windows account (that fallback stays
  his). Reach of each: per-folder rules sit inside a folder the coordinator's Write can reach; the
  user-level research-path denies (R29) apply in the pilot either way. Silent: nothing runs; rules per
  folder.
- **S2, a second control run** (without it every difference reads "no difference shown") and the
  **hand-over measure** (token count, weighted cost or quality; option (c) above gives the figures).
  Silent: no S2; token count.
- **Later:** field weights for the order of work; a spot check of confirmed items per wave.

## 13. What is not established, and the limits of this design

- **Sources** were checked mostly from memory of standard records: of about 226 checked citations,
  about 26 were looked up by web search (none in D4). The checks' corrections are applied (Chubby,
  MapReduce per task, Yao's ln 2, rlimit, PRISMA-P, Chapman, the knee method, Ladha, Merkle).
- **No source measured a tree of language-model sessions like this one.** Every borrowed guarantee
  rests on assumptions (fail-stop workers, deterministic reruns, independent judges, sandboxed reads)
  that fail here as each section says. No single source backs the progress-kicked watchdog (D3-06),
  the square-root law with state growth (derived here), or the whole designs as composed.
- **Believed, not verified:** hooks fire before every tool call, for helpers too; transcripts carry
  reader results and checker verdicts parseably and link helpers to parents; a stop ends helpers; a
  background script keeps the PC awake; each child session is a separate OS process that a script can
  find and kill by its folder; a process's start time can be read (through PowerShell) to guard against
  PID reuse; a background command's exit starts a turn even when it fires during a turn, during sleep,
  or after ce changed; user-level permission denies bind every session and cannot be bypassed through
  `node`; which settings files apply to a session started in an attempt folder; whether a pre-call hook
  sees an Agent call's schema and the session's transcript path. Each gets a probe in the pilot's fault
  list (R42) and a stated fallback: the owner ends the process, and the tokens are counted as zombie
  spend.
- **Unmeasured:** every parameter except those on record (§11); cost.mjs figures rest on guesses and
  fix the method, not a prediction; the completeness estimate is not valid (§8); the one pilot field is
  chosen, not drawn, so nothing it shows generalises.
- **Size:** 25 small scripts and the shared library lib.mjs, with fixtures, before the pilot; whether
  that fits the owner's time is itself not established.

## 14. Sources, by layer

- **Execution:** Dean and Ghemawat 2004; Armstrong 2003 (restart intensity as in OTP documentation);
  Candea and Fox 2003; Burrows 2006; Gray and Cheriton 1989; Helland 2007, 2012; O'Neil 1986; Lampson
  and Redell 1980; Chandra and Toueg 1996; Denning 1968; Randell 1975; IEC 61508-7; Floyd 1967.
- **Storage:** Mohan et al. 1992; Gray and Reuter 1993; Bernstein and Goodman 1983; Berenson et al.
  1995; Codd 1970; Gupta and Mumick 1995; Buneman, Khanna and Tan 2001; Stonebraker 1986; Mokhov,
  Mitchell and Peyton Jones 2018; Mitchell 2012; Dolstra et al. 2004; Doyle 1979; Merkle 1987.
- **Integrity:** Clark and Wilson 1987; Biba 1977; Anderson 1972; Saltzer and Schroeder 1975; Hardy
  1988; Krohn et al. 2007; Kim and Spafford 1994; Schneier and Kelsey 1999; Blum and Kannan 1995;
  Sassaman et al. 2011; Saltzer, Reed and Clark 1984.
- **Evidence:** Cochrane Handbook; Moher et al. 2015; Rethlefsen et al. 2021; Page et al. 2021;
  Garritty et al. 2021; Guyatt et al. 2008; Chapman 1951; Spoor et al. 1996; Zobel 1998; Altman and
  Bland 1995; Lakens 2017; Ladha 1992; Kuncheva and Whitaker 2003; McNemar 1947; Cronbach et al. 1972.
- **Assurance:** IEEE Std 1012; Mills 1972; DeMillo, Lipton and Sayward 1978; Dodge and Romig 1929;
  Clopper and Pearson 1934; Kelly 1998; Lions et al. 1996; MIL-STD-882E; Knight and Leveson 1986;
  Eckhardt and Lee 1985.
- **Shape and cost:** Bayer and McCreight 1972; Knuth 1973; Lehman and Yao 1981; Harris 1913; Young
  1974; Denning 1968; Amdahl 1967; Smith 1956; Selinger et al. 1979; Wittes and Brittain 1990; Conway
  1968.
- **Completeness:** Leveson 2011; MIL-STD-1629A (cancelled 1998); Cristian 1991; Kohnfelder and Garg
  1999; Alpern and Schneider 1985; Holzmann 1997; Eick et al. 1992; Chao 1987.

## 15. The coordinator's ruling on this draft (2026-11-16)

Version 2 was written by six designers from the experts' mappings, model-checked, attacked by four
refuters and revised on a mapper's ruling (27 edits). The record of all of it is in
`evidence/research-tree/foundations-2026-11-16/`. The coordinator read the result and rules as follows.

1. **The mapper's open points are accepted as it left them.** The run lock stays. A hang is treated as
   a stall. One seed per class goes into a checker call. Thresholds take their mapped defaults and are
   logged as such. The drain is the default hand-over. The user-level deny rules are the owner's to
   apply. Amendment 1 stays until he rules.
2. **Attribution corrected.** The 300,000 ceiling and the form of a second expert in amendment 1 were
   the coordinator's additions. Only its core, "the child that researched also reviews", is the owner's
   word. The status line and §12 now say so.
3. **What the owner has said.** His reply of 2026-11-16 ("okay that's fine") is read as accepting that
   the pilot writes both reviews and that he rules on F1 afterwards. Nothing else in §12 is taken as
   decided.
4. **This draft is blocked by its own R57.** The model check found six flaws with every mechanism
   present. Their fixes are written into R2 and R4 to R10, but the model has not yet been extended with
   those fixes as designs and run again. That run is the first step of the build, before any other
   script.
5. **Build order, if the owner says build.** Stage 0: the probes of the ten harness facts that §13
   lists as believed, and the extended model. Their results can remove whole mechanisms (the hook, the
   user-level denies, the alarm). Stage 1: the execution and storage core (lib, replace, admit, stop,
   watch, status, handover, commit, harvest, fsck). Stage 2: integrity and assurance (snap, witness,
   check-queue, promote, seed, certify, guard-hook, selftest, audit, tms, render). Stage 3: the pilot's
   comparisons (protocol-freeze, compare, cost, gate).
6. **Size.** Twenty-five small scripts stand between this draft and the first field. That is the price
   of fixing the problems with mechanisms that have runners. If it is too much, the honest alternative
   is a pilot on stages 0 and 1 only, with every card labelled unverified.
7. **Four rules name their runner only through another rule.** R17: the pack is frozen by commit.mjs
   (R14). R40: each checking script writes the value, and admit.mjs and gate.mjs count them. R43:
   check-queue.mjs, promote.mjs and certify.mjs. R49: replace.mjs, later. This is the coordinator's reading;
   the build must confirm it, and a rule that turns out to have no runner is deleted.

## 16. The build of the trusted scripts (2026-11-17)

The build ran in the night and day of 2026-11-17 in `tcb-build/` (saved under `research-tree/`). Its
record: one return file per finished stage in `done/`, the first builders' notes in `done/first-run/`,
the lane's logs in `lane/`, and two closing notes. Times are local (UTC+5). Where records disagree, both
are named.

**1. What was built.** An interface contract and 26 specs, attacked by two refuters (48 findings) and
revised before any code. The shared library `tcb/lib.mjs` (88 exports) with 58 schema files. The scripts
of §10 in five units of two groups each. Eleven role profiles, a settings file per role with the
`guard-hook.mjs` hook, the agent files `reader.md` and `checker.md`, and eight briefs (child, reader,
checker, fresh-reviewer, scorer, stpa, fmea, mapper). The protocol model of R57, extended, with a
restartable runner for its full run. The lane and the recorder (point 3).

| Unit | Groups and scripts | Join tests (pass / fail / skip) | Review: findings; mutations caught | Fix: result; tests |
|---|---|---|---|---|
| U1 execution | U1a replace, admit, stop; U1b watch, status, handover | 129/0/7; 95/0/10 | 9 medium; 31 of 40 | 9 fixed plus mutation R4; S4 equivalent; 264/0/16 |
| U2 store and truth | U2a commit, harvest, fsck; U2b tms, promote, certify | 63/0/3; 53/0/2 | 2 high, 8 medium; 27 of 32 in the list | 10 fixed plus 2 survivors pinned; 1 residual open; 131/0/5 |
| U3 witness and guard | U3a snap, witness; U3b guard-hook, selftest | 102/0/4; 41/0/5 | 1 high, 7 medium; 20 of 26 | 7 fixed; F8 needs a ruling; W9 equivalent; 151/0/9 |
| U4 views and assurance | U4a render, audit; U4b seed, check-queue | 46/0/7; 47/0/6 | 1 high, 11 medium; 31 of 40 | 12 of 12 fixed; 106/0/13 |
| U5 pilot plan | U5a protocol-freeze, compare, gate; U5b cost | 70/0/6; 21/0/2 | 14 medium; 21 of 26 | 14 addressed, 2 partial; 98/0/8 |

The units hold 24 scripts. The 25th of §10 is protocol-model.mjs, built as the `model/` folder outside
the units. Six of the 24 (admit, check-queue, handover, replace, seed, stop) did nothing and exited 0
when started through a junction; the closing round fixed them (point 9). Every skip in every count above
is a test marked as needing the app (point 10). The joins changed mostly layout (the contract said
`tcb/scripts/<name>.mjs`; the build is flat, `tcb/<name>.mjs`) and tests. finish-U3b redesigned
selftest against bursts: one case root at a time by default, no copy of the script folder.

| Library stage | Tests (pass / fail / skip) | What it did |
|---|---|---|
| lib-finish | not run (its brief forbade it) | completed the library and schemas |
| lib-join | 172/0/2 | 7 fixes: 2 layout, 2 test, 1 spec, 2 library |
| lib-harden | counts not recorded; 12 named tests 12/0/0 | own-clock start time; no PowerShell on the normal path; a render run 2,292 ms before, 73 ms after |
| lib-review | 177/0/2 | 7 findings (1 high); mutations: see below |
| lib-fix | 188/0/2 | all 7 fixed in whole or part; reverting the 8 fixes fails all 10 targeted tests |

Mutation counts that disagree within one record: lib-review's verdict says 13 of 14 caught, its list
holds 15 with 14 caught; review-U2's verdict says 26 of 30, its list 32 with 27 caught. The high
findings: a failed process query read as a dead lock holder (LR-1); promote reverted by a card's last
line only, and commit's R34 URL check always passed (U2); guard-hook failed open through a junction
(U3); render dropped ledger silences from working time (U4).

The model found six more flaws (point 2) over 165,031,945 states on 22 workers. runner-build made its
full run restartable (`model/run-resumable.mjs`): 77 configurations, 9,154 parts, about 21 days for the
whole matrix, peak about 8,300 MB; a kill and restart gave 0 differences per part. runner-check fixed
three defects (process bursts, a memory reservation too small, memory never sampled) and judged it safe
to start (13 of 13 checks). Not verified: the 8,950 MB reservation of a big part.

**2. The six model-check fixes M1 to M6.** The extended model found six flaws with every mechanism of
the adopted design present (`inputs/model-findings-2.json`). modelfix-U1 wrote the fixes into the
contract and the U1 scripts; its tests passed 245/0/17.

| Fix | The flaw (the model's trace) | The fix | Script | Test that fails without it |
|---|---|---|---|---|
| M1 | Endturn kills the live alarm; the killed command's exit wakes the coordinator, whose endturn kills again: a busy loop | The alarm is re-armed by a token it reads (the hash of `run/acked.json`); no script kills it; a newer alarm still supersedes it | watch.mjs, status.mjs | watch.test "M1 alarm: an endturn during the sleep re-arms ..." (rearms 0 without it) |
| M2 | The first turn, or one woken by the alarm, dies before endturn: no wake source, deadlock with one fault | `status --reconcile` exits 1 alarm-missing when no alarm of this ce is known to live, or the process list is unavailable; the coordinator starts the alarm first | status.mjs | status.test "M2 reconcile asks for the alarm at turn start" |
| M3 | A row left mid step machine, a drained coordinator, or an event after the turn's read: the watcher never exits | Watcher class 17 act-due (non-urgent) on the planner's own predicate, acknowledged like every class | watch.mjs | eight "M3 act due" tests; the mutation summary reports 9 of 11 watch M tests failing, which does not match the 10 non-control tests now in the file |
| M4 | Crash, owner wake, planned hand-over, stop unconfirmed: three sessions run beside N_max = 2 | Admitted, started and bound attempts with no process found take slots (in lib.slotCount) | lib.mjs, admit.mjs | admit.test T6c; slot counting not mutation-checked (it is in lib); the memory reservation of admitted rows is, by T16b (mutation A5) |
| M5 | Two PC sleeps within one model call count two hang ticks | A counted tick more than 2Δ after the previous evaluation leaves the hang count unchanged | watch.mjs | watch.test "M5 pause discount" (exit 21 without it) |
| M6 | A planned hand-over fences an attempt whose current READY is written | replace re-checks under the lock, for a running attempt of the current epoch, for a READY for every reason except first and tainted: exit 5 ready-wins | replace.mjs | replace.test "T5b (M6)": five subtests fail with it off |

The rules change as follows (§15 item 4's six fixes were the first model check's; these are six more).

| Rule | Present sentence (line) | Changed sentence | Because of |
|---|---|---|---|
| R5 | "A tick counts at most once per Δ. No clock reads elapsed wall time." (120-121) | "A tick of the long-running watcher counts at most once per Δ; a `--once` call counts one tick whenever it runs. A counted tick whose wall-clock gap since the watcher's previous evaluation exceeds 2Δ is a paused tick: it leaves h unchanged but still counts as a tick for every other counter; new calls still reset h; a missing, negative or shorter gap counts as usual. No other counter of this rule reads elapsed wall time." | M5 |
| R6 | "Each endturn kills and re-arms the alarm, so it fires only after a long silence. Its pid and ce go in `coord.json`. Endturn writes acked_seq into `coord.json` under the run lock, and exits 1 unless both sources run." (127-129) | "Each endturn that records acked_seq rewrites `run/acked.json`; a live alarm reads that file's hash after each sleep and sleeps again while it has changed, exiting 30 only after a whole period with no change. No script kills a wake source; an alarm exits early only on a newer ce (64) or when a newer alarm has registered in `run/alarm.json` (exit 0, superseded), and that exit is itself a wake. The alarm's pid and ce go in `run/alarm.json`; endturn writes acked_seq into `run/acked.json` under the run lock, and exits 1 unless both sources run (2 proc-unavailable when it cannot tell)." | M1 |
| R6 | "`status.mjs --endturn` makes sure two wake sources that the coordinator itself started are pending" (126-127) | add: "`status.mjs --reconcile` at the start of every turn exits 1 alarm-missing when no alarm of the current ce is known to live (none recorded, another ce, dead, or the process list unavailable); the coordinator then starts the alarm before anything else. The watcher also raises act-due (class 17, not urgent) when the planner's predicate names an act the coordinator can take now, or an event line above acked_seq whose condition has cleared; like every class it wakes only until acknowledged. A turn that dies before it starts the alarm counts as a lost wake in this bound." | M2, M3 |
| R7 | "For a failure reason, replace.mjs first re-checks under the run lock for a READY of the current epoch" (137-138) | "For every reason except first and tainted (planned hand-over, memory parking, cut and drop included), replace.mjs first re-checks under the run lock for a READY of the running attempt's current epoch, and if it finds one it refuses with exit 5 ready-wins, so a READY written before the re-check wins; one written after it can still be fenced (open defect)." | M6 |
| R10 | "fewer than N_max live child processes run, stop-unconfirmed ones included (2 until memory is measured, never above 3)" (155-156) | "fewer than N_max slots are taken (2 until memory is measured, never above 3), where every attempt whose stop is not confirmed takes one slot if it is stop-unconfirmed, a live process matches it, it is the current attempt of an active row at admitted, started or bound or the last attempt of a committed row, or a transcript of it exists; with no process list nothing is admitted. Free memory minus the reserve, minus one peak for each admitted or started session with no process, covers one session's peak." | M4 |

Other sentences of this document that the build contradicts:

| Where | Present text | Corrected text | Evidence |
|---|---|---|---|
| R4 (112-113) | "...and within δ on others." | "...and within δ on others, act-due (class 17) among them." The urgent list also leaves out common-cause and tamper-seen. | watch.mjs |
| R12 (177); script list (630) | "handover.mjs kills the watcher and the alarm and raises ce" | "handover.mjs raises ce; the old watcher and alarm exit 64 on their next check." | handover.mjs; CONTRACT |
| Layout (60) | "coord.json (ce, session, acked_seq, alarm pid)" | "coord.json (ce, session, started_at, tcb_commit), acked.json (acked_seq), alarm.json (alarm pid, ce)" | CONTRACT |
| Script list (626-629) | watch.mjs and status.mjs entries | add "the act-due class (17)" to watch.mjs and "asks for the alarm (exit 1 alarm-missing)" to status `--reconcile` | M2, M3 |
| "Deleted, not deferred" (692) | "pause detection by tick gaps (its rule is gone)" | strike; see R5 | M5 |
| N2 row (584) | "Counters in calls and ticks" | "Counters in calls and ticks; a tick after a gap over 2Δ does not count toward hang" | M5 |
| R57 (527-528) | "It models the adopted designs, not oracles" | "It must model the adopted designs as built, not oracles; as of 2026-11-17 four fixes, reconcile and the --ce fence are still oracles (§16)." | model-fidelity |
| R9 (149-150) | the 2Δ stop check | its ticks still count across a PC sleep (M5's reasoning not applied); "kills processes naming the attempt folder" is contradicted by contract decision 29 | modelfix-U1 note 2 |

The state of the model. With all six fixes the base configuration (2 fields, 2 faults, R = 1) holds all
14 properties; at 3 faults only a bounded run exists after the last fix, with no failure in its explored
states. The final full run was stopped after about 45 s, so nothing exists yet with the current model for
R = 2, 3 fields or 4 faults (an earlier model's interrupted runs held there: evidence only). The fidelity
review reproduced every verdict, and found:

- Four fixes are modelled as oracles acting atomically on true state: arm at start (M2), the READY
  re-check (M6), the pause discount (M5) and, close to one, the actionable watcher (M3). As built, M2 arms
  by a separate tool call, M6 re-checks a READY the child writes without the lock, M5 misses short pauses.
  With those as built: NoDeadlock and AlwaysCanResolve fail with one fault within 2 steps,
  ReadyNotDiscarded within 5 steps in 43 of 43 parts, NoFalseSuspicion within 6 steps. M1 is only half
  modelled (superseded-alarm exits are not modelled); M4 reads true process liveness, with no unknown case.
- Reconcile and the --ce fence are oracles too. The report's state counts belong to an earlier base with
  FIX_ENDTURN_RECHECK on (3,257,396 against 3,659,461); the verdicts are not affected.

**The model's full run** was started at 14:52:47 on 2026-11-17, from `model/`, as `model/RUN-FULL.md`
says and under the coordinator's limits: `node run-resumable.mjs --configs full --workers 3 --mem-mb 1500
--big-mem-mb 6000 --floor-mb 6000`. It covers 77 configurations in 9,154 parts, cheapest first, and is
restarted by the same command (a finished part is never run twice). Progress is in
`model/results/SUMMARY.md`. One minute in it stood at 314 parts complete, none BOUNDED, no failed run.
RUN-FULL.md's estimate, made for 4 workers and 8,000 MB: groups 1 to 5 (everything at 2 fields, and 3
fields with 2 faults) in about 4 hours, groups 1 to 9 in about 2 to 2.5 days, the whole matrix in about
2.5 to 3 weeks, with the last two groups ending mostly BOUNDED. With 3 workers and 6,000 MB it is slower
and more parts end BOUNDED; a BOUNDED part is reported and can be rerun alone at a larger size, it is
never cut down. Its tables for groups 1 to 5 are in point 11. The run
is a process of the session that started it: if that session or the PC stops, the same command picks
it up.

**Changed the same afternoon, on the owner's decision:** the full run was stopped at about 15:25, after
group 1 and five of the nine parts of group 2, and replaced by a run of groups 1 to 5 only, with as many
workers as the machine carries. Its outcome is in point 11.

Open defects, none fixed in any stage record:

- A possible wake loop: when the process list is unavailable, reconcile reports alarm-missing; each turn
  then starts an alarm that supersedes the last, whose exit wakes the coordinator again. Untested.
- No coordinator brief yet carries R6's acts: reconcile first, start the alarm on alarm-missing, act on
  status.json when the watcher exits 17.
- A stale coordinator can start a second session: the session-tool start has no --ce fence.
- READY races the fence; a late transcript leads to a double start; a committed child holds its slot
  until a close only a session performs.
- A healthy slow call is suspected as a hang: NoFalseSuspicion fails in every part within 4 steps, at the
  cost of the one restart R = 1 allows (proposed fix: count transcript growth).
- One dead turn leaves no wake source (proposed fix: a dead-man check outside the tree).
- Weak properties: RestartLimit is vacuous; TwoCoordinatorsAct restates the fence; AtMostOneCommit's
  mechanism is never exercised (A-WX's graph equals DF's); Slots excludes READY-but-alive children and is
  weaker than R10; A-FENCE-CE has an infinite state space; R5's loop rule is never exercised.

R57 reads "A counterexample blocks the change" and "Current verdict: blocked, until the extended model
holds" (534-536). R55 makes gate.mjs pass only when R57 passes, and R10 admits nothing without the gate.
The protocol stays blocked by its own R57 until the model holds with the oracles modelled as built
(point 11 holds only for the idealised design; point 12 says at which sizes it is to be checked).

**3. The lane and the no-burst rule.** Both were added after the second stall; the lane's log starts at
03:11.

- **The lane** (`tools/lane.mjs`). Every command of an agent that starts Node runs through it, one call
  per command. It lets as many commands run at once across all agents as `lane/capacity.txt` says
  (default 1, at most 4); a slot is a folder taken by exclusive create, and a slot whose owner is dead or
  older than 20 minutes is broken. Commands run at below-normal priority with the Node heap capped
  (default 1,024 MB). At its timeout (default 540 s; the briefs say 300 s) it ends the command's own tree
  with `taskkill /T /F`. It logs a flushed line at start, timeout, end, and when a waiter gives up (exit
  75, 900 s by default). The briefs say one command at a time; `capacity.txt` holds 2 since 03:50, and
  the log shows commands overlapping.
- **No bursts** (the briefs' rule). Nothing creates script files or starts processes in bulk: no copy of
  the script folder per test case, at most two child processes alive at once inside a test or a script
  run unless a spec demands it, no real watcher, alarm or other long-running process in a test, no
  PowerShell call where the value can be had without one. Test folders run with `--test-concurrency=1`.
- **Why.** Both stalls began while an agent ran the self-test script over many cases: bursts of
  short-lived processes, the first also with a PowerShell query per script start. The library review
  (LR-3) and the runner check (RC-1) each found such a burst in code and removed it. *Corrected on
  2026-11-17, evening:* the check of the freezes found that what failed was the start of new programs,
  not memory (point 4, last bullets); what blocks the starts is not established. The lane and the
  no-burst rule stay as care for the machine, not as a proven remedy.
- **The recorder** (`tools/recorder.ps1`). Every 2 s it writes free memory, total CPU, the process count
  and the counts of node and powershell processes to `lane/recorder.log`, flushed. Its governor acts when
  free memory is under 2,500 MB, more than 60 node or 40 powershell processes run, or CPU is at 97 % or
  more for 15 samples in a row: it stops node and powershell processes whose command line names
  `tcb-build` and logs a GOVERNOR line. The log holds no GOVERNOR line. The lines from 03:11 to 07:34
  carry fields the present script does not write, so they come from an earlier version; whether that
  version had the same governor is not recorded.

**4. The interruptions of 2026-11-17.**

- **01:42, a PC hard reset.** Running: an agent's self-test over many cases (memory note), and the first
  model-review attempt, whose runner sized its pool at 11 workers of 670 MB (model-fidelity, which names
  these pools as "the loads that came before the stalls", a cause the check of the freezes found wrong
  or partial). No recorder samples exist; the app's log shows a blocked program start from 01:26, and
  the boot was at 01:44. A resume afterwards re-ran finished agents and overwrote 20 revised specs; it was stopped and
  the specs restored from snapshot commit 8e0a694.
- **02:34, a second stall.** The memory note says every process crawled for about 20 minutes until the
  owner restarted the PC; the check of the freezes found instead that new program starts were blocked
  while running programs went on (the app's log, from 02:50; boot at 02:55). Running: the self-test over
  many cases again. No recorder samples exist.
- **Tested after the stalls.** `ps_scaling.mjs` times the library's process-list query run 1, 2, 4 and
  8 at once; `burst_probe.mjs` times writing and reading 25 to 200 new script files against data files.
  The memory note records the model checker, concurrent process queries and bursts of new script files
  as "ruled out by test"; the figures are not recorded, and no test of the model checker is among the
  coordinator's scripts. These tests show only that each load alone, at the sizes tried, did not
  reproduce a stall. (`mem_crash.js` is not a test: it wrote the memory notes.) Not proven: the cause of
  either stall. The antivirus (360 Total Security) was examined by the check of the
  freezes and uninstalled the same day (below).
- **About 05:10 to 05:27, the coordinating session stopped; the PC ran on until it failed on the way
  into sleep at 07:34 to 07:44 (below).** The recorder's samples run
  on through 07:34; in the lines read: 0 to 14 % CPU, at least 18,400 MB free, no GOVERNOR line. The lane
  log: at 05:11:19 the whole U2 suite (six test files, label fix-U2) and at 05:11:58 admit with stop
  (fix-U1-full-admit-stop) started; both timed out at 300 s (05:16:19, 05:16:58) with no end line after;
  a waiter (fix-U3-st-canary) gave up as busy at 05:27:04 after 900 s. The fix-U2 command that ended in
  43 s at 05:10:57 was fsck.test.mjs alone. From 05:12:34 the recorder counts 14 node processes at 0 to
  2 % CPU; fix-U3's record gives the count falling to 13, 12 and 11 at 05:28, 05:35 and 05:56. The memory
  note said the session stopped during a wait with its context about 90 % full; that reading is withdrawn
  (see the correction below). The recorder's log ends at 07:34:27, when Windows began a transition into
  sleep, and resumes at 12:07:46.
- **The three fix stages disagree on the timeouts**, each as its own opinion. fix-U1: run alone, admit
  takes 50 s and stop 51 s; the hang was in stop T2b's PowerShell process reads; "likely ... a system-wide
  WMI/PowerShell stall, not a hanging test". fix-U2 and fix-U3: the processes were blocked, most likely on
  output pipes the stopped session no longer drained (the lane uses inherited stdio); fix-U3 adds that
  the timeouts fired but taskkill did not end them (no end line). Not proven either way. Memory exhaustion and CPU saturation were not observed; no test
  ruled anything out. The token count at the stop is not recorded.
- **13:57, a helper stalled for 22 minutes in the closing round** (coordinator's record). Its long test
  command had been moved to the background by the harness after 180 s without the helper asking for it,
  and the completion notice it waited for did not come; the coordinator saw it in the lane log and
  resumed it. The closing note records the same move twice in that helper. Cause not examined.
  Consequence for the briefs: "never put a command in the background" cannot be kept by a helper alone
  when a lane command runs longer than 180 s.
- **15:43:26, a fourth interruption.** The ladder run of point 11 was in its first tier: 16 workers, the
  processor mostly at 85 to 99 % (mean 89 %). Its summary stops at 15:43:26. The recorder goes on until
  15:45:34 and shows about 19,300 MB free, 1 to 6 % CPU and the run's node processes still alive. The PC
  was hard-reset at 15:45, and restarted at 17:13 after the owner had uninstalled the antivirus. The run
  was picked up at 17:19 and lost no result.
- **Corrected on 2026-11-17, evening, after a check of the freezes** (seven agents, two of them
  refuters; the record is `docs/program/evidence/pc-freezes-2026-11-17/VERDICT.md`, and it holds where
  it and the bullets above differ). Established:
  - It is not a memory shortage. At all four interruptions 11.8 to 19.3 GB was free.
  - What fails is the start of a new program. In three of the four, the first call that never returned
    was a short command (a program start); calls answered inside the app go on for a few seconds;
    programs already running carry on; the app's own main process is stuck in a start (`spawn:git`,
    `spawn:taskkill`), which is its "not responding" window.
  - The app's log (`%LOCALAPPDATA%\Claude\logs\main.log`) shows the same block four times on this
    day, at 01:26, 02:50, 05:12 and 15:43 (the times in the bullets above come from the memory note
    and the recorder), and on 2, 6, 13, 14 and 15 November.
  - So the stop at about 05:12 was a blocked program start; the verdict counts the earlier reading (the
    session's full context) among the causes that were wrong or partial. The stuck start came back at
    05:37:31 as access denied.
  - The restart of 07:44 was Windows failing on the way into sleep (the transition began at 07:34:27;
    bugcheck 0xA0; a crash file was written at 07:44:54), not a reset by the owner.
- **Not established: what causes the block.** The antivirus (360 Total Security) slowed every
  PowerShell start thirteen-fold and was the only third-party security product; the owner uninstalled
  it and restarted the PC at 17:13. Whether it caused the blocks is not proven: several days of the
  usual work are the test, and one recurrence refutes it. Against it: 18 unclean restarts happened in
  the 13 days before it was installed. A second kind of trouble exists around sleep (20 of 52 unclean
  restarts in 56 days carry a sleep flag). Three causes named on this day were wrong
  or partial: the model checker's load, the coordinating session's full context, PowerShell starts
  feeding the antivirus. Interruptions 1 and 2 show the same signature but have no recorder samples
  and cannot be attributed.
- **What this changes above.** The opinions of the three fix stages are superseded as causes. The
  lane's missing end lines at 05:16 fit a blocked start, since its timeout path starts `taskkill`; that
  is an inference, no record shows it.

**5. The rule that follows: hand over while the context is small.**

Measured on the session that finished the build, with the app's own usage tool (so a session of the
desktop app can read its own window; whether sessions of the tree hold that tool is not verified): its
fixed context before any message was about 75,000 tokens (system prompt 13,565; system tools 21,412;
connector tools 13,758; memory files 16,330; skills 9,972). It stood at 179,773 tokens at 12:10 after
reading the hand-over notes, the folder listings and the continuation script, at 217,073 at 13:05, and
passed 250,000 at about 14:10. W*_coord (133.2k) was passed during set-up, before the first wait. It
worked under a 250,000 line set by the session that started it; when it passed that line it wrote its
state into the memory note and went on.

- **R59. The coordinating session hands over early** (pilot, and every coordinating session outside the
  tree, a build's included). In the tree, R12's drain is the hand-over: from W*_coord of R50 (133.2k by
  default, 157.1k weighted; §12 (c) offers a band up to the 200k line as an owner option) the coordinator
  starts nothing and waits only for quiescence and the owner. Outside the tree, a coordinating session
  starts no long wait above W*_coord: it hands over first. The successor starts from files (the status
  file, `coord.json`, the stage records), never from the old context. [In the tree: watch.mjs exits
  class 16 at W*_coord, audit.mjs flags turns above 1.5·W*_coord, handover.mjs raises ce, the owner
  starts the successor. Outside it: the session, through the app's usage tool, or the owner.] Its first
  reason is withdrawn (corrected 2026-11-17, evening): the stop at about 05:12 was a blocked program
  start (point 4); the full-context reading is not supported. What carries the rule is the design's own
  figure (R12, R50) and the measurement above.
- **Consequence.** W*_coord already counts a fixed first-call context (P = 79,000 in `cost-inputs.json`);
  the 75,000 measured here fits inside it and leaves about 58,000 tokens of work before the hand-over.
  This session passed W*_coord during set-up, by reading notes, folder listings and the script into its
  own context. Either that reading goes to a helper (R50: read-once content goes to a helper), or the
  fixed context is cut (a lean folder for the tree, which the owner has asked for); W*_coord changes
  only if P is measured again. The owner decides under §12 (c).

**6. Two defects of the continuation script, found at noon before the last run.**

- **(a) A fix stage counted as done when its unit's review was done.** A restart would have skipped the
  three unfinished fix stages (U1, U2, U3) without a word. Corrected for the units at noon and for the
  library's branch at 14:15. The coordinator records a dry run with stub agents: with every stage done
  nothing starts; with lib:fix missing only lib:fix starts.
- **(b) The last stage asked for the whole suite with four test files at once,** against the no-burst
  rule. Corrected to: one lane command per test file, or a few files in one command when they end within
  300 seconds together; never two commands at once.
- **R60. A restart trusts only a stage's own record** (build practice). A stage is done only when its
  own result is in the run journal; a neighbour's result, a file the stage wrote before it finished, or
  a shared label never stands in for it. Every stage, the integration stage included, runs tests in the
  allowed form of (b). [The stage function of the continuation script (`tcb-build-finish-v2.workflow.js`,
  saved as `research-tree/tools/coordinator/tcb-build-continue.workflow.js.txt`) skips a stage only when
  its own label is in the done list; `tcb_done_sync.js` builds that list from the run journals only.]

**7. Final results.**

- **fix-U1:** U1-F1 to F9 fixed (five by tests only); F4: the watcher appends a halt only for a fail no
  earlier halt line names; F5: stop request no longer confirms an admitted attempt without observing it;
  F6: each intake step has a timeout (`intake_step_timeout_ms`, 30 min default); F8: handover gained a
  seam for its race test. Mutation R4 was not redundant and got a test. Not fixed: S4, an equivalent
  mutant; the main-module guard through a junction (fixed in point 9). Tests 264/0/16; every listed
  mutation fails its tests.
- **fix-U2:** U2-F1 to F10 fixed (F9, F10 by tests only), and two survivors the review had called
  redundant pinned by tests. Not fixed: a helper can still pass an unfetched URL into a harvested card
  (a spec decision; point 9). Tests 131/0/5 (the six files in one command, 128 s).
- **fix-U3:** U3-F1 to F7 fixed: guard-hook decides through a junction; 13 fixture cases for snap,
  witness, guard-hook and selftest; the canary no longer counts any error as a refusal. Not fixed: F8
  (what the mapper is: a ruling), W9 (an equivalent mutant). Tests 151/0/9.
- **The first end-to-end run** (e2e-build): 24 steps, 22 passed (its script counts 246 of 250 checks).
  Four failures: selftest's static check no-fixtures (watch, status, handover, commit, harvest and fsck
  had no case), so admission would refuse every start; harvest exited 1 on a prose Agent result; gate
  required G1..G12 that its spec did not name; `tcb/denylist.txt` was not shipped, so R34's denylist was
  silently off.
- **The last stage** (e2e-fix): 16 fixes, among them 19 new fixture cases with a `git: true` case field
  so fsck can have a good case, harvest skipping prose, the denylist shipped, the one-sided start-time
  rule in status and handover, `{{role}}` rendered as solo, and the flat layout in CONTRACT and 17 specs.
  Library changes: three applied (exit 17 act-due, the flat scripts path, a `urls` field on tool results
  past the 2,000-character cut); one not applied (widening `lib.fence`'s READY re-check); one note.

| Whole suite as e2e-fix ran it, before the closing round (tests / pass / fail / skip) | |
|---|---|
| admit 38/36/0/2; audit 28/24/0/4; certify 17/17/0/0; check-queue 27/24/0/3; commit 35/34/0/1 | compare 27/25/0/2; cost 26/24/0/2; fsck 20/20/0/0; gate 24/22/0/2; guard-hook 19/16/0/3 |
| handover 22/19/0/3; harvest 21/19/0/2; lib 191/189/0/2; promote 24/22/0/2; protocol-freeze 29/27/0/2 | render 33/30/0/3; replace 81/79/0/2; seed 31/28/0/3; selftest 31/29/0/2; snap 32/30/0/2 |
| status 32/30/0/2; stop 39/36/0/3; tms 20/20/0/0; watch 69/65/0/4; witness 78/76/0/2 | Total 994: 941 pass, 0 fail, 53 skipped, all needs-app |

The closing round added `main-guard.test.mjs` (24/24/0/0); the run of all 26 files after it is in
point 9.

Self-test: 104 of 104 cases, every static check passed. End-to-end: 231 of 232 steps; the failing step
checks a document (spec/gate.mjs.md did not name G1..G12), not a script. The stage left ten items
still wrong: six document amendments, made in the closing round (the manifest and hook command still
name the control role), and four questions now in the ruling
table below (fence, `draft_sha256`, unreadable lock, coordinator tools).

**8. Disagreements in the final records.** The coordinator's summary counts five library changes;
e2e-fix lists five entries, of which three are applied changes. The spec-sync note says "Five items
need your ruling" and lists six.

**9. The closing round.**

- **Main-module guard.** Six scripts (admit, check-queue, handover, replace, seed, stop) compared their
  own path with `argv[1]` lexically, so started through a junction they printed nothing and exited 0.
  All six now take guard-hook's rule: `import.meta.main`, else a lexical and then a real-path compare.
  A new test, `main-guard.test.mjs`, runs every one of the 24 scripts through a junction: before the fix
  18 pass and 6 fail, after it 24 of 24. 18 existing files rerun: 549 tests, 516 pass, 0 fail, 33
  skipped, equal to the e2e-fix figures. Not run by that helper: snap, status, stop, tms, watch, witness,
  lib and the self-test. The self-test's tcb_sha will differ from e2e-fix's, as a result, not a defect.
- **Spec sync.** CONTRACT and the specs were brought in line with the reviewed code: G1..G12 in the gate
  spec and CONTRACT 3.19; `git: true` in the selftest spec and CONTRACT 3.22 (pinned only by the
  end-to-end self-test); harvest's candidate rule; `urls` in CONTRACT 4.8; the solo label; render's
  wall-hour throughput, audit's `checker_reads`, the seed sentence, the compare, gate and cost items,
  CONTRACT 3.15, 3.20, 4.4, 4.7, 4.9 and 4.10. M1 to M6 needed no edit. Left open: compare's
  `blind-key-differs` and intakeCandidates' other-mode rule (no test), the extras of 4.8 and 4.10,
  the join-stage spec questions, and a schema note in `tcb/` that still says "not yet in CONTRACT 3.22".
  After the guard fix it added the entry-guard convention to CONTRACT 1.1 and `main-guard.test.mjs` to
  the contract's file lists. The spec drift step now passes (the coordinator's run below).

| Needs the owner's ruling | Options | What each changes |
|---|---|---|
| U3-F8: is the mapper a helper or a design-check task role? | (a) a task role; (b) a helper | (a) drop mapper from the coordinator's agent types and allow rule, amend the guard-hook spec, line 320 and R55; (b) a second profile anchored at the root, breaking one profile per role; the task-role text leaves CONTRACT and specs |
| U2-F2 residual: are harvested cards URL-checked? | (a) yes; (b) no | (a) commit checks them against the helper's own fetch and search results (`urls` makes it possible); (b) the witness (R25) stays the backstop, and the spec says a helper can pass an unfetched URL |
| U5-PF-1: which file is the draft whose hash the owner line records? | (a) a fixed path per subject; (b) `status owner --file` | either way CONTRACT 3.7 gains the field, the status spec describes it, and the owner decides whether protocol-freeze then refuses lines without it |
| LR-4: should status report an unreadable lock? | (a) a lock-unreadable anomaly; (b) none | (a) status.mjs, its spec and schema; (b) the library breaks such a lock after about 30 s |
| Coordinator session tools | name the host's tool prefixes | until then guard-hook refuses them (tool-not-allowed); changes the coordinator profile and possibly its settings |
| M6, the library half: should `lib.fence` re-check READY for every reason? | (a) widen; (b) keep | (a) lib.mjs, spec/lib T56, CONTRACT 4.6; (b) the documents are already true, as replace makes the wider check |

**The coordinator's own run after the closing round** (ended 14:52; `tools/coordinator/tcb_verify_all.sh`:
one lane command per test file, one after another, then the end-to-end run). 26 test files, every one
exit 0: 1,018 tests, 965 pass, 0 fail, 53 skipped, all of them tests that need the app. That is the last
stage's 994 plus the 24 of `main-guard.test.mjs`; every file's numbers equal the last stage's. The
end-to-end run: 232 of 232 steps, the spec drift step and the self-test step (the real self-test, every
script on its good and bad fixtures) among them. The self-test was not run again on its own. The result
file is `done/verify-2026-11-17.txt`.

**10. What still needs the app.** These depend on the real desktop app and real sessions and are not
verified by the build. Each is a skipped test or a builder's note; the last stage's list adds nothing
outside this table.

| Script | Needs the app |
|---|---|
| lib | the harness names project folders by projectDirName's rule (T82); a session's command line names its folder or id (T92; the probe found `--resume=<id>` but no cwd); helper result fields |
| replace | rendered settings and agent files bind a session in the attempt folder; a real transcript's cwd equals the bound folder; the host class across a shutdown with Fast Startup on |
| admit | the process list finds a real session's processes; `peak_mb` = 1,200 is a guess |
| stop | the coordinator's stop ends a real turn and its helpers; real orphans show in survivors; transcript flush within `stop_verify_deltas` ticks |
| watch | a background command's exit reaches the coordinator, also in sleep and after a ce change; one sleep of Δ is one tick across suspend; real transcripts match the parser; a real window; a detached intake survives the watcher |
| status | a real transcript appears under projectDirName soon after start; the watcher's and alarm's exits reach the coordinator; the usage meter |
| handover | the old coordinator woken late is refused (exit 64); the owner starts the successor; the old watcher and alarm exit 64 |
| commit, harvest | real reader URLs and structured results in the believed transcript shape; helpers under `<session>/subagents/`; the harness's schema retry |
| fsck | sessions obey the files fsck guards; git honours the hook and fsmonitor overrides under the owner's global config |
| promote, certify | a real checker's verdict appears as a structured result; it could only Read its batch; audit's clean label reflects real reads |
| snap, witness | real pages, PDFs, paywalls and challenge pages; real DNS, IPv6 and TLS; `allow_loopback` false in a real run; the share of paraphrased quotes (G7) |
| guard-hook | the harness runs the hook before every call, helpers included, and honours exit 2 (a timeout or failed start lets the call through); user-level denies bind; a session obeys its folder's settings only; `Bash(node tcb/*)` matches as meant |
| selftest | the canary reads a real session's refusals; refusals appear as error results with the hook's text (no permission pattern ships, so a permission refusal stays not_run) |
| render, audit | real token fields; quiet gaps tell sleep from idle; the owner page on the owner's screen; the lean first-call baseline; what the coordinator sees of a turn end; real junctions |
| seed, check-queue | real checker detection per class and J4; verdict extraction and retries; seeds as hard as real faults; a checker confined to its batch; real witness windows; detection against batch size |
| protocol-freeze, compare, gate | the owner line quotes the owner's words; a child cannot read `plan/protocols/` or `sealed/`; a real scorer's result; blind sessions read only the cut; the model result binds to a real run |
| cost | real transcripts and helper meta files; the hand-over parameters; tokens per meter percent |
| briefs | readers and checkers obey their briefs against injected text; sessions keep the `TURN-END` last line; whether a session can read the role in its manifest or hook command |

Harness facts still only believed: agent files restrict a helper's tools; hooks and permission rules
are enforced; a background script alone keeps the PC awake; something visible names a session's folder;
a long foreground command stays in the foreground (point 4, 13:57).

**11. The model run of groups 1 to 5 (2026-11-17, afternoon and evening).**

- **The decision.** The owner decided to end the run after group 5 and asked for every core to be used.
  The model changes next (four fixes are to be modelled as built, point 2), and the larger groups would
  have to be run again after that. Groups 6 to 11 of `model/RUN-FULL.md` were not run.
- **How it was run.** The runner unchanged, as a ladder of memory sizes (`model/RUN-LADDER.md`,
  `model/ladder2.sh`): 500 MB with up to 16 workers, then the parts that did not fit again at 1,150 MB
  (9 workers by free memory), at 2,600 MB (4) and at 6,000 MB (2). A part ends complete at the size
  where it fitted, or BOUNDED at 6,000 MB. None is cut down or skipped; the attempts at the smaller sizes
  are kept in `model/results-ladder/`. Group 2 (A-FENCE-CE) did not go through the ladder: it ran at
  1,500 MB and then at 6,000 MB, five parts in the full run and four in the last tier; the full run's log
  (`results/run-full.out`) holds its attempts that are not under `results-ladder/`.
- **Time.** The ladder ran from 15:29 to 15:43 and, after the interruption of point 4, from 17:19 to
  18:49: about 104 minutes for groups 3 to 5 and four parts of group 2. The other five parts of group 2
  had taken about 29 minutes of the full run, and group 1 four minutes, at three workers. In all about
  2 h 15 min, against RUN-FULL.md's estimate of about 4 hours for groups 1 to 5 at four workers.
- **Sizes.** Of 5,163 parts, 1,118 were complete from the first run (at 1,500 MB) and 3,914 fitted in
  500 MB; 92 needed 1,150 MB (two more ran there without a try at 500 MB, in the first ladder script, at
  peaks of 345 and 359 MB), 26 needed 2,600 MB and 2 needed 6,000 MB (the larger of the two: 28.1 million
  states, 3,115 MB counted by the checker). Nine stayed BOUNDED at 6,000 MB, at 45 to 47 million states
  each: the nine parts of A-FENCE-CE.
- **Totals.** 59 configurations, 5,163 parts: 5,154 complete, 9 BOUNDED, none failed; 3.43 billion states, 53,447 cpu-seconds.

The adopted design (D, before the six fixes of point 2) and the design with them (DF). Every row is complete.

| Size | D: states | D: properties that fail (shortest trace, steps) | DF: states | DF: fails |
|---|---|---|---|---|
| 2 fields, 2 faults, R = 1 | 4.5 M | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(6), EventuallyResolves(12) | 3.7 M | none |
| 2 fields, 2 faults, R = 2 | 4.6 M | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(6), EventuallyResolves(12) | 3.7 M | none |
| 2 fields, 3 faults, R = 1 | 79.6 M | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(6), EventuallyResolves(12) | 57.7 M | none |
| 2 fields, 3 faults, R = 2 | 83.0 M | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(6), EventuallyResolves(12) | 59.7 M | none |
| 3 fields, 2 faults, R = 1 | 29.4 M | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(7), EventuallyResolves(12) | 22.9 M | none |
| 3 fields, 2 faults, R = 2 | 29.7 M | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(7), EventuallyResolves(12) | 23.0 M | none |
| 2 fields, 4 faults, at most one of each kind, R = 1 | 372.7 M | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(8), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(6), EventuallyResolves(12) | 266.7 M | none |
| 2 fields, 4 faults, at most one of each kind, R = 2 | 391.5 M | Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(8), NoDeadlock(2), AlwaysCanResolve(2), NoBusyLoop(6), EventuallyResolves(12) | 278.5 M | none |

Two more rows at 2 fields and 2 faults, both complete. D2-K2-R1-NOKILLWAKE (the adopted design under the
reading that a killed background command does not wake its session): fails Slots(6), ReadyNotDiscarded(6), NoFalseSuspicion(6), NoDeadlock(2), AlwaysCanResolve(2), EventuallyResolves(12).
DFPLUS-RECHECK (the design with the fixes and one more, a re-check at endturn): fails none, so that extra
fix is not shown to be needed.

The design with the fixes with one safeguard taken out, at 2 and at 3 faults (2 fields, R = 1). Every row is
complete at both sizes.

| Taken out | What it is | With 2 faults: fails | With 3 faults: fails |
|---|---|---|---|
| A-ACK | endturn writes acked_seq = ledger head at endturn | AlwaysCanResolve(8), EventuallyResolves(10) | AlwaysCanResolve(8), EventuallyResolves(10) |
| A-ADMIT-LIVE | admission counts table rows, not live processes | Slots(6) | Slots(6) |
| A-ALARM | no alarm (the watcher is the only wake source) | NoDeadlock(2), AlwaysCanResolve(2) | NoDeadlock(2), AlwaysCanResolve(2) |
| A-CUT | restore reads the whole staging (no cut at the fence) | NoStaleAccepted(10) | NoStaleAccepted(10) |
| A-DRAIN | no drain: failure restarts go on while draining, and the hand-over waits only until the table shows nothing running (zombies ignored) | nothing | nothing |
| A-FENCE-EPOCH | commit.mjs does not compare epochs; the coordinator commits the READY a note names | NoStaleAccepted(8), AlwaysCanResolve(13), EventuallyResolves(18) | NoStaleAccepted(8), AlwaysCanResolve(11), EventuallyResolves(12) |
| A-PROGRESS | suspicion by liveness, not by progress V | EventuallyResolves(9) | EventuallyResolves(9) |
| A-READY | replace does not re-check for a READY of the current epoch | ReadyNotDiscarded(6) | ReadyNotDiscarded(6) |
| A-RECONCILE | no status --reconcile at turn start | Slots(3), OneSessionPerAttempt(3) | Slots(3), OneSessionPerAttempt(3), AlwaysCanResolve(8), EventuallyResolves(15) |
| A-RESTART-LIMIT | replace.mjs never takes the limit path (restarts are not counted against R) | RestartLimit(16) | RestartLimit(15) |
| A-STOP-LIMIT | limit path exits before the fence and the stop | FailedTaskStopped(16) | FailedTaskStopped(15), AlwaysCanResolve(14), EventuallyResolves(21) |
| A-WATCHER-LOCK | no watcher.lock; endturn starts a watcher when none of its ce has a fresh tick | SingleWatcher(6), NoFalseSuspicion(11) | SingleWatcher(6), NoFalseSuspicion(11) |
| A-WX | COMMIT written without exclusive create | nothing | nothing |
| A-WX+RECONCILE | COMMIT without exclusive create and no reconcile | AtMostOneCommit(6), Slots(3), OneSessionPerAttempt(3) | AtMostOneCommit(6), Slots(3), OneSessionPerAttempt(3), AlwaysCanResolve(8), EventuallyResolves(15) |
| X-ADMIT-RESERVE | the fix FIX_ADMIT_RESERVE | Slots(6) | Slots(6) |
| X-ARM-AT-START | the fix FIX_ARM_AT_START | NoDeadlock(2), AlwaysCanResolve(2) | NoDeadlock(2), AlwaysCanResolve(2) |
| X-ARM-BY-WRITE | the fix FIX_ARM_BY_WRITE | NoBusyLoop(5) | NoBusyLoop(5) |
| X-PAUSE-DISCOUNT | the fix FIX_PAUSE_DISCOUNT | NoFalseSuspicion(6) | NoFalseSuspicion(6) |
| X-READY-ALL | the fix FIX_READY_ALL | ReadyNotDiscarded(6) | ReadyNotDiscarded(6) |
| X-WATCHER-ACTIONABLE | the fix FIX_WATCHER_ACTIONABLE | AlwaysCanResolve(11), EventuallyResolves(13) | AlwaysCanResolve(10), EventuallyResolves(12) |

What the run shows, and what it does not:

- **With the six fixes the model of the idealised design holds all 14 properties at every size that was
  run**: 2 fields with 2, 3 and 4 faults (4 faults: at most one of each kind) and 3 fields with 2 faults,
  each with R = 1 and R = 2. Idealised means that four of the fixes, reconcile and the --ce fence are
  oracles in the model and that several of the 14 properties are weak (point 2). New against point 2: R = 2, three
  faults complete instead of bounded, four faults, and 3 fields.
- **Without them the adopted design fails the same seven properties at every size.**
- **Each of the six fixes is needed in the model**: every X- row fails at 2 and at 3 faults.
- **2 of the 20 rows fail nothing at either size: A-DRAIN and A-WX.** The model does not show these safeguards to
  be needed. For A-WX the fidelity review gave the reason: the mechanism behind AtMostOneCommit is never
  exercised, because the model's reconcile has a branch the contract lacks (it marks a row committed
  from the COMMIT record). Without that branch A-WX fails AtMostOneCommit in 6 steps (the review's
  RV-WX-ONLY), and with reconcile taken out as well (A-WX+RECONCILE) it fails in this run. This is a
  statement about the model, not a finding that the safeguards can go.
- **A-FENCE-CE** (no --ce check, 1 fault) fails Slots(12), TwoCoordinatorsAct(2), OneSessionPerAttempt(12); 11 properties are
  undecided, because all nine parts stopped at 6,000 MB after about 46 million states each. The fidelity
  review says its state space has no end, so a larger size would not finish it.
- **Not shown.** Point 2 stands: four of the fixes, reconcile and the --ce fence are oracles in this
  model, and with them as built the design with the fixes fails. So this run tests the idealised design
  and R57 stays blocked. Not run: 3 fields with 3 or 4 faults, two faults of a kind,
  and A-FENCE-CE with 2 and 3 faults.
- **A correction of an earlier record.** The message of commit 164df64 says the design without the fixes
  fails five properties. It fails seven.

The results are in `research-tree/model/results/` (one file per part, with the shortest trace of every
failing property; `SUMMARY.md`; `DIGEST.md`) and `research-tree/model/results-ladder/`.

**12. The owner's ruling on testing (2026-11-17, about 17:50).**

This is the owner's ruling, not a finding of the build. The coordinating session passed it on. The owner:
"we also want to avoid useless extensive testing that wastes a shit ton of our time". The coordinating
session then listed four cuts for the tree work, and he answered: "Yes, cut them". The four cuts, as he
approved them:

1. Model checking of the corrected design: only the sizes where the fixes act (hours), not the whole
   matrix (weeks).
2. Attack rounds on the fixes: one round per fix; another only for a finding that would break it.
3. App checks before the pilot: only the three that could stop the pilot (the guard hook firing for
   helpers, a stop ending a session with its helpers, a background command's exit waking the
   coordinator); the rest only if the pilot shows a need.
4. Full test-suite runs: once at the end of a change, not at every stage.

The rule behind them, in the coordinating session's words: a test runs only if its result can change what
we do next.

What it changes:

- **R57.** Its "full run" now means the sizes where the fixes act, not the 77 configurations of
  `model/RUN-FULL.md`. The run of groups 1 to 5 (point 11) stays as it is; groups 6 to 11 are not run. A
  cut-off part is rerun at a larger size only if it hides a property of the design with the fixes. The
  nine cut-off parts of point 11 belong to A-FENCE-CE, a variant with a safeguard taken out, so none is
  rerun.
- **Before the pilot** (section 10, and point 10 of this section). The checks that need the real app
  shrink to the three named in cut 3. Every other row of point 10 is marked "only if the pilot shows a
  need". The ruling is about tests: it does not change the scripts and files that section 10 lists.
- **Reviews and suites.** One attack round per fix, and the full suite once at the end of a change.

The six questions of point 9 are not touched by this ruling and are still open.
