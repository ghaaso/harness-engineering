# Brief: fold the blind review into the locks check (helper of the locks session; kind analyse, Opus)

Fold the blind review `research-tree/build/refute/LOCKS.md` ("CORRECT: 11 findings") into
`research-tree/build/LOCKS.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`) as version 2, as
the locks session decided each finding (r57-0021) below. First copy version 1 byte for byte to
`research-tree/build/LOCKS-v1.md` (the review cites its lines) and check the two with sha256sum. Keep version 1's
structure; at the end add "Changes from version 1": one line per finding and decision, with what changed. Marks as in
version 1.

## Decisions
All 11 findings are accepted as the review states them, the minor ones too. On top of them:
1. **Section 0.** Rewrite it from the corrected findings: the answer first, at most 12 plain lines, for the owner. His
   question (his words: `research-tree/build/briefs/LOCKS.md` lines 5-9): does the tree rely on OS locks where database
   engineering would not, and is that a flaw? Say plainly what is built and with which primitive (finding 2's wording),
   what he saw on the complexity page (both OS proposals of finding 1, neither built; the pilot plan takes no lock),
   which of the course's reasons carry over and which do not (finding 2's correction of line 3), the flaws with their
   reach (finding 3), and what should change, at the tier route's cost (finding 4).
2. **Counts.** 16 places (finding 7): flaw 4, sound 11, not known 1, unless a correction changes a verdict. Say what
   the count counts (r57-0608).
3. **Replacements.** F1: the test-and-set slot form of finding 4 is the recommended form; list the lock form as
   rejected, with the review's reason. F2 as finding 5; F3 as finding 6; P-OS's risks and its test as finding 11, with
   locking v3 sections 4.0-4.1 cited for section 0. Costs as build-invariant work on Opus with a blind refuter
   (`.claude/hooks/tier-routes.json`), marked [e] with ranges from r57-0173 (a builder unit 32.3 M, 18.5-38.0; a
   refuter 10.6 M, 10.0-13.4), and say these are estimates.
4. **Section 4**, the text the locks session sends to top session 5 as data: rewrite it, at most 8 lines: L11 (the
   code; its reach since `COORDINATOR.md`:39-41; its size from `config.json`), the dead unit's reserve never released,
   L12 with finding 5's caution, the run's git index.lock (finding 7). Name each file and line; ask for no change.
5. **Times.** Findings 3 and 7 rest on run files written after the check read the run root at 00:06: give the times the
   review gives, and say the run's files may change again.
6. **Section 6.** Replace "Left to do (LIMIT)" with what is still not done after the fold: version 1's items and the
   review's list of what it did not check. No LIMIT status line unless you reach your own limit.

## Limits
Write only `LOCKS.md`, `LOCKS-v1.md` and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/6a2a6154-26ed-4633-b771-414e96d8baa3/scratchpad/locks-fold/`.
Run only commands that read, plus the copy and sha256sum. Open library records with `bash library/lookup.sh -f <id>`.
No commit, no web request, no helper or session start, no command over 150 s. Tokens: expected about 4.5 M (the two
folds of 2026-11-20: 3.0 and 6.04 M), limit 6 M. Read your count with
`node research-tree/build/tools/tokens-self.mjs "fold of the locks check"` every 10 calls from call 20; if that command
is refused, stop at 35 calls. At about 300 K context or at the limit, write the file as it stands with "Left to do"
and return LIMIT. Return the new section 0, the counts by verdict, the section 4 text and your token count.
