# Brief: the window ceiling's Fable line follows the owner's new ruling (2026-11-25)

The owner's words, in full; they outrank this brief:

> "no need to compact fable is good across long horizon tasks we'll be fine hopefully"

Said at about 10:45 UTC on 2026-11-25, when his top session (id 7a07b86e-d52e-4da4-bd24-68ac48d870a3, on Fable)
stood at about 497 K of context, against the 500 K line he had set this morning (r57-0098, brief
`research-tree/build/briefs/WINDOW-CEILING-FABLE.md`).

**Correction (top session, a minute later): the ruling is NOT in the journal yet.** The journal tool refused it:
"writer r57 has used every number of the ruling range 1-99; take a new prefix", and the top session was locked
before it could retry. Record it first, as the first guard change did: `node tools/journal.mjs <file> --prefix r58`,
a dry run, then `--append`; kind ruling, status owner, the quote above, the claim in plain words (the 500 K figure
of r57-0098 is withdrawn for Fable; only the compaction cap holds a Fable transcript; the rest of r57-0098 stands;
prefix r58 because r57's ruling numbers are used up), `see` r57-0098, r57-0008, r57-0056, `by` r58. Use the id it
gives (the record lands in `library/journal/2026-11-25/r58.jsonl`) wherever this brief says "the record".

## Deliverable

`.claude/hooks/window-ceiling.mjs`: a transcript whose current model is Fable is no longer held by a fixed 500 K
line. It is held only by the compaction cap the hook already computes (0.92 of the window, less K calls), with the
usual warning K calls before it. Everything else stays as version 2 left it: a Fable transcript is not judged by
the coordinator's W* form or the checkpoint form; every other model behaves exactly as before; logging, the
fail-open rule, the hand-over calls and the test scale are unchanged.

- The header comment says what changed, when, and on which record (find its id in
  `library/journal/2026-11-25/r57.jsonl`); the warning and refusal texts for a Fable transcript name that record.
- `.claude/hooks/window-ceiling.test.mjs`: the Fable cases follow the new line (a Fable session at 510 K passes; one
  past the compaction cap is refused for an ordinary call and passes a hand-over call); the cases for other models
  stay and pass.
- One line where the window ceiling is listed in `research-tree/build/ENFORCEMENT-TABLE.md`.
- A live check: feed the changed hook a PreToolUse input for the top session's transcript
  (`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/7a07b86e-d52e-4da4-bd24-68ac48d870a3.jsonl`,
  tool Bash, an ordinary command) and show that it passes.

## Limits

Only this hook, its test and the one table line. No other hook, no settings file, no permission setting. Do not
commit. No review round: the hook's tests and the live check are the check. It is urgent: the top session is locked
again and the owner is waiting on it.

## Done when

`node .claude/hooks/window-ceiling.test.mjs` passes and the live check passes for 7a07b86e. Reply in three plain
lines: what changed, the test result, the record id.
