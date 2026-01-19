# CRM System - Phase 2

## Overview

Phase 2 will add a comprehensive Customer Relationship Management (CRM) system to the Company Portal, enabling client management, contract generation, and business relationship tracking.

## Core Features

### 1. Client Management

#### Companies
- **Company Registration**
  - Company name (legal and trading name)
  - Company type (PT, CV, Firma, etc.)
  - NPWP (Tax ID)
  - NIB (Business Identification Number)
  - Address (full address, city, province, postal code)
  - Phone, email, website
  - Industry/sector
  - Company size (employee count)
  - Registration date
  - Status (Active, Inactive, Prospect, Lead)

- **Company Contacts**
  - Multiple contacts per company
  - Primary contact designation
  - Contact roles (CEO, CFO, HR Manager, etc.)
  - Contact details (name, email, phone, position)
  - Notes and communication history

#### Individual Clients
- **Individual Registration**
  - Full name
  - NIK (ID Card Number)
  - NPWP (if applicable)
  - Email, phone
  - Address
  - Date of birth
  - Occupation
  - Status (Active, Inactive, Prospect)

- **Client Categories**
  - B2B clients (companies)
  - B2C clients (individuals)
  - Partners/Vendors
  - Prospects/Leads

### 2. Contract Management

#### Contract Generation
- **Contract Templates**
  - Pre-built templates for common contract types
  - Custom contract builder
  - Variable placeholders (company name, dates, amounts, etc.)
  - Multi-language support (English/Indonesian)
  - Legal compliance templates

- **Contract Types**
  - Service agreements
  - Consulting contracts
  - Employment contracts (link to HR system)
  - Non-disclosure agreements (NDA)
  - Partnership agreements
  - Purchase orders
  - Custom contracts

- **Contract Fields**
  - Contract number (auto-generated)
  - Client/Company reference
  - Contract type
  - Start date, end date
  - Value/amount
  - Currency (IDR, USD, etc.)
  - Payment terms
  - Terms and conditions
  - Signatures (digital)
  - Status (Draft, Pending Signature, Active, Expired, Terminated)

#### Digital Signatures
- **Signature Workflow**
  - Send contract for signature via email
  - Multiple signatories support
  - Signature order/sequence
  - Reminder notifications
  - Signature tracking and status
  - Signed contract storage

- **Signature Methods**
  - E-signature integration (DocuSign, HelloSign, or custom)
  - PDF signature fields
  - Signature verification
  - Audit trail

#### Contract Storage & Retrieval
- **Document Management**
  - Store signed contracts in Cloudflare R2
  - Version control (draft versions)
  - PDF generation and storage
  - Search and filter contracts
  - Contract expiration alerts
  - Renewal reminders

- **Contract Search**
  - Search by client name
  - Search by contract number
  - Filter by status, type, date range
  - Filter by value/amount
  - Full-text search in contract content

### 3. Relationship Tracking

#### Interaction History
- **Communication Log**
  - Email correspondence
  - Phone call logs
  - Meeting notes
  - Document exchanges
  - Timeline view of all interactions

#### Activity Tracking
- **Client Activities**
  - Last contact date
  - Next follow-up date
  - Activity type (call, email, meeting, contract)
  - Activity notes
  - Assigned team member

#### Pipeline Management
- **Sales Pipeline** (Optional)
  - Lead → Prospect → Negotiation → Contract → Active
  - Deal stages and probabilities
  - Deal value tracking
  - Win/loss analysis

### 4. Low-Level CRM Features

#### Contact Management
- **Unified Contact List**
  - All company and individual contacts
  - Quick search and filter
  - Contact tags and categories
  - Import/export contacts (CSV)

#### Notes & Documents
- **Client Notes**
  - Private notes per client
  - Shared team notes
  - Note categories (general, contract, issue, etc.)
  - Rich text editor

- **Document Attachments**
  - Upload documents per client
  - Document categories
  - Version control
  - Access permissions

#### Tasks & Reminders
- **Task Management**
  - Create tasks linked to clients
  - Due dates and priorities
  - Task assignments
  - Task status tracking
  - Recurring tasks

- **Reminders**
  - Contract renewal reminders
  - Follow-up reminders
  - Payment due reminders
  - Custom reminders

#### Reporting & Analytics
- **Client Reports**
  - Active clients count
  - Contract value summary
  - Contract expiration report
  - Client acquisition trends
  - Revenue by client

- **Contract Reports**
  - Active contracts
  - Expiring contracts (next 30/60/90 days)
  - Contract value analysis
  - Contract type distribution

## Database Schema

### New Tables

```sql
-- Companies
companies (
  id, name, legal_name, company_type, npwp, nib,
  address, city, province, postal_code,
  phone, email, website, industry, size,
  status, registration_date, created_at, updated_at
)

-- Individual Clients
individual_clients (
  id, full_name, nik, npwp, email, phone,
  address, city, province, postal_code,
  date_of_birth, occupation, status,
  created_at, updated_at
)

-- Company Contacts
company_contacts (
  id, company_id, name, email, phone, position,
  is_primary, notes, created_at, updated_at
)

-- Contract Templates
contract_templates (
  id, name, type, content, variables,
  is_active, created_at, updated_at
)

-- Contracts
contracts (
  id, contract_number, client_type, client_id,
  template_id, contract_type, title,
  start_date, end_date, value, currency,
  payment_terms, terms_content,
  status, pdf_url, signed_pdf_url,
  created_by, created_at, updated_at, signed_at
)

-- Contract Signatures
contract_signatures (
  id, contract_id, signatory_name, signatory_email,
  signatory_role, signature_data, signed_at,
  ip_address, user_agent
)

-- Client Interactions
client_interactions (
  id, client_type, client_id, interaction_type,
  subject, notes, user_id, created_at
)

-- Client Documents
client_documents (
  id, client_type, client_id, name, file_url,
  category, uploaded_by, created_at
)

-- Client Tasks
client_tasks (
  id, client_type, client_id, title, description,
  due_date, priority, status, assigned_to,
  created_at, updated_at, completed_at
)
```

## API Endpoints

### Clients
- `GET /api/crm/clients` - List all clients (companies + individuals)
- `GET /api/crm/clients/companies` - List companies
- `GET /api/crm/clients/individuals` - List individual clients
- `GET /api/crm/clients/:id` - Get client details
- `POST /api/crm/clients/companies` - Create company
- `POST /api/crm/clients/individuals` - Create individual client
- `PUT /api/crm/clients/:id` - Update client
- `DELETE /api/crm/clients/:id` - Delete client (soft delete)

### Company Contacts
- `GET /api/crm/companies/:id/contacts` - List company contacts
- `POST /api/crm/companies/:id/contacts` - Add contact
- `PUT /api/crm/contacts/:id` - Update contact
- `DELETE /api/crm/contacts/:id` - Delete contact

### Contracts
- `GET /api/crm/contracts` - List contracts
- `GET /api/crm/contracts/:id` - Get contract details
- `POST /api/crm/contracts` - Create contract
- `POST /api/crm/contracts/:id/generate` - Generate contract PDF
- `POST /api/crm/contracts/:id/send-for-signature` - Send for signature
- `POST /api/crm/contracts/:id/sign` - Sign contract
- `GET /api/crm/contracts/:id/pdf` - Download contract PDF
- `PUT /api/crm/contracts/:id` - Update contract
- `DELETE /api/crm/contracts/:id` - Delete contract

### Contract Templates
- `GET /api/crm/contract-templates` - List templates
- `GET /api/crm/contract-templates/:id` - Get template
- `POST /api/crm/contract-templates` - Create template
- `PUT /api/crm/contract-templates/:id` - Update template
- `DELETE /api/crm/contract-templates/:id` - Delete template

### Interactions & Documents
- `GET /api/crm/clients/:id/interactions` - Get client interactions
- `POST /api/crm/clients/:id/interactions` - Log interaction
- `GET /api/crm/clients/:id/documents` - Get client documents
- `POST /api/crm/clients/:id/documents` - Upload document
- `GET /api/crm/clients/:id/tasks` - Get client tasks
- `POST /api/crm/clients/:id/tasks` - Create task

## Frontend Pages

### Client Management
- `/crm/clients` - Client list (companies + individuals)
- `/crm/clients/companies` - Company list
- `/crm/clients/individuals` - Individual clients list
- `/crm/clients/:id` - Client detail page
- `/crm/clients/new/company` - Create company
- `/crm/clients/new/individual` - Create individual client

### Contract Management
- `/crm/contracts` - Contract list
- `/crm/contracts/new` - Create new contract
- `/crm/contracts/:id` - Contract detail/view
- `/crm/contracts/:id/edit` - Edit contract
- `/crm/contracts/templates` - Contract templates
- `/crm/contracts/templates/new` - Create template

### Signatures
- `/crm/contracts/:id/sign` - Sign contract page
- `/crm/contracts/pending-signatures` - Pending signatures list

## Integration Points

### With Existing HR System
- Link employee contracts to CRM contracts
- Share company data between systems
- Unified client/company database

### External Services
- **E-Signature Service** (DocuSign, HelloSign, or custom)
- **Email Service** (already using Resend)
- **PDF Generation** (already using pdf-lib)
- **Storage** (already using Cloudflare R2)

## Indonesian Business Context

### Company Types
- PT (Perseroan Terbatas) - Limited Company
- CV (Commanditaire Vennootschap) - Limited Partnership
- Firma - Partnership
- UD (Usaha Dagang) - Trading Business
- Individual (Perorangan)

### Required Fields
- NPWP (Tax ID) - for tax reporting
- NIB (Nomor Induk Berusaha) - Business Registration Number
- SIUP (Surat Izin Usaha Perdagangan) - Business License (optional)

### Contract Considerations
- Indonesian contract law compliance
- Bilingual support (English/Indonesian)
- Local currency (IDR) as default
- Local date formats
- Indonesian business terms

## Technical Implementation Notes

### Contract Generation
- Use existing PDF generation utilities
- Template engine for variable substitution
- Support for rich text formatting
- Multi-page contracts
- Watermarking for drafts

### Digital Signatures
- Option 1: Integrate with DocuSign/HelloSign API
- Option 2: Custom signature solution (draw/upload signature)
- Store signature metadata and image
- PDF signature field insertion
- Legal compliance for e-signatures in Indonesia

### File Storage
- Contracts stored in Cloudflare R2
- Organized by: `/contracts/{year}/{month}/{contract-id}.pdf`
- Signed contracts: `/contracts/signed/{year}/{month}/{contract-id}-signed.pdf`
- Access control via signed URLs

### Search & Filtering
- Full-text search on contract content
- Filter by client, type, status, date range
- Advanced search with multiple criteria
- Export search results

## User Roles & Permissions

### CRM Access
- **Admin** - Full access to all CRM features
- **Sales Manager** - Can manage clients, contracts, view all data
- **Sales Rep** - Can manage assigned clients, create contracts
- **Accountant** - Read-only access to contracts and financial data
- **HR** - Can link employee contracts, view company data

### Contract Permissions
- Who can create contracts
- Who can send for signature
- Who can view signed contracts
- Who can delete/archive contracts

## Future Enhancements (Phase 3+)

- Invoice generation and tracking
- Payment tracking and reminders
- Email integration (sync emails with clients)
- Calendar integration (meetings, follow-ups)
- Mobile app
- API for third-party integrations
- Webhooks for contract events
- Advanced analytics and reporting
- Lead scoring and automation
- Email marketing integration

## Development Priority

### Phase 2.1 - Core CRM
1. Client management (companies + individuals)
2. Basic contract creation and storage
3. Contract PDF generation
4. Contract list and search

### Phase 2.2 - Signatures
1. Digital signature integration
2. Signature workflow
3. Signed contract storage
4. Signature tracking

### Phase 2.3 - Advanced Features
1. Contract templates
2. Interaction logging
3. Task management
4. Document attachments
5. Reporting and analytics

## Success Metrics

- Number of clients registered
- Number of contracts generated
- Contract signature completion rate
- Average time to contract signature
- Client retention rate
- Contract value tracking
