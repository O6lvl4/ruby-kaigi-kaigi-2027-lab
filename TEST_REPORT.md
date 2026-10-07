# Verification report

Date: 2026-10-07 UTC

## Summary

- PASS: production Vite build
- PASS: 18 integration assertions using genuine Ruby/Rails, PGlite and DuckDB WebAssembly in Node
- PASS: separate-process PGlite filesystem close/reopen and reconstruction of DuckDB derived aggregates
- PASS: JavaScript syntax checks
- PASS: npm audit reports zero known npm dependency vulnerabilities at check time
- NOT VERIFIED: actual browser boot, browser worker asset loading, IndexedDB writes, browser close/reopen restoration, visual/responsive QA
- BLOCKED: dot cloud browser local preview access and shell-launched Chromium in this environment

Do not describe this as a browser-verified working demo. It is a source-complete browser prototype with passing non-browser Wasm integration checks.

## Observed passes

Write process (14 assertions): fresh empty database; three valid Rails creates; Rails HTTP 422 for blank name, negative capacity, negative cost, invalid category, duplicate name; safe quoted/template/HTML-like string round trip; genuine wasm32-wasi runtime; four readable records; direct PGlite count agrees; actual DuckDB-Wasm aggregation matches.

Reopen process (4 assertions): genuine runtime; all four records survive process/database close and reopen; direct PGlite count agrees; DuckDB rebuild produces the same totals.

Expected/observed totals:

| Category | Count | Capacity | Cost (JPY) |
|---|---:|---:|---:|
| hotel | 1 | 10 | 20,000 |
| venue | 3 | 130 | 270,000 |

Machine-readable assertions and runtime versions are in evidence/integration-write.json and evidence/integration-reopen.json. Full successful logs and build/audit outputs are included.

## Browser QA blocker

The available cloud browser rejected the local preview with ERR_BLOCKED_BY_CLIENT. A separate Chromium test process failed because its socket creation was not permitted. No proxy, tunnel, alternate address or public deployment was used to bypass those restrictions. No screenshots are claimed. The browser E2E script is supplied for a normal developer environment.

## Integration defects found and corrected

1. Rails needed a database configuration and explicit adapter registration when starting our own application rather than the bundled blog
2. Upstream PGlite's escape stub returned a quote unchanged, producing SQL syntax errors for O'Reilly. The vendored adapter now doubles single quotes with standard_conforming_strings on, and prepared statements are enabled. The regression fixture passes
3. JSON import into an existing DuckDB table had column-order/extension issues. Derived records now use prepared INSERT statements, requiring no downloaded JSON extension
4. This prebuilt Ruby runtime crashed while parsing timestamp fields from the database. The first-slice schema intentionally omits timestamps; general date compatibility is not fixed or claimed
5. Initial development dependencies had audit findings; Vite and Playwright were updated and the final npm audit is zero

## Still required before claiming the user's full acceptance criteria

Run npm run test:e2e successfully in a browser-capable environment, including an actual browser-process shutdown and relaunch. Review desktop/mobile screenshots and verify all runtime assets load. A Node filesystem reopen is useful evidence but does not establish browser IndexedDB durability.
