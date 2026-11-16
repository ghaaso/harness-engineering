# Transcript format (structure only, observed 2026-11-16)

Sources: 57 workflow runs under `<session>/subagents/workflows/wf_<runId>/` (789 helper transcripts), 7 plain-Agent transcripts under `<session>/subagents/`, and the session file `<session>.jsonl` (21,615 lines, 94 MB). All JSONL, UTF-8, `type` on every record. Tool: `transcript-shape.mjs <file> [maxLines]` streams a file and prints record types, key paths, counts, models, tool names. No content.

## Layout on disk
- `<session>.jsonl` (coordinator); `<session>/custom-title.json`; `<session>/tool-results/<id>.txt` (large tool outputs spilled to files); `<session>/subagents/agent-<id>.{jsonl,meta.json,prefix.json}` (Agent-tool helpers); `<session>/subagents/workflows/wf_<runId>/{journal.jsonl, agent-<id>.jsonl, .meta.json, .prefix.json}`.
- `agent-<id>.prefix.json`: {v, by, state{systemHash, toolsHash, toolNames[], model, effortValue, callCount, prevCacheReadTokens, perBlockLengths, ...}, outlines}: cache-diagnosis hashes and counts only.

## (1) Model, token usage, time per call
- Record `type:"assistant"`: `message.model` (claude-opus-5-5, claude-sonnet-5-5, claude-haiku-5-5, claude-fable-5-x; `"<synthetic>"` for harness-made error records), `message.id`, `message.usage.{input_tokens, cache_read_input_tokens, cache_creation_input_tokens, output_tokens, output_tokens_details.thinking_tokens, cache_creation.{ephemeral_5m,ephemeral_1h}_input_tokens, server_tool_use.{web_search_requests,web_fetch_requests}, iterations[], speed}`, `timestamp` (ISO-8601 UTC, ms), `requestId`, `requestRef`, `requestedModel`, `effort`, `perTurnEffort`, `sessionId`, `agentId` (helpers), `isSidechain`, `uuid`, `parentUuid`, `apiBlockIndex`.
- CAUTION, duplicates: one API response is written as one `assistant` record PER CONTENT BLOCK (thinking, text, tool_use), `apiBlockIndex` 0,1,.., all with the same `message.id` and the full usage repeated. Count usage once per `message.id` (checked over all 789 helper files: duplicates always identical). Summing records over-counts.
- `type:"api-request"`, one per call: {sessionId, agentId, id, timestamp, querySource (e.g. `agent:builtin:workflow-subagent`), shapeHash, params{model, betas, max_tokens, thinking, output_config.effort}, cacheControl[], requestDigest}. `api-request.id` equals the assistant records' `requestRef`. `api-request-shape` (system + tools, keyed by shapeHash) and `api-request-blob` (message content, keyed by hash) are content stores: do not parse them for numbers.
- Failures: a `<synthetic>` assistant record with zero usage, `isApiErrorMessage:true`, `error` (e.g. `rate_limit`), `apiErrorStatus`. Skip when counting calls.
- Session file extras: `cost-state` (cumulative `modelUsage.<model>.{inputTokens, outputTokens, thinkingTokens, cacheReadInputTokens, cacheCreationInputTokens, webSearchRequests}`, totalAPIDuration, totalToolDuration; ignore its cost field: tokens only), `system/compact_boundary` (compactMetadata.{trigger, preTokens, postTokens, durationMs, preservedSegment}, `logicalParentUuid`), `system/api_error`, `tools-used` ({tools[]}).
- Time: `timestamp` on assistant, user, attachment, api-request records. No per-call duration field; derive from timestamps (tool_use record to its tool_result record).
- Metadata only (no usage): queue-operation, last-prompt, custom-title, agent-name, mode, pr-link, relocated, file-history-snapshot/delta, system/stop_hook_summary, atis-latch.

## (2) Tool calls and results
- Call: in an `assistant` record, `message.content[]` block `{type:"tool_use", id, name, input, caller{type}}`. Inputs seen: Bash {command, description}; Read {file_path[, offset, limit, allow_large]}; Grep {pattern, path, glob, output_mode, -n, head_limit}; Glob {pattern, path}; Write {file_path, content}; Edit {file_path, old_string, new_string, replace_all}; WebFetch {url, prompt}; WebSearch {query, mode}; Agent {subagent_type, model, description, prompt}; Workflow {script}; StructuredOutput {schema fields}.
- Result: the next `user` record, `message.content[]` block `{type:"tool_result", tool_use_id (= the call's id), content (string, or [{type:"text",text}]), is_error?}`. The record also has `sourceToolAssistantUUID` (= the calling assistant record's uuid), `permissionDecision{decision,source,reasonType}`, `sandboxed`, `toolEndsTurn`, `promptId`, `parentUuid`.
- Session file only (mostly): result record has `toolUseResult`, typed. Bash {stdout, stderr, interrupted}; Read {type, file{filePath, content, numLines, startLine, totalLines, truncatedByTokenCap}}; Write/Edit {filePath, structuredPatch, ...}; WebFetch {url, code, codeText, bytes, durationMs, result}; WebSearch {query, results[], durationSeconds, searchCount}; Grep {mode, numFiles, filenames}; Agent {isAsync, status, agentId, resolvedModel, outputFile}; Workflow {status, taskId, runId, workflowName, transcriptDir, scriptPath, summary}. In helper transcripts `toolUseResult` is absent from almost all records: use `tool_use.input` and the `tool_result.content` string.
- Large outputs may be replaced by a pointer to `<session>/tool-results/<id>.txt`.
- Chain: every non-first record's `parentUuid` resolves inside the same file (tested: 0 unresolved, one root).
- Helper tool counts (789 helpers): Bash 11,317; Read 2,229; Write 832; Edit 989; Grep 851; WebFetch 1,406; WebSearch 491; StructuredOutput 774.

## (3) A helper's final structured result
- Yes, parseable, in two places that agree (byte-equal on the run tested): (a) the helper's `tool_use` named `StructuredOutput`, `input` = the object (its tool_result is a short acknowledgement); plus an `attachment` record `attachment.type:"structured_output"` with `attachment.data` and `toolUseID`; (b) `journal.jsonl` record `{type:"result", key, agentId, result:<object>, toolsUsed:[names], remoteControlDeviceReport}`. Read (b) first: one line per helper. Failure: `{type:"failed", key, agentId}`, no detail. Of 789 helpers, 765 have `result`, 7 `failed`, 17 neither (stopped or cut off).

## (4) Linking helpers to their starter
- Workflow helpers: the directory `wf_<runId>` is the link. The session's `Workflow` tool result gives `toolUseResult.runId`, `transcriptDir`, `scriptPath`. `journal.jsonl`: `{type:"launched"}` (no other fields), `{type:"started", key, agentId, label, phase}` per helper (`key` = `v2:<hash>`, `label`/`phase` set by the script), then `result` or `failed`. `agent-<id>.meta.json`: {agentType (workflow-subagent | general-purpose | claude-code-guide), isBuiltIn, description, workflowPhase, spawnDepth, requestShape, requestNonInteractive, model (alias opus|sonnet|haiku; missing in 1 of 789), pickedEffortModel}. Meta has NO parent id and NO tool-use id for workflow helpers. Every record inside has `sessionId` (the owning session, not a helper) and `agentId` (the file's own id).
- Agent-tool helpers: meta adds `toolUseId` = the parent's `Agent` tool_use id; the parent's result gives `toolUseResult.agentId`, `resolvedModel`, `outputFile`.
- No helper-to-helper parent field; nesting is visible only as `spawnDepth`. Child sessions started by `start_session` were not examined.

## (5) Web fetch and web search
- Recorded: WebFetch `input.url` + `input.prompt`; WebSearch `input.query` + `input.mode`. Session file adds `toolUseResult.url/code/bytes/durationMs` and `.query/results/searchCount`. `usage.server_tool_use.{web_fetch_requests,web_search_requests}` counts them per call.
- The WebFetch result text is the fetch tool's model-processed answer to the prompt (hundreds to a few thousand chars), NOT the page bytes. A stored copy of a source cannot be rebuilt from a transcript; the tcb's own fetch script must store it.

## (6) File reads vs a declared list
- Auditable by path: Read `input.file_path`; Write/Edit `input.file_path`; Grep/Glob `input.path` (may be absent: cwd) with the pattern; matched names only in result text (session file: `toolUseResult.filenames`). Paths are as the model wrote them (absolute or relative, either slash, any case): normalise first.
- NOT auditable by path: reads through Bash (`command` is free text; Bash was 11,317 of the helper calls vs 2,229 Read) and anything a Bash script opens. An audit against a declared list is exact for Read/Grep/Glob/Write/Edit and heuristic (token scan of the command) for Bash; a strict rule needs Bash banned or its path tokens checked.

## (7) Loaded automatically, not a tool call
- `attachment` records (14 in a 69-line helper). `attachment.type` seen: instructions {files[], about 31.7k chars}, skill_listing {content, skillCount, names, digests, about 20.6k chars}, session_context, environment, date, model, mcp_instructions_delta, deferred_tools_delta, credential_org, remote_session_change, auto_mode, prompt_snapshot {systemPrompt, reminderFold, contextRendering}, structured_output.
- Also the system prompt and the whole tool list (`api-request-shape.shape.{system,tools}`: 50 tools, one tool description alone about 21k chars).
- Size: sample helper (opus): brief 5,802 chars (about 1.5k tokens); first call input = 2 + 0 + 65,602 cache-creation = 65,604 tokens; later calls read about 65.6k from cache. The session's first call: user text 1,113 chars, input 2 + 47,715 + 41,274 = about 89k tokens. A first call is thus tens of times the brief; nearly all is system prompt, tools, instructions and skill listing.

## Consequences for the build
- Token accounting: one count per `message.id`, skip `<synthetic>`; model name from `message.model`; helper alias from meta.
- Helper results: read `journal.jsonl`, not the transcript.
- Read audit: exact for Read/Grep/Glob/Write/Edit, heuristic for Bash.
- Linking: workflow helper to run by directory and journal `agentId`; run to starter by the Workflow result's `runId`; no helper-to-helper link exists.
- No contradiction with CONTRACT.md was checked (not read for this probe).
