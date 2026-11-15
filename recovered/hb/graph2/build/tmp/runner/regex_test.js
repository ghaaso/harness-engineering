'use strict';
// Sanity test of the whole-path match used by check.js.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const p = 'CLAUDE.md';
const re = new RegExp('(^|[^A-Za-z0-9_./-])' + esc(p) + '($|[^A-Za-z0-9_/-]|\\.(?![A-Za-z0-9_]))');
for (const s of ['CLAUDE.md', 'CLAUDE.md#x', 'see CLAUDE.md.', 'docs/CLAUDE.md', 'CLAUDE.mdx', 'xCLAUDE.md', 'CLAUDE.md:L2', 'CLAUDExmd']) console.log(JSON.stringify(s), re.test(s));
