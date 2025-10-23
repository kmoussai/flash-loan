# Flash-Loan Project Context

## Database Schema

### Tables

**public.users** (extends auth.users)
- id: UUID PK → auth.users
- kyc_status: text (pending/verified/rejected)
- national_id: text
- first_name, last_name, date_of_birth, phone, email: text
- preferred_language: text (default 'en')
- current_address_id: UUID FK → addresses
- residence_status: text
- gross_salary, rent_or_mortgage_cost, heating_electricity_cost, car_loan, furniture_loan: numeric(10,2)
- created_at, updated_at: timestamptz

**public.staff**
- id: UUID PK → auth.users
- role: enum (admin|support|intern)
- department: text
- created_at: timestamptz

**public.addresses**
- id: UUID PK
- client_id: UUID FK → users (CASCADE)
- address_type: enum (current|previous|mailing|work)
- street_number, street_name, apartment_number: text
- city, province, postal_code: text (NOT NULL)
- moving_date: date
- is_current: boolean
- verified_at: timestamptz
- created_at, updated_at: timestamptz

**public.loan_applications**
- id: UUID PK
- client_id: UUID FK → users (CASCADE)
- address_id: UUID FK → addresses (SET NULL)
- loan_amount: numeric(10,2) CHECK (0 < amount <= 1500)
- loan_type: enum (without-documents|with-documents)
- income_source: enum (employed|employment-insurance|self-employed|csst-saaq|parental-insurance|retirement-plan)
- income_fields: JSONB (dynamic based on income_source)
- application_status: enum (pending|processing|approved|rejected|cancelled)
- assigned_to: UUID FK → staff (SET NULL)
- bankruptcy_plan: boolean
- staff_notes, rejection_reason: text
- created_at, updated_at, submitted_at, approved_at, rejected_at: timestamptz

**public.references**
- id: UUID PK
- loan_application_id: UUID FK → loan_applications (CASCADE)
- first_name, last_name, phone, relationship: text (NOT NULL)
- created_at: timestamptz

### Key Database Functions

**handle_new_auth_user()** - Trigger on auth.users insert
- Creates record in public.users (if signup_type='client')
- Creates record in public.staff (if signup_type='staff')

**submit_loan_application()** - Atomic submission
- Parameters: p_first_name, p_last_name, p_email, p_phone, p_date_of_birth, p_preferred_language, p_street_number, p_street_name, p_apartment_number, p_city, p_province, p_postal_code, p_moving_date, p_loan_amount, p_loan_type, p_income_source, p_income_fields, p_bankruptcy_plan, p_references (JSONB array), p_client_id, p_residence_status, p_gross_salary, p_rent_or_mortgage_cost, p_heating_electricity_cost, p_car_loan, p_furniture_loan
- Returns: application_id, is_previous_borrower
- Handles: user update, address creation, loan application creation, references insertion (all atomic)

### Views

**client_profiles** - Users LEFT JOIN addresses (current only)

### RLS Policies

- addresses: Clients view own, staff view all
- loan_applications: Clients view own, staff view all
- references: Application owners + staff view all

## Project Structure

```
src/
├── app/
│   ├── [locale]/               # i18n routes (en, fr)
│   │   ├── components/         # Button, Header, Footer, LangSwitcher, ThemeSwitch
│   │   │                       # LoanApplicationForm, Select, ConditionalHeader/Wrapper
│   │   ├── about|apply|contact|how-it-works|repayment/
│   │   ├── page.tsx            # Homepage
│   │   └── layout.tsx
│   ├── admin/                  # Admin panel (no locale)
│   │   ├── components/         # AdminDashboardLayout, AdminSidebar, AdminTopBar
│   │   ├── dashboard/          # Main dashboard
│   │   ├── clients/            # Client list + add form, KYC badges, stats
│   │   ├── applications/       # App list + filter/search, status badges
│   │   ├── staff/              # Staff management
│   │   ├── login/
│   │   └── layout.tsx
│   └── api/
│       ├── admin/
│       │   ├── applications/   # GET: fetch all apps with joins
│       │   ├── create-user/
│       │   └── staff/manage/
│       ├── clients/            # GET/POST client CRUD
│       ├── loan-application/   # POST: submit via submit_loan_application()
│       └── staff/
├── lib/
│   ├── api/                    # API client helpers
│   └── supabase/
│       ├── client.ts           # Browser client
│       ├── server.ts           # Server client + admin client
│       ├── middleware.ts
│       ├── types.ts            # All DB types
│       ├── db-helpers.ts       # Basic users/staff CRUD
│       ├── loan-helpers.ts     # Address/loan/reference ops
│       ├── admin-helpers.ts    # Admin operations
│       └── index.ts            # Exports all
├── navigation.ts               # Route config for i18n
├── middleware.ts
└── i18n.ts

messages/
├── en.json                     # English translations
└── fr.json                     # French translations

supabase/
└── migrations/
    ├── 20251022120000_create_loan_system_tables.sql
    ├── 20251023000000_improve_loan_applications.sql
    ├── 20251023100000_create_loan_application_transaction.sql
    └── 20251023120000_add_staff_permissions.sql
```

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + CSS variables (theming)
- Radix UI components
- next-intl (i18n: en, fr)
- next-themes (light/dark + custom themes)
- Supabase (auth + database)

## Key Conventions

1. **Client Components**: Pages using `Link` from `@/src/navigation` or `useTranslations` MUST have `'use client'`
2. **Navigation**: Routes registered in `src/navigation.ts`, use `Link` from `@/src/navigation` (NOT next/link)
3. **Translations**: Underscore_Case keys in messages/en.json + messages/fr.json
4. **Admin APIs**: Use `createServerSupabaseAdminClient()` to bypass RLS
5. **Form State**: LoanApplicationForm uses localStorage for persistence
6. **Spacing**: Forms use `space-y-3 sm:space-y-4` pattern

## LoanApplicationForm Steps

1. Personal info (firstName, lastName, dateOfBirth, preferredLanguage, phone, email, loanAmount)
2. Address (streetNumber, streetName, apartmentNumber, city, province, postalCode, movingDate)
3. Financial (Quebec only: residenceStatus, grossSalary, rentOrMortgageCost, heatingElectricityCost, carLoan, furnitureLoan)
4. References (2 refs: firstName, lastName, phone, relationship)
5. Income source (dynamic fields based on type)
6. Confirmation (loanType, confirmInformation)

## Income Fields JSONB Schemas

- **employed**: occupation, company_name, supervisor_name, work_phone, post, payroll_frequency, date_hired, next_pay_date
- **employment-insurance**: employment_insurance_start_date, next_deposit_date
- **self-employed**: paid_by_direct_deposit, self_employed_phone, deposits_frequency, self_employed_start_date, next_deposit_date
- **csst-saaq|parental-insurance|retirement-plan**: next_deposit_date

## Admin Sidebar Navigation

- Dashboard (📊 /admin/dashboard)
- Clients (👥 /admin/clients)
- Applications (📝 /admin/applications)
- Staff (👨‍💼 /admin/staff)

## API Endpoints

**Public**
- POST /api/loan-application - Submit loan application (uses submit_loan_application DB function)

**Admin**
- GET /api/admin/applications - Fetch all apps (joins: users, addresses, references)
- POST /api/admin/create-user - Create admin/staff user
- GET/POST /api/clients - Client management
- GET/POST /api/admin/staff/manage - Staff CRUD

## Environment Variables Required

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (for admin operations)

