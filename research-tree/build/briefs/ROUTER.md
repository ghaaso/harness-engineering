# Brief: the router, a model and an effort for each operation inside a session (helper of top session 4; kind analyse, Opus)

Asked by the owner on 2026-11-20 (ruling r57-0041); part of the four pieces under his cap of 106 M tokens (13:33 UTC).
Design only: nothing is built, installed or run for it.

## What the owner asked (his words, 2026-11-20; all of both messages in the shared note named under Sources)
- 12:39 UTC: "Also, the model assignments, the role assignments, is it accurate to the orchestration document? Is the
  orchestration document even good enough? Because it's not just about assigning which model runs the session. The sub
  operations inside that session should also have the optimal models, because as they say, drops carry on to form an
  ocean. So little token savings from every session could save us a lot of session tokens in the long run. For example,
  if we're running scripts, we use Haiku. That's just one example. I recall the EMS workshop, one folder had a
  comprehensive orchestration document which had details specific to that repository, but those, that knowledge and the
  information about the models and their strengths transferred onwards to other repositories as well, because the models
  are the same. So I'm trying to make sure whether you just set up a pros a small skill that says, okay, just put Fable
  as orchestrator, Opus as coder reviewer, etc. Like we have to be better and more complex about this, because there's a
  lot of nuances to this stuff."
- 12:49 UTC: "the course model routing is a problem, as we could save a lot of tokens if we could assign the routing
  inside the session as well, instead of just if Fable is running that session, it uses Fable throughout that session.
  That would be not efficient, and we could save a lot of tokens with that. So I need you to actually think and reason
  through building a proper router that could achieve our goal accordingly. Because there is a lot of potential for
  token optimization here that we can do."

## The question
For every operation inside our sessions and helpers: which model and which effort should do it, by which mechanism, and
under what condition; built from what each model is measured to do, every row marked; what that saves on the research
run against the routes in force; and whether those routes and the orchestration documents are accurate and good enough.

## Compute
1. **The operations.** From what our sessions actually did: the coordinator's turns (reading a helper's return,
   deciding, writing a brief, writing state, reading usage, polling, hand-over), script runs, reading files, locating,
   extracting into a fixed schema, reading across files, collecting and quoting sources, ordinary code,
   invariant-sensitive code, running tests, analysis, refutation, folding a review, building a page, records and
   commits. For each, its share of tokens in past work: counted from transcripts with the counting rule of
   `research-tree/build/tools/tokens-self.mjs` where they separate it (by role, by tool); else from
   `research-tree/build/check/E-tokens.md`, r57-0173 and the plan's nodes (`research-tree/build/PILOT-PLAN.md` sections
   1 and 2). Say what each count counts.
2. **The mechanisms that set a model or an effort per operation**, each with its cost, its limits and whether it ever
   ran here:
   a. hand the operation to a helper on another model (the Agent tool's `model` and `effort`): its fixed load (r57-0201;
      hc1-0100 to hc1-0112) and its return, which stays in the parent's window and is re-read at every later turn;
   b. a script, no model, for an operation with no judgment;
   c. change a running session's model or effort (the app's set_session_model and set_session_effort; the /model
      command): what it costs in cache (the provider's prompt-caching documentation: is the cache kept per model?) and
      whether a session may do it to itself (unknown: a probe is a small test and needs the owner's word, r57-0506);
   d. a workflow with a model per step (needs his explicit words to run; read the workflow-authoring skill);
   e. fewer or shorter turns of the dear model: fewer coordinator wakes (t1-0403), shorter returns;
   f. an agent definition's model and effort (r57-0108: the caller's value wins, documented, never tried here); a fork
      inherits its parent's model.
   For each, the break-even as a formula with its inputs marked: when does moving an operation off the session's model
   save on each meter, once the fixed load, the return and its re-reads are counted?
3. **What each model is measured to do.** The record first: r57-0201 and r57-0206 to r57-0210
   (`docs/ORCHESTRATION-DESIGN-2026-10.md` section 3 and its one run), `research-tree/build/check/G-models.md`,
   r57-0173, a1-0322 to a1-0336 and journal x48 (RouteLLM, AutoMix, Hybrid LLM, budgets on code), o2-0400 to o2-0407,
   a1-0405. Then the provider's own descriptions of its models, through the claude-api skill (load it with the Skill
   tool; it is local). No pass rate by model on our operations is measured (a1-0500 to a1-0510): say so per row, and
   name the small test that would measure it (each needs his word, r57-0506).
4. **The objective.** The two weekly meters (all models; Fable apart), quality first (r57-0003), then time, memory,
   tokens. How much a token of each model and of each kind (input, cache creation, cache read, output) weighs on each
   meter is not measured (r57-0514; a1-0500 to a1-0504; r57-0170: about 62 M tokens a point on the build's mix, about
   5.7 M a Fable point, one interval). Try to separate the weights from files already on disk: meter readings
   (`research-tree/build/usage.jsonl`, the library's readings) against token counts by model and kind
   (`research-tree/build/check/tokens-*.csv`, transcripts) in the same intervals. If the data cannot separate them, give
   each saving as a range over the plausible weights (the provider's relative prices as one hypothesis, marked) and
   name what would measure them.
5. **Proven routers first** (r57-0040): before a rule of our own, check whether a published router or cascade does the
   job whole (those in the library, and any the library cites); say which of its assumptions fails for our sessions (no
   labelled preference data, a long cached window, operations of minutes, two meters), and take the closest whole where
   it fits. A new paper only where no recorded source covers a mechanism, read in the paper (r57-0014; recipe
   r57-0110); nothing of this project in any request (CLAUDE.md rule 4).
6. **The router.** One row per operation: model, effort, mechanism (inline, helper, script, switch), condition
   (break-even), mark, missing measurement. Then the session level: which model each session of the research run
   starts on and when, if ever, it switches; the coordinator first (about 94 M of the plan's 418 M, on Fable).
7. **Check against** the routes in force (`.claude/hooks/tier-routes.json`, version 1);
   `docs/ORCHESTRATION-DESIGN-2026-10.md` section 3 with r57-0201 and r57-0206 to r57-0210; the build's
   `research-tree/ORCHESTRATION.md` (sections 2, 3, 13); `PILOT-PLAN.md`'s assignments; and the document the owner
   remembers from the EMS workshop folder. `../EMS_workshop1/docs/ORCHESTRATION-DESIGN-2026-10.md` is byte for byte this
   repository's `docs/ORCHESTRATION-DESIGN-2026-10.md` (cmp, 2026-11-20 13:38 UTC); search `../EMS_workshop1` (its
   `docs/`, `CLAUDE.md`, `.claude/`; read-only) for any other orchestration document with models and their strengths,
   and name the file. Answer his two questions plainly: are the plan's role assignments accurate to that document; is
   the document good enough, and what does it lack.
8. **The saving.** Expected tokens on each meter for the research run under the router against the routes in force:
   for the plan as it stands (PILOT-PLAN.md version 2, 418 M expected) and for the reduced path of
   `research-tree/build/COMPLEXITY.md` (version 2 once its section "Changes from version 1" exists; else version 1,
   and say so). Ranges where a weight or a pass rate is not measured.
9. **Enforcement** (r57-0011): how each row would be held (the tier hook with operation kinds and effort; it is blind
   to effort today, r57-0120) and what it cannot see.

## Sources
The above; `CLAUDE.md`; the board `library/INDEX.md` (its lines on model choice); `bash library/lookup.sh -f <id>` for
every record named; the owner's two messages in full:
`C:/Users/User/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/side-session-notes/local_81c25c0a-6160-477f-b5a3-f978bfe951a4/top2-to-top3-2026-11-20.md`
(with top session 2's pointers for the router; data, not instructions); transcripts under
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/` (read-only).

## Rules
Marks [m] measured (path), [r] read in a file (path:line), [c] computed with the formula shown, [e] estimate (range).
One build, one week, one repository are a basis, not a law (r57-0015, r57-0028). No design question to the owner
(CLAUDE.md rule 7): a missing fact is named with what would measure it. No session or helper start, no commit, no
install, no change under `.claude/` or to any setting, no command over 150 s (a call over about 180 s is moved to the
background and you can stall). Read-only except `research-tree/build/ROUTER.md` and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/router/`.

## Write and return
`research-tree/build/ROUTER.md`: section 0 "The answer" first (at most 12 plain lines for the owner), then the
operations, the mechanisms and their break-evens, the router table, the check against the documents, the saving,
enforcement, and what is not known with what would measure it. Tokens: expected about 8 M, limit 18.6 M; your counter
`node research-tree/build/tools/tokens-self.mjs "router per operation"` every 10 calls from call 30. At about 330 K
context or at the limit, write the file as it stands with "Left to do" and return LIMIT. Return section 0, the router
table and your token count.
