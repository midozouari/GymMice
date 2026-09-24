# B06 public workout templates

## Scope and truthfulness

This is an MVP public catalog backed by PostgreSQL, not personalized programming.
The seed contains the existing Push Day: Chest (Bench press, Incline DB press,
H2L cable flies), Shoulders (Lateral raises, German raises), and Triceps (Cable
tricep extension, Skull crusher). Its duration is 3,300 seconds (55 displayed
minutes). User goals, lifestyle, availability, private schedules, workout
recording, historical sets, and personalized recommendations remain out of scope.

Home keeps its existing card and labels the result as a public template. It
chooses the `push-day` slug when present in the returned catalog, otherwise the
first returned template. There is no new browsing or detail screen. Empty
catalogs remain empty; failures never fall back to demo data.

## Data and seed

`exercises` stores UUID identity, stable unique slug, name, and muscle group.
`workout_templates` stores UUID identity, stable unique slug, name, and a positive
integer duration in seconds. `workout_template_exercises` stores template/exercise
relationships and unique, nonnegative ordering positions. Shared exercises can
appear in different templates. Deleting a template removes its membership rows.

Schema generation uses the existing offline Drizzle workflow. The reviewed
migration revokes PUBLIC table privileges; the explicit seed transaction applies
SELECT-only grants to existing approved runtime roles. The original migration
history is unchanged. Provision the runtime role before seeding, as described in
[database operations](database-operations.md).

The explicit seed command uses the migration identity, not runtime credentials:

```sh
pnpm --filter @workspace/db run seed:workout-templates --environment test
```

Use this test command only with `NODE_ENV=test` and the isolated test environment
already provisioned. The disposable harness supplies it automatically:

```sh
pnpm run test:db --api
```

For a separately approved development/preview database, first review the target,
provision roles, and apply migrations using the existing B03 procedures. Then
run the seed with that explicit environment and migration identity. No development
or production database is required for implementation tests. No production seed
runner, startup seed, install hook, or automatic deployment is introduced.

The seed runs in one transaction and uses unique slug conflicts to avoid
duplicates. A transaction-scoped advisory lock serializes seeds, including
permission grants: concurrent PostgreSQL GRANT statements can otherwise conflict
even when they grant the same privileges. Reruns do **not** overwrite existing names, durations, groups, or
membership/order edits. Membership rows are inserted only for a newly created
`push-day` template; an intentionally edited/empty existing template stays edited.
Deleting the template and deliberately running the seed again recreates it.
The command is not a catalog reset or synchronization tool.

## API contract

OpenAPI is authoritative; run the existing code generator rather than editing
React client or Zod output manually.

- `GET /api/workout-templates` returns `{ items: [...] }`, ordered by slug, with
  at most 100 summaries. Each has UUID `id`, `slug`, `name`, `durationSeconds`,
  and `exerciseCount`. This bounded MVP catalog has no search or pagination UI.
- `GET /api/workout-templates/{id}` returns a template and exercises ordered by
  `position`. Exercise identities, names, and muscle groups come from the database.
- Malformed UUIDs return 422; missing UUID resources return 404. Infrastructure
  failures are sanitized using B04 envelopes/request IDs.
- Both GET endpoints use `Cache-Control: no-store`.
- There are no public template POST, PUT, PATCH, or DELETE routes. Runtime has
  SELECT only on catalog tables; controlled seed/operator access is separate.

`/api/healthz` remains database-independent. A connected API indicator does not
guarantee the catalog database is available.

## Client behavior

The existing QueryClient, generated hooks, B05 origin configuration, custom
transport, per-attempt timeout/cancellation, and safe errors are reused. No
database/server imports or credentials enter the client.

Template queries are disabled for missing/invalid API configuration or known
offline state, and have automatic retries disabled. Health checking remains
independent and retains B05's bounded health-only retry policy. Template responses
are validated before display, and unknown errors receive controlled messages.

Refresh refetches the catalog and the selected detail, including when the
selection UUID is unchanged. Retry recovers failures without navigating away.
The card distinguishes initial loading, refreshing, empty, and error states.
Refresh failures hide stale content rather than presenting it as up-to-date.
API seconds are converted to display minutes. The Home workout-name display
uses the same selected server data. Existing schedule/local data is not imported,
cleared, synchronized, or otherwise changed.

## Validation and acceptance

After implementation changes:

```sh
pnpm run typecheck
pnpm run check:api-contract
pnpm run test:db --api
pnpm run test:mobile
pnpm run build:ci
git diff --check
```

The disposable harness applies migrations, reruns them to verify no-op behavior,
and executes the explicit seed twice before DB/API tests. CI API tests use this
same disposable migration/seed setup; runtime and migrator remain separate.
Tests cover constraints, runtime read/write privileges, concurrent/idempotent
seeding, preservation of edits, list/detail/empty/error behavior, mutation
rejection, generated URL construction, configuration gating, response validation,
selection, Retry, and same-ID Refresh.

Browser and physical-phone acceptance should separately verify Push Day rendering,
55-minute display, expansion, failure/recovery, and Refresh after a controlled
non-production database edit. Only change public catalog rows in an explicitly
approved environment; never use private records or production for acceptance.
B05 phone validation does not establish B06 acceptance. Record what was actually
tested; passing mocked UI tests or successful builds is not physical-phone proof.