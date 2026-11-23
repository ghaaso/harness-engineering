# replay-L8: proposed library records

1. kind fact, status measured. "Claude Code's edit diagnostics never ran on this PC: 0 diagnostics lines after 30,336
   Edit/Write calls in 4,443 transcripts (clinic, FixFlow, this repository, the research run, other folders)."
   Evidence: research-tree/build/replays/replay-L8/diag-scan.out.json; RESULT.md table rows 1-5.
2. kind result, status measured. "The clinic's own ruff and mypy strict flagged 0 of 10 located fix-made defects (0 of 9
   defect-making commits); 2 of 84 fix commits without a recorded defect (2.4 %) and 7 of 256 commits (2.7 %) carried a
   new flag, none a defect. L8 is not piloted on S2 for this project." Evidence: replay-L8/analyse.out.json (summary),
   RESULT.md lines 3-7.
3. kind fact, status measured. "5 of S2's 15 fix-made defects (RR-1, RR-2, RR-3, RS-1, S11 P2-1) were made and fixed
   inside one uncommitted round; no commit holds them." Evidence: clinic docs/tasks/opening-cutoff-guards/task.md:63, 81;
   docs/tasks/s11-operations/task.md:283; RESULT.md "Located defects".
4. kind fact, status observed. "Type and lint errors appear in agents' tool results: clinic 174 mypy and 73 ruff results
   in 31 of 547 transcripts; FixFlow 35 tsc, 11 mypy, 14 eslint in 29 of 2,163 (upper bound)." Evidence:
   replay-L8/checker-output-scan.out.json.
5. kind mistake, status observed. "A shared mypy incremental cache across trees of different commits gave stale results
   (101 of 308 trees failed on a module they do not hold); use a fresh cache per tree in replays." Evidence:
   replay-L8/gate-replay.pass1-shared-cache-INVALID.jsonl; gate-replay.mjs header lines 12-13.
