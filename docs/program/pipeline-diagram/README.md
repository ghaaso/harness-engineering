# The harness pipeline diagram (2026-11-20)

One diagram of the whole harness as it is meant to work when every part works, built or not. Asked for by
the owner on 2026-11-20 as a diagram file, not a page.

## The files

| File | What it is |
|---|---|
| `harness-pipeline.drawio` | The editable diagram. Open it in draw.io (app.diagrams.net, the desktop app, or the VS Code extension). Every pipeline is a container that can be collapsed; every step is one cell. |
| `harness-pipeline.png` | The same diagram as a picture, 6900 x 4886. |
| `harness-pipeline.svg` | The same picture, sharp at any zoom. |
| `harness-map.png` | Only the system map: the whole system in 19 boxes, one per pipeline. The first thing to look at. |
| `build/` | The generator. `content.mjs` holds what the diagram says, `scene.mjs` where it goes, `lib.mjs` writes the SVG and the draw.io file. |
| `parts/` | The six part lists the content was taken from, each part with its source document and section. |

## How it is organised

Three levels, after the owner rejected a first drawing that gave every small part its own box (222 boxes):

1. **The system map.** One box per pipeline, with arrows for what one pipeline hands to another.
2. **19 pipelines**, each a short chain of named steps (83 steps in all): the six stages of the path
   (Plan, Admit, Work, Check, Land, Learn), three for knowledge of the code (A1 to A3), five for memory
   (B1 to B5), guards, limits, context, recovery (C to F), and measure and improve (G).
3. **220 parts**, each listed inside the step it belongs to, with a dot for how far it is: built 101,
   designed 103, idea 11, built and tested once without gain 5.

Nothing from the first drawing was dropped. Four former boxes became the name or the sentence of a step.

## To rebuild

```
cd docs/program/pipeline-diagram/build
node build.mjs ..
bash shoot.sh ../harness-pipeline.svg ../harness-pipeline.png
```

`build.mjs` refuses nothing but prints a line for every text that does not fit its box. `shoot.sh` takes
the PNG with headless Edge; give it `x y w h` after the two file names for a part of the picture.

## What was and was not checked

- The picture was looked at in close-up, region by region.
- The draw.io format was opened in draw.io with a placeholder scene from the same generator: containers,
  steps, lists, arrows and labels drew correctly. The real file was checked only as well-formed XML
  (279 cells); it was not opened in the web app, because project content is not put into an outside
  service (CLAUDE.md rule 4).
- The links on the map boxes (a click scrolls to the pipeline) were not tried.
- The content comes from six Sonnet readers over the design documents (about 1.0 M tokens, 2026-11-20),
  not from a line-by-line reading by the session that drew it. Each state dot is that reading's; where a
  document was unclear the lane's last line says so ("Not settled").
