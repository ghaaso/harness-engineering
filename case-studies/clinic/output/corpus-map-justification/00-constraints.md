```text
CONSTRAINT BLOCK v1

PROBLEM
A large markdown corpus is one plan with reasoning. Files depend on each other;
architectures stand on other architectures; conclusions are inferred from premises
stated elsewhere. Relations are sparse; the structure must be learned. This pass
designs a METHOD for mapping it. It does not build the map or judge what to build.

REQUIRED RESULT
A persisted map of the plan as stated. For any architecture: what it depends on, what
it is derived from, the reasoning steps on that chain, and source spans. Gaps are
first-class. Coverage is explicit: read, linked, unresolved. Relation kinds are
recovered from the text, not fixed in advance, and kinds that differ are not collapsed.

REJECTED METHODS
Reading-process rules (score only reading procedures against these):
  R1 One transformer window over the corpus.
  R2 Split files across agents and merge prose summaries.
  R3 Similarity retrieval treated as the context.
Representation rules (score only models/stores against these):
  R4 A store whose only operation is equality join.
  R5 One edge type for every relation.
  R6 A closed inventory of two relation labels.
A rule that does not apply is scored N/A with a reason. N/A is never a pass.

STATUSES
  S1 attested    Stated by a source span. Includes explicit identity statements
                 ("hereafter X", definition links) and explicit local definitions
                 of a relation.
  S2 codebook    Analyst vocabulary decision: who, when, span in view, codebook version.
  S3 overlay     Analyst content decision (identity of things): who, when, spans in view.
  S4 reconstructed premise   Attached to a gap. Never an edge. Never walked.
  S5 candidate   Similarity / coreference / alias proposal, with method and score.
  S6 derived     A query result carrying its hops or its rule + base facts.

DOORS
  D1  Only text promotes to S1. Similarity never changes any statement's status.
  D2  A kind = open label + declared properties:
        direction;
        consequence ∈ {fails_to_build, fails_to_follow, fails_to_resolve, none};
        walkable (attested edges of this kind may be walked as a path).
      Gap role is DERIVED from consequence, never declared separately:
        fails_to_build → missing foundation; fails_to_follow → missing premise;
        fails_to_resolve → unspecified name; none → no gap.
      Properties come from an S1 definition or an S2 decision. A new property may be
      added only with a counterexample showing the three are insufficient.
  D3  A kind without properties is inert: stored, not walked, produces no gaps.
      Queries over it return "unresolved vocabulary", never an empty chain.
  D4  Label merges are optional S2 decisions. Gap and chain queries run on properties;
      label queries return the word the file used. Shared properties do not erase
      label differences.
  D5  Identity is S1 only by an explicit textual statement; otherwise S3 or it stays
      S5. An edge whose endpoint does not resolve is a dangling-endpoint gap. This
      belongs to the identity layer and applies to any kind.
  D6  A reconstructed premise (S4) annotates a gap and never completes a chain.
  D7  Derived is never stated. A path answer returns every hop and is not stored as an
      edge. A rule result returns the rule and its base facts and is not stored as a
      base fact. Derived results are not input to gap detection. A path answer may
      REPORT gaps it reaches, with hop distance.
  D8  Query levels:
        L1 = S1 only ("what does the text state").
        L2 = S1 + S2. Gap and chain answers need at least L2 and cite the codebook
             version; where no entry exists, D3 applies.
        L3 = L2 + S3, with every S3 hop labelled as an analyst hop.
      S5 appears in no level; it has its own candidate query.
  D9  Packaging is free (one store with statuses, or several stores), but the design
      must show that D1 holds and that L1–L3 exclude S5 by default.
  D10 Coverage ledger per file version: read (extent), linked (spans that produced
      S1), unresolved (relation cues not typed, inert kinds, dangling endpoints,
      open proposals).
  D11 A span is a span in one file version. File updates are out of scope.
  D12 If a source contradicts this block, the block wins, and the design says so.

OUT OF SCOPE
Implementation advice. Judgments of whether anything is worth building. File updates.
```
