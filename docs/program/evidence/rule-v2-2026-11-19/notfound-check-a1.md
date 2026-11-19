# Check of V2-111 and a1's part of V2-112 (lane a1)

`R:` = `docs/program/evidence/round3-2026-11-18/`. Draft bullets: `R:RULE-V2-DRAFT.md:622-625` (a1), `:626` (Q17), `:638-640` (sign-in).
Report section 5: `R:a1-report.md:205-233`. Collect files abbreviated: alloc, llm, pace, quota, long (`R:a1-collect-<x>.md`).
General search statement for all items: `a1-report.md:231-233` (library words and web venues, "by titles and topic words only").

## Not found (V2-111)

| Item | In the report | Search stated | Verdict |
|---|---|---|---|
| 1. Pacing against two windows on separate clocks, same tokens | `a1-report.md:208` | `alloc:67` ("no source read gives a rule for two nested windows..."); `llm:16,118` (single refilling window); general `report:232-233`. The report also cites the pacing collect, but `pace:105-106` says only "Topic 3 only; none here" | stands. A71-A73 (`a1-claims.md:178,517-519`; `a1-refute-2.md:36`) are inference, not sources |
| 2. A pacing price used to choose a model | `a1-report.md:209` | `a1-claims.md:534` ("No source read applies a pacing price to the choice of model"); library words `report:232` (cheaper, RouteLLM, FrugalGPT). The report points to the last section of `llm`, but that section (`llm:118`) is about pacing against a refilling window, not this | stands (the report's pointer is misplaced) |
| 3. Value ranking and pacing measured on one baseline | `a1-report.md:210` (A77) | not stated for this item. The only basis is A77, which is a hypothesis (`a1-claims.md:546-549`) | stands, search not stated. `a1-refute-2.md:40` (partly) agrees: no system measured both parts on one baseline |
| 4. A team's account of hitting a usage limit and changing its design | `a1-report.md:211` (A54) | not stated. `llm:112` says this was "Not tried as a source" ("only P8 covers that kind"); P8, the Anthropic post, has no rate-limit statement (`llm:102`) | stands, search not stated (the collector did not search for it) |
| 5. Project scheduling with rough durations | `a1-report.md:212` (A63) | not stated. Searches on this topic were only "Graham list backfilling" and "Borg critical path straggler" (`long:19`, `report:232`) | stands, search not stated. A63 has exact durations only (`a1-claims.md:466`: "No result for rough durations") |
| 6. Window sizes, carry-over, cache weight on the plans | `a1-report.md:213` (A36-A43) | `quota:113-120` (pages p1-p5 read; list of what the pages do not say); `quota:3` | narrower in the report. Sizes: "no figure given" (`quota:117`), carry-over: not stated (`quota:114`). Cache weight is partly known: claude.ai projects "count less", cached content lapses, no ratio, nothing for Claude Code (A42, `a1-claims.md:311-313`; `a1-refute-2.md:5`; `quota:118`). The draft's bare "cache weight" hides this |
| 7. "No lane says how a value per unit is measured (Q17)" | no. Not in section 5. M9 "a value or a ranking per unit" is listed as open (`a1-report.md:144`, `:114`) | not stated | not in the report. For a1 it is consistent: A12 (`a1-claims.md`, Yahoo) uses "predicted value" with no method. The other lanes cannot be checked here |

Items the report holds that the draft leaves out: "Throttling and bid shading measured against each other on one workload"
(`a1-report.md:210`; `pace:123` "not found"; stands, searched through papers P3-P5 of the pacing collect).

## Papers not opened (a1's part of V2-112)

| Paper | In the report | Reason in the files | Verdict |
|---|---|---|---|
| Balseiro and Gur 2019 | `a1-report.md:216` | SSRN blocks automated download, SSRN gave HTML, ACM EC page 403, columbia.edu 403, Semantic Scholar 429, not on arXiv (`pace:111,126,141,152`) | stands (same reason) |
| Balseiro, Kim, Mahdian, Mirrokni 2017/2021 | `a1-report.md:216` | Google PDF paths 404, a storage guess gave an XML error, SSRN gave HTML (`pace:112,143`); a 403 is recorded for Balseiro-Gur's ACM page, not for this paper | narrower in the report: "bot check and publisher 403" is firm for Balseiro-Gur only |
| Wang and others, SIGMETRICS/POMACS 2017 | `a1-report.md:217` | ACM URLs all HTTP 403, "a bot check; not worked round"; OpenAlex closed (`quota:165`; `quota:16,125`) | stands |
| Mu'alem and Feitelson 2001 | `a1-report.md:218` | the PDF was saved but its text layer cannot be decoded; no OCR installed; "page images read by eye" is the other route (`long:121`). `long:103` says no paper "stopped at a sign-in or a bot check" | narrower in the report: this is an OCR case, not a sign-in. The draft says so in its own words, but files it under sign-in |
| Kolisch 1996 | `a1-report.md:219` | OpenAlex closed, no repository copy, Elsevier page paywalled; the 2006 update was read instead (`long:121`) | stands |
| ITU-T I.371 | `a1-report.md:220` | catalogue page only, "download is by sign-in or purchase" (`quota:167`); the ATM Forum text was read instead | stands (draft says "purchase"; the file says sign-in or purchase) |

Not-opened items the report holds that the draft leaves out: Tsafrir, Etsion and Feitelson TPDS 2007, replaced by the thesis
(`a1-report.md:221`); Agrawal and Devanur 2015, introduction only (`:222`); AllocBench arXiv 2607.23332, seen in a search listing
only (`:229`; `llm:112`). Not needing the owner: none of them is a sign-in case. Also in collect files only: Lifka, not opened (`long:16`).
Agarwal and others (LinkedIn) was closed in the first try (`pace:113,116`) and read later (`pace:126`), so its absence from the list is right.

## Verdicts

- V2-111: holds in part. All six items are in the report's section in the same sense (`a1-report.md:208-213`). Items 4 and 5 have no search stated (item 4 was "not tried"), item 6 is narrower (cache weight has a direction for claude.ai projects), and the draft drops the throttling-against-bid-shading item.
- V2-112, a1's part: holds in part. The reasons for Balseiro and Gur, Wang, Kolisch and ITU match the files. Balseiro-Kim-Mahdian-Mirrokni's "403" is firm only for the other Balseiro paper, and Mu'alem is an OCR case, not a sign-in case. Tsafrir, Agrawal and Devanur, and AllocBench are in the report but not in the draft.
- Count of rows (13): stands 6 (2 not-found, 4 papers), stands with search not stated 3, narrower in the report 3 (item 6, two papers), not in the report 1 (Q17).
