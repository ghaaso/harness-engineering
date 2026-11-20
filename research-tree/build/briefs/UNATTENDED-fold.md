# Brief: fold the blind review into running without the typed go (helper of top session 4; kind analyse, Opus)

Fold the blind review `research-tree/build/refute/UNATTENDED.md` ("CORRECT: 14 findings") into
`research-tree/build/UNATTENDED.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`) as version
2, as the top session decided each finding (r57-0021) below. First copy version 1 byte for byte to
`research-tree/build/UNATTENDED-v1.md`. Keep version 1's structure; replace its "Left to do" by the review's judgment
of each item; at the end add "Changes from version 1": one line per finding and decision, numbered as the review
numbers them. Marks as in version 1. Scripts: `unattended/` and `unattended-refute/` under
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/`.

## Decisions
All 14 findings are accepted as the review states them. On top of them:
1. **The wait before the reset (findings 3, 4, 6).** Give the start in two forms and what each needs from him; choose
   neither for him: (E1) he types the go at the reset, at his desk; (E2) he types it before, sets Windows not to sleep
   on mains power until the run ends (his own setting; the app's keep-awake holds only while a turn works), and the
   coordinator waits with one one-shot wake at the reset, not hourly wakes. Give each form's tokens and turns.
2. **Stops in the run (finding 5).** A five-hour limit fails the running helpers and only the main session waits: the
   coordinator restarts its failed helpers after the reset of that limit. Say what he can and cannot do from his phone.
3. **Checks (finding 9).** Say plainly that path e2 drops what COMPLEXITY.md version 2 says it drops (Q6 to Q11,
   comparison 1) and that with every check of protocol v2 kept the answer is A2's turns. Add the three checks the
   faults audit found e2 also drops: fencing a replaced helper, a restart limit, hang detection
   (`research-tree/build/FAULTS.md` version 2, section 0 line 11).
4. **Settings and privacy (findings 10, 11).** Each setting where the app puts it; Remote Control on the coordinator
   alone, with its trade-off stated (the transcript is kept on the provider's servers while connected); the choice is
   his, none made for him (CLAUDE.md rules 4 and 7).
5. **Not known.** b1 and b2 (P1, with the review's added cost), and everything under the review's "Not checked".

## Section 0
Rewrite it from the corrected figures: the answer first, at most 12 plain lines, for the owner: what he must still do,
how many typed turns and when, what he can do from his phone, what stops the run, what is not known.

## Limits
Write only `UNATTENDED.md`, `UNATTENDED-v1.md` and scratch files in `unattended-fold/` under the scratchpad above. Open
library records with `bash library/lookup.sh -f <id>`. No web request, no commit, no helper or session start, no
probe, no command over 150 s. Tokens: expected about 3.5 M, limit 6 M; counter
`node research-tree/build/tools/tokens-self.mjs "fold of running without the typed go"` every 10 calls from call 20.
At about 300 K context or at the limit, write the file as it stands with "Left to do" and return LIMIT. Return the new
section 0, the ways table and your token count.
