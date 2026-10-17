# Support messaging

Client route: `/account/messages` (also linked in the logged-in account menu).
Staff route: `/admin/inbox` (linked when `inbox:read` is granted).

Support conversations are independent of chatbot responses and inquiry email jobs. No email/SMS are sent. The compact user chat now supports private attachments; see [private support chat](private-support-chat.md). No new service or transport is introduced. The UI polls every 15 seconds while visible and refreshes on visibility changes.

Permissions use the existing Users & Access role checklist. `inbox:read` allows thread listing, reading and advancing the shared staff read cursor. `inbox:manage` additionally allows replying, assigning and resolving; it depends on `inbox:read`. Admin APIs also require `admin:access`. SUPER_ADMIN receives these explicit grants; other built-in roles receive no new grants. Only enabled staff with inbox management permission can be assigned. Order references are visible to the owning client and to staff with `courses:edit`; no payment credentials, scholarship codes or order internals are returned. Courses must be published; orders must belong to the client starting the conversation.

API bases: `/api/v1/account/messages` and `/api/v1/admin/inbox`. Both expose `GET /`, `GET /:id`, `POST /:id/messages` and `POST /:id/read`. Clients can `POST /`; staff can `GET /staff` and `PATCH /:id`. Lists accept `page`, `search` and `filter=all|unread|open|closed`, with 50 records per page. State `closed` is shown as “Resolved”. A new reply reopens a thread.

MongoDB collection: `support_conversations`. Conversations embed at most 500 text messages to keep updates atomic and documents bounded. Start a new thread after this limit. Text is 1–4000 trimmed characters, subjects 1–160. Sending is limited to 30 new attempts per account per minute using the existing MongoDB throttle collection and expiry index. Retries of already-saved messages bypass throttling. A stable UUID identifies each create/send; duplicate concurrent requests cannot append a second message. Reusing an ID with changed content conflicts. Failed drafts and retry IDs remain in component memory; they are not persisted to browser storage and are cleared when leaving the page or ending the session.

Unread counts derive from client and shared inbox sequence cursors and the opposite sender type. Reading advances only through the loaded sequence, monotonically, so concurrent incoming messages remain unread. “Sent” means MongoDB confirmed persistence. No delivery or read receipts are claimed.

Before enabling against an existing database, run the existing `npm run db:indexes` from the backend with its usual environment after building. It now includes the unique `(owner,key)` conversation index, required for concurrent create deduplication. This task only created indexes in isolated test databases; no existing application database was changed.

Validation:

- `npm run lint`, `npm run typecheck`, `npm run build` in backend and frontend.
- `NODE_ENV=test TECHYFELLOW_TEST_MONGO=mongodb://<private-test-mongo-ip>:27017 node --test backend/test/messaging.integration.test.mjs`
- After the frontend/backend builds: `NODE_ENV=test TECHYFELLOW_TEST_MONGO=mongodb://<private-test-mongo-ip>:27017 node frontend/test/messaging-browser.mjs`

The integration/browser fixtures require a private `172.*` MongoDB endpoint, create random initially empty test databases, disable external email, and drop only their own database afterward. Browser checks use installed Google Chrome and a local proxy on port 8081. Screenshots are written under `artifacts/messaging/`. Nothing is deployed.

## Validation results (2026-10-15)

PASS: backend/frontend lint, typecheck and build; seven existing auth/account policy tests; isolated messaging API integration and headless Chrome workflow. Coverage includes concurrent create/send retries, lost response after persistence, preserved failed drafts, client/admin reply cycle, unread cursors, custom role dependencies, read-only and denied staff, unauthorized assignments, cross-account denial, context restrictions, CSRF, length/rate limits, pagination and the 500-message bound. Desktop and 390px mobile screenshots were inspected. One expanded integration run encountered a MongoDB connection closure; the rerun passed, and cleanup verified that no messaging fixture databases remained.

NOT RUN: chatbot runtime regression. No chatbot implementation or integration was found in the checked-out source. Existing homepage, Academy and order regression suites were not rerun; their implementation was left untouched and the full application build passed. No deployment or existing-database index operation was performed.

## User Inbox and reply notifications

The account menu now links to `/account/inbox`. `/account/inbox/:id` opens a specific owned conversation and restores its history after refresh. `/account/messages` remains a compatible entry point. The same conversation model and existing admin Inbox APIs handle both sides.

The logged-in public and Academy account controls include a notification bell. A provider shared by navbar instances polls `/api/v1/account/notifications` once per account, with visibility checks, request cancellation and a 20-second interval that backs off to 120 seconds on failures. Inbox polling similarly backs off from 15 to 120 seconds. Notification snapshots are scoped to their owner, discarded immediately when identities differ, and cleared when accounts change. Inbox drafts and bell UI are scoped to the account and cleared on logout/account changes. A response identifying a different owner is discarded and triggers account verification.

Each existing staff reply (except a staff member replying to their own thread) is a real notification. `messages.notificationReadAt` persists its independent notification read state. The stable conversation/message key identifies the notification, so the existing atomic message append also creates exactly one notification. No new collection, queue, external service, or index is needed. The dropdown returns the latest 20 replies and the total unread count. Existing real replies are included; no synthetic notifications are seeded.

`POST /api/v1/account/notifications/:id/read` marks a single owned reply notification read. `POST /api/v1/account/notifications/read-all` takes the `through` timestamp returned by the list, leaving replies with newer timestamps unread. Both require the existing session/CSRF checks and scope writes to the authenticated owner. Opening a notification saves its read state before navigating to its Inbox conversation; a failed write keeps the dropdown open for retry. Reading a thread and marking a notification read are independent actions.

Additional checks: `backend/test/reply-notifications.integration.test.mjs` covers notification counts, concurrent reply deduplication, ownership, read persistence after re-login, cutoff behavior, staff permission checks and own-message exclusion. `frontend/test/user-inbox-browser.mjs` uses an isolated database and local port 8082 to check Inbox/admin messaging, notification click/read/all-read, history after refresh, Academy bell, account/logout clearing, mobile layout and keyboard focus. It does not use or alter the running local application's accounts.

Latest user Inbox validation: PASS backend/frontend lint, typecheck and builds; both isolated MongoDB integration suites; nine auth/account/return-path policy tests; and the complete Chrome Inbox/notification flow. The browser run checked an actual user → admin → user exchange, retry after a committed but lost response, unread badges, notification click and all-read actions, history after refresh, same-route notification navigation, public/Academy bells, mobile chat/list/dropdown layouts, Escape focus restoration, empty state, account/logout cache clearing, restricted roles, and the existing local FAQ assistant reply. Account login return paths now allow only the explicit Inbox root, valid conversation IDs, the compatible Messages route and the existing Academy destinations. Phone notification panels stay within the viewport. Screenshots are in `artifacts/messaging/`.

A browser attempt was interrupted during fixture setup by a local MongoDB restart; the final full run passed after the database recovered. Empty interrupted test fixtures were cleaned up. No application accounts or conversations were used for tests, and no deployment was performed.

The latest user Inbox UI is the compact chat described in [private support chat](private-support-chat.md); it replaces the conversation list and start-conversation form on user routes. Admin conversation management is retained.
