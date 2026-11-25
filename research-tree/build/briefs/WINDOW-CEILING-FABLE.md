# Brief: the window ceiling follows the owner's ruling for Fable (2026-11-25)

The owner's words, in full; they outrank this brief:

> "we'll do compaction at 500k tokens since ur fable ur quality is not likely to decrease since its good for long horizon tasks"

> "modify that guard such that it doesnt do these problems for fable specifically only for opus on the other models"

## What happened

The owner's top session (id 7a07b86e-d52e-4da4-bd24-68ac48d870a3, on Fable since about 08:50 UTC on 2026-11-25)
steers the improvement round. `.claude/hooks/window-ceiling.mjs` classed it as a coordinator, because
`research-tree/build/IMPROVE-STATE.md` holds one line with "session 7a07b86e" and "kind orchestrate" (it is
coordinator 8's own line: "coordinator 8, helper of the top session 7a07b86e, kind orchestrate, Opus"). The hook
set the session's hard line near 230 K; its context is about 340 K; since then every call but hand-over notes is
refused, and the round has nobody steering it. The session's hand-over: `research-tree/build/TOP-REVIEW-STATE.md`.

## Deliverable

`.claude/hooks/window-ceiling.mjs`, changed so that:

1. A transcript whose current model is Fable gets one line only: a hard line at 500 K of context (his ruling), with
   the usual warning K calls before it. The current model is the model of the transcript's last assistant message
   that carries usage (its id begins `claude-fable`); a session switched from Opus to Fable is judged as Fable from
   its first Fable message on. Neither the coordinator's W* form nor the checkpoint form puts a Fable transcript's
   line below 500 K. If the compaction cap (0.92 of the window, less K calls) were ever below 500 K, the lower one
   holds.
2. Every other model behaves exactly as before: Opus coordinators keep W*, builders and refuters the checkpoint.
3. The refusal and warning texts for a Fable transcript name 500 K and the record id of the ruling. The header
   comment says what changed, when, and on which record.
4. `.claude/hooks/window-ceiling.test.mjs` gains cases: a Fable session named as a coordinator at 338 K passes;
   the same past 500 K is refused for an ordinary call and passes a hand-over call; an Opus coordinator at 338 K
   with W* near 230 K is still refused; a transcript that switches from Opus to Fable is judged by its last model.
   The hook keeps a small state file per transcript with an offset: make sure the model is tracked through it and
   that a state file written by the old version does not break the new one.

Also:

5. Record the ruling first: `node tools/journal.mjs <file> --prefix r57`, a dry run, then `--append`. Kind ruling,
   status owner, both quotes above in `quote`, the claim in plain words (Fable transcripts get a 500 K line in the
   window ceiling; other models unchanged; his reason: Fable holds up over a long window), `see` r57-0008, r57-0056,
   r57-0035. Use the new id in the hook's header and texts.
6. One line where the window ceiling is listed in `research-tree/build/ENFORCEMENT-TABLE.md`.
7. A live check: feed the changed hook a PreToolUse input for the top session's transcript
   (`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/7a07b86e-d52e-4da4-bd24-68ac48d870a3.jsonl`,
   tool Bash, an ordinary command) and show that it passes.

## Limits

Only this hook, its test, the journal record and the one table line. No other hook, no settings file, no
permission setting. Nothing else about the hook is loosened: its logging, its fail-open rule and its hand-over
calls stay as they are. Do not commit; the owner has not asked. No review round: the hook's own tests and the live
check are the check.

## Done when

The test file passes (`node .claude/hooks/window-ceiling.test.mjs`, and `node .claude/hooks/selftest.mjs` if it
covers this hook), the live check passes for 7a07b86e, and the record is in the journal. Reply in three plain
lines: what changed, the test result, the record id.
