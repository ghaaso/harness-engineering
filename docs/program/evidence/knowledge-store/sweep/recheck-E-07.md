# recheck:E-07

lane=E-07 tool_status=ok checks=10

- F01 ON_PAGE — https://arxiv.org/abs/2104.08663
    quote: BM25 is a robust baseline; re-ranking and late-interaction-based models on average achieve the best zero-shot performances, however, at high computational costs; dense and sparse-retrieval models are computationally more efficient
    note: 18 datasets, 10 systems, v4 revised 21 Oct 2021 all confirmed. 'Often underperform' confirmed; 'generalise poorly out of domain' is paraphrase.
- F03 PARTIAL — https://arxiv.org/abs/2109.08535 (read via search result summary)
    quote: dense retrievers drastically underperform sparse methods; can only generalize to common entities unless the question pattern is explicitly observed during training
    note: Fetched directly. EMNLP 2021 and v3 22 Feb 2022 confirmed. Abstract never says 'rare'; 'rare entities degrade quickly' is inferred. Bridge claim is labelled inferred.
- F05 ON_PAGE — https://www.anthropic.com/news/contextual-retrieval
    quote: 5.7% baseline; 3.7% (35%); 2.9% (49%); 1.9% (67%); under 200,000 tokens (about 500 pages) include the entire knowledge base in the prompt
    note: Published 19 Sep 2024. Scale commentary is the agent's own.
- F06 ON_PAGE — https://arxiv.org/abs/2304.09542
    quote: competitive, even superior results to state-of-the-art supervised methods on popular IR benchmarks
    note: EMNLP 2023 in comments; v3 last revised 28 Dec 2024. 'Supports using agent's own LLM' is an inference.
- F07 PARTIAL — https://arxiv.org/abs/1904.08375
    quote: retrieval results alone (without re-ranking) approach the effectiveness of more computationally expensive neural re-rankers but are much faster... combining our method with a highly-effective re-ranking component, we achieve the state of the art in two retrieval tasks
    note: Abstract does not say 'lexical retrieval' or 'appending before indexing' explicitly (it says expanding documents with predicted queries). Write-time mapping is the agent's inference.
- F10 ON_PAGE — https://raw.githubusercontent.com/chroma-core/chroma/main/chromadb/config.py ; https://github.com/chroma-core/chroma/releases ; https://docs.trychroma.com/docs/overview/oss
    quote: anonymized_telemetry: bool = True; "[DOC] We don't collect product telemetry anymore" (#6594); "As of version 1.5.4, Chroma no longer collects product telemetry."
    note: config.py has no adjacent comment (only a '# Telemetry' header); 1.5.9 latest dated 05 May 2026. Old-docs env var claim (via search summary) not verified here.
- F11 ON_PAGE — https://qdrant.tech/documentation/ops-configuration/usage-statistics/
    quote: setting the QDRANT__TELEMETRY_DISABLED environment variable to true; telemetry_disabled in config/production.yaml or config/config.yaml; cli option --disable-telemetry
    note: Collected categories and the never-collects list (IP, collection names, URLs, stored data) confirmed. Page also says URLs are hashed, a minor nuance.
- F19 PARTIAL — https://github.com/asg017/sqlite-vec
    quote: Written in pure C, no dependencies, runs anywhere SQLite runs; pre-v1, so expect breaking changes!
    note: All items confirmed (licenses, vec0 float/int8/binary, platforms, npm, Mozilla Builders, sponsors, ivf/diskann/rescore files) except 'brute-force KNN is the documented model', which the page does not state.
- F24 ON_PAGE — https://huggingface.co/docs/transformers.js/en/tutorials/node
    quote: it will download the model files and cache them on your file system (in ./node_modules/@huggingface/transformers/.cache/)... disable loading of remote models by setting env.allowRemoteModels to false
    note: Node 20+, npm i, env.cacheDir, env.localModelPath confirmed. 'Only egress / no defect data sent' is inferred.
- F28 PARTIAL — https://arxiv.org/pdf/2604.05480 ; https://github.com/gaurav-gandhi-2411/gg-portfolio/pull/294 ; https://github.com/cebarks/alexandria/issues/25
    quote: Two revisions of one model id therefore still produce two incompatible vector spaces under an identical lock string.
    note: Alexandria issue supports incompatible revisions, stamping and full re-embed. PR 294 supports pinning a revision, stamping model/revision in index header, re-embed; no dimension mention. The arXiv paper 2604.05480 is 'Can You Trust the Vectors in Your Vector Database? Black-Hole Attack from Embedding Space Defects' (a security attack paper); PDF text unreadable, so nothing on embedding drift confirmed from it. Seconds-to-minutes re-embed cost is inferred.
