# C4: what the Claude Code app lets the tool do (Sonnet, collect, 2026-11-24)

Written by the round 8 session from C4's hand-back, as it reported it: its own write of this file was refused by the
Write tool ("return findings as text"). Sources: code.claude.com/docs pages read in headless Edge; read-only checks on
this PC. No session was started.

1. **Open a session in the app.** `claude --desktop --resume <cli-id>` is documented: it opens that session in the
   desktop app and takes a session id only; untested for a session already open. The protocol `claude://` is registered
   (HKCU); its only documented link is `claude://code/new?q=` (a new session with the prompt filled in). No `claude://`
   link to an existing session was found. The app's install folder could not be read. The app's
   `claude-code-sessions\...\local_*.json` files map the app's `sessionId` to the command line's `cliSessionId`.
2. **Open a file.** VS Code is not installed on this PC (no `vscode` protocol, no `code` on the path). No link opens the
   app's file pane. Whether a link clicked in the Browser pane starts a protocol handler is untested. The local program
   can open a file itself.
3. **Operate sessions.** The Agent SDK (streaming input, `interrupt()`, `canUseTool`) and `claude --bg` with
   `agents --json` and `stop` work for sessions the tool itself starts. Nothing documented sends a message to, answers,
   or stops a session started inside the desktop app. Peer messaging over a named pipe is blocked by inbound rules and
   the session's token. Sessions started from a program do not appear in the desktop app's sidebar.
4. **Live data.** Transcript lines are written about 150 ms apart (median, measured). Hooks of type `http` and async
   hooks are the fastest feed. `.claude\sessions\<pid>.json` lists the live sessions.

## What the tool can do today, and what it cannot (the session's reading of the above)
- Can: show live state within about a second (transcripts, hook logs, live-session list); open a session in the app by
  its id (`claude --desktop --resume`); start a new app session with a prompt filled in (`claude://code/new?q=`); start,
  prompt and stop sessions it starts itself (SDK or `claude --bg`), which then do not show in the app's sidebar.
- Cannot, as documented: message, answer or stop a session that was started inside the app; open the app's file pane;
  open VS Code here (not installed).
