# recheck:X-01

lane=X-01 tool_status=ok checks=8

- F01 ON_PAGE — https://www.sqlite.org/wal.html
    quote: All processes using a database must be on the same host computer; WAL does not work over a network filesystem. This is because WAL requires all processes to share a small amount of memory
    note: Sections 1 and 2.2 both confirm. 'mmapped file' detail not seen in the fetched excerpt, but the shared-memory wal-index claim is supported.
- F02 ON_PAGE — https://www.sqlite.org/wal.html
    quote: likely present in all version of SQLite from 3.7.0 (2010-07-21) through 3.51.2 (2026-01-09). It is fixed in version 3.51.3 (2026-03-13) and later. Backports ... 3.44.6 and 3.50.7.
    note: Page also says affects WAL databases with two or more connections writing or checkpointing at the same instant. 'Corrupt' wording was not quoted verbatim, though the page calls the consequences serious. The page says 'likely present' and 'not an emergency'. The 'must use a fixed version' is the fact author's inference.
- F03 ON_PAGE — https://sqlite.org/rsync.html
    quote: This utility causes REPLICA to become a copy of ORIGIN. ... While sqlite3_rsync is running, REPLICA is read-only. ... At least one of ORIGIN or REPLICA must be on the local machine.
    note: All sub-claims found: snapshot semantics, SSH with binary on remote PATH, 3.50.0 (2025-05-29) limits removed, hang with --protocol 1 workaround, one database per invocation. Not seen in the fetched excerpt: the --exe option and the exact wording that independent writes to REPLICA are overwritten. The 3.49.1 version boundary was paraphrased by the fetch, not quoted.
- F06 ON_PAGE — https://www.sqlite.org/howtocorrupt.html
    quote: It is also safe to make a copy of an SQLite database file as long as there are no transactions in progress while the copy is taking place.
    note: Names sqlite3_rsync (3.47.0+), VACUUM INTO and the backup API as working on a live database. Journal/WAL must be copied with the database. Hot journals moved or deleted can corrupt. Copying without its journal is listed as a corruption cause.
- F17 PARTIAL — https://raw.githubusercontent.com/dolthub/dolt/main/go/cmd/dolt/dolt.go; https://www.dolthub.com/docs/reference/cli
    quote: The environment key |DOLT_DISABLE_EVENT_FLUSH| allows writing events to disk but not sending them to the server. ... metrics.disabled - boolean flag disables sending metrics when true.
    note: Supported: the default is 'false' (so telemetry is on), the file emitter, the metrics.disabled key, DOLT_DISABLE_EVENT_FLUSH, and the send-metrics spawn. The file shows no endpoint host, as the fact says. The CLI page was read only to character 100000 of 105581. Not verified from the sources: the skip list (send-metrics, init, config) was not in the fetched excerpt. The recommendation and the no-third-party-data conclusion are inference.
- F18 PARTIAL — https://raw.githubusercontent.com/steveyegge/beads/main/README.md; https://raw.githubusercontent.com/steveyegge/beads/main/docs/architecture/dolt.md; https://raw.githubusercontent.com/steveyegge/beads/main/docs/multi-agent/federation.md
    quote: Embedded mode is single-writer (enforced via file lock). ... `.beads/issues.jsonl` is an export for viewers and interchange, not the source of truth or a backup. ... The `leases` table is clone-local and never replicates.
    note: Supported: Dolt storage, embedded default and single-writer with file lock, server mode for concurrent agents, refs/dolt/data on a git remote, jsonl export only, bd backup, hash-based IDs (README), leases clone-local. Not supported: the 'database is locked' error text was not on any page fetched. git+ssh: the federation page lists git@host:path as Git SSH shorthand; the explicit 'git+ssh://' form was not seen, though the dolt.md summary mentioned a git+ssh remote. Cross-machine sync via dolt push/pull: the federation page says `bd federation sync` pushes and pulls, with separate push/pull commands only planned, so 'dolt push/pull' is not quoted directly. The 'not documented' remark about worktrees matches: only a link to a Git worktrees page.
- F19 PARTIAL — https://git-scm.com/docs/git-worktree; local scratch test x01/gt
    quote: all pseudo refs are per-worktree and all refs starting with `refs/` are shared. ... refs inside `refs/bisect`, `refs/worktree` and `refs/rewritten` are not shared.
    note: Page supports shared refs, the three exceptions, per-worktree HEAD/index, and GIT_COMMON_DIR pointing at the main worktree's .git. Shared object database is not in the fetched excerpt. 'Store in common dir is one data set' is inference. The scratch test is a local path and was not checked (NOT_A_URL).
- F22 PARTIAL — https://git-scm.com/docs/git-merge; https://git-scm.com/docs/git-gc
    quote: do not actually make a commit, move the `HEAD`, or record `$GIT_DIR/MERGE_HEAD` ... create a single commit on top of the current branch whose effect is the same as merging another branch
    note: git-merge supports no merge commit, no MERGE_HEAD, and a single-parent result. git-gc supports gc.reflogExpireUnreachable default 30 days and gc.pruneExpire default 2 weeks. The statement that unreachable commits survive only via reflog plus the prune grace was not stated as such, and dangling SHAs and blob-anchor survival are the author's stated inference.
