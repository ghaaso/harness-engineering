'use strict';
// The graphify arm's configurations (protocol addendum 7 item 9): at most 10, built only from
// graphify 0.9.108's shipped commands and options. Written 2026-11-13 from the installed source
// (cli.py handlers for query / affected / explain, serve.py _query_graph_text / _bfs / _dfs /
// _subgraph_to_text, affected.py) BEFORE any configuration was run on a tuning task. No score and no
// reference answer was seen by the author.
//
// Placeholders in `user` (what a user would type):
//   <path>  the seed file, repo-relative, exactly as in the task seed
//   <name>  the seed definition's name as in the task seed (omitted when the seed has none)
//   <def>   graphify's own node id of the seed definition, read from graph.json by file and line
//           (graphify's documented "precise ID returned by the graph"; see ADAPTER.md section 3)
//   <text>  "<name> <path>" (or "<path>" alone when the seed has no definition)
//
// A config is a list of graphify calls; the adapter reads each call's printed result in graphify's
// own order and concatenates them in the listed order. Call keys (CALLS) are shared, so one graphify
// call serves every configuration that lists it.
//
// The shared factors (addendum 7 item 7): file granularity, signature form, no padding, every
// configuration packed at 2,000, 4,000, 8,000 and 16,000 tokens by the shared packer.
const SHARED = { granularity: 'file', form: 'signature', pad: 'none' };
const FULL = 100000; // "raise the token budget to N to get all" (graphify's own truncation notice)

// One graphify call. target: 'def' (the seed definition's node id), 'file' (the seed path), or a
// query mode ('text' = keyword query, 'seed' = query --seed <def> --seed <path>).
const CALLS = {
  'affected:def:d2': { cmd: 'affected', target: 'def', depth: null },
  'affected:file:d2': { cmd: 'affected', target: 'file', depth: null },
  'affected:def:d4': { cmd: 'affected', target: 'def', depth: 4 },
  'affected:file:d4': { cmd: 'affected', target: 'file', depth: 4 },
  'query:text': { cmd: 'query', mode: 'text', budget: null, depth: null, dfs: false },
  'query:text:full': { cmd: 'query', mode: 'text', budget: FULL, depth: null, dfs: false },
  'query:text:full:d3': { cmd: 'query', mode: 'text', budget: FULL, depth: 3, dfs: false },
  'query:seed': { cmd: 'query', mode: 'seed', budget: null, depth: null, dfs: false },
  'query:seed:full:d3': { cmd: 'query', mode: 'seed', budget: FULL, depth: 3, dfs: false },
  'query:seed:dfs:full:d3': { cmd: 'query', mode: 'seed', budget: FULL, depth: 3, dfs: true },
  'query:seedfile:full:d3': { cmd: 'query', mode: 'seedfile', budget: FULL, depth: 3, dfs: false },
  'query:seed:full:d6': { cmd: 'query', mode: 'seed', budget: FULL, depth: 6, dfs: false },
  'community:def+file': { cmd: 'community' },
  'explain:def:all': { cmd: 'explain', target: 'def', all: true },
  'explain:file:all': { cmd: 'explain', target: 'file', all: true },
};

const CONFIGS = [
  { name: 'affected',
    user: 'graphify affected "<def>"; graphify affected "<path>"',
    why: 'Blast radius, the command graphify ships for "what is affected if this changes"; defaults (depth 2, the 15 default relations). Run on the definition and on its file, as the shared seed is a file plus a definition; the definition\'s hits first.',
    calls: ['affected:def:d2', 'affected:file:d2'] },
  { name: 'affected-d4',
    user: 'graphify affected "<def>" --depth 4; graphify affected "<path>" --depth 4',
    why: 'The same, deeper (--depth 4).',
    calls: ['affected:def:d4', 'affected:file:d4'] },
  { name: 'query-text',
    user: 'graphify query "<text>"',
    why: 'The query the always-on instruction tells an agent to run first, as typed, at the defaults (budget 2,000, depth 2, BFS). Also the native form (addendum 7 item 15).',
    calls: ['query:text'] },
  { name: 'query-text-full',
    user: 'graphify query "<text>" --budget 100000',
    why: 'The same with the budget raised until nothing is cut, as the truncation notice tells the user to do.',
    calls: ['query:text:full'] },
  { name: 'query-text-full-d3',
    user: 'graphify query "<text>" --budget 100000 --depth 3',
    why: 'Larger budget and one more hop.',
    calls: ['query:text:full:d3'] },
  { name: 'query-seed',
    user: 'graphify query "<text>" --seed "<def>" --seed "<path>"',
    why: 'query started from the seed nodes themselves (--seed, a shipped option for exactly this: start from a known node), defaults otherwise.',
    calls: ['query:seed'] },
  { name: 'query-seed-full-d3',
    user: 'graphify query "<text>" --seed "<def>" --seed "<path>" --budget 100000 --depth 3',
    why: 'Seeded query, nothing cut, one more hop.',
    calls: ['query:seed:full:d3'] },
  { name: 'query-seed-dfs-full-d3',
    user: 'graphify query "<text>" --seed "<def>" --seed "<path>" --dfs --budget 100000 --depth 3',
    why: 'The same with depth-first traversal (--dfs).',
    calls: ['query:seed:dfs:full:d3'] },
  { name: 'explain-all',
    user: 'graphify explain "<def>" --all; graphify explain "<path>" --all',
    why: 'The node and all its connections (--all; the default shows the 20 most connected, in the same order). The definition first, then its file.',
    calls: ['explain:def:all', 'explain:file:all'] },
  { name: 'affected+query-seed-full-d3',
    user: 'graphify affected "<def>"; graphify affected "<path>"; graphify query "<text>" --seed "<def>" --seed "<path>" --budget 100000 --depth 3',
    why: 'Union in a stated order: the blast radius first (dependents), then the seeded neighbourhood.',
    calls: ['affected:def:d2', 'affected:file:d2', 'query:seed:full:d3'] },
  { name: 'AUDIT-community', user: 'MCP get_community(community of the seed definition); get_community(community of the seed file), token_budget unbounded', why: 'auditor variant', calls: ['community:def+file'] },
  { name: 'AUDIT-query-seedfile-full-d3', user: 'graphify query "<text>" --seed "<path>" --budget 100000 --depth 3', why: 'auditor variant', calls: ['query:seedfile:full:d3'] },
  { name: 'AUDIT-query-seed-full-d6', user: 'graphify query "<text>" --seed "<def>" --seed "<path>" --budget 100000 --depth 6', why: 'auditor variant', calls: ['query:seed:full:d6'] },
];

// The full configuration object that is hashed (shared config.js normalise / configHash): the shared
// factors plus this arm's own field, as for every non-graph arm (SPEC.md section 9).
function configObject(c) {
  return { ...SHARED, graphify: { version: '0.9.108', calls: c.calls.map((k) => ({ key: k, ...CALLS[k] })) } };
}

module.exports = { SHARED, FULL, CALLS, CONFIGS, configObject };
