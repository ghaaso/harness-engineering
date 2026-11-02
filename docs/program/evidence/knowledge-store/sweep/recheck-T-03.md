# recheck:T-03

lane=T-03 tool_status=ok checks=15

- F02 ON_PAGE — https://staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf
    quote: the above development allows us to serve the ranking purpose well, it is not easily reversible to give us such an explicit estimate. In particular, some of the transformations involved dropping components which would not affect the ranking
    note: Checked via pdftotext on the downloaded PDF. Section 2.5, page header 346. 'Hence not calibrated probabilities' is a gloss; the text says an explicit probability needs the model considerably modified.
- F04 ON_PAGE — https://raw.githubusercontent.com/sqlite/sqlite/master/ext/fts5/fts5_aux.c
    quote: const double k1 = 1.2; const double b = 0.75; double idf = log( (nRow - nHit + 0.5) / (nHit + 0.5) ); if( idf<=0.0 ) idf = 1e-6; ... -1.0 * score
    note: Fetched via summariser; the quoted code lines are its reproduction. The 'about half or more of the rows' gloss is arithmetically consistent with the formula.
- F04 ON_PAGE — https://sqlite.org/fts5.html
    quote: better matches are assigned numerically lower scores. k1 and b hard-coded at 1.2 and 0.75; extra arguments set per-column weights, e.g. bm25(email, 10.0, 5.0)
    note: Only the first 100000 characters of the page were read by the summariser, but the bm25 section was found.
- F06 ON_PAGE — https://www.postgresql.org/docs/current/textsearch-controls.html
    quote: the ranking functions do not use any global information, so it is impossible to produce a fair normalization to 1% or 100% as sometimes desired.
    note: Page also covers proximity (ts_rank_cd), A-D weights, and the normalization bit mask. It does not mention IDF. The 'footer 18.6' version was not checked. The rare-token reading is the author's inference.
- F07 NOT_ON_PAGE — https://discuss.elastic.co/t/is-the-elasticsearch-relevance-score-an-ordinal-or-interval-value/36061.md
    quote: absolute values are meaningless. relative values are also meaningless.
    note: The thread does not say scores are relative to the query or cannot be normalised across queries. Closest is rmuir saying score is just a value for ranking documents.
- F07 ON_PAGE — https://arxiv.org/pdf/2411.07598
    quote: for BM-25 and ColBERT, which have unbounded relevance scores, we normalized the raw scores within the top 10 results for each query ... Without this normalization, the scores would only be meaningful within the context of a single query
    note: Checked via pdftotext on the downloaded PDF (Appendix C, Thresholds). The paper is on SAT math tutoring sessions.
- F07 ON_PAGE — https://community.pinecone.io/t/normailized-score-when-using-hybrid-search-which-is-only-supported-now-with-dot-product-instead-of-cosine-similarity/3051
    quote: This means the score distribution for BM25 might vary significantly from one query to another ... you might want to consider using a re-ranker, and filter results based on its logits.
    note: Matches the Pinecone claim. The Elastic part of F07 fails, so the fact as a whole is PARTIAL.
- F09 ON_PAGE — https://arxiv.org/abs/2104.08663
    quote: BM25 is a robust baseline; re-ranking and late-interaction-based models on average achieve the best zero-shot performances; dense and sparse-retrieval models are computationally more efficient but often underperform
    note: Abstract matches. 'At high computational costs' is also present.
- F09 ON_PAGE — https://ar5iv.labs.arxiv.org/html/2104.08663
    quote: BM25 heavily underperforms neural approaches by 7-18 points on in-domain MS MARCO ... able to outperform BM25 on almost all (16/18) datasets ... only fails on ArguAna and Touché-2020 ... high latency (> 350 ms)
    note: Table 2 gives BioASQ BM25 0.465 vs ANCE 0.306 and TAS-B 0.383, and Touché BM25 0.367 vs 0.240 and 0.162. The average gain is listed as +11%. The '6-layer MiniLM' detail and the 'thousands to millions' corpus sizes were not specifically confirmed. The last ~13k characters of the page were not read.
- F10 ON_PAGE — https://arxiv.org/abs/2508.21038
    quote: even state-of-the-art models fail on this dataset despite the simple nature of the task
    note: The abstract ties the number of top-k subsets to embedding dimension. The comments field says Accepted to ICLR'26. Authors are Weller, Boratko, Naim and Lee.
- F10 ON_PAGE — https://ar5iv.labs.arxiv.org/html/2508.21038
    quote: Lexical models like BM25 do very well due to their higher dimensionality.
    note: Table 5: BM25 Recall@100 = 93.6 vs 18.9 for the best single-vector embedder (Promptriever Llama3 8B, 4096 dimensions). Table 4 (46 docs): BM25 Recall@2 = 97.8 and Recall@10 = 100.0. A multi-vector model (GTE-ModernColBERT) reaches 54.8, so 'best embedder' holds only for single-vector.
- F16 PARTIAL — https://en.wikipedia.org/wiki/Rocchio_algorithm
    quote: Modern information retrieval systems have moved towards eliminating the non-related documents. ... often fails to classify multimodal classes and relationships.
    note: Supported: the negative weight set to 0 or only the strongest non-related documents kept, and multimodal failure with the Burma/Myanmar example. Fails: Wikipedia's typical weights are a=1, b=0.8, c=0.1, not 1/0.75/0.15, and it does not mention pseudo-relevance feedback drift.
- F16 PARTIAL — https://arxiv.org/pdf/1708.00247
    quote: the weights are typically set as alpha = 1, beta = 0.75, gamma = 0.15. Further, any negative term weights are neglected and set to 0.
    note: Checked via pdftotext on the downloaded PDF. The weights are confirmed. The survey describes pseudo-relevance feedback as using top-ranked documents, and describes query drift in the relevance feedback discussion (Java example). It does not state the PRF drift claim for off-topic top results. 'Centroid' wording was not checked.
- F20 PARTIAL — https://en.wikipedia.org/wiki/Rule_of_three_(statistics)
    quote: the interval from 0 to 3/n is a 95% confidence interval.
    note: Supported: the 3/n bound and the good approximation when n is greater than 30. Not on the page: n=50 giving about 6%, the n=20 exact vs approximate figures (14% vs 15%), and the volume and page 249:1743. The references list a JAMA 1983 Hanley and Lippman-Hand article.
- F20 NOT_ON_PAGE — https://jamanetwork.com/journals/jama/article-abstract/389714
    quote: Newman builds on an article from twelve years earlier by Hanley and Lippman-Hand ... upper limit approximately 3/N ... 50 patients (about 6%)
    note: This URL is a different article: Newman 1995, JAMA 274(13):1013, a letter to the editor, not Hanley and Lippman-Hand 1983;249:1743. It does cite their 3/N rule and gives the 50-patient, about 6% example. Full text is paywalled.
