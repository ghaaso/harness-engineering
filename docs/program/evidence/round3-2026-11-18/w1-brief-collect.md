# w1 step 1: collect (sonnet, five at once, one topic each)

Read first: `R:w1-brief-common.md`; then in `R:ROUND.md` the sections "Standards for a paper" and "Start from the
library"; then all of `R:lane-writers.md` (the frame to test and your sub-topic). Your launch names your topic.

## Goal

For your topic, gather what the published literature and the engines in real use say, read in the paper's own
text, so that an analyst can (a) check the lane's frame (four failures, four means of parallelism), (b) give for
each means the largest measured gain with its contention, baseline, workload and scale, and (c) judge whether the
mechanism's assumptions hold when a writer is a model session (see "Our case" in the common file).

## How

1. Library first. Run `bash library/lookup.sh <word>` for the lane's search words that touch your topic (list in
   `R:lane-writers.md`) and for your papers' author names. For each hit marked `quoted` from `x02` to `x06`, read
   the place its `evidence` cites (`E:` = `docs/program/evidence/harness-method-status-2026-11-18/`) and reuse it:
   copy the quote with that file's path and line, do not fetch the paper again. A hit marked `summary` or
   `textbook` is upgraded by reading the source.
2. Papers. Order: the papers the field is built on and the trusted survey; then papers with a large measured gain;
   then how engines in real use do it (their own papers or documentation pages: PostgreSQL, SQL Server, MySQL
   InnoDB, Oracle, FoundationDB, CockroachDB, Spanner, LMDB, RocksDB, as they fit your topic). Skip a variant that
   changes no answer. At most 10 papers read in full; say which you skipped and why.
3. Reading: `mkdir -p R:papers/w1/<short-name>`; `curl -s -L --ssl-no-revoke -o paper.pdf <url>`; check
   `head -c 5 paper.pdf` prints `%PDF-`; `pdftotext paper.pdf paper.txt`; then `grep -n` and read ranges of
   `paper.txt`. Public copies only (author page, arXiv, university, the publisher's open copy), under 40 MB. A
   blocked page: look for the open copy; a sign-in or bot check: list the paper under "needs the owner's sign-in".
   An engine's documentation page may be saved as `page.html` and read as text the same way.
4. Write `R:w1-collect-<topic>.md`: a header (topic, date, library records reused), then one block per paper:
   - **Citation** and URL fetched; status `quoted` / `summary` / `not opened` (reason).
   - **Problem.** One line.
   - **Mechanism.** Two lines.
   - **Measured gain.** Figure, baseline, workload, contention level, scale (cores, writers, data size), each
     quoted with `R:papers/w1/<short-name>/paper.txt:<line>`. If the paper measured no gain, say so.
   - **Assumes.** What the mechanism needs to be true (short units, cheap aborts, known read and write sets, a
     deterministic rerun, a central sequencer...).
   - **For model-session writers.** Does each assumption hold (unit of minutes, redo costs tokens, 3 to 16
     writers, rerun not identical, a serial test suite as the last check)? Mark this `reasoned`.
   - **Frame.** Which failure or means of the lane's frame this paper bears on; anything the frame misses.
   End the file with "Not found" (what you searched, the words and places) and "Not opened" (with reasons).

## Topics (the lane file lists the core papers; these add to it)

- `isolation`: Berenson and others 1995; Adya's thesis 1999 (or the ICDE 2000 paper); Fekete and others 2005;
  Cahill, Roehm, Fekete 2008 (SIGMOD) or Cahill's thesis; Ports and Grittner 2012 (VLDB, PostgreSQL SSI);
  PostgreSQL's documentation of its isolation levels. Measured cost of each level, and which anomalies each lets
  through. Also failures the frame lacks (read skew, dirty write, write cycles, lost update under snapshot).
- `grain`: Gray, Lorie, Putzolu, Traiger 1976 (look up `granularity` and `intention` first: held as quotes);
  Mohan's ARIES/KVL 1990; Lomet 1993 (key-range locking); Graefe's survey of B-tree locking (2010) and his
  hierarchical locking paper (2007); predicate locks (Eswaran and others 1976); lock escalation as SQL Server
  documents it. What engines measured when the grain got finer or coarser. Note what a grain would be for code
  (file, class, function, statement) only as `reasoned`.
- `engines`: Kung and Robinson 1981; Hekaton (Larson and others VLDB 2011; Diaconu and others SIGMOD 2013); Silo
  (Tu and others SOSP 2013); TicToc (Yu and others SIGMOD 2016); Cicada (Lim and others SIGMOD 2017); "Staring
  into the abyss" (Yu and others VLDB 2014). Which design wins under which contention, with the figures; how
  abort rate and wasted work grow with contention and with transaction length.
- `order`: Calvin (Thomson and others SIGMOD 2012); Abadi and Faleiro 2018 (deterministic databases overview);
  Aria (Lu and others VLDB 2020); escrow (O'Neil 1986); Doppel, phase reconciliation (Narula and others OSDI
  2014); the scalable commutativity rule (Clements and others SOSP 2013); H-Store partition ownership (Kallman
  and others 2008, or Stonebraker and others 2007); invariant confluence (Bailis and others 2014: look up
  `confluence`, held). What must be known before work starts, and the gain when it is known.
- `merge`: Apel and others 2011 (semistructured merge, FSTMerge) and 2012 (structured merge, JDime); IntelliMerge
  (Shen and others 2019); Spork (Larsén and others 2022); refactoring-aware merge (RefMerge, Ellis and others
  2022); semantic conflict detection (Sousa and others 2018, verified three-way merge; detection by generated
  tests, da Silva and others 2022 or later). Then the studies of several AI agents in one repository: look up
  `x07` records and `r57-0308` (held as summaries only) and read those papers in full; give their conflict rates
  and speed figures quoted.
- `long` (added 2026-11-19 by the top session; item 6 of `R:lane-writers.md`): long and cooperative transactions.
  The survey by Barghouti and Kaiser 1991 first; then sagas (Garcia-Molina and Salem 1987); long-duration design
  transactions and check-out / check-in (Korth, Kim, Bancilhon 1988); split transactions (Pu, Kaiser, Hutchinson
  1988); the study of parallel changes in one large system (Perry, Siy, Votta 2001). The names were given from
  memory: confirm each paper exists before citing it. Answer: what these designs do instead of "abort and redo"
  when one unit is too costly to redo; what was measured; which of it carries to model sessions.

## Done returns (at most ten lines)

The path written; counts of papers `quoted` / `summary` / `not opened`; library records reused; the three
findings that bear most on the lane's frame, one line each with the paper and line.
