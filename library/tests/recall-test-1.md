# Recall test 1: can a session that knows nothing answer from the library?

Reader: a fresh Sonnet session, 2026-11-18. Used only `README.md`, `INDEX.md`, `journal/2026-11-18/r57.jsonl`
(80 records, 37 KB) and, for step 3, two evidence files. No notes, no memory, nothing else.

**Result in one line:** 8 of 14 answered with confidence ("sure"), 5 partly, 1 "not recorded". Every id lookup worked once
the right tool was used; no record contradicted another. The failures are about what the format hides (status,
order, undefined words, answers that live outside the library), not about missing content.

How I counted. "Word searches" = a search by a word. "Id fetches" = one call that pulls records by id
(one call can pull several ids). The `Grep` tool cut off most records ("[Omitted long matching line]"), so three id
fetches were repeated with `grep -rhE` in Bash (listed under q1, q2, q3).

## The 14 questions

| # | Answer (at most three lines) | Records used | How found | Searches (word / id fetches) | Sure? | Missing, unclear or contradictory |
|---|---|---|---|---|---|---|
| 1 | Do not ask: a mechanism comes from the recorded research or literature, a parameter is computed from measurements against the objective, a missing fact is measured. Show him results and reasoning, not choices. Asking 29 design questions is a recorded mistake. | 0001, 0002, 0601 | Board "Before you do this", line "Ask the owner how something should work, or which option" | 0 / 2 (first one failed on long lines) | sure | Nothing for the case where literature and measurement both leave two designs open. Mild tension: 0001 says "a missing fact is measured", 0506 says each small test needs the owner's word. |
| 2 | Model: "the smallest model that gives the same output"; the tier table is in docs/ORCHESTRATION-DESIGN-2026-10.md section 3 (outside the library, not opened). Putting readers on the most expensive model was a mistake. One after another: no, work that can run together starts together. | 0005, 0006, 0603 (also read 0109, 0115) | Board line "Start a helper or a child session"; word search `sonnet\|haiku` | 1 / 2 | partly | No record says "readers run on tier X". 0005 hands the answer to a document I may not open. Only 0115 shows Sonnet readers were used (measured). 0109 was on the board line but irrelevant. |
| 3 | One run: 596 s (1,018 tests: 965 pass, 53 skipped), peak memory 494 MB, one test file at a time. Side by side: not tested. A hypothesis says about 270 s if they could. | 0103, 0403 | Board: Facts line r57-0103; Hypotheses line r57-0403 | 0 / 2 (first one failed on long lines) | sure (time, memory); side by side is "untested" | Board line for 0403 reads "Test files side by side: about 270 s per run" and states it like a fact; only the section heading says "not tested". The record does not say 494 MB is working set or that "3 of 24 threads" is the whole PC (see evidence check 1). |
| 4 | A hook (PreToolUse) can refuse a write outside an allowed folder; seen working once in this app, also with permissions bypassed, and it fires inside helpers (agent id). A deny rule or workflow script is also named but only reasoned. Today nothing is installed: no hook on this PC, the tree's guard hook is built but not installed. | 0105, 0107, 0402, 0011, 0106 | Board "Choose how a rule is enforced" | 0 / 1 | partly | Observed: "outside an allowed folder", not "outside its own files". Deny rule: no test recorded. How the allowed folder is set per helper: not recorded (probe files are outside the library). |
| 5 | No. "Designed only": none of its parts (planner, scheduler, governor, plan check, gate, merge queue, library) was built or run. Its measurements are real but from a smaller plan. Not a method to rely on. | 0202 (0201 also read) | Board "How far the method documents were tested", line "Harness v2 design: designed only"; word search `plan check` | 1 / 1 | sure | The board line does not mention "plan check"; I confirmed it by search (found in 0202 and 0703). |
| 6 | Locking wins when resources are scarce, optimistic when plentiful (Agrawal, Carey, Livny 1987); no paper gives one conflict rate where they cross. Source: status `quoted`, via an extraction file, not the paper itself. Owner: the bottleneck is not fixed, find it and route to the method, never design from one run; "one writer per file" is rejected; use core concurrency literature. | 0301, 0015, 0012, 0013 | Board "Published results" line r57-0301; "Plan writers working at the same time" line | 0 / 2 | sure | "Quoted" says the words were read; it does not say whether the whole paper was read (0014 asks for "read in full"). 0301 is one author's result; the evidence shows other papers disagree (check 2). |
| 7 | Not by itself. The documentation says the caller's own model value comes first; a hook, deny rule or workflow script can fix it. Status is `summary` (read only as a summary), so by README rule 5 not for a decision. A hook stopping a helper on a refused model was observed. | 0108, 0105, 0106, 0603 | Board Facts line r57-0108 "(documented)" | 0 / 1 (rest already read) | partly | The override itself was never tried here. If the caller passes no model, does the definition hold? Not recorded. Board shows "(documented)" but not the status word `summary`. |
| 8 | The library gives no order. All seven open items carry the handle "next". By their dependencies: bottleneck research (0502) then the decision rule (0503), then the owner sees it, then build the 13 fixes and 0b (0507), R57 check, pilot. Must not happen: no building before the owner has seen the decision rule; each small test needs his word. | 0501 to 0507, 0704 | Board section "Open" (read all seven) | 0 / 1 | partly | No priority or order among open items; I inferred the order. "Decision rule" (0503, 0507) and "decision sheet" (0704) are close in name and different things. "The check rule R57 asks for" (0507) is not explained. |
| 9 | Not recorded. The library has the build's size (14 units, 12 scripts, 52 tests, estimates), the cost of the design round (7.67 million helper tokens, no script changed), five Sonnet readers (767,000), an agent's fixed overhead (60,000). None is the cost of building one fix. | 0112, 0114, 0115 (also 0113, 0201 seen) | Board lines "Build size" and "What the R57 round cost"; word search `token` twice | 2 / 1 | not recorded | A trap: dividing 7.67 million by the 13 fixes would give a number, but that round designed and checked, it did not build. |
| 10 | Do not use the figure: a figure a decision rests on is quoted from the paper; a summary figure is not used (about 38 were wrong). A login page is not the end: find the open copy another way. Open a paper: `curl -s -L --ssl-no-revoke`, check it starts `%PDF-`, `pdftotext paper.pdf paper.txt`, search the text. | 0014, 0110, 0606 | Board "Cite a figure from a paper" | 0 / 1 | sure | "Another route" is not spelled out (which sites). Not said whether `pdftotext` is on the path of this PC. |
| 11 | Check which documents hold that role: list them all and take the source, not a derived skill or the first found. Sources: docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/HARNESS-V2-DESIGN-2026-11.md. Then its status: run once, 12 rules worked, 11 failed or changed, 24 never ran; v2 is designed only; nothing reused blindly. | 0602, 0201, 0202, 0010 (also 0203) | Board "Use a rule from a design document" | 0 / 1 | sure | Counts only (12/11/24): which rules are which is in the evidence file, not the library. 0203 on the line did not apply. |
| 12 | No. Treating one measured run ("mostly idle") as a fact about the system is a recorded mistake. The bottleneck depends on the workload; other jobs ran the processor at 90 % and more; heavy commands queued 177 min. | 0605, 0015, 0116, 0104, 0103 | Board "Choose a method from one measurement" | 0 / 1 | sure | None. The "idle" in 0103 ("3 of 24 threads") is the whole PC with other programs running, which only the evidence file says. |
| 13 | Add one JSON line to `journal/<date>/<writer>.jsonl`, when it becomes true, with evidence; never edit or delete lines. Child session in conflict with 0301: write own finding as `result`/`fact` plus an `open` record "proposed correction of r57-0301"; the top session writes an `adjudication`. Only the writer of 0301 (or the top session after adjudication) supersedes it, by a new record with `supersedes`. | 0016, README rules 1 to 6, 0301 | Board "Save a finding" line | 0 / 1 | partly | How a session knows whether it is the "top session" or a child. How to pick a writer prefix, a file name and the next number (the board suggests ranges by kind, 00xx rulings, 01xx facts, 02xx status, 03xx results, 04xx hypotheses, 05xx open, 06xx mistakes, 07xx pointers, never stated). No example of `supersedes`, `adjudication` or "proposed correction"; none exist yet. Who rebuilds INDEX.md is not said (by hand, "not done yet"). |
| 14 | Built: the tree's trusted scripts (31 stages, 20,560 lines, suite 965 pass, 0 fail, end-to-end 232 of 232). Not built: the thirteen fixes and the shared primitive 0b (designed only); no pilot, no run of the tree. Guard hook and audit script built but not installed. Order after: fixes, R57 check, pilot. | 0101, 0102, 0507, 0107 (also 0702) | Board Facts lines r57-0101, r57-0102 (the board alone answers it) | 0 / 1 | sure | "R57 check" undefined. 0101 does not say that 53 of 1,018 tests were skipped (needs the real app), so "built" is less complete than it sounds (0103 and the evidence say it). |

## Step 3: two evidence checks

1. **r57-0103** against `docs/program/evidence/harness-method-status-2026-11-18/probe-suite-memory.md`: **matches**.
   596.4 s, 1,018 tests = 965 pass + 53 skipped, peak working set 493.9 MB, 12 processes, 3.1 of 24 threads
   on average, `--test-concurrency=1`. The record leaves out: 494 MB is working set (the file says it overstates real use),
   the thread figure is the whole PC with other programs running, the 53 skipped need the real app, and there was a failed first run.
2. **r57-0301** against `.../concurrency-lit-1-databases.md`, section B6 (lines 201 to 220): **matches in outline**:
   locking wins when resources are limited, optimistic when plentiful ("strongly resource dependent"), no paper gives a
   crossover as a conflict rate. Not found in those lines: the authors' names and the year 1987. The record is narrower than
   the section: it omits that Yu and Harding find optimistic control better under skew, and Agrawal's crossover between 10 and 25 resource units.

Both files were found on the first try from the path in the record (`E:` expanded as README says).

## What made this harder than it had to be

- **The Grep tool drops records.** Each record is one line of 300 to 1,000+ characters. The search tool printed
  "[Omitted long matching line]" for most of them. Three calls were wasted until I used the `grep -rhE` from the README in Bash.
- **The field that says how far to trust a record comes late.** `claim` comes first, `status` and `evidence` last. The README's
  word-search recipe (`cut -c1-400`) cuts them off; my `cut -c1-230` searches showed no status at all.
- **The board hides status.** Only some lines say "(observed)" or "(documented)". 0108 is status `summary`, which README rule 5
  forbids using for a decision, but its board line reads as a fact. 0403 ("about 270 s per run") reads as a fact under a heading that says "not tested".
- **The board gives topics, not answers.** "What the R57 round cost" and "How to read a paper PDF" force a fetch each. Most "Before you do this" lines list
  3 to 5 ids and I read 5 records that did not help (0109, 0113, 0203, 0702, partly 0106) because I could not tell which line answered what.
- **The open list has no order.** Seven records, all with the handle "next"; I read all seven and inferred the order from their text.
- **Words with no definition.** R57 (a writer prefix, a round, "the check rule R57 asks for", a "decision sheet"), "the tree", "0b", "FX-OUT",
  "tcb", "lane", "skeleton", "the check", "decision rule" against "decision sheet". README says a record must be understood alone; 0102, 0112, 0401, 0507 are not.
- **Answers that live outside the library.** 0005 sends the model question to section 3 of a document; 0201 gives counts while the per-rule table is in the evidence.
- **`evidence` sometimes names another record**, not a source (0605 gives r57-0015; 0014 gives r57-0110; 0504 gives nothing), so the
  trail ends inside the library.
- **Caveats stay in the evidence file** (working set, whole-PC threads, 53 skipped tests, other papers disagreeing). A session that stops at the record uses the figure without them.
- **No staleness check.** `footprint` is on a few records; nothing compares it with the files, so I could not say whether 0103 is still current.
- **The correction flow has no worked example** and does not say how a session knows its role (top or child) or how to choose its own prefix and number.

## What I would change

1. Order fields `id, kind, status, claim, when, ...` so any cut-off keeps the trust label, or ship a one-line `lookup <id>` that prints `id | kind | status | claim`.
2. Put the status word in brackets on every board line, and the number for facts ("596 s, 494 MB, 1 file at a time"); write "untested" inside hypothesis lines.
3. Say in README that records are long lines and that search tools may drop them; give the exact Bash command, and keep `claim` short.
4. Number the Open section in the order of work and say what blocks what; mark one line "next".
5. Add a short glossary (R57, tree, 0b, FX-*, tcb, lane, decision rule vs decision sheet) or write the meaning into each claim.
6. Where a record hands the answer to a document (0005 tiers, 0201 per-rule status), copy the answer in, or write "the library does not hold this".
7. `evidence` must name a source (path and section); put record dependencies in a separate field.
8. Move the caveats that change how a figure is used into the claim (0103, 0301, 0101).
9. In README: id ranges by kind, how a new writer picks a prefix and file, one example each of `supersedes`, "proposed correction" and `adjudication`, who rebuilds the board.
10. Keep a short "known gaps" list on the board (tokens per fix, readers' model, deny rule) so a session can stop early with "not recorded".

## Totals

- Files opened: 5. In the library: `README.md` and `INDEX.md` in full; `journal/2026-11-18/r57.jsonl` only through searches (80 records, never read whole); `tests/.gitkeep` listed, not read. Outside, for step 3: `probe-suite-memory.md` in full and `concurrency-lit-1-databases.md` lines 201 to 225.
- Records read in full: 46 of 80 (46 distinct ids; 0109, 0113, 0203, 0702 did not help). Six more seen only as the first 230 characters (0003, 0022, 0401, 0404, 0604, 0703).
- Searches over the journal: 22 = 18 id fetches (3 of them repeated because the Grep tool cut the lines) + 4 word searches (`sonnet|haiku`, `plan check`, `token` twice). Other library commands: one file listing, one size count.
- Evidence checks: 4 commands.
- Context tokens at the end (read just after this file was written): 136,477 of 1,000,000 (14 %). Of these, 72,415 are messages (the work); 63,000 are the fixed load of tools, system prompt and skills that any session carries. Reading the two library files, 46 records and the evidence cost a small part of the 72,415.
