'use strict';
// Edge classes: the unit that can be switched on or off (protocol section 3 "each edge class can be
// switched off", section 6 "edge classes added one at a time"). Every edge kind maps to exactly one
// class. `contains` is split by its source kind: runtime/slice/invariant_group containment is
// "membership" (it joins whole slices), the rest (doc -> section, function -> URL site) is structure.
const CLASSES = ['structure', 'membership', 'imports', 'calls', 'http', 'tests', 'data', 'config',
  'capability', 'docs', 'history', 'experimental'];
const KIND_CLASS = {
  defines: 'structure', has_column: 'structure', maps_table: 'structure', includes_router: 'structure',
  imports: 'imports', uses_constant: 'imports',
  calls: 'calls', renders: 'calls', passes_callable: 'calls', depends_injects: 'calls', inherits: 'calls',
  navigates: 'calls', registers_screen: 'calls',
  calls_url: 'http', registers_route: 'http',
  test_calls_route: 'tests', mocks: 'tests', overrides: 'tests',
  reads_table: 'data', writes_table: 'data', writes_column: 'data', foreign_key: 'data',
  migration_touches: 'data', migration_follows: 'data',
  reads_setting: 'config', enqueues_kind: 'config', kind_handled_by: 'config', registers_job: 'config', runs: 'config',
  same_capability: 'capability', contract: 'capability',
  cites: 'docs', mentions: 'docs', constrains: 'docs',
  co_changed: 'history',
  reads_response_field: 'experimental', returns_model: 'experimental', has_field: 'experimental',
};
const MEMBERSHIP_SRC = new Set(['runtime', 'slice', 'invariant_group']);
// Classes not counted in the hub (production in-degree) measure: they are containment, not use.
const STRUCTURAL = new Set(['structure', 'membership']);
// Edge kinds that are symmetric (protocol addendum 2, D.15): stored once, traversed both ways in every
// direction mode. Every other kind is directed.
const SYMMETRIC = new Set(['co_changed']);

function classOf(kind, srcKind) {
  if (kind === 'contains') return MEMBERSHIP_SRC.has(srcKind) ? 'membership' : 'structure';
  const c = KIND_CLASS[kind];
  if (!c) throw new Error('edge kind without a class: ' + kind);
  return c;
}
const classId = (name) => { const i = CLASSES.indexOf(name); if (i < 0) throw new Error('unknown class ' + name); return i; };
function maskOf(names) { let m = 0; for (const n of names) m |= (1 << classId(n)); return m; }

module.exports = { CLASSES, KIND_CLASS, STRUCTURAL, SYMMETRIC, classOf, classId, maskOf };
