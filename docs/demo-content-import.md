# Import existing illustrative frontend content

The importer reads the existing TypeScript datasets and validates drafts against the same MongoDB schemas used by the admin APIs. It does not publish records, activate purchases, invent lesson videos or treat illustrative claims as verified facts.

## Run locally

Use Node 20+ and the existing installed backend/frontend dependencies. Configure `MONGODB_URI` through your server-only environment; do not put credentials in command output or reports. MongoDB must support transactions, and the database must contain an active SUPER_ADMIN for audit attribution.

```bash
npm --prefix backend run build
npm --prefix backend run demos:import -- --dry-run --report ../artifacts/demo-import-dry-run.json
```

Inspect the report before applying. Resolve validation errors first. Conflicting existing IDs, titles, slugs or course configurations are skipped rather than overwritten.

```bash
npm --prefix backend run demos:import -- --apply \
  --backup ../backups/demo-import-UNIQUE-TIMESTAMP.ejson \
  --report ../artifacts/demo-import-applied.json
npm --prefix backend run demos:import -- --dry-run \
  --report ../artifacts/demo-import-repeat.json
```

Paths above are relative to `backend`, where npm executes the command. Dry-run is the default. Each apply requires a new backup filename; backups are mode 0600, excluded from Git and written before any database mutation. No reset/drop operation is provided.

## Inventory and safeguards

- 29 courses: 24 current Academy examples plus five distinct older course examples. The 24 authoritative backend prices are preserved exactly. The five older supplied prices are preserved verbatim and reported for review; no new approved price is invented.
- Existing module/lesson IDs, ordering, descriptions and access classifications are retained. Legacy outlines receive deterministic module/lesson IDs. Placeholder instruction videos are omitted. Missing delivery mode/duration remains missing and must be supplied before publication.
- Eight proposed projects; expected outputs are separate from achieved results.
- Twenty research proposals and twenty illustrative publications. Fictional journal metrics remain in private import provenance, not verified public metrics.
- Nine team profiles and three board profiles, with explicit illustrative portrait/person notices.
- Nine institutional programs in the existing PageContent model.
- Overlapping homepage/older dataset variants are retained in provenance instead of creating duplicate records.
- Nineteen resource-scoped media entries reference verified existing local `/banner/` images. Files are neither moved nor uploaded; existing media pickers resolve these entries. Remote upload configuration is unchanged.

Content and media IDs are deterministic. Existing imported records are left unchanged on subsequent imports, including records that administrators edit, publish or archive. Import provenance contains the source ID, source dataset, supplied ordering, original source material and hash. Only the illustrative notice is exposed publicly.

## Admin review

Use `/admin/courses`, `/admin/projects`, `/admin/research`, `/admin/publications`, `/admin/team` and `/admin/institutional`. Existing editors support text, appropriate details, images and workflow actions; the Academy editor manages modules, lessons, media and prices.

Imported records start as DRAFT and require an explicit public-display review plus the existing publish permission and validation. Review does not remove illustrative labels. Imported illustrative courses remain ineligible for purchase, promo redemption and enrollment, even if someone toggles purchase settings. Missing instructional media must not be represented as an available paid course.

Published database course details take precedence over equivalent frontend demo data. Existing list fallbacks remain until published records are available; errors do not silently become demos. Publication edits are read through existing uncached content loaders. No real content needs to be published for import verification: integration tests use a fresh isolated database and never reset or drop a database.
