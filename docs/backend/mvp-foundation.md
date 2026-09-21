# Backend foundation: MVP scope, environments, and data rules

## Status and implementation boundary

This is the B01 decision document for GymMice. It defines the target backend,
not functionality already delivered. Clerk was confirmed by the project owner
as the authentication provider. The remaining rules below are the B01 baseline
submitted for review; they do not provision services or change application behavior.

The existing [B01–B20 GitHub issues](https://github.com/midozouari/GymMice/issues)
were reviewed before writing this document. B01 is documentation only.
No authentication, tables, migrations, endpoints, client integration, imports,
or UI changes are introduced here. B02–B20 remain separate work.

## 1. Verified current state

| Area | What exists now |
| --- | --- |
| Mobile app | Expo Router screens under `artifacts/mobile/app/`; feature data is mock, transient React state, or device-local AsyncStorage. |
| Authentication | Sign-in/sign-up and social sign-in controls navigate between screens. They do not verify credentials or establish sessions. Password input is transient component state, not a backend credential store. |
| API | Express scaffold under `artifacts/api-server/`, mounted at `/api`. Only `GET /api/healthz` is implemented. It does not check database readiness. |
| Database | PostgreSQL/Drizzle package under `lib/db/`; schema is a placeholder. The health route does not query the database. |
| API contract | `lib/api-spec/openapi.yaml` describes health only. Orval generates React Query client code and Zod schemas. |
| Client integration | `lib/api-client-react/src/custom-fetch.ts` supports `setBaseUrl` and a token getter, but mobile does not currently configure or call the generated client. |
| Infrastructure | Artifact manifests define development and production commands. Their existence does not mean the MVP is production-ready or that a production URL/database has been verified. |
| Design sandbox | `artifacts/mockup-sandbox/` is a separate Canvas tool, not the mobile app's backend. |

The current UI must remain intact during B01. In particular, documenting a feature
as demo-only does not authorize hiding or deleting its screen.

## 2. MVP scope

### Included in the target MVP

| Capability | Existing feature or gap | Delivery boundary |
| --- | --- | --- |
| Accounts and sessions | Existing login/signup screens are demos. | Verified identity, email verification/recovery, native/web sessions, and safe logout: B07–B08. |
| Onboarding and private profile | Existing onboarding is local; profile includes hardcoded presentation. | Allowlisted account profile, resumable onboarding, profile editing: B09; optional legacy import: B11. |
| Public workout catalog | Home displays a static workout, including Push Day. | Database-backed exercises/templates, safe seeding, public read-only access: B06. |
| Private one-off schedule | Week/month views and local custom events already exist. | Owner-scoped event CRUD and shared Home/calendar data: B10–B12. |
| Workout recording and history | Current overview is not durable workout logging. | Active/completed/discarded sessions, recorded sets, resume/history and reliable retries: B13–B14. |
| Real progress | Existing statistics/charts are synthetic. | Weekly counts, last workout, exercise records/progress and timezone-aware streaks derived from saved workouts: B15. |
| Appearance and usability | Light/dark modes and five palettes already work locally. | Preserve these settings and accessibility; honest loading/empty/error states and demo treatment: B16. |
| User data rights | No export/deletion service exists. | Private export and confirmed account deletion with safe failure handling: B17. |
| Release safety | Scaffold is not sufficient for a real-user release. | Tests/CI: B02; migrations: B03; API rules: B04; connectivity: B05; hardening, recovery tests and release checks: B18–B20. |

### Future or demo-only, not backend MVP services

- Social feeds, stories, reactions, comments, and post publishing.
- Pump Match, matching/likes, partner discovery, and live messaging/DMs.
- Nutrition tracking, recipe services, meal planning, and water/calorie records.
- Shop inventory, persistent carts, payments, checkout, and fulfillment.
- Push notifications, reminders, recurring events, external calendar sync,
  and AI scheduling/coaching.
- Medical-history processing and physique-photo uploads.

These screens remain unchanged in B01. B16 owns the explicit hide/demo-label
decision before release. Mock people, posts, messages, products, nutrition data,
sample schedule events, and synthetic achievements must never be presented as
real account records or seeded into private production data. The reviewed public
workout catalog is the explicit exception: B06 will define its controlled seed.

## 3. Authentication and ownership

### Confirmed provider decision

Use **Clerk** as the managed identity provider, not custom password storage.
Implementation and provider provisioning belong to B07–B08, not B01.
Email/password, verification and recovery form the baseline; existing Apple/Google
buttons are not evidence that those providers are configured.

The API must verify provider-issued credentials and resolve an internal user
linked to the verified provider subject. Clients cannot assign ownership by
sending a `userId`, email address, device ID, or local onboarding value.
Native and web session handling must use the provider-supported secure mechanisms;
never persist passwords or raw session tokens in AsyncStorage.

Development/test identities and production identities must be isolated.
Use the supported connection/secrets setup when implementing auth; no keys,
tenant configuration, callbacks, or SDK dependencies are added in B01.

### Data classes

| Class | Examples | Access and ownership rule |
| --- | --- | --- |
| Public, server-controlled | Published exercise/workout templates; minimal health status. | Anonymous reads may be allowed. Public does not permit anonymous or ordinary-user writes. Template publishing/seeding is controlled server-side. |
| Authenticated identity/security data | Provider subject mapping, account state, session verification metadata. | Server/provider-controlled; authentication does not make this information readable by other users. Never expose credentials. |
| Private, user-owned records | Profile, onboarding answers approved for upload, custom events, workout sessions/sets, progress and exports. | Every record must belong to a specific verified internal user. Scope reads and writes, including joins and child records, to that owner. |
| Device-local data | Appearance preferences, legacy onboarding/events/deletion markers, local image references and unsent drafts. | Not evidence of authenticated ownership. Do not claim, upload, delete, or expose it to another account automatically. |
| Demo data | Mock profiles/messages/social data, generated calendar examples, synthetic statistics and products. | Demo only. Never merge into genuine private account records. |

Use server-derived ownership on creation and enforce it again on lookup/update/
delete/export. A guessed record ID must not reveal another user's record or its
existence. Cross-owner child references must be rejected. Profiles are private
by default; no public/social profile service is included in the MVP.

## 4. Environments and configuration

### API address contract for B05

Reserve `EXPO_PUBLIC_API_ORIGIN` for the **origin only**: scheme, host and optional
port, with no `/api` suffix, path, credentials, query, or fragment. It is public
configuration, not a secret. It is **not read by mobile today**.

The generated client already requests `/api/healthz`; the current custom fetcher
prepends the configured origin. B05 must validate the value and configure the
client so `/api` occurs exactly once.

For example, origin `http://localhost:8080` plus generated `/api/healthz` gives
`http://localhost:8080/api/healthz`, not `/api/api/healthz`.
An explicit origin is required for native clients. Same-origin browser requests
are valid only where that browser's origin actually routes `/api` to this API.
Do not assume the separate Expo preview domain also hosts the API.

| Environment | API URL policy | Database and identity policy |
| --- | --- | --- |
| Local development | Set server `PORT` explicitly, e.g. `8080`. Browser on the same computer may use `http://localhost:8080`. A physical phone needs a reachable LAN host or approved HTTPS tunnel; its `localhost` is the phone. | `DATABASE_URL` must point to a disposable/non-production developer database. Use development auth configuration only. No implicit production fallback. |
| Automated testing | B02 will assign an isolated API port/origin and test harness. No test infrastructure is created by B01. | Dedicated test database via `TEST_DATABASE_URL`; the future harness must deliberately pass it as `DATABASE_URL` to the tested server and refuse production targets. Use provider test identities/fixtures, never real user sessions. |
| Replit / preview | API artifact declares port `8080` and route prefix `/api`; mobile declares `18115`; Canvas declares `8081`. B05 will set the public API origin to the actual reachable API workspace host, not a guessed Expo host. | Non-production database and auth only. Server settings come from environment/secrets, not source files. Preview databases must not share production credentials or user records. |
| Production | Use the verified published HTTPS API origin. Do not use a development hostname or invent a production URL. Native/web builds must receive production public configuration and matching approved origins/callbacks. | Dedicated production database and production auth credentials, isolated from development/testing. Reviewed migrations, backup/recovery, HTTPS and readiness verification are B03/B18/B20 gates. |

No live hostname or database connection has been configured or verified by B01.
HTTP is a local-development exception only. Client-visible Expo configuration is
embedded in the app bundle; changing a server environment variable alone does not
retroactively update an already distributed native bundle.

### Environment-variable inventory

Names below are configuration documentation, **not assignments or real values**.

| Name | Visibility | Current status / rule |
| --- | --- | --- |
| `PORT` | Server/tool configuration | Currently required by the API entry point. Artifact configuration supplies API `8080`; each service has its own port. There is no API source-code default of `5000`. |
| `DATABASE_URL` | Server secret | Currently read by the DB package and Drizzle configuration, not by mobile. Required for DB operations; health success alone does not verify it. Never put it in an `EXPO_PUBLIC_*` variable. |
| `NODE_ENV` | Server configuration | Existing API development/production commands set it appropriately. It is not sufficient to prove which database is connected. |
| `LOG_LEVEL` | Server configuration | Existing API logger setting; default is `info`. Logs must still be redacted regardless of level. |
| `BASE_PATH` | Service/tool configuration | Existing artifact routing/build setting. Not the mobile API origin; do not append it blindly to generated API routes. |
| `EXPO_BUILD_PORT` | Build configuration | Existing mobile build override for Metro; not the API port. Avoid collisions with running services. |
| `REPLIT_DEV_DOMAIN`, `REPLIT_EXPO_DEV_DOMAIN`, `REPLIT_INTERNAL_APP_DOMAIN`, `REPL_ID` | Platform/tool configuration | Existing preview/build inputs. None automatically establishes the mobile client's API URL. |
| `EXPO_PUBLIC_DOMAIN`, `EXPO_PUBLIC_REPL_ID` | Public build metadata | Existing build-script inputs/fallbacks; not credentials and not the proposed API-origin setting. |
| `REPLIT_EXPO_SESSION_SECRET` | Tooling secret | Existing Expo launch tooling input. Not an application login credential or Clerk key; never expose or commit it. |
| `EXPO_PUBLIC_API_ORIGIN` | Public client configuration | Reserved B01 contract; consumer and validation deferred to B05. No app behavior changes until implemented. |
| `TEST_DATABASE_URL` | Test-runner secret | Reserved for B02 isolation; no test runner currently consumes it. |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public client configuration | Planned Clerk client setting for B08; not a secret. Obtain correct environment-specific configuration during setup, never substitute the server secret. |
| `CLERK_SECRET_KEY` | Server secret | Planned server/provider administration credential for B07 where needed; not currently consumed. Verification configuration must be scoped to the intended issuer/environment. |
| `CORS_ALLOWED_ORIGINS` | Server configuration | Reserved explicit browser-origin allowlist for later implementation. Current API uses permissive CORS; no allowlist enforcement is added here. |

Local environment files, if used in later work, must stay untracked. Do not assume
ignore coverage: the current root `.gitignore` does not provide complete portable
`.env.*` protection. Prefer environment injection; do not create credential files
as part of B01. Do not log environment dumps or connection strings.

Production readiness is a future acceptance gate, not a claim made by this
document. Missing/invalid configuration must fail explicitly; never fall back
to a production database, anonymous private writes, or mock "successful" saves.

## 5. Existing local data and safe transition rules

Current AsyncStorage keys have no verified account owner:

| Key | Current contents / source | B01 preservation and future treatment |
| --- | --- | --- |
| `@gymmice_onboarding` | `OnboardingData` in `artifacts/mobile/constants/onboardingData.ts`; saved by `app/onboarding.tsx`. Includes gender, height/weight, description, sport/experience/preferences, frequency/goal, chronic-illness text, image URI, palette and completion state. | Preserve the complete stored object, including unknown fields. B09/B11 may import only explicitly approved profile fields. Never automatically upload free-text descriptions, medical text, or local image URIs. |
| `@gymmice_palette` | Palette choice from `context/ThemeContext.tsx`. | Preserve independently; remains a device preference for this MVP unless a later decision explicitly adds sync. |
| `@gymmice_theme_mode` | Light/dark choice from `context/ThemeContext.tsx`. | Preserve independently; do not reset when introducing the backend. |
| `@gymmice_custom_events` | Custom event objects from `app/schedule.tsx` and `constants/scheduleData.ts`, also read by Home's `hooks/useScheduleEvents.ts`. | Preserve IDs, dates, times, title/category, notes/source and unknown fields. Later import only genuine user-created events with an explicit reviewed field allowlist; arbitrary notes must not be silently uploaded. |
| `@gymmice_deleted_event_ids` | Local deletion markers for base/custom events. | Preserve markers, including mock-event IDs, so hidden demo events do not reappear. Do not interpret these as server deletion instructions. |

The schedule merges generated demo events and genuine custom events. They must be
distinguished before any import. Current social interactions, messages, shop cart,
matching activity and chart selections are transient/demo state, not durable
workout history or account-owned records.

B11 must follow these rules:

1. Do nothing to existing local data merely because the API/auth becomes available.
2. After verified login, explain the destination account and ask whether to import
   or skip. Device storage alone cannot prove who created the data.
3. Skip leaves legacy data unchanged. A different account must not silently claim
   it. Do not display legacy private content inside a signed-in account as if it
   were that account's server data.
4. Read/version/validate non-destructively. Keep original keys and values intact;
   malformed or ambiguous records require review, not deletion or coercion.
5. Preview and allowlist uploaded fields. Medical text, free-text descriptions,
   local image references and demo records are excluded from automatic import.
   No photo upload or medical-data service is part of this MVP.
6. Import only to the verified owner with stable import identifiers. Retries and
   interruption must not create duplicate profiles/events or partial fake success.
7. Retain originals at least until server acknowledgement and reconciliation.
   No automatic clearing is authorized here, even after a successful import.
8. B08 may clear newly created account-scoped caches/session drafts on logout,
   but must not indiscriminately clear all AsyncStorage or the legacy keys above.
   Failed writes retain recoverable drafts without leaking them across accounts.

## 6. Time, measurements, privacy, and API behavior

### Time and dates

- Server audit timestamps and workout instants use UTC, serialized as ISO 8601
  with an explicit offset (`Z` for UTC); never rely on the server machine timezone.
- Each account has an explicitly confirmed IANA timezone. The device zone may
  suggest a default; UTC is the explicit fallback when unavailable, not a silent
  assumption about an existing user's schedule.
- One-off timed events carry a local calendar date/time and IANA zone; resolve
  them to an unambiguous instant. Reject or ask about nonexistent/ambiguous
  daylight-saving times rather than silently shifting them.
- Date-only values remain `YYYY-MM-DD` calendar dates, not midnight timestamps.
  Legacy date/time strings must not be reinterpreted during B01.
- Week-based progress uses Monday as the week start and the user's timezone.
  Streaks use that zone's calendar days, not fixed 24-hour UTC intervals.
  Completed, non-deleted workouts are the progress source; discarded records
  and mock events do not contribute.

### Measurement units

- Canonical profile units: height in centimetres and body weight in kilograms,
  matching current `heightCm`/`weightKg` fields.
- Workout payloads must use explicit units: kilograms for canonical loads,
  seconds for duration, metres for distance, and integer repetitions/counts.
- Keep the entered unit/value or an equivalent immutable snapshot in historical
  workout records so later display preferences/template edits do not change
  recorded meaning. Display conversions must not repeatedly round stored values.
- A unitless legacy number must never be guessed to be kilograms or pounds.
  Later APIs must reject non-finite/invalid values and define field-specific bounds.
  No conversion, schema, or input behavior is implemented in B01.

### Privacy and retention

- Collect the minimum fields necessary for the approved feature. Fitness/profile
  information is private by default; medical text and image references remain
  local and excluded from automatic migration.
- Secrets, passwords, session tokens, raw request bodies with private fields,
  medical text, and credential-bearing URLs must not appear in logs.
  Request IDs and non-sensitive operational metadata are sufficient for tracing.
- B17 owns authenticated export and confirmed deletion. Document retention and
  backup-expiry behavior before release; never promise immediate backup erasure
  without an implemented policy. B20 must verify the release/recovery policy.
- Export must contain only the requesting user's information; account switching,
  caching, retries and error handling must never reveal another user's records.

### API error contract to implement in B04 and later endpoints

Adopt a consistent JSON envelope with `error.code` (stable machine-readable code),
`error.message` (safe user-facing explanation), and `error.requestId` (correlation
ID). Optional `error.details` contains safe field validation metadata only,
never raw submitted secret/private values. Successful responses remain defined
per endpoint in OpenAPI.

| HTTP status | Intended meaning |
| --- | --- |
| `400` | Malformed request or invalid JSON. |
| `401` | Missing, invalid, or expired authentication. |
| `403` | Authenticated caller lacks permission for an action. |
| `404` | Unknown resource, including a private resource outside the caller's ownership. |
| `409` | Stale update, conflicting state, or conflicting retry identity. |
| `413` | Request exceeds the accepted size limit. |
| `422` | Well-formed request fails field/domain validation. |
| `429` | Rate limit; provide safe retry guidance. |
| `500` / `503` | Unexpected failure / temporary unavailability; no internal details or stack traces. |

No error middleware or readiness endpoint is added in B01. B04 must codify this
contract in OpenAPI and implementation together. Clients must distinguish
network/offline failures from HTTP rejections, preserve unsaved input, and never
report a failed write as saved. Automatic mutation retries require a documented
idempotency contract; do not blindly retry writes or replace failures with mocks.

## 7. Backend boundaries and source of truth

| Component | Responsibility |
| --- | --- |
| `artifacts/mobile/` | UI/navigation, input/draft state, local appearance, offline feedback and explicit import consent. Not authoritative for identity, ownership, permissions or durable server saves. |
| `artifacts/api-server/` | Verify identity, derive ownership, validate requests, enforce business rules, orchestrate persistence, calculate real progress, redact errors/logs and expose the contract. |
| `lib/db/` | Server-only schema, connection and persistence layer. Future versioned migrations belong to B03 and later schema tickets. Never import it into the mobile bundle. |
| `lib/api-spec/openapi.yaml` | Authoritative published API paths, payloads, responses, validation constraints and security/error declarations as they are implemented. Do not advertise unimplemented endpoints as live. |
| `lib/api-spec/orval.config.ts` | Code-generation configuration. |
| `lib/api-client-react/src/generated/` | Generated client/hooks and types used by mobile only after B05. No hand-edited endpoints or independent contract definitions. |
| `lib/api-client-react/src/custom-fetch.ts` | Shared transport boundary; later origin/session/error integration must match the contract, not bypass server authorization. |
| `lib/api-zod/src/generated/` | Generated runtime schemas for API validation. Schemas do not replace authentication, ownership checks or database constraints. |

Contract changes must be reviewed in OpenAPI, generated through the existing
Orval workflow, implemented and validated together in the relevant later ticket.
Keep generated source tracked under the current bootstrap process. B01 changes
none of the contract, generated outputs, transport code, or database schema.

## 8. B01 acceptance and safe validation

- [x] Current prototype and target MVP are distinguished.
- [x] Included and excluded features are mapped to B02–B20 without starting them.
- [x] Clerk provider choice is confirmed.
- [x] Local, test, preview and production rules and variable visibility are documented.
- [x] Ownership, local-data preservation, time, units, privacy and API errors are defined.
- [x] Repository documentation contains no real credential assignments.
- [ ] Project owner reviews and approves this documentation baseline before commit/push.

Validate this documentation with local-link/path checks, content review and
`git diff --check`. Do not run installs, builds, codegen, DB push, migrations,
seeding, deployment, or post-merge hooks for B01. In particular,
`scripts/post-merge.sh` installs dependencies and invokes a database push: it is
not a read-only validation script.