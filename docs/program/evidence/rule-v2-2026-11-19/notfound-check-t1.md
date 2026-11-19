# Check of V2-110 and t1's part of V2-112

`R:` = `docs/program/evidence/round3-2026-11-18/`. Draft lines: `R:RULE-V2-DRAFT.md:619-621` (not found) and
`:635-637` (sign-in). Report section: `R:t1-report.md:171-192`. Lane files read: the six `R:t1-collect-*.md`,
`R:t1-claims.md`, `R:t1-refute.md`. Reading only; nothing else was opened.

## Part 1. The four "not found" items (V2-110)

| Item | In the report | Search stated | Contradicted by lane files? | Verdict |
|---|---|---|---|---|
| How long a half-split lasts | `t1-report.md:186-187` ("Not found in the papers read (which is not 'no paper')": eight concurrency papers and ARIES/KVL; PostgreSQL finishes it at once) | Not the words. Only which papers were read; the same sense is at `t1-collect-concurrent.md:120` ("not given as a time anywhere in the papers read ... not 'no paper'") | No time figure anywhere. Closest: Graefe "may be delayed beyond a system reboot" (`t1-collect-concurrent.md:26`, `:120`); Lehman-Yao "must be added quickly" (`:120`); PostgreSQL INCOMPLETE_SPLIT seen only after a failure (`t1-collect-production.md:42`). These give a bound or a rule, not a duration | stands, search not stated. Narrower in the report: "in the papers read", not "in any source" |
| A law in ratios for structure changes per insert | `t1-report.md:187-188` (Lehman and Yao call splits "exceptional", no figure) | Not the words; the papers read are named at `t1-collect-concurrent.md:144` | Only "splits are exceptional" (`t1-collect-concurrent.md:43`, `:144`). Baeza-Yates 1989 (expected splits per insert) was not read, paywall (`t1-collect-versions.md:115`), so the item is open on a paper not opened | stands, search not stated. Narrower: papers read only, and one paper that may hold it was not opened |
| Controlled sweep of depth against fan-out at equal work with tokens per level | `t1-report.md:189-191` | Yes. `t1-report.md:190` points to `t1-collect-hierarchy.md:163-165`, which gives four queries (hierarchy depth and fan-out cost; span of control; recursive delegation; Williamson/Beckmann span of control) and says results were snippets, then papers were downloaded and read | Partly covered, not settled: RAO measured depth up to 10 with tokens, P13 depth 1 to 2 with 4 to 256 agents (`t1-collect-hierarchy.md:163`, `:203`); neither is a sweep at equal work. The collector's own earlier "no study of depth 2 or more" was corrected (`:203`) | stands |
| LSM-tree against a B-epsilon tree on one workload | `t1-report.md:191-192` ("a direct measurement"); also `t1-collect-writes.md:160` | Not stated for this item. `t1-collect-writes.md:160` says only the Bender article compares by argument and by BetrFS numbers. Routes in general: "web search, the authors' page, a Berkeley course copy" (`:166`) | Nothing in the collect or claims files reports such a measurement. Dostoevsky and Monkey evaluations are listed as figures not read as numbers (`t1-report.md:180-181`), so a comparison could sit there unread | stands, search not stated |

Counts: stands 1, stands with search not stated 3, narrower 2 (inside the "search not stated" rows), contradicted 0,
not in the report 0.

Items the report's section holds that the draft's t1 bullet leaves out:
- "Any study with 3 to 16 writers whose units last minutes (all six collect files)" (`t1-report.md:188-189`). The draft
  has it only in the "Every lane" bullet (`RULE-V2-DRAFT.md:605-609`), not under t1.
- "Not searched": hierarchical task networks, Borg-style restart and eviction rates, TiKV, the history of MongoDB's
  change of engine (`t1-report.md:183-184`). These are not "not found" items, but the section lists them.
- Figures not read as numbers: Dremel Fig. 11, Astrolabe Fig. 6, Dostoevsky and Monkey evaluations, Srinivasan and
  Carey curves (`t1-report.md:180-181`).

## Part 2. Papers not opened (V2-112, t1 part)

| Paper | In the report | Reason in files | Same as draft? |
|---|---|---|---|
| Sagiv 1986 | `t1-report.md:173-174` | ScienceDirect HTTP 403 with Cloudflare bot-check cookie (`t1-collect-concurrent.md:163`, `:167`) | yes (bot check) |
| Johnson and Shasha 1990 | `t1-report.md:174` | Cloudflare "Just a moment..." page at ACM (`t1-collect-concurrent.md:164`, `:168`) | yes |
| Johnson and Shasha 1993 | `t1-report.md:174-175` | ScienceDirect Cloudflare bot check; abstract only (`t1-collect-versions.md:117`, `:120`) | yes |
| Lanin and Shasha 1986 | `t1-report.md:173` | NYU page "Access forbidden"; Internet Archive refused as "suspected abusive bot traffic" (`t1-collect-concurrent.md:130`, `:162`, `:169`) | yes. Note the first collect section says "None ... sign-in or bot check" (`:138`) and is contradicted by its own added lines `:166-169`; the added lines are the later, fuller record |
| Bayer and Schkolnick 1977 | `t1-report.md:175-176` | Springer "Buy article" page, Unpaywall closed (`t1-collect-concurrent.md:132`, `:161`) | yes (paywall) |
| Yao 1978 | same | paywall, abstract only (`t1-collect-versions.md:76`, `:114`) | yes |
| Baeza-Yates 1989 | same | paywall, record and abstract only (`t1-collect-versions.md:115`) | yes |
| Graefe 2011 | `t1-report.md:176` | sold by the publisher (`t1-collect-versions.md:77`, `:116`) | yes |

The draft puts the last four under "behind paywalls" inside a list headed "sign-in"; the files call them paywall or
sold, not sign-in. The reasons agree. Reasons in the draft match the files for all eight.

Which paper is behind a bot check and would settle C65: Johnson and Shasha 1993 (JCSS 47(1)). It is in the draft's
list (`RULE-V2-DRAFT.md:635-636`) and in the report (`t1-report.md:174-175`). C65's verdict table row: `t1-claims.md:849`
("cannot be checked"); `t1-refute.md:229-236` adds that search summaries carry a condition (the gap closes only while
deletes are at most about 47 percent; at 50 percent free-at-empty falls under 40 against about 60), so "settle by reading
utilisation by delete share" is the right test.

Items the report holds that the draft leaves out of the list (`t1-report.md:176-181`):
- Rodeh 2008 journal text (the IBM report was read); Lomet 2004 (named by Graefe, not tried).
- arXiv 2606.05670 and 2609.14767 (snippets only), 2609.11737 (truncated twice); arXiv 2510.04311 (search summary only).
- Beckmann, Williamson, Keren and Levhari on span of control (snippets, `t1-collect-hierarchy.md:211`).
- DeWitt on group commit (`t1-collect-writes.md:161`); WiredTiger eviction page (fetched, not read).
- Also in the collect files: Rosenblum and Ousterhout 1992, Bender 2007/Buchsbaum 2000, Mohan 1990 / ARIES/IM
  companion, LMDB slides (`t1-collect-writes.md:158-161`; `t1-collect-concurrent.md:134`; `t1-collect-versions.md:80-81`).
These are not behind a sign-in (snippets, truncated, not tried), so leaving them out of the sign-in list is correct.

## Verdicts

- V2-110: holds, with one caveat. All four items are in the report in the same sense ("in the papers read, not 'no
  paper'"); none is contradicted. Three have no search words stated (half-split, ratios, LSM against B-epsilon), and
  the ratios item rests partly on a paper not opened (Baeza-Yates 1989). It is a "not found in the papers read", and
  the draft should not widen it.
- V2-112, t1 part: confirmed. The sign-in names, links, and reasons match the files (eight papers, incl. the C65
  paper). Only the heading is loose: four are paywalls or sold, not sign-in.
