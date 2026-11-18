# w1 collect: `long` (long and cooperative transactions)

Date 2026-11-19. Sub-topic 6 of `R:lane-writers.md`. `R:` = `docs/program/evidence/round3-2026-11-18/`. Paths `P:` below
= `R:papers/w1/`. Line numbers are lines of the `paper.txt` beside each `paper.pdf` (pdftotext -layout; two-column
pages interleave, so a quote is cut where the columns mix).

Library records reused: none for this topic. `bash library/lookup.sh` for `saga`, `Barghouti`, `cooperative`,
`check-out`, `Perry`, `Korth`, `Garcia-Molina` all printed "not recorded". `long transaction` found only
o1-0316, x02-0354, x02-0360, x15-0307 (short-transaction engines; x15-0307: Calvin restarts a transaction whose
reconnoitered set is no longer valid), none of which measures a unit of minutes. The topic is new to the library.

Existence check (the names came from memory): all five papers exist.
- Barghouti and Kaiser, ACM Computing Surveys 23(3):269-317, Sept 1991 (confirmed by `P:barghouti/paper.txt:36`: "Appeared in ACM Computing Surveys, 23(3):269-317, September 1991").
- Garcia-Molina and Salem, "Sagas", SIGMOD 1987, pp. 249-259 (bibliographic record and Princeton TR-070-87; summary only so far, see block 2).
- Korth, Kim, Bancilhon, "On Long-Duration CAD Transactions", Information Sciences 46(1-2):73-107, 1988 (dblp record; full text not open). Its earlier form, Bancilhon, Kim, Korth, "A Model of CAD Transactions", VLDB 1985, was read in full instead.
- Pu, Kaiser, Hutchinson, "Split-Transactions for Open-Ended Activities", VLDB 1988, pp. 26-37 (read in full).
- Perry, Siy, Votta: ICSE 1998 pp. 251-260 and TOSEM 10(3):308-337, 2001 (TOSEM read in full).

Counts: quoted 4 (Barghouti, Pu, BKK85, Perry), summary 2 (sagas, Korth 1988: see their blocks), not opened 0 beyond those.

---

## 1. Barghouti and Kaiser 1991, survey

**Citation.** N. S. Barghouti, G. E. Kaiser, "Concurrency control in advanced database applications", ACM Computing
Surveys 23(3), 1991. Fetched the authors' Columbia report copy (11 Jan 1994, same text, says it "Appeared in ACM
Computing Surveys"): `https://www.csd.uoc.gr/~hy460/pdf/barghouti94concurrency.pdf` (168 KB). Status: **quoted**
(`P:barghouti/paper.txt`). The Georgia Tech copy was truncated by the download; the core.ac.uk link served HTML.

**Problem.** Serializable concurrency control assumes short transactions; design and software environments have
operations of minutes to hours, nondeterministic user steps and people who need to see each other's work.

**Mechanism.** The survey sorts the answers into three groups: (a) keep serializability but cope with length
(altruistic locking, snapshot validation, order-preserving multilevel transactions); (b) relax it using semantics
(sagas with compensation, conflict predicates, split/join); (c) coordinate people (check-out/check-in,
hierarchical private databases, copy/modify/merge in NSE, notification, cooperating transaction groups).

**Measured gain.** None. The survey measures nothing and says so:
- `P:barghouti/paper.txt:2406-2411` — "A problem that remains unsolved is the lack of performance metrics by which to evaluate the proposed policies and mechanisms ... We have encountered only one empirical study [Yeh et al. 87]".
- `P:barghouti/paper.txt:2318-2319` — "Many of these have not yet been implemented in any system."
- Its table of which system implements which idea (`P:barghouti/paper.txt:2321-2385`, figure 21) lists a system for few mechanisms (Cosmos, Infuse, NSE, Gordion, DASDBS, Orion, ObServer, System R).

**Quoted statements that answer "what replaces abort and redo".**
- Why abort is wrong for long units: `P:barghouti/paper.txt:756` — "LTs also increase the likelihood of automatic aborts (rollback), in order to avoid deadlock, or in the case of failing validation in optimistic concurrency control."
- Same place, scale: "Some last for several minutes or hours such as compiling code" and long transactions "ranging from hours to weeks" (`P:barghouti/paper.txt:747-749`). Our unit (minutes) is at the short end of what the survey calls long.
- Cost of a late failure: `P:barghouti/paper.txt:690-694` — "the user might have invested many hours running a transaction, only to find out later when he wants to commit his work that some of the operations he performed within the transaction violated some consistency constraints. The user would definitely oppose deleting all of his work (by rolling back the transaction). He might, however, be able to explicitly reverse the effects of some operations".
- Validation, long units and starvation: `P:barghouti/paper.txt:894-927` — "It is very undesirable ... to restart a long transaction that has done a significant amount of work", and "the longer the transaction is the greater the risk of starvation". Remedy (Pradel and others 1986, "snapshot validation"): count only conflicts on data read before the other transaction ended as serious (lines 898-916); for a starving transaction create a "substitute transaction" with the same read and write sets that validates first, so others that conflict restart instead (lines 935-937). Classical OCC's remedy, locking the whole database for the starver, is called unacceptable (line 934).
- Compensation instead of rollback (sagas): `P:barghouti/paper.txt:1296` — "user-supplied compensation functions are executed to compensate for each transaction that was committed at the time of failure or automatic abort"; the bug-fix example "edit a file, compile source code, and run the debugger" modelled as a saga (line 1309).
- Check-out/check-in: `P:barghouti/paper.txt:1644-1646` — long transaction in a private database; a short transaction on the public database sets a permanent lock for the object if nobody holds it conflictingly, "copies the object to the specific private database"; if held, "notifies the user that he cannot access the object, and aborts".
- Optimistic coordination with merge, not rollback (Sun NSE): `P:barghouti/paper.txt:1789-1799` — "If conflicts are discovered, rather than rolling back transactions, the users of conflicting updates have to merge their changes, producing a new version of the object." The first environment to finish deposits; the second merges with the first's version; the third with that, and so on (line 1789). A `resync` command tells a developer which objects others changed since the copy was taken (lines 1825-1832).
- Notification instead of blocking (Gordion): `P:barghouti/paper.txt:1983-1990` — immediate notification "as soon as the conflict occurs" or delayed "only when one of the conflicting transactions attempts to commit"; a person resolves it; and the survey warns "humans might not really resolve conflicts, resulting in inconsistent data".
- Hierarchy of experimental databases (Infuse): modules in an experimental database need only be self-consistent before being deposited upward (`P:barghouti/paper.txt:1716`).

**Assumes.** Mostly human users who can decide, interactively, what to do on a conflict; a repository with versions;
a hierarchy of workspaces; programmer-supplied compensation functions for sagas; for split, that the part
committed early does not depend on the part still open.

**For model-session writers (reasoned).**
- Unit length: minutes fits the survey's "long" class; "abort and redo" costs tokens, so the survey's argument (never throw the work away; reverse by effect) carries.
- Compensation: a model session's edits can be reverted by restoring the earlier file version, which is what the survey itself suggests for files (line 1314: "revert to an older version of the file and delete the updated version"), so a compensation function for a file edit exists and is cheap. A compensation for a semantic effect (a rename that other writers already used) does not, as in the flight-seat example the survey gives.
- Conflict resolution by a person ("phone call") does not carry; a session can instead be told, by the harness, which object changed (resync, notification), and can merge by reading the change. This is the NSE pattern without the human.
- A rerun is not the same run: Pradel's substitute transaction relies on the restarted transaction having the same read and write sets as before. A model rerun may read and write different things, so the starvation fix holds only as "reserve what the first attempt read and wrote", an approximation.
- Test suite as last check: the survey has no notion of a serial last check that takes ten minutes; the hierarchy of deposits (Infuse, NSE) is the nearest: a check at each level before deposit upward.

**Frame.** The lane's four failures are all covered by "relax or coordinate" mechanisms the survey names, but the
survey adds three things the frame lacks: (1) the cost of failure grows with the unit's length, so a policy that is
fine for a 5-second transaction (restart) fails for a 5-minute one (starvation, wasted work); (2) means other than
the four: **notification of a conflict before commit** (immediate or delayed), **early release of finished parts**
(split, altruistic locking) and **a hierarchy of workspaces with a check at each deposit** (Infuse, NSE); (3) a
cooperation requirement: writers must at times read each other's unfinished work, which the frame's "dirty read:
snapshot" remedy forbids (`P:barghouti/paper.txt:697-715`, "synergistic cooperation").

---

## 2. Garcia-Molina and Salem 1987, sagas

**Citation.** H. Garcia-Molina, K. Salem, "Sagas", ACM SIGMOD 1987, pp. 249-259; Princeton TR-070-87.
URL: `https://www.cs.princeton.edu/techreports/1987/070.pdf` (8.0 MB, a scan). Status: **summary**. The download completed (7,995,440 bytes, `P:sagas/paper.pdf`) but the file is an image scan
with no text layer (`pdftotext` gives 20 bytes, no `paper.txt` text) and no OCR tool is on this machine, so the
paper's own text is not read. Everything below comes from the
survey's account (block 1) and from the search results' abstract ("a sequence of transactions that can be
interleaved with other transactions"; "either every transaction in the saga completes or compensating transactions
run"), which is `summary`.

**Problem.** A long-lived transaction holds locks and resources too long; abort loses everything.

**Mechanism.** The long unit is a sequence of ordinary short transactions that may interleave with others; each
has a compensating transaction; on failure the committed ones are compensated in reverse (survey,
`P:barghouti/paper.txt:1282-1296`). Only two levels of nesting (line 1317: "limits nesting to two levels").

**Measured gain.** Not read from the paper. Not quoted here.

**Assumes.** The unit divides into steps each of which is correct on its own and has a compensation; other
writers may see the partial results (`P:barghouti/paper.txt:1282`: sagas "may view the partial results of other
sagas"); cascading aborts avoided only through compensation.

**For model-session writers (reasoned).** Steps exist (edit, build, test). Compensation of a file edit is
restoring the file; but between the edit and its compensation another writer may already have built on it, which is
the seat-reservation problem; so a saga step is safe only for edits whose effects do not leak (private copy) or
whose readers are told. The model's rerun differs, so "redo the step" is not "run again to the same result".

**Frame.** Adds a means the frame lacks: **split the long unit into committed steps with compensation** instead of
redoing the whole.

(Block stays `summary`: the scan needs OCR or the owner reading the pages; no pirate or unofficial copy was used.)

---

## 3. Korth, Kim, Bancilhon 1988, and their 1985 model

**Citation.** H. F. Korth, W. Kim, F. Bancilhon, "On Long-Duration CAD Transactions", Information Sciences
46:73-107, 1988 (confirmed by the dblp record, `summary`). The full text sits behind a publisher page: **not opened**.
Read instead its earlier form: F. Bancilhon, W. Kim, H. F. Korth, "A Model of CAD Transactions", VLDB 1985, pp.
25-35, `https://www.vldb.org/conf/1985/P025.PDF` (1.1 MB), `P:bkk85/paper.txt`. Status for the 1985 paper:
**quoted**. Note that the survey (block 1) and Pu and others (block 4) both cite this model as the "representative"
design-transaction model.

**Problem.** `P:bkk85/paper.txt:41-46` — conventional transactions "terminate within a few seconds. When a
transaction is short-lived, it is not unreasonable to prevent access ... It is also not unreasonable, if a
transaction fails, to back out all its updates, since relatively little work will be lost." CAD transactions are
long and involve "conscious decisions of human designers".

**Mechanism.** A designer's transaction is a set (not a sequence) of short transactions in a hierarchy of six levels
(project, cooperating, client/subcontractor, short, operation sequences, system operations); each node is a
(set, order, consistency predicate) triple, and the user defines what consistency means at each level. Objects are
checked out of the public database into a private one; a "semi-public" database lets a transaction hand incomplete
but stable objects to another. A system abort (deadlock, crash) aborts the current short transaction, not the
enclosing cooperating transaction (`P:bkk85/paper.txt:507-512`: "an abort induced by the system ... will result in
an abort of the current short-duration transaction, rather than the cooperating transaction to which the short
transaction belongs"). An explicit abort of a higher level aborts everything beneath it (lines 520-528).

**Measured gain.** None. A formal model; no implementation or figure (searched `perform|measure|experiment`,
no hit about results).

**Assumes.** A person decides the consistency predicate and recovery procedure per level; projects partition the
data so that cross-project waits are acceptable (`P:bkk85/paper.txt:87-92`: "it will be acceptable to force project
transactions that attempt to access another project's database partition to wait until that project finishes").

**For model-session writers (reasoned).** The structural idea carries: the unit of recovery (the short step) is
smaller than the unit of work (the cooperating transaction), so a failure costs one step. For us: a session's
work is cut into steps each ending at a checkpoint (a commit in its own copy) so that a conflict or a failed check
costs the steps since the last checkpoint. The "wait until the other project finishes" assumption holds only if
files are partitioned by task, which is the existing one-owner mode.

**Frame.** Same missing means as block 2: recovery granule smaller than work granule; plus partition-by-project
as an ownership rule above the file.

---

## 4. Pu, Kaiser, Hutchinson 1988, split-transactions

**Citation.** C. Pu, G. E. Kaiser, N. Hutchinson, "Split-Transactions for Open-Ended Activities", VLDB 1988, pp.
26-37. `https://www.vldb.org/conf/1988/P026.PDF` (1.2 MB) (a browser User-Agent was needed; the plain request got
403). `P:split/paper.txt`. Status: **quoted**.

**Problem.** `P:split/paper.txt:25-26` — long transactions "work done ... is vulnerable to crashes because of
transaction rollback at abort" and become "concurrency bottlenecks because updated resources are retained for the
duration of the transaction". Example (lines 66-71): module F finished and tested before G; an abort loses F, and F
stays locked though it no longer depends on G.

**Mechanism.** `Split-Transaction(A:(ReadSet, WriteSet, Procedure), B:(...))` divides an ongoing transaction into two
serializable transactions; one commits (releasing and making durable its part), the other continues;
`Join-Transaction(S)` merges a finished one into a target. Allowed only if A and B serialize: A.WriteSet intersect
B.WriteSet must equal "BWriteLast" (objects B writes last), A.ReadSet intersect B.WriteSet empty, B.ReadSet
intersect A.WriteSet is the "ShareSet" (`P:split/paper.txt:115-141`). If ShareSet and BWriteLast are both empty
the two are independent; otherwise B follows A ("the serial case").

**Measured gain.** None. The paper is a design with algorithms for an implementation; it reports no experiment
(searched `perform|measur|experiment`; hits are only the word "implementation"). Section 3 applies it by example to
a programming environment, a CAD tool and a type-specification/implementation split (`P:split/paper.txt:231-345`, section 3).

**Assumes.** The transaction is quiescent when split (`P:split/paper.txt:136`: "we assume T is in a quies-cent state"); the
programmer or tool can name the read and write sets of both halves; the committed part truly will not change; a
database with versions.

**For model-session writers (reasoned).** The condition to split is exactly the one our harness needs when a session
has finished edits to file F but still works on G: if F's edits do not depend on G's and nobody needs to wait, F's
part can land (merge and check) early and release its claim. The read and write sets of the two halves are known
to us after the fact, from the diff, but not before; the session's own statement of independence is not verified
(the model may be wrong). A split changes nothing about the final serial test: the early-landed half must still
pass the check.

**Frame.** A means the frame lacks: **early release of a finished part of a unit** (claim, work, give back), with
a stated independence test.

---

## 5. Perry, Siy, Votta 2001, parallel changes in one large system

**Citation.** D. E. Perry, H. P. Siy, L. G. Votta, "Parallel Changes in Large-Scale Software Development: An
Observational Case Study", ACM TOSEM 10(3):308-337, 2001 (a revision of ICSE 1998). Fetched
`https://users.ece.utexas.edu/~perry/work/papers/DP-01-tosem.pdf` (361 KB). `P:perry/paper.txt`. Status:
**quoted**.

**Problem.** How much do many developers change the same files at once, and does it hurt quality?

**Mechanism.** Observational study of the change history of one subsystem of the 5ESS switch; changes are
modification requests (MRs) and deltas in the Sablime/ECMS system. Measures the number of MRs open on one file at the
same time (PCmax, PCdays), overlap of deltas, and correlates with defects.

**Measured result (not a gain: the study measures how often the problem occurs).**
- Scale: `P:perry/paper.txt:391-399` — "12 years from April 1984 to April 1996 ... reaching a peak of 200 developers and eventually decreasing to the current 50 developers", one of 50 subsystems.
- How often two people change the same file: `P:perry/paper.txt:1142-1144` — "12.5% of all deltas are made to the same file by different developers within 24 hours of each other."
- How often they physically overlap: `P:perry/paper.txt:1154-1155` — "3% of the deltas made within 24 hours by different developers physically overlap each others' changes"; the authors "believe that many more conflicts arise as a result of ... semantic interference" (`:1157-1159`), which they did not measure.
- Parallel MRs per file: `P:perry/paper.txt:876-878` — "55% of the files never had more than one MR at a time, although about 30% of the files had up to 2 parallel MRs per day, and 0.6% of the files had more than 6." Their abstract (`:14-26`) says "the degree of parallelism is very high" and the tail, not the mean, needs the attention.
- Defects: `P:perry/paper.txt:1291-1293` — "There is a significant correlation between files with a high degree of parallel development and the number of defects", also "even accounting for lifetime, size, and number of deltas" (`:1293-1295`); correlation of PCdays with defect count 0.63 (`:1060`) and 0.62 for the weighted count (`:1106`). It is a correlation in an observational study, not a controlled effect.
- Auto-merge in the study's reference tool: `P:perry/paper.txt:258-262` — ClearCase "was able to automatically merge over 90% of the changed files ... In about 1% of the cases, the merge tool inappropriately made an automatic decision" (this figure is Leblang 1994, as cited in the paper, so `summary` of that source).
- What they conclude about merging: `P:perry/paper.txt:1336-1345` — "It is not clear how well current merge technologies will be able to support this degree of parallel versions if there are interfering changes".

**Assumes.** Changes by people over hours to days (`P:perry/paper.txt:715-716` — "46% of the IMRs and 50% of the MRs
are opened and solved on the same day", so half last longer; the long tail is in lines 716-717); the check is later
testing; interference is judged by overlapping text.

**For model-session writers (reasoned).** Human changes are hours to days; ours minutes, so a given pair of sessions
overlaps in time far less often per change but there are more changes per day; the 12.5% and 3% figures are not our
rates and must not be used as such. What carries: (1) physical overlap is the minority (3% of the same-file-within-
24-hours deltas by different developers, line 1154), and the authors argue semantic interference is more common than text overlap;
this is the "clean merge that fails" of the lane's frame; (2) defects rise with the degree of parallel change on a
file, which supports a policy that gives a heavily edited file fewer concurrent writers (or a stricter check) and
sets the threshold by measured defects, not by line conflicts alone; (3) the long tail of the distribution
(0.6% of files over 6 parallel changes) is where the policy should act, not the mean.

**Frame.** Supports the frame's "write skew: clean merge that fails" as the common rather than the rare case; adds
the observation that a conflict count (the harness's present switch input) misses the semantic interferences the
authors guess are the larger part.

---

## What replaces "abort and redo" (answer for the lane)

From the quoted places above, the designs for a unit too costly to redo, with what each assumes:

| Design | What it does instead of redo | Source | Measured? |
|---|---|---|---|
| Check-out/check-in (conversational, design transactions) | Take an exclusive claim on the object for the whole long unit; a second claimant is told and aborts the short claim step, not the work | Barghouti `:1644-1646` | no |
| Compensation (saga) | Commit each step; on failure run per-step undo | Barghouti `:1296` | no |
| Split/join | Commit the finished part early; the rest continues | Pu `:115-141` | no |
| Optimistic copy/modify/merge (NSE) | The late finisher merges with what landed; no rollback | Barghouti `:1789-1799` | no |
| Notification (Gordion) | Tell the other writer of a conflict now or at commit; a person resolves | Barghouti `:1983-1990` | one early study, cited only |
| Snapshot validation, substitute transaction | Count only serious conflicts; protect a starving long unit by validating a copy of its sets first | Barghouti `:894-937` | no |
| Hierarchy of workspaces (Infuse, NSE) | Check at each level of deposit | Barghouti `:1716` | no |

What was measured: nothing in these papers measures a gain. The only measurement here is Perry and others on how
often parallel human changes occur and correlate with defects. The survey states the field lacks metrics
(`P:barghouti/paper.txt:2406-2411`). So no figure for "gain" of any of the above exists in this set; for a design
to rest on a number, the harness would have to measure it (reasoned).

## Not found

- Any measurement of throughput, abort rate or wasted work for sagas, split-transactions, check-out/check-in or
  notification in the papers read. Searched the texts for `measure`, `experiment`, `empirical`, `perform`.
- Library: `saga`, `Barghouti`, `cooperative`, `check-out`, `Perry`, `Korth`, `Garcia-Molina`: not recorded.
- Yeh and others 1987 (the one empirical study the survey cites on cooperating developers) not searched for; the
  survey's text on it is `summary`-grade only.
- A free copy of Korth, Kim, Bancilhon 1988 (Information Sciences).

## Not opened

- Korth, Kim, Bancilhon 1988: publisher page not tried (no sign-in route attempted); the 1985 paper was read instead.
- Sagas 1987: downloaded but an image-only scan, no OCR tool here; block 2 is `summary`. Needs OCR (a tool to install: the owner's word) or a text copy from the ACM library (sign-in).
- Pradel and others 1986 (snapshot validation), Katz and Weiss 1984, Kaiser and Perry 1987 (NSE-era workspaces),
  Adams and others 1989 (NSE): known only through the survey; skipped because the survey's account answers the
  question and no measured figure was expected.
