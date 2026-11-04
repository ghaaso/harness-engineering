export const meta = {
  name: 'ks-critique-check',
  description: 'Check the owner critique of the knowledge-store design v1.2: doc fidelity, engineering merit, cited research, synthesis per point, and what the critique missed',
  phases: [
    { title: 'Verify', detail: 'two Opus lenses per critique point: doc fidelity and engineering merit', model: 'opus' },
    { title: 'Research', detail: 'four Sonnet researchers check the cited facts and numbers', model: 'sonnet' },
    { title: 'Synthesize', detail: 'one Opus skeptic per point folds lenses and research into a verdict', model: 'opus' },
    { title: 'Missed', detail: 'one Opus critic: what the critique missed in the same areas', model: 'opus' },
  ],
}

const S = 'C:\\Users\\User\\AppData\\Local\\Temp\\claude\\C--Users-User-Documents-projects-EMS-workshop1\\e24f17dc-4aea-4914-a9d1-280a723d620e\\scratchpad\\ks'
const REPO = 'C:\\Users\\User\\Documents\\projects\\EMS_workshop1'

const COMMON = `
CONTEXT (read before anything else):
- The design under review: ${S}\\design.md (831 long lines; KNOWLEDGE-STORE-DESIGN-2026-11.md v1.2 from PR #183, branch claude/knowledge-store-research-9c609c). Read it in chunks (Read with offset/limit of ~60-120 lines; lines are long).
- The critique under check: ${S}\\critique.md (verbatim; written by the repository owner on 2026-11-03).
- Raw evidence behind the design: ${S}\\evidence\\refute\\ (refuter verdicts refute-KS-C<n>-<lens>.md and the completeness critic critic.md), ${S}\\evidence\\panel\\ (architect-{A,B,C,D}.md, judge-{1,2,3}.md), ${S}\\evidence\\sweep\\ (research lanes lane-*.md).
- The code repository checkout: ${REPO} (Windows; branch docs/orchestration-design-2026-10, which also holds the ship-plan docs under docs\\program\\, incl. HARNESS-REVIEW-2026-11-01.md and SHIP-PLAN-2026-11.md). Code: backend\\ (FastAPI, alembic migrations), src\\ (React .jsx), technician-app\\ (Expo TypeScript).
- The owner's standing constraints the design honours: nothing is installed on the box without an owner decision; the store is pull-only with no hooks (design §7.1, X-05 F12, M-02 32; the harness review HR §4 skipped the clinic project's hook machinery; HR §5 skipped call-graph tooling); code-behaviour entries may not be a lead on a text probe (KS-F7); the owner said "do not take critiques blindly: if misjudged, say so".
RULES: read-only; do not modify any file; install nothing; run no network-touching command except WebSearch/WebFetch where your brief says so. Quote the design by section number and line (the Read tool shows line numbers). Default to skepticism in both directions: a critique point can be wrong, and the design can be wrong. Your final text IS the return value: return only the structured output requested.
`

const POINTS = [
  {
    key: 'P0-parser',
    title: 'Point 0 (the header): syntax trees should run the checks; the doc plans a hand-written reader for five languages; those checks are the store\'s only safety gate; every slip becomes a wrong present/absent; ast-grep is a maintained parser, one pinned npm package with a prebuilt Windows binary, never matches inside comments or strings; the limit: no parser recognises the same behaviour written differently, ex3 still needs a real test.',
    focus: `Doc passages to check: §3.4 "The probe discipline" (KS-F7; the hand-written lexer for Python, TS/JS, JSON, YAML, SQL; golden fixtures; ast-grep as the D5 alternative; fallback rate as a KS-9 metric), §3.5 symbol_span, §5.2, §9 "The gate proves a condition, not a cause", §11 D5 (default: none installed), §12.5 KS-C6 and KS-C14 (and their raw verdicts refute-KS-C14-*.md, refute-KS-C6-*.md), §12.6 K14, §10 KS-3 scope. Questions: (a) Is it true that the lexer-based text checks are "the store's only safety gate"? List every other defence the doc has against a wrong present/absent (probe discipline, control pairs, refactor mutants, comment-injection mutant, preconditions, executable checks, inject-control, outcome events) and say for each whether a lexer slip gets past it. (b) Which verdicts can a lexer slip actually corrupt: a lead? a candidate? a regression report at phase close? an invalidation (symbol_span hash)? (c) Engineering merit: enumerate the real lexing hazards in THIS repository that a hand-written lexer must handle: JSX text containing apostrophes or braces in src\\**\\*.jsx (the design anchors spans in JobDetail.jsx and AppContext.jsx), regex-literal vs division ambiguity in JS/TS, template literals with nested \${}, Python f-strings with nested quotes and triple-quoted strings, byte/raw strings, SQL inside Python string literals in alembic migrations (op.execute), Postgres dollar quoting, YAML block scalars and quoting in .github\\workflows. Grep the repo for concrete instances (give file:line). (d) Is "zero-dependency" a good enough reason to prefer the hand lexer as the DEFAULT with ast-grep as an option, given the owner's install rule is "nothing without an owner decision" (so asking for one is allowed)? (e) Does ast-grep cover all five languages (note: check whether SQL and YAML are built-in; the Research lane will web-check, but say what you expect and what it would mean if SQL is not built in). (f) Does the critique's "limit" clause agree with the doc's KS-F7/KS-C14 position?`,
  },
  {
    key: 'P1-callers',
    title: 'Point 1: add a one-hop "who calls this function" list to each entry\'s footprint; example: a later phase adds a "remember this device" login in a new file that calls the PIN check and clears the lock without the lockout check; today ex6\'s files do not change so ex6 stays trusted; with a callers list the new call site turns ex6 suspect; only one hop (AppContext.jsx hub; Facebook\'s transitive selection picked ~10,000 tests of which 99.9% passed).',
    focus: `Doc passages: §1.4 "Not a code index. Call-graph tooling was evaluated and skipped (HR §5)", §3.5 footprint items and tiers, §5.1 triggers, §5.2 mechanism (suspect for this caller only; phase-close scan; "newly suspect" count in the closing message), §5.5 "Semantic changes outside the footprint (a new caller passing different input to an unchanged function)", §9 untracked dependencies, §12.5 KS-C8. Also read HARNESS-REVIEW-2026-11-01.md §5 (graphify skip) on the repo checkout. Questions: (a) Does the doc admit this gap? Quote it. (b) Walk the critique's ex6 example against the actual code: backend\\app\\features\\identity\\throttle.py and service.py (what function a new "remember this device" flow would call; what ex6's protective test asserts; whether ex6 is a do_not_apply entry whose footprint is the login path). If a callers list made ex6 "suspect", what happens next under §5.2: the gate re-runs the protective test, which still passes, so the entry is reaffirmed. Does the mechanism as proposed catch the bug in the example, or only produce a "newly suspect" line that a reviewer might read? Is "suspect" even the right state (the entry is not stale; the new code violates the rule)? (c) What would a one-hop callers list cost to compute (ast-grep pattern per symbol; ripgrep on the symbol name; Python ast; TS compiler API), at capture and at every lookup/close, and how does it interact with HR §5's skip of call-graph tooling (is a one-hop symbol-name search a "call graph tool")? (d) Does the hub argument (AppContext.jsx) hold, and is one hop the right bound? (e) Net: adopt, adopt modified (say how), or reject; and whether it is a slip of the DESIGN or a nice-to-have.`,
  },
  {
    key: 'P2-trigger',
    title: 'Point 2: silent bugs need a code trigger, not a wording match; ex3, ex4, ex6 have no error text so error-driven lookups never find them; "a miss is cheap and safe" is wrong for do-not-do warnings; fix: when an agent edits a function an entry protects, show that one warning (breaks the pull-only/no-hooks rule; capped at one warning, matched by function, tested separately in the pilot).',
    focus: `Doc passages: §0 rule 1 ("a miss costs nothing"), §1.3 ("a miss is cheap and safe"), §3.3 the action and doc_ref handles ("the only handle for silent defects ... ex3, ex4, ex6"), §7.1 ("There is no hook: the store is pull-only and injects nothing (X-05 F12; M-02 32)"), §7.2 ALL FOUR non-error triggers (before escalating; before retrying; before applying a prescribed fix with --prescription; once per code phase at its first commit with --files <Scope paths> --action <Goal>, conditional on a footprint intersection), §7.6 the proposed plan text, §7.8 compliance measured not assumed, §9 "Lexical retrieval only", §12.3 KS-A4 (guard <paths> realised as lookup --files --action), §12.5 KS-C9. Also read HARNESS-REVIEW-2026-11-01.md §4 on the repo checkout (the rulings on the clinic project's hooks: which were skipped and why) and the sweep lane for M-02 (lane-M-02*.md in ${S}\\evidence\\sweep) for what "M-02 32" (Gloaguen et al., repository context files raise cost >20% without gains) and X-05 F12 actually say, and whether that evidence is about always-loaded context or about rare targeted warnings. Questions: (a) Is "lookups driven by errors can never find them" accurate given --files --action at first commit, --prescription, and doc_ref? What is the real gap (granularity: phase Scope paths once at first commit vs an edit of a protected function mid-phase; the Scope paths are the plan's, not the diff's)? (b) Is "a miss is cheap and safe" wrong for do_not_apply entries? What does a miss cost there (the agent applies the forbidden fix; the PR's Opus reviewer is the remaining defence; the plan's reviewer brief names register ids)? (c) Evaluate the critique's fix (a PostToolUse hook on Edit/Write that joins the edited path and function span against entry footprints and prints at most one warning) against (i) the doc's reasons for no hooks, (ii) cost per edit (one cheap join; fires rarely), (iii) Claude Code hook mechanics (PostToolUse stdout/additionalContext reaches the model? use WebFetch on https://docs.claude.com/en/docs/claude-code/hooks if needed; load WebFetch via ToolSearch "select:WebFetch"), (iv) the RT-01..RT-09 defects and the clinic's hook experience. (d) Propose the hook-free alternative: a diff-time check (ks lookup --files <the PR's actual diff paths> at ks close / before PR-ready, or at every commit) and compare: what each catches and when. (e) Net: is the critique right that the design has a slip here, and is the hook the right fix or an option for the pilot?`,
  },
  {
    key: 'P3-embeddings',
    title: 'Point 3: the rule for when to add embeddings was wrong; wording gaps come from how people describe symptoms, not from store size; 19–23% of duplicate bug reports are worded differently and keyword search finds 10–18 points fewer; "keyword beats embeddings at this scale" is not established, it depends on query kind; fix: make misses visible (when Opus records a new entry it first checks whether an existing entry should have matched); add a local embedding model only after 3+ real wording misses.',
    focus: `Doc passages: §2.1 T-03, §2.2 E-07 (the trigger "≈ 5 % missed, entry existed over 50 lookups or > ~1,000 entries", inferred; the ≤ 200 entries ≈ 8k-token one-line index; LLM-as-reranker; doc2query at write time), §3.3 prose and action handles, §4.1 step 3 (no LLM re-ranking inside the store), §4.4 Embeddings, §4.5 v_missed_existing ("a miss later resolved to an existing entry ... classified by cause: typo, vocabulary, handle gap"), §4.6, §7.3 the write gate's near-duplicate check (exact pairwise Jaccard; a near duplicate extends the existing entry's handles), §3.2 root_cause_id, §9 "Lexical retrieval only", §11 D16, §12.1 KS-R10. Questions: (a) Is D16 "wrong"? Note it is an OR of two triggers: a miss-rate arm (5 % of 50 lookups ≈ 2.5 misses, i.e. about the critique's "3 or more") and a size arm. What is the size arm's rationale in E-07 (cost of the lexical shortlist plus LLM re-rank past ~1,000 entries), and does the critique's "wording gaps come from how people describe symptoms, not from store size" refute the size arm or merely the miss arm's framing? (b) Can v_missed_existing as designed ever populate? It needs a lookup.miss whose LATER outcome names an entry that existed at lookup time: how would the agent learn that entry existed after a miss? Trace the paths (the write gate's Jaccard near-duplicate check at record time; an Opus reviewer noticing; root_cause_id reuse). Is the critique's "Opus checks at record time whether an existing entry should have matched" a real improvement to measurability, and is it already partly there (Jaccard)? (c) Does the doc claim "keyword beats embeddings at this scale" unconditionally, or conditioned on entity-like tokens (BEIR, Sciavolino, LIMIT)? Does "it depends on the kind of query" contradict or restate the doc? Which query kinds in THIS store are prose symptom descriptions (where dense retrieval helps with vocabulary mismatch) vs error text and identifiers (where it hurts), and how does the doc handle the first kind (write-time paraphrases, action handles)? (d) The Research lane checks the 19–23 % and 10–18 point figures; state what you expect them to be from and whether, if true, they change the design's decision (embeddings later behind a measured trigger). (e) Net verdict: slip, partly, or misjudged.`,
  },
]

const LENS_SCHEMA = {
  type: 'object',
  properties: {
    point: { type: 'string' },
    lens: { type: 'string' },
    premise_accuracy: { type: 'string', enum: ['accurate', 'partly_accurate', 'inaccurate'] },
    misstatements: { type: 'array', items: { type: 'object', properties: { critique_claim: { type: 'string' }, what_doc_says: { type: 'string' }, doc_ref: { type: 'string' } }, required: ['critique_claim', 'what_doc_says', 'doc_ref'] } },
    what_critique_gets_right: { type: 'array', items: { type: 'string' } },
    merit_verdict: { type: 'string', enum: ['adopt', 'adopt_modified', 'reject', 'already_in_design'] },
    reasoning: { type: 'string' },
    recommended_change: { type: 'string' },
    evidence_checked: { type: 'array', items: { type: 'string' } },
    open_questions_for_research: { type: 'array', items: { type: 'string' } },
  },
  required: ['point', 'lens', 'premise_accuracy', 'misstatements', 'what_critique_gets_right', 'merit_verdict', 'reasoning', 'recommended_change', 'evidence_checked'],
}

const RESEARCH_SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    claims: { type: 'array', items: { type: 'object', properties: {
      claim: { type: 'string' },
      verdict: { type: 'string', enum: ['supported', 'partly_supported', 'unsupported', 'contradicted', 'could_not_check'] },
      what_sources_say: { type: 'string' },
      sources: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, url: { type: 'string' }, read: { type: 'string', enum: ['fetched', 'search_snippet_only'] } }, required: ['title', 'url', 'read'] } },
    }, required: ['claim', 'verdict', 'what_sources_say', 'sources'] } },
    notes: { type: 'string' },
  },
  required: ['topic', 'claims', 'notes'],
}

const SYNTH_SCHEMA = {
  type: 'object',
  properties: {
    point: { type: 'string' },
    verdict: { type: 'string', enum: ['right', 'mostly_right', 'partly_right', 'mostly_wrong', 'wrong'] },
    one_line: { type: 'string' },
    what_is_right: { type: 'array', items: { type: 'string' } },
    what_is_wrong_or_overstated: { type: 'array', items: { type: 'string' } },
    where_the_design_is_weak: { type: 'array', items: { type: 'string' } },
    strongest_counter_to_critique: { type: 'string' },
    strongest_counter_to_design: { type: 'string' },
    recommended_action: { type: 'string' },
    cited_numbers_status: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['point', 'verdict', 'one_line', 'what_is_right', 'what_is_wrong_or_overstated', 'where_the_design_is_weak', 'strongest_counter_to_critique', 'strongest_counter_to_design', 'recommended_action', 'cited_numbers_status', 'confidence'],
}

const RESEARCH = [
  {
    key: 'R-astgrep',
    prompt: `Research brief: ast-grep facts for a design decision. Load WebSearch and WebFetch first (ToolSearch "select:WebSearch,WebFetch"). Check, by fetching the actual pages (ast-grep.github.io docs, the npm pages for @ast-grep/cli and @ast-grep/napi, the GitHub repo ast-grep/ast-grep releases): (1) Is ast-grep distributed on npm as a pinned package with prebuilt Windows x64 binaries (optionalDependencies per platform)? Name the packages and the current version and release date. (2) Does @ast-grep/napi give a Node API (so a zero-shell-out use is possible), and does it ship Windows prebuilt .node binaries? (3) Which languages are BUILT IN: specifically Python, JavaScript, TypeScript, TSX (JSX), JSON, YAML, SQL, Bash, HTML, CSS. For any NOT built in (expected: SQL), what does adding a custom language take (a compiled tree-sitter dynamic library, how on Windows)? (4) Semantics: does a pattern like \`compare_digest($$$)\` match text inside comments or string literals? Explain with the docs' own wording (patterns match AST nodes; a comment is a comment node; a string is a string node). (5) Does ast-grep have any telemetry, metrics or crash reporting (expected: none; contrast Semgrep's metrics)? (6) tree-sitter behaviour on syntax errors (error recovery: ERROR/MISSING nodes) and what that means for a probe on a half-broken file. (7) Maintenance: last release date, release cadence, maintainer, licence. Return the schema; mark every claim fetched vs snippet-only.`,
  },
  {
    key: 'R-facebook',
    prompt: `Research brief: verify a quoted number. Load WebSearch and WebFetch first (ToolSearch "select:WebSearch,WebFetch"). The critique says: "When Facebook selected every test that indirectly depended on a change, it picked around 10,000 tests, and 99.9% of them passed." Find the primary source (Machalica, Samylkin, Porth, Chandra, "Predictive Test Selection", ICSE-SEIP 2019, arXiv 1810.05286; also the Facebook Engineering blog post) and quote exactly what it says about (a) how many tests a transitive-dependency-based selection picks per change, (b) what share of selected tests pass or fail, (c) any statement about dependency-graph "hub" nodes / fan-out. Say whether the critique's two numbers (~10,000; 99.9%) are in the source, approximately right, or not there. Also check whether a ONE-HOP (direct callers only) selection is discussed anywhere in that literature (test selection / change impact analysis) as a bound against over-selection. Return the schema; mark fetched vs snippet-only.`,
  },
  {
    key: 'R-duplicates',
    prompt: `Research brief: verify quoted numbers. Load WebSearch and WebFetch first (ToolSearch "select:WebSearch,WebFetch"). The critique says: "19–23% of duplicate bug reports are worded differently, and keyword search finds 10–18 points fewer of them." Find the primary source(s) for BOTH numbers (candidate literature: duplicate bug report detection — Runeson et al. 2007, Wang et al. 2008, Sun et al. 2010/2011 REP/BM25F, Deshmukh et al. 2017, Zhang et al. TOSEM 2023 "Duplicate Bug Report Detection: How Far Are We?", Alipour 2013, Lazar 2014, Nguyen 2012 DBTM; also "semantic vs lexical duplicate" studies and any 2023–2026 LLM-embedding duplicate-detection papers). State exactly what each source measured. Then summarise what Zhang et al. (TOSEM 2023) concluded about traditional IR (BM25-style REP) versus deep-learning duplicate detectors on realistic data. Verdict per number: supported / partly / unsupported / contradicted. Return the schema; mark fetched vs snippet-only.`,
  },
  {
    key: 'R-ir',
    prompt: `Research brief: what the retrieval literature establishes at tiny scale. Load WebSearch and WebFetch first (ToolSearch "select:WebSearch,WebFetch"). The design says (§4.4): "BM25 is the robust baseline at this scale and dense retrieval fails on exactly the entity-like tokens defect text is made of (BEIR; Sciavolino; LIMIT at 46 documents)". The critique says: "'Keyword search beats embeddings at this scale' isn't established either; it depends on the kind of query." Fetch and state precisely: (1) BEIR (Thakur et al. 2021): what it shows about BM25 vs dense models out of domain; (2) Sciavolino et al. 2021 "Simple Entity-Centric Questions Challenge Dense Retrievers": the finding and its scope; (3) Weller et al. 2025 "On the Theoretical Limitations of Embedding-Based Retrieval" (LIMIT): the 46-document result and what BM25 did; (4) any 2024–2026 evidence on lexical vs dense retrieval specifically for error messages, stack traces, logs or code identifiers (e.g. code search benchmarks, log retrieval, CoIR, or "BM25 strong baseline" results), and evidence that dense helps for short natural-language symptom descriptions with vocabulary mismatch. Then answer: is the design's sentence a fair reading (conditioned on entity-like tokens) or an overclaim; and is the critique's "depends on the kind of query" a refutation or a restatement? Return the schema; mark fetched vs snippet-only.`,
  },
]

phase('Research')
const researchP = parallel(RESEARCH.map(r => () =>
  agent(COMMON + '\n' + r.prompt, { label: r.key, phase: 'Research', model: 'sonnet', schema: RESEARCH_SCHEMA }).catch(() => null)
))

phase('Missed')
const missedP = agent(COMMON + `
TASK (completeness critic): The owner's critique names four areas: (0) the hand-written lexer / span anchoring vs a real parser; (1) the footprint missing callers / staleness the design cannot see; (2) silent and do-not-apply entries needing a code trigger rather than a wording match; (3) the embedding trigger and miss visibility. Read the design's sections for those areas (§3.3, §3.4, §3.5, §4.1, §4.4, §4.5, §5.1, §5.2, §5.5, §7.2, §7.3, §9, §11 D5/D16, §12.5 KS-C6/C8/C11/C14, §12.6 K14) and the raw refuter verdicts for KS-C14, KS-C11, KS-C8 and the critic in ${S}\\evidence\\refute\\. Then answer: what did the critique MISS in those same four areas that is a real slip in the design, i.e. an internal contradiction, an unimplementable rule, or a safety hole the refuters did not already close? Candidates to test (verify each against the text; reject the ones that do not hold): the "strings stripped" rule versus probes whose root-cause VALUE is a string literal (ex2a's duplicate revision id in alembic migrations is \`revision = "0045"\`, a string; ex7's empty env value is a JSON string): does §3.4's kind set (json_predicate, duplicate_values) sidestep this, or is there a contradiction? Whether symbol_span hashing by a hand lexer gives under-invalidation (the dangerous direction) on JSX files. Whether the first-commit lookup uses the plan's Scope paths rather than the diff. Whether v_missed_existing can populate. Whether D5's default (hand lexer) contradicts the design's own "install nothing before the pilot that the pilot does not need" when the lexer is itself a build cost. Anything else you find. Return a JSON object: { missed: [ { area: string, finding: string, doc_ref: string, severity: 'blocker'|'should_fix'|'minor', confidence: 'high'|'medium'|'low' } ], rejected_candidates: [ { candidate: string, why_it_does_not_hold: string } ] }.
`, { label: 'missed-by-critique', phase: 'Missed', model: 'opus', effort: 'xhigh', schema: {
  type: 'object',
  properties: {
    missed: { type: 'array', items: { type: 'object', properties: { area: { type: 'string' }, finding: { type: 'string' }, doc_ref: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'should_fix', 'minor'] }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] } }, required: ['area', 'finding', 'doc_ref', 'severity', 'confidence'] } },
    rejected_candidates: { type: 'array', items: { type: 'object', properties: { candidate: { type: 'string' }, why_it_does_not_hold: { type: 'string' } }, required: ['candidate', 'why_it_does_not_hold'] } },
  },
  required: ['missed', 'rejected_candidates'],
} }).catch(() => null)

phase('Verify')
const results = await pipeline(
  POINTS,
  p => parallel([
    () => agent(COMMON + `
TASK (lens: DOC FIDELITY). Critique point under check: ${p.title}
${p.focus}
Your job on this lens: establish exactly what the design says on every claim the critique makes about it, with section and line citations, and classify each claim as accurate / partly accurate / inaccurate. Then give your merit verdict, but weight it toward whether the critique's PREMISES hold. Fill the schema.`, { label: `${p.key}:fidelity`, phase: 'Verify', model: 'opus', effort: 'xhigh', schema: LENS_SCHEMA }).catch(() => null),
    () => agent(COMMON + `
TASK (lens: ENGINEERING MERIT). Critique point under check: ${p.title}
${p.focus}
Your job on this lens: assume the critique's reading of the doc is roughly right and judge the ENGINEERING: is the proposed change better than the design's choice for THIS repository, THIS owner (one developer, Windows box, no installs without a decision, pull-only ruling, the ship program's Opus budget), and this store's actual scale (tens to low hundreds of entries)? Check the repository code where the question turns on it (grep; give file:line). Consider cost, failure modes, and what the refuters already found. Fill the schema.`, { label: `${p.key}:merit`, phase: 'Verify', model: 'opus', effort: 'xhigh', schema: LENS_SCHEMA }).catch(() => null),
  ]),
  async (lenses, p) => {
    const research = (await researchP).filter(Boolean)
    const [fid, mer] = lenses
    return agent(COMMON + `
TASK (SYNTHESIS, skeptical). Critique point: ${p.title}
Two independent Opus lenses have reported. Lens DOC-FIDELITY:
${JSON.stringify(fid, null, 1)}
Lens ENGINEERING-MERIT:
${JSON.stringify(mer, null, 1)}
Research results (Sonnet, web-checked; treat snippet-only items as weaker):
${JSON.stringify(research, null, 1)}
Your job: do NOT average the two lenses. Re-read the design passages the lenses cite (${p.focus.slice(0, 400)}...) and check the lenses' quotations yourself; where the lenses disagree, decide and say why; where both agree, try to refute them. Produce the final verdict for this point for the owner, in plain words: what the critique got right, what it got wrong or overstated, where the design is genuinely weak even if the critique's framing was off, the strongest counter-argument to the critique, the strongest counter-argument to the design, and one recommended action (concrete: which doc section changes, which owner decision changes default, or nothing). State the status of any numbers the critique cited. Fill the schema.`, { label: `${p.key}:synthesis`, phase: 'Synthesize', model: 'opus', effort: 'xhigh', schema: SYNTH_SCHEMA }).catch(() => null)
  }
)

const research = (await researchP).filter(Boolean)
const missed = await missedP
log(`synthesis done for ${results.filter(Boolean).length}/4 points; research ${research.length}/4; missed=${missed ? missed.missed.length : 'null'}`)
return { verdicts: results, research, missed }