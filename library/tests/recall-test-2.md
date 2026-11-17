# Recall test 2 (library version 1)

Reader: a Sonnet session with no prior knowledge. Used only README.md, INDEX.md, GLOSSARY.md, lookup.sh and the journal through lookup.sh. Did not open recall-test-1.md.

| # | Answer | Record ids | How found | Searches | Confidence | Missing or unclear |
|---|---|---|---|---|---|---|
| 1 | Sonnet: reading across files is kind "read" (r57-0150), and the model must be passed. The description must start with the kind of job. They should not run one after another: they start together (r57-0006); starting them serially is a recorded mistake (r57-0603). | r57-0150, r57-0006, r57-0603, r57-0120 | Board row "Start a helper" gave 0150; ruling 0006 and mistake 0603 by title match | 3 | partly | The exact form of the kind at the front of the description (a word, a colon?) is not in the record. "May" is answered only by the ruling and the mistake, not by a rule the hook enforces. |
| 2 | A hook can stop it: one refused a write outside an allowed folder, with permissions bypassed. It was seen working, but only in one session, Haiku, app 2.1.325. A deny rule: not tried. Edit tool and writes through shell: not tested. | r57-0105, r57-0108, r57-0120 | Known gaps list, then 0105 | 3 | partly | The tier hook (0120) checks models, not write folders. Nothing says which hook did the write refusal in the product or how it is wired for a helper's own files. |
| 3 | No. The documentation says the caller's model value comes first, so a definition's model does not fix it (documented only, from summaries, never tried). A hook fixes it, seen working; a deny rule or workflow script could. | r57-0108, r57-0105, r57-0120 | Board row on agent definitions did not exist; found through the Known gaps list and the word "agent definition" in the Facts lines | 3 | sure | The board has no row for this question. The "caller beats definition" part is a summary-status record and the library itself says it was never tried. |
| 4 | Run recall test 2 on library version 1. Blocked by nothing. (This is the test I am doing.) | r57-0508 | Board, "Open, in the order of work", line 1 marked NEXT | 1 | sure | Nothing. |
| 5 | Do not supersede it (only the writer or the top session may). Write your finding as a new `result` or `fact` record with its evidence, and a record of kind `open` whose claim begins "proposed correction of r57-0301" and whose `see` names r57-0301 and your finding. Put both in your own file journal/<date>/<your prefix>.jsonl; the top session decides in an adjudication. | README rules 2 to 5 and worked examples; r57-0301 | README rules and the worked examples | 1 | sure | The id numbers: 0301 is a result, the finding takes your next free 03xx or 01xx number, the open record takes 05xx; README gives this. Clear. |
| 6 | The check is the run each change must pass: the test suite plus review, in series. One run of the suite took 596 s (about 10 minutes), one test file at a time, one run only. | GLOSSARY "the check"; r57-0015, r57-0103 | Glossary; word lookup "the check" gave 0015; 0103 for the time | 3 | partly | The review part has no duration. The 596 s is for the tree's suite only and is one run. The glossary entry and 0103 do not say plainly that the check = suite 596 s. |
| 7 | 14 rules ran and worked on 2026-11-01: Haiku extractors with a closed schema; Sonnet maps, gates, citation checks, web collection; Opus analysts at high; Opus xhigh for O-01 and P0 skeptics; Fable for hypotheses, routing, gates, adjudication; the return contract; G1 verdicts, W2 briefs, owner form; G2 register, open-risks, three decisions, adjudications; citation check; skeptic verdicts; web re-check; severity re-set by Fable; no fan-out in Fable gates; web research with tools loaded first. "Worked" = ran with no failure on record. | r57-0208, r57-0201 | Board "How far the method documents were tested" | 2 | sure | The evidence README says 12 ran and worked, not 14; the library names the mismatch but did not settle it. |
| 8 | Not recorded. Never measured. Only a guess: about 270 s instead of 596 s, untested, because nobody knows if the test files are independent. | r57-0403, r57-0103 | Known gaps list line "Whether test files can run side by side" | 1 | not recorded | The "four at a time" figure does not appear anywhere. Correct answer is "not recorded". |
| 9 | Run `tools/ensure-tier-hook.sh <folder>` first. It says whether the tier hook is wired there and installs it if the folder is inside this repository and has no settings file. Check that the hook is present before starting the session. | r57-0026, r57-0122 | Board row for owner ruling r57-0026 (last of the rulings) and r57-0122 in facts | 2 | sure | The "Before you do this" table has no row for starting a session in a folder (only the ruling list has it). Whether the hook works in other folders is not tested (Known gaps). |

Answers: 5 sure (3, 4, 5, 7, 9), 3 partly (1, 2, 6), 1 not recorded (8). That is 9.

## What still cost reading or left me unsure

- The "Before you do this" table lacks rows for: starting a session in a folder (Q9), choosing an agent definition's model (Q3), and what stops a write outside folders (Q2). I found these by reading the whole ruling and fact lists.
- Board lines are short, so most questions needed a full record read after the board; the full records run 400 to 1,500 characters.
- Q1: the kind-at-the-front syntax is not shown by an example.
- Q6: "the check" appears in the glossary, but the number (596 s) sits in a different record (0103); the link is only by the handle "check".
- Q7: the 14 versus 12 mismatch is flagged but unsettled.
- Q2/Q3: several answers rest on one session, one model, one app version, or on page summaries.
- lookup.sh word search returned only one hit for "the check", mixing a ruling about bottlenecks; it does not rank by relevance.

## Totals

- Files read: 4 (README.md, INDEX.md, GLOSSARY.md, lookup.sh); journal records read only through lookup.sh.
- Records read in full: 23 (r57-0150, 0603, 0105, 0106, 0108, 0120, 0206, 0025, 0026, 0122, 0006, 0508, 0507, 0501, 0103, 0403, 0201, 0208, 0209, 0210, 0004, 0015, 0301 in part).
- Searches run: 24 lookup.sh calls (23 by id, 1 by word); 0 other greps.
