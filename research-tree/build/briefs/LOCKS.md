# Brief: the tree's locks against the database way (a session started by top session 3; kind orchestrate, Opus)

Approved by the owner on 2026-11-20: "Yes, 40 M" to the ask "cap: 40 M tokens for a fresh session to check the tree's
locks against the database way?". His words, verbatim (typed in top session 3, transcript
2e993f56-2f1e-43bc-9ba7-77bd4d0832a6): "From what I've learned in database engineering, especially from the CMU course
of database implementation engineering, they specifically mention not to use the OS locks. I don't remember the exact
reason for it, but I do remember that they did not recommend using OS locks. And I'm seeing that in your pilot plan,
you're using OS logs and that logic instead of database stuff. So look into that. That might be a flaw in your plan.
The rest, for now at least, I'm not seeing any issues." ("OS logs" is his speech for "OS locks".)

## The question
Where do the tree's scripts, the lane, the hooks and the research run's new scripts take a lock, a claim, a fence, a
lease or a slot, and with what primitive? Does the database literature (the CMU course first, as he cites it) advise
against that primitive, and why? For each place: is it a real flaw here, with the failure it would cause in our use;
which proven mechanism replaces it, used whole (r57-0040); and what the change costs. Then the verdict in plain words.

## Steps
1. **One Opus analyse helper.**
   a. Inventory: every lock, claim, fence, lease, slot, ledger or exclusive write in `tcb/` on branch `build`
      (`C:/Users/User/Documents/projects/hb/research-tree/tcb/`), the lane (`research-tree/lane/` and its scripts), the
      hooks (`.claude/hooks/`), `tools/`, and top session 5's run scripts (session
      local_d4f287db-16fa-445a-b208-56390b8c4518; find them from `research-tree/build/TOP-STATE.md`, its commits on
      `build`, or its notes). For each: file and line; the primitive (exclusive create, rename, mkdir, an OS file
      lock, a stale-break timer, a version check, ...); what it protects; who contends for it; what happens when a
      holder dies, is killed, or the PC sleeps.
   b. Sources, read raw and quoted with their place (CLAUDE.md rule 4: nothing of the project in any request; r57-0110;
      r57-0014): the CMU 15-445/645 lecture notes or slides on latches (index concurrency control) and on two-phase
      locking and the lock manager; Graefe 2010, "A survey of B-tree locking techniques" (locks against latches);
      Crotty, Leis and Pavlo, CIDR 2022, "Are You Sure You Want to Use MMAP in Your Database Management System?";
      SQLite's own documentation on file locking. About five public PDFs or pages, under 10 MB in all (named to the
      owner with his go). Also the library (`bash library/lookup.sh lock`, `latch`, `lease`, `fencing`, `claim`;
      r57-0415, w1-0400 to w1-0407, the b1 records on the lane and the hooks) and top session 4's faults audit: start
      from it, do not redo it.
   c. For each place: real flaw here or not. Our contenders are a few sessions and helpers on one Windows PC, holding
      for seconds to minutes, not threads holding for microseconds: say which of the course's reasons carry over and
      which do not. The proven replacement used whole (for example a lock table with modes and a first-come queue, a
      lease with fencing tokens, or an embedded database as the lock manager); its cost to build and its risk.
2. **One blind Opus refuter** in a fresh context, on the helper's file; you decide its findings (r57-0021) and have them
   folded.
3. **The owner's page**: add the result to the complexity page (private Artifact
   https://claude.ai/artifact/JQsXXJ43jk7CJBgbJCZeG9; read it with the Artifact tool first, since other sessions have
   updated it): the answer first, a table of the places, what would change. Sonnet build.

## Budget
Cap 40 M tokens for everything, your own turns included (r57-0038: expected need plus a buffer). Expected, M tokens /
limit: analyse 8.05 / 18.6 (E 1a analyse/opus, n=19); refute 10.6 / 18.5 (r57-0173, n=16); fold 4.5 / 6.1 (the two
folds of 2026-11-20, 3.0 and 6.04); page 1 / 2; your turns about 5. Read usage before each fan-out (CLAUDE.md rule 5);
stop new starts at the cap and ask him with `cap:`.

## Rules
- CLAUDE.md rules 1 to 7: no design question to him (a question starts `approve:`, `cap:` or `fact:`); nothing he has
  not asked for (r57-0007); every helper names its kind and model (the tier hook).
- This is a check: change no script. A fix is a separate round he approves.
- If a finding bears on top session 5's run scripts, send that session one short message with the finding and the file,
  as data; do not ask it to change anything.
- Writers: write library records and `TOP-STATE.md` only if TOP-STATE.md's latest closing line names no running session
  as the one writer; otherwise write your records as draft lines in `research-tree/build/locks/records-draft.jsonl` and
  say so in your report.
- Commit your briefs and outputs on `build` through `hb` (`git -c core.longpaths=true`; `-F` message files ending with
  the Co-Authored-By line; identity Muhammad Bilal / Tempest-Zero). Never touch `docs/program/pipeline-diagram/`. Do
  not merge or push `build`.
- Report to him in your session when done: plain words, the answer first, short.
