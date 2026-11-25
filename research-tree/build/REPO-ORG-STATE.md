# Repository organisation: state (the owner's request of 2026-11-25)

Session 34bdfefe (Fable, top session; it coordinates and decides, helpers read).

His words in full: `docs/program/repo-organisation-2026-11-25/OWNER-WORDS.md`. They outrank this file.

Cap 20 M tokens (his answer to a cap: question, 2026-11-25: "Yes, 20 M"). Meter at the reading before the
fan-out: weekly all models 78 %, Fable 46 %, reset 2026-11-30 12:00 UTC.

Cap 50 M tokens (his answer of 2026-11-25 to a second cap: question, "Yes, 50 M"; replaces the 20 M above).

## Plan

1. Git state by script (done by the top session): branches, what holds what, pushed or not, uncommitted files.
2. One wave, three Sonnet readers side by side, each 4 M limit (expected about 2 M, basis r57-0115):
   `research-tree/`, `docs/`, the rest. Brief: `docs/program/repo-organisation-2026-11-25/briefs/READERS.md`.
   Outputs: `docs/program/repo-organisation-2026-11-25/in/`.
3. The top session derives what `main` holds and how branches are divided, and shows it as a page.
4. Nothing is deleted, merged, renamed or pushed without his approve:.

## State

- 2026-11-25: steps 1 to 3 done. The three readers handed back (`in/research-tree.md`, `in/docs.md`, `in/rest.md`);
  the proposal is `docs/program/repo-organisation-2026-11-25/PROPOSAL.md`, the page `page/repo-map.html` beside it
  (published as a private Artifact). Step 4: nothing done; the six moves of PROPOSAL.md section 5 wait for his
  approve:. A session that carries them out reads PROPOSAL.md sections 5 and 6 first.
- 2026-11-25, later: his second message (two people) folded in as PROPOSAL.md section 7; he approved all six moves
  (r58-0008), kept the evidence guard (r58-0009) and raised the cap to 50 M (r58-0010). All six are carried out:
  PROPOSAL.md section 8 says what happened and where it differs; records r58-0103 and r58-0104. Counted 25.95 M of
  the cap when the builders had handed back.
- Open, none of it this session's to do without his word: his merge of PR 4 after the teammate has seen it; 209
  uncommitted files of the session tool's Rust move (held by its own gate); the record book's way onto main.
- 2026-11-25, his third message (the harness kit for the teammate): his words and what was understood are in
  `docs/program/harness-kit-2026-11-25/OWNER-WORDS.md`; he approved "the whole kit" inside the same 50 M cap.
  Plan: wave 1 side by side: two Sonnet readers (`briefs/READ-METHOD.md`, `briefs/READ-RESULTS.md`, outputs in
  `in/`) and one Opus builder (`briefs/BUILD-SETUP.md`: `harness-kit/setup.mjs`, `harness-kit/check-clone.mjs`);
  wave 2: one Opus writer (`briefs/WRITE-DOCS.md`: `harness-kit/README.md`, `ORCHESTRATION.md`, `RESULTS.md`; the
  top session first saves the builder's hand-back as `in/setup-report.md`). Then the top session: run
  `node harness-kit/check-clone.mjs` once; commit `harness-kit/` and `docs/program/harness-kit-2026-11-25/` on
  `bilal/build` by explicit paths and push; add `harness-kit/` to the pull request's branch `bilal/promote-first`
  (a temp work folder of that branch, `git checkout bilal/build -- harness-kit`, one line in `PROVEN.md` pointing at
  `harness-kit/README.md`, commit, push); one line in CLAUDE.md "Where things are"; a journal record; report to him.
  A successor session can finish from this line if the top session's window reaches its ceiling.
- 2026-11-25, last: on his word ("Yes, update it") the remote `origin` of this folder now points at
  `https://github.com/ghaaso/harness-engineering.git` (it was the Tempest-Zero address, which GitHub redirected);
  reads and the upstream of `bilal/build` checked through it.
