# Harness pipeline diagram (2026-11-20)

The whole harness as it is meant to work, built or not, drawn as connected pipelines. A second file holds
only the memory pipelines, with the system map and the task pipeline, for the memory work.

## Files

| File | Contents |
|---|---|
| `harness-pipeline.drawio` | The full diagram, editable in draw.io (app.diagrams.net, the desktop app, or the VS Code extension). Each pipeline is a container that can be collapsed; each step is one cell. |
| `harness-pipeline.png`, `harness-pipeline.svg` | The full diagram as a picture, 6900 x 4825. |
| `harness-map.png` | The system map only: one box per pipeline, 19 in all. |
| `memory/harness-memory.svg`, `.png`, `.drawio` | Memory (B1 to B5), the system map and the task pipeline (1 to 6), 3460 x 5115. On the map, pipelines not drawn in this file are dimmed. |
| `memory/MEMORY-BENCHMARKS.md` | Pass conditions, targets and the Sonnet–Opus benchmark for the memory work. |
| `memory/memory-pipeline.pdf` | Two A4 pages: the memory diagram with the task pipeline (vector), then the benchmarks. |
| `memory/harness-memory-only.svg`, `.png`, `.drawio` | Memory and the system map, without the task pipeline, 3460 x 3444. |
| `memory/memory-pipeline-and-benchmarks.pdf` | Two A4 pages: the memory diagram without the task pipeline, then the benchmarks. The version for the teammate. |
| `build/` | The generator. `content.mjs` holds the text, `scene.mjs` the layout of both files, `lib.mjs` writes SVG and draw.io. |
| `parts/` | The six part lists the content was taken from, each part with its source document and section. |

## Structure

Three levels:

1. **System map.** One box per pipeline; arrows show what one pipeline passes to another.
2. **19 pipelines**, each a row of steps (83 steps): the task pipeline (1 Plan, 2 Admit, 3 Work, 4 Check,
   5 Land, 6 Learn), knowledge of the code (A1 to A3), memory (B1 to B5), controls (C guards, D limits,
   E context, F recovery) and evaluation (G).
3. **220 parts**, each listed inside its step with a status dot: built 101, designed 103, idea 11, built
   and tested once without gain 5.

The memory file has 11 pipelines (the six task stages and B1 to B5), 44 steps and 100 parts.

Wording is plain description (owner, 2026-11-20); the earlier headings were replaced, no part was removed.

## Rebuild

```
cd docs/program/pipeline-diagram/build
node build.mjs ..
bash shoot.sh ../harness-pipeline.svg ../harness-pipeline.png
bash shoot.sh ../harness-pipeline.svg ../harness-map.png $(cat ../map-region.txt)
bash shoot.sh ../memory/harness-memory.svg ../memory/harness-memory.png
bash shoot.sh ../memory/harness-memory-only.svg ../memory/harness-memory-only.png
node pdf.mjs ../memory
node pdf.mjs ../memory harness-memory-only.svg memory-pipeline-and-benchmarks.pdf
```

`build.mjs` prints a line for every text that does not fit its box, and the counts for each file.
`shoot.sh` takes the PNG with headless Edge; give it `x y w h` after the two file names for a part of the
picture. `map-region.txt` is written by the build and is not kept.

## What was and was not checked

- Both pictures were looked at whole and in close-up.
- The draw.io format was opened in draw.io with a placeholder scene from the same generator. The real
  files were not opened in the web app, because project content is not sent to an outside service
  (CLAUDE.md rule 4).
- The links on the map boxes (a click scrolls to the pipeline) were not tried.
- The content comes from six Sonnet readers over the design documents (about 1.0 M tokens, 2026-11-20),
  not from a line-by-line reading by the session that drew it. Where a document was unclear, the
  pipeline's last line says so ("Open").
