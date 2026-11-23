# Brief: finish the router (helper of top session 4; kind analyse, Opus)

The first helper on `briefs/ROUTER.md` stopped at its context line (about 325 K) with `research-tree/build/ROUTER.md`
written and four items under "Left to do". Finish them in the same file, so that one blind review checks the whole of
it. Read `briefs/ROUTER.md` (the task and its rules hold for you), then `ROUTER.md`. Its scripts are in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/router/`
(`fit.mjs`, `scan.mjs`, `ops.mjs`, `dup.mjs`, `ivals.mjs`): reuse them; write new scratch files in `router-2/` beside it.

## Do
1. The share of each operation in fresh tokens (input + cache creation + output) as well as in all tokens, and the
   size of tool results (`ops.mjs` with the cache fields); then section 6's saving under the fresh weighting, in tokens.
   Section 0 line 4 and section 6 say the fresh-weighted saving is not computed: compute it.
2. The meter fit with a free weight per model per fresh token (section 2), with what ten readings in whole percents can
   and cannot settle.
3. The reduced path from `research-tree/build/COMPLEXITY.md` version 2 (now written; its section "Changes from version
   1" lists what changed): path e2, chosen (a Fable coordinator, one Opus helper per field running that field's
   helpers, seven fields, about 1.0 B tokens). Recompute section 6 for e2 in place of version 1's figures, and the
   session-level line for it (section 4, "Sessions").
4. Open `../EMS_workshop1/.claude/skills/fixflow-orchestration/SKILL.md` and the model lines of the agent files under
   `../EMS_workshop1/.claude/agents/` (read-only); say in section 5 whether they add anything to section 3 of the design
   document.
Then rewrite section 0 from the finished figures (at most 12 plain lines; answer first) and remove "Left to do" (or
keep what is still left). Keep every other section's structure; mark changed lines' figures as before ([m], [r], [c]
with formula, [e] range).

## Limits
Write only `research-tree/build/ROUTER.md` and scratch files in `router-2/`. No session or helper start, no commit, no
web request, no command over 150 s. Tokens: expected about 4 M, limit 8 M; counter
`node research-tree/build/tools/tokens-self.mjs "finish the router"` every 10 calls from call 20. At about 300 K context
or at the limit, write the file as it stands with "Left to do" and return LIMIT. Return the new section 0, section 6's
table and your token count.
