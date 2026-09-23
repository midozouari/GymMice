# B05 client connectivity

## Configuration

Set `EXPO_PUBLIC_API_ORIGIN` explicitly for both native and web before starting
Metro or exporting the app. This public value is an origin only: scheme, hostname,
and optional port. A root trailing slash is accepted; paths (including `/api`),
credentials, queries, and fragments are not. The generated client supplies
`/api/healthz`, so the prefix occurs exactly once.

Use HTTPS for preview and production. HTTP is only a local-development exception.
For local development, a browser on the API machine can use
`http://localhost:8080`; a physical phone needs that machine's reachable LAN
address or an approved HTTPS tunnel. A phone's localhost is the phone itself.
Use the actual API workspace origin for preview, not the separate Expo origin.
Never infer a production origin or silently fall back to one.

Missing/invalid configuration disables API checks and shows a configuration
message without preventing local app navigation. Configuration errors do not
echo the rejected value. Do not create credential-bearing environment files.

Expo public variables are embedded at build time and are not secrets. Restart
Metro after changing them and rebuild distributed apps. Changing server settings
does not update an installed bundle. Never expose database URLs, migration
credentials, server authentication keys, or Expo session secrets as public
variables. The mobile dependency graph must not import server or DB modules.

## Behavior and boundaries

The existing generated health client and React Query provider are reused.
Each request attempt has a ten-second timeout, including response-body reading.
Caller cancellation is preserved. Only the health query retries transient
network/timeout and HTTP 502/503/504 failures, at most twice, with backoff.
Cancellation, invalid configuration, ordinary 4xx responses, malformed responses,
and mutations do not receive automatic retries from this feature.

The app exposes a small accessible connection status and explicit Retry action.
Local navigation, appearance settings, and existing device-local data continue
to work when the server is unavailable. This does not make demo data server data.
There is no offline write queue, synchronization, authentication, or persistence.

Browser online/offline events provide connectivity hints, not proof of server
reachability. Native connectivity remains unknown until a request succeeds or
fails; no new native dependency is required. Native failures are described as
unreachable, not conclusively offline. Rechecks on app resume and manual Retry
provide recovery. DNS, TLS, CORS, and server failures cannot reliably be
distinguished from a browser fetch rejection.

Only safe controlled messages and validated request IDs may be displayed.
Never log raw error objects, response bodies, URLs, credentials, or stacks.
The B04 error envelope remains authoritative; unexpected payloads receive generic
messages rather than displaying proxy HTML or arbitrary server text.

`/api/healthz` proves API liveness only. It never checks database connectivity.
Do not replace it with `/api/readyz` for this feature. B03 lifecycle and migration
infrastructure, OpenAPI, generated sources, and feature APIs remain unchanged.
Current unauthenticated CORS behavior is sufficient for this request; production
allowlist hardening belongs to B18.

## Validation

Run the existing gates after implementation changes:

```sh
pnpm run typecheck
pnpm run check:api-contract
pnpm run test:db --api
pnpm run test:mobile
pnpm run build:ci
git diff --check
```

The DB/API gate must use its disposable harness, never development or production
databases. Tests should cover configuration, actual generated URL construction,
timeout and abort cleanup, bounded retries, malformed responses, safe error
messages, network state changes, manual retry, and server-only import leakage.
Inspect exported web, Android, and iOS artifacts for server-only references and
synthetic leak markers without reading actual secret values.

Acceptance additionally requires a real browser and physical phone against the
approved non-production origin: verify health success, unreachable-server
feedback, offline behavior, and recovery. Record these results separately from
automated tests. A simulator, successful export, or mocked health call does not
prove physical-phone connectivity. Production deployment is not part of B05.