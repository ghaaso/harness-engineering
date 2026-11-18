# Lane budget (`a1`): a token allowance that refills, and long units with few workers

Read `ROUND.md` beside this file first. It sets the standards, the method and the limits.

## Why this lane

Two parts of the decision rule (`docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md`) still rest on
reasoning alone, and no lane of this round covers them:

1. **The token allowance.** A weekly window and a 5-hour window, each refilling on its own clock. The library
   says "no paper read" covers it (o2-0501). Under ruling r57-0029 that is a search task. The same problem has
   other names: pacing a budget over a horizon, selling a fixed stock before a deadline, credits that accrue and
   are spent, quotas per period. A look-up on 2026-11-19 found nothing in the library on any of them.
2. **Long units with few workers, on the scheduling side.** Our units last minutes and there are 3 to 16
   workers, so one worker is 6 to 33 % of the level. The papers read tuned their rules on thousands of
   microsecond jobs. Scheduling a few long jobs is also a classical problem: batch queues of supercomputers,
   project scheduling under limited resources. Nothing in the library on those either. (The writers lane reads
   the other half, long transactions.)

## The frame to test (the top session's reasoning, not a finding)

- A budget to be spent before a reset is a pacing problem: spend too fast and work stops before the reset; spend
  too slow and allowance is lost. The classical answer is one price: a unit is admitted only if its value per
  token is above the current price of a token, and the price rises as the budget runs short for the time left.
  Two nested windows are two budgets, and the dearer price binds.
- The price also answers "which model": the cheaper model does the unit when the dearer one's extra quality is
  worth less than its extra tokens at the current price.
- For a few long units, the gain is in what starts next and what fits in the gap before a long unit can start
  (backfilling), not in a fine control loop.

## Sub-topics, one collector each

1. **Pacing a budget.** `pacing`: budget pacing in online advertising, where the theory and the production
   systems both exist (Balseiro and Gur, "Learning in repeated auctions with budgets"; LinkedIn's and other
   companies' own accounts of their pacing controllers); throttling against price adjustment; what is measured.
2. **Allocation under a budget.** `allocation`: revenue management of a fixed stock over a horizon (Gallego and
   van Ryzin 1994; bid-price controls), bandits with knapsacks (Badanidiyuru, Kleinberg, Slivkins 2013), the
   online knapsack and its threshold rules. The rule each gives, how far from the best it can be, what it must
   know in advance.
3. **Quotas and credits in real systems.** `quotas`: token bucket and the generic cell rate algorithm; fixed and
   sliding windows; credits that accrue and are spent (burstable cloud instances, with the measured studies of
   them); a large provider's own account of client-side throttling and of handling overload (Google's site
   reliability book). Then the facts of our own allowance from its provider's public documentation: whether the
   5-hour and weekly windows are fixed or rolling, and how cached input counts. Quote the documentation; do not
   infer.
4. **A few long jobs.** `longjobs`: batch scheduling on supercomputers and backfilling (Mu'alem and Feitelson
   2001; the measured gains on real workload logs), resource-constrained project scheduling (the standard
   priority rules and what a survey says of their gaps to the optimum), stragglers and speculative re-execution
   in data-processing systems. What carries when a job's length is only roughly known.
5. **Budgets for language-model work.** `llmbudget`: published work on planning or routing under a token or cost
   budget (the library holds Hybrid LLM, RouteLLM, FrugalGPT: look up `cheaper`), agents with an explicit
   budget, and production accounts of teams that ran into usage limits and what they changed.

Search words for the library: `token bucket`, `quota`, `budget`, `allowance`, `window`, `cheaper`, `RouteLLM`,
`Graham`, `list`, `Borg`, `critical path`.

## What the report must settle

- A rule for spending a refilling allowance, stated in ratios (share of the window left against share of the time
  left), for one window and for two nested windows, with the source of each part and what it must know.
- How that rule chooses between a dearer and a cheaper model, and what measurement it needs (quality per token by
  kind of work).
- The facts of our windows as the provider documents them, quoted, with what stays unknown.
- For a few long units: the scheduling method with the largest measured gain, and what it needs to know about a
  unit's length.
- What each part would change in the decision rule's token and scheduling steps, from a small project to a very
  large one.
