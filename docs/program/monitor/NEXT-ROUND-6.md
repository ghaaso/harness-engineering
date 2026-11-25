# Session monitor, round 6: research first, then a proof of concept he approves (brief for a fresh session)

Written 2026-11-24 by the round 5 session. **Read this whole file before anything else.** Section 2 is the owner's own
words, in full and unedited. They are the task. Everything I wrote around them ranks below them: where my summary and
his words differ, his words win. Two earlier sessions failed him by working from a shortened version of what he said.

## 1. What this is for

The owner researches agent harnesses in this repository. He starts many AI coding sessions, each with helpers, leaves
them running, and comes back later. He wants a monitor on a second screen that he can look at and understand: where the
work went, where it is heading, what is wrong, and how the whole harness behaves, so that he can improve the pipeline.
The value is concrete: round 3 of this very monitor spent about 30 M tokens on checks and repair rounds while the
screen barely improved, and nobody saw it while it happened. A picture that shows that kind of thing by its shape, the
way a good diagram shows a flow, saves him tokens and shows him where his method breaks. It is a tool he thinks with.
It is not a status report, not a table, and not an agent that explains things to him in text.

Five rounds have failed. The data exists; the problem is the picture. **This is a UI/UX problem first.**

## 2. The owner's words, in full, in order

**(a) On round 4** (two views: a harness view with a strip of session buttons under it, and a "sessions over time" view;
"the part in the screenshot" is that strip of session buttons):

> firstly the part in the screenshot doesnt seem to be helping at all, And secondly, you might have given a visualization of the harness and the sessions over time separately, but it's still not a good visualization, I'd say. Like, especially the grayed out parts, so much information to process here. Not that there shouldn't be information to process here, but the way it's put out, it looks constrained, and the window is fixed itself. I think a flexible, like there's this graph, background of a graph, like you can like see all the nodes, like zoom in, zoom out. Probably that would help a bit. But honestly, overall, the visualization is still not good, not good enough. And you have to in some way architect it's such that the harness and sessions over time can be in a single visualization, conveyed properly, that that we're able to understand it as well. Like, also the fact that I can open this sessions over time thing, but the way it's visualized isn't really, me looking at it isn't really telling me anything. It's just, okay, this session, this, that, this, that, this, that. It's really not telling me anything more than that. And it's not about having an AI agent that explains shit to me. That's not the only way the visualizations tell you things. Do you understand? It's like the difference between uh, having uh, a 1,000 line paragraph explaining something, and a good diagram on the right. The way a good diagram, just by looking at it, you can understand the flow, everything going on, as compared to having a whole paragraph and having to read and construct that on your own in your mind. That where all that effort is put onto you for you to do. Like, that's just an analogy, not that you have paragraphs here. Don't take it that way. Be smart about it. Just to make a point on it. So you need to reason more on this UI UX problem and what I just pointed out to you, and instead of making small increments in the current design, I think you need to make fundamental changes in how it is architected in the first place. And because there seem to be fundamental flaws in your UI UX design. Understood?

**(b) When he gave that prompt to the round 5 session himself**, because the session before it had passed on a shortened task:

> This is the prompt I gave your parent session, and it kind of watered it down quite a lot and gave you the task accordingly. I don't think it actually understood the essence of what I was trying to point out and what it should be doing. And so I urge you to take a look at this again so you have the right direction instead of just minimally incrementing and adding to the already built HTML template that has obviously not achieved its goal and has failed

**(c) When the round 5 session went on fixing data rules instead of the screen:**

> Did you read the prompt that I just gave you? It seems to me like you're focusing on basic errors and accuracy and all of that bullshit, while the actual problem here is in reality the UI UX shit that has not been effective at all, which we need to be focusing on first before the actual bugs and all of that stuff that goes on the back end, because it is inherently a UI UX problem. What the fuck about this do you not understand?

**(d) On round 5's screen** (harness places as rows, time left to right, a line and a band per session; he attached a crop of the busy hours):

> You did some things right. Okay, I like that you changed your approach, but the way you changed how could you have possibly thought that this congested mesh of waves in a way was even remotely understandable for a person by viewing this? Like, how did you even come up with that conclusion? This is ridiculous. Like, I'm extremely disappointed in this. Like, this is absolutely. What am I supposed to make of this? If I gave you a clear, just a simple screenshot, even you would have difficulty understanding what the fuck was going on here. And this design is completely rejected. It's absolutely horrible. I need you to start over from scratch, and this time do some actual research on what would work instead of just shoving shit in. How did this even get approved? How did you even consider that this would be a good thing to do? Like, what the hell, man?

**(e) His word to start this round** (2026-11-24, answering "Start the research and one sketch, up to 3 M tokens?"):

> Yes, and when you're starting this session, do not water everything down to so much that it doesn't even understand the value or point of what we're doing, like what previously happened, and I had to give you the entire prompt again and had to even tell you to read that prompt because you ignored it, which is fucking ridiculous that I have to do this baby shit. But regardless of that, uh, d- instead of wasting tokens on fully implementing an approach from scratch, make a proof of concept and get that approved by me before starting building it. If we just keep building, every little idea you have will exhaust our weekly tokens, and for what? For like this, for no benefit at all. So that's a very poor use of tokens, and so continue accordingly.

**Earlier rulings of his that bear on this** (memory notes, read the files): glance, not tables; diagrams are pipelines
that connect, not flat boxes; a tree is nodes and lines; plain wording; big picture, not figures; readable without
removing (about 1870 px, light); no procedural creep; attack my own designs; borrow solved designs.

## 3. What was tried, and what he said

| Round | What it was | His judgement |
|---|---|---|
| 1 | A table, one row per session | Unreadable at a glance |
| 2 | Session cards left to right in start order, lines for who started whom | Liked then; later: "It's just, okay, this session, this, that" |
| 3 | A separate harness view added, about 30 M tokens | Not acceptable |
| 4 | Both views restyled (grey for normal) | Rejected on the architecture: words (a) |
| 5 | One picture: harness rows by time, a line and a band per session | "Congested mesh of waves", completely rejected: words (d) |

Screenshots: `round4/` and `round5/` (`v5-3h.png` is the crowded stretch he rejected; `v5-48h.png`; `v5-round3.png`).
The harness as he drew it himself: `docs/program/pipeline-diagram/harness-map.png`.

## 4. Why round 5 failed (the round 5 session's own account: test it, do not trust it)

- **The form.** A line per session through shared rows reads only while lines rarely cross. Eight sessions at once,
  each changing place every few minutes, cross everywhere. Bands under the lines added a second layer of shapes.
- **The process.** It reasoned from a principle (harness on one axis, time on the other) and stopped when the picture
  matched the principle. It judged its own screenshots knowing what every line meant. It did no research and took a
  chart form from memory. It saw the crowded hours and reported them as a side flaw; they are the main case.
- **What he said was right:** changing the approach. One picture instead of two views, started from scratch, a canvas
  that zooms. Those stay as aims. Nothing of round 5's drawing is to be extended.
- **Never built:** the idea in `NEXT-ROUND-5.md` (his harness map as the ground, one arrow per route as thick as the
  work that moved along it, sessions as markers on the map, replay). It is a candidate for the research to test. It is
  not validated and is not to be built on trust either.

## 5. The task: two stages, each ends by showing him; nothing is built

### Stage A: research on what works (real reading, real screens)

Questions to answer:
1. How do pictures that work show many things moving through one process without drawing every one of them?
2. How is change over time shown on a diagram of nodes and lines so that it is understood by looking (replay, a few
   frames side by side, something else), and which reads better according to people who tested it?
3. What keeps a node-and-line picture readable at a glance and from a distance: how many nodes, lines, colours and
   labels, and what crowding does to it?
4. What do existing monitors of agent runs, pipelines and build systems look like on the screen, and which parts are
   known to work or to fail?

How:
- **Look at the real screens.** Open the tools' own pages and pictures in the built-in browser and look at them. The
  fetch tool returns a small model's summary, which is not a reading of the source (memory note "Fetch tool gives
  summaries"). The existing `UX-RESEARCH.md` was made from summaries and no screenshot: treat it as leads only.
- **Read a source itself where a claim rests on it** (library record r57-0014). A download needs his word first, named
  with source and size (CLAUDE.md rule 3): prefer versions that open in the browser; if files are needed, list them
  and ask once with "approve:".
- **Say for every finding how it is known:** screen seen, page read, summary only, or from memory.
- **Privacy** (CLAUDE.md rule 4): no project name, path, session title, identifier or code in any search or request.
- Leads, all from memory and unread, none a conclusion: process maps in process mining with frequency overlays and
  replay, and how that field deals with "spaghetti" maps; the literature on storyline pictures and line crossings
  (round 5's failure in a field's own terms); studies of animation against small multiples for graphs that change;
  metro maps; flow diagrams where width is volume; flight trackers; pipeline graphs in build systems; agent trace
  viewers; control-room display practice.

Output: a findings page for him with the **real pictures**, each with its source, what it does well for our case and
what would break with our data (eight sessions at once, about 800 helpers, 19 pipelines). Plain words, short; the
markdown record behind it. Show it to him.

### Stage B: one proof of concept, for his approval

- **One design**, derived from the findings. No choices are put to him (CLAUDE.md rule 7): he is shown the result and
  the reasoning.
- **Drawn on the hardest case first:** the crowded hours of round 5, Tuesday 24 November from about 01:00 to 04:00
  local time, from the real data in `build/data.json`. Then the same form on a quiet stretch. If it does not read on
  the crowded hours it is not a candidate.
- **A proof of concept is a picture, not a page:** a static drawing made from the data by a short script. No zoom
  code, no panels, no replay. If movement over time is essential to the idea, show it as three or four frames side by
  side.
- **The stranger test before it is shown:** look at the picture as someone who has never seen it, legend covered, and
  write in two lines what it says. If that is not "where the work went, where it is now, where it broke", it is not
  ready; say so plainly instead of presenting a flaw as a side note.
- **Show him the picture and stop.** Building starts only after he approves it, as a later step with its own cap.

## 6. What exists

- `build/data.json`: the last data read. Per session and per helper an event log `ev` of visits `[start in seconds
  after base, length in seconds, place index, tokens in thousands, calls]`; `tch` (parts looked at), `marks` (`[time,
  place, kind, detail]`: hook failed, hook not switched on, window past its limit, start with no record, refused);
  `places` (the steps of the 19 pipelines); `harness.parts` (pipelines with his rows and columns, steps, links, parts).
- `build/snapshot.mjs`: the read step; the rules that place a call are in `placeCall`. The places are inference and
  unchecked. His ruling: the picture comes first; do not spend this round on data accuracy.
- `build/template.html`: round 5's page, rejected. Its first forty lines of script show how the data is read.
- Rebuild and the history: `README.md`. A screenshot of a local page at 1920 x 1080:
  `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=1920,1080 --virtual-time-budget=4000 --screenshot="<Windows path>.png" "file:///C:/.../page.html"`

## 7. Rules for the round

- **Tokens:** 3 M for both stages, agreed by him on 2026-11-24. Read the plan's usage before any helpers. Show stage A
  by about half of it. Stop at the cap and say so; never go past it silently.
- **Who does what:** Sonnet helpers of kind `collect` may gather pages and pictures; the judging and the design are
  the session's own work. No review helpers, no refuters, no repair rounds, no spec (the creep gate enforces this).
- Touch only `docs/program/monitor/`. Do not touch `.claude/hooks/`. Commit nothing.
- **To him:** the picture first, plain words, the answer first, short, a handful of numbers, no file paths in the
  closing message. Only "approve:", "cap:" and "fact:" questions.
- **First step:** save two memory notes of his rulings of today: a proof of concept approved by him comes before any
  build; and a brief for another session carries his words in full, never a shortened version.

## 8. Done when

He has seen the findings page and one proof-of-concept picture on the crowded hours, and has said yes or no.
