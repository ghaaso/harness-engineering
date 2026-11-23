# T8-BASIS: a helper's limit has a measured basis, and the meter is read before a fan-out (build-invariant, Opus)

Read `briefs/TOP8-COMMON.md` first, then `research-tree/build/ENFORCEMENT-TABLE.md` (the table, and its ranked
proposals 1 and 3 after it).

## The rules and how they were broken
- A session's token limit is its measured expected need plus a buffer, never equal or arbitrary (r57-0038); limits
  summed must stay inside the owner's cap (r57-0614). Broken: r57-0617, r57-0614, t7-0602 (replay-L6 planned no cost
  for building its cases and used 3.6 times its expected tokens).
- Read the meter in a message before the fan-out, then gate, then start (r57-0615).

## What to build
One new PreToolUse hook on Agent and Task (its own file; T8-COUNT is editing plan-gate.mjs, do not touch it):
1. The limit: the table's proposal. A start that states a token limit (in its prompt or in a brief file the prompt
   names) must cite at least one record id for its expected figure; the id must exist in the journal and be
   measured or observed; the limit must exceed the expected figure; the limits of helpers started under the
   current cap must not sum past it. Decide from the record where the cap is read (the cap line of the session's
   state file, or the journal's latest cap ruling) and the format a brief uses to state expected, limit and basis;
   keep it small and plain, and say what happens to a start that states no limit at all (decide from r57-0038
   whether that is refused). It cannot see a cost the plan left out (t7-0602): say so.
2. The meter: refuse a fan-out (a new helper start) unless the session's transcript shows a get_usage result
   (mcp__ccd_session_mgmt__get_usage) in an earlier assistant message than the start, within a span computed from
   the record (how fast the meter moves: r57-0170, r57-0175, r57-0183), and the reading is under the line the cap
   allows if one is recorded.
Self-tests with real hook JSON and small fake transcripts. Files: `.claude/hooks/fanout-gate.mjs`,
`.claude/hooks/fanout-gate.test.mjs`. Limit 12 M tokens (expected about 8 M: r57-0165, the plan gate's builder
8.6 M with its live check).
