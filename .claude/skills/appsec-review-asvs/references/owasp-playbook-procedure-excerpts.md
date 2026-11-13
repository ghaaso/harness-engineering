<!-- Trimmed from https://github.com/OWASP/secure-agent-playbook @ 65d4efd2cd0b081d52101e9708792b944e4ddebb plugins/code-security-skills/skills/security-guidance/SKILL.md and plugins/code-security-skills/plays/mobile-code-review.md (CC-BY-4.0): kept sections security-guidance SKILL.md:14-25 (Workflow, Escalation); mobile-code-review.md:33-43 (2. Platform Detection), :90-166 (MASVS groups A-F signal tables), :201-208 (4. Diff-Specific Analysis); verbatim. Author: OWASP Secure Agent Playbook contributors (OWASP Foundation project). -->

# OWASP Secure Agent Playbook — procedure excerpts this skill builds on

Licence: CC BY 4.0 (`../LICENSE-owasp-secure-agent-playbook`). Verbatim excerpts; nothing
reworded. Upstream version note, verbatim from `skills/mobile-code-review/SKILL.md:3`:
"Security-focused review of native Android and iOS mobile app source code against OWASP MASVS v2.1.0."
FixFlow scope notes (not upstream text): the iOS column is out of scope (FixFlow mobile is
Android-only); the play's severity sort, `templates/finding.md` fields and OpenCRE/MASWE web
lookups are replaced by the design-§5.2 FINDINGS schema — see SKILL.md "Where upstream
disagrees". The upstream index of 80 ASVS sections (security-guidance SKILL.md:27-986) is
not vendored; `asvs-5.0-cited-rows.md` carries the rows this skill uses.

## From `skills/security-guidance/SKILL.md:14-25`

## Workflow

1. **Identify relevant sections** — Match the current task against the `When to use:` triggers in the index below. A task may match multiple sections; apply all of them.
2. **Read the reference file** — For each matched section, read the full reference file listed at the end of its index entry to get the complete verification requirements.
3. **Apply the guidance** — Implement the requirements. Default to the most secure option when the requirements allow choice. Apply all Level 1 requirements as a minimum baseline; note any Level 2 or Level 3 requirements that are relevant but not yet implemented.
4. **Cite applied requirements inline** — In code comments or plan notes, reference each requirement you satisfy: `// ASVS 6.2.4: password checked against top-3000 list`.

## Escalation

If no section in the index matches a task that involves security-sensitive operations, or if guidance is conflicting or unclear, **stop and flag the gap** before proceeding. Do not guess or paraphrase guidance — escalate instead.

If the index below is empty, report that the reference index failed to load and list which ASVS chapters are likely relevant based on the task description.

## From `plays/mobile-code-review.md:33-43`

### 2. Platform Detection

Detect platform via fingerprints:

| Platform | Fingerprints |
|---|---|
| Android | `AndroidManifest.xml`, `build.gradle[.kts]`, `*.java`, `*.kt`, `src/main/AndroidManifest.xml`, `proguard-rules.pro` |
| iOS | `Info.plist`, `*.xcodeproj`, `*.xcworkspace`, `*.swift`, `*.m`, `*.mm`, `Podfile`, `Package.swift`, `*.entitlements` |
| Cross-platform shell | `pubspec.yaml` (Flutter), `package.json` with `react-native` dep, `capacitor.config.*` |

If only a cross-platform shell is detected and no native module exists, declare **partial coverage** in the scope summary and skip platform-specific signal grepping. Do not produce findings unless explicit Dart/JS-side security issues appear.

## From `plays/mobile-code-review.md:90-166`

#### A. MASVS-STORAGE

MASVS refs: `data/masvs/MASVS-STORAGE.md`, `MASVS-STORAGE-1.md`, `MASVS-STORAGE-2.md`
MASTG forward refs: MASTG-TEST-0001, MASTG-TEST-0003 (and per control)

| Check | Android signal | iOS signal |
|---|---|---|
| Secrets in default prefs | `SharedPreferences` for tokens | `NSUserDefaults` for tokens |
| KeyStore / Keychain misuse | Missing `EncryptedSharedPreferences`; KeyStore alias reuse | Missing/weak `kSecAttrAccessible*` |
| Backup leakage | `android:allowBackup="true"` without backup rules | `Documents/` data without `NSURLIsExcludedFromBackupKey` |
| External storage | `getExternalFilesDir` for secrets | App-group container for secrets |
| Logging | `Log.d` of secrets | `NSLog`/`print` of secrets |

#### B. MASVS-CRYPTO

MASVS refs: `data/masvs/MASVS-CRYPTO.md`, `MASVS-CRYPTO-1.md`, `MASVS-CRYPTO-2.md`
MASTG forward refs: MASTG-TEST-0011, MASTG-TEST-0013

| Check | Android signal | iOS signal |
|---|---|---|
| Weak algorithms | `Cipher.getInstance("DES")`, `MD5`, `SHA1` for security | `CC_MD5`, `CCCrypt(DES)` |
| Insecure mode | `AES/ECB` | `kCCOptionECBMode` |
| Hard-coded keys | `byte[] key = {...}` | `let key: [UInt8] = [...]` |
| Deterministic IV/nonce | `IvParameterSpec(new byte[16])` | `[UInt8](repeating: 0, count: 16)` |
| Weak RNG | `Random` for crypto | `arc4random` for cryptographic key material (use `SecRandomCopyBytes`) |

#### C. MASVS-AUTH

MASVS refs: `data/masvs/MASVS-AUTH.md`, `MASVS-AUTH-1.md`, `MASVS-AUTH-2.md`, `MASVS-AUTH-3.md`
MASTG forward refs: MASTG-TEST-0017, MASTG-TEST-0021

| Check | Android signal | iOS signal |
|---|---|---|
| Local auth bypass | JWT verified locally with hard-coded key | JWT decoded without signature verify |
| Biometric flags | `BIOMETRIC_WEAK` | `LAContext.evaluatePolicy(.deviceOwnerAuthentication)` without strong policy |
| OAuth public client | Missing PKCE | Missing PKCE |
| Token storage | Tokens in `SharedPreferences` plaintext | Tokens in `NSUserDefaults` plaintext |

#### D. MASVS-NETWORK

MASVS refs: `data/masvs/MASVS-NETWORK.md`, `MASVS-NETWORK-1.md`, `MASVS-NETWORK-2.md`
MASTG forward refs: MASTG-TEST-0024, MASTG-TEST-0026

| Check | Android signal | iOS signal |
|---|---|---|
| Cleartext traffic | `network_security_config` permits cleartext | `NSAllowsArbitraryLoads` true |
| Trust-all | Custom `TrustManager` accepting all | `URLSessionDelegate` accepts all `URLAuthenticationChallenge` |
| Pinning missing | No `CertificatePinner` (OkHttp) or no `Network Security Config` pins | No `NSPinnedDomains`; no manual `URLSession` validator |
| Mixed content | `WebView.setMixedContentMode(MIXED_CONTENT_ALWAYS_ALLOW)` | `WKWebView` configured to load mixed content |

#### E. MASVS-PLATFORM

MASVS refs: `data/masvs/MASVS-PLATFORM.md`, `MASVS-PLATFORM-1.md`, `MASVS-PLATFORM-2.md`, `MASVS-PLATFORM-3.md`
MASTG forward refs: MASTG-TEST-0030, MASTG-TEST-0033, MASTG-TEST-0035

| Check | Android signal | iOS signal |
|---|---|---|
| Exported components | `android:exported="true"` without `permission` | URL schemes registered, no validation |
| Intent / deep link | `Intent.getStringExtra` flowing to SQL/file/web | `application(_:open:)` without origin check |
| WebView bridge | `addJavascriptInterface` exposing native methods | `WKUserContentController` accepting any-origin messages |
| Screen capture | Missing `FLAG_SECURE` on sensitive activities | Missing background blur on app switch |
| Pasteboard | `ClipboardManager` for secrets | `UIPasteboard.general` for secrets |

#### F. MASVS-CODE

MASVS refs: `data/masvs/MASVS-CODE.md`, `MASVS-CODE-1.md`, `MASVS-CODE-2.md`, `MASVS-CODE-3.md`, `MASVS-CODE-4.md`
MASTG forward refs: MASTG-TEST-0040, MASTG-TEST-0042

| Check | Android signal | iOS signal |
|---|---|---|
| Outdated SDK | Old `minSdkVersion` / `compileSdkVersion` | Old deployment target |
| Vulnerable libs | Outdated `dependencies {}` versions | Outdated `Podfile.lock` / `Package.resolved` |
| Dangerous APIs | `Runtime.exec`, `WebView.evaluateJavascript` with user input | `NSTask`, `String(format:)` with user-controlled format |
| Deserialization | Untrusted `ObjectInputStream`, JSON `@JsonTypeInfo` polymorphism | `NSKeyedUnarchiver` of untrusted input |
| Error handling | Stack traces in release logs | `print(error)` to OSLog in release |

Cross-reference: defer detailed library CVE analysis to `sca-audit`.

## From `plays/mobile-code-review.md:201-208`

### 4. Diff-Specific Analysis (for PRs)

When invoked on a PR diff:

- Focus on changed lines plus 3 lines of context
- Verify that pinning, permissions, manifest flags, and crypto choices were not weakened (compare new vs. old)
- Verify that any new exported activity / URL scheme has matching permission / validation
- Verify that newly-added third-party SDKs do not silently bypass network-security config
