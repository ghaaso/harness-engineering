# Why the subagent research did not prevent mistakes a lecture deck names (2026-11-25)

The owner's question (his message of about 17:05 UTC, in full in the journal record of that hour and at the end of
this file): a very large number of tokens went into research sessions run by subagents, "and yet we're still making
the mistakes that a random university deck has already mentioned. And we spent days rediscovering those things."
Found by the top session itself, from the files named below. Nothing was run.

## What was looked at

- The research run of 23 November: `C:/research-runs/2026-11-harness-leads/` (`GO.md`: about 1,515 M tokens expected,
  cap 1.9 B; 19 fields under `fields/`), its field brief `briefs/FIELD.md` and writer brief `briefs/field/writer.md`.
- The record book's rules: `library/README.md`.
- How the round's forms were chosen and built: `improve/CANDIDATES.md`, `improve/units/U5/BRIEF.md`,
  `improve/units/U6/BRIEF.md`.
- The four faults: `improve/FAILURE-MODES-2026-11-25.md`, `improve/units/T1/report.md`, `T3/report.md`.

## The evidence

1. **The principles are not in the research at all.** Counted over every markdown file of the run's 19 fields
   (grep, case-insensitive): "Weisfeiler" or "1-WL" 0 times; "labeling trick" 0; "over-squashing" 0; "over-smoothing"
   0; "mean aggregation", "sum aggregation" or "injective" once; "expressiv..." twice. By contrast "inductive" 143
   times, "pairwise" or "two-tower" 54, "transductive" 45: as words inside quoted results, not as rules for choosing.
2. **The run was built to produce quoted results.** A field is: five Sonnet readers collect from papers; an Opus
   writer turns that into numbered claims, each "the claim in one sentence; its mark; the quote; its place" (writer
   brief lines 18-20); a gate and refuters test that each quote stands in the paper; a last step writes the records.
   A typical record: "C74. TGN's memory gives nearly 4 % higher precision at about three times the time." Every check
   in the run is a check of citation, none of understanding.
3. **The sources were papers read for their numbers.** "Readers begin with the papers a topic is built on and its
   survey" (FIELD.md, rule 2 of its notes). No course or textbook was read end to end. The record book goes further:
   "A `summary` or `textbook` figure is never used for a decision" (README rule 5), and it has no kind of record for
   a mechanism or a design rule: only rulings, facts, statuses, results, hypotheses, open tasks, mistakes.
4. **Whoever decides was forbidden to read.** FIELD.md lines 17-19: "You only coordinate. You never read a collect
   file, a paper text, a claim, a report, a review, a score or a record: helpers read them and return at most ten
   lines." The repository's rule 5 says the same of every coordinating session. So the sessions that read were small
   and narrow and returned ten lines; the session that chose designs saw ten-line returns.
5. **Forms were chosen by reported gain and built at defaults.** CANDIDATES.md ranks 18 forms by "published gain as
   recorded" and "chance [my judgment]"; it has no column for what a form can and cannot represent on our problem.
   U5's brief orders "GraphSAGE (mean aggregation) and GAT (2 heads), 1 or 2 layers". U6's brief, a Sonnet build job,
   orders "DyGFormer and TGN as DyGLib defines them; sweep neighbours 20/32".
6. **What the research did know was not used as a constraint.** It holds "A pure memory of past edges (EdgeBank)
   beats parametrised temporal models on some datasets" (3c, C71) and the pair-conditioned inductive models that
   transfer across graphs (3b, 3c). The temporal models were built anyway at defaults, and nothing was designed for
   transfer.
7. **The counter-example of today.** The top session read one lecture deck in full (96 slides, about 25 K tokens
   of text, against about 1.5 B for the run). From it the four faults could be named at once: a mean cannot count;
   one vector per file cannot hold a pair fact; a window of 20 to 32 events on a history of 342,722; easy negatives
   against a hard ranking.

## The causes, in order of weight

1. **Research was run as evidence collection, not as learning.** Its product is a catalogue of "method X scored Y on
   Z", checked for quotation. That answers "what exists and what was reported". It cannot answer "which design suits
   this problem and why", because reasons were never a thing it recorded.
2. **Reading and deciding were put in different heads.** Understanding does not survive a ten-line return. The one
   session with the whole picture was the one barred from the sources.
3. **No step asked for an argument before a run.** Between "choose a form" and "build it" there was no place where
   someone had to write what the model must be able to represent and show that this form can. Our rules reward
   measuring ("a missing fact is measured", "test the strongest form, parameters swept") and none demands reasoning
   first; the round itself was approved as eight forms to try.
4. **Papers instead of teaching material.** A paper says what beat what. A course says what each mechanism can and
   cannot do. The second is what prevents a wrong choice, and our own rule kept it out of decisions.
5. **Cheap builders at library defaults.** The settings that failed (mean aggregation, 20/32 neighbours, random
   negatives) were defaults nobody examined.

Not the cause: the subagents' reading itself. Papers were read as full text and the quotes were checked; the catalogue
is reliable. It was asked the wrong question.

## What follows (proposed; rules are the owner's to change)

- The session that designs reads the teaching material itself, in full. Helpers find, fetch and prepare sources and
  check citations; they do not stand in for understanding.
- No run without a written hypothesis: for each design decision the alternatives, the strengths and weaknesses of
  each for our problem, why the choice follows, and what it predicts. The owner sees the argument before card time.
- A place in the record for mechanisms and design rules, beside results; the rule that textbook knowledge never
  enters a decision holds for figures, not for mechanisms.
- A test runs only to separate hypotheses that survived the argument.

## The owner's words, in full

> "No, stop! Don't prepare a build of this design. You just mentioned that good reasoning cannot promise the good results. It's never about promising good results. Obviously, we'll have to test that. That's such a stupid statement. It's about that your hypothesis that this should work good has to be logically consistent and strong enough for us to justify testing it. That's the point I'm trying to make. You're stuck in a loop where you're just trying absolutely everything and trial diagnosis shit, and hoping that will eventually come to a solution, even if it takes months or years. That's absolute. That's a horrible strategy to have. The thing is that actually knowing the nuances in training and utilizing these models, their strengths and weaknesses, and what strengths would be good for us and what weaknesses would be absolutely horrible for us. That's the point. And the optimizations that these architectures have, there's a lot of nuance in architectures outside there. There are even many nuances in the transformer knowledge graph transformers, because each nuance has its own strengths and weaknesses different from the other nuance architecture, and they're used according to the use case. But if we started trying absolutely every combination possible, then if you start using the combination formula, you'll have so many combinations that it would cost us a lot of money and a lot of time, a very lot of time. So that's the point. The hypothesis has to be logically strong enough, and the formula we're choosing and we're writing, also has to be strong enough. Whether we're using random walks, or if we're using like message passing, or there was one, or we're using Laplacian position stuff. These decisions have to be logically strong and make sense. I'm attaching more decks here about knowledge graphs and GNNs, etc., so that you have a better idea of things, because I just noticed that you've learned a lot from the deck I just gave you, and the mistakes we've made could have been avoided if we just looked at it first. So sending subagents on research obviously has not worked well for us by far. I'm not sure why, and I want you to discover why that has not worked for us at all, because we had a very large amount of tokens spent on the research sessions using subagents, and yet we're still making the mistakes that a random university deck has already mentioned. And we spent days rediscovering those things. So I hope you're understanding where I'm getting, and if it still isn't clear, or you disagree, let me know right now so we can clear these things out and come to a conclusion and an agreement."
