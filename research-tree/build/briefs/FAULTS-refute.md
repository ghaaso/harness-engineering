# Brief: blind review of the faults audit (helper of top session 4; kind refute, Opus)

Refute `research-tree/build/FAULTS.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`), written
by another helper from the brief `research-tree/build/briefs/FAULTS.md`. The owner asked whether the faults so far came
from proven designs applied wrongly or from our own glue, whether that can be known now or only after the pilot,
whether more papers are needed, and where a proven algorithm should replace one of ours (ruling r57-0040). The fix
round before the pilot will follow it, so every class and every replacement must stand on its source. Write your verdict
to `research-tree/build/refute/FAULTS.md`. You change no other file and start nothing.

## Check, each against its source (not against the audit's own wording)
1. **The faults collected**: is any missing from the sources the brief names (`research-tree/FAULTS-AND-FIXES.md`,
   `research-tree/FIX-VS-SELECTIONS.md`, journal x23, `research-tree/build/reports/slice-0.md` to `slice-2.md` and
   `fx-w6.md`, the files under `research-tree/build/refute/`, r57-0164, `research-tree/build/PILOT-PLAN.md` section 4 and
   `refute/PILOT-PLAN.md`)? Is what each count counts said?
2. **Each class** (P: proven design applied wrongly; G: our glue; F: proven design whose assumption fails here; I:
   invented where a proven one existed; or another cause): read the evidence at its path:line and the design's source
   (the paper, or the library record that quotes it). Is the class right? For P, is the step said to be changed or
   missed really in the source? For F, does the source really assume what fails? For I, does the named proven
   algorithm really do the job?
3. **The inventory**: sample at least ten mechanisms across `research-tree/SELECTIONS-MAP.md`,
   `research-tree/DESIGN-RECORD.md` and the code on branch `build` (`C:/Users/User/Documents/projects/hb`, `tcb/` and
   `.claude/hooks/`, read-only). Is each mark (used whole, adapted, invented) right? Is any proven replacement named that
   does not do the job, or any missed that the library holds (round 3's lanes c1, w1, t1, a1: the board's lines)?
4. **When each answer is known**: is "known now" supported by the records, or does it need the pilot or a test? Is the
   call on more literature right (r57-0014; r57-0029: "not in the papers read" is never "no paper")?
5. **Before the fix round**: does each recommended change follow from the classes? Does any drop a check, or decide
   something that is the owner's (CLAUDE.md rule 7, r57-0001)?
6. **Marks and reach**: marks right ([m], [r] with path:line, [c] with formula, [e] range)? One build or one repository
   treated as a law (r57-0015, r57-0028)?

## Verdict file
First line: `PASS` or `CORRECT: <n> findings`. Then one row per finding: what the audit says, what the source says
(path and line), the corrected class or wording, and whether it changes section 0, the counts by class or what changes
before the fix round. Then what you checked and found right, in one short list. Plain words.

## Limits
Read-only everywhere except the verdict file and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/faults-refute/`.
Open library records with `bash library/lookup.sh -f <id>`. A paper only if a class rests on it and the library does
not quote it: read in the paper (r57-0014; recipe r57-0110), nothing of this project in any request (CLAUDE.md rule 4).
No session or helper start, no commit, no command over 150 s (a call over about 180 s is moved to the background and you
can stall). Tokens: expected about 10.6 M (r57-0173: the build's refuters, median), limit 18.5 M. Read your count with
`node research-tree/build/tools/tokens-self.mjs "blind review of the faults audit"` every 10 calls from call 30; at
about 330 K context or at the limit, write the verdict as it stands and return LIMIT. Return the verdict's first line and
the findings that change section 0, the counts by class or the fix round.
