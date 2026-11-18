# a1 step 1 brief: collect (one Sonnet helper per sub-topic, five at once)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` = `docs/program/evidence/round3-2026-11-18/`.
Read first: `R:ROUND.md` (sections "What the owner asked", "Standards for a paper", "Start from the library",
"Keeping the library clean", "Limits") and `R:lane-budget.md`. They bind you. Your prompt names your sub-topic
number (1 to 5) and your output file.

## Goal
A coordinator starts units of work on AI model sessions. A unit lasts minutes, costs tokens (its count known only
roughly before it starts), redoing it costs tokens again, and a rerun is not the same run. 3 to 16 units run at
once; the number of units per window is small (tens to hundreds; not measured), not the millions of an ad market.
Two problems, both resting on reasoning alone today:
A. **A token allowance that refills.** A 5-hour window and a weekly window (and a weekly window for the dearest
   model), each refilling on its own clock. Unspent allowance is lost at the reset; an empty window stops all work
   until it refills. Several models of different quality draw on it at different token prices. Question: the rule
   for what to start, and on which model, given the share of each window left against the share of its time left.
B. **A few long units.** With 3 to 16 workers, one worker is 6 to 33 % of the level; units last minutes and their
   length is only roughly known. Question: which scheduling method (ordering, backfilling, speculative re-execution)
   has the largest measured gain, and what it must know about a unit's length.
Treat the problem under its other names and sizes (budget pacing, revenue management, online knapsack, quotas,
credits, batch queues, project scheduling, stragglers) as the same problem (ruling r57-0029: "not in the papers
read" is never "no paper"). Prefer laws stated in ratios. Choose papers for large gains, not small advances.

## Sub-topics (yours is in your prompt)
1. `pacing`: budget pacing in repeated auctions. Balseiro and Gur, "Learning in repeated auctions with budgets:
   regret minimization and equilibrium" (Management Science 2019; arXiv); Balseiro, Kim, Mahdian, Mirrokni, "Budget
   management strategies in repeated auctions" (WWW 2017 / Operations Research; compares throttling with
   multiplicative pacing); Balseiro, Lu, Mirrokni, "Dual mirror descent for online allocation problems" (ICML 2020 /
   arXiv); Conitzer and others, "Multiplicative pacing equilibria in auction markets". Real systems (mark
   "self-reported"): Agarwal and others, "Budget pacing for targeted online advertisements at LinkedIn" (KDD 2014);
   Xu and others, "Smart pacing for effective online ad campaign optimization" (KDD 2015). Find: the pacing rule
   (target spend = budget left / time left? a multiplier updated by the dual?), its bound and every condition
   (horizon length, budget growing with the horizon, i.i.d. values, small spend per step), throttling against price
   adjustment, and measured gains with their baseline.
2. `allocation`: a fixed stock sold over a horizon. Gallego and van Ryzin, "Optimal dynamic pricing of inventories
   with stochastic demand over finite horizons" (Management Science 1994): the fixed-price heuristic and its
   asymptotic bound; Talluri and van Ryzin, "An analysis of bid-price controls for network revenue management"
   (1998); Badanidiyuru, Kleinberg, Slivkins, "Bandits with knapsacks" (FOCS 2013, arXiv 1305.2545), with several
   resources; Devanur, Jain, Sivan, Wilkens, "Near optimal online algorithms ... for resource allocation problems"
   (several budgets at once); online knapsack threshold rules (Zhou, Chakrabarty, Lukose, "Budget constrained
   bidding in keyword auctions and online knapsack problems", WINE 2008). Find: the rule each gives, its gap to the
   best and under what conditions, what it must know in advance, and how several budgets (two nested windows)
   combine: one price per budget, a sum, or the dearest alone.
3. `quotas`: quotas and credits in real systems. Token bucket and the two-rate three-color marker (RFC 2697,
   RFC 2698: two buckets at once); the generic cell rate algorithm (an open copy of its standard or a paper);
   fixed against sliding windows (a provider's own account, e.g. a rate-limiting engineering write-up); credits that
   accrue and are spent (burstable cloud instances: the provider's documentation and a measured study, e.g. Wang
   and others, "Using burstable instances in the public cloud", SIGMETRICS 2017); Google's site reliability book,
   chapters "Handling Overload" and "Addressing Cascading Failures" (client-side adaptive throttling and its
   formula; free online). Library: look up `token bucket`, `quota`, `window` and read the places cited. Then **the
   facts of our allowance** from the provider's public documentation (Anthropic's help-centre and docs pages on
   usage limits of the Claude plans and of Claude Code, and on prompt caching and rate limits): whether the 5-hour
   window is fixed or starts with the first message, whether the weekly windows are fixed or rolling and when they
   reset, whether a per-model weekly window exists, how cached input counts against usage limits (and separately
   against API rate limits). Save each page as text and quote it with its line and the fetch date. Do not infer:
   what the pages do not say goes under "unknown".
4. `longjobs`: a few long jobs. Mu'alem and Feitelson, "Utilization, predictability, workloads, and user runtime
   estimates in scheduling the IBM SP2 with backfilling" (IEEE TPDS 2001; open copy on the author's site); Lifka's
   EASY backfilling; Tsafrir, Etsion, Feitelson, "Backfilling using system-generated predictions rather than user
   runtime estimates" (TPDS 2007); Graham's list-scheduling bounds (look up `Graham`, `list` in the library first);
   resource-constrained project scheduling: Kolisch, "Serial and parallel resource-constrained project scheduling
   methods revisited" (EJOR 1996) and Kolisch and Hartmann, "Experimental investigation of heuristics for
   resource-constrained project scheduling: an update" (EJOR 2006), the priority rules and their gaps to the
   optimum; stragglers: Dean and Ghemawat, MapReduce (OSDI 2004, backup tasks); Zaharia and others, LATE (OSDI
   2008); Ananthanarayanan and others, Mantri (OSDI 2010) and Dolly (NSDI 2013). Library: `Borg`, `critical path`.
   Find: the largest measured gain, on which workload log, at what number of processors, and how it degrades when a
   job's length is only roughly known (estimate accuracy against gain).
5. `llmbudget`: model work under a token or cost budget. Library first: look up `cheaper`, `RouteLLM`, `FrugalGPT`,
   `Hybrid`, and read the places those records cite (do not collect them again if `quoted`). Then: compute-optimal
   test-time allocation (Snell and others 2024, "Scaling LLM test-time compute optimally ..."); token-budget-aware
   reasoning (Han and others 2024, TALE); budget forcing (Muennighoff and others 2025, s1); cascades and routing
   with a cost cap (AutoMix, Madaan and others 2023; others with large measured savings); agents given an explicit
   budget (search "budget-aware agent", "cost-aware agent"). Real systems (mark "self-reported"): a team's own
   account of running into usage or rate limits with agents and what it changed (e.g. Anthropic's engineering post
   on its multi-agent research system, which gives token figures). Find: quality per token by kind of work, the
   saving at equal quality and its baseline, and whether any work paces against a refilling allowance.

## How
1. Library first: `bash library/lookup.sh <words>` with your sub-topic's words and those of `R:lane-budget.md`.
   A record `quoted` from a paper read in full is not collected again: read the place it cites and cite it. A
   `summary` or `textbook` record is upgraded by reading the source. Nothing found: write "not recorded".
2. Then 5 to 8 sources in full for your sub-topic (foundations and the trusted survey first, then large measured
   gains, then systems in real use). Download in Bash: `curl -s -L --ssl-no-revoke --max-time 120 --max-filesize
   41943040 -o paper.pdf URL` into a new empty folder `R:papers/budget/<short-name>/`; check `head -c 5` is
   `%PDF-`; then `pdftotext -layout paper.pdf paper.txt`; read and grep the text. Open or run nothing else you
   download. A book chapter or a documentation page: save it as text in the same way (`page.txt`) and cite its line.
3. A blocked page: find the open copy (arXiv, the authors' pages, university repositories, Semantic Scholar /
   OpenAlex / Unpaywall links, Internet Archive scholar). No pirate copies. A sign-in or bot check: list it, do not
   work round it. "Not tried" is not a status: each named paper gets at least one real attempt.
4. WebFetch gives a small model's summary: anything from it is `summary`, never `quoted`.
5. Keep every Bash call under about 120 seconds (a call over about 180 s is moved to the background and can stall).

## Rules
- Privacy: search only paper titles, authors, product names and general topics; never a project name, path,
  "harness", this machine or its owner.
- No installs, no tests, no git writes. Write exactly one file in the repository: your output file (papers go in
  the ignored `R:papers/budget/` folder).
- A company's own figure is "self-reported" in the block, with what broke, at what scale, what changed, and the
  before and after.

## The output file `R:a1-collect-<topic>.md` (at most about 350 lines)
```
# a1 collect <topic>: <title>
## Gate summary   (at most 12 lines: one per source: the usable result, its number, mark, txt line)
## From the library   (ids used, with what each gives)
## Papers
### P1. Authors, "Title", Venue Year. Read from: URL. Saved: R:papers/budget/<short>/paper.txt. Read: all / which.
- Problem.
- Mechanism (two lines).
- Result: exact quotations in double quotes, each with (txt line N).
- Measured gain: number, unit, baseline, workload, scale, quoted with (txt line N); "self-reported" if a company's.
- Assumes: what the model or experiment assumed (horizon length, number of steps, i.i.d. values, known demand or
  distribution, spend per step small against the budget, job length known, number of processors).
- With model sessions: does each assumption hold when the spender starts tens to hundreds of minute-long units per
  window on 3 to 16 workers, token cost per unit known only roughly, two refilling windows, a rerun not the same
  run. Mark reasoned.
- Needs to know before use (value per unit, tokens per unit by kind and model, length estimate, ...).
- Status: quoted / summary / not opened (reason).
## Unknown   (topic 3 only: what the provider's pages do not say)
## Could not open   (title | routes tried, with URL | why)
## Needs the owner's sign-in   (title | URL)
```

## Return to the coordinator (at most ten lines)
The output path; sources read in full (count); could not open (count, with titles); the three results most useful
for our allowance or our scheduling, each with its number, mark and txt line.
