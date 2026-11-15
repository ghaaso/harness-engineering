// R3 refuter: recurrence of machine/tool facts that had to be re-learned, from transcripts.
// For each fact class: occurrences, windows, sessions, projects, date span, share of all calls,
// split by main vs subagent window, and before/after the date the fact entered the EMS memory notes.
const fs = require('fs');
const rows = fs.readFileSync('R3-errors.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const wins = JSON.parse(fs.readFileSync('R3-windows.json', 'utf8'));
const totalCalls = wins.reduce((a, w) => a + w.calls, 0);
const proj = (s) => /EMS-workshop1/.test(s) ? 'fixflow-ems' : /Clinic-Workshop/.test(s) ? 'clinic' : /PROJECTS-23-FixFlow/.test(s) ? 'fixflow-old' : /Codex/.test(s) ? 'codex-x20' : /scratch-workspaces/.test(s) ? 'scratch' : s.replace(/^C--Users-User-/, '').slice(0, 24);
const CLASSES = {
  'python not on PATH': { re: /Python was not found|python3?: command not found|py: command not found/i, memo: Date.parse('2026-11-04T07:09:40Z') },
  'shell quoting EOF (apostrophe in -c / -e)': { re: /unexpected EOF while looking for matching/i, memo: Date.parse('2026-11-11T08:04:59Z') },
  'pdftoppm/poppler missing': { re: /pdftoppm is not installed/i, memo: null },
  'Filename/name too long': { re: /Filename too long|ENAMETOOLONG/i, memo: Date.parse('2026-11-04T07:09:40Z') },
  'node .txt extension': { re: /ERR_UNKNOWN_FILE_EXTENSION|Unknown file extension/i, memo: Date.parse('2026-11-11T08:04:59Z') },
  'PowerShell && separator': { re: /not a valid statement separator/i, memo: null },
  'missing CLI (railway/eas/pkill/bc/jq)': { re: /(railway|eas|pkill|bc|jq): command not found/i, memo: null },
};
const isSub = (w) => /subagents\//.test(w);
const out = { totalCalls, windows: wins.length, sessions: new Set(wins.map((w) => w.sess)).size, classes: {} };
let allOcc = 0;
for (const [name, cl] of Object.entries(CLASSES)) {
  const hit = rows.filter((r) => cl.re.test(r.err));
  allOcc += hit.length;
  const w = new Set(hit.map((r) => r.win)), s = new Set(hit.map((r) => r.sess)), p = new Set(hit.map((r) => proj(r.store)));
  const ts = hit.map((r) => r.ts).sort((a, b) => a - b);
  const byProj = {}; for (const r of hit) byProj[proj(r.store)] = (byProj[proj(r.store)] || 0) + 1;
  const o = { occ: hit.length, isErr: hit.filter((r) => r.isErr).length, windows: w.size, sessions: s.size, projects: [...p], byProj,
    first: ts.length ? new Date(ts[0]).toISOString().slice(0, 10) : null, last: ts.length ? new Date(ts[ts.length - 1]).toISOString().slice(0, 10) : null,
    subagentOcc: hit.filter((r) => isSub(r.win)).length, shareOfCalls: +(100 * hit.length / totalCalls).toFixed(2) + '%',
    perWindowMax: Math.max(0, ...[...w].map((x) => hit.filter((r) => r.win === x).length)) };
  if (cl.memo) {
    const ems = hit.filter((r) => /EMS-workshop1/.test(r.store));
    o.emsBeforeMemo = ems.filter((r) => r.ts < cl.memo).length; o.emsAfterMemo = ems.filter((r) => r.ts >= cl.memo).length;
    o.emsAfterMemoWindows = new Set(ems.filter((r) => r.ts >= cl.memo).map((r) => r.win)).size;
    o.emsAfterMemoMainWindowOcc = ems.filter((r) => r.ts >= cl.memo && !isSub(r.win)).length;
  }
  // weekly counts, to see whether recurrence decays (a guard) or persists (session rate)
  const wk = {}; for (const r of hit) { const d = new Date(r.ts); const k = d.toISOString().slice(0, 10); const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7))).toISOString().slice(5, 10); wk[monday] = (wk[monday] || 0) + 1; }
  o.byWeek = wk;
  out.classes[name] = o;
}
// commands that triggered python-not-found: deliberate probes vs real attempts
const py = rows.filter((r) => CLASSES['python not on PATH'].re.test(r.err));
const probe = py.filter((r) => /Get-Command|which |command -v|where(\.exe)? python|--version/i.test(r.cmd)).length;
out.pythonProbeShare = probe + ' of ' + py.length + ' look like deliberate probes';
out.allClassOcc = allOcc; out.allClassShareOfCalls = +(100 * allOcc / totalCalls).toFixed(2) + '%';
// calls per window and windows per day: the session-rate denominator
const days = new Set(wins.filter((w) => w.t0).map((w) => new Date(w.t0).toISOString().slice(0, 10)));
out.activeDays = days.size;
console.log(JSON.stringify(out, null, 1));
