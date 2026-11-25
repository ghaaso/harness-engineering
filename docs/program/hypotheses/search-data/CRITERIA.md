# Data side: the criteria, fixed before any rival design was seen (2026-11-25, 19:58 UTC by the clock)

Standing: step 1 of the process the owner approved (journal r58-0024; his order r58-0017 and r58-0021). Written by the
top session when the only design in existence was its own earlier draft. It is not changed after candidates are read.
A fault found in it later is recorded as a correction with its reason, and every candidate is then judged again.

The goal: one model that answers "which files" for task words, for a change and for an error, and works on a
repository it never trained on. A data design is judged by what it lets such a model do, and by what the teaching
material says a data step can and cannot do. `N x.y` is an entry of `docs/program/learning/MECHANISMS-NEURAL.md`,
`D x.y` of `MECHANISMS-DATA.md`.

## 1. Seven profiles

Six are the demands of the problem, read as demands on the data. The seventh is the data's own.

| | A data design must | Entries |
|---|---|---|
| P1 | **Hold all three questions as tasks.** For each question: the asked-about thing, what is known when it is asked, the right files, the time. And the links between the asked-about thing and the candidate files, so that a candidate can be described relative to the question. Checked per question: where the label comes from, whether that source exists, whether the input is what would be known at asking time. | D 9.1, D 6.1; N 9.7, N 10.5, N 12.7 |
| P2 | **Keep every recorded event as itself.** With its grouping, size, time and content. Whatever is split can be joined back exactly; facts that become known at different times are stored apart; nothing is aggregated before the model; nothing is dropped at collection without a trace. | D 4.3, D 4.4, D 4.8, D 9.2, D 9.3, D 1.1; N 9.5 |
| P3 | **Serve a repository never trained on.** The repository is the unit that is sampled, held out and averaged over. The sample is drawn by a stated design from a stated list, so that what it stands for can be said. Whole repositories are held out; copies of one project are one entity. The owner's kind of repository (small, private) lies inside what was sampled. Each repository is described, so that amounts can be expressed relative to it. Nothing works only through an identity. | D 1.2, D 2.6, D 2.7, D 3.1, D 3.2, D 8.1; N 2.1, N 7.1, N 8.1, N 8.4, N 9.10, N 13.7 |
| P4 | **Give only what was known at the moment of the question.** Every fact has its time; the inputs of a question are built from facts dated before it, where the data is loaded; the asking time of each question is defined; splits follow time and the validation stretch matches what is predicted; whatever is learned from data is learned on training data only. | D 6.1, D 6.2, D 6.4, D 7.1, D 9.1, D 9.4; N 13.9 |
| P5 | **Keep kinds apart.** Kinds of entity and kinds of link are separate where they are collected, with direction and attributes. For each kind: how it is obtained, and what the recording misses or adds. | N 2.2, N 13.1, N 13.9; D 9.3, D 1.1, D 1.2 |
| P6 | **Reach beyond history.** Content, names and structure of the code, and the texts, are in the data for the version current at each asking time; present for all rows or for none, never by accident of collection. How much of the right answer each kind reaches is counted before it is relied on. | N 5.5, N 11.1, N 12.5; D 3.3, D 5.3 |
| P7 | **Be trustworthy.** How the data came about is known and written down. What must hold in it is stated and tested, never assumed. Missing values are treated as information. Results are read against naive baselines, per segment, with measures that rank the right files against all others. A leak is tested for, not looked for. | D 1.1, D 4.2, D 4.5, D 4.6, D 5.1, D 5.2, D 5.3, D 6.3, D 7.2, D 7.3, D 7.4; N 13.6 |

## 2. Levels

Per profile a candidate gets one level, with the reason and the entries:

- **by construction**: the design guarantees it.
- **open on a count**: it holds if a count the design itself names comes out.
- **in part**: it holds for a named part (which questions, which repositories, which rows); the rest is named.
- **not met**: the design has no mechanism for it.

"By construction" is above the two middle levels and those are above "not met". Two candidates at a middle level on
the same profile are compared in words: one is better only if what it lacks is a part of what the other lacks.
Levels are never added, averaged or counted across profiles.

## 3. Vetoes

A component is struck when it does what an entry says cannot work for this goal. What depends on a struck component
falls with it, unless it can be re-based on another candidate's component.

- **V1.** The store, or what a model is given, is a projection or an aggregate from which the recorded facts cannot be
  rebuilt (D 4.3, D 4.8, D 9.2).
- **V2.** A record is dropped or capped at collection, so that the cap can no longer be told from the world (D 1.1).
- **V3.** A split that shuffles time-ordered data; or any input, statistic or label that reads facts dated at or after
  the question or inside the test period (D 6.1, D 6.2, D 9.1).
- **V4.** No whole repository is held out of training, or copies of one project sit on both sides (the goal; D 1.2;
  N 8.1).
- **V5.** A sample of repositories gathered by exploration or convenience and then read as standing for repositories in
  general (D 2.3, D 2.8, D 3.1). Such a sample is allowed only with its claim cut down to what was sampled.
- **V6.** An input that exists only through a stored identity per file or per repository (N 9.10, N 13.7).
- **V7.** A text written after the answer was known, used as if it were the question (D 6.1). Allowed as a separate,
  marked tier.
- **V8.** The standing rules: the owner's two private repositories and all held-out truth stay on his PC; no project
  name, path or code in an outside request; every download named with source and size; training fits about four large
  rented cards for about eight hours.
- **V9.** A key or dependency claimed as proved by the data (D 4.2).

## 4. How candidates are compared

1. Each candidate is read in full with both learning files open. Each component is checked against the entries it
   cites (does the entry say that?) and against the vetoes.
2. Per profile: a level, the reason, the entries. Recorded.
3. A candidate is removed as a whole only if its base component is struck and cannot be replaced, or if another
   candidate is at least as good on every profile and better on one. Otherwise it stays, also when weak: its strong
   components are material for the merge.
4. Where an order among survivors is needed, the weakest profile decides, then the next weakest. No sum, no average,
   no vote.
5. Merge: per component, the option that serves the profiles it touches best, from any candidate. A choice in one
   component constrains the components that depend on it; those are chosen again until nothing conflicts.
6. A merged design is judged like any candidate, and with a pass over both learning files entry by entry: every entry
   is used by a component or set aside with a reason.

## 5. Stop rule

A round is: judge, merge, entry-by-entry pass, judge again. The search stops when a round changes no component, or
after three rounds. If a merged design is worse than an original candidate on every profile, the merge is discarded
and that candidate is the base of the next round. If two designs are left of which neither is at least as good as the
other everywhere, both are kept, the count or test that would separate them is named, and the hypothesis is the one
with the stronger weakest profile.

## 6. What this process cannot do (told to the owner, r58-0024)

The rival designs come from separate runs of one family of model, so their variety comes from assigned starting
points and separate contexts only. The judge wrote one of the candidates; relabelling reduces that bias and does not
remove it. The process cannot prove a design right: it gives the best-argued one and the counts that remain.
