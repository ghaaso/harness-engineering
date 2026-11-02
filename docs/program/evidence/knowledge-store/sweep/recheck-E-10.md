# recheck:E-10

lane=E-10 tool_status=ok checks=12

- F2 ON_PAGE — https://github.com/modelcontextprotocol/servers-archived
    quote: was archived by the owner on May 29, 2025. It is now read-only. ... NO SECURITY GUARANTEES ARE PROVIDED FOR THESE ARCHIVED SERVERS.
    note: Archive and README confirmed.
- F2 ON_PAGE — https://registry.npmjs.org/@modelcontextprotocol/server-postgres
    quote: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info. Latest 0.6.2, published 2024-12-04T16:14:51Z.
    note: Deprecated, latest 0.6.2, date match.
- F2 ON_PAGE — https://pypi.org/pypi/mcp-server-sqlite/json
    quote: Latest version 2025.4.25, uploaded April 25, 2025.
    note: Matches. The 'must not be used' conclusion is inference, not stated by sources.
- F16 PARTIAL — https://code.claude.com/docs/en/sub-agents
    quote: Subagents inherit the built-in tools and MCP tools available in the main conversation, narrowed by two filters. ... The subagent gets the tools; the parent conversation doesn't.
    note: Inheritance, inline mcpServers, and the PreToolUse read-only hook example are supported. The background built-in list includes Bash, PowerShell, Read, Grep, Skill, ToolSearch plus others, so it is a superset of the claim. 'Bash is inherited so a CLI works with no configuration' is inference. Last 16k chars of the page were not read.
- F17 PARTIAL — https://code.claude.com/docs/en/mcp
    quote: Tool search is enabled by default: MCP tools are deferred and discovered on demand. ... auto: load upfront while their definitions total under 10% of the context window.
    note: Default-on, auto 10%, 16,384 chars (2,048 before v2.1.296), and model coverage are on the page. The page excerpts read did not contain the exact phrase 'only tool names and server instructions load at session start', though names are listed to Claude. Per-schema token cost not seen, consistent with the 'not established' note.
- F18 ON_PAGE — https://code.claude.com/docs/en/mcp
    quote: displays a warning when MCP tool output exceeds 10,000 tokens and limits output to 25,000 tokens by default ... results longer than 50,000 characters are saved to a file
    note: MAX_MCP_OUTPUT_TOKENS and the 50,000-character file save are confirmed.
- F18 ON_PAGE — https://code.claude.com/docs/en/env-vars
    quote: Maximum number of characters of bash output that Claude Code reads back (default: 30000; maximum: 150000). If you set the bashOutputMaxChars setting, Claude Code ignores this variable.
    note: Bash part confirmed. The CLI self-limit advice is inference.
- F21 ON_PAGE — https://www.meilisearch.com/docs/learn/what_is_meilisearch/telemetry
    quote: Events are sent hourly or at 500 KB; Segment collects, Amplitude graphs; disable with --no-analytics or MEILI_NO_ANALYTICS=true then restart.
    note: Fetch summary (paraphrase). It says document contents, IPs, emails and URLs are excluded, and the metric list shows aggregate counts rather than query text. 'Records no query text' is inferred from the metric list rather than stated outright.
- F22 ON_PAGE — https://qdrant.tech/documentation/ops-configuration/usage-statistics/
    quote: Collected: system information, performance timings and counters, critical error backtraces. Never collected: stored data, collection names, URLs. Opt out via QDRANT__TELEMETRY_DISABLED, telemetry_disabled, --disable-telemetry; /metrics and /telemetry unaffected.
    note: Fetch summary (paraphrase). Random per-start instance ID is stated.
- F29 PARTIAL — https://duckdb.org/docs/2.0/configuration/overview.html
    quote: autoinstall_known_extensions true; autoload_known_extensions true; allow_community_extensions true; enable_external_access true; custom_extension_repository no default listed.
    note: Defaults confirmed and no telemetry setting found. 'Empty' for custom_extension_repository is only 'no default listed (blank)'. The egress classification (extension name, version, platform, IP) is inference.
- F29 ON_PAGE — https://duckdb.org/docs/2.0/operations_manual/securing_duckdb/overview.html
    quote: you can disable autoloading ... completely disable external access by setting enable_external_access to false ... restrict ... allowed_directories ... consider locking the configuration
    note: All four are on the page, as options and suggestions rather than firm requirements.
- F29 PARTIAL — https://github.com/duckdb/duckdb-ui/issues/116
    quote: http://extensions.duckdb.org/v1.2.2/linux_amd64_gcc4/ui.duckdb_extension.gz
    note: The issue shows a request to extensions.duckdb.org, but it was triggered by autoloading the ui extension when running duckdb -ui, not by a query needing a core extension. It returned HTTP 403.
