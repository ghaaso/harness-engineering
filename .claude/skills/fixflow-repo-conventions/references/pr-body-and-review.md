<!-- Authored for FixFlow, 2026-11-04 -->
# Draft PR body and the review record

Built from plan §0 Resume and Routing (`docs/program/SHIP-PLAN-2026-11.md:31-56`, PR #182 head
3415b5e) and the harness-review rulings that put them there
(`docs/program/HARNESS-REVIEW-2026-11-01.md:259-264`). The repo's own
`.github/pull_request_template.md` still opens with Summary / Slice / Type / an npm-only
Checklist (lines 3-30); for a ship-plan phase the body below replaces it, because plan §0 fixes
the first line and the Scope list and the template's Checklist omits the backend and mobile CI
gates (see SKILL.md §1.5).

## Body skeleton (first commit, draft PR)

```markdown
Plan @ <sha of the commit holding SHIP-PLAN-2026-11.md and the cited design note at phase start>

## Scope (<phase id>)
- [ ] <Scope item 1, copied from the plan's Scope for this phase>
- [ ] <Scope item 2>
- [ ] Gates green locally (backend: design Appendix A; web/mobile natively) — skipped counts: <n>
- [ ] CI green on the PR (frontend, mobile, backend jobs)
- [ ] CLAUDE.md updated in this PR where the stack, a constant or the Alembic head changed
- [ ] Done-when: merged; deploy-train row added   (or: deployed per runbook R5, after T_close)

## Register ids this PR fixes or touches
<id> — <one line> — test that fails on base and passes on head: <path::test>

## Decisions / ruled out / owner corrections (this phase)
- <date> <entry>   (appended the moment it occurs; `gh pr edit <n> --body-file <file>`)

## Review
<filled by the reviewer record below; one block per review pass>
```

Rules the skeleton carries (plan line in brackets):

- The body's **first line** is `Plan @ <sha>` [36-37]. On resume run
  `git diff --stat <sha>..origin/main -- docs/program/` and re-read any changed section before
  ticking the next box [37-39].
- Scope is a **checkbox list**, ticked as items land; resume = `gh pr view <branch>`, first
  unticked box [31-33].
- The journal is appended **when the decision happens**, not at the end, so it survives a
  context compaction (HR-C2) [39-41]; at phase close each entry moves to its owner (a
  W0-results decision row or a plan amendment) and the journal says where it went [41-43].
- The phase's closing message answers six questions — goal, where it fits, why this choice,
  before/after, what evidence ran (incl. skipped counts), what remains — then refreshes
  `docs/program/OWNER-VIEW.md` [43-46].
- Write the body to a file and pass `--body-file`; apostrophes break inline arguments in this
  shell (project memory `user-git-identity`, 2026-10-31).

## The review record (what the Opus reviewer returns, per pass)

Plan §0 Routing [51-55] fixes four things a verdict must carry:

1. **The PR head SHA it read.** A push after review needs a re-read of the diff since that SHA
   before merge [52-53].
2. **Per register id fixed:** the test that **fails on the base commit and passes on head** [53-54].
3. **Every changed expected value, removed assertion and new skip or xfail**, each with its
   reason [54-55].
4. A **refute-by-default** stance against the register ids the brief names [51-52].

```markdown
### Review pass <n> — head <40-hex sha read>, base <sha>, plan <sha from line 1>
| Register id | Verdict | Fails on base / passes on head | Evidence |
| --- | --- | --- | --- |
| <id> | CONFIRMED / PARTIALLY / REFUTED / UNVERIFIABLE | <path::test> (base: <how shown>) | <path:line — quote> |

Verdict values are design §5.2 `VERDICT`'s, with the agent file's glosses
(`.claude/agents/fixflow-pr-reviewer.md`): CONFIRMED = fixed as claimed on this head, REFUTED =
not fixed, PARTIALLY = part of the claim holds, UNVERIFIABLE = carries `what_would_settle_it`.

Changed expectations: <file:line — old → new — reason given in the PR, or "no reason given">
Removed assertions: <file:line — assertion — reason>
New skip / xfail / .only: <file:line — marker — reason>
Conventions: <each failed row of SKILL.md §4 with its evidence; "all pass" otherwise>
New defects (not in the brief): <FINDINGS items, design §5.2 shape>
```

How "fails on base" is shown without checking out the base: the reviewer reads the test and the
base-side code at `<base>` with `git show <base>:<path>` and states which assertion the base
code cannot satisfy (VERIFIED-IN-CODE), or the brief says "runs commands" and the session ran
the test on both commits (VERIFIED-BY-COMMAND, with the command and exit codes). INFERRED is
allowed only with that label.
