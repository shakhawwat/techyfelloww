# Local attachment scanning

## Root cause and recovery

The previous development backend had no `MALWARE_SCANNER_HOST`, no clamd service, no persistent scan worker and no scan queue. Its records contained `Scanner is not configured`; reads returned 409 and the UI's Retry media only repeated that read. No evidence of scan timeouts or a stalled scanner existed because no scanner was running.

`docker-compose.scan.local.yml` adds the official ClamAV image pinned to a digest, private TCP port 3310 and persistent signature storage. It uses the image's clamd health check and FreshClam updater. See the [official Docker documentation](https://github.com/Cisco-Talos/clamav-docker/blob/main/clamav/README-alpine.md). Uploaded bytes stay in MongoDB; the worker streams the exact stored bytes through clamd INSTREAM. It does not need a shared filesystem or send content to an external service.

For this local development stack (port 8081), from the project root:

```bash
export COMPOSE_PROJECT_NAME=techyfellow-dev
export COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml:docker-compose.run.local.yml:docker-compose.scan.local.yml
docker compose up -d --no-deps --wait clamav
docker compose up -d --no-deps --wait backend
```

Only the local ClamAV and development backend are started/recreated. Existing MongoDB/frontend/nginx are reused; these commands do not deploy. The second command also starts the embedded attachment worker, enabled with `ATTACHMENT_SCAN_WORKER_ENABLED=true`. There is no separate worker daemon to start. The backend image must contain the current source (the development mount already does). First scanner startup can take several minutes; keep the signature volume. Do not publish clamd's unauthenticated TCP port to the host or Internet.

Useful local checks:

```bash
docker compose ps clamav backend
docker compose logs --tail 40 clamav
docker compose logs --tail 40 backend
```

Scan logs include only attachment ID, collection, verdict, attempt and retry scheduling. Never log file bytes or credentials. For non-Docker operation, supply the usual backend environment plus `MALWARE_SCANNER_HOST`, `MALWARE_SCANNER_PORT=3310`, `ATTACHMENT_SCAN_WORKER_ENABLED=true`, then `npm --prefix backend run build` and `npm --prefix backend start`. Reach clamd through a trusted private address; the local Compose service is intentionally not host-published.

## States and retries

Attachment records themselves are the durable queue: no Redis or extra messaging infrastructure. The worker runs every two seconds, leases work atomically for 60 seconds and scans at most four items per tick. Expired leases are recoverable after restart. Sockets time out after 15 seconds. New uploads use an immediate scan fast path; unsuccessful or unavailable checks persist for this worker. Transient failures get five worker attempts with 5/10/20/40-second backoff; attempts stop after exhaustion. Legacy missing states and legacy `failed` records are picked up automatically, as are legacy clean records without a stored-content hash. Pending jobs stay pending if configuration is absent.

States are `pending`, `scanning`, `clean`, `infected`, and `scan_failed`. Manual moderation quarantine remains an independent hold. Only a successful verdict for the exact stored content sets `clean` and a SHA-256 `scannedHash`. Authorized downloads verify that hash and recheck quarantine/state. Missing/mismatched hashes queue a new verification and deny the download. Infected and manually quarantined files are never automatically retried or released; reversing a manual hold cannot override an infected verdict.

Authenticated, authorized participants can GET `.../media/:id/status` and POST `.../media/:id/retry` with an empty JSON body and the existing CSRF/session handling. The support route is `/support/media/:id`; direct media uses `/account/direct/media/:id`. Admin moderation has corresponding grant-bound endpoints under its review's files path. A retry queues a scan, never just reloads the file. Concurrent retry clicks reuse the same attachment and job. Failed cycles can be explicitly retried at most once every 30 seconds per attachment, and direct retries are account rate-limited. No message is recreated and existing send idempotency remains intact.

The UI shows Checking attachment, a failed check with Retry check, or Attachment blocked. It polls only while pending/scanning or an automatic retry is scheduled, pauses work when hidden, backs off and aborts/revokes private blobs on unmount. A clean verdict enables the existing image/PDF/audio renderer. Private authorization applies independently to status, retry and download, including separate member/admin sessions.

## Verification

The existing development records named `camera.jpg` (five records across support and direct messaging) and `banner2.png` (one direct record) were scanned by the real local ClamAV service. Each has a clean verdict and a hash matching the exact stored bytes; existing message binding was retained. No messages or attachments were deleted or re-uploaded.

`backend/test/attachment-scans.integration.test.mjs` verifies queue leases, pending/scanning/clean/infected/scan_failed, bounded retries/backoff, exact-byte release, hash mismatch rejection, manual quarantine, status/retry/download authorization and message preservation using isolated accounts/database and a protocol fixture. Set `TECHYFELLOW_TEST_CLAMAV_HOST` to the private clamd address to additionally run clean and harmless EICAR test-signature checks against the real scanner. No real member content is used for infected tests. This verifies the configured test signature; it does not promise complete malware detection.
