# Brief: the one adversarial review of the harness kit (one Opus refuter, fresh context)

The owner's words are in `../OWNER-WORDS.md`. Read them first, all of them. They outrank this brief. His last
message there is why you exist and sets your standard:

> I'm approving one proper rigorous adversarial review that still there has to be a standard that it doesn't loop around and start fixing stuff that doesn't really matter. [...] actual faults, breaking things that will have actual like bad consequences of any scale, then we'll focus on those and find those rigorously.

token limit 10 M (expected about 7 M, basis r57-0173)

Deliverable: harness-kit/COVERAGE.md

## What you are reviewing

`harness-kit/` and what it wires: a second person (on macOS, working in a repository of her own) clones this
repository, follows `harness-kit/README.md`, runs `node harness-kit/setup.mjs --apply` once, and from then on her
sessions are held to this project's method by Rust hook programs, a few commands, and short rules loaded at each
session's start. It was built today by eleven helpers under one coordinator. You were given none of their
conclusions on purpose. Their hand-backs are under `../in/`: do not read them until your own list is written, and
then only to mark which of your faults were already known.

Where the code is: `harness-kit/setup.mjs`, `check-clone.mjs`, `hooks/`, `tokens.mjs`, `parallel/unit.mjs`,
`parallel/check.mjs`, `parallel/kitlib.mjs`; the Rust workspace `harness-kit/rust/` (seven programs and
`kit-core`); the JavaScript hooks the programs were ported from, `.claude/hooks/{window-ceiling,tier-hook,
creep-gate,count-gate,fanout-gate}.mjs` with `kit-mode.mjs`; the queue `research-tree/tools/lane.mjs`. What it
promises: `harness-kit/README.md`, `RULES.md`, `COVERAGE.md`. The clean-clone check's last log is at the path your
prompt gives: read it first, so you do not repeat what it already shows.

## The standard

A finding is a **breaking fault**: something that, on her machine or on this one, has a real bad consequence.
- A hook program that lets through what it must refuse, or refuses ordinary work, in a way she will meet.
- The set-up leaving a machine wired wrongly, wiring something that is not there, or `--remove` taking out or
  leaving something it should not.
- A landing (`unit.mjs land`) that loses or corrupts work, leaves the landing branch in a wrong state after a
  failure, or lets two landings interleave; the queue killing or holding the wrong thing.
- A step of the README that fails when followed exactly from a clean clone.
- A line of the README, `RULES.md` or `COVERAGE.md` that says something is enforced, run or measured when it is not,
  where she would rely on it.
- A difference between a Rust program and its JavaScript hook that changes a decision on input a real session
  produces.

For each one you must **show it**: the exact command or input you ran and what came out, or the exact lines of code
and the input that reaches them. A suspicion you could not show is not a finding; say in one line what you could
not settle. Then the consequence in one sentence, and the smallest fix.

Not findings, and not to be listed one by one: style, names, wording, a cleaner way to write something, a missing
test where the behaviour is right, a difference that no real input reaches, anything about macOS that cannot be
shown here (one line may say what looks most likely to fail there and why). No fixes: you change no file but your
report.

## How to spend the budget

By risk, in this order; stop at the end of the list or when the budget is near, and say how far you got:
1. The fan-out gate and the count gate in kit mode (limits, the cap, the state file, the basis table, the width
   file): they are the newest logic and they guard her tokens.
2. The set-up: apply, apply twice, apply for a second project, remove; a settings file that already holds her own
   entries.
3. `unit.mjs`: land, a failing check, a conflict, a second landing at once, a crash between the merge and the record.
4. The window ceiling in kit mode: what may be written past the line, and where.
5. The README's set-up and each speed-up's command, run as written, in temp folders.
6. `COVERAGE.md`: take twenty rows marked `hook` or `command` across the four sources and check that the named
   program or command really does what the row says.
7. The start hook and `RULES.md`: is any rule there false or not held by any record.

## Rules

- Work in temp folders outside this repository. Never run the set-up with `--apply` here; never write into `work/`,
  `.github/`, `recovered/`, `docs/program/evidence/` or `library/journal/`. Another session works in this folder.
- To run the programs: one `cargo build --release --offline --locked` of `harness-kit/rust/` with
  `CARGO_TARGET_DIR` set to a folder of your own under the temp folder, then use the built files. A hook on this PC
  refuses a helper's further cargo calls after three in a row whose error counts did not go down with the last
  above zero: make that one call and no more.
- No commit, no push. Shell calls under 150 s. Write your report early and keep it current.

## The report

`docs/program/harness-kit-2026-11-25/in/breaking-faults.md`:
1. Breaking faults, worst first: what breaks; how you showed it; the consequence; the smallest fix; the file and line.
2. What you checked and found sound, one line each, so that silence means something.
3. What you could not settle, one line each.
4. At most ten one-liners of things that are not breaking and are not to be fixed now.

Return under 1,000 tokens: the count of breaking faults and each in one line.
