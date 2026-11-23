# Brief: fold the blind review into the router (helper of top session 4; kind analyse, Opus)

Fold the blind review `research-tree/build/refute/ROUTER.md` ("CORRECT: 11 findings") into
`research-tree/build/ROUTER.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`) as version 2, as
the top session decided each finding (r57-0021) below. First copy version 1 byte for byte to
`research-tree/build/ROUTER-v1.md` (the review cites its lines). Keep version 1's structure; at the end add "Changes
from version 1": one line per finding and decision, with what changed. Marks as in version 1. The review's scripts are
in `router-refute/` and the analysis's in `router/` and `router-2/` under
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/`.

## Decisions
All 11 findings are accepted as the review states them. On top of them:
1. **Finding 1 (proven routers first, r57-0040).** Name the borrowed form in section 0 and section 3: the provider's
   own documented pattern (one model for the main loop, helpers on cheaper models for sub-tasks; lower effort on the
   capable model before a cheaper model), cited at the documentation's lines. Say why the published routers and
   cascades do not fit here, citing the library's records (a1-0332, a1-0333, a1-0334, a1-0405; journal x48) and
   quoting a figure only as the record quotes it from the paper (r57-0014); a figure no record holds is left out. The
   order "lower effort first, then a cheaper model" governs rows 10 to 13 and 18.
2. **Findings 2 to 5.** Recompute the levers and the saving with the review's corrections: the plan's coordinator
   timer (the round-3 Fable top session as the like-for-like case), the counts lever without the re-reads it does not
   save, the Fable column as ranges (the fit with an outside-load term beside the fresh-only fit), and the per-model
   weights as the review's ranges. Give every saving as a range on both meters.
3. **Finding 6.** Row 7: a run helper whose output needs judgment is Sonnet; Haiku only for a pass or fail extraction
   into a fixed schema. No row may break `.claude/hooks/tier-routes.json` or r57-0206 without saying so.
4. **Self-switching.** Confirm the review's reading by loading the schemas of the app's set_session_model and
   set_session_effort tools with ToolSearch (`select:mcp__ccd_session_mgmt__set_session_model,mcp__ccd_session_mgmt__set_session_effort`)
   and reading their descriptions; call neither. If they refuse the calling session, drop the probe and say so.
5. **Effort needs written instructions.** Say in section 7 that the Agent tool sets effort only when the owner,
   CLAUDE.md or a skill asks for it, so the router's efforts apply only once written into one of them; nothing is
   written now.

## Section 0
Rewrite it from the corrected figures: the answer first, at most 12 plain lines, for the owner. His question: is a
model per operation inside a session worth it, and how should it be done. Say plainly what is measured, what is a
range, and what is not known.

## Limits
Write only `ROUTER.md`, `ROUTER-v1.md` and scratch files in `router-fold/` under the scratchpad above. Open library
records with `bash library/lookup.sh -f <id>`. No commit, no web request, no helper or session start, no command over
150 s. Tokens: expected about 3 M, limit 6 M; counter `node research-tree/build/tools/tokens-self.mjs "fold of the router"`
every 10 calls from call 20. At about 300 K context or at the limit, write the file as it stands with "Left to do" and
return LIMIT. Return the new section 0, the router table's changed rows, the saving table and your token count.
