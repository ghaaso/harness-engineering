# Brief: the tree's locks against the database way (helper of the locks session; kind analyse, Opus)

Asked by the owner on 2026-11-20 and approved with a cap of 40 M tokens for all of it, this helper's included. The
session brief `research-tree/build/briefs/LOCKS.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`)
holds his words verbatim at lines 5-9; read them there. A check: nothing is built, changed or run for it.

## The question
Where do the tree's scripts, the lane, the hooks, `tools/` and the research run's new scripts take a lock, a claim, a
fence, a lease, a slot, a ledger entry or an exclusive write, and with what primitive? Does the database literature (the
CMU course first, as he cites it) advise against that primitive, and why? For each place: a real flaw here or not, with
the failure it would cause in our use; the proven mechanism that replaces it, used whole (r57-0040); what the change
costs. Then the verdict in plain words.

## Compute, in this order
1. **Inventory** (read-only). The places:
   - `tcb/` on branch `build`: `C:/Users/User/Documents/projects/hb/research-tree/tcb/` (scripts; their tests show what
     each is meant to do);
   - the lane: `research-tree/lane/` and its scripts (hb, and the main checkout where it differs: say how);
   - the hooks: `.claude/hooks/` (main checkout: in force for these sessions; hb: the build's) and `tools/` (both);
   - the research run's new scripts (top session 5, local_d4f287db-16fa-445a-b208-56390b8c4518): the run root
     `C:/research-runs/2026-11-harness-leads/` (`tools/`, `.claude/settings.json`), the interface
     `research-tree/build/briefs/RUN-INTERFACE.md` section "The scripts", and `briefs/RUN-TOOLS.md`. They are being
     written now: read what is there and give the time you read it.
   For each place: file and line; the primitive (exclusive create, rename, mkdir, an OS file lock, a stale-break timer,
   a process-id check, a version check, an append, ...); what it protects; who contends for it (which sessions, helpers
   or commands, how many at once, how long each holds); what happens when a holder dies, is killed, or the PC sleeps and
   wakes after a timer ran out. Group places that use one primitive the same way; do not list every function.
2. **Sources**, read and quoted with page or section (r57-0014: a figure or a claim from the source itself, not a
   summary):
   - Downloaded with the owner's go into `research-tree/build/locks/papers/<name>/` (`paper.pdf` or `page.html`, with
     the text beside it as `paper.txt`): `cmu-notes-09` and `cmu-slides-09` (CMU 15-445/645 Fall 2023, lecture 9, index
     concurrency control: latches), `cmu-notes-16` and `cmu-slides-16` (lecture 16, two-phase locking: the lock manager,
     locks against latches), `crotty2022` (Crotty, Leis and Pavlo, CIDR 2022, on mmap), `burrows2006` (The Chubby lock
     service, OSDI 2006: sequencers, lock-delay), `sqlite-lockingv3` and `sqlite-howtocorrupt` (SQLite on file locks).
     `research-tree/build/locks/papers/READY` marks them in place. If it is absent when you reach this step, do the
     library and the faults audit first; if `NO-GO` is there, or READY is still absent when you need them, work from
     what is on disk and list the rest as not read.
   - On disk already: Graefe 2010, "A survey of B-tree locking techniques" (locks against latches), under
     `docs/program/evidence/round3-2026-11-18/papers/` (`w1/graefe10/` or `tree/graefe2010/`: check the title).
     Gray and Cheriton 1989 (leases): no open copy found (four tried); the library holds it as a summary only.
   - The library (`bash library/lookup.sh <word>`, `-f <id>` for a full record): words lock, latch, lease, fencing,
     claim, stale, slot; records r57-0415, w1-0400 to w1-0407, b1-0101 to b1-0126 (the lane, the hook, the tree's
     scripts), c1-0100 to c1-0110 (the lane), x19-0400 and x19-0435 (the tree's design cites Gray and Cheriton 1989 and
     Burrows 2006 for leases with fencing), r57-0518 (the lane's races).
   - Top session 4's faults audit `research-tree/build/FAULTS.md` (version 2, blind-reviewed): start from it, do not
     redo it; cite its fault ids where a place is already a recorded fault.
   - The design's own reasons: `research-tree/DESIGN-RECORD.md`, `research-tree/SELECTIONS-MAP.md`, protocol v2
     `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` (find claims, leases and fences with grep).
3. **For each place: a real flaw here or not.** Our contenders are a few sessions and helpers on one Windows 11 PC
   (local NTFS disk), holding for seconds to minutes, not threads holding for microseconds; a session's commands run as
   separate short-lived processes. Say which of the course's reasons carry over and which do not, keeping the sources'
   own distinction between locks and latches where they draw one. For a real flaw: the proven replacement used whole
   (for example a lock table with modes and a first-come queue, a lease with fencing tokens, or an embedded database as
   the lock manager), its source, its cost to build (units and tokens; r57-0173: a builder unit 32.3 M, 18.5-38.0), its
   risk, and the failure it removes. Where a place is sound as it is, say so and why.

## Write and return
`research-tree/build/LOCKS.md`: section 0 "The answer" first (at most 12 plain lines for the owner: does the tree rely
on OS locks; is what it relies on a flaw; the course's reasons and which carry over; what should change and what it
costs), then the table of places (id, file:line, primitive, what it protects, contenders and hold time, on death, kill
or sleep, what the literature says with its source, a real flaw here or not, the proven replacement, its cost), then
the reasons in the sources quoted with their place, then each flaw's replacement in detail, then what is not known and
what would measure it. Marks: [m] measured (path), [r] read in a file (path:line), [q] quoted from a source (file and
page or section), [c] computed with the formula shown, [e] estimate (range).

## Rules
Read-only except `research-tree/build/LOCKS.md` and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/6a2a6154-26ed-4633-b771-414e96d8baa3/scratchpad/locks/`.
Run only commands that read (cat, grep, sed, ls, git log, show and diff); run no script or test of the tree, the lane,
the hooks or the run (CLAUDE.md rule 3). No change in `hb`, no commit, no web request (the sources are on disk), no
session or helper start, no command over 150 s (a call over about 180 s is moved to the background and you can stall).
Never touch `docs/program/pipeline-diagram/`; evidence is kept as it is (CLAUDE.md rule 1). No design question to the
owner (CLAUDE.md rule 7): a missing fact is named with what would measure it. One PC and one repository are a basis, not
a law (r57-0015, r57-0028). Tokens: expected about 8 M (analyse on Opus, n=19), limit 14 M (the cap of 40 M binds all
of it, r57-0614). Read your count with
`node research-tree/build/tools/tokens-self.mjs "tree locks against the database way"` every 10 calls from call 30.
Keep calls few: grep -n before reading a long file, read a short file whole in one call, never read a file twice. At
about 330 K context or at the limit, write the file as it stands with "Left to do" and return LIMIT. Return section 0,
the count of places by verdict (flaw, sound, not known) and your token count.
