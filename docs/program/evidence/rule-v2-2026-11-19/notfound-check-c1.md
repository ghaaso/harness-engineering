# Check of V2-108 and the c1 part of V2-112

`R:` = `docs/program/evidence/round3-2026-11-18/`. Draft: `R:RULE-V2-DRAFT.md` lines 610-613 (c1 not found) and 634-636 (c1 sign-in).
Report: `R:c1-report.md` section 4 (lines 156-185) and the Addendum "Not found" list (lines 372-387). Collect files `R:c1-collect-*.md`.

## A. "Not found" items (V2-108)

| # | Item (draft) | In report | Search stated | Verdict |
|---|---|---|---|---|
| 1 | N* for c slots in any source (computed here) | R:c1-report.md:158-161 ("computed here (C07)") | R:c1-report.md:159-161 (query words; Sztrik, Haque-Armstrong, Lazowska ch. 6,7,8,10,11); also R:c1-collect-queue.md:124-131, 14 | stands. Sztrik lines 381-390 give N* for one server only (collect-queue:127). Kleinrock vol. I and II were never opened (collect-queue:131) |
| 2 | N* with batch service in a closed queue | R:c1-report.md:161-162 | partly: R:c1-collect-queue.md:104, 132-136 (Kalyanaraman read; its tables only skimmed). No search words given for this item | stands, search not stated. The nearest paper, Stecke and Aronson 1985, was paywalled and not read (collect-queue:104, 115, 144), so "not found" means "not read" for it |
| 3 | A paper on splitting a suite over machines with a measured speedup | R:c1-report.md:162-163 ("web search found vendor write-ups only") | R:c1-collect-shorter.md:112 (vendors named: Tuist, Pinterest, Depot, Playwright; search words not given) | narrower in the report: report and collect say "a paper whose subject is time-balanced sharding"; the draft drops "subject". Partly covered: Concordia 2023 measures machine count against feedback time by replay, e.g. 6 to 7 machines is a 2.65 times speedup (R:c1-collect-mergeq.md:66; R:c1-collect-shorter.md:71, which calls it "evidence on splitting a check over machines"). It splits a queue of builds over machines, not one suite |
| 4 | A paper on computing affected build targets | R:c1-report.md:163 ("whose subject is computing affected build targets") | R:c1-collect-shorter.md:111 (web search; practice guides found; words not given) | stands, search not stated. Papers that use the build graph as a baseline were read (shorter:111; BMW, claim C44, claims:290) |
| 5 | A measured gain of drum-buffer-rope | R:c1-report.md:163-164 ("against a plain release rule") | R:c1-collect-bottleneck.md:20 (search words `drum`, `Goldratt`, "not recorded"); :122 | narrower in the report: the report says "against a plain release rule". Bokor 2024 and Tanhaei 2017 were read (bottleneck:12, 84-94). Duclos and Spencer (constraint buffer raised output, abstract only, bottleneck:140) was not read in full, so a measured gain may sit there |
| 6 | A controlled before-and-after of batching at a known failure rate in production (V2-108 cannot be checked) | R:c1-report.md:373-374 (Addendum, "None of the six accounts", from R:c1-collect-production.md:98) | R:c1-collect-production.md:3-5 (six named sources, library search words); no search over other sources | narrower in the report: it covers six accounts (GitHub, Shopify, Rust, Chromium, Kubernetes, Mozilla), not all of production. Near cases the lane holds: Uber 2025 before-and-after of a rollout, builds per change 3.4-5.4 to 1.9-2.6 (R:c1-refute.md:38, not controlled, one change set); GitHub 33 % lower wait (R:c1-report.md Addendum A4, no failure rate) |

## B. Items the report holds and the draft leaves out

- Addendum gaps (R:c1-report.md:375-387): GitHub no wait before the 33 % drop, no batch size, no failure rate; Shopify no before-and-after for the second queue, vendor page 404; Rust no failure rate, rollup size or gain, blog 404; Chromium no measured gain; Kubernetes no batch size, gain or failure rate; Mozilla no closure, backout or batch figures (older page seen in search, not opened).
- Report section 4 "Read only in part" (R:c1-report.md:178-179): Fallahzadeh 2025, Denning and Buzen, Najafi 2019 (about 80 %), Uber 2025 (about half). The draft has no line for these.
- Collect-file gaps not in the report: Memon 2017 ICSE-SEIP damaged download (R:c1-collect-shorter.md:107); Luo 2014 source [15,27] not fetched (shorter:113); Kleinrock books unopened (queue:131).

## C. Papers not opened (V2-112, c1 part)

| Paper | In report | Reason in files | Draft's reason |
|---|---|---|---|
| TSE 2021 (ieeexplore 9392370) | R:c1-report.md:173 | no open copy; OpenAlex, Semantic Scholar, Unpaywall, arXiv, core.ac.uk (Cloudflare check) all tried; IEEE sign-in is the route (R:c1-collect-mergeq.md:129, 174); 2020 thesis read instead | none given; "sign-in" fits |
| ICSME 2021 (doi 10.1109/ICSME52107.2021.00026) | R:c1-report.md:174; "thesis download broke about 15 times" :168 | the paper is not behind a known sign-in: thesis downloads failed, "a later retry may open it" (R:c1-collect-mergeq.md:175) | draft puts it under "sign-in": narrower than the file; the file also says a retry may open it |
| Shifting bottleneck (Adams, Balas, Zawack 1988) | R:c1-report.md:175, 169 | journal paywall; DTIC copies returned a bot-check page of 1,484 bytes (R:c1-collect-bottleneck.md:107, 139) | none given; "sign-in" fits, but bot check is also a cause |
| Duclos and Spencer 1995 | R:c1-report.md:175-176, 169-170 | closed; repository download and core.ac.uk returned bot checks; ScienceDirect paywall; abstract only (R:c1-collect-bottleneck.md:140) | none given |
| Reiser and Lavenberg 1980 | R:c1-report.md:176, 167 | bot check ("Just a moment", 5,549 bytes); Lazowska ch. 6 stands in (R:c1-collect-queue.md:143) | "bot check": same |

Draft's five match the report's sign-in list (R:c1-report.md:173-176) one for one, URLs included. Left out by the draft: the "Closed after a second attempt" list (R:c1-report.md:165-172), among them Stecke and Aronson 1985 (paywall), Chaudhry and Templeton 1983, Deb and Serfozo 1973 (paywall; form known from a search summary, group:153), Hwang 1972 (no open copy), Helland 1987, Simatupang 1997, arXiv 2110.01465 (damaged file), Kleinrock vol. II (book). Of these, Stecke and Aronson matters to item 2 above.

## D. Verdicts

- V2-108 (c1): holds in part. Items 1 and 4 stand. Item 2 stands but rests on an unread paper and has no search words. Items 3, 5 and 6 are worded wider in the draft than in the report (item 3 also has a near paper, Concordia 2023). The draft is correct in its list but loses the report's qualifiers.
- V2-112 (c1 part): holds in part. The five items match the report and each has a stated reason in the files; the draft states none except for Reiser and Lavenberg, and ICSME 2021 is filed as "sign-in" where the file says download failures with a possible retry. Closed-after-second-attempt papers are not listed.
