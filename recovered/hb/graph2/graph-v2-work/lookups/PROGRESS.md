# Lookup test set - progress (resume from here if interrupted)

- [x] Read use-cases.md, REFUTE.md (sections 4, 6, 7, 11), DESIGN.md section 10, the use-cases scripts (scratchpad/usecases/*.js).
- [x] File lists in out/: files-a31924a.txt (tree of frozen commit), files-index.txt (tracked now, docs branch), files-untracked.txt, files-originmain.txt.
- Decisions: transcript cutoff 2026-11-13T14:13:00Z (the time the use-cases lane parsed, so the form weights match its tables);
  episodes, classes and question forms reuse the use-cases rules verbatim (copied into extract.js.txt).
- [x] extract.js.txt -> out/instances.jsonl (4,829), out/transcripts.jsonl (1,481: 109 product, 1,269 program, 103 empty).
  Checked by check2.js.txt -> out/check2.json (2026-11-14, second agent): no bad lines, ids unique; product 1,069 episodes,
  3,124 calls, 5.35M fetched, 241.8M carried = use-cases.md exactly; program 3,760 / 18,979 / 47.8M / 1,144.8M (use-cases:
  3,763 / 19,024 / 47.9M / 1,147M; small gap from transcripts that changed after its parse).
- [x] version.js.txt -> out/instances-v.jsonl, out/version-summary.json. Complete (4,829 lines, same ids, same order, every
  line has ver/replayAll/replayPrimary). KNOWN BUG: summary key afterLatestSnap counts a misspelt field and shows 0; the
  per-instance field sessionAfterLatestSnapshot is right (every session is after the latest snapshot, 2026-08-03). Report
  recomputes from instances-v.jsonl, not from that key.
- [x] sessions.js.txt -> out/sessions.json (26 session ids; one session e24f17dc runs 2026-10-31..11-13, 37 % of carried).
- [x] split.js.txt -> out/split.json, out/split-sessions.tsv; sha256 f49e3828cb6fcd89e3351d3e27dc56ebcdbf101a66c075fb66d34eab4dc6fee1.
  dev: 4 program-home + 8 product-home sessions; realised dev share of carried: product 57.8 %, program 65.3 %.
- [x] probe.js.txt (sizing: 2,953 dev instances, 88 commits). baseline.js.txt -> out/baseline-instances.jsonl, out/baseline-log.txt
  (2nd run, with cheapest-hit tokens; peak rss 440 MB; about 25 s). Untracked docs are read live, so re-runs can drift by an instance.
- [x] report.js.txt -> G2/lookup-testset/result.json, tables.md, split-sessions.tsv; stdout in out/report-stdout.txt.
- [x] NOTES.md written in G2/lookup-testset (167 lines). DONE 2026-11-14.
