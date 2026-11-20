# Brief: fold the blind review into the faults audit (helper of top session 4; kind analyse, Opus)

Fold the blind review `research-tree/build/refute/FAULTS.md` ("CORRECT: 16 findings") into
`research-tree/build/FAULTS.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`) as version 2, as
the top session decided each finding (r57-0021) below. First copy version 1 byte for byte to
`research-tree/build/FAULTS-v1.md` (the review cites its lines). Keep version 1's structure; at the end add "Changes
from version 1": one line per finding and decision, with what changed. Marks as in version 1.

## Decisions
All 16 findings are accepted as the review states them, the lighter ones too. On top of them:
1. **Counts.** Recompute every count and section 0 from the corrected classes: on the audit's 44 first (the review's
   corrected counts, with D5 and B6), then on the at least 56 of finding 8, the twelve added faults each in the table
   with its source and class marked [e] where the review classed it by reasoning. Say what each count counts
   (r57-0608), and that 56 is a lower bound (the End list's test gaps where the code is right are left out, and say so).
2. **Finding 4.** Drop gap 4(b) (renewing the cap while open questions fall). Keep the cap un-renewed as FX-W6 built
   it; list renewal on V under "not known" as a hypothesis that needs a model run and a refuter before anything is
   built.
3. **Finding 5.** Gap 4(a) cites `research-tree/build/COMPLEXITY.md` lines 59-64 (1.8 h, about 108 ticks) and
   computes nothing new.
4. **Finding 9.** Say plainly in section 0 what the app's helpers do not do that our session control did (fencing
   after replacement, a restart limit, hang detection): those checks are dropped, not done, and the loss is
   unmeasured. Do not edit COMPLEXITY.md; name the omission (its lines 269-273) for the top session.
5. **Findings 1, 3, 12, 13.** No paper is needed: state each class from the records; where a class still waits on an
   app fact (A5) or a small test (D10), say so in section 0.
6. **The review's "Not done"** (E's F3 to F5 from titles only; some refute files scanned, not read in full; Gray and
   Cheriton not read; D10's process-id reuse not traced past `lane.mjs` lines 44 and 60): list each under "not known".

## Section 0
Rewrite it from the corrected figures: the answer first, at most 12 plain lines, for the owner. His questions: did the
faults come from borrowed designs applied wrongly or from our own glue; can we know now or only after the pilot; do we
need more papers; where should a proven algorithm replace ours. Answer each plainly.

## Limits
Write only `FAULTS.md`, `FAULTS-v1.md` and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/faults-fold/`.
Open library records with `bash library/lookup.sh -f <id>`. No commit, no web request, no helper or session start, no
command over 150 s. Tokens: expected about 3 M, limit 6 M; counter
`node research-tree/build/tools/tokens-self.mjs "fold of the faults audit"` every 10 calls from call 20. At about
300 K context or at the limit, write the file as it stands with "Left to do" and return LIMIT. Return the new section
0, the counts by class and your token count.
