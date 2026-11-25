// Writes harness-parts.json (File 1 of BRIEF.md). Pipelines, steps and counts are read from the owner's content.mjs;
// the parts are listed here by hand. Run: node docs/program/monitor/build/round3/gen-parts.mjs   (from the repository root)
import { writeFileSync } from 'node:fs';
import { PATH, LANES } from '../../../pipeline-diagram/build/content.mjs';

const ALL = {};
for (const p of PATH) ALL[p.id] = { ...p, cards: p.cards };
for (const [id, l] of Object.entries(LANES)) ALL[id] = { id, ...l };
const POS = { B2: [1, 2], B4: [1, 3], A3: [1, 4], A2: [1, 5], A1: [1, 6], B1: [1, 7], S1: [2, 2], S2: [2, 3], S3: [2, 4], S4: [2, 5], S5: [2, 6], S6: [2, 7],
  C: [3, 2], D: [3, 3], E: [3, 4], F: [3, 5], G: [3, 7], B5: [2, 1, 'upper'], B3: [2, 1, 'lower'] };
const ORDER = ['B2', 'B4', 'A3', 'A2', 'A1', 'B1', 'B5', 'B3', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'C', 'D', 'E', 'F', 'G'];

const pipelines = ORDER.map(id => { const p = ALL[id]; const [row, col, half] = POS[id];
  return { id, code: p.code || id, title: id.startsWith('S') ? p.title[0] + p.title.slice(1).toLowerCase() : p.title.split(' ').map((w, i) => i ? w.toLowerCase() : w[0] + w.slice(1).toLowerCase()).join(' ').replace('graph model', 'Graph model').replace('Measurement and research', 'Measurement and research'),
    line: p.purpose, row, col, half: half || null,
    steps: p.cards.map(c => { const n = { b: 0, d: 0, i: 0 }; if (c.items) for (const [, s] of c.items) n[s === 'n' ? 'b' : s]++; else n[c.s === 'n' ? 'b' : c.s]++;
      return { t: c.t, built: n.b, designed: n.d, idea: n.i, tested: c.items ? c.items.filter(x => x[1] === 'n').length : (c.s === 'n' ? 1 : 0) }; }) }; });
// the owner's titles as drawn on his map
const TITLE = { S1: 'Plan', S2: 'Admit', S3: 'Work', S4: 'Check', S5: 'Land', S6: 'Learn', A1: 'Code map', A2: 'Graph model training', A3: 'Code queries', B1: 'Problem records', B2: 'Problem lookup', B3: 'Library', B4: 'Reasoning cache', B5: 'Standing notes', C: 'Guards', D: 'Limits', E: 'Context', F: 'Recovery', G: 'Measurement and research' };
for (const p of pipelines) p.title = TITLE[p.id];

const links = [['S1', 'S2'], ['S2', 'S3'], ['S3', 'S4'], ['S4', 'S5'], ['S5', 'S6'], ['B5', 'S1'], ['B3', 'S1'], ['B2', 'S1', 'memory lookup'], ['B4', 'S2', 'model choice'], ['A3', 'S3', 'query results'],
  ['A1', 'A2'], ['A2', 'A3'], ['A1', 'A3', 'graph'], ['B1', 'B2', 'knowledge store'], ['S5', 'A1', 'changed code re-extracted'], ['S6', 'B1', 'solved problems'], ['C', 'S1', 'blocks rule violations'],
  ['D', 'S2', 'concurrency limit'], ['E', 'S3', 'context size'], ['F', 'S3', 'restarts stalled work'], ['S6', 'G', 'transcripts, timings, verdicts'],
  ['G', 'B3', 'measurements and research return as library records and revised rules', true]].map(([from, to, label, dashed]) => ({ from, to, label: label || '', dashed: !!dashed }));

const parts = [];
// P(id, name, kind, 'PIPE.step', owner text (an item's start, or a card title), path (display), match, note)
const P = (id, name, kind, where, owner, path, match, note) => parts.push({ id, name, kind, where, owner, path, match, note });
const H = '(^|/)\\.claude/hooks/';

// ---- hooks (source: content.mjs C cards; the hook files; .claude/settings.json) ----
P('hook:library-start', 'Start hook', 'hook', 'C.0', 'Start hook: loads the board', '.claude/hooks/library-start.mjs', { paths: [H + 'library-start\\.mjs$'], hook: 'library-start' }, 'Loads the board at session start and after a compaction; the board is injected, so Read calls under-count the board.');
P('hook:tier-hook', 'Tier hook', 'hook', 'C.1', 'Tier hook: refuses the wrong model', '.claude/hooks/tier-hook.mjs', { paths: [H + 'tier-hook\\.mjs$'], hook: 'tier-hook' }, 'Checks the model against the kind of job at every helper start.');
P('hook:plan-gate', 'Plan gate', 'hook', 'C.1', 'Plan gate: refuses a start', '.claude/hooks/plan-gate.mjs', { paths: [H + 'plan-gate\\.mjs$'], hook: 'plan-gate' }, 'Holds the build root to the plan file; only the build root has a plan.');
P('hook:record-guard', 'Record guard', 'hook', 'C.2', 'Record guard: no edits to evidence', '.claude/hooks/record-guard.mjs', { paths: [H + 'record-guard\\.mjs$'], hook: 'record-guard' }, 'Refuses edits of evidence and journal lines and design questions to the owner.');
P('hook:window-ceiling', 'Window ceiling', 'hook', 'E.2', 'Fill gauge: a script reads the fill', '.claude/hooks/window-ceiling.mjs', { paths: [H + 'window-ceiling\\.mjs$'], hook: 'window-ceiling' }, 'Reads the window fill at every call and refuses past the ceiling. The owner lists the ceiling as designed.');
P('hook:count-gate', 'Count gate', 'hook', 'D.1', 'Concurrency', '.claude/hooks/count-gate.mjs', { paths: [H + 'count-gate\\.mjs$'], hook: 'count-gate' }, 'Refuses a helper start past the width in force. Built; the owner lists concurrency as designed.');
P('hook:fanout-gate', 'Fan-out gate', 'hook', 'E.3', 'Tree caps', '.claude/hooks/fanout-gate.mjs', { paths: [H + 'fanout-gate\\.mjs$'], hook: 'fanout-gate' }, 'Refuses a helper start with no stated token limit and its measured basis. Built; the owner lists tree caps as designed.');
P('hook:owner-report', 'Owner report', 'hook', 'S3.3', 'Report', '.claude/hooks/owner-report.mjs', { paths: [H + 'owner-report\\.mjs$'], hook: 'owner-report' }, 'Checks that what reaches the owner (closing box, pages) is plain and short.');
P('hook:journal-watch', 'Journal watch', 'hook', 'B3.1', 'Journal', '.claude/hooks/journal-watch.mjs', { paths: [H + 'journal-watch\\.mjs$'], hook: 'journal-watch' }, 'After a shell call, checks the journal files are in the state the journal tool left them.');
P('script:check-commit', 'Commit check', 'script', 'C.4', 'Commit check: also catches writes', 'tools/check-commit.mjs', { paths: ['(^|/)tools/(check-commit\\.mjs|git-hooks/)'], commands: ['(^|[\\s;&|(])git(\\s+-[cC]\\s+\\S+)*\\s+commit(\\s|$)'] }, 'Runs through tools/git-hooks/pre-commit on every git commit in this clone. A shell call running git commit (with or without -c options before it) counts as a read; reading or naming the file counts too. Not seen: a commit made by another program.');
P('script:journal', 'Journal tool', 'script', 'B3.1', 'Correction', 'tools/journal.mjs', { paths: ['(^|/)tools/journal(-rules)?\\.mjs$'] }, 'The only writer of journal records; a write shows as a shell call that names it.');
P('setting:permissions', 'Settings', 'setting', 'C.6', 'Least privilege', '.claude/settings.json', { paths: ['(^|/)\\.claude/settings(\\.local)?\\.json$'] }, 'Switches skills off and denies the archived agents; also wires the hooks.');
P('script:hook-tests', 'Hook tests', 'script', 'C.6', 'Self-test and canary', '.claude/hooks/*.test.mjs', { paths: [H + '(selftest|[a-z-]+\\.test)\\.mjs$'] }, 'Tests and a self-test of the hooks.');
P('doc:hooks-readme', 'Hooks readme', 'document', 'C.6', 'Foundations', '.claude/hooks/README.md', { paths: [H + 'README\\.md$'] }, 'Says which hooks exist and how helper definitions relate to the tier hook.');
P('store:hook-logs', 'Hook logs', 'store', 'C.5', 'After the run', '.claude/logs/*.jsonl', { paths: ['(^|/)\\.claude/logs/'] }, 'One log per hook; the monitor reads them. A part for the owner\'s "transcript audit" only in the sense that it holds what the hooks saw.');

// ---- scripts and tools of the library and research tree ----
P('script:lookup', 'Look-up script', 'script', 'B3.3', 'Lookup', 'library/lookup.sh', { paths: ['(^|/)library/lookup\\.sh$'] }, 'Looks a record up by id or keyword; a shell call that names it.');
P('script:lane', 'The lane', 'script', 'C.3', 'The lane: a queue', 'research-tree/tools/lane.mjs', { paths: ['(^|/)research-tree/tools/lane\\.mjs$'] }, 'Queues heavy commands; seen only when a session names it.');
P('script:tcb-guard', 'Role guard', 'script', 'C.6', 'Least privilege', 'research-tree/tcb/guard-hook.mjs', { paths: ['(^|/)research-tree/tcb/(guard-hook|scripts/guard-hook)\\.mjs$'] }, 'Per-role tool and folder limits of the research tree (built, never run on a real tree).');
P('doc:tcb-roles', 'Role settings', 'document', 'C.6', 'Least privilege', 'research-tree/tcb/{settings,agents,briefs}/', { paths: ['(^|/)research-tree/tcb/(settings|agents|briefs|profiles)/'] }, 'The tool and folder limits and briefs of each role of the research tree.');
P('script:tcb-checker', 'Trusted checker', 'script', 'C.6', 'Trusted checker', 'research-tree/tcb/{certify,promote,witness,compare}.mjs', { paths: ['(^|/)research-tree/tcb/(certify|promote|witness|compare|check-queue)\\.mjs$'] }, 'The small script that promotes a claim to a fact.');
P('script:tcb-selftest', 'Tree self-test', 'script', 'C.6', 'Self-test and canary', 'research-tree/tcb/{selftest,audit}.mjs', { paths: ['(^|/)research-tree/tcb/(selftest|audit|fsck)\\.mjs$', '(^|/)research-tree/tcb/test/'] }, 'Planted violations must be caught; the tests of the research tree scripts.');
P('script:tcb-admit', 'Ready queue', 'script', 'S2.0', 'Ready queue', 'research-tree/tcb/{admit,gate}.mjs', { paths: ['(^|/)research-tree/tcb/(admit|gate|status|seed)\\.mjs$'] }, 'Admits units whose dependencies are done.');
P('script:tcb-watch', 'Watcher', 'script', 'F.1', 'Watcher: reads, decides, exits', 'research-tree/tcb/{watch,stop}.mjs', { paths: ['(^|/)research-tree/tcb/(watch|stop|replace)\\.mjs$'] }, 'Stall, hang and loop watch; built and tested, never run on a real tree.');
P('script:tcb-commit', 'Commit record', 'script', 'F.0', 'Commit record', 'research-tree/tcb/{commit,snap}.mjs', { paths: ['(^|/)research-tree/tcb/(commit|snap|lib|render)\\.mjs$'] }, 'Writes the commit record of a unit; the first record wins.');
P('script:tcb-handover', 'Hand-over script', 'script', 'S6.3', 'Hand over through files', 'research-tree/tcb/{handover,harvest}.mjs', { paths: ['(^|/)research-tree/tcb/(handover|harvest|tms|cost|protocol-freeze)\\.mjs$'] }, 'Hands work over through files; also the cost and timing scripts.');
P('script:tokens', 'Token tally', 'script', 'G.0', 'Token tally', 'research-tree/build/check/tokens.mjs', { paths: ['(^|/)research-tree/build/(check/tokens[^/]*|tools/tokens-self\\.mjs)$', 'evidence/harness-bottlenecks/tally'] }, 'Counts the tokens of every transcript, per session and unit.');
P('script:recorder', 'Machine recorder', 'script', 'G.0', 'Machine recorder', 'research-tree/tools/recorder.ps1', { paths: ['(^|/)research-tree/tools/(recorder|av-watch)\\.ps1$'] }, 'Records memory, processor and the test queue.');

// ---- documents a session is meant to use ----
P('doc:claude-md', 'CLAUDE.md', 'document', 'B5.0', 'Instruction file', 'CLAUDE.md', { paths: ['(^|/)CLAUDE\\.md$'] }, 'Loaded by the app at start, so Read calls under-count it.');
P('doc:board', 'Board', 'document', 'B3.2', 'Board', 'library/INDEX.md', { paths: ['(^|/)library/INDEX\\.md$'] }, 'Injected at start by the start hook, so Read calls under-count it.');
P('doc:library-docs', 'Library rules', 'document', 'B3.0', 'Record', 'library/{README,GLOSSARY}.md', { paths: ['(^|/)library/(README|GLOSSARY)\\.md$'] }, 'The rules of a record and the glossary.');
P('doc:recall-tests', 'Recall tests', 'document', 'B3.3', 'Recall test', 'library/tests/', { paths: ['(^|/)library/tests/'] }, 'The tests that a new session can answer from the library alone.');
P('doc:orchestration', 'Orchestration', 'document', 'S3.0', 'Root session', 'research-tree/ORCHESTRATION.md', { paths: ['(^|/)research-tree/ORCHESTRATION\\.md$'] }, 'How a planned multi-session build is run.');
P('doc:protocol', 'Tree protocol', 'document', 'S3.0', 'Worker session', 'docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md', { paths: ['(^|/)docs/program/RESEARCH-(TREE-PROTOCOL|DIRECTION)[^/]*\\.md$'] }, 'The design of the session tree and the research programme.');
P('doc:plan', 'Plan', 'document', 'S1.3', 'Plan file: role, model', 'research-tree/build/plan.json', { paths: ['(^|/)research-tree/build/plan\\.json$'] }, 'Read by the plan gate; the gate is the usual reader, a session need not open it.');
P('doc:tier-routes', 'Tier routes', 'document', 'S2.2', 'Haiku: locate', '.claude/hooks/tier-routes.json', { paths: [H + 'tier-routes\\.json$'] }, 'Which model for which kind of job; read by the tier hook.');
P('doc:briefs', 'Briefs', 'document', 'S3.1', 'Brief: one page', 'research-tree/build/briefs/*.md', { paths: ['(^|/)research-tree/(build/([A-Za-z0-9-]+/)?briefs|tcb/briefs)/', 'research-runs/[^/]+/briefs/', '(^|/)docs/program/monitor/build/round[0-9]+/BRIEF\\.md$'] }, 'One page per unit or helper: scope, file pointers, done condition.');
P('doc:state', 'State files', 'document', 'B5.1', 'Notes file', 'research-tree/build/{STATE,TOP-STATE,ROOT-START}.md', { paths: ['(^|/)research-tree/build/(STATE|TOP[0-9]*-STATE|ROOT-START|TOP[0-9]*-REPORT|NEXT-STEP|TRACK-[A-Z]+)\\.md$', 'research-runs/[^/]+/run/(STATE|TOP|WAVE)[^/]*\\.md$'] }, 'Written before a hand-over and read back after it.');
P('doc:start-here', 'Start here', 'document', 'S6.3', 'Hand over through files', 'research-tree/START-HERE.md', { paths: ['(^|/)research-tree/START-HERE\\.md$'] }, 'Where the research tree stands, for a fresh session.');
P('doc:enforcement-table', 'Enforcement table', 'document', 'C.6', 'Trusted checker', 'research-tree/build/ENFORCEMENT-TABLE.md', { paths: ['(^|/)research-tree/build/ENFORCEMENT-TABLE\\.md$'] }, 'Every rule with what enforces it and what it cannot see.');
P('doc:design-record', 'Design records', 'document', 'G.3', 'Identify the classical problem', 'research-tree/{RULINGS,DESIGN-RECORD,FAULTS-AND-FIXES,...}.md', { paths: ['(^|/)research-tree/(RULINGS|DESIGN-RECORD|FAULTS-AND-FIXES|ATTACK-AND-COST-RECORD|BUILD-PLAN|BUILD-SIZE|CONTRACT|SELECTIONS-MAP|FIX-VS-SELECTIONS)\\.md$'] }, 'The research tree\'s designs, rulings and fault analyses.');
P('doc:build-docs', 'Build documents', 'document', 'G.3', 'Model check', 'research-tree/build/{COMPLEXITY,FAULTS,LOCKS,ROUTER,UNATTENDED,PILOT-PLAN}.md', { paths: ['(^|/)research-tree/build/(COMPLEXITY|FAULTS|LOCKS|ROUTER|UNATTENDED|PILOT-PLAN|WIDEN|WIDTHS|branches|TRACK-PLAN|TRACK-DIGEST)(-v1)?\\.md$'] }, 'Design documents of the build rounds.');
P('doc:measurements', 'Measurements', 'document', 'E.0', 'Re-reads are 96.8', 'docs/program/{HARNESS-BOTTLENECKS,TOKEN-BOTTLENECK,...}.md', { paths: ['(^|/)docs/program/(HARNESS-BOTTLENECKS|TOKEN-BOTTLENECK|GRAPH-TEST-RESULT|GRAPH-V2-DESIGN|HARNESS-V2-DESIGN)[^/]*\\.md$'] }, 'Where tokens go, and what the graph test found.');

// ---- stores ----
P('store:journal', 'Journal', 'store', 'B3.1', 'Journal', 'library/journal/<date>/*.jsonl', { paths: ['(^|/)library/journal/'] }, 'Append-only records; written only through the journal tool.');
P('store:evidence', 'Evidence', 'store', 'G.0', 'Seven measures', 'docs/program/evidence/, recovered/', { paths: ['(^|/)docs/program/evidence/', '(^|/)recovered/'] }, 'Kept as it is; a session may read it, never edit it.');
P('store:run-folders', 'Run folders', 'store', 'G.1', 'Questions fixed before', 'C:/research-runs/<run>/', { paths: ['research-runs/[^/]+/(?!briefs/)'] }, 'A research run lives in its own folder outside every repository.');
P('store:memory', 'Memory folder', 'store', 'B5.1', 'Memory index', '~/.claude/projects/<folder>/memory/', { paths: ['(^|/)\\.claude/projects/[^/]+/memory/'] }, 'Loaded at start by the app, so Read calls under-count it.');
P('store:usage-log', 'Usage log', 'store', 'S6.0', 'Tokens per unit', 'research-tree/build/usage.jsonl', { paths: ['(^|/)research-tree/build/usage\\.jsonl$'] }, 'Tokens per unit, the basis of the next plan.');
P('store:task-table', 'Task table', 'store', 'F.0', 'Task table', 'research-tree/{done,build/landings}/', { paths: ['(^|/)research-tree/(done/|build/landings)'] }, 'Units, attempts and states on disk. Placement inferred from the folder names, not checked against the scripts.');

// ---- agent types ----
for (const [k, step, own] of [['locate', 'S2.2', 'Haiku: locate'], ['extract', 'S2.2', 'Haiku: locate'], ['read', 'S2.2', 'Sonnet: read'], ['collect', 'S2.2', 'Sonnet: read'], ['run', 'S2.2', 'Sonnet: read'], ['build', 'S2.2', 'Sonnet: read'], ['analyse', 'S2.2', 'Opus: delicate'], ['refute', 'S2.2', 'Opus: delicate']])
  P('agent:lean-' + k, 'lean-' + k, 'agent', step, own, '.claude/agents/lean-' + k + '.md', { paths: [`(^|/)\\.claude/agents/lean-${k}\\.md$`], agents: ['lean-' + k] }, 'Helper type for the "' + k + '" kind of job; loads only the tools the kind needs. Not yet measured.');

// ---- app tools of the method ----
P('tool:get_usage', 'Usage meter', 'tool', 'S1.1', 'Check token usage', 'get_usage', { tools: ['get_usage$'] }, 'Read before any fan-out of helpers.');
P('tool:update_plan', 'Plan steps', 'tool', 'S1.2', 'Split into units', 'update_plan', { tools: ['update_plan$'] }, 'The session\'s own step list; the owner lists splitting as designed.');
P('tool:start_session', 'Start session', 'tool', 'S3.0', 'Worker session', 'start_session', { tools: ['start_session$'] }, 'Starts a child session.');
P('tool:agent', 'Start helper', 'tool', 'S3.0', 'Helpers: short-lived', 'Agent / Task', { tools: ['^(Agent|Task)$'] }, 'Starts a short-lived helper; the tier hook checks each call.');
P('tool:wrap_up', 'Closing report', 'tool', 'S3.3', 'Report', 'wrap_up', { tools: ['wrap_up$'] }, 'The closing report to the owner.');
P('tool:ask', 'Ask the owner', 'tool', 'C.2', 'Record guard', 'AskUserQuestion', { tools: ['^AskUserQuestion$'] }, 'Design questions to the owner are refused by the record guard.');

// ---- resolve places and owners ----
const errs = [];
for (const p of parts) {
  const [pl, st] = p.where.split('.'); p.pipeline = pl; p.step = pl + '.' + st; delete p.where;
  const card = ALL[pl] && ALL[pl].cards[+st]; if (!card) { errs.push('no step ' + p.id + ' ' + p.step); continue; }
  const item = (card.items || []).map(x => x[0]).find(t => t.startsWith(p.owner));
  if (item) p.owner = item; else if (card.t === p.owner) p.owner = 'Step "' + card.t + '"'; else errs.push('owner not found ' + p.id + ': ' + p.owner);
  for (const r of p.match.paths || []) new RegExp(r, 'i'); for (const r of p.match.tools || []) new RegExp(r); for (const r of p.match.commands || []) new RegExp(r);
}
// regex tests on real forward-slash paths
const R = 'C:/Users/User/Documents/projects/harness-engineering/';
const tests = [['hook:tier-hook', R + '.claude/hooks/tier-hook.mjs', 1], ['hook:tier-hook', R + '.claude/hooks/tier-hook.test.mjs', 0], ['doc:board', R + 'library/INDEX.md', 1], ['doc:board', 'library/INDEX-draft.md', 0],
  ['doc:briefs', R + 'research-tree/build/briefs/B0a.md', 1], ['doc:briefs', 'C:/research-runs/2026-11-harness-leads/briefs/x.md', 1], ['store:run-folders', 'C:/research-runs/2026-11-harness-leads/run/STATE.md', 1], ['store:run-folders', 'C:/research-runs/2026-11-harness-leads/briefs/x.md', 0],
  ['doc:claude-md', 'C:/research-runs/2026-11-harness-leads/CLAUDE.md', 1], ['store:memory', 'C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/memory/MEMORY.md', 1],
  ['store:journal', R + 'library/journal/2026-11-24/r57.jsonl', 1], ['script:check-commit', R + 'tools/git-hooks/pre-commit', 1], ['doc:state', R + 'research-tree/build/TOP9-STATE.md', 1], ['script:tcb-watch', R + 'research-tree/tcb/watch.mjs', 1]];
for (const [id, path, want] of tests) { const p = parts.find(x => x.id === id); const got = p.match.paths.some(r => new RegExp(r, 'i').test(path)) ? 1 : 0; if (got !== want) errs.push('regex ' + id + ' on ' + path + ' gave ' + got); }
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
for (const p of parts) { p.note = p.note.replace(/^(.{0,300}).*$/, '$1'); }
const out = { made: '2026-11-24', sources: ['docs/program/pipeline-diagram/build/content.mjs (pipelines, steps, item states)', 'docs/program/pipeline-diagram/parts/*.md (which file stands for which item)', '.claude/settings.json, .claude/hooks/*.mjs heads, .claude/agents/lean-*.md', 'directory listings of research-tree/, tools/, library/'], pipelines, links, parts };
writeFileSync(new URL('./harness-parts.json', import.meta.url), JSON.stringify(out, null, 1));
const by = (k) => parts.reduce((a, p) => (a[p[k]] = (a[p[k]] || 0) + 1, a), {});
console.log(parts.length, 'parts', JSON.stringify(by('kind')), JSON.stringify(by('pipeline')));
