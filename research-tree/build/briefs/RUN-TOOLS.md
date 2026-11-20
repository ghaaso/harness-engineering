# Brief: the research run's four scripts (helper of top session 5; kind build, Sonnet)

The owner approved a research run (r57-0046). Its helpers count tokens, wait and gate only through four small scripts
in `RUN:tools/` (`RUN:` = `C:/research-runs/2026-11-harness-leads/`; `H:` =
`C:/Users/User/Documents/projects/harness-engineering/`). Build them exactly as
`H:research-tree/build/briefs/RUN-INTERFACE.md` section "The scripts" and its `config.json` schema say (read the whole
file first). Two other helpers write the briefs that call them, at the same time; keep the command lines and the
printed lines exactly as the interface gives them. Plain Node (v24 is on the path), no packages, ES modules.

## Build
1. **`tokens.mjs`**: start from `H:research-tree/build/tools/tokens-self.mjs` (read it; same counting rule: input +
   cache creation + cache read + output, once per message id, assistant lines with usage only). The run's transcripts
   live under `C:/Users/User/.claude/projects/<the app's name for RUN:>/`: find that folder from the names of the
   folders there (the app turns `C:\Users\User\Documents\projects\harness-engineering` into
   `C--Users-User-Documents-projects-harness-engineering`; expect `C--research-runs-2026-11-harness-leads`, which does
   not exist yet), and take `--root <folder>` for tests. A helper's unit is the first word after `<kind>: ` in its
   `.meta.json` description. Find on disk where the transcripts of a helper's own helpers are written (look in the
   harness project folder for a session whose helpers had helpers; library records r57-0157 and r57-0158 describe such
   a probe) and count them under their own unit. `fresh` = input + cache creation + output. Test: on three sessions
   of the harness project folder, the totals equal `tokens-self.mjs`'s for the same helpers.
2. **`wait.mjs`**: refuses a time over 150 s; checks the files every 5 s; the limit printed is
   `run/config.json` `units[<unit>].limit_M`.
3. **`shuffle.mjs`**: removes arm names (R_same, same-window, writer, fresh, refuter, arm, and a header or file name
   that says which) and lines that tell the arms apart, keeps the review rows; random order from `node:crypto`; the key
   to `RUN:sealed/f<n>-arms.json`; never prints which is which.
4. **`gate.mjs`**: the rule in the interface. Protected later demand on a meter = its rate (`config.json`) x hours from
   now to that meter's next reset in `resets_utc`; points of a unit = its M tokens / `m_per_point_all` (all models),
   and for the Fable meter only the Fable units' tokens / `m_per_point_fable` (the coordinator is the only Fable unit;
   its expected stands as its reserve less its tokens so far). Running units: a `START` line in `run/usage.log` and no
   `RETURN.md` (fields) or `done_file` (others) yet. HOLD while `preparation_M` is `null`, and on an unreadable config.
   Every decision line names the numbers it compared.
5. Tests with `node:test` for each script (`tools/*.test.mjs`): the four cases of the gate (fits; holds on each meter;
   holds on the cap; null preparation) and a running unit's reserve; the shuffle leaves no arm word; wait's refusal
   and its timeout. A sample `config.json` for the tests in `tools/fixtures/`, never in `RUN:run/`.
6. **`tools/README.md`**: the four command lines and what each prints, in ten lines.

## Rules
Quiet: each script prints one line; the rest goes to a file under `RUN:run/`. Write only in `RUN:tools/` and scratch
files in `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/0fedf9f2-6bb0-4fa4-bcd6-133df5bb66ca/scratchpad/run-tools/`;
read the harness project's transcripts only to test (never copy their contents into `RUN:`). No web request, no
install, no commit, no command over 150 s. Start no helper.

## Tokens and return
Expected about 3.5 M, limit 6 M (ordinary code on Sonnet: 5.5 M for a larger unit, S2.1, n = 1). Your counter:
`node H:research-tree/build/tools/tokens-self.mjs "run tools"` every 10 calls from call 30. At the limit, write what
stands with "Left to do" in `tools/README.md` and return LIMIT. Return at most ten lines: the files, the tests (pass and
fail counts), where a helper's own helpers' transcripts live, anything against the interface, your token count.
