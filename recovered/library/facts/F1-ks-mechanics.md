# F1: Knowledge-store design mechanics (fact sheet)

Source: KNOWLEDGE-STORE-DESIGN-2026-11.md (v1.3.1), "KS" below. Line numbers are lines of that file. Labels: [M]=measured, [E]=estimate/inferred, [T]=target/pass bar, [G]=guess/owner parameter. The design itself labels most cost numbers "inferred; owner parameters" (L474).

## 1. Benefit, cost and the numbers behind them

- Stated benefit: a cheap agent finds a solved problem, runs the entry's check, and reuses the fix instead of a Fable or Opus session re-deriving it (L9). Memoization with invalidation, not a cache of answers (L85).
- Scope of what is cached: diagnosis path, negative results, fix, check. Not whole solves. In Opus-reserved areas "the store has saved the diagnosis, not the whole solve" (L444, L690).
- Recurrence prior [M, disputed]: 48 fix-prefixed commits on main; 3 to 5 same-cause repeats depending on count (L43, L544); at least five by commit-body reading, plus ex8's stranded fix (L795). `git log --all` shows 72 fix commits (L795). Whether a store beats `git log --grep` and CLAUDE.md on those repeats is stated as "unproven" (L45, L544). KS-0 audit counts only repeats a store could have served (L560).
- Historical solve cost avoided (S): "no historical prior"; every fix commit in history is top-tier, so S is measured only by the prospective log at KS-9 (L544, L561).
- Break-even formula (L690, X-05 F25): net saving per hard encounter = h*(S - L_hit) - (1-h)*L_miss - W/E.
  - h = verified-hit rate (prior from KS-0, measured at KS-5).
  - S = top-tier solve cost avoided (unknown until KS-9; smaller than a whole solve in Opus-reserved areas).
  - L = cheap lookup-plus-verify cost, including the round trip's cache reads.
  - W = build cost, "about ten sessions".
  - E = number of encounters it is amortised over.
  - L690: "the store repays itself only through h*S". The audit, pilot and checkpoint "are the whole decision".
- Per-lookup cost (L476, L304) [E unless marked]:
  - Formula: caller context x (1 - cache-hit rate) + output (about 0.4 tokens per character + 55) + any subagent dispatched.
  - Dominant term is the API round trip re-reading caller context as cache reads, not the output. A subagent starts above 63k prompt tokens; the main session reads hundreds of thousands per call late in a phase.
  - Output cap 2,000 characters, about 860 tokens [M 0.4 tokens/char]. A miss prints one line, about 70-90 tokens.
  - Each `--diff` run about 170-220 ms wall [M]; 0.2-0.3 s per run (L447).
  - Step-zero lookup with native verify: 2-3 extra turns in the escalating session. Docker verify: 1-5 minutes wall.
- Per-phase cost [E]:
  - A quiet phase pays three unconditional `--diff` session turns (first commit, PR-ready, inside `ks close`) plus one Opus reviewer call (L476, L528).
  - A phase that records adds 5-10k Opus author tokens if the solver is Opus, or a fresh Opus subagent start (above 63k prompt tokens) if the solver was Sonnet or main; plus 2-4k Opus reviewer tokens; 10-20 minutes (L476).
  - Skill description rides every API call of every agent with the Skill tool: about 620 tokens at the 1,536-char ceiling, so held to 300-400 chars (L440).
  - CLAUDE.md is about 7.5k tokens injected into every agent (L59); the store's pull-only design avoids growing that.
- Build cost [E]: to the stop point about six sessions (KS-0 small, then KS-1..KS-5; about half Opus; Opus implements KS-1 and KS-3; Sonnet elsewhere; every PR Opus-reviewed) (L43, L690). After a go, five more (KS-6a, 6b, 7, 8, 9), two in Docker (L43). "About 15M subagent tokens" were spent producing the design itself (L3).
- Pilot pass bar KS-5 "go" [T, D8, L617, L707]: recall at shown >= 60 %; zero acted false positives over the lead-capable entries in 40+ probes (at least 20 blind positives, at least 40, target 60, negatives/stale probes, L615); a win over both incumbents (grep over CLAUDE.md/docs; `git log --all --grep`) at equal precision; the diff arm catches every planted forbidden diff with union warning rate on replayed first-parent commits at or below one commit in ten (owner parameter; v1.3 rule measured 48.7 %, 27-44 % with strict handles).
- go-minimal / stop: go-minimal keeps the declarative class only and skips KS-6a, 6b, 8 (L617). Stop leads to KS-T teardown.
- Kill criteria (D8, L707): fewer than 3 verified hits at KS-9; any acted false positive that reached a merged change; either incumbent matching the store. KS-9 checkpoint at 20 logged encounters or 8 weeks after KS-7 (L669).
- Starting thresholds [G, owner parameters]: theta_lead 0.5, theta_cand 0.3, mu 0.2, trigram fragment >= 12 chars (L309). Frozen at KS-4, never changed by KS-5 (L309, L507). Calibration data is the seed itself.
- Statistical note (L546): "0 in 40 means 7.5 % or less" (rule of three).
- Embedding trigger D16 (L715): needs k >= 3 reviewer-agreed vocabulary-class misses on >= 3 distinct entries among n >= 10 examined lookups, with 95 % Clopper-Pearson lower bound >= 5 %. Expected k per 8-week window at this repo's prior is "below about 0.2", so not expected to fire before KS-9 (L522, L715).
- Compliance/hook: the store is pull-only; no hook in v1 (L440). Compliance (escalations made without a lookup) is self-reported (L480, L548).
- Early-value claim (L41, L520): build/deploy trap checks (no Docker) carry the realistic v1 value. "Docker test-id gate largely duplicates CI for ex1, ex5, ex6" (L524).

## 2. Who may do what

- Any tier: `ks lookup`, `verify`, `show`, `outcome`, `claim/attempt/release` (L430-436). Cheap agents "append only mechanical events" plus proposals (L350).
- Opus only (approver is not author): `record`, `capture`, `control`, `approve/reject`, `revise/supersede/withdraw`, `accept-handle` (L437). Revisions need an Opus actor and a different Opus approver; Fable judges conflicts; owner never repairs entries (L350).
- Writer identity is self-declared (`--by`); "approver is not author" is policy plus PR review, not a control (L350, L549).
- Recording trigger: a solve that needed a tier escalation, 2+ failed approaches, or a burned build/deploy, or establishes a do-not-apply fact (L452). Recorded by the solving session (Opus; or a fresh Opus subagent if the solver was Sonnet).
- After a hit (L444): the escalating session dispatches a cheap agent to `ks verify`. On `applies`, a cheap agent applies the fix only outside areas the ship plan's Routing reserves to Opus: outbox, migrations, auth, PIN, money, job lifecycle. Inside them, Opus applies it "with the diagnosis in hand".
- On a miss: `ks claim`, escalate, pass only the lookup id in the brief (L444).
- Nothing acts until `ks verify` returns `applies`; the fix text is withheld by the CLI until then (L305, L434), except `do_not_apply` entries whose prohibition and safe alternative are always shown (L434). Withholding is a CLI behaviour, not a lock (L525).
- A diff warning never applies anything; it hands the question to the PR's Opus reviewer (L36). Reviewer must quote the lookup line and rule on each warning (L470).
- Fable never implements; judges disputes (L458). Owner confirms only do-not-apply entries that encode an owner decision (L458).

## 3. Which entries can return "applies"

- Entry kinds (L239): defect, trap, do_not_apply, open_defect, rule_without_case.
- Check kinds (L268): declarative json_predicate, regex_in_span, ordered_in_span, duplicate_values, path_state, dep_version (run over git blobs; nothing stored is executed); test ids pytest/jest/vitest (Docker); db_probe (throwaway Postgres); scripted (off by default, D18, L717).
- Declarative `applies` only where the matched value is itself the root cause: a data or config value (ex7 empty env string, ex2a duplicate revision id, a dep pin). For code-behaviour entries no text probe may return `applies`; at most candidate plus evidence; absence-of-guard probe at most inconclusive (L272).
- Before the pilot probes read parsed data only (L273); code-token reading waits for KS-6b under D5b.
- Candidate-only classes: entries with `prod_db` discriminator (ex2b, ex2c; L279), `pending_anchor`/`fixed_off_main`, provisional, suspect, conflict, unverified_seed, ambiguous templates, dense-only hits (L302, L304). Prose alone yields at most a candidate (L260).
- `do_not_apply` can return `applies` only in `proposed_change` mode when the protective test fails on the proposed tree (executable half, KS-6b); otherwise stop or inconclusive (L276).
- Worked examples (L281): lead-capable declaratively: ex7, ex2a, ex8 (with conjunctive probe plus Gradle-log template). ex1, ex5, ex6 only through pytest/Jest ids (need Docker, stored `unverified_seed` until KS-6b, L499). ex4 candidate-only until db_probe and a unit test exist. ex3 is an open_defect tied to ship phase P12a. ex2b, ex2c candidates.
- Seed shares (L488-495): about 20 solved entries, 21 traps, some 60 negative results, plus 8 worked examples (about 15 entries after splitting). "After the refuters only ex7, ex2a and (with its conjunctive probe) ex8 are lead-capable without Docker" (L495). Roughly 128 open defects stay in the register (L495). No percentage split by check kind is stated. At pilot time the report must state the number of lead-capable entries (L615).
- Gate limit (L518): the check proves a condition is present, not that it caused today's symptom; wrong hits remain possible and are counted.

## 4. Bindings to this repo / this machine

- Store home `C:\Users\User\.fixflow-ks\store` (journal) plus `index/`, `local/`, `tmp/`, `gate/`, `artifacts/` (L224, L701). Must not be under AppData, OneDrive, UNC, bind mount, WSL /mnt/c, or any work tree; `ks doctor` refuses (L438).
- Machine bindings: Windows 11, Node 24, SQLite >= 3.51.3, `node:sqlite` (Stability 1.2), Docker Desktop, Git Bash, antivirus named by doctor (L129, L229, L438, L532). NTFS rename behaviour measured (99-126 failures per 8x1,000 events, L229).
- Footprint item types (L285): file_blob, symbol_span (KS-6b+), config_key, dep_version, env (node, python, Docker image digest, OS), tool_resolution, doc_anchor, precondition, guarded_refs (optional, D22). Tiers fix_diff, check_input, env_probed, tool_reported, read, executed.
- Control pairs `fails_at`/`passes_at` are full 40-hex mainline commit shas of this repo (L276). Trace is a digest of footprint items when controls last flipped on the target (L285). Refs are mainline shas and blob OIDs, register ids, PR numbers (L245).
- Handles built from this repo: paths relative to repo root, `ctx` includes cwd (e.g. `railway up --ci @ repo-root`), `doc_ref` pins a doc blob OID, `ident` handles named per entry and checked against the last ~150 first-parent commits of origin/main (>5 % fire rate refused) (L261, L259, L262).
- Seed content is entirely FixFlow material: CLAUDE.md, HANDOFF, G2, HARNESS-REVIEW, W2 designs (L486-493). Fixtures are cut from this repo's own files and traps (L274, L301).
- Sync: private git repo, committed and pushed over SSH only to an owner-controlled bare repo (VPS user `ks`, git-shell), a code allow-list refuses github.com (L224, L712). VPS does not exist until ship phase P3b (L659). No off-box copy before then (L713).
- Privacy/scrub (L354, L550): scrubs secrets, tokens, DB URLs, PK mobile numbers, CNIC, emails, user-profile paths. Names and addresses are not detectable; a structural rule forbids storing raw production data; a customer-name known-miss fixture documents this. Everything an agent reads reaches Anthropic (D7, L706). Raw symptom text stays in the store home; only scrubbed aggregates enter the repo (L550, L561).
- CLI lives in the repo (`tools/ks`); old worktrees run old CLIs; version-keyed index; `cli_outdated` refusal (L526). Net-zero CLAUDE.md edit (L509).

## 5. How an entry is found

- Lookup triggers (L444-447): before escalating a defect/gate/build error to a higher tier (Haiku or Sonnet to Opus; Fable to Opus); before retrying a failed build or deploy; before applying a fix a prose register prescribes (`--prescription`); a cheap agent's unexpected gate error; `--diff` four times per code phase (first commit, PR-ready, Opus review, `ks close`). Not push; nothing injected (L35).
- Handle kinds, eight (L254-264): tmpl (canonical template; ambiguity flag), sig, frames, ctx, prose (paraphrases written at record time), ident, doc_ref, action, plus not_when discriminator. Each lists its failure mode.
- Pipeline (L301-305): canonicalise and scrub, prefilter on exact handles and facets, FTS5 BM25 rank (three tables), abstain on score-free features. Coverage = IDF-weighted share of query terms matched; margin = coverage gap to second place. Lead needs strong exact hit AND coverage >= theta_lead AND margin >= mu AND validated status AND no unmet precondition. Candidate needs coverage >= theta_cand or any exact handle. Everything else is a miss. Shown: at most one lead and one candidate, 2,000-char cap.
- No embeddings in v1; "no evidence either way at this scale" (L322). Lexical only: a symptom with no word in common is a miss (L522).
- No-error-text problems: `prose` paraphrases (written by solving agent, including silent symptoms) and `action` handles (L260, L263). Zero vocabulary overlap is a miss; safe for solved entries, counted for do_not_apply/open_defect (L260). Silent code-edit hazards reached by `--diff`; silent operator-action hazards (dispatcher env flip, cursor reset, snapshot restore) "reached only by the wording-based `action` handle" (L522).
- Problems the agent does not know it has: only the diff arm (do_not_apply, open_defect, trap entries) is recall-first (L35, L93). `--diff` sees identifiers on changed lines; it misses untracked/gitignored files, state outside git, 100 % renames, binary files (L358). 6 of 45 ship-plan phase sections name a repository file; 12 of 45 have a Goal line (L432, L447).
- Missed-existing is a lower bound; misses in sessions that never record are invisible; escalations without a lookup and exit 3/4/5 lookups are undercounted (L334, L522).
- Exits 3 (unavailable), 4 (busy), 5 (not run): for solved entries "no answer, proceed as today"; on diff/prescription routes reported as "diff check not run" (L432).

## 6. Staleness, repair, retirement

- Invalidation is event-driven, never time (L340): footprint digest differs; dependency/platform change; recipe, runner or scrub version change; refuted or controls_broken; superseded; doc_ref blob change; anchor unreachable; precondition never recorded. No TTL, no sweep.
- Mechanism (L344-345): lazy recompute at lookup/verify; changed item marks the entry suspect for this caller, capped at candidate. Early cutoff: if controls still flip and preconditions hold, `reaffirmed` re-stamps. At phase close `ks close` re-runs every validated declarative probe at origin/main and labels PRESENT as "fix not on main" or "regression".
- Not detectable (L358): remote-resolver changes (EAS, Railpack, Meta API), floating tags, untracked deps, races, production data state, semantic changes outside the footprint, whether a text pattern caused the symptom.
- Repair (L350): revisions by Opus actor, approved by a different Opus; Fable judges conflict; mechanical events by cheap agents. Repair tier = Opus.
- Retirement by status, never delete (L246). Promotion of a validated probe into the repo's own CI (D17, L716) is the ITIL permanent fix; the design does not state the effect on corpus size.
- Corpus-size effects stated: Railway traps retire after the VPS move, discounting the prior (L561). CLAUDE.md trim after pilot moves narratives of verified entries into the store (L509). No sentence quantifies how many entries leave via promotion or retirement.

## 7. Corpus size and the write rule

- Workload (L123): "a seed corpus in the low hundreds of candidate rows, of which a few dozen are genuine solved entries today; a few new entries per phase over about 40 phases". Seed table 270 rows (L486-493): about 20 solved, 21 traps, about 60 negatives, plus 8 examples (about 15 entries). Seeding after KS-4 is lazy, never bulk (L501).
- Growth: "a few new entries per phase", writes "a handful per phase" (L123-124). Size checkpoint at about 1,000 entries triggers threshold recalibration only (L309). Journal compaction planned before about 20,000 events (L229); lookups, not entries, dominate event growth.
- Write rule (L452): record only if a hard solve needed an escalation, 2+ failed approaches, or a burned build/deploy, or establishes a do-not-apply fact. Routine fixes are not recorded. Recording is "never part of a phase's Done-when". Open defects without a diagnosis stay in the register. Negative results must carry a validity footprint or are not stored (L502). Write gate: scrub, near-duplicate (Jaccard) check, missed-existing check, negative-corpus precision check, self-match refusal, mainline sha, control pair, Opus approval. LLM extraction after the fact is rejected (L454).

## 8. Honest limits admitted in section 9 (one line each)

1. Root causes outside the repo (EAS cloud, Railpack, Supabase pooler, OEM) are capped at inconclusive and need the owner to paste logs.
2. Races and data-state causes are candidates only, verified by a race test or operator query.
3. Untracked dependencies: an unchanged footprint is necessary, never sufficient.
4. The gate proves a condition, not a cause; a co-present cause passes and the problem persists.
5. Test artifacts are produced by code under test, so conftest/hooks can fake or hide a failure.
6. Checks cannot run on the dev box without Docker; native Android compile is gated nowhere; Jest/Vitest report no phase.
7. Symptoms mislead (`railway up --ci` timeout, alembic CommandError, EAS_BUILD_UNKNOWN_GRADLE_ERROR).
8. Lexical retrieval only; zero-overlap phrasing is a miss; missed-existing is a lower bound.
9. The do-not-apply class is only as good as its diff arm; forbidden changes outside protective-test code are missed.
10. Docker test-id gate largely duplicates CI for ex1, ex5, ex6.
11. Fix withholding is a CLI behaviour, not a lock.
12. CLI version skew across worktrees and branches without `tools/ks`.
13. Quiet phase still costs three cheap turns plus one reviewer call.
14. Owner upkeep: Node-upgrade ritual, never-do list, `node:sqlite` is a release candidate.
15. The clinic project's month of harness research found no measurable gain from added context machinery.
16. Evidence gaps: that lookups would have served real repeats; that Haiku/Sonnet benefit; thresholds (no literature); that pilot recall transfers; compliance; writer identity is self-declared; egress to the model provider is unavoidable.

## 9. Reuse across projects, repositories, sharing, portability

The design says nothing about reuse across projects or other repositories. Sections checked: 0, 1, 3, 4, 5, 7, 8, 9, 10, 11, plus keyword grep over the whole file (portab, reusab, other repositor, other projects, cross-project, multi-repo, transfer, generalis). Hits were only: the owner's "other project" (the clinic harness research, used as a warning, L45, L538) and "reusable idea" about engine design (L169). Related facts that point the other way: the store is "for the agents working on FixFlow" (title L1); single-tenant today (CLAUDE.md, not KS); everything is mirrored only to the owner's own VPS and never to GitHub (L39, L224, L712); the allow-list refuses unlisted remotes (L224); footprints, control pairs and handles are bound to this repo's commits, paths and blobs (section 4 above). Sharing the store with other people is not addressed; D7 limits egress to the model provider. No entry schema field for a project id exists in the sections read (shop-level tenancy is not mentioned). Treat as silent.

## 10. Cheaper model tiers and reasoning effort

- Design intent: Haiku or Sonnet escalating to Opus is the trigger for lookup (L444). Cheap agents verify and apply fixes outside Opus-reserved areas (L444).
- Roles for cheaper tiers: Sonnet implements and writes tests/skill/checklists; Haiku and Sonnet agents act as the "cheap consumer" in the pilot (L615).
- Stated evidence gap (L545): "That a Haiku- or Sonnet-class agent benefits from a gated hit" is not established; "smaller models can fall below baseline with memory, and agents comply with wrong memories" (M-02 24, 28, 30; Dynamic Cheatsheet, L185). Hits are advisory and gated. The with/without comparison is KS-9's, not the pilot's.
- Reasoning effort: the design never discusses reasoning effort as a variable. "xhigh" appears only as the effort of the Opus judges/refuters used to produce the design (L3, L780, L903).
- Nothing states that a Sonnet with a hit matches Opus. The claim is narrower: a cheap agent can verify a check and, outside reserved areas, apply a fix; Opus still applies it inside reserved areas (L444).
- Money is reported in tokens; the design keeps a "dated price table applied only at analysis" (L326); no price ratios appear in the sections read.
