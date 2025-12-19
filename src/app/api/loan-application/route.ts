import { NextRequest, NextResponse } from 'next/server'
import {
  createServerSupabaseClient,
  createServerSupabaseAdminClient
} from '@/src/lib/supabase/server'
import { createNotification } from '@/src/lib/supabase'
import type { NotificationCategory } from '@/src/types'
import {
  IncomeSourceType,
  EmployedIncomeFields,
  EmploymentInsuranceIncomeFields,
  SelfEmployedIncomeFields,
  OtherIncomeFields,
  Frequency,
  IbvProvider
} from '@/src/lib/supabase/types'
import { assertFrequency } from '@/src/lib/utils/frequency'
import { generateReadablePassword } from '@/src/lib/utils/password'
import { sendInvitationEmail } from '@/src/lib/utils/temp-password'
import { validateMinimumAge } from '@/src/lib/utils/age'
import { initializeZumrailsSession } from '@/src/lib/ibv/zumrails-server'
import { createIbvProviderData } from '@/src/lib/supabase/ibv-helpers'
import { sendEmail } from '@/src/lib/email/smtp'
import { generateNewApplicationAdminEmail } from '@/src/lib/email/templates/new-application-admin'
import { getAppUrl } from '@/src/lib/config'

const IBV_PROVIDER: IbvProvider = 'zumrails'

// ===========================
// TYPE DEFINITIONS
// ===========================

interface LoanApplicationRequestBody {
  // Flow control
  isQuickApply?: boolean

  // Personal Information
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  preferredLanguage: string

  // Address Information
  streetNumber?: string
  streetName?: string
  apartmentNumber?: string
  city?: string
  province?: string
  postalCode?: string
  country?: string
  movingDate?: string
  rentCost?: string

  // Financial Obligations (Quebec only)
  residenceStatus?: string
  grossSalary?: string
  rentOrMortgageCost?: string
  heatingElectricityCost?: string
  carLoan?: string
  furnitureLoan?: string

  // References
  reference1FirstName?: string
  reference1LastName?: string
  reference1Phone?: string
  reference1Relationship?: string
  reference2FirstName?: string
  reference2LastName?: string
  reference2Phone?: string
  reference2Relationship?: string

  // Income Information
  incomeSource?: IncomeSourceType
  // Employed fields
  occupation?: string
  companyName?: string
  supervisorName?: string
  workPhone?: string
  post?: string
  payrollFrequency?: Frequency
  dateHired?: string
  nextPayDate?: string
  // Employment Insurance fields
  employmentInsuranceStartDate?: string
  // Self-Employed fields
  paidByDirectDeposit?: 'yes' | 'no'
  selfEmployedPhone?: string
  depositsFrequency?: Frequency
  selfEmployedStartDate?: string
  // Common field for most income types
  nextDepositDate?: string

  // Loan Details
  loanAmount: string

  // Pre-qualification
  bankruptcyPlan?: boolean

  // Confirmation
  confirmInformation: boolean

  // IBV Data (modular, provider-agnostic)
  ibvProvider?: 'flinks' | 'inverite' | 'plaid' | 'other'
  ibvStatus?:
    | 'pending'
    | 'processing'
    | 'verified'
    | 'failed'
    | 'cancelled'
    | 'expired'
  ibvProviderData?: any
  ibvVerifiedAt?: string
}

// ===========================
// VALIDATION FUNCTIONS
// ===========================

function validateQuickApplyFields(
  body: LoanApplicationRequestBody
): string | null {
  const required = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'dateOfBirth',
    'preferredLanguage',
    'province',
    'loanAmount'
  ] as const

  for (const field of required) {
    if (!body[field]) {
      return `Missing required quick apply field: ${field}`
    }
  }

  if (!body.confirmInformation) {
    return 'You must confirm that the information is accurate'
  }

  return null
}

function validateFullApplicationFields(
  body: LoanApplicationRequestBody
): string | null {
  const required = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'dateOfBirth',
    'preferredLanguage',
    'streetNumber',
    'streetName',
    'city',
    'province',
    'postalCode',
    'movingDate',
    'loanAmount',
    'incomeSource',
    'reference1FirstName',
    'reference1LastName',
    'reference1Phone',
    'reference1Relationship',
    'reference2FirstName',
    'reference2LastName',
    'reference2Phone',
    'reference2Relationship'
  ] as const

  for (const field of required) {
    if (!body[field]) {
      return `Missing required field: ${field}`
    }
  }

  if (body.province === 'Quebec') {
    const quebecRequired = [
      'residenceStatus',
      'grossSalary',
      'rentOrMortgageCost',
      'heatingElectricityCost',
      'carLoan',
      'furnitureLoan'
    ] as const

    for (const field of quebecRequired) {
      if (!body[field]) {
        return `Missing required field for Quebec residents: ${field}`
      }
    }
  }

  if (body.incomeSource === 'employed') {
    const employedRequired = [
      'occupation',
      'companyName',
      'supervisorName',
      'workPhone',
      'post',
      'payrollFrequency',
      'dateHired',
      'nextPayDate'
    ] as const

    for (const field of employedRequired) {
      if (!body[field]) {
        return `Missing required field for employed income: ${field}`
      }
    }
  } else if (body.incomeSource === 'employment-insurance') {
    if (!body.employmentInsuranceStartDate || !body.nextDepositDate) {
      return 'Missing required fields for employment insurance'
    }
  } else if (body.incomeSource === 'self-employed') {
    const selfEmployedRequired = [
      'paidByDirectDeposit',
      'selfEmployedPhone',
      'depositsFrequency',
      'selfEmployedStartDate',
      'nextDepositDate'
    ] as const

    for (const field of selfEmployedRequired) {
      if (!body[field]) {
        return `Missing required field for self-employed income: ${field}`
      }
    }
  } else if (!body.nextDepositDate) {
    return 'Missing required field: nextDepositDate'
  }

  if (!body.confirmInformation) {
    return 'You must confirm that the information is accurate'
  }

  return null
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validateLoanAmount(amount: string): boolean {
  const numAmount = parseFloat(amount)
  return !isNaN(numAmount) && numAmount > 0 && numAmount <= 1500
}

function validateAge(dateOfBirth: string): string | null {
  if (!dateOfBirth) {
    return 'Date of birth is required'
  }

  const validation = validateMinimumAge(dateOfBirth, 18)
  if (!validation.isValid) {
    return validation.error || 'Age validation failed'
  }

  return null
}

// ===========================
// INCOME FIELDS BUILDER
// ===========================

function buildIncomeFields(
  incomeSource: IncomeSourceType | null,
  body: LoanApplicationRequestBody
):
  | EmployedIncomeFields
  | EmploymentInsuranceIncomeFields
  | SelfEmployedIncomeFields
  | OtherIncomeFields
  | Record<string, never> {
  if (!incomeSource) {
    return {}
  }

  switch (incomeSource) {
    case 'employed':
      return {
        occupation: body.occupation!,
        company_name: body.companyName!,
        supervisor_name: body.supervisorName!,
        work_phone: body.workPhone!,
        post: body.post!,
        payroll_frequency: assertFrequency(body.payrollFrequency, 'monthly'),
        date_hired: body.dateHired!,
        next_pay_date: body.nextPayDate!
      } as EmployedIncomeFields

    case 'employment-insurance':
      return {
        employment_insurance_start_date: body.employmentInsuranceStartDate!,
        next_deposit_date: body.nextDepositDate!
      } as EmploymentInsuranceIncomeFields

    case 'self-employed':
      return {
        paid_by_direct_deposit: body.paidByDirectDeposit!,
        self_employed_phone: body.selfEmployedPhone!,
        deposits_frequency: assertFrequency(body.depositsFrequency, 'monthly'),
        self_employed_start_date: body.selfEmployedStartDate!,
        next_deposit_date: body.nextDepositDate!
      } as SelfEmployedIncomeFields

    default:
      // For csst-saaq, parental-insurance, retirement-plan
      return {
        next_deposit_date: body.nextDepositDate!
      } as OtherIncomeFields
  }
}

// Note: Database operations are now handled by the submit_loan_application PostgreSQL function
// This ensures atomic transactions - if any step fails, everything rolls back

// ===========================
// BACKGROUND NOTIFICATION HELPER
// ===========================

/**
 * Send admin notifications in the background (non-blocking)
 * This function runs asynchronously after the response is sent to the client
 */
async function sendAdminNotifications(params: {
  applicationId: string
  clientId: string
  loanAmount: number
  preferredLanguage: 'en' | 'fr'
  origin: string
}) {
  const { applicationId, clientId, loanAmount, preferredLanguage, origin } = params
  
  try {
    const adminClient = createServerSupabaseAdminClient()

    const { data: applicationDetails } = await adminClient
      .from('loan_applications' as any)
      .select(
        `
          id,
          client_id,
          application_status,
          assigned_to,
          loan_amount,
          users:client_id (
            first_name,
            last_name,
            email
          )
        `
      )
      .eq('id', applicationId)
      .maybeSingle()

    if (!applicationDetails) {
      console.warn('[Loan Application] Application not found for notifications:', applicationId)
      return
    }

    const staffRecipients = new Set<string>()

    if ((applicationDetails as any).assigned_to) {
      staffRecipients.add((applicationDetails as any).assigned_to)
    }

    // Get admin staff members
    const { data: adminStaff } = await adminClient
      .from('staff' as any)
      .select('id, role')
      .eq('role', 'admin')

    adminStaff?.forEach((staff: { id: string } | null) => {
      if (staff?.id) {
        staffRecipients.add(staff.id)
      }
    })

    const clientFirstName =
      (applicationDetails as any)?.users?.first_name ?? ''
    const clientLastName =
      (applicationDetails as any)?.users?.last_name ?? ''
    const clientEmail = (applicationDetails as any)?.users?.email ?? ''
    const clientName = [clientFirstName, clientLastName]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Client'

    // Create in-app notifications
    if (staffRecipients.size > 0) {
      await Promise.all(
        Array.from(staffRecipients).map(staffId =>
          createNotification(
            {
              recipientId: staffId,
              recipientType: 'staff',
              title: 'New loan application submitted',
              message: clientName
                ? `${clientName} just submitted a new loan application.`
                : 'A client just submitted a new loan application.',
              category: 'application_submitted' as NotificationCategory,
              metadata: {
                type: 'application_event' as const,
                loanApplicationId: (applicationDetails as any).id,
                clientId: (applicationDetails as any).client_id,
                status: (applicationDetails as any).application_status,
                submittedAt: new Date().toISOString()
              }
            },
            { client: adminClient }
          )
        )
      )
    }

    // Send email notifications to admin users
    if (adminStaff && adminStaff.length > 0) {
      try {
        // Get admin emails from auth.users
        const adminIds = adminStaff.map((s: { id: string }) => s.id)
        
        // Fetch admin user emails from auth.users
        const adminEmails: string[] = []
        for (const adminId of adminIds) {
          try {
            const { data: authUser } = await adminClient.auth.admin.getUserById(adminId)
            if (authUser?.user?.email) {
              adminEmails.push(authUser.user.email)
            }
          } catch (err) {
            console.warn(`[Loan Application] Failed to get email for admin ${adminId}:`, err)
          }
        }

        if (adminEmails && adminEmails.length > 0) {
          const applicationUrl = `${origin}/admin/applications/${applicationId}`
          const finalLoanAmount = (applicationDetails as any).loan_amount || loanAmount

          const emailContent = generateNewApplicationAdminEmail({
            applicationId: applicationId,
            clientName: clientName,
            clientEmail: clientEmail,
            loanAmount: finalLoanAmount,
            applicationUrl: applicationUrl,
            preferredLanguage: preferredLanguage
          })

          // Send email to all admin users
          await sendEmail({
            to: adminEmails,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          })

          console.log('[Loan Application] Admin notification emails sent:', {
            applicationId: applicationId,
            recipientCount: adminEmails.length
          })
        }
      } catch (emailError: any) {
        console.error(
          '[Loan Application] Failed to send admin notification emails:',
          emailError
        )
        // Non-fatal - continue even if email fails
      }
    }
  } catch (error: any) {
    console.error(
      '[Loan Application] Background notification error:',
      error
    )
  }
}

// ===========================
// MAIN POST HANDLER
// ===========================

export async function POST(request: NextRequest) {
  try {
    const body: LoanApplicationRequestBody = await request.json()
    const isQuickApply = Boolean(body.isQuickApply)

    // Validate required fields based on flow
    const validationError = isQuickApply
      ? validateQuickApplyFields(body)
      : validateFullApplicationFields(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Validate email format
    if (!validateEmail(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate loan amount
    if (!validateLoanAmount(body.loanAmount)) {
      return NextResponse.json(
        { error: 'Loan amount must be between $1 and $1,500' },
        { status: 400 }
      )
    }

    // Validate age (must be at least 18 years old)
    const ageValidationError = validateAge(body.dateOfBirth)
    if (ageValidationError) {
      return NextResponse.json({ error: ageValidationError }, { status: 400 })
    }

    // Validate IBV status if provided
    if (
      body.ibvStatus &&
      ![
        'pending',
        'processing',
        'verified',
        'failed',
        'cancelled',
        'expired'
      ].includes(body.ibvStatus)
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid IBV status. Must be one of: pending, processing, verified, failed, cancelled, expired'
        },
        { status: 400 }
      )
    }

    // Initialize Supabase admin client (bypasses RLS for public submissions)
    console.log('Environment check:')
    console.log(
      '- NEXT_PUBLIC_SUPABASE_URL:',
      process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'
    )
    console.log(
      '- SUPABASE_SERVICE_ROLE_KEY:',
      process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing'
    )

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error: 'Server configuration error',
          details:
            'SUPABASE_SERVICE_ROLE_KEY is not configured. Please add it to your .env.local file.'
        },
        { status: 500 }
      )
    }

    const supabase = createServerSupabaseAdminClient()

    // Check if user already exists by email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', body.email)
      .maybeSingle()

    let userId: string | null = null
    let authUserIdToCleanup: string | null = null
    let isPreviousBorrower = false

    if (existingUser as any) {
      // User exists - they're a previous borrower
      userId = (existingUser as any).id
      isPreviousBorrower = true
      console.log('Existing user found:', userId)
    } else {
      // New user - create auth account first (required for foreign key)
      // The transaction function will handle creating the public.users record
      console.log('Creating new auth user for:', body.email)

      // Generate a secure, readable temporary password
      const tempPassword = generateReadablePassword()

      // Create auth user
      const { data: authData, error: signUpError } =
        await supabase.auth.admin.createUser({
          email: body.email,
          password: tempPassword,
          email_confirm: true, // Confirm email so user can sign in with temp password
          user_metadata: {
            first_name: body.firstName,
            last_name: body.lastName,
            phone: body.phone,
            signup_type: 'client',
            requires_password_change: true // Require password change on first login
          }
        })

      if (signUpError || !authData?.user) {
        console.error('Error creating auth user:', signUpError)

        // Check if user was actually created despite the error
        const { data: checkUser } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', body.email)
          .maybeSingle()

        if (checkUser) {
          userId = (checkUser as any).id
          console.log('User found despite error, using existing ID:', userId)
        } else {
          return NextResponse.json(
            {
              error: 'Failed to create user account',
              details: signUpError?.message || 'Unknown error'
            },
            { status: 500 }
          )
        }
      } else {
        userId = authData.user.id
        authUserIdToCleanup = userId // Track for potential cleanup
        console.log('New auth user created:', userId)

        // Wait for trigger to create public.users record
        await new Promise(resolve => setTimeout(resolve, 500))

        // Send invitation email with temporary password using reusable utility
        try {
          const preferredLanguage = (
            body.preferredLanguage === 'fr' ? 'fr' : 'en'
          ) as 'en' | 'fr'

          const emailResult = await sendInvitationEmail({
            email: body.email,
            firstName: body.firstName,
            lastName: body.lastName,
            temporaryPassword: tempPassword,
            preferredLanguage
          })

          if (emailResult.success) {
            console.log(
              '[Loan Application] Invitation email sent successfully to:',
              body.email
            )
          } else {
            console.warn(
              '[Loan Application] Failed to send invitation email:',
              emailResult.error
            )
            // Don't fail the application if email fails - account is still created
          }
        } catch (emailError: any) {
          console.error(
            '[Loan Application] Error sending invitation email:',
            emailError
          )
          // Don't fail the application if email fails - account is still created
        }
      }
    }

    // Prepare references array when provided (full application)
    const references = [] as Array<{
      first_name: string
      last_name: string
      phone: string
      relationship: string
    }>

    if (!isQuickApply && body.reference1FirstName && body.reference2FirstName) {
      references.push(
        {
          first_name: body.reference1FirstName,
          last_name: body.reference1LastName!,
          phone: body.reference1Phone!,
          relationship: body.reference1Relationship!
        },
        {
          first_name: body.reference2FirstName,
          last_name: body.reference2LastName!,
          phone: body.reference2Phone!,
          relationship: body.reference2Relationship!
        }
      )
    }

    const incomeSource = body.incomeSource ?? null
    const incomeFields = isQuickApply
      ? {}
      : buildIncomeFields(incomeSource, body)

    // Call the atomic transaction function
    // Pass NULL for p_client_id if new user - transaction will find/create by email
    // Transaction function handles all user/address/application/references atomically
    console.log('Calling submit_loan_application transaction...')
    const { data: result, error: submitError } = await (supabase.rpc as any)(
      'submit_loan_application',
      {
        // Required parameters (in order)
        p_first_name: body.firstName,
        p_last_name: body.lastName,
        p_email: body.email,
        p_phone: body.phone,
        p_date_of_birth: body.dateOfBirth,
        p_preferred_language: body.preferredLanguage,
        p_loan_amount: parseFloat(body.loanAmount), // Required - must come before optional params
        // Minimal loan preferences (optional with defaults)
        p_province: body.province || null,
        p_income_source: incomeSource,
        p_income_fields: incomeFields,
        p_bankruptcy_plan: body.bankruptcyPlan ?? false,
        p_references: references,
        // Optional parameters (with defaults)
        // For existing users: pass userId (transaction will use it)
        // For new users: pass NULL to let transaction find/use trigger-created user by email
        // This ensures transaction handles everything atomically
        p_client_id: existingUser ? userId : null,
        p_street_number: body.streetNumber || null,
        p_street_name: body.streetName || null,
        p_apartment_number: body.apartmentNumber || null,
        p_city: body.city || null,
        p_postal_code: body.postalCode?.replace(/\s+/g, '') || null,
        p_moving_date: body.movingDate || null,
        p_residence_status: body.residenceStatus || null,
        p_gross_salary: body.grossSalary ? parseFloat(body.grossSalary) : null,
        p_rent_or_mortgage_cost: body.rentOrMortgageCost
          ? parseFloat(body.rentOrMortgageCost)
          : null,
        p_heating_electricity_cost: body.heatingElectricityCost
          ? parseFloat(body.heatingElectricityCost)
          : null,
        p_car_loan: body.carLoan ? parseFloat(body.carLoan) : null,
        p_furniture_loan: body.furnitureLoan
          ? parseFloat(body.furnitureLoan)
          : null,
        p_rent_cost: body.rentCost ? parseFloat(body.rentCost) : null,
        // IBV data (modular, provider-agnostic)
        p_ibv_provider: body.ibvProvider || null,
        p_ibv_status: body.ibvStatus || null,
        p_ibv_provider_data: body.ibvProviderData || null
      }
    )

    if (submitError) {
      console.error('Transaction error:', submitError)

      // Clean up auth user if transaction failed and we created a new one
      if (authUserIdToCleanup) {
        console.log(
          'Cleaning up auth user due to transaction failure:',
          authUserIdToCleanup
        )
        try {
          await supabase.auth.admin.deleteUser(authUserIdToCleanup)
          console.log('Auth user cleaned up successfully')
        } catch (cleanupError) {
          console.error('Failed to clean up auth user:', cleanupError)
          // Continue anyway - error already occurred
        }
      }

      throw new Error(submitError.message)
    }

    console.log('Transaction successful:', result)

    const txResult = result as any

    let requestGuidFromBody: string | null = null

    // If Inverite request GUID is present in provider data, persist it in ibv_results for easier access
    try {
      requestGuidFromBody = (body.ibvProviderData as any)?.request_guid || null
      if (requestGuidFromBody && txResult?.application_id) {
        const supabaseForUpdate = createServerSupabaseAdminClient()
        await (supabaseForUpdate as any)
          .from('loan_applications')
          .update({
            ibv_results: { request_guid: requestGuidFromBody }
          })
          .eq('id', txResult.application_id)
      }
    } catch (e) {
      // Non-fatal: continue even if this convenience write fails
      console.warn(
        '[Loan Application] Failed to set initial ibv_results.request_guid',
        e
      )
    }

    // Ensure IBV request is saved to loan_application_ibv_requests table
    // The database function should have already done this, but we'll ensure it's saved explicitly
    if (body.ibvProvider === 'inverite' && txResult?.application_id) {
      try {
        const requestGuid =
          requestGuidFromBody ||
          (body.ibvProviderData as any)?.request_guid ||
          (body.ibvProviderData as any)?.requestGuid ||
          null

        if (requestGuid) {
          const supabaseForIbv = createServerSupabaseAdminClient()
          const requestedAt = new Date().toISOString()

          // Get client_id from result or fetch from application if not available
          let clientId = txResult?.client_id
          if (!clientId) {
            const { data: application } = await (supabaseForIbv as any)
              .from('loan_applications')
              .select('client_id')
              .eq('id', txResult.application_id)
              .single()
            clientId = application?.client_id
          }

          if (!clientId) {
            console.warn(
              '[Loan Application] Cannot save IBV request: client_id not found'
            )
          } else {
            // Check if IBV request already exists for this application and provider
            // The unique constraint is now on (loan_application_id, provider)
            const { data: existingRequest } = await (supabaseForIbv as any)
              .from('loan_application_ibv_requests')
              .select('id')
              .eq('loan_application_id', txResult.application_id)
              .eq('provider', 'inverite')
              .maybeSingle()

            if (!existingRequest) {
              // Create IBV request record if it doesn't exist
              const providerData = {
                request_guid: requestGuid,
                iframe_url: (body.ibvProviderData as any)?.iframe_url || null,
                initiated_by: 'client',
                requested_at: requestedAt,
                ...(body.ibvProviderData || {})
              }

              const { error: ibvInsertError } = await (supabaseForIbv as any)
                .from('loan_application_ibv_requests')
                .insert({
                  loan_application_id: txResult.application_id,
                  client_id: clientId,
                  provider: 'inverite',
                  status: body.ibvStatus || 'pending',
                  request_url:
                    (body.ibvProviderData as any)?.start_url ||
                    (body.ibvProviderData as any)?.iframe_url ||
                    null,
                  provider_data: providerData, // Contains request_guid for Inverite
                  requested_at: requestedAt,
                  completed_at:
                    body.ibvStatus === 'verified' ? requestedAt : null
                })

              if (ibvInsertError) {
                console.error(
                  '[Loan Application] Failed to save IBV request to loan_application_ibv_requests:',
                  ibvInsertError
                )
                // Non-fatal: continue even if this fails
              } else {
                console.log(
                  '[Loan Application] Successfully saved IBV request to loan_application_ibv_requests:',
                  requestGuid
                )
              }
            } else {
              // Update existing record
              const providerData = {
                request_guid: requestGuid,
                iframe_url: (body.ibvProviderData as any)?.iframe_url || null,
                initiated_by: 'client',
                requested_at: requestedAt,
                ...(body.ibvProviderData || {})
              }

              const { error: ibvUpdateError } = await (supabaseForIbv as any)
                .from('loan_application_ibv_requests')
                .update({
                  request_url:
                    (body.ibvProviderData as any)?.start_url ||
                    (body.ibvProviderData as any)?.iframe_url ||
                    null,
                  provider_data: providerData, // Contains request_guid for Inverite
                  status: body.ibvStatus || 'pending',
                  completed_at:
                    body.ibvStatus === 'verified' ? requestedAt : null,
                  updated_at: requestedAt
                })
                .eq('loan_application_id', txResult.application_id)
                .eq('provider', 'inverite')

              if (ibvUpdateError) {
                console.error(
                  '[Loan Application] Failed to update IBV request:',
                  ibvUpdateError
                )
              } else {
                console.log(
                  '[Loan Application] Updated existing IBV request:',
                  requestGuid
                )
              }
            }
          }
        }
      } catch (ibvError) {
        console.error(
          '[Loan Application] Error ensuring IBV request is saved:',
          ibvError
        )
        // Non-fatal: continue even if this fails
      }
    }

    // Automatically fetch Inverite data when an Inverite request GUID is available
    try {
      const shouldFetchInverite = body.ibvProvider === 'inverite'
      const requestGuid =
        requestGuidFromBody ||
        (txResult?.ibv_provider_data as any)?.request_guid ||
        (body.ibvProviderData as any)?.requestGuid ||
        null

      if (shouldFetchInverite && requestGuid && txResult?.application_id) {
        const baseUrl = request.nextUrl.origin
        const fetchUrl = `${baseUrl}/api/inverite/fetch/${encodeURIComponent(
          requestGuid
        )}?application_id=${encodeURIComponent(txResult.application_id)}`

        console.log(
          '[Loan Application] Fetching Inverite data for request GUID:',
          requestGuid
        )

        const fetchResponse = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text().catch(() => '')
          console.warn(
            '[Loan Application] Inverite fetch failed:',
            fetchResponse.status,
            errorText
          )
        }
      }
    } catch (inveriteError) {
      console.warn(
        '[Loan Application] Failed to fetch Inverite data automatically',
        inveriteError
      )
    }

    // If IBV is required but not yet completed, initiate IBV request server-side
    let ibvInitiationData: any = null

    // Initiate Zumrails request server-side
    if (
      txResult?.application_id &&
      txResult?.client_id &&
      IBV_PROVIDER === 'zumrails'
    ) {
      try {
        const supabaseForIbv = createServerSupabaseAdminClient()

        // Get client details for Zumrails request
        const { data: clientData } = await (supabaseForIbv as any)
          .from('users')
          .select('first_name, last_name, phone, email, preferred_language')
          .eq('id', txResult.client_id)
          .single()

        if (clientData) {
          console.log(
            '[Loan Application] Initiating Zumrails request after application creation:',
            { applicationId: txResult.application_id }
          )

          // Build address line 1 from street components from request body
          // Zum Rails requires addressLine1 to be non-empty if User object is included
          let addressLine1: string | undefined = undefined
          if (body.streetNumber || body.streetName) {
            const streetParts = [
              body.streetNumber,
              body.streetName
            ].filter(Boolean)
            if (streetParts.length > 0) {
              addressLine1 = streetParts.join(' ')
              if (body.apartmentNumber) {
                addressLine1 += `, Apt ${body.apartmentNumber}`
              }
            }
          }

          const requestedAt = new Date().toISOString()

          // Step 1: Create or get IBV request FIRST to get the ID
          // Check if IBV request already exists for this application and provider
          const { data: existingRequest } = await (supabaseForIbv as any)
            .from('loan_application_ibv_requests')
            .select('id')
            .eq('loan_application_id', txResult.application_id)
            .eq('provider', 'zumrails')
            .maybeSingle()

          let ibvRequestId: string | null = null

          if (!existingRequest) {
            // Create IBV request first (with minimal data, will update after token creation)
            const { data: newIbvRequest, error: ibvInsertError } = await (supabaseForIbv as any)
              .from('loan_application_ibv_requests')
              .insert({
                loan_application_id: txResult.application_id,
                client_id: txResult.client_id,
                provider: 'zumrails',
                status: 'pending',
                requested_at: requestedAt
              })
              .select('id')
              .single()

            if (ibvInsertError) {
              console.error(
                '[Loan Application] Failed to create Zumrails IBV request:',
                ibvInsertError
              )
              // Continue anyway - we'll try to create token without ibvRequestId
            } else {
              ibvRequestId = newIbvRequest.id
              console.log(
                '[Loan Application] Created Zumrails IBV request:',
                ibvRequestId
              )
            }
          } else {
            ibvRequestId = existingRequest.id
            console.log(
              '[Loan Application] Using existing Zumrails IBV request:',
              ibvRequestId
            )
          }

          // Step 2: Create token with application_id (ExtraField1) and ibv_request_id (ExtraField2)
          // Use server helper to get token from cache or authenticate
          // Use address data from request body instead of querying DB
          // Pass application ID as clientUserId to track the connection in Zumrails
          const { connectToken, customerId, iframeUrl, expiresAt } =
            await initializeZumrailsSession(
              {
                firstName: clientData.first_name,
                lastName: clientData.last_name,
                phone: clientData.phone,
                email: clientData.email,
                
                // Include address fields from request body (required by Zum Rails when User object is provided)
                ...(body.city && body.streetNumber && body.province && body.postalCode && {
                  addressCity: body.city,
                  addressLine1: addressLine1,
                  addressProvince: body.province,
                  addressPostalCode: body.postalCode.replace(/\s+/g, '')
                }),
                clientUserId: txResult.application_id.toString(), // Pass application ID as clientUserId
                language: clientData.preferred_language || 'en' // Pass preferred language
              },
              txResult.application_id.toString(), // ExtraField1: application_id
              ibvRequestId || undefined // ExtraField2: loan_application_ibv_request id
            )

          // Step 3: Update IBV request with token data
          const providerData = createIbvProviderData('zumrails', {
            customerId,
            connectToken,
            connectTokenExpiresAt: expiresAt,
            connectTokenType: 'AddPaymentProfile',
            configuration: {
              allowEft: true,
              allowInterac: true,
              allowVisaDirect: true,
              allowCreditCard: true
            },
            initiated_by: 'server',
            requested_at: requestedAt,
            iframe_url: iframeUrl
          })

          if (ibvRequestId) {
            // Update IBV request with token data
            const { error: ibvUpdateError } = await (supabaseForIbv as any)
              .from('loan_application_ibv_requests')
              .update({
                request_url: iframeUrl,
                provider_data: providerData, // Contains customerId for Zumrails
                status: 'pending',
                updated_at: requestedAt
              })
              .eq('id', ibvRequestId)

            if (ibvUpdateError) {
              console.error(
                '[Loan Application] Failed to update Zumrails IBV request:',
                ibvUpdateError
              )
            } else {
              console.log(
                '[Loan Application] Updated Zumrails IBV request with token data:',
                ibvRequestId
              )
            }
          }

          // Update loan application with IBV data (whether or not insert succeeded)
          await (supabaseForIbv as any)
            .from('loan_applications')
            .update({
              ibv_provider: 'zumrails',
              ibv_status: 'pending',
              ibv_provider_data: providerData
            })
            .eq('id', txResult.application_id)

          ibvInitiationData = {
            customerId,
            connectToken, // Include token for SDK approach
            iframeUrl, // Keep for backward compatibility
          }

          console.log(
            '[Loan Application] Successfully initiated Zumrails request:',
            customerId
          )
        }
      } catch (ibvInitError) {
        console.error(
          '[Loan Application] Error initiating Zumrails request:',
          ibvInitError
        )
        // Non-fatal: continue even if IBV initiation fails
      }
    }

    // Initiate Inverite request server-side (existing logic)
    if (
      IBV_PROVIDER === 'inverite' &&
      txResult?.application_id &&
      txResult?.client_id
    ) {
      try {
        const supabaseForIbv = createServerSupabaseAdminClient()

        // Get client details for Inverite request
        const { data: clientData } = await (supabaseForIbv as any)
          .from('users')
          .select('first_name, last_name, phone, preferred_language')
          .eq('id', txResult.client_id)
          .single()

        if (clientData) {
          const apiKey = process.env.INVERITE_API_KEY
          const baseUrl =
            process.env.INVERITE_API_BASE_URL || 'https://sandbox.inverite.com'
          const createPath =
            process.env.INVERITE_CREATE_REQUEST_PATH || '/api/v2/create'
          const siteId = process.env.INVERITE_SITE_ID

          if (apiKey && siteId) {
            const requestedLocale = clientData.preferred_language || 'en'
            const origin =
              request.headers.get('origin') ||
              process.env.NEXT_PUBLIC_SITE_URL ||
              'http://localhost:3000'

            // Build redirect URL with application_id (this is the key benefit!)
            const callbackUrl = new URL(
              `${origin}/${requestedLocale}/quick-apply/inverite/callback`
            )
            callbackUrl.searchParams.set(
              'application_id',
              txResult.application_id
            )
            callbackUrl.searchParams.set('ts', Date.now().toString())
            const redirectUrl = callbackUrl.toString()

            const payload = {
              siteID: siteId,
              firstname: clientData.first_name,
              lastname: clientData.last_name,
              phone: clientData.phone,
              redirecturl: redirectUrl
            }

            const url = `${baseUrl}${createPath}`
            const headers = {
              'Content-Type': 'application/json',
              Auth: apiKey
            }

            console.log(
              '[Loan Application] Initiating Inverite request after application creation:',
              { applicationId: txResult.application_id }
            )

            const inveriteResp = await fetch(url, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload)
            })

            const rawText = await inveriteResp.text().catch(() => '')
            if (inveriteResp.ok) {
              let inveriteData: any = {}
              try {
                inveriteData = rawText ? JSON.parse(rawText) : {}
              } catch (err) {
                console.warn(
                  '[Loan Application] Unable to parse Inverite response:',
                  err
                )
              }

              const requestGuid =
                inveriteData.request_guid ||
                inveriteData.requestGuid ||
                inveriteData.request_GUID

              if (requestGuid) {
                const iframeUrl =
                  inveriteData.iframeurl || inveriteData.iframe_url || null
                const requestedAt = new Date().toISOString()

                const customerStartBase =
                  process.env.INVERITE_CUSTOMER_START_BASE_URL ||
                  `${baseUrl.replace(/\/$/, '')}/customer/v2/web/start`
                const sanitizedStartBase = customerStartBase.replace(/\/$/, '')
                const startUrl = `${sanitizedStartBase}/${requestGuid}/0/modern`

                const providerData = {
                  request_guid: requestGuid,
                  iframe_url: iframeUrl,
                  initiated_by: 'server',
                  requested_at: requestedAt,
                  redirect_url: redirectUrl,
                  start_url: startUrl
                }

                // Save IBV request to loan_application_ibv_requests
                const { error: ibvInsertError } = await (supabaseForIbv as any)
                  .from('loan_application_ibv_requests')
                  .insert({
                    loan_application_id: txResult.application_id,
                    client_id: txResult.client_id,
                    provider: 'inverite',
                    status: 'pending',
                    request_url: startUrl,
                    provider_data: providerData, // Contains request_guid for Inverite
                    requested_at: requestedAt
                  })

                if (ibvInsertError) {
                  console.error(
                    '[Loan Application] Failed to save IBV request:',
                    ibvInsertError
                  )
                } else {
                  // Update loan application with IBV data
                  await (supabaseForIbv as any)
                    .from('loan_applications')
                    .update({
                      ibv_provider: 'inverite',
                      ibv_status: 'pending',
                      ibv_provider_data: providerData
                    })
                    .eq('id', txResult.application_id)

                  ibvInitiationData = {
                    requestGuid,
                    iframeUrl,
                    startUrl,
                    redirectUrl
                  }

                  console.log(
                    '[Loan Application] Successfully initiated Inverite request:',
                    requestGuid
                  )
                }
              }
            } else {
              console.warn(
                '[Loan Application] Failed to initiate Inverite request:',
                rawText
              )
            }
          }
        }
      } catch (ibvInitError) {
        console.error(
          '[Loan Application] Error initiating Inverite request:',
          ibvInitError
        )
        // Non-fatal: continue even if IBV initiation fails
      }
    }

    // Prepare response data (after all IBV initiation is complete)
    const responseData = {
      success: true,
      message: 'Loan application submitted successfully',
      data: {
        applicationId: txResult.application_id,
        isPreviousBorrower: txResult.is_previous_borrower,
        referenceNumber: `FL-${txResult.application_id.toString().slice(-8)}`,
        // Include IBV initiation data if available
        ...(ibvInitiationData && {
          ibv: {
            provider: IBV_PROVIDER,
            required: true,
            ...ibvInitiationData
          }
        })
      }
    }

    // Send notifications in background (fire-and-forget, non-blocking)
    // This runs after the response is sent to the client
    if (txResult?.application_id) {
      // Use setImmediate to defer execution to next event loop tick
      // This ensures the response is sent first
      setImmediate(async () => {
        try {
          await sendAdminNotifications({
            applicationId: txResult.application_id,
            clientId: txResult.client_id,
            loanAmount: parseFloat(body.loanAmount),
            preferredLanguage: (body.preferredLanguage as 'en' | 'fr') || 'en',
            origin: request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || getAppUrl()
          })
        } catch (error: any) {
          console.error(
            '[Loan Application] Background notification error:',
            error
          )
        }
      })
    }

    // Return success response immediately (notifications run in background)
    return NextResponse.json(responseData, { status: 201 })
  } catch (error: any) {
    console.error('Loan application submission error:', error)

    return NextResponse.json(
      {
        error: 'Failed to submit loan application',
        details: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// ===========================
// GET HANDLER (Optional - for testing)
// ===========================

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Loan Application API',
    methods: ['POST'],
    endpoint: '/api/loan-application'
  })
}
