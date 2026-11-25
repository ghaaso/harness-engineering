# Round 8 research: the common brief (every researcher reads this whole file first)

## What this is for

The owner runs many AI coding sessions (Claude Code), each with helpers, leaves them running and comes back. He wants one
tool that is his front end to all of it: he gives prompts there and leaves; on a **Now** page he sees, by looking, what
is running and which real parts (each hook by name, scripts, skills, commands, helper kinds, tests, git) are at work and
what broke where; on a **History** page he sees what happened, in unbroken time; one click takes him to a session, a
double-click to a hook or file. Seven earlier rounds were rejected **on the picture**: tables, cards on empty grey, a
congested mesh of lines, abstract harness steps filled with numbers, red words like "hook failed" under a box, laggy
updates. The UI and UX must be very good: that is what he judges.

**Read first:** `docs/program/monitor/NEXT-ROUND-8.md` sections 1 and 3 (his words, unedited, and the approved goals,
numbered 1 to 13 with 8a and 8b). His words outrank this brief. Then `docs/program/monitor/round6/README.md` (what round
6 found: process maps and their "spaghetti", small multiples against animation, Kiali, GitLab, the Airflow grid,
Langfuse): build on it, do not redo it. Look at `docs/program/monitor/round7/crowded-v4.png` to see what was rejected.

## The data the tool has (so a finding can say what fits and what breaks)

Per session: start, end, the spans it was active, its plan steps with times, its reports, tokens, its window's peak and
its limit, who started it, its helpers (kind such as collect, build, refute; model; start; end; tokens), every call
with its time and tokens, every hook decision with time and detail (let through, refused, failed, not switched on) for
about 10 named hooks, commits, and which of about 60 named parts it touched (hooks, scripts, documents, agent kinds,
commands). Scale: up to 8 sessions and 20 helpers at once, about 40 sessions and 800 helpers a week, quiet gaps of
hours between busy stretches.

## How to research

- Find real products, real screens and real studies. Prefer what is in real use and what people who tested it report.
- **Read the source itself.** The web fetch tool returns a small model's summary, not the page: use it to find leads
  only, never as the basis of a claim. Read a page with headless Edge and look at it:
  - text: `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --user-data-dir="C:/Users/User/AppData/Local/Temp/edge-r8-<your id>" --virtual-time-budget=5000 --dump-dom "<url>" > <file>.html`
    then strip the tags with a short `node -e` script and read the parts that matter;
  - picture: the same with `--hide-scrollbars --window-size=1600,1000 --screenshot="C:/Users/User/Documents/projects/harness-engineering/docs/program/monitor/round8/research/<your id>/NN-name.png" "<url>"`,
    then look at it with the Read tool. To show one picture from a page, open the picture's own address the same way.
    Wrap each call in `timeout 60`; a call over about 180 seconds is moved to the background and you stall.
- **Every finding says how it is known:** screen seen, page read, summary only, or from memory.
- A screenshot of a page you viewed is fine. **No downloads** (no curl or wget of files, no PDFs saved), **no installs.**
  If a paper or page matters and is closed to you, list it as not read.
- **Privacy:** no project name, path, session title, identifier or code in any search or request. Search in generic
  words ("agent session monitor UI", "trace timeline viewer").
- Write only inside your folder `docs/program/monitor/round8/research/<your id>/`. Commit nothing.

## What you hand back

In your folder:
1. The screenshots, at most 15, named `NN-short-name.png`, each showing the thing the finding is about.
2. `findings.md`: one block per finding: what it is (one line); source address; picture file; how it is known; what it
   does for which of the goals (by number); what would break with our data and scale.
3. At its end, **the three ideas you would take into a prototype**, ranked, each in three lines at most, with its
   pictures, saying which goals it serves and why it would read at a glance.

Your final reply to the session that started you: under 150 words: the folder, how many findings, and the three ideas
in one line each. Stop at your token limit and say so.
