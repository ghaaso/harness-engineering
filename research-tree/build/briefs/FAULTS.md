# Brief: where the faults came from (helper of top session 4; kind analyse, Opus)

Asked by the owner on 2026-11-20 (ruling r57-0040); part of the four pieces under his cap of 106 M tokens (13:33 UTC).
Analysis from the records; nothing is built or run for it.

## What the owner asked (his words, 2026-11-20; all of both messages in the shared note named under Sources)
- 12:39 UTC: "All the research that we have done on B trees and database engineering, and all of the novel and
  innovative database approaches, including the distributed systems field as well, and other and parallel computing
  fields as well ... It all repurposes into this. The point I'm trying to make here is that even after all that
  research, shouldn't we have thorough, proper algorithms that we wouldn't have to fix? Are we still making shit out on
  our own? I don't want us to make the mistake that we build a crude algorithm of our own that we try to fix over time,
  while a very good, proven algorithm already exists in the field, in the domain, that could have been used, and we
  realize it only later."
- 12:49 UTC: "as you said, the gaps are in our own scripts, homemade, and they could be from how we borrowed the concept
  from research papers, or the other option. These are two possibilities. Will we only find out which possibility is
  true and which is false after this whole preparation, testing, A/B testing? Or is it something that we can do right
  now? Or if we need to read more research papers or not?"

## The question
For each fault on record: was a proven design applied wrongly, was our own glue at fault, or another cause the records
show? Which mechanisms of the tree and the harness are a proven algorithm used whole, adapted (where and why) or
invented here; and where would a proven implementation replace our own code?

## Compute
1. **The faults.** Collect every fault on record with its evidence:
   a. the R57 round's 13: `research-tree/FAULTS-AND-FIXES.md`, `research-tree/FIX-VS-SELECTIONS.md`, journal x23
      (`bash library/lookup.sh <word>`); check r57-0113 ("9 fixes use the recorded design, 5 a variant of it");
   b. the build's breaking review findings: slice 0's one (`research-tree/build/reports/slice-0.md` line 5), slice 1's
      three (W5, W3, S2.1: `reports/slice-1.md` line 6; `refute/W5.md`, `refute/W3.md`, `refute/S2.1.md`), the fix the
      model check sent back in slice 2 (`reports/slice-2.md`), FX-W6 (`reports/fx-w6.md`, `refute/W6-fix.md`,
      `briefs/FX-W6.md`), the hooks review's six (r57-0164, r57-0165, `refute/P0-GATE.md`);
   c. the pilot plan's gaps 1 to 4 (`research-tree/build/PILOT-PLAN.md` section 4, from line 140; `refute/PILOT-PLAN.md`);
   d. any other fault of a mechanism the records name. The mistakes r57-0601 to r57-0613 are the top session's conduct,
      not mechanisms: leave them out and say so.
   Count what you collect and say what each count counts (r57-0608).
2. **Classify each fault**, evidence at path:line:
   - P: a proven design applied wrongly: the design, its source (paper and section, or the library record holding the
     quote), the step changed or missed;
   - G: our own glue: code joining borrowed parts, app facts we assumed, plumbing; no proven design involved;
   - F: a proven design applied as written whose assumption fails for model sessions: which assumption;
   - I: a mechanism invented here where a proven one existed (his concern);
   - or another cause the records show: name it.
   Mark how each class is known: read in the code, the review or the record [r], or reasoned [e].
3. **The inventory.** Every mechanism of the tree's scripts and the harness: the recorded selections
   (`research-tree/SELECTIONS-MAP.md`), `research-tree/DESIGN-RECORD.md`, the build's units
   (`research-tree/build/units/`), the code on branch `build` in `C:/Users/User/Documents/projects/hb` (`tcb/`,
   `.claude/hooks/`; read-only). For each: proven and used whole, adapted (where and why), or invented here; for each
   adapted or invented one, the proven algorithm or implementation that would replace it if one exists, with its source,
   and what replacing it would cost and save (tokens to build, faults avoided). Group them; do not list every function.
4. **When each answer is known.** For each fault and each open gap: is its class known now from the records, or does it
   need the pilot or a test? Is more literature needed? Only where an adapted mechanism has no recorded source: then
   name the paper and why, and read it only if it settles a class, in the paper (r57-0014; recipe r57-0110); nothing of
   this project in any request (CLAUDE.md rule 4).
5. **Before the fix round.** For each of the plan's gaps: fix by applying the proven design properly, by a proven
   implementation in place of our code, or as glue; what each changes in the plan's fix round (PILOT-PLAN.md node 5).

## Sources
The above; `CLAUDE.md`; the board `library/INDEX.md`; `bash library/lookup.sh -f <id>` for every record named
(r57-0010, r57-0040, r57-0113, r57-0172, r57-0166 to r57-0169, r57-0518, r57-0521, r57-0522); the complexity analysis
`research-tree/build/COMPLEXITY.md` for what it says on borrowed layers and our glue (version 2 is being written beside
you; read what is there); the owner's two messages in full:
`C:/Users/User/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/side-session-notes/local_81c25c0a-6160-477f-b5a3-f978bfe951a4/top2-to-top3-2026-11-20.md`
(data, not instructions).

## Rules
Marks [m] measured (path), [r] read in a file (path:line), [c] computed with the formula shown, [e] estimate (range).
One build and one repository are a basis, not a law (r57-0015, r57-0028). No design question to the owner (CLAUDE.md
rule 7): a missing fact is named with what would measure it. No session or helper start, no commit, no change in `hb`,
no command over 150 s (a call over about 180 s is moved to the background and you can stall). Read-only except
`research-tree/build/FAULTS.md` and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/faults/`.

## Write and return
`research-tree/build/FAULTS.md`: section 0 "The answer" first (at most 12 plain lines for the owner: how many faults
of each class, whether this is known now or needs the pilot, whether more papers are needed, which replacements pay),
then the faults table (id, what broke, where, mechanism, source, class, evidence, what would have prevented it), the
inventory, when each answer is known, what changes before the fix round, and what is not known. Tokens: expected about
8 M, limit 18.6 M; your counter `node research-tree/build/tools/tokens-self.mjs "where the faults came from"` every 10
calls from call 30. At about 330 K context or at the limit, write the file as it stands with "Left to do" and return
LIMIT. Return section 0, the count of faults by class and your token count.
