# P3a: backlog for the runbook PR that fills `<p2b2>`

Start only after the coordinator says the drain audit (PR #203) is on main. The list is in the plan: rulings C63, C65 and C69 at `plan-v9.62`.

1. Section 8 vs the audit's command line: the eight differences.
2. The restore gate treats a directory as a sign-off (`restore-gate.sh:29`). Fix the script and add a fixture test.
3. R9.6 against R9.4 (the dump path).
4. A guard for R7.5's DROP (it uses an unguarded `-d`).
5. 11.10's tag push, which is still only in the prose.
6. The C66 nit on 6.6 (b)'s dump line. If the append to `proven` fails after `pg_dump` succeeded, the line prints the stale reason "the backend is up". It fails safe. Fix: set `WHY="could not name the copy in proven"` before the append.

PR #211 passed at 11cf740 and must not be pushed to again.
