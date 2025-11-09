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
      { "id": "occupation", "label": "Occupation", "type": "text", "required": true },
      { "id": "company_name", "label": "Company Name", "type": "text", "required": true },
      { "id": "supervisor_name", "label": "Supervisor Name", "type": "text", "required": true },
      { "id": "work_phone", "label": "Work Phone", "type": "phone", "required": true, "placeholder": "(###) ###-####" },
      { "id": "post", "label": "Post", "type": "text", "required": true },
      {
        "id": "payroll_frequency",
        "label": "Payroll Frequency",
        "type": "select",
        "required": true,
        "placeholder": "Select frequency",
        "options": [
          { "label": "Weekly", "value": "weekly" },
          { "label": "Bi-Weekly", "value": "bi-weekly" },
          { "label": "Monthly", "value": "monthly" }
        ]
      },
      { "id": "date_hired", "label": "Date Hired", "type": "date", "required": true },
      { "id": "next_pay_date", "label": "Next Pay Date", "type": "date", "required": true }
    ]
  }'::jsonb,
  'Collect detailed employment information including supervisor and payroll schedule.'
)
ON CONFLICT (slug) DO UPDATE
SET
  default_request_kind = EXCLUDED.default_request_kind,
  default_form_schema = EXCLUDED.default_form_schema,
  description = EXCLUDED.description;


