# render.mjs: spec

Source of truth: `CONTRACT.md` (§1, §2.1, §3.1-§3.4, §3.7, §3.11, §3.14-§3.16, §3.20, §4.8, §4.10, §5 row U4a).
Design: R20 (everything a person reads is a view; the seven measures), R35 (coverage as held-out seed recall),
R37 (agreement never raises a claim), R56 (the residual is a reading), R18 (conditions shown by join), R24, R19,
R40; sections 9 (P4, P16, P17, N14, N15) and 13. "tms spec", "protocol-freeze spec", "compare spec", "gate spec" name the sibling specs whose formats this one reads.
Items marked **needs-app** are written and skipped (CONTRACT §7).

## Purpose
Build every page and view a person or a gate reads, from stored objects, labels, statuses, the ledger and the
transcripts. All of it is derived: deletable, rebuilt, never edited. Conditions on a page come from the cited
card by join, never from a sentence's prose (S7). It computes the owner's seven measures, the coverage view
(held-out seed recall with its interval) and the residual readings. It decides nothing: gates read its files.

## Command line
`node render.mjs --root R --ce N [--now iso] [--dry-run]` (no mode). `--ce` is required (it writes `views/`).
All thresholds from `<root>/tcb/thresholds.json`, including `transcripts_root`, `weights`, `f5_given`, `w_chars`.

## Reads
`views/labels.json` (tms spec: `inputs.status_seq`, `cards.<id>.label`, `nodes["<obj>#<sid>"].label`, `verdicts`, `dismissals`, `certificates: VALID|STALE`); `store/commits/*.json` and the objects they name (every `sha256`
re-checked); `store/status/card_status.jsonl`; `store/witness.jsonl`; `store/qualification.json` (optional);
`run/tasks.json`; `run/ledger.jsonl`; `run/coord.json` (`tcb_commit`); the transcripts of every attempt's session
(`sessionTranscripts`, `parseTranscript`, `spendOf`); the current frozen protocol of each field (`lib.currentProtocol`, CONTRACT §3.18:
`plan/frozen/protocol-<field>-<sha12>.json`);
`sealed/heldout/<field>.json` (key `heldout`, protocol-freeze spec); the frozen analysis plan (`plan/frozen/analysis-plan-<sha12>.json` named by the latest `plan-freeze` or `protocol-amend` line of name `analysis-plan`,
else the draft `plan/analysis-plan.json`) for `arm_tasks` (CONTRACT §3.18); `views/comparison.json` (optional, key `arms`, compare spec);
the hazards object of `lib.currentDesign(root)` (optional; CONTRACT §4.10, the same choice gate makes); `completeness/gate.json` is not read.

## Writes (writeAtomic, under `run.lock`, `--ce` checked inside it; nothing is written when any refusal is found)
`views/pack-<task>.md` and `views/review-<task>.md` (one per committed pack / review), `views/synthesis.md`,
`views/owner.md`, `views/coverage.json`, `views/measures.json` ([coverage], [measures], CONTRACT §3.22). Every `.md` starts with
`<!-- render ledger_seq=<n> head=<first 12 hex> -->`; the `.json` carry `built_from {ledger_seq, ledger_head}`
and `generated_at` (= `--now`). The same inputs and `--now` give byte-identical files. One `check` line (check
`render`, subject `views`).

## Steps
1. Read and verify (no lock): commit records, each output's bytes against the record's `sha256` (`object-mismatch`
   3), `labels.json` (absent -> 2; `inputs.status_seq` below the status file's last seq -> 1 `labels-stale`).
   Any id matching `^s_[0-9a-f]{16}$` in a commit record or object -> 3 `seed-id` (+ `incident` line).
2. Dangling reference -> 1 `dangling-reference` (ids listed): a cite or `supersedes` or pack card not in the store;
   missing label -> 1 `missing-label`: a rendered card, sentence node (`<object id>#<sid>`), verdict, dismissal or
   certificate without an entry in `labels.json`. A card or sentence that is not trusted (R24) is rendered only
   under "excluded", with its label; STALE and PENDING are shown, never hidden (the gate refuses them).
3. Pages. `pack-<task>.md`: conclusions in sid order, each `- [sid] (LABEL) text`, with its declared scope
   (`applies_to`) and, under each cite, the joined line `<card id>: <effect> <value> <unit> vs <baseline>
   (<baseline_kind>); conditions: task=..; model_family=..; language=..; repo_size=..; metric=..; other=..; source:
   <url>`; the two-level index when present. `review-<task>.md`: the same for sentences, then verdicts and
   dismissals (with labels, out-list entries), then `our_work_findings`.
4. `synthesis.md`: only reviews with a certificate object whose `result` is `certified` and whose label is `VALID` (others listed
   with their reason: `not-certified`, `stale-certificate`, `no-certificate`). One row per key `(approach_id, measure)`: label = the
   worst of its sentences (STALE > PENDING > JUDGMENT > IN), distinct card `effect` values, cards, joined
   conditions, review and its `session_label`. A key whose cards disagree on `effect` is marked `weak: disagreement`
   (R37). No count of agreeing sentences or cards appears anywhere.
5. Coverage (`coverage.json`): per field from its frozen protocol: `approved`, `covered` (an id carried by a card
   whose last status is `witnessed` or `confirmed`; a committed card while `f5_given` is false, `basis` says which),
   `not_covered`; held-out seeds: `{n, found, recall, lower, upper}` (`clopperPearson(found, n)`, a seed is found when
   a counted card has it as `source.canonical_id` or `primary_id`), labelled `upper bound: seeds are probably easier
   to find than the average relevant source`; Chapman on primary ids: `n1` from `keyword` cards, `n2` from `backward`
   / `forward` / `contrary` cards, `m` both, `N_hat = (n1+1)(n2+1)/(m+1)-1`, `observed`, `coverage_ub`, `m_expected
   = n1*n2/N_hat`; `n1` or `n2` 0 or `m` 0 gives `N_hat: null`, `reason: no-captures|no-overlap`; `coverage` (the smaller of `recall` and `coverage_ub` where each exists, else null), `yield_per_reader_call`
   (distinct primaries per Agent call of type `reader`; null with 0 calls); `below_floor` only when `coverage_floor`
   is a gate. `union` counts approved ids over all fields (write skew). A field without `heldout` file: `heldout: null`.
6. Measures (`measures.json`): `by_task`, `by_field`, `by_arm` (the arms of `arm_tasks`, each task once; null without a plan), each with `tokens {calls, input,
   cache_read, cache_write, output, total, complete}` (all attempts' sessions and helpers; `complete:false` when a
   transcript is missing), `token_cost = input + read*cache_read + write*cache_write + out*output` (dimensionless,
   `weights` from thresholds), `time {first_ts, last_ts, wall_s, quiet_s, active_s, quiet_gaps}` from ledger `ts`
   (first `bind`/`started` of the task to its last line; a gap of more than threshold `sleep_gap_ms` (600000, guess) between consecutive
   ledger lines is shown apart as `quiet_gaps`, which cannot tell sleep from no events), `throughput_per_h`
   (covered ids per **wall** hour, `wall_s`, R20 "per hour": a step writes no ledger line while it works, so a ledger
   silence cannot be told from work; `quiet_s`, `active_s` and `quiet_gaps` are readings only; null when `time` is
   null or `wall_s` is 0), `efficiency_per_mtok` (ids covered by a `confirmed` card per million tokens),
   `hallucinations {witness_rejections, checker_rejections (verdicts number_mismatch, baseline_swapped,
   conditions_mismatch, outside_conditions), checker_unclear, citation_failures (`flagged` entries of `intake` lines
   plus rejected codes `uncited-fact`, `cite-outside-pack`, `bad-sid`)}`; per field also `cards {n, pending, witnessed,
   confirmed, unverifiable, rejected}` and `unverifiable_share` (G3). Top level: `seeded_escape_rate` from
   `qualification.json` `escape`, `quality` = `views/comparison.json` `arms` verbatim (null when absent), and `values`
   {`unverifiable_share` over all fields, `coverage` = the lowest field `coverage` or null}, always present (required by [measures]), which gate.mjs reads
   for its action lines.
   Zero denominators give `null`, never 0 or NaN.
7. Readings (`measures.json` `readings`, never a gate): from the hazards object's `map`, lens = `source.kind` (`uca` = STPA,
   `cell` = FMEA): `n1`, `n2`, `m` over distinct `hazard_id`s, Chapman `N_hat`, and Chao2 over the two lenses (`S_obs + Q1^2/(2 Q2)`,
   `Q1(Q1-1)/(2(Q2+1))` when `Q2` is 0), each with a range from `borderline` entries kept as their `hazard_id` versus moved to
   `alt_hazard_id`; absent -> `{state:"not_run"}`, no overlap -> `{state:"not_estimable"}`.
8. `owner.md`, sections in this order: `Trusted base` (`tcb_commit`, ledger seq and head), `Seven measures` (a table
   per field and arm, the action-line thresholds beside each value, `reading` where a gate is null), `Coverage`,
   `Hallucination figures`, `Qualification` (per class `d_hat`, lower bound, status; "not measured" when absent),
   `Not run and stale` (counts), `Residual readings`, `Excluded`.

## Exit codes
0 views written; 1 `dangling-reference`, `missing-label`, `labels-stale` (nothing written, `check` fail, `incident`
refusal); 2 `labels.json`, store, thresholds or ledger missing/unparseable (`not_run`); 3 `object-mismatch`, `seed-id`;
64, 66, 67, 70, 75 as the contract. `--dry-run`: the result lists the files it would write; nothing is written.

## Behaviours
- T1 Fixture: 2 fields, 3 tasks, 5 cards, a pack and a review, labels, statuses -> exit 0, the six file kinds exist,
  every `.md` starts with the `ledger_seq` header, `check` line `pass`, ledger verifies.
- T2 Join: a sentence text says "on Java" while its card has `language: ["python"]`; the page shows `language=python`
  in the card line and the sentence's `applies_to` separately; "java" appears only inside the sentence text.
- T3 Labels shown are those of `labels.json` (STALE, PENDING, JUDGMENT, IN); changing one label changes only that line.
- T4 Missing label for one sentence node -> 1 `missing-label` naming it, no file written (`views/` unchanged).
- T5 A cite to a card absent from the store -> 1 `dangling-reference`; a pack card missing likewise.
- T6 `labels.json` `inputs.status_seq` below the status file's last seq -> 1 `labels-stale`; labels file absent -> 2.
- T7 A commit-record output whose object bytes were edited -> 3 `object-mismatch`; a cite `s_0123456789abcdef` -> 3
  `seed-id`, nothing written.
- T8 Synthesis: key K cited by one sentence in review A and by three agreeing sentences in review B gives one row,
  the same label, no count column; two cards with effects `improves` and `worsens` -> `weak: disagreement`.
- T9 A review without a certificate, with a `not_certified` result, and with a `STALE` certificate label is not in the table and is
  listed with `no-certificate`, `not-certified`, `stale-certificate`; a `tainted` certified review shows `tainted`.
- T10 Untrusted card (status `rejected`) appears only under `Excluded`, with its label.
- T11 Coverage: 4 held-out seeds, 3 found by witnessed cards -> `recall` 0.75, interval = `clopperPearson(3, 4)`, the
  "upper bound" text present; with `f5_given` false and committed-only cards `basis` is `committed`.
- T12 Chapman: primaries {a,b,c} by keyword, {b,c,d} by backward -> `n1` 3, `n2` 3, `m` 2, `N_hat` 13/3 (4.3333), `observed` 4; no
  overlap -> `N_hat: null`, `reason: no-overlap`; `seed` route cards count in neither group.
- T13 `union` counts an id covered in another field once; a cross-field id uncovered everywhere is in `not_covered`.
- T14 Measures: transcripts with usage 1000 input, 4000 read, 200 write, 500 output (weights 0.05, 1.25, 5, the shipped values) ->
  `total` 5700, `token_cost` 1000+200+250+2500 = 3950; helper transcript tokens are included; a task whose session
  transcript is missing has `complete: false` and renders.
- T15 `throughput_per_h` = covered ids / `wall_s` hours (ledger `ts` 2 h apart, 3 ids -> 1.5); `quiet_gaps` lists a
  gap above `sleep_gap_ms` and `active_s` excludes it, throughput does not (wall 4800 s with a 3600 s gap, 3 ids ->
  2.25); no `bind` line -> `time: null`, throughput `null`.
- T15b A bind line and one line two hours later: `active_s` 0, throughput 1.5 (not null); an hour of silence and
  five seconds of lines: 3 ids / (3605 s / 3600), never a per-`active_s` rate.
- T16 `efficiency_per_mtok` counts only ids covered by a `confirmed` card; 0 tokens -> `null`.
- T17 Hallucinations: 2 witness `rejected` records, verdicts number_mismatch and unclear, one `flagged` entry, one
  rejected `cite-outside-pack` -> `witness_rejections` 2, `checker_rejections` 1, `checker_unclear` 1, `citation_failures` 2.
- T18 `unverifiable_share` = unverifiable / all cards per field and, in `values`, over all fields (the number gate.mjs reads); `values.coverage` is the lowest field `coverage`; no cards -> `null`; `seeded_escape_rate` is copied
  from `qualification.json`, `null` when that file is absent.
- T19 `by_arm`: a frozen plan with `arm_tasks` {T: pack+review of one task, R1: a review of another} -> per-arm sums, a
  task named twice counted once; no plan -> `by_arm: null`; `quality` is `comparison.json` `arms` verbatim, `null` when absent.
- T20 Readings: a hazards object whose `map` has `uca` and `cell` sources gives Chapman and Chao2 values by hand-checked
  formula and a borderline range (an entry moved to its `alt_hazard_id`); no hazards object -> `not_run`; `Q2` 0 uses the bias-corrected form.
- T21 `owner.md` has its eight sections in order, shows `tcb_commit` from `coord.json`, and shows `reading` for a
  null-valued threshold.
- T22 Determinism: two runs with the same `--now` give byte-identical files; a `--now` change alters only `generated_at`.
- T23 Stale `--ce` -> 64, `views/` untouched; busy lock -> 75; `--dry-run` writes nothing and names the files; a
  script run from `wt/` -> 3.
- T24 No `.tmp` file remains; every `.json` parses and carries `schema_version` 1.

## Cannot be tested without the app
- Real token fields and helper linking (CONTRACT §7 item 7): `tokens.complete` on real transcripts.
- Whether `quiet_gaps` separate real PC sleep from idle time (items 6, 8): the pilot's induced sleep decides.
- Whether the owner page reads well on the owner's screen (the owner prefers a visual page; `measures.json` and
  `coverage.json` are the data a later HTML renderer would take).

## FX-REDO: redone lines (FIX-fence section 5)

The time measure starts at the first `bind` or `started` line of the set. When a line of the set carries `data.redo`, each task's start is its `bind` or `started` line of the lowest epoch (seq within it), and the set's start is the earliest of these; without one nothing changes. Render is the only reader of the kinds a redo writes. Test: T28.
