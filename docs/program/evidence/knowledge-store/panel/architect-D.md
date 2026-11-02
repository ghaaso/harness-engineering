# architect:D

```json
{
 "shape": "D: a git-native event journal with a rebuildable index. The source of truth is an append-only journal of immutable event records. Each event is one canonical-JSON file named by the sha256 of its canonical bytes. The journal lives in a dedicated store repository at C:/Users/User/AppData/Local/fixflow-ks/store, which is outside the code repository, outside every worktree and outside the OneDrive folder that exists on this box. Git merges it as pure adds with no merge driver, and it is pushed over SSH to a bare repository on the owner's VPS (later the home box), never to GitHub. Every query, fold, analytic and constraint check runs on a per-host SQLite 3.53.4 index (node:sqlite, FTS5). The index carries a 'built from event set X' watermark: a sha256 over the sorted event ids plus the count. That watermark is re-checked against the journal directory on every CLI call, so there is no daemon, no file watcher and no git hook. Why this is not 'simulating a database with Markdown' (ruling KS-R1): (1) the records are machine-only canonical JSON events, not documents, and none is ever edited; a correction is a new event. (2) No agent reads or greps them: the ks CLI is the only reader, and everything an agent sees comes from SQLite. (3) The journal does the job the WAL does for SQLite: a durable, mergeable write-ahead log and transport. This is the production pattern of Fossil ticket artifacts, git-bug's operation log and Kleppmann's log-as-truth [E-09.F05,F13,F20]. (4) The owner rejected a store that is only files queried by reading them, and the research rejected a binary DB file committed to git [E-09.F17]; this shape is neither. KS-R1 allows stage 0 to run on SQLite alone. This design makes the journal authoritative from day one instead, for three reasons: the write cost is identical (write a file, ingest it), backup is 'git push' with no separate snapshot job for the owner to keep alive [X-01], and the rebuild path runs on every call instead of first being tested on the day a second host arrives. The shape's weak points are stated honestly in limits and risks. The ks CLI (sync, ingest, fold) is new code. Integrity comes from content hashes, rename and git, not from a database engine. Validation happens at ingest rather than at write. Cross-host claims cannot be atomic.",
 "name": "ks: a journal-first knowledge store (immutable git event journal plus a per-host SQLite/FTS5 lens)",
 "summary": "Agents record what they learn as small immutable JSON events (recorded, confirmed, refuted, invalidated, revised) in a private git repository outside the code repo. Every query runs on a per-host SQLite/FTS5 index that is rebuilt from those events and re-checked against them on each call. Because nothing is ever edited, parallel sessions, worktrees and hosts merge as pure file additions with no merge driver, and history and provenance are the events themselves. A cheap agent runs `ks lookup` with the raw error or the files it is about to change, and gets back a miss, one candidate or one lead. Nothing is acted on until `ks verify` returns applies: the gate runner evaluates a stored, control-paired check against the caller's own worktree. Native blob probes execute no stored code. Checked today against this repository's history, they discriminate on real commits for four of the eight worked examples and on one real side for two more. Test and database checks run in Docker. Any agent may append outcomes; new handles and revisions need Opus. A VPS outage only defers `ks sync`. You do nothing per phase and spend about ten minutes once on the VPS. Every decision listed below has a safe default.",
 "data_model": {
  "entry_fields": [
   {
    "name": "entry_id",
    "type": "sha256 hex: the event id of the entry's entry.recorded event",
    "why": "Content-addressed identity needs no central id allocator and cannot collide across hosts or worktrees.",
    "prior_art": "git-bug entity id = hash of the first operation [E-09.F13]; Beads hash ids against merge collisions [X-01.F18]"
   },
   {
    "name": "entry_type",
    "type": "enum {defect_fixed, trap, open_defect, do_not_apply, rule_without_case}",
    "why": "Selects the gate polarity and how the lead is worded. Do-not-apply entries are first-class (KS-R9, R-02 ex6).",
    "prior_art": "ITIL KEDB known error / workaround / permanent fix [T-05.F15]"
   },
   {
    "name": "title",
    "type": "string, symptom-first, <= 120 chars",
    "why": "The only line a cheap agent reads before deciding to verify.",
    "prior_art": "KEDB symptom-first title [T-05.F15]"
   },
   {
    "name": "symptom facet",
    "type": "{raw_scrubbed[]: verbatim scrubbed texts, canonical[]: {tool, phase, command, template, template_hash, recipe_version}, frames[]: module::function, prose, meaning: {misleading: bool, note}}",
    "why": "The scrubbed raw text is kept beside the canonical form so a recipe change can re-derive every handle. 'misleading' marks benign-looking or ambiguous texts.",
    "prior_art": "WER/Socorro raw-plus-derived and re-bucketing [T-04.F12,F13,F16; M-03.F13]; FixFlow's railway timeout and alembic CommandError traps [T-04.F25,F26]"
   },
   {
    "name": "handles",
    "type": "list of {htype H1..H7, value, status active|proposed|rejected, source_event, recipe_version}",
    "why": "Same root cause, different wording or file: several granularities, each with a known failure mode.",
    "prior_art": "Chromium's three signatures, Crashlytics issue/variant [T-04.F15,F16]; OR-set add/remove events [T-06]"
   },
   {
    "name": "context",
    "type": "{runtime web|mobile|backend|ops|deploy|ci, slice, tool, platform windows|linux|android|eas-cloud|railway, phase}",
    "why": "A deterministic facet prefilter before ranking.",
    "prior_art": "REP shape: BM25 plus structured filters [T-04 implications; T-03 i]"
   },
   {
    "name": "root_cause",
    "type": "{statement, mechanism, manifestation_conditions[], confidence verified|reported|inferred, evidence[]}",
    "why": "A single root cause is a hindsight artefact, so the conditions under which it manifests are stored with it.",
    "prior_art": "Cook [T-05.F21]; CBR case = problem + solution + outcome [T-05.F3]"
   },
   {
    "name": "diagnosis_path",
    "type": "ordered list of {observed, hypothesis, test, result}, distilled, <= 12 steps, never a transcript",
    "why": "This is the expensive thing to save. Distilled strategy lessons help; raw traces hurt.",
    "prior_art": "ReasoningBank vs AWM ablation [M-02.26; X-05.F10]; CBR derivation annotations [T-05.F3]"
   },
   {
    "name": "failed_approaches",
    "type": "list of {approach, why_failed, cause_class naive_fix_worse|wrong_hypothesis|tool_misleads|incomplete|environment, evidence, scope: footprint digest + versions, authority: by/tier}",
    "why": "Negative results scoped to the narrowest key, carrying their authority. They are leads, not prohibitions.",
    "prior_art": "RFC 2308 / RFC 8767 negative caching [T-01.F11,F12,F14]; ReasoningBank failed experiences [M-01.F24]"
   },
   {
    "name": "fix",
    "type": "{kind permanent|workaround|do_not_apply|none_yet, description, mainline_commits[], patch_ids[], prescribed}",
    "why": "Workaround versus fix; the patch-id recognises the same change after a rebase; 'prescribed' holds the planned fix of an open defect.",
    "prior_art": "KEDB [T-05.F15]; git patch-id, mainline SHAs only [T-02.F20]"
   },
   {
    "name": "validity",
    "type": "{trace_event, introduced[], fixed[] (OSV-style GIT ranges), requires_capability[] (docker, network, android_build, eas), platform, dependency versions}",
    "why": "Applies-while predicates over code state, never wall-clock time.",
    "prior_art": "OSV GIT ranges and is-ancestor [T-02.F13,F15,F16]; Linux Fixes: tag, Sentry resolved-in-release [M-03.F24]"
   },
   {
    "name": "gate",
    "type": "{checks[]: {check_id, kind, spec, polarity, root_cause_present_when}, control: {fails_at, passes_at} each = mainline sha or fixture id (+synthetic flag), spec_sha256}",
    "why": "The discriminating check that reproduces the root cause on current code, and the proof that it can fail.",
    "prior_art": "X-02 control pair and allow-listed kinds; Getafix validates by re-running the signal [M-03.F01,F02]; SapFix test-pass is weak [M-03.F07]"
   },
   {
    "name": "status (derived by the fold, never stored mutably)",
    "type": "enum {draft, unverified_seed, validated, suspect, conflicted, superseded, withdrawn}, plus per-footprint refute scopes",
    "why": "Lifecycle as a pure fold, so concurrent writers cannot lose an update.",
    "prior_art": "KCS WIP / Not Validated / Validated / Archived [X-04.F17-F21]; event fold [T-02.F01,F07]"
   },
   {
    "name": "counters (derived)",
    "type": "confirmed_n, refuted_n, inconclusive_n, times_shown",
    "why": "Cheap evidence of usefulness, computed by non-LLM code from the outcome events.",
    "prior_art": "ACE helpful/harmful counters [M-02.29]"
   },
   {
    "name": "cost",
    "type": "{escalations[], model_ids[], tiers[], tokens_in, tokens_out, wall_ms, sessions}; null where unknown, never 0",
    "why": "Escalation cost avoided can only be estimated if it is captured at write time.",
    "prior_art": "X-05 Step 2 log; RT-06 'unknown is not 0' [C-01.F24-F33]"
   },
   {
    "name": "links",
    "type": "list of typed {rel resolved|referenced|refuted|corrects|shares_root_cause|supersedes, target: doc path@mainline sha#anchor | PR | register id | commit | entry}",
    "why": "The store links to the plan, the PR body, git and the register and never restates them (KS-R7).",
    "prior_art": "KCS typed many-to-many links [X-04]; PROV wasRevisionOf / wasInvalidatedBy [T-02.F01]"
   },
   {
    "name": "envelope (every event)",
    "type": "{v, kind, entry, parents[], lamport, at (epoch ms, display only), by: {session, agent, role, model, tier, host}, ks (tools/ks mainline sha), scrub: {recipe, rules_sha}, nonce, idem}",
    "why": "Provenance, deterministic ordering without clocks, idempotent retries, and an explicit writer identity (subagent hooks carry the main session id).",
    "prior_art": "git-bug Lamport clocks [E-09.F13]; client-minted ids [T-06]; C-01 writer-identity warning; X-06 scrubber identity"
   },
   {
    "name": "seed_source",
    "type": "{doc, anchor, mainline_sha, contradiction}",
    "why": "Every seed entry names the prose it came from, and any contradiction becomes a correction.",
    "prior_art": "KS-R9; R-01a contradictions"
   }
  ],
  "handle_types": [
   {
    "kind": "H1 canonical template hash",
    "how_built": "sha256 of the canonicalised error text (ordered mask pipeline, recipe_version stamped) produced by a per-tool adapter",
    "how_matched": "exact equality in the handle table (prefilter tier 1)",
    "failure_mode": "Brittle: a tool upgrade that rewords the message splits the bucket, and a recipe change orphans the handle until reindex re-derives it from the scrubbed raw. Splitting is the safe direction [T-04.F15,F16]."
   },
   {
    "kind": "H2 tool + phase + error code / exception class",
    "how_built": "adapter fields, e.g. (python, TypeError, hmac.compare_digest), (eas, build:validate, env-empty), (alembic, upgrade, CommandError)",
    "how_matched": "exact tuple equality",
    "failure_mode": "Over-merges distinct causes: one alembic CommandError comes from different states, and EAS_BUILD_UNKNOWN_GRADLE_ERROR covers any gradle failure [T-04.F26]. It can never make a lead on its own."
   },
   {
    "kind": "H3 in-app frame signature",
    "how_built": "top 3 in-app module::function frames, repo-relative, line numbers dropped, recursion collapsed, framework frames on a changelogged skip-list",
    "how_matched": "exact equality, then frame-overlap tiebreak",
    "failure_mode": "A refactor or rename moves the signature. Minified Hermes frames carry no signal, so fall back to H1/H2 [T-04.F09,F32]."
   },
   {
    "kind": "H4 command context",
    "how_built": "tool + subcommand + flags + cwd relative to the repo root, e.g. (railway, up, cwd=.)",
    "how_matched": "exact tuple, used as a facet",
    "failure_mode": "Loose: many failures share a command. It may only add to a candidate, never nominate one."
   },
   {
    "kind": "H5 prose and raw substring",
    "how_built": "FTS5 unicode61 over title, symptom prose, paraphrases written by the solving agent (doc2query style), cause and negatives; plus a trigram table over the scrubbed raw text",
    "how_matched": "multi-column BM25 within one query, plus a trigram substring MATCH",
    "failure_mode": "Vocabulary mismatch gives misses (safe); shared words give false similarity, which is why coverage and margin thresholds exist and the gate is mandatory [T-03.F02,F04]."
   },
   {
    "kind": "H6 footprint path / symbol / key path",
    "how_built": "from the trace: repo-relative path, path#symbol region, or config key path (technician-app/app.json#expo.plugins, technician-app/eas.json#build.*.env)",
    "how_matched": "exact match against the files or key paths the caller passes with --files or touches",
    "failure_mode": "Hub files (AppContext.jsx, service.py) over-trigger, so H6 alone only yields a candidate; with H7 it can yield a lead."
   },
   {
    "kind": "H7 action / intent",
    "how_built": "canonical verb-object phrases written by the solving agent for the action that triggers the trap, e.g. 'enable dispatcher', 'restore reverted migration', 'let correct PIN clear lock', 'add env key to eas.json'",
    "how_matched": "exact verb-object token match plus FTS over the action column, against --action",
    "failure_mode": "The agent phrases its plan differently, which gives a miss (safe). This is the only handle for silent defects and predicted hazards with no error text (ex3, ex4, ex6)."
   }
  ],
  "history_model": "The journal is the history. Each entry's events form a DAG through 'parents' (the entry's heads the writer saw), with a per-entry Lamport counter; `ks history` prints it in topological order with an (lamport, event_id) tiebreak, so order never depends on clocks. The store's git log is only transport history (when an event reached a host), not provenance, and the store is never rebased or squashed. As-of queries ('what did the store believe on date D') fold the event set of a store commit, taken from git ls-tree, into a scratch index. The validity axis is code state (blob OIDs, region and key-path digests), never wall-clock time [T-02.F09,F16]. Fold rules are deterministic and precision-biased [T-02]: a refute beats a concurrent confirm; withdraw and supersede are tombstones that a stale writer cannot resurrect [T-01]; two concurrent curated revisions of one facet give 'conflicted' (never lead-eligible) until an Opus merge revision names both heads; unknown facets and kinds are tolerated on read (OpenLineage-style). A CLI refuses to write if the journal holds events with a schema v above its own.",
  "provenance_model": "Every event carries who (session, agent id, role, model id, tier, host; given explicitly with --by because subagent hooks report the main session id [C-01]; unknown is null), with what (ks tool version = mainline sha of tools/ks, scrub recipe and rule-set sha), from what (mainline commit SHAs checked with git merge-base --is-ancestor, blob OIDs, patch-ids; never PR-branch SHAs, because the repo squash-merges [T-02.F20; X-01.F22]) and evidence (sha256 of the runner-owned artifact plus a bounded scrubbed excerpt; the full artifact stays host-local under fixflow-ks/artifacts). PROV vocabulary is used for naming only: recorded = wasGeneratedBy, revised = wasRevisionOf, invalidated = wasInvalidatedBy [T-02.F01,F03]. Ids are content hashes now; a prev_hash chain is deferred (KS-R8).",
  "negative_results_model": "Four forms, all events. (1) failed_approaches inside an entry: distilled 'tried X, failed because Y, under conditions Z', with a cause class, the scope (footprint digest plus versions) and the authority. Shown as a lead, never a prohibition [T-01.F11,F14]. (2) do_not_apply entries: an explicit decision with its authority (ex6: the owner decision in PR #169). These are the only prohibitions; they are shown as a warning whenever their H6 or H7 handles match, even with no error text. (3) attempt.failed events attached to a claim before any entry exists, so an abandoned or dead diagnosis keeps its negatives [T-06]; they are promoted into failed_approaches when the entry is recorded. (4) outcome.refuted events scoped to the footprint digest they were observed on (KS-R2): the entry is suppressed for callers whose footprint digest matches and shown as 'needs re-verify' elsewhere. A 'not when' discriminator derived from a refute stays proposed until Opus accepts it or a second independent session confirms it (KS-R3).",
  "footprint_model": "A verifying trace is a map of typed items to digests, captured whenever a gate passes (control run, outcome, reaffirm) [T-01.F01,F02,F09]. Item types: blob (git hash-object over LF-normalised bytes, repo-relative POSIX path, worktree prefix stripped); region (sha256 of an anchor-delimited Python def/class or TS/JS function/const block, computed in Node); keypath (sha256 of canonical JSON at a config key path, e.g. app.json#expo.plugins); dep (name@version from a lockfile, or a pip freeze inside the gate image, since the backend has no lockfile [X-03.F15]); env (node, npm, expo, eas-cli, alembic versions); tool_resolution (scrubbed resolved lines such as an EAS image or Railpack provider [X-03.F19-F21]); platform. Each item carries a provenance tier: fix_diff, executed, read, env_probed, tool_reported. The trace is captured once by `ks capture` (mainline fix diff, regions for the named symbols, key paths the gate reads, env probe, and a cognitive set parsed post hoc from the session transcript, with no hooks). The coverage tier waits for an owner decision on dev-dependencies [X-03]. An unchanged trace is necessary, never sufficient [T-02]. Dropping an item needs evidence. A changed gate spec needs a fresh trace before the entry is validated again (the Frankenbuild rule [T-01.F04]).",
  "ddl_or_schema_sketch": "JOURNAL (truth). <home>=C:/Users/User/AppData/Local/fixflow-ks. Files: <home>/store/events/<sha256>.json and <home>/store/lookups/<sha256>.json. Each holds one canonical-JSON object plus LF: keys sorted, integers only (no floats), UTF-8, strings not normalised. id = sha256 of the canonical bytes, re-canonicalised on read before hashing. Store .gitattributes is '* -text' because core.autocrlf=true is set system-wide in Git for Windows on this box (verified 2026-11-02). Envelope: {v:1, kind, entry, parents:[id..], lamport, at, by:{session, agent, role: author|reviewer|runner|seeder|owner, model, tier: opus|sonnet|haiku|fable|owner, host}, ks, scrub:{recipe, rules}, nonce, idem, body}. Kinds: entry.recorded{facets} | entry.revised{facets replaced whole} | entry.superseded{by} | entry.withdrawn{reason} | seed.imported{source} | fixture.added{path, content} | gate.control_run{check_id, side, target, verdict, artifact_sha, excerpt, trace} | gate.approved{spec_sha} | gate.rejected{reason} | outcome.confirmed / outcome.refuted / outcome.inconclusive{lookup, check_id, target, footprint_digest, trace, artifact_sha} | validity.invalidated{at_rev, changed_items} | validity.reaffirmed{at_rev, trace} | handle.proposed / handle.accepted / handle.rejected{htype, value, from_lookup} | discriminator.proposed / discriminator.accepted{text, from_lookup} | claim.opened{signature, claim_seq} | claim.released | attempt.failed{claim, approach, why, cause_class} | correction.noted{doc, anchor, mainline_sha, text} | config.set{key, value} | lookup.performed{query_canonical, handles, context, candidates:[{entry, features}], shown:{lead, candidate}, result, cost:{tokens_in, tokens_out, wall_ms}}.\nINDEX (per host, rebuildable; <home>/index/ks-i<N>.sqlite; WAL, busy_timeout=5000, every write in BEGIN IMMEDIATE, assert sqlite_version() >= 3.51.3):\nCREATE TABLE meta(k TEXT PRIMARY KEY, v TEXT NOT NULL) STRICT; -- index_schema, recipe, scrub_rules, journal_digest, event_count, store_head, sqlite_version, built_at\nCREATE TABLE event(id TEXT PRIMARY KEY, file TEXT NOT NULL, kind TEXT NOT NULL, entry TEXT, lamport INTEGER, at_ms INTEGER, v INTEGER, session TEXT, model TEXT, tier TEXT, host TEXT, state TEXT NOT NULL CHECK(state IN ('ok','pending','quarantined')), body TEXT NOT NULL) STRICT;\nCREATE TABLE event_parent(id TEXT NOT NULL, parent TEXT NOT NULL, PRIMARY KEY(id, parent)) STRICT;\nCREATE TABLE entry(id TEXT PRIMARY KEY, type TEXT NOT NULL, status TEXT NOT NULL, title TEXT NOT NULL, heads TEXT NOT NULL, facets TEXT NOT NULL, spec_sha TEXT, trace_event TEXT, confirmed_n INTEGER, refuted_n INTEGER, inconclusive_n INTEGER) STRICT;\nCREATE TABLE handle(entry TEXT NOT NULL, htype TEXT NOT NULL, value TEXT NOT NULL, status TEXT NOT NULL, recipe INTEGER, src TEXT, PRIMARY KEY(entry, htype, value)) STRICT;\nCREATE INDEX handle_by_value ON handle(htype, value) WHERE status = 'active';\nCREATE TABLE trace_item(trace_event TEXT NOT NULL, entry TEXT NOT NULL, itype TEXT NOT NULL CHECK(itype IN ('blob','region','keypath','dep','env','tool_resolution','platform')), ref TEXT NOT NULL, digest TEXT NOT NULL, tier TEXT NOT NULL, PRIMARY KEY(trace_event, itype, ref)) STRICT;\nCREATE TABLE negative(entry TEXT, src TEXT, approach TEXT, why TEXT, cause_class TEXT, scope_digest TEXT, authority TEXT) STRICT;\nCREATE TABLE refute_scope(entry TEXT, footprint_digest TEXT, event TEXT, PRIMARY KEY(entry, footprint_digest)) STRICT;\nCREATE TABLE lookup(id TEXT PRIMARY KEY, at_ms INTEGER, session TEXT, tier TEXT, model TEXT, query TEXT, result TEXT CHECK(result IN ('miss','candidate','lead')), lead TEXT, candidate TEXT, features TEXT, tokens_in INTEGER, tokens_out INTEGER, wall_ms INTEGER) STRICT;\nCREATE TABLE outcome(id TEXT PRIMARY KEY, entry TEXT, lookup TEXT, verdict TEXT, footprint_digest TEXT, artifact_sha TEXT, tier TEXT, at_ms INTEGER, UNIQUE(lookup, verdict)) STRICT;\nCREATE TABLE claim(signature TEXT, claim_seq INTEGER, holder TEXT, opened TEXT, released TEXT, at_ms INTEGER, PRIMARY KEY(signature, claim_seq)) STRICT;\nCREATE TABLE lease(name TEXT PRIMARY KEY, holder TEXT, until_ms INTEGER) STRICT; -- only the local git-commit lease\nCREATE VIRTUAL TABLE entry_fts USING fts5(canonical, action, symptom, title, cause, negatives, entry UNINDEXED, tokenize = 'unicode61 remove_diacritics 0');\nCREATE VIRTUAL TABLE raw_tri USING fts5(raw, entry UNINDEXED, tokenize = 'trigram');\nCREATE VIRTUAL TABLE fts_vocab USING fts5vocab(entry_fts, 'row'); -- document frequencies for IDF-weighted coverage\nViews (KS-R6): v_outcome_rates, v_false_leads (an outcome.refuted after a shown lead), v_gate_wrong (validated, gate applied, later refuted by review), v_missed_existing (a miss later resolved to an existing entry), v_concurrent_misses (two claims or misses on one signature within one claim's life), v_cost.\nDesign-intent lineage queries (E-08): entries citing a changed file = join trace_item on ref; shared root cause = links rel=shares_root_cause, one recursive CTE."
 },
 "retrieval": {
  "canonicalisation": "A deterministic, ordered mask pipeline written in Node, versioned as recipe_version and pinned by golden fixtures (raw sample in, expected template and handles out) [T-04.F01,F05,F10,F13]. Steps in order: (1) scrub (see workflow.scrubbing); (2) rewrite absolute paths and worktree prefixes (C:/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/<name>/, /srv/..., the user profile) to repo-relative POSIX paths, so two worktrees produce the same template; (3) mask ISO and epoch timestamps, durations, UUIDs, hex runs of 7 or more characters, EAS build ids, Railway deployment ids, validated IPs and ports, temp paths, and free numbers; keep HTTP and error codes; (4) frames: drop line numbers, collapse recursion, apply the skip-list; (5) keep exception class names, error codes, tool names, file basenames and env var names unmasked. Per-tool adapters prefer structured output: pytest --junitxml, jest/vitest json, alembic, and eas build:validate first. Gradle, Railway and Docker adapters come only after real samples exist [T-04.F27-F29]. Output: template, H1 hash, H2 tuple, H3 frames, recipe_version. A recipe bump triggers a reindex that re-derives every handle from the stored scrubbed raw; the events never change.",
  "prefilter": "Deterministic and explainable, applied before any ranking. (a) Exact lookups in the handle index for H1, H3, H6 (against --files) and H7 verb-object (against --action), plus H2/H4 tuples; (b) context facets when the caller supplies them (runtime, tool, platform); (c) status: superseded and withdrawn are dropped; refuted-on-this-footprint is suppressed (the caller's footprint digest is computed against its own worktree); unverified_seed, suspect and conflicted are capped at candidate; (d) applicability: an entry whose footprint paths no longer exist in the caller's tree is demoted to candidate with 'code moved'.",
  "ranking": "FTS5 bm25 with column weights (canonical 10, action 6, symptom 5, title 3, cause 2, negatives 1), plus a trigram MATCH over the scrubbed raw for substrings of error text. Internal candidate depth is 20 (KS-R4). Exact-handle hits come first, ordered by handle strength H1 > H3 > (H6 with H7) > H2 > H4; BM25 orders the rest. Raw scores are used only to order candidates within one query, never as a threshold or a confidence [T-03.F02,F04,F05].",
  "abstention": "Three-valued output computed from score-free features [T-03 i]: exact-handle class; IDF-weighted coverage of the query's canonical terms by the best entry (0 to 1, document frequencies from fts5vocab); coverage margin between top 1 and top 2; status. A lead requires a validated entry, not refuted on the caller's footprint, AND (an exact H1 or H3 hit, OR an exact H6+H7 pair, OR coverage >= theta_lead with margin >= mu). A candidate requires coverage >= theta_cand, or any exact handle, or a lead-shaped hit on a non-validated entry. Anything else is a miss. H2 alone, H4 alone and H5 alone never produce a lead (over-merge, e.g. ex2's single CommandError for different causes [T-04.F26]). At most one lead and one candidate are displayed (KS-R4, ReasoningBank top-1 [T-05.F22]), each a card of 2,000 characters or less. do_not_apply entries whose H6/H7 match are shown as a separate warning line, never silently dropped.",
  "gate": "A lead is never acted on until `ks verify <entry> --lookup <id>` returns applies. The gate runner evaluates each of the entry's checks against the caller's own worktree (or --target <mainline sha>): applies (root cause present; act on the entry), not_applies (append outcome.refuted scoped to this footprint), or inconclusive (could not run, Docker down, anchor missing, flaky). Inconclusive is treated as a miss: escalate, carrying the entry in the brief as an unverified prior. For multi-cause entries such as ex8, verdicts are reported per check. For do_not_apply entries the polarity is inverted: the protective check must still pass on the proposed change. A cheap agent's plausibility reading of the card is advisory and never replaces the gate [T-03 i; M-02.30].",
  "thresholds": "Two thresholds plus a margin: theta_lead = 0.80, theta_cand = 0.50 and mu = 0.20 as starting proposals. These are my inference and owner parameters under KS-R10, not design facts. They are calibrated in KS7 on the seed corpus with leave-one-handle-out queries, hard negatives (the Sentry pair: eas.json empty env vs app.json plugin) and at least 40 (target 60) negative or stale probes, and chosen so that no negative produces a lead, at the cost of more misses (rule of three: 0 in 40 bounds the false-lead rate at 7.5%, 0 in 60 at 5% [X-05.F17; T-03.F20]). Thresholds are stored as owner-approved config.set events, so every host uses the same values. They are recalibrated after any index-engine or recipe change.",
  "feedback": "Relevance feedback lives on the document side and is event-only [T-03 i]. Mechanical: every verify appends outcome.confirmed, outcome.refuted or outcome.inconclusive with the lookup id, footprint digest and artifact sha; any tier may append these (KS-R3). Proposed: a confirmed lookup's canonical query becomes handle.proposed; a refute with a stated reason becomes discriminator.proposed ('not when ...'). Either becomes active only after an Opus handle.accepted or a second confirmation from a different session and lookup (KS-R3). Pseudo-relevance feedback and automatic query expansion are rejected (drift [T-03.F16]). At write time, exact pairwise Jaccard on token shingles warns of a near-duplicate, and the author extends the existing entry instead of creating a sibling [T-03; T-05.F15]. Counters come from outcomes, computed by non-LLM fold code [M-02.29].",
  "measurements": "From the lookup and outcome tables only, as SQL views (KS-R6), with no separate pipeline (HR skip ruling): P@1, MRR, recall@3 on blind replays, abstention accuracy on negatives, the false-lead rate with its rule-of-three bound, 'gate passed but entry wrong' counted separately from 'gate refuted' [X-05], missed-but-entry-existed (the embedding trigger), concurrent misses (the KS-R5 lease trigger), and lookup+verify cost on hits against the recorded original solve cost (null tokens stay null; prices applied only at analysis [X-05.F19]). The pilot adds a grep-over-prose arm (X-05 Step 1) and a prospective checkpoint at 20 encounters or 8 weeks (Step 2). Injected tokens for sessions that never call ks must stay 0.",
  "embeddings_position": "None in v1. At this scale dense retrieval does not beat BM25 (BEIR, LIMIT at 46 documents, entity queries) [E-07.F01,F03; T-03.F09-F11], and write-time handle expansion by the solving agent covers most vocabulary mismatch [E-07.F07]. The trigger is an owner parameter (KS-R10): roughly 5% missed-but-entry-existed over 50 lookups, or more than about 1,000 entries. If it fires, this shape makes vectors cheap and safe. They are a derived column only in the per-host index (sqlite-vec in the same file, a pinned local int8 bge-small through transformers.js with allowRemoteModels=false, model and revision stamped per vector [E-07.F19,F24,F28]), rebuilt from the journal and never written into it. They are fused with BM25 by RRF for ranking only, never for abstention [T-03.F08]. No vector server and no hosted embedder."
 },
 "invalidation": {
  "triggers": "Event-driven, never time-based [T-01; M-01]: (1) a code change: any footprint item digest differs between the entry's last verifying trace and the target (the caller's working tree at lookup time; origin/main at the phase-close scan); (2) dependency, platform or tool version changes in the trace (lockfile hash, the gate image's pip freeze, node/expo/eas-cli/alembic versions, floating remote defaults recorded as tool_resolution items such as EAS image 'auto' or Railpack 'lts' [X-03.F19-F21,F29]); (3) a recorded mainline anchor that has become unreachable (is-ancestor fails), which falls back to blob digests; (4) a refute on a footprint (KS-R2); (5) a recipe_version bump, which re-derives handles in a reindex with no entry event; (6) a scrub-rule change, after which `ks rescrub --audit` lists events that fail the new rules.",
  "mechanism": "Two paths. At lookup the CLI recomputes the digests of the candidate entries' trace items against the caller's tree (working-tree hash-object, so uncommitted edits count, per RT-04). A mismatch marks the entry suspect for this caller only, capped at candidate with the changed items named; no event is written, because the answer is a function of the caller's code state. At phase close `ks scan --at origin/main` reads blobs with git cat-file (no checkout) and appends validity.invalidated events (mechanical) for entries whose mainline footprint changed. `ks reverify --suspect` then re-runs the native checks against origin/main. If a check gives the same verdict as its trace, validity.reaffirmed re-stamps the trace (early cutoff / backdating [T-01.F02]). If a fixed defect's probe flips to applies on main, the entry stays suspect and the closing message reports a possible regression. ex8's app.json probe returns FAIL at 60c026d, the main commit (PR #59) that re-introduced the Sentry plugin before build 15 failed. No TTL, no decay, no mass dirty bit [T-01].",
  "who_repairs": "Mechanical events (invalidated, reaffirmed, outcome) are appended by any agent, Haiku and Sonnet included, through the gate runner (KS-R3). Revising facets, the gate spec, the control pair or handles is Opus only, approved by a second Opus session that authored none of the facet. A revised gate spec needs a fresh control run before the entry is validated again. The owner never repairs entries; contradictions with prose become correction.noted events plus a docs PR.",
  "what_cannot_be_detected": "Dependencies outside the footprint: transitive packages; backend library versions where no lockfile exists, unless the trace came from the gate image's env probe [X-03.F15]. Remote-resolver behaviour: the EAS cloud build image, Railway/Railpack detection, Meta WhatsApp API, Sentry project settings. Production data state: ex2's job_event.kind audit and ex4's prod cursor row need an operator query, which is outside the store. Policy changes not encoded in config: ex6's attack math rests on 4-digit PINs and the 20-per-60s IP limiter, and P1/P7b-1 change the PIN policy, so the entry is protected only if the trace holds those key paths. Semantic change behind unchanged text, and text change with unchanged meaning (blob probes are pattern-level). Non-determinism and volatility [T-01.F03]. Renamed anchors are detected only as 'anchor missing', which gives inconclusive (the safe direction)."
 },
 "gate_runner": {
  "check_kinds": "(1) blob_probe: native and runner-interpreted; no stored code is executed. It is a closed predicate set over file bytes read from the caller's working tree or, via git cat-file, from a mainline commit: json_path_empty(file, path glob), json_path_matches(file, path, pattern), count(files[], literal or regex, op, n), region_contains(file, start anchor, end pattern, pattern), order(file, region, first, then), duplicate_capture(glob, capture pattern), present/absent. It spawns only git with allow-listed argv. (2) test_id: named pytest, jest or vitest ids at the target tree, run in Docker; the runner fixes the reporter flags and artifact path (pytest -rs --junitxml, jest --json --outputFile). (3) db_probe: a throwaway Postgres container, the target tree migrated to head, read-only SQL with an expected result. (4) tool_resolution: compares a recorded resolved value with a fresh capture. It needs network or a remote tool, so it runs only in the main session with owner consent and is inconclusive otherwise. (5) scripted: disabled unless the owner enables the kind; Docker only, with approval bound to the spec sha256 [X-02].",
  "isolation": "blob_probe runs natively: the runner reads blobs only, executes nothing from the store and passes no environment through. Docker kinds follow X-02: --network none (an --internal network only for the Postgres pair); a read-only bind of a git archive export of the target commit, or a copy of the tracked and modified working-tree files, under fixflow-ks/gate/<run>/; tmpfs scratch; env allow-list; HOME redirected; resource caps; container and network names ks-gate-<run_id>, never the ship plan's fixed Appendix A names, so a backend phase's gates can never collide. FIXFLOW_TEST_DATABASE_URL may only name the run's own container, and the runner refuses any other host, because conftest TRUNCATEs whatever it is given and Settings defaults to localhost:5432 [X-02.F13,F14]. Dependency images are built in a separate trusted step keyed by lockfile hash, the only step that may use the network. If Docker is not running (AutoStart is off), the result is inconclusive 'docker unavailable', never not_applies. Claude Code's sandbox and Windows Sandbox are not used [X-02.F03].",
  "verdict_derivation": "Verdicts come only from the runner-owned artifact, never from a child's exit code [X-02.F01,F12]. blob_probe: the artifact is the runner's JSON (predicate, input digests, value); root_cause_present_when maps the value to applies or not_applies; a missing file, missing anchor or parse error gives inconclusive. test_id: every named id must appear in the junit/json artifact. An assertion failure in a named id gives applies. All named ids passing gives not_applies. Not collected, errors in collection or setup, timeouts, 126/127/137 and pytest exit 5 give inconclusive. Flakiness: rerun only on disagreement, unanimity required for applies, every attempt recorded with an entry-level flake counter. For a do_not_apply polarity check, a protective test failing on the candidate change gives 'do-not-apply violated'.",
  "approval": "Specs are data (kind, argv-free spec, expectation), canonicalised and hashed. `ks approve <entry> --spec-sha <sha256>` must come from an Opus session that is not among the authors of the gate facet; the CLI compares by.session across the facet's events. Any edit changes the sha and voids the approval [X-02.F20-F23]. Approval and control results are events, so the history shows who approved what and on which trace. The scripted kind needs both the owner enabling the kind and a verifier who is not the author.",
  "control_pair": "Required for validated status. fails_at and passes_at are each either a mainline commit (is-ancestor checked) or a journal fixture (fixture.added: a mutant file or tree overlay, flagged synthetic). The control run must give applies at fails_at and not_applies at passes_at, recorded as gate.control_run events with artifacts. Read-only runs on 2026-11-02 against this repository's history: ex7's eas.json empty-env probe is FAIL at 140428c and OK at 79a8dd4 and HEAD. ex8's app.json plugins /sentry/i probe is FAIL at 60c026d and OK at a6f9048 and HEAD. ex1's count of 'hmac.compare_digest(' in the three call-site files is 3 at 2fe77f5~1 and 0 at 2fe77f5. ex4's '0046 seed present AND _MAX_DISPATCH_EVENT_AGE present' is absent at da988e2~1 and present at da988e2. ex3's logPayment region containing crypto.randomUUID() is present at 542e28e and HEAD. ex2's duplicate-revision capture is 0 at HEAD over 46 files. The control pair also rejects probes that look plausible but do not discriminate: a broader ex1 probe over all of backend/app (excluding core/security.py) returns 1 at the fix commit, because identity/security.py:44 compares ASCII hex digests, so that probe fails its own control and could never become a lead."
 },
 "concurrency": {
  "write_path": "Every write verb runs these steps. (1) Build the event, scrub it (fail closed), serialise it to canonical JSON, and take id = sha256 of the bytes. (2) Open BEGIN IMMEDIATE on the host index (WAL, busy_timeout 5000, sqlite_version() >= 3.51.3 asserted [T-06.F1,F4-F6]). (3) Freshness: readdir the journal and ingest any file not in event. Measured on this box on 2026-11-02 at 5,000 files: median 5.96 ms, max 7.56 ms (my benchmark, not in the register). (4) Set parents to the entry's heads from the now-fresh index. (5) Write events/<id>.json.tmp-<pid>, then rename it to events/<id>.json. Tested 2026-11-02 with 4 processes writing the same 300 events at once: 0 errors, 300 files, no temp files left; renameSync replaces an identical existing file. The critic had listed NTFS rename as untested. (6) Insert, re-fold the affected entry, COMMIT. (7) Commit to git locally only if the local commit lease row (taken in the same IMMEDIATE transaction) is free: git add events lookups, then git commit. Because only the lease holder touches the store's git index, ks never contends on git's index.lock; files left uncommitted are picked up by the next commit. Push and pull happen only in `ks sync`. Idempotency: identical content gives the identical file; retried calls pass --idem, and the fold deduplicates on (entry, kind, idem); outcomes are unique per (lookup, verdict). Reads run the same freshness check. A digest mismatch caused by a deleted file (index ahead of journal) triggers a full rebuild plus an fsck alarm, because the journal wins. A file whose content hash differs from its name is quarantined, never ingested and never deleted. An event whose parent has not arrived waits as 'pending' (causal delivery). No daemon, watcher or git hook (Beads' daemon and auto-import timing problems [E-09.F02,F03]; the HR skip on hook gates).",
  "stampede_control": "Per KS-R5. `ks claim --lookup <id>` (signature = the query's H1 hash, else its H2 tuple) checks the fresh index for an open claim on the signature inside BEGIN IMMEDIATE and, if none exists, appends claim.opened with the next claim_seq. This is atomic on one host. It is non-blocking: the caller gets 'you lead' or the holder, the claim's age and the holder's attempt.failed events so far, and decides itself whether to work on something else, try a different hypothesis or proceed [T-06.F13,F30]. claim_seq is a fencing token: a later `ks record` carrying a superseded claim_seq is stored as corroborating, not authoritative, so two solvers never silently overwrite each other. Claims are journal events, so concurrent misses are countable across hosts in v_concurrent_misses. No expiry or renewal policy ships until concurrent misses are observed (KS-R5). Claims are displayed with their age. Across hosts, claims are advisory and not atomic.",
  "worktree_story": "The store home is outside the code repo, every worktree and the OneDrive folder, so every worktree, session and subagent on a host shares one journal clone and one index. No store state depends on a code branch: an abandoned or squash-merged branch cannot lose an entry [X-01.F20,F22]. What differs per worktree is the code state, and validity is computed on each call against the caller's cwd (working-tree hashes). One store therefore gives each worktree the verdict that is correct for its code: ex3 applies in a worktree before P12a and does not after. tools/ks may differ between worktrees, so version skew has rules. Events carry schema v; readers tolerate unknown facets; a CLI refuses writes when the journal holds a higher v and says to run from a newer checkout; each index schema version gets its own index file (ks-i<N>.sqlite), so two CLI versions never fight over one index; everything durable is in the journal. Writer identity is explicit (--by session/role/model), because subagent hooks report the main session id [C-01].",
  "two_host_story": "Each host has its own clone and its own index. The bare repo is ssh://ks@<vps>/srv/ks/store.git, served by a dedicated Unix user 'ks' whose login shell is git-shell, with one authorized key per host. `ks sync` commits, then runs git pull --no-rebase (pure adds never conflict [X-01.F20]) and git push, retrying up to 3 times on a non-fast-forward, with ConnectTimeout 5 s. The store config holds a remote allow-list and ks refuses any other remote, github.com explicitly [X-01.F28]. Convergence is set union plus a deterministic fold, so the indexes are equal after sync; concurrent curated revisions on two hosts fold to 'conflicted' until Opus merges them. When the VPS is unreachable, lookup, verify, record, claim and scan all work locally with no network on their path; sync prints 'N events unpushed since <date>', and the phase-close message carries that count. The exposure is the events written since the last push if the dev box disk dies. That is bounded, because the store is a speed-up learner whose first-principles fallback is a top-tier session [T-05.F6,F7]. `ks doctor` on a new host checks Node >= 24, SQLite >= 3.51.3 [X-01.F02], a path that is not synced or networked, and the remote allow-list. Until P0b/P3b provision the VPS, the store is single-host, and an off-box copy is an owner decision. At P13e the home box is added as a second remote."
 },
 "engines": [
  {
   "role": "Source of truth and transport (journal)",
   "engine": "git (Git for Windows on the dev box; distribution git on the VPS)",
   "version_or_status": "2.56.0.windows.4 installed and verified; the VPS version is checked at KS8",
   "why": "Immutable content-addressed files merge as pure adds with no driver; every clone is a full backup; history comes free [E-09.F07,F29,F30; X-01.F20]",
   "egress": "None: pushes go only to the owner's VPS (later the home box) over SSH, never to GitHub",
   "ops_cost": "low (no daemon; one sync per phase)",
   "install_needed": "None on the dev box. On the VPS: git and sshd (standard), one user with git-shell, a bare repo (owner, about 10 minutes at KS8)"
  },
  {
   "role": "Transport auth",
   "engine": "OpenSSH client; git-shell on the VPS",
   "version_or_status": "ssh 10.6p1 present in C:/Windows/System32/OpenSSH [X-01.F27]",
   "why": "Key-based, no third-party control plane; Tailscale rejected for egress [X-01.F26]",
   "egress": "None beyond the owner's host",
   "ops_cost": "low",
   "install_needed": "None (one key pair per host, generated with ssh-keygen)"
  },
  {
   "role": "Query index: lookup, fold, analytics, claims (rebuildable lens)",
   "engine": "SQLite through node:sqlite in Node, FTS5 (unicode61 and trigram tokenizers), fts5vocab",
   "version_or_status": "Node 24.22.1 bundling SQLite 3.53.4 (>= the 3.51.3 WAL-reset fix); node:sqlite Stability 1.2 release candidate; trigram and column-weighted bm25 verified locally 2026-11-02",
   "why": "Zero install, BM25 with column weights, trigram substrings, WAL multi-process tested [E-01.F01-F05,F10; T-06]",
   "egress": "None (no telemetry)",
   "ops_cost": "low (file per host, deletable)",
   "install_needed": "None. Fallback driver better-sqlite3 would need npm (owner decision) only if node:sqlite's RC API breaks"
  },
  {
   "role": "Gate runner, native kinds (blob_probe), canonicaliser, scrubber, CLI",
   "engine": "Node 24 standard library only (fs, crypto, child_process with allow-listed git argv, node:test for tests)",
   "version_or_status": "available",
   "why": "One process owns scrub, canonicalise, rank and probe; nothing to install",
   "egress": "None",
   "ops_cost": "low",
   "install_needed": "None"
  },
  {
   "role": "Gate runner, isolated kinds (test_id, db_probe, scripted)",
   "engine": "Docker Desktop (WSL2 backend) plus throwaway postgres:16-alpine (follow Appendix A to 17-alpine from P3a), with gate images built from lockfiles",
   "version_or_status": "Installed, AutoStart off; the owner starts it for sessions that need it",
   "why": "The only isolation common to Windows and the Linux VPS; a throwaway DB makes conftest's TRUNCATE harmless [X-02]",
   "egress": "Image pulls and dependency installs only in the separate trusted prep step; checks run with --network none",
   "ops_cost": "medium (the owner must start Docker; images rebuilt when lockfiles change)",
   "install_needed": "None new; image pulls are downloads of the kind the project's Docker gates already do"
  },
  {
   "role": "Scrubber second pass (optional)",
   "engine": "gitleaks binary; optionally secretlint and libphonenumber-js",
   "version_or_status": "Not installed; the v1 default is exact-value redaction plus custom regexes in Node",
   "why": "Layered scrubbing; no single scanner has the needed rules [X-06]",
   "egress": "None if pinned by checksum and run with network denied; trufflehog rejected (AGPL, live verification)",
   "ops_cost": "low",
   "install_needed": "Yes, owner decision (binary or npm)"
  },
  {
   "role": "Reserve, not built",
   "engine": "Postgres tsvector+pg_trgm as an index swap target [E-03]; sqlite-vec behind the embedding trigger [E-07]; Dolt only if native tabular merge is ever needed",
   "version_or_status": "Design only. Dolt is rejected now: CLI telemetry is on by default, the binary is about 103 MB, and concurrent writers need a server [E-09.F09-F11; X-01.F17]",
   "why": "The abstraction layer lets the index be swapped by rebuilding from the journal",
   "egress": "Any adoption needs telemetry off as a deployment invariant [E-04; E-10]",
   "ops_cost": "n/a until adopted",
   "install_needed": "Yes if ever adopted (owner decision)"
  }
 ],
 "abstraction_layer": {
  "interface_ops": [
   "Journal.append(event) -> event_id (idempotent: same bytes give the same id and the same file)",
   "Journal.list() -> {ids, digest, count} and Journal.read(id) -> event (hash re-verified)",
   "Journal.sync(remotes) -> {pushed, pulled, unpushed, conflicts} and Journal.fsck() -> {quarantined, pending, orphans}",
   "Index.ingest(events) / Index.rebuild(journal) / Index.watermark() -> {journal_digest, count, index_schema, recipe, scrub_rules}",
   "Index.lookup(canonical_query, context, files, action) -> ranked candidates with features (depth 20)",
   "Index.entry(id) -> folded view; Index.history(id) -> event DAG; Index.view(name) -> rows",
   "Index.claim(signature, holder) -> {leader | holder, age, attempts}",
   "Canonicaliser.canonicalise(raw, tool_hint) -> {template, handles[], recipe_version}",
   "Scrubber.scrub(text, mode write|return) -> {text, findings[], rules_sha} (fail closed on write)",
   "CodeState.digest(item, target) / CodeState.isAncestor(sha) / CodeState.export(target, dir)",
   "Gate.run(check_spec, target) -> {verdict applies|not_applies|inconclusive, artifact_sha, excerpt, trace}"
  ],
  "swap_story": "Only the journal persists, so replacing the index engine (SQLite/FTS5 with Postgres tsvector+pg_trgm, or adding sqlite-vec) means implementing the Index port, running rebuild and recalibrating thresholds. There is no data migration and no dual-write window. Replacing the journal (git files with a Postgres event table, or Dolt if multi-host writers at scale ever need native merge) is a one-way re-import of the same content-addressed events with ids preserved; the fold, gate runner and canonicaliser do not change. Running two indexes side by side during a swap is safe because both are projections of one journal [T-06; E-09 i].",
  "what_leaks": "(1) FTS5 tokenisation and bm25 constants leak into coverage features and so into the thresholds; recalibrate after any engine swap [T-03]. (2) The validity model is git-native by design (blob OIDs, is-ancestor, patch-id); a code host that is not git would need a new CodeState. (3) SQLite WAL's single-host rule leaks into topology: one index per host, never shared [X-01.F01]. (4) Windows rename and EOL behaviour leak into the journal writer (core.autocrlf=true here, hence '* -text' and re-canonicalise-before-hash). (5) The file-per-event unit leaks into git repository size, fine at 10^4 files and untested beyond that. (6) Index schema versions leak into index file names (ks-i<N>.sqlite)."
 },
 "access": {
  "how": "A Node CLI, tools/ks/ks.mjs in the code repo (reviewed through normal PRs, synthetic fixtures only), invoked through Bash as `node tools/ks/ks.mjs <verb>` and abbreviated 'ks' in the skill. Bash is the one path every subagent and workflow agent has with no configuration or approval prompt [E-10.F16]. A skill (.claude/skills/knowledge-store/SKILL.md, description of 1,536 characters or less) carries the lookup, verify, record procedure and the rule never to read the store's files directly. No hook and no always-loaded text: the store is pull-only [X-05.F12].",
  "cli_commands": [
   "ks lookup --text @err.txt [--tool pytest|jest|vitest|alembic|eas|gradle|railway] [--phase build] [--files technician-app/app.json,backend/app/main.py] [--action 'enable the dispatcher'] --by <session>/<role>/<model>  => miss | candidate | lead card (<= 2,000 chars) plus a lookup id; appends lookup.performed",
   "ks verify <entry> --lookup <lookup_id> [--target worktree|<mainline sha>] --by ...  => applies | not_applies | inconclusive per check; appends the outcome event",
   "ks show <entry> [--section summary|diagnosis|negatives|gate|validity|links]  (<= 6,000 chars per section)",
   "ks history <entry>  (event DAG, <= 50 lines)",
   "ks status  (watermark, journal digest, unpushed count, suspect and conflicted counts, SQLite version)",
   "ks stats --view outcome_rates|false_leads|gate_wrong|missed_existing|concurrent_misses|cost  (<= 40 rows)",
   "ks claim --lookup <lookup_id>  => you lead, or holder + age + attempts so far;  ks release <claim>",
   "ks attempt --claim <claim> --approach '...' --why '...' --class naive_fix_worse|wrong_hypothesis|tool_misleads|incomplete|environment",
   "ks propose-handle <entry> --from-lookup <lookup_id>;  ks propose-not-when <entry> --from-lookup <lookup_id> --text '...'",
   "ks record @draft.json --by <session>/author/<opus model>  (draft; the validator lists missing required facets)",
   "ks capture <entry> --fix <mainline sha> [--transcript <path to the session jsonl>]  (footprint trace)",
   "ks control <entry>  (runs fails_at and passes_at; appends gate.control_run)",
   "ks approve <entry> --spec-sha <sha256> --by <another session>/reviewer/<opus model>;  ks reject <entry> --reason '...'",
   "ks revise <entry> @facets.json --expect-head <event_id>  (refused, with the current heads, if they moved)",
   "ks supersede <entry> --by-entry <entry2>;  ks withdraw <entry> --reason '...';  ks accept-handle <entry> <htype:value>",
   "ks sync [--pull-only] [--timeout 5]  (commit, pull --no-rebase, push to allow-listed remotes; prints pushed/pulled/unpushed)",
   "ks scan --at origin/main  (appends validity.invalidated; prints newly suspect entries and possible regressions)",
   "ks reverify --suspect [--native-only]  (re-runs gates; reaffirms when verdicts are equal)",
   "ks reindex | ks fsck | ks doctor | ks rescrub --audit"
  ],
  "mcp": "None in v1. A thin stdio MCP wrapper exposing only the read verbs (lookup, show, verify, status) may be added later, if CLI misuse is observed in the lookup log; subagents inherit MCP tools, and tool search defers schemas [E-10.F16,F17]. Never an HTTP MCP endpoint (Origin, bind and auth surface [X-01.F25]), and never the archived reference sqlite MCP or a generic SQL passthrough [E-01.F20,F21; E-10.F2].",
  "output_bounding": "lookup: one lead card and one candidate card at most, 2,000 characters total (title, type, status, matched handles, validity summary for this worktree, the exact verify command, outcome counts, any do_not_apply warning line). show: 6,000 characters or less per section; history: 50 lines or less; stats: 40 rows or less. Raw journal JSON is never printed. Every output passes scrub-on-return. All limits sit well under Bash's 30k-character read-back and MCP's 10k-token warning [E-10.F18].",
  "read_write_separation": "Verb classes. Read: lookup's ranking, show, history, status, stats. Mechanical writes, any tier (KS-R3): lookup.performed, outcomes via verify, claim, attempt, propose-*, sync, scan, reverify. Curated writes, Opus only: record, capture, control, approve, reject, revise, supersede, withdraw, accept-handle; approve is refused when the approving session authored the facet. Admin: reindex, fsck, doctor, rescrub. In v1 enforcement is the CLI's checks on the declared --by, plus full visibility in history, plus the PR's Opus reviewer. Self-declared identity is a stated limit. A settings deny rule (curated verbs in cheap subagents; direct Read/Grep of the fixflow-ks path) is an owner decision, enforcing at the access layer as E-10 recommends."
 },
 "workflow": {
  "write_when": "Write-through at solving time [T-01.F17]. A session that resolves a defect, a failing gate or a build or deploy trap that needed a tier escalation or survived at least one failed approach, or that establishes a do-not-apply fact, records it with `ks record` before its PR is marked ready, while the diagnosis path and failed approaches are still in context. It then runs `ks capture` and `ks control`. During a diagnosis still in progress, `ks attempt` saves each failed approach against the claim, so a compacted or abandoned session keeps its negatives. Mechanical events are written by the CLI itself during lookup, verify and scan. Nothing is extracted by an LLM after the fact [M-01.F02,F12].",
  "who_confirms": "The PR's Opus reviewer, which plan §0 Routing already requires on every PR, refuting by default and never the author session. The reviewer reads the draft with `ks show`, re-runs `ks control`, and runs `ks approve --spec-sha` or `ks reject`, naming the entry in its verdict beside the PR head SHA. Handles and discriminators proposed by cheap agents need an Opus accept or a second independent confirmation (KS-R3). The owner confirms only do_not_apply entries that encode an owner decision, by the link to that decision; there is no per-phase owner work.",
  "read_when": "(1) Step zero on tier escalation: before any session dispatches a higher tier on a defect or error (Haiku or Sonnet to Opus, or Fable to an Opus deep-dive), the escalating session runs `ks lookup` with the raw text and the paths involved, and verifies a lead before using it. (2) Pre-action, once per code phase at its first commit: `ks lookup --files <Scope paths> --action '<phase Goal>'`, which surfaces do-not-apply and trap warnings with no error text (ex6, ex7, ex8). (3) A cheap agent that hits an unexpected error in a gate looks it up before retrying. Never automatic: no PostToolUseFailure hook, because the store is pull-only and injects nothing [X-05.F12; M-02.04].",
  "plan_hook_text": "- **Knowledge store (advisory; tooling track, `docs/program/KNOWLEDGE-STORE-DESIGN-2026-11.md`).** Before a session escalates a defect, a failing gate or a build or deploy error to a higher model tier, it runs `ks lookup` with the raw error text and the paths involved; it acts on a hit only after `ks verify` returns `applies`, passes a `candidate` into the brief as an unverified prior, and otherwise escalates unchanged. At a code phase's first commit the session runs `ks lookup --files <the Scope paths> --action \"<the phase Goal>\"` once and copies any do-not-apply or trap warning into the draft PR's decisions journal. A session that resolves a defect or trap which needed an escalation or survived a failed approach records it with `ks record` before the PR is marked ready, and the PR's Opus reviewer approves or rejects that entry in the same review (never the author); cheap agents append only outcomes. At phase close the session runs `ks sync` and `ks scan --at origin/main`, and the closing message states the two counts they print (events unpushed; entries newly suspect). If `ks` is missing or fails, the phase proceeds without it and the closing message says so: the store never blocks or delays a ship phase.",
  "phase_cost": "Per ship phase without a record: the pre-action lookup costs about 0.6k tokens (command plus an output of 2,000 characters or less); phase-close sync and scan about 0.4k tokens and under 15 s of wall time, network-bound. Each step-zero lookup with a native verify costs about 1 to 1.5k tokens and under 5 s; a Docker verify adds 1 to 5 minutes of wall time and about 0.5k tokens. A phase that records adds about 5 to 10k Opus author tokens (facets from context, capture, control) and 2 to 4k Opus reviewer tokens. Expected: about 1.5 to 3k tokens in a typical phase and 10 to 15k in a phase that records. All figures are my estimates (inferred; owner parameters under KS-R10), to be replaced by the lookup table's measured tokens after 20 encounters (X-05 Step 2). Owner time per phase: zero.",
  "scrubbing": "Done in the ks process at write time and again on every return, because the index, backups, transcripts and the provider all receive whatever the store holds or returns [X-06]. (1) Exact-value redaction of live secrets read into memory from the process environment (names containing TOKEN, SECRET, KEY, PASSWORD, DSN, DATABASE_URL) and from the code repo's gitignored .env files; the values are never stored. (2) Custom patterns: postgresql and postgresql+asyncpg URLs, Authorization/Bearer values, JWT three-segment shapes, Railway/Supabase/R2/Cloudflare token shapes, X-Ops-Proxy-Token values, Pakistani phone shapes (+92 / 03xx) and the 5-7-1 CNIC shape, email addresses, user-profile paths (replaced by <HOME>). (3) Typed deterministic placeholders (<SECRET:1>, <PHONE:1>); SHAs, UUIDs, Alembic revisions and epoch-ms values are exempt, so the handles survive. (4) A structural rule: no raw production query output and no customer payloads, since names and addresses cannot be detected locally; record rejects facets shaped like prod tabular data, and the skill forbids pasting them. (5) Fail closed: a finding blocks the write and reports the finding type, never the value. (6) Each event records the scrubber recipe and rule-set sha; after a rule change, `ks rescrub --audit` lists failing events. (7) A gitleaks second pass is an owner decision. Golden fixtures cover a must-survive group and a known-miss case (a customer row inside an error message). Events are immutable, so a leaked secret means rotating it and rewriting history on every clone; that is why the scrubber fails closed. Egress scope: cards returned to an agent reach Anthropic; that is unavoidable, and the owner rules on its scope [X-06; E-10.F31]."
 },
 "migration": {
  "seed_sources": "CLAUDE.md sections on traps, invariants and solved items (R-01a: 4 traps, 16 invariants, 9 solved, 1 open); docs/HANDOFF-2026-07-28-open-work.md sections 2, 4, 5.5 and 6 (13 traps, 10 solved, 36 open defects); docs/lifecycle-audit-followups-2026-07.md (11 open); G2 §2 register and §1.3 refuted claims, HR §3/§4, and the W2 notes' 52 ruled-out alternatives (R-01b); the git history behind the eight worked examples (R-02, examples.txt); the KS0 recurrence audit over the 48 fix-prefixed commits (X-05 Step 0).",
  "how": "Per entry through the write gate, never as a bulk import of prose (KS-R9). KS5 first records the eight worked examples: one Opus author session, a different Opus approver, control pairs run. After that, seeding is lazy and on demand: when a lookup misses and the solving session finds the answer in prose, it records the entry then, with a probe where one exists. The remaining CLAUDE.md build and deploy traps are recorded with probes where possible; 'railway up from the repo root' is a rule without a case (R-02), stored as rule_without_case with an H4 handle (railway, up, cwd = repo root) and no control pair, so it is unverified_seed and is shown only as a warning-type candidate, never as a lead. The W2 ruled-out notes become failed_approaches on the entries they belong to, with expo-location 18.0.10 and expo-task-manager 12.0.6 as dep trace items, so an Expo SDK upgrade (P14-n) invalidates them [R-01b]. The contradictions R-01a found (HANDOFF A2 vs CLAUDE.md; 0045 'free slot' vs merged; C1/C2 'do not ship' vs merged; HANDOFF §4.4 open vs fixed) become correction.noted events plus one docs PR that corrects the prose. Open defects (G2's 74, HANDOFF's 36) are not seeded; they live in their registers and are linked, not restated (KS-R7), until one is diagnosed.",
  "claude_md_effect": "Only after the KS7 pilot passes, and as an owner decision. CLAUDE.md keeps each rule as one sentence followed by '(ks <short id>)'. The incident narratives move into validated entries: the four Build and deploy traps become one-liners; the outbox 'KNOWN DEFECT, UNFIXED' paragraph becomes an open_defect entry; the dispatcher invariants' incident detail goes into ex4's entry; the bill-freeze and wizard-state stories go into ex5's entry; the login-lock reasoning, attack math included, goes into ex6 while the rule stays one line. One new line points agents at the skill: 'Before escalating a defect, or editing a file or config key a trap names, run the knowledge-store lookup.' Target: from 390 lines to 250 or fewer (adherence falls past about 200 [M-02.01]). Every removed narrative must resolve with `ks show <id>` in the same PR. If the pilot fails, CLAUDE.md is unchanged; X-05's outcome is then 'keep prose'.",
  "first_eight_entries_fit": "ex1 (non-ASCII compare_digest gives a 500): defect_fixed. H1 is the TypeError template; H2 is (python, TypeError, hmac.compare_digest), plus a sibling set (node, RangeError, crypto.timingSafeEqual) for ops-server.mjs; H4 is (GET /api/ops/*, 500); H6 covers ops/deps.py, customer_messaging/router.py, service.py#verify_webhook_signature and ops-server.mjs#tokenValid. All 5 ruled-out notes become failed_approaches (e.g. the typeof-null guard as naive_fix_worse, the String.length guard as incomplete). Fix: permanent compare_secret at mainline 2fe77f5. Gate: a blob_probe counting 'hmac.compare_digest(' in the three call-site files, root cause present when the count is above 0; control verified 3 at 2fe77f5~1 and 0 at 2fe77f5. A second check is test_id with the pytest ids from the example, run in Docker. Natively runnable. ex2 (reverted migration 0045, duplicate revision, rollback crash-loop): trap. The predicted symptom and the observed CommandError (alembic 1.18.5) map to H2, flagged as over-merging. H7 covers 'restore a reverted migration', 'ship VALIDATE with its NOT VALID constraint', 'roll back a deploy after a migration', 'use alembic downgrade as rollback'. 5 failed_approaches. The fix rules link ADR-0001 rather than restating it; the trace holds start.sh and ci.yml. Gate: a blob_probe duplicate_capture of the revision assignment over backend/alembic/versions/*.py; control passes_at HEAD (0 duplicates over 46 files, verified), fails_at a synthetic fixture with two '0045' files. The rollback arm is a db_probe in Docker (DB at 0046, code at 0045, expect the CommandError in the artifact). The prod kind audit is out of scope. The duplicate arm is natively runnable. ex3 (payment idempotency key minted per attempt, STILL OPEN): open_defect linked to HANDOFF A4 and ship phase P12a. There is no error text, so the handles are H5 ('double charge', 'retry after toast'), H6 (AppContext.jsx#logPayment, JobDetail.jsx#PaymentModal) and H7 ('retry a payment', 'mint an idempotency key'). The naive useState fix is a naive_fix_worse failed approach; fix kind none_yet, with the prescribed fix. Gate: a blob_probe region_contains (the logPayment region contains crypto.randomUUID()), which applies at 542e28e and HEAD (verified). passes_at is a synthetic fixture until P12a merges; then `ks scan` flags the entry and Opus revises it with P12a's squash commit and P12a's Vitest ids. If the probe still says applies at that commit, the control fails and the probe is replaced; that is the mechanism working. Natively runnable. ex4 (unseeded dispatcher cursor replays history): defect_fixed, a predicted hazard. H7 covers 'enable the dispatcher', 'set FIXFLOW_ENABLE_DISPATCHER', 'reset dispatch_cursor', 'restore an older snapshot'; H6 covers jobs/service.py#run_dispatch_once, 0046 and main.py#_MAX_DISPATCH_EVENT_AGE. 5 failed_approaches. Gate: a blob_probe conjunction (the 0046 seed migration is present AND _MAX_DISPATCH_EVENT_AGE is present in main.py), root cause present when either is missing; verified absent at da988e2~1 and present at da988e2. db_probe (cursor = max(seq) after upgrade head) and the existing integration test ids run in Docker. Links standing rule 4 by reference. Natively runnable. ex5 (completion form opens blank against a real bill): defect_fixed with three symptom variants as H5 handles. H6 covers completionPrefill.ts#resolvePrefill, wizardState.ts, CompleteJobScreen.tsx and outbox.ts#sendOrQueue; H7 covers 'derive wizard state from the outbox' and 'catch and return in a prefill fetch'. 5 failed_approaches, including the refuted last-write-wins claim, and 37821f5 recorded as an incomplete fix. Gate: test_id with the three discriminating Jest cases, run in Docker. Control: passes_at da988e2; fails_at a mutant completionPrefill.ts whose blocked/'unknown' arm returns 'new', because the real pre-fix tree has no such module (verified absent at da988e2~1), so a test overlay would only be inconclusive. Stays unverified_seed until KS6 or until the owner allows native Jest. ex6 (the login lock must keep blocking a correct PIN): do_not_apply. H4 is (POST /api/auth/login, 429 with a correct PIN). H7 covers 'let a correct PIN clear the lock', 'gate the lock on the failure path', 'invert the lock tests', plus a link handle to HANDOFF A2. H6 covers identity/service.py#login and throttle.py. 3 failed_approaches. The fix's authority is the owner decision in PR #169 (1c546a3), with the recovery path (set_pin, unlock_account.py). Gate, inverted polarity: the protective test ids (test_service::test_failed_logins_bump_counter_then_lock and test_identity_integration::test_five_failures_lock_the_account_even_for_the_right_pin) must pass on the candidate change, in Docker with a throwaway Postgres. A cheap native pre-check is a blob_probe order check that 'if is_locked(' precedes 'if not verify_pin(' in login (true at HEAD, lines 94 and 97). Control passes_at 1c546a3; fails_at a mutant implementing A2. The trace holds the PIN-policy key paths; a correction.noted is filed against HANDOFF A2. The pre-check is natively runnable. ex7 (eas.json empty-string env fails every EAS build): trap. H1 is the 'not allowed to be empty' template, provisional until a full eas sample exists; H2 is (eas, build:validate, env-empty); H5 is 'CI green but eas build fails'; H6 is the key path technician-app/eas.json#build.*.env; H7 covers 'add an env key to eas.json' and 'disable Sentry in eas.json'. 2 failed_approaches. Fix 79a8dd4, with a31924a linked. Gate: blob_probe json_path_empty; verified FAIL at 140428c, OK at 79a8dd4 and HEAD. Natively runnable. ex8 (Sentry Expo plugin breaks Gradle, recurred): trap with two outcome.confirmed events (2026-06-10 and 2026-06-26) as its recurrence history and two causes. H2 is (eas, gradlew, EAS_BUILD_UNKNOWN_GRADLE_ERROR), flagged as over-merging and never a lead alone; H6 covers app.json#expo.plugins and .github/dependabot.yml#ignore; H7 covers 'expo install a native module', 'add a config plugin', 'let Dependabot bump Expo'. 3 failed_approaches; fixes a6f9048 and 6928828. Check A: blob_probe json_path_matches /sentry/i on expo.plugins; verified FAIL at 60c026d, OK at a6f9048 and HEAD. Check B (native-version drift): a comparison of package.json pins with node_modules/expo/bundledNativeModules.json, inconclusive when node_modules is absent (as in this worktree today), or `expo install --check` as tool_resolution (network), which is inconclusive in the sandbox. The lead reports per-cause verdicts. Check A is natively runnable. Summary: the schema holds all eight. Gates run natively today for ex1, ex2, ex3, ex4, ex7 and ex8 (ex6's pre-check too); ex5 and ex6 need the Docker kinds."
 },
 "backup_story": "The journal is the only thing to protect, and git replicates it. Every `ks sync` (phase close) pushes to the VPS bare repo, and P13e adds the home box as a second remote; every clone is a full copy. Indexes are never backed up: `ks reindex` rebuilds one from the journal in seconds. Runner artifacts are host-local, and only their digests and excerpts travel in events. Restore: `git clone ssh://ks@<vps>/srv/ks/store.git C:/Users/User/AppData/Local/fixflow-ks/store`, then `ks reindex` and `ks fsck` (every file's content hash must equal its name). Drill (in KS8, then whenever the ship plan runs its own backup drill): clone into a temp directory, rebuild, and compare the event count and journal digest with the live store [X-01]. Until the VPS exists (P0b/P3b) there is a single copy on the dev box. That is an accepted, bounded risk, because the store only speeds things up (fallback: a top-tier session [T-05.F6,F7]); an optional monthly `git bundle` to an external drive is an owner decision. The owner must NEVER: push the store to GitHub or any third-party remote; edit, rename or delete files under store/events or store/lookups (corrections are new events made with ks); rebase, amend, squash, force-push, `git reset --hard` or `git gc --prune=now` in the store; add merge=union or a custom merge driver (pure adds need none, and one would hide an edit); move the store under OneDrive, a network share, a Docker bind mount, the code repo or a worktree; copy an index file between hosts or commit one; open the index with a SQLite older than 3.51.3 (an old DB browser or sqlite3.exe); run a stored check by hand outside the gate runner, or point FIXFLOW_TEST_DATABASE_URL at a real database; paste production rows or customer data into an entry; 'clean up' old or refuted entries by deleting files (retire by event).",
 "implementation_phases": [
  {
   "id": "KS0",
   "title": "Recurrence audit (X-05 Step 0), the go/no-go before any engine work",
   "entry": "Owner decisions 1 and 2 answered. Independent of ship phases (read-only; may run beside any phase).",
   "scope": "One Sonnet session classifies the 48 fix-prefixed commits (messages plus diffs) against the root causes of the eight worked examples and of the CLAUDE.md and HANDOFF traps, counting exact repeats (same root cause hit twice) and near-repeats (same cause class). Deliverable: a classified table at docs/program/evidence/knowledge-store/recurrence-audit.json with a rendered .md, plus manifest lines.",
   "done_when": "The table is committed; an Opus refuter has re-checked a 10-row sample; the closing message states the repeat count against the stop rule (2 or fewer repeats in 48 pauses the track, per the owner decision).",
   "workflow": "Sonnet extracts; Opus refutes the sample; Fable judges. No code.",
   "size": "Small (one session)",
   "resume": "Draft PR docs/ks-recurrence-audit; the last classified commit in the table."
  },
  {
   "id": "KS1",
   "title": "Journal and index core",
   "entry": "KS0 says continue; owner decisions 3 (store home) and 4 (tools/ks location) answered.",
   "scope": "tools/ks/ (Node 24, no dependencies): event schema v1 and validator; canonical JSON and sha256 ids; atomic temp-then-rename writer; `ks init` (store git repo, '* -text' .gitattributes, remote allow-list config); index open (WAL, busy_timeout 5000, BEGIN IMMEDIATE, SQLite >= 3.51.3 assert, refusal of OneDrive, network and bind-mount paths); freshness check and ingest; deterministic fold (parents, lamport, tiebreak, conflicted/tombstone rules); quarantine and pending; reindex, fsck, doctor, status, history; local commit lease. Tests on node:test: an 8-process write stress including duplicate events; two scratch clones with distinct events merged normally and by squash; a 100x shuffled-ingest fold-determinism check; hash-mismatch quarantine; freshness timing at 5,000 and 20,000 files. A CI step `node --test tools/ks`.",
   "done_when": "CI green on the PR; the PR body records the measured numbers for LB1 to LB4.",
   "workflow": "Opus implements (concurrency and fold are invariant-shaped); Sonnet writes tests from the list; Opus reviewer refutes by default and names the head SHA.",
   "size": "Large",
   "resume": "Branch feat/ks-core; draft PR checklist (Plan @ <sha> first line, decisions journal per plan §0)."
  },
  {
   "id": "KS2",
   "title": "Canonicaliser, scrubber and handle derivation",
   "entry": "KS1 merged; owner decision 7 (egress scope) answered.",
   "scope": "Ordered mask pipeline with recipe_version; adapters for pytest junit, jest/vitest json, alembic and eas build:validate; H1 to H7 derivation; scrubber layers (exact-value, custom patterns, placeholders, structural rule, fail closed) applied at write and on return; golden fixtures (synthetic, must-survive, known-miss customer-row case); `ks rescrub --audit`.",
   "done_when": "All fixtures pass; over-redaction is 0 on the must-survive group; CI green.",
   "workflow": "Sonnet implements from the fixture list; Opus reviews the scrubber as a security boundary.",
   "size": "Medium",
   "resume": "Branch feat/ks-canon; draft PR checklist."
  },
  {
   "id": "KS3",
   "title": "Retrieval, lookup output and claims",
   "entry": "KS2 merged.",
   "scope": "Handle index; FTS5 unicode61 and trigram tables; prefilter; ranking with column weights; abstention features (exact class, IDF coverage via fts5vocab, margin); bounded cards; lookup.performed with cost fields (null when unknown); claim, attempt and release; SQL views (outcome rates, false leads, gate wrong, missed existing, concurrent misses, cost).",
   "done_when": "Unit tests over a synthetic 30-entry corpus with hard negatives (the eas.json vs app.json Sentry pair, two alembic CommandError causes) produce no lead on any negative, and output stays within its bounds; CI green.",
   "workflow": "Sonnet implements; Opus reviewer.",
   "size": "Medium",
   "resume": "Branch feat/ks-lookup; draft PR checklist."
  },
  {
   "id": "KS4",
   "title": "Native gate runner, footprint capture, invalidation",
   "entry": "KS3 merged.",
   "scope": "blob_probe interpreter (closed op set) over the working tree or a mainline rev via git cat-file; control-pair runs; approve/reject bound to spec sha with the author-is-not-approver check; outcome events; `ks capture` (fix diff, regions, key paths, env probe, post-hoc transcript parse, no hooks); `ks scan --at`, `ks reverify`, early cutoff. CI job with fetch-depth 0 so tests can read this repo's history.",
   "done_when": "Tests reproduce the 2026-11-02 verdicts of the native probes for ex1, ex2 (with its synthetic side), ex3, ex4, ex7 and ex8 on the named commits; a non-discriminating probe (the broad ex1 variant) is refused at control; CI green.",
   "workflow": "Opus (the gate is the false-positive defence); Opus reviewer.",
   "size": "Large",
   "resume": "Branch feat/ks-gate; draft PR checklist."
  },
  {
   "id": "KS5",
   "title": "Seed the eight worked examples through the write gate",
   "entry": "KS4 merged.",
   "scope": "An Opus author session records ex1 to ex8 from R-02 with full facets, traces and control pairs, and stores the Docker-kind checks for ex5 and ex6. A different Opus session runs the controls and approves or rejects. correction.noted events for the R-01a contradictions; one docs PR correcting HANDOFF A2 and the other contradictions.",
   "done_when": "`ks status` shows ex1, ex2, ex3, ex4, ex7 and ex8 validated (ex2's and ex3's synthetic sides flagged) and ex5 and ex6 as unverified_seed; the docs PR is open with its own reviewer verdict.",
   "workflow": "Opus author, separate Opus verifier, Fable judges.",
   "size": "Medium",
   "resume": "`ks status` plus the docs PR checklist."
  },
  {
   "id": "KS6",
   "title": "Docker gate kinds",
   "entry": "KS5 done; the owner has started Docker Desktop; no backend ship phase that runs the Docker gates is in flight (plan §0).",
   "scope": "test_id (pytest junit, jest json) and db_probe with a throwaway Postgres; ks-gate-<run_id> names; --network none or --internal; env allow-list; HOME redirect; a DB-URL host guard; a trusted dependency-image step keyed by lockfile hash. Run the Docker checks of ex1, ex4, ex5 and ex6 and the mutant controls.",
   "done_when": "ex5 and ex6 validated; tests prove that an inherited FIXFLOW_TEST_DATABASE_URL naming localhost is refused and that Docker-down yields inconclusive; CI green (Docker kinds stubbed in CI, run for real locally).",
   "workflow": "Opus; Opus reviewer.",
   "size": "Large",
   "resume": "Branch feat/ks-docker-gate; draft PR checklist."
  },
  {
   "id": "KS7",
   "title": "Pilot step 1: blind replay, negatives, calibration",
   "entry": "KS5 done (KS6 optional; without it, Docker-only checks stay inconclusive); owner decision 10 defaults known.",
   "scope": "X-05 Step 1: blind replay of each seeded entry's raw original symptoms plus leave-one-handle-out queries; 40 or more (target 60) negative and stale probes including hard negatives; a grep-over-prose arm on the same queries; calibrate theta_lead, theta_cand and mu; report P@1, recall@3 and false leads with their rule-of-three bound.",
   "done_when": "Results committed under evidence/knowledge-store/; the owner's go/no-go and the thresholds recorded as config.set events; the kill rule applied if grep matches the store.",
   "workflow": "Sonnet generates probes and the grep arm; Opus judges each outcome; Fable adjudicates.",
   "size": "Medium",
   "resume": "The evidence file's last scored probe."
  },
  {
   "id": "KS8",
   "title": "Second host: VPS bare remote and restore drill",
   "entry": "P3b done (the VPS exists); owner decision 5 answered.",
   "scope": "A numbered step table is committed first at the head of the draft PR body. The owner at SSH (about 10 minutes) creates user ks with git-shell, /srv/ks/store.git (bare) and the dev box's authorized key. Then: `ks remote add` (allow-list), first `ks sync`, a restore drill (clone to temp, reindex, compare digest and count), and a blocked-remote drill for LB8.",
   "done_when": "Drill digests equal; with the remote blocked, every non-sync verb works and adds under 1 s of latency.",
   "workflow": "Sonnet drives; owner runs the SSH steps; Opus verifies the drill record.",
   "size": "Small",
   "resume": "The first unticked row of the step table."
  },
  {
   "id": "KS9",
   "title": "Wire-in: skill, plan hook, CLAUDE.md slimming",
   "entry": "KS7 passed; owner decisions 11, 12 and 14 answered.",
   "scope": "The .claude/skills/knowledge-store/SKILL.md file (description of 1,536 characters or less; the lookup, verify, record procedure; never read store files); a plan amendment PR adding the §0 hook sentences; CLAUDE.md narratives replaced by one-line rules with ks ids.",
   "done_when": "CLAUDE.md is 250 lines or fewer, and every removed narrative resolves with `ks show <id>`; CI path checks green; the owner has approved the plan amendment.",
   "workflow": "Sonnet edits the docs; Opus reviewer; owner approves.",
   "size": "Small",
   "resume": "Branch docs/ks-wire-in; draft PR checklist."
  },
  {
   "id": "KS10",
   "title": "Prospective checkpoint (X-05 Step 2)",
   "entry": "20 logged encounters or 8 weeks after KS9, whichever comes first.",
   "scope": "Read the SQL views; compute verified hits, acted false positives, and lookup+verify cost on hits against the recorded solve cost; apply the continue/kill criteria; decide on a KS-R5 lease policy if concurrent misses were observed.",
   "done_when": "Verdict recorded with the owner; the track continues, is extended once, or is retired by event (journal kept read-only).",
   "workflow": "Sonnet extracts; Opus judges; Fable adjudicates.",
   "size": "Small",
   "resume": "The checkpoint evidence file."
  }
 ],
 "owner_decisions": [
  {
   "decision": "Acknowledge the store as a new state owner (KS-R7): it owns diagnoses, traps and negative results with their validity, and it links to, and never restates, the plan, PR bodies, W0-results, git and the register.",
   "default": "Acknowledge, with exactly that scope.",
   "blocks": "KS1"
  },
  {
   "decision": "Run the KS0 recurrence audit first and accept its stop rule.",
   "default": "Yes; 2 or fewer repeats in 48 fix commits pauses the track.",
   "blocks": "KS1"
  },
  {
   "decision": "Store home path.",
   "default": "C:/Users/User/AppData/Local/fixflow-ks/ (store/, index/, gate/, artifacts/): not synced, outside the code repo and every worktree.",
   "blocks": "KS1"
  },
  {
   "decision": "Where the ks code lives.",
   "default": "tools/ks/ in the code repo through normal PRs (Opus review, CI) with synthetic fixtures only; real samples stay in the store.",
   "blocks": "KS1"
  },
  {
   "decision": "The sync remote.",
   "default": "A bare repo on the VPS under a dedicated user 'ks' with git-shell, one key per host; never GitHub or any third party; the home box added as a second remote at P13e.",
   "blocks": "KS8"
  },
  {
   "decision": "An off-box copy before the VPS exists.",
   "default": "None; accept the bounded loss risk (a speed-up learner). Alternative: a monthly git bundle to an external drive.",
   "blocks": "nothing"
  },
  {
   "decision": "Egress scope and account type (X-06): may scrubbed store content enter model context, and under which retention?",
   "default": "Yes, after scrubbing; assume a consumer account with training off and 30-day retention until you state otherwise.",
   "blocks": "KS2"
  },
  {
   "decision": "Installs: the gitleaks binary, secretlint or libphonenumber-js (npm), and coverage dev-dependencies for the footprint's coverage tier.",
   "default": "None. The scrubber uses custom patterns only; footprints have no coverage tier.",
   "blocks": "nothing (each adds a capability)"
  },
  {
   "decision": "Docker-kind gates, and whether Jest/Vitest test ids may run natively.",
   "default": "Docker kinds run only in sessions where you have started Docker and are otherwise inconclusive; no native execution of test ids.",
   "blocks": "KS6"
  },
  {
   "decision": "Retrieval thresholds and pilot criteria (KS-R10).",
   "default": "theta_lead 0.80, theta_cand 0.50, mu 0.20; X-05's pass and kill criteria.",
   "blocks": "KS7 verdict"
  },
  {
   "decision": "Add the §0 hook sentences to SHIP-PLAN.",
   "default": "Only after KS7 passes, as a plan amendment PR.",
   "blocks": "KS9"
  },
  {
   "decision": "Slim CLAUDE.md by moving narratives into entries.",
   "default": "Only after KS7 passes; otherwise unchanged.",
   "blocks": "KS9"
  },
  {
   "decision": "Settings deny rules: block curated ks verbs for cheap subagents, and direct Read/Grep of the fixflow-ks path.",
   "default": "Not applied; rely on the CLI checks, history visibility and the PR reviewer.",
   "blocks": "nothing"
  },
  {
   "decision": "Add the skill file .claude/skills/knowledge-store/SKILL.md to the repo.",
   "default": "Add it in KS9.",
   "blocks": "KS9"
  }
 ],
 "limits": [
  "The store pays only if hard problems recur; for this repo that is unproven (X-05), hence KS0 and the kill criteria.",
  "Natively, only blob probes run. They are text-pattern checks of a root-cause condition, not semantic proofs, and can be fooled by meaning that changes behind unchanged text. Control pairs and Opus review limit this; nothing eliminates it.",
  "Docker is off by default (AutoStart off), so test and database checks are usually inconclusive and many hits stop at candidate.",
  "Causes in remote resolvers (EAS cloud image, Railpack, Meta API) and in production data cannot be reproduced locally; they are always inconclusive (ex8 cause B, ex2's prod audit, ex4's prod cursor).",
  "Footprint under-capture (transitive dependencies, backend versions without a lockfile, policy outside config) can let a stale entry pass the footprint precondition; the gate is the remaining defence.",
  "Provider egress cannot be avoided: every card an agent reads reaches Anthropic (X-06, E-10.F31).",
  "Events are immutable: a secret that slips past the fail-closed scrubber means rotating it and rewriting history on every clone.",
  "Writer identity (--by) is self-declared; curated-verb separation is by convention plus review unless the owner adds deny rules.",
  "Claims are atomic on one host only and advisory across hosts; there is no lease policy before concurrent misses are observed (KS-R5).",
  "Cross-host freshness lags until the next `ks sync`, normally phase close; acceptable because a miss is cheap.",
  "Thresholds stay uncalibrated until KS7, and small samples bound only coarsely (0 in 40 means 7.5% or less).",
  "node:sqlite is a release candidate; a Node upgrade can change the API (better-sqlite3 as a fallback needs an install).",
  "CLI version skew between worktrees is handled by refusing writes and keeping per-version index files, not prevented.",
  "Pull-only by design: an agent that never looks up gets nothing; the §0 hook sentences are the only nudge.",
  "The owner must never: push the store to GitHub; edit, rename or delete journal files; rebase, squash, force-push or prune the store; add a merge driver; put the store or index on OneDrive, a share or a bind mount, or inside a repo; copy or commit an index; open the index with a SQLite older than 3.51.3; run stored checks by hand; paste production data into an entry; retire entries by deleting files."
 ],
 "load_bearing_claims": [
  {
   "id": "LB1",
   "claim": "One immutable content-hashed file per event merges with no conflicts and no merge driver across worktrees, branches and hosts; a journal conflict can only come from a hand edit.",
   "falsifiable_by": "A `ks sync` or the KS1 two-clone merge test stopping on a git conflict under events/ or lookups/ with no hand edit, or two hosts showing different journal digests after a successful sync.",
   "rests_on": "X-01.F20 (tested in a scratch repo: distinct files merge under squash and normal merges); E-09.F07, F29, F30; Fossil and git-bug precedent E-09.F05, F13."
  },
  {
   "id": "LB2",
   "claim": "Concurrent writers on one host need no lock for the journal: temp-then-rename of uniquely named files is safe on NTFS, including identical events from several processes.",
   "falsifiable_by": "KS1's 8-process stress test (1,000 events each, with duplicates) producing an error, a leftover temp file, or a file whose content hash differs from its name.",
   "rests_on": "My local test on 2026-11-02: 4 processes x 300 identical events, 0 errors, 300 files, no temp leftovers. This is not in the register; the critic had listed NTFS rename as untested. Index writes rest on E-01.F10, X-01.F10 and T-06 (WAL, BEGIN IMMEDIATE)."
  },
  {
   "id": "LB3",
   "claim": "Checking freshness on every CLI call (readdir, set difference, digest) is cheap enough that no daemon, watcher or git hook is needed.",
   "falsifiable_by": "A median freshness check above 50 ms at 5,000 events, or above 200 ms at 20,000 events, on the dev box.",
   "rests_on": "My benchmark on 2026-11-02: 5,000 files, median 5.96 ms, max 7.56 ms (not in the register). The failure of the daemon/auto-import alternative comes from E-09.F02, F03."
  },
  {
   "id": "LB4",
   "claim": "A rebuilt index is a pure function of the event set: folding in any order yields identical entry states, so per-host indexes converge after sync.",
   "falsifiable_by": "KS1's property test (100 shuffled ingest orders over the seed corpus) producing two different entry-table digests.",
   "rests_on": "T-02 fold implications; E-09.F13 (git-bug deterministic replay); the parents+lamport+id tiebreak is my design and not yet measured."
  },
  {
   "id": "LB5",
   "claim": "Runner-interpreted blob probes, which execute no stored code and need no Docker, discriminate the root cause on real historical commits for ex1, ex4, ex7 and ex8, and on one real side for ex2 and ex3.",
   "falsifiable_by": "Any control-pair side flipping when re-run in KS4/KS5, or a probe returning applies at its passes_at commit.",
   "rests_on": "R-02 ex7/ex8 verification; my read-only runs on 2026-11-02: ex7 FAIL at 140428c, OK at 79a8dd4 and HEAD; ex8 FAIL at 60c026d, OK at a6f9048 and HEAD; ex1 3 at 2fe77f5~1, 0 at 2fe77f5; ex4 absent at da988e2~1, present at da988e2; ex3 present at 542e28e and HEAD; ex2 0 duplicates at HEAD."
  },
  {
   "id": "LB6",
   "claim": "Requiring a passing control pair before an entry can be a lead keeps plausible-looking but non-discriminating checks out of the gate.",
   "falsifiable_by": "In the pilot or the prospective log, an acted false positive from an entry whose control pair passed (counted in v_gate_wrong, separately from refutes).",
   "rests_on": "X-02 (control pair, fail-on-pre-fix); M-03.F01, F07 (Getafix, SapFix). My run: a broader ex1 probe returns 1 at the fix commit (identity/security.py:44 compares ASCII hex) and fails its own control."
  },
  {
   "id": "LB7",
   "claim": "Validity computed per call against the caller's working tree gives each worktree the correct verdict from one shared store.",
   "falsifiable_by": "After P12a merges, a worktree at a pre-P12a commit and one at origin/main receiving the same ex3 verdict.",
   "rests_on": "T-02 code-state axis (F09, F16); X-01.F19 (worktrees share refs and objects); design. Not yet measured."
  },
  {
   "id": "LB8",
   "claim": "With the VPS unreachable, every verb except sync works locally with no added latency.",
   "falsifiable_by": "The KS8 blocked-remote drill showing a failure, or more than 1 s of added latency, in lookup, verify, record, claim or scan.",
   "rests_on": "X-01 implications (VPS unreachable); design (no network call on non-sync verbs)."
  },
  {
   "id": "LB9",
   "claim": "A phase-close `ks scan --at origin/main` with ex8's probe would have flagged the June recurrence on main before the burned EAS build: the probe returns FAIL at 60c026d, the main commit (PR #59) that re-introduced the plugin.",
   "falsifiable_by": "Re-running the app.json probe on the 60c026d blob and getting OK, or finding that build 15's failure did not involve that plugin.",
   "rests_on": "R-02 ex8 (cause and recurrence path from the commit messages); my run on 2026-11-02 (60c026d FAIL, and 60c026d is an ancestor of origin/main)."
  },
  {
   "id": "LB10",
   "claim": "The store adds no standing context: sessions that never call ks pay nothing beyond a skill description of 1,536 characters or less and the §0 hook sentences.",
   "falsifiable_by": "Injected tokens above 0 measured on sessions without a ks call, or the track adding any hook or always-loaded file.",
   "rests_on": "E-10.F17 (skill description cost); X-05.F12 and M-02 [32] (context files raise cost without gain); M-02.04 (hooks exist but are not used here)."
  }
 ],
 "risks": [
  "Low recurrence leaves the track's cost unrecovered; mitigated by KS0 first and the KS7/KS10 kill rules.",
  "Complexity creep toward Beads-classic (daemon, auto-import, merge driver), which its authors abandoned [E-09.F02, F03]. Design rules: no daemon, no hooks, no merge driver, freshness checked per call.",
  "Hand edits, deletes or a force-push in the store cause silent divergence. Ingest verifies hash = name, fsck quarantines, remotes are allow-listed, and the owner's never-list applies.",
  "A secret or PII in an immutable event forces a history rewrite on every clone. The scrubber fails closed and also runs on return; gitleaks is an owner decision.",
  "Poisoning or experience-following: agents copy near-matching records, wrong ones included [M-02.28; M-01.F26]. Mitigations: k=1 display, a mandatory gate, approval by an Opus session that is not the author, and writes only through the CLI.",
  "Docker unavailable most of the time leaves the value resting on blob probes; if those prove too coarse, the store yields mostly candidates.",
  "Co-locating the bare repo on the production VPS adds an SSH user to a production host. Mitigation: a dedicated user with git-shell and a key per host; alternatively host it on the home box.",
  "Ship-plan interference through Docker container names or concurrent gate sessions. Mitigation: ks-gate-<run_id> names, and KS6 scheduled when no backend Docker phase is in flight.",
  "The store drifting from the prose it came from becomes another projection [C-01]. Mitigation: link-never-restate (KS-R7), corrections as docs PRs, and CLAUDE.md slimmed only after the pilot.",
  "An owner who skips VPS sync for weeks leaves unpushed events on one disk. Mitigation: the unpushed count appears in every closing message.",
  "Windows path and EOL quirks (RT-07/09; core.autocrlf=true here) could break hashing or canonicalisation across hosts. Mitigation: '* -text', re-canonicalise before hashing, repo-relative POSIX paths, and golden fixtures run on both OSes at KS8.",
  "node:sqlite API churn on a Node upgrade. Mitigation: the Index port, a pinned Node major, and a rebuild from the journal after any driver swap."
 ]
}
```
