# Validation contract v1 (frozen before any prototype code or trial)

Written 2026-10-09 by the owner, before the map prototype existed and before any trial. Frozen by the hashes in `contract.sha256`. Any later change is a new version with its reason; results are reported against the version in force when they were produced. Development cases are not holdouts: the owner wrote both the cases and, later, the prototype.

## 1. Corpus and scope

- **S1** (`../corpus-manifest.json`): `docs/clinic-planning-brief.md` and the 10 files of `docs/technical-plan/`, copied byte-for-byte to `../corpus/` (167,342 bytes, about 41.7k tokens). Four files are byte-identical to the frozen pilot (`03-pilot/files`).
- **S1-prime:** S1 plus the three labelled test edits in `make_modified_snapshot.py`. These are test modifications, not clinic facts. S1-prime is generated only in disposable locations (`tmp/`).
- **Outside scope:** everything the corpus references outside S1, including the authoritative PDF, the research documents, prompts and AGENTS.md as corpus text, plus external URLs. These are coverage frontiers, not support.

## 2. Cases

Worker-facing task text is in `tasks.json`. References, meaning obligations with source evidence, are in `sealed/references.json`. Workers never receive them. All 97 reference quotes were verified at their stated lines by `check_references.py`.

| Case | Real capability exercised |
| --- | --- |
| C1 | Genuine multi-step cross-section chain (S09 back to S00); joint prerequisites ("S05–S08" plus UI contracts); converging routes; a supplied foundation in another file; open items |
| C2 | Missing or unverified support; required content supplied in a file outside the four-file pilot; gates; the `$8` negative case (shared amounts must not link) |
| C3 | Misleading similar identifiers (U-02 vs USER-02); a named foundation defined only outside scope; an operational gate |
| C4 | One repeated name ("fallback") with four distinct referents; joint conditions ("all gates pass"); alternative routes |
| C5 | Changed source (S1-prime): changed dependency and gate timing, a stated circular dependency, a stale-diagram inconsistency, use from a fresh context |

The cases were chosen for the required capabilities before any prototype existed. The frozen `$8` example appears only as a negative case. There are no synthetic task cases. Synthetic graphs are used only in unit tests of mechanisms, and are labelled there.

## 3. Arms (same corpus, task text, answer format, model and budget)

| Arm | Materials in the worker's workspace | Configuration |
| --- | --- | --- |
| M: map | corpus copy, persisted map store, `cmap` CLI, its quickstart | Prototype as it stands at trial start; its file hashes are recorded in the run log. C5 uses the map after the refresh procedure on S1-prime. |
| R: routed reading | corpus copy, copies of `AGENTS.md`, `docs/prompts/coding-task-launcher.md`, `docs/agentic-coding/project-context-routing.md` | The project's existing routing: AGENTS.md route, then launcher, then plan index, then slice, decision log and context map. |
| G: Graphify | corpus copy, `graphify-out/` built over the same snapshot, pinned CLI | `graphifyy` 0.9.81 in an isolated venv. Default build (undirected, not deep). Semantic extraction by host subagents using the package's verbatim `references/extraction-spec.md`, in one chunk (11 files, below its 20–25-file chunk size). Community labels by an agent (skill Step 5). Queries via `graphify query/path/explain/affected` per `references/query.md`. C5 uses the `--update` flow of `references/update.md`. No `graphify install`, hooks or settings changes. |

**For every arm:**

- Workers are fresh agents launched by the workflow tool with the session's default model and effort. They have no access to this conversation.
- The project's AGENTS.md is injected into every worker by the harness, equally for all arms; this is disclosed as a shared confound.
- Workers may open source lines in their corpus copy. They may not use the web or read outside their workspace.

## 4. Budgets

- **Working-context budget per run:** at most 16,000 tokens of material read through tools, measured as total tool-result characters divided by 4 and including instruction documents opened, plus at most 30 tool calls. The task prompt and arm brief are not counted, and each is kept at about 1,000 tokens or less.
- **Map packets:** the map's own packet budget is set by the worker per call. Its cumulative output counts against the 16,000.

## 5. Runs and stopping

- 2 runs per arm per case: 30 runs.
- One evaluator scoring pass.
- One targeted repair round for demonstrated map-arm failures. The affected map-arm cases are then re-run (2 runs each) and re-scored, labelled post-repair.
- Then stop. No further experiments are added to improve the result. The comparator arms are not re-run unless a harness defect, not the method, invalidated their runs; that would be recorded.

## 6. Scoring

**Mechanical (scripts):**

- Citation correctness: each cited quote must occur on the cited line or within the cited range of the cited file in the case's snapshot.
- Context consumed: material tokens and tool calls per run, from transcripts.
- Isolation audit: reads outside the workspace or of `validation/`.
- Costs: construction, analyst decisions, query and update.

**Evaluator (one independent evaluator role, run once per case batch with the same instructions; it also acts as skeptic of the final claims):**

- Answers are blinded: arm labels removed and Process sections stripped.
- Per obligation: met = 1, partial = 0.5, missed = 0, multiplied by its weight. Obligation score = weighted sum divided by total weight of positive obligations.
- Negative obligations: violated or not.
- Unsupported claims: claims that the corpus does not support or that contradict it, including links asserted from similarity alone.
- Gaps: whether gap-type obligations are exposed.
- Decision quality: 0–2, using the case rubric.
- The evaluator may report reference errors. These are recorded and do not silently change scores.

## 7. Acceptance criteria for the method (map arm)

| ID | Criterion |
| --- | --- |
| V1 | Mean obligation score over all map runs ≥ 0.70, and each case mean ≥ 0.50 |
| V2 | Negative-obligation violations in at most 1 of the 10 map runs; zero stale answers in C5 |
| V3 | ≥ 90% of map-arm cited quotes verify mechanically |
| V4 | Mean unsupported claims ≤ 1.0 per map run |
| V5 | Gap-type obligations (C1-O6, C2-O4, C3-O6, C5-O6) score at least partial in every map run |
| V6 | Every map run within 16,000 material tokens and 30 tool calls |
| V7 (MC-1, changed source) | On S1-prime the map detects both changed files. Before refresh, records in changed regions are marked stale and excluded from current evidence, so stale reasoning is not served as current. Affected chunks and cached results are invalidated. Unaffected records are preserved: identical record ids and quotes, with line-shifted spans remapped. Only changed chunks are re-read. After refresh, the C5 answers reflect the changes. |
| V8 (MC-2, incremental construction) | Every reader handles one chunk within the declared chunk budget. Progress persists in the ledger. A build with a withheld chunk shows the file as partly read, with provisional gaps. Resuming reads only the missing chunk. |
| V9 (fresh-session use) | Map workers use only the persisted artifacts and quickstart in their workspace, with no reads outside it and material within budget |

**Verdict rules:**

- **Viable within the tested scope:** V1–V9 all pass.
- **Partially viable:** V1 ≥ 0.50, V2 violated in at most 2 runs, and at least one other criterion unmet. Unmet criteria are named.
- **Not viable under the tested conditions:** otherwise.

## 8. Comparative reporting

- Reported per dimension: obligation score, negative violations, unsupported claims, citation correctness, gaps exposed, decision quality, context consumed and costs. Each is given per arm, with per-run values.
- **Score dimensions:** "better" or "worse" requires a mean difference ≥ 0.10 and the same direction in at least 4 of 5 cases. "Equivalent" means |difference| < 0.05. Anything else is mixed or inconclusive.
- **Counts:** better or worse requires a difference of at least 2 across the 10 runs of an arm.
- Context and cost are shown alongside quality, never alone. Fewer tokens with missing prerequisites is not a win.
- A documentation comparison does not establish performance.

## 9. Mechanism checks (deterministic, map only unless stated)

- **MC-1:** see V7. Graphify's change detection (`detect_incremental`) and `--update` are run on the same S1-prime and reported descriptively.
- **MC-2:** see V8.
- **MC-3:** ID-8 and level tests requested by the user. Expressions with zero, one and several reachable referents. S3 records affect only L3: L1 and L2 answers are identical with and without them. These run on synthetic graphs (labelled) and on the real map.

## 10. Limits stated in advance

- The cases are development cases written by the same owner who builds the method.
- Two runs per arm show variance only roughly.
- The corpus is small enough that unbounded reading would fit in one window. The budget imposes the bound artificially.
- No clinic application exists, so implementation-quality improvement is not tested and remains unverified.
- The evaluator, the workers and the readers are all models.
