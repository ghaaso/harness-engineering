# GATE-USE: the plan gate, for the build root (2026-11-19; version 2 by FIX-GATE)

The hook `.claude/hooks/plan-gate.mjs` holds every helper start to `research-tree/build/plan.json` (ORCHESTRATION.md
sections 2, 3, 6, 9 and BUILD-PLAN.md section 2 as data). It is active while `plan.json` exists, beside the tier
hook, in every session of this repository and inside its helpers. It runs before and after Agent and SendMessage
calls and on SubagentStart and SubagentStop. Its log is `.claude/logs/plan-gate.jsonl`.

**The description form.** `<kind>: <unit id> <anything>`, with the model given explicitly, both as the unit's row
says. Ids exactly as in `plan.json` (case matters): `S0.1a`-`S0.1d`, `S0.3`, `PROBE`, `S0.4`, `S0.6`, `S0.5`, `W1`,
`OUT`, `CLAIM`, `CGATE`, `W5`, `W7`, `W6`, `REDO`, `W2`, `PLAN`, `W3`, `CLOSE`, `W4`, `S2.1`, `S2.2`, `S2.3`, `S2.4`;
`FX-<id>` and `0b` are read as the same units. A refuter is `refute: <unit id> ...`; the combined review of W6, REDO,
CLOSE and W4 is `refute: W4 ...` (or `refute: W6+REDO+CLOSE+W4`). There is no L1 in this build (plan.json, batch
PROBE). One planned unit per helper. A description whose first word after the colon is no planned id (P0, GATE, a
test) is left to the tier hook.

**What it refuses** (exit 2, one line: why and what the plan says):
1. the kind or the model differs from the unit's row (no model counts as different);
2. something it needs is not done: a unit in its `deps`, a refuter's builder result, or any unit or refuter of a
   batch its batch comes after (B0a, then B0b, then B1-1 (also after PROBE), B1-2, B1-3, B1-4, S2);
3. a helper for the same unit and role is still running;
4. its batch already runs as many units as its width (refuters do not count);
5. a SendMessage to a helper of the build that has ended. The message resumes it, so it is checked as a start by 3
   and 4 (its needs were done when it first started). A message to a helper that is still running always passes.

"Done": a reading, running or analysing unit when its fact file exists; a build unit when
`git merge-base --is-ancestor refs/heads/u/<id> refs/heads/build` succeeds (landed); a refuter's need when
`research-tree/build/units/<id>/result.md` exists; a refuter when `research-tree/build/refute/<id>.md` exists (the
combined one: `refute/W4.md`). In every case, nothing is done while a helper for it is running, even when its file
exists or its branch has landed. Files count in the main checkout or under `.claude/worktrees/<id>/`. S2.3's runner
writes `research-tree/build/facts/S2.3.md` (the plan named no file). After a refusal, retry after the next helper's
finish notice, never by polling (b1-0411).

**Every brief says: write the done file last, and never at a LIMIT.** A helper that returns LIMIT has ended, and the
gate then reads its fact file, `result.md` or verdict as done. At a LIMIT a helper writes only
`units/<id>/checkpoint.md`. If a helper that returned LIMIT left its done file anyway, rename it (`<name>.partial`)
before anything that needs the unit starts.

**Running.** A start counts from the gate's allow; the Agent call's return logs the agent id; the helper's end
(SubagentStop) ends it. Until the call returns, the start counts for 60 s. A helper that returns LIMIT has ended, so
its successor is allowed. A helper continued with SendMessage (ORCHESTRATION section 3) counts again from the
SendMessage, and its next SubagentStop ends it again. So after a LIMIT, either continue the helper or start a
successor, not both: the gate refuses whichever comes second. A run that the app starts by itself counts from its
SubagentStart. (That happens when a message queued for a running helper arrives after the helper has ended.) A
helper killed without an end (an app restart) holds its unit until the root logs it:
`node .claude/hooks/plan-gate.mjs --end <agent id or tool_use_id> "<why>"` (the refusal names the id).

**Widths.** B0a 4, PROBE 1, B0b 2, B1-1 3, B1-2 2, B1-3 2, B1-4 2, S2 1. The root changes one only with a line in
`research-tree/build/STATE.md` naming the measurement (r57-0002), never by editing `plan.json`:
`width B1-1 4: u_b 0.31, u_r 0.30, T_r 12 min from the lane log of P0 and B0b`. The last valid line for a batch
wins. A line is ignored unless it holds a number and at least 12 characters after the colon, and the width lies from
1 to the batch's `max` (B1-1: 7, the collision count; the others: their ready work).

**If something breaks.** If `plan.json` is present but unreadable, starts naming a planned id are refused and all
others pass. A SendMessage that would resume a helper of the build is refused too. An error while checking a planned
start refuses it. If the hook script itself crashed, calls would pass (the app treats exit 1 as a warning).
`node --test .claude/hooks/plan-gate.test.mjs` (37 cases, about 31 s) guards against that.

**Not checked by the gate:**
- the full suite between batches, and the start order within a batch;
- tokens against limits;
- the `isolation` flag (precondition 3 forbids it);
- whether the probe passed (only that `facts/nesting.md` exists);
- a merge undone by `git revert -m 1`, which still counts as landed until the unit's branch moves on;
- a done file left by a helper that returned LIMIT (see above);
- a second run of a unit that is already done, even while a unit that needs it runs;
- a SendMessage addressed by a name instead of the agent id: it is not checked before it is sent, only counted once
  its result names the agent;
- whether the app sends SubagentStart for a resumed run (not seen live yet). The SendMessage result covers every
  resume the root makes itself.
