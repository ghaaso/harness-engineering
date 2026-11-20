# Brief: add the four pieces to the owner's complexity page (helper of top session 4; kind build, Sonnet)

The owner's page for the complexity analysis is the private Artifact https://claude.ai/artifact/JQsXXJ43jk7CJBgbJCZeG9,
built from `research-tree/build/reports/complexity.html` (main checkout
`C:/Users/User/Documents/projects/harness-engineering`). Add to it the results of the four pieces he asked for on
2026-11-20, so that one page answers him. He reads it at about 1870 px, light; he wants plain words, the answer first,
short, nothing dropped (CLAUDE.md rule 6; memory notes `feedback-plain-wording.md`,
`feedback-readable-without-removing.md` under
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/memory/`).

## Content (each from its file's section 0 and tables; take figures as written, add none)
1. At the top, beside the complexity answer, one short block "Your four questions": one or two plain lines each for
   the router, running without his "go", where the faults came from, and the tree, each linking to its section below.
2. **A model for each step inside a session**: `research-tree/build/ROUTER.md` version 2 (section 0, the router
   table, the saving table; what is measured and what is a range).
3. **Running without typing "go"**: `research-tree/build/UNATTENDED.md` version 2 (section 0, the ways table, what he
   does in one sitting and from his phone, what can stop the run).
4. **Where the faults came from**: `research-tree/build/FAULTS.md` version 2 (section 0, the counts by class, what a
   proven design would replace, what changes before the run).
5. **The tree**: the picture `research-tree/build/tree/research-run-tree.svg` (inline or as a supporting file, readable
   at 1870 px; nothing on it changed) with its README's one-paragraph description.
6. **Next step**: the text in `research-tree/build/NEXT-STEP.md` as written (top session 4 writes it; wait for it).
Use the page's own layout, tokens and styles; keep everything already on it.

## How
Load the artifact-design skill first. Read the Artifact with the Artifact tool (action read) before publishing; write
the new page to `research-tree/build/reports/complexity.html` (the same file, so the source stays one) and publish it to
the same URL. Look at it once at 1870 px (headless Edge screenshot as in the memory note
`reference-local-page-build-and-preview.md`, or the browser pane), fix what does not read, publish again only if you
changed it.

## Limits
Write only `reports/complexity.html` and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/page/`. No
other artifact, no commit, no session or helper start, no command over 150 s. Tokens: expected about 1 M, limit 2 M;
counter `node research-tree/build/tools/tokens-self.mjs "the four pieces on the complexity page"`. Return the URL, what
you added, the screenshot's path and your token count.
