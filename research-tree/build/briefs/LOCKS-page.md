# Brief: add the locks check to the owner's complexity page (helper of the locks session; kind build, Sonnet)

The owner's page for the complexity analysis is the private Artifact https://claude.ai/artifact/JQsXXJ43jk7CJBgbJCZeG9,
built from `research-tree/build/reports/complexity.html` (main checkout
`C:/Users/User/Documents/projects/harness-engineering`). Other sessions have updated it: read it with the Artifact tool
(action read) first and build on the version that comes back (the read names the saved file that holds the full page);
if it differs from `reports/complexity.html`, the live version wins. Add the result of the check he asked for on
2026-11-20: whether the tree relies on the operating system's locks where database engineering (the CMU course) would
not, and whether that is a flaw (his words: `research-tree/build/briefs/LOCKS.md` lines 5-9). He reads the page at
about 1870 px, light; plain words, the answer first, short, nothing dropped (CLAUDE.md rule 6; memory notes
`feedback-plain-wording.md` and `feedback-readable-without-removing.md` under
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/memory/`).

## Content (from `research-tree/build/LOCKS.md` version 2; take figures and wording as written, add none)
1. In the page's top block of his questions, one or two plain lines with the answer, linking to the new section.
2. A new section, "Does the tree rely on the OS's locks?": section 0 of LOCKS.md first; then a table of the places
   (one row each: place, what it uses, what it protects, verdict, what would replace it), condensed from section 1's
   table without dropping a row; then what would change and when, with its cost marked as an estimate; then what is
   not known. Plain titles, no catchy headings.
Use the page's own layout, tokens and styles; keep everything already on it.

## How
Load the artifact-design skill first. Write the new page to `research-tree/build/reports/complexity.html` (the same
file, so the source stays one) and publish it to the same URL. Look at it once at 1870 px (a headless Edge screenshot
as in the memory note `reference-local-page-build-and-preview.md`, or the browser pane); fix what does not read and
publish again only if you changed it. Never end a program the owner runs (no taskkill of Edge or any browser).

## Limits
Write only `reports/complexity.html` and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/6a2a6154-26ed-4633-b771-414e96d8baa3/scratchpad/page/`. No
other artifact, no commit, no session or helper start, no command over 150 s. Tokens: expected about 1.5 M (the last
page helper: 3.61 M for four sections), limit 2.5 M (the cap of 40 M binds all of it); counter
`node research-tree/build/tools/tokens-self.mjs "the locks check on the complexity page"`; if that command is refused,
stop at 25 calls. Return the URL, what you added, the screenshot's path and your token count.
