# snap.mjs (unit U3a): spec

Source of truth for formats, codes and library calls: `CONTRACT.md` §1 (CLI, output, exits), §2.1
(`.snapshots/` row), §3.13 (snapshot metadata, `by-url`, `urlKey`), §3.20 (thresholds), §4
(library), §6 (the only script with network), decision 36 (unverifiable is exit 2).

## Purpose
Store a source's own bytes and its extracted text by sha256 so that every later check reads the
same version (R25, problem N8 non-repeatable read). It is the fetcher of the trusted base and is
itself a web reader, so it is capped by scheme, size, time and address (G2). It never judges a
card: witness.mjs does. Without the owner's word F5 it fetches nothing.

## Command line
```
node <root>/tcb/scripts/snap.mjs --root <dir> --ce <n> (--url <u> | --new) [--now <iso>] [--dry-run]
```
- `--root` (required), `--ce` (required: it writes `.snapshots/`), exactly one of `--url <u>` (one
  URL, always fetched, a refetch included) or `--new` (every committed card's URL that has no
  `by-url` line yet). Both or neither, an unknown flag or a malformed `--now`: exit 66.
- `--now` overrides the edge clock (`retrieved_at` only; nothing counted depends on it).

## Reads
- `tcb/thresholds.json`: `f5_given`, `fetch_max_bytes`, `fetch_timeout_ms`, `allow_loopback`,
  `fetch_max_redirects` (5, guess).
- `run/coord.json` (ce check). `--new`: every `store/objects/c_*.json` through `lib.getObject`
  (`source.url`), and `.snapshots/by-url/*.jsonl` to skip URLs already tried.
- The network: http(s) only, as below. No cookie jar, no environment proxy, no other host file.

## Writes (all under `<root>/.snapshots/`, contract names)
- `raw/<raw_sha>`: the response body after content decoding (gzip, deflate, br), exclusive create
  (`identical` = no-op).
- `text/<text_sha>`: the extracted text, UTF-8, exclusive create.
- `meta/<raw_sha>.json` [snapshot-meta]: exclusive create; if a file of that name exists with other
  bytes (same bytes from another URL or a later retrieval) the first one is kept and that is not an
  error: meta describes the first retrieval of those bytes (CONTRACT §3.13).
- `by-url/<urlKey>.jsonl`: one line per retrieval `{schema_version, raw_sha: 64 hex|null,
  retrieved_at, source_changed, reason?}` appended under `run/run.lock` with `lib.appendJsonl`; a
  retrieval that produced no stored bytes has `raw_sha: null` and its `reason`. `urlKey =
  lib.urlKey(u)` = `sha256hex(new URL(u).href)`, the same key witness, guard-hook and replace use.
- No ledger line: §3.7 has no kind for a fetch, and snap is not a check (witness is).

## Steps
1. Parse arguments (66). Read thresholds. `f5_given` not `true`: exit 2 `f5-not-given`, nothing
   fetched or written, `result.urls` lists what would have been fetched.
2. `lib.checkCe(root, ce)` without the lock (64 / 2 / 67 before any network use).
3. Build the URL list: `--url` → that one; `--new` → distinct `source.url` of every `c_` object
   with no `by-url` file, sorted by `urlKey`. A `c_` file whose bytes do not hash to its name: exit
   3 `object-mismatch`, nothing fetched.
4. `--dry-run`: print the list with `dry_run: true`, fetch nothing, exit as step 7 would for an
   empty run (0).
5. Per URL, in order, one at a time, outside the lock:
   a. `new URL(u)`; scheme not `http:`/`https:` → reason `bad-scheme` (no request).
   b. Resolve the host with `dns.lookup(all)`; every address is checked against one `net.BlockList`
      built once: IPv4 0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.0.0/24, 192.0.2/24,
      192.168/16, 198.18/15, 198.51.100/24, 203.0.113/24, 224/4, 240/4 (incl. 255.255.255.255); IPv6
      ::/128, ::1/128, fc00::/7, fe80::/10, ff00::/8, 2001:db8::/32, 2002::/16 (6to4), 64:ff9b::/96
      and 64:ff9b:1::/48 (NAT64), and ::ffff:0:0/96 (IPv4-mapped); an IPv6 address that embeds an IPv4
      one (mapped, NAT64, 6to4) is also checked by its embedded IPv4 address. Any listed address →
      `private-address`. Loopback (127/8, ::1 and their mapped forms) only is allowed when
      `allow_loopback` is true (tests). Each request uses its own `http.Agent`/`https.Agent` (never the
      global agent; `keepAlive: false`) whose `lookup` returns only the checked address, so a second
      DNS answer cannot redirect it; no proxy setting is read.
   c. Request: GET, headers `User-Agent: tcb-snap/1`, `Accept`, `Accept-Encoding`; no `Cookie`, any
      `Set-Cookie` ignored; redirects followed by hand, each hop re-checked from (a); more than
      `fetch_max_redirects` → `too-many-redirects`.
   d. One deadline of `fetch_timeout_ms` over all hops and the body → `timeout`. Body bytes (after
      decoding) above `fetch_max_bytes` → abort, `too-large`, nothing stored.
   e. Status 401, 403, 407, 429, 451 → `blocked`; another non-2xx → `http-error`; neither stores
      bytes.
   f. 2xx: classify by `Content-Type` and bytes. `%PDF-` prefix or `application/pdf` → store raw,
      reason `pdf`, no text. `text/html` or `application/xhtml+xml` → html-v1 below. `text/plain`
      → the decoded text. Anything else → store raw, `unsupported-type`. Text with no
      non-whitespace character → `empty-text`, no text file.
   g. html-v1: decode by the header charset, else `<meta charset>`, else UTF-8 (`TextDecoder`,
      replacement on bad bytes); drop comments and the contents of `script`, `style`, `noscript`,
      `template`, `svg`; inline tags (a, abbr, b, cite, code, em, i, mark, q, s, small, span,
      strong, sub, sup, u) removed with nothing, every other tag replaced by one space (block tags
      by `\n`); decode numeric references and the fixed named-entity table in the source; collapse
      runs of spaces and tabs, keep single newlines. No further normalisation (witness does it).
6. Take `run/run.lock` (`lib.withRunLock` with `ce`); write raw, text, meta, then append the
   `by-url` line. `source_changed` = an earlier line of that file has a non-null `raw_sha`
   different from this one.
7. Exit 0 when every URL stored text; 2 `unverifiable` when at least one ended without text (any
   reason above; not-run under R40, never a definite no, decision 36); `--new` with no URL to fetch
   is 0. `result = {urls: [{url, url_key, raw_sha?, text_sha?, http_status?, content_type?, reason?,
   source_changed, created}], n, n_text, n_unverifiable}`.

## Exit codes
0 stored with text (or nothing to do); 2 unverifiable (one or more URLs without text), F5 not given,
`no-coordinator`, a missing threshold; 3 a `c_` object whose bytes differ from its name; 64; 66;
67; 70; 75. Exit 1 is not used.

## Rules implemented
R25 (snapshot by script, needs F5, `source_changed` not mismatch), R13 (only writer of
`.snapshots/`), R24 (snapshots are trusted, the web is not), R40 (unfetchable = not-run downstream,
never passed), §6 boundary (only script with network), problems N8 and G2, G3 (PDF share counted).

## Behaviours (tests start their own `http.createServer` on 127.0.0.1 with `allow_loopback: true`)
- T1 `f5_given: false`: exit 2 `f5-not-given`, the server receives no request, `.snapshots/` empty.
- T2 An HTML page with a `<script>` and a `<style>` block: exit 0; `raw/<sha>` equals the served
  bytes; `text/<sha>` holds the visible words and none of the script's; meta has `http_status` 200,
  `extractor` `html-v1`, `bytes`, both shas; one `by-url` line with `source_changed: false`.
- T3 `<td>a</td><td>b</td>` extracts as `a b`; `x<b>y</b>z` as `xyz`; `&amp; &#8211; &#x2014;`
  decode; a `windows-1252` charset header decodes byte 0x93 as a left double quote.
- T4 The same URL fetched twice with the same bytes: second run exit 0, `created:false`, no new raw
  or text file, a second `by-url` line with `source_changed: false`.
- T5 The same URL served different bytes on the second fetch: two raw files, the second `by-url`
  line has `source_changed: true`; exit 0 (a change is not a failure).
- T6 Two URLs serving identical bytes: one raw file, one meta file (the first URL's), two `by-url`
  files; exit 0.
- T7 `application/pdf` (or a `%PDF-` body sent as `application/octet-stream`): raw stored, meta
  `reason: pdf`, no text file, exit 2.
- T8 An HTML body of only tags and whitespace: meta `reason: empty-text`, no text file, exit 2.
- T9 Status 403 → `blocked`, status 500 → `http-error`: no raw file, a `by-url` line with
  `raw_sha: null` and the reason, exit 2.
- T10 A body larger than `fetch_max_bytes` (set to 1024 in the test's thresholds): `too-large`,
  nothing stored, exit 2; a gzip body that inflates past the cap is refused the same way.
- T11 A server that never answers, `fetch_timeout_ms: 200`: `timeout`, exit 2, run ends promptly.
- T12 Six chained redirects with `fetch_max_redirects: 5`: `too-many-redirects`, exit 2.
- T13 `allow_loopback: false` and a URL on 127.0.0.1: `private-address`, the server gets no request.
- T14 A redirect from the test server to `http://10.0.0.1/` (and to `http://[::ffff:127.0.0.1]/`
  with loopback disallowed for that hop's check): `private-address`, no request to the target. A
  table-driven check of the address filter (no network): `10.1.2.3`, `100.64.0.1`, `198.18.0.1`,
  `0.0.0.0`, `255.255.255.255`, `[::ffff:10.0.0.1]`, `[64:ff9b::a00:1]` (NAT64 of 10.0.0.1),
  `[2002:a00:1::]` (6to4 of 10.0.0.1), `[fd00::1]`, `[fe80::1]` → refused; `93.184.216.34` and
  `[2606:2800:220:1::]` → allowed.
- T14b Each request is made through its own agent (a spy shows `http.globalAgent` unused) whose
  `lookup` answers only the checked address.
- T15 `--url ftp://x/` and `--url file:///c:/x`: `bad-scheme`, no network use, exit 2.
- T16 The server sees no `Cookie` header on a second request after answering with `Set-Cookie`.
- T17 `--new` with two committed cards citing one URL and one citing another (one already has a
  `by-url` file): exactly one request, for the untried URL.
- T18 `--new` when a `c_` object file was edited: exit 3 `object-mismatch`, no request made.
- T19 `--ce 2` with `coord.json` ce 1: exit 64, no request, nothing written.
- T20 `run/run.lock` held by a live process the test spawned: exit 75 after the retries; no raw,
  text, meta or `by-url` file is written (every write is inside the lock, step 6).
- T21 A torn last line in `by-url/<sha>.jsonl`: it moves to `<file>.corrupt` and the new line is
  appended whole.
- T22 `--dry-run --new`: lists the URLs, `dry_run: true`, no request, no file, no lock file created.
- T23 `--url` and `--new` together, or neither: exit 66 before any read.
- T24 Every run prints one stdout JSON line of §1.3 shape; `url_key` equals `lib.urlKey(u)` =
  `sha256hex(new URL(u).href)` (so `HTTP://Example.com` and `http://example.com/` share one key).

## Cannot be tested without the app
- Real web pages (needs-app 10, F5): extraction quality, paywalls, challenge pages that answer 200
  with a block page (recorded as text and caught later as `quote-missing`), real PDFs.
- Whether a real run's `allow_loopback` is false is checked by selftest's threshold check, not here.
