-- Migration: Extend document_types for request kinds and form templates

-- 1) Add metadata columns to document_types
ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS default_request_kind public.request_kind NOT NULL DEFAULT 'document';

ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS default_form_schema jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS description text;

-- Ensure existing rows get default_request_kind populated explicitly (for clarity)
UPDATE public.document_types
SET default_request_kind = 'document'
WHERE default_request_kind IS NULL;

-- 2) Seed form-based request templates (idempotent on slug)
INSERT INTO public.document_types (
  name,
  slug,
  mime_whitelist,
  max_size_bytes,
  default_request_kind,
  default_form_schema,
  description
)
VALUES
  (
    'Reference Contact Details',
    'reference-contact',
    '[]'::jsonb,
    0,
    'reference',
    '{
      "title": "Reference Contact",
      "description": "Collect details for the applicant''s reference.",
      "submit_label": "Submit Reference",
      "fields": [
        { "id": "first_name", "label": "First Name", "type": "text", "required": true },
        { "id": "last_name", "label": "Last Name", "type": "text", "required": true },
        { "id": "phone", "label": "Phone Number", "type": "phone", "required": true, "placeholder": "(###) ###-####" },
        {
          "id": "relationship",
          "label": "Relationship",
          "type": "select",
          "required": true,
          "placeholder": "Select relationship",
          "options": [
            { "label": "Family", "value": "family" },
            { "label": "Friend", "value": "friend" },
            { "label": "Colleague", "value": "colleague" },
            { "label": "Employer", "value": "employer" },
            { "label": "Other", "value": "other" }
          ]
        },
        { "id": "notes", "label": "Additional Notes", "type": "textarea", "required": false, "placeholder": "Optional" }
      ]
    }'::jsonb,
    'Collect contact information for a reference provided by the applicant.'
  )
ON CONFLICT (slug) DO UPDATE
SET
  default_request_kind = EXCLUDED.default_request_kind,
  default_form_schema = EXCLUDED.default_form_schema,
  description = EXCLUDED.description;


