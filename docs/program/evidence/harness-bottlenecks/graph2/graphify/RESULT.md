# graphify held-out result (protocol addendum 7, sections E and F)

Written 2026-11-13 by the held-out grader for the graphify step. It scores, once, the answers that
graphify's code layer gave on the held-out known-answer tasks and questions, and states the
comparisons that addendum 7 declared before graphify was installed. Nothing was re-run: no graphify
call, no arm, no configuration and no answer file was changed after scoring started
(2026-11-13 14:54:30 UTC). Aggregates only; the per-task and per-question values stay in the grader
folder named at the end.

What was tested: graphify 0.9.108 (PyPI package `graphifyy`), its code layer only (the graph its
parser builds, no model, no document layer), asked through its own `query` command with the seed
definition and seed file as start nodes, depth 3 and a budget large enough that graphify cuts
nothing (`query-seed-full-d3`, chosen on the tuning split by the grader's rule from 10 shipped
configurations). graphify's ordered list of files was packed by the shared packer exactly as for
every other arm, so the comparison is about which files graphify picks and in what order. This is
one repository, these task kinds, graphify's code layer; it is not a statement about graphify in
general.

## Headline

1. On the 418 held-out change-completion tasks (T1, 75 commits), graphify's code layer showed
   0.564 of the reference files and definitions inside an 8,000-token answer, against 0.700 for the
   typed graph: a difference of -0.137 (95 % interval -0.188 to -0.088), and by the declared rule
   the typed graph is "better" (the sign is the same on T1, T2 and T3).
2. Against scripted search (0.625), the changed-together floor (0.638) and the same-folder floor
   (0.549) the declared verdict is "inconclusive" each time: -0.061 [-0.129, +0.007],
   -0.074 [-0.145, -0.003] with the opposite sign on T3, and +0.014 [-0.057, +0.082].
3. Where the seed file lives decides most of this: on mobile-app seeds (31 commits, 152 tasks)
   graphify scored 0.638, -0.019 [-0.092, +0.038] from the typed graph and +0.131 [+0.038, +0.215]
   above scripted search; on backend seeds (45 commits, 236 tasks) it scored 0.472, -0.227
   [-0.295, -0.163] below the typed graph and -0.214 [-0.292, -0.142] below scripted search.
4. Of the 336 T1 reference files that the typed facts connect to the seed only through a
   route-to-client, table, setting or changed-together link, graphify showed 0 inside 8,000 tokens,
   the typed graph 66 and scripted search 91; on the remaining 2,226 reference files graphify showed
   0.604 of them, the typed graph 0.722 and scripted search 0.613.
5. graphify's own default answer text (median 2,182 tokens) named 0.344 of the T1 reference files,
   against 0.447 for the typed graph's 2,000-token answer and 0.360 for scripted search's.
6. On the 30 held-out code questions, graphify's answer to the question text scored macro F1 0.072
   (typed graph 0.745, scripted search 0.645), with answers of median 2,547 tokens against median
   31 and 29.5 tokens of final answer for the other two.

## 1. Checks before scoring

- Inventory: all 106 files listed in the runner's `INVENTORY.json` exist with the listed size and
  sha256, no unlisted file is in the answer folder, and the inventory's own sha256 equals the value
  in `RUN.md`.
- Freeze: the adapter code hash recomputed independently (`bf4244214db5...`) and the all-files
  hash (`6a7f7349e706...`) equal `FROZEN.json`; all 7 adapter files match one by one.
- Comparators: the 22 stored comparator files used here (typed primary, scripted search, both
  floors, five sets each, plus the typed and search question answers) equal the finished test's
  inventory by sha256.
- Scorer: `build/arms/common/score.js`, rule content, against the held-out lines of
  `sealed/references.jsonl` (the same file the finished test scored with). Every comparator row
  (tasks, primary, standard error, recall at 2,000, 4,000 and 16,000 tokens, area under the curve)
  reproduces the finished test's stored value exactly, 0 mismatches. An independent re-scorer that
  does not load `score.js` reproduced all 1,540 graphify values (770 answers at 2,000 and 8,000
  tokens), 0 differences. No reference was missing for any answer.

## 2. Table per arm and set

Primary = recall of reference files and definitions inside the 8,000-token answer, averaged per
commit (T3: per task, 25 tasks; T4: per fix commit). r2k, r4k, r16k = the same at 2,000, 4,000 and
16,000 tokens. Median tokens = tokens used by the 8,000-token answer, median over tasks.

| set (tasks / clusters) | arm | primary +- standard error | r2k | r4k | r16k | median tokens | empty answers |
|---|---|---|---|---|---|---|---|
| T1 (418 / 75) | graphify code layer | 0.564 +- 0.027 | 0.297 | 0.416 | 0.743 | 7,999 | 2 |
| | typed primary | 0.700 +- 0.022 | 0.416 | 0.560 | 0.832 | 7,999 | 0 |
| | scripted search | 0.625 +- 0.031 | 0.346 | 0.458 | 0.764 | 7,999 | 0 |
| | changed-together floor | 0.638 +- 0.033 | 0.362 | 0.475 | 0.772 | 7,999 | 0 |
| | same-folder floor | 0.549 +- 0.031 | 0.338 | 0.435 | 0.720 | 7,999 | 0 |
| T2 (237 / 49) | graphify code layer | 0.471 +- 0.038 | 0.207 | 0.331 | 0.685 | 7,999 | 1 |
| | typed primary | 0.629 +- 0.038 | 0.260 | 0.415 | 0.841 | 7,999 | 0 |
| | scripted search | 0.596 +- 0.038 | 0.281 | 0.443 | 0.770 | 7,999 | 0 |
| | changed-together floor | 0.602 +- 0.044 | 0.240 | 0.398 | 0.748 | 7,999 | 0 |
| | same-folder floor | 0.340 +- 0.053 | 0.144 | 0.227 | 0.559 | 7,999 | 0 |
| T3 (25 / 25) | graphify code layer | 0.625 +- 0.079 | 0.377 | 0.487 | 0.710 | 7,999 | 0 |
| | typed primary | 0.643 +- 0.076 | 0.417 | 0.583 | 0.787 | 7,999 | 0 |
| | scripted search | 0.480 +- 0.081 | 0.297 | 0.433 | 0.667 | 7,999 | 0 |
| | changed-together floor | 0.473 +- 0.079 | 0.333 | 0.413 | 0.617 | 7,999 | 0 |
| | same-folder floor | 0.423 +- 0.078 | 0.223 | 0.313 | 0.580 | 7,999 | 0 |
| T1x, cross-runtime, descriptive (82 / 9) | graphify code layer | 0.364 +- 0.047 | 0.170 | 0.263 | 0.440 | 7,999 | 1 |
| | typed primary | 0.518 +- 0.065 | 0.224 | 0.355 | 0.654 | 7,999 | 0 |
| | scripted search | 0.517 +- 0.083 | 0.186 | 0.337 | 0.687 | 7,999 | 0 |
| | changed-together floor | 0.517 +- 0.093 | 0.203 | 0.358 | 0.683 | 7,999 | 0 |
| | same-folder floor | 0.523 +- 0.103 | 0.184 | 0.355 | 0.673 | 7,999 | 0 |
| T4, defect register, descriptive (8 / 4) | graphify code layer | 0.472 +- 0.110 | 0.357 | 0.403 | 0.549 | 7,999 | 1 |
| | typed primary | 0.702 +- 0.072 | 0.419 | 0.607 | 0.801 | 7,999 | 0 |
| | scripted search | 0.489 +- 0.111 | 0.322 | 0.367 | 0.700 | 7,999 | 0 |
| | changed-together floor | 0.457 +- 0.205 | 0.353 | 0.420 | 0.590 | 7,999 | 0 |
| | same-folder floor | 0.288 +- 0.162 | 0.248 | 0.282 | 0.493 | 7,999 | 0 |

From tuning to held-out, graphify's T1 primary fell from 0.682 to 0.564 (-0.118). The finished
test's arms fell by 0.085 (typed), 0.135 (scripted search), 0.115 (changed-together floor) and 0.170
(same-folder floor). At 8,000 tokens graphify's answer shows a median 18 whole files, against 30.5
for the typed graph and 26 for scripted search (same packer, same budget).

## 3. Declared comparisons G-1 to G-4

Difference = graphify minus the comparator. Paired cluster bootstrap with
`build/arms/common/compare.js`, 10,000 resamples, seed 20261112, cluster = commit (T3: task).
Verdict by addendum 7 item 17: "better" only if the T1 interval excludes zero and the sign is the
same on T1, T2 and T3; "equivalent" only if the whole T1 interval lies within plus or minus 0.05;
otherwise "inconclusive".

| comparison | T1 primary | T2 primary | T3 primary | T1 at 2,000 tokens | T1 at 4,000 tokens | verdict |
|---|---|---|---|---|---|---|
| G-1 graphify - typed primary | -0.137 [-0.188, -0.088] | -0.158 [-0.238, -0.082] | -0.018 [-0.175, +0.135] | -0.119 [-0.161, -0.078] | -0.144 [-0.195, -0.095] | **better: the typed primary** |
| G-2 graphify - scripted search | -0.061 [-0.129, +0.007] | -0.125 [-0.195, -0.057] | +0.145 [-0.040, +0.337] | -0.049 [-0.102, -0.001] | -0.042 [-0.101, +0.013] | **inconclusive** |
| G-3 graphify - changed-together floor | -0.074 [-0.145, -0.003] | -0.131 [-0.217, -0.046] | +0.152 [-0.070, +0.373] | -0.065 [-0.122, -0.010] | -0.059 [-0.130, +0.012] | **inconclusive** |
| G-4 graphify - same-folder floor | +0.014 [-0.057, +0.082] | +0.131 [+0.016, +0.247] | +0.202 [-0.007, +0.415] | -0.041 [-0.118, +0.035] | -0.019 [-0.091, +0.050] | **inconclusive** |

- G-1: decided by the T1 interval excluding zero with the sign negative on T1, T2 and T3. The same
  rule applied at 2,000 and at 4,000 tokens also gives "better" for the typed primary. Commits where
  graphify scored higher / lower / tied on T1: 17 / 44 / 14.
- G-2: the T1 interval includes zero. At 2,000 tokens the T1 interval excludes zero
  (-0.049 [-0.102, -0.001]) but T3 has the other sign, so the same rule gives "inconclusive" there too.
- G-3: the T1 interval excludes zero (-0.074 [-0.145, -0.003]), but T3 points the other way
  (+0.152), so "better" fails and the interval is not inside plus or minus 0.05.
- G-4: the T1 interval includes zero. graphify is above the same-folder floor on T2 (+0.131
  [+0.016, +0.247]) and on T3 (+0.202), not on T1.
- Sensitivity (five commits most favourable to the leading arm dropped, 70 commits): G-1 -0.100
  [-0.140, -0.059] still excludes zero; G-2 -0.010 [-0.064, +0.047], G-3 -0.024 [-0.082, +0.037] and
  G-4 -0.023 [-0.092, +0.041] all include zero.
- T3 clustered by parent commit (4 parents; carries a sign only): graphify lower than the typed
  primary on 2 parents, higher on 1, tied on 1; higher than scripted search and the changed-together
  floor on 3 of 4; higher than the same-folder floor on 4 of 4.
- T1x and T4 are descriptive (9 and 4 clusters): on T1x graphify is 0.15 to 0.16 below every
  comparator, each interval excluding zero; on T4 no interval excludes zero.

### Split by where the seed lives (T1, addendum 6 item 11)

Difference graphify minus the comparator, primary, 95 % interval. A commit with seeds in two groups
counts in both. The root-level task is T1-0786 (seed `ops-server.mjs` at the repository root); it is
also one of graphify's two empty T1 answers.

| group (commits / tasks) | graphify | typed | search | co-change floor | same-folder floor | G-1 typed | G-2 search | G-3 co-change | G-4 same-folder |
|---|---|---|---|---|---|---|---|---|---|
| mobile app (31 / 152) | 0.638 | 0.657 | 0.506 | 0.502 | 0.466 | -0.019 [-0.092, +0.038] | +0.131 [+0.038, +0.215] | +0.135 [+0.035, +0.225] | +0.172 [+0.098, +0.248] |
| backend (45 / 236) | 0.472 | 0.699 | 0.687 | 0.709 | 0.566 | -0.227 [-0.295, -0.163] | -0.214 [-0.292, -0.142] | -0.236 [-0.314, -0.163] | -0.094 [-0.187, -0.003] |
| web without the root-level task (7 / 29) | 0.511 | 0.664 | 0.639 | 0.656 | 0.773 | -0.153 [-0.319, +0.011] | -0.128 [-0.328, +0.070] | -0.145 [-0.354, +0.074] | -0.262 [-0.428, -0.104] |
| web with T1-0786 (8 / 30) | 0.447 | 0.685 | 0.559 | 0.581 | 0.684 | -0.238 [-0.459, -0.042] | -0.112 [-0.293, +0.059] | -0.134 [-0.323, +0.054] | -0.236 [-0.396, -0.095] |
| outside the mobile app (48 / 266) | 0.488 | 0.705 | 0.681 | 0.704 | 0.575 | -0.217 [-0.283, -0.155] | -0.193 [-0.270, -0.121] | -0.216 [-0.295, -0.142] | -0.087 [-0.173, -0.008] |
| all (75 / 418) | 0.564 | 0.700 | 0.625 | 0.638 | 0.549 | -0.137 [-0.188, -0.088] | -0.061 [-0.129, +0.007] | -0.074 [-0.145, -0.003] | +0.014 [-0.057, +0.082] |

At 2,000 tokens on mobile seeds graphify is -0.080 [-0.148, -0.020] from the typed graph and +0.001
[-0.071, +0.065] from scripted search; at 4,000 tokens -0.087 [-0.158, -0.021] and +0.048
[-0.042, +0.137]. The held-out mix has 36 % of T1 tasks seeded in the mobile app against 17 % on
tuning (finished test, addendum 6 item 11), so graphify's T1 averages depend on that mix. The T2
split is in `result.json`.

## 4. G-5, the native form

For every held-out task the runner kept graphify's own printed answer to `graphify query "<name>
<path>"` at its defaults (budget 2,000 by graphify's own count, depth 2, breadth-first). Matching
rule: a reference file counts as named when its full repository path appears in the text as a whole
path. Only reference files are scored. No reference file of any task is the seed file.

| T1 (418 tasks, 75 commits) | file recall | tokens (median) | native minus this arm, per commit |
|---|---|---|---|
| graphify native text | 0.344 (pooled over files 0.242) | 2,182 (1,895 to 3,251) | |
| graphify, packed, 2,000 tokens | 0.311 | 1,999 | +0.034 [-0.046, +0.114] |
| typed primary, 2,000 tokens | 0.447 | 1,999 | -0.102 [-0.172, -0.033] |
| scripted search, 2,000 tokens | 0.360 | 1,999 | -0.015 [-0.097, +0.068] |
| changed-together floor, 2,000 tokens | 0.375 | 1,999 | -0.031 [-0.117, +0.058] |
| same-folder floor, 2,000 tokens | 0.379 | 1,999 | -0.035 [-0.099, +0.027] |

On T2 (test files) the native text named 0.072 of the reference files, against 0.227 to 0.287 for
the packed answers at 2,000 tokens (same-folder floor 0.149); on T3 0.206 against 0.226 to 0.483.

How the two forms differ. The native text is graphify's traversal printout: a header with the start
nodes, a truncation notice (417 of 418 T1 answers were cut by graphify's own budget), then a median
64 `NODE` lines, each with a label (a function, class, file or docstring), its source file, line
and community number, and no code. One file can appear on many lines, so the 64 lines name a median
15 distinct files. It is meant to be read by an agent that then asks again. The packed form shows
each file once, with its path line and its signature lines, in graphify's order; at 2,000 tokens
that is a median 5 whole files for graphify, 7 for the typed graph and 6 for scripted search. The
native text is also about 9 % longer by the shared tokenizer, because graphify counts about 3
characters per token and prints its notice outside its budget.

## 5. G-6, the questions

Each of the 30 held-out questions was given as written to `graphify query "<question>"` on the
graph of the frozen commit, at graphify's defaults and once with `--budget 8000`. Matching rule
(ours, stated before scoring): a reference item counts as found when its path appears in the answer
(file items), when one line holds its path and the last part of its name (definition items, which
graphify prints as `NODE <label> [src=<path> ...]`), when a migration file with that revision prefix
appears (migration items), when the table name appears as a whole word (table items, which have no
path), when the URL path appears verbatim (route items), or when a line holds the document and line
label (document-line items). Keys of object-shaped references are pooled, because graphify's text
has no keys. Answer items (the denominator of precision) are the distinct candidates of the
reference's form that the answer names (files, definition lines, migration files, table names and
route paths known to the typed facts). Recall on a question with an empty reference counts as 1 when
the answer is not empty (convention of `tq_score.js`). Typed and scripted search answers are scored
with `tq_score.js` exactly as in the finished test (judgement items kept).

| questions | arm | recall | precision | F1 (macro) | answer tokens (median) |
|---|---|---|---|---|---|
| all 30 | graphify, defaults | 0.194 | 0.069 | 0.072 | 2,547 |
| | graphify, `--budget 8000` | 0.347 | 0.064 | 0.078 | 8,206 |
| | typed store | 0.808 | 0.758 | 0.745 | 31 |
| | scripted search | 0.789 | 0.654 | 0.645 | 29.5 (it read a median 694.5) |
| 22 untouched | graphify, defaults | 0.174 | 0.095 | 0.098 | 2,574 |
| | graphify, `--budget 8000` | 0.383 | 0.088 | 0.106 | 8,328 |
| | typed store | 0.874 | 0.852 | 0.834 | 41.5 |
| | scripted search | 0.803 | 0.697 | 0.676 | 29.5 (it read a median 1,008) |

The 22 untouched questions are the 30 without 24, 25, 27, 33, 40, 41, 46 and 47 (addendum 6 item 3).
The typed and search rows equal the finished test's values.

F1 differences (paired bootstrap over questions, descriptive): graphify defaults minus typed -0.673
[-0.803, -0.530] on 30 and -0.736 [-0.854, -0.603] on 22; minus scripted search -0.573 [-0.739,
-0.394] on 30 and -0.578 [-0.771, -0.354] on 22. The `--budget 8000` answers differ from these by
at most 0.01. graphify's default answer names a median 26 candidate items, 39 at `--budget 8000`.
Sensitivity: if a definition item counted when its path alone appears, graphify's macro recall
would be 0.261 (defaults) and 0.433 (`--budget 8000`) on 30 questions, F1 0.078 and 0.084.

Per question kind (macro F1; graphify defaults / typed / search; 3 or 4 questions each):

| kind | questions | graphify | typed | search |
|---|---|---|---|---|
| tables written from a screen | 3 | 0.095 | 0.635 | 0.241 |
| tests reaching a function | 4 | 0.065 | 0.781 | 0.631 |
| invariants on a file | 3 | 0.333 | 0.889 | 0.667 |
| the other half of a rule | 4 | 0.012 | 0.000 | 0.306 |
| readers of a setting | 4 | 0.000 | 0.750 | 0.617 |
| migrations touching a table | 4 | 0.141 | 0.917 | 0.852 |
| clients of a route | 4 | 0.000 | 1.000 | 1.000 |
| what a change reaches | 4 | 0.000 | 0.997 | 0.750 |

graphify's 0.333 on invariants comes entirely from the question whose reference is empty: its code
graph has no document nodes, so it names no document line, and an empty answer to an empty
reference scores 1. On the other half of a rule the typed store also scores 0.

## 6. The group of addendum 7 item 20 (links graphify does not build)

Rule, fixed before any group score was computed. In the typed facts of each task's parent commit,
restricted exactly as the typed primary traverses them (its eight edge classes, confidence at least
0.5, both directions), a breadth-first walk from the seed file and seed definition. The link kinds
graphify does not build are the ones item 20 names: route to client call (`registers_route`,
`calls_url`, `test_calls_route`), table read or write (`reads_table`, `writes_table`,
`writes_column`, `migration_touches`, `foreign_key`), setting read (`reads_setting`) and
changed-together history (`co_changed`). A reference path (a reference file, or the file of a
reference definition) is "only through a missing kind" when it is reachable with every kind but not
once those kinds are removed. A task is in group NEEDS when at least one of its reference paths is
"only through a missing kind". Every other kind stays in both walks, so the split is conservative.

| T1 group (tasks / commits) | graphify | typed | scripted search | graphify - typed |
|---|---|---|---|---|
| NEEDS (82 / 9) | 0.364 | 0.518 | 0.517 | -0.154 [-0.236, -0.068] |
| WITHOUT (336 / 66) | 0.591 | 0.725 | 0.639 | -0.134 [-0.192, -0.081] |

The NEEDS group turned out to be the cross-runtime tasks: it has the same task count, commit count
and arm means as the T1x set.

By reference file (T1, files only, shown inside 8,000 tokens):

| reference files | count | graphify | typed | scripted search |
|---|---|---|---|---|
| reachable only through a missing kind | 336 | 0 (0.000) | 66 (0.196) | 91 (0.271) |
| reachable without the missing kinds | 2,226 | 1,344 (0.604) | 1,606 (0.722) | 1,364 (0.613) |
| not reachable at all | 0 | | | |

Sensitivity with a 3-hop bound (graphify's frozen depth): NEEDS 83 tasks in 20 commits, graphify
0.351 against typed 0.647 (-0.296 [-0.405, -0.187]); WITHOUT 335 tasks in 71 commits, 0.580 against
0.695 (-0.115 [-0.169, -0.067]). Reference files reachable only through a missing kind within 3 hops:
210, of which graphify showed 14, typed 79, search 96.

Questions, grouped by the link kinds the typed store's question program follows: NEEDS 24 questions
(tables from a screen, setting readers, migrations of a table, route clients, the other half, change
reach, and one tests question whose reference test reaches the target only through a route link):
graphify F1 0.043, typed 0.726, search 0.645. WITHOUT 3 questions (tests questions reachable by calls
alone): graphify 0.044, typed 0.756, search 0.619. Document links, 3 questions: graphify 0.333 (the
empty-reference convention), typed 0.889, search 0.667. Even where graphify's code layer has the
links, its answer to the question text is a traversal printout, not a list of the asked items.

## 7. Empty answers

graphify printed at least one node for every seed. After the shared projection removes the seed file
(as for every arm), 5 of 770 answers were empty: T1 2 (one backend seed and the root-level task
T1-0786), T1x 1, T2 1, T4 1, T3 0; the recorded reason for all 5 is "only nodes of the seed file
returned". Primary with those seeds excluded (descriptive): T1 graphify 0.565, typed 0.700, search
0.625, co-change floor 0.639, same-folder floor 0.551 (416 tasks, 75 commits); G-1 to G-4 on T1 become
-0.135 [-0.186, -0.086], -0.060 [-0.128, +0.008], -0.074 [-0.145, -0.003], +0.014 [-0.057, +0.082].
T2 graphify 0.472 against typed 0.627 (236 tasks); T1x 0.366 against 0.512 (81 tasks); T4 0.518
against 0.669 (7 tasks). No verdict depends on the 5 tasks.

## 8. Build cost per parent commit

| measure (held-out parents) | graphify code layer (79 graphs) | typed facts (74 parents) |
|---|---|---|
| build time, median (smallest to largest) | 4.2 s (2.7 to 6.0) extract; 5.0 s whole container | 5.5 s (3.4 to 11.5) |
| stored size, median | 4.06 MB (`graph.json`) | 5.00 MB (nodes, edges, commits files) |
| nodes, median | 3,493 | 4,002 |
| edges, median | 9,714 | 13,356 (evidence rows before merging) |

Paired by parent (70 parents built without a removed document), graphify has a median 0.86 times
the nodes, 0.71 times the edges and 0.79 times the bytes of the typed facts, and its extract takes
0.74 times the typed build's recorded time. graphify's times are `graphify extract --code-only` in a
container with 6 CPUs, 4 GB and the network off; the typed facts' times are the shared extractor's own
record from an earlier lane (export, Python, TypeScript, documents and git-history stages), under
conditions not recorded here, so times compare only roughly. graphify's graph has no route, URL,
table, setting or changed-together relation; every one of its edges comes from the parser.

## 9. Limits (addendum 7 section F, in measured terms)

- Code layer only (item 18). graphify's model-read document layer, community labels and report were
  not built or run; the one independent gain reported for graphify sits in that layer. On the 3
  questions about documented invariants its code graph has no document node to name.
- No agent (item 19). graphify's native answer is written for an agent that reads it and asks again;
  here each task got one call and one answer. Nothing here measures tokens in a session or whether an
  agent would use the tool.
- Missing link kinds (item 20). In T1, 336 of 2,562 reference files (13 %) on 82 of 418 tasks are
  reachable from the seed only through a route-to-client, table, setting or changed-together link;
  graphify showed none of them. Without those tasks graphify still trails the typed graph by -0.134
  [-0.192, -0.081]. 24 of the 30 questions belong to kinds that follow such links.
- Tuning effort (item 21). graphify had 10 configurations against 60 per typed arm. Its chosen
  configuration scored 0.682 on tuning against 0.688 for its best (a union of two commands, inside
  one standard error).
- One repository (item 22), these task kinds, graphify 0.9.108's code layer. Never to be read as
  "graphify does not work" or "graphify is worse in general".
- The question matching rule is ours. It is generous to graphify (keys pooled, tables matched as
  words anywhere). The one looser rule tested (a definition counts on its path alone) moves
  graphify's macro F1 by under 0.01; no stricter rule was tested.
- The question answers of the typed store and scripted search are lists of items; graphify's is
  text, so its precision depends on how candidates are read out of the text (section 5). The
  typed side's own costs (knowing the schema, a query program per question kind) are not counted.
- Packing depended on source-text trees that the orchestrator added to the shared cache before the
  packing step (RUN.md section 3); they were made by the shared recipe and were not checked here
  beyond the packer reading them.
- T3 has 25 tasks from 4 parent commits and 3 documents; it carries a sign, not an effect size. T1x
  and T4 are descriptive.
- Every answer of every arm fills its 8,000-token budget (median 7,999 tokens), so tokens never
  separate the arms on T1, T2 or T3.

## Files

Grader folder (scratch, outside the repository; grader only; per-task and per-question values and
per-commit difference arrays stay there):
`C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/graphify/grader/heldout/`
- `verify_inventory.js` -> `verify_inventory.json`; `SCORING_STARTED`; `progress.log`
- `score_g.js` -> `scores.json`, `clusters.jsonl`, `tasks.jsonl.gz`; `handcheck.js` -> `handcheck.json`
- `compare_g.js` -> `comparisons.json` (G-1 to G-4, seed split, T3 by parent, sensitivity, empty answers; per-commit differences as number arrays)
- `native_g.js` -> `native_g.json`, `native_g.tasks.jsonl.gz`
- `tq_g.js` -> `tq_g.json`, `tq_g.per_question.json`
- `linkgroups.js` -> `linkgroups.json`; `buildcost.js` -> `buildcost.json`
- `make_result.js` -> this folder's `result.json` (aggregates only)
