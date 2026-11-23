# Brief: fold the blind review into the pilot's plan (helper of top session 2; kind analyse, Opus)

`research-tree/build/PILOT-PLAN.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`) was
reviewed blind: verdict `research-tree/build/refute/PILOT-PLAN.md`, "CORRECT: 14 findings". Read both in full. The top
session has decided every finding (below). Rewrite `PILOT-PLAN.md` as version 2 with every decision folded in and
every figure recomputed so the whole file agrees with itself. You change no other file and start nothing.

## The top session's decisions (library r57-0021: the top session decides corrections)
1. Checker overrun at every batch's Q3 (9 x 2.89 = 26.0 M): **accepted**.
2. Coordinator and top-session rates from all three roots (median 4.10 M a started unit, quartiles 2.91-6.45):
   **accepted** (ORCHESTRATION s3: expected = median of like-for-like sessions). Coordinator 94.3 M (66.9-148.4),
   limit 270 M; top session 20.5 M (14.6-32.3). Say that the cap is the same if 2.11 is kept as the expected.
3. Fable on the all-models meter: **accepted**. Use the record's range: by price 1 to 2 Opus tokens (about 1.5 at the
   Fable mains' mix, G-models), the measured bound of E-tokens.md:246 (0.105 points per M against 0.047 for Opus);
   the 4c fit is "not a result". Give the all-models line at both ends.
4. Fable meter: **accepted**. The gate counts the owner's own Fable use to the reset (22.8 M in 15.1 h, r57-0170).
5. admit.mjs's B is the rows' share (168 M, r 14.8 M), not the cap: **accepted**. The cap is held by the top session
   and the coordinator from usage readings.
6. The four gaps: **accepted as the review corrected them** (gap 1 larger: the model reaches the coordinator and T
   through the row's `tier`, the status `next` act or T's manifest, and the hook files go into tcb and every settings
   template; gap 2 also `profiles/scorer.json` and `Agent(scorer)`; gap 3 a new single-session role in TASK_ROLES with
   its own settings and brief line, because a child-role S1 would get readers and fan out; gap 4 two values).
   Fix-round size: the review's 100-143 M [e], one builder unit per fix; say how many units and why.
7. Node 5's limits from measured units (builder unit 67.3 M, refuter 18.5 M): **accepted**.
8. Coordinator successors 8-19 and owner-typed turns 28-39: **accepted**.
9. CLAUDE.md rule 3 (experiments in containers with the network off): **accepted**. The go ask says plainly that the
   pilot runs on the PC, with the network on, outside a container, because its readers use the web and its sessions
   run in the desktop app; he approves that exception or the pilot does not run.
10. One cap, one line per meter; the gate decides when: **accepted**. Apply ORCHESTRATION s4's gate (protect later
    demand to the reset, all models and Fable; spend the rest at once while the queue fits) separately to the
    **preparation** (nodes 1-6: Opus, Sonnet, Haiku, no Fable) and to the **pilot** (nodes 7-21), and state the result:
    which part runs this week and which from the reset of 2026-11-23 12:00 UTC, with the line each needs. Do not offer
    him "this week or from the reset" as a choice.
11. W*_coord: the inputs give 98-127 K; keep the mapped default 133.2 K and say it is a default the pilot measures,
    not a computed value: **accepted**.
12. Research sessions: four round-3 lanes, readers 31.9 M (27.0-36.9) per field, n = 4; T's wall time nearer 5 h:
    **accepted**; recompute the time.
13. Time 7 h x 1.2-1.7 = 8.4-11.9 h, then the longer T: **accepted**; recompute.
14. gate.mjs reads `<root>/completeness/model/result.json` (`result` "pass", `sha`), not tied to a commit (gate.mjs:
    375-390): **accepted**; move it from "Not known" to a preparation step.

## Write
Version 2 of `PILOT-PLAN.md`: section 0 "The answer" first (at most 12 lines), then the nodes, the computation, the
gate for each part, before or measured, not known, and the owner's asks. The asks: only `approve:` and `cap:` lines,
each one line, marked **now** or **later** (when it comes); at most two marked now. Keep the marks [m] [r] [c] [e]
and cite the verdict's finding numbers where a figure changed. Add a short "Changes from version 1" list at the end.

## Limits
Read-only except `PILOT-PLAN.md` and scratch files in a folder of your own under the session scratchpad. No session or
helper start, no command over 150 s, no web, no commit. Tokens: expected about 8 M, limit 18.6 M; your counter
`node research-tree/build/tools/tokens-self.mjs "fold the review into the pilot plan"`. At about 330 K context or the
limit: write the file as it stands with "Left to do" and return LIMIT. Return section 0 as written, the asks, and
your token count.
