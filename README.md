# PostHog Demo Shop

[![CI](https://github.com/migueldcdev/e-commerce-product-analytics-demo/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/migueldcdev/e-commerce-product-analytics-demo/actions/workflows/ci.yml)
[![Vercel](https://deploy-badge.vercel.app/vercel/e-commerce-product-analytics-demo)](https://vercel.com)

## What this is

A fake e-commerce shop built to demo PostHog product analytics end to end: live events from a
real UI, feature flags and experiments, surveys, and a data generator that backfills 90 days of
realistic history. See the
[PostHog E-commerce Demo spec](https://claude.ai/code/artifact/5c5d3e88-f1dc-4011-8ce9-d7a9ee37c63f).

**Current iteration: 1 — scaffold.** One page renders the project name, every quality gate runs in
CI, and a PR that fails any gate cannot merge or reach production. Shop screens, events and the
generator start in iteration 2.

## Stack

| Area          | Tool                                                      |
| ------------- | --------------------------------------------------------- |
| Language      | TypeScript (strict)                                       |
| Build / dev   | Vite                                                      |
| UI            | React + React Router (data router, `createBrowserRouter`) |
| UI library    | shadcn/ui on Tailwind CSS v4, shadcn MCP server           |
| App state     | React Context                                             |
| Analytics     | `posthog-js`                                              |
| Unit / integ. | Vitest + React Testing Library + jsdom                    |
| E2E           | Playwright (Chromium)                                     |
| Lint / format | ESLint (flat config) + Prettier                           |
| CI / deploy   | GitHub Actions, Vercel                                    |
| Runtime       | Node (see `.nvmrc`), npm                                  |

## Getting started

```sh
nvm use            # Node version from .nvmrc
npm ci
cp .env.example .env.local   # optional: the app runs without a PostHog key
npm run dev
```

Without `VITE_POSTHOG_KEY` the app logs one warning and skips analytics.

## Scripts

| Script                 | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Vite dev server                                             |
| `npm run build`        | Typecheck and build to `dist/`                              |
| `npm run preview`      | Serve `dist/` on port 4173 (used by Playwright)             |
| `npm run typecheck`    | `tsc -b --noEmit`                                           |
| `npm run lint`         | ESLint, zero warnings allowed                               |
| `npm run format`       | Prettier, write changes                                     |
| `npm run format:check` | Prettier, check only (CI)                                   |
| `npm run test`         | Vitest once with coverage                                   |
| `npm run test:watch`   | Vitest in watch mode                                        |
| `npm run test:e2e`     | Playwright against the production build (run `build` first) |

## Project structure

```text
.github/workflows/ci.yml       # quality, unit, e2e, ci-ok
.mcp.json                      # shadcn MCP server for coding agents
e2e/smoke.spec.ts              # Playwright tests
src/
  components/ui/               # shadcn components (generated, committed)
  context/                     # React contexts — one Provider + hook per file
    DemoSettingsContext.tsx    # persona, device, flag overrides
    demoSettings.ts            # context object, types, defaults
  lib/posthog.ts               # PostHog init
  lib/utils.ts                 # shadcn cn() helper
  routes/                      # one component per route
    RootLayout.tsx             # project name header + <Outlet />
    Home.tsx
    NotFound.tsx
  router.tsx                   # route table + createBrowserRouter
  App.tsx  main.tsx  index.css
  test/setup.ts                # jest-dom matchers, posthog-js mock
components.json                # shadcn config
vercel.json                    # SPA rewrite to /index.html
```

## Adding a route

1. Create the component in `src/routes/`.
2. Add it as a child of the root route in `src/router.tsx`:
   ```tsx
   { path: 'products', element: <Products /> },
   ```
3. Add a test that mounts the shared `routes` table with `createMemoryRouter` (see
   `src/router.test.tsx`).

## Adding UI components

```sh
npx shadcn@latest add dialog
```

Or ask your coding agent ("add the dialog component") — `.mcp.json` registers the shadcn MCP
server, so Claude Code and other MCP clients pick it up automatically. Components land in
`src/components/ui/` and are committed.

## Testing

- **Unit / integration:** `npm run test` — files sit next to code as `*.test.ts(x)`. Query by role
  and accessible name, never by class names. `posthog-js` is mocked in `src/test/setup.ts`.
- **E2E:** `npm run build && npm run test:e2e` — runs Playwright against `vite preview` (the same
  bundle Vercel deploys). First time locally: `npx playwright install chromium`.
- **In CI:** the coverage report is uploaded as the `coverage` artifact on every run; the
  Playwright HTML report is uploaded as `playwright-report` when E2E fails. Coverage is reported,
  not gated, for now.

## Environment variables

| Variable            | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| `VITE_POSTHOG_KEY`  | PostHog project API key (public by design)               |
| `VITE_POSTHOG_HOST` | `https://us.i.posthog.com` or `https://eu.i.posthog.com` |

> **Warning:** every `VITE_` variable is baked into the client bundle and is public. Never put a
> secret — including the PostHog personal API key used by later setup scripts — in a `VITE_` var.

## CI and deploy

```text
PR opened → CI + Vercel preview → ci-ok green → merge to main
         → CI runs again + Vercel builds production in parallel
         → promoted to production only when ci-ok passes (Vercel Deployment Checks)
```

- **CI** (`.github/workflows/ci.yml`) runs `quality` (format, lint, typecheck, build), `unit` and
  `e2e` in parallel on every PR and push to `main`. `ci-ok` depends on all three and is the only
  required check. Keep job names stable — renaming one silently drops the requirement.
- **Branch rules** (GitHub ruleset on `main`): pull request required, `ci-ok` required with
  up-to-date branches, force pushes and deletion blocked, empty bypass list (admins included),
  squash-only merges.
- **Vercel:** preview per PR (informative, not required); production from `main`, gated by
  Deployment Checks on `ci-ok`. `vercel.json` rewrites every path to `/index.html` so deep links
  work.
- **Rollback:** Vercel dashboard → Deployments → pick the previous production deployment →
  **Instant Rollback**. No CI change needed.
