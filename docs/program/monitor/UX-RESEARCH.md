# What makes a monitor readable at a glance (research for round 4, 2026-11-24)

Three Sonnet helpers (kind `collect`), one question each: agent trace viewers, pipeline and workflow views, control-room
practice. **How solid:** their fetch tool returns a small model's summary of a page, not the page, and none of them saw a
screenshot. Each line below says what was read. "Snippet" means a search snippet only. Nothing here was measured on our
data. Cost: about 75 K tokens across the three helpers.

## Patterns, their sources, and what they mean for our data

| # | Pattern | Source (what was read) | What it means for the monitor |
|---|---|---|---|
| 1 | **Grey for normal, colour only for abnormal** | High-performance HMI / ISA-101: blog.isa.org/the-high-performance-hmi, control.com "Going gray" (snippets only). Datadog service map: node border turns red or yellow from health, healthy nodes stay neutral (docs.datadoghq.com/tracing/services/services_map, summary) | A used part and a quiet session are grey. Colour is kept for live work (blue), for something waiting on him (amber) and for something broken (red). Round 3 drew every used part in green, so the healthy parts were the loudest thing on the screen. |
| 2 | **Overview first, detail one level down** | ISA-101's four display levels (automation.com, snippet; the page itself refused the fetch). Datadog trace view: collapse and expand per row, "focus" on one span (docs.datadoghq.com/tracing/trace_explorer/trace_view, summary) | The harness view's first level is the 19 pipelines, each with its steps and one status line. The parts (chips) move to a second level that opens when a pipeline is clicked. Nothing is dropped: it is folded. |
| 3 | **Select to isolate** | Datadog service map: pointing at a service highlights it; clicking it isolates the service with what feeds it and what it feeds (services_map page, quoted) | Clicking a pipeline lights it and the pipelines joined to it and fades the rest; clicking a session lights its path through the harness. |
| 4 | **Fold many into one, with a count** | Langfuse agent graph, "aggregated" mode: repeated steps become one node with a count such as "retrieve_docs (3/3)" (langfuse.com/docs/observability/features/agent-graphs, summary). Datadog preview mode: "+N" pills for hidden groups. Langfuse: "N hidden observations" (log-levels page, summary) | A session's 300 helpers become "301 helpers · 4 running" on its card, not a row of squares. Notes on several sessions become one line per kind of note, with a count. |
| 5 | **A separate needs-attention list** | Temporal web UI: a saved "Task Failures" view of running work that has failed tasks, apart from the full list (docs.temporal.io/web-ui, summary). Google SRE book: "a dashboard that monitors all ongoing subcritical problems" rather than alerts (sre.google/sre-book/monitoring-distributed-systems, read) | The right column opens with "Needs you" (sessions that asked him something), then "Problems", grouped by kind, and only then where the work is heading. |
| 6 | **Few alarm levels, each one actionable** | SRE book: every page "should be actionable" (read). EEMUA 191 priority split of about 80/15/5 % (secondary paper arxiv.org/pdf/2110.04880, standard not opened) | Two levels only. Problems (red) get a badge on the card. Notes, such as a hook refusing a call, are listed but put no badge on the map: a refused call means the hook did its job. |
| 7 | **An overview strip with a movable window** | Datadog flame-graph minimap; Jaeger's timeline minimap (both summaries) | Round 2's strip of every session with a draggable frame is this pattern. It stays as it is. |
| 8 | **The structure stays put, the state changes** | Airflow graph view: the same graph, with a run picker that changes only the states (airflow.apache.org/docs/apache-airflow/stable/ui.html, summary) | The pipelines stay in the owner's positions whatever stretch is shown; the time view keeps one layout across the colour choices (as in round 2). |
| 9 | **Cost rolled up to the parent** | Braintrust: child cost rolls into the parent trace, and the timeline is scaled by tokens (braintrust.dev/docs/observe/examine-traces, search summary only) | "Colour by tokens" already adds a session and its helpers together. This round keeps it. |
| 10 | **Grid of runs by stage** | Airflow grid view: a row per task, a column per run (ui.html, summary) | Fits "which part is bypassed again and again" (parts as rows, stretches of time as columns). Not built this round: it is a new feature, and the features are on hold. |
| 11 | **Changes marked on the timeline** | Grafana annotations: vertical lines and icons on the graph, with text on hover (grafana.com docs, read) | Fits feature 6 of `NEXT-ROUND.md` (change markers). On hold with the other features. |

## Not found
- Type size and contrast for a viewing distance; motion or fading highlights for change; semantic zoom. No source was
  read for any of these. Choices made here without a source: body text 15 px, nothing below 12.5 px, and motion only for
  what is live (a pulsing dot on working sessions and on pipelines a working session has used).
- The pages for Tufte, the ASM consortium, LangSmith's trace view, W&B Weave, AgentOps, Argo, Prefect and Honeycomb were not read.

## What round 3 broke, by these patterns
The harness view put every part on screen as a coloured chip at 12 px (against 2 and 4). Healthy parts were the
loudest colour (against 1). Nothing on the map told you where to look first, and the problems sat in a list on the side
(against 5). The time view (round 2) mostly follows these patterns already. Its weak points were a badge on every card
with a note (against 6), squares for each helper (against 4), and five "colour by" buttons competing with the verdict for
attention.
