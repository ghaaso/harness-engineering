# Downloads the go approves, and the one exception to rule 3

H: CLAUDE.md rule 3: no download without the owner's word, named with source and size first. His go (`RUN:GO.md`
section 1) approves exactly what sections 1 and 2 name; nothing else. Privacy in every one (H: CLAUDE.md rule 4): a URL
or search names a paper, method or author, never our project, path, identifier or code.

## 1. Papers
- **What**: public research papers as PDF, from open copies only: arXiv, the ACL Anthology, OpenReview, PMLR and other
  open proceedings, the authors' or their institutions' pages. Never a way round a sign-in, a paywall or a bot check
  (r57-0014; ROUND.md's standards for a paper): such a paper is listed as open in the collect file.
- **Size**: at most 40 MB each (ROUND.md); about 60 MB a field [m: round 3 kept 240 MB for four lanes]; about 420 MB
  for seven fields [c: 7 x 60] (COMPLEXITY v2 section 5 step 5).
- **Where**: `RUN:papers/f<n>/<short>/paper.pdf` and `paper.txt` (git-ignored by `RUN:.gitignore`). Only the fields'
  readers download; the sheet, the planted copy and the closing download nothing.
- **How**: `curl -s -L --ssl-revoke-best-effort --max-filesize 41943040 -o paper.pdf "<url>"`; the file must begin with `%PDF-`;
  else it is not read: the collect file marks the paper `not opened (not a PDF)` and a retry overwrites it (no delete,
  so no rm for Auto mode to judge); then `pdftotext paper.pdf paper.txt`. The PDF is never opened, rendered or run otherwise; only
  `paper.txt` is read.

## 2. Raw text pages of public code and benchmark results
They are downloads to name: the direction asks for primary sources "papers, code, benchmarks" (research direction
line 48), and ROUND.md reads a
source in full, which for code or a results table means saving its text.
- **What**: one public text file of a public repository (a README, a source file, a results table) at its raw URL
  (for example `raw.githubusercontent.com/<owner>/<repo>/<commit>/<path>`), or a benchmark's published results as
  plain text or CSV.
- **Size**: at most 2 MB each [c: a reader's window of about 330 K tokens at 3.5-4 bytes a token is 1.2-1.3 MB of
  text; 2 MB leaves room for markup]; about 10 MB a field; about 70 MB in all.
- **Where**: `RUN:papers/f<n>/<short>/page.txt`, in the source's own new folder as a paper's (git-ignored). Only the
  fields' readers download them, by the route of `RUN:briefs/field/reader.md`.
- **How**: `curl -s -L --ssl-revoke-best-effort --max-time 120 --max-filesize 2097152 -o page.txt "<url>"`; read as text
  only and quoted at its line, as `paper.txt` is; never run, built, imported or installed.
Total of sections 1 and 2: about 490 MB.

## 3. Not approved
Clones (`git clone`, an archive of a repository), packages, installers, models or weights, datasets, archives (zip,
tar), binaries, anything behind a sign-in or a bot check, anything over its size. A reader that needs one writes it as
open in its collect file.

## 4. The exception to rule 3: the F1 comparison
Rule 3 says experiments run in containers with the network off. The go makes one exception (COMPLEXITY v2 section 5
step 5): the F1 comparison, his idea of a review in the window that did the research against a fresh one.
- **What runs**: in each of the seven fields (`RUN:briefs/FIELD.md` steps 2, 3b, 4 and 5): R_same, the report writer's
  review of the field's planted files in its own window; the fresh arm, the refuter's review of the same files from
  the field's claims alone; `RUN:tools/shuffle.mjs`, which strips the arms' names and shuffles them; a blind scorer.
  7 x 2 reviews and 7 scorers, all helpers of the field helpers in the coordinator's session.
- **What it reads**: `RUN:planted/f<n>/` (copies of our files with three planted wrong assumptions), `RUN:sheet/SHEET.md`,
  the field's `claims.md`, and the `paper.txt` and `page.txt` files its readers saved (sections 1 and 2), each
  opened only at a cited line to quote it; the scorer alone reads its field's part
  of `RUN:sealed/planted-key.json`.
- **What it writes**: in `RUN:fields/<n>-<slug>/`: `review-same.md`, `review-fresh.md`, `score-in/review-1.md` and
  `-2.md`, `score.md`, `f1-tokens-same.md`, `f1-tokens-fresh.md`; and `RUN:sealed/f<n>-arms.json`. Nothing outside `RUN:`.
- **Where**: in the desktop app, in the coordinator's session, with the network on, not in a container. The reviews
  themselves cite only local files; the network is on because the session that holds them is the one that
  researched.
- **Why not a container**: R_same must run in the report writer's own window, the one that did the research
  (protocol v2 section 11, lines 737-739), and that window exists only as a helper in the app's session; a container
  would need its own sign-in and a command-line session the app does not see (`H:research-tree/build/UNATTENDED.md`
  v2 line 142); and the writer's research needed the network before its review.

## Changes after the review (2026-11-21)
- 5: section 2 says who downloads a page (the fields' readers, by `RUN:briefs/field/reader.md`), its folder,
  `--max-time 120` as the readers' paper curl has, and that it is quoted at its line; section 4 says the arms open a
  `paper.txt` or `page.txt` only at a cited line. Section 2 and the 70 MB stay: the go names them.
