# Common Crawl Quick Reference

## CDX Index API

Discover which URLs have been crawled without downloading any page content.

**List available crawls** (newest first):
```
GET https://index.commoncrawl.org/collinfo.json
```

**Query the index** for a URL pattern:
```
GET https://index.commoncrawl.org/{crawl_id}-index
  ?url=www.dndbeyond.com/spells/*
  &output=json
  &fl=url,status,filename,offset,length   # fields to return
  &filter=status:200                       # only successful responses
  &collapse=urlkey                         # deduplicate by normalized URL
  &limit=100                              # optional cap
```

Key `fl` fields:
| Field | Description |
|---|---|
| `url` | The crawled URL |
| `status` | HTTP status code |
| `filename` | Path to the WARC file on S3 |
| `offset` | Byte offset of the WARC record within the file |
| `length` | Byte length of the WARC record |

## Fetching Page Content (WARC)

Once you have `filename`, `offset`, and `length` from the CDX API, fetch the actual archived HTML via an HTTP Range request:

```python
import io
import httpx
from warcio.archiveiterator import ArchiveIterator

s3_url = f"https://data.commoncrawl.org/{filename}"
byte_range = f"bytes={offset}-{offset + length - 1}"

with httpx.Client() as client:
    with client.stream("GET", s3_url, headers={"Range": byte_range}) as resp:
        # resp.status_code == 206 (Partial Content) on success
        raw = resp.read()

stream = ArchiveIterator(io.BytesIO(raw))
for record in stream:
    if record.rec_type == "response":
        html = record.content_stream().read().decode("utf-8", errors="replace")
```

WARC files are served from `data.commoncrawl.org` via CloudFront (fast, no auth needed).

## Rate Limiting

- **CDX API**: ~1–2 requests/second is polite. Add `time.sleep(1.5)` between prefix queries. Keep these sequential.
- **WARC fetches**: WARC files are served from CloudFront, which tolerates moderate concurrency. The scraper uses a `ThreadPoolExecutor` with 5 workers (configurable via `--warc-workers`) and no per-request sleep — the concurrency cap itself limits throughput to a safe level.
- Set a descriptive `User-Agent` header per RFC 7231 conventions.
