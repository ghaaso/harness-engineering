# a1 state: lane budget (round 3, task r57-0512)

Orchestrator: a child session of the top session, started 2026-11-19. Briefs: `a1-brief-*.md` beside this file.
Lane file: `lane-budget.md`. Standards and limits: `ROUND.md`.

| Step | Kind: model | Brief | Writes | State |
|---|---|---|---|---|
| 0 | orchestrator | | `a1-brief-*.md`, this file | done 2026-11-19 |
| 1 | collect: sonnet x5 | `a1-brief-collect.md` | `a1-collect-{pacing,allocation,quotas,longjobs,llmbudget}.md` | next |
| 1b | collect: sonnet | `a1-brief-collect-retry.md` | "Second attempt" in a collect file | if any paper was not tried |
| 2 | analyse: opus | `a1-brief-analyse.md` | `a1-report.md`, `a1-claims.md` | |
| 3 | run: sonnet + refute: opus | `a1-brief-gate.md`, `a1-brief-refute.md` | `a1-gate.md`, `a1-refute.md` | |
| 4 | analyse: opus | `a1-brief-fold.md` | `a1-report.md` final, `library/journal/2026-11-19/a1.jsonl` | |
| 5 | extract: haiku x5, then run: sonnet | `a1-brief-extract.md` | `library/journal/2026-11-19/x44..x48.jsonl`, `a1-check.md` | |
| 6 | orchestrator | | commit and push | |

## Usage
- Before step 1: week (all models) 53 %, week (Fable) 43 %. Stop at 62 %.

## Notes
