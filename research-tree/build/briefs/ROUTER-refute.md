# Brief: blind review of the router (helper of top session 4; kind refute, Opus)

Refute `research-tree/build/ROUTER.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`), written by
another helper from the brief `research-tree/build/briefs/ROUTER.md`. The owner asked for a router that gives each
operation inside a session its own model and effort (ruling r57-0041), to save tokens on his two weekly meters without
losing quality (r57-0003: quality first). The research run's plan will use it, so every row, break-even and saving must
stand on its source. Write your verdict to `research-tree/build/refute/ROUTER.md`. You change no other file and start
nothing.

## Check, each against its source (not against the analysis's own wording)
1. **The operations and their token shares**: recount at least one from the transcripts with the counting rule of
   `research-tree/build/tools/tokens-self.mjs` (input + cache creation + cache read + output, once per message id). Is
   what each count counts said?
2. **The mechanisms**: is each real and allowed as described (the Agent tool's model and effort; the app's
   set_session_model and set_session_effort; workflows; agent definitions; forks)? Is each cost cited right (fixed load
   r57-0201, hc1-0100 to hc1-0112; the provider's prompt caching through the claude-api skill)? Is each break-even
   formula right, with its inputs marked, and does it count the return's re-reads in the parent's window?
3. **What each model is measured to do**: is each row's mark right ([m] needs a measurement on our operations; the
   provider's documentation is [r]; the board says of a1-0405 "no saving read in tokens on code")? Does any row claim a
   cheaper model gives the same output where nothing measured it, without saying so?
4. **The objective**: if the analysis separated the meter weights from files on disk, recompute them; if it gave
   ranges, are they the plausible ones, and is each hypothesis's source marked (r57-0514, a1-0500 to a1-0504, r57-0170)?
5. **Proven routers first** (r57-0040): is each published router or cascade described as its source states (a1-0322
   to a1-0336, journal x48)? Is the assumption said to fail really failing here? Was a proven method dismissed, or one
   invented, where a proven one fits?
6. **The router table**: does each row follow from the break-evens and the measurements? Does any row risk quality
   without saying so? Does any row break the routes in force (`.claude/hooks/tier-routes.json`) or the owner's rulings
   (r57-0005, r57-0035, r57-0041, r57-0206) without saying so?
7. **The check against the documents**: is the document the owner remembers identified right (search
   `../EMS_workshop1` yourself, read-only)? Are the answers to his two questions (are the role assignments accurate to
   it; is it good enough) supported by `docs/ORCHESTRATION-DESIGN-2026-10.md` section 3, r57-0201, r57-0206 to
   r57-0210 and `research-tree/ORCHESTRATION.md`?
8. **The saving**: recompute the expected saving on each meter for the plan (`research-tree/build/PILOT-PLAN.md`
   version 2) and the reduced path (`research-tree/build/COMPLEXITY.md`). Is a range given wherever a weight or a pass
   rate is not measured?
9. **Enforcement**: is what the hook can and cannot see right (r57-0105, r57-0106, r57-0120)?
10. **Rules**: a design question to the owner, or a decision that is his (CLAUDE.md rule 7, r57-0001)? One build, one
   week or one repository treated as a law (r57-0015, r57-0028)? Marks right ([m], [r], [c] with formula, [e] range)?

## Verdict file
First line: `PASS` or `CORRECT: <n> findings`. Then one row per finding: what the analysis says, what the source says
(path and line), the corrected figure or wording, and whether it changes section 0, the router table or the saving.
Then what you checked and found right, in one short list. Plain words.

## Limits
Read-only everywhere except the verdict file and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/router-refute/`.
Open library records with `bash library/lookup.sh -f <id>`. The provider's documentation through the claude-api skill
(local); no web request. No session or helper start, no commit, no command over 150 s (a call over about 180 s is moved
to the background and you can stall). Tokens: expected about 10.6 M (r57-0173: the build's refuters, median), limit
18.5 M. Read your count with `node research-tree/build/tools/tokens-self.mjs "blind review of the router"` every 10
calls from call 30; at about 330 K context or at the limit, write the verdict as it stands and return LIMIT. Return the
verdict's first line and the findings that change section 0, the router table or the saving.
