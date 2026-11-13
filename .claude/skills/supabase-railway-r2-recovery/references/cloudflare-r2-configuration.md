<!-- Trimmed from https://github.com/cloudflare/skills @ 1f2cd0a19588e2c6197c91dd7c71729df1fb6156 skills/cloudflare/references/r2/configuration.md (Apache-2.0): kept the title, intro, table header, the rows "Create S3 credentials and scope permissions" (L9) and "Set expiration, storage transitions, or incomplete-upload cleanup" (L13), and the closing paragraph (L19); Worker-binding, CORS, storage-class, event and public-bucket rows dropped. Modified by FixFlow on 2026-11-04 (Apache-2.0 §4(b) notice: rows removed, this header added; no row text changed). Licence in ../LICENSE-cloudflare-skills. -->
# R2 Configuration

Fetch the task's documentation before editing Wrangler configuration or bucket settings.

| Task | Current documentation |
|------|-----------------------|
| Create S3 credentials and scope permissions | [R2 authentication](https://developers.cloudflare.com/r2/api/tokens/index.md) |
| Set expiration, storage transitions, or incomplete-upload cleanup | [Object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/index.md) |

Choose the development bucket deliberately: a remote binding accesses real data. Scope S3 credentials to the required buckets and operations; Workers bindings use their own access mechanism. Review lifecycle prefixes and retention needs before applying deletion rules, and evaluate retrieval and minimum-storage charges before choosing a storage class.
