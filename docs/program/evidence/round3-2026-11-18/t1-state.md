# t1 state (lane "tree", research round 3)

A successor resumes from this file: read `ROUND.md`, `lane-tree.md`, this file, then the brief of the next step.
`R:` = `docs/program/evidence/round3-2026-11-18/`. Journal date folder: `library/journal/2026-11-19/`.

| Step | Brief | Helpers (kind: model) | Output | Status |
|---|---|---|---|---|
| 0 | - | - | the seven briefs, this file | done 2026-11-19 |
| 1 | `t1-brief-1-collect.md` | read: sonnet (`ours`); collect: sonnet x4 | `t1-collect-{ours,concurrent,writes,versions,hierarchy}.md` | done 2026-11-19: ours 0 papers (10 findings); concurrent 8 read, 4 closed; writes 8 read, 0 closed; versions 5 read, 6 closed; hierarchy 10 read, 0 closed. Helper tokens 185k, 196k, 162k, 167k, 179k = 889k |
| 1b | `t1-brief-1b-second.md` | collect: sonnet x2 (A papers, B hierarchy depth gap) | a `## Second attempt (2026-11-19)` section appended to concurrent, versions, writes (A) and hierarchy (B), each ending `Second attempt finished.` | done 2026-11-19: A opened 5 of 12 (ARIES/KVL, Comer 1979, LFS, Buchsbaum 2000, LMDB docs); bot check, for the owner: Sagiv 1986, Johnson-Shasha 1990 and 1993; still closed: Bayer-Schkolnick, Yao, Baeza-Yates, Graefe 2011, Lanin-Shasha. B opened 5 (RAO measured depth up to 10, the "no depth-2 study" gap was wrong as written). Helper tokens 143k + 131k. Next: step 2 |
| 2 | `t1-brief-2-analyse.md` | analyse: opus | `t1-report.md` (draft), `t1-claims.md` | done 2026-11-19: 115 claims (22 from production): 65 proven, 19 observed, 28 hypothesis, 3 summary, 0 measured. C04 and C25 carry the two corrections. Five cited lines moved since collection, listed for the gate. Helper tokens 295k (analyst, continued once for the sixth file) + 154k (production collector) |
| 3 | `t1-brief-3-gate.md`, `t1-brief-3-refute.md` | run: sonnet; refute: opus | `t1-gate.md`, `t1-refute.md` | done 2026-11-19: gate 85 located, 30 not checkable (no quote), 0 failed; refute 67 confirmed, 42 partly, 5 refuted (C51, C59, C90, C108, C114), 1 unverifiable (C65). The refuter opened `t1-collect-ours.md` lines 110-145 against its brief while checking C13, C14; it says both verdicts rest on the primary files. Helper tokens 147k + 301k |
| 4 | `t1-brief-4-fold.md` | analyse: opus | `t1-report.md` final, `library/journal/2026-11-19/t1.jsonl` | running |
| 5 | `t1-brief-5-extract.md`, `t1-brief-5-check.md` | extract: haiku x5; run: sonnet | `x35`..`x39.jsonl`, `t1-check.md` | pending |
| 6 | - | coordinator, by command | commit of lane files only, one push | pending |

## Usage and context readings
- 2026-11-18, before the PC restart: week 51 % (all models), 42 % Fable. Coordinator window 114,000 tokens
  (about 60,000 fixed load, 50,000 of reading the start files).
- 2026-11-19, resume: week 51 % per the top session; free memory 20.6 GB. Stop at 62 %.

- 2026-11-19 after step 1: week 52 % (all models), 43 % Fable. Coordinator window 158,600 tokens: past the
  155,000 stop it set; it hands over here.
- 2026-11-19, successor (launch-only child session, Opus) at start: week 53 % (all models), 43 % Fable;
  window 89,700 tokens after reading only this file and three ROUND.md sections. Step 2 launched.
- 2026-11-19, top session's addition (owner's word), received after step 2 had started: one more collector,
  topic `production` (sub-topic 6 of `lane-tree.md`), writes `t1-collect-production.md`, extractor file `x42`.
  Launched (collect: sonnet). The running analyst is not stopped: when the collector ends, the same analyst is
  continued with its context to fold the sixth file into the draft and claims. Fold, extract and check launches
  carry the "Keeping the library clean" sentence of the top session word for word.
- 2026-11-19 after step 2: week 54 % (all models), 44 % Fable; window 102,300 tokens. Step 3 launched.
- 2026-11-19 after step 3: week 55 % (all models), 44 % Fable; window 108,800 tokens. Step 4 launched.

## Hand-over (2026-11-19)
The first coordinator stopped at 158,600 tokens. A successor (Opus, kind orchestrate) starts here: read
`ROUND.md`, `lane-tree.md`, this file; then wait until step 1b is done (the grep above gives 3 for A's files plus
1 for hierarchy; if after about 30 minutes a file lacks the end line, go on without it and say so in the report),
then launch step 2 with "Read and follow exactly the brief in docs/program/evidence/round3-2026-11-18/t1-brief-2-analyse.md",
then steps 3 to 6 as the table says. Read usage before each step; stop at 62 %. The briefs of steps 2 and 4
were extended after step 1 (two claims to carry; two candidate corrections). The top session's added standard:
no paper may stay "not tried"; one real public-route attempt each; sign-in papers stay for the owner.

## Notes
- Started 2026-11-18; stopped by the owner for a PC restart before anything was written; resumed 2026-11-19.
- The coordinator was at about 118,000 tokens when the briefs were written, near the ROUND's "about 130,000"
  ceiling. It keeps its own reads to helper returns of at most ten lines and hands over through this file if
  it passes about 150,000 (the child range of r57-0404).
- Papers go to `R:papers/tree/<short-name>/`, which is git-ignored (`R:papers/.gitignore`). Never commit them.
- Commit only: `R:t1-*`, `library/journal/2026-11-19/t1.jsonl`, `library/journal/2026-11-19/x35.jsonl` to `x39.jsonl`,
  and `library/journal/2026-11-19/x42.jsonl` (production).
