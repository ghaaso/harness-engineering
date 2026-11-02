# lane:E-07

lane=E-07 tool_status=ok facts=30 candidates=15

## Summary
Recommendation: embeddings LATER, behind a measured trigger; not now, not never. At tens-to-hundreds of entries the whole one-line-per-entry index (~8k tokens for 200 entries, inferred) fits in a single cheap-agent prompt, so lexical retrieval (BM25 + trigram over several handle types) producing a 10-20 shortlist, then an LLM re-rank by the calling agent itself (~3-4k tokens per lookup, inferred), needs no embedding model and no vector engine. Evidence: BEIR calls BM25 a robust baseline with re-ranking best zero-shot; dense retrievers fail on rare entities (error codes, symbols, paths are exactly that); no method dominates MTEB; small-corpus hybrid evidence is thin and mixed. Embedding costs are real: model/revision drift forces re-embedding and a model stamp per vector; the vector engine adds ops for one developer. Every vector engine in the lane can run with no egress if telemetry is switched off (Qdrant, Weaviate have documented switches; Chroma documents one and says it removed telemetry; Milvus server switch not found), but none is justified at this scale. If the trigger fires (measured lexical+LLM-rerank misses on queries whose entry exists, or corpus past roughly 1,000 entries), add a dense channel inside the same store engine: sqlite-vec or pgvector, with a pinned int8 bge-small-en-v1.5 via fastembed (Python) or transformers.js (Node), fused by RRF. Prefer write-time handle expansion (doc2query-style, by the writing agent) first; it captures most of the vocabulary-mismatch benefit for free.

## Candidates
- **BM25 + trigram shortlist, then agent-LLM re-rank (no embeddings)** [pattern] strong — Fits the workload: corpus (~100k tokens at most) is far below any scale where dense retrieval is needed; lexical first stage handles rare identifiers (F03); the calling agent's own LLM re-ranks 10-20 entries for ~2-5k tokens (F29, F06); precision-tuned with the verification gate downstream. Zero extra services or models.
    egress: none; runs wherever the lexical engine runs | ops: none | win: No extra dependency beyond the lexical engine chosen in other lanes | linux: Identical on Linux; no dependency | access: CLI or MCP of the store itself; reranking is the calling agent's own turn | footprint: none beyond lexical index | maturity: BM25/rerank are decades-old, well evidenced; small-corpus numbers specifically are not published (inferred) | facts: F01, F03, F05, F06, F29
- **Whole-index-in-prompt (one line per entry, agent selects)** [pattern] strong — At <=200 entries the index is ~8k tokens; Anthropic's own guidance says skip RAG below 200k tokens (F05). A good fallback and a way to catch lexical misses; degrades as entries grow past a few hundred.
    egress: none | ops: none | win: n/a | linux: n/a (prompt pattern) | access: a 'list index' CLI/MCP call | footprint: none | maturity: vendor-recommended | facts: F05, F29
- **Write-time handle expansion (doc2query-style, by the writing agent)** [technique] strong — Moves vocabulary-mismatch handling to write time, when the expensive tier already understands the defect: several paraphrased symptoms, error templates, alternative terms. Delivers much of what dense retrieval buys, with auditable text (F07). Matches the 'several handle types' framing.
    egress: none | ops: low | win: n/a | linux: n/a (data-model technique) | access: part of the write schema | footprint: a few extra text fields per entry | maturity: paper-established (doc2query); here done by an LLM instead of a seq2seq model (inferred) | facts: F07, F03
- **Hybrid RRF fusion of lexical and dense** [technique] viable — Standard and well supported in Qdrant/Weaviate/Milvus/pgvector, and Anthropic reports gains from embeddings+BM25+rerank at scale (F05); but small-corpus evidence is thin and mixed (F08). Adopt only after a measured lexical miss rate justifies it.
    egress: none if the embedder is local | ops: medium | win: depends on embedder and vector engine | linux: good | access: behind the same store interface | footprint: adds an embedding model + vector index | maturity: mature at scale | facts: F05, F08, F18
- **sqlite-vec (vec0) inside the store's SQLite file** [engine] viable — Best fit IF a dense channel is ever added: one file, no daemon, npm package for Node, Windows supported, int8 vectors, exact KNN trivially fast at hundreds of rows. Caveat: pre-v1, breaking changes expected, so pin the version and keep vectors rebuildable from text.
    egress: none (in-process C extension) | ops: low | win: good (Windows listed, npm package) | linux: good (runs anywhere SQLite runs) | access: via the store's CLI/MCP; no separate MCP needed | footprint: tiny, no deps | maturity: pre-v1, Mozilla Builders-backed, 8.2k stars | facts: F19
- **pgvector (+ Postgres full-text) on a self-hosted Postgres** [engine] viable — Good if the store engine ends up being self-hosted Postgres: exact search by default, FTS + RRF hybrid documented. On the Windows dev box it needs an MSVC build or a container; the hosted Supabase DB must not hold this data (egress).
    egress: none if self-hosted; disqualified on hosted Supabase for defect data | ops: medium | win: awkward (build with Visual Studio or use a container) | linux: excellent | access: through the store's own CLI/MCP | footprint: a Postgres extension; a Postgres instance if none exists | maturity: mature, v0.8.7 | facts: F18
- **Qdrant (server in Docker, or Python local mode)** [engine] weak — Capable (sparse+dense, RRF, official MCP with FastEmbed) and the telemetry switch is documented (F11), but a vector server is an extra service to run for tens-to-hundreds of rows; local mode is dev-oriented per its own docs; the MCP stores free text with no provenance/validity model.
    egress: none once QDRANT__TELEMETRY_DISABLED=true / --disable-telemetry; verify with network-deny | ops: medium | win: Docker Desktop fine; Python local mode Windows not stated | linux: good | access: official mcp-server-qdrant (qdrant-store/qdrant-find) | footprint: one Rust container; designed for orders of magnitude more vectors | maturity: mature, Apache-2.0 | facts: F11, F16
- **Chroma (persistent client / chroma-mcp)** [engine] weak — Easy to start (persistent file client, chroma-mcp via uvx), but a Python dependency tree and embedding-function coupling for no workload need; telemetry status is contradictory across sources (F10), so verify rather than trust. Default embedding function details not confirmed on pages read.
    egress: set ANONYMIZED_TELEMETRY=False and anonymized_telemetry=False defensively; docs now claim none collected since 1.5.4/1.5.6; external embedding functions would egress | ops: medium | win: Python needed (not on PATH; a 3.12 interpreter exists) | linux: good | access: chroma-mcp, 12 tools | footprint: Python package plus embedding model | maturity: popular, v1.5.9 May 2026 | facts: F10, F17
- **Weaviate** [engine] rejected — A Go server with Docker/K8s deployment and no embedded mode, built for large multi-tenant corpora; telemetry is on by default (daily payload, F12). Heaviest ops for the smallest benefit here. Cite BM25+vector hybrid design only.
    egress: DISABLE_TELEMETRY=true required; vectorizer modules default to remote APIs (egress) unless a local module is used | ops: high | win: Docker Desktop only | linux: good | access: no first-party MCP confirmed in this lane | footprint: server container plus optional vectorizer containers | maturity: mature | facts: F12, F21
- **Milvus Standalone / Milvus Lite** [engine] rejected — Standalone is built for millions-to-billions of vectors (embedded etcd, WAL, optional MinIO) and no telemetry opt-out was documented (F13); Lite is Python-only, small-scale, Windows support version-dependent (F14). MCP server needs caller-supplied vectors (F15).
    egress: unverified; no documented opt-out found | ops: high | win: Lite possible on Windows per docs; Standalone via Docker Desktop | linux: Standalone good, overkill | access: zilliztech/mcp-server-milvus | footprint: largest of the group | maturity: mature at scale | facts: F13, F14, F15
- **LanceDB (embedded)** [engine] weak — Embedded with a Node SDK and FTS, but adds a Lance format dependency and an unverified Windows/telemetry posture on the pages read, while sqlite-vec or pgvector can piggyback on the store engine already needed.
    egress: unverified (README silent) | ops: low | win: not stated on README | linux: good | access: none confirmed in this lane | footprint: in-process library plus columnar files | maturity: active, Apache-2.0 | facts: F20
- **FastEmbed + bge-small-en-v1.5 (int8/ONNX), Python** [tool] viable — Smallest credible local embedder (~67 MB, 384 dims, no PyTorch) for a later dense channel. Python-only, so it means a Python runtime on the dev box (3.12 interpreter exists but is not on PATH).
    egress: one-time model download from a model host; then offline (set HF_HUB_OFFLINE=1 / pre-seed the cache); no defect data leaves | ops: medium | win: uncertain (Windows not stated); interpreter not on PATH | linux: good | access: library, wrapped by the store CLI | footprint: ~67 MB model + onnxruntime | maturity: Qdrant-maintained, widely used | facts: F22, F23, F25, F26
- **transformers.js (ONNX, Node) with bge-small / MiniLM** [tool] viable — Keeps the stack in Node 24 (no Python needed), has an explicit local-files-only mode (env.allowRemoteModels=false); the better embedder for this team if embeddings are ever turned on. First-load cold start and ONNX runtime native binaries on Windows are untested here.
    egress: one-time model fetch from the Hub; then fully local with allowRemoteModels=false | ops: low | win: likely good; not verified on the pages read | linux: good (Node, onnxruntime-node) | access: in-process in the store CLI/MCP | footprint: model 30-130 MB plus onnxruntime-node | maturity: Hugging Face-maintained, v4.x | facts: F24, F22, F25
- **Ollama embeddings (nomic-embed-text 274 MB)** [tool] weak — Works locally and offline-capable, but adds a resident Windows tray daemon and a 274 MB model purely for embeddings; an in-process library is lighter for one developer.
    egress: local inference; keep OLLAMA_NO_CLOUD=1 | ops: medium | win: good (desktop app, login item) | linux: good (systemd) | access: HTTP API | footprint: daemon + model | maturity: mature | facts: F22, F27
- **Static embeddings (Model2Vec) as a cheap middle path** [technique] cite_design_only — Static-lookup embeddings avoid transformer inference and are used with BM25+RRF in Semble, but evidence is a self-reported benchmark. Cite as a fallback shape; no verified numbers.
    egress: none once model files are local | ops: low | win: unknown | linux: unknown | access: n/a | footprint: small | maturity: early | facts: F30

## Design implications
- (strong) Do not put an embedding model or vector engine in the first implementation. Ship lexical retrieval (BM25 + trigram over several handle types, with canonicalised error templates) and let the calling agent's LLM re-rank a 10-20 entry shortlist; expected cost ~2-5k tokens per lookup. [F01, F03, F05, F06, F29]
- (strong) Invest in write-time handle expansion: the writing (top-tier) agent records multiple paraphrased symptoms, raw and templated error text, file/symbol names and synonyms per entry. This is the cheap substitute for dense recall and keeps retrieval auditable. [F07, F03]
- (moderate) Keep the retrieval interface engine-agnostic with an optional 'dense channel' slot, and have the store log every lookup (query, shortlist, chosen entry, outcome, and 'miss then entry existed') so the embedding trigger is measured, not guessed. Proposed trigger (inferred, owner to ratify): add dense when either (a) at least ~5% of lookups over a sliding window of ~50 are 'agent missed, entry existed' by lexical+rerank, or (b) the corpus passes roughly 1,000 entries, or the one-line index no longer fits comfortably (~30k tokens). [F05, F29, F08]
- (moderate) If the trigger fires, add the dense channel inside the existing store engine (sqlite-vec or pgvector) rather than a separate vector server, using a pinned int8 bge-small-en-v1.5 on a short symptom summary, fused by RRF; store model, revision and dimension on every vector, treat vectors as a rebuildable cache, and never mix stamps. [F19, F18, F22, F24, F28]
- (strong) A separate vector server (Qdrant/Chroma/Weaviate/Milvus) is designed for orders of magnitude more data than this store and adds a service, a telemetry switch and a client dependency; reject it for production. Cite Qdrant's RRF/sparse fusion and Weaviate's BM25+vector hybrid as design prior art only. [F11, F12, F13, F15, F16, F21]
- (moderate) Egress hygiene if any dense component is ever used: pre-seed model files, set HF_HUB_OFFLINE=1 and HF_HUB_DISABLE_TELEMETRY=1 (Python) or env.allowRemoteModels=false (transformers.js); for any vector server set its documented telemetry switch and confirm with a network-deny test, since Chroma's own sources conflict and no Milvus server switch was found. [F10, F11, F12, F13, F24, F25]
- (moderate) Embeddings do not remove the verification gate: a dense hit is a fuzzy match like any other and must still pass the discriminating check on current code; dense retrieval would only improve recall, which the owner has said matters less than precision. [F01, F03]
- (moderate) Do not install a separate MCP server for any vector engine; the store should expose its own CLI/MCP tools. The existing vector MCP servers (qdrant-store/qdrant-find, chroma-mcp, mcp-server-milvus) store free text with no provenance, validity or outcome model, so they are design references at most. [F15, F16, F17]

## Rejected paths
- Run Qdrant, Chroma, Weaviate or Milvus as the knowledge-store engine — Built for far larger workloads, add a service or Python dependency tree for one developer, need telemetry hardening (Milvus opt-out undocumented, Chroma sources conflict), and give no provenance, validity or outcome-history model; a few hundred rows do not need ANN indexes.
- Embeddings as the primary retrieval path now — Dense retrievers generalise worse than BM25 out of domain and on rare entities (identifiers dominate defect text); no small-corpus evidence shows a gain; costs include model pinning, drift stamps and a runtime (Python or ONNX) on the owner's box.
- Hosted embedding APIs (OpenAI, Cohere, Voyage, Jina) or Chroma Cloud/Zilliz Cloud — Disqualified: they send code or defect text to a third party. Cite only for their design.
- pgvector on the hosted Supabase production database — Would put defect data on a third-party host; the store must live on machines the owner controls (self-hosted Postgres if pgvector is wanted).
- Ollama as the embedding runtime — A resident Windows daemon and a 274 MB model purely to produce vectors the workload does not yet need; an in-process library is lighter.

## Facts
- F01 [LOAD-BEARING] (verified, paper; retrieval/engine) BEIR (18 datasets, ten systems): BM25 is a robust baseline; re-ranking and late-interaction models give the best average zero-shot results at high compute cost; dense and sparse retrievers are cheaper but often trail and generalise poorly out of domain. arXiv v4 revised 21 Oct 2021.
    https://arxiv.org/abs/2104.08663
- F02 (reported, blog; retrieval) BEIR finding (secondary summary): in-domain performance of a model does not correlate well with its zero-shot generalisation; Elastic's write-up notes dense models beat BM25 on MSMARCO (trained on it) but are usually worse out of domain.
    https://www.elastic.co/search-labs/blog/improving-information-retrieval-elastic-stack-benchmarking-passage-retrieval (via search summary)
- F03 [LOAD-BEARING] (reported, paper; retrieval/canonicalisation) Sciavolino et al. (EMNLP 2021, arXiv 2109.08535 v3 Feb 2022): on simple entity-centric questions dense retrievers drastically underperform sparse methods and only handle common entities; rare entities degrade quickly. Bridge to this store (inferred): error codes, symbol names, file paths and library versions are rare-entity tokens, so exact lexical match should carry the first stage.
    https://arxiv.org/abs/2109.08535 (read via search result summary)
- F04 (verified, paper; retrieval) MTEB: 8 task types, 58 datasets, 112 languages, 33 models; no particular text embedding method dominates across all tasks, so a small general-purpose model has no guaranteed quality on defect text.
    https://arxiv.org/abs/2210.07316
- F05 [LOAD-BEARING] (verified, primary_docs; retrieval/limits) Anthropic Contextual Retrieval (19 Sep 2024): top-20 retrieval failure 5.7% baseline embeddings; contextual embeddings 3.7% (-35%); contextual embeddings + contextual BM25 2.9% (-49%); plus reranking 1.9% (-67%). Also: if the knowledge base is under 200,000 tokens (~500 pages), put it all in the prompt and skip RAG. Measured on large corpora, not at 100-entry scale; the benefit comes from adding context and BM25 to embeddings, and from reranking.
    https://www.anthropic.com/news/contextual-retrieval
- F06 [LOAD-BEARING] (verified, paper; retrieval) RankGPT (Sun et al., EMNLP 2023; arXiv 2304.09542 v3 Dec 2024): properly instructed LLMs give competitive, sometimes superior, re-ranking results versus supervised rerankers on popular IR benchmarks. Supports using the agent's own LLM as the re-ranker.
    https://arxiv.org/abs/2304.09542
- F07 [LOAD-BEARING] (verified, paper; retrieval/data_model) doc2query (Nogueira et al., arXiv 1904.08375): appending predicted queries to documents before indexing lets lexical retrieval approach much costlier neural re-rankers; combined with a neural re-ranker it gave state-of-the-art on two tasks. Maps to this store: the WRITING agent records extra symptom handles/paraphrases at write time (write-time expansion), shifting vocabulary-mismatch work off the read path.
    https://arxiv.org/abs/1904.08375
- F08 (reported, blog; retrieval) Only small-corpus hybrid test found: RankFuse practitioner evaluation on 154 FastAPI docs, 30 queries: hybrid RRF Recall@5 0.90 equals dense-only; equal-weight RRF did not improve Recall@1. No peer-reviewed small-corpus BM25-vs-dense study found. Claim that hybrid gain is small on tightly controlled vocabularies is opinion, not measurement.
    https://pypi.org/project/rankfuse/ (via search summary)
- F09 (reported, blog; retrieval/limits) A July 2026 study (seen only via a GitHub discussion summary) reports BM25 beating agentic file-system search by up to 20 accuracy points beyond ~10M-token corpora, with agentic search using 39x more query tokens; dense stays cheap but lags in accuracy. The study does not test below ~10M tokens, so it says nothing about a ~100k-token store.
    https://github.com/githubnext/agentic-ops/discussions/364 (via search summary)
- F10 [LOAD-BEARING] (verified, source_repo; egress) Chroma telemetry is contradictory across sources. chromadb/config.py on main has anonymized_telemetry: bool = True (no deprecation comment). Older docs (via search summary) say disable with Settings(anonymized_telemetry=False) or env ANONYMIZED_TELEMETRY=False (PostHog). The current docs OSS page says 'As of version 1.5.4, Chroma no longer collects product telemetry'; GitHub release 1.5.6 notes '[DOC] We don't collect product telemetry anymore' (PR #6594); latest release 1.5.9 (5 May 2026). Safe posture: set both the env var and the setting, and verify with a network-deny test.
    https://raw.githubusercontent.com/chroma-core/chroma/main/chromadb/config.py ; https://github.com/chroma-core/chroma/releases ; https://docs.trychroma.com/docs/overview/oss
- F11 [LOAD-BEARING] (verified, primary_docs; egress) Qdrant telemetry: disable with env QDRANT__TELEMETRY_DISABLED=true, config key telemetry_disabled: true (config/production.yaml or config.yaml), or CLI flag --disable-telemetry. Collects system info, config, timings/counters and critical-error backtraces; says it never collects IPs, collection names, URLs or stored data.
    https://qdrant.tech/documentation/ops-configuration/usage-statistics/
- F12 (verified, primary_docs; egress) Weaviate telemetry: set DISABLE_TELEMETRY=true (accepts on/enabled/1/true). On by default; a daily payload carries machine ID, version, host OS, modules, object and collection counts and, since v1.33, cloud account/project IDs. A forum report on 1.25.2 says a config-file DisableTelemetry key was ignored, so use the env var and verify.
    https://docs.weaviate.io/deploy/configuration/telemetry ; https://docs.weaviate.io/weaviate/config-refs/env-vars ; https://forum.weaviate.io/t/how-to-run-weaviate-using-a-binary/100/5
- F13 (reported, primary_docs; egress) Milvus: no server-side or Python-SDK telemetry opt-out documented in anything I found. The Rust SDK has a client TelemetryConfig with enabled defaulting to true and a server command that can disable a running client. Treat Milvus egress posture as unverified until a network-deny test.
    https://milvus.io/api-reference/rust/v3.0.x/Client/TelemetryConfig.md (via search summary)
- F14 (reported, primary_docs; engine/ops_cost) Milvus Lite: needs Python 3.10+; pip install "pymilvus[milvus-lite]==3.0.2" "milvus-lite==3.2.2"; docs say it runs on macOS, Linux and Windows when dependency wheels exist, and on Windows milvus-lite must be named explicitly. Lite 3.x uses a new storage engine and cannot open 2.x .db files in place. Positioned for local development and small-scale workloads. Older sources (agentscope docs Oct 2025, IBM mirror of 2.4.11) said Windows unsupported, so Windows support is version-dependent.
    https://milvus.io/docs/milvus_lite.md
- F15 (verified, primary_docs; engine/access/ops_cost) Milvus Standalone via Docker runs milvus-standalone on port 19530 with embedded etcd (2379) and a Woodpecker local-filesystem WAL; MinIO listed as an optional object-storage dependency. Designed for millions-to-billions of vectors; a Milvus MCP server (zilliztech/mcp-server-milvus) exposes text, vector and hybrid search tools but takes caller-supplied vectors (does not embed locally).
    https://milvus.io/docs/install_standalone-docker.md ; https://github.com/zilliztech/mcp-server-milvus
- F16 (verified, source_repo; engine/access/ops_cost) Qdrant: Apache-2.0, Docker image qdrant/qdrant (README warns default is unauthenticated), sparse vectors plus RRF/DBSF fusion, Python client has local mode (QdrantClient(path=...) or :memory:) recommended only for dev/prototyping/testing, optional qdrant-client[fastembed]. Official mcp-server-qdrant exposes qdrant-store and qdrant-find, embeds via FastEmbed (default sentence-transformers/all-MiniLM-L6-v2), takes QDRANT_URL or QDRANT_LOCAL_PATH, stdio/sse/streamable-http.
    https://github.com/qdrant/qdrant ; https://github.com/qdrant/qdrant-client ; https://github.com/qdrant/mcp-server-qdrant
- F17 (verified, source_repo; access/egress) chroma-mcp: 12 tools (collection and document CRUD/query); client types ephemeral, persistent (file), HTTP, cloud; embedding functions default, cohere, openai, jina, voyageai, roboflow (external ones need API keys, i.e. egress); installed via uvx chroma-mcp; no telemetry mention.
    https://github.com/chroma-core/chroma-mcp
- F18 (verified, source_repo; engine/egress/ops_cost) pgvector v0.8.7: exact nearest-neighbour (perfect recall) by default, HNSW and IVFFlat optional, vector index limit 2,000 dims, works with Postgres full-text search plus RRF or cross-encoder for hybrid; Windows install requires building with Visual Studio C++ (nmake) and PGROOT. Bears on production: the current prod DB is hosted Supabase Postgres, but putting defect data there would send it to a third party, so pgvector would have to be on a self-hosted Postgres.
    https://github.com/pgvector/pgvector
- F19 [LOAD-BEARING] (verified, source_repo; engine/ops_cost) sqlite-vec: pure C, no dependencies, 'pre-v1, expect breaking changes', Apache-2.0/MIT dual, vec0 virtual tables with float/int8/binary vectors, runs on Linux/macOS/Windows, npm install sqlite-vec for Node, Mozilla Builders project plus sponsors. Brute-force KNN is the documented model (repo has ivf/diskann/rescore source files of undocumented status).
    https://github.com/asg017/sqlite-vec
- F20 (verified, source_repo; engine) LanceDB: Apache-2.0, embedded in-process, Node/TypeScript SDK, full-text search and vector search listed; Windows support, telemetry and footprint not stated on the README page I read.
    https://github.com/lancedb/lancedb
- F21 (verified, source_repo; engine/ops_cost) Weaviate: BSD-3-Clause (wl/ folder needs commercial key), Go server deployed via Docker/Kubernetes/cloud, BM25+vector hybrid in one call; no embedded mode mentioned; vectorizer modules include OpenAI, Cohere, HuggingFace (remote) and model2vec; no Windows or footprint figures given.
    https://github.com/weaviate/weaviate
- F22 (verified, primary_docs; retrieval/ops_cost/limits) Candidate local embedding models: BAAI/bge-small-en-v1.5 33.4M params, 384 dims, 512 tokens, MIT, MTEB retrieval avg 51.68, ONNX file available, ~0.067 GB in FastEmbed; all-MiniLM-L6-v2 22.7M params, 384 dims, truncates input beyond 256 word pieces, Apache-2.0, ~0.090 GB; nomic-embed-text-v1.5 768 dims, 0.52 GB (0.13 GB quantised), Apache-2.0; Ollama nomic-embed-text 274 MB, 2K context. The 256-512 token windows would truncate long defect entries, so embed a short symptom summary, not the whole entry (inferred).
    https://huggingface.co/BAAI/bge-small-en-v1.5 ; https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2 ; https://qdrant.github.io/fastembed/examples/Supported_Models/ ; https://ollama.com/library/nomic-embed-text
- F23 (verified, source_repo; engine/ops_cost) FastEmbed: Python library on ONNX Runtime (no PyTorch), CPU by default, default model bge-small-en-v1.5, supports dense, SPLADE++ sparse, ColBERT and cross-encoder rerankers; Python-only. Windows and telemetry not stated on the README. Third-party blog throughput numbers conflict and are not reproducible, so no latency figure is taken from them.
    https://github.com/qdrant/fastembed
- F24 [LOAD-BEARING] (verified, primary_docs; engine/egress/ops_cost) transformers.js (@huggingface/transformers): runs server-side in Node.js 20+ via npm i @huggingface/transformers; first run downloads and caches the model (default node_modules/@huggingface/transformers/.cache, override env.cacheDir); env.localModelPath and env.allowRemoteModels=false give a no-remote, local-files-only mode. The one-time model download from the Hugging Face Hub is the only egress; no defect data is sent (inferred).
    https://huggingface.co/docs/transformers.js/en/tutorials/node
- F25 (verified, primary_docs; egress) Hugging Face Python libs: HF_HUB_DISABLE_TELEMETRY=1 (or DO_NOT_TRACK) disables usage telemetry in transformers/datasets/gradio etc.; HF_HUB_OFFLINE=1 makes no HTTP calls to the Hub and uses cached files only. Applies to Python huggingface_hub; transformers.js telemetry behaviour was not documented on the pages read.
    https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables
- F26 (verified, blog; ops_cost/limits) CPU latency evidence: HF/Intel blog (15 Mar 2024) reports int8-quantised bge small and base under 10 ms at batch size 1 on a 56-core Xeon 8480+, with MTEB retrieval -0.58% (small) versus fp32. Hardware is far beyond a Windows dev box; for a laptop expect tens of ms per short query plus ~1 s or more model cold start (inferred; must be measured locally, no authoritative cross-hardware FastEmbed benchmark exists).
    https://huggingface.co/blog/intel-fast-embedding
- F27 (verified, primary_docs; egress/ops_cost/engine) Ollama: models stored in C:\Users\%username%\.ollama\models (OLLAMA_MODELS to move); runs as a Windows desktop tray app registered as a login item; local inference sends no prompts or data to Ollama; cloud models/web search can be disabled with OLLAMA_NO_CLOUD=1 or disable_ollama_cloud in ~/.ollama/server.json. It adds a resident daemon for the sake of embeddings, more to run than an in-process library.
    https://docs.ollama.com/faq
- F28 [LOAD-BEARING] (reported, blog; retrieval/invalidation/provenance/ops_cost) Embedding drift: vectors from different models, or different revisions of one model id, are not comparable even at equal dimension; recurring engineering practice is to stamp every vector with model, revision, dimension, pin a revision rather than a branch, filter queries to the current stamp, and re-embed on change. Evidence is engineering issues and one arXiv paper (2604.05480), not vendor docs. At hundreds of short entries a full re-embed is seconds-to-minutes (inferred), so the cost is the discipline and the stamp, not compute.
    https://arxiv.org/pdf/2604.05480 ; https://github.com/gaurav-gandhi-2411/gg-portfolio/pull/294 ; https://github.com/cebarks/alexandria/issues/25
- F29 [LOAD-BEARING] (inferred, inferred; retrieval/ops_cost/limits) Token cost of the agent-as-reranker (inferred): shortlist of 10-20 entries at ~100-200 tokens each (symptom handles, root-cause one-liner, validity conditions) is ~1.5-4k input tokens plus ~300 tokens instructions/query and ~100-300 output tokens, so ~2-5k tokens per lookup, a few cents or less at Haiku/Sonnet rates. A one-line-per-entry index of 200 entries at ~40 tokens is ~8k tokens, below the 200k-token no-RAG threshold in F05 by more than an order of magnitude. Shared prefix could be prompt-cached.
    inferred from F05 and the stated workload
- F30 (reported, blog; retrieval/engine) Semble (Show HN, self-reported benchmark) pairs static Model2Vec embeddings with BM25 via RRF and code-aware reranking; static embeddings need no transformer inference. Cited for design only: it shows a lightweight middle path between pure BM25 and a transformer embedder.
    https://hn.svelte.dev/item/48169874 (via search summary)

## Open questions
- What is the actual lexical+LLM-rerank miss rate on a realistic symptom-paraphrase set for this repo's defects? No published small-corpus number exists; the seed corpus (existing HANDOFF and lifecycle-audit entries) could be turned into a 30-50 query labelled set to measure BM25 vs trigram vs agent-rerank in the first implementation phase.
- Real CPU latency and cold-start of int8 bge-small via transformers.js and via FastEmbed on the owner's Windows 11 box (the only hard number found is <10 ms on a 56-core Xeon); measure before the trigger fires.
- Does transformers.js (or its onnxruntime-node dependency) send any telemetry or make any network calls beyond the model download? Not documented on the pages read; needs a network-deny test.
- Chroma telemetry: is it truly removed in 1.5.x? The docs page and release note say so, but config.py on main still defaults anonymized_telemetry to True. Needs a source read or network test if Chroma is ever used.
- Milvus (server and pymilvus) telemetry opt-out: not found in documentation; unverified.
- Windows support of FastEmbed, LanceDB and qdrant-client local mode is not stated on the pages read.
- Exact prompt-caching discount for a shared index prefix with the Haiku/Sonnet tiers in use was not researched; the token estimates in F29 are my own arithmetic.
- The July 2026 BM25-vs-agentic-search study was seen only via a secondary summary; the primary paper was not read.

## URLs attempted
- https://docs.trychroma.com/docs/overview/telemetry (404)
- https://qdrant.tech/documentation/guides/telemetry/ (redirected to usage-statistics page)
- https://weaviate.io/developers/weaviate/configuration/telemetry (301, then 404 at docs.weaviate.io)
- https://docs.weaviate.io/deploy/configuration/telemetry
- https://arxiv.org/abs/2104.08663
- https://docs.trychroma.com/docs/overview/oss
- https://qdrant.tech/documentation/ops-configuration/usage-statistics/
- https://docs.trychroma.com/telemetry (404)
- https://github.com/chroma-core/chroma/releases
- https://raw.githubusercontent.com/chroma-core/chroma/main/chromadb/config.py
- https://milvus.io/docs/milvus_lite.md
- https://github.com/asg017/sqlite-vec
- https://github.com/pgvector/pgvector
- https://github.com/qdrant/qdrant
- https://github.com/qdrant/mcp-server-qdrant
- https://github.com/qdrant/qdrant-client
- https://github.com/qdrant/fastembed
- https://github.com/lancedb/lancedb
- https://github.com/chroma-core/chroma-mcp
- https://github.com/weaviate/weaviate
- https://www.anthropic.com/news/contextual-retrieval
- https://huggingface.co/BAAI/bge-small-en-v1.5
- https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- https://huggingface.co/docs/transformers.js/en/index
- https://huggingface.co/docs/transformers.js/en/tutorials/node
- https://github.com/huggingface/transformers.js
- https://ollama.com/library/nomic-embed-text
- https://qdrant.github.io/fastembed/examples/Supported_Models/
- https://huggingface.co/blog/intel-fast-embedding
- https://arxiv.org/abs/2304.09542
- https://arxiv.org/abs/2210.07316
- https://arxiv.org/abs/1904.08375
- https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables
- https://github.com/ollama/ollama/blob/main/docs/faq.md (404)
- https://docs.ollama.com/faq
- https://milvus.io/docs/install_standalone-docker.md
- https://github.com/zilliztech/mcp-server-milvus
- https://weaviate.io/developers/weaviate/installation/docker-compose (301, not followed)
- WebSearch: BEIR dense vs BM25; Chroma anonymized_telemetry; Weaviate DISABLE_TELEMETRY; Milvus Lite Windows; Chroma 1.5.4 telemetry; hybrid RRF small corpus; entity-centric questions; fastembed latency; embedding model change re-embed; BM25 vs embeddings code agents; Milvus telemetry opt-out

## Anomalies
- WebFetch's summarising model sometimes answered about a different URL than requested (the Qdrant telemetry page redirected to /ops-configuration/usage-statistics/) and often reported 'page does not mention X' for facts that may exist elsewhere on the site; absence statements for Windows/telemetry in the READMEs are 'not stated on the page read', not 'unsupported'.
- Chroma telemetry sources conflict: config.py default True with no deprecation versus docs/release note saying telemetry is no longer collected since 1.5.4 (release note appears in 1.5.6). Recorded as unresolved.
- Milvus Lite Windows support conflicts across sources (current docs say supported if wheels exist; Oct 2025 agentscope docs and an IBM mirror say not supported); likely version-dependent.
- Several facts (F02, F03, F08, F09, F13) rest on WebSearch result summaries rather than a page I read directly, so are marked reported.
- No Python was run, nothing installed, no git writes; local file reads were limited to the knowledge-store design skeleton and evidence README for alignment.
