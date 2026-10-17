# Local administrator bootstrap

Use the existing configured database and index setup. This command creates a new SUPER_ADMIN in the existing users collection. It refuses an existing email, explicitly reporting a MEMBER conflict; it never promotes or replaces that account. No startup bootstrap or password is shipped to the frontend.

For the running local development backend, enter the initial password through a hidden Bash prompt:

```bash
export BOOTSTRAP_ADMIN_EMAIL=techyfelloww@gmail.com
read -r -s -p 'Initial admin password (12+ characters): ' BOOTSTRAP_ADMIN_PASSWORD
export BOOTSTRAP_ADMIN_PASSWORD
docker exec -e BOOTSTRAP_ADMIN_EMAIL -e BOOTSTRAP_ADMIN_PASSWORD techyfellow-dev-backend-1 npm run auth:bootstrap
unset BOOTSTRAP_ADMIN_PASSWORD
```

For a locally configured Node backend, run `npm --prefix backend run auth:bootstrap` with the same server-only variables and the existing `MONGODB_URI`. Build the backend first. Never paste the password into a command argument, example file or login source. The form has no prefilled credentials.

Sign in at `/admin/login`. Bootstrap accounts must change the initial password before any management API can be used; changing it revokes all their sessions and requires a fresh login. Admin inactivity expires after 120 seconds; ordinary requests and polling do not extend it. Public MEMBER sessions use their existing policy.

SUPER_ADMIN can search `/admin/users`, select an existing role and enable/disable other accounts. Built-in role permissions remain fixed; saved custom staff roles are also available. Every actual access edit atomically revokes the target’s sessions and records actor, target and before/after access in auth_audits. Self edits are refused; a transaction serializes edits and protects the last active full administrator. Members and other staff cannot call these management APIs.

Staff accounts can be created by SUPER_ADMIN in Users & Access with a supplied initial password of at least 12 characters. They must change it on first login. Changing an existing account’s role never changes its password. Public signup uses a separate member policy: at least 6 characters including a letter and a decimal digit; public signup still only creates MEMBER accounts.

Users & Access has separate Staff and Normal users tabs with independent searches and pagination. Members have status controls only; this page’s access API refuses conversions between MEMBER and staff. Staff role changes retain the existing password. Unsupported roles, invalid statuses, or explicit stored account types that contradict their roles are reported as inconsistent and excluded from editable tabs; no records are automatically repaired.

## Custom staff roles

Only SUPER_ADMIN can create, edit or delete custom roles from the Staff tab. Definitions persist in `auth_staff_roles`; users retain their existing IDs and collection and reference the role’s stable `CUSTOM_…` key. Run the existing backend `db:indexes` command during normal local setup to create the role key/name unique indexes. No database reset or user migration is required.

The checklist reflects the actual resource read/edit/publish and inquiry read/manage API checks. Create/edit/archive share the edit permission. Homepage, Solutions and institutional content share pages permissions; Academy course management, scholarships, enrollments and orders share courses:edit. Media follows the owning resource. Dependencies are added automatically. Users/access management stays reserved for SUPER_ADMIN and cannot be delegated to a custom role.

Every authenticated request resolves the current role definition. Unknown definitions or permissions deny access. A role update increments its revision and revokes all assigned staff sessions; fresh login is required. Assignment changes likewise invalidate existing sessions without changing passwords. Creation, updates, deletion and assignments are audited. Built-in role keys/names are protected; an assigned custom role cannot be deleted, including when assigned accounts are disabled. Reassign staff first. Role mutations share the existing full-admin transaction lock and preserve last-administrator protections.
