# Breaking faults in the harness kit (the one review, 2026-11-26)

Status: done. All seven items of the brief's list were worked through. Two breaking faults. After the list was written the builders' hand-backs under in/ were searched: neither fault is named there as a fault (method.md quotes the 400 K autoCompactWindow as the owner's figure; docs-report.md mentions --end only as an argument-order note).

Programs used: one `cargo build --release --offline --locked` of `harness-kit/rust/` into a temp target (21 s, exit 0);
every run below is of those built files, in temp folders, with `--harness-kit "--clone=<this repository>"
"--project=<temp folder>"`.

## 1. Breaking faults, worst first

### F1. The window ceiling holds no Opus session or helper on a machine without the owner's modelSettings

What breaks: `kit-window-ceiling` (and its JavaScript hook) takes a model's window only from
`modelSettings.<model>.autoCompactWindow` in `~/.claude/settings.json` or the project's settings, else from a family
table that holds only Fable and Sonnet. With no window, A = Infinity, so the checkpoint line is Infinity; only a
session named `kind orchestrate` still gets a line (W*). The owner's home settings hold
`"modelSettings":{"claude-opus-5-5":{"autoCompactWindow":400000}}`; nothing in the kit writes that or tells her to.

How shown: a 150-call Opus transcript (`claude-opus-5-5`) at 630 K context; an ordinary `Edit` of
`<project>/src/app.py`; kit mode; the built program:
- `WINDOW_CEILING_SETTINGS=<a file holding {}>` (her machine): exit 0, log
  `"ctx":630000,"warn":null,"line":null,"kind":"session","decision":"allow"`. The JavaScript hook: the same, exit 0.
- With the owner's home settings: exit 2, "context 630 K is past this session's line of 328 K".

Consequence: on her Mac every Opus helper (analyse, refute, build-invariant, orchestrate) and every Opus session not
named a coordinator runs past the line with nothing stopping it (the re-read window the kit exists to cut), while
README lines 111-112 ("without it a session gets the checkpoint line (about 330 K on Opus)"), RULES K7 ("A helper past
its line ...") and COVERAGE rows O53, S11, E9, E53, E61 (mark `hook`) say it is held. The clean-clone check cannot see
it: it runs on the owner's PC, under his home settings (its line "window-ceiling refuse: Bash ls at 360 K, past the
330 K line" passes there for that reason).

Smallest fix: a window for Opus (400 K, the owner's own setting) in `WINDOW_BY_FAMILY` of both the program and the
hook (Haiku too, for completeness), or `setup.mjs --apply` writing that `modelSettings` into the project's
`settings.local.json` and `--status` checking it.

File and line: `.claude/hooks/window-ceiling.mjs` 94 and 174-186; `harness-kit/rust/crates/kit-window-ceiling/src/limits.rs`
24 and 120-145; `harness-kit/README.md` 111-112.

### F2. Under a cap, a helper killed by an app restart blocks every later start, and the kit names no way out

What breaks: the fan-out gate reserves the unused limit of every helper whose meta has no `"finished": true`, with no
expiry; only a hand-written end in `<project>/.claude/logs/count-gate.jsonl` releases it. The count gate drops the
same helper after 10.8 min of silence, so the two gates disagree. The command that writes the end in kit mode
(`kit-count-gate --end <id> <why> --harness-kit "--clone=..." "--project=..."`) appears nowhere in README, RULES or
ORCHESTRATION (grep for `--end`: no hit); the fan-out refusal says only "wait for a helper to end, or ask the owner with
cap:", and the count gate's own text points at `node .claude/hooks/count-gate.mjs --end`, a path that does not exist
in her repository and, run from the clone without the kit arguments, writes to the clone's log, not hers.

How shown: state file `Session bbbb2222, kind orchestrate` / `Cap 30 M tokens`; the session's transcript holds one
`Agent` start with `token limit 20 M (expected about 12 M, basis r57-0173)`; its helper's meta has no `finished` and
its files are 5 h old (as after an app restart). A new start with a 12 M limit, `--no-usage-tool`:
- `kit-fanout-gate`: exit 2, "spent 0.0 M + the rest of 1 running helpers' limits 20.0 M + this limit 12.0 M = 32.0 M,
  past the cap of 30.0 M"; the JavaScript hook: the same.
- `kit-count-gate` on the same input: exit 0 (the helper is not counted as running).
- After `kit-count-gate --end a1 killed by restart --harness-kit --clone=... --project=...`: the fan-out gate exits 0.

Consequence: after any app restart that kills running helpers (it happened on the owner's PC, r57-0118), her job is
refused every further start until she raises the cap by hand or finds an undocumented command; the refusal tells her
to wait for something that will never happen.

Smallest fix: in kit mode, name the kit form of `--end` in the fan-out gate's cap refusal and the count gate's text
(the program path and the kit arguments), and add it to README's table row for `kit-count-gate` and RULES K3; or let
the fan-out gate drop a reservation after the count gate's T_QUIET of silence.

File and line: `.claude/hooks/fanout-gate.mjs` 276-283 and 343; `harness-kit/rust/crates/kit-fanout-gate/src/cap.rs`
(the same reservation) and `main.rs` 302-311; `.claude/hooks/count-gate.mjs` 181; `kit-count-gate/src/main.rs` 531;
`harness-kit/README.md` lines 96-97.

## 2. Checked and sound

- Rust against JavaScript on real input: 250 real `Agent` starts from the 40 latest session transcripts of this
  repository, replayed through `kit-fanout-gate` and `fanout-gate.mjs` in kit mode at each start's own time, under a
  state file with a 40 M cap and a meter line: 250 of 250 same exit and same text (allows, meter refusals, basis
  refusals, cap refusals among them).
- The same for `kit-creep-gate`: 150 of 150 same (allows, "another review is still running", review-of-a-review, repair
  round refusals among them).
- The same for `kit-window-ceiling`: 612 calls (main sessions as coordinator and not, helpers; Edit, Write to
  `.harness/briefs/`, `git commit`) over 60 real transcripts: 612 of 612 same (575 pass, 37 refused).
- Fan-out gate kit mode: a basis from `harness-kit/basis.json` and one written by `tokens.mjs --basis` (own-0001) both
  accepted; the cap sum, the `--no-usage-tool` note and the manual end all as the hook says.
- Count gate `--status` and `--end` with the kit arguments after them: the program and the hook give the same output;
  `--end` lands in the project's log and is read by the fan-out gate.
- Set-up (in a temp copy of the clone, cargo replaced by a stand-in that copies the built files): her own
  `settings.local.json` (her hooks under PreToolUse and Stop, permissions, env, skillOverrides) kept through `--apply`,
  a second `--apply`, `--status` (exit 0), and `--remove` gives back the same JSON; a second project with
  `--no-usage-tool` and the clone as project (13 skills and 12 agents switched off, removed again) both hold.
- `unit.mjs` in a temp repository with node tests: a landing that passes; one whose check fails (undone, `build` back at
  its pre-merge commit, exit 1); a conflict (merge aborted, exit 2); a second `land` while one runs (exit 64, nothing
  touched); the first lander killed (taskkill) after its merge and before its line: the next `land` broke the stale
  lock, re-checked the orphan merge, wrote its line, then landed its own unit. `report` counts all of it correctly.
- README speed-up commands run as written: `check.mjs` (pass, exit 0), `lane.mjs ... -- <command>` (exit 0), the lane's
  timeout (exit 124).
- `tokens.mjs` and `kit-tokens` on a project's transcripts (through `CLAUDE_CONFIG_DIR`): same table, session id
  printed as RULES K3 says.
- RULES.md K1-K22 against the routes file, basis.json and the hooks: no rule claims a refusal that no hook makes (apart from K7 under F1).
- `kit-start`: puts the clone's path, the whole of RULES.md (6,737 characters, under the 9,000 cut) and the state file
  names into the session.
- COVERAGE.md: the 61 `hook` and `command` rows read; every named program or command exists and does what its row says,
  except the window-ceiling rows named under F1 (on her machine, for Opus) and the cap rows E8, O37, O78 as far as F2
  goes.
- The tier hook's child-session check accepts a folder wired by the kit (`kit-tier-hook` in its settings), so the
  JavaScript hook's `tier-hook.mjs` test does not bite in kit mode.

## 3. Could not settle

- Whether the usage tool's answer on her plan has a window labelled "All models": if not, the meter rule refuses every
  start until she re-applies with `--no-usage-tool` (the gate reads only `plan.windows[].label` /all models/).
- macOS: the build on rustup with 1.100.0 and the queue's process-group timeout were not run; the code has no
  Windows-only call outside `cfg!(windows)` branches.

## 4. Not breaking, not to be fixed now

- A clone of `bilal/build` used as the project carries the shared `.claude/settings.json`, whose hooks run
  `node "C:/Users/User/..."`: on her Mac each fails with exit 1 (non-blocking) on every matching call; noise only.
- `main` still holds the older, JavaScript-only kit until the pull request lands; a clone of the default branch finds
  no `harness-kit/rust/` and `--apply` stops with "not found".
- `--status` compares file times, so a change to a crate's `Cargo.toml` that cargo does not rebuild for leaves
  "OLDER" showing after `--apply`.
- `kit.json`'s default `landing_branch` is `build`: in a repository that already has a branch of that name, units start
  from it and land on it without a word.
