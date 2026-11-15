# architect:B

```json
{
 "shape": "B — Postgres-centric. One separate PostgreSQL 17 instance holds the whole store: a container fixflow-ks-pg (postgres:17-alpine, digest-pinned) on the dev box, started with --network none, no published port, its own named volume fixflow-ks-pgdata, its own roles and passwords, and a database named ks. Later, at stage 2, a second container with the same definition runs on the VPS. It is never the app database, never the compose or CI test database, never production and never Supabase. Retrieval uses tsvector, ts_stat and pg_trgm, with an IDF-weighted BM25F written by hand in SQL, because ts_rank has no IDF [T-03.F06; E-03.F01]. pgvector is held in reserve and not used. Agents reach the database only through `docker exec … psql`, driven by a zero-dependency Node CLI `ks` (no npm driver) and by an optional read-mostly MCP stdio server whose database role is SELECT-only.\n\nKS-R1 names SQLite as the query engine. This shape swaps that one engine and keeps the rest of KS-R1:\n- every lookup, fold and analytic runs in the database;\n- an append-only journal of immutable event files is the write-ahead log and transport. Each file is canonical JSON named by its content hash, and the journal is a git repo at C:/Users/User/.fixflow-ks/journal, outside every worktree. Agents never grep it.\n\nThe journal is written FIRST from day one. KS-R1 would allow an export-only journal at stage 0, but writing it first is what makes a stopped Docker lose no writes. It also makes Postgres disposable: a rebuild replaces backup restores and upgrades [E-03.F19].\n\nThe honest case for this shape:\n- At stage 0, E-03's verdict stands: for the same retrieval quality, an embedded engine costs less to operate.\n- The shape earns its cost through only two things:\n  1. Privilege separation enforced by the engine: SELECT-only and EXECUTE-only roles, SECURITY DEFINER write functions, and append-only triggers that also block TRUNCATE. E-03.F14 says read-only must be enforced at this layer, not in a wrapper.\n  2. From stage 2, one live server shared by both hosts. Claims, refutes and new entries written on one host are seen by the other on its next call, with no per-host index to merge [T-01 consistency target; T-06].\n- Secondary benefits: the same major version and tools as production (17, psql, pg_dump, the Appendix C restore image); SQL views for every analytic (KS-R6); and pg_trgm word_similarity, a bounded, query-normalised abstention feature.\n\nWhat the shape cannot remove:\n- Docker Desktop must be running. AutoStart is off, and agents may not start Docker (orchestration §8), so a lookup made while Docker is down is a logged miss.\n- There is a second stateful service to back up.\n- Ranking is written by hand.\n\nOn the dev box the store is not a separately managed always-on service: with --restart unless-stopped it is up whenever Docker is up. It is always on only on the VPS at stage 2.",
 "name": "ks — FixFlow known-error store on a separate Postgres (shape B)",
 "summary": "Shape B keeps the known-error store in its own Postgres 17 container (fixflow-ks-pg: no network, no port, own volume and passwords; never the app, test or production database, never Supabase). Every lookup, fold and statistic is SQL. Agents use one CLI, `ks`, which pipes JSON to psql inside the container, so nothing is installed with npm. Every write is first saved as a content-hashed event file outside the repository, so a stopped Docker loses nothing and the database can be rebuilt at any time. With Docker stopped (AutoStart is off), a lookup is a logged miss, which is safe. Nothing is acted on until `ks gate` reproduces the root cause on current code: file and JSON probes run without Docker, and tests run in a no-network container against a throwaway database. What Postgres buys: database roles that stop the read-only surface from writing, and later one live store that both hosts share. What it costs: Docker must be running, a second service to back up, and hand-written ranking because Postgres has no IDF. If neither benefit matters to you, this shape costs more than it returns; the journal makes changing engines a rebuild.",
 "data_model": {
  "entry_fields": [
   {
    "name": "entry_id",
    "type": "text 'KS-' + 26-char ULID, immutable",
    "why": "Stable identity that survives revisions, forks and rebuilds. PR bodies and CLAUDE.md one-liners link to it.",
    "prior_art": "Immutable identity plus event stream [T-02.F01]; KCS article id [X-04.F17]"
   },
   {
    "name": "kind",
    "type": "enum defect | trap | guard | do_not_apply | open_defect",
    "why": "Do-not-apply entries and still-open defects are first-class (ex6, ex3), and the kind sets the gate polarity",
    "prior_art": "KS-R9; R-02 ex6; ITIL KEDB known error vs problem [T-05.F15]"
   },
   {
    "name": "title",
    "type": "text, symptom-first",
    "why": "What an agent recognises in a one-line card; written from the symptom, not the cause",
    "prior_art": "ITIL KEDB symptom-first title [T-05.F15]"
   },
   {
    "name": "symptom (facet)",
    "type": "jsonb {_v, raw_scrubbed[], canonical[{template, sha256, recipe_version}], tool, phase, command, meaning normal|ambiguous|misleading|benign, observation observed_in_prod|observed_locally|reproduced|predicted, paraphrases[], surfaced_by}",
    "why": "Fuzzy keys need verbatim text, canonical templates and tool/phase/command context. Some symptoms mislead (the railway up --ci timeout is benign) and some were only predicted (ex2, ex4).",
    "prior_art": "Quote errors verbatim [X-04.F18]; raw text beside canonical form [T-04.F12]; tool+phase+command context [T-04.F25,F26]; doc2query paraphrases [E-07.F07]"
   },
   {
    "name": "manifestation_conditions",
    "type": "jsonb array of conditions",
    "why": "A single root cause is a hindsight artefact; the entry records when the cause shows itself",
    "prior_art": "Cook [T-05.F21]"
   },
   {
    "name": "root_cause",
    "type": "jsonb {statement, mechanism, evidence_tier verified|reported|inferred, evidence_refs[]}",
    "why": "The reusable explanation, carrying the evidence grade this repository already uses",
    "prior_art": "CBR case = problem + solution + outcome + derivation [T-05.F3]"
   },
   {
    "name": "diagnosis_path",
    "type": "jsonb ordered [{step, observation, evidence_ref}]",
    "why": "The expensive thing to save: how the cause was found, so a cheap agent can retrace it",
    "prior_art": "CBR derivation annotations [T-05.F3]; ReasoningBank distilled strategies [M-02.26]"
   },
   {
    "name": "failed_approaches",
    "type": "jsonb {_v, items[{approach, why_failed, cause_class wrong_premise|incomplete|worse_than_bug|unverifiable|env_specific, evidence, scope_footprint_id, refuting_check_id?}]}",
    "why": "Negative results are the second expensive thing. Each one is scoped to the footprint it was observed on and may carry an executable refutation.",
    "prior_art": "Negative caching per RFC 2308 / RFC 8767 [T-01.F11,F12,F14]; KS-R2; failure lessons in ReasoningBank [M-02.26]; KCS has no such field [X-04]"
   },
   {
    "name": "fix",
    "type": "jsonb {kind permanent|workaround|guard|do_not_apply|none_yet, steps[], fix_commits[mainline], patch_id, forbidden_change, owner_phase_link}",
    "why": "Separates a workaround from a permanent fix. Do-not-apply entries record the forbidden change. Open defects link to the plan phase that owns the fix (ex3 → P12a) instead of restating it.",
    "prior_art": "ITIL workaround vs permanent fix [T-05.F15]; git patch-id [T-02.F18]; KS-R7"
   },
   {
    "name": "validity",
    "type": "jsonb {introduced?, fixed?, dep_ranges[], platform[]}",
    "why": "Applies-while predicates that can be evaluated over git and lockfiles",
    "prior_art": "OSV GIT ranges [T-02.F13]; Linux Fixes: tags, Sentry resolved-in-release [M-03.F24]"
   },
   {
    "name": "checks",
    "type": "rows in ks.check_spec (kind, polarity, spec, control) plus ks.check_approval",
    "why": "The discriminating gate; no entry is lead-eligible without an approved check whose control pair was demonstrated",
    "prior_art": "X-02 gate contract; elastic-recheck test_ids [X-04.F03]; Getafix re-runs the signal tool [M-03.F01]"
   },
   {
    "name": "footprint_id",
    "type": "text sha256 → ks.footprint + ks.footprint_item",
    "why": "The verifying trace that event-driven invalidation compares against current code",
    "prior_art": "Verifying traces, Build Systems à la Carte / Shake [T-01.F01,F02]; X-03 capture"
   },
   {
    "name": "observed_commit",
    "type": "text, 40-hex mainline SHA",
    "why": "Code-state axis and an anchor that survives squash merges; branch SHAs are rejected",
    "prior_art": "T-02.F15,F20; X-01"
   },
   {
    "name": "links",
    "type": "jsonb {prs[], commits[], docs[path#section], register_ids[], plan_phase}",
    "why": "Link, never restate: the store owns diagnoses and negatives only",
    "prior_art": "KS-R7; KCS machine-usable links [X-04.F21]"
   },
   {
    "name": "cost",
    "type": "jsonb {tier_escalated_to, model_ids[], tokens{in,out,cache_r,cache_w}, wall_s, status per field measured|partial|estimated|unavailable}",
    "why": "The only way 'cost saved' can ever be computed; unknown values are NULL, never 0",
    "prior_art": "X-05 logging spec; RT-06 [C-01.F29]"
   },
   {
    "name": "scrub",
    "type": "jsonb {tools+versions, ruleset_sha256, scrubbed_at}",
    "why": "A scrubber ruleset change triggers a re-scrub as an event",
    "prior_art": "X-06"
   },
   {
    "name": "actor (on every event)",
    "type": "jsonb {model_id, tier, session_id, agent_id, worktree, host, cli_sha}",
    "why": "Explicit writer identity; never inferred from the session id",
    "prior_art": "C-01.F45"
   },
   {
    "name": "status (derived, never stored)",
    "type": "fold result: provisional | validated | needs_reverify | needs_review | suppressed@footprint | open | superseded | withdrawn | archived | unverified_seed",
    "why": "Events are the only truth; status is a pure function of the event set",
    "prior_art": "KCS WIP → Not Validated → Validated → Archived [X-04.F17]; T-02 fold"
   },
   {
    "name": "counters (derived)",
    "type": "confirmed / refuted / gate_wrong / inconclusive counts, with denominators",
    "why": "Feedback merged by code and shown on the card",
    "prior_art": "ACE helpful/harmful counters [M-02.29]; raw counts with denominators [X-04.F20]"
   }
  ],
  "handle_types": [
   {
    "kind": "H1 template (exact)",
    "how_built": "The CLI scrubs the raw text, runs canonicaliser recipe vN to get the canonical template, and stores its sha256 with the recipe_version. Several templates per entry: each symptom variant, e.g. ex1's TypeError message and its RangeError sibling.",
    "how_matched": "btree equality on (htype, value_hash) for every template the CLI derives from the query",
    "failure_mode": "Brittle: one unmasked parameter, or a message reworded by a library upgrade, misses. A recipe change orphans the handle (re-derived from the stored raw text as events). One template can come from several causes, e.g. one alembic CommandError for different states [T-04.F26]; such handles are flagged meaning=ambiguous and never make a lead alone."
   },
   {
    "kind": "H1f template (fuzzy)",
    "how_built": "Same stored canonical value as H1",
    "how_matched": "pg_trgm word_similarity(handle.value, query canonical text). The result is bounded 0..1 and normalised by the handle's own trigram count, not by corpus statistics. A sequential scan costs milliseconds at this size, so index direction does not matter.",
    "failure_mode": "pg_trgm ignores non-alphanumerics [E-03.F03], so messages that differ only in punctuation or operators collide. Very short templates have few trigrams. Handling of non-ASCII letters is unverified (fixture in KS-1)."
   },
   {
    "kind": "H2 tool_code",
    "how_built": "(tool, phase, error code or exception class), e.g. (python, runtime, TypeError) or (eas, gradle, EAS_BUILD_UNKNOWN_GRADLE_ERROR), taken from the per-tool adapter",
    "how_matched": "exact equality",
    "failure_mode": "Over-merges: TypeError is generic, and EAS_BUILD_UNKNOWN_GRADLE_ERROR had two independent causes in ex8. It ranks, but never leads alone (bias toward splitting [T-04])."
   },
   {
    "kind": "H3 frame_sig",
    "how_built": "Top 3 in-app module::function frames, repo-relative, consecutive duplicates collapsed, framework frames removed by a changelogged skip-list; never line numbers [T-04.F08,F09]",
    "how_matched": "exact, or 2 of 3 frames",
    "failure_mode": "Refactors that rename functions break it. Minified Hermes frames carry no names (falls back to H1/H2 [T-04.F32]). Async frames reorder."
   },
   {
    "kind": "H4 command",
    "how_built": "Normalised command + cwd class + tool version, e.g. `railway up` @repo-root or `eas build --profile production`",
    "how_matched": "exact on the normalised form",
    "failure_mode": "The command usually succeeds, so H4 never makes a lead. Benign-looking failures need meaning=benign so the card says 'do not retry' (railway up --ci timeout [T-04.F25])."
   },
   {
    "kind": "H5 prose",
    "how_built": "tsvector over the CLI's pre-tokenised text. Weights: title A, templates and paraphrases A/B, cause and conditions C, diagnosis and failed approaches D. Built with to_tsvector('ks.code', …), plus 'english' stems on the prose fields.",
    "how_matched": "Hand-written BM25F with corpus IDF from ts_stat, plus IDF-weighted coverage",
    "failure_mode": "Vocabulary mismatch, worst for silent symptoms (ex3 'double charge' vs 'duplicate payment row'). IDF is unstable below about 50 entries. Candidate only [T-03; T-04.F19]."
   },
   {
    "kind": "H6 anchor",
    "how_built": "Repo-relative path, symbol, config pointer (technician-app/eas.json#/build/*/env, technician-app/app.json#/expo/plugins) or dependency name. Taken from the fix diff, the check's own targets and the diagnosis.",
    "how_matched": "exact/prefix match against paths extracted from the error and stack, from --paths, or from `ks guard <paths>` before an edit",
    "failure_mode": "Renames break it (caught as footprint drift). Hot files (AppContext.jsx, jobs/service.py) anchor many entries. An anchor can lead only for do_not_apply entries in guard mode, and only into the gate."
   },
   {
    "kind": "proposed (any type)",
    "how_built": "Filed by feedback: a confirmed query's template, or a refuted lookup's 'not when' discriminator",
    "how_matched": "Not matched at all while state=proposed. Becomes active via proposal_accepted from a reviewer, or after two independent confirmations (KS-R3).",
    "failure_mode": "If the activation rule were bypassed this would be the memory-poisoning route [M-01.F26; X-02.F21]"
   }
  ],
  "history_model": "Truth is append-only events, mirrored one-to-one between the journal and ks.entry_event. The journal holds one canonical-JSON file per event, named by the sha256 of its bytes (KS-R1, KS-R8). ks.entry holds only the immutable identity: id, kind and creating event.\n\nTwo event classes (KS-R3):\n- Semantic: recorded, revised, handle_added/removed, check_added, check_approved, merge, superseded, withdrawn, archived, restored, proposal_accepted/rejected. Written only through the reviewer role.\n- Mechanical: confirmed, refuted, inconclusive, invalidated, reaffirmed, attempt, proposal. Any tier may write them, with evidence; a CHECK requires a gate_run_id on confirmed, refuted and reaffirmed.\n\nSemantic events form a per-entry DAG through `parents`, the head(s) the writer last read (git-bug's operation DAG [E-09.F02]). One head is the current version. Two heads are a fork, and the fold shows needs_review until a reviewer writes a `merge` naming both, so an offline writer never silently overwrites.\n\nMechanical events commute (set union, the G-Set behaviour [T-06]). Their effect comes from deterministic, precision-biased fold rules:\n- A refute observed on footprint F suppresses the entry for F and dominates any confirm on F (KS-R2).\n- An `invalidated` event (footprint drift) since the last `reaffirmed` makes the entry needs_reverify.\n- `reaffirmed` needs a gate run on current mainline with a non-vacuous verdict and, where the check has one, a firing inject-control (early cutoff / backdating [T-01.F02]).\n- superseded, withdrawn and archived entries leave retrieval but stay readable; `restored` reverses archived (KCS).\n\nThe fold is a pure function of the event SET. No rule orders by wall clock; recorded_at is display only [T-02.F09]. So `ks rebuild` from the journal reproduces the identical state.\n\nLookups, gate runs and outcomes have their own journaled tables, so analytics never pollute entry history [T-02]. Outcomes are a typed link table (resolved / referenced / refuted / missed_existing / gate_wrong) bound to the entry head event id, i.e. the version delivered [X-04.F21].\n\nNothing is deleted. Entries retire by status (ITIL/KCS [T-05.F15]). A refute is itself an event every later fold sees, so a stale writer cannot resurrect a refuted entry; it acts as a tombstone [T-01.F20].",
  "provenance_model": "Every event, lookup, outcome and gate run carries:\n- actor {model_id, tier, session_id, agent_id, worktree, host, cli_sha}, set explicitly by the caller and required (the CLI refuses writes without it). Subagent hooks fire with the main session id, so identity is never inferred from it [C-01.F45].\n- observed_commit: a mainline SHA, checked with `git merge-base --is-ancestor <sha> origin/main` at write. A branch-only SHA keeps the entry provisional until `ks promote` records the squash SHA [T-02.F20; X-01].\n- footprint_id: immutable and content-hashed.\n- gate_run_id on mechanical verdicts. The gate_run row records runner_version, sandbox profile, the spec sha256, repo_sha, tree_clean, the result-artifact sha256 and every attempt [X-02].\n- recipe_version on derived handles, and the scrubber identity, so a recipe or ruleset change becomes re-derive and re-scrub events [T-04.F12; X-06].\n- evidence tiers (verified / reported / inferred) on root-cause and dependency claims.\n- links (PR, commit, doc path, register id) instead of restated text (KS-R7).\n\nNaming follows PROV/OpenLineage only: parents = wasRevisionOf, an invalidated event = wasInvalidatedBy, typed facets with _v [T-02.F01,F03]. No graph store and no lineage server. No hash chain in v1 (KS-R8).\n\nHonest limit: identity is self-reported by the CLI on one OS user. Provenance attributes honest writes and catches accidents; it does not authenticate a hostile agent.",
  "negative_results_model": "Three kinds of negative knowledge. All are first-class, and all are leads, not prohibitions (RFC 8767 [T-01.F12,F14]).\n\n(1) Failed approaches inside an entry. Each item records the approach, why it failed, a cause class, the evidence and the footprint it was observed on. ks.v_negative exposes them as rows, and the card shows the top one as 'tried before, failed because'. Where possible a refuting check is stored with the item, so a later agent verifies the negative on current code instead of trusting it:\n- ex3: the naive useState patch, plus a Vitest assertion that a second legitimate payment after close/reopen gets a new id;\n- ex6: HANDOFF A2's patch, plus the protective integration test.\nThese are distilled, condition-scoped lessons with a cause class, not raw traces (ReasoningBank gained, AWM lost with raw failures [M-02.26]).\n\n(2) Refutes of an entry. A `refuted` event comes only from a non-vacuous gate run and is scoped to the footprint it was observed on. The entry is suppressed for that footprint, becomes needs_reverify when the footprint changes (KS-R2), and is never deleted.\n\n(3) do_not_apply entries. The whole entry is the negative (ex6). `ks guard <paths>` returns it before an edit, and its gate has blocks_when_fails polarity.\n\nA plain miss is never stored as a claim that nothing is known (RFC 2308's narrowest-key rule [T-01.F11]). It is a lookup_event, linked later as missed_existing if an entry turns out to have existed.\n\n`ks attempt` events, recorded while a claim is open, are negative results that survive a crashed or compacted session.",
  "footprint_model": "A footprint is an immutable, content-hashed set of typed items. `ks capture` records it once, when an entry is recorded or reaffirmed; the owner never lists items by hand [X-03]. Each item carries a provenance tier:\n1. fix_diff: files changed by the mainline fix commit (`git diff --name-only <fix>^ <fix>`).\n2. check_target: every path, test id and JSON pointer the entry's checks read. For probes this is exactly the causal set, and the cheapest high-confidence tier.\n3. read: files the diagnosing session read, from the agent's declared list or an optional post-hoc parse of its transcript. This is the cognitive set: it over-captures and gets low weight [X-03.F08,F10].\n4. env_probed: a fixed platform probe covering Node major, Expo SDK and RN from technician-app/package.json, Python and alembic in the gate image, Postgres major, and gate image digests.\n5. dep_version: lockfile-resolved versions of named packages. For the backend, pyproject has open ranges and no lockfile, so the gate image's recorded `pip freeze` is used and tagged tool_reported.\n6. config_key: sha256 of the canonical JSON value at a pointer (app.json#/expo/plugins, eas.json#/build), not a whole-file hash [X-03.F24].\n7. tool_resolution: lines from pasted tool output for remote resolvers (EAS image name, Railpack provider lines) [X-03.F19,F20].\n8. check_spec: the spec's own hash, so editing a check is drift.\n\nValues are git blob OIDs at the observed commit. The repo's .gitattributes normalises text to LF, so Windows and Linux agree. Working-tree bytes are never used (RT-04), and locators are repo-relative POSIX (RT-07).\n\nCoverage-derived 'executed' items and function-level symbol hashes are deferred (owner decision on coverage dev-deps). Whole-file items over-invalidate, which costs a re-verification, never a false positive. An item is pruned only on evidence [X-03].",
  "ddl_or_schema_sketch": "-- Instance: container fixflow-ks-pg = postgres:17-alpine@sha256:<pinned in KS-1>, --network none (loopback only), no -p,\n--   --restart unless-stopped, --memory 256m, volume fixflow-ks-pgdata, -c shared_buffers=32MB -c max_connections=20\n-- Access only: docker exec -i -e PGPASSWORD fixflow-ks-pg psql -X -q -At -v ON_ERROR_STOP=1 -U <role> -d ks\n--   payload = one function call whose JSON argument is a dollar-quoted literal with a fresh random tag absent from the payload\n-- pg_hba.conf: local all postgres peer ; local ks ks_reader,ks_agent,ks_reviewer scram-sha-256 ; no host lines\nCREATE DATABASE ks;  -- then connect to ks\nCREATE EXTENSION pg_trgm;                                   -- trusted contrib [E-03.F03]\nCREATE ROLE ks_owner NOLOGIN;\nCREATE ROLE ks_reader LOGIN; CREATE ROLE ks_agent LOGIN; CREATE ROLE ks_reviewer LOGIN;  -- passwords from ks up --init\nREVOKE ALL ON DATABASE ks FROM PUBLIC; REVOKE ALL ON SCHEMA public FROM PUBLIC;\nCREATE SCHEMA ks AUTHORIZATION ks_owner;\nGRANT CONNECT ON DATABASE ks TO ks_reader, ks_agent, ks_reviewer;\nGRANT USAGE ON SCHEMA ks TO ks_reader, ks_agent, ks_reviewer;\nCREATE TEXT SEARCH CONFIGURATION ks.code (COPY = pg_catalog.simple);   -- input pre-tokenised by the CLI\nCREATE TABLE ks.meta (k text PRIMARY KEY, v jsonb NOT NULL);         -- schema_v, min_cli_sha, recipe_version, threshold_version\n\n-- ===== TRUTH: 1:1 with journal files; INSERT only, only through ks.ingest(raw) =====\nCREATE TABLE ks.entry (\n  entry_id text PRIMARY KEY CHECK (entry_id ~ '^KS-[0-9A-HJKMNP-TV-Z]{26}$'),\n  kind text NOT NULL CHECK (kind IN ('defect','trap','guard','do_not_apply','open_defect')),\n  created_event text NOT NULL);\nCREATE TABLE ks.footprint (\n  footprint_id text PRIMARY KEY CHECK (footprint_id ~ '^[0-9a-f]{64}$'),\n  observed_commit text NOT NULL CHECK (observed_commit ~ '^[0-9a-f]{40}$'),\n  on_mainline boolean NOT NULL);\nCREATE TABLE ks.footprint_item (\n  footprint_id text NOT NULL REFERENCES ks.footprint,\n  item_kind text NOT NULL CHECK (item_kind IN ('blob','config_key','dep_version','platform','tool_resolution','check_target','check_spec','symbol')),\n  locator text NOT NULL,      -- 'technician-app/app.json#/expo/plugins', 'npm:expo-location', 'platform:expo_sdk'\n  value_hash text,            -- blob OID | sha256(canonical JSON value) | version; NULL = absent at capture\n  tier text NOT NULL CHECK (tier IN ('fix_diff','check_target','executed','read','env_probed','tool_reported','lookup_chain')),\n  PRIMARY KEY (footprint_id, item_kind, locator));\nCREATE TABLE ks.gate_run (\n  gate_run_id text PRIMARY KEY,                     -- runner nonce\n  check_id text NOT NULL, repo_sha text NOT NULL, tree_clean boolean NOT NULL,\n  run_role text NOT NULL CHECK (run_role IN ('act','control_fail','control_pass','inject','reaffirm')),\n  verdict text NOT NULL CHECK (verdict IN ('applies','not_applies','inconclusive')),\n  reason_code text, evidence jsonb NOT NULL, attempts jsonb NOT NULL,\n  runner_version text NOT NULL, sandbox_profile text, duration_ms integer, result_artifact_sha256 text,\n  actor jsonb NOT NULL, recorded_at timestamptz NOT NULL);\nCREATE TABLE ks.entry_event (\n  event_id text PRIMARY KEY CHECK (event_id ~ '^[0-9a-f]{64}$'),   -- sha256 of the journal file bytes [KS-R8]\n  entry_id text NOT NULL REFERENCES ks.entry,\n  kind text NOT NULL CHECK (kind IN (\n    'recorded','revised','handle_added','handle_removed','check_added','check_approved','merge',\n    'superseded','withdrawn','archived','restored','proposal_accepted','proposal_rejected',        -- semantic: ks_reviewer\n    'confirmed','refuted','inconclusive','invalidated','reaffirmed','attempt','proposal')),        -- mechanical/proposal: any tier\n  parents text[] NOT NULL DEFAULT '{}',   -- semantic heads the writer read; two heads = fork = needs_review\n  actor jsonb NOT NULL,                   -- {model_id,tier,session_id,agent_id,worktree,host,cli_sha}\n  observed_commit text, footprint_id text REFERENCES ks.footprint,\n  gate_run_id text REFERENCES ks.gate_run, claim_seq bigint,\n  facets jsonb NOT NULL DEFAULT '{}',     -- {'symptom':{'_v':1,...},'failed_approaches':{'_v':1,'items':[...]},...}\n  recorded_at timestamptz NOT NULL,       -- display only\n  ingested_at timestamptz NOT NULL DEFAULT now(),\n  CHECK (kind NOT IN ('confirmed','refuted','reaffirmed') OR gate_run_id IS NOT NULL));\nCREATE INDEX ON ks.entry_event (entry_id, kind);\nCREATE TABLE ks.lookup_event (\n  lookup_id text PRIMARY KEY, actor jsonb NOT NULL, at_commit text,\n  store_status text NOT NULL CHECK (store_status IN ('ok','unavailable','ro_mcp')),\n  query jsonb NOT NULL,          -- scrubbed raw, templates+hashes, recipe_version, tool/phase/command, paths, lexemes\n  candidates jsonb NOT NULL,     -- internal depth <= 20 with every feature [KS-R4]\n  shown jsonb NOT NULL,          -- <= 1 lead + <= 1 candidate\n  verdict text NOT NULL CHECK (verdict IN ('miss','candidate','lead')),\n  threshold_version integer, claim_seen bigint,\n  cost jsonb NOT NULL DEFAULT '{}',   -- tokens/model/tier/wall; NULL + status when unknown [RT-06]\n  recorded_at timestamptz NOT NULL);\nCREATE TABLE ks.outcome (\n  outcome_id text PRIMARY KEY, lookup_id text REFERENCES ks.lookup_event,\n  entry_id text NOT NULL REFERENCES ks.entry, entry_head text NOT NULL,   -- head event = version delivered\n  link text NOT NULL CHECK (link IN ('resolved','referenced','refuted','missed_existing','gate_wrong')),\n  gate_run_id text REFERENCES ks.gate_run, actor jsonb NOT NULL, recorded_at timestamptz NOT NULL);\nCREATE FUNCTION ks.forbid() RETURNS trigger LANGUAGE plpgsql AS\n  $$BEGIN RAISE EXCEPTION 'ks is append-only: % on %', TG_OP, TG_TABLE_NAME; END$$;\n-- repeated for entry, footprint, footprint_item, gate_run, entry_event, lookup_event, outcome:\nCREATE TRIGGER no_mutation BEFORE UPDATE OR DELETE ON ks.entry_event FOR EACH ROW EXECUTE FUNCTION ks.forbid();\nCREATE TRIGGER no_truncate BEFORE TRUNCATE ON ks.entry_event FOR EACH STATEMENT EXECUTE FUNCTION ks.forbid();\n\n-- ===== PROJECTIONS: written only inside ks.ingest(), rebuilt by ks.rebuild_projections(), compared by ks doctor =====\nCREATE TABLE ks.check_spec (\n  check_id text PRIMARY KEY,   -- sha256 of canonical spec\n  entry_id text NOT NULL REFERENCES ks.entry,\n  kind text NOT NULL CHECK (kind IN ('tree_probe','json_probe','db_probe','test_id','scripted','remote_inspect')),\n  polarity text NOT NULL CHECK (polarity IN ('applies_when_matches','applies_when_fails','blocks_when_fails')),\n  spec jsonb NOT NULL,         -- argv arrays, globs, patterns, JSON pointers, SQL as data; never a shell string\n  control jsonb NOT NULL,      -- {fail_side:{sha|fixture|patch}, pass_side:{sha|patch}, inject?:{...}}\n  author jsonb NOT NULL, source_event text NOT NULL);\nCREATE TABLE ks.check_approval (\n  check_id text NOT NULL REFERENCES ks.check_spec, approver jsonb NOT NULL,\n  control_fail_run text NOT NULL REFERENCES ks.gate_run, control_pass_run text NOT NULL REFERENCES ks.gate_run,\n  source_event text NOT NULL, PRIMARY KEY (check_id, source_event));\nCREATE TABLE ks.handle (\n  handle_id text PRIMARY KEY,  -- adding event id + ordinal = OR-set tag [T-06]\n  entry_id text NOT NULL REFERENCES ks.entry,\n  htype text NOT NULL CHECK (htype IN ('template','tool_code','frame_sig','command','anchor','prose')),\n  value text NOT NULL, value_hash text NOT NULL, recipe_version integer,\n  meaning text NOT NULL DEFAULT 'normal' CHECK (meaning IN ('normal','ambiguous','misleading','benign')),\n  state text NOT NULL CHECK (state IN ('active','proposed','removed')), source_event text NOT NULL);\nCREATE INDEX handle_exact ON ks.handle (htype, value_hash) WHERE state = 'active';\nCREATE INDEX handle_trgm ON ks.handle USING gin (value gin_trgm_ops) WHERE state = 'active';\nCREATE TABLE ks.search_doc (\n  entry_id text PRIMARY KEY REFERENCES ks.entry, head_event text NOT NULL,\n  doc tsvector NOT NULL,     -- setweight A title+templates, B paraphrases, C cause+conditions, D diagnosis+failed approaches\n  plain text NOT NULL);      -- pg_trgm similarity() near-duplicate warning at write [T-03.F15]\nCREATE INDEX search_doc_fts ON ks.search_doc USING gin (doc);\n\n-- ===== COORDINATION and PARAMETERS (not truth) =====\nCREATE TABLE ks.claim (\n  claim_seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,   -- fencing token [T-06.F13]\n  signature text NOT NULL, holder jsonb NOT NULL, draft_entry text REFERENCES ks.entry,\n  acquired_at timestamptz NOT NULL DEFAULT now(), released_at timestamptz);\nCREATE UNIQUE INDEX one_open_claim ON ks.claim (signature) WHERE released_at IS NULL;\nCREATE TABLE ks.threshold (version integer PRIMARY KEY, params jsonb NOT NULL, set_by jsonb NOT NULL, set_at timestamptz NOT NULL DEFAULT now());\nCREATE TABLE ks.negative_corpus (sample_id text PRIMARY KEY, tool text, text_scrubbed text NOT NULL, source text NOT NULL);\n\n-- ===== READ SURFACE =====\nCREATE VIEW ks.v_status AS ...;   -- the fold: semantic heads/fork, approved checks, refuted footprints, invalidated vs reaffirmed -> status, counters\nCREATE VIEW ks.v_negative AS\n  SELECT e.entry_id, x.ord, x.item->>'approach' AS approach, x.item->>'why_failed' AS why_failed,\n         x.item->>'cause_class' AS cause_class, x.item->>'scope_footprint_id' AS scope_footprint\n  FROM ks.entry_event e JOIN ks.search_doc s ON s.head_event = e.event_id\n  CROSS JOIN LATERAL jsonb_array_elements(e.facets->'failed_approaches'->'items') WITH ORDINALITY AS x(item, ord);\nCREATE VIEW ks.v_reuse AS\n  SELECT entry_id, count(*) AS n, count(*) FILTER (WHERE link='resolved') AS resolved,\n         count(*) FILTER (WHERE link='refuted') AS refuted, count(*) FILTER (WHERE link='gate_wrong') AS gate_wrong\n  FROM ks.outcome GROUP BY entry_id;\nCREATE VIEW ks.v_lookup_quality AS\n  SELECT date_trunc('week', recorded_at) AS wk, verdict, store_status, count(*) AS n FROM ks.lookup_event GROUP BY 1, 2, 3;\n\n-- ranking core inside ks.lookup(q jsonb): BM25F with corpus IDF from ts_stat\n--   WITH ql AS (SELECT DISTINCT jsonb_array_elements_text(q->'lexemes') AS lex),\n--   st AS (SELECT count(*)::float8 AS n, avg(length(doc))::float8 AS avgdl FROM ks.search_doc),\n--   idf AS (SELECT word, ln((st.n - ndoc + 0.5) / (ndoc + 0.5) + 1) AS w\n--           FROM ts_stat('SELECT doc FROM ks.search_doc'), st WHERE word IN (SELECT lex FROM ql)),\n--   tf AS (SELECT s.entry_id, u.lexeme, length(s.doc)::float8 AS dl,\n--            sum(CASE wt WHEN 'A' THEN 3 WHEN 'B' THEN 2 WHEN 'C' THEN 1 ELSE 0.5 END) AS wtf\n--          FROM ks.search_doc s CROSS JOIN LATERAL unnest(s.doc) u CROSS JOIN LATERAL unnest(u.weights) wt\n--          WHERE u.lexeme IN (SELECT lex FROM ql) GROUP BY 1, 2, 3)\n--   SELECT tf.entry_id,\n--          sum(idf.w * tf.wtf * 2.2 / (tf.wtf + 1.2 * (0.25 + 0.75 * tf.dl / st.avgdl))) AS bm25f,   -- k1=1.2, b=0.75\n--          sum(idf.w) / NULLIF((SELECT sum(w) FROM idf), 0) AS coverage                                   -- [T-03.F26]\n--   FROM tf JOIN idf ON idf.word = tf.lexeme CROSS JOIN st GROUP BY tf.entry_id;\n--   trgm: SELECT entry_id, max(word_similarity(value, q->>'canonical')) FROM ks.handle\n--         WHERE state = 'active' AND htype IN ('template','command') GROUP BY 1;\n\n-- ===== FUNCTIONS: SECURITY DEFINER, owner ks_owner, SET search_path = ks, pg_catalog =====\n-- ks.ingest(raw text) -> jsonb : id := sha256(raw bytes); kind gated on session_user; FOR UPDATE on ks.entry;\n--     parents vs current heads; transition table; INSERT ... ON CONFLICT (event_id) DO NOTHING; projections;\n--     returns {ok | duplicate | conflict{heads} | fork}\n-- ks.lookup(q jsonb) -> jsonb (logs lookup_event) ; ks.lookup_ro(q jsonb) -> jsonb STABLE (no write)\n-- ks.drift(entry_ids text[], current jsonb) -> jsonb ; ks.try_claim(sig text, holder jsonb) -> jsonb ; ks.release_claim(seq bigint)\n-- ks.rebuild_projections()  (owner only)\nREVOKE ALL ON ALL TABLES IN SCHEMA ks FROM PUBLIC, ks_reader, ks_agent, ks_reviewer;\nGRANT SELECT ON ks.v_status, ks.v_negative, ks.v_reuse, ks.v_lookup_quality TO ks_reader, ks_agent, ks_reviewer;\nGRANT EXECUTE ON FUNCTION ks.lookup_ro(jsonb) TO ks_reader;\nGRANT EXECUTE ON FUNCTION ks.ingest(text), ks.lookup(jsonb), ks.drift(text[], jsonb),\n  ks.try_claim(text, jsonb), ks.release_claim(bigint) TO ks_agent, ks_reviewer;\n\n-- Journal (truth transport): C:/Users/User/.fixflow-ks/journal/{events,lookups,gate-runs,outcomes}/<2 hex>/<sha256>.json\n--   canonical JSON (sorted keys, UTF-8, LF); git repo, .gitattributes '* text eol=lf'; never a code-repo remote"
 },
 "retrieval": {
  "canonicalisation": "Scrubbing comes first, then canonicalisation. Both run in the CLI's Node process, before anything reaches Postgres or model context (X-06).\n\nRecipe v1 is an ordered, deterministic mask pipeline [T-04.F01,F05,F10]:\n- Sentry-parameterizer order: timestamps, UUIDs, hex of 7+ characters, validated IPs/hosts, absolute paths rewritten to repo-relative POSIX, user-profile paths, numbers.\n- One or two Drain-style domain regexes: Alembic revision ids, EAS build ids, Railway deploy ids.\n- Left unmasked: error codes, exception class names, tool names, task/phase names, file basenames.\n- Stack traces are keyed on in-app module::function, top 3, with consecutive duplicates collapsed, a changelogged skip-list for framework frames, and never line numbers [T-04.F08,F09; M-03.F12].\n- Per-tool adapters prefer structured output: pytest --junitxml, Jest/Vitest --json, Alembic output, Docker --progress=plain. EAS and Railway adapters are added only after real samples exist [T-04.F27-F29].\n\nPer query, the CLI emits:\n- canonical template(s) and their sha256 (H1);\n- tool/phase/code (H2);\n- frame signature (H3);\n- command context (H4);\n- anchors from paths, symbols and config pointers in the text, plus --paths (H6);\n- a pre-tokenised lexeme list for FTS: lower-case, split on non-alphanumerics, and identifiers also emitted joined (compare_digest → compare, digest, comparedigest). It goes through to_tsvector('ks.code', …) identically on the document and query sides, so Postgres's default-parser token types (host, file, version) cannot split the two sides differently. That parser behaviour is not in the register and is pinned by a fixture.\n\nThe scrubbed raw text is kept beside every derived key with its recipe_version. A recipe change re-derives all handles from raw as handle_added/removed events (WER/Socorro re-bucketing [T-04.F12,F13; M-03.F13]). The recipe is code with golden fixtures [T-04.F31]. `ks search '<words>'` (human browsing only) uses websearch_to_tsquery, which never errors on arbitrary text [E-03.F02].",
  "prefilter": "Deterministic and explainable, before any scoring [T-03 pipeline; E-06.F21]:\n1. Status: drop superseded, withdrawn and archived entries. unverified_seed and provisional entries may fill only the candidate slot. Drop entries suppressed for the query's footprint, i.e. refuted on identical current item hashes (KS-R2).\n2. Facets: runtime/tool/platform must not contradict. An android-only trap is not offered for a web failure. A platform item that differs (e.g. Expo SDK 52 vs current) gives a STALE label and caps the entry at candidate.\n3. Exact-handle tier: H1 template hash, H2 tool_code, H3 frame signature, and H6 anchors from paths in the error, the stack or --paths, all by btree equality.\n4. Probe-in-lookup. For the top 5 internal candidates with an approved in-process probe (tree_probe/json_probe), the CLI evaluates the probe at the query's commit, which reads git objects only and runs no stored code. Candidates whose root cause is absent are dropped. That run is a recorded gate run, and an applies result is the act-gate for that lead. Precedents: Getafix validates by re-running the tool that raised the signal [M-03.F01]; elastic-recheck uses a second discriminator [X-04.F03]. This is what separates the hard-negative pair ex7 vs ex8 (same tool, same words, different cause [T-03.F23]).",
  "ranking": "Internal depth is 20 (KS-R4). Three ranked lists are built over the prefiltered and matched set:\n- L1, exact-handle hits, ordered by handle precedence H1 (non-ambiguous) > H3 3-of-3 > H6 + H2 together > H2 alone.\n- L2, a hand-written BM25F computed in SQL:\n  - query lexemes from the CLI tokeniser, the same as for documents;\n  - document frequencies from ts_stat('SELECT doc FROM ks.search_doc'); N and avgdl from search_doc;\n  - per-position weights A=3, B=2, C=1, D=0.5 applied to term frequency before saturation (the BM25F form [T-03.F03]);\n  - k1=1.2, b=0.75, IDF = ln((N−df+0.5)/(df+0.5)+1), the always-positive variant [T-03.F01].\n- L3, pg_trgm word_similarity(handle.value, query canonical text) over template and command handles.\n\nThe lists are fused by RRF (k=60) for ORDER only, never as a confidence [T-03.F08,F25]. ts_rank and ts_rank_cd are not used: they use no corpus statistics, so they have no IDF and are not comparable across queries [T-03.F06; E-03.F01].\n\nThe calling agent may read the at-most-two shown cards and judge plausibility (agent-as-reranker, no model install [E-07.F05,F06]). That judgement is advisory and never replaces the gate. Experience-following is the known failure mode, which is why at most one lead is shown [M-02.28; T-05.F22].",
  "abstention": "Three-valued output (miss / candidate / lead), using Chow's reject option with two thresholds over score-free features [T-03.F18,F26]. Raw BM25F is never a confidence [T-03.F02,F05].\n\nFeatures per candidate:\n- exact_hit: H1 non-ambiguous, H3 3-of-3, or H6+H2 together;\n- coverage: Σ idf(matched query lexemes) / Σ idf(query lexemes present in the corpus), in 0..1;\n- trgm: best word_similarity over the entry's template handles, in 0..1, independent of corpus size;\n- margin: coverage or trgm gap to the runner-up;\n- probe: applies / not_applies / none;\n- drift: unchanged / drifted;\n- status.\n\nLEAD (upper threshold) requires all of:\n- status validated, not drifted, not suppressed;\n- no not_applies from probe-in-lookup;\n- one of: an exact_hit; trgm ≥ θ_lead_trgm with a tool match and margin ≥ θ_margin; or coverage ≥ θ_lead_cov together with an anchor or tool match.\n\nCANDIDATE (lower threshold): coverage ≥ θ_cand, or trgm ≥ θ_cand_trgm, or an anchor hit, or a would-be lead that is drifted, provisional or unverified_seed (shown with a STALE/UNVERIFIED label).\n\nOtherwise MISS.\n\nAlways:\n- H4 or H5 alone can never make a lead.\n- Two lead-eligible entries within θ_margin of each other are both demoted to candidate, unless probe-in-lookup separated them.\n- At most one lead and one candidate are shown (KS-R4).\n- A miss is cheap and safe, so every tie breaks toward the miss.",
  "gate": "Every lead passes a gate run in the acting session before anything acts on it. The gate is per act: it is never inherited from an earlier session's run. A forged, stale or mistaken confirm can therefore move ranking, but can never trigger action.\n\nFor entries with an in-process probe, the lookup's own probe run at the query commit is that gate run (recorded with role act). Otherwise the card prints `ks gate <entry> --sha <PR head>`.\n\nOutcomes:\n- applies: act on the entry's fix. For do_not_apply entries, applies means stop: the change is the forbidden one.\n- not_applies on a non-vacuous run: a refute scoped to the footprint.\n- inconclusive (sandbox_unavailable, image missing, tree_dirty, vacuous, flaky, capability_missing, host_busy, target_missing): treated as a miss, and the session escalates exactly as it would have without the store [X-02].\n\nA candidate is reading material only. It may be gated on request, but nothing acts on it without applies.",
  "thresholds": "Starting values are inferred proposals and owner parameters (KS-R10). They are stored versioned in ks.threshold, and every lookup records the version it used:\n- θ_lead_trgm 0.6 (pg_trgm's own word_similarity default [E-03.F03]);\n- θ_cand_trgm 0.4;\n- θ_lead_cov 0.6;\n- θ_cand 0.35;\n- θ_margin 0.15;\n- internal depth 20; probe-in-lookup on the top 5 candidates that have an in-process probe.\n\nGate thresholds [X-02]: unanimity for applies; reruns only on disagreement with the last confirmed verdict, at most 2; a check is suppressed from cheap tiers after 3 flaky runs.\n\nKS-7 recalibrates everything on the labelled set (leave-one-handle-out positives, ≥ 40 hard-negative/stale probes) to the setting with zero acted false leads, accepting more misses [T-03; X-05.F17]. Thresholds are per engine and are not carried across an engine swap.",
  "feedback": "Relevance feedback is written to the entry: Rocchio, moved to the document side [T-03.F16], with KS-R3's split. Mechanical events land at once; semantic changes wait for review.\n- Confirmed (gate applies in the acting session and the fix resolved the problem): outcome resolved plus a `confirmed` event bound to the gate run. If the query's canonical template is not already a handle, it is filed as a `proposal`.\n- Refuted (non-vacuous not_applies): outcome refuted plus a `refuted` event scoped to the footprint (KS-R2). The agent may file a proposed 'not when' discriminator, e.g. 'not when the compare_digest operands are hex digests'.\n- Gate said applies but the fix did not resolve: outcome gate_wrong. This is the most serious signal, because the check is not discriminating. It flags the entry needs_review and is counted separately from refutes [X-05].\n- Missed but existed: `ks record`'s near-duplicate check (pg_trgm similarity plus shared template hash) finds an entry the session's earlier lookup should have returned. This records outcome missed_existing and a proposed handle from the missed query (doc2query from a real miss [E-07.F07]).\n- Inconclusive runs only feed the flake counter.\n\nProposals become active only through a `proposal_accepted` event: from an Opus reviewer, or written by ingest itself when two independent confirmations (different sessions, different commits) back the same proposal.\n\nNot used: pseudo-relevance feedback and automatic query expansion, because they trust the top hit [T-03.F16]; and LLM rewriting of entries [M-01; M-02.29]. Counters on the card are folds of these events.",
  "measurements": "All inside the store's own tables and views (KS-R6, KS-R7). There is no separate pipeline, per the HR skip ruling.\n\nks.v_lookup_quality and ks.v_reuse report raw counts with denominators [X-04.F20]:\n- lead precision = resolved / (resolved + refuted + gate_wrong);\n- false-lead rate with its rule-of-three upper bound (0 in n gives ≤ 3/n [T-03.F20]);\n- gate_wrong separately from refuted, which separates gate quality from retrieval precision [X-05];\n- abstention accuracy on negatives;\n- recall@1/@3 and MRR on blind positives;\n- missed_existing rate;\n- share of lookups with store_unavailable, this shape's specific cost of Docker being down;\n- p50/p95 lookup latency;\n- tokens/model/tier/wall per encounter, NULL with a status when unknown; prices applied only at analysis [X-05; RT-06].\n\nOffline evaluation (KS-7): leave-one-handle-out queries; hard negatives (ex7 ↔ ex8 cross-queries [T-03.F23]); ≥ 40 negative/stale probes; LLM paraphrase queries, spot-checked (InPars [T-03.F22]); and a grep-over-prose arm (CLAUDE.md + HANDOFF) that the store must beat [X-05.F21]. Configurations are compared paired, on identical queries [T-03.F19].\n\nProspective: a checkpoint at 20 encounters or 8 weeks against X-05's continue/kill rule (owner parameters). A planted-fact canary entry checks that whatever the lookup advertises can actually be recovered [C-01].",
  "embeddings_position": "Not in v1, and the schema reserves nothing for it.\n\nWhy not:\n- At a few hundred entries there is no evidence that dense retrieval beats BM25 (BEIR, LIMIT, entity-style queries [T-03.F09-F11; E-07.F01,F03]).\n- Paraphrase handles written by the solving agent capture most of the vocabulary-mismatch benefit [E-07.F07].\n- The calling agent reading at most two cards is a semantic re-ranker that needs no install [E-07.F05,F06].\n\nAdding pgvector would take two owner decisions: a non-stock image (pgvector/pgvector [E-03.F06]) and a local embedding model (transformers.js int8 bge-small with allowRemoteModels=false [E-07.F19,F24]). Hosted embedders are disqualified by the egress rule [E-03.F07].\n\nThe trigger is an owner parameter (KS-R10), measured in the store: missed_existing lookups with zero lexical overlap.\n\nIf ever added: a ks.handle_vec(handle_id, model, model_revision, vec) table with a model stamp per vector [E-07.F28]; exact search with no index [E-03.F05]; fused by RRF for ordering only. Vector similarity alone can never make a lead."
 },
 "invalidation": {
  "triggers": "Only changes to what an entry depends on, never time [T-01.F16; X-04.F05]:\n(a) the blob OID of any footprint path at the evaluated commit (whole-file in v1);\n(b) the value hash at a config pointer (app.json#/expo/plugins, eas.json#/build, the ci.yml service image);\n(c) a lockfile-resolved dependency version; for the backend, which has open ranges and no lockfile, the gate image's recorded resolution;\n(d) a platform probe value: Node major, Expo SDK, React Native, Python, Postgres major, alembic version, gate image digests;\n(e) a check target vanishing: file, test id or JSON pointer;\n(f) a change to the check spec itself (its sha256 is a footprint item);\n(g) a recipe_version or scrubber-ruleset bump, which re-derives handles or re-scrubs text but does not change validity;\n(h) the observed_commit becoming unreachable from main after a squash or an abandoned branch: fall back to blob items and mark the entry provisional;\n(i) remote-resolver changes visible only in tool output (EAS image name, Railpack provider lines), recorded as tool_resolution items whenever a build log is pasted [X-03.F19,F20].",
  "mechanism": "Re-computable and pull-based. No daemon and no LISTEN/NOTIFY: notifications reach only connected listeners, and CLI agents are short-lived [E-03.F12,F24].\n1. At lookup: for each internal candidate the CLI computes current values for its footprint items at the query's commit:\n   - blob OID with `git rev-parse <sha>:<path>`;\n   - config pointer as the sha256 of the canonical JSON value read with `git show <sha>:<path>`;\n   - dependency versions from lockfiles at that sha;\n   - platform probe values.\n   It passes them to ks.drift(), which returns unchanged or drifted per entry, with the changed items. A drifted entry's card says 'STALE: <items>' and is capped at candidate.\n2. At phase close (the §0 hook): `ks drift --all --at origin/main` appends a mechanical `invalidated` event, naming the changed items, for every entry whose footprint drifted since its last reaffirm. This is driven by the phase's merge, not by a clock [T-01.F08-F10].\n3. Early cutoff: the same sweep re-runs in-process probes on current mainline (seconds). Container checks are re-run by the next reader who needs them. A non-vacuous verdict plus a firing inject-control gives `reaffirmed` with a new footprint (re-stamp), so the entry survives unrelated edits instead of being discarded [T-01.F02].\n4. A vanished probe target (renamed file, deleted test id, missing JSON pointer) is vacuous: the result is inconclusive, never not_applies, and the entry moves to needs_review [X-02.F29].\n\nAn unchanged footprint is necessary but never sufficient, and never skips the gate [T-02].",
  "who_repairs": "Mechanical repair is done by whoever reads (read repair restricted to mechanical events [T-01.F18]): any tier appends invalidated, reaffirmed (with a gate run), refuted or inconclusive.\n\nSemantic repair (revising the diagnosis, the check, a handle or a 'not when') goes to `ks queue` for an Opus session or the owner (KS-R3; KCS 'flag it or fix it' [X-04.F19]). The PR's existing Opus reviewer handles queue items whose footprint the PR touched.\n\nThe owner repairs only do_not_apply entries that encode an owner decision (ex6).\n\nThere is no scheduled review sweep: review happens at hit time (KCS 'reuse is review').",
  "what_cannot_be_detected": "- Untracked dependencies: transitive packages not in the footprint; config in another repo; remote resolvers whose output nobody pasted (EAS build image defaults, Railpack 'lts', Meta Cloud API or Supabase behaviour).\n- Production data state: ex2's off-vocabulary job_event.kind rows, ex4's prod cursor row. db_probe runs on a throwaway database built from migrations, not on prod data.\n- Environment-only causes: Docker Desktop state, OS or WSL updates.\n- A semantic change made through a file outside the footprint. Example: a new fourth compare_digest call site is caught only because ex1's probe is class-level.\n- Native Android/Gradle/EAS behaviour, which cannot run on this box.\n- Wrongly inferred root causes whose check still passes, the SapFix pattern [M-03.F07]; this surfaces only as gate_wrong outcomes.\n\nWhole-file items over-invalidate. That is detectable, but costs a re-verification."
 },
 "gate_runner": {
  "check_kinds": "Allow-listed kinds. Each is a declarative spec stored as data and identified by its sha256 [X-02].\n(1) tree_probe: `git grep -n -E <pattern> <sha> -- <globs>`, with an exclusion list carrying a reason per path and an optional aggregate predicate (any_match, duplicates_exist over a capture group). Evaluated by the runner in-process; no stored code runs and no Docker is needed. Used by ex1 and ex2a.\n(2) json_probe: a JSON pointer plus a predicate (equals, contains_regex, any_value_equals over a map, major_differs_from) over `git show <sha>:<path>`, parsed in-process. Used by ex7 and both causes of ex8.\n(3) db_probe: python-backend profile. Runs `alembic upgrade head` on a throwaway Postgres, then a stored SELECT as a read-only role, with a predicate on the scalar result. Used by ex4.\n(4) test_id: named pytest node ids or Jest/Vitest test names at the sha, optionally with a test overlay from passes_at. The verdict comes from junit/json output. Used by ex6, ex5, and ex1's regression guard.\n(5) scripted: stored test source mounted into the container. Cheap tiers may run it only after approval bound to its sha256. Used by ex3's Vitest check and ex2b's two-version alembic rollback run.\n(6) remote_inspect: EAS, Railway and native-build causes. Always returns inconclusive/capability_missing locally, together with the owner-run instruction and the tool_resolution items to compare [X-03.F19; X-02.F30].\n\nEvery kind declares its targets (paths, test ids, pointers). A missing target is vacuous: inconclusive, never not_applies.",
  "isolation": "In-process kinds: the Node runner uses argv arrays and an explicit allow-listed env, never a shell [X-02.F19]. It spawns only git, against committed objects, and nothing stored executes.\n\nContainer kinds run with:\n- `docker run --rm --network none`, or a per-run `docker network create --internal fixflow-ks-gate-<nonce>` that holds only a throwaway Postgres with a random password and no published port;\n- `--read-only --tmpfs /scratch --cap-drop ALL --security-opt no-new-privileges --pids-limit 256 --memory 2g --cpus 2`;\n- a `git archive <sha>` export mounted read-only and copied to /work inside, the Appendix A pattern;\n- HOME=/scratch, TZ=UTC, CI=1, and no PYTHONOPTIMIZE, so bare asserts cannot vanish (RT-02);\n- FIXFLOW_* set only to the throwaway URL; the runner refuses any database host other than the throwaway container, because backend/tests/conftest.py TRUNCATEs whatever URL it is given and Settings defaults to localhost:5432 [X-02.F13,F14];\n- no docker socket, no .env files, no host home;\n- images prebuilt by a trusted `ks images build` step keyed by lockfile/pyproject hash, so the check itself runs offline [X-02.F26].\n\nContainer names are fixflow-ks-gate-<nonce>, never the ship plan's fixed fixflow-w1-* names. While any fixflow-w1-* container is running, container kinds return inconclusive/host_busy rather than compete with a ship-plan gate.\n\nThe store container is attached to no network at all, so no gate container can reach it.\n\nFail closed: Docker down or an image missing gives inconclusive/sandbox_unavailable, with no unsandboxed fallback. Not used: Claude Code's sandbox (no effect on native Windows), Windows Sandbox (no headless I/O) and job objects (resource limits only) [X-02.F03-F08].",
  "verdict_derivation": "Verdicts come only from runner-owned artifacts, never from the child's exit code. git bisect counts 126/127 as bad, Python and Node crashes exit 1, and pytest exits 5 when it collects no tests [X-02.F01,F12,F28].\n- Probe kinds: the runner computes the match set itself and records paths, lines and captured values.\n- Test kinds: pytest --junitxml, jest --json or vitest json, written to a runner-owned results mount under a nonce.\n  - applies (polarity applies_when_fails): every named id executed, and at least one failed by assertion (failure, not error).\n  - not_applies: every named id executed and passed, and the end sentinel is present.\n  - blocks_when_fails (do_not_apply): applies when a protective test fails by assertion on the proposed sha.\n- db_probe: applies when the predicate holds on the scalar the runner itself read.\n- Everything else is inconclusive, with a reason code: sandbox_unavailable, unapproved_spec, tree_dirty, timeout, oom, vacuous, collect_error, infra_exit, flaky, capability_missing, egress_attempted, target_missing, control_not_reproduced, host_busy.\n\nReruns happen only on disagreement with the last confirmed verdict, at most 2, and applies needs unanimity. Any split is inconclusive/flaky and bumps the flake counter.\n\nThe runner's own exit codes are 10 applies, 11 not_applies, 12 inconclusive; any other code means the runner crashed, which is inconclusive.\n\nThe gate_run row and the sha256-bound result file go to the journal. For RT-01 and RT-03, ingest refuses an approved or confirmed record that coexists with a failed control for the same spec hash.",
  "approval": "A check can run with role act only when ks.check_approval holds a row for its exact spec sha256. Editing a spec creates a new check_id, so an edit voids approval [X-02.F20].\n\n`ks approve <check_id>` runs both control sides, then writes check_approved through the reviewer role. ks.ingest refuses it unless all of these hold:\n- session_user is ks_reviewer;\n- the approver identity (model + session) differs from the spec's author;\n- control_fail_run returned applies and control_pass_run returned not_applies for this spec hash;\n- container kinds ran sandboxed.\n\nApprovers are an Opus session (usually the PR's refute-by-default reviewer, who already names a test that fails on base and passes on head) or the owner. do_not_apply entries that encode an owner decision need the owner. Unapproved specs run only with control_* roles.\n\nHonest limit: identities and role passwords live under one OS user. This stops accidents, honest mistakes and data-borne poisoning (MCP, SQL inside facets), not a deliberately hostile agent with Bash. That is why every act needs a fresh gate run and why declarative kinds dominate.",
  "control_pair": "A control pair is required for approval [X-02.F29]: one fail-side and one pass-side run, recorded as gate runs. Accepted forms:\n(a) fails_at / passes_at mainline SHAs. ex1: 2fe77f5^ / 2fe77f5. ex7: 140428c / 79a8dd4. ex8: 60c026d / 6928828, and 6928828^ / 6928828 for the native-module cause. ex4: da988e2^ / da988e2 (head at 0045 without the 0046 seed, then with it).\n(b) fails_on_fixture: in-memory synthetic blobs for probe kinds when no mainline state ever had the defect. ex2a: two migration files carrying one revision id; it was guarded before it ever happened.\n(c) fails_with_patch: a stored patch applied to the pass-side export.\n   - For do_not_apply, it is the forbidden change. ex6: HANDOFF A2's 'lock on the failure path only' applied to 1c546a3 must make test_five_failures_lock_the_account_even_for_the_right_pin fail.\n   - It is also a mutation that re-introduces the bug when the fix created new modules, leaving the pre-fix tree nothing to transplant onto. ex5: completionPrefill.ts does not exist at da988e2^; the mutation returns 'new' on a failed fetch with no cache.\n(d) A test overlay from passes_at onto fails_at, SWE-bench style (not in the register). It is rejected automatically as control_not_reproduced when the overlaid test imports a symbol the fix introduced. ex1: test_security.py imports compare_secret, which is absent at 2fe77f5^; that is why ex1's gate is the probe.\n(e) Open defects have only a fail side (ex3 at a31924a). They stay provisional until the owning phase (P12a) merges and supplies the pass side.\n\nAn inject-control (the fail-side fixture or mutation applied in memory to current HEAD) is re-run at reaffirm time. It proves the check can still fail on today's code, so a passing check is never vacuous."
 },
 "concurrency": {
  "write_path": "One write path, the CLI, serves every tier, worktree and host (T-02: one path owns the store). A write goes through these steps:\n1. Build the event as canonical JSON (sorted keys, UTF-8, LF, no insignificant whitespace) with actor, observed_commit, footprint, facets, and parents (the semantic heads last read), and scrub it.\n2. Name it by the sha256 of those bytes and write C:/Users/User/.fixflow-ks/journal/events/<2 hex>/<sha256>.json via temp file plus rename. If the target already exists with identical bytes the write is a no-op: content-hash names make duplicates benign. NTFS rename-over-existing is otherwise untested (critic on E-09).\n3. Call ks.ingest(raw) as ks_agent or ks_reviewer. The SECURITY DEFINER function:\n   - re-hashes the exact bytes;\n   - checks the kind against session_user (mechanical vs semantic, KS-R3);\n   - locks the entry row FOR UPDATE;\n   - compares parents with the current heads. If they are stale it returns conflict and the heads, and the writer re-reads, rebuilds and retries. This is optimistic concurrency with no wall-clock last-writer-wins [T-06.F26];\n   - applies the status-transition table, the repository's try_transition idiom;\n   - inserts ON CONFLICT (event_id) DO NOTHING, so an idempotent replay returns duplicate;\n   - updates the projections in the same transaction.\n4. If Postgres is unreachable, the file stays in the journal. `ks sync` ingests every journal file whose id is absent from the database (an anti-join). It runs automatically on the next CLI call that reaches the database, and at phase close. Mechanical events commute and land as-is. A semantic event whose parents are no longer the heads lands as a fork, which the fold shows as needs_review, never as a silent overwrite.\n\nJournal git commits are batched at `ks sync`, under pg_try_advisory_lock when the database is up and under git's index.lock with retry when it is not. No role can UPDATE, DELETE or TRUNCATE a truth table.",
  "stampede_control": "KS-R5. `ks claim` calls ks.try_claim(signature, holder), which inserts into ks.claim. The partial unique index (one open claim per signature) means a second claimant gets the existing row back instead of blocking: holder, age, draft entry and the attempts recorded so far. Claims are advisory and non-blocking, because a waiting Opus session is the real cost [T-06]. A follower reads the leader's attempts and tries a different hypothesis, or works on something else.\n\nclaim_seq is a fencing token. `ks record` carries it, and ingest stores a record whose claim_seq is older than the signature's newest claim as late/corroborating (needs_review). Two solvers therefore never silently overwrite each other [T-06.F13].\n\nThe signature is the query's H1 template hash, else its H3 frame signature, else sha256(tool|phase|code), else the normalised problem title.\n\nThe leader's `ks attempt` events are mechanical writes made as each hypothesis fails, appended to its draft entry. They survive the leader's death, which is the cheapest way to keep negative results from a session that compacts or crashes.\n\nv1 has no renewal and no expiry. Claims show their age and are released by `ks claim --release` or by `ks record`. lookup_event.claim_seen counts concurrent misses on one signature, and a lease policy is set only once such misses are observed (KS-R5). At stage 2, claims become cross-host at no extra cost, because both hosts use one server.",
  "worktree_story": "Nothing of the store lives in any worktree or in the code repo's history:\n- the data is in the Docker named volume fixflow-ks-pgdata, never a bind mount [E-03.F17];\n- the journal, secrets, runtime CLI, gate scratch and backups are in C:/Users/User/.fixflow-ks/. That is outside Documents, which may be synced (critic), and outside %APPDATA%/%LOCALAPPDATA% [C-01].\n\nEvery worktree, subagent and workflow agent reaches the same database through the same container, so there are no per-worktree replicas to reconcile [X-01.F19].\n\nCLI version skew is removed by running one materialised copy. `ks self-install <mainline sha>` copies tools/ks from `git show <sha>:tools/ks/...` into C:/Users/User/.fixflow-ks/bin, with no npm. Every event records cli_sha, and ks.meta.min_cli refuses writes from older copies. A branch that changes the CLI runs its own copy with --dev against a scratch database ks_dev in the same container, never against the live ks.\n\nEntries anchor on mainline SHAs and blob OIDs only [T-02.F20]. A fix recorded from a feature branch stays provisional until `ks promote` records the squash SHA at phase close. An abandoned branch leaves a provisional entry whose negative results are still served as candidates; its check can still be approved from blobs or fixtures.\n\nGate runs never touch the developer's worktrees:\n- in-process probes read git objects directly (`git grep <sha>`, `git show <sha>:<path>`);\n- container checks get a `git archive <sha>` export under C:/Users/User/.fixflow-ks/runs/<nonce>, mounted read-only and deleted afterwards. This is used instead of `git worktree add --detach` [X-02] so the desktop app's worktree list stays untouched; both read committed objects only (RT-04).",
  "two_host_story": "Stage 0–1 (now): one host and one container, nothing to sync. The journal is backed up by git bundle.\n\nStage 2 (owner decision; only after P3b, and only if agents actually run on the second host):\n- The live store becomes one container fixflow-ks-pg on the VPS with the same definition: --network none, its own volume, never inside the production compose project's database, never the production database. It is always on under the host's Docker.\n- Every host's CLI talks to that one server. The dev box uses `ssh ks@<host> docker exec -i -e PGPASSWORD fixflow-ks-pg psql …`, with SSH keys, no exposed port and no third-party mesh coordinator [X-01.F26-F28].\n- Claims, refutes and new entries written on one host are therefore visible on the other at its next call: the consistency target T-01 sets (a refutation once seen is never unseen), with no merge of per-host indexes.\n- The journal is cloned on both hosts and pushed to a bare repo on the VPS over SSH, never to GitHub. `ks sync` pushes and pulls, and distinct content-hash files merge as pure adds [X-01.F20].\n\nOffline (VPS unreachable, dev box away): exactly the Docker-down behaviour. Lookups are logged misses, writes go to the local journal and are ingested idempotently when the VPS returns. Optionally, by owner choice, the dev box keeps its local container as a read mirror rebuilt from the journal for offline lookups. A stale mirror is safe, because every act needs a fresh gate run.\n\nHonest cost: X-01 rates a VPS-resident service that loses dev-box reads offline as disqualifying for the lookup path. This shape accepts that because a miss is safe and no write is lost. If offline lookups matter, the alternative is one container per host, each rebuilt from the git-synced journal; it is the same design, with claims per host until sync."
 },
 "engines": [
  {
   "role": "Primary store and query engine: truth tables, projections, retrieval, fold, analytics views",
   "engine": "PostgreSQL 17, official postgres:17-alpine image (digest pinned in KS-1; postgres:17-bookworm if the pg_trgm or locale checks fail)",
   "version_or_status": "17.x stable line (17.11 at the E-03 read [E-03.F18]). Same major as production (backend/Dockerfile pins postgresql-client-17, orchestration §8) and as the Appendix C restore stack. The end-of-life date is not in the register.",
   "why": "This is the shape. Roles, SECURITY DEFINER write functions and append-only triggers enforce read/write separation in the engine [E-03.F14]. One server can later serve two hosts [T-01; T-06]. tsvector, ts_stat and pg_trgm cover retrieval with stock contrib [E-03.F01-F04]. SQL views cover analytics (KS-R6). The team already operates this image family [E-03.F22].",
   "egress": "None: --network none (loopback only), no published port, and stock Postgres has no telemetry [E-10]",
   "ops_cost": "Medium for one developer:\n- a container tied to Docker Desktop, whose AutoStart is off;\n- three role passwords;\n- a pg_dump at each sync/phase close;\n- a major upgrade every few years, done by rebuilding from the journal instead of pg_upgrade [E-03.F19].\nIdle RAM of the WSL2 VM and the container is unmeasured [E-03.F20]; capped with --memory 256m and shared_buffers=32MB.",
   "install_needed": "No new software on the dev box (Docker Desktop is installed). Pulling the image (if not cached) and creating the persistent container is an owner decision. On the VPS: a second container (owner decision)."
  },
  {
   "role": "Fuzzy matching of canonical error templates, commands and anchors; near-duplicate warnings at write",
   "engine": "pg_trgm (contrib, trusted extension)",
   "version_or_status": "Ships with PostgreSQL 17; that it is present in the alpine image is to be verified in KS-1 (an E-03 open question)",
   "why": "word_similarity is bounded and query-normalised, so it can feed abstention where BM25 scores cannot [E-03.F03; T-03.F02]. similarity() gives pairwise near-duplicate checks with no MinHash [T-03.F15].",
   "egress": "None",
   "ops_cost": "Low: one CREATE EXTENSION",
   "install_needed": "None beyond the image"
  },
  {
   "role": "Lexical retrieval over prose handles and document frequencies for IDF",
   "engine": "PostgreSQL full-text search: tsvector, GIN, ts_stat, a custom ks.code configuration copied from simple, plus english for prose",
   "version_or_status": "Core since 8.3",
   "why": "Stock machinery for weighted fields (A–D) and per-lexeme document frequency. BM25F is hand-written on top because ts_rank has no IDF [T-03.F06; E-03.F01,F04].",
   "egress": "None",
   "ops_cost": "Low; the hand-written ranking SQL is code this project owns and must test",
   "install_needed": "None"
  },
  {
   "role": "Client protocol driver for the CLI and MCP server",
   "engine": "psql inside the store container, via `docker exec -i` (or `ssh … docker exec` at stage 2)",
   "version_or_status": "Matches the server (17)",
   "why": "Removes any npm Postgres driver. The CLI stays a zero-dependency Node script, and parameters travel as nonce-tagged dollar-quoted literals.",
   "egress": "None",
   "ops_cost": "Low; roughly 0.3–1 s per call (unmeasured)",
   "install_needed": "None (part of the image)"
  },
  {
   "role": "CLI, canonicaliser, scrubber, gate runner, MCP stdio server",
   "engine": "Node 24.22.1 built-ins (child_process with argv arrays, node:crypto sha256, fs, node:test)",
   "version_or_status": "Installed on the dev box. The VPS needs Node 24 only at stage 2 (owner decision).",
   "why": "Zero installs. One process holds scrubbing and canonicalisation [X-06], and the MCP server is hand-written JSON-RPC with no SDK.",
   "egress": "None",
   "ops_cost": "Low",
   "install_needed": "None on the dev box"
  },
  {
   "role": "Store host and gate sandbox",
   "engine": "Docker Desktop (WSL2 backend) on the dev box; Docker Engine on the VPS",
   "version_or_status": "Installed; AutoStart false [E-03.F21]",
   "why": "The only isolation that works headless on both Windows and Linux [X-02], and the store's host. Backend ship phases already require the owner to start it (ship plan §0 Gates).",
   "egress": "Image pulls only, in the trusted build step; check runs use --network none or --internal",
   "ops_cost": "Medium; existing dependency. Agents never start Docker itself (orchestration §8).",
   "install_needed": "None (installed)"
  },
  {
   "role": "Journal transport, blob OIDs, archive exports, stage-2 sync",
   "engine": "git 2.56 + Windows OpenSSH; a bare repo on the VPS at stage 2",
   "version_or_status": "Installed",
   "why": "Content-hash event files merge as pure adds; blob OIDs survive squash merges [X-01.F20; T-02.F20]",
   "egress": "None at stage 0. At stage 2, SSH to the owner's own host only, never GitHub [X-01.F26-F28].",
   "ops_cost": "Low",
   "install_needed": "None"
  },
  {
   "role": "Gate execution images",
   "engine": "python:3.12-slim + backend [dev] deps; node:22 + root node_modules; a mobile jest image later; throwaway postgres:17-alpine (or 16 where a spec pins CI parity)",
   "version_or_status": "Built locally, keyed by lockfile/pyproject hash",
   "why": "Checks run offline against prebuilt dependencies; dependency install is a separate trusted step [X-02.F26]. Node 22 matches CI parity (orchestration §8).",
   "egress": "Registry pulls during `ks images build` only",
   "ops_cost": "Medium; a rebuild when lockfiles change",
   "install_needed": "Image builds are an owner decision"
  },
  {
   "role": "Secret and PII scrubbing",
   "engine": "Built-in Node pass: exact-value redaction plus a regex set incl. postgresql+asyncpg URLs, Bearer, JWT, Railway/Supabase/R2 shapes, PK phone and CNIC. Optional second pass: gitleaks, a pinned binary.",
   "version_or_status": "Built-in pass in v1; gitleaks deferred",
   "why": "Scrub at write and on every return [X-06]; gitleaks is the fail-closed second pass with the best measured recall [X-06]",
   "egress": "None (gitleaks run with network denied)",
   "ops_cost": "Low",
   "install_needed": "gitleaks or secretlint only by owner decision"
  },
  {
   "role": "Semantic retrieval",
   "engine": "pgvector",
   "version_or_status": "Not adopted; reserved behind a measured trigger",
   "why": "No evidence it helps at this scale [E-07; T-03]; it needs a non-stock image and a local model",
   "egress": "Would require a local model only",
   "ops_cost": "Medium if ever adopted",
   "install_needed": "Two owner decisions if ever"
  },
  {
   "role": "Analytics",
   "engine": "DuckDB",
   "version_or_status": "Reserve only (KS-R6)",
   "why": "Analytics are SQL views in the one engine",
   "egress": "n/a",
   "ops_cost": "n/a",
   "install_needed": "None"
  }
 ],
 "abstraction_layer": {
  "interface_ops": [
   "lookup(query{raw_scrubbed, tool, phase, command, paths[], commit}) → {verdict miss|candidate|lead, lead?, candidate?, lookup_id, features, reasons, store_status}",
   "guard(paths[], commit) → {do_not_apply card?, other card?, counts}",
   "show(entry_id, facets[]?) → card | paged full facets",
   "append(raw_event_bytes) → ok | duplicate | conflict{heads} | fork",
   "fold(entry_id) → {status, heads, counters, approved checks, suppressed footprints}",
   "drift(entry_ids[], current_items) → per entry unchanged | drifted{items}",
   "claim(signature, holder) → leader{claim_seq} | follower{existing claim, attempts}; release(claim_seq)",
   "gate_spec(check_id) → {spec, approval state}; record_gate_run(result)",
   "outcome(lookup_id, entry_id, link, gate_run_id)",
   "stats(view) → rows with denominators",
   "sync() → {ingested, committed, pushed}; rebuild(journal) → fold digest; doctor() → schema, roles, projection-vs-fold diff, spool size"
  ],
  "swap_story": "The engine-neutral pieces are the journal (canonical JSON events, the truth) and the CLI's JSON contract above. Agents and the skill see only the contract, never SQL. Swapping to the embedded engine KS-R1 names (node:sqlite + FTS5) means writing an adapter that implements the same operations:\n- FTS5 bm25() with column weights replaces the hand-written BM25F;\n- an FTS5 trigram table, or an in-Node similarity, replaces pg_trgm;\n- BEGIN IMMEDIATE replaces FOR UPDATE;\n- opening the file read-only replaces ks_reader.\nThen `ks rebuild --engine sqlite` replays the journal. The switch is accepted only when a conformance suite gives identical miss/candidate/lead verdicts and identical gate verdicts on the labelled set and the eight examples, after thresholds are re-calibrated on that engine. The reverse swap works the same way. Postgres can also be replaced by itself on a new major: create the new container, rebuild from the journal, compare the fold digest.",
  "what_leaks": "- Score semantics: pg_trgm word_similarity and FTS5 trigram substring matching behave differently, and FTS5 hard-codes k1/b. Thresholds do not carry over and must be re-calibrated; the labelled set carries over, the θ values do not.\n- Role-based enforcement has no SQLite equivalent and degrades to connection-level read-only plus harness permissions.\n- Cross-host live sharing disappears: SQLite is same-host only, so stage 2 falls back to journal merge.\n- The fold, transition and lookup logic lives in plpgsql functions and must be re-implemented in the adapter; during a transition the same rules exist in two places.\n- JSONB operators in the views need porting to JSON1.\n- The psql transport and latency profile are specific to this shape."
 },
 "access": {
  "how": "Three surfaces over one engine adapter:\n1. The CLI `ks`, a zero-dependency Node 24 script materialised in C:/Users/User/.fixflow-ks/bin and called through Bash. Bash is the only path every subagent and workflow agent has without configuration or an approval prompt [E-10.F16].\n2. A skill, .claude/skills/ks/SKILL.md. Its description (≤ 1,536 characters, always listed) says when to look up, how to gate and how to record; the body loads on demand [E-10.F17; M-02].\n3. An optional MCP stdio server for read-only lookups.\n\nAgents never run psql, docker exec or SQL themselves: the CLI owns the transport, the role and the output bounds. The verb picks the role:\n- read verbs → ks_reader;\n- lookup, gate, outcome, attempt, claim, propose → ks_agent;\n- record, revise, approve, accept, archive → ks_reviewer. These verbs also refuse unless KS_TIER is opus or owner.\n\nThe store is pull-only: no hook injects it and nothing auto-loads it [X-05.F12; HR skip rulings].",
  "cli_commands": [
   "ks status: is the store reachable; schema and CLI version; entry counts by status; unsynced journal files. Never starts Docker.",
   "ks up: starts the store container only (docker start fixflow-ks-pg). `ks up --init` creates it once (owner decision).",
   "ks lookup --tool pytest --phase test --file <scrubbable failure log> --paths backend/app/core/security.py --sha HEAD   (prints ≤ 1 lead + ≤ 1 candidate; --json gives the full record)",
   "ks lookup --text 'TypeError: comparing strings with non-ASCII characters is not supported' --tool python",
   "ks guard backend/app/features/identity/throttle.py src/app/providers/AppContext.jsx   (edit-time lookup; do_not_apply entries first)",
   "ks show KS-01JC… [--facet diagnosis_path|failed_approaches|checks|history] [--full]",
   "ks gate KS-01JC… --sha <PR head> [--check <check_id>]   (exit 10 applies / 11 not_applies / 12 inconclusive; JSON verdict)",
   "ks outcome <lookup_id> --entry KS-… --link resolved|referenced|refuted|missed_existing|gate_wrong --gate-run <id>",
   "ks claim --from-lookup <lookup_id> --draft ; ks attempt --claim <seq> --approach '…' --why '…' ; ks claim --release <seq>",
   "ks propose handle|not-when KS-… --from-lookup <lookup_id>   (cheap tier; stays inactive until accepted)",
   "ks record --from draft.json   (reviewer: scrub, negative-corpus and near-duplicate checks; writes a provisional entry)",
   "ks check add KS-… --spec spec.json ; ks approve <check_id>   (reviewer ≠ author; runs both control sides)",
   "ks promote KS-… --squash <mainline sha>",
   "ks drift --all --at origin/main   (phase close: appends invalidated events and re-runs in-process probes)",
   "ks queue   (proposals, forks, refutes, gate_wrong, needs_reverify, provisional and unverified_seed entries awaiting an Opus session)",
   "ks sync   (ingests spooled journal files and commits the journal; at stage 2 also pushes/pulls the bare repo)",
   "ks stats --view reuse|abstention|unavailable|cost|pilot",
   "ks backup | ks restore-drill | ks rebuild | ks doctor | ks self-install <mainline sha> | ks images build | ks migrate (Opus/owner only)"
  ],
  "mcp": "Optional server `ks` in .mcp.json (stdio; node C:/Users/User/.fixflow-ks/bin/ks-mcp.mjs). It is hand-written JSON-RPC (initialize, tools/list, tools/call), so no SDK install. It connects as ks_reader and exposes four tools: ks_lookup, ks_show, ks_guard, ks_stats.\n\nks_lookup calls ks.lookup_ro, which is STABLE and writes nothing to the database. The MCP process appends the lookup record to the local journal spool, and the next `ks sync` ingests it, so MCP lookups are still measured.\n\nThere are no gate, record, approve or claim tools over MCP: those execute code or change meaning, and they stay CLI verbs.\n\nRead-only is enforced by the database role, not the wrapper. The archived reference Postgres server's read-only wrapper was bypassed with stacked statements [E-03.F14]. Not used: the archived reference servers, and Postgres MCP Pro (it needs Python/uv, an install, and its restricted mode is still wrapper-level [E-03.F15]).\n\nRegistration is an owner decision, because .mcp.json prompts for approval interactively [E-10.F16]. Subagents inherit the server, and tool search defers its schemas, so its standing context cost is small.",
  "output_bounding": "- A lookup prints at most one lead card and one candidate card (KS-R4), each ≤ 1,500 characters: title, status/STALE label, cause, do-this, top failed approach, gate command or result, counters. Total lookup output is ≤ 4,000 characters; the full record is behind --json or `ks show`.\n- `ks show --full` pages facet by facet, ≤ 12,000 characters per call.\n- `ks stats` returns ≤ 50 rows.\n- MCP tool results stay below 8k tokens, under the 10k warning and 25k cap; Bash read-back is capped at 30k characters [E-10.F18].\n- Every string returned is scrubbed again on the way out [X-06], and production-derived payloads are never stored, so they cannot be returned.",
  "read_write_separation": "Enforced in the engine, not the wrapper [E-03.F14; X-02.F17]:\n- ks_reader: SELECT on the ks.v_* views and EXECUTE on ks.lookup_ro only. Used by the MCP server and by `ks show`, `ks stats` and `ks guard`.\n- ks_agent: EXECUTE on ks.ingest (mechanical kinds and proposals only, checked against session_user inside the function), ks.lookup, ks.drift and ks.try_claim/release_claim. No table privileges at all.\n- ks_reviewer: adds semantic kinds and approvals, through the same function.\n- ks_owner: NOLOGIN; owns the schema. Migrations run as the container's postgres superuser through `ks migrate`, in an Opus or owner session.\n\nNo role can UPDATE, DELETE or TRUNCATE a truth table: triggers raise even for the owner, and a rebuild drops and recreates the database.\n\nIn the CLI, verbs that change meaning refuse unless KS_TIER is opus or owner, and subagent permission rules deny them. Cheap tiers append only mechanical events and proposals (KS-R3).\n\nHonest limit: the role passwords sit in C:/Users/User/.fixflow-ks/secrets, and `docker exec -u postgres` is superuser via peer auth. This separation guards against accidents and data-borne attacks, not against a hostile Bash user."
 },
 "workflow": {
  "write_when": "Write-through at solving time, never write-back [T-01.F17]:\n(a) During diagnosis, a session holding a claim runs `ks attempt` (approach, why it failed, evidence) as each hypothesis fails, so a crash or compaction keeps the negative results.\n(b) The moment a hard defect or trap is diagnosed, the solving session runs `ks record --from <draft.json>`, built from the PR body's 'Decisions / ruled out' journal, with the fix commit still on its branch. The entry starts provisional. A defect or trap qualifies if it needed tier escalation, burned a build or deploy, ruled out an obvious fix, or produced a do-not-apply decision. At phase close the store becomes the owner of those journal entries, which is the move-to-owner step §0 already requires.\n(c) After the squash merge, `ks promote` records the mainline SHA.\n(d) The CLI writes every lookup, gate run and outcome automatically, as it happens.\n\nRoutine first-try fixes are not recorded. Swamping is not the threat at this scale [T-05.F6,F7]; the owner's attention is [C-01].",
  "who_confirms": "- Validated requires: a reviewer who is not the author approves at least one check after both control sides reproduce, and the fix commit is on mainline.\n- Reviewers are Opus sessions, normally the PR's existing refute-by-default reviewer. They already must name a test that fails on base and passes on head, so approving the entry's check fits inside that review.\n- The owner confirms only do_not_apply entries that encode an owner decision (ex6).\n- Proposals (new handles, 'not when' discriminators) are activated by an Opus reviewer, or automatically after two independent confirmations from different sessions on different commits (KS-R3).\n- Cheap tiers never confirm anything semantic. They append confirmed/refuted evidence bound to their own gate runs.\n- Seed entries without a control pair stay unverified_seed and are never shown as leads (KS-R9).",
  "read_when": "(1) Step zero on tier escalation, mandatory: before any failure is handed to a higher tier (Haiku/Sonnet to Opus, or an Opus session about to re-derive), the session runs `ks lookup` on the raw failure text.\n(2) Before diagnosing any failing gate, CI job, EAS build or deploy.\n(3) Edit-time: before an Opus phase edits auth, PIN/JWT, outbox, money/ledger, migration, lifecycle or location-privacy files (the ship plan's Opus-routed areas), `ks guard <paths>`.\n(4) When the PR reviewer refutes a fix.\n\nNever: auto-injected, always-loaded, or on a hook. A PostToolUseFailure hook was considered and rejected: added context costs more without a general gain [X-05.F12; M-02.32], and the HR skip rulings exclude a context system.",
  "plan_hook_text": "Proposed, not applied, as one new bullet in SHIP-PLAN-2026-11.md §0, placed directly after 'Routing (design doc §3)':\n\n- **Known-error store (step zero; a tooling track that never blocks a phase).** Before a failure is escalated to a higher tier, and before any failing gate, CI job, build or deploy is diagnosed, the session runs `ks lookup` on the raw failure text. Before an Opus phase edits auth, PIN/JWT, outbox, money, migration, lifecycle or location-privacy files, it runs `ks guard <paths>`. It records the verdict (`miss`, `candidate`, `lead` or `store_unavailable`) in the PR journal. A `lead` is acted on only after a gate run in this session returns `applies` on the PR head SHA (the lookup runs file and JSON probes itself; `ks gate <entry>` runs the rest). A `candidate` is reading material, and a miss or an unavailable store means proceed exactly as before. When a phase solves a hard defect or trap (it needed escalation, burned a build or deploy, or ruled out an obvious fix), the phase close moves those journal entries into the store with `ks record`, the PR body keeps only the entry id, and the phase's Opus reviewer approves the entry's check by running its control pair or leaves it provisional. At phase close the session also runs `ks drift --all --at origin/main` and `ks sync`. Any store or gate-runner failure is noted as `ks: skipped (<reason>)`, and the phase continues.",
  "phase_cost": "Inferred (KS-R10); the store's own lookup log replaces these numbers.\n- A phase with no hard problem: 1–3 `ks lookup` or `ks guard` calls, each about 0.3–1 s through docker exec (unmeasured; about 1–3 s over SSH at stage 2) and ≤ 4,000 characters of output (about 1k tokens). That is roughly 1–4k tokens and seconds per phase. The phase-close drift sweep plus in-process probes takes about 10–30 s and prints one line.\n- A phase that hits a lead adds one gate run (probe: 1–3 s, inside the lookup; container test or db gate: 1–5 min with prebuilt images) and reading one card.\n- A phase that solves a hard problem adds `ks record` from the PR journal, about 10–20 min of the solving session (about 10–30k tokens), plus the reviewer's two control runs (about 5k tokens) inside the review it already does.\n- Owner: nothing per phase beyond starting Docker Desktop, which backend phases already require; confirmation only for do_not_apply entries that encode an owner decision.\n- Standing context cost: one skill description (≤ 1,536 characters) and one §0 bullet.",
  "scrubbing": "X-06 pipeline in the CLI's Node process, applied at write and again on every return:\n1. Exact-value redaction of the live values of named secret variables (FIXFLOW_*, RAILWAY_*, R2/Sentry/EAS tokens) and of backend/.env if present. Values are read in-process only, never stored.\n2. Regexes for: postgresql(+asyncpg):// URLs with credentials; Authorization/Bearer headers; JWTs; Railway, Supabase and R2 token shapes; X-Ops-Proxy-Token and webhook signature values; Pakistani mobile numbers (+92 / 03xx, libphonenumber-style patterns); CNIC (#####-#######-#).\n3. Typed deterministic placeholders (<secret:db_url>, <pii:phone>). SHAs, UUIDs, Alembic revision ids and epoch-ms values are exempt, so handles survive. A must-survive fixture group measures over-redaction.\n4. A structural rule: customer names and addresses cannot be detected locally, so `ks record` refuses facets flagged as production query output or customer payloads, and db_probe evidence stores only aggregate scalars.\n5. A fail-closed second pass with gitleaks once the owner adopts it; any finding rejects the write.\n\nEach entry records scrubber identity (tools, versions, ruleset sha256), so a better ruleset triggers re-scrub events. Backups inherit scrubbed content.\n\nWhatever a card returns enters model context and reaches the model provider [X-06; E-10.F31]. The egress rule's two-part scope is an owner decision."
 },
 "migration": {
  "seed_sources": "In order of value:\n(1) Git history: the eight R-02 examples (the calibration set), and X-05's Step-0 audit of the 48 fix-prefixed commits.\n(2) CLAUDE.md:\n   - Build & deploy traps (4);\n   - the invariants that encode solved defects: compare_secret, login lock, bill freeze, completion prefill, wizard monotonicity, dispatcher seed/age guard/per-event commit/savepoint, log_customer_message;\n   - the KNOWN DEFECT on outbox mutual exclusion, as an open_defect.\n   R-01a counted 4 traps, 16 invariants, 9 solved and 1 open there.\n(3) docs/HANDOFF-2026-07-28-open-work.md §2/§4/§5.5/§6 (13 traps, 10 solved, 36 open) and docs/lifecycle-audit-followups-2026-07.md (11 open, 1 trap).\n(4) The G2 §2 register's 7 negative results and the HR §3/§4 traps [R-01b].\n(5) The W2 design notes' 52 ruled-out alternatives, attached as failed_approaches to the entry each belongs to. Their file:line citations are tied to expo-location 18.0.10 / expo-task-manager 12.0.6, which become platform footprint items, so an SDK upgrade (P14-n) marks them needs_reverify [R-01b].\n\nOpen defects that a ship-plan phase owns are entered only as open_defect entries linking to that phase (ex3 → P12a), never restating its scope.",
  "how": "Per entry, through the write gate, never a bulk import (KS-R9):\n1. A Sonnet session drafts at most 10 entries per seed session from one source row each. It writes title, symptom raw text, handles (incl. paraphrases), cause, conditions, diagnosis path, failed approaches with cause classes, fix, links, and a proposed check with a control pair.\n2. The CLI applies scrub, canonicalise, the negative-corpus precision check (zero tolerance [X-04.F02]) and the pg_trgm near-duplicate warning ('extend, never sibling' [T-05.F15]).\n3. An Opus session approves each check by running both control sides.\n4. Rows with no possible control pair go in as unverified_seed: candidate slot only, labelled.\n5. Contradictions R-01a found become correction PRs to the prose sources, never entries: HANDOFF A2 vs CLAUDE.md on the login lock; 0045 as 'a free slot' vs 'merged'; C1/C2 'do not ship' vs merged; HANDOFF §4.4 listing as open what CLAUDE.md says is fixed.\n\nOrder: the eight examples (KS-6), then CLAUDE.md traps and solved-invariant narratives, then HANDOFF solved items, then W2 ruled-out notes as negatives on existing entries.",
  "claude_md_effect": "Only after KS-7's go decision, and entry by entry, in a reviewed PR. A section whose entry is validated with an approved check keeps a one-line rule plus the entry id, and its narrative (why, what was ruled out, how it was found) moves into the store. Example: 'Never put an empty EXPO_PUBLIC_SENTRY_DSN in eas.json (ks KS-…; json_probe)'.\n- Rules stay, because CLAUDE.md is always loaded and the store is pull-only; reasons move.\n- Candidates: the four Build & deploy traps; the compare_secret and login-lock paragraphs; the bill-freeze, completion-prefill and wizard paragraphs; the dispatcher's four paragraphs; the KNOWN DEFECT paragraph.\n- Estimated reduction: about 60–90 of 390 lines (inferred), toward the ~200-line adherence range [M-02.01].\n- CLAUDE.md gains one line: 'Known errors: `ks lookup` before escalating a failure; `ks guard <paths>` before editing invariant files.'\n- If KS-7 shows the store does not beat grep over prose, CLAUDE.md is left as it is [X-05.F21].",
  "first_eight_entries_fit": "Probe predicates for ex1, ex7 and both ex8 causes were checked read-only on historical blobs in this session.\n\nex1 (non-ASCII compare_digest → 500)\n- Schema: kind defect.\n- Symptoms: the TypeError template, the HTTP 500 on /api/ops/* and the WhatsApp webhook, and the RangeError sibling in ops-server.mjs.\n- Handles: H1, H2 (python, runtime, TypeError), H6 compare_digest/compare_secret plus the three call-site files and ops-server.mjs timingSafeEqual.\n- 5 failed approaches (the typeof-null guard, the String.length guard, scope['route'].path, the OOM severity claim, a unit test as proof).\n- Fix: permanent, 2fe77f5.\n- Gate: tree_probe `git grep -n -E 'compare_digest[(]' <sha> -- 'backend/app/*.py'`, excluding core/security.py and identity/security.py. The second exclusion's reason: its hex-digest operands are ASCII by construction. The write-time negative-corpus check catches it, because without it the probe fires at HEAD.\n- Control: 2fe77f5^ has 3 non-allow-listed hits (applies); 2fe77f5 and HEAD have 0 (not_applies). Verified.\n- Secondary check: test_id on backend/tests/test_security.py, a regression guard only, since an overlay is impossible (compare_secret is absent pre-fix).\n- No Docker needed. RUNNABLE.\n\nex2 (migration 0045 duplicate revision / rollback crash-loop)\n- Schema: kind trap; symptom observation=predicted.\n- Facet a: duplicate revision ids. tree_probe with a duplicates_exist predicate over the revision assignments in backend/alembic/versions/*.py.\n- Control: fails_on_fixture (two synthetic files, one id) / passes_at ea48987. HEAD has 0 duplicates in 46 files (verified).\n- Facet b: VALIDATE in the same deploy, and the rollback crash-loop. 5 failed approaches (same-deploy VALIDATE, reflexive CHECK widening, alembic downgrade, targeting an older revision, a downgrade that drops the constraint), validity alembic 1.18.5, and a scripted two-version check proposed. Facet b stays provisional until approved.\n- Facet a is RUNNABLE without Docker.\n\nex3 (web payment idempotency key per attempt; STILL OPEN)\n- Schema: kind open_defect; no error text (silent double charge).\n- Handles: H6 AppContext.jsx logPayment, PaymentModal, uq_job_payment_client, plus H5 prose.\n- Fix: none_yet, linked to ship-plan P12a (not restated).\n- Failed approach: the naive useState in the unconditionally mounted PaymentModal, with a refuting check (patch plus a close/reopen assertion).\n- Gate: a scripted Vitest check (node-web image). fails_at a31924a (two different UUIDs, an assertion failure); no pass side until P12a merges.\n- Stays provisional and is reachable by `ks guard`. When P12a merges, drift on AppContext.jsx triggers re-verification, the reviewer adds passes_at, and the kind is revised to defect.\n\nex4 (dispatcher unseeded cursor)\n- Schema: kind defect; observation=predicted.\n- Handles: H6 run_dispatch_once, DispatchCursor, enable_dispatcher, FIXFLOW_ENABLE_DISPATCHER, 0046.\n- 5 failed approaches.\n- Fix: two locks.\n- Gate: db_probe (python-backend profile, throwaway Postgres): `alembic upgrade head`, then SELECT count(*) FROM dispatch_cursor WHERE consumer='whatsapp'; applies when 0.\n- Control: da988e2^ (head 0045, no 0046; verified) → 0; da988e2 → 1.\n- Secondary check: test_id on backend/tests/test_dispatch_integration.py, throwaway DB only.\n- RUNNABLE with Docker.\n\nex5 (completion form blank against a real bill)\n- Schema: kind defect; three door variants as symptoms.\n- Handles: H6 completionPrefill.ts, resolvePrefill, wizardState.ts, CompleteJobScreen.tsx, sendOrQueue/flushOutbox.\n- 5 failed approaches.\n- Gate: test_id via jest in the node-mobile-jest image, `-t 'BLOCKS as unknown when the fetch failed and there is no cache at all'`.\n- Control: fails_with_patch, a mutation returning 'new' on a failed fetch, because completionPrefill.ts and its test are absent at da988e2^ (verified); passes_at da988e2.\n- Provisional until the mobile image exists.\n\nex6 (login lock must keep blocking a correct PIN; DO NOT APPLY the prescribed fix)\n- Schema: kind do_not_apply.\n- Symptoms: HTTP 429 with a correct PIN, plus the pointer an agent would follow (HANDOFF A2).\n- Handles: H6 throttle.py, identity/service.py, the two test names; H5 'correct PIN locked', 'lockout DoS'.\n- fix.forbidden_change = gate the lock on the failure path, with the attack math.\n- Gate: test_id with blocks_when_fails polarity. test_five_failures_lock_the_account_even_for_the_right_pin (exists before #169; verified) and test_failed_logins_bump_counter_then_lock, run on the proposed SHA with a throwaway DB.\n- Control: the A2 patch on 1c546a3 fails / 1c546a3 passes.\n- The owner confirms. `ks guard backend/app/features/identity/throttle.py` returns it first.\n- RUNNABLE with Docker.\n\nex7 (eas.json empty-string env)\n- Schema: kind trap.\n- Handles: H1 'not allowed to be empty', H2 (eas-cli, build, validation), H6 technician-app/eas.json#/build/*/env, H4 `eas build`.\n- 2 failed approaches.\n- Gate: json_probe, applies when any build profile's env has a value equal to ''.\n- Control: 140428c applies (preview and production EXPO_PUBLIC_SENTRY_DSN; verified) / 79a8dd4 not_applies (verified); HEAD not_applies.\n- RUNNABLE without Docker. It is the hard-negative partner of ex8.\n\nex8 (Sentry Expo plugin breaks Gradle; recurrence)\n- Schema: kind trap, with two causes as two checks.\n- Handles: H2 (eas, gradle, EAS_BUILD_UNKNOWN_GRADLE_ERROR), the H1 'Run gradlew' template, H6 technician-app/app.json#/expo/plugins and .github/dependabot.yml.\n- 3 failed approaches.\n- Validity: platform Expo SDK 52, so P14-n invalidates it.\n- Gate 1: json_probe, plugins match /sentry/i. 60c026d applies / 6928828 not_applies (verified).\n- Gate 2: json_probe, the expo-asset/expo-crypto/expo-location majors differ from the SDK-52 pins (11/14/18). 6928828^ applies (~56.x; verified) / 6928828 not_applies (verified).\n- The gradle step itself is remote_inspect.\n- RUNNABLE without Docker.\n\nRunnable gates: ex1, ex2a, ex7 and ex8 without Docker; ex4 and ex6 with Docker. ex3 and ex5 hold their facets but stay provisional until their images or pass sides exist."
 },
 "backup_story": "The journal is the truth from day one, so Postgres is disposable and a backup is mostly a copy of the journal.\n\nThree layers:\n1. Journal. `ks backup` commits C:/Users/User/.fixflow-ks/journal.\n   - Stage 0: `git bundle create` to an owner-chosen folder outside Documents (a second disk or USB).\n   - Stage 2: `git push` to a bare repo on the VPS over SSH, never GitHub (X-01: every clone is a full copy).\n2. Database dump. `docker exec fixflow-ks-pg pg_dump -Fc ks` to C:/Users/User/.fixflow-ks/backups/ks-<date>.dump at each phase close, keeping 7. This is a convenience for fast restore; the journal alone suffices.\n3. Restore drill. `ks restore-drill` runs at KS-8 and then at every 50th new event, or before any Postgres image change; it is event-driven, not a calendar. It:\n   - starts a throwaway container fixflow-ks-drill;\n   - applies the schema;\n   - replays the journal;\n   - compares entry count, the sha256 over sorted event ids, and every fold status with the live store;\n   - separately pg_restores the latest dump;\n   - records the result as a lookup-free 'drill' row in ks.meta.\n\nMajor upgrades and Docker Desktop resets (a purge deletes named volumes) are handled the same way: a new container, then a rebuild from the journal, not pg_upgrade [E-03.F19].\n\nContent is scrubbed at write, so backups need no separate scrubber. A gitleaks dir audit of the journal runs once gitleaks is adopted [X-06].\n\nWhat is lost if the journal and every bundle are lost: everything. That is why the bundle target is an owner decision rather than a default inside the user profile.",
 "implementation_phases": [
  {
   "id": "KS-0",
   "title": "Recurrence audit and owner rulings (no code)",
   "entry": "This design, or the judges' merged design, is accepted by Fable. The owner has acknowledged KS-R7 (the store as a new state owner) and chosen the shape. Scheduled in a session that is not a ship phase, and never an Entry condition of any ship phase.",
   "scope": "X-05 Step 0. One Sonnet session classifies each of the 48 fix-prefixed commits on main: whether it repeats an earlier root cause (id of the earlier commit), whether it needed escalation (Co-Authored-By tier), and what cost evidence exists (NULL when unknown). An Opus session refutes a 10-commit sample. The table is committed under docs/program/evidence/knowledge-store/, ending with a go/stop line.",
   "done_when": "Every commit is classified, with denominators. Fable records go (repeats above the owner's threshold, default more than 2 of 48) or stop; stop ends the track.",
   "workflow": "Sonnet/medium extracts; Opus refutes; Fable judges",
   "size": "S (one short session)",
   "resume": "The table's first unclassified commit"
  },
  {
   "id": "KS-1",
   "title": "Store container, schema, roles, journal",
   "entry": "KS-0 go; owner decisions on the shape and on creating the container are recorded; the owner has started Docker Desktop (`docker info` prints a version)",
   "scope": "Draft PR on branch tools/ks-1, whose body is this checklist:\n- tools/ks/ks.mjs: zero dependencies; argv arrays; explicit env; transport `docker exec -i -e PGPASSWORD fixflow-ks-pg psql -X -q -At -v ON_ERROR_STOP=1`; nonce dollar-quoting.\n- `ks up --init`: postgres:17-alpine@digest, --network none, --restart unless-stopped, --memory 256m, volume fixflow-ks-pgdata, pg_hba with local scram for the ks_* roles, passwords into C:/Users/User/.fixflow-ks/secrets.\n- tools/ks/schema/001_init.sql (the DDL), roles and grants, append-only and TRUNCATE triggers, ks.ingest.\n- Journal init (git init, eol=lf); canonical JSON with sha256 ids.\n- `ks status`, `ks sync --ingest-only`, `ks doctor`, `ks self-install`.\n- Tests with node --test and psql, excluded from Vitest's include:\n  - idempotent replay;\n  - UPDATE/DELETE/TRUNCATE refused;\n  - ks_reader INSERT refused;\n  - ks_agent 'recorded' refused;\n  - stale parents give a conflict;\n  - offline semantic writes give a fork, needs_review;\n  - Docker stopped: writes spool and are ingested after restart;\n  - pg_trgm present, plus a non-ASCII trigram fixture;\n  - an injection fuzz test of the transport.",
   "done_when": "Tests green locally. `ks doctor` reports schema v1, roles verified and 0 unsynced. Root lint and format gates green. An Opus review verdict names the PR head SHA.",
   "workflow": "Sonnet implements from this test list; Opus reviews roles, append-only behaviour and the transport, refuting by default",
   "size": "M (one session)",
   "resume": "`gh pr view tools/ks-1`, first unticked box"
  },
  {
   "id": "KS-2",
   "title": "Canonicaliser and scrubber with golden fixtures",
   "entry": "KS-1 merged",
   "scope": "Draft PR tools/ks-2:\n- tools/ks/canon.mjs: ordered masks, recipe_version 1; adapters for pytest junit, Jest/Vitest json, alembic, docker plain and generic text; frame signatures; the FTS pre-tokeniser.\n- tools/ks/scrub.mjs: exact-value redaction from named env vars; the regex set incl. postgresql+asyncpg URLs, Bearer, JWT, Railway/Supabase/R2 shapes, X-Ops-Proxy-Token, PK phone, CNIC; typed placeholders; must-survive exemptions.\n- Golden fixtures: the eight examples' raw symptoms, the railway up --ci timeout (benign), the alembic CommandError pair (ambiguous), a customer row inside an error message (a documented scanner miss), and a must-survive group (SHAs, UUIDs, revision ids).",
   "done_when": "All fixtures pass, with zero over-redaction on the must-survive group; an Opus review of the scrub rules",
   "workflow": "Sonnet implements; Opus reviews",
   "size": "M",
   "resume": "PR checklist"
  },
  {
   "id": "KS-3",
   "title": "Retrieval, cards and the read-only MCP server",
   "entry": "KS-2 merged",
   "scope": "Draft PR tools/ks-3:\n- Projections (handle, search_doc) and ks.rebuild_projections.\n- ks.lookup and ks.lookup_ro: prefilter, BM25F with ts_stat IDF, word_similarity, RRF ordering at depth 20, features, threshold table v1, at most one lead and one candidate.\n- A probe-in-lookup hook for the in-process probe kinds.\n- lookup_event rows plus journal files.\n- `ks lookup`, `ks guard`, `ks show`, `ks stats`, `ks search`; output caps; re-scrub on return.\n- The MCP stdio server (hand-written JSON-RPC; ks_reader; lookups spooled locally), with the .mcp.json entry proposed, not enabled.",
   "done_when": "On a fixture corpus (the eight drafts plus ten hard negatives, incl. ex7/ex8 cross-queries) every expected miss/candidate/lead comes back. Any write attempted through ks_reader or MCP fails at the database. No output exceeds its cap.",
   "workflow": "Opus implements, because precision is the false-positive defence; Sonnet writes the fixture tests",
   "size": "L (one session; MCP split off to KS-3b if it overruns)",
   "resume": "PR checklist"
  },
  {
   "id": "KS-4",
   "title": "Gate runner: in-process probes, controls, approvals, drift",
   "entry": "KS-3 merged",
   "scope": "Draft PR tools/ks-4:\n- `ks gate` for tree_probe and json_probe (git objects at a SHA); fixture, patch-on-blob and inject controls; vacuity rules (a missing target is inconclusive); verdict JSON and exit codes 10/11/12; gate_run rows plus journal.\n- `ks check add` and `ks approve`: approver ≠ author enforced in ingest; both control runs required.\n- The negative-corpus check at write.\n- `ks drift` over blob, config_key, dep_version and platform items; reaffirm and re-stamp.\n- Checks recorded for ex1 (probe), ex2a, ex7 and ex8 (both causes).",
   "done_when": "For ex1, ex2a, ex7 and ex8: applies on the fail side, not_applies on the pass side and at HEAD, and the inject-control fires on HEAD. ex1's probe without its identity/security.py exclusion is rejected by the negative-corpus check.",
   "workflow": "Opus",
   "size": "M",
   "resume": "PR checklist"
  },
  {
   "id": "KS-5",
   "title": "Gate runner: container kinds",
   "entry": "KS-4 merged; the owner decision on gate images is recorded; Docker Desktop is running",
   "scope": "Draft PR tools/ks-5:\n- Profiles python-backend and node-web, built by `ks images build` as a trusted step keyed by pyproject/lockfile hash.\n- A per-run internal network fixflow-ks-gate-<nonce> with a throwaway Postgres; the container flags per X-02; host_busy when a fixflow-w1-* container is running.\n- `git archive` exports.\n- junit/json parsing (assertion vs error); reruns on disagreement; db_probe; test overlay; fails_with_patch.\n- ex4 db_probe and ex6 test_id approved with their controls.\n- Hostile fixtures: a network attempt, a HOME credential read, a crash with exit 1, zero tests collected, a dirty tree.",
   "done_when": "ex4's control reproduces (0 at da988e2^, 1 at da988e2). ex6's control reproduces (the A2 patch fails the protective test; 1c546a3 passes). Every hostile fixture returns inconclusive with the right reason code. No container or network is left behind.",
   "workflow": "Opus",
   "size": "L (one session; images split to KS-5a if needed)",
   "resume": "PR checklist; `docker ps -a --filter name=fixflow-ks-gate-` must be empty before resuming"
  },
  {
   "id": "KS-6",
   "title": "Seed the eight examples, the skill, the plan hook",
   "entry": "KS-4 merged. KS-5 is needed to validate ex4 and ex6; without it they enter provisional.",
   "scope": "- Record the eight entries through `ks record` with the facets given in migration.first_eight_entries_fit; checks approved by a reviewer ≠ author.\n- ex3's scripted Vitest check proposed (provisional until the node-web image and P12a's pass side exist); ex5's jest check provisional if the mobile image is declined; the owner confirms ex6.\n- .claude/skills/ks/SKILL.md, with a description ≤ 1,536 characters.\n- `ks queue`.\n- A ship-plan amendment PR carrying workflow.plan_hook_text, for Fable/owner approval.",
   "done_when": "At least 5 of the 8 entries validated, the rest provisional with recorded reasons; the skill listed; the hook PR open",
   "workflow": "Sonnet drafts entries from R-02; Opus approves checks; the owner confirms the do_not_apply entry",
   "size": "M",
   "resume": "`ks queue` and the PR checklist"
  },
  {
   "id": "KS-7",
   "title": "Pilot Step 1: blind replay and threshold calibration",
   "entry": "KS-6 done, with at least 8 validated or provisional entries (plus any CLAUDE.md traps seeded since)",
   "scope": "X-05 Step 1, run as `ks stats --view pilot` inputs:\n- blind positive queries made from raw original symptoms, never from handles;\n- at least 40 negative or stale probes: hard negatives from other entries, out-of-corpus CI failures, stale probes at old footprints;\n- leave-one-handle-out queries;\n- LLM paraphrase probes, spot-checked;\n- a grep-over-prose arm (CLAUDE.md + HANDOFF).\nCompute P@1, recall@3, abstention accuracy, false leads with the rule-of-three bound, gate_wrong, and the share of lookups that were store_unavailable. Calibrate thresholds to v2.",
   "done_when": "The numbers sit in the store's views. Fable records go or kill per the owner's thresholds (default: 0 acted false leads in at least 40 probes, recall@3 ≥ 60%, and beating grep).",
   "workflow": "Sonnet generates probes; Opus refutes the analysis; Fable judges",
   "size": "M",
   "resume": "The probe table's first unscored row"
  },
  {
   "id": "KS-8",
   "title": "Backup, phase-close sweep, restore drill, first CLAUDE.md shrink",
   "entry": "KS-7 go",
   "scope": "- `ks backup`: journal commit plus git bundle to the owner-chosen folder, and pg_dump -Fc keeping 7.\n- `ks restore-drill`: the fixflow-ks-drill container, a journal replay, a fold-digest comparison, and pg_restore of the latest dump.\n- `ks drift --all` plus `ks sync` wired into the phase-close checklist (after the hook PR is approved).\n- A CLAUDE.md PR that replaces the narrative of validated entries with one-line rules plus entry ids.",
   "done_when": "The drill gives an identical digest. The CLAUDE.md PR is merged after an Opus review confirms every rule survives as a one-liner.",
   "workflow": "Sonnet; Opus reviews the CLAUDE.md change",
   "size": "S–M",
   "resume": "PR checklist"
  },
  {
   "id": "KS-9",
   "title": "Stage 2: second host",
   "entry": "P3b done; the owner decision on stage 2 topology and host is recorded; agents actually run on the second host",
   "scope": "- The container on the VPS (--network none, its own volume, outside the production compose database); Node 24 and git there.\n- A bare journal repo over SSH; `ks sync` push/pull; the transport `ssh ks@host docker exec …`.\n- A cross-host claim test.\n- An offline drill (VPS unreachable: spooled writes and logged misses, then idempotent ingest).\n- Optionally, the dev-box read mirror.",
   "done_when": "A refute written on host A suppresses the entry in host B's next lookup. Offline writes are ingested exactly once. The drill digest matches on both hosts.",
   "workflow": "Sonnet does the infrastructure; Opus reviews; the owner works at SSH",
   "size": "M",
   "resume": "PR checklist and the W0-results decision row"
  }
 ],
 "owner_decisions": [
  {
   "decision": "Adopt shape B (a separate Postgres) rather than the embedded engine named in KS-R1",
   "default": "Adopt only if role-enforced read-only or one live store shared across hosts is wanted. The journal, CLI contract, canonicaliser, gate runner and seeding phases are engine-neutral, so they carry over either way.",
   "blocks": "KS-1"
  },
  {
   "decision": "Acknowledge the store as a new state owner (KS-R7), scoped to diagnoses, traps and negative results; PR bodies and CLAUDE.md link to entry ids instead of restating",
   "default": "Yes, scoped exactly so",
   "blocks": "KS-0"
  },
  {
   "decision": "Docker Desktop AutoStart",
   "default": "Leave OFF (the current setting). A lookup while Docker is down is a logged miss. Revisit if store_unavailable exceeds 30% of lookups at the KS-7 or prospective checkpoint (an owner parameter).",
   "blocks": "Nothing"
  },
  {
   "decision": "Create the persistent container fixflow-ks-pg (postgres:17-alpine, digest pinned; --network none; --restart unless-stopped; --memory 256m; named volume fixflow-ks-pgdata), pulling the image if it is not cached",
   "default": "Yes, recorded as a decision row with the image digest",
   "blocks": "KS-1"
  },
  {
   "decision": "Build gate images (python:3.12-slim + backend [dev] deps; node:22 + root node_modules; a mobile jest image) in a trusted, network-enabled step",
   "default": "Backend and web: yes. Mobile: deferred until a mobile entry needs it, so ex5 stays provisional.",
   "blocks": "KS-5, and validation of ex4, ex5 and ex6"
  },
  {
   "decision": "Egress scope (X-06): no store content, service or backup goes to any third party other than the model provider; nothing returned into model context may contain live credentials or customer PII",
   "default": "Adopt the two-part rule, assuming a consumer account with training off and 30-day retention until the account type is confirmed",
   "blocks": "Seeding any entry derived from production output (KS-6)"
  },
  {
   "decision": "A second scrubbing pass: gitleaks (pinned binary + checksum) and optionally secretlint (npm)",
   "default": "Deferred. The built-in Node pass ships alone; entries record scrubber identity so a later pass can re-scrub as an event.",
   "blocks": "Nothing"
  },
  {
   "decision": "Causal footprints: coverage dev-dependencies (coverage.py, @vitest/coverage-v8) and Claude Code hooks that log reads",
   "default": "No. Footprints come from the fix diff, the check targets, declared reads and the environment probe; over-invalidation is accepted.",
   "blocks": "Nothing"
  },
  {
   "decision": "Stage-2 topology and host: (a) one live container on the VPS reached by `ssh … docker exec … psql`, or (b) one container per host rebuilt from a git-synced journal; plus Node 24 and git on that host and a bare journal repo over SSH (never GitHub); and whether the container may sit on the production host or must go on the home box",
   "default": "(a), decided only after P3b and only if agents run on the second host",
   "blocks": "KS-9"
  },
  {
   "decision": "Thresholds and pilot numbers (KS-R10): the θ values; X-05's Step-0 stop at ≤ 2 repeats in 48 fix commits; the Step-1 pass bar; a checkpoint at 20 encounters or 8 weeks with the kill rule",
   "default": "X-05's proposals and the θ values in retrieval.thresholds",
   "blocks": "The KS-0 and KS-7 verdicts"
  },
  {
   "decision": "Who may approve checks",
   "default": "Opus sessions and the owner, never the author; do_not_apply entries that encode an owner decision need the owner",
   "blocks": "KS-4, KS-6"
  },
  {
   "decision": "Embeddings (the pgvector image plus a local transformers.js model)",
   "default": "No; revisit only on the measured trigger (missed_existing lookups with zero lexical overlap)",
   "blocks": "Nothing"
  },
  {
   "decision": "Register the read-only MCP server in .mcp.json",
   "default": "No; the CLI suffices (E-10)",
   "blocks": "Nothing"
  },
  {
   "decision": "Backup target for the stage-0 git bundle and pg_dump",
   "default": "C:/Users/User/.fixflow-ks/backups plus an owner-chosen copy target outside Documents (a second disk or USB)",
   "blocks": "KS-8"
  },
  {
   "decision": "Shrink CLAUDE.md by moving narrative into the store",
   "default": "Only after KS-7's go decision, entry by entry, in an Opus-reviewed PR; rules stay as one-liners",
   "blocks": "KS-8's CLAUDE.md PR"
  }
 ],
 "limits": [
  "The store is unreachable whenever Docker Desktop is stopped. AutoStart is off, and agents may not start Docker. In those sessions every lookup is a miss, including trap-class entries whose probe gates would run without Docker. This loss is measured as the store_unavailable share of lookups.",
  "Anyone who can use the Docker socket is superuser on the store (`docker exec -u postgres`, peer auth), and role passwords sit in the user profile. Role separation stops accidents, MCP/SQL-injection paths and poisoned facets, not a deliberately hostile agent with Bash. Actor identity is self-reported.",
  "Postgres ranking has no IDF, so the BM25F and coverage SQL is code this project owns and must test. IDF is unstable below about 50 entries, so early precision rests on exact handles and probes.",
  "Thresholds are guesses until KS-7. With 40–60 probes, a false-lead rate can only be bounded at 7.5–5%, never shown to be zero [T-03.F20; X-05.F17].",
  "Undetectable dependencies: transitive packages outside the footprint; remote resolvers (EAS image defaults, Railpack, Meta, Supabase); production data state (ex2's off-vocabulary kinds, ex4's prod cursor row); environment-only causes. v1 footprints are whole-file and over-invalidate.",
  "Native Android, EAS and Gradle causes cannot be reproduced on this box. Their gates are remote_inspect (inconclusive); only static preconditions are probed (ex8's plugin and versions, not the gradle step).",
  "Silent-symptom defects (ex3's double charge, ex5's blank bill) have no error text. They are reachable through anchors (`ks guard`) and prose, not templates, and recall for them will be lower.",
  "Open defects, and fixes that created new modules, cannot have a classic fails_at/passes_at pair. They rely on patch or mutation controls, or stay provisional (ex3 until P12a; ex5 via a mutation).",
  "At stage 2 with a VPS primary, a dev box with no network has no reads unless the optional mirror runs. Per-call SSH and docker-exec latency is unmeasured.",
  "There is no evidence yet that hard problems recur often enough in this repository to repay the track (X-05). KS-0 can stop it.",
  "Everything a card returns reaches the model provider. Scrubbing limits what is sent, not whether anything is sent [X-06].",
  "Retrieval and fold rules live in plpgsql. The journal is engine-neutral but the rules are not, so an engine change re-implements them; conformance tests reduce that risk but do not remove it.",
  "At stage 0, for the same retrieval quality, this shape costs more to operate than an embedded engine (E-03's verdict). Its benefits are role enforcement now and cross-host sharing later.",
  "It adds a second stateful service and a new state owner for an owner who wants less to track. `ks status`, the restart policy and rebuild-from-journal reduce that burden but do not remove it."
 ],
 "load_bearing_claims": [
  {
   "id": "LB1",
   "claim": "The CLI needs no npm package. Every database operation is one `docker exec -i fixflow-ks-pg psql` call whose JSON argument is a dollar-quoted literal tagged with a fresh random nonce absent from the payload, so agent-supplied text can never become SQL or a psql meta-command. Lookup latency is p95 ≤ 2 s on the dev box.",
   "falsifiable_by": "Falsified if, in KS-1's fuzz test, a payload containing $-tags, backslash meta-commands, :var interpolations or NUL bytes, or 1 MB of text, executes anything other than the intended function call; or if the measured p95 over 100 lookups exceeds 2 s.",
   "rests_on": "Postgres dollar-quoting semantics and psql's lexer handling of quoted text (not in the register; PostgreSQL documentation). psql ships in the official image (not in the register). The image is already in use [E-03.F22]. argv-array spawning with an explicit env [X-02.F19]."
  },
  {
   "id": "LB2",
   "claim": "pg_trgm and full-text search work in postgres:17-alpine with no custom image, and pg_trgm treats non-ASCII letters as word characters there.",
   "falsifiable_by": "Falsified if `CREATE EXTENSION pg_trgm` fails in KS-1, or if a fixture containing 'é' and Urdu text yields no trigrams for those letters. The fallback is postgres:17-bookworm.",
   "rests_on": "E-03.F03 and F18, and E-03's open questions on alpine contrib and non-ASCII handling (explicitly unverified)"
  },
  {
   "id": "LB3",
   "claim": "Score-free abstention (exact handles, IDF-weighted coverage from ts_stat, pg_trgm word_similarity, margin) plus probe-in-lookup yields 0 acted false leads on at least 40 hard-negative/stale probes, while reaching recall@3 ≥ 60% on blind positives from raw original symptoms and beating grep over CLAUDE.md+HANDOFF.",
   "falsifiable_by": "Falsified by the KS-7 replay: any acted false lead, recall@3 below 60%, or grep matching the store at equal precision.",
   "rests_on": "T-03.F02, F06, F26; E-03.F03; X-05.F17, F21 (thresholds are owner parameters, KS-R10)"
  },
  {
   "id": "LB4",
   "claim": "The declarative probes discriminate. ex1's tree_probe, ex7's json_probe and both of ex8's json_probes return applies at their fail-side SHAs and not_applies at their pass-side SHAs and at HEAD. ex1's probe without its identity/security.py exclusion is rejected by the write-time negative-corpus check.",
   "falsifiable_by": "Falsified if any control run in KS-4 fails to reproduce. The raw predicates were checked read-only on historical blobs in this session: ex1 2fe77f5^ 3 non-allow-listed hits vs 0 at 2fe77f5; ex7 140428c applies vs 79a8dd4; ex8 60c026d vs 6928828, and 6928828^ (~56.x modules) vs 6928828.",
   "rests_on": "X-02.F29 (control pairs); R-02 examples; local read-only git checks performed during this design"
  },
  {
   "id": "LB5",
   "claim": "Writing the journal first means no write is lost when Docker or the VPS is unavailable, and `ks rebuild` from the journal alone reproduces the identical fold (the same sha256 over sorted event ids and the same status for every entry), because the fold is a function of the event set, not of arrival order.",
   "falsifiable_by": "Falsified if the KS-1 offline test or the KS-8 drill shows any divergence; if a Windows temp+rename failure loses a file; or if an ingest-order-dependent status appears.",
   "rests_on": "KS-R1, KS-R8; X-01.F20-F21; the operation-DAG pattern [E-09.F02]; T-06 (commuting events). NTFS rename behaviour is untested (critic)."
  },
  {
   "id": "LB6",
   "claim": "Engine-level privileges make the read surface unable to write, whatever bugs the wrapper has. ks_reader and the MCP server cannot INSERT, UPDATE, DELETE or TRUNCATE anything. ks_agent cannot write any semantic event kind. No role can mutate a truth table.",
   "falsifiable_by": "Falsified if any write succeeds through ks_reader or an MCP tool call; if ks.ingest accepts a 'recorded', 'revised' or 'check_approved' event from ks_agent; or if an UPDATE or TRUNCATE on ks.entry_event succeeds for any role.",
   "rests_on": "E-03.F14 (enforce at the role, not the wrapper); X-02.F17 (session defaults can be undone, roles cannot); PostgreSQL GRANT/trigger semantics (not in the register)"
  },
  {
   "id": "LB7",
   "claim": "A container with --network none, no published port, its own role passwords and database name ks cannot be reached by the backend's Settings default (localhost:5432) or by a pytest run whose conftest TRUNCATEs the tables at its URL. A gate container cannot reach it either.",
   "falsifiable_by": "Falsified if any TCP connection from the host or from a gate container reaches fixflow-ks-pg, or if a backend pytest run with default or inherited FIXFLOW_* variables touches the ks database.",
   "rests_on": "X-02.F06, F13, F14; backend/tests/conftest.py (create_all + TRUNCATE over Base.metadata tables at whatever URL it is given); backend/app/core/config.py:30 default"
  },
  {
   "id": "LB8",
   "claim": "The cost of Docker being down stays bounded: across the prospective checkpoint, fewer than 30% of lookups return store_unavailable, because backend phases already start Docker for their gates.",
   "falsifiable_by": "Falsified if the store's own log shows ≥ 30% store_unavailable lookups at the 20-encounter or 8-week checkpoint. The response is then turning AutoStart on or changing engine, an owner decision.",
   "rests_on": "Ship plan §0 'Gates' (the owner starts Docker Desktop for backend gates); orchestration §8 (agents never start Docker); E-03.F21. The 30% figure is an owner parameter (KS-R10)."
  },
  {
   "id": "LB9",
   "claim": "At stage 2, one Postgres on the VPS, reached over SSH, makes a refute or claim written on one host visible to the other host's very next lookup with no sync step: the monotonic-reads target per-host indexes cannot meet before a sync.",
   "falsifiable_by": "Falsified if, in KS-9's two-host test, host B still receives a refuted entry as a lead, or does not see host A's open claim, after host A's write has been acknowledged.",
   "rests_on": "T-01 consistency target; T-06 (claims); X-01.F26-F28 (SSH, no third-party coordinator). X-01 counters that a VPS-resident service loses offline reads; this design accepts that as misses."
  },
  {
   "id": "LB10",
   "claim": "In a phase with no hard problem the store costs under about 5k tokens and under 1 minute of wall time (1–3 lookups or guards plus the phase-close sweep), and it is never injected into context.",
   "falsifiable_by": "Falsified if the median cost per phase in the prospective log exceeds 5k tokens or 1 minute, or if any lookup output exceeds its 4,000-character cap.",
   "rests_on": "E-10.F18 (output bounds); X-05.F12 (pull-only); inferred estimates (KS-R10)"
  }
 ],
 "risks": [
  "The store goes unused: Docker is often stopped, so lookups are mostly store_unavailable misses and no value is measurable. Trigger: unavailable above 30% at the checkpoint, then decide on AutoStart or an engine change.",
  "An acted false positive through an over-broad probe or a mis-calibrated threshold; ex1's identity/security.py hit shows how easily a probe over-matches. Mitigations: the negative-corpus check at write, probe-in-lookup used only as a filter, a gate per act, and a kill rule on any acted false positive that reaches a merged change.",
  "Cheap agents copy poisoned or wrong entries (experience-following [M-02.28]; AgentPoison [X-02.F21]). Mitigations: at most one lead shown; provisional until a reviewer approves the check; proposals inactive until reviewed; a fresh gate per act.",
  "Data loss from a Docker Desktop reset or purge, or a WSL distro reset, which deletes named volumes. Mitigations: journal first, git bundles, and the rebuild drill.",
  "Collision with the app's dev stack (port 5432, container names, conftest TRUNCATE). Mitigations: no published port, --network none, its own names and database name.",
  "Store work delaying ship phases. Mitigations: the hook says to skip on any store error; no KS phase is ever an Entry condition of a ship phase; container gates yield to fixflow-w1-* runs (host_busy).",
  "The store drifts into restating plan, PR or register content and becomes a second CLAUDE.md. Mitigation: link-only facets (KS-R7) and review at record time.",
  "Bugs in the hand-written SQL ranking silently change verdicts. Mitigations: golden lookup fixtures and the threshold version recorded on every lookup.",
  "Stage-2 co-location on the production host adds resource contention and a larger attack surface on prod. Mitigations: a separate container with --network none and SSH-only access, or placement on the home box (owner decision).",
  "CLI or schema version skew across parallel worktrees. Mitigations: self-install from mainline, min_cli enforcement, and a scratch ks_dev database for CLI development.",
  "Contradictions in the seed corpus (HANDOFF A2 vs CLAUDE.md) becoming entries. Mitigation: per-entry seeding through the gate, with do_not_apply entries first-class (KS-R9).",
  "Secrets or PII leaking into the journal and backups. Mitigations: scrub at write and on return, a structural ban on production output, and a gitleaks audit once adopted.",
  "Postgres 17 end of life and image churn. Mitigation: rebuild on a new major from the journal, not pg_upgrade."
 ]
}
```
