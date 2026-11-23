# Brief: prepare the second wave of the research run (top session 7, 2026-11-23)

Kind build-invariant, Opus. Expected 10 M tokens, limit 16 M (count with
`node C:/research-runs/2026-11-harness-leads/tools/tokens.mjs`, see `tools/README.md`, or
`H:research-tree/build/tools/tokens-self.mjs`). Hand over your window before 250 K: write what is done, return LIMIT.

`RUN:` = `C:/research-runs/2026-11-harness-leads/`. `H:` = `C:/Users/User/Documents/projects/harness-engineering/`.

## What the owner approved (library r57-0054)
The 14 research keys the run's part bounds left unread are read now: 4 more parts (graphs 4 keys, encoders 6, memory 4;
graph grounding against hallucination among them and first), about 222 M tokens at the run's mean part (55.4 M), cap
600 M for the whole wave: your preparation, the 4 parts, the closing fold and the coordinator's own tokens together.

## What you do
The run's machinery ran once end to end (gate, split, field brief, closing). Reuse it as a second wave in the run
folder, under its rules (`RUN:CLAUDE.md`) and its commit tool (`RUN:tools/commit.mjs`). Change as little as the wave
needs and record every change.

1. Read: `RUN:CLAUDE.md`, `RUN:tools/README.md`, `RUN:run/config.json`, `RUN:run/STATE.md`, `RUN:run/TOP.md`,
   `RUN:briefs/COORDINATOR.md` (the parts on starting a part, a part's return, the gate, hang detection, the closing),
   `RUN:briefs/FIELD.md` and how a part's brief is filled (`RUN:briefs/field/`), each map's `NOT-COVERED.md` and
   `PARTS.md` in `RUN:fields/2m-graphs/`, `3m-encoders/`, `4m-memory/`, `RUN:briefs/CLOSING.md` (the fold of a pair of
   parts into the synthesis and HAND-BACK.md), `RUN:run/tokens-run.txt` (what each unit used),
   `H:research-tree/build/JUDGE-HANDBACK.md` sections 4 and 5.
2. The four parts. The 14 keys go into 4 parts by the run's own split rule where it applies (graphs: one part of 4
   keys; encoders: 6 keys in two parts; memory: one part of 4), each key keeping what its map wrote for it. Unit ids
   that continue the run's (for example f2e, f3c, f3d, f4c): folders `RUN:fields/<id>-<slug>/`, briefs filled exactly
   as wave 1 filled a part's, record prefixes and extractor files that do not collide with wave 1's (say which).
   Each part reads the sources in full under the run's rules, as wave 1's parts did; nothing is narrowed.
3. `RUN:run/config.json`: add the four units and a `wave2` block. Expected per part from the measured parts (12 parts,
   39.8 to 66.5 M, mean 55.4 M). The limit per part is the measured need plus a buffer computed from that spread
   (r57-0038: never a guess, never equal to the expected; state the formula), such that the four limits, your own
   tokens, the closing fold at its limit and the coordinator's share (state each) sum to at most 600 M (r57-0614: the
   limits at their fences must not pass the cap). Wave 1's caps and units stay as they are, marked done.
   The gate: this week's meter read 25 % all models, 11 % Fable at about 16:45 UTC on 2026-11-23, reset
   2026-11-30 12:00 UTC; the week rule of the config applies (no weekend wall). Make `tools/gate.mjs` admit the new
   units by the same rule; if it needs a code change, make it with its tests; run the run's tests and report the count.
4. The coordinator of this wave is top session 7 (Fable), which runs in `H:` (not in the run folder) and starts each
   part as a helper with the Agent tool: description `orchestrate: wave2 <unit> ...`, model opus, in the background;
   the parts start their own readers as wave 1's did (fork mode is off in `H:` too; the tier hook, record guard and a
   plan gate run there: a description must not begin `<kind>: <an id of H:research-tree/build/plan.json>`). Check what
   in the run's tools assumes the coordinator's transcripts lie under the run folder's project (tokens.mjs `--root`,
   wait.mjs, hang.mjs) and say exactly what to pass instead. The run folder is outside the session's working
   directory: say whether a helper started from `H:` can write and commit there (try one harmless write and remove it).
5. The closing of the wave: one unit after the four parts return, by the run's closing rules cut to this wave: check
   the parts' records, fold their leads and negatives into `RUN:closing/SYNTHESIS.md` and `RUN:closing/HAND-BACK.md`
   as marked additions (new leads continue the L numbering; a changed lead keeps its number and says what changed;
   "Not covered" updated), the token table extended. HAND-BACK.md as it stands now is kept as a copy
   (`closing/HAND-BACK-wave1.md`). Write the closing unit's brief; expected and limit from the measured closing
   (70.93 M for 16 units) scaled to 4 parts, the formula stated.
6. Write `RUN:run/WAVE2.md`, at most 120 lines, for the coordinator: the units with model, expected and limit; for each
   start the exact description, the exact prompt (it should only point at the unit's brief) and the gate command to run
   before it; what the coordinator does at each return (the commands, in order); what it does if a part is silent, or
   returns LIMIT; the closing's start; where the tokens of the wave are counted; what you changed in the run folder
   (files, one line each) and what you left unchanged on purpose.
7. Check before anything is stacked on it: diff one generated part brief against wave 1's brief for the same field and
   list every difference (only keys, ids, paths and limits should differ); run the gate for each new unit with the
   meter above and print its line. Commit in the run folder with `tools/commit.mjs`.

## Rules
- No install, no download, no network in this preparation. Do not start any part, reader or the closing.
- Wave 1's records, reports, RETURN files and hand-back are evidence: add beside them, do not edit them (the one
  exception is the marked additions of step 5, made later by the closing unit, with the wave 1 copy kept).
- Do not ask the owner anything. A number is computed from the run's measurements; say how.
- Helpers by kind: `locate:`, `extract:` Haiku; `read:`, `run:`, `build:` Sonnet; `analyse:`, `refute:`,
  `build-invariant:` Opus.

## Return (at most 20 lines)
DONE or LIMIT; the four units with their keys, expected and limits and the sum against 600 M; the tests' count; the
gate's four lines; anything the coordinator must know that is not in WAVE2.md; your tokens; the commit hash.
