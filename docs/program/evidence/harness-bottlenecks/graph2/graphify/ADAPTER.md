# graphify adapter and tuning run (protocol addendum 7, items 7 to 10 and 15 to 16, tuning split only)

Written 2026-11-13 by the tuning lane, after `INSTALL.md` (same folder) and before any held-out task
was run. It covers how graphify's code layer is asked the known-answer tasks, the 10 configurations,
how graphify's answers are turned into the shared answer records, what the checks found, and the
command the held-out runner uses. No score was computed and no reference answer was read; the folders
`build/sealed/` and `build/audit/` were never opened, listed or mounted. No agent ran and no model was
called. Every graphify build and every graphify call ran in a container of `graphtest-graphify:1`
started with `--network none`.

Result in one line: all 10 configurations ran on all 772 tuning tasks (388 in T1, 144 in T1x, 240 in
T2), 30 answer files were written in the stored record format, every check below passed, and the 20
tuning questions were answered at two budgets. This says which files graphify's code layer returns
and in what order on this one repository; it is not a statement about graphify in general.

Locations (scratch, outside the repository; `G` below means
`C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/graphify`):

| What | Where |
|---|---|
| Adapter code (7 files) | `G/adapter/`: `configs.js` (the 10 configurations), `run.js` (host runner), `lib.js` (tasks, hashes, held-out lock), `build_graph.sh` and `graph_stats.py` (graph build, in the container), `calls.py` (graphify calls and reading their output, in the container), `pack.js` (shared packer, in the container) |
| Graphs | `G/graphs/<parent sha>/` : `graphify-out/graph.json` (+ `manifest.json`, `.graphify_analysis.json`), `build.json` (time, counts, relation kinds), `extract.log`, `stats.json` |
| Answer files | `G/answers/tune/<config hash>.<set>.jsonl.gz` (30 files); `configs.json` maps name to hash |
| graphify's own output | `G/answers/tune/calls/<parent sha>.jsonl.gz`: every command line, exit code, time, the full printed text and the parsed node list, per task |
| Native form | `G/answers/tune/native/query-text.<set>.jsonl.gz` |
| Questions | `G/answers/tune/tq/graphify.tune.default.jsonl` and `graphify.tune.b8000.jsonl` |
| Checks | `G/answers/tune/checks.tune.json`, `pack_summary.tune.json`, `run.log`, `graph_table.md` |

Adapter code hash (sha256 over the 7 files; what the grader freezes with a configuration):
`bf4244214db5fd1e7bc02d9f6115a07434025e513c2f98a263946d47126ea6c9`.

---

## 1. Graphs (one per parent commit)

For each of the 53 parent commits that tuning tasks of T1, T1x and T2 use, plus the frozen commit
`a31924a3` at which the questions are asked, `run.js graphs`:

1. writes `git archive --format=tar -o G/exports/<sha>/export.tar <sha>` (the parent commit only, no
   `.git`, never the working tree);
2. starts `graphtest-graphify:1` with `--network none --cpus 6 --memory 4g --read-only`, tmpfs at
   `/tmp` and `/root`, and three mounts only: the tar (read-only), an output folder, and the adapter
   (read-only). Inside, `build_graph.sh` unpacks the tar into tmpfs and runs
   `graphify extract /tmp/src --code-only --out /tmp/gout --max-workers 6`, then copies `graph.json`,
   `manifest.json`, `.graphify_analysis.json`, `.graphify_build.json` and `.graphify_root` out (the
   per-file AST cache is not kept);
3. deletes the export. `G/exports/` is empty after the run.

`--code-only` is graphify's documented headless code-layer build (no document, paper or image pass;
INSTALL.md section 5.1). The tar is unpacked into the container's memory because reading through the
Windows bind mount made the build 20 times slower in the install lane.

The frozen commit `a31924a3` is listed in `tasks/parents.txt` only for T5 (held-out, never run), but
every question of the test, the 20 tuning ones included, is asked at that commit, and every other arm
answered its tuning questions there. Its graph was built for the 20 tuning questions only; no T5 or
other held-out task was run on it. No graph was built for a parent that only held-out tasks use.

Build costs (all 54 graphs, details per parent in `graph_table.md` and `graphs/<sha>/build.json`):

| Measure | Value |
|---|---|
| graphify `extract` time per parent, inside the container | median 2.3 seconds, largest 7.2 seconds (the frozen commit) |
| Whole container per parent (start, unpack, extract, copy, counts) | median 3.1 seconds; 168 seconds for the 53 tuning parents, 176 seconds for all 54 |
| Code files graphify found per tuning parent | 80 to 248 |
| Nodes per tuning parent | 371 to 2,203 (median about 1,550); frozen commit 4,683 |
| Edges per tuning parent | 956 to 5,898 (median about 4,200); frozen commit 13,141 |
| Edge origin | every edge from the parser (`_origin = ast`) |
| Relation kinds (edges summed over the 54 graphs) | contains 49,373; calls 43,331; imports 39,222; imports_from 37,718; references 23,946; uses 13,008; rationale_for 8,532; method 5,696; inherits 3,958; declares 2,437; re_exports 827; indirect_call 742; extends 53 |
| Disk | 98 MB for the 54 graph folders |

As INSTALL.md found, there is no route, URL, table read/write or changed-together relation; addendum
7 item 20 expects that.

## 2. What the adapter does, step by step

1. **Seed file.** The task's seed path is passed to graphify as typed, repo-relative (graphify stores
   repo-relative `source_file` values, and its `affected`, `explain` and `query --seed` resolve a path
   to the file node; affected.py `resolve_seed`). All 772 seed files are in graphify's graphs.
2. **Seed definition.** When the seed names a definition, the adapter looks up graphify's own node id
   for it in `graph.json` (read only), in the seed file, by these rules in order: (a) a code node whose
   line is the definition's first line and whose label without `.` and `()` equals the last part of
   the name; (b) a code node with that label inside the definition's line range, the closest to its
   first line (Python decorators move graphify's line to the `def` line); (c) any code node other than
   the file node on the first line. The node id is then passed to graphify. Why the id and not
   `path::Name`: graphify's own README tells users to "use the precise ID returned by the graph", every
   command accepts it, and graphify's `path::Name` form does not resolve a class member written
   `Owner.member` (its member labels are `.member()`), so typing the name would fail for methods for a
   reason that has nothing to do with the graph. Outcome on the 772 tasks: 508 by rule (a), 64 by rule
   (b), 0 by rule (c); 168 seeds name no definition; 32 definitions have no graphify node (20 test
   functions and 6 test blocks written `describe > it`, which graphify does not model as nodes in
   JavaScript tests, and 6 module variables). For those 32, the calls that need a definition are not
   issued and the file calls still run.
3. **The calls.** Each configuration is a list of graphify CLI commands, run exactly as a user types
   them, as a subprocess (`graphify affected|query|explain ... --graph <parent graph>`), with the
   image's settings (`GRAPHIFY_BACKEND=none`, no auto-refresh, no query log). The graph is copied into
   the container's tmpfs first so that graphify's `last_query_stamp` write succeeds and no
   `.graphifyrc` exists (so the documented defaults apply). The query text a user would type is
   `"<name> <path>"`, or `"<path>"` when the seed has no definition.
4. **Reading the result.** The printed output is read line by line in graphify's own order and
   nothing is re-ranked, filtered or added:
   - `query`: every `NODE <label> [src=<file> loc=<line> ...]` line, in printed order (graphify
     orders it: seeds first, then file-first by match score in keyword mode, or by hop distance and
     degree in `--seed` mode). EDGE lines are not used: every node they name is already a NODE line.
   - `affected`: every `- <label> [<relation>] <file>:<line>` line, in printed order (breadth-first
     order of the reverse walk).
   - `explain`: every `--> / <-- <label> [<relation>] ...` connection line, in printed order (graphify
     sorts connections by the neighbour's degree, highest first).
   - When a configuration lists several calls, their lists are concatenated in the stated order.
5. **Mapping a printed node to a repository file** (the mapping rule).
   - `query` prints the node's own source file (`src=`), so the file is that path; the node is also
     located in `graph.json` by label, file and line (all 1,232,853 printed query nodes were found).
   - `affected` prints the site of the edge, which affected.py documents as the location in the hit
     node's own file. The node is located by label and that file (48,656 of 48,660 printed lines),
     else by a label that is unique in the graph, else the printed file is used (4 lines, where two
     nodes share label and file).
   - `explain` prints the neighbour's label and the edge site. The neighbour is located among the
     explained node's neighbours in `graph.json` by label; when neighbours with that label sit in
     several files, an incoming edge's site file is used (it lies in the neighbour's file; 44 lines),
     and an outgoing one is left unmapped. 114 of 26,475 explain lines stayed unmapped (labels shared by
     nodes in several files: `Job` 66 times, `.__init__()` 38, `.delete()` 10).
   - Nodes without a source file (graphify's `concept` nodes: external packages and names such as
     `fixture` or `AsyncClient`) map to no file and are skipped; the count is kept per answer.
   - A file is then mapped to the shared graph's `file` (or `doc`) node with the same path. Every
     file graphify returned exists in the shared facts: 0 unmapped files in all 30 answer files.
   - Where graphify gives a line and the node is a definition (not the file node, not a docstring),
     it is mapped to the shared definition node of that file starting on that line (same name
     preferred), otherwise to the file node. At file granularity this changes nothing (the packer
     takes each node's file, first occurrence); it keeps the definition for any later symbol use.
6. **Packing.** The ranked list goes to the shared harness unchanged in order: `seed.js mapSeed`
   for the seed, then `harness.js answer()` (projection at file granularity, no padding, signature
   form, budgets 2,000, 4,000, 8,000 and 16,000 tokens of the shared tokenizer). The seed file is
   excluded by the shared projection, as for every arm. If graphify's list does not fill a budget the
   answer is shorter; nothing is added from any other source. `hop` and `score` are `null` (graphify
   does not print them per node); `via` holds the relation graphify printed for affected and explain.
   `lookups` is the number of graphify commands issued; `ms` and `engine_ms` are their summed wall
   times inside the container (process start, graph load and answer; median about 0.25 to 0.29
   seconds per command). `meta` holds per call the exit code and node count, the definition rule, and
   the counts of nodes without a file and unmapped files. Each record also carries `config_name`, as
   `sweep.js` writes it.

The packing runs in a container of the same image with `--network none`, where `/build` holds only
`arms/`, `tasks/` and `facts/cache/` of the build, read-only. `sealed/` and `audit/` do not exist in
it.

## 3. The 10 configurations

Written from the installed source before any configuration ran, and not changed after. Every one is
file granularity, signature form, no padding. `<def>` is graphify's node id of the seed definition
(section 2, step 2), `<path>` the seed file, `<text>` is `"<name> <path>"`.

| # | Name (hash) | What a user types | Why it is a shipped use |
|---|---|---|---|
| 1 | `affected` (`a462004de8ae5996`) | `graphify affected "<def>"`; `graphify affected "<path>"` | The blast-radius command, at its defaults (depth 2, the 15 default relations). Run on the definition and then on its file, because the seed is both; the definition's hits come first. |
| 2 | `affected-d4` (`e042d1cd04b47956`) | the same with `--depth 4` | Deeper blast radius. |
| 3 | `query-text` (`f036590a21fbf64f`) | `graphify query "<text>"` | The query the always-on instruction tells an agent to run first, at the defaults (budget 2,000, depth 2, breadth-first). Also the native form. |
| 4 | `query-text-full` (`fc466fc7febae80a`) | `graphify query "<text>" --budget 100000` | The budget raised until nothing is cut, which graphify's own truncation notice tells the user to do ("raise the token budget to N to get all"). |
| 5 | `query-text-full-d3` (`03a0d3806bec6a8a`) | `graphify query "<text>" --budget 100000 --depth 3` | Larger budget and one more hop. |
| 6 | `query-seed` (`15a8a9c33c05e92c`) | `graphify query "<text>" --seed "<def>" --seed "<path>"` | Start the traversal at the seed nodes instead of keyword matches (`--seed`, shipped for exactly this), defaults otherwise. Without a definition node, only `--seed "<path>"`. |
| 7 | `query-seed-full-d3` (`66367cd303fdd75b`) | the same with `--budget 100000 --depth 3` | Seeded, nothing cut, one more hop. |
| 8 | `query-seed-dfs-full-d3` (`3cbcf739b50f775c`) | the same with `--dfs` | Depth-first traversal. |
| 9 | `explain-all` (`44f390ae0de2308d`) | `graphify explain "<def>" --all`; `graphify explain "<path>" --all` | The node and every connection (the default shows the 20 most connected in the same order). Definition first, then its file. |
| 10 | `affected+query-seed-full-d3` (`0cd808da0e836734`) | configuration 1, then configuration 7 | A union in a stated order: dependents first, then the seeded neighbourhood. |

Not used, with the reason: `path` needs a second node, which a task does not give; `--context`
filters would be a per-kind program, which the protocol does not allow for a tool that is meant to be
asked in words; `--relation` lists other than the default would be tuning beyond the shipped default
without a documented use; `--no-doc-demotion` only affects document nodes, of which a code-only graph
has none.

What the calls returned (772 tasks each; one command line per task and call):

| Call | Issued | Exit codes | Printed nodes in total | Truncated by graphify's budget |
|---|---|---|---|---|
| `affected <def>` (depth 2 / 4) | 572 / 572 (200 without a definition node) | all 0 | 5,686 / 7,324 | not applicable |
| `affected <path>` (depth 2 / 4) | 772 / 772 | all 0 | 16,310 / 19,340 | not applicable |
| `query "<text>"` default | 772 | all 0 | 50,803 | 764 of 772 answers |
| `query "<text>"` budget 100,000, depth 2 / 3 | 772 / 772 | all 0 | 227,513 / 503,693 | none |
| `query --seed` default | 772 | all 0 | 51,573 | 644 of 772 |
| `query --seed` budget 100,000, depth 3, BFS / DFS | 772 / 772 | all 0 | 314,779 / 84,492 | none |
| `explain <def> --all` / `explain <path> --all` | 572 / 772 | all 0 | 6,797 / 19,678 | not applicable |

graphify never refused a seed as ambiguous or unknown (no exit code 3 or 4). In 2 tasks (T1-0155,
T1-0262) a word of the seed name switched on graphify's automatic `field` context filter for the
query; that is graphify's documented behaviour for such words and was left as it is.

## 4. Empty answers and unmapped nodes

An answer is "empty" when, after the shared projection removes the seed file, no file is left.

| Configuration | Empty answers T1 / T1x / T2 (of 388 / 144 / 240) | Why | Median files in the answer T1 / T1x / T2 |
|---|---|---|---|
| `affected` | 103 / 38 / 2 | T1: 79 no node returned (no incoming call, import, reference, inheritance or use edge reaches the definition or its file within depth 2; mostly tests, fixtures and leaf files), 23 the definition has no graphify node and the file call returned nothing, 1 only nodes of the seed file. T1x: 33, 4 and 1. T2: 2 no node returned. | 4 / 4 / 6 |
| `affected-d4` | 103 / 38 / 2 | the same tasks and reasons (a deeper walk does not help when the first step finds nothing) | 4 / 6 / 9 |
| `query-text` | 0 / 0 / 0 | | 15 / 11 / 14 |
| `query-text-full` | 0 / 0 / 0 | | 83 / 84 / 82 |
| `query-text-full-d3` | 0 / 0 / 0 | | 138 / 151 / 140 |
| `query-seed` | 2 / 0 / 0 | only nodes of the seed file within the 2,000-token cut | 28 / 28 / 30 |
| `query-seed-full-d3` | 2 / 0 / 0 | only nodes of the seed file (2 isolated files) | 67 / 72 / 74 |
| `query-seed-dfs-full-d3` | 3 / 0 / 1 | only nodes of the seed file | 24 / 27 / 22 |
| `explain-all` | 14 / 5 / 0 | only the seed file's own nodes are connected | 6 / 6 / 7 |
| `affected+query-seed-full-d3` | 2 / 0 / 0 | as `query-seed-full-d3` | 67 / 73 / 74 |

"Files in the answer" counts files in the whole ranked list; at a given token budget only a prefix of
them is shown.

Seed file not in graphify's graph: 0 tasks. Definition not found: 32 tasks (section 2, step 2).
Returned nodes that could not be mapped to a repository file: 0 files missing from the shared facts;
114 explain lines whose neighbour sits in several files (section 2, step 5); and graphify's
`concept` nodes, which have no source file by design (for example, summed over T1, T1x and T2: 415 of
50,803 printed nodes for `query-text`, 4,339 of 51,573 for `query-seed`, 2,732 of 26,475 for
`explain-all`, including the 114; none for `affected`).

## 5. Native form and questions

Native form (addendum 7 item 15): for every task, graphify's own printed answer to `graphify query
"<text>"` at its defaults is kept in `native/query-text.<set>.jsonl.gz` with its token count by the
shared tokenizer (`arms/common/tokenizer.js`). Median 2,203 tokens for T1 (smallest 575, largest
7,336), 2,157 for T1x, 2,208 for T2. graphify's own budget of 2,000 counts 3 characters per token,
and it adds a truncation notice outside its budget, so by the shared tokenizer its default answer is a
little over 2,000 tokens. Every run of the adapter issues this call, whatever the configuration, so
the held-out run produces the native form too.

Questions (addendum 7 item 16): each of the 20 tuning questions was given, as written in
`tasks/tq_questions.jsonl` (including its `[repo at commit a31924a]` prefix and scope sentences), to
`graphify query "<question>"` on the frozen commit's graph, once at the defaults and once with
`--budget 8000`. All 40 calls exited 0. Answer sizes by the shared tokenizer: median 2,595 tokens
(largest 2,700) at the default, median 8,284 (largest 8,983) at budget 8,000. The raw answer text is
kept per question with its command line, time and token count. No per-kind program was written;
the question text is the only input.

## 6. Checks without references (all passed; `checks.tune.json`)

1. Every answer file has every tuning task of its set exactly once: 30 of 30 files, 388 / 144 / 240
   records, no task missing, no duplicate.
2. The record validates against the stored format: the record keys, the item keys and the per-budget
   keys equal those of the stored tuning answers of the frozen typed arm
   (`results/relational/tune/007d6507a8c9d1af.T1.jsonl.gz`); arm `graphify`, granularity `file`,
   form `signature`, pad `none`, the configuration hash in every record. 0 mismatches.
3. Budgets are respected: at every budget the shown tokens (whole items plus the cut item) and
   `used` (with the footer) are at most the budget in every record. 0 over.
4. No padded item in any answer; every empty answer carries a reason.
5. The native files hold every task once (772 rows); the question files hold 20 questions each.

## 7. How to run

From `G/adapter/` on the host (Node 24 and Docker; the runner starts every container itself, at most
one at a time, each with `--network none`, 6 CPUs and 4 GB):

```sh
node run.js all                                   # the whole tuning run above (graphs, calls, pack, tq, check)
node run.js calls --configs affected --sets T1 --tasks-file ids.txt   # one configuration on a list of task ids
node run.js pack  --configs affected --sets T1 --tasks-file ids.txt
node run.js hash                                  # adapter code hash and configuration hashes
```

Held-out run, unchanged code, after the grader writes a frozen record
`{"arm": "graphify", "config_name": "<name>", "config_hash": "<16 hex>", "adapter_code_hash": "<sha256>"}`
(the lock refuses any held-out split without it, and refuses when the adapter code hash or the
configuration hash differs; tested on a fake record, which was refused):

```sh
L="--split heldout --allow-heldout --lock <frozen record.json> --out <held-out answer folder>"
node run.js graphs $L --sets T1,T1x,T2,T3,T4      # builds the held-out parents; a T3/T4 removed document
                                                  # is deleted from the export first (graph key <sha>-rm-<hash>)
node run.js calls  $L --sets T1,T1x,T2,T3,T4      # the frozen configuration's calls plus the native query
node run.js pack   $L --sets T1,T1x,T2,T3,T4      # answer files <hash>.<set>.jsonl.gz and native/
node run.js tq     $L                             # the 30 held-out questions, both budgets
node run.js check  $L --sets T1,T1x,T2,T3,T4
```

`--tasks-file <file>` (one task id per line) restricts any step to a list of tasks. The calls step is
restartable: a parent whose results are complete is skipped.

## 8. What was not done, and limits

- No score was computed and no reference was read; the selection among the 10 configurations is the
  grader's (addendum 4 item 1).
- `path`, `--context`, non-default `--relation` lists and the MCP server were not used (section 3).
  The document layer, community labels and `GRAPH_REPORT.md` were not built (code layer only,
  addendum 7 item 18).
- graphify prints no hop or score per node, so those fields are `null`; the order is graphify's.
- `ms` includes a Python process start and a graph load per command (about a quarter of a second).
  The typed arms' times are engine queries on an open store, so times are not comparable as engine
  speed.
- The 10 configurations are fewer than the typed arms' 60 (addendum 7 item 21).
- graphify's default `query` answer is cut by graphify itself at about 2,000 of its tokens; the
  shared packer then cuts at its own budgets. The `full` configurations show what graphify's ranking
  gives when graphify does not cut.
- One repository, these task kinds, graphify 0.9.108's code layer.
