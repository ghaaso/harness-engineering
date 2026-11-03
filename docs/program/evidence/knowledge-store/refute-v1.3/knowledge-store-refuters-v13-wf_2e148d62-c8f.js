export const meta = {
  name: 'knowledge-store-refuters-v13',
  description: 'Two fresh-context Opus refuters per mechanism that knowledge-store design v1.3 introduced (--diff, applies for do_not_apply, missed_existing), then one Opus completeness critic over the v1.3 text',
  phases: [
    { title: 'Refute', detail: 'two Opus refuters per claim at xhigh, default refuted', model: 'opus' },
    { title: 'Critic', detail: 'completeness critic over v1.3 for fold-in contradictions', model: 'opus' },
  ],
}

const CONTEXT = args.context
const CLAIMS = args.claims
const DESIGN_PATH = args.designPath
const EVIDENCE_PATH = args.evidencePath
const SCRATCH = args.scratch

const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    claim_id: { type: 'string' },
    lens: { type: 'string' },
    verdict: { type: 'string', enum: ['CONFIRMED', 'REFUTED', 'NARROWED', 'UNVERIFIABLE'] },
    one_line: { type: 'string', description: 'the verdict in one sentence a tired owner can read' },
    attacks: { type: 'array', description: 'one row per attack you ran, including every attack named in the brief for this claim', items: { type: 'object', additionalProperties: false, properties: {
      attack: { type: 'string' },
      result: { type: 'string', enum: ['fell', 'held', 'unverifiable'] },
      evidence: { type: 'string', description: 'file:line, a read-only command and its output, a measurement, or a primary source; never a feeling' },
      consequence: { type: 'string', description: 'what the design must change if this stands; "none" if nothing' },
    }, required: ['attack', 'result', 'evidence', 'consequence'] } },
    counter_evidence: { type: 'string', description: 'for REFUTED or NARROWED: the strongest positive evidence against the claim as stated' },
    trace: { type: 'string', description: 'for CONFIRMED: the path from evidence to the claim' },
    narrowed_claim: { type: 'string', description: 'for NARROWED: the version of the claim that survives' },
    what_would_settle_it: { type: 'string', description: 'for UNVERIFIABLE items: the concrete test, measurement or owner answer' },
    amendments: { type: 'array', description: 'the text changes you propose, each naming the section', items: { type: 'object', additionalProperties: false, properties: { section: { type: 'string' }, change: { type: 'string' }, why: { type: 'string' } }, required: ['section', 'change', 'why'] } },
    changes_a_127_ruling: { type: 'string', description: 'if your verdict changes a ruling recorded in §12.7 (a point verdict, an accepted/rejected item, or a KS-O amendment), name it and say how; else "none"' },
    could_not_run: { type: 'array', items: { type: 'string' }, description: 'measurements or checks that need the store to exist, Docker, or something else you did not have' },
    commands_run: { type: 'array', items: { type: 'string' } },
    sources: { type: 'array', items: { type: 'string' } },
  },
  required: ['claim_id', 'lens', 'verdict', 'one_line', 'attacks', 'counter_evidence', 'trace', 'narrowed_claim', 'what_would_settle_it', 'amendments', 'changes_a_127_ruling', 'could_not_run', 'commands_run', 'sources'],
}

const CRITIC_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    overall: { type: 'string' },
    contradictions: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { a: { type: 'string', description: 'the first statement, with its section and a short quote' }, b: { type: 'string', description: 'the statement it contradicts, with section and quote' }, introduced_by: { type: 'string', description: 'which KS-O amendment or v1.2 text left it; "pre-existing" if v1.2 already had it' }, resolution: { type: 'string' } }, required: ['a', 'b', 'introduced_by', 'resolution'] } },
    amendment_mismatches: { type: 'array', description: 'KS-O lines in §12.7 whose named section text does not actually say what the line claims', items: { type: 'object', additionalProperties: false, properties: { ks_o: { type: 'string' }, line_claims: { type: 'string' }, section_says: { type: 'string' }, fix: { type: 'string' } }, required: ['ks_o', 'line_claims', 'section_says', 'fix'] } },
    leftovers: { type: 'array', description: 'v1.2 wording that the fold-in should have changed and did not (dangling flags, removed mechanisms still referenced, stale phase scopes)', items: { type: 'object', additionalProperties: false, properties: { what: { type: 'string' }, where: { type: 'string' }, fix: { type: 'string' } }, required: ['what', 'where', 'fix'] } },
    owner_page: { type: 'array', items: { type: 'string' }, description: 'what §0 now says that the body does not support, or the reverse' },
  },
  required: ['overall', 'contradictions', 'amendment_mismatches', 'leftovers', 'owner_page'],
}

const LENSES = [
  { key: 'repo', text: 'from the repository and the dev box: read the code and the design, run read-only commands (git log/show/diff/grep, node -e over built-in modules, node scripts you write ONLY under your scratch folder), measure where a measurement is possible without the store existing (for example the cost of a diff-to-footprint join over a synthetic seed-sized footprint set), reproduce or fail to reproduce the mechanism the claim rests on' },
  { key: 'ops', text: 'from operations and prior art: the research register (§2 of the design and the lane files under the evidence folder; cite ids), primary documentation of git, pytest, Claude Code hooks, SQLite FTS5 and the cited papers, what breaks on a Windows dev box, a Linux VPS, git worktrees on old branches, parallel sessions, squash merges and cherry-picks, Docker down, and what the cited prior art actually says' },
]

function refutePrompt(c, lens, i) {
  return CONTEXT + `\n\nYOU ARE A FRESH-CONTEXT REFUTER (${lens.key} lens). Your job is to BREAK the claim below, ${lens.text}. Default verdict is REFUTED unless you find a traced path from evidence to the claim; but REFUTED and NARROWED require POSITIVE counter-evidence (a line that prevents the failing condition, a command output, a measurement, a primary source), never "I doubt it". Run EVERY attack listed under ATTACK AT LEAST and add your own; report each as fell / held / unverifiable with its evidence. If you can neither confirm nor refute an item, say so and state exactly what would settle it. Where the brief asks you to "say which" mechanism catches a case, answer that question explicitly in the attack row. Propose the text amendments your verdict requires, naming sections. If your verdict changes a ruling recorded in §12.7, say which.\n\nRead first: the design at ${DESIGN_PATH} (sections §3.3–§3.7, §4.1, §4.4–§4.6, §5.2, §5.5, §7.1–§7.4, §7.6, §9, §10 KS-2/KS-3/KS-5/KS-6b/KS-9, §11, §12.7; read it in parts with offset/limit, it is about 900 lines); the adjudication that produced these mechanisms at ${EVIDENCE_PATH}/critique-2026-11-03/verdicts.txt (the parts about your claim); the earlier refuter record §12.5 for the protocol and the amendments KS-F7, F8, F11, F12, F13, F16, F19 that the new mechanisms must not contradict.\n\nYour scratch folder for any script you write: ${SCRATCH}/scratch-${lens.key}-${i + 1} (create files only there; never inside the repository). Read-only on the repository: no installs, no git writes (no add/commit/stash/checkout/branch), no docker, no npm install, no edits to tracked files; commands you run must be read-only (git log/show/diff/grep/ls-files/rev-parse/merge-base/stash create is NOT allowed either since it writes objects, use git diff against HEAD instead). Do not put repository code, defect text, file contents or identifiers from this repository into any web search; search only for general prior art and documentation.\n\nCLAIM ${c.id}: ${c.claim}\n\nATTACK AT LEAST:\n${c.attacks.map((a, k) => `${k + 1}. ${a}`).join('\n')}\n\nRESTS ON: ${c.rests_on}\n\nSet claim_id to "${c.id}" and lens to "${lens.key}".`
}

phase('Refute')
const verdicts = await pipeline(CLAIMS,
  (c, _c, i) => parallel(LENSES.map(l => () => agent(refutePrompt(c, l, i), { label: 'refute:' + c.id + ':' + l.key, phase: 'Refute', schema: VERDICT_SCHEMA, model: 'opus', effort: 'xhigh' }))),
  (vs, c) => ({ claim: c, verdicts: vs.filter(Boolean) }),
)
const flat = verdicts.filter(Boolean)
const tally = {}
for (const r of flat) for (const v of r.verdicts) tally[v.verdict] = (tally[v.verdict] || 0) + 1
log('Refuter verdicts: ' + JSON.stringify(tally) + ' over ' + flat.length + ' claims')

phase('Critic')
const summary = flat.map(r => ({ id: r.claim.id, verdicts: r.verdicts.map(v => v.lens + ':' + v.verdict + ' — ' + v.one_line.slice(0, 240)) }))
const critic = await agent(CONTEXT + `\n\nYOU ARE THE COMPLETENESS CRITIC over the v1.3 text of the knowledge-store design at ${DESIGN_PATH} (read it whole with the Read tool, in parts of about 150 lines; it is about 900 lines). v1.3 folded the owner's critique of v1.2 into the text as amendments KS-O1..O20, recorded in §12.7. Your job is to find what the fold-in broke or left inconsistent, not to re-judge the design. Look at least at: §0 rule 1 against every remaining "(safe)" or "a miss is safe" wording in §3.3, §4.1 and §9; KS-3's scope in §10 after the lexer and code mutants moved to KS-6b against §3.4's remaining text and KS-3's deliverables and done-when; D5 against D5b in §11; the removal of the --touching flag against any remaining mention anywhere; the KS-5 diff arm in §10 against D8's go criteria in §11 and §0's description of the pilot; whole-file blobs before KS-6b (§3.4, §3.5) against the §3.5 tier table, the ex3 precondition and §5.1 trigger 1; the three runs of ks lookup --diff (§7.2) against §7.6's proposed plan text, §7.7's per-phase cost and §5.2's close bullet; the missed_existing write path (§7.3) against §3.6, §4.5, §4.6, §7.1 and KS-2/KS-3 scopes; target_mode proposed_change (§3.4) against §4.1 step 5, §7.1's verify row and KS-3/KS-6b scopes; §4.4's dense-only candidate against §4.1 step 4's candidate definition and KS-F11; D16, D21 and D5b against §11's intro sentence and §0's "what you are asked now"; and every KS-O line in §12.7 against the section text it names (does the section actually say that). Also check that nothing in v1.3 contradicts the earlier amendments KS-F1..F20 (§12.5) and KS-K1..K24 (§12.6). Report contradictions with both quotes and a resolution, amendment mismatches, leftovers, and anything §0 now says that the body does not support. Be concrete: section, quote, fix. Read-only; no installs; no git writes. Refuter verdicts so far, for context only: ` + JSON.stringify(summary), { label: 'critic:v1.3', phase: 'Critic', schema: CRITIC_SCHEMA, model: 'opus', effort: 'xhigh' })

return { verdicts: flat, tally, critic }