# Check of V2-109 and the w1 part of V2-112

`R:` = docs/program/evidence/round3-2026-11-18/. Report = `R:w1-report.md` (section 10, lines 376-407). Draft bullets: `R:RULE-V2-DRAFT.md`
lines 611-615 (w1 not found), 633-634 (w1 sign-in), 641-642 (other reasons).

## A. Not found items

| # | Item (draft) | In report | Search stated | Verdict |
|---|---|---|---|---|
| 1 | Measurement of any mechanism with units of minutes in a real engine, or with reruns that differ | report:383-384 (adds "1977 simulation is the one exception for length") | report:378-380 (library words, web by title only); `R:w1-collect-engines.md:297-298` (longest unit 10 ms / 5 s; no non-identical reruns) | stands |
| 2 | Conflict rate where locking and optimistic control cross | report:385-386 (adds "the one source that compared waiting with no-wait gives no general statement") | `R:w1-collect-engines.md:296` (no search words; says library line B6 also found none) | stands, search not stated (the words) |
| 3 | Measured gain for sagas, split transactions, check-out or notification | report:387 | `R:w1-collect-long.md:250-251` (texts searched for measure, experiment, empirical, perform; library words saga, Barghouti, cooperative, check-out, Perry, Korth, Garcia-Molina) | stands. Caveat: the sagas paper was an image-only scan (`R:w1-collect-long.md:258`), so the text search could not cover it; the later copy is a poor OCR (`R:w1-collect-long.md:290` searched it: no hit) |
| 4 | Study of agents in one repository, speed against writers, merge and test run counted | report:388-389 (cites `R:w1-collect-merge.md:264`) | `R:w1-collect-merge.md:264` ("searched the six papers read"); no search words | stands, search not stated (words) |
| 5 | Semantic-conflict rate between sessions | report:389-391, narrower than the draft: "beyond a 60-run inspection whose figures do not reconcile (W61 in part)" | `R:w1-collect-merge.md:267` (no words) | narrower in the report: one source exists (CodeCRDT, 60 runs, manual); the draft drops that exception |
| 6 | Repeated runs of any agent benchmark | report:391 (cites "section 7 item 8") | not stated | narrower in the report: `R:w1-report.md:291-292` and `R:w1-refute.md:769` say CodeCRDT reports a spread at temperature 0 (±21.57 s); STORM, CAID, Co-Coder none "in the lines read". The draft's flat "none" omits CodeCRDT |
| 7 | Grain measured on a real engine on current hardware | report:392 (cites `R:w1-collect-grain.md:137`) | `R:w1-collect-grain.md:137` (library "lock granularity"; web "Ries Stonebraker locking granularity", "SQL Server lock escalation threshold") | stands |

No contradiction found: grep of the seven collect files and `R:w1-claims.md` found no source that measures items 1, 2, 3, 4 or 7.

## B. Items the report holds that the draft leaves out

- Conflict or rollback rate for Google's trunk (report:393; `R:w1-collect-production.md:110`, papers searched for conflict, merge, rollback).
- How often Figma or Google Docs drops an edit (report:393; `R:w1-collect-production.md:111`; the Docs conflict rate also line 112).
- Primary Meta text on server-side rebase (report:393-394; search stated `R:w1-collect-production.md:109`).
- A migration its company says was forced by write contention (report:394-395; `R:w1-collect-production.md:110-111`: searched Discord only, "no other candidate chosen").
- From the collect files, not the report: Hekaton validation-failure rates (`R:w1-collect-engines.md:299`); wasted work as a share of cycles by abort rate in text (`:295`).
- Report also lists "Read with a caveat" sources (report:403-407); not a not-found list, so not counted.

## C. Papers not opened (V2-112, w1 part)

| Paper | Draft reason | Report | Collect file reason | Verdict |
|---|---|---|---|---|
| Adya 1999 | MIT DSpace rate limit | report:396 same | `R:w1-collect-isolation.md:80,122` (download truncated, DSpace bitstream returned HTML, verdict "rate limit/firewall with sign-in prompt") | stands; reason matches |
| Cahill, Röhm, Fekete 2008, 2009 | in sign-in list, no reason | report:396-397 (ACM, Sydney, CORE) | `R:w1-collect-isolation.md:125-130` (Sydney 403, ACM 403, CORE bot check; "needs the owner's sign-in") | stands |
| Fekete and others 2005 | in sign-in list | report:397 (ACM; Minnesota copy fails certificate) | `R:w1-collect-isolation.md:133-137` | stands |
| IntelliMerge 2019 | in sign-in list | report:397-398 ("abstract only") | `R:w1-collect-merge.md:271,281-291` (ACM 403 bot check; read as abstract only) | stands |
| Korth, Kim, Bancilhon 1988 | in sign-in list | report:398 (ScienceDirect) | `R:w1-collect-long.md:270-276` (403 bot check). Line 259 of the same file says "no sign-in route attempted"; line 270 later records the 403 | stands |
| Pradel 1986 | "not opened for other reasons" | report:399 "(now needed, section 7 item 4)" | `R:w1-collect-long.md:261-263` (known only through the survey; skipped, no figure expected). No fetch attempted | stands; reason is a choice, not a block |
| Agrawal, Carey, Livny 1987 | same | report:400-401 "held only as a summary (section 7 item 3)" | `R:w1-collect-engines.md:306` (not fetched again; reused library record), `R:w1-report.md:277-279` | stands; see D |

Report items not opened that the draft leaves out: Srinivasan and Carey 1991 (report:398-399; `R:w1-collect-grain.md:145`, "not searched for in the time available"; 1993 journal version read); Yeh 1987 (`R:w1-collect-long.md:253`, not searched), Weihl 1988 (`R:w1-collect-order.md:334`), BOHM and PWV (`:335`, skipped), Spanner, CockroachDB, LMDB, RocksDB (report:400, skipped as changing no answer). Not in the report either, but blocked in the collect files: Mohan 1990 (403, `R:w1-collect-grain.md:142`; the report notes the copy is of unrecorded origin, report:403) and Stonebraker and others 2007 (403, `R:w1-collect-order.md:271,331`). Sagas 1987 is an image-only scan (`R:w1-collect-long.md:260`, needs OCR or ACM sign-in) and is only a caveat at report:404, not in the unopened list.

## D. The Agrawal "fake restart" point

The report's section 10 holds it (report:400-401, "held only as a summary (section 7 item 3)"), and section 7 item 3 (report:277-279) says the same as the refuter at `R:w1-refute.md:750-753`. The draft's sentence (line 614-615) adds it as "w1's refuter adds one unread item": true, but the report already lists it, so it is not an addition by the refuter alone. The draft also lists it only in the "other reasons" line, not the w1 not-found bullet.

## Verdicts

V2-109: holds in part. Items 1 to 4 and 7 stand (2 and 4 with search words not stated). Items 5 and 6 are wider in the draft than in the report: CodeCRDT gives one 60-run inspection and a time spread at temperature 0. Four report items (Google trunk rate, Figma/Docs dropped edits, Meta rebase source, forced-migration case) are left out of the draft.

V2-112 (w1 part): confirmed for the five named sign-in papers (reasons match the collect files); the list is incomplete without Mohan 1990, Stonebraker 2007 (both 403) and Sagas 1987 (no text layer), and the draft's "other reasons" line omits Srinivasan 1991, Yeh 1987 and Weihl 1988.
