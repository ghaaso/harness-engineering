# DOWNLOADS: installs, images, weights and sample size for the 12 GB card run (steps 7 and 8)

Collected 2026-11-24. Nothing was downloaded or installed. Metadata only, from official pages (PyPI JSON API,
Hugging Face model API, the AnyBURL site, GitHub API, Docker Hub API); requests carried generic package, model and
repository names only (rule 4). Sizes are bytes as the source states them; "disk" is the figure where the source or an
earlier record gives one, otherwise "not measured".

Present on this PC, checked today (Docker Desktop up, server 29.9.2; the host card: RTX 5070, 9.9 GB free of 12 GB):
`graphtest-kge-gpu:1` (a890c54808c1, 10.6 GB on disk, 3.5 GB content; holds Python 3.11.2, `pykeen` 1.11.1, `torch`
2.15.0+cu132, git, SQLite 3.40.1; no `sentence-transformers`, `transformers` or tree-sitter), `graphtest-kge:1` (CPU
twin, 3.09 GB), `graphtest:1` (base, 1.26 GB), `graphtest-graphify:1`, `python:3.13-slim-bookworm`, `postgres:17.x`,
`clinic-tests:*` (2.28 GB each), `node:24-bookworm-slim`. A Java runtime: none on the host (`java` not found), but
`fixflow-android-build:9d26e73c5074` holds OpenJDK 17.0.21 (checked with the network off). Hugging Face cache on the host
holds only two Whisper models, no embedder. Docker volumes: 9+ unnamed local volumes, not inspected (none named for
this run). Node 24.22.1's built-in `node:sqlite` has FTS5 and `bm25()` (three-line script, ran: returned the row).

| Item | Needed for | Already present | Source URL | Exact version | Download size | Disk | Licence |
|---|---|---|---|---|---|---|---|
| AnyBURL jar | D4 rule learner | no | https://web.informatik.uni-mannheim.de/AnyBURL/AnyBURL-23-1x.jar | AnyBURL-23-1x (12 Nov 2025) | 154,982 B | same | 3-clause BSD |
| AnyBURL sources (optional, only to build the jar) | D4 | no | https://web.informatik.uni-mannheim.de/AnyBURL/AnyBURL-23-1x-sources.zip | 23-1x | 94,757 B | not measured | 3-clause BSD |
| Java runtime for AnyBURL | D4 | yes: OpenJDK 17.0.21 in image `fixflow-android-build:9d26e73c5074` (6.06 GB, the product's image; reuse it network-off). Else Docker Hub `eclipse-temurin:17-jre-jammy` | https://hub.docker.com/_/eclipse-temurin | 17-jre-jammy | 0 if reused; 93,817,012 B (amd64) if pulled | not measured | GPL-2.0 with Classpath exception (OpenJDK; from the project, not read from the API) |
| PyKEEN | D4 KG embeddings | yes: `graphtest-kge-gpu:1` | PyPI `pykeen` | 1.11.1 | 0 | in image | MIT (PyPI) |
| Earlier runtime (torch 2.15.0+cu132, CUDA wheels) | D4, D2 | yes: same image | PyTorch cu132 index | 2.15.0+cu132 | 0 (3.50 GB if rebuilt) | 10.6 GB | BSD-3 |
| SweRankEmbed-Small (137M) weights | D2 Phase A | no | https://huggingface.co/Salesforce/SweRankEmbed-Small | model.safetensors, BF16, 136,731,648 params | 274,481,535 B all files (273,474,944 B weights) | not measured; BF16 so about 0.27 GB, not the 0.55 GB fp32 the plan computed | **cc-by-nc-4.0** (non-commercial; research use only; the model's custom code `modeling_hf_nomic_bert.py` is in the repo, and loading it needs `trust_remote_code`) |
| Qwen3-Embedding-0.6B weights | D2 Phase A | no | https://huggingface.co/Qwen/Qwen3-Embedding-0.6B | model.safetensors, BF16, 595,776,512 params | 1,207,489,041 B all files (1,191,586,416 B weights) | not measured; about 1.2 GB | Apache-2.0 |
| Embedding runtime: sentence-transformers | D2 | no (torch is) | PyPI `sentence-transformers` | 6.3.0 | 780,346 B | not measured | Apache-2.0 |
| transformers | D2 | no | PyPI `transformers` | 5.24.0 | 13,549,890 B | not measured | Apache-2.0 |
| tokenizers | D2 | no | PyPI `tokenizers` | 0.23.3 (cp310-abi3) | 3,396,193 B | not measured | Apache-2.0 (not read from the API) |
| safetensors | D2 | no | PyPI `safetensors` | 0.8.0 | 516,040 B | not measured | Apache-2.0 (not read from the API) |
| huggingface-hub | D2 | no | PyPI `huggingface-hub` | 2.4.0 | 857,021 B | not measured | Apache-2.0 |
| tree-sitter + python + javascript + typescript grammars | D2 code chunks, D4 import edges | no | PyPI `tree-sitter`, `tree-sitter-python`, `tree-sitter-javascript`, `tree-sitter-typescript` | 0.27.0, 0.25.0, 0.25.0, 0.23.2 (cp311 / abi3 wheels) | 701,771 + 108,133 + 99,728 + 344,960 = 1,254,592 B | not measured | MIT (grammars; core not stated in the API) |
| SQLite with FTS5 (BM25 inside it) | D2 baseline | yes: Node 24.22.1 `node:sqlite` has FTS5 and `bm25()`; SQLite 3.40.1 also in the GPU image | built in | n/a | 0 | 0 | public domain |
| A BM25 option (only if the script runs in Python) | D2 baseline | no, and not needed given FTS5 | PyPI `rank-bm25` (or `bm25s` 0.3.16, 76,043 B) | 0.2.2 | 8,584 B | not measured | Apache-2.0 |
| grep | D2 baseline | yes (git bash, container base) | n/a | n/a | 0 | 0 | GPL |
| GraIL code (named only, for the step 7 pre-test) | D4 pre-test, only if the pre-tests show room | no | https://github.com/kkteru/grail | no release; default branch (last push 2024-07-25) | about 14 KB listed by the API (code only; not downloaded) | not measured | **none declared** (the API returns no licence): the owner is told before use |
| Public repository (recommended): zulip/zulip | D4, D2 | no | https://github.com/zulip/zulip | main at clone time (pin the commit then) | 668,447 KB = 684,489,728 B (the API's `size`, the repository's stored size; the packed clone is not measured) | about the same plus a checkout, not measured | Apache-2.0 |

Python packages in the table total 20,354,082 B. Their transitive pure-Python dependencies (regex, tqdm, pyyaml,
packaging, the HTTP stack, numpy and scikit-learn if the image's versions are not enough) were not resolved: that
needs a pip dry-run with the network on, which I did not run. [not sized, expected well under 100 MB; numpy is
already in the image]

**Total download (counted rows): 2,186,969,368 B, about 2.19 GB** = AnyBURL jar 154,982 + SweRank 274,481,535 +
Qwen3 1,207,489,041 + Python packages 20,354,082 + Zulip 684,489,728; without Zulip's clone about 1.50 GB. Not in it:
the AnyBURL sources zip (94,757 B), the Temurin image (93,817,012 B, only if the product's image is not reused), the
unsized transitive packages, GraIL (not downloaded). Image rebuild is not needed: the new Python packages go into a
copy of `graphtest-kge-gpu:1` (a new image layer, size not measured).

## 2a. D4's n and card hours

Per-commit scores are absent. `graph2/embeddings/result.json` holds per-arm means and paired-bootstrap intervals only
(`heldout.vs_RRF`: lo, hi, diff; 75 commits, 418 tasks); `RESULT.md` and `COORDINATOR-REPORT.md` give no per-commit
scores either; `lane/grader-returns/heldout.json` repeats the intervals. So n is taken at the 617 bound, as the plan says.

- n = (2.8 x sd / 0.02)^2. The SE 0.022 the plan cites over 65 commits gives sd = 0.022 x sqrt(65) = 0.1774;
  (2.8 x 0.1774 / 0.02)^2 = 24.83^2 = **617** (616.9). Over 50 commits: sd = 0.022 x sqrt(50) = 0.1556, n = 474.
- Cross-check from what is on disk: E1_fused minus RRF, pool P@10, interval [-0.00186, +0.00714] over 75 commits:
  SE = 0.00900 / 3.92 = 0.00230; sd = 0.00230 x sqrt(75) = 0.0199; n = (2.8 x 0.0199 / 0.02)^2 = 7.8. That is the sd
  of a paired difference between two close arms, not the sd of a score against the best untrained arm, so it is not
  used; n stays 617. Our own repositories hold about 230 and 432 dated commits, so the public repository supplies at
  least 617 - 432 = 185 held-out commits (more if the clinic's are used for training span).

Card hours (earlier run's wall times x the dimension ratio):
- Earlier held-out run, frozen E1 (RotatE) c04, 256 dimensions, 75 commits (70 parent graphs), 3 seeds, on the card:
  17:36Z to 22:19Z = 4 h 43 min elapsed, of which 2 h 43 min was work and 2 h the PC asleep (`COORDINATOR-REPORT.md`
  lines 279, 302-303). Work basis: **2.72 h**. Stage B (tuning, s = 1, one process): 14.4 h projected
  (`RESULT.md` ruling 44).
- Ratio d/256: d 512 = 2.0, d 1000 = 3.9, d 2000 = 7.8. Ratio n/75 = 617/75 = 8.23.
- Held-out-form hours = 2.72 x (d/256) x 8.23: d 512 = 44.8 h; d 1000 = 87.4 h; d 2000 = **174.9 h**. At the earlier
  n (75 commits) the same three are 5.4, 10.6 and 21.2 h. Tuning (stage B form) adds 14.4 x ratio: 28.8, 56.2, 112.3 h
  if it is repeated at s = 1.
- These assume time linear in d and in n and one model trained per held-out parent as before [hypothesis, not
  measured; on a card a small graph often scales less than linearly in d, and D4 may share a model across several
  commits]. The first run on our graph in the pre-tests should replace them. Not covered: AnyBURL's hours (processor,
  its source's runs are 1,000 s to 3 h per dataset on the benchmarks, f2c L12, C43 quoted), the three repositories
  (the figures above are per repository), the sleep (2 h lost before).

## 2c-like sizing for the public repository (D4 under 6.4 GB)

FixFlow's languages (from the earlier records): Python and JavaScript/TypeScript, 618 tracked files, about 5,400 nodes
(about 8.7 nodes per file). 6.4 GB is the card figure at 10^5 nodes (`HB:1033`), i.e. about 11,500 files at that ratio.
Files are counted from the GitHub tree API (blobs on the default branch); commits from the commits listing's page count.

| Repository | Licence | Languages (files) | Commits (all / since 2024-11-24) | Files | Nodes at 8.7 per file | API repo size |
|---|---|---|---|---|---|---|
| zulip/zulip (recommended) | Apache-2.0 | Python 2,050 .py, TypeScript 472 .ts, JS, Handlebars, plus 2,919 .json | 72,401 / 10,632 | 9,044 (about 3,100 code files) | about 79,000 for all files, about 27,000 for code files only | 668,447 KB |
| django/django | BSD-3-Clause | Python 2,943 .py, 111 .js; 2,500 .po/.mo translation files | 35,139 / 2,058 | 7,104 | about 62,000 (about 26,000 on code files) | 285,058 KB |
| fastapi/fastapi | MIT | Python 1,233 .py; 1,734 .md docs | 8,134 / 2,923 | 3,279 | about 28,500 | 59,107 KB |

Not chosen: flask (Python only, 236 files, 186 commits in two years) and express (JS only, 216 files, 186 in two
years) are too small for 617 held-out commits in a recent span.

**Recommendation: zulip/zulip.** It is the only one of the three that has FixFlow's mix (Python server, TypeScript
front end: the cross-runtime shape the one cross-runtime gap in our own data comes from), an open licence, and 10,632
commits in two years, far above 617 held-out plus a training span. Its estimated node count (about 79,000 if every file,
including json and images, becomes a node; about 27,000 if only code files do) stays under the 10^5 nodes of the
6.4 GB figure, but the all-files count is within 21 % of it, so the pre-tests set the node rule before training.
Django is the fallback if size matters (fewer dated commits per file, Python only). The node count is an estimate from
file count x FixFlow's ratio [hypothesis that the ratio carries over]; no graph was built.

## Could not size or check

- Transitive Python dependencies (needs a network pip dry-run).
- Size on disk of weights, packages and the Zulip checkout (nothing downloaded); the packed clone size (the API's
  `size` is GitHub's stored size).
- Licences of tokenizers, safetensors, tree-sitter core: not stated in the API response; stated from the projects' known
  licences, not read here.
- GraIL has no declared licence.
- Docker volumes were listed but not inspected.
