# Brief: blind review of the complexity analysis (helper of top session 3; kind refute, Opus)

Refute `research-tree/build/COMPLEXITY.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`),
written by another helper from the brief `research-tree/build/briefs/COMPLEXITY.md`. The owner asked whether the
pilot's plan (`research-tree/build/PILOT-PLAN.md`, version 2: 418 M tokens expected, cap 593 M, 8.5-13.8 h, 37-58 of
his turns) is over-engineered and whether a smaller path reaches the same goal. He will decide the pilot on this
analysis, so every figure, path and saving it reports must stand on its source. Write your verdict to
`research-tree/build/refute/COMPLEXITY.md`. You change no other file and start nothing.

## Check, each against its source (not against the analysis's own wording)
1. **The split of the plan** (brief, Compute 1): each node's tokens and each step's hours split into the research work
   and the rest. Recompute the sums from PILOT-PLAN.md sections 1 and 2. For each part of the rest, is the named cause
   right (the protocol's comparisons, a default, an app limit such as r57-0109, a safety margin)? Is the critical path
   right?
2. **The lower bounds for one field** (Compute 2): is each measured input cited right and like for like (kind, model,
   size of task): `research-tree/build/check/E-tokens.md`, library r57-0115, r57-0173, round 3 (r57-0140, r57-0709)?
   Is the widest width the decision rule allows (r57-0414; this PC: r57-0116, r57-0103, the token windows, the
   parent's window) computed right, horizontal and vertical? Is every unmeasured input given as a range with what
   would measure it?
3. **The paths** (Compute 3): recompute each path's tokens, hours, owner turns, and cost against the direction's
   budget (`docs/program/RESEARCH-DIRECTION-2026-11-16.md` section 7). For path c (round 3, measured here),
   spot-check its token count from one lane's transcripts with the counting rule of
   `research-tree/build/tools/tokens-self.mjs` (input + cache creation + cache read + output, once per message id).
   For path b and any start without the owner typing: is each way really allowed by the app as the record shows it
   (r57-0109, r57-0157, r57-0158, r57-0418), and never a way around the app's own controls? Is what it needs from the
   owner stated?
4. **The parallel readers and writers** (Compute 4): is each saving computed against the counterfactual of one reader
   and one writer at a time, and is it said where the research does not apply?
5. **The verdict and the reduced plan** (Compute 5): does the reduced plan reach the same goal (checked results on the
   direction's eight lanes, sections 1, 3 and 4 of the direction)? Is what it loses named? Does it drop a check that
   protocol v2 (`docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` sections 1, 7, 10 to 13) or
   `research-tree/RULINGS.md` requires, without saying so? Does it put a design question to the owner, or decide
   something that is his (CLAUDE.md rule 7, r57-0001)?
6. **The marks**: is each figure's mark ([m] measured, [r] read, [c] computed with the formula shown, [e] estimate)
   right? Is one build or one week treated as a law (r57-0015, r57-0028)?

## Verdict file
First line: `PASS` or `CORRECT: <n> findings`. Then one row per finding: what the analysis says, what the source says
(path and line), the corrected figure or wording, and whether it changes the answer (section 0), the paths table or
the reduced plan. Then what you checked and found right, in one short list. Plain words.

## Limits
Read-only everywhere except the verdict file and scratch files in a folder of your own under the session scratchpad.
Open library records with `bash library/lookup.sh -f <id>`. No session or helper start, no command over 150 s (a call
over about 180 s is moved to the background and you can stall), no web request, no commit. Tokens: expected about 9 M
(the pilot plan's review 9.8 M; the build's refuters, median 10.6 M), limit 12 M (the round's limit is 30 M). Read
your count with `node research-tree/build/tools/tokens-self.mjs "blind review of the complexity analysis"` every 10
calls from call 30; at about 330 K context or at the limit, write the verdict as it stands and return LIMIT. Return the
verdict's first line and the findings that change the answer, the paths table or the reduced plan.
