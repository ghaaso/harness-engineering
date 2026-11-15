# judge:1

```json
{
 "lens": "Skeptical of machinery. One developer with ADHD runs this for years, so every service, file, ritual, dependency and owner decision counts as a cost. I prefer the design that fits into the routine that already exists (pull-only lookup, PR journal, Opus reviewer, phase close), and I punish anything someone has to remember. I am just as hard on safety gaps, because a false positive is the dangerous failure.",
 "scores": [
  {
   "proposal": "A: kb: one SQLite file behind a gated CLI",
   "criteria": [
    {
     "name": "false-positive safety",
     "score": 9,
     "reason": "Strongest of the four. The fix stays hidden until an applies verdict for that lookup. A guard_presence check can never return applies. A test check counts only if it fails in the call phase with the root-cause template [M-03.F07; X-02.F01]. Unknown query terms count at max IDF. A schema CHECK enforces author != approver. Only the self-declared identity keeps it below 10."
    },
    {
     "name": "invalidation soundness",
     "score": 9,
     "reason": "Typed footprint items with provenance tiers, trace recomputation on demand, early cutoff with the control pair re-run when an entry is suspect [T-01.F01,F02], remote resolvers flagged, an explicit list of what it cannot detect, and no TTL."
    },
    {
     "name": "one-developer operational cost",
     "score": 6,
     "reason": "No installs and no service. But it has two backup layers with a retention rule (7 snapshots plus monthly), a new path-filtered CI workflow, 16 owner decisions, two phase-close rituals (anchor, backup), and a stage-0 to stage-1 switch that changes which copy is the truth partway through the store's life."
    },
    {
     "name": "egress posture",
     "score": 9,
     "reason": "Pushes only over SSH to a remote the owner controls, never GitHub [X-01.F28]. Scrubs at write and at return with typed placeholders, keeps the rule against storing production data, and keeps real-sample fixtures out of the code repo. The remote allow-list is not enforced in code."
    },
    {
     "name": "agent access simplicity",
     "score": 8,
     "reason": "One Bash CLI with a machine-parsable first line and exit 3 meaning 'treat as a miss'. Lookup output is capped at 2,000 characters, and mechanical verbs need no actor flag. About 35 verbs is still a large surface for a skill to steer."
    },
    {
     "name": "provenance and history completeness",
     "score": 9,
     "reason": "Append-only events guarded by triggers, immutable versions, negative_result rows with failure classes, do_not_apply as a first-class kind, cost fields that are NULL when unknown [RT-06], and scrubber/recipe stamps. Evidence is mainline-only and it explicitly drops the branch-only a6f9048, which I confirmed is not an ancestor of origin/main."
    },
    {
     "name": "migration and seed feasibility",
     "score": 8,
     "reason": "About 15 entries come from the eight examples, each with a check and a control pair, and four gates run now without Docker. Seeding stops at K5, the prose contradictions go into a docs PR (KS-R9), and CLAUDE.md is trimmed only after the pilot."
    },
    {
     "name": "concurrency safety",
     "score": 9,
     "reason": "One write path in BEGIN IMMEDIATE with idempotent INSERT OR IGNORE on content ids, occ on the fold, and a conflict status instead of last-writer-wins [T-06.F26]. Claims carry fencing tokens (KS-R5), journal files merge as pure adds [X-01.F20], and it refuses SQLite older than 3.51.3 [T-06.F5]."
    },
    {
     "name": "fit to scale",
     "score": 5,
     "reason": "About twenty tables, 21 event kinds, Lamport clocks, a price table, a blob table, and three FTS tables plus two vocab tables, all for tens to hundreds of entries. That is more schema and code than the workload needs."
    },
    {
     "name": "swapability",
     "score": 8,
     "reason": "The interface is async from day one, journal replay is the migration path with a fold-equality test, and the leaks are named (FTS5's fixed bm25 constants; porter stemming 'eas' to 'ea')."
    },
    {
     "name": "honesty of limits, pilot and kill criterion, cost per phase",
     "score": 8,
     "reason": "K0 recurrence audit, K5 blind replay with a grep arm, a Step-2 kill rule, rule-of-three bounds, and inferred numbers labelled as owner parameters (KS-R10). It has no break-even estimate for its own build cost."
    },
    {
     "name": "program fit",
     "score": 7,
     "reason": "K-phases never gate a ship phase and respect the Docker gate slot and the Appendix-A container names. But it adds a new .github workflow, has ten phases including an L-sized K3b, and its phases lack the plan's Goal, Deliverables and Owner-inputs fields."
    }
   ],
   "total": 95,
   "fatal_flaws": [],
   "best_ideas_to_graft": [
    "Withhold the fix text until an applies verdict exists for that lookup. Show dead ends under an UNVERIFIED banner even on a candidate.",
    "Check strength rule: a guard_presence probe can never return applies for a code-behaviour entry, only inconclusive(weak_check_only).",
    "present_when template: a test check counts as PRESENT only if the named test fails in the call phase with a message matching the root-cause template, not merely if it fails.",
    "Verify a dirty worktree through a `git stash create` snapshot (a commit object that leaves the shared stash list untouched) instead of returning inconclusive. This git behaviour is not in the register.",
    "Stream the target tree into the container with `git archive` into a tmpfs, so the container gets no host bind mount at all.",
    "`anchor --pr <n>` after the squash merge, re-pointing the control pair at the mainline squash commit.",
    "Exit-code contract: 0 whenever the store answered, 3 when it is unavailable, callers treat 3 as a miss; the first output line is machine-parsable.",
    "Unknown query terms stay in the coverage denominator at max IDF.",
    "Recording an entry is never part of a phase's Done-when."
   ]
  },
  {
   "proposal": "B: ks on a separate Postgres container",
   "criteria": [
    {
     "name": "false-positive safety",
     "score": 7,
     "reason": "The gate design is excellent: probe-in-lookup, inject-control, a negative-corpus check, and a fresh gate per act. But the lookup card prints 'do-this' before any gate runs [M-02.28], and coverage divides by in-corpus terms only, the false-tie hole C demonstrated."
    },
    {
     "name": "invalidation soundness",
     "score": 8,
     "reason": "Drift is computed at lookup and in a phase-close sweep, inject-control proves the check can still fail at reaffirm, and undetectables are named. v1 hashes whole files only."
    },
    {
     "name": "one-developer operational cost",
     "score": 2,
     "reason": "A persistent Postgres container tied to Docker Desktop with AutoStart off [E-03.F21], three role passwords in a profile folder, pg_dump retention, digest-pinned images, a self-installed CLI copy, image builds and hand-written plpgsql ranking. That is the second stateful service E-03 calls unjustified."
    },
    {
     "name": "egress posture",
     "score": 7,
     "reason": "No network and no published port, never GitHub, and good scrubbing. But stage 2 puts a store container on the production VPS, and the role passwords sit on disk."
    },
    {
     "name": "agent access simplicity",
     "score": 5,
     "reason": "Every lookup returns store_unavailable unless Docker is running. Agents also need a KS_TIER convention and a materialised CLI copy. The output bounds are fine."
    },
    {
     "name": "provenance and history completeness",
     "score": 9,
     "reason": "Forks tracked as a parents DAG, gate_wrong counted separately from refuted, attempts recorded against claims, and an explicit promotion to the mainline squash SHA."
    },
    {
     "name": "migration and seed feasibility",
     "score": 8,
     "reason": "All eight examples fit, the ex1, ex2a, ex7 and ex8 probes need no Docker, and an overlay control is rejected when the overlaid test imports a symbol the fix introduced. Yet even those Docker-free probes are unreachable while the store container is down."
    },
    {
     "name": "concurrency safety",
     "score": 7,
     "reason": "Engine-level locking is sound, and writing the journal first loses nothing. But consistency spans two systems (journal and Postgres), with journal commits under an advisory lock or a git index.lock retry."
    },
    {
     "name": "fit to scale",
     "score": 2,
     "reason": "A database server for a few hundred rows is what E-03 rejected: 'does not justify a second always-on stateful service'."
    },
    {
     "name": "swapability",
     "score": 6,
     "reason": "The journal is engine-neutral, but the fold, transition and lookup rules live in plpgsql and must be rewritten on any swap. Role enforcement has no SQLite equivalent."
    },
    {
     "name": "honesty of limits, pilot and kill criterion, cost per phase",
     "score": 8,
     "reason": "Admirably candid ('costs more than it returns'), with a measurable kill on store unavailability (LB8). It still recommends the costly shape."
    },
    {
     "name": "program fit",
     "score": 4,
     "reason": "It contradicts the engine KS-R1 names. The store is useless in any phase that does not start Docker, which agents may not do. Its hook adds guard, drift, sync, promote and PR-journal verdict lines to every phase."
    }
   ],
   "total": 73,
   "fatal_flaws": [
    "The store is down whenever Docker Desktop is stopped. AutoStart is off and agents may not start Docker (orchestration §8), so by default every lookup is a miss, including config-trap probes that need no Docker. That covers every phase that is not a backend phase.",
    "It turns a few hundred rows into a second always-on stateful service: container, named volume, three passwords, pg_dump retention, image digest pins, restore drills, and ranking in plpgsql. This goes against E-03's verdict and the engine KS-R1 names, and the owner maintains it for years.",
    "Its headline benefit, engine-enforced read-only, mainly protects the MCP surface, which the proposal itself defaults to off. It admits that any Bash user is superuser through `docker exec -u postgres`."
   ],
   "best_ideas_to_graft": [
    "Probe-in-lookup: lookup itself evaluates the in-process probes of the top candidates and drops those whose root cause is absent. That run is the recorded gate run, so a cheap agent gets a gated lead in one call.",
    "Inject-control at reaffirm: re-apply the fail-side fixture or mutant to current HEAD, proving the check can still fail on today's code.",
    "Negative-corpus precision check at write: a probe that fires on known-good HEAD is refused (the ex1 identity/security.py exclusion) [X-04.F02].",
    "A gate_wrong outcome (the gate said applies but the fix did not resolve), counted separately from refutes.",
    "host_busy: container checks return inconclusive while any ship-plan fixflow-w1-* container is running.",
    "`attempt` events against an open claim, so a crashed or compacted session keeps its negative results.",
    "Reject an overlay control automatically when the overlaid test imports a symbol that only the fix introduced (control_not_reproduced)."
   ]
  },
  {
   "proposal": "C: kb staged hybrid (record, derived search and views in one SQLite file)",
   "criteria": [
    {
     "name": "false-positive safety",
     "score": 9,
     "reason": "The fix text is withheld (exit 3) until an applies verdict at this HEAD, and a lead requires an exact hit on a discriminating handle. Coverage is OOV-aware, backed by a local false-tie demonstration. The control-pair write gate was shown rejecting two naive probes, and the fold itself rejects curated events from the wrong actor."
    },
    {
     "name": "invalidation soundness",
     "score": 9,
     "reason": "Validity is a recomputable query over git predicates. Early cutoff re-applies the synthetic mutant at HEAD. It uses patch-id as a second predicate because release/drain branches are built by cherry-pick, a case no other proposal saw. The list of what it cannot detect is frank."
    },
    {
     "name": "one-developer operational cost",
     "score": 8,
     "reason": "One file in %LOCALAPPDATA%, no install, no CI change, 12 owner decisions, an automatic phase-close backup, and a go-minimal stopping point that needs no Docker at all. Snapshot retention and journal export are the remaining chores."
    },
    {
     "name": "egress posture",
     "score": 9,
     "reason": "SSH only, never GitHub, scrubbing at write and at return. Credential-shaped text it cannot classify is refused rather than stored redacted. Any future Meilisearch must run with telemetry off and its /mcp route never exposed [E-04.F06,F07]."
    },
    {
     "name": "agent access simplicity",
     "score": 7,
     "reason": "One CLI with about 18 verbs and bounded output. But --actor is required on every write, lookups included, and a dirty worktree makes verify inconclusive, which pushes agents in the middle of a fix toward misses."
    },
    {
     "name": "provenance and history completeness",
     "score": 8,
     "reason": "Event-sourced, with typed incident links and cost evidence, and mainline-only SHAs enforced at write. Claims are host-local and never journaled, so concurrent misses drop out of the history at stage 1."
    },
    {
     "name": "migration and seed feasibility",
     "score": 8,
     "reason": "Probes ran today with historical or synthetic pairs for six examples, and it found 6 of 13 cited SHAs off mainline (consistent with my check). But KS5 seeds 25 to 35 entries over repeated sessions before the KS6 readout, which front-loads the work."
    },
    {
     "name": "concurrency safety",
     "score": 8,
     "reason": "WAL, BEGIN IMMEDIATE, compare-and-set on the header, and projections updated in the same transaction, so the index never lags the record. Claims are advisory and host-local."
    },
    {
     "name": "fit to scale",
     "score": 6,
     "reason": "The verdict is right: one file, no hybrid. But projection_state.engine, index_lag, awaitVisible and lastAppliedSeq are pre-wired for engines it calls unjustified, which is speculative machinery that invites the engine creep it lists as a risk."
    },
    {
     "name": "swapability",
     "score": 8,
     "reason": "Clean role interfaces. The abstention features are served by the record engine, so swapping the ranker leaves abstention untouched. Leaks are named."
    },
    {
     "name": "honesty of limits, pilot and kill criterion, cost per phase",
     "score": 9,
     "reason": "It says plainly that its own shape is unjustified at this scale, offers go / go-minimal / stop, and labels its local experiments as not in the register."
    },
    {
     "name": "program fit",
     "score": 8,
     "reason": "KS0 can run any time after P0a, there is no CI change, the plan hook lands only once the gate exists, and gate containers use kb-gate- names. Its phases still lack the Goal, Deliverables and Owner-inputs fields."
    }
   ],
   "total": 97,
   "fatal_flaws": [],
   "best_ideas_to_graft": [
    "go / go-minimal / stop after the recurrence audit. Go-minimal (record engine, declarative probes, lookup, no Docker gate) is a real stopping point.",
    "OOV-aware IDF coverage, justified by the measured false tie ('android build broke' scored 1.0 on both ex7 and ex8).",
    "The write gate refuses non-mainline SHAs and suggests the squash commit.",
    "The two naive probes that inverted (unscoped compare_digest grep; `catch { return; }`) become golden negative fixtures for the control-pair rule.",
    "git patch-id as a second presence predicate, because release/drain branches are built by cherry-pick.",
    "Abstention features always come from the record engine's vocabulary, so any ranker swap leaves abstention untouched.",
    "The fold rejects curated events from the wrong actor, not only the CLI.",
    "No change to ship CI; the track's tests run locally in its own PRs.",
    "The plain verdict that extra engines are not justified, with numeric triggers kept as owner parameters and nothing built for them."
   ]
  },
  {
   "proposal": "D: ks journal-first (immutable git event journal plus per-host SQLite/FTS5 lens)",
   "criteria": [
    {
     "name": "false-positive safety",
     "score": 7,
     "reason": "The gate is mandatory, with control pairs, author != approver and footprint-scoped refutes. But coverage divides by in-corpus terms only, so one shared term on a unique entry reaches coverage 1.0 with margin 1.0. And `ks show` is not stated to withhold the fix before applies."
    },
    {
     "name": "invalidation soundness",
     "score": 9,
     "reason": "Validity is computed per call against the caller's working tree without writing an event. A phase-close scan at origin/main reports regressions (ex8 at 60c026d, LB9). Early cutoff is in place, and policy-only changes such as PIN length are named as undetectable."
    },
    {
     "name": "one-developer operational cost",
     "score": 7,
     "reason": "No install and one durable artifact: backup is just git push, and the index is deletable and versioned per schema, so there are no migrations and no stage switch. Against that: a 13-item owner never-list, git operations in every write, a CI step, and a pre-action lookup ritual in every phase."
    },
    {
     "name": "egress posture",
     "score": 9,
     "reason": "The remote allow-list is enforced in code and refuses github.com, the scrubber fails closed, and it says honestly that a leak into an immutable event means rewriting history on every clone."
    },
    {
     "name": "agent access simplicity",
     "score": 7,
     "reason": "One Bash CLI with 2,000-character cards. But --by session/role/model is required on every call including lookup, there are about 25 verbs, and the H7 handle fires only if the agent phrases --action well."
    },
    {
     "name": "provenance and history completeness",
     "score": 7,
     "reason": "The journal is the history, including attempts, corrections and seed sources. But it breaks its own mainline-only rule: ex8's passes_at control and its fix list use a6f9048, and ex5 cites 37821f5. I checked that both are not ancestors of origin/main. It also has no re-anchor step after the squash merge."
    },
    {
     "name": "migration and seed feasibility",
     "score": 8,
     "reason": "Six native probes verified, and lazy seeding after the eight examples is the lightest load of the four. But the ex8 control that KS4 and KS5 must reproduce rests on a branch-only commit."
    },
    {
     "name": "concurrency safety",
     "score": 8,
     "reason": "It measured duplicate-writer rename and the cost of the freshness check, has a deterministic fold and a local commit lease. Three consistency surfaces (journal files, index, git index) plus pending causal delivery add failure modes."
    },
    {
     "name": "fit to scale",
     "score": 7,
     "reason": "git plus one rebuildable index is proportionate, though a git commit per write and about 25 event kinds are more than a few hundred entries need."
    },
    {
     "name": "swapability",
     "score": 9,
     "reason": "Only the journal persists, so swapping the index engine means rebuild and recalibrate, with no data migration."
    },
    {
     "name": "honesty of limits, pilot and kill criterion, cost per phase",
     "score": 9,
     "reason": "Kill points at KS0, KS7 and KS10, local benchmarks flagged as not in the register, and a frank never-list."
    },
    {
     "name": "program fit",
     "score": 6,
     "reason": "Eleven phases, a CI step and a recurring pre-action ritual. It records 'before the PR is marked ready' with mainline SHAs that do not exist until the squash merge. Its phases lack the Goal, Deliverables and Owner-inputs fields."
    }
   ],
   "total": 93,
   "fatal_flaws": [],
   "best_ideas_to_graft": [
    "Index schema changes are a rebuild into a new index file (ks-i<N>.sqlite) from the complete journal, never an in-place migration. A broken index is 'delete it'.",
    "Phase-close scan at origin/main that re-runs native probes and reports 'possible regression' when a fixed trap's probe flips to applies. It would have flagged ex8's recurrence at 60c026d before the burned EAS build.",
    "A remote allow-list enforced in code that refuses github.com and any unlisted remote.",
    "The H7 action/intent handle plus a `--files --action` lookup, the only route to silent defects and do-not-apply entries that have no error text.",
    "Lazy seeding: after the eight examples, entries are recorded only when a miss is solved from prose.",
    "'* -text' in the store's .gitattributes (core.autocrlf=true system-wide on this box), and re-canonicalise before hashing.",
    "Validity answered per caller against its own working tree, with no event written for a per-caller answer."
   ]
  }
 ],
 "ranking": [
  "C: kb staged hybrid (one SQLite file)",
  "A: kb: one SQLite file behind a gated CLI",
  "D: ks journal-first (git event journal plus per-host index)",
  "B: ks on a separate Postgres container"
 ],
 "recommendation": "Adopt shape C: one SQLite file at %LOCALAPPDATA%/fixflow-kb through node:sqlite, with no install, no service and no CI change. It is the engine KS-R1 names as the stage-0 default. Strip C's pre-wired Meilisearch and DuckDB interfaces (projection_state.engine, index_lag, awaitVisible, lastAppliedSeq). Build only C's go-minimal path first:\n- K0 recurrence audit.\n- Record engine.\n- Declarative probes for the six examples that need no Docker (ex1, ex2a, ex3, ex4, ex7, ex8).\n- Lookup.\n\nGrafts:\n1. From A: export a journal file on every committed write, not only at backup, so the journal is always complete. With that in place, use D's rule that index schema changes are a rebuild into a new file, never a migration.\n2. From B: probe-in-lookup, so a Haiku or Sonnet agent gets a gated lead in one call and needs no separate verify step for probe-checkable entries.\n3. From A: the strength rule, the present_when template and unknown terms at max IDF. Keep C's fix withholding.\n4. From B: inject-control at reaffirm and the negative-corpus check at write.\n5. From D: fold the origin/main regression scan into C's phase-close validity sweep, so one phase-close command does both.\n6. From A: replace C's 'dirty tree is inconclusive' with A's `git stash create` snapshot.\n7. From D: the remote allow-list in code, and lazy seeding instead of C's repeated KS5 seeding sessions.\n8. From A: the anchor-after-squash step, if recording happens before merge.\n9. Collapse the owner decisions into one 'accept all defaults' decision, with the few real choices listed underneath.\n\nAdd the Docker test_id gate (C's KS4, with A's tar-stream isolation and B's host_busy) only if the pilot shows probe-class value and the owner wants code-defect coverage. If the owner already knows agents will write from the VPS, switch to D's journal-authoritative topology from day one instead, after fixing four things in D: the coverage hole, fix withholding, ex8's branch-only control (use 6928828), and the missing re-anchor step.",
 "what_every_proposal_got_wrong": [
  "No break-even for the build itself. Each plan spends roughly 8 to 11 sessions, several of them L-sized and Opus-heavy, before the prospective checkpoint, against a prior of 'almost no explicit repeats' in 48 fix commits [X-05.F20]. None says how many avoided escalations would repay that. None puts the cheapest test of the core bet (a blind replay against grep over hand-drafted entries) before the engine and gate runner are built.",
  "The wrong baseline. The grep arm compares against prose on disk, but the real incumbent is CLAUDE.md, already loaded in every session [M-02.01]. The store's marginal value is only in knowledge that is not always loaded. Moving narratives out of CLAUDE.md into a pull-only store can take knowledge away from exactly the agents that never call lookup. No pilot measures 'agent with CLAUDE.md loaded' as the comparison arm.",
  "Prevention versus lookup. For config traps (ex7, ex8, ex2a), an approved probe is a regression check. Running every trap probe proactively prevents the burned build instead of diagnosing it afterwards, and promoting the probe into the repo's own checks is the ITIL 'permanent fix' [T-05.F15] that would retire the entry. Only D's scan comes near this. That framing is standard practice and is not in the register.",
  "Symptom capture for remote failures. EAS cloud and Railway errors reach an agent only if the owner pastes the log, and this is a recurring manual step (something to remember) that no proposal designs for, although ex7 and ex8 are exactly this class.",
  "Writer identity. Every proposal requires --actor or --by with session and agent ids, but none says how a subagent learns its own ids, since hooks report the main session id [C-01]. In practice the field will be guessed or left constant, so the two-actor rule rests on PR review alone.",
  "Maintaining the tool. None estimates the CLI's size or says who repairs it when node:sqlite (Stability 1.2) changes, a pinned image digest goes stale, or a Node major lands. For one developer that is the recurring cost, and the 'drill on every Node major' items are rituals with no owner.",
  "Docker realism. With AutoStart off, code-defect verifies (ex1, ex4, ex5, ex6) will usually be inconclusive, so the realistic v1 value is the config-trap class. Only C's go-minimal sizes the build to that.",
  "Plan format. No phase list carries the ship plan's Goal, Deliverables or Owner-inputs fields, and the L-sized gate-runner phases (Docker isolation, images, fault injection) are unlikely to fit one session.",
  "Owner-decision load. There are 12 to 16 decisions in each proposal, each with a default, and none collapses them into one 'accept defaults' ruling, which is the form an owner with ADHD can actually act on."
 ],
 "dissent_or_uncertainty": "The top three are within four points, and the order turns on weighting. A judge with a safety lens would put A first, because it has the strongest false-positive defences and correct provenance. A judge looking at operation over years could put D first, because a deletable index, push-as-backup, no migrations and no stage switch are the least to maintain once a second host writes. I put C first because its go-minimal path is the smallest thing that tests the bet, and it is KS-R1's default. My lens may overweight ritual and code size against D's long-run simplicity.\n\nI ran one check myself: mainline ancestry. a6f9048, 9b98c88, c731e66, 8dafcec, 37821f5 and f3dfa6f are branch-only; 6928828, 60c026d, 542e28e, 2fe77f5, da988e2, 1c546a3, 140428c, 79a8dd4, ea48987 and c79bec7 are on mainline; CLAUDE.md is 390 lines. That check is what lowered D's provenance and seed scores. I did not re-run any probe verdict or benchmark the proposers report.\n\nNot in the register: `git stash create` behaviour, %LOCALAPPDATA% being outside OneDrive sync, CI regression probes as standard practice, and the session counts behind my break-even concern, which are my inference."
}
```
