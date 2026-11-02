# recheck:T-06

lane=T-06 tool_status=ok checks=8

- F1 ON_PAGE — https://www.sqlite.org/wal.html
    quote: readers do not block writers and a writer does not block readers. ... since there is only one WAL file, there can only be one writer at a time.
    note: Section 9 says 'mostly true' (exceptions). Footer 2026-08-25 confirmed.
- F2 ON_PAGE — https://www.sqlite.org/wal.html
    quote: All processes using a database must be on the same host computer; WAL does not work over a network filesystem. ... write privileges for "-shm" wal-index ... or else write access on the directory
    note: Section 7: wal-index is an ordinary mmapped file. Section 5 notes read-only exceptions since 3.22.0.
- F4 ON_PAGE — https://www.sqlite.org/wal.html
    quote: likely present in all version of SQLite from 3.7.0 (2010-07-21) through 3.51.2 (2026-01-09). It is fixed in version 3.51.3 (2026-03-13) ... 3.44.6 and 3.50.7.
    note: Discovery 2026-03-03, reproducer UPDATE 2026-08-24, advice to upgrade ('not an emergency') all present. 'Could not reproduce organically' wording and 'rare' not individually verified in fetched excerpt; 'rare' is present.
- F6 ON_PAGE — https://www.sqlite.org/lang_transaction.html
    quote: The BEGIN IMMEDIATE might fail with SQLITE_BUSY if another write transaction is already active on another database connection. EXCLUSIVE and IMMEDIATE are the same in WAL mode
    note: DEFERRED/SELECT/upgrade SQLITE_BUSY also supported.
- F13 ON_PAGE — https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html
    quote: You cannot fix this problem by inserting a check on the lock expiry just before writing back to storage.
    note: Lease, pauses (GC, page faults, CPU), network delay, efficiency vs correctness, fencing token, consensus/database with transactional guarantees all supported. Date 2016-02-08 from URL.
- F23 PARTIAL — https://git-scm.com/docs/git-worktree
    quote: The new worktree is linked to the current repository, sharing everything except per-worktree files such as HEAD, index, etc.
    note: Page supports shared refs/config, per-worktree HEAD/index, refs/bisect|worktree|rewritten, and git rev-parse --git-path advice. Local check confirmed: common dir C:/Users/User/Documents/projects/EMS_workshop1/.git and two worktrees. Not directly on page: the inference about store placement; 'worktree config' is per-worktree only when extensions.worktreeConfig is enabled.
- F26 ON_PAGE — https://aphyr.com/posts/299-the-trouble-with-timestamps
    quote: since w2 has a lower timestamp than w1, Cassandra immediately ignores w2 on any nodes where w1 is visible.
    note: Clocks flowing backwards, tombstones suppressing lower-timestamp writes, NTP nodes out of sync, logical/vector/dotted version vectors, strong timestamp coordinator, wall clocks OK for fuzzy ordering all supported. Embedded refusal string not seen in fetched summary.
- F30 PARTIAL — https://kubernetes.io/docs/concepts/architecture/leases/
    quote: every kubelet heartbeat is an update request to this Lease object, updating the spec.renewTime field for the Lease.
    note: Supported: renewTime renewal, takeover via new holder identity, last modified 2026-03-31. holderIdentity and leaseDurationSeconds appear only in example output, not defined; acquireTime is not mentioned on the page.
