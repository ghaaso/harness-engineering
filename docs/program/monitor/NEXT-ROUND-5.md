# Session monitor, round 5: one map of the harness with the sessions moving through it (brief for a fresh session)

Written 2026-11-24 by the round 4 session at the edge of its window. Read first: `UX-RESEARCH.md`, `README.md`, and the
screenshots in `round4/`. Round 4 changed the look, not the architecture; the owner rejected it on the architecture.

## What the owner said about round 4 (his words, shortened)
- The strip of session buttons under the harness "doesn't seem to be helping at all".
- The harness view and the time view "separately" is "still not a good visualization": the greyed-out parts are "so
  much information to process", the way it is put out "looks constrained", and "the window is fixed". He suggests a
  graph canvas where you "see all the nodes, zoom in, zoom out".
- "Architect it such that the harness and sessions over time can be in a single visualization."
- The time view "isn't really telling me anything. It's just, okay, this session, this, that." A good diagram shows
  "the flow, everything going on" by looking, against a paragraph the reader has to rebuild in his head. Not an agent
  that explains.
- "Instead of making small increments in the current design ... make fundamental changes in how it is architected."

## Diagnosis (the round 4 session's, to be judged by the result)
1. The relation he cares about, what the sessions did *in* the harness, appears in neither picture. It lives only in
   click-through panels, so he builds it in his head.
2. In the time view, position means start order and lane packing; a line means "stayed open". Nothing visual carries
   what a session did, how much it spent or whether it moved forward. So it reads as a list.
3. One fixed screen with everything squeezed in gives small type and grey text. The answer is a canvas with zoom, where
   the overview shows only large shapes and steps and parts appear as you zoom in (semantic zoom), not more cramming.
4. Text labels and dots carry the data. Size, thickness, position and motion carry almost none.

## The architecture to build
One zoomable map with three layers, one time control.
- **Ground: the harness.** The owner's own map (pipelines, his positions and names, from `docs/program/pipeline-diagram/`),
  quiet grey. Zoomed out it shows pipelines only; zoomed in, the steps; further in, the parts. Pan and zoom by mouse.
- **Flow: where the work went.** From an event log (below), summed over the stretch chosen. An arrow between two places
  is as thick as the number of times work moved along it. A place is filled by the tokens spent there. Loops show as
  loops. The test case: round 3's procedural creep, a fat loop of checking and reviewing with nothing reaching Land,
  must be visible without reading a word.
- **Live: the sessions themselves.** Each session is a marker at the place it is now, with a fading trail of where it
  has been (as a flight tracker shows aircraft on a map). A child session branches off its parent's marker; helpers are
  small dots around their session, with their count. Colour is state (working, waiting for him, quiet). A red mark is
  pinned at the place where a rule was bypassed or a hook failed, so problems are seen where they happened.
- **Time.** The overview strip he liked stays as the control: the frame chooses the stretch the flows sum, and a play
  button replays the stretch so the markers move through the map.
- **Detail on demand.** Clicking a place, a marker or a trail opens the panel. The verdict and the "needs you" list stay
  in the top bar. No separate session strip, and no second view to switch to.

Borrowed whole, named from memory and to be read before anything is cited: process mining's process map with frequency
and performance overlays and its replay animation (the field `NEXT-ROUND.md` already named), the flight tracker's
markers and trails on a fixed map, and semantic zoom from map software.

## Data: the one change in the read step
`build/snapshot.mjs` adds an event log: time, session or helper, place in the harness, tokens, outcome (allowed,
refused, bypassed). The places come from simple rules on each call, stated on the page as inference:
- A plan or task list is Plan; a usage read or the fan-out and count gates is Admit.
- An edit or write of code, or a build helper, is Work.
- A test, check, review or refute helper is Check.
- A commit is Land; the journal tool is Learn.
- A named harness part (round 3's matching) goes to its own pipeline.
Keep everything that exists. No independent check of this data: one look at the map against two sessions the reader
knows is the test.

## Rules for the round
Opus, analyse; the builder designs and builds itself, eyes on real screenshots at 1920 x 1080. No review helpers, no
refuters, no spec for later features. Show the owner the first working screen of the map early, before a third of the
cap is spent. Touch only `docs/program/monitor/`. Nothing committed. The cap is the rest of round 4's 12 M (about 7 M
left by the round 4 session's estimate).
