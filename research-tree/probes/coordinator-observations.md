# Observations by the coordinating session (2026-11-16)

- **A background command's exit reaches a session that is in the middle of a turn.** A command started in
  the background and set to exit after 25 seconds ended while the session was inside a 45-second
  foreground wait. Its completion arrived as a notification right after that tool call returned, in the
  same turn. So a watcher's or an alarm's exit is not lost when the coordinator is busy; it is delivered
  at the next tool boundary. Not observed: an exit during sleep, and an exit while the session is idle
  (documented by the tool as starting a new turn; relied on all day for workflow completions).
- **Session processes.** Five `claude.exe` session processes were alive for five open sessions, 155 to
  381 MB each (about 1.2 GB together), each with one or two child processes.
- **Memory and cores today.** 31.1 GB of memory, about 10 GB available (8 GB of it standby cache that the
  system reclaims by itself), commit 33 of 53 GB. Nothing started by this session was holding memory: no
  leftover containers, no stray Node processes. 12 cores, 24 threads. The graphics card has no use in
  this work (no model is trained or run locally).
- **Keeping the PC awake.** A session can hold a keep-awake request that lasts until it has been idle for
  about five minutes. This session kept its turn open with bounded waits during long background work.
