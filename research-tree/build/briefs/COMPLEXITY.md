# Brief: complexity analysis of the pilot's plan and of the paths to the research goal (helper of the top session; kind analyse, Opus)

Approved by the owner on 2026-11-20 ("I approve you doing comprehensive, good complexity, and also that gives the
accurate, correct complexity"). Limit for the whole round (this analysis, one blind review, one page): 30 M tokens.

## What the owner asked (his words, 2026-11-20)
- "You should do a complexity analysis of it and report back to me on what you think, whether its complexity can be
  reduced or not. And if these numbers are taken into account, considering maximizing parallelism with horizontal and
  vertical expansion, all said and done, utilizing the memory to the max, to the cores to the max ... And since we
  also studied and did multiple writers on one file ... optimizing parallel readers, parallel writers. If that wasn't
  the case, would it take us even more time, around like days possibly?"
- "13.8 hours is a lot, and if we're doing simply reading and compiling research, it doesn't make sense for it to take
  13.8 hours."
- "Is it really so big and broad that we have to put 13 hours of sub-agent sessions, all of the whole tree running to
  be able to do this? Are you by any chance over-engineering this, where we're taking the long path to an outcome
  that could be achieved with smaller paths as well?"
- "why do I need to type in go and enter to start the sessions? ... I should not be needed for this ... it should be
  automated to the point where we can just let it run to the extent and then find out the changes, the problems, the
  metrics basically."

## The question
Where do the pilot's tokens and hours go; how much of each is the research work itself and how much is machinery and
waiting; how far can both come down; and is there a smaller path to the same goal: checked results on the research
direction's eight lanes (`docs/program/RESEARCH-DIRECTION-2026-11-16.md` sections 1, 3, 4).

## Compute
1. **The plan as it stands** (`research-tree/build/PILOT-PLAN.md`, version 2). Split each node's tokens and each step's
   hours into the research work (search, read, extract, synthesise, check, review, score) and the rest (coordinator,
   hand-overs and drains, script calls, slots waited for, owner turns waited for, the 1.2-1.7 factor). Give the
   critical path. For each part of the rest name its cause: the protocol's comparisons, a default (N_max 2,
   W*_coord 133.2 K), an app limit (r57-0109: a session starts another only on a turn the owner typed; the app's
   session id against the CLI's), or a safety margin.
2. **Lower bounds for one field**: the least tokens and the least hours the work itself needs, from measured figures
   (readers per source, extraction, synthesis, checks, reviews: `research-tree/build/check/E-tokens.md`, r57-0115,
   r57-0173, round 3), at the widest width the decision rule v2 allows on this PC (r57-0414: memory, processor, each
   token window, the parent's window), horizontal (more readers and sessions at once) and vertical (more levels).
   Where an input is not measured (a session's memory), give the range and what would measure it.
3. **Paths to the same goal**, each with expected tokens, wall time, turns the owner must type, the quality checks it
   keeps or drops, and its cost against the direction's budget (10 % of a week, direction section 7):
   a. the tree as planned: the pilot, then a full run of eight leaves;
   b. the same tree built from helpers instead of child sessions, so nothing waits for the owner (r57-0157, r57-0158,
      r57-0418: a helper running helpers must poll), and any other way the app allows work to start without the
      owner typing, from the record; never a way around the app's own controls; say what each needs from him;
   c. the round-3 way per lane (an Opus session with Sonnet readers, a gate, a refuter in a fresh context), measured
      here: count its tokens and hours from `docs/program/evidence/round3-2026-11-18/` and its transcripts (r57-0140,
      r57-0709, r57-0139) by the counting rule of `research-tree/build/tools/tokens-self.mjs`;
   d. one session per lane (S1's form);
   e. any smaller path the record supports.
4. **The parallel readers and writers research**: what it saves in each path against the counterfactual of one reader
   and one writer at a time, computed; where it does not apply (the pilot's readers write their own files), say so.
5. **The verdict**: can the complexity be reduced, by how much in tokens and hours, what the reduced plan is, and
   what it loses.

## Sources
`PILOT-PLAN.md` and `refute/PILOT-PLAN.md`; protocol v2 (`docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`)
sections 1, 7, 10 to 13; the research direction; `research-tree/build/ORCHESTRATION.md` sections 3 to 5 and 13;
`research-tree/build/check/E-tokens.md` and `G-models.md`; library records r57-0109, r57-0114, r57-0115, r57-0139,
r57-0140, r57-0157, r57-0158, r57-0170, r57-0171, r57-0173, r57-0414, r57-0415, r57-0418, t1-0400 to t1-0409,
a1-0400 to a1-0410, c1-0400 to c1-0408 (`bash library/lookup.sh -f <id>`); transcripts under
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/`.

## Rules
Marks [m] measured, [r] read, [c] computed with the formula shown, [e] estimate. One build and one week are a basis,
not a law (r57-0015, r57-0028). No design question to the owner (CLAUDE.md rule 7): a missing fact is named with what
would measure it. No web request, no session or helper start, no commit, no command over 150 s. Read-only except
`research-tree/build/COMPLEXITY.md` and scratch files in a folder of your own under the session scratchpad.

## Write and return
`research-tree/build/COMPLEXITY.md`: section 0 "The answer" first (at most 12 plain lines), then the computation, a
table of the paths, the reduced plan, what is not known. Tokens: expected about 12 M, limit 18 M; your counter
`node research-tree/build/tools/tokens-self.mjs "complexity of the pilot plan"`. At about 330 K context or at the
limit, write the file as it stands with "Left to do" and return LIMIT. Return section 0, the paths table and your
token count.
