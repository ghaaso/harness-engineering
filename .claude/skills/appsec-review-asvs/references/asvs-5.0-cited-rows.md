<!-- Trimmed from https://github.com/OWASP/secure-agent-playbook @ 65d4efd2cd0b081d52101e9708792b944e4ddebb plugins/code-security-skills/data/asvs/*.md (CC-BY-SA-4.0): kept sections V2.4 (2.4.1); V3.4 (3.4.1,3.4.2,3.4.3,3.4.4,3.4.5,3.4.6); V4.1 (4.1.3,4.1.5); V5.2 (5.2.1,5.2.4); V6.2 (6.2.1,6.2.3,6.2.4,6.2.5,6.2.10); V6.3 (6.3.1,6.3.2,6.3.3,6.3.5,6.3.8); V6.4 (6.4.1,6.4.6); V7.2 (7.2.1,7.2.2,7.2.4); V7.3 (7.3.1,7.3.2); V7.4 (7.4.1,7.4.2,7.4.3,7.4.5); V8.2 (8.2.1,8.2.2,8.2.3); V8.3 (8.3.1); V9.1 (9.1.1,9.1.2,9.1.3); V9.2 (9.2.1,9.2.3); V11.2 (11.2.4); V11.4 (11.4.2); V13.3 (13.3.1,13.3.2,13.3.4); V13.4 (13.4.2,13.4.5); V14.3 (14.3.1,14.3.3); V15.3 (15.3.1,15.3.4,15.3.6); V16.5 (16.5.1,16.5.3,16.5.4); requirement rows verbatim, frontmatter and prose dropped except the V6.3 level paragraph. Author: OWASP ASVS project; structured files by Erlend Oftedal and contributors (OWASP Agent Skills Project). -->

# OWASP ASVS 5.0 — requirement rows this skill cites

Licence: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). This file is an
adaptation (trimmed, not reworded) and is shared under the same licence; attribution in
`../LICENSE-owasp-asvs-masvs`. Upstream version note, verbatim from `data/asvs/README.md:3`:
"80 structured ASVS 5.0 section files sourced from the [OWASP Agent Skills Project](https://github.com/eoftedal/owasp-agent-skills-project) by Erlend Oftedal."
Level column: 1 = baseline, 2 = standard, 3 = advanced (`data/asvs/README.md`).

## V2.4 Anti-automation — `data/asvs/V2.4.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **2.4.1** | Verify that anti-automation controls are in place to protect against excessive calls to application functions that could lead to data exfiltration, garbage-data creation, quota exhaustion, rate-limit breaches, denial-of-service, or overuse of costly resources. | 2 |

## V3.4 Browser Security Mechanism Headers — `data/asvs/V3.4.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **3.4.1** | Verify that a Strict-Transport-Security header field is included on all responses to enforce an HTTP Strict Transport Security (HSTS) policy. A maximum age of at least 1 year must be defined, and for L2 and up, the policy must apply to all subdomains as well. | 1 |
| **3.4.2** | Verify that the Cross-Origin Resource Sharing (CORS) Access-Control-Allow-Origin header field is a fixed value by the application, or if the Origin HTTP request header field value is used, it is validated against an allowlist of trusted origins. When 'Access-Control-Allow-Origin: *' needs to be used, verify that the response does not include any sensitive information. | 1 |
| **3.4.3** | Verify that HTTP responses include a Content-Security-Policy response header field which defines directives to ensure the browser only loads and executes trusted content or resources, in order to limit execution of malicious JavaScript. As a minimum, a global policy must be used which includes the directives object-src 'none' and base-uri 'none' and defines either an allowlist or uses nonces or hashes. For an L3 application, a per-response policy with nonces or hashes must be defined. | 2 |
| **3.4.4** | Verify that all HTTP responses contain an 'X-Content-Type-Options: nosniff' header field. This instructs browsers not to use content sniffing and MIME type guessing for the given response, and to require the response's Content-Type header field value to match the destination resource. For example, the response to a request for a style is only accepted if the response's Content-Type is 'text/css'. This also enables the use of the Cross-Origin Read Blocking (CORB) functionality by the browser. | 2 |
| **3.4.5** | Verify that the application sets a referrer policy to prevent leakage of technically sensitive data to third-party services via the 'Referer' HTTP request header field. This can be done using the Referrer-Policy HTTP response header field or via HTML element attributes. Sensitive data could include path and query data in the URL, and for internal non-public applications also the hostname. | 2 |
| **3.4.6** | Verify that the web application uses the frame-ancestors directive of the Content-Security-Policy header field for every HTTP response to ensure that it cannot be embedded by default and that embedding of specific resources is allowed only when necessary. Note that the X-Frame-Options header field, although supported by browsers, is obsolete and may not be relied upon. | 2 |

## V4.1 Generic Web Service Security — `data/asvs/V4.1.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **4.1.3** | Verify that any HTTP header field used by the application and set by an intermediary layer, such as a load balancer, a web proxy, or a backend-for-frontend service, cannot be overridden by the end-user. Example headers might include X-Real-IP, X-Forwarded-*, or X-User-ID. | 2 |
| **4.1.5** | Verify that per-message digital signatures are used to provide additional assurance on top of transport protections for requests or transactions which are highly sensitive or which traverse a number of systems. | 3 |

## V5.2 File Upload and Content — `data/asvs/V5.2.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **5.2.1** | Verify that the application will only accept files of a size which it can process without causing a loss of performance or a denial of service attack. | 1 |
| **5.2.4** | Verify that a file size quota and maximum number of files per user are enforced to ensure that a single user cannot fill up the storage with too many files, or excessively large files. | 3 |

## V6.2 Password Security — `data/asvs/V6.2.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **6.2.1** | Verify that user set passwords are at least 8 characters in length although a minimum of 15 characters is strongly recommended. | 1 |
| **6.2.3** | Verify that password change functionality requires the user's current and new password. | 1 |
| **6.2.4** | Verify that passwords submitted during account registration or password change are checked against an available set of, at least, the top 3000 passwords which match the application's password policy, e.g. minimum length. | 1 |
| **6.2.5** | Verify that passwords of any composition can be used, without rules limiting the type of characters permitted. There must be no requirement for a minimum number of upper or lower case characters, numbers, or special characters. | 1 |
| **6.2.10** | Verify that a user's password stays valid until it is discovered to be compromised or the user rotates it. The application must not require periodic credential rotation. | 2 |

## V6.3 General Authentication Security — `data/asvs/V6.3.md`

This section contains general requirements for the security of authentication mechanisms as well as setting out the different expectations for levels. L2 applications must force the use of multi-factor authentication (MFA). L3 applications must use hardware-based authentication, performed in an attested and trusted execution environment (TEE). This could include device-bound passkeys, eIDAS Level of Assurance (LoA) High enforced authenticators, authenticators with NIST Authenticator Assurance Level 3 (AAL3) assurance, or an equivalent mechanism.

| # | Description | Level |
| :---: | :--- | :---: |
| **6.3.1** | Verify that controls to prevent attacks such as credential stuffing and password brute force are implemented according to the application's security documentation. | 1 |
| **6.3.2** | Verify that default user accounts (e.g., "root", "admin", or "sa") are not present in the application or are disabled. | 1 |
| **6.3.3** | Verify that either a multi-factor authentication mechanism or a combination of single-factor authentication mechanisms, must be used in order to access the application. For L3, one of the factors must be a hardware-based authentication mechanism which provides compromise and impersonation resistance against phishing attacks while verifying the intent to authenticate by requiring a user-initiated action (such as a button press on a FIDO hardware key or a mobile phone). Relaxing any of the considerations in this requirement requires a fully documented rationale and a comprehensive set of mitigating controls. | 2 |
| **6.3.5** | Verify that users are notified of suspicious authentication attempts (successful or unsuccessful). This may include authentication attempts from an unusual location or client, partially successful authentication (only one of multiple factors), an authentication attempt after a long period of inactivity or a successful authentication after several unsuccessful attempts. | 3 |
| **6.3.8** | Verify that valid users cannot be deduced from failed authentication challenges, such as by basing on error messages, HTTP response codes, or different response times. Registration and forgot password functionality must also have this protection. | 3 |

## V6.4 Authentication Factor Lifecycle and Recovery — `data/asvs/V6.4.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **6.4.1** | Verify that system generated initial passwords or activation codes are securely randomly generated, follow the existing password policy, and expire after a short period of time or after they are initially used. These initial secrets must not be permitted to become the long term password. | 1 |
| **6.4.6** | Verify that administrative users can initiate the password reset process for the user, but that this does not allow them to change or choose the user's password. This prevents a situation where they know the user's password. | 3 |

## V7.2 Fundamental Session Management Security — `data/asvs/V7.2.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **7.2.1** | Verify that the application performs all session token verification using a trusted, backend service. | 1 |
| **7.2.2** | Verify that the application uses either self-contained or reference tokens that are dynamically generated for session management, i.e. not using static API secrets and keys. | 1 |
| **7.2.4** | Verify that the application generates a new session token on user authentication, including re-authentication, and terminates the current session token. | 1 |

## V7.3 Session Timeout — `data/asvs/V7.3.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **7.3.1** | Verify that there is an inactivity timeout such that re-authentication is enforced according to risk analysis and documented security decisions. | 2 |
| **7.3.2** | Verify that there is an absolute maximum session lifetime such that re-authentication is enforced according to risk analysis and documented security decisions. | 2 |

## V7.4 Session Termination — `data/asvs/V7.4.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **7.4.1** | Verify that when session termination is triggered (such as logout or expiration), the application disallows any further use of the session. For reference tokens or stateful sessions, this means invalidating the session data at the application backend. Applications using self-contained tokens will need a solution such as maintaining a list of terminated tokens, disallowing tokens produced before a per-user date and time or rotating a per-user signing key. | 1 |
| **7.4.2** | Verify that the application terminates all active sessions when a user account is disabled or deleted (such as an employee leaving the company). | 1 |
| **7.4.3** | Verify that the application gives the option to terminate all other active sessions after a successful change or removal of any authentication factor (including password change via reset or recovery and, if present, an MFA settings update). | 2 |
| **7.4.5** | Verify that application administrators are able to terminate active sessions for an individual user or for all users. | 2 |

## V8.2 General Authorization Design — `data/asvs/V8.2.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **8.2.1** | Verify that the application ensures that function-level access is restricted to consumers with explicit permissions. | 1 |
| **8.2.2** | Verify that the application ensures that data-specific access is restricted to consumers with explicit permissions to specific data items to mitigate insecure direct object reference (IDOR) and broken object level authorization (BOLA). | 1 |
| **8.2.3** | Verify that the application ensures that field-level access is restricted to consumers with explicit permissions to specific fields to mitigate broken object property level authorization (BOPLA). | 2 |

## V8.3 Operation Level Authorization — `data/asvs/V8.3.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **8.3.1** | Verify that the application enforces authorization rules at a trusted service layer and doesn't rely on controls that an untrusted consumer could manipulate, such as client-side JavaScript. | 1 |

## V9.1 Token Source and Integrity — `data/asvs/V9.1.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **9.1.1** | Verify that self-contained tokens are validated using their digital signature or MAC to protect against tampering before accepting the token's contents. | 1 |
| **9.1.2** | Verify that only algorithms on an allowlist can be used to create and verify self-contained tokens, for a given context. The allowlist must include the permitted algorithms, ideally only either symmetric or asymmetric algorithms, and must not include the 'None' algorithm. If both symmetric and asymmetric must be supported, additional controls will be needed to prevent key confusion. | 1 |
| **9.1.3** | Verify that key material that is used to validate self-contained tokens is from trusted pre-configured sources for the token issuer, preventing attackers from specifying untrusted sources and keys. For JWTs and other JWS structures, headers such as 'jku', 'x5u', and 'jwk' must be validated against an allowlist of trusted sources. | 1 |

## V9.2 Token Content — `data/asvs/V9.2.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **9.2.1** | Verify that, if a validity time span is present in the token data, the token and its content are accepted only if the verification time is within this validity time span. For example, for JWTs, the claims 'nbf' and 'exp' must be verified. | 1 |
| **9.2.3** | Verify that the service only accepts tokens which are intended for use with that service (audience). For JWTs, this can be achieved by validating the 'aud' claim against an allowlist defined in the service. | 2 |

## V11.2 Secure Cryptography Implementation — `data/asvs/V11.2.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **11.2.4** | Verify that all cryptographic operations are constant-time, with no 'short-circuit' operations in comparisons, calculations, or returns, to avoid leaking information. | 3 |

## V11.4 Hashing and Hash-based Functions — `data/asvs/V11.4.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **11.4.2** | Verify that passwords are stored using an approved, computationally intensive, key derivation function (also known as a "password hashing function"), with parameter settings configured based on current guidance. The settings should balance security and performance to make brute-force attacks sufficiently challenging for the required level of security. | 2 |

## V13.3 Secret Management — `data/asvs/V13.3.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **13.3.1** | Verify that a secrets management solution, such as a key vault, is used to securely create, store, control access to, and destroy backend secrets. These could include passwords, key material, integrations with databases and third-party systems, keys and seeds for time-based tokens, other internal secrets, and API keys. Secrets must not be included in application source code or included in build artifacts. For an L3 application, this must involve a hardware-backed solution such as an HSM. | 2 |
| **13.3.2** | Verify that access to secret assets adheres to the principle of least privilege. | 2 |
| **13.3.4** | Verify that secrets are configured to expire and be rotated based on the application's documentation. | 3 |

## V13.4 Unintended Information Leakage — `data/asvs/V13.4.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **13.4.2** | Verify that debug modes are disabled for all components in production environments to prevent exposure of debugging features and information leakage. | 2 |
| **13.4.5** | Verify that documentation (such as for internal APIs) and monitoring endpoints are not exposed unless explicitly intended. | 2 |

## V14.3 Client-side Data Protection — `data/asvs/V14.3.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **14.3.1** | Verify that authenticated data is cleared from client storage, such as the browser DOM, after the client or session is terminated. The 'Clear-Site-Data' HTTP response header field may be able to help with this but the client-side should also be able to clear up if the server connection is not available when the session is terminated. | 1 |
| **14.3.3** | Verify that data stored in browser storage (such as localStorage, sessionStorage, IndexedDB, or cookies) does not contain sensitive data, with the exception of session tokens. | 2 |

## V15.3 Defensive Coding — `data/asvs/V15.3.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **15.3.1** | Verify that the application only returns the required subset of fields from a data object. For example, it should not return an entire data object, as some individual fields should not be accessible to users. | 1 |
| **15.3.4** | Verify that all proxying and middleware components transfer the user's original IP address correctly using trusted data fields that cannot be manipulated by the end user, and the application and web server use this correct value for logging and security decisions such as rate limiting, taking into account that even the original IP address may not be reliable due to dynamic IPs, VPNs, or corporate firewalls. | 2 |
| **15.3.6** | Verify that JavaScript code is written in a way that prevents prototype pollution, for example, by using Set() or Map() instead of object literals. | 2 |

## V16.5 Error Handling — `data/asvs/V16.5.md`

| # | Description | Level |
| :---: | :--- | :---: |
| **16.5.1** | Verify that a generic message is returned to the consumer when an unexpected or security-sensitive error occurs, ensuring no exposure of sensitive internal system data such as stack traces, queries, secret keys, and tokens. | 2 |
| **16.5.3** | Verify that the application fails gracefully and securely, including when an exception occurs, preventing fail-open conditions such as processing a transaction despite errors resulting from validation logic. | 2 |
| **16.5.4** | Verify that a "last resort" error handler is defined which will catch all unhandled exceptions. This is both to avoid losing error details that must go to log files and to ensure that an error does not take down the entire application process, leading to a loss of availability. | 3 |

