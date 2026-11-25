# Brief: learn from teaching material first, then compare, before anything is trained (2026-11-25)

The owner's words of about 17:25 UTC, in full and unedited; they outrank this brief.

> "from each file, keep only statements of what a mechanism or data step can and cannot do, plus the counterexample. Ignore leaderboard tables and "X beat Y." Okay, yes, the 4 working rules make sense to me. Other than that, I have attached links of actual learning resources. I want you to not to gloss over them and actually derive the learning from it. And you have to download it, derive the good useful learning from it, and store that in a useful compiled MD file, which is properly organized. Like one is the neural networks AI side and the data engineering side. Then we'll use all of those, everything that we have learned, to compare to our approaches that we have and see where we're going wrong in development and how the development should be, how the architecture construction should be, how we should reach to a conclusion, how we should work towards the hypothesis, what's the workflow, whether our data usage collection or is not that good, whether the data engineering needs work. We'll all reason out and work through all of those things first before actually training anything, as we've already done. And the mistakes we've made so far that I've called you out for, I need you to put that into a rule set so that it's enforced that for these kind of research tasks, we should not be reading research papers and seeing this beats that, so this beats this, etc., etc. Since we're actually experimenting and trying to build something new here. Okay, are you getting what I'm saying?"

## The 27 resources he named (his word to download them)

Graph learning, Stanford CS224W:
1. http://web.stanford.edu/class/cs224w/slides/06-theory.pdf
2. http://web.stanford.edu/class/cs224w/slides/07-theory2.pdf
3. http://web.stanford.edu/class/cs224w/slides/08-graph-transformer1.pdf
4. http://web.stanford.edu/class/cs224w/slides/09-hetero.pdf
5. http://web.stanford.edu/class/cs224w/slides/10-kg.pdf
6. http://web.stanford.edu/class/cs224w/slides/12-RDL.pdf
7. https://snap.stanford.edu/class/cs224w-2023/slides/15-scalable.pdf

Graph neural networks, University of Pennsylvania:
8. https://gnn.engineering.upenn.edu/wp-content/uploads/2020/09/lecture_3_script.pdf
9. https://gnn.engineering.upenn.edu/wp-content/uploads/2020/09/lecture_4_script.pdf
10. https://gnn.engineering.upenn.edu/wp-content/uploads/2020/10/lecture_5_handout.pdf
11. https://gnn.engineering.upenn.edu/wp-content/uploads/2020/10/lecture_5_script.pdf
12. https://gnn.engineering.upenn.edu/wp-content/uploads/2020/10/lecture_6_handoutb.pdf
13. https://gnn.engineering.upenn.edu/wp-content/uploads/2020/10/script_600b.pdf
14. https://gnn.engineering.upenn.edu/wp-content/uploads/2020/10/710c_handout_relative_perturbation.pdf
15. https://gnn.engineering.upenn.edu/wp-content/uploads/2020/10/lecture_7_script.pdf
16. https://gnn.engineering.upenn.edu/wp-content/uploads/2020/11/lecture_10_handout.pdf
17. https://gnn.engineering.upenn.edu/wp-content/uploads/2020/11/script_lecture_10.pdf

Networks, sampling and data:
18. https://stat.cmu.edu/~cshalizi/networks/16-1/lectures/02/lecture-02.pdf
19. https://www.cs.upc.edu/~csn/slides/09sampling.pdf
20. https://hpi.de/oldsite/fileadmin/user_upload/fachgebiete/naumann/lehre/WS2022/Approximate_Data_Profiling.pdf
21. https://15445.courses.cs.cmu.edu/fall2017/notes/04-notes-functionaldependencies.pdf
22. https://15445.courses.cs.cmu.edu/fall2017/slides/04-functionaldependencies.pdf
23. https://www.dcs.warwick.ac.uk/~hugh/CS252/CS252-HACD-Notes8.pdf
24. https://raw.githubusercontent.com/slds-lmu/lecture_appml/main/slides-pdf/slides-preprocessing-leakage.pdf
25. https://raw.githubusercontent.com/slds-lmu/lecture_appml/main/slides-pdf/slides-imputation-intro.pdf
26. https://raw.githubusercontent.com/slds-lmu/lecture_appml/main/slides-pdf/slides-timeseries-intro.pdf
27. https://raw.githubusercontent.com/slds-lmu/lecture_appml/main/slides-pdf/slides-timeseries-evaluation.pdf

Also read earlier today, to be compiled with them: Xavier Bresson, NUS, Graph Machine Learning lecture 9, "Graph
Transformer" (his file in Downloads).

## How it is done

- The top session reads every resource itself, in full (working rule 1). No helper reads for it.
- The lens, his words: keep only statements of what a mechanism or data step can and cannot do, plus the
  counterexample; ignore leaderboard tables and "X beat Y".
- Files: the PDFs and their extracted text stay outside the repository, in `C:/research-runs/2026-11-25-learning/`
  (`pdf/`, `txt/`). They are untrusted data: only read as text.
- Deliverable: docs/program/learning/MECHANISMS-NEURAL.md and docs/program/learning/MECHANISMS-DATA.md (each entry:
  the mechanism or step; what it can do; what it cannot do; the counterexample; the source and its slide or page).
  Then the comparison with our own approaches, worked through with him, before anything is trained.
- The rule set: `docs/program/RESEARCH-METHOD-RULES-2026-11-25.md`, CLAUDE.md, and a guard.
