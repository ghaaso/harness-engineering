# Brief: top session 8, enforce the method (kind orchestrate, Opus)

From top session 7, 2026-11-24, which ends here at 337.6 K of context (its hand-over point was about 250 K). Data for
you; you decide the helpers' briefs (r57-0021). Start only on the owner's go.

## What the owner said (2026-11-24, his words are in r57-0056)
Top session 7 kept working in one session far past its ceiling and then offered to start the next piece of work in the
same session. He recalled that this repository has a method for exactly this, and said: where the things that were
designed did not get enforced, hooks and an actual implementation must enforce them, before the next work (the
cache-expiry fix and the rest of r57-0531 wait).

## What went unenforced on 2026-11-23 (evidence: `research-tree/build/TOP-STATE.md`, section "Top session 7")
1. **The window ceiling.** The brief said hand over before about 250 K (r57-0171, r57-0008, mistake r57-0604). The
   session ran to 337.6 K and its closing box offered more work here. Nothing measured the window or refused a call.
2. **How many helpers at once.** `RUN:run/WAVE2.md` said to start no part while the replays ran. The session started
   three parts beside two replay units; the app allows 20 helpers at once in a session, helpers of helpers counted;
   one part's reader starts were refused and it was restarted (t7 records; r57-0414 has no gate that counts).
3. **The journal.** Records were appended by an ad-hoc script that reused ids (t7-0607). Three lines were then removed
   and two had a field moved, on or near the owner's word (r57-0055, t7-0800, t7-0801), through `node -e` in the
   shell: the record guard saw none of these writes. Field order is checked only at commit.
4. **A helper's limit without a measured basis.** replay-L6 planned no cost for building its cases and used 3.6 times
   its expected tokens (r57-0617 again, r57-0038).
5. **Reports to the owner.** Each helper's return was relayed as a block of figures with internal labels; he could not
   tell what had been done or how far along the work is (rule 6, r57-0017; memory "Big picture, not figures").
What held: the tier routes, the caps (64.2 M of 87 M; 255.6 M of 600 M), the meter read before each fan-out, the run
folder's gate, scoring written before counts.

## What to do
1. Read first: `library/INDEX.md`; CLAUDE.md; r57-0151, r57-0011, r57-0402, r57-0105, r57-0106, r57-0156, r57-0518,
   r57-0164, r57-0165 (`bash library/lookup.sh -f <id>`); `library/README.md` section "What enforces these rules";
   `.claude/hooks/` (tier-hook, record-guard, plan-gate, library-start) and `tools/check-commit.mjs`; the extractor
   files on hooks as documented and as probed here (x01, x08, x13: by word).
2. One table, every rule: CLAUDE.md rules 1 to 7, the board's "Before you do this" rows, the owner's rulings. For each:
   what enforces it today; what that cannot see; whether it was broken and when (the journal's mistakes r57-06xx and
   t7-06xx, the five above); whether a hook or a script can enforce it and what input it needs; if not, say so plainly.
3. Build what can be enforced, mechanism from the recorded research (rule 7; r57-0011: hooks or scripts, whichever
   works, or both). Candidates, for you to confirm or replace from the record, not a design to copy:
   - the window ceiling: r57-0106 says a hook is not told the context size; measure whether the transcript path a hook
     receives lets it read the last call's usage; above the line only hand-over writes and a successor's start pass;
     the line is computed (ORCHESTRATION.md section 5's formula, r57-0171), not typed in;
   - a count of running helpers against the app's 20 and the computed width (the plan gate's log already holds starts
     and ends);
   - one journal tool as the only way to add a record (next free id, field order, collision check, dry run printed),
     with the guard refusing every other write to `library/journal/`, shell and `node -e` included;
   - what a hook cannot see (a limit's basis, the wording of a report) gets a script check where one is possible and
     otherwise stays a written rule: say which.
4. Check: each hook's self-tests, and each seen live in a real session (r57-0151's gap: several are tested by script
   only); one blind refuter before the owner is shown (r57-0417), breaking findings fixed, no further round.
5. Tokens: read the meter first; expected and limit from the measured roles (r57-0173, r57-0164, r57-0165); put one
   `cap:` to him before the first fan-out and stop at it. Build the window-ceiling check first so it binds you too;
   hand your own window over through files before it.
6. Report to him: the picture first (what is now enforced, what is not and why, what it cost), a handful of numbers,
   no internal labels; a page; markdown behind it. Records through the journal; the board's lines; NEXT.

## Not yours
The cache-expiry measurements and the other lines of r57-0531: they wait for this and for his word. No push. Never
touch `docs/program/pipeline-diagram/`. Today's records and this file are not committed yet (top session 7's last
commit is 4a467c7e): commit them with yours, on his word.
