# recheck:X-06

lane=X-06 tool_status=ok checks=9

- X06-F01 ON_PAGE — https://code.claude.com/docs/en/data-usage
    quote: This data includes all user prompts and model outputs, encrypted in transit via TLS 1.2+. ... Anthropic does not train generative models using code or prompts sent to Claude Code under commercial terms
    note: Consumer 'when this setting is on' wording also present. Commercial list also names Claude Gov.
- X06-F02 ON_PAGE — https://code.claude.com/docs/en/data-usage ; https://code.claude.com/docs/en/zero-data-retention
    quote: If a session is flagged for a policy violation, Anthropic may retain the associated inputs and outputs for up to 2 years
    note: 5y/30d consumer and 30d commercial on data-usage. ZDR is per-organization, not in standard Enterprise, requires Anthropic enablement. Law/misuse exception on ZDR page.
- X06-F04 PARTIAL — https://platform.claude.com/docs/en/manage-claude/api-and-data-retention ; https://code.claude.com/docs/en/zero-data-retention
    quote: Fable 5.1, Mythos 5.1, Fable 5, and Mythos 5 are designated Covered Models ... require 30-day data retention; ZDR is therefore not available for any of them unless expressly authorized by Anthropic.
    note: Covered Models, 30-day retention and the non-default-workspace route (Default Workspace follows org setting) are all supported. The claim about the owner's Fable-as-orchestrator method is an inference from the memory index, not on either page. The ZDR page itself names only Fable 5.1 and Fable 5.
- X06-F05 ON_PAGE — https://code.claude.com/docs/en/claude-directory#application-data
    quote: Transcripts and history are not encrypted at rest. ... If a tool reads a .env file or a command prints a credential, that value is written to projects/<project>/<session>.jsonl.
    note: 30-day default, min 1, tool-results/ spill dir, CLAUDE_CODE_SKIP_PROMPT_HISTORY, deny rules all present. The final 'regardless of store protection' sentence is inference.
- X06-F10 ON_PAGE — https://raw.githubusercontent.com/gitleaks/gitleaks/master/config/gitleaks.toml
    quote: minVersion = "v8.25.0"
    note: Verified by grepping the downloaded file: 222 rules. Present: generic-api-key, private-key, jwt, jwt-base64, curl-auth-header, curl-auth-user, sentry-access/org/user-token, cloudflare-api-key/global-api-key/origin-ca-key. No ids or text matching postgres, supabase, railway. The only bearer rule is twitter-bearer-token. No R2 rule.
- X06-F11 ON_PAGE — https://arxiv.org/html/2307.00714v1
    quote: Among the nine tools, five tools have a precision score of less than 7%.
    note: Confirmed: 818 repos, 97,479 candidates, 15,084 true. Gitleaks 46% precision, 88% recall (86% case 1), F1 60%. TruffleHog 6% precision, recall 31%/52%. GitHub Secret Scanner 75% precision, 6% recall. detect-secrets excluded (fails plain-text reporting criterion). Tool version numbers, the submission date and FP-cause wording were not checked in the summary.
- X06-F12 ON_PAGE — https://github.com/trufflesecurity/trufflehog ; main.go ; go.mod ; releases/latest
    quote: Since v3.0, TruffleHog is released under a AGPL 3 license ... no guarantees can be made on the stability of the public APIs at this time.
    note: Confirmed: CLA, --no-verification, --no-update, overseer, sentry-go v0.32.0, OTel and Prometheus in go.mod, main.go has no Sentry reference and no disable env var, v3.99.7 published 2026-10-24, windows_amd64.tar.gz 77,059,841 bytes. The exact phrase 'Credential confirmed as valid and active by API testing' was not seen; the page only says verification tests credentials against the service API.
- X06-F14 PARTIAL — https://presidio.dataprivacystack.org/supported_entities/ ; installation ; phone_recognizer.py ; pyproject.toml ; presidio-research
    quote: Note that this is using the vanilla Presidio, and the results aren't very accurate.
    note: Supported: no Pakistan/CNIC entity (India, Philippines etc. listed), PhoneRecognizer default regions US,GB,DE,FR,IL,IN,CA,BR with SCORE 0.4, analyzer 2.2.366, Python >=3.11,<3.15, spacy/phonenumbers/tldextract/pydantic, en_core_web_lg, ghcr.io/data-privacy-stack images, waitress on Windows only, presidio-research has no baseline numbers. Not supported on fetched pages: the 'no guarantee Presidio will find all sensitive information' sentence (absent from the installation page), the MIT licence and the no-telemetry or no-Node-SDK statements (not checked on these pages). The installation page does not mention Windows or telemetry. The tldextract network point is flagged as unverified in the fact itself.
- X06-F16 ON_PAGE — https://github.com/secretlint/secretlint ; releases/latest ; preset-recommend README ; core index.ts ; node README
    quote: maskSecrets: true hides detected secret values in lint messages.
    note: Confirmed: MIT, v13.1.0 published 2026-10-26 with secretlint-13.1.0-windows-x64.exe, preset lists 28 rules including all named ones, createEngine and executeOnFiles in node README, core exports lintSource with the stated source/options fields and returns messages. Main README documents the CLI only and no telemetry mention. The 'core README has no API docs' point was not separately fetched.
