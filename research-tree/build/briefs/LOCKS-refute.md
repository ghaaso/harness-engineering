# Brief: blind review of the locks check (helper of the locks session; kind refute, Opus)

Refute `research-tree/build/LOCKS.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`), written
by another helper from the brief `research-tree/build/briefs/LOCKS-analyse.md`. The owner recalled from the CMU database
course that a database should not rely on the operating system's locks, saw locks in the pilot plan, and asked whether
that is a flaw (his words verbatim: `research-tree/build/briefs/LOCKS.md` lines 5-9). Any fix round would follow this
check, so every place, every verdict and every replacement must stand on its source. Write your verdict to
`research-tree/build/refute/LOCKS.md`. You change no other file and start nothing.

## Check, each against its source (not against the check's own wording), in this order
1. **Section 0 and the four flaws** (L8, L10, L11, L12): read the code at the lines cited (branch `build` in
   `C:/Users/User/Documents/projects/hb`; the main checkout's `.claude/hooks/`; the run root
   `C:/research-runs/2026-11-harness-leads/`). Does each failure follow from the code, and can it happen at our scale (a
   few sessions and helpers on one Windows PC, holds of seconds to minutes, commands as short-lived processes)? Is each
   line of section 0 true as worded, including what it says the owner saw and what is built?
2. **The sources**: each quote at its place in `research-tree/build/locks/papers/<name>/paper.txt` (list:
   `research-tree/build/locks/SOURCES.md`) and Graefe 2010 under `docs/program/evidence/round3-2026-11-18/papers/`.
   Does the source say it, in that context? Does the check carry a reason from a source to our case that the source does
   not support, or miss one the sources state (locks against latches; why a database avoids the OS's locks or the OS's
   paging; SQLite's warnings on file locks)?
3. **The places called sound** (at least six of the ten, the riskiest first) and the one not known: read each at its
   file:line. Is a real failure called sound, or a place missing that the brief's list covers (`tcb/`, the lane,
   `.claude/hooks/` and `tools/` in both checkouts, the run root and `research-tree/build/briefs/RUN-INTERFACE.md`
   "The scripts")?
4. **The replacements**: is each a proven mechanism used whole (r57-0040), does it do the job here, and are its cost and
   risk on records (r57-0173) or marked as estimates? Is a simpler proven one missed that the library holds
   (`bash library/lookup.sh lock`, `latch`, `lease`, `fencing`; r57-0415, w1-0400 to w1-0407)?
5. **The faults audit**: where `research-tree/build/FAULTS.md` (version 2) covers the same place, do they agree?
6. **Marks and reach**: [m], [r] with path:line, [q] with source and place, [c] with formula, [e] with range, each
   right? One PC or one repository treated as a law (r57-0015, r57-0028)? A design question put to the owner (CLAUDE.md
   rule 7), or a fix that decides what is his?

## Verdict file
First line: `PASS` or `CORRECT: <n> findings`. Then one row per finding: what the check says, what the source or code
says (path and line), the corrected verdict or wording, and whether it changes section 0, the count of places by verdict
or a replacement. Then what you checked and found right, in one short list, and what you did not check. Plain words.

## Limits
Read-only everywhere except the verdict file and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/6a2a6154-26ed-4633-b771-414e96d8baa3/scratchpad/locks-refute/`.
Run only commands that read (cat, grep, sed, ls, git log, show and diff); no script or test of the tree, the lane, the
hooks or the run (CLAUDE.md rule 3). No web request (the sources are on disk), no session or helper start, no commit, no
command over 150 s. Tokens: expected about 10.6 M (r57-0173: the build's refuters, median), limit 11.5 M (the cap of
40 M binds all of it). Read your count with
`node research-tree/build/tools/tokens-self.mjs "blind review of the locks check"` every 10 calls from call 30; if
that command is refused, stop at 65 calls. Keep calls few: grep -n before reading a long file, never read a file twice.
At about 330 K context or at the limit, write the verdict as it stands and return LIMIT. Return the verdict's first
line and the findings that change section 0, the count of places by verdict or a replacement.
