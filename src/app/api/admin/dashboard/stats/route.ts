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

    // Fetch all applications
    const { data: applications, error: applicationsError } = await supabase
      .from('loan_applications')
      .select('id, loan_amount, application_status, created_at')
      .order('created_at', { ascending: false })

    if (applicationsError) {
      console.error('Error fetching applications:', applicationsError)
      return NextResponse.json(
        { error: 'Failed to fetch applications', details: applicationsError.message },
        { status: 500 }
      )
    }

    // Fetch all users (clients)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, created_at, kyc_status')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users', details: usersError.message },
        { status: 500 }
      )
    }

    // Fetch all staff
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, role, created_at')

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      return NextResponse.json(
        { error: 'Failed to fetch staff', details: staffError.message },
        { status: 500 }
      )
    }

    // Fetch all loans
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('id, loan_amount, status, created_at, disbursed_at')
      .order('created_at', { ascending: false })

    if (loansError) {
      console.error('Error fetching loans:', loansError)
      // Don't fail if loans table doesn't exist or has issues
    }

    const apps = applications || []
    const allUsers = users || []
    const allStaff = staff || []
    const allLoans = loans || []

    // Calculate application statistics
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const applicationsThisWeek = apps.filter(
      (app: any) => new Date(app.created_at) >= oneWeekAgo
    ).length

    const applicationsThisMonth = apps.filter(
      (app: any) => new Date(app.created_at) >= oneMonthAgo
    ).length

    const statusCounts = {
      pending: apps.filter((app: any) => app.application_status === 'pending').length,
      processing: apps.filter((app: any) => app.application_status === 'processing').length,
      pre_approved: apps.filter((app: any) => app.application_status === 'pre_approved').length,
      contract_pending: apps.filter((app: any) => app.application_status === 'contract_pending').length,
      contract_signed: apps.filter((app: any) => app.application_status === 'contract_signed').length,
      approved: apps.filter((app: any) => app.application_status === 'approved').length,
      rejected: apps.filter((app: any) => app.application_status === 'rejected').length,
      cancelled: apps.filter((app: any) => app.application_status === 'cancelled').length,
    }

    // Calculate total loan amounts
    const totalApplicationAmount = apps.reduce(
      (sum: number, app: any) => sum + (parseFloat(app.loan_amount) || 0),
      0
    )

    const totalLoanAmount = allLoans.reduce(
      (sum: number, loan: any) => sum + (parseFloat(loan.loan_amount) || 0),
      0
    )

    // Calculate user statistics
    const verifiedUsers = allUsers.filter((u: any) => u.kyc_status === 'verified').length
    const pendingKycUsers = allUsers.filter((u: any) => u.kyc_status === 'pending').length

    // Calculate staff statistics
    const adminCount = allStaff.filter((s: any) => s.role === 'admin').length
    const supportCount = allStaff.filter((s: any) => s.role === 'support').length
    const internCount = allStaff.filter((s: any) => s.role === 'intern').length

    // Get recent applications (last 5)
    const recentApplications = apps.slice(0, 5).map((app: any) => ({
      id: app.id,
      loan_amount: app.loan_amount,
      status: app.application_status,
      created_at: app.created_at,
    }))

    // Calculate loan statistics
    const activeLoans = allLoans.filter((loan: any) => loan.status === 'active').length
    const completedLoans = allLoans.filter((loan: any) => loan.status === 'completed').length
    const pendingDisbursementLoans = allLoans.filter(
      (loan: any) => loan.status === 'pending_disbursement'
    ).length

    return NextResponse.json({
      applications: {
        total: apps.length,
        thisWeek: applicationsThisWeek,
        thisMonth: applicationsThisMonth,
        statusCounts,
        totalAmount: totalApplicationAmount,
      },
      users: {
        total: allUsers.length,
        verified: verifiedUsers,
        pendingKyc: pendingKycUsers,
      },
      staff: {
        total: allStaff.length,
        admins: adminCount,
        support: supportCount,
        interns: internCount,
      },
      loans: {
        total: allLoans.length,
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

