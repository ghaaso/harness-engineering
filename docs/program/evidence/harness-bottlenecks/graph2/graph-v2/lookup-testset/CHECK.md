# Independent check of the lookup test set (2026-11-14)

The checker wrote its own scripts and did not run the lane's scripts. It recomputed every number below from the
per-instance raw files (`out/instances-v.jsonl`, `out/transcripts.jsonl`, `out/baseline-instances.jsonl`,
`out/split-sessions.tsv`). Scripts and output are in the scratch folder `graph-v2-work/lookups/check/`
(`recompute.js.txt` -> `recompute.json`, `search-seeds.js.txt`, `replay-sub.js.txt`). No transcript text was printed.

| Claim (NOTES.md / result.json) | Claimed | Recomputed | Match |
|---|---|---|---|
| Transcripts: program / product / no model call | 1,269 / 109 / 103 | 1,269 / 109 / 103 | yes |
| Instances: product / program / all | 1,069 / 3,760 / 4,829 | 1,069 / 3,760 / 4,829 | yes |
| Transcripts with instances: product / program | 109 / 1,245 | 109 / 1,245 | yes |
| Fetched tokens M: product / program | 5.35 / 47.79 | 5.35 / 47.79 | yes |
| Carried tokens M: product / program | 241.8 / 1,144.8 | 241.8 / 1,144.8 | yes |
| Product forms (n, carried share): CQ3, CQ5, CQ6, NG-ops, CQ4, CQ16, CQ10 | 52 31.8; 182 11.6; 58 9.4; 226 9.0; 87 8.6; 119 8.0; 51 1.4 | same | yes |
| Program forms: CQ1, CQ2, CQ4, NG-web, NG-trans, CQ3 | 1,574 49.6; 438 16.4; 218 6.2; 184 5.5; 70 5.2; 76 4.8 | same | yes |
| Confirmed truth, all: any / edit or cite | 27.1 % / 23.4 % | 27.1 % / 23.4 % | yes |
| Confirmed: product / program (any, edit or cite) | 28.4 (22.4) / 26.7 (23.6) | same | yes |
| Confirmed, carried-weighted: product / program | 50.8 % / 49.5 % | 50.8 % / 49.5 % | yes |
| R1 falsifier, confirmed % per form: CQ3 / CQ4 / CQ2 / CQ1 (product; program) | 55.8, 59.2 / 40.2, 39.9 / 10.4, 20.3 / 0 of 4, 24.3 | same | yes |
| Replayable without leakage (snapshot-ok): all / product / program | 512 = 10.6 % / 196 = 18.3 % / 316 = 8.4 % | same | yes |
| Snapshot-ok share of carried: product / program | 26.4 % / 4.6 % | 26.4 % / 4.6 % | yes |
| Own derivation of snapshot-ok from per-file labels (primary truth all "unchanged-since-frozen") | 196 / 316 | 196 / 316 | yes |
| Needs session build / current docs / outside repo / no truth (product; program) | 314, 202, 215, 142; 796, 1,009, 1,248, 391 | same | yes |
| Instances with a truth file changed or added since a31924a | 265 / 833 | 265 / 833 | yes |
| Distinct untracked truth files | 174 / 1,155 | 174 / 1,155 | yes |
| Commit approximated (branch gone) | product 1 | 1 | yes |
| Split hash, sha256 of `split-sessions.tsv` | f49e3828...c6fee1 | f49e3828cb6fcd89e3351d3e27dc56ebcdbf101a66c075fb66d34eab4dc6fee1 (repo copy byte-identical to scratch copy) | yes |
| Sessions in split: dev / confirm; sessions in both parts; instances whose session is missing from the split | 12 / 14; none | 12 / 14; 0; 0 | yes |
| Dev instances and realised dev carried share: product / program | 644, 57.8 % / 2,309, 65.3 % | same | yes |
| Baseline instances outside the development part | none | 0 | yes |
| Scorable: product / program (and not-scorable reasons) | 266 / 838 (251, 67, 60; 1,083, 277, 111) | same | yes |
| Product, all seeds, span hit@10: A / B / C / any | 47.4 / 8.6 / 55.3 / 56.8 | same | yes |
| Product, all seeds, carried-weighted A / B / C | 34.7 / 10.8 / 36.6 | same | yes |
| Product, all seeds, median tokens to first / cheapest hit, A / B / C | 3,105/404; 4,052/709; 2,387/1,292 | same | yes |
| Product, search seeds (121): A / B / C, C carried-weighted, C tokens | 27.3 / 8.3 / 42.1, 51.8, 322/300 | same | yes |
| Program, all seeds: A / B / C / any; carried-weighted | 31.7 / 33.1 / 55.3 / 58.2; 39.5 / 34.5 / 46.7 | same | yes |
| Program, all seeds, tokens A / B / C | 6,400/4,648; 1,061/714; 1,331/840 | same | yes |
| Program, search seeds (521): A / B / C, C carried-weighted, C tokens | 11.3 / 33.8 / 44.0, 20.2, 588/462 | same (pattern plus glob seeds) | yes |
| Share of all dev instances: product A/B/C/any; program A/B/C/any | 19.6/3.6/22.8/23.4; 11.5/12.0/20.1/21.1 | same | yes |
| C tie at cut: program / product | 34.6 % / 41.7 % | 34.6 % / 41.7 % | yes |
| "Keyword search is the strongest arm on almost every form" | - | C best or tied on 29 of 30 forms with 5+ scorable (exception: program CQ9, arm B) | yes |

**Mismatches: none.** Two notes on method, neither changes a number:
- Medians of an even count are the mean of the two middle values, rounded (for example program A tokens to first hit:
  6,399.5, shown as 6,400). Tokens to a hit = the 10 listed lines plus the hit's text.
- "Search seeds" for program means pattern plus glob seeds (518 + 3 = 521). NOTES.md does not say so.

**Not rechecked:** the 87.5 % / 85.1 % line-match figures (they need file text at each commit), the agreement with
`use-cases.md` table 3.1, the rule-based form labels, and whether a "read" or "confirmed" span is right in the first
place. The check recomputes aggregates from the extraction output. It does not re-extract episodes from transcripts.

**Wording.** No headline is worded more strongly than its evidence, with one small caveat. "Replayable without
leakage" rests on an inferred commit (the tip of the recorded branch at the episode time). Uncommitted working-tree
edits are invisible, so a snapshot-ok instance cannot leak later content, but it can still be scored against text the
agent never saw. NOTES.md section 2 says this. Section 7's shorter phrasing ("replay ... without possible
leakage") is correct only about leakage.
