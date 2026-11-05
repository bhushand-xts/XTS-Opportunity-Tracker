# Isolated visual test harness

This is a test fixture, never a production entry point or fallback. It uses the
real shared AppShell/shadcn UI and an isolated browser profile, with synthetic
Test Owner/Client data and a `GetOpportunityMenus` Apollo mock matching the shared
`menus(asTree: false)` discovery query. The mock includes the verified catalog
identities/status/routes: active 12 / Opportunities and 29 / Opportunity Management,
inactive 28 / Opportunity Tracking, and Administration's 5 / Permission Master.
Ordering and granted permissions are synthetic; the auth fixture grants both active
Opportunity keys. Prior visual captures used menu 12 and remain historical until
the harness is rerun against this discovery update. No reference sample identities,
real credentials or business data are copied into production.

Build from frontend: `node node_modules/webpack-cli/bin/cli.js --config ../docs/opportunity/visual/webpack.config.cjs`.
Then run `node docs/opportunity/visual/verify.cjs` from the repository root.
The verifier starts a temporary loopback server and headless Chrome with a dedicated
profile under this directory's ignored build folder, captures reference and app
viewports, measures page overflow and basic structure, writes a JSON report and
screenshots under `dist/verification`, then closes Chrome and the server.

No screenshot or test-fixture action is evidence of working real persistence.

On this Windows machine, launching a browser from Node can be denied. A directly
started hidden Chrome with `--remote-debugging-port=9228` and a dedicated workspace
profile can instead be checked with `node docs/opportunity/visual/verify.cjs 9228`.
The verifier closes only that explicitly supplied test browser.
