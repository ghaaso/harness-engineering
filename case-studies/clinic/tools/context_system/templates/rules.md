# Context system

This project sets an auto-compaction window, so Claude Code summarizes the conversation once context passes the configured threshold (one step can overshoot it). Hooks steer that summary, restore a saved snapshot of the task state afterwards and keep the full history searchable. Work continues in the same conversation; a manual handoff to a new chat is not needed because the window is large.

## Context habits

- The main thread orchestrates. Whole-document reading, corpus or third-party-doc surveys and log trawls go to subagents or workflows that return at most about 2,500 characters of findings with path:line evidence and write anything longer to a file.
- Read files with the Read tool rather than Get-Content or cat. Large files return a first page and an outline; read further ranges with offset/limit.
- Files over about 300 lines are created by a subagent, workflow or generator script. The same file is never rewritten in full twice; later changes use Edit.
- Reusable scripts run from a file path; workflows are re-run with scriptPath rather than resending the script.
- A draft written to a file is not also printed in chat.
- The task's state file (docs/tasks/<id>/task.md) stays current at milestones. Keep its Next action, Decisions, Ruled out and Open questions sections concise: those sections are restored verbatim after compaction when they fit, and the summary is told exactly which ones were.
- When a needed detail is missing after compaction, search the exact history before re-reading or re-deriving it; the command is given in the context-system note.

## Compact Instructions

When summarizing this conversation for compaction:
- Keep every user instruction and correction near-verbatim, with the work it governs; a later correction overrides the earlier instruction and both must be visible.
- Keep decisions with their reasons, and approaches tried or rejected with why they failed.
- Keep exact file paths with line ranges, commands, identifiers, numbers and evidence-status labels (REPORTED, OBSERVED, DOCUMENTED, INFERRED, PROPOSED, UNKNOWN); never upgrade an inference to a fact.
- For each file created or changed: what changed, why, and whether it was verified.
- Keep open questions, unresolved failures with how to reproduce them, unfinished work and the precise next action.
- Prefer pointers (path:lines, result file paths) over restating long content that is on disk.
