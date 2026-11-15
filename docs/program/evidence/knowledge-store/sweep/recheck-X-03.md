# recheck:X-03

lane=X-03 tool_status=ok checks=7

- F01 ON_PAGE — https://github.com/jacereda/fsatrace
    quote: injects code into other applications in order to trace file accesses
    note: Unix make, Windows mingw outputs (fsatrace.exe, fsatracehelper.exe, fsatrace32.dll, fsatrace64.dll), macOS SIP and option letters incl. q=stat all confirmed. Releases heading exists with no entries listed. Last-commit date absence and the earlier 404s not checkable from the fetch. Page's output-format section seems to swap r/w descriptions.
- F02 ON_PAGE — https://ar5iv.labs.arxiv.org/html/2007.12737
    quote: On Linux, the total overhead is only 7%, of which nearly all (5%) comes from tracing.
    note: Also: LD_LIBRARY_PRELOAD on Linux; cannot trace direct syscalls (Go) or static binaries; cannot trace 64bit spawned by 32bit on Windows; cannot determine when files were accessed; Windows 46% with 21% from Fsatrace (hooking Windows kernel API); anti-virus disabled; canonicalizing paths is the greatest slowdown, with case-insensitivity discussed. Final 541 chars of page unread.
- F08 ON_PAGE — https://code.claude.com/docs/en/hooks
    quote: tool_input.file_path is always absolute ... On Windows, the path arrives with backslash separators
    note: Read/Edit/Write/Bash/Glob schemas match. Grep table also lists -i and multiline beyond those named (no contradiction). Common fields session_id, transcript_path, cwd, permission_mode, hook_event_name and event-specific tool_name, tool_input, tool_use_id confirmed.
- F10 ON_PAGE — https://code.claude.com/docs/en/hooks
    quote: the excerpt doesn't document a PostToolUse tool_response for Read
    note: Fetch tool's summary said Read response undocumented in the read chunks. Bash stdout/stderr/interrupted/isImage and bashEditDiff fields (changedFiles, files, moreFiles, unavailable, skipped, shared; v2.1.269+; best effort, public beta) and Write {filePath,type} confirmed. The cat/grep inference is the agent's own, not on the page. Last ~84k chars unread.
- F12 ON_PAGE — https://nodejs.org/api/cli.html
    quote: NODE_V8_COVERAGE will automatically propagate to subprocesses ... can be set to an empty string, to prevent propagation.
    note: coverage prefix, top-level result array of ScriptCoverage with url confirmed; ranges are nested under functions per the protocol type (page example shows functions: []). Source map cache is Stability 1 - Experimental. Vitest not addressed, consistent with the fact.
- F17 ON_PAGE — https://testmon.org/blog/determining-affected-tests/
    quote: There is no heuristics involved.
    note: Coverage.py based, checksum per block, test depends only on executed blocks, limits are coverage.py's; page does not mention non-Python files, environment or package changes.
- F20 ON_PAGE — https://docs.expo.dev/build-reference/infrastructure/ ; https://docs.expo.dev/eas/json/ ; local technician-app/eas.json:3
    quote: If you do not provide image in eas.json, your build by default will use the auto alias.
    note: latest/sdk-NN float, specific name pins, build log section 'Spin up build environment', Node/JDK/NDK per image, no Gradle or build-tools version listed: all confirmed. eas/json page only shows cli.version in a submit example ('>= 0.34.0') without defining it. Local eas.json line 3 has cli.version '>= 13.0.0'; no image, node or npm pin in any profile.
