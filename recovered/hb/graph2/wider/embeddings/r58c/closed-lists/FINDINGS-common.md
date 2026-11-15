# Shared harness and the lane adapter: unseen relation and node kinds (code audit, read-only)

Auditor: a read-only Opus subagent, briefed by the lane on 2026-11-15 after ruling 97. It could not write
files; the lead saved its final report here as returned.

## Summary

Nothing in the adapter or the shared harness crashes, drops or mixes up the new relation or the new nodes
once packing starts. The new data does change pack contents and order, but only upstream: through the
export's pilot graph and the KGE training.

- Counts: (a) 2 conditional, (b) 4 (none touches packing directly), (c) 3, (d) 3 (all upstream of the
  packer), (e) 2.
- Can a new node get into a pack? No (VERIFIED). A path is a pack candidate only when its node kind is `file`
  and the path matches the CODE regex (`backend|src|technician-app`, code extensions), `src/export.js:82`.
  The unrestricted candidates are exactly that set (`eval/evalcore.py:118-120`), and `rank` only ever outputs
  candidates (`evalcore.py:192-199`). So a root-level node never reaches `answer_level.js:56`, `if (!i)`
  never fires for one, and the exit-11 guard is not triggered by them.
- Token counts do not depend on the source store (VERIFIED). In the file/signature form, `render` builds the
  text from the path and the facts' definition lines (`packer.js:81-86`) and never calls `source.getLines`.
- Top finding D1 ((d), held-out path, INFERRED): `src/export.js:51,66-67` gives every node with a path the
  key `'F:'+path` and keeps every edge kind except `co_changed` and membership `contains`. Each new node
  becomes one root-level vertex of the pilot graph linked to up to 90 files, a 2-hop hub. The PPR comparator
  and the PPR part of every fused variant read this graph (`evalcore.py:87-95, 136-139`), so the unrestricted
  order changes, and with it which files make each budget. Tuning never had this structure.
- D2 (d): the pool scope (2 hops in the pilot graph, `evalcore.py:97-114`) grows through the same hub.
- D3 (d): KGE trains on the new triples; E5's `other` specialist and routing (`kge.py:490-499`).
- A1 (a), conditional: `edgeclasses.js:33` throws on a relation name missing from `KIND_CLASS`, called from
  `facts.js:91`. The grader's clean `loadFacts` run means the name is known, unless every new edge was
  skipped earlier at `facts.js:88` (B1).
- A2 (a), conditional: `source.js:29` -> `:39`: if a staged tree does not list a file/doc path, `ensureTree`
  runs `git archive`; no repository is mounted and the store is read-only, so a loud crash. Reachable only
  if the new nodes are of kind `file`/`doc` and their paths were added after the staged trees were written.
- E1 (e): `ranked_sha` (`harness.js:384`) hashes integer node ids, which shift as new sids sort in
  (`facts.js:62-63`). No lane or common code compares it (grep).
- Nothing silent in the adapter: every way a ranked path can be dropped is counted and refused
  (`answer_level.py:176-181`, exit 11).

## Findings

**A1.** `build/arms/common/edgeclasses.js:33` `if (!c) throw new Error('edge kind without a class: ' + kind);`,
from `facts.js:91` `const cls = classOf(e.kind, nmap.get(e.src).kind);`. Outcome (a). Held-out path: every
`loadFacts` at `answer_level.js:50`. Throw VERIFIED-IN-CODE; that it does not fire INFERRED from the grader's
clean run over the same staged facts (`heldout.sh:89-90` checks the staged facts byte for byte against
`build/facts/cache`). Fix would touch: nothing, unless the name is absent from `KIND_CLASS`.

**A2.** `source.js:29` `if ([...wantedPaths].every((p) => p in have || absent.has(p))) return;`, otherwise
`:39` `execFileSync('git', ['-C', P.REPO, 'archive', ...])`. `wantedPaths` holds every `file`/`doc` path
(`facts.js:53`). In the container `P.REPO` falls back to a Windows path (`GT_REPO` refused, `heldout.py:97`;
no repository mounted, `heldout.sh:28`, `r58c/A/mounts-A.json`); the store is mounted ro. Outcome (a), loud;
only if the new nodes are of kind `file`/`doc` and the parent's staged tree predates them. INFERRED (the
earlier packing test on these parents suggests the trees cover the paths). Fix would touch: a pre-launch
check that each staged tree covers the facts' `file`/`doc` paths.

**B1.** `facts.js:88` `if (!s || !d || s === d) continue;` drops an edge whose endpoint is not in
`nodes.jsonl`, or a self loop, without a count. Outcome (b); edges are not used by the packer at all
(`packer.js` and `harness.answer` never read `G.edges`). VERIFIED-IN-CODE.

**B2.** `src/export.js:56` `if (a === null || b === null || a === b) continue;` A new-relation triple whose
target sits at the same path as the new node collapses to a self loop and is left out of the pilot graph.
Outcome (b), upstream of packing. VERIFIED-IN-CODE; whether such triples exist is unknown.

**B3.** `src/export.js:88` `if (e.w < MINCONF) continue;` New-relation triples with confidence below 0.5 are
left out of `triples.tsv` (the KGE input); the pilot graph has no such filter (`export.js:54-67`). Outcome
(b) for KGE. VERIFIED-IN-CODE; the confidences are unknown.

**B4.** `facts.js:73-75` `const L = source.getLines(sha, n.path); if (L) body = ...` A `doc_section`/
`invariant` node whose path is not in the tree gets body `null` without notice; only `n.text`, which the
packer does not read. Outcome (b), off the pack path. VERIFIED-IN-CODE.

**C1.** `src/export.js:51` `return n.path ? 'F:' + n.path : 'N:' + i;` All new nodes at the same root path,
plus any existing node at that path, merge into one pilot vertex; a symbol-level target folds into its file.
Outcome (c), upstream (PPR, pool). VERIFIED-IN-CODE.

**C2.** Three rules pick the node for a path when two `file`/`doc` nodes share it: `facts.js:69` last wins
(raw-row order); `answer_level.js:51` `!fileOf.has(nd.path)` first wins (sid order); `seed.js:23`
`inFile.find(...)` first wins (sid order). Outcome (c), no pack effect: the unit is always `n.file`
(`packer.js:26`) and seed exclusion uses `.file` (`:20`); only `from` and `ranked_sha` could differ, and only
for a ranked path, which root-level paths never are. VERIFIED-IN-CODE; a duplicate path needs a new node of
kind `file`/`doc` at an existing root path (INFERRED).

**C3.** `facts.js:80` `file: (n.path && fileOf.get(n.path)) || 0` attaches a new node to the root
`file`/`doc` node sharing its path, or 0. Outcome (c), off the pack path. VERIFIED-IN-CODE.

**D1.** `src/export.js:66-67` `add(a, b, e.kind); add(b, a, e.kind);` feeding `evalcore.py:87-95` (PPR power
steps) and `:136-139` (`ppr_scores`). PPR order changes, and so do the fused variants (`heldout.py`
assemble calls `ec.fused_with` with PPR, `heldout.py:513-548`): which files the unrestricted list puts
first, so the pack contents at every budget. Outcome (d), held-out path. INFERRED (by design of the pilot
mirror). Fix would touch: the kind filter in `export.js` `pilotGraph`.

**D2.** `evalcore.py:97-114` (pool = 2 hops plus co-change neighbours): code files two hops away through a
root hub enter the pool. Outcome (d) for pool-scope ranked lists (rank metrics, not packs). INFERRED.

**D3.** `kge.py:490-499` (`area_triples`, E5 routing) and training on all triples: new `other` heads add
triples to the `other` specialist and can tip a seed's second area to `other`; changes the arm's scores and
its unrestricted order. Outcome (d), upstream. INFERRED.

**E1.** `harness.js:384` `ranked_sha: sha1(JSON.stringify(R.ranked.map((r) => [r.i, ...])))` with
`facts.js:62-63` (integer id = position in sorted sids): adding nodes shifts ids, so the hash differs from
one on a graph without them. Outcome (e). VERIFIED-IN-CODE. No consumer in lane or common code (grep); a
grader comparison is safe only if the grader loads the same facts.

**E2.** `source.js:51-53` (an `ensureTree` rebuild rewrites `trees/<sha>.json` and `.absent.json`) against
`heldout_inputs.js:142-150` and `heldout.sh:89-90` (`check --facts --common`, byte-equal): if the grader's
host-side `loadFacts` on the build's own store rebuilt a tree after staging (only for new `file`/`doc`
paths), the launch check refuses with exit 8. Loud. Outcome (e). INFERRED, conditional.

## Checked and found safe

- `answer_level.js:51` kind filter (`file`/`doc`): candidates are only `kind === 'file'` plus the CODE regex
  (`export.js:82`; `evalcore.py:73-74, 118-120`); root-level paths never match. VERIFIED.
- `answer_level.js:57` `if (!i)`: ids are `i + 1`, never 0 (`facts.js:78`); an unmapped path is counted and
  refused with exit 11 (`answer_level.py:176-187`, from `heldout.py:592`). VERIFIED.
- `evalcore.py:192-199` `rank`: outputs only `cands`. VERIFIED.
- `packer.js:18-37` `project` (file granularity): unit `n.file`, seed files excluded. VERIFIED.
- `packer.js:61-69, 81-86` `fileDefs` and the signature render: `DEF_KINDS` nodes by code-file path; no new
  node adds lines to a candidate; no source store read. VERIFIED.
- `packer.js:122-159` `pack`: budgets, footer reserve and cut depend only on rendered text; `countTokens`
  (`tokenizer.js:78`) uses no node fields. VERIFIED.
- `harness.js:377` / `packer.js:40-41` `withTail`: `pad` is `none`. VERIFIED.
- `seed.js:20-53` `mapSeed`: looks only inside the seed's own path; T1 seeds are code files (INFERRED); the
  `seeds` list holds sids (`harness.js:382`). VERIFIED.
- `source.js:65-75` `getLines`: a named but missing blob throws (loud); `heldout_inputs.js:106-111` checks
  every named blob is staged. VERIFIED.
- "Silent pack when a tree or blob is missing": with file/signature a missing blob changes nothing, identical
  to tuning; only the unused snippet form would silently pack a header alone (`packer.js:87, 94`, `|| []`).
  VERIFIED.
- `facts.js:93-94` edge key `s|kind|d` with integer endpoints cannot collide. VERIFIED.
- `kge.py:311` inverse lookup relies on no `__inv` suffix, which holds. VERIFIED.
- `answer_level.js:44-50`: one graph per parent, caches per graph. VERIFIED.
- `answer_level.py:142-158` `check_code`: hashes only `common/*.js`. VERIFIED.

Not read: `sealed/`, `LANE/export/`, `LANE/grader-returns/`, `LANE/train/stageB/`, and no graph or facts
data. Whether the new nodes are of kind `file`/`doc` or a new kind, and the new triples' confidences, stay
unknown; A2, B2, B3, C2 and E2 depend on those.

## Corrections after the coordinator's answers (lead, 2026-11-15)

- B3 is wrong as written. The KGE input is `export/graphs0` (ruling 34; kge.py reads it), which holds every
  confidence: all 2,974 triples of the new relation over the 70 held-out parents. The `MINCONF` filter at
  `src/export.js:88` applies to `export/graphs` (563 of them), which the models do not train on. Nothing is
  left out of what the models train on.
- A2, C2 and E2 cannot happen: both new node kinds are other than `file` and `doc` (coordinator, yes/no).
- B2 does not fire: 0 new triples have two ends sharing one path.
- D1 is named in RESULT.md's limits under ruling 97(d); E1 stays a note in AUDIT.md.
