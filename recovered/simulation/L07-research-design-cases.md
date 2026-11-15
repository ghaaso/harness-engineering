# L07 Research and design cases (facts only)

Repo root R = C:/Users/User/Documents/projects/EMS_workshop1. Clinic = C:/Bilal_Migration/User/Downloads/20_PROJECTS/24_Clinic_Workshop.

## L07-1 "A usage limit halted everything" was a power-off
- When: written 2026-11-06 to 2026-11-09; overturned 2026-11-11.
- Who: the clinic root session wrote the claim (model not shown in the record). The correction came from a bottleneck-map workflow (wf_00659e96-f2a) reading the Windows log.
- What happened: the clinic task record says the three-day halt was a usage limit. The map found the PC powered off 31 seconds after the last commit. No limit message exists on 6 Nov. The "limit" story first appears in the root's own message on 9 Nov. The owner's list (B03) copied it. A fix designed for limits would not have stopped any of the 24 power-offs.
- Evidence (exact):
  - Clinic docs/tasks/clinic-build/task.md:763: "A usage limit stopped every session on 6 November at about 14:57; nothing was lost".
  - R/docs/program/evidence/harness-bottlenecks/map-full.txt:85: "Event 6008: 'The previous system shutdown at 2:58:23 PM on 11/6/2026 was unexpected'"; "No clinic transcript holds a rate-limit record on 6 Nov. The only 'You've hit your session limit' records are on 1 Nov and 3 Nov"; "The 'usage limit' story first appears in the root's own message on 9 Nov."
  - R/docs/program/HARNESS-BOTTLENECKS-2026-11.md:20 (row B03) and :42.
  - Slice transcript nervous-newton-322a49 ends on an api-request at 2026-11-06T09:59:05Z with no response.
- Sources: files above; machine-facts.md in the same evidence folder (Docker AutoStart false, 31 containers restart "no").
- Later moment: (a) On 9 Nov the root restarted Docker and resumed all sessions at once (task.md:763); the 34-minute wait of 2,030 s followed (HARNESS-BOTTLENECKS-2026-11.md:21, row B07). (b) HARNESS-BOTTLENECKS-2026-11.md:397: "Whether cache reads count against plan limits is unknown (§4), and the stops were power-offs. A token cut may not cut a single stop." Line 369 proposes a resume-mismatch guard for the same cause.

## L07-2 Graph test verdict withdrawn after four checks had passed it
- When: built and verdict written 2026-11-12; rejected by the owner "later the same day".
- Who: main session plus script; checks by an edge-accuracy check, a refuter and two independent classifiers (HARNESS-BOTTLENECKS-2026-11.md:25 header). Replacement round: six research lanes, three verifiers, a critic.
- What happened: a file-level import graph of FixFlow was tested against 200 testbed searches. Verdict: no graph database, no traversal cache. The owner objected: no real graph engine tried, naive graph (file-level, no ranking, no hop tuning, no typed edges), one query scored, sample from another project. A research round confirmed this. The verdict was withdrawn in the same document.
- Evidence (exact):
  - R/docs/program/HARNESS-BOTTLENECKS-2026-11.md (about line 251): "**The first test was rejected and replaced (2026-11-12, later the same day). The verdict above is withdrawn.**"
  - Old verdict (about line 247): "Verdict. No graph database and no traversal cache. On this evidence a connection index would save few tokens in sessions like the testbed's."
  - Measured after: "everything that depends on a file" recall 0.25; import neighbours 0.38 at 1 hop, 0.72 at 2, 0.87 at 3; top-ten precision 0.19 traversal order, 0.24 PageRank, 0.26 co-change, 0.28 combined; "With 75 held-out commits a difference under about 0.09 in recall cannot be detected, so 'inconclusive' is a likely outcome".
  - The old test's result is also quoted in the summary ("it would have fully answered one and saved no step") and then marked rejected.
- Sources: R/docs/program/HARNESS-BOTTLENECKS-2026-11.md; R/docs/program/evidence/harness-bottlenecks/graph/ and graph2/protocol.md (frozen replacement); memory project-harness-bottlenecks.md.
- Later moment: the same day the owner stated the library should have "graphs where branches can be merged" (memory project-library-plausibility-review.md, third message). The withdrawn "no graph" verdict was the conclusion on file at that point. Also graph2/protocol.md must treat the withdrawn result as a baseline it supersedes.

## L07-3 A design ruling that passed a judge panel and refuters was a blocker (ship plan v6, finding I-1)
- When: 2026-11-01. Ruling HR-A1a in v6; blocker found by delta check wf_6442fbc1-cc4; fixed in v7; fix re-checked in v8 (wf_51eaeaeb-189).
- Who: main session adjudicated (Fable per commit trailers); panel judges and refuters ruled on the geofence design; three Opus critics found the blocker; one Opus critic confirmed the fix; Sonnet re-located citations.
- What happened: HR-A1a, ruled after a panel and refuters, said to enqueue the presence row "before the fix resolves" and that "the server recomputes every row". The server judges only from the lat/lng in the payload at ingest, and a later row with the same client_id is deduped. So every crossing would lose its coordinates. No gate caught it (P5c accepted "inside or unknown").
- Evidence (exact):
  - R/docs/program/SHIP-PLAN-2026-11-critique-5.md:16: "[BLOCKER] I-1 (invariants) ... Read literally, 'the presence row is enqueued before the fix resolves' together with 'the server recomputes every row' strips every crossing of its coordinates."
  - R/docs/program/HARNESS-REVIEW-2026-11-01.md, HR-A1a: "the v6 wording 'before the fix resolves' would have stripped every crossing of its coordinates; the delta check caught it as a blocker". Panel: "judge 1 'wrong → change_now', judge 2 'sound_but_suboptimal → change_now'".
  - Final check, critique-5.md:456: "I-1's adopted option, enqueue after the bounded fix, is sound. TaskService schedules the headless invalidation only 2 s after the JS task reports finished".
  - Related slip: commit 093b793 subject "docs(program): ship plan v4 — third verification pass folded in" held v3; fixed by 46c5d98 "ship plan v4 text (commit 093b793 still carried v3 by mistake)". Memory project-fixflow-ship-plan.md: "verify a plan rewrite by content, not by commit message."
- Sources: files above; SHIP-PLAN-2026-11.md line 794 (now "enqueued **after the bounded fix returns**").
- Later moment: P5a is a future phase, so no code session reused it yet. The record shows the reasoning reused inside the same program: v7 text at plan line 794 and the P5c indoor test with a Jest test requirement (critique-5.md I-1 fix). No later session beyond that is recorded.

## L07-4 Knowledge-store: checked design overturned by the owner, then the fix overturned by refuters
- When: v1.2 2026-11-02; owner critique and v1.3 2026-11-03; refuter pass v1.3.1 2026-11-03 (commit 6fba000).
- Who: Opus architects, judges and refuters (wf_926f16a5-8dc, wf_4c53797c-5fb); Fable/main session adjudicating; owner critique; refuters wf_2e148d62-c8f.
- What happened: v1.2 had passed 15 refuted claims (1 confirmed, 21 narrowed, 8 refuted verdicts) and a completeness critic. The owner then said a hand-written lexer should not run the checks and that "a miss is safe" is false for silent do-not-apply entries. Adjudication: partly right, mostly right. The v1.3 fix (a diff rule) was then attacked: 53 of 73 attacks fell, and the rule would have warned on 48.7 % of past commits.
- Evidence (exact), C = R/.claude/worktrees/knowledge-store-research-9c609c/docs/program/KNOWLEDGE-STORE-DESIGN-2026-11.md:
  - C section 12.7 point 0: "The default really was an untested hand-written lexer, adopted straight from the completeness critic's suggested fix while the register had pointed at real parsers".
  - Point 2: "'A miss is cheap and safe' is false for `do_not_apply` and `open_defect` entries: a miss lets brute-force throttling be removed from 4-digit PINs (ex6), a permanent mass message through (ex4), a legitimate second payment be swallowed (ex3)."
  - C section 12.8: "6 narrowed verdicts ... 73 attack rows: 53 fell, 16 held, 4 unverifiable"; "under the v1.3 rule 48.7 % of past commits would have warned (103 of 154 with a realistic seed)"; "`useState` is on 31 % of commits".
  - KS-V2: "against a new login file the tests pass and the blobs are unchanged"; "every past edit to the protective files was legitimate (3 of 3), so after 2f48529 the entry would have read 'regression' at every close".
- Sources: C sections 12.5, 12.7, 12.8; evidence/knowledge-store/critique-2026-11-03/ and refute-v1.3/; memory project-knowledge-store-track.md.
- Later moment: 2026-11-12 library review (memory project-library-plausibility-review.md): a stored negative gets read as "never". Checked in git: commit 6928828 (2026-06-26) says re-add the Sentry plugin "only once a Sentry project + auth token exist"; CLAUDE.md (via 140428c, 2026-07-18) says it must never be added, unconditionally; a31924a (#176, 2026-08-03) obeyed ("the @sentry/react-native Expo config plugin stays OUT of app.json"). The plugin was also dropped twice: a6f9048 (2026-06-10) and 6928828 (2026-06-26), after it re-entered through PR #59 (merge b4f0766).

## Searched
Memory notes; docs/program HARNESS-BOTTLENECKS, HARNESS-REVIEW, SHIP-PLAN critique-5, knowledge-store design section 12; evidence map-full.txt; clinic task.md; git log for Sentry and ship plan commits. Not searched: raw session transcripts (jsonl), critiques 1 to 4 in detail, the token-bottleneck report text.
