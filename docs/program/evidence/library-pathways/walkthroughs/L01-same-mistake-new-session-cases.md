# L01 Same mistake, new session: real cases

Facts only. No judgment of the design. All paths are read-only sources.

Method. A node script (scratchpad/sim/scan.cjs) read 2,233 transcript files (main sessions and subagent transcripts) in C:/Users/User/.claude/projects, skipping three unrelated folders (house-expenses, lecture-stuff, compiler-construction). It kept 1,569 tool results marked as errors (scratchpad/sim/errors.jsonl) and grouped them by normalised text. Counts below are error results, not whole calls. Dates are UTC from the transcript timestamps. "Top-level sessions" counts distinct main-session ids; subagents of one session are counted inside it.

Transcript root used in the paths: `P` = C:/Users/User/.claude/projects

---

## Case 1. "Python was not found": no python on this PC

**Who / when.** 92 errors in 30 top-level sessions, 19 project folders (both repositories, their worktrees, a slides project, scratch workspaces). First on 2026-10-06, last on 2026-11-10. Models seen: Opus 5.5, Sonnet 5.5, Fable.

**What happened.** An agent runs `python ...` (often inline code to read JSON or crop an image) in Bash or PowerShell. Windows answers with the Microsoft Store stub. The agent loses that call and then switches to node or shell. The same text came back in every new session because no session had a place to keep the fact until 2026-11-04.

**Exact error text (all 92).**
`Exit code 49` then `Python was not found; run without arguments to install from the Microsoft Store, or disable this shortcut from Settings > Apps > Advanced app settings > App execution aliases.`

**Cost per recurrence.** Usually 1 failed call plus 1 retry in another tool. Sometimes a probe chain:
- 2026-10-06, `P/C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop/1f10835f-2b37-41f3-8e26-19465c7ea685.jsonl` (id toolu_01VYZReC8V3WNYBTDEXsgr9a): the agent searched the disk for python.exe with `Get-ChildItem ... -Filter python.exe -Recurse` and found only `C:\Users\User\AppData\Local\Microsoft\WindowsApps\python.exe` (the stub).
- 2026-10-06, session `2d443524-e65c-40cb-9f2b-07f620551390.jsonl` (id toolu_01Qxe3B62Y4NrJ45hRVnd4N8): a 5-command probe of python, sys.executable and libraries, three of them failing.
- 2026-10-16, workflow `e56a900a-.../subagents/workflows/wf_28ac3c81-046/`: 13 of its 17 agents hit the stub, 32 error results in total (counted by a raw text count over that folder).
- 2026-11-10, `P/C--Users-User-Documents-Codex-2026-11-06-use-x20-outputs/cb6de26d-26bf-4f5d-80a0-7e4293a73571/subagents/workflows/wf_496e1bf6-7e3/agent-a3414a3a052852ff2.jsonl` (toolu_01H72p9B5vdaLNrsMz6ovf7e, model claude-opus-5-5): `python -c "from PIL import Image ..."` failed; next call looked for sharp/jimp/canvas/magick, which also failed (`which: no magick in ...`), then the agent fell back to reading the PNG directly. About 3 calls lost.

**Same-session rediscovery with the note already being written.** 2026-11-04 07:09:14Z, subagent `P/C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-wizardly-hertz-02c46a/c1797e48-a50d-4211-bcb0-c92d7dca8e04/subagents/workflows/wf_4865cc40-888/agent-a150b1d3d987c63c0.jsonl` ran `python3 - <<'E' 2>/dev/null || python - <<'E2'` and got exit 49, twice in one command. The memory file below was modified at 07:09:40Z in the same session, and another subagent of that session (agent-a20e8b984bd298eab) hit it again at 07:10:01Z.

**Evidence of what was written down.**
- C:/Users/User/.claude/projects/C--Users-User-Documents-projects-EMS-workshop1/memory/project-windows-git-longpaths.md, last sentence of the body: "`python` is not on PATH in Git Bash (Windows Store alias) — use `node` for JSON." The fact lives only inside a note titled about git long paths. Frontmatter `modified: 2026-11-04T07:09:40.606Z`, `originSessionId: c1797e48-a50d-4211-bcb0-c92d7dca8e04`.
- C:/Users/User/Documents/projects/EMS_workshop1/CLAUDE.md contains no statement that python is absent (its only "Python" is the backend's 3.12). Checked by reading the file given in the task context.
- MEMORY.md line for that note: "clones into the scratchpad need `git -c core.longpaths=true` per command; cone-mode sparse checkout; no `python` on PATH".

**Later moment (the fact was needed again).** After the note existed (2026-11-04 07:10Z onward) the error came back 24 more times, in other project folders whose memory directory is different from the EMS one. Examples:
- 2026-11-06 `P/C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop--claude-worktrees-competent-haibt-056aa2/96abd742-0df4-432f-af10-fdd02106ff9f.jsonl` (toolu_01EunKqUg2WG7bKDADYVbgJ8).
- 2026-11-09 15:08Z `P/C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop/7f348b2c-75ba-41bd-8132-d395ef24a5f6/subagents/agent-a87e4f07079fc62e5.jsonl`: a command `python -I -c "import json..."` to compare measure files.
- 2026-11-09 15:17Z, session `.../unruffled-sammet-a4991f/7b3031d3-2a92-413b-9858-440b5218de16.jsonl`.
- 2026-11-10, five more in the Codex slides project (wf_ffa912b1-67d, wf_b958e1de-e10, wf_496e1bf6-7e3).

**Sources.** errors.jsonl in the scratchpad sim folder; the transcripts above; the memory file above.

---

## Case 2. Bash heredoc truncated: "unexpected EOF while looking for matching"

**Who / when.** 125 errors in 37 top-level sessions, 26 project folders, 2026-10-31 to 2026-11-12. Opus 5.5, Sonnet 5.5, Fable 5.1 and Fable 5.2 all hit it (model read from the tool_use line of each failing call).

**What happened.** An agent writes a whole file with `cat > file <<'EOF' ... EOF` inside one Bash command. When the command is long, bash sees it cut off and the heredoc or a quote never closes. The file is not written (or is cut mid-line). The agent then re-sends it through the Write tool.

**Exact error text.** `Exit code 2` then `/usr/bin/bash: -c: line 77: unexpected EOF while looking for matching `''` (line numbers vary 32 to 147; the closing character is `'`, `"` or `)`).

**The size pattern.** I measured the command length of the failing calls from 2026-11-09 on (scratchpad/sim/len.cjs): 33 calls, min 7,054 characters, median 10,788, max 26,542. All but a few are over 8,000. The recovery call after each was usually a `Write` tool call (the next call in 21 of the 33 lists). Examples:
- 2026-11-10 07:52Z, four agents of one workflow in the Codex project, within 7 seconds of each other (wf_b4e7b31a-874: agent-a093c054bbd61c304 11,174 chars, agent-a53bd0e61f0b85fbe 10,614, agent-ad456b7b1f3f0f8fa 10,788, agent-af94f9f2d3be6520f 10,341). All four used `cat > aNN.mjs <<'EOF'` to write a slide file.
- 2026-11-10 06:11Z, wf_b958e1de-e10: two Sonnet agents with 20,885 and 26,542 characters; each then called Write and ended.
- 2026-11-04 07:10Z, `P/.../wizardly-hertz-02c46a/c1797e48-.../subagents/workflows/wf_4865cc40-888/agent-a79089c5db152d4be.jsonl` (toolu_014SUAHMAaYz4JkJJXaA5ivi, `line 52: unexpected EOF ... matching `''`).
- Peak day 2026-11-04: 40 errors.

**Evidence of what was written down.** C:/Users/User/.claude/projects/C--Users-User-Documents-projects-EMS-workshop1/memory/reference-bash-tool-limits.md (file time 2026-11-11 12:05 +05:00 = 07:05Z): "A single Bash command longer than roughly 8 KB is truncated silently; a heredoc then runs to end of input and the file is cut mid-line. Write long files in parts of under about 6 KB and append, then check the tail." Second point in the same note: "A double backslash inside a heredoc arrives as a single one". The note is not in CLAUDE.md.

**Later moment.** The error appeared again after the note existed:
- 2026-11-11 07:14Z to 10:13Z, four Sonnet subagents in the same session that wrote the note (`P/C--Users-User-Documents-projects-EMS-workshop1/701c2346-b7e4-4d4c-9b66-800d834d86a3/subagents/agent-a178b624a8849ab6f.jsonl` 10,247 chars, agent-a4ed4e45a7936a1ad 18,605, agent-a92afbf95ceeee4dc 11,193, agent-ae3be856724c34a1a 11,162). Each next call was `Write`.
- 2026-11-12 08:04Z, main session `e24f17dc-4aea-4914-a9d1-280a723d620e.jsonl` (toolu_01CE99UrKWfrSJoNB54DrqbL, model claude-fable-5-2, 8,603 chars), and 09:03Z a subagent of it (agent-ac87b7810321410f1, 8,286 chars, Opus 5.5).
Whether those subagents were shown the note is not visible in the records I read.

**Sources.** errors.jsonl; len.cjs output; the transcripts named; the memory file.

---

## Case 3. Read tool on a PDF: "pdftoppm is not installed"

**Who / when.** 77 errors in 13 top-level sessions, 10 project folders, 2026-10-16 to 2026-11-12. Opus 5.5 and Sonnet 5.5 (from the nearby calls).

**What happened.** An agent calls Read with `pages` on a PDF (`{"file_path":"...pdf","pages":"1-10"}`). The Read tool needs poppler's pdftoppm to render page images; this PC does not have it. The agent retries other page ranges, then probes for tools, then finds some other route (pre-extracted text, WebFetch/WebSearch, or reading text files that exist).

**Exact error text.** `pdftoppm is not installed. Install poppler-utils (e.g. `brew install poppler` or `apt-get install poppler-utils`) to enable PDF page rendering.`

**Cost per recurrence.** The biggest block is one workflow: `P/C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop/e56a900a-414d-4ba1-9311-f3879c1b3495/subagents/workflows/wf_28ac3c81-046/` (2026-10-16, source file `.../24_Clinic_Workshop/sources/MD Health Clinic Inventory final.pdf`). 16 of its 17 agent transcripts contain the error, 56 times in total (raw text count). In `agent-aa3f0e4f280ba92ec.jsonl`: three failed Reads (pages "14-15", "38-41" and one before), then `python -I -c ...` (stub error, see Case 1), then a PowerShell `Get-Command py, python3, node, pdftotext, mutool, qpdf`, then a Glob for page text that found existing `tmp\pdfs\learning-review\page-01.txt ...`, and finally `Get-Content` on `tmp\red-team-2026-10-03\pdf-text\MD Health Clinic Inventory ...` files. About 8 calls before useful reading began. This same workflow also shows 13 agents hitting the Python stub, so one missing-tool fact was paid for twice per agent.

Other recurrences: 2026-10-22 two subagents in parallel (Independent_Strategy_and_Economics_Assignment.pdf pages 1-10 and 11-19, 0.25 seconds apart); 2026-10-27 `scratch-2026-10-27-5920e6/16039015-...jsonl`; 2026-10-29 FixFlow `CODE-MAP.pdf` pages 1-10; 2026-11-02 scratch `8ce190ca-.../scratch-2026-11-02-757635`.

**Evidence of what was written down.** I found no memory note, CLAUDE.md line or doc that mentions pdftoppm or says Read cannot render PDFs here (grep of the memory folder file list and CLAUDE.md by reading; the memory index has no entry). The only trace of a workaround is the pre-extracted text files in the clinic repo's `tmp/pdfs/` and `tmp/red-team-2026-10-03/pdf-text/`, which an agent found by Glob.

**Later moment.** Recurs on 2026-11-12 (today in the record): `P/C--Users-User-Documents-projects-EMS-workshop1/e24f17dc-4aea-4914-a9d1-280a723d620e/subagents/workflows/wf_548351eb-ab1/agent-a510cf512155b200a.jsonl` (07:34Z, toolu_01CX5XtgREtbLeE239gKbMET) and agent-ae0c7fdf718a88b1f (07:26Z); both were Reading a PDF saved by WebFetch into `.../e24f17dc-.../tool-results/webfetch-1...`. Also 2026-11-04 07:09Z and 07:31Z in wizardly-hertz subagents (wf_4865cc40-888, wf_126b2d60-9d8). So the same failure hit 27 days after the first, in a project that never saw the clinic workflow.

**Sources.** errors.jsonl; the transcripts named.

---

## Case 4. Git clones and file writes in the scratchpad: "Filename too long" and "ENAMETOOLONG"

**Who / when.** 10 error results in 4 top-level sessions, 2026-11-01 to 2026-11-10 (the error-flagged subset; many more echoes of the text appear inside non-error output: 60 raw mentions in the 14 agents of one workflow).

**What happened.** The session scratchpad path is long (it embeds the full project folder name plus session id, roughly 170 characters). Agents clone or `git add` repositories inside it, or write files with long `cat > <path>`. Windows' 260-character path limit then breaks git object writes or process spawn.

**Exact error text.**
- `error: unable to write file .git/objects/b5/50b2b76d359d2e4988100d4868fb350caefc65: Filename too long` / `error: app/service.py: failed to insert into database` / `fatal: adding files failed` (2026-11-03 13:54Z, `P/C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-knowledge-store-research-9c609c/f3bbe503-2a20-4258-976b-7d457d3bf63a/subagents/workflows/wf_2e148d62-c8f/agent-a49d44b2bf294a604.jsonl`, toolu_01MB9rg7jrpFWkS5HP2Cm2C7, Opus 5.5).
- `warning: could not open directory 'backend/app/features/identity/tests/': Filename too long` (same workflow, agent-a3ad711f0cdad555c).
- `ENAMETOOLONG: name too long, uv_spawn` (Bash start-up with a long inline command and path; 2026-11-01 Clinic; 2026-11-04 07:16Z and 07:17Z; 2026-11-10 06:15Z Codex project).
Seven agents of workflow wf_2e148d62-c8f hit the git form between 13:54Z and 15:21Z on 2026-11-03.

**How an agent got out (in-session).** The agent that failed at line 190 of its transcript ran, at line 195, `git config core.longpaths true && git config core.autocrlf false && git add -A && git -c user.name...` and it worked. The fix lived in the repo-local config of a throwaway demo repo and was found again by each agent separately.

**Evidence of what was written down.** C:/Users/User/.claude/projects/C--Users-User-Documents-projects-EMS-workshop1/memory/project-windows-git-longpaths.md (modified 2026-11-04T07:09:40Z): "fail with `error: unable to open loose object … Filename too long` ... (seen 2026-11-04, 15 of 15 clones)" and "prefix each git command with the per-command option ... `git -c core.longpaths=true clone --filter=blob:none --depth 1 --sparse <url> <dest>`". It also says the owner's global git config does not set `core.longpaths` and nothing may be reconfigured without an owner decision.

**Later moment.** The ENAMETOOLONG text appeared after the note was written, in the session that wrote it: `.../wizardly-hertz-02c46a/c1797e48-.../subagents/workflows/wf_4865cc40-888/agent-a2fa412b950585cc9.jsonl` (07:16:27Z, toolu_01Kbzix9mLaPsNdg5RMqnjyS, Sonnet) and agent-a3e7db6491f3d65d7 (07:17:21Z). Its next call was a shorter grep, then a Write call: it routed around it without the note. On 2026-11-10 06:15Z the Codex-project subagent `.../wf_b958e1de-e10/agent-a338a7d9b982d5134.jsonl` got ENAMETOOLONG on a `mkdir -p ...; cat > ...` command. The scratchpad folder of the present session is a short id path (`.../claude/192654871f6b1294/...`), not the long project-name form; the record does not say why the path form changed.

**Sources.** errors.jsonl; the transcripts named; the memory file.

---

## Case 5 (code, not tooling). One mistake, three sites: `hmac.compare_digest` on a non-ASCII `str`

Different shape from Cases 1 to 4: the repeat is in code written in separate sessions and slices, found by a later review.

**What happened.** The ops proxy-token gate was written in commit `bfb5714` (2026-07-01, "feat(ops): standalone read-only ops console ..."). The WhatsApp webhook (verify token and signature header) was written in `834311f` (2026-07-08, "feat(messaging): customer_messaging slice ..."). Each compared a secret with `hmac.compare_digest` on a `str`, which raises TypeError on a non-ASCII operand, so one non-ASCII byte in an attacker-controlled header became an unhandled 500. A fourth variant sat in `ops-server.mjs`: a length guard on UTF-16 units against a `timingSafeEqual` on UTF-8 bytes (`'é'.repeat(len)` threw RangeError and killed the process). All were fixed together on 2026-07-28 in `2fe77f5` "fix: close four unauthenticated availability holes (#168)".

**Exact evidence.** Commit body of 2fe77f5: "**Three non-ASCII compare_digest 500s.** hmac.compare_digest raises TypeError on non-ASCII str operands. ... turning auth checks into unhandled 500s on the ops gate and on the PUBLIC WhatsApp webhook (verify token + signature header). Now routed through one core.security.compare_secret helper." Pre-fix line: `git show 2fe77f5^:backend/app/features/ops/deps.py` line 42 `if not hmac.compare_digest(x_ops_proxy_token or "", expected):`. Changed files include backend/app/core/security.py (new `compare_secret`, 34 lines) and backend/tests/test_security.py.

**What was written down.** C:/Users/User/Documents/projects/EMS_workshop1/CLAUDE.md, section Security, first bullet: "Compare shared secrets with `compare_secret` (`backend/app/core/security.py`), never `hmac.compare_digest` on a `str`... Three sites had exactly that hole". The rule is a CLAUDE.md invariant that every session sees.

**Later moment.** A current `hmac.compare_digest` call remains at backend/app/features/identity/security.py:44 (`return hmac.compare_digest(digest.hex(), hash_hex)`), i.e. the PIN-hash check, whose second operand comes from the stored hash. Whether it can see non-ASCII input I did not trace. The other uses (ops/deps.py:42, customer_messaging/router.py:154, service.py:155) are now comments naming `compare_secret`. The record shows no occurrence after the fix of a new `compare_digest` on request input; I did not search other branches.

**Sources.** git log of the three files; `git show 2fe77f5`; CLAUDE.md; backend/app/core/security.py:7 and :34.

---

## What I searched and what I did not find

- Searched: all error-flagged tool results in 2,233 transcripts, grouped by text. Top groups by number of sessions: bash heredoc EOF (76 sessions incl. subagents), Python not found (72), pdftoppm (47), Read "File content exceeds maximum allowed tokens" (18), WebFetch network errors (ECONNRESET, ECONNREFUSED, 11 and 10), "Subagents should return findings as text, not write report files" Write error (10), user-rejected tool use (12).
- Not written up as cases, but present: the Read-over-token-limit error (32 errors, 18 sessions, one project family) and the Write-refusal for subagents (10 sessions); no later-moment analysis done for them.
- The record holds no case in which a memory or CLAUDE.md note visibly prevented a repeat. Every recurrence I checked after a note was either in a subagent or a differently-scoped project folder; I could not see from the transcripts whether the note text was in that agent's window.
- Not searched: the three skipped project folders (house-expenses is 1.8 GB), and transcripts with lines over 3 MB (skipped by the scanner to stay safe).
