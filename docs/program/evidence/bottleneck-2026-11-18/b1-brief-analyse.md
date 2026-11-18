# Brief b1/analyse (Opus, kind analyse): draft BUILD-IN.md and b1-claims.md

Repo root: C:\Users\User\Documents\projects\harness-engineering. Folder F = docs/program/evidence/bottleneck-2026-11-18/.
Write only F/BUILD-IN.md and F/b1-claims.md. Read only otherwise: run no script, test, hook or lane command.
Do not touch research-tree/lane/*, docs/program/evidence/pc-freezes-2026-11-17/, research-tree/tools/av-watch.ps1, library/INDEX.md.

Task (library record r57-0504): how the decision rule is built into the harness and into the research tree's
scripts (research-tree/tcb/). Design only, no code.

Read: F/DECISION-RULE.md (the rule); its sources F/o1-report.md, F/o2-report.md, F/own-data.md (open sections as needed);
the five maps F/b1-map-lane.md, b1-map-hooks.md, b1-map-tcb-a.md, b1-map-tcb-b.md, b1-map-fixes.md. The maps are Sonnet
output: re-read the code at every place your design rests on. Records: `bash library/lookup.sh -f <id>` for r57-0408,
r57-0406, r57-0407, r57-0511, r57-0128, r57-0401, r57-0402, r57-0403, r57-0011, r57-0105, r57-0106, r57-0120, r57-0127,
r57-0404, r57-0505, o1-0101, o1-0102; `bash library/lookup.sh o1-040` and `o2-040` for the detection and scheduling
hypotheses. If the library has nothing on a point write "not recorded"; never answer from memory.

Binding rulings: no question to the owner (r57-0001). A number is computed from a measurement against the objective
(quality first, then least time, memory, tokens; r57-0002, r57-0003); a missing number is named as one of the eight
measurements in F/DECISION-RULE.md section "Numbers to compute here" (numbered 1 to 8), with a safe default until it
exists. Hooks or scripts, whichever works best (r57-0011). Every claim is marked proven in the literature (with the
record of the quote), measured here, observed here, or hypothesis, with a record id.

BUILD-IN.md, in this order:
0. The answer in at most ten lines.
1. One section per step of the rule (0 to 6) and one for the several-writers rule. In each, six numbered answers:
   (1) where the signal is read on this PC, path:line, or "missing" and the smallest thing that would produce it;
   (2) the mechanism that carries it (hook, script, the lane, admit.mjs, watch.mjs, an instruction to the coordinating
   session) and why that one and not the others; who runs each rule and at which event; a step a session must
   remember is the weakest form; (3) which existing file and function changes and how, or which new file (file and
   function, no code); (4) cost to run in tokens, time, memory: known with its source, or "not measured";
   (5) mark and record id; (6) which of the eight measurements must come first, and the safe default until then.
   Answer separately for the harness (a coordinating session, its helpers, heavy commands through the lane) and for
   the tree (tcb), where they differ.
2. Fit with the 13 fix designs and 0b (table in b1-map-fixes.md): per fix, replaces / changes / leaves alone, and why.
3. What the tree needs that the harness does not (a node is a session, not a process: its memory, tokens, context,
   handover, slots held by committed children).
4. Build order: small pieces, each with what it depends on and how it would be shown to work (name the check; run
   nothing now). First the pieces that need no measurement.
5. Corrections: anything that contradicts an existing record or the rule's own table (check at least: the rule's
   Step 1 table says the week share is logged; b1-map-lane.md says no file logs it).
6. Not known.

F/b1-claims.md: every factual claim BUILD-IN.md rests on, numbered C1.., one per line:
claim | path:line or record id | exact quoted text (at most 15 words) | mark.
Each design choice as D1.. : choice | reason | records it rests on.
End the file with the line `<!-- b1-analyse done -->`.

Keep BUILD-IN.md under about 400 lines, in plain words. Final reply: two lines (paths; counts of C and D).
