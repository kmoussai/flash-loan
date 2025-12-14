import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/src/lib/supabase/admin-helpers'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { RequestedItem } from '@/src/lib/email/templates/document-request'
import { createNotification } from '@/src/lib/supabase'
import {
  emitNotificationEvent,
  createNotificationEvent
} from '@/src/notifications'
import type { NotificationCategory } from '@/src/types'

const EMPLOYMENT_DEFAULT_FORM_SCHEMA = {
  title: 'Employment Verification',
  description:
    'Provide your employer contact information so our team can confirm your employment details.',
  submit_label: 'Submit Employment Details',
  fields: [
    {
      id: 'employer_name',
      label: 'Employer Name',
      type: 'text',
      required: true,
      placeholder: 'Company or organization'
    },
    {
      id: 'supervisor_name',
      label: 'Supervisor or HR Contact',
      type: 'text',
      required: true,
      placeholder: 'Contact person full name'
    },
    {
      id: 'work_phone',
      label: 'Work Phone Number',
      type: 'phone',
      required: true,
      placeholder: '(555) 555-5555'
    },
    {
      id: 'work_email',
      label: 'Work Email (optional)',
      type: 'text',
      required: false,
      placeholder: 'contact@example.com'
    },
    {
      id: 'job_title',
      label: 'Job Title',
      type: 'text',
      required: false
    },
    {
      id: 'start_date',
      label: 'Employment Start Date',
      type: 'date',
      required: false
    },
    {
      id: 'additional_notes',
      label: 'Additional Notes (optional)',
      type: 'textarea',
      required: false,
      maxLength: 500,
      helperText:
        'Include any other information that will help us reach your employer, such as the best time to call.'
    }
  ]
}

const REFERENCE_DEFAULT_FORM_SCHEMA = {
  title: 'Reference Information',
  description:
    'Please provide contact information for 2 references who can verify your character and reliability.',
  submit_label: 'Submit References',
  requires_references: true,
  min_references: 2,
  max_references: 2,
  fields: [
    {
      id: 'reference1_first_name',
      label: 'Reference 1 - First Name',
      type: 'text',
      required: true,
      placeholder: 'First name'
    },
    {
      id: 'reference1_last_name',
      label: 'Reference 1 - Last Name',
      type: 'text',
      required: true,
      placeholder: 'Last name'
    },
    {
      id: 'reference1_phone',
      label: 'Reference 1 - Phone Number',
      type: 'phone',
      required: true,
      placeholder: '(555) 555-5555'
    },
    {
      id: 'reference1_relationship',
      label: 'Reference 1 - Relationship',
      type: 'text',
      required: true,
      placeholder: 'e.g., Friend, Family, Colleague'
    },
    {
      id: 'reference2_first_name',
      label: 'Reference 2 - First Name',
      type: 'text',
      required: true,
      placeholder: 'First name'
    },
    {
      id: 'reference2_last_name',
      label: 'Reference 2 - Last Name',
      type: 'text',
      required: true,
      placeholder: 'Last name'
    },
    {
      id: 'reference2_phone',
      label: 'Reference 2 - Phone Number',
      type: 'phone',
      required: true,
      placeholder: '(555) 555-5555'
    },
    {
      id: 'reference2_relationship',
      label: 'Reference 2 - Relationship',
      type: 'text',
      required: true,
      placeholder: 'e.g., Friend, Family, Colleague'
    }
  ]
}

const BANK_DEFAULT_FORM_SCHEMA = {
  title: 'Bank Information',
  description:
    'Please provide your bank account information for loan disbursement and repayment processing.',
  submit_label: 'Submit Bank Information',
  fields: [
    {
      id: 'bank_name',
      label: 'Bank Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., TD Bank, RBC, BMO'
    },
    {
      id: 'account_name',
      label: 'Account Name',
      type: 'text',
      required: true,
      placeholder: 'Name on the account'
    },
    {
      id: 'institution_number',
      label: 'Institution Number',
      type: 'text',
      required: true,
      placeholder: '3-digit institution number'
    },
    {
      id: 'transit_number',
      label: 'Transit Number',
      type: 'text',
      required: true,
      placeholder: '5-digit transit number'
    },
    {
      id: 'account_number',
      label: 'Account Number',
      type: 'text',
      required: true,
      placeholder: 'Account number'
    }
  ]
}

// POST /api/admin/loan-apps/:id/request-docs
// Body: {
//   requests?: Array<{ document_type_id: string, request_kind?: 'document' | 'address' | 'reference' | 'employment' | 'other', form_schema?: Record<string, any> }>,
//   document_type_ids?: string[] // legacy support
//   expires_at?: string,
//   requested_by?: string
// }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const loanApplicationId = params.id
    if (!loanApplicationId) {
      return NextResponse.json(
        { error: 'Missing loan application id' },
        { status: 400 }
      )
    }

    // Require staff
    const hasStaff = await isStaff(true)
    if (!hasStaff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const legacyDocumentTypeIds: string[] = Array.isArray(
      body?.document_type_ids
    )
      ? body.document_type_ids
      : []
    const incomingRequests: any[] = Array.isArray(body?.requests)
      ? body.requests
      : []
    let expiresAt: string | undefined = body?.expires_at
    const requestedBy: string | null =
      typeof body?.requested_by === 'string' ? body.requested_by : null

    const allowedKinds = new Set([
      'document',
      'address',
      'reference',
      'employment',
      'bank',
      'other'
    ])

    const normalizedRequests: Array<{
      document_type_id: string
      request_kind:
        | 'document'
        | 'address'
        | 'reference'
        | 'employment'
        | 'bank'
        | 'other'
      form_schema: Record<string, any>
    }> = []
    const invalidRequestIndexes: number[] = []

    incomingRequests.forEach((item, index) => {
      const documentTypeId =
        item && typeof item.document_type_id === 'string'
          ? (item.document_type_id as string)
          : null

      if (!documentTypeId) {
        invalidRequestIndexes.push(index)
        return
      }

      const rawKind =
        item && typeof item.request_kind === 'string'
          ? item.request_kind.toLowerCase()
          : 'document'

      const requestKind = allowedKinds.has(rawKind)
        ? (rawKind as
            | 'document'
            | 'address'
            | 'reference'
            | 'employment'
            | 'bank'
            | 'other')
        : 'document'

      const providedFormSchema =
        item &&
        typeof item.form_schema === 'object' &&
        item.form_schema !== null &&
        !Array.isArray(item.form_schema)
          ? (item.form_schema as Record<string, any>)
          : {}

      const normalizedFormSchema =
        Object.keys(providedFormSchema).length > 0
          ? providedFormSchema
          : requestKind === 'employment'
            ? EMPLOYMENT_DEFAULT_FORM_SCHEMA
            : requestKind === 'reference'
              ? REFERENCE_DEFAULT_FORM_SCHEMA
              : requestKind === 'bank'
                ? BANK_DEFAULT_FORM_SCHEMA
                : {}

      normalizedRequests.push({
        document_type_id: documentTypeId,
        request_kind: requestKind,
        form_schema: normalizedFormSchema
      })
    })

    if (invalidRequestIndexes.length > 0) {
      return NextResponse.json(
        {
          error: 'Each request must include a document_type_id',
          invalid_requests: invalidRequestIndexes
        },
        { status: 400 }
      )
    }

    if (!normalizedRequests.length && legacyDocumentTypeIds.length) {
      legacyDocumentTypeIds.forEach(dtId => {
        if (typeof dtId === 'string') {
          normalizedRequests.push({
            document_type_id: dtId,
            request_kind: 'document',
            form_schema: {}
          })
        }
      })
    }

    if (!normalizedRequests.length) {
      return NextResponse.json(
        {
          error:
            'No requests provided. Include either requests[] or document_type_ids[]'
        },
        { status: 400 }
      )
    }

    const admin = createServerSupabaseAdminClient()

    // Ensure loan application exists
    const { data: appRow, error: appErr } = await admin
      .from('loan_applications' as any)
      .select('id')
      .eq('id', loanApplicationId)
      .single()

    if (appErr || !appRow) {
      return NextResponse.json(
        { error: 'Loan application not found' },
        { status: 404 }
      )
    }

    // Check for existing requests with same document types (documents only)
    const documentRequestCandidates = normalizedRequests.filter(
      req => req.request_kind === 'document'
    )

    let filteredRequests = [...normalizedRequests]
    let skippedDocumentTypeIds: string[] = []

    if (documentRequestCandidates.length > 0) {
      const documentTypeIds = Array.from(
        new Set(documentRequestCandidates.map(req => req.document_type_id))
      )

      const { data: existingRequests, error: checkErr } = await admin
        .from('document_requests' as any)
        .select('document_type_id, status')
        .eq('loan_application_id', loanApplicationId)
        .in('document_type_id', documentTypeIds)
        .in('status', ['requested', 'uploaded'])

      if (checkErr) {
        return NextResponse.json(
          { error: 'Failed to check existing requests' },
          { status: 400 }
        )
      }

      const existingTypeIds = new Set(
        (existingRequests || []).map((r: any) => r.document_type_id)
      )

      filteredRequests = filteredRequests.filter(req => {
        if (
          req.request_kind === 'document' &&
          existingTypeIds.has(req.document_type_id)
        ) {
          skippedDocumentTypeIds.push(req.document_type_id)
          return false
        }
        return true
      })
    }

    if (filteredRequests.length === 0) {
      return NextResponse.json(
        {
          error:
            'All selected requests already have pending or active items for this application',
          skipped: skippedDocumentTypeIds.length
            ? Array.from(new Set(skippedDocumentTypeIds))
            : undefined
        },
        { status: 400 }
      )
    }

    const now = new Date()
    const nowIso = now.toISOString()
    // Default expiry: 7 days from now if not provided
    if (!expiresAt) {
      const def = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      expiresAt = def.toISOString()
    }

    // Create a group for this set of requests
    const { data: groupRow, error: groupErr } = await admin
      .from('document_request_groups' as any)
      // @ts-ignore
      .insert({
        loan_application_id: loanApplicationId,
        expires_at: expiresAt || null,
        created_at: nowIso,
        updated_at: nowIso
      })
      .select('id')
      .single()

    if (groupErr || !groupRow) {
      return NextResponse.json(
        { error: groupErr?.message || 'Failed to create request group' },
        { status: 400 }
      )
    }

    const groupId = (groupRow as any).id as string

    // Check if any bank requests are being created - if so, also request spécimen document
    const hasBankRequest = filteredRequests.some(
      req => req.request_kind === 'bank'
    )
    let specimenDocumentTypeId: string | null = null
    let specimenAdded = false

    if (hasBankRequest) {
      // Find the specimen check document type by slug (migration ensures it exists)
      const { data: specimenDocType, error: specimenErr } = await admin
        .from('document_types' as any)
        .select('id')
        .eq('slug', 'specimen_check')
        .maybeSingle()

      if (!specimenErr && specimenDocType) {
        specimenDocumentTypeId = (specimenDocType as any).id

        // Check if specimen document request already exists for this application
        if (specimenDocumentTypeId) {
          const { data: existingSpecimen } = await admin
            .from('document_requests' as any)
            .select('id')
            .eq('loan_application_id', loanApplicationId)
            .eq('document_type_id', specimenDocumentTypeId)
            .in('status', ['requested', 'uploaded'])
            .maybeSingle()

          // Only add if it doesn't already exist
          if (!existingSpecimen) {
            filteredRequests.push({
              document_type_id: specimenDocumentTypeId,
              request_kind: 'document',
              form_schema: {}
            })
            specimenAdded = true
          }
        }
      } else {
        console.warn(
          '[request-docs] Specimen document type (slug: specimen_check) not found. Bank request created without specimen document requirement.'
        )
      }
    }

    const rowsToInsert = filteredRequests.map(req => ({
      loan_application_id: loanApplicationId,
      document_type_id: req.document_type_id,
      group_id: groupId,
      request_kind: req.request_kind,
      status: 'requested',
      expires_at: expiresAt || null,
      form_schema: req.form_schema || {},
      requested_by: requestedBy,
      created_at: nowIso,
      updated_at: nowIso
    }))

    const { data: inserted, error: insErr } = await admin
      .from('document_requests' as any)
      // @ts-ignore
      .insert(rowsToInsert)
      .select('id')

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 })
    }

    // Get client information for email
    const { data: appWithUser, error: userErr } = await admin
      .from('loan_applications' as any)
      .select(
        'users:client_id(id, first_name, last_name, email, preferred_language)'
      )
      .eq('id', loanApplicationId)
      .single()

    // Set preferred language early (needed for building requested items)
    const preferredLanguage: 'en' | 'fr' =
      (appWithUser as any)?.users?.preferred_language === 'fr' ? 'fr' : 'en'

    // Build authenticated dashboard link instead of token-based upload-documents link
    const createdIds = (inserted || []).map((r: any) => r.id)
    const { getAppUrl } = await import('@/src/lib/config')
    const clientId = (appWithUser as any)?.users?.id as string | undefined
    const clientEmail = (appWithUser as any)?.users?.email as string | undefined

    let dashboard_link: string | null = null

    // Generate reusable authentication link using signed token
    if (clientId && clientEmail) {
      try {
        const { signAuthToken } = await import('@/src/lib/security/token')

        // Determine expiry for token (default to 7 days if not provided, or use expiresAt)
        const expMs = expiresAt
          ? new Date(expiresAt).getTime()
          : Date.now() + 7 * 24 * 60 * 60 * 1000

        // Create reusable signed token
        const authToken = signAuthToken(clientId, expMs)

        // Build dashboard URL
        const dashboardUrl = `/${preferredLanguage}/client/dashboard?section=documents`

        // Create reusable authentication link
        dashboard_link = `${getAppUrl()}/api/auth/authenticate?token=${encodeURIComponent(authToken)}&redirect_to=${encodeURIComponent(dashboardUrl)}`
      } catch (error: any) {
        console.error(
          '[POST /api/admin/loan-apps/:id/request-docs] Error generating auth token:',
          error
        )
        // Fallback to dashboard link (user will need to log in manually)
        dashboard_link = `${getAppUrl()}/${preferredLanguage}/client/dashboard?section=documents`
      }
    }

    // Get document type names for email and build requested items list
    const documentTypeIdsForEmail = filteredRequests
      .filter(req => req.request_kind === 'document')
      .map(req => req.document_type_id)

    const { data: docTypes, error: docTypesErr } =
      documentTypeIdsForEmail.length > 0
        ? await admin
            .from('document_types' as any)
            .select('id, name')
            .in('id', Array.from(new Set(documentTypeIdsForEmail)))
        : { data: [], error: null }

    if (docTypesErr) {
      return NextResponse.json(
        { error: docTypesErr.message || 'Failed to fetch document type names' },
        { status: 400 }
      )
    }

    const documentNames = (docTypes || [])
      .map((dt: any) => dt.name)
      .filter(Boolean)

    // Build requested items list for email (all kinds, not just documents)
    const requestedItems: RequestedItem[] = []

    // Add documents
    documentNames.forEach(name => {
      requestedItems.push({
        kind: 'document',
        label: name
      })
    })

    // Add other request kinds
    filteredRequests.forEach(req => {
      if (req.request_kind === 'document') {
        // Already added above
        return
      }

      // Get label based on request kind
      let label = ''
      switch (req.request_kind) {
        case 'reference':
          label =
            preferredLanguage === 'fr'
              ? 'Fournir les informations de référence'
              : 'Provide reference information'
          break
        case 'employment':
          label =
            preferredLanguage === 'fr'
              ? "Fournir les informations d'emploi"
              : 'Provide employment information'
          break
        case 'bank':
          label =
            preferredLanguage === 'fr'
              ? 'Fournir les informations bancaires'
              : 'Provide bank information'
          break
        case 'address':
          label =
            preferredLanguage === 'fr'
              ? "Confirmer les informations d'adresse"
              : 'Confirm address information'
          break
        default:
          label =
            preferredLanguage === 'fr'
              ? 'Fournir les informations demandées'
              : 'Provide requested information'
      }

      requestedItems.push({
        kind: req.request_kind,
        label
      })
    })

    const clientRecord = (appWithUser as any)?.users
    const clientIdForNotification = clientRecord?.id as string | undefined

    // Prepare notification data (used both for database notification and email event)
    const notificationRequestIds = (inserted || [])
      .map((r: any) => r.id as string)
      .filter(Boolean)
    const requestKinds = filteredRequests.map(req => req.request_kind)

    const kindLabels: Record<string, string> = {
      document: documentNames.length
        ? `Upload ${documentNames.join(', ')}`
        : 'Upload requested documents',
      reference: 'Provide reference details',
      employment: 'Share employment information',
      address: 'Confirm your address details',
      other: 'Provide the requested information'
    }

    const uniqueKinds = Array.from(new Set(requestKinds))
    const descriptionParts = uniqueKinds.map(
      kind => kindLabels[kind] || kindLabels.other
    )
    const notificationCategory: NotificationCategory =
      uniqueKinds.length === 1
        ? uniqueKinds[0] === 'document'
          ? 'document_request_created'
          : uniqueKinds[0] === 'reference'
            ? 'reference_request_created'
            : uniqueKinds[0] === 'employment'
              ? 'employment_request_created'
              : uniqueKinds[0] === 'address'
                ? 'address_request_created'
                : 'multi_request_created'
        : 'multi_request_created'

    if (clientIdForNotification) {
      const notificationTitle = 'Action needed for your loan application'
      const notificationMessage =
        descriptionParts.length > 0
          ? `Please complete the following to keep things moving: ${descriptionParts.join('; ')}.`
          : 'We need additional information to continue processing your application.'

      const metadata = {
        type: 'request_prompt' as const,
        requestIds: notificationRequestIds,
        groupId,
        loanApplicationId,
        requestKinds,
        expiresAt: expiresAt || null
      }

      await createNotification(
        {
          recipientId: clientIdForNotification,
          recipientType: 'client',
          title: notificationTitle,
          message: notificationMessage,
          category: notificationCategory,
          metadata
        },
        { client: admin }
      )
    }

    // Emit notification event if we have client info and requested items
    let emailSent = false
    let emailError: string | null = null

    if (
      dashboard_link &&
      appWithUser &&
      (appWithUser as any)?.users?.email &&
      requestedItems.length > 0 &&
      clientIdForNotification
    ) {
      const clientEmail = (appWithUser as any).users.email
      const clientFirstName = (appWithUser as any).users.first_name || ''
      const clientLastName = (appWithUser as any).users.last_name || ''

      // Determine the event type based on request kinds
      const uniqueKinds = Array.from(
        new Set(requestedItems.map(item => item.kind))
      )
      const eventType =
        uniqueKinds.length === 1 && uniqueKinds[0] === 'document'
          ? 'document_request_created'
          : 'document_request_created' // Use document_request_created as default for all request types

      // Get the first request ID for the metadata (or use group ID)
      const firstRequestId = notificationRequestIds?.[0] || groupId

      // Emit notification event using the new event-driven system
      const notificationEvent = createNotificationEvent(
        eventType,
        {
          id: clientIdForNotification,
          type: 'client',
          email: clientEmail,
          preferredLanguage: preferredLanguage as 'en' | 'fr',
          firstName: clientFirstName || undefined,
          lastName: clientLastName || undefined
        },
        {
          requestId: firstRequestId,
          loanApplicationId,
          requestedItems,
          uploadLink: dashboard_link,
          expiresAt: expiresAt || null
        },
        {
          category: notificationCategory,
          sendEmail: true,
          createNotification: false // Already created above
        }
      )
      const immediate = true
      const eventResult = await emitNotificationEvent(notificationEvent, {
        immediate // Process immediately
      })

      emailSent = eventResult.success
      emailError = eventResult.error || null

      if (emailSent) {
        // Update all requests in the group with magic_link_sent_at
        await admin
          .from('document_requests' as any)
          // @ts-ignore
          .update({ magic_link_sent_at: nowIso })
          .eq('group_id', groupId)
      }
    }

    // Include information about which types were skipped
    const skipped = skippedDocumentTypeIds.length
      ? Array.from(new Set(skippedDocumentTypeIds))
      : undefined

    return NextResponse.json({
      ok: true,
      group_id: groupId,
      dashboard_link,
      request_ids: createdIds,
      skipped,
      email_sent: emailSent,
      email_error: emailError || undefined
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
