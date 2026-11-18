# t1 step 3b: brief for the refuter (kind refute, Opus, fresh context)

`R:` = `docs/program/evidence/round3-2026-11-18/`. Paths from the repository root.

You see only the claims and their sources. Do not open `R:t1-report.md` or any `R:t1-collect-*.md`.

Setting (given, not to be re-derived): a "tree of sessions" is a research question run as a tree of
language-model sessions, a coordinator and leaves. A node is a model session: a unit of work lasts minutes,
redoing it costs tokens, its context window is bounded, it cannot be paused for minutes while a parent is
rearranged, 3 to 16 run at once, and a rerun is not the same run. Claims below transfer B-tree and hierarchy
results to such a tree.

Goal: try to break every claim C01, C02, ... in `R:t1-claims.md`. Default to refute: a claim stands only if
the source says it, under the conditions stated, and (for a transfer to sessions) the assumption it needs holds
for model sessions. Attack especially: a figure used outside its workload, scale or baseline; a mechanism whose
assumption (short critical sections, nodes in memory, one writer, cheap restarts, identical reruns) fails for
sessions; a law stated as holding for small and very large work when the source tested one size; "no paper
does X" (search titles and authors on the web for one counterexample; privacy: never put a path, a file name,
"harness" or anything about this machine into a search); a count or a cost of ours that the cited file does
not give.

Sources: the place each claim cites (`R:papers/tree/<name>/paper.txt line N` or `path:line`). Read around it
with grep and ranges; never a whole paper text. You may open another part of the same paper to find a
condition that limits the claim.

Write `R:t1-refute.md`: a header with the counts per verdict; then one block per claim: id; verdict
`CONFIRMED` / `PARTIALLY` / `REFUTED` / `UNVERIFIABLE`; the corrected claim (for PARTIALLY or REFUTED); the
reasoning in at most four lines with the line you read; for UNVERIFIABLE, what would settle it. Write nothing
else. No git command that writes.

Return at most eight lines: the path, the counts per verdict, the ids refuted, and the one claim whose fall
would change the answer most.
