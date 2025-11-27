import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/src/lib/supabase/admin-helpers'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { updateKycStatus } from '@/src/lib/supabase/db-helpers'
import type { IncomeSourceType, Frequency } from '@/src/lib/supabase/types'

// POST /api/admin/document-requests/:id/verify
// Body: { status: 'verified' | 'rejected' }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const hasStaff = await isStaff(true)
    if (!hasStaff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reqId = params.id
    if (!reqId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const status: 'verified' | 'rejected' | undefined = body?.status
    if (!status || !['verified', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const admin = createServerSupabaseAdminClient()
    
    // Get the document request with loan application, document type, and latest submission
    const { data: reqRow, error: reqErr } = await admin
      .from('document_requests' as any)
      .select(`
        id,
        loan_application_id,
        request_kind,
        document_type_id,
        document_type:document_type_id(id, slug, name),
        loan_applications!inner(client_id),
        request_form_submissions(id, form_data, submitted_at)
      `)
      .eq('id', reqId)
      .single()

    if (reqErr || !reqRow) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const requestRow = reqRow as {
      id: string
      loan_application_id: string
      request_kind: string
      document_type_id: string | null
      document_type?: {
        id: string
        slug: string | null
        name: string | null
      } | null
      loan_applications?: {
        client_id: string
      }
      request_form_submissions?: Array<{
        id: string
        form_data: Record<string, any>
        submitted_at: string
      }>
    }

    // Update request status
    const { error } = await admin
      .from('document_requests' as any)
      // @ts-ignore
      .update({ status })
      .eq('id', reqId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // If verifying an employment request, populate loan application
    if (status === 'verified' && requestRow.request_kind === 'employment') {
      const submissions = Array.isArray(requestRow.request_form_submissions) 
        ? requestRow.request_form_submissions 
        : []
      
      if (submissions.length > 0) {
        const latestSubmission = submissions.sort((a: any, b: any) => 
          new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        )[0]
        
        const formData = latestSubmission.form_data || {}
        const incomeSource = formData.incomeSource as IncomeSourceType | undefined
        
        if (incomeSource) {
          // Transform camelCase form data to snake_case for database
          let incomeFields: Record<string, any> = {}
          
          switch (incomeSource) {
            case 'employed':
              incomeFields = {
                occupation: formData.occupation || '',
                company_name: formData.companyName || '',
                supervisor_name: formData.supervisorName || '',
                work_phone: formData.workPhone || '',
                post: formData.post || '',
                payroll_frequency: (formData.payrollFrequency as Frequency) || 'monthly',
                date_hired: formData.dateHired || '',
                next_pay_date: formData.nextPayDate || '',
                // Work address fields (optional)
                ...(formData.workAddress && { work_address: formData.workAddress }),
                ...(formData.workProvince && { work_province: formData.workProvince })
              }
              break
              
            case 'employment-insurance':
              incomeFields = {
                employment_insurance_start_date: formData.employmentInsuranceStartDate || '',
                next_deposit_date: formData.nextDepositDate || ''
              }
              break
              
            case 'self-employed':
              incomeFields = {
                paid_by_direct_deposit: formData.paidByDirectDeposit || 'no',
                self_employed_phone: formData.selfEmployedPhone || '',
                deposits_frequency: (formData.depositsFrequency as Frequency) || 'monthly',
                self_employed_start_date: formData.selfEmployedStartDate || '',
                next_deposit_date: formData.nextDepositDate || '',
                // Business address fields (optional) - using workAddress/workProvince since we unified them
                ...(formData.workAddress && { work_address: formData.workAddress }),
                ...(formData.workProvince && { work_province: formData.workProvince })
              }
              break
              
            default:
              // For retirement-plan, csst-saaq, parental-insurance
              incomeFields = {
                next_deposit_date: formData.nextDepositDate || ''
              }
          }
          
          // Update loan application
          const { error: updateErr } = await admin
            .from('loan_applications' as any)
            // @ts-ignore
            .update({
              income_source: incomeSource,
              income_fields: incomeFields,
              updated_at: new Date().toISOString()
            })
            .eq('id', requestRow.loan_application_id)
          
          if (updateErr) {
            console.error('Error updating loan application:', updateErr)
            // Don't fail the verify operation if update fails, just log it
          }
        }
      }
    }

    // If verifying an ID document, update client KYC status to verified
    if (status === 'verified' && requestRow.request_kind === 'document' && requestRow.document_type) {
      const documentSlug = requestRow.document_type.slug?.toLowerCase() || ''
      const documentName = requestRow.document_type.name?.toLowerCase() || ''
      
      // Check if this is an ID document type
      const isIdDocument = 
        documentSlug.includes('id') ||
        documentSlug.includes('passport') ||
        documentSlug.includes('driver') ||
        documentSlug.includes('license') ||
        documentName.includes('id') ||
        documentName.includes('passport') ||
        documentName.includes('driver') ||
        documentName.includes('license')
      
      if (isIdDocument && requestRow.loan_applications?.client_id) {
        const clientId = requestRow.loan_applications.client_id
        
        // Update KYC status to verified
        const kycResult = await updateKycStatus(clientId, 'verified', true)
        
        if (!kycResult.success) {
          console.error('Error updating KYC status:', kycResult.error)
          // Don't fail the verify operation if KYC update fails, just log it
        } else {
          console.log(`[KYC] Updated client ${clientId} KYC status to verified after ID document verification`)
        }
      }
    }

    // If verifying a reference request, populate loan application references
    if (status === 'verified' && requestRow.request_kind === 'reference') {
      const submissions = Array.isArray(requestRow.request_form_submissions) 
        ? requestRow.request_form_submissions 
        : []
      
      if (submissions.length > 0) {
        const latestSubmission = submissions.sort((a: any, b: any) => 
          new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        )[0]
        
        const formData = latestSubmission.form_data || {}
        const references = Array.isArray(formData.references) ? formData.references : []
        
        if (references.length > 0) {
          // Delete existing references for this loan application
          const { error: deleteErr } = await admin
            .from('references' as any)
            .delete()
            .eq('loan_application_id', requestRow.loan_application_id)
          
          if (deleteErr) {
            console.error('Error deleting existing references:', deleteErr)
            // Continue anyway - might be no existing references
          }
          
          // Insert new references
          // Handle both new format (name) and old format (first_name + last_name)
          const referencesToInsert = references
            .filter((ref: any) => {
              // Check if reference has required fields
              const hasName = ref?.name || (ref?.first_name && ref?.last_name)
              return hasName && ref?.phone && ref?.relationship
            })
            .map((ref: any) => {
              let first_name = ''
              let last_name = ''
              
              // If already has first_name and last_name, use them
              if (ref.first_name && ref.last_name) {
                first_name = String(ref.first_name).trim()
                last_name = String(ref.last_name).trim()
              } else if (ref.name) {
                // Split name by space: first word = first_name, rest = last_name
                const nameParts = String(ref.name).trim().split(/\s+/)
                first_name = nameParts[0] || ''
                last_name = nameParts.slice(1).join(' ') || ''
              }
              
              return {
                loan_application_id: requestRow.loan_application_id,
                first_name,
                last_name,
                phone: String(ref.phone).trim(),
                relationship: String(ref.relationship).trim()
              }
            })
          
          if (referencesToInsert.length > 0) {
            const { error: insertErr } = await admin
              .from('references' as any)
              // @ts-ignore
              .insert(referencesToInsert)
            
            if (insertErr) {
              console.error('Error inserting references:', insertErr)
              // Don't fail the verify operation if insert fails, just log it
            }
          }
        }
      }
    }

    // If verifying a bank information request, populate user's bank_account
    if (status === 'verified' && requestRow.request_kind === 'bank') {
      const submissions = Array.isArray(requestRow.request_form_submissions) 
        ? requestRow.request_form_submissions 
        : []
      
      if (submissions.length > 0 && requestRow.loan_applications?.client_id) {
        const latestSubmission = submissions.sort((a: any, b: any) => 
          new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        )[0]
        
        const formData = latestSubmission.form_data || {}
        
        // Validate required bank fields
        if (
          formData.bank_name &&
          formData.account_number &&
          formData.transit_number &&
          formData.institution_number &&
          formData.account_name
        ) {
          const bankAccount = {
            bank_name: String(formData.bank_name).trim(),
            account_number: String(formData.account_number).trim(),
            transit_number: String(formData.transit_number).trim(),
            institution_number: String(formData.institution_number).trim(),
            account_name: String(formData.account_name).trim()
          }
          
          // Update user's bank_account
          const { error: updateErr } = await admin
            .from('users' as any)
            // @ts-ignore
            .update({
              bank_account: bankAccount,
              updated_at: new Date().toISOString()
            })
            .eq('id', requestRow.loan_applications.client_id)
          
          if (updateErr) {
            console.error('Error updating bank account:', updateErr)
            // Don't fail the verify operation if update fails, just log it
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


