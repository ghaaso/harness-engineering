# FIX-GATE: result (2026-11-19)

Kind build-invariant, Opus (agent aefbf47be4dc577e1). Brief: `research-tree/build/briefs/FIX-GATE.md`. Verdict:
`research-tree/build/refute/P0-GATE.md`. Nothing committed.

## Files

| File | What changed |
|---|---|
| `.claude/hooks/plan-gate.mjs` | Version 2: the running check for what a start needs (finding 5); SendMessage admitted like a start when it resumes an ended helper; resume and run events; ends compared by log time (finding 6) |
| `.claude/hooks/plan-gate.test.mjs` | 37 cases (was 27): 9 new, 1 replaced, 1 extended |
| `.claude/settings.json`, `hooks` only | The plan gate's PreToolUse and PostToolUse matchers changed from `Agent\|Task` to `Agent\|Task\|SendMessage`; SubagentStart added. The record guard's line (FIX-GUARD's) was not touched |
| `research-tree/build/briefs/GATE-USE.md` | Refusal 5, nothing done while its helper runs, the done file written last, continuation, 37 cases; the stale L1 sentence removed |

The new tests ran beside the old gate in scratch copies first. Then gate and tests were swapped in by copy and rename
(old gate sha256 7eb5c286..., new 73fd4143...). No test wrote to `.claude/logs/plan-gate.jsonl`.

## Each finding, its test, before and after

"Before" means the new test file run against the old gate. "After" means the same file run against the new gate in
this repository: 37 of 37 pass, in 31 s.

| Finding | Test cases (`plan-gate.test.mjs`) | Before | After |
|---|---|---|---|
| 5: a unit counts as done while its helper still runs | `finding 5: a fact file written while its helper runs...` (the verdict's two inputs: S0.1d to S0.3, and S0.3 to its refuter); `...a refuter waits while its builder runs...`; `...a batch waits while a review of a batch it comes after runs...`; `...a landed dependency whose builder still runs...nor while its start is pending`; `...count_running false turns the running check off` | The first four fail: the start is allowed (exit 0) | Pass |
| 6: a helper continued with SendMessage is invisible | `finding 6: a helper continued with SendMessage after its end counts...` (the verdict's input: W1, OUT, CLAIM; W1 ends and is continued; then CGATE and a second W1 builder are refused); `...SendMessage that would resume an ended helper is refused...`; `...a continuation whose call has not returned counts for pending_s; one that resumed nothing ends`; `...a run after the end with no SendMessage seen (SubagentStart), or a resume seen only in the result, counts`; `SubagentStart, SendMessage results and odd SendMessage inputs exit 0 silently...` | All five fail: allowed, or nothing logged | Pass |
| 3: the gate invariant with no test (verdict item 11, mutant PA: `--end <tool_use_id>` ignored) | `allowed: after the root logs a start ended by its tool_use_id...` | The first half passes, since the old gate has the rule. The second half fails on wording: a start with no agent id was named "agent null"; it is now "call toolu_..." | Pass; kills PA |

The verdict lists no other gate invariant without a test.

**Mutation check of the new gate** (scratch copies). There were 10 mutants, and every one was killed:

| Mutant | Cases that fail |
|---|---|
| PA (`--end <tool_use_id>` ignored) | 1 |
| Running check removed | 4 |
| Its `needs` part removed | 2 |
| Its batch-order part removed | 1 |
| SendMessage admission removed | 3 |
| Ends not compared by time | 2 |
| Runs and resumes after an end ignored | 1 |
| A continuation that never returns never expires | 1 |
| A "queued" result counted as a resume | 1 |
| A message to a running helper checked as a start | 1 |

## How the fixes work

- **Finding 5.** Under the gate's lock, the gate looks at every row a start needs: its deps, a refuter's builder, and
  every row of the batches it comes after. Such a row is not done while a helper for it runs, pending starts
  included, whatever its file or branch says. The refusal names the helper and the `--end` line. The check is off
  when `count_running` is false, as checks 3 and 4 are.
- **Finding 6, before the call.** PreToolUse on SendMessage looks at the target. If the gate admitted it and it has
  ended, the message is checked like a start (one helper per unit and role, and the width) and logged as an allow
  naming the agent. If the target is still running, the message passes.
- **Finding 6, after the call.** PostToolUse logs the agent id the call revived (`revivedAgentId` or
  `resumedAgentId`, the result shape in this repository's transcripts of 2026-11-18 and 19 and in the app's 2.1.325
  code). SubagentStart logs a run.
- **Finding 6, the count.** An allow, a resume or a run counts until an end of that agent logged after it. So the
  SubagentStop that came before a continuation no longer ends it.

## Departures and readings

1. **The continuation is also checked, not only counted.** The brief asked to count it. Counting alone leaves the
   other order open: CGATE takes W1's slot, then W1 is continued, and four units run in B1-1. It also leaves open a
   continuation sent in the same message as a start. The reason is the same as for GATE's pending starts under the
   lock.
2. **SubagentStart is registered as well;** the brief named only SendMessage. It is the only signal when the app
   resumes a helper by itself. That happens when a message is queued for a running helper that ends before reading
   it; the app's SendMessage result says "If it finishes first, it is resumed with the message".
3. **Not seen live:**
   - the PostToolUse input for SendMessage. This is inferred: the Agent tool's PostToolUse `tool_response` equals
     its transcript `toolUseResult`, as checked on this helper's own start;
   - SubagentStart. No helper has started since the registration.
4. **One old case is replaced.** "Allowed: the refuter beside its running builder" contradicts finding 5. The refuter
   now waits for the builder's end.
5. **The LIMIT half of finding 5 is outside what the gate can see.** A helper that returned LIMIT may leave a
   partial done file. GATE-USE now tells the root that every brief writes the done file last and never at a LIMIT,
   and how to set a partial file aside. The L1 sentence is gone, since plan.json has no L1.
6. **Seen in the live log.** The root allowed S0.3 at 16:28:36 UTC and a second S0.1c helper at 16:28:38, which ran
   while S0.3 ran. Neither the old gate nor the new one refuses a second run of a unit that is done (the verdict's
   non-breaking item 3). GATE-USE lists it under "not checked".

## Tokens

From this helper's transcript (the four usage fields, counted once per message id): 55 calls and 11.0 M tokens
before this file was written. The expected figure was 10.9 M and the limit 29.2 M. Context was 283 K, so no
checkpoint was needed.
