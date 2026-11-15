// Removes the workflow script's dependence on args.mappings: the consolidation agent reads idea text from the lane files instead.
const fs = require('fs');
const p = process.argv[2];
let s = fs.readFileSync(p, 'utf8');
const a = s.indexOf('const mappings = args.mappings');
const b = s.indexOf('const promoted = []');
if (a < 0 || b < 0) throw new Error('markers not found');
const mid = [
  "const refVerdicts = ref.filter(Boolean).flatMap((r) => r.verdicts)",
  "const lines = []",
  "for (const v of refVerdicts) {",
  "  if (v.verdict === 'downgraded-to-fixflow-only' || !(v.corrected_fit === 'direct' || v.corrected_fit === 'supporting' || v.corrected_fit === 'conflicts')) continue",
  "  lines.push(`- ${v.id} [refuter: ${v.verdict}] ${v.corrected_fit} -> ${v.corrected_bottlenecks.join(',')} | cost ${v.corrected_cost}${v.needs_owner_decision ? ' | OWNER' : ''} | fit: ${v.what_survives}${v.reopened_part === 'accept' ? ' | reopened part accepted' : ''}`)",
  "}",
  "for (const v of (excl ? excl.verdicts : [])) {",
  "  if (v.verdict !== 'should-map') continue",
  "  lines.push(`- ${v.id} [added by the exclusion check] ${v.fit} -> ${v.bottlenecks.join(',')} | cost ${v.added_cost}${v.needs_owner_decision ? ' | OWNER' : ''} | fit: ${v.how}`)",
  "}",
  "",
].join(String.fromCharCode(10));
s = s.slice(0, a) + mid + s.slice(b);
const anchor = 'SURVIVING IDEAS THAT FIT A BOTTLENECK (after the refuters):';
if (s.indexOf(anchor) < 0) throw new Error('anchor not found');
s = s.replace(anchor, "The idea text for every surviving id (the narrowed version, under the heading with its id, on the line 'idea as mapped') is in ${IN2}/ref-1.md, ${IN2}/ref-2.md and ${IN2}/excl.md: read those three files before you group anything. Lanes that failed in the first pass: ${failed.length ? failed.join(', ') : 'none'}; for an id whose refuter lane failed, use the mapper's own fit from the lane file and mark it unverified." + String.fromCharCode(10, 10) + anchor);
fs.writeFileSync(p, s);
console.log('patched; args.mappings references left:', (s.match(/args\.mappings/g) || []).length);
