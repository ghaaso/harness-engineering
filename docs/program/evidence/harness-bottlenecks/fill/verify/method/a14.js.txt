const A = require('./attr.js'); const K2 = require('./shell2.js'); const BS = String.fromCharCode(92);
const key = (s) => { const t = String(s || '').split(BS).join('/').replace(/^cd\s+("[^"]*"|\S+)\s*(&&|;)/, ''); const m = t.match(/[\w.\/~-]+\.[A-Za-z0-9]{1,6}(?![\w.\/])/); return m ? m[0].split('/').slice(-2).join('/').toLowerCase() : ''; };
const isLog = (c) => /\.log\b|\.output\b|scratchpad|\$S\b|\$SP\b|\$S\/|\$SP\/|\$F\b|\$TEMP|ClinicStagingRig|\/tmp\/|check\d*\.txt|drive\.status|progress\.txt|\bTEMP\b/.test(c);
for (const s of A.S) for (const c of s.calls) for (const it of c.inc) { it.cat0 = it.cat0 || it.cat; it.fp0 = it.fp0 != null ? it.fp0 : it.fp; }
const pick = (r) => JSON.stringify({ fetched: r.fetched, own: r.own, start: r.start, unclassified: r.unclassified, first: r.first, again: r.again });
const variant = (name, f) => { for (const s of A.S) for (const c of s.calls) for (const it of c.inc) { it.cat = it.cat0; it.fp = it.fp0; if (it.cmd != null && it.cat0.startsWith('shell')) f(it); } console.log(name.padEnd(44), pick(A.run())); };
variant('baseline', () => {});
variant('demote writes/runs out of shell-read only', (it) => { const k = K2(it.cmd)[0]; if (it.cat0 === 'shell-read' && k !== 'shell-read') { it.cat = k; it.fp = ''; } });
variant('demote + promote (strict classifier)', (it) => { const k = K2(it.cmd)[0]; it.cat = k; if (k === 'shell-read' && it.cat0 !== 'shell-read') it.fp = key(it.cmd); if (k !== 'shell-read') it.fp = ''; });
variant('strict classifier, log/temp reads excluded', (it) => { let k = K2(it.cmd)[0]; if (k === 'shell-read' && isLog(it.cmd)) k = 'shell-log'; it.cat = k; if (k === 'shell-read' && it.cat0 !== 'shell-read') it.fp = key(it.cmd); if (k !== 'shell-read') it.fp = ''; });
