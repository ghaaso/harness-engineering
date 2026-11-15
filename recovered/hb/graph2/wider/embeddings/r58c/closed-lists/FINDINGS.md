# Closed lists: unseen relation type and unseen node kinds (code audit, read-only)

Auditor: a read-only Opus subagent, briefed by the lane on 2026-11-15 at about 03:20Z after ruling 96. It
could not write files, so the lead saved its report here word for word as returned. The lead re-read
kge.py:148-155, 489-502 and 688-710 and found them as quoted below (F1, F2, F8).

Scope: code only. Not read: `export/` (including `export/checkpoints.py`), `sealed/`, `grader-returns/`,
`train/stageB/`, `train/RUNLOG.md`. Nothing was run. Paths are relative to the lane root.

Summary by primary outcome: (a) crash 1, plus one secondary for E4 (INFERRED); (b) silently dropped 1;
(c) silently mapped 4; (d) shape difference 2, plus three secondary; (e) a compared count or digest
changes 0.

- No closed lists: the lane's Python and JS have no hard-coded 36, relation-name list or node-kind list.
  The only fixed names are `CO='co_changed'`, `INV='__inv'` and `AREAS=('backend','mobile','web','other')`
  (kge.py:68-70).
- No silent drop at build time: `build_tf` builds `e2id` and `r2id` from the same rows (kge.py:150-152).
- Train and rank stay consistent inside each held-out unit (labels, E and the co_changed row are saved
  together; s = 1 means P = C).

The held-out path: heldout.py:470 `kge.train(arm,cfg,seed,C,holdout=False,es=False)`; scoring via
`stageB.score_tasks` and `kge.score` (heldout.py:471, stageB.py:202-211); `check_no_fold` (heldout.py:472,
537); evalcore tables and ranking; `answer_level.pack` (heldout.py:581-595).

## Findings

**F1. E5 routing is pulled toward `other` (c, secondary d). Arm E5.**
- Code: kge.py:498 `c = collections.Counter(ents.get(n, ('', '', 'other'))[2] for n in nb.get(seed_e, ()))`,
  kge.py:502 `return [a1, [a for a in AREAS if c.get(a) == top][0]]`.
- The neighbour map covers every relation (kge.py:139-143); the rank side builds it with
  `nbP = neighbours(triP)` (kge.py:659) and routes at kge.py:706.
- Effect: a seed tied to new `other` nodes gets a different second specialist than in tuning. Nothing raises.
- Held-out path: yes. Mechanism VERIFIED-IN-CODE; whether it fires INFERRED: only if the new relation's code
  endpoints are `file:` entities (if they are symbol nodes, a file seed's 1-hop neighbours are unchanged).
- A fix would touch: what `route()` counts (kge.py:498).

**F2. A routed `other` specialist without co_changed is skipped silently (b). Arm E5.**
- Code: kge.py:693 `if sd['rco'] is None: continue`, kge.py:707 `if A not in specs: continue`; training-side
  filter at kge.py:579-580 and 620.
- Effect: a seed routed to `other` keeps only its own-area specialist.
  `seeds_unscored_not_in_routed_specialists` counts only seeds no specialist scored at all, so this case
  leaves no trace.
- Held-out path: yes. Code VERIFIED-IN-CODE; whether `other` lacks co_changed at some held-out checkpoint
  INFERRED (data). The new relation adds no co_changed edges, so it cannot supply an `rco`.
- A fix would touch: kge.py:693 or a counter beside kge.py:707.

**F3. E5 specialist shapes change (d). Arm E5.**
- Code: kge.py:490-491 (`area_triples`: an edge goes to every specialist holding an endpoint's area),
  kge.py:567-570 (tables and vocab grow by the new relation and its `__inv`), kge.py:621-622 (`known`),
  kge.py:719-721 (per-specialist percentiles).
- Effect: every new-relation edge (code area to `other`) trains in two specialists; the `other` specialist
  knows many code files, so its percentile pool and its share of the mean differ from tuning. Train and
  rank stay consistent (same saved `known` and `labels`).
- Held-out path: yes. VERIFIED-IN-CODE; size INFERRED.
- A fix would touch: `area_triples` (kge.py:490).

**F4. The memory probe does not model the new kinds (d). All arms; matters most for E5.**
- Code: heldout.py:654-669; kinds, code flags and areas come from the largest tune graph's entities.tsv
  (heldout.py:740, 757). Per-relation counts come from the held-out `sizes.json` (heldout.py:678), so the
  37th relation is modelled, but over random pairs (heldout.py:680-683).
- Effect: in the real graph every new-relation edge crosses areas and trains in two specialists; a random
  synthetic pair crosses only with probability 1 - sum p_a^2 under tuning's area mix. Totals match, so the
  probe can understate E5's peak.
- Held-out path: the probe gates the run (exit 4) but does not train the held-out unit. Mechanism
  VERIFIED-IN-CODE; size of the gap INFERRED.
- A fix would touch: where `synth_graph` draws kind and area (heldout.py:666-669).

**F5. The pilot graph collapses nodes by path (c, secondary d). All arms through the comparators (PPR, CO,
pool scope, fused).**
- Code: src/export.js:51 `return n.path ? 'F:' + n.path : 'N:' + i`; lines 66-67 add every edge kind except
  co_changed, and except `contains` from runtime/slice/invariant_group.
- Case 1 (c): a new node that has a path merges into that file's node in pilot_graph.tsv; graphs0, which the
  arms train on, keeps it separate. Case 2 (d): pathless new nodes become `N:` hubs; rooted PPR walks
  through them, and the 2-hop pool (evalcore.py:93-113) gains code files linked through a new node.
- Held-out path: yes (heldout.py:400, 519). Export-time behaviour already in the exported files, pinned by
  heldout.sh:91 against `heldout_export.sha256`. Mechanism VERIFIED-IN-CODE; whether the new nodes have a
  path INFERRED.
- A fix would touch: `pilotGraph` in src/export.js (not code the frozen run executes).

**F6. Area is assigned by path, not kind (c). Arm E5 only.**
- Code: src/export0.js:19 `const area = (p) => !p ? 'other' : p.startsWith('backend/') ? 'backend' : ...`,
  used at export0.js:40; the same rule at export.js:33.
- Effect: a new non-code node whose path lies under `backend/`, `src/` or `technician-app/` gets a code
  area; E5 then trains it in a code specialist and it counts as a same-area neighbour in `route()`.
- Held-out path: yes (read at kge.py:115). VERIFIED-IN-CODE that area comes only from the path; whether the
  new nodes have such paths INFERRED.
- A fix would touch: `area()` in src/export0.js (export time).

**F7. An unsanitised relation name crashes every arm (a).**
- Code: src/export0.js:47 `tri += sid(h) + '\t' + e.kind + '\t' + sid(t) + '\n'`; node fields are sanitised
  by `tsv()` (export0.js:20, 40), `e.kind` is not.
- Failure: a tab or newline in the name gives the wrong arity at kge.py:121; kge.py:246 then raises
  `ValueError`; the unit is logged failed (heldout.py:481-485), the run exits 2 (heldout.py:631-632), on
  every rerun. Same for pilot_graph.tsv's kinds column (export.js:96, read at evalcore.py:59).
- Held-out path: yes, all five arms. INFERRED, unlikely (relation kinds are presumably identifiers);
  checkable on the exported held-out triples.tsv.
- A fix would touch: export0.js:47, or a field-count check at kge.py:121.

**F8. A reciprocal-suffix collision merges relations (c, secondary a for E4).**
- Code: kge.py:150 `list(train) + [(t, r + INV, h) for h, r, t in train]`; kge.py:152
  `r2id = {r: i for i, r in enumerate(sorted({r for _, r, _ in rows}))}`.
- Effect for E1, E2, E3, E5: if the unseen name equals `X__inv` for an existing X (or the reverse), two
  relations share one label and one row, silently; the subsampling pairing (kge.py:309-312) would mis-pair.
  E4 uses PyKEEN's own inverse triples (kge.py:154); PyKEEN's handling of a label already ending in its
  inverse suffix was not read, so a crash or a merge is possible.
- Held-out path: yes. INFERRED, very unlikely.
- A fix would touch: `INV` (kge.py:69) or an assert in `build_tf`.

## Behaviour changes that are not defects
- Negatives and the softmax now range over the new nodes too: E1/E3/E5 `torch.randint(0, num_e, ...)`
  (kge.py:292); E2 cross-entropy over all entities (kge.py:359-360); E4 the LCWA loop. Scoring stays
  restricted to file candidates.
- E4 message passing runs through the new relation (kge.py:181-184); sizes come from `tf`.
- Item-17 fold-in (kge.py:644-650) would average new nodes in, but cannot happen at s = 1 (S12).

## Checked and SAFE
- S1 kge.py:147-155: no TriplesFactory drop; table sizes follow the graph in train and rank.
- S2 kge.py:370-377, 620, 629: relation rows chosen by label; the id shift from a new name is harmless; E4
  maps through `_prepare_batch`.
- S3 kge.py:164-189: every model sized from `tf`, no fixed relation count (PyKEEN-internal sizing INFERRED).
  The RGCN fallback is off the held-out path (heldout.py:470 passes no `fallback`).
- S4 kge.py:286-287, 309-313: `.get` returns None, the Counter defaults to 0.
- S5 kge.py:115: 5-field entity split safe (export0.js:20, 40 sanitise node fields).
- S6 kge.py:255: direct index `self.ents[h]` only over co_changed heads.
- S7 kge.py:262-280, 470-483, 540-553: off the held-out path (`holdout=False` empties the queries,
  kge.py:250; `es=False`, kge.py:434, 456, 587).
- S8 kge.py:660, 663-664: only `file:<path>` entities are seeds or candidates.
- S9 kge.py:502, 490-491: area takes only the four values (export0.js:19); `at_C` (kge.py:690-692) covers
  every training entity.
- S10 kge.py:563-570: per-specialist seed by the fixed `AREAS` index; an empty area is skipped.
- S11 kge.py:657-659: at s = 1 the rank-side graph equals C.
- S12 stageB.py:214-226 `check_no_fold` (heldout.py:472, 537): cannot trip at s = 1, given S9.
- S13 heldout.py:455: `nco` counts co_changed only.
- S14 evalcore.py:26, 111, 117 and export0.js:39: new kinds are never pool or unrestricted candidates.
- S15 answer_level.js:51, 57: `fileOf` covers file and doc kinds only, so no exit 11; the `if (!i)` test is
  safe if facts node indices are 1-based, as export0.js:42 `G.nodes[i - 1]` suggests (INFERRED-strong).
- S16 every digest or count compared later is independent of relation and kind counts: `plan_hash`
  (stageB.py:46-63), `code_sha256` and pins (item27.py:61-71, heldout.py:245-272), `tables_digest`
  (selectB.py:142-157), `part_ok`/`tables_ok`/`ranked_ok` (heldout.py:408-422, 504-511, 557-566),
  `verify_parts` (stageB.py:249-259), the export manifest (heldout_inputs.js:196-223, heldout.sh:91).
- S17 E5's counts in counts.json (kge.py:722-735) and `absent_tasks` (heldout.py:604-608) will move, but no
  lane code compares them with tuning values; whether the grader does is unknown.
- S18 proj.py, stageA.py, refs.py, item22.py, selectB.py, item27.py, detrun.py: no relation or kind
  handling on the held-out path.
- S19 heldout_inputs.js: file-level sha256 work only.

## Not covered
- `export/checkpoints.py` (forbidden folder): `ck.Facts`, `valid`, `key` used at heldout.py:390-397.
- `build/arms/common/*.js` (facts.js `loadFacts`, harness.js `answer`/`mapSeed`, packer.js): the packs at
  held-out parents read facts graphs containing the new kinds and relation; any kind- or relation-specific
  branch there is unaudited, and it is on the held-out path.
- PyKEEN 1.11.1 internals: CompGCN relation-table and self-loop sizing, RGCN bases, inverse-suffix handling (F8).
