# Widths a plan declares (read by the count gate, `.claude/hooks/count-gate.mjs`, at every helper start)

When a plan says how many helpers of a kind may run at once, or that some may not start while others run, the
session that runs the plan copies that statement here as one line, before it starts the helpers, and removes the line
when the plan no longer needs it. Every session of this repository is held to the lines here.

A declaration is a line of one of these two forms (a "- " before it is allowed):

    width "<pattern>" <n>: <reason>
    hold "<pattern>" while "<pattern>": <reason>

- `width`: at most n helpers whose description matches run at once in a session.
- `hold`: no helper whose description matches the first pattern starts (or is revived by SendMessage) while one
  matching the second runs.
- A pattern is matched against a helper's whole description, case and runs of spaces ignored; `*` is any text and `?`
  one character. Helpers of helpers are matched by their own descriptions.
- The reason names the plan line or the measurement and carries a number (r57-0002), 12 characters or more.
- A line that starts like a declaration but does not parse refuses every helper start until it is fixed or removed.

Example (not active, since the line starts with "Example"): the plan of 2026-11-23 would have been
Example: hold "orchestrate: wave2 *" while "*replay-*": RUN:run/WAVE2.md says start no part while the 7 replays run

Every helper also counts against the app's limit of 20 at once in a session, helpers of helpers counted (t7-0603).
See what is counted: `node .claude/hooks/count-gate.mjs --status <session id>`.

## Declarations in force

(none)
