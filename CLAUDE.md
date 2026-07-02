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

### Commit conventions

When asked to commit, use `npm run commit` (commitizen) if the `commit` script exists in `package.json` — it prompts for type/scope/subject and builds a compliant Conventional Commits message. If it isn't available in whatever repo this guidance is being applied to, write the message by hand in the same format (`type(scope): subject`) instead. Either way:

- Messages in English, subject in the imperative mood (`add x`, not `added x` / `adds x`).
- Never bundle unrelated or large multi-part work into a single commit — split into clear, individually-described commits (e.g. schema, then model, then routes, then frontend, following the layering in "Adding a new feature end-to-end" below).
- Order matters: a commit may only depend on commits that come before it, never on one that comes later. Each commit should leave the tree in a working state on its own — don't write code in commit N that references something only introduced in commit N+1.

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

### Authentication (`models/authentication.js`)

`injectAnonymousOrUser` is the only entry point routes use: if a `session_id` cookie is present, it loads the session via `models/session.js`'s `findOneValidFromRequest` (rejects if `expires_at` has passed), loads the owning user, then separately checks `authorization.can(user, "read:session:self", session)` — throwing `ForbiddenError` if it fails — before attaching both to `request.context`; otherwise it attaches `user.createAnonymous()`. `checkIfUserPasswordExpired` is a separate middleware routes opt into (`.use(authentication.checkIfUserPasswordExpired)`) when a stale/temporary password should block the request with `PasswordExpiredError`. `hashPassword`/`comparePassword` wrap `models/password.js` (bcrypt, 14 salt rounds). There is no JWT — the cookie value is a random 96-char hex token stored in plaintext in `sessions.token`; anyone constructing a session row manually (e.g. for test fixtures or scripts) must also give that user the base features every real signup gets, notably `read:session:self` — a session for a user missing it is treated as invalid and every request 403s.

### Permission model (`models/authorization.js` + `models/user-features.js`)

`user-features.js` default-exports `availableFeatures`, a `Set` that is the single source of truth for every valid permission string (e.g. `"read:presentation:admin"`, `"shop:orders:manage"`, `"pdv:sell"`). Convention is `domain:action` or `domain:action:scope` (`:admin`, `:self`, `:manage`, `:read`, `:read_all`), grouped under a `// --- DOMAIN ---` comment block. New features must be added to this `Set` or `authorization.can`/`canRequest` will reject them (`validateFeature`) even if referenced elsewhere. Separately, `models/user.js`'s `DEFAULT_FEATURES` array is what every _new signup_ actually receives (`create:session`, `read:session:self`, `read:presentation`, ...) — a feature can be `available` without being in that default set, meaning it must be granted explicitly (`user.addFeatures`) to reach a given user.

`authorization.js` defines a `profiles` map keyed by the same permission strings, each entry optionally declaring `allowedInputFields`, `allowedOutputFields`, and `outputMasks` (e.g. `maskEmail`). `filterInput`/`filterOutput` apply that allowlist and are **shallow** — a field that is itself an array/object (e.g. `items`, `payments`, `variants`) is allowed or stripped as a whole, its inner keys are not filtered individually. Field-level filtering is opt-in per route, not automatic: several simpler domains (e.g. the whole `pdv` module) skip `filterInput`/`filterOutput` entirely and instead gate the route with `canRequest`/`canRequestAny` and validate the body directly via `models/validator.js` — check how sibling routes in the same domain already do it before assuming filtering is wired in.

Three middleware factories, all from `authorization.js`: `canRequest(feature)` (must have exactly that feature), `canRequestAny([featureA, featureB])` (OR — e.g. a report-only role and a seller role both hitting a read endpoint), and the plain function `can(user, feature, resource)` for imperative resource-ownership checks inside a handler (e.g. "is this the seller who made this sale" — add a `case` to the `switch` in `can()` keyed by the feature string).

### Validator (`models/validator.js`)

Single entry point: `validator(object, keys)` where `keys` is `{ fieldName: "required" | "optional", ... }`. Every valid `fieldName` must have a matching schema factory in the `schemas` object (`fieldName: () => Joi.object({ fieldName: Joi.<type>()...})`), gated with `.when("$required.fieldName", { is: "required", then: Joi.required(), otherwise: Joi.optional() })` — copy an existing entry rather than inventing a new shape. Unknown keys are stripped (`stripUnknown: true`); a schema-less field passed in `keys` throws. For a one-to-many payload (an array the caller submits as a single field, e.g. `pdv_sale_items`/`pdv_sale_payments`), model it as one schema entry whose value is `Joi.array().items(Joi.object({...}))` — do not split it into per-item top-level fields. `validator()` is called both by API-route validators (on `req.body`/`req.query`) and again, independently, inside the domain-model functions themselves — the model should never trust that a route validated its inputs, since models are also called directly (scripts, tests, other models).

### Domain models (`models/*.js`)

One file per domain concept (`user.js`, `presentation.js`, `scene.js`, `product.js`, `order.js`, `payment.js`, `subscription.js`, etc.), each exporting a plain object of functions that talk to Postgres directly via `infra/database.js` (raw SQL, no query builder/ORM). Every exported function re-validates its own inputs via `models/validator.js` first. Domain errors are thrown as typed classes from `errors/index.js` (`NotFoundError`, `ValidationError`, `ForbiddenError`, `ServiceError` with a custom `statusCode`, `UnauthorizedError`, `PasswordExpiredError`, ...); messages/actions for common cases are centralized in `models/error-messages.js`.

Multi-statement writes (e.g. "decrement stock, insert a sale, insert its line items, insert its payments" as one unit) use `database.getNewClient()` + `BEGIN`/`COMMIT`/`ROLLBACK` directly, not `database.query()`. The established shape: do read-only validation (does this referenced row exist, is it active) _before_ opening the transaction; do every mutation _inside_ it; on any thrown error, `ROLLBACK` then re-throw (`database.handleDatabaseError` translates raw Postgres errors, e.g. FK violations, into typed errors). Rows that must survive being locked concurrently (e.g. stock decrement) are read with `SELECT ... FOR UPDATE` inside the transaction, and the actual guard is a `WHERE` clause re-checking the invariant against the just-locked row (see `pdv_product.adjustStock`) — never trust a value read before the lock.

Two recurring schema/model patterns worth reusing rather than re-deriving:

- **Singleton config table** (one process-wide settings row): boolean primary key hardcoded to `true` plus a `CHECK (col = true)` constraint, so a second row can never be inserted (`pdv_settings`).
- **Historical snapshot fields**: when a sale/order references a mutable row (a product's name, a payment method's name), copy the display value into a `*_name_snapshot` column at write time. Later renames/deactivations of the source row must never change what a past receipt shows.

The "presentations" domain is a choreography/formation editor: a `presentation` has `scenes`, each scene has `scene_elements` (cast members placed on a stage) and `transition_steps` between scenes, plus `presentation_viewers` for cast assignment. `element_group`/`element_type` define reusable formation building blocks.

The e-commerce domain (`product`, `product_group`, `cart`, `order`, `coupon`, `payment`, `payment_plan`, `subscription`) integrates with `services/payment-gateway.js` (MercadoPago) and `services/shipping.js` (Correios via `correios-brasil`); `pages/api/v1/webhooks/mercadopago/index.js` handles async payment notifications.

### Testing conventions

**Unit tests** (`tests/unit/models/*.test.js`) call domain-model functions directly — no HTTP, no `authorization`/`authentication` layer. `beforeAll` always does `orchestrator.waitForAllServices()` → `orchestrator.clearDatabase()` → `orchestrator.runPendingMigrations()` (needs the dev Next.js server up for the status check, even though these tests never hit it over HTTP), then builds fixtures by calling other models directly (`user.create`, `pdvPaymentMethod.create`, ...). Assert on the returned row shape and on thrown error _classes_ (`rejects.toThrow(ValidationError)`) or `statusCode` (`rejects.toMatchObject({ statusCode: 409 })`).

**Integration tests** (`tests/integration/api/v1/**/*.test.js`) hit the real server via `fetch` against `orchestrator.webserverUrl`. Standard fixture setup per suite: create one user per role needed (seller, admin/report-reader, unauthorized, expired-password), `user.addFeatures(user, [...])` to grant just the features under test, `session.create(user)` for a real session row, then send the `session_id` cookie. Every route's test file opens with a `describe("Security Check")` block covering: anonymous → 403, authenticated-without-the-feature → 403, expired-password → 403 with `body.name === "PasswordExpiredError"`, before testing the actual happy/error paths of each HTTP verb. Reuse `mainUser` (`user.findOneUser({ username: "mainUser" })`) plus `user.addFeatures` when a test needs an admin-ish role rather than creating a bespoke admin user.

Where a resource is limited/shared (stock, capacity, seats), add a concurrency test: fire N parallel requests and assert the success/conflict split adds up exactly — see `tests/integration/api/v1/pdv/sales.test.js`'s "Concurrent sales should never oversell" test for the template.

### Frontend

Pages Router (`pages/**`) with route groups mirroring feature areas (`pages/admin/`, `pages/financeiro/`, `pages/apresentacoes/`, `pages/find-users/`, etc.). Shared UI in `components/` is organized by feature (`components/finance`, `components/presentation`, `components/tables`, `components/forms`, `components/modals`, `components/ui`, ...). `src/hooks/` holds one custom hook per concern (data fetching/state for a specific feature, e.g. `usePresentationEditor.js`, `useUserFinancials.js`); `src/contexts/` holds the few app-wide React contexts (`AuthContext`, `FinancialsDashboardContext`, `ViewContext`). `AuthContext` fetches the current user via SWR from `USER_ENDPOINT` (`/api/v1/user`) — client-side auth state derives from that endpoint, not from decoding the session cookie.

A feature's hook (`src/hooks/useX.js`) follows a fixed shape: local `useState` per resource, a `useMessage()` for `error`/`success` state, a fetch helper wrapped so `handleApiResponse({ response, router, setError })` centralizes redirect-on-401 and error-message extraction, and one `useCallback` per API call that optionally re-fetches the list on success. Components stay presentational (props in, callbacks out); pages wire `useAuth()` for the permission gate, the feature hook for data, and the components together — pages do not call `fetch` directly.

`config/settings.js` centralizes API endpoint path constants and other cross-cutting config (e.g. taiko/fue level feature-flag constants, nav entries gated by `FEATURES: [[...]]`) — prefer adding to/reading from it over hardcoding route strings.

Path aliases: absolute imports are resolved from the repo root (`jsconfig.json` sets `baseUrl: "."`), so import as `models/user.js`, `infra/database.js`, `tests/orchestrator.js`, `src/hooks/useX.js`, etc., rather than relative paths across top-level directories.

### Database

Migrations live in `infra/migrations/`, managed by `node-pg-migrate` and run through `models/migrator.js` (also exposed via `pages/api/v1/migrations` for the admin UI at `/migrations`, gated by `create:migration`/`read:migration` features). Local Postgres runs in Docker (`infra/compose.yaml`), configured via `.env.development`.

Scaffold new migrations with `npm run migrations:create -- <kebab-description>` so the timestamp prefix (used for ordering) is generated correctly — don't hand-write the filename. **Never edit a migration that may already have run** (locally or elsewhere) — add a new migration instead, even for something as small as a column drop; `pgm.dropColumns`/`pgm.addColumns` on an existing table is a normal, expected way to evolve a table created by an earlier migration (see `1782959662397_add-notes-and-percentage-discount-cap.js` and `1782965100000_add-pdv-sale-payments-table.js` for examples building on `1782951706856_create-pdv-sales-table.js`). Always write both `exports.up` and `exports.down` (`exports.down = false` only for genuinely irreversible data migrations, e.g. `1782951706858_update-admin-features-pdv.js`).

## Adding a new feature end-to-end

Build in this order — each step depends only on the previous ones, which also makes it natural to commit as separate, individually-working commits:

1. **Schema.** One or more migrations under `infra/migrations/` (new tables/columns only — never edit a migration that may have already run). Run `npm run migrations:up` locally to apply.
2. **Validation.** Add the new fields' schemas to `models/validator.js`.
3. **Domain model.** Add/extend the `models/*.js` file: functions validate their own inputs, talk to Postgres directly, wrap multi-statement writes in a transaction, throw typed errors from `errors/index.js`. Add its `tests/unit/models/*.test.js` alongside — these only need the domain model and the DB, not the HTTP layer, so they're the fastest way to pin down business logic (discount caps, atomic stock, sum-must-match-total, etc.) before wiring up routes.
4. **Permissions.** Add any new permission string(s) to `models/user-features.js`'s `availableFeatures`, and (if the domain uses field-level filtering) a matching profile in `models/authorization.js`.
5. **API routes.** `pages/api/v1/**`, following the standard pipeline (`authentication.injectAnonymousOrUser` → `authorization.canRequest`/`canRequestAny` → local `validator()` call → handler calling the model → `controller.errorsHandlers`). Add `tests/integration/api/v1/**` covering the security matrix (anonymous/no-feature/expired-password all 403) plus the happy and error paths through real HTTP.
6. **Frontend.** Endpoint constants + nav entries in `config/settings.js`, a `src/hooks/useX.js` for the feature's data/state, presentational components under `components/<feature>/`, and a thin `pages/**` page that gates on `useAuth()` and wires the hook to the components.
7. **Verify.** `npm run lint:prettier:check`, `npm run lint:eslint:check`, then the feature's `npx jest ... --runInBand` (services must be up). For anything with a visible UI, actually drive it in a browser — passing tests don't prove the screen renders or the interaction feels right.

Nothing here is optional because it's small: a migration without its model usage is dead schema; a model without its permission profile/feature string is unreachable from any route; a route without its security-matrix tests is an unverified 403 surface. The PDV module (`models/pdv_*.js`, `pages/api/v1/pdv/**`, `pages/pdv/**`) was built end-to-end this way and is the most complete example to copy from for a brand-new domain.
