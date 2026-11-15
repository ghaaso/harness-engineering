"""Shared definitions for the TQ question set (frozen commit a31924a)."""

FROZEN = "a31924a3818f4ac94b695906d107c72c912792b2"

SCOPE = {
    "screen_tables": (
        "Scope: follow the client code from the named starting point through any outbox, upload or "
        "retry queue it feeds, the HTTP routes it calls, and the backend router, service and repository "
        "code. Count a table if a statement on that path can INSERT, UPDATE or DELETE rows in it "
        "(ORM add, attribute change then flush/commit, bulk insert, session.delete). Conditional writes "
        "count. Reads do not. Tables written only by scheduler jobs, or only by other screens, do not."
    ),
    "tests_reach": (
        "Scope: every test file in the repo (backend pytest, web Vitest, mobile Jest, root tests/). "
        "'real' = some test in the file executes the real body of the function, directly or through any "
        "chain of calls (tests that need FIXFLOW_TEST_DATABASE_URL count as real). 'fake' = some test in "
        "the file substitutes this function itself, or the whole module that defines it, with a fake "
        "(patch, monkeypatch, AsyncMock assignment, jest.mock, vi.mock) and exercises code that calls it. "
        "A file that never causes the function to be called or replaced is in neither list."
    ),
    "invariants_on_file": (
        "Scope: an invariant is one bullet under '## Invariants you must respect when changing code' in "
        "CLAUDE.md, named by the line its bullet starts on (CLAUDE.md:L<n>). It constrains file F when the "
        "bullet (a) names F by path or basename, (b) names a symbol defined in F, (c) names a component that "
        "CLAUDE.md's own 'Offline engine' table maps to F, or (d) states a rule whose check or behaviour is "
        "implemented by code in F. The repo-wide conventions at L116, L119 and L127 count only through (a) "
        "or (b)."
    ),
    "other_half": (
        "Scope: production code only (not tests, docs or comments). Give each item as path::Symbol "
        "(Class.method or object.method where it applies)."
    ),
    "setting_readers": (
        "Scope: production code only, migrations included (not tests, comments, docstrings or docs). A "
        "reader is code that reads the named value (attribute access, env lookup, settings-key lookup). "
        "Give each as path::enclosing function, or path::NAME for a module-level read. Code that only "
        "sets the value (Dockerfiles, eas.json) is not a reader."
    ),
    "migrations_touch_table": (
        "Scope: backend/alembic/versions, upgrade() only. A migration touches table T when it creates, "
        "alters or drops T; adds, drops, alters or validates a column, index or constraint attached to T; "
        "or reads or writes T's rows in SQL. A foreign key declared on another table that only references "
        "T does not count, nor does a mention in a docstring or comment."
    ),
    "route_clients": (
        "Scope: client code in src/ (web manager and ops console), technician-app/ (mobile) and "
        "ops-server.mjs (ops BFF), not tests. call_sites = client functions that build the URL and send "
        "the HTTP request to this backend route. via_bff = client functions that request the same path "
        "from the ops BFF, which then calls the backend. direct_callers = production functions that call "
        "a call_sites function directly."
    ),
    "change_reach": (
        "Scope: static call reach, production code only. backend = entry points whose execution can call "
        "the function directly or transitively: HTTP routes as 'METHOD /api/path' (path as mounted), "
        "scheduler jobs as 'scheduler:<name>', scripts as 'script:<path>'. web = functions under src/ "
        "that send a request to one of those routes. mobile = functions under technician-app/ that send "
        "a request to one of those routes."
    ),
}

FORM = {
    "screen_tables": 'JSON array of table names, e.g. ["job", "job_event"]; [] if none.',
    "tests_reach": '{"real": [test file paths from repo root], "fake": [test file paths from repo root]}',
    "invariants_on_file": 'JSON array of invariant ids, e.g. ["CLAUDE.md:L151"]; [] if none.',
    "other_half": 'JSON array of "path::Symbol" items; [] if none.',
    "setting_readers": 'JSON array of "path::function" or "path::NAME" items; [] if none.',
    "migrations_touch_table": 'JSON array of 4-digit revision ids, e.g. ["0004"]; [] if none.',
    "route_clients": '{"call_sites": ["path::function"], "via_bff": ["path::function"], "direct_callers": ["path::function"]}',
    "change_reach": '{"backend": ["METHOD /api/path" | "scheduler:<name>" | "script:<path>"], "web": ["path::function"], "mobile": ["path::function"]}',
}
