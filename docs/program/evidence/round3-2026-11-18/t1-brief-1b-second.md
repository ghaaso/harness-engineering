# t1 step 1b: second attempts (kind collect, Sonnet; two helpers)

Asked by the top session on 2026-11-19: under ROUND.md standard 2 a paper may not stay "not tried", "not
opened" or behind a wrong URL; each gets one real attempt by public routes. Read `R:t1-brief-1-collect.md` first
(PROJECT CONTEXT, how to read a paper, privacy, the per-paper block); it binds you. `R:` =
`docs/program/evidence/round3-2026-11-18/`.

Public routes to try for each, in this order, until one gives a PDF that starts with `%PDF-`: the journal's or
the publisher's open archive; the authors' pages and their university's repository (also the Internet Archive
copy of a dead author page); arXiv; a technical-report copy (IBM Research, BRICS, HP Labs, a university report
series); the open links Semantic Scholar or OpenAlex give. No pirate copies. A sign-in or a bot check: list it
under "Needs the owner's sign-in" and stop on that paper. A scan with no text layer counts as opened only if a
copy with text exists; there is no OCR here.

Append to the named collect file a section `## Second attempt (2026-11-19)`: per paper, either the block of
`R:t1-brief-1-collect.md` ("### P<n>. ...", quoted with paper.txt lines) or one line `title | routes tried |
why still closed`. Do not change anything above that section. End the section with the line
`Second attempt finished.` Return at most six lines: opened (count and names), still closed, the one result
that changes most.

## Helper A: papers (append to the file named against each)

- `t1-collect-concurrent.md`: Bayer and Schkolnick 1977, "Concurrency of operations on B-trees" (Acta
  Informatica 9; also IBM research report RJ1791); Lanin and Shasha 1986, "A symmetric concurrent B-tree
  algorithm" (the NYU page returned "Access forbidden": try the Internet Archive copy and other routes); Sagiv
  1986 / 1985 conference version, "Concurrent operations on B*-trees with overtaking"; Johnson and Shasha 1990,
  "A framework for the performance analysis of concurrent B-tree algorithms" (PODS 1990, also NYU reports);
  Mohan 1990, ARIES/KVL (IBM research report).
- `t1-collect-versions.md`: Comer 1979, "The ubiquitous B-tree" (find a copy with a text layer); Johnson and
  Shasha 1993, "B-trees with inserts and deletes: why free-at-empty is better than merge-at-half" (JCSS; NYU
  report copy); Graefe 2011, "Modern B-tree techniques" (author's or HP Labs copy; only the sections on bulk
  loading, fill factor and node size); Yao 1978, "On random 2-3 trees"; Baeza-Yates 1989, "Expected behaviour
  of B+-trees under random insertions"; the LMDB documentation on its copy-on-write design (one page).
- `t1-collect-writes.md`: Rosenblum and Ousterhout 1992, "The design and implementation of a log-structured
  file system"; Buchsbaum and others 2000, buffered repository trees ("On external memory graph traversal").

## Helper B: the hierarchy gap (append to `t1-collect-hierarchy.md`)

The hierarchy file found no controlled study of a language-model agent hierarchy of depth 2 or more, or of
token cost by depth. Under ruling r57-0029 that is not "no paper". Search under other names before concluding:
hierarchical multi-agent systems, tree of agents, recursive delegation or decomposition, manager-worker and
multi-level orchestration, organisational structure of LLM agents, agent societies by span of control; and in
the older literature on human organisations and on hierarchical task networks (span of control and depth
against delay and error). Read in full the 3 to 6 strongest with a measured effect of depth or fan-out (number,
baseline, workload, scale). If none exists after this search, write what was searched, with the queries.
