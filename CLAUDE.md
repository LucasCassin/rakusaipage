# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Official website + management backend for Rakusai Taiko (楽彩太鼓), a taiko group based in Santo André-SP, Brazil. Beyond the public marketing site, this is a full member-management system: authentication, subscriptions/payments (MercadoPago), a "presentations" choreography editor (scenes, elements, transition steps, cast/viewers), comments, an e-commerce module (products, product groups, cart, checkout, coupons, shipping via Correios), and admin financial dashboards. Backend code and comments are written in Portuguese; keep that convention when touching `models/`, `errors/`, migrations, and API routes.

Next.js 15 (Pages Router) + React 19, Postgres via `pg`/`node-pg-migrate`, no ORM.

## Commands

```bash
npm run dev                    # starts Postgres via docker, waits for it, runs migrations, starts `next dev`
npm test                       # starts Postgres, then runs `next dev` + jest concurrently (full integration run)
npm run test:watch             # jest --watchAll (assumes services are already up, e.g. from a prior `npm test`)
npm run services:up            # docker compose up -d (Postgres only)
npm run services:stop          # stop the Postgres container
npm run services:down          # remove the Postgres container
npm run migrations:create      # scaffold a new migration in infra/migrations
npm run migrations:up          # run pending migrations against .env.development
npm run migrations:down        # roll back the last migration
npm run lint:prettier:check    # prettier --check .
npm run lint:prettier:fix      # prettier --write .
npm run lint:eslint:check      # next lint
npm run commit                 # commitizen (conventional commits, enforced by commitlint on commit-msg hook)
```

Run a single test file (services must already be running, e.g. via `npm run services:up && npm run services:wait:database && npm run migrations:up`, or leave a `npm test` running in another terminal):

```bash
npx jest tests/unit/models/user.test.js --runInBand
npx jest tests/integration/api/v1/presentations --runInBand
```

Integration tests hit a real Next.js server (`tests/orchestrator.js` polls `/api/v1/status` via `waitForAllServices`) and a real Postgres database — there are no mocks for the database layer. `orchestrator.clearDatabase()` / `clearTable()` are used in `beforeEach` blocks to reset state between tests.

There is no `pre-commit` hook; only `commit-msg` (commitlint, conventional commits) runs via Husky. CI (`.github/workflows/*.yaml`) runs prettier check, eslint, commitlint, and the full jest suite on every PR.

## Architecture

### Request pipeline (API routes)

Every route in `pages/api/v1/**` follows the same shape, built on `next-connect`:

```js
const router = createRouter().use(authentication.injectAnonymousOrUser);
router.get(authorization.canRequest("read:foo"), someValidator, someHandler);
export default router.handler(controller.errorsHandlers);
```

1. **`authentication.injectAnonymousOrUser`** (`models/authentication.js`) — reads the `session_id` cookie if present, loads the session + user and attaches them to `request.context.user`/`request.context.session`; otherwise attaches an anonymous user (`user.createAnonymous()`).
2. **`authorization.canRequest(feature)`** (`models/authorization.js`) — middleware factory that checks the user has the named feature/permission before continuing; throws `ForbiddenError` otherwise.
3. **Route-local validators** — call `models/validator.js` with a schema-like object (Joi-backed) to sanitize `req.body`/`req.query`, throwing `ValidationError` on bad input.
4. **Handler** — calls into a domain model (`models/*.js`), then typically passes the result through `authorization.filterInput`/`filterOutput` to strip fields the caller isn't allowed to send/see, and responds with `res.status(...).json(...)`.
5. **`controller.errorsHandlers`** (`models/controller.js`) — shared `onError`/`onNoMatch` handlers. Known error classes (see `errors/index.js`) map to their `statusCode`; `UnauthorizedError`/`ValidationSessionError` additionally clear the session cookie; anything else becomes a generic `InternalServerError`. Routes can wrap this with a custom `onError` (see `pages/api/v1/user/index.js`) for route-specific cleanup like clearing cookies on `ForbiddenError`.

### Permission model (`models/authorization.js` + `models/user-features.js`)

`user-features.js` is the single source of truth for every valid permission string (a `Set`, e.g. `"read:presentation:admin"`, `"shop:orders:manage"`). `authorization.js` defines a `profiles` map keyed by the same permission strings, each entry declaring `allowedInputFields`, `allowedOutputFields`, and optional `outputMasks` (e.g. `maskEmail`). Field-level filtering (`authorization.filterInput`/`filterOutput`) is applied explicitly by route handlers — it is not automatic — so when adding a new field to a model, remember to add it to the relevant profile(s) or it will silently be stripped from responses/requests.

### Domain models (`models/*.js`)

One file per domain concept (`user.js`, `presentation.js`, `scene.js`, `product.js`, `order.js`, `payment.js`, `subscription.js`, etc.), each exporting a plain object of functions that talk to Postgres directly via `infra/database.js` (raw SQL, no query builder/ORM). Domain errors are thrown as typed classes from `errors/index.js` (`NotFoundError`, `ValidationError`, `ForbiddenError`, `ServiceError`, ...); messages/actions for common cases are centralized in `models/error-messages.js`.

The "presentations" domain is a choreography/formation editor: a `presentation` has `scenes`, each scene has `scene_elements` (cast members placed on a stage) and `transition_steps` between scenes, plus `presentation_viewers` for cast assignment. `element_group`/`element_type` define reusable formation building blocks.

The e-commerce domain (`product`, `product_group`, `cart`, `order`, `coupon`, `payment`, `payment_plan`, `subscription`) integrates with `services/payment-gateway.js` (MercadoPago) and `services/shipping.js` (Correios via `correios-brasil`); `pages/api/v1/webhooks/mercadopago/index.js` handles async payment notifications.

### Frontend

Pages Router (`pages/**`) with route groups mirroring feature areas (`pages/admin/`, `pages/financeiro/`, `pages/apresentacoes/`, `pages/find-users/`, etc.). Shared UI in `components/` is organized by feature (`components/finance`, `components/presentation`, `components/tables`, `components/forms`, `components/modals`, `components/ui`, ...). `src/hooks/` holds one custom hook per concern (data fetching/state for a specific feature, e.g. `usePresentationEditor.js`, `useUserFinancials.js`); `src/contexts/` holds the few app-wide React contexts (`AuthContext`, `FinancialsDashboardContext`, `ViewContext`). `AuthContext` fetches the current user via SWR from `USER_ENDPOINT` (`/api/v1/user`) — client-side auth state derives from that endpoint, not from decoding the session cookie.

`config/settings.js` centralizes API endpoint path constants and other cross-cutting config (e.g. taiko/fue level feature-flag constants) — prefer adding to/reading from it over hardcoding route strings.

Path aliases: absolute imports are resolved from the repo root (`jsconfig.json` sets `baseUrl: "."`), so import as `models/user.js`, `infra/database.js`, `tests/orchestrator.js`, `src/hooks/useX.js`, etc., rather than relative paths across top-level directories.

### Database

Migrations live in `infra/migrations/`, managed by `node-pg-migrate` and run through `models/migrator.js` (also exposed via `pages/api/v1/migrations` for the admin UI at `/migrations`, gated by `create:migration`/`read:migration` features). Local Postgres runs in Docker (`infra/compose.yaml`), configured via `.env.development`.
