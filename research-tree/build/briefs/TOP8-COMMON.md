# Top session 8: what every unit reads first

Repository: C:/Users/User/Documents/projects/harness-engineering (Windows 11; shell tool is Git Bash; node v24; no Python).
Read `CLAUDE.md` and `library/INDEX.md` sections "Before you do this" and "Mistakes" first. The owner's ruling behind
this work is r57-0056 (`bash library/lookup.sh -f r57-0056`); the brief of the whole piece is `briefs/TOP8-ENFORCEMENT.md`.

Rules for every unit:
- The hooks in `.claude/hooks/` are live for every session in this repository, yours included. A live hook file
  must stay valid at every moment: build in a copy (for example `<name>.next.mjs`), and replace the live file in one
  step only after its self-tests pass. A hook that crashes must not block work by accident, and a hook that should
  refuse must exit 2 with a plain one-line reason.
- Do not edit `.claude/settings.json` or `.claude/settings.local.json`: end your result with the exact settings
  entries to add, and the top session wires them.
- Mechanisms come from the recorded research (CLAUDE.md rule 7). A number in a hook is computed from a recorded
  measurement and its record id is written beside it in the code; never a number typed by preference (r57-0002).
- Self-tests: one test file per hook, runnable with `node <file>`, each case fed real hook JSON on stdin; include a
  case that fails on the old code where you change a hook. Test once at the end of your work, not after every edit
  (r57-0033). Keep each shell call under about 2 minutes.
- Never edit `docs/program/evidence/`, `recovered/`, `library/journal/` or `docs/program/pipeline-diagram/`.
  Do not commit; do not push. Start no helpers of your own.
- Token limit: stated in your start message. If you pass it, stop at a quiet point and return LIMIT with what is done.
- Return in under 25 lines: what you built (files), tests (counts, and the command), what it cannot see, the exact
  settings entries, and how the top session can see it work live in a real session. Plain words.
- Write your full result to `research-tree/build/units/<UNIT>/result.md` (create the folder).
