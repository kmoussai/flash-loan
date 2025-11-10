-- Migration: Seed employment information request template

INSERT INTO public.document_types (
  name,
  slug,
  mime_whitelist,
  max_size_bytes,
  default_request_kind,
  default_form_schema,
  description
)
VALUES (
  'Employment Information',
  'employment-information',
  '[]'::jsonb,
  0,
  'employment',
  '{
    "title": "Employment Information",
    "description": "Collect employment details for the applicant.",
    "submit_label": "Submit Employment Info",
    "fields": [
      {
        "id": "incomeSource",
        "label": "What Is Main Income Source",
        "type": "select",
        "required": true,
        "placeholder": "Select income source",
        "options": [
          { "label": "Employed", "value": "employed" },
          { "label": "Employment Insurance", "value": "employment-insurance" },
          { "label": "Retirement Plan", "value": "retirement-plan" },
          { "label": "Self-Employed", "value": "self-employed" },
          { "label": "CSST and SAAQ disability benefits", "value": "csst-saaq" },
          { "label": "Parental insurance plan", "value": "parental-insurance" }
        ]
      },
      { "id": "occupation", "label": "Occupation", "type": "text", "required": false, "placeholder": "What is your position" },
      { "id": "companyName", "label": "Company Name", "type": "text", "required": false, "placeholder": "Name of your employer" },
      { "id": "supervisorName", "label": "Supervisor Name", "type": "text", "required": false, "placeholder": "Name of your supervisor" },
      { "id": "workPhone", "label": "Phone No", "type": "phone", "required": false, "placeholder": "514-555-1234" },
      { "id": "post", "label": "Post", "type": "text", "required": false, "placeholder": "Post Number" },
      {
        "id": "payrollFrequency",
        "label": "Payroll Frequency",
        "type": "select",
        "required": false,
        "placeholder": "Choose the frequency",
        "options": [
          { "label": "Weekly", "value": "weekly" },
          { "label": "Bi-Weekly", "value": "bi-weekly" },
          { "label": "Twice Monthly", "value": "twice-monthly" },
          { "label": "Monthly", "value": "monthly" }
        ]
      },
      { "id": "dateHired", "label": "Date Hired (Approximate)", "type": "date", "required": false },
      { "id": "nextPayDate", "label": "Next Pay Date", "type": "date", "required": false },
      { "id": "employmentInsuranceStartDate", "label": "When did your employment insurance benefits started?", "type": "date", "required": false },
      {
        "id": "paidByDirectDeposit",
        "label": "Are you paid by direct deposit?",
        "type": "select",
        "required": false,
        "placeholder": "Select option",
        "options": [
          { "label": "Yes", "value": "yes" },
          { "label": "No", "value": "no" }
        ]
      },
      { "id": "selfEmployedPhone", "label": "Phone No", "type": "phone", "required": false, "placeholder": "514-555-1234" },
      {
        "id": "depositsFrequency",
        "label": "Deposits Frequency",
        "type": "select",
        "required": false,
        "placeholder": "Choose the frequency",
        "options": [
          { "label": "Weekly", "value": "weekly" },
          { "label": "Bi-Weekly", "value": "bi-weekly" },
          { "label": "Twice Monthly", "value": "twice-monthly" },
          { "label": "Monthly", "value": "monthly" }
        ]
      },
      { "id": "selfEmployedStartDate", "label": "Start date as self-employed worker", "type": "date", "required": false },
      { "id": "nextDepositDate", "label": "Next Deposit Date", "type": "date", "required": false }
    ]
  }'::jsonb,
  'Collect detailed employment information based on income source type.'
)
ON CONFLICT (slug) DO UPDATE
SET
  default_request_kind = EXCLUDED.default_request_kind,
  default_form_schema = EXCLUDED.default_form_schema,
  description = EXCLUDED.description;


