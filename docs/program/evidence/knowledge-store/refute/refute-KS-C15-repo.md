# refute:KS-C15:repo

```json
{
 "claim_id": "KS-C15",
 "lens": "repo",
 "verdict": "NARROWED",
 "counter_evidence": "Part of the claim holds. ci.yml does pin Node 22, but only by major version: line 28 (frontend) and line 60 (mobile) say `node-version: 22` with actions/setup-node@v6, there is no check-latest, and deploy.yml line 48 says the same. The load-bearing premise, that Node 22's bundled SQLite is below 3.51.3, is false for the Node 22 that CI actually gets today. Primary sources:\n(1) deps/sqlite/sqlite3.h at tag v22.23.4 (raw.githubusercontent.com/nodejs/node/v22.23.4/deps/sqlite/sqlite3.h) reads SQLITE_VERSION \"3.53.4\", SQLITE_VERSION_NUMBER 3053004. That is the same SQLite as the dev box's Node 24.22.1.\n(2) At tag v22.23.0 the same file reads \"3.51.3\" (source id 2026-03-13). At tag v22.22.3 it is also \"3.51.3\". At tag v22.22.2 it is \"3.51.2\". So every Node 22 release from v22.22.3 (released 2026-05-13 per nodejs.org/dist/index.json) onward carries the WAL-reset fix. Only v22.22.2 (2026-03-24) and older are below it.\n(3) CHANGELOG_V22.md shows the bumps: \"deps: update sqlite to 3.51.3\" (#62256) in 22.22.3, and 3.53.0 through 3.53.4 (#62699, #63217, #63774, #64180, #64745) in 22.23.4, released 2026-10-20/21 as a security release.\n(4) The GitHub runner image Ubuntu2404-Readme.md (image 20261026.354.1) lists Node.js 22.23.4 under Language and Runtime, and the tool cache holds 22.23.4 and 24.22.1. So `node-version: 22` resolves to 22.23.4, which bundles SQLite 3.53.4.\n(5) On Node 22, node:sqlite has been unflagged since v22.13.0 (2025-01-06) according to the v22 docs history table, though it is still Stability 1.1. The v22.23.4 deps/sqlite/sqlite.gyp defines SQLITE_ENABLE_FTS5. So FTS5 and the module are both available on CI's Node 22.\nThe judge-3 note that Node 22's SQLite \"very likely predates 3.51.3\" was marked as inferred, and it is wrong for the current 22.x line.",
 "trace": "Evidence for the parts that survive:\n- ci.yml lines 28 and 60 pin Node 22 (major only). Read locally.\n- The local Node v24.22.1 reports process.versions.sqlite 3.53.4, and sqlite_version() returns 3.53.4 (my node -e run).\n- T-06.F4 and X-01.F02 (sqlite.org/wal.html section 11): versions 3.7.0 through 3.51.2 can corrupt a WAL database when two or more connections write or checkpoint at the same instant. That is the store's multi-process pattern.\n- package.json engines allows node >=22.0.0. Node 22 releases older than v22.22.3 (2026-05-13) bundle SQLite 3.51.2 or lower, and releases older than v22.13.0 hide node:sqlite behind a flag.\nSo a runtime gate on sqlite_version() is still justified: any developer machine, VPS or older runner with an older 22.x would otherwise open the index with a vulnerable SQLite.\nThe inference that the store's tests must run on Node 24 because of the SQLite version does not follow. The Node 22 that CI resolves today bundles 3.53.4.",
 "narrowed_claim": "ci.yml (and deploy.yml) pin Node by major version only (`node-version: 22`). On current GitHub ubuntu-24.04 runners (image 20261026) that resolves to Node 22.23.4, which bundles SQLite 3.53.4, above the 3.51.3 WAL-reset fix. Every Node 22 release from v22.22.3 (2026-05-13) onward bundles 3.51.3 or later; only v22.22.2 and older bundle 3.51.2 or lower.\n\nThe SQLite version is therefore not a reason to keep the store's tests off ci.yml's Node 22. A separate path-filtered Node 24 workflow may still be the right call on other grounds, but those grounds would have to be argued separately:\n- node:sqlite is Stability 1.1 on v22 and 1.2 on v24;\n- the tools may use node:sqlite APIs or options that exist only on 24 (to be checked);\n- keeping ci.yml's branch-protection job names untouched.\n\nThe CLI version gate still stands. It should refuse to open the index when the runtime's sqlite_version() is below 3.51.3. It needs to read sqlite_version() at runtime and not assume anything from the Node major version, because engines allows Node 22.0.0 and later, and Node 22 below v22.22.3 (or below v22.13.0, where the module is flagged) is still installable. The gate is conservative: it also refuses the fixed backport releases 3.44.6 and 3.50.7, which no Node release ships.",
 "what_would_settle_it": "",
 "design_consequence": "1. Drop \"ci.yml's Node 22 bundles a pre-fix SQLite\" as the reason for a separate Node 24 workflow. The design must either give a real reason for that workflow (for example, node:sqlite APIs or options used by tools/ks that are missing on v22, or its Stability 1.1 status there) or let the store's tests run on Node 22 as well.\n2. Whatever workflow runs the tests should print and assert sqlite_version() >= 3.51.3 in the job itself, because `node-version: 22` floats with the runner image and can, in principle, resolve to an older cached 22.x.\n3. Keep the runtime gate in the CLI. Base it on SELECT sqlite_version() (or the version number), not on process.versions.node. Document that it deliberately refuses the 3.44.6 and 3.50.7 backports.\n4. Correct the judge-3 note and any design text that says CI's Node 22 is below the fix. The register should record that Node v22.22.3 and later bundle 3.51.3 or later, and that v22.23.4 bundles 3.53.4.",
 "commands_run": [
  "grep -n -i \"node\\|setup-node\\|runs-on\\|jobs:\" .github/workflows/ci.yml; ls .github/workflows; cat .nvmrc; grep -n engines package.json technician-app/package.json",
  "node -e \"const s=require('node:sqlite');const d=new s.DatabaseSync(':memory:');console.log(process.version, process.versions.sqlite, d.prepare('select sqlite_version() v').get())\"  -> v24.22.1 3.53.4 { v: '3.53.4' }",
  "grep -rn -i \"3\\.51\\|wal.reset\\|Node 22\" docs/program",
  "node -e (extract T-06 F4/F5 and X-01 F02/F09 from sweep JSON)",
  "ls nvm/fnm/volta dirs; which -a node (only C:/Program Files/nodejs, v24.22.1)",
  "sed -n 1,80p .github/workflows/ci.yml; git log -3 -- .github/workflows/ci.yml",
  "grep -n node-version .github/workflows/deploy.yml",
  "WebFetch raw.githubusercontent.com/nodejs/node/main/doc/changelogs/CHANGELOG_V22.md",
  "WebFetch raw.githubusercontent.com/nodejs/node/v22.23.4/deps/sqlite/sqlite3.h",
  "WebFetch raw.githubusercontent.com/nodejs/node/v22.23.0/deps/sqlite/sqlite3.h",
  "WebFetch raw.githubusercontent.com/nodejs/node/v22.22.3/deps/sqlite/sqlite3.h",
  "WebFetch raw.githubusercontent.com/nodejs/node/v22.22.2/deps/sqlite/sqlite3.h",
  "WebFetch raw.githubusercontent.com/nodejs/node/v22.23.4/deps/sqlite/sqlite.gyp",
  "WebFetch nodejs.org/dist/index.json (dates)",
  "WebFetch nodejs.org/docs/latest-v22.x/api/sqlite.html",
  "WebFetch raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md"
 ],
 "sources": [
  "C:/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/knowledge-store-research-9c609c/.github/workflows/ci.yml (lines 25-29, 57-62: node-version: 22)",
  "C:/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/knowledge-store-research-9c609c/.github/workflows/deploy.yml (line 48: node-version: 22)",
  "C:/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/knowledge-store-research-9c609c/package.json (engines node >=22.0.0)",
  "C:/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/knowledge-store-research-9c609c/docs/program/evidence/knowledge-store/sweep/lane-T-06.json (F4, F5)",
  "C:/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/knowledge-store-research-9c609c/docs/program/evidence/knowledge-store/sweep/lane-X-01.json (F02, F09)",
  "C:/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/knowledge-store-research-9c609c/docs/program/evidence/knowledge-store/panel/judge-3.json (line 301: 'very likely predates 3.51.3 (inferred)')",
  "https://raw.githubusercontent.com/nodejs/node/v22.23.4/deps/sqlite/sqlite3.h (SQLITE_VERSION 3.53.4)",
  "https://raw.githubusercontent.com/nodejs/node/v22.23.0/deps/sqlite/sqlite3.h (3.51.3)",
  "https://raw.githubusercontent.com/nodejs/node/v22.22.3/deps/sqlite/sqlite3.h (3.51.3)",
  "https://raw.githubusercontent.com/nodejs/node/v22.22.2/deps/sqlite/sqlite3.h (3.51.2)",
  "https://raw.githubusercontent.com/nodejs/node/v22.23.4/deps/sqlite/sqlite.gyp (SQLITE_ENABLE_FTS5)",
  "https://raw.githubusercontent.com/nodejs/node/main/doc/changelogs/CHANGELOG_V22.md (22.22.3: update sqlite to 3.51.3 #62256; 22.23.4: update sqlite to 3.53.4 #64745)",
  "https://nodejs.org/dist/index.json (v22.22.3 2026-05-13; v22.23.4 2026-10-20)",
  "https://nodejs.org/docs/latest-v22.x/api/sqlite.html (Stability 1.1; unflagged v22.13.0)",
  "https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md (image 20261026.354.1: Node.js 22.23.4; cached 22.23.4, 24.22.1)",
  "https://www.sqlite.org/wal.html section 11 (via T-06.F4 / X-01.F02: bug in 3.7.0-3.51.2, fixed 3.51.3, backports 3.44.6 and 3.50.7)"
 ]
}
```
