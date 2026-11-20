# S2.4 reruns: three runs whose result can change the verdict (task r57-0507 slice 2, analyse)

Written by S2.4 (`analyse: S2.4 model verdict`), 2026-11-20, before the verdict. Run them one at a time, in the
order below, as background commands through MAIN's lane. Each ends well under 1,400 s; R3 resumes on exit 3.
Read free memory F before each run; the flag's share of F is given for F = 13 GB.

## R1. FXW-6-B whole, complete (branch B1, row 5: the run that checks FX-W6's deadlines)

S2.3: BOUNDED by memory at 17,555,507 states (2,500 MB); NoFalseSuspicion "not refuted (bounded)", liveness not
checked. From `MAIN/.claude/worktrees/S2.2/research-tree`:

```
node C:/Users/User/Documents/projects/harness-engineering/research-tree/tools/lane.mjs --label S2.4-R1-FXW-6-B --heap 2048 --timeout-s 1450 --wait-s 30 -- node model/as-built/check-build.mjs FXW-6-B --mem-mb 6000 > C:/Users/User/Documents/projects/harness-engineering/research-tree/model/results-build/rerun/FXW-6-B.json 2> C:/Users/User/Documents/projects/harness-engineering/research-tree/model/results-build/rerun/FXW-6-B.err
```

- Memory: 6,000 MB (46 % of F); expected peak about 3.5-4.5 GB (BFS about 117 B/state, analyses N x 26 + E x 4).
- Expected: complete at about 18.5-20 M states, 200-400 s; NoFalseSuspicion holds; WakeSourceAlive F 4, NoDeadlock
  F 6, AlwaysCanResolve F 5, EventuallyResolves F 5 (as R57's `FXW-6-3000.json`: the hand-over exit-2 path under u,
  which N2 and FX-W4 close; S2.4 measured that closure on FXW-5-B's parts).
- Decides: whether B1 holds as built under the Q5 rule. Any other failure goes into the verdict.

## R2. FN-OUT-CLOSE-K2-B part k=2,cv=1,r=1, complete (the one BOUNDED part of the close group)

S2.3: BOUNDED at 17,762,863 states (2,500 MB); the other 42 parts hold. Same folder:

```
node C:/Users/User/Documents/projects/harness-engineering/research-tree/tools/lane.mjs --label S2.4-R2-CLOSE-cv1r1 --heap 2048 --timeout-s 1450 --wait-s 30 -- node model/as-built/check-build.mjs FN-OUT-CLOSE-K2-B --bud k=2,cv=1,r=1 --mem-mb 6000 > "C:/Users/User/Documents/projects/harness-engineering/research-tree/model/results-build/rerun/FN-OUT-CLOSE-K2-B__k=2,cv=1,r=1.json" 2> "C:/Users/User/Documents/projects/harness-engineering/research-tree/model/results-build/rerun/FN-OUT-CLOSE-K2-B__k=2,cv=1,r=1.err"
```

- Memory: 6,000 MB (46 % of F). Expected: complete at about 19-21 M states, 200-350 s, every property holds (as
  its siblings cs=1,r=1, 16.2 M, and cv=2, 12.1 M).
- Decides: whether the close group as built holds at every k=2 part.

## R3. The wake group as built at k=2: FN-N2-B by parts on the S2.4 variant (N2 after a refused hand-over)

Why: RUN-BUILD ran FN-N2-B (the wake group with N2, as built) at k=1,u=1 only, and FXW-4R-B (75 parts) has no N2.
`model-build.mjs:1015` ends a draining turn whose hand-over is not quiescent with no endturn, even under
FIX_ENDTURN_ALWAYS; on `build`, `handover.mjs:286-287` refuses with exit 6 `not-quiescent` before it touches anything,
and `tcb/briefs/coordinator.md:163-166` makes endturn every turn's last call. The variant changes that one line:
under FIX_ENDTURN_ALWAYS the refused hand-over goes to endturn, as the exit-2 line above it already does.

Variant: `MAIN/research-tree/build/units/S2.4/variant/`. `model-build.mjs` (sha256 00de3310...) is S2.2's file
(448e7392...) with line 1015 changed; `check-build.mjs`, `configs-build.mjs`, `configs.mjs` and
`run-seq-build.mjs` are byte-equal copies of `build` e5c9c4f8. S2.4's measurements with it (each part complete):
k=2,l=2 every property holds (132,252 states; unchanged model: WakeSourceAlive F 19); k=2,cv=2 every property holds
(3,339,359); k=2,u=2 EventuallyResolves F 9 only (the u artefact); k=2,x=2 WakeSourceAlive F 1 and
NoSilenceAfterFirstCall F 2 only (p0 and p6); k=2,l=1,u=1 WakeSourceAlive F 23, NoSilenceAfterFirstCall F 23,
EventuallyResolves F 9 (endturn exit 2 under u starts nothing, branch B2, then a lost wake; FX-W4's list window
recovers it). From `MAIN/research-tree/build/units/S2.4/variant`:

```
node C:/Users/User/Documents/projects/harness-engineering/research-tree/tools/lane.mjs --label S2.4-R3-N2V --timeout-s 1450 --wait-s 30 -- node run-seq-build.mjs FN-N2-B --out C:/Users/User/Documents/projects/harness-engineering/research-tree/model/results-build/rerun/FN-N2-B-V-parts.json --parts --mem-mb 1500 --wall-s 1350
```

Exit 3 means "more to do": run the same command again (it resumes from the file).

- Memory: 1,500 MB (12 % of F); peak about 1.1 GB (the largest FXW-4R-B part, k=2,r=1,u=1, peaked at 1,101 MB).
- Expected: 75 parts complete, about 95-100 M states summed, 950-1,100 s in two rounds. Failures expected only in
  the x parts (WakeSourceAlive F 1, NoSilenceAfterFirstCall F 2: p0, p6), the u parts (EventuallyResolves, the u
  artefact) and some u parts with a second fault (WakeSourceAlive, NoSilenceAfterFirstCall: L1 and B2 under u,
  recovered by FX-W4). NoDeadlock and AlwaysCanResolve hold in every part.
- Decides: whether the wake group as built has a failure beyond those decided ones.
