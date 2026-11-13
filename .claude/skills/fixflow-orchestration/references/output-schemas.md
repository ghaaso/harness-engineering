<!-- Verbatim from FixFlow (PR #182 @ 3415b5e) docs/ORCHESTRATION-DESIGN-2026-10.md lines 388-524, §5.2 (project doc, no SPDX licence); copied with sed on 2026-11-04, not retyped -->

### 5.2 Output schemas (JSON Schema; object root, required ⊆ properties)

```js
const DEP = { type: 'string' }   // declared dependency name, verbatim (e.g. "Depends(get_current_principal)", "CurrentManager", "none_declared")
const ENDPOINTS = { type: 'object', additionalProperties: false, properties: {
  rows: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    method: { type: 'string' }, path: { type: 'string' }, slice: { type: 'string' },
    router_level_deps: { type: 'array', items: DEP }, decorator_deps: { type: 'array', items: DEP }, param_deps: { type: 'array', items: DEP },
    file_line: { type: 'string' } },
    required: ['method', 'path', 'slice', 'router_level_deps', 'decorator_deps', 'param_deps', 'file_line'] } } },
  required: ['rows'] }

const CONFIG = { type: 'object', additionalProperties: false, properties: {
  settings: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    name: { type: 'string' }, type: { type: 'string' }, default: { type: 'string' }, is_secret: { type: 'boolean' }, file_line: { type: 'string' } },
    required: ['name', 'type', 'default', 'is_secret', 'file_line'] } },
  hosts: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    host: { type: 'string' }, file_line: { type: 'string' } }, required: ['host', 'file_line'] } } },
  required: ['settings', 'hosts'] }

const CONSTANTS = { type: 'object', additionalProperties: false, properties: {
  rows: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    kind: { type: 'string', enum: ['storage_key', 'task_name', 'queue_cap', 'interval_ms', 'timeout_ms', 'debounce_ms', 'radius_m', 'accuracy_m', 'other'] },
    name: { type: 'string' }, value: { type: 'string' }, file_line: { type: 'string' } },
    required: ['kind', 'name', 'value', 'file_line'] } } },
  required: ['rows'] }

const MAP = { type: 'object', properties: {
  area: { type: 'string' },
  summary: { type: 'string' },                                   // <= 300 words
  facts: { type: 'array', items: { type: 'object', properties: {   // brief: at most 40
    id: { type: 'string' }, fact: { type: 'string' },
    evidence: { type: 'array', items: { type: 'string' } },      // "path:line — quote", <= 200 chars each
    source_kind: { type: 'string', enum: ['code', 'doc', 'command', 'web', 'inferred'] },
    hypotheses: { type: 'array', items: { type: 'string' } } },  // routing only, not a verdict
    required: ['id', 'fact', 'evidence', 'source_kind'] } },
  anomalies: { type: 'array', items: { type: 'string' } },        // neutral, evidenced, no severity
  questions_for_deep_dive: { type: 'array', items: { type: 'string' } },
  files_or_urls: { type: 'array', items: { type: 'string' } } },
  required: ['area', 'summary', 'facts', 'anomalies', 'questions_for_deep_dive', 'files_or_urls'] }

const RESEARCH = { type: 'object', properties: {                       // facts MAY be empty when tool_status is web_unavailable; never fabricate to fill it
  area: { type: 'string' },
  tool_status: { type: 'string', enum: ['web_ok', 'web_partial', 'web_unavailable'] },
  urls_attempted: { type: 'array', items: { type: 'string' } },
  facts: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, fact: { type: 'string' }, url: { type: 'string' },
    fetched_in_run: { type: 'boolean' }, source_kind: { type: 'string', enum: ['web', 'local_source', 'inferred'] },
    hypotheses: { type: 'array', items: { type: 'string' } } },
    required: ['id', 'fact', 'url', 'fetched_in_run', 'source_kind'] } },
  anomalies: { type: 'array', items: { type: 'string' } },
  questions_for_deep_dive: { type: 'array', items: { type: 'string' } } },
  required: ['area', 'tool_status', 'urls_attempted', 'facts', 'anomalies', 'questions_for_deep_dive'] }

const REGISTER = { type: 'object', properties: {
  items: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, source: { type: 'string' }, title: { type: 'string' },
    status: { type: 'string', enum: ['FIXED', 'PARTIAL', 'OPEN', 'UNCHANGED_SINCE_HANDOFF', 'UNCLEAR'] },
    evidence: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } },
    required: ['id', 'source', 'title', 'status', 'evidence'] } },
  apk_to_main_diff: { type: 'array', items: { type: 'string' } },
  summary: { type: 'string' } },
  required: ['items', 'apk_to_main_diff', 'summary'] }

const COMMANDS = { type: 'object', properties: {
  preflight: { type: 'object', properties: { node: { type: 'string' }, npm: { type: 'string' }, docker_server: { type: 'string' } },
    required: ['node', 'npm', 'docker_server'] },
  runs: { type: 'array', items: { type: 'object', properties: {
    gate: { type: 'string' }, cwd: { type: 'string' }, command: { type: 'string' },
    exit_code: { type: 'integer' }, duration_s: { type: 'number' }, summary: { type: 'string' }, tail: { type: 'string' } },
    required: ['gate', 'command', 'exit_code', 'summary'] } },           // exit_code -1 = not run; reason in blocked
  blocked: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } },
  required: ['preflight', 'runs', 'blocked'] }

const DUMPFACTS = { type: 'object', properties: {
  restored: { type: 'boolean' }, dump_key: { type: 'string' },
  rows: { type: 'array', items: { type: 'object', properties: {
    query: { type: 'string' }, result: { type: 'string' } }, required: ['query', 'result'] } } },
  required: ['restored', 'rows'] }

const SCAN = { type: 'object', additionalProperties: false, properties: {
  advisories: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    tool: { type: 'string' }, package: { type: 'string' }, advisory: { type: 'string' }, severity_reported: { type: 'string' }, fix_version: { type: 'string' } },
    required: ['tool', 'package', 'advisory', 'severity_reported', 'fix_version'] } },
  committed_values: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {   // NEVER the value or the line text
    file: { type: 'string' }, pattern: { type: 'string' }, line_no: { type: 'integer' },
    fingerprint: { type: 'string' },                                     // first 12 hex of sha256(matched value)
    committed_since: { type: 'string' } },
    required: ['file', 'pattern', 'line_no', 'fingerprint', 'committed_since'] } } },
  required: ['advisories', 'committed_values'] }

const FINDINGS = { type: 'object', properties: {
  area: { type: 'string' },
  hypothesis_ranking: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, verdict: { type: 'string', enum: ['supported', 'weakened', 'killed', 'untestable'] },
    likelihood_for_this_fleet: { type: 'number', minimum: 0, maximum: 1 },
    in_field_apk: { type: 'string', enum: ['yes', 'no', 'unknown'] },
    discriminating_test: { type: 'string' } },
    required: ['id', 'verdict', 'likelihood_for_this_fleet', 'in_field_apk', 'discriminating_test'] } },
  findings: { type: 'array', items: { type: 'object', properties: {     // brief: at most 6 defect/risk; script slices + logs
    id: { type: 'string' }, title: { type: 'string' },
    severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
    category: { type: 'string', enum: ['defect', 'risk', 'gap', 'design'] },
    claim: { type: 'string' }, failing_condition: { type: 'string' },
    evidence: { type: 'array', items: { type: 'string' } },
    impact: { type: 'string' }, fix_sketch: { type: 'string' },
    effort: { type: 'string', enum: ['S', 'M', 'L'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    in_field_apk: { type: 'string', enum: ['yes', 'no', 'unknown'] } },
    required: ['id', 'title', 'severity', 'category', 'claim', 'failing_condition', 'evidence', 'impact', 'fix_sketch', 'effort', 'confidence', 'in_field_apk'] } },
  backlog: { type: 'array', items: { type: 'object', properties: {              // claims seen but not written up — never silently dropped
    title: { type: 'string' }, file_line: { type: 'string' }, severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] } },
    required: ['title', 'file_line', 'severity'] } },
  challenges_settled: { type: 'array', items: { type: 'object', properties: {   // a settled fact the analyst believes is wrong, with evidence
    settled_id: { type: 'string' }, claim: { type: 'string' }, evidence: { type: 'array', items: { type: 'string' } } },
    required: ['settled_id', 'claim', 'evidence'] } },
  open_questions: { type: 'array', items: { type: 'string' } } },
  required: ['area', 'hypothesis_ranking', 'findings', 'backlog', 'challenges_settled', 'open_questions'] }

const CITATIONS = { type: 'object', properties: {
  rows: { type: 'array', items: { type: 'object', properties: {
    finding_id: { type: 'string' }, status: { type: 'string', enum: ['LOCATED', 'MOVED', 'DEAD_CITATION', 'ALREADY_FIXED'] },
    fixed_by: { type: 'string' }, note: { type: 'string' } },
    required: ['finding_id', 'status', 'fixed_by'] } } },
  required: ['rows'] }

const VERDICT = { type: 'object', properties: {
  finding_id: { type: 'string' },
  verdict: { type: 'string', enum: ['CONFIRMED', 'PARTIALLY', 'REFUTED', 'UNVERIFIABLE'] },
  already_fixed_by: { type: 'string' },                               // '' allowed
  corrected_claim: { type: 'string' },
  corrected_severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3', 'NONE'] },
  reasoning: { type: 'string' },
  what_would_settle_it: { type: 'string' },                             // required on UNVERIFIABLE; '' otherwise
  evidence: { type: 'array', items: { type: 'string' } } },
  required: ['finding_id', 'verdict', 'already_fixed_by', 'corrected_severity', 'reasoning', 'what_would_settle_it'] }
```
