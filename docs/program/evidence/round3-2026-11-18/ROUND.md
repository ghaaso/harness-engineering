# Research round 3: several writers, the shared check, the kind of tree (2026-11-18)

Task r57-0512 on the library board. Asked by the owner on 2026-11-18, before any measurement. Three lanes, one
Opus orchestrator session each. The top session keeps the board and decides corrections.

| Lane | Prefix | Lane file | Extractor files | The question |
|---|---|---|---|---|
| writers | `w1` | `lane-writers.md` | `x25` to `x29` | How database engines let several writers change one object fast and without mistakes, and what of it carries to sessions editing one file |
| check | `c1` | `lane-check.md` | `x30` to `x34` | How many workers one shared serial check can feed, and what makes the check itself carry more |
| budget | `a1` | `lane-budget.md` | `x44` to `x48` | How a refilling token allowance is paced, and how a few long units are scheduled (added 2026-11-19) |
| tree | `t1` | `lane-tree.md` | `x35` to `x39` | Which kind of B-tree fits a tree whose nodes are sessions, for small and for very large work |

All paths below are from the repository root. `R:` stands for `docs/program/evidence/round3-2026-11-18/`.

## What the owner asked (rulings on the board; they bind you)

- r57-0029: "not in the papers read" is never "no paper". Search the problem under its other names and at other
  sizes (thread, process, program, machine, team) and in database engines. Choose papers for large, innovative
  gains, not small advances.
- r57-0013, r57-0014: the core literature, read in full in the paper's own text; figures quoted from the paper.
- r57-0028: nothing is tuned to one repository. A result must say whether it holds for small and for very large
  projects. Prefer laws stated in ratios over thresholds.
- r57-0001, r57-0002: no question goes to the owner. A mechanism comes from the literature, a number is computed
  from a measurement; a missing number is named as a measurement, never guessed.
- r57-0010: every statement is marked proven in the literature, measured here, or hypothesis.
- r57-0027: a report says how each conclusion was reached, not only the conclusion.
- r57-0004, r57-0007: no test, measurement, build or install in this round. Reading and writing only.

## Standards for a paper

1. **Which.** First the papers a field is built on and the survey a field trusts. Then papers with a large measured
   gain (say the gain, the baseline, the workload, the scale). Then engines in real use (how PostgreSQL, SQL
   Server, FoundationDB, LMDB, RocksDB and the like do it, from their own papers or documentation). Skip a
   variant that changes no answer.
1b. **Real systems count, and are marked.** A company's own account of a real system that hit a limit and changed
   its design (an engineering write-up, an industry-track paper, a post-mortem) is a first-class source: say
   what broke, at what scale, what they changed to and what they measured before and after. Its figures are
   self-reported and uncontrolled: write "self-reported" in the block and in any record. Each lane has one
   collector for these (topic `production`; extractor files `x41` writers, `x42` tree, `x43` check).
2. **How.** Read the paper itself: `curl -s -L --ssl-no-revoke`, check the file starts with `%PDF-`, `pdftotext`,
   then search and read the text (r57-0110). A fetched summary is not a reading; mark anything read only as a
   summary as `summary`. A blocked page: find the open copy (author's page, arXiv, a university copy). No pirate
   copies. No way round a sign-in or a bot check: list the paper under "needs the owner's sign-in".
3. **Where.** Each paper in its own new folder `R:papers/<lane>/<short-name>/` (`paper.pdf`, `paper.txt`). Public
   papers only, under 40 MB each. Open or run nothing else you download. The folder is not committed.
4. **Privacy.** Nothing of ours (names, paths, code, the owner) goes into a web search or a URL.
5. **What is written per paper** (in the collect file, one block each): the problem; the mechanism in two lines;
   the measured gain with its baseline, workload and scale, quoted with the line of `paper.txt`; what the
   mechanism assumes; whether that assumption holds when a writer is a model session (a unit lasts minutes,
   redoing it costs tokens, 3 to 16 writers, a rerun is not the same run); status `quoted`, `summary` or
   `not opened` with the reason.

## Start from the library

Read `library/INDEX.md` first, then `library/README.md`. Look up with `bash library/lookup.sh <words>`. Much of
this round's ground was already collected and sits in extractor records (ids beginning with `x`); the lane file
gives the search words. A record marked `quoted` from a paper read in full is not collected again: read the place
it cites and use it (r57-0130). A record marked `summary` or `textbook` is upgraded by reading the source. If the
library has nothing, say "not recorded".

## Method: the orchestration document, not a skill

Follow `docs/ORCHESTRATION-DESIGN-2026-10.md`: section 3, the tier guide (lines 86 to 102), and section 5, the
contracts every brief uses (lines 361 to 548). Read those two parts, not the whole file. The library says which
of its rules ran and worked (r57-0208) and which failed (r57-0209); the rest never ran and are hypotheses. Load no
orchestration skill. The tier hook of this repository enforces the routes: a helper's `description` begins with
its kind and a colon, an explicit `model` is passed, never Fable.

| Step | Kind: model | Does | Writes |
|---|---|---|---|
| 1 | `collect`: sonnet, five at once in one message | One sub-topic each: library look-up first, then the papers, in full | `R:<p>-collect-<topic>.md` |
| 2 | `analyse`: opus | Reads the five files and the lane file; drafts the report; numbers every claim with its quote, path and line | `R:<p>-report.md`, `R:<p>-claims.md` |
| 3 | `run`: sonnet, and `refute`: opus in a fresh context, together | Gate: each quote stands at its cited place. Refuter: sees only the claims and the paper texts, tries to break each | `R:<p>-gate.md`, `R:<p>-refute.md` |
| 4 | `analyse`: opus | Folds the verdicts in: confirmed, holds in part, refuted, cannot be checked. A claim not confirmed is never called supported | `R:<p>-report.md` final, `library/journal/<date>/<p>.jsonl` |
| 5 | `extract`: haiku, one per collect file, at once; then `run`: sonnet | One `result` record per paper finding, in the README's schema, nothing inferred. The check: each record parses, keeps the field order, and its numbers stand at the line it cites | `library/journal/<date>/x<nn>.jsonl` |
| 6 | you, by command | Sections present, records parse, usage read; commit only your lane's files with `git commit -F`; push once | |

Write the brief of every step to `R:<p>-brief-<step>.md` before step 1 starts, and a state file `R:<p>-state.md`
that you update after each step. Each launch then reads "Read and follow exactly the brief in <path>".

## The report (`R:<p>-report.md`)

Start with the answer in at most ten lines. Then one table: conclusion; where it comes from; the measured gain and
its conditions; what the refuter left of it; what is still a guess for model sessions; what it would change in our
rule (`docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md`) or our tree. Then the architecture you
propose for our case, ranked by expected gain, each part marked proven, measured here or hypothesis, with the
measurement that would set its numbers and how it behaves from small to very large projects. Then what was not
found and what was not opened, with what was searched.

## Library records

You are a child session. Prefix and extractor numbers are in the table at the top. Follow `library/README.md`
exactly. Write a design decision as a `hypothesis`, a published finding as a `result`, a thing true of our code as
a `fact`, and anything that contradicts an existing record as your own record plus an `open` record "proposed
correction of <id>". Do not edit `library/INDEX.md`. Do not supersede another writer's record.

## Keeping the library clean (added 2026-11-19; ruling r57-0031)

A wrong record is worse than a missing one: later sessions will build on it.

- A `result` record states only what stands at the place it cites. Nothing from a helper's memory. A source read
  as a summary or not opened gives no `quoted` record.
- A claim the refuter narrowed is recorded in its narrowed form. A refuted claim is not recorded as a result: the
  lane's `<p>.jsonl` carries one `status` record with the counts by verdict and each refuted claim with the reason,
  so it is not proposed again.
- A figure carries its unit, baseline, workload and scale; a company's own figure carries "self-reported".
- The check after extraction covers every record, not a sample: it parses, keeps the field order, and each number
  and name stands at the cited line. A record that fails is removed before the commit; report how many.
- The top session lists a lane on the board only after a fresh reader has checked a sample of its records
  against the paper texts, and after a recall test on the new records.

## Limits

- Design and reading only. No test, measurement, experiment, install or change to a script, hook or settings file.
- Usage: read it before step 1 and after each step; stop and report if the week reaches 62 %.
- Your context: about 130,000 tokens, of which about 64,000 is fixed load. Do not read collect files, paper texts
  or reports yourself; helpers read them and return at most ten lines. Near the ceiling, update the state file,
  commit it, and say so first in your report.
- Do not touch `research-tree/lane/*`, `docs/program/evidence/pc-freezes-2026-11-17/`,
  `research-tree/tools/av-watch.ps1`, or another lane's files. Never stash, reset or switch branches.
- End every process you start. Report tokens used, never money.

## Final message

Start with the commit. Then, in a few lines: the answer; the counts by verdict; what was not found or not opened;
the one measurement that would decide the most.
