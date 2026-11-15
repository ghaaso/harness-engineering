// agent B, r58c: the ruling-91 key is named (HANDOFF-FORMAT v2 rev 1b item 10); END-ORDER and INTERFACE-for-A say so.
const fs = require('fs');
function edit(P, a, b) { let s = fs.readFileSync(P, 'utf8'); if (s.split(a).length !== 2) throw new Error(P + ': not exactly once: ' + a.slice(0, 60)); fs.writeFileSync(P, s.replace(a, () => b)); }
edit('orchestrator/END-ORDER.md', `\`leak_audit.py\` with its ruling-89 check and ruling-90 listing (step 9.1), and the name of the ruling-91
  hand-off key that counts absent tasks per variant (\`write_result.py\` and \`r58c/write_audit_claims.py\` read it
  as \`ABSENT_KEY\`, \`absent_tasks\` until agent A names it; a one-constant change). The coordinator passes them
  in; nothing else in this file changes when they arrive.`,
`\`leak_audit.py\` with its ruling-89 check and ruling-90 listing (step 9.1). The ruling-91 key is settled:
  \`absent_tasks\`, \`{<variant name>: {"pool": n, "unrestricted": n}}\` (\`train/HANDOFF-FORMAT.md\` version 2,
  revision 1b, section 1 item 10), read by \`write_result.py\` as \`ABSENT_KEY\`; any other shape is a refusal
  (exit 10). The coordinator passes the command lines in; nothing else in this file changes when they arrive.`);
edit('r58c/B/INTERFACE-for-A.md', `  \`{variant label: int}\` with per-seed labels \`<ARM>_<KIND>_s<N>\` and comparator labels \`RRF\`/\`PPR\`/\`CO\`/\`DIR\`
  (seed-mean labels optional).`,
`  \`{variant label: int}\` with per-seed labels \`<ARM>_<KIND>_s<N>\` and comparator labels \`RRF\`/\`PPR\`/\`CO\`/\`DIR\`
  (seed-mean labels optional). SUPERSEDED by HANDOFF-FORMAT v2 rev 1b item 10: the key is \`absent_tasks\` and each
  value is \`{"pool": n, "unrestricted": n}\`; write_result.py now reads exactly that shape (r58c/B/CONFLICTS.md note 5).`);
console.log('docs patched');
