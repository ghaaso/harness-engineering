# Using the corpus map (quickstart for a fresh agent)

The map is a persisted record of what the plan documents **state**: relations as written, with exact source lines. It does not summarise, and it does not hold opinions. In the commands below, `CMAP` and `STORE` are the command prefix and store path given in your task.

1. **Check freshness first:** `CMAP status --store STORE --corpus CORPUS`. If it reports CHANGED files, records from those files are stale. Say so, and read their current lines directly.
2. **Find where to start (suggestions only):** `CMAP find --store STORE "words or IDs"`. This lists headings, row keys and terms by similarity. It is **not evidence**. Pick start names yourself.
3. **Get a context packet:** `CMAP context --store STORE --corpus CORPUS "<start name or ID>" [more starts] --budget 3000 --depth 2`.
   - Each record looks like `[id] S1 edge "label" … file:lines`, with its slots, how each slot resolves, and the quote.
   - `-> UNRESOLVED: …` and `GAP …` lines mean the plan does not connect that item. Treat them as open, not as absent.
   - Resolutions marked `S3 analyst hop` are analyst decisions, not text. `[analyst split item]` means an analyst split a list.
   - Labels are the documents' own words. Read the direction from the quote. The map does not assume it.
   - FRONTIER lists referents not expanded. Pass any of them as new starts. MORE gives the next `--page`.
   - Packets use only committed records. Add `--candidates` only if you want similarity suggestions; they are labelled as not evidence.
4. **Read exact lines before citing:** `CMAP show --store STORE --corpus CORPUS docs/technical-plan/x.md:140-150`. Cite file:line from these lines.
5. **Optional:**
   - `CMAP chain --store STORE "<start>"`: derived chains, only over relation kinds an analyst has decided are walkable.
   - `CMAP gaps --store STORE --file <path>`: gaps for one file.

**Budget tips:**

- Start with one or two specific starts, such as a section ID, a decision ID or a heading name.
- Keep `--budget` around 2,000–4,000 tokens and add pages only when needed.
- An empty or missing relation in the map does not prove there is none. Check the FRONTIER and COVERAGE lines, and the source lines.
