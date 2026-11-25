# The session tool's move to Rust: brief for the session that runs it

Written 2026-11-24 by the round 9 coordinator, whose window was full. **His words are the task. They outrank this brief
and every file it points at.** They are in full in `round9/FEEDBACK.md`, `FEEDBACK-2.md` and `FEEDBACK-3.md` (read all of
FEEDBACK-3: his choice of Rust and his four messages on how to do it).

Deliverable of the first part: docs/program/monitor/round9/migration/SRS.md, the floor checks it names, the enforcing
hook, and a vetted list of skills; then his approve: for installs and for level 1.

## 0. The order he set, unedited (latest; it overrides the order of section 2)

> Do you understand the workflow I specified you to do, like in what sequence we will proceed, get the skills, gather the skills, plan it out, identify common failure modes with Rust development and migrations from JavaScript to Rust, and then taking all of those into consideration, saving that, creating a hook to so that these skills, information, and failure modes are enforced and avoided by the developer helpers, and then start the session for developments. So yeah, do you understand this? And if you do, like we'll start the session and the development accordingly. Understood? So like what you just told me to do is just isn't making sense in that regard.\

The sequence, in his order:
1. **Skills:** several independent Sonnet collect helpers find and vet well-reviewed Rust, Tauri and Microsoft
   build-tool skills (section 2a).
2. **Plan** the migration (levels of section 1, against the requirements and floors of section 2.1).
3. **Failure modes:** collect the common failure modes of Rust development and of JavaScript-to-Rust migrations
   (published sources, quoted), each with how it is avoided or caught.
4. **Save** it all: requirements with floors (SRS), the chosen skills, the failure modes and their checks.
5. **Hook:** enforce the skills, the requirements and the failure-mode checks on every developer helper (Opus,
   build-invariant).
6. **Then start the development session(s)**, with his caps.
Ask his cap before step 1; installs need his approve: with source and size.

## 1. What he decided and was told (2026-11-24 evening)
- **Rust**, his choice after an unbiased table (FEEDBACK-3 (a), (b)). The table said: what he sees on screen is the same
  in every language; Rust is ahead on hiding the code, size, memory, early error catching, parsing speed and window
  framework (Tauri); Go on setup size and rebuild speed. Rust on Windows needs rustup and Microsoft's C++ Build Tools
  (several GB): nothing is installed without his word, named with source and size first (CLAUDE.md rule 3).
- **Order** he accepted as reasoning: level 1, a Rust program with its own window, the approved picture unchanged
  inside it (reader, store, file server, live feed, installer in Rust); level 2, the picture's logic in Rust compiled
  to WebAssembly drawing the same shapes; level 3, the hooks run by one Rust program, only after measuring what the
  hooks cost per tool call now; a fully native picture decided after level 2, from what memory and protection still
  lack, because a native picture cannot be checked against today's as closely.
- **Also open from FEEDBACK-3:** live answering and stopping must reach the real sessions (first find what route an
  outside program has into the app); a plugin so it starts in one step in its own window or inside the app; giving it
  to others without exposing how it is built (plugin files are plain text: keep the plugin a thin launcher, the logic
  in the compiled program). History is set aside by him for now.

## 2. The first part, in this order
1. **SRS** (`round9/migration/SRS.md`): a software requirements specification in the standard structure (ISO/IEC/IEEE
   29148: purpose, scope, terms, functional and non-functional requirements, each with a verification method). Built
   from the files, never from memory: all FEEDBACK files of round 9, `round8/clickable/final/FEEDBACK.md`,
   `NEXT-ROUND-8.md` sections 1 and 3 (goals, stranger test), `round9/MAPPING.md`, `round9/tool/NOTES.md` (every rule and
   number found while building), `round9/tool/data/README.md`, his memory notes on pages (glance, plain words, readable
   at 1870 px, no procedural creep, proof of concept first). Each requirement: an id, the statement, its source (file
   and his words), a **floor** (the measure and the least it must reach, today's value where measured), and how it is
   checked. **Floors, not copies (his words (d)):** the new version must not fall below any floor and may go as far
   above as it can; nothing requires today's pixels or today's code. Include what must never come back (lanes, ticks,
   hook rows, week strips, a mesh of lines, cards on empty grey, tables).
2. **Floor checks**, runnable: the behaviour scripts that exist in `tool/src/shoot.mjs` (clicks, wheel, drag, panel:
   36 checks in the fix group), the numbers (slowest frame, label overlaps, arrows at once, who waits), the stranger
   test's questions, and for level 1 a data check: the Rust reader yields at least every fact today's reader yields
   from the same session files (more is allowed). Screenshots of today's tool at fixed moments are kept as reference
   for a person, not as pixel targets.
3. **The hook** (kind build-invariant, Opus): migration sessions start with the SRS in context; a change to the SRS
   needs his approve: (builders cannot weaken a floor); a step does not count as done (commit or landing) while a
   floor check fails. Follow how the existing hooks are built and tested (`.claude/hooks/`, `ENFORCEMENT-TABLE.md`).
4. **Skills**: one collect helper (Sonnet) searches GitHub and the web with generic terms only (no project names, rule
   4) for well-regarded skills or guides for Rust, Tauri and Rust-to-WebAssembly work by coding agents; judged by
   publisher, upkeep, users' issues; read in full; nothing installed without his word.
5. **Then ask him** (approve:): the installs (exact sources and sizes) and level 1 with a cap. After the install, the
   first job is a trial: Sonnet builds the Rust reader and the data check compares it with today's; it settles
   whether Sonnet is enough for plain Rust (routes: Sonnet for plain code, Fable for the picture, Opus for checks and
   hooks; `.claude/hooks/tier-routes.json`).

## 2a. His message after this brief was written, unedited (it changes 2.4 and 2.5)

> Also, I did say Fable for UI work, but I think that's a very inefficient use for tokens. And since the UI mapping, all of the design, everything is already made, we know everything. I don't think using Fable for this would be of any benefit. We should save it for more complex tasks and complex problems that we're having difficulty solving. And the skills from GitHub, if they are worth looking for, I'd recommend spawning like multiple lots of Sonnet subagents, unbiased. By the way, to find the specific well-reviewed or like having good user feedback, Rust skills or Microsoft build skills that arm our builders with the right uh, power or whatever, like the skills to be able to go through this smoothly and nicely. Okay, and so that's my point. Then we can like actually allocate the token caps and start the development, etc., etc. Get it?

So: **no Fable in this migration** (the design is settled; Fable is kept for hard problems). The routes file still
says design → Fable from his word of 2026-11-24 morning; record his new word through the journal tool and route the
picture work as build (Sonnet) or, where invariant-sensitive, Opus. **Skills:** several Sonnet collect helpers, each
searching on its own (unbiased, generic terms only), for well-reviewed Rust, Tauri and Microsoft build-tool skills;
then caps and development. **No cap is agreed yet:** ask his cap: first (about 10 M was estimated for section 2).

## 3. Rules
CLAUDE.md rules 5 to 8: read usage before any helper wave; his cap is a hard stop, counted from the transcripts (memory
note "Helper token estimates run low": helpers guessed half their real spend today; give each a call budget and the
counting step). Plain words to him, the picture first, a handful of numbers. Write under `round9/migration/` and the
hook under `.claude/hooks/` (with its test); commit only with his word.
