// Assembles the first-pass results from the workflow journal into the shape render-review.js reads.
const fs = require('fs');
const [journal, outFile] = process.argv.slice(2);
const lines = fs.readFileSync(journal, 'utf8').split(String.fromCharCode(10)).filter(Boolean).map((l) => JSON.parse(l));
const label = new Map();
for (const o of lines) if (o.type === 'started') label.set(o.key, o.label);
const by = {};
for (const o of lines) if (o.type === 'result') by[label.get(o.key)] = o.result;
const out = {
  adj: [by['adjudicate:G1-G2'], by['adjudicate:G3-G5-BAML'], by['adjudicate:G4']],
  ref: [by['refute:G1-G2-G3-G5'], by['refute:G4-BAML']],
  excl: by['refute:exclusions'],
  cons: by['consolidate'] || null,
  failed: [],
};
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(Object.keys(by).join(' | '));
