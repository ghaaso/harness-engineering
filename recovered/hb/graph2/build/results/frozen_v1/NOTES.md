# results/frozen (grader, 2026-11-12, night)

Frozen by the grader with `node arms/common/run.js freeze --arm <arm> --config <name>` inside graphtest:1
(sealed/grader/dkf.sh). Nothing was run on HELD-OUT.

| arm | configuration | hash | harness record |
|---|---|---|---|
| relational | hops=4 | 6b70cc1222745385 | 6b70cc1222745385.json (arm relational) |
| ladybug | hops=4 | 6b70cc1222745385 | same file; names relational |
| duckpgq | hops=4 | 6b70cc1222745385 | same file; names relational |
| search | pad=CO rounds=1 routes=off | e70177e5807f0252 | e70177e5807f0252.json |
| floor-dir | gran=file form=signature | 714a474060653c1f | 714a474060653c1f.json |
| floor-co | gran=file form=signature | c4d2f0a60a3d199c | c4d2f0a60a3d199c.json |

Open harness defect (for the harness lane): `run.js freeze` keys its record by configuration hash only
and keeps the first writer (`if (!fs.existsSync(f))`). Three arms chose the same hash, so the folder
holds 4 harness records for 6 arms, and `harness.js checkSplit` (line 26) will refuse a held-out run of
6b70cc1222745385 for ladybug and duckpgq ("was frozen for arm relational"). The record should be keyed
by (arm, hash), for example `frozen/<arm>/<hash>.json`, and checkSplit should read that path. Then
ladybug and duckpgq can be frozen again. `by_arm.json` is a pointer for readers; the lock ignores it.
