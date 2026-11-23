# T8-TABLE result (analyse, Opus), 2026-11-24

**Built:** `research-tree/build/ENFORCEMENT-TABLE.md`, one file. It has one row per rule: CLAUDE.md rules 1 to 7 (split
into 14 parts), the board's 38 "Before you do this" rows and the owner's rulings r57-0001 to r57-0056. Each row gives
what enforces the rule today (with the file named), what that cannot see, when the rule was broken (r57-06xx, t7-06xx,
the five of 2026-11-23), and whether a hook or script could enforce it and from what input. After the table come 10
ranked proposals. No code was written and no settings changed.

**What it found:**
- Enforced today: the evidence and the journal's append-only rule (record guard and commit check), models by kind of
  job (tier hook), no design questions through the question tool, the build's own plan (plan gate, only while plan.json
  exists and only for starts that name a planned unit), FixFlow skills off (settings), and the board injected at start
  and after compaction (a reminder only; it refuses nothing).
- Rules held in writing only, and broken: the window ceiling (r57-0604, t7-0608), how many helpers run at once
  (t7-0603), the journal through the shell (t7-0607, t7-0800, t7-0801), limits without a measured basis (r57-0617,
  r57-0614, t7-0602), reports to the owner (6 times), reading the meter in an earlier message than the start (r57-0615),
  and opening the record from the files (r57-0602).
- Marked as being built: T8-CEIL (ceiling, r57-0008/0056, rule 5d), T8-COUNT (r57-0414/0032), T8-JOURNAL (README rule 1
  for the journal, r57-0016).
- The two questions in the brief:
  - "A limit has a measured basis": a PreToolUse hook on Agent can check it. It reads the prompt and the brief it names,
    and refuses a limit with no cited record id, a cited id that is not measured, a limit equal to its expected, or limits
    that sum past the cap. It cannot see a cost the plan left out, which is what happened in t7-0602. Size about 120 lines
    plus 15 tests.
  - "Reports to the owner": partly checkable. Check his pages (on Artifact publish), the top session's last message (a
    Stop hook) and wrap_up. Refuse record ids, unit names, file paths and currency signs. The count of figures stays a
    warning until "a handful" is recorded as a number. It cannot see whether the picture comes first or whether the words
    are plain. Size about 150 lines plus 20 tests.
- Cannot be enforced by any hook or script: rule 2, the judgment rulings (r57-0004, 0006, 0015, 0028, 0033, 0040), r57-0007
  and r57-0018 outside the ceiling, and whether a record's status or claim is true. These stay written rules plus review.

**Tests:** none (an analysis). **Settings entries:** none.
**How the top session sees it work:** it reads the table, checks three rows against their records with
`bash library/lookup.sh -f <id>`, and gives the table to the blind refuter.
Tokens: well under the 14 M limit.
