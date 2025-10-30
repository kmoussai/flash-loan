import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const clientId = params.id
		if (!clientId) {
			return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
		}

		const supabase = await createServerSupabaseAdminClient()

		// Fetch base user
		const { data: user, error: userError } = await supabase
			.from('users')
			.select('*')
			.eq('id', clientId)
			.single()

		if (userError) {
			return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
		}
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		// Fetch addresses
		const { data: addresses, error: addrError } = await supabase
			.from('addresses')
			.select('*')
			.eq('client_id', clientId)
			.order('created_at', { ascending: false })

		if (addrError) {
			return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
		}

		// Fetch applications (lightweight list)
		const { data: applications, error: appsError } = await supabase
			.from('loan_applications')
			.select('id, loan_amount, loan_type, income_source, application_status, created_at, submitted_at')
			.eq('client_id', clientId)
			.order('created_at', { ascending: false })

		if (appsError) {
			return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
		}

		return NextResponse.json({
			user,
			addresses: addresses || [],
			applications: applications || []
		})
	} catch (error: any) {
		return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
	}
}


