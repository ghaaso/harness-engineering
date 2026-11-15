export const meta = {
  name: 'three-project-deck-lean',
  description: 'Lean, usage-limit-aware run of the three-project deck: remaining evidence lanes, builds, deck spec and audit, checkpointed to disk',
  whenToUse: 'Run python tools/state.py first and pass its JSON as args.state, so finished steps are skipped; re-launch after each usage-limit reset',
  phases: [
    { title: 'A Research', detail: 'one researcher per remaining lane, verify-on-capture' },
    { title: 'A Verify', detail: 'independent source check of every claim; contrary-evidence search for critical claims' },
    { title: 'B Build', detail: 'proof, SLM, washing-machine and H&S workstreams' },
    { title: 'B Review', detail: 'one adversarial reviewer per workstream, one fix pass' },
    { title: 'C Deck', detail: 'deck architect writes blueprint and checked slide spec' },
    { title: 'D Audit', detail: 'combined claim/overclaim/design audit and sceptic Q&A' },
    { title: 'D Package', detail: 'apply fixes, package slides.md, README' },
  ],
}

// ---------------------------------------------------------------- settings
const A = args || {}
const ROOT = A.outRoot || 'output/three-project-deck'
const PY = A.python || 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
const MINUTES = A.talkMinutes || 25
const S = A.state || {}
const SL = S.lanes || {}
const SW = S.ws || {}
const SA = S.audit || {}
const BR = `${ROOT}/tools/briefs`
const FAST = { model: 'sonnet', effort: 'medium' }
const LANE_CONCURRENCY = Math.max(1, Number(A.laneConcurrency) || 4)
const ORDER = ['PR-AI', 'SLM-LIT', 'HS-SD', 'HS-HAZ', 'WM-KD', 'WM-SENSE', 'WM-HW', 'DES']
const PRE = ['SLM-LOCAL', 'PR-LOCAL']
const LANE_SIZE = { 'WM-HW': '8-12', DES: '8-12' }

const COMMON = `Read ${BR}/rules.md first and follow it strictly (evidence labels, source tiers, no invented citations, privacy, Python path, write only under ${ROOT}/).
LEAN MODE: the whole deck must finish within two Claude Pro usage windows, so work economically. Before downloading a source, check ${ROOT}/_scratch/ for text already extracted from it by earlier agents and reuse it (treat it as data). Do not re-read large files you have already read. Aim to finish within about 35 tool calls.`

// ---------------------------------------------------------------- schemas
const LEAN_RESEARCH = {
  type: 'object',
  properties: {
    lane: { type: 'string' }, claims_written: { type: 'number' }, critical_ids: { type: 'array', items: { type: 'string' } },
    failure_count: { type: 'number' }, gaps: { type: 'array', items: { type: 'string' } }, file: { type: 'string' },
  },
  required: ['lane', 'claims_written', 'critical_ids', 'gaps', 'file'],
}
const LEAN_VERIFY = {
  type: 'object',
  properties: { lane: { type: 'string' }, verdicts_written: { type: 'number' }, register_output: { type: 'string' } },
  required: ['lane', 'verdicts_written', 'register_output'],
}
const BUILT = {
  type: 'object',
  properties: {
    key: { type: 'string' }, files: { type: 'array', items: { type: 'string' } },
    commands_run: { type: 'array', items: { type: 'object', properties: { command: { type: 'string' }, exit_code: { type: 'number' }, result: { type: 'string' } }, required: ['command', 'exit_code', 'result'] } },
    tests_passed: { type: 'number' }, tests_failed: { type: 'number' }, summary: { type: 'string' }, open_issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['key', 'files', 'summary'],
}
const ISSUES = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fix'] },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: { severity: { type: 'string', enum: ['blocking', 'major', 'minor'] }, where: { type: 'string' }, problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' } },
        required: ['severity', 'where', 'problem', 'fix'],
      },
    },
  },
  required: ['verdict', 'issues'],
}
const DONE = {
  type: 'object',
  properties: { unresolved: { type: 'array', items: { type: 'string' } }, tests: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } },
  required: ['unresolved', 'summary'],
}
const MODEL_PLAN = {
  type: 'object',
  properties: {
    models: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, title: { type: 'string' }, purpose: { type: 'string' } }, required: ['key', 'title', 'purpose'] } },
    representation_files: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' },
  },
  required: ['models', 'representation_files', 'notes'],
}
const DECK = {
  type: 'object',
  properties: {
    main_slides: { type: 'number' }, backup_slides: { type: 'number' }, minutes: { type: 'number' },
    check_errors: { type: 'number' }, ask: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' },
  },
  required: ['main_slides', 'minutes', 'check_errors', 'files'],
}
const AUDIT = {
  type: 'object',
  properties: {
    issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['blocking', 'major', 'minor'] }, slide: { type: 'string' }, lens: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'slide', 'problem', 'fix'] } },
    notes: { type: 'string' },
  },
  required: ['issues', 'notes'],
}
const QA = {
  type: 'object',
  properties: { questions: { type: 'number' }, unanswerable: { type: 'array', items: { type: 'string' } }, file: { type: 'string' } },
  required: ['questions', 'unanswerable', 'file'],
}

// ---------------------------------------------------------------- halting wrapper
// A null result usually means the usage limit was hit. After that no new agent starts; run tools/state.py and re-launch.
let halted = null
async function run(prompt, opts) {
  if (halted) return null
  const r = await agent(prompt, opts)
  if (!r && !halted) {
    halted = opts.label
    log(`${opts.label} returned nothing (usually the usage limit). No new agents will start. Re-launch with args.state from tools/state.py after the reset.`)
  }
  return r
}

// ---------------------------------------------------------------- stage A (lean)
function researchPrompt(key) {
  return `${COMMON}

You are the researcher for Stage A evidence lane ${key}. Your brief (questions, local material, candidate leads, extra instructions) is ${BR}/lane-${key}.md.
Lean-mode overrides of that brief: target ${LANE_SIZE[key] || '10-16'} claims instead of 18-30; at least a third must be failures, limits, negative results or counter-evidence; mark at most 5 claims critical (only claims a headline or a defence would rest on).
Verify-on-capture: open the primary source of every claim yourself and record its locator and a verbatim quote of at most 15 words. Drop any claim whose source you could not open. Prefer peer-reviewed sources and give the venue as confirmed on the publisher/proceedings page.
Write ${ROOT}/A-research/${key}/claims.raw.json: a JSON array; each element has id ("${key}-01", "${key}-02", ...), statement, kind (result|failure|limit|method|cost|context|counter-evidence|local-observation), label (DOCUMENTED|OBSERVED|INFERRED|PROPOSED|UNKNOWN), critical (boolean), numbers (exact figures with units and conditions, or ""), sources (array of {title, authors, year, venue, tier, url, locator, quote}).
Write ${ROOT}/A-research/${key}/lane.json: {"key": "${key}", "title": <lane title>, "purpose": <one sentence>, "gaps": [unanswered questions], "searches": [searches you ran]}.
Load claims.raw.json with the Python interpreter to check that it parses. Return the summary fields.`
}

function verifyPrompt(key) {
  return `${COMMON}

You are the independent verifier for evidence lane ${key}. Do not trust the researcher. Read ${ROOT}/A-research/${key}/claims.raw.json.
1. For EVERY claim, open the cited source yourself (URL, DOI or proceedings page; Read local paths; re-run local scripts for computed numbers). A _scratch text extract of the same document is acceptable for wording and numbers, but confirm the venue on the publisher/proceedings page or DOI, not on arXiv. Verdict: supported | partial (give corrected_statement) | unsupported | source-not-found | misattributed | venue-wrong (give corrected_venue). Be strict: when in doubt, do not mark supported.
2. For each critical claim that passes step 1, run 1-2 searches for newer, larger or peer-reviewed work that contradicts, qualifies or supersedes it, or shows it is cherry-picked. Record contrary = {searched, refutes (true if, as stated, it would mislead an informed reviewer), reason, sources (only sources you opened)}.
Write ${ROOT}/A-research/${key}/verdicts.json: a JSON array of {id, verdict, corrected_statement, corrected_venue, checked (exactly what you opened and the locator), note, contrary (critical claims only)}.
Then run: ${PY} -B ${ROOT}/tools/register_lane.py ${ROOT} ${key}
Return its printed output in register_output.`
}

async function lane(key) {
  const st = SL[key] || 'none'
  if (st === 'registered') return { lane: key, skipped: 'registered' }
  if (st !== 'raw') {
    const r = await run(researchPrompt(key), { label: `research:${key}`, phase: 'A Research', schema: LEAN_RESEARCH, ...FAST })
    if (!r) return null
    log(`${key}: ${r.claims_written} claims written, ${(r.critical_ids || []).length} critical`)
  }
  const v = await run(verifyPrompt(key), { label: `verify:${key}`, phase: 'A Verify', schema: LEAN_VERIFY, ...FAST })
  if (!v) return null
  log(`${key} registered: ${v.register_output}`)
  return v
}

const laneP = {}
const settle = {}
PRE.concat(ORDER).forEach(k => { laneP[k] = new Promise(res => { settle[k] = res }) })

async function lanePool() {
  PRE.forEach(k => {
    if (SL[k] !== 'registered') log(`${k} is not registered; lean mode cannot redo it, so workstreams that need it will be skipped`)
    settle[k](SL[k] === 'registered' ? { lane: k, skipped: 'registered' } : null)
  })
  const out = {}
  let next = 0
  async function worker() {
    while (next < ORDER.length) {
      const k = ORDER[next++]
      let r = null
      if (!halted) {
        try { r = await lane(k) } catch (e) { log(`${k}: lane threw ${e && e.message}`) }
      }
      out[k] = r ? (r.skipped ? 'registered earlier' : 'registered') : 'not registered'
      settle[k](r)
    }
  }
  await parallel(Array.from({ length: LANE_CONCURRENCY }, () => () => worker()))
  return out
}

// ---------------------------------------------------------------- stage B (lean)
const WS = [
  { key: 'PROOF', folder: `${ROOT}/B-build/proof`, deps: ['PR-AI', 'PR-LOCAL'] },
  { key: 'SLM-PLAN', folder: `${ROOT}/B-build/slm`, deps: ['SLM-LIT', 'SLM-LOCAL', 'PR-LOCAL'] },
  { key: 'WM-FEAS', folder: `${ROOT}/B-build/wm`, deps: ['WM-KD', 'WM-SENSE', 'WM-HW'] },
]

function reviewPrompt(key, folder, brief, lenses) {
  return `${COMMON}

You are the single adversarial reviewer of workstream ${key}. Its goal and build instructions are in ${brief}. Apply EVERY lens in ${lenses}.
Inspect the files under ${folder} and the evidence they cite under ${ROOT}/A-research/ (claims.json status: confirmed/qualified usable, contested only with a caveat, rejected/unchecked never). Re-run every script and test the builder reports (see BUILD-REPORT.json files under ${folder}) and compare the actual output with what the documents claim. Do not trust the builder's summary.
Severity: blocking (wrong, unsupported or misleading; must be fixed before it reaches a slide), major (materially weakens credibility), minor (polish). Verdict pass only if nothing is blocking or major.
Write your result to ${folder}/REVIEW.json (the same JSON you return). Do not edit any other workstream file.`
}

function finishPrompt(key, folder, brief, extra) {
  return `${COMMON}

You maintain workstream ${key} (goal and instructions: ${brief}). Read ${folder}/REVIEW.json.
Fix every blocking and major issue in the files under ${folder}; if the reviewer is wrong, record why with evidence in ${folder}/REVIEW-RESPONSES.md (never skip silently). Then re-run all scripts and tests and record the actual results. Do not weaken tests or delete inconvenient evidence.${extra || ''}
Finally write ${folder}/DONE.json with {unresolved: [issues still open, with severity], tests: <actual test results>, files, summary} and return the same JSON.`
}

async function depsReady(key, deps) {
  const got = await Promise.all(deps.map(k => laneP[k]))
  if (got.some(x => !x)) {
    log(`${key}: not started (a lane it needs is not registered)`)
    return false
  }
  return !halted
}

async function workstream(w) {
  if (!(await depsReady(w.key, w.deps))) return { key: w.key, state: 'waiting' }
  const st = SW[w.key] || 'none'
  if (st === 'final') return { key: w.key, state: 'final (earlier)' }
  const brief = `${BR}/build-${w.key}.md`
  if (st === 'none') {
    const b = await run(`${COMMON}

Build workstream ${w.key} into ${w.folder}/ following ${brief} in full (it repeats the shared rules). Lean mode: keep each document tight (under about 1,500 words), and draw every chart from data that exists.
When finished, write ${w.folder}/BUILD-REPORT.json containing the JSON you return.`, { label: `build:${w.key}`, phase: 'B Build', schema: BUILT, ...FAST })
    if (!b) return { key: w.key, state: 'build failed' }
  }
  let serious = null
  if (st !== 'reviewed') {
    const rev = await run(reviewPrompt(w.key, w.folder, brief, `${BR}/lenses-${w.key}.md`), { label: `review:${w.key}`, phase: 'B Review', schema: ISSUES, ...FAST })
    if (!rev) return { key: w.key, state: 'built' }
    serious = (rev.issues || []).filter(x => x.severity !== 'minor').length
    log(`${w.key}: review ${rev.verdict}, ${serious} blocking/major`)
    if (!serious) return { key: w.key, state: 'final', review: 'pass' }
  }
  const done = await run(finishPrompt(w.key, w.folder, brief), { label: `finish:${w.key}`, phase: 'B Review', schema: DONE, ...FAST })
  return done ? { key: w.key, state: 'final', unresolved: done.unresolved } : { key: w.key, state: 'reviewed' }
}

async function hsWorkstream() {
  if (!(await depsReady('HS', ['HS-SD', 'HS-HAZ']))) return { key: 'HS', state: 'waiting' }
  const st = SW.HS || 'none'
  if (st === 'final') return { key: 'HS', state: 'final (earlier)' }
  const hs = `${ROOT}/B-build/hs`
  let models = Object.keys(S.hsModels || {}).map(k => ({ key: k, ...S.hsModels[k] }))
  if (st === 'none') {
    const plan = await run(`${COMMON}

Follow ${BR}/hs-architect.md. Lean-mode overrides: plan exactly 2 executable models, the two that best support the deck (safety capability eroding under production pressure; the H&S-app policy variant that changes reporting, response and learning), with kebab-case keys; draw bow-ties only for the two highest-risk hazards. Write the representation set and ${hs}/model-plan.json as instructed, then return the model list.`, { label: 'build:HS-architect', phase: 'B Build', schema: MODEL_PLAN, ...FAST })
    if (!plan) return { key: 'HS', state: 'architect failed' }
    models = (plan.models || []).slice(0, 2).map(m => ({ key: String(m.key).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''), title: m.title, purpose: m.purpose, state: 'none' }))
  }
  if (st === 'none' || st === 'planned') {
    const built = await parallel(models.filter(m => m.state !== 'built').map(m => () => run(`${COMMON}

Follow ${BR}/hs-model-build.md with <MODEL_KEY> = ${m.key}, <MODEL_TITLE> = ${m.title}, <MODEL_PURPOSE> = ${m.purpose}, <FOLDER> = ${hs}/models/${m.key}. The model's specification is in ${hs}/model-plan.json.
When finished, write ${hs}/models/${m.key}/BUILD-REPORT.json containing the JSON you return.`, { label: `build:HS-${m.key}`, phase: 'B Build', schema: BUILT })))
    built.filter(Boolean).forEach(b => log(`HS model ${b.key}: tests passed ${b.tests_passed}, failed ${b.tests_failed}`))
    if (halted) return { key: 'HS', state: 'partly built' }
    const rev = await run(reviewPrompt('HS', hs, `${BR}/hs-architect.md and ${BR}/hs-model-build.md`, `${BR}/lenses-HS.md`) +
      `\nFor the numerics lens: copy one model to ${ROOT}/_scratch/, break a parameter or equation there and confirm its tests catch it.`, { label: 'review:HS', phase: 'B Review', schema: ISSUES, ...FAST })
    if (!rev) return { key: 'HS', state: 'built' }
    log(`HS: review ${rev.verdict}, ${(rev.issues || []).filter(x => x.severity !== 'minor').length} blocking/major`)
  }
  const done = await run(finishPrompt('HS', hs, `${BR}/hs-architect.md and ${BR}/hs-model-build.md`, `
Then write ${hs}/HS-SUMMARY.md: the representation set (files and what each shows); each model's purpose and key result with numbers read from its outputs and chart paths; a validation table across models (test, result, numbers); what "validated" means here and its limits (reference modes from the literature, no calibration to this factory); what factory data would allow calibration; review status including unresolved issues; and the 5-8 visuals best suited to slides.`), { label: 'finish:HS', phase: 'B Review', schema: DONE, ...FAST })
  return done ? { key: 'HS', state: 'final', unresolved: done.unresolved } : { key: 'HS', state: 'reviewed' }
}

// ---------------------------------------------------------------- stage C and D (lean)
const SLIDE_SCHEMA = `Each slide is {id, headline, body, visual {kind: chart|diagram|table|image|none, file, description}, evidence, caveat, speaker_notes, seconds, backup, structural}:
- headline: one full-sentence assertion of at most 15 words;
- body: at most 30 words, or empty when the visual carries the message;
- visual.file: an existing path under ${ROOT}/B-build/ (or empty with a precise description of the data source and encoding; never invent data);
- evidence: claim IDs from ${ROOT}/A-research/*/claims.json (status confirmed or qualified; contested only with a caveat; never rejected or unchecked) or existing artifact paths under ${ROOT}/;
- caveat: required when evidence is contested, and whenever a qualified claim's corrected wording limits the statement;
- speaker_notes: plain language, 80-160 words;
- backup: true for backup slides; structural: true only for title/agenda/section-divider slides (they need no evidence).
Number main slides s01, s02, ... and backup slides b01, b02, ... after the close.`

async function deck() {
  if (S.deck === 'spec') return { state: 'spec (earlier)' }
  const d = await run(`${COMMON}

You are the deck architect for a ${MINUTES}-minute presentation to one person who is both client/investor and employer/manager and decides whether to keep backing this work. All three projects must appear: (1) camera-free one-button washing-machine panel with on-device model (KD onto ESP32-class chips; TPU/NPU only if cost-effective); (2) factory H&S app for a home-appliance factory in Pakistan: representations and executable SD models built from published research and validated, plus the evidence-backed case for why no software prototype exists yet; (3) SLM for evolving-documentation context, building on the local hooks research.
Read: ${BR}/deck-design.md (combine the four narrative angles: answer-first opening with the decision requested, risk retirement per project, failures shown as findings, evidence instead of a demo; satisfy all three personas); ${ROOT}/A-research/DES/evidence.md (apply its confirmed findings); ${ROOT}/B-build/hs/HS-SUMMARY.md; ${ROOT}/B-build/wm/ (feasibility.md, wont-work.md, open-risks.md); ${ROOT}/B-build/proof/no-prototype-case.md; ${ROOT}/B-build/slm/ (progress.md, experiment-design.md, literature-table.md, failure-modes.md); each workstream's DONE.json or REVIEW.json for unresolved issues; and any evidence.md under ${ROOT}/A-research/ you need. If a workstream's files are missing, say so on the relevant slide rather than filling the gap.
Boundaries: H&S models are built from published research and tested against literature reference modes, not calibrated to this factory; the usage-allowance argument is only as strong as the plan-tier proof (Pro, read from the app's usage card on 2026-10-20) and does not prove a prototype was impossible; "no hallucinations" becomes measurable grounding and abstention targets; every washing-machine figure is cited or labelled PROPOSED.
Write ${ROOT}/C-design/deck-blueprint.md (sections with minutes, the narrative logic, and the explicit decision asked at the end), then ${ROOT}/C-design/deck-spec.json (one JSON array of all slides) and a readable ${ROOT}/C-design/deck-spec.md.
${SLIDE_SCHEMA}
Main slides about one per minute (${MINUTES} plus or minus 4), main time ${MINUTES} minutes plus or minus 10%, plus 6-12 backup slides for likely questions.
Run ${PY} -B ${ROOT}/tools/check_deck.py ${ROOT} ${MINUTES} and fix the spec until it reports no errors (it writes C-design/CHECK.json). Return the counts.`, { label: 'deck', phase: 'C Deck', schema: DECK })
  return d
}

async function audit() {
  if (SA.final) return { state: 'final (earlier)' }
  const d = `${ROOT}/D-final`
  const [aud, qa] = await parallel([
    () => (SA.audit ? Promise.resolve({ issues: null, notes: 'earlier' }) : run(`${COMMON}

You are the deck auditor. Apply EVERY lens in ${BR}/audit.md (claim-trace, overclaim, design; the sceptic-qa lens is handled by another agent, skip it) to ${ROOT}/C-design/deck-spec.json and deck-spec.md. Open each claims.json you check and each artifact a number comes from. Return issues with severity blocking (false, unsupported or misleading), major (weakens credibility or comprehension) or minor (polish), each with the slide id, the lens and a concrete fix.
Write the same JSON to ${d}/AUDIT.json. Do not edit the deck.`, { label: 'audit:deck', phase: 'D Audit', schema: AUDIT })),
    () => (SA.qa ? Promise.resolve({ questions: 0, unanswerable: [], file: 'earlier' }) : run(`${COMMON}

Role-play the audience (a client/investor who is also the presenter's employer) and their sceptical technical advisor. Read ${ROOT}/C-design/deck-spec.json and the evidence it cites. Write the 25 hardest questions they would ask into ${d}/qa-prep.md, each with an evidence-backed answer citing claim IDs or artifacts and the slide or backup slide that supports it. Return the count and the questions the deck cannot yet answer with evidence (and any slide that invites a question it cannot survive).`, { label: 'audit:qa', phase: 'D Audit', schema: QA, ...FAST })),
  ])
  if (halted) return { state: 'audit incomplete' }
  const serious = aud && aud.issues ? aud.issues.filter(x => x.severity !== 'minor').length : 'see AUDIT.json'
  log(`Deck audit: ${serious} blocking/major issues; ${qa && qa.unanswerable ? qa.unanswerable.length : '?'} questions the deck cannot yet answer`)
  const fin = await run(`${COMMON}

Finalise the deck. Read ${d}/AUDIT.json and the unanswerable questions in ${d}/qa-prep.md.
1. Apply fixes to ${ROOT}/C-design/deck-spec.json (keep deck-spec.md in sync) for every blocking and major audit issue, and add backup slides where a hard question lacks one. Never fix a claim problem by inventing evidence: remove, qualify or re-source the statement from the claims files. If an auditor is wrong, say why with evidence. Log every change and every rejected issue in ${d}/audit-log.md.
2. Re-run ${PY} -B ${ROOT}/tools/check_deck.py ${ROOT} ${MINUTES} until it reports no errors.
3. Write ${d}/slides.md: every slide in order with id, headline, body, visual (file path or precise description), evidence footnote (short citation: author, venue, year, or artifact path), caveat, speaker notes and seconds; backup slides after a "Backup" divider. Update ${d}/qa-prep.md so slide references match the final ids.
4. Write ${ROOT}/README.md indexing every output: A-research lanes (with status tallies from claims.json), B-build workstreams (with validation and review status from DONE.json/REVIEW.json), C-design and D-final; state that this was a lean run (single verifier per lane with a contrary-evidence search for critical claims; one reviewer and one fix pass per workstream; one audit round) and list every unresolved issue.
Write ${d}/DONE.json with {unresolved, tests, files, summary} and return it.`, { label: 'package', phase: 'D Package', schema: DONE })
  return fin ? { state: 'final', unresolved: fin.unresolved } : { state: 'audited' }
}

// ---------------------------------------------------------------- run
phase('A Research')
const [lanes, ws] = await parallel([
  () => lanePool(),
  () => parallel([...WS.map(w => () => workstream(w)), () => hsWorkstream()]),
])
const out = { lanes, workstreams: ws }
const allFinal = (ws || []).every(x => x && String(x.state).startsWith('final'))
const desOk = SL.DES === 'registered' || (lanes && lanes.DES && lanes.DES !== 'not registered')
if (!halted && allFinal && desOk) {
  out.deck = await deck()
  if (!halted && out.deck) out.audit = await audit()
} else if (!halted) {
  log('Deck stage not started: not every workstream is final or DES is not registered')
}
out.halted = halted
return out
