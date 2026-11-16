'use strict';
// Read selected files from the PyKEEN wheel (read-only) into this scratch folder.
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const W = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/image/wheels/pykeen-1.11.1-py3-none-any.whl';
const buf = fs.readFileSync(W);
let e = buf.length - 22; while (buf.readUInt32LE(e) !== 0x06054b50) e--;
const n = buf.readUInt16LE(e + 10), cd = buf.readUInt32LE(e + 16);
const want = process.argv.slice(2);
const outDir = path.join(__dirname, 'pykeen_src');
const files = {};
let p = cd; const names = [];
for (let i = 0; i < n; i++) {
  const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
  const name = buf.toString('utf8', p + 46, p + 46 + nlen); names.push(name);
  if (want.some(w => name.endsWith(w))) {
    const lnl = buf.readUInt16LE(off + 26), lxl = buf.readUInt16LE(off + 28);
    const data = buf.subarray(off + 30 + lnl + lxl, off + 30 + lnl + lxl + csize);
    files[name.replace(/\//g, '__')] = (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8');
  }
  p += 46 + nlen + xlen + clen;
}
if (!want.length) { console.log(names.filter(x => x.endsWith('.py')).join('\n')); process.exit(0); }
// one write call per output file (bundle)
fs.writeFileSync(path.join(__dirname, 'pykeen_src.json'), JSON.stringify(files, null, 0));
for (const k in files) console.log(k, files[k].length);
