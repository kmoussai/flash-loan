// Route: GET /api/inverite/fetch/[guid]
// Fetches account data from Inverite API for a given request GUID
// This is a manual fetch that can be triggered from the admin panel

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { normalizeFrequency } from '@/src/lib/utils/frequency'
import type { IBVSummary } from './types'

const PENDING_STATUSES = new Set(['pending', 'processing', 'requested', 'in_progress'])

function resolveStatus(rawData: any): string | null {
  const candidates = [
    rawData?.status,
    rawData?.Status,
    rawData?.STATUS,
    rawData?.response?.status,
    rawData?.state
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim().toLowerCase()
    }
  }

  return null
}

function mapPendingStatus(status: string | null): 'pending' | 'processing' {
  if (!status) {
    return 'pending'
  }

  if (status === 'processing' || status === 'in_progress') {
    return 'processing'
  }

  return 'pending'
}

// Build a compact summary from Inverite raw data with safe fallbacks
function extractSummary(rawData: any, requestGuid: string): IBVSummary {
  const accounts = Array.isArray(rawData?.accounts) ? rawData.accounts : []

  return {
    request_guid: requestGuid,
    accounts: accounts.map((account: any) => ({
      bank_name: account?.bank ?? null,
      type: account?.type ?? null,
      number: account?.account ?? null,
      transit: account?.transit ?? null,
      institution: account?.institution ?? null,
      routing_code: account?.routing_code ?? null,
      statistics: {
        income_net: account?.statistics?.income_net ?? 0,
        nsf: {
          all_time: account?.statistics?.quarter_all_time?.number_of_nsf ?? 0,
          quarter_3_months: account?.statistics?.quarter_3_months?.number_of_nsf ?? 0,
          quarter_6_months: account?.statistics?.quarter_6_months?.number_of_nsf ?? 0,
          quarter_9_months: account?.statistics?.quarter_9_months?.number_of_nsf ?? 0,
          quarter_12_months: account?.statistics?.quarter_12_months?.number_of_nsf ?? 0
        }
      },
      bank_pdf_statements: Array.isArray(account?.bank_pdf_statements)
        ? account.bank_pdf_statements
        : [],
      total_transactions: Array.isArray(account?.transactions)
        ? account.transactions.length
        : (account?.transactions ?? []).length,
      income: Array.isArray(account?.payschedules) ? account.payschedules.map((pay: any) => {
        const normalizedFrequency = normalizeFrequency(pay?.frequency)
        const futurePayments = Array.isArray(pay?.future_payments)
          ? pay.future_payments
              .map((value: any) => {
                const parsed = new Date(value)
                return Number.isNaN(parsed.getTime()) ? null : parsed
              })
              .filter((entry: Date | null): entry is Date => entry !== null)
          : []

        return {
          frequency: normalizedFrequency,
          raw_frequency: typeof pay?.frequency === 'string' ? pay.frequency : pay?.frequency ? String(pay.frequency) : null,
          details: pay?.details ?? '',
          monthly_income: Number(pay?.monthly_income) || 0,
          future_payments: futurePayments
        }
      }) : []
    }))
  }
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
        Auth: apiKey
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
        {
          error: 'MALFORMED_RESPONSE',
          message: 'Failed to parse Inverite response'
        },
        { status: 502 }
      )
    }

    console.log(
      '[Inverite Fetch] Successfully fetched data for GUID:',
      requestGuid
    )

    // Find the loan application - prefer application_id if provided
    const supabase = createServerSupabaseAdminClient()
    let matchingApplication: any = null

    if (applicationId) {
      // Direct lookup by application ID
    const { data: application, error: fetchError } = await supabase
        .from('loan_applications')
        .select('id, client_id, ibv_provider_data')
        .eq('id', applicationId)
        .eq('ibv_provider', 'inverite')
        .single()

      if (fetchError || !application) {
        console.error(
          '[Inverite Fetch] Error fetching application:',
          fetchError
        )
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
        .select('id, client_id, ibv_provider_data')
        .eq('ibv_provider', 'inverite')
        .not('ibv_provider_data', 'is', null)

      if (fetchError) {
        console.error(
          '[Inverite Fetch] Error fetching applications:',
          fetchError
        )
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

    const normalizedStatus = resolveStatus(inveriteData)
    const accountsArray = Array.isArray(inveriteData?.accounts) ? inveriteData.accounts : []
    const hasCompleteTimestamp = Boolean(inveriteData?.complete_datetime)
    const treatAsPending =
      (normalizedStatus && PENDING_STATUSES.has(normalizedStatus)) ||
      (!hasCompleteTimestamp && accountsArray.length === 0)

    if (treatAsPending) {
      const statusToPersist = mapPendingStatus(
        normalizedStatus && PENDING_STATUSES.has(normalizedStatus)
          ? normalizedStatus
          : null
      )
      const targetApplicationId = applicationId || (matchingApplication as any).id

      try {
        await (supabase as any)
          .from('loan_application_ibv_requests')
          .update({
            status: statusToPersist,
            provider_data: inveriteData,
            results: null,
            completed_at: null
          })
          .eq('request_guid', requestGuid)
      } catch (historyError) {
        console.warn(
          '[Inverite Fetch] Failed to update IBV history row for pending status',
          historyError
        )
      }

      console.log(
        '[Inverite Fetch] Inverite response pending, no account data yet:',
        {
          requestGuid,
          status: normalizedStatus,
          accounts: accountsArray.length,
          complete_datetime: inveriteData?.complete_datetime ?? null
        }
      )

      return NextResponse.json(
        {
          success: false,
          pending: true,
          message:
            'Inverite is still processing this bank verification request. Try again in a few minutes.',
          inverite_status: normalizedStatus || null,
          accounts_count: accountsArray.length,
          complete_datetime: inveriteData?.complete_datetime ?? null,
          application_id: targetApplicationId
        },
        { status: 202 }
      )
    }

    // Extract IBV summary and include request_guid for downstream consumers
    const ibvSummary: IBVSummary = {
      ...extractSummary(inveriteData, requestGuid),
      request_guid: requestGuid
    }

    // Merge new account data into existing provider data
    const currentProviderData =
      (matchingApplication.ibv_provider_data as any) || {}

    // Extract request_guid from Inverite response (using 'request' field)
    const responseRequestGuid =
      inveriteData.request ||
      inveriteData.request_guid ||
      inveriteData.request_GUID ||
      requestGuid

    // Store all Inverite data in structured format
    const updatedProviderData = {
      // Keep existing request_guid and verified_at
      request_guid: currentProviderData.request_guid || responseRequestGuid,
      verified_at:
        currentProviderData.verified_at ||
        inveriteData.complete_datetime ||
        new Date().toISOString(),

      // Store raw Inverite response for reference
      ...inveriteData,

      // Timestamps
      account_data_fetched_at: new Date().toISOString(),
      account_data_received_at:
        currentProviderData.account_data_received_at || new Date().toISOString()
    }

    // Update the application in database
    // Persist recomputed summary
    const targetApplicationId = applicationId || (matchingApplication as any).id

    const { error: updateError } = await (supabase as any)
      .from('loan_applications')
      .update({
        ibv_results: ibvSummary,
        ibv_provider_data: updatedProviderData,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetApplicationId)
    try {
      await (supabase as any)
        .from('loan_application_ibv_requests')
        .update({
          status: 'verified',
          results: ibvSummary,
          provider_data: updatedProviderData,
          completed_at: new Date().toISOString()
        })
        .eq('request_guid', requestGuid)
    } catch (historyError) {
      console.warn('[Inverite Fetch] Failed to update IBV history row', historyError)
    }


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

    console.log(
      '[Inverite Fetch] Successfully updated application:',
      targetApplicationId,
      matchingApplication.id
    )

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
        transactions_count:
          inveriteData.accounts?.[0]?.transactions?.length || 0,
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
