# Rust preparation: state (the session tool's move to Rust, steps 1 to 5)

Session a3167e3c (orchestrate, Opus), started 2026-11-24 from the round 9 coordinator. Brief:
`docs/program/monitor/round9/MIGRATION-BRIEF.md`; his words: `docs/program/monitor/round9/FEEDBACK-3.md` (they outrank it).
Outputs go under `docs/program/monitor/round9/migration/`; the hook under `.claude/hooks/`. Nothing committed without his word.

Deliverable: docs/program/monitor/round9/migration/

## Waves (his order)
1. Skills: three independent Sonnet collect helpers (S1, S2, S3); with them, two Sonnet collect helpers on failure modes
   (F1 Rust development, F2 JavaScript-to-Rust migrations, Tauri and WebAssembly). They do not depend on each other.
2. Plan and requirements (SRS with floors): one Opus analyse helper, reading the wave 1 outputs and the round 9 files.
3. Floor checks (Sonnet build) and the enforcing hook (Opus build-invariant).
4. Then his approve: for installs (source and size) and the development cap.

Expected spend (r57-0188, r57-0173): skills 8.4 M, failure modes 5.6 M, plan and SRS 9 M, floor checks 4 M, hook 14 M,
this session about 12 M: 53 M.

Cap 75 M tokens (owner, 2026-11-24, r57-0081)
Meter line 64 % all models (computed: 60 % read at the start + 75 M at about 62 M a point (r57-0173) = 61.2 %, plus 2.8 points kept for his own use until the reset on 2026-11-30)

## Close (2026-11-24)
Steps 1 to 5 done: migration/SKILLS.md, PLAN.md (step 0.4 added), FAILURE-MODES.md, SRS.md, CHECKS.md, checks/ (126 checks;
19 tests pass; 27 of 33 page checks hold on today's tool before the corrections), .claude/hooks/migration-gate.mjs (live).
His approvals: r57-0083 (three floors corrected in SRS.md and CHECKS.md; check code updated in step 0.4), r57-0084
(installs), r57-0085 (level 1 cap 143 M). Spent 51.0 M at the approvals, counted from the transcripts (this session 8.9 M).
Development: proposed as a session card (brief migration/briefs/DEV-LEVEL1.md); it starts on his click. Nothing committed.
Page: https://claude.ai/artifact/5oXF2UqneNX21Eyt6q3Xxo
