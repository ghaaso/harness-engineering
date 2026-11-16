// one-off editor for engine-test.js.txt (revision 4); not kept as evidence
const fs = require('fs');
const FILE = process.argv[2];
let s = fs.readFileSync(FILE, 'utf8');
function rep(a, b, all) {
  if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 100));
  s = all ? s.split(a).join(b) : s.replace(a, b);
}
rep("// Tests for the pathway engine, map revision 3 (model-brief.md sections 12 and 13).",
  "// Tests for the pathway engine, map revision 4 (model-brief.md sections 12, 13 and 14).");
rep("const E2 = require(path.join(here, 'engine-v2.js.txt'));",
  "const E2 = require(path.join(here, 'engine-v2.js.txt'));\n" +
  "// The revision-3 map, table, limitations and engine, frozen before revision 4, for the regression checks.\n" +
  "const map3 = JSON.parse(fs.readFileSync(path.join(here, 'map-v3.json'), 'utf8'));\n" +
  "const t3 = JSON.parse(fs.readFileSync(path.join(here, 'params-v3.json'), 'utf8'));\n" +
  "const lims3 = JSON.parse(fs.readFileSync(path.join(here, 'limitations-v3.json'), 'utf8'));\n" +
  "const E3 = require(path.join(here, 'engine-v3.js.txt'));");
rep("// The placeholder table predates revision 3. In memory only, it gets the new row (retire_bad,\n// a placeholder range) and the side and good end of every row, copied from params.json.",
  "// The placeholder table predates revisions 3 and 4. In memory only, it gets the new rows (retire_bad,\n// a placeholder range; the three R21 unknowns copied from params.json, with p_promote pinned at 0, so the\n// placeholder checks run with promoted checks off) and the side, good end and group of every row.");
rep("table.parameters.retire_bad = { best: 0.1, low: 0, high: 0.5, tag: 'G', source: 'placeholder, added in memory by engine-test.js.txt' };",
  "table.parameters.retire_bad = { best: 0.1, low: 0, high: 0.5, tag: 'G', source: 'placeholder, added in memory by engine-test.js.txt' };\n" +
  "['k_promo_exact', 'k_promo_similar'].forEach(id => { table.parameters[id] = { best: realRows[id].best, low: realRows[id].low, high: realRows[id].high, tag: 'G', source: 'copied in memory from params.json' }; });\n" +
  "table.parameters.p_promote = { best: 0, low: 0, high: 0, tag: 'G', source: 'pinned at 0 in memory by engine-test.js.txt' };");
rep("  if (realRows[id].good_end) table.parameters[id].good_end = realRows[id].good_end;",
  "  if (realRows[id].good_end) table.parameters[id].good_end = realRows[id].good_end;\n  if (realRows[id].lib_group) table.parameters[id].lib_group = realRows[id].lib_group;");
rep("const LIB_IDS = map.parameters.map(p => p.id).filter(id => realRows[id].side === 'library');",
  "const LIB_IDS = map.parameters.map(p => p.id).filter(id => realRows[id].side === 'library');\n" +
  "const R21_IDS = ['p_promote', 'k_promo_exact', 'k_promo_similar'];\n" +
  "const GROUPS = map.lib_groups.map(g => g.id);\n" +
  "// the real table with p_promote pinned at 0 (promoted checks off)\n" +
  "const pinned = JSON.parse(JSON.stringify(real));\n" +
  "pinned.parameters.forEach(r => { if (r.id === 'p_promote') { r.low = 0; r.best = 0; r.high = 0; } });\n" +
  "const pinnedBest = E.paramsFromTable(pinned, 'best');\n" +
  "// one level per group, all from one random stream\n" +
  "function levelsFrom(random) { const o = {}; GROUPS.forEach(g => { o[g] = random(); }); return o; }\n" +
  "// the value at the good or the poor end of a library-side row\n" +
  "const goodEnd = r => r.good_end === 'high' ? r.high : r.low;\n" +
  "const poorEnd = r => r.good_end === 'high' ? r.low : r.high;");
rep("  assert(map.version === 3, 'map version');", "  assert(map.version === 4, 'map version');");
rep("  map.parameters.filter(p => p.id !== 'retire_bad').forEach(p => {", "  map.parameters.filter(p => p.id !== 'retire_bad' && !R21_IDS.includes(p.id)).forEach(p => {");
rep("  assert(Object.keys(raw.parameters).length === map.parameters.length - 1, 'placeholder rows');", "  assert(Object.keys(raw.parameters).length === map.parameters.length - 1 - R21_IDS.length, 'placeholder rows');");
// tied draws now take one level per group: a single number still places every group at that level
rep("{ tie, level: shared() }", "{ tie, levels: levelsFrom(shared) }");
rep("{ tie: i % 2 ? 1 : 0, level: random() }", "{ tie: i % 2 ? 1 : 0, levels: random() }");
rep("{ tie: i % 2, level: 0.9 }", "{ tie: i % 2, levels: 0.9 }");
rep("{ tie: 0, level: 0.37 }", "{ tie: 0, levels: 0.37 }");
rep("{ tie: 0.5, level: 0.5 }", "{ tie: 0.5, levels: 0.5 }");
rep("{ tie: 1, level: random() }", "{ tie: 1, levels: random() }");
// revision 3 off: promoted checks off too (the revision-2 map has no such pathway)
rep("    const q = Object.assign({}, p, NO_BAD);\n    const c = E.timePath(map, q), d = E.timePath(mapV2, q);",
  "    const q = Object.assign({}, p, NO_BAD, { p_promote: 0 });\n    const c = E.timePath(map, q), d = E.timePath(mapV2, q);");
rep("    const p = E.drawParams(map, i < 6 ? table : real, random);\n    const a = E.timePath(mapV2, p), b = E2.timePath(mapV2, p);",
  "    const p = E.drawParams(map, i < 6 ? table : pinned, random);\n    const a = E.timePath(mapV2, p), b = E2.timePath(mapV2, p);");
// R10: other-side unknowns stay at best in every reference setting
rep("  near(E.referenceParams(map, real, 'favourable').m_opus, 2, 15, 'other-side unknowns stay at best in the reference settings');",
  "  map.reference_settings.forEach(r => near(E.referenceParams(map, real, r.id).m_opus, 2, 15, 'other-side unknowns stay at best in ' + r.id));");
// R12: retire_bad is the last unknown of the main stream
rep("  assert(pm && pm.kind === 'chance' && map.parameters[map.parameters.length - 1].id === 'retire_bad', 'retire_bad should be the last unknown');",
  "  const mainStream = map.parameters.filter(p => p.draw_stream !== 'added');\n  assert(pm && pm.kind === 'chance' && mainStream[mainStream.length - 1].id === 'retire_bad', 'retire_bad should be the last unknown of the main stream');");
// R13: the R21 unknowns are library side, good end high
rep("    'e_right', 'fix_on_found', 'retire_bad', 'w_write', 'q_exact', 'q_similar', 'u_exact', 'u_similar', 'u_composite', 'a_right'];",
  "    'e_right', 'fix_on_found', 'retire_bad', 'w_write', 'q_exact', 'q_similar', 'u_exact', 'u_similar', 'u_composite', 'a_right'].concat(R21_IDS);");
// the trigger at zero: promoted checks need no lookup, so the library equals the ladder only with them off
rep("test('both trigger rates at zero: library matches cheap_ladder in outcomes, every period; the funnel stops at the held stage', () => {\n  const random = E.rng(7);\n  const sets = [withP({ t_visible: 0, t_latent: 0 })];\n  for (let i = 0; i < 20; i++) sets.push(Object.assign(E.drawParams(map, table, random), { t_visible: 0, t_latent: 0 }));",
  "test('both trigger rates at zero (promoted checks off, since they need no lookup): library matches cheap_ladder in outcomes, every period; the funnel stops at the held stage', () => {\n  const random = E.rng(7);\n  const sets = [withP({ t_visible: 0, t_latent: 0, p_promote: 0 })];\n  for (let i = 0; i < 20; i++) sets.push(Object.assign(E.drawParams(map, i % 2 ? table : real, random), { t_visible: 0, t_latent: 0, p_promote: 0 }));");
// constraints: no declared setting breaks a constraint
rep("  ['unfavourable', 'favourable'].forEach(w => assert(E.prepareParams(map, E.referenceParams(map, real, w)).adjusted.length === 0, w + ' was scaled'));",
  "  map.reference_settings.forEach(r => assert(E.prepareParams(map, E.referenceParams(map, real, r.id)).adjusted.length === 0, r.id + ' was scaled'));");
rep("  assert(real.version === 3, 'table version');", "  assert(real.version === 4, 'table version');");
rep("  ['c_carry', 'rho_retry', 'w_write', 'r_exact', 'h_harm', 'm_opus', 'retire_bad'].concat(NEW_IDS).forEach(",
  "  ['c_carry', 'rho_retry', 'w_write', 'r_exact', 'h_harm', 'm_opus', 'retire_bad'].concat(NEW_IDS, R21_IDS).forEach(");
fs.writeFileSync(FILE, s);
console.log('edited');
