// Route: GET /api/inverite/fetch/[guid]
// Fetches account data from Inverite API for a given request GUID
// This is a manual fetch that can be triggered from the admin panel

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

/**
 * Extract IBV summary from Inverite accounts statistics
 * Extracts quarter_all_time statistics from each account for fast access
 */
function extractIbvSummary(inveriteData: any): any {
  const accounts = inveriteData.accounts || []
  const summary: any = {
    extracted_at: new Date().toISOString(),
    accounts_count: accounts.length,
    accounts_summary: []
  }

  // Extract statistics from each account
  accounts.forEach((account: any, index: number) => {
    const accountSummary: any = {
      account_index: index,
      account_type: account.type || null,
      account_description: account.account_description || account.account || null,
      institution: account.institution || null
    }

    // Extract quarter_all_time statistics
    if (account.statistics?.quarter_all_time) {
      const qat = account.statistics.quarter_all_time
      accountSummary.quarter_all_time = {
        // Income/Debit metrics
        number_of_nsf: qat.number_of_nsf || null,
        number_of_deposits: qat.number_of_deposits || null,
        amount_of_deposits: qat.amount_of_deposits || null,
        average_amount_of_deposits: qat.average_amount_of_deposits || null,
        avg_number_of_deposits: qat.avg_number_of_deposits || null,
        highest_deposit: qat.highest_deposit || null,
        lowest_deposit: qat.lowest_deposit || null,
        
        // Expense/Credit metrics
        number_of_withdrawals: qat.number_of_withdrawals || null,
        amount_of_withdrawals: qat.amount_of_withdrawals || null,
        average_amount_of_withdrawals: qat.average_amount_of_withdrawals || null,
        avg_number_of_withdrawals: qat.avg_number_of_withdrawals || null,
        highest_withdrawal: qat.highest_withdrawal || null,
        lowest_withdrawal: qat.lowest_withdrawal || null,
        
        // Balance metrics
        average_balance: qat.average_balance || null,
        highest_balance: qat.highest_balance || null,
        lowest_balance: qat.lowest_balance || null,
        ending_balance: qat.ending_balance || null,
        
        // Transaction counts
        total_transactions: qat.total_transactions || null,
        transaction_count: qat.transaction_count || null,
        
        // Overdraft and negative balance metrics
        overdraft_count: qat.overdraft_count || null,
        negative_balance_count: qat.negative_balance_count || null,
        negative_balance_days: qat.negative_balance_days || null,
        
        // Period information
        period_start: qat.period_start || null,
        period_end: qat.period_end || null,
        period_type: qat.period_type || 'quarter_all_time'
      }
    }

    // Also extract current balance if available
    if (account.balance) {
      accountSummary.current_balance = {
        available: account.balance.available || null,
        current: account.balance.current || null
      }
    }

    // Add transaction count if available
    if (account.transactions) {
      accountSummary.transaction_count = Array.isArray(account.transactions) 
        ? account.transactions.length 
        : 0
    }

    summary.accounts_summary.push(accountSummary)
  })

  // Calculate aggregate metrics across all accounts
  if (summary.accounts_summary.length > 0) {
    const allDeposits = summary.accounts_summary
      .map((acc: any) => acc.quarter_all_time?.amount_of_deposits)
      .filter((val: any) => val !== null && val !== undefined)
    
    const allWithdrawals = summary.accounts_summary
      .map((acc: any) => acc.quarter_all_time?.amount_of_withdrawals)
      .filter((val: any) => val !== null && val !== undefined)

    summary.aggregates = {
      total_deposits: allDeposits.length > 0 
        ? allDeposits.reduce((sum: number, val: number) => sum + (val || 0), 0) 
        : null,
      total_withdrawals: allWithdrawals.length > 0
        ? allWithdrawals.reduce((sum: number, val: number) => sum + (val || 0), 0)
        : null,
      total_accounts: summary.accounts_count,
      accounts_with_statistics: summary.accounts_summary.filter(
        (acc: any) => acc.quarter_all_time !== undefined
      ).length
    }
  }

  return summary
}

export async function GET(
  request: NextRequest,
  { params }: { params: { guid: string } }
) {
  try {
    const requestGuid = params.guid
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('application_id')

    if (!requestGuid) {
      return NextResponse.json(
        { error: 'Request GUID is required' },
        { status: 400 }
      )
    }

    // Get API configuration from environment
    const apiKey = process.env.INVERITE_API_KEY
    const baseUrl =
      process.env.INVERITE_API_BASE_URL || 'https://sandbox.inverite.com'

    if (!apiKey || !baseUrl) {
      return NextResponse.json(
        {
          error: 'MISSING_CONFIGURATION',
          message:
            'INVERITE_API_KEY or INVERITE_API_BASE_URL is not configured.'
        },
        { status: 500 }
      )
    }

    // Build fetch URL
    const fetchUrl = `${baseUrl}/api/v2/fetch/${requestGuid}`

    console.log('[Inverite Fetch] Fetching data for GUID:', requestGuid)

    // Call Inverite API
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Auth': apiKey
      }
    })

    const rawText = await response.text().catch(() => '')

    if (!response.ok) {
      console.error('[Inverite Fetch] Error response:', {
        status: response.status,
        body: rawText
      })
      return NextResponse.json(
        {
          error: 'INVERITE_FETCH_FAILED',
          details: rawText || response.statusText
        },
        { status: response.status }
      )
    }

    // Parse response
    let inveriteData: any
    try {
      inveriteData = rawText ? JSON.parse(rawText) : {}
    } catch (error) {
      console.error('[Inverite Fetch] Failed to parse response:', error)
      return NextResponse.json(
        { error: 'MALFORMED_RESPONSE', message: 'Failed to parse Inverite response' },
        { status: 502 }
      )
    }

    console.log('[Inverite Fetch] Successfully fetched data for GUID:', requestGuid)

    // Extract IBV summary and include request_guid for downstream consumers
    const ibvSummary = {
      ...extractIbvSummary(inveriteData),
      request_guid: requestGuid
    }

    // Find the loan application - prefer application_id if provided
    const supabase = createServerSupabaseAdminClient()
    let matchingApplication: any = null

    if (applicationId) {
      // Direct lookup by application ID
      const { data: application, error: fetchError } = await supabase
        .from('loan_applications')
        .select('id, ibv_provider_data')
        .eq('id', applicationId)
        .eq('ibv_provider', 'inverite')
        .single()

      if (fetchError || !application) {
        console.error('[Inverite Fetch] Error fetching application:', fetchError)
        return NextResponse.json(
          { 
            error: 'APPLICATION_NOT_FOUND', 
            message: 'No application found with the provided ID' 
          },
          { status: 404 }
        )
      }

      // Verify the request_guid matches
      const providerData = (application as any)?.ibv_provider_data as any
      if (providerData?.request_guid !== requestGuid) {
        return NextResponse.json(
          {
            error: 'GUID_MISMATCH',
            message: 'Request GUID does not match the application'
          },
          { status: 400 }
        )
      }

      matchingApplication = application as any
    } else {
      // Fallback: search by request_guid
      const { data: applications, error: fetchError } = await supabase
        .from('loan_applications')
        .select('id, ibv_provider_data')
        .eq('ibv_provider', 'inverite')
        .not('ibv_provider_data', 'is', null)

      if (fetchError) {
        console.error('[Inverite Fetch] Error fetching applications:', fetchError)
        return NextResponse.json(
          { error: 'DATABASE_ERROR', message: 'Failed to find application' },
          { status: 500 }
        )
      }

      // Find application with matching request_guid
      for (const app of (applications || []) as any[]) {
        const providerData = app?.ibv_provider_data as any
        if (providerData?.request_guid === requestGuid) {
          matchingApplication = app
          break
        }
      }

      if (!matchingApplication) {
        return NextResponse.json(
          {
            error: 'APPLICATION_NOT_FOUND',
            message: 'No application found for this request GUID'
          },
          { status: 404 }
        )
      }
    }

    // Merge new account data into existing provider data
    const currentProviderData = (matchingApplication.ibv_provider_data as any) || {}
    
    // Extract request_guid from Inverite response (using 'request' field)
    const responseRequestGuid = inveriteData.request || inveriteData.request_guid || inveriteData.request_GUID || requestGuid

    // Store all Inverite data in structured format
    const updatedProviderData = {
      // Keep existing request_guid and verified_at
      request_guid: currentProviderData.request_guid || responseRequestGuid,
      verified_at: currentProviderData.verified_at || inveriteData.complete_datetime || new Date().toISOString(),
      
      // Store raw Inverite response for reference
      raw_data: inveriteData,
      
      // Store all Inverite response fields
      name: inveriteData.name || null,
      complete_datetime: inveriteData.complete_datetime || null,
      referenceid: inveriteData.referenceid || null,
      status: inveriteData.status || null,
      type: inveriteData.type || null,
      accounts: inveriteData.accounts || [],
      all_bank_pdf_statements: inveriteData.all_bank_pdf_statements || [],
      address: inveriteData.address || null,
      contacts: inveriteData.contacts || [],
      account_validations: inveriteData.account_validations || [],
      
      // Legacy fields for backward compatibility (extracted from accounts if available)
      account_info: inveriteData.accounts?.[0] || inveriteData.account_info || inveriteData.account || null,
      account_stats: inveriteData.accounts?.[0]?.statistics || inveriteData.account_stats || inveriteData.stats || null,
      account_statement: inveriteData.accounts?.[0]?.transactions || inveriteData.account_statement || inveriteData.transactions || [],
      
      // Timestamps
      account_data_fetched_at: new Date().toISOString(),
      account_data_received_at: currentProviderData.account_data_received_at || new Date().toISOString()
    }

    // Update the application in database
    const supabaseAny = supabase as any
    const { error: updateError } = await supabaseAny
      .from('loan_applications')
      .update({
        ibv_provider_data: updatedProviderData,
        ibv_results: ibvSummary,
        ibv_status: 'verified',
        updated_at: new Date().toISOString()
      })
      .eq('id', matchingApplication.id)

    if (updateError) {
      console.error('[Inverite Fetch] Error updating application:', updateError)
      return NextResponse.json(
        {
          error: 'UPDATE_FAILED',
          message: 'Failed to update application with fetched data'
        },
        { status: 500 }
      )
    }

    console.log('[Inverite Fetch] Successfully updated application:', matchingApplication.id)

    // Return success with fetched data summary
    return NextResponse.json({
      success: true,
      message: 'Data fetched and updated successfully',
      application_id: matchingApplication.id,
      request_guid: requestGuid,
      data: {
        name: inveriteData.name,
        status: inveriteData.status,
        accounts_count: inveriteData.accounts?.length || 0,
        transactions_count: inveriteData.accounts?.[0]?.transactions?.length || 0,
        complete_datetime: inveriteData.complete_datetime
      },
      ibv_results: ibvSummary
    })
  } catch (error: any) {
    console.error('[Inverite Fetch] Error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

