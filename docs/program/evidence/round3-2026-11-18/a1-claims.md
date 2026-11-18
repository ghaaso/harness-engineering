# a1 claims: a refilling token allowance, and a few long units (step 2, draft)

Written 2026-11-19 by the a1 analyse step (Opus), from the five collect files `R:a1-collect-*.md` (with their second and
third attempts), the decision rule and the library. `R:` = `docs/program/evidence/round3-2026-11-18/`.

Marks. `proven`: stands in the literature at the cited place; this includes a provider's documentation (quoted with
its fetch date) and a company's own account (marked "self-reported"). `measured here`: none this round (ROUND.md
forbids measurement). `hypothesis`: no quotation carries it; the block says what it is inferred from.

Every quotation below was opened at its cited line by this step. Where the collect file gave another line, the line
here is the one found. Text extraction lost some symbols (square roots, Greek letters); they are shown as `[sqrt]`,
`[mu]`, `[rho]`, `[eps]`, `[Omega]`, `[gamma]`, `[delta]`, `[Psi]`. All paper texts were fetched 2026-11-19.
"Units per window" means the units of our work that one 5-hour or weekly window pays for: tens to hundreds (lane file).

## Pacing a budget over a horizon

### A01
- Claim: The dual-price rule keeps one price per resource and targets a constant consumption per period, raising the price when a request uses more than the target and lowering it when less.
- Mark: proven
- Quote: "By design, they target to consume a constant number of resources per period so as to deplete resources exactly at the end of the horizon. When a request consumes more (less) resources than the target, the corresponding dual variable is increased (decreased)."
- Where: `R:papers/budget/dmd/paper.txt:100-104` (Balseiro, Lu, Mirrokni, ICML 2020; left column)
- Holds when: horizon T known in advance; requests i.i.d. from an unknown distribution; revenue and consumption per step bounded; initial resources per step [rho] = budget / T fixed; the void action allowed.

### A02
- Claim: The same rule never runs out of budget too early (Proposition 2).
- Mark: proven
- Quote: "using the update rule of the dual variables, we can show that our algorithms never deplete resources too early (Proposition 2)"
- Where: `R:papers/budget/dmd/paper.txt:107-109`
- Holds when: as A01; the stopping time is within a constant of T that depends on the step size and the price cap (`dmd/paper.txt:426-432`, formula garbled, not quoted).

### A03
- Claim: The rule's regret is of order [sqrt]T when horizon and budget grow together, and no algorithm can do better in order.
- Mark: proven
- Quote: "attain regret of order O( T ) when the length of the horizon T and initial number of re- sources are scaled proportionally (Theorem1). Because no algorithm can attain regret lower than ( T ) under our minimal assumption (Lemma 1), these two results imply that our algorithms attain the optimal order of regret."
- Where: `R:papers/budget/dmd/paper.txt:74-79` (left column; [sqrt] and [Omega] lost)
- Holds when: asymptotic in T; budget proportional to T; the constant depends on the bounds on revenue and consumption per step and on the number of resources m, with a dependence the authors call sub-optimal (`dmd/paper.txt:379-380`, right column). At T of tens to hundreds the bound gives no number (see A78).

### A04
- Claim: The model has no refill inside a horizon: a consumed resource is gone.
- Mark: proven
- Quote: "The assumption bi >= 0 implies that we cannot re- plenish resources once they are consumed."
- Where: `R:papers/budget/dmd/paper.txt:300-301` (right column)
- Holds when: always in this model. A window that resets in full is therefore one horizon of this model, and the next window a new horizon (that mapping is A69, a hypothesis).

### A05
- Claim: The gradient pacing rule sets a target spend rate of budget over horizon, bids the value shrunk by one plus the multiplier, moves the multiplier by the gap between target and actual spend, clips it to [0, cap], and does not run out of budget too early.
- Mark: proven
- Quote: "[rho]k = Bk/T (target spend rate) ... submit bid bk,t = min vk,t/(1 + [mu]k,t), Bk,t ; ... [mu]k,t+1 <- P[0,[mu]] [mu]k,t - [eps]k([rho]k - zk,t) ... A convenient property of Algorithm 1 is that it does not run out of budget too early."
- Where: `R:papers/budget/budget-pacing-regret/paper.txt:246-256` (Gaitonde, Li, Light, Lucier, Slivkins, arXiv 2205.08674v6); the direction in words at `:243`: "decreases (resp., increases) her multiplier, by the amount proportional to the current deviation"
- Holds when: T and budget known; the no-early-stop property is Lemma 2.2 of Balseiro and Gur, stated for "possibly adaptive, randomized, adversarially generated" values (`:258-260`); values bounded.

### A06
- Claim: With adversarial values, budgeted bidding has no regret bound, only approximation ratios: the algorithm cannot know whether to spend now or save.
- Mark: proven
- Quote: "BwK problems in adversarial environments do not admit regret bounds: instead, one is doomed to approximation ratios, even against a time-invariant benchmark and even in relatively simple examples"
- Where: `R:papers/budget/budget-pacing-regret/paper.txt:115` (the phrase "spend-or-save dilemma" is on the same line)
- Holds when: any horizon; adversarial order of values.

### A07
- Claim: On a semi-synthetic simulation from Bing advertising data, the gradient rule's regret grew more slowly than T^(3/5).
- Mark: proven
- Quote: "regret rate less than"
- Where: `R:papers/budget/budget-pacing-regret/paper.txt:102` (exponent garbled in the text; T^(3/5) as the collect file reads it)
- Holds when: simulation on auction data; baseline the best fixed multiplier in hindsight; very many rounds. No percent gain given.

### A08
- Claim: For stochastic values, pacing (shading the bid) is generally better than throttling (skipping a share of rounds); for adversarial values throttling is also asymptotically optimal.
- Mark: proven
- Quote: "In the stochastic case, we demonstrate that pacing is generally superior to throttling for the advertiser, supporting the well-known result that pacing is asymptotically optimal in this scenario. However, in the adversarial case ... throttling is also an asymptotically optimal dynamic bidding strategy"
- Where: `R:papers/budget/dyn-throttling/paper.txt:18` (Chen et al., arXiv 2207.04690v7)
- Holds when: repeated second-price auctions; T known; competing price i.i.d.; average budget per step a constant fraction of the largest value.

### A09
- Claim: With adversarial values no throttling rule can guarantee more than the average budget per step divided by the largest value.
- Mark: proven
- Quote: "any throttling strategy's asymptotic competitive ratio cannot exceed the advertiser's regularized average budget (Theorem 3.2), i.e., the average budget divided by the maximum value"
- Where: `R:papers/budget/dyn-throttling/paper.txt:33`
- Holds when: adversarial values, asymptotic. Stated as a ratio: the guarantee shrinks as one unit's possible value grows against the budget per step.

### A10
- Claim: The best pacing multiplier makes the budget run out exactly at the end of the period, and multiplicative pacing wins more auctions at lower prices than probabilistic throttling.
- Mark: proven
- Quote: "An optimal multiplier will make the budget run out exactly at the end of the period, unless the buyer would not run out of budget even with the multiplier of 1" and "multiplicative pacing allows a buyer to participate in more auctions and win at lower prices, compared to probabilistic throttling"
- Where: `R:papers/budget/mpe/paper.txt:28`, `:29` (Conitzer, Kroer, Sodomka, Stier-Moses)
- Holds when: a static model with values and budgets known for the whole period; second-price auctions; no learning.

### A11
- Claim: Yahoo's pacing system re-plans every slot: the remaining budget is spread over the remaining slots.
- Mark: proven (self-reported)
- Quote: "after running for m time slots, the remaining budget becomes Bm. We need to decide the desired spending in each of the remaining time slots ... so that the total budg[et can be spent out]"
- Where: `R:papers/budget/smart-pacing/paper.txt:196` (Xu et al., KDD 2015)
- Holds when: a 24-hour budget; 15-minute slots (96 per day); tens of billions of requests a day on the platform; a response-rate model gives each request's value.

### A12
- Claim: In Yahoo's A/B test the gain came from ranking requests by predicted value, not from the pacing loop: cost per click fell 72, 67 and 79 percent against the same system with one global pacing rate, with spend equally smooth.
- Mark: proven (self-reported)
- Quote: "Compared to the baseline, the eCPC reductions are -72%, -67%, and -79% for the three campaigns respectively. ... the total spendings and spending patterns of our approach are as good as the baseline."; baseline: "our approach with only one layer (i.e. using a global pacing rate)"
- Where: `R:papers/budget/smart-pacing/paper.txt:446`, `:443`
- Holds when: 3 real campaigns, 24 h, 15-minute slots, 8 value layers; very many requests per slot.

### A13
- Claim: Yahoo chose throttling over bid modification because a throttling rate keeps pacing apart from the bid.
- Mark: proven (self-reported)
- Quote: "throttling with a pacing rate decouples pacing control from bid calculation"
- Where: `R:papers/budget/smart-pacing/paper.txt:133`
- Holds when: real-time bidding with reserve prices and a bid win-rate curve that is not smooth (same line).

### A14
- Claim: LinkedIn paces each daily budget against a plan proportional to forecast traffic: every minute the participation rate is multiplied by 1.1 when spend is at or under the plan and by 0.9 when above; the plain rule on spent over budget was slow to react.
- Mark: proven (self-reported)
- Quote: "pi,t = pi,t-1 (1 + rt) if si,t <= ai,t ... pi,t-1 (1 - rt) if si,t > ai,t" and "We set the adjustment rate rt at a constant 10%" and, of the rule on spent over budget, "We observed an improvement in revenue but not a significant increase in campaign life."
- Where: `R:papers/budget/linkedin/paper.txt:59`, `:73`, `:64` (Agarwal, Ghosh, Wei, You, KDD 2014)
- Holds when: tens of millions of page views a day; updates about every minute (`:88`); a traffic forecast per campaign.

### A15
- Claim: LinkedIn's "fast finish" plans as if there were no traffic in the last two hours of the day, so that forecast errors do not leave budget unspent.
- Mark: proven (self-reported)
- Quote: "we modify the allocation curve slightly so that the algorithm assumes there will not be any traffic during the last two hours of the day"
- Where: `R:papers/budget/linkedin/paper.txt:78`
- Holds when: 24-hour horizon; a forecast with errors; in ratios, the plan ends at 22/24 of the horizon.

### A16
- Claim: LinkedIn's pacing raised median campaign life from 13.54 to 19.50 hours (44 percent) where demand exceeds supply and from 6.92 to 17.25 hours (149 percent) where supply exceeds demand, and cut over-delivery from 4.12 to 2.39 percent.
- Mark: proven (self-reported)
- Quote: "Campaign life time (hours) 13.54 19.50"; "The algorithm increases campaign life time by 44%"; "Campaign life time (hours) 6.92 17.25"; "4.12% 2.39%"
- Where: `R:papers/budget/linkedin/paper.txt:128`, `:150`, `:242`, `:256`
- Holds when: baseline pacing off, alternate days over two weeks, tens of thousands of advertisers. The gain is a longer life of the budget, not more value per spend.

### A17
- Claim: Spend that is counted late lets fast spenders overrun their budget; pacing slows them and cuts the overrun.
- Mark: proven (self-reported)
- Quote: "There is a little time delay in the availability of the latest budget spent information ... the system often serves impressions to such campaigns even after the budget for the day has been spent. The pacing algorithm slows down the rate of spend of such campaigns and reduces the chances of over delivery."
- Where: `R:papers/budget/linkedin/paper.txt:154`
- Holds when: as A16.

## Allocation of a fixed stock over a horizon

### A18
- Claim: For selling a fixed stock by a deadline, one fixed price is asymptotically optimal, and its guaranteed share of the best dynamic policy is 1 - 1/(2[sqrt]n): at least 97.5 percent at 400 items, 95 at 100, 90 at 25.
- Mark: proven
- Quote: "simple, fixed price policies are asymptotically optimal as the volume of expected sales tends to infinity" and "a firm that has 400 items ... at least 97.5% of what could be obtained by using an optimal state-dependent strategy. For 100 items, the guarantee drops to 95%, while for 25 items, it is only 90%."
- Where: `R:papers/budget/gvr/paper.txt:22-23`, `:566-573` (Gallego and van Ryzin 1994, Theorem 3 at `:549-552`)
- Holds when: one resource; demand Poisson with a known intensity that falls with price; known deadline and stock; the 25-to-400 items is the only explicit bound read at the scale of our units per window.

### A19
- Claim: That fixed-price result holds only when the demand function is known in advance; otherwise prices must move.
- Mark: proven
- Quote: "The above fixed-price results hold only when the firm knows the demand function in advance"
- Where: `R:papers/budget/gvr/paper.txt:93-94` (right column)
- Holds when: as A18.

### A20
- Claim: The authors call the small-stock guarantees pessimistic.
- Mark: proven
- Quote: "these guarantees are in fact quite pessimistic"
- Where: `R:papers/budget/gvr/paper.txt:574-575`
- Holds when: their numerical example (next subsection, not read for numbers).

### A21
- Claim: Under bid-price control a request that uses several resources is accepted only if its fare exceeds the sum of the prices of all the resources it uses.
- Mark: proven
- Quote: "sold only if the offered fare exceeds the sum of the threshold prices of all the resources needed to supply the product"; "we accept a request for a particular itinerary if and only if there is available capacity and the fare exceeds the sum of the bid prices for all the units of capacity used by the itinerary"
- Where: `R:papers/budget/talluri/raw.txt:13-15`, `:396-399` (Talluri and van Ryzin 1998)
- Holds when: a network of resources each with its own capacity; demand with a known distribution.

### A22
- Claim: Summed bid prices are not optimal in general, but are asymptotically optimal when capacities and sales volumes are large, and the right prices are constant over time.
- Mark: proven
- Quote: "bid-price control is not optimal in general ... However, we prove that when leg capacities and sales volumes are large, bid-price controls are asymptotically optimal, provided the right bid prices are used. ... they are constant over time, even when demand is nonstationary"
- Where: `R:papers/budget/talluri/raw.txt:18-23`
- Holds when: capacities and periods scaled up together (the scaling u of Theorem 1; the bound 1 - O(u^-1/2) is at `raw.txt:1007-1013` in garbled form, so its constant is not read).

### A23
- Claim: The sum of prices is exactly right only when the opportunity cost of a request equals the sum of the opportunity costs of each resource sold alone.
- Mark: proven
- Quote: "is equal to the sum of the opportunity costs of selling each leg i separately"
- Where: `R:papers/budget/talluri/raw.txt:675-676` (Proposition 2; formula garbled)
- Holds when: as A21. For two windows that count the same tokens, this additivity is not shown (A71).

### A24
- Claim: In practice the deterministic problem behind the bid prices is re-solved often, so that prices follow the remaining capacity and time.
- Mark: proven
- Quote: "in actual applica- tions, the approximation is usually resolved fre-"
- Where: `R:papers/budget/talluri/raw.txt:1335-1336` (continued in the garbled next lines; `paper.txt:905-907` has the same sentence)
- Holds when: airline and hotel practice as the authors describe it.

### A25
- Claim: With several budgets and time counted as one of them, the process stops when any one budget is spent; one price per budget learned on the way gives regret O([sqrt](m OPT) + OPT [sqrt](m/B)), optimal up to log factors.
- Mark: proven
- Quote: "The process stops at the first time when the total consumption of some resource exceeds its budget"; "There is a known, finite time horizon T. We model it as one of the resources"; "we parameterize our regret bound by B = mini Bi, the smallest budget constraint"
- Where: `R:papers/budget/bwk/paper.txt:151-153`, `:159-160`, `:269` (Badanidiyuru, Kleinberg, Slivkins); bound at `:273-276` (symbols lost), optimality at `:298-299`
- Holds when: each arm's outcomes i.i.d. from a fixed joint distribution (`:155-157`); consumption per step in [0,1]; B large against m (arms). With m = model-and-kind pairs and B = units per window, the second term is not small (A78).

### A26
- Claim: Without knowing the distribution, only the number of requests, a price-per-budget rule gets 1 - [eps] of the offline optimum when no request is more than a small share [gamma] of any budget.
- Mark: proven
- Quote: "obtains a 1-[eps] fraction of the profit obtained by an algorithm that knows the entire request sequence ahead of time. The factor [eps] approaches 0 when no single request consumes/contributes a significant fraction"; "Algorithm 2 does not require any knowledge of the distribution at all"; "The algorithm knows m, the total number of requests"
- Where: `R:papers/budget/devanur2/paper.txt:11-15`, `:460`, `:412` (Devanur, Jain, Sivan, Wilkens); condition [gamma] = O([eps]^2 / log(n/[delta])) at `:458-459` (garbled)
- Holds when: requests i.i.d.; m known; every request a small share of every budget.

### A27
- Claim: For the online knapsack with no clock, a threshold on value per unit of budget that rises with the share of budget already used is the best possible in the worst case, with competitive ratio ln(U/L) + 1, worsening by 1/(1 - [eps]0) when the largest item is a share [eps]0 of the budget.
- Mark: proven
- Quote: "Let [Psi](z) = (Ue/L)^z (L/e). At time t, let z(t) be the fraction of capacity filled, pick element t iff v(t)/w(t) >= [Psi](z(t))"; "the algorithm will pick all items available until" [a fraction 1/(1+ln(U/L)) is filled]; "the above algorithm has a competitive ratio of ln(U/L) + 1"; "the competitive ratio is actually ln(Ue/L) 1/(1 - [eps]0)"; "The competitive ratio of any (possibly randomized) online algorithm for the online knapsack problem is at least ln(U/L) + 1."
- Where: `R:papers/budget/zhou/paper.txt:457-470`, `:481-487`, `:586-592`, `:598-600` (Zhou, Chakrabarty, Lukose, report version of WINE 2008; archived copy, truncated in section 6; file read with `grep -a`)
- Holds when: every item much smaller than the budget (`:247`) and value per weight between known bounds L and U (`:248-250`); without them "there can be no online algorithm achieving any non-trivial competitive ratio" (`:222-224`); no clock, no refill, adversarial order.

### A28
- Claim: In the one simulation read, the unmodified threshold rule kept about 45 percent of an omniscient bidder's value and spent only 64 percent of the budget.
- Mark: proven
- Quote: "around 45%"; "spends only 64% of the budget"
- Where: `R:papers/budget/zhou/paper.txt:963`, `:968-969`
- Holds when: their synthetic and bid data; the rest of section 6 is missing from the archived file, so the abstract's "above 90%" with tuning (`:36-38`) is not checked against a table.

## Quotas and several budgets in real systems

### A29
- Claim: The two-rate marker charges one packet to two buckets on two rates: green only if both cover it, then both are charged.
- Mark: proven
- Quote: "If Tp(t)-B < 0, the packet is red, else"; "the packet is green and both Tp and Tc are decremented by B"
- Where: `R:papers/budget/rfc2698/paper.txt:136`, `:141` (RFC 2698, 1999)
- Holds when: packet size known on arrival; a specification, no measured gain.

### A30
- Claim: Under several rate contracts at once, a cell conforms only if it conforms to every one, and a refused cell leaves the state unchanged.
- Mark: proven
- Quote: "A cell is then conforming only if it conforms to all instances of the GCRA against which cells with its CLP state are tested"; "the TAT is unchanged"
- Where: `R:papers/budget/gcra2/tm40.txt:1405-1406`, `:3599` (ATM Forum TM 4.0, 1996)
- Holds when: the cost of each cell is known (the increment I); a definition, no measured gain.

### A31
- Claim: Stripe holds back a fixed share of capacity for critical requests and rejects non-critical requests above their share.
- Mark: proven (self-reported)
- Quote: "We always reserve a fraction of our infrastructure for critical requests. If our reservation number is 20%, then any non-critical request over their 80% allocation would be rejected with status code 503."
- Where: `R:papers/budget/stripe2/page.txt:36`
- Holds when: many users on one fleet; no before-and-after figure, so no measured gain.

### A32
- Claim: Google's client-side throttling lets a client send until its requests are K times its accepts, with K = 2 preferred, and allows retries while they are under 10 percent of requests.
- Mark: proven (self-reported)
- Quote: "We generally prefer the 2x multiplier"; retries allowed while the ratio is "below 10%"
- Where: `R:papers/budget/sre-overload/page.txt:110`, `:155` (SRE book ch. 21)
- Holds when: very many requests, a two-minute history; "work well in practice" with no baseline figure.

### A33
- Claim: Retries multiply across layers, and Google advises a retry budget for the whole server.
- Mark: proven (self-reported)
- Quote: "Consider having a server-wide retry budget." and "a single user action may create 64 attempts (4^3)"
- Where: `R:papers/budget/sre-cascading/page.txt:204`, `:205` (SRE book ch. 22)
- Holds when: cheap requests on a server fleet; qualitative, no measured gain.

### A34
- Claim: Burstable cloud credits accrue while use is under the baseline, up to 24 hours of earning, and do not expire on a running instance: the opposite shape of a window that resets.
- Mark: proven (provider documentation, AWS, fetched 2026-11-19)
- Quote: "equal to the number of maximum credits earned in 24 hours"; "CPU credits on a running instance do not expire"
- Where: `R:papers/budget/aws-credits/page.txt:144-145`, `:430`
- Holds when: EC2 burstable instances.

### A35
- Claim: The provider's API (not the plans) limits rate with a token bucket that refills continuously, and tokens read from cache do not count toward its input-tokens-per-minute limit.
- Mark: proven (provider documentation, Anthropic API docs, fetched 2026-11-19)
- Quote: "The API uses the token bucket algorithm to do rate limiting. This means that your capacity is continuously replenished up to your maximum limit, rather than being reset at fixed intervals."; "cache_read_input_tokens (tokens read from cache) ... Do NOT count toward ITPM"
- Where: `R:papers/budget/claude-limits/p4.txt:20`, `:71`
- Holds when: API rate limits only; says nothing of the plan windows.

## The facts of our windows (provider documentation, fetched 2026-11-19)

### A36
- Claim: Paid plans have a session limit that resets every five hours and weekly limits that reset once a week.
- Mark: proven (provider documentation)
- Quote: "Paid plans have two types of usage limits: a session limit that resets every five hours, and weekly limits that reset once every week."
- Where: `R:papers/budget/claude-limits/p1.txt:102` (support.claude.com article 11647753)
- Holds when: paid plans; "Verified Ultra accounts don't have a five-hour limit" (`p1.txt:109`).

### A37
- Claim: The 5-hour period starts at the first message and resets in full five hours later: a window anchored at first use, not a fixed clock and not a rolling sum.
- Mark: proven (provider documentation)
- Quote: "The period starts when you send your first message, and your limit resets in full five hours later."
- Where: `R:papers/budget/claude-limits/p1.txt:107`
- Holds when: as A36. What starts the next period after a reset is not stated.

### A38
- Claim: Weekly limits apply across all models, some plans add a separate weekly limit for Fable, and the weekly reset is at a fixed time per account with the full allowance each cycle.
- Mark: proven (provider documentation)
- Quote: "Weekly limits apply across all models, and some plans also have a separate weekly limit for Fable. Weekly limits reset at a fixed time each week that is assigned to your account. Your reset day and time stay the same regardless of when you start using Claude or when your subscription begins, and you receive your full weekly allowance each cycle."
- Where: `R:papers/budget/claude-limits/p1.txt:111`; for plans: "Max and Ultra plans also have a separate weekly limit for Fable. These limits are shared across Claude and Claude Code" (`R:papers/budget/claude-limits/p2.txt:123`)
- Holds when: as stated. Not stated: whether Fable use is charged to both weekly limits; whether an unspent part carries over.

### A39
- Claim: Use on claude.ai, Claude Code and Claude Desktop counts toward the same limit.
- Mark: proven (provider documentation)
- Quote: "towards the same usage limit"
- Where: `R:papers/budget/claude-limits/p1.txt:104`
- Holds when: as stated; so the owner's other sessions draw on the same windows.

### A40
- Claim: What counts is the length and complexity of conversations, the features, the model and the effort level; long conversations that trigger automatic context management cost more.
- Mark: proven (provider documentation)
- Quote: "the length and complexity of your conversations, the features you use, which Claude model you're chatting with, and the effort level"; "Longer conversations that trigger automatic context management consume more of your usage limit."
- Where: `R:papers/budget/claude-limits/p1.txt:103`, `:127`
- Holds when: no weights are given.

### A41
- Claim: At a limit a session may finish the step in progress on a small, capped wrap-up allowance that counts toward the weekly limit; on Max this applies at each 5-hour limit.
- Mark: proven (provider documentation)
- Quote: "it may keep working briefly so it can finish the step in progress"; "This wrap-up allowance is small and capped, and the usage counts toward your weekly limit."
- Where: `R:papers/budget/claude-limits/p2.txt:124` (Pro and Max frequency at `:125`; "rolling out gradually" at `:126`)
- Holds when: as stated; a unit of many steps is not promised to finish.

### A42
- Claim: For claude.ai projects, cached content counts less against the limits, and the cache lapses after a period of inactivity.
- Mark: proven (provider documentation)
- Quote: "Content in projects is cached and counts less against your limits when reused."; "Caches expire after a period of inactivity."
- Where: `R:papers/budget/claude-limits/p5.txt:111-112`, `:142`
- Holds when: claude.ai projects; no ratio given; nothing said of Claude Code.

### A43
- Claim: The provider may change the limits and guarantees no uninterrupted service.
- Mark: proven (provider documentation)
- Quote: "We may adjust usage limits at our discretion"
- Where: `R:papers/budget/claude-limits/p1.txt:113`
- Holds when: always; a measured window size can change.

## Model work under a token or cost budget

### A44
- Claim: AutoMix routes to the large model only when the small model's self-check doubts its answer, and cut cost by over half at comparable performance.
- Mark: proven
- Quote: "reducing computational cost by over 50% for comparable performance"
- Where: `R:papers/budget/automix/raw.txt:7`; costs are fixed ratios per model ("fixed costs", `:224`)
- Holds when: five datasets of short context-answer tasks; GPT-4 as large model; cost ratios 1:60 to 1:200 fixed per query; not coding.

### A45
- Claim: RouteLLM's learned routers needed 3.66 times less cost than random routing to reach 95 percent of GPT-4's quality on MT Bench, but only 1.41 times on MMLU and 1.49 on GSM8K, and routers trained on chat data alone were no better than random on MMLU.
- Mark: proven
- Quote: "Table 6, cost saving over random routing: MT Bench 3.66x (CPT(50%), at 95% of GPT-4 quality) ... MMLU 1.41x (92%) ... GSM8K 1.49x (87%)"; "all routers perform poorly at the level of the random router when trained only on Arena dataset"
- Where: library o2-0321, cited place `docs/program/evidence/bottleneck-2026-11-18/o2-quota.md:88` (which quotes the paper's txt 472-476, 577-581)
- Holds when: GPT-4 against Mixtral 8x7B; savings in GPT-4 calls priced in dollars; baseline random routing at the same quality, not all-GPT-4.

### A46
- Claim: FrugalGPT's cascade reached the best single model's accuracy at 98.3, 73.3 and 59.2 percent lower cost on three datasets.
- Mark: proven
- Quote: "Table 3, cost to reach the same accuracy as the best single model: HEADLINES 98.3% saving (best model GPT-4); OVERRULING ... 73.3% saving (GPT-4); COQA 59.2% saving (GPT-3)"
- Where: library o2-0322, cited place `docs/program/evidence/bottleneck-2026-11-18/o2-quota.md:80`
- Holds when: classification and reading tasks; dollars at March 2023 prices; a learned scorer; baseline the best single model.

### A47
- Claim: Hybrid LLM sent 20 or 40 percent of queries to the small model for at most 1 or 4 percent quality loss when the gap was medium, but lost 10.3 percent at 40 percent when the gap was large.
- Mark: proven
- Quote: "All routers achieve 20% (40%) cost advantage with <= 1% (<= 4%) quality drop"; "at 10.3% quality drop for 40% cost advantage"
- Where: library o2-0320, cited places `docs/program/evidence/bottleneck-2026-11-18/o2-quota.md:96`, `:98`
- Holds when: MixInstruct, BART score; saving in share of queries, not tokens.

### A48
- Claim: A cascade that accepts the weak model's answer when its samples agree matched GPT-4 with self-consistency (0.929 against 0.931) at 40 percent of its cost.
- Mark: proven
- Quote: "the four MoT variants achieve comparable task performance (0.929 accuracy) to GPT-4-CoT-SC (0.931) while demanding only 40% of its cost"
- Where: library o2-0323, cited place `docs/program/evidence/bottleneck-2026-11-18/o2-quota.md:112`
- Holds when: six reasoning sets; relative money cost including the weak model's samples.

### A49
- Claim: Allocating test-time compute by the prompt's difficulty matched best-of-N with about four times less compute, but the difficulty came from an oracle correctness check.
- Mark: proven
- Quote: "we can improve the efficiency of test-time compute scaling by more than 4[x] compared to a best-of-N baseline"; "assumes oracle access to a ground-truth correctness checking function, which is of course not available upon deployment"
- Where: `R:papers/budget/snell/paper.txt:23`, `R:papers/budget/snell/raw.txt:179`
- Holds when: MATH, PaLM 2-S*; one model family; a verifier.

### A50
- Claim: Telling the model a token budget in the prompt cut output tokens by 67 percent with under 3 percent accuracy loss.
- Mark: proven
- Quote: "On average, TALE-EP achieves a 67% reduction in token usage while maintaining accuracy with less than a 3% decrease."
- Where: `R:papers/budget/tale/paper.txt:95-98` (right column)
- Holds when: GPT-4o-mini; maths word problems; the model's own output tokens, against vanilla chain of thought.

### A51
- Claim: A hard cap on thinking tokens bounds a unit; extending thinking raised AIME24 from 50 to 57 percent and then flattened at about six times.
- Mark: proven
- Quote: "from 50% to 57% on AIME24"; "it does eventually flatten out at six times"
- Where: `R:papers/budget/s1/raw.txt:9`, `:395`
- Holds when: one fine-tuned 32B model; 30 questions.

### A52
- Claim: Showing an agent its remaining tool budget gave the same accuracy at a budget of 10 as plain ReAct at 100, at 31.3 percent lower cost; the authors budget tool calls because a token budget is hard to set in advance.
- Mark: proven
- Quote: "reducing overall cost by 31.3%"; a token budget "for multi-step agentic tasks is often impractical"
- Where: `R:papers/budget/bats/raw.txt:187`, `:65`
- Holds when: BrowseComp, Gemini-2.5-Pro; budget per question, not a refilling window.

### A53
- Claim: An agent told its costs in the prompt still broke a hard budget in 32.8 percent of tasks; enforcement had to sit outside the model.
- Mark: proven
- Quote: "it still violates budgets in a substantial fraction of tasks (a notable 32.8% for GPT 4.1 mini)"
- Where: `R:papers/budget/intent/raw.txt:339`
- Holds when: simulated priced tools; GPT 4.1 mini.

### A54
- Claim: In Anthropic's research system, token use explained 80 percent of the variance in performance, a better model gained more than doubling the token budget, and multi-agent work used about 15 times the tokens of chat.
- Mark: proven (self-reported)
- Quote: "token usage by itself explains 80% of the variance"; "upgrading to Claude Sonnet 4 is a larger performance gain than doubling the token budget on Claude Sonnet 3.7"; "multi-agent systems use about 15[x] more tokens than chats"
- Where: `R:papers/budget/anthropic-multiagent/page.txt:36`, `:36`, `:37`
- Holds when: breadth-first research on BrowseComp and an internal eval; the post says "most coding tasks involve fewer truly parallelizable tasks than research" (`:37`).

## A few long jobs

### A55
- Claim: On four real supercomputer logs, backfilling with system-predicted lengths, a correction when a job outlives its prediction, and shortest-first backfilling (EASY++) cut average wait by 23 percent and bounded slowdown by 37 percent against EASY with user estimates; shortest-first alone gave 10 and 22 percent; exact lengths gave 22 and 47 percent.
- Mark: proven
- Quote (Table 4.3, rows and the average row): "SDSC 363 361 -0% 327 -10% 278 -23% 99 87 -12% 70 -29% 58 -42%"; "CTC 21 19 -10% 14 -33% 19 -10% 4.6 3.9 -14% 2.9 -37% 2.8 -39%"; "KTH 114 102 -11% 95 -17% 91 -20% 90 73 -19% 57 -36% 50 -44%"; "BLUE 130 102 -21% 87 -33% 87 -33% 35 21 -42% 19 -47% 13 -64%"; "avg. ... -22% ... -37% ... -47%" / "-10% -23% ... -22%"
- Where: `R:papers/budget/tsafrir/paper.txt:4144-4148` (Tsafrir PhD thesis 2006, ch. 4, the work of Tsafrir, Etsion, Feitelson, TPDS 2007). Columns: EASY, EASY+SJBF, EASY++, PERFECT++ for wait and for bounded slowdown. The average row's split across two lines is read as wait -10 / -23 / -22 and slowdown -22 / -37 / -47; the four rows give the same averages by arithmetic.
- Holds when: simulation replaying real logs (A56); one job needs a fixed number of processors for its run; user estimates stay the kill limit.

### A56
- Claim: Those logs are 100 to 1,152 processors, 28,490 to 223,407 jobs over 11 to 32 months, load 56 to 84 percent, with mean run times of 73 to 188 minutes.
- Mark: proven
- Quote: "CTC ... 512 Jun 96 May 97 11 56% 79,302 77,222 77,222 188"; "KTH ... 100 Sep 96 Aug 97 11 69% 28,490 28,490 28,490 148"; "SDSC ... 128 Apr 98 Apr 00 24 84% 73,496 59,725 54,053 123"; "1,152 Apr 00 Jan 03 32 76% 250,440 243,314 223,407 73"
- Where: `R:papers/budget/tsafrir/paper.txt:2221-2227` (two-column layout splits the SDSC and BLUE rows)
- Holds when: as stated. Job lengths are of our order (minutes to hours); worker counts are 1 to 2 orders above our 3 to 16.

### A57
- Claim: Replacing user estimates by predictions without correction raised accuracy by 49 percent on average but made wait 454 percent and slowdown 515 percent worse, because under-predicted running jobs push the reservation to the present and stop backfilling.
- Mark: proven
- Quote: "avg. +454% +515% +49%" (Table 4.1); "performance is worsened by up to an order of magnitude!"; "the reservation is made for the present time effectively stopping all backfilling activity"
- Where: `R:papers/budget/tsafrir/paper.txt:3915-3917` (table caption `:3918-3920`; per-log rows `:3911-3914`), `:1977-1978`, `:1982`
- Holds when: as A55. The harm comes from the direction of the error (too short), not its average size.

### A58
- Claim: Doubling users' estimates (making them less accurate, all too long) tends to help, but EASY++ beats doubling by a wide margin and comes close to shortest-job-first.
- Mark: proven
- Quote: "In both cases making estimates less accurate by doubling ("X2") tends to help."; "EASY++ outperforms X2 by a wide margin for all traces and both metrics. It is also rather close to SJF scheduling in all cases"
- Where: `R:papers/budget/tsafrir/paper.txt:839`, `:4401-4402`
- Holds when: as A55.

### A59
- Claim: The predictor is the mean of the same user's last two finished jobs, and using more history made results worse.
- Mark: proven
- Quote: "averaging the runtime of the two most recently submitted (and already terminated) jobs by the same user"; "the more history we exploit when making a prediction, the worse the resulting performance becomes"
- Where: `R:papers/budget/tsafrir/paper.txt:1865-1866`, `:1879-1880`
- Holds when: users submit streams of similar jobs.

### A60
- Claim: Backfilling raised average utilisation from 40-60 percent to about 70 percent on five supercomputers over eleven years, and comes close to schemes that preempt or migrate.
- Mark: proven (secondary: the thesis cites another study)
- Quote: "consistent figures of 40-60% average utilization have gone up to around 70%, once backfilling was introduced"; "backfilling was shown to be a close second to more sophisticated algorithms that involve preemption (time slicing), migration, and dynamic partitioning"
- Where: `R:papers/budget/tsafrir/paper.txt:666-668`, `:674-675`
- Holds when: the cited study's machines; not read in its own text.

### A61
- Claim: EASY needs a stated length for every job and kills a job that outlives it, to keep the reservation.
- Mark: proven
- Quote: "EASY required users to provide a runtime estimate for all submitted jobs"; "jobs that exceed their estimates are killed, so as not to violate subsequent commitments (the reservation)"
- Where: `R:papers/budget/tsafrir/paper.txt:688`, `:689-690`
- Holds when: as A55.

### A62
- Claim: Backfilling starts a later job early only if it does not make the first waiting job wait longer.
- Mark: proven
- Quote: "Backfilling provides a way to fill in the idle nodes caused by the situation just described with other jobs further down the queue, provided that they do not cause the first job in the queue to wait any longer for the nodes they require."
- Where: `R:papers/budget/lifka95/paper.txt:186-189` (Lifka, JSSPP 1995; ligatures lost in the text: "back lling", "rst")
- Holds when: users state each job's minutes; fixed node count per job; no measured figure in this paper.

### A63
- Claim: For project scheduling with exact durations, the best search methods are within 0.10 percent of the optimum at 30 activities (1,000 schedules), 10.71 to 11.73 percent above the critical-path lower bound at 60 activities, and 31.24 to 34.07 percent above that bound at 120 activities.
- Mark: proven
- Quote: "The parameters pj, rj,k, and Rk are assumed to be nonnegative and deterministic."; "Kochetov, Stolyar [31] 0.10 0.04 0.00"; "Debels et al. [17] 11.73 11.10 10.71"; "Valls et al. [77] 34.07 32.54 31.24"
- Where: `R:papers/budget/kolisch06/paper.txt:35-36`, `:461` (Table 1, J30, caption `:539`), `:546` (Table 2, J60, caption `:623`), `:630` (Table 3, J120, caption `:707`); Kolisch and Hartmann 2006; columns 1,000 / 5,000 / 50,000 schedules. Each caption follows its table in this text. The collect file gave the `:546` row as J120: it is the J60 table.
- Holds when: durations known exactly; 4 resource types; one project. The J60 and J120 figures are gaps to a lower bound, not to the optimum, so they overstate the gap to the best schedule by an unknown amount. No result for rough durations.

### A64
- Claim: Google's backup copies of the last running tasks cost a few percent more resources, and without them a sort took 44 percent longer.
- Mark: proven (self-reported)
- Quote: "We have tuned this mechanism so that it typically increases the computational resources used by the operation by no more than a few percent."; "takes 44% longer to complete when the backup task mechanism is disabled"
- Where: `R:papers/budget/mapreduce/paper.txt:158`
- Holds when: one benchmark; hundreds to thousands of machines; only the tail copied; a duplicate is discarded.

### A65
- Claim: LATE copies the running task expected to finish last, estimating time left from a constant progress rate, caps copies at 10 percent of slots, and finished jobs 27 percent faster than Hadoop's own speculation (58 percent with stragglers induced).
- Mark: proven
- Quote: "We always speculatively execute the task that we think will finish farthest into the future"; "This assumes that tasks make progress at a roughly constant rate."; "set the SpeculativeCap to 10% of available task slots"; "LATE finished jobs 27% faster than Hadoop's native scheduler"; "58% faster than Hadoop's native scheduler"
- Where: `R:papers/budget/late/paper.txt:171`, `:172`, `:191`, `:414`, `:452`
- Holds when: EC2 virtual machines sharing hosts, 30 GB sort, 6 runs; a progress score per task; machines differing 2 to 3 times in speed.

### A66
- Claim: Mantri does not restart a task that is long because it has more work, and cut job completion time by 32 percent in production.
- Mark: proven (self-reported)
- Quote: "A task that runs for long because it has more work to do will not be restarted"; "reduces the completion time of jobs by 32%"
- Where: `R:papers/budget/mantri/paper.txt:30`, `:32`
- Holds when: a Bing production cluster of thousands of servers; progress reports.

### A67
- Claim: Cloning every task of small jobs from the start, within 5 percent of capacity, cut small jobs' completion time 34 to 46 percent against LATE and Mantri.
- Mark: proven
- Quote: "Dolly improves the average completion time of the small jobs by 34% to 46%, respectively, with LATE and Mantri as baselines. These improvements come with a resource budget of merely 5%"
- Where: `R:papers/budget/dolly/paper.txt:26`
- Holds when: 150 nodes replaying Facebook and Bing traces; small jobs a small share of resources (heavy-tailed sizes).

### A68
- Claim: List scheduling on identical machines is within 2 - 1/m of the best makespan for any list, and within 4/3 - 1/(3m) for longest first.
- Mark: proven
- Quote: "Graham ... showed that list scheduling has a competitive ratio of (2 - 1/m) for the makespan objective on identical machines"
- Where: library o2-0331 and r57-0309, cited place `docs/program/evidence/bottleneck-2026-11-18/o2-classical.md:108`; the 4/3 - 1/(3m) for longest first is the collector's restatement at `o2-classical.md:92` and r57-0309 (Graham 1966)
- Holds when: independent jobs, no precedence, exact lengths, m identical machines; worst case.

## Our case (no quotation: inferred)

### A69
- Claim: For one window the published rule, written in ratios, keeps a price that grows with the gap between the share of the window used u and the share of its time elapsed s, and is zero when u <= s; the re-planned form sets the next stretch's spend to (1 - u)/(1 - s) times the even rate.
- Mark: hypothesis
- Inferred from: A05 (the update moves [mu] by [eps] times spend minus B/T each round; summed from [mu] = 0 that is [eps] B (u - s) until the clip at 0 first binds), A01, A11 (remaining budget over remaining slots), A04 (one window = one horizon).
- Holds when: as A01 and A05; the window's start and length known (A37, A38).

### A70
- Claim: A unit starts when its value is at least its expected tokens times the price; when demand stays under the window's line the price stays at zero and every unit that fits is admitted.
- Mark: hypothesis
- Inferred from: A01 (take a request when revenue exceeds price times use), A05 (clip at 0), A10 (multiplier 1 when the budget would not run out anyway).

### A71
- Claim: With nested windows (5-hour, week, and a per-model week), a unit must fit in every window it draws on, and it is charged the sum of those windows' prices, not the dearer price alone.
- Mark: hypothesis
- Inferred from: A29 and A30 (admission only if every bucket covers it), A21, A25, A26 (one price per budget, summed over the budgets a request uses); A23 says the sum is exact only when costs are additive, which is not shown for two windows that count the same tokens.

### A72
- Claim: The sum reduces to the dearer price alone whenever only one window is ahead of its line, since the other window's price sits at zero.
- Mark: hypothesis
- Inferred from: A05 (each price clipped at 0 and lowered while spend is under target), A71.

### A73
- Claim: Which window binds over a week is set by one ratio, k = (weekly size)/(5-hour size): with work running round the clock, the week binds on average when k is under 168/5 = 33.6, and the 5-hour window binds only within bursts.
- Mark: hypothesis
- Inferred from: A36, A37, A38 (window lengths); the sizes are not documented (A36 to A43), so k is a measurement.

### A74
- Claim: The same price chooses the model: the cheaper model does a unit when the dearer one's extra quality is worth less than the summed price times the extra tokens it charges, its own per-model window included; at zero price the better model is chosen and tokens break ties.
- Mark: hypothesis
- Inferred from: A01 (value against price times use), A08 (shading a bid, here a cheaper model, against skipping), A38 (a per-model weekly window), A45 to A48 (gaps differ by kind of work). No source read applies a pacing price to the choice of model.

### A75
- Claim: Tokens of units still running are not yet counted, so the window needs a reserve for them, as LinkedIn's late spend count needed pacing.
- Mark: hypothesis
- Inferred from: A17, A41; library x20-0460 (designed-only) sets a hard limit below the allowance by latency times spend rate.

### A76
- Claim: The plan should reach the end of the window's allowance one unit length before the reset ("fast finish"), because a unit started near the limit may stop after its current step.
- Mark: hypothesis
- Inferred from: A15 (plan ends at 22/24 of the day), A41 (only the step in progress may finish). Whether an unspent part is lost at the reset is not documented (A37, A38).

### A77
- Claim: In the real systems read, ranking work by value per spend carried the large gain, while the pacing loop carried the life of the budget and fewer overruns.
- Mark: hypothesis
- Inferred from: A12 (value layers: -67 to -79 percent cost per click, same smoothness), A16, A17.

### A78
- Claim: At tens to hundreds of units per window the asymptotic bounds give no number: the regret term of A03 is an unknown constant times 1/[sqrt]T of the optimum (0.1 to 0.3 times it at T = 100 to 10), the BwK term OPT[sqrt](m/B) is not small when B is tens and m is the number of model-and-kind pairs, and A26 needs one unit to be a tiny share of each budget; only A18 states numbers at our scale (90 percent at 25 units, 95 at 100), and only for a known demand.
- Mark: hypothesis
- Inferred from: A03, A18, A19, A25, A26, A27 (the factor 1/(1 - [eps]0) when one unit is a share [eps]0 of the window).

### A79
- Claim: For our units, backfilling means: hold a reservation for the oldest waiting unit that does not fit now, start a later unit only if it cannot delay that reservation, take those candidates shortest first, and predict a unit's length from the last two finished units of the same class and model, raised to the cap when a unit outlives its prediction.
- Mark: hypothesis
- Inferred from: A55, A57, A58, A59, A61, A62. Applies only when some unit needs a share of a resource that is not free now (a window, memory, the check); if every unit takes one worker and nothing else, it reduces to shortest first among fitting units.

### A80
- Claim: A speculative copy of a slow unit pays a whole unit's tokens, so it fits only when every window's price is zero and unit lengths have a heavy tail; with 3 to 16 workers a 5 to 10 percent cap is at most one worker.
- Mark: hypothesis
- Inferred from: A64 to A67 (copies of the tail only, capped at 5 to 10 percent of capacity; not for a unit long because it has more work), A69.

### A81
- Claim: For a fixed batch that must all finish, longest first has the tighter worst case (1.22 to 1.31 times the best for 3 to 16 workers, against 1.67 to 1.94 for any order); for a stream judged by wait, shortest first lowers wait (A55).
- Mark: hypothesis
- Inferred from: A68 (arithmetic on 4/3 - 1/(3m) and 2 - 1/m for m = 3 and 16), A55.

### A82
- Claim: When demand exceeds a window, the allowance limits starts from the moment spend runs ahead of the window's time share, not only when the window is nearly spent.
- Mark: hypothesis
- Inferred from: A01, A05 (the price rises with any spend above target), A14 (a rule on spent over budget alone was slow to react).
