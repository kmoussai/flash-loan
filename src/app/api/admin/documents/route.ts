import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { sendDocumentRequestMagicLink } from '@/src/lib/supabase/admin-helpers'

type ListFile = { 
    name: string, 
    path: string, 
    size: number | null, 
    last_modified: string | null,
    document_name?: string | null,
    mime_type?: string | null,
    signed_url?: string | null
}
type ListResult = { files: ListFile[], error: string | null }

// Lists uploaded documents from Supabase Storage 'id-documents' bucket
// Query params:
// - client_id (required): list under clients/{client_id}/
// - application_id (optional): also list under applications/{application_id}/
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const clientId = searchParams.get('client_id')
		const applicationId = searchParams.get('application_id')

		if (!clientId) {
			return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
		}

        const supabase = await createServerSupabaseAdminClient()
        const bucket = supabase.storage.from('id-documents')

        const listPrefix = async (prefix: string): Promise<ListResult> => {
            const { data, error } = await bucket.list(prefix, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
            if (error) return { files: [], error: error.message }
            const files: ListFile[] = (data || [])
                .filter((f: any) => f?.name)
                .map((f: any) => ({
                    name: f.name,
                    path: `${prefix}${f.name}`,
                    size: (f.metadata && typeof f.metadata.size === 'number') ? f.metadata.size : null,
                    last_modified: f.updated_at || f.created_at || null
                }))
            return { files, error: null }
        }

        // Client dashboard uploads to root <clientId>/ per /api/client/id-documents
        const clientPrefix = `${clientId}/`
        const clientList = await listPrefix(clientPrefix)

        let applicationList: ListResult = { files: [], error: null }
		if (applicationId) {
			const appPrefix = `applications/${applicationId}/`
			applicationList = await listPrefix(appPrefix)
		}

        // Enrich with database metadata from id_documents table and signed URLs
        const clientFiles = clientList.files
        const appFiles = applicationList.files

        // Fetch id_documents rows for client to get document_name and mime_type
        const { data: idDocs } = await supabase
            .from('id_documents' as any)
            .select('file_path, document_name, mime_type')
            .eq('client_id', clientId)

        const metaByPath = new Map<string, { document_name: string | null, mime_type: string | null }>()
        ;(idDocs || []).forEach((d: any) => {
            if (d?.file_path) metaByPath.set(d.file_path, { document_name: d.document_name || null, mime_type: d.mime_type || null })
        })

        // Helper to attach meta and signed URLs
        const withMetaAndUrls = async (files: ListFile[]): Promise<ListFile[]> => {
            const results: ListFile[] = []
            for (const f of files) {
                const meta = metaByPath.get(f.path)
                let signed_url: string | null = null
                try {
                    const { data: urlData } = await bucket.createSignedUrl(f.path, 3600)
                    signed_url = urlData?.signedUrl || null
                } catch {}
                results.push({ ...f, document_name: meta?.document_name || null, mime_type: meta?.mime_type || null, signed_url })
            }
            return results
        }

        const [clientFilesEnriched, appFilesEnriched] = await Promise.all([
            withMetaAndUrls(clientFiles),
            withMetaAndUrls(appFiles)
        ])

        return NextResponse.json({
            client_id: clientId,
            application_id: applicationId,
            client_files: clientFilesEnriched,
            application_files: appFilesEnriched
        })
	} catch (error: any) {
		return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
	}
}


// Send magic link for a document request
// Body: { request_id: string }
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const requestId: string | undefined = body?.request_id
        if (!requestId) {
            return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
        }

        const result = await sendDocumentRequestMagicLink(requestId)
        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Failed to send magic link' }, { status: 400 })
        }

        return NextResponse.json({
            ok: true,
            email: result.email,
            redirectTo: result.redirectTo
        })
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
    }
}


