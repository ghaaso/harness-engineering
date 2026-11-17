I worked through all 8 items, edited only `ROOT/CONTRACT.md` and files under `ROOT/spec/`, and ran nothing. Five items need your ruling (part 2); the "spec drift" step should now pass (part 4).

ROOT = `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/tcb-build`

**1. Amendments made** (file, section: change; code; pinning test)

Item 1, gap rows in the gate:
- `spec/gate.mjs.md`, Rules: `P1`..`P21` and `G1`..`G12` are required in `p_ids`, P ids listed first; other ids are allowed. Code: `gate.mjs` lines 349-351. Test: gate T8 (G5 and G12 left out).
- `spec/gate.mjs.md`, T8 and T5: the G case added; the fixture now covers "all P and G ids". Same code and test.
- `CONTRACT` 3.19: it never actually named P1..P21. I added which ids `p_ids_missing` lists (P1..P21 and G1..G12, R55). Same code and test.

Item 2, the fixture-case field `git: true`:
- `spec/selftest.mjs.md`, Fixture case format and step 4: `git?: bool`, what the git setup does, `bad-case` when it is not a boolean, and a failure gives `why: "harness: git-case"`. Code: `selftest.mjs` lines 209, 230, 652, 660-684.
- `CONTRACT` 3.22 [fixture-case]: one sentence on `git: true`.
- Pinning is weak. No `tcb/test` file covers it. Only the e2e "selftest run" step pins it: 104 of 104 cases pass, including `fsck/good-empty-run`, which can only exit 0 under git.

Item 3, harvest:
- `spec/harvest.mjs.md`, Candidates: a prose result is no candidate; a result that starts with `{` or `[` and does not parse counts as a candidate and as unparseable. Code: `harvest.mjs` lines 170-177.
- `spec/harvest.mjs.md`, T6: reworded to match. Test: harvest T6 (candidates 2, unparseable 2).

Item 4, tool-result `urls`:
- `CONTRACT` 4.8: the non-enumerable `urls` (full result text, at most 500, trailing `.,;:!?` dropped, URLs over 2,048 characters skipped). Code: `lib.mjs` lines 2456-2473 and 2616. Test: lib T76b.
- `spec/lib.md`: T76b added.
- `spec/commit.mjs.md`, step 5 and T6b: commit's URL evidence uses `urls`. Code: `commit.mjs` line 230. Test: commit T6b.

Item 5, the control arm's label:
- `spec/replace.mjs.md`, start step 9 and new T13b: `{{role}}` renders `control` as `solo`. What the code does not do is stated too: `in/manifest.json` keeps `role: control`, and the hook command in the rendered settings keeps `--role control`. Code: `replace.mjs` lines 30 and 749. Test: replace T13b.
- `spec/briefs.md`, Placeholders: the same label rule, and that no brief names `control`.

Item 6, the earlier requests:
- `spec/render.mjs.md`, step 6, T15 and new T15b: throughput is per wall hour. Code: `render.mjs` line 648. Tests: render T15, T15b.
- `spec/audit.mjs.md`, task step 2: one batch per transcript. Code: `audit.mjs` lines 241-262. Test: audit T3b.
- `spec/audit.mjs.md`, coordinator form, exit codes and T14b: `checker_reads`. Code: `audit.mjs` lines 476-532. Test: audit T14b.
- `spec/seed.mjs.md`: the synthetic sentence now has a drawn sid (s1..s12) and one of six phrasings; T7b added. Code: `seed.mjs` lines 123-144. Test: seed T7b.
- `spec/compare.mjs.md`:
  - random blind seed kept only in the sealed key (T3; code lines 685-690);
  - `arms-not-committed`, exit 2 (T23; line 681);
  - exit 75 when the ledger moved under the lock (T24; lines 728-730, 783, 811);
  - tokens null for a task with no row or no transcript, with a folder fallback (T11b; lines 300-325);
  - `scores-invalid` when an item is left out or a guess names no arm (T13; lines 453-468).
- `spec/gate.mjs.md`, append-only rule and T10: name, statement and severity are fixed under an id. Code: line 338. Test: gate T10.
- `spec/gate.mjs.md`, T12: the audit binds to the committed epoch. Test: gate T12.
- `spec/cost.mjs.md`:
  - default inputs come only from beside the script (T11c; line 1061);
  - `card-unreadable` and `commit-record-unreadable` go into `missing` and make the run untrusted (T11b; lines 722-729, 844, 867);
  - T10b added.
- `CONTRACT` 3.15 and `spec/promote.mjs.md` step 2: a revert line's status is `witnessed` only when the card's own confirmation relies on the class; otherwise the status is kept. Tests: promote T12c, T12d.
- `CONTRACT` 3.20: row added for `intake_step_timeout_ms` (1800000, guess). Code: `thresholds.json` line 54, `watch.mjs` lines 810-819. Test: watch T19 timeout.
- `spec/lib.md` T2: `con-research` is accepted, and a relative `--root` gives 66. Test: lib T2.
- `spec/lib.md` T46: 2 processes of 200 lines. Test: lib T46.
- `CONTRACT` 4.4: `proc.alive` is asked about the holder only, at least once and at most once per try. The library's once-per-holder cache is stated as how it works today. T29 pins only the "at least once, at most once per try" part.
- `CONTRACT` 4.7: for array keywords the error path is the array itself. Test: lib validator table (uniqueItems row).
- `CONTRACT` 4.10, `intakeCandidates`: a batch with no `batch.json` is ignored; a sealed key with no queue folder still counts. Tests: lib T96e, check-queue T14.
- `CONTRACT` 4.10, `variant`: "any other stored card whose last status is witnessed or confirmed". Test: lib T96b.

Extra fixes found on the way (code and tests already existed):
- `CONTRACT` 4.4, the ledger-line table and `spec/lib.md` T36j/T36k: an unreadable lock is broken after an unchanged 50-retry budget, and the `lock-break` line gets `unreadable: {bytes, sha256}`. Code: `lib.mjs` lines 1335-1338. Tests: lib T36j, T36k.
- `CONTRACT` 4.9 and `spec/lib.md` T36l: `alive` uses a one-sided start-time rule. Code: `lib.mjs` lines 1202-1214 and 2801. Test: lib T36l.
- `spec/replace.mjs.md`, plan step and T2: a `plan-differs` refusal appends one refusal incident to the ledger. Test: replace T2 `plan-differs` subtest.

Item 7 (M1 to M6): no edit needed. The watch, status, admit, replace and handover specs and CONTRACT 1.2, 1.4, 3.6, 3.9, 3.10, 4.6 and decision 40 already say what the code does:
- M1: the alarm is re-armed by the `acked.json` token.
- M2: `status --reconcile` exits 1 `alarm-missing` when no alarm lives.
- M3: the watcher's exit class 17 `act-due`; `EXIT['act-due'] = 17` is in `lib.mjs` line 38.
- M4: the admit spec names it and has T6c.
- M5: the pause discount.
- M6: the READY re-check for every reason except first and tainted.

Item 8: no `tcb/scripts/` text is left. The only match is `spec/guard-hook.mjs.md` line 133, where the old layout is listed on purpose as refused.

**2. Needs a ruling** (not edited)

- **U3-F8. What is the mapper: a helper the coordinator starts, or a design-check task role?**
  - (a) A task role. Drop `mapper` from the coordinator's `agent_types` and its Agent allow rule in `profiles/coordinator.json` and `settings/coordinator.json`. Amend `spec/guard-hook.mjs.md` line 80 and the design's line 320 and R55. Add a T6 case. This fits the CONTRACT role list, the replace spec (line 97, T20b), the gate spec, `spec/briefs.md` and `briefs/mapper.md`.
  - (b) A helper. Every call it makes is denied today, because `{attempt}` never renders in the coordinator's folder. It needs a helper profile anchored at `{root}` under a second profile name, which breaks one profile per role. The task-role text would have to be removed from the CONTRACT and the specs.
- **U2-F2-residual. Should harvested cards be URL-checked?**
  - (a) Yes: check each against the fetch and search results in the helper's own transcript. Changes `commit.mjs` and `spec/commit.mjs.md` step 5. The `urls` field now makes this possible.
  - (b) No: keep the witness (R25) as the backstop, and say plainly in the spec that a helper can pass on an unfetched URL.
- **U5-PF-1. Which file is the draft whose hash `status owner approve` records?** `protocol-freeze` already checks `draft_sha256` when a line carries it (T8b), but nothing writes it and no document mentions it.
  - (a) A fixed path per subject: `plan/protocols/<field>.json` for `protocol:<field>`, `plan/analysis-plan.json` for `analysis-plan`.
  - (b) `status owner` takes `--file` and records the path and the hash.
  
  Either way: CONTRACT 3.7 gains the field, `spec/status.mjs.md` describes the write, and you decide whether `protocol-freeze` then stops accepting lines without it.
- **LR-4. Should status report an unreadable `run.lock` or `watcher.lock`?**
  - (a) Add a `lock-unreadable` anomaly. Changes `status.mjs`, the anomalies list in `spec/status.mjs.md` step 2 and the [status] schema.
  - (b) No anomaly. The library now breaks such a lock after about 30 s, which is documented in CONTRACT 4.4 above.
- **Coordinator session tools.** `profiles/coordinator.json` `tools_allow` lacks the host's session tools as `<prefix>*` entries. Until you name the prefixes, guard-hook refuses those calls with `tool-not-allowed`. This changes `tcb/profiles/coordinator.json` and possibly `settings/coordinator.json`; no document change is needed.
- **M6, the library half.** Should `lib.fence` itself re-check READY for every reason?
  - (a) Widen it: change `lib.mjs`, `spec/lib.md` T56, and remove the "until widened" note in CONTRACT 4.6.
  - (b) Keep it: the documents are already true, since replace makes the wider check itself.

**3. Rejected**
- "CONTRACT 3.19 names only P1..P21": wrong, it named no ids. I still added the list.
- The fence READY re-check "for every reason" in the documents: already met in CONTRACT 1.4, 3.6 and 4.6 and `spec/replace.mjs.md`. What remains is a code question (the ruling above).
- Its `tcb/scripts` text: already done by e2e-fix, except the intentional line in the guard-hook spec.

Left open, outside the 8 items:
- compare's exit 1 `blind-key-differs` exists in code but in no test, so it is not documented.
- The schema's note "not yet in CONTRACT 3.22" is in a tcb file, which I may not edit.
- `intakeCandidates` ignoring a `batch.json` of another mode is not pinned by any test, so it is not documented.
- lib-finish's request to name the extras of 4.8 and 4.10 (`line`, currentDesign's stpa/fmea ids) is not done.
- join-U2a's four spec questions and join-U2b's canonical-bytes question are not handled.

**4. Spec drift step**
- It should now pass. `run-e2e.mjs` line 457 reads only `spec/gate.mjs.md` and tests `/G1\b.*G12|G1-G12|G1\.\.G12/` on one line.
- Line 49 of that spec now reads "`G1`..`G12`", which matches.
- The text is true of `gate.mjs` lines 349-351 and gate T8.

**Added after the main-guard fix**
- Checked `admit.mjs` lines 609-622 and `stop.mjs` lines 538-551: `import.meta.main`, else `argv[1]` as written, else `fs.realpathSync(argv[1])`, against `import.meta.url`; any error answers false (the same as guard-hook.mjs).
- `CONTRACT` §1.1 Command line: new bullet stating that convention, why a plain path compare is wrong (through a junction or symlink the script exits 0 having done nothing), and that `tcb/test/main-guard.test.mjs` pins it for all 24 scripts.
- `CONTRACT` preamble file list: `tcb/test/main-guard.test.mjs` added.
- `CONTRACT` §7 Tests: `tcb/test/main-guard.test.mjs` added beside the per-script files and `lib.test.mjs`.
- No spec enumerates the suite's test files (spec/briefs.md T20 names only the `node --test tcb/test/` command forms), so no spec changed.
