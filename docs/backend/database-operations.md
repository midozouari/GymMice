# Database operations (B03)

## Scope and safety boundary

B03 adds versioned PostgreSQL/Drizzle migration infrastructure, not MVP feature
tables, authentication, UI integration or API readiness behavior. Read the
[B01 foundation](mvp-foundation.md) and [B02 quality gates](../../README.md#b02-quality-gates)
first. B01 describes the historical scaffold; this runbook supersedes its
database-tooling and post-merge descriptions, not its privacy/scope rules.

All B03 connected validation is **disposable only**, using synthetic data.
No production database, real-user records or deployed credentials belong in
tests. Do not run migrations during API startup, builds, install/post-merge
hooks or custom publishing scripts. Schema push is not a supported workflow.

## Configuration and privileges

`getDatabaseConfig` separates runtime and migration access. Importing the DB
package does not connect; lazy runtime access requires explicit `DB_ENV`, except
that `NODE_ENV=test` permits the test default. Missing/unsafe configuration fails
closed; there is no fallback from test secrets to deployed secrets.

| Context | Required settings |
| --- | --- |
| Test runtime | `NODE_ENV=test`; `TEST_DATABASE_URL`, role `gymmice_test` |
| Test migrations | `NODE_ENV=test`; `TEST_MIGRATION_DATABASE_URL`, role `gymmice_migrator`; test URLs must identify the same database |
| Development / preview runtime | `DB_ENV=development` or `preview`, `DATABASE_URL`, explicit `DB_ALLOWED_TARGET` |
| Development / preview migrations | Explicit CLI environment, separate `MIGRATION_DATABASE_URL`, explicit `DB_ALLOWED_TARGET` |

Both test URLs must target exactly `127.0.0.1:55432/gymmice_test`, with passwords
and no URL query parameters. Never substitute `localhost`, another port, a real
database or a privileged login. Non-test `DB_ALLOWED_TARGET` is the exact
`host:port/database` allowlist value, not a credential or proof of production
safety. Inject secrets through environment/secret management, not tracked files,
command history or logs. Do not print connection strings or environment dumps.
Non-test runtime connections require role `gymmice_app`; migration connections
require `gymmice_migrator`. URLs must include an explicit port and password.
Remote connections verify TLS certificates; only loopback connections allow
plaintext transport.

Runtime must not own schemas or inherit migration privileges. Both CI logins
are NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION and NOBYPASSRLS.
Runtime receives database CONNECT/TEMPORARY and public-schema USAGE only.
Migrator receives database CONNECT/TEMPORARY/CREATE (CREATE is needed for
Drizzle's migration schema) and public-schema USAGE/CREATE. Public grants are
revoked. Future feature migrations must explicitly review application grants;
do not solve runtime permission failures by elevating the runtime identity.

## Review, generate, check, status and apply

From the repository root:

```bash
# Offline; requires no database credentials or connection.
pnpm --filter @workspace/db run migrations:generate
pnpm --filter @workspace/db run migrations:check

# Preferred B03 validation: owns a fresh disposable local database.
pnpm run test:db
```

Generation uses Drizzle Kit against the source schema and local history.
Review SQL and generated metadata together: intended objects only, no private
seed data, destructive operations, unexpected grants or environment-specific
names. Keep applied history immutable; add a new reviewed migration rather than
editing/deleting old SQL or rewriting the ledger.

For an explicitly provisioned **disposable test** database with both test secrets
already securely injected:

```bash
NODE_ENV=test pnpm --filter @workspace/db run migrations:status --environment test
NODE_ENV=test pnpm --filter @workspace/db run migrations:run --environment test
NODE_ENV=test pnpm --filter @workspace/db run migrations:status --environment test
```

Status inspects committed history against the database ledger; it is not the
offline check and requires a connection. Run takes a database advisory lock and
verifies ledger/history before applying pending migrations. Re-running current
history should be a no-op. On a mismatch, concurrent-run refusal, timeout or
other error, stop and investigate; do not repair by bypassing the checks.

The command interface also accepts explicit `--environment development` and
`--environment preview` for separately approved non-production operations with
their exact target allowlisted. That is not authorization to use those databases
for B03 validation. `--environment production` is rejected; do not relabel a
production target as development to evade this boundary.

## Test and CI gate

`pnpm run test:db` is the local disposable harness, including the offline history
check and database test runner. It requires local PostgreSQL tooling and must
fail rather than attach to an unrelated occupied target.

The fifth CI job has its own fresh PostgreSQL 16.13 service, loopback port 55432,
15-minute timeout and fail-closed bootstrap. It generates and masks independent
random passwords, then supplies only `TEST_DATABASE_URL` and
`TEST_MIGRATION_DATABASE_URL` to:

```bash
pnpm run test:db --external-disposable
```

This flag opts into the already-provisioned disposable service; it is not a
general external database override. Do not add a literal `--` before this flag.
The existing four B02 jobs remain separate, and the API-test runtime role is not
elevated. No deployed database secret is required by CI.

## Backup, restore and recovery drill

These are operator procedures to rehearse on isolated synthetic fixtures, not
evidence that managed backups or production recovery have been configured.

1. Create an isolated disposable source and a separate disposable restore
   destination under operator control. Do not reuse a development/preview
   database. Before any destructive action, verify database identity and role
   out of band. Never point test URLs at the restore destination unless it meets
   the strict test contract in a separate isolated instance.
2. Apply reviewed history to the source and create only synthetic fixture data.
   Record revision, migration hashes/ledger, PostgreSQL version and expected
   fixture counts/checksums, without secrets. Establish that runtime cannot
   perform DDL and migrator is not a superuser.
3. Use matching PostgreSQL backup tooling to take a consistent custom-format
   `pg_dump` of this synthetic source, including schema, synthetic data and
   migration ledger. Supply authentication privately; do not put URLs/passwords
   in command examples, logs or shell history. Restrict artifact access, record
   its checksum, and keep a separate manifest of required roles/grants since a
   database dump does not provision cluster roles.
4. Provision the destination's restricted roles separately. Restore the archive
   with `pg_restore` in an error-stopping mode into the empty disposable
   destination. Review ownership/grant mapping; never grant runtime DDL just to
   make restore succeed. Never restore over the source or an existing real
   environment as part of this drill.
5. Verify schema objects, synthetic row counts/checksums, grants and migration
   ledger against the manifest. In the isolated strict test target, run status
   and re-run current history to verify no pending work or duplicate application.
   Check runtime access and denied DDL separately. A successful restore command
   alone is not sufficient recovery evidence.
6. Record elapsed backup/restore/verification time, observed data-loss window
   and failures. Delete only the owned disposable instances and synthetic
   archives when the drill is complete. Do not infer a production RPO/RTO or
   backup retention policy from a small local exercise.

For a failed migration: stop subsequent migrations and rollout, preserve sanitized
diagnostics, and inspect committed SQL and ledger together. Transactional failure
should roll back its transaction, but verify actual state after a disconnect;
never assume that a timed-out client means the server did nothing. Do not delete
ledger rows, edit applied SQL, force-release another session's lock, or blindly
retry destructive work. Prefer a reviewed forward corrective migration after
rehearsal. If recovery requires restore, verify the backup in a new isolated
destination first, reconcile any post-backup writes and obtain explicit operator
approval before any environment switch. B03 supplies no automatic down migration
or data-loss rollback.

## Managed production publishing: intentionally blocked

The production provider, topology, database target and deployment operator are
not verified. Production migrations are deliberately unsupported by these
commands. No provider-specific deploy code, production URL or credential is
invented here.

Before future production publishing, the owner must select/verify the managed
provider, isolated runtime/migration roles, secret delivery and TLS policy;
configure backup retention/PITR where supported; approve measured restore
objectives; rehearse recovery; and approve reviewed SQL and rollout ordering.
For Replit-managed production, use Replit's supported Publish schema-change
process; do not create a custom production migration runner or deploy hook.
For an external production database, a separately authorized operator-controlled
process would need to be designed after confirming that provider. This runner
does not support either production execution path. Never migrate on startup or
from post-merge hooks. Keep schema changes compatible with the old and new
application during rollout, and plan forward recovery before approval.
Provider selection and these release gates remain unresolved; B03 does not
claim production readiness.

## API readiness integration (B04)

B04 layers an HTTP readiness probe onto B03 without changing database ownership,
configuration, credentials, pool construction, timeout policy or migration
behavior. `GET /api/healthz` remains process liveness and does not initialize the
database. `GET /api/readyz` lazily obtains the existing runtime pool and runs only
`SELECT 1` with the restricted runtime identity. It uses the existing five-second
connection-acquisition and ten-second query limits; migration credentials are
never used.

Concurrent readiness requests share an in-flight probe to avoid multiplying work.
The settled result is not cached, allowing the next request to recover after a
transient outage. Configuration, acquisition, query and shutdown failures return
a sanitized 503 API error and do not expose driver diagnostics, connection
strings or credentials. A database outage does not make liveness fail, terminate
the server, or trigger startup retries. Startup itself makes no readiness
connection and never runs migrations.

When shutdown starts, readiness changes to unavailable before HTTP draining and
does not start another probe. The existing B03 coordinator still owns shutdown:
stop intake and drain HTTP first, then close the database within its existing
deadline. B04 does not replace or duplicate that lifecycle.