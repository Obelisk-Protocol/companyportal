# Grants Implementation (Porting Guide)

This document describes the *current implementation* of the Grants feature in this codebase, so you can remake it in a new project by reusing the same flow.

Primary references:
- Backend router: `backend/src/routes/grants.ts`
- Solana audit helper: `backend/src/utils/solanaAudit.ts`
- Drizzle schema: `backend/src/db/schema.ts`
- Frontend routes/pages: `frontend/src/App.tsx` and `frontend/src/pages/grants/*`

## What “Grants” means here

A grant is a transparency container for a funding round/project:
- Create a grant (name/metadata/status).
- Set exactly one “grant wallet” address that received the funds.
- Run an on-chain audit for that wallet (Solana inbound/outbound + SOL + USDC snapshot).
- Record manual “deductions” (fees/taxes/ops) from the grant totals.
- Assign “members” (owners/founders/viewers) from existing portal users.

Additionally, the backend supports “event reports” (Superteam event-level reports) nested under a grant. The frontend UI for `/grants/:slug/events/*` is not implemented in this repo yet, but the API is already there.

## Roles and permissions

Role names used by the backend:
- `admin`, `hr`, `employee`, `accountant`, `client`

Grants CRUD permissions (top-level grant management):
- `admin` or `hr` can manage grants.
- “Public” parts (read/list) do not require auth.

Event report permissions inside a grant (`/grants/:idOrSlug/events/*`):
- Backend uses `canManageEvents(grantId, userId)`.
- A user can manage event reports if:
  - their role in `schema.users.role` is `admin` or `hr`, OR
  - they are a grant member with `grant_members.role` = `owner` or `founder`.
- `viewer` members cannot manage events.

Frontend gating (current behavior):
- `/grants` and `/grants/:slug` are public routes.
- Create/update style actions in the UI are shown only when `user.role === 'admin' || user.role === 'hr'`.

## Backend: modules to copy

1. Router
- `backend/src/routes/grants.ts`

2. Auth & role middleware
- `backend/src/middleware/auth.ts`
- Key exports:
  - `authMiddleware`
  - `requireRole(...roles)`

3. Solana audit
- `backend/src/utils/solanaAudit.ts`
- Key export:
  - `runWalletAudit(walletAddress)`
- Reads `process.env.SOLANA_RPC_URL` with a default RPC:
  - `https://api.mainnet-beta.solana.com`
- Behavior:
  - Dynamically imports `@solana/web3.js`
  - Limits transaction fetches (`MAX_SIGNATURES = 50`) and delays calls to reduce RPC rate limiting.

## Database schema (Drizzle)

Tables in `backend/src/db/schema.ts`:
- `grants` (`schema.grants`)
- `grant_wallets` (`schema.grantWallets`)
- `wallet_audits` (`schema.walletAudits`)
- `grant_deductions` (`schema.grantDeductions`)
- `grant_members` (`schema.grantMembers`)
- `grant_events` (`schema.grantEvents`)
- `grant_event_spendings` (`schema.grantEventSpendings`)

Key columns (high-signal only):

`grants`
- `id` (uuid, PK)
- `name` (text)
- `slug` (unique text, URL identifier)
- `description` (text, nullable)
- `status` (`draft|active|closed|archived`)
- `currency` (text, default `SOL`)
- `expectedAmount` (decimal)
- `startDate`, `endDate` (date, nullable)
- `createdBy` (uuid FK)

`grant_wallets`
- `id` (uuid, PK)
- `grantId` (FK to `grants.id`)
- `walletAddress` (text)
- `label` (text, nullable)

`wallet_audits`
- `grantId` FK
- `walletAddress` (text)
- `auditRunAt` (timestamp)
- `totalInbound`, `totalOutbound` (decimal)
- `balanceAtAudit` (decimal, SOL snapshot)
- `balanceUsdc` (decimal, USDC snapshot)
- `transactionCount` (int)
- `rawData` (jsonb)

`grant_deductions`
- `grantId` FK
- `amount` (decimal)
- `currency` (text, default `SOL`)
- `category` (`platform_fee|tax|operational|other`)
- `description` (text, nullable)
- `deductedAt` (date)
- `createdBy` FK

`grant_members`
- `grantId` FK
- `userId` FK (existing portal user)
- `role` (`owner|founder|viewer`)

`grant_events` (event reports)
- `grantId` FK to `grants` (nullable in schema comments; in the current Drizzle definition it’s optional via `.references`, not `.notNull()`)
- `amountReceived`, `currency`
- `title`, `eventDate`
- `location`, `lumaUrl`, `creatixUrl`
- `attendeesCount`, `description`
- `theme`, `purpose`, `afterEventReport`
- `status` (`draft|submitted`)
- `createdBy`

`grant_event_spendings` (event spending lines)
- `eventId` FK to `grant_events`
- `category` (`venue|food_drinks|video_photography|travel|accommodation|labor_organisers|other`)
- `amount`, `currency`
- `description`, `receiptUrl`
- `spentAt` (date)

## API routes (actual contracts)

Base prefix in this repo: `backend/src/index.ts` mounts the router at:
- `/api/grants`

So frontend calls look like:
- `api.get<any>('/grants/...')` which becomes `/api/grants/...` on the server.

### Grant list & details

`GET /api/grants`
- Auth: none (public)
- Optional query: `status`
- Returns:
  - an array of grants enriched with:
    - `wallet` (null or grant wallet row)
    - `latestAudit` (null or latest wallet audit row)
    - `totalDeductions` (sum of deductions, stored as a number)

`POST /api/grants`
- Auth: required
- Role: `admin` or `hr` only
- Request body (Zod schema):
  - `name` (string, min 1)
  - `description` (string?, optional)
  - `status` (`draft|active|closed|archived`, default `draft`)
  - `currency` (string, default `SOL`)
  - `expectedAmount` (string|number?, optional)
  - `startDate` (string?, optional)
  - `endDate` (string?, optional)
- Notes:
  - Backend generates a unique `slug` from `name` via `slugFromName(name)` and ensures uniqueness by appending `-2`, `-3`, etc.

`GET /api/grants/:idOrSlug`
- Auth: none (public)
- `:idOrSlug` accepts:
  - a UUID grant id, or
  - a slug
- Returns:
  - the grant row
  - `wallet` (single wallet or null)
  - `audits` (history list, latest first)
  - `latestAudit` (first element or null)
  - `deductions` (list)
  - `members` (list including `user: { id, email }`)
  - `summary`:
    - `fundsReceivedSol`, `fundsReceivedUsdc`
    - `totalDeductionsSol`, `totalDeductionsUsdc`
    - `netSol`, `netUsdc`

`PUT /api/grants/:idOrSlug`
- Auth: required
- Role: `admin` or `hr` only
- Request body: same shape as `createGrantSchema`, but partial update (fields are optional).

### Grant wallet & audits

`POST /api/grants/:idOrSlug/wallet`
- Auth: required
- Role: `admin` or `hr` only
- Request body:
  - `walletAddress` (string, min 32, max 44)
  - `label` (string?, optional)
- Behavior:
  - If a wallet row exists, backend updates address/label.
  - Otherwise it creates a new `grant_wallets` row.

`POST /api/grants/:idOrSlug/audit`
- Auth: required
- Role: `admin` or `hr` only
- Request body: none
- Behavior:
  - Requires that the grant already has a wallet set.
  - Calls `runWalletAudit(wallet.walletAddress)`.
  - Stores a new row in `wallet_audits`.

`GET /api/grants/:idOrSlug/audits`
- Auth: none (public)
- Returns: audit history rows (ordered latest first)

### Deductions

`GET /api/grants/:idOrSlug/deductions`
- Auth: none (public)
- Returns: deduction rows

`POST /api/grants/:idOrSlug/deductions`
- Auth: required
- Role: `admin` or `hr` only
- Request body:
  - `amount` (string|number)
  - `currency` (default `SOL`)
  - `category` (`platform_fee|tax|operational|other`)
  - `description` (string?, optional)
  - `deductedAt` (string)

`PUT /api/grants/:idOrSlug/deductions/:deductionId`
- Auth: required
- Role: `admin` or `hr` only
- Request body: `deductionSchema.partial()` (all fields optional)

`DELETE /api/grants/:idOrSlug/deductions/:deductionId`
- Auth: required
- Role: `admin` or `hr` only
- Returns: `{ ok: true }`

### Grant members

`GET /api/grants/users-for-members`
- Auth: required
- Role: `admin` or `hr` only
- Returns: a list of active users:
  - `{ id, email }`

`GET /api/grants/:idOrSlug/members`
- Auth: none (public)
- Returns: members list

`POST /api/grants/:idOrSlug/members`
- Auth: required
- Role: `admin` or `hr` only
- Request body:
  - `userId` (uuid)
  - `role` (`owner|founder|viewer`)

`DELETE /api/grants/:idOrSlug/members/:userId`
- Auth: required
- Role: `admin` or `hr` only
- Returns: `{ ok: true }`

## Event report API (nested under grants)

These endpoints are present in `backend/src/routes/grants.ts` and protected using `canManageEvents(grantId, userId)` for any “manage” action.

`GET /api/grants/:idOrSlug/events`
- Auth: none (public)

`POST /api/grants/:idOrSlug/events`
- Auth: required
- Permission: `canManageEvents(grantId, userId)`
- Request body (event create schema):
  - `title` (string, min 1)
  - `amountReceived` (string|number)
  - `currency` (default `USDC`)
  - `eventDate` (string)
  - `location?`, `lumaUrl?`, `creatixUrl?` (optional strings)
  - `attendeesCount?` (number int min 0)
  - `description?` (string)

`GET /api/grants/:idOrSlug/events/:eventId`
- Auth: none (public)
- If an `Authorization` header is present, backend optionally computes `canManage` in the response.

`PUT /api/grants/:idOrSlug/events/:eventId`
- Auth: required
- Permission: `canManageEvents(grantId, userId)`

`DELETE /api/grants/:idOrSlug/events/:eventId`
- Auth: required
- Permission: `canManageEvents(grantId, userId)`

Event spendings:
- `POST /api/grants/:idOrSlug/events/:eventId/spendings` (manage permission required)
- `PUT /api/grants/:idOrSlug/events/:eventId/spendings/:spendingId` (manage permission required)
- `DELETE /api/grants/:idOrSlug/events/:eventId/spendings/:spendingId` (manage permission required)

Spendings input schema uses:
- `category`: `venue|food_drinks|video_photography|travel|accommodation|labor_organisers|other`
- `amount` (string|number)
- `currency` default `USDC`
- `description?`
- `receiptUrl?`
- `spentAt` (string)

## Frontend integration (current wiring)

### React Query keys and API calls

List screen:
- `frontend/src/pages/grants/Grants.tsx`
- Query key: `['grants']`
- Calls: `api.get<any[]>('/grants')`

Create screen:
- `frontend/src/pages/grants/CreateGrant.tsx`
- Uses `useMutation` with:
  - `api.post('/grants', data)`
- On success:
  - invalidates `['grants']`
  - navigates to `/grants/${grant.slug || grant.id}`

Detail screen:
- `frontend/src/pages/grants/GrantDetail.tsx`
- Query key: `['grant', slug]`
- Calls: `api.get<any>(\`/grants/${slug}\`)`

Detail “actions” (only visible when `canManage = admin|hr`):
- Set wallet:
  - `POST /grants/:slug/wallet`
  - mutation invalidates `['grant', slug]`
- Run audit:
  - `POST /grants/:slug/audit`
  - mutation invalidates `['grant', slug]`
- Add deduction:
  - `POST /grants/:slug/deductions`
  - mutation invalidates `['grant', slug]`
- Delete deduction:
  - `DELETE /grants/:slug/deductions/:deductionId`
  - mutation invalidates `['grant', slug]`
- Add member:
  - `POST /grants/:slug/members`
  - mutation invalidates `['grant', slug]`
- Remove member:
  - `DELETE /grants/:slug/members/:userId`
  - mutation invalidates `['grant', slug]`

Members modal user picker:
- uses `GET /grants/users-for-members`
- only enabled when `canManage && showMemberModal`

### Route definitions

In `frontend/src/App.tsx`:
- Public:
  - `/grants` (index)
  - `/grants/:slug` (detail)
  - Both render inside `Layout` without `PrivateRoute`.
- Protected:
  - `/grants/new` uses `PrivateRoute allowedRoles={['admin','hr']}`

## Porting checklist (new project)

Backend:
1. Add the Drizzle tables:
   - `grants`, `grant_wallets`, `wallet_audits`, `grant_deductions`, `grant_members`, `grant_events`, `grant_event_spendings`
2. Copy `runWalletAudit()` and ensure:
   - `SOLANA_RPC_URL` env var exists (optional, defaults are fine)
   - `@solana/web3.js` is installed in the backend package
3. Copy `backend/src/routes/grants.ts` and confirm:
   - your auth middleware sets `c.set('user', ...)` with `{ userId, role }`
   - your role names match (`admin`, `hr`, etc.)
4. Mount the router at `/api/grants`.

Frontend:
1. Add React routes:
   - public `/grants` and `/grants/:slug`
   - protected `/grants/new`
2. Add pages:
   - `Grants.tsx`, `CreateGrant.tsx`, `GrantDetail.tsx`
3. Wire API base URL + auth header:
   - reuse the existing `api` client pattern (Authorization: `Bearer ${accessToken}`)
4. Align role gating:
   - UI currently assumes `admin|hr` manage grants.

Operational:
1. Ensure the new project has the same “user table” role source of truth used by `canManageEvents()`:
   - `schema.users.role`
2. Rate limit safety:
   - `runWalletAudit()` intentionally fetches limited signatures and adds delay to avoid RPC 429.

