# Brief: fold the blind review into the complexity analysis (helper of top session 3; kind analyse, Opus)

Fold the blind review `research-tree/build/refute/COMPLEXITY.md` ("CORRECT: 14 findings") into
`research-tree/build/COMPLEXITY.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`) as version 2,
as the top session decided each finding (r57-0021) below. First copy version 1 byte for byte to
`research-tree/build/COMPLEXITY-v1.md` (the review cites its lines). Keep version 1's structure; at the end add
"Changes from version 1": one line per finding and per decision, with what changed. Marks as in version 1: [m]
measured, [r] read, [c] computed with the formula shown, [e] estimate.

## Decisions
All 14 findings are accepted as the review states them. On top of them:

1. **Finding 1 (one coordinator for all lanes).** Accepted; compactions are not a plan (`research-tree/RULINGS.md`:
   hand over at the computed point; r57-0008). Also compute variant (e2): each lane run by one Opus helper
   orchestrator under the coordinator (kind orchestrate), whose helpers are the lane's Sonnet readers, its gate checks
   and its fresh refuter; the coordinator's window then holds only the lanes' returns. Sources: r57-0157 (helpers of
   helpers run in the background with fork mode off, three layers, 20 at once by default), r57-0418 (a helper
   orchestrator must poll: 1.5-3.5 M each, measured), r57-0139 and E-tokens.md for a lane's calls and window. By
   r57-0035 and the tier routes (`.claude/hooks/tier-routes.json`, orchestrate-deep) the coordinator is then on Fable:
   give its tokens on the Fable meter as well (r57-0170: about 5.7 M a Fable point, one interval). For (e) and (e2)
   give tokens, points on both meters, hours, the owner's turns and the checks kept. Choose between them by the
   objective (r57-0003: quality first, then least time, memory, tokens) and his ruling r57-0042 (a run must not need
   his typed "go" for every session); say which and why.
2. **Findings 2 and 4 (field count).** The same fields in every path: the direction's lane 1 is the problem sheet and
   the fields are seven (protocol v2 line 498, protocol v1 lines 26-31). Recompute (a), (c), (e), (e2) and their
   share of the direction's 10 % on that count, so the paths compare like with like; say how lane 1's problem sheet is
   counted in each.
3. **Finding 6 (this week's room).** Recompute it at the reading of 13:20 UTC on 2026-11-20: 82 % all models, 53 %
   Fable, reset 2026-11-23 12:00 UTC, by PILOT-PLAN.md section 3's method. The times written in TOP-STATE.md and
   PILOT-PLAN.md for 2026-11-20 run about 1.5 h early against the transcripts' UTC stamps (the "10:24" reading was
   about 11:54 UTC); use the true times. Say how many lanes of the chosen path fit before the reset.
4. **Finding 7 (the owner's review idea).** Keep it measured instead of lost: in the chosen path each lane's
   researching session or helper also reviews its own field in the protocol's fixed form (R_same, PILOT-PLAN.md node
   15: 9.9 M (6.3-17.8) a lane) beside the fresh refuter the method already has, and a blind scorer (node 21: 1.79 M
   (1.07-4.68)) scores the two by protocol v2's comparison 2 measures as far as one scorer allows. Give the added
   tokens a lane and in all; say what this measures (F1 across seven lanes) and what it does not (it is not the S1/S2
   comparison, and one fresh refuter is not two).
5. **Finding 8.** Keep the recall test (round 3's 0.75 + 4.27 M) so Q5 stays whole; add its tokens.
6. **Finding 3.** Drop the 0.4 B branch; say plainly that one run of lane 1 in the single-session form can only rule
   that form out, not in.
7. **Finding 5.** List what the owner must give in each path: the go naming the paper downloads with source and size
   (CLAUDE.md rule 3), the rule-3 exception if a comparison runs with the network on outside a container, the cap,
   and every typed start (none in (e2) if it holds).
8. **Finding 14.** Re-mark [e] every figure that rests on an unsourced input.

## Section 0
Rewrite it from the corrected figures: the answer first, at most 12 plain lines, for the owner. Explain any path
letter you use in section 0 in a few words. Say plainly what is not known.

## Limits
Write only `COMPLEXITY.md`, `COMPLEXITY-v1.md` and scratch files in `complexity-fold/` under the session scratchpad
(`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/2e993f56-2f1e-43bc-9ba7-77bd4d0832a6/scratchpad/`); the
analysis's scripts are in `complexity/` and the review's in `complexity-refute/` there. Open library records with
`bash library/lookup.sh -f <id>`. No commit, no web request, no helper or session start, no question to the owner, no
command over 150 s. Tokens: expected about 4 M (the pilot plan's fold 3.0 M, plus decision 1's variant), limit 6 M;
counter `node research-tree/build/tools/tokens-self.mjs "fold of the complexity analysis"` every 10 calls from call
20. At about 330 K context or at the limit, write the file as it stands with "Left to do" and return LIMIT. Return the
new section 0, the paths table, the choice between (e) and (e2) with its reason, and your token count.
