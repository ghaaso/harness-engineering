// usage: node pdftext.js <pdf> > out.txt  (crude text extraction from Flate streams; TJ/Tj operators)
const fs = require('fs'), zlib = require('zlib');
const b = fs.readFileSync(process.argv[2]); const s = b.toString('latin1'); let out = '';
let i = 0;
while ((i = s.indexOf('stream', i)) >= 0) {
  let st = i + 6; if (s[st] === '\r') st++; if (s[st] === '\n') st++;
  const en = s.indexOf('endstream', st); if (en < 0) break;
  try {
    const t = zlib.inflateSync(b.subarray(st, en)).toString('latin1');
    const parts = [];
    t.replace(/\[((?:[^\]\\]|\\.)*)\]\s*TJ|\(((?:[^)\\]|\\.)*)\)\s*Tj|(T\*|Td|TD|ET)/g, (m, a, c, op) => {
      if (a !== undefined) parts.push(a.replace(/\(((?:[^)\\]|\\.)*)\)|(-?\d+\.?\d*)/g, (x, y, n) => (y !== undefined ? y : (n && Number(n) < -200 ? ' ' : ''))));
      else if (c !== undefined) parts.push(c);
      else parts.push(op === 'ET' ? '\n' : ' ');
      return m;
    });
    out += parts.join('');
  } catch (e) { /* not a flate stream */ }
  i = en;
}
console.log(out.replace(/\\([()\\])/g, '$1'));
