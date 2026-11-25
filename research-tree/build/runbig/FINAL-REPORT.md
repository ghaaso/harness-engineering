# The big run: final report (2026-11-24, coordinator f6ee0985)

Approval r57-0064, cap 860 M (r57-0073), meter line 57 % (r57-0070). State and log: `../RUN-BIG-STATE.md`.

## What ran
- Build merged into top9/track-plan three times (95856686, 06ba3103, 11288a0c; not pushed). Targeted tests pass, none fail.
- The pilot's preparation: four fix units and two follow-ups landed on build (PA, PB+PB2, PC, PT, then PA2 and PC2 after
  their refuters each found one breaking fault). Pin 2662bb99. Run root ready (commits 34ba3bf, afa35bb), coordinator
  record initialised (ce 1), dead-man task enabled.
- The 12 GB card run, network off, in containers: D2 (text search: BM25, grep, Qwen3-Embedding-0.6B, SweRankEmbed-Small)
  and D4 (learned graph forms ComplEx-N3 and AnyBURL against untrained co-change counting), on FixFlow, the clinic and zulip.

## What it showed
- D2 (`d2-report.md`): no embedder passes the gate of +6 Acc@10 points over BM25. Qwen3 +2.9 (95 % interval -3.6 to +9.4);
  SweRankEmbed-Small +1.6 (-3.9 to +7.3), but it has the best top-2 precision (0.284 against BM25 0.251). Both are strong on
  FixFlow (+23 and +14.5) and weak on the clinic (-14 and -11). Every arm misses the top-2 precision lines.
- D4 (`d4-report.md`): no learned graph arm reaches its +0.02 gate, pooled or in any repository. Pooled P@10: best untrained
  0.120, ComplEx alone 0.066, AnyBURL alone 0.046, ComplEx fused with counting 0.120 (difference 0.000, -0.001 to +0.002).
  The only positive difference is fused ComplEx on the clinic, +0.011 (0.003 to 0.021), under the gate.
- Conclusion for this form: simple co-change counting with a time decay is as good as the learned graph forms at this size;
  shelf embedders are not clearly better than BM25. One form each, three repositories, one held-out run each.
- Not tested: RotatE (the paper gives no learning rate; the authors' released settings not read), counts given to the learned
  forms, GraIL, a fusion weight below 0.25, tuned or larger retrievers (the 24 GB card).

## What was fixed in this run
- Pilot: helpers could not start (settings deny of Task), a helper could start on a model off its route, single-session
  control runs would be stopped at 1.78 h; tier strings, thresholds and pilot rows. All landed.
- Card: D2's four breaking findings (leaked history branch, file names in queries, gate lines, ties); D4's two (AnyBURL
  learned at unequal budgets; RotatE's learning rate not from the paper, now left out) and the N3 grid extended.
- SweRankEmbed's table step failed on a Windows path after the card part succeeded; the table was made by hand from the
  same score file. No breaking fault is left open; no further fix round was needed.

## Cost
- About 178 M tokens across the five coordinator sessions and their helpers (all tokens, cached reads included; 7.7 M
  fresh), against the 860 M cap. The pilot itself has not started spending. Weekly meter 47 % all models, 22 % Fable
  (line 57 %). Card: D4 about 2 h of training (3.9 h wall), D2 about 0.3 h.

## Left for the owner
- Open a new session on Fable in C:/Users/User/Documents/projects/research-runs/pilot-2026-11 and paste the start line
  (field result.brief in owner/init-out.json). Until then the dead-man task alerts that no coordinator is running (21 runs
  since 08:35 UTC).
- Remove the 20 unit worktrees (the permission check refused it for sessions).

## End list (non-breaking)
- shards.cmds lacks selftest tests PA-4 and PB2; the creep gate takes the first path as the piece and counts a helper
  killed by an app restart as running; the dead-man XML template needed three edits to import; the app refused some
  helpers' report writes; a helper brief that writes .claude/settings.json is refused by the auto-mode check.
- PA: coordinator.md:142 says "tier"; a deny when two hooks answer is not observed. PC: nothing stops a child at W_quality;
  cost-inputs.json, the spec and CONTRACT.md still carry old values (300000, 240); N_max stays 2.
- CARD-D2 and CARD-D4 non-breaking points (in their verdicts): GraIL's missing licence; the FixFlow extract's branch and sha
  not recorded; zulip carries 82 % of the pooled gate.
