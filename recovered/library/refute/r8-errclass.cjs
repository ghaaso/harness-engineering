// R8 refuter. Hand-written classes over the recurring (2+ sessions) error templates from r8-errtmpl.json.
// ENV/HARNESS = one cause, and the message names it; SLIP = generic message, a different specific mistake each time;
// TRANSIENT = network/limits, no stable cause; CODE = an error from the project's own code, tests, build or tools.
const fs = require('fs');
const rows = JSON.parse(fs.readFileSync('r8-errtmpl.json', 'utf8')).filter(r => r.sessions >= 2);
const C = [
  ['TRANSIENT', /ECONNRESET|ECONNREFUSED|timeout of|timed out|socket hang up|session limit|EAI_AGAIN|certificate|maxContentLength|unable to fetch|Tool call interrupted|status code N|fetch failed|ETIMEDOUT|N Forbidden|N Too Many|rate limit|overloaded/i],
  ['ENV', /Python was not found|pdftoppm|not recognized as the name|Could not determine Node|ENAMETOOLONG|too long|python.*not found|command not found|UnicodeEncodeError|codec can|Non-UTF|This program cannot be run|is not installed|No module named/i],
  ['HARNESS', /exceeds maximum allowed tokens|doesn't want to proceed|rejected|Remove-Item on system path|Subagents should return|modified since read|hook error|has not been read yet|InputValidationError|Start sessions only|File does not exist\. Note|ripgrep rejected|Claude Code is unable|blocked|permission|denied|not allowed|sandbox/i],
  ['SLIP', /unexpected EOF|SyntaxError|String to replace not found|cannot access|No such file|KeyError|Cannot read properties|Cannot find module|empty pipe|ParserError|ParseException|Invalid regular expression|Found N error|^EMPTY$|^<P>$|^N$|^N <P>$|^total N|^Name|Traceback|TypeError|NameError|AttributeError|unterminated|invalid syntax|\{<Q>/],
  ['CODE', /pytest|FAILED|assert|alembic|mypy|ruff|eslint|vitest|jest|tsc|gradle|EAS|expo|npm ERR|ModuleNotFound|ImportError|Line too long|E\d{3}/i],
];
const tally = {}; const unk = [];
for (const r of rows) {
  const cls = (C.find(([, re]) => re.test(r.key)) || ['OTHER'])[0];
  r.cls = cls; tally[cls] = tally[cls] || { templates: 0, errors: 0, repeatFires: 0 };
  tally[cls].templates++; tally[cls].errors += r.n; tally[cls].repeatFires += r.n - 1;
  if (cls === 'OTHER' || cls === 'CODE') unk.push(r);
}
const tot = Object.values(tally).reduce((s, t) => s + t.repeatFires, 0);
for (const [k, t] of Object.entries(tally)) t.shareOfRepeatFires_pct = +(100 * t.repeatFires / tot).toFixed(1);
console.log(JSON.stringify({ crossSessionTemplates: rows.length, repeatFires: tot, tally }, null, 1));
console.log('--- CODE and OTHER templates:');
for (const r of unk) console.log(`${r.cls}\t${r.n}\t${r.sessions}s\t${r.tool}\t${r.key.slice(0, 140)}`);
fs.writeFileSync('r8-errclass.json', JSON.stringify({ tally, rows }, null, 0));
