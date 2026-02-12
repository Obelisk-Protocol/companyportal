# Grants Portal – Design & Scope

## Overview

A **Grants** section for full transparency between your team and Superteam (or other grantors): create grants, allocate the wallet that received funds, run an on-chain audit, record deductions, and assign founders/owners. Built inside the existing Company Portal and served under a grants subdomain (e.g. **grants.portal.com** or **grants.companyportal.pages.dev**).

---

## Goals

- **Single place** for grant lifecycle: create grant → attach wallet → audit on-chain → add deductions → assign owners.
- **Full transparency**: clear view of funds received, spent, and deductions so both your team and Superteam can verify use of funds.
- **Reuse existing platform**: same auth, layout, and UI components from `web/`; same API patterns and DB from `api/`.

---

## Domain & Deployment

- **URL**: Grants as its own section, e.g. `grants.portal.com` or `grants.companyportal.pages.dev`.
- **Implementation**: Same codebase as Company Portal. Use one of:
  - **Same app**: Routes under `/grants`; subdomain points to same Cloudflare Pages project with path preserved, or
  - **Path-based**: `https://companyportal.pages.dev/grants` (no subdomain change).
- **Access**: Same login; roles that see Grants: **admin**, and optionally **hr** or a future **grant_manager** role.

---

## Data Model

### 1. Grant

One record per grant (e.g. one Superteam funding round).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| name | string | Grant/project name |
| description | text | Optional description |
| status | enum | `draft`, `active`, `closed`, `archived` |
| currency | string | e.g. `SOL`, `USDC` (default SOL) |
| expectedAmount | decimal | Expected funding amount (optional) |
| startDate | date | Grant start |
| endDate | date | Optional end date |
| createdBy | UUID | FK users |
| createdAt, updatedAt | timestamptz | |

### 2. Grant Wallet

The wallet that **received** the funds for this grant (one per grant for v1).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| grantId | UUID | FK grants |
| walletAddress | string | Solana address (base58) |
| label | string | Optional label (e.g. "Primary funding wallet") |
| createdAt, updatedAt | timestamptz | |

### 3. Wallet Audit (on-chain snapshot)

Stored result of an audit run for a grant wallet.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| grantId | UUID | FK grants |
| walletAddress | string | Wallet audited |
| auditRunAt | timestamptz | When we ran the audit |
| totalInbound | decimal | Total SOL/USDC received (from audit) |
| totalOutbound | decimal | Total sent |
| balanceAtAudit | decimal | Balance at audit time |
| transactionCount | int | Number of txns considered |
| rawData | jsonb | Optional: signatures, parsed tx summary |
| createdBy | UUID | FK users |
| createdAt | timestamptz | |

### 4. Grant Deduction

Manual deductions (fees, taxes, ops) applied to the grant.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| grantId | UUID | FK grants |
| amount | decimal | Deduction amount |
| currency | string | Same as grant or override |
| category | string | e.g. `platform_fee`, `tax`, `operational`, `other` |
| description | text | Reason / note |
| deductedAt | date | When it applies |
| createdBy | UUID | FK users |
| createdAt, updatedAt | timestamptz | |

### 5. Grant Member

Users assigned to the grant as founders/owners.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| grantId | UUID | FK grants |
| userId | UUID | FK users (existing portal user) |
| role | enum | `owner`, `founder`, `viewer` |
| createdAt | timestamptz | |

*(Optional later: invite by email for users not yet in the portal.)*

---

## API Design

Base path: **`/api/grants`**. All routes require auth; create/update/delete and run-audit require admin (or grant_manager).

| Method | Path | Description |
|--------|------|-------------|
| GET | /grants | List grants (filter by status optional) |
| POST | /grants | Create grant |
| GET | /grants/:id | Get grant with wallet, latest audit, deductions, members |
| PUT | /grants/:id | Update grant |
| DELETE | /grants/:id | Soft-delete or archive (optional) |
| POST | /grants/:id/wallet | Set or update grant wallet |
| POST | /grants/:id/audit | Trigger on-chain audit; store result in wallet_audit |
| GET | /grants/:id/audits | List audit history for grant |
| GET | /grants/:id/deductions | List deductions |
| POST | /grants/:id/deductions | Add deduction |
| PUT | /grants/:id/deductions/:deductionId | Update deduction |
| DELETE | /grants/:id/deductions/:deductionId | Remove deduction |
| GET | /grants/:id/members | List members |
| POST | /grants/:id/members | Add member (userId + role) |
| DELETE | /grants/:id/members/:userId | Remove member |

---

## On-Chain Audit (Solana)

- **Input**: Grant’s wallet address (Solana base58).
- **Process**:
  - Use public RPC (e.g. `https://api.mainnet-beta.solana.com` or configurable) to:
    - `getSignaturesForAddress(wallet, { limit })`
    - For each signature (or a sampled set): `getTransaction(signature)` to get balance changes or parse inner instructions.
  - Aggregate: total SOL (and optionally USDC) in vs out; optional: balance at audit time via `getBalance`.
- **Output**: Persist in `wallet_audit` (totalInbound, totalOutbound, balanceAtAudit, transactionCount, optional rawData).
- **Idempotency**: Each “Run audit” creates a new audit row (history). UI shows “Latest audit” and “Audit history”.

Dependencies: `@solana/web3.js` in `api/` (optional peer; if not installed, audit endpoint returns “Solana RPC not configured” or similar).

---

## Frontend (Leveraging `web/`)

### Routes (inside existing React app)

- `GET /grants` → **Grants list** (table: name, status, wallet, last audit totals, total deductions).
- `GET /grants/new` → **Create grant** (form: name, description, status, currency, expected amount, dates).
- `GET /grants/:id` → **Grant detail** with:
  - **Overview**: name, description, status, dates, expected amount.
  - **Wallet**: wallet address, “Run audit” button, latest audit summary (in/out/balance), link to audit history.
  - **Deductions**: list + add/edit/remove (amount, category, description, date) — reuse patterns from expenses/invoices.
  - **Members**: list of owners/founders (from existing users) + add/remove.

### Components to reuse from `web/`

- **Layout**: `Layout`, `Sidebar`, `Header` (add “Grants” nav item for admin).
- **UI**: `Card`, `Button`, `Input`, `Select`, `Table`, `Modal`.
- **Data**: `api` client, React Query, `useAuth()` for role and user.
- **Patterns**: Form state (e.g. like CreateInvoice), tables (like Invoices/Expenses), format amounts (e.g. `formatRupiah` or a generic `formatAmount(amount, currency)`).

### Navigation

- **Sidebar**: New item “Grants” (icon: e.g. Gift or Landmark) for **admin** (and optionally hr). Link to `/grants`.
- **App.tsx**: Add routes under existing `Layout`: `/grants`, `/grants/new`, `/grants/:id`. Protect with `PrivateRoute` and `allowedRoles: ['admin']` (or include hr if desired).

---

## User Flows

1. **Create grant**  
   Admin goes to Grants → Create Grant → fills name, description, currency, expected amount, dates → Save. Grant is created in `draft` or `active`.

2. **Allocate wallet**  
   On grant detail → Wallet section → enter Solana wallet address → Save. (One wallet per grant in v1.)

3. **Run audit**  
   Grant detail → Wallet → “Run on-chain audit”. Backend fetches tx history for that wallet, aggregates in/out/balance, saves new row in `wallet_audit`. UI shows latest audit and “Audit history” list.

4. **Add deductions**  
   Grant detail → Deductions → Add (amount, category, description, date). List shows sum of deductions; overview can show “Funds received (from audit) − Deductions = Net for project”.

5. **Assign founders/owners**  
   Grant detail → Members → Add member (select existing user + role owner/founder). Members can be shown on grant and used later for permissions or visibility.

6. **Transparency view**  
   Grant detail page is the single “transparency report”: received (from audit), minus deductions, equals net for project; plus list of owners. Optionally export PDF later.

---

## Scope Summary

| Item | In scope (v1) |
|------|----------------|
| Grants CRUD | Yes |
| One wallet per grant | Yes |
| On-chain audit (Solana, store snapshot) | Yes |
| Deductions CRUD | Yes |
| Grant members (owners/founders from existing users) | Yes |
| UI in same app under `/grants` | Yes |
| Reuse Layout, Sidebar, Card, Button, Input, Table, Modal, api, React Query | Yes |
| Subdomain (grants.portal.com) | Config (same app, subdomain or path) |
| Role: admin (and optionally hr) | Yes |
| PDF export of grant report | Optional later |
| Invite external users (e.g. Superteam) as viewers | Optional later |

---

## File Layout (implementation)

```
api/
  src/
    db/
      schema.ts          # + grants, grant_wallets, wallet_audits, grant_deductions, grant_members
    routes/
      grants.ts          # new
    utils/
      solanaAudit.ts     # getSignaturesForAddress, aggregate, return totals (uses @solana/web3.js)
web/
  src/
    pages/
      grants/
        Grants.tsx       # list
        CreateGrant.tsx  # create form
        GrantDetail.tsx  # overview + wallet + audit + deductions + members
    App.tsx              # + routes /grants, /grants/new, /grants/:id
    components/layout/
      Sidebar.tsx        # + Grants nav item
```

## Setup

- **Database**: Run migrations so the new tables exist: from `api/`, run `npm run db:migrate` (or apply `drizzle/0003_grants_tables.sql` manually).
- **Solana audit**: The API uses `@solana/web3.js` and defaults to `https://api.mainnet-beta.solana.com`. Set `SOLANA_RPC_URL` in the API env if you use a different RPC (e.g. Helius, QuickNode).

This document is the single source of truth for the Grants feature; implementation follows it and reuses the existing platform as specified.
