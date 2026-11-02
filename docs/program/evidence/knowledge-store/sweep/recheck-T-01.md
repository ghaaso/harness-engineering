# recheck:T-01

lane=T-01 tool_status=ok checks=10

- F01 ON_PAGE — https://www.microsoft.com/en-us/research/wp-content/uploads/2018/03/build-systems.pdf
    quote: Since the verifying trace persists from one build to the next it constitutes the build system's "memory"
    note: WebFetch returned only binary; I ran pdftotext on the saved PDF. Confirmed the scheduler/rebuilder split, dirty bit (Excel; Make's mtimes act as one), deep constructive traces (terminal inputs only), and Buck/Nix as deep (5.4). Bazel/CloudBuild/Cloud Shake constructive per 5.4. Shake/Ninja as verifying traces rests on the Table 2 extraction, which is garbled, but this is consistent with the text.
- F02 ON_PAGE — https://www.microsoft.com/en-us/research/wp-content/uploads/2018/03/build-systems.pdf
    quote: Not all build systems support early cutoff: Make and Excel do not, whereas Shake and Bazel (introduced below) do. ... all traces except for deep traces (4.2.4) support early cutoff.
    note: Definition 2.1 matches. Deep traces cut off 'other than at n levels of dependencies' (4.2.4). The dirty-bit explanation is in 4.2.1.
- F03 ON_PAGE — https://www.microsoft.com/en-us/research/wp-content/uploads/2018/03/build-systems.pdf
    quote: Systems like Bazel use various sandboxing techniques to guard against missing dependencies, but none are likely to capture all dependencies right down to the CPU model and microcode version.
    note: The three impurity sources (untracked dependencies with the gcc example, non-determinism, volatility modelled as a RealWorld key changed every build) are all present.
- F04 ON_PAGE — https://www.microsoft.com/en-us/research/wp-content/uploads/2018/03/build-systems.pdf
    quote: the resulting store is incorrect according to all three definitions of correctness
    note: Fig. 11 and the text say report.txt is inconsistent with its immediate dependency main.prof, caused by non-determinism plus deep constructive traces that hash only terminal inputs.
- F09 ON_PAGE — https://rustc-dev-guide.rust-lang.org/queries/incremental-compilation.html
    quote: If any of the nodes in reads(Q) wind up colored red, then Q is dirty.
    note: WebFetch summary: the page covers try-mark-green, red/green colouring, comparing the result hash after re-execution, and reads kept in order because a subquery turning red can change the path. It was not independently re-read in full.
- F11 ON_PAGE — https://www.rfc-editor.org/rfc/rfc2308.txt
    quote: Negative caching in resolvers is no-longer optional ... Negative responses without SOA records SHOULD NOT be cached ... taken from the minimum of the SOA.MINIMUM field and SOA's TTL.
    note: Verified by grep of the raw RFC text. Servers MUST include the SOA (line 406). NXDOMAIN is keyed on <QNAME,QCLASS> and NODATA on <QNAME,QTYPE,QCLASS>. Sections not independently pinned.
- F12 PARTIAL — https://www.rfc-editor.org/rfc/rfc2308.txt
    quote: Values of one to three hours have been found to work well and would make sensible a default. Values exceeding one day have been found to be problematic.
    note: The 68 years, tunable, and 1-3 hours / over a day statements, the 5-minute cap for server failure (MUST NOT cache longer than five minutes), and the denial-of-service security note are all present. Failing part: the limit 'should not be greater than that applied to positive answers' is lowercase 'should', not the RFC 2119 keyword SHOULD NOT.
- F14 ON_PAGE — https://www.rfc-editor.org/rfc/rfc8767.txt
    quote: Stale data is used only when refreshing has failed
    note: Verified by grep: 'MAY be used as though it is unexpired', RECOMMENDED 30 seconds, 7-day TTL cap, stale timer 1-3 days, failure recheck no more than 5 minutes per RFC 2308 section 7, and stale negatives delaying newly published TLSA/DS records. Section numbers were not pinned.
- F17 ON_PAGE — https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf
    quote: The lease is a 64-bit token bound to the specific key the client originally requested. ... Leases prevent stale sets in a manner similar to how load-link/store-conditional operates
    note: WebFetch returned only binary; I used pdftotext. Also confirmed: the mcsqueal daemon reads the commit log, reliable logs let it replay lost or misrouted invalidations, and deletes support a hold-off during which adds are rejected (default two seconds for the cold cluster). Thundering-herd throttling is stated in the same lease passage.
- F18 ON_PAGE — https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf
    quote: If stale versions were returned in any of the responses, the coordinator updates those nodes with the latest version. This process is called read repair
    note: WebFetch returned only binary; I used pdftotext. Also confirmed: Merkle-tree anti-entropy with hash comparison down to the leaves, 'last write wins' by physical timestamp versus application-side resolution (shopping cart), and sloppy quorum with hinted handoff. One small point: the page says the coordinator 'updates those nodes', and the fact's quote is otherwise verbatim.
