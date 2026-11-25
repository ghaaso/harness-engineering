# Session monitor, round 6: research and one proof of concept (24 November 2026)

Status: the owner approved the proof of concept on 24 November 2026 ("Yes, approve it"). Nothing is built. The build
is a later step with its own cap, to be agreed with him first. It should start from `poc/poc.mjs` and the limits listed
below. The brief is `../NEXT-ROUND-6.md`; his words are
in its section 2.

## Stage A: what works (page `findings.html`; screenshot of it `findings.png`)

The pictures on the page are loaded from their sources when the page opens. Nothing was downloaded. The page text and
images were read with headless Edge using an empty profile.

| Finding | Source | How it is known |
|---|---|---|
| Few fixed boxes with thickness for amount read at a glance; the raw map of every move is "spaghetti"; two sliders (fewer activities, dominant paths only) are the tool's own fix | Fluxicon Disco help pages (simplification, map view) | screens seen, pages read |
| "Spider" activities, linked to everything, make the map a web; leaving them out clears it | Fluxicon blog, Managing Complexity part IV | screens seen, post read |
| Width as amount along one route | Minard 1869 | picture seen; its reputation from memory |
| Moving dots for traffic; three levels; the service level is a hairball | Netflix Vizceral README | screen seen, README read |
| A line per entity over time fails where lines cross (the "Primer" panel = round 5); the field scores by crossings and wiggles | xkcd 657; Tanahashi & Ma 2012 | picture seen; abstract read; later work from search summaries |
| Animation is for presenting; replay shows one moment at a time | Disco help ("for ... no process analysis experts"); Kiali replay | screens seen, pages read |
| Static frames are faster than animation, and small multiples are more accurate | Robertson et al. 2008 | abstract read (quoted on the page) |
| Small multiples were faster on every task tested; animation helps when the layout is unstable | Archambault, Purchase, Pinaud 2011; 2016 follow-up | search summary only (open copy behind a bot check) |
| Three quarters of graph studies use 100 nodes and 200 edges or fewer | Yoghourdjian et al. 2018 | paper's web version read |
| Colour for trouble only; red box and lines | Kiali topology | screens seen, page read |
| Stages as columns read for one run | GitLab pipeline graph | screen seen, page read |
| Failures form a red block in a grid of steps by runs | Airflow grid view | screen seen, page read |
| Repeated steps fold into one node with a count | Langfuse agent graphs | page read, no picture on the page |

Not looked at: metro maps, flight trackers, control-room display standards (round 4's summaries only).

## Stage B: the proof of concept (`poc/poc.mjs` draws `poc/poc-crowded.png` from `../build/data.json`)

- **Ground:** his harness map at the level of the pipelines in use. The main row is Plan, Admit, Work, Check, Land,
  Learn. Notes and library sit to the left; Guards, Limits, Context, Recovery and Measure sit under the steps, as he drew
  them. The pipelines not yet run are left out. The same layout is used in every frame.
- **Time:** four frames of 45 minutes side by side, Tue 24 Nov 01:00 to 04:00, the crowded hours. Frames, not replay:
  Robertson 2008, Archambault 2011.
- **Where the work went:** a dark square in each box whose area is the tokens spent there, on one scale for all frames.
  A forward arrow to the next step is as thick as the number of moves along it. One return loop sits under each step
  that work was sent back to, as thick as the number of returns. Moves that skip a step, and moves to and from the side
  boxes (the spiders), are counted at the foot of each frame, not drawn.
- **Where it is now:** a blue dot and name above the box where each session was at the frame's end; a hollow dot for
  one that ended during the frame. Helpers count in the squares and in the frame's heading, and are not drawn one by one.
- **Where it broke:** a red outline and words on the box where a rule broke (hook failed, window past its limit). A
  refused call is grey, since the hook did its job.

**Stranger test, legend covered.** First draft: it failed on the flow. The arcs under the row ran into one bundle and
their direction could not be read. One repair: forward arrows in the gaps, and return loops. Second draft, read cold:
"Work grew from 21 M to 71 M tokens and its hook failed in three of four frames; work kept being sent back (9 times to
Admit at the peak), and in the last frame Check outgrew Work; at 04:00 Big run and Monitor r5 are in Work and Big run 2
in Check; Context went past its window limit." That is where the work went, where it is now and where it broke.

**Limits of the proof of concept:** the quiet stretch is not drawn (to stay inside the cap). Land shows tokens, not the
commits that landed. Who started whom is not drawn. The places are the read step's inference and are unchecked (his
ruling: the picture first).

## Tokens

About 2.7 M of the 3 M cap. This is an estimate: calls times the window, with no helpers. Most of it went on re-reading
the session's own window, not on the pages.
