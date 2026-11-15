# Virtual-context and Rolling Context: request-history audit

Audited 2026-10-09 by reading primary repository source, documentation and the published source distribution. No candidate was installed, no Claude/UltraCode settings were changed, and no provider calls or product trials were run. This note concerns automated request-history retention and useful context, not corpus mapping.

## Strongest complete-system candidate: virtual-context

**virtual-context is a shipped proxy that combines durable originals, hierarchical memory, automatic retrieval and model-driven rehydration.** It is substantially closer to the requested “use the useful information from an 800k session in a smaller model request” system than a tool-output filter or a single rolling summary. It accepts Anthropic Messages, OpenAI Responses/Chat Completions and Gemini request formats. Claude Code integration is an `ANTHROPIC_BASE_URL` change; an existing Anthropic-format provider can remain the upstream.

Source pins:

- Repository: [virtual-context/virtual-context](https://github.com/virtual-context/virtual-context), audited commit [`0078ad294762f7c0f65d150d41ea0a7e38a46751`](https://github.com/virtual-context/virtual-context/tree/0078ad294762f7c0f65d150d41ea0a7e38a46751).
- Published package: [virtual-context 0.6](https://pypi.org/project/virtual-context/0.6/), uploaded 2026-09-26. Source distribution SHA-256: `ec7feed8161c3bec88a8202e2210c0ee7a31534b72e75be9412f9fe00a55e4d9`. The distribution was fetched and inspected in memory, without extraction or installation.
- GitHub and PyPI bytes are different: the audited GitHub `pyproject.toml` says `0.3.7`, while the distribution says `0.6`. The admission guards, configurable limits, canonical/structured-summary modules, chain restoration and recommended preset discussed below were separately confirmed in the 0.6 distribution. Do not assume every current-main enhancement is in 0.6.

### What is implemented

The canonical record keeps original conversation turns; summaries and extracted facts are derived views. Older material is organized into segment and topic summaries. Each request retrieves relevant topics and facts using tag overlap, BM25 and embedding similarity, then assembles them with recent verbatim turns and a topic index. The model can open deeper material using `vc_expand_topic`, search original quotations with `vc_find_quote`, request broad/time-scoped recall, and restore stored tool output or tool chains with `vc_restore_tool`. These memory tools run in the proxy's continuation loop; they do not require a human to perform each handoff. SQLite is the local default; PostgreSQL is supported.

[Engine documentation](https://github.com/virtual-context/virtual-context/blob/0078ad294762f7c0f65d150d41ea0a7e38a46751/docs/engine.md) describes SUMMARY/SEGMENTS/FULL depths, source-bound structured claims and full canonical reconstruction. Code mode preserves conclusions, configuration, decisions and concrete file/symbol references while excluding investigatory actions from extracted facts. [Message rewriting source](https://github.com/virtual-context/virtual-context/blob/0078ad294762f7c0f65d150d41ea0a7e38a46751/virtual_context/proxy/message_filter.py) implements tool-output storage/restorable stubs and chain collapse.

This is **recoverable storage**, not a proof that the smaller resident prompt is semantically lossless. Summaries or facts can be wrong, automatic retrieval can miss a topic, and the model can fail to request a needed original. Retaining originals gives the system a recovery path; it does not make every omission irrelevant. Media recompression also prevents treating all proxy transformations as byte-exact preservation.

### Quality evidence and its limits

The maintainer reports 95/100 correct versus 33/100 for full raw history on a 100-question LongMemEval-500 subset, with mean tokens of 52,347 versus 117,582. The reported reader was Sonnet 4.5, ingestion used MiMo-V2-Flash, and judging used Gemini 3 Pro Preview. This is factual recall across chat sessions, using the engine directly, not an 800k-token coding-session trial through the Claude Code proxy. [Published benchmark description](https://github.com/virtual-context/virtual-context/blob/0078ad294762f7c0f65d150d41ea0a7e38a46751/docs/benchmarks.md).

Crucially, the repository's [claim record](https://github.com/virtual-context/virtual-context/blob/0078ad294762f7c0f65d150d41ea0a7e38a46751/benchmarks/longmemeval/claims.yaml) explicitly says `claims_without_original_run_manifest`; engine revision, dataset hash, memory-cache manifest and original machine-readable results are null. It states that the original run artifacts were unavailable. The headline is a maintainer-reported result, not independently verified or fully reproducible evidence for this configuration. AMB/MRCR harness descriptions and implementation tests are not published proof of equivalent coding quality. Some reported VC question token totals exceed the raw baseline because additional retrieval/tool rounds accumulate input usage.

### Automation, latency and authentication

- Inbound tagging normally uses a local embedding model. Completed-turn LLM tagging and ordinary compaction run in the background.
- The recommended preset enables fact curation. [Retrieval assembly](https://github.com/virtual-context/virtual-context/blob/0078ad294762f7c0f65d150d41ea0a7e38a46751/virtual_context/core/retrieval_assembler.py) calls a curation LLM synchronously on new question/candidate combinations; exact repeats are memoized. This adds request latency and another model call. Disabling it is a latency/quality tradeoff, not a free improvement.
- At hard compaction pressure, [the server](https://github.com/virtual-context/virtual-context/blob/0078ad294762f7c0f65d150d41ea0a7e38a46751/virtual_context/proxy/server.py) can wait for prior compaction. Quote/expand/restore requests can add provider continuation rounds. No verified zero-latency or per-turn coding latency result was found.
- An existing large session requires initial indexing/compaction. Historical ingestion is automatic/background, but full retrieval is not available immediately during that warmup. Starting the session through the proxy builds memory progressively.
- Upstream request headers are forwarded after hop-by-hop filtering, supporting the intended existing-provider chain. This source audit does not establish UltraCode's actual endpoint/authentication compatibility. The tagging/summarization provider also needs its own working configuration: the hosted recommended preset uses an OpenRouter key, while recommended-local uses a local OpenAI-compatible model server. Do not claim it automatically reuses a Claude subscription for memory-model calls.
- **Released 0.6 needs an Opus 5.x paging override.** Its default `paging.autonomous_models` contains Opus 4 prefixes, not Opus 5. Unmatched models receive supervised automatic paging, without the same model-directed expansion surface. Set the prefix to match the actual request's `model` string. Current main has added Opus 5 prefixes.

### Concrete proposed 300–400k composition

Use virtual-context 0.6 with SQLite, a configured memory-model provider, enabled paging and tool-output restoration, between Claude Code and the existing Anthropic-format upstream. The normal setup is `virtual-context init recommended` or `recommended-local`, followed by a configured proxy launch and the Claude Code base-URL change. Keep the database/storage path stable across restarts. This is a one-time setup; subsequent tagging, compression, retrieval and rehydration are automatic.

The following is a **proposed override to a generated working preset**, not a measured optimum or proof of 800k-quality equivalence:

```yaml
context_window: 350000

proxy:
  upstream_context_limit: 400000   # total allowance; output tokens are reserved
  passthrough_trim_ratio: 0.85

paging:
  enabled: true
  autonomous_models: ["claude-opus-5"]  # replace with actual upstream model prefix
  auto_promote: true
  auto_evict: true
  max_tool_loops: 10

compaction:
  soft_threshold: 0.70
  hard_threshold: 0.85
  protected_recent_turns: 12
  summary_ratio: 0.25
  max_summary_tokens: 8000
  code_mode: true
  defer_payload_mutation: true

assembly:
  tag_context_max_tokens: 90000
  facts_max_tokens: 30000
  context_hint_enabled: true

tool_output:
  enabled: true
```

This keeps more recent material and allows richer summaries than the shipped defaults. Actual requests can be much smaller than 350k; the setting is a working budget, not a target to pad. The memory model's competence remains material. The package implements full-payload reduction, passthrough trimming, output reservation and admission that returns HTTP 413 if protected input cannot fit, rather than forwarding irreducible overflow. Limits use local token estimates, not a provider-certified exact count. A 400k limit therefore does not by itself prove a specific measured request count.

## Simpler alternative: Claude Rolling Context

[NodeNestor/claude-rolling-context](https://github.com/NodeNestor/claude-rolling-context), audited commit [`b88087ca9b03375f30d485456187a170beeccaab`](https://github.com/NodeNestor/claude-rolling-context/tree/b88087ca9b03375f30d485456187a170beeccaab), is a shipped Claude Code plugin/proxy with Windows installation support. It uses an HTTPS proxy/local CA, preserves Claude's JSONL transcript, summarizes old messages asynchronously and leaves a recent suffix verbatim. Its trigger and suffix target are configurable. Native summarization clones the session request and uses the existing auth; separate Anthropic/OpenAI-compatible/local summarizers are also supported.

[Server source](https://github.com/NodeNestor/claude-rolling-context/blob/b88087ca9b03375f30d485456187a170beeccaab/proxy/server.py) checks response usage after forwarding, starts background compression, and injects a completed summary on later requests. Compression state is in memory; restarting loses it and requires recompression. Failed compression has a default 300-second cooldown. The summary merges prior summary plus newly older messages, so semantic loss can compound; preserving JSONL alone does not provide virtual-context's automatic topic/quote/tool rehydration system. No comparable coding quality benchmark was found.

Rolling Context is the lighter installation and better native-subscription integration claim. **Virtual-context is the stronger complete memory system for fidelity through recoverable originals and automatic retrieval.** Neither has established “every 800k coding session retains equivalent useful information at 300–400k with no degradation or latency”; this limit should accompany the concrete recommendation, rather than replace it with a qualification-only workflow.
