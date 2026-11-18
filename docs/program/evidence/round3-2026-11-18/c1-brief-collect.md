# c1 step 1 brief: collect (one Sonnet helper per sub-topic, five at once)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` = `docs/program/evidence/round3-2026-11-18/`.
Read first: `R:ROUND.md` (sections "Standards for a paper", "Start from the library", "Limits") and `R:lane-check.md`.
They bind you. Your prompt names your sub-topic number (1 to 5) and your output file.

## Goal
Several workers (AI coding sessions; a unit of work lasts minutes, redoing it costs tokens, 3 to 16 workers, a
rerun is not the same run) alternate between work on their own and one shared serial check (a test suite: seconds
in a small project, about ten minutes here, an hour in a large one). We need, from strong literature read in full:
the standard model of this, how many workers one check can feed, and the methods with large measured gains for
making one check carry more (batching, testing ahead, a shorter check, scheduling around the bottleneck).
Treat threads, processes, programs, machines and teams sharing one server as the same problem (ruling r57-0029:
"not in the papers read" is never "no paper"; search other names and sizes). Prefer laws stated in ratios.

## Sub-topics (yours is in your prompt)
1. `queue`: finite-source queue / machine-repair (machine-interference) model; saturation point N* and the
   asymptotic bounds (Denning and Buzen 1978 "The operational analysis of queueing network models"; Lazowska,
   Zahorjan, Graham, Sevcik 1984 "Quantitative System Performance", free online at the authors' site, chapters on
   bounds and MVA; Kleinrock; Reiser and Lavenberg 1980 MVA). Find: the formula for the best number of workers with
   one server and with c servers, stated with its conditions; does N* = c x (Z + S) / S appear (Z time outside,
   S service time)? What changes when service is batched (bulk-service queues).
2. `group`: Dorfman 1943 and its successors (optimal pool size by prevalence, adaptive and binary splitting,
   Hwang's generalized binary splitting, the information-theoretic bound on tests; a survey such as Aldridge,
   Johnson, Scarlett 2019 "Group testing: an information theory perspective", arXiv); group commit in databases
   (e.g. Helland and others 1987, or DeWitt and others 1984, or an engine's documentation) as the same idea for a log.
3. `mergeq`: batch testing and bisection in CI (Najafi, Rigby, Shang 2019; Beheshtian, Bavand, Rigby 2021; Bavand,
   Rigby 2021), Uber's SubmitQueue (Ananthanarayanan and others, EuroSys 2019: the library holds quotes, search
   `SubmitQueue` and read the cited places first), OpenStack Zuul's speculative gating (its documentation),
   Google's continuous testing (Memon and others 2017), merge queues of large projects (e.g. Bors / the Rust
   project, GitHub merge queue documentation). Measured gains and what they assume on failure rate and conflicts.
4. `shorter`: test selection by dependency and by prediction (library: r57-0306, search `test selection`,
   `Ekstazi`), test prioritisation in CI (Elbaum, Rothermel, Penix 2014), flaky tests and their effect on batching
   (Luo and others 2014), build graphs that give the affected tests (Bazel/Buck or a paper on them), splitting a
   suite over machines or slots (test sharding; a paper with measurements).
5. `bottleneck`: flow shops with one bottleneck machine; the shifting bottleneck procedure (Adams, Balas, Zawack
   1988); drum-buffer-rope (Goldratt; a paper that models or measures it); the Universal Scalability Law (library
   r57-0307, search `Scalability Law`, `Amdahl`, `Suleman`) and what limits it; accelerating the critical section
   (Suleman and others 2009 if it fits).

## How
1. Library first: `bash library/lookup.sh <word>` with the search words of `R:lane-check.md`. A record `quoted`
   from a paper read in full is not collected again: read the place it cites and cite it. A `summary` or
   `textbook` record is upgraded by reading the source.
2. Then 5 to 8 papers in full for your sub-topic (foundations first, then large measured gains, then engines or
   systems in real use). Download in Bash: `curl -s -L --ssl-no-revoke --max-time 120 --max-filesize 41943040 -o
   paper.pdf URL` into a new empty folder `R:papers/check/<short-name>/`; check `head -c 5` is `%PDF-`; then
   `pdftotext -layout paper.pdf paper.txt`; read and grep the text. Open or run nothing else you download.
   A book or a web documentation page: save it as text in the same way and cite its line.
3. A blocked page: find the open copy (arXiv, the authors' pages, university repositories, Semantic Scholar /
   OpenAlex / Unpaywall links). No pirate copies. A sign-in or bot check: list it, do not work round it.
4. WebFetch gives a small model's summary: anything from it is `summary`, never `quoted`.
5. Keep every Bash call under about 150 seconds.

## Rules
- Privacy: search only paper titles, authors and general topics; never a project name, path, "harness", this
  machine or its owner.
- No installs, no tests, no git writes. Write exactly one file in the repository: your output file (papers go in
  the ignored `R:papers/check/` folder).

## The output file `R:c1-collect-<topic>.md` (at most about 350 lines)
```
# c1 collect <topic>: <title>
## Gate summary   (at most 12 lines: one per paper: the usable result, its number, mark, txt line)
## From the library   (ids used, with what each gives)
## Papers
### P1. Authors, "Title", Venue Year. Read from: URL. Saved: R:papers/check/<short>/paper.txt. Read: all / which.
- Problem.
- Mechanism (two lines).
- Result: exact quotations in double quotes, each with (txt line N).
- Measured gain: number, baseline, workload, scale, quoted with (txt line N).
- Assumes: what the model or experiment assumed (failure rate, conflicts, service time, workers, known in advance).
- With model sessions: does the assumption hold when a worker is a model session (minutes per unit, redo costs
  tokens, 3 to 16 workers, a rerun is not the same run); seconds / minutes / an hour of check. Mark reasoned.
- Needs to know about a project before use (failure rate, test-to-code map, ...).
- Status: quoted / summary / not opened (reason).
## Could not open   (title | routes tried | why)
## Needs the owner's sign-in   (title | URL)
```

## Return to the coordinator (at most ten lines)
The output path; papers read in full (count); could not open (count); the three results most useful for our
check, each with its number, mark and txt line.
