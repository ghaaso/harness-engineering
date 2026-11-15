# Three-project presentation workflow

Status: **Done in lean mode on 2026-10-21, within the two usage windows the user allowed.** The deck is the Slides artifact https://claude.ai/artifact/1HQZxJcciydQByA7ExMsER (private until shared); its source files are in `E-slides/`. The full-rigour design below stays the reference. See "Lean mode" and the run log at the end.

Script: [three-project-deck.workflow.js](three-project-deck.workflow.js). This folder holds a separate deliverable. It does not change the MD Health Clinic scope that shares this repository.

## What it produces

There is one presentation for one person, who is both client/investor and employer/manager. It covers three projects:

1. **Washing-machine control panel:** camera-free, with only an on/off button. An on-device model chooses the settings. The research covers knowledge distillation onto ESP32-class chips, when a TPU/NPU is worth the cost, and what will not work.
2. **Factory H&S app:** H&S representations and executable system dynamics models, built from scratch out of published research and then validated. It also makes the evidence-backed case for why no software prototype exists yet.
3. **SLM for documentation context:** the local hooks research as measured progress, peer-reviewed results and failure modes from others, and a falsifiable experiment design.

## Evidence rules

- **Labels:** DOCUMENTED, OBSERVED, INFERRED, PROPOSED, UNKNOWN. A label is never upgraded.
- **Source tiers:** peer-reviewed-top, peer-reviewed, preprint, official-doc, industry, local. Venue acceptance is checked on the publisher or proceedings page, not on arXiv.
- **Claim status after Stage A:**

| Status | Meaning | Use on a slide |
| --- | --- | --- |
| confirmed | Verifier opened the source and it matches. Critical claims also survived two independent refuters (source fidelity; contrary/newer evidence). | Yes |
| qualified | Broadly right; the verifier gave a corrected statement | Yes, corrected wording only |
| contested | One refuter objected, a refuter did not report, or the refutation cap was hit | Only with the caveat on the slide |
| rejected / unchecked | Unsupported, source not found, misattributed, wrong venue, or both refuters refuted | Never |

- Failures, limits and counter-evidence are collected with the same rigour as positive results. Each lane has a minimum quota of them.
- Transcripts are used for counts, timestamps and token figures only. Message content and credentials are never read into outputs.

## Stages

Run one stage at a time and review its results before starting the next. Later stages read earlier outputs from disk.

| Stage | What runs | Approx. agents | Outputs | Gate before the next stage |
| --- | --- | --- | --- | --- |
| **A Research** | 10 evidence lanes in parallel: WM-KD, WM-SENSE, WM-HW, HS-HAZ, HS-SD, PR-AI, PR-LOCAL, SLM-LIT, SLM-LOCAL, DES. Each lane runs: researcher → source verifiers → two refuters per critical claim → completeness critic → one targeted gap round (verified the same way) → registrar. | 250-400 | `A-research/<lane>/claims.json`, `evidence.md`; PR-LOCAL also writes `transcript_forensics.py` + CSVs | Every lane registered. The critical claims each project needs are confirmed. Plan-tier proof found or flagged UNKNOWN. |
| **B Build** | **H&S:** architect → representations (CLD, stock-and-flow, boundary, STPA control structure, bow-ties) plus 2-4 executable SD models in Python/numpy with unittest validation suites. **WM:** feasibility, a budget calculator and a "won't work" list. **Proof:** no-prototype argument matrix plus charts. **SLM:** progress report, literature table, failure modes, experiment design. Every item faces 2-3 lens-diverse adversarial reviewers, with up to two fix rounds. | 35-70 | `B-build/hs/…` (models, tests, VALIDATION.md, HS-SUMMARY.md), `B-build/wm/…`, `B-build/proof/…`, `B-build/slm/…` | Model tests actually pass when re-run. Unresolved blocking or major review issues are read and decided on. |
| **C Design** | 4 independent narrative architectures (answer-first, investor risk retirement, failure-forward, evidence-instead-of-demo) → 3 persona judges each score all four (decision-maker, sceptical technical advisor, presentation scientist) → blueprint from the winner plus grafted ideas → parallel section writers → assembler | 12-15 | `C-design/narratives/`, `deck-blueprint.md`, `sections/`, `deck-spec.json/.md` | Timing within ±10%. Every slide has evidence. |
| **D Audit** | Claim-trace, overclaim, sceptic Q&A (25 hardest questions) and design auditors → fixer → re-audit, up to two fix rounds → packager | 6-14 | `D-final/slides.md`, `qa-prep.md`, `audit-log.md`, `README.md` | Unresolved issues are listed in `README.md` |

After Stage D, the deck is built from `D-final/slides.md` using the Slides artifact type, which exports to .pptx and PDF.

## How to run

The script is run with the Workflow tool, using `scriptPath` and these `args`:

```json
{ "stage": "A", "today": "2026-10-20", "talkMinutes": 25, "region": "<factory country, if known>" }
```

- `stage`: `A`, `B`, `C`, `D` or `all`. `A` is the default.
- `lanes`: re-runs only the listed Stage A lanes, e.g. `["WM-HW"]`.
- `laneConcurrency`: number of Stage A lanes run at once. The default is 2. Lanes run in this order: SLM-LOCAL, PR-LOCAL, PR-AI, SLM-LIT, HS-SD, HS-HAZ, WM-KD, WM-SENSE, WM-HW, DES. After a lane fails or cannot register (usually a usage limit), no further lanes start. Resume after the reset with `resumeFromRunId` and the same `args`; agents that already completed replay from cache.
- `outRoot`: output folder. The default is `output/three-project-deck`.
- `python`: Python interpreter. The default is the codex runtime Python 3.12 with numpy, pandas, python-pptx and pypdf.

## Boundaries the deck keeps

- **H&S models:** they are built from published research and validated with structure and behaviour tests against reference modes from the literature. They are **not calibrated to the factory's own data**. The deck says so, and names the data that would allow calibration.
- **No-prototype defence:** three separate claims, each paired with its strongest counter-evidence and a "what this does not prove" section. The "Pro token allowance" claim is only as strong as the plan-tier proof. The transcripts prove that usage limits were hit; they do not prove which plan the account is on.
- **SLM:** progress means the measured hooks research, including what it did not show. "No hallucinations" becomes measurable grounding and abstention targets, because published work does not support promising zero hallucination.
- **Washing machine:** every accuracy, latency and cost figure is either cited or labelled PROPOSED. Nothing projected is presented as measured.

## Lean mode

The full design needs many Pro 5-hour windows; one window covered only about 3.4M subagent tokens. The lean script keeps the evidence rules and makes these cuts:

| Stage | Full design | Lean mode |
| --- | --- | --- |
| A | Researcher (18-30 claims) → verifiers → 2 refuters per critical claim → critic → gap round → registrar | Researcher (10-16 claims; 8-12 for WM-HW and DES) quoting and locating each source as it goes → one independent verifier that checks every claim's source and runs a contrary-evidence search on critical claims → `tools/register_lane.py` (no agent) |
| B | 2-3 reviewers per item, up to two fix rounds; 2-4 H&S models | One adversarial reviewer per workstream (all lenses), one fix pass; 2 H&S models |
| C | 4 narratives, 3 persona judges, section writers, assembler | One deck architect combining the four angles and personas; `tools/check_deck.py` must pass |
| D | 4 auditors, up to two fix rounds | One combined auditor (claim-trace, overclaim, design) plus a sceptic Q&A agent, then one fix-and-package agent |

Most agents run on Sonnet. The deck architect, auditor, packager and H&S model builders use the session model.

**Lean status rules** (`tools/register_lane.py`):
- `confirmed` means the verifier's verdict was supported. `qualified` means partial; use the corrected statement.
- `contested` covers two cases: on a critical claim, the contrary-evidence search found evidence that would mislead an informed reviewer; or, in the two lanes recovered from the full run, one refuter refuted.
- `rejected` means any other verdict.
- `unchecked` means no verdict.
- Each claim records how deeply it was checked in `check_depth`.
- SLM-LOCAL and PR-LOCAL were recovered from the full-rigour run's journal with `tools/extract_journal_lanes.py`. Their refuters had mostly not reported before the usage limit.

**Resume:** every step writes to disk, and `tools/state.py` reads what is finished. Re-launch with the state as `args.state`. Don't rely on `resumeFromRunId`: its cache depends on call order (see run log).

```bash
python -B output/three-project-deck/tools/state.py output/three-project-deck
```

Briefs for the lean agents are generated from the full script by `tools/dump_briefs.js` into `tools/briefs/`. The region is now Pakistan.

## Run log

| Date (PKT) | Run | What happened |
| --- | --- | --- |
| 2026-10-20 12:2x-12:40 | `wf_50b7faf7-cd3`, Stage A, all 10 lanes in parallel | Stopped by the Claude Pro 5-hour usage limit after about 15 minutes (2.44M subagent tokens). 2 of 19 agents finished: the SLM-LOCAL researcher (31 claims) and one SLM-LOCAL verifier batch; both are cached. No lane registered. The PR-LOCAL researcher had already written `A-research/PR-LOCAL/` forensics files before it stopped. The app's usage tool reported plan **Pro** at 17:01. |
| 2026-10-20 17:0x-17:35 | Same run ID resumed with lanes 2 at a time (user chose batched, full rigour) | Stopped by the 5-hour limit after 30 minutes (3.4M subagent tokens, 48 agents, 18 finished). The SLM-LOCAL researcher ran again rather than replaying: the resume cache depends on call order, and the lane order had changed. SLM-LOCAL and PR-LOCAL finished verification, but their refuters, critics and registrars failed. |
| 2026-10-20 23:1x | User: factory is in Pakistan; finish in at most 2 more sessions | SLM-LOCAL (29 claims: 10 confirmed, 19 qualified) and PR-LOCAL (30: 14 confirmed, 16 qualified) registered from the journal. Lean run `wf_f6ba40a2-d8f` launched for the remaining 8 lanes, builds, deck and audit. |
| 2026-10-20 23:1x to 2026-10-21 00:3x | Lean run `wf_f6ba40a2-d8f` | 30 of 31 agents finished (3.28M subagent tokens). All 8 remaining lanes registered, so 10 of 10 lanes are on disk with 167 claims; 1 rejected and 1 contested. All 4 workstreams are final, with unresolved issues recorded in each `DONE.json`. The deck architect was stopped by the 5-hour limit. A verifier fixed `register_lane.py` to handle numeric years. |
| 2026-10-21 08:5x-09:4x | Lean run `wf_ed336d11-198`, deck and audit only (state from `tools/state.py`) | 4 of 4 agents finished (0.80M subagent tokens). Final `C-design/deck-spec.json`: 25 main slides (22.7 min) and 17 backup slides; `check_deck.py` reports 0 errors. `D-final/` holds `slides.md`, `qa-prep.md`, `audit-log.md`, `AUDIT.json` and `DONE.json` (18 unresolved items, also listed in `README.md`). |
| 2026-10-21 09:4x-09:5x | Slides artifact https://claude.ai/artifact/1HQZxJcciydQByA7ExMsER | 16 chart SVGs uploaded as assets. Two agents (`wf_709c2de1-00a`, 0.34M tokens) wrote `E-slides/project/deck.json` and 42 slide files from `E-slides/BRIEF.md`; a structural check passed; published as version 3. Not rendered or visually checked. Some table and card slides arrange text from the speaker notes, the footnotes or the B-build files (s03, s24, b03, b04, b07, b09-b13), and the slide layer was not re-audited. |
