# Local full-system run

The implemented system is running as Compose project `techyfellow-dev` at **http://localhost:8081**, with frontend, backend, private MongoDB replica set, Nginx and the notification worker. MongoDB initialization completed with exit 0. The persistent volume is `techyfellow-dev_mongodb-data`; no previous volumes or unrelated services were removed. An unrelated application already occupies localhost:8080.

## Academy admin route and checkout

Open **http://localhost:8081/admin/academy** and sign in with an existing authorized admin account. The existing Academy navigation link uses this route. `frontend/src/app/admin/(protected)/academy/page.tsx` renders `AcademyAdminWorkspace`, with Courses and Scholarship codes tabs inside the existing admin session and course-edit authorization gates.

Port **3000** currently belongs to the separate `website/digital service` Compose project (`techyfellow-frontend-1`), whose built image has no source bind mount and no Academy admin route. Rebuilding this checkout does not update that application. This checkout's `techyfellow-dev-frontend-1` mounts its `frontend/src` live and serves through Nginx on port 8081. Do not change the other application's sidebar or containers to resolve this mismatch.

If this checkout's development server needs restarting, run from this directory:

```sh
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.run.local.yml restart frontend
```

From the project root:

```sh
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.run.local.yml config --quiet
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.run.local.yml up -d --build --wait --wait-timeout 180
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.run.local.yml exec -T backend npm run db:indexes
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.run.local.yml ps --all
```

The ignored `docker-compose.run.local.yml` is retained for this local run. It binds Nginx only to `127.0.0.1:8081`, sets both backend and worker `EMAIL_ENABLED=false`, empties their provider/sender/recipient/admin-link settings and allowlists `http://localhost:3000,http://localhost:8081`. Neither MongoDB nor application ports are published to the host. It contains no credentials. To reproduce it on another machine:

```yaml
services:
  backend:
    environment:
      EMAIL_ENABLED: "false"
      RESEND_API_KEY: ""
      EMAIL_FROM: ""
      LEAD_NOTIFICATION_TO: ""
      ADMIN_BASE_URL: ""
      AUTH_ALLOWED_ORIGINS: http://localhost:3000,http://localhost:8081
  notification-worker:
    environment:
      EMAIL_ENABLED: "false"
      RESEND_API_KEY: ""
      EMAIL_FROM: ""
      LEAD_NOTIFICATION_TO: ""
      ADMIN_BASE_URL: ""
      AUTH_ALLOWED_ORIGINS: http://localhost:3000,http://localhost:8081
  nginx:
    ports: !override
      - "127.0.0.1:8081:80"
```

The worker shares the backend codebase and existing MongoDB. Its development command is `npm run worker:email:dev` (`nest start --watch --entryFile notifications/worker`); after build, `npm run worker:email` uses the compiled entry point. It serves no HTTP endpoint. Its private heartbeat checks MongoDB connectivity even while delivery is paused. No provider credentials were invented or supplied; live delivery remains disabled. `.env.example` contains empty email settings only. API and worker environment variables are backend-only.

## Startup fixes and checks

- Corrected notification lease-filter and model typing, the worker development command, and ordered creation of multiple notification jobs in the existing submission transaction. Added the missing worker Compose service and matching development/production configuration. Backend lint, typecheck and build passed.
- Development merged Compose validated. Production merged Compose validated with non-secret example external URI/origin placeholders; no external database or production stack was started.
- All five long-running services are healthy; initializer exited successfully. MongoDB ping returned 1, rs0 has a writable primary, and backend liveness/readiness returned HTTP 200 with `{"status":"ok"}` through Nginx. Required indexes were created through the existing explicit command without replacing data.
- 25 implemented frontend routes returned 200: homepage; project/research/publication lists; all solutions/consulting/institutional scopes; Academy/courses/About/team; contact/build-with-us and admin login. Five public content APIs returned 200 with list/pagination shapes. Missing project/research/publication/course/team details returned genuine 404s. No company content was seeded.
- Chrome checked the homepage, working Store anchor/teaser, admin login fields, anonymous admin redirect, inquiry form and mobile viewport without JavaScript exceptions. The inquiry-selection check was resumed after waiting for client hydration; the initial immediate DOM assertion read the pre-hydration select value. Actual credential sign-in is NOT RUN: there are no users in this local database and no admin credentials were supplied. Existing explicit bootstrap instructions remain in README; no account/default password was created.
- A guarded synthetic database, `techyfellow_test_local_start`, verified one persisted inquiry plus two jobs, deduplicated unchanged retries and zero provider calls/unchanged pending jobs while disabled. Only that temporary database was dropped and verified empty. Runtime `techyfellow` data was not used for synthetic submissions. The container-only helper is `backend/test/local-start-smoke.mjs` and refuses an existing test database; supply exact test NODE_ENV/URI when executing it in the backend container. Initial copying from a sandbox-local `/tmp` path failed before testing; the helper was copied from the shared workspace and then passed.

## Unfinished functionality

The homepage Store anchor remains supported. The dedicated `/store` and `/store/products` pages now provide the robotics catalog; `/store/kits` remains compatible. Public Store data is under `/api/v1/store/`. Existing member accounts can save wishlists/carts and submit unpaid requests for staff review. Store category/product/inventory/banner configuration and request management are documented in [store.md](store.md). No published inventory is invented, and payment collection/fulfillment are not automatic.

Step 17 remains incomplete: enabled-provider retries/lease recovery/terminal failures and the complete acceptance suite have not been verified. Worker startup and disabled delivery checks do not establish Resend delivery. Real email/provider connectivity and real R2 checks are NOT RUN. Steps 18–20 have no completed R1 acceptance/catalog implementation. No public deployment was performed.

Leave the system running for local use. Never use `down --volumes` to stop it or remove persistent data. The local HTTP/development configuration is not a public deployment configuration.
