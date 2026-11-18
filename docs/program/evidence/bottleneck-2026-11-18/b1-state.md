# b1 state and hand-over (task r57-0504, build-in design of the decision rule)

Child session b1 of the top session. b1 stopped as coordinator at 135,000 tokens of context, past the ceiling of
about 130,000 set in its brief (ruling r57-0008); about 64,000 of that is the app's fixed load (tools, prompt,
skills, memory). A successor starts here and reads nothing else of b1's session.

## Done
- Read by b1: library/INDEX.md, library/README.md, CLAUDE.md, research-tree/START-HERE.md, DECISION-RULE.md, records
  r57-0504, r57-0511, r57-0505, r57-0507, o1-0101, o1-0102, r57-0127, r57-0401 to r57-0403, r57-0406 to r57-0408, r57-0128.
- Usage: before wave 1, week 48 % all models (41 % Fable); after it, 49 %. Cap for this phase: stop at 55 %.
  Free memory before wave 1: 14.3 GB of 31.9 GB.
- Wave 1, five Sonnet readers (kind read), 584,000 helper tokens in all, about 2 to 3.5 minutes each. Maps beside the rule:
  - b1-map-lane.md (41 findings): per-unit memory, busy threads, ready queue, time outside the check, conflicts,
    units ready: not logged. Week share, 5-hour share and tokens per unit: logged nowhere (the rule's Step 1 table
    says the week share is logged: to correct). Recorder started by hand; lane used by convention; no queue order.
  - b1-map-hooks.md (46): a PreToolUse hook on the Agent tool read a file and refused a start, also with permissions
    bypassed (observed once). Not observed: a gate on Bash or start_session, hook time-out or crash, concurrent
    starts (a slot count would race without a lock). Hooks see no context size or free memory. About 37 ms per call.
  - b1-map-tcb-a.md (25): admit.mjs:230-243 already gates live sessions at min(N_max 2, N_ceiling 3, hard 3) plus a
    memory term (free - reserve 1024 - peak 1200 x pending >= peak, one flat peak); N_max, N_ceiling guessed in
    thresholds.json; token budget B_tokens null, so it never refuses; nothing on processor or the check.
    check-queue.mjs: no limit or wait record of its own, batch of 12. watch.mjs:554 decides when a start is due.
  - b1-map-tcb-b.md (33): each attempt writes its own staging folder (own copies by construction); no merge, no
    per-file lock or conflict count; locks only run.lock and watcher.lock; no processor or window-share reading
    (only a typed-in meter percent); handover window 133200 is W_star_coord in thresholds.json.
  - b1-map-fixes.md (48): slot counts touched by FX-CLAIM, FX-CLOSE, FX-W2, FX-W7; admission by FX-CGATE, FX-W3,
    FX-PLAN, FX-OUT; FX-W1 a flag allow-list. No fix touches the check queue or changes N_max. "The plan check" is
    named but defined nowhere; research-tree/BUILD-PLAN.md does not exist.
- Briefs for every remaining step, ready to launch: b1-brief-analyse.md, b1-brief-gate.md, b1-brief-refute.md,
  b1-brief-fold.md.
- Step 1 below was started by b1 (Opus helper, kind analyse). It ends b1-claims.md with `<!-- b1-analyse done -->`.

## Next (each launch: "Read and follow exactly the brief in <path>", model as named, description "<kind>: ...")
1. analyse (Opus): b1-brief-analyse.md -> BUILD-IN.md (draft), b1-claims.md. Started by b1.
2. Together, once b1-claims.md ends with the done line: gate (Sonnet, kind run) b1-brief-gate.md -> b1-gate.md,
   and refute (Opus, kind refute, fresh) b1-brief-refute.md -> b1-refute.md.
3. fold (Opus, kind analyse): b1-brief-fold.md -> BUILD-IN.md final, library/journal/2026-11-18/b1.jsonl.
4. Check by command: BUILD-IN.md has sections 0 to 6 and "Verdicts"; b1.jsonl parses; read usage.
5. Commit only the b1 files, BUILD-IN.md and b1.jsonl with `git commit -F`; push once.
6. Report to the top session: the commit, the design in a few lines, what the refuter changed, what is not known,
   which measurement would unblock the most.

## Not to touch
research-tree/lane/*, docs/program/evidence/pc-freezes-2026-11-17/, research-tree/tools/av-watch.ps1, library/INDEX.md.
Never stash, reset or switch branches.
