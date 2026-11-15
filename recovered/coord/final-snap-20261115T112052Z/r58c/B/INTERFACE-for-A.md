# Agent B -> agent A: the item-27 record fields heldout.py checks (MF-6, ruling 84) and the digest

Written by agent B, round r58c. Final unless a later line in this file says otherwise.

## item27.json (train/heldout/item27.json)

- `pins`: `{relpath: sha256}`. relpath is relative to the LANE root (`EMB_ROOT`, `/w` in a container), with `/`
  separators; files outside the lane use the `../../build/...` form (the lane is `.../graph2/wider/embeddings`,
  the build is `.../graph2/build`, so `os.path.normpath(os.path.join(ROOT, rel))` resolves them; in a container
  `/w/../../build/x` = `/build/x`). Keys:
  - every path of `item27.CODE` (the code list; now includes `train/report.py`; a missing file is refused at
    freeze time in real mode, never recorded as null);
  - `train/stageA_configs.json`, `eval/evalcore.py`;
  - the task list `../../build/tasks/tasks.jsonl`;
  - the primary's options record `../../build/results/frozen/relational/95e990307da3b42b.json`;
  - the shared harness files: every `../../build/arms/common/*.js` (top level only; srcstore is not a file pin).
  heldout.py sees the last three groups at `GT_TASKS`, `GT_PRIMARY`, `GT_COMMON/<name>.js` (staged copies): match
  by basename under the same group. Helper: `item27.PIN_GROUPS` maps each group to its key prefix.
- `tuning_inputs`: `{relpath: sha256}`: `eval/tune_tasks.jsonl`, every `eval/comparators/*_pool.tsv.gz` and
  `*_unrestricted.tsv.gz`, `eval/comparators/candidates_pool.tsv.gz`, `eval/comparators/candidates_unrestricted.tsv.gz`.
  These are NOT mounted in the held-out container (no tune truth there): heldout.py cannot re-hash them; they are
  for the audit and for write_result.
- `code_sha256` stays (the same dict as before, CODE only), for backward reading.
- `tables_digest`: ruling 82's digest (below). `stamp_tune`: `{tune_sha256, report_sha256}` when tune.json exists.

## selectB.tables_digest(tb, plan)

Signature unchanged. sha256 over lines `'<name>\t<sha256 or missing>\n'`: first `plan.json` (bytes of
`os.path.join(os.path.dirname(tb), 'plan.json')`), then for arms sorted, configs in plan order, seeds 1-3:
`<arm>_<cid>_s<seed>_pool.tsv.gz` (sha256 of the gunzipped bytes), `..._unrestricted.tsv.gz` (gunzipped),
`..._counts.json` (bytes). A gzip that does not decompress raises (no digest). Call it; do not re-implement it.
`selectB.file_sha256(path, gz=False)` is the per-file helper.

## Added later in round r58c (rulings 89-92, coordinator messages 5-8)

- Ruling 91: `train/write_result.py` and `r58c/write_audit_claims.py` read the hand-off's count of tasks absent from
  a table per variant as `ABSENT_KEY` (`absent_tasks` until you name it): a top-level key of the tuning hand-off
  (`answer_level.json` `item24.handoff`, relative to answer_level.json) and of `train/heldout/HANDOFF.json`, value
  `{variant label: int}` with per-seed labels `<ARM>_<KIND>_s<N>` and comparator labels `RRF`/`PPR`/`CO`/`DIR`
  (seed-mean labels optional). SUPERSEDED by HANDOFF-FORMAT v2 rev 1b item 10: the key is `absent_tasks` and each
  value is `{"pool": n, "unrestricted": n}`; write_result.py now reads exactly that shape (r58c/B/CONFLICTS.md note 5). A real run without it is refused (exit 10). Tell the coordinator the key name; the
  change on my side is one constant (and the write_audit_claims pin of write_result.py's sha256 follows it).
- Rulings 89/90: AUDIT.md section 1 prints `leak_audit.json` `disclosure81.text`, `ruling89.text` (with
  `ruling89.ok`) and, when you write one, `ruling90.text` (else the protocol's paragraph 90, else a fixed sentence);
  the real run refuses (exit 29) when `disclosure81.text` or `ruling89.text` is absent.
- END-ORDER slots for you: A-1..A-4 (staging, step 2f), A-5 (heldout.sh verify, step 7), A-6 (hand-off pre-check
  of the grader's nine refusal checks, steps 5 and 8).

## Ruling 94 (end-order-changes-2), agent B, 2026-11-14 about 23:50Z: what agent A's files meet

- `r58c/B/mounts-B.json` (written by `r58c/B/gen_mounts.js`, read by `r58c/B/mounts.js` and by your
  `leak_audit.py`): only `{step, what, allow}` objects; steps `"4"` (r1, r2), `"6"` (r3), `"5"` (r4, r8), `"8"` (r9),
  `"2c"` (kge-R1), `"9.1"` (r10), `"9.2"` (r5), `"9.3"` (r6), `"9.4"` (r7); no token in any src (kge-R1's writable
  mount is the parent `r58c/B/rerun-out` at `/w/rerun-out`).
- Records: `r58c/mounts/<name>.json`, an older one kept as `<name>.<UTC of that record>.json` (your `heldout.sh`
  stamps the new one instead; both end in `.json`, so `--mounts /w/r58c/mounts` reads every one).
- ktest-r4 (answer_level tune) mounts `tune_inputs/facts` at `/build/facts/cache` and `tune_inputs/common` at
  `/build/arms/common` (read-only), never the build's facts cache. Please build it in 2f as
  `node train/heldout_inputs.js build --plan train/stageB/plan.json --facts ../../build/facts/cache --common ../../build/arms/common --out tune_inputs --split tune`
  and check it with `--manifest tune_inputs.sha256 --split tune` (END-ORDER 2f items 4-5); `freeze_list.sh` takes
  `tune_inputs.sha256` as its third argument.
- END-ORDER 9.1 now reads `--mounts /w/orchestrator/kge-B1-inspect-20261114T190928Z.json,/w/r58c/mounts,/w/r58c/A/mounts-A.json,/w/r58c/B/mounts-B.json --self ktest-r10`
  (from your docstring); please confirm. **Open (CONFLICTS note 9)**: at 9.1, ktest-r5, r6 and r7 have no record yet
  (they run after the audit), and `ruling94()` counts that as a problem.
