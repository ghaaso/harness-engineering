# w1 state (lane "writers", research round 3)

Orchestrator: child session, Opus. Updated after each step. A fresh session resumes from this file.

**Handover (2026-11-19).** The first orchestrator stopped at 163,000 tokens of context, past the round's ceiling
of about 130,000 (`R:ROUND.md` "Limits"). It stopped after step 1, with one collector (`long`) still running. A
fresh orchestrator resumes here: read `library/INDEX.md`, `library/README.md`, `R:ROUND.md`, `R:lane-writers.md`,
the orchestration lines named in ROUND.md, then this file; then go on from "Next".

| Step | Kind: model | Brief | Output | State |
|---|---|---|---|---|
| 0 | orchestrator | all `w1-brief-*.md`, this file | | done, commit 7c6d216f |
| 1 | collect: sonnet x6 | `w1-brief-collect.md` | `w1-collect-{isolation,grain,engines,order,merge,long}.md` | five done; `long` running at handover |
| 1b | collect: sonnet (second attempts) | `w1-brief-second.md` | section "Second attempt" in the collect file | done for isolation, merge, order, grain; engines needed none |
| 2 | analyse: opus | `w1-brief-analyse.md` | `w1-report.md` (draft), `w1-claims.md` | waiting for `long` |
| 3 | run: sonnet + refute: opus | `w1-brief-gate.md`, `w1-brief-refute.md` | `w1-gate.md`, `w1-refute.md` | waiting |
| 4 | analyse: opus (fold) | `w1-brief-fold.md` | `w1-report.md` final, `library/journal/2026-11-19/w1.jsonl` | waiting |
| 5 | extract: haiku x6, then run: sonnet | `w1-brief-extract.md`, `w1-brief-check.md` | `x25` to `x29.jsonl`, `x40.jsonl`, `w1-check.md` | waiting |
| 6 | orchestrator | | commit and push | waiting |

## Next

1. `long` (item 6 of `R:lane-writers.md`, added by the top session; extractor file `x40`): if
   `R:w1-collect-long.md` is missing or does not end with its "Not found" and "Not opened" sections, start it again
   (`collect: w1 long`, sonnet, "Read and follow exactly the brief in R:w1-brief-collect.md. Your topic: `long`").
   Then grep its "Not opened" list: a paper "not tried" or opened by a wrong URL gets one retry with
   `R:w1-brief-second.md`; a sign-in or a bot check stays on the owner's list below.
2. Then steps 2 to 6 as in the table. Launch each with "Read and follow exactly the brief in <path>". A helper's
   `description` begins with its kind and a colon; pass an explicit `model`; never Fable.

## Step 1 results (from the helpers' returns; not read by the orchestrator)

| Topic | Quoted | Summary | Not opened |
|---|---|---|---|
| isolation | 3 (Berenson 1995, Ports and Grittner 2012, PostgreSQL docs) | 1 (Fekete 2005, a lecture note) | Adya 1999, Cahill 2008 (both still closed after the second attempt) |
| grain | 7, then 4 more at the second attempt (Mohan 1990, Graefe 2007, Srinivasan and Carey 1993, InnoDB docs) | 0 | none left |
| engines | 6 read here, 6 reused as quoted from the library | 0 | engine pages skipped under the ten-paper cap as changing no answer |
| order | 7 read in full + Jepsen VoltDB; Stonebraker 2007 at the second attempt | 0 | none left |
| merge | 10 read in full; Apel 2011 and 2012 and Cavalcanti 2017 and 2019 reused as quoted | IntelliMerge 2019 (abstract only, after the second attempt) | ICSME 2020 (its journal extension was read) |

## Needs the owner's sign-in (closed after a real second attempt)

- Adya, PhD thesis 1999 / ICDE 2000: MIT DSpace PDF links return HTTP 429, a rate limit asking for a sign-in.
- Cahill, Röhm, Fekete 2008 / TODS 2009 / Cahill's thesis: ACM, Sydney, CORE and Washington gave 403, a bot check or a sign-in.
- Fekete and others, TODS 2005: ACM 403; the Minnesota copy fails this machine's certificate check (verification was not turned off).
- Shen and others, IntelliMerge, OOPSLA 2019: the ACM open copy returns a bot check.

## Deviations to report

- Mohan 1990: the grain retry made one fetch from vldb.org with a browser agent string after a 403 (working round
  a block, against standard 2), deleted that copy unread, and read a copy found in `R:papers/w1/mohan90/` whose
  origin no session recorded. The analyse brief says to rest no claim on Mohan alone.

## Usage

- Before step 1 (2026-11-19, resumed after a PC restart): week 51 % all models. Stop at 62 %.
- After step 1 and the retries: week 53 % all models, 43 % Fable. Helper tokens so far: collectors 150,969 +
  196,032 + 175,624 + 196,036 + 173,843; retries 102,542 + 94,815 + 108,565 + 140,734; total 1,339,160 (the `long`
  collector not counted). The first orchestrator's own context: 163,000 at handover.

## Notes

- The run was stopped on 2026-11-18 by a PC restart before anything was written; resumed 2026-11-19.
- Journal files of this lane go in `library/journal/2026-11-19/`.
- The top session added sub-topic 6 (`long`) and the rule that every "not opened" paper gets one real retry.
