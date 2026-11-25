# Brief: make the kit enforce the whole method on a second person's machine (a fresh coordinator session)

The owner's words are in `../OWNER-WORDS.md`, every message of 2026-11-25 on the kit, in full. Read them first.
They outrank this brief. The two that set this job, quoted here as well:

> all the parallization work + experiments + final result full system with maxmimum speedup ready for use it should be easier to find on my branch or the main branch for my teammate to use and have a readme of how to use it properly along with orchestration.doc so she doesnt end up exhausting tokens or having models overthink etc

> not just copy it into the Git. All that work has to be enforced in the sense that she only sets up the Git from the README, and all her work follows, and she achieves the speedups that are mentioned in the document and the research. And if there are things that we haven't, that are on trial, she can just see them for themselves if they work or not. That won't be that difficult for her. But you're not supposed to leave things out like you did. And make sure you're not missing anything after this.

Deliverable: harness-kit/COVERAGE.md

## What "done" is

1. **One set-up.** She clones, follows `harness-kit/README.md`, runs the set-up once, and from then on every session
   she starts in that clone is held to the method: by hooks where a hook can hold it, by a script she runs where it
   is a procedure, and by the short rules loaded into each session at its start. She is not asked to remember it.
2. **The speed-ups are reachable.** For each gain in `harness-kit/parallel/SPEEDUPS.md` the README says what she runs
   or what is wired, in her own repository, to get it: units in their own copies landing through the check in one
   order (several writers), the queue for heavy commands, the test suite in shards, helpers and readers side by
   side, the model by kind of job, the window ceiling and hand-over, limits with a basis.
3. **What is on trial is in, and marked.** A part that was designed or decided and never run here (the rule for how
   many run at once, pacing a token window, the model and effort per step, several writers inside one file) is
   switched on as a trial where it is built, with a plain mark and a way for her to see whether it works (a log, a
   printed number, a before and after). A part that exists only as a design is listed as that, with what building
   it takes. Nothing is described as proven that no record measures.
4. **Nothing left out.** `harness-kit/COVERAGE.md`: one row for every item of `harness-kit/parallel/SPEEDUPS.md` (its
   30 sections), every part of `harness-kit/parallel/DECISION-RULE-v2.md`, every row of
   `research-tree/build/ENFORCEMENT-TABLE.md` and every rule of `harness-kit/ORCHESTRATION.md`, each marked exactly
   one of: enforced after set-up (which hook), runs after set-up (which command), on trial (how she sees it), this
   owner's own (why it is not hers), cannot work off this PC (why, and the smallest change). No row without a mark.
5. **Checked.** `node harness-kit/check-clone.mjs` covers every part that is in, from a clean clone, and exits 0.
   macOS cannot be run on this PC: say so, and keep `README.md`'s macOS section true. She will make it work on her
   Mac herself (record r58-0013), so make that easy: no Windows-only assumption that a plain change would remove.
6. **Delivered.** On `bilal/build` and as a pull request to `main` from a branch `bilal/<what>`, opened, not merged.

## Where things stand (2026-11-25, evening)

- The kit today: `harness-kit/` (`README.md`, `ORCHESTRATION.md`, `RESULTS.md`, `setup.mjs` with 22 tests,
  `check-clone.mjs`, `parallel/`). The set-up wires three hooks (window-ceiling, tier-hook, creep-gate) into that
  machine's `.claude/settings.local.json` and switches the archived FixFlow skills off. On `main` except
  `parallel/`, which is in pull request 6 (`bilal/promote-parallel`, open).
- What is out and the smallest change that brings each in: `../in/setup-report.md` (count-gate, fanout-gate, a
  test file for the tier hook, the lane's timeout off Windows). The fan-out gate is the one that holds a token limit
  and the meter reading: off this PC it needs a mode that works without the desktop app's usage tool and without
  the record book.
- The rules with their standing: `../in/method.md` (96 rows). The measurements: `../in/results.md` (83 rows).
- The parallel work: `harness-kit/parallel/SPEEDUPS.md`; the rule `parallel/DECISION-RULE-v2.md`; how it was to be
  built into the scripts `parallel/research/BUILD-IN.md` (one `widths()` function, its gates; a design); the scripts
  that ran: `research-tree/tools/lane.mjs` (the queue, 4 slots here), `research-tree/tools/land.mjs` (lands a unit
  through its tests, undoes on a failure), `research-tree/build/facts/lane-measure/shards.cmds`. They carry this
  repository's layout; she works in a repository of her own (Python, Postgres, pytest by the work split,
  `docs/program/work-split/`), so they need her check command and paths from a small config, not edits.
- Not on `main`: the record book (`library/`: the commit check refuses a journal copied onto another line), the
  session-start hook that loads the board. A kit start hook that loads the short rules is not built.
- Who has what: `OWNERS.json`; root `CLAUDE.md`, "Branches and owners". Her branch, pull request 3 and files are
  never touched; the owner guard hook refuses it. The evidence guard stays (r58-0009).
- Records of the day: r58-0005, r58-0008 to r58-0010, r58-0013, r58-0100 to r58-0105, r58-0601 (the mistake this
  job repairs: the first kit was built from the hooks and left the parallel work out). State:
  `research-tree/build/REPO-ORG-STATE.md`. The earlier session ended at its cap of 50 M.

## How to run it

- You coordinate; helpers build. Routes by kind of job (`.claude/hooks/tier-routes.json`): a hook or a gate is
  invariant-sensitive code (Opus); an ordinary script or a document from tables is Sonnet's or an Opus writer's as
  the routes say. Units that touch different files start together.
- Before any helper: read the usage meter, size the units from today's measured costs (a Sonnet reader 0.6 to 1.0 M,
  an Opus builder of a hook 2 to 4 M, an Opus writer 1.8 M: r58-0102, r58-0104, r58-0105), put one `cap:` question to
  the owner with the figure, write a state file in `research-tree/build/` that names your session and the cap.
- Changing a hook that is wired on this PC changes it for every session here, and another session is working in
  this folder: change a hook only with its tests passing, and keep its behaviour here as it is (a new mode is chosen
  by the kit's set-up, not by default).
- One review at most, a repair round only for a breaking fault (CLAUDE.md rule 8). No design question to the owner
  (rule 7): a mechanism comes from the documents above. Report to him in plain words, the picture first.
- Start by writing `harness-kit/COVERAGE.md` with every row and its mark as things stand today: it is the list of
  what is missing, and the same file is the proof at the end that nothing is.
