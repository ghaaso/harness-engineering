# Lane check (`c1`): one serial check shared by many workers

Read `ROUND.md` beside this file first. It sets the standards, the method and the limits.

## Why this lane

Every piece of our work passes one check (a test suite of about ten minutes here; seconds in a small project, an
hour in a large one). In 25 of our own jobs the queue at that check was the most frequent limit (r57-0129). The
rule's document said a check shared by separate programs is "in no paper". That was a narrow search (mistake
r57-0610): threads, processes, programs and machines sharing one server are the same problem, and the library
already holds a paper on a merge queue (search `SubmitQueue`). This lane finds the standard model and the methods
with large gains.

## The frame to test (the top session's reasoning, not a finding)

- **The model.** Workers that alternate between work on their own and service at one shared server are a closed
  queue with a finite number of customers (the machine-repair model). Its saturation point, the number of workers
  beyond which each one only adds waiting, is slots x (time outside + time inside) / time inside. Our rule uses
  that formula and called it "reasoned"; if the literature states it, cite the source and its conditions.
- **Carrying more per check run.** If most changes pass, one run can clear several changes at once and a failure
  is found by splitting the batch (group testing). The best batch size depends on the failure rate.
- **Testing ahead.** A merge queue tests a change on top of the changes ahead of it before they have landed.
- **A shorter check.** Run only the tests a change can affect; order tests so a failure shows early; split the
  suite over the slots.

## Sub-topics, one collector each

1. **The queue model.** `queue`: the finite-source queue and the machine-repair model; saturation and asymptotic
   bounds (Kleinrock; Denning and Buzen 1978; Lazowska and others 1984, free online); mean value analysis (Reiser
   and Lavenberg 1980). The formula for the best number of workers with one and with several servers, and what
   changes when service is batched.
2. **Group testing.** `group`: Dorfman 1943 and what followed (optimal batch size, adaptive splitting, the bound
   on the number of tests), and group commit in databases as the same idea for a log.
3. **Batching and merge queues in practice.** `mergeq`: batch testing and bisection in continuous integration
   (Najafi, Rigby, Shang 2019; Beheshtian, Bavand, Rigby 2021; Bavand and Rigby 2021); Uber's SubmitQueue (held
   as quotes in `x06`: read the cited places); OpenStack's Zuul; Google's continuous testing (Memon and others
   2017); the documented queues of large projects. The measured gains and what they assume about failure rates
   and conflicts.
4. **A shorter check.** `shorter`: test selection by dependency and by prediction (held: r57-0306), test
   prioritisation in continuous integration (Elbaum and others 2014), flaky tests and what they do to batching
   (Luo and others 2014), build graphs that give the affected tests, splitting a suite over machines.
5. **Scheduling around one bottleneck.** `bottleneck`: flow shops with one bottleneck machine and the shifting
   bottleneck method (Adams, Balas, Zawack 1988), drum-buffer-rope as a model, the scalability law (held:
   r57-0307) and what limits it.

Search words for the library: `SubmitQueue`, `merge queue`, `speculat`, `test selection`, `Scalability Law`,
`Amdahl`, `group commit`, `batch`, `queue`, `Suleman`, `Graham`.

## What the report must settle

- The model and its formula for the number of workers, in ratios, for one slot and for several, with and without
  batching; where the formula of our rule stands against it.
- For batching, testing ahead and a shorter check: the largest measured gain, at what failure rate and suite
  length, and what each needs to know about a project before it can be used.
- Which of them hold for a check of seconds, of minutes and of an hour, and for 3 workers and for 16.
- What our lane and tree do today: read records b1-0101 to b1-0126 and
  `docs/program/evidence/bottleneck-2026-11-18/BUILD-IN.md` section 1 (the check step); do not re-read the code.
- A ranked proposal for our check, with the measurement that would set each number.
