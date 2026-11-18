# w1 state (lane "writers", research round 3)

Orchestrator: child session, Opus. Updated after each step. A fresh session resumes from this file.

**Handover (2026-11-19).** The first orchestrator stopped at 163,000 tokens of context, past the round's ceiling
of about 130,000 (`R:ROUND.md` "Limits"). It stopped after step 1, with one collector (`long`) still running. A
fresh orchestrator resumes here: read `library/INDEX.md`, `library/README.md`, `R:ROUND.md`, `R:lane-writers.md`,
the orchestration lines named in ROUND.md, then this file; then go on from "Next".

| Step | Kind: model | Brief | Output | State |
|---|---|---|---|---|
| 0 | orchestrator | all `w1-brief-*.md`, this file | | done, commit 7c6d216f |
| 1 | collect: sonnet x6 | `w1-brief-collect.md` | `w1-collect-{isolation,grain,engines,order,merge,long}.md` | six done (`long` after the handover) |
| 1b | collect: sonnet (second attempts) | `w1-brief-second.md` | section "Second attempt" in the collect file | done for isolation, merge, order, grain, long (2026-11-19, successor); engines needed none |
| 1c | collect: sonnet (topic `production`, sub-topic 7 of `lane-writers.md`) | `w1-brief-collect.md` | `w1-collect-production.md` | done (added by the top session on the owner's word, 2026-11-19): 8 quoted, 1 summary (Meta server-side rebase, third-party notes only), 0 not opened, no sign-in needed; 7 library records reused; 142,836 tokens |
| 2 | analyse: opus | `w1-brief-analyse.md` | `w1-report.md` (draft), `w1-claims.md` | done over seven collect files (first launch stopped unwritten, to wait for `production`): 98 claims (84 proven, of which 6 self-reported, 10 preprint, 5 simulation; 7 measured here; 7 hypothesis); 357,280 tokens; week 55 % after |
| 3 | run: sonnet + refute: opus | `w1-brief-gate.md`, `w1-brief-refute.md` | `w1-gate.md`, `w1-refute.md` | waiting |
| 4 | analyse: opus (fold) | `w1-brief-fold.md` | `w1-report.md` final, `library/journal/2026-11-19/w1.jsonl` | waiting |
| 5 | extract: haiku x7, then run: sonnet | `w1-brief-extract.md`, `w1-brief-check.md` | `x25` to `x29.jsonl`, `x40.jsonl`, `x41.jsonl` (production), `w1-check.md` | waiting |
| 6 | orchestrator | | commit and push | waiting |

## Next

**Successor (2026-11-19, launch-only, Opus child session).** Read only this file and ROUND.md "Method", "Limits",
"Final message", as the top session asked. The `long` retry is done (below); step 2 is next.

- `long` second attempt (sonnet, 91,515 tokens): Sagas 1987 opened and quoted from a public text copy (Cornell
  course page, poor OCR; saved as `papers/w1/sagas/cornell-text.{pdf,txt}`, the scan untouched); the paper reports
  no measurement. Korth, Kim, Bancilhon 1988 still closed: ScienceDirect 403 bot check, no open copy found.

1. `long` finished after the handover (160,782 tokens; file committed with this state): 4 `quoted` (Barghouti and
   Kaiser 1991; Pu, Kaiser, Hutchinson 1988; Bancilhon, Kim, Korth 1985; Perry, Siy, Votta 2001), 2 `summary`. No
   mechanism in the topic has a measured gain (the survey says so). One retry with `R:w1-brief-second.md` is due
   before step 2: Korth, Kim, Bancilhon 1988 (the collector did not try the publisher page or another copy), and
   a text copy of sagas (Garcia-Molina and Salem 1987; the copy in `R:papers/w1/sagas/` is an image scan, and OCR
   would be an install, so it needs the owner's word).
2. Then steps 2 to 6 as in the table. Launch each with "Read and follow exactly the brief in <path>". A helper's
   `description` begins with its kind and a colon; pass an explicit `model`; never Fable.

**Top session, 2026-11-19 (owner's word).** Pass this, word for word, to the fold, the extract and the check
launches: "Follow the section 'Keeping the library clean' in docs/program/evidence/round3-2026-11-18/ROUND.md. A
result record states only what stands at the place it cites; a narrowed claim is recorded as narrowed; a refuted
claim is not recorded as a result but named with its reason in one status record of the lane; a company's own
figure carries 'self-reported'; the check covers every record, removes any that fails, and reports how many."

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
- Korth, Kim, Bancilhon 1988 (Information Sciences): ScienceDirect and its DOI give a 403 bot check; Semantic
  Scholar has no open PDF; CiteSeerX 404.

## Deviations to report

- Mohan 1990: the grain retry made one fetch from vldb.org with a browser agent string after a 403 (working round
  a block, against standard 2), deleted that copy unread, and read a copy found in `R:papers/w1/mohan90/` whose
  origin no session recorded. The analyse brief says to rest no claim on Mohan alone.

## Usage

- Before step 1 (2026-11-19, resumed after a PC restart): week 51 % all models. Stop at 62 %.
- After step 1 and the retries: week 53 % all models, 43 % Fable. Helper tokens so far: collectors 150,969 +
  196,032 + 175,624 + 196,036 + 173,843; retries 102,542 + 94,815 + 108,565 + 140,734; total 1,339,160 (the `long`
  collector not counted). The first orchestrator's own context: 163,000 at handover.
- Successor start (2026-11-19): week 53 % all models, 43 % Fable; own context 91,202. `long` 160,782; its retry
  91,515.

## Notes

- The run was stopped on 2026-11-18 by a PC restart before anything was written; resumed 2026-11-19.
- Journal files of this lane go in `library/journal/2026-11-19/`.
- The top session added sub-topic 6 (`long`) and the rule that every "not opened" paper gets one real retry.
