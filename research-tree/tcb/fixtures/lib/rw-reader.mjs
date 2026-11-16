// Test worker for lib.test.mjs T21: reads a JSON file in a loop while another process replaces it.
// Every read must be one of the two full contents. Usage: node rw-reader.mjs <lib file url> <target> <stop file>
import fs from 'node:fs';

const [libUrl, target, stopFile] = process.argv.slice(2);
const lib = await import(libUrl);
const LEN = 1000000;
let reads = 0;
let bad = 0;
const errors = [];
let announced = false;
while (!fs.existsSync(stopFile)) {
  try {
    const v = (await lib.readJson(target)).v;
    reads++;
    const c = v[0];
    if (v.length !== LEN || (c !== 'A' && c !== 'B') || v[LEN - 1] !== c || v[LEN >> 1] !== c) bad++;
  } catch (e) {
    errors.push(String(e.code || e.message));
  }
  if (!announced && reads > 0) {
    announced = true;
    process.stdout.write('ready\n');
  }
}
process.stdout.write(JSON.stringify({ reads, bad, errors: errors.slice(0, 10) }) + '\n');
