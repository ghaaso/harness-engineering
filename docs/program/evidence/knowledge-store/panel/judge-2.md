# judge:2

```json
{
 "lens": "Safety skeptic. The failure I attacked is a false positive: a cheap agent applying a fix that is stale or wrong. For each proposal I attacked lead eligibility, the gate (polarity, strength, control pairs), the refute/outcome semantics, invalidation, scrubbing and owner-maintained machinery, judged against the register's binding rulings KS-R1 to KS-R10. I also checked several claims read-only against git on 2026-11-02:\n- a6f9048, 37821f5 and 8dafcec are NOT ancestors of origin/main. 60c026d, 6928828, 542e28e, 140428c, 79a8dd4, 2fe77f5, da988e2, 1c546a3, a31924a and ea48987 are.\n- compare_digest( appears 4 times in backend/app at 2fe77f5^ (router, service, ops/deps, identity/security). At origin/main it appears 2 times (core/security, identity/security), so any ex1 probe without the identity/security exclusion fails its own control.\n- A's ex1 overlay is plausible: ops/tests/test_router.py at 2fe77f5 imports only pre-existing modules. B is also right that test_security.py imports compare_secret, so that file cannot be overlaid.\n- The ex4 and Dependabot probe targets are literal text: 'INSERT INTO dispatch_cursor' in 0046, _MAX_DISPATCH_EVENT_AGE in main.py, and the 'dependency-name: expo-*' line in dependabot.yml. Absence-polarity probes over them return applies after a refactor that only changes wording.",
 "scores": [
  {
   "proposal": "A - kb: one SQLite file behind a gated CLI",
   "criteria": [
    {
     "name": "false-positive safety",
     "score": 9,
     "reason": "It is the only proposal that does all of these: withholds the fix until a gate returns applies, requires a strong exact handle for a lead, keeps out-of-corpus terms at max IDF, splits gate_absent from refuted (refuted means applied but not resolved), and has a strength rule under which a guard_presence probe can never return applies for a code-behaviour entry [M-03.F07; M-02.28; KS-R2]."
    },
    {
     "name": "invalidation soundness",
     "score": 9,
     "reason": "Typed footprint tiers, a pull-based trace recompute, early cutoff by re-demonstrating the control pair, and recipe/runner/scrubber version bumps as triggers; it names what it cannot detect, and claim C6 honestly states that the footprint only decides when to re-verify, not whether to act [T-01.F01,F02; X-03]."
    },
    {
     "name": "one-developer operational cost",
     "score": 7,
     "reason": "No install, no daemon, and backup tied to phase close. But KB_HOME is also a git repo with snapshot retention, and the design carries 21 event types, about 35 verbs, 16 owner decisions and a new CI workflow: more surface than the owner needs before K5 proves value."
    },
    {
     "name": "egress posture",
     "score": 8,
     "reason": "The journal goes only to an SSH remote, never GitHub; scrubbing runs at write and on return with a structural production-data rule; provider egress is named [X-06; X-01.F28]. Scrubbing redacts rather than refusing on a finding."
    },
    {
     "name": "agent access simplicity",
     "score": 8,
     "reason": "One Bash CLI plus a skill, a machine-parsable first line, exit code 3 read as a miss, hard output caps, and read/mechanical/authored verb classes [E-10.F16-F18]. The verb list is long for a Haiku agent."
    },
    {
     "name": "provenance and history completeness",
     "score": 9,
     "reason": "Append-only events enforced by triggers; a negative_result table with failure_class and scope; do_not_apply and open_defect kinds; cost NULL when unknown; mainline-only evidence; explicit actor tier [T-02.F01,F20; RT-06]."
    },
    {
     "name": "migration and seed feasibility",
     "score": 9,
     "reason": "All eight examples fit, with controls on mainline commits (no branch shas, which I confirmed). ex2b and the Railway rule are honestly left as unverified_seed or a rule, and CLAUDE.md is trimmed only after K5."
    },
    {
     "name": "concurrency safety",
     "score": 8,
     "reason": "WAL with BEGIN IMMEDIATE, INSERT OR IGNORE on content-hash ids, an occ conditional UPDATE, Lamport ordering, a conflict fold instead of last-writer-wins, and a claim_seq fencing token [T-06.F1,F13,F26]. Sharing one file across worktree cwds is admitted to be untested."
    },
    {
     "name": "fit to scale",
     "score": 8,
     "reason": "One embedded engine is right for hundreds of rows [KS-R1, KS-R6], but the event-type and table count is heavier than tens of entries need."
    },
    {
     "name": "swapability",
     "score": 8,
     "reason": "An async interface from day one, journal replay as the migration path, and a candid list of leaks (bm25 constants, porter stemming 'eas', the WAL same-host rule)."
    },
    {
     "name": "honesty of limits, pilot and kill criterion",
     "score": 9,
     "reason": "K0 audit first, a K5 blind replay with a grep arm, the rule-of-three bound stated, kill criteria as owner parameters, and an explicit admission that the ex3 ABSENT verdict does not prove a correct fix [X-05; KS-R10]."
    },
    {
     "name": "program fit",
     "score": 8,
     "reason": "K-phases are one session each and in the plan's format; recording is never a Done-when; the read tier stays off per the HR skip rulings. The separate kb.yml CI workflow is one more thing to own."
    }
   ],
   "total": 100,
   "fatal_flaws": [],
   "best_ideas_to_graft": [
    "The strength rule: a guard_presence probe on a code-behaviour entry can only return inconclusive(weak_check_only), never applies.",
    "Refuted means 'gate said applies, fix applied, not resolved'; a gate not_applies on a shown hit becomes gate_absent plus a proposed not_when. This is the correct semantics for KS-R2.",
    "Fix text revealed only by an applies gate run tied to this lookup (card / lead / full reveal levels).",
    "Out-of-corpus query terms kept in the coverage denominator at max IDF.",
    "A schema CHECK that refuses author == approver on check approval, with approval bound to spec_sha256.",
    "Runner refuses any DB URL whose host is not the per-run container (conftest TRUNCATE) [X-02.F13,F14].",
    "kb doctor path guards (OneDrive, WPS Cloud, UNC, WSL /mnt/c, inside a worktree) and refusal below SQLite 3.51.3.",
    "--worktree verification through a git stash create snapshot, plus the capability_missing and sandbox_unavailable inconclusive reasons.",
    "Exit code 3 for 'store unavailable', which callers treat as a miss."
   ]
  },
  {
   "proposal": "B - ks on a separate Postgres container",
   "criteria": [
    {
     "name": "false-positive safety",
     "score": 6,
     "reason": "Its executable refuting checks on negatives and inject-control are good, but lookup cards print 'do-this' before any gate for non-probe entries, the coverage denominator drops out-of-corpus terms, a lead can come from trgm or coverage without an exact handle, and not_applies is conflated with refuted."
    },
    {
     "name": "invalidation soundness",
     "score": 8,
     "reason": "Rich triggers, a pull-based drift query, and reaffirm requiring a fail-side mutant to fire on current HEAD, which proves the check can still fail today [T-01.F02; X-02.F29]; whole-file over-invalidation is admitted."
    },
    {
     "name": "one-developer operational cost",
     "score": 3,
     "reason": "A persistent Postgres container that must be up for every lookup while Docker AutoStart is off and agents may not start Docker, plus 3 role passwords in a secrets folder, pg_dump, plpgsql fold and ranking, a hand-written BM25F, image digests, self-install copies and a scratch ks_dev database: the second stateful service E-03 rejected."
    },
    {
     "name": "egress posture",
     "score": 8,
     "reason": "--network none, no published port, journal never to GitHub, scrubbing at write and return; equivalent to the others."
    },
    {
     "name": "agent access simplicity",
     "score": 6,
     "reason": "Read-only enforced by DB role is a real safety gain [E-03.F14], but every lookup is a docker-exec psql round trip whose availability depends on the owner starting Docker, and the nonce dollar-quoting transport is a new injection surface not covered by the register."
    },
    {
     "name": "provenance and history completeness",
     "score": 9,
     "reason": "A per-entry event DAG with fork detection, attempt events that survive a crashed claimant, gate_run rows with attempts, and refuting checks stored with negatives."
    },
    {
     "name": "migration and seed feasibility",
     "score": 8,
     "reason": "Eight examples fit; ex1 is a probe with a negative-corpus check; ex4 uses a behavioural db_probe; ex3 has a Vitest refuting check for the naive fix. ex5 waits on a mobile image."
    },
    {
     "name": "concurrency safety",
     "score": 8,
     "reason": "Server-side FOR UPDATE, journal-first spooling when the DB is down, forks instead of overwrites, and cross-host atomic claims at stage 2, all at a high operational price."
    },
    {
     "name": "fit to scale",
     "score": 3,
     "reason": "It concedes E-03's verdict that an embedded engine costs less at stage 0, then adopts the heavier engine anyway for hundreds of rows."
    },
    {
     "name": "swapability",
     "score": 6,
     "reason": "The journal is engine-neutral, but fold, transition and lookup rules live in plpgsql and must be rewritten on any swap."
    },
    {
     "name": "honesty of limits, pilot and kill criterion",
     "score": 8,
     "reason": "Unusually candid about its own costs, measures the store_unavailable share, and runs KS-0 first."
    },
    {
     "name": "program fit",
     "score": 4,
     "reason": "It contradicts binding ruling KS-R1 (SQLite via node:sqlite as the query engine), and the store's availability is coupled to the owner starting Docker."
    }
   ],
   "total": 77,
   "fatal_flaws": [
    "Violates binding ruling KS-R1: the query engine is meant to be SQLite via node:sqlite.",
    "Every lookup, including config traps whose probes need no Docker, fails while Docker Desktop is stopped. AutoStart is off and agents may not start it, so the store is a guaranteed miss in many sessions.",
    "A persistent second stateful service (container, role passwords, pg_dump, plpgsql ranking and fold) for a few hundred rows is exactly what an ADHD single developer would regret owning [E-03 verdict].",
    "Cards show the fix ('do-this') before a gate verdict for non-probe entries, which invites experience-following [M-02.28; T-05.F23]."
   ],
   "best_ideas_to_graft": [
    "Executable refuting checks attached to negative results, e.g. ex3's naive-useState Vitest close/reopen assertion. This is the only design that can catch the wrong fix for an open defect.",
    "Inject-control at reaffirm: apply the stored fail-side mutant to current HEAD and require the check to fire, so a passing check is never vacuous today.",
    "A behavioural db_probe for ex4 (cursor row count after upgrade head) instead of text-absence probes.",
    "ks attempt events on an open claim, so negatives survive a compacted or crashed session.",
    "host_busy inconclusive while any fixflow-w1-* ship container is running.",
    "ks guard <paths> before Opus edits in invariant areas.",
    "The store_unavailable share as a measured cost.",
    "A negative-corpus precision check at write [X-04.F02]."
   ]
  },
  {
   "proposal": "C - kb staged hybrid in one SQLite file",
   "criteria": [
    {
     "name": "false-positive safety",
     "score": 6,
     "reason": "Fix withholding (exit 3), OOV-aware coverage and an exact discriminating handle for a lead are strong. But there is no 'applied but not resolved' outcome, not_applies equals refuted, the absence-polarity probes (ex4, Dependabot) return applies after a wording refactor, and lead-eligible known_error_open lets ex3's presence probe read ABSENT after the naive fix."
    },
    {
     "name": "invalidation soundness",
     "score": 8,
     "reason": "A recomputable validity table, a git-diff sweep, early cutoff that re-applies the mutant at HEAD, and a cherry-pick/patch-id point. The undetectable list is the most thorough of the four, and it admits that under-capture is the false-positive side."
    },
    {
     "name": "one-developer operational cost",
     "score": 7,
     "reason": "No install and one file, but it carries interfaces for engines that may never exist (SearchIndex.awaitVisible, a Meili lag fallback) and an unbounded KS5 x n seeding series."
    },
    {
     "name": "egress posture",
     "score": 8,
     "reason": "Scrubbing at write and return, refusal of unclassifiable credential shapes, never GitHub, and a telemetry-off invariant for any later engine [E-04.F01]."
    },
    {
     "name": "agent access simplicity",
     "score": 8,
     "reason": "A Bash CLI, a skill, bounded output, read verbs opened readOnly by the engine, and a fold that rejects curated events from non-Opus or author sessions."
    },
    {
     "name": "provenance and history completeness",
     "score": 7,
     "reason": "Event-sourced, with a proof field on negatives (executed / argued / reported) and typed incident links, but no resolved/not_resolved outcome and claims are not journaled."
    },
    {
     "name": "migration and seed feasibility",
     "score": 8,
     "reason": "Six of eight probes were run against history with pairs, and the refused naive probes are shown, but two of its probes rely on absence polarity."
    },
    {
     "name": "concurrency safety",
     "score": 7,
     "reason": "WAL, CAS and a partial unique index on claims are sound on one host; claims are host-local and unjournaled, and the journal is deferred to KS7."
    },
    {
     "name": "fit to scale",
     "score": 8,
     "reason": "Its plain verdict that a hybrid is not justified is correct [E-04, E-05, E-08], but the pre-wired role interfaces are speculative machinery."
    },
    {
     "name": "swapability",
     "score": 9,
     "reason": "The cleanest role interfaces of the four; abstention features come from record-side vocabulary, so a search swap changes only candidate order."
    },
    {
     "name": "honesty of limits, pilot and kill criterion",
     "score": 9,
     "reason": "A go / go-minimal / stop outcome at KS0, an engine trigger tied to cause-classified misses, and limits that include its own probe brittleness, shown by experiment."
    },
    {
     "name": "program fit",
     "score": 7,
     "reason": "Phases fit the format and stay off the critical path, but KS5 x n is open-ended and the hook mostly duplicates A's."
    }
   ],
   "total": 92,
   "fatal_flaws": [
    "The store cannot record the most dangerous outcome, 'gate said applies, fix applied, problem not resolved': lookup.outcome has no resolved/not_resolved, so acted false positives and the kill criterion are invisible from inside the store.",
    "The absence-polarity text probes (ex4 'no INSERT INTO dispatch_cursor and no max_event_age', the Dependabot 'expo-*' ignore) return applies when a guard is merely reworded. Historical control re-runs do not catch this on current code, so a cheap agent re-adds a guard that already exists."
   ],
   "best_ideas_to_graft": [
    "The local demonstration that in-corpus-only coverage gives a false 1.0 tie ('android build broke'), which justifies OOV-at-max-IDF.",
    "A proof field on negative results (executed / argued / reported).",
    "Git hardening flags for probes (-c core.fsmonitor=false, an empty hooksPath).",
    "git patch-id as a secondary predicate because release and drain branches are cherry-picked.",
    "A dirty working tree gives inconclusive unless --change is given (RT-04).",
    "The fold rejects curated events whose actor is not Opus or equals the author, so a bypassed CLI check still cannot change lookups.",
    "A KS0 go-minimal outcome: probes and lookup only, no Docker gate.",
    "Engine triggers counted only on cause-classified misses (typo vs vocabulary vs handle gap)."
   ]
  },
  {
   "proposal": "D - ks journal-first (git event journal plus per-host SQLite lens)",
   "criteria": [
    {
     "name": "false-positive safety",
     "score": 5,
     "reason": "A lead can fire on IDF coverage alone with an in-corpus-only denominator; show does not withhold the fix until applies; the ex4 probe uses absence polarity; and the ex8 control and fix use a6f9048, which I confirmed is off mainline despite its own is-ancestor rule. Mandatory gating and v_gate_wrong only partly offset these."
    },
    {
     "name": "invalidation soundness",
     "score": 8,
     "reason": "Per-caller working-tree validity (RT-04), a phase-close origin/main scan that would have flagged ex8's recurrence at 60c026d, early cutoff, and an undetectable list that includes PIN policy outside config."
    },
    {
     "name": "one-developer operational cost",
     "score": 6,
     "reason": "No install and backup is a git push, but the owner gets a 13-item never-do list, per-call freshness and ingest, a git commit lease, per-version index files and quarantine/pending states, all around an immutable journal that is authoritative from day one."
    },
    {
     "name": "egress posture",
     "score": 8,
     "reason": "A remote allow-list in code that refuses github.com, fail-closed scrubbing, and scrubbing on return. A leaked secret, however, means rewriting history on every clone."
    },
    {
     "name": "agent access simplicity",
     "score": 8,
     "reason": "A Bash CLI, a skill and bounded cards, plus --files/--action lookups that reach silent hazards."
    },
    {
     "name": "provenance and history completeness",
     "score": 9,
     "reason": "The journal is the history: a DAG with Lamport ordering, journaled claims and attempts, seed_source, correction.noted, and cost NULL when unknown."
    },
    {
     "name": "migration and seed feasibility",
     "score": 7,
     "reason": "All eight fit, but the ex8 passes_at and fix commit a6f9048 and the ex5 reference 37821f5 are branch-only shas that would dangle, and ex5/ex6 need Docker."
    },
    {
     "name": "concurrency safety",
     "score": 8,
     "reason": "Pure-add journal merges [X-01.F20], a locally tested temp-then-rename, freshness checks inside BEGIN IMMEDIATE, causal 'pending' delivery and journaled claims. Fold determinism (LB4) is unmeasured."
    },
    {
     "name": "fit to scale",
     "score": 7,
     "reason": "Making the journal authoritative before a second host exists is more machinery than KS-R1's stage 0 needs, though backup-by-push is a fair trade."
    },
    {
     "name": "swapability",
     "score": 8,
     "reason": "An Index port with rebuild-from-journal; leaks named, including Windows EOL behaviour and index file names."
    },
    {
     "name": "honesty of limits, pilot and kill criterion",
     "score": 8,
     "reason": "KS0, KS7, a KS10 checkpoint and a frank limits list, but it claims mainline-only evidence while citing a6f9048."
    },
    {
     "name": "program fit",
     "score": 7,
     "reason": "Eleven phases off the critical path, but a lookup at every code phase's first commit adds standing per-phase cost, and transcript parsing for footprints sits near the HR skip line."
    }
   ],
   "total": 89,
   "fatal_flaws": [
    "Lead eligibility from coverage alone, with a denominator of in-corpus terms only, is the exact configuration C showed yields a false coverage of 1.0. Combined with show not withholding the fix, a cheap agent can read and copy a near-match's fix [M-02.28].",
    "Its own evidence rule is broken: ex8's passes_at and fix commit a6f9048 is not an ancestor of origin/main (verified), so the control pair would dangle or be refused.",
    "An immutable journal is authoritative from day one, guarded by a 13-item owner never-do list (no edit, rename, rebase, gc, merge driver, wrong folder, old sqlite3, and so on). For an ADHD single developer that is a standing set of foot-guns, and one leaked secret forces a history rewrite on every clone."
   ],
   "best_ideas_to_graft": [
    "Validity computed per call against the caller's working tree, and suspect capping for that caller only, with no event written.",
    "A phase-close scan of origin/main that also detects regressions: a fixed defect's probe flipping to applies on main, as ex8 at 60c026d would have.",
    "An H7 action/intent handle and a lookup with --files <Scope paths> --action '<Goal>' to surface do_not_apply entries and traps that have no error text (ex4, ex6).",
    "A remote allow-list enforced in code that refuses github.com.",
    "'* -text' gitattributes plus re-canonicalisation before hashing, because core.autocrlf=true on this box.",
    "Fail-closed scrubbing that reports the finding type, never the value.",
    "Measured freshness (about 6 ms at 5,000 files) and the 4-process rename test as evidence for the KS-R1 stage-1 journal."
   ]
  }
 ],
 "ranking": [
  "A - kb: one SQLite file behind a gated CLI",
  "C - kb staged hybrid in one SQLite file",
  "D - ks journal-first (git event journal plus per-host SQLite lens)",
  "B - ks on a separate Postgres container"
 ],
 "recommendation": "Adopt A as the base, with five changes.\n\n1. Graft the safety pieces that A lacks:\n   - B's inject-control: the fail-side mutant must still fire on current HEAD at every reaffirm.\n   - B's executable refuting checks on negative results, so ex3's naive useState becomes a check, not prose.\n   - B's behavioural db_probe for ex4.\n   - D's per-caller working-tree validity and the phase-close origin/main regression scan.\n   - D's H7 action handle with --files/--action lookups, for silent hazards and do-not-apply entries.\n   - C's git hardening flags, proof field on negatives, and fold-level rejection of curated events.\n   - D's remote allow-list and fail-closed scrub.\n\n2. Make it a schema rule that a text probe may return applies only in presence polarity. An absence-of-guard probe can return at most inconclusive(weak_check_only); this extends A's strength rule.\n\n3. Keep A's outcome semantics: refuted means only 'applied, not resolved'. Make outcome reporting mechanical where possible: after applying a fix, re-run the original failing command or gate, and record resolved/not_resolved from the runner, not the agent.\n\n4. Cut machinery before evidence. Run K0, then K1 + K2 + K3a, then seed only the declarative entries (ex7, ex8, ex2a, ex3 presence), then a K5-lite blind replay against grep. Build K3b Docker, K7 sync and K8 MCP only if K5-lite says go.\n\n5. Shrink the verb set an agent must know to lookup / verify / show / outcome / claim.\n\nB should be rejected outright. It contradicts KS-R1, and with Docker AutoStart off it makes the store unavailable in exactly the sessions where a cheap agent would need it.",
 "what_every_proposal_got_wrong": [
  "The gate proves the root-cause condition is present in the tree, not that it caused the caller's symptom. A latent co-present cause (an empty eas.json env value in a build that actually failed on the Sentry plugin) passes the gate, gets 'fixed', and the problem persists. Only A and B even count gate-passed-but-wrong, and none makes resolution mechanical: no proposal re-runs the original failing command after the fix. That leaves the kill criterion ('any acted false positive') resting on agents voluntarily reporting outcomes.",
  "Text probes are treated as root-cause checks without a general polarity rule. Presence probes fail safe; absence-of-guard probes (C and D's ex4, C's Dependabot) return applies after a harmless rewording. Historical control re-runs at fails_at/passes_at cannot detect that, because the vacuity exists only on current code.",
  "For ex3, no presence probe (A, C or D) can tell the correct P12a fix from the naive useState fix the entry warns against: both remove randomUUID from logPayment, so the gate reads not_applies either way. Only B's behavioural Vitest assertion addresses this, and nobody generalised the lesson that open-defect entries need a behavioural refuting check before any agent may use the gate to judge a candidate fix.",
  "None notices that for ex1, ex4, ex5 and ex6 the repository's own test suite already fails on regression; the store's Docker test_id gate duplicates CI. The store's unique value is concentrated in traps CI cannot see (ex7 and ex8, which expo export does not catch, and ex2 rollbacks) and in diagnosis-path and negative-result reuse. Every proposal builds the Docker runner before measuring whether that narrower value exists.",
  "Every pilot measures recall on blind queries written for entries the corpus already contains, from cases the same team documented. That overstates reuse on genuinely new encounters; only the prospective log (X-05 Step 2) measures the real thing, and it comes last.",
  "Two-actor approval rests on self-declared identity, and one Opus session can declare two actor ids. All proposals admit this, but none binds actor ids to harness session ids or transcript evidence. 'Approver is not author' is therefore policy, not a control.",
  "Each design asks the owner to absorb 9 to 11 phases, 12 to 16 owner decisions and 20 to 35 verbs before K0/K5 evidence exists. That machinery-first sequencing conflicts with the owner's 'less to track' constraint and with the register's finding that recurrence is unproven [X-05.F20]."
 ],
 "dissent_or_uncertainty": "A and C are close (100 vs 92). C's missing resolved/not_resolved outcome is a graftable omission rather than a structural defect, and on a different lens C's cleaner role separation could win. My D score is pulled down by fixable errors (the a6f9048 control, coverage-only leads), and D's backup-by-git-push may be less for the owner to track than A's two-layer snapshot plus journal. I am not sure A's stage-0 split (SQLite truth, exported journal) beats journal-first on the owner-attention axis.\n\nUnverified by me:\n- cross-worktree WAL access to one path (inferred, E-01.F12);\n- node:sqlite release-candidate API stability;\n- whether A's ex1 overlay actually imports cleanly at 2fe77f5^ (I checked imports at 2fe77f5 only);\n- B's psql dollar-quote transport safety;\n- all latency and token estimates (KS-R10 owner parameters).\n\nThe largest uncertainty is shared by all four: no evidence yet that hard defects recur often enough here to beat grep over CLAUDE.md [X-05.F20,F21]. The right first spend is K0 plus a declarative-only K5-lite, not any full build."
}
```
