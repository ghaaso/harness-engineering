# Harness method status, 2026-11-18: what is and what is not

The owner asked that nothing from the method documents be reused blindly. Seven extractions by small-model
readers sort the record into what was measured, what was run, what is only designed and what is a guess.
This page is the coordinating session's summary of them. The extractions were not checked row by row.
What the app can do (`app-enforcement-mechanisms.md`) is documented, not observed on this PC.

| File | What it holds |
|---|---|
| `orchestration-design-status.md` | Each rule of `docs/ORCHESTRATION-DESIGN-2026-10.md` against the records of its run on 2026-11-01 |
| `harness-v2-status.md` | Each part of `docs/program/HARNESS-V2-DESIGN-2026-11.md` |
| `enforcement-evidence.md` | What the record shows about hooks, scripts and rules written as prose |
| `app-enforcement-mechanisms.md` | What Claude Code documents: hooks, permission rules, settings, workflow scripts |
| `horthy-instruction-files.md` | The Horthy record on CLAUDE.md, AGENTS.md, hand-over, context fill |
| `horthy-proved-general.md` | All 78 kept Horthy ideas, with what carries a reported result |
| `testing-evidence.md` | What checking cost in time and tokens, and what it changed |

## 1. Enforcement today: none

- No hook is configured on this PC, in the user settings or in either repository.
- One mechanical ceiling exists: `autoCompactWindow: 400000`, for Opus only.
- The tree's `guard-hook.mjs` and `audit.mjs` are built and tested. Nobody installed them.
- Every mechanism of the harness v2 design is designed only ("Nothing is installed, wired or committed").
- The earlier build's one hook, a pre-commit hook, was "abandoned with eight defects open". No reason is recorded.
- "Hooks stay off" was never ruled: decision D17 has no owner answer.
- So every rule the sessions had was text. That is why nothing stopped the R57 round.

## 2. What can enforce what

| Rule | Can be stopped by | Can only be caught by | Gap |
|---|---|---|---|
| A helper runs on the right model | A workflow script (it sets the model per agent); a hook or a deny rule on the call that starts a helper | An audit of the transcript: it records the model of every helper call (checked on one file) | The model in an agent definition does not hold: the caller's own `model` value wins |
| The coordinator stays under its ceiling | Nothing hard is documented. `autoCompactWindow` compacts at a set size. A hook can refuse further calls after reading the transcript | The status line script, which is given the percentage | No hook is given the context size directly |
| Independent work starts together | Only by construction, in a workflow script | A hook that sees which calls ran as one batch | |
| One writer per file | A hook or a path rule on Write and Edit | A diff at commit | Writes done through shell commands |
| No design questions to the owner | A deny rule on the question tool | A check of the last message | A question written as plain text or put on a page |
| No round nobody asked for | Neither. Intent cannot be seen | An audit | Bound it instead: one purpose, a fixed tool list and a budget per session |
| The record is read first | A session-start hook that adds the named files | A scan of the transcript | |
| Heavy commands run in K slots | A hook with a lock, or the lane script | A process count | Commands hidden behind another shell |

Reading: neither hooks alone nor scripts alone cover the rules. Scripts decide by construction (a workflow)
and check at boundaries (plan, commit, merge, after the session). Hooks and deny rules are the only things
that act inside a session at the moment of a call. Two rules cannot be enforced mechanically by either.

Ways a script can act in the middle of a session: a workflow script (decides); a hook (blocks); the status
line script (sees the context size, cannot block); a background watcher (can tell the session, cannot stop
it); a script the session is told to call (holds only if a hook requires it).

## 3. The orchestration design (run on 2026-11-01)

- Ran and worked, 14 rules: Haiku for extraction into a fixed schema; Sonnet for maps, gates, citation
  checks and web collection; Opus for analysis and for skeptics; the main session for routing and the two
  gates; the citation check; the web re-check; the return contract.
- Ran and failed or was changed, 9 rules: the cap of 12 skeptics was used up by the first four analysts,
  and the claims that mattered most overflowed; the overflow was then ruled "corroborated" where the design
  says "unverified"; the owner pre-flight was skipped and Docker was down.
- Never run, 25 rules: among them the effort levels, the explorer agent, the circuit breaker, resume.
- Measured against it: an agent's fixed overhead is about 60,000 tokens, not the 7,500 the design states.

## 4. The harness v2 design

- None of its parts was built or run: planner, scheduler, governor, plan check, gate, merge queue, library.
- Its measurements are real. Its token ceilings were measured in October on a smaller plan.
- Its own refuter: calibrated to the record, the best number of lanes comes out near two.

## 5. The Horthy record

- 861 idea families: 24 adopted, 54 on trial, 407 already done on paper, 376 skipped.
- Of the 78 kept, 9 carry a measured figure. For 6 it is Horthy's own. None is a controlled before and after.
- 88 of the 112 measured cards sit in dropped families, mostly third-party studies.
- How to lay out instruction files across a repository: not settled. No card compares one root file with
  several. Nearest: a root file under about 60 lines that is a map with commands and pointers; "if it's
  relevant to 90%+ of tasks, leave it bare"; do not split into files the agent must make tool calls to find;
  one shared budget of about 150 to 250 instructions (second-hand); wrap up or compact near 40 % of the
  window (asserted, "no data shown").
- Nothing from the sweep was ever installed or tried here. The sweep read its sources through summaries.

## 6. Testing

- 778 heavy commands: 355 minutes running, and about 177 minutes waiting in the one-at-a-time queue.
- The R57 round: about 7.67 million helper tokens, no script changed.
- The record states few cases where a check changed a decision.
- A check's peak memory was never measured, so the number of check slots cannot be sized yet.

## 7. The two tests the owner ordered (run on 2026-11-18)

**The suite, measured** (`probe-suite-memory.md`, one run):

- 9 min 56 s. 1,018 tests: 965 pass, 0 fail, 53 skipped (they need the app).
- It runs with `--test-concurrency=1`: one test file at a time.
- Peak memory of the whole run: 494 MB. Peak processes: 12.
- Processor use of the whole PC during the run: 12.8 % on average, about 3 of 24 threads.
- By memory alone, about 30 such runs fit in what was free (15 GB).
- So a check uses a small part of this PC, and the check is serial by its own setting. Whether the test
  files are safe to run side by side is not tested.

**Do hooks refuse here: yes, observed** (`probe-hooks.md`, one app session with a test hook):

- A hook refused a write outside its folder. The file was not written and the session was told why.
- A hook refused a helper started on the model opus. It sees the helper's type and model when they are passed.
- Hooks fire for tool calls made inside a helper, with the same session id and an agent id that tells
  the helper apart.
- The refusals held although the session ran with permissions bypassed.
- Hook input carries the session id, the transcript path, a tool-use id, and for Write the full content.
- Hooks also fire for connector tools. PostToolUse, SubagentStop, Stop and SessionStart all fire.
- The context size is not given to a hook.
- One hook call costs about 37 ms on this PC.
- Not tested: a hook that times out, a compacted or resumed session, writes through shell commands.
- The first attempt, with the stand-alone program, failed: it has no login. The login lives in the app.

Still untested: one root instruction file against several.

## 7a. Several writers on one file

The owner rejected "one writer per file" as the coarsest lock there is. Two extractions:

**Our own collision points** (`write-collision-points.md`, from the change list, which names places, not diffs):

- Locked by file: 3 fixes can be built at once.
- Locked by function or block: 7 at once. With the shared primitive 0b built first: 8.
- 20 points are touched by two or more fixes. 9 of them are separate entries, keys or parts and would merge
  cleanly. 11 are real: 7 ordered sequences (the hook's order, the fence hold, `evaluate`, `rowAct`,
  `computeStatus`, `runAlarm`) and 4 places where the same statements change.
- The record's own material on several writers is about sessions writing run files, not about builders
  editing source. Its unit of collision is the file.

**The literature** (`concurrency-literature.md`; nearly all figures read from summaries, not full papers):

- Agents changing one repository at the same time conflict textually in 20 to 42 % of pairs.
- A merge that is clean and still breaks: rare in real pairs (1 of 834), common in constructed ones.
  Telling an agent what the other is changing recovered 82 % of runs.
- Parallel agents: up to 21 % faster on some tasks, up to 39 % slower on others. Splitting work by file
  dependencies: up to 2.1 times faster and 35 % cheaper.
- Merging by syntax and not by line cuts conflicts by 34 to 62 %.
- A serial step such as merging or testing caps the gain (Amdahl; the Universal Scalability Law puts the
  best number of workers at the square root of (1 - a) / b).
- Not found: the conflict rate at which optimistic control stops beating locks; a study of speed-up
  against the number of agents with the merge cost counted.

Reading, as a hypothesis and not a result: a file lock is too coarse here. Finer control would be: 0b
first; each fix owns its functions; each writer on its own copy, merged afterwards; the 11 real collision
points either given one owner or split beforehand into separate entries. The suite is the serial step
that would then cap the gain. None of this has been tried.

## 8. Claims of the coordinating session that this record corrects

- "38 of 71 rules written as prose fail": the count is of practised ideas that failed, mostly as lines in
  briefs and model re-checks. Some script ideas failed too.
- "The tier is fixed by the agent definition": the caller's `model` value overrides it.
- "The design rules that hooks stay off": it was a lean with no owner answer.
- "The Horthy record settles the layout of instruction files": it does not.
