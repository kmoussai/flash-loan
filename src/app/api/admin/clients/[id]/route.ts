import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

		// Fetch user with all fields including bank_account, addresses, and applications in a single query using joins
		// This reduces database round trips from 3 queries to 1 query
		// Explicitly specify foreign key relationships to avoid ambiguity:
		// - addresses!addresses_client_id_fkey: one-to-many (all addresses for this client)
		// - loan_applications!loan_applications_client_id_fkey: one-to-many (all applications for this client)
		const { data: userData, error: userError } = await supabase
			.from('users')
			.select(`
				*,
				addresses!addresses_client_id_fkey (
					*
				),
				loan_applications!loan_applications_client_id_fkey (
					id,
					loan_amount,
					income_source,
					application_status,
					created_at,
					submitted_at
				)
			`)
			.eq('id', clientId)
			.single()

		if (userError) {
			console.error('Failed to fetch user:', userError)
			return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
		}
		if (!userData) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		// Extract user, addresses, and applications from the joined result
		// Supabase returns joined data in nested format
		const user = userData as any
		const addresses = (user.addresses || []).sort((a: any, b: any) => 
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		)
		const applications = (user.loan_applications || []).sort((a: any, b: any) => 
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		)

		// Remove the joined arrays from user object to maintain clean response format
		const { addresses: _, loan_applications: __, ...cleanUser } = user

		const response = NextResponse.json({
			user: cleanUser,
			addresses: addresses || [],
			applications: applications || []
		})
		
		// Prevent caching
		response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
		response.headers.set('Pragma', 'no-cache')
		response.headers.set('Expires', '0')
		
		return response
	} catch (error: any) {
		return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
	}
}


