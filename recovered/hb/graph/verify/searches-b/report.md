# Lane searches-b: do the sampled searches ask questions a connection index answers?

## Method
- Input: ../../sample.json (200 search-bearing tool calls, fixed-interval draw from 8,303; Django-style clinic project).
- dump.js prints each item compactly (long path prefixes shortened). I read all 200 by hand, in id ranges 1-40, 41-85, 86-130, 131-170, 171-200:
  `node dump.js <abs path>/sample.json 1 40` and so on.
- One row per item in rows1.txt / rows2.txt (id|cls|graph|step|note). tally.js checks there are exactly 200 ids (1..200), counts them and writes classification.json:
  `node tally.js <abs path>/sample.json`
- Index judged as the task describes it: importers and imported names, callers, test reach, doc citations of files, symbol definitions with line ranges. No contents, logs, test results, git state or prose.
- Rules I applied: "partial" = the index answers at least one real sub-command (a location, an outline, an importer list) but the call also needed the lines or other sub-commands. A model field or attribute, a string constant, a stdlib or Django call, a file outside the repo or a git ref other than the working tree count as not indexed.
- One reader, one pass. Nobody checked my labels against a second reader. The search text is cut at 420 characters, so the end of some long commands was not visible.

## Numbers (from tally.js)
- cls: CONTENT 90, NOT_A_SEARCH 50, DEFINITION 29, STATE_OR_LISTING 16, CONNECTION 14, UNCLEAR 1.
- graph_answer: full 1, partial 53, none 146. Among the 149 real lookups (not NOT_A_SEARCH or UNCLEAR): full 1, partial 53, none 95.
- By class: DEFINITION 28 partial and 1 full (a file outline, item 111). CONNECTION 11 partial and 3 none. CONTENT 13 partial and 77 none.
- step_saved: unlikely 197, cannot tell 3 (items 36, 135, 173), likely 0.
- Subagent items (73): CONTENT 45, CONNECTION 9, DEFINITION 8, STATE 6, NOT_A_SEARCH 5. Main-session items (127): NOT_A_SEARCH 45, CONTENT 45, DEFINITION 21, STATE 10, CONNECTION 5, UNCLEAR 1.
- Rough regex counts over the raw commands: 151 of 200 chain two or more grep/sed/cat/awk/ls sub-commands; 78 read ranges (-A/-B or sed -n); 41 cat a whole file.

## What I saw
- Most of the CONTENT calls look for wording, decision-record rows, settings values, code idioms (select_for_update, uuid4, csrf_exempt) or UI strings in tests.
- Of the 14 CONNECTION calls, most ask about model fields, attributes or string codes (gated_at, mfa_verified, pays_salaries, DEPENDENT_POSTINGS). An import or call index does not hold those. Two ran at a git ref (17, 23). One ran on a scratch copy outside the repo (79).
- DEFINITION calls almost always read the body in the same command (grep "def x" -A20..60, or sed between defs). The index gives the place, not the lines.
- The same definitions are read again in different sessions: the dbguards helpers sql, narrow_runtime and refuse_change_trigger (items 18, 24, 165, plus 86 and 127 reading the file), and hold_then_race (1, 163, also named in 67 and 192).
- Next calls are mostly sed or Read of the lines just found, or an edit. A search that the index could have replaced was almost never followed by a second search for the same thing. Item 49 repeats the same Grep, but it is a doc-wording search.

## What an index would change (conservative)
- Locating: about 29 definition reads and 11 connection calls could start from an index lookup. The body read still follows, so the step count would not drop. The token saving is small, because the grep output was already short and mostly was the body.
- File outlines (grep "^def |^class" on one file: items 15, 19, 111, 115, 126, 136, 163) would be answered in full or nearly in full.
- The repeated definition reads across sessions are a content-cache question, not a connection-graph question.
- To answer the connection calls actually seen, the index would need model-field and attribute references, plus template and HTML references.
