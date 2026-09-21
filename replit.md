# GymMice

GymMice is an Expo fitness-app prototype with local/mock feature data and an
Express/PostgreSQL backend scaffold. The backend MVP is not implemented yet.

## Backend foundation

The source of truth for scope, environments, configuration, ownership, time,
units, privacy and API-error policy is
[docs/backend/mvp-foundation.md](docs/backend/mvp-foundation.md).

- Clerk is the project owner's confirmed authentication-provider choice.
  Provider provisioning and integration belong to B07–B08; no auth exists yet.
- B01 defines rules only. B02–B20 own implementation. Do not add authentication,
  tables, migrations, feature endpoints, API integration or data import as B01 work.
- Preserve existing UI and device-local data. Legacy AsyncStorage records have
  no verified account owner and must not be automatically claimed or uploaded.
- Private server records must belong to a verified internal user. Never trust
  client-supplied ownership or use mock data as successful backend responses.

## Run & Operate

- API entry requires `PORT`; the API artifact declares `8080`, not a source-code
  default of `5000`. For a deliberately started local API:
  `PORT=8080 pnpm --filter @workspace/api-server run dev`.
  This command builds output and starts a service; it is not documentation validation.
- Mobile and Canvas artifact configurations declare `18115` and `8081`.
- `GET /api/healthz` is the only existing API route. It is not database readiness.
- DB access is lazy and server-only. Runtime uses `DATABASE_URL`; migration
  tooling uses separate `MIGRATION_DATABASE_URL`. Select runtime `DB_ENV`
  explicitly (only `NODE_ENV=test` permits an implicit test environment).
  Non-test connections require `DB_ALLOWED_TARGET` as `host:port/database`.
  Never put connection secrets in mobile configuration, source, or logs.
- `EXPO_PUBLIC_API_ORIGIN` is the documented future B05 client setting, **not yet
  consumed**. It is an origin without `/api`; generated routes already include
  that prefix. Native clients need a reachable API host, not their own localhost.
- Development, isolated testing, preview and production must not share production
  records or credentials. Use the environment matrix in the foundation document.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 57, React Native, Expo Router, AsyncStorage
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- API build: esbuild; production entry is `artifacts/api-server/dist/index.mjs`

## Where things live

- `artifacts/mobile/`: existing app, routes, local storage and demo constants.
- `artifacts/api-server/`: server scaffold and health endpoint.
- `lib/db/`: server-only DB package, reviewed versioned migration tooling;
  no MVP feature tables yet.
- `lib/api-spec/openapi.yaml`: authoritative implemented API contract.
- `lib/api-spec/orval.config.ts`: generated client and Zod configuration.
- `lib/api-client-react/`: generated client plus shared custom transport.
- `lib/api-zod/`: generated runtime schemas.
- `artifacts/mockup-sandbox/`: separate design-preview tool.
- `artifacts/screenshots/`: visual documentation linked by README.
- `docs/backend/mvp-foundation.md`: B01 decisions and later-ticket boundaries.
- `docs/backend/database-operations.md`: B03 configuration, migrations and recovery.

## Gotchas

- B02 gates: `pnpm run typecheck`, `pnpm run check:api-contract`,
  `pnpm run test:api`, `pnpm run test:mobile`, and `pnpm run build:ci`.
  Use Node 24 and pinned pnpm 10.26.1 with a frozen lockfile.
- API tests require a separately provisioned disposable PostgreSQL database and
  restricted `gymmice_test` login at `127.0.0.1:55432/gymmice_test`.
  Inject `TEST_DATABASE_URL` with no URL parameters; never reuse deployed data or
  credentials, print the URL, or rely on `DATABASE_URL` fallback. See README for
   required privileges. The B02 API job creates only this ephemeral identity,
   not app schema; it receives no migration privileges.
- Contract checks validate OpenAPI before codegen and compare generated paths and
  contents before/after, including untracked additions/deletions; refreshed
  uncommitted baselines are allowed without index changes.
   CI builds shared libraries, API, Canvas and Expo iOS/Android/web. A fifth,
   isolated migrations job applies migrations only to fresh disposable PostgreSQL
   16.13 with separate restricted runtime and migrator roles. No job runs DB push,
   deployment, deployed-environment migrations or the post-merge hook.

- `pnpm run typecheck` can emit incremental/library output; `pnpm run build`
  builds packages. Neither is necessary for documentation-only B01 validation.
- `pnpm --filter @workspace/api-spec run codegen` rewrites generated files.
  Keep generated sources tracked and do not hand-edit them.
- B03 offline commands: `pnpm --filter @workspace/db run migrations:generate`
  and `pnpm --filter @workspace/db run migrations:check`. Review generated SQL.
- `pnpm run test:db` creates a disposable local database and runs the DB gate.
  CI alone supplies a fresh service via `pnpm run test:db --external-disposable`.
  Test credentials are `TEST_DATABASE_URL` (role `gymmice_test`) and
  `TEST_MIGRATION_DATABASE_URL` (role `gymmice_migrator`), both restricted to
  `127.0.0.1:55432/gymmice_test` with `NODE_ENV=test`.
- Connected migration status/run require explicit `--environment`
  `test|development|preview`; production is forbidden. B03 validation must stay
  disposable. See the operations runbook before any connected operation.
- No DB push scripts, startup migrations or migration hooks are supported.
  `.replit` points to `scripts/post-merge.sh`, which only installs frozen
  dependencies. Do not run it as a documentation check.
- Root ignore rules do not fully protect all local environment-file variants.
  Do not create real credential files; use environment/secrets injection.
- Do not rename `artifacts/` or reorganize the workspace as backend foundation
  work; manifests, workspace globs, build paths and docs depend on this structure.
- B01 validation is limited to documentation/path checks and `git diff --check`.
  Leave all changes uncommitted until the project owner reviews and approves them.

## Pointers

- [README.md](README.md): current prototype, screenshots and development entry points.
- [Backend foundation](docs/backend/mvp-foundation.md): MVP/environment/data rules.
