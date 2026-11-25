# Harness kit

A way of running Claude Code sessions that start helpers, so that each helper runs on the model its job needs, under a
token limit taken from measured costs, and the coordinating session hands over before its window grows dear.
It holds the rules (`ORCHESTRATION.md`), the measurements behind them (`RESULTS.md`) and a script that wires three hooks.

## What it gives you, as measured

All figures are from one repository on Bilal's PC (Windows 11, 12 cores, 31 GB) in November 2026, mostly one trial.

- **Tests side by side**: the research tree's test suite went from 596 s to 120.4 s with files run 8 at once and the
  longest file split in 4 shards (r57-0159). One set of runs; more than 4 heavy runs at once was not measured.
- **The right model per job**: on the weekly meter a fresh Sonnet token weighed 0.15-0.5 of an Opus token, Haiku
  0.15-0.8, Fable 2.7-5.6 (r57-0175, one week of readings). Whether the smaller model gives the same output on a given
  job is not measured.
- **Limits from measured costs**: the build planned by guess used 907.7 M tokens, 2.3 times its plan (r57-0170); the
  measured cost of each helper role is now in `ORCHESTRATION.md` section 3, so a limit has a basis.
- **Waits under the cache's life**: in the replays, helpers that waited 5-10 minutes lost their cache 296 times, 46.2 M
  tokens, most after a shell call set to a 300 s timeout (t9-0102). The fix (calls under 240 s) is written, not piloted.

## Set-up

From `harness-kit/setup.mjs` and `harness-kit/check-clone.mjs` as they stood when this was written. Needs Node 20 or
later and git; nothing else is installed.

1. Clone the repository and open the clone's folder. Check that `node --version` shows 20 or later.
2. Run `node harness-kit/setup.mjs`. It prints what it would add and changes nothing.
3. Run `node harness-kit/setup.mjs --apply`. It adds three hooks to `.claude/settings.local.json`, this machine's own
   settings file, with this clone's path, each entry marked `--harness-kit`:
   - `window-ceiling`: a session or helper past its context line may only write its hand-over;
   - `tier-hook`: a helper or child session must name its kind of job and the model routed to it;
   - `creep-gate`: no review panels, reviews of reviews, or repair rounds on small findings.
   It never writes `.claude/settings.json`, never sets `core.hooksPath`, never edits `.gitignore`. If git does not
   ignore the settings file or `.claude/logs/`, it prints the line to add. A clone path holding `"`, `$`, a backquote
   or a backslash is refused; move the clone to a plain path.
4. Start a new Claude Code session in the clone; hooks load at session start.
5. To check a clean clone: `node harness-kit/check-clone.mjs`. It clones `bilal/promote-first` (what `main` will hold)
   into a temp folder, applies the setup there, runs each hook's tests and one passing and one refused call through the
   exact commands written, prints a table, and exits 1 if a kit hook failed.
6. To turn it off: `node harness-kit/setup.mjs --remove`. It takes out only the marked entries. Running `--apply`
   again, or after moving the clone, leaves one set with the right path.
7. Tell each session that starts helpers: "Read `harness-kit/ORCHESTRATION.md` before starting helpers."

## Day to day

1. **Kind first, then model.** Name the kind of job (locate, extract, read, collect, run, build, build-invariant,
   analyse, refute, orchestrate) at the front of the helper's description, use the helper type `lean-<kind>`, and pass
   the model on the call; the call's model beats the one in the agent file (r57-0108). Table: `ORCHESTRATION.md` 1.
2. **A small job stays in your session.** A fresh helper carries about 56-60 K tokens before any work (hc1-0104).
3. **A limit on every helper.** Put `token limit N M (expected about E M, basis <record>)` in the brief, E from the
   role table in `ORCHESTRATION.md` section 3. A Sonnet reader filling one table cost 0.6-0.9 M (r58-0102); an Opus
   refuter of a build unit 10.6 M (r57-0173).
4. **A cap for the job, the meter before each wave.** Agree a cap before the first wave. Read the usage meter in a
   message before the start, never in the same message (r57-0615).
5. **Briefs that point at files.** Goal, file paths, what is settled, one output file, a return under 2 K tokens.
   Long briefs filled helpers' windows to 200-270 K (r57-0184).
6. **Hand over before the window grows.** A build root cost about 0.24 M a call (r57-0173). Hand over through a state
   file near 250 K; the measured point for the build's roots was 247-273 K (r57-0171).
7. **Start together what can run together**, under 20 helpers at once, helpers of helpers counted (t8-0109).
8. **Shell calls under 240 s**; longer work in the background with a log (t9-0102).
9. **One review at most per deliverable**, and none of unchanged work (r57-0063).
10. **Effort: no advice.** What an effort level costs, or whether a lower one gives the same output, is not recorded;
    the levels per tier were designed and never run (r57-0207, r57-0421). No record holds "overthinking".

## What is proven and what is not

| standing | what |
|---|---|
| Measured gain | test files side by side and in shards (r57-0159, hc1-0100); helper roles' token costs (r57-0173, r58-0102); meter weights per model (r57-0175); hand-over point of a coordinator (r57-0171) |
| Works in use, no gain measured | tier hook refuses a start with no kind or a wrong model (r57-0120); window ceiling (t8-0107); fan-out gate (t8-0110); count gate (t8-0109); creep gate (r57-0063); owner guard (r58-0104) |
| Built or designed, never run | effort levels per tier (r57-0207); the router with a model and effort per step (r57-0421); the rule for how many helpers at once (r57-0414); a real run of the research tree (r57-0172) |
| Tested, null in the form tried | graph store of code facts; embeddings; narrow done-gates; a shared library of earlier results (`RESULTS.md` section 4) |

No record measures a gain on tokens, time or quality from any of the hooks. Their self-tests and live refusals are
recorded; a before-and-after run of the work they guard is not.

## What does not work on another machine yet

- Nothing in the records was measured on a machine other than Bilal's PC. Every number above may differ on yours.
- The setup was checked from a clean clone on Windows only. macOS and Linux were not run, and no live Claude Code
  session has yet run on the kit's settings: the hooks were fed their input through the commands the settings hold.
- The archived FixFlow skills and agents on `main`: `setup.mjs --apply` switches them off in your `.claude/settings.local.json`, and `--remove` brings them back.
- `tier-hook` has no test file of its own; `check-clone.mjs` runs ten sample calls through it instead.
- A route that names Fable needs access to Fable.
- `research-tree/tools/lane.mjs` runs on macOS and Linux as written, with one fault there: a timeout stops only the
  command it started, not the processes that command started.
- Two of Bilal's hooks are left out of the kit, for the reasons `check-clone.mjs` gives: `count-gate`, because its
  test file fails in a clean clone (two cases read files of his PC); `fanout-gate`, because it refuses ordinary
  starts there (every start needs a meter reading from the desktop app, every limit a record in the record book).
  So the limit line, the cap and the meter reading are habits on your machine, not checks.
- The record book (`library/`) is not on `main` (r58-0104), so `bash library/lookup.sh` works only on `bilal/build`.
- The queue's 4 slots for heavy test runs were set on his PC (r57-0159).
- On `bilal/build`, the shared `.claude/settings.json` names its hooks by his PC's path
  (`C:/Users/User/Documents/projects/harness-engineering/...`); the kit writes your own path into
  `.claude/settings.local.json` instead.

## On macOS (not run yet)

1. Run `node harness-kit/check-clone.mjs` first and read its table: every kit row should read ok, then a FixFlow line saying `--remove` left none.
2. Path quoting: `setup.mjs` (`quotedRoot`, `commandFor`) writes `node "<clone>/.claude/hooks/<hook>.mjs" --harness-kit`, which `/bin/sh` runs; it refuses a clone path holding `"`, `$`, a backtick or a backslash. Open `.claude/settings.local.json` and run one command by hand.
3. Symlinked folders: `window-ceiling.mjs` (`handoverPath`) and `creep-gate.mjs` (`norm`) compare paths as text against the clone's real path. A clone under a symlink (`/tmp` is `/private/tmp`) may not match the paths the app sends, so a hand-over write past the line may be refused.
4. Windows paths in the code: `window-ceiling.mjs` line 237 lets hand-over notes through only under `AppData/Local/Claude-data/.../side-session-notes`, a Windows folder. On a Mac, write the hand-over to `research-tree/build/<name>-STATE.md` instead.
5. `research-tree/tools/lane.mjs` lines 92 and 93: outside Windows, a timeout kills only the direct child (`child.kill('SIGKILL')`). Spawning it `detached: true` and killing `-child.pid` would stop the whole tree.

## Where everything is

| what | where |
|---|---|
| This kit | `harness-kit/`: `README.md`, `ORCHESTRATION.md`, `RESULTS.md`, `setup.mjs`, `setup.test.mjs`, `check-clone.mjs` |
| The hooks | `.claude/hooks/`, most with a `.test.mjs` beside them |
| The routes, kind to model | `.claude/hooks/tier-routes.json` |
| The helper types | `.claude/agents/lean-*.md` (the `fixflow-*` files are archived; switching them off is in the section above) |
| The record book | `library/` on `bilal/build`: board in `library/INDEX.md`; a record by id with `bash library/lookup.sh -f <id>` |
| Who has what | `OWNERS.json`; "Branches and owners" in the root `CLAUDE.md` on `bilal/build` |

Branches: the kit is on Bilal's line `bilal/build` and reaches `main` by pull request, as the hooks with their
tests, the lean helper types, the journal tool, the commit check and the lane and landing scripts did (r58-0104).
If `harness-kit/` is not on `main` yet, read it on `bilal/build`. `main` changes only by pull request, and each person
merges only their own. Eashah's branches are `work/*` and `eashah/*`; sessions on Bilal's PC never push to or edit them.
