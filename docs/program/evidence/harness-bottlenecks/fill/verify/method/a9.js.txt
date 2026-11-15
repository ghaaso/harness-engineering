const { tot, items } = JSON.parse(require('fs').readFileSync('items.json', 'utf8'));
const P = {}; const add = (k, i) => { const x = (P[k] = P[k] || { n: 0, t: 0 }); x.n++; x.t += i.tok; };
const BS = String.fromCharCode(92);
for (const i of items) { if (!i.cmd) continue; const c = i.cmd; let p = i.cat + ' ';
  if (/<<-?\s*['"]?\w+/.test(c)) p += 'HEREDOC ' + (/(^|\n|&&|;)\s*cat\s*>/.test(c) || /cat\s*>\s*\S+\s*<</.test(c) ? 'cat>file ' : '') + (/\b(node|python|py|uv|bash|sh)\b/.test(c) ? '+runs-interpreter' : '');
  else if (/\bsed\s+(-[a-zA-Z]*i|--in-place)/.test(c)) p += 'sed -i (edit)';
  else if (/\bsed\s+-n/.test(c)) p += 'sed -n';
  else if (/^\s*(cd\s+\S+\s*&&\s*)?sed\b/.test(c)) p += 'sed other';
  else p += i.w;
  add(p, i); }
for (const [k, x] of Object.entries(P).sort((a, b) => b[1].t - a[1].t).slice(0, 40)) console.log(k.padEnd(48), 'n', String(x.n).padStart(5), (100 * x.t / tot).toFixed(2) + '%');
