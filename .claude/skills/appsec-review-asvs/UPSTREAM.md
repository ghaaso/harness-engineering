# UPSTREAM — appsec-review-asvs

Status: **sourced**. Written 2026-11-04. One upstream; one base skill named but not vendored.

## owasp-secure-agent-playbook

| Field | Value |
| --- | --- |
| Repo | https://github.com/OWASP/secure-agent-playbook |
| Commit | `65d4efd2cd0b081d52101e9708792b944e4ddebb` |
| Branch | `main` |
| Fetched | 2026-11-04 (sparse, shallow clone) |
| Paths taken | `plugins/code-security-skills/skills/security-guidance`, `plugins/code-security-skills/skills/mobile-code-review`, `plugins/code-security-skills/data`, `plugins/code-security-skills/plays`, `plugins/code-security-skills/templates` |
| SPDX (repo, skills, plays, templates) | `CC-BY-4.0` — `LICENSE-owasp-secure-agent-playbook` (verbatim copy of the repo `LICENSE.md`) |
| SPDX (`data/asvs`, `data/masvs`, `data/mastg`, `data/fiasse`) | `CC-BY-SA-4.0` — `LICENSE-owasp-asvs-masvs` |
| SPDX (`data/secure-code-prompts`) | `MIT` — nothing taken |

**Licence files.** The repo `LICENSE.md` is a 4-line notice linking the CC BY 4.0 licence and
giving the SPDX id, not the full legal text; it is copied verbatim (`cp`) and the legal code is
at https://creativecommons.org/licenses/by/4.0/legalcode. The ASVS/MASVS data has no licence
file of its own: `LICENSE-owasp-asvs-masvs` holds the attribution text the upstream carries,
copied verbatim — `data/asvs/README.md:1-7`, `data/masvs/README.md:1-7`,
`THIRD_PARTY_NOTICES.md:13-19` and `:40` — under a header naming the licence link and the SA scope.

**Note on the symlink.** In the clone `skills/security-guidance/references` is a 16-byte text file
standing in for a symlink to `../../../../data`; `data/` was read directly.

**Upstream version notes kept** (verbatim, in the vendored headers): `data/asvs/README.md:3`
("80 structured ASVS 5.0 section files sourced from the OWASP Agent Skills Project by Erlend
Oftedal"); `data/masvs/README.md:3` (MASVS at tag `v2.1.0`); `skills/mobile-code-review/SKILL.md:3`
("against OWASP MASVS v2.1.0"); MASTG files `upstream_tag: 31cec00`; `data/mastg/MASTG-TEST-0011.md:14`
and `MASTG-TEST-0060.md:14` `status_note: V1 test; no V2 successor authored upstream yet — content
may be outdated` (both listed under STORAGE-2 and marked `[V1 — no V2 successor]` in the MASVS
reference, per `plays/mobile-code-review.md:52`). The upstream states no
"verified against version X on date" sentence beyond these; ASVS 5.0 and MASVS 2.1.0 release
dates are not in the files and were not researched (web not needed for this row).

### Taken

| Vendored file | From | How |
| --- | --- | --- |
| `references/asvs-5.0-cited-rows.md` | `data/asvs/V2.4, V3.4, V4.1, V5.2, V6.2, V6.3, V6.4, V7.2, V7.3, V7.4, V8.2, V8.3, V9.1, V9.2, V11.2, V11.4, V13.3, V13.4, V14.3, V15.3, V16.5 .md` | trimmed: 56 requirement rows verbatim (only the ids SKILL.md or the check map cite) plus the V6.3 level paragraph (`V6.3.md:19`); frontmatter and other prose dropped; 19.1 KB of the 214 KB set |
| `references/masvs-2.1.0-cited-controls.md` | `data/masvs/MASVS-STORAGE-1, MASVS-STORAGE-2, MASVS-NETWORK-1, MASVS-AUTH-1, MASVS-PLATFORM-1, MASVS-CODE-3 .md` | trimmed: Control + Description verbatim, `mastg_tests` lists kept on one line, headings demoted one level |
| `references/owasp-playbook-procedure-excerpts.md` | `skills/security-guidance/SKILL.md:14-25`; `plays/mobile-code-review.md:33-43`, `:90-166`, `:201-208` | verbatim excerpts (Workflow, Escalation; Platform Detection; MASVS groups A-F signal tables; Diff-Specific Analysis) |
| `LICENSE-owasp-secure-agent-playbook` | `LICENSE.md` | verbatim `cp` |
| `LICENSE-owasp-asvs-masvs` | `data/asvs/README.md`, `data/masvs/README.md`, `THIRD_PARTY_NOTICES.md` | verbatim extracts under an authored header |

Cited by upstream path, **not vendored** (MASTG, CC BY-SA 4.0, `upstream_tag: 31cec00`):
`data/mastg/MASTG-TEST-0216.md` (backup exclusion, dynamic), `MASTG-TEST-0203.md` and
`MASTG-TEST-0231.md` (logging), `MASTG-TEST-0233.md` (hardcoded HTTP URLs),
`MASTG-TEST-0235.md` (cleartext configuration), `MASTG-TEST-0272.md` (dependencies with known
vulnerabilities). They are named as lookup ids in the check map §9; their text is not copied.

### Changed (adapted into SKILL.md and the check map)

- security-guidance Workflow (`SKILL.md:14-19`: match → read reference → apply → cite) became
  procedure steps 2-5, with "apply" replaced by "check and report" (the agent is read-only) and
  inline `// ASVS x.y.z` code comments replaced by ASVS ids in the check map rows.
- security-guidance Escalation (`:21-25`, "stop and flag the gap") kept as the blocked rule in the
  agent definition and procedure step 7.
- mobile-code-review steps 1-4 (scope, platform detection, per-MASVS-group walk, diff analysis)
  became procedure step 2 plus the mobile rows of section (c) and check map §9, scoped to
  Android and to an Expo managed app with no `android/` directory.
- mobile-code-review step 5 / play §5 (finding template, severity sort) replaced by the design
  §5.2 FINDINGS / VERDICT / SCAN schemas (`docs/ORCHESTRATION-DESIGN-2026-10.md:468-523`).
- ASVS rows mapped onto FixFlow files, constants, register ids (O05-01..18, O6-F01..F19) and plan
  phases (P1, P7a, P7b-1, P7b-2, P13b) in `references/fixflow-asvs-check-map.md` (authored).
- Base skill: the design names `anthropic-skills:code-audit` as the base
  (`docs/ORCHESTRATION-DESIGN-2026-10.md:730`). It is referred to by name only; its files were
  not in the surveyed set, so this package does not say how its checklist and this one overlap
  beyond "this skill overrides it where section (e) applies".

### Rejected (with reason)

Collisions with CLAUDE.md / plan §0 (from the survey's §5 plus those found while writing;
each is in SKILL.md section e, where the FixFlow rule wins; items 4 and 7 were withdrawn on
2026-11-04 after a refuter pass found no ruling behind them):

1. `data/asvs/V14.3.md:22` (14.3.1, clear authenticated data at logout) — collides with "The
   outbox never deletes a write" (CLAUDE.md:154; plan §0 rule 7). Not adopted for the phone.
2. `data/asvs/V13.3.md:26` (13.3.4, rotate secrets) — rotation is an owner step (README rule 4).
   The agent reports; it never rotates.
3. `data/asvs/V6.4.md:30` (6.4.6, admin must not choose the password) — collides with CLAUDE.md:146-147
   (out-of-band recovery: a manager clears a lock via `set_pin`). Not adopted.
4. (withdrawn 2026-11-04) `data/asvs/V6.3.md:31`, `:19` (6.3.3, MFA at L2) is **not** a
   collision: no CLAUDE.md, plan or G2 ruling decides MFA (PR #182 docs grepped for
   MFA/multi-factor/second factor/2FA; only O-08's console-account 2FA advice). SKILL.md
   section (e) "Not deviations" now has the reviewer report it as a gap / open owner decision.
   `G2-deep-dive-gate-2026-11-01.md:283` lists lock-DoS mitigations, not MFA compensations.
5. `data/asvs/V6.2.md:28`, `:32` (6.2.1 length ≥ 8, 6.2.5 any composition) — FixFlow PIN is
   digits only, ≥ 6 after P1/R4 (`SHIP-PLAN-2026-11.md:337`, `:1473-1475`). Plan ruling wins.
6. `data/asvs/V7.4.md:28` (7.4.3 end sessions after a credential change) and `V7.3.md:22` (7.3.2)
   **for technician tokens only, until the fleet runs the v2 outbox** — the no-bump `set_pin`
   and a long technician lifetime exist because the deployed APK drops queued writes on 401
   (`backend/app/features/identity/service.py:125-128`; plan §0 rule 7, `:115`). The **manager**
   TTL is not a deviation: O05-10, shortened in P7b-1 (`SHIP-PLAN-2026-11.md:1033`).
7. (withdrawn 2026-11-04) `data/asvs/V6.3.md:36` (6.3.8, no user deducibility) is **not** a
   collision: CLAUDE.md:140-142 is about letting a correct PIN through, not the status code; the
   429 at `identity/router.py:86-90` is a current design choice. SKILL.md section (e) "Not
   deviations" has the reviewer report it as an L3 gap / open question.
8. `skills/security-guidance/SKILL.md:18` ("Default to the most secure option") when applied to
   the lock — CLAUDE.md "do not 'fix' this" overrides; G2 ruled "keep the invariant".
9. `skills/security-guidance/SKILL.md:21-25` (stop and flag) — **compatible**, kept.
10. `data/asvs/V9.2.md:25` (9.2.1, exp must be verified) vs the P1 legacy-secret verifier
    (`SHIP-PLAN-2026-11.md:340-345`, ruling R10 `:1496-1498`) — found while writing; ruling wins.
11. `skills/mobile-code-review/SKILL.md:20`, `plays/mobile-code-review.md:224` (severity sort),
    `templates/finding.md:6-17` (`[SEVERITY]`, `NDC-YYYY-NNN` ids, remediation with code,
    confidence words) — README agent rules: no severity outside a contract field; register ids are
    O05-xx / O6-Fxx; design §5.2 schemas replace the template. Found while writing.
12. `plays/mobile-code-review.md:39`, `:43` (detect from `AndroidManifest.xml` / `build.gradle`;
    partial coverage for a shell) — FixFlow has no `android/` and must never `expo prebuild`
    (README rule 2); found while writing.
13. MASTG dynamic tests (e.g. `data/mastg/MASTG-TEST-0216.md:10-12`) — plan §0 rule 1 and README
    rule 4: never run on a roster phone; listed as owner follow-ups.
14. `templates/finding.md:20-30` (OpenCRE REST lookup) and `plays/mobile-code-review.md:71-88`
    (MASWE → CWE web chain, OpenCRE handling) — the agent has no web tool; CWE is left empty unless
    given locally.

Rejected as irrelevant to FixFlow (survey §4, confirmed):

- All 72 iOS MASTG tests and the iOS half of mobile-code-review — FixFlow mobile is Android-only
  (CLAUDE.md:28). The iOS column survives only inside the verbatim play excerpt, marked out of scope.
- ASVS V10.1-V10.7 (OAuth/OIDC), V6.5-V6.8 (MFA, out-of-band, cryptographic auth, IdP) — custom
  name/PIN JWT, no IdP.
- ASVS V17.1-V17.3, V4.3 (GraphQL), V4.4 (WebSocket) — not present.
- ASVS V3.3 (cookies), V7.5/V7.6 — bearer tokens, no cookies, no federation.
- The other 59 ASVS sections not cited — cite `data/asvs/<id>.md` at the SHA above if a brief needs one.
- `data/fiasse/` (129 KB) and `data/secure-code-prompts/` (MIT; Terraform/CloudFormation/K8s) —
  not in the design row; infra is Railway/Docker.
- MASTG-TEST-0070, 0075, 0029, 0028, 0007, 0011, 0069, 0071 — over-large and outside the row.
- MASVS-RESILIENCE and MASVS-PRIVACY as full passes, and the play's RESILIENCE/PRIVACY caveat
  blocks — upstream marks them static-only / runtime-required; no FixFlow phase asks for them.
- `plays/` other than `mobile-code-review.md` (api-security-review, code-review-security,
  owasp-top10-web-review, secrets-scan, sca-audit, …) and `templates/report.md` — not cited by
  SKILL.md; the generic web/API pass is the base skill's job.
- `data/asvs/V6.3.md:23` (NIST email note) — point-in-time statement about email auth; FixFlow
  has no email factor.

## Base skill (named, not vendored)

`anthropic-skills:code-audit` — named by design §9 as the base. Not fetched, not read, no
licence recorded. Open question carried in SKILL.md: how its checklist layers on this one.
