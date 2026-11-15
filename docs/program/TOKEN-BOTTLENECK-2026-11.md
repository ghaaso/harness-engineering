# Token bottleneck report (2026-11-12)

**Question.** Which bottleneck causes the most token usage in a project.

**Source.** Every API call in this PC's Claude Code transcripts for FixFlow (14 sessions, 1,153 agent transcripts, 14.6k calls) and the Clinic Workshop repo (41 sessions, 506 agent transcripts, 21.2k calls), counted once per message id. An independent re-measurement agreed within 0.3 %; a refuter confirmed the totals and splits. Scripts and raw outputs: `evidence/token-spend/`.

| | FixFlow | Clinic | both |
| --- | --- | --- | --- |
| context tokens processed (what the model read, summed over calls) | 2.13 B | 5.23 B | 7.35 B |
| output tokens (45 % of them thinking) | 24.6 M | 30.8 M | 55.4 M |
| cache reads as share of context tokens | 94.9 % | 97.6 % | 96.8 % |
| API calls | 14,647 | 21,187 | 35,834 |

97 % of all tokens are re-reads of a window that was already there. Output is 0.75 % of the tokens processed.

## The bottleneck: every step re-reads the whole window

Token usage is **calls × window size**. Nothing else comes close.

| | FixFlow | Clinic |
| --- | --- | --- |
| average context per call, main session | 396k | 333k |
| average context per call, agents | 113–123k | 128–156k |
| main session share of context tokens | 22 % | 74 % |
| agents' share of context tokens | 78 % | 26 % |
| share of cache-read tokens in calls whose context had passed 200k | 39 % | 74 % |
| share of cache-read tokens in calls past 400k | 15 % | 37 % |
| calls that only read or searched, each one a full re-read | 64 % of calls, 55 % of tokens | 52 %, 41 % |
| compactions in main sessions | 9 | 48 |

### What the windows hold (share of all context tokens)

| content | both | FixFlow | Clinic |
| --- | --- | --- | --- |
| fixed prefix re-read every call (system prompt, tool and connector schemas, CLAUDE.md, briefs) | 27 % | **47 %** | 19 % |
| the model's own earlier output carried forward (thinking, commands, file contents it wrote) | 26 % | 15 % | **31 %** |
| content fetched by reads and searches | 26 % | 23 % | 27 % |
| compaction summaries re-read | 8 % | 2 % | 11 % |
| unclassified shell output, messages, other | 13 % | 13 % | 12 % |

The same mechanism shows up in two shapes:

- **Clinic: one big window.** Main sessions hold 74 % of its tokens at 333k per call. Inside those windows 34–44 % is the model's own earlier output (thinking 12 %, echoed commands 9 %, written file contents 8 %) and 11 % is compaction summaries read again on every call.
- **FixFlow: many small windows.** 1,118 agent windows, about 12 calls each, and **56 % of every agent's tokens is its fixed prefix**, about 60k tokens, roughly 50k of it tool and connector schemas. Fan-out multiplied the prefix, not the work.

Fetched content, the thing indexes and knowledge stores aim at, is a quarter of the tokens in both repos.

## Levers, in order of size

1. **Cap the orchestrator window** at 150–200k (one phase per session, earlier compaction). Exposure: 39 % (FixFlow) and 74 % (Clinic) of cache-read tokens sit in calls past 200k.
2. **Strip the subagent prefix.** About 60k tokens per agent window, 27 % of all tokens, 47 % of FixFlow's. Deferred tool schemas, fewer connectors and no skills in agent sessions remove most of it.
3. **Fewer steps.** 58 % of calls only read or search; batching two lookups into one command removes about a third of all calls, and with them a third of the re-reads.
4. **Stop carrying the model's own output.** 31 % of Clinic's tokens. Write large files through a script instead of inline tool content; compact after a write-heavy phase.

## Not the bottleneck

- **Model mix.** Opus made 65 % of calls and read 52 % of tokens; Fable 6.5 % of calls, 16 %; Sonnet 28 %, 32 %. Routing changes the rate per token, not the token count.
- **File reads.** 26 % of tokens, and only 0.5–1.5 % of a window is content re-fetched inside the same window. A session-local read cache saves almost nothing.
- **Any one file.** The hottest file in either repo is 1.5 % of its tokens.
- **Human prompts.** 80 and 151 real prompts, about 162 API calls each. The usage is in the machine's steps.

## Caveats

- How cache reads count against the five-hour limit is unknown, so lever 2 (mostly cache reads) cannot yet be promised to reduce limit stops.
- About 1 % of calls (harness-internal Haiku for web fetch and titles) never appear in transcripts. About 3 % of the FixFlow group is unrelated sessions run from that folder; the Clinic group's largest session was FixFlow design work.
- "What the windows hold" is estimated from context growth between calls weighted by re-reads (method reviewed in `evidence/harness-bottlenecks/fill/verify/`); 5–8 % stays unclassified, most of it reads.
- The live measurement session is included in the FixFlow group.
