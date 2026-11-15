# recheck:X-05

lane=X-05 tool_status=ok checks=6

- F01 UNREACHABLE — https://people.cs.vt.edu/nm8247/publications/ruru-icsme-2017-camera-ready.pdf
    quote: The text is an encoded PDF with compressed streams, and none of the readable text includes a citation to Nguyen et al. (ICSE 2010) or a 17-45% recurring-bug-fix figure.
    note: PDF fetched but undecodable; claim neither confirmed nor refuted. The fact itself admits the original was not read.
- F09 PARTIAL — https://arxiv.org/html/2509.25140
    quote: Gemini-2.5-flash No Memory 34.2 / 30.3; ReasoningBank 38.8 / 27.5; Gemini-2.5-pro 54.0 / 21.1 to 57.4 / 19.8. Intro: up to 16% fewer interaction steps, Table 1.
    note: SWE-Bench and WebArena flash and Claude numbers match; 'up to 16% fewer steps' is in the intro, not the abstract. Page shows only v2 with 16 Mar 2026. v1 date 29 Sep 2025, ICLR 2026 and the google-research code link are not on the page (searched the whole text). WebArena pro (8.8 to 7.4) is not in the fact, so no conflict.
- F12 ON_PAGE — https://arxiv.org/abs/2602.11988
    quote: Context files do not generally improve task success rates and raise inference cost by over 20% on average, across LLMs and coding agents, for both LLM-generated and developer-committed files.
    note: Quote is paraphrased from the fetch summary. Dates match: v1 12 Feb 2026, v3 29 Sep 2026 (v2 23 Jun 2026). The pull-based implication is the researcher's inference, not on the page.
- F13 PARTIAL — https://arxiv.org/abs/2407.01502
    quote: Narrow focus on accuracy without attention to other metrics makes agents unnecessarily complex and expensive; the authors propose jointly optimizing cost and accuracy.
    note: Submission date 1 Jul 2024 and the core claims are supported. 'Cost should be reported alongside accuracy' and 'compare against cheap baselines' are not explicit in the summary I received; the baseline point is only implied.
- F17 ON_PAGE — https://en.wikipedia.org/wiki/Rule_of_three_(statistics)
    quote: The upper bound is -ln(alpha)/n. The numerators are 3.51 for 97% and 4.61 for 99%. Hanley, J. A. and Lippman-Hand, A. (1983), JAMA, 249(13): 1743-5.
    note: The page also states Bernoulli trials and p close to 0, and lists the reference. The reference is listed but not shown as the origin of the rule, which the fact already says.
- F19 ON_PAGE — https://platform.claude.com/docs/en/about-claude/pricing
    quote: Fable 5.1 $10/$50; Opus 5.5 $4/$20, cache hit $0.20; Sonnet 5.5 $2/$10, cache hit $0.10; Haiku 5.5 up to 100k tokens $0.10/$0.50, over 100k $0.50/$2.50.
    note: All prices match. The Opus 5.5 and Sonnet 5.5 cache-hit figures are correct. The page also lists lower batch prices, which the fact does not mention. Fetched live on 2026-11-02.
