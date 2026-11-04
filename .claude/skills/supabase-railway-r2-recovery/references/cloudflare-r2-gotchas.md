<!-- Trimmed from https://github.com/cloudflare/skills @ 1f2cd0a19588e2c6197c91dd7c71729df1fb6156 skills/cloudflare/references/r2/gotchas.md (Apache-2.0): kept the title, intro, table header and the rows "Listing stops early…" (L7), "S3 authentication or signed URL fails" (L11), "Reads serve old or missing content" (L14), "Upload size … lifecycle behavior" (L15), and the closing line (L17); Workers-binding, multipart, CORS and local-dev rows dropped. Modified by FixFlow on 2026-11-04 (Apache-2.0 §4(b) notice: rows removed, this header added; no row text changed). Licence in ../LICENSE-cloudflare-skills. -->
# R2 Gotchas & Troubleshooting

Use the current references to diagnose the actual response or error instead of copying a workaround.

| Symptom or decision | What to check |
|---------------------|---------------|
| Listing stops early or escapes the intended prefix | Follow `truncated` and the returned cursor, retaining the original prefix, delimiter, and metadata options on subsequent requests. See the listing section of the [Workers API reference](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/index.md). |
| S3 authentication or signed URL fails | Verify credentials, endpoint, region, operation, signed headers, and expiry using [SDK setup](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/index.md), [authentication](https://developers.cloudflare.com/r2/api/tokens/index.md), and [presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/index.md). |
| Reads serve old or missing content after an update | Check the [consistency model and cache interactions](https://developers.cloudflare.com/r2/reference/consistency/index.md). |
| Upload size, metadata size, storage cost, or lifecycle behavior is unexpected | Fetch [limits](https://developers.cloudflare.com/r2/platform/limits/index.md), [pricing](https://developers.cloudflare.com/r2/pricing/index.md), [storage classes](https://developers.cloudflare.com/r2/buckets/storage-classes/index.md), and [object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/index.md). |

For other failures, start with [R2 troubleshooting](https://developers.cloudflare.com/r2/platform/troubleshooting/index.md) and [error codes](https://developers.cloudflare.com/r2/api/error-codes/index.md).
