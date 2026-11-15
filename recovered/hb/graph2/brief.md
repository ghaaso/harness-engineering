# Brief: how to build a code-and-document graph properly, and how to test it fairly (2026-11-12)

## Why this research exists
The owner of a software project asked whether a graph database that stores the repo's semantic relations and real connections, with caching, would give coding agents a lot of information in a small size and so cut token use. The orchestrator built a quick graph and concluded "no graph database, no cache, few tokens to win". The owner rejected that test. Their words:

> comparitively graph database size was bigger than the relational store, but doesnt the way it stores it the datastructure make a different in the answer it get back? are you properly scoring the two answers and the value they carry? and the type of graph we make makes a huge difference including the algorithms we use on it we dont get anything for free, have you added optimizations so its catered to this repo enough for it to end up being better than the relational store and more token efficient? since we're using a establoished relational engine a merely self made graph vs a established relational engine is not a fair enough comparison, and i think the ems workshop is a much bigger project with much more history and would serve as the better test bed for this, and also doesnt how many hops we set thet traversel to also impact this? I think you did not work on the graph properly for it to even be used, First research on the best advanced optimized way of makling it and then start testing it against the relational store

The owner is right about the test. What was built: a file-level graph (imports by name, test mocks, docs citing files) held as a JSON list in memory, compared with the same edges in a SQLite table, on one query (everything that depends on a file, unlimited hops). No real graph engine was tried. No ranking, no hop tuning, no typed cross-runtime edges, no symbol-level calls. The "would it help" judgement came from 200 searches sampled from a different project's sessions.

## Your stance
The earlier conclusion is in dispute. Do not defend it and do not attack it. Find what the evidence supports. Report what would make a graph approach win as carefully as what would make it lose. The deliverable of this research is the best way to build the graph and the fairest way to test it, not a verdict.

## The project (the test bed)
- A workshop-management product in one monorepo with three runtimes: a FastAPI backend (Python 3.12, SQLAlchemy async, Alembic, 12 feature slices as router -> service -> repository), a React web app (JS/JSX, Vite), an Expo React Native app (TypeScript). 618 tracked files, 477 code files, about 2.5 MB of code, 48 markdown docs in git plus many more untracked program docs.
- The same capability is a same-named folder in each runtime. Clients call the backend over HTTP (about 73 URL literals against 77 route decorators). Slice boundaries are enforced by import-linter contracts. The repo's CLAUDE.md lists invariants, each tied to named files and functions.
- History: 459 commits on all refs, 368 on main, 72 with a subject starting "fix", from 2026-05-31 to 2026-11-09.
- Recorded agent sessions for this repo: 1,008 transcripts from October and November 2026, but they are almost all document and research work (767 edits, only 10 on product code; 94 of 1,527 file reads on product code). The sessions that wrote the product code are not on this machine. A second project (a Django codebase) does have recorded coding sessions.
- What sessions cost (measured on the second project): about 27 % of context tokens is content fetched by reading and searching; calls that only read or search are 54.7 % of calls and re-read 43.6 % of context tokens. A model step takes about 6.6 s at the median; a file read takes under 1 ms.

## The machine
Windows 11, 31 GB RAM with about 11 GB free, Node 24 (node:sqlite built in), the TypeScript compiler in technician-app/node_modules/typescript, a Python 3 interpreter at C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe (the `python` on PATH is only a store stub), Docker Desktop (not running by default), uv, npm. Nothing new may be installed without the owner's decision, so do not install anything: say what would need installing, from where, and how big it is.

## Rules
- Web research: use generic queries only. Never put the owner's name, the project's name, its file paths or any project detail into a search or a request to an outside service.
- For every source say whether you fetched and read it or saw only a search snippet. Give the date of the source. Prefer primary sources (papers, official docs, repositories, engineering posts by the builders) over summaries. Report negative and null results as carefully as positive ones. It is November 2026: look for what changed in 2025 and 2026.
- The repo at C:/Users/User/Documents/projects/EMS_workshop1 is READ-ONLY: do not edit, create, stage or commit anything in it.
- Write only inside your lane folder. Put a full report.md there (method, sources, findings, what you could not check) and any script you write.
- Bash on this PC: commands over about 8 KB are cut silently; in a heredoc a doubled backslash collapses to one.
- Your final structured output is data for an orchestrator, not a message to a person. Plain statements, numbers with their context.
