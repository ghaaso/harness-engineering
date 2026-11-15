## 0. How to read and run this plan

- **Sessions.** One phase per session. A phase marked **(×n)** is *repeatable*: one session per
  unit (a workshop visit, an OEM, a late phone), each filling rows of a table that already
  exists; the phase is complete when its table is. At most **one backend phase that runs the
  Docker gates** (design Appendix A, fixed container names) is in flight at a time on this
  machine; a mobile, web or operations phase may run alongside it.
- **Resume.** A code phase opens a **draft PR at its first commit** whose body is its Scope as a
  checkbox list, ticked as items land; resume = `gh pr view <branch>`, first unticked box. An
  operations phase's **first act commits its numbered step table** (copied from its Scope) to
  `docs/program/W0-results.md`, ticked as executed; resume = first unticked row; an operations
  phase puts the same `Plan @ <sha>` line and journal (below) at the head of that table. Builds
  in flight resume from `eas build:list`. The draft PR body's **first line is `Plan @ <sha>`** (the commit
  of this file and the cited design note at phase start); on resume run
  `git diff --stat <sha>..origin/main -- docs/program/` and re-read any changed section before
  ticking the next box. Under the checklist the body keeps a short **"Decisions / ruled out /
  owner corrections (this phase)"** journal, appended the moment one occurs (`gh pr edit
  --body-file`), so mid-phase state survives a context compaction (HR-C2); at phase close each
  entry is moved to its owner (a W0-results decision row or a plan amendment) and the journal
  says where it went. A phase's closing
  message answers six questions in a few lines: goal, where it fits, why this choice,
  before/after, what evidence ran (incl. skipped counts), what remains; it then refreshes
  `OWNER-VIEW.md`.
- **Routing (design doc §3).** Opus owns anything touching the outbox contract, drain tooling
  and its matching rules, the job lifecycle, ledger/chain and all posting/money code, auth, PIN,
  JWT, migrations, native patches, and the location-privacy time bounds. Sonnet implements
  well-specified screens, read models, infra files, docs and tests from a design's test list.
  Haiku extracts. Every PR gets an Opus reviewer with a refute-by-default brief naming the
  register ids it must try to break; the verdict names the **PR head SHA it read**, and a push
  after review needs a re-read of the diff since that SHA before merge. For each register id
  fixed the reviewer names the test that fails on the base commit and passes on head, and lists
  every changed expected value, removed assertion and new skip or xfail with its reason. The main session (Fable) briefs, gates and judges; it never
  implements.
- **Gates.** Backend gates run in Docker (Appendix A on `postgres:17-alpine` from P3a on; the
  owner starts Docker Desktop and confirms with `docker info`). Web and mobile gates run
  natively (green today on Node 24). A code phase is not done until gates are green locally
  **and** CI is green on the PR.
- **Merge is not deploy — the drain image and the deploy train.** From P3 on, production is the
  **primary host** ("the host" below; the physical machine at the shop is "the home box"). By
  ruling HR-A3 the host is a VPS from P3b until **P13e** moves it to the home box — not before
  the later of P5d-2 done and the last re-open, and only after the §4 box gate. **"Box gate"** is the §4 term for the home box's reliability condition. Where older text says
  "the box" it means the host. Until the drain window closes (`T_close`, P4c) the box runs the git tag
  **`drain-image`**, cut from the branch **`release/drain`** = a branch at P1's squash commit
  with the P2b-2 and P3a squash commits applied **by `git cherry-pick` only — never `git merge`**
  (the repo squash-merges; merging would pull in whatever else reached `main`). After the cut
  `git log release/drain` is recorded in W0-results and must show no commit from another PR, and
  the backend gates (Appendix A) run green on `release/drain` before tagging and after every
  re-cut. Cutting the tag is the last Scope item of whichever of P1 / P2b-2 / P3a merges last
  (P3a-2, if opened, is not part of the image). Runbook R5 deploys only that tag before
  `T_close`. A drain-tool fix during the window is cherry-picked onto `release/drain` and
  re-tagged `drain-image-2`, `-3`… with a W0-results row; an APK-side fix goes to `main`, gets a
  new versionCode and a P2c re-run. Behaviour-changing phases that merge to `main` earlier are
  appended to the **deploy-train table** in W0-results.md (columns: phase, PR, merge sha,
  migration, post-deploy check; the first phase that needs it commits the empty table, P3a
  confirms it exists) and are deployed by P4c; until then their Done-when ends at "**merged;
  deploy-train row added**". After `T_close` a phase ends with "**deployed per runbook R5** (owner
  at SSH, ~15 min); `/api/ops/health` shows the new head and `FIXFLOW_GIT_SHA`, and `docker
  inspect --format '{{.Image}}' backend` is recorded beside it". The **web image** before
  `T_close` is built on **`release/drain-web`** = `release/drain` plus the web-only commits
  P12a/P12 (never on `release/drain` itself); web halves of mixed PRs (P6a, P7b-2, P9b, P10a)
  ride the train, whose last row rebuilds the web image from `main`.
- **Migrations** take the next free slot at rebase time (check the `down_revision` chain) and
  update the CLAUDE.md head in the same PR; branch names carry no numbers. FKs/CHECKs on
  populated tables ship `NOT VALID`; `VALIDATE` lands in a later migration after an audit script
  has run on the box, immediately before that deploy (CLAUDE.md).
- **Retired phones.** A roster phone that cannot be drained (lost, dead, owner-declared) gets a
  **retired row** in W0-results (owner sign-off; its A3 photos transcribed or the loss declared).
  "Every roster phone has a P4b, P4r or retired row" is the condition later phases use.

**Standing rules:**

1. Nothing ships to a phone before the drain protocol has run **on that phone** and its AFTER
   check passed. Installs are per phone, supervised, and never an uninstall — **except** in the
   K=no branch, after the A3 photos, every row retried or transcribed, and the owner's written
   per-phone sign-off (`w2/O-10-design.md` BRANCH K=NO).
2. No field-reliability claim without device evidence from the phone models in the fleet.
3. The **drain image** is the `drain-image` tag (or its re-cut) and nothing else until `T_close`.
   No backend deploy from `main` before P4c.
4. The dispatcher stays OFF. The cursor is re-seeded at `T_close` and again after every P4r;
   enabling the dispatcher is a separate, owner-approved step after the **last re-open**, which
   is the point where every roster phone has a P4b, P4r or retired row (CLAUDE.md; `O10-F7`).
5. The old Railway hostname: K=yes → it may only **hang** (accept, no bytes for ≥ 20 s, close);
   K=no & H=yes → it may **proxy** to the box only from O-10 B6 and only through the repository's
   stub in proxy mode, which hangs instead of answering on any upstream error, 5xx or timeout.
   The stub never originates a 5xx, 2xx or 204 of its own; in proxy mode only the backend's own
   marker-carrying responses pass through (`O10-F3`, `O10-F4`). The stub is removed only after
   every roster phone has a P4b, P4r or retired row (O-10 C). O-08 §4's "503 stub" line is void.
6. Technicians are "released" only by the written release notice (`docs/program/notices/
   release.md`) at the end of their phone's E-steps; until then the hold notice
   (`docs/program/notices/fleet-hold.md`, committed as sent in P0a) stands.
7. Money stays in integer minor units; no money feed (staging, export, push) is driven by the
   `job_event` cursor (payloads may carry amounts for audit); the outbox never deletes a write.

