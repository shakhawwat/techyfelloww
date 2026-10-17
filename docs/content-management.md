# Existing frontend content management

The current dashboard, navigation components, public markup and styles are retained. Page content and products extend the existing Mongoose content definitions, scoped permissions, generic CRUD/editor, optimistic revisions, publication filtering and transactional audit log. Existing content collections are not copied or replaced. No production deployment or automatic database seeding is included.

Local origin: http://localhost:8081. Sign in at `/admin/login` with an existing authorized account.

| Frontend section | Admin tool | Storage / binding |
| --- | --- | --- |
| Homepage banners, headings, descriptions, CTAs, supported section visibility/order | `/admin/homepage` | `page_content`, unique slug `homepage`, type `homepage` |
| Homepage featured projects, research, publications, courses and profiles | `/admin/homepage` | Collection + slug references; only published records are resolved |
| Solutions overview and existing expandable scopes | `/admin/solutions` | Existing destination templates; page slugs `solutions` and `solutions-{existing-slug}` |
| Institutional audience pages and programs | `/admin/institutional` | Audience destinations and program templates, `institutional-program-{slug}`; published programs replace illustrative previews |
| Research | `/admin/research` | Existing `research_projects`, including contributor references, methods, stage, requirements and approved links |
| Publications | `/admin/publications` | Existing `publications`, including abstract, citation, paper links and individually verified metrics with year/source |
| Projects | `/admin/projects` | Existing `projects`, scoped media gallery, first image as thumbnail, validated YouTube/Vimeo source and repository link |
| Board / team | `/admin/team` | Existing `team_members`, explicit classification and role; first scoped image is the portrait |
| Academy course content, pricing, modules, lessons and resources | `/admin/academy` | Existing `courses` and `academy_learning_courses`; existing access and commerce contracts retained |
| Scholarship codes, orders and enrollments | `/admin/academy`, `/admin/academy/scholarships`, `/admin/academy/orders`, `/admin/academy/enrollments` | Existing hashed-code generation, single-course redemption, orders and enrollment APIs |
| Consulting and mentorship | `/admin/consulting` | Existing consulting destinations plus approved published team slug references; homepage mentor selection uses the same profiles |
| Kit catalog and homepage store previews | `/admin/products` | `products`, existing kit presentation and component/specification fields; approved BDT price entered as BDT and stored in minor units; checkout remains unavailable |
| Contact and other inquiries | `/admin/leads` | Existing lead filters, revisions, statuses, internal notes and permissions; no messaging action added |
| Public images/documents | `/admin/media` | Existing scoped R2 media storage and MongoDB upload lifecycle/audits |

`/admin/pages` is the shared page-content collection. Its management links open Homepage, Solutions, Institutional and Consulting using the existing button/navigation styles. Templates prefill an unsaved form only; they do not write or publish a record. Published service slugs must bind to an existing frontend destination; institutional program slugs are rendered in the existing program list. Generic draft editors remain at `/admin/{collection}/new` and `/admin/{collection}/{id}`.

## Homepage controls

Existing banner keys are `hero-1`, `hero-2`, `hero-3`. They edit title, description, label, CTA and existing/uploaded image. `audience-1`–`audience-3` edit the existing audience cards; `solution-1`–`solution-6` edit the engineering card labels/links. Group section keys are `hero`, `audience`, `solutions`, `projects`, `research`, `support`, `mentorship-store`, `company`, `inquiry`. Their row order controls the existing component order. `consulting`, `institutional`, `academy`, `mentorship`, `store` control supported inner sections without changing their established layout. Blank optional copy retains existing static positioning; unchecked visibility hides the corresponding section. Audience label/heading, engineering/research/project/company copy and supported CTAs are editable. Unsupported layout fields are not added to the public design.

Featured selections store only collection/slug references. Publication validates references; rendering fetches currently published records, so archived or unpublished references are not exposed. Mentor references likewise resolve existing published team records. No courses or people are duplicated into homepage data.

## Save and publication

New records are drafts. Shared editors provide labeled fields, repeaters with ordering, draft preview, save, authorized publish/unpublish and archive. Save success requires a verified API response after MongoDB persistence. A partial Academy save explicitly reports which stage failed. Revision conflicts retain user input. Archived records remain stored and become read-only.

Public page loaders use no-store API requests with request-local deduplication, rather than retaining an instance-wide snapshot after editorial changes. The next public request sees a confirmed publication, edit, unpublication or archive; drafts and future publication dates remain hidden. Static layout defaults remain when no published editorial override exists. Demonstration records remain labeled previews and are never written to MongoDB.

## Upload configuration and separation

Public storage requires existing server-only `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL`; frontend image delivery also requires the exact approved `NEXT_PUBLIC_MEDIA_HOST`. Keep these out of source and public environment variables. Existing image validation/re-encoding and byte/dimension/pixel limits remain. Public PDF (1.x) and UTF-8 TXT documents use the same upload lifecycle, randomized keys and attachment disposition. Other formats are rejected. Uploaded public references are validated against ready media in the same content collection. Document references cannot be used as course thumbnails.

The shared uploader provides a selected-file preview, progress, server-confirmed ready state, metadata editing, scoped selection and retained input for retry/error handling. Uploading an asset never publishes the referencing record. Removing a content reference does not delete a stored asset.

Restricted Academy PDF/TXT resources use `/api/v1/admin/academy/management/resources/upload`, the existing `ACADEMY_MEDIA_ROOT` storage and Academy audit collection. Configure an absolute writable private directory outside public assets, and mount persistent private storage at that path when running containers. Compose forwards the optional root setting; it does not provision a directory or public bucket. Uploads use random private keys, then require an explicit course save to attach them. Existing lesson enrollment checks gate delivery. The public media picker is never used for restricted resources. Existing private video file-key support and validated video embed support remain.

The running local stack currently lacks the R2 settings, approved frontend media host and private Academy root. Live uploads therefore remain unavailable with clear errors. No credentials or environment values were changed to invent storage access.

## Verification

Both applications: `npm run lint`, `npm run typecheck`, `npm run build`.

`backend/test/editorial-cms.integration.test.mjs` creates a fresh, randomly named, asserted-empty test database, tests authorized persistence, references, draft/public visibility, publish/archive, member/CSRF denial, verified metrics, scoped public media, private resources and inquiry notes. Remote R2 writes are simulated at the storage boundary; actual provider connectivity is **NOT RUN**. Existing Academy tests cover protected lessons, scholarship limits/retries, orders, enrollment and cart behavior. Unit checks cover document/image validation, environment/readiness and public DTO/query boundaries.

`frontend/test/editorial-cms-browser.mjs` uses an explicitly supplied local test MongoDB endpoint, production Next build, temporary Nest backend, temporary Chrome tooling and an isolated proxy. It verifies admin draft preview/save/publish/archive, actual persisted values, immediate public refresh, unchanged homepage section classes, desktop/mobile screenshots, service/program templates, approved-price serialization, kit rendering, unavailable upload UI, Academy tabs and member denial. Test fixtures remain outside application databases. Successful runs clean up their owned fixtures; fixtures interrupted by a database server failure are retained rather than using a prefix-wide cleanup. Screenshots are saved under ignored `artifacts/editorial-cms/`.

Run MongoDB integration suites sequentially (`node --test --test-concurrency=1`) and run the browser suite afterward. The existing MongoDB 8.0.17 server crashed/restarted in both combined and sequential runs. Final verification moved to a separate temporary replica-set container: all 21 backend checks and the full Chrome flow passed there, and the temporary verification container was removed. All 13 frontend unit checks passed. The application server recovered; its readiness and required indexes passed. No application database is dropped, reset or seeded by these checks.
