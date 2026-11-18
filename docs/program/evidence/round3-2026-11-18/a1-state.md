# a1 state: lane budget (round 3, task r57-0512)

Orchestrator: a child session of the top session, started 2026-11-19. Briefs: `a1-brief-*.md` beside this file.
Lane file: `lane-budget.md`. Standards and limits: `ROUND.md`.

| Step | Kind: model | Brief | Writes | State |
|---|---|---|---|---|
| 0 | orchestrator | | `a1-brief-*.md`, this file | done 2026-11-19 |
| 1 | collect: sonnet x5 | `a1-brief-collect.md` | `a1-collect-{pacing,allocation,quotas,longjobs,llmbudget}.md` | next |
| 1b | collect: sonnet | `a1-brief-collect-retry.md` | "Second attempt" in a collect file | if any paper was not tried |
| 2 | analyse: opus | `a1-brief-analyse.md` | `a1-report.md`, `a1-claims.md` | |
| 3 | run: sonnet + refute: opus | `a1-brief-gate.md`, `a1-brief-refute.md` | `a1-gate.md`, `a1-refute.md` | |
| 4 | analyse: opus | `a1-brief-fold.md` | `a1-report.md` final, `library/journal/2026-11-19/a1.jsonl` | |
| 5 | extract: haiku x5, then run: sonnet | `a1-brief-extract.md` | `library/journal/2026-11-19/x44..x48.jsonl`, `a1-check.md` | |
| 6 | orchestrator | | commit and push | |

## Usage
- Before step 1: week (all models) 53 %, week (Fable) 43 %. Stop at 62 %.
- After four collectors: week 54 %, Fable 44 %. Orchestrator context 133,202 tokens (passed 130,000; state
  committed, continuing lean: the remaining steps run from files).

## Step 1 so far (collectors' own returns, not checked)
- allocation: 4 sources read in their main parts (proofs not read), 1 summary; closed: Zhou, Chakrabarty,
  Lukose (WINE 2008); Talluri body text garbled (abstract quoted only).
- quotas: 9 sources (4 provider pages on our windows, fetched 2026-11-19); closed or partial: Wang and others
  SIGMETRICS 2017 (abstract only), GCRA standard (Wikipedia stands in, summary), Stripe rate-limiter post (not
  read), SRE chapter 22 saved but unread.
- llmbudget: 8 sources; none closed; no source paces against a refilling window.
- pacing: 5 sources; closed: Balseiro and Gur 2019 (SSRN gives HTML), Balseiro, Kim, Mahdian, Mirrokni,
  Agarwal and others (LinkedIn, KDD 2014).
- longjobs: 6 sources (Tsafrir thesis stands in for TPDS 2007, Kolisch and Hartmann 2006, MapReduce, LATE,
  Mantri, Dolly); Graham from the library.

## Step 1b, second and third attempts (done 2026-11-19)
- pacing: LinkedIn (KDD 2014) now read in full. Balseiro and Gur 2019, and Balseiro, Kim, Mahdian, Mirrokni stay
  closed (403, bot checks; a third attempt asked by the top session found neither on arXiv): sign-in list.
- allocation: Zhou, Chakrabarty, Lukose read to section 5 (Internet Archive copy of the tech report); Talluri
  and van Ryzin clean with `pdftotext -raw`. None closed.
- quotas: GCRA (ATM Forum TM 4.0), Stripe post, SRE chapter 22 now read. Wang and others (POMACS 2017) stays
  closed (ACM 403): sign-in list, https://dl.acm.org/doi/10.1145/3084448.
- longjobs: Lifka 1995 read (rule only, no figures). Mu'alem and Feitelson 2001: the PDF is saved but its text
  layer is unreadable; reading it needs OCR, an install that needs the owner's word. Kolisch 1996: no open copy.
- Step 1 is closed. Next: step 2, analyse.

## Step 2, analyse (done 2026-11-19)
- `a1-claims.md`: 82 claims; 68 proven (13 self-reported, 10 provider documentation), 14 hypothesis.
  `a1-report.md` draft. Week 55 % before the step.
- Proposed corrections: o2-0501, o2-0404, r57-0408, r57-0409, o2-0321, x19-0701; DECISION-RULE lines 42-44,
  77, 117, 150, 171, 175; the J60/J120 label in `a1-collect-longjobs.md` lines 10 and 47 (corrected in A63).

## Step 3, gate and refute (started 2026-11-19)
- One gate (all 82). The refuter is split in two fresh Opus contexts for size: A01-A41 writes `a1-refute-1.md`,
  A42-A82 writes `a1-refute-2.md`. The fold reads both in place of `a1-refute.md`.
- Done. Gate: 125 STANDS, 1 ALTERED (A10), 14 NO QUOTE (A69-A82, all hypothesis). Refute: 48 CONFIRMED,
  33 PARTIALLY, 1 REFUTED (A76, finishing a unit-length before the reset), 0 UNVERIFIABLE.

## Step 4, fold (running) and step 5, extract and check (done 2026-11-19)
- The fold and the extractors ran side by side (different inputs, different files). Week 56 % before.
- Extract: x44 41, x45 34, x46 54, x47 42, x48 30 = 201 `result` records (196 quoted, 5 summary).
- Check, split in two for size (`a1-check-1.md`: x44, x46; `a1-check-2.md`: x45, x47, x48), every record:
  0 parse, order or id faults; 0 removed; 10 corrected (x44-0331 attribution; x47 0317-0319, 0321, 0328; x48
  0306, 0321-0323); 28 narrowed to the refuters' corrected form (x44 7, x46 4, x45 6, x47 2, x48 9). The one
  refuted claim (A76) is a hypothesis with no record.
- Orchestrator re-validation by command: 201 records parse, field order kept, ids unique and in 0300-0399.

## Notes
- The allocation retry read a PDF's streams with a script of its own (no downloaded file was run).
