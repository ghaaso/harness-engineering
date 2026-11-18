# w1: context every helper of lane "writers" reads first

Adapted from section 5.1 of `docs/ORCHESTRATION-DESIGN-2026-10.md` (its block is about another project; library
record r57-0010: nothing is reused blindly). `R:` = `docs/program/evidence/round3-2026-11-18/`.

PROJECT CONTEXT (established by the orchestrator; do not re-derive):
- Repository `C:\Users\User\Documents\projects\harness-engineering`, Windows, Git Bash. `node` is on the path,
  Python is not; `curl` and `pdftotext` are. It holds research on harnesses for AI coding agents.
- This is lane "writers" (`w1`) of research round 3, task r57-0512. Its question: how database engines let
  several writers change one object fast and without lost or wrong writes, and what of it carries to model
  sessions editing one file. The lane file `R:lane-writers.md` and the round file `R:ROUND.md` bind you; read the
  parts your brief names.
- Our case, "a writer": a model session (Claude) that edits files of one code repository. One unit of work lasts
  minutes; redoing it costs tokens; 3 to 16 writers at once; a rerun is not the same run (the model is not
  deterministic); the final judge is the project's test suite, run as one serial check (596 s for one run here,
  library record r57-0103). Today the harness has a two-way switch per file: own copies merged, or one owner
  (records r57-0406, r57-0128).
- The library: `library/INDEX.md` (board), `library/README.md` (record schema). Look up with Bash:
  `bash library/lookup.sh <words>` or `grep -rh '"id":"<id>"' library/journal`. A record whose id begins with `x`
  was checked by script only: read the place it cites before you rest on it. Status `quoted` = read in the source;
  `summary` = read only as a summary, never used for a decision.

RULES:
- Two sibling sessions work in this same checkout. Write only the files your brief names. Never run git
  commands that change anything (no add, commit, stash, reset, checkout). Do not touch `research-tree/lane/*`,
  `docs/program/evidence/pc-freezes-2026-11-17/`, `research-tree/tools/av-watch.ps1`, or files of lanes `c1`, `t1`.
- No test, measurement, install or experiment. Reading and writing only. Open or run nothing you download.
- Privacy: no name, path, code or person of ours goes into a web search or a URL. Search only for the published
  topic (for example "serializable snapshot isolation PostgreSQL paper pdf").
- Cite every claim as `path:line — quote`. Mark each statement `quoted` (read in the paper's own text),
  `summary` (read only in an abstract, a fetch summary or a secondary source), or `reasoned` (your inference).
  A figure is never written from memory or from a fetch summary as if read.
- Keep each shell call under two minutes (a helper's call over about 180 s is moved to the background and the
  helper can stall). Write your output file early and add to it as you go: the app has restarted mid-run before
  and killed helpers.
- Your final answer to the orchestrator is at most ten lines: the path you wrote, counts, the few points that
  matter. Everything else goes in the file.
