# T8-REPORT: reports to the owner without internal labels (build-invariant, Opus)

Read `briefs/TOP8-COMMON.md` first, then `research-tree/build/ENFORCEMENT-TABLE.md` (the table, and its ranked
proposal 2 after it).

## The rule and how it was broken
Reports to the owner: the picture first (what was done, the benefit, the conclusion, how far along), a handful of
numbers, no internal labels, plain words (CLAUDE.md rule 6, r57-0017; the owner's memory note "Big picture, not
figures", 2026-11-23). Broken six times by the table's count, last on 2026-11-23 (helpers' returns relayed as blocks
of figures with internal labels).

## What to build
A hook (or hooks) on what reaches the owner: the closing box (mcp__ccd_turn__wrap_up: its recap and ask), and a page
published for him (the Artifact tool's publish: read the file it names). Refuse with a plain reason: record ids
(like r57-0056, t7-0608, x13-0117), unit names (T8-CEIL and the like), repository file paths, currency signs. The count
of figures: decide from the record whether a number can be computed for "a handful" (r57-0002 forbids a number by
preference); if none is recorded, it stays a warning (additionalContext), not a refusal, and say so. A page may keep a
"record" section for ids if the record allows: decide and say. Decide from the record whether the session's last
message (Stop hook) is checked too, and if so avoid an endless refusal loop (a Stop hook that refuses makes the
session continue; check the hook documentation in the x01 records: `bash library/lookup.sh Stop`). It cannot see
whether the picture comes first or the words are plain: say so.
Self-tests with real hook JSON. Files: `.claude/hooks/owner-report.mjs`, `.claude/hooks/owner-report.test.mjs`.
Limit 12 M tokens (expected about 8 M: r57-0165, the plan gate's builder 8.6 M with its live check).
