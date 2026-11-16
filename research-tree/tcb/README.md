# tcb: the trusted base of the research tree

Small Node scripts (Node 24, ES modules, no packages, Windows 11) that do what a language-model session cannot be trusted to do: keep the task table, fence stale attempts, commit outputs atomically, watch progress, check that a quoted passage and number are in a stored copy of a source, compute labels and views, and measure the checks. The design is `RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` (rules R1 to R58). The interface of every file and script is the build's interface contract (CONTRACT.md); where the two differ, the contract wins.

## Running a script
Every script is run from the pinned checkout in the run root, never from an attempt folder (it refuses with exit 3):

`node tcb/scripts/<name>.mjs [<mode>] --root <run root> [--ce <n>] [--task <id> --epoch <e>] [--dry-run] [flags]`

- stdout is one JSON line `{ok, script, mode, exit, code, dry_run, result, reasons, ledger_seq}`; messages for people go to stderr.
- `--ce` is required by every script that writes; a stale coordinator epoch exits 64 and writes nothing. `--task` and `--epoch` name one attempt; a stale epoch exits 65.
- `--dry-run` decides and prints the result and writes nothing.
- Exit codes: 0 ok, 1 fail, 2 not-run, 3 tamper (all work stops), 5 ready-wins, 6 deferred (retry the same call on a later turn), 10 to 16 and 20 to 27 the watcher's wake classes, 30 alarm, 64 stale ce, 65 stale epoch, 66 bad command line, 67 table corrupt, 70 internal, 75 lock busy.
- Scripts that can run longer than a minute (the watcher in every mode, the selftest run, a fetch of every new source, the cost model's read of transcripts) are started by the coordinator as background commands.
- No script starts, messages or stops a session, and none kills a process it did not start. The coordinator does those with its own tools; the scripts record and check.
- Fast Startup must be off on the PC. With it on, a "shutdown" keeps the boot identifier, so a failure after it is not recognised as a host failure and is charged to the restart limit.

## The scripts, one line each
- `lib.mjs`: the shared library: canonical JSON and hashes, the run lock, the ledger, the task table and its compare-and-set fence, the schema validator, the transcript parser, process information.
- `replace.mjs`: the one start and restart path of a task: fence, build the attempt folder, settings, manifest, brief, checkpoint and todo, bind the session.
- `admit.mjs`: decides whether a task may start now (dependencies, protocol hash, gate, selftest, fsck, slots, memory, reservation).
- `stop.mjs`: records a stop request, verifies the session and its helpers stopped growing, and reports processes that name the attempt, never killing them.
- `watch.mjs`: the watcher: ticks, spend, stall, hang and loop counters, memory, events; wakes the coordinator by exiting; also the alarm and the intake runner.
- `status.mjs`: builds the status file, reconciles started steps, checks the end of a turn, records the owner's words and meter readings.
- `handover.mjs`: creates the first coordinator epoch, raises it after the drain and binds the successor.
- `commit.mjs`: the acceptor: validates a task's staging files, stores objects, flags scope problems, writes commit records.
- `harvest.mjs`: copies readers' schema-checked results from their transcripts, re-validated against the card schema.
- `fsck.mjs`: checks the store, the commit records, the ledger chain, foreign keys, status writers, the trusted base against the owner's commit and every attempt's settings folder.
- `tms.mjs`: computes labels for cards, sentences, verdicts, dismissals and certificates, and the repair list.
- `promote.mjs`: the only writer of card status: witness results, checker verdicts read from the checker's own transcript, qualification, reverts.
- `certify.mjs`: writes the certificate of a review (reads against manifest, cited cards confirmed, plants found).
- `snap.mjs`: fetches a source with plain Node (caps, no cookies, no private addresses) and stores its bytes and text by hash.
- `witness.mjs`: finds the exact quote and the number in the stored text and binds the result to the card and snapshot hashes.
- `guard-hook.mjs`: the pre-tool hook: role paths, no writes to settings folders, no shell for children, witnessed fetches; denies on its own error; owns the role profiles.
- `selftest.mjs`: runs every script on its good and bad fixtures; the canary for hooks and user-level denies.
- `render.mjs`: builds every page and view: pack, review, synthesis, owner page, coverage, the seven measures, residual readings.
- `audit.mjs`: read audit, protected-path writes, search log, notes, first-call context, coordinator turns above 1.5 times W*; owns the denylist.
- `seed.mjs`: makes the seeded faults for scripts and for the checker, plants wrong assumptions in copies of our files, scores and qualifies the checker.
- `check-queue.mjs`: builds a checker batch from typed cards, snapshot windows and sentences, with seeds at random positions.
- `protocol-freeze.mjs`: validates, checks approval and key ownership, freezes and hashes field protocols and the analysis plan; splits the seed list into brief and held-out halves.
- `compare.mjs`: blinds and shuffles the arms' outputs for the scorer; computes the pilot's two comparisons under the frozen plan.
- `gate.mjs`: writes the design cut for the blind analyses; decides the completeness gate over matrix, hazards, protocol model and action lines.
- `cost.mjs`: the cost model (hand-over window, thrash bound, fan-out, bulk load, concurrency); predicts the pilot's tokens over every arm; turns the pilot's transcripts into unit costs.
- `protocol-model.mjs`: the model-checked protocol model, built apart from the scripts above; the gate reads its result.

## The other files
- `tcb/schemas/`: one JSON schema per format. `tcb/profiles/` and `tcb/settings/`: role tool and path rules and the settings templates. `tcb/agents/`: the helper agent files. `tcb/denylist.txt`: project terms a research session must not search for.
- `tcb/briefs/`: the whole instruction for each role: child, reader, checker, fresh-reviewer, scorer, stpa, fmea, mapper. A brief states the task, the inputs, the output form and the rules; it names no model and no hoped-for result. The placeholders are `{{task}}`, `{{epoch}}`, `{{field}}`, `{{folder}}`, `{{role}}`, `{{todo_json}}`, `{{checkpoint_json}}` and `{{must_read_json}}`.
- `tcb/thresholds.json`: every threshold with its default and where the default comes from; a null value or a false gate is a reading, never a gate.
- `tcb/cost-inputs.json`: the cost model's tagged inputs (M measured, E computed, G guess, I illustrative).
- `tcb/fixtures/<script>/<case>/`: the good and bad cases each script is run on. `tcb/test/`: the tests.

## How to run the tests
Each test makes its own temporary run root, removes it afterwards, touches no network and no process it did not start, and writes nothing outside the build folder.
- One script: `node --test tcb/test/<script>.test.mjs` (for example `node --test tcb/test/gate.test.mjs`).
- The library: `node --test tcb/test/lib.test.mjs`. The static files (briefs, thresholds, cost inputs, this README): `node --test tcb/test/static.test.mjs`.
- Everything: `node --test tcb/test/`. To run four files at a time: `node --test --test-concurrency=4 tcb/test/`.
- A test that needs the real app (hooks firing, a real session's command line, the usage meter, real web pages) is written and skipped with `needs-app: <reason>`; it is never faked.
