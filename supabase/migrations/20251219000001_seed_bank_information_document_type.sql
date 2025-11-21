-- Migration: Seed bank information document type

-- Seed bank information request template
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
  'Bank Information',
  'bank-information',
  '[]'::jsonb,
  0,
  'bank',
  '{
    "title": "Bank Information",
    "description": "Please provide your bank account information for loan disbursement and repayment processing.",
    "submit_label": "Submit Bank Information",
    "fields": [
      {
        "id": "bank_name",
        "label": "Bank Name",
        "type": "text",
        "required": true,
        "placeholder": "e.g., TD Bank, RBC, BMO"
      },
      {
        "id": "account_name",
        "label": "Account Name",
        "type": "text",
        "required": true,
        "placeholder": "Name on the account"
      },
      {
        "id": "institution_number",
        "label": "Institution Number",
        "type": "text",
        "required": true,
        "placeholder": "3-digit institution number"
      },
      {
        "id": "transit_number",
        "label": "Transit Number",
        "type": "text",
        "required": true,
        "placeholder": "5-digit transit number"
      },
      {
        "id": "account_number",
        "label": "Account Number",
        "type": "text",
        "required": true,
        "placeholder": "Account number"
      }
    ]
  }'::jsonb,
  'Collect bank account information for loan disbursement and repayment processing.'
)
ON CONFLICT (slug) DO UPDATE
SET
  default_request_kind = EXCLUDED.default_request_kind,
  default_form_schema = EXCLUDED.default_form_schema,
  description = EXCLUDED.description;

