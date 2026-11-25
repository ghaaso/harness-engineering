# Harness kit

A way of running Claude Code sessions that start helpers: each helper on the model its kind of job needs, under a token
limit taken from measured costs, several writers in their own copies landing through the tests in one order, tests side
by side, and a coordinating session that hands over before its window grows dear. Six hooks, built as Rust programs,
hold the rules a machine can check; `RULES.md` puts the rest into every session; `ORCHESTRATION.md` and `RESULTS.md`
hold the rules with their records and every measurement.

## Set-up

### What your machine needs

- **Rust through rustup.** The workspace pins Rust 1.100.0 (`harness-kit/rust/rust-toolchain.toml`). Without `cargo`
  the set-up stops, says what to install and changes nothing. There is no JavaScript hook behind the programs: without
  Rust nothing is wired (the owner's word: no fallback; a fault is fixed when it shows).
- **Node 20 or later**, for the set-up and the commands. **git.**
- **The first build fetches crates.** The programs use `serde_json` and `regex`; with what they need, that is the 15
  crates `harness-kit/rust/Cargo.lock` names, all from crates.io. The set-up builds offline by default and stops with
  that list when a crate is not in your cargo cache. Run it again with `--fetch` to let cargo download them (and rustup
  install 1.100.0 if it is missing). After that the build runs offline. Here the offline build took 24 s.

### For the clone itself

1. Clone the repository and open the clone's folder.
2. `node harness-kit/setup.mjs` prints what it would do and changes nothing: the six commands it would write, whether
   each program is built, cargo's version, the build command, the lines git should ignore.
3. `node harness-kit/setup.mjs --apply --fetch` (first time; later `--apply` alone). It
   - builds the programs: `cargo build --release --locked` in `harness-kit/rust`, into `harness-kit/rust/target/`;
   - refuses to wire a program that is not built;
   - writes six entries into `.claude/settings.local.json`, each marked `--harness-kit`, each of the form
     `"<clone>/harness-kit/rust/target/release/kit-<hook>" --harness-kit "--clone=<clone>" "--project=<project>"`;
   - makes `.harness/` with `kit.json` (a copy of `harness-kit/parallel/kit.example.json`), `WIDTHS.md` (the width and
     hold forms explained, nothing declared) and `briefs/`, never overwriting a file there;
   - switches off the archived FixFlow skills and agents (13 and 12) in that settings file; you do not need them.
   It never writes `.claude/settings.json` or `.gitignore` and sets no git option. It prints the lines git should
   ignore (`.claude/settings.local.json`, `.claude/logs/`, `.harness/lane/`, `.harness/lane-measure/`); add them
   yourself. `.harness/` is yours to commit or not. A path holding `"`, `$`, a backquote, a backslash or a line break
   is refused: move the folder to a plain path.
4. Start a new Claude Code session. Hooks load when a session starts.
5. `node harness-kit/setup.mjs --status` shows, hook by hook, wired or NOT WIRED, program there or MISSING, built and
   newer than its sources or OLDER, and the `.harness/` files. It exits 0 only when everything holds. After a
   `git pull` that changes `harness-kit/rust/`, it says OLDER: run `--apply` again.
6. `node harness-kit/setup.mjs --remove` takes out exactly what `--apply` added; `.harness/` is left.

### For a repository of your own (Python, Postgres, pytest or anything else)

Keep the clone where it is and point the set-up at your repository:

    node <clone>/harness-kit/setup.mjs --apply --project <your repository>
    node <clone>/harness-kit/setup.mjs --status --project <your repository>

The hooks then read and write everything about the work under your repository: state files, briefs and the widths file
in `<your repository>/.harness/`, logs in `<your repository>/.claude/logs/`. Only `.claude/settings.local.json` is
written under its `.claude/`; its own skills are not touched. Two more steps:

- The helper types `lean-<kind>` (eight of them: locate, extract, read, collect, run, build, analyse, refute) live in
  the clone. To use them in your repository, copy them in:
  `mkdir -p <your repository>/.claude/agents && cp <clone>/.claude/agents/lean-*.md <your repository>/.claude/agents/`.
  The tier hook checks the kind and the model, not the type, so this is optional.
- Edit `<your repository>/.harness/kit.json` for your tests before using the parallel commands (below). Its pytest
  defaults were never run (no Python on the PC the kit was built on).

**Claude Code in a terminal.** The fan-out gate checks that the plan's usage was read before each wave of helpers, with
the desktop app's usage tool (`get_usage`). A session with no such tool would be refused every start. Add
`--no-usage-tool` to `--apply`: that one rule is off and each of its log lines says so; every other rule stays. Read the
usage yourself before a wave (`RULES.md` K4).

### The clean-clone check

`node harness-kit/check-clone.mjs` (about 3 minutes here; it needs the crates in your cargo cache, so run it after your
first `--apply --fetch`). In a temporary folder it makes a fresh repository from `origin/main` plus the kit files of your
working tree, then:
- applies the set-up twice, to the clone and to an empty git repository with `--no-usage-tool`, and needs `--status`
  to say all holds in both;
- runs every hook's test file twice, against the JavaScript hook and against its program, with the counts side by side;
- feeds every wired hook, through the exact command in the settings file, one call that must pass and one that must be
  refused;
- times one passing call through each JavaScript hook and its program (median of 20);
- reads `COVERAGE.md` (every row one of the eight marks, every `hook` row names a wired program, every `command` row a
  file that exists, no row says `missing`) and needs `RULES.md`;
- runs `--remove` in both and shows nothing of the kit is left.
It prints one table and exits 1 if any line failed. On its last run, on 2026-11-25, every line held except those for
files still being written: `RULES.md`, this table's rows, and `harness-kit/tokens.test.mjs` against the program
`kit-tokens`, then a placeholder. All three were finished after that run, which was not repeated.

## What holds your sessions after set-up

Each hook is a program in `harness-kit/rust/target/release/`. Logs are in `<project>/.claude/logs/<hook>.jsonl`, one
line per decision.

| program | runs on | refuses | how a session passes | log |
|---|---|---|---|---|
| `kit-start` | session start, resume, clear, compaction | nothing | it puts into the session the clone's path, `RULES.md` (cut at 9,000 characters), the state files in `.harness/`, and after a compaction a line that the summary is not the record | `kit-start.jsonl` |
| `kit-tier-hook` | every tool call; acts on helper starts and child-session starts | a helper whose description does not start with a kind and a colon; no `model` on the call; a model the kind is not routed to; mythos; a child session in a folder without the kit's hooks | `read: ...` with `model` as `.claude/hooks/tier-routes.json` routes it (`RULES.md` K1) | `tier-hook.jsonl` |
| `kit-window-ceiling` | every tool call | past the session's or helper's window line, every call but the hand-over | write `.harness/<NAME>-STATE.md`, briefs under `.harness/briefs/`, results under `.harness/units/`, `git commit`; then a fresh session (K7) | `window-ceiling.jsonl` |
| `kit-count-gate` | helper starts and messages to helpers | a 21st helper running, helpers of helpers counted; a start past a width or hold in `.harness/WIDTHS.md`; a line there that does not parse | wait for a helper's finish notice (K6); see what it counts with `"<clone>/harness-kit/rust/target/release/kit-count-gate" --status <session id> --harness-kit "--clone=<clone>" "--project=<project>"` | `count-gate.jsonl` |
| `kit-fanout-gate` | helper starts | a limit line with no expected figure, not above it, citing no record, or a record that is not in `harness-kit/basis.json` or `.harness/basis.json`; under a cap, a start with no limit or one past the cap; no usage reading in an earlier message after the last wave and under 26 minutes old (not with `--no-usage-tool`) | the line `token limit N M (expected about E M, basis <id>)` (K2); the cap in the state file (K3); the usage read first (K4) | `fanout-gate.jsonl` |
| `kit-creep-gate` | helper starts | a review with nothing changed since the last; a review while another runs; a review of a review; a third review of one piece; a repair round on findings not called breaking; with a deliverable stated, a review of anything else before the deliverable has changed | `Deliverable: <path>` first, then build it (K5); there is no way round it in your repository (the owner's escape needs his record book) | `creep-gate.jsonl` |

What they cannot see: a job given the wrong kind; the effort a helper runs at; child sessions, for the fan-out and creep
gates; a review that uses none of the review words; writes made through a shell command. The full lists are at the top
of each JavaScript hook in `.claude/hooks/`, which the programs match.

The state file every gate reads, `<project>/.harness/<NAME>-STATE.md`, needs only these lines (the session id's first 8
characters are printed by `node <clone>/harness-kit/tokens.mjs`):

    Session 1a2b3c4d, kind orchestrate
    Cap 30 M tokens
    Meter line 80 %

`kind orchestrate` makes the window ceiling treat the session as a coordinator (hand-over line W*, measured 247-273 K,
r57-0171); without it a session gets the checkpoint line (about 330 K on Opus).
Without an Opus window in your settings the window ceiling takes 400 K, the window this project measured its lines under.
If your Opus sessions compact before about 330 K that line is never reached; the setting that gives the same window is
`modelSettings.<model id>.autoCompactWindow`, read from `~/.claude/settings.json`, `<clone>/.claude/settings.json` and
`<clone>/.claude/settings.local.json`: `"modelSettings": {"claude-opus-5-5": {"autoCompactWindow": 400000}}`.
The cap is what the fan-out gate keeps the job under.
A helper killed by an app restart stays counted against the cap until ended by hand (the refusal prints this with your paths): `"<clone>/harness-kit/rust/target/release/kit-count-gate" --end <helper id> "<why>" --harness-kit "--clone=<clone>" "--project=<project>"`.
The meter line is optional: with it, a start is refused once the usage reading, plus what the meter can have moved since, reaches it.

**Speed of the programs.** One passing call, median of 20, on the owner's PC (Windows 11, Ryzen 9 7900X), JavaScript
hook against its program, from the clean-clone check of 2026-11-25: `kit-start` 42.5 against 6.7 ms; `kit-window-ceiling`
42.4 against 7.5; `kit-tier-hook` 40.0 against 5.9; `kit-count-gate` 41.3 against 13.9; `kit-fanout-gate` 39.0 against
8.5; `kit-creep-gate` 42.6 against 12.7. The two hooks that run on every tool call cost about 13 ms in place of 82 ms
(computed from those medians). The Rust core's own run: tier hook 36.9 against 6.1 ms.

**Same behaviour as the JavaScript.** Each program passes its JavaScript hook's test file case for case: window ceiling
134 of 134, creep gate 42 of 42, count gate 29 of 29 (27 and 2 skipped in a clean clone, both ways, because two cases
read the owner's files), fan-out gate 48 of 48, kit-start 10 of 10, tier hook 23 of 24 with 1 skipped (a missing
JavaScript module, which a program cannot have). The differences the builders found are listed in their reports
(`docs/program/harness-kit-2026-11-25/in/rust-*-report.md`); one is a fix: the Rust tier hook refuses the kind
`constructor`, which the JavaScript hook let through unchecked.

### Still JavaScript, and why

- `harness-kit/setup.mjs`: it must run before anything is built.
- `harness-kit/check-clone.mjs` and the test files: they drive both the JavaScript hooks and the programs.
- The parallel commands `harness-kit/parallel/unit.mjs`, `check.mjs`, `kitlib.mjs` and the queue
  `research-tree/tools/lane.mjs`: they run a few times a day, a port has no measured gain, and the queue is in live use
  on the owner's PC.
- `harness-kit/tokens.mjs`, the counter of what each helper cost: the start hook names it, so it stays. Its program
  `kit-tokens` was finished last, late on 2026-11-25, and the set-up builds it with the others: the same arguments and
  the same output (`tokens.test.mjs` 8 of 8 against both; 9 of 9 identical runs side by side on real sessions). Its
  hints still name `node harness-kit/tokens.mjs`. It is a command; no hook runs it.
- The JavaScript hooks in `.claude/hooks/` stay as the owner's PC's hooks and as the reference the programs are tested
  against. The kit does not wire them.

### Day to day

Every session gets `RULES.md` at its start: K1 to K7 say what the hooks refuse and how to pass, K8 to K10 the commands,
K11 to K22 the rules no hook can see. A session that starts helpers reads `ORCHESTRATION.md` first: the kinds and their
models, the measured cost of each helper role (the basis for a limit), briefs, hand-over, waits and caches, and ten
mistakes that cost tokens here.

## The speed-ups and how to get each

Every figure below is from the harness repository on the owner's PC (Windows 11, 12 cores, 24 threads, 31 GB), November
2026, mostly one trial. Each names its record (`bash library/lookup.sh -f <id>` on `bilal/build`). The whole account,
with each figure marked measured, computed, estimate or designed, is `parallel/SPEEDUPS.md` (also `speedups.pdf`).

1. **Several writers on one set of files.** One writer per file allowed 3 of the build's 14 units at once; own copies,
   a skeleton change first and one landing order allowed **7 builders at once** (width measured, r57-0128; the time
   saved is an estimate, at most about 1 hour of 6.5). 25 landings: 20 landed, 3 undone by a failing test, 2 stopped
   by a conflict, none silent. What you run, from your repository:

       node <clone>/harness-kit/parallel/unit.mjs start <name>        prints the unit's own folder (a git worktree)
       node <clone>/harness-kit/parallel/unit.mjs land <name> [test file...]
       node <clone>/harness-kit/parallel/unit.mjs list
       node <clone>/harness-kit/parallel/unit.mjs report

   A helper for a unit works only in that folder. `land` merges into the landing branch (`build` by default, made
   from your HEAD; it must not be checked out elsewhere) in a landing copy of its own, runs your check through the
   queue, and undoes the merge if the check fails. Exit 0 landed, 1 check failed and undone, 2 conflict and nothing
   changed, 5 no result and undone, 6 already landed, 64 usage or another landing running. Nothing is pushed: merge
   the landing branch into your main branch yourself. No verb removes a landed unit's copy; do it with
   `git worktree remove <copies_dir>/<name>` and then `git branch -d u/<name>` (`copies_dir` is `../<repo>-units` by
   default).
2. **The test suite side by side and in shards.** 596 s one file at a time became 264 s with 8 files at once and
   **120.4 s** with the slowest file cut into 4 shards (r57-0159, r57-0103, hc1-0100; `node --test`, 25 files). What
   you run:

       node <clone>/harness-kit/parallel/check.mjs [file...] [--at N]   your test files N at once (default queue_slots)
       node <clone>/harness-kit/parallel/check.mjs --measure            seconds at 1, 2, 4 and 8 at once, on your machine

   Shards: the `shards` key of `.harness/kit.json` cuts a slow file into parts (a pytest example is in the file).
3. **The queue for heavy commands.** Raising its slots from 2 to 4: four runs at once at 3.67 of a perfect 4 (92 %),
   each 6 to 15 % slower than alone (r57-0127, r57-0159); above 4 not measured. `check.mjs` and `unit.mjs` use it
   (`<project>/.harness/lane`, slots = `queue_slots`). For any other heavy command:
   `node <clone>/research-tree/tools/lane.mjs --dir <project>/.harness/lane --timeout-s 600 -- <command...>`;
   `--capacity N` sets the slots (never above the processor count). It ends a timed-out command's whole process tree.
4. **Helpers and readers side by side.** The build ran 1.8 helpers at a time on average: about 1.8 times shorter by the
   clock than one at a time (computed: 990 helper-minutes in 547 minutes). Five Sonnet readers at once: 767 K tokens,
   4 minutes (r57-0115; no one-at-a-time run beside it). Side by side saves time, not tokens. Wired: `kit-count-gate`
   keeps you under the app's 20 (t8-0109); `RULES.md` K11 tells sessions to start together what can run together.
5. **The model by kind of job.** On the weekly meter a fresh Sonnet token weighed 0.15-0.5 of an Opus token, Haiku
   0.15-0.8, Fable 2.7-5.6 (r57-0175, one week). The saving in tokens was not measured, nor whether the smaller model
   gives the same output. Wired: `kit-tier-hook`.
6. **The window ceiling and hand-over.** 97 % of tokens are re-reads of a window already there (t1-0108). A build root
   cost about 0.24 M a call; the measured hand-over point was 247-273 K; the three roots used 17 % of the build's
   tokens (r57-0170, r57-0171, r57-0173). A coordinator once ran to 404 K instead of handing over (r57-0604). Wired:
   `kit-window-ceiling`, with the state file above.
7. **Limits with a basis, and your own measured costs.** The build planned by guess used 907.7 M tokens, 2.3 times its
   plan (r57-0170). The measured cost of each helper role is in `ORCHESTRATION.md` section 3; its records are in
   `harness-kit/basis.json`. Wired: `kit-fanout-gate`. After a job, `node <clone>/harness-kit/tokens.mjs --project
   <your repository>` lists each helper's tokens; `--basis "<what it did>" <helper id>` keeps one as your own record
   (`own-0001`, ...) that the gate accepts as a basis. `<clone>/harness-kit/rust/target/release/kit-tokens` with the same
   arguments does the same.
8. **Fewer tokens loaded per call.** The archived FixFlow skills cost about 8,000 tokens a call (computed from
   characters, r57-0155); the set-up switches them off in the clone. Your repository never had them.

The research behind these, each claim checked by a refuter and quoted from the papers, is in `parallel/research/`:
`c1-report.md` (the shared check as a queue, batching, merge queues), `w1-report.md` (several writers: locks,
optimistic against locking, version-checked writes, structured merge), `t1-report.md` (the shape of the session tree),
`a1-report.md` (a refilling token allowance), `o1-report.md` and `o2-report.md` (finding the bottleneck; scheduling
under several scarce resources), `BUILD-IN.md` (how the rule is to be built in). The rule decided from them is
`parallel/DECISION-RULE-v2.md`; its numbers are hypotheses.

## On trial: see for yourself

In the kit and switched on, never proven here. What tells you whether each works:

| part | what was decided | how you see it |
|---|---|---|
| `unit.mjs` (several writers) | own copies, one landing at a time in the order called, undo on a failing check; run only in its tests (6 of 6), never on a real project | `unit.mjs report`: landed, undone, conflicts, seconds waited and run; `.harness/landings.jsonl`; the clock time of a job against one done in turn |
| `check.mjs` and the pytest defaults | your test files through the queue, `queue_slots` at once; the pytest commands never ran | `check.mjs --measure`; `check.mjs --at 1` against the default; a file that collects no tests exits 5, a fail |
| the queue off Windows | a timeout ends the command's whole process group; written, not run on macOS or Linux | after a timeout (exit 124) no process of the command is left (`ps`) |
| the programs on macOS, in a live session | built and tested on Windows only; no live Claude Code session has run on the kit's settings | `setup.mjs --status`; `check-clone.mjs`; after your first helper start, an allow or deny line in each `.claude/logs/*.jsonl` |
| `--fetch` | run only with a stand-in for cargo; never against crates.io | the first `--apply --fetch` ends with "made:" lines and `--status` exits 0 |
| `--no-usage-tool` | the meter rule off, every other rule on | each `fanout-gate.jsonl` line says "meter rule off" |
| K12: a one-command job stays in the session; no middle helper | hypotheses (r57-0210, r57-0418); a fresh helper's 56-60 K is measured | `tokens.mjs`: a small helper's tokens against the job |
| K14: the brief's form; a return under 2 K tokens | hypotheses (r57-0208, r57-0421) | `tokens.mjs` per helper; the length of each return |
| K9: shell calls under 240 s | written, never piloted (t9-0102) | a helper request after a wait of over 5 minutes whose cache creation is near its whole window |
| the lean helper types | five tools only; saving not measured | `tokens.mjs` on a lean helper against an ordinary one on the same job |

## Designed, not built

| part | what building it takes |
|---|---|
| the effort check | an `effort` per kind in `.claude/hooks/tier-routes.json`, and in the tier hook a refusal of a start with no `effort` or one above its route: about 20 lines and test cases like the model's, plus a rule telling sessions to pass it. What a helper ran at shows only afterwards, in its transcript (`docs/program/harness-kit-2026-11-25/in/hooks-report.md`, "Effort"). Today no record says what an effort level costs or whether "overthinking" happens |
| how many run at once, computed | the width function of `parallel/DECISION-RULE-v2.md` (memory, processor, the check, each token window), as `parallel/research/BUILD-IN.md` sets out; `kit-count-gate` holds only the fixed 20 and declared widths |
| pacing a token window | re-planning against a usage reading (`parallel/research/a1-report.md`) |
| a model and effort per step | the router (`research-tree/build/ROUTER.md` on `bilal/build`): computed range 13-49 M of 986 M tokens |
| several writers inside one file | version-checked writes or claims below the file (`parallel/research/w1-report.md`) |
| the testing policy | a skip of unchanged passes keyed by file hash in `check.mjs` (designed: 5 suite runs instead of 17) |
| a helper kept to its files | a hook mapping a helper to its unit and a files list per unit |
| a unit that ends at its cap and resumes | a checkpoint-and-end step and a resume from it (decision 5 of the rule) |
| removing a landed unit's copy | a fifth verb in `unit.mjs`; until then the two git commands in speed-up 1 |

## What is proven and what is not

| standing | what |
|---|---|
| Measured gain, on the owner's PC | tests side by side and in shards (r57-0159, hc1-0100); 7 writers at once in place of 3 (r57-0128); helper roles' token costs (r57-0173, r58-0102, hc1-0110); meter weights per model (r57-0175); the hand-over point (r57-0171); the programs 3 to 7 times faster per call than the JavaScript hooks (clean-clone check, 2026-11-25) |
| Works in use, no gain measured | the JavaScript hooks on the owner's PC: tier hook (r57-0120), window ceiling (t8-0107), fan-out gate (t8-0110), count gate (t8-0109), creep gate (r57-0063); the programs pass the same test files |
| Built and tested, never used for real | kit mode of every hook; the programs; `unit.mjs`, `check.mjs`; the set-up on any machine but this one |
| Designed, never run | the table above; the effort levels per tier (r57-0207) |
| Tested, null in the form tried | graph store of code facts; embeddings; narrow done-gates; a shared library of earlier results (`RESULTS.md` section 4) |

No record measures a gain on tokens, time or quality from any hook: their tests and live refusals are recorded, a
before-and-after run of the work they guard is not. Every figure may differ on your machine.

## macOS

Nothing was built for or run on a Mac: the programs were built and tested on Windows only. The code has no path that
works only on Windows (`.exe` is added on Windows alone; the clean-clone check uses `/bin/sh` elsewhere). The places
most likely to need a change there:

1. **Rust.** `rustup` with 1.100.0; the first `--apply --fetch` fetches the 15 crates. If rustup is missing the pinned
   toolchain, the set-up prints the `rustup toolchain install 1.100.0 ...` line to run.
2. **Folders reached through a link.** On macOS `/tmp` is `/private/tmp`. The programs take `--clone=` as given, not as
   its real path, where the JavaScript took the real path; the window ceiling and creep gate compare real paths of the
   project. Keep the clone and your repository in plain folders under your home folder.
3. **The queue's timeout** ends the command's process group off Windows: written, not run there (`research-tree/tools/lane.mjs`).
4. **Transcripts.** `tokens.mjs` and `kit-count-gate --status` look under `~/.claude/projects/` (or `$CLAUDE_CONFIG_DIR`),
   trying both the path as given and its real path. Not run on a Mac. `kit-tokens --basis` dates its entry with
   `date +%Y-%m-%d`, run on Windows only.
5. **pytest.** `kit.json` calls `python3 -m pytest`; check that this runs your tests from your repository's top.
6. **Case of paths.** Paths are compared without case on Windows and macOS, as the JavaScript did.

## What does not carry to another machine

- The record book (`library/`) is not on `main`; `bash library/lookup.sh` works only on `bilal/build`. The records the
  kit's limits rest on are copied into `harness-kit/basis.json`.
- A route that names Fable (orchestrate-deep, design) needs access to Fable.
- The queue's 4 slots were set on the owner's PC; set yours from `check.mjs --measure`.
- On `bilal/build` the shared `.claude/settings.json` names the owner's hooks by his PC's path; the kit writes your own
  path into `.claude/settings.local.json` instead.
- `--status` reports a program OLDER than its sources after a pull; nothing rebuilds it until `--apply` runs again.

## Where everything is

| what | where |
|---|---|
| This kit | `harness-kit/`: `README.md`, `RULES.md` (loaded by every session), `ORCHESTRATION.md`, `RESULTS.md`, `COVERAGE.md` |
| Every item of the method and what holds it | `harness-kit/COVERAGE.md`: 280 rows, each with one of eight marks |
| Set-up and its check | `harness-kit/setup.mjs`, `setup.test.mjs`, `check-clone.mjs` |
| The hook programs | `harness-kit/rust/` (`crates/kit-*`, `DESIGN.md`); built into `harness-kit/rust/target/release/` |
| The JavaScript hooks (reference) and the routes | `.claude/hooks/` with their `.test.mjs`; `.claude/hooks/tier-routes.json`; `harness-kit/hooks/kit-start.mjs` |
| Parallel work | `harness-kit/parallel/`: `unit.mjs`, `check.mjs`, `kit.example.json`, `SPEEDUPS.md`, `DECISION-RULE-v2.md`, `research/` |
| The queue | `research-tree/tools/lane.mjs` |
| Token counter and measured costs | `harness-kit/tokens.mjs`, `harness-kit/basis.json` (`basis.build.mjs` rebuilds it) |
| Helper types | `.claude/agents/lean-*.md` (the `fixflow-*` files are archived) |
| How this kit was built | `docs/program/harness-kit-2026-11-25/` (the owner's words, the contract, each builder's report) |
| The record book | `library/` on `bilal/build`: `library/INDEX.md`; a record with `bash library/lookup.sh -f <id>` |
| Who has what | `OWNERS.json`; "Branches and owners" in the root `CLAUDE.md` on `bilal/build` |

Branches: the kit is on Bilal's line `bilal/build` and reaches `main` by pull request. If `harness-kit/` is not on
`main` yet, read it on `bilal/build`. `main` changes only by pull request, and each person merges only their own.
Eashah's branches are `work/*` and `eashah/*`; sessions on Bilal's PC never push to or edit them.
