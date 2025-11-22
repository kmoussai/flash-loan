import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dashboard/stats
 * Fetch dashboard statistics for admin panel
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseAdminClient()

    // Calculate date ranges
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const oneWeekAgoIso = oneWeekAgo.toISOString()
    const oneMonthAgoIso = oneMonthAgo.toISOString()

    // Parallel count queries for applications
    const [
      totalAppsResult,
      appsThisWeekResult,
      appsThisMonthResult,
      pendingAppsResult,
      processingAppsResult,
      preApprovedAppsResult,
      contractPendingAppsResult,
      contractSignedAppsResult,
      approvedAppsResult,
      rejectedAppsResult,
      cancelledAppsResult,
      // Application amounts (for sum calculation)
      applicationAmountsResult,
      // Recent applications (only fetch what we need)
      recentAppsResult,
      // User counts
      totalUsersResult,
      verifiedUsersResult,
      pendingKycUsersResult,
      // Staff counts
      totalStaffResult,
      adminStaffResult,
      supportStaffResult,
      internStaffResult,
      // Loan counts
      totalLoansResult,
      activeLoansResult,
      completedLoansResult,
      pendingDisbursementLoansResult,
      // Loan amounts (for sum calculation)
      loanAmountsResult
    ] = await Promise.all([
      // Application totals
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).gte('created_at', oneWeekAgoIso),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).gte('created_at', oneMonthAgoIso),
      // Application status counts
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'pending'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'processing'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'pre_approved'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'contract_pending'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'contract_signed'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'approved'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'rejected'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'cancelled'),
      // Application amounts (only fetch loan_amount field for sum)
      supabase.from('loan_applications').select('loan_amount'),
      // Recent applications (last 5)
      supabase.from('loan_applications').select('id, loan_amount, application_status, created_at').order('created_at', { ascending: false }).limit(5),
      // User counts
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('kyc_status', 'verified'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('kyc_status', 'pending'),
      // Staff counts
      supabase.from('staff').select('*', { count: 'exact', head: true }),
      supabase.from('staff').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('staff').select('*', { count: 'exact', head: true }).eq('role', 'support'),
      supabase.from('staff').select('*', { count: 'exact', head: true }).eq('role', 'intern'),
      // Loan counts
      supabase.from('loans').select('*', { count: 'exact', head: true }),
      supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'pending_disbursement'),
      // Loan amounts (only fetch loan_amount field for sum)
      supabase.from('loans').select('loan_amount')
    ])

    // Handle errors (log but don't fail for optional data like loans)
    if (totalAppsResult.error) {
      console.error('Error fetching application counts:', totalAppsResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch application statistics', details: totalAppsResult.error.message },
        { status: 500 }
      )
    }

    // Calculate application statistics
    const statusCounts = {
      pending: pendingAppsResult.count || 0,
      processing: processingAppsResult.count || 0,
      pre_approved: preApprovedAppsResult.count || 0,
      contract_pending: contractPendingAppsResult.count || 0,
      contract_signed: contractSignedAppsResult.count || 0,
      approved: approvedAppsResult.count || 0,
      rejected: rejectedAppsResult.count || 0,
      cancelled: cancelledAppsResult.count || 0,
    }

    // Calculate total application amount
    const applicationAmounts = applicationAmountsResult.data || []
    const totalApplicationAmount = applicationAmounts.reduce(
      (sum: number, app: any) => sum + (parseFloat(app.loan_amount) || 0),
      0
    )

    // Format recent applications
    const recentApplications = (recentAppsResult.data || []).map((app: any) => ({
      id: app.id,
      loan_amount: app.loan_amount,
      status: app.application_status,
      created_at: app.created_at,
    }))

    // Calculate user statistics
    const verifiedUsers = verifiedUsersResult.count || 0
    const pendingKycUsers = pendingKycUsersResult.count || 0

    // Calculate staff statistics
    const adminCount = adminStaffResult.count || 0
    const supportCount = supportStaffResult.count || 0
    const internCount = internStaffResult.count || 0

    // Calculate loan statistics (handle errors gracefully)
    const activeLoans = activeLoansResult.count || 0
    const completedLoans = completedLoansResult.count || 0
    const pendingDisbursementLoans = pendingDisbursementLoansResult.count || 0

    // Calculate total loan amount
    const loanAmounts = loanAmountsResult.data || []
    const totalLoanAmount = loanAmounts.reduce(
      (sum: number, loan: any) => sum + (parseFloat(loan.loan_amount) || 0),
      0
    )

    return NextResponse.json({
      applications: {
        total: totalAppsResult.count || 0,
        thisWeek: appsThisWeekResult.count || 0,
        thisMonth: appsThisMonthResult.count || 0,
        statusCounts,
        totalAmount: totalApplicationAmount,
      },
      users: {
        total: totalUsersResult.count || 0,
        verified: verifiedUsers,
        pendingKyc: pendingKycUsers,
      },
      staff: {
        total: totalStaffResult.count || 0,
        admins: adminCount,
        support: supportCount,
        interns: internCount,
      },
      loans: {
        total: totalLoansResult.count || 0,
        active: activeLoans,
        completed: completedLoans,
        pendingDisbursement: pendingDisbursementLoans,
        totalAmount: totalLoanAmount,
      },
      recentApplications,
    })
  } catch (error: any) {
    console.error('Error in dashboard stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

