# Brief: blind review of running without the owner's typed "go" (helper of top session 4; kind refute, Opus)

Refute `research-tree/build/UNATTENDED.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`),
written by another helper from the brief `research-tree/build/briefs/UNATTENDED.md`. The owner asked for the research
run not to need his typed "go" for every session, by the ways the app itself allows and never around its controls
(ruling r57-0042); he will not be at his desk for the whole run. The run's plan will rest on this, so every way, every
count of his turns and every "allowed" must stand on its source. Write your verdict to
`research-tree/build/refute/UNATTENDED.md`. You change no other file and start nothing.

## Check, each against its source (not against the analysis's own wording)
1. **Each way said to be allowed**: is it allowed as the source states it (the app's instructions quoted in the brief,
   r57-0109, r57-0157, r57-0158, r57-0418, the public documentation cited)? Is an instruction read as allowing more than
   it says (who must have asked for the step, on which turn, in which project)? Is what was observed kept apart from
   what the instructions say?
2. **Never around the app's controls**: does any way kept start sessions, answer for him or change a setting outside
   the app's own rules (simulated typing or clicks, command-line sessions the app does not see, a setting changed
   without his approval)? Is each way left out left out for a true reason?
3. **What each needs from him**: is it complete (a go in his own words, a cap, a setting he changes or approves, his
   phone, the permission mode)? Is any of it decided for him (CLAUDE.md rule 7, r57-0001)?
4. **The research run**: recompute his turns, when they fall and the hours he must be present, for the plan
   (`research-tree/build/PILOT-PLAN.md` version 2) and the path `research-tree/build/COMPLEXITY.md` version 2 chooses.
   Does the analysis redo or contradict the complexity analysis's path b or variant e2 without saying why? Is any check
   of protocol v2 dropped to save a turn (`docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` sections 1, 7, 10 to
   13)? Are the tokens each way adds (polls, successors) counted?
5. **What stalls a run while he is away**: are the sleep timer, permission prompts, the limits, stalled helpers and app
   restarts each answered, by the app's own means?
6. **The probes**: is each named with its cost, and is each one he must approve (r57-0506)? Is anything stated as
   known that only a probe would show?
7. **Marks and sources**: [m], [r] (path:line or URL), [c] with formula, [e] range; was any figure taken from a fetch
   summary rather than the page (memory note on fetch summaries; r57-0606)? Did any web request carry anything of this
   project (CLAUDE.md rule 4)?

## Verdict file
First line: `PASS` or `CORRECT: <n> findings`. Then one row per finding: what the analysis says, what the source says
(path and line, or URL), the corrected figure or wording, and whether it changes section 0, the ways table or the
owner's turns. Then what you checked and found right, in one short list. Plain words.

## Limits
Read-only everywhere except the verdict file and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/unattended-refute/`.
Open library records with `bash library/lookup.sh -f <id>`. Public documentation read raw (`curl --ssl-no-revoke`,
r57-0110), nothing of this project in any request (CLAUDE.md rule 4). Deferred tools' descriptions may be read by
loading their schemas with ToolSearch; call none of them. No session, helper, workflow, schedule or probe started, no
setting changed, no commit, no command over 150 s (a call over about 180 s is moved to the background and you can
stall). Tokens: expected about 10.6 M (r57-0173: the build's refuters, median), limit 18.5 M. Read your count with
`node research-tree/build/tools/tokens-self.mjs "blind review of running without the typed go"` every 10 calls from
call 30; at about 330 K context or at the limit, write the verdict as it stands and return LIMIT. Return the verdict's
first line and the findings that change section 0, the ways table or the owner's turns.
