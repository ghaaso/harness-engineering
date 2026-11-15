# L01 Same mistake, new session: walk through the ten steps

Pathway family: a fresh session runs into something an earlier session had already worked out.
Owner's request for this run: "this is just one pathway simulated, go through a diversity". So each case is walked at more than one kind of later moment. Twelve walks over six cases (C1 to C5 as given, C6 added).

Status words: works, strains, breaks, not_specified (the design does not say), not_reached.
No fixes are proposed. Where the knowledge-store design (KS, `KNOWLEDGE-STORE-DESIGN-2026-11.md` v1.3.1 in the knowledge-store-research worktree) already has a mechanism for a step, the step is counted as working and the KS line is named.

Transcript root: `P` = C:/Users/User/.claude/projects. Scripts used: scratchpad/sim/l01/*.cjs (read-only scans).

## The diversity of later moments

| Walk | Case | Kind of later moment |
| --- | --- | --- |
| C1a | Python stub | same session, 10 minutes after a compaction dropped the fact |
| C1b | Python stub | another project, whose own right answer differs |
| C1c | Python stub | the stored fact was wrong when written ("no Python", "no gh", "no uv") |
| C2a | Heredoc cut | the entry was already in the window; four agents, including its writer, failed anyway |
| C2b | Heredoc cut | four parallel siblings fail within 6 seconds |
| C3a | pdftoppm | the parent solved it; its second wave of agents was not told |
| C3b | pdftoppm | a different project needs a different route |
| C4a | git Filename too long | parallel refuters; then a harness change removed the cause |
| C4b | ENAMETOOLONG | the words match the wrong entry |
| C5 | compare_digest | code: the top tier wrote the bug; there was no failure to look up |
| C6 (added) | Subagent report-file refusal | the error fires in one window, the cause sits in another |

## Facts checked before walking (corrections to the case list)

- C2: the note `reference-bash-tool-limits.md` was written by session e24f17dc (line 6156, 2026-11-11 07:05:12Z), not by 701c2346. 701c2346 loaded it at start (line 16) and its subagents had the index line at line 6.
- C4: the four ENAMETOOLONG errors are not path-length errors. Their commands were 35,963, 40,362, 54,554 and 34,385 characters long, all above Windows' 32,767-character command-line limit. Two contain no git at all. The 2026-11-10 one already ran with the short scratchpad form.
- C1: CPython exists on this PC today through uv: `uv` is on PATH (WinGet package), CPython 3.12.16 and 3.13.18 under C:/Users/User/AppData/Roaming/uv/python. The Codex runtime Python 3.12.14 also exists. uv was installed by a clinic Opus agent: `winget install --id astral-sh.uv --exact --scope user` at 2026-11-02 17:06Z.
- C3: in wf_28ac3c81-046, 16 agent transcripts; 15 have a flagged pdftoppm error (20 in all) and 13 a flagged python error (my count of error-flagged results; the case list's 56 is a raw text count).
- C5: the PIN check `hmac.compare_digest(digest.hex(), hash_hex)` at backend/app/features/identity/security.py:44 compares two hex strings from `hash_pin`; neither side comes from request text. Its commit 30dc6d4 (2026-06-06) is co-authored by Claude Opus 4.8.
- Bash size band, all Bash calls over 6,000 bytes in transcripts touched since 2026-10-20 (l01/biglen.cjs): 6,000-6,999 bytes: 58 calls, 0 heredoc EOF errors. 7,000-7,999: 34 calls, 22 ok, 11 EOF. 8,000 and over: 114 calls, 0 ok.
- Scratchpad path form: the last main session that started with the long form (`Temp\claude\C--Users-...\<session>\scratchpad`) began 2026-11-04 09:02Z; the first with the short form (`Temp\claude\<16 hex>\...`) began 10:33Z the same day (l01/scr.cjs over 72 main transcripts).

---

## C1a. Python stub, same session after a compaction

**Entry as written** (2026-10-06, Opus 5.5, clinic session `1f10835f`, after the stub error toolu_01VYZReC8V3WNYBTDEXsgr9a; the agent then ran the Codex interpreter at line 91 and used it at line 103):

> Symptom: `python` or `python3` (Bash or PowerShell) exits 49: "Python was not found; run without arguments to install from the Microsoft Store…". Cause: on this Windows PC the PATH entries are WindowsApps Store aliases, not interpreters. A real Python 3.12.14 is at C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe (it ships with the Codex app). Fix: call that path for scripts; node or PowerShell for small JSON work. Dead end: searching the disk for python.exe finds only the stub. Check: `<path> --version` prints 3.12.14.

**Later moment.** 2026-11-01 15:06:12Z, `P/C--Users-User-Documents-projects-EMS-workshop1/e24f17dc-….jsonl` line 2928, main session, Fable 5.1. It is counting message types in its own transcript and sends `python -I - "$T" <<'EOF' import json,sys,collections …`. Exit 49 (line 2929). Ten minutes earlier the session compacted (line 2735, 14:56:44Z). The new summary (line 2739) has no word "Python"; the previous summary (line 1948, 10-31) had said "no Python". CLAUDE.md in the same window lists "Backend … FastAPI (Python 3.12)" and the pytest commands. The session had hit the same error itself on 10-31 16:24Z (line 177).

**Lookup.** Keyed on the exit-49 text, it returns the 10-06 entry as an exact hit.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | The window points toward Python: CLAUDE.md names Python 3.12 and pytest. The compaction summary that held "no Python" was replaced by one without it. |
| 2 Trigger | not_specified | Owner's design names no trigger. KS triggers (escalation, build or deploy retry, a gate error, `--diff`; KS L444-448) do not include a shell tool error. Only the exit-49 result could start a lookup, after the call. |
| 3 Query | works | The error text is verbatim and distinctive. |
| 4 Match | works | Exact template; one entry. |
| 5 Delivery | strains | Main session. It stays until the next compaction. This session already lost the same fact once at a compaction. |
| 6 Use | works | Swap `python` for the full path; a stdlib JSON script runs on 3.12. |
| 7 Check | works | The rerun's exit code decides, at no cost. |
| 8 Ladder | not_reached | The failing model is already Fable, the top rung. A stronger model makes the same call. |
| 9 Capture | breaks | The 10-06 solver's task was a link graph; Python was a side stumble, not "the problem solved". KS's gate needs a mainline fix commit and a control pair (KS L276, L452), which a PC fact lacks. In the record the fact reached memory 29 days later, as the last sentence of a git long-paths note. |
| 10 Afterlife | breaks | The interpreter belongs to another app: the Codex runtime folder was rewritten on 2026-10-21 (same version). uv and CPython 3.13 arrived 11-02, 3.12.16 on 11-11. No repository event marks any of this; KS admits untracked dependencies (KS L358). |

**Saved:** at most one retry call. The session dropped that analysis and moved on.

## C1b. Python stub in another project with its own right answer

**Entry as written:** the C1a entry, or the EMS memory line of 2026-11-04 ("`python` is not on PATH in Git Bash (Windows Store alias) — use `node` for JSON", project-windows-git-longpaths.md).

**Later moment.** 2026-11-09 15:08:32Z, clinic subagent `P/C--Bilal-Migration-…-24-Clinic-Workshop/7f348b2c-…/subagents/agent-a87e4f07079fc62e5.jsonl` line 125, Opus 5.5, reviewing a branch. It runs `python -I -c "import json …"` to compare measure files. Its window holds the clinic's own command `uv run --locked python scripts/check.py` (4 hits in the transcript). The clinic has `.venv` (Python 3.13.18, uv-managed) and its memory says to verify line endings with `uv run python -c …` (bash-cr-check-lies.md:15). The agent recovered on the next call with `diff`/`grep` (line 129), 5 seconds later.

**Lookup.** Exact hit on the stub text; returns an entry written in EMS, or before uv existed.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | The right route (`uv run --locked python`) was already in the window. The agent still typed bare `python`. |
| 2 Trigger | not_specified | As C1a. |
| 3 Query | works | Same verbatim text. |
| 4 Match | strains | Same error, different right answer. The entry says node or the Codex 3.12; the project's route is uv with locked 3.13 dependencies. |
| 5 Delivery | works | Subagent window, for its short life. |
| 6 Use | strains | For a JSON compare, node or Codex Python works. For anything importing project code, the entry points to the wrong interpreter and steers away from `uv run`. |
| 7 Check | works | Immediate. |
| 8 Ladder | not_reached | Opus already. |
| 9 Capture | not_specified | No rule says whether the clinic variant (uv) is written as a sibling, a revision, or nothing. |
| 10 Afterlife | breaks | Two project memories now disagree about one PC: EMS "use node for JSON", clinic "uv run python". KS has no project field and is "for the agents working on FixFlow" (F1 §9). |

**Saved:** nothing. One lookup round trip against a one-call recovery.

## C1c. The stored "no" was wrong when written

**Entry as written** (2026-10-31 17:34Z, Fable 5.1, commit 53f3a5c, docs/ORCHESTRATION-DESIGN-2026-10.md line 39): "This machine: Node 24 …, Docker CLI present but the engine is down, **no Python**, no `node_modules`, no `gh`, Railway CLI not logged in …". As a library entry: "No Python and no gh on this PC; design around them; backend gates only in Docker."

**Later moments.**
- 17:40Z the same day, the same session ran `winget install --id GitHub.cli` (six minutes after the commit). "no gh" was now false.
- 2026-11-01, the harness review: "a Python 3 interpreter exists at the Codex runtime path … so 'no Python on this machine' in the design doc and memory was wrong" (docs/program/HARNESS-REVIEW-2026-11-01.md:276). Commit 3fb8f9c corrected the line.
- 2026-11-02, clinic memory (clinic-s00-readiness-2026-11.md:13): "no Python 3.13, no uv, no pipx, no py launcher; the only Python is the Codex runtime 3.12.14". At 17:06Z an Opus agent installed uv. The note was last modified 11-06 and still says "no uv".
- KS design L129, Dev box: "no Python on PATH (an interpreter exists at the Codex runtime path)". No uv.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | works | A session planning work on this PC would look up "what tools exist here". |
| 2 Trigger | not_specified | No error occurs when an agent avoids a tool it believes absent. |
| 3 Query | strains | "Is there Python?" is a prose question; only `prose` handles could match (KS L260). |
| 4 Match | works | It returns the entry. That is the problem. |
| 5 Delivery | works | Any window. |
| 6 Use | breaks | The cheap model designs around tools that exist: Docker-only gates, no gh. Nothing it does fails. |
| 7 Check | breaks | A stored "no" never fails loudly. The agent simply does not try. Only a separate review (11-01) found it. |
| 8 Ladder | not_reached | No failure to hand up. |
| 9 Capture | breaks | The writer (Fable 5.1) probed PATH only. It wrote "no gh" six minutes before installing gh, and "no Python" while a Python had been in use since 10-06. |
| 10 Afterlife | breaks | Agents themselves change the PC (gh 10-31, uv 11-02). The corrected fact went into a doc, a memory note and the KS design separately; the clinic copy is still stale. |

**Saved:** nothing. Cost: an unknown amount of work designed around absent tools.

---

## C2a. Heredoc cut: the entry was already in the window

**Entry as written** (first solve 2026-10-31 20:26Z, e24f17dc main, Fable 5.1, a 9.8k command, then the Write tool; using only what was known then):

> Symptom: Bash `cat > f <<'EOF' … EOF` fails "unexpected EOF while looking for matching `''", and the file is not written, though the quotes are balanced. Seen with a command of about 9,800 characters. Suspected cause: the Bash tool cuts long commands, so the heredoc never closes. Fix: write the file with the Write tool. Dead end: re-sending the same heredoc.

The later memory note (2026-11-11) adds the numbers: "longer than roughly 8 KB is truncated silently … Write long files in parts of under about 6 KB and append, then check the tail." The size band above shows its 6 KB advice is sound.

**Later moments** (each with the note's index line "commands over about 8 KB are cut" in the window):
1. 2026-11-11 07:14:17Z, Sonnet subagent `P/…EMS-workshop1/701c2346-…/subagents/agent-a178b624a8849ab6f.jsonl`. Index line at transcript line 6. Brief: read-only work and ONE output file. It sent `mkdir -p … && cat > …queue-and-power.md <<'EOF'` of about 10.2k characters (line 103); failed (line 104); re-sent the same text with Write (line 107). Sibling agent-a4ed4e45a7936a1ad did the same at about 18.6k.
2. 2026-11-12 08:04:41Z, e24f17dc main, Fable 5.2: the session that wrote the note (line 6156). Its window held the note twice: the compaction summary at line 6882 ("Bash tool quirks: commands over ~8 KB cut silently") and the index line (line 6879). Command 8,603 characters (line 7367), failed; re-sent a 4,786-byte file.
3. 2026-11-12 09:02-09:03Z, Opus subagent `…/wf_bf05af78-c6c/agent-ac87b7810321410f1.jsonl`. It followed the note's form: Write 8,956 characters, then `cat >>` parts of 5,458 and 5,026, then a third part of 8,286 that failed (line 557).
4. This walk's own author (Opus 5.5 subagent, 2026-11-12), with "double backslashes in heredocs collapse" in its window, wrote a regex with `\\` inside a quoted heredoc. Node reported "Invalid regular expression … Unterminated group".

In the same windows, the Bash tool's own description says "for multi-line strings use a heredoc" (agent-a178b624a8849ab6f line 12).

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | The entry is in the window, pushed at start. So is the tool's standing instruction to use heredocs. They pull opposite ways. |
| 2 Trigger | breaks | The cost is the failed call itself: 8.6k to 18.6k characters of output, then the same text again. A lookup can only follow the error. Nothing fires before the call. |
| 3 Query | works | "unexpected EOF while looking for matching" is verbatim. |
| 4 Match | works | Exact template. |
| 5 Delivery | works | Delivered by push into main and subagent windows (line 6). KS is pull-only (KS L440) and would deliver less. |
| 6 Use | breaks | Present and not applied in four moments, one by its own writer a day later. The one agent that used the form missed the size. The condition is the length of the agent's own next output, which it does not measure. |
| 7 Check | works | Exit 2 at once. |
| 8 Ladder | not_reached | Sonnet, Opus and Fable all fail the same way. |
| 9 Capture | strains | First failure 10-31; the note came 11-11, after the peak day (40 errors on 11-04). Written in a batch memory edit, not at a solve. No fix commit for KS's gate. |
| 10 Afterlife | strains | The limit belongs to the harness version, not to a repository. No KS footprint item can see a tool upgrade. |

**Saved:** nothing in these moments. The failed calls were paid with the entry present.

## C2b. Heredoc cut: four parallel siblings

**Entry as written:** the C2a entry.

**Later moment.** 2026-11-10 07:52:07Z to 07:52:13Z, Codex slides project, workflow `wf_b4e7b31a-874`, four Opus agents. Each wrote four slide files in one `cat >` command of 10.3k to 11.2k characters, and each failed. Recovery in agent-a093c054bbd61c304: four Reads of the old files, then four Writes (Write needs a prior Read of an existing file). That project's memory has four notes, none about Bash.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | Different project memory: nothing about Bash limits. |
| 2 Trigger | breaks | As C2a: the cost comes before any trigger. |
| 3 Query | works | Verbatim. |
| 4 Match | strains | Hits only if the library is shared across projects. Owner's design says it is; KS is silent (F1 §9). |
| 5 Delivery | breaks | Four windows, six seconds apart. No sibling could finish, record and serve another in time. |
| 6 Use | not_reached | Nothing delivered. |
| 7 Check | works | Immediate. |
| 8 Ladder | not_reached | All Opus. |
| 9 Capture | not_specified | Four equal solvers of one stumble. The design does not say who writes or whether four near-duplicates are merged. |
| 10 Afterlife | not_reached | |

**Cost:** per agent about 11k characters wasted plus eight recovery calls.

---

## C3a. pdftoppm: the parent solved it, the second wave was not told

**Entry as written** (2026-10-16 about 14:16Z, the parent session `e56a900a`, Opus 5.5, after its own failed Read at 14:13:28Z, line 167, a python probe at line 171 and a tool probe at line 174):

> Symptom: Read with `pages` on a PDF fails "pdftoppm is not installed. Install poppler-utils (e.g. brew install poppler or apt-get install poppler-utils)". Cause: the Read tool renders pages through poppler, absent on this Windows PC. The suggested install does not apply here. `python` on PATH is the Store stub. Route that worked: PowerShell reads the bytes, inflates the FlateDecode streams with System.IO.Compression and pulls the text (works for "MD Health Clinic Inventory final.pdf", a 41-page Google Docs export). The first attempt failed on the reserved `$PID` variable.

**Later moment.** 19:54:05Z to 19:54:07Z, the parent launched three more Opus agents (agent-a62a20…, a78506…, a7f740…), and one more at 20:08:42Z (ae155e…). Each tried Read with pages on the same PDF (19:54:37, 19:55:38, 19:57:19, 20:09:11) and then python (19:55:11, 19:56:59, 19:57:44, 20:09:32). Their briefs carry no word "pdf". The clinic OneDrive memory folder holds two notes, neither about PDFs. In wave 1 (six agents started 14:13:24-26Z), every agent hit it within about 40 seconds, four seconds before the parent did.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | The brief, written by a parent that knew, says nothing about PDFs. |
| 2 Trigger | not_specified | A Read tool error is not an escalation, build retry or gate error (KS L444-448). |
| 3 Query | works | Verbatim text. |
| 4 Match | works | If the parent's route had been stored by 14:16Z. |
| 5 Delivery | works | Subagent window. |
| 6 Use | strains | The stored route took the parent three tries and printed 113.6 KB. Some wave-1 agents found cheaper pre-extracted text under tmp/pdfs. The entry may anchor on the costlier route. |
| 7 Check | works | Text appears or it does not. |
| 8 Ladder | not_reached | Parent and children are all Opus and failed alike. |
| 9 Capture | breaks | The parent solved it as an aside ("reading the authoritative PDF's operational pages myself"). There is no capture point mid-session; KS records before PR-ready. Wave 2 started 5.5 hours later with nothing written. No note anywhere ever recorded pdftoppm. |
| 10 Afterlife | strains | The route depends on how the PDF was produced. The pre-extracted text exists for some files in one project only. |

**Would have saved:** 2 to 8 calls per wave-2 agent (agent-aa3f0e4f280ba92ec in wave 1 spent about 8), plus a python probe each.

## C3b. pdftoppm in another project: a different route

**Entry as written:** the C3a entry (PowerShell inflate; clinic tmp/pdfs text).

**Later moment.** 2026-11-12, EMS session e24f17dc, workflow `wf_548351eb-ab1`, research subagents reading PDFs that WebFetch had saved under `tool-results/webfetch-…`. The shared brief (scratchpad/hb/graph2/brief.md, line 21, "The machine") names the Codex Python and says "the `python` on PATH is only a store stub … do not install anything".
- Sonnet agent-ae0c7fdf718a88b1f: Read pages 1-12 failed (07:26:57Z). It probed the Codex Python ("pypdf yes … pdfminer yes", 07:27:10Z) and extracted the text ("12 pages 10 pages", 07:27:26Z). Two calls.
- Opus agent-a510cf512155b200a: Read pages 6-8 failed (07:34:36Z). It dropped the PDF and searched for other sources.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | works | The brief carried a PC fact (Codex Python) that turned out to be half of the answer. |
| 2 Trigger | not_specified | As C3a. |
| 3 Query | works | Verbatim. |
| 4 Match | strains | Returns the clinic route. Its tmp/pdfs paths do not exist in EMS; the inflate route fits some PDFs only. |
| 5 Delivery | works | Subagent window. |
| 6 Use | strains | The best route here (pypdf in the Codex Python) needs the PDF entry joined with the Python fact. The Sonnet agent made that join unaided, checked by running it. The Opus agent gave up on the source. |
| 7 Check | works | Pages of text, or not. |
| 8 Ladder | not_reached | Sonnet solved it; Opus did not. |
| 9 Capture | not_specified | Who records the pypdf route, and as a third sibling or a revision, is not said. |
| 10 Afterlife | breaks | pypdf lives in another app's private runtime, rewritten by that app on 10-21. A stored path to it can change with no event here. |

**What worked:** a curated machine block in the brief cut recovery from about 8 calls (C3a) to 2.

---

## C4a. git "Filename too long" in parallel refuters, then the cause went away

**Entry as written** (2026-11-03 about 13:55Z, Opus 5.5, `P/…knowledge-store-research-9c609c/f3bbe503-…/subagents/workflows/wf_2e148d62-c8f/agent-a49d44b2bf294a604.jsonl`, fix at line 195):

> Symptom: git add, clone or cherry-pick inside the session scratchpad fails "error: unable to write file .git/objects/…: Filename too long" or "could not open directory …: Filename too long". Cause: the scratchpad path (Temp\claude\<long project folder>\<session id>\scratchpad, about 170 characters) plus .git/objects paths pass Windows' 260-character limit; core.longpaths is not set globally. Fix: in the throwaway repo run `git config core.longpaths true` (repo-local) before `git add`. Check: `git add -A` succeeds.

**Later moments.** Five more error-flagged results in the same workflow, 13:57:46Z to 15:20:58Z, each by another Opus refuter (six agents in all by flagged errors; the case list counts seven by raw mentions). Each succeeded on its next call 7 to 12 seconds later (agent-a7ad479c5fdb3b99b 13:57:56Z; agent-a53192bd567ad2f7f 15:17:05Z; agent-a0846d550de6bb213 15:19:54Z). On 2026-11-04 session c1797e48 failed 15 of 15 clones (memory note) and wrote the note at 07:09:40Z. Between 09:02Z and 10:33Z that day the harness switched to a short scratchpad path. No git "Filename too long" error appears in the record after 11-03 15:20Z.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | Refuters building throwaway repos in the scratchpad. Nothing in the window. |
| 2 Trigger | not_specified | A git error in a scratch repo is not a KS trigger. |
| 3 Query | works | "Filename too long" verbatim. |
| 4 Match | works | Exact. |
| 5 Delivery | strains | Siblings run in parallel. An entry written mid-workflow reaches only agents started after it, and only by pull. |
| 6 Use | works | One flag. |
| 7 Check | works | `git add` succeeds or not. |
| 8 Ladder | not_reached | All Opus. |
| 9 Capture | strains | None of the six had capture duty; each found its way out alone. The note came next day from another session, after 15 more failures. |
| 10 Afterlife | breaks | A harness update removed the cause about three hours after the note. The note still says "path ~170 chars". No repository event marks a harness change. |

**Saved:** zero to one call per agent; recovery already took one call. Delivered before cloning, it would have saved the 15 failed clones of 11-04.

## C4b. ENAMETOOLONG: the words match the wrong entry

**Entry as written:** the C4a entry, and the C2a entry for long commands.

**Later moments.** Four errors "ENAMETOOLONG: name too long, uv_spawn":
- 2026-11-01 16:32:57Z, clinic Opus agent-a8f87cc1755bb407b: command 35,963 characters.
- 2026-11-04 07:16:27Z and 07:17:21Z, Sonnet agents agent-a2fa412b950585cc9 and agent-a3e7db6491f3d65d7 (wf_4865cc40-888, the session that wrote the long-paths note seven minutes earlier): 40,362 and 54,554 characters. Their transcripts contain no "longpaths".
- 2026-11-10 06:15:27Z, Codex-project Sonnet agent-a338a7d9b982d5134: 34,385 characters, already on the short scratchpad path.

All four exceed Windows' 32,767-character command line. Two contain no git.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | Agents pasting very large scripts into one Bash call. |
| 2 Trigger | not_specified | As above. |
| 3 Query | strains | The error words name a path ("name too long"); the cause is command length. The query carries the wrong cause. |
| 4 Match | breaks | "name too long" is a substring of "Filename too long". KS matches templates by trigram fragments of 3 or more characters (KS L256), so the git entry is the hit. The right family (C2, "unexpected EOF") shares no word. |
| 5 Delivery | works | Mechanically. |
| 6 Use | breaks | `git -c core.longpaths=true` cannot shorten a 40k command; a shorter scratchpad path does not either (11-10 case). |
| 7 Check | works | The rerun fails again: one wasted call, then the agent has to diagnose anyway. |
| 8 Ladder | not_reached | |
| 9 Capture | strains | The agents' own fix (shorter commands, then Write) was never recorded. |
| 10 Afterlife | strains | After the path change the git entry is stale for its own symptom, yet still matches this one. |

**Saved:** negative: one wrong application per occurrence.

---

## C5. compare_digest on a non-ASCII str: the top tier wrote the bug

**Entry as written.** With a library from the start, the 2026-07-01 ops console solve (bfb5714, co-authored by Claude Opus 4.8) is what would be stored as a solved problem:

> Ops proxy-token gate. FastAPI dependency reads the `X-Ops-Proxy-Token` header; 401 if `settings.ops_proxy_token` is unset; constant-time compare with `hmac.compare_digest(x_ops_proxy_token or "", expected)`; 401 on mismatch. Tests: router tests with right, wrong and missing token pass.

**Later moment.** 2026-07-08, commit 834311f (co-authored by Claude Fable 5): the WhatsApp webhook needs a verify-token compare and a signature compare. It wrote `hmac.compare_digest(token, configured)` and `hmac.compare_digest(expected, header.removeprefix("sha256="))`. No test failed. The defect was found on 07-28 by review (2fe77f5, co-authored by Claude Opus 5): "hmac.compare_digest raises TypeError on non-ASCII str operands … turning auth checks into unhandled 500s". After that, CLAUDE.md carries the rule and backend/app/core/security.py carries `compare_secret`.

Second later moment, after the fix: any edit near identity/security.py:44 (`hmac.compare_digest(digest.hex(), hash_hex)`, PIN hash, 2026-06-06, Opus 4.8). Both sides are hex from `hash_pin`, not request text.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | works | The 07-08 author had ops/deps.py in the repository either way. |
| 2 Trigger | breaks | Nothing failed. Writing new code is not a KS trigger; `--diff` warns only on stored hazards, and none existed before 07-28 (KS L447). |
| 3 Query | strains | If asked: "constant-time compare of a webhook token in FastAPI", a prose query. |
| 4 Match | breaks | It returns the ops gate "solution", which contains the defect. A top-tier model stored it as solved. |
| 5 Delivery | works | Mechanically. |
| 6 Use | breaks | Copying the stored pattern spreads the defect to a public webhook. That is what happened without a library. |
| 7 Check | breaks | Tests passed. Output "equal to the strong model's" was the defect. |
| 8 Ladder | breaks | Both writers were the top rung of their day. The bug surfaced only through a later review. |
| 9 Capture | works | The 07-28 fix is a clean capture: helper, seven tests, per-site tests, a CLAUDE.md rule. KS can hold it as a do-not-apply entry with an `ident` handle for `--diff` (KS L261, L447). |
| 10 Afterlife | strains | The handle `hmac.compare_digest` also fires on the safe PIN check, an Opus-reserved area. The stored tests cover the three fixed sites and the helper, not a new site. The JS variant (`timingSafeEqual` length guard) shares no identifier. |

**What worked:** after 07-28 the always-loaded CLAUDE.md rule did the job without any lookup; the record shows no new unsafe compare on main.

---

## C6 (added case). Subagent report-file refusal

**Source.** errors.jsonl: 10 results "<tool_use_error>Subagents should return findings as text, not write report files. Include this content in your final response instead.</tool_use_error>". Memory: `P/C--Bilal-Migration-…-24-Clinic-Workshop/memory/subagents-return-text-not-files.md` (2026-11-01 16:52Z).

**Entry as written** (the clinic note, same session as the two refusals at 16:32Z and 16:34Z, files analysis-ai-ux.md and analysis-design.md):

> In this app's harness, subagents cannot write report files (the harness refuses the Write); ask them to return the full result in their reply and save it yourself. … Sonnet extractors did manage to write files earlier in the same session, so the refusal may depend on the agent type or output size; plan for the reply route either way.

**Later moment.** 2026-11-12 06:56Z to 07:43Z, EMS session e24f17dc (main Fable 5.2) launched workflows whose briefs told each subagent to write `report.md` in the scratchpad. Eight subagents were refused. In the same workflows that day, 22 other `.md` files (NOTES.md and similar) and 156 `.js` files were written by subagents without refusal. The EMS memory folder has no such note.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | The brief, written by the main session, asks for report.md. |
| 2 Trigger | breaks | The error fires in the subagent. The cause is the brief, in the main session, which sees no error and has no trigger. |
| 3 Query | works | Verbatim. |
| 4 Match | strains | The entry's condition is wrong: "agent type or output size". The record points to the file's name (report, analysis) instead. |
| 5 Delivery | breaks | Delivered to the one window that cannot change the brief. |
| 6 Use | works | Return text. The error message already says so; the library adds nothing. |
| 7 Check | works | Immediate. |
| 8 Ladder | not_reached | |
| 9 Capture | strains | Captured the same day, but over-general. The writer saw two refusals and one counter-example and could not tell which detail mattered. |
| 10 Afterlife | breaks | Stored in clinic memory only; EMS repeated it eleven days later. Read as "subagents cannot write files", it would also push NOTES.md and script writes into replies. A harness behaviour can change with a version. |

**Saved:** nothing; the error text carries its own remedy.

---

## Breaks, clearest first

1. **Delivery is not use** (new). In C2a the entry was in the window at line 6, or twice after a compaction, and four agents still failed, one of them the note's writer. In C1b the project's own `uv run` command was in the window and the agent typed `python`. The C2 condition is the size of the agent's own next output, which it does not measure. The tool description in the same window says "use a heredoc".
2. **Parallel siblings and later waves repeat it before any entry can exist** (known 31, 16). C2b: four agents in six seconds. C3a: wave 1 hit it within 40 seconds, four seconds before the parent; wave 2, 5.5 hours after the parent solved it, still hit pdftoppm and python. C4a: six refuters in 86 minutes.
3. **PC and harness facts change outside any repository, often by agents themselves** (known 18). gh installed six minutes after "no gh" was committed; uv installed hours after "no uv" was stored; the scratchpad path changed about three hours after the long-paths note.
4. **A stored "no" was wrong when written and is never caught by a failure** (known 19, 8). "no Python" (53f3a5c) while a Python had been used since 10-06; HARNESS-REVIEW:276 calls it wrong "in the design doc and memory". C6's "cannot write report files" is half-true.
5. **One error, different right answers per project** (known 34, 3). C1b: node or Codex 3.12 vs the clinic's uv 3.13. C3b: the clinic route's paths do not exist in EMS.
6. **Matching on error words returns the wrong cause** (known 3, 2). C4b: "name too long" is a substring of "Filename too long"; the cause is a 34k-55k command.
7. **The ladder adds nothing for these facts** (new). Opus, Sonnet and Fable fail identically; the top tier wrote C5's bug.
8. **The trigger arrives after the cost** (new). C2: the failed 8.6k-18.6k call is the cost. C4b: a 35k-55k command is lost. C5: no error at all.
9. **The lookup costs about what the recovery costs** (known 10). C1b, C4a, C6: recovery took one call; a lookup is one more round trip on a 63k+ context (KS L476).
10. **Side stumbles are never "the problem solved", so capture does not fire** (new). C1: 29 days to a note, inside a git note. C3: never recorded. KS needs a mainline fix commit and a control pair.
11. **The library would have spread a top-tier mistake** (known 8, 21). C5: the stored ops gate was the template for the webhook's defect.
12. **The error and its cause sit in different windows** (new). C6: the subagent is refused; the brief writer sees nothing. C3a: the parent knew; the briefs did not say.

Also seen, not in the twelve: compaction dropped the Python fact (C1a, known 17); C5's stored tests cover the fixed sites, not the next one.

## What did not break, or mattered less

- **Failure is not visible from inside (23):** for C1-C4 and C6 failure is loud and immediate (exit 49, exit 2, tool errors). Only C5 was silent.
- **The judge of "equal output" is the expensive model (4):** here the shell or tool decides, for free.
- **Two checked answers do not make a checked merge (14):** in C3b a Sonnet agent joined two partial facts (Codex Python, PDF limit) and the join was checked by running it.
- **The first time is full price (11):** the first time cost 1 to 8 calls.
- **The strong model does not record the cheap model's mistakes (28):** the strong models made exactly these mistakes.
- **Many short subagent windows start empty (16), in part:** same-folder subagents receive CLAUDE.md and the memory index at line 6. What they lack is what the session learned since the last memory write.

## Where the design would have helped

- **C3a:** a stored route served to wave 2 would have cut 2 to 8 calls per agent. C3b shows the size of the gain: a brief's machine block brought recovery to 2 calls.
- **C4a:** the fix is one flag with an exact error template; served before cloning it would have saved the 15 failed clones of 11-04.
- **C1 in EMS after 11-04:** with the fact pushed into every EMS window, the record shows no stub error in EMS folders after 11-04 07:10Z. Session 701c2346 folded `which node python python3` into its first call and never failed. The condition (the word "python") is visible in the action the agent writes.
- **Query and match on verbatim errors (C1, C2, C3, C4a):** the error templates are exact and distinctive; lexical matching finds them.
- **C5 after the fix:** a rule pushed through CLAUDE.md, plus KS's `--diff` ident warning, covers a repeat of the exact identifier.
