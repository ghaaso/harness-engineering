# recheck:M-01

lane=M-01 tool_status=ok checks=10

- M01-F01 ON_PAGE — https://arxiv.org/html/2501.13956v1
    quote: Zep implements a bi-temporal model, where timeline T represents the chronological ordering of events. Episodes serve as a non-lossy data store from which semantic entities and relations are extracted.
    note: T/T' fields, three tiers and non-lossy episodes all supported.
- M01-F02 PARTIAL — https://arxiv.org/html/2501.13956v1 ; edge_operations.py
    quote: edge.invalid_at = resolved_edge.valid_at ; edge.expired_at = edge.expired_at if edge.expired_at is not None else utc_now()
    note: Paper: LLM compares new edges with related edges, invalidates by setting t_invalid to the invalidating edge's t_valid; does not state expired_at=now (code does). Code supports timestamp comparison, valid_at None skipped, expired_at=now. Claim that the trigger is only new text, not dependency change, is an interpretation not stated on either page.
- M01-F06 PARTIAL — https://github.com/getzep/graphiti
    quote: By default, SEMAPHORE_LIMIT is set to 10 concurrent operations to help prevent 429 rate limit errors.
    note: Supported: OpenAI default, Anthropic/Gemini/Groq/OpenAI-compatible, structured output advice, PostHog opt-out env var, SEMAPHORE_LIMIT 10. Telemetry list is OS, Python, arch, Graphiti version, provider/DB types, random UUID; 'not data' holds. Fetch summary did not explicitly name PostHog; 'ingestion failures' wording and 'read Nov 2026' not confirmed.
- M01-F13 ON_PAGE — https://github.com/mem0ai/mem0/discussions/4787
    quote: Both are kept by design. Dedup is not cosine-threshold merging; only exact MD5 hash dedupe runs.
    note: Attributed to community commenters (barry166, yashwanth123), not maintainers; 10k+ claim unmeasured per another commenter. 'Stale-fact false-positive hazard' is the recorder's framing.
- M01-F14 UNREACHABLE — https://socket.dev/npm/package/jamgate/diff/0.11.2
    quote: 
    note: HTTP 403 Forbidden; mem0 issue #4573 was not opened by the recorder either.
- M01-F15 PARTIAL — https://docs.mem0.ai/open-source/overview ; telemetry.py
    quote: MEM0_TELEMETRY = os.environ.get("MEM0_TELEMETRY", "True") ... _DEFAULT_SAMPLE_RATE = 0.1
    note: Docs confirm Qdrant /tmp/qdrant, SQLite history, gpt-5-mini, text-embedding-3-small, Postgres+pgvector Docker stack with dashboard, per-user API keys, audit log, OpenAI/Anthropic/Gemini. Telemetry code confirms PostHog host, default ON, collection/vector_size/class paths, 0.1 sampling on hot-path OSS events, email as distinct ID for hosted client. Minor: sampling applies to OSS hot-path events only; hosted not sampled (consistent).
- M01-F18 ON_PAGE — https://www.letta.com/blog/context-repositories
    quote: By giving each subagent an isolated worktree, multiple subagents can process and write to memory concurrently, then merge their changes back through git-based conflict resolution.
    note: Date Feb 12 2026, commit messages, single-threaded before, sleep-time worktree auto-merge, 15-25 files, no benchmarks all confirmed. YAML frontmatter confirmed as 'frontmatter'. 'Closest prior art' is evaluation, not checked.
- M01-F24 ON_PAGE — https://arxiv.org/abs/2509.25140
    quote: distills generalizable reasoning strategies from an agent's self-judged successful and failed experiences
    note: Abstract supports retrieval, write-back, MaTTS contrastive signals, outperforming raw-trajectory and success-only memories on web browsing and SWE benchmarks. Page does not state Google affiliation (code at google-research repo); ICLR 2026 acceptance noted.
- M01-F25 PARTIAL — arxiv 2402.17753; 2410.10813; dev.to Penfield; getzep blog; arxiv 2507.05257
    quote: identified 99 score-corrupting errors in 1,540 questions (6.4%) ; The judge accepted 62.81% of them ; Zep's corrected result is 75.14% +/- 0.17
    note: LoCoMo (300 turns, up to 35 sessions), LongMemEval (500 questions, five abilities), Penfield figures and 'context window test, not a memory test', Zep correction, MemoryAgentBench four competencies all supported. Failing part: the claim that Mem0 'publicly disputed' Zep's numbers was not checked on these pages, and Zep says Mem0's implementation was flawed (misconfiguration). 'No code/defect content' and 'none measures stale-memory false positives' are negative claims not verifiable from these pages.
- M01-F26 ON_PAGE — https://arxiv.org/html/2503.03704v2 ; https://arxiv.org/pdf/2512.16962.pdf ; https://arxiv.org/html/2601.05504v1
    quote: MINJA achieves a high average success rate of 98.2% ... over 95% ISR ; implanting malicious successful experiences ... persistent behavioral drift across sessions ; prove largely ineffective against MINJA
    note: MemoryGraft PDF unreadable via fetch; confirmed via arxiv.org/abs/2512.16962 abstract. 2601.05504 attributes the ineffectiveness view to Dong et al. (2025), citing it rather than its own experiments.
