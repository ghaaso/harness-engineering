# judge:3

```json
{
 "lens": "Operations skeptic. I tested each proposal against a Windows 11 dev box plus a later Linux VPS or home box, parallel sessions and git worktrees, backups and restore, the day Docker Desktop is off, and version gates. Read-only checks I ran on the box on 2026-11-02: Node v24.22.1 bundles SQLite 3.53.4. Git for Windows sets core.autocrlf=true in the system config (C:/Program Files/Git/etc/gitconfig). .github/workflows/ci.yml runs Node 22. C:/Users/User/OneDrive and C:/Users/User/WPS Cloud exist. CLAUDE.md is 390 lines. On mainline (ancestors of origin/main): 6928828, 60c026d, 140428c, 79a8dd4, 2fe77f5, da988e2, 1c546a3, 542e28e, a31924a, ea48987, c79bec7. Not on mainline: a6f9048, 9b98c88, c731e66, 8dafcec, 37821f5, f3dfa6f.",
 "scores": [
  {
   "proposal": "A: kb: one SQLite file behind a gated CLI",
   "criteria": [
    {
     "name": "false-positive safety",
     "score": 9,
     "reason": "The fix text stays hidden by code until a verify returns applies. A lead needs a strong exact handle plus coverage that counts unknown query terms at maximum IDF. guard_presence probes can never return applies, and refutes are scoped to the footprint (KS-R2, KS-R4, M-02.28, M-03.F07)."
    },
    {
     "name": "invalidation soundness",
     "score": 8,
     "reason": "The trace is recomputed on demand, with early cutoff and nine event triggers including recipe, runner, scrubber and doc-blob changes, and the undetectable cases are named (T-01.F01,F02; X-03). However, --worktree uses `git stash create`, which leaves out untracked files, so a new file that carries the root cause is invisible to the gate."
    },
    {
     "name": "one-developer operational cost",
     "score": 7,
     "reason": "Nothing to install, and the store stays up when Docker is down. Against that: two backup mechanisms (VACUUM INTO snapshots with retention, plus a journal repo), a later switch of the source of truth from stage 0 to stage 1, about 35 verbs and a new CI workflow. Concurrent `git commit`s in KB_HOME, which will hit index.lock, are not handled."
    },
    {
     "name": "egress posture",
     "score": 8,
     "reason": "No engine with telemetry. Real-sample fixtures stay in KB_HOME and only synthetic ones go to the GitHub-hosted code repo (OD13). Text is scrubbed at write and on return. But 'never GitHub' for the journal remote is a policy, not a remote allow-list enforced in code (X-01.F28; X-06)."
    },
    {
     "name": "agent access simplicity",
     "score": 8,
     "reason": "One Bash CLI with a machine-parsable first line, exit 3 for 'store unavailable' that callers treat as a miss, capped cards and verbs classed in code (E-10.F16-F18). The verb list is large for a Haiku agent."
    },
    {
     "name": "provenance and history completeness",
     "score": 9,
     "reason": "Append-only triggers, content-hash ids, a Lamport clock, explicit actor fields, mainline-only evidence with a re-anchor-after-squash verb, negative_result rows and do_not_apply as a first-class kind (T-02.F01,F20; KS-R8,R9)."
    },
    {
     "name": "migration and seed feasibility",
     "score": 8,
     "reason": "All eight examples fit, with control pairs on SHAs I confirmed are on mainline (140428c/79a8dd4, 60c026d/6928828, 2fe77f5, da988e2, 1c546a3). Four gates run without Docker. CLAUDE.md is trimmed only after K5."
    },
    {
     "name": "concurrency safety",
     "score": 8,
     "reason": "WAL, BEGIN IMMEDIATE, INSERT OR IGNORE and an occ compare-and-set, a 3.51.3 version gate, refused writes from older CLIs, and a doctor check that rejects the OneDrive and WPS Cloud folders that really exist on this box (T-06.F1-F6,F23). Contention on git commits is unaddressed, and access to one file from several worktree directories is still untested (E-01.F12 is inferred)."
    },
    {
     "name": "fit to scale",
     "score": 7,
     "reason": "One engine is the right size (E-05, E-08), but about 20 tables, eight handle kinds and a CLI of 30+ verbs is a lot of schema for tens to hundreds of entries."
    },
    {
     "name": "swapability",
     "score": 8,
     "reason": "The interface is async from day one, journal replay into Postgres is proved by fold equality, and the leaks (bm25 constants, tokenizer quirks, WAL rules) are listed."
    },
    {
     "name": "honesty of limits, pilot and kill criterion",
     "score": 9,
     "reason": "A K0 recurrence audit before any engine work, kill rules, rule-of-three bounds, inferred costs marked under KS-R10, and limits that name Docker being off, the WAL single-host rule and self-declared identity."
    },
    {
     "name": "program fit",
     "score": 8,
     "reason": "K-phases run as separate sessions and never gate P0a-P4c. ci.yml is left alone in favour of a path-filtered Node 24 workflow, which matters because ci.yml runs Node 22 (verified). Hooks stay off, per the harness-review skips. Docker work stays out of the ship plan's gate slot."
    }
   ],
   "total": 97,
   "fatal_flaws": [],
   "best_ideas_to_graft": [
    "Code-enforced withholding of the fix: show prints it only when an applies gate run is bound to the current lookup.",
    "The guard_presence strength rule: a probe that shows a guard's text exists can only return inconclusive(weak_check_only) for an entry about code behaviour.",
    "Coverage that keeps unknown query terms in the denominator at maximum IDF, so a single lucky shared term cannot reach full coverage.",
    "Feed the target tree to the container as a `git archive` stream into a tmpfs, with no host bind mount (this avoids NTFS-to-WSL2 bind-mount cost and MAX_PATH extraction on the host).",
    "A separate path-filtered CI workflow on Node 24, leaving ci.yml (Node 22) untouched.",
    "`kb doctor` refuses a store path under OneDrive, WPS Cloud, a UNC path, WSL /mnt/c, a bind mount or a work tree.",
    "Exit code 3 means 'store unavailable' and callers treat it as a miss.",
    "A DB-URL host guard against conftest's TRUNCATE.",
    "`kb anchor --pr` re-anchors controls to the squash commit.",
    "Real-sample fixtures live only in owner-controlled storage."
   ]
  },
  {
   "proposal": "B: ks on a separate Postgres container",
   "criteria": [
    {
     "name": "false-positive safety",
     "score": 6,
     "reason": "Running probes inside the lookup and requiring a fresh gate for every act are strong. But the lead card prints 'do-this' before a container gate has run (experience-following, M-02.28). Coverage divides only by query terms that are in the corpus, so a query sharing one word plus a tool match can become lead-eligible (the false tie C measured; T-03.F26)."
    },
    {
     "name": "invalidation soundness",
     "score": 8,
     "reason": "Drift checked at lookup, a phase-close sweep driven by merges rather than a clock, inject-controls at reaffirm, and 'vacuous target is inconclusive' are sound and event-driven (T-01.F02; X-02.F29; E-03.F12)."
    },
    {
     "name": "one-developer operational cost",
     "score": 2,
     "reason": "The store is down whenever Docker Desktop is off: AutoStart is off and agents may not start it (E-03.F21). It also adds a persistent container, three role passwords, pg_dump retention, a self-installed copy of the CLI, gate images and, at stage 2, a Postgres container on the production VPS."
    },
    {
     "name": "egress posture",
     "score": 7,
     "reason": "The container runs with --network none, Postgres has no telemetry, and the journal is never pushed to GitHub. But golden fixtures of raw symptoms land in the GitHub-hosted code repo, and stage 2 opens SSH-into-Docker on the production host."
    },
    {
     "name": "agent access simplicity",
     "score": 6,
     "reason": "One CLI plus a role-limited MCP is clean, but every answer depends on Docker and a psql round trip (unmeasured, estimated 0.3-1 s), and store_unavailable becomes a routine verdict that agents must interpret."
    },
    {
     "name": "provenance and history completeness",
     "score": 9,
     "reason": "The journal is written first, events carry operation-DAG parents with forks folding to needs_review, verdict events must carry a gate_run_id, and triggers also block TRUNCATE (E-09.F02; T-06.F26)."
    },
    {
     "name": "migration and seed feasibility",
     "score": 7,
     "reason": "All eight examples fit, with mainline controls (ea48987, da988e2 and 1c546a3 are on mainline, verified), but 'runnable without Docker' means nothing when the store itself needs Docker."
    },
    {
     "name": "concurrency safety",
     "score": 7,
     "reason": "Row locks, a journal that spools writes first and a partial unique claim index handle parallel sessions. But stage 2 is a single server whose loss drops every read on the dev box (X-01 disqualifies this topology for the lookup path), and access to the Docker socket makes the role separation empty."
    },
    {
     "name": "fit to scale",
     "score": 3,
     "reason": "A second stateful service plus a hand-written BM25F in plpgsql for a few hundred rows is exactly what E-03 and E-05 reject."
    },
    {
     "name": "swapability",
     "score": 5,
     "reason": "The journal is engine-neutral, but the fold, the transition rules and the ranking live in plpgsql, and role enforcement has no SQLite equivalent, so a swap means re-implementing the core."
    },
    {
     "name": "honesty of limits, pilot and kill criterion",
     "score": 9,
     "reason": "Unusually candid: it quotes E-03's verdict against itself, admits that Docker access makes anyone a superuser, and measures the store_unavailable share with a 30% trigger."
    },
    {
     "name": "program fit",
     "score": 3,
     "reason": "It overrides KS-R1's binding choice of engine, and it makes the owner start Docker for docs and mobile phases that otherwise never need it."
    }
   ],
   "total": 72,
   "fatal_flaws": [
    "The store is unreachable whenever Docker Desktop is stopped. AutoStart is off and agents may not start Docker, so every lookup is a miss on those days, including config traps whose probes need no Docker at all. The owner must remember to start Docker for phases that otherwise never use it.",
    "The stage-2 transport `ssh ks@<vps> docker exec … psql` requires the ks account to have Docker socket access on the production host, which is root-equivalent, and the key is usable by any agent with Bash on the dev box. When the VPS is unreachable, the dev box has no reads at all.",
    "It overrides binding ruling KS-R1 and E-03's verdict to buy role separation, which it admits is void because `docker exec -u postgres` is superuser."
   ],
   "best_ideas_to_graft": [
    "Run in-process probes inside the lookup itself, both to drop candidates whose root cause is absent and as the act-gate for that lead.",
    "An inject-control at reaffirm (the fail-side fixture or mutant applied to HEAD) proves the check can still fail on today's code.",
    "`guard <paths>` as an edit-time lookup that returns do_not_apply entries first.",
    "A host_busy verdict whenever the ship plan's fixflow-w1-* containers are running.",
    "Write the journal before the engine, so a stopped engine loses no writes.",
    "`attempt` events attached to an open claim, so negative results survive a crashed or compacted session.",
    "A gate_wrong outcome counted separately from refutes, and the store_unavailable share measured as an explicit operations metric."
   ]
  },
  {
   "proposal": "C: kb staged hybrid in one SQLite file",
   "criteria": [
    {
     "name": "false-positive safety",
     "score": 8,
     "reason": "The fix is withheld (show exits 3 without an applies verdict), a lead needs an exact discriminating hit, coverage handles unknown terms and was measured on the examples, and two naive probes were shown to fail their pairs. But absence-of-guard text probes (ex4) count as discriminating with no strength rule, so renaming _MAX_DISPATCH_EVENT_AGE would read as 'applies'."
    },
    {
     "name": "invalidation soundness",
     "score": 8,
     "reason": "A recomputable validity cache, early cutoff with mutants re-applied at HEAD, and a patch-id fallback for fixes cherry-picked onto release/drain are sound. The fold breaks ties by wall time after causal order, which T-06.F26 warns against."
    },
    {
     "name": "one-developer operational cost",
     "score": 7,
     "reason": "Nothing to install, the store stays up without Docker, and a go-minimal stage exists. Against that: two backup paths, no CI for the gate code, and a pre-wired async SearchIndex/Analytics surface for engines that will probably never be built."
    },
    {
     "name": "egress posture",
     "score": 7,
     "reason": "No telemetry, and Meilisearch analytics-off is an invariant if it is ever adopted. But it does not say where the real-raw-text golden fixtures live (the code repo is on GitHub), and the VPS-only remote rule is a policy only."
    },
    {
     "name": "agent access simplicity",
     "score": 7,
     "reason": "One CLI, read verbs opened read-only by the engine, and capped cards. But refusing to verify on any dirty tree unless --change is given adds friction for agents that are mid-edit."
    },
    {
     "name": "provenance and history completeness",
     "score": 8,
     "reason": "Event sourcing with a PROV mapping and tombstones, and a fold that rejects curated events from non-Opus actors or from the author's own session. Ordering uses a local AUTOINCREMENT seq plus wall time instead of a Lamport clock."
    },
    {
     "name": "migration and seed feasibility",
     "score": 9,
     "reason": "Six of the eight probes were demonstrated today on mainline pairs. Non-mainline SHAs are refused with the squash commit suggested, which matches my check that 6 of the cited SHAs are off mainline. Seeding runs one source per session."
    },
    {
     "name": "concurrency safety",
     "score": 6,
     "reason": "The same sound WAL/IMMEDIATE/CAS core, with projections updated in the same transaction so search never lags. But claims are never journaled, the journal commits have no lease, and the store repo gets no .gitattributes even though Git for Windows sets core.autocrlf=true system-wide here (verified). Stage-1 event files would therefore check out as CRLF and fail the hash-equals-name check."
    },
    {
     "name": "fit to scale",
     "score": 7,
     "reason": "Its plain verdict that a hybrid is not justified is right (E-04, E-05, E-08), but the shape still carries interface machinery for Meilisearch and DuckDB."
    },
    {
     "name": "swapability",
     "score": 9,
     "reason": "The clearest role interfaces. Abstention features are served from the record's own vocabulary, so swapping the search engine changes only the order of results. The leaks are listed in eight points."
    },
    {
     "name": "honesty of limits, pilot and kill criterion",
     "score": 9,
     "reason": "It argues against its own shape, offers go, go-minimal or stop, reports the probes that failed, and gives rule-of-three bounds."
    },
    {
     "name": "program fit",
     "score": 8,
     "reason": "Never a gate, no CI change, the plan hook lands only after the gate exists, and go-minimal avoids Docker entirely."
    }
   ],
   "total": 93,
   "fatal_flaws": [],
   "best_ideas_to_graft": [
    "Coverage that handles unknown terms, demonstrated on the ex7/ex8 'android build broke' false tie.",
    "A patch-id fallback for fixes cherry-picked onto release/drain, where ancestry predicates are wrong.",
    "A go-minimal stop point: probes plus lookup only, no Docker gate.",
    "Mainline-SHA normalisation at write, suggesting the squash commit.",
    "Naive probes that fail their control pair kept as regression tests for the write gate (the unscoped compare_digest grep; `catch { return; }`).",
    "`lookup --prescription` for prescriptions found in prose.",
    "Document frequencies for abstention served by the record engine, so they do not depend on the search engine.",
    "missed_existing lookups classified by cause before any engine trigger can fire."
   ]
  },
  {
   "proposal": "D: ks journal-first store with a per-host SQLite index",
   "criteria": [
    {
     "name": "false-positive safety",
     "score": 7,
     "reason": "A mandatory control-paired gate, inverted polarity for do_not_apply, and pre-action H6/H7 warnings are good. But the fix is not withheld by code. A lead can come from coverage plus margin with no exact handle, and how unknown terms are counted is unspecified. Its ex8 control cites a6f9048, which is not on mainline (verified), so its own mainline-only rule would refuse that control."
    },
    {
     "name": "invalidation soundness",
     "score": 9,
     "reason": "Validity is computed on every call against the caller's own working tree. A phase-close scan on origin/main would have flagged the ex8 recurrence at 60c026d (verified on mainline). Early cutoff, and an undetectables list that includes policy kept outside config."
    },
    {
     "name": "one-developer operational cost",
     "score": 8,
     "reason": "Only one thing to protect (the journal), and backup is a `git push`. The index is disposable, there is no daemon or hook, the VPS needs a 10-minute git-shell user, and the store stays up when Docker is down. But a git commit per write into a flat events/ directory rewrites a tree object the size of the whole directory on every commit (inferred), and the owner gets an 11-item never-do list."
    },
    {
     "name": "egress posture",
     "score": 9,
     "reason": "A remote allow-list enforced in code that refuses github.com, a VPS account limited to git-shell, synthetic fixtures only in the code repo, and a scrubber that fails closed (X-01.F26-F28; X-06)."
    },
    {
     "name": "agent access simplicity",
     "score": 8,
     "reason": "One CLI with capped cards, `--files/--action` lookups before acting that catch traps with no error text, and a skill that forbids reading the store's files directly. The verb list is long."
    },
    {
     "name": "provenance and history completeness",
     "score": 9,
     "reason": "The journal is the history: DAG parents, a Lamport clock, attempt.failed events recorded before an entry exists, as-of folds by store commit, mainline SHAs and artifact digests."
    },
    {
     "name": "migration and seed feasibility",
     "score": 8,
     "reason": "All eight examples fit, six can be probed natively on real commits, and seeding beyond the eight is lazy. The a6f9048 slip shows seeding needs the mainline normaliser that A and C specify."
    },
    {
     "name": "concurrency safety",
     "score": 9,
     "reason": "Atomic temp-then-rename was tested with four processes. A local commit lease removes index.lock contention, files whose hash differs from their name are quarantined, events wait for missing parents, '* -text' matches this box's autocrlf=true (verified), and each schema version gets its own index file to cope with CLI skew between worktrees. Claims across hosts are advisory only."
    },
    {
     "name": "fit to scale",
     "score": 7,
     "reason": "Making the journal authoritative from day one front-loads sync, ingest and DAG-fold code before any second host exists, and it journals every lookup as a file plus a commit."
    },
    {
     "name": "swapability",
     "score": 9,
     "reason": "Only the journal persists, so swapping the index is a rebuild with no dual-write window. The leaks are named: bm25 constants, git-native validity, the WAL single-host rule, line endings."
    },
    {
     "name": "honesty of limits, pilot and kill criterion",
     "score": 9,
     "reason": "Kill points at KS0 and KS10, measured benchmarks labelled as outside the register, and an explicit list of things the owner must never do."
    },
    {
     "name": "program fit",
     "score": 7,
     "reason": "It never blocks a phase and respects the harness-review skips. But it has 11 phases, and it adds a KS1 CI step plus a fetch-depth-0 job without naming a Node version, while ci.yml runs Node 22, whose bundled SQLite very likely predates 3.51.3 (inferred, not in the register)."
    }
   ],
   "total": 99,
   "fatal_flaws": [],
   "best_ideas_to_graft": [
    "A separate store/ (git) directory and index/ directory, with a disposable index file per schema version (ks-i<N>.sqlite). Nothing that is truth sits inside a git working tree where `git clean -xfd` could wipe it.",
    "A local commit lease taken inside the same IMMEDIATE transaction, so concurrent sessions never contend on the store's index.lock.",
    "A remote allow-list in code that refuses github.com, and a git-shell-only `ks` account on the VPS with one key per host.",
    "'* -text' in the store repo, given that core.autocrlf=true is set system-wide on this box, plus re-canonicalising before hashing.",
    "Verify that each file's hash equals its name, quarantining mismatches, and hold events whose parents have not arrived as pending.",
    "A freshness watermark checked on every call instead of a daemon, watcher or hook.",
    "The phase-close message reports two counts: events not yet pushed and entries newly suspect.",
    "`ks scan --at origin/main` to detect regressions on mainline.",
    "A pre-action lookup with `--files` and `--action` (the H7 handle) for silent and predicted hazards.",
    "A never-do list for the owner, written into the runbook."
   ]
  }
 ],
 "ranking": [
  "D: ks journal-first store with a per-host SQLite index",
  "A: kb: one SQLite file behind a gated CLI",
  "C: kb staged hybrid in one SQLite file",
  "B: ks on a separate Postgres container"
 ],
 "recommendation": "Adopt a merged design: D's storage topology with A's gate and retrieval discipline. Reject B.\n\nFrom D (KS-R1 allows the journal to be authoritative from day one):\n- The journal is authoritative from day one, in <LOCALAPPDATA>/fixflow-ks/store.\n- The per-host index lives in a separate index/ directory and is disposable, one file per schema version.\n- A local commit lease, a remote allow-list that refuses github.com, a git-shell-only VPS user, and '* -text'.\n- Backup is `git push`: no VACUUM INTO retention and no stage-0-to-stage-1 truth switch.\n\nTwo fixes to D:\n1. Fan the journal out into events/<aa>/ (as A, B and C do), and batch git commits at phase close or on the commit lease instead of one per write. This keeps tree rewrites and loose objects bounded on Windows.\n2. Normalise every control SHA to mainline: ex8's pair is 60c026d/6928828, never a6f9048.\n\nFrom A:\n- The fix is shown only after an applies verdict bound to the lookup.\n- A lead requires an exact discriminating handle.\n- Coverage counts unknown query terms at maximum IDF.\n- The guard_presence strength rule.\n- git archive streamed into a container tmpfs instead of extracting to the host.\n- The DB-URL host guard.\n- Exit 3 treated as a miss.\n- A separate path-filtered Node 24 CI workflow. ci.yml runs Node 22, which cannot pass the 3.51.3 version gate.\n\nFrom C: the go-minimal stop point (probes plus lookup, no Docker gate), the patch-id fallback, and the mainline normaliser.\n\nFrom B: probe-in-lookup for in-process probes, inject-controls at reaffirm, `guard <paths>`, a host_busy yield to fixflow-w1-* containers, and the store_unavailable share as a measured metric.\n\nKeep K0/KS0 (the recurrence audit) as the first step. Build only up to go-minimal until the pilot says go. Nothing in the track gates P0a-P4c.",
 "what_every_proposal_got_wrong": [
  "No proposal budgets upkeep for the tooling it creates. Each ships about 30 CLI verbs, a canonicaliser with per-tool adapters, a regex scrubber, a Docker-orchestrating gate runner and a fold, all maintained by one developer. Every kill criterion measures retrieval value, none measures maintenance cost, and none caps size or lists what breaks on a Node, Docker or Expo upgrade.",
  "Compliance is unmeasured. The design is pull-only, yet no proposal logs escalations that happened without a lookup, so the pilot cannot tell 'the store is useless' from 'the store was never consulted'.",
  "No proposal has a teardown checklist for the kill path. The skill file, plan-hook sentences, CLI directory, CI workflow, store directory and VPS user or remote would all linger after a kill verdict.",
  "The costliest worked examples (ex1, ex4, ex5, ex6) need Docker for their real gate, and Docker is off by default. No proposal estimates what share of verifiable value is native rather than Docker-only, and none schedules Docker-dependent approvals and seeding into sessions where a backend ship phase has already started Docker.",
  "Windows-host behaviour is mostly unmeasured. Only A, B and D handle the system-wide core.autocrlf=true I verified, and C leaves its store repo exposed to it. MAX_PATH and core.longpaths during host-side `git archive` extraction (B, C, D), bind-mount performance from NTFS into WSL2, and Defender scanning of thousands of small journal files are untested by anyone (my inference; not in the register).",
  "The version-gate story stops at the dev box. ci.yml runs Node 22 (verified), and only A routes its tests through a Node 24 workflow. The VPS is the production host, and installing Node 24 there for the store is a production-host change that A, B and C do not frame as one; D avoids it unless agents run on the VPS.",
  "Each design accepts single-disk exposure before P3b and offers only an optional USB bundle that the owner would have to remember. None writes a second copy automatically when a second local target is present."
 ],
 "dissent_or_uncertainty": "A and D are 2 points apart, and the order flips on one unknown: whether a second writing host ever exists. If agents only ever run on the dev box, D pays for sync, ingest and DAG-fold code that is never needed. In that case A, with D's directory separation and commit lease grafted on, is simpler to build first, while A's two backup mechanisms remain its main cost.\n\nI weighted A's safety lead (fix withheld by code, exact-hit leads, strength rule) less than D's operations lead because the gate, not the lookup display, stops acted false positives. A reader who weights display precision more would rank A first.\n\nUnverified points:\n- D's git-commit-per-write latency and tree growth on Windows (inferred from git's object model, not measured).\n- Whether Node 22's bundled SQLite is below 3.51.3 (not in the register).\n- A's and C's access to one SQLite file from several worktree directories (E-01.F12 is inferred).\n- NTFS bind-mount and MAX_PATH effects.\n\nB's score would rise substantially only if the owner turned Docker AutoStart on and stage 2 used a restricted forced-command account instead of Docker-group SSH access. Even then, it still conflicts with KS-R1."
}
```
