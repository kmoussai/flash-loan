import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/src/lib/supabase/admin-helpers'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { signAuthToken } from '@/src/lib/security/token'

// GET /api/admin/loan-apps/:id/document-requests
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await isStaff(true)
    if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const appId = params.id
    if (!appId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const admin = createServerSupabaseAdminClient()
    const { data, error } = await admin
      .from('document_requests' as any)
      .select(`
        id,
        status,
        request_kind,
        form_schema,
        expires_at,
        magic_link_sent_at,
        uploaded_file_key,
        created_at,
        updated_at,
        group_id,
        loan_applications!inner(client_id),
        document_type:document_type_id(id, name, slug, default_request_kind, default_form_schema, description),
        request_form_submissions(id, form_data, submitted_at, submitted_by),
        group:group_id(id, expires_at)
      `)
      .eq('loan_application_id', appId)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    const { getAppUrl } = await import('@/src/lib/config')
    const { data: appRow } = await admin
      .from('loan_applications' as any)
      .select('id, users:client_id(id, preferred_language)')
      .eq('id', appId)
      .single()
    const preferredLanguage: 'en' | 'fr' = ((appRow as any)?.users?.preferred_language === 'fr') ? 'fr' : 'en'
    const clientId = (appRow as any)?.users?.id as string | undefined
    
    const enhanced = (data || []).map((r: any) => {
      if (Array.isArray(r.request_form_submissions)) {
        r.request_form_submissions.sort((a: any, b: any) => {
          const aTime = a?.submitted_at ? new Date(a.submitted_at).getTime() : 0
          const bTime = b?.submitted_at ? new Date(b.submitted_at).getTime() : 0
          return bTime - aTime
        })
      }
      
      // Generate reusable dashboard link for the group (if group exists and client ID is available)
      let group_link: string | null = null
      const effectiveGroupExpiresAt = r?.group?.expires_at || r.expires_at || null
      const groupExp = effectiveGroupExpiresAt ? new Date(effectiveGroupExpiresAt).getTime() : null
      
      if (r.group_id && clientId && groupExp && !isNaN(groupExp) && Date.now() < groupExp) {
        // Generate reusable authentication token
        const authToken = signAuthToken(clientId, groupExp)
        const dashboardUrl = `/${preferredLanguage}/client/dashboard?section=documents`
        group_link = `${getAppUrl()}/api/auth/authenticate?token=${encodeURIComponent(authToken)}&redirect_to=${encodeURIComponent(dashboardUrl)}`
      }
      
      return { ...r, group_link }
    })
    return NextResponse.json({ requests: enhanced })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


