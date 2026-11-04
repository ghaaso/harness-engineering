# Harness ideas from Dex Horthy's published work (2025-06 → 2026-11)

**Status: ideas only.** This document changes nothing. It lists every idea in Dex Horthy's
(HumanLayer) published work since 2025-06-01 that could improve this repository's agent
harness, scores each against the five known weaknesses and three levers, and records what
survived an adversarial review. Nothing here is installed, wired or adopted; every "adopt" is a
proposal for the owner to accept or refuse. Plan at the time of writing: `SHIP-PLAN-2026-11.md`
v8 at commit 3415b5e (PR #182); harness review `HARNESS-REVIEW-2026-11-01.md`; knowledge-store
design at PR #183. Evidence: `docs/program/evidence/harness-ideas/horthy/` (README there lists the
files; `manifest.sha256` pins them).

The weaknesses and levers every idea was scored against:

| Id | Statement |
| --- | --- |
| W1 | `CLAUDE.md` is 390 lines, nearly twice the length at which adherence is known to fall; a trim is gated behind the knowledge-store pilot |
| W2 | Compliance with the phase routine is self-reported; with no hooks, "the store was never consulted" and "the routine was skipped" look the same from outside |
| W3 | The phase routine has never run; P1's cold-resume trial (a fresh agent must recover ten frozen facts from the repository alone) is its first test |
| W4 | One custom agent exists (a Haiku locator); skills are being added now; no reusable workflow library |
| W5 | Workflows are authored per task and not saved |
| L1 | Effort routing: most verifiers run at xhigh; his October 2026 SlopCodeBench report says medium often matched or beat xhigh at lower cost |
| L2 | Context budget and compaction: the defence is one phase per new session; his material covers the "dumb zone", context forking, long-context limits |
| L3 | Output backpressure and verifiers: outputs are capped and refuters run first; his material covers backpressure scripts, "no software factory without better verifiers", the software-factory essays |

---

## 0. For the owner (half a page)

**What the sweep found.** 326 sources, 46 blind Sonnet readers, 1,987 idea cards deduplicated by
code to 1,906, clustered into 838 claim families, each scored by two Opus reviewers with opposite
lenses; 144 families that at least one reviewer wanted to adopt or trial were attacked by a
fresh-context Opus refuter at xhigh (default verdict refuted). **Nothing survived whole.** Every
surviving adopt (24 families) and trial (53) is the refuter's narrowed version, usually one
sentence in the ship plan's §0 or one line in a reviewer brief. **395 families (47 %) were "already
done here"**: the harness already has the mechanism he describes, often in a stronger form (the
refute-by-default reviewer bound to a head SHA, the evidence manifests, the skip-aware gates, the
`Plan @ sha` resume rule). 350 were skipped, mostly for weak evidence: of 1,906 cards only 75 (4 %)
carry a measured number, and the one measured lever, L1, rests on a single benchmark run per
setting. Not one idea re-opens the skipped hooks, context system, measurement pipeline or
pre-commit gate as such; two trials below give W2 an outside check without any of them.

**Top adopts (each costs minutes, none touches `CLAUDE.md`):**

1. **Three CI checks for traps the repo has already paid for** (G1-F010, G1-F011, G4-F008): a Ruff
   banned-API rule on `hmac.compare_digest` (allow-listed in `core/security.py`), an `eas.json`
   check for empty env values, an `app.json` check that bans the Sentry config plugin. Lands in
   the phase that first touches each config (P1 or its CI split). *Proof:* a planted violation
   fails CI on the base commit and passes after the fix, for all three.
2. **Reviewer-brief evidence clauses** (G2-F015, G4-F073, G2-F104): each fail-before line cites
   the command run on the base SHA and its observed output, or says "read, not run"; the verdict
   lists every added inline suppression and every gate-config edit with its reason, backed by a
   diff grep. *Proof:* over the first five PRs a scripted grep finds zero omissions.
3. **Keep the P1 cold-resume trial honest** (G2-F051, G2-F044): commit only the sha256 of the
   answer key before the agent runs, the file after judging; the transcript must show zero reads
   of the trial folder and HEAD unchanged. *Proof:* those three facts, recorded in the P1 journal.
4. **Resume hygiene, three sentences in §0** (G2-F056, G2-F192, G2-F054): `git fetch origin`
   before the resume diff and before recording `Plan @ sha`; fetch the live PR body before every
   `--body-file` write; a missing or inconsistent resume source stops and asks instead of starting
   fresh. *Proof:* recorded shas equal `ls-remote`; PR edit history shows no lost journal line over
   three PRs; one fault-injected resume in P1 stops.
5. **A save rule for workflows** (G3-F117, G3-F088; W5): a script is kept only after its shape has
   run in a second phase or answers a recorded failure, its header names those uses, and the
   evidence rules require the script as run plus its args beside the outputs. *Proof:* by P10 every
   saved script has two dated uses or a failure id.

**Top trials (each names the one measurement that decides it):**

1. **Medium-effort verifiers for everything that is not a P0 skeptic** (G4-F034 with G4-F032,
   G4-F181, G4-F031; L1): blind paired shadow runs, a second agent at medium on the same brief and
   model, at least 30 pairs across the next review workflows and PR reviews, scored against the
   final adjudication; a pre-registered pass bar and three repeats per arm. *Cost:* about 30 extra
   Opus-medium agents. *Decides:* whether the xhigh default for refuters and the PR reviewer stays.
2. **A transcript tally at phase close** (G2-F183, G2-F023, G3-F074; W2): one read-only Node script
   over the session JSONL scoring the routine steps that leave no git or GitHub trace (Fable never
   edits code, the reviewer brief carried the head SHA and register ids, the cold-resume dispatch
   happened, gates ran). Run after P1, P2 and P3 within seven days. *Cost:* about 100 lines.
   *Decides:* whether an outside compliance check is possible without hooks.
3. **An advisory PR-body check in CI** (G2-F118, G4-F232, G1-F196; W2, W3): a separate GitHub
   Actions workflow asserting the `Plan @ sha` line resolves, the journal heading exists and the
   posted reviewer verdict names the head SHA; advisory while draft, over five PRs. *Cost:* about
   40 lines of YAML. *Decides:* real catches versus false alarms.
4. **Runtime-scoped `CLAUDE.md` split as one arm of the adherence probes** (G1-F022, G1-F004; W1):
   backend-only and mobile-only material moves to `backend/CLAUDE.md` and
   `technician-app/CLAUDE.md`, every cross-runtime rule and a pointer index stay in the root;
   measured with the knowledge-store design's frozen probe set plus three oblique probes. The
   refuter checked that nested files attach to subagents on a Read in this worktree, and that
   diff-only reviewers would lose what moves. *Decides:* probe pass rate, split versus full.
5. **Trim the 24 skill and agent descriptions to ≤ 400 characters** (G1-F036; L2, W1): `/context`
   before and after, pass if the combined lines fall by half and a routing check shows nothing
   mis-triggers. *Cost:* an hour.
6. **The seven recurring defect shapes plus one** (G4-F089, G4-F088; L3): the HANDOFF §6 shapes,
   and an eighth asking which copy of any new stored state is authoritative, become required
   per-shape lines in the §0 reviewer brief; first a retrospective A/B on three known defects
   (the pre-0043 setter, the live-derived wizard state, the blank-prefill path), with and without
   the lines. *Decides:* catches the brief adds versus false steers.

**What the owner should know before deciding.** Half of what he publishes this harness already
does. His own numbers have moved under him: the "dumb zone" was 100k tokens in mid-2025 and "much
higher now" by September 2026, the 40 % context rule was set on 200k windows, and the
medium-versus-xhigh finding is one run per setting with no error bars (his report says so). The
one place his material cuts against the plan is the knowledge-store ruling that keeps every
`CLAUDE.md` rule: his March 2026 `<important if>` technique and his "delete what a linter can
enforce" trim both fell to that ruling and to the fact that his adherence claims carry no
measurements. The AGNTCon talk the brief flagged, "There Is No Software Factory Without Better
Verifiers" (2026-10-22), still has no recording or slides; its promo was read, the talk was not.

---

## 1. Pre-review list

The pre-review list is every card, unjudged, committed verbatim before any review ran, at
`evidence/harness-ideas/horthy/sweep/PRE-REVIEW-LIST.md` (1,906 cards, 1.3 MB, newest source
first; `cards-merged.json` is the same data; `readers/R01..R46.json` are the readers' outputs
verbatim; `dedupe-merges.json` lists each of the 81 merges the code made so a wrong one can be
found). It is not reproduced inline. Each card carries: id; source title, URL, date and type;
author (Dex, Kyle, Dex+others, other); whether the reader read the primary text or only a summary;
a verbatim quote of at most 15 words; the claim in one sentence; the evidence the source gives
(measured, anecdotal, asserted, marketing) and its detail; the weakness or lever it bears on; the
reader's first guess at where it would land; and whether the inventory listed the source.

What the 1,906 cards are:

| Cut | Counts |
| --- | --- |
| Author | Dex 1,420 · Dex with others (unsigned HumanLayer files and docs) 268 · Kyle Mistele 97 · others (critique-only cards from HN, follow-ons, a third-party study) 121 |
| Read mode | primary text or transcript read 1,769 · summarised (page descriptions, third-party summaries, README notes) 137 |
| Evidence | asserted 1,027 · anecdotal 723 · marketing 81 · **measured 75** |
| Source type | AI That Works episodes 582 · repositories 434 · podcasts 291 · talks 193 · blog 152 · HN 63 · X threads 53 · docs 47 · X articles 37 · release notes 23 · follow-ons 22 · other 9 |
| Source date | 2025 (June onward) 359 · 2026 1,547, of which July 242, August 220, March 200, October 182, September 138, November 130 |
| Bears on (first listed) | L3 478 · W3 330 · L2 238 · W1 206 · W4 172 · W2 163 · L1 155 · W5 89 · none 75 |
| In the inventory | 1,537 cards cite a source the inventory listed; 369 cite one found during the sweep (§3.4) |

The dedupe is lexical only (token Jaccard ≥ 0.4 on claim plus quote, light stemming): it merged
81 near-identical phrasings and nothing else, so the same idea stated differently by two readers
is two cards here. The semantic grouping happened in the review as families (§2); every card's
family is in `review/card-dispositions.tsv`.

---

## 2. Post-review list

Every one of the 1906 cards sits in one of 838 families (the clusterers covered all cards; code validated membership after the run: 0 invented ids, 0 unassigned cards, 0 cards placed outside their weakness group). Each family carries two Opus reviews (A = benefit-seeker, B = cost-and-novelty skeptic; five scores 0–3 in the order evidence / transferability / novelty / benefit / cost-risk, higher is better on every dimension, then the disposition) and, where at least one reviewer said adopt or trial, a fresh-context Opus refuter's verdict. The complete per-family list with every reviewer's one-line reason is `evidence/harness-ideas/horthy/review/POST-REVIEW-LIST.md` (838 rows); the per-card mapping is `review/card-dispositions.tsv`; the raw reviews, refutations and critic output sit beside them. This section prints in full the families that survived the refuters, the families the cap left unrefuted, and a count of the rest per weakness.

| Weakness or lever | Families | Cards | adopt | trial | already-done | skip | unrefuted (over cap) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W1 CLAUDE.md length | 150 | 313 | 5 | 11 | 72 | 61 | 1 |
| L2 context budget | 101 | 244 | 1 | 5 | 69 | 24 | 2 |
| W2 self-reported compliance | 148 | 339 | 10 | 19 | 70 | 46 | 3 |
| W3 routine never run, cold resume | 102 | 266 | 2 | 1 | 51 | 47 | 1 |
| W4 agents and skills | 72 | 147 | 2 | 1 | 31 | 38 | 0 |
| W5 workflow library | 29 | 43 | 0 | 0 | 9 | 20 | 0 |
| L1 effort routing | 87 | 224 | 3 | 6 | 30 | 44 | 4 |
| L3 backpressure and verifiers | 95 | 255 | 1 | 9 | 46 | 34 | 5 |
| cross-cutting | 54 | 75 | 0 | 1 | 17 | 36 | 0 |
| **All** | **838** | **1906** | **24** | **53** | **395** | **350** | **16** |

Reviewer dispositions before refutation (two per family): trial 162, skip 759, already-done 674, adopt 81. The two lenses agreed on the disposition for 669 of 838 families. Refuters ran on 144 families: verdicts refuted 65, narrowed 79. No family survived in the form the reviewers passed it: every surviving adopt and trial is the refuter's narrowed version, and 65 fell outright (33 of them because the harness already has the mechanism).

### 2.1 W1 CLAUDE.md length — 150 families, 313 cards

### Adopt, narrowed by the refuter (5 families, 13 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G1-F010** | W1, W2, L3 | Narrowed. Deleting CLAUDE.md rules is refuted because D11 keeps every rule and the pre-commit hook skip in HR §4 still stands. Most rules that can be linted already are, through import-linter, ESLint, alembic check, the P1 head check and P5b-2's dependency-cruiser. What survives is three cheap CI checks for the remaining traps, each added in a phase that already touches that config: ruff TID251 banning… | This is an adopt, not a trial, so the test is whether it worked. Each new check needs a planted violation. It must fail CI on the base commit and pass after the fix. (a) A new `hmac.compare_digest(token, settings.x)` in a router fails ruff TID251, and the message names `compare_secret`. (b) `"EXPO_PUBLIC_SENTRY_DSN": ""` in technician-app/eas.json fails a… | 1/3/0/2/3 already-done · 1/3/2/2/3 adopt | C1201, C0500 |
| **G1-F011** | W1, W2, W4, L3 | Narrowed to three cheap, history-backed CI checks: an eas.json check for empty env values, an app.json check that bans the Sentry plugin unless SENTRY_DISABLE_AUTO_UPLOAD is set, and a Ruff banned-api ban on hmac.compare_digest. The mobile checks also run locally as an npm script. The CLAUDE.md prose stays until D11 trims it, and the useEffect ban and the deploy-from-root check are dropped. | Adopted in its narrow form, it counts as having worked when all of these hold: (a) Each of three planted commits turns its CI job red: an eas.json profile env with a "" value; app.json with @sentry/react-native/expo in its plugins and no SENTRY_DISABLE_AUTO_UPLOAD in every profile; a new hmac.compare_digest call in a feature module. Clean main stays green.… | 1/3/2/2/3 adopt · 2/3/2/2/3 adopt | C0127, C0393, C0428 |
| **G1-F046** | W1, L2 | The W1/L2 framing, the CLAUDE.md placement, the generic CONTEXT-block line and the test-credential half are refuted. A smaller rule survives, aimed at the phases that handle secrets. In the P0a, P3b, P3c and P4a briefs, secret values are passed by variable name (PGPASSWORD for pg_dump; $CF_ACCESS_CLIENT_SECRET for curl), committed records name the variable and never the value, and agents never Read or cat a .env.… | How to tell it worked: at the close of each of P0a, P3b, P3c and P4a, run a local exact-value scan of that phase's committed diff, PR body and evidence files against the live secret values (report the count only, never the value). It must find 0. The committed P0a record must show the pg_dump step using PGPASSWORD by name, not a password in the URL. Any… | 1/3/2/2/3 adopt · 1/2/1/1/3 skip | C0067, C0225 |
| **G2-F018** | W1, W2, W3 | Narrowed: adopt one sentence in ship-plan §0, never in CLAUDE.md (W1), split by domain rather than "latest wins": for this phase's work, journal owner correction > plan on main (after the existing changed-section re-read) > Plan @ sha > cited design note; for current stack facts and invariants CLAUDE.md + code win, as they already say; a stricter plan rule beats a looser CLAUDE.md invariant; any other conflict is a… | Adopt; the check that it worked uses the P1 cold-resume trial. Plant two conflicts in its frozen fact set: (a) an owner correction in the PR journal that contradicts the Plan @ sha text, and (b) the VALIDATE rule, where the plan is stricter than CLAUDE.md. The fresh Sonnet agent passes if it reports the journal's value and the stricter rule and cites the… | 1/3/2/2/3 adopt · 1/2/1/1/3 adopt | C0032, C0080, C0213 |
| **G2-F021** | W1, W2, W3 | The per-session or per-prompt injection is refuted: it re-adopts the HR-C5 SessionStart skip, the main session already gets the pointer from auto-memory, the P1 trial prompt already names §0, the evidence is marketing only, and the W2 benefit is illusory. What survives is a one-row swap in CLAUDE.md's doc map: move "Start here" from HANDOFF-2026-07-28 to SHIP-PLAN §0, in the PR that merges #182 or in P1's PR. | What would show the adopt worked: build the post-change commit (the row moved). Give a fresh Sonnet agent only the repository and a neutral prompt that names no file ("pick up the open program work"). It passes if, in 3 of 3 runs, the agent opens docs/program/SHIP-PLAN-2026-11.md §0 before docs/HANDOFF-2026-07-28-open-work.md. Run the same prompt 3 times… | 0/3/2/2/3 adopt · 0/2/0/1/2 already-done | C0113, C0271, C0302 |

### Trial, narrowed by the refuter (11 families, 36 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G1-F004** | W1 | Narrowed: this survives only as the authoring rule for F001's wrapped arm, and only if E1 adds oblique probes that test for missed triggers. The "keep always-true content bare" half is already the harness's position under KS-7/D11 ("Do NOT assume" unchanged, every rule kept). Wrapping does not shorten the 390-line file. The evidence is asserted, with no data. FixFlow's invariants are coupled across slices, so a… | Run this inside F001's E1 wrapped arm, not as a separate trial. Keep E1's 10 direct probes and add 3 oblique probes whose task text does not name the trigger: (a) "send an automated WhatsApp 'job ready' notice", which needs log_customer_message plus the 2-day age guard and the bill freeze; (b) "accept a signed callback from a new provider", which needs… | 1/3/2/2/3 trial · 1/3/2/1/3 trial | C1198, C1199, C1209, C0816 |
| **G1-F016** | W1, W3, W4, W5 | Survives only as a regression check on CLAUDE.md invariant adherence when a model changes, attached to E1 (same frozen SHA, old and new model side by side, repeated runs). Refuted parts: the cold-resume rerun (wrong instrument, pinned to Sonnet), per-release skill and prompt evals (reopens M00–M06), and "remove expired pieces" (no evidence, and closed off by KS-7's keep-every-rule-sentence trim). | Run this only if E1 runs once first, with its 10 probes, the judge rubric and the repo SHA frozen and committed under evidence/. A trigger is defined as a recorded change to the model behind the Sonnet or Opus tier. At the first trigger, run the 10 probes with the full CLAUDE.md on that frozen SHA, old model against new model side by side, 3 fresh sessions… | 1/2/3/2/2 trial · 1/2/2/1/2 trial | C0640, C0508, C0467 |
| **G1-F022** | W1, W4, L2 | Narrowed. The trial should split off only material that applies to one runtime, keep every cross-runtime rule and a pointer index in the root, and test briefs and diff-only reviewers alongside implementers. The mechanism works here: I observed a nested CLAUDE.md attach in a workflow subagent. But it loads only on the Read tool, so Fable's briefs and diff-only reviewers lose whatever moves. | Run a "split" arm of E1 on a branch. Move only the material that applies to one runtime: the backend slice catalogue, the staff-money detail, the scheduler table, the dispatcher's operational detail and compare_secret go to backend/CLAUDE.md; the offline-engine file table, the EAS build traps and the wizard-state detail go to technician-app/CLAUDE.md. Keep… | 2/3/3/3/2 trial · 1/3/2/2/2 trial | C0283, C0977, C1278 |
| **G1-F036** | W1, W2, W4, L2 | Narrowed to a trial. The flag half is refuted: per the vendor docs it blocks subagent preload, which 12 of the 13 skills rely on, so it only fits a future owner-typed slash command that no agent preloads. The MCP half is already deferred. What survives is a trial trim of the ~24k chars of skill and agent descriptions, which is an L2 gain only and needs a routing check before adoption. | Before 1ac6b15 merges, run /context in a fresh session in that worktree and record the skills and custom-agents token lines. Then trim each of the 13 skill descriptions and 11 agent descriptions to ≤400 chars: key use case first, keep one "do not" clause. Run /context again. Pass requires all three of these: (a) the combined lines fall by ≥50%, to about… | 1/3/2/2/3 adopt · 1/3/2/2/2 adopt | C1270, C1271 |
| **G1-F069** | W1, W3, W4 | Narrowed: only one thing survives. Sonnet implementation briefs get one field naming 1-3 existing files to mirror, which extends ORCH §5.3 and can be filled by the fixflow-explorer locator. It does nothing for W1 (CLAUDE.md is untouched and the trim stays gated), and the human old-vs-new choice step is dropped. The evidence is asserted or anecdotal, so it is a trial with a blind paired probe, not the 2-vs-2 PR count. | Reuse E1's frozen-probe harness. Take 4 Sonnet-tier tasks from the plan: one read-model endpoint, one web screen, one mobile screen, and one test from a design's test list. Run each task in 2 fresh Sonnet sessions, one brief with a 'Mirror: <1-3 source paths>' line and one without, for 8 sessions in total. An Opus judge, blind to the arm, scores each diff… | 1/3/2/2/3 trial · 1/3/2/2/3 trial | C0043, C1220, C0981 |
| **G1-F098** | W1, W2, W3, W4 | Narrowed. The evidence is one confounded anecdote: no adherence rate after the split, the 40 cutoff is unfounded, and the fix also added human-invoked stops between prompts. So G1-A's "count §0, split if over 40" is refuted. What survives is G1-B's version: audit the §0 obligations in P1 and P2a, and only if a step is missed, move that moment into a short checklist in the fixflow-orchestration skill (not §0). No W1… | Audit the first two phases that run the routine, P1 and P2a. A fresh-context Opus auditor gets only the artifacts: PR, git log, PR body edit history (GraphQL userContentEdits), W0-results, the OWNER-VIEW.md diff and the session's closing message. It scores 7 binary obligations per phase: (a) the draft PR was opened at the first commit; (b) the first body… | 1/3/3/3/2 trial · 1/3/2/2/2 trial | C1106, C1118, C1311, C1332 +3 |
| **G1-F183** | W1, W2, L2 | Narrowed: run one sweep after the skills land, covering always-loaded and phase-start sources checked against CLAUDE.md and §0, fixing what it finds at source, with no per-phase standing check. The case for it is live: CLAUDE.md:366 points fresh sessions to the July handoff, not the ship plan, and the P1/P13c/KS-4 checks cover fact drift but not one instruction contradicting another. | Run one fresh Opus sweep after the 13 skills land. Scope: CLAUDE.md, MEMORY.md and the files it points to, ship plan §0 and ORCHESTRATION §3/§5, plus each SKILL.md (description and body). Check each source against CLAUDE.md and §0 only, not every pair. Each hit must quote both texts and name the different action a fresh agent would take. A fresh refuter… | 1/3/2/2/3 trial · 1/3/2/2/3 trial | C1682, C1727 |
| **G1-F196** | W1, W2 | The card's evidence is two contradictory anecdotes about CLAUDE.md, not about the plan routine, and "compliance is measured, not assumed" already exists (KS §7.8, the SHA-bound reviewer, the P1 trial). Only G1-A's narrow CI check of the PR body's structure survives, run as a separate workflow and trialled over 5 PRs; the W1 claim does not. | Run it over the first 5 code-phase PRs, from P1 on. A separate workflow (pull_request types opened/edited/synchronize/ready_for_review, limited to phase PRs by a label, body passed through env) checks three things: line 1 matches ^Plan @ [0-9a-f]{7,40}$, the body has at least one task-list item, and the "Decisions / ruled out / owner corrections" heading… | 1/3/2/2/3 trial · 1/2/0/1/3 skip | C1630 |
| **G3-F070** | W1, W4, W5 | The cap and the team-adoption pruning are refuted: the set is already curated against design §9, the harness already has one routine, and the team-compounding evidence does not apply to one developer. What survives is a phase-scoped trigger tally: for each skill, count loads (Skill calls plus preloads through dispatched agents) only in the phases its description names. Its value is catching skills whose triggers… | Run a tally across the first six phase sessions (P0a, P0b, P1, P2a, P2b-1, P2b-2). At each phase close, grep that session's transcript JSONL, main plus subagent files, including Workflow script sources, for (a) Skill calls by skill name and (b) dispatches or agentType mentions of each agent that preloads a skill. Tabulate the results against the "Plan… | 1/3/2/2/3 trial · 1/3/2/2/3 trial | C1356, C1013, C1276, C0317 |
| **G4-F008** | W1, W2, L3 | Narrowed. The broad family fails: its evidence is unmeasured, FixFlow's recorded recurring defect shapes (HANDOFF §6) and most CLAUDE.md invariants are semantic and already covered by tests, the proposed bare-catch rule would flag only 3 false positives today, the web already has no-empty, and the outbox import rule is already planned for P5b-2. What survives is one zero-dependency rule (ruff TID251 banning… | Run two checks. (a) The compare_digest rule: add ruff's built-in flake8-tidy-imports banned-api (TID251) for hmac.compare_digest, with a per-file ignore for backend/app/core/security.py. This needs no new dependency, because ruff already runs in CI. It passes if three things hold. First, a seeded hmac.compare_digest call in a feature module fails `ruff… | 1/3/2/3/2 trial · 1/2/2/2/1 trial | C0128, C0312, C0542, C0774 +1 |
| **G4-F088** | W1, W2, L3 | Narrowed to a trial, not an adopt: one line in the Opus reviewer's refute brief, as an eighth item on the defect-shape checklist planned by KNOWLEDGE-STORE-DESIGN ruling 6 and never in CLAUDE.md. It should ask the reviewer to name, for any new stored copy or flag, which source is authoritative and what keeps the copy consistent, and to check whether the new types or states can represent an illegal state such as… | Run a cheap retrospective A/B first. Give a fresh Opus reviewer the diffs that introduced 3 or 4 known cases: the pre-0043 transition() setter, the #162 live-derived wizard state, the prefill path that turned unknown into new, and the automated send that skipped log_customer_message. Run once with the line and once without it, and count the cases each run… | 2/2/2/2/3 adopt · 2/2/2/2/3 adopt | C0477, C0478 |

### Unrefuted (over the per-group cap): both reviewers' dispositions stand, no verdict (1 families, 2 cards)

| Family | Bears on | Claim | A · B | Cards |
| --- | --- | --- | --- | --- |
| **G4-F005** | W1, W2, L3 | Provide a single named aggregate check command (typecheck, format, tests, often in parallel) as the one pre-handoff gate that the routine and any hook both call. | 1/3/1/2/3 trial · 1/2/0/1/3 already-done | C0180, C0308 |

**Skip and already-done (133 families, 262 cards):** 72 already done here, 61 skipped; 21 of these reached a refuter and fell. Each is listed with its scores and one-line reason in `review/POST-REVIEW-LIST.md` under G1 and G2 and G3 and G4.

### 2.2 L2 context budget — 101 families, 244 cards

### Adopt, narrowed by the refuter (1 families, 4 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G1-F085** | L2, L3, W2 | Narrowed: skip the dumb-zone restart trigger. It rests on anecdote, Fable cannot see subagent flailing mid-run, and fresh-per-brief subagents, HR-C1 and HR-C2 already cover it. Adopt only a one-clause tightening of §0 Routing: a "preexisting/unrelated" reason for a new skip, xfail or red test must show the same failure on the base SHA. If it cannot, the work is rejected and Fable re-briefs a fresh agent from the PR… | The narrowed clause is an adopt, so this is how to tell it worked. Over the first 5 code phases, every new skip or xfail, and every red test reported as "preexisting/unrelated", must cite the same failure on the base SHA, either from main's CI run at that SHA or from a local run of that one test on the base commit. Pass: zero such reasons merge without… | 1/3/2/2/3 trial · 1/3/2/2/3 adopt | C0494, C0853, C0904, C0877 |

### Trial, narrowed by the refuter (5 families, 15 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G1-F042** | L2, W1 | Narrowed. The meter, the /context breakdown and the warnings already exist natively (the desktop composer and get_usage), and the W1 number is now known: about 10k tokens (1%). What survives is one line in the closing message: Fable calls get_usage("self") at phase close, with no owner transcription and no new tooling. That gives HR-C4's 500k trigger its missing sensor. | For the first 4 phase sessions, Fable calls get_usage("self") at phase close. Its closing message's evidence line records tokensUsed, percentUsed and the number of compactions in the session (taken from compact boundaries in the transcript). For one of the 4 sessions, check the recorded figure against the transcript's per-call usage, as HR §6 did; it… | 1/3/2/2/3 adopt · 1/3/2/2/3 trial | C1179, C0262, C0984 |
| **G1-F048** | L2, L3 | Narrowed. The backend half is already done: Appendix A's g() wrapper keeps full logs on disk and prints only exit lines, using pytest -q. What survives as a trial is extending that same wrapper, with a pass/fail/skip count line, to the native web and mobile gates, and only if a single green-run measurement shows their output is worth cutting. The ~75k smart-zone figure is refuted for this harness. | A one-off measurement at P1, then two code phases. Step 1: on a green tree, run the native web gates (npm run lint, format:check, test, build) and mobile gates (typecheck, test, expo export --platform android) once each. Record stdout+stderr characters/4 per gate. Step 2: if a full web+mobile run is at or below 3k tokens, or no single gate passes 1.5k,… | 1/3/3/3/2 trial · 1/3/2/2/2 trial | C0069, C1579 |
| **G1-F157** | L2, W1 | Refuted as stated (MCP servers crowd the phase window; adopt a loadout policy): most MCP schemas are already deferred, the window is about 1M, and §6 shows tool results fill it, not definitions. A smaller version survives: on high-volume workflow subagents, a whitelisted tool set (as fixflow-explorer already uses) may cut a measured ~64k first-turn prompt that is re-read on every call. Trial it with one /context… | Step 1, one reading: run /context at the start of one fresh phase session and record the tokens for MCP tools, system tools, skills, memory files and CLAUDE.md. Adopt a per-phase MCP disable list only if eagerly loaded MCP schemas are at least 20k tokens (2% of the window). Otherwise close the main-session part as skip. Step 2, subagents: in one workflow… | 2/2/3/1/3 trial · 2/2/0/1/3 already-done | C1601, C1772, C1776 |
| **G1-F159** | L2, W1 | Narrowed. The 40% budget is anecdotal, was set on 200k windows, and HR-C1, HR-C4 and the phase sizing already cover its intent. Only a near-free instrument survives: log Fable's peak context and the token position of each corrected Fable decision for 5 phases, to fire HR-C4 and to test whether high fill degrades the judge. | For the first 5 phase sessions, record two things from the session transcript JSONL (the method §6 already used) in each closing message's "what evidence ran" line. (a) The main session's peak per-call context: input plus cache-read tokens, the true peak even if the session compacted. (b) For each owner correction or reviewer reversal of a Fable gating or… | 1/2/2/2/3 trial · 1/1/1/1/3 trial | C1690, C1735, C1751, C1777 +1 |
| **G1-F170** | L2 | This survives only as a narrow trial. The rule is one §0 sentence (not in CLAUDE.md, so W1 does not grow): after two failed corrections on the same box, commit and push the WIP, write what failed into the journal's "ruled out" section, and resume in a new session rather than a fork. A failed subagent gets a new brief in a fresh agent rather than more messages to the same one. If the box fails a third time after the… | Put one §0 sentence in force and run it over the first 10 phase sessions, starting at P0a. Each time a box takes two failed corrections in one session, log a firing in the PR-body journal. Corrections can come from the owner to Fable or from Fable to the same implementer. For each firing, record whether the fresh session closed that box with zero further… | 1/3/2/1/3 trial · 1/3/2/1/3 adopt | C1613, C1854 |

### Unrefuted (over the per-group cap): both reviewers' dispositions stand, no verdict (2 families, 4 cards)

| Family | Bears on | Claim | A · B | Cards |
| --- | --- | --- | --- | --- |
| **G4-F002** | L2, L3 | CLAUDE.md should name the noisy raw commands as off-limits and pair each with its quiet wrapper, so the guard is a named alternative rather than a bare prohibition. | 0/3/2/1/2 trial · 1/1/2/0/2 skip | C0193 |
| **G4-F210** | L2, L3, W3, W5 | Control-loop flow limits: bound work in progress to one open PR per loop, restrict the actuator to safe directories with batch caps, and widen frequency or batch only after output has been reviewed clean. | 0/2/2/2/3 trial · 0/2/0/0/3 already-done | C0919, C0921, C0933 |

**Skip and already-done (93 families, 221 cards):** 69 already done here, 24 skipped; 8 of these reached a refuter and fell. Each is listed with its scores and one-line reason in `review/POST-REVIEW-LIST.md` under G1 and G4.

### 2.3 W2 self-reported compliance — 148 families, 339 cards

### Adopt, narrowed by the refuter (10 families, 15 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G2-F015** | W2, L3 | Narrowed: C0216 is already planned (P1's CI head check) and C0223 is already practice (integration tests against real Postgres, post-deploy checks). The pass-after half is already proven by CI being green on the PR. What survives is one clause in the §0 reviewer brief: each fail-before line cites the command run on the base SHA and its observed result, or is marked 'read, not run'. It costs almost nothing and makes… | How we'd know it worked: check the first three phase PRs. Every register id's fail-before line should either give the command, the base SHA and the observed failing output (or a log path in the evidence folder), or be marked 'read, not run'. Zero bare 'test X fails on base' assertions. In each of those PRs, Fable re-runs one cited fail-before command on… | 1/3/1/2/3 already-done · 1/3/1/2/3 adopt | C0023, C0223, C0216 |
| **G2-F031** | W2, L3 | Narrowed. What survives is not a hook and not an alembic rule: a single `permissions.deny` block with Bash and PowerShell forms of `railway up` and `railway run` (optionally `git push --force`). It cheaply makes a locally recorded outage trap mechanical, which still matters for the Railway stub during the drain window. It does nothing for W2. | Acceptance test, run once before calling it adopted. Put the deny block in the project `.claude/settings.json` and run in the same permission mode the workflow subagents use (bypassPermissions). Have an agent attempt four commands: `railway up --ci` via Bash, `cd backend && railway up --ci --service efficient-tenderness` via Bash, `railway up` via the… | 1/2/3/2/3 adopt · 2/3/3/2/3 adopt | C1252, C0717 |
| **G2-F045** | W2, W3, W4 | A smaller version survives, on W4 hygiene only. Add it to P1-ci (or P1) by keeping 1ac6b15's one-off gate as a Node CI step. Fatal on .claude/skills/*/SKILL.md frontmatter (name equals the folder, description present and at most 1024 chars) and on agent frontmatter fields. Extend the CLAUDE.md Alembic-head check to flag a stale head literal in .claude/skills. Path citations containing a slash are warn-only. Drop… | Evidence that it worked: a test commit that drops `name:` from one SKILL.md, or makes it differ from its folder name, fails CI, and main passes with zero fatal findings. Across the remaining phases, count findings from the skill/agent check that led to a fix. Adopted if at least 1 real rot is caught (expected first catch: fastapi-alembic-safety's 0046/0047… | 0/3/2/1/3 adopt · 1/3/1/1/3 adopt | C0049 |
| **G2-F054** | W2, W3 | What survives is one sentence in §0, limited to phases whose Resume names a draft PR or a W0-results step table: if that source is missing, lacks the Plan @ sha line or has an unreachable sha, or the branch has commits the ticked boxes do not cover, list the commits and stop and ask the owner rather than starting fresh. This helps W3 only, not W2. The config-epoch half is already done, and a hook or script version… | What would show it worked: during P1's cold-resume trial, run one extra fault-injected dispatch. Give a fresh Sonnet agent a local branch with one Scope commit and either no draft PR or a PR body missing the Plan line, and ask it to resume P1. Pass = it stops and reports the mismatch, and does not open a new PR, start Scope item 1 or redo the committed… | 0/3/2/2/3 adopt · 1/2/1/1/3 already-done | C0171 |
| **G2-F104** | W2, L3 | Narrowed. Choosing sensors that cannot be disabled inline is already done: import-linter allows no inline disable and mypy flags unused ignores. The W2 benefit is illusory. What survives is one clause added to §0 Routing's "new skip or xfail" item, so the reviewer lists every new inline suppression and lint/type/import-config exception, each with its reason. | For the next 5 merged code PRs, run a git diff grep over each PR's base..head. Count added lines that match noqa, `type: ignore`, eslint-disable, ts-expect-error or ts-ignore, plus any change to `ignore_imports`, `per-file-ignores`, `[tool.mypy]`, `[tool.ruff]` or eslint.config.js. Compare that count with the reviewer verdict's "new suppressions" line,… | 1/3/2/2/3 adopt · 1/3/2/2/3 adopt | C0916 |
| **G2-F134** | W2, W3 | Narrowed to W3 only: a one-sentence change to P1's cold-resume judging step. Classify each miss and cite the plan line before editing the plan. Edit the plan only for absent or ambiguous facts. Count a miss as present-but-missed only with a verbatim quote from §0 or P1, so the current default of fixing the plan still holds. The W2 claim and the CLAUDE.md-trim landing are refuted, and Dex's remark adds no evidence. | Adopt check: P1's docs/program/evidence/resume-trial-P1/ holds a judgment file with one row per missed fact, giving the fact id, a class (absent, ambiguous, or present-but-missed) and the plan line quoted. Every plan edit in the P1 PR traces to an absent or ambiguous row. A present-but-missed row counts only if the fact is stated verbatim inside §0 or P1.… | 0/3/2/2/3 adopt · 0/3/1/1/3 skip | C1343 |
| **G2-F192** | W2, W3 | Narrowed: the routine has only one writer already (the owner speaks through chat, and the plan changes only through PRs checked by the Plan@sha diff), so a single-writer rule and a PR-comment channel are redundant. What survives is one clause in §0: right before every --body-file write, fetch the live body with `gh pr view --json body` and edit that text, never a copy rebuilt from memory. | Showing it worked: when each of P1, P2 and P3 closes, pull the PR body's edit history (GraphQL pullRequest.userContentEdits). Every journal line and every ticked box that appears in any earlier revision must still appear in the final body, unless the journal says where it was moved. Pass means zero unexplained losses across all 3 PRs, plus the P1… | 1/3/2/2/3 adopt · 1/3/2/1/3 adopt | C1731 |
| **G3-F105** | W2, W4 | A smaller version survives, adopted as one line in fixflow-orchestration SKILL.md session-start step 1 and nowhere else: the phase id comes from the owner's opening message or the skill args, it is never inferred from the checklist, and if it is missing the session asks. Plan §0 allows concurrent phases and branch names do not name phases. The rest of the idea is dropped: no convention across all 13 skills, no… | Settled as a one-line edit. To show it worked: over the next 5 phase sessions (P0a onward), count the sessions whose first gate statement and draft-PR or W0-results "Plan @" header name a phase different from the one in the owner's opening message. Pass: 0. Also count the sessions opened without a named phase that picked one themselves instead of asking.… | 1/3/1/1/3 adopt · 1/3/1/1/3 already-done | C1441 |
| **G4-F073** | W2, L3 | Drop ast-grep and adopt the narrow version. Extend the reviewer rule in ship plan §0 line 55 ("every changed expected value, removed assertion and new skip or xfail") so it also lists added inline suppressions and edits to gate config (ruff/mypy/import-linter/ESLint/tsconfig/CI), each with its reason, and back that list with a diff grep. This costs one sentence in the brief and reopens no deliberate skip. | The proposal counts as working if, over the next 5 code PRs, three things hold. - Every Opus reviewer verdict has a "gate suppressions" section, and it says "none" outright when there are none. - A scripted cross-check finds zero items that the verdict left out. The check is a grep of `git diff <base>...<head>` for added `# noqa`, `type: ignore`,… | 1/3/2/2/3 adopt · 1/3/2/2/3 adopt | C0749 |
| **G4-F077** | W2, W5, L3 | The smaller version survives and is worth adopting. Add one line to §0 Gates: after local gates are green, if the same CI job fails on 3 consecutive pushes, stop, record it in the Decisions journal and hand it to the owner. Never rerun to green without journaling the failing log, and keep the app's PR Auto-fix off on phase PRs. Drop the flaky-rerun allowance, the owner approval for every conflict (already covered… | Proof it worked, over the first 5 code phases, measured from GitHub rather than from the journals. For each phase PR, run `gh run list --branch <b> --json conclusion,attempt,headSha` plus the job names. Pass if (a) no CI job fails on 3 consecutive heads after the session has stated that local gates are green, unless the 3rd failure has a journal line… | 1/3/2/2/3 adopt · 1/3/2/1/3 adopt | C0155, C0267, C0460 |

### Trial, narrowed by the refuter (19 families, 51 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G2-F023** | W2, W3, L1, L3 | Narrowed. The external mirror and queryable run store are refuted: marketing evidence, a cloud upload, and a rebuild of the skipped M00–M06. What survives is a trial of one local transcript grep after each phase closes. It covers only the routine acts git and GitHub cannot show, chiefly "Fable never implements", the reviewer brief's SHA and register ids, and the cold-resume dispatch. It is the one W2 check that… | Run this after each of P1, P2 and P3 closes, within 7 days so the 30-day prune cannot remove the transcript. One Git Bash script greps that phase's session JSONL across all ~/.claude/projects/*EMS-workshop1*/ directories, including subagents/. It checks only the acts that leave no git or GitHub artifact: (a) zero Edit/Write calls by the main session on… | 1/3/3/3/2 trial · 1/2/2/2/2 trial | C0270, C1062, C0006, C0441 +3 |
| **G2-F024** | W2 | Only a much smaller version survives. Skip the trailer, the hidden comment and the deep link. Branch→worktree folder already finds the transcript of a one-session phase, and squash-merge folds trailers away. What is left: one plain 'Sessions: <uuid>…' line in the existing PR journal, copied from the scratchpad path and never invented. It earns its place only for resumed or multi-session phases, and only if… | Run this with the F023 trial over the first 3 phase PRs that close, with the audit done at least 7 days after each close. For each PR, record three things. (a) Was the transcript found from the head branch, through its worktree folder, alone? (b) Did the PR journal's 'Sessions:' line find every session of the phase? (c) Were all of the phase's .jsonl files… | 1/2/3/2/3 trial · 1/2/2/1/3 trial | C0154, C1165 |
| **G2-F037** | W2, W3, W4 | Narrowed: no new /phase-start or /phase-close skills, because fixflow-orchestration (steps 2-3, 26, 35) and fixflow-repo-conventions (step 14) already encode §0 and are already slash-invocable. What survives is a zero-cost habit: invoke /fixflow-orchestration explicitly at phase start, and prompt the close step explicitly, instead of relying on the description match. It guarantees the instructions are loaded, not… | Over the first 3 phase sessions, the owner opens with the plain phase prompt and no slash command. From the session transcripts (search for a Skill call to fixflow-orchestration), count the sessions in which Fable loads the skill before its first subagent brief or first commit. The owner may intervene after turn 1 if it has not loaded. If 3/3 sessions… | 1/3/2/2/3 trial · 1/2/2/2/2 trial | C1268, C1272 |
| **G2-F041** | W2, W3, W4, W5, L1 | "Control flow in code" already governs orchestration here (ORCHESTRATION-DESIGN script contract, committed workflow scripts), and the evidence for a phase driver is asserted or anecdotal. A whole-phase driver would also duplicate the PR-checklist state owner that HR §4 protects, and would not fix self-reported compliance without hooks. Only a gated trial survives: script the mechanical phase-close sequence, and… | After each of the first three phases to close (P1 and the next two), a Haiku extractor reads the merged PR body, git log and closing message. It counts which of six mechanical close steps were omitted: (a) first line "Plan @ <sha>"; (b) every journal entry names where it was moved; (c) OWNER-VIEW.md changed at close; (d) the reviewer verdict names the… | 1/2/2/2/2 trial · 1/2/1/1/1 already-done | C1117, C0402 |
| **G2-F044** | W2, W3, L1, L3 | What survives is not the 58-scenario suite. It is one bounded side-effect check inside P1's existing trial: HEAD and worktree unchanged, plus a transcript read log showing the plan was read and the committed answer key was not. It is cheap because P1 already pays for the agent run. It matters because the trial as written leaves its own answer key in the repo. It tests W3, not W2. | Run once, inside P1's cold-resume trial (n=1, re-run once if contaminated). Before dispatch, record HEAD. Prefer to commit only sha256(expected.json) before the run and the file itself after it. After the run, check four things. (1) HEAD is unchanged and `git status --porcelain` is empty. (2) From the subagent's JSONL transcript, the file paths of its… | 0/2/3/3/1 trial · 1/2/2/2/2 trial | C0050, C0051, C0052, C0053 |
| **G2-F066** | W2, W3, W4, W5 | The weekly loop that mines PR comments and traces fails: weak evidence, it reopens the measurement skip, it doesn't fit one-phase sessions, it adds to W1, and it does little for W2. What survives is a one-word cause tag on the §0 owner-corrections journal entries, so that a correction caused by the agent ignoring a rule has an owner and a repeat shows up across phases. The cheapest trial is to add that tag, not a… | Run the trial over the first five phase sessions that actually execute (from P1 on). At each close, give every owner-correction journal entry a one-word cause tag: harness (the agent skipped or misread a rule that was already clear), plan, or product. Count the harness-tagged entries and how many times each shape repeats. - Pass: at least one harness shape… | 1/2/2/2/3 trial · 1/2/1/1/2 trial | C0390, C0548, C0457, C1237 +1 |
| **G2-F077** | W2, W3, L3 | Narrowed. Instead of a new PR section, the smaller version has three parts: a fourth journal heading in §0, "deviations from Scope @ Plan sha (expected / found / why)", ending in an explicit "none"; one reviewer-brief line, "compare the diff against Scope; an unlisted deviation is a routine miss"; and a mismatches field in the implementer output schemas once S3 is designed. Anecdotal evidence and a routine that has… | Run it over the first three phase PRs that get an Opus review (P1 onward). Count three things: (a) deviation entries in the journal, each giving expected, found and why, or an explicit "none" at close; (b) deviations from Scope or the design that the reviewer finds by comparing the diff against the Scope checklist and that the journal did not list, each… | 1/3/2/2/3 adopt · 1/3/2/2/3 adopt | C0986, C0033 |
| **G2-F114** | W2, W3, W5 | Only one small version survives: a single saved Workflow script for the deterministic part of the PR-review stage (SHA binding, per-id fail/pass table, compare in code), run as a trial after P1, chipping at W5 and making that one stage auditable. Moving the whole phase routine or its close into code does not survive: the skills batch already packages it, it is owner-paced and judgement-heavy, and it does not fix W2… | Run the PR-review stage as prose (skill step 28) in P1 and audit it after merge. Then commit one review-stage Workflow script to the repo. It takes args {registerIds, headSha}, calls fixflow-pr-reviewer with a VERDICT schema that carries head_sha and, per id, fail_on_base_test and pass_on_head_test, and compares the SHAs in code. Use it on the next 3… | 1/3/1/2/2 trial · 1/2/2/2/2 trial | C1333, C1424, C1458 |
| **G2-F115** | W2, W3 | A smaller version survives. Put a 5-8 line "paste to open a phase" block inside SHIP-PLAN §0 itself (one file, so no drift), with separate first steps for code and operations phases, naming only the steps that leave no trace and dropping the unbuilt store-consult step. It is a trial, not an adopt: the evidence is a single anecdote, and the block lowers skip risk without making compliance visible (W2). | Run the first 4 phase sessions (P0a onward), each opened with the kickoff block pasted as the first user message. Afterwards, a Haiku extraction over each transcript plus `gh pr view` / `git log` checks every step the block names. For an operations phase: was the W0-results step table, with its Plan @ line, the first commit? For a code phase: was the draft… | 1/3/1/2/3 adopt · 1/3/2/2/3 adopt | C1653 |
| **G2-F118** | W2, W5, L3 | The general principle is already in place (CI, gate scripts, Workflow orchestrators), and the hook and push/commit versions either reopen a skip whose reasons still hold or don't transfer. What survives is a smaller trial: one CI-run, mechanical-only check of code-phase PR artefacts (Plan @ SHA, reviewer verdict bound to the head SHA, ticked boxes, OWNER-VIEW changed, manifest hashes), which moves the checkable… | Trial a separate, dependency-free GitHub workflow (not a hook, and not run by the model). It triggers on pull_request opened, edited, synchronize and ready_for_review, is advisory while the PR is a draft, and fails once the PR is marked ready. It checks only facts a script can decide: (a) the first body line is `Plan @ <40-hex>` and that commit exists… | 1/3/2/2/2 trial · 1/3/0/1/3 already-done | C1338, C1677, C1523 |
| **G2-F123** | W2, L3 | Refuted: the hard block and the CODEOWNERS/PR rule (configs change legitimately in planned phases; CODEOWNERS already routes everything to the sole owner; branch protection is unavailable on this plan). Surviving: at most one clause in the existing Opus reviewer brief naming boundary- and gate-config diffs, trialled over P1 through P5b-2 and adopted only if a config change goes unnamed. | Over the first five merged phase PRs (P1 through P5b-2), run `git diff <base>..<head> -- backend/pyproject.toml eslint.config.js .github/workflows/ci.yml '.dependency-cruiser*'` on each PR. Keep only hunks inside [tool.importlinter], no-restricted-imports, dependency-cruiser rules, or ci.yml gate/run steps. For each such hunk, check whether the Opus… | 0/3/2/2/3 adopt · 0/2/2/1/3 trial | C1406 |
| **G2-F180** | W2, L3 | A smaller version survives. When an owner correction mid-phase states a checkable code or environment fact (not a decision, not a field fact), Fable checks it inline with a grep or command; it does not spawn a research agent. The journal entry then carries either "verified: path:line or command" or "contradicted: evidence, raised to owner", and a contradiction goes back to the owner, never silently overridden.… | Over P1-P3 (three phase sessions), read each PR-body journal at phase close and classify every owner correction as a decision, a field fact, or a checkable repo/environment fact. Pass (format): 100% of checkable-fact entries carry "verified: <path:line or command>" or "contradicted: <evidence>, raised to owner". Keep the rule if at least one correction in… | 1/3/1/2/3 adopt · 0/3/1/1/3 already-done | C1497 |
| **G2-F183** | W2, W3 | A smaller version survives as a trial: a deterministic, read-only check, run at phase close, of transcript tool_use records for routine steps that leave no git/gh artifact (Opus reviewer, gates run, Fable never edits code, resume diff run). It drops the event-log replay half (refuted, and the PR-body journal already exists) and the "store consulted" criterion, which the KS lookup log and the K24/KS-9 cross-check… | Over the first three phase sessions (P1, P2, P3), run a zero-dep Node script at phase close. Python is not on PATH, and transcripts are pruned after cleanupPeriodDays, so it must run at close. The script filters the main-session and subagent JSONL down to tool_use rows: tool, subagent model, Bash command and exit, edited paths. It scores a fixed list of 8… | 1/3/3/3/2 trial · 1/3/2/3/2 trial | C1565, C1686 |
| **G2-F186** | W2, W3 | Narrowed: as compliance evidence for W2, live watching is beaten by the persisted session transcript, which is cheaper and complete. What survives is a one-off owner watch of P1 through its first code commit, using §0's existing owner-corrections journal, kept only if it catches a costly departure in time that the transcript audit would have found too late. | Applies to P1 only. The owner watches from session start through the first CODE commit, not just ~15 calls. He writes each departure from §0 into the existing owner-corrections journal. He does not interrupt the cold-resume subagent, so its recovery stays uncontaminated. After close, a fresh agent audits the P1 transcript JSONL against a fixed §0… | 1/3/2/2/2 trial · 1/3/1/2/3 trial | C1532, C1685 |
| **G3-F074** | W2, W4 | The card's version does not transfer: stderr checks, installed versus path-loaded skills, and a delegation-tool toggle make a cross-host CI suite that cites no results. A smaller version survives: a read-only tally of the phase transcript's Skill, Agent and Workflow, `ks lookup` and main-session Edit/Write calls, compared with the closing message. It extends to the whole routine the K24 dispatch-record cross-check… | Run one read-only tally per session over P1 and the next two phase sessions, 3 in all. It reads the main JSONL plus subagents/ and workflows/ and lists Skill calls by name, Agent and Workflow dispatches with the model and agentType each subagent journal records, Bash `ks lookup`/`ks close` calls, and Edit or Write calls the main session made outside docs/.… | 1/2/3/3/2 trial · 0/3/3/2/3 trial | C0054 |
| **G4-F017** | W2, L3 | Per-PR review is scoped to register ids and cannot see drift that builds up across PRs, so one audit as a trial survives. But it must exclude boundary edges (CI already catches them) and the two pre-existing ~1.95k-line service files. It also needs a refuter-gated pass bar of 2 or more owner-accepted findings, because both reviewers' bars pass trivially. | Run one fresh-context Opus audit after the 10th merged code PR or immediately before P9a-1 (the new accounting slice), whichever comes first. Scope it to git diff <P1 merge sha>..main. Count only cumulative-drift findings that meet all of these: (a) not visible inside any single PR diff, for example the same helper or rule reimplemented across two or more… | 0/3/2/2/2 trial · 0/2/2/2/2 trial | C0353, C0597, C0770, C0841 |
| **G4-F081** | W2, L3 | A smaller version survives. Add one line to the per-PR reviewer brief: a finding outside the named register ids blocks only if it states a failing condition (the §4.5 W2 rule applied to PR review); anything else goes into the PR journal as a non-blocking note. Count review rounds instead of capping them, because the anecdote's cause (a pedantic prompt) is absent and Fable already gates fixes. | For the first 5 code-phase PRs (P1 onward), record four things in each PR journal: review/fix rounds, blocking findings, blocking findings that cite neither a register id nor a failing condition, and lines added after the first review. Two pass conditions for the brief line: no un-cited blocking findings in all 5 PRs, and no reviewer-driven fix touches… | 1/3/0/1/3 already-done · 1/3/2/1/3 adopt | C0695 |
| **G4-F086** | W2, L3 | Only a smaller trial survives. The fail-before principle is already plan §0 Routing (HR §4 row 261), and the cards have no results. A naive run on the base commit would certify tests that only die on ImportError or a 404. The trial is a script for register-id defect fixes only: it requires an assertion failure on base and a pass on head, and checks base tests against head for weakened expectations. It runs serially… | Run it on the first 3 PRs that fix at least one register id, with at least one backend PR run through the Appendix A Docker gate. Use the plan's own phase sessions, not a new pilot. The script works in a worktree at the base SHA, or reverts the non-test paths in place. It runs each reviewer-named test on base and on head, and classifies each base outcome… | 1/2/2/3/2 trial · 1/3/1/2/2 trial | C0573, C0781, C0797, C0762 +1 |
| **G4-F089** | W2, L3 | Only a smaller version survives. Take the seven HANDOFF §6 shapes out of KS-4, correct item 2's login-lock example to match the CLAUDE.md invariant, and put them in the SHIP-PLAN §0 reviewer brief with a required per-shape line in each verdict. Run that as a trial. G4-A's path pointer is already in CONTEXT §5.1 and carries the wrong example. G4-B's "already-done" is not true, because the checklist is parked behind… | Over the first 6 ship-plan code PRs reviewed after the checklist goes into the §0 brief, the Opus verdict gives one line per shape: applies or n/a, with path:line. Count three things: (a) shape-attributed findings that Fable confirms with a traced path and that the PR's register ids did not already name; (b) false steers, meaning a reviewer flags a… | 1/3/1/2/3 adopt · 1/3/0/1/3 already-done | C0600, C0793, C0501 |

### Unrefuted (over the per-group cap): both reviewers' dispositions stand, no verdict (3 families, 10 cards)

| Family | Bears on | Claim | A · B | Cards |
| --- | --- | --- | --- | --- |
| **G2-F028** | W2, L3 | A Stop hook that runs the same quality/typecheck commands as CI and exits 2 with only the errors on failure stops the agent finishing with a red tree; hook scripts are thin aliases onto the human-run commands. | 1/2/2/2/1 trial · 1/1/1/1/0 skip | C0083, C0221, C1251, C0110 |
| **G2-F179** | W2, W3 | Generate document provenance by script (metadata frontmatter with git commit and branch, never placeholders) and cite with commit-pinned permalinks; pre-approve only that script. | 0/3/1/1/3 trial · 0/3/0/1/3 already-done | C1490, C1494, C1496 |
| **G4-F058** | W2, L3 | Track per-PR rework rate (share of diff changed after review; under 5% is the quality bar) as a harness health metric. | 1/3/2/1/3 trial · 0/2/1/1/1 skip | C0434, C0444, C0742 |

**Skip and already-done (116 families, 263 cards):** 70 already done here, 46 skipped; 8 of these reached a refuter and fell. Each is listed with its scores and one-line reason in `review/POST-REVIEW-LIST.md` under G1 and G2 and G3 and G4.

### 2.4 W3 routine never run, cold resume — 102 families, 266 cards

### Adopt, narrowed by the refuter (2 families, 3 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G2-F051** | W3, W5, L1 | Narrowed to the part C0244 calls the hard problem: keep the answer from the agent. P1's cold-resume trial has to keep expected.json out of the trial agent's reach: record its sha256 in the PR journal, commit it only after judging, and do not name its path in anything the agent reads. Without that, the only test of W3 can pass by reading the key, since P1 itself points to it. The no-history raw checkout and the… | How to show it worked, on the one P1 trial: (a) The sha256 of expected.json is in the draft PR's journal before the agent is dispatched, and it matches the file committed after judging. (b) The trial agent's transcript has zero Read, Grep or Glob calls touching `resume-trial-P1/` or expected.json. (c) The agent ran on a checkout without the answer file… | 1/2/1/2/3 already-done · 1/3/3/3/3 adopt | C0479, C0244 |
| **G2-F056** | W3 | What survives is a smaller version: add `git fetch origin` to §0, before the resume diff and before recording `Plan @ <sha>` at phase start. Git only updates origin/main on a fetch, and §0 never asks for one. Without it the resume check can silently miss a plan amendment. The broader "verify every checkout, propose pulls" form is unnecessary here. | To show it worked: across the resumes and phase starts from P0a to P5, each PR journal records the origin/main sha it read after the fetch. Each recorded sha should equal what `git ls-remote origin refs/heads/main` showed at that moment. Pass if every one matches and no plan amendment merged mid-phase goes unread when the next box is ticked. | 0/3/2/2/3 adopt · 1/3/2/1/3 adopt | C0654 |

### Trial, narrowed by the refuter (1 families, 2 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G3-F033** | W3, W4, L3 | Narrowed: Opus W2 designs already pin data shape and file layout in the Scopes, and layering plus import-linter already fix backend call paths. What survives as a trial is a model-drafted signatures and call-stack "Shape" block in the existing draft PR body, used only for Opus phases with control-flow changes or new surfaces, with no skill or tool built. | Run it on the first 4 Opus-owned code phases that change control flow or add a new public surface (candidates: P2a, P7a, P9a-1, P9a-2). Skip phases whose Scope already pins the shape, such as P2b-2 and P8a. In each, before the first code commit, the Opus implementer drafts a "Shape" block in the existing draft PR body: the public signatures it touches, a… | 1/2/2/2/3 trial · 1/2/1/1/2 skip | C0736, C0937 |

### Unrefuted (over the per-group cap): both reviewers' dispositions stand, no verdict (1 families, 3 cards)

| Family | Bears on | Claim | A · B | Cards |
| --- | --- | --- | --- | --- |
| **G2-F168** | W3, W5 | Worktree creation is a fixed scripted checklist (copy env and settings, make setup, then launch one implement command), and dev environments must not touch shared state. | 1/2/2/1/2 trial · 1/2/1/1/1 skip | C1569, C1667, C1507 |

**Skip and already-done (98 families, 258 cards):** 51 already done here, 47 skipped; 8 of these reached a refuter and fell. Each is listed with its scores and one-line reason in `review/POST-REVIEW-LIST.md` under G2 and G3 and G4.

### 2.5 W4 agents and skills — 72 families, 147 cards

### Adopt, narrowed by the refuter (2 families, 4 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G3-F088** | W4, W5 | Only a smaller version survives. Saving the script as run already happens ad hoc (commit 95cc9e6, horthy/workflows/*.js.txt in the manifest). What to adopt is writing that practice into the evidence rules (ORCHESTRATION §7 / ship plan §0), adding the args JSON and keeping the per-PR reviewer brief verbatim. Skip the asserted parts: dumping every prompt at each step, and a reviewer step that reads prompts for filler. | How we know it worked: check the next 3 committed evidence folders that come from a Workflow run (P1's cold-resume trial among them). Each manifest must list the script as run and an args JSON. Every phase PR from P1 on must carry its Opus reviewer brief verbatim, in the PR or the folder, with the register ids. Pass if 3 of 3 folders and every PR comply.… | 0/3/2/2/3 adopt · 1/3/2/2/3 adopt | C0289 |
| **G3-F117** | W4, W5 | Survives only in a smaller form. First, a written save rule: a Workflow script is kept only after its shape has run in a second phase or answers a recorded failure, and its header names those uses. Second, a retire check for each skill, run at the close of the phases §9 names for it and based on a transcript grep. The 13 skills are not reopened, and neither reviewer's calendar-based P5/P10 prune is adopted, because… | For the narrowed adopt, it worked if all of the following hold at P10. (a) Every saved workflow file under the chosen folder has a header that names at least 2 dated prior phase uses, or a recorded failure id. (b) Each saved workflow has been reused at least once since it was saved, counted by grepping its name in the PR bodies and in the session… | 1/3/1/2/3 adopt · 1/3/2/2/3 adopt | C0908, C1256, C1771 |

### Trial, narrowed by the refuter (1 families, 2 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G3-F029** | W4, L3 | A smaller version survives: a rough mockup of states and copy, written into the brief for the 4 new-screen phases and checked by the owner without blocking the phase. It is worth most on the mobile phases, where a copy mistake costs a new fleet APK build. It is not a skill or a CLAUDE.md rule, and it does not apply to P12a or P12; the single-file reason does not transfer. | Run the trial only on the new-screen phases, in plan order: P2b-1, P5b-1, P9b, P10a. - Before implementation, Sonnet produces one rough HTML mockup showing the screen's states and exact copy (for P2b-1: Drain Report empty, partial and failed; the login banner; Discard "server refused" and "could not reach"). The owner glances at it; this is not a blocking… | 1/2/2/2/3 trial · 1/2/2/1/3 trial | C0228, C0732 |

**Skip and already-done (69 families, 141 cards):** 31 already done here, 38 skipped; 9 of these reached a refuter and fell. Each is listed with its scores and one-line reason in `review/POST-REVIEW-LIST.md` under G1 and G3 and G4.

### 2.6 W5 workflow library — 29 families, 43 cards

**Skip and already-done (29 families, 43 cards):** 9 already done here, 20 skipped; 2 of these reached a refuter and fell. Each is listed with its scores and one-line reason in `review/POST-REVIEW-LIST.md` under G3 and G4.

### 2.7 L1 effort routing — 87 families, 224 cards

### Adopt, narrowed by the refuter (3 families, 8 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G4-F022** | L1, L3 | Survives only as a zero-cost, symmetric reading rule for this review's L1 decisions, not as a standing rule. The rule: a single-run benchmark gap of a few strict passes counts as "no detectable difference" for either effort level. When quality shows no detectable difference, cost and task transfer decide. Drop the 2/3/5-runs-per-arm quotas: they are statistically empty at this n, they protect the unmeasured xhigh… | How to tell it worked: when the L1 disposition and the F034/F041/F066 dispositions are written, count the statements that treat a single-run gap (at most 4 of 196 strict passes, or one run of differing verifier verdicts) as evidence that one arm is better. The rule passes with 0 such statements. A second condition: no §3 edit adds a fixed runs-per-arm… | 2/3/2/2/3 adopt · 2/3/2/2/3 adopt | C0252, C0691, C0632 |
| **G4-F025** | L1, L3, W3 | Re-measuring on every model release is refuted: it reopens the M00–M06/evaluation-run-schema skip, and the source shows drift under unchanged versions, which version logging cannot catch. What survives is (a) one provenance line in each evidence README the routine already writes (resolved model ids instead of aliases, `claude --version`, date), not per-output manifest fields or audits, and (b) a rule that any… | Showing it worked: grep the README of each of the next 2 evidence folders committed under docs/program/evidence/. Each must carry one provenance line: the session's exact model id, the ids the aliases resolved to, the output of `claude --version`, and the run date. Pass = 2 of 2. The adoption earns its keep only if a later re-run or dispute of an evidence… | 2/3/2/2/3 adopt · 2/3/2/1/3 adopt | C0675, C0337 |
| **G4-F044** | L1, W4, W5 | The proposed probe is unnecessary: the Workflow docs already say an omitted effort inherits the session's, and design §4.2/§3 already set effort on every agent() call. Only a one-line ship plan §0 rule survives: launch the per-PR reviewer and the implementers with an explicit effort taken from §3, never through a path that inherits Fable's. | For the narrowed rule, start with one documentation check: does the Agent tool or custom-agent frontmatter accept an effort field? If not, §0's reviewers and implementers must be launched through a Workflow agent() call. Proof it worked: over the first 3 phase PRs, every launch of the per-PR Opus reviewer and every Opus/Sonnet implementer shows an explicit… | 1/3/2/2/3 trial · 1/3/2/2/3 trial | C0095, C0121, C0367 |

### Trial, narrowed by the refuter (6 families, 15 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G4-F031** | L1, L3 | What survives is a one-off procedure inside the F034 effort trial: score medium and xhigh against Fable's adjudicated past verdicts, with an xhigh repeat as the noise floor and a check that the two arms are not agreeing on wrong answers. The general practice of qualifying a model by "only review disagreements, then grow a golden set" fails here: same-model errors are correlated, one diff mixes effort with noise,… | Do this once, inside F034, with no standing golden set. Take 12 frozen refuter or skeptic briefs from the committed evidence folders (the G1/G2 skeptics plus this review's refuters). Each must have a Fable-adjudicated final verdict, and at least 3 of them must have been adjudicated CONFIRMED or survives. Replay each at its frozen SHA three times: xhigh,… | 1/3/2/2/3 trial · 1/3/2/2/2 trial | C0699 |
| **G4-F032** | L1, L3 | As a standing gate for choosing models or effort, this idea brings back the skipped evaluation-run schema and adds latency and cost thresholds that mean nothing here. What survives is a smaller version: a pass bar written before F034's medium-vs-xhigh trial runs, with 3 repeats per arm, results compared item by item against xhigh's own run-to-run variation, and an unknown token count counted as a fail. Without an… | This applies only if the owner trials F034. Write the decision rule in the trial's PR journal before the first run. Build a settled-answer set: at least 10 P0/P1 register items whose CONFIRMED status rests on code (a fail-before/pass-after test or a merged fix), plus at least 5 settled REFUTED items. Run the same refuter brief at medium and at xhigh, 3… | 2/2/2/2/3 trial · 2/2/2/1/2 trial | C0705 |
| **G4-F034** | L1 | What survives is narrower: a trial of medium only for non-P0 verifiers that now run at high or unspecified effort (review-workflow refuters and judges, the per-PR reviewer), settled by prospective paired shadow runs. The data is one run of code-generation passes, and core passes favour xhigh 2 of 3. §3 already names the xhigh exceptions, and the replay corpus both reviewers rely on is not committed. | Run a blind paired shadow in the next document-review workflows (this harness-ideas run's remaining families, or the first P1-P3 PR reviews). For every non-P0 refuter, judge or PR reviewer, run a second agent at medium on the same brief and model (same input hash), and give it no view of the incumbent's output. Collect at least 30 pairs. Count three things… | 2/1/2/2/2 trial · 2/1/2/2/2 trial | C0251, C0689 |
| **G4-F084** | L1, W5, L3 | Narrowed to one bounded, owner-approved trial: a single Codex review pass on a PR diff, aimed at code that Opus both writes and reviews, and tested against a second Opus pass rather than the existing reviewer. The overnight 15-prompt loop with compaction and the saved workflow are dropped. The evidence is anecdotal, there is no Codex CLI on the machine, and HANDOFF §6 shows the earlier misses came from scope and… | The owner first approves the Codex CLI install and sending code to OpenAI. Then run one retrospective test that measures recall on defects already known to have slipped past review, against a same-vendor control. 1. Pick 6 confirmed defects from HANDOFF-2026-07-28 §4 (P0/P1) for which the PR diff that introduced them can be identified. 2. Check out each… | 1/2/3/2/1 trial · 1/2/3/1/1 trial | C0454, C0568, C0642 |
| **G4-F181** | L1, W3 | The standing "week-cost journal re-run on every new model" is refuted by its own source: the one reported case never told models apart, and Dex says one-shot is a poor test in the same video. A smaller version survives as a trial: about 5 known-answer fixtures from FixFlow's closed defects, run repeatedly with blind grading as the fixture set of the L1 effort trial, with no standing infrastructure and with the… | A one-time run inside the L1 effort trial. Build 5 fixtures from the closed CLAUDE.md defects (#162, 0043, 0046, compare_secret, bill freeze). Each fixture is a git-archive export of the pre-fix SHA, a 2-3 sentence symptom prompt that leaves out post-fix docs, and a binary answer key naming the root-cause mechanism and file. Run every fixture 3 times on… | 1/3/2/2/3 trial · 1/3/2/2/2 trial | C0993, C1019, C0994 |
| **G4-F203** | L1, L2, L3 | HumanLayer's API-credit spend figures don't apply to a flat subscription where weekly usage limits are what bind. The per-tier verifier-share line both reviewers propose can't be read from get_usage or /cost and would need a transcript parser, which is the skipped pipeline. Only a smaller trial survives: one line per phase recording the change in weekly-window percent and the workflow-reported tokens and agents… | Over P1-P3, record two things in the closing message's "what evidence ran" line. First, the weekly-window percentages from get_usage (all models and Fable), read at phase open and at phase close. Second, the totals each Workflow run already reports: subagent tokens, and the number of agents lost to a usage limit. Also note whether another session did heavy… | 2/2/2/2/2 trial · 2/1/2/2/3 trial | C1795, C1767, C1374, C1812 +1 |

### Unrefuted (over the per-group cap): both reviewers' dispositions stand, no verdict (4 families, 14 cards)

| Family | Bears on | Claim | A · B | Cards |
| --- | --- | --- | --- | --- |
| **G4-F060** | L1, L2, W2 | Attribute token spend and cost per stage, agent and model, and compute dollars afterwards from recorded token counts at pinned rates; use tokens per solve as a codebase-health signal. | 2/2/2/1/2 trial · 2/2/1/1/1 skip | C0419, C0629, C0712 |
| **G4-F182** | L1, L2 | Judge a model by loop or goal outcomes and corrections needed per conversation, not one-shot answers; cutting corrections from five to two roughly doubles effectiveness. | 0/2/1/1/3 trial · 0/1/1/0/2 skip | C0995, C0997 |
| **G4-F183** | L1, L2, L3, W3, W5 | Durable skill is re-evaluating on each new model/harness release: production-grounded evals survive models, so vary one dimension at a time, test each new model on your own cases, and try-and-measure rather than fix doctrine. | 1/2/1/1/3 trial · 1/2/1/1/1 skip | C1093, C1075, C1663, C1877 |
| **G4-F199** | L1, L2, L3, W3 | Scale process weight to task size and calibrate by reps: a one-line change or button colour needs only a prompt, small issues may skip research, and plan time has diminishing returns past a sweet spot. | 1/2/1/2/2 trial · 1/2/1/1/2 skip | C1602, C1296, C1662, C1846 +1 |

**Skip and already-done (74 families, 187 cards):** 30 already done here, 44 skipped; 5 of these reached a refuter and fell. Each is listed with its scores and one-line reason in `review/POST-REVIEW-LIST.md` under G1 and G4.

### 2.8 L3 backpressure and verifiers — 95 families, 255 cards

### Adopt, narrowed by the refuter (1 families, 3 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G4-F023** | L3 | Narrowed. The standing per-trial pin schema reopens the skipped "evaluation-run schema" (HR §4 line 275), and the seed cannot be pinned because agent() exposes none. What survives is a clause written into any A/B trial the review adopts: both arms read the same head SHA, the same brief text (committed to the existing evidence folder, with its sha256 in the existing manifest) and the same named inputs, and a result… | The first A/B trial to close (for example the L1 effort-routing trial) is the test. Check its evidence manifest: both arms must record an identical brief-file sha256, an identical head SHA and an identical list of input ids. Then give a fresh agent only that evidence folder and ask it to re-dispatch one arm. It passes if all three fields match across arms,… | 2/3/2/2/3 adopt · 2/3/2/1/3 adopt | C0260, C0628, C0696 |

### Trial, narrowed by the refuter (9 families, 39 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G4-F068** | L3, W2 | Narrowed: the benchmark's garbage-scoring idea doesn't transfer, because untracked files never reach a squash-merged repo and committed files are already in the reviewed diff. Keep only a free close-time check, worktree clean plus evidence manifest complete, trialled for missed intended files (like the uncommitted split-review-input tool) rather than for slop. | Trial over the next 5 phase closes, as one item in the §0 closing message. Run `git status --porcelain` in the phase worktree. For any phase that writes under docs/program/evidence/, also diff `find <folder> -type f` (excluding the manifest) against the paths in manifest.sha256. Each non-empty entry must get a decision: commit and add to the manifest, or… | 1/3/2/1/3 adopt · 2/3/2/1/3 adopt | C0257 |
| **G4-F140** | L3, W1, W2 | What survives is narrower than "read every line". The owner reads only the hunks the reviewer marks as touching invariants, only on PRs in §0's Opus-owned list, recorded against the head SHA, trialled on 3 PRs. The broad claim rests on HumanLayer anecdotes without numbers, from a team with no model reviewer, which FixFlow already has. The W1 benefit is illusory and the W2 benefit is partial. | Take the next 3 merged PRs that touch SHIP-PLAN §0 Routing's Opus-owned list: outbox/drain tooling, job lifecycle, ledger/money, auth/PIN/JWT, migrations, location time bounds. For each one, the Opus reviewer's verdict lists the invariant-touching hunks (file:line). The owner reads only those hunks, at the same head SHA the reviewer read, before merge. A… | 1/2/2/2/2 trial · 1/3/2/2/2 trial | C0881, C0906, C1215, C0936 +12 |
| **G4-F152** | L3, W3 | Narrowed to a trial. Two of the family's three parts already exist: reviewer refute lists come from the plan's register ids, and P1 already turns its manual checks into automated tests. Register-id boxes already carry fail-before/pass-after tests (SHIP-PLAN §0 Routing). What survives is one line per tick for the non-register boxes (CI and harness gates, docs, deploy steps): the verifying command, its expected… | Run the trial in P1 (and P1-ci if it is split off) and the next two code phases. **What the implementer records:** for each Scope box with no register id, the tick records the exact command and its expected result. For a gate box, that includes a negative run showing the gate fails when it should. Examples: - with FIXFLOW_TEST_DATABASE_URL unset, the… | 1/3/1/2/3 trial · 1/3/2/2/3 adopt | C1233, C1419, C1841 |
| **G4-F157** | L3, L2 | The core idea, a deterministic wrapper that writes full logs to a file and returns one line per gate, is already done: Appendix A's g() is mandated for backend gates by ship plan §0. The one-tick output would erase the skip-aware signal, and fail-fast contradicts the every-gate design. Only a small version survives as a trial: apply the same g() discipline (one EXIT line plus the runner's pass/skip counts, a… | Over the first 2 code phases that run the native web and mobile gates (lint, test, build, typecheck, jest, expo export), log for each run: the gate-output tokens that reach the main Fable session and the implementer, the number of re-runs caused because a returned tail cut off the first error (mypy/tsc/eslint list errors top-down), and whether each… | 1/3/2/2/3 trial · 1/3/2/2/2 trial | C1254, C1575, C1581, C1583 +4 |
| **G4-F185** | L3, W1, W3 | Only the reviewer-brief half survives, as a trial. The plan-side "not doing" section already exists as the enumerated Scope, the "Backlog in these files" and Size lines, and the "ruled out" journal. The evidence is anecdotal, so B's adopt is too strong. The check must also exclude CLAUDE.md-protected defensive code, or it invites the reviewer to "simplify" invariants away. | Add one line to the Opus PR-reviewer brief. It asks the reviewer to list every change in the diff that no Scope checkbox requires: unrequested abstractions, config where a constant would do, and new error branches with no Scope or test reason. The reviewer reports and never removes, and constructs named in CLAUDE.md invariants are excluded. Run it over the… | 1/3/1/1/3 trial · 1/3/1/1/3 adopt | C1373, C1770, C1845 |
| **G4-F186** | L3, W2 | The fresh-context reviewer and the anti-pattern list already exist (§0 Routing; CLAUDE.md invariants, loaded by every subagent). Only the one-section deviation report against Plan @ sha survives: it is the one outside check on ticked boxes and unrecorded additions. It runs as a trial rather than an adopt because its evidence is anecdotal and the reviewer has never run. | For the first 5 code-phase PRs from P1 on, add one section to the Opus reviewer brief: 'Deviations from Scope at Plan @ <sha>'. It lists, each with file:line: (a) diff hunks or files that no Scope box accounts for, (b) boxes ticked with no matching diff or test, (c) unticked boxes. Fable labels each item real or noise and checks it against the PR's… | 1/3/1/2/3 trial · 1/3/2/2/3 adopt | C1282, C1416 |
| **G4-F225** | L3, W2, W3 | The diagrams and per-folder HTML are refuted: import-linter, ESLint and the planned dependency-cruiser fail the build on a broken boundary, which is stronger than a picture, and the graphify skip reason still holds. A smaller version survives as a trial: a mechanical (not AI-curated) list of changed gate-defining files for the owner to read before the merge they already do. It extends the reviewer's existing list… | For the first 5 code-phase PRs, the Opus reviewer verdict adds a "gate-file changes" list. It is produced mechanically: `git diff --name-only <base>..<head>` filtered against a fixed path set (backend/pyproject.toml importlinter/ruff/mypy/pytest sections, the ESLint config, .github/workflows/ci.yml, jest/vitest/pytest config, the dependency-cruiser config… | 1/3/2/2/3 trial · 1/2/2/2/3 adopt | C0890, C1407, C1405 |
| **G4-F228** | L3, L1 | Narrowed. Snapshotting outputs and avoiding synthetic fixtures is already done (evidence/README.md, §4.2), and both reviewers' trials fail on the evidence: G4-A needs REFUTED cases that do not exist (G2 §1.3), and G4-B tests the P0/invariant skeptic class that §3 keeps at xhigh. What survives is a rerun of the committed, mixed-verdict knowledge-store refuter set at high, gated on G4-F203, where xhigh is actually… | Run this only if G4-F203 shows that xhigh verifier spend is at least 20%. Test at the `high` effort level, not medium, following §3's "raise effort on the current tier" rule. (a) Rerun the committed knowledge-store refuter workflow (evidence/knowledge-store/refute-v1.3/*.js) on its frozen inputs at Opus/high, twice. This set holds mixed… | 1/3/2/3/2 trial · 1/2/2/2/2 trial | C1340, C1341 |
| **G4-F232** | L3, W2, W3 | Narrowed. The family's own idea (asserting on a structured next-step-intent trace) does not transfer: the phase routine has no such trace, a trace would need the hooks the review skipped, and the workflow-output half is already done by §5.2 schemas and citation checks. What survives is a cheap, advisory CI check on code-phase PR bodies: the Plan line, the journal heading, and a posted reviewer verdict whose SHA… | Put the check in a separate GitHub Actions workflow file, so that body edits do not re-run the three CI jobs. Natural home: P1-ci, which SHIP-PLAN P1 already allows for CI harness items. Run it advisory-only over the first 5 code-phase PRs (P1 or P1-ci, P2a, P2b-1, P2b-2, P3a). It asserts three things. First, line 1 matches `Plan @ <hex sha>` and that sha… | 1/3/3/3/3 trial · 1/2/3/2/2 trial | C1827 |

### Unrefuted (over the per-group cap): both reviewers' dispositions stand, no verdict (5 families, 10 cards)

| Family | Bears on | Claim | A · B | Cards |
| --- | --- | --- | --- | --- |
| **G4-F125** | L3 | Run dead-code ('deslop' unused-export) checks as backpressure against agent-added unused code, with documented exceptions. | 1/2/2/1/2 trial · 1/2/2/1/1 skip | C0231 |
| **G4-F147** | L3, W2 | Use the model only for binary yes/no classifications about the artifact and compute the score deterministically in code; never ask for a holistic 1-100 or 1-10 score. | 0/3/1/2/3 trial · 0/3/0/1/3 already-done | C1026, C1160, C1660 |
| **G4-F154** | L3, W2, W3 | Give each phase a cheap human-checkable proof of correctness (a curl, a black-box integration test, a one-off main) so the human can verify without reading all the logic. | 0/2/1/2/3 trial · 0/2/0/1/3 already-done | C1654, C1742 |
| **G4-F156** | L3, L1, L2 | Tier verification by cost and risk: run a relevant subset per phase (not the whole 5+ minute suite each session), use cheap proxies first, checkpoint every 200-400 lines only for sensitive work, and run the full suite before close. | 1/2/1/2/2 trial · 1/2/1/1/2 skip | C1255, C1734, C1319 |
| **G4-F224** | L3, W4 | Let CI and a review bot drive fresh follow-up fix agents per failure stage instead of running the full suite in the agent's sandbox (test wait fell from 15-20 minutes to 2-4). | 2/1/2/1/2 trial · 2/1/2/1/1 skip | C0959 |

**Skip and already-done (80 families, 203 cards):** 46 already done here, 34 skipped; 3 of these reached a refuter and fell. Each is listed with its scores and one-line reason in `review/POST-REVIEW-LIST.md` under G4.

### 2.9 cross-cutting — 54 families, 75 cards

### Trial, narrowed by the refuter (1 families, 1 cards)

| Family | Bears on | What survives (the refuter's narrowed form) | The measurement that decides it | A · B scores (e/t/n/b/c) | Cards |
| --- | --- | --- | --- | --- | --- |
| **G5-F024** | none | Narrowed. The dispatcher landing is refuted (no LLM in the product), and so is "a guardrail fixes it". The reviewers' brief-sentence rule changes nothing: Railway and GitHub CLI credentials sit in the user profile and subagents run in bypass mode. What survives is a trial of a structural cut of the private-data leg: a restricted research agent type with deny rules for any context that reads… | Two checks; the first is a ten-minute canary. (A) Define one restricted agent type (.claude/agents/, tools limited to Read/Grep/Glob/WebFetch/WebSearch and no Bash) plus permissions.deny for Read of ~/.ssh/**, ~/.railway/**, %APPDATA%/GitHub CLI/** and the dump/archive folders. In a bypass-mode Workflow, have that agent try to read ~/.railway and… | 1/2/2/2/3 adopt · 1/3/2/2/3 adopt | C1222 |

**Skip and already-done (53 families, 74 cards):** 17 already done here, 36 skipped; 3 of these reached a refuter and fell. Each is listed with its scores and one-line reason in `review/POST-REVIEW-LIST.md` under G5.

---

## 3. Adjudication record

### 3.1 Method and provenance

| Stage | Workflow run | Agents | Model / effort | Tokens | Wall clock |
| --- | --- | --- | --- | --- | --- |
| Sweep, round 1 (by modality, newest first) | `wf_5b59f5db-8bc` | 40 readers, R01–R40 | Sonnet; low for transcripts and podcasts, medium for repos, essays, docs and the two gap sweeps | 5.46M | 10 min |
| Sweep, round 2 (sources the gap sweeps found) | `wf_95340a7b-f40` | 5 readers, R41–R45 | Sonnet; low/medium | 0.63M | 3 min |
| Sweep, round 3 (Tessl episode 124) | `wf_5a1d0daf-5cb` | 1 reader, R46 | Sonnet; low | 0.09M | 1 min |
| Dedupe | plain code (`tools/build-prereview.mjs.txt`) | — | — | — | — |
| Cluster, review, refute, critic | `wf_73237cdf-5f8` (first pass lost its families to a mangled regex in the script — the clusterer outputs were cached and the run was resumed with the fix; the first pass cost 1.38M tokens and 15 min) | 8 Sonnet clusterers; 24 Opus reviewers (two lenses per card group, parts of ≤ 100 families); 144 fresh-context Opus refuters; 1 Opus completeness critic | Sonnet medium; Opus high; refuters Opus xhigh | 14.81M (plus 1.38M in the lost first pass) | 26 min (plus 15) |

Every reader was blind to the others and received the same CONTEXT block (the five weaknesses, the
three levers, what the harness already has, the card schema and the rules in §1). Readers read
pre-fetched local copies of each source (the fetch methods are in §3.3), not the live web, so a
reader's "read" means the primary text or transcript was in its context; "summarised" means only a
page description or a third party's summary was. The main session (Fable) wrote the briefs, ran the
code, read the reports and wrote this document; it read no source in full itself and scored no card.

Scores and dispositions are per **family** (cards that make the same claim, clustered by Sonnet at
medium effort, organising only). Every card inherits its family's scores. The clusterers covered all
1,906 cards (membership validated by code after the run: 1,906 of 1,906 cards assigned, no invented ids, none outside its group). Two Opus reviewers scored every
family, one with a benefit-seeking lens (A), one with a cost-and-novelty-skeptic lens (B). Where the
two disagreed, both scores stand in §2 and the refuter decided. A fresh-context Opus refuter at xhigh
(default verdict refuted; "survives" requires that counter-evidence was looked for in the harness
files and not found) attacked every family at least one reviewer marked adopt or trial, up to a cap
of 40 per card group, ordered by both-reviewers-agree first, then adopt before trial, then score sum;
families over the cap are carried in §2 as "unrefuted (over cap)" with both reviewers' dispositions,
never dropped. A family neither reviewer marked adopt or trial was not refuted; its disposition is
the reviewers' (recorded as "reviewers agree" or, on a skip-versus-already-done split, the weaker).

### 3.2 What was swept

The sweep started from the inventory (`evidence/harness-ideas/horthy/inventory.md`, about 80 dated
items plus follow-ons) and went wider: 326 fetched sources in the ledger
(`sources-ledger.tsv`): 39 X posts and articles, 64 web pages, 4 Hacker News threads, 19 YouTube
transcripts, 181 files from 75 AI That Works episode folders (transcripts for 2026, README notes for
2025), and 19 repositories (the HumanLayer organisation and Dex's own). By modality:

- **Repositories (R01–R04, R07, R40, R43, R44):** humanlayer/humanlayer (open-sourced 2026-10-22:
  its CLAUDE.md with `<important if>` blocks, two hooks, the silent-runner backpressure script, 25
  skills, the riptide-rpi plugin's 22 skills, the docs source, a context-shard example),
  humanlayer/skills (the portable RPI plugin at v1.1.0 with its five agents and test scripts,
  improve-claude-md, show-me, visual-pr, the two loop-design plugins), riptide-rpi,
  rpi-coordination-template, the advanced-context-engineering essay shelf, fold, agentlayer,
  claudelayer, mcp-cli, shannon, slopfiles, multiclaude, better-github, humanlayer-pi,
  humanlayer-opencode, the two kustomark-ralph repos, 12-factor-agents (edits after 2025-06-01 only),
  and Dex's dotfiles (his personal `~/.claude` agents, commands and settings, 2025-12).
- **Essays and X articles (R05, R06, R11):** ace-fca.md, wsff.md, the time-breakdown side quest, the
  three SlopCodeBench reports, the three-part "Why Software Factories Fail" X series, "Pragmatic
  Leverage", the show-me article.
- **Blog, site and docs (R08, R09, R10, R43):** all twelve HumanLayer posts, the marketing site, the
  All Resources index, the Anthropic customer story, the release notes 0.101.7 → 0.201.0 and every
  docs page, read twice (web summaries, then the raw markdown from the repository).
- **Talks (R13–R18):** AIEWF 2026 keynote and the Great Loops Debate, "Everything We Got Wrong About
  RPI" (March and the Miami April version, the latter cut from a full-day livestream by timestamp),
  the 2025 talks (No Vibes Allowed, 12-Factor at AIEWF, YC Root Access, MLOps), the Ralph videos,
  the Latent Space "dumb zone" clip, AITW #17 and #33, the Ondrej interview.
- **Podcasts (R19–R23, R45, R46):** Pragmatic Engineer, Dev Interrupted (two episodes), Heavybit
  High Leverage, Screaming in the Cloud, Qodo, Weekly Dev's Brew, Infra Pod, the Tessl AI Native Dev
  episode (opening only), and six pages without transcripts.
- **X threads (R12, R41):** 36 head tweets, including the 21 "ideas" the All Resources page links
  that the inventory had no way to list.
- **AI That Works (R24–R37):** every 2026 episode with a transcript (#41–#78), the 2025 episodes
  from their README notes.
- **Critique only (R38, R42):** seven follow-on pieces, four HN threads, the orcabot skills study.
- **Gap sweeps (R39 web, R40 GitHub):** what the inventory missed; their finds fed rounds 2 and 3.

### 3.3 How the unreadable became readable, and what stayed unread

- **X articles and threads** (HTTP 402 at inventory time) were rendered from the fxtwitter API
  (`tools/x-fetch.sh.txt`): the head tweet and, for articles, the full body with links. Replies and
  later tweets in a thread are not captured, and no timeline listing was available (nitter's search
  was offline, the syndication widget empty), so **X posts from October and November 2026 are
  unknown**.
- **YouTube** was read through an ephemeral `uvx` run of youtube-transcript-api (nothing installed;
  `tools/yt-transcript.sh.txt`). Seventeen videos came through before YouTube rate-limited this
  machine's address; a retry after fifteen minutes, two transcript websites (403), five Invidious
  instances and yt-dlp (429) all failed. **Unread as a result:** AITW #40 (`qgAny0sEdIk`), AITW
  "Harness Engineering Without the Hype" (`gX9WpYY61xA`, the episode most directly about harnesses;
  its README notes were read), the AGNTCon Europe day-2 livestream that holds the "State of the
  Software Factory" keynote of 2026-09-17 (`-w6RDNBAI0E`; the inventory had filed this id under the
  WeAreDevelopers San Jose talk of the same title, which is a separate delivery gated behind a free
  account), the 2025 episodes on git worktrees, bash-versus-MCP and founding HumanLayer, and the full
  Tessl episode 124 (`H_1PygR7kwk`; the site's CMS exposes only the opening ~1,800 words, which were
  read).
- **AI That Works** transcripts came from the show's own repository (`transcript.txt` per 2026
  episode), which is why the 2026 episodes are "read" and the 2025 ones "summarised".
- **The AGNTCon North America talk of 2026-10-22, "There Is No Software Factory Without Better
  Verifiers", has no recording, slides or write-up as of 2026-11-04** (re-checked by R39: the Linux
  Foundation schedule lists it as an Agentic Engineering breakout, 11:45–12:10, room 210B, which
  makes a professional recording less likely; the AAIF promo post of 2026-09-10, read by R11, is an
  editor's preview written before the talk). The **code.talks Hamburg keynote of 2026-11-04** (the day
  of this sweep) has an abstract only.
- **Podcasts without transcripts** (Mastra, Beyond Coding, the Matt Pocock livestream, AI Tinkerers,
  Build Wiz, the LinearB debate page) were carded from descriptions and marked summarised.
- **Slides and images** were not read anywhere (the wsff-live deck, the SlopCodeBench charts, the
  show-me screenshots); numbers that appear only in charts are missing. Gabe Orlanski's qualitative
  Part II of the October SlopCodeBench update is not published in the repository.
- **LinkedIn** was unreadable with these tools.

### 3.4 Sources found beyond the inventory

Rounds 2 and 3 read: the Dev Interrupted panel "Why software factories fail without humans"
(2026-09-01, transcript on page; the inventory had only the 08-26 workshop listing); the Tessl AI
Native Dev episode 124 (2026-09-22; the inventory noted only that Tessl's episode 116 does not involve
Dex); the JetBrains recap of the AGNTCon Europe keynote (2026-10-13); the code.talks Hamburg abstract;
21 X posts the All Resources page links as "ideas" (2025-05 → 2026-06: Bash considered harmful,
learning tests, designing backpressure systems, problems with default compaction, self-forking agents,
RPI versus spec-driven development, agents as code rotators, intentional understeering, and others)
plus three found by readers (Agents as Spec Compilers, How not to use SubAgents, the Fable 5 refactor
write-up); the 290-comment HN thread on "Writing a good CLAUDE.md" (2025-11-30) and the orcabot
SlopCodeBench-based skills study (2026-07), both critique-only; and first-hand harness artefacts the
inventory listed by repository name only — the humanlayer monorepo's CLAUDE.md, hooks, silent runner,
skills, context shard and docs source; humanlayer/skills' five RPI agents; Dex's dotfiles; the
claudelayer commands; multiclaude. The inventory's items map to cards in the appendix.

### 3.5 What fell, and why

Of the 144 families the refuters attacked, 65 were refuted outright and 79 narrowed; none survived
as the reviewers passed it. The reasons, with the recurring examples (every verdict and its
counter-evidence is in `review/refutations.json` and the per-family rows of
`review/POST-REVIEW-LIST.md`):

- **The harness already has it (24 of the 65 outright refutations, and the largest reason across
  all 838 families: 395 "already done").** The silent runner for test output (G4-F001, G4-F003,
  G4-F158) is Appendix A's per-gate log wrapper; "control flow in code, not in a long prompt"
  (G2-F041, G2-F114) is the Workflow-tool orchestration; "fresh-context review with a fixed
  anti-pattern list" (G4-F186) is the §0 reviewer; "spec and prompts as durable artifacts"
  (G2-F096, G2-F201) is the evidence folder and `Plan @ sha`; "hooks must be visible, in-repo and
  removable" (G2-F126) is HR-C5's reserved JSON and the no-plugin rule; "pin skills to a commit"
  (G3-F068) is the skills README; "verify by executable derivation" (G2-F015's first half) is P1's
  CI head check; "keep research objective, decide nothing" (G2-F148, G2-F013, G3-F124) is the
  fact-only schemas and the blinded refuters.
- **The evidence is an anecdote or an assertion.** The refuters applied the owner rule literally:
  a rule in a HumanLayer file is "asserted", "we did this and it worked" is anecdotal, product
  copy is marketing. Most of what fell for this reason came from podcasts and talks: the 40 %
  context rule (G1-F159, set on 200k windows and moved by its author from 50 % to 40 % to "restart
  at 60 %"), the 100k-token dumb zone (G1-F080; its author withdrew the flat figure in September
  2026), "stop on any failed git operation" (G2-F177), "a cheap model with 100 never-happen rules
  is nearly a linter" (G4-F041), the 85-instruction planning prompt (G1-F098; before/after counts
  but no adherence rate after the split, and the fix also added human stops).
- **It re-adopts a deliberate skip whose reason still holds.** A per-session resume pointer
  (G2-F021) is the skipped SessionStart hook; eval-first model changes, a weekly post-mortem loop,
  benchmark re-runs on every release and a standing A/B pin schema (G4-F033, G2-F066, G4-F025,
  G4-F023) are the skipped measurement pipeline M00–M06; a Stop hook that re-runs CI (G2-F028,
  over the cap) and a hard block on boundary-config edits (G2-F123) are the skipped pre-commit
  gate. Each survived only as the part that needs no pipeline: one provenance line, one journal
  tag, one reviewer-brief clause.
- **It does not transfer to one developer on Windows running this routine.** Team-adoption
  pruning and "five great shared skills beat seventy" (G3-F070), multi-repo coordination, Codex
  cross-review queues with no Codex on the machine (G4-F084), cloud session mirrors and run stores
  (G2-F023), HumanLayer's dollar figures against a flat subscription (G4-F203), the `/show-me`
  terminal-chart rule on a desktop app that renders Mermaid (G5-F012), product features of
  HumanLayer's own tool (context shards, forking, orchestrate) with no published mechanism.
- **It contradicts an owner ruling.** The knowledge-store design's D11 keeps every `CLAUDE.md`
  rule and moves only verified-entry narrative, so "wrap sections in `<important if>`" (G1-F001),
  "delete what a linter can enforce" (G1-F010's first half), "remove rules the model already
  follows" (G1-F015) and "count instructions against a budget" (G1-F095) fell to that ruling, with
  the added point that wrapping would tell the model it may ignore cross-cutting invariants that
  `CLAUDE.md` itself records as having broken through unrelated paths.
- **The numbers were misread or do not isolate the cause.** The medium-versus-xhigh gap is one
  run per setting with no error bars, and its own author says so (G4-F022); the +2.76 SWE-bench
  drift happened under an unchanged model and harness version, so version logging would not have
  caught it (G4-F025); the scratch-file filter that cut 41k SLOC changed nothing for other models
  (G4-F068); the week-cost journal's one case never told models apart (G4-F181).

The 16 families over the refuter cap (three in W2/W3, thirteen in L1/L3) carry both reviewers'
dispositions in §2 and no verdict; in every one of them the benefit-seeking lens said trial and the
skeptic said skip or already-done, which is the pattern that fell most often under refutation.

The two lenses agreed on the disposition for 669 of 838 families; the 169 disagreements went to
refuters where either lens said adopt or trial, and otherwise were recorded as the weaker of the
two (skip over already-done), since neither lens claimed a benefit.

### 3.6 The completeness critic

One Opus critic read the inventory and all 46 reader reports (sources with status, gaps, new
sources) and was asked what was not read. Its findings, with this record's response:

- **Not read (29 items).** The AGNTCon NA verifiers talk (no primary content exists); the
  AGNTCon Europe keynote and the WeAreDevelopers delivery (YouTube blocked, page gated); 47–50
  minutes of Tessl episode 124 (site exposes the opening only); Beyond Coding 270, Mastra, Matt
  Pocock, AI Tinkerers, Build Wiz (no transcripts); AITW #79 and #80 (not yet in the show's
  repository), #54 "Harness Engineering Without the Hype" and #40 (YouTube blocked; README notes
  read), the 2025 episodes (README only); X posts from September to November 2026 and every reply
  thread; LinkedIn; the October–November diffs of humanlayer/skills (titles read, diffs not); the
  monorepo's verifier code (`tools/oxlint/anti-slop/rules`, `scripts/hook-prepush.ts`,
  `scripts/hooks/pre-push`) and how its two hooks are bound to Claude Code events; `fold`'s source
  beyond the README; `dexhorthy/official-plugins` (a fork of Amp's plugins); Gabe Orlanski's
  SlopCodeBench Part II; the SlopCodeBench paper and raw per-run results; the primary studies behind
  W1's adherence figure and L2's heuristic; slides anywhere. §3.3 says why for each tool-blocked
  item. The critic's ranked next reads are in `review/critic.json`.
- **Quality concerns the record accepts.** (1) YouTube `H_1PygR7kwk` and Tessl episode 124 are
  one source; only R46 carded it, so no double counting reached the review. (2) R39 marked three
  summary-level fetches as "read"; its cards on the Dev Interrupted panel were superseded by R45's
  full read, and R39 yielded 21 cards in all. (3) R10's docs cards came from web summaries and R43
  later read the raw markdown; both sets entered the review (the lexical dedupe merged some), so a
  docs family may have more members than distinct evidence. (4) Auto-caption speaker attribution
  is inferred in the debate, AITW #17, the Ralph videos and several 2026 episodes; readers flagged
  the doubtful cards in their claims. (5) R28's "Harness Engineering Without the Hype" cards rest
  on README highlights whose speaker is a guess. (6) Dex-versus-Kyle authorship of the loop skills
  comes from the inventory, not git. (7) R23 and R37 cards are description-only and marked
  summarised. (8) Three cards carry malformed URLs (R08-45, R20-21, R20-28), flagged by their
  readers. (9) `multiclaude` is `dexhorthy/multiclaude` (verified with the GitHub API); R44's
  "humanlayer" owner is wrong.
- **Modalities missing.** Slides and images, X replies, LinkedIn, audio without transcripts,
  source code beyond READMEs and skills, git blame, raw benchmark data, the primary research
  papers, and community discussion of the October items. None was reachable with the tools used.

### 3.7 Provenance

Pre-review list committed at `95cc9e6` before the review ran. Review run `wf_73237cdf-5f8` (two
passes, §3.1). Document, review outputs and manifest committed after. The main session (Fable)
read no source in full and scored no card; it wrote the briefs and the code, ran the dedupe and
the renderers, chose the refuter cap and ordering, and wrote §0 and §3 from the review outputs.

---

## Appendix — the inventory's items and the cards that came from them

Every dated item of the starting inventory (`evidence/harness-ideas/horthy/inventory.md`, parsed by `tools/inventory-items.mjs.txt`) mapped to the cards whose source matches it (by URL, YouTube id, X status id, repository, episode date or title) and to the readers that reported reading it, with their status. Items with no card say why. Sources the sweep found beyond the inventory are in §3.4 and carry `(not in inventory)` in the pre-review list.

Items mapped: 136. With cards: 116. Read but no distinct card: 7. Cross-references: 3. Descriptive lines: 3. Follow-ons by others without a critique card: 6. Untouched: 1.

| # | Section | Date | Inventory item (truncated) | Cards | Matched by | Reader status | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | A1. 12-Factor Agents | 2025-09-21 | https://github.com/humanlayer/12-factor-agents (F). Dormant: last commit 2025-09-21 ("there will be no v1.1"); 273 commi | 7: C1867, C1868, C1874, C1875, C1876, C1877, C1894 | url | R07:read |  |
| 2 | A1. 12-Factor Agents | 2026-01-13 | 2026 activity is elsewhere: AI That Works #40 (2026-01-13; YouTube 2026-01-19) "Applying 12-Factor Principles to Coding  | 2: C1483, C1484 | episode date | R24:summarised |  |
| 3 | A1. 12-Factor Agents |  | Argues: production agents are mostly deterministic code with LLM steps inserted; own your prompts, context, state and co | — | — | — | descriptive line in the inventory, not a source |
| 4 | A1. 12-Factor Agents | 2025-07-03 | Talks: AI Engineer World's Fair 2025 (17:06) https://ai.engineer/talks/8kMaTybvDUw-12-factor-agents (F), YouTube 2025-07 | 27: C1824, C1825, C1826, C1827, C1828, C1829, C1830, C1831, C1832, C1867 … | url | R07:read; R16:read |  |
| 5 | A2. Advanced Context Engineering f | 2026-10-16 | Repo https://github.com/humanlayer/advanced-context-engineering-for-coding-agents (F): last updated 2026-10-16; 56 commi | 108: C0251, C0252, C0253, C0254, C0255, C0256, C0257, C0258, C0259, C0260 … | url | R05:read; R06:read; R39:read |  |
| 6 | A2. Advanced Context Engineering f | 2025-08-29 | Blog post https://www.humanlayer.dev/blog/advanced-context-engineering (listed 2025-08-29): research/plan/implement and  | — | — | R05:read | read; no distinct card |
| 7 | A2. Advanced Context Engineering f | 2025-08-25 | YC Root Access talk 2025-08-25 https://rosetta.to/u/ycrootaccess/advanced-context-engineering-for-agents (F): claims a m | 10: C1808, C1809, C1810, C1811, C1812, C1813, C1814, C1815, C1816, C1817 | url | R16:read |  |
| 8 | A2. Advanced Context Engineering f | 2025-08-06 | AI That Works #17 (2025-08-06) https://www.youtube.com/watch?v=42AzKZRNhsk (L). | 30: C1833, C1834, C1835, C1836, C1837, C1838, C1839, C1840, C1841, C1842 … | url | R16:read; R37:summarised |  |
| 9 | A2. Advanced Context Engineering f | 2025-12-02 | Follow-up talk: "No Vibes Allowed: Solving Hard Problems in Complex Codebases", AI Engineer Code 2025 (Nov 2025; YouTube | 27: C1590, C1591, C1592, C1593, C1594, C1595, C1596, C1597, C1598, C1599 … | url | R16:read |  |
| 10 | A3. HumanLayer blog and product po | 2026-10-23 | Open sourcing HumanLayer \| Dex \| F | 3: C0173, C0174, C0175 | title | R08:read |  |
| 11 | A3. HumanLayer blog and product po | 2026-09-04 | HumanLayer - All Resources \| not stated \| F | 19: C0400, C0401, C0402, C0403, C0404, C0405, C0406, C0407, C0408, C0409 … | title | R09:read; R41:read |  |
| 12 | A3. HumanLayer blog and product po | 2026-08-12 | show-me: a coding agent skill for compact visual representations \| Dex \| F | 11: C0529, C0530, C0531, C0532, C0533, C0534, C0535, C0536, C0537, C0538 … | title | R08:read |  |
| 13 | A3. HumanLayer blog and product po | 2026-05-15 | Context Forking to Save Time, Tokens and Trouble \| Kyle \| F | 4: C1058, C1059, C1060, C1061 | title | R08:read |  |
| 14 | A3. HumanLayer blog and product po | 2026-03-23 | Long-Context Isn't the Answer \| Kyle \| F | 6: C1185, C1186, C1187, C1188, C1189, C1190 | title | R08:read |  |
| 15 | A3. HumanLayer blog and product po | 2026-03-17 | Getting Claude to Actually Read Your CLAUDE.md \| Dex \| F | 4: C1207, C1208, C1209, C1210 | title | R08:read |  |
| 16 | A3. HumanLayer blog and product po | 2026-03-12 | Skill Issue: Harness Engineering for Coding Agents \| Kyle \| F | 24: C1236, C1237, C1238, C1239, C1240, C1241, C1242, C1243, C1244, C1245 … | title | R08:read |  |
| 17 | A3. HumanLayer blog and product po | 2026-01-06 | A Brief History of Ralph \| Dex \| F | 11: C1510, C1511, C1512, C1513, C1514, C1515, C1516, C1517, C1518, C1519 … | title | R08:read |  |
| 18 | A3. HumanLayer blog and product po | 2025-12-09 | Context-Efficient Backpressure for Coding Agents \| Dex \| F | 12: C1575, C1576, C1577, C1578, C1579, C1580, C1581, C1582, C1583, C1584 … | title | R09:read |  |
| 19 | A3. HumanLayer blog and product po | 2025-11-25 | Writing a good CLAUDE.md \| Kyle \| F | 29: C1617, C1618, C1619, C1620, C1621, C1622, C1623, C1624, C1625, C1626 … | title | R09:read; R42:read |  |
| 20 | A3. HumanLayer blog and product po | 2025-08-29 | Advanced Context Engineering for Coding Agents \| not checked \| listed only | 62: C0831, C0832, C0833, C0834, C0835, C0836, C0837, C0838, C0839, C0840 … | title | R05:read; R16:read; R37:summarised |  |
| 21 | A3. HumanLayer blog and product po | 2025-04-03 | 12 Factor Agents \| not checked \| listed only | 40: C0066, C1824, C1825, C1826, C1827, C1828, C1829, C1830, C1831, C1832 … | title | R07:read; R09:read; R16:read; R41:read |  |
| 22 | A3. HumanLayer blog and product po |  | Open sourcing HumanLayer: core is Apache-2.0; includes the desktop app, the daemon, the cloud API, the humanlayer-pi and | 3: C0173, C0174, C0175 | title | R08:read |  |
| 23 | A3. HumanLayer blog and product po |  | show-me: a skill that has agents explain code with diagrams, trees and diffs instead of prose. Install: `npx skills add  | 101: C0015, C0016, C0017, C0018, C0019, C0020, C0021, C0022, C0023, C0024 … | url | R02:read; R02:partial; R03:read; R40:read; R40:partial |  |
| 24 | A3. HumanLayer blog and product po |  | Context Forking: fork a conversation back to an earlier turn to reuse built-up context. | 4: C1058, C1059, C1060, C1061 | title | R08:read |  |
| 25 | A3. HumanLayer blog and product po |  | Long-Context Isn't the Answer: a 1M-token window does not improve instruction-following; use sub-agents to keep context  | 6: C1185, C1186, C1187, C1188, C1189, C1190 | title | R08:read |  |
| 26 | A3. HumanLayer blog and product po |  | Getting Claude to Actually Read Your CLAUDE.md: wrap task-specific sections in `<important if>` conditions; repo `humanl | 101: C0015, C0016, C0017, C0018, C0019, C0020, C0021, C0022, C0023, C0024 … | url | R02:read; R02:partial; R03:read; R08:read; R40:read; R40:partial |  |
| 27 | A3. HumanLayer blog and product po |  | Skill Issue: failures are usually harness configuration, not the model; covers CLAUDE.md, MCP, skills, sub-agents, hooks | 24: C1236, C1237, C1238, C1239, C1240, C1241, C1242, C1243, C1244, C1245 … | title | R08:read |  |
| 28 | A3. HumanLayer blog and product po |  | A Brief History of Ralph: Geoff Huntley's loop technique (Dex first saw it June 2025); Dex criticises Anthropic's offici | 11: C1510, C1511, C1512, C1513, C1514, C1515, C1516, C1517, C1518, C1519 … | title | R08:read |  |
| 29 | A3. HumanLayer blog and product po |  | Context-Efficient Backpressure: a wrapper script (`hack/run_silent.sh` in humanlayer/humanlayer) that trims test and bui | 136: C0014, C0015, C0066, C0067, C0068, C0069, C0070, C0071, C0072, C0073 … | url | R01:read; R04:read; R04:partial; R09:read; R40:read; R40:partial … |  |
| 30 | A3. HumanLayer blog and product po |  | Writing a good CLAUDE.md: keep it short and universally applicable. | 29: C1617, C1618, C1619, C1620, C1621, C1622, C1623, C1624, C1625, C1626 … | title | R09:read; R42:read |  |
| 31 | A4. CodeLayer | 2026-11-02 | Repo https://github.com/humanlayer/humanlayer (F): last release 0.201.0 on 2026-11-02 ("worktrees for directory tasks in | 136: C0014, C0015, C0066, C0067, C0068, C0069, C0070, C0071, C0072, C0073 … | url | R01:read; R04:read; R04:partial; R40:read; R40:partial; R43:read |  |
| 32 | A4. CodeLayer | 2026-11-02 | Install: Homebrew cask `codelayer` in https://github.com/humanlayer/homebrew-humanlayer (F, updated 2026-11-02). Nightli | — | — | — | no reader touched it (see §3 for why) |
| 33 | A4. CodeLayer | 2025-11-17 | External: Anthropic customer story 2025-11-17 https://www.claude.com/blog/building-companies-with-claude-code (F): CodeL | 39: C1647, C1648, C1649, C1650, C1651, C1652, C1653, C1654, C1655, C1656 … | url | R09:read; R12:read; R18:read; R37:summarised |  |
| 34 | A4. CodeLayer | 2026-10-03 | Related repos: `agentlayer` (SDK for building custom coding agents, MIT, 348 commits, updated 2026-10-03; contains a `co | 4: C0306, C0307, C0308, C0309 | url | R04:read; R07:read |  |
| 35 | November 2026 | 2026-11-03 | 2026-11-03 \| podcast/video \| AI That Works #80 "Using AI for Writing" (weekly show hosted by Vaibhav Gupta and Dex; ma | — | — | R36:summarised; R37:summarised | read; no distinct card |
| 36 | November 2026 | 2026-11-01 | 2026-11-01 \| repo \| humanlayer/skills: "rpi: bump version to 1.1.0"; Oct 31 commits add a prose reference and a docume | 101: C0015, C0016, C0017, C0018, C0019, C0020, C0021, C0022, C0023, C0024 … | url | R01:read; R02:read; R02:partial; R03:read; R40:read; R40:partial |  |
| 37 | November 2026 | 2026-10-27 | 2026-10-27 \| video \| AI That Works #79 "Building Evals on Production Data" (upcoming; the only evals item found). | — | — | R36:summarised | read; no distinct card |
| 38 | October 2026 | 2026-10-24 | 2026-10-24 \| repo \| humanlayer/fold: an Effect-native, provider-agnostic agent core with an optional coding agent, CLI | 8: C0168, C0169, C0170, C0171, C0172, C0310, C0311, C0312 | url | R07:read; R40:read |  |
| 39 | October 2026 | 2026-10-22 | 2026-10-22 \| talk \| AGNTCon + MCPCon North America, San Jose, "There Is No Software Factory Without Better Verifiers". | 13: C0375, C0376, C0377, C0378, C0379, C0380, C0381, C0382, C0383, C0384 … | url | R11:read; R39:read |  |
| 40 | October 2026 | 2026-10-20 | 2026-10-20 \| video \| AI That Works #78 "Software Factory Debate" (guest Zach, CTO of Warp). | 14: C0237, C0238, C0239, C0240, C0241, C0242, C0243, C0244, C0245, C0246 … | episode date | R23:unreadable; R36:read |  |
| 41 | October 2026 | 2026-10-15 | 2026-10-15 \| essay \| "SlopCodeBench update 10/2026 - Opus 5.5 update, Astra improves by 1.5% over gpt-5.5, xhigh consi | 11: C0251, C0252, C0253, C0254, C0255, C0256, C0257, C0258, C0259, C0260 … | title | R06:read |  |
| 42 | October 2026 | 2026-10-06 | 2026-10-06 \| video \| AI That Works #77 "Building a Memory Pipeline". | 21: C0278, C0279, C0280, C0281, C0282, C0283, C0284, C0285, C0286, C0287 … | episode date | R36:read |  |
| 43 | October 2026 | 2026-10-03 | 2026-10-03 to 10-16 \| repos (humanlayer org listing, F): `humanlayer-pi` (10-06, alpha; mirrors pi sessions; 39 stars); | 18: C0270, C0271, C0272, C0273, C0274, C0275, C0276, C0277, C0299, C0300 … | url | R04:read; R07:read; R40:read |  |
| 44 | October 2026 | 2026-10-05 | 2026-10-05 to 10-08 \| repo \| skills "portable RPI": commits make the RPI workflow portable across coding agents, with  | 101: C0015, C0016, C0017, C0018, C0019, C0020, C0021, C0022, C0023, C0024 … | url | R02:read; R02:partial; R03:read; R40:read; R40:partial |  |
| 45 | September 2026 | 2026-09-30 | 2026-09-30 \| podcast \| Beyond Coding ep. 270 "Why Coding Agents Keep Making Your Codebase Worse" (code-quality benchma | 9: C0313, C0314, C0315, C0316, C0317, C0318, C0319, C0320, C0321 | url | R23:summarised |  |
| 46 | September 2026 | 2026-09-23 | 2026-09-23/25 \| talk \| WeAreDevelopers World Congress 2026 North America, San José, "State of the Software Factory" (~ | 2: C0330, C0331 | url | R18:summarised; R36:read |  |
| 47 | September 2026 | 2026-09-21 | 2026-09-21 \| video \| "HumanLayer Collaboration Demo" https://www.youtube.com/watch?v=KpthJTIwnAo (L). | 2: C0366, C0367 | url | R17:read |  |
| 48 | September 2026 | 2026-09-17 | 2026-09-17 \| repo \| `visual-pr` skill added to humanlayer/skills (PRs with a visual outline) (F). | 101: C0015, C0016, C0017, C0018, C0019, C0020, C0021, C0022, C0023, C0024 … | url | R02:read; R02:partial; R03:read; R40:read; R40:partial |  |
| 49 | September 2026 | 2026-09 | 2026-09 \| AI That Works #72 Code Mode for Extensible Software; #73 Software Factories: Hands on with Real Builders; #74 | 6: C0420, C0421, C0422, C0423, C0424, C0425 | title | R34:read |  |
| 50 | September 2026 | 2026-09-18 | 2026-09-18 (year plausibly 2026) \| thread \| X post sharing the "Why Software Factories Fail" recording https://x.com/d | 1: C0369 | url | R05:read; R06:read; R11:read; R12:read; R13:read; R39:read … |  |
| 51 | August 2026 | 2026-08-28 | 2026-08-28 (session 08-25) \| video \| AI That Works #71 "Software Factory Design Patterns" https://youtu.be/tGbjIvvYuHE | 19: C0454, C0455, C0456, C0457, C0458, C0459, C0460, C0461, C0462, C0463 … | url | R34:read |  |
| 52 | August 2026 | 2026-08-26 | 2026-08-26 \| workshop \| LinearB "The great software factory debate: How do you know it's working?" (Dex, Aloke Desai o | — | — | R23:unreadable | read; no distinct card |
| 53 | August 2026 | 2026-08-13 | 2026-08-13 \| podcast \| The Weekly Dev's Brew ep. 21 "What Actually Gets You 2-3x With AI Coding" (host Jan-Niklas Wort | 44: C0482, C0483, C0484, C0485, C0486, C0487, C0488, C0489, C0490, C0491 … | url | R22:read |  |
| 54 | August 2026 | 2026-08-12 | 2026-08-12 \| X article \| "/show-me: compact visual representations for coding agents" https://x.com/dexhorthy/status/2 | 1: C0533 | url | R08:read |  |
| 55 | August 2026 | 2026-08-05 | 2026-08-05 \| podcast \| Heavybit High Leverage ep. 12 "The Limits of Lights-Out Coding" (host Joseph Ruscio) https://ww | 20: C0596, C0597, C0599, C0600, C0601, C0602, C0603, C0604, C0606, C0607 … | url | R20:read |  |
| 56 | August 2026 | 2026-08-04 | 2026-08-04 \| essay \| "SlopCodeBench: Sol, Fable and Kimi": strict pass rate 33.3% for Fable and Sol; Kimi K3 26.7% and | 12: C0618, C0619, C0620, C0621, C0622, C0623, C0624, C0625, C0626, C0627 … | title | R06:read |  |
| 57 | August 2026 | 2026-08-07 | 2026-08-07 (session 08-04) \| video \| AI That Works #68 "SlopCodeBench" https://www.youtube.com/watch?v=Yh4eL60Ncxs (L) | 23: C0630, C0631, C0632, C0633, C0634, C0635, C0636, C0637, C0638, C0639 … | url | R33:read |  |
| 58 | August 2026 | 2026-08-07 | 2026-08-07 \| video \| "David Ondrej: Agentic Engineering Workflow" https://www.youtube.com/watch?v=xgkjtF89-44 (L; Dex' | 36: C0560, C0561, C0562, C0563, C0564, C0565, C0566, C0567, C0568, C0569 … | url | R18:read |  |
| 59 | August 2026 | 2026-08-09 | 2026-08-09 to 08-13 \| repo \| `show-me` skill added to humanlayer/skills (F). | 101: C0015, C0016, C0017, C0018, C0019, C0020, C0021, C0022, C0023, C0024 … | url | R02:read; R02:partial; R03:read; R40:read; R40:partial |  |
| 60 | August 2026 | 2026-08 | 2026-08 \| AI That Works #69 Unconference Recap (08-11); #70 Syncs and A/B Testing 200 Agents (08-18). | 23: C0476, C0477, C0478, C0479, C0480, C0541, C0542, C0543, C0544, C0545 … | episode date | R33:read |  |
| 61 | July 2026 | 2026-07-29 | 2026-07-29 \| thread \| "Pragmatic Leverage in the Software Factory" https://x.com/dexhorthy/status/2082510831858893115  | 4: C0681, C0682, C0683, C0684 | url | R11:read |  |
| 62 | July 2026 | 2026-07-27 | 2026-07-27 \| essay \| SlopCodeBench Opus 5 report: Opus 5 passed 4 of 17 checkpoints (24%); Opus 4.8 and Sonnet 5 passe | 122: C0251, C0252, C0253, C0254, C0255, C0256, C0257, C0258, C0259, C0260 … | url | R05:read; R06:read; R39:read |  |
| 63 | July 2026 | 2026-07-24 | 2026-07-24/25 \| X articles \| part 1 "The Harness Is Not Enough" https://x.com/dexhorthy/status/2080697380379427275 and | 30: C0723, C0731, C0732, C0733, C0734, C0735, C0736, C0737, C0738, C0739 … | url | R11:read; R13:read |  |
| 64 | July 2026 | 2026-07-24 | 2026-07-24 \| video \| "HumanLayer Live Demo: Building a Product Spec for compounding agent memory" https://www.youtube. | 18: C0813, C0814, C0815, C0816, C0817, C0818, C0819, C0820, C0821, C0822 … | url | R32:read |  |
| 65 | July 2026 | 2026-07-22 | 2026-07-22/23 \| essay \| "Why Software Factories Fail" (`wsff.md`): lights-off factories fail because models are traine | 128: C0251, C0252, C0253, C0254, C0255, C0256, C0257, C0258, C0259, C0260 … | url | R05:read; R06:read; R11:read; R12:read; R13:read; R39:read … |  |
| 66 | July 2026 | 2026-07-23 | 2026-07-23 (upload; recorded 2026-06-30) \| talk \| AI Engineer World's Fair 2026 keynote "Harness Engineering is not En | 22: C0742, C0764, C0795, C0934, C0935, C0936, C0937, C0938, C0939, C0940 … | url | R05:read; R11:read; R12:read; R13:read; R13:partial |  |
| 67 | July 2026 | 2026-06-30 | 2026 (AIEWF, ~2026-06-30/07-01) \| talk \| "The Great Loops Debate" (1:00:16; Dex, Geoff Huntley, Ian Livingstone, Greg  | 13: C0900, C0901, C0902, C0903, C0904, C0905, C0906, C0907, C0908, C0909 … | url | R13:read; R38:read |  |
| 68 | July 2026 | 2026-07-25 | 2026-07-25 \| video \| "Loops Engineering from First Principles" (Kyle Mistele, not Dex) https://www.youtube.com/watch?v | 13: C0744, C0745, C0746, C0747, C0748, C0749, C0750, C0751, C0752, C0753 … | url | R17:read |  |
| 69 | July 2026 | 2026-07-17 | 2026-07-17 \| video \| "Frontier AI Coding Benchmarks" https://www.youtube.com/watch?v=X5mI1ZVxaIc (L). | 14: C0865, C0866, C0867, C0868, C0869, C0870, C0871, C0872, C0873, C0874 … | url | R32:read |  |
| 70 | July 2026 | 2026-07-15 | 2026-07-15 \| podcast \| The Pragmatic Engineer, "Context engineering with Dex Horthy" (Gergely Orosz, 1h33m, timestamps | 34: C0831, C0832, C0833, C0834, C0835, C0836, C0837, C0838, C0839, C0840 … | url | R05:read; R16:read; R19:read; R37:summarised; R39:read; R41:read … |  |
| 71 | July 2026 | 2026-07-14 | 2026-07-14 \| claim \| "killing the pull request": BigGo aggregator only (S); no primary post found https://finance.bigg | 1: C0092 | title | — |  |
| 72 | July 2026 | 2026-07-07 | 2026-07-07 \| podcast \| Mastra "Agents Hour", "The Software Factory: Dex Horthy on Shipping Fast Without AI Slop" (~23  | 5: C0881, C0882, C0883, C0884, C0885 | url | R23:summarised |  |
| 73 | July 2026 | 2026-07 | 2026-07 \| AI That Works #64 Agent Observability (07-07); #65 SOTA Coding Agent Benchmarks (07-14); #66 No Vibes Allowed | 53: C0697, C0698, C0699, C0700, C0701, C0702, C0703, C0704, C0705, C0706 … | episode date | R31:read; R32:read |  |
| 74 | June 2026 | 2026-06-30 | 2026-06-30 \| repo \| `design-control-loop` skill added by Kyle (K-Mistele), one of several Kyle-added skills (June 21–3 | 101: C0015, C0016, C0017, C0018, C0019, C0020, C0021, C0022, C0023, C0024 … | url | R02:read; R02:partial; R03:read; R40:read; R40:partial |  |
| 75 | June 2026 | 2026-06-26 | 2026-06-26 \| video \| "AI That Works: Building Your Own Software Factory" https://www.youtube.com/watch?v=485FGIq8LKM ( | 9: C0955, C0956, C0957, C0958, C0959, C0960, C0961, C0962, C0963 | url | R31:read |  |
| 76 | June 2026 | 2026-06-17 | 2026-06-17 \| thread/video \| HumanLayer launch video https://x.com/dexhorthy/status/2067286892786454855 (L). | 2: C0967, C0968 | url | R12:read |  |
| 77 | June 2026 | 2026-06 | 2026-06 \| AI That Works #60 Agents that Work in Any Language (06-02); #61 Hands-on with Fable 5 (06-09); #62 Product Sp | 38: C0955, C0956, C0957, C0958, C0959, C0960, C0961, C0962, C0963, C0969 … | episode date | R30:read; R31:read |  |
| 78 | June 2026 | 2026-06 | 2026-06 \| thread \| AI-generated specs and slop https://x.com/dexhorthy/status/2068004719298228236 (cited by the Pragma | 2: C0965, C0966 | url | R12:read |  |
| 79 | May 2026 | 2026-05-28 | 2026-05-28 \| podcast \| Screaming in the Cloud ep. 674 "Coding Agents, Chaos, and the Future of Dev Work" (Corey Quinn; | 12: C1012, C1013, C1014, C1015, C1016, C1017, C1018, C1019, C1020, C1021 … | url | R21:read |  |
| 80 | May 2026 | 2026-05-20 | 2026-05-20 \| podcast \| Qodo "Closing the gap: AI agent hype and production reality" https://www.qodo.ai/podcasts/closi | 22: C1025, C1026, C1027, C1028, C1029, C1030, C1031, C1032, C1033, C1034 … | url | R21:read |  |
| 81 | May 2026 | 2026-05-13 | 2026-05-13 \| repo \| dexhorthy/shannon: "Alternative to `claude -p` that lifecycles interactive sessions in tmux"; read | 2: C1062, C1063 | url | R07:read |  |
| 82 | May 2026 | 2026-05 | 2026-05 \| AI That Works #56 OpenAI tells you not to build your own harness (05-05); #57 "Code Mode" Deep Dive (05-12);  | 33: C1047, C1048, C1049, C1050, C1051, C1052, C1053, C1054, C1055, C1056 … | episode date | R29:read; R30:read; R34:read |  |
| 83 | May 2026 | 2026-04-24 | 2026-04-24 to 05-11 \| repos (dexhorthy) \| `executor` (fork), `better-github` (Apr 30), `gstack` (fork, Apr 24) https:/ | 1: C1086 | url | R07:read |  |
| 84 | April 2026 | 2026-04-20 | 2026-04-20 \| talk \| AI Engineer Miami keynote "Everything We got Wrong About RPI" (day 1, 9:40): adopting context engi | 28: C1095, C1096, C1097, C1098, C1099, C1100, C1101, C1102, C1103, C1104 … | url | R14:read; R15:read; R15:partial |  |
| 85 | April 2026 | 2026-04-27 | 2026-04-27 (session 04-21) \| video \| AI That Works #54 "Harness Engineering Without the Hype" https://www.youtube.com/ | 4: C1091, C1092, C1093, C1094 | url | R28:summarised |  |
| 86 | March 2026 | 2026-03-26 | 2026-03-26 \| newsletter/interview \| The Humans in the Loop deep dive "Making AI Agents Mainstream" (Heavybit): why RPI | 1: C1174 | url | R14:read |  |
| 87 | March 2026 | 2026-03-24 | 2026-03-24 (publication; recorded 2026-03-03) \| talk \| "Everything We Got Wrong About Research-Plan-Implement". Venue  | 34: C1102, C1304, C1305, C1306, C1307, C1308, C1309, C1310, C1311, C1312 … | url | R14:read; R14:summarised |  |
| 88 | March 2026 | 2026-03-23 | 2026-03-23 \| blog \| Long-Context Isn't the Answer (Kyle). See A3. | 6: C1185, C1186, C1187, C1188, C1189, C1190 | title | R08:read |  |
| 89 | March 2026 | 2026-03-22 | 2026-03-22 \| podcast \| Build Wiz AI Show "How to Ship Complex Features 10x Faster with AI Agents" (21 min) https://bra | 3: C1191, C1192, C1193 | url | R23:summarised |  |
| 90 | March 2026 | 2026-03-18 | 2026-03-18 \| repos \| humanlayer/skills created (`improve-claude-md`); dexhorthy/slopfiles ("curated list of coding age | 104: C0015, C0016, C0017, C0018, C0019, C0020, C0021, C0022, C0023, C0024 … | url | R02:read; R02:partial; R03:read; R07:read; R40:read; R40:partial |  |
| 91 | March 2026 | 2026-03-17 | 2026-03-17 \| article \| Heavybit "What's Missing to Make AI Agents Mainstream?" (the long-form interview the Substack r | 5: C1217, C1218, C1219, C1220, C1221 | url | R14:read |  |
| 92 | March 2026 | 2026-03-06 | 2026-03-06 \| video \| Latent Space "In-Context Cooking": "Why Your AI Agents Don't Work" / "The Problem With AI Demos"  | 13: C1286, C1287, C1288, C1289, C1290, C1291, C1292, C1293, C1294, C1295 … | url | R18:read; R18:summarised |  |
| 93 | March 2026 | 2026-03-04 | 2026-03-04 \| podcast \| AI Tinkerers "One-Shot" "How to Ship Complex Features 10x Faster with AI Agents" (Joe Heitzeber | 5: C1299, C1300, C1301, C1302, C1303 | url | R23:summarised |  |
| 94 | March 2026 | 2026-03-06 | 2026-03-06 onward \| threads (all L) \| "Software Factory Existential Risk" https://x.com/dexhorthy/status/2031394747869 | 15: C1171, C1172, C1173, C1211, C1212, C1213, C1214, C1215, C1216, C1232 … | url | R12:read |  |
| 95 | March 2026 | 2026-03 | 2026-03 \| AI That Works #47 PII Redaction (03-03); #48 Claude Agent Skills Deep Dive (03-10); #49 Prompt Injections Gua | 73: C1149, C1150, C1151, C1152, C1153, C1154, C1155, C1156, C1157, C1158 … | episode date | R14:summarised; R26:read; R27:read |  |
| 96 | February 2026 | 2026-02-17 | 2026-02-17 \| podcast \| Dev Interrupted (LinearB) "Dex Horthy on Ralph, RPI, and escaping the Dumb Zone" (Andrew Zigler | 18: C1374, C1375, C1376, C1377, C1378, C1379, C1380, C1381, C1382, C1383 … | url | R17:unreadable; R20:read |  |
| 97 | February 2026 | 2026-02-16 | 2026-02-16 (session 02-10) \| video \| AI That Works #44 "Agentic Backpressure Deep Dive" https://www.youtube.com/watch? | 22: C1400, C1401, C1402, C1403, C1404, C1405, C1406, C1407, C1408, C1409 … | url | R25:read; R25:summarised |  |
| 98 | February 2026 | 2026-02-15 | 2026-02-15 to 02-27 \| releases \| CodeLayer nightlies. See A4. | — | — | — | cross-reference to another inventory item (see that row) |
| 99 | January 2026 | 2026-01-26 | 2026-01-26 \| podcast \| The Infra Pod "Let's chat about vibe coding & Ralph!" (~42 min) https://podscripts.co/podcasts/ | 15: C1455, C1456, C1457, C1458, C1459, C1460, C1461, C1462, C1463, C1464 … | url | R22:read |  |
| 100 | January 2026 | 2026-01-16 | 2026-01-16/17 \| livestream \| Matt Pocock "LIVE: Chat with AI Coding Wizard Dex Horthy" (46 min; CodeLayer, the smart z | 6: C1477, C1478, C1479, C1480, C1481, C1482 | url | R23:summarised |  |
| 101 | January 2026 | 2026-01-19 | 2026-01-19 (session 01-13) \| video \| AI That Works #40 "Applying 12-Factor Principles to Coding Agent SDKs" https://ww | 2: C1483, C1484 | url | R24:read; R24:summarised |  |
| 102 | January 2026 | 2026-01-12 | 2026-01-12 \| repo \| humanlayer/claudelayer "Sub-agent recursion with Claude Code" (5 commits, 26 stars) https://github | 27: C0033, C0131, C1485, C1486, C1487, C1488, C1489, C1490, C1491, C1492 … | url | R07:read; R44:read |  |
| 103 | January 2026 | 2026-01-06 | 2026-01-06 \| blog \| A Brief History of Ralph. See A3. | 11: C1510, C1511, C1512, C1513, C1514, C1515, C1516, C1517, C1518, C1519 … | title | R08:read |  |
| 104 | January 2026 | 2026-01-03 | 2026-01-03 (text says Jan 1) \| video \| "Ralph Wiggum Showdown with Geoffrey Huntley" https://www.youtube.com/watch?v=S | 21: C1521, C1522, C1523, C1524, C1525, C1526, C1527, C1528, C1529, C1530 … | url | R17:read |  |
| 105 | January 2026 | 2026-01 | 2026-01 to 03 \| repos \| dexhorthy/kustomark-ralph-bash and -plugin (Jan 2 to Mar 9) (F). | 6: C1542, C1543, C1544, C1545, C1546, C1547 | url | R07:partial |  |
| 106 | June to December 2025 | 2025-12-09 | 2025-12-09 \| blog \| Context-Efficient Backpressure. See A3. | 12: C1575, C1576, C1577, C1578, C1579, C1580, C1581, C1582, C1583, C1584 … | title | R09:read |  |
| 107 | June to December 2025 | 2025-12-03 | 2025-12-03 and 2025-10-08 \| edits \| `ace-fca.md` updated. See A2. | — | — | — | cross-reference to another inventory item (see that row) |
| 108 | June to December 2025 | 2025-12-02 | 2025-12-02 \| talk \| "No Vibes Allowed", AI Engineer Code Summit (Nov 2025); recap https://www.startuphub.ai/news/ais-c | 1: C1589 | url | R16:read; R16:summarised; R18:read; R24:read; R26:read; R27:read … |  |
| 109 | June to December 2025 | 2025-11-26 | 2025-11-26 \| repo \| humanlayer/mcp-cli (one commit) https://github.com/humanlayer/mcp-cli (F). | 1: C1633 | url | R07:read |  |
| 110 | June to December 2025 | 2025-11-17 | 2025-11-17 \| customer story (Anthropic's, not his). See A4. | — | — | — | cross-reference to another inventory item (see that row) |
| 111 | June to December 2025 | 2025-10-28 | 2025-10-28 \| video \| AI That Works "Ralph Wiggum Under the Hood: Coding Agent Power Tools" (with Geoff Huntley) https: | 26: C1687, C1688, C1689, C1690, C1691, C1692, C1693, C1694, C1695, C1696 … | url | R17:read; R37:summarised |  |
| 112 | June to December 2025 | 2025-10-16 | 2025-10-16 \| video \| "No Vibes Allowed: Live Coding with AI Agents" https://www.youtube.com/watch?v=zNZs19fIDHk (L). | 35: C1503, C1681, C1718, C1719, C1720, C1721, C1722, C1723, C1724, C1725 … | url | R18:read; R37:summarised |  |
| 113 | June to December 2025 | 2025-09 | 2025-09 \| milestones \| HumanLayer #1 on GitHub Trending https://x.com/dexhorthy/status/1971963973332525187 (L). Thread | 2: C1818, C1819 | url | R12:read |  |
| 114 | June to December 2025 | 2025-08-29 | 2025-08-29 \| essay \| "Getting AI to Work in Complex Codebases" (`ace-fca.md`); HN 2025-09-23 https://news.ycombinator. | 15: C1756, C1757, C1758, C1759, C1760, C1761, C1762, C1763, C1764, C1765 … | url | R05:read; R38:read |  |
| 115 | June to December 2025 | 2025-08-25 | 2025-08-25 \| talk \| YC Root Access. See A2. | 10: C1808, C1809, C1810, C1811, C1812, C1813, C1814, C1815, C1816, C1817 | title | R16:read |  |
| 116 | June to December 2025 | 2025-08-20 | 2025-08-20 \| claim \| CodeLayer introduced as a private beta at a YC talk (S; date unconfirmed). | — | — | — | descriptive line in the inventory, not a source |
| 117 | June to December 2025 | 2025-08-06 | 2025-08-06 \| talks \| MLOps Community "Agents in Production" and AI That Works #17. See A1 and A2. | 10: C0066, C1824, C1825, C1826, C1827, C1828, C1829, C1830, C1831, C1832 | title | R16:read |  |
| 118 | June to December 2025 | 2025-07-17 | 2025-07-17 \| repo \| 12-factor-agents "workshop stuff" commits (F). | 7: C1867, C1868, C1874, C1875, C1876, C1877, C1894 | url | R07:read |  |
| 119 | June to December 2025 | 2025-06 | 2025-06 \| origin \| Ralph first seen at a June 2025 SF meetup, per Dex (Jan 2026 blog; Dev Interrupted). | — | — | — | descriptive line in the inventory, not a source |
| 120 | (C) Follow-ons and coverage by oth | 2025-06-23 | Harrison Chase / LangChain, "The rise of context engineering", 2025-06-23: cites 12-Factor Agents https://www.langchain. | 34: C0831, C0832, C0833, C0834, C0835, C0836, C0837, C0838, C0839, C0840 … | title | — |  |
| 121 | (C) Follow-ons and coverage by oth | 2025-06-25 | Latent Space AI News, "Context Engineering: Much More than Prompts", 2025-06-25 https://latent.space/p/ainews-legacy-25- | — | — | — | follow-on by others; not a source of ideas |
| 122 | (C) Follow-ons and coverage by oth | 2025-09-24 | Trey Causey, "Getting AI to Work in Complex Codebases", 2025-09-24 https://www.treycausey.com/commonplace/2025-09-24-git | 47: C1612, C1756, C1757, C1758, C1759, C1760, C1761, C1762, C1763, C1764 … | title | R05:read; R38:read |  |
| 123 | (C) Follow-ons and coverage by oth | 2025-08 | Aaron Levie shout-out, ~2025-08/09 https://x.com/levie/status/1962319895070458241 (L). | — | — | R41:not-by-dex | follow-on read for critique; no critique card |
| 124 | (C) Follow-ons and coverage by oth | 2026-02-22 | Tyler Burleigh, "Research, Plan, Implement, Review", 2026-02-22 (adds per-phase review) https://tylerburleigh.com/blog/2 | 7: C1367, C1368, C1369, C1370, C1371, C1372, C1373 | url | R04:read; R38:read; R41:read; R44:read |  |
| 125 | (C) Follow-ons and coverage by oth | 2026-03-26 | Alex Lavaee, "From RPI to QRSPI" (undated, after 2026-03-26) https://alexlavaee.me/blog/from-rpi-to-qrspi/ (F). | 1: C1147 | url | R14:partial |  |
| 126 | (C) Follow-ons and coverage by oth |  | agent-brain wiki, QRSPI concept page https://cussid-huaz.github.io/agent-brain/concepts/ai/qrspi/ (F). | 1: C1148 | url | R14:partial |  |
| 127 | (C) Follow-ons and coverage by oth |  | Community QRSPI repos (reconstructions, not official): ebullient/modified-qrspi (F) https://github.com/ebullient/modifie | — | — | — | follow-on by others; not a source of ideas |
| 128 | (C) Follow-ons and coverage by oth |  | Turing Post, "Agentic Coding: RPI, Context Engineering & Subagents" (403) https://www.turingpost.com/p/aisoftwarestack. | — | — | — | follow-on by others; not a source of ideas |
| 129 | (C) Follow-ons and coverage by oth | 2026-07-20 | Addy Osmani, "Software Factories, Light and Dark", 2026-07-20 https://addyosmani.com/blog/software-factories/ (F). | — | — | R38:read | follow-on read for critique; no critique card |
| 130 | (C) Follow-ons and coverage by oth | 2026-07-27 | Hungry Minds newsletter, 2026-07-27 https://hungrymindsdev.substack.com/p/software-factories-harnessing-loops (F). | — | — | R38:read | follow-on read for critique; no critique card |
| 131 | (C) Follow-ons and coverage by oth | 2026-08-06 | DarkFactory.dev, 2026-08-06, "Dex Horthy retracts Research-Plan-Implement" https://darkfactory.dev/news/2026-08-06-morni | 9: C1367, C1368, C1369, C1370, C1371, C1372, C1373, C1509, C1715 | title | R04:read; R38:read; R41:read; R44:read |  |
| 132 | (C) Follow-ons and coverage by oth | 2026-07-03 | Latent Space (Richard MacManus), AIEWF Daily Dispatch, 2026-07-03 https://www.latent.space/p/aiewf-daily-dispatch-locomo | 3: C0897, C0898, C0899 | url | R18:read; R18:summarised; R38:read |  |
| 133 | (C) Follow-ons and coverage by oth | 2025-12-03 | StartupHub.ai, 2025-12-03 recap (F). | 1: C1589 | title | R16:summarised |  |
| 134 | (C) Follow-ons and coverage by oth |  | Mastra 12-factor examples jagreehal/mastra-12-factor-examples (L); Harrison Chase's response thread https://x.com/hwchas | — | — | — | follow-on by others; not a source of ideas |
| 135 | (C) Follow-ons and coverage by oth |  | Upstream sources Dex builds on: Geoff Huntley's Ralph https://ghuntley.com/ralph/; SlopCodeBench (arXiv 2603.24755; runn | — | — | — | follow-on by others; not a source of ideas |
| 136 | (C) Follow-ons and coverage by oth | 2026-07-28 | Tessl "Inside the Dark Factory" (2026-07-28) does NOT involve or cite Dex https://tessl.io/podcast/116/ (F). | — | — | — | follow-on by others; not a source of ideas |
