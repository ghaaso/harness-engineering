# SPEC: what every arm computes (the cross-check contract)

This file is the exact specification a graph-engine arm must match. Where it says "must", the
reference arm (`arms/reference/ref.js`, plain JavaScript) and the relational arm
(`arms/relational/*`, SQLite) both do exactly this, and the cross-check (`sweep.js` with
`equiv.js`) fails on any difference. Protocol: `protocol.md`, addendum 1 (environment) and
addendum 2 (sections A to E). Everything here is independent of the engine.

Notation: `S` = the seed node ids of one task, `|S|` their count. "Round12(x)" =
`Math.round(x * 1e12) / 1e12` (JavaScript, round half up on the scaled double); "Round9" likewise with
1e9. Node ids are integers 1..N.

## 1. The arm module contract

An arm lives in `arms/<name>/` and has:

- `arm.js` exporting `open(G, opts)` (may be `async`) that returns
  `{ rank(seedIds, cfg, seed), close(), tq?(question) }`. `rank` and `close` may return promises; the
  harness awaits both. `opts = { store, parent, removePaths }`: `store` is a folder for the arm's
  database files (`GT_STORE/<name>`; inside `graphtest:1` this must be the container filesystem or a
  named volume, never `/build`).
- `sweep.js` exporting `STAGE1`: exactly 40 named configurations (section 9), one factor at a time
  around the arm's own `BASE`. Optional `stage2.json`: exactly 20. The harness refuses any other
  size and logs a hash of each list (`results/sweep/lists.jsonl`).

`rank(seedIds, cfg, seed)` returns either the ranked array, or
`{ ranked, engine_ms, lookups?, meta? }`, where `engine_ms` is the time the arm measured inside the
engine for this query (query execution and result fetch, excluding harness work). The harness
records wall time (`ms`) separately. `ranked` is an array in rank order, seeds excluded, of
`{ i, hop, score, via, path }`:

| field | meaning |
|---|---|
| `i` | canonical node id |
| `hop` | minimum depth at which the node was reached (section 6) |
| `score` | the ranking score, rounded as in section 8; `null` for `bfs` |
| `via` | edge-kind names along the explanation path, seed first |
| `path` | node ids of the explanation path, a seed first, `i` last (`path.length = hop + 1`) |

The harness then projects, pads and packs (section 10); arms never pack.

Built-in arm `none` (no folder) ranks nothing. With `pad: "DIR"` or `pad: "CO"` it is the DIR or CO
floor (addendum 2, B.8).

## 2. Input: the canonical graph (addendum 2, D.15 and E.18)

Every arm loads the same canonical graph. Either call `loadFacts(sha, {removePaths})` from
`common/facts.js`, or load the plain files written by `exportCanon(G, dir)`
(`node common/run.js canon --parent <sha> [--remove <path>] --out <dir>`), whose `canon.json` holds a
content hash: an engine has loaded the right input when its own hash of the files matches.

Loader conventions:

- Nodes: the facts' node rows, de-duplicated by string id, sorted by string id (JavaScript `<` on
  UTF-16), integer id = position + 1. A T3/T4 task's `remove_paths` drop every node with that path
  and every edge whose evidence path is that path.
- Edges: one edge per (kind, source, target); self loops dropped; edges whose endpoint is missing
  dropped. `weight` = the highest confidence over the evidence rows (missing confidence = 1);
  `n_ev` = the number of evidence rows.
- `co_changed` is symmetric: the extractor's two directed rows of a pair become one edge with
  `src` = the smaller id, `dst` = the larger, weight = the higher confidence. Every other kind is
  directed.
- The class of an edge: `classOf(kind, kind of the source node)` (section 3).
- Edge order: by `src`, then kind id (kinds sorted by name, id = position + 1), then `dst`.
- Only `extractor_version` is read from `meta.json`. `commits.jsonl` may hold only kept commits.

Files (UTF-8, LF, header row, RFC 4180 quoting, numbers in JavaScript's shortest round-trip form,
empty field = null):

- `nodes.csv`: `id,sid,kind,path,name,ls,le,runtime,slice,is_test,file,tokens,text`. `file` = id of
  the `file` or `doc` node with the same path (0 if none). `text` = the indexed text (section 8.6).
- `edges.csv`: `kind,class,src,dst,weight,n_ev`, one row per canonical edge.
- `edges_<kind>.csv`: `class,src,dst,weight,n_ev`, the same rows split by kind (DuckPGQ needs one
  edge table per label; addendum 1).
- `canon.json`: `hash` = sha256 of the lines `"<file name> <sha256 of file>\n"` over the files sorted
  by name; plus per-file sha256, counts, loader and extractor versions.

## 3. Edge classes

| class (index) | kinds |
|---|---|
| structure (0) | defines, has_column, maps_table, includes_router, contains (source not runtime/slice/invariant_group) |
| membership (1) | contains (source kind runtime, slice or invariant_group) |
| imports (2) | imports, uses_constant |
| calls (3) | calls, renders, passes_callable, depends_injects, inherits, navigates, registers_screen |
| http (4) | calls_url, registers_route |
| tests (5) | test_calls_route, mocks, overrides |
| data (6) | reads_table, writes_table, writes_column, foreign_key, migration_touches, migration_follows |
| config (7) | reads_setting, enqueues_kind, kind_handled_by, registers_job, runs |
| capability (8) | same_capability, contract |
| docs (9) | cites, mentions, constrains |
| history (10) | co_changed (symmetric) |
| experimental (11) | reads_response_field, returns_model, has_field (not loaded by default) |

Structural classes (left out of the hub in-degree): structure, membership.

## 4. Arcs

An arc is one edge seen from one end. For node `u`, direction `dir`, class set `M` and confidence
floor `c`:

- every directed edge `u -> v` gives a forward arc to `v` (orientation 0) when `dir` is
  `dependencies` or `both`;
- every directed edge `v -> u` gives a reverse arc to `v` (orientation 1) when `dir` is `dependents`
  or `both`;
- every symmetric edge `{u, v}` gives exactly one arc to `v` (orientation 0) in every direction;
- the edge's class must be in `M` and its weight `>= c`.

So with `both`, a pair joined by a directed edge in each direction gives two arcs; arcs are a
multiset (one per edge). An arc is identified by `(u, v, kind, orientation)`.

`minConf` (default 0.5) applies to unweighted traversals (k-hop, budgets, metapaths, the reach DAG,
the degree-normalised out-degree). Weighted rankings (PageRank transitions, co-change score) use
every edge whatever its weight. Hub measures ignore it.

## 5. Hub handling (`hub`)

A blocked node is reached but never expanded (no arcs leave it in any traversal; in PageRank it has no
transitions). Seeds are never blocked.

- `none`: nothing is blocked.
- `indeg` with `k`: `prod_in(v)` = the number of edges with an active class (in `cfg.classes`) that is
  not structural, whose target is `v` and whose source is not a test node (`is_test = 0`); a symmetric
  edge `{a, b}` counts for `b` when `a` is not a test and for `a` when `b` is not a test. Blocked when
  `prod_in(v) > k`. Edge weights and `minConf` do not matter.
- `transport`: blocked when the node kind is runtime, slice, invariant_group, ambiguous_ref or
  missing_ref; or when the node kind is function, method or class, the node is not a test, and its
  incoming edges of kind calls, depends_injects or passes_callable whose source is not a test and has
  a non-null slice come from 3 or more distinct `runtime + "/" + slice` strings (a null runtime is the
  string `null`). Independent of the configuration's classes.

## 6. Traversal (`traversal`)

All traversals are breadth-first from the seed states at depth 0. `H` = `traversal.hops` (`null` =
no cap): only states at depth `d < H` are expanded. A node's `hop` is the minimum depth of any of its
states. Reached nodes = every node with a state; candidates `R` = reached nodes minus seeds (and, for
a metapath with `emit: "end"`, only nodes with an accepting state).

**Reach DAG.** A DAG arc is an arc `(u, v, kind, orientation)` that the traversal may take from an
expanded state of `u` whose depth is `d` (the state's own first-visit depth, which can exceed
`hop(u)` in state modes) into a node with `hop(v) = d + 1`. Each `(u, v, kind, orientation)` counts
once. `npar(v)` = the number of distinct `u` among DAG arcs into `v`.

### 6.1 `khop`
State = node. Arcs: section 4 with `cfg.direction`, `cfg.classes`, `cfg.minConf`.

### 6.2 `budget` (per-class budgets)
`budgets` maps classes to integers 1..9; `cfg.classes` = those classes. The state is a mixed-radix
counter: classes sorted by class index, `mult_c` = product of `(b_c' + 1)` over the classes before
`c`; state 0 at the seeds. From state `s` an arc of class `c` may be taken when
`floor(s / mult_c) mod (b_c + 1) < b_c`, leading to state `s + mult_c`. Arcs: section 4 with
`cfg.direction`, the budget classes, `cfg.minConf`. A configuration whose state count
`prod (b_c + 1)` exceeds 8,192 is rejected by `config.normalise` (every arm rejects it identically).

### 6.3 `metapath` (ordered)
`steps`: 1 to 8 steps `{classes, kinds, dir, min, max}`; `dir` in out | in | both (default both);
`0 <= min <= max`, `1 <= max <= 6` (defaults 1, 1). An edge matches a step when its class is in
`classes` or its kind is in `kinds`; orientation: a symmetric edge matches any `dir`; a forward arc
(u is the source) matches `out` and `both`; a reverse arc matches `in` and `both`; and weight
`>= minConf`. `cfg.direction` is not used by the traversal (it still drives the rankings);
`cfg.classes` = the union of the steps' classes and their kinds' classes (both structure and
membership for `contains`).

Automaton: a state is `(j, c)` = inside step `j` after `c` edges of it; the seeds start at `(0, 0)`.
`moves(j, c)` =
- `(j, c + 1)` when `c < max_j`;
- `(k, 1)` for each `k > j` when `c >= min_j` and every step strictly between `j` and `k` has
  `min = 0` (enumerate `k = j + 1, j + 2, ...` and stop after the first `k` with `min_k > 0`).

An arc taken from `(j, c)` leads to every `(k, nc)` in `moves(j, c)` whose step `k` the arc
matches. Accepting states: `c >= min_j` and every step after `j` has `min = 0`. `emit: "all"`
(default) ranks every reached node; `emit: "end"` ranks only nodes with an accepting state. State
number for explanations: `j * 8 + c`. The state count `sum (max_j + 1)` must not exceed 8,192.
`config.metapathMoves` / `metapathAccepting` produce exactly these tables.

## 7. Explanation path (`via`, `path`)

- `khop`: `parent(v)` = the DAG arc into `v` with the smallest `u`, then the smallest kind id;
  `path(v) = path(parent) + [v]`, seeds have `path = [seed]`.
- `budget` and `metapath`: over states. A state arc goes from an expanded state `(u, su)` at depth
  `d` to a state `(v, s)` whose first-visit depth is `d + 1`. The state parent of `(v, s)` = the
  smallest `(u, kind id, su)` lexicographically. A node is explained from its smallest state number
  among its states at depth `hop(v)`, following state parents down to the seed's state 0 at depth 0.
  (Node-level parents can mix states and break the budget, so they are not used here.)

`via` lists the kind names along `path`. In the cross-check between two different arms any valid
shortest path is accepted (addendum 2, E.19): it must start at a seed, have `hop` edges of the named
kinds, each allowed by direction, classes, `minConf`, the budget or the metapath automaton, and never
pass through a blocked node before its end (`reference/ref.js explainChecker`). Relational versus
reference is still compared byte for byte, so both follow the rule above exactly.

## 8. Rankings (`rank`)

Every ranking orders `R`. Scores are rounded before ordering. Ties:

| mode | score | order |
|---|---|---|
| bfs | null | hop asc, npar desc, id asc |
| degnorm | Round12 | score desc, hop asc, id asc |
| ppr | Round12 | score desc, hop asc, id asc |
| hybrid | Round12 | score desc, hop asc, id asc |
| cochange | Round12 | score desc, hop asc, npar desc, id asc |
| text | Round9 | score desc, hop asc, npar desc, id asc |

### 8.1 `degnorm`
`act(s) = 1 / |S|` for each seed. Visit the reached non-seed nodes by hop ascending, then id; for
each, `act(v) = sum over DAG arcs u -> v of act(u) / od(u)` (one term per DAG arc), where `od(u)` =
the number of arcs of `u` under `cfg.direction`, `cfg.classes` and `minConf` (section 4). Score =
`Round12(act(v))`.

### 8.2 `ppr` (personalised PageRank), `restart` = alpha, `cochange_w`
- Transitions, for every node `u` that is not blocked: its arcs under `cfg.direction` and
  `cfg.classes`, every confidence (no `minConf`); arc weight `w * cochange_w` for class history,
  `w` otherwise; parallel arcs to the same `v` are summed; divided by the total. A node with no arcs
  or a total of 0, and every blocked node, is dangling.
- `p_0(s) = 1 / |S|` for each seed, 0 elsewhere. Exactly 40 iterations:
  `q(v) = (1 - alpha) * sum_u p(u) * T(u, v)`; `dm = sum of p(u)` over dangling `u`; then for each
  seed `q(s) += (alpha + (1 - alpha) * dm) / |S|`; `p = q`.
- Score = `Round12(p_40(v))`. The restart and all dangling mass go to the seeds uniformly. This is
  the specification an engine's native PageRank must be checked against; a native routine with a
  different stopping rule, global teleport or dangling handling is a separate configuration
  (`rank.variant`, section 9.4).

### 8.3 `cochange`
`F` = the distinct non-zero `file` ids of the seeds. `score(v) = Round12(sum over f in F, over
co_changed edges {f, x} with x = file(v), of weight)`; every co_changed edge counts (no class mask,
no direction, no `minConf`). Nodes with `file = 0` score 0.

### 8.4 `text` (BM25 as SQLite FTS5 `bm25()`)
Documents = every node, with its indexed text (8.6) split on single spaces; `N` = number of nodes,
`dl` = tokens in the node's text, `avgdl` = total tokens / `N`, `n(t)` = nodes containing term `t`.
`idf(t) = ln((N - n(t) + 0.5) / (n(t) + 0.5))`, replaced by 1e-6 when `<= 0`. For a query of terms
`q_1..q_m` (8.6), a node with at least one query term scores
`sum_i idf(q_i) * f_i * 2.2 / (f_i + 1.2 * (0.25 + 0.75 * dl / avgdl))` (`k1 = 1.2`, `b = 0.75`,
`f_i` = occurrences of `q_i`); other nodes score 0. Score = Round9.

### 8.5 `hybrid` (reciprocal rank fusion)
For each part (any non-hybrid mode, with its own ties), order all of `R`; `fused(v) += 1 / (60 + r)`
with `r` the 1-based position. Score = `Round12(fused(v))`.

### 8.6 Text normalisation (`common/textterms.js`)
`terms(text)`: for every match of `[A-Za-z0-9_]+`, emit the whole match lower-cased with underscores
removed (skip if empty), and, when the match splits into more than one part by
`[A-Z]+(?![a-z])|[A-Z]?[a-z]+|[0-9]+`, also each part lower-cased. Node text = `terms` of: the path
without its extension, the name, the signature, and for doc_section and invariant nodes the
section's own source lines; joined by single spaces. Seed query = `terms` of the seed symbol name,
the seed file name without extension and its directory name, distinct, in first-seen order, length
>= 2. Arms should call `seedQuery(seed)` and use the `text` column rather than re-deriving them.

## 9. Configuration schema (`common/config.js`)

```
shared:  granularity  "file" | "symbol"
         form         "paths" | "signature" | "range" | "snippet"
         pad          "none" | "DIR" | "CO"                         (default "none")
         minConf      number in [0, 1]                              (default 0.5)
graph:   direction    "dependents" | "dependencies" | "both"
         classes      [class names]   (khop; derived for budget and metapath)
         traversal    {mode: "khop", hops}
                    | {mode: "budget", hops, budgets: {class: 1..9}}
                    | {mode: "metapath", hops, emit: "all" | "end", steps: [{classes, kinds, dir, min, max}]}
                      hops: integer >= 0 or null
         hub          {mode: "none"} | {mode: "indeg", k} | {mode: "transport"}
         rank         {mode: "bfs" | "degnorm" | "cochange" | "text"}
                    | {mode: "ppr", restart in (0, 1), cochange_w >= 0}
                    | {mode: "hybrid", parts: [two or more non-hybrid ranks]}
```

9.1 `normalise(cfg)` fills defaults, sorts class lists by class index and kinds by name, derives
`classes`, validates every limit above and throws `INVALID CONFIG` otherwise; `name` is dropped.
9.2 `configHash` = first 16 hex of sha256 of the canonical JSON (keys sorted) of the normalised
configuration. 9.3 `rankKey` = the normalised configuration without granularity, form and pad (two
configurations with one rankKey must give the same ranked list). 9.4 Extensions: a traversal or rank
`mode` named `x_<name>` is an arm-specific algorithm, kept verbatim and never cross-checked; a
`variant` string on a traversal or rank marks an engine's native variant of a specified algorithm and
makes it a separate configuration. The reference and relational arms refuse both (`specOnly`).

A configuration of a non-graph arm (search) carries only the shared factors plus its own fields.

## 10. Seeds, projection, padding and packing (shared; arms do not implement these)

- Seed mapping (`seed.js`): the seed file's file/doc node, plus the symbol node matched by id suffix
  `#name` (or `#test:name`), else a definition with that name and first line, else a definition
  starting on that line, else every definition inside the symbol's range (at most 50). The match rule
  is recorded per answer (`seed_match`).
- Projection (`packer.js`): file granularity = each ranked node's file node, first occurrence, seed
  files excluded; symbol granularity = each ranked node with a path and a first line, except kinds
  file, doc, slice, runtime, and except the seeds.
- Padding (`padding.js`, addendum 2 B.7): after the arm's head, the shared tail is appended without
  duplicates. Universe = file nodes whose path is code, test or migration (the search arm's
  classifier). DIR = the files directly in the seed's directory (by path); then every file in a
  same-named capability folder (`backend/app/features/<x>/`, `src/features/<x>/`,
  `technician-app/src/features/<x>/`, any runtime; shallower first, then path); then, for the seed's
  directory and each parent directory up to the root, every file under it (shallower first, then
  path); each file once, the seed file never. CO = files
  changed with the seed file in counted commits of `commits.jsonl` (count desc, recency weight
  `sum 0.5^(age_days/30)` desc, path), then DIR. A commit counts when `used` is true (or, if absent,
  it has 2 to 30 files) and it is not `dropped`. Symbol granularity: the seed file's own definitions
  first, then each tail file's definitions (function, method, class, component, constant, test,
  migration) in line order.
- Forms: paths (`path` / `path::Symbol`), signature (file: the path line then `  <line>: <signature>`
  per definition; symbol: `path:<line>: <signature>`), range (`path:1-N` / `path::Symbol a-b`),
  snippet (`--- header` then source lines). Line 0 of every rendering holds the path.
- Budgets 2,000, 4,000, 8,000, 16,000 tokens of `tokenizer.js`. Units are filled in order; when not
  everything fits, 8 tokens are reserved for a `[+N more not shown]` footer and the next unit is cut at
  the budget on whole tokenizer segments. A cut unit shows only the lines that fit whole (with their
  newline): `cut = {tok, path_shown, shown, pad}`.
- Answer record (one gzip JSONL line per task): id, set, split, parent, arm, config_hash,
  granularity, form, pad, seeds, seed_match, n_ranked, ranked_sha, n_units, n_head, items (kind,
  path, symbol, ls, le, hop, via, score, tok, shown, pad), budgets (per budget: n_full, cut, used,
  beyond, head_tok, tail_tok), beyond_sample, ms (wall), engine_ms (arm-reported), lookups.

## 11. Cross-check (addendum 2, E.19; `equiv.js`, `sweep.js`)

Run a graph arm on the relational list: `node sweep.js --arms relational,reference,<arm> --list
relational --sets T1,T2`. Every pair of arms is compared on every task and configuration:
1. the same reach set and the same hop per node; 2. the same score per node within 1e-9 (or both
null); 3. the same order wherever two scores differ by more than 1e-9 (each list must be in score
order up to 1e-9; for `bfs`, whose score is null, the order must be identical); 4. every explanation
path valid and shortest (section 7). Relational versus reference is additionally compared byte for
byte (ranked lists and packed answers). Mismatches go to `sweep/crosscheck_mismatches.jsonl`.
`crosscheck_extra.js` adds 13 combinations outside the list (metapath emit=end, kind steps, other
minConf values, forced closure / CTE / level-wise query paths).

## 12. TQ answer file (every arm; `tq_score.js`)

`node run.js tq --arm <arm> --split tune` calls the arm's `tq(question)` for every question of the
split (question fields: id, split, kind, question, answer_form; the repo is at the frozen commit, and
`G` is its canonical graph) and writes `results/tq/<arm>.<split>.answers.jsonl`, one line per
question:

```
{"id": 7, "answer": <the answer_form shape>, "tokens": 412, "lookups": 3, "ms": 1.8, "arm": "...", "error": null}
```

- `answer`: a JSON array of strings, or an object of named arrays exactly as `answer_form` shows
  (`{"real": [...], "fake": [...]}`, `{"backend": [...], "web": [...], "mobile": [...]}`,
  `{"call_sites": [...], "via_bff": [...], "direct_callers": [...]}`). Item strings in the forms
  the question names: `path::Outer.inner`, a table name, a 4-digit revision id, `CLAUDE.md:L151`,
  `METHOD /api/path`, a test file path from the repo root.
- `tokens`: tokens (`tokenizer.js`) of everything the method returned to the reader; default the
  tokens of `JSON.stringify(answer)`. `lookups`: separate queries or tool calls a reader would issue
  (default 1). `ms`: wall time measured by the harness.
- `tq()` may return the answer alone or `{answer, tokens, lookups}`. Held-out TQ is refused unless
  `--allow-heldout` is given and the arm's TQ code was frozen (`run.js freeze-tq`) and is unchanged.
