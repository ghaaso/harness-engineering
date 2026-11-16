// Glossary origins that said "compile" without saying which one, and the Maturity scale origin.
// Usage: node add-reader-fixes-3.cjs <path to reader-fixes.json>
'use strict';
const fs = require('fs');
const f = process.argv[2];
const rf = JSON.parse(fs.readFileSync(f, 'utf8'));
const glossary = {
  'g1-90': { origin: 'Coined by us in the bottleneck compile (11 November 2026).' },
  'g2-176': { origin: 'Coined by us in the bottleneck compile, section 9.3.' },
  'g2-177': { origin: 'Testbed practice; proposed as mechanism 4 in the bottleneck compile.' },
  'add-18': { origin: 'This compile’s own honesty rule: a label never claims more than its sources report.' },
  'g1-95': {
    definition: 'Our map of the 21 [M] clinic bottlenecks B01 to B21, each with a class, a first step and a proof, and of how the outside ideas fit them, in docs/program/HARNESS-BOTTLENECKS-2026-11.md. Not to be confused with this compile (this document), which joins everything.',
  },
};
let ng = 0;
rf.glossary = rf.glossary || {};
Object.entries(glossary).forEach(([k, v]) => { rf.glossary[k] = Object.assign({}, rf.glossary[k] || {}, v); ng += 1; });
fs.writeFileSync(f, JSON.stringify(rf, null, 1) + '\n');
console.log('glossary', ng, 'now', Object.keys(rf.glossary).length);
