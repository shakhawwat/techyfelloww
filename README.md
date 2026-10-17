# Techy Fellow

## Fixed decisions

- Frontend: Next.js + React + TypeScript.
- Backend: NestJS + TypeScript + Mongoose.
- Database: MongoDB.
- Separate frontend and backend applications.
- Deployment: Docker Compose + Nginx on EBN, subject to verifying Docker support.
- UI: premium engineering design with navy, cyan and light sections.
- Custom admin; no Payload CMS.

## Structure

- `frontend/src/`: frontend source.
- `frontend/public/`: public assets.
- `backend/src/`: backend source.
- `nginx/`: future Nginx configuration.
- `docs/progress.md`: completed steps, checks and blockers.
- `scripts/`: future project scripts.
- `.env.example`: deployment environment template.
- Application `.env.example` files: frontend and backend environment templates.

## Current status

Steps 1–16 provide separate applications, the local Docker/Nginx/MongoDB foundation, published content APIs, protected content/media administration, the public homepage, projects/research/publications pages, proposed solutions/consulting/institutional scopes, Academy/course/About/team pages, and persisted inquiries with private lead management. Liveness/readiness endpoints remain available. Public inquiry forms are implemented; email delivery, enrollment, LMS, payments and commerce are not implemented. No deployment has been performed.

## Run the existing local system

The implemented frontend, backend, private MongoDB, Nginx and notification worker run with the development Compose configuration. Current local access is **http://localhost:8081**; localhost:8080 belongs to an unrelated application. The retained ignored local override forces live email off and contains no credentials. From the project root:

```sh
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.run.local.yml up -d --build --wait --wait-timeout 180
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.run.local.yml exec -T backend npm run db:indexes
```

Open `/admin/login`, `/api/v1/health/live` and `/api/v1/health/ready` through the same local origin. No admin account is created automatically. The homepage Store teaser and `/store/kits` remain valid entry points to the dedicated `/store` robotics catalog. Store carts, wishlists and unpaid order requests use existing member accounts; staff must publish real product/inventory data before ordering is available. The worker is operational with delivery disabled; this does not complete Step 17 or verify live email. See [local configuration, startup fixes and actual checks](docs/local-run.md).

## Installation and development

Use Node.js 20.19 or later and npm. Direct dependencies are pinned; use each application's generated `package-lock.json` for reproducible installation.

Frontend, from `techyfellow/frontend/`:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For host-run admin development, use `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1 npm run dev` with the backend running separately. Through Nginx, the default `/api/v1` works without an override. See [admin interface configuration](docs/admin-interface.md).

Backend, in a separate terminal from `techyfellow/backend/`:

```sh
npm ci
# Supply an externally reachable development database for a host-run backend.
export NODE_ENV=development
export PORT=4000
export MONGODB_URI="mongodb://127.0.0.1:27017/techyfellow?replicaSet=rs0&directConnection=true"
npm run dev
```

The host-run URI above requires the optional loopback-only MongoDB mapping documented below. Check http://localhost:4000/api/v1/health/live. The default port is 4000. To override it, run `PORT=4100 npm run dev`. The backend validates PORT, NODE_ENV and required MONGODB_URI at startup. It reads the process environment; `.env.example` is not automatically loaded. Validation and readiness errors omit connection details.

Run these checks independently in each application:

```sh
npm run build
npm run lint
npm run typecheck
```

After building, `npm start` serves that application. Stop development servers with Ctrl+C.

Scaffolding follows the [Next.js installation guidance](https://nextjs.org/docs/app/getting-started/installation), [Tailwind Next.js integration](https://tailwindcss.com/docs/installation/framework-guides/nextjs), and [NestJS first steps](https://docs.nestjs.com/first-steps).

## Toolchain notes

Frontend dev and build use Next.js's Webpack option because Turbopack's CSS worker could not bind its internal port in this execution environment. The frontend pins ESLint 9.39.5 to satisfy Next.js lint plugins' peer dependencies; npm marks this ESLint release as no longer supported. The backend uses ESLint 10 and NestJS 11 to remain compatible with the available Node.js 20.20.2 runtime.

Generated npm lockfiles are included in both application folders. A Git commit could not be created: this workspace exposes an empty, read-only `.git/` directory and `git status` does not recognize a repository.

## Docker foundation

Step 3 adds independent multi-stage Docker builds, standalone Next.js output, and Nginx routing for local access through http://localhost:8080. See [deployment commands and prerequisites](docs/deployment.md). The HTTP configuration requires TLS before public deployment; EBN Docker support is unverified.

## MongoDB development and readiness

From `techyfellow/`, start the backend and its private single-node replica set:

```sh
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml up -d --build --wait --wait-timeout 180 backend mongodb mongodb-init
```

To include the frontend and Nginx, use the same command without the final service names; localhost:8080 must be free. The backend container uses `mongodb://mongodb:27017/techyfellow?replicaSet=rs0`, where `mongodb` is the reachable Compose hostname. MongoDB has no published host port. Its named `mongodb-data` volume persists across restarts and project-scoped `down`; never use `down --volumes` to stop verification services. This unauthenticated database is development-only.

The initializer checks the existing replica-set configuration, initializes rs0 only when absent, and waits for a writable primary. It rejects incompatible existing configurations without resetting/reconfiguring data. To repeat initialization safely:

```sh
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml run --rm mongodb-init
```

`GET /api/v1/health/live` always describes process liveness. `GET /api/v1/health/ready` returns 200 and `{"status":"ok"}` only after a successful MongoDB ping; otherwise it returns 503 and `{"status":"unavailable"}`. The driver ping has a 1500 ms timeout, with a 2000 ms response deadline. Initial connection failures are retried; established connections use driver recovery. Database errors and URIs are not logged or returned. Compose retains a liveness health check so the API remains reachable during database outages.

Readiness directly from the private backend container:

```sh
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml exec -T backend node -e "fetch('http://127.0.0.1:4000/api/v1/health/ready').then(async r=>{console.log(r.status,await r.text());if(r.status!==200)process.exit(1)})"
```

Verify transactions using an isolated temporary collection; the script checks isolation, commit and abort, then removes the collection:

```sh
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml exec -T mongodb mongosh --quiet 'mongodb://127.0.0.1:27017/techyfellow?replicaSet=rs0&directConnection=true' < scripts/mongodb-check-transactions.js
```

For outage verification, stop only this project's database, inspect readiness (503) and liveness (200), then restart the same database and poll until readiness returns 200:

```sh
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml stop mongodb
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml exec -T backend node -e "Promise.all(['ready','live'].map(async path=>{const r=await fetch('http://127.0.0.1:4000/api/v1/health/'+path);console.log(path,r.status,await r.text())}))"
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml start mongodb
# Repeat the readiness command until 200; allow up to 60 seconds for election/reconnection.
docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml down
```

Backend checks from `backend/`: `npm run lint`, `npm run typecheck`, `npm run build`, then `node --test test/configuration-health.test.mjs`.

### Optional host-run database access

Default Compose development supports container clients only. For a host-run backend, create a local untracked override (for example `docker-compose.host.local.yml`) containing:

```yaml
services:
  mongodb:
    ports:
      - "127.0.0.1:27017:27017"
```

Start the database with `docker compose -p techyfellow-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.host.local.yml up -d --wait mongodb mongodb-init`. Export the host-run URI shown above, including `directConnection=true` so clients do not need to resolve the replica set's advertised container hostname. Only bind this development mapping to loopback. Host-run access is optional and is not part of the default private Compose stack.

### External production database

Production Compose contains no MongoDB or initializer service/volume. Supply MONGODB_URI via an untracked root `.env` (based on the placeholder template), or your deployment environment. Use a properly secured external database with TLS/authentication and appropriate network access. Do not put its URI in source, Docker build arguments, logs or public frontend variables.

```sh
# First securely supply external MONGODB_URI and exact HTTPS AUTH_ALLOWED_ORIGINS in the environment or an untracked .env.
docker compose -p techyfellow-prod -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose -p techyfellow-prod -f docker-compose.yml -f docker-compose.prod.yml up -d --build --wait --wait-timeout 180
```

Avoid printing resolved Compose configuration with real credentials. These are operator instructions; no deployment was performed.

Implementation references: [NestJS MongoDB integration](https://docs.nestjs.com/techniques/mongodb), [MongoDB replica-set initialization](https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set/).

### Step 4 verification results

Backend lint, typecheck, build, targeted validation/readiness tests and both merged Compose validations passed. An actual malformed-URI startup test rejected fake sentinel credentials without exposing them or the sentinel hostname. The isolated `techyfellow-step4-check` development backend connected and returned readiness 200. Real replica-set transactions verified isolation, commit and abort; the temporary collection was removed. Initialization was repeated successfully before and after a database restart. Stopping MongoDB caused bounded readiness 503 while liveness stayed 200; readiness recovered after restarting MongoDB without restarting the backend. Initial database unavailability also recovered through the retry path.

Only backend, mongodb and mongodb-init were started for Step 4, using the documented commands with project name `techyfellow-step4-check`. They were removed with project-scoped down; volume `techyfellow-step4-check_mongodb-data` was preserved. No frontend/Nginx startup was needed, avoiding the existing port 8080 conflict. Optional host-run access, external production database connectivity and EBN deployment were not run; the required local development checks above passed. Git metadata is still unavailable, so the generated updated backend lockfile cannot be committed in this workspace.

## Shared frontend UI

Step 5 adds the shared navy/cyan/light design system, Geist typography, Lucide icons, core components and responsive navigation/footer. Run `npm run dev` in frontend/ and open `/design-system` for explicitly labeled demo states. The route returns 404 in production. See [design-system usage and verification](docs/design-system.md). No complete public pages or API integrations were added.

## Public content APIs

Step 6 adds projects, research, publications, team and courses lists plus slug details under `/api/v1/`. Only published records with publishedAt no later than now are returned. No company content is seeded. See [fields, filters, DTOs and index commands](docs/content-api.md). From backend/, run `npm run build` then `npm run db:indexes` with the intended database supplied securely; indexing is never automatic at startup.

## Backend admin authentication

Step 7 adds login/logout/me, opaque hashed server-side sessions, credential-free auditing, login throttling and a protected `/api/v1/admin/access` permission probe. Public APIs and health routes remain anonymous. See [configuration, permissions, CSRF, bootstrap and isolated tests](docs/authentication.md).

Development defaults allow `http://localhost:3000` and `http://localhost:8080`. Production requires `AUTH_ALLOWED_ORIGINS` with exact HTTPS frontend origins. `AUTH_SESSION_TTL_SECONDS` defaults to 28800 (valid 900–86400); `AUTH_TRUSTED_PROXY_IPS` defaults empty. Production cookies are Secure/HttpOnly; localhost cookies omit Secure. All mutations require an allowlisted Origin and `X-CSRF-Protection: 1`; JSON is required except the protected multipart media-upload handler; browser requests must include credentials.

With the intended database/configuration securely supplied, run `npm run build` then `npm run db:indexes` from backend/. Supply `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` securely through environment variables, then run `npm run auth:bootstrap`; unset both afterward. Never put credentials in arguments/history/source. The command refuses existing normalized users and never runs at startup. No default credentials or public registration exist.

## Protected content management

Step 8 adds session-protected reads, draft creation/editing and publish/unpublish/archive actions for all five content resources. Every mutation uses a revision precondition and atomically writes its actor audit in a MongoDB transaction. Published edits require publish permission; public filtering stays unchanged. See [requests, fields, permission matrix, indexes and isolated tests](docs/admin-content-api.md). Step 9 supplies the admin UI; no deployment is included.

## Media storage and project images

Step 10 adds protected image uploads/list/detail/alt-metadata edits and an admin media library, with selection in the existing project gallery only. JPEG, PNG and WebP are decoded/re-encoded and bounded (default 5 MiB, 8192px per side, 40 million pixels). Only confirmed storage uploads become ready; references require ready scoped media IDs and meaningful alt text. No permanent deletion or cover/profile schema expansion is introduced.

Securely supply backend `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and exact HTTPS `MEDIA_PUBLIC_BASE_URL`; absent settings produce explicit unavailable uploads. Frontend `NEXT_PUBLIC_MEDIA_HOST` is the matching exact build-time hostname, with restricted Next Image delivery. After installation/build, run explicit `npm run db:indexes`; failed/interrupted uploads have an explicit `npm run media:reconcile` command. Never place R2 credentials in frontend variables or build args. See [API, permissions, validation, reconciliation and verification](docs/media.md). Real R2 provider checks require isolated test credentials and remain NOT RUN in this workspace.

## Public homepage

Step 11 adds the public layout and homepage, using Full Project Documentation section 5 and the shared design system. Public content is server-rendered from published-only APIs; empty/unavailable responses have honest messages. Navigation resolves to real homepage anchors. Inquiry submission and store checkout are explicitly unavailable. Admin routes retain their separate session-protected layout.

For a host-run frontend, configure server-only `CONTENT_API_BASE_URL=http://127.0.0.1:4000/api/v1` and run the existing frontend/backend development commands. Compose supplies `http://backend:4000/api/v1`; do not use localhost for container-to-container requests. This runtime setting is separate from the browser/admin `NEXT_PUBLIC_API_BASE_URL`. No credentials belong in either URL. See [homepage content, caching and verification](docs/homepage.md).

## Public projects and research pages

Step 12 adds `/projects`, `/research`, `/publications` and their slug details, using published public APIs, URL-based filtering/pagination and bounded 60-second public caching. Detail visibility failures return genuine 404; API outages have a separate unavailable state. Homepage previews now link to these routes. Optional server-only `PUBLIC_SITE_URL` supplies a verified HTTPS canonical origin; leave it empty until confirmed. See [page behavior, metadata and isolated verification](docs/public-pages.md). No Academy pages, inquiry forms, commerce or deployment were added.

## Solutions, consulting and institutional scopes

Step 13 adds all requested service routes with shared templates and typed static content, based on the supplied project documentation. Scope, deliverables and process are explicitly proposed; capstone pages state that students remain responsible for assessed academic work. Navigation and homepage links now expose the new routes. Inquiry CTAs now use the Step 16 forms with context-specific types, without implying a confirmed booking. Related work requires an approved explicit published project/research reference; none are supplied. See [content configuration, routing and verification](docs/services.md).

## Academy, About and Team

Step 14 adds `/academy`, `/academy/courses`, `/academy/courses/[slug]`, `/about`, `/team` and `/team/[slug]`. Course/profile pages use published public APIs with existing bounded caching, URL filters, genuine missing-record 404s and separate outage states. Navigation and homepage previews link to these routes. Static positioning stays separate from markup. Unsupported enrollment facts and profile images are omitted; no accounts, LMS, bookings, payments or deployment. See [fields, caching, destinations and verification](docs/academy-team.md).

## Inquiry backend and lead administration

Step 15 adds `POST /api/v1/leads`, private lead list/detail/revision updates and `/admin/leads` screens. Seven typed inquiry categories use bounded validation, separate acknowledgment/marketing consent, idempotent persistence and rate limits. SUPER_ADMIN and the new lead-only SALES_MANAGER role manage status, eligible assignments and append-only notes with transactional audits. Existing content-role grants are unchanged. After build, run explicit `npm run db:indexes` with intended configuration. Securely supplied `SALES_MANAGER_EMAIL`/`SALES_MANAGER_PASSWORD` are used only by `npm run auth:create-sales-manager`, which refuses existing accounts. Public forms are provided by Step 16; email remains unimplemented. See [field/API contracts, permissions, commands and isolated verification](docs/leads.md).

## Public inquiry forms

Step 16 adds `/build-with-us` and `/contact`, a shared React Hook Form/Zod system for the seven existing inquiry types, and contextual public CTAs. Published course details supply their course identifier directly. Client validation mirrors backend limits; cookie-free requests use the configured public API origin, CSRF header and per-payload idempotency key retained across unchanged retries. Only confirmed persistence produces a reference; errors retain input. Inquiry acknowledgment and optional marketing consent are separate. No email, booking or enrollment is implied. Existing frontend environment settings suffice. See [form contracts, retry behavior and isolated verification commands](docs/inquiry-forms.md).

### Public accounts — Step 1

Backend registration, MEMBER-only login, shared-session logout/me and email-code verification are documented in [docs/accounts.md](docs/accounts.md). No frontend account screens or commerce flows are implemented. Live verification delivery remains disabled and requires approved server-only email/encryption configuration.

## Robotics Store

The dedicated `/store` section includes catalog filters, product details and galleries, member wishlists, persisted carts, unpaid order requests and printable summaries. `/admin/store` manages categories and requests and links to the existing product/inventory and banner editors. Store requests are separate from Academy commerce and require staff stock/delivery confirmation. No payment gateway or deployment is included. See [Store configuration, permissions, indexing and verification](docs/store.md).
