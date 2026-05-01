# Company Portal — platform review, mobile UX spec, and Google Stitch prompt

## 1. Product summary

**Obelisk Company Portal** is a web app for Indonesian companies: HR, payroll (PPh 21, BPJS), expenses, tax reports, CRM (clients, contracts, invoices), grant transparency (on-chain wallet audits, deductions), and standalone **event grants** (Superteam-style accountability with spendings and receipts). Roles: **admin**, **hr**, **employee**, **accountant**, **client**.

---

## 2. Complete feature inventory (by area)

### Auth & onboarding (public)

- Login (email/password)
- Forgot password → email link
- Reset password (token in URL)
- Accept invitation (token in URL) → set password / join org

### Dashboard (authenticated)

- **Admin (HR view)**: employee counts, pending expenses, payroll chart, approvals snapshot
- **Admin (CRM view)**: client counts, contracts, invoices pending/paid, revenue-style stats
- **HR**: same HR dashboard as admin HR view
- **Employee**: personal snapshot (payslips, expenses, shortcuts)
- **Accountant**: CRM-oriented stats
- **Client**: contract/invoice oriented snapshot

### HR & payroll (admin, hr)

- **Employees**: list, search/filter, add implicitly via flows; **Employee detail**: profile, KTP, salary components, bank, BPJS, PTKP, documents
- **Payroll runs**: list by period; **Payroll detail**: run status, calculate/approve flows, payslips batch
- **Expenses (HR)**: all expenses, approve/reject, link to payroll context
- **Invitations**: invite users by email/role (admin, hr, employee, accountant, client)

### Employee self-service

- **My payslips**: list/download PDFs
- **My expenses**: submit expenses, receipts upload, status
- **My contracts**: list employee contracts; **Contract detail**: view/sign where applicable

### Tax & reports (admin, hr, accountant)

- **Reports**: trigger/generate tax report flows (SPT Masa PPh 21, etc.)
- **Generated reports**: list archived PDFs with period/type

### CRM & commercial (admin, hr, accountant; create clients: admin, hr)

- **Clients**: companies + individuals list
- **Create company / Create individual** client
- **Client detail**: profile, contacts, related contracts/invoices context
- **Contract management** (admin, hr): client & employee contracts, PDF upload, signature placement, status
- **Contracts** (client): own contracts list/detail/sign
- **Invoices**: list; **Create invoice** (admin, hr); **Invoice detail**: line items, PDF, payment status

### Grants (public read; manage: admin, hr)

- **Grants list** (public): cards with status, wallet summary hints
- **Grant detail** (public): description, Solana wallet, run on-chain audit, SOL/USDC balances, deductions (with optional receipt), members/founders, link to explorer
- **Create grant** (admin, hr)

### Event grants (admin, hr, employee, accountant)

- **Event grants list**: standalone events (not nested under a grant slug in this app path)
- **Create event grant**: title, amount received, date, links (Luma/Creatix), description, after-event report fields
- **Event grant detail**: event meta, after-event report block, **spendings** table with categories (venue, food, travel…), **receipt upload** per line, totals vs amount received

### Admin-only

- **Users**: list/manage portal users
- **Settings**: company profile (NPWP, logo, JKK, etc.)

### Cross-cutting

- **Profile**: user profile, password/theme adjacent patterns
- **Theme**: light/dark toggle
- **Admin**: HR vs CRM **view mode** toggle (reorders nav)
- **API**: JWT + refresh; file uploads (KTP, receipts, avatars, logos, contract PDFs)

---

## 3. Information architecture (routes reference)

| Path | Who |
|------|-----|
| `/login`, `/forgot-password`, `/reset-password/:token`, `/accept-invitation/:token` | Public |
| `/grants`, `/grants/:slug` | Public (Layout) |
| `/` | All logged-in |
| `/employees`, `/employees/:id` | admin, hr |
| `/payroll`, `/payroll/:id` | admin, hr |
| `/expenses` | admin, hr |
| `/my-expenses` | employee (others may have similar) |
| `/my-payslips` | employee |
| `/my-contracts`, `/my-contracts/:id` | employee |
| `/reports`, `/reports/generated` | admin, hr, accountant |
| `/invitations` | admin, hr |
| `/profile` | all |
| `/users`, `/settings` | admin |
| `/crm/clients`, `/crm/clients/new/company`, `/crm/clients/new/individual`, `/crm/clients/:type/:id` | mixed |
| `/contracts/management` | admin, hr |
| `/contracts`, `/contracts/:id` | client (+ admin/hr for some contract detail) |
| `/invoices`, `/invoices/new`, `/invoices/:id` | client, admin, hr, accountant |
| `/grants/new` | admin, hr |
| `/event-grants`, `/event-grants/new`, `/event-grants/:id` | admin, hr, employee, accountant |

---

## 4. Mobile UX principles (target experience)

1. **Thumb-first**: primary actions in bottom half; avoid critical taps in top corners.
2. **Bottom navigation**: 4 primary destinations + **More**; use labels + icons; active state obvious.
3. **More = full-screen modal**: scrollable list of secondary destinations (Generated reports, Invitations, Users, Settings, Grants create, CRM sub-pages, etc.); dismiss via swipe-down affordance + close button.
4. **Lists**: large row hit targets (min ~48px height), sticky section headers, pull-to-refresh optional later.
5. **Detail pages**: sticky top bar with back + title; primary action FAB or bottom sticky bar only when one clear CTA (e.g. Submit expense).
6. **Forms**: single column, full-width inputs, date pickers native where possible; receipt upload = big tappable zone.
7. **Tables**: on mobile become **card stacks** or horizontal scroll with first column sticky (design for Stitch: prefer cards).
8. **Public grants**: minimal chrome; bottom bar: **Explore** + **Sign in** when logged out.
9. **Density**: slightly larger typography on mobile; 8px grid; generous whitespace for finance data readability.
10. **Dark mode**: same structure; respect system preference optional (app already has manual toggle).

---

## 5. Stitch generation note

Use **Google Stitch** with `deviceType: "MOBILE"`. The npm package is `@google/stitch-sdk` (not `stitch-cli` on npm, which is unrelated). Set `STITCH_API_KEY` from [stitch.withgoogle.com](https://stitch.withgoogle.com/) settings.

Run from `frontend`: `npm run stitch:mobile` (see `scripts/stitch-generate-mobile.mjs`).

---

<!-- STITCH_PROMPT_START -->

## Master prompt for Google Stitch (MOBILE)

Design a **complete mobile-first UI/UX** for **“Obelisk Company Portal”**, an Indonesian HR, payroll, and CRM web app. Output should feel **premium, calm, and trustworthy** (fintech/HR), with **light and dark** variants implied in the spec.

### Global shell

- **Viewport**: phone, 390×844 style safe areas (notch + home indicator).
- **App shell**: top **compact header** (greeting or page title, optional subtitle date on dashboard only), **theme toggle** and **avatar menu** (Profile, Logout) as icon buttons.
- **Bottom navigation bar** (fixed, 5 slots max): **Home**, plus **3 role-specific tabs**, plus **More**. Icons + short labels. Elevated surface, subtle top border, safe-area padding bottom.
- **More**: opens a **full-screen modal** (not a tiny menu) with a **large title “More”**, **close** top-right, and a **vertical list** of secondary routes with icons (Generated reports, Invitations, Users, Settings, Create grant, New client, etc. depending on role). Group sections: **Work**, **Money**, **People**, **System**.

### Role variants (generate one screen each or a single comprehensive spec)

1. **HR / Admin (HR mode) bottom nav**: Home, Employees, Payroll, Expenses, More.  
2. **Admin (CRM mode) bottom nav**: Home, Clients, Invoices, Contracts, More.  
3. **Employee bottom nav**: Home, Event grants, Payslips, My expenses, More (My contracts inside More).  
4. **Client bottom nav**: Home, Contracts, Invoices, More.  
5. **Accountant bottom nav**: Home, Clients, Invoices, Reports, More.  
6. **Logged-out visitor on public grants**: bottom nav **Grants**, **Sign in** (no More or compact More with only Login).

### Key screens to visualize (mobile)

- **Login**: email, password, forgot password link, primary CTA full width.
- **Dashboard (HR)**: 2×2 **metric cards**, one **mini chart** (payroll trend), list of **pending approvals** as cards.
- **Employee list**: **search bar** sticky; each employee = **card** (avatar, name, role, status pill).
- **Payroll runs**: list of **period cards** with status badge (draft/calculated/approved/paid).
- **Expense submit**: amount, category chips, date, **large receipt upload** zone, notes, submit sticky at bottom.
- **My payslips**: vertical list of **slip cards** with month + net pay + download icon.
- **Clients (CRM)**: segmented control **Companies | Individuals**; card list with chevron.
- **Invoice list**: card per invoice with number, amount, **payment status** color coding.
- **Grant detail (public)**: hero grant name; **wallet balance** prominent (SOL + USDC); **Run audit** CTA; **deductions** as cards; link to explorer.
- **Event grant detail**: amount received vs spent summary; **spendings** as cards with **View receipt** link; **Add spending** FAB or bottom primary button.

### Components library (show in a single style frame if needed)

- Primary button (filled), secondary (outline), ghost, destructive.
- Text fields, select, date, textarea, toggle, chips.
- **Modal** full-screen with blur backdrop on underlying shell (optional).
- **Toast** placement top or bottom.
- **Empty states** with illustration placeholder + one CTA.

### Must not

- Do not use a desktop **left sidebar** on mobile.
- Do not cram 12+ items in the bottom bar; overflow goes to **More** full-screen modal.

Produce **high-fidelity mobile layouts** suitable for engineering handoff: spacing, typography scale, and component boundaries clearly visible.

<!-- STITCH_PROMPT_END -->
