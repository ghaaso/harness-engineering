# Brief b1/gate (Sonnet, kind run): check the claims by command

Repo root: C:\Users\User\Documents\projects\harness-engineering. F = docs/program/evidence/bottleneck-2026-11-18/.
Write only F/b1-gate.md. Run nothing but read commands (sed -n, grep -n, wc, bash library/lookup.sh).
Read F/b1-claims.md. For every C claim: the path exists; the line exists; the quoted text stands at that line or
within 3 lines of it (say the real line if off). For a record id, `bash library/lookup.sh -f <id>` and say whether
the record says it. One line per claim in F/b1-gate.md:
C<n> | PASS / LINE-OFF (real line) / QUOTE-MISSING / PATH-MISSING / RECORD-DIFFERS (what it says).
Final reply: counts per verdict, nothing else.
