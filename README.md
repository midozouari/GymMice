# GymMice

**Train. Eat. Connect.**

GymMice is a mobile fitness app prototype that brings workouts, nutrition, scheduling, and social features into one place. Built with Expo and React Native, it supports mobile devices and a browser preview.

## Features

- **Home:** workout overview, upcoming events, and daily stats.
- **Onboarding:** five steps for fitness preferences, goals, and appearance.
- **Schedule:** week and month views with event forms.
- **Analytics:** separate Push, Pull, and Legs views.
- **Nutrition:** calorie, water, and meal overview.
- **Pump Match:** swipeable gym-partner profiles with expandable details.
- **Social:** feed, post composer, and comments.
- **Messages:** conversation list and chat screens.
- **Shop:** fitness product browsing.
- **Personalization:** light/dark mode and five color palettes.

> **Project status:** This is a frontend prototype using mock/local data. Sign-in screens, messaging, matching, and shopping are demo experiences—not production authentication, live messaging, or checkout. Some controls are placeholders.

## Backend MVP foundation (B01)

The [backend foundation document](docs/backend/mvp-foundation.md) defines the
planned MVP, environments, configuration variables, ownership/privacy rules,
local-data preservation, and API boundaries. **Clerk is the confirmed
authentication provider; authentication is not implemented yet.**

The target MVP covers accounts/profile, public workout templates, private
scheduling, workout recording/history, real progress, and data export/deletion.
Social, matching, messaging, nutrition, shopping, and notification services remain
future/demo functionality. B01 does not remove or change their existing screens.

Development, testing, preview, and production must use isolated data/identity
environments. The proposed API-origin configuration and server-owned data are
future contracts, not connected features. Existing local onboarding, preferences,
events, and deletion markers must remain untouched until a later explicit,
non-destructive import flow. B02–B20 own implementation; see the document for the
ticket boundaries and review checklist.

## Screenshots

| Home | Pump Match |
| --- | --- |
| ![Home in light mode](artifacts/screenshots/09-home-light.png) | ![Expanded Pump Match profile](artifacts/screenshots/22-pumpmatch-expanded-light.png) |

- [Browse all screenshots](artifacts/screenshots/)
- [View the contact sheet](artifacts/screenshots/contact-sheet.png)
- [Download the visual documentation PDF](artifacts/screenshots/gymmice-visual-documentation.pdf)

## Tech Stack

- Expo SDK 57 and React Native
- React, TypeScript, and Expo Router
- React Native Reanimated and Gesture Handler
- AsyncStorage for saved appearance preferences
- pnpm workspaces

The repository also includes an Express API scaffold, shared packages, and a separate design preview sandbox.

## Run Locally

### Requirements

- Node.js 24
- pnpm 10
- Expo Go for a physical-device preview, or a web browser

### Setup

```bash
git clone https://github.com/midozouari/GymMice-Journey.git
cd GymMice-Journey
pnpm install
pnpm --filter @workspace/mobile exec expo start
```

Scan the QR code with Expo Go, or press **w** to open the web preview.

For web preview only:

```bash
pnpm --filter @workspace/mobile exec expo start --web
```

These commands run Expo directly. The package's `dev` script is configured for the Replit environment.

## Project Structure

```text
artifacts/
  mobile/          # Main Expo app
  api-server/      # Express API scaffold
  mockup-sandbox/  # Design previews
  screenshots/    # PNG captures, contact sheet, and PDF
lib/              # Shared API and database packages
scripts/          # Workspace utilities and screenshot export scripts
```

## Development

Check the mobile app's TypeScript:

```bash
pnpm --filter @workspace/mobile run typecheck
```

Check the whole workspace:

```bash
pnpm run typecheck
```

### B02 quality gates

Use Node 24 and the pinned pnpm 10.26.1 (`packageManager`), then
`pnpm install --frozen-lockfile`.

```bash
pnpm run check:api-contract
pnpm run test:mobile
pnpm run test:api
pnpm run build:ci
```

**API test prerequisite:** provision a disposable, isolated local PostgreSQL
database named `gymmice_test` on `127.0.0.1:55432`, with a dedicated login
`gymmice_test` (no superuser, create-database, create-role, replication or RLS
bypass privileges). It needs database CONNECT/TEMPORARY, public-schema USAGE, and
SELECT on the B06 catalog tables. Apply migrations and seed with the separate
restricted `gymmice_migrator` identity before API tests. Prefer
`pnpm run test:db --api`, which provisions and cleans up the entire disposable
database and supplies both test identities. Inject its password-bearing
`TEST_DATABASE_URL` through your environment/secret manager using exactly
`postgres://gymmice_test:<password>@127.0.0.1:55432/gymmice_test` with no query
parameters. Do not copy a development, preview or production URL. Tests reject
unsafe/missing configuration before connecting and do not fall back to
`DATABASE_URL`. Do not print URLs or store credentials in tracked files.

The contract gate validates OpenAPI with SwaggerParser, runs the existing
`pnpm --filter @workspace/api-spec run codegen`, then compares file paths and
contents before/after in both generated directories, including untracked files,
additions and deletions. An already-refreshed uncommitted baseline is allowed;
no staging or commits are performed. Review regenerated sources; never hand-edit
them. The CI build compiles shared libraries, API and Canvas,
then exports Expo iOS, Android and web without the Replit-dependent mobile build script.

GitHub CI runs five independent jobs on every pull request and pushes to `main`:
typecheck/contract, API tests, mobile tests, builds and migrations. API tests and
migration tests have separate, fresh PostgreSQL 16.13 services bound to loopback.
Only their test steps receive masked, disposable test URLs. The B02 API identity
remains restricted; only the separate B03 migrator gets schema-creation privileges.
CI performs migrations only in its disposable test database, never a deployed
environment. The API job now uses the same migration/seed harness before testing
catalog endpoints. It performs no schema push, deployment or post-merge hook.

### B03 database migrations

```bash
# Offline: generate SQL from the schema, then review the generated files.
pnpm --filter @workspace/db run migrations:generate
# Offline: validate committed migration history.
pnpm --filter @workspace/db run migrations:check
# Creates an isolated disposable local database, checks history and runs DB tests.
pnpm run test:db
```

The test harness requires local PostgreSQL tools and owns its disposable cluster;
it must not reuse a running development/preview database. CI supplies its separately
bootstrapped service using `pnpm run test:db --external-disposable`; this opt-in
accepts only the strict test target and separate runtime/migrator test identities.
Neither mode may fall back to a deployed URL.

Connected `migrations:status` and `migrations:run` require explicit
`--environment test|development|preview`; production is rejected. Runtime
credentials and migration credentials are separate. There are no startup
migrations, automatic schema pushes, feature tables or UI changes in B03.
The post-merge script now only installs frozen dependencies.

See the [database operations runbook](docs/backend/database-operations.md) for
configuration, review/apply/status commands, disposable recovery drills and the
managed-production publishing boundary. B03 validation uses disposable data only;
it does not configure or certify production.
Replit-managed production schema changes use the supported Publish process,
not a custom production migration command. External production arrangements
require separate approval; this runner rejects production.

### B04 API validation, errors and readiness

Every API response receives a server-generated UUID in `X-Request-Id`; incoming
request IDs are ignored. API failures use the documented JSON envelope with a
stable machine-readable `error.code`, safe `error.message`, matching
`error.requestId`, and optional field-only validation `details`. Raw submitted
values, credentials, database URLs, internal exception messages and stack traces
must not be exposed in responses or logs.

JSON and URL-encoded request bodies are limited to 100 KiB. URL-encoded parsing is
also limited to 100 parameters and depth 5. Infrastructure handling distinguishes
malformed requests and JSON (400), oversized payloads (413), unsupported media
types or encodings (415), schema failures (422), unknown routes (404), unexpected
failures (500), and temporary unavailability (503). Authentication,
authorization, conflict and rate-limit behavior (401, 403, 409 and 429) remains
later endpoint work; B04 does not implement it.

`GET /api/healthz` remains a liveness check and never touches the database.
`GET /api/readyz` executes `SELECT 1` through B03's lazy runtime pool and restricted
runtime credentials. A database outage returns a sanitized 503 while liveness
remains healthy; each later request can recover once the database does. Concurrent
requests share only the currently in-flight probe—settled results are not cached.
Readiness never runs migrations, does not connect during startup, and becomes
unavailable without opening a new connection once graceful shutdown begins.

Startup configuration and listen failures terminate nonzero with sanitized
diagnostics. B04 reuses B03's existing five-second connection acquisition,
ten-second query, database close, and HTTP-first graceful-shutdown behavior; it
does not add feature endpoints/tables, authentication, UI integration, migration
or deployment automation, or another CI service. The OpenAPI contract and
generated clients are checked by the existing B02 contract gate.

### B06 public workout templates

Home's existing workout card now reads the public database-backed catalog through
the generated client and B05 transport. It selects `push-day` when available,
otherwise the first template returned in slug order, and handles loading, empty,
unavailable, Retry, and Refresh states without a hardcoded fallback.

The controlled MVP seed contains Push Day and its seven exercises. It is a demo
template, not a personalized recommendation. API durations use seconds; Home
displays minutes. Public routes are read-only:

- `GET /api/workout-templates` — up to 100 summaries in deterministic slug order.
- `GET /api/workout-templates/{id}` — a UUID-keyed template with ordered exercises.

Seeding is an explicit, repeatable command after reviewed migrations, never an
API-startup or deployment hook. It preserves existing catalog edits and grants
runtime only SELECT on catalog tables. No auth, schedule, session, or history
behavior is changed. See [B06 setup and acceptance](docs/backend/workout-templates.md).

## Notes

### B05 Expo native/web connectivity

The app uses the generated API client with an explicit public
`EXPO_PUBLIC_API_ORIGIN`, bounded health checks, safe connection feedback, and
manual retry. Health success means API liveness, not database readiness.
See [client connectivity](docs/backend/client-connectivity.md) for configuration,
native/web differences, public-variable limits, and acceptance checks.

- Screenshots document the current prototype, not every possible state.
- The screenshot scripts use a local Expo web server at port `18115` and require Playwright Chromium.
- Real accounts, live data, and payments need backend integration before production use.
