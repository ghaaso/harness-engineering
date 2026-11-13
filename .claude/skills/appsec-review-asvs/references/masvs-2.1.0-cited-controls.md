<!-- Trimmed from https://github.com/OWASP/secure-agent-playbook @ 65d4efd2cd0b081d52101e9708792b944e4ddebb plugins/code-security-skills/data/masvs/{MASVS-STORAGE-1,MASVS-STORAGE-2,MASVS-NETWORK-1,MASVS-AUTH-1,MASVS-PLATFORM-1,MASVS-CODE-3}.md (CC-BY-SA-4.0): kept sections Control, Description and the mastg_tests list of those six controls, verbatim; YAML frontmatter re-rendered as one "Source … mastg_tests" line and headings demoted one level; no wording changed. Author: OWASP MAS project (OWASP/masvs at tag v2.1.0). -->

# OWASP MASVS v2.1.0 — the six controls this skill cites

Licence: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Adaptation (trimmed,
not reworded), shared under the same licence; attribution in `../LICENSE-owasp-asvs-masvs`.
Upstream version note, verbatim from `data/masvs/README.md:3`:
"24 structured MASVS control files (8 groups, 24 controls) sourced from [OWASP MASVS](https://github.com/OWASP/masvs) at tag `v2.1.0`."
MASTG test ids are listed for lookup only; the test files are not vendored here (all carry
`upstream_tag: 31cec00` of OWASP/mastg). Of the ids below, only MASTG-TEST-0011 and
MASTG-TEST-0060 (STORAGE-2) are `upstream_version: v1-fallback` (`data/mastg/MASTG-TEST-0011.md:4`,
`MASTG-TEST-0060.md:4`); their upstream `status_note` (`:14`) reads "V1 test; no V2 successor
authored upstream yet — content may be outdated". Cite them as `[V1 — no V2 successor]`
(`plays/mobile-code-review.md:52`).

Source: `data/masvs/MASVS-STORAGE-1.md` — mastg_tests: MASTG-TEST-0200 MASTG-TEST-0201 MASTG-TEST-0202 MASTG-TEST-0207 MASTG-TEST-0247 MASTG-TEST-0249 MASTG-TEST-0299 MASTG-TEST-0300 MASTG-TEST-0301 MASTG-TEST-0302 MASTG-TEST-0303 MASTG-TEST-0304 MASTG-TEST-0305 MASTG-TEST-0306 

## MASVS-STORAGE-1

### Control

The app securely stores sensitive data.

### Description

Apps handle sensitive data coming from many sources such as the user, the backend, system services or other apps on the device and usually need to store it locally. The storage locations may be private to the app (e.g. its internal storage) or be public and therefore accessible by the user or other installed apps (e.g. public folders such as Downloads). This control ensures that any sensitive data that is intentionally stored by the app is properly protected independently of the target location.

Source: `data/masvs/MASVS-STORAGE-2.md` — mastg_tests: MASTG-TEST-0011 MASTG-TEST-0060 MASTG-TEST-0203 MASTG-TEST-0206 MASTG-TEST-0215 MASTG-TEST-0216 MASTG-TEST-0231 MASTG-TEST-0258 MASTG-TEST-0281 MASTG-TEST-0296 MASTG-TEST-0297 MASTG-TEST-0298 MASTG-TEST-0313 MASTG-TEST-0314 MASTG-TEST-0315 MASTG-TEST-0318 MASTG-TEST-0319 

## MASVS-STORAGE-2

### Control

The app prevents leakage of sensitive data.

### Description

There are cases when sensitive data is unintentionally stored or exposed to publicly accessible locations; typically as a side-effect of using certain APIs, system capabilities such as backups or logs. This control covers this kind of unintentional leaks where the developer actually has a way to prevent it.

Source: `data/masvs/MASVS-NETWORK-1.md` — mastg_tests: MASTG-TEST-0067 MASTG-TEST-0217 MASTG-TEST-0218 MASTG-TEST-0233 MASTG-TEST-0234 MASTG-TEST-0235 MASTG-TEST-0236 MASTG-TEST-0237 MASTG-TEST-0238 MASTG-TEST-0239 MASTG-TEST-0282 MASTG-TEST-0283 MASTG-TEST-0284 MASTG-TEST-0285 MASTG-TEST-0286 MASTG-TEST-0295 MASTG-TEST-0321 MASTG-TEST-0322 MASTG-TEST-0342 MASTG-TEST-0343 MASTG-TEST-0344 MASTG-TEST-0345 

## MASVS-NETWORK-1

### Control

The app secures all network traffic according to the current best practices.

### Description

Ensuring data privacy and integrity of any data in transit is critical for any app that communicates over the network. This is typically done by encrypting data and authenticating the remote endpoint, as TLS does. However, there are many ways for a developer to disable the platform secure defaults, or bypass them completely by using low-level APIs or third-party libraries. This control ensures that the app is in fact setting up secure connections in any situation.

Source: `data/masvs/MASVS-AUTH-1.md` — mastg_tests: [] (none upstream)

## MASVS-AUTH-1

### Control

The app uses secure authentication and authorization protocols and follows the relevant best practices.

### Description

Most apps connecting to a remote endpoint require user authentication and also enforce some kind of authorization. While the enforcement of these mechanisms must be on the remote endpoint, the apps also have to ensure that it follows all the relevant best practices to ensure a secure use of the involved protocols.

Source: `data/masvs/MASVS-PLATFORM-1.md` — mastg_tests: MASTG-TEST-0007 MASTG-TEST-0028 MASTG-TEST-0029 MASTG-TEST-0030 MASTG-TEST-0056 MASTG-TEST-0069 MASTG-TEST-0070 MASTG-TEST-0071 MASTG-TEST-0072 MASTG-TEST-0075 MASTG-TEST-0254 MASTG-TEST-0276 MASTG-TEST-0277 MASTG-TEST-0278 MASTG-TEST-0279 MASTG-TEST-0280 

## MASVS-PLATFORM-1

### Control

The app uses IPC mechanisms securely.

### Description

Apps typically use platform provided IPC mechanisms to intentionally expose data or functionality. Both installed apps and the user are able to interact with the app in many different ways. This control ensures that all interactions involving IPC mechanisms happen securely.

Source: `data/masvs/MASVS-CODE-3.md` — mastg_tests: MASTG-TEST-0272 MASTG-TEST-0273 MASTG-TEST-0274 MASTG-TEST-0275 

## MASVS-CODE-3

### Control

The app only uses software components without known vulnerabilities.

### Description

To be truly secure, a full whitebox assessment should have been performed on all app components. However, as it usually happens with e.g. for third-party components this is not always feasible and not typically part of a penetration test. This control covers "low-hanging fruit" cases, such as those that can be detected just by scanning libraries for known vulnerabilities.

