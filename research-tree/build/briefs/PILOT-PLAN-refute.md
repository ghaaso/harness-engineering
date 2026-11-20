# Brief: blind review of the pilot's plan (helper of top session 2; kind refute, Opus)

Refute `research-tree/build/PILOT-PLAN.md` (main checkout `C:/Users/User/Documents/projects/harness-engineering`),
written by another helper that could not re-read it at the end. The owner will be asked to approve its preparation
and to set a cap from it, so every claim that moves a number, a node or an ask must stand on its source. Write your
verdict to `research-tree/build/refute/PILOT-PLAN.md`. You change no other file and start nothing.

## Check, each against its source (not against the plan's own wording)
1. **The four gaps of its section 4** (models of children and helpers never set; the scorer cannot be started; S1 and
   S2 cannot search; the three thresholds). Read the code and files they cite on branch `build` at 96bc34cc, in
   `C:/Users/User/Documents/projects/hb/research-tree/tcb/` (profiles, agents, briefs, settings, `guard-hook.mjs`,
   `thresholds.json`, the coordinator's brief and start act). For each: real or not, and is the fix as small or as
   large as the plan says. A gap that is not real removes work from the fix round.
2. **The arithmetic**: sums of section 2, the overrun, the reserve, the cap, the points, the gate of section 3, the
   times. Recompute each; list every figure that is wrong with the right one.
3. **The sources of each node's expected tokens** (section 1): is the cited like-for-like work really like (kind,
   model, size of task), and is n stated right. Where it measured from transcripts ("this helper"), spot-check one
   figure with the counting rule of `research-tree/build/tools/tokens-self.mjs` (once per message id).
4. **The Fable coordinator on the all-models meter.** The plan says the record allows its weight from 0 to an Opus
   token's. Check what the record holds: `research-tree/build/check/E-tokens.md` (section 4, its fits), `G-models.md`
   (prices as weights), ORCHESTRATION.md section 4, library r57-0170, r57-0514. Is an upper bound at an Opus token
   supported? If not, what range does the record allow, and what does that do to the line (meter percentage) the
   owner is asked to allow?
5. **The design against the protocol and the rulings**: the node list against protocol v2 sections 10, 11, 12
   (`docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`), `research-tree/RULINGS.md`, and the tier routes
   (`.claude/hooks/tier-routes.json`, r57-0035). Anything missing, extra, or on the wrong model.
6. **The asks of section 6**: each must be an approval or a cap, never a design question (CLAUDE.md rule 7, r57-0001).
   Anything the plan leaves to the owner that the record could decide, or decides that is his (a download, a change
   to his PC's settings), say so.

## Verdict file
First line: `PASS` or `CORRECT: <n> findings`. Then one row per finding: what the plan says, what the source says
(path and line), the corrected figure or wording, and whether it changes the cap, the fix round or an ask. Then what
you checked and found right, in one short list. Plain words.

## Limits
Read-only everywhere except the verdict file and scratch files in a folder of your own under the session scratchpad.
No session or helper start, no command over 150 s, no web request, no commit. Tokens: expected about 10 M (the build's
refuters, median 10.6 M), limit 15.6 M; read your count with
`node research-tree/build/tools/tokens-self.mjs "blind review of the pilot plan"` every 10 calls from call 30; at
about 330 K context or at the limit, write the verdict as it stands and return LIMIT. Return the verdict's first line
and the findings that change the cap, the fix round or an ask.
