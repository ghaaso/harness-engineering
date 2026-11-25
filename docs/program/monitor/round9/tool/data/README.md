# data/: two measured facts for the session tool

Made by `../src/measure/links.mjs` and `rw.mjs` (shared code in `common.mjs`); run `node links.mjs`, `node rw.mjs`. Parts come from `round8/clickable/shared/data.js`.

- `links.json`: `parts[id]` = links from that part's files to other parts' files (`how` = link, import, names; first line per file); `files[id]` = the real files the part's pattern expanded to.
  Markdown links and relative imports are resolved against the file's folder. "names" = the other part's repository path (or, for big parts, its folder) written anywhere in the text; a bare file name such as CLAUDE.md counts only as a whole word.
- `rw.json`: `session id -> part id -> {read, write}` for Tue 24 Nov (tool calls from 00:00 local), the session's transcript plus its helpers'. Read = Read, Grep (path), Glob; write = Write, Edit, MultiEdit, NotebookEdit and Bash commands with `>`, `>>`, `tee`, `cp`/`mv` destination, Set-Content, Add-Content, Out-File.

Misses:
- Dummy parts (skills, git, slash command, 4 helper kinds) and the tool parts have no files: no links, no counts. Tools are not counted as reads.
- Bash reads (cat, sed, grep in a command) are not counted; Grep/Glob without a path are not counted. A Grep or Glob on a folder counts for the parts whose files sit in it (guess by a sample name).
- Paths built at run time (variables, `$(...)`, node scripts that write files) are not seen; relative Bash paths use the call's recorded working folder. Heredoc bodies are dropped, so a `>` inside code is not taken for a write, but odd quoting can still fool it.
- Patterns with "..." (design-record, build-docs, measurements) hold only the names listed; `store:memory` and `store:run-folders` count in rw.json only (outside the repository).
- Links: dynamic `import()` with a variable, links written without the folder, and parts with more than 300 files (evidence, task table) as the source are not read. Files from the working tree today, not from the commit of the day.
