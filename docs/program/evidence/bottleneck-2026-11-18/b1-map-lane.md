# B1: where each signal of the decision rule is read on this PC (read-only map, 2026-11-18)

Paths are from the repo root. Format: claim | path:line | quoted text (at most 15 words) or "missing".
Counts and file states were read from the files; nothing was run.

## A. The signals of Step 1

F1. Free memory: read every 2 s, in MB, field `free=` | research-tree/tools/recorder.ps1:7,13,14 | "Memory','Available MBytes'"
F2. Free memory is written to research-tree/lane/recorder.log (22,407 lines), one line per sample | recorder.ps1:14 | "free={1} cpu={2}% procs={3} node={4} ps={5}"
F3. Whole-PC processor share: field `cpu=`, counter Processor % Processor Time _Total, every 2 s | recorder.ps1:8,13 | "'Processor','% Processor Time','_Total'"
F4. Per-unit peak memory: no log. The recorder counts processes; it does not sample memory per process | recorder.ps1:11-12 | missing
F5. Ready-queue length (work ready above 24 threads): not read; no Processor Queue Length counter | recorder.ps1:7-8 | missing
F6. Busy threads per unit: not read; no per-process or per-thread counter | recorder.ps1:1-21 | missing
F7. Lane wait: field `waited_ms` on every start line; `waited_s` on a "busy" line (waiter gave up) | research-tree/tools/lane.mjs:82,71 | "log({ ev: 'start', label, pid: process.pid, waited_ms"
F8. Time inside the check: field `ms` on the end line (start to exit of the command), per `label` | lane.mjs:95 | "log({ ev: 'end', label, exit, signal: signal || null, ms:"
F9. Time outside the check: not logged. Only derivable as the gap between an end and the next start of one label | lane.mjs:82,95 | missing
F10. Conflicts per file: not logged in the lane, the recorder or the tier hook | research-tree/lane/, .claude/logs/tier-hook.jsonl | missing
F11. Week share and 5-hour share of tokens: no file logs them. git grep for percentUsed, weekShare, contextTokens, usage_percent finds only old evidence data and one clinic case-study file, no logger | git grep, repo minus library/journal | missing
F12. Tokens per unit: the tier hook logs `t, session, agent_id, what, kind, model, decision` (and `label`, `why` on a deny); no token field | .claude/hooks/tier-hook.mjs:13-20 | "JSON.stringify(o) + '\n'"
F13. Tier hook log: .claude/logs/tier-hook.jsonl, 19 lines, one per helper or session start decision, epoch-ms `t`, no interval | tier-hook.mjs:6,16 | "Every decision is logged to ../logs/tier-hook.jsonl."
F14. Units ready: no logger. A queued command leaves no line until it starts or gives up | lane.mjs:70-73,82 | missing
F15. Free memory has a second reader, the governor, which acts under 2,500 MB | recorder.ps1:16 | "if ($f -lt 2500 -or $node -gt 60 -or $pw -gt 40"
F16. Width of the check (slots): read from capacity.txt, which holds 2 | research-tree/lane/capacity.txt:1 | "2"

## B. lane.mjs (99 lines, research-tree/tools/lane.mjs)

F17. Purpose and usage | lane.mjs:4 | "node lane.mjs [--label NAME] [--heap MB] [--timeout-s N] [--wait-s N] -- <program>"
F18. Functions: `opt` (30), `sleep` (37, Atomics.wait), `log` (38, append a JSON line and fsync), `capacity` (39), `alive` (40, kill with signal 0), `tryAcquire` (42-66), `release` (74). The rest runs top to bottom: wait loop 70-73, spawn 83, timer 85-90, exit handler 92-99 | lane.mjs:42 | "function tryAcquire() {"
F19. Taking a slot: for i below capacity, mkdirSync of `lane/slot-i` (exclusive; EEXIST means taken), then write `owner.json` | lane.mjs:45,48,49 | "fs.mkdirSync(d);"
F20. owner.json holds `pid`, `label`, `t` (ISO time) | lane.mjs:49 | "{ pid: process.pid, label, t: new Date().toISOString() }"
F21. Releasing: remove the slot folder, on process exit, on the child's exit and on a spawn error | lane.mjs:74,75,97 | "fs.rmSync(slot, { recursive: true, force: true })"
F22. A slot whose holder dies: the next caller gets EEXIST, reads owner.json, and breaks the slot if the pid is dead or the hold is over 20 min; an unreadable owner.json counts as stale after 15 s (folder mtime); then it retries once | lane.mjs:56,58,61 | "stale = !alive(o.pid) || Date.now() - Date.parse(o.t) > MAX_HOLD_MS;"
F23. A live holder also loses its slot after 20 min, while the option allows a timeout up to 1500 s (25 min) | lane.mjs:23,33 | "const MAX_HOLD_MS = 20 * 60 * 1000;"
F24. State now: slot-1 exists, owner pid 24700, label fix-U4b, t 2026-11-16T23:58:18Z; slot-0 shows as deleted in git status. slot-1 looks stale; the next call would break it | research-tree/lane/slot-1/owner.json:1 | "{"pid":24700,"label":"fix-U4b","t":"2026-11-16T23:58:18.763Z"}"
F25. Log line fields: always `t` (ISO). start: ev, label, pid, waited_ms, cmd (first 400 chars). end: ev, label, exit, signal, ms (or error, ms). timeout: ev, label, child, after_s. busy: ev, label, waited_s | lane.mjs:38,82,87,91,95,71 | "Object.assign({ t: new Date().toISOString() }, o)"
F26. Log now: 1,577 lines; 785 start, 780 end, 1 busy, 11 timeout. First line 2026-11-16T22:11:17Z (self-test), last 2026-11-17T20:33:36Z (probe-suite-memory, ms 596366, exit 0). Five starts have no end | research-tree/lane/log.jsonl | "probe-suite-memory","exit":0,"signal":null,"ms":596366"
F27. capacity.txt is read on every tryAcquire call, so at each 700 ms poll, not once; a change applies at the next poll | lane.mjs:43,72 | "const n = capacity();"
F28. Bounds: capacity default 1, min 1, max 4, unreadable file gives 1; heap default 1024, 128 to 4096 MB; timeout default 540, 5 to 1500 s; wait default 900, 1 to 3000 s | lane.mjs:32,33,34,39 | "Math.min(4, Math.max(1, parseInt("
F29. Queue order: none. Each waiter polls every 700 ms and takes the lowest free slot it finds; no FIFO, no ordering by length or label | lane.mjs:44,70-73 | "sleep(700);"
F30. Other effects: below-normal priority, NODE_OPTIONS heap cap, taskkill /T /F at timeout; exit codes 124 timeout, 75 no slot, 64 usage | lane.mjs:13,77,79,88 | "Exit code: the command's own; 124 on timeout; 75 when no slot came free"
F31. Who starts lane.mjs: nobody automatically; agents call it by convention, one call per command. No hook or wrapper enforces it | research-tree/RULINGS.md:41 | "go through `research-tree/tools/lane.mjs`,"
F32. The protocol says the same, and that capacity.txt holds 2 since 03:50 and commands overlap | docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md:1022-1031 | "`capacity.txt` holds 2 since 03:50"

## C. recorder.ps1 (21 lines, research-tree/tools/recorder.ps1)

F33. Counters in the present script: Memory Available MBytes (`free`), Processor % Processor Time _Total (`cpu`), process count (`procs`), node count, powershell count (`ps`) | recorder.ps1:7,8,11-14 | "free={1} cpu={2}% procs={3} node={4} ps={5}"
F34. Interval 2 s; runs 12 hours, then ends by itself | recorder.ps1:9,20 | "Start-Sleep -Seconds 2"
F35. Output: the file given by `-Log`, append, WriteThrough and AutoFlush. No default path; the file in use is research-tree/lane/recorder.log | recorder.ps1:4,5 | "param([string]$Log, [int]$HotSamples = 15)"
F36. recorder.log has two formats. Lines 1 to about 7,836 (03:11 to 07:34) add `commit=`, `diskq=`, `top=` (process names with numbers, unit not stated); from about line 7,837 (12:07:46) only the six fields above. Line 1 is "11-17 03:11:23 recorder started pid 22208" | research-tree/lane/recorder.log:1 | "03:11:23 free=18473 commit=33% cpu=2% diskq=0 procs=300 node=4 ps=2 top=claude:763"
F37. Last 3 lines: 21:51:12, 21:51:14, 21:51:16; free 18,352 to 18,424 MB, cpu 2 to 3 %, node=0. Lines carry no date, only HH:mm:ss | research-tree/lane/recorder.log:22407 | "21:51:16 free=18410 cpu=3% procs=286 node=0 ps=7"
F38. Governor: stops node and powershell processes whose command line contains `tcb-build` when free is under 2,500 MB, node over 60, powershell over 40, or CPU at 97 % or more for -HotSamples samples (default 15 = 30 s; 0 turns that rule off); writes a GOVERNOR line. The log holds none | recorder.ps1:16-18 | "$f -lt 2500 -or $node -gt 60"
F39. Started by hand. git grep finds recorder.ps1 only in the protocol (1040) and RUN-LADDER.md (63); no script, hook, task or Start-Process line starts it | research-tree/model/RUN-LADDER.md:63 | "The recorder (`tools/recorder.ps1`) must then be started with"
F40. Stopped: no stop command; it ends after 12 hours or when its process is ended. Whether it runs now cannot be read from files (the log ends 21:51:16, no date) | recorder.ps1:9 | "$end = (Get-Date).AddHours(12)"
F41. The "recorder started pid" line is not written by the present script, so an earlier version or a starter wrote it | recorder.ps1:14 | missing

## What is missing for the decision rule

- Per-unit peak private memory, busy threads per unit, ready-queue length: no logger (F4, F5, F6).
- Time outside the check, conflicts per file, units ready: no field (F9, F10, F14).
- Week share, 5-hour share, tokens per unit: no log in this repo; the table's "Week share yes" has no file behind it (F11, F12).
- The recorder starts by hand, the lane is used by convention, and the queue has no order (F29, F31, F39).
