import type { RequestKind, DocumentRequestStatus } from '@/src/lib/supabase/types'

export interface RequestFormSubmission {
  id: string
  form_data: Record<string, any>
  submitted_at: string
  submitted_by?: string | null
}

export interface ClientDocumentRequest {
  id: string
  loan_application_id?: string
  document_type_id?: string | null
  request_kind: RequestKind
  status: DocumentRequestStatus
  expires_at?: string | null
  requested_by?: string | null
  created_at?: string
  magic_link_sent_at?: string | null
  form_schema?: Record<string, any> | null
  request_form_submissions?: RequestFormSubmission[]
  application?: {
    id: string
    loan_amount: number | null
    application_status: string
    created_at: string
  } | null
  document_type?: {
    id: string
    name: string | null
    slug?: string | null
  } | null
}

export interface RequestFormProps {
  request: ClientDocumentRequest
  values: Record<string, any>
  errors: string | null
  submitting: boolean
  success: boolean
  onValueChange: (fieldId: string, value: any) => void
  onSubmit: () => void
}

export interface ReferenceFormValues {
  first_name: string
  last_name: string
  phone: string
  relationship: string
  notes: string
}

