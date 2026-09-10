# frontend/

One shell, five domain micro-frontends, composed at runtime via Module
Federation (`@module-federation/vite`), plus two shared packages
(`design-system`, `platform`) that implement the six integration contracts
from the Technical Design Review: runtime, route, permission, GraphQL,
event, and design-system.

## Layout

```
frontend/
├── shell/                    host app -- routing, auth, layout, no domain logic
├── mfe-opportunity-pipeline/
├── mfe-estimation-rates/
├── mfe-approvals-gates/
├── mfe-documents/
├── mfe-rfp-intake/
├── design-system/            shadcn/ui components + Tailwind preset + tokens
├── platform/                 permission / route / event contract types + Apollo client factory
└── tsconfig.base.json        shared compiler options every app extends
```

## Running it locally (before Nx/Turborepo is wired in)

Each app is an independent Vite project. During the Phase 0/1 scaffolding
window (see the roadmap section of the playbook), run what you need by hand:

```bash
# one terminal per remote you're actively working on
cd mfe-rfp-intake && npm install && npm run dev     # http://localhost:5001

# then the shell, which loads whichever remotes are running
cd shell && npm install && npm run dev              # http://localhost:5000
```

A remote that isn't running locally still resolves via its `VITE_REMOTE_*_URL`
env var (see `shell/.env.example`) -- point it at the dev CloudFront
distribution to work on the shell against everyone else's deployed code
without running all five remotes yourself.

Once the CI/CD section's Nx workspace lands, replace the per-app `npm run dev`
habit with `nx run-many -t dev --projects=shell,mfe-rfp-intake` and let the
affected graph handle the rest.

## Adding a domain module

1. Copy the shape of an existing `mfe-*` folder -- `package.json`,
   `vite.config.ts`, `src/Module.tsx`, `src/routes.ts`, `src/permissions.ts`.
2. Register it as a remote in `shell/vite.config.ts` and add its entry point
   to `shell/src/router/routes.registry.ts`.
3. Open a `contract/` branch (per the branching section) if it needs a new
   permission, event, or design-system token -- that PR merges before any
   implementation branch forks from it.
