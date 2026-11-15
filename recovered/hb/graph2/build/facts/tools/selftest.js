#!/usr/bin/env node
// Self-test for the extractor rules added in the facts-fix lane. Writes small synthetic fixtures (no
// repository code) to build/tmp/facts-fix/selftest-<pid>/, runs the Python, TypeScript and docs stages
// on them, checks every rule below, and deletes the fixture.  node tools/selftest.js
// Rules: mobile config member chains (`as const`, nested, shorthand) -> reads_setting; invariant
// anchors (start.sh, name(), Owner.field, `x.y = ...`); SQL only from literals passed to
// text()/execute(), DELETE/UPDATE/INSERT as writes, evidence on the statement line; URL ternary and
// looped URL literals (Python tuple, JS for-of array); loop-variable unit-of-work writes;
// Protocol-typed calls -> implementations at 1/k; os.environ / process.env reads; settings method
// call is not a read; subscript-store key is not a read; session.delete needs a session receiver;
// markdown link `:line` suffix; is_test for vitest.setup.js and *_test.py.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const HERE = path.join(__dirname, "..");
const PY = process.env.FACTS_PY || "C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
const ROOT = path.join(HERE, "..", "tmp", "facts-fix", "selftest-" + process.pid);
const F = {
  "backend/app/core/config.py": `import os


class Settings:
    debug: bool = False

    def assert_safe_for_production(self) -> None:
        return None

    def is_production(self) -> bool:
        return bool(os.getenv("RAILWAY_ENVIRONMENT"))


settings = Settings()
`,
  "backend/app/features/demo/models.py": `class Base:
    pass


class Job(Base):
    __tablename__ = "job"
    status: Mapped[str] = mapped_column(String)
`,
  "backend/app/features/tenancy/specs.py": `KEY_FLAG = "flag"
`,
  "backend/app/features/demo/service.py": `import os
from typing import Protocol

from sqlalchemy import select, text

from app.core.config import settings
from app.features.demo.models import Job
from app.features.tenancy.specs import KEY_FLAG


class Rail(Protocol):
    def pay(self, amount: int) -> str: ...


class CashRail:
    def pay(self, amount: int) -> str:
        return "cash"


def get_rail() -> Rail:
    return CashRail()


class Service:
    def __init__(self, rail: Rail | None = None) -> None:
        self._rail = rail or get_rail()

    def run(self) -> str:
        return self._rail.pay(1)


async def sweep(session) -> None:
    """Delete from job every row that nothing references."""
    await session.execute(text("DELETE FROM job WHERE id = :i"))
    rows = (
        await session.execute(
            text(
                """
                SELECT id
                FROM job
                """
            )
        )
    ).all()
    note = "update job set nothing - a plain string, not SQL passed to text()"
    return rows, note


async def fix(session) -> None:
    jobs = list((await session.execute(select(Job))).scalars())
    for job in jobs:
        job.status = "closed"
    res = await session.execute(select(Job).where(Job.status == "x"))
    one = res.scalar_one_or_none()
    one.status = "open"
    await session.delete(one)


class Repo:
    async def delete(self, x) -> None:
        return None


async def remove(repo: Repo, session) -> None:
    j = await session.get(Job, 1)
    await repo.delete(j)


def flags(values: dict) -> None:
    settings.assert_safe_for_production()
    _ = settings.debug
    _ = os.environ["DATABASE_URL"]
    _ = values.get(KEY_FLAG)
    values[KEY_FLAG] = True
`,
  "backend/tests/test_demo.py": `async def test_urls(client) -> None:
    for path in (
        "/api/demo/a",
        "/api/demo/b",
    ):
        await client.get(path)
`,
  "technician-app/src/lib/config.ts": `const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://x";

export const config = {
  apiUrl,
  video: {
    minMs: 3_000,
  },
  attendance: {
    maxDutyHours: 14,
  },
} as const;
`,
  "technician-app/src/features/demo/reader.ts": `import { config } from "../../lib/config";

const MAX_MS = config.attendance.maxDutyHours * 3600 * 1000;

export function bounds(): number[] {
  return [config.video.minMs, MAX_MS, config.apiUrl.length];
}
`,
  "src/features/demo/api.js": `function apiGet(u) {
  return u;
}

export function issues(p) {
  return apiGet(
    p
      ? \`/api/demo/issues?p=\${p}\`
      : "/api/demo/issues"
  );
}
`,
  "src/features/demo/api.test.js": `import { issues } from "./api";

export function loop() {
  for (const u of ["/api/demo/a", "/api/demo/b"]) {
    fetch(u);
  }
  return issues;
}
`,
  "vitest.setup.js": `export const SETUP = 1;
`,
  "vite.config.js": `export default { base: process.env.VITE_BASE || "/" };
`,
};
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); else console.log("ok   " + msg); };
try {
  fs.rmSync(ROOT, { recursive: true, force: true });
  for (const [p, s] of Object.entries(F)) { fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true }); fs.writeFileSync(path.join(ROOT, p), s); }
  // ---------- Python ----------
  const pyOut = path.join(ROOT, "..", "selftest-py-" + process.pid + ".json");
  const pr = cp.spawnSync(PY, ["-I", path.join(HERE, "py_extract.py"), ROOT, pyOut], { encoding: "utf8", env: Object.assign({}, process.env, { PYTHONHASHSEED: "0" }) });
  if (pr.status !== 0) throw new Error("py stage failed: " + pr.stderr.slice(-800));
  const py = JSON.parse(fs.readFileSync(pyOut, "utf8"));
  fs.rmSync(pyOut, { force: true });
  const E = py.edges;
  const has = (k, src, dst, pred) => E.filter((e) => e.kind === k && e.src.endsWith(src) && e.dst === dst && (!pred || pred(e)));
  const S = "backend/app/features/demo/service.py";
  ok(has("writes_table", "#sweep", "table:job", (e) => e.evidence_line === 34 && e.attrs.op === "delete from").length === 1, "SQL DELETE FROM in text() is a write on its statement line (34)");
  ok(has("reads_table", "#sweep", "table:job", (e) => e.evidence_line === 40).length === 1, "SQL FROM inside a triple-quoted text() literal: read on line 40, not the literal's first line");
  ok(E.filter((e) => /_table$/.test(e.kind) && e.evidence_path === S && (e.evidence_line === 33 || e.evidence_line === 44)).length === 0, "no table edge from the docstring (33) or a plain string (44)");
  ok(has("calls", "#Service.run", "sym:" + S + "#CashRail.pay", (e) => e.confidence === 1 && e.attrs.how === "protocol_impl").length === 1, "Protocol-typed call reaches the implementation at 1/k (k = 1)");
  ok(has("calls", "#Service.run", "sym:" + S + "#Rail.pay").length === 1, "Protocol-typed call still reaches the Protocol method");
  ok(has("writes_column", "#fix", "column:job.status", (e) => e.evidence_line === 52 && e.attrs.typed === "query_flow").length === 1, "unit-of-work write through a loop variable (line 52)");
  ok(has("writes_column", "#fix", "column:job.status", (e) => e.evidence_line === 55).length === 1, "unit-of-work write through execute(select()).scalar_one_or_none() (line 55)");
  ok(has("writes_table", "#fix", "table:job", (e) => e.attrs.op === "session.delete").length === 1, "session.delete(x) is a write");
  ok(has("writes_table", "#remove", "table:job").length === 0, "repo.delete(x) is not a table write (no session receiver)");
  ok(has("reads_setting", "#flags", "setting:debug").length === 1, "settings.debug is a read");
  ok(E.filter((e) => e.kind === "reads_setting" && e.dst === "setting:assert_safe_for_production").length === 0, "settings method call is not a setting read");
  ok(has("reads_setting", "#flags", "setting:env/DATABASE_URL").length === 1 && has("reads_setting", "#Settings.is_production", "setting:env/RAILWAY_ENVIRONMENT").length === 1, "os.environ[...] and os.getenv(...) are env reads");
  const shopReads = E.filter((e) => e.kind === "reads_setting" && e.dst === "setting:shop/flag");
  ok(shopReads.length === 1 && shopReads[0].evidence_line === 73, "a shop KEY_ read counts (line 73), the subscript-store key (line 74) does not");
  const hc = py.http_calls.filter((h) => h.path === "backend/tests/test_demo.py");
  ok(hc.length === 2 && hc.map((h) => h.url + ":" + h.line).join(",") === "/api/demo/a:3,/api/demo/b:4", "URL literals looped over a tuple: one call per literal, on its line");
  // ---------- TypeScript / JS ----------
  const tsOut = path.join(ROOT, "..", "selftest-ts-" + process.pid + ".json");
  const tr = cp.spawnSync(process.execPath, [path.join(HERE, "ts_extract.js"), ROOT, tsOut], { encoding: "utf8" });
  if (tr.status !== 0) throw new Error("ts stage failed: " + tr.stderr.slice(-800));
  const tsg = JSON.parse(fs.readFileSync(tsOut, "utf8"));
  fs.rmSync(tsOut, { force: true });
  const cfg = tsg.envReads.filter((r) => r.cfg).map((r) => r.src + "|" + r.cfg.name + "|" + r.line).sort();
  ok(cfg.includes("file:technician-app/src/features/demo/reader.ts|config.attendance.maxDutyHours|3"), "config.attendance.maxDutyHours (nested, `as const`) is a config read");
  ok(cfg.includes("sym:technician-app/src/features/demo/reader.ts#bounds|config.video.minMs|6"), "config.video.minMs is a config read");
  ok(cfg.includes("sym:technician-app/src/features/demo/reader.ts#bounds|config.apiUrl|6"), "shorthand config.apiUrl is a config read");
  ok(!cfg.some((x) => /\|config\.(video|attendance)\|/.test(x)), "an intermediate object (config.video) is not a setting");
  ok(tsg.envReads.some((r) => r.key === "VITE_BASE" && r.path === "vite.config.js" && r.line === 1), "process.env.VITE_BASE in vite.config.js");
  const urls = tsg.urls.map((u) => u.path + "|" + u.method + " " + u.url + "|" + u.line).sort();
  ok(urls.filter((x) => x.startsWith("src/features/demo/api.js|GET /api/demo/issues|")).length === 1, "URL ternary: both arms seen, one site for one URL");
  ok(urls.includes("src/features/demo/api.test.js|GET /api/demo/a|4") && urls.includes("src/features/demo/api.test.js|GET /api/demo/b|4"), "for-of over an array of URL literals");
  // ---------- is_test ----------
  const bf = fs.readFileSync(path.join(HERE, "build_facts.js"), "utf8");
  const isTest = new Function(bf.match(/function isTestPath\(p\) \{[\s\S]*?\n\}/)[0] + "; return isTestPath;")();
  ok(isTest("vitest.setup.js") && isTest("backend/app/x_test.py") && !isTest("src/app/latest.py") && isTest("src/a.test.jsx"), "is_test covers vitest.setup.js and *_test.py");
  // ---------- docs ----------
  const { runDocs } = require(path.join(HERE, "docs_extract.js"));
  fs.mkdirSync(path.join(ROOT, "docs"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "CLAUDE.md"), [
    "# T", "", "## Invariants you must respect", "",
    "- **Boot.** `start.sh` runs migrations.",
    "- **Machine.** `transition()` in `jobs/service.py` is guarded.",
    "- **Resume.** `JobDetail.evidence` carries counts.",
    "- **Cursor.** a detached `cursor.last_seq = …` persists nothing.",
    "- **Duty.** sampling stops at `config.attendance.maxDutyHours`.",
    "", "## Next", "",
  ].join("\n"));
  fs.writeFileSync(path.join(ROOT, "docs", "d.md"), "# D\n\nSee [svc](../backend/app/features/jobs/service.py:12) here.\n");
  fs.mkdirSync(path.join(ROOT, "backend", "app", "features", "jobs"), { recursive: true });
  const files = ["CLAUDE.md", "backend/start.sh", "backend/app/features/jobs/service.py", "backend/app/features/jobs/schemas.py", "src/features/jobs/JobDetail.jsx", "docs/d.md"].sort();
  const nodes = new Map([
    ["sym:backend/app/features/jobs/service.py#JobService.transition", { kind: "method", name: "transition", path: "backend/app/features/jobs/service.py" }],
    ["sym:backend/app/features/other/service.py#transition", { kind: "function", name: "transition", path: "backend/app/features/other/service.py" }],
    ["sym:backend/app/features/jobs/schemas.py#JobDetail", { kind: "class", name: "JobDetail", path: "backend/app/features/jobs/schemas.py" }],
    ["sym:src/features/jobs/JobDetail.jsx#JobDetail", { kind: "component", name: "JobDetail", path: "src/features/jobs/JobDetail.jsx" }],
    ["column:dispatch_cursor.last_seq", { kind: "column", name: "last_seq", path: "backend/app/features/jobs/models.py" }],
    ["setting:technician-app/src/lib/config.ts#config.attendance.maxDutyHours", { kind: "setting", name: "config.attendance.maxDutyHours", path: "technician-app/src/lib/config.ts" }],
  ]);
  const d = runDocs(ROOT, files, nodes, []);
  const con = d.edges.filter((e) => e.kind === "constrains").map((e) => e.src + "->" + e.dst);
  ok(con.includes("inv:CLAUDE.md#1->file:backend/start.sh"), "invariant anchor `start.sh`");
  ok(con.includes("inv:CLAUDE.md#2->sym:backend/app/features/jobs/service.py#JobService.transition") && !con.includes("inv:CLAUDE.md#2->sym:backend/app/features/other/service.py#transition"), "invariant anchor `transition()` narrowed by the named file");
  ok(con.includes("inv:CLAUDE.md#3->sym:backend/app/features/jobs/schemas.py#JobDetail") && !con.some((x) => x.endsWith("JobDetail.jsx#JobDetail")), "invariant anchor `JobDetail.evidence` -> the class that owns the field");
  ok(con.includes("inv:CLAUDE.md#4->column:dispatch_cursor.last_seq"), "invariant anchor `cursor.last_seq = …`");
  ok(con.includes("inv:CLAUDE.md#5->setting:technician-app/src/lib/config.ts#config.attendance.maxDutyHours"), "invariant anchor `config.attendance.maxDutyHours`");
  const ci = d.edges.filter((e) => e.kind === "cites" && e.evidence_path === "docs/d.md");
  ok(ci.length === 1 && ci[0].dst === "file:backend/app/features/jobs/service.py" && ci[0].attrs.line === 12, "markdown link with a :line suffix resolves, line kept");
} catch (e) { fails.push("crashed: " + (e && e.stack || e)); }
finally { fs.rmSync(ROOT, { recursive: true, force: true }); }
if (fails.length) { console.log("\nFAILED " + fails.length + ":\n" + fails.join("\n")); process.exit(1); }
console.log("\nall self-tests passed");
