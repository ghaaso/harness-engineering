# Brief: the creep gate (kind build, Sonnet; top session 9b, 2026-11-24). Ruling r57-0063.

token limit 8 M (expected about 5 M, basis t8-0117: the hooks of top session 8 took 4.5-7.4 M each)

The owner's rule r57-0063 (`bash library/lookup.sh -f r57-0063`): no procedural creep. Build it as a hook, small,
in the style of `.claude/hooks/count-gate.mjs` and `fanout-gate.mjs` (read both first; reuse their input parsing,
transcript reading, logging and deny form). No review of your work follows; it must be right by its tests.

File `.claude/hooks/creep-gate.mjs`, PreToolUse on `Agent|Task` (register it in `.claude/settings.json` next to
fanout-gate, same form). It reads the start's description (which begins with the kind, e.g. "refute: ...") and prompt,
and the caller's transcript (session or helper file, as fanout-gate finds it). It refuses, with one plain line naming
r57-0063:
1. A second review of the same deliverable: a start of kind refute, or any start whose description or prompt asks
   for a review, critique, blind check or audit, when an earlier start in the same session's transcripts (the session
   and its helpers) was a review naming the same target file (the first repository path in the prompt or in the brief
   file it names). One review per deliverable.
2. A review of a review: a review start whose target is itself a review output (path or name containing refute,
   review, critique, audit, X-refute, or a file under a `refute/` folder).
3. A repair or fold round on review findings unless the prompt says the findings are breaking: a start whose
   description or prompt says fold, fix findings or address findings, with no word "breaking" in the prompt.
   Non-breaking findings go into a list at the end of the work, not into a round.
4. A third or later start of kind refute in one session (whatever the target).
Escape: a prompt line `owner: r57-NNNN` naming an owner record passes all four (the owner asked for that round).
Any error or unreadable input: pass (do not block work on a hook bug), logged to `.claude/logs/creep-gate.jsonl`.

Tests `.claude/hooks/creep-gate.test.mjs` (node, no installs), each rule refused and passed, the escape, an
unreadable input; run it and `node .claude/hooks/selftest.mjs` if that runs the hook tests. Add one row to
`research-tree/build/ENFORCEMENT-TABLE.md` (the rule, what enforces it, what it cannot see: a review done inside one
helper's own turns, a creep round made without a helper start, plans and pages the coordinator writes itself).
Write only these files. Do not commit. Final reply at most 80 words: files, tests passed, what it cannot see.
