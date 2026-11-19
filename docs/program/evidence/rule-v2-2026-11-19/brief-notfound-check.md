# Brief: check one "not found" statement of the draft of decision rule version 2 (kind read, Sonnet)

`R:` = `docs/program/evidence/round3-2026-11-18/`. `D:` = `docs/program/evidence/rule-v2-2026-11-19/`. You are told
your lane (`c1`, `w1`, `t1` or `a1`) in the message that started you.

## What exists

`R:RULE-V2-DRAFT.md` section 7 ("Not found", from the heading `## 7. Not found` to `## 8. Verdicts`) lists, per lane,
what the lane did not find in the sources it read, and the papers that need the owner's sign-in or were not opened
for another reason. Five of its statements were never checked, because the checker was not shown the lane reports:
V2-108 (c1), V2-109 (w1), V2-110 (t1), V2-111 (a1), and V2-112 (the sign-in lists of all four lanes). The top session
decides version 2 now and needs these checked first. A wrong "not found" is a known mistake here: "in no paper" was
once written after a narrow search while a file already held such a paper.

Your lane's files:
- the report `R:<lane>-report.md`, its section on what was not found and not opened (c1: section 4 and the
  section "Addendum: queues in real use"; w1: section 10; t1: "Not found, not opened"; a1: section 5);
- the collect files `R:<lane>-collect-*.md` (what each collector searched, opened and quoted);
- the claims file `R:<lane>-claims.md` and the refute file `R:<lane>-refute.md` (a1 has two: `R:a1-refute-1.md` and
  `R:a1-refute-2.md`).

## Do

Take the draft's bullet for your lane in section 7, and your lane's line under "Papers that need the owner's sign-in"
(and any line under it that names your lane). Split them into single items. For each item answer:

1. **In the report?** Is the item in the report's section, in the same sense? Quote `path:line`. Then list every item
   the report's section holds that the draft leaves out.
2. **Search stated?** For a "not found" item: does the report or a collect file say what was searched (the words, the
   venues or databases, the sources opened)? Quote `path:line`, or write "search not stated".
3. **Contradicted by the lane's own files?** Search the lane's collect files and claims file for the item's key terms
   (use grep through Bash; lines are long, so cut them). If a source the lane did read covers the item, quote
   `path:line` and say how far it covers it.
4. **For a paper not opened:** does the report or a collect file give the reason (bot check, 403, paywall, rate
   limit, no text layer, sold)? Quote `path:line`. Is the reason in the draft the same?
5. Only w1: does the report's list hold the "fake restart" assumption of Agrawal, Carey and Livny 1987 as read only
   in a summary (the refuter's point, `R:w1-refute.md` near lines 745-755)? Only t1: which paper is the one behind a
   bot check that would settle claim C65, and is it in the list?

## Write

One file, `D:notfound-check-<lane>.md`, at most 70 lines, plain words:
- a table, one row per item: the item; in the report (`path:line` or "no"); search stated (`path:line` or "not
  stated"); verdict, one of `stands`, `stands, search not stated`, `narrower in the report` (say how),
  `contradicted` (by what, `path:line`), `not in the report`;
- the items the report holds and the draft leaves out;
- the same for the papers not opened;
- one line: the verdict on the draft's statement for your lane (V2-108, V2-109, V2-110 or V2-111): confirmed, holds
  in part (say which items fail), or refuted; and one line on your lane's part of V2-112.

## Limits

Reading only, plus that one file. No web search, no download, no install, no test or run of any project script, no
edit of any other file, no commit. Do not open `R:papers/` (it is not in the repository). If something cannot be
checked from the files named, say so in the row; do not guess.

## Return (six lines or fewer)

The path of your file; the count of items by verdict; the two verdict lines.
