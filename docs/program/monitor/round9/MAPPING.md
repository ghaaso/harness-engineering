# Round 9: which familiar picture carries the session tool

Written 2026-11-24 by the designer. The stranger test is the one of `NEXT-ROUND-8.md` section 3. The verdicts below are
my own reading of the pictures and of the round 8 record; no person was tested.

## The five domains he named

| Domain | The picture people know | What it would show here | The assumption that fails for LLM sessions | Stranger test |
|---|---|---|---|---|
| Distributed systems | Tracing waterfall (one bar per call on a clock); service map; a middleware or interceptor layer that every request crosses | Waterfall: a bar per session and helper. Map: sessions and parts as nodes. Interceptor layer: the hooks, each letting a call through, refusing it or failing | A trace is one request that ends in seconds, one row per call. A session runs for hours, waits for a person, and a day has 248 helpers: the waterfall becomes the lanes and ticks he rejected. A service map assumes parts that stay and steady traffic; sessions come and go | Waterfall fails (round 8 History). Map says what runs, not when. **The interceptor layer passes: taken for the hooks** |
| Parallel computing | Process tree (who forked whom); fork and join; process states (running, blocked, ended) | You as the root, sessions as processes, helpers as a worker pool; colour for state | A child is assumed to end before its parent and join back. Here a child session outlives its parent and takes the work over (T7, T9, T9B, BR1, BR2), and "blocked" means waiting for the owner, not for a device | Passes for what runs, what waits, who started whom. **Taken as the backbone** |
| Databases | Query plan tree (operators down to the tables); wait-for graph; write-ahead log | Plan tree: a session, its helpers, the parts they read and write, a store drawn as a cylinder. Wait-for: an edge from the waiting session to him | A plan is fixed before it runs and each operator runs once; a session's work changes as it goes. A wait-for graph looks for cycles between transactions; here every wait ends at one node, the owner. A log is a list to read | The lower half of the plan tree passes: **taken for helpers and parts**; **the wait-for edge taken** for "waits for you". The log fails |
| Neural networks | Layer diagram: rows of nodes, lit when active, lines only between neighbouring layers; the same network unrolled over time | Layers: you, sessions, hooks, helpers, parts; lit means at work | Fixed nodes, every node wired to the whole next layer, one forward pass. Here nodes appear and end, sessions start sessions inside one layer, and full wiring is the mesh of lines | The layers pass (one reading direction, one layer added at a time): **taken**. The dense wiring fails: dropped |
| Agentic AI | Orchestrator and workers with guardrails and tools, a human in the loop | You, sessions as orchestrators, helpers as workers, hooks as guardrails, parts as tools | One orchestrator and one run. He has several top sessions at once, each handing over to a successor, over a whole day | Passes; the closest to his own words. It is the same shape as the process tree on layers |

## The base picture chosen

**A process tree standing on a layer diagram, read top to bottom.**

- **You** at the root; the **sessions** as a process tree under you (a line means "started"); a session that waits for
  you sends a dashed blue line back to you (the wait-for edge).
- The **hooks** as one interceptor layer under the sessions, grouped by what each one checks, each with the sessions it
  let through, refused or failed on.
- One session opened: its **helpers** as a worker pool under the hooks (kind and model, finished and running), and the
  **parts** they touch as resources at the bottom.
- **History** is the same tree with a clock in the margin, as in a commit log graph: start order runs downward, sessions
  that have ended stay as grey pills, a quiet stretch is folded into one band that carries its length (time compression
  in trace viewers, `round8/research/d2` finding 7), and a hook that failed earlier stays as a red mark on its session.

Why this one:
1. It is the only candidate where every layer is the same picture with more added: hooks, helpers and parts go below
   the tree, history goes into the tree's own margin, and nothing that was drawn moves.
2. One reading direction answers all four questions of the stranger test: down the page is earlier to later, starter to
   started, session to hook to helper to part.
3. No mesh: a hook carries the tags of its sessions (occupancy, `d1` finding 1); lines are drawn only for a failure and
   for the opened session (select to isolate, `d1` findings 5 and 12).

Not chosen: lanes on a clock (what he rejected), tokens in a process-state diagram (loses who started whom), a grid of
sessions against hooks (the table of the first monitor).
