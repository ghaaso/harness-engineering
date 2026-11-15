# graphify step: re-score and run audit (refuter 1)

Written 2026-11-13 by refuter 1 of the graphify step (protocol addendum 7). This audit recomputed the
graphify result with its own code, checked that the run was clean (no leak, the right order, the
network off), checked that graphify was used the way its authors intend, and ran three more graphify
options on the tuning tasks only. It changed nothing under `build/`, nothing in the adapter, the
answers or the grader folder, and touched no container but its own (all started with
`--network none`, at most 6 CPUs and 4 GB, one at a time).

`G` means
`C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/graphify`.
The audit's code and outputs are in `G/audit/rescore/` (scripts `lib.js`, `heldout.js`, `mcspread.js`,
`edge.js`, `tune.js`, `order.js`, `removal.js`, `packcheck.js`, `native.js`, `tq.js`,
`tq_typed_fns.js`, `adapterloss.js`, `handcheck.js`; results in `out/`; the variant run in
`variant/`).

**Verdict in one line.** The run was clean and the scoring holds: every primary, every G-1 to G-4
difference and every native-form and question recall number was reproduced to 4 decimals by code that
does not load the grader's code or `score.js`. No verdict word changes. Three more shipped graphify
options, tried on tuning tasks only, did not beat the frozen configuration by more than one standard
error, so the choice among graphify's options does not explain the held-out gap. This is graphify
0.9.108's code layer, on these task kinds, on one repository; it says nothing about graphify in general.

## 1. Re-score (check 1)

Method. The scoring rule (`content`, addendum 2 item 2) was written again in `lib.js`. It reads the
stored answer records and the held-out lines of `build/sealed/references.jsonl`, and nothing from
`build/arms/` or the grader folder. Recall per task, then the mean per commit (T3: per task; T4: per fix
commit). The paired cluster bootstrap uses its own random generator (xorshift, seed 4242), 10,000
resamples, percentile interval.

| What was recomputed | Result |
|---|---|
| Primary, standard error, recall at 2,000, 4,000 and 16,000 tokens, empty answers: graphify and the 4 comparators on T1, T1x, T2, T3, T4 (25 rows) | 0 differences to the grader's `scores.json` at 4 decimals |
| Per-task recall of graphify at 2,000, 4,000, 8,000 and 16,000 tokens (770 tasks, 3,080 values) | 0 differences to the grader's per-task file |
| G-1 to G-4 point differences on T1, T2, T3, T1x, T4, T1 at 2,000 and 4,000 tokens, the seed split (5 groups), the five-commits-dropped sensitivity, the empty-seed exclusion | 0 differences at 4 decimals |
| Their interval ends | all within 0.005 except 6 ends on small groups (next row) |
| The 6 ends that differ by more than 0.005: G-2 and G-3 mobile lower end (31 commits), G-2, G-3, G-4 web-without-root (7 commits), G-4 on T3 lower end (25 tasks) | differences 0.0055 to 0.0123. Over 20 bootstrap seeds of 10,000 resamples each, every grader end lies inside the range my own ends cover (`out/mcspread.json`). These are Monte Carlo noise, not a scoring difference |
| Verdict words of G-1 to G-4 under addendum 7 item 17 | the same: G-1 "better" for the typed primary; G-2, G-3, G-4 "inconclusive" |
| Commits where graphify is higher / lower / tied against the typed primary on T1 | 17 / 44 / 14, as reported |
| T3 by parent commit (4 parents) | G-1: graphify higher on 1, lower on 2, tied on 1; G-2 and G-3: higher on 3 of 4; G-4: higher on 4 of 4, as reported |
| Median whole files shown at 8,000 tokens on T1 | graphify 18, typed 30.5, scripted search 26, as reported |
| Native form (G-5): reference files named as whole paths in graphify's own default answer text | T1 0.3443 per commit, 0.2424 pooled, median 2,181.5 tokens (1,895 to 3,251), 417 of 418 answers cut by graphify's own budget, median 64 NODE lines naming 15 files; T2 0.0723; T3 0.2058. Differences native minus each arm at 2,000 tokens: +0.034, -0.102, -0.015, -0.031, -0.035, all equal; interval ends within 0.002 |
| Questions (G-6), recall | graphify defaults 0.1944 on 30 questions and 0.1742 on the 22 untouched; `--budget 8000` 0.3472 and 0.3826; with the looser path-only rule 0.2611 and 0.4325. All equal the report |
| Questions, precision and F1 | precision depends on how candidate items are read out of graphify's text, which the report states only in words. My own reading gives macro precision 0.066 and F1 0.067 at the defaults (report 0.069 and 0.072) and 0.060 and 0.070 at `--budget 8000` (report 0.064 and 0.078). Same picture: graphify's answer names many candidate items (a median 26 at the defaults by the report's reading, 35 by mine) and finds few of the asked items |
| Typed store and scripted search on the questions | macro F1 0.745 and 0.645 on 30, 0.834 and 0.676 on 22, equal to the report |
| Tuning selection | all 10 configurations re-scored on the 388 T1 tuning tasks: the best is `affected+query-seed-full-d3` 0.688 (standard error 0.0304), the threshold 0.6576, eligible `query-seed-full-d3` 0.6816, `query-text-full-d3` 0.6709 (both complexity 3) and the union (complexity 4); the rule picks `query-seed-full-d3`, as frozen |

Two wording points in RESULT.md need a qualification, neither changes a verdict:

- RESULT.md section 3 says that on T1x "each interval" excludes zero. For G-4 on T1x (9 commits) the
  upper end of the interval moves between -0.005 and +0.001 across bootstrap seeds (400,000 resamples:
  -0.0035). It excludes zero only narrowly and not for every seed.
- G-4 on T3 is reported as [-0.007, +0.415]; with 400,000 resamples the lower end is -0.013. T3 carries a
  sign only, so nothing rests on it.

Two ends near zero that do hold: G-3 on T1 (upper end between -0.0052 and -0.0019 over 20 seeds) and
G-2 on T1 at 2,000 tokens (upper end between -0.0026 and -0.0002).

## 2. Leak and order (check 2)

| Check | Result |
|---|---|
| Graph inputs | `run.js` builds each graph from `git archive <parent sha>` into a tar under `G/exports/`, mounts only that tar (read-only), an output folder and the adapter (read-only), and deletes the export afterwards. `G/exports/` is empty. The 79 held-out graphs are keyed by their parent commit, and every held-out task's call record names the graph of its own parent |
| Removed documents | for all 33 held-out T3 and T4 tasks with a removed document, the removal list of the task, of its reference and of its graph's `removed.txt` are equal (0 differences). No held-out graph has any node whose source file ends in `.md`: the code-only build reads no Markdown at all, so graphify could not have seen the documents even without the removal |
| Network | there is one `docker run` in the adapter (`run.js`, function `docker`), and it always passes `--network none --read-only`. The runner's driver only calls `run.js`. None of the 79 extract logs mentions a URL, a connection, a download or a model key |
| Sealed material | the build container mounts the tar; the call container mounts the graphs, the adapter and the job file; the pack container mounts `build/arms`, `build/tasks` and `build/facts/cache` only. `build/sealed/` and `build/audit/` are never mounted. `build/arms/` holds no reference or label file |
| Adapter hash at the held-out run | recomputed by my own code: code hash `bf4244214db5...` and all-files hash `6a7f7349e706...`, both equal to `FROZEN.json`, all 7 files equal one by one. Adapter files were last changed 14:04 to 14:09 UTC, before the freeze |
| Order | selection written 14:26:48 UTC, `FROZEN.json` 14:27:20 UTC. The last tuning file was written 14:21:45 UTC. The earliest held-out graph is from 14:31:00 UTC and the earliest held-out answer-folder file from 14:37:43 UTC; no held-out file predates the freeze. Scoring started 14:54:30 UTC, after the last held-out file (14:49:12 UTC). The source-text trees were added at 14:47:41 UTC, after the freeze and before the pack repeat |
| Held-out ids during fitting | 0 held-out task ids and 0 held-out-only parent commits in any of the 101 files under `G/answers/tune/` (answers, raw calls, logs, native texts), nor in `G/grader/` (tuning part), `G/image/` or `G/orchestrator/` other than the tree fill record, which is the held-out run's input step. Tuning questions answered: ids 1 to 20 only; held-out questions are 21 to 50. The one held-out-listed parent built during tuning is the frozen commit `a31924a3`, used for the 20 tuning questions, as ADAPTER.md states |
| The source-text trees (RESULT.md section 9 said these were not checked) | checked here: in every held-out task, every file that both graphify's answer and a comparator's stored answer show in full has the same signature lines, line range and token count. 33,869 file items against the typed primary, 24,354 against scripted search, 24,330 and 25,750 against the two floors; 0 differ. The filled trees render exactly as the trees the comparators were packed with |
| graphify determinism | my variant run repeated graphify's default `query` on all 772 tuning tasks: 772 of 772 printed texts are byte-identical to the tuning run's |

Check 2 holds.

## 3. Fair use of graphify (check 3)

Read inside the image (graphify 0.9.108, metadata repository `github.com/Graphify-Labs/graphify`; the
copy in `G/image/src` has the same sha256 for `serve.py`, `cli.py` and `affected.py`).

- What the authors intend. The always-on instruction block tells an agent to run
  `graphify query "<question>"` before any search, and to use `path` and `explain` for follow-ups. The
  MCP tool `query_graph` defaults to depth 3 and a 2,000-token budget. `--seed` is documented ("start at
  node X (id, label or file path) instead of the question's keyword matches"), and graphify's own
  truncation notice tells the user to raise `--budget` to get everything. So the frozen configuration
  (`query --seed <def> --seed <path> --budget 100000 --depth 3`) is a documented use and more generous
  than the default single call: the default `query "<text>"` scored 0.390 on T1 tuning against 0.682.
- What the code layer is. In `cli.py`, `--code-only` skips only the model pass, and that pass reads only
  documents, papers and images (`semantic_files = doc_files + paper_files + image_files`); code files
  get the same parser edges either way. A full build would add document nodes and their links to code,
  not new code-to-code links. That layer is outside this step (addendum 7 item 18).
- Seed-mode order (`serve.py _subgraph_to_text`): seeds first, then every other node by hop distance,
  then by degree (highest first). A deeper `--depth` therefore only appends nodes after the depth-3 ones.

Options not among the 10 that could plausibly do better, tried on the tuning split only (772 tasks;
the same graphs, the shared packer, file granularity, signature form; code in
`G/audit/rescore/variant/`, a patched copy of the adapter; the frozen adapter was not touched):

| Variant | What a user types | T1 tuning primary | T1x | T2 | Difference to the frozen configuration on T1 (95 % interval, 65 commits) |
|---|---|---|---|---|---|
| frozen `query-seed-full-d3` | `graphify query "<text>" --seed "<def>" --seed "<path>" --budget 100000 --depth 3` | 0.6816 (standard error 0.0307) | 0.3966 | 0.6239 | |
| `query-seed-full-d6` | the same at `--depth 6`, the largest depth graphify accepts | 0.6868 | 0.4035 | 0.6230 | +0.0052 [+0.0005, +0.0122] |
| `query-seedfile-full-d3` | `--seed "<path>"` only, the file as documented, no definition id | 0.6817 | 0.3966 | 0.6239 | +0.0001 [0.0000, +0.0003] |
| `community` | MCP `get_community` for the seed definition's community, then the seed file's, unbounded, in graphify's printed order | 0.2766 | 0.1480 | 0.2632 | -0.405 [-0.470, -0.342] |
| (for reference) best of the 10, `affected+query-seed-full-d3` | | 0.6880 | 0.3976 | 0.6571 | +0.0065 [+0.0010, +0.0135] |

None is better than the frozen configuration by more than one standard error (0.0307). The held-out
result does not understate graphify because of which of its options was chosen. Not tried: graphify
inside an agent loop (no agent in this step), the document and model layer, MCP tools that need GitHub
(`get_pr_impact`, `triage_prs`; they need the network and a pull request), and packing graphify's
nodes at symbol rather than file granularity (that is a choice of the shared packer, fixed by
addendum 7 item 7 for every arm, not a graphify option).

## 4. Adapter loss (check 4)

| Loss | Held-out count | What it costs graphify |
|---|---|---|
| Printed nodes with no source file (graphify's `concept` nodes: external packages and names) | 41,390 of 547,622 printed nodes (7.6 %) | none: they name no repository file and take no budget |
| Printed nodes with a file that could not be mapped to the shared facts | 0 | none |
| Seed file not in graphify's graph | 0 of 770 | none |
| Seed definition not found as a graphify node (the file seed is still passed) | 34 of 770 (T1: 23 tasks, mean recall 0.670, above the T1 task mean) | about zero: on tuning, dropping the definition seed altogether changed T1 by +0.0001 |
| Files graphify returned that the shared projection dropped (other than the seed file) | 0 tasks, 0 files: in all 770 tasks the packed file list is graphify's distinct-file order, seed file left out, item for item, and the unit count equals graphify's distinct-file count | none |
| Reference files that have no node in graphify's graph of that parent | 0 of 3,872 (T1: 0 of 2,562) | none: every reference file was reachable in principle |
| Answers left empty because every returned node lies in the seed file (shared projection) | 5 of 770 (T1 2) | T1 primary 0.5635 with them, 0.5653 without; G-1 -0.137 becomes -0.135 |

The packer renders signature lines from the typed facts, but it never removed a file graphify chose,
and the rendering of each file equals the comparators' rendering (section 2). The gap to the typed
graph is in which files graphify ranks first, not in the adapter.

## 5. Hand check of 10 held-out tasks (check 5)

Picked by the smallest sha256 of `<id>refuter1`: T1-0583, T1-0701, T1-0426, T1-0714, T2-0392,
T2-0303, T3-025, T3-023, T1x-0152, T4-007. For each, graphify's raw command line and printed nodes, its
file order, the packed answer at 8,000 tokens, and every reference file and definition with its rank
and shown lines are in `G/audit/rescore/out/handcheck.txt`. The credit worked out item by item equals
the scored value in all 10: 0.400, 0.909, 1.000, 0.421, 0.333, 0.000, 1.000, 0.667, 0.286, 0.727.

What the 10 show: graphify ranks the seed's direct imports and the most connected files first (for
example a `package.json` among the first 6 files in 5 of the 10), so large hub files fill the 8,000
tokens early; a reference file it ranks 19th or later is usually not shown. In T1-0714 (web seed) and
T1x-0152 (web test seed) the mobile or backend reference files are absent from graphify's whole answer,
because its graph has no link from a client call to a route.

## 6. What this audit did not do

- It did not recompute the link-group analysis (RESULT.md section 6) or the build-cost table (section 8).
- Question precision and F1 were reproduced only approximately (section 1).
- The floors' tuning-to-held-out drops (0.115, 0.170) were not recomputed; the typed and search drops were
  (0.085 and 0.135).
- Nothing here measures graphify used by an agent, its document layer, or any other repository.
