# Claims made to the owner on 2026-11-11 (to be attacked)

Context: the owner asked why a graph database, spatial and temporal topology, caching and invalidation would not cut token use, given many files and documents. The main session measured what fills the session windows and answered as below.

## Headline
C1. A graph, index or cache can shrink at most about 27 % of the token bill, and realistically much less.
C2. Of November's 4.33 billion context tokens: 26.9 % fetched by reading and searching; 32.5 % the model's own earlier work carried forward (thinking, commands, code it wrote); 28.6 % the start of every window re-read on each call (system prompt, tool definitions, instructions, and after a compaction the summary and re-attached files); 12.0 % messages, test output and other.
C3. Inside the fetched 26.9: first open of a file in a window 18.7; same file opened again in the same window 7.0; searches and other 1.2.
C4. By group: fetched is 26.0 % of slice sessions, 14.8 % of the root, 40.1 % of subagents.

## Why the real saving is well under 27 %
C5. Most fetched content was needed: 18.7 of the 26.9 points are first opens.
C6. Sessions already read narrowly: line ranges and search hits outweigh whole-file reads (slice sessions: sed 8.0 %, grep 5.0 %, against cat 4.9 % and the Read tool 5.4 %).
C7. Tokens are a carrying cost, not a fetching cost: everything in the window is re-read on every later call; a slice session carried about 306k tokens on each of roughly 9,300 calls; a shorter window cuts all of it, so it stays the first lever.
C8. There is no small hot set: reads spread over 2,179 files and the 30 most-read hold 7.7 % of all tokens. A cache pays when a few things are asked for often.

## Three meanings of cache
C9. A speed cache saves milliseconds per lookup; lookups on local disk are already instant; tokens are counted by what the model reads, not how fast it arrived.
C10. The provider's prompt cache is already on; it breaks when anything near the top of the window changes, so a memory layer that injects context there costs more.
C11. A result cache with invalidation is the real fit and is already designed: knowledge-store entries invalidated by code change, and a "what is true now" view rebuilt from git.

## Position
C12. Still no: a graph database server, a model-built graph, embeddings. The testbed's own context system used 6-17 % more tokens for the same recall.
C13. Yes as a trial: a scripted index (who calls what, what changes together) rebuilt at every commit.

## Stated limits
C14. Estimates: context growth between calls, split by character count where several things arrived together. 4.3 % of tokens are shell commands the script could not classify, some of them reads. "Same file opened again" is an upper bound on repeat reading.
