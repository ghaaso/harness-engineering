# Departures of unit PA (FX-PILOT unit 1, models of children and helpers)

1. **The guard hook also checks a session start's route** (`guard-hook.mjs` startRouteProblem, deny `bad-route`),
   though the design names only the tier hook. Why: the two PreToolUse hooks run side by side, and the guard hook
   strict-creates `start.json` on the start; a start the tier hook refuses (no model, wrong kind) would otherwise
   leave a `start.json`, so the attempt would wait out the lease and be fenced `crash`. The guard now refuses the same
   start before it writes, and also binds the start to the row's own tier (a cheaper or pricier model, or another
   kind, is refused). Without a readable `tcb/tier-routes.json` it checks nothing (the tier hook then refuses every
   start). Test: `guard-hook.test.mjs` PA-3.
2. **One table, with helper types added**: `tcb/tier-routes.json` is `.claude/hooks/tier-routes.json` plus `agents`
   (reader collect, checker read, scorer read, from PILOT-PLAN s1 rows 14, 20, 21) and `agents_source`; the tier hook
   ignores both keys. `tcb/tier-hook.mjs` is a byte copy of the repository's hook.
3. **A row's `tier` names a kind** of that table (orchestrate, analyse, refute, test, ...), not a model; its model is
   the kind's first model. A tier that is no kind gives `route` null in status and `bad-route` at the start.
4. **"Through the status next act"** is a `route` {kind, model} beside `next` on each status row, and a top-level
   `helper_routes` for the coordinator's Agent starts (checker, scorer), not words inside the act string (the act
   string feeds the watcher and the planner's tests unchanged). Both optional in `status.schema.json`. Test:
   `status.test.mjs` PA-1.
5. **The manifest's `agents` entries** carry optional `kind` and `model` (`manifest.schema.json`); absent when the
   table has no route for the type. Test: `replace.test.mjs` PA-2.
6. The tier hook in a run root logs to `<root>/logs/tier-hook.jsonl` (its own path rule: `../logs` beside `tcb/`).
7. Not enforced by code: that an Agent start names the right kind for its helper type (the tier hook checks only the
   model against the kind named); the briefs and status/manifest give the right one.
