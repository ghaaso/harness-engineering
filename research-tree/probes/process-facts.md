# Process facts (probed 2026-11-16, read-only; scripts beside this file)

Scripts: inspect-sessions.mjs, tie-sessions.mjs, spawn-kill.mjs, timing.mjs (all node + powershell -NoProfile).

## 1. Session processes
Selector that works: Name = claude.exe AND ExecutablePath contains `claude-code`. Other claude.exe processes (the desktop app and its helpers, 11 of them, shorter command lines) do not match and have no `--resume`.
Five sessions found; all have the same parent process (the app) and 1 conhost child; one (the active one) also had 4 bash.exe children. Child set is not stable, so it identifies nothing.

Flags present (name -> kind of value), in order:
--output-format (word) ; --verbose (none) ; --input-format (word) ; --effort (word: high, xhigh, max) ; --model (short string) ; --permission-prompt-tool (word) ; **--resume=<id of 36 characters>** (written with `=`, not a space) ; --allowedTools (long string, ~1300 chars) ; --disallowedTools (string) ; --setting-sources (string) ; --permission-mode (word) ; --allow-dangerously-skip-permissions (none) ; --include-partial-messages (none) ; **--add-dir** (a path; 0, 1 or 2 times) ; --await-initialize (none) ; --thinking-display (word) ; --replay-user-messages (none) ; **--project-config-root** (a path; only 1 of 5) ; --settings (2-character value).
Command lines are 3.9 to 4.2 KB. Parse flags with both `--flag=value` and `--flag value` forms.

Tie to session id: YES. `--resume=<id>` is on all five and each id matches an existing file `C:/Users/User/.claude/projects/<folder>/<id>.jsonl` (5 of 5 found). So command line -> session id -> transcript -> project folder name.
Tie to start folder: INDIRECT. The cwd is not in the command line and Windows gives no cwd to a script (Win32_Process has no such field, Get-Process neither). The transcript's project folder name (the cwd with `:`, `\`, `/`, `.` etc. turned into `-`) is the best proxy: four sessions map to `C--Users-User-Documents-projects-EMS-workshop1`, one to a `...--claude-worktrees-wizardly-hertz-02c46a` worktree folder (that one also has --project-config-root). `--add-dir` paths are extra readable dirs, NOT the cwd (none matched the transcript folder). Caveat: the id after --resume names the transcript the process resumed from; if a session forks to a new id the file name may differ (not observed here). Transcript mtime ranged from 0 to 2608 minutes old, so mtime says which session is active, not which process.
Open transcript handle: not visible to Node or stock PowerShell (no handle listing without Sysinternals; not installed, not downloaded).
Never printed: model values, tool lists, paths, ids.

## 2. Start time
Reliable: Get-CimInstance Win32_Process gives CreationDate; `ToUniversalTime().ToString('o')` gives 100 ns resolution (e.g. 2026-11-16T18:12:28.2739840Z). ConvertTo-Json yields it as `/Date(ms)/` (ms since epoch; fine, but use 'o' for exactness). Get-Process StartTime agrees in kind.
Cost: dominated by PowerShell startup. One query for ALL 433 processes with command lines: 2.6 s. One pid via CIM: 2.2 to 2.4 s. One pid via Get-Process: 1.9 to 2.0 s. A filter of 3 pids: 2.3 s. So batch many pids into one query (cost is flat), and keep queries off any hot loop (poll on the order of every 30 s or more). Wmic does not exist here. Node-only liveness: `process.kill(pid, 0)` is instant (ESRCH when gone) but says nothing about identity.

## 3. Tree kill (own dummy processes only)
Spawned A (node) with its own child, and B (node). Before: three pids alive with ppid of the script, A's child with ppid = A. `taskkill /PID <A> /T /F`: exit 0, output names both the child and A as terminated. Re-read 0.5 s later: only B alive, B's start time identical to before. `taskkill /PID <B> /F`: exit 0, then none alive. `taskkill` on an already-dead pid: exit 128. Liveness re-read works two ways: CIM query returns no row for a dead pid; `process.kill(pid,0)` throws ESRCH. Nothing but spawned pids was touched.

## 4. Pid reuse
Identity of a process = (pid, start time as ISO UTC string with 100 ns digits). Record both at spawn (or first sight). A record is the same live process only if a read of that pid returns a row AND its start equals the recorded start; a row with a different start is a reused pid (treat the old process as dead, never kill it); no row means dead. Before any taskkill, re-read start and compare immediately, accepting a small race (a 2 s query leaves a window; reuse of a pid within that window is very unlikely on Windows but possible). A tree kill by pid also reaches only the current descendants, so record children's (pid, start) if they matter. The reuse case itself was shown by logic only (a dead pid reading as absent); I did not force a real reuse.

## Consequences for the build
- Map a session process to its id with the `--resume=` flag (regex `--resume[=\s]"?([0-9a-f-]{36})`) and to its folder through the project-folder name of that transcript.
- No cwd is readable; do not design on one.
- Batch process reads into one PowerShell call; ~2 s each.
