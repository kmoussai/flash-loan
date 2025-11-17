import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/clients/[id]/documents
 * Get all uploaded documents for a client across all their loan applications
 */
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

		// Fetch all document requests with uploaded files for this client across all applications
		const { data: documentRequests, error: reqError } = await supabase
			.from('document_requests' as any)
			.select(`
				id,
				status,
				uploaded_file_key,
				uploaded_meta,
				created_at,
				updated_at,
				document_type:document_type_id(
					id,
					name,
					slug,
					description
				),
				loan_applications!inner(
					id,
					loan_amount,
					application_status,
					created_at
				)
			`)
			.eq('loan_applications.client_id', clientId)
			.in('status', ['uploaded', 'verified', 'rejected'])
			.not('uploaded_file_key', 'is', null)
			.order('created_at', { ascending: false })

		if (reqError) {
			console.error('Error fetching document requests:', reqError)
			return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
		}

		// Get signed URLs for all uploaded files
		// Note: document_requests store files in 'documents' bucket
		const bucket = supabase.storage.from('documents')
		const documentsWithUrls = await Promise.all(
			(documentRequests || []).map(async (req: any) => {
				let signedUrl: string | null = null
				if (req.uploaded_file_key) {
					try {
						// Remove 'documents/' prefix if present (storage path)
						const fileKey = req.uploaded_file_key.replace(/^documents\//, '')
						const { data: urlData } = await bucket.createSignedUrl(fileKey, 3600)
						signedUrl = urlData?.signedUrl || null
					} catch (err) {
						console.error('Error creating signed URL:', err)
					}
				}

				return {
					id: req.id,
					status: req.status,
					documentType: req.document_type
						? {
								id: req.document_type.id,
								name: req.document_type.name,
								slug: req.document_type.slug,
								description: req.document_type.description
							}
						: null,
					application: req.loan_applications
						? {
								id: req.loan_applications.id,
								loanAmount: req.loan_applications.loan_amount,
								status: req.loan_applications.application_status,
								createdAt: req.loan_applications.created_at
							}
						: null,
					fileName: req.uploaded_meta?.name || 'document',
					fileSize: req.uploaded_meta?.size || null,
					mimeType: req.uploaded_meta?.type || null,
					uploadedAt: req.updated_at || req.created_at,
					signedUrl
				}
			})
		)

		const response = NextResponse.json({
			clientId,
			documents: documentsWithUrls,
			total: documentsWithUrls.length
		})

		// Prevent caching
		response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
		response.headers.set('Pragma', 'no-cache')
		response.headers.set('Expires', '0')

		return response
	} catch (error: any) {
		console.error('Error in client documents API:', error)
		return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
	}
}

