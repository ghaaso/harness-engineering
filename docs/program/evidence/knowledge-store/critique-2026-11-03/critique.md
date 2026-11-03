# The owner's critique of KNOWLEDGE-STORE-DESIGN-2026-11.md v1.2 (received 2026-11-03), verbatim

Syntax trees should run the checks. The doc plans a hand-written reader for five languages, and those checks are the store's only safety gate. Every slip in that reader becomes a wrong "present" or "absent".

* ast-grep is a maintained parser: one pinned npm package with a prebuilt Windows binary. It never matches inside comments or strings, which is exactly what fooled the text checks.
* The limit: no parser can recognise the same behaviour written a different way. ex3 still needs a real test.

1. The code's own graph catches staleness the design admits it can't see. Add a "who calls this function" list to each entry's footprint.
   * Example: a later phase adds "remember this device" login in a new file. It calls the PIN check, then clears the lock without the lockout check. Today ex6's files don't change, so ex6 stays trusted. With a callers list, the new call site turns ex6 suspect.
   * Only go one hop. Following import chains through a hub like `AppContext.jsx` flags everything. When Facebook selected every test that indirectly depended on a change, it picked around 10,000 tests, and 99.9% of them passed.
2. Silent bugs need a code trigger, not a wording match. ex3, ex4 and ex6 have no error text, so lookups driven by errors can never find them. The doc's "a miss is cheap and safe" is wrong for "don't do this" warnings.
   * Fix: when an agent edits a function an entry protects, show that one warning.
   * Your call: this breaks the doc's "pull-only, no hooks" rule. It's capped at one warning, matched by function, and tested separately in the pilot.
3. The rule for when to add embeddings was wrong. Wording gaps come from how people describe symptoms, not from how big the store is. 19–23% of duplicate bug reports are worded differently, and keyword search finds 10–18 points fewer of them. "Keyword search beats embeddings at this scale" isn't established either; it depends on the kind of query.
   * Fix: make misses visible. When Opus records a new entry, it first checks whether an existing entry should have matched. Add a local embedding model only if 3 or more real wording misses show up.
