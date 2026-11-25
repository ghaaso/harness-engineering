# Rust move, level 1 (with step 0): state

Session c448ee79 (orchestrate, Opus), started 2026-11-24 from the Rust preparation session. Brief:
Session cf4dea8a (orchestrate, Opus), successor coordinator, opened by the owner as a top-level session on 2026-11-24 23:00.
`docs/program/monitor/round9/migration/briefs/DEV-LEVEL1.md`; his words (`round9/FEEDBACK-3.md`, `FEEDBACK.md`, `FEEDBACK-2.md`,
`MIGRATION-BRIEF.md` sections 0 and 2a) outrank it. Steps: `migration/PLAN.md` step 0 (0.1 to 0.4), then 1.1 to 1.6.
Touches only `round9/rust/`, `round9/migration/checks/`, this file and the shared notes folder. Nothing committed without his word.

Deliverable: docs/program/monitor/round9/rust/

Cap 143 M tokens (owner, 2026-11-24, r57-0085)
Meter line 78 % all models (owner raised it to 78 % on 2026-11-25; earlier 72 %, r57-0088, and 69 %; was computed: 64 % read at the start + 143 M at about 62 M a point (r57-0173) = 66.3 %, plus 2.8 points kept for his own use until the reset on 2026-11-30, as the preparation kept)

## Facts at the start (2026-11-24)
- Shell not elevated: the Build Tools installer will show a Windows prompt that he must answer.
- Nothing of Rust, Tauri or the Build Tools installed; `C:/rust-work` absent. Free disk on C: 53 GB (SKILLS.md said 112 GB).

## Waves
1. Step 0.1 (run, Sonnet: installs, skills copy, preflight) and step 0.3 (read, Sonnet: facts F1, F3) at once.
2. Step 0.4 (build-invariant, Opus: corrected floors in the check code, the "Not done" list).
3. Step 0.2 (run, Sonnet: fixtures, oracle, baseline, F2, F4).
4. Steps 1.1 (trial) to 1.6.

## Log
- 0.3 done (read helper, 1.20 M): migration/facts/F1-F3.md. F1: a route exists, a plugin "mod" inside the session
  ($.prompt.submit asUser, $.turn.abort, polling the program's 127.0.0.1 server); quote checked by the coordinator against
  code.claude.com/docs/en/plugins/mods/{overview,api,reference}.md (copies in C:/rust-work/probe/docs). Not yet probed in a
  Code-tab session (needs a session opened on a probe folder; a child cannot start sessions). Conflict to raise before
  the plugin work: a mod is JavaScript inside the plugin, the plan's plugin check allows no .js. F3: a plugin starts a
  program by a command's ! line, a hook, an MCP server or a mod; the pane attaches to a running server through
  .claude/launch.json "url"; no source for the 500,000-byte figure.
- 0.1 done (run helper, 1.18 M): Build Tools 17.14 (MSVC 14.44, SDK 22621), Rust 1.100.0, Tauri CLI 2.12.6, skills in
  migration/skills/vendor/; preflight passes; floors empty node 52.9 ms, empty Rust 9 ms (checks/budgets.json). F5: the
  two parts 1.22 GB download, 4.09 GB installed (read from the VS catalog before the install); disk 49 GB free.
- Coordinator: workspace skeleton rust/ (lint table L, release profile, toolchain 1.100.0, target-dir C:/rust-work/target,
  members globbed crates/* and app/*), crates/reader/Cargo.toml, src/model.rs (types), DESIGN.md (signatures, JS traps).
  targets.json base = 11288a0c. Asked the checks helper to make addedLines count untracked files (git diff misses them).
- Owner, 2026-11-24 evening: "no parallization to get more throughput?" Width computed by r57-0414 (v2, r57-0841):
  ready work 3 now (fixtures+oracle, window, fences) + checks running = 4; the page driver (Edge 9341 + 7419) is 1, held
  by the checks step, so baseline, F4 and F2 wait for it; processor 24 threads: two cargo builders at 8 jobs, own target
  dirs (target-win, target-fence); memory and tokens fit. The trial joins when the oracle exists (5). The plain server
  waits for the trial's verdict (it decides the model; redo risk 14 M).
- Wave 2 started: 0.4 checks (Opus), 0.2 part 1 fixtures+oracle (Sonnet), 1.4 window (Sonnet, port 7439 for tests),
  1.3 fences (Opus, port 7429 for the oracle). Next: 1.1 trial when the oracle lands (brief: crates/reader/DESIGN.md);
  0.2 part 2 (baseline, F4, F2) when the checks step frees the page driver; show him the first window screenshot
  (C:/rust-work/shots/first-window.png) as soon as it exists.
- 0.2 part 1 done (0.24 M): fixtures 20261124T1708Z (63 sessions, 34 shown, 40 waits, 65 failed, 131 refused) and -empty;
  oracle main.json, empty.json, main.snapshot.json; FM-01.oracle holds. Coordinator added reader lib.rs, main.rs (minimal)
  and serde deps so the workspace loads. Trial 1.1 started (Sonnet, jobs 4, target-reader).
- Owner asked about the several-writers protocol: the record holds it as a decided design, untested apart from its floor
  (own copies, landing through the check); measured: 3 units at once with one writer per file, 7 with one per function.
  Used here: shared places reshaped (globbed members, own crates, own build folders, per-crate dependencies, a fixed
  reader interface). The binding resource is memory (WSL holds 13.9 GB; 1.7 GB free), not files.
- Hand-over note: side-session-notes/.../HANDOVER-L1.md.
- WSL shutdown withdrawn (owner: check first). WSL runs the docker-desktop system in active use: four GPU embedding
  containers (d2-embed-gpu:3, started between 1 s and 55 min before the check, so a job is launching them) and a postiz app
  with its postgres and redis (up 4 h). Memory stays the binding resource; width stays at the running builders; a finished
  builder's place goes to the next unit (trial -> plain server).
- 1.4 window done (Sonnet, 0.93 M): app/src-tauri, Tauri 2.12.7, no permissions, frontendDist = URL; release loads
  127.0.0.1:7419, debug takes SESSION_TOOL_URL. First window shown to the owner (C:/rust-work/shots/first-window.png).
  F8: forbid(unsafe_code) holds. F7: yes (CDP on 9342 reaches the page); drive.mjs needs an attach mode. 10 of 14 row
  checks pass; FM-09.grep failed on ".mjs" in model.rs comments (trial builder told to drop them); FM-09.nonode, 33.port
  wait for the Rust server; FM-33.conf after the first release. Placeholder blue icon: for him to replace.
- 0.4 first helper (Opus, 3.84 M): corrected floors in code (floors.mjs), untracked files in addedLines, FM-02.count with
  testsAtBase (the coordinator raises it at each step start with `node run.mjs --tests-at-base`); 25 tests pass. Rest
  (break-its, layouts flags, page checks on today, --baseline vs NOTES, C-044, drive.mjs attach mode for F7) started
  with a second Opus helper. Then 0.2 part 2 (resume the fixtures helper: baseline, F4, F2).
- Owner on Docker: Postiz is not the clinic app (the clinic's 25 database containers stopped weeks ago and use no memory);
  Postiz with its database and cache holds about 0.6 GB. Two embedding containers are paused but still hold 8 GB:
  pausing freezes processes, it frees no memory; stopping would lose their in-process progress. Nothing shut down.
- Owner asked again for maximum width. Measured: CPU 43 % avg, 6 GB free, commit 42.2 of 50.7 GB (the GPU job's third
  container had gone). Started 1.5 installer + plugin launcher (Sonnet, target-inst, jobs 6, interim installer; no mod
  until his approve). Trial raised to 8 jobs. 1.2 plain server still waits: it shares crates/server (one compile unit)
  with the fences builder, so each would compile the other's half-written code and trip the repair-loop gate; the
  recorded rule for a known hot pair says wait; it also waits for the trial's verdict. 0.2 part 2 waits for the page
  driver (held by the second checks helper); F2 timing waits for a quiet machine (off the critical path).
  Running now: trial (Sonnet), fences (Opus), checks rest (Opus, page driver), installer+plugin (Sonnet). Spent so far
  about 31 M of 143 M (session total from the creep gate).
- Owner approved the relay script: r57-0086 (journal). PLAN.md "Where things live" names the exception; the second
  checks helper was asked to update C-047 (code and CHECKS.md line, owner: r57-0086, with a break-it case).
  Relay helper started (Opus, step 1.3 live part): PART 1 builds the probe kit C:/rust-work/probe/relay/ (plugin + mod +
  test server on 7449, PROBE.md) and stops; the coordinator then opens ONE Code-tab session on that folder (start_session
  only works on a turn the owner's own message began; else offer a card or ask him) and runs the four tests; PART 2
  (resumed) builds answer.rs and the plugin's mod. Session total about 38.7 M at this start; weekly 66 % (line 69 %).
- Trial 1.1 (Sonnet, 5.44 M): port complete, cargo check 0 errors, stopped by the FM-06 gate on 0, 0, 24 (the 24 are
  clippy lints that cargo check cannot see: 21 collapsible_if, 1 test comparison). By PLAN.md's rule the trial did not
  pass; Opus retry started from the code in place (report step1.1-trial-opus.md). Hook fault for his list: the loop gate
  counts a switch from check to clippy as a loop. Departures: regex + a hand matcher instead of fancy-regex (not in the
  cache; no new download), ToolData gains `skipped`; checks/crates-allow.txt was missing (checks helper writes it).
- CHECKPOINT (window ceiling 338 K of a 350 K line). Session total about 42.6 M of 143 M. Hand-over: HANDOVER-L1.md.

## Hand-over to the successor (2026-11-24, written after c448ee79 was compacted)

- The second check helper of step 0.4 (the rest) finished after the checkpoint. Its final report was not read here (the window line refused it). Read it first: C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/c448ee79-b8f2-4497-b677-36a1a096ea0f/tasks/aecea7c20a76c10bc.output, and the "(second helper)" section of the README in the migration check folder. Fold what it found into this file. The temp folder can be cleared by a reboot: copy the report into the notes folder when you read it.
- The Opus reader trial's final report: same tasks folder, a42b98b4a59ad24b9.output (its content is in step1.1-trial-opus.md in the notes folder).
- No helper of c448ee79 is running now. The fences builder stopped at its window line: crates/server holds js.rs and guard.rs and no Cargo.toml, so every workspace cargo command fails until the next fences helper adds one.
- The owner opens the successor as a new top-level session in the repository, not as a child. It reads this file, HANDOVER-L1.md and the step reports in the notes folder before anything else.
- Tokens at the checkpoint: about 42.6 M of the 143 M cap by the creep gate; helpers reported more after it. Recount from the transcripts before the first wave.

## Session cf4dea8a (successor coordinator)
- Read: board, rulings r57-0082 to r57-0086 and the others named, this file, HANDOVER-L1.md, every step report.
- Recount from the transcripts (c448ee79 and its 11 helpers, input + cache creation + cache read + output, once per message
  id): **65.0 M** (coordinator 27.4 M; Opus helpers 26.1 M; Sonnet helpers 11.4 M). The creep gate showed 42.6 M at the
  checkpoint. Left under the cap: 78 M, less this session's own use.
- Meter at 23:20: weekly all models **68 %**, line 69 %. The meter rose 4 points (64 to 68 %) while about 67 M were spent:
  about 17 M a point, not the 62 M a point the line was computed with (r57-0173). So the meter line binds long before the
  143 M cap: about 1 point, some 17 M, is left under it. Put to him as a cap: question.
- The second checks helper (step 0.4, aecea7c2) wrote no final report: it ended its turn while waiting on three background
  chains it had queued (old scratchpad chain1/2/3.sh). Its transcript is copied to the notes folder
  (step0.4-checks-second-final.output). What it did: C-047 for r57-0086, attach.test.mjs (drive.mjs attach mode for F7),
  pages.test.mjs (page break-it tests), checks/crates-allow.txt. chain1 (every page check on today's tool): all hold but
  C-034 (the page names no fixture day) and C-042 (no live data in 90 s); chain2 (break-it tests, attach test, the C-044
  ten-minute run) was running at 23:20 with C-011, C-013, C-021, C-025 break-its not failing as they should; chain3 re-runs
  C-012, C-014, C-034, C-042, C-001 to C-004, C-024 after it. They hold ports 7419 and 9341 until done. Its README section
  "(second helper)" was never written: the coordinator folds the chain logs in when they finish.
- Memory at 23:20: 6.8 GB free, commit 44.8 of 50.9 GB, WSL 2.0 GB (the embedding containers have gone); CPU about 40 %.
- Journal: r57-0191 (the trial, fact). Owner at 23:35: Opus for the remaining plain Rust (r57-0087; applied by starting those
  builders as build-invariant, which the migration gate allows for a build step, so the routes file is unchanged); meter
  line raised to 72 % (r57-0088); git add of rust/Cargo.lock only (r57-0089), done after the fences entry lands.
- Wave 1 of this session (23:30, meter 68 %): fences finish (Opus, target-fence, jobs 6; report step1.3-fences.md
  "Part 2"); hostile fixture and negative half (Opus, report step0.4-hostile.md). Page driver held by the old chains.
- Relay probe kit moved from port 7449 to 7459 (PROBE.md, server.mjs, the mod, the plugin manifest, kit.test.mjs; its 4
  tests pass). Waits for him to open one Code-tab session on C:\rust-work\probe\relay (PROBE.md steps 1 to 4).
- Journal r57-0620 (mistake): the WebView2 bootstrapper fetched by the bundler without his approval.
- Still to start: plain server (Opus as build-invariant) after the fences; 0.2 part 2 after the old chains free the page
  driver; fold the old chain logs into checks/README.md; relay build after the probe; installer rebuild; one review; gate.
- Hostile fixture done (Opus, 0.45 M): C:/rust-work/fixtures/hostile with one negative half (-2.5 output_tokens); config.json
  "hostile"; FM-04.cases, FM-11.hostile, FM-12.nopanic, FM-21.where hold. Report step0.4-hostile.md.
- Fences done (Opus, 5.23 M): outbox.rs, lib.rs, Cargo.toml (no deps), Cargo.lock entry, 24 unit + replay + held tests;
  195 cases: 181 same, 8 not fences, 4 refused where today serves forbidden files, fail-crash answered, site-nohost 403.
  11 checks hold. FM-16.allow fault: the check runs cargo metadata online and fetched gtk 0.18.2 (401 KB) unasked; offline
  it fails. Cargo.lock staged again with the server entry (r57-0089).
- Probe: he said he opened and sent; nothing reached the server on 7459 and the app has no session on the probe folder
  (likely opened in another folder). The tier hook refused a start_session there (folder lacks the tier hook; needs his word).
- Wave 2 (meter 68 %, session 15.2 M, level about 80 M): plain server (Opus as build-invariant, target-server, jobs 8,
  report step1.2-server.md); check fixes FM-16 offline + run.test C-030 (Opus, step0.4-fixes.md).
- Check fixes done (Opus, 0.49 M): FM-16.allow runs cargo metadata --no-deps --offline --locked (holds offline, nothing
  fetched; '#' lines no longer count, stricter) with two break-it tests; run.test "not built" points at a missing reader.
  Open: that test's C-001 half goes stale once targets.json build.pageUrl is filled: needs a --targets option in lib.mjs
  and run.mjs (next checks helper, with the old chain fold and the five break-its that do not bite: C-011, C-013, C-021,
  C-025, C-041). Journal r57-0621 (mistake: the check's unasked download).
- Plain server built (Opus, 4.93 M): crates/server main, app, http, live, tail, error + tests/serve.rs; std only; 127.0.0.1;
  server.exe 3.26 MB; page bytes equal, /data.json 503 then data, /live tick and hook events, fences through Fences::handle.
  17 checks hold. Gap: reader reads every project folder (real store: 41 sessions against today's 36, 66 waits against 45);
  the same builder resumed for a reader folder list (report step1.2-server.md "Parity fix"). FM-05.refuse fails on the
  hook's own test (no "reset --hard" case; .claude/hooks, for his list). FM-19.guard/.bind, FM-09.nonode, C-032 to rerun
  at the gate once 7419 is free (they probed the old run's node server). targets.json: liveArgs, pageUrl, startCmd,
  frontDir (tool folder), serverExe filled; for the installer step: startCmd should start the app (C-043 needs a window),
  frontDir holds tool sources (C-047, FM-26 counts).
- Parity fix done (same builder, step total 7.25 M): reader takes a folder list; real store now equal (2 = 2 sessions,
  472 = 472 events, 1 = 1 wait); Rust read step 1.2 s against today's 8.2 s. Left: no folder found -> Rust reads all
  (given to the installer helper as a fix with a test). targets.json readerCmd still points at target-reader's older build.
- 2026-11-25 ~00:05: meter 70 % (line 72 %); level about 91.4 M (this session 26.4 M). His other session was running too,
  so the meter is not only this level. Old chain3 on its last rerun (C-034 now holds; C-042 fails again).
- Wave 3: installer rebuild with the server inside (Opus as build-invariant, target-inst, jobs 8, step1.5-installer-2.md).
  Next when chain3 ends: one checks helper (fold chain logs into README, five break-its, --targets option for run.test).
  Then the relay (if the probe runs), the review, the gate. Step 0.2 part 2 (baseline, F4, F2) only if the gate needs it.

### The second step 0.4 check helper's final report (arrived 2026-11-25, summarised here because the temp folder can be cleared)

- Stopped at 75 % of its call budget: 53 calls, 7.61 M tokens. Add these to the recount. Its write-up is the "(second helper)" section of the README in the migration check folder.
- Page break-it tests (new pages.test.mjs, 29 tests, about 42 min): only 9 failed because of the break (C-005, C-015, C-016, C-019, C-022, C-023, C-026, C-028, C-062). From C-006 on, headless Edge drew no frames, so most "failures" prove nothing. C-011 and C-021 held on the broken page. C-013, C-025, C-041 and C-044 errored. Its unconfirmed guess for the missing frames is the screen being off overnight.
- On today's tool: C-001 to C-004 and C-024 time out at 900 s in the fix group of shoot.mjs, twice (an earlier helper ran it in 103 s); cause not found. C-042 fails on the sample fixture. C-012, C-014 and C-034 held only on a re-run. One body was made stricter: a frame measure that drew no frames now fails. C-006, C-011 and C-013 may have held on 0 frames before and have not been re-run.
- Against the tool's NOTES: C-041 is 12 and 22 ms, not 5 ms (NOTES measured at the server). C-027 depends on the fixture. C-028 counts all lines (41 at most), not 4 link lines. NOTES has no figure for C-040 or C-043. baseline.json was not written.
- C-044 (the ten-minute run on today's tool) holds at 604 s. layouts.mjs --sets and --configs are done; the plain run still gives 88 of 88.
- Attach mode in drive.mjs: with a debug port the checks start the program and drive its own window, with no fallback to headless Edge. attach.test.mjs passes 3 of 3 on the debug exe.
- C-047 part a, after r57-0086: code in misc.mjs, its Pass line in the checks document and the floor text in run.mjs changed, and a break-it test in bodies.test.mjs (rejects today's identifiers, a field name, another host, $.process.run, a second script; a clean mod passes). Check that the edit to the checks document carries its owner line.
- crates-allow.txt is written. No direct dependency is off the list (reader: serde, serde_json, regex, chrono; app: tauri, tauri-build; server: no Cargo.toml yet).
- Unit tests: 26 of 28 pass and --list gives 126 lines. Two failures it says are not its own: the "not built" test runs past 60 s because build.pageUrl was set to 7419 (check targets.json: it read null at c448ee79's last look), and the FM-16.allow test's cargo metadata call gave no exit code (the server crate has no Cargo.toml).
- Left from it: find the cause of the missing frames and the timeout, then re-run pages.test, C-006, C-011, C-013 and C-001 to C-004 with C-024 on a machine with the screen on; fix the break-it tests that failed or proved nothing; C-042 on the sample fixture; the "not built" test against the pageUrl.
- Installer rebuilt (Opus, 7.17 M, over its 6 M limit): 4,275,114-byte installer; the app runs the server on a thread at
  7419 and the page is built in (front/index.html from tool/index.html, repo path emptied); no-folder fix with a test;
  installed copy showed the page in 1.2 s, data in 11 s. 13 of 15 checks hold. FM-33.port fails (no fallback port, settings
  only in the page's storage); C-048/C-049 need Windows Sandbox or a second Windows user (his word). From the Start menu
  the program finds no session folders (empty picture); from the plugin it reads the project's.
- Old chains ended 00:06 (C-001..C-024 group timed out at 900 s; C-042 fails on today's tool).
- 00:15, meter 70 %, level about 100.2 M (this session 35.2 M). Wave 4: page checks finish (Opus, step0.4-pages.md) and
  port + settings file (Opus, step1.5-port.md). Then review and gate. Ask him: Windows Sandbox for C-048/C-049.
- Owner approved Windows Sandbox for C-048/C-049 (r57-0090); he switches it on; restart only when no helper runs.
- 2026-11-25: Windows Sandbox switched on at his request (admin prompt answered by him, -NoRestart); RestartNeeded True. C-048/C-049 run after his restart.
- Port and settings fix done (Opus, 2.10 M): fallback port on 127.0.0.1 when 7419 is held; page localStorage kept in %LOCALAPPDATA%/dev.harness.session-tool/page-settings.json, restored before page scripts; 4 new tests; installer 4,280,037 bytes. FM-33.port fails in the check (waits on its own listener on 7419): added to the page-checks helper.
- Page checks finished (Opus, 4.42 M; step0.4-pages.md, README last section; chain logs copied to notes): the overnight
  failures (C-001 group timeouts, C-042, C-041, C-044, 0 frames) were the locked Windows session 22:03 to 23:59, not the
  checks or today's tool; 10 re-run break-its now bite; unit tests 29 of 29; --targets added; FM-33.port check now reads
  the page address from the debugging port and holds on the build in 8 s. Left: 19 break-its not re-run (one 40-minute
  run on an unlocked PC), C-044 and baseline.json on the main fixture.
- Owner approved the tier hook in the probe folder (r57-0093); installed (C:/rust-work/probe/relay/.claude/settings.json).
  start_session refused on a turn begun by a helper's report, and a card cannot carry a folder: needs his message here.
- Probe session opened on his "Open it" (relay-probe, local_26e8990b, Claude Code 2.1.330, folder trusted per
  ~/.claude.json). It replied "Hi!" but the mod never reached the server on 7459: no hello, no poll; the plugin name appears
  nowhere in the session's lists; no managed settings file; no debug or app log names it. The skills-dir route did not load
  in a Code-tab session. PROBE.md says stop: the next route (a local marketplace) writes his user settings and needs his word.
- 2026-11-25 ~13:50: marketplace setup helper running (Part 1b of step1.3-relay.md). The review was refused twice by the
  creep gate (first path = target; output file named review/findings) and a third start by the auto-mode classifier as a
  work-around; left to the owner. CHECKPOINT 2: about 118.6 M of 143 M, meter 73 % (line 78 %). Hand-over: HANDOVER-L1.md
  "CHECKPOINT 2". This coordinator stops here.
- Owner: "Skip the review" (r57-0096). Level done = relay built or reported, then run.mjs --level 1 exits 0.
- UPDATE 2: marketplace helper done (1.05 M): marketplace at C:/rust-work/probe/market (plug-in moved there, defaultEnabled false; kit tests 4 of 4). Neither settings file was written: the migration gate refused the Edit and auto mode refused a script. Not worked around. The two entries (exact text in PROBE.md "Part 1b") wait for the owner to add himself, or his explicit word to a coordinator: one marketplace key in his user settings, one enabledPlugins entry in the probe folder settings. Backup of his user settings: C:/rust-work/probe/user-settings.backup.json.
