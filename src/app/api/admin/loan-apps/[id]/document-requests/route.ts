import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/src/lib/supabase/admin-helpers'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { signRequestToken } from '@/src/lib/security/token'

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
      .select('id, status, expires_at, magic_link_sent_at, uploaded_file_key, created_at, updated_at, group_id, document_type:document_type_id(id, name, slug), group:group_id(id, expires_at)')
      .eq('loan_application_id', appId)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    const { getAppUrl } = await import('@/src/lib/config')
    const { data: appRow } = await admin
      .from('loan_applications' as any)
      .select('id, users:client_id(preferred_language)')
      .eq('id', appId)
      .single()
    const preferredLanguage: 'en' | 'fr' = ((appRow as any)?.users?.preferred_language === 'fr') ? 'fr' : 'en'
    const enhanced = (data || []).map((r: any) => {
      let link: string | null = null
      if (r.expires_at) {
        const exp = new Date(r.expires_at).getTime()
        if (!isNaN(exp) && Date.now() < exp) {
          const token = signRequestToken(r.id, exp)
          link = `${getAppUrl()}/${preferredLanguage}/upload-documents?req=${encodeURIComponent(r.id)}&token=${encodeURIComponent(token)}`
        }
      }
      let group_link: string | null = null
      const effectiveGroupExpiresAt = r?.group?.expires_at || r.expires_at || null
      const groupExp = effectiveGroupExpiresAt ? new Date(effectiveGroupExpiresAt).getTime() : null
      if (r.group_id && groupExp && !isNaN(groupExp) && Date.now() < groupExp) {
        const token = signRequestToken(r.group_id, groupExp)
        group_link = `${getAppUrl()}/${preferredLanguage}/upload-documents?group=${encodeURIComponent(r.group_id)}&token=${encodeURIComponent(token)}`
      }
      return { ...r, request_link: link, group_link }
    })
    return NextResponse.json({ requests: enhanced })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


