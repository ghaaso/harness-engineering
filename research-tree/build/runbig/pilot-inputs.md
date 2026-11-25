# Pilot inputs drafted (node 4 of PILOT-PLAN), 2026-11-24

**Field f9: self-correction against outside checks.** It asks what a model's review of its own output does to errors
and hallucinations, compared with review by a fresh context, another model, tests, or verifiers. It comes from
direction lane 5. Round 3 did not cover it, and neither did the research run: that run named the key for f5 and never
read it [measured]. It serves the tree's purpose (r57-0047) and bears on F1 and step 6.

**Files**, in `research-runs/pilot-2026-11/plan/`:
- `protocols/f9.json`, `analysis-plan.json` and `tasks-plan.json` pass tcb's schemas [measured].
- `questions/f9.json`: 12 questions and 18 approach ids.
- `cost-inputs.json` and `our-work/` (5 files, 27.7 KB).
- `plant-candidates/f9.draft.json`.
- `comparison2/`: the research run's four files, field renamed, plus `LAYOUT.md`.
- `notes/`: `pilot-protocol.md` (the comparisons and the six probes) and `thresholds-for-run.json`.

**Cost.**
- `cost.mjs predict --s2`: 59.5 M [computed], a stand-in with helpers not modelled.
- Measured basis: 100.8 M, or 138.4 M at Q3.
- With B 172 M and r 15.3 M, S2 waits for T [computed].

**Plants.** Six candidates (three with the hoped answer, three against) for k = 3, each from a quoted source. Card ids
are added once T's pack exists.

**Open.**
- S1 and S2 carry the `control` role until unit 3 lands.
- The threshold values must land on `build` before the pin.
- The seed ids come from memory.
- One more scorer run is needed: 1.79 M.

approve: the pilot's field f9 (self-correction against outside checks), its 12 questions, the 18 approach ids, the protocol `plan/protocols/f9.json` to be frozen, and the analysis plan `plan/analysis-plan.json`, as drafted.
