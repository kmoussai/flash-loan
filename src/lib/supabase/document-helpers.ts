import { createClient } from './client'

export async function uploadRequestedDocument(
  requestId: string,
  file: File
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const supabase = createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const path = `documents/${user.id}/${requestId}/${file.name}`
    const bucket = supabase.storage.from('documents')
    const { error } = await bucket.upload(path.replace(/^documents\//, ''), file, {
      upsert: true
    })
    if (error) return { success: false, error: error.message }
    return { success: true, path }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Upload failed' }
  }
}


