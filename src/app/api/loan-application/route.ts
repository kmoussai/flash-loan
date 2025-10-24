import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { 
  IncomeSourceType,
  LoanType,
  EmployedIncomeFields,
  EmploymentInsuranceIncomeFields,
  SelfEmployedIncomeFields,
  OtherIncomeFields
} from '@/src/lib/supabase/types'

// ===========================
// TYPE DEFINITIONS
// ===========================

interface LoanApplicationRequestBody {
  // Personal Information
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  preferredLanguage: string
  
  // Address Information
  streetNumber: string
  streetName: string
  apartmentNumber?: string
  city: string
  province: string
  postalCode: string
  movingDate: string
  
  // Financial Obligations (Quebec only)
  residenceStatus?: string
  grossSalary?: string
  rentOrMortgageCost?: string
  heatingElectricityCost?: string
  carLoan?: string
  furnitureLoan?: string
  
  // References
  reference1FirstName: string
  reference1LastName: string
  reference1Phone: string
  reference1Relationship: string
  reference2FirstName: string
  reference2LastName: string
  reference2Phone: string
  reference2Relationship: string
  
  // Income Information
  incomeSource: IncomeSourceType
  // Employed fields
  occupation?: string
  companyName?: string
  supervisorName?: string
  workPhone?: string
  post?: string
  payrollFrequency?: 'weekly' | 'bi-weekly' | 'monthly'
  dateHired?: string
  nextPayDate?: string
  // Employment Insurance fields
  employmentInsuranceStartDate?: string
  // Self-Employed fields
  paidByDirectDeposit?: 'yes' | 'no'
  selfEmployedPhone?: string
  depositsFrequency?: 'weekly' | 'bi-weekly' | 'monthly'
  selfEmployedStartDate?: string
  // Common field for most income types
  nextDepositDate?: string
  
  // Loan Details
  loanAmount: string
  loanType: LoanType
  
  // Pre-qualification
  bankruptcyPlan: boolean
  
  // Confirmation
  confirmInformation: boolean
}

// ===========================
// VALIDATION FUNCTIONS
// ===========================

function validateRequiredFields(body: LoanApplicationRequestBody): string | null {
  const required = [
    'firstName',
    'lastName', 
    'email',
    'phone',
    'dateOfBirth',
    'preferredLanguage',
    // 'streetNumber',
    // 'streetName',
    // 'city',
    // 'province',
    // 'postalCode',
    // 'movingDate',
    // 'loanAmount',
    // 'loanType',
    // 'incomeSource',
    // 'reference1FirstName',
    // 'reference1LastName',
    // 'reference1Phone',
    // 'reference1Relationship',
    // 'reference2FirstName',
    // 'reference2LastName',
    // 'reference2Phone',
    // 'reference2Relationship'
  ]
  
  for (const field of required) {
    if (!body[field as keyof LoanApplicationRequestBody]) {
      return `Missing required field: ${field}`
    }
  }
  
  // Validate Quebec-specific fields
  if (body.province === 'Quebec') {
    const quebecRequired:string[] = [
      // 'residenceStatus',
      // 'grossSalary',
      // 'rentOrMortgageCost',
      // 'heatingElectricityCost',
      // 'carLoan',
      // 'furnitureLoan'
    ]
    
    for (const field of quebecRequired) {
      if (!body[field as keyof LoanApplicationRequestBody]) {
        return `Missing required field for Quebec residents: ${field}`
      }
    }
  }
  
  // Validate income source specific fields
  if (body.incomeSource === 'employed') {
    const employedRequired:string[] = []
    // ['occupation', 'companyName', 'supervisorName', 'workPhone', 'post', 'payrollFrequency', 'dateHired', 'nextPayDate']
    for (const field of employedRequired) {
      if (!body[field as keyof LoanApplicationRequestBody]) {
        return `Missing required field for employed income: ${field}`
      }
    }
  } else if (body.incomeSource === 'employment-insurance') {
    if (!body.employmentInsuranceStartDate || !body.nextDepositDate) {
      return 'Missing required fields for employment insurance'
    }
  } else if (body.incomeSource === 'self-employed') {
    const selfEmployedRequired:string[] = []
    //  ['paidByDirectDeposit', 'selfEmployedPhone', 'depositsFrequency', 'selfEmployedStartDate', 'nextDepositDate']
    for (const field of selfEmployedRequired) {
      if (!body[field as keyof LoanApplicationRequestBody]) {
        return `Missing required field for self-employed income: ${field}`
      }
    }
  } else {
    // For csst-saaq, parental-insurance, retirement-plan
    if (!body.nextDepositDate) {
      return 'Missing required field: nextDepositDate'
    }
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

// ===========================
// INCOME FIELDS BUILDER
// ===========================

function buildIncomeFields(
  incomeSource: IncomeSourceType,
  body: LoanApplicationRequestBody
): EmployedIncomeFields | EmploymentInsuranceIncomeFields | SelfEmployedIncomeFields | OtherIncomeFields {
  switch (incomeSource) {
    case 'employed':
      return {
        occupation: body.occupation!,
        company_name: body.companyName!,
        supervisor_name: body.supervisorName!,
        work_phone: body.workPhone!,
        post: body.post!,
        payroll_frequency: body.payrollFrequency!,
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
        deposits_frequency: body.depositsFrequency!,
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
// MAIN POST HANDLER
// ===========================

export async function POST(request: NextRequest) {
  try {
    const body: LoanApplicationRequestBody = await request.json()
    
    // Validate required fields
    const validationError = validateRequiredFields(body)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      )
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
    
    // Initialize Supabase admin client (bypasses RLS for public submissions)
    console.log('Environment check:')
    console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing')
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing')
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'SUPABASE_SERVICE_ROLE_KEY is not configured. Please add it to your .env.local file.'
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
    
    let userId: string
    let isPreviousBorrower = false
    
    if (existingUser as any) {
      // User exists - they're a previous borrower
      userId = (existingUser as any).id
      isPreviousBorrower = true
      
      console.log('Existing user found:', userId)
    } else {
      // New user - create auth account and profile
      console.log('Creating new user account for:', body.email)
      
      // Generate a random password for the user
      const tempPassword = `temp_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`
      
      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
        email: body.email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: body.firstName,
          last_name: body.lastName,
          phone: body.phone,
          signup_type: 'client'
        }
      })
      
      if (signUpError || !authData.user) {
        console.error('Error creating user:', signUpError)
        return NextResponse.json(
          { 
            error: 'Failed to create user account',
            details: signUpError?.message || 'Unknown error'
          },
          { status: 500 }
        )
      }
      
      userId = authData.user.id
      console.log('New user created:', userId)
      
      // Wait a bit for the trigger to create the users record
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Prepare references as JSONB array
    const references = [
      {
        first_name: body.reference1FirstName,
        last_name: body.reference1LastName,
        phone: body.reference1Phone,
        relationship: body.reference1Relationship
      },
      {
        first_name: body.reference2FirstName,
        last_name: body.reference2LastName,
        phone: body.reference2Phone,
        relationship: body.reference2Relationship
      }
    ]
    
    // Build income fields
    const incomeFields = buildIncomeFields(body.incomeSource, body)
    
    // Call the atomic transaction function
    console.log('Calling submit_loan_application transaction...')
    const { data: result, error: submitError } = await (supabase.rpc as any)('submit_loan_application', {
      // Required parameters (in order)
      p_first_name: body.firstName,
      p_last_name: body.lastName,
      p_email: body.email,
      p_phone: body.phone,
      p_date_of_birth: body.dateOfBirth,
      p_preferred_language: body.preferredLanguage,
      p_street_number: body.streetNumber,
      p_street_name: body.streetName,
      p_apartment_number: body.apartmentNumber || null,
      p_city: body.city,
      p_province: body.province,
      p_postal_code: body.postalCode,
      p_moving_date: body.movingDate,
      p_loan_amount: parseFloat(body.loanAmount),
      p_loan_type: body.loanType,
      p_income_source: body.incomeSource,
      p_income_fields: incomeFields,
      p_bankruptcy_plan: body.bankruptcyPlan,
      p_references: references,
      // Optional parameters (with defaults)
      p_client_id: userId,
      p_residence_status: body.residenceStatus || null,
      p_gross_salary: body.grossSalary ? parseFloat(body.grossSalary) : null,
      p_rent_or_mortgage_cost: body.rentOrMortgageCost ? parseFloat(body.rentOrMortgageCost) : null,
      p_heating_electricity_cost: body.heatingElectricityCost ? parseFloat(body.heatingElectricityCost) : null,
      p_car_loan: body.carLoan ? parseFloat(body.carLoan) : null,
      p_furniture_loan: body.furnitureLoan ? parseFloat(body.furnitureLoan) : null
    })
    
    if (submitError) {
      console.error('Transaction error:', submitError)
      throw new Error(submitError.message)
    }
    
    console.log('Transaction successful:', result)
    
    const txResult = result as any
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Loan application submitted successfully',
      data: {
        applicationId: txResult.application_id,
        isPreviousBorrower: txResult.is_previous_borrower,
        referenceNumber: `FL-${Date.now().toString().slice(-8)}`
      }
    }, { status: 201 })
    
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

