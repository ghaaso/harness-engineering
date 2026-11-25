# Brief: top session 6, widen the research run to the owner's new scope, then take its hand-back (kind orchestrate, Opus)

From top session 2 (local_b8dee401-7bf8-4328-b309-33c328e3a1b2), 2026-11-20 22:45 UTC. The owner approved this start
at 22:40:19 UTC with "Yes, start it", answering: "approve: start a fresh top session now to widen the run (about 30 M
tokens)?". This brief is data for you; you decide the helpers' briefs (r57-0021).

## 1. Who you are
- Top session 6: the top session of the research run from now on. Your name in the app: `top-6-widen-run`; your
  session id: `local_62806337-b942-4cf6-bf74-f2814f1b4188` (given at your start, 22:47 UTC). Top
  session 5 (`local_d4f287db-16fa-445a-b208-56390b8c4518`) prepared the run and is idle; top sessions 3 and 4 and the
  locks session are idle. Top session 2 writes nothing more to the library, TOP-STATE.md or the run folder: you are
  their one writer.
- You start no sessions (a session's start is refused on turns begun by a task or a notice: r57-0109, memory note
  `reference-child-session-cannot-start-sessions.md`); you work through helpers, by kind and model as the tier hook
  enforces (`.claude/hooks/tier-routes.json`). You only coordinate (CLAUDE.md rule 5): keep your window small.

## 2. His words (verbatim; transcript `C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/957a3bc0-ad3a-48a1-9f83-846a60b75555.jsonl`, 2026-11-20 21:41:06 UTC)
> So the tree is not about token saving, it's more about output quality, reliability, and less hallucinations, etc., all of that stuff. So the token saving will be a separate pipeline in the whole harness architecture from what we're expecting. And considering we fixed the problem of us having to uh, type in to start a turn and all of that, that speed in my attention would not be worse overall, given that we fix that. We'd have to build in separate checks and a bit of machinery around that to make sure it doesn't absolutely mess everything up or shit doesn't go down. And especially, we have to not narrow down onto what my 12 GB card can do. If there are approaches and methods that require more VRAM, like for example 24 GB VRAM, even we could manage that somehow from my university as resources and try that after testing my 12 GB card results. If we need to expand more, we can do the 12 GB stuff as well. And yeah, and I especially graphs and knowledge graphs, I need you to do proper extensive research on that, specifically in that domain, because there is a lot of nuance and a lot of architectures that could come in. Learning coders as well, memory and caching is another thing. The rest, you keep that same level of research, but I want you to expand on the graphs and knowledge graphs more than you're initially wanting to. Am I making sense? I hope I am. So the library stuff will be usually for the graph, I mean the token saving, and the B tree stuff would be to absolutely minimize hallucinations and problems. And we'll do the testing and coverage and comparisons with baselines later on, not right now. I suppose that's the plan, I'm hoping. And we can run this research run right now as well, right? And which session does that specifically? Are we going to start a sub session? Would that be good or worth it even, or a separate session entirely where we give it a handoff, assign tasks, and we could make one folder, a shared folder between, let's say, you and that other session, where it produces its results in a desired format, where it's good for you to read and extract all the information that you would need to make judgments. And the moment it puts that all that information and the research is done into that folder, you get notified, you fetch it from there into your context, and we move onwards from that point. We could do that as well. If that sounds like a good approach to you, let me know.

("Learning coders" is learned encoders, field 3.)

## 3. What he was told at about 21:55 UTC (the same transcript; so nothing contradicts it unknowingly)
- His framing is right: the tree is for quality (every figure quoted from the paper, a fresh refuter on every part, a
  record check; its shape keeps windows small and runs parts side by side); it costs tokens and does not save them;
  whether it beats a single session is untested, one of the later comparisons. Token saving is the other pipeline:
  the library, the graph and knowledge layer, the router.
- The typed go is solved for the research run (helpers in one session: he types approve:, cap: and the go, then
  nothing unless it stops), not for the full tree (a typed turn for every session start). The run's safety: the gate
  (meter and cap before every start), a token limit on every part, a known answer for each of the 10 stops in GO.md.
  It gives up three checks the tree's scripts have (stopping a replaced part from writing on, a limit on restarts,
  spotting a part that hangs), loss unmeasured: "The new session will weigh each check for this run and add back the
  ones that pay."
- The changes, as told: graphs and knowledge graphs widest (a first step maps the whole area: knowledge graphs built
  from code and text, graph retrieval designs, graphs kept fresh as code changes, reasoning over graphs, graph
  learning; then it splits into as many parts as the map needs, budgeted 3-4); learned encoders and memory and caching
  about 2 parts each, same method; the other four fields at the same depth; every method tagged fits 12 GB, needs
  24 GB (university) or needs more, none dropped, the 12 GB ones tested first; the review comparison on planted
  mistakes (142 M) moved to the later testing phase, the fresh refuter on every part staying, and the go losing its
  network-on exception to rule 3.
- Not now: the meter at 88 %, 12 points left until 2026-11-23 12:00 UTC (17:00 his time); the wider run needs about
  21 points; the gate keeps about 13 points for his own use until then; he can paste the go before Monday (form 2) and
  it starts itself at 17:05 with Windows set not to sleep.
- Which session: a new top session on Opus makes the changes now, gets them blind-reviewed, recomputes tokens and
  hours, rewrites GO.md and the page, asks his approve: and cap:. The run stays its own session in the run folder,
  opened by him with the go. The shared folder is the run folder: at the end the run writes one fixed file,
  `closing/HAND-BACK.md` (one block per lead: what it is, its source and quoted figure, its effect on the seven
  measures against its baseline, the strength of the evidence, the refuter's verdict, the memory tier, which pipeline
  it serves, what testing it here would cost), then sends the top session one message, which wakes it to read and
  judge. "That message hasn't been tried here yet. If it fails, you type one line to that session."
- Numbers, marked as estimates "the new session will compute them properly": the run about 1.3 B tokens (1.0-1.6 B),
  about 21 points of next week (16-26) and 1-2 Fable points; about 6.5-11 h of machine time; more downloads, the new
  go stating the size; the approved 1.2 B no longer covers it, the new cap about 1.7 B with the preparation;
  preparing now about 30 M, about 0.5 of the 12 points left. Basis: COMPLEXITY.md line 166 (without the F1 arms
  690 / 817 / 931 M), one part about 98.6 M without F1 (117.7 M less 19.1 M), 4-5 more parts, the closing a little
  more; 62 M a point (r57-0170).

## 4. Read first (from the files, not from memory: r57-0009)
- `library/INDEX.md` (the board), `research-tree/START-HERE.md`, `CLAUDE.md` (rules 1-7).
- The run, `C:/research-runs/2026-11-harness-leads/`: `CLAUDE.md`, `GO.md`, `DOWNLOADS.md`, `briefs/COORDINATOR.md`,
  `briefs/FIELD.md`, `briefs/CLOSING.md`, `briefs/SHEET.md`, `briefs/PLANTED.md`, `briefs/field/*`, `run/config.json`,
  `run/usage.log`, `tools/`, its git log.
- Records (`bash library/lookup.sh -f <id>`): r57-0046 (his approval, cap 1.2 B), r57-0422, r57-0423 (the run as
  prepared and reviewed), r57-0180 to r57-0183 (its root, scripts, the preparation's 69.3 M, 80 M in config), r57-0177
  (the faults; the three checks e2 drops), r57-0178 (typed turns, stops), r57-0175 and r57-0170 (meter weights, M a
  point), r57-0038 (a limit is the expected need plus a buffer), r57-0414 and r57-0813 (pacing, width), t1-0401 (the
  B-link split of unstarted keys), r57-0157 and r57-0418 (helpers of helpers), r57-0506 (a probe of the app is a small
  test: his word first, with its cost), r57-0004, r57-0033, r57-0417 (what is tested, and when).
- `research-tree/build/NEXT-STEP.md`; `research-tree/build/COMPLEXITY.md` section 5 (path e2, F1 at 19.1 M a field,
  142 M); `research-tree/build/UNATTENDED.md` v2; `research-tree/build/FAULTS.md`; `research-tree/build/refute/RUN-BRIEFS.md`
  and `research-tree/build/briefs/RUN-FOLD.md` (the last review of the run and its fold); `research-tree/build/TOP-STATE.md`
  (top session 5's section); `research-tree/build/LOCKS.md` (the run's locks, three faults fixed).
- Memory note `project-research-run-scope.md` (in `C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/memory/`).
- The go page, https://claude.ai/artifact/J2EcMdZR1uSQ6KLp7VGJWu (read it with the Artifact tool before publishing to it).

## 5. What to do
1. **Record his rulings first** (journal, append only; board line): the scope in section 2 (graphs and knowledge
   graphs widest; learned encoders and memory and caching wider; the rest the same; not limited to 12 GB, 24 GB through
   his university, tried after the 12 GB results; tests, coverage and baseline comparisons later; the tree for quality,
   the library, graph and router for tokens; the hand-back folder with a notice), and his approval of this start.
   Write your state to a file early and keep it current (the app restarts kill helpers: r57-0118).
2. **Make the changes.** Each derived from the recorded research or computed against the seven measures; none put to
   him as a question (rule 7).
   a. Field 2, graphs and knowledge graphs, widest. Today: one part, five topics (prior, code-graphs, symbol-index,
      graph-retrieval, real-agents), mostly code graphs and symbol indexes. Widen it to the architectures; the list in
      section 3 is an example, the map decides. A mapping step first, then the split by the tree's own rule (t1-0401)
      into as many parts as the map needs; budget about 3-4 parts and compute the bound. Where the map is made (inside
      the run under the go's downloads, or now from the records already held) is yours to settle by cost and risk;
      say which and why.
   b. Field 3 (learned encoders) and field 4 (memory and caching) wider, about 2 parts each, the same way. Mind the
      overlaps (field 4 already holds "knowledge graphs with time"; field 3 holds graph-neural encoders).
   c. Fields 5 to 8 at the same depth.
   d. Memory tiers: every method tagged fits 12 GB, needs 24 GB, needs more; none dropped for its size; the 12 GB ones
      first in any test order. The 12 GB wording today: FIELD.md rows f3 and f6, `briefs/field/topics.md` (f3
      adapters, f6 fit-12gb), `briefs/field/reader.md` line 68; find any other.
   e. Tests later: F1 (R_same against the fresh review on planted mistakes) out of the run, with what exists only for
      it (its steps, the planted copy, the sealed key, the scorer, the F1 files, its config units, the hold when the
      planted index or key is missing, FIELD.md lines 43 and 208); the go's exception to rule 3 (the review comparison
      with the network on) goes with it. The fresh refuter on every part stays. The problem sheet stays unless it
      exists only for F1: check.
   f. The three checks e2 drops (r57-0177: fencing a replaced helper, a restart limit, hang detection): for each, what
      it guards against in this run and what it costs; add back those that pay. His words: "We'd have to build in
      separate checks and a bit of machinery around that to make sure it doesn't absolutely mess everything up".
   g. The hand-back. At the end the run writes `closing/HAND-BACK.md` in a fixed form a top session can judge from:
      one block per lead with the fields of section 3 and the record ids it rests on; then what was not covered and
      why, and the tokens per unit. Then the coordinator sends you one message. ListAgents and SendMessage are the
      app's documented way for one local session to reach another; not tried here, and a test of it is a small test
      of the app (his word first, r57-0506). Write your name and session id into the run folder for the coordinator.
      If the message cannot be relied on, the go page says he types one line to you when the run's page appears.
3. **Recompute** on the run's own basis (`run/config.json`, r57-0175, r57-0170): tokens expected and range, points of
   next week's all-models meter and Fable points, hours at the width the run allows (three fields at once today: say
   what sets it), the downloads and their size, and the cap as the expected need plus a buffer (r57-0038), the
   preparation included (80 M so far, plus this round). Update `run/config.json`, `GO.md` (the go text: the new cap,
   no exception to rule 3, the numbers), `DOWNLOADS.md`, `CLOSING.md`, `COORDINATOR.md`, `FIELD.md` and the field
   templates; keep the run's scripts and their tests passing; commit in the run folder's own git as its tools do.
4. **A blind review** of every change in a fresh context (kind refute, Opus); fold what it finds; look again only where
   a breaking finding was fixed (r57-0004, r57-0033).
5. **The go page**, updated in place: plain words, numbers first (memory notes `feedback-plain-wording.md`,
   `feedback-readable-without-removing.md`).
6. **Record the result** in the library (records, board line, the NEXT task), commit your own files in the harness
   repository on the current branch (memory note `user-git-identity.md`; `git commit -F`), then ask him with the
   question tool: `approve:` the widened run, and `cap:` its cap, each with its numbers.
7. **After his go:** wait for the run's message without polling. On it, read `closing/HAND-BACK.md`, judge it (what the
   evidence supports, what to test first and at what cost, by pipeline), and give him a short page; markdown is the
   record behind it (CLAUDE.md rule 6).

## 6. Limits
- This round (steps 1 to 6): expected about 30 M tokens (20-45, top session 2's estimate; recompute it from the
  preparation's measured 69.3 M, r57-0183); stop at 45 M and report what is done (r57-0038). Count with
  `node research-tree/build/tools/tokens-self.mjs "<label>"`.
- Read the meter before any fan-out (rule 5). At 21:49 UTC: 88 % all models, 54 % Fable, resets 2026-11-23 12:00 UTC;
  the run's gate protects about 13 points for his own use until then; this round is use he approved.
- Your window: hand over through files before the measured hand-over point, 247-273 K (r57-0171, r57-0008).

## 7. Rules
- CLAUDE.md rules 1 to 7. Rule 3: this round downloads nothing; the run's downloads stay under the go's approval, named
  with source and size in DOWNLOADS.md. Rule 4: nothing of the project in any web request. Rule 7: questions to him
  start `approve:`, `cap:` or `fact:`.
- Never touch `docs/program/pipeline-diagram/` or `docs/program/agent-session-map/`. Do not merge or push branch
  `build`. Commit only your own files; never stash, reset or switch branches. The untracked map, PDF and briefs of
  top session 2 under `research-tree/build/` (`tree/research-run-map.*`, `speedups/`, `briefs/MAP.md`,
  `briefs/SPEEDUPS.md`, this brief) are not yours to commit.
- Nothing that gets round the app's controls (his words of 2026-11-20: "You don't have to bypass it or make some illegal
  rule or anything").
- A copy of the run folder is on branch build at `research-tree/build/research-run/` (fa8d28c1): the record of the run
  as first prepared; keep it in step only if top session 5's records say so.

## 8. Report
Your report is relayed: put first what changed (files, commits), the new numbers (tokens, points, hours, cap), the
review's breaking findings and their folds, and what waits for his `approve:` and `cap:`.
