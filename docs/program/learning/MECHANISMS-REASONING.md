# What each step of a graph of thoughts can and cannot do

Compiled 2026-11-25 by the top session from material it read itself (the owner's order: journal r58-0027; the list of
sources with sizes and hashes: `C:/research-runs/2026-11-26-got/LIST.md`). The lens is his: only what an operation can
and cannot do, with the counterexample that shows the limit. No scores of one method against another. This file holds
no opinion about our own work; what of the method can be run here is said in the plan of each search. Entries are
cited as `R x.y`.

Sources, with the short names used below, and exactly what was read:
- **G**: Besta and others, "Graph of Thoughts: Solving Elaborate Problems with Large Language Models" (the method's own
  paper, 63 pages). Read in full: the main text, the execution plans of its four worked cases, the prompts of the
  document-merging case (merge, score, combine, improve) and the configuration listings at the end. Not read: the tables
  of example inputs and answers (lists of numbers, the sample agreements) and the reference list. The marks of its
  Table 1 did not survive as text.
- **GR**: the four README files of the paper's reference code (main, controller, operations, examples), in full.
- **T**: Besta and others, "Demystifying Chains, Trees, and Graphs of Thoughts" (an overview by the same group, 40
  pages). Read in full: sections 1 to 13 and appendices C, D and E. Not read: appendices A and B (one paragraph per
  chain scheme and per tree scheme) and the reference list. The cells of its Table 1 did not survive as text.
- **W**: University of Washington, CSED503, "Reasoning and Tool Use". **K**: Wisconsin CS839, lecture 8,
  "Chain-of-Thought". **Z**: "Science of Large Language Models", lecture 4. **A**: UT Austin CS371N, lecture 19. The
  text of all four decks was read in full; their picture-only slides were not looked at. None of the four covers
  graph of thoughts itself; they cover what it is built on (step-by-step reasoning, several samples, tree search) and
  where that fails.

---

## 1. The frame

**1.1 A thought, an edge, a graph.** "Units of information ('LLM thoughts') are vertices, and edges correspond to
dependencies between these vertices." An edge from t1 to t2 means t2 "has been constructed using t1 as 'direct
input'". A thought is "a semantic unit of task resolution, i.e., a step in the process of solving a given task"; its
size is the designer's choice: "We purposefully do not prescribe what is a single 'thought'". Thoughts can be of
different kinds in one graph (a plan, and the text written from it). (G abstract, sections 2.1, 3.1; T 4.1, 4.2)

**1.2 The four things a run consists of.** The graph of thoughts so far; the transformations that add to it; "an
evaluator function used to obtain scores of thoughts"; "a ranking function used to select most relevant thoughts".
(G 3)

**1.3 What a graph adds to a chain and a tree.** A chain adds steps between question and answer. A tree adds several
continuations of one thought, and backing out of a poor one. A graph adds a thought with several parents
(combination) and a loop on a thought (improvement). Its picture's own caption: "Intermediate thoughts are also
scored". (G figure 1; T 2)
- Cannot: help a task that is one line of steps. "GoT is unnecessary for purely sequential problems and adds
  computational overhead without significant performance gains." (T 8.1)

---

## 2. The plan and the record

**2.1 The plan is fixed before the run.** The graph of operations "is a static structure that is constructed once,
before the execution starts"; it "prescribes transformations to be applied to LLM thoughts, together with their
order & dependencies". Whether to stop or go another round "is dictated by the execution plan". (G 4, 4.4, 4.5; GR)
- Can: make a run inspectable and repeatable; fix the cost in advance.
- Cannot: adapt. A deck on agents names the failure of a plan made all at once: "no adaptation to
  intermediate observations". Deciding the next step from what was found is listed as future work ("adaptive
  scheduling"). (W; T 11)
- Cannot: supply the split. "What is the best graph structure for different tasks?" is left to whoever builds the
  plan; "the majority of current tree and graph topologies ... are created manually or semi-automatically". (G 1;
  T 11)

**2.2 The record is kept while it runs.** The reasoning state holds "which operation has been executed so far, the
states of all the generated LLM thoughts, their validity and scores". After a run "the graph is written to an output
file, which contains individual operations, their thoughts, information about scores and validity and total amount
of used tokens". (G 4.5; GR controller)

---

## 3. Splitting the problem

**3.1 What a split is for.** "To break down a task to the point, where the LLM can solve it correctly for the
majority of time using a single prompt (or with a few additional improvement steps)". "Combining or concatenating
subresults is usually an easier task than solving large task instances from scratch." (G 7.3)
- Can: turn one problem too large for a single answer into parts each small enough to get right. The method is
  "particularly well-suited for tasks that can be naturally decomposed into smaller subtasks that are solved
  individually and then merged". (G 1)
- Cannot: help where the parts are not separate. **Counterexample:** a scheme that writes an outline and then
  expands every point at once, each on its own: it "ignores dependencies between points". (T 9.3)
- Cannot: gain from splitting further than the problem's own joints: "a question that has clearly only two sub-parts
  does not benefit from many more subdivisions, as the additional branches then can be either redundant or wrong".
  (T 6.4.3)
- The paper's four cases all split into parts of the same kind (halves of a list, passages of a text). It gives no
  case whose parts constrain each other.

---

## 4. Generate

**4.1 What it is.** "One or more new thoughts based on an existing single thought." Two forms: one request that
returns k thoughts, made in one context; or the same request repeated k times, giving "context-isolated responses".
(G 3.2, figure 3)

**4.2 Can.** Raise the chance that one of several attempts is good ("sampling"), or try different splits. (T 6)

**4.3 Cannot.**
- Guarantee that the attempts differ. A tree-search deck lists "try to avoid duplication" as a task of its own; a
  method that writes its own examples "need[s] diversity: first cluster, then sample from each cluster". (K)
- Pay off without limit. More attempts cost more ("these methods trade compute for accuracy"), and the useful number
  "is hard to find and it often depends on the specific problem"; the overview reports the gain levelling off after
  a handful of attempts in the schemes it reads. (W; T 6.4.3, E.2, E.3)
- Stand in for a selection that can tell good from bad. Taking the most common of several answers works only as far
  as the answers are diverse and the good one is common: "think about the relationship between answer diversity and
  aggregation quality". (W)

---

## 5. Score

**5.1 What it is.** A function of the thought, the whole graph and the model: "in some evaluation scenarios, scores
may be relative to other thoughts". Three sources: a program ("simple local scoring functions"), the model itself
("the module may consult the LLM"), or a person ("the score may also be assigned by a human"). A check of
correctness conditions comes before the score. (G 3.3, 4.3)

**5.2 Can, where a program can check the thought.** Select reliably. In three of the paper's four cases the score
is an exact count of errors, and each attempt is scored once. (G 5.1 to 5.3)

**5.3 Where only a judgement is available.** The paper's one such case, merging documents: the model is asked for
two separate qualities (how little is repeated, how much is kept), "3 times for each value, and take the average",
and the two are combined by their harmonic mean, so that a high value on one cannot make up for a low value on the
other. (G 5.4, tables 39, 40. The last clause is this file's reading of what a harmonic mean does.)

**5.4 Cannot.**
- Be trusted as a check when generator and judge are the same kind of mind. "The LLM serves as both the generator
  (proposing steps) and the evaluator (scoring them)"; such a score is "a form of 'self-judge'"; the paper says of
  itself: "we partially rely on self-evaluation". (W; Z; G 8)
- See what it has no means to verify. "LLMs frequently generate plausible yet incorrect reasoning chains,
  necessitating structured verification mechanisms"; "weak verifiers hinder accuracy improvements". For reasoning
  that is not arithmetic "it's difficult to verify all of the individual steps ... so if [it] goes wrong, it may
  even be hard for a human to spot". The open problem named for tree search is the score itself: what is the value
  of a partial answer, and how does one know to abandon it. (T 8.2; A)
- Take a written reason as the cause of an answer. An explanation "can be merely a (sometimes incorrect)
  explanation"; it is "hard to know if [explanations] faithfully reflect what a model is doing". (Z; A)
- Be read as a probability unless it was calibrated: "uncalibrated confidence scores give false safety". (W)
- A stricter form of judging, from one scheme the overview describes: a step is checked by several separate calls
  and "only passes ... if all calls agree". (T appendix C.2)

---

## 6. Keep the best

**6.1 What it is.** Keep the N highest-scoring thoughts; it "assumes that the thoughts are already scored and throws
an error if they are not". Thoughts may also be removed outright where they "do not promise improvements".
(GR operations; G 3.2)

**6.2 A new thought competes with what it was made from.** In the merging case the combined documents are scored
and the plan keeps "the overall best attempt (including Step 1)": a combination that is no better than one of its
parents loses to that parent. (G table 34)

**6.3 Cannot.**
- Keep what the score does not see: a selection is only as good as the score under it (5.4).
- Bring back what was dropped, unless the plan says where to return to. In tree search that is a rule: below a
  threshold, "one backtracks to the parent and continues from there". (T E.2.1)
- One scheme makes use of what failed: rejected steps "are kept track of and are used in the next propose prompt as
  'forbidden steps'". (T figure 14)

---

## 7. Combine (aggregate)

**7.1 What it is.** Several thoughts, or the ends of several chains, become the parents of one new thought, "to
combine and reinforce the advantages of these thoughts, while eliminating their disadvantages". Its two purposes:
"synergy (i.e., being able to produce an outcome better than the individual ingredients) or an effective composition
of outcomes of tasks". (G 3.2; T 7)

**7.2 It is tried several times, and every try is scored.** Merging two sorted halves: ten attempts, each scored,
the best kept. Merging documents: five attempts at combining the three best, each scored. Counting keywords: three
attempts, each validated, an invalid one improved "up to 3 attempts". (G tables 5, 20, 34)

**7.3 Can.** Let every earlier thought contribute to the final one in few steps. The paper's measure: the volume of
a thought is "the number of LLM thoughts, from which one can reach [it] using directed edges". A tree gives the final
thought only its own path; a graph that splits and then merges gives it everything. (G 6)

**7.4 Cannot.**
- Be assumed to improve. The combining step makes its own errors, which is why each try is scored and why the
  parents stay in the comparison (6.2).
- Escape compounding. For a chain of steps each with its own chance of error, "P(failure) = 1 - product of
  (1 - p_i)": five steps at one in ten fail four times in ten. A system with "planning + execution but no
  verification" lets "errors compound silently". (W)

---

## 8. Improve (refine)

**8.1 What it is.** A loop on one thought: "an iterated thought with the same connections as the original". The
improving request is given what the thought should be measured against (the input list beside the faulty sorting;
the source documents beside the merged one). (G 3.2, figure 3, table 43)

**8.2 Can.** Repair what a check can point at. "The introduction of verification enables the reasoning frameworks to
iteratively refine". Where a validity check exists, only thoughts that fail it are improved, a bounded number of
times. (T 5.5; GR operations)

**8.3 Cannot.**
- Run without a stop rule: a loop needs "conditions on how many times one can loop over a node (based on the number
  of iterations or some terminal conditions)"; without one, "loops diverge or cycle". (T 5.5; W)
- Be assumed to improve either: in the paper's plans an improvement is one more attempt that is scored and kept only
  if it is the best. (G tables 5, 34)
- Be told apart from "over-thinking (wordiness without actual progress)" by its length. (Z)

---

## 9. Stopping

**9.1 What decides the end.** One module "determines if a suitable solution has been found ... or if the search
should continue". In the paper every worked case ends with a comparison against the known right answer, an operation
that "is only useful if the ground truth is known". (T 9.1; GR operations)
- Cannot: say that a result is right where no right answer exists to compare with. The method then ends where its
  plan ends.

---

## 10. Cost

"The higher costs of GoT and ToT are driven by k new thoughts built for each Generate operation; these multiple
thoughts are one of the reasons for [the] quality." Schemes with trees and graphs "often involve multiple rounds of
prompting ..., naturally incurring higher costs". A split also repeats the fixed part of every request. (G 7.2, 7.3;
T 8)

---

## 11. What the evidence covers

- The paper's cases: sorting lists of digits, intersecting two sets of numbers, counting country names in a text,
  merging four short agreements; one model. Three are checked by a program. Its advantage is reported to grow with
  the size of the problem and to be negligible at the smallest size. (G 5, 7)
- The overview, of the whole family: "still limited to simple tasks"; "there is no clear set of benchmarks that is
  used consistently". (T 1, E.3.2)
- Of step-by-step reasoning in general, a deck that read the literature: large gains appear mainly where the task
  is mathematical or symbolic; another: "benchmarks can overstate reasoning ability". (A; W)
- So the material shows a way to organise a search over thoughts and to make it inspectable. Nothing in it shows
  that the method yields a correct design where the only judge is a reading. What it offers there is 5.3: separate
  qualities, judged more than once, none allowed to make up for another; and 6.2: nothing new replaces what it was
  made from unless it scores better.
