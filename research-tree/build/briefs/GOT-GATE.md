# Brief: enforce "graph of thoughts means the method, run in the open" (2026-11-25)

owner: r58-0027. His words are in that record in full and outrank this brief: `bash library/lookup.sh -f r58-0027`.
The rule you enforce: the last section of `docs/program/RESEARCH-METHOD-RULES-2026-11-25.md` ("Graph of thoughts means
the method, run in the open"). Read both before writing code. Read also the hook you extend,
`.claude/hooks/hypothesis-gate.mjs`, its tests, and `tools/check-hypothesis.mjs`.

Deliverable: tools/check-got.mjs

## What to build

1. **`tools/check-got.mjs <folder> [--ledger]`.** Reads `<folder>/GRAPH-PLAN.md` and `<folder>/thoughts.jsonl` (the
   record forms are in the rule, point 3). Without `--ledger`: exit 0 and "ok", or exit 1 and one line per minimum of
   point 4 that is not met, in plain words. With `--ledger`: prints the ledger of point 5 as markdown, the same bytes
   for the same records (stable order, no clock, no absolute paths): first every minimum not met (or the line
   "Every minimum is met."), then per part the generated thoughts with who wrote each, each thought's levels and
   vetoes, what was kept and what was dropped with its reason, the aggregates with their parents and scores, the
   refinements, the final thought, and a list of thoughts whose writer could not be confirmed. Exports its functions
   for the hook and the tests.
   - "The plan is older than every thought": by the `at` fields and by the plan file's modification time against
     the oldest thought file.
   - "Written by that run": when `by` is an agent id, look for the transcript `agent-<id>.jsonl` in the `subagents`
     folders under `~/.claude/projects/<this project>/` (any session folder) and confirm it holds a write to the
     thought's file (a Write tool call or a shell command naming the path). Found and confirmed: verified. No
     transcript, or no such write: "unverified", listed in the ledger, not a fault. `by: top session` is never
     verified and is printed as such.
   - Every thought's `file` must exist and be non-empty; two thoughts may not share a file.
2. **`.claude/hooks/hypothesis-gate.mjs`, one more check on a Write or Edit of a hypothesis file.** The text that
   would result must carry, in its first 40 lines, either `Search: <folder>` or
   `Not reached by a graph of thoughts: <text>` (non-empty text). With `Search:`: the folder must exist, and the
   document must hold a `## ` heading containing "What was actually done" whose body equals the ledger of that folder
   (compare after normalising line ends and trailing spaces). A ledger that begins with unmet minimums is allowed:
   the rule lets work be shown as what it is. Say in the refusal exactly what is missing and the command that prints
   the ledger. Keep every existing check and all existing tests passing; do not loosen anything.
3. **`.claude/hooks/got-reminder.mjs`, a UserPromptSubmit hook.** When the owner's message names the method
   (graph of thoughts, graph thinking, tree of thoughts, forest of thoughts; any case, hyphens or spaces), it adds a
   short context note: the six points of the rule in at most twelve lines, with the path of the rule. Otherwise it
   prints nothing and exits 0. Wire it in `.claude/settings.json` beside the existing hooks; change nothing else
   there.
4. **Tests** in the repository's existing style (`node --test`): for the checker, one valid graph that passes and
   one failing case per minimum, the ledger's stability, a verified and an unverified writer (use a temporary fake
   projects folder through an environment variable, as the gate's tests do with their root); for the gate, the three
   outcomes (no line, `Not reached` line, `Search:` with a matching and with a differing section); for the reminder,
   a matching and a non-matching message.
5. **One row** in `research-tree/build/ENFORCEMENT-TABLE.md` for this rule: what enforces it and what it cannot see
   (whether a thought is good, whether a score is fair, whether `top session` thoughts were written honestly).

## Limits

- Touch only the files named here. No other hook is changed or weakened. No commit. Nothing is installed.
- Do not run or change anything under `docs/program/hypotheses/`; make test fixtures in a temporary folder.
- Commands over about 8 KB are cut by the shell tool, and double backslashes collapse in heredocs: write files with
  the Write tool.
- A foreground command over about three minutes is moved to the background: keep calls short.

## Hand-back

The files written, the number of tests and that they pass (`node --test ".claude/hooks/*.test.mjs"` and the
checker's own), and what the enforcement cannot see, in ten lines at most.
