# graphify held-out run (protocol addendum 7, section D)

Written 2026-11-13 by the held-out runner (first attempt, then a restart after the orchestrator's
ruling; section 3 records the stop, the ruling and the repeat). No reference answer was read, no
score was computed, and the folders `build/sealed/` and `build/audit/` were never opened, listed or
mounted. No agent ran and no model was called. Every graphify build, every graphify call and the
packing ran in containers of `graphtest-graphify:1` (image id `sha256:ff13d601...`) started with
`--network none`, 6 CPUs and 4 GB, one container at a time.

**Result in one line.** The frozen configuration `query-seed-full-d3` (hash `66367cd303fdd75b`) ran
on all 770 held-out tasks (T1 418, T1x 82, T2 237, T3 25, T4 8; T5 not run) and on the 30 held-out
questions at both settings. Every set is complete with each task once, every budget is respected, no
removed document appears in any T3 or T4 answer, and the adapter hashes equal the frozen record
before, during and after the run. The first attempt stopped at the packing step (missing source-text
trees in the shared cache); after the orchestrator filled that input cache, the packing step was
repeated once with no code change and everything after it finished. This run is **ok**.

`G` below means
`C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/graphify`.

## 1. Freeze check

| Check | Result |
|---|---|
| Frozen record | `G/FROZEN.json`: configuration `query-seed-full-d3`, hash `66367cd303fdd75b`, user command `graphify query "<text>" --seed "<def>" --seed "<path>" --budget 100000 --depth 3` |
| Adapter code hash (sha256 over `"<file> <sha256>\n"` lines of the 7 .js/.py/.sh files, sorted; recipe of `lib.js adapterHash`) | `bf4244214db5fd1e7bc02d9f6115a07434025e513c2f98a263946d47126ea6c9`, equal to the frozen value |
| All-files hash (sha256 over `"<path>\0<bytes>"` of every file in `G/adapter/`, sorted; recipe written in `G/grader/freeze.js`) | `6a7f7349e7067db06bcb1f6e0f77aeb14319d8a5990532dda26d37e670182d29`, equal to the frozen value |
| Per-file sha256 of the 7 files | all 7 equal to FROZEN.json |
| When checked | before the first attempt (`G/runner/hash_check.start.json`, `hash_check.before.json`), after its failure (`hash_check.after-failure.json`), before the repeat (`hash_check.restart.json`) and after the last step (`hash_check.after.json`); equal every time |

The hashes were recomputed by my own script (`G/runner/verify_hash.js`), not by the adapter. Nothing
under `G/adapter/` was changed at any point.

## 2. What ran

The driver `G/runner/drive.js` runs the unchanged adapter (`G/adapter/run.js`) step by step with
`--split heldout --allow-heldout --lock G/FROZEN.json --out G/answers/heldout --sets T1,T1x,T2,T3,T4`
and records each step in `G/runner/progress.json` (log: `G/runner/drive.log`). It skips a finished
step and refuses to retry a failed one on its own. The adapter's held-out lock accepted the frozen
record at every step.

| Step | Status | Time (UTC, 2026-11-13) |
|---|---|---|
| hash check | done | 14:30:57 |
| `graphs` (build the 79 held-out graphs) | done, exit 0 | 14:30:57 to 14:37:43 (6 minutes 46 seconds) |
| `calls` (graphify calls per task) | done, exit 0 | 14:37:43 to 14:39:56 (2 minutes 13 seconds) |
| `pack`, first attempt | failed, exit 2 (section 3) | 14:39:56 to 14:39:57 |
| `pack`, repeat (logged, section 3) | done, exit 0; pack container 14 seconds | 14:48:47 to 14:49:01 |
| `tq` (the 30 held-out questions, two settings) | done, exit 0 | 14:49:01 to 14:49:10 |
| `check` (the adapter's own checks) | done, exit 0 | 14:49:10 |
| hash check after | done, equal | 14:49:10 |
| own checks and inventory (`G/runner/checks.js`) | done, exit 0, no problem | 14:49:10 to 14:49:12 |

The `graphs` and `calls` steps ran once; the restart skipped them as done and did not rebuild a graph
or repeat a call.

### 2.1 Graphs (step a)

The 770 held-out tasks use 74 distinct parent commits. With the removal sets of T3 and T4 this gives
79 graphs: 70 parents without removal, and 9 graphs with one removed document each
(`docs/HANDOFF-2026-07-28-open-work.md` in 5, `CLAUDE.md` in 3,
`docs/lifecycle-audit-followups-2026-07.md` in 1). None of the 79 had been built before (no held-out
parent is also a tuning parent).

Each graph: `git archive` of the parent into `G/exports/<key>/export.tar` (no `.git`, never the
working tree), the removed path deleted from the unpacked export inside the container, then
`graphify extract /tmp/src --code-only --out /tmp/gout --max-workers 6` with the network off, then the
export deleted. `G/exports/` is empty after the run.

| Measure (79 graphs) | Value |
|---|---|
| graphify `extract` time per graph, inside the container | median 4.2 seconds, smallest 2.74 seconds, largest 5.98 seconds |
| whole container per graph (start, unpack, extract, copy, counts) | median 5.0 seconds; 396.8 seconds for all 79 |
| extract exit codes | 0 for all 79 |
| code files graphify found per graph | 259 to 488 |
| nodes per graph | 2,324 to 4,678 (median 3,493) |
| edges per graph | 6,271 to 13,120 (median 9,714) |

Build time and counts per graph (key, parent, removed paths, task count, sets, extract seconds,
container seconds, nodes, edges): `G/answers/heldout/own_checks.json`, field `graphs`, and
`G/graphs/<key>/build.json`.

### 2.2 graphify calls (step b, graphify part)

Every task got the frozen call (`query:seed:full:d3`) and the native call (`query:text`, graphify's
default `query`). Raw output: `G/answers/heldout/calls/<graph key>.jsonl.gz`, 79 files, holding each
command line, exit code, time, the full printed text and the parsed node list.

| Measure | Value |
|---|---|
| records | 770, one per task, 770 distinct ids |
| exit codes | 0 for all 770 frozen calls and all 770 native calls; no timeout |
| calls skipped (no definition node) | 0 (the frozen call falls back to `--seed "<path>"` alone) |
| calls that printed no node | 0 for either call |
| time per call (process start, graph load, answer) | frozen call median 352 milliseconds, largest 673; native call median 396 milliseconds, largest 737 |

## 3. The stop, the ruling and the repeat

**The stop (first attempt, 14:39:57 UTC).** The frozen pack command

```
node G/adapter/run.js pack --split heldout --allow-heldout --lock G/FROZEN.json --out G/answers/heldout --sets T1,T1x,T2,T3,T4
```

starts a container with `--network none`, the build's `arms/`, `tasks/` and `facts/cache/` mounted
read-only at `/build`, and runs `/adapter/pack.js`. It exited with code 2 after about 1 second on the
first graph (parent `00c0a1f7c319a07f789166beb5c2c9ad8ddd3917`): the shared loader
(`arms/common/source.js`, `ensureTree`) needs the parent's source-text tree in the shared store
`build/arms/common/srcstore/`, and when the tree is missing it runs `git archive` against the
repository, which the container does not have (`fatal: cannot change to
'C:/Users/User/Documents/projects/EMS_workshop1'`). The store held 56 trees; 73 of the 74 held-out
parents had none (only `8dafcecc7f39d8668a1b09a39c1fba82cfe14562` had one). The tuning run had passed
because every tuning parent already had a tree. The source text is not optional: it decides which
signature lines are printed and so the token count of every item. The runner stopped there, changed
no code and reported.

**The ruling (orchestrator, 2026-11-13).** No adapter code change. The orchestrator filled the input
cache on the host instead: 73 trees added to `build/arms/common/srcstore/`, the 56 earlier tree files
unchanged, 129 trees in all, none missing for the 74 held-out parents, 300 to 540 paths per tree
(record: `G/orchestrator/fill_srcstore.result.json`, fields `made` 73, `had` 1, `failed` 0,
`existing_changed` none, `missing_after` none). This runner did not write into `build/`.

**The repeat.** Before it, the adapter hashes were recomputed and equal the frozen record
(`G/runner/hash_check.restart.json`). `G/runner/authorise_pack_repeat.js` moved the failed `pack`
record into `progress.json` field `repeats` with the reason "missing source-text trees in the shared
cache (input cache filled, no code change)" (14:48:43 UTC), and the driver then ran the same frozen
pack command, unchanged, once. It finished with exit 0 in 14 seconds of container time and wrote 5
answer files for 770 tasks. This is the only repeat in the run; no graph build and no graphify call
was repeated.

## 4. What was produced

| Output | File(s) in `G/answers/heldout/` | Records |
|---|---|---|
| Answers of the frozen configuration in the stored format | `66367cd303fdd75b.<set>.jsonl.gz` as written by the packer, and byte-identical copies `<set>.jsonl.gz` | T1 418, T1x 82, T2 237, T3 25, T4 8 |
| Native answer text per task (graphify `query "<text>"` at its defaults, budget 2,000 by its own count, depth 2) | `native/query-text.<set>.jsonl.gz` | T1 418, T1x 82, T2 237, T3 25, T4 8; all exit 0; none empty |
| The 30 held-out questions at graphify's defaults | `tq/graphify.held_out.default.jsonl` | 30, all exit 0 |
| The 30 held-out questions at the larger-budget variant (`--budget 8000`, ADAPTER.md) | `tq/graphify.held_out.b8000.jsonl` | 30, all exit 0 |

The questions were asked on the graph of the frozen commit `a31924a3818f4ac94b695906d107c72c912792b2`
(built in the tuning lane, `G/graphs/a31924a3818f4ac94b695906d107c72c912792b2/`), with the question
text exactly as written in `tasks/tq_questions.jsonl` (0 of 30 differ at either setting). Each row
keeps the command, exit code, time, the raw answer text and its token count by the shared tokenizer.

Sizes by the shared tokenizer:

| Answer | Median tokens | Smallest | Largest |
|---|---|---|---|
| native answer, T1 / T1x / T2 / T3 / T4 | 2,182 / 2,167 / 2,186 / 2,205 / 2,248 | 1,895 (T1) | 3,251 (T1) |
| questions, default | 2,549 | 1,925 | 2,799 |
| questions, `--budget 8000` | 8,208 | 1,925 | 8,778 |

graphify counts its own budget at about 3 characters per token and adds a truncation notice outside
it (ADAPTER.md), so by the shared tokenizer 26 of the 30 default answers are above 2,000 tokens and 18
of the 30 answers at `--budget 8000` are above 8,000 tokens. These are graphify's own answers kept as
it printed them; no test budget applies to them. The same happened on the tuning questions.

## 5. Checks without references

From `G/answers/heldout/own_checks.json` (my checks, `ok: true`, 0 problems) and
`checks.heldout.json` (the adapter's checks, `ok: true`, 0 problems).

| Check | Result |
|---|---|
| every set complete, each task once | yes: T1 418 of 418, T1x 82 of 82, T2 237 of 237, T3 25 of 25, T4 8 of 8; 0 missing, 0 duplicate, 0 ids that are not held-out tasks of that set; header fields (arm, configuration hash and name, split, set, parent, granularity, form, pad) as expected in every record |
| stored format | record keys, item keys and per-budget keys equal those of a stored answer of the frozen typed arm (`results/relational/tune/`) in every record (adapter check) |
| budgets respected | at each of the budgets 2,000, 4,000, 8,000 and 16,000 tokens, the shown tokens (whole items plus the cut item) and `used` are at most the budget in all 770 records: 0 over. No padded item. Median `used` at 8,000 tokens: 7,999 in every set |
| no removed path in any T3 or T4 answer (whole-path match) | 33 tasks with a removal, 33 task-path pairs checked against the answer items, the answer seeds and the beyond-the-sample list, the native answer text, and graphify's raw printed text and parsed nodes: 0 hits. None of the 9 removal graphs has a node whose source file is the removed path, and every `removed.txt` lists its path |
| seeds that returned nothing | graphify printed at least one node for every one of the 770 frozen calls and 770 native calls. After the shared projection removes the seed file, 5 of 770 answers are empty: T1 2 (`T1-0786`, `T1-0787`), T1x 1 (`T1x-0212`), T2 1 (`T2-0464`), T3 0, T4 1 (`T4-001`). The reason recorded for all 5 is "only nodes of the seed file returned": graphify's whole result lay in the seed's own file, which every arm's projection excludes |
| how the seed was matched | the seed definition was found by id in 550 tasks, by its file only in 185 (the seed names no definition), through its members in 23, and not at all in 12; the definition rule: line and name 518, name in range 33, definition not found in the graph 34, no definition in seed 185 (sums over the five sets) |
| graphify nodes without a source file | 41,390 printed nodes over all 770 tasks had no source file (for example external names) and could not become a file item; 0 nodes had a file that could not be mapped |
| build time per parent | section 2.1; per graph in `own_checks.json`, field `graphs` |
| questions | 30 rows at each setting, 30 distinct ids, all exit 0, 0 question texts changed, the `--budget 8000` flag present exactly on the larger-budget rows |
| exports | `G/exports/` empty |

Files in an answer list (whole ranked list, before any budget): median 110 (T1), 104 (T1x), 112 (T2),
125 (T3), 145 (T4); largest 184.

## 6. Files

Inventory with sha256 per file: `G/answers/heldout/INVENTORY.json` (106 files: the answer files,
native files, question files, the 79 raw call files, jobs, logs and `own_checks.json`; the inventory
does not list itself). Main files:

| File (in `G/answers/heldout/`) | sha256 |
|---|---|
| `INVENTORY.json` | `be3a2e85c98aa2999b07c93a9dffc01cebfe4c26dda2954c0ee8388250e1468a` |
| `T1.jsonl.gz` (= `66367cd303fdd75b.T1.jsonl.gz`) | `c7ccdf81ce44b8f9847fe437cb3eecf7d33d84032669e4c3c40394f82ec129e7` |
| `T1x.jsonl.gz` (= `66367cd303fdd75b.T1x.jsonl.gz`) | `22418c133d3b2df2f167516cf67adeeba706e520c9d1c1123c977db712f819d4` |
| `T2.jsonl.gz` (= `66367cd303fdd75b.T2.jsonl.gz`) | `cb17973e384d5bf75b37ec627e928463f3e5c7096f316de3d04fa3b6a441ff11` |
| `T3.jsonl.gz` (= `66367cd303fdd75b.T3.jsonl.gz`) | `c5adcdbb1a96f954bcecbd16dce3997a809d274163595908296b47c3692e8766` |
| `T4.jsonl.gz` (= `66367cd303fdd75b.T4.jsonl.gz`) | `b0d59f1407f0f335afd62a0ae560775f7a9444e04af1afc8513c1ea6963bad65` |
| `native/query-text.T1.jsonl.gz` | `af8e8bd636c868e819ed50d821ab80f911ae5d060da5f30bee8e62ccab0ee315` |
| `native/query-text.T1x.jsonl.gz` | `1804ac46c1bd7d469e3b4a80e21133871a85c4eaad49ae05e987a33e154d8d86` |
| `native/query-text.T2.jsonl.gz` | `83add4df598fda17aa38f43669bce3ccdd267d4310857a28798b121d51bbfbdb` |
| `native/query-text.T3.jsonl.gz` | `c4bea85bda1d2491ca8be7856273b8b0c1f08b82888e842c06a6afd809456872` |
| `native/query-text.T4.jsonl.gz` | `587557283a90e9c527ba8b3f82a8c0da0bb645477f7ea25ecd37030cbd3dcc14` |
| `tq/graphify.held_out.default.jsonl` | `8f73af92c142d4ce48f24b0fb0e851bda6ce26dbff8882f5020a8570677d5819` |
| `tq/graphify.held_out.b8000.jsonl` | `fa771c78503192e58f1dc61390e03b1c491b0bd09c1ad2fad467f3d756edb354` |
| `checks.heldout.json` (adapter checks) | `47124bd2ba465d831f6b099976321d27439633d6a638b85d0bfc56b1e3f7f66d` |
| `own_checks.json` (my checks) | `f55605e9dd353862985345fda47d945706a1ad30aa1f730751a3da4f08845eef` |
| `pack_summary.heldout.json` | `21c51c6912c1707f5d62252428490853a0accc74daa4fa2de56b52a091944b58` |

Logs and state: `G/answers/heldout/run.log`, `G/runner/drive.log`, `G/runner/progress.json` (steps and
the one repeat), `G/runner/partial_state.json` (state written at the first stop). Runner code:
`G/runner/drive.js`, `verify_hash.js`, `checks.js`, `authorise_pack_repeat.js`, `plan.js`,
`partial_state.js`.

## 7. Limits

- Nothing was scored here; a grader scores these answers against the sealed references. This file
  says nothing about answer quality.
- One repository, graphify 0.9.108's code layer only (no documents, no model), the frozen
  configuration on these task kinds.
- The packing depended on the source-text trees the orchestrator added to the shared cache. They were
  made by the shared `source.js` recipe on the host (record in `G/orchestrator/`); this runner did not
  check their content beyond the packer reading them without error.
- `build_graph.sh` removes a document with `rm -f`, which writes the "removed" line whether or not the
  file existed in the export. The graphs are code-only, so graphify would not have read these Markdown
  files in any case, and no removal graph has a node from a removed path.
