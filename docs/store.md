# Robotics Store (local implementation)

Store pages live in the `(store)` route group. `/store`, `/store/products`, `/store/products/[slug]`, `/store/kits`, `/store/wishlist`, `/store/cart`, `/store/checkout` and `/store/orders[/id]` share the dedicated Store shell. The corporate layout remains on its existing routes. `/store/kits` remains a catalog entry point, and existing corporate homepage links remain valid. No reference-site branding, descriptions or product photographs were copied; that site returned HTTP 403.

## Catalog and admin

`/admin/store` links to the existing `/admin/products` editor and `/admin/site-content/store` banner editor, and manages categories and order requests. Categories are configurable, with optional one-level subcategories. The eight requested robotics categories are offered as form templates; no categories, products or stock figures are silently seeded. Only active categories containing published products (or qualifying subcategories) appear in public navigation. Disabling a parent also prevents ordering its subcategory products.

Products retain the existing MongoDB `products` collection, publication workflow, revision checks, audit records, media library and scoped upload validation. New optional fields: SKU (unique), category slug, real inventory quantity, explicit order-request enablement, homepage feature selection, genuine previous BDT price, description, technical specifications, package contents and validated supplied video. Existing kit component, compatibility, power, assembly and document fields remain. Video input uses the existing HTTPS YouTube/Vimeo parser; arbitrary HTML is never rendered.

Published records without explicit orderability, a SKU, an active category, a positive integer BDT minor-unit price and positive real inventory remain browseable but cannot be requested. Imported illustrative records always remain unavailable for ordering. Discounts display only when the configured genuine previous price exceeds the current price. Missing product photographs have an explicit placeholder.

Banner sections use the published `store` page and a visible `hero-1` (or other `hero*`) key. Heading, text, image, CTA and label use the existing page editor and scoped media selection. No new media storage integration was added.

## Accounts, money and requests

The Store uses the existing member session and account/profile. `/account/store/*` requires the member cookie and MEMBER role; it never falls back to the admin cookie. `/admin/store/*` uses the existing admin session. Safe login return destinations include known Store routes only. Carts and wishlists are persisted per member in `store_baskets`; Academy carts and scholarship orders are unchanged.

`GET /store/catalog` supports search (title/SKU), category (including children), minimum/maximum BDT price, availability, sorting and bounded pagination. `/store/categories`, `/store/products/:slug` and `/store/home` provide public data without caching published edits. Cart/wishlist mutations require an expected basket revision and existing CSRF/origin defenses.

All totals are calculated server-side with integer BDT minor units. At submission the server rechecks current publication, category eligibility, illustrative status, inventory, quantities and prices. A changed quote or basket requires review. A transaction snapshots customer details, line prices and quantities, creates the request and clears the submitted basket. A unique member/request key and payload hash make retries idempotent, including concurrent requests and an unconfirmed response. The browser keeps the retry key (not delivery details) in member-scoped session storage for unchanged payloads. Retrying after an uncertain response uses the original payload.

Requests are stored in `store_orders`, with immutable price/customer snapshots and random references. Their statuses are `submitted`, `reviewing`, `confirmed`, `declined` and `cancelled`. Staff status changes require a revision and append an actor/time history. Confirmation does not take payment, fulfill an order, reserve stock or determine shipping. Delivery costs remain unconfirmed. A customer can read only their own requests and print their saved request summary; it explicitly is not a payment receipt.

Existing permissions apply: Store admin reads require `admin:access` + `products:read`; request updates require `products:edit`; public category changes require both `products:edit` and `products:publish`. Product and page edits/publishing retain their original permissions. Store banner editing additionally requires the existing page permissions.

## Local verification

After a backend build, run the existing explicit `npm run db:indexes` against the intended database to create Store/SKU indexes before using requests. Do not remove or reset existing data. No real inventory or customer orders are seeded by startup.

Checks:

```sh
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run build
node --test backend/test/auth-policy.test.mjs frontend/test/account-flow.test.mjs
NODE_ENV=test TECHYFELLOW_TEST_MONGO=mongodb://172.x.x.x:27017 node --test backend/test/store.integration.test.mjs
NODE_ENV=test TECHYFELLOW_TEST_MONGO=mongodb://172.x.x.x:27017 node frontend/test/store-browser.mjs
```

The integration/browser fixtures refuse non-test environments, use randomly named initially empty databases, and drop only their own database. Browser artifacts are in `artifacts/store/`. Fixture product records/images are explicitly synthetic; no fixture data is installed in the running Store. Browser checks use headless Chrome and a local proxy to an isolated backend.

For repeated full-app fixture runs, the test MongoDB container needs `--ulimit nofile=65536:65536`: the host's inherited 1024-file limit caused WiredTiger to abort while creating the many unrelated application indexes. An isolated test replica set was used with the higher limit, without changing the development database configuration.

No deployment or payment gateway is included. Live R2 upload/provider connectivity and physical print output are NOT RUN; scoped reference validation, browser print behavior, and saved summaries are checked locally.
