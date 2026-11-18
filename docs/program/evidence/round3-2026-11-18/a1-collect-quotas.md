# a1 collect quotas: quotas and credits in real systems, and the facts of our allowance
Fetched 2026-11-19 (all pages). Papers folder `R:papers/budget/<short>/` (ignored by git). "txt N" is a line of the saved text file named.
p1 = claude-limits/p1.txt, p2 = p2.txt, p3 = p3.txt (prompt caching), p4 = p4.txt (rate limits), p5 = p5.txt (usage limit best practices), all in `R:papers/budget/claude-limits/`.

## Gate summary
1. RFC 2697 srTCM (rfc2697/paper.txt): one rate CIR feeds two buckets, C (size CBS) then E (size EBS); green / yellow / red. quoted, txt 122-147.
2. RFC 2698 trTCM (rfc2698/paper.txt): two buckets, P (rate PIR) and C (rate CIR); red if P is short, yellow if only C is short, green spends both. quoted, txt 122-141.
3. GCRA (gcra/wiki.txt): one stored time (TAT), no refill loop; secondary source (Wikipedia on ATM Forum / ITU-T I.371), not the standard. summary-grade, txt 151-162.
4. Cloudflare sliding window (cloudflare-sliding/page.txt): rate approximated from current and previous fixed window; "0.003%" wrongly decided on 400 M requests, self-reported. quoted, txt 61-74.
5. Google SRE book ch. 21 (sre-overload/page.txt): adaptive throttling from requests against K x accepts over two minutes; K = 2 preferred; per-client retry budget 10 %. quoted, txt 98-111, 151-155. The rejection-probability formula is an equation not captured in the text: unknown here.
6. Google SRE book ch. 22 (sre-cascading/page.txt): saved, not read for a number.
7. AWS burstable credits (aws-credits/page.txt): credits earned at the baseline rate, spent above it, accrual cap = 24 h of earning, no expiry while running. quoted, txt 61-77, 143-147, 429-436.
8. Anthropic help centre, usage limits (p1): 5-hour window starts at the first message; weekly limit resets at a fixed per-account time; a separate weekly limit for one model on some plans. quoted, txt 102-111.
9. Anthropic help centre, Claude Code with plans (p2): limits shared across surfaces; wrap-up allowance counted to weekly. quoted, txt 122-125.
10. Anthropic API docs (p4, p3): token bucket; cache reads not in the input-token-per-minute limit (API, not plans). quoted, p4 txt 20, 71, 76; p3 txt 498.
11. Wang and others, SIGMETRICS 2017: could not open (abstract only).

## From the library
- o2-0317 (result, quoted): Parekh and Gallager 1993, token bucket (sigma, rho) gives a guaranteed rate and worst-case delay. Gives the bucket model; not read again.
- o2-0404 (hypothesis): spend before a window resets "if its unspent part is lost at the reset (not known for this allowance)". The pages below say a reset is "in full" (p1 107) but do not say whether an unspent part carries over: still unknown.
- o2-0501 (open): window semantics must be measured. Part is now answered from the documentation (P7, P8); the rest is under Unknown.
- Look-ups `token bucket`, `quota window` found only those. `Borg`, `critical path`: topic 4, not looked up.

## Papers

### P1. Heinanen and Guerin, RFC 2697 "A Single Rate Three Color Marker", IETF 1999. Read from: https://www.rfc-editor.org/rfc/rfc2697.txt. Saved: R:papers/budget/rfc2697/paper.txt. Read: all.
- Problem: mark packets against a committed rate with two burst sizes.
- Mechanism: two buckets C and E on one rate; tokens go to C first, to E only when C is full. A packet of size B is green if C holds it, yellow if only E does, else red.
- Result: "token buckets, C and E, which both share the common rate CIR" (txt 122); "If Tc is less than CBS, Tc is incremented by one, else" (txt 131); "if Te is less then EBS, Te is incremented by one" (txt 133); "the packet is green and Tc is decremented by B" is at txt 141 (green when Tc(t)-B >= 0).
- Measured gain: none; a specification.
- Assumes: size B known when the packet arrives; one rate.
- With model sessions (reasoned): the cost of a unit is known only roughly before it starts, so admission uses an estimate and the true cost is charged after; a balance going below zero is not in the RFC (it refuses the packet). Our windows are two rates on two clocks, which is RFC 2698's form.
- Needs to know before use: cost of a unit before it starts (estimate and its error).
- Status: quoted.

### P2. Heinanen and Guerin, RFC 2698 "A Two Rate Three Color Marker", IETF 1999. Read from: https://www.rfc-editor.org/rfc/rfc2698.txt. Saved: R:papers/budget/rfc2698/paper.txt. Read: all.
- Problem: meter against a peak rate and a committed rate at once.
- Mechanism: bucket P (rate PIR, size PBS) and bucket C (rate CIR, size CBS), each refilled on its own rate. Red if P cannot cover the packet, yellow if P can but C cannot (P charged), green if both can (both charged).
- Result: "token buckets, P and C, with rates PIR and CIR, respectively" (txt 122); "If Tp(t)-B < 0, the packet is red, else" (txt 136); "the packet is green and both Tp and Tc are decremented by B" (txt 141).
- Measured gain: none; a specification.
- Assumes: packets small against bucket sizes; known size; both buckets charged for the same item.
- With model sessions (reasoned): the closest published form of "two budgets drawn at once". A unit is admitted in full only if both the 5-hour and the weekly bucket cover it; a third (dearest model's weekly) extends the same rule with a per-model charge. It is a rule of admission; it has no rule for spending ahead of a reset.
- Needs to know: refill rate and size of each bucket (the pages read give no token numbers), cost per unit.
- Status: quoted.

### P3. Generic cell rate algorithm (ATM Forum UNI, ITU-T I.371), as described by Wikipedia. Read from: https://en.wikipedia.org/wiki/Generic_cell_rate_algorithm. Saved: R:papers/budget/gcra/wiki.txt. Read: all.
- Problem: police cell timing without running a refill process.
- Mechanism: keep one value, the theoretical arrival time TAT; a cell conforms if it arrives no earlier than TAT minus the limit; then TAT moves by the emission interval. Equal to a continuous-state leaky bucket.
- Result: "does not simulate the process of updating the bucket (the leak or adding tokens regularly). Rather, each time a cell arrives it calculates" (txt 161); fixed cell size means no multiplication (txt 162); with variable-length packets "it would involve multiplication" (txt 163).
- Measured gain: none stated.
- Assumes: constant cell size (else a cost-weighted update).
- With model sessions (reasoned): a cost-weighted update (add cost divided by rate to TAT) fits units of unequal size and needs no timer; with tens to hundreds of units per window either form is cheap.
- Needs to know: cost per unit, rate.
- Status: summary-grade. The standard's own text was not opened (ATM Forum TM 4.0 URL and an MIT dspace item returned HTML, not a PDF). Not `quoted` from the standard.

### P4. Cloudflare engineering, "Counting things, a lot of different things" (blog). Read from: https://blog.cloudflare.com/counting-things-a-lot-of-different-things/. Saved: R:papers/budget/cloudflare-sliding/page.txt. Read: all (90 lines). SELF-REPORTED.
- Problem: a fixed window resets its counter completely, so a spike at the edge passes twice.
- Mechanism: estimate the rate from the current window's count plus the previous window's count weighted by the part of it still inside the sliding interval.
- Result: "The naive fixed window algorithm is actually not that bad: we just have to solve the problem of completely resetting the counter" (txt 61); "an analysis on 400 million requests from 270,000 distinct sources shown: 0.003% of requests have been wrongly allowed or rate limited" (txt 71); "An average difference of 6% between real rate and the approximate rate" (txt 72); it "assumes a constant rate of requests during the previous sampling period" (txt 68).
- Measured gain: self-reported error against the exact count; no throughput gain.
- Assumes: millions of requests, many sources, constant rate in the previous window.
- With model sessions (reasoned): does not hold (tens to hundreds of units per window); the exact log is cheap. Useful only as the statement of why a fixed window double-passes at an edge.
- Needs to know: nothing of ours.
- Status: quoted.

### P5. Beyer and others (eds.), Site Reliability Engineering, ch. 21 "Handling Overload" (and ch. 22 "Addressing Cascading Failures"), Google 2016. Read from: https://sre.google/sre-book/handling-overload/ and .../addressing-cascading-failures/. Saved: R:papers/budget/sre-overload/page.txt (192 lines), sre-cascading/page.txt (361). Read: ch. 21 txt 96-115, 145-180; ch. 22 saved, not read for numbers. SELF-REPORTED.
- Problem: clients keep sending to a backend that is rejecting "out of quota"; retries multiply the load.
- Mechanism: each client counts, over the last two minutes, requests attempted and accepts; once requests exceed K x accepts it rejects new requests locally with a probability that grows.
- Result: "Clients can continue to issue requests to the backend until requests is K times as large as accepts" (txt 103); "We generally prefer the 2x multiplier" (txt 110); "Even in large overload situations, backends end up rejecting one request for each request they actually process" (txt 111); "a per-request retry budget of up to three attempts" (txt 151); a retry is allowed while the retry ratio is "below 10%" (txt 155).
- Measured gain: "work well in practice" (txt 111); no baseline figure (self-reported).
- Assumes: a backend that signals rejection; very many requests; the client sees its own history.
- With model sessions (reasoned): here a refusal is a stop of all work until a refill, not one rejected request, and a retry is not the same run; so the usable part is a retry budget as a ratio (10 %). The two-minute memory is far shorter than a 5-hour window.
- Needs to know: share of units refused, share that are reruns.
- Status: quoted for ch. 21; ch. 22 not read.

### P6. Amazon Web Services, EC2 User Guide, "Key concepts and definitions for burstable performance instances". Read from: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html. Saved: R:papers/budget/aws-credits/page.txt. Read: txt 50-150, 400-440. SELF-REPORTED documentation.
- Problem: sell a small steady share with the right to burst.
- Mechanism: credits are earned at a baseline rate when use is below it and spent above it; the stock has a cap; "unlimited" mode lets use continue and bills for the excess.
- Result: "continuously earns credits when it stays below the CPU baseline, and continuously spends credits when it bursts above the baseline" (txt 61-62); "the credit accrual limit ... is equal to the number of maximum credits earned in 24 hours" (txt 143-145), example "24 * 6 = 144 credits" (txt 147); "CPU credits on a running instance do not expire" (txt 430); with no credits left "the instance gradually comes down to baseline" (txt 75-77).
- Measured gain: none (documentation). The measured study (Wang and others) was not opened.
- Assumes: a continuous resource, a fixed earn rate, an observable balance.
- With model sessions (reasoned): the opposite shape from the plan's windows as documented. Their credits accrue up to a cap and idle time is kept until the cap; the plan's window "resets in full" (p1 107) and the pages do not say an unspent part is kept (unknown). Their fall to baseline is gradual; ours is a stop.
- Needs to know: whether our windows are buckets or resets.
- Status: quoted.

### P7. Anthropic Help Center, "How do usage and length limits work?". Read from: https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work. Saved: p1 (text stripped from the page HTML; the provider's own words, not a summary). Fetched 2026-11-19. Read: txt 100-165.
- 5-hour window: "Paid plans have two types of usage limits: a session limit that resets every five hours, and weekly limits that reset once every week." (txt 102). "The period starts when you send your first message, and your limit resets in full five hours later." (txt 107). So it starts with the first message, not on the clock, and resets in full.
- Weekly: "Weekly limits apply across all models, and some plans also have a separate weekly limit for Fable. Weekly limits reset at a fixed time each week that is assigned to your account. Your reset day and time stay the same regardless of when you start using Claude or when your subscription begins, and you receive your full weekly allowance each cycle." (txt 111). So fixed per account, not rolling; a per-model weekly window exists on some plans.
- Surfaces: usage of "claude.ai, Claude Code, Claude Desktop" counts "towards the same usage limit" (txt 104).
- What counts: "the length and complexity of your conversations, the features you use, which Claude model you're chatting with, and the effort level" (txt 103); "Longer conversations that trigger automatic context management consume more of your usage limit" (txt 129).
- Changes: "We may adjust usage limits at our discretion ... We don't guarantee uninterrupted service." (txt 113). "Verified Ultra accounts don't have a five-hour limit." (txt 109). With usage credits "your work continues on usage credits instead of stopping" (txt 140).
- Status: quoted.

### P8. Anthropic Help Center, "Using Claude Code with your Pro or Max plan". Read from: https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan. Saved: p2. Fetched 2026-11-19.
- "Pro and Max plans have a five-hour session limit and a weekly limit." (txt 122). "Max and Ultra plans also have a separate weekly limit for Fable. These limits are shared across Claude and Claude Code" (txt 123).
- Wrap-up: "it may keep working briefly so it can finish the step in progress" (txt 124); "This wrap-up allowance is small and capped, and the usage counts toward your weekly limit." (txt 124). Pro: "up to once per weekly usage period"; Max: "each time you reach a five-hour session limit" (txt 125). "rolling out gradually" (txt 126).
- With model sessions (reasoned): a unit in progress at the limit may finish its step; a unit of many steps is not promised to finish.
- Status: quoted.

### P9. Anthropic API docs, "Rate limits" and "Prompt caching". Read from: https://docs.claude.com/en/api/rate-limits and .../build-with-claude/prompt-caching. Saved: p4, p3. Fetched 2026-11-19. These describe the API, not the plan windows.
- "The API uses the token bucket algorithm to do rate limiting. This means that your capacity is continuously replenished up to your maximum limit, rather than being reset at fixed intervals." (p4 txt 20).
- "cache_read_input_tokens (tokens read from cache) ✗ Do NOT count toward ITPM" (p4 txt 71); "only input_tokens + cache_creation_input_tokens count toward your ITPM limit" (p4 txt 76); "cache hits are not deducted against your rate limit" (p3 txt 498).
- "All limits described here represent maximum allowed usage, not guaranteed minimums." (p4 txt 21).
- Status: quoted.

### P10. Anthropic Help Center, "Usage limit best practices". Read from: https://support.claude.com/en/articles/9797557-usage-limit-best-practices. Saved: p5. Fetched 2026-11-19. Read: txt 111-142.
- "Content in projects is cached and counts less against your limits when reused." (txt 111-112); "cached portions count less against your limits than new content" (txt 139); "Caches expire after a period of inactivity. If you come back to a project after a long break, your first message counts that content in full again." (txt 142).
- This is the only plan-side statement on cached input found; it is about claude.ai projects, with no ratio and no mention of Claude Code.
- Status: quoted.

### P11. Wang, Urgaonkar, Nasiriani, Kesidis, "Using burstable instances in the public cloud: why, when and how?", SIGMETRICS 2017. Status: not opened (see Could not open). A web search gave only the one-page abstract (summary): burstable instances treated as random may lead to poor purchasing and operating choices.

## Unknown
Not stated on the pages read; nothing is inferred.
- Whether an unspent part of a 5-hour or weekly window carries over: the pages say only "resets in full" (p1 107) and "full weekly allowance each cycle" (p1 111).
- What starts the next 5-hour period after a reset (the page says the period starts at the first message; the case after a reset is not described).
- The reset day and hour of a given account (shown in Settings > Usage, p1 111).
- The size of each window in tokens or the ratio of the weekly to the 5-hour window: no figure given.
- How cached input counts against the plan windows. Only "counts less" for claude.ai projects (p5 111-112, 139, 142); nothing for Claude Code, no ratio. The API's rule (cache reads not in ITPM, p4 71) is a different limit.
- Whether use of the separately limited model also counts against the all-models weekly limit (p1 111 says weekly limits "apply across all models" and a separate one exists; not stated whether both are charged).
- Whether output tokens, thinking and effort are weighted in the plan windows: the page says they "affect" use (p1 103) with no weights.
- Whether limits are exact: "We may adjust usage limits at our discretion" (p1 113).

## Could not open
- Wang and others, SIGMETRICS 2017, full text | Penn State Pure page, AMiner (abstract only); ACM https://dl.acm.org/doi/pdf/10.1145/3064176.3064220 (returned HTML, not a PDF); Unpaywall API (needs a contact address, not given) | only the abstract is public by the routes tried.
- ATM Forum Traffic Management Specification 4.0 (GCRA, standard text) | https://www.broadband-forum.org/ftp/pub/approved-specs/af-tm-0056.000.pdf; MIT dspace item 42679600 | both returned HTML, not PDF; used Wikipedia (P3) as a summary-grade substitute.
- Stripe "Scaling your API with rate limiters" | https://stripe.com/blog/rate-limiters | page saved as 9,600 lines of site text and removed; not read.
- Google SRE book ch. 22 numbers | saved at R:papers/budget/sre-cascading/page.txt, not read.

## Needs the owner's sign-in
none.
