# Lane writers (`w1`): several writers on one object, as database engines solve it

Read `ROUND.md` beside this file first. It sets the standards, the method and the limits.

## Why this lane

Our rule for several writers of one file is thin: a two-way switch per file (own copies merged, or one owner) on a
count of conflicts (records r57-0406, r57-0128, r57-0301 to r57-0306). The owner asked how database engines get
many writers onto one object at full speed without lost or wrong writes, and for architectures with large gains.
An earlier round already collected much of this (extractor files `x02` to `x06`, `x15`); only six of its results
reached the rule. So this lane analyses what is held, reads what is missing, and proposes an architecture.

## The frame to test (the top session's reasoning, not a finding)

Engines do not have one answer. They name each failure and stop it separately, and they raise parallelism by four
separate means. The lane checks this frame against the papers and corrects it.

| Failure | Engine's remedy | For a session editing a file (to verify, not assume) |
|---|---|---|
| Lost update: one write replaces another | First writer wins; a write applies only on the version it read | An edit that must match the text it read; never a whole-file overwrite of a shared file |
| Dirty read: reading unfinished work | Each writer works on a snapshot | Own copies (worktrees) |
| Write skew: each change right alone, wrong together; a clean merge that fails | Track what each change read, validate when it lands | What a change read is its dependencies; the check is the last judge |
| Phantom: a new item appears where another change assumed none | Range or next-key locks | Two fixes adding a function or a registry entry at the same place |

Means of more parallelism: (1) claim smaller units than the file, with an intention mark above; (2) fix the
order before work starts, so nothing is redone; (3) lay the object out so writes commute; (4) merge by structure
and not by lines.

## Sub-topics, one collector each

1. **Failures and isolation.** `isolation`: the critique of the ANSI isolation levels (Berenson and others 1995),
   Adya's generalized definitions, making snapshot isolation serializable (Fekete and others 2005; Cahill, Roehm,
   Fekete 2008; Ports and Grittner 2012 for PostgreSQL). What each level costs and prevents, with measured cost.
2. **Grain.** `grain`: granularity of locks and intention modes (Gray and others 1976, held as quotes), key-range
   and next-key locking (Mohan 1990; Lomet 1993), predicate locks, lock escalation; what the engines measured
   when the grain got finer. What the grain would be for code: file, class, function, statement.
3. **Versions and validation at high speed.** `engines`: Kung and Robinson 1981; Hekaton (Larson and others 2011;
   Diaconu and others 2013); Silo (Tu and others 2013); TicToc; Cicada; the 1000-core study (Yu and others
   2014). Which design wins under which contention, with the figures.
4. **Order first, and writes that commute.** `order`: Calvin and deterministic databases (Thomson and others 2012;
   Abadi and Faleiro 2018), Aria; escrow (O'Neil 1986); phase reconciliation (Narula and others 2014); invariant
   confluence (Bailis and others 2014, held); the scalable commutativity rule (Clements and others 2013);
   partition ownership (H-Store). What must be known before work starts, and the gain when it is.
5. **Merging code by structure, and catching the wrong clean merge.** `merge`: semistructured and structured
   merge (Apel and others 2011, 2012; later tools such as IntelliMerge, Spork), refactoring-aware merge,
   detection of semantic conflicts (verified or by generated tests), and the studies of several AI agents in one
   repository (r57-0308 holds them as summaries only: read them in full).

Search words for the library: `snapshot isolation`, `Kung`, `Silo`, `Hekaton`, `Calvin`, `deterministic`,
`granularity`, `intention`, `escrow`, `commutativ`, `CRDT`, `confluence`, `Bw-tree`, `structured merge`,
`semistructured`, `write skew`, `ARIES`.

## What the report must settle

- The frame above: right, wrong, or missing a failure or a means.
- For each means of parallelism: the largest measured gain, under which contention, and whether it survives when a
  writer is a model session.
- What the harness can enforce today and what it cannot: read `docs/program/evidence/bottleneck-2026-11-18/BUILD-IN.md`
  section 1 (the several-writers step) and records b1-0101 to b1-0126; do not assume how the Edit tool, a hook or a
  worktree behaves beyond what those records show.
- An architecture for our case, ranked, that replaces the two-way switch, with its behaviour for 2 writers and for
  16, for a small file and a very large one, and the measurement that would set each number.
