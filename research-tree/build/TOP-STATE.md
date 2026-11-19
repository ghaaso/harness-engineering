# Top session: where the start steps stand (2026-11-19, written before a compaction)

Done: fork mode off and probed (no L1; root on Opus); lane 4 slots; suite 120 s with selftest shards; P0; plan gate;
docs and CLAUDE.md rule 5 and memory lines; records r57-0039, r57-0157 to r57-0162, r57-0418, r57-0842, r57-0843
appended; ORCHESTRATION.md section 0 and section 13 (rows 1-9) written; ROOT-START.md written; review verdict in
`research-tree/build/refute/P0-GATE.md` (six breaking findings).

Running (helpers of the top session, notices come to it): FIX-GUARD (findings 1-4, the regex, the record guard's
matcher in both settings files) and FIX-GATE (findings 5-6), briefs in `research-tree/build/briefs/`.

Next, in order:
1. Commit 1 (all setup), cut branch `build` from it, start the root as a child session (Opus, title
   `orchestrate: build root (r57-0507)`, prompt: read `research-tree/build/ROOT-START.md`).
2. Board (`library/INDEX.md`, at most 220 lines): r57-0039 on the rulings line; r57-0157 to r57-0162 and hc1 after
   r57-0156; r57-0418 after r57-0417; r57-0842/0843 after r57-0841; NEXT becomes r57-0507 (root, ROOT-START,
   cap 15 points), its old line 4 removed, r57-0514 renumbered 4; journal table: r57 count, a row for hc1 and bp.
   Append r57-0163: task r57-0517 done.
3. When the fixers return: check their results and run `node .claude/hooks/selftest.mjs` and
   `node --test .claude/hooks/plan-gate.test.mjs`; check `.claude/settings.json` holds both changes; fill section 13
   rows 10-11 (review, tokens); commit 2 (only the fixers' files, the board, the journal, ORCHESTRATION.md).
4. The owner's page: a Sonnet helper writes and publishes a short page on what changed after his go (section 13).
5. Report to the owner and wrap up. Meter at 16:xx UTC: 64 % all models (63 % at the go), Fable 49 %.
