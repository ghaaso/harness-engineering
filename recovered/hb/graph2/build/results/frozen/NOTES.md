# results/frozen (lock lane, 2026-11-13; protocol addendum 4 item 13)

Empty until the grader freezes. Layout written by `arms/common/run.js`:

- `<arm>/<config hash>.json`: one record per (arm, configuration): arm, hash, role (primary, s1, s2,
  crosscheck), the normalised configuration, where it was found, `code_hash` (sha256 over
  `arms/<arm>/*.js` and `arms/common/*.js`), `deps_hash` (files of other arm folders the arm requires),
  per-file hashes, Node version, time. Written by `run.js freeze --arm A --config <hash> --role R`.
- `<arm>/tq.json`: the frozen question code of an arm (`run.js freeze-tq --arm A`).
- `freeze_log.jsonl`: one line per record written; `_replaced/`: records replaced with `--refreeze --reason`.

The held-out lock (`harness.js lockTest`, `tqLockTest`) reads only these files. The earlier records keyed by
hash alone are kept, unread, in `results/frozen_v1/`. Details and commands: `arms/common/NOTES.md`,
section "Held-out lock".

## Frozen by the grader (2026-11-13, addendum 4; re-frozen after pre-flight fix rounds 1 and 2)

The grader froze 13 configuration records and 4 question-code records through `run.js freeze` and
`run.js freeze-tq` (log: `freeze_log.jsonl`, 51 lines: the first freeze and two re-freezes, 17 each):
primary for relational, ladybug, duckpgq (95e990307da3b42b), search (e70177e5807f0252), floor-dir
(714a474060653c1f), floor-co (c4d2f0a60a3d199c); s1 6b70cc1222745385 for relational, ladybug, duckpgq; s2
ladybug f233ae069bdba0ce and search 950c029615d337c1; crosscheck for reference (95e990307da3b42b,
6b70cc1222745385); `tq.json` for relational, ladybug, duckpgq, search.

Pre-flight fix rounds 1 and 2 changed `arms/common` (and in round 2 `arms/ladybug/tq.js`), so the records
went stale twice; each time all 17 were re-frozen with `--refreeze --reason` (older records in
`_replaced/`). Same configurations and roles; only code hashes changed. After the last re-freeze
`run.js lock-check` allows every declared run (21 of 21 checks; 89 of 89 `lock_check` commands of
PLAN.json) and refuses the undeclared ones (6 of 6).

`PLAN.json` is the held-out run plan (addendum 4 section B): 85 set runs and 4 question runs, with the
expected task count per set. The runner follows it and nothing else. The lock reads it only for
`tq_hold.hold` (question runs are refused while it is true). `tq_hold.hold` is now false: both findings
behind the earlier hold were fixed in round 2. If it is ever set true again, no entry of any kind runs.
