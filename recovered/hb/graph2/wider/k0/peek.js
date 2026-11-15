// print the key structure of a JSON file to depth N, and find keys matching a regex
const fs = require('fs');
const [,, file, depthS, re] = process.argv;
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const depth = +depthS || 2;
function walk(o, d, pre) {
  if (o && typeof o === 'object') {
    const ks = Array.isArray(o) ? [] : Object.keys(o);
    if (Array.isArray(o)) { console.log(pre + '[' + o.length + ']'); if (d < depth && o.length) walk(o[0], d + 1, pre + '  '); return; }
    for (const k of ks) {
      const v = o[k];
      const t = Array.isArray(v) ? 'arr' + v.length : typeof v;
      console.log(pre + k + ' : ' + t + (typeof v !== 'object' ? ' = ' + String(v).slice(0, 100) : ''));
      if (d < depth) walk(v, d + 1, pre + '  ');
    }
  }
}
if (re) {
  const R = new RegExp(re, 'i');
  (function f(o, p) {
    if (o && typeof o === 'object') for (const k of Object.keys(o)) { const pp = p + '.' + k; if (R.test(k)) console.log(pp + ' = ' + JSON.stringify(o[k]).slice(0, 3000)); f(o[k], pp); }
  })(j, '');
} else walk(j, 0, '');
