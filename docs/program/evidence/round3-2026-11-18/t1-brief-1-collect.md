# t1 step 1: brief for the five collectors (lane "tree")

Your prompt names your sub-topic: `ours`, `concurrent`, `writes`, `versions` or `hierarchy`. Read this whole
file, then do the part for your sub-topic. `R:` = `docs/program/evidence/round3-2026-11-18/`. All paths are
from the repository root `C:\Users\User\Documents\projects\harness-engineering`.

```
PROJECT CONTEXT (established by the orchestrator; do not re-derive):
- Repository harness-engineering (Windows 11, Git Bash; node is on the path, Python is not). CLAUDE.md is
  injected; trust it. Its rule 4 (privacy) and rule 3 (no install) bind you.
- The harness runs AI coding agents as sessions. Its "research tree" runs one research question as a tree of
  sessions: a coordinator and leaves. Each node is a language-model session: a unit of work lasts minutes,
  redoing it costs tokens, its context window is bounded, it cannot be paused for minutes while a parent is
  rearranged, 3 to 16 run at once, and a rerun is not the same run.
- This lane asks which kind of B-tree (or which combination of kinds) fits such a tree, for a small job known
  up front, a job that grows while it runs, and a very large project that needs inner levels.
- Owner's rulings that bind: a result must say whether it holds for small and for very large projects; laws
  stated in ratios are preferred over thresholds; "not in the papers read" is never "no paper" (search other
  names: thread, process, machine, team, database engine); choose foundational papers and papers with large
  measured gains, not small variants.
RULES: Cite every claim as "path:line - quote" or "papers/tree/<name>/paper.txt line N - quote". Mark every
claim `quoted` (exact words read in the source), `summary` (read only as an abstract, a summary or a fetched
page), `observed` (seen in our files) or `reasoned` (your inference). Fewer well-evidenced items beat many
speculative ones. Write only your output file (and paper folders). No git command that writes. Do not edit
any library, research-tree or script file.
```

## Start from the library (every sub-topic)

Run `bash library/lookup.sh <words>` for the words of your sub-topic below (records are long lines; use Bash,
not the Grep tool). A record whose id begins with `x` and is marked `quoted` from a paper read in full is not
collected again: open the place it cites, check it, and cite it. A `summary` or `textbook` record is upgraded
by reading the source. List at the top of your file which records you used and which you upgraded.

## How to read a paper (tested on this PC; collectors only, not `ours`)

- Find the open copy: arXiv, USENIX, VLDB/PVLDB, ACM open access, the authors' pages, university copies, the
  links Semantic Scholar or OpenAlex give. No pirate copies (no Sci-Hub, LibGen, Anna's Archive). Do not get
  round a sign-in or a bot check: list the paper under "Needs the owner's sign-in".
- Each paper in its own new folder `R:papers/tree/<short-name>/` (the folder is git-ignored). Download with
  `curl -s -L --ssl-no-revoke --max-time 120 --max-filesize 41943040 -o paper.pdf URL`, check `head -c 5`
  is `%PDF-`, then `pdftotext -layout paper.pdf paper.txt`, then grep and read the text. Open or run nothing
  else you download.
- WebFetch returns a small model's summary, not the page: what you take from it is `summary`, never `quoted`.
- Keep every Bash call under about 150 seconds (longer calls get moved to the background and stall).
- Privacy: search only for paper titles, authors and general topics. Never put "harness", a path, a file
  name, a project name or anything about this machine or its owner into a search or a URL.
- Read 5 to 9 papers in full. Seeds are a start; add what is stronger.

## Output file `R:t1-collect-<sub-topic>.md` (markdown, at most about 350 lines)

```
# t1 <sub-topic>: <title>
## Library records used / upgraded
## Gate summary   (at most 12 lines: one per paper, the result a tree of sessions could use, its number, mark, line)
## Papers
### P1. Authors, "Title", Venue Year. Read from: URL. Folder: R:papers/tree/<name>/. Pages read: all / which.
- Problem:
- Mechanism (two lines):
- Measured gain: the number, its baseline, workload and scale, quoted, with (paper.txt line N).
- Operations: how a search, insert, split, merge, rebalance, root change or buffer flush is done, as far as
  the paper says (quoted, line N).
- Assumes: what the mechanism needs (short critical sections, nodes in memory, one writer, ...).
- With sessions as nodes (reasoned): does the assumption hold when a node is a model session (minutes per
  unit, redo costs tokens, bounded window, cannot be paused, 3 to 16 writers, a rerun differs)? Small and
  very large work? Any law stated as a ratio?
- Status: quoted / summary / not opened (reason).
### P2 ...
## Could not open   (title | every route tried | why)
## Needs the owner's sign-in   (title | URL of the login or bot-check page)
```

Return to the coordinator at most ten lines: the output path; papers read in full (count); could not open
(count); the three results most useful to this lane, each with its mark and line.

## Sub-topic `ours` (kind read: no web, no download)

Our tree as recorded and as coded. Read, by line ranges (never a file over 300 lines whole; grep, then read
around the line):
- `research-tree/DESIGN-RECORD.md` (line 18, line 162, and every passage on shape, levels, split, separator,
  redistribution, bulk load, capacity, overflow); `research-tree/SELECTIONS-MAP.md` (lines 29, 30, 160,
  selections D2-01 and D2-02 and any other selection on shape or capacity);
  `research-tree/ATTACK-AND-COST-RECORD.md` (line 37 and any cost figure per node or per hand-over);
  `research-tree/FAULTS-AND-FIXES.md` (the 13 fixes and 0b: which of them touch shape, admission, a parent,
  hand-over or overflow).
- `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`: the parts on shape, capacity, split and overflow.
- Records b1-0101 to b1-0126: `grep -h '"id":"b1-01' library/journal/2026-11-18/b1.jsonl | cut -c1-600`.
- The admission and watcher scripts under `research-tree/tcb/` (find them with `ls`; read the functions that
  decide a node's start, its capacity and its end).
- Library words: `B+ tree`, `B-link`, `Lehman`, `bulk`, `fill factor`, `split`, `hand-over law`, `fan-out`,
  `hierarchy`, `copy-on-write`, `hand over`.

Verify, line by line, the five statements at lines 10 to 18 of `R:lane-tree.md` (right / wrong / in part, with
the line you read). Then answer, each with path:line: what a node is; what flows down (questions, briefs) and
up (reports, records) and in what form (files, messages); what "full" means for a node (window, fill factor
0.75, number of questions, tokens); what is decided and what is "later"; the attack round's verdict and the
owner's rejection of removing the split (quote both); the hand-over law; fan-out, depth and node count of the
one run there was. Then a table: tree operation (search = routing a question, insert = new work, split =
handing half a range to a new session, merge, rebalance, root change, buffer flush) | what exists today, with
path:line | cost in tokens and time as the record gives it (cost of starting a session, of a hand-over, of a
helper; library records r57-0115, r57-0201, r57-0404 and any figure in the files) or "not recorded".
Instead of "Papers", your file has "## Findings" (numbered F1, F2, ...) and the table. No web.

## Sub-topic `concurrent`: B-trees under concurrent change

Seeds: Bayer and Schkolnick 1977 (lock coupling, Acta Informatica); Lehman and Yao 1981 (B-link tree, TODS;
the library holds quotes: look them up first); Lanin and Shasha 1986 (symmetric concurrent B-tree, deletion);
Sagiv 1986 (B*-trees with overtaking, JCSS); Mohan and Levine 1992 (ARIES/IM, SIGMOD: structure changes as
nested top actions); Leis and others (optimistic lock coupling, "The ART of practical synchronization" 2016 and
the 2019 Data Engineering Bulletin paper); Graefe, "A survey of B-tree locking techniques" (TODS 2010);
Levandoski, Lomet and Sengupta, the Bw-tree (ICDE 2013), and Wang and others, "Building a Bw-tree takes more
than just buzz words" (SIGMOD 2018). Questions: how a split, a merge and a root change happen while others
work; how long a "half-split" state lasts and who completes it; whether engines merge at all; whether
structure changes are serialised (one at a time per tree); the measured gains against lock coupling, with
workload and core count. Library words: `B-link`, `Lehman`, `lock coupling`, `latch`, `Bw-tree`, `split`.

## Sub-topic `writes`: trees built for many writes

Seeds: Arge, the buffer tree (WADS 1995 / Algorithmica 2003); Brodal and Fagerberg 2003 (lower bounds for
external-memory dictionaries, the B-epsilon trade-off, SODA); Bender and others 2015 (";login:" introduction
to B-epsilon trees and write optimisation) and BetrFS (Jannen and others, FAST 2015) for measured gains;
O'Neil and others 1996 (the LSM-tree, Acta Informatica); Luo and Carey, LSM survey (VLDB Journal 2020); Dayan
and others, Monkey (SIGMOD 2017) or Dostoevsky (SIGMOD 2018) for the size-ratio trade-off. Questions: the
trade between the cost of a write, the cost of a read and the size of a batch, as formulas and ratios; when a
buffer flushes and how many children one flush touches; what a "message" is (insert, delete, upsert); how a
read finds messages not yet pushed down; the measured gains (number, baseline, workload, scale). Library words:
`LSM`, `buffer`, `batch`, `write amplification`, `compaction`, `group commit`.

## Sub-topic `versions`: versions, bulk loading and node size

Seeds: Rodeh 2008, "B-trees, shadowing, and clones" (ACM TOS); LMDB (Chu's design paper or documentation:
one writer, copy-on-write, readers never block); Driscoll, Sarnak, Sleator and Tarjan 1989 (persistent data
structures, JCSS); Becker and others 1996 (multiversion B-tree, VLDB Journal); Comer 1979, "The ubiquitous
B-tree" (ACM Computing Surveys: B* redistribution before a split, occupancy); Yao 1978 (random 2-3 trees,
occupancy about ln 2; the library holds it: look it up first); Graefe, "Modern B-tree techniques" (Foundations
and Trends 2011: the sections on bulk loading, fill factor and node size); Gray and Graefe 1997, "The
five-minute rule ten years later" (node size from the cost of visiting a node). Questions: what copy-on-write
costs per change (how many nodes are rewritten) and what it buys readers; occupancy under growth with and
without redistribution; how fan-out and depth are chosen from the cost of visiting a node against the work a
node holds, as a ratio. Library words: `copy-on-write`, `bulk`, `fill factor`, `Yao`, `occupancy`, `fan-out`.

## Sub-topic `hierarchy`: hierarchies of workers

Seeds: supervision trees (Armstrong's 2003 thesis, "Making reliable distributed systems in the presence of
software errors"; the Erlang/OTP design principles on supervisors: restart strategies and intensity); trees
that aggregate up and spread down: Astrolabe (van Renesse, Birman and Vogels, TOCS 2003), TAG (Madden and
others, OSDI 2002), Dremel's serving tree (Melnik and others, VLDB 2010: measured query time by tree depth and
fan-out). Language-model agents in hierarchies against flat teams and chains: first read
`research-tree/ATTACK-AND-COST-RECORD.md` line 37 and find the source of the figures "4.4 against 17.2" and
"-5.51 against -23.72"; read each source in full (candidates to check, not facts: a 2025 paper on scaling agent
systems that reports error amplification for centralised against independent agents; a 2024 paper on the
resilience of multi-agent collaboration with faulty agents by topology). Add the strongest measured studies
of agent topology and scale you find (number of agents, depth, cost in tokens). Questions: what fan-out and
depth were measured to do to time, cost and errors; what a parent does when a child fails or overflows; what
flows down against up and in what volume. Library words: `hierarchy`, `topology`, `supervision`, `fan-out`,
`multi-agent`, `orchestrator`.
