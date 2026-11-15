const { tot, items } = JSON.parse(require('fs').readFileSync('items.json', 'utf8')); const K2 = require('./shell2.js');
const isLog = (c) => /\.log\b|\.output\b|scratchpad|\$S\b|\$SP\b|\$S\/|\$SP\/|\$F\b|\$TEMP|ClinicStagingRig|\/tmp\/|check\d*\.txt|drive\.status|progress\.txt|\bTEMP\b/.test(c);
const A = {}; const add = (k, v) => (A[k] = (A[k] || 0) + v);
for (const i of items) { if (i.cmd == null) { if (i.cat === 'file-read') add('file-read ' + (/scratchpad|\.log$|\.output$|Temp/.test(i.rp || '') ? 'temp/log' : 'repo'), i.tok); continue; }
  const k2 = K2(i.cmd)[0]; add('orig ' + i.cat + ' -> new ' + k2 + (k2 === 'shell-read' ? (isLog(i.cmd) ? ' [log/temp]' : ' [repo]') : ''), i.tok); }
for (const [k, v] of Object.entries(A).sort((a, b) => b[1] - a[1])) if (v / tot > 0.0005) console.log(k.padEnd(56), (100 * v / tot).toFixed(2) + '%');
