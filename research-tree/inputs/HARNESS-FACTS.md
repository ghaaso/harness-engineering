# Facts about the harness and this machine (what can actually be made to run)

Stated by the coordinator on 2026-11-16. "Observed" was seen today; "believed" is not verified.

## The app

1. **Sessions.** A session is started with a brief, in a folder, optionally in its own git worktree and
   branch. The session that started it receives a note (the first 400 characters of the child's latest
   report) when the child ends a turn. It can send the child a message, read its state, read how full
   its context window is, and stop its running turn. Only a session can start, message or stop a
   session: a script cannot.
2. **Turns.** A session is active only during a turn. A turn starts on a message from the owner, on a
   note from a child session's turn end, or on the exit of a background command the session started. A
   background command (for example a Node script) keeps running after the turn ends. Observed: the
   completion of background work reaches a session that is in the middle of a turn at its next tool
   call, as a notification.
3. **Helpers.** Started by a session with a brief. The model tier can be chosen. A JSON schema can be
   imposed on a helper's result: the harness validates it and a non-conforming result is retried. A
   helper's tools are those of its agent definition file in the folder (`.claude/agents/<name>.md`),
   which can restrict them (believed: for example web search and web fetch only).
4. **Enforcement points the harness runs itself** (believed, being checked against the documentation):
   tool permission rules (allow and deny lists in a settings file) and hooks (a script the harness runs
   before or after a tool call; a hook that runs before a call can refuse it). Both are configured in
   files in the folder, so a session could edit them unless they are checked from outside.
5. **Transcripts.** Every session and helper writes a JSONL transcript on disk holding each tool call
   and the token usage of each model call. Session transcripts are under
   `C:/Users/User/.claude/projects/<project-folder-name>/<session-id>.jsonl`; a workflow's helpers under
   `.../<session-id>/subagents/workflows/<run-id>/agent-<id>.jsonl` with an `agent-<id>.meta.json`
   beside each, and a `journal.jsonl` per run. A script can read them.
6. **The usage meter** (percent of the week, whole percent) can be read only by a session.
7. **Web.** The fetch tool returns a short summary of a page written by a small model (observed: 900 to
   2,000 characters), not the page's text. Node 24 has `fetch` built in, so a script can fetch a page's
   own text; that needs the owner's word before it is used on the real web.
8. **Sleep.** The PC goes to sleep after 15 idle minutes unless a session is in a turn or holds a
   keep-awake request, which lapses about five minutes after the session goes idle. Whether a background
   script alone keeps the PC awake is not verified. On wake every process resumes where it was.

## The machine

9. Windows 11 Pro, NTFS (rename within a volume is atomic; exclusive create is the `wx` flag). AMD Ryzen
   9 7900X: 12 cores, 24 threads. 31 GB of memory, about 10 GB available today. Node.js 24 is the only
   runtime: no Python, no packages to install. git is present. PowerShell 5.1 is present
   (`powershell -NoProfile -Command ...`), which is the way to read another process's start time or
   command line.
10. **Processes, observed today.** Each open session runs as its own `claude.exe` process whose path is
    `...\Claude-Data\...\claude-code\<version>\<hash>\claude.exe` and whose command line starts
    `--output-format stream-json --verbose --input-format ...`. Five were alive for five open sessions,
    150 to 400 MB each, each with one or two child processes. Whether the command line or anything else
    visible to a script names the session's folder or id is not known yet (a probe is looking).
11. Other programs on this PC are the owner's and are never touched: browsers, chat apps, Docker
    containers named `postiz*`, the Codex app's node processes. A script never kills a process unless it
    can prove the process belongs to the attempt it is stopping.

## People

12. The owner is one person, reachable by chat, not continuously present. Nothing is installed,
    downloaded or trained without his word. Changes to his user-level settings are his to make.
