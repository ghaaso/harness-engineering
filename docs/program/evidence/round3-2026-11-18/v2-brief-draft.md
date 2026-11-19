# Brief: draft version 2 of the decision rule (step 1, kind analyse, Opus)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` below means
`docs/program/evidence/round3-2026-11-18/`. `B:` means `docs/program/evidence/bottleneck-2026-11-18/`.

## What exists

Version 1 of the decision rule, `B:DECISION-RULE.md`, routes work to the method that fits the current bottleneck. It is
a hypothesis; none of its numbers is set. `B:BUILD-IN.md` is the design for building it in. The owner asked for wider
research before any measurement; that round (round 3) is finished in four lanes, each with a final report refuted in a
fresh context:
- `R:c1-report.md`: one serial check shared by many workers.
- `R:w1-report.md`: several writers of one object, as database engines solve it.
- `R:t1-report.md`: which kind of B-tree fits a tree whose nodes are sessions.
- `R:a1-report.md`: a refilling token allowance; a few long units.
Each lane has `R:<lane>-claims.md` (claim ids and verdicts) and refute files: `R:c1-refute.md`, `R:w1-refute.md`,
`R:t1-refute.md`, and for a1 two files, `R:a1-refute-1.md` and `R:a1-refute-2.md`.

## Read

In full: `B:DECISION-RULE.md`; the four reports. Of `B:BUILD-IN.md`, section 0 ("The answer", lines 17-29) and
section 4 ("Build order", from line 373 to the start of section 5). Look up claim ids and verdicts in the claims
files and the refute files by search (grep for the id); read them in full only where a report leaves a verdict unclear.
`library/README.md` only if you need the ruling ids below; the rulings are quoted here.

## Write

1. `R:RULE-V2-DRAFT.md`, in this order:
   1. **The answer**, at most twelve lines.
   2. **One table**, a row per conclusion of the rule, columns: the conclusion; what changed against version 1 (kept,
      corrected, replaced, new) and why; where it comes from (lane claim ids); the measured gain and its conditions,
      "self-reported" where it is a company's own figure; what the lane's refuter left of it; what is still a guess for
      model sessions.
   3. **The rule, step by step**, in ratios, each part marked `proven in the literature`, `measured here`, or
      `hypothesis`. Take a position on every point where a lane contradicts version 1, and say which lane claim decides
      it. At least these: when a token window starts to limit; how several windows combine; whether the order of writes
      can be fixed before work; what the worker cap of a check with several slots is; which kind of tree for which size
      of job. Add any other contradiction you find, between a lane and version 1 or between two lanes.
   4. **From a small project to a very large one**: how the rule behaves across sizes, and which of its inputs each
      project measures while it runs.
   5. **Measurements**: one merged list of the measurements the four lanes name, no duplicates. For each: what number it
      sets; whether it is a count over logs or transcripts that already exist, a run on this PC, or better done as a
      simulation swept over project sizes; and what the rule does until it exists.
   6. **Build order**: what this changes in the build order of `B:BUILD-IN.md` section 4, by its piece numbers.
   7. **Not found**: what no lane found, and the papers that need the owner's sign-in (each lane's report lists its own;
      lane a1 names Balseiro and Gur 2019; Balseiro, Kim, Mahdian, Mirrokni; Wang and others, POMACS 2017; Mu'alem and
      Feitelson 2001 is saved but needs an OCR install, which needs the owner's word).
2. `R:v2-claims.md`: numbers every statement of the draft that rests on a lane, as `V2-001`, `V2-002`, ... One row each:
   the id; the statement in one line; the draft section; the lane; the lane claim id(s); the verdict that claim carries
   in the lane's claims or refute file, word for word; and whether the draft uses the claim in full or only in part.
   Put the `V2-` id in the draft beside each statement it numbers, so a reader can go from one file to the other.

## Rulings that bind the draft

- No design question goes to the owner. A mechanism comes from the literature and a number from a measurement; a
  missing number is named as a measurement and never guessed (r57-0001, r57-0002).
- Nothing is tuned to one repository. The rule must hold for small and very large projects and is stated in ratios
  (r57-0028).
- Every statement is marked proven in the literature, measured here, or hypothesis (r57-0010). A result proven for
  databases, queues or schedulers and not yet for model sessions is `proven in the literature` for its own field and
  `hypothesis` for model sessions; say both.
- The rule is shown by how each conclusion was reached, never as knobs to tweak (r57-0027).
- A company's own figure is self-reported and says so (r57-0030).
- A lane claim that held only in part is used only for the part that held; a refuted claim is not used, except to say
  what was refuted.

## Limits

Reading and writing only: no test, measurement, install, download, web search, and no change to a script, hook or
settings file. Write only the two files above. Do not edit version 1, `B:BUILD-IN.md`, any lane file, or the sibling
session's files (`R:intake-*`, `library/INDEX-draft.md`, `library/tests/`). Do not commit. Plain words, short sentences.

## Return (ten lines or fewer)

The two paths; the number of conclusions by change (kept, corrected, replaced, new); the number of `V2-` statements;
one line per contradiction you settled, with the claim that decided it; the three measurements that would set the most
numbers.
