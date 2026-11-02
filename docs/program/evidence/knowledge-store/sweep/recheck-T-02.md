# recheck:T-02

lane=T-02 tool_status=ok checks=7

- F01 ON_PAGE — https://www.w3.org/TR/prov-dm/
    quote: Invalidation is the start of the destruction, cessation, or expiry of an existing entity by an activity.
    note: Revision as wasDerivedFrom with prov:type prov:Revision, the seven core relations and the 30 April 2013 Recommendation date are all confirmed. Only the first 100000 of 155327 characters were read, but every claim was found in that part.
- F03 ON_PAGE — https://openlineage.io/docs/spec/facets/
    quote: an atomic piece of metadata identified by its name
    note: Supported: Run/Job/Dataset attachment, replace-entirely on same name, {prefix}{name}{entity}Facet and {prefix}_{name} naming, git-SHA schemaURL, promotion to standard, and Version 1.55.0. The fetch summary words the schemaURL rule as 'include a tag of a git sha and not a branch name'. The word 'immutable' was not seen in the summary.
- F07 ON_PAGE — https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing
    quote: Snapshots are an optimization, not a replacement for the eventstream. ... For most systems and most parts of a system, traditional data management is sufficient.
    note: All points confirmed: ms.date 2026-03-27 and updated_at 2026-09-25; append-only immutable events; materialized views; compensating events; optimistic concurrency; idempotent consumers tracking the last processed sequence; unsuited to prototypes, short-lived systems and reference data; apply selectively, e.g. a payment ledger.
- F09 ON_PAGE — https://martinfowler.com/articles/bitemporal-history.html
    quote: record history itself is append only
    note: Supported: actual vs record time, retroactive changes revising actual history, salaryAt(actualDate, recordDate), record time defaulting to today, downstream consequences not resolved by bitemporal history alone, and the 07 April 2021 date. The fetch summary paraphrases rather than quotes the actual/record definitions.
- F13 PARTIAL — https://ossf.github.io/osv-schema/
    quote: The versions `introduced` and `fixed` are full-length Git commit hashes.
    note: Supported: version 1.9.2, need for the commit graph, limit causing false negatives, separate fixed events for cherry-picks, later modified is authoritative for duplicate ids, database_specific has no effect on evaluation, and aliases/related. Not confirmed: the page states the full-hash rule only for introduced and fixed, not last_affected or limit. The 'withdrawn is a timestamp with the reason in summary' detail was also not confirmed; the fetch only returned 'If the field is missing, then the entry has not been withdrawn.'
- F14 PARTIAL — https://hackage.haskell.org/package/build-1.0/docs/Build-Trace.html
    quote: For verifying traces, r = h; for constructive traces, Hash r = h.
    note: The Trace type stores dependencies with hashes (depends :: [(k, Hash v)]) and CT stores the value. verifyVT takes a function to compute a key's current value hash and returns True if the key is up-to-date. The page does not explicitly say it compares current dependency hashes to stored ones; that is implied.
- F14 PARTIAL — https://www.microsoft.com/en-us/research/publication/build-systems-a-la-carte/
    quote: This is a revised and expanded journal version of our ICFP’18 paper “Build systems a la carte”
    note: The page lists Mokhov, Mitchell and Peyton Jones and the ICFP'18 origin. It does not mention DOI 10.1145/3236774; it gives the journal DOI 10.1017/S0956796820000088. It does not mention the scheduler/rebuilder separation.
